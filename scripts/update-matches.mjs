// Met à jour les données de matchs et de classement depuis les pages publiques « poule » de ffhandball.fr.
// Usage : node scripts/update-matches.mjs      (FULL=1 pour relire toutes les journées)
// Les poules à suivre sont listées dans scripts/sources.json. Chaque entrée appartient à un collectif ("id").
//   - chaque collectif a son dossier : data/<id>/matches.json et data/<id>/standings.json (sm1, sf1, u13f, u13g…)
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const sources = JSON.parse(await readFile(new URL('scripts/sources.json', root), 'utf8'));
const UA = 'HBCR-site-sync/1.0 (calendrier du club, 1 requête/s)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const decode = s => s
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');

async function getPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr' } });
  if (!res.ok) throw new Error(`${res.status} sur ${url}`);
  return decode(await res.text());
}

// Extrait un tableau JSON qui suit une clé, en comptant les crochets (en respectant les chaînes).
function extractArray(text, key) {
  const start = text.indexOf(`"${key}":[`);
  if (start < 0) return null;
  let i = start + key.length + 3, depth = 0, inStr = false;
  const begin = i;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return JSON.parse(text.slice(begin, i + 1));
  }
  return null;
}

const pretty = name => {
  if (/romainvill/i.test(name)) return 'Romainville';
  return name.toLowerCase().replace(/(^|[\s'/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/(?<=\s)(De|Du|Des|La|Le|Sous|En|Sur)(?=\s)/g, m => m.toLowerCase())
    .replace(/\b(\d+[a-z])\b/gi, m => m.toUpperCase());
};

// Score numérique, ou null si le match n'a pas eu lieu. « FO » = forfait de l'équipe concernée (0 but).
const isForfeit = v => /^(fo|f|forfait)$/i.test(String(v ?? '').trim());
const toScore = r => {
  const a = r.equipe1Score, b = r.equipe2Score;
  if (a == null || b == null || a === '' || b === '') return null;
  const x = isForfeit(a) ? 0 : Number(a), y = isForfeit(b) ? 0 : Number(b);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
};
const forfeitSide = r => (isForfeit(r.equipe1Score) ? 'home' : isForfeit(r.equipe2Score) ? 'away' : undefined);

const LOGO_BASE = 'https://media-logos-clubs.ffhandball.fr/128/';
await mkdir(new URL('assets/clubs/', root), { recursive: true });
// Télécharge le logo une seule fois dans assets/clubs/ et renvoie son chemin relatif.
async function logo(file, show) {
  if (!file || show === '0') return null;
  const name = file.replace(/\.[a-z]+$/i, '') + '.webp';
  const dest = new URL('assets/clubs/' + name, root);
  try { await access(dest); } catch {
    await sleep(500);
    const res = await fetch(LOGO_BASE + name, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
  return 'assets/clubs/' + name;
}

// ---- un collectif = un groupe de poules ----
async function syncGroup(id, group) {
  const dir = `${id}/`;
  await mkdir(new URL(`data/${dir}`, root), { recursive: true });
  const OUT = new URL(`data/${dir}matches.json`, root);
  const STANDINGS_OUT = new URL(`data/${dir}standings.json`, root);

  const found = new Map();
  let skipped = 0;
  let previous = [];
  try { previous = JSON.parse(await readFile(OUT, 'utf8')).matches ?? []; } catch { /* premier lancement */ }

  for (const src of group) {
    const base = src.url.replace(/\/?$/, '/');
    const first = await getPage(base);
    const journees = extractArray(first, 'rencontres') ? JSON.parse(/"journees":"(\[.*?\])"/s.exec(first)?.[1].replace(/\\"/g, '"') ?? '[]') : [];
    const total = journees.length || 22;
    console.log(`[${id}] ${src.competition} : ${total} journées`);
    for (let n = 1; n <= total; n++) {
      // Journée terminée depuis plus d'une semaine et déjà connue : on garde le résultat enregistré, sans requête.
      // (FULL=1 force la relecture de toutes les journées.)
      const info = journees.find(j => j.journee_numero === n);
      // Journées qui ne commencent que dans plus de 3 semaines : inutile de les lire pour l'instant.
      if (!process.env.FULL && info && new Date(info.date_debut).getTime() > Date.now() + 21 * 864e5) break;
      const old = previous.filter(m => m.journee === n && m.score && m.competition === src.competition);
      if (!process.env.FULL && info && old.length && new Date(info.date_fin).getTime() < Date.now() - 7 * 864e5) {
        old.forEach(m => found.set(m.id, m));
        skipped++;
        continue;
      }
      await sleep(1000);
      const page = await getPage(`${base}journee-${n}/`);
      const list = extractArray(page, 'rencontres');
      if (!list) throw new Error(`Aucune rencontre trouvée à ${base}journee-${n}/ (le site a-t-il changé ?)`);
      for (const r of list) {
        if (!new RegExp(src.club, 'i').test(`${r.equipe1Libelle} ${r.equipe2Libelle}`)) continue;
        if (!r.date) continue; // match pas encore programmé
        found.set(r.ext_rencontreId, {
          id: r.ext_rencontreId,
          date: r.date.slice(0, 19),
          journee: Number(r.journeeNumero),
          competition: src.competition,
          ...(src.phase ? { phase: src.phase } : {}),
          home: pretty(r.equipe1Libelle),
          away: pretty(r.equipe2Libelle),
          homeLogo: await logo(r.structure1Logo, r.equipe1ShowLogo),
          awayLogo: await logo(r.structure2Logo, r.equipe2ShowLogo),
          score: toScore(r),
          ...(forfeitSide(r) ? { forfait: forfeitSide(r) } : {})
        });
      }
    }
  }

  const matches = [...found.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (!matches.length) throw new Error(`[${id}] Aucun match trouvé : fichier existant conservé.`);
  await writeFile(OUT, JSON.stringify({ club: 'Romainville', updated: new Date().toISOString(), source: 'ffhandball.fr', matches }, null, 2) + '\n');
  console.log(`[${id}] ${matches.length} matchs écrits dans ${fileURLToPath(OUT)} (${skipped} journées déjà jouées non relues)`);

  // ---- Classements : une table par source marquée "classement": true ----
  // Si les sources portent une "phase" (délayages, brassages, championnat), le fichier contient une liste « phases ».
  const withTable = group.filter(s => s.classement);
  const tables = [];
  for (const main of withTable) {
    try {
      await sleep(1000);
      const base = main.url.replace(/\/?$/, '/');
      const page = await getPage(`${base}classements/`);
      const rows = extractArray(page, 'classements');
      if (!rows?.length) throw new Error('classement introuvable (le site a-t-il changé ?)');
      const table = [];
      for (const r of rows) {
        table.push({
          rank: Number(r.place),
          team: pretty(r.equipe_libelle),
          logo: await logo(r.structure_logo, r.equipe_logoActif),
          points: Number(r.point), played: Number(r.joue), won: Number(r.gagne), drawn: Number(r.nul), lost: Number(r.perdu),
          for: Number(r.butPlus), against: Number(r.butMoins), diff: Number(r.diff),
          form: String(r.dernieresRencontres || '').split(';').filter(Boolean).map(Number) // 1 victoire, 0 nul, -1 défaite (du plus ancien au plus récent)
        });
      }
      table.sort((a, b) => a.rank - b.rank);
      tables.push({ phase: main.phase, competition: main.competition, table });
    } catch (err) {
      console.warn(`[${id}] Classement non mis à jour (${main.competition}) :`, err.message);
    }
  }
  if (tables.length) {
    const updated = new Date().toISOString();
    const body = group.some(s => s.phase)
      ? { updated, phases: tables }
      : { competition: tables[0].competition, updated, table: tables[0].table };
    await writeFile(STANDINGS_OUT, JSON.stringify(body, null, 2) + '\n');
    console.log(`[${id}] Classement(s) : ${tables.length} table(s) écrite(s)`);
  }
}

const groups = new Map();
for (const s of sources) {
  const id = s.id || 'sm1';
  if (!groups.has(id)) groups.set(id, []);
  groups.get(id).push(s);
}
let failed = false;
for (const [id, group] of groups) {
  try { await syncGroup(id, group); }
  catch (err) { failed = true; console.error(`[${id}] ERREUR :`, err.message); } // un collectif en échec ne bloque pas les autres
}
// ---- Calendrier des prochaines rencontres de tous les collectifs : data/calendrier.json ----
try {
  const labels = new Map(sources.map(x => [x.id || 'sm1', x.label || (x.id || 'sm1').toUpperCase()]));
  const upcoming = [];
  for (const [id, label] of labels) {
    try {
      const m = JSON.parse(await readFile(new URL(`data/${id}/matches.json`, root), 'utf8')).matches ?? [];
      for (const x of m) {
        if (x.score) continue;
        if (new Date(x.date).getTime() < Date.now() - 3 * 36e5) continue; // déjà passé
        upcoming.push({ collectif: id, label, date: x.date, competition: x.competition, home: x.home, away: x.away, homeLogo: x.homeLogo ?? null, awayLogo: x.awayLogo ?? null });
      }
    } catch { /* collectif sans données : ignoré */ }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
  await writeFile(new URL('data/calendrier.json', root), JSON.stringify({ updated: new Date().toISOString(), matches: upcoming }, null, 2) + '\n');
  console.log(`Calendrier : ${upcoming.length} rencontres à venir`);
} catch (err) { console.warn('Calendrier non généré :', err.message); }

if (failed) process.exitCode = 1;

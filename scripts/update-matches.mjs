// Met à jour data/matches.json depuis les pages publiques « poule » de ffhandball.fr.
// Usage : node scripts/update-matches.mjs
// Les poules à suivre sont listées dans scripts/sources.json.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const sources = JSON.parse(await readFile(new URL('scripts/sources.json', root), 'utf8'));
const OUT = new URL('data/matches.json', root);
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
  return name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/(?<=\s)(De|Du|Des|La|Le|Sous|En|Sur)(?=\s)/g, m => m.toLowerCase())
    .replace(/\b(1[a-c])\b/gi, m => m.toUpperCase());
};

const toScore = r => (r.equipe1Score == null || r.equipe2Score == null || r.equipe1Score === '' || r.equipe2Score === '')
  ? null : [Number(r.equipe1Score), Number(r.equipe2Score)];

const found = new Map();
for (const src of sources) {
  const base = src.url.replace(/\/?$/, '/');
  const first = await getPage(base);
  const journees = extractArray(first, 'rencontres') ? JSON.parse(/"journees":"(\[.*?\])"/s.exec(first)?.[1].replace(/\\"/g, '"') ?? '[]') : [];
  const total = journees.length || 22;
  console.log(`${src.competition} : ${total} journées`);
  for (let n = 1; n <= total; n++) {
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
        home: pretty(r.equipe1Libelle),
        away: pretty(r.equipe2Libelle),
        score: toScore(r)
      });
    }
  }
}

const matches = [...found.values()].sort((a, b) => a.date.localeCompare(b.date));
if (!matches.length) throw new Error('Aucun match trouvé : fichier existant conservé.');
await writeFile(OUT, JSON.stringify({ club: 'Romainville', updated: new Date().toISOString(), source: 'ffhandball.fr', matches }, null, 2) + '\n');
console.log(`${matches.length} matchs écrits dans ${fileURLToPath(OUT)}`);

// Menu mobile
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  burger.setAttribute('aria-expanded', false);
}));
const header = document.getElementById('header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 10), { passive: true });

// Un seul collectif affiché à la fois : les pastilles servent d'onglets
const chips = [...document.querySelectorAll('.chip')];
const panels = [...document.querySelectorAll('.collectif')];
const ids = panels.map(p => p.id);
function showCollectif(id, updateUrl = true) {
  if (!ids.includes(id)) id = ids[0];
  panels.forEach(p => { p.hidden = p.id !== id; });
  chips.forEach(c => {
    const on = c.getAttribute('href') === '#' + id;
    c.classList.toggle('active', on);
    c.setAttribute('aria-current', on ? 'true' : 'false');
  });
  if (updateUrl) history.replaceState(null, '', '#' + id);
  return id;
}
chips.forEach(c => c.addEventListener('click', e => {
  e.preventDefault();
  showCollectif(c.getAttribute('href').slice(1));
}));
addEventListener('hashchange', () => showCollectif(location.hash.slice(1), false));
const first = showCollectif(location.hash.slice(1), false);
if (location.hash) document.getElementById(first).scrollIntoView(); // arrivée depuis un lien « #sf1 »

// Données par collectif : data/<collectif>/matches.json et standings.json
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isUs = n => /romainvill/i.test(n);
const fmtShort = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const fmtTime = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
const mini = (n, u) => isUs(n) ? '<img class="mini-logo" src="assets/logo.png" alt="">' : u ? '<img class="mini-logo" src="' + esc(u) + '" alt="" loading="lazy">' : '';
const row = (m, right, cls) => '<li><span class="date">' + esc(fmtShort(m.d)) + '</span><span class="vsname">' + mini(m.home, m.homeLogo) + esc(m.home) +
  ' <em>vs</em> ' + mini(m.away, m.awayLogo) + esc(m.away) + '</span><span class="score ' + cls + '">' + right + '</span></li>';
const dataPath = (id, file) => 'data/' + id + '/' + file;
const forfeitTag = m => (m.forfait ? ' <small>(forfait)</small>' : '');

const PHASES = { delayages: 'Délayages', brassages: 'Brassages', championnat: 'Championnat' };
const PHASE_ORDER = ['championnat', 'brassages', 'delayages']; // du plus récent au plus ancien

// Résultats et calendrier : tous les blocs [data-feed="<collectif>"]
document.querySelectorAll('[data-feed]').forEach(async box => {
  try {
    const data = await (await fetch(dataPath(box.dataset.feed, 'matches.json'), { cache: 'no-store' })).json();
    const all = data.matches.map(m => ({ ...m, d: new Date(m.date) })).sort((a, b) => a.d - b.d);
    const next = all.filter(m => !m.score && m.d.getTime() + 2 * 36e5 > Date.now()).slice(0, 4);
    const cls = m => { const [h, a] = m.score, us = isUs(m.home) ? h : a, them = isUs(m.home) ? a : h; return us > them ? 'win' : us < them ? 'lose' : 'draw'; };
    const line = m => row(m, m.score[0] + ' – ' + m.score[1] + forfeitTag(m), cls(m));
    const playedUl = box.querySelector('[data-role=played]');
    if (all.some(m => m.phase)) {
      // résultats regroupés par phase : délayages, brassages, championnat
      const html = PHASE_ORDER.map(ph => {
        const ms = all.filter(m => m.score && m.phase === ph).reverse();
        return ms.length ? '<h5 class="phase-title">' + PHASES[ph] + '</h5><ul class="match-list">' + ms.map(line).join('') + '</ul>' : '';
      }).join('');
      playedUl.parentElement.innerHTML = '<h4>Résultats</h4>' + (html || '<ul class="match-list"><li>Aucun résultat.</li></ul>');
    } else {
      const played = all.filter(m => m.score).reverse().slice(0, 6);
      playedUl.innerHTML = played.map(line).join('') || '<li>Aucun résultat.</li>';
    }
    box.querySelector('[data-role=next]').innerHTML = next.map(m => row(m, fmtTime(m.d), 'next')).join('') || '<li>Calendrier à venir.</li>';
  } catch (e) { console.warn('Matchs indisponibles', box.dataset.feed, e); }
});

// Classements : tous les blocs [data-standings="<collectif>"]
const standingsRows = table => table.map(t => {
  const us = isUs(t.team), logo = us ? 'assets/logo.png' : t.logo;
  return '<tr class="' + (us ? 'us' : '') + '"><td class="rank">' + t.rank + '</td><td class="left team-cell">' +
    (logo ? '<img class="mini-logo" src="' + esc(logo) + '" alt="" loading="lazy">' : '') + esc(us ? 'HBC Romainville' : t.team) +
    '</td><td class="pts">' + t.points + '</td><td>' + t.played + '</td><td class="opt">' + t.won + '</td><td class="opt">' + t.drawn + '</td><td class="opt">' + t.lost +
    '</td><td class="opt">' + (t.diff > 0 ? '+' : '') + t.diff + '</td></tr>';
}).join('');
const standingsTable = rows => '<div class="standings__scroll"><table class="standings__table"><thead><tr><th>#</th><th class="left">Équipe</th><th>Pts</th><th>J</th><th class="opt">G</th><th class="opt">N</th><th class="opt">P</th><th class="opt">Diff</th></tr></thead><tbody>' + rows + '</tbody></table></div>';

document.querySelectorAll('[data-standings]').forEach(async box => {
  const body = box.querySelector('[data-role=rows]');
  try {
    const d = await (await fetch(dataPath(box.dataset.standings, 'standings.json'), { cache: 'no-store' })).json();
    const comp = box.querySelector('[data-role=comp]');
    if (d.phases) {
      // un classement par phase, la plus récente en premier
      if (comp) comp.textContent = '';
      box.querySelector('.standings__scroll').remove();
      const list = [...d.phases].sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase));
      box.insertAdjacentHTML('beforeend', list.map(p => '<h5 class="phase-title">' + (PHASES[p.phase] || p.competition) + '</h5>' + standingsTable(standingsRows(p.table))).join(''));
    } else {
      if (comp) comp.textContent = d.competition ? '· ' + d.competition : '';
      body.innerHTML = standingsRows(d.table);
    }
  } catch (e) {
    console.warn('Classement indisponible', box.dataset.standings, e);
    if (body) body.innerHTML = '<tr><td colspan="8" class="left">Classement indisponible pour le moment.</td></tr>';
  }
});

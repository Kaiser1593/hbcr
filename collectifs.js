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

// Matchs et résultats de SM1 (data/matches.json)
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isUs = n => /romainvill/i.test(n);
const fmtShort = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const fmtTime = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
const mini = (n, u) => isUs(n) ? '<img class="mini-logo" src="assets/logo.png" alt="">' : u ? '<img class="mini-logo" src="' + esc(u) + '" alt="" loading="lazy">' : '';
const row = (m, right, cls) => '<li><span class="date">' + esc(fmtShort(m.d)) + '</span><span class="vsname">' + mini(m.home, m.homeLogo) + esc(m.home) +
  ' <em>vs</em> ' + mini(m.away, m.awayLogo) + esc(m.away) + '</span><span class="score ' + cls + '">' + right + '</span></li>';
(async () => {
  const box = document.getElementById('feed-sm1');
  if (!box) return;
  try {
    const data = await (await fetch('data/matches.json', { cache: 'no-store' })).json();
    const all = data.matches.map(m => ({ ...m, d: new Date(m.date) })).sort((a, b) => a.d - b.d);
    const played = all.filter(m => m.score).reverse().slice(0, 4);
    const next = all.filter(m => !m.score && m.d.getTime() + 2 * 36e5 > Date.now()).slice(0, 4);
    const cls = m => { const [h, a] = m.score, us = isUs(m.home) ? h : a, them = isUs(m.home) ? a : h; return us > them ? 'win' : us < them ? 'lose' : 'draw'; };
    box.querySelector('[data-role=played]').innerHTML = played.map(m => row(m, m.score[0] + ' – ' + m.score[1], cls(m))).join('') || '<li>Aucun résultat.</li>';
    box.querySelector('[data-role=next]').innerHTML = next.map(m => row(m, fmtTime(m.d), 'next')).join('') || '<li>Calendrier à venir.</li>';
  } catch (e) { console.warn('Matchs SM1 indisponibles', e); }
})();

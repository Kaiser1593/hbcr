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

// Chip actif selon la section visible
const chips = [...document.querySelectorAll('.chip')];
const secObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) chips.forEach(c => c.classList.toggle('active', c.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-35% 0px -55% 0px' });
document.querySelectorAll('.collectif').forEach(s => secObs.observe(s));

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

// Apparition au scroll
const els = document.querySelectorAll('.collectif');
els.forEach(el => el.classList.add('reveal'));
const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } }), { threshold: .1 });
els.forEach(el => obs.observe(el));

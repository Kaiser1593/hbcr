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

// Résultats, calendrier et classement de SM1 (data/sm1/)
const REFRESH_MS = 5 * 60 * 1000;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isUs = n => /romainvill/i.test(n);
const fmtShort = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const fmtTime = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
const mini = (n, u) => isUs(n) ? '<img class="mini-logo" src="assets/logo.png" alt="">' : u ? '<img class="mini-logo" src="' + esc(u) + '" alt="" loading="lazy">' : '';
const row = (m, right, cls) => '<li><span class="date">' + esc(fmtShort(m.d)) + '</span><span class="vsname">' + mini(m.home, m.homeLogo) + esc(m.home) +
  ' <em>vs</em> ' + mini(m.away, m.awayLogo) + esc(m.away) + '</span><span class="score ' + cls + '">' + right + '</span></li>';

async function loadMatches() {
  try {
    const data = await (await fetch('data/sm1/matches.json', { cache: 'no-store' })).json();
    const all = data.matches.map(m => ({ ...m, d: new Date(m.date) })).sort((a, b) => a.d - b.d);
    const played = all.filter(m => m.score).reverse().slice(0, 3); // 3 derniers résultats
    const next = all.filter(m => !m.score && m.d.getTime() + 2 * 36e5 > Date.now()).slice(0, 3); // 3 prochaines rencontres
    const cls = m => { const [h, a] = m.score, us = isUs(m.home) ? h : a, them = isUs(m.home) ? a : h; return us > them ? 'win' : us < them ? 'lose' : 'draw'; };
    document.getElementById('resultsList').innerHTML = played.map(m => row(m, m.score[0] + ' – ' + m.score[1], cls(m))).join('') || '<li>Aucun résultat pour le moment.</li>';
    document.getElementById('upcomingList').innerHTML = next.map(m => row(m, fmtTime(m.d), 'next')).join('') || '<li>Calendrier à venir.</li>';
  } catch (e) { console.warn('Matchs indisponibles', e); }
}

async function loadStandings() {
  const body = document.getElementById('st-body');
  try {
    const d = await (await fetch('data/sm1/standings.json', { cache: 'no-store' })).json();
    document.getElementById('cl-comp').textContent = d.competition || '';
    const up = new Date(d.updated);
    if (!isNaN(up)) document.getElementById('st-updated').textContent = 'Mis à jour le ' + up.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ' à ' + fmtTime(up);
    const dot = f => '<i class="dot ' + (f > 0 ? 'w' : f < 0 ? 'l' : 'd') + '"></i>';
    body.innerHTML = d.table.map(t => {
      const us = isUs(t.team), logo = us ? 'assets/logo.png' : t.logo;
      return '<tr class="' + (us ? 'us' : '') + '"><td class="rank">' + t.rank + '</td><td class="left team-cell">' +
        (logo ? '<img class="mini-logo" src="' + esc(logo) + '" alt="" loading="lazy">' : '') + esc(us ? 'HBC Romainville' : t.team) +
        '</td><td class="pts">' + t.points + '</td><td>' + t.played + '</td><td class="opt">' + t.won + '</td><td class="opt">' + t.drawn + '</td><td class="opt">' + t.lost +
        '</td><td class="opt">' + t.for + '</td><td class="opt">' + t.against + '</td><td class="opt">' + (t.diff > 0 ? '+' : '') + t.diff +
        '</td><td class="opt form">' + t.form.map(dot).join('') + '</td></tr>';
    }).join('');
  } catch (e) {
    console.warn('Classement indisponible', e);
    body.innerHTML = '<tr><td colspan="11" class="left">Classement indisponible pour le moment.</td></tr>';
  }
}

loadMatches(); loadStandings();
setInterval(() => { loadMatches(); loadStandings(); }, REFRESH_MS);

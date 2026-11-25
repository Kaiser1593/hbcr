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

// Ombre du header au scroll
const header = document.getElementById('header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 10), { passive: true });
header.classList.toggle('scrolled', scrollY > 10); // page rechargée en cours de défilement

// Compte à rebours du prochain match
const cd = document.getElementById('countdown');
let target = Date.now();
const pad = n => String(n).padStart(2, '0');
function tick() {
  let diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff / 864e5); diff -= d * 864e5;
  const h = Math.floor(diff / 36e5);  diff -= h * 36e5;
  const m = Math.floor(diff / 6e4);   diff -= m * 6e4;
  const s = Math.floor(diff / 1e3);
  document.getElementById('cd-d').textContent = pad(d);
  document.getElementById('cd-h').textContent = pad(h);
  document.getElementById('cd-m').textContent = pad(m);
  document.getElementById('cd-s').textContent = pad(s);
}
tick(); setInterval(tick, 1000);

// Matchs & résultats : lus depuis data/matches.json (remplaçable par une vraie API)
const MATCHES_URL = 'data/matches.json'; // ex. '/api/matches' quand un back-end existera
const REFRESH_MS = 5 * 60 * 1000;        // actualisation automatique toutes les 5 min
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isUs = n => /romainvill/i.test(n);
const fmtShort = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '.');
const fmtTime = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
const fmtLong = d => {
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1) + ' · ' + fmtTime(d);
};

function teamBlock(el, name, logoUrl) {
  const logo = isUs(name)
    ? '<img src="assets/logo.png" alt="' + esc(name) + '">'
    : logoUrl ? '<img class="team__club" src="' + esc(logoUrl) + '" alt="' + esc(name) + '" loading="lazy">'
    : '<div class="team__crest">' + esc(name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()) + '</div>';
  el.innerHTML = logo + '<strong>' + esc(isUs(name) ? 'HBC Romainville' : name) + '</strong>';
}

function resultClass(m) {
  const [h, a] = m.score, us = isUs(m.home) ? h : a, them = isUs(m.home) ? a : h;
  return us > them ? 'win' : us < them ? 'lose' : 'draw';
}

function renderMatches(data) {
  const all = data.matches.map(m => ({ ...m, d: new Date(m.date) })).sort((a, b) => a.d - b.d);
  const played = all.filter(m => m.score).reverse().slice(0, 4);
  const upcoming = all.filter(m => !m.score && m.d.getTime() + 2 * 36e5 > Date.now());
  const mini = (name, url) => isUs(name)
    ? '<img class="mini-logo" src="assets/logo.png" alt="">'
    : url ? '<img class="mini-logo" src="' + esc(url) + '" alt="" loading="lazy">' : '';
  const li = (m, right, cls) => '<li><span class="date">' + esc(fmtShort(m.d)) + '</span><span class="vsname">' +
    mini(m.home, m.homeLogo) + esc(m.home) + ' <em>vs</em> ' + mini(m.away, m.awayLogo) + esc(m.away) + '</span><span class="score ' + cls + '">' + right + '</span></li>';

  document.getElementById('resultsList').innerHTML = played.length
    ? played.map(m => li(m, m.score[0] + ' – ' + m.score[1], resultClass(m))).join('')
    : '<li>Aucun résultat pour le moment.</li>';

  const nextList = upcoming.slice(1, 5);
  document.getElementById('upcomingList').innerHTML = nextList.length
    ? nextList.map(m => li(m, esc(fmtTime(m.d)), 'next')).join('')
    : '<li>Calendrier à venir.</li>';

  const next = upcoming[0];
  if (next) {
    document.getElementById('nm-comp').textContent = next.competition || '';
    document.getElementById('nm-date').textContent = fmtLong(next.d);
    teamBlock(document.getElementById('nm-home'), next.home, next.homeLogo);
    teamBlock(document.getElementById('nm-away'), next.away, next.awayLogo);
    document.getElementById('nm-venue').textContent = '📍 ' + (next.venue || (isUs(next.home) ? 'Gymnase Jean Guimier' : 'À l\'extérieur'));
    const home = isUs(next.home);
    const where = document.getElementById('nm-where');
    where.textContent = home ? 'À domicile' : 'À l\'extérieur';
    where.classList.toggle('is-away', !home);
    const route = document.getElementById('nm-route');
    if (home) {
      route.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('15 rue Pasteur, 93230 Romainville, France');
      route.hidden = false;
    } else route.hidden = true;
    target = next.d.getTime();
    tick();
  }
}

async function loadMatches() {
  try {
    const r = await fetch(MATCHES_URL, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    renderMatches(await r.json());
  } catch (err) {
    console.warn('Matchs : impossible de charger', MATCHES_URL, err); // le contenu HTML par défaut reste affiché
  }
}
loadMatches();
setInterval(loadMatches, REFRESH_MS);

// Classement de l'équipe fanion : lu depuis data/standings.json
async function loadStandings() {
  const body = document.getElementById('st-body');
  if (!body) return;
  try {
    const r = await fetch('data/standings.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    document.getElementById('st-comp').textContent = d.competition || '';
    const up = new Date(d.updated);
    if (!isNaN(up)) document.getElementById('st-updated').textContent = 'Mis à jour le ' + up.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ' à ' + fmtTime(up);
    const dot = f => '<i class="dot ' + (f > 0 ? 'w' : f < 0 ? 'l' : 'd') + '" title="' + (f > 0 ? 'Victoire' : f < 0 ? 'Défaite' : 'Nul') + '"></i>';
    body.innerHTML = d.table.map(t => {
      const us = isUs(t.team);
      const logo = us ? 'assets/logo.png' : t.logo;
      return '<tr class="' + (us ? 'us' : '') + '"><td class="rank">' + t.rank + '</td><td class="left team-cell">' +
        (logo ? '<img class="mini-logo" src="' + esc(logo) + '" alt="" loading="lazy">' : '') + esc(us ? 'HBC Romainville' : t.team) +
        '</td><td class="pts">' + t.points + '</td><td>' + t.played + '</td><td class="opt">' + t.won + '</td><td class="opt">' + t.drawn +
        '</td><td class="opt">' + t.lost + '</td><td class="opt">' + (t.diff > 0 ? '+' : '') + t.diff + '</td><td class="opt form">' + t.form.map(dot).join('') + '</td></tr>';
    }).join('');
    // Au premier affichage : si Romainville est sous les lignes visibles, on y fait défiler le tableau
    if (!loadStandings.done) {
      loadStandings.done = true;
      const box = body.closest('.standings__scroll'), row = body.querySelector('tr.us');
      if (box && row) {
        const b = box.getBoundingClientRect(), r = row.getBoundingClientRect();
        if (r.bottom > b.bottom) box.scrollTop += r.top - b.top - row.offsetHeight * 2;
      }
    }
  } catch (err) {
    console.warn('Classement : impossible de charger', err);
    body.innerHTML = '<tr><td colspan="9" class="left">Classement indisponible pour le moment.</td></tr>';
  }
}
loadStandings();
setInterval(loadStandings, REFRESH_MS);

// Compteurs animés
const counters = document.querySelectorAll('[data-count]');
const countObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / 1400);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    countObs.unobserve(el);
  });
}, { threshold: .6 });
counters.forEach(c => countObs.observe(c));

// Apparition au scroll
const revealEls = document.querySelectorAll('.section-head, .match-card, .results__col, .card, .team-tile, .partners-row div, .club__text, .club__visual');
revealEls.forEach(el => el.classList.add('reveal'));
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revObs.unobserve(e.target); } });
}, { threshold: .12 });
revealEls.forEach(el => revObs.observe(el));

// Vidéo d'ambiance du hero (assets/hero.mp4) : si elle se charge, le fond n'est plus qu'un voile sombre
const heroVideo = document.querySelector('.hero__video');
if (heroVideo) {
  const ok = () => heroVideo.closest('.hero').classList.add('has-video');
  heroVideo.addEventListener('loadeddata', ok);
  if (heroVideo.readyState >= 2) ok();
}

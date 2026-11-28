// Barre d'onglets : elle s'efface sur les côtés quand on descend dans la page, et un petit onglet
// « Menu » apparaît sur le bord de l'écran. Il ouvre un panneau qui résume toute la navigation.
// En remontant (ou en haut de page), la barre complète revient et le petit onglet disparaît.
(() => {
  const header = document.getElementById('header');
  const nav = document.getElementById('nav');
  if (!header || !nav) return;

  // ---------- Petit onglet + panneau latéral, construits à partir du menu existant ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const linkHtml = (a, cls = '') => a.hasAttribute('href')
    ? `<a class="${cls}" href="${esc(a.getAttribute('href'))}">${esc(a.textContent.trim())}</a>`
    : `<span class="${cls} is-soon">${esc(a.textContent.trim())} <small>bientôt</small></span>`;

  let items = '';
  nav.querySelectorAll('.nav__group > *').forEach(el => {
    if (el.classList.contains('nav-item')) {
      const parent = el.querySelector(':scope > a');
      const subs = [...el.querySelectorAll('.subnav a')];
      items += `<li class="sidepanel__group">${linkHtml(parent, 'sidepanel__link')}<ul>${subs.map(a => `<li>${linkHtml(a, 'sidepanel__sub')}</li>`).join('')}</ul></li>`;
    } else {
      items += `<li>${linkHtml(el, 'sidepanel__link')}</li>`;
    }
  });

  const brandHref = header.querySelector('.brand')?.getAttribute('href') || 'index.html';
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button class="side-tab" id="sideTab" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="sidePanel">
      <span class="side-tab__icon" aria-hidden="true"><i></i><i></i><i></i></span><span class="side-tab__txt">Menu</span>
    </button>
    <div class="sidepanel__overlay" id="sideOverlay" hidden></div>
    <aside class="sidepanel" id="sidePanel" aria-label="Menu" aria-hidden="true">
      <div class="sidepanel__head">
        <a href="${esc(brandHref)}" class="sidepanel__brand"><img src="${esc(header.querySelector('.brand img')?.getAttribute('src') || 'assets/logo.png')}" alt="HBC Romainville"></a>
        <button class="sidepanel__close" id="sideClose" type="button" aria-label="Fermer le menu">&times;</button>
      </div>
      <ul class="sidepanel__list">${items}</ul>
    </aside>`;
  document.body.append(...wrap.children);

  const tab = document.getElementById('sideTab');
  const panel = document.getElementById('sidePanel');
  const overlay = document.getElementById('sideOverlay');
  const setPanel = open => {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    tab.setAttribute('aria-expanded', String(open));
    overlay.hidden = !open;
    document.body.classList.toggle('sidepanel-open', open);
    if (open) panel.querySelector('a')?.focus();
  };
  tab.addEventListener('click', () => setPanel(!panel.classList.contains('open')));
  overlay.addEventListener('click', () => setPanel(false));
  document.getElementById('sideClose').addEventListener('click', () => { setPanel(false); tab.focus(); });
  panel.addEventListener('click', e => { if (e.target.closest('a')) setPanel(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) { setPanel(false); tab.focus(); } });

  // ---------- Masquage de la barre au défilement ----------
  let last = window.scrollY, ticking = false;
  const setHidden = hidden => {
    header.classList.toggle('nav-hidden', hidden);
    document.body.classList.toggle('header-hidden', hidden);
    if (!hidden) setPanel(false);
  };
  const update = () => {
    ticking = false;
    const y = window.scrollY, dy = y - last;
    const menuOpen = nav.classList.contains('open');
    // La barre complète ne revient qu'en haut de page : remonter un peu ne la fait pas réapparaître.
    // Le petit onglet « Menu » reste disponible entre-temps.
    if (y < 90 || menuOpen) setHidden(false);
    else if (dy > 8) setHidden(true);
    if (Math.abs(dy) > 8 || y < 90) last = y;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  header.addEventListener('focusin', () => setHidden(false));
})();

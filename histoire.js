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

// Apparition au scroll
const els = document.querySelectorAll('.section-head, .tl-item, .hl-card, .story-intro__inner > *, .values-list li, .keyfigures__grid > div');
els.forEach(el => el.classList.add('reveal'));
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
}, { threshold: .15 });
els.forEach(el => obs.observe(el));

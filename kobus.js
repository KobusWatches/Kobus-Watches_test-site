/* Kobus — shared behavior: header state, mobile menu, scroll reveals */

const header = document.getElementById('site-header');
const hasHero = header.dataset.hero === 'true';
const headerWordmark = header.querySelector('.wordmark');
const WORDMARK_DARK = 'brand_assets/processed/kobus-wordmark-black-alpha.png';
const WORDMARK_LIGHT = 'brand_assets/processed/kobus-wordmark-white.png';

function setHeaderState() {
  const solid = !hasHero || window.scrollY > 24;
  header.classList.toggle('is-solid', solid);
  header.classList.toggle('is-transparent', hasHero && !solid);
  const menuOpen = header.classList.contains('menu-open');
  headerWordmark.src = solid || menuOpen ? WORDMARK_DARK : WORDMARK_LIGHT;
}
setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
menuToggle.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('is-open');
  header.classList.toggle('menu-open', isOpen);
  menuToggle.setAttribute('aria-expanded', isOpen);
  setHeaderState();
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion || !('IntersectionObserver' in window)) {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => {
    // Siblings revealed together cascade in, one beat apart
    const group = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.transitionDelay = `${Math.min(group.indexOf(el), 5) * 110}ms`;
    io.observe(el);
  });
}

/* Parallax depth — photography bands drift slower than the page,
   the hero text lingers as you scroll away. Transform-only, rAF-throttled. */
if (!reduceMotion) {
  const bandImages = document.querySelectorAll('.band img');
  const heroContent = document.querySelector('.hero-full .hero-content');
  let ticking = false;

  function applyParallax() {
    ticking = false;
    const vh = window.innerHeight;
    bandImages.forEach((img) => {
      const rect = img.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      const scale = img.dataset.parallaxScale || 1.14;
      img.style.transform = `translateY(${(-progress * 5).toFixed(2)}%) scale(${scale})`;
    });
    if (heroContent && window.scrollY < vh) {
      heroContent.style.transform = `translateY(${(window.scrollY * 0.22).toFixed(1)}px)`;
      heroContent.style.opacity = Math.max(0, 1 - window.scrollY / (vh * 0.55)).toFixed(3);
    }
  }
  function requestParallax() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(applyParallax);
    }
  }
  window.addEventListener('scroll', requestParallax, { passive: true });
  window.addEventListener('resize', requestParallax, { passive: true });
  applyParallax();
}

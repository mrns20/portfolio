// Persistent navigation keeps the audio element and its analyser alive.
document.addEventListener('DOMContentLoaded', () => {
  const pages = window.portfolioPages;
  if (!pages) return;
  const parse = name => new DOMParser().parseFromString(pages[name], 'text/html');
  const names = Object.keys(pages);
  const local = location.protocol === 'file:';
  let current = location.pathname.split('/').pop() || 'index.html';
  if (!pages[current]) current = 'index.html';
  const home = parse('index.html');
  const orb = document.querySelector('.welcome-orbit') || home.querySelector('.welcome-orbit');
  const flight = document.querySelector('.archer-flight') || home.querySelector('.archer-flight');
  if (!flight.isConnected) document.body.append(flight);
  let companionTime = 0;
  let orbTransition;
  const saveOrbMotion = () => {
    const drift = orb.querySelector('.orb-drift');
    if (orbTransition) { orbTransition.finish(); orbTransition = null; }
    const bounds = drift.getBoundingClientRect();
    const animations = orb.getAnimations({ subtree: true })
      .filter(animation => typeof animation.animationName === 'string')
      .map(animation => ({ element: animation.effect.target, name: animation.animationName, time: animation.currentTime }));
    const travel = animations.find(animation => animation.name === 'companion-travel');
    if (travel) companionTime = travel.time;
    return { bounds, animations, wasHome: !orb.classList.contains('orb-companion') };
  };
  const placeOrb = (motion) => {
    const isHome = current === 'index.html';
    orb.classList.toggle('orb-companion', !isHome);
    if (isHome) {
      const placeholder = document.querySelector('.welcome .welcome-orbit');
      if (placeholder && placeholder !== orb) placeholder.replaceWith(orb);
      else if (!placeholder) document.querySelector('.welcome').prepend(orb);
    } else if (orb.parentNode !== document.body) document.body.append(orb);
    flight.style.display = isHome ? '' : 'none';
    if (!motion) return;
    // Restore CSS animation clocks after reparenting or replacing the home content.
    for (const animation of orb.getAnimations({ subtree: true })) {
      const saved = motion.animations.find(item => item.element === animation.effect.target && item.name === animation.animationName);
      if (saved) animation.currentTime = saved.time;
      else if (animation.animationName === 'companion-travel') animation.currentTime = companionTime;
    }
    if (motion.wasHome !== isHome && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const drift = orb.querySelector('.orb-drift');
      const next = drift.getBoundingClientRect();
      // Individual transforms blend the size/location change without replacing drift.
      orbTransition = drift.animate([
        { translate: `${motion.bounds.left - next.left + (motion.bounds.width - next.width) / 2}px ${motion.bounds.top - next.top + (motion.bounds.height - next.height) / 2}px`, scale: String(motion.bounds.width / next.width) },
        { translate: '0px 0px', scale: '1' }
      ], { duration: 1100, easing: 'cubic-bezier(.22,.61,.36,1)' });
    }
  };
  const show = (name, focus = true) => {
    if (!pages[name]) return;
    const motion = saveOrbMotion();
    const page = parse(name);
    document.querySelector('.topbar').replaceWith(page.querySelector('.topbar'));
    document.querySelector('main').replaceWith(page.querySelector('main'));
    document.body.className = page.body.className;
    document.title = page.title;
    current = name;
    if (focus) window.scrollTo(0, 0);
    placeOrb(motion);
    document.dispatchEvent(new Event('portfolio:page'));
    if (focus) {
      window.scrollTo(0, 0);
      const main = document.querySelector('main');
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  };
  const hashPage = () => location.hash.startsWith('#/') ? location.hash.slice(2) : null;
  placeOrb();
  if (local && pages[hashPage()] && hashPage() !== current) show(hashPage(), false);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    const name = url.pathname.split('/').pop();
    const directory = path => path.slice(0, path.lastIndexOf('/') + 1);
    if (url.origin !== location.origin || directory(url.pathname) !== directory(location.pathname) || !names.includes(name) || url.search || url.hash) return;
    event.preventDefault();
    if (name === current) return;
    if (local) location.hash = '/' + name;
    else { history.pushState({ page: name }, '', url.href); show(name); }
  });
  window.addEventListener('hashchange', () => {
    if (!local) return;
    const name = hashPage() || location.pathname.split('/').pop() || 'index.html';
    if (pages[name] && name !== current) show(name);
  });
  window.addEventListener('popstate', () => {
    if (local) return;
    const name = location.pathname.split('/').pop() || 'index.html';
    if (pages[name]) show(name);
  });
});

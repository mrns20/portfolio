// A home-only letter transformation and a small, decorative archery scene.
let archerController;
const initializeArcher = () => {
  if (archerController) archerController.abort();
  archerController = new AbortController();
  const signal = archerController.signal;
  const logo = document.querySelector('.logo-morph');
  const archer = document.querySelector('.home-archer');
  const walker = document.querySelector('.walker');
  if (!logo || !archer || !walker) return;
  const header = logo.closest('.topbar');
  const aim = archer.querySelector('.archer-aim');
  const string = archer.querySelector('.archer-string');
  const arm = archer.querySelector('.archer-draw-arm');
  const loadedArrow = archer.querySelector('.archer-loaded-arrow');
  const flightLayer = document.querySelector('.archer-flight');
  const projectile = flightLayer.querySelector('.archer-projectile');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pieces = [['a', 20, 37], ['i', 20, 25], ['o', 20, 10]];
  let clock = 0;
  let previousTime;
  let frame;
  signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true });
  let nextShot = 9.7;
  let flight = null;

  const measure = () => {
    const bounds = archer.getBoundingClientRect();
    // offsetLeft ignores animated transforms, so resizing never compounds offsets.
    const origin = logo.getBoundingClientRect();
    pieces.forEach(([letter, targetX, targetY]) => {
      const piece = logo.querySelector(`[data-letter="${letter}"]`);
      piece.style.setProperty('--merge-x', `${bounds.left + targetX * bounds.width / 64 - origin.left - piece.offsetLeft - piece.offsetWidth / 2}px`);
      piece.style.setProperty('--merge-y', `${bounds.top + targetY * bounds.height / 58 - origin.top - piece.offsetTop - piece.offsetHeight / 2}px`);
    });
    flightLayer.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    flight = null;
    projectile.setAttribute('opacity', '0');
  };
  const target = () => {
    const source = archer.getBoundingClientRect();
    const destination = walker.getBoundingClientRect();
    const scale = source.width / 64;
    const pivot = { x: source.left + 20 * scale, y: source.top + 24 * scale };
    const end = { x: destination.left + destination.width / 2, y: destination.top + destination.height / 2 };
    const angle = Math.atan2(end.y - pivot.y, end.x - pivot.x);
    aim.setAttribute('transform', `rotate(${angle * 180 / Math.PI} 20 24)`);
    return { start: { x: pivot.x + 28 * scale * Math.cos(angle), y: pivot.y + 28 * scale * Math.sin(angle) }, end };
  };
  const tick = (time) => {
    const elapsed = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, .05);
    previousTime = time;
    clock += elapsed;
    header.classList.toggle('letters-merging', clock >= 4.2);
    header.classList.toggle('archer-ready', clock >= 6);
    if (clock >= 6) {
      const shot = target();
      const draw = Math.max(0, Math.min(1, 1 - (nextShot - clock)));
      const hand = 39 - 14 * draw;
      string.setAttribute('d', `M39 10 L${hand} 24 L39 38`);
      arm.setAttribute('d', `M20 23 L28 ${19 - 4 * draw} L${hand} 24`);
      loadedArrow.style.opacity = draw > 0 ? '1' : '0';
      if (clock >= nextShot) {
        flight = { ...shot, elapsed: 0 };
        nextShot = clock + 8 + Math.random() * 3;
        loadedArrow.style.opacity = '0';
        string.setAttribute('d', 'M39 10 L39 24 L39 38');
      }
    }
    if (flight) {
      flight.elapsed += elapsed;
      const t = Math.min(1, flight.elapsed / 1.2);
      const dx = flight.end.x - flight.start.x;
      const dy = flight.end.y - flight.start.y;
      const x = flight.start.x + dx * t;
      const y = flight.start.y + dy * t - 35 * Math.sin(Math.PI * t);
      const angle = Math.atan2(dy - 35 * Math.PI * Math.cos(Math.PI * t), dx) * 180 / Math.PI;
      projectile.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
      projectile.setAttribute('opacity', String(Math.min(1, (1 - t) * 8)));
      if (t === 1) flight = null;
    }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    previousTime = undefined;
    if (motion.matches) {
      clock = 0;
      nextShot = 9.7;
      flight = null;
      header.classList.remove('letters-merging', 'archer-ready');
      projectile.setAttribute('opacity', '0');
    } else if (!document.hidden) {
      frame = requestAnimationFrame(tick);
    }
  };
  measure();
  window.addEventListener('resize', measure, { signal });
  document.addEventListener('visibilitychange', sync, { signal });
  motion.addEventListener('change', () => { measure(); sync(); }, { signal });
  sync();
};
document.addEventListener('DOMContentLoaded', initializeArcher);
document.addEventListener('portfolio:page', initializeArcher);
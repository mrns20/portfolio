// Reversible disco-ball skin: remove this script and the DISCO ORB CSS block to revert.
document.addEventListener('DOMContentLoaded', () => {
  const ball = document.querySelector('.welcome-orb');
  if (!ball || ball.querySelector('.disco-surface')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'disco-surface';
  canvas.width = canvas.height = 256;
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  if (!context) return;
  ball.prepend(canvas);
  ball.classList.add('disco-orb');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let rotation = .2, frame, previousTime, lastPaint = -Infinity;
  const rows = 14, columns = 32;
  const project = (latitude, longitude) => ({
    x: Math.cos(latitude) * Math.sin(longitude),
    y: Math.sin(latitude),
    z: Math.cos(latitude) * Math.cos(longitude)
  });
  const paint = () => {
    context.clearRect(0, 0, 256, 256);
    context.save();
    context.translate(128, 128);
    context.beginPath(); context.arc(0, 0, 126, 0, Math.PI * 2); context.clip();
    context.fillStyle = '#283d31'; context.fillRect(-128, -128, 256, 256);
    for (let row = 0; row < rows; row++) {
      const lat0 = -Math.PI / 2 + row * Math.PI / rows + .009;
      const lat1 = -Math.PI / 2 + (row + 1) * Math.PI / rows - .009;
      for (let col = 0; col < columns; col++) {
        const lon0 = col * Math.PI * 2 / columns + rotation + .009;
        const lon1 = (col + 1) * Math.PI * 2 / columns + rotation - .009;
        const normal = project((lat0 + lat1) / 2, (lon0 + lon1) / 2);
        if (normal.z <= 0) continue;
        const corners = [project(lat0, lon0), project(lat0, lon1), project(lat1, lon1), project(lat1, lon0)];
        const light = Math.max(0, -.43 * normal.x - .56 * normal.y + .7 * normal.z);
        const reflection = Math.pow(Math.max(0, -.24 * normal.x - .32 * normal.y + .917 * normal.z), 22);
        const variation = Math.sin(row * 17.3 + col * 9.7) * .055;
        const shade = Math.max(0, Math.min(1, .1 + light * .67 + reflection * .25 + variation));
        context.fillStyle = `rgb(${Math.round(36 + shade * 151)}, ${Math.round(52 + shade * 149)}, ${Math.round(42 + shade * 135)})`;
        context.beginPath();
        corners.forEach((point, index) => {
          const x = point.x * 126, y = point.y * 126;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.closePath(); context.fill();
      }
    }
    context.restore();
  };
  const tick = time => {
    const dt = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, .1);
    previousTime = time;
    rotation = (rotation + dt * Math.PI * 2 / 32) % (Math.PI * 2);
    if (time - lastPaint >= 1000 / 30) { paint(); lastPaint = time; }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    previousTime = undefined;
    paint();
    if (!document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  window.addEventListener('pagehide', () => cancelAnimationFrame(frame));
  window.addEventListener('pageshow', sync);
  sync();
});

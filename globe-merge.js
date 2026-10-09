// Magnetic encounters with the Connect globe and About CV button. The existing audio analyser remains the source.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 800px)');
  let globe, orbit, drift, frame, isButton = false, state = null, cooldown = 0, previousKick = 0;
  const rings = [];
  let mobileReadyAt = 0;
  function reset() {
    cancelAnimationFrame(frame);
    if(state?.travel && state.wasRunning) {
      // Navigation can remove the companion CSS animation before cleanup runs.
      // Playing that cancelled animation would make the home orb roam again.
      if(orbit?.classList.contains('orb-companion') && orbit.getAnimations().includes(state.travel)) {
        state.travel.play();
      } else {
        state.travel.cancel();
      }
    }
    orbit?.classList.remove('is-mobile-merging');
    if(drift) { drift.style.removeProperty('translate'); drift.style.removeProperty('opacity'); }
    if(globe) {
      globe.classList.remove('is-orb-merged');
      globe.style.removeProperty('--merge-bass'); globe.style.removeProperty('--merge-kick');
      globe.querySelector('.globe-merge-halo')?.remove();
    }
    rings.splice(0).forEach(r => { r.animation.cancel(); r.element.remove(); });
    state = null;
  }
  function begin(now) {
    const travel = orbit.getAnimations().find(a => a.animationName === 'companion-travel');
    state = { start: now, travel, wasRunning: travel?.playState === 'running' };
    travel?.pause();
    if(small.matches) orbit.classList.add('is-mobile-merging');
    const source = orbit.querySelector('.music-halo');
    if(source || isButton) {
      const halo = isButton ? document.createElement('span') : source.cloneNode(true);
      halo.setAttribute('class', 'globe-merge-halo');
      halo.setAttribute('aria-hidden', 'true');
      halo.setAttribute('focusable', 'false');
      globe.append(halo);
    }
  }
  function pulse(strength) {
    const element = document.createElement('span');
    element.className = 'globe-merge-ring'; element.setAttribute('aria-hidden', 'true'); globe.append(element);
    const animation = element.animate(isButton ? [
      { inset: '0px', opacity: 0 },
      { inset: '-3px', opacity: .16 + Math.min(strength, 1) * .06, offset: .15 },
      { inset: `-${10 + Math.min(strength, 1) * 6}px`, opacity: 0 }
    ] : [
      { transform: 'scale(1)', opacity: 0 },
      { transform: `scale(${small.matches ? 1.06 : 1.15})`, opacity: .35 + strength * .2, offset: .12 },
      { transform: `scale(${small.matches ? 1.3 + Math.min(strength, 1) * .15 : 2.7 + strength})`, opacity: 0 }
    ], { duration: 2200, easing: 'cubic-bezier(.15,.5,.3,1)' });
    const record = {element, animation}; rings.push(record);
    animation.onfinish = () => { element.remove(); const i=rings.indexOf(record); if(i>=0) rings.splice(i,1); };
  }
  let lastPulse = 0;
  function tick(now) {
    if(!globe?.isConnected || !orbit?.isConnected) { reset(); return; }
    const g = globe.getBoundingClientRect();
    const o = orbit.getBoundingClientRect();
    const gx=g.left+g.width/2, gy=g.top+g.height/2;
    const ox=o.left+o.width/2, oy=o.top+o.height/2;
    if(!state && now>cooldown && g.bottom>0 && g.top<innerHeight &&
       (small.matches ? now >= mobileReadyAt && g.top >= 58 && g.bottom <= innerHeight - 100 : isButton ? Math.hypot(ox-gx, oy-gy)<Math.max(g.width*.6, 90)
         : Math.abs(ox-gx)<g.width*.5 && oy<gy && gy-oy<g.height+140)) begin(now);
    if(state) {
      const elapsed=now-state.start;
      const fusedUntil = small.matches ? 4650 : 30650;
      const finishedAt = fusedUntil + 650;
      if (elapsed >= 650 && !state.announced) {
        state.announced = true;
        document.dispatchEvent(new CustomEvent('portfolio:speech', {
          detail: { kind: 'merge', text: "DAMN BRO THAT'S CRAAAAAAZY" }
        }));
      }
      // Desktop keeps its thirty-second encounter; mobile uses four seconds.
      const weight=elapsed<650 ? elapsed/650 : elapsed<fusedUntil ? 1 : Math.max(0,1-(elapsed-fusedUntil)/650);
      const eased=weight*weight*(3-2*weight);
      drift.style.translate=`${(gx-ox)*eased}px ${(gy-oy)*eased}px`;
      drift.style.opacity=String(1-eased);
      globe.classList.toggle('is-orb-merged', elapsed>=650 && elapsed<fusedUntil);
      const idlePulse = small.matches ? .12 + .08 * Math.sin(elapsed / 260) : 0;
      const bass=Number(orbit.style.getPropertyValue('--music-bass'))||idlePulse;
      const kick=Number(orbit.style.getPropertyValue('--music-kick'))||0;
      globe.style.setProperty('--merge-bass',String(bass*eased));
      globe.style.setProperty('--merge-kick',String(kick*eased));
      const source=orbit.querySelector('.music-halo path');
      const halo=globe.querySelector('.globe-merge-halo path');
      if(source && halo) halo.setAttribute('d',source.getAttribute('d')||'');
      if(elapsed>=650 && elapsed<fusedUntil && now-lastPulse>(isButton ? 600 : 220) && kick>.12 && kick>previousKick+.025) {
        pulse(kick);lastPulse=now;
      }
      if(small.matches && elapsed>=650 && elapsed<fusedUntil && now-lastPulse>1400) { pulse(.15); lastPulse=now; }
      previousKick=kick;
      if(elapsed>=finishedAt) {
        reset(); cooldown=small.matches ? Infinity : now+12000;
      }
    }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    reset();
    globe=document.querySelector('.connect-globe, .about-page .cv-download');
    isButton=!!globe?.classList.contains('cv-download');
    orbit=document.querySelector('.welcome-orbit.orb-companion');
    drift=orbit?.querySelector('.orb-drift');
    if(!small.matches && cooldown===Infinity) cooldown=0;
    if(small.matches) { cooldown=0; mobileReadyAt=performance.now()+1800; }
    if(globe && drift && !document.hidden && !reduced.matches) frame=requestAnimationFrame(tick);
  }
  document.addEventListener('DOMContentLoaded',sync);
  document.addEventListener('portfolio:page',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync); small.addEventListener('change',sync);
  window.addEventListener('pagehide',reset);
  window.addEventListener('pageshow',sync);
})();

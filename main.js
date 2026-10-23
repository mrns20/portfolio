// Remember heading visits only in page memory, without browser storage.
const visitedHeadings = new Set();
const initializedHeadings = new WeakSet();
const initializeHeadingTyping = () => {
  document.querySelectorAll('.heading-typing, .connect-typing').forEach(heading => {
    if (initializedHeadings.has(heading)) return;
    initializedHeadings.add(heading);
    const page = heading.closest('section')?.id || heading.textContent.trim();
    const key = 'portfolio:heading-visited:v1:' + page;
    let visited = visitedHeadings.has(key);
    heading.classList.toggle('is-first-visit', !visited);
    visitedHeadings.add(key);
  });
};

let pageController;
const initializePage = () => {
  initializeHeadingTyping();
  if (pageController) pageController.abort();
  pageController = new AbortController();
  const signal = pageController.signal;
  const on = (target, event, callback) => target.addEventListener(event, callback, { signal });
  const cvButton = document.querySelector('.cv-download');
  if (cvButton) {
    on(cvButton, 'click', () => {
      if (cvButton.disabled) return;
      const bytes = Uint8Array.from(atob(window.portfolioCvBase64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const download = document.createElement('a');
      download.href = url;
      download.download = 'Marino-Tselani-CV.pdf';
      download.hidden = true;
      document.body.append(download);
      download.click();
      download.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
  }
  const clock = document.querySelector('.athens-clock');
  if (clock) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
    let clockTimer;
    const updateClock = () => {
      clearTimeout(clockTimer);
      const now = new Date();
      clock.textContent = formatter.format(now);
      clock.dateTime = now.toISOString();
      if (!document.hidden && !signal.aborted) clockTimer = setTimeout(updateClock, 1000 - now.getMilliseconds());
    };
    signal.addEventListener('abort', () => clearTimeout(clockTimer), { once: true });
    on(document, 'visibilitychange', updateClock);
    updateClock();
  }
  const menu = document.getElementById('menu');
  const nav = document.getElementById('nav');
  if (menu && nav) {
    const setMenu = (open) => {
      nav.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.textContent = open ? '✕' : '☰';
    };
    on(menu, 'click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
    on(nav, 'click', (event) => { if (event.target.closest('a')) setMenu(false); });
    on(document, 'keydown', (event) => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); }
    });
    on(document, 'click', (event) => { if (!event.target.closest('.topbar')) setMenu(false); });
    on(matchMedia('(min-width: 801px)'), 'change', () => setMenu(false));
    }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver((entries) => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.04 });
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    document.documentElement.classList.add('js-reveal');
  }
  const greeting = document.querySelector('.welcome-word');
  if (greeting) {
    const greetings = [
      ['en', 'Welcome'],
      ['el', 'Καλώς ήρθατε'],
      ['sq', 'Mirë se vini'],
      ['ja', 'ようこそ'],
      ['de', 'Willkommen'],
      ['it', 'Benvenuti'],
      ['nb', 'Velkommen'],
      ['am', 'እንኳን ደህና መጡ'],
      ['es', 'Bienvenidos'],
      ['hi', 'स्वागत है'],
      ['zh', '欢迎'],
      ['ru', 'Добро пожаловать'],
      ['ar', 'أهلاً وسهلاً'],
    ];
    let current = 0;
    let timer;
    signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    const scheduleGreeting = () => {
      clearTimeout(timer);
      greeting.classList.remove('is-changing');
      if (reducedMotion.matches || document.hidden) return;
      timer = setTimeout(() => {
        greeting.classList.add('is-changing');
        timer = setTimeout(() => {
          current = (current + 1) % greetings.length;
          greeting.lang = greetings[current][0];
          greeting.textContent = greetings[current][1];
          greeting.classList.remove('is-changing');
          scheduleGreeting();
        }, 350);
      }, 3000);
    };
    on(reducedMotion, 'change', scheduleGreeting);
    on(document, 'visibilitychange', scheduleGreeting);
    scheduleGreeting();
  }

};
document.addEventListener('DOMContentLoaded', initializePage);
document.addEventListener('portfolio:page', initializePage);

// The footer companion has one lifetime, independent of page content.
document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const walker = document.querySelector('.walker');
  if (walker) {
    const track = walker.closest('.walker-track');
    const footer = walker.closest('.site-footer');
    const speech = document.createElement('div');
    speech.className = 'character-speech';
    speech.setAttribute('role', 'status');
    speech.setAttribute('aria-live', 'polite');
    const speechLayout = document.createElement('span');
    speechLayout.className = 'speech-layout';
    speechLayout.setAttribute('aria-hidden', 'true');
    const speechCopy = document.createElement('span');
    speechCopy.className = 'speech-copy';
    speechCopy.setAttribute('aria-hidden', 'true');
    const typedText = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'speech-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    speechCopy.append(typedText, cursor);
    const announcement = document.createElement('span');
    announcement.className = 'visually-hidden';
    speech.append(speechLayout, speechCopy, announcement);
    footer.append(speech);
    let speaking = false;
    let privacySpeaking = false;
    document.addEventListener('portfolio:privacy-speech', event => { privacySpeaking = event.detail.active; });
    let counterSpeech = false;
    let songSpeech = '';
    let mergeSpeech = '';
    let pageSpeech = '';
    let songTimer, speechFadeTimer, typingTimer;
    let displayedMessage = '';
    let speechWidth = 0;
    const positionSpeech = () => {
      if (!speaking) return;
      const center = track.offsetLeft + x + walker.offsetWidth / 2;
      const bubbleLeft = Math.max(12, Math.min(footer.clientWidth - speechWidth - 12, center - speechWidth / 2));
      speech.style.left = `${bubbleLeft}px`;
      speech.style.setProperty('--speech-tail', `${Math.max(10, Math.min(speechWidth - 10, center - bubbleLeft))}px`);
    };
    const renderSpeech = (restart = false) => {
      clearTimeout(speechFadeTimer);
      const message = mergeSpeech || pageSpeech || songSpeech || (counterSpeech ? 'Counting since 16 September 2002.' : '');
      if (message && message === displayedMessage && !restart) return;
      clearTimeout(typingTimer);
      clearTimeout(songTimer);
      displayedMessage = message;
      if (message) {
        // Reserve the complete text width so typing never shifts the bubble or tail.
        speechLayout.textContent = message.toUpperCase() + '\u00a0';
        typedText.textContent = '';
        speech.classList.add('is-typing');
        announcement.textContent = message;
        speaking = true;
        speechWidth = speech.offsetWidth;
        positionSpeech();
        speech.classList.add('is-visible');
        const letters = Array.from(message.toUpperCase());
        let count = 0;
        const type = () => {
          count = reducedMotion.matches ? letters.length : count + 1;
          typedText.textContent = letters.slice(0, count).join('');
          if (count < letters.length) typingTimer = setTimeout(type, 28);
          else {
            speech.classList.remove('is-typing');
            if (mergeSpeech === message) {
              songTimer = setTimeout(() => { mergeSpeech = ''; renderSpeech(); }, 5000);
            } else if (pageSpeech === message) {
              songTimer = setTimeout(() => { pageSpeech = ''; renderSpeech(); }, 5000);
            } else if (songSpeech === message) {
              songTimer = setTimeout(() => { songSpeech = ''; renderSpeech(); }, 2000);
            }
          }
        };
        type();
      } else {
        const letters = Array.from(typedText.textContent);
        let remaining = letters.length;
        const deleteDelay = Math.min(32, 900 / Math.max(1, remaining));
        speech.classList.add('is-typing');
        const erase = () => {
          remaining = reducedMotion.matches ? 0 : Math.max(0, remaining - 1);
          typedText.textContent = letters.slice(0, remaining).join('');
          if (remaining > 0) typingTimer = setTimeout(erase, deleteDelay);
          else {
            speech.classList.remove('is-typing');
            speech.classList.remove('is-visible');
            speechFadeTimer = setTimeout(() => {
              speaking = false;
              speechLayout.textContent = '';
              announcement.textContent = '';
            }, reducedMotion.matches ? 0 : 250);
          }
        };
        erase();
      }
    };
    document.addEventListener('portfolio:speech', event => {
      if (event.detail.kind === 'merge') {
        mergeSpeech = event.detail.text;
        renderSpeech(true);
      } else if (event.detail.kind === 'song') {
        songSpeech = event.detail.text;
        if (!mergeSpeech) renderSpeech(true);
      } else if (event.detail.kind === 'counter') {
        counterSpeech = event.detail.active;
        renderSpeech();
      }
    });

    let left = 12;
    let right = 12;
    let x = left;
    let direction = 1;
    let velocity = 0;
    let stridePhase = 0;
    let gait = 0;
    const body = walker.querySelector('svg');
    const legA = walker.querySelector('.leg-a');
    const legB = walker.querySelector('.leg-b');
    let frame;
    let previousTime;
    let walkingFor = 8;
    let restingFor = 0;
    let backtrackIn = 12 + Math.random() * 6;
    let backtrackFor = 0;
    let originalDirection = 1;
    let blinkIn = 3;
    let blinkFor = 0;
    const randomBetween = (min, max) => min + Math.random() * (max - min);
    const draw = () => {
      walker.style.transform = `translateX(${x}px)`;
      walker.classList.toggle('is-facing-left', direction < 0);
      positionSpeech();
      const swing = Math.sin(stridePhase);
      body.style.transform = `translateY(${-Math.pow(swing, 2) * .65 * gait}px) rotate(${Math.cos(stridePhase) * 1.1 * gait}deg)`;
      legA.style.transform = `translateY(${-Math.max(0, -swing) * 1.1 * gait}px) rotate(${swing * 15 * gait}deg)`;
      legB.style.transform = `translateY(${-Math.max(0, swing) * 1.1 * gait}px) rotate(${-swing * 15 * gait}deg)`;
    };
    const measure = () => {
      const space = Math.max(0, track.clientWidth - walker.offsetWidth);
      speechWidth = speech.offsetWidth;
      left = Math.min(12, space / 2);
      right = Math.max(left, space - 12);
      x = Math.max(left, Math.min(right, x));
      draw();
    };
    const rest = (duration) => {
      restingFor = duration;
      walker.classList.add('is-resting');
      blinkIn = .35;
    };
    const tick = (time) => {
      const elapsed = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, .05);
      previousTime = time;
      const speed = (right - left) / 26;
      const edgeDistance = direction > 0 ? right - x : x - left;
      const edgeEase = Math.min(1, Math.max(.08, edgeDistance / Math.max(1, speed * .7)));
      const pauseEase = backtrackFor > 0 ? 1 : Math.min(1, Math.max(0, walkingFor / .6));
      const targetVelocity = speaking || privacySpeaking || restingFor > 0 ? 0 : direction * speed * edgeEase * pauseEase;
      // Exponential easing keeps acceleration consistent at different frame rates.
      velocity += (targetVelocity - velocity) * (1 - Math.exp(-elapsed / .22));
      x = Math.max(left, Math.min(right, x + velocity * elapsed));
      const moving = speed > 0 ? Math.min(1, Math.abs(velocity) / speed) : 0;
      gait += (moving - gait) * (1 - Math.exp(-elapsed / .16));
      stridePhase += elapsed * (Math.PI * 2 / 1.52) * moving;
      if (!speaking && !privacySpeaking && restingFor > 0) {
        restingFor -= elapsed;
        if (restingFor <= 0) {
          walker.classList.remove('is-resting');
          walkingFor = randomBetween(7, 12);
        }
      } else if (!speaking && !privacySpeaking && right > left) {
        // Keep the existing gentle pace: about 26 seconds across the track.

        if (backtrackFor <= 0) {
          backtrackIn -= elapsed;
          const roomBehind = direction > 0 ? x - left : right - x;
          // Wait for enough room to complete the detour without hitting an edge.
          if (backtrackIn <= 0 && roomBehind > speed * 3 + 2) {
            originalDirection = direction;
            direction *= -1;
            backtrackFor = 3;
          }
        }

        if ((direction > 0 && x >= right - .35) || (direction < 0 && x <= left + .35)) {
          x = Math.max(left, Math.min(right, x));
          direction *= -1;
          velocity = 0;
          backtrackFor = 0;
          backtrackIn = randomBetween(14, 22);
          rest(1.1);
        } else if (backtrackFor > 0) {
          // Save ordinary pauses until after three uninterrupted seconds of walking.
          backtrackFor -= elapsed;
          if (backtrackFor <= 0) {
            direction = originalDirection;
            backtrackIn = randomBetween(14, 22);
          }
        } else {
          walkingFor -= elapsed;
          if (walkingFor <= 0) rest(randomBetween(1.6, 2.4));
        }
      }
      blinkIn -= elapsed;
      if (blinkFor > 0) {
        blinkFor -= elapsed;
        if (blinkFor <= 0) walker.classList.remove('is-blinking');
      } else if (blinkIn <= 0) {
        walker.classList.add('is-blinking');
        blinkFor = .22;
        blinkIn = randomBetween(3, 6);
      }
      draw();
      frame = requestAnimationFrame(tick);
    };
    const syncMotion = () => {
      cancelAnimationFrame(frame);
      previousTime = undefined;
      walker.classList.remove('is-blinking');
      blinkFor = 0;
      if (reducedMotion.matches) { velocity = 0; gait = 0; draw(); }
      walker.classList.toggle('is-resting', reducedMotion.matches || restingFor > 0);
      if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const announceAboutCv = () => {
      const hadPageSpeech = !!pageSpeech;
      pageSpeech = document.querySelector('.about-page .cv-download:not(:disabled)')
        ? "DEAR VISITOR, YOU CAN DOWNLOAD MARINO'S CV BY PRESSING THE DOWNLOAD CV BUTTON." : '';
      if (pageSpeech || hadPageSpeech) renderSpeech(true);
    };
    document.addEventListener('portfolio:page', announceAboutCv);
    announceAboutCv();
    walker.classList.add('walker-behavior');
    measure();
    window.addEventListener('resize', measure);
    document.addEventListener('visibilitychange', syncMotion);
    reducedMotion.addEventListener('change', syncMotion);
    syncMotion();
  }
});

// Buffered audio schedules overlapping loops on the audio clock, not animation frames.
class PortfolioMusicPlayer {
  constructor(tracks, changed) {
    this.tracks = tracks;
    this.changed = changed;
    this.index = Math.floor(Math.random() * tracks.length);
    this.voices = [];
    this.buffers = new Map();
    this.pendingBuffers = new Map();
    this.enabled = false;
    this.busy = false;
    this.generation = 0;
  }
  initialize() {
    if (this.context) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('This browser does not support Web Audio.');
    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = .45;
    this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    this.timer = setInterval(() => this.schedule(), 200);
  }
  load(index) {
    if (this.buffers.has(index)) return Promise.resolve(this.buffers.get(index));
    if (!this.pendingBuffers.has(index)) {
      const pending = this.decodeTrack(index).finally(() => this.pendingBuffers.delete(index));
      this.pendingBuffers.set(index, pending);
    }
    return this.pendingBuffers.get(index);
  }
  async decodeTrack(index) {
    if (this.buffers.has(index)) return this.buffers.get(index);
    const track = this.tracks[index];
    let bytes;
    if (location.protocol === 'file:') {
      const data = await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = track.localSource;
        script.onload = () => {
          const data = window.portfolioMusicSource;
          delete window.portfolioMusicSource;
          script.remove();
          data ? resolve(data) : reject(new Error('Missing local audio data.'));
        };
        script.onerror = () => { script.remove(); reject(new Error('Could not load the audio file.')); };
        document.head.append(script);
      });
      bytes = Uint8Array.from(atob(data.split(',')[1]), char => char.charCodeAt(0)).buffer;
    } else {
      const response = await fetch(track.src);
      if (!response.ok) throw new Error('Could not load the audio file.');
      bytes = await response.arrayBuffer();
    }
    const buffer = await this.context.decodeAudioData(bytes);
    if (buffer.duration < 1) throw new Error('The audio track is too short.');
    this.buffers.set(index, buffer);
    return buffer;
  }
  ramp(parameter, value, time, seconds) {
    // Firefox and older engines may not implement cancelAndHoldAtTime.
    if (typeof parameter.cancelAndHoldAtTime === 'function') {
      parameter.cancelAndHoldAtTime(time);
    } else {
      const current = parameter.value;
      parameter.cancelScheduledValues(time);
      parameter.setValueAtTime(current, time);
    }
    parameter.linearRampToValueAtTime(value, time + seconds);
  }
  voice(buffer, start, fadeIn) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const overlap = Math.min(2.4, buffer.duration / 4);
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.master);
    gain.gain.setValueAtTime(fadeIn ? 0 : 1, start);
    if (fadeIn) gain.gain.linearRampToValueAtTime(1, start + overlap);
    gain.gain.setValueAtTime(1, start + buffer.duration - overlap);
    gain.gain.linearRampToValueAtTime(0, start + buffer.duration);
    const voice = { source, gain, start, end: start + buffer.duration };
    this.voices.push(voice);
    source.onended = () => {
      source.disconnect(); gain.disconnect();
      this.voices = this.voices.filter(item => item !== voice);
    };
    source.start(start);
    this.nextStart = start + buffer.duration - overlap;
  }
  schedule() {
    if (!this.context || !this.buffer || this.context.state !== 'running') return;
    // Always queue the next full loop early; its start and fade are sample-timed.
    if (this.nextStart <= this.context.currentTime + this.buffer.duration) {
      this.voice(this.buffer, Math.max(this.nextStart, this.context.currentTime + .02), true);
    }
  }
  async setEnabled(enabled) {
    this.enabled = enabled;
    const token = ++this.generation;
    clearTimeout(this.suspendTimer);
    if (!enabled) {
      if (this.context) {
        this.ramp(this.master.gain, 0, this.context.currentTime, .8);
        this.suspendTimer = setTimeout(() => {
          if (!this.enabled) this.context.suspend();
        }, 850);
      }
      return;
    }
    this.initialize();
    await this.context.resume();
    const buffer = await this.load(this.index);
    if (token !== this.generation || !this.enabled) return;
    if (!this.buffer) {
      this.buffer = buffer;
      this.voice(buffer, this.context.currentTime + .03, false);
      this.schedule();
    }
    if (document.hidden) await this.context.suspend();
    else this.ramp(this.master.gain, .12, this.context.currentTime, .9);
  }
  async next() {
    if (this.busy || this.tracks.length < 2) return;
    this.busy = true;
    try {
      this.initialize();
      if (!this.enabled) await this.context.suspend();
      const index = (this.index + 1 + Math.floor(Math.random() * (this.tracks.length - 1))) % this.tracks.length;
      const buffer = await this.load(index);
      const now = this.context.currentTime;
      for (const voice of [...this.voices]) {
        if (voice.start > now || !this.enabled) voice.source.stop();
        else {
          this.ramp(voice.gain.gain, 0, now, 2.4);
          voice.source.stop(Math.min(voice.end, now + 2.4));
        }
      }
      this.index = index;
      this.buffer = buffer;
      this.voice(buffer, now + .03, this.enabled);
      this.schedule();
      this.changed(this.tracks[index]);
    } finally { this.busy = false; }
  }
  async visibility() {
    if (!this.context) return;
    if (document.hidden) await this.context.suspend();
    else if (this.enabled) { await this.context.resume(); this.schedule(); }
  }
}

// The player survives navigation; only the page content changes.
document.addEventListener('DOMContentLoaded', () => {
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const tracks = window.portfolioTracks || [
    { title: 'Kids See Ghosts', src: 'assets/audio/kids-see-ghosts-instrumental.mp3', localSource: 'assets/audio/local-music.js' },
    { title: '80 Degrees', src: 'assets/audio/80-degrees-instrumental.mp3', localSource: 'assets/audio/local-80-degrees.js' },
    { title: 'Gone', src: 'assets/audio/gone-instrumental.mp3', localSource: 'assets/audio/local-gone.js' },
    { title: 'Believer', src: 'assets/audio/believer-instrumental.mp3', localSource: 'assets/audio/local-believer.js' }
  ];
  const controls = document.createElement('div');
  controls.className = 'music-controls';
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'sound-toggle';
  button.setAttribute('aria-label', 'Background music');
  const next = document.createElement('button');
  next.type = 'button'; next.className = 'sound-toggle next-track';
  next.textContent = 'next →'; next.setAttribute('aria-label', 'Play next song');
  next.disabled = tracks.length < 2;
  const status = document.createElement('span');
  status.className = 'music-status'; status.hidden = true; status.setAttribute('role', 'status');
  controls.append(button, next);
  footer.classList.add('has-music'); footer.append(controls, status);
  const player = new PortfolioMusicPlayer(tracks, track => {
    document.dispatchEvent(new CustomEvent('portfolio:speech', { detail: { kind: 'song', text: track.title } }));
    status.hidden = true;
    status.textContent = track.title;
  });
  const orbit = document.querySelector('.welcome-orbit');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let audioContext, analyser, waveform, spectrum;
  const audio = { get paused() { return !player.enabled || !player.context || player.context.state !== 'running'; } };
  let visualFrame;
  let lastVisualTime;
  let bassLevel = 0;
  let soundLevel = 0;
  let bassBaseline = 0;
  let midBaseline = 0;
  let highBaseline = 0;
  let kickAccent = 0;
  let shimmer = 0;
  let lastSnareTime = -Infinity;
  let lastHatTime = -Infinity;
  let lastRippleTime = -Infinity;
  let rippleIndex = 0;
  const ripplePool = [];
  // Mid/high halo experiment: self-contained visual, independent of the bass pulse.
  const halo = (() => {
    const drift = orbit && orbit.querySelector('.orb-drift');
    if (!drift) return null;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'music-halo');
    svg.setAttribute('viewBox', '-90 -90 180 180');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(path);
    const ball = drift.querySelector('.welcome-orb');
    ball.parentNode.insertBefore(svg, ball);
    let mid = 0, high = 0, phase = 0;
    let midFloor = 0, highFloor = 0, lift = 0;
    return {
      update(mids, highs, dt) {
        // Accents push lobes outward; between accents the outline hugs the sphere.
        const accent = Math.min(1, Math.max(0, mids - midFloor) / (midFloor + .025) * 1.3
          + Math.max(0, highs - highFloor) / (highFloor + .02) * 1.1);
        lift += (accent - lift) * (1 - Math.exp(-dt / (accent > lift ? .025 : .18)));
        midFloor += (mids - midFloor) * (1 - Math.exp(-dt / .35));
        highFloor += (highs - highFloor) * (1 - Math.exp(-dt / .3));
        const smoothing = 1 - Math.exp(-dt / .04);
        mid += ((1 - Math.exp(-Math.sqrt(mids) * 10)) - mid) * smoothing;
        high += ((1 - Math.exp(-Math.sqrt(highs) * 12)) - high) * smoothing;
        phase += dt * (.55 + mid * 1.1 + high * .7);
        const points = [];
        for (let i = 0; i < 120; i++) {
          const angle = i / 120 * Math.PI * 2;
          const broadWave = Math.pow(Math.max(0, Math.sin(angle * 5 + phase)), 3);
          const fineWave = Math.pow(Math.max(0, Math.sin(angle * 9 - phase * 1.5)), 3);
          const radius = 50.6 + mid * (1.2 + lift * 12) * broadWave
            + high * (.8 + lift * 6) * fineWave;
          points.push(`${i ? 'L' : 'M'}${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`);
        }
        path.setAttribute('d', points.join(' ') + ' Z');
        svg.style.setProperty('--halo-energy', Math.min(1, mid * .7 + high * .6).toFixed(4));
      },
      reset() { mid = high = midFloor = highFloor = lift = 0; svg.style.setProperty('--halo-energy', '0'); }
    };
  })();

  const emitRipple = (strength, kind = 'bass') => {
    const drift = orbit.querySelector('.orb-drift');
    if (!drift || typeof drift.animate !== 'function') return;
    let ripple = ripplePool[rippleIndex];
    if (!ripple) {
      const element = document.createElement('span');
      element.className = 'music-ripple';
      element.setAttribute('aria-hidden', 'true');
      drift.append(element);
      ripple = { element, animation: null };
      ripplePool[rippleIndex] = ripple;
    }
    rippleIndex = (rippleIndex + 1) % 8;
    if (ripple.animation) ripple.animation.cancel();
    const isSnare = kind === 'snare';
    const reach = isSnare ? 1.9 + strength * .45 : 2.5 + strength * .9;
    const opacity = isSnare ? .08 + strength * .10 : .12 + strength * .20;
    ripple.animation = ripple.element.animate([
      { transform: 'scale(1)', opacity: 0, offset: 0 },
      { transform: `scale(${1.18 + strength * .12})`, opacity, offset: .12 },
      { transform: `scale(${reach * .77})`, opacity: opacity * .35, offset: .65 },
      { transform: `scale(${reach})`, opacity: 0, offset: 1 }
    ], { duration: isSnare ? 1350 : 2300 + strength * 500, easing: 'cubic-bezier(.16,.5,.35,1)', fill: 'none' });
  };
  const stopVisuals = () => {
    if (halo) halo.reset();
    cancelAnimationFrame(visualFrame);
    lastVisualTime = undefined;
    bassLevel = soundLevel = bassBaseline = midBaseline = highBaseline = 0;
    kickAccent = shimmer = 0;
    lastSnareTime = lastHatTime = -Infinity;
    lastRippleTime = -Infinity;
    for (const ripple of ripplePool) {
      if (ripple.animation) ripple.animation.cancel();
    }
    if (orbit) {
      orbit.classList.remove('is-sound-reactive');
      orbit.style.removeProperty('--music-bass');
      orbit.style.removeProperty('--music-level');
      orbit.style.removeProperty('--music-kick');
      orbit.style.removeProperty('--music-shimmer');
    }
  };
  const animateSound = (time) => {
    if (!analyser || audio.paused || document.hidden || motionPreference.matches) {
      stopVisuals();
      return;
    }
    const dt = lastVisualTime === undefined ? 1 / 60 : Math.min((time - lastVisualTime) / 1000, .1);
    lastVisualTime = time;
    analyser.getFloatTimeDomainData(waveform);
    analyser.getFloatFrequencyData(spectrum);
    let energy = 0;
    for (const sample of waveform) energy += sample * sample;
    // Normalize against the player's quiet listening volume, retaining its fades.
    const loudness = Math.min(1, Math.sqrt(energy / waveform.length) / .12 * 3);
    const binHz = audioContext.sampleRate / analyser.fftSize;
    let bassEnergy = 0;
    for (let bin = Math.max(1, Math.ceil(35 / binHz)); bin <= Math.min(spectrum.length - 1, Math.floor(180 / binHz)); bin++) {
      bassEnergy += Math.pow(10, spectrum[bin] / 10);
    }
    const bass = Math.min(1, Math.sqrt(bassEnergy) / .12 * 4);
    const bandLevel = (low, high, gain) => {
      let energy = 0;
      for (let bin = Math.max(1, Math.ceil(low / binHz)); bin <= Math.min(spectrum.length - 1, Math.floor(high / binHz)); bin++) {
        energy += Math.pow(10, spectrum[bin] / 10);
      }
      return Math.min(1, Math.sqrt(energy) / .12 * gain);
    };
    const mids = bandLevel(700, 3000, 3);
    const highs = bandLevel(6000, 12000, 4);
    if (halo) halo.update(mids, highs, dt);
    kickAccent *= Math.exp(-dt / .13);
    shimmer *= Math.exp(-dt / .22);
    // Frequency-band accents approximate percussion; spacing prevents visual clutter.
    const kickOnset = bass > .1 && bass > bassBaseline + .07;
    if (kickOnset && time - lastRippleTime > 380) {
      kickAccent = Math.max(kickAccent, bass);
    }
    if (mids > .09 && mids > midBaseline + .075 && !kickOnset &&
        time - lastSnareTime > 650 && time - lastRippleTime > 240) {
      emitRipple(mids, 'snare');
      lastSnareTime = time;
    }
    if (highs > .055 && highs > highBaseline + .045 && time - lastHatTime > 300) {
      shimmer = Math.max(shimmer, highs);
      lastHatTime = time;
    }
    midBaseline += (mids - midBaseline) * (1 - Math.exp(-dt / .55));
    highBaseline += (highs - highBaseline) * (1 - Math.exp(-dt / .4));
    bassBaseline += (bass - bassBaseline) * (1 - Math.exp(-dt / .65));
    const sinceRipple = time - lastRippleTime;
    // New bass accents launch waves; sustained sound emits slower, softer waves.
    if (soundLevel > .035 && bass > .08 && sinceRipple > 380 &&
        (bass > bassBaseline + .055 || sinceRipple > 1050)) {
      emitRipple(Math.min(1, bass * .75 + loudness * .25));
      lastRippleTime = time;
    }
    bassLevel += (bass - bassLevel) * (1 - Math.exp(-dt / (bass > bassLevel ? .028 : .15)));
    soundLevel += (loudness - soundLevel) * (1 - Math.exp(-dt / .12));
    orbit.style.setProperty('--music-bass', bassLevel.toFixed(4));
    orbit.style.setProperty('--music-level', soundLevel.toFixed(4));
    orbit.style.setProperty('--music-kick', kickAccent.toFixed(4));
    orbit.style.setProperty('--music-shimmer', shimmer.toFixed(4));
    visualFrame = requestAnimationFrame(animateSound);
  };
  const startVisuals = () => {
    if (!orbit || !analyser || motionPreference.matches || audio.paused || document.hidden) return;
    cancelAnimationFrame(visualFrame);
    orbit.classList.add('is-sound-reactive');
    lastVisualTime = undefined;
    visualFrame = requestAnimationFrame(animateSound);
  };

  const connectVisuals = () => {
    audioContext = player.context;
    analyser = player.analyser;
    if (!analyser) return;
    waveform = new Float32Array(analyser.fftSize);
    spectrum = new Float32Array(analyser.frequencyBinCount);
    startVisuals();
  };
  const render = () => {
    button.textContent = player.enabled ? 'sound on' : 'sound off';
    button.setAttribute('aria-pressed', String(player.enabled));
  };
  button.addEventListener('click', async () => {
    status.textContent = '';
    status.hidden = true;
    const enabling = !player.enabled;
    try {
      const pending = player.setEnabled(enabling);
      render();
      await pending;
      connectVisuals();
    } catch (error) {
      try { await player.setEnabled(false); } catch (_) { player.enabled = false; }
      stopVisuals(); render();
      status.hidden = false;
      status.textContent = 'Music could not play: ' + (error.message || 'Please try again.');
    }
  });
  next.addEventListener('click', async () => {
    next.disabled = true;
    try {
      if (player.enabled && player.context?.state === 'suspended') player.context.resume().catch(() => {});
      await player.next(); connectVisuals();
    }
    catch (error) { status.hidden = false; status.textContent = 'Could not load the next song: ' + (error.message || 'Please try again.'); }
    finally { next.disabled = tracks.length < 2; }
  });
  document.addEventListener('visibilitychange', async () => {
    try { await player.visibility(); connectVisuals(); }
    catch (error) { status.hidden = false; status.textContent = 'Select sound off, then sound on to resume music.'; }
  });
  window.addEventListener('pagehide', () => { if (player.context) player.context.suspend(); stopVisuals(); });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) stopVisuals(); else startVisuals();
  });
  // Request sound immediately, then retry inside a gesture if autoplay is blocked.
  const startDefaultMusic = async () => {
    try {
      const pending = player.setEnabled(true);
      render();
      await pending;
      connectVisuals();
      if (player.enabled) player.changed(tracks[player.index]);
    } catch (error) {
      if (error.name === 'NotAllowedError') return;
      await player.setEnabled(false);
      render();
      status.hidden = false;
      status.textContent = 'Music could not play. Select sound on to try again.';
    }
  };
  const unlockMusic = event => {
    if (event.target.closest?.('.music-controls')) return;
    if (player.enabled && player.context?.state === 'suspended') startDefaultMusic();
  };
  document.addEventListener('pointerdown', unlockMusic);
  document.addEventListener('keydown', unlockMusic);
  startDefaultMusic();
});

// Calendar breakdown in Athens, from years down to seconds.
const counterCalendar = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Athens', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'
});
function elapsedCalendar(now) {
  const parts = Object.fromEntries(counterCalendar.formatToParts(now)
    .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  let months = (parts.year - 2002) * 12 + parts.month - 9;
  if (parts.day < 16) months--;
  months = Math.max(0, months);
  const anniversary = new Date(Date.UTC(2002, 8 + months, 16));
  const localNow = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const remainder = Math.max(0, Math.floor((localNow - anniversary.getTime()) / 1000));
  return { years: Math.floor(months / 12), months: months % 12,
    weeks: Math.floor(remainder / 604800), days: Math.floor(remainder / 86400) % 7, hours: Math.floor(remainder % 86400 / 3600), minutes: Math.floor(remainder % 3600 / 60), seconds: remainder % 60 };
}

// One persistent, wall-clock-based counter survives in-site navigation.
document.addEventListener('DOMContentLoaded', () => {
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const counter = document.createElement('span');
  counter.className = 'footer-counter';
  counter.tabIndex = 0;
  counter.setAttribute('aria-live', 'off');
  const start = Date.parse('2002-09-16T00:00:00+03:00');
  const format = new Intl.NumberFormat('en-US');
  let timer;
  let hovered = false;
  let focused = false;
  let detailed = false;
  let returnTimer;
  let fadeTimer;
  const reducedCounterMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    clearTimeout(timer);
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - start) / 1000));
    if (detailed) {
      const age = elapsedCalendar(now);
      counter.textContent = `${age.years}Y | ${age.months}MO | ${age.weeks}W | ${age.days}D | ${age.hours}H | ${age.minutes}MIN | ${age.seconds}S`;
      counter.setAttribute('aria-label', `${age.years} years, ${age.months} months, ${age.weeks} weeks, ${age.days} days, ${age.hours} hours, ${age.minutes} minutes, ${age.seconds} seconds since 16 September 2002`);
    } else {
      counter.textContent = String(seconds);
      counter.setAttribute('aria-label', `${format.format(seconds)} seconds since 16 September 2002. Focus to show years, months, weeks, days, hours, minutes and seconds.`);
    }
    if (!document.hidden) timer = setTimeout(update, 1000 - now % 1000);
  };
  const showDetails = () => {
    document.dispatchEvent(new CustomEvent('portfolio:speech', { detail: { kind: 'counter', active: true } }));
    clearTimeout(returnTimer);
    clearTimeout(fadeTimer);
    counter.classList.remove('is-fading');
    detailed = true;
    update();
  };
  const scheduleReturn = () => {
    document.dispatchEvent(new CustomEvent('portfolio:speech', { detail: { kind: 'counter', active: hovered || focused } }));
    clearTimeout(returnTimer);
    if (hovered || focused) return;
    returnTimer = setTimeout(() => {
      counter.classList.add('is-fading');
      fadeTimer = setTimeout(() => {
        detailed = false;
        update();
        counter.classList.remove('is-fading');
      }, reducedCounterMotion.matches ? 0 : 220);
    }, 2000);
  };
  counter.addEventListener('pointerenter', () => { hovered = true; showDetails(); });
  counter.addEventListener('pointerleave', () => { hovered = false; scheduleReturn(); });
  counter.addEventListener('focus', () => { focused = true; showDetails(); });
  counter.addEventListener('blur', () => { focused = false; scheduleReturn(); });
  footer.classList.add('has-counter');
  footer.append(counter);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', () => {
    clearTimeout(timer); clearTimeout(returnTimer); clearTimeout(fadeTimer);
    counter.classList.remove('is-fading');
    detailed = hovered || focused;
  });
  window.addEventListener('pageshow', update);
  update();
});

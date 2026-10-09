// Tab sessions expire after 30 minutes without a successful heartbeat.
(() => {
  const config = window.visitorMapConfig || {};
  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== 'https:') endpoint = null;
  } catch { endpoint = null; }
  const blocked = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  const enabled = endpoint && location.protocol === 'https:';
  // Preview is available only until a real endpoint is configured.
  let preview = null;
  const samples = [
    { latitude: 51.5, longitude: -.1, country: 'GB', city: 'London', visits: 4 },
    { latitude: 48.9, longitude: 2.3, country: 'FR', city: 'Paris', visits: 2 },
    { latitude: 40.7, longitude: -74, country: 'US', city: 'New York', visits: 6 },
    { latitude: -23.6, longitude: -46.6, country: 'BR', city: 'Sao Paulo', visits: 3 },
    { latitude: 35.7, longitude: 139.7, country: 'JP', city: 'Tokyo', visits: 5 },
    { latitude: -33.9, longitude: 151.2, country: 'AU', city: 'Sydney', visits: 2 }
  ];
  const storageKey = 'portfolio-visit-v1';
  let visit, recording, timer, heartbeat, controller, generation = 0;
  window.portfolioVisitorLocations = [];
  window.visitorLocationLabel = location => {
    const name = [location.city, location.country].filter(Boolean).join(', ') || 'Approximate location';
    const minutes = Math.max(1, Math.floor((Date.now() / 1000 - location.lastSeen) / 60));
    const state = location.online > 0 ? `${location.online} online` : Number.isFinite(location.lastSeen) ? `last seen ${minutes} min ago` : 'status unavailable';
    return `${name} · ${state} · ${location.visits} ${location.visits === 1 ? 'visit' : 'visits'}`;
  };
  const publish = locations => {
    window.portfolioVisitorLocations = locations;
    const list = document.querySelector('.visitor-location-list');
    if (list) {
      list.replaceChildren();
      for (const location of locations) {
        const item = document.createElement('li');
        item.textContent = window.visitorLocationLabel(location);
        list.appendChild(item);
      }
    }
    document.dispatchEvent(new Event('portfolio:visitors'));
  };
  const status = text => {
    const node = document.querySelector('.visitor-map-status');
    if (node) node.textContent = text;
  };
  const request = (path, options = {}) => fetch(new URL(path, endpoint), {
    credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', ...options
  });
  const record = async () => {
    if (!enabled || blocked || recording) return recording;
    recording = (async () => {
      try {
        if (!visit) {
          try { visit = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
        }
        if (!visit || typeof visit.id !== 'string' || !Number.isFinite(visit.time) || Date.now() - visit.time > 1800000 || visit.time > Date.now()) {
          visit = { id: crypto.randomUUID(), time: Date.now(), sent: false };
        }
        if (visit.sent && Date.now() - visit.time < 45000) return;
        // Persist the ID before sending so retrying after a reload cannot double-count it.
        try { sessionStorage.setItem(storageKey, JSON.stringify(visit)); } catch {}
        const result = await request('/visit', { method: 'POST', headers: { 'X-Visit-Id': visit.id }, signal: AbortSignal.timeout(8000) });
        if (!result.ok) return;
        visit.sent = true;
        visit.time = Date.now();
        try { sessionStorage.setItem(storageKey, JSON.stringify(visit)); } catch {}
      } catch { /* Analytics must never interrupt navigation or audio. */ }
    })();
    try { await recording; } finally { recording = null; }
  };
  const refresh = async token => {
    if (token !== generation || document.hidden || !document.querySelector('.visitor-map-status')) return;
    const requestController = new AbortController();
    controller = requestController;
    const timeout = setTimeout(() => requestController.abort(), 8000);
    try {
      const response = await request('/locations', { signal: requestController.signal });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (!Array.isArray(data.locations)) throw new Error('invalid data');
      const locations = data.locations.slice(0, 500).filter(p => Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180 && Number.isInteger(p.visits) && p.visits > 0);
      if (token !== generation) return;
      publish(locations);
      const count = locations.reduce((sum, p) => sum + p.visits, 0);
      status(count ? `${count.toLocaleString()}${data.truncated ? '+' : ''} mapped ${count === 1 ? 'visit' : 'visits'} · last 24 hours` : 'No mapped visits in the last 24 hours');
    } catch {
      if (token === generation) { publish([]); status('Visitor map temporarily unavailable'); }
    } finally {
      clearTimeout(timeout);
      if (token === generation && !document.hidden) timer = setTimeout(() => refresh(token), 60000);
    }
  };
  const sync = async () => {
    const token = ++generation;
    clearTimeout(timer); clearTimeout(heartbeat); controller?.abort();
    if (document.hidden) return;
    const controls = document.querySelector('.visitor-demo-controls');
    if (controls) controls.hidden = Boolean(endpoint);
    const note = document.querySelector('.visitor-map-note');
    if (note) note.textContent = preview ? 'Preview only · sample data, no visits recorded' : 'Approximate locations · no raw IP addresses stored';
    if (!endpoint && preview) {
            const now = Math.floor(Date.now() / 1000);
      publish(preview === 'visitors' ? samples.map((p, i) => ({ ...p, online: i % 2 === 0 ? 1 : 0, lastSeen: now - [10, 180, 15, 720, 20, 2100][i] })) : []);
      status(preview === 'visitors' ? 'DEMO · 22 sample visits across 6 locations' : 'DEMO · No mapped visits in the last 24 hours');
      return;
    }
    if (!enabled) { publish([]); status('Visitor map not connected yet'); return; }
    status('Loading visitor map…');
    await record();
    if (token === generation) {
      refresh(token);
      const beat = async () => {
        if (token !== generation || document.hidden || blocked) return;
        await record();
        if (token === generation && !document.hidden) heartbeat = setTimeout(beat, 60000);
      };
      if (!blocked) heartbeat = setTimeout(beat, 60000);
    }
  };
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-visitor-preview]');
    if (!button || endpoint) return;
    const mode = button.dataset.visitorPreview;
    if (!['visitors', 'empty', 'off'].includes(mode)) return;
    preview = mode === 'off' ? null : mode;
    sync();
  });
  document.addEventListener('DOMContentLoaded', sync);
  document.addEventListener('portfolio:page', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { generation++; clearTimeout(timer); clearTimeout(heartbeat); controller?.abort(); });
  window.addEventListener('pageshow', event => { if (event.persisted) sync(); });
})();
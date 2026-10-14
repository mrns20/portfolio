// No statistics requests or identifier storage before explicit consent.
(() => {
  let endpoint;
  try { endpoint = new URL(window.visitorMapConfig?.endpoint); } catch {}
  const enabled = endpoint?.protocol === 'https:' && location.protocol === 'https:';
  const key = 'portfolio-city-visit-v3';
  const allowed = () => enabled && window.portfolioPrivacy?.allowed() === true;
  let visit, recording, controller, timer, generation = 0;
  let deleting = Promise.resolve();
  window.portfolioVisitorLocations = [];
  window.portfolioVisitorCountries = [];
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const countryName = country => country ? names.of(country) : 'Unknown country';
  window.visitorLocationLabel = item => `${item.city}, ${countryName(item.country)} · ${item.visits} ${item.visits === 1 ? 'visit' : 'visits'}`;
  const status = text => { const node = document.querySelector('.visitor-map-status'); if (node) node.textContent = text; };
  const clearDisplay = () => {
    window.portfolioVisitorLocations = []; window.portfolioVisitorCountries = [];
    document.dispatchEvent(new Event('portfolio:visitors'));
    document.querySelectorAll('[data-visitor-online], [data-visitor-total]').forEach(node => { node.textContent = '—'; });
    const track = document.querySelector('.visitor-ticker-track');
    if (track) { track.replaceChildren(); delete track.dataset.summary; }
    document.querySelector('.visitor-location-list')?.replaceChildren();
  };
  const render = data => {
    const countries = data.countries.filter(p => (p.country === null || /^[A-Z]{2}$/.test(p.country)) && Number.isInteger(p.visits) && p.visits >= 1);
    window.portfolioVisitorCountries = countries;
    window.portfolioVisitorLocations = data.locations.filter(p => typeof p.city === 'string' && /^[A-Z]{2}$/.test(p.country) && Number.isInteger(p.visits) && p.visits >= 1 && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180);
    document.dispatchEvent(new Event('portfolio:visitors'));
    const online = document.querySelector('[data-visitor-online]'), total = document.querySelector('[data-visitor-total]');
    if (online) online.textContent = data.online.toLocaleString('en');
    if (total) total.textContent = data.total.toLocaleString('en');
    const labels = countries.map(item => `${countryName(item.country)} · ${item.visits.toLocaleString('en')} ${item.visits === 1 ? 'visit' : 'visits'}`);
    const track = document.querySelector('.visitor-ticker-track');
    if (track && track.dataset.summary !== labels.join('|')) {
      track.dataset.summary = labels.join('|'); track.replaceChildren();
      const group = document.createElement('span'); group.className = 'visitor-ticker-group';
      for (const label of labels) { const item = document.createElement('span'); item.textContent = label; group.append(item); }
      track.append(group);
      const copy = group.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); track.append(copy);
      track.style.setProperty('--ticker-duration', `${Math.max(24, labels.join('').length / 4)}s`);
    }
    const list = document.querySelector('.visitor-location-list'); list?.replaceChildren();
    for (const item of window.portfolioVisitorLocations) { const li = document.createElement('li'); li.textContent = window.visitorLocationLabel(item); list?.append(li); }
    status(data.total ? 'Consented visits · approximate city dots' : 'No consented visits in the last 24 hours');
  };
  const request = (path, options = {}) => fetch(new URL(path, endpoint), {
    credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', ...options
  });
  const record = () => {
    if (!allowed()) return Promise.resolve();
    if (recording) return recording;
    const deletion = deleting;
    recording = (async () => {
      await deletion;
      if (!allowed()) return;
      if (!visit) { try { visit = JSON.parse(sessionStorage.getItem(key)); } catch {} }
      if (!visit || !/^[0-9a-f-]{36}$/i.test(visit.id || '') || !Number.isFinite(visit.time) || Date.now() - visit.time >= 86400000 || visit.time > Date.now()) {
        visit = { id: crypto.randomUUID(), time: Date.now(), sent: false };
      }
      if (Number.isFinite(visit.lastSent) && Date.now() - visit.lastSent < 55000) return;
      const current = visit;
      try { sessionStorage.setItem(key, JSON.stringify(current)); } catch {}
      const result = await request('/visit', { method: 'POST', headers: { 'X-Visit-Id': current.id, 'X-Statistics-Consent': 'v2' }, signal: AbortSignal.timeout(8000) });
      if (!result.ok) throw new Error('Visit unavailable');
      if (allowed() && visit === current) { current.lastSent = Date.now(); try { sessionStorage.setItem(key, JSON.stringify(current)); } catch {} }
    })().catch(() => {}).finally(() => { recording = null; });
    return recording;
  };
  const sync = async () => {
    const token = ++generation;
    clearTimeout(timer); controller?.abort();
    if (!allowed()) { clearDisplay(); status('Statistics off · enable in Privacy settings'); return; }
    if (document.hidden) return;
    await record();
    if (token !== generation || !allowed() || document.hidden) return;
    if (!document.querySelector('.visitor-map-status')) { timer = setTimeout(sync, 60000); return; }
    const activeController = new AbortController(); controller = activeController;
    const timeout = setTimeout(() => activeController.abort(), 8000);
    try {
      const response = await request('/statistics', { signal: activeController.signal });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.countries) || !Array.isArray(data.locations) || !Number.isInteger(data.total) || !Number.isInteger(data.online) || data.online < 0 || data.total < data.online) throw new Error();
      if (token !== generation || !allowed()) return;
      render(data);
    } catch { if (token === generation && allowed()) { clearDisplay(); status('Visitor statistics temporarily unavailable'); } }
    finally { clearTimeout(timeout); if (token === generation && allowed() && !document.hidden) timer = setTimeout(sync, 60000); }
  };
  document.addEventListener('portfolio:privacy', () => {
    if (!allowed()) {
      let previous = visit;
      if (!previous) { try { previous = JSON.parse(sessionStorage.getItem(key)); } catch {} }
      const pending = recording;
      visit = null;
      try { sessionStorage.removeItem(key); sessionStorage.removeItem('portfolio-visit-v1'); } catch {}
      deleting = (async () => {
        await pending;
        if (enabled && previous?.id) {
          try { await request('/visit', { method: 'DELETE', headers: { 'X-Visit-Id': previous.id }, signal: AbortSignal.timeout(8000) }); } catch {}
        }
      })();
    }
    sync();
  });
  document.addEventListener('DOMContentLoaded', () => {
    try { sessionStorage.removeItem('portfolio-visit-v1'); sessionStorage.removeItem('portfolio-country-visit-v2'); } catch {}
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-ticker-pause]'); if (!button) return;
      const ticker = document.querySelector('.visitor-ticker');
      const paused = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = paused ? 'Resume' : 'Pause'; ticker?.classList.toggle('is-paused', paused);
    });
    sync();
  });
  document.addEventListener('portfolio:page', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { ++generation; clearTimeout(timer); controller?.abort(); });
  window.addEventListener('pageshow', event => { if (event.persisted) sync(); });
})();

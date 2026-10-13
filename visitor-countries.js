// No statistics requests or identifier storage before explicit consent.
(() => {
  let endpoint;
  try { endpoint = new URL(window.visitorMapConfig?.endpoint); } catch {}
  const enabled = endpoint?.protocol === 'https:' && location.protocol === 'https:';
  const key = 'portfolio-country-visit-v2';
  const allowed = () => enabled && window.portfolioPrivacy?.allowed() === true;
  let visit, recording, controller, timer, generation = 0;
  let deleting = Promise.resolve();
  window.portfolioVisitorLocations = [];
  const status = text => { const node = document.querySelector('.visitor-map-status'); if (node) node.textContent = text; };
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
      if (visit.sent) return;
      const current = visit;
      try { sessionStorage.setItem(key, JSON.stringify(current)); } catch {}
      const result = await request('/visit', { method: 'POST', headers: { 'X-Visit-Id': current.id, 'X-Statistics-Consent': 'v1' }, signal: AbortSignal.timeout(8000) });
      if (result.ok && allowed() && visit === current) { current.sent = true; try { sessionStorage.setItem(key, JSON.stringify(current)); } catch {} }
    })().catch(() => {}).finally(() => { recording = null; });
    return recording;
  };
  const sync = async () => {
    const token = ++generation;
    clearTimeout(timer); controller?.abort();
    document.querySelector('.visitor-location-list')?.replaceChildren();
    if (!allowed()) { status('Visitor statistics are off · manage in Privacy settings'); return; }
    if (document.hidden) return;
    await record();
    if (token !== generation || !allowed() || !document.querySelector('.visitor-map-status')) return;
    const activeController = new AbortController(); controller = activeController;
    const timeout = setTimeout(() => activeController.abort(), 8000);
    try {
      const response = await request('/countries', { signal: activeController.signal });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.countries)) throw new Error();
      if (token !== generation || !allowed()) return;
      const names = new Intl.DisplayNames(['en'], { type: 'region' });
      const list = document.querySelector('.visitor-location-list');
      const countries = data.countries.filter(p => /^[A-Z]{2}$/.test(p.country) && Number.isInteger(p.visits) && p.visits >= 3);
      for (const item of countries) {
        const li = document.createElement('li'); li.textContent = `${names.of(item.country)} · ${item.visits} visits`; list?.append(li);
      }
      status(countries.length ? 'Consented country totals · last 24 hours' : 'No country has three consented visits yet');
    } catch { if (token === generation && allowed()) status('Visitor statistics temporarily unavailable'); }
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
  document.addEventListener('DOMContentLoaded', () => { try { sessionStorage.removeItem('portfolio-visit-v1'); } catch {} sync(); });
  document.addEventListener('portfolio:page', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { ++generation; clearTimeout(timer); controller?.abort(); });
  window.addEventListener('pageshow', event => { if (event.persisted) sync(); });
})();

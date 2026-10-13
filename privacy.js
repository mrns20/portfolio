// Optional statistics stay off until an explicit choice is made.
(() => {
  const key = 'portfolio-privacy-v1';
  const blocked = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  let choice = null;
  try { choice = localStorage.getItem(key); } catch {}
  if (!['accepted', 'declined'].includes(choice)) choice = null;
  const allowed = () => !blocked && choice === 'accepted';
  window.portfolioPrivacy = { allowed };
  let panel, notice;
  const update = () => {
    if (!panel) return;
    panel.hidden = choice !== null || blocked;
    panel.querySelector('[data-accept]').disabled = blocked;
    panel.querySelector('[data-status]').textContent = blocked ? 'Your browser privacy signal keeps statistics off.' : allowed() ? 'Statistics are currently on.' : 'Statistics are currently off.';
  };
  const choose = value => {
    choice = value;
    try { localStorage.setItem(key, value); } catch {}
    update();
    document.dispatchEvent(new Event('portfolio:privacy'));
  };
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    choice = ['accepted', 'declined'].includes(event.newValue) ? event.newValue : null;
    update(); document.dispatchEvent(new Event('portfolio:privacy'));
  });
  document.addEventListener('DOMContentLoaded', () => {
    panel = document.createElement('section');
    panel.className = 'privacy-panel';
    panel.setAttribute('aria-label', 'Optional visitor statistics');
    panel.innerHTML = `<h2>Optional visitor statistics</h2>
      <p>May this site count your visit and include your country in public totals? This uses a random tab ID and Cloudflare’s approximate country lookup. No city or live activity is shown. Records expire after 24 hours.</p>
      <p data-status role="status"></p>
      <div class="privacy-actions"><button type="button" data-accept>Allow statistics</button><button type="button" data-decline>Decline / turn off</button><button type="button" data-close>Close</button></div>
      <button type="button" class="privacy-text-link" data-notice>Read privacy notice</button>`;
    notice = document.createElement('dialog');
    notice.className = 'privacy-notice';
    notice.setAttribute('aria-labelledby', 'privacy-title');
    notice.innerHTML = `<h2 id="privacy-title">Privacy</h2>
      <p>Updated 13 October 2026. Site operator: Marinos Tselani. Contact: <a href="mailto:marinotselani12@gmail.com">marinotselani12@gmail.com</a>.</p>
      <h3>Optional statistics</h3>
      <p>With your consent, your browser sends a random tab ID to Cloudflare. Cloudflare receives your IP address through the network request and derives an approximate country. The application stores the ID, country code and recording time, not your raw IP, city, coordinates, browser details or browsing history. Counts describe tab sessions, not unique people. Declining does not restrict the portfolio.</p>
      <p>Country totals for the last 24 hours are public, only where at least three sessions are counted. No online status or last-seen time is published. Records leave public results after 24 hours and hourly cleanup removes them from the active database normally within 25 hours of recording. Provider backups and infrastructure logs have separate retention. Historical records from the previous map are no longer served and are scheduled for expiry.</p>
      <h3>Choices and storage</h3>
      <p>Use Privacy settings on any page to withdraw consent. Turning statistics off stops collection, clears this tab’s ID and requests deletion of its record. If the server cannot be reached, the record expires on schedule. Closing the tab clears its session ID. Your allow/decline preference is stored locally until changed or cleared. Do Not Track and Global Privacy Control override consent. Heading-animation state stays in page memory.</p>
      <h3>Providers</h3>
      <p>GitHub Pages hosts this website; Cloudflare Workers and D1 provide optional statistics. Providers process network requests and may process data outside the EEA under their applicable terms and safeguards. Fonts are hosted with this website, without Google Fonts requests. External links contact their destinations when followed.</p>
      <p><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub privacy</a> · <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare privacy</a></p>
      <h3>Your rights</h3>
      <p>Withdrawal does not affect earlier lawful processing. Where applicable, you may request access, correction, erasure, restriction or portability, and object to processing. Contact the address above; locating a record may require its random tab ID. You may complain to the <a href="https://www.dpa.gr/" target="_blank" rel="noopener noreferrer">Hellenic Data Protection Authority</a>.</p>
      <form method="dialog"><button>Close privacy notice</button></form>`;
    document.body.append(panel, notice);
    const settings = document.createElement('button');
    settings.type = 'button'; settings.className = 'privacy-settings'; settings.textContent = 'Privacy settings';
    settings.addEventListener('click', () => { update(); panel.hidden = false; panel.querySelector('[data-decline]').focus(); });
    document.body.append(settings);
    panel.querySelector('[data-accept]').addEventListener('click', () => { if (!blocked) choose('accepted'); });
    panel.querySelector('[data-decline]').addEventListener('click', () => choose('declined'));
    panel.querySelector('[data-close]').addEventListener('click', () => { panel.hidden = true; settings.focus(); });
    panel.querySelector('[data-notice]').addEventListener('click', () => notice.showModal());
    update();
  });
})();

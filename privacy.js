// Optional statistics stay off until an explicit choice is made.
(() => {
  const key = 'portfolio-privacy-v2';
  const blocked = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  let choice = null;
  try { choice = localStorage.getItem(key); } catch {}
  // A country-only opt-in does not cover public city dots or activity.
  try { if (choice === null && localStorage.getItem('portfolio-privacy-v1') === 'declined') choice = 'declined'; } catch {}
  // Remember refusals only. Location sharing must be explicitly allowed on this visit.
  if (choice !== 'declined') choice = null;
  const allowed = () => !blocked && choice === 'accepted';
  window.portfolioPrivacy = { allowed };
  let panel, notice, settings, promptShown = false, positionFrame;
  const positionBubble = () => {
    if (!panel || panel.hidden) return;
    const walker = document.querySelector('.walker');
    const footer = document.querySelector('.site-footer');
    const bounds = (walker || footer).getBoundingClientRect();
    const center = bounds.left + bounds.width / 2;
    const width = panel.offsetWidth;
    const left = Math.max(16, Math.min(innerWidth - width - 16, center - width / 2));
    panel.style.left = `${left}px`;
    panel.style.setProperty('--privacy-bottom', `${Math.max(16, innerHeight - bounds.top + 18)}px`);
    panel.style.setProperty('--privacy-tail', `${Math.max(18, Math.min(width - 18, center - left))}px`);
    positionFrame = requestAnimationFrame(positionBubble);
  };
  const showPanel = visible => {
    if (!panel) return;
    panel.hidden = !visible;
    document.querySelector('.site-footer')?.classList.toggle('has-privacy-speech', visible);
    document.dispatchEvent(new CustomEvent('portfolio:privacy-speech', { detail: { active: visible } }));
    cancelAnimationFrame(positionFrame);
    if (visible) positionBubble();
  };
  const firstConnect = () => {
    if (!panel) return;
    if (!document.querySelector('#connect')) { showPanel(false); return; }
    if (!promptShown && choice === null && !blocked) {
      promptShown = true;
      update();
      showPanel(true);
    }
  };
  const update = () => {
    if (!panel) return;
    panel.querySelector('[data-accept]').disabled = blocked;
    panel.querySelector('[data-status]').textContent = blocked ? 'Your browser privacy signal keeps statistics off.' : allowed() ? 'Statistics are currently on.' : 'Statistics are currently off.';
  };
  const choose = value => {
    choice = value;
    try {
      if (value === 'declined') localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {}
    update();
    showPanel(false);
    settings?.focus();
    document.dispatchEvent(new Event('portfolio:privacy'));
  };
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    // Another tab can revoke permission, but cannot grant it for this visit.
    choice = event.newValue === 'declined' ? 'declined' : null;
    update(); showPanel(false); document.dispatchEvent(new Event('portfolio:privacy'));
  });
  document.addEventListener('DOMContentLoaded', () => {
    panel = document.createElement('section');
    panel.className = 'privacy-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Optional location sharing');
    panel.innerHTML = `<div class="privacy-panel-content"><h2>Share your approximate location?</h2>
      <p>Only if you allow it, Cloudflare will estimate your city from your IP address. Your approximate city will appear as a public globe dot, and your visit and activity will be counted. Even one visit is shown. Records expire after 24 hours. Closing this prompt keeps location sharing off.</p>
      <p data-status role="status"></p>
      <div class="privacy-actions"><button type="button" data-accept>Share location for this visit</button><button type="button" data-decline>Decline / turn off</button><button type="button" data-close>Close</button></div>
      <button type="button" class="privacy-text-link" data-notice>Read privacy notice</button></div>`;
    notice = document.createElement('dialog');
    notice.className = 'privacy-notice';
    notice.setAttribute('aria-labelledby', 'privacy-title');
    notice.innerHTML = `<h2 id="privacy-title">Privacy</h2>
      <p>Updated 23 October 2026. Site operator: Marinos Tselani. Contact: <a href="mailto:marinotselani12@gmail.com">marinotselani12@gmail.com</a>.</p>
      <h3>Optional statistics</h3>
      <p>With your consent, your browser sends a random tab ID to Cloudflare. Cloudflare receives your IP address and estimates your country and city. The application stores the ID, country, city, approximate coordinates rounded to two decimal places, creation time and last-active time. It does not store your raw IP or request GPS access. IP locations can be inaccurate. Visits count browser-tab sessions, not unique people. Declining does not restrict the portfolio.</p>
      <p>Country totals, city dots and an overall online count are public, including groups with just one visit. A single visit can therefore reveal an approximate city and recent activity. While the site is visible, an opted-in tab sends an update about once a minute; online means active within the last two minutes. Public results contain aggregate counts and approximate city locations, never session IDs or individual timestamps. Visits leave results 24 hours after creation; activity updates do not extend this window. Hourly cleanup normally removes records within 25 hours. Provider backups and infrastructure logs have separate retention. Earlier country-only consent is not reused for city or activity collection.</p>
      <h3>Choices and storage</h3>
      <p>Use Privacy settings on any page to withdraw consent. Turning statistics off stops collection, clears this tab’s ID and requests deletion of its record. If the server cannot be reached, the record expires on schedule. Closing the tab clears its session ID. Permission lasts only for this visit and is not restored after reloading or reopening the site. Declining is remembered locally until changed or cleared. Do Not Track and Global Privacy Control override consent. Heading-animation state stays in page memory.</p>
      <h3>Providers</h3>
      <p>GitHub Pages hosts this website; Cloudflare Workers and D1 provide optional statistics. Providers process network requests and may process data outside the EEA under their applicable terms and safeguards. Fonts are hosted with this website, without Google Fonts requests. External links contact their destinations when followed.</p>
      <p><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub privacy</a> · <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare privacy</a></p>
      <h3>Your rights</h3>
      <p>Withdrawal does not affect earlier lawful processing. Where applicable, you may request access, correction, erasure, restriction or portability, and object to processing. Contact the address above; locating a record may require its random tab ID. You may complain to the <a href="https://www.dpa.gr/" target="_blank" rel="noopener noreferrer">Hellenic Data Protection Authority</a>.</p>
      <form method="dialog"><button>Close privacy notice</button></form>`;
    document.body.append(panel, notice);
    settings = document.createElement('button');
    settings.type = 'button'; settings.className = 'privacy-settings'; settings.textContent = 'Privacy settings';
    settings.addEventListener('click', () => { update(); showPanel(true); panel.querySelector('[data-decline]').focus(); });
    const footerIdentity = document.querySelector('.site-footer .footer-side');
    const footerCenter = document.createElement('div');
    footerCenter.className = 'footer-center';
    const footer = footerIdentity.closest('.site-footer');
    footerCenter.append(footerIdentity, footer.querySelector('.footer-counter'), settings);
    footer.append(footerCenter);
    panel.querySelector('[data-accept]').addEventListener('click', () => { if (!blocked) choose('accepted'); });
    panel.querySelector('[data-decline]').addEventListener('click', () => choose('declined'));
    panel.querySelector('[data-close]').addEventListener('click', () => { showPanel(false); settings.focus(); });
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') { showPanel(false); settings.focus(); } });
    panel.querySelector('[data-notice]').addEventListener('click', () => notice.showModal());
    notice.addEventListener('click', event => {
      if (event.target !== notice) return;
      const bounds = notice.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) {
        notice.close();
      }
    });
    update();
    firstConnect();
  });
  document.addEventListener('portfolio:page', firstConnect);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(positionFrame); });
  window.addEventListener('pageshow', event => { if (event.persisted && panel && !panel.hidden) { cancelAnimationFrame(positionFrame); positionBubble(); } });
})();

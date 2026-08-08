(function () {
  const CONSENT_KEY = 'zooesponji_cookie_consent';
  const ANALYTICS_SCRIPT_SRC = 'js/analytics.js';

  function getConsent(storage) {
    try {
      return storage.getItem(CONSENT_KEY);
    } catch (err) {
      return null;
    }
  }

  function setConsent(storage, value) {
    try {
      storage.setItem(CONSENT_KEY, value);
    } catch (err) {
      // Storage blocked — the banner will just show again next visit.
    }
  }

  function loadAnalytics() {
    const script = document.createElement('script');
    script.src = ANALYTICS_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }

  function showBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <p>Usamos cookies de analítica para saber cuánta gente visita el zoo. ¿Las aceptas?</p>
      <div class="cookie-banner-actions">
        <button id="cookie-accept">Aceptar</button>
        <button id="cookie-reject">Rechazar</button>
      </div>
    `;
    document.body.appendChild(banner);

    banner.querySelector('#cookie-accept').addEventListener('click', () => {
      setConsent(window.localStorage, 'accepted');
      banner.remove();
      loadAnalytics();
    });

    banner.querySelector('#cookie-reject').addEventListener('click', () => {
      setConsent(window.localStorage, 'rejected');
      banner.remove();
    });
  }

  const consent = getConsent(window.localStorage);
  if (consent === 'accepted') {
    loadAnalytics();
  } else if (consent !== 'rejected') {
    showBanner();
  }
})();

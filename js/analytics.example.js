// Plantilla de ejemplo — este archivo NO se carga en el juego.
//
// Copia este archivo como `js/analytics.js` (nombre que ya está en
// .gitignore, así que nunca se sube al repo público) y rellena tu URL
// y Site ID de Matomo. `js/cookie-consent.js` lo carga automáticamente
// en cuanto el usuario acepta las cookies del banner.
//
// Solo hace falta hacerlo una vez por servidor: al estar en .gitignore,
// los futuros `git pull` nunca tocan ni borran este archivo.

var _paq = (window._paq = window._paq || []);
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
(function () {
  var u = 'https://TU-DOMINIO-MATOMO/';
  _paq.push(['setTrackerUrl', u + 'matomo.php']);
  _paq.push(['setSiteId', 'TU_SITE_ID']);
  var d = document,
    g = d.createElement('script'),
    s = d.getElementsByTagName('script')[0];
  g.async = true;
  g.src = u + 'matomo.js';
  s.parentNode.insertBefore(g, s);
})();

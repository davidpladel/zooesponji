// Aviso de cookies y Matomo. Nada de medición hasta que la persona pulse «Aceptar»; «Rechazar» pesa lo mismo.
// La elección se guarda en este navegador 12 meses y se puede cambiar con «Cookies» del pie.
(() => {
  const CLAVE = 'zoo-cookies';
  const DURACION = 365 * 24 * 3600 * 1000;
  const en = document.documentElement.lang === 'en';
  const textos = en
    ? { aviso: 'We would like to use our own analytics cookies (Matomo) to count visits and improve this website. They are not used for advertising and we never share them. ', mas: 'Cookie policy', si: 'Accept', no: 'Reject', politica: '/cookies/en' }
    : { aviso: 'Queremos usar cookies propias de analítica (Matomo) para contar las visitas y mejorar esta web. No se usan para publicidad ni se ceden a nadie. ', mas: 'Política de cookies', si: 'Aceptar', no: 'Rechazar', politica: '/cookies' };

  const leer = () => {
    try {
      const dato = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
      return dato && Date.now() - dato.fecha < DURACION ? dato.valor : null;
    } catch { return null; }
  };
  const guardar = (valor) => {
    try { localStorage.setItem(CLAVE, JSON.stringify({ valor, fecha: Date.now() })); } catch { /* sin almacén: se volverá a preguntar */ }
  };

  const matomo = () => {
    const _paq = (window._paq = window._paq || []);
    _paq.push(['setCookieDomain', '*.zooesponji.com']);
    _paq.push(['setExcludedQueryParams', ['email', 'mail', 'name', 'nombre', 'phone', 'telefono', 'token', 'pass', 'password', 'user', 'username']]);
    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);
    const u = 'https://statscrog.davidpladel.com/';
    _paq.push(['setTrackerUrl', u + 'matomo.php']);
    _paq.push(['setSiteId', '4']);
    const g = document.createElement('script');
    g.async = true;
    g.src = u + 'matomo.js';
    document.head.appendChild(g);
  };

  // Si se retira el permiso, se borran las cookies de Matomo (_pk_…) y se recarga sin medición.
  const borrarCookies = () => {
    for (const par of document.cookie.split(';')) {
      const nombre = par.split('=')[0].trim();
      if (!nombre.startsWith('_pk_')) continue;
      for (const dominio of ['', '; domain=.zooesponji.com', '; domain=' + location.hostname]) {
        document.cookie = nombre + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + dominio;
      }
    }
  };

  let caja = null;
  const mostrar = () => {
    if (caja) return;
    caja = document.createElement('div');
    caja.className = 'cookies';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', 'Cookies');
    const p = document.createElement('p');
    p.textContent = textos.aviso;
    const enlace = document.createElement('a');
    enlace.href = textos.politica;
    enlace.textContent = textos.mas;
    p.appendChild(enlace);
    const botones = document.createElement('div');
    botones.className = 'botones';
    const boton = (texto, valor) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = texto;
      b.addEventListener('click', () => elegir(valor));
      botones.appendChild(b);
    };
    boton(textos.no, 'no');
    boton(textos.si, 'si');
    caja.append(p, botones);
    document.body.appendChild(caja);
  };

  const elegir = (valor) => {
    const antes = leer();
    guardar(valor);
    caja?.remove();
    caja = null;
    if (valor === 'si' && antes !== 'si') matomo();
    if (valor === 'no' && antes === 'si') { borrarCookies(); location.reload(); }
  };

  document.querySelectorAll('[data-cookies]').forEach((b) => b.addEventListener('click', mostrar));
  const eleccion = leer();
  if (eleccion === 'si') matomo();
  else if (eleccion === null) mostrar();
})();

# Analítica anónima con Matomo

Fecha: 2026-10-07 · Estado: código implementado en la rama `feat/analitica-matomo` (2026-10-07); falta comprobar en Matomo, activar el modo CNIL, probar en Android y Play Console. Plan: `docs/superpowers/plans/2026-10-07-analitica-anonima-matomo.md`.

## Objetivo

Saber cuánta gente juega y qué hace en el juego (usuarios activos por día, semana y mes, nuevos, retención, pantallas, progreso, errores) enviando eventos al Matomo propio de David, **sin cookies, sin identificadores y sin aviso de consentimiento**.

**Plataforma:** Android (Capacitor) y la web residual, con el mismo código.

## Contexto de política (revisado 7-oct-2026 en las páginas oficiales)

- **Google Play Families:** una app solo para niños no puede enviar AAID, IMEI, MAC, número de serie y similares, y solo puede llevar SDK aprobados para servicios infantiles. Este diseño no envía ningún identificador y no añade ningún SDK (el envío es código propio contra el servidor de David).
- **Seguridad de los datos de Play:** «recogido» es todo lo que sale del dispositivo, aunque sea anónimo. Si la IP se usa para sacar la ubicación, se declara como ubicación.
- **AEPD y CNIL:** la medición de audiencia propia queda exenta de consentimiento si solo produce estadísticas anónimas y agregadas para el editor, sin seguir a la persona, sin combinar datos y sin cederlos. Exige informar en la política de privacidad, poder oponerse, IP truncada y conservación máxima de 25 meses. La zona geográfica de origen está entre las mediciones admitidas.
- **Matomo, modo CNIL:** se activa por sitio (Administración → Privacidad → Cumplimiento). Recorta la IP 2 bytes, desactiva modelo de dispositivo, resolución, registro de visitas, perfiles e informes en tiempo real, fija la conservación en 759 días y redondea a decenas los datos segmentados. La opción de exclusión hay que ponerla a mano.
- Esto cambia la promesa actual del juego («sin analítica», «no lleva herramientas de medición»): hay que reescribirla donde aparezca.

## Decisiones

- **Sin identificador de instalación.** Los usuarios activos únicos se cuentan con banderas de «primera vez» calculadas en el dispositivo.
- **Sin SDK de Matomo.** Peticiones HTTP propias a la API de seguimiento (`matomo.php`), por lotes.
- **País:** el proveedor de ubicación de Matomo es de toda la instancia y no se puede apagar por sitio. El sitio del juego tendrá el país (y una región aproximada) sacado de la IP ya recortada. Se declara «Ubicación aproximada» en Play y se explica en la privacidad.
- **Interruptor «Estadísticas» en Ajustes**, encendido por defecto: es la forma de oponerse que piden AEPD y CNIL.
- **Sitio propio en Matomo** para el juego, con el modo CNIL activado solo en ese sitio.
- **Fuera de alcance:** publicidad, identificador de instalación, panel propio (los números se leen en Matomo).

## Diseño

### 1. Actividad (`src/core/activity.ts`, nuevo, lógica pura)

- Estado guardado: `{ firstDay: string; lastDay: string; sessions: number }`, con los días en formato `AAAA-MM-DD` en hora local.
- `nextActivity(prev, today)` devuelve el estado nuevo y las banderas:
  - Sin estado previo: `nuevo`, `dia`, `semana`, `mes`.
  - `dia`: `today` posterior a `lastDay`.
  - `semana`: además, el lunes de la semana es distinto.
  - `mes`: además, el mes es distinto.
- Tramos, para no enviar números exactos:
  - Sesión: `1`, `2-5`, `6-20`, `21+`.
  - Antigüedad (días desde `firstDay`): `d0`, `d1`, `d2-6`, `d7-29`, `d30+`.
- Si `today` no es posterior a `lastDay` (mismo día o reloj cambiado), no hay banderas y `lastDay` no retrocede.
- Se guarda en una clave aparte, `zooesponji_v3_activity`. No toca `SAVE_VERSION`. Un valor ilegible se trata como «sin estado». Si el almacén falla al leer o escribir, no se envían banderas (evita contar «nuevos» de más).

### 2. Petición a Matomo (`src/core/matomoRequest.ts`, nuevo, lógica pura)

- Tipo `Hit`: `{ kind: 'screen'; name }` o `{ kind: 'event'; category; action; name?; value? }`.
- `toQuery(hit, config, context)` devuelve la cadena de consulta:
  - Siempre: `idsite`, `rec=1`, `apiv=1`, `rand`, `_id`, `url=https://davidpladel.com/zoo/<pantalla actual>`.
  - Pantalla: `action_name`. Evento: `e_c`, `e_a`, `e_n`, `e_v`.
  - Dimensiones personalizadas de visita (`dimension<ID>`): versión del juego, plataforma (`android` o `web`), idioma del juego, tramo de sesión, tramo de antigüedad.
- Nunca se envía `uid`, `cid`, `res`, `urlref`, `ua` ni `token_auth`.
- `_id` son 16 caracteres hexadecimales al azar, nuevos en cada sesión y guardados solo en memoria.
- `toBulkBody(queries)` devuelve `{"requests":[…]}`.

### 3. Envío (`src/systems/analytics.ts` y `src/systems/analyticsInstall.ts`, nuevos)

- `Analytics` (sin Phaser ni navegador, dependencias inyectadas): cola, sesión, escucha del `bus`.
- `installAnalytics(game)`: crea la instancia con las dependencias reales, la arranca, engancha las pantallas y vacía la cola cada 10 segundos.
- Cola en memoria, máximo 50 elementos (los más viejos se descartan).
- Se vacía cada 10 segundos, al pasar a segundo plano y al registrar un error.
- Envío: `fetch` `POST` a `<url>/matomo.php` con `mode: 'no-cors'`, `keepalive: true` y `credentials: 'omit'`. Sin reintentos; todo fallo se traga.
- **Sesión nueva** (id nuevo, contador +1, banderas recalculadas): al arrancar y al volver de más de 30 minutos en segundo plano.
- **Apagada cuando:** falta la configuración (así queda en desarrollo y en los tests) o el jugador la apagó en Ajustes.
- El repositorio es público: los valores reales no se suben. Configuración en `game/.env.production.local` (ignorado por git; hay un `.env.example` de plantilla): `VITE_MATOMO_URL`, `VITE_MATOMO_SITE`, `VITE_MATOMO_DIMS` (cinco ids separados por comas, en el orden versión, plataforma, idioma, sesión, antigüedad).

### 4. Qué se mide

| Categoría | Acción | Nombre | Valor | Origen |
|---|---|---|---|---|
| `sesion` | `inicio` | | | sesión nueva |
| `sesion` | `fin` | | segundos en primer plano | segundo plano |
| `activo` | `nuevo`, `dia`, `semana`, `mes` | | | banderas de actividad |
| `progreso` | `tienda-abierta` | | | `shop-unlocked` |
| `progreso` | `recinto` | id del recinto | | `animal-unlocked` |
| `progreso` | `animal` | id del recinto | cuántos hay | `animal-added` |
| `progreso` | `monedas` | `100`, `500`, `1000`, `5000` | | `coins-changed`, una vez por tramo y sesión |
| `juego` | `comida-come`, `comida-rechaza`, `comida-especial` | id del recinto | | `animal-fed` |
| `libro` | `pagina` | id de la página | | `book-page` (evento nuevo del `bus`) |
| `ajustes` | `musica`, `sonidos`, `joystick` | `on` / `off` | | `settings-changed` |
| `ajustes` | `idioma` | `es` / `en` | | `settings-changed` |
| `error` | `no-controlado` | mensaje sin direcciones, recortado a 100 caracteres | | `errors.ts` |

- Pantallas: `titulo`, `mapa`, `tienda`, `libro`, `comer`, `ajustes`. Salen de los eventos `start` y `resume` de cada escena; no se repite la misma pantalla dos veces seguidas.
- Los nombres de residentes no se envían: solo ids de recinto, de página y de reacción.

### 5. Ajustes (`src/core/save.ts`, `SettingsScene.ts`, textos, icono)

- `Settings` gana `stats: boolean`, por defecto `true`. No sube `SAVE_VERSION`: si falta en un guardado antiguo, vale `true`.
- `ToggleKey` gana `'stats'`. Quinta ficha en la fila de Ajustes, con icono nuevo `chart`.
- Textos: «Estadísticas» / «Stats» (la etiqueta de la ficha no admite más; el detalle está en la privacidad).
- Al apagarlo se vacía la cola y no se envía nada más, tampoco el propio cambio. Al encenderlo empieza una sesión nueva.

### 6. Textos legales y documentación

- `public/privacidad.html` y `public/privacidad-en.html`: quitar «tampoco lleva herramientas de medición» y añadir un apartado «Estadísticas anónimas» con qué se mide, que no hay cookies ni identificadores, que la IP se recorta y solo sirve para saber el país, que los datos van a un servidor propio y no se ceden, que se conservan como máximo 25 meses, y cómo apagarlo en Ajustes. Actualizar la fecha y el último apartado.
- `README.md`: cambiar la línea de Families Policy y añadir la fila de esta spec y su plan.
- Spec principal (`2026-09-27-motor-phaser-v3-design.md`) y spec del 6a: nota que remita a esta spec.
- `errors.ts`: el comentario «sin envío remoto» deja de ser cierto.

### 7. Pasos manuales de David

Están escritos paso a paso en el plan:

- **Matomo:** crear el sitio «Zoo Esponji», crear las cinco dimensiones personalizadas de visita, activar el modo CNIL en ese sitio y revisar el borrado de datos.
- **Play Console → Seguridad de los datos:** declarar interacciones con la app, diagnóstico y ubicación aproximada.
- Pasar a Claude la dirección de Matomo, el id del sitio y los ids de las dimensiones.

## Pruebas

- **Unitarias (`activity`):** primera vez, mismo día, día siguiente, cambio de semana, cambio de mes, cambio de año, reloj hacia atrás, estado corrupto, tramos en sus bordes.
- **Unitarias (`matomoRequest`):** parámetros de pantalla y de evento, dimensiones, ausencia de parámetros prohibidos, lectura de la configuración.
- **Unitarias (`analytics`, con envío falso):** sin configuración, apagada en Ajustes, banderas del primer día, límite de la cola, vaciado, segundo plano corto y largo, monedas una vez por tramo, cambios de ajustes, fallo del almacén, fallo del envío, error recortado.
- **Unitarias (`save`, `session`):** `stats` ausente, `false` y valor inválido; evento `book-page`.
- **Pruebas de juego:** la ficha nueva aparece en Ajustes, alterna y se guarda.
- **A mano contra el Matomo real:** con una compilación de producción, los eventos llegan (antes de activar el modo CNIL, que apaga el registro de visitas).
- **Android:** el `AndroidManifest.xml` final sigue sin `AD_ID` ni permisos nuevos.

## Riesgos

- **Petición `no-cors`:** la respuesta es opaca y el cuerpo viaja como `text/plain`. Comprobado el 7-oct-2026: Matomo acepta el lote así y sin `token_auth`.
- **Modo CNIL y `_id`:** si Matomo dejase de agrupar por `_id`, cada evento contaría como visita; los eventos y las banderas de activos seguirían siendo correctos, que es lo que se lee.
- **Redondeo a decenas** de los datos segmentados: con pocos jugadores, los cruces por dimensión serán poco precisos. Los totales de eventos no se redondean.

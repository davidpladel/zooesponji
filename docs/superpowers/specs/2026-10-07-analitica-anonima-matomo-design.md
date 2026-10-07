# Analítica anónima con Matomo

Fecha: 2026-10-07 · Estado: pendiente de que David revise la spec. Sin implementar.

## Objetivo

Saber cuánta gente juega y qué hace en el juego (usuarios activos por día, semana y mes, nuevos, retención, pantallas, progreso, compras en la tienda, errores) enviando eventos al Matomo propio de David, **sin cookies, sin identificadores y sin aviso de consentimiento**.

**Plataforma:** Android (Capacitor) y la web residual, con el mismo código.

## Contexto de política (revisado 7-oct-2026)

- **Google Play Families:** una app solo para niños no puede enviar AAID, IMEI, MAC, número de serie y similares, y solo puede llevar SDK aprobados para servicios infantiles. Este diseño no envía ningún identificador y no añade ningún SDK (el envío es código propio contra el servidor de David).
- **Seguridad de los datos de Play:** «recogido» es todo lo que sale del dispositivo, aunque sea anónimo. Hay que declarar las interacciones con la app y los diagnósticos.
- **AEPD y CNIL:** la medición de audiencia propia queda exenta de consentimiento si solo produce estadísticas anónimas y agregadas para el editor, sin seguir a la persona, sin combinar datos y sin cederlos. Exige informar en la política de privacidad, poder oponerse, IP truncada y conservación máxima de 25 meses.
- Esto cambia la promesa actual del juego («sin analítica», «no lleva herramientas de medición»): hay que reescribirla donde aparezca.

## Decisiones

- **Sin identificador de instalación.** Los usuarios activos únicos se cuentan con banderas de «primera vez» calculadas en el dispositivo.
- **Sin SDK de Matomo.** Peticiones HTTP propias a la API de seguimiento (`matomo.php`).
- **Sin geolocalización** en el sitio del juego: así no hay que declarar ubicación aproximada en Play. El idioma ya orienta. Se puede activar más adelante en Matomo sin tocar código.
- **Interruptor «Estadísticas anónimas» en Ajustes**, encendido por defecto: es la forma de oponerse que piden AEPD y CNIL.
- **Sitio propio en Matomo** para el juego, con el modo CNIL activado solo en ese sitio.
- **Fuera de alcance:** publicidad, identificador de instalación, panel propio (los números se leen en Matomo).

## Diseño

### 1. Actividad (`src/core/activity.ts`, nuevo, lógica pura)

- Estado guardado: `{ firstDay: string; lastDay: string; sessions: number }`, con los días en formato `AAAA-MM-DD` en hora local.
- `nextActivity(prev: ActivityState | null, today: string)` devuelve el estado nuevo y las banderas:
  - `nuevo`: no había estado.
  - `activo-dia`: `today` distinto de `lastDay`.
  - `activo-semana`: semana ISO distinta de la de `lastDay`.
  - `activo-mes`: mes distinto del de `lastDay`.
  - La primera sesión de la vida enciende las cuatro.
- Tramos, para no enviar números exactos que distingan a un jugador:
  - Sesión: `1`, `2-5`, `6-20`, `21+`.
  - Antigüedad (días desde `firstDay`): `d0`, `d1`, `d2-6`, `d7-29`, `d30+`.
- Si `today` es anterior a `lastDay` (reloj cambiado), no se enciende ninguna bandera y `lastDay` no retrocede.
- Se guarda en una clave aparte, `zooesponji_v3_activity`, con el `KeyValueStore` que ya existe. No toca `SAVE_VERSION`. Si el valor guardado no se puede leer, se trata como «sin estado».

### 2. Petición a Matomo (`src/core/matomoRequest.ts`, nuevo, lógica pura)

- Tipo `Hit`: `{ kind: 'screen'; name: string }` o `{ kind: 'event'; category: string; action: string; name?: string; value?: number }`.
- `toParams(hit, context)` devuelve los parámetros de la API:
  - Siempre: `idsite`, `rec=1`, `apiv=1`, `rand`, `_id` (id de la sesión), `send_image=0`, `cookie=0`, `url=https://zooesponji.app/<pantalla actual>`, `lang`.
  - Pantalla: `action_name`.
  - Evento: `e_c`, `e_a`, `e_n`, `e_v`.
  - Dimensiones personalizadas de visita: versión del juego, plataforma (`android` o `web`), idioma del juego, tramo de sesión, tramo de antigüedad. Los números de dimensión van en la configuración.
- Nunca se envía `uid`, `res`, `urlref` ni `cid`.
- `_id` son 16 caracteres hexadecimales al azar, creados en cada arranque y guardados solo en memoria.

### 3. Envío (`src/systems/analytics.ts`, nuevo)

- `initAnalytics(deps)`: recibe el almacén, la configuración, la fecha y la función de envío (inyectables para los tests). Calcula la actividad, la guarda y encola los eventos de arranque.
- `track(hit)`: añade a la cola. Si la analítica está apagada no hace nada.
- Cola en memoria, máximo 50 elementos (los más viejos se descartan).
- Se vacía cada 10 segundos si hay algo y al pasar a segundo plano (`Platform.setBackground`).
- Formato: `POST` a `matomo.php` con el cuerpo de seguimiento por lotes (`{"requests":["?idsite=…", …]}`), `fetch` con `mode: 'no-cors'` y `keepalive: true`. Al ir a segundo plano, `navigator.sendBeacon` si existe.
- Sin `token_auth`. Sin reintentos: si falla, el lote se pierde. Todo error de envío se traga en silencio.
- **Apagada cuando:** `import.meta.env.DEV`, falta la configuración, o el jugador la apagó en Ajustes.
- Configuración por variables de entorno de Vite: `VITE_MATOMO_URL`, `VITE_MATOMO_SITE` y los ids de las dimensiones. Sin ellas, la compilación funciona y no mide nada.

### 4. Qué se mide

| Categoría | Acción | Nombre | Valor | Origen |
|---|---|---|---|---|
| `sesion` | `inicio` | | | arranque |
| `sesion` | `fin` | | segundos jugados | segundo plano |
| `activo` | `nuevo`, `dia`, `semana`, `mes` | | | banderas de actividad |
| `progreso` | `tienda-abierta` | | | `shop-unlocked` |
| `progreso` | `recinto` | id del recinto | | `animal-unlocked` |
| `progreso` | `animal` | id del recinto | cuántos hay | `animal-added` |
| `progreso` | `monedas` | tramo (`100`, `500`, `1000`…) | | `coins-changed`, una vez por tramo y sesión |
| `juego` | `comida` | id del recinto | | `animal-fed` |
| `juego` | `reaccion` | tipo de reacción | | `animal-fed` |
| `libro` | `pagina` | id de la página | | `BookScene` |
| `ajustes` | `musica`, `sonidos`, `joystick`, `idioma` | valor nuevo | | `settings-changed` |
| `error` | `no-controlado` | mensaje recortado a 100 caracteres | | `errors.ts` |

- Pantallas (`kind: 'screen'`): `titulo`, `mapa`, `tienda`, `libro`, `comer`, `ajustes`, `privacidad`.
- `sesion/fin` se envía cada vez que la app pasa a segundo plano, con el tiempo en primer plano desde el último envío.
- Los nombres de residentes no se envían: solo ids de recinto, de página y de reacción.
- Del error se envía solo el mensaje, sin traza ni rutas.

### 5. Ajustes (`src/core/save.ts`, `SettingsScene.ts`, textos)

- `Settings` gana `stats?: boolean`. Ausente = encendido. No sube `SAVE_VERSION`.
- `ToggleKey` gana `'stats'`. Botón de madera igual que los de Música, Sonidos y Joystick.
- Textos nuevos en `es.ts` y `en.ts`: «Estadísticas anónimas» / «Anonymous stats».
- Al apagarlo se vacía la cola y no se envía nada más, tampoco el propio cambio.

### 6. Textos legales y documentación

- `public/privacidad.html` y `public/privacidad-en.html`: quitar «tampoco lleva herramientas de medición» y añadir un apartado «Estadísticas anónimas» con qué se mide, que no hay cookies ni identificadores, que la dirección IP se recorta y no se guarda entera, que los datos van a un servidor propio de davidpladel y no se ceden, que se conservan como máximo 25 meses, y cómo apagarlo en Ajustes. Actualizar la fecha.
- `README.md`: cambiar la línea de Families Policy («sin analítica») y añadir la fila de esta spec.
- Spec principal (`2026-09-27-motor-phaser-v3-design.md`): nota en el apartado de política de familias que remita a esta spec.
- `errors.ts`: el comentario «sin envío remoto» deja de ser cierto.

### 7. Pasos manuales de David

Se entregan escritos en el plan, paso a paso:

- **Matomo:** crear el sitio «Zoo Esponji»; crear las cinco dimensiones personalizadas de visita; en Privacidad → Cumplimiento, elegir ese sitio y marcar «Garantizar el cumplimiento siempre que sea posible»; forzar seguimiento sin cookies; proveedor de ubicación desactivado para ese sitio; comprobar el borrado de datos sin procesar.
- **Play Console → Seguridad de los datos:** declarar «Interacciones con la app» y «Diagnóstico», recogidos, no compartidos, finalidad analítica, no vinculados al usuario.
- Pasar a Claude la dirección de Matomo, el id del sitio y los ids de las dimensiones.

## Pruebas

- **Unitarias (`activity`):** primera vez, mismo día, día siguiente, cambio de semana ISO, cambio de mes, cambio de año, reloj hacia atrás, estado corrupto, tramos en sus bordes.
- **Unitarias (`matomoRequest`):** parámetros de pantalla y de evento, dimensiones, ausencia de `uid`/`res`/`urlref`, formato de `_id`.
- **Unitarias (`analytics`, con envío falso):** apagada en cada uno de los tres casos, límite de la cola, vaciado por tiempo y por segundo plano, fallo de envío que no lanza, monedas una vez por tramo, apagado desde Ajustes que vacía la cola.
- **Unitarias (`save`):** `stats` ausente, `true`, `false` y valor inválido.
- **Pruebas de juego:** el botón nuevo aparece en Ajustes y alterna; con la analítica configurada contra una dirección interceptada, arrancar y dar de comer produce las peticiones esperadas; apagada, no sale ninguna.
- **Android:** el `AndroidManifest.xml` final sigue sin `AD_ID` ni permisos nuevos.

## Riesgos

- **Petición `no-cors` desde el WebView (`https://localhost`):** la respuesta es opaca y no se puede saber si Matomo aceptó el lote. Se comprueba a mano en el registro de Matomo durante la implementación; si el lote no entra, se cambia a una petición por evento con `sendBeacon`.
- **Modo CNIL y visitas sin cookies:** Matomo agrupa la sesión por `_id`. Si el modo CNIL lo ignorase, cada evento contaría como visita; los eventos y las banderas de activos seguirían siendo correctos, que es lo que se lee.
- **El agente de usuario del WebView** lleva el modelo del móvil. El modo CNIL desactiva su detección en Matomo; hay que comprobarlo en el sitio del juego.

# Comunidad: tablón, votaciones e ideas

Fecha: 2026-10-12 · Estado: diseño acordado con David en conversación; falta su revisión de este documento y los planes.

Segunda pieza tras la publicidad (`2026-10-12-publicidad-design.md`). Reúne lo que eran «buzón» y «votaciones».

## Objetivo

Que los jugadores sientan que el zoo también es suyo: proponen ideas, votan las que David elige y ven su nombre cuando una gana o se hace. Y que avisar de un fallo sea fácil.

**Se sabrá que está bien si:**

- Un niño que no sabe leer encuentra el tablón, vota y entiende cuál va ganando.
- El juego no recoge ningún texto ni ningún nombre: sigue siendo un juego solo para niños sin cambios en Play.
- Una idea hecha se ve en el juego con el nombre de quien la propuso.
- Si el servidor se cae o no hay internet, el juego funciona igual que hoy.

**Plataforma:** Android y web, con el mismo código.

## Contexto de política (revisado 12-oct-2026)

- **Google (Familias):** lo regulado es que los niños compartan texto libre con otros usuarios (aviso de seguridad, control y «paso de adulto»). Todo dato recogido de un niño hay que declararlo.
- **COPPA (EE. UU.):** lo que un niño escribe cuenta como dato recogido aunque sea voluntario, y animarle a escribirlo también. Una pregunta de mates no vale como permiso de los padres.
- **España:** por debajo de 14 años consienten los padres, con un esfuerzo razonable por comprobarlo.
- **Práctica:** las plataformas infantiles revisan a mano antes de publicar y evitan los campos de nombre libres, porque los niños escriben datos reales.
- **Competidores mirados** (Zoo 2, Zoo Life, Zoo Island, Dinosaur Park, Zoo Craft, Idle Star Zoo): no están declarados para niños. Se valoró hacer lo mismo y se descartó: el juego es infantil de verdad y un aviso de «bajo supervisión de un adulto» no cubre.

Fuentes: [Familias](https://support.google.com/googleplay/android-developer/answer/9893335) · [COPPA, preguntas frecuentes](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) · [AEPD, consentimiento de menores](https://www.aepd.es/infografias/infografia-consentimiento-menores.pdf).

## Decisiones

- **El juego sigue declarado solo para niños.**
- **Escribir se hace fuera del juego**, en una página web pensada para un adulto, a la que se llega con un código QR. El juego no abre el navegador.
- **Dentro del juego solo se vota**, con dibujos, sin datos.
- **David elige qué se vota.** Nada de lo recibido pasa a votación por sí solo. Los nombres que se ven en el juego los escribe David.
- **Servidor:** PHP y MySQL en el VPS de David. n8n solo avisa de cada envío.
- **Sin panel de administración.** David edita un archivo y lo sube con el gestor de archivos de Hestia.
- **El QR lo crea David.** El juego enseña la imagen.
- **Play Games:** descartado.

## Diseño

### 1. Archivo de contenido (`comunidad.json`, en el servidor; lo edita David)

```json
{
  "votacion": {
    "id": "2026-11-a",
    "abre": "2026-11-01",
    "cierra": "2026-11-15",
    "opciones": [
      { "id": "delfines", "titulo": { "es": "Delfines", "en": "Dolphins" }, "dibujo": "delfines.png", "ideaDe": "Lucía" }
    ],
    "ganadora": null
  },
  "muro": [
    { "titulo": { "es": "Pingüinos", "en": "Penguins" }, "dibujo": "pinguinos.png", "ideaDe": "Adrián", "estado": "hecha", "recinto": "pinguino" }
  ]
}
```

- `votacion` puede ser `null` (no hay ninguna). De 2 a 4 opciones.
- Abierta entre `abre` y `cierra`, los dos días incluidos, en hora de España. Duración normal: 15 días.
- `ganadora`: la pone David al cerrar (id de la opción). En caso de empate decide él.
- `muro`: de la más nueva a la más vieja. `estado`: `elegida` o `hecha`. `recinto` (opcional): id de un recinto del juego, para el cartel del mapa.
- `ideaDe` es opcional y se recorta a 15 caracteres al mostrarlo.
- Los dibujos son PNG cuadrados de 256 px en la carpeta `dibujos/`.
- Un archivo mal escrito no rompe nada: el servidor responde «sin votación» y mantiene el muro anterior válido si lo hay.

### 2. Servidor (carpeta nueva del repositorio, `server/`; PHP 8 y MySQL)

| Dirección | Quién la usa | Qué hace |
|---|---|---|
| `GET estado.php` | el juego | Devuelve `comunidad.json` validado, el número de ideas recibidas y, si hay votación, el reparto de votos en porcentajes redondeados a 5. Sin totales. |
| `POST voto.php` | el juego | `{ votacion, opcion }`. Comprueba que la votación está abierta y la opción existe, y suma uno. |
| `POST envio.php` | la página web | Guarda la idea o el fallo, suma al contador de ideas y avisa a n8n. |

Tablas:

- `votos (votacion, opcion, total)`: solo contadores.
- `huellas (huella, votacion, dia, n)`: freno de votos repetidos. `huella` es un resumen de la IP con una sal que cambia cada día; no se guarda la IP. Máximo 5 votos por huella y votación al día (hermanos con la misma wifi). Se borra lo que tenga más de 24 horas.
- `envios (id, fecha, idea, fallo, nombre, version, modelo, idioma)`: se borra lo que tenga más de 90 días.
- `contadores (ideas)`: no se borra.

Reglas:

- Sin cookies, sin sesiones, sin identificadores. No se guarda la IP en ninguna tabla ni registro propio.
- `estado.php` se puede guardar en caché 60 segundos.
- Respuestas con `Access-Control-Allow-Origin: *` y sin credenciales (el juego en Android se sirve desde `https://localhost`).
- Límite de envíos del formulario: 3 por huella al día. Campo trampa oculto: si llega relleno, se responde «gracias» y no se guarda ni se cuenta.
- El aviso a n8n es un `POST` a una dirección guardada en la configuración del servidor (fuera del repositorio). Si falla, el envío se guarda igual.
- La configuración real (base de datos, dirección de n8n) va en un archivo local que no se sube; el repositorio lleva una plantilla.

### 3. Página web de ideas y fallos (en `server/`, HTML sin WordPress; español e inglés)

Un solo formulario. Se puede enviar una idea, un fallo o las dos cosas:

- **Idea** (hasta 300 caracteres).
- **Fallo:** qué pasó (hasta 500), versión del juego y modelo de móvil, los dos opcionales.
- **Nombre de pila o apodo del niño** (opcional, hasta 15), con la nota «para que salga en el juego si su idea se vota».
- **Casilla obligatoria:** «Tengo 18 años o más y acepto las condiciones».
- **Segunda casilla, solo si se rellena el nombre:** «Soy su padre, madre o tutor, o tengo su permiso».
- Sin correo, apellidos ni edad.
- Texto informativo junto al botón: quién es el responsable, para qué se usa, que se borra a los 90 días y cómo pedir que se borre antes.

Hay que rellenar al menos la idea o el fallo.

**Página de condiciones** (borrador que David debe revisar; no es asesoramiento legal):

- Las ideas se envían gratis y se pueden usar, cambiar o no usar.
- Enviar una idea no da derechos sobre el juego ni derecho a dinero o premio.
- No hay obligación de hacer la idea ganadora si resulta inviable.
- El nombre se revisa y puede recortarse o no mostrarse.
- Solo pueden enviar mayores de 18 años.

### 4. El tablón en el mapa (`src/world/Board.ts`, nuevo)

- Un tablón de anuncios junto a la fuente de la plaza.
- Se usa como el libro: la cuidadora se acerca y se abre.
- **Señales:** una estrellita que brilla encima cuando hay algo sin ver (votación abierta sin votar, ganadora nueva, entrada nueva en el muro). El tendero lo menciona una vez, como con el libro secreto.
- **Cartel de idea hecha:** junto al recinto indicado en `recinto`, un cartelito «Idea de Lucía» / «Lucía's idea».

### 5. Pantalla del tablón (`src/scenes/BoardScene.ts`, nuevo)

Hecha con las piezas de `src/ui/`. Tres zonas:

- **Votación.**
  - Abierta y sin votar: de 2 a 4 tarjetas grandes con dibujo, título y «idea de Lucía». Tocar una la marca; un botón verde con ✓ confirma.
  - Votada: barras con el reparto, sin números, la suya marcada, y «quedan 6 días» con un reloj de arena.
  - Cerrada con ganadora: la ganadora en grande con confeti.
  - Sin votación: cartel «Pronto habrá votación».
- **El tarro de ideas.** Un tarro con bombillas y el número real: «¡Ya han llegado 127 ideas!». El dibujo se llena por tramos (0, 1–9, 10–49, 50–199, 200 o más).
- **El muro.** Las últimas entradas con dibujo, nombre y sello: «Elegida» o «¡Ya en el zoo!».
- **Tarjeta «¿Tienes una idea?»:** la imagen del QR, «Enséñaselo a un mayor», la versión del juego y la dirección de las condiciones escrita (no es un enlace).

**Sin conexión:** aviso con dibujo, «Sin internet no se puede votar», y se enseña lo último guardado.

**Los números son siempre los reales.** Sin cuentas atrás falsas ni mensajes de escasez.

### 6. Aviso de votación nueva (`src/scenes/PollNoticeScene.ts`, nuevo)

Panel grande que salta una vez por votación, al llegar al mapa: dibujo de una urna, botón verde que lleva al tablón y X. No depende de leer. Si hay otro panel abierto (el de anuncios), espera a la siguiente vuelta al mapa.

### 7. Lógica y sistema

- `src/core/community.ts` (nuevo, lógica pura): valida la respuesta del servidor, calcula el estado de la votación (sin votación, abierta, votada, cerrada), los días que quedan, el tramo del tarro y qué hay sin ver.
- `src/systems/community.ts` (nuevo, dependencias inyectadas): pide `estado.php` al arrancar y al abrir el tablón, guarda la última respuesta válida, envía el voto y recuerda qué votaciones se han votado y qué se ha visto. Clave aparte, `zooesponji_v3_community`; no toca `SAVE_VERSION`.
- **Un voto por votación y aparato.** Solo se marca como votada si el servidor responde bien.
- Los dibujos se cargan del servidor al abrir el tablón; si uno falla, se pone un dibujo de reserva.
- Sin configuración (`VITE_COMMUNITY_URL` en `game/.env.production.local`), no hay tablón ni aviso.
- **Nunca lanza:** todo fallo acaba en «sin conexión».
- La imagen del QR la aporta David y va con el arte de la interfaz.

### 8. Estadísticas (Matomo)

Categoría `tablon` en `eventCatalog.ts`: `tablon-abre`, `tablon-aviso` (salta el panel), `tablon-vota` (nombre: votación y opción), `tablon-qr` (se ve la tarjeta), `tablon-sin-red`. `Board` entra en la lista de pantallas como `tablon`.

### 9. Textos legales

- **En el juego** (`public/privacidad.html` y `privacidad-en.html`): apartado nuevo «Votaciones e ideas» (el voto es anónimo; para evitar repetidos el servidor guarda 24 horas un resumen de la IP; las ideas se envían desde una web aparte y solo por adultos) y retoque de «En pocas palabras» y «Condiciones de uso».
- **En la web:** página de condiciones de las ideas, texto informativo del formulario y la página pública de privacidad del juego, igual que la de dentro.
- **Play Console:** revisar «Seguridad de los datos». El voto entra en «interacciones con la app», ya declarado. El formulario está fuera de la app.

### 10. Pasos manuales de David

- Crear la base de datos y subir `server/` al VPS; rellenar su configuración.
- Montar en n8n el aviso (correo o Telegram).
- Crear el QR de la dirección del formulario y pasar la imagen.
- Dibujos de cada votación (los genera él, como la portada).
- Revisar las condiciones.

### 11. Entrega

Dos planes:

1. **Servidor y web:** `server/`, formulario, condiciones. Se puede publicar y usar sin tocar el juego.
2. **Juego:** tablón, votación, aviso y carteles. Versión **2.7.0**, después de la de los anuncios.

Al cerrar cada uno: `README.md`, `game/README.md` y nota en la spec principal.

## Pruebas

- **Servidor (PHPUnit):** `comunidad.json` válido, roto y sin votación; votar abierta, cerrada, opción inexistente; freno por huella; porcentajes; formulario con idea, con fallo, con los dos y vacío; campo trampa; límite diario; borrado a los 90 días; aviso a n8n caído.
- **Unitarias (`core/community`):** estados de la votación en los bordes de fecha, días que quedan, tramos del tarro, respuesta mal formada, nombre largo.
- **Unitarias (`systems/community`, con red falsa):** sin configuración, sin conexión, guardado de la última respuesta, voto correcto, voto rechazado, no votar dos veces, fallo del almacén.
- **Pruebas de juego (Playwright, servidor falso):** el tablón se abre, se vota, salen las barras, aviso de sin conexión, panel de votación nueva una sola vez.
- **A mano:** en el móvil, con el servidor real; el formulario en el móvil de un adulto en los dos idiomas.

## Riesgos

- **Tarro medio vacío al principio.** Con pocas ideas el número es bajo. No se oculta; el dibujo por tramos lo suaviza.
- **Votos repetidos.** Sin identificadores no se puede impedir del todo; el freno por huella y el aviso local bastan para un juego infantil.
- **Contador inflado por envíos basura.** El campo trampa y el límite diario lo frenan; David puede corregir el contador en la base de datos.
- **Nombres.** Lo que se ve lo escribe David; el riesgo es publicar un nombre que identifique a un menor. Regla: solo nombre de pila o apodo.
- **Las casillas del formulario no verifican nada.** Son declaraciones del adulto, no comprobaciones.
- **Carga de trabajo de David:** leer envíos, preparar dibujos y editar el archivo cada 15 días.

## Fuera de alcance

Escribir dentro del juego, cuentas o inicio de sesión, comentarios entre jugadores, avisos push, panel de administración, correo de respuesta a quien envía y premios.

# Idiomas: español e inglés

Fecha: 2026-10-06 · Estado: en curso. Bloque A hecho (idioma activo, guardado, `strings/es.ts`, `shop.buy`).

## Objetivo

El juego se ve en español o en inglés. Por defecto sale el idioma del móvil: cualquier variante de español (es-ES, es-MX, es-AR…) da español, y cualquier otro idioma da inglés. En Ajustes hay un botón para cambiarlo.

**Plataforma:** la app es 100 % Android (Capacitor). La web es residual, solo para pruebas puntuales en local, así que no se pule nada específico de web (título de pestaña, SEO…).

## Decisiones

- **Nombres propios no se traducen:** Bills, Sasha, Mary, Nube, Pingu, Kiko… y «Zoo Esponji».
- **Especies, zonas, recintos y comidas sí se traducen:** León→Lion, Cabra→Goat, «Bills, el león»→«Bills, the lion».
- **Alcance:** textos del juego y página de privacidad. La ficha de Play Store queda para la tanda de publicación (6b).
- **Selector:** un botón de madera que alterna (`🇪🇸 Español` / `🇬🇧 English`), igual que los de Música/Sonidos/Joystick.
- **Aplicar el cambio:** guardar el idioma y reiniciar las escenas activas (Ajustes y mundo), sin recargar la página.

## Diseño

### 1. Idioma activo (`src/systems/language.ts`, nuevo)
- Tipo `Language = 'es' | 'en'`.
- `detectLanguage(languages: readonly string[]): Language`, función pura: mira el primer idioma (`navigator.languages[0]`, con `navigator.language` de reserva); si empieza por `es` (sin distinguir mayúsculas) devuelve `'es'`, y en cualquier otro caso (o lista vacía) `'en'`.
- `getLanguage()` / `setLanguage(lang)` guardan el idioma activo en un módulo. `t()` lo lee.
- El WebView de Android refleja el idioma del dispositivo en `navigator.languages`, así que no hace falta plugin nativo.

### 2. Guardado (`src/core/save.ts`)
- `Settings` gana `language?: Language`. Ausente = automático (se detecta).
- No sube `SAVE_VERSION`: un campo opcional no rompe guardados antiguos. `parse` solo lo acepta si vale `'es'` o `'en'`; cualquier otra cosa se ignora (automático).
- Al arrancar (`BootScene`/sesión) se resuelve el idioma: `settings.language ?? detectLanguage(...)`, y se pasa a `setLanguage`.
- Al pulsar el botón se guarda `settings.language` de forma explícita (deja de ser automático).

### 3. Textos (`src/data/`)
- `strings.ts` se divide en `strings/es.ts` (el actual) y `strings/en.ts`; `strings/index.ts` exporta `t`, `StringKey`, etc. (los imports actuales de `../data/strings` deben seguir funcionando).
- `en.ts` se tipa como `Record<StringKey, string>`, de modo que falte una clave = no compila.
- `t(key, vars)` lee `getLanguage()`. Los marcadores `{n}`, `{name}`, `{total}` se conservan.
- `Decor.ts` usa `STRINGS_ES` directamente para comprobar claves: pasa a una función `hasKey(key)`.
- El literal suelto `¡Comprar! 🪙 ${cost}` de `ShopScene.ts` pasa a clave (`shop.buy` con `{cost}`).
- `animals.ts`, `foods.ts`, `pens.ts` ya usan `nameKey`: no cambian.
- `book.ts` y `FeedScene` usan claves `book.page.<id>.*`: no cambian.
- Texto largo (~190 líneas del libro y los `shop.about.*`): traducción pensada para niños de 6-9 años, con el mismo tono cálido y cuqui («¡Boing, boing!», onomatopeyas, juegos de palabras adaptados, no literales). Algunos juegos de palabras en español (p. ej. «Nube», «Tolón», «Frac») se adaptan sin traducir el nombre.

### 4. Ajustes (`src/scenes/SettingsScene.ts`)
- Botón nuevo de idioma con el mismo estilo que los de `renderToggle`. Muestra el idioma activo en su propio idioma.
- Al pulsar: alterna, guarda, `setLanguage`, y reinicia Ajustes y las escenas del mundo (`WorldScene` + `HudScene`) para que se refresquen los rótulos creados al arrancar. No se pierde estado de partida: se guarda antes de reiniciar.
- El plan debe comprobar qué escenas hay activas bajo Ajustes y cuáles guardan textos creados una sola vez (rótulos de recintos en `Pens.ts`, HUD, `ShopBuilding`, `Decor`).

### 5. Fuera de las escenas
- `legal.ts`: carga `privacidad.html` (es) o `privacidad-en.html` (en) según el idioma activo. `public/privacidad-en.html` es nuevo, con la traducción fiel de la política actual (misma estructura `<main>`).
- `errors.ts` ya usa `t()`: las pantallas de error salen en el idioma activo. **Ojo:** se pueden disparar antes de cargar el guardado, así que `language.ts` debe tener un valor por defecto sensato desde el primer momento (`detectLanguage` en la importación inicial, antes de `BootScene`).
- `index.html`: `<html lang>` se actualiza en `setLanguage`. No se hace más trabajo web.
- El nombre de la app en Android (`strings.xml`) sigue siendo «Zoo Esponji».

### 6. Pruebas
- Unitarias: `detectLanguage` (es, es-ES, es-MX, ES, en-US, fr, vacío, undefined); `save` (campo ausente, válido, inválido, ida y vuelta); `strings` (`es` y `en` con las mismas claves y mismos marcadores en cada par; ningún valor vacío en `en`); `t` con cada idioma y con variables.
- `tests/unit/strings.test.ts` y `content.test.ts` existen: adaptarlos, no duplicarlos.
- E2E: Playwright se fija en `locale: 'es-ES'` para que los tests actuales sigan pasando. Se añade un e2e nuevo que arranca en inglés, comprueba el título y cambia a español desde Ajustes (persistencia incluida).

## Fuera de alcance
- Ficha de Play Store en inglés (hito 6b).
- Más idiomas. La estructura (`strings/<lang>.ts`) deja la puerta abierta, pero no se prepara nada más.
- Cambiar el idioma sin reiniciar escenas (redibujado en vivo).
- Cualquier pulido de la versión web.

## Riesgos
- Texto creado una sola vez en escenas que no se reinician al cambiar de idioma: se resuelve inventariando en el plan.
- Calidad de la traducción del libro: David revisa el inglés antes de publicar.
- Textos en inglés más largos o más cortos que el español pueden desbordar globos o botones: comprobar con capturas en móvil (rótulos de recintos, tienda, libro, botón nuevo de Ajustes).

# 🦁 Zoo Esponji

Creado por y para Daniela y Adrián, con la ayuda de su padre y de Claude + OpenCode + DeepSeek + ChatGPT.

**Versión actual: 2.4.0** (2026-10-06, en `main`) · Juega en la web: https://davidpladel.com/zoo/ · Android: prueba cerrada de Google Play con la 2.3.0 (versionCode 5)

## La idea

Eres la cuidadora del zoo y das de comer a los animales. Cada animal tiene sus gustos: si le ofreces la comida que le gusta se la come feliz, y si le ofreces otra pone cara de asco. Algún animal tiene además una reacción especial: la cabra y el panda se hacen amigos del conejo en vez de comérselo 💕. Con las monedas que ganas abres la tienda y compras nuevos animales y recintos.

Pensado para niños de 6 a 9 años: sin textos largos, sin perder y sin anuncios.

## Cómo se juega

- **Moverse:** tocar el suelo y la cuidadora va andando (también teclado, o joystick opcional desde el menú ⚙️, abajo a la izquierda).
- **Dar de comer:** toca un animal: la cuidadora entra en su recinto y, al llegar, se abre la bandeja de comida de ese animal. Arrastra la comida (piedra, carne, conejo o zanahoria) hasta el animal.
- **Tienda:** se abre al tener 20 monedas; pisa la puerta del puesto para entrar. Dentro suena la campanita, la cuidadora entra andando, el tendero la saluda y los animales esperan en peanas: acércate a uno (o tócalo y va sola), toca el bocadillo "¡Comprar!" y sal pisando el felpudo. Si un peque se queda quieto, unas huellas le señalan qué puede comprar. Pantera 50 🪙, panda 100 🪙, y animales extra: hasta 5 cabras (10 🪙 cada una), 2 panteras y 2 pandas (20 🪙).
- **Menú ⚙️:** un tablero de madera con música, efectos, joystick, **idioma (español o inglés)**, créditos, la versión del juego, la página de privacidad (se lee sin salir del juego) y, en Android, un botón «Salir».
- **Idiomas:** español e inglés. Sale el del móvil (cualquier variante de español da español; el resto, inglés) y se cambia en el menú ⚙️. Los nombres de los animales y «Zoo Esponji» no se traducen.

| Alimento | 🦁 León | 🐐 Cabra | 🐆 Pantera negra | 🐼 Oso panda |
|---|---|---|---|---|
| Carne | come | puaj | come | puaj |
| Conejo | come | **amigos 💕** | come | **amigos 💕** |
| Piedra | puaj | come | puaj | puaj |
| Zanahoria | puaj | come | puaj | come |

## Historial de versiones

| Versión | Fecha | Qué trajo |
|---|---|---|
| _próxima_ | sin fecha | **Interfaz nueva** (en `main` desde el 2026-10-07 y probada por David en el móvil; sin publicar: faltan el número de versión, las capturas nuevas para Google Play y el paquete para la tienda). Menús lisos y brillantes con botones píldora, paneles crema, letra Baloo 2 e iconos propios; portada pintada con pantalla de carga a juego; engranaje que solo se ve andando; modo inmersivo y splash azul cielo en Android; la cuidadora empieza junto a la entrada del zoo; libro a doble página (dibujo a un lado, título y texto al otro). 984 tests y 29 pruebas de juego |
| **2.4.0** | 2026-10-06 | **Español e inglés.** El juego sale en español o en inglés según el idioma del móvil, y en Ajustes hay un botón de madera para cambiarlo, que se queda guardado. Todo el juego está traducido: menús, tienda, lo que cuenta el tendero y las 49 páginas del libro (los nombres propios y «Zoo Esponji» no se traducen). La página de privacidad también se lee en inglés dentro del juego. 963 tests y 28 pruebas de juego |
| **2.3.0** | 2026-10-05 | **El zoo grande.** El mapa crece a 96×60 con tres zonas nuevas alrededor del parque: sabana (jirafas, cebras y gacelas juntas, y dos jaulas de elefantes), polo (pingüinos) y granja (ovejas, establo con caballos y gallinas, y estanque de patos). 7 recintos y 35 animales nuevos, cada uno con su nombre, su aspecto y su página: el libro pasa a 49 páginas con capítulos e índice. 7 comidas nuevas, una gallina amiga y un calcetín. La cuidadora entra en los recintos a dar de comer al animal que se toca, los visitantes entran a acariciar a las ovejas y la tienda enseña los 5 artículos siguientes por precio. Menú de ajustes nuevo, de madera, con la página de privacidad dentro del juego, la versión y un botón «Salir» en Android |
| **2.2.0** | 2026-09-30 | **El libro secreto del zoo.** En la estantería de la tienda se esconde un libro (destella y salta al acercarse) con la historia del Zoo Esponji, Mary la cuidadora y cada animal con nombre propio (Bills, Sasha, Gordi, Noche, Mochi…); las páginas se consiguen comprando animales, las que faltan salen en silueta y recuerda por dónde ibas. Tienda más clara: una peana por animal, precio o sello AGOTADO y "Tienes 2 de 5". Catarata como la del pack (río arriba, caída, espuma, brillo y nenúfar) y recinto de la pantera más alto. Textos preparados para varios idiomas. 283 tests y 16 pruebas de juego |
| 2.1.2 | 2026-09-28 | Catarata de la pantera montada como enseña el autor del pack: bloques altos de acantilado con su remate a cada lado, la caída en medio empalmando con la roca y el lago al pie (7×6 casillas) |
| 2.1.1 | 2026-09-28 | Catarata de la pantera rehecha como la del pack: pared de roca recta hasta la valla, la caída acaba donde acaba la roca y el estanque empieza debajo con su orilla completa |
| 2.1.0 | 2026-09-28 | **La tienda por dentro y un parque de verdad.** La cuidadora entra andando en la tienda: tendero que saluda, mira y habla de cada animal; animales en peanas que reaccionan al acercarse; se compra con el bocadillo "¡Comprar!", pista de huellas para los peques, campanita y pasos. Zoo rehecho: muro del parque con portón "Zoo Esponji" (se empieza en la entrada), plaza central con fuente animada, catarata con acantilado en la selva, pasillos más estrechos para ver los recintos y cámara más alejada. Dar de comer se abre al llegar a la puerta del recinto (sin bocadillo) y la carne ya tiene dibujo. 275 tests y 15 pruebas de juego |
| 2.0.0 | 2026-09-27 | **Juego nuevo desde cero** con Phaser 4 + TypeScript, para web y Android. Mundo de pixel art que se recorre andando: mapa del zoo 48×32 con recintos decorados (sabana, montaña, selva con catarata, bosque de bambú) y parque con bancos, farolas, fuente y carteles; cuidadora, visitantes y animales animados; dar de comer arrastrando con reacciones, monedas voladoras y la amistad del conejo con corazones; tienda con animales extra; agua animada; música y sonidos; menú ⚙️ con créditos de Daniela y Adrián (que pintaron el panda y la pantera); botón atrás, girar el móvil, guardado (conserva las monedas de la v1.1) y pantalla de error amable. 248 tests y 12 pruebas de juego en CI |
| — | 2026-08-11 | Prototipo con motor Canvas 2D propio al estilo Stardew Valley (rama `stardew-engine`). **Descartado**, nunca se publicó; su lógica sirvió de base para la 2.0 |
| 1.1.0 | 2026-08-09 | Tienda con desbloqueos, pantera negra y oso panda, progresión con monedas, compras guardadas. Etiqueta `v1.1.0` |
| 1.0.0 | 2026-08-08 | Primera versión: pantallas con imágenes (HTML + CSS), león y cabra, 4 alimentos, arrastrar y soltar, sonidos. Etiqueta `v1.0.0` |

> La 1.x y el prototipo ya no están en `main`; siguen en el historial (etiquetas `v1.0.0` y `v1.1.0`, rama `stardew-engine`). En los documentos de desarrollo la 2.0 aparece como "v3" (tercer motor) — es un nombre interno.

## Tecnología

- **Phaser 4** + **TypeScript** estricto + **Vite**. Todo el juego está en [`game/`](game/README.md).
- La lógica (reacciones, monedas, guardado, caminos A\*, rebaños…) es TypeScript puro en `game/src/core/`, sin Phaser, y está probada con **Vitest**; las escenas solo dibujan y recogen toques. Pruebas de juego en el navegador con **Playwright**; CI en **GitHub Actions**.
- **Mapas:** generados por script en formato **Tiled**; colisiones, recintos, puertas y punto de inicio salen del propio mapa. Terreno con autotile (formato RPG Maker A2).
- **Android:** **Capacitor** (`appId` `com.davidpladel.zooesponji`), horizontal, guardado nativo.
- **Google Play (Families Policy):** sin analítica, sin anuncios, sin permiso `AD_ID`, sin enlaces externos.
- **Por qué no Godot / Unity:** el requisito es web + Android a la vez desde el terminal; el export web de Godot pesa 30–40 MB y va flojo en el navegador del móvil. Detalle en la [spec](docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md).

Para arrancarlo, probarlo, compilar para Android o publicar en la web: [game/README.md](game/README.md).

## Documentación de desarrollo

El juego se ha hecho por hitos: spec de diseño → plan → ejecución.

| Documento | Qué contiene |
|---|---|
| [Spec de diseño 2.0](docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md) | Visión, motor, arte, arquitectura, política de Play, pruebas, hitos y **estado actual / cómo retomar** |
| [Plan hitos 1–2](docs/superpowers/plans/2026-09-27-v3-hitos-1-2-esqueleto-y-nucleo.md) | Esqueleto y núcleo |
| [Plan hitos 3–4](docs/superpowers/plans/2026-09-27-v3-hitos-3-4-comer-y-tienda.md) | Dar de comer, tienda, visitantes, joystick |
| [Plan hito 5](docs/superpowers/plans/2026-09-27-v3-hito-5-arte.md) | Arte de verdad |
| [Plan hito 5b](docs/superpowers/plans/2026-09-27-v3-hito-5b-decoracion.md) | Decoración de recintos y parque |
| [Spec](docs/superpowers/specs/2026-09-27-v3-hito-6a-pulido-design.md) y [plan hito 6a](docs/superpowers/plans/2026-09-27-v3-hito-6a-pulido.md) | Pulido: agua, extras, menú, sonido, móvil, errores |
| [Spec](docs/superpowers/specs/2026-09-27-tienda-por-dentro-design.md) y [plan tienda por dentro](docs/superpowers/plans/2026-09-27-tienda-por-dentro.md) | La tienda vista por dentro (fase C) |
| [Spec](docs/superpowers/specs/2026-09-28-tienda-fase-b-design.md) y [plan fase B](docs/superpowers/plans/2026-09-28-tienda-fase-b.md) | La cuidadora entra andando en la tienda y compra acercándose (fase B) |
| [Spec](docs/superpowers/specs/2026-10-06-interfaz-nueva-design.md) y [plan interfaz nueva](docs/superpowers/plans/2026-10-06-interfaz-nueva.md) | Interfaz nueva: píldoras, paneles, letra y iconos, portada pintada, modo inmersivo |
| [Spec](docs/superpowers/specs/2026-10-06-idiomas-es-en-design.md) y [plan idiomas](docs/superpowers/plans/2026-10-06-idiomas-es-en.md) | Idiomas español e inglés: detección, botón en Ajustes, textos y privacidad |
| [Spec](docs/superpowers/specs/2026-08-08-mvp-zooesponji-design.md) y [plan 1.0](docs/superpowers/plans/2026-08-08-mvp-zooesponji.md), [spec](docs/superpowers/specs/2026-08-15-escenas-inmersivas-design.md) y [plan del prototipo](docs/superpowers/plans/2026-08-15-escenas-inmersivas.md) | Histórico (1.x y prototipo Canvas) |

## Hoja de ruta

1. ✅ Esqueleto: Phaser 4 + TS + Vite + Capacitor + CI
2. ✅ Núcleo: reacciones, economía, guardado (con migración desde 1.1), caminos A\*
3. ✅ Dar de comer arrastrando
4. ✅ Tienda y desbloqueos, visitantes, joystick
5. ✅ Arte (VectoRaith + panda y pantera de los niños) y decoración (5b)
6. ✅ 6a Pulido: agua, extras, menú, sonido, móvil, errores → **2.0.0**, publicada en la web
7. ⬜ 6b Publicación en Google Play: privacidad, ficha, firma y prueba cerrada (prueba cerrada en marcha con la 2.3.0; falta el acceso a producción)

✅ **2.1.0 / 2.1.1** (2026-09-28, publicada en la web; la 2.1.1 y la 2.1.2 rehacen la catarata): tienda por dentro (fases C y B), muro y portón del parque, plaza con fuente animada, catarata con acantilado, pasillos estrechos, cámara más alejada, comida al llegar a la puerta y carne con dibujo.

✅ **2.3.0** (2026-10-06, fusionada en `main`, etiqueta `v2.3.0`; David la probó): el zoo grande y el menú de ajustes de madera con privacidad, versión y «Salir».

✅ **2.4.0** (2026-10-06, fusionada en `main`, etiqueta `v2.4.0`; David la probó en el móvil): idiomas español e inglés, con detección por el idioma del móvil, botón en Ajustes y privacidad en inglés. La ficha de Play en inglés queda para 6b.

🟡 **Interfaz nueva** (2026-10-07, fusionada en `main`): todos los menús, la portada y el arranque con la interfaz nueva, y modo inmersivo en Android. David la ha probado en el móvil y da el visto bueno. Falta subir la versión (la siguiente a la 2.4.0), hacer capturas nuevas para Google Play y preparar el paquete para la tienda; David ha pedido no prepararlo todavía.

Google Play: la 2.3.0 (versionCode 5) está en la prueba cerrada; a 2026-10-06 van 5 de los 14 días seguidos con 12 testers que pide Google para poder solicitar el acceso a producción. La 2.4.0 todavía no se sube: antes se le van a añadir mejoras, y la siguiente subida irá con versionCode 6.

Pendiente, por orden: las mejoras previas a la siguiente subida a Play (por definir); analítica de eventos del juego (con su propio spec; hay que actualizar antes la página de privacidad); publicación en Google Play (6b). Cabos sueltos de la 2.4.0: la prueba `zoo-grande.spec.ts:104` («sin comprar las ovejas, ningún visitante entra en su recinto») falló una vez en una tanda completa y pasó las demás, sin que se llegara a ver el error; y cambiar de idioma con la ventana de comer abierta, o con el libro sobre la tienda, no tiene prueba de juego propia. Ideas para después, cada una con su spec: bañar y limpiar, día y noche, clínica veterinaria y acuario con delfines.

**Más adelante:** clínica veterinaria, bañar animales, limpiar jaulas, ciclo día-noche, acuario con delfines, más animales y zonas.

## Arte y créditos

Arte de **VectoRaith** (https://vectoraith.itch.io/), comprado con licencia comercial:

- [Top-Down RPG Sprite Pack – NPC](https://vectoraith.itch.io/top-down-rpg-npc-sprite-pack) — cuidadora, tendero y visitantes
- [Top-Down RPG Sprite Pack – Wild Animals](https://vectoraith.itch.io/wild-animals-top-down-sprite-pack) — león, y bases del panda (oso polar) y la pantera (leopardo de las nieves)
- [Top-Down RPG Sprite Pack – Farm and Cute Animals](https://vectoraith.itch.io/top-down-rpg-sprite-pack-farm-and-cute-animals) — cabra y conejo
- [Biome Tileset Pack B](https://vectoraith.itch.io/biome-tileset-pack-b) — césped, agua, rocas
- [Wooden Buildings Tileset Pack](https://vectoraith.itch.io/vectoraiths-wooden-buildings-tileset-pack) — tienda, vallas, caminos
- Interior Tileset Pack – Essentials — suelo, pared y muebles de la tienda por dentro
- y más packs de VectoRaith para la decoración (árboles, bancos, farolas, catarata…)

**Los archivos de arte no están en este repositorio**: la licencia prohíbe redistribuirlos. Viven en un repositorio privado. Sin ellos el juego funciona con arte provisional (emojis). Si quieres el arte para tu propia versión, cómpralo en la página del autor.

El panda y la pantera negra los pintaron **Daniela y Adrián** a partir de los sprites originales.

Sonido: efectos de [Kenney](https://kenney.nl/), música "Happy Adventure" de TinyWorlds y la campanita y los pasos de la tienda (sintetizados para el juego), todo CC0 (créditos en [`game/public/audio/CREDITS.md`](game/public/audio/CREDITS.md)).

## Licencia

Copyright (C) 2026 [davidpladel](https://github.com/davidpladel) — hecho con cariño por Daniela y Adrián 💛

[Todos los derechos reservados](LICENSE). El código es visible para que puedas verlo y estudiarlo, pero no se puede copiar, modificar ni publicar (ni en Google Play, App Store, Steam u otras tiendas) sin permiso por escrito. Las versiones anteriores se publicaron bajo GPL-3.0 y esas copias conservan esa licencia. Avisos de terceros en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

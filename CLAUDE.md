# CLAUDE.md

Contexto para agentes que trabajen en este repositorio. Visión general y estado en el [README](README.md); cómo
está hecho el juego, comandos y protocolos en [`game/README.md`](game/README.md). Léelos antes de planificar.

## Qué es esto

Zoo Esponji: juego infantil (5–12 años) para Android hecho con Phaser 3 + TypeScript + Capacitor (`game/`), publicado
en Google Play dentro de «Diseñado para Familias». Además: servidor de la comunidad (`server/`), web
www.zooesponji.com (`web/`) y herramientas (`tools/`: Matomo, comunidad). El repositorio es **público**.

## Comandos (desde `game/`)

```bash
npm run dev            # juego en http://localhost:5173
npm run typecheck
npm test               # Vitest (unitarias)
npm run test:e2e       # Playwright (pruebas de juego; ~30 min la tanda completa)
npm run build
```

Más comandos (arte, mapa, tráiler, jugadores con IA) en `game/README.md`.

## Invariantes que no se tocan

**Nada privado en GitHub.** El repo es público. Nunca van aquí:
- Arte de los packs de VectoRaith (la licencia prohíbe redistribuirlo), ni recortes de ellos para documentar, ni los
  dibujos propios: todo eso va al repo privado `zooesponji-private`. Las capturas del juego para revisar se guardan
  fuera del repo.
- Datos del servidor: IP, usuarios, rutas, nombres de base de datos, cifras de los frenos. Los hooks
  `.githooks/pre-commit` y `pre-push` (con gitleaks y la lista ignorada `.githooks/prohibido.local`) lo vigilan. Si
  aparece un dato del servidor nuevo, se **añade a esa lista**. En una carpeta de `.claude/worktrees/` hay que
  copiar antes `prohibido.local` desde la carpeta principal.
- Secretos: tokens (`tools/matomo/.env.local`), identificadores reales de AdMob, `keystore.properties`, claves de
  Play. Nunca se leen ni se muestran.
- Lo que mandan los jugadores al servidor (puede llevar nombres de menores).
- Lo que David diga que es privado (paneles de datos, guías de publicación): va en `zooesponji-private` o en
  `docs/privado/` (ignorado).
- Enlaces a GitHub desde el juego o la web.

**Es para niños.** Nada de identificadores del jugador en las estadísticas, ni enlaces externos, chat o datos
personales dentro del juego. Los anuncios, solo los de AdMob en modo infantil. Ninguna promesa en los textos legales
que no se haya comprobado en el servidor real. Nunca se tocan anuncios reales en el móvil de David: para probarlos,
`VITE_ADMOB_TESTING=1`.

**Sin palabras siempre que se pueda.** Muchos jugadores no leen: iconos, números, dibujos y la mano guía antes que el
texto (`game/README.md` › Interfaz). Lo que tenga que llevar texto va en los **11 idiomas** (`game/src/data/strings/`),
árabe de derecha a izquierda incluido.

**Lo publicado no se rompe.** Un guardado viejo se tiene que poder leer siempre: los campos nuevos llevan su valor
por defecto y una prueba en `save.test.ts`. Un cambio en el servidor tiene que funcionar también con la versión del
juego que ya está en Play.

**Nombre público: David Plaza.** En la prensa, la web o un PDF nunca «David Pladel». `davidpladel` solo como cuenta,
dominio y correo.

## En cada evolutivo (cosa nueva del juego)

1. **Rama:** las novedades van en la rama abierta del momento (hoy `feat/plaza-recintos-recorrido`, en GitHub). No
   se fusiona con `main` ni se crea otra rama sin que David lo pida.
2. **Spec y plan** en `docs/superpowers/specs/` y `plans/` antes de escribir código. El trabajo se hace en la propia
   sesión, sin subagentes.
3. **Estadísticas de Matomo, siempre.** Todo lo que el niño pueda tocar o le pueda pasar lleva sus eventos. Se
   siguen los 7 pasos de `game/README.md` › «Estadísticas: qué hacer con cada cosa nueva»: aviso en el bus, traducción
   en `analyticsEvents.ts` con su prueba, acción única en `eventCatalog.ts`, tabla «Estadísticas (Matomo)» en la spec
   (y la spec añadida a la lista de `eventCatalog.test.ts`), `tiene` si se compra algo, apartado en
   `tools/matomo/resumen.mjs` y las estadísticas apagadas en los jugadores con IA. Si la novedad no lleva eventos, la
   spec dice por qué.
4. **Textos en 11 idiomas** y, si es un animal, su página del libro (`game/README.md` › Añadir un animal). Los
   dibujos propios siguen el protocolo de `game/README.md` › Arte.
5. **Pruebas:** unitarias y de juego (Playwright) de lo nuevo. Al empezar la tarea se pregunta a David si las lanza
   Claude o él. Las pesadas van de una en una (`--workers=1`), nunca varios navegadores o jugadores con IA a la vez.
6. **Lo visual lo valida David** jugando o con capturas: no se da por terminado sin su prueba.
7. **Documentación al día al cerrar cada bloque:** README raíz (estado y hoja de ruta), `game/README.md`, el apartado
   «Cómo quedó» o «Estado» de la spec y las casillas del plan.

## Al sacar versión

- La versión se cambia en los sitios de la tabla de `game/README.md` › Versión; el `versionCode` sube en 1 por cada
  subida a Play.
- **Las notas de versión de Play las revisa David** en español antes de traducirlas a los 13 idiomas de la ficha.
- Antes de dar el AAB, se abre y se comprueban la fecha, la versión, los identificadores y la privacidad.
- La web no se actualiza sola: pasos en `web/README.md`.

## Git

- Git lo hace Claude (guardar, subir, fusionar cuando se pide). A David no se le dan comandos de git.
- Puede haber otra sesión trabajando en la misma carpeta: `git add` y `git commit` en el mismo comando, y después
  `git log -1 --stat` para comprobar que el commit es el tuyo.
- Mensajes de commit en español con prefijo (`feat(tutorial): …`, `docs: …`, `fix: …`).

## Hablar con David

- En español llano, sin jerga de git ni de programación sin explicar.
- Lo que tenga que lanzar él va en PowerShell, un comando por bloque, diciendo desde qué carpeta y qué salida
  indica que ha ido bien, **al final del mensaje**.
- Lo que toque el servidor o el VPS: primero sus notas privadas del servidor (fuera del repo), nada sin preguntar.

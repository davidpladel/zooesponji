# Tutorial de la limpieza y de la clínica — diseño

Fecha: 2026-11-10. Rama: `feat/plaza-recintos-recorrido`. Parte de [cerdos, limpieza y clínica](2026-11-09-cerdos-limpieza-clinica-design.md).

## Por qué

La limpieza de cerdos y elefantes y la clínica son mecánicas nuevas que no salen en el tutorial de inicio (antiobjetivo del diseño de cerdos). Un niño que compra su primer cerdo o la clínica no sabe qué hacer con ellos: el barro tarda de 2 a 5 minutos en salir y la enfermedad de 3 a 6, y cuando sale no sabe que hay que tocar al animal, ni el orden de las herramientas, ni que la cruz lleva a la clínica. Hay que enseñárselo **en el momento en que lo desbloquea**, igual que el tutorial de inicio enseña a jugar.

## Objetivos

- Al desbloquear la limpieza o la clínica sale **un aviso**, como el de la primera vez, y si el niño acepta, **una lección guiada** con la misma mano, huellas y bocadillo del borde que el tutorial de ahora.
- El niño practica **al momento**, sin esperar: el juego ensucia o pone malito a un animal suyo para la lección.
- El botón **Aprender** del menú enseña todo seguido: la lección de siempre y, detrás, las que ya tenga desbloqueadas.
- Todo se mide en **Matomo**: cuántos ven el aviso, cuántos aprenden o saltan, en qué paso lo dejan y cuánto tardan.

## No objetivos y antiobjetivos

- No se cambia la lección de inicio (sus pasos y sus nombres en Matomo siguen igual).
- No se cambian la limpieza ni la curación: la lección guía sobre las escenas que ya existen.
- **Antiobjetivo:** que el aviso salga dentro de la tienda y corte al niño mientras compra. Sale **al salir de la tienda**.
- **Antiobjetivo:** que la lección mande a un recinto que el niño no tiene (por ejemplo, a los cerdos si lo que compró fueron elefantes).
- **Antiobjetivo:** que el niño tenga que esperar a que algo se ensucie o enferme para practicar.

## Lo que ya existe y se reutiliza

- Aviso de la primera vez: `TutorialOfferScene` (velo, panel, dibujo, botones ▶ Aprender y ✕ Saltar). Se guarda en `save.tutorial.offered`.
- Lección de inicio: `TutorialScene` + `core/tutorial.ts` (pasos que solo avanzan cuando el jugador hace el gesto, mano `ui/hand.ts`, anillo, bocadillo del borde `edgeHint`, ✕ debajo de las monedas).
- Limpieza: `CleanScene` (5 pasos en `core/cleaning.ts`: cacahuete, cepillo, jabón, agua, toalla; `targetsOnScreen()` da el animal y la herramienta del paso).
- Barro y enfermedad: `core/care.ts` (`MUD_PENS`, `makeMuddy`, `soil`, `sickCandidates`, `fallSick`, `MAX_SICK`, `clinicSlots`), `careDirector.ts`.
- Clínica: `ClinicScene` (camas con los enfermos), la cruz del «¡puaj!» y el paseo solo hasta la clínica (`clinic-guide`).
- Matomo: categoría `tutorial` en `core/eventCatalog.ts` y `systems/analyticsEvents.ts`.

## 1. Cuándo se desbloquea y cuándo sale el aviso

- **Limpieza:** se desbloquea al comprar el **primer recinto de cerdos o de elefantes** (africanos o asiáticos), el primero que se abra de esos tres (`MUD_PENS`).
- **Clínica:** se desbloquea al comprar la clínica.
- El aviso sale **al salir de la tienda** (`shop-closed`), nunca dentro. Lo que cuenta es tenerlo abierto y que su aviso no haya salido aún, no la compra en sí (así entran también quienes ya tenían elefantes; ver más abajo). Si en la misma visita desbloqueó las dos, sale **primero la limpieza** y, al acabar su lección o al saltarla, el de la clínica.
- Cada aviso sale **una sola vez** en la vida de la partida, se acepte o se salte. Después queda el botón Aprender del menú.
- No sale encima de otro aviso (anuncio, tablón, aviso de inicio). Si hay otro abierto, espera a que se cierre. **[decisión mía]**

## 2. El aviso

- La misma ventana y el mismo estilo que el aviso de la primera vez, con los dos botones grandes ▶ **Aprender** y ✕ **Saltar**.
- El dibujo es el de cada lección: un cerdo con manchas y la mano en la de limpieza, y la cruz de la clínica y la mano en la de la clínica. **[decisión mía]**
- Lleva una frase corta en **MAYÚSCULAS**, porque así la leen mejor los niños (lo dijo David). Traducida a los 11 idiomas. Propuesta, pendiente de que David la revise:
  - Limpieza: «¡TUS ANIMALES SE MANCHAN DE BARRO! ¿APRENDEMOS A BAÑARLOS?»
  - Clínica: «¡YA TIENES CLÍNICA! ¿APRENDEMOS A CURAR?»
- **Saltar:** se cierra, no se toca nada del zoo y no vuelve a salir.
- **Aprender:** empieza la lección.

## 3. Lección de limpieza

**Preparación, al momento**

- El animal de la práctica sale de un recinto de barro **que el niño ya tiene abierto**: el que acaba de comprar si viene del aviso, o cualquiera de los suyos si viene del menú. Nunca de un recinto cerrado.
- Si ya hay un animal sucio en sus recintos, la lección usa ese. Si no, el charco de ese recinto se pone de barro **al instante** (`makeMuddy`) y uno de sus animales se mancha **al instante** (`soil`), sin esperar los tiempos de siempre ni a que pise el charco.
- Desde el menú pasa igual: si no hay ninguno sucio, se ensucia uno para practicar.

**Pasos** (cada uno avanza solo cuando el niño hace el gesto, como en la lección de inicio)

1. **Tocar al animal sucio.** La mano lo señala. Si está fuera de la pantalla, la mano va al bocadillo del borde y, como en el paso de la tienda, se le guía hasta allí. Al tocarlo se abre la limpieza.
2. **Cacahuete**, 3. **Cepillo**, 4. **Jabón**, 5. **Agua**, 6. **Toalla.** En cada paso, la mano arrastra la herramienta que toca hasta el animal y la frota por encima, igual que arrastra la comida. Pasa al siguiente cuando ese paso de la limpieza se completa.
7. **Fin**: cuando el animal queda limpio. Da sus monedas normales.

- Si cierra la limpieza a medias, la mano vuelve al paso 1 (igual que pasa con la comida en la de inicio). **[decisión mía]**

## 4. Lección de clínica

**Preparación, al momento**

- Si ya hay un animal enfermo, la lección usa ese. Si no, uno de los animales del niño se pone malito **al instante** (`fallSick` sobre `sickCandidates`), respetando las normas de siempre: como mucho 2 enfermos en el zoo y nunca dos del mismo recinto.
- Desde el menú, igual.

**Pasos**

1. **Tocar al animal enfermo.** La mano lo señala (con el bocadillo del borde si está fuera de la pantalla). Se abre la comida y el animal hace «¡puaj!» con la cruz encima.
2. **Tocar la cruz.** La mano señala la cruz. La cuidadora va andando sola a la clínica, como ya hace el juego.
3. **Tocar al animal en su cama** de la clínica. Se abre la curación.
4. **Curar**: la mano arrastra una medicina hasta el animal, hasta llenar la barra.
5. **Fin**: cuando el animal se cura. Da sus monedas normales.

- Si en el paso 1 o 2 cierra la comida sin tocar la cruz, la mano vuelve al paso 1. Si ya está en la clínica y sale sin curar, la mano señala de nuevo el botón de la clínica para volver. **[decisión mía]**

## 5. Botón Aprender del menú

- Hace **todas las lecciones seguidas**, sin pausa entre una y otra: la de inicio, después la de limpieza (si ya la tiene desbloqueada) y después la de clínica (si ya la tiene desbloqueada). Lo decidió David.
- La ✕ corta todo el encadenado: no pasa a la siguiente lección.
- Si una lección no se puede preparar (por ejemplo, ya hay 2 enfermos en otros recintos y ninguno está a la vista), se usa uno de los que ya hay. Si de verdad no se puede, esa lección se salta y se sigue con la siguiente. **[decisión mía]**

## 6. Cosas que se guardan

- `save.tutorial` pasa de `{ offered }` a `{ offered, cleanOffered, clinicOffered }`, más lo pendiente de enseñar al salir de la tienda, para que no se pierda si cierra el juego en la tienda. Las partidas de antes leen lo que falta como `false`. **[decisión mía]**
- Lo que se ensucia o enferma para la lección se guarda como cualquier otro sucio o enfermo: es real, no de mentira.

## 7. Matomo

Las normas del catálogo (`core/eventCatalog.ts`): los nombres van en español, ninguna acción se repite en todo el catálogo y los cruces van ya hechos en el nombre (`part(...)`).

- Se usan **las mismas acciones** de la categoría `tutorial` (`tutorial-ofrece`, `-aprende`, `-salta`, `-menu`, `-paso`, `-fin`, `-deja`). Cada evento lleva en el nombre la lección (`inicio`, `limpieza` o `clinica`). **[decisión mía]**
  - `tutorial-paso` de inicio conserva sus nombres de ahora (`moverse`, `tocar-animal`…) para no romper los informes que ya hay. Los nuevos llevan delante la lección: `limpieza/tocar-animal`, `limpieza/cacahuete`, `limpieza/cepillo`, `limpieza/jabon`, `limpieza/agua`, `limpieza/toalla`, `clinica/tocar-animal`, `clinica/cruz`, `clinica/cama`, `clinica/curar`.
  - `tutorial-fin` y `tutorial-deja` llevan sus segundos desde que empezó **esa lección**, no el encadenado entero.
  - Los eventos de ofrece, aprende, salta y fin de inicio pasan a llevar el nombre `inicio`. Los de antes no tenían nombre: se leen como `inicio`.
- Acción nueva **`tutorial-prepara`**, con el nombre de lo preparado: `limpieza/<recinto>/<animal>` o `clinica/<recinto>/<animal>`, y `ya-estaba` si se usó uno que ya estaba sucio o enfermo. **[decisión mía]**
- Lo ensuciado o enfermado a propósito **no** se cuenta como `cuidados | barro`, `mancha` ni `enferma`, para no inflar los datos de lo que pasa solo. La limpieza y la cura de la lección sí cuentan normal (`limpia`, `cura`): el niño las hace de verdad. **[decisión mía]**
- Se actualizan el catálogo, sus pruebas y la guía de lectura de Matomo del repo.

## Restricciones

- Los textos van en los 11 idiomas del juego.
- Las pruebas locales las lanza David; el constructor da los comandos y el resultado esperado.
- Al cerrar, se actualizan el README, el estado de la spec y el plan.

## Jugadores que ya tenían elefantes

Los recintos de elefantes ya existían antes de esta versión: quien ya los tiene nunca va a «comprar el primero». A ellos les sale el aviso de limpieza **la próxima vez que salgan de la tienda**, compren o no (lo decidió David, 2026-11-10). La regla general queda así: al salir de la tienda, si tiene abierto algún recinto de barro y el aviso de limpieza no ha salido nunca, sale; y lo mismo con la clínica.

## Lo que queda para quien construya

Cómo se reparte el código entre `TutorialScene` y escenas o módulos nuevos, el dibujo exacto de cada aviso, la animación de la mano al frotar y al dar la medicina, y en qué orden se resuelven los avisos que coinciden con otros.

## Cómo quedó al construirlo (2026-11-10)

Plan: [2026-11-10-tutorial-limpieza-clinica.md](../plans/2026-11-10-tutorial-limpieza-clinica.md). Estado: **construido en la rama, con pruebas automáticas en verde; falta que David lo pruebe jugando.**

- **No se guarda una lista de «pendientes».** `save.tutorial` es `{ offered, cleanOffered, clinicOffered }` y lo que toca enseñar se deduce de lo que tiene abierto y de los avisos que ya salieron (`core/lessons.ts`, `pendingLessonOffers`). Si cierra el juego dentro de la tienda, el aviso sale la próxima vez que salga de ella.
- **El animal de la práctica** sale del primer recinto de barro abierto (cerdos, elefantes africanos, elefantes asiáticos, en ese orden) con un animal que no esté malito, no necesariamente del recién comprado. Si ya hay uno sucio en un recinto abierto, se usa ese.
- **La lección de clínica tiene dos pasos más** que el diseño: dar la comida (`clinica/comida`, para que salga el «¡puaj!» y la cruz) y volver (`clinica/volver`: si sale de la clínica sin curar, la mano señala el botón de la clínica). Si la cuidadora no llega a la clínica en 15 s (se ha ido a otro sitio; los peques tardan en hacer caso, David 2026-11-10), la mano también señala ese botón.
- **Pasos en Matomo:** `limpieza/tocar-animal`, `limpieza/cacahuete`, `limpieza/cepillo`, `limpieza/jabon`, `limpieza/agua`, `limpieza/toalla`; `clinica/tocar-animal`, `clinica/comida`, `clinica/cruz`, `clinica/cama`, `clinica/volver`, `clinica/curar`. Los de inicio no cambian. `tutorial-prepara` lleva `limpieza/<recinto>/<animal>`, `clinica/<recinto>/<animal>` o `<lección>/ya-estaba`. El resumen de `tools/matomo/` separa las tres lecciones.
- **Aviso:** en la de limpieza, un 🐷 con manchas de barro y la mano; en la de clínica, la cruz roja y la mano. La frase va debajo y encoge hasta caber en cualquier idioma.
- **Al salir de la tienda** el aviso sale a los 0,3 s; en esa vuelta no se ofrece anuncio ni aviso del tablón. Si hay otro panel abierto, espera a la siguiente vuelta al mapa.
- **Quien ya lo tenía todo y no vuelve a la tienda** (David, 2026-11-10): al empezar la partida, si le falta algún aviso (tiene recinto de barro o clínica y su aviso no salió nunca), sale a los **20 s de juego**. Si hace la lección, el siguiente aviso sale seguido; si salta el aviso o deja la lección con la ✕, el siguiente espera **1 minuto de juego**. Si salta los dos, ya no vuelven (queda «Aprender» del menú). Al salir de la tienda sigue como antes: seguidos. Los tiempos están en `core/lessons.ts` (`LESSON_START_MS`, `LESSON_SKIP_WAIT_MS`).
- **La ✕ del tutorial tapaba el botón de la clínica** (lo vio David jugando, 2026-11-10): estaba 10 px por debajo de su centro. Ahora va debajo del hueco de la clínica, en la misma columna (aunque el botón aún no salga), y el bocadillo del borde se aparta también de ella. Arriba a la derecha no podía ir: ahí está la ✕ de la tienda y la clínica. Prueba: `cuidados.spec.ts` › «la ✕ del tutorial no tapa el botón de la clínica» (falló con el código viejo).
- **Pruebas automáticas:** las demás pruebas de juego abren `/?sin-tutorial`, que ahora salta también estos avisos; las suyas (`tests/e2e/lecciones.spec.ts`) abren `/?sin-tutorial&lecciones` (o `&lecciones=rapido`, que cambia las esperas por 1 s).
- La partida de los jugadores con IA (`escenario cuidados`) ya ha visto los dos avisos, para que no les salgan.

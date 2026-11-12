# Entrada con taquilla: los visitantes pagan una moneda al entrar

Fecha: 2026-11-12 · Rama: `feat/plaza-recintos-recorrido` · Estado: **diseño, pendiente de aprobar**

## Por qué

David quiere que el niño **vea** que el zoo gana dinero porque viene gente: un visitante entra, paga una moneda y
esa moneda llega a su contador. Sin palabras: con un dibujo, un sonido y el número que sube. Tiene que notarlo un
niño de 5 años que no lee.

## El momento (lo que pidió David)

Un visitante pasa por la entrada del zoo y paga:

1. le sale **una moneda de encima de la cabeza**, que sube;
2. suena una moneda, claro y alegre, para que lo noten los más pequeños;
3. el **contador de monedas del HUD sube en 1**.

## Objetivos

- Ver a la gente pagar en la entrada, sin texto.
- Una fuente pequeña y constante de monedas que no quita protagonismo a cuidar animales.
- Aprovechar lo que ya hay: el portón de abajo, los visitantes de `VisitorCrowd`, la moneda de `coinImage` y el
  sonido `coin`.

## No objetivos y antiobjetivos

- **No** hay monedas por tiempo fuera del juego (nada de ganancias con la app cerrada).
- **No** se toca la economía de comer, limpiar o curar.
- **Antiobjetivo:** un tintineo constante que agobie, o monedas que suben sin que el niño entienda por qué y le
  quiten las ganas de cuidar animales (lo que pasaría si la entrada diera más que dar de comer).
- **Antiobjetivo:** que el niño crea que tiene que hacer algo para cobrar. Cobrar es automático, no se toca nada.

## Lo que ya existe y se reutiliza

- **Portón:** en el muro de abajo del mapa, donde acaba el camino central, con una farola a cada lado nada más
  entrar (`scripts/make-zoo-map.mjs`, «Entrada» y «Muro del parque»).
- **Visitantes:** `world/VisitorCrowd.ts`, 14 que se reutilizan siempre (nada de crear y destruir), con emoji o
  dibujo según el arte. Hoy salen ya repartidos por los caminos y pasean sin parar; nunca entran ni salen.
- **Monedas:** `session.earnCoins(n)` → `addCoins`, que ya emite `coins-changed` y el HUD lo pinta.
- **Moneda dibujada:** `coinImage` (`src/ui/`). **Sonido:** `coin` (ya está en `BASE_SOUNDS`).
- **Relojes que solo cuentan con el mundo en marcha:** el patrón de `core/careDirector.ts`.

## Cómo funciona

### Ida y vuelta de los visitantes

- Al empezar la partida, los visitantes salen repartidos por los caminos, como ahora: el zoo nunca empieza vacío.
- De vez en cuando, **uno se va**: anda hasta el portón y sale del mapa por él (desaparece al cruzarlo).
- Al rato, **vuelve a entrar** por el portón como visitante nuevo (puede cambiar de aspecto), se para un momento
  en la taquilla, **paga** y sigue a pasear como los demás.
- Siempre son los mismos 14 (se reutilizan): como mucho uno dentro de la taquilla a la vez; si llega otro, espera
  detrás.
- Se va uno que esté paseando o parado, nunca uno que esté acariciando ovejas en la granja de contacto. Si en ese
  momento no hay ninguno libre, se espera al siguiente turno.

### Ritmo (decisión mía, ajustable)

- **Entra alguien cada 20 s de media** (al azar entre 15 y 25 s): unas **3 monedas por minuto** de juego. Es
  menos que lo que da cuidar animales (de 1 a 15 monedas por comida), así que sigue mandando cuidar.
- Solo cuenta **con el mundo en marcha**: no corre dentro de la tienda, la clínica, el libro, la ventana de comer,
  los ajustes, la pausa, con la app en segundo plano ni con la mano del tutorial en pantalla.
- Las cifras van en una constante de datos con nombre, fácil de cambiar si David lo nota mucho o poco.

### La taquilla (decisión mía)

- Una **casetita de taquilla** pegada al camino, nada más pasar el portón, a un lado, con una persona dentro
  cobrando (sacada del mismo pack de oficios que los veterinarios; sin arte, se pinta con colores como el resto).
  Sin ella, ver a alguien «pagar» se entendería peor: es lo que hace leer la escena como «pagar la entrada».
- El visitante se para delante de la ventanilla **~0,6 s**, y entonces cobra.
- La taquilla no quita casillas de camino (va sobre el césped, al lado) ni choca con las farolas de la entrada.
- Si encontrar un dibujo que sirva cuesta, se pinta a píxeles como `world/ClinicBuilding.ts`.

### Al pagar

- **Siempre:** +1 moneda (`earnCoins(1)`), que se guarda como las demás.
- **Si la taquilla se ve en pantalla:**
  - sale la moneda (`coinImage`) de encima de la cabeza del visitante, sube un poco y se desvanece (~0,8 s);
  - suena `coin` a volumen normal de efectos;
  - el contador del HUD sube en 1 con su saltito habitual.
- **Si no se ve:** el contador sube en silencio (con el saltito, sin sonido). Así no suena una moneda cada 20 s
  por todo el zoo, y el sonido siempre va unido a algo que el niño ve. *(Decisión mía.)*
- El primer cobro de cada partida, si el niño está cerca, es el que «enseña» la idea; no lleva mano ni aviso.

## Cosas que se guardan

Nada nuevo: las monedas ya se guardan. Un guardado viejo sirve tal cual. La posición de los visitantes no se
guarda (como ahora).

## Textos

Ninguno: todo es dibujo, sonido y número. No hay que traducir nada a los 11 idiomas.

## Estadísticas (Matomo)

Un evento por cobro serían unos 180 por hora y jugador: demasiados. Se cuenta en la partida y se manda junto al
resumen de fin de partida (el mismo momento que `sesion | fin`):

| Categoría | Acción | Nombre | Valor | Cuándo |
|---|---|---|---|---|
| `entrada` | `taquilla-vista` | — | monedas cobradas con la taquilla en pantalla | al acabar la partida, si es > 0 |
| `entrada` | `taquilla-sin-ver` | — | monedas cobradas sin verla | al acabar la partida, si es > 0 |

Así se ve si los niños llegan a ver la entrada y cuánto pesa en lo que ganan. No hay `tiene` (no se compra nada).
Pasos del protocolo de `game/README.md` › «Estadísticas»: aviso en el bus, traducción en `analyticsEvents.ts` con
su prueba, acciones en `CATALOG`, esta spec en la lista de `eventCatalog.test.ts`, apartado en
`tools/matomo/resumen.mjs`. Los jugadores con IA ya llevan las estadísticas apagadas.

## Pruebas (cada caso)

Unitarias (lógica pura, sin Phaser):
- el reloj de la entrada: cada cuánto entra alguien; no corre con el mundo parado ni con el tutorial;
- solo uno en la taquilla a la vez; el siguiente espera;
- cobrar suma exactamente 1 moneda; con la app volviendo de segundo plano no cobra lo perdido;
- «se ve / no se ve» decide si hay moneda en la cabeza y sonido;
- traducción de los dos eventos y su envío solo si son > 0.

De juego (Playwright, de una en una, `--workers=1`):
- con la cámara en la entrada: entra un visitante, se para, sale la moneda, suena `coin` (`soundsPlayed()`) y el
  contador sube 1;
- con la cámara lejos: el contador sube, no suena nada;
- dentro de la tienda no cobra nadie;
- partida vieja (guardado de la 2.10.0): carga y cobra igual;
- pantalla baja apaisada: la moneda de la cabeza se ve entera;
- `caminos.test.ts` sigue igual (la taquilla no quita camino).

Para probarlo rápido hará falta un gancho de pruebas que mande entrar a un visitante ya.
Antes de lanzar las pruebas se pregunta a David si las lanza él (hasta ahora, siempre él).

## Restricciones

- Para niños: sin texto, sin datos de nadie en Matomo.
- Lo publicado no se rompe: sin campos nuevos en el guardado; el servidor no cambia.
- El mapa cambia (taquilla): foto del zoo para `mapa-historico/` del repo privado y `npm run make:zoo-map`.
- Recortes de los packs para documentar: solo en el repo privado.
- **Lo visual lo valida David** con capturas o jugando: la taquilla, la moneda en la cabeza y el sonido.

## Lo que queda para quien construya

- Qué dibujo exacto usa la taquilla y a qué lado del camino va (con captura para David).
- Cómo se quita al visitante que sale (fundido o cruzar el borde) y por dónde exacto cruza el portón.
- El nombre del aviso del bus y de las constantes.

## Decisiones mías (para que David las revise)

- Casetita de taquilla con una persona cobrando junto al portón.
- Una moneda cada ~20 s (15–25 s) y solo con el mundo en marcha.
- Moneda en la cabeza y sonido solo si la entrada se ve; si no, el contador sube en silencio.
- El sonido es el `coin` que ya tiene el juego.
- Estadísticas en dos totales por partida, no un evento por cobro.

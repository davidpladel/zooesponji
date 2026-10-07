<!-- tools/matomo/README.md -->
# Lectura de las estadísticas del juego

Scripts de Node sin dependencias para descargar y resumir los informes del Matomo del juego.

## Preparación (una vez)

1. En Matomo, crea un usuario con permiso **ver** solo sobre el sitio del juego y copia su token.
2. Copia `.env.example` a `.env.local` en esta carpeta y rellénalo. Ese fichero está ignorado por git;
   los scripts se niegan a arrancar si no lo está.

## Uso

Desde la raíz del repositorio:

    node tools/matomo/pull.mjs --date=last30
    node tools/matomo/resumen.mjs

El primero descarga los informes a `tools/matomo/data/` (ignorado por git). El segundo escribe
`tools/matomo/data/resumen.md` con las tablas habituales. Toda cifra lleva su tamaño de muestra, y
con menos de 30 en el denominador se marca «insuficiente».

`probe.mjs` envía eventos de prueba con fecha antigua para comprobar la ventana de `cdt` del servidor.

## Cómo leer los datos

- Un animal se nombra con su recinto delante: `cabra/gordi`. Con comida: `cabra/gordi/zanahoria`.
- `dia-…` cuenta jugadores por día; `semana-…`, por semana; `vida-…`, una vez por instalación.
- `tiene-animal` y `tiene-recinto` se envían una vez al día y dicen qué tiene el jugador: son el denominador.
- El catálogo completo está en `game/src/core/eventCatalog.ts` y en
  `docs/superpowers/specs/2026-10-07-analitica-detallada-design.md`.

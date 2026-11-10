// Partidas preparadas para los jugadores con IA: así un objetivo puede empezar con cosas ya abiertas (la clínica
// comprada, animales sucios…) sin gastar acciones en llegar hasta ahí. El mando las deja en localStorage antes de
// cargar el juego. No importa nada del juego (lo lanza node tal cual): una prueba unitaria comprueba que el juego
// las lee sin descartar nada (tests/unit/iaEscenarios.test.ts).

export interface Escenario {
  /** Clave de localStorage donde el juego guarda la partida en la web. */
  key: string;
  save: {
    version: 2;
    state: { coins: number; counts: Record<string, number>; shopUnlocked: boolean; luna: boolean; clinic: boolean };
    settings: { music: boolean; sfx: boolean; joystick: boolean; stats: boolean };
    book: { seen: string[]; hinted: boolean; page: string | null; opened: boolean };
    tutorial: { offered: boolean; cleanOffered: boolean; clinicOffered: boolean };
    shop: { visits: number };
    clinic: { visits: number };
    care: { dirty: string[]; sick: string[]; muddy: string[] };
  };
}

const SAVE_KEY = 'zooesponji_v3_save';

export const ESCENARIOS: Record<string, Escenario> = {
  /**
   * Cuidar: cerdos y los dos recintos de elefantes llenos, la clínica comprada (y visitada: sale su botón), tres animales manchados con su
   * charco de barro y dos malitos de recintos distintos. Ya ha jugado (aviso del tutorial visto, tienda visitada) y
   * tiene monedas. Estadísticas apagadas: las partidas de IA no cuentan en Matomo.
   */
  cuidados: {
    key: SAVE_KEY,
    save: {
      version: 2,
      state: {
        coins: 300,
        counts: {
          leon: 1, cabra: 1, pantera: 0, panda: 0, estanque: 0, ovejas: 0, cerdos: 5, establo: 0,
          pinguinos: 0, sabana: 0, 'elefantes-africanos': 2, 'elefantes-asiaticos': 2,
        },
        shopUnlocked: true,
        luna: false,
        clinic: true,
      },
      settings: { music: true, sfx: true, joystick: false, stats: false },
      book: { seen: [], hinted: true, page: null, opened: false },
      tutorial: { offered: true, cleanOffered: true, clinicOffered: true },
      shop: { visits: 3 },
      // Ya ha entrado en la clínica: sale su botón debajo del de la tienda.
      clinic: { visits: 1 },
      care: { dirty: ['rosita', 'trufa', 'tembo'], sick: ['morrito', 'raja'], muddy: ['cerdos', 'elefantes-africanos'] },
    },
  },
};

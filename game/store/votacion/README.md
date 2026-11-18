# Capturas de las votaciones

Cómo se ve en el juego el final de cada votación, para poder enseñarlo (ficha, web, prensa, redes).

## 2026-11: ganó la clínica

Primera votación de la comunidad. Ganó «Clínica para animales», idea de Adrián y Daniela, y entró en el juego en la
2.10.0.

| Fichero | Qué es |
|---|---|
| `2026-11-clinica-es-aviso.png` / `-en-` | El aviso grande al entrar al parque: trofeo, «¡Ha ganado! Clínica para animales» y el botón «¡A verla!» |
| `2026-11-clinica-es-tablon-confeti.png` / `-en-` | El tablón del zoo con la ganadora, «¡Ha ganado!» y el confeti |

Sacadas el 2026-11-18 con la votación real del servidor (solo lectura), con `shots-votacion.mjs`:

```bash
# desde game/store, con `npm run dev` en marcha
COMMUNITY_URL=<la de VITE_COMMUNITY_URL> node shots-votacion.mjs es
COMMUNITY_URL=<la de VITE_COMMUNITY_URL> node shots-votacion.mjs en
```

Salen en `out/` (aviso y 8 tomas del tablón, para elegir la que mejor pilla el confeti). Para la próxima votación,
lo mismo cuando haya ganadora: copiar aquí la mejor con el mes y el nombre de la ganadora.

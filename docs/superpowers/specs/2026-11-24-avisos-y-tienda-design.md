# Arreglos tras probar la 2.11.0: aviso de votación y avisos en la tienda

Fecha: 2026-11-24 · Rama: `feat/release-2.11.0` · Tamaño: cambio pequeño (diseño corto).

## Por qué

David probó la versión en su móvil. El tutorial y la ventana de valorar en Play están bien y no se tocan. Hay tres
fallos que confunden al niño:

1. **«¡A votar!» sin votación.** Salió el aviso de votar, pero en el tablón solo estaba el resultado de la 2026-10-b
   (cerrada, gana la clínica).
2. **El tendero tapado.** En la tienda, el botón «¡Comprar!» tapa lo que dice el tendero.
3. **El aviso de página nueva del libro** dura muy poco y sale en el centro de arriba, pegado al botón de comprar y al
   globo del tendero.

## Causa (1)

`PollNoticeScene.create()` decide qué panel enseñar con `community.notifyWinner()` y, nada más enseñar el de la
ganadora, llama a `markWinnerNoticed()`. Cuando la pantalla cambia de tamaño (al girar el móvil o al aparecer o
desaparecer la barra de Android), la escena se reinicia (`onResize` → `restart`). En ese segundo `create()`,
`notifyWinner()` ya da falso y se cae en la rama `else`, la de «¡A votar!», que no comprueba que la votación siga
abierta.

## Enfoques considerados

- **Elegido: arreglar el origen.** El tipo de panel (ganadora o votar) se decide una vez por votación y se conserva al
  reiniciar, igual que hace ya `shownFor`. Además, la rama de votar exige que `community.phase() === 'open'`: si no,
  el panel se cierra sin enseñarse.
- Descartado: no reiniciar el panel al cambiar de tamaño. Se vería mal colocado en pantallas que giran.

Tienda (lo eligió David): **A, el globo del tendero siempre por encima**, y además se aparta si choca con el botón de
comprar. Descartada la B (mover el botón de comprar): lo alejaría del animal, que es la pista para los que no leen.

## Qué se hace

- **(1)** Lo descrito arriba. El aviso de la ganadora sigue saliendo una vez y con la copa.
- **(2)** El globo del tendero (`Shopkeeper.say`) va por encima del bocadillo de comprar (profundidad mayor que 3100).
  Si su caja se cruza con la del botón, se desplaza (hacia arriba o hacia un lado, siempre dentro de la pantalla y por
  debajo del contador de monedas) para que no se pisen. Vale para todos los mensajes: saludo, pista del libro, pista
  del tablón, curiosidad de cada animal, Luna, clínica, «¡Ya es tuyo!», «¡Ya no caben más!», «¡Te faltan N
  monedas!…» y «¡Gracias!».
- **(3)** El aviso de página nueva del libro dura más (unos 3,5 s visible, frente a los 1,8 s de ahora) y sale arriba
  a la derecha, sin tapar ni el botón de comprar ni el globo del tendero. Solo cambia ese aviso. Los demás avisos
  (tienda abierta, animal nuevo…) siguen igual. En árabe también va a la derecha, que es donde no estorba (decisión
  mía, se puede cambiar).

## Estadísticas (Matomo)

No hay eventos nuevos: no aparece nada nuevo que el niño pueda tocar. `poll-notice` y `poll-winner-notice` ya
existen. Con el arreglo, `poll-notice` deja de contarse por error en las votaciones cerradas.

## Pruebas

Cada fallo lleva primero una prueba que lo reproduce y falla:

- Unitarias/escena: votación cerrada con ganadora + reinicio por tamaño → sigue el panel de la copa, nunca «A votar».
  Votación cerrada sin ganadora → no sale panel. Votación abierta → «A votar» como hasta ahora. Partida vieja sin
  `winnerNoticed`.
- Playwright: en la tienda, con cada uno de los mensajes del tendero y el botón de comprar visible, las cajas no se
  pisan y el globo va encima, también en una pantalla baja apaisada. Comprar un animal que abre una página → el aviso
  sale a la derecha, sin cruzarse con el botón ni con el globo, y se ve al menos 3 s.
- Las pruebas las lanza Claude en un subagente con un modelo barato, de una en una (`--workers=1`).

## Lo que decide quien lo construya

El desplazamiento exacto del globo, la posición exacta del aviso a la derecha y cómo pasar la colocación del aviso
(un parámetro opcional del evento `toast`).

## Validación

David lo comprueba en el móvil: la tienda con varios mensajes y una compra que abra una página del libro.

# Cerdos, limpieza de animales y clínica — diseño

Fecha: 2026-11-09 · Estado: borrador pendiente de aprobar por David y los niños. Sin código todavía.

Las ideas son de los niños de la casa. En este documento, lo marcado como **[decisión mía]** no lo han dicho ellos: es una propuesta para que la cambien si no les gusta.

## Por qué

El juego tiene recintos con animales a los que se da de comer. Los niños quieren dos cosas nuevas que den más cosas que hacer y más motivos para volver al zoo:

1. Un recinto de **cerdos** que se ensucian de barro, y una limpieza divertida para ellos. Los **elefantes** (ya existen) se ensucian igual.
2. Una **clínica** donde se curan los animales que enferman.

## Objetivos

- Que limpiar a un animal sea tan fácil de entender como darle de comer, pero más largo y más divertido.
- Que se vea de lejos qué animal está sucio y cuál está malito.
- Que ninguna de las dos cosas sea una obligación ni un castigo: tardar no cuesta nada.

## No objetivos y antiobjetivos

- No hay castigo por tener animales sucios o enfermos: no pierden monedas, no se escapan, no mueren.
- No hay que añadir otros animales nuevos aparte del cerdo.
- La limpieza no sale en el tutorial inicial.
- Antiobjetivo: que el jugador no entienda qué hacer en los pasos de la limpieza (los niños lo han pedido expresamente: orden claro y un texto que explique el porqué del primer paso).

## Lo que ya existe y se reutiliza

- Dar de comer es una escena propia (`FeedScene`): se pincha al animal, abajo hay una bandeja y se arrastra la comida hasta él. La limpieza y la cura copian esa forma.
- La tienda vende recintos con un precio (`PENS`, `SHOP_ITEMS`) y animales extra de un recinto (`extraCost`). El recinto incluye el primer animal.
- Los elefantes africanos y asiáticos ya tienen recintos (`elefantes-africanos`, `elefantes-asiaticos`), con 2 elefantes cada uno.
- Las cadenas de texto están en 11 idiomas (`game/src/data/strings/`). Todo texto nuevo hay que añadirlo en todos.

## 1. Cerdos

- Recinto nuevo en la zona de la **granja**, comprado en la tienda: **150 monedas**, que incluyen el primer cerdo.
- Cada cerdo extra cuesta **50**. Máximo **5 cerdos**.
- Funciona igual que los demás recintos: al comprarlo, el recinto queda abierto con un cerdito dentro.
- Orden en la tienda: entre las ovejas (120) y el establo (400). **[decisión mía]**
- Monedas por comida: **4** normal y **6** especial, como la oveja. **[decisión mía]**
- Nombres y aspecto de los cinco cerdos, comida que les gusta y página en el Libro del Zoo: los define quien construya, con el estilo de los demás animales. **[decisión mía]**

## 2. Charco y suciedad (cerdos y los dos tipos de elefante)

Cada uno de estos tres recintos tiene su **charco**.

- El charco empieza con agua. Pasado un **tiempo aleatorio** se pone de **barro**. Solo cuenta el tiempo mientras se está jugando, y no ocurre todo el rato. Entre **2 y 5 minutos** de juego (aprobado).
- Cuando el charco está de barro y un animal pasa por encima, **se ensucia**. Un animal sucio se ve con **manchas marrones** claramente distintas del dibujo normal.
- Limpiar es opcional y sin prisa.
- Cuando **todos los animales sucios del recinto están limpios**, el charco **vuelve solo a agua limpia**. Pasado otro tiempo aleatorio, vuelve a ponerse de barro.
- Un recinto sin animales sucios y con el charco de barro sigue así hasta que alguien lo ensucie y se limpie. **[decisión mía]** Dicho de otro modo: el barro se quita solo al limpiar a todos los sucios, no antes.
- Qué pasa si no hay ningún animal sucio y el charco ya está de barro: el charco se queda de barro. **[decisión mía]**

## 3. Tocar un animal

- Animal con manchas: al pincharlo se abre la **limpieza**, no la comida.
- Animal sin manchas: al pincharlo se abre la comida, como hasta ahora.
- Animal enfermo: ver el punto 5.

## 4. La limpieza (5 pasos)

Es una escena parecida a dar de comer: el animal arriba, las herramientas abajo, y se pasa el dedo por encima del animal con la herramienta elegida. Cada paso llena una **barra**.

**Orden de los pasos** (lo han decidido los niños):

1. **Crema de cacahuete**, para que el animal se quede quieto. Un texto en **MAYÚSCULAS** explica por qué se empieza por ahí.
2. **Cepillo**, para quitar el barro. El animal **gira solo**: cuando una cara queda limpia, pasa a la siguiente. Orden de las caras, **igual para el cerdo y para los elefantes**: de frente, un lateral, el otro lateral y culete.
3. **Jabón**.
4. **Agua tibia con la manguera**, con el animal dentro de una **piscina**.
5. **Toalla**, el último paso.

**Cómo se guía a los niños**
- Solo se puede usar la herramienta del paso que toca. Las demás se ven **desactivadas, por orden**, para que se vea la secuencia correcta.
- Debe ser muy divertido (animación, sonido, burbujas). Los detalles son del que construya.

**Al terminar**
- Las manchas desaparecen y el animal queda limpio.
- Se ganan monedas: **las mismas que da darle de comer** a ese animal (para un elefante, 10; para un cerdo, 4). Lo han dicho los niños: limpiar da dinero, no cuesta.
- Los **elefantes** hacen los mismos 5 pasos y giran igual (de frente, laterales y culete), con sus propios dibujos. El charco funciona igual que el de los cerdos.

## 5. Clínica

**Compra**
- Aparece en la tienda como un animal más, pero con una **cruz** en vez de un animal. Cuesta **650**. Orden en la tienda: entre los pingüinos (600) y la sabana (900). **[decisión mía]**
- Es un edificio nuevo **en la plaza** del zoo (lo pidió David) y se visita como la tienda por dentro (vista de interior con paseo). Tiene **2 empleados: un veterinario y una veterinaria**. Su dibujo lo decide quien construya, reutilizando personajes ya dibujados si puede. **[decisión mía]**
- Tiene **2 huecos** para animales enfermos, uno por cada hueco que se puede pinchar para curar.
- Cuando se cura un animal, **desaparece de su hueco** al salir de la escena de curar, y el otro enfermo sigue allí si lo hay.

**Cuándo se enferma un animal**
- Solo se pueden enfermar los animales **una vez comprada la clínica**. **[decisión mía]**
- Un animal se pone malito **solo, en un momento aleatorio**, mientras se juega.
- En cuanto se enferma, sale un **icono de enfermo o triste** encima de su cabeza. Se queda siempre, hasta que se cura. Esto lo han propuesto los niños.
- Si le das de comer a un animal enfermo, hace **«¡puaj!»** y sale una **cruz** grande encima. Pinchas la cruz y la cuidadora **va sola andando** a la clínica, como cuando se pincha la tienda. Los niños lo han aprobado.
- Si sales sin pinchar la cruz, el animal sigue enfermo y con el icono.
- Si vas a la clínica por tu cuenta, **los animales enfermos ya están allí**.
- Como máximo **2 animales enfermos en todo el parque** a la vez. Nunca hay 2 enfermos en el mismo recinto: siempre son de recintos distintos, para que el niño los encuentre mientras visita zonas diferentes.
- Si hay enfermos y se visita la clínica, **ya están allí** (uno o dos). En la clínica se pueden curar los dos.

**Curar**
- En la clínica se anda por el interior y se pincha al animal.
- Se abre una escena igual que dar de comer y limpiar, con **medicinas y otros objetos** abajo. Las medicinas concretas: las decide quien construya (por ejemplo jarabe, pastilla, vendaje). **[decisión mía]**
- El orden da igual. Hay una **barra** que se llena hasta que el animal se cura.
- Mientras está enfermo se ve claramente que lo está (una carita triste o un texto). Al terminar queda bien y el icono desaparece.
- Curar da las **mismas monedas que darle de comer** a ese animal. **[decisión mía]**
- Al curarse, el animal vuelve a su recinto y come con normalidad.

## Cosas que se guardan

- Qué animales están sucios o enfermos y el estado de cada charco (agua o barro) se guardan con la partida. **[decisión mía]**
- Los cerdos comprados y la clínica comprada se guardan como los demás elementos de la tienda.

## Restricciones

- Texto nuevo en los 11 idiomas.
- Dibujos nuevos: cerdo y sus manchas, charco de barro, herramientas de limpieza, piscina, clínica, cruz, icono de enfermo, medicinas, veterinaria. Que sigan el estilo del arte actual; hay un flujo de arte en `game/art/`.
- Tests unitarios y e2e en los sitios donde ya hay (`economy`, `shopEntries`, `pens`, `content`).
- El arte del pack, si se crea con el pack privado, no se sube al repositorio público (regla del proyecto).

## Lo que queda para quien construya

Nombres de cerdos, tiempos exactos del charco y las enfermedades, medicinas, animaciones y sonidos, y cómo se dibuja cada cosa.

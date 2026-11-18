# El ASO de la ficha está en el repositorio privado

Desde el 2026-11-18, el ASO de la ficha de Google Play vive en el repositorio privado, carpeta `aso/`. Es estrategia y
datos de pago, así que no va en este repositorio público. Allí están:

- el proceso paso a paso (`ASO.md`);
- los estudios de palabras clave;
- los textos de las fichas en todos los idiomas;
- `densidad.py`, que comprueba largos y repeticiones;
- `plan_subida.py`, que arma la subida.

Aquí se quedan los scripts que sacan y montan las imágenes de la ficha (`shots*.mjs`, `capturas_ficha.py`,
`candidatas.py`, `make.py`, `titulares.py`, `icono_app.py`). Las imágenes quedan en `out/`, que no se guarda en git.
`plan_subida.py` las coge de aquí.

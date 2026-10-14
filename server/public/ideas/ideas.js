// Sin librerías. Los mensajes son fijos y vienen del HTML: nada de lo que escribe la persona vuelve a pintarse.
(() => {
  const form = document.getElementById('form');
  const campo = (id) => document.getElementById(id);
  const aviso = campo('aviso');
  const boton = campo('enviar');
  const filaTutor = campo('fila-tutor');

  const version = new URLSearchParams(location.search).get('v') ?? '';
  if (/^[0-9A-Za-z. -]{1,20}$/.test(version)) campo('version').value = version;

  const decir = (clave, bien = false) => {
    aviso.textContent = form.dataset[clave];
    aviso.classList.toggle('bien', bien);
    aviso.hidden = false;
  };

  // La segunda casilla solo existe si se da el nombre de un menor.
  campo('nombre').addEventListener('input', () => {
    const hayNombre = campo('nombre').value.trim() !== '';
    filaTutor.hidden = !hayNombre;
    if (!hayNombre) campo('tutor').checked = false;
  });

  let enviando = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (enviando) return;
    const datos = {
      idea: campo('idea').value,
      fallo: campo('fallo').value,
      nombre: campo('nombre').value,
      version: campo('version').value,
      modelo: campo('modelo').value,
      web: campo('web').value,
      idioma: form.dataset.idioma,
      condiciones: form.dataset.condiciones,
      mayor: campo('mayor').checked,
      tutor: campo('tutor').checked,
    };
    if (datos.idea.trim() === '' && datos.fallo.trim() === '') return decir('vacio');
    if (!datos.mayor || (datos.nombre.trim() !== '' && !datos.tutor)) return decir('aceptacion');

    enviando = true;
    boton.disabled = true;
    try {
      const respuesta = await fetch('../envio.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
        credentials: 'omit',
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (respuesta.ok && cuerpo.ok === true) {
        form.reset();
        filaTutor.hidden = true;
        decir('bien', true);
      } else {
        decir(['vacio', 'aceptacion', 'peticion'].includes(cuerpo.error) ? cuerpo.error : 'error');
      }
    } catch {
      decir('error');
    } finally {
      enviando = false;
      boton.disabled = false;
    }
  });
})();

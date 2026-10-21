// Las mismas reglas que server/app/src/Contenido.php, con mensajes para una persona.
const ID = /^[a-z0-9-]{1,40}$/;
const DIBUJO = /^[a-z0-9-]{1,40}\.png$/;
const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

const esObjeto = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function esDia(v) {
  const m = typeof v === 'string' ? DIA.exec(v) : null;
  if (!m) return false;
  const fecha = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return fecha.getUTCMonth() === +m[2] - 1 && fecha.getUTCDate() === +m[3];
}

/** es y en son obligatorios; el resto de idiomas del juego, opcionales (si falta, el juego usa el inglés). */
export const IDIOMAS = ['es', 'en', 'fr', 'pt-BR', 'pt-PT', 'it', 'ru', 'ar', 'hi', 'zh', 'ja'];

function ficha(f, donde, errores) {
  for (const idioma of Object.keys(f.titulo ?? {})) {
    if (!IDIOMAS.includes(idioma)) errores.push(`${donde}.titulo.${idioma}: el juego no tiene ese idioma.`);
  }
  for (const idioma of IDIOMAS) {
    const titulo = f.titulo?.[idioma];
    if (titulo === undefined && idioma !== 'es' && idioma !== 'en') continue;
    if (typeof titulo !== 'string' || titulo.trim() === '') errores.push(`${donde}.titulo.${idioma}: falta el título.`);
    else if ([...titulo.trim()].length > 30) errores.push(`${donde}.titulo.${idioma}: pasa de 30 letras.`);
  }
  if (typeof f.dibujo !== 'string' || !DIBUJO.test(f.dibujo)) errores.push(`${donde}.dibujo: solo minúsculas, números y guiones, acabado en .png.`);
  if (f.ideaDe !== undefined) {
    if (typeof f.ideaDe !== 'string') errores.push(`${donde}.ideaDe: tiene que ser texto.`);
    else if ([...f.ideaDe.trim()].length > 20) errores.push(`${donde}.ideaDe: pasa de 20 letras; el juego lo recortaría.`);
  }
}

/** Lista de errores de un `comunidad.json` ya leído. Vacía: vale. */
export function validar(datos) {
  if (!esObjeto(datos)) return ['El archivo no es un objeto.'];
  const errores = [];
  const v = datos.votacion ?? null;
  if (v !== null) {
    if (!esObjeto(v)) return ['votacion: tiene que ser un objeto o null.'];
    if (typeof v.id !== 'string' || !ID.test(v.id)) errores.push('votacion.id: solo minúsculas, números y guiones.');
    if (!esDia(v.abre)) errores.push('votacion.abre: no es un día AAAA-MM-DD que exista.');
    if (!esDia(v.cierra)) errores.push('votacion.cierra: no es un día AAAA-MM-DD que exista.');
    if (esDia(v.abre) && esDia(v.cierra) && v.abre > v.cierra) errores.push('votacion: cierra antes de abrir.');
    const opciones = Array.isArray(v.opciones) ? v.opciones : [];
    if (opciones.length < 2 || opciones.length > 4) errores.push('votacion.opciones: tiene que haber entre 2 y 4.');
    const ids = [];
    opciones.forEach((o, i) => {
      const donde = `votacion.opciones[${i}]`;
      if (!esObjeto(o)) return errores.push(`${donde}: tiene que ser un objeto.`);
      if (typeof o.id !== 'string' || !ID.test(o.id)) errores.push(`${donde}.id: solo minúsculas, números y guiones.`);
      else if (ids.includes(o.id)) errores.push(`${donde}.id: está repetido.`);
      ids.push(o.id);
      ficha(o, donde, errores);
    });
    if ((v.ganadora ?? null) !== null && !ids.includes(v.ganadora)) errores.push('votacion.ganadora: no es el id de ninguna opción.');
  }
  const muro = datos.muro ?? [];
  if (!Array.isArray(muro)) return [...errores, 'muro: tiene que ser una lista.'];
  if (muro.length > 30) errores.push('muro: pasa de 30 entradas.');
  muro.forEach((e, i) => {
    const donde = `muro[${i}]`;
    if (!esObjeto(e)) return errores.push(`${donde}: tiene que ser un objeto.`);
    if (!['elegida', 'hecha'].includes(e.estado)) errores.push(`${donde}.estado: tiene que ser «elegida» o «hecha».`);
    if (e.recinto !== undefined && (typeof e.recinto !== 'string' || !ID.test(e.recinto))) errores.push(`${donde}.recinto: solo minúsculas, números y guiones.`);
    ficha(e, donde, errores);
  });
  return errores;
}

/** Nombres de dibujo que usa el archivo. */
export function dibujos(datos) {
  return [...new Set([...(datos.votacion?.opciones ?? []), ...(datos.muro ?? [])].map((f) => f?.dibujo).filter((d) => typeof d === 'string'))];
}

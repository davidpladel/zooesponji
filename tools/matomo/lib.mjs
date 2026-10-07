// Funciones puras para leer los informes de eventos de Matomo. Sin dependencias.

/** Mínimo de jugadores en el denominador para sacar una conclusión. */
export const MIN_SAMPLE = 30;

export function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const cut = trimmed.indexOf('=');
    if (cut < 1) continue;
    out[trimmed.slice(0, cut).trim()] = trimmed.slice(cut + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Informe plano «acción × nombre» de Matomo → filas sencillas. */
export function toRows(report) {
  if (!Array.isArray(report)) return [];
  return report.map((row) => {
    const label = String(row.label ?? '');
    const cut = label.indexOf(' - ');
    return {
      action: String(row.Events_EventAction ?? (cut < 0 ? label : label.slice(0, cut))),
      name: String(row.Events_EventName ?? (cut < 0 ? '' : label.slice(cut + 3))),
      events: Number(row.nb_events ?? 0),
      visits: Number(row.nb_visits ?? 0),
      sum: Number(row.sum_event_value ?? 0),
      avg: Number(row.avg_event_value ?? 0),
      min: Number(row.min_event_value ?? 0),
      max: Number(row.max_event_value ?? 0),
    };
  });
}

/** acción → nombre → fila. */
export function byAction(rows) {
  const index = new Map();
  for (const row of rows) {
    if (!index.has(row.action)) index.set(row.action, new Map());
    index.get(row.action).set(row.name, row);
  }
  return index;
}

/** Veces que ocurrió una acción; con `name`, solo ese nombre. */
export function events(index, action, name) {
  const names = index.get(action);
  if (!names) return 0;
  if (name !== undefined) return names.get(name)?.events ?? 0;
  let total = 0;
  for (const row of names.values()) total += row.events;
  return total;
}

export function share(n, d, min = MIN_SAMPLE) {
  if (d < min) return `insuficiente (${n} de ${d})`;
  return `${Math.round((100 * n) / d)} % (${n} de ${d})`;
}

/** Tramo donde cae la mediana, dados los recuentos por tramo y su orden. `null` sin datos. */
export function medianBucket(counts, order) {
  const total = order.reduce((sum, label) => sum + (counts.get(label) ?? 0), 0);
  if (total === 0) return null;
  let seen = 0;
  for (const label of order) {
    seen += counts.get(label) ?? 0;
    if (seen * 2 >= total) return label;
  }
  return order[order.length - 1];
}

export function table(headers, rows) {
  const line = (cells) => `| ${cells.join(' | ')} |`;
  return [line(headers), `|${headers.map(() => '---').join('|')}|`, ...rows.map(line)].join('\n');
}

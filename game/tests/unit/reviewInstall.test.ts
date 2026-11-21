import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({ requestReview: vi.fn(), openAppStore: vi.fn() }));
vi.mock('@capawesome/capacitor-app-review', () => ({ AppReview: plugin }));

import { createPlayReviewer, installReview } from '../../src/systems/reviewInstall';
import { getReview, setReview } from '../../src/systems/review';

describe('createPlayReviewer', () => {
  beforeEach(() => {
    plugin.requestReview.mockReset();
    plugin.openAppStore.mockReset();
  });

  it('pide la reseña y nunca abre la ficha de Play', async () => {
    plugin.requestReview.mockResolvedValue(undefined);
    await createPlayReviewer().request();
    expect(plugin.requestReview).toHaveBeenCalledTimes(1);
    expect(plugin.openAppStore).not.toHaveBeenCalled();
  });

  it('si Play falla, llega como promesa rechazada', async () => {
    plugin.requestReview.mockRejectedValue(new Error('no'));
    await expect(createPlayReviewer().request()).rejects.toThrow('no');
  });
});

describe('installReview', () => {
  it('en web no monta nada y no lanza', () => {
    setReview(null);
    expect(() => installReview({} as never)).not.toThrow();
    expect(getReview()).toBeNull();
  });
});

describe('sin enlaces a la tienda en el juego', () => {
  const src = fileURLToPath(new URL('../../src', import.meta.url));
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
    });

  it('nadie llama a openAppStore y no aparecen market:// ni play.google.com', () => {
    const found: string[] = [];
    for (const file of files(src)) {
      const text = readFileSync(file, 'utf8');
      if (/openAppStore\s*\(|\.openAppStore/.test(text)) found.push(`openAppStore en ${file}`);
      for (const banned of ['market://', 'play.google.com']) if (text.includes(banned)) found.push(`${banned} en ${file}`);
    }
    expect(found).toEqual([]);
  });
});

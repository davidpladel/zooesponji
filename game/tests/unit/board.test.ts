import { describe, expect, it } from 'vitest';
import { isBoardTile, readBoard, type TiledMap } from '../../src/core/tiledmap';

const map = (objects: unknown[]): TiledMap =>
  ({ width: 4, height: 4, tilewidth: 16, tileheight: 16, layers: [{ type: 'objectgroup', name: 'objetos', objects }] }) as unknown as TiledMap;

describe('readBoard', () => {
  it('lee la casilla que se pisa y la de encima, donde está el tablón', () => {
    const info = readBoard(map([{ id: 1, name: 'tablon', type: 'tablon', x: 32, y: 48, width: 16, height: 16, rotation: 0, visible: true }]));
    expect(info).toEqual({ tile: { x: 2, y: 3 }, standTile: { x: 2, y: 2 } });
    expect(isBoardTile(info!, { x: 2, y: 3 })).toBe(true);
    expect(isBoardTile(info!, { x: 2, y: 2 })).toBe(false);
  });

  it('sin objeto, no hay tablón', () => {
    expect(readBoard(map([]))).toBeNull();
  });
});

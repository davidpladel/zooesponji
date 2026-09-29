import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/systems/events';

interface TestEvents {
  ping: { n: number };
  other: { s: string };
}

describe('EventBus', () => {
  it('entrega el payload a los suscritos del evento', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.emit('ping', { n: 1 });
    expect(handler).toHaveBeenCalledWith({ n: 1 });
  });

  it('no mezcla eventos distintos', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('other', handler);
    bus.emit('ping', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('la función devuelta por on da de baja', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const off = bus.on('ping', handler);
    off();
    bus.emit('ping', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('darse de baja durante un emit no salta a otros suscritos', () => {
    const bus = new EventBus<TestEvents>();
    const second = vi.fn();
    const off = bus.on('ping', () => off());
    bus.on('ping', second);
    bus.emit('ping', { n: 1 });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clear quita todos los suscritos', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.clear();
    bus.emit('ping', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });
});

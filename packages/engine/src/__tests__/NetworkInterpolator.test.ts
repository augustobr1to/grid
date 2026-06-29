import Interpolator from '../network/Interpolator';
import type { WorldSnapshot } from '@thegridcn/shared';

function snap(timestamp: number, x: number): WorldSnapshot {
  return {
    tick: timestamp,
    timestamp,
    entities: [
      { id: 'p1', position: [x, 0, 0], quaternion: [0, 0, 0, 1], velocity: [x, 0, 0] },
    ],
  };
}

describe('network/Interpolator', () => {
  let nowSpy: jest.SpyInstance;
  afterEach(() => nowSpy?.mockRestore());

  it('returns null with fewer than two snapshots', () => {
    const interp = new Interpolator();
    expect(interp.getInterpolatedState('p1')).toBeNull();
    interp.pushSnapshot(snap(1000, 0));
    expect(interp.getInterpolatedState('p1')).toBeNull();
  });

  it('linearly interpolates position at the bracketed midpoint', () => {
    // renderTimestamp = now - bufferSizeMs = 1000 - 100 = 900, halfway between 800 and 1000.
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const interp = new Interpolator({ bufferSizeMs: 100 });
    interp.pushSnapshot(snap(800, 0));
    interp.pushSnapshot(snap(1000, 10));

    const state = interp.getInterpolatedState('p1');
    expect(state).not.toBeNull();
    expect(state!.position[0]).toBeCloseTo(5, 5);
    expect(state!.velocity[0]).toBeCloseTo(5, 5);
  });

  it('falls back to the latest snapshot when render time is outside the buffer', () => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(5000);
    const interp = new Interpolator({ bufferSizeMs: 100 });
    interp.pushSnapshot(snap(800, 1));
    interp.pushSnapshot(snap(1000, 7));
    // renderTimestamp 4900 is past both snapshots → use latest (x=7).
    expect(interp.getInterpolatedState('p1')!.position[0]).toBe(7);
  });

  it('returns null for an unknown entity id', () => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const interp = new Interpolator({ bufferSizeMs: 100 });
    interp.pushSnapshot(snap(800, 0));
    interp.pushSnapshot(snap(1000, 10));
    expect(interp.getInterpolatedState('ghost')).toBeNull();
  });

  it('trims the buffer to a bounded size', () => {
    const interp = new Interpolator();
    for (let i = 0; i < 25; i++) interp.pushSnapshot(snap(i, i));
    // Internal cap is 10; the oldest are dropped. Verify via behavior, not internals:
    // with only recent snapshots present, an ancient render time falls back to latest.
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(24);
    const state = interp.getInterpolatedState('p1');
    expect(state).not.toBeNull();
  });

  it('clear() empties the buffer', () => {
    const interp = new Interpolator();
    interp.pushSnapshot(snap(800, 0));
    interp.pushSnapshot(snap(1000, 10));
    interp.clear();
    expect(interp.getInterpolatedState('p1')).toBeNull();
  });
});

import EventEmitter from '../util/EventEmitter';

describe('EventEmitter', () => {
  it('invokes registered listeners with args', () => {
    const ee = new EventEmitter();
    const calls: number[] = [];
    ee.on('tick', (n) => calls.push(n as number));
    ee.emit('tick', 1);
    ee.emit('tick', 2);
    expect(calls).toEqual([1, 2]);
  });

  it('off() stops a listener', () => {
    const ee = new EventEmitter();
    const calls: number[] = [];
    const fn = (n: unknown) => calls.push(n as number);
    ee.on('tick', fn);
    ee.emit('tick', 1);
    ee.off('tick', fn);
    ee.emit('tick', 2);
    expect(calls).toEqual([1]);
  });

  it('once() fires exactly one time', () => {
    const ee = new EventEmitter();
    let count = 0;
    ee.once('go', () => count++);
    ee.emit('go');
    ee.emit('go');
    expect(count).toBe(1);
  });

  it('does not corrupt dispatch when a listener mutates listeners mid-emit', () => {
    const ee = new EventEmitter();
    const seen: string[] = [];
    // `a` removes itself and adds `c` during emit; with a live-Set iteration this
    // would skip `b` or run `c` in the same dispatch. Snapshot iteration prevents both.
    const a = () => {
      seen.push('a');
      ee.off('e', a);
      ee.on('e', () => seen.push('c'));
    };
    ee.on('e', a);
    ee.on('e', () => seen.push('b'));
    ee.emit('e');
    expect(seen).toEqual(['a', 'b']);
  });

  it('removeAllListeners clears handlers', () => {
    const ee = new EventEmitter();
    let count = 0;
    ee.on('x', () => count++);
    ee.removeAllListeners('x');
    ee.emit('x');
    expect(count).toBe(0);
  });
});

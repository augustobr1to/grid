/**
 * InputQueue.js — client-side prediction input log.
 */
export default class InputQueue {
    constructor() {
        this._queue = [];
    }

    push(input) {
        this._queue.push({ ...input, stateAfterInput: null });
    }

    setStateAfterInput(seq, state) {
        const entry = this._queue.find(e => e.seq === seq);
        if (entry) {
            entry.stateAfterInput = state;
        }
    }

    /**
     * On RECONCILE, discard all inputs up to seq and return unprocessed ones.
     */
    getUnprocessedAfter(seq) {
        const idx = this._queue.findIndex(e => e.seq === seq);
        if (idx === -1) return [];
        this._queue.splice(0, idx + 1);
        return [...this._queue];
    }

    clear() {
        this._queue = [];
    }
}

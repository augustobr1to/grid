/**
 * Lightweight browser-compatible event emitter.
 * Follows the standard on/off/once/emit API.
 */
export default class EventEmitter {
    private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

    on(event: string, listener: (...args: unknown[]) => void): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event)!.add(listener);
    }

    off(event: string, listener: (...args: unknown[]) => void): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this._listeners.delete(event);
            }
        }
    }

    once(event: string, listener: (...args: unknown[]) => void): void {
        const wrapper = (...args: unknown[]) => {
            this.off(event, wrapper);
            listener(...args);
        };
        this.on(event, wrapper);
    }

    emit(event: string, ...args: unknown[]): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener(...args);
            }
        }
    }

    removeAllListeners(event?: string): void {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }
}

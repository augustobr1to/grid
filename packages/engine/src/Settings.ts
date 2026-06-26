/**
 * Settings — static class for persisting key-value settings to localStorage.
 * Uses debounced save and fires CHANGE events.
 */
import EventEmitter from './util/EventEmitter';

const STORAGE_KEY = 'tge_settings';
const SAVE_DEBOUNCE_MS = 500;

class Settings {
    private static _data: Record<string, unknown> = {};
    private static _emitter = new EventEmitter();
    private static _saveTimeout: ReturnType<typeof setTimeout> | null = null;

    static load(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                Settings._data = JSON.parse(raw);
            }
        } catch {
            Settings._data = {};
        }
    }

    static get(key: string): unknown {
        return Settings._data[key];
    }

    static set(key: string, value: unknown): void {
        Settings._data[key] = value;
        Settings._scheduleSave();
        Settings._emitter.emit('CHANGE');
    }

    static reset(): void {
        Settings._data = {};
        Settings._scheduleSave();
        Settings._emitter.emit('CHANGE');
    }

    static on(event: 'CHANGE', listener: () => void): void {
        Settings._emitter.on(event, listener);
    }

    static off(event: 'CHANGE', listener: () => void): void {
        Settings._emitter.off(event, listener);
    }

    private static _scheduleSave(): void {
        if (Settings._saveTimeout) {
            clearTimeout(Settings._saveTimeout);
        }
        Settings._saveTimeout = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(Settings._data));
            } catch {
                // localStorage may be unavailable
            }
        }, SAVE_DEBOUNCE_MS);
    }
}

export default Settings;

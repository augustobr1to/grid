/**
 * Jest setup file — runs before each test file.
 */

// Global mocks and polyfills
(global as any).localStorage = {
    _store: {} as Record<string, string>,
    getItem(key: string) { return this._store[key] ?? null; },
    setItem(key: string, value: string) { this._store[key] = value; },
    removeItem(key: string) { delete this._store[key]; },
    clear() { this._store = {}; },
};

// Mock requestAnimationFrame
(global as any).requestAnimationFrame = (cb: Function) => setTimeout(cb, 16);
(global as any).cancelAnimationFrame = (id: number) => clearTimeout(id);

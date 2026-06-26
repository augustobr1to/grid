/**
 * KeyboardHandler — listens to window keydown/keyup; tracks key state.
 */
export default class KeyboardHandler {
    private _keysDown: Set<string> = new Set();

    constructor() {
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    private _onKeyDown(e: KeyboardEvent): void {
        this._keysDown.add(e.key.toLowerCase());
    }

    private _onKeyUp(e: KeyboardEvent): void {
        this._keysDown.delete(e.key.toLowerCase());
    }

    isKeyDown(key: string): boolean {
        return this._keysDown.has(key.toLowerCase());
    }

    dispose(): void {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this._keysDown.clear();
    }
}

/**
 * GamepadHandler — wraps navigator.getGamepads(); polls each frame.
 */
export default class GamepadHandler {
    private _gamepads: (Gamepad | null)[] = [];

    constructor() {
        this._onConnected = this._onConnected.bind(this);
        this._onDisconnected = this._onDisconnected.bind(this);
        window.addEventListener('gamepadconnected', this._onConnected);
        window.addEventListener('gamepaddisconnected', this._onDisconnected);
    }

    private _onConnected(e: GamepadEvent): void {
        this._gamepads[e.gamepad.index] = e.gamepad;
    }

    private _onDisconnected(e: GamepadEvent): void {
        this._gamepads[e.gamepad.index] = null;
    }

    /**
     * Must be called each frame to refresh gamepad state.
     */
    beforeRender(): void {
        const pads = navigator.getGamepads();
        for (let i = 0; i < pads.length; i++) {
            if (pads[i]) {
                this._gamepads[i] = pads[i];
            }
        }
    }

    isButtonDown(button: number | string): boolean {
        const pad = this._gamepads.find((g) => g !== null);
        if (!pad) return false;
        const idx = typeof button === 'string' ? parseInt(button, 10) : button;
        return pad.buttons[idx]?.pressed ?? false;
    }

    getAxis(index: number): number {
        const pad = this._gamepads.find((g) => g !== null);
        if (!pad) return 0;
        return pad.axes[index] ?? 0;
    }

    dispose(): void {
        window.removeEventListener('gamepadconnected', this._onConnected);
        window.removeEventListener('gamepaddisconnected', this._onDisconnected);
    }
}

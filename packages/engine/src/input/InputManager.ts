/**
 * InputManager — aggregates keyboard, mouse, and gamepad input.
 */
import type { InputOptions } from '../types';
import KeyboardHandler from './KeyboardHandler';
import MouseHandler from './MouseHandler';
import GamepadHandler from './GamepadHandler';

export default class InputManager {
    private _keyboard: KeyboardHandler;
    private _mouse: MouseHandler;
    private _gamepad: GamepadHandler;
    private _wsadMovement: boolean;

    constructor(options?: InputOptions) {
        this._wsadMovement = options?.wsadMovement ?? true;
        this._keyboard = new KeyboardHandler();
        this._mouse = new MouseHandler(options?.mouseOptions);
        this._gamepad = new GamepadHandler();
    }

    setCanvas(canvas: HTMLCanvasElement): void {
        this._mouse.setCanvas(canvas);
    }

    /** Called each frame before game logic. */
    beforeRender(): void {
        this._gamepad.beforeRender();
    }

    /** -1.0 (forward) to +1.0 (back) */
    readVerticalAxis(): number {
        let value = 0;
        if (this._wsadMovement) {
            if (this._keyboard.isKeyDown('w') || this._keyboard.isKeyDown('arrowup')) value -= 1;
            if (this._keyboard.isKeyDown('s') || this._keyboard.isKeyDown('arrowdown')) value += 1;
        }
        // Add gamepad left stick Y
        const gpY = this._gamepad.getAxis(1);
        if (Math.abs(gpY) > 0.1) value += gpY;
        return Math.max(-1, Math.min(1, value));
    }

    /** -1.0 (left) to +1.0 (right) */
    readHorizontalAxis(): number {
        let value = 0;
        if (this._wsadMovement) {
            if (this._keyboard.isKeyDown('a') || this._keyboard.isKeyDown('arrowleft')) value -= 1;
            if (this._keyboard.isKeyDown('d') || this._keyboard.isKeyDown('arrowright')) value += 1;
        }
        // Add gamepad left stick X
        const gpX = this._gamepad.getAxis(0);
        if (Math.abs(gpX) > 0.1) value += gpX;
        return Math.max(-1, Math.min(1, value));
    }

    isKeyDown(key: string): boolean {
        return this._keyboard.isKeyDown(key);
    }

    getMouseDeltaX(): number {
        return this._mouse.getMovementX();
    }

    getMouseDeltaY(): number {
        return this._mouse.getMovementY();
    }

    resetMouseDeltas(): void {
        this._mouse.resetDeltas();
    }

    isGamepadButtonDown(button: number | string): boolean {
        return this._gamepad.isButtonDown(button);
    }

    getGamepadAxis(index: number): number {
        return this._gamepad.getAxis(index);
    }

    dispose(): void {
        this._keyboard.dispose();
        this._mouse.dispose();
        this._gamepad.dispose();
    }
}

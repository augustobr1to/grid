/**
 * MouseHandler — tracks mouse movement deltas and optional pointer lock.
 */
export default class MouseHandler {
    private _deltaX = 0;
    private _deltaY = 0;
    private _usePointerLock: boolean;
    private _canvas: HTMLCanvasElement | null = null;

    constructor(options?: { usePointerLock?: boolean }) {
        this._usePointerLock = options?.usePointerLock ?? false;
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onClick = this._onClick.bind(this);
        window.addEventListener('mousemove', this._onMouseMove);
    }

    setCanvas(canvas: HTMLCanvasElement): void {
        this._canvas = canvas;
        if (this._usePointerLock) {
            canvas.addEventListener('click', this._onClick);
        }
    }

    private _onClick(): void {
        if (this._usePointerLock && this._canvas) {
            this._canvas.requestPointerLock();
        }
    }

    private _onMouseMove(e: MouseEvent): void {
        this._deltaX += e.movementX;
        this._deltaY += e.movementY;
    }

    getMovementX(): number {
        return this._deltaX;
    }

    getMovementY(): number {
        return this._deltaY;
    }

    resetDeltas(): void {
        this._deltaX = 0;
        this._deltaY = 0;
    }

    dispose(): void {
        window.removeEventListener('mousemove', this._onMouseMove);
        if (this._canvas) {
            this._canvas.removeEventListener('click', this._onClick);
        }
    }
}

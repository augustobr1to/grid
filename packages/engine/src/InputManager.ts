export type MouseButton = 0 | 1 | 2;

export interface MouseDelta {
  x: number;
  y: number;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private keysJustReleased: Set<string> = new Set();

  private mouseButtons: Set<MouseButton> = new Set();
  private mouseDelta: MouseDelta = { x: 0, y: 0 };
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private _pointerLocked = false;

  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnPointerLockChange: () => void;

  constructor(private readonly target: EventTarget = window) {
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnPointerLockChange = this.onPointerLockChange.bind(this);
  }

  /** Start listening to DOM events */
  attach(): void {
    this.target.addEventListener("keydown", this.boundOnKeyDown as EventListener);
    this.target.addEventListener("keyup", this.boundOnKeyUp as EventListener);
    this.target.addEventListener("mousemove", this.boundOnMouseMove as EventListener);
    this.target.addEventListener("mousedown", this.boundOnMouseDown as EventListener);
    this.target.addEventListener("mouseup", this.boundOnMouseUp as EventListener);
    document.addEventListener("pointerlockchange", this.boundOnPointerLockChange);
  }

  /** Stop listening to DOM events */
  detach(): void {
    this.target.removeEventListener("keydown", this.boundOnKeyDown as EventListener);
    this.target.removeEventListener("keyup", this.boundOnKeyUp as EventListener);
    this.target.removeEventListener("mousemove", this.boundOnMouseMove as EventListener);
    this.target.removeEventListener("mousedown", this.boundOnMouseDown as EventListener);
    this.target.removeEventListener("mouseup", this.boundOnMouseUp as EventListener);
    document.removeEventListener("pointerlockchange", this.boundOnPointerLockChange);
  }

  // ── Per-frame lifecycle (call at start of each frame) ─────────────────────

  /** Must be called once per frame to reset transient state */
  flush(): void {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouseDelta = { x: 0, y: 0 };
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  isKeyHeld(code: string): boolean {
    return this.keys.has(code);
  }

  isKeyJustPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  isKeyJustReleased(code: string): boolean {
    return this.keysJustReleased.has(code);
  }

  // ── Mouse ─────────────────────────────────────────────────────────────────

  isMouseButtonHeld(btn: MouseButton): boolean {
    return this.mouseButtons.has(btn);
  }

  getMouseDelta(): MouseDelta {
    return { ...this.mouseDelta };
  }

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  get pointerLocked(): boolean {
    return this._pointerLocked;
  }

  requestPointerLock(element: HTMLElement): void {
    element.requestPointerLock();
  }

  exitPointerLock(): void {
    document.exitPointerLock();
  }

  // ── Gamepad ───────────────────────────────────────────────────────────────

  /** Returns a live Gamepad snapshot (or null if unavailable) */
  getGamepad(index = 0): Gamepad | null {
    return navigator.getGamepads?.()[index] ?? null;
  }

  getGamepadAxis(index = 0, axis = 0): number {
    return this.getGamepad(index)?.axes[axis] ?? 0;
  }

  isGamepadButtonHeld(index = 0, button = 0): boolean {
    return this.getGamepad(index)?.buttons[button]?.pressed ?? false;
  }

  // ── Private handlers ──────────────────────────────────────────────────────

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.keys.has(e.code)) this.keysJustPressed.add(e.code);
    this.keys.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
    this.keysJustReleased.add(e.code);
  }

  private onMouseMove(e: MouseEvent): void {
    if (this._pointerLocked) {
      this.mouseDelta.x += e.movementX;
      this.mouseDelta.y += e.movementY;
    } else {
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.mouseButtons.add(e.button as MouseButton);
  }

  private onMouseUp(e: MouseEvent): void {
    this.mouseButtons.delete(e.button as MouseButton);
  }

  private onPointerLockChange(): void {
    this._pointerLocked = document.pointerLockElement !== null;
  }
}

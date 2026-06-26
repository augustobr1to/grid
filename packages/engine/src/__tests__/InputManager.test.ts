/** @jest-environment jsdom */
import { InputManager } from "../InputManager";

function keyEvent(type: "keydown" | "keyup", code: string): KeyboardEvent {
  return new KeyboardEvent(type, { code, bubbles: true });
}

function mouseEvent(type: "mousedown" | "mouseup", button: number): MouseEvent {
  return new MouseEvent(type, { button, bubbles: true });
}

describe("InputManager", () => {
  let target: EventTarget;
  let im: InputManager;

  beforeEach(() => {
    target = new EventTarget();
    im = new InputManager(target);
    im.attach();
  });

  afterEach(() => {
    im.detach();
  });

  test("isKeyHeld returns true after keydown", () => {
    target.dispatchEvent(keyEvent("keydown", "KeyW"));
    expect(im.isKeyHeld("KeyW")).toBe(true);
  });

  test("isKeyHeld returns false after keyup", () => {
    target.dispatchEvent(keyEvent("keydown", "KeyW"));
    target.dispatchEvent(keyEvent("keyup", "KeyW"));
    expect(im.isKeyHeld("KeyW")).toBe(false);
  });

  test("isKeyJustPressed is true before flush, false after", () => {
    target.dispatchEvent(keyEvent("keydown", "Space"));
    expect(im.isKeyJustPressed("Space")).toBe(true);
    im.flush();
    expect(im.isKeyJustPressed("Space")).toBe(false);
  });

  test("isKeyJustReleased is true before flush, false after", () => {
    target.dispatchEvent(keyEvent("keydown", "Space"));
    target.dispatchEvent(keyEvent("keyup", "Space"));
    expect(im.isKeyJustReleased("Space")).toBe(true);
    im.flush();
    expect(im.isKeyJustReleased("Space")).toBe(false);
  });

  test("isMouseButtonHeld tracks buttons", () => {
    target.dispatchEvent(mouseEvent("mousedown", 0));
    expect(im.isMouseButtonHeld(0)).toBe(true);
    target.dispatchEvent(mouseEvent("mouseup", 0));
    expect(im.isMouseButtonHeld(0)).toBe(false);
  });
});

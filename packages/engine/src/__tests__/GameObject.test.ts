import GameObject from "../GameObject";
import Component from "../Component";

class TestComponent extends Component {
  attached = false;
  detached = false;
  ticks = 0;
  constructor(gameObject: any) {
    super(gameObject, { type: "TestComponent" });
  }
  onAttach() { this.attached = true; }
  onDetach() { this.detached = true; }
  beforeRender() { this.ticks++; }
  toJSON() { return { type: this.getType() }; }
}

function mockParent() {
  return { threeJSGroup: { add: jest.fn(), remove: jest.fn() } };
}

describe("GameObject", () => {
  test("addComponent / getComponent", () => {
    const go = new GameObject(mockParent());
    const c = new TestComponent(go);
    go.addComponent(c);
    expect(go.getComponent("TestComponent")).toBe(c);
    expect(c.attached).toBe(true);
  });

  test("duplicate component warns and is ignored", () => {
    const go = new GameObject(mockParent());
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    go.addComponent(new TestComponent(go));
    go.addComponent(new TestComponent(go));
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  test("removeComponent calls onDetach", () => {
    const go = new GameObject(mockParent());
    const c = new TestComponent(go);
    go.addComponent(c);
    go.removeComponent("TestComponent");
    expect(c.detached).toBe(true);
    expect(go.hasComponent("TestComponent")).toBe(false);
  });

  test("update ticks components", () => {
    const go = new GameObject(mockParent());
    const c = new TestComponent(go);
    go.addComponent(c);
    go.update(0.016);
    go.update(0.016);
    expect(c.ticks).toBe(2);
  });

  test("addChild / getChildren / getParent", () => {
    const parent = new GameObject(mockParent());
    const child = new GameObject(parent);
    parent.addChild(child);
    expect(parent.getChildren()).toContain(child);
    expect(child.getParent()).toBe(parent);
  });

  test("fromJSON/toJSON round-trip", () => {
    const json = {
      id: "abc",
      name: "Cube",
      transform: {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      components: [],
    };
    const go = GameObject.fromJSON(json);
    expect(go.id).toBe("abc");
    expect(go.threeJSGroup.position.x).toBe(1);
    const out = go.toJSON();
    expect(out.id).toBe("abc");
    expect(out.name).toBe("Cube");
  });
});

import { Scene } from "../Scene";
import GameObject from "../GameObject";

describe("Scene", () => {
  test("add / getById / getAll", () => {
    const scene = new Scene("TestScene");
    const go = GameObject.fromJSON({ id: "id1", name: "Cube", components: [] });
    scene.add(go);
    expect(scene.getById("id1")).toBe(go);
    expect(scene.getAll()).toHaveLength(1);
  });

  test("remove cleans up object", () => {
    const scene = new Scene();
    const go = GameObject.fromJSON({ id: "id2", name: "Sphere", components: [] });
    scene.add(go);
    scene.remove("id2");
    expect(scene.getById("id2")).toBeUndefined();
  });

  test("fromJSON instantiates objects", () => {
    const scene = Scene.fromJSON({
      name: "MyScene",
      objects: [
        { id: "a", name: "A", components: [] },
        { id: "b", name: "B", parentId: "a", components: [] },
      ],
    });
    expect(scene.getAll()).toHaveLength(2);
    const b = scene.getById("b");
    expect(b?.getParent()?.id).toBe("a");
  });

  test("toJSON round-trips name and objects", () => {
    const scene = new Scene("Round");
    scene.add(GameObject.fromJSON({ id: "x", name: "X", components: [] }));
    const json = scene.toJSON();
    expect(json.name).toBe("Round");
    expect(json.objects).toHaveLength(1);
  });

  test("update does not throw without physics world", () => {
    const scene = new Scene();
    scene.add(GameObject.fromJSON({ id: "g", name: "G", components: [] }));
    expect(() => scene.update(0.016)).not.toThrow();
  });
});

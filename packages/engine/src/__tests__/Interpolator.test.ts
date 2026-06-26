import { Interpolator } from "../Interpolator";

const BASE_TRANSFORM = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
};

describe("Interpolator", () => {
  let interp: Interpolator;

  beforeEach(() => {
    interp = new Interpolator();
  });

  test("returns null with no snapshots", () => {
    expect(interp.getTransform("player1", 1000)).toBeNull();
  });

  test("returns single snapshot transform when only one exists", () => {
    interp.addSnapshot({ id: "p1", timestamp: 1000, transform: BASE_TRANSFORM });
    const result = interp.getTransform("p1", 1200);
    expect(result).toEqual(BASE_TRANSFORM);
  });

  test("interpolates position between two snapshots", () => {
    const t0 = { ...BASE_TRANSFORM, position: { x: 0, y: 0, z: 0 } };
    const t1 = { ...BASE_TRANSFORM, position: { x: 10, y: 0, z: 0 } };
    interp.addSnapshot({ id: "p1", timestamp: 1000, transform: t0 });
    interp.addSnapshot({ id: "p1", timestamp: 1200, transform: t1 });

    // renderTime = serverNow - 100ms buffer; pass serverNow = 1250 so renderTime = 1150
    const result = interp.getTransform("p1", 1250);
    expect(result).not.toBeNull();
    // renderTime=1150 is midway between 1000 and 1200 → t=0.75
    expect(result!.position.x).toBeCloseTo(7.5, 3);
  });

  test("remove() clears buffer for entity", () => {
    interp.addSnapshot({ id: "p2", timestamp: 1000, transform: BASE_TRANSFORM });
    interp.remove("p2");
    expect(interp.getTransform("p2", 1100)).toBeNull();
  });

  test("clear() removes all buffers", () => {
    interp.addSnapshot({ id: "a", timestamp: 1000, transform: BASE_TRANSFORM });
    interp.addSnapshot({ id: "b", timestamp: 1000, transform: BASE_TRANSFORM });
    interp.clear();
    expect(interp.getTransform("a", 1100)).toBeNull();
    expect(interp.getTransform("b", 1100)).toBeNull();
  });
});

/**
 * Rapier mock — provides stubs for the WASM physics library.
 */
export {};

class MockVector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
}

class MockRotation {
    x = 0; y = 0; z = 0; w = 1;
}

class MockRigidBody {
    private _translation = new MockVector3();
    private _rotation = new MockRotation();
    private _linvel = new MockVector3();

    translation() { return this._translation; }
    rotation() { return this._rotation; }
    linvel() { return this._linvel; }
    setNextKinematicTranslation(pos: any) { this._translation.x = pos.x; this._translation.y = pos.y; this._translation.z = pos.z; }
    setEnabledTranslations() { }
    setEnabledRotations() { }
    addForce() { }
    applyImpulse() { }
}

class MockCollider { }

class MockRigidBodyDesc {
    static dynamic() { return new MockRigidBodyDesc(); }
    static fixed() { return new MockRigidBodyDesc(); }
    static kinematicPositionBased() { return new MockRigidBodyDesc(); }
    static kinematicVelocityBased() { return new MockRigidBodyDesc(); }
    setTranslation() { return this; }
    setRotation() { return this; }
}

class MockColliderDesc {
    static ball() { return new MockColliderDesc(); }
    static capsule() { return new MockColliderDesc(); }
    static cuboid() { return new MockColliderDesc(); }
    static cylinder() { return new MockColliderDesc(); }
    static cone() { return new MockColliderDesc(); }
    static trimesh() { return new MockColliderDesc(); }
    static convexHull() { return new MockColliderDesc(); }
    static roundCuboid() { return new MockColliderDesc(); }
    static roundCylinder() { return new MockColliderDesc(); }
    static roundCone() { return new MockColliderDesc(); }
    static roundConvexHull() { return new MockColliderDesc(); }
    setDensity() { return this; }
    setFriction() { return this; }
    setRestitution() { return this; }
    setSensor() { return this; }
}

class MockWorld {
    gravity = new MockVector3(0, -9.8, 0);
    createRigidBody() { return new MockRigidBody(); }
    createCollider() { return new MockCollider(); }
    removeRigidBody() { }
    step() { }
    free() { }
}

const mockRapier = {
    init: async () => { },
    Vector3: MockVector3,
    World: MockWorld,
    RigidBody: MockRigidBody,
    Collider: MockCollider,
    RigidBodyDesc: MockRigidBodyDesc,
    ColliderDesc: MockColliderDesc,
};

module.exports = mockRapier;
module.exports.default = mockRapier;

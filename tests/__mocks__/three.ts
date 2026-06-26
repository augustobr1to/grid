/**
 * Three.js mock — provides stubs for the classes used by the engine.
 */
export {};

class MockVector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v: MockVector3) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    addScaledVector(v: MockVector3, s: number) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    normalize() { return this; }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    distanceTo() { return 0; }
    sub() { return this; }
    clone() { return new MockVector3(this.x, this.y, this.z); }
}

class MockQuaternion {
    x = 0; y = 0; z = 0; w = 1;
    set(x: number, y: number, z: number, w: number) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
}

class MockEuler {
    x = 0; y = 0; z = 0; order = 'XYZ';
    set(x: number, y: number, z: number, o?: string) { this.x = x; this.y = y; this.z = z; if (o) this.order = o; return this; }
}

class MockObject3D {
    name = '';
    position = new MockVector3();
    rotation = new MockEuler();
    quaternion = new MockQuaternion();
    scale = new MockVector3(1, 1, 1);
    children: MockObject3D[] = [];
    parent: MockObject3D | null = null;
    userData: Record<string, unknown> = {};
    visible = true;
    frustumCulled = true;
    add(child: MockObject3D) { this.children.push(child); child.parent = this; }
    remove(child: MockObject3D) { const i = this.children.indexOf(child); if (i >= 0) this.children.splice(i, 1); child.parent = null; }
    traverse(cb: (o: MockObject3D) => void) { cb(this); this.children.forEach(c => c.traverse(cb)); }
    getWorldDirection(v: MockVector3) { v.set(0, 0, -1); return v; }
}

class MockGroup extends MockObject3D { }
class MockScene extends MockObject3D { background: any = null; fog: any = null; }

class MockMesh extends MockObject3D {
    geometry: any = null;
    material: any = null;
    constructor(g?: any, m?: any) { super(); this.geometry = g; this.material = m; }
    raycast() { }
}

class MockInstancedMesh extends MockMesh {
    instanceMatrix = { needsUpdate: false };
    instanceColor: any = null;
    count = 0;
    constructor(g: any, m: any, count: number) { super(g, m); this.count = count; }
    setMatrixAt() { }
    setColorAt() { }
}

class MockPerspectiveCamera extends MockObject3D {
    fov: number; aspect: number; near: number; far: number;
    constructor(fov = 50, aspect = 1, near = 0.01, far = 1000) {
        super();
        this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
    }
    updateProjectionMatrix() { }
}

class MockColor {
    r = 0; g = 0; b = 0;
    constructor(c?: any) { if (typeof c === 'number') { this.r = c; } }
    setHex() { return this; }
    getHexString() { return '000000'; }
}

class MockWebGLRenderer {
    domElement = { style: {} } as any;
    info = { render: { calls: 0 } };
    setPixelRatio() { }
    setSize() { }
    setAnimationLoop(cb: any) { /* no-op */ }
    render() { }
    dispose() { }
    outputColorSpace = '';
    shadowMap = { enabled: false };
}

class MockBufferGeometry {
    attributes: Record<string, any> = {};
    index: any = null;
    setAttribute(name: string, attr: any) { this.attributes[name] = attr; }
    setIndex(index: any) { this.index = index; }
    computeBoundsTree() { }
    disposeBoundsTree() { }
    rotateX() { return this; }
    translate() { return this; }
    dispose() { }
    clone() { return new MockBufferGeometry(); }
    getAttribute(name: string) { return this.attributes[name]; }
}

class MockBoxGeometry extends MockBufferGeometry {
    constructor() {
        super();
        this.setAttribute('position', { count: 24, array: new Float32Array(72) });
        this.index = { count: 36, array: new Uint32Array(36) };
    }
}

class MockPlaneGeometry extends MockBufferGeometry {
    constructor() {
        super();
        this.setAttribute('position', { count: 4, array: new Float32Array(12) });
        this.index = { count: 6, array: new Uint32Array(6) };
    }
}

class MockRingGeometry extends MockBufferGeometry { constructor() { super(); } }
class MockCapsuleGeometry extends MockBufferGeometry { constructor() { super(); } }

class MockBufferAttribute {
    array: any;
    count: number;
    needsUpdate = false;
    constructor(array: any, itemSize: number) { this.array = array; this.count = array.length / itemSize; }
}

class MockMaterial { color = new MockColor(); transparent = false; opacity = 1; side = 0; dispose() { } visible = true; }
class MockMeshBasicMaterial extends MockMaterial { constructor(opts?: any) { super(); if (opts?.color) this.color = new MockColor(opts.color); } }
class MockMeshStandardMaterial extends MockMaterial { map: any; normalMap: any; roughnessMap: any; metalnessMap: any; aoMap: any; emissiveMap: any; envMap: any; }
class MockLineBasicMaterial extends MockMaterial { constructor(opts?: any) { super(); } }

class MockLine extends MockObject3D { geometry: any; material: any; constructor(g?: any, m?: any) { super(); this.geometry = g; this.material = m; } }

class MockFog { color: MockColor; near: number; far: number; constructor(c: any, n: number, f: number) { this.color = new MockColor(c); this.near = n; this.far = f; } }

class MockClock { start() { } stop() { } getDelta() { return 1 / 60; } }

class MockFileLoader { setResponseType() { return this; } load(url: string, onLoad: any) { onLoad({}); } }
class MockTextureLoader { load(url: string, onLoad: any) { onLoad({}); } }
class MockAudioLoader { load(url: string, onLoad: any) { onLoad({}); } }
class MockAudioListener { }
class MockPositionalAudio { setBuffer() { } setLoop() { } setVolume() { } setRefDistance() { } setRolloffFactor() { } setDistanceModel() { } setMaxDistance() { } setDetune() { } play() { } stop() { } isPlaying = false; playbackRate = 1; }

class MockTexture { dispose() { } }
class MockCubeTextureLoader { setPath() { return this; } load(faces: string[], onLoad: any) { onLoad({}); } }

class MockMatrix4 {
    makeScale() { return this; }
    setPosition() { return this; }
}

class MockBox3 {
    intersectsBox() { return false; }
}

class MockRaycaster {
    set() { }
    intersectObject() { return []; }
    intersectObjects() { return []; }
}

class MockRay { }

module.exports = {
    Vector3: MockVector3,
    Quaternion: MockQuaternion,
    Euler: MockEuler,
    Object3D: MockObject3D,
    Group: MockGroup,
    Scene: MockScene,
    Mesh: MockMesh,
    InstancedMesh: MockInstancedMesh,
    PerspectiveCamera: MockPerspectiveCamera,
    Color: MockColor,
    WebGLRenderer: MockWebGLRenderer,
    BufferGeometry: MockBufferGeometry,
    BoxGeometry: MockBoxGeometry,
    PlaneGeometry: MockPlaneGeometry,
    RingGeometry: MockRingGeometry,
    CapsuleGeometry: MockCapsuleGeometry,
    BufferAttribute: MockBufferAttribute,
    Material: MockMaterial,
    MeshBasicMaterial: MockMeshBasicMaterial,
    MeshStandardMaterial: MockMeshStandardMaterial,
    LineBasicMaterial: MockLineBasicMaterial,
    Line: MockLine,
    Fog: MockFog,
    Clock: MockClock,
    FileLoader: MockFileLoader,
    TextureLoader: MockTextureLoader,
    AudioLoader: MockAudioLoader,
    AudioListener: MockAudioListener,
    PositionalAudio: MockPositionalAudio,
    Texture: MockTexture,
    CubeTextureLoader: MockCubeTextureLoader,
    Matrix4: MockMatrix4,
    Box3: MockBox3,
    Raycaster: MockRaycaster,
    Ray: MockRay,
    SRGBColorSpace: 'srgb',
    DoubleSide: 2,
    AmbientLight: MockObject3D,
    DirectionalLight: MockObject3D,
    HemisphereLight: MockObject3D,
    PointLight: MockObject3D,
    SpotLight: MockObject3D,
};

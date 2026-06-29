/** Engine-level types shared by runtime, editor, and examples. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export type Vector3Data = Partial<Vec3>;

export interface EulerValues extends Vector3Data {
  order?: string;
}

export type MouseButton = 0 | 1 | 2;

export interface MouseDelta {
  x: number;
  y: number;
}

export interface GameOptions {
  rendererOptions?: RendererOptions;
  assetOptions?: AssetOptions;
  inputOptions?: InputOptions;
  disablePhysics?: boolean;
  networkOptions?: NetworkOptions;
  colyseusOptions?: ColyseusNetworkOptions;
}

export interface RendererOptions {
  width?: number;
  height?: number;
  pixelRatio?: number;
  setupFullScreenCanvas?: boolean;
  canvas?: HTMLCanvasElement;
  cameraOptions?: CameraOptions;
  beforeRender?: (args: { deltaTimeInSec: number; time: number }) => void;
  antialias?: boolean;
  alpha?: boolean;
  shadows?: boolean;
  clearColor?: string | number;
  fixedTimeStep?: number;
  maxSubSteps?: number;
  powerPreference?: WebGLPowerPreference;
  /** Default Tron look: ACES tone mapping + UnrealBloom + dark clear color. Defaults to true. */
  tron?: boolean;
  /** Tone mapping exposure when `tron` is enabled. Defaults to 1.0. */
  toneMappingExposure?: number;
  /** Bloom tuning when `tron` is enabled. */
  bloom?: { strength?: number; radius?: number; threshold?: number };
}

export interface CameraOptions {
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
}

export interface AssetOptions {
  dracoLoaderOptions?: DracoLoaderOptions;
}

export interface DracoLoaderOptions {
  decoderPath?: string;
}

export interface InputOptions {
  wsadMovement?: boolean;
  mouseOptions?: { usePointerLock?: boolean };
}

/** Legacy Socket.IO options. New multiplayer projects should prefer ColyseusNetworkOptions. */
export interface NetworkOptions {
  serverURL?: string;
  autoConnect?: boolean;
}

export interface ColyseusNetworkOptions {
  endpoint?: string;
  roomName?: string;
  auth?: Record<string, unknown>;
  autoConnect?: boolean;
}

export interface SceneJSON {
  name?: string;
  background?: string | number;
  fog?: FogJSON;
  lights?: SceneLightJSON[];
  sounds?: SceneSoundJSON[];
  objects?: GameObjectJSON[];
  gameObjects?: GameObjectJSON[];
}

export interface FogJSON {
  color: string | number;
  near: number;
  far: number;
}

export interface SceneLightJSON {
  type: 'AmbientLight' | 'DirectionalLight' | 'HemisphereLight' | 'PointLight' | 'RectAreaLight' | 'SpotLight' | string;
  color?: string | number;
  intensity?: number;
  position?: Vector3Data;
}

export interface SceneSoundJSON {
  name: string;
  assetPath: string;
  loop?: boolean;
  autoplay?: boolean;
  volume?: number;
  playbackRate?: number;
}

export interface GameObjectJSON {
  id?: string;
  type?: string;
  name?: string;
  parentId?: string;
  transform?: Partial<Transform>;
  position?: Vector3Data;
  rotation?: EulerValues;
  scale?: Vector3Data;
  tags?: string[];
  userData?: Record<string, unknown>;
  components?: ComponentJSON[];
  children?: GameObjectJSON[];
  gameObjects?: GameObjectJSON[];
}

export interface ComponentJSON {
  type: string;
  name?: string;
  [key: string]: unknown;
}

export type ColliderType =
  | 'ball'
  | 'capsule'
  | 'cuboid'
  | 'cylinder'
  | 'cone'
  | 'trimesh'
  | 'heightfield'
  | 'convexHull'
  | 'roundCuboid'
  | 'roundCylinder'
  | 'roundCone'
  | 'roundConvexHull';

export interface ColliderData {
  type: ColliderType;
  density?: number;
  friction?: number;
  restitution?: number;
  sensor?: boolean;
  hx?: number;
  hy?: number;
  hz?: number;
  radius?: number;
  halfHeight?: number;
  vertices?: Float32Array;
  indices?: Uint32Array;
  borderRadius?: number;
}

export interface ModelComponentJSON extends ComponentJSON {
  type: 'model';
  assetPath: string;
  position?: Vector3Data;
  scale?: Vector3Data;
  rotation?: EulerValues;
}

export interface RigidBodyComponentJSON extends ComponentJSON {
  type: 'rigidBody';
  rigidBodyType: 'dynamic' | 'fixed' | 'kinematicPositionBased' | 'kinematicVelocityBased';
  enabledTranslations?: { x: boolean; y: boolean; z: boolean };
  enabledRotations?: { x: boolean; y: boolean; z: boolean };
  colliders: ColliderData[];
}

export interface LightComponentJSON extends ComponentJSON {
  type: 'light';
  lightType: 'AmbientLight' | 'DirectionalLight' | 'HemisphereLight' | 'PointLight' | 'RectAreaLight' | 'SpotLight';
  color?: string | number;
  intensity?: number;
  position?: Vector3Data;
}

export interface SoundComponentJSON extends ComponentJSON {
  type: 'sound';
  assetPath: string;
  name: string;
  loop?: boolean;
  autoplay?: boolean;
  volume?: number;
  playbackRate?: number;
  refDistance?: number;
  rolloffFactor?: number;
  distanceModel?: 'linear' | 'inverse' | 'exponential';
  maxDistance?: number;
}

export interface PlayerSnapshot {
  id: string;
  timestamp: number;
  transform: Transform;
}

export interface GameSnapshot {
  timestamp: number;
  players: PlayerSnapshot[];
}

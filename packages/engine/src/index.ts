/** @thegridcn/engine public API. */

export { default as Game } from './Game';
export { default as Scene } from './Scene';
export { default as GameObject } from './GameObject';
export { default as Component } from './Component';
export { default as Renderer } from './Renderer';
export { default as Settings } from './Settings';
export { default as Logger } from './Logger';

export { default as CharacterController } from './util/CharacterController';
export { default as KinematicCharacterController } from './util/KinematicCharacterController';
export { default as DynamicCharacterController } from './util/DynamicCharacterController';
export { default as EventEmitter } from './util/EventEmitter';
export { generateId, deepMerge, clamp } from './Util';

export { default as ColyseusNetworkManager } from './network/ColyseusNetworkManager';
export { default as Interpolator } from './network/Interpolator';

export { default as InputManager } from './input/InputManager';
export { InputManager as DOMInputManager } from './InputManager';

export { default as AssetStore } from './assets/AssetStore';
export { default as Asset } from './assets/Asset';
export { default as GLTFAsset } from './assets/GLTFAsset';
export { default as JSONAsset } from './assets/JSONAsset';
export { default as TextureAsset } from './assets/TextureAsset';
export { default as SoundAsset } from './assets/SoundAsset';

export { default as ModelComponent } from './components/ModelComponent';
export { default as RigidBodyComponent } from './components/RigidBodyComponent';
export { default as LightComponent } from './components/LightComponent';
export { default as SoundComponent } from './components/SoundComponent';

export { createColliderDesc, createRigidBodyDesc } from './physics/PhysicsHelpers';
export { createCrosshair, anchorHUD } from './ui/UIHelpers';
export {
  ShaderLibrary,
  shaderLibrary,
  createHologramMaterial,
  createGridPulseMaterial,
  advanceShaderTime,
} from './rendering/shaders';

export type {
  AssetOptions,
  CameraOptions,
  ColyseusNetworkOptions,
  ComponentJSON,
  GameObjectJSON,
  GameOptions,
  GameSnapshot,
  InputOptions,
  MouseButton,
  MouseDelta,
  NetworkOptions,
  PlayerSnapshot,
  Quat,
  RendererOptions,
  SceneJSON,
  Transform,
  Vec3,
} from './types';
export type { ColyseusMessage, ColyseusNetworkEvent } from './network/ColyseusNetworkManager';
export type { InputSnapshot, WorldSnapshot, PlayerInfo, ReconcilePayload, EntityState } from '@thegridcn/shared';

export * as THREE from 'three';

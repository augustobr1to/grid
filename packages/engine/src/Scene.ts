import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import GameObject from './GameObject';
import type Game from './Game';
import type { FogJSON, GameObjectJSON, SceneJSON, SceneLightJSON } from './types';
import Logger from './Logger';

export default class Scene {
  readonly game: Game | null;
  readonly scenePath: string;
  readonly threeJSScene: THREE.Scene;
  rapierWorld: RAPIER.World | null = null;
  active = false;
  name: string;

  private rootGameObjects: GameObject[] = [];
  private rapier: typeof RAPIER | null = null;
  /** Lights added directly to the scene — tracked so they can be disposed on unload. */
  private sceneLights: THREE.Light[] = [];

  constructor(gameOrName: Game | string | null = null, scenePath?: string) {
    if (typeof gameOrName === 'string' && scenePath === undefined) {
      this.game = null;
      this.scenePath = gameOrName;
      this.name = gameOrName;
    } else {
      this.game = typeof gameOrName === 'string' ? null : gameOrName;
      this.scenePath = scenePath ?? 'Scene';
      this.name = this.scenePath;
    }

    this.threeJSScene = new THREE.Scene();
    this.threeJSScene.name = this.name;
  }

  static fromJSON(json: SceneJSON): Scene {
    const scene = new Scene(json.name ?? 'Scene');
    scene.applySceneJSON(json, false);
    return scene;
  }

  setPhysicsWorld(rapier: typeof RAPIER, world: RAPIER.World): void {
    this.rapier = rapier;
    this.rapierWorld = world;
  }

  async load(): Promise<void> {
    await this.initPhysics();
    const sceneJSON = await this.loadSceneJSON();
    this.applySceneJSON(sceneJSON, true);

    for (const gameObject of this.rootGameObjects) {
      await gameObject.load();
    }

    this.active = true;
  }

  unload(): void {
    this.active = false;

    for (const gameObject of this.rootGameObjects) {
      gameObject.unload();
    }
    this.rootGameObjects = [];
    this.disposeLights();
    this.threeJSScene.clear();

    this.rapierWorld?.free();
    this.rapierWorld = null;
  }

  dispose(): void {
    this.unload();
  }

  add(gameObject: GameObject): void {
    gameObject.parent = this;
    if (gameObject.threeJSGroup.parent !== this.threeJSScene) {
      this.threeJSScene.add(gameObject.threeJSGroup);
    }
    if (!this.rootGameObjects.includes(gameObject)) this.rootGameObjects.push(gameObject);
  }

  async addGameObjectFromJSON(json: GameObjectJSON): Promise<GameObject> {
    const gameObject = GameObject.create(this, json);
    this.rootGameObjects.push(gameObject);
    await gameObject.load();
    return gameObject;
  }

  remove(id: string): void {
    const rootIndex = this.rootGameObjects.findIndex((gameObject) => gameObject.id === id);
    if (rootIndex !== -1) {
      this.rootGameObjects[rootIndex].unload();
      this.rootGameObjects.splice(rootIndex, 1);
      return;
    }

    for (const gameObject of this.rootGameObjects) {
      if (this.removeDescendant(gameObject, id)) return;
    }
  }

  getById(id: string): GameObject | undefined {
    for (const gameObject of this.rootGameObjects) {
      const found = this.findDescendant(gameObject, id);
      if (found) return found;
    }
    return undefined;
  }

  getAll(): GameObject[] {
    return [...this.rootGameObjects];
  }

  beforeRender(deltaTimeInSec: number): void {
    for (const gameObject of this.rootGameObjects) {
      gameObject.beforeRender(deltaTimeInSec);
    }
  }

  update(deltaTimeInSec: number): void {
    this.beforeRender(deltaTimeInSec);
    this.rapierWorld?.step();
    this.syncPhysics();
  }

  syncPhysics(): void {
    for (const gameObject of this.rootGameObjects) {
      gameObject.syncPhysics();
    }
  }

  toJSON(): SceneJSON {
    return {
      name: this.name,
      objects: this.rootGameObjects.map((gameObject) => gameObject.toJSON()),
    };
  }

  private async initPhysics(): Promise<void> {
    if (this.game?._options?.disablePhysics || this.rapierWorld) return;
    await RAPIER.init();
    this.rapier = RAPIER;
    this.rapierWorld = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
  }

  private async loadSceneJSON(): Promise<SceneJSON> {
    if (!this.game?.assetStore || this.scenePath === 'Scene') return { name: this.name, objects: [] };

    try {
      const asset = await this.game.assetStore.load(this.scenePath);
      return (asset.data ?? {}) as SceneJSON;
    } catch (err) {
      Logger.warn(`[Scene] Failed to load "${this.scenePath}". Starting empty scene.`, err);
      return { name: this.scenePath, objects: [] };
    }
  }

  private applySceneJSON(json: SceneJSON, resetGraph: boolean): void {
    if (resetGraph) {
      for (const gameObject of this.rootGameObjects) gameObject.unload();
      this.rootGameObjects = [];
      this.disposeLights();
      this.threeJSScene.clear();
    }

    this.name = json.name ?? this.name;
    this.threeJSScene.name = this.name;
    this.applyEnvironment(json.background, json.fog);
    this.applyLights(json.lights ?? []);

    const objectJSONs = json.objects ?? json.gameObjects ?? [];
    const createdById = new Map<string, GameObject>();

    for (const objectJSON of objectJSONs) {
      const gameObject = GameObject.create(this, objectJSON);
      this.rootGameObjects.push(gameObject);
      if (objectJSON.id) createdById.set(objectJSON.id, gameObject);
    }

    for (const objectJSON of objectJSONs) {
      if (!objectJSON.id || !objectJSON.parentId) continue;
      const child = createdById.get(objectJSON.id);
      const parent = createdById.get(objectJSON.parentId);
      if (child && parent) parent.addChild(child);
    }
  }

  private applyEnvironment(background?: string | number, fog?: FogJSON): void {
    // Default Tron backdrop: near-black with matching fog. JSON values still win.
    this.threeJSScene.background = new THREE.Color(background ?? 0x05060a);
    this.threeJSScene.fog = fog
      ? new THREE.Fog(fog.color, fog.near, fog.far)
      : new THREE.Fog(0x05060a, 12, 80);
  }

  private applyLights(lights: SceneLightJSON[]): void {
    // Default Tron lighting: cool ambient + cyan key/hemisphere. JSON overrides entirely.
    const configs = lights.length > 0
      ? lights
      : [
          { type: 'AmbientLight', color: 0x12203a, intensity: 0.6 },
          { type: 'HemisphereLight', color: 0x45f3ff, intensity: 0.5 },
          { type: 'DirectionalLight', color: 0x6be7ff, intensity: 0.9, position: { x: 4, y: 8, z: 4 } },
        ];

    for (const config of configs) {
      const light = this.createLight(config);
      if (light) {
        this.threeJSScene.add(light);
        this.sceneLights.push(light);
      }
    }
  }

  /** Dispose scene-level lights (shadow maps / targets) and drop references. */
  private disposeLights(): void {
    for (const light of this.sceneLights) {
      light.dispose?.();
      light.parent?.remove(light);
    }
    this.sceneLights = [];
  }

  private createLight(config: SceneLightJSON): THREE.Light | null {
    const color = config.color ?? 0xffffff;
    const intensity = config.intensity ?? 1;
    let light: THREE.Light | null = null;

    switch (config.type) {
      case 'AmbientLight':
        light = new THREE.AmbientLight(color, intensity);
        break;
      case 'DirectionalLight':
        light = new THREE.DirectionalLight(color, intensity);
        break;
      case 'HemisphereLight':
        light = new THREE.HemisphereLight(color, 0x080820, intensity);
        break;
      case 'PointLight':
        light = new THREE.PointLight(color, intensity);
        break;
      case 'SpotLight':
        light = new THREE.SpotLight(color, intensity);
        break;
      default:
        Logger.warn(`[Scene] Unsupported light type: ${config.type}`);
        return null;
    }

    if (config.position) {
      light.position.set(config.position.x ?? 0, config.position.y ?? 0, config.position.z ?? 0);
    }
    return light;
  }

  private findDescendant(gameObject: GameObject, id: string): GameObject | undefined {
    if (gameObject.id === id) return gameObject;
    for (const child of gameObject.getChildren()) {
      const found = this.findDescendant(child, id);
      if (found) return found;
    }
    return undefined;
  }

  private removeDescendant(gameObject: GameObject, id: string): boolean {
    for (const child of gameObject.getChildren()) {
      if (child.id === id) {
        gameObject.removeChild(id);
        return true;
      }
      if (this.removeDescendant(child, id)) return true;
    }
    return false;
  }
}

export { Scene };

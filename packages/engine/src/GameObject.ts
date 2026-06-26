import * as THREE from 'three';
import Component from './Component';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { ComponentJSON, EulerValues, GameObjectJSON, Transform, Vector3Data } from './types';
import { deepMerge, generateId } from './Util';
import Logger from './Logger';
import ModelComponent from './components/ModelComponent';
import RigidBodyComponent from './components/RigidBodyComponent';
import LightComponent from './components/LightComponent';
import SoundComponent from './components/SoundComponent';

type GameObjectParent = {
  id?: string;
  parent?: GameObjectParent | null;
  game?: unknown;
  threeJSGroup?: { add: (object: THREE.Object3D) => unknown };
  threeJSScene?: { add: (object: THREE.Object3D) => unknown };
  rapierWorld?: RAPIER.World | null;
};

type GameObjectConstructor = new (parent: GameObjectParent | null, options?: GameObjectJSON) => GameObject;

const componentRegistry: Record<string, typeof Component> = {
  model: ModelComponent as unknown as typeof Component,
  rigidBody: RigidBodyComponent as unknown as typeof Component,
  light: LightComponent as unknown as typeof Component,
  sound: SoundComponent as unknown as typeof Component,
};

const gameObjectRegistry: Record<string, GameObjectConstructor> = {};

function applyVector(target: THREE.Vector3, data?: Vector3Data, defaults: Vector3Data = {}): void {
  target.set(data?.x ?? defaults.x ?? target.x, data?.y ?? defaults.y ?? target.y, data?.z ?? defaults.z ?? target.z);
}

function applyEuler(target: THREE.Euler, data?: EulerValues): void {
  if (!data) return;
  target.set(data.x ?? target.x, data.y ?? target.y, data.z ?? target.z, (data.order as THREE.EulerOrder) ?? target.order);
}

export default class GameObject {
  readonly id: string;
  readonly type: string | null;
  name: string;
  tags: string[];
  userData: Record<string, unknown>;
  readonly threeJSGroup: THREE.Group;
  parent: GameObjectParent | null;
  readonly components: Component[] = [];
  readonly gameObjects: GameObject[] = [];
  loaded = false;

  private jsonData: GameObjectJSON;

  constructor(parent: GameObjectParent | null, options: GameObjectJSON = {}) {
    this.id = options.id ?? generateId();
    this.type = options.type ?? null;
    this.name = options.name ?? '';
    this.tags = options.tags ?? [];
    this.userData = options.userData ?? {};
    this.parent = parent;
    this.jsonData = options;

    this.threeJSGroup = new THREE.Group();
    this.threeJSGroup.name = this.name;
    this.threeJSGroup.userData = { gameObjectId: this.id };

    this.applyTransform(options);
    this.attachToParent();
  }

  static fromJSON(json: GameObjectJSON, parent: GameObjectParent | null = null): GameObject {
    const gameObject = GameObject.create(parent ?? { threeJSGroup: new THREE.Group() }, json);
    for (const childJSON of json.children ?? json.gameObjects ?? []) {
      gameObject.addChild(GameObject.fromJSON(childJSON, gameObject));
    }
    return gameObject;
  }

  static registerClassForComponentType(type: string, klass: typeof Component): void {
    componentRegistry[type] = klass;
  }

  static registerGameObjectClass(type: string, klass: GameObjectConstructor): void {
    gameObjectRegistry[type] = klass;
  }

  static create(parent: GameObjectParent | null, json: GameObjectJSON): GameObject {
    const Klass = json.type ? gameObjectRegistry[json.type] ?? GameObject : GameObject;
    return new Klass(parent, json);
  }

  async load(): Promise<void> {
    let mergedJSON = { ...this.jsonData };
    const scene = this.getSceneOrNull();
    const game = scene?.game as any;

    if (this.type && game?._gameJSON?.gameObjectTypes?.[this.type]) {
      const typePath = game._gameJSON.gameObjectTypes[this.type];
      try {
        const typeAsset = await game.assetStore.load(typePath);
        mergedJSON = deepMerge(typeAsset.data as Record<string, unknown>, this.jsonData as Record<string, unknown>) as GameObjectJSON;
      } catch (err) {
        Logger.warn(`Failed to load type JSON for "${this.type}":`, err);
      }
    }

    this.tags = mergedJSON.tags ?? this.tags;
    this.userData = mergedJSON.userData ?? this.userData;
    this.applyTransform(mergedJSON);

    for (const componentJSON of mergedJSON.components ?? []) {
      const component = this.createComponent(componentJSON);
      if (component) this.components.push(component);
    }

    for (const component of this.components) {
      await component.load();
    }

    for (const childJSON of mergedJSON.children ?? mergedJSON.gameObjects ?? []) {
      const child = GameObject.create(this, childJSON);
      this.gameObjects.push(child);
      await child.load();
    }

    this.loaded = true;
  }

  unload(): void {
    for (const child of this.gameObjects) child.unload();
    this.gameObjects.length = 0;

    for (const component of this.components) component.unload();
    this.components.length = 0;

    this.threeJSGroup.parent?.remove(this.threeJSGroup);
    this.loaded = false;
  }

  async reset(json?: GameObjectJSON): Promise<void> {
    this.unload();
    if (json) this.jsonData = json;
    this.attachToParent();
    await this.load();
  }

  beforeRender(deltaTimeInSec: number): void {
    for (const component of this.components) component.beforeRender({ deltaTimeInSec });
    for (const child of this.gameObjects) child.beforeRender(deltaTimeInSec);
  }

  update(deltaTimeInSec: number): void {
    this.beforeRender(deltaTimeInSec);
  }

  syncPhysics(): void {
    this.getComponent<RigidBodyComponent>('rigidBody')?.syncToThreeJS();
    for (const child of this.gameObjects) child.syncPhysics();
  }

  initPhysics(_rapier: typeof RAPIER, _world: RAPIER.World): void {
    // Physics components create their bodies during component load.
  }

  destroyPhysics(): void {
    this.getComponent<RigidBodyComponent>('rigidBody')?.unload();
    for (const child of this.gameObjects) child.destroyPhysics();
  }

  getScene(): any {
    const scene = this.getSceneOrNull();
    if (!scene) throw new Error(`[GameObject] "${this.name}" has no Scene ancestor`);
    return scene;
  }

  addChild(child: GameObject): void;
  addChild(options: GameObjectJSON): GameObject;
  addChild(input: GameObject | GameObjectJSON): GameObject | void {
    const child = input instanceof GameObject ? input : GameObject.create(this, input);
    child.parent = this;
    if (child.threeJSGroup.parent !== this.threeJSGroup) this.threeJSGroup.add(child.threeJSGroup);
    if (!this.gameObjects.includes(child)) this.gameObjects.push(child);
    return input instanceof GameObject ? undefined : child;
  }

  removeChild(id: string): void {
    const index = this.gameObjects.findIndex((gameObject) => gameObject.id === id);
    if (index === -1) return;
    this.gameObjects[index].unload();
    this.gameObjects.splice(index, 1);
  }

  getChildren(): GameObject[] {
    return [...this.gameObjects];
  }

  getParent(): any | null {
    return this.parent;
  }

  addComponent(json: ComponentJSON): Component;
  addComponent(component: Component): this;
  addComponent(input: ComponentJSON | Component): Component | this {
    if (input instanceof Component) {
      if (this.components.some((component) => component.getType() === input.getType())) {
        console.warn(`[GameObject] Component '${input.getType()}' already attached to '${this.name}'`);
        return this;
      }
      this.components.push(input);
      (input as any).onAttach?.(this);
      return this;
    }

    const component = this.createComponent(input);
    if (!component) throw new Error(`[GameObject] Unknown component type: ${input.type}`);
    this.components.push(component);
    return component;
  }

  removeComponent(type: string): void {
    const index = this.components.findIndex((component) => component.getType() === type);
    if (index === -1) return;
    (this.components[index] as any).onDetach?.(this);
    this.components[index].unload();
    this.components.splice(index, 1);
  }

  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.find((component) => component.getType() === type) as T | undefined;
  }

  getComponents<T extends Component>(type: string): T[] {
    return this.components.filter((component) => component.getType() === type) as T[];
  }

  hasComponent(type: string): boolean {
    return this.components.some((component) => component.getType() === type);
  }

  toJSON(): GameObjectJSON {
    return {
      id: this.id,
      type: this.type ?? undefined,
      name: this.name,
      tags: this.tags,
      userData: this.userData,
      transform: this.readTransform(),
      components: this.components.map((component) => component.jsonData),
      children: this.gameObjects.map((gameObject) => gameObject.toJSON()),
    };
  }

  private attachToParent(): void {
    if (!this.parent) return;
    if (this.parent.threeJSGroup && this.threeJSGroup.parent !== this.parent.threeJSGroup) {
      this.parent.threeJSGroup.add(this.threeJSGroup);
    } else if (this.parent.threeJSScene && this.threeJSGroup.parent !== this.parent.threeJSScene) {
      this.parent.threeJSScene.add(this.threeJSGroup);
    }
  }

  private applyTransform(json: GameObjectJSON): void {
    applyVector(this.threeJSGroup.position, json.transform?.position ?? json.position, { x: 0, y: 0, z: 0 });

    if (json.transform?.rotation) {
      this.threeJSGroup.quaternion.set(
        json.transform.rotation.x ?? 0,
        json.transform.rotation.y ?? 0,
        json.transform.rotation.z ?? 0,
        json.transform.rotation.w ?? 1
      );
    } else {
      applyEuler(this.threeJSGroup.rotation, json.rotation);
    }

    applyVector(this.threeJSGroup.scale, json.transform?.scale ?? json.scale, { x: 1, y: 1, z: 1 });
  }

  private readTransform(): Transform {
    return {
      position: {
        x: this.threeJSGroup.position.x,
        y: this.threeJSGroup.position.y,
        z: this.threeJSGroup.position.z,
      },
      rotation: {
        x: this.threeJSGroup.quaternion.x,
        y: this.threeJSGroup.quaternion.y,
        z: this.threeJSGroup.quaternion.z,
        w: this.threeJSGroup.quaternion.w,
      },
      scale: {
        x: this.threeJSGroup.scale.x,
        y: this.threeJSGroup.scale.y,
        z: this.threeJSGroup.scale.z,
      },
    };
  }

  private createComponent(json: ComponentJSON): Component | null {
    const Klass = componentRegistry[json.type];
    if (!Klass) {
      Logger.warn(`[GameObject] Unknown component type: "${json.type}"`);
      return null;
    }
    return new (Klass as any)(this, json);
  }

  private getSceneOrNull(): any | null {
    let current: any = this.parent;
    while (current) {
      if (current.threeJSScene && 'rapierWorld' in current) return current;
      current = current.parent;
    }
    return null;
  }
}

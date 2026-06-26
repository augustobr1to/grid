/**
 * Game — the singleton entry point.
 * Consumers instantiate exactly one Game per browser tab.
 */
import type { GameOptions } from './types';
import Renderer from './Renderer';
import Scene from './Scene';
import AssetStore from './assets/AssetStore';
import InputManager from './input/InputManager';
import NetworkManager from './network/NetworkManager';
import ColyseusNetworkManager from './network/ColyseusNetworkManager';
import GameObject from './GameObject';
import Logger from './Logger';

export default class Game {
    readonly renderer: Renderer;
    readonly assetStore: AssetStore;
    readonly inputManager: InputManager;
    readonly networkManager: NetworkManager | null;
    readonly colyseusNetworkManager: ColyseusNetworkManager | null;
    scene: Scene | null = null;
    _baseURLorDirHandle: string | FileSystemDirectoryHandle;
    _options?: GameOptions;
    _gameJSON: any = null;
    private _initialized = false;
    private _loadingScene = false;

    constructor(
        baseURLorDirHandle: string | FileSystemDirectoryHandle,
        options?: GameOptions
    ) {
        this._baseURLorDirHandle = baseURLorDirHandle;
        this._options = options;

        // Asset store
        this.assetStore = new AssetStore(baseURLorDirHandle, options?.assetOptions);

        // Input manager
        this.inputManager = new InputManager(options?.inputOptions);

        // Renderer
        this.renderer = new Renderer(this, options?.rendererOptions);

        // Connect input manager to canvas
        this.inputManager.setCanvas(this.renderer.getCanvas());

        // Network manager
        if (options?.networkOptions) {
            this.networkManager = new NetworkManager(options.networkOptions);
        } else {
            this.networkManager = null;
        }

        if (options?.colyseusOptions) {
            this.colyseusNetworkManager = new ColyseusNetworkManager(options.colyseusOptions);
        } else {
            this.colyseusNetworkManager = null;
        }
    }

    /**
     * Async initialisation — MUST be called before loadScene().
     * Named with underscore prefix to match the upstream reference repo.
     */
    async _init(): Promise<void> {
        if (this._initialized) {
            throw new Error('[Game] _init() already called. Cannot initialise twice.');
        }

        Logger.info('Initialising Game...');

        // Load game.json
        try {
            const gameAsset = await this.assetStore.load('game.json');
            this._gameJSON = gameAsset.data;
            Logger.info('game.json loaded:', this._gameJSON);
        } catch (err) {
            Logger.warn('No game.json found — game will run without manifest.', err);
        }

        this._initialized = true;
        Logger.info('Game initialised.');
    }

    /**
     * Load a named scene (must match a key in game.json "scenes").
     */
    async loadScene(sceneName: string): Promise<void> {
        if (!this._initialized) {
            throw new Error('[Game] loadScene() called before _init(). Call _init() first.');
        }
        if (this._loadingScene) {
            throw new Error('[Game] loadScene() already in progress. Wait for it to complete.');
        }

        this._loadingScene = true;

        try {
            // Teardown existing scene
            if (this.scene) {
                this.renderer.stop();
                this.scene.unload();
                this.scene = null;
            }

            // Resolve scene path
            let scenePath: string | undefined;
            if (this._gameJSON?.scenes) {
                scenePath = this._gameJSON.scenes[sceneName];
            }
            if (!scenePath) {
                scenePath = `scenes/${sceneName}.json`;
            }

            // Create and load new scene
            this.scene = new Scene(this, scenePath);
            await this.scene.load();

            // Start rendering
            this.renderer.start();
            Logger.info(`Scene "${sceneName}" loaded and rendering.`);
        } finally {
            this._loadingScene = false;
        }
    }

    /**
     * Register custom GameObject subclasses keyed by type name.
     */
    registerGameObjectClasses(map: Record<string, typeof GameObject>): void {
        for (const [type, klass] of Object.entries(map)) {
            GameObject.registerGameObjectClass(type, klass);
        }
    }

    /**
     * Load an asset (delegates to AssetStore).
     */
    async loadAsset(path: string) {
        return this.assetStore.load(path);
    }
}

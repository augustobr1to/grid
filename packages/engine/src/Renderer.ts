/**
 * Renderer — manages the Three.js rendering loop.
 * Uses setAnimationLoop for FPS consistency.
 * No VR/WebXR path exists.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { RendererOptions, CameraOptions } from './types';
import type Game from './Game';
import type Scene from './Scene';
import Logger from './Logger';

export default class Renderer {
    readonly threeJSRenderer: THREE.WebGLRenderer;
    readonly threeJSCamera: THREE.PerspectiveCamera;
    private _audioListener: THREE.AudioListener;
    private _game: Game;
    private _beforeRender?: (args: { deltaTimeInSec: number; time: number }) => void;
    private _clock: THREE.Clock;
    private _running = false;
    private _resizeHandler?: () => void;
    private _contextLostHandler?: (e: Event) => void;
    private _contextRestoredHandler?: () => void;
    private _wasRunningBeforeContextLoss = false;
    private _fixedTimeStep: number;
    private _maxSubSteps: number;
    private _accumulator = 0;
    // Tron postprocessing pipeline (lazy: composer is bound to the active scene)
    private _postEnabled: boolean;
    private _bloomOptions: { strength: number; radius: number; threshold: number };
    private _composer?: EffectComposer;
    private _bloomPass?: UnrealBloomPass;
    private _composerScene?: THREE.Scene;

    constructor(game: Game, options?: RendererOptions) {
        this._game = game;
        this._beforeRender = options?.beforeRender;
        this._clock = new THREE.Clock();
        this._fixedTimeStep = options?.fixedTimeStep ?? 1 / 60;
        this._maxSubSteps = options?.maxSubSteps ?? 5;
        this._postEnabled = options?.tron ?? true;
        this._bloomOptions = {
            strength: options?.bloom?.strength ?? 0.9,
            radius: options?.bloom?.radius ?? 0.5,
            threshold: options?.bloom?.threshold ?? 0.85,
        };

        // Camera
        const camOpts: CameraOptions = options?.cameraOptions ?? {};
        const width = options?.width ?? window.innerWidth;
        const height = options?.height ?? window.innerHeight;
        this.threeJSCamera = new THREE.PerspectiveCamera(
            camOpts.fov ?? 50,
            camOpts.aspect ?? width / height,
            camOpts.near ?? 0.01,
            camOpts.far ?? 1000
        );

        // Audio listener
        this._audioListener = new THREE.AudioListener();
        this.threeJSCamera.add(this._audioListener);

        // WebGL renderer
        const rendererParams: THREE.WebGLRendererParameters = {
            antialias: options?.antialias ?? true,
            alpha: options?.alpha,
            powerPreference: options?.powerPreference ?? 'high-performance',
        };
        if (options?.canvas) {
            rendererParams.canvas = options.canvas;
        }

        this.threeJSRenderer = new THREE.WebGLRenderer(rendererParams);
        this.threeJSRenderer.setPixelRatio(Math.min(options?.pixelRatio ?? window.devicePixelRatio, 2));
        this.threeJSRenderer.setSize(width, height);
        this.threeJSRenderer.outputColorSpace = THREE.SRGBColorSpace;
        this.threeJSRenderer.shadowMap.enabled = options?.shadows ?? false;
        this.threeJSRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Default Tron look: filmic tone mapping for neon glow + dark backdrop.
        if (this._postEnabled) {
            this.threeJSRenderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.threeJSRenderer.toneMappingExposure = options?.toneMappingExposure ?? 1.0;
        }

        const defaultClearColor = this._postEnabled ? 0x05060a : undefined;
        const clearColor = options?.clearColor ?? defaultClearColor;
        if (clearColor !== undefined) {
            this.threeJSRenderer.setClearColor(clearColor);
        }

        // Full-screen canvas
        if (options?.setupFullScreenCanvas && !options?.canvas) {
            document.body.style.margin = '0';
            document.body.style.overflow = 'hidden';
            document.body.appendChild(this.threeJSRenderer.domElement);

            this._resizeHandler = () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                this.threeJSCamera.aspect = w / h;
                this.threeJSCamera.updateProjectionMatrix();
                this.threeJSRenderer.setSize(w, h);
                this._composer?.setSize(w, h);
                this._bloomPass?.resolution.set(w, h);
            };
            window.addEventListener('resize', this._resizeHandler);
        }

        // WebGL context loss/restore — without this a lost context (GPU reset, tab
        // backgrounding, driver hiccup) permanently freezes or blanks the canvas.
        const canvas = this.threeJSRenderer.domElement;
        this._contextLostHandler = (event: Event) => {
            event.preventDefault(); // required for 'webglcontextrestored' to fire
            Logger.warn('[Renderer] WebGL context lost — pausing render loop');
            this._wasRunningBeforeContextLoss = this._running;
            this.stop();
        };
        this._contextRestoredHandler = () => {
            Logger.info('[Renderer] WebGL context restored — rebuilding pipeline');
            // GL-resident objects (composer/passes) are invalid; force a rebuild.
            this._composer?.dispose();
            this._composer = undefined;
            this._composerScene = undefined;
            if (this._wasRunningBeforeContextLoss) this.start();
        };
        canvas.addEventListener('webglcontextlost', this._contextLostHandler as EventListener);
        canvas.addEventListener('webglcontextrestored', this._contextRestoredHandler);

        Logger.info('Renderer initialised (no VR/WebXR)');
    }

    getCanvas(): HTMLCanvasElement {
        return this.threeJSRenderer.domElement;
    }

    getCameraAudioListener(): THREE.AudioListener {
        return this._audioListener;
    }

    /** Start the animation loop. */
    start(): void {
        if (this._running) return;
        this._running = true;
        this._clock.start();

        this.threeJSRenderer.setAnimationLoop((time: number) => {
            const deltaTimeInSec = this._clock.getDelta();

            // 1. Input
            this._game.inputManager?.beforeRender();

            // 2. User's beforeRender hook
            if (this._beforeRender) {
                this._beforeRender({ deltaTimeInSec, time });
            }

            // 3. Scene update
            const scene = this._game.scene;
            if (scene && scene.active) {
                // Scene beforeRender (GameObjects)
                scene.beforeRender(deltaTimeInSec);

                // Physics step (fixed timestep)
                if (scene.rapierWorld && !this._game._options?.disablePhysics) {
                    this._stepPhysics(scene, deltaTimeInSec);
                }

                // Sync physics → rendering
                scene.syncPhysics();

                // Render — through the Tron bloom composer when enabled
                if (this._postEnabled) {
                    if (this._composerScene !== scene.threeJSScene) {
                        this._buildComposer(scene.threeJSScene);
                    }
                    this._composer!.render(deltaTimeInSec);
                } else {
                    this.threeJSRenderer.render(scene.threeJSScene, this.threeJSCamera);
                }
            }

            // 4. Reset mouse deltas
            this._game.inputManager?.resetMouseDeltas();
        });
    }

    /** Stop the animation loop. */
    stop(): void {
        this._running = false;
        this.threeJSRenderer.setAnimationLoop(null);
        this._clock.stop();
    }

    dispose(): void {
        this.stop();
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = undefined;
        }
        const canvas = this.threeJSRenderer.domElement;
        if (this._contextLostHandler) {
            canvas.removeEventListener('webglcontextlost', this._contextLostHandler as EventListener);
            this._contextLostHandler = undefined;
        }
        if (this._contextRestoredHandler) {
            canvas.removeEventListener('webglcontextrestored', this._contextRestoredHandler);
            this._contextRestoredHandler = undefined;
        }
        this._composer?.dispose();
        this.threeJSRenderer.dispose();
    }

    /** (Re)build the bloom composer bound to the given scene. */
    private _buildComposer(scene: THREE.Scene): void {
        this._composer?.dispose();

        const size = new THREE.Vector2();
        this.threeJSRenderer.getSize(size);

        const composer = new EffectComposer(this.threeJSRenderer);
        composer.addPass(new RenderPass(scene, this.threeJSCamera));

        const bloomPass = new UnrealBloomPass(
            size,
            this._bloomOptions.strength,
            this._bloomOptions.radius,
            this._bloomOptions.threshold
        );
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());

        this._composer = composer;
        this._bloomPass = bloomPass;
        this._composerScene = scene;
    }

    private _stepPhysics(scene: Scene, deltaTimeInSec: number): void {
        const world = scene.rapierWorld;
        if (!world) return;
        this._accumulator += Math.min(deltaTimeInSec, 0.25);
        let steps = 0;
        while (this._accumulator >= this._fixedTimeStep && steps < this._maxSubSteps) {
            world.step();
            this._accumulator -= this._fixedTimeStep;
            steps++;
        }
        if (steps === this._maxSubSteps) this._accumulator = 0;
    }
}

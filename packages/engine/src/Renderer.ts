/**
 * Renderer — manages the Three.js rendering loop.
 * Uses setAnimationLoop for FPS consistency.
 * No VR/WebXR path exists.
 */
import * as THREE from 'three';
import type { RendererOptions, CameraOptions } from './types';
import Logger from './Logger';

export default class Renderer {
    readonly threeJSRenderer: THREE.WebGLRenderer;
    readonly threeJSCamera: THREE.PerspectiveCamera;
    private _audioListener: THREE.AudioListener;
    private _game: any; // Game — avoid circular import
    private _beforeRender?: (args: { deltaTimeInSec: number; time: number }) => void;
    private _clock: THREE.Clock;
    private _running = false;
    private _resizeHandler?: () => void;
    private _fixedTimeStep: number;
    private _maxSubSteps: number;

    constructor(game: any, options?: RendererOptions) {
        this._game = game;
        this._beforeRender = options?.beforeRender;
        this._clock = new THREE.Clock();
        this._fixedTimeStep = options?.fixedTimeStep ?? 1 / 60;
        this._maxSubSteps = options?.maxSubSteps ?? 5;

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
        if (options?.clearColor !== undefined) {
            this.threeJSRenderer.setClearColor(options.clearColor);
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
            };
            window.addEventListener('resize', this._resizeHandler);
        }

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

                // Render
                this.threeJSRenderer.render(scene.threeJSScene, this.threeJSCamera);
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
        this.threeJSRenderer.dispose();
    }

    private _accumulator = 0;

    private _stepPhysics(scene: any, deltaTimeInSec: number): void {
        this._accumulator += Math.min(deltaTimeInSec, 0.25);
        let steps = 0;
        while (this._accumulator >= this._fixedTimeStep && steps < this._maxSubSteps) {
            scene.rapierWorld.step();
            this._accumulator -= this._fixedTimeStep;
            steps++;
        }
        if (steps === this._maxSubSteps) this._accumulator = 0;
    }
}

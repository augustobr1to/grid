/**
 * CharacterController — abstract base for FPS character controllers.
 */
import * as THREE from 'three';
import InputManager from '../input/InputManager';

export default abstract class CharacterController {
    protected _inputManager: InputManager;
    protected _camera: THREE.Camera;
    protected _speed: number;
    protected _jumpForce: number;
    protected _gravity: number;
    protected _velocity: THREE.Vector3 = new THREE.Vector3();
    protected _grounded = false;

    constructor(options: {
        inputManager: InputManager;
        camera: THREE.Camera;
        speed?: number;
        jumpForce?: number;
        gravity?: number;
    }) {
        this._inputManager = options.inputManager;
        this._camera = options.camera;
        this._speed = options.speed ?? 8;
        this._jumpForce = options.jumpForce ?? 6;
        this._gravity = options.gravity ?? 20;
    }

    get velocity(): THREE.Vector3 {
        return this._velocity;
    }

    get grounded(): boolean {
        return this._grounded;
    }

    abstract update(delta: number): void;
}

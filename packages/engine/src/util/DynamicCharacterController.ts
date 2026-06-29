/**
 * DynamicCharacterController — physics-driven character (dynamic Rapier body).
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import CharacterController from './CharacterController';
import InputManager from '../input/InputManager';

const _moveDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

export default class DynamicCharacterController extends CharacterController {
    private _rigidBody: RAPIER.RigidBody | null = null;
    private _yaw = 0;
    private _pitch = 0;
    private _groundCheckDist = 0.1;

    constructor(options: {
        inputManager: InputManager;
        camera: THREE.Camera;
        rigidBody?: RAPIER.RigidBody;
        speed?: number;
        jumpForce?: number;
        gravity?: number;
    }) {
        super(options);
        this._rigidBody = options.rigidBody ?? null;
    }

    setRigidBody(body: RAPIER.RigidBody): void {
        this._rigidBody = body;
    }

    update(_delta: number): void {
        if (!this._rigidBody) return;

        // Mouse look
        const mouseSensitivity = 0.002;
        this._yaw -= this._inputManager.getMouseDeltaX() * mouseSensitivity;
        this._pitch -= this._inputManager.getMouseDeltaY() * mouseSensitivity;
        this._pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this._pitch));

        // Forward/right from yaw
        _forward.set(Math.sin(this._yaw), 0, Math.cos(this._yaw));
        _right.set(Math.cos(this._yaw), 0, -Math.sin(this._yaw));

        // Input
        const verticalAxis = this._inputManager.readVerticalAxis();
        const horizontalAxis = this._inputManager.readHorizontalAxis();

        _moveDir.set(0, 0, 0);
        _moveDir.addScaledVector(_forward, -verticalAxis);
        _moveDir.addScaledVector(_right, horizontalAxis);
        if (_moveDir.lengthSq() > 0) _moveDir.normalize();

        // Apply force to rigid body
        const force = { x: _moveDir.x * this._speed * 10, y: 0, z: _moveDir.z * this._speed * 10 };
        this._rigidBody.addForce(force, true);

        // Ground check (velocity heuristic for dynamic rest)
        const t = this._rigidBody.translation();
        const v = this._rigidBody.linvel();
        this._grounded = Math.abs(v.y) < 0.01 && t.y <= 1.7 + this._groundCheckDist;

        // Jump
        if (this._inputManager.isKeyDown(' ') && this._grounded) {
            this._rigidBody.applyImpulse({ x: 0, y: this._jumpForce, z: 0 }, true);
            this._grounded = false;
        }

        // Update camera from body position
        const tt = this._rigidBody.translation();
        this._camera.position.set(tt.x, tt.y + 0.85, tt.z);
        this._camera.rotation.order = 'YXZ';
        this._camera.rotation.y = this._yaw;
        this._camera.rotation.x = this._pitch;
    }
}

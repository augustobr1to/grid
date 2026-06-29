/**
 * KinematicCharacterController — FPS character with BVH capsule sweep + Rapier kinematic body.
 * Follows the Player Movement Pipeline from docs/01-architecture.md.
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import CharacterController from './CharacterController';
import InputManager from '../input/InputManager';

// Reusable temp vectors — zero per-frame allocations
const _moveDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

const _capsuleLine = new THREE.Line3();
const _capsuleBox = new THREE.Box3();
const _triPoint = new THREE.Vector3();
const _capPoint = new THREE.Vector3();

export default class KinematicCharacterController extends CharacterController {
    private _rigidBody: RAPIER.RigidBody | null = null;
    private _capsuleHalfHeight: number;
    private _capsuleRadius: number;
    private _yaw = 0;
    private _pitch = 0;
    private _position: THREE.Vector3;
    // BVH mesh for capsule sweep (set externally)
    private _collisionMesh: THREE.Mesh | null = null;

    constructor(options: {
        inputManager: InputManager;
        camera: THREE.Camera;
        rigidBody?: RAPIER.RigidBody;
        capsuleHalfHeight?: number;
        capsuleRadius?: number;
        speed?: number;
        jumpForce?: number;
        gravity?: number;
    }) {
        super(options);
        this._rigidBody = options.rigidBody ?? null;
        this._capsuleHalfHeight = options.capsuleHalfHeight ?? 0.5;
        this._capsuleRadius = options.capsuleRadius ?? 0.35;
        this._position = new THREE.Vector3();
    }

    setCollisionMesh(mesh: THREE.Mesh): void {
        this._collisionMesh = mesh;
    }

    setRigidBody(body: RAPIER.RigidBody): void {
        this._rigidBody = body;
    }

    get position(): THREE.Vector3 {
        return this._position;
    }

    get yaw(): number { return this._yaw; }
    get pitch(): number { return this._pitch; }

    /**
     * Per-frame update following the Player Movement Pipeline:
     * 1. Read input → desired velocity
     * 2. BVH capsule sweep → resolve penetrations
     * 3. Ground detection
     * 4. Set Rapier kinematic body
     * 5. THREE.Group sync happens automatically via engine loop
     */
    update(delta: number): void {
        // Ground state from the previous frame drives this frame's jump/gravity.
        // It is recomputed fresh by the BVH sweep below (1-frame latency — the
        // standard kinematic pattern: detection can only run after displacement).
        const wasGrounded = this._grounded;
        // Mouse look
        const mouseSensitivity = 0.002;
        this._yaw -= this._inputManager.getMouseDeltaX() * mouseSensitivity;
        this._pitch -= this._inputManager.getMouseDeltaY() * mouseSensitivity;
        this._pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this._pitch));

        // Compute forward/right from yaw
        _forward.set(Math.sin(this._yaw), 0, Math.cos(this._yaw));
        _right.set(Math.cos(this._yaw), 0, -Math.sin(this._yaw));

        // Read input
        const verticalAxis = this._inputManager.readVerticalAxis();
        const horizontalAxis = this._inputManager.readHorizontalAxis();

        // Compute desired horizontal movement
        _moveDir.set(0, 0, 0);
        _moveDir.addScaledVector(_forward, -verticalAxis);
        _moveDir.addScaledVector(_right, horizontalAxis);
        if (_moveDir.lengthSq() > 0) _moveDir.normalize();

        // Apply speed
        const hVelX = _moveDir.x * this._speed;
        const hVelZ = _moveDir.z * this._speed;

        // Gravity
        if (!wasGrounded) {
            this._velocity.y -= this._gravity * delta;
        }

        // Jump
        if (this._inputManager.isKeyDown(' ') && wasGrounded) {
            this._velocity.y = this._jumpForce;
        }

        // Compute displacement
        const dx = hVelX * delta;
        const dy = this._velocity.y * delta;
        const dz = hVelZ * delta;

        this._position.x += dx;
        this._position.y += dy;
        this._position.z += dz;

        // Recompute ground state fresh: the BVH sweep below and the y<0 world
        // floor are the only authorities that set _grounded true this frame.
        this._grounded = false;

        // BVH capsule sweep (if collision mesh with BVH is available)
        if (this._collisionMesh && (this._collisionMesh.geometry as any).boundsTree) {
            const boundsTree = (this._collisionMesh.geometry as any).boundsTree;
            const radius = this._capsuleRadius;

            _capsuleLine.start.set(
                this._position.x,
                this._position.y + radius,
                this._position.z
            );
            _capsuleLine.end.set(
                this._position.x,
                this._position.y + this._capsuleHalfHeight * 2 + radius,
                this._position.z
            );

            _capsuleBox.setFromPoints([_capsuleLine.start, _capsuleLine.end]);
            _capsuleBox.expandByScalar(radius);

            // Intersect
            boundsTree.shapecast({
                intersectsBounds: (box: THREE.Box3) => box.intersectsBox(_capsuleBox),
                intersectsTriangle: (tri: any) => {
                    const dist = tri.closestPointToSegment(_capsuleLine, _triPoint, _capPoint);
                    if (dist < radius) {
                        const depth = radius - dist;
                        const normal = _capPoint.clone().sub(_triPoint);
                        if (normal.lengthSq() < 0.00001) {
                            normal.set(0, 1, 0);
                        } else {
                            normal.normalize();
                        }

                        this._position.addScaledVector(normal, depth);

                        // Push memory capsule so future triangles in this identical frame shapecast react accurately
                        _capsuleLine.start.addScaledVector(normal, depth);
                        _capsuleLine.end.addScaledVector(normal, depth);
                        _capsuleBox.translate(normal.clone().multiplyScalar(depth));

                        // Ground detection
                        if (normal.y > 0.5) {
                            this._grounded = true;
                            this._velocity.y = Math.max(0, this._velocity.y);
                        }
                    }
                },
            });
        }

        // Clamp to world bounds
        if (this._position.y < 0) {
            this._position.y = 0;
            this._grounded = true;
            this._velocity.y = 0;
        }

        // Update Rapier kinematic body
        if (this._rigidBody) {
            this._rigidBody.setNextKinematicTranslation({
                x: this._position.x,
                y: this._position.y,
                z: this._position.z,
            });
        }

        // Update camera
        this._camera.position.set(
            this._position.x,
            this._position.y + this._capsuleHalfHeight * 2 + this._capsuleRadius,
            this._position.z
        );
        this._camera.rotation.order = 'YXZ';
        this._camera.rotation.y = this._yaw;
        this._camera.rotation.x = this._pitch;
    }
}

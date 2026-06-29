/**
 * RigidBodyComponent — creates a Rapier RigidBody + colliders for a GameObject.
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import Component from '../Component';
import type { RigidBodyComponentJSON } from '../types';
import { createRigidBodyDesc, createColliderDesc } from '../physics/PhysicsHelpers';

// Reusable scratch objects — the physics body lives in WORLD space, the THREE
// group's transform is LOCAL (relative to its parent). For nested GameObjects the
// two differ, so we convert between them instead of copying local<->world directly.
const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _parentQuat = new THREE.Quaternion();

export default class RigidBodyComponent extends Component {
    private _rigidBody: RAPIER.RigidBody | null = null;
    private _colliders: RAPIER.Collider[] = [];

    get rigidBody(): RAPIER.RigidBody | null {
        return this._rigidBody;
    }

    async load(): Promise<void> {
        const data = this.jsonData as RigidBodyComponentJSON;
        const scene = this.gameObject.getScene();
        const world = scene.rapierWorld;

        if (!world) return;

        // Create rigid body
        const rbDesc = createRigidBodyDesc(data.rigidBodyType);

        // Seed the body from the group's WORLD transform (not local) so a rigid body
        // on a nested GameObject spawns at the right place. updateWorldMatrix ensures
        // the world transform reflects the current parent chain.
        const group = this.gameObject.threeJSGroup;
        group.updateWorldMatrix(true, false);
        group.getWorldPosition(_worldPos);
        group.getWorldQuaternion(_worldQuat);
        rbDesc.setTranslation(_worldPos.x, _worldPos.y, _worldPos.z);
        rbDesc.setRotation({ x: _worldQuat.x, y: _worldQuat.y, z: _worldQuat.z, w: _worldQuat.w });

        const rigidBody = world.createRigidBody(rbDesc);
        this._rigidBody = rigidBody;

        // Apply enabled translations/rotations
        if (data.enabledTranslations) {
            rigidBody.setEnabledTranslations(
                data.enabledTranslations.x,
                data.enabledTranslations.y,
                data.enabledTranslations.z,
                true
            );
        }
        if (data.enabledRotations) {
            rigidBody.setEnabledRotations(
                data.enabledRotations.x,
                data.enabledRotations.y,
                data.enabledRotations.z,
                true
            );
        }

        // Create colliders
        if (data.colliders) {
            for (const colData of data.colliders) {
                const colDesc = createColliderDesc(colData);
                const collider = world.createCollider(colDesc, this._rigidBody);
                this._colliders.push(collider);
            }
        }
    }

    /**
     * Sync Rapier body → THREE.Group (called after physics step).
     */
    syncToThreeJS(): void {
        if (!this._rigidBody) return;

        const t = this._rigidBody.translation(); // world-space
        const r = this._rigidBody.rotation();     // world-space
        const group = this.gameObject.threeJSGroup;
        const parent = group.parent;

        if (parent) {
            // Convert the body's WORLD transform back into the group's LOCAL space so
            // nested objects render correctly (parent may be translated/rotated/scaled).
            parent.updateWorldMatrix(true, false);
            _worldPos.set(t.x, t.y, t.z);
            parent.worldToLocal(_worldPos);
            group.position.copy(_worldPos);

            parent.getWorldQuaternion(_parentQuat);
            _worldQuat.set(r.x, r.y, r.z, r.w);
            group.quaternion.copy(_parentQuat.invert().multiply(_worldQuat));
        } else {
            group.position.set(t.x, t.y, t.z);
            group.quaternion.set(r.x, r.y, r.z, r.w);
        }
    }

    unload(): void {
        const scene = this.gameObject.getScene();
        const world = scene?.rapierWorld;
        if (world && this._rigidBody) {
            world.removeRigidBody(this._rigidBody);
        }
        this._rigidBody = null;
        this._colliders = [];
    }
}

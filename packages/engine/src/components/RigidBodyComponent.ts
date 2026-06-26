/**
 * RigidBodyComponent — creates a Rapier RigidBody + colliders for a GameObject.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import Component from '../Component';
import type { RigidBodyComponentJSON } from '../types';
import { createRigidBodyDesc, createColliderDesc } from '../physics/PhysicsHelpers';

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

        // Set initial position from THREE.Group
        const pos = this.gameObject.threeJSGroup.position;
        rbDesc.setTranslation(pos.x, pos.y, pos.z);

        // Set initial rotation from THREE.Group
        const quat = this.gameObject.threeJSGroup.quaternion;
        rbDesc.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });

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

        const t = this._rigidBody.translation();
        const r = this._rigidBody.rotation();

        this.gameObject.threeJSGroup.position.set(t.x, t.y, t.z);
        this.gameObject.threeJSGroup.quaternion.set(r.x, r.y, r.z, r.w);
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

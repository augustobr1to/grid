/**
 * PhysicsHelpers — utility functions for Rapier physics setup.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import type { ColliderData } from '../types';

/**
 * Create a Rapier collider description from a ColliderData JSON.
 */
export function createColliderDesc(data: ColliderData): RAPIER.ColliderDesc {
    let desc: RAPIER.ColliderDesc;

    switch (data.type) {
        case 'ball':
            desc = RAPIER.ColliderDesc.ball(data.radius ?? 0.5);
            break;
        case 'capsule':
            desc = RAPIER.ColliderDesc.capsule(data.halfHeight ?? 0.5, data.radius ?? 0.35);
            break;
        case 'cuboid':
            desc = RAPIER.ColliderDesc.cuboid(data.hx ?? 0.5, data.hy ?? 0.5, data.hz ?? 0.5);
            break;
        case 'cylinder':
            desc = RAPIER.ColliderDesc.cylinder(data.halfHeight ?? 0.5, data.radius ?? 0.5);
            break;
        case 'cone':
            desc = RAPIER.ColliderDesc.cone(data.halfHeight ?? 0.5, data.radius ?? 0.5);
            break;
        case 'trimesh':
            if (!data.vertices || !data.indices) {
                throw new Error('[PhysicsHelpers] trimesh collider requires vertices and indices');
            }
            desc = RAPIER.ColliderDesc.trimesh(data.vertices, data.indices);
            break;
        case 'convexHull':
            if (!data.vertices) {
                throw new Error('[PhysicsHelpers] convexHull collider requires vertices');
            }
            desc = RAPIER.ColliderDesc.convexHull(data.vertices)!;
            break;
        case 'roundCuboid':
            desc = RAPIER.ColliderDesc.roundCuboid(
                data.hx ?? 0.5, data.hy ?? 0.5, data.hz ?? 0.5, data.borderRadius ?? 0.05
            );
            break;
        case 'roundCylinder':
            desc = RAPIER.ColliderDesc.roundCylinder(
                data.halfHeight ?? 0.5, data.radius ?? 0.5, data.borderRadius ?? 0.05
            );
            break;
        case 'roundCone':
            desc = RAPIER.ColliderDesc.roundCone(
                data.halfHeight ?? 0.5, data.radius ?? 0.5, data.borderRadius ?? 0.05
            );
            break;
        case 'roundConvexHull':
            if (!data.vertices) {
                throw new Error('[PhysicsHelpers] roundConvexHull collider requires vertices');
            }
            desc = RAPIER.ColliderDesc.roundConvexHull(data.vertices, data.borderRadius ?? 0.05)!;
            break;
        default:
            throw new Error(`[PhysicsHelpers] Unknown collider type: ${data.type}`);
    }

    if (data.density !== undefined) desc.setDensity(data.density);
    if (data.friction !== undefined) desc.setFriction(data.friction);
    if (data.restitution !== undefined) desc.setRestitution(data.restitution);
    if (data.sensor) desc.setSensor(true);

    return desc;
}

/**
 * Create a Rapier rigid body description from a type string.
 */
export function createRigidBodyDesc(
    type: string
): RAPIER.RigidBodyDesc {
    switch (type) {
        case 'dynamic':
            return RAPIER.RigidBodyDesc.dynamic();
        case 'fixed':
            return RAPIER.RigidBodyDesc.fixed();
        case 'kinematicPositionBased':
            return RAPIER.RigidBodyDesc.kinematicPositionBased();
        case 'kinematicVelocityBased':
            return RAPIER.RigidBodyDesc.kinematicVelocityBased();
        default:
            throw new Error(`[PhysicsHelpers] Unknown rigid body type: ${type}`);
    }
}

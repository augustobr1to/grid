/**
 * Snapshot — server-side snapshot building from Rapier state.
 */
import type { WorldSnapshot, EntityState } from '@thegridcn/shared';

let _tick = 0;

export function buildWorldSnapshot(entities: Map<string, any>): WorldSnapshot {
    _tick++;
    const entityStates: EntityState[] = [];

    for (const [id, entity] of entities) {
        if (entity.rigidBody) {
            const t = entity.rigidBody.translation();
            const r = entity.rigidBody.rotation();
            const v = entity.rigidBody.linvel();
            entityStates.push({
                id,
                position: [t.x, t.y, t.z],
                quaternion: [r.x, r.y, r.z, r.w],
                velocity: [v.x, v.y, v.z],
            });
        }
    }

    return {
        tick: _tick,
        timestamp: Date.now(),
        entities: entityStates,
    };
}

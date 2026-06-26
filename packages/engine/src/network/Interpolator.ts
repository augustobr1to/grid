/**
 * Interpolator — buffers WorldSnapshots and returns interpolated EntityState.
 * Used for smooth remote entity rendering.
 */
import type { WorldSnapshot, EntityState } from '@thegridcn/shared';

interface InterpolatorOptions {
    bufferSizeMs?: number;
}

export default class Interpolator {
    private _buffer: WorldSnapshot[] = [];
    private _bufferSizeMs: number;

    constructor(options?: InterpolatorOptions) {
        this._bufferSizeMs = options?.bufferSizeMs ?? 100;
    }

    pushSnapshot(snapshot: WorldSnapshot): void {
        this._buffer.push(snapshot);
        // Keep last N snapshots
        if (this._buffer.length > 10) {
            this._buffer.shift();
        }
    }

    /**
     * Returns interpolated EntityState at (now - bufferSizeMs).
     */
    getInterpolatedState(entityId: string): EntityState | null {
        if (this._buffer.length < 2) return null;

        const renderTimestamp = Date.now() - this._bufferSizeMs;

        // Find two snapshots bracketing renderTimestamp
        let before: WorldSnapshot | null = null;
        let after: WorldSnapshot | null = null;

        for (let i = 0; i < this._buffer.length - 1; i++) {
            if (
                this._buffer[i].timestamp <= renderTimestamp &&
                this._buffer[i + 1].timestamp >= renderTimestamp
            ) {
                before = this._buffer[i];
                after = this._buffer[i + 1];
                break;
            }
        }

        if (!before || !after) {
            // Use latest snapshot
            const latest = this._buffer[this._buffer.length - 1];
            const entity = latest.entities.find((e) => e.id === entityId);
            return entity ?? null;
        }

        const beforeEntity = before.entities.find((e) => e.id === entityId);
        const afterEntity = after.entities.find((e) => e.id === entityId);

        if (!beforeEntity || !afterEntity) return null;

        // Interpolation factor
        const range = after.timestamp - before.timestamp;
        const t = range > 0 ? (renderTimestamp - before.timestamp) / range : 0;

        // Linear interpolate position
        const position: [number, number, number] = [
            beforeEntity.position[0] + (afterEntity.position[0] - beforeEntity.position[0]) * t,
            beforeEntity.position[1] + (afterEntity.position[1] - beforeEntity.position[1]) * t,
            beforeEntity.position[2] + (afterEntity.position[2] - beforeEntity.position[2]) * t,
        ];

        // Slerp quaternion
        const quaternion = this._slerpQuat(beforeEntity.quaternion, afterEntity.quaternion, t);

        // Linear interpolate velocity
        const velocity: [number, number, number] = [
            beforeEntity.velocity[0] + (afterEntity.velocity[0] - beforeEntity.velocity[0]) * t,
            beforeEntity.velocity[1] + (afterEntity.velocity[1] - beforeEntity.velocity[1]) * t,
            beforeEntity.velocity[2] + (afterEntity.velocity[2] - beforeEntity.velocity[2]) * t,
        ];

        return { id: entityId, position, quaternion, velocity };
    }

    private _slerpQuat(
        a: [number, number, number, number],
        b: [number, number, number, number],
        t: number
    ): [number, number, number, number] {
        let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        const bNeg: [number, number, number, number] = dot < 0 ? [-b[0], -b[1], -b[2], -b[3]] : [...b];
        if (dot < 0) dot = -dot;

        if (dot > 0.9995) {
            // Very close — linear interpolate
            return [
                a[0] + (bNeg[0] - a[0]) * t,
                a[1] + (bNeg[1] - a[1]) * t,
                a[2] + (bNeg[2] - a[2]) * t,
                a[3] + (bNeg[3] - a[3]) * t,
            ];
        }

        const theta0 = Math.acos(dot);
        const theta = theta0 * t;
        const sinTheta = Math.sin(theta);
        const sinTheta0 = Math.sin(theta0);

        const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
        const s1 = sinTheta / sinTheta0;

        return [
            a[0] * s0 + bNeg[0] * s1,
            a[1] * s0 + bNeg[1] * s1,
            a[2] * s0 + bNeg[2] * s1,
            a[3] * s0 + bNeg[3] * s1,
        ];
    }

    clear(): void {
        this._buffer = [];
    }
}

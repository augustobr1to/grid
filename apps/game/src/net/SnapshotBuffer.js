/**
 * SnapshotBuffer.js — ring buffer for 100ms interpolation.
 */
export default class SnapshotBuffer {
    constructor(bufferSizeMs = 100) {
        this._buffer = [];
        this._bufferSizeMs = bufferSizeMs;
    }

    push(snapshot) {
        this._buffer.push(snapshot);
        if (this._buffer.length > 10) {
            this._buffer.shift();
        }
    }

    getInterpolated(entityId) {
        if (this._buffer.length < 2) return null;

        const renderTime = Date.now() - this._bufferSizeMs;
        let before = null, after = null;

        for (let i = 0; i < this._buffer.length - 1; i++) {
            if (this._buffer[i].timestamp <= renderTime && this._buffer[i + 1].timestamp >= renderTime) {
                before = this._buffer[i];
                after = this._buffer[i + 1];
                break;
            }
        }

        if (!before || !after) {
            const latest = this._buffer[this._buffer.length - 1];
            return latest.entities?.find(e => e.id === entityId) || null;
        }

        const bEntity = before.entities?.find(e => e.id === entityId);
        const aEntity = after.entities?.find(e => e.id === entityId);
        if (!bEntity || !aEntity) return null;

        const range = after.timestamp - before.timestamp;
        const t = range > 0 ? (renderTime - before.timestamp) / range : 0;

        return {
            id: entityId,
            position: [
                bEntity.position[0] + (aEntity.position[0] - bEntity.position[0]) * t,
                bEntity.position[1] + (aEntity.position[1] - bEntity.position[1]) * t,
                bEntity.position[2] + (aEntity.position[2] - bEntity.position[2]) * t,
            ],
            yaw: bEntity.yaw != null ? bEntity.yaw + (aEntity.yaw - bEntity.yaw) * t : 0,
        };
    }

    clear() {
        this._buffer = [];
    }
}

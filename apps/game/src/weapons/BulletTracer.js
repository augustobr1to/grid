/**
 * BulletTracer.js — pooled tracer geometry (128 line segments).
 * Zero per-frame allocations — all pre-allocated at match start.
 */
import * as THREE from 'three';

const POOL_SIZE = 128;
const TRACER_DURATION_MS = 80;

// Pre-allocated reusable vectors for setting tracer positions
const _start = new THREE.Vector3();
const _end = new THREE.Vector3();

export default class BulletTracerPool {
    constructor(scene) {
        this._pool = [];
        this._scene = scene;
        this._activeTimers = new Map();

        // Pre-allocate all tracers
        for (let i = 0; i < POOL_SIZE; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6); // 2 points × 3 components
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
            const line = new THREE.Line(geometry, material);
            line.visible = false;
            line.frustumCulled = false;

            scene.add(line);
            this._pool.push({ line, geometry, material, index: i });
        }

        this._nextIndex = 0;
    }

    /**
     * Spawn a tracer from origin in direction, max distance.
     * @param {THREE.Vector3} origin
     * @param {THREE.Vector3} direction
     * @param {number} distance
     * @param {number} color  Hex color for the tracer
     */
    fire(origin, direction, distance, color) {
        const entry = this._pool[this._nextIndex];
        this._nextIndex = (this._nextIndex + 1) % POOL_SIZE;

        // Clear any existing timer for this entry
        const existingTimer = this._activeTimers.get(entry.index);
        if (existingTimer) clearTimeout(existingTimer);

        // Set positions
        _start.copy(origin);
        _end.copy(origin).addScaledVector(direction, distance);

        const posAttr = entry.geometry.getAttribute('position');
        posAttr.array[0] = _start.x;
        posAttr.array[1] = _start.y;
        posAttr.array[2] = _start.z;
        posAttr.array[3] = _end.x;
        posAttr.array[4] = _end.y;
        posAttr.array[5] = _end.z;
        posAttr.needsUpdate = true;

        // Set color
        entry.material.color.setHex(color);

        // Show
        entry.line.visible = true;

        // Hide after duration
        const timer = setTimeout(() => {
            entry.line.visible = false;
            this._activeTimers.delete(entry.index);
        }, TRACER_DURATION_MS);

        this._activeTimers.set(entry.index, timer);
    }

    dispose() {
        for (const entry of this._pool) {
            this._scene.remove(entry.line);
            entry.geometry.dispose();
            entry.material.dispose();
        }
        for (const timer of this._activeTimers.values()) {
            clearTimeout(timer);
        }
        this._activeTimers.clear();
        this._pool = [];
    }
}

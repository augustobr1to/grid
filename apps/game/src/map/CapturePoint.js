/**
 * CapturePoint.js — 3D cylinder volume + ring indicator mesh.
 */
import * as THREE from 'three';

const CAPTURE_RADIUS = 8;
const CAPTURE_HEIGHT = 4;
const BASE_RADIUS = 16;

const COLORS = {
    neutral: 0xffffff,
    blue: 0x4488ff,
    red: 0xff4444,
    blueCapturing: 0x88bbff,
    redCapturing: 0xff8888,
    contested: 0xffff00,
};

export default class CapturePoint {
    constructor(position, index, isBase, team) {
        this.position = position;
        this.index = index;
        this.isBase = isBase;
        this.ownerTeam = team;
        this.progress = isBase ? 100 : 0;
        this.capturingTeam = null;
        this.contested = false;
        this.active = false;

        const radius = isBase ? BASE_RADIUS : CAPTURE_RADIUS;

        // Ring indicator mesh
        const ringGeo = new THREE.RingGeometry(radius - 0.5, radius, 64);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: team ? COLORS[team] : COLORS.neutral,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
        });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.ring.position.set(position.x, 0.05, position.z);
        this.ring.name = `captureRing_${index}`;

        // Label
        this._pulsePhase = 0;
    }

    getGroup() {
        return this.ring;
    }

    updateVisual(state) {
        this.ownerTeam = state.ownerTeam;
        this.progress = state.progress;
        this.capturingTeam = state.capturingTeam;
        this.contested = state.contested;
        this.active = state.active;

        let color;
        if (this.contested) {
            color = COLORS.contested;
        } else if (this.capturingTeam === 'blue') {
            color = COLORS.blueCapturing;
        } else if (this.capturingTeam === 'red') {
            color = COLORS.redCapturing;
        } else if (this.ownerTeam === 'blue') {
            color = COLORS.blue;
        } else if (this.ownerTeam === 'red') {
            color = COLORS.red;
        } else {
            color = COLORS.neutral;
        }

        this.ring.material.color.setHex(color);

        // Pulse effect for active points
        if (this.active) {
            this._pulsePhase += 0.05;
            const scale = 1 + Math.sin(this._pulsePhase) * 0.05;
            this.ring.scale.set(scale, 1, scale);
        } else {
            this.ring.scale.set(1, 1, 1);
        }
    }

    /**
     * Check if a position is inside the capture zone.
     */
    isInRange(px, py, pz) {
        const radius = this.isBase ? BASE_RADIUS : CAPTURE_RADIUS;
        const dx = px - this.position.x;
        const dz = pz - this.position.z;
        const distSq = dx * dx + dz * dz;
        const yDiff = Math.abs(py - this.position.y);
        return distSq <= radius * radius && yDiff <= CAPTURE_HEIGHT / 2;
    }
}

/**
 * SpawnNode.js — precomputed spawn position registry.
 */
export default class SpawnNode {
    constructor(spawnNodes) {
        this._nodes = spawnNodes; // { blue: [{x,y,z}], red: [{x,y,z}] }
    }

    getSpawnPosition(team) {
        const nodes = this._nodes[team] || [];
        if (nodes.length === 0) return { x: 0, y: 1.7, z: 0 };
        const idx = Math.floor(Math.random() * nodes.length);
        return { ...nodes[idx] };
    }
}

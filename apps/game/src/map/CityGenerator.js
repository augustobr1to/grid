/**
 * CityGenerator.js — procedural neon grid city from a numeric seed.
 * Uses deterministic PRNG (mulberry32) and InstancedMesh for 1 draw call.
 */
import * as THREE from 'three';

// ─── Deterministic PRNG ─────────────────────────────────────────────────────
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = seed + 0x6d2b79f5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const CITY_CONFIG = {
    gridW: 24,
    gridH: 24,
    blockSize: 20,
    streetWidth: 6,
    minBuildHeight: 4,
    maxBuildHeight: 40,
    neonColors: [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88],
};

export default class CityGenerator {
    constructor(seed) {
        this._seed = seed;
        this._rng = mulberry32(seed);
        this._config = { ...CITY_CONFIG };
        this._buildingData = [];
        this._roadData = [];
        this._capturePositions = [];
        this._spawnNodes = { blue: [], red: [] };
    }

    /**
     * Generate the city and return a THREE.Group.
     * @returns {{ group: THREE.Group, collisionMesh: THREE.Mesh, capturePositions: Array, spawnNodes: object }}
     */
    generate() {
        const { gridW, gridH, blockSize, streetWidth, minBuildHeight, maxBuildHeight, neonColors } = this._config;
        const rng = this._rng;
        const group = new THREE.Group();
        group.name = 'city';

        const cellSize = blockSize + streetWidth;
        const totalW = gridW * cellSize;
        const totalH = gridH * cellSize;

        // ── Classify cells ────────────────────────────────────────────────────
        const grid = [];
        for (let z = 0; z < gridH; z++) {
            grid[z] = [];
            for (let x = 0; x < gridW; x++) {
                // Streets at regular intervals (every 4 cells)
                const isStreetX = x % 4 === 0;
                const isStreetZ = z % 4 === 0;
                grid[z][x] = (isStreetX || isStreetZ) ? 'ROAD' : 'BUILDING';
            }
        }

        // ── Carve extra alleys for multiple approach routes ────────────────────
        for (let i = 0; i < gridH; i++) {
            const ax = Math.floor(rng() * gridW);
            grid[i][ax] = 'ROAD';
        }
        for (let i = 0; i < gridW; i++) {
            const az = Math.floor(rng() * gridH);
            grid[az][i] = 'ROAD';
        }

        // ── Count buildings for InstancedMesh ──────────────────────────────────
        let buildingCount = 0;
        let trimCount = 0;
        const buildings = [];

        for (let z = 0; z < gridH; z++) {
            for (let x = 0; x < gridW; x++) {
                if (grid[z][x] === 'BUILDING') {
                    const height = minBuildHeight + rng() * (maxBuildHeight - minBuildHeight);
                    const cx = x * cellSize + blockSize / 2 - totalW / 2;
                    const cz = z * cellSize + blockSize / 2 - totalH / 2;
                    buildings.push({ x: cx, z: cz, height, width: blockSize, depth: blockSize, idx: buildingCount });
                    buildingCount++;
                    trimCount += 4; // 4 neon edges per building
                }
            }
        }

        // ── Building InstancedMesh (1 draw call) ──────────────────────────────
        const buildGeo = new THREE.BoxGeometry(1, 1, 1);
        const buildMat = new THREE.MeshBasicMaterial({ color: 0x0a0a2e });
        const buildInstMesh = new THREE.InstancedMesh(buildGeo, buildMat, buildingCount);
        buildInstMesh.name = 'buildings';

        const _matrix = new THREE.Matrix4();
        for (const b of buildings) {
            _matrix.makeScale(b.width, b.height, b.depth);
            _matrix.setPosition(b.x, b.height / 2, b.z);
            buildInstMesh.setMatrixAt(b.idx, _matrix);
        }
        buildInstMesh.instanceMatrix.needsUpdate = true;
        group.add(buildInstMesh);

        // ── Neon trim InstancedMesh (1 draw call) ─────────────────────────────
        const trimGeo = new THREE.BoxGeometry(1, 0.15, 0.15);
        const trimMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const trimInstMesh = new THREE.InstancedMesh(trimGeo, trimMat, trimCount);
        trimInstMesh.name = 'neonTrims';

        let trimIdx = 0;
        const _color = new THREE.Color();
        for (let i = 0; i < buildings.length; i++) {
            const b = buildings[i];
            const color = neonColors[i % neonColors.length];
            _color.setHex(color);

            // 4 edges at the top of each building
            const topY = b.height;
            const hw = b.width / 2;
            const hd = b.depth / 2;

            // Front
            _matrix.makeScale(b.width, 1, 1);
            _matrix.setPosition(b.x, topY, b.z - hd);
            trimInstMesh.setMatrixAt(trimIdx, _matrix);
            trimInstMesh.setColorAt(trimIdx, _color);
            trimIdx++;

            // Back
            _matrix.setPosition(b.x, topY, b.z + hd);
            trimInstMesh.setMatrixAt(trimIdx, _matrix);
            trimInstMesh.setColorAt(trimIdx, _color);
            trimIdx++;

            // Left
            _matrix.makeScale(1, 1, b.depth);
            _matrix.setPosition(b.x - hw, topY, b.z);
            trimInstMesh.setMatrixAt(trimIdx, _matrix);
            trimInstMesh.setColorAt(trimIdx, _color);
            trimIdx++;

            // Right
            _matrix.setPosition(b.x + hw, topY, b.z);
            trimInstMesh.setMatrixAt(trimIdx, _matrix);
            trimInstMesh.setColorAt(trimIdx, _color);
            trimIdx++;
        }
        trimInstMesh.instanceMatrix.needsUpdate = true;
        if (trimInstMesh.instanceColor) trimInstMesh.instanceColor.needsUpdate = true;
        group.add(trimInstMesh);

        // ── Ground plane (roads) ──────────────────────────────────────────────
        const groundGeo = new THREE.PlaneGeometry(totalW, totalH);
        groundGeo.rotateX(-Math.PI / 2);
        const groundMat = new THREE.MeshBasicMaterial({ color: 0x111122 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.name = 'ground';
        group.add(ground);

        // ── Collision mesh (merged geometry for BVH) ──────────────────────────
        const mergedGeometries = [];

        // Ground as collision
        mergedGeometries.push(groundGeo.clone());

        // Buildings as collision boxes
        for (const b of buildings) {
            const boxGeo = new THREE.BoxGeometry(b.width, b.height, b.depth);
            boxGeo.translate(b.x, b.height / 2, b.z);
            mergedGeometries.push(boxGeo);
        }

        // Merge using BufferGeometryUtils-style manual merge
        const collisionGeo = this._mergeGeometries(mergedGeometries);
        const collisionMat = new THREE.MeshBasicMaterial({ visible: false });
        const collisionMesh = new THREE.Mesh(collisionGeo, collisionMat);
        collisionMesh.name = 'collisionMesh';
        group.add(collisionMesh);

        // ── Capture point positions (12 total: 2 bases + 10 objectives) ───────
        this._placeCapturePoints(totalW, totalH);

        // ── Spawn nodes ───────────────────────────────────────────────────────
        this._computeSpawnNodes(totalW, totalH);

        // Dispose individual geoms used for merging
        for (const g of mergedGeometries) g.dispose();

        return {
            group,
            collisionMesh,
            capturePositions: this._capturePositions,
            spawnNodes: this._spawnNodes,
        };
    }

    _placeCapturePoints(totalW, totalH) {
        const rng = this._rng;
        const halfH = totalH / 2;
        const positions = [];

        // Base B0 (Blue) — near negative Z edge
        positions.push({ x: 0, y: 0, z: -halfH + 30, isBase: true, team: 'blue', index: 0 });

        // 10 capturable objectives spread across the map
        for (let i = 1; i <= 10; i++) {
            const t = i / 11;
            const z = -halfH + 30 + t * (totalH - 60);
            const x = (rng() - 0.5) * (totalW * 0.6);
            positions.push({ x, y: 0, z, isBase: false, team: null, index: i });
        }

        // Base R0 (Red) — near positive Z edge
        positions.push({ x: 0, y: 0, z: halfH - 30, isBase: true, team: 'red', index: 11 });

        this._capturePositions = positions;
    }

    _computeSpawnNodes(totalW, totalH) {
        const halfH = totalH / 2;

        // Blue base spawn cluster (dense grid inside base zone)
        for (let i = 0; i < 8; i++) {
            const x = (this._rng() - 0.5) * 20;
            const z = -halfH + 25 + this._rng() * 10;
            this._spawnNodes.blue.push({ x, y: 1.7, z });
        }

        // Red base spawn cluster
        for (let i = 0; i < 8; i++) {
            const x = (this._rng() - 0.5) * 20;
            const z = halfH - 25 - this._rng() * 10;
            this._spawnNodes.red.push({ x, y: 1.7, z });
        }
    }

    _mergeGeometries(geometries) {
        let totalVerts = 0;
        let totalIndices = 0;

        for (const g of geometries) {
            totalVerts += g.attributes.position.count;
            if (g.index) totalIndices += g.index.count;
            else totalIndices += g.attributes.position.count;
        }

        const positions = new Float32Array(totalVerts * 3);
        const indices = new Uint32Array(totalIndices);
        let vertOffset = 0;
        let idxOffset = 0;
        let baseVertex = 0;

        for (const g of geometries) {
            const pos = g.attributes.position;
            for (let i = 0; i < pos.count * 3; i++) {
                positions[vertOffset + i] = pos.array[i];
            }

            if (g.index) {
                for (let i = 0; i < g.index.count; i++) {
                    indices[idxOffset + i] = g.index.array[i] + baseVertex;
                }
                idxOffset += g.index.count;
            } else {
                for (let i = 0; i < pos.count; i++) {
                    indices[idxOffset + i] = baseVertex + i;
                }
                idxOffset += pos.count;
            }

            vertOffset += pos.count * 3;
            baseVertex += pos.count;
        }

        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setIndex(new THREE.BufferAttribute(indices, 1));
        return merged;
    }
}

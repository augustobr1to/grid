/**
 * GLTFAsset — loads a GLTF/GLB model via GLTFLoader.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Asset from './Asset';
import { resolveAssetURL, loadViaThreeLoader } from './assetURL';

/** Dispose every THREE.Texture map referenced by a material (e.g. map, normalMap, roughnessMap). */
function disposeMaterialTextures(material: THREE.Material): void {
    for (const value of Object.values(material as unknown as Record<string, unknown>)) {
        if (value instanceof THREE.Texture) {
            value.dispose();
        }
    }
}

export default class GLTFAsset extends Asset {
    private _gltf: GLTF | null = null;

    get gltf(): GLTF | null {
        return this._gltf;
    }

    async load(baseURLorHandle: string | FileSystemDirectoryHandle): Promise<void> {
        const { url, objUrl } = await resolveAssetURL(baseURLorHandle, this.path);
        try {
            const gltf = await loadViaThreeLoader(new GLTFLoader(), url);
            this._gltf = gltf;
            this._data = gltf.scene;
            this._loaded = true;
        } finally {
            if (objUrl) URL.revokeObjectURL(objUrl);
        }
    }

    dispose(): void {
        if (this._gltf) {
            this._gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    for (const material of materials) {
                        if (!material) continue;
                        disposeMaterialTextures(material);
                        material.dispose();
                    }
                }
            });
        }
        this._gltf = null;
        super.dispose();
    }
}

/**
 * TextureAsset — loads PNG/JPG/BMP textures via THREE.TextureLoader.
 */
import * as THREE from 'three';
import Asset from './Asset';
import { resolveAssetURL, loadViaThreeLoader } from './assetURL';

export default class TextureAsset extends Asset {
    private _texture: THREE.Texture | null = null;

    get texture(): THREE.Texture | null {
        return this._texture;
    }

    async load(baseURLorHandle: string | FileSystemDirectoryHandle): Promise<void> {
        const { url, objUrl } = await resolveAssetURL(baseURLorHandle, this.path);
        try {
            const texture = await loadViaThreeLoader(new THREE.TextureLoader(), url);
            this._texture = texture;
            this._data = texture;
            this._loaded = true;
        } finally {
            if (objUrl) URL.revokeObjectURL(objUrl);
        }
    }

    dispose(): void {
        this._texture?.dispose();
        this._texture = null;
        super.dispose();
    }
}

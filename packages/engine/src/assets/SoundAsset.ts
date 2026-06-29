/**
 * SoundAsset — loads audio files via THREE.AudioLoader.
 */
import * as THREE from 'three';
import Asset from './Asset';
import { resolveAssetURL, loadViaThreeLoader } from './assetURL';

export default class SoundAsset extends Asset {
    private _buffer: AudioBuffer | null = null;

    get buffer(): AudioBuffer | null {
        return this._buffer;
    }

    async load(baseURLorHandle: string | FileSystemDirectoryHandle): Promise<void> {
        const { url, objUrl } = await resolveAssetURL(baseURLorHandle, this.path);
        try {
            const buffer = await loadViaThreeLoader(new THREE.AudioLoader(), url);
            this._buffer = buffer;
            this._data = buffer;
            this._loaded = true;
        } finally {
            if (objUrl) URL.revokeObjectURL(objUrl);
        }
    }

    dispose(): void {
        this._buffer = null;
        super.dispose();
    }
}

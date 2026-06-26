/**
 * SoundAsset — loads audio files via THREE.AudioLoader.
 */
import * as THREE from 'three';
import Asset from './Asset';

export default class SoundAsset extends Asset {
    private _buffer: AudioBuffer | null = null;

    get buffer(): AudioBuffer | null {
        return this._buffer;
    }

    async load(baseURLorHandle: string | FileSystemDirectoryHandle): Promise<void> {
        let url: string;
        if (typeof baseURLorHandle === 'string') {
            url = `${baseURLorHandle}/${this.path}`;
        } else {
            const parts = this.path.split('/');
            let handle: FileSystemDirectoryHandle | FileSystemFileHandle = baseURLorHandle;
            for (let i = 0; i < parts.length - 1; i++) {
                handle = await (handle as FileSystemDirectoryHandle).getDirectoryHandle(parts[i]);
            }
            const fileHandle = await (handle as FileSystemDirectoryHandle).getFileHandle(parts[parts.length - 1]);
            const file = await fileHandle.getFile();
            url = URL.createObjectURL(file);
        }

        return new Promise((resolve, reject) => {
            const loader = new THREE.AudioLoader();
            loader.load(
                url,
                (buffer) => {
                    this._buffer = buffer;
                    this._data = buffer;
                    this._loaded = true;
                    resolve();
                },
                undefined,
                (err) => reject(err)
            );
        });
    }

    dispose(): void {
        this._buffer = null;
        super.dispose();
    }
}

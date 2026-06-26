/**
 * TextureAsset — loads PNG/JPG/BMP textures via THREE.TextureLoader.
 */
import * as THREE from 'three';
import Asset from './Asset';

export default class TextureAsset extends Asset {
    private _texture: THREE.Texture | null = null;

    get texture(): THREE.Texture | null {
        return this._texture;
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
            const loader = new THREE.TextureLoader();
            loader.load(
                url,
                (texture) => {
                    this._texture = texture;
                    this._data = texture;
                    this._loaded = true;
                    resolve();
                },
                undefined,
                (err) => reject(err)
            );
        });
    }

    dispose(): void {
        this._texture?.dispose();
        this._texture = null;
        super.dispose();
    }
}

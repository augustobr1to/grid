/**
 * CubeTextureAsset — loads six-face cube-map textures for skyboxes.
 */
import * as THREE from 'three';
import Asset from './Asset';

export default class CubeTextureAsset extends Asset {
    private _cubeTexture: THREE.CubeTexture | null = null;

    get cubeTexture(): THREE.CubeTexture | null {
        return this._cubeTexture;
    }

    async load(baseURLorHandle: string | FileSystemDirectoryHandle): Promise<void> {
        // Load a JSON manifest that contains the six face paths
        let manifest: { path: string; faces: string[] };

        if (typeof baseURLorHandle === 'string') {
            const url = `${baseURLorHandle}/${this.path}`;
            const resp = await fetch(url);
            manifest = await resp.json();
        } else {
            const parts = this.path.split('/');
            let handle: FileSystemDirectoryHandle | FileSystemFileHandle = baseURLorHandle;
            for (let i = 0; i < parts.length - 1; i++) {
                handle = await (handle as FileSystemDirectoryHandle).getDirectoryHandle(parts[i]);
            }
            const fileHandle = await (handle as FileSystemDirectoryHandle).getFileHandle(parts[parts.length - 1]);
            const file = await fileHandle.getFile();
            manifest = JSON.parse(await file.text());
        }

        const basePath = this.path.substring(0, this.path.lastIndexOf('/') + 1);
        const prefix = typeof baseURLorHandle === 'string'
            ? `${baseURLorHandle}/${basePath}`
            : basePath;

        return new Promise((resolve, reject) => {
            const loader = new THREE.CubeTextureLoader();
            if (typeof baseURLorHandle === 'string') {
                loader.setPath(prefix);
            }
            loader.load(
                manifest.faces,
                (texture) => {
                    this._cubeTexture = texture;
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
        this._cubeTexture?.dispose();
        this._cubeTexture = null;
        super.dispose();
    }
}

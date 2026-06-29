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
        let dirHandle: FileSystemDirectoryHandle | null = null;

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
            dirHandle = handle as FileSystemDirectoryHandle;
            const fileHandle = await (handle as FileSystemDirectoryHandle).getFileHandle(parts[parts.length - 1]);
            const file = await fileHandle.getFile();
            manifest = JSON.parse(await file.text());
        }

        const basePath = this.path.substring(0, this.path.lastIndexOf('/') + 1);
        const prefix = typeof baseURLorHandle === 'string'
            ? `${baseURLorHandle}/${basePath}`
            : basePath;

        let faceUrls: string[];
        const objUrls: string[] = [];

        if (typeof baseURLorHandle === 'string') {
            faceUrls = manifest.faces;
        } else {
            // Resolve each face filename to an object URL via the directory handle
            const baseDir = dirHandle as FileSystemDirectoryHandle;
            // Navigate into basePath subdirs if present
            const baseParts = basePath.split('/').filter((p) => p.length > 0);
            let faceDir: FileSystemDirectoryHandle | FileSystemFileHandle = baseDir;
            for (let i = 0; i < baseParts.length; i++) {
                faceDir = await (faceDir as FileSystemDirectoryHandle).getDirectoryHandle(baseParts[i]);
            }
            faceUrls = [];
            for (let i = 0; i < manifest.faces.length; i++) {
                const faceParts = manifest.faces[i].split('/');
                let h: FileSystemDirectoryHandle | FileSystemFileHandle = faceDir;
                for (let j = 0; j < faceParts.length - 1; j++) {
                    h = await (h as FileSystemDirectoryHandle).getDirectoryHandle(faceParts[j]);
                }
                const fh = await (h as FileSystemDirectoryHandle).getFileHandle(faceParts[faceParts.length - 1]);
                const f = await fh.getFile();
                const u = URL.createObjectURL(f);
                objUrls.push(u);
                faceUrls.push(u);
            }
        }

        return new Promise((resolve, reject) => {
            const cleanup = () => { for (const u of objUrls) URL.revokeObjectURL(u); };
            const loader = new THREE.CubeTextureLoader();
            if (typeof baseURLorHandle === 'string') {
                loader.setPath(prefix);
            }
            loader.load(
                faceUrls,
                (texture) => {
                    this._cubeTexture = texture;
                    this._data = texture;
                    this._loaded = true;
                    cleanup();
                    resolve();
                },
                undefined,
                (err) => { cleanup(); reject(err); }
            );
        });
    }

    dispose(): void {
        this._cubeTexture?.dispose();
        this._cubeTexture = null;
        super.dispose();
    }
}

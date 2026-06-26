/**
 * GLTFAsset — loads a GLTF/GLB model via GLTFLoader.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Asset from './Asset';

export default class GLTFAsset extends Asset {
    private _gltf: GLTF | null = null;

    get gltf(): GLTF | null {
        return this._gltf;
    }

    async load(baseURLorHandle: string | FileSystemDirectoryHandle): Promise<void> {
        const loader = new GLTFLoader();

        let url: string;
        if (typeof baseURLorHandle === 'string') {
            url = `${baseURLorHandle}/${this.path}`;
        } else {
            // FileSystemDirectoryHandle — create object URL
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
            loader.load(
                url,
                (gltf) => {
                    this._gltf = gltf;
                    this._data = gltf.scene;
                    this._loaded = true;
                    resolve();
                },
                undefined,
                (err) => reject(err)
            );
        });
    }

    dispose(): void {
        if (this._gltf) {
            this._gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m) => m.dispose());
                    } else {
                        child.material?.dispose();
                    }
                }
            });
        }
        this._gltf = null;
        super.dispose();
    }
}

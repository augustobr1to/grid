/**
 * JSONAsset — loads a JSON file via FileLoader or FileSystemDirectoryHandle.
 */
import * as THREE from 'three';
import Asset from './Asset';

export default class JSONAsset extends Asset {
    async load(baseURLorHandle: string | FileSystemDirectoryHandle): Promise<void> {
        if (typeof baseURLorHandle === 'string') {
            const url = `${baseURLorHandle}/${this.path}`;
            return new Promise((resolve, reject) => {
                const loader = new THREE.FileLoader();
                loader.setResponseType('json');
                loader.load(
                    url,
                    (data) => {
                        this._data = data;
                        this._loaded = true;
                        resolve();
                    },
                    undefined,
                    (err) => reject(err)
                );
            });
        } else {
            // FileSystemDirectoryHandle path
            const parts = this.path.split('/');
            let handle: FileSystemDirectoryHandle | FileSystemFileHandle = baseURLorHandle;
            for (let i = 0; i < parts.length - 1; i++) {
                handle = await (handle as FileSystemDirectoryHandle).getDirectoryHandle(parts[i]);
            }
            const fileHandle = await (handle as FileSystemDirectoryHandle).getFileHandle(parts[parts.length - 1]);
            const file = await fileHandle.getFile();
            const text = await file.text();
            this._data = JSON.parse(text);
            this._loaded = true;
        }
    }
}

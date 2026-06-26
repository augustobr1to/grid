/**
 * AssetStore — path-keyed cache for all asset types.
 * Automatically instantiates the correct Asset subclass based on file extension.
 */
import type { AssetOptions } from '../types';
import Asset from './Asset';
import GLTFAsset from './GLTFAsset';
import JSONAsset from './JSONAsset';
import SoundAsset from './SoundAsset';
import TextureAsset from './TextureAsset';
import Logger from '../Logger';

const EXTENSION_MAP: Record<string, new (path: string) => Asset> = {
    '.gltf': GLTFAsset,
    '.glb': GLTFAsset,
    '.json': JSONAsset,
    '.png': TextureAsset,
    '.jpg': TextureAsset,
    '.jpeg': TextureAsset,
    '.bmp': TextureAsset,
    '.wav': SoundAsset,
    '.mp3': SoundAsset,
    '.ogg': SoundAsset,
};

export default class AssetStore {
    private _baseURLorDirHandle: string | FileSystemDirectoryHandle;
    private _cache: Map<string, Asset> = new Map();
    private _options: AssetOptions;

    constructor(baseURLorDirHandle: string | FileSystemDirectoryHandle, options?: AssetOptions) {
        this._baseURLorDirHandle = baseURLorDirHandle;
        this._options = options ?? {};
    }

    async load(path: string): Promise<Asset> {
        const cached = this._cache.get(path);
        if (cached && cached.loaded) {
            return cached;
        }

        const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
        const AssetClass = EXTENSION_MAP[ext];
        if (!AssetClass) {
            throw new Error(`[AssetStore] No loader registered for extension "${ext}" (path: ${path})`);
        }

        const asset = new AssetClass(path);
        this._cache.set(path, asset);

        Logger.info(`Loading asset: ${path}`);
        await asset.load(this._baseURLorDirHandle);
        return asset;
    }

    get(path: string): Asset | undefined {
        return this._cache.get(path);
    }

    unload(path: string): void {
        const asset = this._cache.get(path);
        if (asset) {
            asset.dispose();
            this._cache.delete(path);
        }
    }

    unloadAll(): void {
        for (const asset of this._cache.values()) {
            asset.dispose();
        }
        this._cache.clear();
    }
}

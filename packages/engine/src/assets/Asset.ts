/**
 * Asset — abstract base class for all loadable assets.
 */
import EventEmitter from '../util/EventEmitter';

export default abstract class Asset extends EventEmitter {
    readonly path: string;
    protected _loaded = false;
    protected _data: unknown = null;

    constructor(path: string) {
        super();
        this.path = path;
    }

    get loaded(): boolean {
        return this._loaded;
    }

    get data(): unknown {
        return this._data;
    }

    abstract load(baseURLorHandle: string | FileSystemDirectoryHandle): Promise<void>;

    dispose(): void {
        this._data = null;
        this._loaded = false;
    }

    setData(data: unknown): void {
        this._data = data;
        this.emit('change', data);
    }
}

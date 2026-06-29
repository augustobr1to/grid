/**
 * assetURL — shared path→URL resolution and three.js loader helpers
 * used by every Asset loader.
 */

/** Navigate a directory handle along a "/"-separated path to the target file handle. */
export async function resolveFileHandle(
    root: FileSystemDirectoryHandle,
    path: string
): Promise<FileSystemFileHandle> {
    const parts = path.split('/');
    let handle: FileSystemDirectoryHandle = root;
    for (let i = 0; i < parts.length - 1; i++) {
        handle = await handle.getDirectoryHandle(parts[i]);
    }
    return handle.getFileHandle(parts[parts.length - 1]);
}

/**
 * Resolve an asset path to a loadable URL.
 * For a string base this is a plain join; for a FileSystemDirectoryHandle an
 * object URL is created — the caller must revoke the returned `objUrl` when done.
 */
export async function resolveAssetURL(
    base: string | FileSystemDirectoryHandle,
    path: string
): Promise<{ url: string; objUrl: string | null }> {
    if (typeof base === 'string') {
        return { url: `${base}/${path}`, objUrl: null };
    }
    const fileHandle = await resolveFileHandle(base, path);
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);
    return { url, objUrl: url };
}

/** Minimal shape of a three.js loader's `load` method. */
interface ThreeLoaderLike<T, U = string> {
    load(
        url: U,
        onLoad: (data: T) => void,
        onProgress: undefined,
        onError: (err: unknown) => void
    ): void;
}

/** Promise wrapper around a three.js loader's callback-based `load`. */
export function loadViaThreeLoader<T, U = string>(
    loader: ThreeLoaderLike<T, U>,
    url: U
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        loader.load(url, resolve, undefined, (err) => reject(err));
    });
}

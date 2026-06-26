/**
 * Logger — simple console wrapper with level control.
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4,
}

let currentLevel: LogLevel = LogLevel.INFO;

const Logger = {
    setLevel(level: LogLevel): void {
        currentLevel = level;
    },

    debug(...args: unknown[]): void {
        if (currentLevel <= LogLevel.DEBUG) {
            console.debug('[TGE:DEBUG]', ...args);
        }
    },

    info(...args: unknown[]): void {
        if (currentLevel <= LogLevel.INFO) {
            console.info('[TGE:INFO]', ...args);
        }
    },

    warn(...args: unknown[]): void {
        if (currentLevel <= LogLevel.WARN) {
            console.warn('[TGE:WARN]', ...args);
        }
    },

    error(...args: unknown[]): void {
        if (currentLevel <= LogLevel.ERROR) {
            console.error('[TGE:ERROR]', ...args);
        }
    },
};

export default Logger;

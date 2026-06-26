/**
 * Utility functions for the engine.
 */

let _idCounter = 0;

/**
 * Generate a unique ID string.
 */
export function generateId(): string {
    _idCounter++;
    return `tge_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/**
 * Deep merge two objects. Values from `override` take precedence.
 */
export function deepMerge<T extends Record<string, unknown>>(
    base: T,
    override: Partial<T>
): T {
    const result = { ...base };
    for (const key of Object.keys(override) as (keyof T)[]) {
        const val = override[key];
        if (
            val !== null &&
            typeof val === 'object' &&
            !Array.isArray(val) &&
            typeof result[key] === 'object' &&
            result[key] !== null &&
            !Array.isArray(result[key])
        ) {
            result[key] = deepMerge(
                result[key] as Record<string, unknown>,
                val as Record<string, unknown>
            ) as T[keyof T];
        } else if (val !== undefined) {
            result[key] = val as T[keyof T];
        }
    }
    return result;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

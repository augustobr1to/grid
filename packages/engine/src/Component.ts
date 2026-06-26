/**
 * Component — abstract base class for JSON-declared behaviours.
 * Attached to a GameObject; loaded and rendered per-frame.
 */
import type { ComponentJSON } from './types';

export default abstract class Component {
    readonly gameObject: any; // GameObject — avoid circular import
    readonly jsonData: ComponentJSON;

    constructor(gameObject: any, jsonData: ComponentJSON) {
        this.gameObject = gameObject;
        this.jsonData = jsonData;
    }

    /** Called once when the parent GameObject loads. */
    async load(): Promise<void> {
        // Override in subclasses
    }

    /** Called every frame. */
    beforeRender(_args: { deltaTimeInSec: number }): void {
        // Override in subclasses
    }

    /** Cleanup — called on unload. */
    unload(): void {
        // Override in subclasses
    }

    getName(): string | undefined {
        return this.jsonData.name;
    }

    getType(): string {
        return this.jsonData.type;
    }
}

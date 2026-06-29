/**
 * Component — abstract base class for JSON-declared behaviours.
 * Attached to a GameObject; loaded and rendered per-frame.
 */
import type { ComponentJSON } from './types';
// Type-only import: no runtime dependency, so the GameObject<->Component cycle
// stays a compile-time-only reference (no circular require at runtime).
import type GameObject from './GameObject';

export default abstract class Component {
    readonly gameObject: GameObject;
    readonly jsonData: ComponentJSON;

    constructor(gameObject: GameObject, jsonData: ComponentJSON) {
        this.gameObject = gameObject;
        this.jsonData = jsonData;
    }

    /** Optional lifecycle hooks invoked by GameObject.addComponent/removeComponent. */
    onAttach?(gameObject: GameObject): void;
    onDetach?(gameObject: GameObject): void;

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

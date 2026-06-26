/**
 * Shared networking types used by engine clients and authoritative servers.
 * This is the single source of truth for the multiplayer message protocol.
 */

// ─── Input ───────────────────────────────────────────────────────────────────

export interface InputSnapshot {
    /** Monotonically increasing per client */
    seq: number;
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    /** Camera yaw in radians */
    yaw: number;
    /** Camera pitch in radians */
    pitch: number;
    /** Trigger intent this tick */
    fire: boolean;
    /** Currently equipped weapon */
    weaponId: string;
    /** Current active slot */
    slot: 'sr' | 'hr';
    /** Camera world position (clamped server-side) */
    origin: [number, number, number];
    /** Normalised camera forward vector */
    direction: [number, number, number];
}

// ─── Entity State ────────────────────────────────────────────────────────────

export interface EntityState {
    /** GameObject UUID */
    id: string;
    position: [number, number, number];
    quaternion: [number, number, number, number];
    velocity: [number, number, number];
}

// ─── World Snapshot ──────────────────────────────────────────────────────────

export interface WorldSnapshot {
    tick: number;
    /** Server Date.now() */
    timestamp: number;
    entities: EntityState[];
}

// ─── Player Info ─────────────────────────────────────────────────────────────

export interface PlayerInfo {
    playerId: string;
    playerName: string;
    /** GameObject UUID this player controls */
    entityId: string;
}

// ─── Reconcile ───────────────────────────────────────────────────────────────

export interface ReconcilePayload {
    /** Last processed input sequence */
    seq: number;
    state: EntityState;
}

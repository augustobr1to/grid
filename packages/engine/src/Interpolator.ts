import type { Transform, PlayerSnapshot, Vec3, Quat } from "./types";

const BUFFER_DELAY_MS = 100; // render this many ms behind server time
const MAX_BUFFER = 60; // max snapshots per entity to keep

export class Interpolator {
  /** id → sorted snapshot ring-buffer */
  private buffers: Map<string, PlayerSnapshot[]> = new Map();

  /** Feed a fresh server snapshot into the buffer */
  addSnapshot(snap: PlayerSnapshot): void {
    if (!this.buffers.has(snap.id)) this.buffers.set(snap.id, []);
    const buf = this.buffers.get(snap.id)!;
    buf.push(snap);
    // Keep sorted by timestamp ascending
    buf.sort((a, b) => a.timestamp - b.timestamp);
    // Trim excess
    if (buf.length > MAX_BUFFER) buf.splice(0, buf.length - MAX_BUFFER);
  }

  /**
   * Returns the interpolated transform for `id` at the given server-clock time.
   * Returns `null` if there are not enough snapshots yet.
   */
  getTransform(id: string, serverNowMs: number): Transform | null {
    const buf = this.buffers.get(id);
    if (!buf || buf.length < 2) return buf?.[0]?.transform ?? null;

    const renderTime = serverNowMs - BUFFER_DELAY_MS;

    // Find the two snapshots that straddle renderTime
    let lo = buf[0];
    let hi = buf[1];

    for (let i = 1; i < buf.length; i++) {
      if (buf[i].timestamp <= renderTime) {
        lo = buf[i];
        hi = buf[Math.min(i + 1, buf.length - 1)];
      }
    }

    if (lo.timestamp === hi.timestamp) return lo.transform;

    const t = Math.max(
      0,
      Math.min(1, (renderTime - lo.timestamp) / (hi.timestamp - lo.timestamp))
    );

    return {
      position: lerpVec3(lo.transform.position, hi.transform.position, t),
      rotation: slerpQuat(lo.transform.rotation, hi.transform.rotation, t),
      scale: lerpVec3(lo.transform.scale, hi.transform.scale, t),
    };
  }

  /** Drop all state for a player who has left */
  remove(id: string): void {
    this.buffers.delete(id);
  }

  clear(): void {
    this.buffers.clear();
  }
}

// ── Math helpers ─────────────────────────────────────────────────────────────

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function slerpQuat(a: Quat, b: Quat, t: number): Quat {
  // Ensure shortest path
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let bx = b.x, by = b.y, bz = b.z, bw = b.w;
  if (dot < 0) {
    dot = -dot;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }

  let scale0: number, scale1: number;
  if (1 - dot > 1e-6) {
    const omega = Math.acos(dot);
    const sinOmega = Math.sin(omega);
    scale0 = Math.sin((1 - t) * omega) / sinOmega;
    scale1 = Math.sin(t * omega) / sinOmega;
  } else {
    // Linear fallback for near-identical quaternions
    scale0 = 1 - t;
    scale1 = t;
  }

  return {
    x: scale0 * a.x + scale1 * bx,
    y: scale0 * a.y + scale1 * by,
    z: scale0 * a.z + scale1 * bz,
    w: scale0 * a.w + scale1 * bw,
  };
}

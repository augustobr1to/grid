import { io, Socket } from "socket.io-client";
import type { GameSnapshot } from "./types";

export type NetworkEventMap = {
  snapshot: GameSnapshot;
  connected: void;
  disconnected: void;
  error: Error;
};

type Listener<T> = (payload: T) => void;

export class NetworkManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Listener<unknown>>> = new Map();
  private _serverTimeOffset = 0; // ms: localTime + offset = serverTime
  private _latency = 0;
  private _pingInterval: ReturnType<typeof setInterval> | null = null;

  get serverTimeOffset(): number {
    return this._serverTimeOffset;
  }

  get latency(): number {
    return this._latency;
  }

  /** Estimated server time in ms */
  serverNow(): number {
    return Date.now() + this._serverTimeOffset;
  }

  connect(url: string, options?: Parameters<typeof io>[1]): void {
    if (this.socket?.connected) return;

    this.socket = io(url, {
      transports: ["websocket"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      ...options,
    });

    this.socket.on("connect", () => {
      this._startPing();
      this._emit("connected", undefined);
    });

    this.socket.on("disconnect", () => {
      this._stopPing();
      this._emit("disconnected", undefined);
    });

    this.socket.on("connect_error", (err: Error) => {
      this._emit("error", err);
    });

    this.socket.on("snapshot", (snap: GameSnapshot) => {
      this._emit("snapshot", snap);
    });

    // Server responds with { serverTime, clientSentAt }
    this.socket.on("pong_ack", ({ serverTime, clientSentAt }: { serverTime: number; clientSentAt: number }) => {
      const now = Date.now();
      this._latency = (now - clientSentAt) / 2;
      this._serverTimeOffset = serverTime + this._latency - now;
    });
  }

  disconnect(): void {
    this._stopPing();
    this.socket?.disconnect();
    this.socket = null;
  }

  send<T = unknown>(event: string, payload?: T): void {
    if (!this.socket?.connected) {
      console.warn("[NetworkManager] send() called while disconnected");
      return;
    }
    this.socket.emit(event, payload);
  }

  on<K extends keyof NetworkEventMap>(event: K, listener: Listener<NetworkEventMap[K]>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Listener<unknown>);
  }

  off<K extends keyof NetworkEventMap>(event: K, listener: Listener<NetworkEventMap[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _emit<K extends keyof NetworkEventMap>(event: K, payload: NetworkEventMap[K]): void {
    this.listeners.get(event)?.forEach((l) => l(payload));
  }

  private _startPing(): void {
    this._pingInterval = setInterval(() => {
      this.socket?.emit("ping_req", { clientSentAt: Date.now() });
    }, 2000);
  }

  private _stopPing(): void {
    if (this._pingInterval !== null) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }
}

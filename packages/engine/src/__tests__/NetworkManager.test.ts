/**
 * NetworkManager unit tests.
 *
 * socket.io-client is fully mocked so these tests run in the pure Node / Jest
 * environment without any real network activity.
 */
import { NetworkManager } from "../NetworkManager";
import type { GameSnapshot } from "../types";

// ── Mock socket.io-client ─────────────────────────────────────────────────────

type HandlerMap = Record<string, Array<(...args: unknown[]) => void>>;

interface MockSocket {
  connected: boolean;
  _handlers: HandlerMap;
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
  /** Helper: synchronously fire a socket event */
  _fire(event: string, ...args: unknown[]): void;
}

let mockSocket: MockSocket;

jest.mock("socket.io-client", () => ({
  io: jest.fn((_url: string) => {
    mockSocket = {
      connected: false,
      _handlers: {},
      on: jest.fn(function (
        this: MockSocket,
        event: string,
        cb: (...args: unknown[]) => void,
      ) {
        if (!mockSocket._handlers[event]) mockSocket._handlers[event] = [];
        mockSocket._handlers[event].push(cb);
      }),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(() => {
        mockSocket.connected = false;
      }),
      _fire(event: string, ...args: unknown[]) {
        (mockSocket._handlers[event] ?? []).forEach((cb) => cb(...args));
      },
    };
    return mockSocket;
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSnapshot(tick = 1): GameSnapshot {
  return { tick, timestamp: Date.now(), entities: [] } as unknown as GameSnapshot;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NetworkManager", () => {
  let nm: NetworkManager;

  beforeEach(() => {
    jest.clearAllMocks();
    nm = new NetworkManager();
  });

  afterEach(() => {
    nm.disconnect();
  });

  // ── Initial state ───────────────────────────────────────────────────────────

  test("isConnected() returns false before connect()", () => {
    expect(nm.isConnected()).toBe(false);
  });

  test("serverNow() is close to Date.now() with zero offset", () => {
    const before = Date.now();
    const result = nm.serverNow();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after + 1);
  });

  test("latency is 0 before any pong_ack", () => {
    expect(nm.latency).toBe(0);
  });

  // ── connect() ──────────────────────────────────────────────────────────────

  test("connect() fires the 'connected' listener when socket emits 'connect'", () => {
    const onConnected = jest.fn();
    nm.on("connected", onConnected);
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    mockSocket._fire("connect");
    expect(onConnected).toHaveBeenCalledTimes(1);
  });

  test("isConnected() returns true after socket connects", () => {
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    expect(nm.isConnected()).toBe(true);
  });

  test("calling connect() again while already connected is a no-op", () => {
    const { io } = jest.requireMock("socket.io-client");
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    nm.connect("http://localhost:3000");
    expect(io).toHaveBeenCalledTimes(1);
  });

  // ── disconnect() ────────────────────────────────────────────────────────────

  test("disconnect() fires the 'disconnected' listener", () => {
    const onDisconnected = jest.fn();
    nm.on("disconnected", onDisconnected);
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    mockSocket._fire("disconnect");
    expect(onDisconnected).toHaveBeenCalledTimes(1);
  });

  test("disconnect() calls socket.disconnect()", () => {
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    nm.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  test("isConnected() returns false after disconnect()", () => {
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    nm.disconnect();
    expect(nm.isConnected()).toBe(false);
  });

  // ── send() ─────────────────────────────────────────────────────────────────

  test("send() emits the event and payload when connected", () => {
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    nm.send("input", { x: 1 });
    expect(mockSocket.emit).toHaveBeenCalledWith("input", { x: 1 });
  });

  test("send() logs a warning and does not throw when disconnected", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    nm.send("input", {});
    expect(warn).toHaveBeenCalled();
    // mockSocket may be defined due to jest.mock, but socket is not connected
    warn.mockRestore();
  });

  // ── on() / off() ───────────────────────────────────────────────────────────

  test("off() unsubscribes a listener so it is not called on event", () => {
    const handler = jest.fn();
    nm.on("connected", handler);
    nm.off("connected", handler);
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    mockSocket._fire("connect");
    expect(handler).not.toHaveBeenCalled();
  });

  test("multiple listeners for the same event are all invoked", () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    nm.on("connected", h1);
    nm.on("connected", h2);
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    mockSocket._fire("connect");
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  // ── snapshot relay ─────────────────────────────────────────────────────────

  test("incoming 'snapshot' socket event is relayed to 'snapshot' listeners", () => {
    const onSnap = jest.fn();
    nm.on("snapshot", onSnap);
    nm.connect("http://localhost:3000");
    const snap = makeSnapshot(42);
    mockSocket._fire("snapshot", snap);
    expect(onSnap).toHaveBeenCalledWith(snap);
  });

  // ── pong_ack / latency ────────────────────────────────────────────────────

  test("pong_ack updates latency to a non-negative number", () => {
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    const clientSentAt = Date.now() - 40;
    const serverTime = Date.now() - 20;
    mockSocket._fire("pong_ack", { serverTime, clientSentAt });
    expect(nm.latency).toBeGreaterThanOrEqual(0);
  });

  test("pong_ack updates serverTimeOffset to a finite number", () => {
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    mockSocket._fire("pong_ack", {
      serverTime: Date.now() - 20,
      clientSentAt: Date.now() - 40,
    });
    expect(Number.isFinite(nm.serverTimeOffset)).toBe(true);
  });

  test("serverNow() reflects updated serverTimeOffset after pong_ack", () => {
    nm.connect("http://localhost:3000");
    mockSocket.connected = true;
    const fixedOffset = 500; // pretend server is 500 ms ahead
    const now = Date.now();
    // Craft pong_ack so computed offset ≈ fixedOffset
    // formula: offset = serverTime + latency - now
    // with latency ≈ 0 (clientSentAt = now): offset ≈ serverTime - now
    mockSocket._fire("pong_ack", {
      serverTime: now + fixedOffset,
      clientSentAt: now,
    });
    expect(nm.serverNow()).toBeGreaterThan(Date.now());
  });

  // ── error propagation ─────────────────────────────────────────────────────

  test("connect_error socket event relays to 'error' listeners", () => {
    const onError = jest.fn();
    nm.on("error", onError);
    nm.connect("http://localhost:3000");
    const err = new Error("connection refused");
    mockSocket._fire("connect_error", err);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

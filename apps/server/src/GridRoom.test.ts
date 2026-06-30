/**
 * GridRoom integration tests — boot a real Colyseus server + SDK client.
 *
 * These exercise the actual schema wire path (encode on server, decode on
 * client), which is exactly what the client/server version realignment risked.
 * If client and server schema versions ever diverge again, the seed-sync test
 * below fails because client.state cannot be decoded.
 */
import { Server, matchMaker } from '@colyseus/core';
import { Client, type Room as ClientRoom } from '@colyseus/sdk';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { InputSnapshot } from '@thegridcn/shared';
import { createServer, type Server as HttpServer } from 'node:http';
import { GridRoom } from './GridRoom';

const REST_Y = 1.7;

/** Build a fully-formed InputSnapshot; override only what a test cares about. */
function input(overrides: Partial<InputSnapshot> = {}): InputSnapshot {
  return {
    seq: 1,
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    yaw: 0,
    pitch: 0,
    fire: false,
    weaponId: 'smg',
    slot: 'sr',
    origin: [0, 0, 0],
    direction: [0, 0, 0],
    ...overrides,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolve once the client receives its next decoded state patch. */
function nextPatch(client: { onStateChange: { once: (cb: () => void) => void } }): Promise<void> {
  return new Promise((resolve) => client.onStateChange.once(() => resolve()));
}

describe('GridRoom', () => {
  let gameServer: Server;
  let httpServer: HttpServer;
  let sdk: Client;
  const clients: Array<ClientRoom> = [];

  beforeAll(async () => {
    httpServer = createServer();
    gameServer = new Server({ greet: false, transport: new WebSocketTransport({ server: httpServer }) });
    gameServer.define('grid_room', GridRoom);
    await gameServer.listen(0);

    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected test server to listen on an ephemeral TCP port');
    }
    sdk = new Client(`ws://127.0.0.1:${address.port}`);
  });

  afterAll(async () => {
    await gameServer.gracefullyShutdown(false);
  });

  beforeEach(async () => {
    clients.length = 0;
    await Promise.all(matchMaker.disconnectAll());
  });

  afterEach(async () => {
    await Promise.all(clients.map((client) => client.leave(true).catch(() => undefined)));
    clients.length = 0;
  });

  async function join(options: Record<string, unknown>): Promise<ClientRoom<unknown, GridRoom['state']>> {
    const client = (await sdk.joinOrCreate('grid_room', options)) as ClientRoom<unknown, GridRoom['state']>;
    client.onMessage('reconcile', () => {});
    clients.push(client);
    return client;
  }

  function getRoom(client: ClientRoom): GridRoom {
    return matchMaker.getLocalRoomById(client.roomId) as GridRoom;
  }

  it('syncs an authoritative non-zero seed to the client (schema wire path)', async () => {
    const client = await join({ name: 'A' });
    await nextPatch(client);
    expect(client.state.seed).toBeGreaterThan(0);
  });

  it('assigns the requested team and registers the player', async () => {
    const client = await join({ name: 'Red', team: 'red' });
    await nextPatch(client);
    const me = client.state.players.get(client.sessionId);
    expect(me).toBeDefined();
    expect(me!.team).toBe('red');
    expect(me!.name).toBe('Red');
  });

  it('integrates horizontal movement from input (forward decreases z)', async () => {
    const client = await join({ name: 'A' });
    await nextPatch(client);
    const startZ = client.state.players.get(client.sessionId)!.z;

    client.send('input', input({ seq: 1, forward: true }));
    await sleep(150);

    expect(client.state.players.get(client.sessionId)!.z).toBeLessThan(startZ);
  });

  it('makes a grounded player jump above rest height, then fall back', async () => {
    const client = await join({ name: 'A' });
    await nextPatch(client);
    const room = getRoom(client);

    client.send('input', input({ seq: 1, jump: true }));
    await sleep(100);
    expect(room.state.players.get(client.sessionId)!.y).toBeGreaterThan(REST_Y);

    // Let the arc complete; gravity must return the player to the floor.
    await sleep(1500);
    expect(room.state.players.get(client.sessionId)!.y).toBeCloseTo(REST_Y, 3);
  });

  it('sends a reconcile message stamped with the processed input seq', async () => {
    const client = await join({ name: 'A' });
    await nextPatch(client);

    let reconcile: { seq: number; state: { position: number[] } } | null = null;
    client.onMessage('reconcile', (p) => {
      reconcile = p as typeof reconcile;
    });

    client.send('input', input({ seq: 7, forward: true }));
    await sleep(150);

    expect(reconcile).not.toBeNull();
    expect(reconcile!.seq).toBe(7);
    expect(reconcile!.state.position).toHaveLength(3);
  });

  it('rejects input with non-finite yaw (no movement)', async () => {
    const client = await join({ name: 'A' });
    await nextPatch(client);
    const room = getRoom(client);
    const before = room.state.players.get(client.sessionId)!.z;

    client.send('input', input({ seq: 1, forward: true, yaw: NaN }));
    await sleep(150);

    expect(room.state.players.get(client.sessionId)!.z).toBe(before);
    expect(room.state.players.get(client.sessionId)!.lastProcessedSeq).toBe(0);
  });

  it('rate-limits a flood of inputs (does not process all of them)', async () => {
    const client = await join({ name: 'A' });
    await nextPatch(client);
    const room = getRoom(client);

    // Blast far more than the per-second budget in a tight loop; the limiter must
    // drop the overflow, so the last accepted seq stays well below what we sent.
    for (let seq = 1; seq <= 400; seq++) {
      client.send('input', input({ seq, forward: true }));
    }
    await sleep(300);

    const processed = room.state.players.get(client.sessionId)!.lastProcessedSeq;
    expect(processed).toBeGreaterThan(0);
    expect(processed).toBeLessThanOrEqual(120);
  });

  it('brokers a valid peerId but rejects a malformed one', async () => {
    const client = await join({ name: 'A' });
    await nextPatch(client);
    const room = getRoom(client);

    client.send('voice-peer', { peerId: 'abc-123_XYZ' });
    await sleep(100);
    expect(room.state.players.get(client.sessionId)!.peerId).toBe('abc-123_XYZ');

    client.send('voice-peer', { peerId: 'bad id!! <script>' });
    await sleep(100);
    expect(room.state.players.get(client.sessionId)!.peerId).toBe('abc-123_XYZ');
  });
});

/**
 * GridRoom integration tests — boot a real Colyseus server + SDK client.
 *
 * These exercise the actual schema-v3 wire path (encode on server, decode on
 * client), which is exactly what the client/server version realignment risked.
 * If client and server schema versions ever diverge again, the seed-sync test
 * below fails because client.state cannot be decoded.
 */
import config from '@colyseus/tools';
import { boot, ColyseusTestServer } from '@colyseus/testing';
import type { InputSnapshot } from '@thegridcn/shared';
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
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await boot(
      config({
        initializeGameServer: (gameServer) => {
          gameServer.define('grid_room', GridRoom);
        },
      }),
    );
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it('syncs an authoritative non-zero seed to the client (schema-v3 wire path)', async () => {
    const client = await colyseus.sdk.joinOrCreate('grid_room', { name: 'A' });
    await nextPatch(client);
    expect(client.state.seed).toBeGreaterThan(0);
  });

  it('assigns the requested team and registers the player', async () => {
    const client = await colyseus.sdk.joinOrCreate('grid_room', { name: 'Red', team: 'red' });
    await nextPatch(client);
    const me = client.state.players.get(client.sessionId);
    expect(me).toBeDefined();
    expect(me!.team).toBe('red');
    expect(me!.name).toBe('Red');
  });

  it('integrates horizontal movement from input (forward decreases z)', async () => {
    const client = await colyseus.sdk.joinOrCreate('grid_room', { name: 'A' });
    await nextPatch(client);
    const startZ = client.state.players.get(client.sessionId)!.z;

    client.send('input', input({ seq: 1, forward: true }));
    await sleep(150);

    expect(client.state.players.get(client.sessionId)!.z).toBeLessThan(startZ);
  });

  it('makes a grounded player jump above rest height, then fall back', async () => {
    const client = await colyseus.sdk.joinOrCreate('grid_room', { name: 'A' });
    await nextPatch(client);
    const room = colyseus.getRoomById(client.roomId);

    client.send('input', input({ seq: 1, jump: true }));
    await sleep(100);
    expect(room.state.players.get(client.sessionId)!.y).toBeGreaterThan(REST_Y);

    // Let the arc complete; gravity must return the player to the floor.
    await sleep(1500);
    expect(room.state.players.get(client.sessionId)!.y).toBeCloseTo(REST_Y, 3);
  });

  it('sends a reconcile message stamped with the processed input seq', async () => {
    const client = await colyseus.sdk.joinOrCreate('grid_room', { name: 'A' });
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
    const client = await colyseus.sdk.joinOrCreate('grid_room', { name: 'A' });
    await nextPatch(client);
    const room = colyseus.getRoomById(client.roomId);
    const before = room.state.players.get(client.sessionId)!.z;

    client.send('input', input({ seq: 1, forward: true, yaw: NaN }));
    await sleep(150);

    expect(room.state.players.get(client.sessionId)!.z).toBe(before);
    expect(room.state.players.get(client.sessionId)!.lastProcessedSeq).toBe(0);
  });

  it('brokers a valid peerId but rejects a malformed one', async () => {
    const client = await colyseus.sdk.joinOrCreate('grid_room', { name: 'A' });
    await nextPatch(client);
    const room = colyseus.getRoomById(client.roomId);

    client.send('voice-peer', { peerId: 'abc-123_XYZ' });
    await sleep(100);
    expect(room.state.players.get(client.sessionId)!.peerId).toBe('abc-123_XYZ');

    client.send('voice-peer', { peerId: 'bad id!! <script>' });
    await sleep(100);
    expect(room.state.players.get(client.sessionId)!.peerId).toBe('abc-123_XYZ');
  });
});

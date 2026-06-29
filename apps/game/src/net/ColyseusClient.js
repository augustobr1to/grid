/**
 * ColyseusClient.js — thin adapter over the engine's ColyseusNetworkManager.
 *
 * Exposes the same surface the game already consumed (connect/joinRoom/sendInput/
 * event subscriptions), but backed by Colyseus room-state sync. World snapshots are
 * synthesized from `room.state.players` on every state change and stamped with the
 * LOCAL clock, so interpolation no longer compares client time against server
 * timestamps (the old clock-skew bug). No game logic lives here.
 */
import { ColyseusNetworkManager } from '@thegridcn/engine';

export default class ColyseusClient {
    constructor(options = {}) {
        this._nm = new ColyseusNetworkManager({
            endpoint: options.endpoint, // undefined → manager default ws://host:2567
            roomName: options.roomName ?? 'grid_room',
        });
        this._seq = 0;
        this._localId = null;
        this._joined = false;
        this._initEmitted = false; // roomJoined fires once, on the first synced state
        this._known = new Set();
        this._cbs = { roomJoined: [], worldSnapshot: [], playerJoined: [], playerLeft: [], reconcile: [], disconnect: [], error: [] };
        this._serverCbs = new Map(); // custom event name → [cb]
    }

    // Join is performed in joinRoom(); kept for call-site parity.
    connect() {}

    async joinRoom(name, teamPref) {
        try {
            const room = await this._nm.connect({ name, team: teamPref });
            this._localId = room.sessionId;
            this._joined = true;

            // Server → client messages.
            this._nm.onMessage('reconcile', (p) => this._emit('reconcile', p));
            for (const [event, cbs] of this._serverCbs) {
                this._nm.onMessage(event, (p) => cbs.forEach((cb) => cb(p)));
            }

            // Connection loss / transport errors → surface to the UI so a dropped
            // socket no longer freezes the player silently.
            this._nm.on('disconnected', (code) => { this._joined = false; this._emit('disconnect', code); });
            this._nm.on('error', (err) => this._emit('error', err));

            // Authoritative state → synthetic snapshots + join/leave diffing.
            // roomJoined is emitted from the first state (below) once the
            // server-authoritative seed and our own team are known.
            this._nm.on('stateChanged', (state) => this._onState(state));
        } catch (err) {
            console.error('[ColyseusClient] join failed', err);
            this._emit('error', err);
        }
    }

    _onState(state) {
        // First synced state carries the authoritative map seed and our assigned
        // team — emit roomJoined exactly once so the client can build the world.
        if (!this._initEmitted) {
            this._initEmitted = true;
            const me = state.players.get(this._localId);
            this._emit('roomJoined', {
                playerId: this._localId,
                seed: state.seed,
                team: me ? me.team : null,
                peers: [],
            });
        }

        const entities = [];
        const seen = new Set();
        state.players.forEach((p, id) => {
            seen.add(id);
            if (!this._known.has(id)) {
                this._known.add(id);
                if (id !== this._localId) this._emit('playerJoined', { playerId: id, playerName: p.name });
            }
            entities.push({ id, position: [p.x, p.y, p.z], team: p.team, qy: p.qy, qw: p.qw, peerId: p.peerId });
        });
        for (const id of [...this._known]) {
            if (!seen.has(id)) {
                this._known.delete(id);
                this._emit('playerLeft', id);
            }
        }
        this._emit('worldSnapshot', { entities, timestamp: Date.now() });
    }

    sendInput(inputData) {
        if (!this._joined) return;
        this._seq++;
        this._nm.sendInput({ seq: this._seq, ...inputData });
    }

    equipLoadout(srWeaponId, hrWeaponId, srRounds, hrRounds) {
        if (this._joined) this._nm.send('ARSENAL_EQUIP', { srWeaponId, hrWeaponId, srRounds, hrRounds });
    }

    requestResupply(pointId) {
        if (this._joined) this._nm.send('RESUPPLY_REQ', { pointId });
    }

    /** Publish this client's PeerJS id so other players can establish P2P voice. */
    setVoicePeerId(peerId) {
        if (this._joined) this._nm.send('voice-peer', { peerId });
    }

    disconnect() {
        void this._nm.leave();
    }

    onRoomJoined(cb) { this._cbs.roomJoined.push(cb); }
    onWorldSnapshot(cb) { this._cbs.worldSnapshot.push(cb); }
    onPlayerJoined(cb) { this._cbs.playerJoined.push(cb); }
    onPlayerLeft(cb) { this._cbs.playerLeft.push(cb); }
    onReconcile(cb) { this._cbs.reconcile.push(cb); }
    onDisconnect(cb) { this._cbs.disconnect.push(cb); }
    onError(cb) { this._cbs.error.push(cb); }

    onServer(event, cb) {
        if (!this._serverCbs.has(event)) this._serverCbs.set(event, []);
        this._serverCbs.get(event).push(cb);
        if (this._joined) this._nm.onMessage(event, (p) => cb(p));
    }

    _emit(name, payload) {
        for (const cb of this._cbs[name]) cb(payload);
    }

    get playerId() { return this._localId; }
    get isConnected() { return this._nm.isConnected; }
}

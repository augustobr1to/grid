/**
 * SocketClient.js — thin socket.io-client wrapper.
 * No game logic — just connection management and event routing.
 */
import { Events } from '../constants/Events.js';

export default class SocketClient {
    constructor(networkManager) {
        this._nm = networkManager;
        this._seq = 0;
    }

    connect() {
        this._nm.connect();
    }

    disconnect() {
        this._nm.disconnect();
    }

    joinRoom(name, teamPref) {
        this._nm.send(Events.JOIN_ROOM, { name, teamPref });
    }

    sendInput(inputData) {
        this._seq++;
        const snapshot = {
            seq: this._seq,
            ...inputData,
        };
        this._nm.sendInput(snapshot);
    }

    equipLoadout(srWeaponId, hrWeaponId, srRounds, hrRounds) {
        this._nm.send(Events.ARSENAL_EQUIP, { srWeaponId, hrWeaponId, srRounds, hrRounds });
    }

    requestResupply(pointId) {
        this._nm.send(Events.RESUPPLY_REQ, { pointId });
    }

    onRoomJoined(cb) { this._nm.on('roomJoined', cb); }
    onWorldSnapshot(cb) { this._nm.on('worldSnapshot', cb); }
    onPlayerJoined(cb) { this._nm.on('playerJoined', cb); }
    onPlayerLeft(cb) { this._nm.on('playerLeft', cb); }
    onReconcile(cb) { this._nm.on('reconcile', cb); }

    onServer(event, cb) { this._nm.onServer(event, cb); }

    get playerId() { return this._nm.localPlayerId; }
    get isConnected() { return this._nm.isConnected; }
}

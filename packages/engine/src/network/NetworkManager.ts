/**
 * NetworkManager — client-side Socket.IO wrapper for multiplayer.
 */
import { io, Socket } from 'socket.io-client';
import type { NetworkOptions } from '../types';
import type { InputSnapshot, WorldSnapshot, PlayerInfo, ReconcilePayload } from '@thegridcn/shared';
import EventEmitter from '../util/EventEmitter';
import Logger from '../Logger';

export default class NetworkManager extends EventEmitter {
    private _socket: Socket | null = null;
    private _options: NetworkOptions;
    private _connected = false;
    private _localPlayerId: string | null = null;

    constructor(options: NetworkOptions) {
        super();
        this._options = options;

        if (options.autoConnect) {
            this.connect();
        }
    }

    get isConnected(): boolean {
        return this._connected;
    }

    get localPlayerId(): string | null {
        return this._localPlayerId;
    }

    connect(): void {
        if (this._socket) return;

        const url = this._options.serverURL ?? 'http://localhost:3333';
        this._socket = io(url, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
        });

        this._socket.on('connect', () => {
            this._connected = true;
            Logger.info('NetworkManager: connected to server');
            this.emit('connected');
        });

        this._socket.on('disconnect', () => {
            this._connected = false;
            Logger.info('NetworkManager: disconnected from server');
            this.emit('disconnected');
        });

        this._socket.on('ROOM_JOINED', (data: { playerId: string; tick: number; peers: PlayerInfo[] }) => {
            this._localPlayerId = data.playerId;
            this.emit('roomJoined', data);
        });

        this._socket.on('WORLD_SNAPSHOT', (snap: WorldSnapshot) => {
            this.emit('worldSnapshot', snap);
        });

        this._socket.on('PLAYER_JOINED', (info: PlayerInfo) => {
            this.emit('playerJoined', info);
        });

        this._socket.on('PLAYER_LEFT', (data: { playerId: string }) => {
            this.emit('playerLeft', data.playerId);
        });

        this._socket.on('RECONCILE', (payload: ReconcilePayload) => {
            this.emit('reconcile', payload);
        });
    }

    disconnect(): void {
        if (this._socket) {
            this._socket.disconnect();
            this._socket = null;
            this._connected = false;
            this._localPlayerId = null;
        }
    }

    async joinRoom(roomId: string, playerName: string): Promise<void> {
        if (!this._socket) throw new Error('NetworkManager: not connected');
        this._socket.emit('JOIN_ROOM', { roomId, playerName });
    }

    leaveRoom(): void {
        if (this._socket) {
            this._socket.emit('LEAVE_ROOM', {});
        }
    }

    sendInput(input: InputSnapshot): void {
        if (this._socket && this._connected) {
            this._socket.emit('PLAYER_INPUT', input);
        }
    }

    /** Send a custom event to the server. */
    send(event: string, data?: unknown): void {
        if (this._socket && this._connected) {
            this._socket.emit(event, data);
        }
    }

    /** Listen for a custom server event. */
    onServer(event: string, cb: (...args: unknown[]) => void): void {
        if (this._socket) {
            this._socket.on(event, cb as any);
        }
    }

    get socket(): Socket | null {
        return this._socket;
    }
}

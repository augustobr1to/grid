/**
 * RoomManager — manages multiple concurrent game rooms.
 */
import { Server, Socket } from 'socket.io';
import GameRoom from './GameRoom';

const DEFAULT_ROOM = 'default';

export default class RoomManager {
    private _io: Server;
    private _rooms: Map<string, GameRoom> = new Map();
    private _playerRoomMap: Map<string, string> = new Map();

    constructor(io: Server) {
        this._io = io;
    }

    async joinRoom(socket: Socket, data: { roomId?: string; playerName?: string; name?: string; teamPref?: string }): Promise<void> {
        const roomId = data.roomId ?? DEFAULT_ROOM;
        const playerName = data.playerName ?? data.name ?? `Player_${socket.id.substring(0, 6)}`;

        // Get or create room
        let room = this._rooms.get(roomId);
        if (!room) {
            room = new GameRoom(roomId, this._io);
            await room.init();
            this._rooms.set(roomId, room);
            console.log(`[RoomManager] Created room: ${roomId}`);
        }

        // Add player to room
        room.addPlayer(socket, { playerName, teamPref: data.teamPref });
        this._playerRoomMap.set(socket.id, roomId);
        console.log(`[RoomManager] ${playerName} joined room ${roomId} (${room.playerCount} players)`);
    }

    handleInput(socket: Socket, data: any): void {
        const roomId = this._playerRoomMap.get(socket.id);
        if (!roomId) return;

        const room = this._rooms.get(roomId);
        if (room) {
            room.handleInput(socket.id, data);
        }
    }

    leaveRoom(socket: Socket): void {
        this._removePlayer(socket);
    }

    handleDisconnect(socket: Socket): void {
        this._removePlayer(socket);
    }

    private _removePlayer(socket: Socket): void {
        const roomId = this._playerRoomMap.get(socket.id);
        if (!roomId) return;

        const room = this._rooms.get(roomId);
        if (room) {
            room.removePlayer(socket.id);
            console.log(`[RoomManager] Player ${socket.id} left room ${roomId} (${room.playerCount} remaining)`);

            // Clean up empty rooms
            if (room.playerCount === 0) {
                room.dispose();
                this._rooms.delete(roomId);
                console.log(`[RoomManager] Room ${roomId} destroyed (empty)`);
            }
        }

        this._playerRoomMap.delete(socket.id);
    }
}

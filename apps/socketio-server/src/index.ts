/**
 * Server entry point — Express + Socket.IO authoritative game server.
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import RoomManager from './RoomManager';

const PORT = process.env.PORT || 3333;

const app = express();
const http = createServer(app);
const io = new Server(http, {
    cors: { origin: '*' },
    transports: ['websocket'],
});

const rooms = new RoomManager(io);

// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', engine: 'Grid Engine', version: '1.0.0' });
});

io.on('connection', (socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);

    socket.on('JOIN_ROOM', (data) => rooms.joinRoom(socket, data));
    socket.on('PLAYER_INPUT', (data) => rooms.handleInput(socket, data));
    socket.on('LEAVE_ROOM', () => rooms.leaveRoom(socket));
    socket.on('disconnect', () => rooms.handleDisconnect(socket));
});

http.listen(PORT, () => {
    console.log(`[Grid Engine Server] Running on port ${PORT}`);
    console.log(`  → ws://localhost:${PORT}`);
});

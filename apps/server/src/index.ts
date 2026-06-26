import express from 'express';
import { createServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GridRoom } from './GridRoom';

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', engine: 'The Grid', transport: 'colyseus' });
});

const server = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

gameServer.define('grid_room', GridRoom);

server.listen(PORT, () => {
  console.log(`[Grid Colyseus] ws://localhost:${PORT}`);
});

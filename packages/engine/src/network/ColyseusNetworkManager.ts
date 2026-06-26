import { Client, Room } from 'colyseus.js';
import type { InputSnapshot } from '@thegridcn/shared';
import type { ColyseusNetworkOptions } from '../types';
import EventEmitter from '../util/EventEmitter';

export type ColyseusNetworkEvent =
  | 'connected'
  | 'disconnected'
  | 'stateChanged'
  | 'message'
  | 'error';

export interface ColyseusMessage<T = unknown> {
  type: string | number;
  payload: T;
}

export default class ColyseusNetworkManager<TState = unknown> extends EventEmitter {
  readonly options: Required<Pick<ColyseusNetworkOptions, 'endpoint' | 'roomName'>> & ColyseusNetworkOptions;
  client: Client;
  room: Room<TState> | null = null;

  constructor(options: ColyseusNetworkOptions = {}) {
    super();
    this.options = {
      endpoint: options.endpoint ?? defaultEndpoint(),
      roomName: options.roomName ?? 'grid_room',
      ...options,
    };
    this.client = new Client(this.options.endpoint);

    if (options.autoConnect) {
      void this.connect(options.auth);
    }
  }

  get isConnected(): boolean {
    return this.room !== null;
  }

  get sessionId(): string | null {
    return this.room?.sessionId ?? null;
  }

  get state(): TState | null {
    return this.room?.state ?? null;
  }

  async connect(auth: Record<string, unknown> = this.options.auth ?? {}): Promise<Room<TState>> {
    if (this.room) return this.room;

    try {
      this.room = await this.client.joinOrCreate<TState>(this.options.roomName, auth);
      this.bindRoom(this.room);
      this.emit('connected', this.room);
      return this.room;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  async leave(consented = true): Promise<void> {
    if (!this.room) return;
    const room = this.room;
    this.room = null;
    await room.leave(consented);
    this.emit('disconnected');
  }

  send<T = unknown>(type: string | number, payload?: T): void {
    if (!this.room) throw new Error('[ColyseusNetworkManager] send() called before connect()');
    this.room.send(type, payload);
  }

  sendInput(input: InputSnapshot): void {
    this.send('input', input);
  }

  onMessage<T = unknown>(type: string | number, callback: (payload: T) => void): void {
    if (!this.room) throw new Error('[ColyseusNetworkManager] onMessage() called before connect()');
    this.room.onMessage(type as any, callback as any);
  }

  private bindRoom(room: Room<TState>): void {
    (room.onStateChange as any)((state: TState) => {
      this.emit('stateChanged', state);
    });

    room.onMessage('*' as any, (type: string | number, payload: unknown) => {
      this.emit('message', { type, payload } satisfies ColyseusMessage);
    });

    room.onLeave((code) => {
      this.room = null;
      this.emit('disconnected', code);
    });

    room.onError((code, message) => {
      this.emit('error', new Error(`[Colyseus] ${code}: ${message}`));
    });
  }
}

function defaultEndpoint(): string {
  if (typeof window === 'undefined') return 'ws://localhost:2567';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:2567`;
}

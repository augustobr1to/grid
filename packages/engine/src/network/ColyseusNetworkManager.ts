import { Client, Room } from '@colyseus/sdk';
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

type NetworkRoom<TState> = Room<unknown, TState>;

export default class ColyseusNetworkManager<TState = unknown> extends EventEmitter {
  readonly options: Required<Pick<ColyseusNetworkOptions, 'endpoint' | 'roomName'>> & ColyseusNetworkOptions;
  client: Client;
  room: NetworkRoom<TState> | null = null;

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

  async connect(auth: Record<string, unknown> = this.options.auth ?? {}): Promise<NetworkRoom<TState>> {
    if (this.room) return this.room;

    try {
      const room = (await this.client.joinOrCreate(this.options.roomName, auth)) as NetworkRoom<TState>;
      this.room = room;
      this.bindRoom(room);
      this.emit('connected', room);
      return room;
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
    this.room.send(type as never, payload);
  }

  sendInput(input: InputSnapshot): void {
    this.send('input', input);
  }

  onMessage<T = unknown>(type: string | number, callback: (payload: T) => void): void {
    if (!this.room) throw new Error('[ColyseusNetworkManager] onMessage() called before connect()');
    this.room.onMessage(type as never, callback as (payload: unknown) => void);
  }

  private bindRoom(room: NetworkRoom<TState>): void {
    room.onStateChange((state: TState) => {
      this.emit('stateChanged', state);
    });

    room.onMessage('*', (type: string | number, payload: unknown) => {
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

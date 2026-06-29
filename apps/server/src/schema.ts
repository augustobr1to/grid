import { MapSchema, Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') id = '';
  @type('string') name = '';
  @type('string') team = 'blue';
  @type('number') x = 0;
  @type('number') y = 1.7;
  @type('number') z = 0;
  @type('number') qx = 0;
  @type('number') qy = 0;
  @type('number') qz = 0;
  @type('number') qw = 1;
  @type('number') pitch = 0;
  @type('number') lastProcessedSeq = 0;
}

export class GridRoomState extends Schema {
  @type('number') tick = 0;
  @type('number') serverTime = Date.now();
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

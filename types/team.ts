import type { Player } from './player';

export type Team = {
  id: string;
  players: Player[];
};

export type ReservePlayer = {
  player: Player;
  reserveTimestamp: number;
};

export type TeamState = {
  teams: Team[];
  reserves: ReservePlayer[];
};

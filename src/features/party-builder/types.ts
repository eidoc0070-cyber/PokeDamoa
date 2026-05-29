import type { StatKey } from '../../data/constants.js';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface PokemonSlot {
  pokemonId: number;
  nickname?: string;
  itemId?: number | null;
  abilityId?: number | null;
  moveIds: (number | null)[];
  evs: Stats;
  ivs: Stats;
  natureId: number;
  level: number;
  gender?: 'M' | 'F' | 'N';
  isShiny?: boolean;
  teraTypeId?: number | null;
}

export interface Party {
  id: string;
  name: string;
  members: PokemonSlot[];
  createdAt: string;
  updatedAt: string;
}

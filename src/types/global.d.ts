import { Store, AppState } from '../state/store';
import * as PokemonMath from '../utils/pokemon-math';
import * as Hangul from '../utils/hangul';
import { PokemonData, MoveData, AbilityData, ItemData } from '../data/pokeapi';

declare global {
  interface Window {
    deferredPrompt?: any;
    PokeApp: {
      store: Store<AppState>;
      math: typeof PokemonMath;
      hangul: typeof Hangul;
      data: () => {
        pokemon: PokemonData[] | null;
        moves: MoveData[] | null;
        abilities: AbilityData[] | null;
        items: ItemData[] | null;
      };
    };
  }
}

export {};

import './style.css';
import { initApp } from './app.js';
import { globalStore } from './state/store.js';
import * as PokemonMath from './utils/pokemon-math.js';
import * as Hangul from './utils/hangul.js';
import { getLoadedData } from './data/pokeapi.js';

// 개발 및 디버깅 편의를 위해 전역 객체 노출
window.PokeApp = {
  store: globalStore,
  math: PokemonMath,
  hangul: Hangul,
  data: getLoadedData
};

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (rootElement) {
  initApp(rootElement);
} else {
  console.error("Root element #app not found!");
}

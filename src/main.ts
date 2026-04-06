import './style.css';
import { initApp } from './app.js';

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (rootElement) {
  initApp(rootElement);
} else {
  console.error("Root element #app not found!");
}

import { Game } from './game/Game';

const container = document.getElementById('app');
if (!container) throw new Error('Élément #app introuvable');

new Game(container).start();

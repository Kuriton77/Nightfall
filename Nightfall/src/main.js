import { Game } from './Game.js';

// Entry point: wire the canvas and start the loop.
const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.start();

// Expose for debugging/tuning from the console.
window.__game = game;

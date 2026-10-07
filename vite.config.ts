import { defineConfig } from 'vite';

export default defineConfig({
  // Chemins relatifs : le jeu marche aussi ouvert depuis un sous-dossier (plan B local)
  base: './',
  server: {
    // Rend le serveur accessible depuis le téléphone sur le même wifi
    host: true,
  },
  build: {
    // Three.js pèse à lui seul ~500 ko, c'est normal pour un jeu 3D
    chunkSizeWarningLimit: 1000,
  },
  preview: {
    host: true,
  },
});

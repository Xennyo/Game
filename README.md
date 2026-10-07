# Jeu des souvenirs

Un jeu 3D dans le navigateur, cadeau d'anniversaire pour Maëlle. Le contexte complet est dans `CLAUDE.md` et `docs/`.

## Installer le jeu sur ton ordinateur (une seule fois)

1. **Installer Node.js** : va sur https://nodejs.org, télécharge la version **LTS** et installe-la (suivant, suivant, terminer).
   Vérifie ensuite dans un terminal (Mac : app *Terminal* ; Windows : *PowerShell*) :
   ```bash
   node -v
   ```
   Un numéro de version doit s'afficher (22 ou plus).
2. **Récupérer le dépôt** avec GitHub Desktop (https://desktop.github.com) : connecte-toi avec ton compte GitHub, puis *File > Clone repository* et choisis `Xennyo/Game`.
3. **Installer les dépendances** : dans GitHub Desktop, *Repository > Open in Terminal* (ou *Open in Command Prompt*), puis :
   ```bash
   npm install
   ```

## Lancer le jeu

```bash
npm run dev
```

Ouvre l'adresse affichée après `Local:` (en général http://localhost:5173) dans ton navigateur. Le jeu se recharge tout seul quand le code change. `Ctrl + C` dans le terminal pour arrêter.

### Tester sur ton téléphone

1. Ton téléphone doit être sur le **même wifi** que l'ordinateur.
2. Lance `npm run dev`, puis ouvre sur le téléphone l'adresse affichée après `Network:` (du genre http://192.168.1.12:5173).
3. Si la page ne s'ouvre pas, ton pare-feu bloque peut-être la connexion : sur Windows, accepte la fenêtre "Autoriser l'accès" qui apparaît au premier lancement.

## Recommencer une partie

La progression est sauvegardée dans le navigateur. Pour tout reprendre depuis l'intro, ajoute `?recommencer` à l'adresse : http://localhost:5173/?recommencer

## Récupérer une nouvelle version

Dans GitHub Desktop : choisis la branche (menu *Current branch*), puis *Fetch origin* / *Pull origin*. Relance ensuite `npm install` puis `npm run dev`.

## Autres commandes

```bash
npm run build      # construit la version finale dans dist/
npm run preview    # teste cette version finale en local
```

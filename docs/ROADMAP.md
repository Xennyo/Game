# Roadmap

Une étape à la fois. À la fin de chaque étape, Claude s'arrête, explique comment tester, et attend la validation d'Olivier.
Le jeu doit être jouable de bout en bout le plus tôt possible (dès l'étape 4), puis on l'embellit.

Cocher les cases au fur et à mesure.

---

## Étape 0 : Mise en place

- [x] Projet Vite + TypeScript + Three.js initialisé
- [x] Structure de dossiers de `TECH.md` créée
- [x] `.gitignore`, scripts npm, `npm run dev -- --host` documenté pour tester sur téléphone
- [x] Une scène vide avec un sol, une lumière et un cube s'affiche

**Validation** : Olivier voit le cube sur son ordinateur et sur son téléphone (même wifi).

## Étape 1 : Se déplacer

- [ ] Avatar placeholder (capsule) contrôlable au clavier et au joystick tactile
- [ ] Caméra à la troisième personne qui suit l'avatar
- [ ] Petit monde délimité (elle ne peut pas sortir de la carte)

**Validation** : se promener est agréable sur le support principal.

## Étape 2 : Le maître du jeu

- [ ] Placeholder du MJ dans le monde
- [ ] Système de dialogue (bulle, avancer d'un tap ou d'un clic) alimenté par `dialogues.json`
- [ ] Introduction jouée au lancement
- [ ] Le MJ peut se déplacer ou se téléporter vers un point donné

**Validation** : l'intro se joue, les dialogues sont lisibles sur téléphone.

## Étape 3 : Le système de souvenirs

- [ ] Chargement de `souvenirs.json` (avec 2 souvenirs de test)
- [ ] Zones de souvenirs avec marqueur visible
- [ ] Déclenchement : fondu, affichage de la carte souvenir (photo + texte), répliques du MJ
- [ ] Déblocage dans l'ordre, compteur, indicateur vers le prochain souvenir
- [ ] Sauvegarde de la progression dans `localStorage`

**Validation** : on peut enchaîner les 2 souvenirs de test sans bug.

## Étape 4 : Version jouable de bout en bout

- [ ] Écran titre, final et écran de fin (galerie des souvenirs)
- [ ] Tous les souvenirs de `SOUVENIRS.md` intégrés, avec des scènes encore simples
- [ ] Bouton "rejoindre le MJ" et réapparition en cas de problème

**Validation** : Olivier joue le jeu complet, du début à la fin, sur le support principal. À partir d'ici, le cadeau existe : tout le reste est du bonus.

## Étape 5 : Les vrais avatars

- [ ] Intégration du modèle de la joueuse avec ses animations (immobile, marche, course)
- [ ] Intégration du modèle du MJ avec ses animations et son geste de salut
- [ ] Poses des avatars dans les scènes de souvenirs

**Validation** : les avatars sont reconnaissables et bien animés.

## Étape 6 : Les scènes de souvenirs

- [ ] Décors low poly pour chaque souvenir, à partir des packs d'assets
- [ ] Ambiance propre à chaque scène (ciel, lumière, éventuellement météo)
- [ ] Détails clés et clins d'œil de chaque fiche

**Validation** : chaque souvenir est reconnaissable. Olivier valide scène par scène.

## Étape 7 : Finitions

- [ ] Musique et effets sonores
- [ ] Monde principal décoré (végétation, chemins, lumière de fin de journée)
- [ ] Surprise finale soignée
- [ ] Optimisation : poids des assets, fluidité sur téléphone

## Étape 8 : Mise en ligne

- [ ] Déploiement sur Cloudflare Pages
- [ ] Accès restreint (voir `TECH.md`)
- [ ] Test complet sur son appareil ou un appareil équivalent
- [ ] Plan B prêt (version locale)

**Validation** : au plus tard une semaine avant l'anniversaire.

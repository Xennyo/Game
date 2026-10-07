# Game Design

## Informations clés

| Champ | Valeur |
|-------|--------|
| Date de l'anniversaire | [À COMPLÉTER] |
| Date limite de livraison (une semaine avant) | [À COMPLÉTER] |
| Prénom de la joueuse | [À COMPLÉTER] |
| Support principal | [À COMPLÉTER : téléphone (iPhone / Android) ou ordinateur] |
| Durée de jeu visée | 15 à 30 minutes |
| Nombre de souvenirs | 5 à 10 (voir `SOUVENIRS.md`) |

## Concept

Elle incarne son propre avatar 3D low poly dans un petit monde coloré et chaleureux. Le monde est une carte des souvenirs du couple : chaque zone correspond à un moment vécu ensemble. En s'approchant d'une zone, elle débloque le souvenir : la scène est recréée en 3D, avec une photo d'époque et un texte d'Olivier.

L'avatar d'Olivier est le maître du jeu. Il l'accueille, lui explique quoi faire, l'oriente vers le souvenir suivant et commente chaque moment. Le parcours se termine par une surprise finale.

## Personnages

### La joueuse (son avatar)
- Modèle 3D low poly à son image, animé : immobile, marche, course (éventuellement une animation de joie)
- Contrôlée par elle, en vue à la troisième personne

### Le maître du jeu (avatar d'Olivier)
- Modèle 3D low poly à son image, mêmes animations de base, plus un geste (salut ou signe de la main)
- Personnage non jouable qui :
  - l'accueille au début et explique les contrôles
  - indique où aller ensuite (il peut se téléporter près du prochain souvenir et l'attendre)
  - introduit chaque souvenir par une réplique, puis le commente après
  - délivre le message final
- Ses répliques s'affichent dans une bulle de dialogue en bas de l'écran, qu'elle fait avancer d'un tap ou d'un clic

## Déroulé

1. **Écran titre** : titre du jeu, bouton "Jouer". Musique douce si possible (lancée au premier tap, obligatoire sur mobile)
2. **Introduction** : elle apparaît dans le monde, le MJ vient la saluer et explique le principe et les contrôles
3. **Exploration** : elle se déplace vers les zones de souvenirs, signalées par un marqueur visible (lumière, halo, particules). Le MJ indique toujours le prochain objectif, et une petite flèche ou un indicateur l'aide à s'orienter
4. **Déblocage d'un souvenir** : en entrant dans la zone
   - courte transition (fondu)
   - la scène 3D recréée apparaît, avec les deux avatars placés dans la scène
   - affichage de la photo et du texte du souvenir
   - réplique du MJ
   - retour à l'exploration, le souvenir est marqué comme débloqué
5. **Progression** : les souvenirs se débloquent dans l'ordre chronologique (plus simple à guider et plus narratif). Un compteur affiche "souvenirs : 3 / 8"
6. **Final** : une fois tous les souvenirs débloqués, le MJ l'emmène vers une dernière zone pour la surprise finale (message, déclaration, indice vers le vrai cadeau, à définir dans `SOUVENIRS.md`)
7. **Écran de fin** : message de fin, possibilité de revoir la galerie des souvenirs

## Recréation des scènes

Chaque souvenir est un mini-décor 3D qui évoque le moment, sans chercher le réalisme :
- quelques éléments clés suffisent (un banc et un lampadaire, une table de restaurant, une plage avec un parasol)
- les deux avatars sont placés dans la scène, dans une pose qui rappelle le moment
- une ambiance propre au souvenir : couleur du ciel, heure du jour, météo
- la photo réelle est montrée à côté, comme un cadre ou une polaroid

Les éléments de décor viennent de packs d'assets low poly gratuits (voir `TECH.md`), pour garder un style cohérent.

## Contrôles

- **Téléphone** : joystick virtuel à gauche, la caméra suit automatiquement. Tap pour faire avancer les dialogues
- **Ordinateur** : ZQSD ou flèches pour se déplacer, souris pour orienter la caméra (optionnel), Espace ou clic pour les dialogues
- Pas de saut, pas de combat, pas de mort : rien qui puisse la bloquer ou la frustrer

## Ambiance

- Style low poly, couleurs chaudes et douces, lumière de fin de journée
- Musique calme en fond, petits sons de déblocage
- Ton des textes : tendre, avec de l'humour complice

## Hors périmètre

Pour garder le projet réaliste, on ne fait pas :
- de multijoueur
- de physique complexe ou de saut
- de compte, de serveur ou de base de données
- de mini-jeux (sauf s'il reste du temps à la fin)

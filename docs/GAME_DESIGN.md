# Game Design

## Informations clés

| Champ | Valeur |
|-------|--------|
| Date de l'anniversaire | 24 novembre 2026 |
| Date limite de livraison (une semaine avant) | 17 novembre 2026 |
| Prénom de la joueuse | Maëlle |
| Support principal | Ordinateur (potentiellement modeste), téléphone possible en secours : on garde clavier et joystick tactile |
| Durée de jeu visée | 15 à 30 minutes |
| Nombre de souvenirs | 5 à 10 (voir `SOUVENIRS.md`) |

## Concept

Elle incarne son propre avatar 3D low poly dans un petit monde coloré et chaleureux. Le monde est une carte des souvenirs du couple : chaque zone correspond à un moment vécu ensemble. En s'approchant d'une zone, elle débloque le souvenir : la scène est recréée en 3D, avec une photo d'époque et un texte d'Olivier.

L'avatar d'Olivier est le maître du jeu, sous forme de **PNJ** (personnage non jouable) : Olivier ne joue pas pendant la partie, son avatar suit un script écrit à l'avance. Il l'accueille, lui explique quoi faire, l'oriente vers le souvenir suivant et commente chaque moment. Le parcours se termine par une surprise finale.

## Personnages

### La joueuse (son avatar)
- Figurine 3D style pâte à modeler, d'après l'image de référence d'Olivier (longs cheveux ondulés couleur miel avec la raie au milieu, yeux bleus, grand sourire, t-shirt beige, pantalon large blanc à fleurs vertes, ballerines), animée : immobile, marche, course
- Contrôlée par elle, en vue à la troisième personne

### Le maître du jeu (avatar d'Olivier)
- Figurine 3D du même style (grosses mèches noires sur le front, yeux bruns, barbe et moustache noires, t-shirt noir avec un logo rose trèfle et bol de nouilles, pantalon gris clair ample, bracelet de perles), mêmes animations de base, plus un signe de la main
- **Personnage non jouable (PNJ), entièrement automatique** : personne ne le contrôle pendant la partie. Ses déplacements, ses gestes et ses répliques sont écrits à l'avance dans les données du jeu. Maëlle joue seule
- Il :
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
   - courte transition (fondu) et réplique du MJ
   - **cinématique d'ouverture** : la scène 3D recréée apparaît et vos deux avatars rejouent le début du moment (ils marchent, se retrouvent, dialoguent). Elle avance d'un clic
   - **elle joue la suite** : elle reprend le contrôle de son avatar dans le décor et fait 2 à 4 actions simples qui terminent le moment (rejoindre ta table, s'asseoir à côté de toi, toucher un objet, t'embrasser). Un marqueur indique toujours l'action suivante, impossible de se tromper
   - affichage de la photo et du texte du souvenir, puis réplique du MJ
   - retour à l'exploration, le souvenir est marqué comme débloqué
   - **transition vers le suivant** : fondu, retour dans le pré. Le MJ dit sa réplique « après », puis va attendre près du souvenir suivant. Un halo marque l'endroit, une flèche au bord de l'écran montre la direction. Elle n'a que quelques secondes de marche : c'est une respiration, pas une quête
   - **trace dans le pré** : chaque souvenir débloqué laisse un objet dans le monde (une polaroid sur un chevalet, ou un objet clin d'œil propre au souvenir). Le pré se remplit au fil de votre histoire
5. **Progression** : les souvenirs se débloquent dans l'ordre chronologique (plus simple à guider et plus narratif). Un compteur affiche "souvenirs : 3 / 8"
6. **Final** : une fois tous les souvenirs débloqués, le MJ l'emmène vers une dernière zone pour la surprise finale (message, déclaration, indice vers le vrai cadeau, à définir dans `SOUVENIRS.md`)
7. **Écran de fin** : message de fin, possibilité de revoir la galerie des souvenirs

## Recréation des scènes

Chaque souvenir se **rejoue en direct**, ce n'est pas une image figée d'un lieu. C'est un mini-décor 3D qui évoque le moment, sans chercher le réalisme :
- quelques éléments clés suffisent (un banc et un lampadaire, une table de restaurant, une plage avec un parasol)
- le souvenir est une suite de petites étapes décrites dans les données : cinématique (les avatars bougent et parlent tout seuls), puis actions jouées par elle (aller à un point, interagir avec un objet ou avec l'avatar d'Olivier, qui réagit selon le script)
- les actions restent très simples : pas d'échec possible, pas de timing, pas de mini-jeu
- une ambiance propre au souvenir : couleur du ciel, heure du jour, météo
- la photo réelle est montrée à côté, comme un cadre ou une polaroid

Les éléments de décor viennent de packs d'assets low poly gratuits (voir `TECH.md`), pour garder un style cohérent.

## Dialogues

- Toutes les répliques sont écrites par Olivier (fiches de `SOUVENIRS.md`), jamais générées. Claude peut proposer un brouillon à partir d'une idée, Olivier valide
- Affichage dans une bulle en bas de l'écran, avec le nom de qui parle (Olivier ou Maëlle), pendant que les avatars bougent. Elle avance d'un clic ou d'un tap
- Option : certaines répliques enregistrées avec la voix d'Olivier (mémo vocal, converti en fichier audio léger) jouées pendant les cinématiques

## Contrôles

- **Téléphone** : joystick virtuel qui apparaît sous le pouce sur la moitié gauche de l'écran (pousser à fond pour courir), glisser sur la moitié droite pour tourner la caméra. La caméra suit automatiquement. Tap pour faire avancer les dialogues
- **Ordinateur** : ZQSD ou flèches pour se déplacer (WASD marche aussi sur un clavier QWERTY), Maj pour courir, glisser avec la souris pour tourner la caméra (optionnel), Espace ou clic pour les dialogues
- Pas de saut, pas de combat, pas de mort : rien qui puisse la bloquer ou la frustrer

## Ambiance

- Style low poly, couleurs chaudes et douces, lumière de fin de journée
- Musique calme en fond, petits sons de déblocage
- Ton des textes : tendre, avec de l'humour complice

## Hors périmètre

Pour garder le projet réaliste, on ne fait pas :
- de multijoueur : Olivier ne joue pas en même temps qu'elle, son avatar est un PNJ
- de physique complexe ou de saut
- de compte, de serveur ou de base de données
- de mini-jeux (sauf s'il reste du temps à la fin)

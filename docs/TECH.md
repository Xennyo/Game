# Technique

## Stack

| Besoin | Choix | Pourquoi |
|--------|-------|----------|
| Moteur 3D | Three.js | Standard du web 3D, très documenté, tourne dans tous les navigateurs |
| Outil de build | Vite | Démarrage instantané, rechargement automatique, build simple |
| Langage | TypeScript | Moins d'erreurs, et Claude s'y retrouve mieux sur un projet qui grandit |
| Joystick mobile | Joystick maison | Quelques lignes de code, aucune dépendance en plus |
| Hébergement | Cloudflare Pages | Déjà utilisé par Olivier, gratuit, déploiement automatique depuis GitHub |

Pas de moteur physique au départ : un sol plat (ou un terrain simple) et des collisions par boîtes englobantes suffisent pour se promener. Ajouter Rapier seulement si c'est vraiment nécessaire.

## Architecture proposée

```
.
├── CLAUDE.md
├── docs/
├── public/
│   ├── models/          # avatars et décors en .glb
│   ├── photos/          # photos des souvenirs en .webp
│   └── audio/           # musique et sons
└── src/
    ├── main.ts          # point d'entrée
    ├── game/
    │   ├── Game.ts      # boucle principale, gestion des états (titre, exploration, souvenir, fin)
    │   ├── World.ts     # chargement du monde et des zones
    │   ├── Avatar.ts    # ce que savent faire les deux avatars (marcher, s'asseoir, saluer, tenir)
    │   ├── Modele.ts    # avatar de secours construit dans le code, et ses animations
    │   ├── ModeleImporte.ts # vrai modèle .glb (Meshy) et ses animations
    │   ├── Player.ts    # avatar de la joueuse, déplacements, animations
    │   ├── GameMaster.ts# avatar du MJ (PNJ scripté) : déplacements automatiques, dialogues
    │   ├── Camera.ts    # caméra à la troisième personne
    │   ├── Input.ts     # clavier et joystick tactile
    │   ├── Marker.ts    # halo lumineux au sol (là où elle doit aller)
    │   ├── Script.ts    # lecteur de scripts : enchaîne dialogues, déplacements du MJ, actions de la joueuse
    │   ├── Memory.ts    # format d'un souvenir et construction de sa scène 3D
    │   ├── Formes.ts    # formes simples de décor décrites dans les données
    │   └── Guide.ts     # flèche au sol vers le prochain objectif
    ├── ui/
    │   ├── Fondu.ts     # fondu au noir
    │   ├── Dialogue.ts  # bulle de dialogue du MJ
    │   ├── MemoryCard.ts# affichage photo et texte
    │   └── Hud.ts       # compteur de souvenirs, indicateur de direction
    ├── data/
    │   ├── souvenirs.json  # contenu des souvenirs (généré depuis docs/SOUVENIRS.md)
    │   └── dialogues.json  # noms affichés + script de l'intro (et plus tard transitions, final)
    └── utils/
        └── save.ts      # sauvegarde de la progression dans localStorage
```

L'interface (dialogues, photos, textes) se fait en HTML et CSS par-dessus le canvas 3D : plus simple et plus lisible que du texte en 3D.

### Scripts

L'intro et chaque souvenir sont des **scripts** : des listes d'étapes jouées dans l'ordre par `Script.ts`. `qui` vaut `"mj"` (Olivier) ou `"joueuse"` (Maëlle). Les angles sont en degrés (180 = tourné vers le fond, -z). Dans un souvenir, les positions sont relatives au centre de la scène.

| Étape | Effet |
|-------|-------|
| `{ "type": "dialogue", "lignes": [{ "qui": "mj", "texte": "...", "texteTactile": "..." }] }` | bulle de dialogue, elle avance d'un clic. `texteTactile` (optionnel) remplace le texte sur téléphone |
| `{ "type": "placer", "qui": "mj", "position": [x, 0, z], "angle": 180 }` | pose un avatar quelque part, sans animation |
| `{ "type": "marcher", "qui": "mj", "vers": [x, 0, z], "attendre": false }` | marche jusqu'au point (`"vers": "joueuse"` : jusque devant elle). Avec `"attendre": false`, l'étape suivante démarre tout de suite (les deux marchent en même temps) |
| `{ "type": "pose", "qui": "joueuse", "pose": "assis", "angle": 180 }` | `assis` ou `debout` |
| `{ "type": "regarder", "qui": "mj", "vers": "joueuse" }` | tourne la tête vers l'autre avatar, un point `[x, y, z]`, ou `null` |
| `{ "type": "tenir", "qui": "mj", "objet": { forme } }` | lui met un objet dans les mains (une boîte à pizza...) |
| `{ "type": "saluer", "qui": "mj" }` | petit geste de salut |
| `{ "type": "teleporter", "vers": [x, 0, z] }` | le MJ disparaît et réapparaît ailleurs |
| `{ "type": "aller", "cible": [x, 0, z], "aide": "...", "aideTactile": "..." }` | elle reprend le contrôle : un halo apparaît, le script attend qu'elle entre dedans |
| `{ "type": "camera", "position": [x, y, z], "regard": [x, y, z], "instantane": true }` | plan de caméra fixe (glisse en douceur, sauf `instantane`) |
| `{ "type": "cameraSuit" }` | la caméra suit de nouveau l'avatar |
| `{ "type": "pause", "secondes": 1 }` | attente |

En dehors des étapes `aller`, elle ne contrôle pas son avatar et la caméra cadre les deux personnages. Une étape inconnue est ignorée (jamais de blocage).

### Format d'un souvenir dans `souvenirs.json`

```json
{
  "id": "01-rencontre",
  "titre": "Notre rencontre",
  "date": "Septembre 2022",
  "position": [0, 0, -5],
  "attenteMj": [2, 0, -4],
  "photo": "photos/01-rencontre.webp",
  "texte": "...",
  "mjAvant": ["Est ce que tu te souviens de notre première rencontre?"],
  "mjApres": ["Si j'avais su où ça nous mènerait"],
  "scene": {
    "rayon": 6,
    "ambiance": { "ciel": "#cfe6f7", "lumiere": "jour", "sol": "#d9cbb5" },
    "decor": [
      { "nom": "tableau", "forme": "boite", "position": [0, 2.2, -6], "taille": [5, 1.6, 0.08], "couleur": "#2f4a3a" }
    ]
  },
  "sequence": [ "... étapes de script ..." ]
}
```

- `position` : où se trouve le halo du souvenir dans le pré. `attenteMj` (optionnel) : où le MJ l'attend
- `lumiere` : `jour`, `soir`, `couvert` ou `nuit`
- `decor` : formes simples (`boite` [largeur, hauteur, profondeur], `cylindre` et `cone` [rayon, hauteur], `sphere` [rayon], `capsule` [rayon, hauteur]), avec `rotation` en degrés. La forme `figurant` ajoute un petit personnage d'une seule couleur, sans visage (`pose` : `assis` ou `debout`, `position` = le sol sous ses pieds) : il est figé et fusionné en un seul objet, donc léger. Elles seront remplacées par des modèles des packs low poly à l'étape 6
- Déroulé : elle entre dans le halo, répliques `mjAvant`, fondu, la `sequence` se joue dans la scène, carte souvenir (photo + texte), fondu, retour au pré où une polaroid sur chevalet reste en souvenir, répliques `mjApres`, puis le MJ part attendre près du souvenir suivant

### Sauvegarde

La progression (intro vue, nombre de souvenirs débloqués) est gardée dans le `localStorage` du navigateur. Pour recommencer depuis le début : ajouter `?recommencer` à l'adresse (par exemple http://localhost:5173/?recommencer).

## Pipeline des modèles 3D

### Les deux avatars

Première version (octobre 2026), gardée comme avatar de secours : les avatars sont **construits directement dans le code** (`src/game/Modele.ts`) à partir de formes simples, dans un style low poly « figurine », d'après les photos fournies par Olivier. Pas besoin d'outil d'IA, de Mixamo ni de Blender, et rien à télécharger : c'est léger, fiable et modifiable à tout moment.

- **Apparence** dans `src/data/avatars.json` : taille, couleurs (peau, yeux, lèvres, cheveux et reflets, haut, pull intérieur, pantalon, chaussures), coiffure (`longue-bouclee` : une cinquantaine de mèches en anglaises ; `courte-ondulee` : mèches courtes qui retombent sur le front), barbe (courte, bords fondus, la peau transparaît un peu), cils, taches de rousseur, joues, manches (`longues` ou `courtes`), motif sur le t-shirt. Changer une couleur ne demande pas de toucher au code
- **Visage** : tête en forme d'œuf, yeux avec iris, pupille, reflets et paupière, sourcils, nez, sourire. Les zones de cheveux et de barbe épousent la forme de la tête
- **Légèreté** : dans chaque articulation, les morceaux de même couleur sont fusionnés (environ 25 000 triangles par avatar)
- **Squelette simple** : hanches, genoux, épaules, coudes et tête, animés par le code
- **Animations** : immobile (respiration, clignement des yeux), marche et course (selon la vitesse, avec les cheveux qui suivent), position assise (le bassin descend à 0,47 m, hauteur des bancs et des gradins), salut de la main (1,4 s), objet tenu à deux mains

**Vrais modèles 3D (décision d'octobre 2026)** : Olivier génère les avatars depuis des photos avec Meshy (guide : `docs/AVATARS_IA.md`). Dans `src/data/avatars.json`, le champ `modele3d` d'un avatar (`null` par défaut) accepte `{ "fichier": "models/olivier.glb", "hauteur": 1.75, "rotation": 0, "descenteAssis": 0, "animations": {...} }`. Le jeu (`src/game/ModeleImporte.ts`) charge le `.glb`, le met debout à la bonne hauteur, et retrouve tout seul les animations d'après leur nom (idle, walk, run, wave, sitting). On peut aussi imposer les noms avec `animations` (`immobile`, `marche`, `course`, `salut`, `assis`). Tant que le fichier n'est pas chargé, ou s'il est absent ou abîmé, l'avatar construit dans le code reste affiché : le jeu ne bloque jamais.

Les outils et leurs conditions (gratuité, limites, licences) évoluent : vérifier au moment de s'en servir.

### Les décors

- Packs low poly gratuits en licence CC0, par exemple Kenney (kenney.nl) et Quaternius, pour garder un style cohérent
- Chaque scène de souvenir est soit un fichier `.glb` assemblé dans Blender, soit composée directement dans le code à partir d'éléments du pack (placement décrit dans les données). La seconde option évite Blender : à privilégier au début

## Performance

- Cible : fluide sur un téléphone de milieu de gamme récent
- Limiter les ombres dynamiques (une seule lumière qui projette des ombres, ou ombres précalculées)
- Charger les scènes de souvenirs à la demande, ou les précharger pendant l'intro avec un écran de chargement
- Taille totale visée : moins de 30 Mo

## Déploiement

- Dépôt GitHub **privé**, connecté à Cloudflare Pages (build : `npm run build`, dossier de sortie : `dist`)
- **Restreindre l'accès** au jeu : le plus simple est Cloudflare Access (Zero Trust) avec une règle qui n'autorise que l'adresse email d'Olivier et celle de sa copine. Alternative plus légère : une URL difficile à deviner, en sachant que n'importe qui ayant le lien peut jouer
- Tester la version déployée sur son appareil (ou un appareil équivalent) au moins une semaine avant l'anniversaire
- Prévoir un plan B le jour J : la version locale lancée sur l'ordinateur d'Olivier

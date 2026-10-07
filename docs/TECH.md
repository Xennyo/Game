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
    │   ├── Avatar.ts    # corps placeholder commun aux deux avatars
    │   ├── Player.ts    # avatar de la joueuse, déplacements, animations
    │   ├── GameMaster.ts# avatar du MJ (PNJ scripté) : déplacements automatiques, dialogues
    │   ├── Camera.ts    # caméra à la troisième personne
    │   ├── Input.ts     # clavier et joystick tactile
    │   ├── Marker.ts    # halo lumineux au sol (là où elle doit aller)
    │   ├── Script.ts    # lecteur de scripts : enchaîne dialogues, déplacements du MJ, actions de la joueuse
    │   └── Memory.ts    # zone de souvenir : déclenchement, scène, séquence (cinématique puis actions jouées), déblocage
    ├── ui/
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

L'intro (et plus tard chaque souvenir) est un **script** : une liste d'étapes jouées dans l'ordre par `Script.ts`. Étapes disponibles :

| Étape | Effet |
|-------|-------|
| `{ "type": "dialogue", "lignes": [{ "qui": "mj", "texte": "...", "texteTactile": "..." }] }` | bulle de dialogue, elle avance d'un clic. `texteTactile` (optionnel) remplace le texte sur téléphone |
| `{ "type": "placerMj", "position": [x, 0, z] }` | pose le MJ quelque part, sans animation |
| `{ "type": "mjMarche", "vers": [x, 0, z] }` ou `"vers": "joueuse"` | le MJ marche jusqu'au point, ou jusque devant elle |
| `{ "type": "mjTeleporte", "vers": [x, 0, z] }` | le MJ disparaît et réapparaît ailleurs |
| `{ "type": "mjSalue" }` | petit geste de salut |
| `{ "type": "aller", "cible": [x, 0, z], "aide": "...", "aideTactile": "..." }` | un halo apparaît, le script attend qu'elle entre dedans |
| `{ "type": "pause", "secondes": 1 }` | attente |

Pendant un dialogue, l'avatar de la joueuse ne bouge pas et la caméra cadre les deux personnages. Une étape inconnue est ignorée (jamais de blocage).

### Format d'un souvenir dans `souvenirs.json`

```json
{
  "id": "01-premier-rdv",
  "titre": "Notre premier rendez-vous",
  "date": "Juin 2023",
  "position": [12, 0, -8],
  "scene": "scenes/01-premier-rdv.glb",
  "ambiance": { "ciel": "#f6a96b", "lumiere": "soir" },
  "posesAvatars": { "joueuse": "assise", "mj": "assis" },
  "photo": "photos/01-premier-rdv.webp",
  "texte": "...",
  "sequence": [
    { "type": "cinematique", "actions": [
      { "qui": "mj", "allerA": [2, 0, 1] },
      { "qui": "joueuse", "allerA": [3, 0, 1] },
      { "qui": "mj", "dit": "Te voilà enfin !" }
    ] },
    { "type": "aller", "cible": [2, 0, 0], "aide": "Rejoins-moi à la table" },
    { "type": "interagir", "objet": "tasse", "aide": "Touche la tasse" },
    { "type": "pose", "joueuse": "assise", "mj": "assis" }
  ],
  "mjAvant": ["Tu te souviens de cet endroit ?"],
  "mjApres": ["J'étais tellement stressé ce jour-là..."]
}
```

## Pipeline des modèles 3D

### Les deux avatars

Objectif : un fichier `.glb` par avatar, low poly, rigué (avec un squelette) et avec au minimum les animations immobile, marche et course.

Étapes conseillées :
1. **Créer le modèle** à partir d'une photo, avec un outil d'IA image vers 3D (par exemple Meshy ou Tripo, en demandant un style low poly), ou avec un créateur de personnage stylisé. Alternative : partir d'un personnage low poly gratuit et l'adapter (coiffure, couleurs de vêtements)
2. **Riguer et animer** avec Mixamo (gratuit, Adobe) : importer le modèle, placer les repères, puis télécharger les animations Idle, Walking, Running et une animation de salut pour le MJ
3. **Assembler et exporter en `.glb`** avec Blender si besoin (Claude peut guider pas à pas)
4. **Compresser** avec `gltf-transform` (Claude fournira la commande)

Tant que les avatars ne sont pas prêts, le jeu utilise des capsules colorées. Le code doit permettre de remplacer un placeholder par le vrai modèle en changeant seulement le chemin du fichier.

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

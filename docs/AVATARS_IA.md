# Créer un avatar avec l'IA, depuis une photo

Ce guide explique comment fabriquer un vrai modèle 3D animé de toi (puis de Maëlle) avec **Meshy**, un site qui transforme une photo en personnage 3D. Le jeu est déjà prêt à l'accueillir : tant que le modèle n'est pas là, ou s'il y a le moindre problème, le jeu garde l'avatar actuel.

Conseil : commence par **ton** avatar. Tu peux faire autant d'essais que tu veux sur toi, et on ne touche à celui de Maëlle qu'une fois la méthode au point.

## Avant de commencer

- **Ce que ça coûte** : Meshy a une offre gratuite avec un petit nombre de crédits chaque mois (de quoi faire quelques modèles). Les conditions changent souvent : regarde sur le site au moment de t'inscrire. Tripo (tripo3d.ai) fait la même chose et peut servir de plan B.
- **Confidentialité** : la photo est envoyée sur les serveurs de Meshy. Pour la photo de Maëlle, à toi de juger si ça te va (tu peux lire leurs conditions sur le site).

## Étape 1 : la bonne photo

C'est l'étape qui compte le plus pour la ressemblance.

- **En pied** : la personne entière, de la tête aux chaussures
- **De face**, debout, droite
- **Bras un peu écartés du corps** (comme un A), mains ouvertes, jambes légèrement écartées
- **Fond simple** (un mur uni) et **bonne lumière**, sans ombre forte sur le visage
- Les vêtements qu'elle doit porter dans le jeu

Astuce qui marche souvent mieux : demander d'abord à une IA d'images (par exemple ChatGPT) de transformer la photo en **personnage 3D style dessin animé, en pied, bras écartés, fond blanc**, puis donner cette image à Meshy. Le résultat est plus propre et plus mignon qu'à partir d'une vraie photo.

## Étape 2 : générer le modèle 3D

1. Va sur **meshy.ai** et crée un compte
2. Choisis **Image to 3D**
3. Dépose ta photo (ou l'image transformée), puis clique sur **Generate**
4. Meshy propose un ou plusieurs résultats : garde celui qui te ressemble le plus. Si aucun ne va, réessaie avec une autre photo
5. Si Meshy le propose, lance aussi la **texture** (les couleurs du modèle)

## Étape 3 : le squelette (rigging)

1. Sur ton modèle, clique sur **Animate** (ou **Rig**)
2. Type de personnage : **humanoïde**
3. Meshy te demande de placer quelques repères (menton, poignets, coudes, genoux, entrejambe) : place-les au bon endroit sur le modèle, puis valide

## Étape 4 : les animations

Ajoute ces animations depuis la bibliothèque de Meshy (cherche les noms en anglais) :

| Pour le jeu | À chercher | Indispensable ? |
|-------------|------------|-----------------|
| Debout, immobile | **Idle** | oui |
| Marcher | **Walking** | oui |
| Courir | **Running** | conseillé |
| Faire coucou | **Wave** ou **Hello** | conseillé |
| Assis sur un banc | **Sitting** (assis sur une chaise) | oui (amphi et banc) |

Si l'une d'elles n'est pas disponible avec l'offre gratuite, prends la plus proche et dis-le-moi : je m'adapterai.

## Étape 5 : télécharger

1. Clique sur **Download**, puis **Animation**, puis **All Added** (toutes les animations ajoutées), puis **Single File** (un seul fichier)
2. Format : **GLB**
3. Renomme le fichier `olivier.glb` (ou `maelle.glb`)

## Étape 6 : me l'envoyer

Le plus simple : **envoie-moi le fichier ici, dans le fil** (comme pour les photos). Je m'occupe du reste :

- je le compresse pour qu'il reste léger
- je le range dans `public/models/`
- je règle sa taille, son orientation et la position assise
- je vérifie toutes les scènes et je t'envoie des aperçus

(Pour info, côté technique, c'est le champ `modele3d` dans `src/data/avatars.json`, décrit dans `docs/TECH.md`.)

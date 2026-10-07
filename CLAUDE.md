# CLAUDE.md

Instructions permanentes pour Claude Code dans ce projet.

---

## Le projet

Un jeu 3D dans le navigateur, offert par Olivier à sa copine pour son anniversaire. Elle incarne son avatar 3D low poly et explore un petit monde pour débloquer leurs souvenirs communs, chacun recréé sous forme de scène 3D. L'avatar d'Olivier est un **personnage non jouable (PNJ)** qui tient le rôle de maître du jeu (MJ) : entièrement scripté, il lui explique le jeu, la guide et l'accompagne jusqu'à une surprise finale. Olivier ne joue pas pendant la partie : tout ce que fait et dit son avatar est écrit à l'avance.

C'est un cadeau personnel, joué une fois, par une seule personne. Ce qui compte :
1. **L'émotion** : les souvenirs doivent être reconnaissables et touchants
2. **La fiabilité** : ça doit marcher du premier coup le jour J, sur son appareil
3. **La simplicité** : pas de bug bloquant, pas de contrôle compliqué, pas de moyen de se perdre

La performance graphique et la complexité du gameplay passent après.

## Documents de référence

À lire avant toute tâche importante :

| Fichier | Contenu |
|---------|---------|
| `docs/GAME_DESIGN.md` | Concept, personnages, déroulé, ambiance, contrôles |
| `docs/SOUVENIRS.md` | La liste des souvenirs et leur contenu (source de vérité) |
| `docs/TECH.md` | Stack, architecture, pipeline des modèles 3D, déploiement |
| `docs/ROADMAP.md` | Étapes de développement et critères de validation |

Quand une décision change le design ou la technique, mets à jour le document concerné dans le même commit.

## Comment travailler avec Olivier

- **Toujours en français**, tutoiement, pas de tirets longs (em dashes)
- Olivier n'est pas développeur de métier mais utilise beaucoup Claude Code. Explique simplement ce qu'il doit faire de son côté (commandes, fichiers à fournir, comment tester)
- **Une étape de la roadmap à la fois.** À la fin de chaque étape, arrête-toi, explique comment tester, et attends sa validation
- Pose des questions avant de deviner quand un souvenir ou un choix de design n'est pas clair. Ne jamais inventer le contenu d'un souvenir (lieux, dialogues, détails personnels) : propose, puis fais valider
- Sois honnête sur ce qui est faisable dans le temps restant avant l'anniversaire, et propose de couper du périmètre plutôt que de risquer un jeu inachevé

## Règles techniques

- **Le contenu est piloté par les données** : souvenirs, dialogues du MJ et textes vivent dans `src/data/`, jamais en dur dans le code. Ajouter un souvenir ne doit pas demander de toucher au code
- **Des placeholders d'abord** : formes simples (capsules, cubes) tant que les vrais modèles ne sont pas prêts. Le jeu doit être jouable de bout en bout avec des placeholders
- **Mobile en premier** si elle joue sur téléphone : tester les contrôles tactiles et les performances à chaque étape
- **Assets légers** : modèles en `.glb` compressés, photos en `.webp`, et un poids total qui reste raisonnable (objectif : moins de 30 Mo)
- **Aucun bug bloquant** : toujours prévoir une sortie (bouton pour revenir au MJ, réapparition si elle tombe hors de la carte, sauvegarde de la progression dans `localStorage`)
- Garde le code simple et lisible, avec peu de dépendances
- Lance `npm run build` avant chaque commit pour vérifier que tout compile

## Commandes

```bash
npm install        # installer les dépendances
npm run dev        # lancer le jeu en local (accessible aussi depuis le téléphone sur le même wifi avec --host)
npm run build      # construire la version de production dans dist/
npm run preview    # tester la version de production en local
```

## Confidentialité

Le dépôt est privé et contient des photos et textes personnels. Ne jamais publier ces contenus ailleurs, et vérifier avant le déploiement que l'accès au jeu en ligne est restreint (voir `docs/TECH.md`).

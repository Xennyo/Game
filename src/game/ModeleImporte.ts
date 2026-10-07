import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { EtatAnimation } from './Modele';

/**
 * Un vrai modèle 3D (.glb, par exemple généré par Meshy depuis une photo),
 * décrit dans src/data/avatars.json, champ "modele3d".
 */
export interface DescriptionModele3d {
  /** Chemin dans public/, par exemple "models/olivier.glb" */
  fichier: string;
  /** Taille du personnage debout, en mètres (le modèle est mis à cette hauteur) */
  hauteur?: number;
  /** Rotation en degrés si le modèle ne regarde pas devant lui */
  rotation?: number;
  /** De combien le modèle descend en position assise (selon l'animation "assis") */
  descenteAssis?: number;
  /** Nom des animations dans le fichier, si la détection automatique se trompe */
  animations?: Partial<Record<NomAnimation, string>>;
}

type NomAnimation = 'immobile' | 'marche' | 'course' | 'salut' | 'assis';

/** Mots cherchés dans le nom des animations, dans l'ordre de préférence */
const MOTS: Record<NomAnimation, string[]> = {
  immobile: ['idle', 'stand', 'breath', 'immobile'],
  marche: ['walk', 'marche'],
  course: ['run', 'jog', 'course'],
  salut: ['wave', 'hello', 'greet', 'salut'],
  assis: ['sitting', 'sit', 'seat', 'assis'],
};

const VITESSE_MARCHE = 3.2;
const VITESSE_COURSE = 7;

const chargeur = new GLTFLoader();

export class ModeleImporte {
  readonly racine = new THREE.Group();
  readonly descenteAssis: number;
  private melangeur: THREE.AnimationMixer;
  private actions = new Map<NomAnimation, THREE.AnimationAction>();
  private enCours: THREE.AnimationAction | null = null;

  private constructor(scene: THREE.Object3D, clips: THREE.AnimationClip[], d: DescriptionModele3d) {
    this.descenteAssis = d.descenteAssis ?? 0;

    // Met le modèle debout, les pieds au sol, à la bonne taille
    const boite = new THREE.Box3().setFromObject(scene);
    const taille = boite.getSize(new THREE.Vector3());
    const echelle = (d.hauteur ?? 1.7) / Math.max(0.01, taille.y);
    scene.scale.setScalar(echelle);
    scene.position.set(
      -((boite.min.x + boite.max.x) / 2) * echelle,
      -boite.min.y * echelle,
      -((boite.min.z + boite.max.z) / 2) * echelle,
    );
    const pivot = new THREE.Group();
    pivot.rotation.y = THREE.MathUtils.degToRad(d.rotation ?? 0);
    pivot.add(scene);
    this.racine.add(pivot);

    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        // Les personnages animés peuvent sortir de leur boîte d'origine : on les dessine toujours
        o.frustumCulled = false;
      }
    });

    this.melangeur = new THREE.AnimationMixer(scene);
    for (const nom of Object.keys(MOTS) as NomAnimation[]) {
      const clip = trouverClip(clips, nom, d.animations?.[nom]);
      if (!clip) continue;
      const action = this.melangeur.clipAction(clip);
      if (nom === 'salut') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(nom, action);
    }
    console.info(
      `Modèle ${d.fichier} : animations trouvées : ${[...this.actions.keys()].join(', ') || 'aucune'} ` +
        `(dans le fichier : ${clips.map((c) => c.name).join(', ')})`,
    );
  }

  /** Charge le fichier. En cas de problème, renvoie null (le jeu garde l'avatar de secours) */
  static async charger(d: DescriptionModele3d): Promise<ModeleImporte | null> {
    try {
      const gltf = await chargeur.loadAsync(import.meta.env.BASE_URL + d.fichier);
      return new ModeleImporte(gltf.scene, gltf.animations, d);
    } catch (e) {
      console.warn(`Impossible de charger ${d.fichier}, on garde l'avatar de secours`, e);
      return null;
    }
  }

  animer(dt: number, e: EtatAnimation, vitesse: number) {
    let voulu: NomAnimation = 'immobile';
    if (e.assis > 0.5) voulu = 'assis';
    else if (e.salut > 0 && this.actions.has('salut')) voulu = 'salut';
    else if (vitesse > 5 && this.actions.has('course')) voulu = 'course';
    else if (vitesse > 0.05) voulu = 'marche';

    const action = this.actions.get(voulu) ?? this.actions.get('immobile') ?? null;
    if (action && action !== this.enCours) {
      action.reset().fadeIn(0.25).play();
      this.enCours?.fadeOut(0.25);
      this.enCours = action;
    }
    // Les pas suivent la vitesse réelle, pour que les pieds ne glissent pas
    if (action && voulu === 'marche') action.timeScale = THREE.MathUtils.clamp(vitesse / VITESSE_MARCHE, 0.6, 2);
    else if (action && voulu === 'course') action.timeScale = THREE.MathUtils.clamp(vitesse / VITESSE_COURSE, 0.7, 1.4);
    else if (action) action.timeScale = 1;

    this.melangeur.update(dt);
  }
}

function trouverClip(clips: THREE.AnimationClip[], nom: NomAnimation, impose?: string): THREE.AnimationClip | null {
  if (impose) return clips.find((c) => c.name === impose) ?? null;
  for (const mot of MOTS[nom]) {
    const clip = clips.find((c) => c.name.toLowerCase().includes(mot));
    if (clip) return clip;
  }
  return null;
}

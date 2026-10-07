import * as THREE from 'three';
import { Modele, HANCHE, HAUTEUR_SIEGE, POSITION_MAINS, type Apparence } from './Modele';
import { ModeleImporte, type DescriptionModele3d } from './ModeleImporte';
import { ModeleMaelle, type ApparenceMaelle } from './avatars/Maelle';

export const RAYON_AVATAR = 0.4;
const VITESSE_MARCHE_SCRIPT = 3.2;
const DUREE_SALUT = 1.4;

export type Pose = 'debout' | 'assis';

/** Tourne un objet en douceur vers une direction (angle autour de l'axe vertical) */
export function tournerVers(objet: THREE.Object3D, cible: number, vitesse: number, dt: number) {
  let diff = cible - objet.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  objet.rotation.y += diff * Math.min(1, vitesse * dt);
}

/**
 * Ce que les deux avatars savent faire quand un script les pilote :
 * marcher jusqu'à un point, s'asseoir, regarder quelque chose, saluer.
 */
export class Personnage {
  readonly object = new THREE.Group();
  readonly rayon = RAYON_AVATAR;
  /** Le corps visible ; contient aussi les objets tenus en main */
  protected corps: THREE.Group;
  protected modele: Modele | ModeleMaelle;
  /** Le vrai modèle 3D, une fois chargé (sinon l'avatar construit dans le code sert de secours) */
  private importe: ModeleImporte | null = null;
  protected temps = 0;
  private phase = 0;
  private amplitude = 0;
  private assis = 0;
  protected pose: Pose = 'debout';
  /** Point que le personnage fixe du regard (sinon : comportement par défaut) */
  protected regard: THREE.Vector3 | (() => THREE.Vector3) | null = null;

  private destination: THREE.Vector3 | null = null;
  private finMarche: (() => void) | null = null;
  private salut = 0;

  constructor(apparence: (Apparence | ApparenceMaelle) & { modele3d?: DescriptionModele3d | null }) {
    this.corps = new THREE.Group();
    // Maëlle a son propre modèle (src/game/avatars/Maelle.ts)
    this.modele = apparence.style === 'maelle' ? new ModeleMaelle(apparence as ApparenceMaelle) : new Modele(apparence as Apparence);
    this.corps.add(this.modele.racine);
    this.object.add(this.corps);
    if (apparence.modele3d?.fichier) this.chargerModele3d(apparence.modele3d);
  }

  /** Remplace l'avatar de secours par le vrai modèle dès qu'il est chargé */
  private async chargerModele3d(d: DescriptionModele3d) {
    const m = await ModeleImporte.charger(d);
    if (!m) return;
    this.corps.remove(this.modele.racine);
    this.corps.add(m.racine);
    this.importe = m;
  }

  get marcheScriptee(): boolean {
    return this.destination !== null;
  }

  placer(pos: THREE.Vector3, angle?: number) {
    this.destination = null;
    this.object.position.copy(pos);
    if (angle !== undefined) this.object.rotation.y = angle;
  }

  /** Marche jusqu'au point donné. La promesse se résout à l'arrivée */
  marcherVers(pos: THREE.Vector3): Promise<void> {
    this.finMarche?.();
    this.pose = 'debout';
    this.destination = pos.clone();
    return new Promise((resolve) => (this.finMarche = resolve));
  }

  setPose(pose: Pose) {
    this.pose = pose;
  }

  regarder(cible: THREE.Vector3 | (() => THREE.Vector3) | null) {
    this.regard = cible;
  }

  /** Signe de la main */
  saluer(): Promise<void> {
    this.salut = DUREE_SALUT;
    return new Promise((resolve) => setTimeout(resolve, DUREE_SALUT * 1000));
  }

  /** Remet le personnage dans son état normal (après une scène de souvenir) */
  reinitialiser() {
    this.pose = 'debout';
    this.regard = null;
    this.destination = null;
    for (const enfant of [...this.corps.children]) {
      if (enfant.userData.tenu) this.corps.remove(enfant);
    }
  }

  /** Accroche un objet dans les mains du personnage */
  tenir(objet: THREE.Object3D) {
    objet.userData.tenu = true;
    objet.position.copy(POSITION_MAINS).multiplyScalar(this.modele.a.taille);
    this.corps.add(objet);
  }

  /** Avance la marche scriptée. Retourne vrai si le personnage marche */
  protected updateMarche(dt: number): boolean {
    if (!this.destination) return false;
    const pos = this.object.position;
    const dx = this.destination.x - pos.x;
    const dz = this.destination.z - pos.z;
    const distance = Math.hypot(dx, dz);
    const pas = VITESSE_MARCHE_SCRIPT * dt;
    if (distance <= pas) {
      pos.x = this.destination.x;
      pos.z = this.destination.z;
      this.destination = null;
      const fin = this.finMarche;
      this.finMarche = null;
      fin?.();
      return false;
    }
    pos.x += (dx / distance) * pas;
    pos.z += (dz / distance) * pas;
    tournerVers(this.object, Math.atan2(dx, dz), 10, dt);
    return true;
  }

  /** Oriente le personnage vers son point de regard, s'il en a un. Retourne vrai si c'est le cas */
  protected updateRegard(dt: number): boolean {
    if (!this.regard) return false;
    const cible = typeof this.regard === 'function' ? this.regard() : this.regard;
    const pos = this.object.position;
    tournerVers(this.object, Math.atan2(cible.x - pos.x, cible.z - pos.z), 6, dt);
    return true;
  }

  /** Anime le corps : marche ou course selon la vitesse (m/s), salut, position assise */
  protected updateCorps(dt: number, vitesse: number) {
    this.temps += dt;
    const bouge = vitesse > 0.05;
    if (bouge) this.phase += dt * (4.5 + vitesse * 1.3);
    const cible = bouge ? Math.min(1, 0.45 + (vitesse / 7) * 0.55) : 0;
    this.amplitude = THREE.MathUtils.damp(this.amplitude, cible, 10, dt);
    this.assis = THREE.MathUtils.damp(this.assis, this.pose === 'assis' && !bouge ? 1 : 0, 9, dt);
    if (this.salut > 0) this.salut = Math.max(0, this.salut - dt);

    // En position assise, le bassin descend jusqu'à la hauteur du siège
    const descente = this.importe ? this.importe.descenteAssis : HANCHE * this.modele.a.taille - HAUTEUR_SIEGE;
    this.corps.position.y = -descente * this.assis + Math.abs(Math.sin(this.phase)) * 0.05 * this.amplitude;

    // Le bras se lève et se rabaisse en douceur au début et à la fin du salut
    const salut = Math.min(1, this.salut / 0.25, (DUREE_SALUT - this.salut) / 0.25);
    const tient = this.corps.children.some((o) => o.userData.tenu);
    const etat = {
      temps: this.temps,
      phase: this.phase,
      amplitude: this.amplitude,
      assis: this.assis,
      salut: Math.max(0, salut),
      tient,
    };
    if (this.importe) {
      // Le vrai modèle a ses propres animations : pas de rebond ajouté
      this.corps.position.y = -descente * this.assis;
      this.importe.animer(dt, etat, vitesse);
    } else {
      this.modele.animer(etat);
    }
  }
}

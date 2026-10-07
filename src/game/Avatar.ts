import * as THREE from 'three';

export const RAYON_AVATAR = 0.4;
const VITESSE_MARCHE_SCRIPT = 3.2;
const DESCENTE_ASSIS = 0.45;

export type Pose = 'debout' | 'assis';

/**
 * Corps placeholder d'un avatar : une capsule colorée avec un petit "nez"
 * pour voir où il regarde. Les vrais modèles .glb le remplaceront à l'étape 5.
 */
export function creerCorpsPlaceholder(couleur: string): THREE.Group {
  const corps = new THREE.Group();

  const capsule = new THREE.Mesh(
    new THREE.CapsuleGeometry(RAYON_AVATAR, 0.9, 4, 12),
    new THREE.MeshStandardMaterial({ color: couleur, flatShading: true }),
  );
  capsule.position.y = 0.85;
  capsule.castShadow = true;
  corps.add(capsule);

  const nez = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#ffffff' }),
  );
  nez.position.set(0, 1.3, RAYON_AVATAR);
  corps.add(nez);

  return corps;
}

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
  protected temps = 0;
  protected pose: Pose = 'debout';
  /** Point que le personnage fixe du regard (sinon : comportement par défaut) */
  protected regard: THREE.Vector3 | (() => THREE.Vector3) | null = null;

  private destination: THREE.Vector3 | null = null;
  private finMarche: (() => void) | null = null;
  private salut = 0;

  constructor(couleur: string) {
    this.corps = creerCorpsPlaceholder(couleur);
    this.object.add(this.corps);
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

  /** Petit saut de joie / signe de la main (placeholder du vrai geste) */
  saluer(): Promise<void> {
    this.salut = 0.8;
    return new Promise((resolve) => setTimeout(resolve, 800));
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
    objet.position.set(0, 1.05, RAYON_AVATAR + 0.2);
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

  /** Hauteur du corps : rebond de marche, salut, ou position assise */
  protected updateCorps(dt: number, enMouvement: boolean, vitesseRebond = 9) {
    this.temps += dt;
    if (enMouvement) {
      this.corps.position.y = Math.abs(Math.sin(this.temps * vitesseRebond)) * 0.08;
    } else if (this.salut > 0) {
      this.salut -= dt;
      this.corps.position.y = Math.abs(Math.sin(this.salut * Math.PI * 2.5)) * 0.35;
    } else {
      const cible = this.pose === 'assis' ? -DESCENTE_ASSIS : 0;
      this.corps.position.y = THREE.MathUtils.damp(this.corps.position.y, cible, 10, dt);
    }
  }
}

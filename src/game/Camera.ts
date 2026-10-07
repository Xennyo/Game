import * as THREE from 'three';

const DISTANCE = 7;
const HAUTEUR = 3.6;
const SUIVI = 6; // plus c'est grand, plus la caméra colle à l'avatar

/**
 * Caméra à la troisième personne qui suit l'avatar en douceur.
 * Un script peut aussi la poser à un endroit fixe (plan de cinéma), puis la libérer.
 */
export class ThirdPersonCamera {
  readonly camera: THREE.PerspectiveCamera;
  /** Angle horizontal autour de l'avatar (0 = derrière, regard vers -z) */
  yaw = 0;
  private cible = new THREE.Vector3();
  private centre = new THREE.Vector3();
  private rayonMax: number;

  private fixe: { position: THREE.Vector3; regard: THREE.Vector3 } | null = null;
  private regardActuel = new THREE.Vector3();

  /** rayonMax : la caméra reste dans ce rayon autour du centre, pour ne jamais passer derrière la haie */
  constructor(rayonMax: number) {
    this.rayonMax = rayonMax;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  }

  setLimite(centre: THREE.Vector3, rayon: number) {
    this.centre.copy(centre);
    this.rayonMax = rayon;
  }

  /** Plan fixe : la caméra glisse jusqu'à `position` et regarde `regard`. null = reprendre le suivi */
  fixer(position: THREE.Vector3 | null, regard?: THREE.Vector3, instantane = false) {
    this.fixe = position ? { position: position.clone(), regard: (regard ?? position).clone() } : null;
    if (this.fixe && instantane) {
      this.camera.position.copy(this.fixe.position);
      this.regardActuel.copy(this.fixe.regard);
      this.camera.lookAt(this.regardActuel);
    }
  }

  /** Place la caméra directement, sans transition (au début ou après une réapparition) */
  snap(target: THREE.Vector3) {
    this.cible.copy(target);
    if (!this.fixe) this.applique();
  }

  update(dt: number, target: THREE.Vector3, yawDelta: number) {
    if (this.fixe) {
      const p = this.camera.position;
      const f = this.fixe;
      p.set(
        THREE.MathUtils.damp(p.x, f.position.x, 2.5, dt),
        THREE.MathUtils.damp(p.y, f.position.y, 2.5, dt),
        THREE.MathUtils.damp(p.z, f.position.z, 2.5, dt),
      );
      this.regardActuel.set(
        THREE.MathUtils.damp(this.regardActuel.x, f.regard.x, 2.5, dt),
        THREE.MathUtils.damp(this.regardActuel.y, f.regard.y, 2.5, dt),
        THREE.MathUtils.damp(this.regardActuel.z, f.regard.z, 2.5, dt),
      );
      this.camera.lookAt(this.regardActuel);
      // Quand le plan fixe s'arrête, le suivi repart de l'avatar
      this.cible.copy(target);
      return;
    }
    this.yaw -= yawDelta;
    this.cible.x = THREE.MathUtils.damp(this.cible.x, target.x, SUIVI, dt);
    this.cible.y = THREE.MathUtils.damp(this.cible.y, target.y, SUIVI, dt);
    this.cible.z = THREE.MathUtils.damp(this.cible.z, target.z, SUIVI, dt);
    this.applique();
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    // Écran en portrait (téléphone) : on recule un peu pour garder du champ
    this.camera.fov = aspect < 1 ? 70 : 55;
    this.camera.updateProjectionMatrix();
  }

  private applique() {
    const c = this.cible;
    // Près du bord, la caméra se rapproche de l'avatar au lieu de passer derrière la haie
    let distance = DISTANCE;
    while (distance > 2) {
      const x = c.x + Math.sin(this.yaw) * distance;
      const z = c.z + Math.cos(this.yaw) * distance;
      if (Math.hypot(x - this.centre.x, z - this.centre.z) <= this.rayonMax) break;
      distance -= 0.25;
    }
    const hauteur = HAUTEUR * (0.6 + 0.4 * (distance / DISTANCE));
    this.camera.position.set(
      c.x + Math.sin(this.yaw) * distance,
      c.y + hauteur,
      c.z + Math.cos(this.yaw) * distance,
    );
    this.regardActuel.set(c.x, c.y + 1.2, c.z);
    this.camera.lookAt(this.regardActuel);
  }
}

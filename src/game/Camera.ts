import * as THREE from 'three';

const DISTANCE = 7;
const HAUTEUR = 3.6;
const SUIVI = 6; // plus c'est grand, plus la caméra colle à l'avatar

/** Caméra à la troisième personne qui suit l'avatar en douceur */
export class ThirdPersonCamera {
  readonly camera: THREE.PerspectiveCamera;
  /** Angle horizontal autour de l'avatar (0 = derrière, regard vers -z) */
  yaw = 0;
  private cible = new THREE.Vector3();

  /** rayonMax : la caméra reste à l'intérieur de la haie pour ne jamais perdre l'avatar de vue */
  constructor(private rayonMax: number) {
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  }

  /** Place la caméra directement, sans transition (au début ou après une réapparition) */
  snap(target: THREE.Vector3) {
    this.cible.copy(target);
    this.applique();
  }

  update(dt: number, target: THREE.Vector3, yawDelta: number) {
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
      if (Math.hypot(x, z) <= this.rayonMax) break;
      distance -= 0.25;
    }
    const hauteur = HAUTEUR * (0.6 + 0.4 * (distance / DISTANCE));
    this.camera.position.set(
      c.x + Math.sin(this.yaw) * distance,
      c.y + hauteur,
      c.z + Math.cos(this.yaw) * distance,
    );
    this.camera.lookAt(c.x, c.y + 1.2, c.z);
  }
}

import * as THREE from 'three';

/**
 * Halo lumineux posé au sol : indique où la joueuse doit aller.
 * Servira aussi à signaler les zones de souvenirs (étape 3).
 */
export class Marker {
  readonly object = new THREE.Group();
  readonly rayon = 1.2;
  private temps = 0;
  private anneau: THREE.Mesh;
  private colonne: THREE.Mesh;

  constructor(couleur = '#fff3b0') {
    this.anneau = new THREE.Mesh(
      new THREE.RingGeometry(this.rayon * 0.75, this.rayon, 32),
      new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    this.anneau.rotation.x = -Math.PI / 2;
    this.anneau.position.y = 0.03;

    this.colonne = new THREE.Mesh(
      new THREE.CylinderGeometry(this.rayon * 0.9, this.rayon, 4, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: couleur,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.colonne.position.y = 2;

    this.object.add(this.anneau, this.colonne);
    this.object.visible = false;
  }

  afficher(pos: THREE.Vector3) {
    this.object.position.set(pos.x, 0, pos.z);
    this.object.visible = true;
  }

  cacher() {
    this.object.visible = false;
  }

  /** Vrai si le point donné est dans le halo */
  contient(pos: THREE.Vector3): boolean {
    const o = this.object.position;
    return this.object.visible && Math.hypot(pos.x - o.x, pos.z - o.z) < this.rayon;
  }

  update(dt: number) {
    if (!this.object.visible) return;
    this.temps += dt;
    const pulse = 1 + Math.sin(this.temps * 3) * 0.08;
    this.anneau.scale.setScalar(pulse);
    (this.colonne.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(this.temps * 3) * 0.08;
  }
}

import * as THREE from 'three';

/**
 * Petite flèche posée au sol autour de l'avatar, qui pointe vers le prochain objectif.
 * Toujours visible tant qu'elle est loin du but : impossible de se perdre.
 */
export class Guide {
  readonly object = new THREE.Group();
  private cible: THREE.Vector3 | null = null;
  private temps = 0;
  private fleche: THREE.Mesh;

  constructor() {
    const forme = new THREE.Shape();
    forme.moveTo(0, 0.45);
    forme.lineTo(0.32, 0);
    forme.lineTo(0.12, 0);
    forme.lineTo(0.12, -0.3);
    forme.lineTo(-0.12, -0.3);
    forme.lineTo(-0.12, 0);
    forme.lineTo(-0.32, 0);
    forme.closePath();
    this.fleche = new THREE.Mesh(
      new THREE.ShapeGeometry(forme),
      new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    // +90° : la pointe (vers +y dans le dessin) regarde vers +z, côté objectif
    this.fleche.rotation.x = Math.PI / 2;
    this.fleche.position.set(0, 0.05, 1.6);
    this.fleche.scale.setScalar(1.6);
    this.object.add(this.fleche);
    this.object.visible = false;
  }

  viser(cible: THREE.Vector3 | null) {
    this.cible = cible ? cible.clone() : null;
  }

  update(dt: number, joueuse: THREE.Vector3, actif: boolean) {
    this.temps += dt;
    const c = this.cible;
    const distance = c ? Math.hypot(c.x - joueuse.x, c.z - joueuse.z) : 0;
    this.object.visible = actif && c !== null && distance > 3;
    if (!this.object.visible || !c) return;
    this.object.position.set(joueuse.x, 0, joueuse.z);
    this.object.rotation.y = Math.atan2(c.x - joueuse.x, c.z - joueuse.z);
    this.fleche.position.z = 1.6 + Math.sin(this.temps * 4) * 0.12;
  }
}

import * as THREE from 'three';
import type { MoveInput } from './Input';

const VITESSE_MAX = 7; // mètres par seconde, en course
const VITESSE_ROTATION = 10;

/**
 * Avatar de la joueuse. Pour l'instant une capsule (placeholder) :
 * le vrai modèle .glb remplacera `this.corps` à l'étape 5.
 */
export class Player {
  readonly object = new THREE.Group();
  readonly rayon = 0.4;
  private corps: THREE.Group;
  private temps = 0;

  constructor() {
    this.corps = new THREE.Group();

    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(this.rayon, 0.9, 4, 12),
      new THREE.MeshStandardMaterial({ color: '#f28fb0', flatShading: true }),
    );
    capsule.position.y = 0.85;
    capsule.castShadow = true;
    this.corps.add(capsule);

    // Petit "nez" pour voir dans quelle direction regarde l'avatar
    const nez = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#ffffff' }),
    );
    nez.position.set(0, 1.3, this.rayon);
    this.corps.add(nez);

    this.object.add(this.corps);
  }

  /**
   * Déplace l'avatar selon l'entrée, orientée par l'angle de la caméra.
   * Retourne la vitesse actuelle (utile plus tard pour les animations).
   */
  update(dt: number, move: MoveInput, cameraYaw: number): number {
    this.temps += dt;
    if (move.force === 0) {
      this.corps.position.y = THREE.MathUtils.damp(this.corps.position.y, 0, 12, dt);
      return 0;
    }

    // Convertit "avant / droite" de la caméra en direction dans le monde
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const dirX = move.x * cos - move.z * sin;
    const dirZ = -move.x * sin - move.z * cos;

    const vitesse = move.force * VITESSE_MAX;
    this.object.position.x += dirX * vitesse * dt;
    this.object.position.z += dirZ * vitesse * dt;

    // Tourne en douceur vers la direction de marche
    const cible = Math.atan2(dirX, dirZ);
    let diff = cible - this.object.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.object.rotation.y += diff * Math.min(1, VITESSE_ROTATION * dt);

    // Petit rebond de marche, en attendant les vraies animations
    this.corps.position.y = Math.abs(Math.sin(this.temps * (6 + vitesse))) * 0.08;
    return vitesse;
  }
}

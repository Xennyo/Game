import * as THREE from 'three';
import type { MoveInput } from './Input';
import { creerCorpsPlaceholder, RAYON_AVATAR, tournerVers } from './Avatar';

const VITESSE_MAX = 7; // mètres par seconde, en course
const VITESSE_ROTATION = 10;

/**
 * Avatar de la joueuse. Pour l'instant une capsule rose (placeholder) :
 * le vrai modèle .glb remplacera `this.corps` à l'étape 5.
 */
export class Player {
  readonly object = new THREE.Group();
  readonly rayon = RAYON_AVATAR;
  private corps = creerCorpsPlaceholder('#f28fb0');
  private temps = 0;

  constructor() {
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
    tournerVers(this.object, Math.atan2(dirX, dirZ), VITESSE_ROTATION, dt);

    // Petit rebond de marche, en attendant les vraies animations
    this.corps.position.y = Math.abs(Math.sin(this.temps * (6 + vitesse))) * 0.08;
    return vitesse;
  }
}

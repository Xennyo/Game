import type { MoveInput } from './Input';
import { Personnage, tournerVers } from './Avatar';

const VITESSE_MAX = 7; // mètres par seconde, en course
const VITESSE_ROTATION = 10;

/**
 * Avatar de la joueuse. Pour l'instant une capsule rose (placeholder) :
 * le vrai modèle .glb remplacera le corps à l'étape 5.
 * Elle est contrôlée par le clavier ou le joystick, sauf quand un script la fait marcher.
 */
export class Player extends Personnage {
  constructor() {
    super('#f28fb0');
  }

  /**
   * Déplace l'avatar selon l'entrée, orientée par l'angle de la caméra.
   * Retourne la vitesse actuelle (utile plus tard pour les animations).
   */
  update(dt: number, move: MoveInput, cameraYaw: number): number {
    if (this.updateMarche(dt)) {
      this.updateCorps(dt, true);
      return 3;
    }
    if (move.force === 0) {
      this.updateRegard(dt);
      this.updateCorps(dt, false);
      return 0;
    }

    // Dès qu'elle bouge, elle se relève et reprend la main sur son regard
    this.pose = 'debout';
    this.regard = null;

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
    this.updateCorps(dt, true, 6 + vitesse);
    return vitesse;
  }
}

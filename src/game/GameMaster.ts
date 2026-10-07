import * as THREE from 'three';
import { Personnage, tournerVers } from './Avatar';

/**
 * Avatar d'Olivier, le maître du jeu. C'est un PNJ : personne ne le contrôle,
 * il exécute les ordres des scripts (marcher, se téléporter, saluer, s'asseoir...).
 * Quand il ne fait rien, il se tourne vers la joueuse.
 */
export class GameMaster extends Personnage {
  /** Dans le pré, il se tourne vers elle quand il ne fait rien. Dans les scènes, le script décide */
  regardAuto = true;

  constructor() {
    super('#6fa8dc');
  }

  /** Disparaît et réapparaît ailleurs, avec un petit effet de rétrécissement */
  async teleporter(pos: THREE.Vector3): Promise<void> {
    await this.animerEchelle(1, 0, 0.25);
    this.placer(pos);
    await this.animerEchelle(0, 1, 0.25);
  }

  update(dt: number, joueuse: THREE.Vector3) {
    if (this.updateMarche(dt)) {
      this.updateCorps(dt, true);
      return;
    }
    if (!this.updateRegard(dt) && this.regardAuto) {
      // Par défaut, il regarde la joueuse
      const pos = this.object.position;
      tournerVers(this.object, Math.atan2(joueuse.x - pos.x, joueuse.z - pos.z), 5, dt);
    }
    this.updateCorps(dt, false);
  }

  private animerEchelle(de: number, a: number, duree: number): Promise<void> {
    return new Promise((resolve) => {
      const debut = performance.now();
      const etape = () => {
        const t = Math.min(1, (performance.now() - debut) / (duree * 1000));
        this.object.scale.setScalar(Math.max(0.001, de + (a - de) * t));
        if (t < 1) requestAnimationFrame(etape);
        else resolve();
      };
      etape();
    });
  }
}

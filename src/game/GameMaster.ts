import * as THREE from 'three';
import { creerCorpsPlaceholder, RAYON_AVATAR, tournerVers } from './Avatar';

const VITESSE_MARCHE = 3.2;

/**
 * Avatar d'Olivier, le maître du jeu. C'est un PNJ : personne ne le contrôle,
 * il exécute les ordres du script (marcher, se téléporter, saluer).
 * Quand il ne fait rien, il se tourne vers la joueuse.
 */
export class GameMaster {
  readonly object = new THREE.Group();
  readonly rayon = RAYON_AVATAR;
  private corps = creerCorpsPlaceholder('#6fa8dc');
  private temps = 0;

  private destination: THREE.Vector3 | null = null;
  private finMarche: (() => void) | null = null;
  private salut = 0; // temps restant de l'animation de salut

  constructor() {
    this.object.add(this.corps);
  }

  placer(pos: THREE.Vector3) {
    this.object.position.copy(pos);
  }

  /** Marche jusqu'au point donné. La promesse se résout à l'arrivée */
  marcherVers(pos: THREE.Vector3): Promise<void> {
    this.finMarche?.();
    this.destination = pos.clone();
    return new Promise((resolve) => (this.finMarche = resolve));
  }

  /** Disparaît et réapparaît ailleurs, avec un petit effet de rétrécissement */
  async teleporter(pos: THREE.Vector3): Promise<void> {
    this.destination = null;
    await this.animerEchelle(1, 0, 0.25);
    this.object.position.copy(pos);
    await this.animerEchelle(0, 1, 0.25);
  }

  /** Petit saut de joie / signe de la main (placeholder du vrai geste) */
  saluer(): Promise<void> {
    this.salut = 0.8;
    return new Promise((resolve) => setTimeout(resolve, 800));
  }

  update(dt: number, joueuse: THREE.Vector3) {
    this.temps += dt;
    const pos = this.object.position;

    if (this.destination) {
      const dx = this.destination.x - pos.x;
      const dz = this.destination.z - pos.z;
      const distance = Math.hypot(dx, dz);
      const pas = VITESSE_MARCHE * dt;
      if (distance <= pas) {
        pos.x = this.destination.x;
        pos.z = this.destination.z;
        this.destination = null;
        const fin = this.finMarche;
        this.finMarche = null;
        fin?.();
      } else {
        pos.x += (dx / distance) * pas;
        pos.z += (dz / distance) * pas;
        tournerVers(this.object, Math.atan2(dx, dz), 10, dt);
        this.corps.position.y = Math.abs(Math.sin(this.temps * 9)) * 0.08;
        return;
      }
    }

    // À l'arrêt : il regarde la joueuse
    tournerVers(this.object, Math.atan2(joueuse.x - pos.x, joueuse.z - pos.z), 5, dt);

    if (this.salut > 0) {
      this.salut -= dt;
      this.corps.position.y = Math.abs(Math.sin(this.salut * Math.PI * 2.5)) * 0.35;
    } else {
      this.corps.position.y = THREE.MathUtils.damp(this.corps.position.y, 0, 12, dt);
    }
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

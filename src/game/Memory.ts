import * as THREE from 'three';
import { creerForme, type Forme } from './Formes';
import type { Etape } from './Script';
import { Zone } from './World';

export type Lumiere = 'jour' | 'soir' | 'couvert' | 'nuit';

export interface Ambiance {
  /** Couleur du ciel (et du brouillard) */
  ciel: string;
  lumiere: Lumiere;
  /** Couleur du sol de la scène */
  sol?: string;
}

/** Un souvenir, tel que décrit dans src/data/souvenirs.json */
export interface Souvenir {
  id: string;
  titre: string;
  date?: string;
  /** Où se trouve son halo dans le pré [x, 0, z] */
  position: number[];
  /** Où le MJ l'attend à côté du halo (optionnel) */
  attenteMj?: number[];
  photo?: string;
  texte?: string;
  mjAvant?: string[];
  mjApres?: string[];
  scene: {
    rayon?: number;
    ambiance: Ambiance;
    decor: Forme[];
  };
  /** Ce qui se passe dans la scène : cinématique puis actions de la joueuse */
  sequence: Etape[];
}

/** Toutes les scènes de souvenirs se jouent loin du pré, à cet endroit */
export const ORIGINE_SCENES = new THREE.Vector3(400, 0, 0);

/** La scène 3D d'un souvenir : un sol, quelques formes de décor, et la zone où elle peut marcher */
export class MemoryScene {
  readonly object = new THREE.Group();
  readonly zone: Zone;

  constructor(readonly souvenir: Souvenir) {
    const rayon = souvenir.scene.rayon ?? 9;
    this.zone = new Zone(ORIGINE_SCENES, rayon - 0.6);

    const sol = new THREE.Mesh(
      new THREE.CircleGeometry(rayon + 30, 48),
      new THREE.MeshStandardMaterial({ color: souvenir.scene.ambiance.sol ?? '#cdbfa8' }),
    );
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.object.add(sol);

    for (const f of souvenir.scene.decor ?? []) {
      this.object.add(creerForme(f));
    }
    this.object.position.copy(ORIGINE_SCENES);
  }

  /** Libère la mémoire de la carte graphique une fois la scène finie */
  detruire() {
    this.object.removeFromParent();
    this.object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}

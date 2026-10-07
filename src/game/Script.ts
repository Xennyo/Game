import * as THREE from 'three';
import type { Ligne } from '../ui/Dialogue';

/**
 * Un script est une liste d'étapes jouées l'une après l'autre.
 * Il décrit tout ce que fait le maître du jeu (PNJ) et ce que la joueuse doit faire.
 * Les scripts vivent dans src/data/ : on change l'histoire sans toucher au code.
 */
export type Etape =
  | { type: 'dialogue'; lignes: Ligne[] }
  | { type: 'placerMj'; position: number[] }
  | { type: 'mjMarche'; vers: number[] | 'joueuse' }
  | { type: 'mjTeleporte'; vers: number[] }
  | { type: 'mjSalue' }
  | { type: 'aller'; cible: number[]; aide?: string; aideTactile?: string }
  | { type: 'pause'; secondes: number };

/** Ce dont le script a besoin pour agir sur le jeu */
export interface Acteurs {
  dialogue(lignes: Ligne[]): Promise<void>;
  placerMj(pos: THREE.Vector3): void;
  mjMarche(pos: THREE.Vector3 | 'joueuse'): Promise<void>;
  mjTeleporte(pos: THREE.Vector3): Promise<void>;
  mjSalue(): Promise<void>;
  aller(cible: THREE.Vector3, aide?: string, aideTactile?: string): Promise<void>;
}

const vec = (p: number[]) => new THREE.Vector3(p[0] ?? 0, 0, p[2] ?? 0);

export async function jouerScript(etapes: Etape[], a: Acteurs): Promise<void> {
  for (const e of etapes) {
    switch (e.type) {
      case 'dialogue':
        await a.dialogue(e.lignes);
        break;
      case 'placerMj':
        a.placerMj(vec(e.position));
        break;
      case 'mjMarche':
        await a.mjMarche(e.vers === 'joueuse' ? 'joueuse' : vec(e.vers));
        break;
      case 'mjTeleporte':
        await a.mjTeleporte(vec(e.vers));
        break;
      case 'mjSalue':
        await a.mjSalue();
        break;
      case 'aller':
        await a.aller(vec(e.cible), e.aide, e.aideTactile);
        break;
      case 'pause':
        await new Promise((r) => setTimeout(r, e.secondes * 1000));
        break;
      default:
        // Étape inconnue (faute de frappe dans les données) : on l'ignore plutôt que de bloquer le jeu
        console.warn('Étape de script inconnue', e);
    }
  }
}

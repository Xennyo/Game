import * as THREE from 'three';
import type { Ligne } from '../ui/Dialogue';
import type { Personnage, Pose } from './Avatar';
import type { Forme } from './Formes';

type Qui = 'mj' | 'joueuse';
type Cible = number[] | Qui;

/**
 * Un script est une liste d'étapes jouées l'une après l'autre.
 * Il décrit tout ce que font les deux avatars : l'intro, puis chaque souvenir.
 * Les scripts vivent dans src/data/ : on change l'histoire sans toucher au code.
 * Le détail de chaque étape est documenté dans docs/TECH.md.
 */
export type Etape =
  | { type: 'dialogue'; lignes: Ligne[] }
  | { type: 'placer'; qui: Qui; position: number[]; angle?: number }
  | { type: 'marcher'; qui: Qui; vers: Cible; attendre?: boolean }
  | { type: 'pose'; qui: Qui; pose: Pose; angle?: number }
  | { type: 'regarder'; qui: Qui; vers: Cible | null }
  | { type: 'tenir'; qui: Qui; objet: Forme }
  | { type: 'saluer'; qui: Qui }
  | { type: 'teleporter'; vers: number[] }
  | { type: 'aller'; cible: number[]; aide?: string; aideTactile?: string }
  | { type: 'camera'; position: number[]; regard: number[]; instantane?: boolean }
  | { type: 'cameraSuit' }
  | { type: 'pause'; secondes: number }
  // Anciens noms gardés pour compatibilité
  | { type: 'placerMj'; position: number[] }
  | { type: 'mjMarche'; vers: number[] | 'joueuse' }
  | { type: 'mjTeleporte'; vers: number[] }
  | { type: 'mjSalue' };

/** Ce dont le script a besoin pour agir sur le jeu */
export interface Acteurs {
  perso(qui: Qui): Personnage;
  dialogue(lignes: Ligne[]): Promise<void>;
  /** Point juste devant `vers`, pour que `qui` vienne s'y placer sans le traverser */
  pointPres(qui: Qui, vers: Qui): THREE.Vector3;
  teleporterMj(pos: THREE.Vector3): Promise<void>;
  aller(cible: THREE.Vector3, aide?: string, aideTactile?: string): Promise<void>;
  camera(position: THREE.Vector3 | null, regard?: THREE.Vector3, instantane?: boolean): void;
  objet(forme: Forme): THREE.Object3D;
}

const DEG = Math.PI / 180;

/**
 * Joue un script. `origine` décale toutes les positions : les scènes de souvenirs
 * décrivent leurs positions par rapport à leur propre centre.
 */
export async function jouerScript(etapes: Etape[], a: Acteurs, origine = new THREE.Vector3()): Promise<void> {
  const vec = (p: number[]) => new THREE.Vector3(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0).add(origine);
  const sol = (p: number[]) => vec([p[0] ?? 0, 0, p[2] ?? 0]);
  const cible = (qui: Qui, vers: Cible): THREE.Vector3 =>
    Array.isArray(vers) ? sol(vers) : a.pointPres(qui, vers);

  for (const e of etapes) {
    switch (e.type) {
      case 'dialogue':
        await a.dialogue(e.lignes);
        break;
      case 'placer':
        a.perso(e.qui).placer(sol(e.position), e.angle === undefined ? undefined : e.angle * DEG);
        break;
      case 'marcher': {
        const marche = a.perso(e.qui).marcherVers(cible(e.qui, e.vers));
        if (e.attendre !== false) await marche;
        break;
      }
      case 'pose': {
        const p = a.perso(e.qui);
        p.setPose(e.pose);
        if (e.angle !== undefined) p.object.rotation.y = e.angle * DEG;
        break;
      }
      case 'regarder': {
        const vers = e.vers;
        if (vers === null) a.perso(e.qui).regarder(null);
        else if (Array.isArray(vers)) a.perso(e.qui).regarder(vec(vers));
        else a.perso(e.qui).regarder(() => a.perso(vers).object.position);
        break;
      }
      case 'tenir':
        a.perso(e.qui).tenir(a.objet(e.objet));
        break;
      case 'saluer':
        await a.perso(e.qui).saluer();
        break;
      case 'teleporter':
        await a.teleporterMj(sol(e.vers));
        break;
      case 'aller':
        await a.aller(sol(e.cible), e.aide, e.aideTactile);
        break;
      case 'camera':
        a.camera(vec(e.position), vec(e.regard), e.instantane);
        break;
      case 'cameraSuit':
        a.camera(null);
        break;
      case 'pause':
        await new Promise((r) => setTimeout(r, e.secondes * 1000));
        break;
      case 'placerMj':
        a.perso('mj').placer(sol(e.position));
        break;
      case 'mjMarche':
        await a.perso('mj').marcherVers(cible('mj', e.vers === 'joueuse' ? 'joueuse' : e.vers));
        break;
      case 'mjTeleporte':
        await a.teleporterMj(sol(e.vers));
        break;
      case 'mjSalue':
        await a.perso('mj').saluer();
        break;
      default:
        // Étape inconnue (faute de frappe dans les données) : on l'ignore plutôt que de bloquer le jeu
        console.warn('Étape de script inconnue', e);
    }
  }
}

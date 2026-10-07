import * as THREE from 'three';
import { creerFigurant } from './Modele';

/**
 * Une forme simple décrite dans les données (élément de décor, objet tenu...).
 * En attendant les packs d'assets low poly, les décors sont faits de ces formes.
 */
export interface Forme {
  forme: 'boite' | 'cylindre' | 'sphere' | 'cone' | 'capsule' | 'figurant';
  /** Position [x, y, z] (relative à la scène). y = hauteur du centre de la forme (figurant : hauteur du sol sous ses pieds) */
  position?: number[];
  /** boite : [largeur, hauteur, profondeur] ; cylindre/cone : [rayon, hauteur] ; sphere : [rayon] ; capsule : [rayon, hauteur] ; figurant : inutile */
  taille?: number[];
  /** Figurant seulement : 'assis' (sur un siège de 0,47 m) ou 'debout' */
  pose?: 'assis' | 'debout';
  couleur?: string;
  /** Nombre de côtés d'un cylindre ou d'un cône (8 = octogone). Par défaut : arrondi */
  cotes?: number;
  /** Rotation autour de l'axe vertical, en degrés */
  rotation?: number;
  /** Juste pour s'y retrouver dans les données */
  nom?: string;
}

const geometries: Record<Exclude<Forme['forme'], 'figurant'>, (t: number[], cotes: number) => THREE.BufferGeometry> = {
  boite: (t) => new THREE.BoxGeometry(t[0] ?? 1, t[1] ?? 1, t[2] ?? 1),
  cylindre: (t, c) => new THREE.CylinderGeometry(t[0] ?? 0.5, t[0] ?? 0.5, t[1] ?? 1, c),
  sphere: (t) => new THREE.SphereGeometry(t[0] ?? 0.5, 12, 8),
  cone: (t, c) => new THREE.ConeGeometry(t[0] ?? 0.5, t[1] ?? 1, c),
  // Hauteur totale, extrémités arrondies comprises (pratique pour des figurants)
  capsule: (t) => new THREE.CapsuleGeometry(t[0] ?? 0.35, Math.max(0, (t[1] ?? 1.6) - 2 * (t[0] ?? 0.35)), 4, 10),
};

let numeroFigurant = 0;

export function creerForme(f: Forme): THREE.Object3D {
  const p = f.position ?? [0, 0, 0];
  if (f.forme === 'figurant') {
    // Un petit personnage d'une seule couleur, pour donner de la vie aux scènes
    const fig = creerFigurant(f.couleur ?? '#9a9a9a', f.pose === 'assis', ++numeroFigurant);
    fig.position.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    fig.rotation.y = THREE.MathUtils.degToRad(f.rotation ?? 0);
    return fig;
  }
  // Forme inconnue (faute de frappe) : on affiche une boîte plutôt que de planter
  const geo = (geometries[f.forme] ?? geometries.boite)(f.taille ?? [1, 1, 1], f.cotes ?? 12);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: f.couleur ?? '#cccccc', flatShading: true }),
  );
  mesh.position.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
  mesh.rotation.y = THREE.MathUtils.degToRad(f.rotation ?? 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

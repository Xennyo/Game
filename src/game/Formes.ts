import * as THREE from 'three';

/**
 * Une forme simple décrite dans les données (élément de décor, objet tenu...).
 * En attendant les packs d'assets low poly, les décors sont faits de ces formes.
 */
export interface Forme {
  forme: 'boite' | 'cylindre' | 'sphere' | 'cone' | 'capsule';
  /** Position [x, y, z] (relative à la scène). y = hauteur du centre de la forme */
  position?: number[];
  /** boite : [largeur, hauteur, profondeur] ; cylindre/cone : [rayon, hauteur] ; sphere : [rayon] ; capsule : [rayon, hauteur] */
  taille: number[];
  couleur?: string;
  /** Nombre de côtés d'un cylindre ou d'un cône (8 = octogone). Par défaut : arrondi */
  cotes?: number;
  /** Rotation autour de l'axe vertical, en degrés */
  rotation?: number;
  /** Juste pour s'y retrouver dans les données */
  nom?: string;
}

const geometries: Record<Forme['forme'], (t: number[], cotes: number) => THREE.BufferGeometry> = {
  boite: (t) => new THREE.BoxGeometry(t[0] ?? 1, t[1] ?? 1, t[2] ?? 1),
  cylindre: (t, c) => new THREE.CylinderGeometry(t[0] ?? 0.5, t[0] ?? 0.5, t[1] ?? 1, c),
  sphere: (t) => new THREE.SphereGeometry(t[0] ?? 0.5, 12, 8),
  cone: (t, c) => new THREE.ConeGeometry(t[0] ?? 0.5, t[1] ?? 1, c),
  // Hauteur totale, extrémités arrondies comprises (pratique pour des figurants)
  capsule: (t) => new THREE.CapsuleGeometry(t[0] ?? 0.35, Math.max(0, (t[1] ?? 1.6) - 2 * (t[0] ?? 0.35)), 4, 10),
};

export function creerForme(f: Forme): THREE.Mesh {
  // Forme inconnue (faute de frappe) : on affiche une boîte plutôt que de planter
  const geo = (geometries[f.forme] ?? geometries.boite)(f.taille ?? [1, 1, 1], f.cotes ?? 12);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: f.couleur ?? '#cccccc', flatShading: true }),
  );
  const p = f.position ?? [0, 0, 0];
  mesh.position.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
  mesh.rotation.y = THREE.MathUtils.degToRad(f.rotation ?? 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

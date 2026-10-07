import * as THREE from 'three';

export const RAYON_AVATAR = 0.4;

/**
 * Corps placeholder d'un avatar : une capsule colorée avec un petit "nez"
 * pour voir où il regarde. Les vrais modèles .glb le remplaceront à l'étape 5.
 */
export function creerCorpsPlaceholder(couleur: string): THREE.Group {
  const corps = new THREE.Group();

  const capsule = new THREE.Mesh(
    new THREE.CapsuleGeometry(RAYON_AVATAR, 0.9, 4, 12),
    new THREE.MeshStandardMaterial({ color: couleur, flatShading: true }),
  );
  capsule.position.y = 0.85;
  capsule.castShadow = true;
  corps.add(capsule);

  const nez = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#ffffff' }),
  );
  nez.position.set(0, 1.3, RAYON_AVATAR);
  corps.add(nez);

  return corps;
}

/** Tourne un objet en douceur vers une direction (angle autour de l'axe vertical) */
export function tournerVers(objet: THREE.Object3D, cible: number, vitesse: number, dt: number) {
  let diff = cible - objet.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  objet.rotation.y += diff * Math.min(1, vitesse * dt);
}

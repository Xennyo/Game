import * as THREE from 'three';

interface Obstacle {
  x: number;
  z: number;
  r: number;
}

/** Zone où l'avatar peut marcher : un disque, avec des obstacles ronds à contourner */
export class Zone {
  readonly obstacles: Obstacle[] = [];
  constructor(
    readonly centre: THREE.Vector3,
    readonly limite: number,
  ) {}

  /** Corrige une position pour qu'elle reste dans la zone et hors des obstacles */
  contraint(pos: THREE.Vector3, rayonAvatar: number) {
    for (const o of this.obstacles) {
      const dx = pos.x - o.x;
      const dz = pos.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + rayonAvatar;
      if (d < min && d > 0.0001) {
        pos.x = o.x + (dx / d) * min;
        pos.z = o.z + (dz / d) * min;
      }
    }
    const dx = pos.x - this.centre.x;
    const dz = pos.z - this.centre.z;
    const d = Math.hypot(dx, dz);
    if (d > this.limite) {
      pos.x = this.centre.x + (dx * this.limite) / d;
      pos.z = this.centre.z + (dz * this.limite) / d;
    }
    pos.y = 0;
  }
}

/**
 * Le petit monde : un grand pré rond bordé de buissons, quelques arbres et rochers.
 * Elle ne peut pas en sortir (limite circulaire) ni traverser les obstacles.
 */
export class World {
  readonly object = new THREE.Group();
  readonly rayon = 30;
  /** Distance maximale du centre où l'avatar peut aller */
  readonly limite = 26.5;
  readonly spawn = new THREE.Vector3(0, 0, 6);
  readonly zone = new Zone(new THREE.Vector3(), this.limite);

  constructor() {
    const sol = new THREE.Mesh(
      new THREE.CircleGeometry(this.rayon + 10, 64),
      new THREE.MeshStandardMaterial({ color: '#9cc97a' }),
    );
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.object.add(sol);

    // Petite place centrale, futur point de rendez-vous avec le MJ
    const place = new THREE.Mesh(
      new THREE.CircleGeometry(3, 32),
      new THREE.MeshStandardMaterial({ color: '#e8d3a8' }),
    );
    place.rotation.x = -Math.PI / 2;
    place.position.y = 0.01;
    place.receiveShadow = true;
    this.object.add(place);

    // Haie de buissons tout autour : montre clairement le bord du monde
    const buisson = new THREE.IcosahedronGeometry(1, 0);
    const vertBuisson = new THREE.MeshStandardMaterial({ color: '#5f9a4e', flatShading: true });
    const nb = 70;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2;
      const m = new THREE.Mesh(buisson, vertBuisson);
      const taille = 1.1 + aleatoire(i) * 0.6;
      m.scale.setScalar(taille);
      m.position.set(Math.cos(a) * 28.5, taille * 0.6, Math.sin(a) * 28.5);
      m.rotation.y = aleatoire(i + 100) * Math.PI;
      m.castShadow = true;
      this.object.add(m);
    }

    // Arbres et rochers placés à la main (positions fixes, toujours le même monde)
    const arbres: [number, number][] = [
      [-8, -6], [9, -10], [-14, 8], [15, 6], [3, -18], [-18, -12], [20, -4], [-4, 17], [11, 16], [-21, 3],
    ];
    arbres.forEach(([x, z], i) => this.ajouteArbre(x, z, 0.9 + aleatoire(i + 7) * 0.5));

    const rochers: [number, number][] = [[6, -4], [-11, 13], [17, -14], [-15, -2]];
    rochers.forEach(([x, z], i) => this.ajouteRocher(x, z, 0.6 + aleatoire(i + 30) * 0.5));
  }

  private ajouteArbre(x: number, z: number, taille: number) {
    const tronc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 * taille, 0.28 * taille, 1.6 * taille, 6),
      new THREE.MeshStandardMaterial({ color: '#8a5a3b', flatShading: true }),
    );
    tronc.position.set(x, 0.8 * taille, z);
    tronc.castShadow = true;
    const feuillage = new THREE.Mesh(
      new THREE.ConeGeometry(1.3 * taille, 2.8 * taille, 7),
      new THREE.MeshStandardMaterial({ color: '#4f8a43', flatShading: true }),
    );
    feuillage.position.set(x, 2.9 * taille, z);
    feuillage.castShadow = true;
    this.object.add(tronc, feuillage);
    this.zone.obstacles.push({ x, z, r: 0.35 * taille });
  }

  private ajouteRocher(x: number, z: number, taille: number) {
    const rocher = new THREE.Mesh(
      new THREE.DodecahedronGeometry(taille, 0),
      new THREE.MeshStandardMaterial({ color: '#a39e93', flatShading: true }),
    );
    rocher.position.set(x, taille * 0.5, z);
    rocher.castShadow = true;
    rocher.receiveShadow = true;
    this.object.add(rocher);
    this.zone.obstacles.push({ x, z, r: taille * 0.9 });
  }

  /**
   * Trace laissée par un souvenir débloqué : une polaroid sur un chevalet,
   * tournée vers le centre de la place.
   */
  ajouterTrace(pos: THREE.Vector3, photo?: string) {
    const chevalet = new THREE.Group();
    const bois = new THREE.MeshStandardMaterial({ color: '#8a5a3b', flatShading: true });
    for (const x of [-0.35, 0.35]) {
      const pied = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.6, 0.07), bois);
      pied.position.set(x, 0.8, 0);
      pied.rotation.x = -0.12;
      pied.castShadow = true;
      chevalet.add(pied);
    }
    const arriere = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.6, 0.07), bois);
    arriere.position.set(0, 0.75, -0.35);
    arriere.rotation.x = 0.3;
    chevalet.add(arriere);

    // Le cadre blanc de la polaroid, puis la photo par-dessus
    const cadre = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.05, 0.04),
      new THREE.MeshStandardMaterial({ color: '#fbf8f2' }),
    );
    cadre.position.set(0, 1.35, 0.1);
    cadre.rotation.x = -0.12;
    cadre.castShadow = true;
    chevalet.add(cadre);

    const image = new THREE.MeshBasicMaterial({ color: '#d9cfc2' });
    if (photo) {
      new THREE.TextureLoader().load(photo, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        image.map = texture;
        image.color.set('#ffffff');
        image.needsUpdate = true;
      });
    }
    const photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), image);
    photoMesh.position.set(0, 0.07, 0.021);
    cadre.add(photoMesh);

    chevalet.position.set(pos.x, 0, pos.z);
    chevalet.rotation.y = Math.atan2(-pos.x, -pos.z);
    if (pos.lengthSq() < 1) chevalet.rotation.y = 0;
    this.object.add(chevalet);
    this.zone.obstacles.push({ x: pos.x, z: pos.z, r: 0.45 });
  }
}

/** Pseudo-aléatoire stable : le monde est identique à chaque partie */
function aleatoire(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

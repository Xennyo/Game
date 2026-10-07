import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Apparence d'un avatar, décrite dans src/data/avatars.json */
export interface Apparence {
  taille: number;
  peau: string;
  joues: string | null;
  taches: string | null;
  yeux: string;
  cheveux: string;
  reflets: string;
  coiffure: 'longue-ondulee' | 'courte-bouclee' | string;
  barbe: string | null;
  haut: string;
  interieur: string | null;
  manches: 'longues' | 'courtes' | string;
  motif: string | null;
  pantalon: string;
  chaussures: string;
}

/** Ce que l'animation doit montrer à cet instant */
export interface EtatAnimation {
  temps: number;
  /** Avancée du cycle de marche */
  phase: number;
  /** 0 = immobile, 1 = course */
  amplitude: number;
  /** 0 = debout, 1 = assis */
  assis: number;
  /** 0 = rien, 1 = main levée qui salue */
  salut: number;
  /** Vrai si un objet est tenu à deux mains */
  tient: boolean;
}

/** Hauteur des hanches debout (avant mise à l'échelle) */
export const HANCHE = 0.72;
/** Où les objets tenus sont posés, dans le repère du corps */
export const POSITION_MAINS = new THREE.Vector3(0, 1.0, 0.44);

const R_TETE = 0.22;

const materiaux = new Map<string, THREE.MeshStandardMaterial>();
function mat(couleur: string, doubleFace = false): THREE.MeshStandardMaterial {
  const cle = couleur + (doubleFace ? '-2' : '');
  let m = materiaux.get(cle);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: couleur,
      flatShading: true,
      roughness: 0.85,
      side: doubleFace ? THREE.DoubleSide : THREE.FrontSide,
    });
    materiaux.set(cle, m);
  }
  return m;
}

function piece(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  couleur: string,
  pos: [number, number, number],
  echelle?: [number, number, number],
  rotation?: [number, number, number],
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(couleur));
  m.position.set(...pos);
  if (echelle) m.scale.set(...echelle);
  if (rotation) m.rotation.set(...rotation);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** Petit générateur pseudo-aléatoire : les boucles tombent toujours au même endroit */
function hasard(graine: number) {
  let s = graine;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Regroupe beaucoup de petites mèches en un seul objet (plus léger à afficher) */
function meches(parent: THREE.Object3D, morceaux: THREE.BufferGeometry[], couleur: string) {
  if (morceaux.length === 0) return;
  const m = new THREE.Mesh(mergeGeometries(morceaux), mat(couleur));
  m.castShadow = true;
  parent.add(m);
}

function boucle(r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

/**
 * Un avatar low poly construit à partir de formes simples, avec un squelette
 * minimal (hanches, genoux, épaules, coudes, tête) animé par le code.
 */
export class Modele {
  readonly racine = new THREE.Group();
  private bassin = new THREE.Group();
  private torse = new THREE.Group();
  private tete = new THREE.Group();
  private hanches: THREE.Group[] = [];
  private genoux: THREE.Group[] = [];
  private epaules: THREE.Group[] = [];
  private coudes: THREE.Group[] = [];

  constructor(readonly a: Apparence) {
    this.racine.scale.setScalar(a.taille);
    this.bassin.position.y = HANCHE;
    this.racine.add(this.bassin);
    this.bassin.add(this.torse);

    this.construireJambes();
    this.construireTorse();
    this.construireBras();
    this.construireTete();
  }

  private construireJambes() {
    const a = this.a;
    piece(this.bassin, new THREE.CylinderGeometry(0.19, 0.2, 0.16, 8), a.pantalon, [0, 0, 0]);
    for (const cote of [1, -1]) {
      const hanche = new THREE.Group();
      hanche.position.set(cote * 0.1, -0.02, 0);
      this.bassin.add(hanche);
      piece(hanche, new THREE.CylinderGeometry(0.088, 0.074, 0.36, 7), a.pantalon, [0, -0.17, 0]);

      const genou = new THREE.Group();
      genou.position.y = -0.34;
      hanche.add(genou);
      piece(genou, new THREE.CylinderGeometry(0.072, 0.06, 0.32, 7), a.pantalon, [0, -0.16, 0]);
      piece(genou, new THREE.BoxGeometry(0.11, 0.08, 0.22), a.chaussures, [0, -0.32, 0.04]);

      this.hanches.push(hanche);
      this.genoux.push(genou);
    }
  }

  private construireTorse() {
    const a = this.a;
    const longue = a.interieur !== null;
    // Le haut (veste ouverte ou t-shirt), un peu plus long pour une veste
    piece(
      this.torse,
      new THREE.CylinderGeometry(0.19, longue ? 0.23 : 0.205, longue ? 0.62 : 0.5, 8),
      a.haut,
      [0, longue ? 0.21 : 0.27, 0],
    );
    piece(this.torse, new THREE.SphereGeometry(0.17, 8, 5), a.haut, [0, 0.5, 0], [1.3, 0.55, 0.95]);

    if (a.interieur) {
      // Pull col roulé visible entre les pans de la veste
      piece(this.torse, new THREE.BoxGeometry(0.13, 0.42, 0.05), a.interieur, [0, 0.3, 0.185]);
      piece(this.torse, new THREE.CylinderGeometry(0.085, 0.09, 0.12, 8), a.interieur, [0, 0.58, 0]);
    } else {
      piece(this.torse, new THREE.CylinderGeometry(0.07, 0.075, 0.12, 7), a.peau, [0, 0.58, 0]);
    }

    if (a.motif) {
      // Petit dessin sur le t-shirt
      const motif = new THREE.Group();
      motif.position.set(0, 0.36, 0.198);
      this.torse.add(motif);
      const plat = (r: number, x: number, y: number) =>
        piece(motif, new THREE.CircleGeometry(r, 8), a.motif!, [x, y, 0]);
      plat(0.022, 0, 0.04);
      plat(0.018, -0.025, 0.025);
      plat(0.018, 0.025, 0.025);
      piece(motif, new THREE.RingGeometry(0.022, 0.032, 8, 1, Math.PI, Math.PI), a.motif, [0, -0.04, 0]);
    }
  }

  private construireBras() {
    const a = this.a;
    const avantBras = a.manches === 'courtes' ? a.peau : a.haut;
    for (const cote of [1, -1]) {
      const epaule = new THREE.Group();
      epaule.position.set(cote * 0.255, 0.46, 0);
      this.torse.add(epaule);
      piece(epaule, new THREE.CylinderGeometry(0.065, 0.058, 0.28, 6), a.haut, [0, -0.13, 0]);

      const coude = new THREE.Group();
      coude.position.y = -0.27;
      epaule.add(coude);
      piece(coude, new THREE.CylinderGeometry(0.054, 0.048, 0.24, 6), avantBras, [0, -0.12, 0]);
      piece(coude, new THREE.SphereGeometry(0.055, 6, 5), a.peau, [0, -0.27, 0]);

      this.epaules.push(epaule);
      this.coudes.push(coude);
    }
  }

  private construireTete() {
    const a = this.a;
    const t = this.tete;
    t.position.y = 0.82;
    this.torse.add(t);

    piece(t, new THREE.SphereGeometry(R_TETE, 12, 10), a.peau, [0, 0, 0], [1, 1.04, 0.96]);
    for (const cote of [1, -1]) {
      piece(t, new THREE.SphereGeometry(0.045, 6, 5), a.peau, [cote * R_TETE, -0.01, 0], [0.5, 1, 0.8]);
    }

    // Yeux : blanc, iris coloré, pupille et petit reflet
    for (const cote of [1, -1]) {
      const x = cote * 0.075;
      piece(t, new THREE.SphereGeometry(0.036, 8, 6), '#ffffff', [x, 0.015, 0.19], [1, 0.8, 0.35]);
      piece(t, new THREE.SphereGeometry(0.022, 8, 6), a.yeux, [x, 0.013, 0.2], [1, 1, 0.4]);
      piece(t, new THREE.SphereGeometry(0.011, 6, 4), '#111111', [x, 0.013, 0.206], [1, 1, 0.4]);
      piece(t, new THREE.SphereGeometry(0.006, 4, 3), '#ffffff', [x + 0.008, 0.022, 0.21]);
      // Sourcils
      piece(t, new THREE.BoxGeometry(0.065, 0.013, 0.015), a.cheveux, [x, 0.078, 0.198], undefined, [0, 0, cote * -0.08]);
    }

    // Nez et sourire
    piece(t, new THREE.SphereGeometry(0.026, 6, 4), a.peau, [0, -0.035, 0.212], [1, 0.9, 1]);
    piece(t, new THREE.TorusGeometry(0.026, 0.0055, 4, 8, Math.PI), '#9a4f49', [0, -0.08, 0.203], [1, 0.7, 1], [0, 0, Math.PI]);

    if (a.joues) {
      for (const cote of [1, -1]) {
        const joue = new THREE.Mesh(
          new THREE.CircleGeometry(0.03, 8),
          new THREE.MeshStandardMaterial({ color: a.joues, transparent: true, opacity: 0.55 }),
        );
        joue.position.set(cote * 0.12, -0.04, 0.175);
        joue.rotation.y = cote * 0.55;
        t.add(joue);
      }
    }
    if (a.taches) {
      const h = hasard(7);
      const points: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 14; i++) {
        const cote = i % 2 ? 1 : -1;
        const x = cote * (0.03 + h() * 0.1);
        const y = -0.025 - h() * 0.04;
        const z = 0.96 * Math.sqrt(R_TETE * R_TETE - x * x - y * y) + 0.002;
        points.push(boucle(0.004, x, y, z));
      }
      meches(t, points, a.taches);
    }

    if (a.barbe) this.construireBarbe(a.barbe);
    if (a.coiffure === 'longue-ondulee') this.cheveuxLongs();
    else this.cheveuxCourts();
  }

  private construireBarbe(couleur: string) {
    const t = this.tete;
    // Une coque autour de la mâchoire, qui laisse la bouche visible
    const coque = new THREE.Mesh(
      new THREE.SphereGeometry(R_TETE * 1.02, 12, 8, Math.PI / 2 - 1.75, 3.5, 2.05, Math.PI - 2.05),
      mat(couleur, true),
    );
    coque.scale.set(1, 1.04, 0.98);
    t.add(coque);
    // Moustache et pattes
    piece(t, new THREE.BoxGeometry(0.08, 0.014, 0.015), couleur, [0, -0.062, 0.207]);
    for (const cote of [1, -1]) {
      piece(t, new THREE.BoxGeometry(0.025, 0.14, 0.07), couleur, [cote * 0.205, -0.05, 0.03]);
    }
    // Le sourire passe devant la barbe
    piece(t, new THREE.TorusGeometry(0.026, 0.0055, 4, 8, Math.PI), '#9a4f49', [0, -0.088, 0.218], [1, 0.7, 1], [0, 0, Math.PI]);
  }

  /** Longs cheveux ondulés avec une raie au milieu */
  private cheveuxLongs() {
    const a = this.a;
    const t = this.tete;
    const calotte = new THREE.Mesh(
      new THREE.SphereGeometry(R_TETE * 1.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
      mat(a.cheveux, true),
    );
    calotte.rotation.x = -0.6;
    calotte.scale.set(1.04, 1.04, 1);
    t.add(calotte);
    // Raie au milieu : deux pans qui descendent vers les tempes
    for (const cote of [1, -1]) {
      const pan = new THREE.Mesh(
        new THREE.SphereGeometry(R_TETE * 1.07, 8, 6, cote > 0 ? Math.PI / 2 : 0, Math.PI / 2, 0, Math.PI * 0.43),
        mat(a.cheveux, true),
      );
      pan.rotation.set(-0.22, 0, cote * -0.1);
      pan.castShadow = true;
      t.add(pan);
    }
    // Volume derrière la tête
    piece(t, new THREE.SphereGeometry(0.27, 9, 7), a.cheveux, [0, -0.06, -0.09], [1.12, 1.05, 0.82]);

    const fonce: THREE.BufferGeometry[] = [];
    const clair: THREE.BufferGeometry[] = [];
    const h = hasard(3);
    // Des colonnes de boucles qui descendent jusqu'au milieu du dos
    const colonne = (x: number, z: number, debut: number, n: number, r: number) => {
      for (let i = 0; i < n; i++) {
        const onde = (i % 2 ? 1 : -1) * 0.02 * Math.sign(x || 1);
        const rayon = r * (1 - i * 0.04) * (0.9 + h() * 0.2);
        (i + Math.round(x * 10)) % 2 ? fonce.push(boucle(rayon, x + onde, debut - i * 0.08, z, 1, 1.25, 0.9))
          : clair.push(boucle(rayon, x + onde, debut - i * 0.08, z, 1, 1.25, 0.9));
      }
    };
    // Mèches qui encadrent le visage
    colonne(0.205, 0.07, 0.03, 8, 0.07);
    colonne(-0.205, 0.07, 0.03, 8, 0.07);
    colonne(0.25, -0.05, 0.02, 8, 0.08);
    colonne(-0.25, -0.05, 0.02, 8, 0.08);
    // Le dos
    for (const x of [-0.2, -0.07, 0.07, 0.2]) colonne(x, -0.21, -0.08, 8, 0.09);
    meches(t, fonce, a.cheveux);
    meches(t, clair, a.reflets);
  }

  /** Cheveux courts bouclés, avec quelques boucles sur le front */
  private cheveuxCourts() {
    const a = this.a;
    const t = this.tete;
    const calotte = new THREE.Mesh(
      new THREE.SphereGeometry(R_TETE * 1.07, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
      mat(a.cheveux, true),
    );
    calotte.rotation.x = -0.35;
    t.add(calotte);

    const fonce: THREE.BufferGeometry[] = [];
    const clair: THREE.BufferGeometry[] = [];
    const h = hasard(11);
    for (let i = 0; i < 70; i++) {
      const azimut = h() * Math.PI * 2; // 0 = devant
      const devant = Math.cos(azimut);
      // Plus bas derrière et sur les côtés, s'arrête au-dessus des sourcils devant
      const limite = devant > 0 ? 1.15 - devant * 0.1 : 1.6 - devant * 0.4;
      const polaire = Math.sqrt(h()) * limite;
      const r = R_TETE * (1.1 + h() * 0.05);
      const x = r * Math.sin(polaire) * Math.sin(azimut);
      const y = r * Math.cos(polaire) * 1.04;
      const z = r * Math.sin(polaire) * devant * 0.98;
      (i % 3 ? fonce : clair).push(boucle(0.055 + h() * 0.025, x, y, z));
    }
    // Quelques boucles qui tombent sur le front
    for (const x of [-0.07, 0.02, 0.09]) fonce.push(boucle(0.05, x, 0.13, 0.19, 1, 1.2, 0.8));
    meches(t, fonce, a.cheveux);
    meches(t, clair, a.reflets);
  }

  /** Place les membres selon l'état demandé */
  animer(e: EtatAnimation) {
    const s = Math.sin(e.phase);
    const debout = 1 - e.assis;
    const amp = e.amplitude * debout;

    // Jambes : balancier de marche, ou pliées à angle droit en position assise
    this.hanches.forEach((hanche, i) => {
      const sens = i === 0 ? 1 : -1;
      hanche.rotation.x = sens * s * 0.75 * amp - (Math.PI / 2) * e.assis;
      const flexion = Math.max(0, Math.cos(e.phase + (i === 0 ? 0 : Math.PI)));
      this.genoux[i].rotation.x = amp * (0.1 + 0.9 * flexion) + (Math.PI / 2) * e.assis;
    });

    // Bras : opposés aux jambes, posés sur les cuisses en position assise, ou tendus pour tenir un objet
    this.epaules.forEach((epaule, i) => {
      const sens = i === 0 ? 1 : -1;
      const coude = this.coudes[i];
      if (e.tient) {
        epaule.rotation.set(-1.1, 0, sens * -0.12);
        coude.rotation.set(-0.6, 0, 0);
      } else {
        epaule.rotation.set(
          -sens * s * 0.65 * amp - 0.45 * e.assis,
          0,
          sens * (0.09 + 0.015 * Math.sin(e.temps * 1.6)),
        );
        coude.rotation.set(-0.25 * amp - 0.8 * e.assis, 0, 0);
      }
    });

    // Salut : bras droit levé, l'avant-bras qui se balance
    if (e.salut > 0) {
      const epaule = this.epaules[1];
      const coude = this.coudes[1];
      epaule.rotation.x *= 1 - e.salut;
      epaule.rotation.z = THREE.MathUtils.lerp(epaule.rotation.z, -2.6, e.salut);
      coude.rotation.x *= 1 - e.salut;
      coude.rotation.z = e.salut * (Math.sin(e.temps * 11) * 0.45 - 0.25);
    }

    // Respiration, buste un peu penché en courant, tête qui bouge à peine
    this.torse.scale.y = 1 + Math.sin(e.temps * 2) * 0.008;
    this.torse.rotation.x = amp * 0.1;
    this.tete.rotation.y = Math.sin(e.temps * 0.45) * 0.06 * debout;
    this.tete.rotation.x = -amp * 0.06;
  }
}

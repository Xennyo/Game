import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { EtatAnimation } from '../Modele';

/**
 * L'avatar de Maëlle, construit dans le code d'après son image de référence
 * (figurine en pâte à modeler : grosse tête, longs cheveux miel ondulés,
 * t-shirt beige, pantalon large à fleurs vertes, ballerines).
 * Les couleurs se règlent dans src/data/avatars.json ("joueuse").
 */
export interface ApparenceMaelle {
  style: string;
  taille: number;
  peau: string;
  joues: string;
  yeux: string;
  sourcils: string;
  cheveux: string;
  reflets: string;
  ombres: string;
  haut: string;
  pantalon: { fond: string; fleurs: string };
  chaussures: string;
}

/** Hauteur du bassin (même valeur que les autres avatars : le jeu s'en sert pour s'asseoir) */
const HANCHE = 0.72;
/** Où pivotent les jambes, sous le bassin */
const PIVOT_JAMBE = -0.03;
/** Rayon d'une cuisse : en position assise, le dessous de la cuisse doit toucher le siège */
const CUISSE = 0.1;

/** La tête : un peu plus haute que large */
const RT = 0.21;
const ETIRE = 1.15;
/** Les mèches dessinées à la main ont été placées pour une tête de rayon 0.19 */
const K = RT / 0.19;
/** Hauteur du centre de la tête au-dessus du bassin */
const Y_TETE = 0.51;

/** Le visage dessiné couvre cette zone de la tête (angles en radians) */
const VIS_PHI = 1.3;
const VIS_T0 = 0.85;
const VIS_T1 = 2.55;

type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// Petites aides
// ---------------------------------------------------------------------------

const materiaux = new Map<string, THREE.Material>();
function mat(couleur: string, double = false): THREE.Material {
  const cle = `${couleur}-${double}`;
  let m = materiaux.get(cle);
  if (!m) {
    // Un léger reflet, comme de la pâte à modeler
    m = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.72, side: double ? THREE.DoubleSide : THREE.FrontSide });
    materiaux.set(cle, m);
  }
  return m;
}

function piece(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  materiau: string | THREE.Material,
  pos: Vec3,
  echelle?: Vec3,
  rotation?: Vec3,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, typeof materiau === 'string' ? mat(materiau) : materiau);
  m.position.set(...pos);
  if (echelle) m.scale.set(...echelle);
  if (rotation) m.rotation.set(...rotation);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** Petit générateur pseudo-aléatoire : les mèches tombent toujours au même endroit */
function hasard(graine: number) {
  let s = graine;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Regroupe plusieurs morceaux de même couleur en un seul objet (plus léger à afficher) */
function fusion(parent: THREE.Object3D, morceaux: THREE.BufferGeometry[], couleur: string) {
  const propres = morceaux.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const nom of Object.keys(n.attributes)) if (nom !== 'position' && nom !== 'normal') n.deleteAttribute(nom);
    return n;
  });
  const m = new THREE.Mesh(mergeGeometries(propres), mat(couleur));
  m.castShadow = true;
  parent.add(m);
}

/** Un boudin de pâte le long d'une courbe ; "rayon" donne son épaisseur selon l'avancée (0 à 1) */
function boudin(points: THREE.Vector3[], rayon: (t: number) => number, cotes = 10, segments = 40, boutDepart = true): THREE.BufferGeometry {
  const courbe = new THREE.CatmullRomCurve3(points);
  // Repères qui glissent le long de la courbe sans se tordre (sinon la mèche se froisse)
  const reperes = { normals: [] as THREE.Vector3[], binormals: [] as THREE.Vector3[] };
  let normale = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const tg = courbe.getTangentAt(i / segments).normalize();
    if (i === 0) {
      normale = new THREE.Vector3(0, 0, 1).cross(tg);
      if (normale.lengthSq() < 1e-4) normale = new THREE.Vector3(1, 0, 0).cross(tg);
    } else {
      normale.sub(tg.clone().multiplyScalar(normale.dot(tg)));
    }
    normale.normalize();
    reperes.normals.push(normale.clone());
    reperes.binormals.push(new THREE.Vector3().crossVectors(tg, normale));
  }
  const pos: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = courbe.getPointAt(t);
    const r = rayon(t);
    const n = reperes.normals[i];
    const b = reperes.binormals[i];
    for (let j = 0; j < cotes; j++) {
      const a = (j / cotes) * Math.PI * 2;
      pos.push(
        p.x + (n.x * Math.cos(a) + b.x * Math.sin(a)) * r,
        p.y + (n.y * Math.cos(a) + b.y * Math.sin(a)) * r,
        p.z + (n.z * Math.cos(a) + b.z * Math.sin(a)) * r,
      );
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < cotes; j++) {
      const a = i * cotes + j;
      const b = i * cotes + ((j + 1) % cotes);
      index.push(a, b, a + cotes, b, b + cotes, a + cotes);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  // Bouts arrondis
  const bouts = (boutDepart ? [0, 1] : [1]).map((t) => {
    const s = new THREE.SphereGeometry(Math.max(0.004, rayon(t)), cotes, 6);
    const p = courbe.getPointAt(t);
    s.translate(p.x, p.y, p.z);
    return s.toNonIndexed();
  });
  const g2 = g.toNonIndexed();
  for (const s of bouts) s.deleteAttribute('uv');
  return mergeGeometries([g2, ...bouts]);
}

/** Forme tournée autour de l'axe vertical, aplatie d'avant en arrière */
function tour(profil: [number, number][], profondeur = 0.8, debut = 0, angle = Math.PI * 2, cotes = 24) {
  const g = new THREE.LatheGeometry(
    profil.map(([r, y]) => new THREE.Vector2(r, y)),
    cotes,
    debut,
    angle,
  );
  g.scale(1, 1, profondeur);
  return g;
}

// ---------------------------------------------------------------------------
// Dessins (visage et tissu à fleurs)
// ---------------------------------------------------------------------------

/** Le visage, dessiné à plat puis posé sur la tête comme un autocollant */
function dessinerVisage(a: ApparenceMaelle, yeuxOuverts: boolean): HTMLCanvasElement {
  const L = 1024;
  const H = 768;
  const c = document.createElement('canvas');
  c.width = L;
  c.height = H;
  const ctx = c.getContext('2d')!;
  // On dessine en "radians" autour du centre du visage (équateur de la tête, face avant)
  const ux = L / (2 * VIS_PHI);
  const uy = H / (VIS_T1 - VIS_T0) / ETIRE;
  ctx.translate(L / 2, ((Math.PI / 2 - VIS_T0) / (VIS_T1 - VIS_T0)) * H);
  ctx.scale(ux, uy);
  const px = 1 / ux;

  // Joues roses
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(s * 0.82, 0.4, 0, s * 0.82, 0.4, 0.2);
    g.addColorStop(0, a.joues + 'aa');
    g.addColorStop(1, a.joues + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(s * 0.82, 0.4, 0.2, 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sourcils : doux et épais, couleur miel
  ctx.strokeStyle = a.sourcils;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.075;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 0.4, -0.31);
    ctx.quadraticCurveTo(s * 0.6, -0.39, s * 0.82, -0.33);
    ctx.stroke();
  }

  // Yeux
  for (const s of [-1, 1]) {
    const x = s * 0.6;
    const y = 0.03;
    if (yeuxOuverts) {
      // Le contour, puis l'iris bleu qui remplit presque tout l'œil
      ctx.fillStyle = '#2a2f45';
      ctx.beginPath();
      ctx.ellipse(x, y, 0.165, 0.19, 0, 0, Math.PI * 2);
      ctx.fill();
      const iris = ctx.createLinearGradient(0, y - 0.18, 0, y + 0.18);
      iris.addColorStop(0, new THREE.Color(a.yeux).multiplyScalar(0.7).getStyle());
      iris.addColorStop(0.6, a.yeux);
      iris.addColorStop(1, new THREE.Color(a.yeux).lerp(new THREE.Color('#ffffff'), 0.35).getStyle());
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.ellipse(x, y + 0.008, 0.145, 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pupille
      ctx.fillStyle = '#1e2338';
      ctx.beginPath();
      ctx.ellipse(x, y + 0.02, 0.075, 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Reflets
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.045 + 0.02, y - 0.06, 0.05, 0.058, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + s * 0.05, y + 0.085, 0.022, 0.022, 0, 0, Math.PI * 2);
      ctx.fill();
      // Trait d'eye-liner sur le haut, avec une petite pointe vers l'extérieur
      ctx.strokeStyle = '#1d1a24';
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.ellipse(x, y, 0.168, 0.195, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.fillStyle = '#1d1a24';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.12, y - 0.15);
      ctx.quadraticCurveTo(x + s * 0.21, y - 0.15, x + s * 0.25, y - 0.21);
      ctx.quadraticCurveTo(x + s * 0.2, y - 0.08, x + s * 0.16, y - 0.06);
      ctx.closePath();
      ctx.fill();
    } else {
      // Yeux fermés : un arc souriant avec les cils
      ctx.strokeStyle = '#1d1a24';
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.moveTo(x - 0.15, y);
      ctx.quadraticCurveTo(x, y + 0.08, x + 0.15, y);
      ctx.lineTo(x + s * 0.2, y - 0.05);
      ctx.stroke();
    }
  }

  // Grand sourire, bouche ouverte : les dents en haut, la langue en bas
  const my = 0.52;
  const mw = 0.33;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-mw, my - 0.07);
  ctx.quadraticCurveTo(0, my - 0.03, mw, my - 0.07);
  ctx.bezierCurveTo(mw * 0.9, my + 0.24, -mw * 0.9, my + 0.24, -mw, my - 0.07);
  ctx.closePath();
  ctx.fillStyle = '#a63c3a';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-mw, my - 0.12, mw * 2, 0.11);
  ctx.fillStyle = '#e8746a';
  ctx.beginPath();
  ctx.ellipse(0, my + 0.19, 0.2, 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Petites fossettes au coin des lèvres
  ctx.strokeStyle = 'rgba(190,110,100,0.5)';
  ctx.lineWidth = 3 * px;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * (mw + 0.05), my - 0.06, 0.045, s > 0 ? Math.PI * 0.6 : Math.PI * -0.6 + Math.PI, s > 0 ? Math.PI * 1.3 : Math.PI * 0.3 - Math.PI, s < 0);
    ctx.stroke();
  }
  return c;
}

/** Le tissu du pantalon : fond crème, grosses fleurs vertes, petites fleurs et tiges */
function dessinerFleurs(fond: string, fleurs: string): HTMLCanvasElement {
  const T = 512;
  const c = document.createElement('canvas');
  c.width = T;
  c.height = T;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = fleurs;
  ctx.strokeStyle = fleurs;
  const h = hasard(5);
  // Tout est dessiné 9 fois (décalé) pour que le motif se raccorde sans couture
  const partout = (dessin: (x: number, y: number) => void, x: number, y: number) => {
    for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) dessin(x + dx, y + dy);
  };
  // Tiges qui serpentent
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x0 = h() * T;
    const y0 = h() * T;
    const ang = h() * Math.PI * 2;
    partout((x, y) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + Math.cos(ang) * 60 - 30, y + Math.sin(ang) * 60 + 30,
        x + Math.cos(ang) * 90 + 30, y + Math.sin(ang) * 90 - 30,
        x + Math.cos(ang) * 140, y + Math.sin(ang) * 140,
      );
      ctx.stroke();
    }, x0, y0);
  }
  // Grosses fleurs à pétales ronds (comme des trèfles)
  const grosse = (x: number, y: number, r: number, rot: number) => {
    for (let k = 0; k < 5; k++) {
      const a = rot + (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  };
  const petite = (x: number, y: number, r: number) => {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = fond;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fleurs;
  };
  const feuille = (x: number, y: number, r: number, a: number) => {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.45, a, 0, Math.PI * 2);
    ctx.fill();
  };
  const grosses: [number, number][] = [[90, 80], [330, 60], [210, 230], [450, 260], [80, 380], [330, 430]];
  for (const [x, y] of grosses) {
    const r = 44 + h() * 14;
    const rot = h() * Math.PI;
    partout((X, Y) => grosse(X, Y, r, rot), x, y);
  }
  for (let i = 0; i < 16; i++) {
    const x = h() * T;
    const y = h() * T;
    const r = 13 + h() * 6;
    partout((X, Y) => petite(X, Y, r), x, y);
  }
  for (let i = 0; i < 22; i++) {
    const x = h() * T;
    const y = h() * T;
    const r = 14 + h() * 8;
    const a = h() * Math.PI;
    partout((X, Y) => feuille(X, Y, r, a), x, y);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Le modèle
// ---------------------------------------------------------------------------

export class ModeleMaelle {
  readonly racine = new THREE.Group();
  private bassin = new THREE.Group();
  private torse = new THREE.Group();
  private tete = new THREE.Group();
  private cheveux = new THREE.Group();
  private hanches: THREE.Group[] = [];
  private genoux: THREE.Group[] = [];
  private epaules: THREE.Group[] = [];
  private coudes: THREE.Group[] = [];
  private visage!: { materiau: THREE.MeshStandardMaterial; ouvert: THREE.Texture; ferme: THREE.Texture };

  constructor(readonly a: ApparenceMaelle) {
    this.racine.scale.setScalar(a.taille);
    this.bassin.position.y = HANCHE;
    this.racine.add(this.bassin);
    this.bassin.add(this.torse);
    this.construireJambes();
    this.construireTorse();
    this.construireBras();
    this.construireTete();
    this.construireCheveux();
  }

  private construireJambes() {
    const a = this.a;
    const tex = new THREE.CanvasTexture(dessinerFleurs(a.pantalon.fond, a.pantalon.fleurs));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1.7);
    tex.anisotropy = 4;
    const tissu = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });

    // Le haut du pantalon, large et arrondi
    piece(this.bassin, tour([[0.0, -0.1], [0.12, -0.11], [0.185, -0.06], [0.178, -0.02], [0.155, 0.03], [0.0, 0.06]], 0.78), tissu, [0, 0, 0]);

    for (const cote of [1, -1]) {
      const hanche = new THREE.Group();
      hanche.position.set(cote * 0.09, PIVOT_JAMBE, 0);
      hanche.rotation.z = cote * 0.03;
      this.bassin.add(hanche);
      piece(hanche, new THREE.CylinderGeometry(CUISSE, 0.1, 0.33, 18), tissu, [0, -0.165, 0]);

      const genou = new THREE.Group();
      genou.position.y = -0.33;
      hanche.add(genou);
      piece(genou, new THREE.SphereGeometry(0.1, 18, 10), tissu, [0, 0, 0]);
      // Jambe large, un peu évasée, qui retombe sur la ballerine
      piece(genou, new THREE.CylinderGeometry(0.1, 0.112, 0.29, 18), tissu, [0, -0.145, 0]);
      // Ourlet arrondi
      piece(genou, new THREE.TorusGeometry(0.105, 0.011, 6, 20), tissu, [0, -0.288, 0], undefined, [Math.PI / 2, 0, 0]);
      piece(genou, new THREE.CircleGeometry(0.108, 18), '#5c4a3e', [0, -0.29, 0], undefined, [Math.PI / 2, 0, 0]);
      // Ballerine
      piece(genou, new THREE.CapsuleGeometry(0.05, 0.12, 6, 12), a.chaussures, [0, -0.33, 0.05], [1.05, 0.6, 1], [Math.PI / 2, 0, 0]);

      this.hanches.push(hanche);
      this.genoux.push(genou);
    }
  }

  private construireTorse() {
    const a = this.a;
    const t = this.torse;
    // T-shirt : taille souple, épaules arrondies
    const buste: [number, number][] = [
      [0.0, -0.05], [0.19, -0.05], [0.188, -0.02], [0.17, 0.03], [0.158, 0.08], [0.165, 0.14], [0.178, 0.19], [0.168, 0.235], [0.12, 0.265], [0.05, 0.28], [0.0, 0.282],
    ];
    piece(t, tour(buste, 0.74), a.haut, [0, 0, 0]);
    // Cou
    piece(t, new THREE.CylinderGeometry(0.042, 0.048, 0.08, 14), a.peau, [0, 0.29, 0]);
    // Col rond
    piece(t, new THREE.TorusGeometry(0.058, 0.01, 6, 18), a.haut, [0, 0.272, 0.0], [1, 0.8, 1], [Math.PI / 2, 0, 0]);
  }

  private construireBras() {
    const a = this.a;
    for (const cote of [1, -1]) {
      const epaule = new THREE.Group();
      epaule.position.set(cote * 0.155, 0.215, 0);
      this.torse.add(epaule);
      // Manche courte
      piece(epaule, new THREE.SphereGeometry(0.058, 14, 10), a.haut, [0, 0, 0]);
      piece(epaule, new THREE.CylinderGeometry(0.058, 0.054, 0.1, 14), a.haut, [0, -0.05, 0]);
      piece(epaule, new THREE.CylinderGeometry(0.035, 0.034, 0.08, 12), a.peau, [0, -0.12, 0]);

      const coude = new THREE.Group();
      coude.position.y = -0.15;
      epaule.add(coude);
      piece(coude, new THREE.SphereGeometry(0.034, 12, 8), a.peau, [0, 0, 0]);
      piece(coude, new THREE.CylinderGeometry(0.034, 0.033, 0.09, 12), a.peau, [0, -0.045, 0]);
      // Main ronde en moufle, avec un petit pouce
      piece(coude, new THREE.SphereGeometry(0.05, 16, 12), a.peau, [0, -0.115, 0.005], [0.85, 1.05, 0.75]);
      piece(coude, new THREE.SphereGeometry(0.02, 10, 8), a.peau, [-cote * 0.035, -0.095, 0.022], [1, 1.5, 1], [0, 0, cote * 0.5]);

      this.epaules.push(epaule);
      this.coudes.push(coude);
    }
  }

  private construireTete() {
    const a = this.a;
    const t = this.tete;
    t.position.y = Y_TETE;
    this.torse.add(t);
    t.add(this.cheveux);

    // Tête ronde, menton doux
    const g = new THREE.SphereGeometry(RT, 40, 30);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / RT;
      const f = y < 0 ? 1 - 0.12 * Math.pow(-y, 2) : 1;
      p.setXYZ(i, p.getX(i) * f, p.getY(i), p.getZ(i) * f);
    }
    g.computeVertexNormals();
    piece(t, g, a.peau, [0, 0, 0], [1, ETIRE, 0.95]);
    // Petit nez rond
    const nez = '#' + new THREE.Color(a.peau).lerp(new THREE.Color('#e8907c'), 0.1).getHexString();
    piece(t, new THREE.SphereGeometry(0.02, 14, 10), nez, [0, -0.05, RT * 0.94], [1.15, 0.85, 0.7]);

    // Le visage dessiné, posé sur l'avant de la tête
    const ouvert = new THREE.CanvasTexture(dessinerVisage(a, true));
    const ferme = new THREE.CanvasTexture(dessinerVisage(a, false));
    for (const tex of [ouvert, ferme]) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
    }
    const materiau = new THREE.MeshStandardMaterial({ map: ouvert, transparent: true, roughness: 0.6, depthWrite: false });
    const geo = new THREE.SphereGeometry(RT * 1.004, 48, 32, Math.PI / 2 - VIS_PHI, VIS_PHI * 2, VIS_T0, VIS_T1 - VIS_T0);
    // Même menton que la tête
    const q = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < q.count; i++) {
      const y = q.getY(i) / RT;
      const f = y < 0 ? 1 - 0.12 * Math.pow(-y, 2) : 1;
      q.setXYZ(i, q.getX(i) * f, q.getY(i), q.getZ(i) * f);
    }
    const decal = new THREE.Mesh(geo, materiau);
    decal.scale.set(1, ETIRE, 0.95);
    decal.renderOrder = 1;
    t.add(decal);
    this.visage = { materiau, ouvert, ferme };
  }

  /**
   * Les cheveux : longs, ondulés, couleur miel, avec la raie au milieu.
   * Une calotte lisse sur le crâne, une masse dans le dos, puis de gros boudins
   * de pâte qui ondulent jusqu'au milieu du dos et s'évasent sur les côtés.
   */
  private construireCheveux() {
    const a = this.a;
    const c = this.cheveux;
    const h = hasard(11);

    // Calotte inclinée vers l'arrière pour dégager le front, avec la raie au milieu
    const cal = new THREE.SphereGeometry(RT * 1.13, 48, 24, 0, Math.PI * 2, 0, 1.6);
    cal.rotateX(-0.85);
    const p = cal.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.z > 0.02) v.multiplyScalar(1 - 0.04 * Math.exp(-((v.x / 0.016) ** 2)));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    cal.computeVertexNormals();
    cal.scale(1, ETIRE, 0.97);
    const mc = new THREE.Mesh(cal, mat(a.cheveux, true));
    mc.castShadow = true;
    c.add(mc);

    // Le sommet du crâne, pour boucher le creux entre les deux grosses mèches
    const sommet = new THREE.SphereGeometry(RT * 1.15, 32, 10, 0, Math.PI * 2, 0, 0.75);
    sommet.scale(1, ETIRE, 0.97);
    piece(c, sommet, a.cheveux, [0, 0, -0.005]);

    // Masse dans le dos, pour qu'on ne voie jamais à travers les mèches
    const masse = tour(
      [[0.2, 0.1], [0.225, 0.0], [0.26, -0.12], [0.3, -0.24], [0.31, -0.34], [0.26, -0.41], [0.0, -0.42]],
      0.6,
      Math.PI / 2 + 0.85,
      Math.PI - 1.7,
      28,
    );
    masse.scale(K, K, K);
    masse.translate(0, 0, -0.04);
    const mm = new THREE.Mesh(masse, mat(a.ombres, true));
    mm.castShadow = true;
    c.add(mm);

    const fonces: THREE.BufferGeometry[] = [];
    const clairs: THREE.BufferGeometry[] = [];
    const ombres: THREE.BufferGeometry[] = [];
    const effile = (epais: number, vague: number) => (t: number) =>
      epais * (t < 0.12 ? 0.5 + 4 * t : 1 - 0.45 * Math.max(0, (t - 0.82) / 0.18)) * (1 + 0.12 * Math.sin(t * 16 + vague));

    /**
     * Une longue mèche ondulée, du crâne jusqu'au dos.
     * phi : autour de la tête (0 = devant, PI = derrière). couche : 0 dessous, 1 dessus.
     */
    const meche = (phi: number, couche: number, liste: THREE.BufferGeometry[]) => {
      const devant = Math.cos(phi);
      const vague = h() * Math.PI * 2;
      const ampleur = 1 - (1 - couche) * 0.06 + (h() - 0.5) * 0.05;
      const bas = -0.4 - Math.max(0, -devant) * 0.03 - h() * 0.03;
      const points: THREE.Vector3[] = [];
      const N = 18;
      for (let s = 0; s <= N; s++) {
        const f = s / N;
        let rho: number;
        let y: number;
        let lateral = 0;
        if (f < 0.25) {
          // Sur le crâne, caché sous la calotte au départ, jusqu'à la tempe
          const th = 0.6 + (f / 0.25) * (Math.PI / 2 - 0.6);
          rho = RT * 1.06 * Math.sin(th);
          y = RT * ETIRE * 1.04 * Math.cos(th);
        } else {
          // Puis la mèche tombe en s'écartant, en grosses vagues, et rentre un peu au bout
          const g = (f - 0.25) / 0.75;
          y = bas * g;
          rho = RT * 1.1 + 0.1 * Math.sin(Math.min(1, g / 0.7) * Math.PI / 2) - 0.05 * Math.max(0, g - 0.75) / 0.25;
          rho += Math.sin(g * Math.PI * 3 + vague) * 0.035 * Math.min(1, g * 4);
          lateral = Math.cos(g * Math.PI * 3 + vague) * 0.03 * Math.min(1, g * 4);
        }
        rho *= ampleur;
        const x = Math.sin(phi) * rho + Math.cos(phi) * lateral;
        const z = Math.cos(phi) * rho * 0.92 - Math.sin(phi) * lateral - 0.02;
        points.push(new THREE.Vector3(x, y, z));
      }
      const epais = 0.06 + h() * 0.01;
      liste.push(boudin(points, effile(epais, vague), 10, 60, false));
    };

    for (const couche of [0, 1]) {
      const nb = couche === 0 ? 14 : 16;
      for (let i = 0; i < nb; i++) {
        const u = (i + 0.5 * (1 - couche)) / (nb - couche);
        const phi = 1.12 + u * (Math.PI * 2 - 2.24);
        meche(phi, couche, couche === 0 ? ombres : i % 3 === 1 ? clairs : fonces);
      }
    }

    // Les deux grosses mèches de devant : elles partent de la raie, encadrent le front puis le visage
    for (const s of [1, -1]) {
      const pts = [
        [0.012, 0.232, 0.08], [0.07, 0.212, 0.135], [0.13, 0.175, 0.152], [0.18, 0.115, 0.13], [0.215, 0.02, 0.1],
        [0.24, -0.07, 0.08], [0.29, -0.14, 0.07], [0.32, -0.21, 0.06], [0.31, -0.29, 0.05], [0.29, -0.37, 0.04],
      ].map(([x, y, z], i) => new THREE.Vector3(s * (x + (i > 4 ? Math.sin(i * 1.6) * 0.02 : 0)), y, z).multiplyScalar(K));
      fonces.push(boudin(pts, effile(0.058, s), 10, 60, false));
      // Une deuxième juste derrière, pour le volume sur les tempes
      const pts2 = pts.map((q, i) => new THREE.Vector3(q.x * 1.1, q.y - 0.015, q.z - 0.06 - i * 0.003));
      clairs.push(boudin(pts2, effile(0.055, s + 2), 10, 50, false));
    }

    // Au fond de la raie, entre les deux grosses mèches (plus sombre, pour qu'on voie la raie)
    const raie = [[0, 0.198, 0.125], [0, 0.218, 0.075], [0, 0.226, 0.02], [0, 0.226, -0.02]].map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(K));
    ombres.push(boudin(raie, () => 0.032 * K, 10, 16));

    // La petite mèche qui retombe sur le front, du côté gauche de son visage
    const boucle = [
      [0.01, 0.25, 0.09], [0.05, 0.232, 0.145], [0.095, 0.19, 0.17], [0.115, 0.14, 0.18], [0.105, 0.105, 0.19], [0.085, 0.11, 0.196],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(K));
    clairs.push(boudin(boucle, (t) => 0.03 * (1 - 0.55 * t), 9, 24, false));

    // Quelques reliefs en vagues sur le dessus du crâne
    for (const s of [1, -1]) {
      for (let i = 0; i < 3; i++) {
        const phi = s * (0.7 + i * 0.55);
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 6; k++) {
          const th = 0.15 + (k / 6) * 1.05;
          const r = RT * 1.08;
          pts.push(new THREE.Vector3(Math.sin(phi) * Math.sin(th) * r, Math.cos(th) * r * ETIRE, Math.cos(phi) * Math.sin(th) * r * 0.97));
        }
        fonces.push(boudin(pts, (t) => 0.028 * Math.sin(Math.PI * (0.1 + 0.8 * t)), 8, 16));
      }
    }

    fusion(c, ombres, a.ombres);
    fusion(c, fonces, a.cheveux);
    fusion(c, clairs, a.reflets);
  }

  /** Place les membres selon l'état demandé */
  animer(e: EtatAnimation) {
    const s = Math.sin(e.phase);
    const debout = 1 - e.assis;
    const amp = e.amplitude * debout;

    // En position assise, on remonte un peu pour que les cuisses se posent sur le siège
    this.racine.position.y = e.assis * (CUISSE - PIVOT_JAMBE) * this.a.taille;

    // Jambes : balancier de marche, ou pliées à angle droit en position assise
    this.hanches.forEach((hanche, i) => {
      const sens = i === 0 ? 1 : -1;
      hanche.rotation.x = sens * s * 0.7 * amp - (Math.PI / 2) * e.assis;
      const flexion = Math.max(0, Math.cos(e.phase + (i === 0 ? 0 : Math.PI)));
      this.genoux[i].rotation.x = amp * (0.1 + 0.8 * flexion) + (Math.PI / 2) * e.assis;
    });
    this.bassin.rotation.y = s * 0.08 * amp;
    this.torse.rotation.y = -s * 0.12 * amp;

    // Bras : un peu écartés du corps, comme sur l'image ; opposés aux jambes en marchant
    this.epaules.forEach((epaule, i) => {
      const sens = i === 0 ? 1 : -1;
      const coude = this.coudes[i];
      if (e.tient) {
        epaule.rotation.set(-1.25, 0, sens * -0.2);
        coude.rotation.set(-0.3, 0, 0);
      } else {
        epaule.rotation.set(
          -sens * s * 0.7 * amp - 0.5 * e.assis,
          0,
          sens * ((0.38 - 0.18 * amp) * debout + 0.15 * e.assis + 0.02 * Math.sin(e.temps * 1.6)),
        );
        coude.rotation.set(-0.3 * amp - 0.1 * debout - 0.6 * e.assis, 0, 0);
      }
    });

    // Salut : bras droit levé, l'avant-bras qui se balance
    if (e.salut > 0) {
      const epaule = this.epaules[1];
      const coude = this.coudes[1];
      // Le bras passe devant les cheveux pour qu'on voie bien la main
      epaule.rotation.x = THREE.MathUtils.lerp(epaule.rotation.x, 0.9, e.salut);
      epaule.rotation.z = THREE.MathUtils.lerp(epaule.rotation.z, -2.67, e.salut);
      coude.rotation.x *= 1 - e.salut;
      coude.rotation.z = e.salut * (Math.sin(e.temps * 11) * 0.45 - 0.3);
    }

    // Respiration, buste un peu penché en courant, tête qui bouge à peine
    this.torse.scale.y = 1 + Math.sin(e.temps * 2) * 0.008;
    this.torse.rotation.x = amp * 0.08;
    this.tete.rotation.y = Math.sin(e.temps * 0.45) * 0.06 * debout;
    this.tete.rotation.x = -amp * 0.05 + Math.sin(e.temps * 0.7) * 0.015;
    this.tete.rotation.z = s * 0.03 * amp;

    // Les cheveux suivent le mouvement avec un peu de retard
    this.cheveux.rotation.x = -amp * 0.08 + Math.sin(e.phase * 2) * 0.015 * amp;

    // Clignement des yeux
    const cycle = e.temps % 3.9;
    const tex = cycle < 0.14 ? this.visage.ferme : this.visage.ouvert;
    if (this.visage.materiau.map !== tex) {
      this.visage.materiau.map = tex;
      this.visage.materiau.needsUpdate = true;
    }
  }
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Apparence d'un avatar, décrite dans src/data/avatars.json */
export interface Apparence {
  taille: number;
  peau: string;
  joues: string | null;
  taches: string | null;
  levres?: string;
  cils?: boolean;
  yeux: string;
  cheveux: string;
  reflets: string;
  /** 'longue-bouclee', 'courte-ondulee', ou 'simple' (figurants) */
  coiffure: string;
  barbe: string | null;
  haut: string;
  interieur: string | null;
  manches: string;
  motif: string | null;
  pantalon: string;
  chaussures: string;
  /** Sans visage ni détails : pour les figurants */
  simple?: boolean;
  /** 'mii' : grosse tête ronde, visage dessiné, coiffure simple. Sinon : style détaillé */
  style?: string;
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
/** Hauteur du dessus d'un siège (bancs, gradins) */
export const HAUTEUR_SIEGE = 0.47;
/** Où les objets tenus sont posés, dans le repère du corps */
export const POSITION_MAINS = new THREE.Vector3(0, 1.0, 0.44);

/** Rayon de la tête, et son étirement vertical */
const R = 0.22;
const ETIRE = 1.06;
const SOURIRE = '#8c4a44';

type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// Matériaux et petites aides
// ---------------------------------------------------------------------------

const materiaux = new Map<string, THREE.Material>();
function mat(couleur: string, options: { double?: boolean; brillant?: boolean } = {}): THREE.Material {
  const cle = `${couleur}-${options.double ? 1 : 0}-${options.brillant ? 1 : 0}`;
  let m = materiaux.get(cle);
  if (!m) {
    m = options.brillant
      ? new THREE.MeshBasicMaterial({ color: couleur })
      : new THREE.MeshStandardMaterial({
          color: couleur,
          roughness: 0.8,
          side: options.double ? THREE.DoubleSide : THREE.FrontSide,
        });
    materiaux.set(cle, m);
  }
  return m;
}

function fonce(couleur: string, f: number): string {
  return '#' + new THREE.Color(couleur).multiplyScalar(f).getHexString();
}

function piece(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  couleur: string,
  pos: Vec3,
  echelle?: Vec3,
  rotation?: Vec3,
  options?: { double?: boolean; brillant?: boolean },
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(couleur, options));
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

/** Garde seulement la position et la normale, sans index, pour pouvoir fusionner */
function nettoyer(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  for (const nom of Object.keys(n.attributes)) if (nom !== 'position' && nom !== 'normal') n.deleteAttribute(nom);
  return n;
}

/** Regroupe plusieurs morceaux de même couleur en un seul objet (plus léger à afficher) */
function fusion(parent: THREE.Object3D, morceaux: THREE.BufferGeometry[], couleur: string) {
  if (morceaux.length === 0) return;
  const m = new THREE.Mesh(mergeGeometries(morceaux.map(nettoyer)), mat(couleur));
  m.castShadow = true;
  parent.add(m);
}

/** Un tube souple le long d'une courbe, plus fin au bout (mèches, sourcils, moustache) */
function tube(points: THREE.Vector3[], r0: number, r1: number, cotes = 6, segments = 24): THREE.BufferGeometry {
  const courbe = new THREE.CatmullRomCurve3(points);
  const reperes = courbe.computeFrenetFrames(segments, false);
  const pos: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = courbe.getPointAt(t);
    const r = r0 + (r1 - r0) * t;
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
      index.push(a, a + cotes, b, b, a + cotes, b + cotes);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Forme tournée autour de l'axe vertical, aplatie d'avant en arrière */
function tour(profil: [number, number][], profondeur = 0.8, debut = 0, angle = Math.PI * 2, cotes = 18) {
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
// La forme de la tête : un œuf, plus étroit vers le menton
// ---------------------------------------------------------------------------

function largeurMachoire(ny: number) {
  return ny < 0 ? 1 - 0.2 * Math.pow(-ny, 1.5) : 1;
}

function geoTete(r: number, w = 28, h = 20): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, w, h);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    const ny = y / r;
    const k = largeurMachoire(ny);
    x *= k;
    if (z > 0) z *= ny < 0 ? 1 - 0.04 * -ny : 1;
    else z *= 0.94 * k;
    y *= ETIRE;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Profondeur de la surface du visage au point (x, y) */
function surface(x: number, y: number): number {
  const y0 = y / ETIRE;
  const ny = y0 / R;
  const x0 = x / largeurMachoire(ny);
  const z0 = Math.sqrt(Math.max(0, R * R - x0 * x0 - y0 * y0));
  return z0 * (ny < 0 ? 1 - 0.04 * -ny : 1);
}

/** Une coque qui épouse la tête, limitée à une zone (cuir chevelu, barbe) */
function coque(r: number, garder: (n: THREE.Vector3) => boolean): THREE.BufferGeometry {
  const source = geoTete(r, 40, 30).toNonIndexed();
  const p = source.attributes.position as THREE.BufferAttribute;
  const gardes: number[] = [];
  const c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    c.set(
      (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
      (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 / ETIRE,
      (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3,
    ).normalize();
    if (!garder(c)) continue;
    for (let k = 0; k < 3; k++) gardes.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(gardes, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Une zone de la tête aux bords bien nets : pour chaque direction autour de la tête
 * (phi = 0 devant), elle va de la hauteur haut(phi) jusqu'à bas (de -1 à 1).
 */
function zoneLisse(
  r: number,
  phiMin: number,
  phiMax: number,
  haut: (phi: number) => number,
  bas: number,
  nPhi = 56,
  nH = 18,
  densite?: (phi: number, ny: number, j: number) => number,
) {
  const pos: number[] = [];
  const couleurs: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= nPhi; i++) {
    const phi = phiMin + ((phiMax - phiMin) * i) / nPhi;
    const h0 = haut(phi);
    for (let j = 0; j <= nH; j++) {
      const ny = h0 + ((bas - h0) * j) / nH;
      const rr = Math.sqrt(Math.max(0, 1 - ny * ny));
      const x = rr * Math.sin(phi) * r;
      const y = ny * r;
      let z = rr * Math.cos(phi) * r;
      z *= z > 0 ? (ny < 0 ? 1 - 0.04 * -ny : 1) : 0.94 * largeurMachoire(ny);
      pos.push(x * largeurMachoire(ny), y * ETIRE, z);
      if (densite) couleurs.push(1, 1, 1, densite(phi, ny, j));
    }
  }
  for (let i = 0; i < nPhi; i++) {
    for (let j = 0; j < nH; j++) {
      const a = i * (nH + 1) + j;
      const b = a + nH + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (densite) g.setAttribute('color', new THREE.Float32BufferAttribute(couleurs, 4));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Calotte lisse sur le haut du crâne, inclinée vers l'arrière pour dégager le front */
function calotte(r: number, ouverture: number, inclinaison: number, couleur: string): THREE.Mesh {
  const g = new THREE.SphereGeometry(r, 36, 14, 0, Math.PI * 2, 0, ouverture);
  g.rotateX(inclinaison);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const ny = p.getY(i) / r;
    let z = p.getZ(i);
    if (z < 0) z *= 0.94;
    p.setXYZ(i, p.getX(i) * largeurMachoire(ny), p.getY(i) * ETIRE, z);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat(couleur, { double: true }));
  m.castShadow = true;
  return m;
}

/**
 * Dans chaque articulation, fusionne les morceaux qui ont la même couleur :
 * beaucoup moins d'objets à dessiner, donc plus fluide sur téléphone.
 */
function regrouper(objet: THREE.Object3D) {
  for (const enfant of [...objet.children]) regrouper(enfant);
  const parMateriau = new Map<THREE.Material, THREE.Mesh[]>();
  for (const enfant of objet.children) {
    if (!(enfant instanceof THREE.Mesh) || enfant.children.length > 0) continue;
    const m = enfant.material as THREE.Material;
    if (!parMateriau.has(m)) parMateriau.set(m, []);
    parMateriau.get(m)!.push(enfant);
  }
  for (const [materiau, meshes] of parMateriau) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      m.updateMatrix();
      return nettoyer(m.geometry.clone().applyMatrix4(m.matrix));
    });
    const fusionne = new THREE.Mesh(mergeGeometries(geos), materiau);
    fusionne.castShadow = true;
    for (const m of meshes) objet.remove(m);
    objet.add(fusionne);
  }
}

/** Style Mii : rayon de la tête, et la zone de la tête couverte par le dessin du visage */
const RM = 0.27;
const VIS_PHI = 1.65;
const VIS_T0 = 0.5;
const VIS_T1 = 2.95;
const VIS_L = 1024;
const VIS_H = 768;

/**
 * Dessine le visage façon Mii sur une image. On place les traits avec des angles :
 * a = vers la droite de l'écran (0 = milieu du visage), t = depuis le haut de la tête (1,57 = mi-hauteur).
 */
function dessinerVisage(a: Apparence, yeuxOuverts: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = VIS_L;
  c.height = VIS_H;
  const g = c.getContext('2d')!;
  const X = (ang: number) => ((ang + VIS_PHI) / (VIS_PHI * 2)) * VIS_L;
  const Y = (t: number) => ((t - VIS_T0) / (VIS_T1 - VIS_T0)) * VIS_H;
  const px = VIS_L / (VIS_PHI * 2); // pixels par radian, à peu près pareil en hauteur
  const trait = '#2b1e18';
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // Barbe : une zone sur la mâchoire et le menton, avec la moustache
  if (a.barbe) {
    g.fillStyle = a.barbe;
    g.globalAlpha = 0.78;
    g.beginPath();
    g.moveTo(X(-1.45), Y(1.62));
    g.bezierCurveTo(X(-1.25), Y(2.05), X(-0.75), Y(2.1), X(-0.32), Y(2.04));
    g.bezierCurveTo(X(-0.12), Y(2.0), X(0.12), Y(2.0), X(0.32), Y(2.04));
    g.bezierCurveTo(X(0.75), Y(2.1), X(1.25), Y(2.05), X(1.45), Y(1.62));
    g.lineTo(X(1.5), Y(VIS_T1));
    g.lineTo(X(-1.5), Y(VIS_T1));
    g.closePath();
    g.fill();
    // Moustache
    g.beginPath();
    g.ellipse(X(0), Y(1.975), 0.21 * px, 0.04 * px, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }

  // Joues roses et taches de rousseur
  if (a.joues) {
    for (const cote of [-1, 1]) {
      const gr = g.createRadialGradient(X(cote * 0.5), Y(1.86), 0, X(cote * 0.5), Y(1.86), 0.17 * px);
      gr.addColorStop(0, a.joues + 'aa');
      gr.addColorStop(1, a.joues + '00');
      g.fillStyle = gr;
      g.fillRect(X(cote * 0.5) - 0.2 * px, Y(1.86) - 0.2 * px, 0.4 * px, 0.4 * px);
    }
  }
  if (a.taches) {
    const h = hasard(3);
    g.fillStyle = a.taches;
    for (let i = 0; i < 22; i++) {
      const cote = i % 2 ? 1 : -1;
      g.beginPath();
      g.arc(X(cote * (0.12 + h() * 0.4)), Y(1.76 + h() * 0.16), 2.5 + h() * 1.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Yeux
  for (const cote of [-1, 1]) {
    const x = X(cote * 0.33);
    const y = Y(1.6);
    if (yeuxOuverts) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(x, y, 0.13 * px, 0.15 * px, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = a.yeux;
      g.beginPath();
      g.ellipse(x, y + 0.015 * px, 0.085 * px, 0.11 * px, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#16110e';
      g.beginPath();
      g.ellipse(x, y + 0.015 * px, 0.045 * px, 0.06 * px, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x + 0.03 * px, y - 0.03 * px, 0.022 * px, 0, Math.PI * 2);
      g.fill();
      // Paupière du haut
      g.strokeStyle = trait;
      g.lineWidth = 0.035 * px;
      g.beginPath();
      g.ellipse(x, y, 0.135 * px, 0.155 * px, 0, Math.PI * 1.08, Math.PI * 1.92);
      g.stroke();
      if (a.cils) {
        g.lineWidth = 0.022 * px;
        for (const [da, dy] of [[0.13, -0.06], [0.1, -0.12]]) {
          g.beginPath();
          g.moveTo(x + cote * da * px, y + dy * px);
          g.lineTo(x + cote * (da + 0.06) * px, y + (dy - 0.05) * px);
          g.stroke();
        }
      }
    } else {
      // Yeux fermés : un petit arc
      g.strokeStyle = trait;
      g.lineWidth = 0.035 * px;
      g.beginPath();
      g.ellipse(x, y - 0.02 * px, 0.12 * px, 0.06 * px, 0, Math.PI * 0.1, Math.PI * 0.9);
      g.stroke();
    }
    // Sourcils
    g.strokeStyle = fonce(a.cheveux, 0.8);
    g.lineWidth = (a.cils ? 0.032 : 0.05) * px;
    g.beginPath();
    g.moveTo(X(cote * 0.18), Y(1.38));
    g.quadraticCurveTo(X(cote * 0.33), Y(a.cils ? 1.3 : 1.33), X(cote * 0.47), Y(1.4));
    g.stroke();
  }

  // Bouche : un sourire, avec la lèvre du bas
  if (a.levres) {
    g.fillStyle = a.levres;
    g.beginPath();
    g.ellipse(X(0), Y(2.12), 0.09 * px, 0.035 * px, 0, 0, Math.PI);
    g.fill();
  }
  g.strokeStyle = a.barbe ? '#e2a99c' : '#8c4a44';
  g.lineWidth = 0.03 * px;
  g.beginPath();
  g.ellipse(X(0), Y(2.06), 0.13 * px, 0.07 * px, 0, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
  return c;
}

// ---------------------------------------------------------------------------
// Le personnage
// ---------------------------------------------------------------------------

/**
 * Un avatar construit à partir de formes simples, avec un squelette minimal
 * (hanches, genoux, épaules, coudes, tête) animé par le code.
 */
export class Modele {
  readonly racine = new THREE.Group();
  private bassin = new THREE.Group();
  private torse = new THREE.Group();
  private tete = new THREE.Group();
  private cheveux = new THREE.Group();
  private yeux: THREE.Group[] = [];
  private hanches: THREE.Group[] = [];
  private genoux: THREE.Group[] = [];
  private epaules: THREE.Group[] = [];
  private coudes: THREE.Group[] = [];
  /** Pour que les deux avatars ne clignent pas des yeux en même temps */
  private decalage: number;
  /** Style Mii : le visage est un dessin, avec une version yeux fermés pour cligner */
  private visage: { materiau: THREE.MeshStandardMaterial; ouvert: THREE.Texture; ferme: THREE.Texture } | null = null;

  constructor(readonly a: Apparence) {
    this.decalage = (a.yeux.charCodeAt(2) % 10) * 0.37;
    this.racine.scale.setScalar(a.taille);
    this.bassin.position.y = HANCHE;
    this.racine.add(this.bassin);
    this.bassin.add(this.torse);

    this.construireJambes();
    this.construireTorse();
    this.construireBras();
    this.construireTete();
    regrouper(this.racine);
  }

  private construireJambes() {
    const a = this.a;
    piece(this.bassin, tour([[0.16, -0.1], [0.2, -0.05], [0.205, 0.04], [0.19, 0.11]]), a.pantalon, [0, 0, 0]);
    const clair = new THREE.Color(a.chaussures).getHSL({ h: 0, s: 0, l: 0 }).l > 0.7;
    const semelle = clair ? '#cfc8bd' : fonce(a.chaussures, 0.6);
    for (const cote of [1, -1]) {
      const hanche = new THREE.Group();
      hanche.position.set(cote * 0.1, -0.02, 0);
      this.bassin.add(hanche);
      piece(hanche, new THREE.CylinderGeometry(0.088, 0.07, 0.34, 12), a.pantalon, [0, -0.17, 0]);

      const genou = new THREE.Group();
      genou.position.y = -0.34;
      hanche.add(genou);
      piece(genou, new THREE.SphereGeometry(0.07, 12, 8), a.pantalon, [0, 0, 0]);
      piece(genou, new THREE.CylinderGeometry(0.068, 0.056, 0.3, 12), a.pantalon, [0, -0.15, 0]);
      // Basket arrondie avec sa semelle
      piece(genou, new THREE.CapsuleGeometry(0.052, 0.11, 4, 10), a.chaussures, [0, -0.33, 0.035], [1.05, 0.85, 1], [Math.PI / 2, 0, 0]);
      if (!a.simple) piece(genou, new THREE.BoxGeometry(0.105, 0.022, 0.22), semelle, [0, -0.357, 0.035]);

      this.hanches.push(hanche);
      this.genoux.push(genou);
    }
  }

  private construireTorse() {
    const a = this.a;
    const t = this.torse;
    const buste: [number, number][] = [[0.2, 0.0], [0.19, 0.14], [0.18, 0.28], [0.2, 0.4], [0.205, 0.45], [0.16, 0.52], [0.09, 0.56]];

    if (a.interieur) {
      // Pull col roulé, et manteau ouvert par-dessus
      piece(t, tour(buste), a.interieur, [0, 0, 0]);
      piece(t, new THREE.CylinderGeometry(0.072, 0.082, 0.11, 14), a.interieur, [0, 0.58, 0]);
      piece(t, new THREE.TorusGeometry(0.075, 0.018, 6, 14), a.interieur, [0, 0.62, 0], [1, 1, 0.9], [Math.PI / 2, 0, 0]);
      const manteau: [number, number][] = [[0.24, -0.22], [0.218, -0.04], [0.203, 0.14], [0.193, 0.28], [0.212, 0.4], [0.216, 0.45], [0.17, 0.525], [0.1, 0.565]];
      piece(t, tour(manteau, 0.82, 0.42, Math.PI * 2 - 0.84), a.haut, [0, 0, 0], undefined, undefined, { double: true });
      // Boutons
      for (const y of [0.05, 0.2]) {
        piece(t, new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), fonce(a.haut, 0.7), [-0.1, y, 0.168], undefined, [Math.PI / 2, 0, 0]);
      }
    } else {
      piece(t, tour(buste), a.haut, [0, 0, 0]);
      piece(t, new THREE.CylinderGeometry(0.064, 0.07, 0.12, 12), a.peau, [0, 0.58, 0]);
      if (!a.simple) piece(t, new THREE.TorusGeometry(0.075, 0.012, 6, 14), fonce(a.haut, 0.85), [0, 0.548, 0], [1, 0.82, 1], [Math.PI / 2, 0, 0]);
    }

    if (a.motif && !a.simple) {
      // Petit dessin sur le t-shirt
      const motif = new THREE.Group();
      motif.position.set(0, 0.34, 0.152);
      t.add(motif);
      for (const [x, y, r] of [[0, 0.045, 0.02], [-0.022, 0.03, 0.016], [0.022, 0.03, 0.016]] as const) {
        piece(motif, new THREE.CircleGeometry(r, 10), a.motif, [x, y, 0]);
      }
      piece(motif, new THREE.RingGeometry(0.02, 0.03, 10, 1, Math.PI, Math.PI), a.motif, [0, -0.025, 0]);
      piece(motif, new THREE.PlaneGeometry(0.006, 0.05), a.motif, [0, 0, 0]);
    }
  }

  private construireBras() {
    const a = this.a;
    const courtes = a.manches === 'courtes';
    const avantBras = courtes ? a.peau : a.haut;
    for (const cote of [1, -1]) {
      const epaule = new THREE.Group();
      epaule.position.set(cote * 0.228, 0.45, 0);
      this.torse.add(epaule);
      piece(epaule, new THREE.SphereGeometry(0.064, 12, 8), a.haut, [0, -0.025, 0]);
      if (courtes) {
        piece(epaule, new THREE.CylinderGeometry(0.078, 0.075, 0.13, 12), a.haut, [0, -0.07, 0]);
        piece(epaule, new THREE.CylinderGeometry(0.056, 0.05, 0.2, 12), a.peau, [0, -0.16, 0]);
      } else {
        piece(epaule, new THREE.CylinderGeometry(0.068, 0.06, 0.27, 12), a.haut, [0, -0.13, 0]);
      }

      const coude = new THREE.Group();
      coude.position.y = -0.27;
      epaule.add(coude);
      piece(coude, new THREE.SphereGeometry(courtes ? 0.05 : 0.059, 10, 8), avantBras, [0, 0, 0]);
      piece(coude, new THREE.CylinderGeometry(courtes ? 0.05 : 0.058, courtes ? 0.042 : 0.054, 0.22, 12), avantBras, [0, -0.11, 0]);
      if (!courtes && !a.simple) piece(coude, new THREE.CylinderGeometry(0.058, 0.058, 0.03, 12), fonce(a.haut, 0.9), [0, -0.21, 0]);

      // Main : paume et pouce
      const main = new THREE.Group();
      main.position.y = -0.255;
      coude.add(main);
      piece(main, new THREE.SphereGeometry(0.05, 12, 8), a.peau, [0, -0.025, 0], [0.72, 1.12, 0.95]);
      if (!a.simple) piece(main, new THREE.SphereGeometry(0.02, 8, 6), a.peau, [-cote * 0.03, -0.012, 0.03], [1, 1.6, 1], [0.4, 0, 0]);

      this.epaules.push(epaule);
      this.coudes.push(coude);
    }
  }

  private construireTete() {
    const a = this.a;
    const t = this.tete;
    t.position.y = 0.82;
    this.torse.add(t);
    t.add(this.cheveux);
    if (a.style === 'mii' && !a.simple) {
      this.construireTeteMii();
      return;
    }

    piece(t, geoTete(R), a.peau, [0, 0, 0]);
    // Oreilles
    for (const cote of [1, -1]) {
      piece(t, new THREE.SphereGeometry(0.046, 10, 8), a.peau, [cote * 0.205, -0.005, -0.01], [0.45, 0.95, 0.72]);
      if (!a.simple) piece(t, new THREE.SphereGeometry(0.026, 8, 6), fonce(a.peau, 0.82), [cote * 0.222, -0.005, -0.004], [0.3, 0.7, 0.5]);
    }

    if (!a.simple) this.construireVisage();
    if (a.barbe) this.construireBarbe(a.barbe);
    if (a.coiffure.startsWith('longue')) this.cheveuxLongs();
    else if (a.coiffure.startsWith('courte')) this.cheveuxCourts();
    else this.cheveuxSimples();
  }

  private construireVisage() {
    const a = this.a;
    const t = this.tete;

    // Yeux : blanc, iris, pupille, reflets, paupière (et cils)
    for (const cote of [1, -1]) {
      const x = cote * 0.078;
      const y = 0.004;
      const oeil = new THREE.Group();
      oeil.position.set(x, y, surface(x, y) - 0.007);
      oeil.rotation.y = cote * 0.32;
      t.add(oeil);
      piece(oeil, new THREE.SphereGeometry(0.036, 16, 12), '#fbf8f4', [0, 0, 0], [1.12, 0.95, 0.32]);
      piece(oeil, new THREE.SphereGeometry(0.026, 16, 12), a.yeux, [0, -0.001, 0.008], [1, 1.08, 0.3]);
      piece(oeil, new THREE.SphereGeometry(0.0135, 12, 8), '#16110e', [0, -0.001, 0.012], [1, 1.08, 0.3]);
      piece(oeil, new THREE.SphereGeometry(0.0065, 8, 6), '#ffffff', [0.008, 0.009, 0.0165], undefined, undefined, { brillant: true });
      piece(oeil, new THREE.SphereGeometry(0.0035, 6, 4), '#ffffff', [-0.007, -0.009, 0.016], undefined, undefined, { brillant: true });
      piece(oeil, new THREE.TorusGeometry(0.037, 0.0058, 5, 14, Math.PI), '#2b1e18', [0, 0.002, 0.006], [1.1, 1, 1]);
      if (a.cils) {
        for (const [dx, dy, r] of [[0.04, 0.018, -1.05], [0.032, 0.03, -0.75]] as const) {
          piece(oeil, new THREE.ConeGeometry(0.0055, 0.026, 5), '#2b1e18', [dx * cote, dy, 0.006], undefined, [0, 0, r * cote]);
        }
      }
      this.yeux.push(oeil);

      // Sourcils
      const fin = a.cils ? 0.0065 : 0.0105;
      const arc = [
        [cote * 0.038, 0.06],
        [cote * 0.078, a.cils ? 0.077 : 0.07],
        [cote * 0.116, a.cils ? 0.062 : 0.064],
      ].map(([sx, sy]) => new THREE.Vector3(sx, sy, surface(sx, sy) + 0.004));
      piece(t, tube(arc, fin, fin * 0.7, 5, 8), fonce(a.cheveux, 0.75), [0, 0, 0]);
    }

    // Nez
    piece(t, new THREE.SphereGeometry(0.02, 14, 10), fonce(a.peau, 0.97), [0, -0.045, surface(0, -0.045) + 0.002], [0.95, 0.9, 0.85]);

    // Bouche : un petit sourire et la lèvre du bas
    const yb = -0.095;
    const avance = a.barbe ? 0.009 : 0;
    piece(t, new THREE.TorusGeometry(0.025, 0.0048, 5, 12, Math.PI), SOURIRE, [0, yb + 0.004, surface(0, yb) + 0.001 + avance], [1, 0.55, 1], [0, 0, Math.PI]);
    piece(t, new THREE.SphereGeometry(0.02, 12, 8), a.levres ?? fonce(a.peau, 0.85), [0, yb - 0.014, surface(0, yb - 0.014) - 0.002 + avance], [1.05, 0.4, 0.45]);

    if (a.joues) {
      for (const cote of [1, -1]) {
        const joue = new THREE.Mesh(
          new THREE.CircleGeometry(0.03, 14),
          new THREE.MeshStandardMaterial({ color: a.joues, transparent: true, opacity: 0.5, depthWrite: false }),
        );
        const jx = cote * 0.118;
        joue.position.set(jx, -0.045, surface(jx, -0.045) + 0.002);
        joue.rotation.y = cote * 0.6;
        t.add(joue);
      }
    }
    if (a.taches) {
      const h = hasard(7);
      const points: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 18; i++) {
        const cote = i % 2 ? 1 : -1;
        const x = cote * (0.025 + h() * 0.1);
        const y = -0.022 - h() * 0.045;
        const g = new THREE.IcosahedronGeometry(0.0038, 0);
        g.translate(x, y, surface(x, y) + 0.001);
        points.push(g);
      }
      fusion(t, points, a.taches);
    }
  }

  private construireBarbe(couleur: string) {
    const t = this.tete;
    // Barbe courte et taillée : elle laisse voir un peu la peau, et ses bords sont fondus
    const haut = (phi: number) => -0.27 + 0.33 * Math.sin(phi) ** 2;
    const phiMax = 1.75;
    const barbe = zoneLisse(R * 1.012, -phiMax, phiMax, haut, -0.96, 60, 20, (phi, ny, j) => {
      const bordHaut = Math.min(1, j / 5);
      const bordCote = Math.min(1, (phiMax - Math.abs(phi)) / 0.35);
      // Plus fournie sur le menton que sur les joues
      const menton = ny < -0.55 && Math.abs(phi) < 0.6 ? 1 : 0.82;
      return 0.94 * bordHaut * bordCote * menton;
    });
    const m = new THREE.Mesh(
      barbe,
      new THREE.MeshStandardMaterial({
        color: couleur,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    t.add(m);
    // Moustache fine, qui rejoint la barbe aux coins de la bouche
    const pts = [[-0.052, -0.086], [-0.035, -0.073], [-0.012, -0.068], [0.012, -0.068], [0.035, -0.073], [0.052, -0.086]].map(
      ([x, y]) => new THREE.Vector3(x, y, surface(x, y) + 0.005),
    );
    piece(t, tube(pts, 0.008, 0.006, 5, 14), couleur, [0, 0, 0]);
  }

  /** Longs cheveux bouclés avec une raie au milieu */
  private cheveuxLongs() {
    const a = this.a;
    const c = this.cheveux;
    // Cuir chevelu : dégage le front et le visage
    c.add(calotte(R * 1.05, 1.3, -0.58, a.cheveux));
    // Derrière et sur les côtés, jusqu'à la nuque
    c.add(new THREE.Mesh(coque(R * 1.04, (n) => n.z < 0.25 && n.y > -0.75), mat(a.cheveux, { double: true })));
    // Une nappe de cheveux dans le dos, sous les mèches, pour qu'on ne voie pas le manteau entre elles
    const nappe = tour([[0.2, 0.02], [0.26, -0.15], [0.3, -0.38], [0.31, -0.6]], 0.85, Math.PI / 2 + 0.25, Math.PI - 0.5, 14);
    const mn = new THREE.Mesh(nappe, mat(fonce(a.cheveux, 0.85), { double: true }));
    mn.castShadow = true;
    c.add(mn);

    const fonces: THREE.BufferGeometry[] = [];
    const clairs: THREE.BufferGeometry[] = [];
    const h = hasard(5);
    const N = 46;
    for (let i = 0; i < N; i++) {
      let phi = 1.1 + ((Math.PI * 2 - 2.2) * (i + 0.5)) / N + (h() - 0.5) * 0.05;
      if (phi > Math.PI) phi -= Math.PI * 2;
      const devant = Math.cos(phi);
      const sx = Math.sin(phi);
      const cote = Math.sign(sx) || 1;
      const rh = R * (1.07 + h() * 0.04);
      const pts: THREE.Vector3[] = [];
      // Du sommet (la raie) vers le côté de la tête
      for (const theta of [0.05, 0.42, 0.85, 1.25]) {
        pts.push(
          new THREE.Vector3(
            rh * Math.sin(theta) * sx + (theta < 0.1 ? cote * 0.012 : 0),
            rh * ETIRE * Math.cos(theta),
            rh * Math.sin(theta) * devant * (devant < 0 ? 0.95 : 1),
          ),
        );
      }
      // Puis la chute, en boucles serrées (des anglaises) qui s'élargissent vers le bas
      const y0 = pts[pts.length - 1].y;
      const longueur = 0.55 + (devant < 0 ? -devant * 0.12 : 0) + h() * 0.1;
      const graine = h() * Math.PI * 2;
      const tours = 4.5 + h() * 1.5;
      const etapes = 30;
      for (let k = 1; k <= etapes; k++) {
        const s = k / etapes;
        const y = y0 - longueur * s;
        // Les cheveux bouclés prennent du volume en descendant
        const rayon = rh * Math.sin(1.25) + 0.035 + 0.11 * Math.sqrt(s);
        const angle = s * tours * Math.PI * 2 + graine;
        const boucle = (0.012 + 0.024 * Math.min(1, s * 3)) * (1 - 0.2 * s);
        let x = rayon * sx + (Math.cos(phi) * Math.cos(angle) + sx * Math.sin(angle)) * boucle;
        let z = rayon * devant + (-Math.sin(phi) * Math.cos(angle) + devant * Math.sin(angle)) * boucle;
        // Les mèches de devant passent par-dessus les épaules et tombent sur la poitrine
        if (devant > 0.15 && y < -0.25) z += 0.07 * devant * Math.min(1, (-0.25 - y) / 0.15);
        if (devant > -0.3 && y < -0.3) x += cote * 0.02;
        pts.push(new THREE.Vector3(x, y, z));
      }
      (i % 3 === 0 ? clairs : fonces).push(tube(pts, 0.032 + h() * 0.006, 0.02, 5, 56));
    }
    fusion(c, fonces, a.cheveux);
    fusion(c, clairs, a.reflets);
  }

  /** Cheveux courts et ondulés : du volume sur le dessus, des mèches qui retombent sur le front */
  private cheveuxCourts() {
    const a = this.a;
    const c = this.cheveux;
    const zone = (n: THREE.Vector3) => n.y > -0.05 + Math.max(0, n.z) * 0.5 || (n.z < -0.2 && n.y > -0.5);
    c.add(new THREE.Mesh(coque(R * 1.04, zone), mat(a.cheveux, { double: true })));
    // Volume sur le dessus de la tête
    c.add(calotte(R * 1.13, 1.05, -0.3, a.cheveux));

    const fonces: THREE.BufferGeometry[] = [];
    const clairs: THREE.BufferGeometry[] = [];
    const h = hasard(11);
    const n = new THREE.Vector3();
    const f = new THREE.Vector3();
    const b = new THREE.Vector3();
    const avant = new THREE.Vector3(0, -0.55, 1);
    const arriere = new THREE.Vector3(0, -1, -0.2);
    let places = 0;
    for (let essai = 0; places < 130 && essai < 4000; essai++) {
      n.set(h() * 2 - 1, h() * 2 - 1, h() * 2 - 1);
      if (n.lengthSq() > 1 || n.lengthSq() < 0.01) continue;
      n.normalize();
      if (!(n.y > 0.12 + Math.max(0, n.z) * 0.38 || (n.z < -0.2 && n.y > -0.35))) continue;
      // Les mèches partent vers l'avant et vers le bas, en suivant la tête
      const sens = n.z > -0.15 ? avant : arriere;
      f.copy(sens).addScaledVector(n, -sens.dot(n));
      f.x += (h() - 0.5) * 0.6;
      f.addScaledVector(n, -f.dot(n)).normalize();
      b.crossVectors(n, f);
      const r = R * (1.13 + Math.max(0, n.y) * 0.04);
      const depart = new THREE.Vector3(n.x * r * largeurMachoire(n.y), n.y * r * ETIRE, n.z * r);
      const longueur = 0.09 + h() * 0.05;
      const onde = (h() - 0.5) * 0.03;
      const pts = [0, 0.33, 0.66, 1].map((u) =>
        depart
          .clone()
          .addScaledVector(f, longueur * u)
          .addScaledVector(n, 0.012 * Math.sin(u * Math.PI) - 0.022 * u)
          .addScaledVector(b, onde * Math.sin(u * Math.PI * 1.5)),
      );
      (places % 3 ? fonces : clairs).push(tube(pts, 0.03, 0.012, 5, 8));
      places++;
    }
    // Mèches qui retombent sur le front
    for (const [x, inclinaison] of [[-0.09, 0.5], [-0.045, 0.25], [0.0, -0.05], [0.05, -0.3], [0.095, -0.5]]) {
      const y = 0.15;
      const z = surface(x, y) + 0.03;
      const pts = [
        new THREE.Vector3(x, y + 0.03, z - 0.01),
        new THREE.Vector3(x + inclinaison * 0.02, y, z + 0.012),
        new THREE.Vector3(x + inclinaison * 0.045, y - 0.04, z + 0.004),
        new THREE.Vector3(x + inclinaison * 0.05, y - 0.065, z - 0.008),
      ];
      fonces.push(tube(pts, 0.024, 0.008, 5, 8));
    }
    fusion(c, fonces, a.cheveux);
    fusion(c, clairs, a.reflets);
  }

  /** Coupe très simple (figurants) */
  private cheveuxSimples() {
    const crane = coque(R * 1.07, (n) => n.y > 0.1 + Math.max(0, n.z) * 0.35 || (n.z < -0.2 && n.y > -0.4));
    this.cheveux.add(new THREE.Mesh(crane, mat(this.a.cheveux, { double: true })));
  }

  // -------------------------------------------------------------------------
  // Style Mii : une grosse tête ronde, un visage dessiné, une coiffure simple
  // -------------------------------------------------------------------------

  private construireTeteMii() {
    const a = this.a;
    const t = this.tete;
    t.position.y = 0.9;
    piece(t, new THREE.SphereGeometry(RM, 36, 28), a.peau, [0, 0, 0], [1, 1.06, 0.98]);
    for (const cote of [1, -1]) {
      piece(t, new THREE.SphereGeometry(0.055, 14, 10), a.peau, [cote * RM * 0.98, -0.01, 0], [0.45, 0.9, 0.7]);
    }
    // Petit nez rond
    piece(t, new THREE.SphereGeometry(0.024, 16, 12), a.peau, [0, -0.07, RM * 0.975], [1, 0.85, 0.75]);

    // Le visage dessiné, posé sur l'avant de la tête comme un autocollant
    const ouvert = new THREE.CanvasTexture(dessinerVisage(a, true));
    const ferme = new THREE.CanvasTexture(dessinerVisage(a, false));
    for (const tex of [ouvert, ferme]) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
    }
    const materiau = new THREE.MeshStandardMaterial({ map: ouvert, transparent: true, roughness: 0.8, depthWrite: false });
    const decal = new THREE.Mesh(
      new THREE.SphereGeometry(RM * 1.004, 48, 32, Math.PI / 2 - VIS_PHI, VIS_PHI * 2, VIS_T0, VIS_T1 - VIS_T0),
      materiau,
    );
    decal.scale.set(1, 1.06, 0.98);
    decal.renderOrder = 1;
    t.add(decal);
    this.visage = { materiau, ouvert, ferme };

    if (a.coiffure.startsWith('longue')) this.cheveuxMiiLongs();
    else this.cheveuxMiiCourts();
  }

  /** Une calotte de cheveux lisse, inclinée vers l'arrière pour dégager le front */
  private calotteMii(couleur: string, ouverture: number, inclinaison: number, rayon = 1.06) {
    const g = new THREE.SphereGeometry(RM * rayon, 36, 18, 0, Math.PI * 2, 0, ouverture);
    g.rotateX(inclinaison);
    g.scale(1, 1.06, 0.98);
    const m = new THREE.Mesh(g, mat(couleur, { double: true }));
    m.castShadow = true;
    this.cheveux.add(m);
  }

  /** Cheveux courts façon Mii : quelques grosses mèches rondes sur le dessus et sur le front */
  private cheveuxMiiCourts() {
    const a = this.a;
    this.calotteMii(a.cheveux, 1.3, -0.42);
    // L'arrière de la tête, jusqu'à la nuque
    const arriere = new THREE.SphereGeometry(RM * 1.05, 32, 18, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, 2.05);
    arriere.scale(1, 1.06, 0.98);
    this.cheveux.add(new THREE.Mesh(arriere, mat(a.cheveux, { double: true })));

    const morceaux: THREE.BufferGeometry[] = [];
    const bosse = (x: number, y: number, z: number, r: number, sx = 1, sy = 1, sz = 1, rz = 0) => {
      const g = new THREE.SphereGeometry(r, 16, 12);
      g.scale(sx, sy, sz);
      g.rotateZ(rz);
      g.translate(x, y, z);
      morceaux.push(g);
    };
    // Volume ondulé sur le dessus
    for (const [x, y, z, r] of [
      [0, 0.25, 0.02, 0.12], [-0.12, 0.22, 0.05, 0.1], [0.12, 0.22, 0.05, 0.1],
      [-0.09, 0.21, -0.12, 0.11], [0.09, 0.21, -0.12, 0.11], [0, 0.2, 0.13, 0.1],
      [-0.2, 0.12, 0.0, 0.09], [0.2, 0.12, 0.0, 0.09],
    ]) bosse(x, y, z, r);
    // Mèches qui retombent sur le front, un peu de travers
    for (const [x, rz] of [[-0.12, 0.5], [-0.04, 0.25], [0.05, -0.05], [0.13, -0.35]]) {
      bosse(x, 0.15, 0.2, 0.075, 0.8, 1.15, 0.6, rz);
    }
    fusion(this.cheveux, morceaux, a.cheveux);
  }

  /** Longs cheveux bouclés façon Mii : un gros nuage de boucles rondes jusqu'au milieu du dos */
  private cheveuxMiiLongs() {
    const a = this.a;
    this.calotteMii(a.cheveux, 1.32, -0.62);
    const fonces: THREE.BufferGeometry[] = [];
    const clairs: THREE.BufferGeometry[] = [];
    const h = hasard(21);
    let n = 0;
    // Des rangées de boucles, de plus en plus larges en descendant
    // Une masse lisse dessous, pour qu'on ne voie pas à travers les boucles
    const masse = tour([[0.22, 0.12], [0.28, 0.0], [0.3, -0.25], [0.29, -0.45], [0.22, -0.56]], 0.9, Math.PI / 2 + 0.55, Math.PI - 1.1, 20);
    const mm = new THREE.Mesh(masse, mat(fonce(a.cheveux, 0.9), { double: true }));
    mm.castShadow = true;
    this.cheveux.add(mm);
    for (let rang = 0; rang < 10; rang++) {
      const y = 0.13 - rang * 0.07;
      const ecart = RM * 0.95 + 0.03 + rang * 0.017;
      const nb = 19;
      for (let k = 0; k < nb; k++) {
        // De la tempe droite à la tempe gauche en passant par l'arrière (le visage reste dégagé)
        const angle = 1.02 + ((Math.PI * 2 - 2.04) * k) / (nb - 1) + (rang % 2) * 0.08;
        // Plus long dans le dos que sur les côtés, avec un bas irrégulier
        const longueur = 7 + Math.round(-Math.cos(angle) * 2.5);
        if (rang > longueur || (rang === longueur && h() < 0.4)) continue;
        let x = Math.sin(angle) * ecart;
        let z = Math.cos(angle) * ecart * 0.95;
        // Devant, les boucles tombent sur les épaules et sur la poitrine
        if (Math.cos(angle) > 0.2 && y < -0.3) z += 0.06;
        if (y < -0.35) x *= 1.08;
        const r = 0.058 + h() * 0.02;
        const g = new THREE.SphereGeometry(r, 10, 8);
        g.translate(x, y + (h() - 0.5) * 0.03, z);
        (n++ % 4 === 0 ? clairs : fonces).push(g);
      }
    }
    fusion(this.cheveux, fonces, a.cheveux);
    fusion(this.cheveux, clairs, a.reflets);
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
    // Le bassin et les épaules tournent un peu à chaque pas
    this.bassin.rotation.y = s * 0.08 * amp;
    this.torse.rotation.y = -s * 0.12 * amp;

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
          sens * (0.1 + 0.015 * Math.sin(e.temps * 1.6)),
        );
        coude.rotation.set(-0.25 * amp - 0.12 * debout - 0.8 * e.assis, 0, 0);
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
    this.tete.rotation.x = -amp * 0.06 + Math.sin(e.temps * 0.7) * 0.015;
    this.tete.rotation.z = s * 0.03 * amp;

    // Les cheveux suivent le mouvement avec un peu de retard
    this.cheveux.rotation.x = -amp * 0.1 + Math.sin(e.phase * 2) * 0.02 * amp;

    // Clignement des yeux
    const cycle = (e.temps + this.decalage) % 4.3;
    const ouvert = cycle < 0.14 ? 0.12 : 1;
    for (const oeil of this.yeux) oeil.scale.y = ouvert;
    if (this.visage) {
      const tex = ouvert < 1 ? this.visage.ferme : this.visage.ouvert;
      if (this.visage.materiau.map !== tex) {
        this.visage.materiau.map = tex;
        this.visage.materiau.needsUpdate = true;
      }
    }
  }

  /**
   * Fige le personnage dans sa pose actuelle et le fusionne en un seul objet
   * d'une seule couleur (figurants : beaucoup moins coûteux à afficher).
   */
  figer(couleur: string): THREE.Mesh {
    this.racine.updateMatrixWorld(true);
    const inverse = this.racine.matrixWorld.clone().invert();
    const morceaux: THREE.BufferGeometry[] = [];
    this.racine.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const g = o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
      morceaux.push(nettoyer(g));
    });
    const m = new THREE.Mesh(
      mergeGeometries(morceaux),
      new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.9, side: THREE.DoubleSide }),
    );
    m.scale.copy(this.racine.scale);
    m.castShadow = true;
    return m;
  }
}

/** Un figurant d'une seule couleur, debout ou assis, construit comme les avatars mais sans visage */
export function creerFigurant(couleur: string, assis: boolean, graine = 1): THREE.Object3D {
  const h = hasard(graine * 97 + 13);
  const modele = new Modele({
    taille: 0.94 + h() * 0.12,
    peau: couleur,
    joues: null,
    taches: null,
    yeux: '#000000',
    cheveux: couleur,
    reflets: couleur,
    coiffure: 'simple',
    barbe: null,
    haut: couleur,
    interieur: null,
    manches: 'longues',
    motif: null,
    pantalon: couleur,
    chaussures: couleur,
    simple: true,
  });
  modele.animer({ temps: h() * 10, phase: 0, amplitude: 0, assis: assis ? 1 : 0, salut: 0, tient: false });
  const corps = modele.figer(couleur);
  if (assis) corps.position.y = -(HANCHE * modele.a.taille - HAUTEUR_SIEGE);
  const groupe = new THREE.Group();
  groupe.add(corps);
  return groupe;
}

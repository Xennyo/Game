import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Apparence } from '../Modele';

/**
 * La tête de l'avatar d'Olivier, façon figurine en pâte à modeler (d'après son image de référence) :
 * grosse tête ronde, cheveux noirs en grosses mèches, sourcils, moustache et barbe en relief,
 * grands yeux dessinés qui clignent.
 *
 * Repère : theta part du haut de la tête (0) vers le bas (PI), phi tourne autour (0 = devant, positif = vers +x).
 */

/** Rayon de la tête et son étirement (le même que la tête des autres avatars figurine) */
const RM = 0.34;
const SY = 1.06;
const SZ = 0.98;

/** Zone du visage dessiné (en angles) et taille de l'image */
const VIS_PHI = 1.2;
const VIS_T0 = 1.05;
const VIS_T1 = 2.35;
const VIS_L = 1024;
const VIS_H = 1024;

export interface VisageAnime {
  materiau: THREE.MeshStandardMaterial;
  ouvert: THREE.Texture;
  ferme: THREE.Texture;
}

const materiaux = new Map<string, THREE.Material>();
function pate(couleur: string, rugosite = 0.6): THREE.Material {
  const cle = couleur + rugosite;
  let m = materiaux.get(cle);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: couleur, roughness: rugosite });
    materiaux.set(cle, m);
  }
  return m;
}

function eclaircir(couleur: string, vers: string, f: number): string {
  return '#' + new THREE.Color(couleur).lerp(new THREE.Color(vers), f).getHexString();
}

/** Un point de la surface de la tête, à la distance r du centre */
function surf(theta: number, phi: number, r: number, cible = new THREE.Vector3()): THREE.Vector3 {
  return cible.set(r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta) * SY, r * Math.sin(theta) * Math.cos(phi) * SZ);
}

function lisse(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function hasard(graine: number) {
  let s = graine;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function ajouter(parent: THREE.Object3D, geo: THREE.BufferGeometry, materiau: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, materiau);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** Fusionne des morceaux en un seul objet (plus léger à afficher) */
function fusion(parent: THREE.Object3D, morceaux: THREE.BufferGeometry[], materiau: THREE.Material) {
  if (morceaux.length === 0) return;
  const propres = morceaux.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const nom of Object.keys(n.attributes)) if (nom !== 'position' && nom !== 'normal') n.deleteAttribute(nom);
    return n;
  });
  ajouter(parent, mergeGeometries(propres), materiau);
}

/**
 * Une nappe posée sur la tête, entre theta = haut(phi) et theta = bas(phi), pour phi de phi0 à phi1.
 * epaisseur(phi, t) : de combien elle dépasse de la peau (t va de 0 en haut à 1 en bas).
 * Ses bords rentrent dans la tête : on dirait une couche de pâte posée dessus.
 */
function nappe(
  phi0: number,
  phi1: number,
  haut: (phi: number) => number,
  bas: (phi: number) => number,
  epaisseur: (phi: number, t: number) => number,
  nPhi = 72,
  nT = 32,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i <= nPhi; i++) {
    const phi = phi0 + ((phi1 - phi0) * i) / nPhi;
    const h = haut(phi);
    const b = bas(phi);
    for (let j = 0; j <= nT; j++) {
      const t = j / nT;
      surf(h + (b - h) * t, phi, RM * 0.985 + epaisseur(phi, t), v);
      positions.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < nPhi; i++) {
    for (let j = 0; j < nT; j++) {
      const a = i * (nT + 1) + j;
      const b = a + nT + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

interface OptionsMeche {
  /** Point de départ sur la tête */
  theta: number;
  phi: number;
  /** Direction de départ : 0 = vers le bas, PI/2 = vers +phi */
  direction: number;
  /** Combien la direction tourne jusqu'au bout */
  courbure?: number;
  /** Longueur et largeur, en angle sur la tête */
  longueur: number;
  largeur: number;
  epaisseur: number;
  /** 'goutte' : plus large au bout, 'fuseau' : fine aux deux bouts, 'racine' : large au départ et pointue au bout */
  forme?: 'goutte' | 'fuseau' | 'racine';
  /** Le bout se décolle de la tête */
  decolle?: number;
  /** Hauteur de départ au-dessus de la peau */
  base?: number;
}

/** Une mèche de pâte à modeler qui épouse la forme de la tête (cheveux, sourcils, moustache) */
function meche(o: OptionsMeche): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 16, 12);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const courbure = o.courbure ?? 0;
  const base = o.base ?? RM * 0.03;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    // s = 0 au départ, 1 au bout
    const s = (1 - y) / 2;
    let f = 1;
    if (o.forme === 'fuseau') f = 0.35 + 0.65 * Math.sin(s * Math.PI) ** 0.6;
    else if (o.forme === 'racine') f = 1.15 - 0.85 * s ** 1.4;
    else f = 0.65 + 0.45 * s;
    // On avance le long de la mèche par petits pas, en tournant peu à peu
    const dir = o.direction + courbure * s;
    const avance = o.longueur * s;
    const lateral = x * f * o.largeur;
    const sinT = Math.max(0.25, Math.sin(o.theta + avance * Math.cos(o.direction + (courbure * s) / 2)));
    const theta = o.theta + avance * Math.cos(o.direction + (courbure * s) / 2) - lateral * Math.sin(dir);
    const phi = o.phi + (avance * Math.sin(o.direction + (courbure * s) / 2) + lateral * Math.cos(dir)) / sinT;
    const r = RM + base + (o.decolle ?? 0) * s * s + z * o.epaisseur * Math.max(0.5, f);
    surf(theta, phi, r, v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/** Les grands yeux verts et le sourire, dessinés sur une image posée sur le visage */
function dessinerVisage(a: Apparence, yeuxOuverts: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = VIS_L;
  c.height = VIS_H;
  const g = c.getContext('2d')!;
  const X = (phi: number) => ((phi + VIS_PHI) / (VIS_PHI * 2)) * VIS_L;
  const Y = (theta: number) => ((theta - VIS_T0) / (VIS_T1 - VIS_T0)) * VIS_H;
  const px = VIS_L / (VIS_PHI * 2);
  const py = VIS_H / (VIS_T1 - VIS_T0);
  const trait = '#2a1d17';
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // Joues légèrement rosées
  if (a.joues) {
    for (const cote of [-1, 1]) {
      const cx = X(cote * 0.56);
      const cy = Y(1.8);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 0.16 * px);
      gr.addColorStop(0, a.joues + '70');
      gr.addColorStop(1, a.joues + '00');
      g.fillStyle = gr;
      g.fillRect(cx - 0.2 * px, cy - 0.2 * px, 0.4 * px, 0.4 * px);
    }
  }

  const yeuxT = 1.6;
  const yeuxP = 0.33;
  for (const cote of [-1, 1]) {
    const x = X(cote * yeuxP);
    const y = Y(yeuxT);
    const rx = 0.15 * px;
    const ry = 0.145 * py;
    if (yeuxOuverts) {
      // Un léger creux autour de l'œil, comme sur une figurine
      g.fillStyle = 'rgba(150, 90, 70, 0.18)';
      g.beginPath();
      g.ellipse(x, y + 0.006 * py, rx * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
      g.fill();
      // Blanc de l'œil
      g.fillStyle = '#fbfaf6';
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      // Iris vert, plus foncé en haut, regard un peu vers le centre
      const ix = x - cote * 0.012 * px;
      const iy = y + 0.004 * py;
      const iris = g.createRadialGradient(ix, iy + 0.03 * py, 0, ix, iy, 0.095 * px);
      iris.addColorStop(0, eclaircir(a.yeux, '#ffffff', 0.25));
      iris.addColorStop(0.7, a.yeux);
      iris.addColorStop(1, eclaircir(a.yeux, '#000000', 0.45));
      g.fillStyle = iris;
      g.beginPath();
      g.ellipse(ix, iy, 0.1 * px, 0.106 * py, 0, 0, Math.PI * 2);
      g.fill();
      // Pupille
      g.fillStyle = '#16120f';
      g.beginPath();
      g.ellipse(ix, iy, 0.043 * px, 0.047 * py, 0, 0, Math.PI * 2);
      g.fill();
      // Reflets
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(ix + 0.03 * px, iy - 0.035 * py, 0.026 * px, 0.026 * py, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(ix - 0.03 * px, iy + 0.04 * py, 0.011 * px, 0, Math.PI * 2);
      g.fill();
      // Paupière du haut, épaisse, qui déborde un peu vers l'extérieur
      g.strokeStyle = trait;
      g.lineWidth = 0.028 * px;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92);
      g.stroke();
      // Petit pli au coin extérieur
      g.lineWidth = 0.016 * px;
      g.beginPath();
      g.moveTo(x + cote * rx * 0.96, y - ry * 0.25);
      g.quadraticCurveTo(x + cote * rx * 1.12, y + ry * 0.2, x + cote * rx * 0.9, y + ry * 0.62);
      g.stroke();
      // Trait fin en bas
      g.strokeStyle = 'rgba(120, 70, 55, 0.45)';
      g.lineWidth = 0.01 * px;
      g.beginPath();
      g.ellipse(x, y, rx * 0.98, ry * 0.98, 0, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();
    } else {
      // Yeux fermés : un arc doux
      g.strokeStyle = trait;
      g.lineWidth = 0.028 * px;
      g.beginPath();
      g.ellipse(x, y + 0.01 * py, rx * 0.95, ry * 0.45, 0, Math.PI * 0.08, Math.PI * 0.92);
      g.stroke();
    }
  }

  // Petit sourire fermé, sous la moustache
  g.strokeStyle = '#7d3a32';
  g.lineWidth = 0.02 * px;
  g.beginPath();
  g.moveTo(X(-0.13), Y(2.0));
  g.quadraticCurveTo(X(0), Y(2.075), X(0.13), Y(2.0));
  g.stroke();
  // Lèvre du bas, juste suggérée
  g.strokeStyle = 'rgba(160, 80, 70, 0.25)';
  g.lineWidth = 0.012 * px;
  g.beginPath();
  g.moveTo(X(-0.06), Y(2.085));
  g.quadraticCurveTo(X(0), Y(2.105), X(0.06), Y(2.085));
  g.stroke();
  return c;
}

/** Limite du cuir chevelu : jusqu'où descendent les cheveux, selon l'endroit autour de la tête */
function lisiere(phi: number): number {
  const a = Math.abs(phi);
  // Devant : le front ; au-dessus des oreilles (bien dégagées) ; derrière : la nuque
  if (a < 0.8) return 1.0 + 0.2 * (a / 0.8) ** 2;
  if (a < 1.85) return 1.2 + 0.12 * Math.sin(((a - 0.8) / 1.05) * Math.PI);
  return 1.2 + 1.1 * lisse((a - 1.85) / 0.6);
}

/** Construit toute la tête d'Olivier dans le groupe "tete", les cheveux dans "cheveux" */
export function construireTeteOlivier(tete: THREE.Group, cheveux: THREE.Group, a: Apparence): VisageAnime {
  // La tête et les oreilles
  const crane = new THREE.SphereGeometry(RM, 40, 30);
  crane.scale(1, SY, SZ);
  ajouter(tete, crane, pate(a.peau, 0.7));
  for (const cote of [1, -1]) {
    const oreille = new THREE.SphereGeometry(0.085, 16, 12);
    oreille.scale(0.5, 1, 0.75);
    oreille.translate(cote * RM * 0.99, -0.04, -0.01);
    ajouter(tete, oreille, pate(a.peau, 0.7));
    const creux = new THREE.SphereGeometry(0.05, 12, 8);
    creux.scale(0.35, 0.85, 0.6);
    creux.translate(cote * RM * 1.03, -0.04, 0.003);
    ajouter(tete, creux, pate(eclaircir(a.peau, '#c97a62', 0.3), 0.7));
  }

  // Gros nez rond et rosé
  const nez = new THREE.SphereGeometry(0.05, 20, 16);
  nez.scale(1.05, 0.92, 0.85);
  nez.translate(...surf(1.74, 0, RM * 0.975).toArray());
  ajouter(tete, nez, pate(eclaircir(a.peau, '#e2846f', 0.3), 0.5));

  // Le visage dessiné, posé sur la tête comme un autocollant
  const ouvert = new THREE.CanvasTexture(dessinerVisage(a, true));
  const ferme = new THREE.CanvasTexture(dessinerVisage(a, false));
  for (const tex of [ouvert, ferme]) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  }
  const materiau = new THREE.MeshStandardMaterial({ map: ouvert, transparent: true, roughness: 0.7, depthWrite: false });
  const decal = new THREE.SphereGeometry(RM * 1.003, 48, 32, Math.PI / 2 - VIS_PHI, VIS_PHI * 2, VIS_T0, VIS_T1 - VIS_T0);
  decal.scale(1, SY, SZ);
  const visage = new THREE.Mesh(decal, materiau);
  visage.renderOrder = 1;
  tete.add(visage);

  const poils = a.barbe ?? a.cheveux;
  construireBarbe(tete, poils);
  construireSourcilsEtMoustache(tete, poils);
  construireCheveux(cheveux, a.cheveux, a.reflets);
  return { materiau, ouvert, ferme };
}

function construireBarbe(tete: THREE.Group, couleur: string) {
  const phiMax = 1.46;
  // Le haut de la barbe : sous la bouche au milieu, puis en diagonale sur les joues jusqu'aux pattes
  const haut = (phi: number) => {
    const a = Math.abs(phi);
    let h: number;
    if (a < 0.25) h = 2.17 - 0.05 * (a / 0.25) ** 2;
    else if (a < 1.05) h = 2.12 - 0.12 * ((a - 0.25) / 0.8);
    else h = 2.0 - 0.78 * lisse((a - 1.05) / 0.38);
    // Des touffes arrondies sur le haut des joues
    if (a > 0.3 && a < 1.1) h -= 0.035 * Math.max(0, Math.sin((a - 0.3) * 14)) ** 1.5;
    return h;
  };
  const bas = (phi: number) => 2.78 - 0.5 * (Math.abs(phi) / phiMax) ** 3;
  const g = nappe(-phiMax, phiMax, haut, bas, (phi, t) => {
    const a = Math.abs(phi);
    const bordHaut = lisse(t / 0.22);
    const bordCote = lisse((phiMax - a) / 0.15);
    const bordBas = lisse((1 - t) / 0.2);
    // Plus épaisse sur le menton que sur les joues, avec des bosses de pâte
    const menton = 0.026 + 0.016 * lisse(1 - a / 0.9) * lisse((t - 0.1) / 0.4);
    const bosses = 0.006 * Math.sin(phi * 13) * Math.sin(t * 9 + phi * 3);
    return (menton + bosses) * bordHaut * bordCote * bordBas;
  });
  ajouter(tete, g, pate(couleur, 0.75));

  // Quelques grosses mèches sur le bas de la barbe, pour l'effet pâte à modeler
  const h = hasard(17);
  const meches: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const phi = -1.0 + (i / 8) * 2.0 + (h() - 0.5) * 0.06;
    meches.push(
      meche({
        theta: 2.36 - Math.abs(phi) * 0.18,
        phi,
        direction: -phi * 0.4,
        longueur: 0.24,
        largeur: 0.1,
        epaisseur: 0.018,
        forme: 'goutte',
        base: 0.026 - Math.abs(phi) * 0.008,
      }),
    );
  }
  fusion(tete, meches, pate(couleur, 0.75));
}

function construireSourcilsEtMoustache(tete: THREE.Group, couleur: string) {
  const morceaux: THREE.BufferGeometry[] = [];
  for (const cote of [-1, 1]) {
    // Sourcil épais, légèrement arqué
    morceaux.push(
      meche({
        theta: 1.36,
        phi: cote * 0.16,
        direction: cote * (Math.PI / 2 + 0.32),
        courbure: -cote * 0.75,
        longueur: 0.36,
        largeur: 0.042,
        epaisseur: 0.02,
        forme: 'fuseau',
        base: 0.004,
      }),
    );
    // Moustache : part du milieu sous le nez, s'élargit puis tombe vers le coin de la bouche
    morceaux.push(
      meche({
        theta: 1.9,
        phi: cote * 0.03,
        direction: cote * (Math.PI / 2 - 0.1),
        courbure: -cote * 0.85,
        longueur: 0.3,
        largeur: 0.058,
        epaisseur: 0.028,
        forme: 'racine',
        base: 0.008,
      }),
    );
  }
  fusion(tete, morceaux, pate(couleur, 0.75));
}

function construireCheveux(cheveux: THREE.Group, couleur: string, reflets: string) {
  // Le cuir chevelu, sous les mèches
  cheveux.add(
    new THREE.Mesh(
      nappe(-Math.PI, Math.PI, () => 0, lisiere, (_phi, t) => 0.022 * lisse((1 - t) / 0.08), 96, 24),
      pate(couleur, 0.65),
    ),
  );

  const h = hasard(29);
  const fonces: THREE.BufferGeometry[] = [];
  const clairs: THREE.BufferGeometry[] = [];
  let k = 0;
  const poser = (o: OptionsMeche) => (k++ % 4 === 0 ? clairs : fonces).push(meche(o));

  // Rangées de grosses mèches, du bas vers le haut (celles du haut recouvrent celles du bas)
  const rangs: { theta: number; nb: number; longueur: number; largeur: number; base: number }[] = [
    { theta: 1.85, nb: 12, longueur: 0.42, largeur: 0.17, base: 0.01 },
    { theta: 1.45, nb: 18, longueur: 0.42, largeur: 0.17, base: 0.018 },
    { theta: 1.05, nb: 16, longueur: 0.44, largeur: 0.18, base: 0.03 },
    { theta: 0.68, nb: 12, longueur: 0.46, largeur: 0.2, base: 0.042 },
    { theta: 0.3, nb: 7, longueur: 0.46, largeur: 0.24, base: 0.052 },
  ];
  for (const [r, rang] of rangs.entries()) {
    for (let i = 0; i < rang.nb; i++) {
      const phi = ((i + (r % 2) * 0.5) / rang.nb) * Math.PI * 2 - Math.PI + (h() - 0.5) * 0.12;
      // Pas de mèche qui descend sur le visage ou sous la nuque, sauf la frange (posée à part)
      if (rang.theta - 0.12 > lisiere(phi) - 0.15) continue;
      if (rang.theta + rang.longueur > lisiere(phi) + 0.08 && Math.abs(phi) < 1.6) continue;
      poser({
        theta: rang.theta - 0.12 + (h() - 0.5) * 0.06,
        phi,
        direction: (h() - 0.5) * 0.5,
        courbure: (h() - 0.5) * 0.6,
        longueur: Math.min(rang.longueur, lisiere(phi) + 0.1 - rang.theta + 0.12),
        largeur: rang.largeur * (0.9 + h() * 0.2),
        epaisseur: 0.042,
        forme: 'goutte',
        decolle: 0.012,
        base: rang.base,
      });
    }
  }

  // La frange : de grosses mèches qui retombent sur le front, un peu de travers
  const frange: [number, number, number][] = [
    [-0.8, 0.3, 0.42],
    [-0.52, 0.18, 0.47],
    [-0.24, 0.08, 0.52],
    [0.04, -0.06, 0.5],
    [0.32, -0.18, 0.5],
    [0.6, -0.3, 0.45],
    [0.86, -0.4, 0.38],
  ];
  for (const [phi, dir, longueur] of frange) {
    poser({
      theta: 0.86 + (h() - 0.5) * 0.04,
      phi,
      direction: dir,
      courbure: (h() - 0.5) * 0.5,
      longueur,
      largeur: 0.18,
      epaisseur: 0.045,
      forme: 'goutte',
      decolle: 0.02,
      base: 0.05,
    });
  }

  // Deux épis sur le sommet, qui se dressent un peu
  for (const [phi, dir] of [
    [-0.5, Math.PI - 0.3],
    [0.45, Math.PI + 0.4],
  ]) {
    poser({
      theta: 0.3,
      phi,
      direction: dir,
      longueur: 0.26,
      largeur: 0.15,
      epaisseur: 0.04,
      forme: 'goutte',
      decolle: 0.03,
      base: 0.075,
    });
  }

  fusion(cheveux, fonces, pate(couleur, 0.62));
  fusion(cheveux, clairs, pate(reflets, 0.62));
}

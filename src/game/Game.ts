import * as THREE from 'three';
import { Input } from './Input';
import { Player } from './Player';
import { GameMaster } from './GameMaster';
import { ThirdPersonCamera } from './Camera';
import { World, type Zone } from './World';
import { Marker } from './Marker';
import { Guide } from './Guide';
import { creerForme } from './Formes';
import { MemoryScene, ORIGINE_SCENES, type Ambiance, type Souvenir } from './Memory';
import { jouerScript, type Acteurs, type Etape } from './Script';
import { Hud } from '../ui/Hud';
import { Dialogue, type Ligne } from '../ui/Dialogue';
import { Fondu } from '../ui/Fondu';
import { MemoryCard } from '../ui/MemoryCard';
import { chargerProgression, sauverProgression } from '../utils/save';
import dialogues from '../data/dialogues.json';
import souvenirsJson from '../data/souvenirs.json';

const souvenirs = souvenirsJson as unknown as Souvenir[];

/** L'ambiance du pré : fin de journée */
const AMBIANCE_PRE: Ambiance = { ciel: '#f6c99b', lumiere: 'soir' };

const LUMIERES: Record<string, { ciel: string; sol: string; ambiante: number; soleil: string; force: number }> = {
  jour: { ciel: '#fff8ee', sol: '#8a7f70', ambiante: 1.4, soleil: '#fff4e0', force: 2.2 },
  soir: { ciel: '#fff1e0', sol: '#8a6f5a', ambiante: 1.2, soleil: '#ffd2a1', force: 2 },
  couvert: { ciel: '#eef1f4', sol: '#7d7f82', ambiante: 1.6, soleil: '#e8ecf0', force: 0.7 },
  nuit: { ciel: '#9fb0d8', sol: '#2a2f45', ambiante: 0.6, soleil: '#b8c8ff', force: 0.6 },
};

/** Boucle principale du jeu et déroulé de la partie */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private timer = new THREE.Timer();
  private input: Input;
  private world = new World();
  private player = new Player();
  private mj = new GameMaster();
  private marker = new Marker();
  private guide = new Guide();
  private cam: ThirdPersonCamera;
  private hud = new Hud();
  private dialogue = new Dialogue();
  private fondu = new Fondu();
  private carte = new MemoryCard();
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private progression = chargerProgression();

  /** Zone où elle marche en ce moment : le pré ou la scène d'un souvenir */
  private zone: Zone;
  /** Vrai quand elle contrôle son avatar (exploration, ou étape "aller" d'un script) */
  private controleLibre = false;
  /** Appelée quand la joueuse entre dans le halo attendu */
  private arriveeHalo: (() => void) | null = null;
  private cadre = new THREE.Vector3();

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Limite la résolution sur les écrans très denses pour rester fluide
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    this.input = new Input(this.renderer.domElement);
    this.input.bloque = true;
    this.cam = new ThirdPersonCamera(this.world.limite + 1);
    this.zone = this.world.zone;

    this.scene.fog = new THREE.Fog('#f6c99b', 25, 60);
    // Lumière douce d'ambiance + soleil (seule source d'ombres)
    this.hemi = new THREE.HemisphereLight('#fff1e0', '#8a6f5a', 1.2);
    this.sun = new THREE.DirectionalLight('#ffd2a1', 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -15;
    s.right = s.top = 15;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.appliquerAmbiance(AMBIANCE_PRE);

    this.scene.add(this.world.object, this.player.object, this.mj.object, this.marker.object, this.guide.object);
    this.player.placer(this.world.spawn, Math.PI); // regarde vers le centre
    this.cam.snap(this.player.object.position);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  start() {
    this.renderer.setAnimationLoop(() => this.update());
    this.deroule().catch((e) => {
      // Ne devrait jamais arriver ; au pire elle peut quand même se promener
      console.error(e);
      this.libererControle();
    });
  }

  /** Le déroulé complet : intro, puis chaque souvenir dans l'ordre */
  private async deroule() {
    const p = this.progression;
    const total = souvenirs.length;

    // Les souvenirs déjà vus laissent leur trace dans le pré
    p.debloques = Math.min(p.debloques, total);
    for (const s of souvenirs.slice(0, p.debloques)) this.ajouterTrace(s);

    if (!p.introFaite) {
      await this.jouer(dialogues.intro as Etape[]);
      p.introFaite = true;
      sauverProgression(p);
    } else {
      // Reprise d'une partie : le MJ l'attend directement près du prochain souvenir
      const suivant = souvenirs[p.debloques];
      this.mj.placer(suivant ? this.pointAttente(suivant) : new THREE.Vector3());
    }
    this.hud.setCompteur(p.debloques, total);

    for (let i = p.debloques; i < total; i++) {
      const s = souvenirs[i];
      const halo = this.vecPre(s.position);

      this.libererControle();
      this.marker.afficher(halo);
      this.guide.viser(halo);
      const marcheMj = this.mj.marcherVers(this.pointAttente(s));
      await this.attendreHalo();
      this.guide.viser(null);
      this.controleLibre = false;
      this.input.bloque = true;
      await marcheMj;

      await this.jouerSouvenir(s);

      p.debloques = i + 1;
      sauverProgression(p);
      this.hud.setCompteur(p.debloques, total);
    }

    // Final provisoire, remplacé par la surprise finale à l'étape 4
    await this.parler((dialogues.finProvisoire as Ligne[]) ?? []);
    this.libererControle();
  }

  private async jouerSouvenir(s: Souvenir) {
    this.marker.cacher();
    await this.parler((s.mjAvant ?? []).map((texte) => ({ qui: 'mj', texte })));

    // Direction la scène du souvenir
    await this.fondu.noir();
    const scene = new MemoryScene(s);
    this.scene.add(scene.object);
    this.zone = scene.zone;
    this.cam.setLimite(ORIGINE_SCENES, (s.scene.rayon ?? 9) + 3);
    this.appliquerAmbiance(s.scene.ambiance);
    this.mj.regardAuto = false;
    // Positions par défaut, que la séquence peut changer avec des étapes "placer"
    this.player.placer(ORIGINE_SCENES.clone().add(new THREE.Vector3(0, 0, 3)), Math.PI);
    this.mj.placer(ORIGINE_SCENES.clone().add(new THREE.Vector3(1.2, 0, 3)), Math.PI);
    this.cam.snap(this.player.object.position);
    // Les premières étapes de placement s'appliquent avant la fin du fondu
    const sequence = this.jouer(s.sequence ?? [], ORIGINE_SCENES);
    await this.fondu.clair();
    await sequence;

    await this.carte.afficher(s);

    // Retour au pré
    await this.fondu.noir();
    scene.detruire();
    this.player.reinitialiser();
    this.mj.reinitialiser();
    this.mj.regardAuto = true;
    this.cam.fixer(null);
    this.zone = this.world.zone;
    this.cam.setLimite(new THREE.Vector3(), this.world.limite + 1);
    this.appliquerAmbiance(AMBIANCE_PRE);

    const halo = this.vecPre(s.position);
    const versCentre = new THREE.Vector3(-halo.x, 0, -halo.z);
    if (versCentre.lengthSq() < 1) versCentre.set(0, 0, 1);
    const retour = halo.clone().addScaledVector(versCentre.normalize(), 2.2);
    this.world.zone.contraint(retour, this.player.rayon);
    // Elle se retrouve face à la trace que le souvenir vient de laisser, caméra côté place
    this.player.placer(retour, Math.atan2(-versCentre.x, -versCentre.z));
    this.mj.placer(this.pointPres('mj', 'joueuse'));
    this.ajouterTrace(s);
    this.cam.yaw = Math.atan2(versCentre.x, versCentre.z);
    this.cam.snap(retour);
    await this.fondu.clair();

    await this.parler((s.mjApres ?? []).map((texte) => ({ qui: 'mj', texte })));
  }

  /** Joue un script (intro, séquence d'un souvenir) en branchant ses actions sur le jeu */
  private async jouer(etapes: Etape[], origine?: THREE.Vector3): Promise<void> {
    this.controleLibre = false;
    this.input.bloque = true;
    const acteurs: Acteurs = {
      perso: (qui) => (qui === 'mj' ? this.mj : this.player),
      dialogue: (lignes) => this.parler(lignes),
      pointPres: (qui, vers) => this.pointPres(qui, vers),
      teleporterMj: (pos) => this.mj.teleporter(pos),
      aller: async (cible, aide, aideTactile) => {
        // Caméra placée derrière elle, tournée vers le halo à rejoindre
        const j = this.player.object.position;
        this.cam.yaw = Math.atan2(j.x - cible.x, j.z - cible.z);
        this.cam.fixer(null);
        this.cam.snap(j);
        this.libererControle();
        this.marker.afficher(cible);
        this.hud.afficherAide(aide, aideTactile);
        await this.attendreHalo();
        this.hud.masquerAide();
        this.controleLibre = false;
        this.input.bloque = true;
      },
      camera: (position, regard, instantane) => this.cam.fixer(position, regard, instantane),
      objet: (forme) => creerForme(forme),
    };
    await jouerScript(etapes, acteurs, origine);
    this.cam.fixer(null);
  }

  private async parler(lignes: Ligne[]) {
    if (lignes.length === 0) return;
    const libre = this.controleLibre;
    this.controleLibre = false;
    this.input.bloque = true;
    await this.dialogue.jouer(lignes);
    if (libre) this.libererControle();
  }

  private libererControle() {
    this.controleLibre = true;
    this.input.bloque = false;
  }

  private attendreHalo(): Promise<void> {
    return new Promise((resolve) => {
      this.arriveeHalo = () => {
        this.marker.cacher();
        resolve();
      };
    });
  }

  private ajouterTrace(s: Souvenir) {
    this.world.ajouterTrace(this.vecPre(s.position), s.photo ? import.meta.env.BASE_URL + s.photo : undefined);
  }

  private vecPre(p: number[]): THREE.Vector3 {
    return new THREE.Vector3(p[0] ?? 0, 0, p[2] ?? 0);
  }

  /** Où le MJ attend près d'un souvenir : à côté du halo, sans être dedans */
  private pointAttente(s: Souvenir): THREE.Vector3 {
    const p = s.attenteMj ? this.vecPre(s.attenteMj) : this.vecPre(s.position).add(new THREE.Vector3(1.8, 0, 0.6));
    this.world.zone.contraint(p, this.mj.rayon);
    return p;
  }

  /**
   * Un point à 2,5 m de `vers`, du côté où se trouve `qui`,
   * légèrement décalé pour que l'un ne cache pas l'autre à la caméra
   */
  private pointPres(qui: 'mj' | 'joueuse', vers: 'mj' | 'joueuse'): THREE.Vector3 {
    const j = (vers === 'mj' ? this.mj : this.player).object.position;
    const m = (qui === 'mj' ? this.mj : this.player).object.position;
    const dir = new THREE.Vector3(m.x - j.x, 0, m.z - j.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45);
    const point = j.clone().addScaledVector(dir, 2.5);
    this.zone.contraint(point, this.mj.rayon);
    return point;
  }

  private appliquerAmbiance(a: Ambiance) {
    const l = LUMIERES[a.lumiere] ?? LUMIERES.soir;
    this.scene.background = new THREE.Color(a.ciel);
    (this.scene.fog as THREE.Fog).color.set(a.ciel);
    this.hemi.color.set(l.ciel);
    this.hemi.groundColor.set(l.sol);
    this.hemi.intensity = l.ambiante;
    this.sun.color.set(l.soleil);
    this.sun.intensity = l.force;
  }

  private update() {
    // Plafonne le pas de temps : pas de saut géant après un changement d'onglet
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    const pos = this.player.object.position;

    this.player.update(dt, this.input.getMove(), this.cam.yaw);
    if (this.controleLibre) {
      this.zone.contraint(pos, this.player.rayon);
      this.separerDuMj(pos);
    }

    // Filet de sécurité : si l'avatar se retrouve dans un état anormal, il réapparaît
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z)) {
      pos.copy(this.zone.centre).add(new THREE.Vector3(0, 0, 3));
      this.cam.snap(pos);
    }

    this.mj.update(dt, pos);
    this.marker.update(dt);
    this.guide.update(dt, pos, this.controleLibre);
    if (this.arriveeHalo && this.controleLibre && this.marker.contient(pos)) {
      const fin = this.arriveeHalo;
      this.arriveeHalo = null;
      fin();
    }

    // Quand elle ne contrôle pas son avatar (dialogue, cinématique), la caméra cadre les deux personnages
    const mjProche = this.mj.object.position.distanceTo(pos) < 8;
    const cible = !this.controleLibre && mjProche ? this.cadre.lerpVectors(pos, this.mj.object.position, 0.5) : pos;
    this.cam.update(dt, cible, this.input.consumeYawDelta());

    // Le soleil suit l'avatar pour garder des ombres nettes autour d'elle
    this.sun.position.set(pos.x + 8, 12, pos.z + 6);
    this.sun.target.position.copy(pos);

    this.renderer.render(this.scene, this.cam.camera);
  }

  /** Empêche la joueuse de traverser l'avatar du MJ */
  private separerDuMj(pos: THREE.Vector3) {
    const m = this.mj.object.position;
    const dx = pos.x - m.x;
    const dz = pos.z - m.z;
    const d = Math.hypot(dx, dz);
    const min = this.player.rayon + this.mj.rayon;
    if (d < min && d > 0.0001) {
      pos.x = m.x + (dx / d) * min;
      pos.z = m.z + (dz / d) * min;
    }
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.renderer.setSize(w, h);
    this.cam.setAspect(w / h);
  }
}

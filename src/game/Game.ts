import * as THREE from 'three';
import { Input } from './Input';
import { Player } from './Player';
import { GameMaster } from './GameMaster';
import { ThirdPersonCamera } from './Camera';
import { World } from './World';
import { Marker } from './Marker';
import { jouerScript, type Etape } from './Script';
import { Hud } from '../ui/Hud';
import { Dialogue } from '../ui/Dialogue';
import dialogues from '../data/dialogues.json';

/** Boucle principale du jeu */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private timer = new THREE.Timer();
  private input: Input;
  private world = new World();
  private player = new Player();
  private mj = new GameMaster();
  private marker = new Marker();
  private cam: ThirdPersonCamera;
  private hud = new Hud();
  private dialogue = new Dialogue();
  private sun: THREE.DirectionalLight;
  /** Appelée quand la joueuse entre dans le halo attendu */
  private arriveeHalo: (() => void) | null = null;
  private cadreDialogue = new THREE.Vector3();

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Limite la résolution sur les écrans très denses pour rester fluide
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    this.input = new Input(this.renderer.domElement);
    this.cam = new ThirdPersonCamera(this.world.limite + 1);

    this.scene.background = new THREE.Color('#f6c99b');
    this.scene.fog = new THREE.Fog('#f6c99b', 25, 60);

    // Lumière douce d'ambiance + soleil de fin de journée (seule source d'ombres)
    this.scene.add(new THREE.HemisphereLight('#fff1e0', '#8a6f5a', 1.2));
    this.sun = new THREE.DirectionalLight('#ffd2a1', 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -15;
    s.right = s.top = 15;
    this.scene.add(this.sun, this.sun.target);

    this.scene.add(this.world.object, this.player.object, this.mj.object, this.marker.object);
    this.player.object.position.copy(this.world.spawn);
    this.player.object.rotation.y = Math.PI; // regarde vers le centre
    this.cam.snap(this.player.object.position);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  start() {
    this.renderer.setAnimationLoop(() => this.update());
    this.jouer(dialogues.intro as Etape[]);
  }

  /** Joue un script (intro, souvenir...) en branchant ses actions sur le jeu */
  private jouer(etapes: Etape[]): Promise<void> {
    return jouerScript(etapes, {
      dialogue: async (lignes) => {
        this.input.bloque = true;
        await this.dialogue.jouer(lignes);
        this.input.bloque = false;
      },
      placerMj: (pos) => this.mj.placer(pos),
      mjMarche: (pos) => this.mj.marcherVers(pos === 'joueuse' ? this.pointDevantJoueuse() : pos),
      mjTeleporte: (pos) => this.mj.teleporter(pos),
      mjSalue: () => this.mj.saluer(),
      aller: (cible, aide, aideTactile) => {
        this.marker.afficher(cible);
        this.hud.afficherAide(aide, aideTactile);
        return new Promise((resolve) => {
          this.arriveeHalo = () => {
            this.marker.cacher();
            this.hud.masquerAide();
            resolve();
          };
        });
      },
    });
  }

  /**
   * Un point à 2,5 m de la joueuse, du côté où se trouve le MJ,
   * légèrement décalé pour qu'elle ne le cache pas à la caméra
   */
  private pointDevantJoueuse(): THREE.Vector3 {
    const j = this.player.object.position;
    const m = this.mj.object.position;
    const dir = new THREE.Vector3(m.x - j.x, 0, m.z - j.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45);
    const point = j.clone().addScaledVector(dir, 2.5);
    this.world.contraint(point, this.mj.rayon);
    return point;
  }

  private update() {
    // Plafonne le pas de temps : pas de saut géant après un changement d'onglet
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    const pos = this.player.object.position;

    this.player.update(dt, this.input.getMove(), this.cam.yaw);
    this.world.contraint(pos, this.player.rayon);
    this.separerDuMj(pos);

    // Filet de sécurité : si l'avatar se retrouve dans un état anormal, il réapparaît
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z)) {
      pos.copy(this.world.spawn);
      this.cam.snap(pos);
    }

    this.mj.update(dt, pos);
    this.marker.update(dt);
    if (this.arriveeHalo && this.marker.contient(pos)) {
      const fin = this.arriveeHalo;
      this.arriveeHalo = null;
      fin();
    }

    // Pendant un dialogue, la caméra cadre les deux avatars
    const cadre = this.dialogue.actif ? this.cadreDialogue.lerpVectors(pos, this.mj.object.position, 0.5) : pos;
    this.cam.update(dt, cadre, this.input.consumeYawDelta());

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

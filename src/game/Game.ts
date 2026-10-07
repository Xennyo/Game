import * as THREE from 'three';
import { Input } from './Input';
import { Player } from './Player';
import { ThirdPersonCamera } from './Camera';
import { World } from './World';
import { Hud } from '../ui/Hud';

/** Boucle principale du jeu */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private clock = new THREE.Clock();
  private input: Input;
  private world = new World();
  private player = new Player();
  private cam: ThirdPersonCamera;
  private hud = new Hud();
  private sun: THREE.DirectionalLight;

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

    this.scene.add(this.world.object, this.player.object);
    this.player.object.position.copy(this.world.spawn);
    this.player.object.rotation.y = Math.PI; // regarde vers le centre
    this.cam.snap(this.player.object.position);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  start() {
    this.renderer.setAnimationLoop(() => this.update());
  }

  private update() {
    // Plafonne le pas de temps : pas de saut géant après un changement d'onglet
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const pos = this.player.object.position;

    const move = this.input.getMove();
    if (move.force > 0) this.hud.masqueAide();
    this.player.update(dt, move, this.cam.yaw);
    this.world.contraint(pos, this.player.rayon);

    // Filet de sécurité : si l'avatar se retrouve dans un état anormal, il réapparaît
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z)) {
      pos.copy(this.world.spawn);
      this.cam.snap(pos);
    }

    this.cam.update(dt, pos, this.input.consumeYawDelta());

    // Le soleil suit l'avatar pour garder des ombres nettes autour d'elle
    this.sun.position.set(pos.x + 8, 12, pos.z + 6);
    this.sun.target.position.copy(pos);

    this.renderer.render(this.scene, this.cam.camera);
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.renderer.setSize(w, h);
    this.cam.setAspect(w / h);
  }
}

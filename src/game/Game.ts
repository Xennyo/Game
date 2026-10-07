import * as THREE from 'three';

/**
 * Boucle principale du jeu.
 * Étape 0 : une scène simple avec un sol, une lumière et un cube.
 */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private cube: THREE.Mesh;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Limite la résolution sur les écrans très denses pour rester fluide
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#f6c99b');
    this.scene.fog = new THREE.Fog('#f6c99b', 30, 80);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.camera.position.set(6, 5, 8);
    this.camera.lookAt(0, 0.5, 0);

    // Lumière douce d'ambiance + soleil de fin de journée (seule source d'ombres)
    this.scene.add(new THREE.HemisphereLight('#fff1e0', '#8a6f5a', 1.2));
    const sun = new THREE.DirectionalLight('#ffd2a1', 2);
    sun.position.set(8, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(30, 48),
      new THREE.MeshStandardMaterial({ color: '#9cc97a' }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#e86f68', flatShading: true }),
    );
    this.cube.position.y = 0.5;
    this.cube.castShadow = true;
    this.scene.add(this.cube);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  start() {
    this.renderer.setAnimationLoop(() => this.update());
  }

  private update() {
    const dt = this.clock.getDelta();
    this.cube.rotation.y += dt * 0.8;
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

/**
 * Entrées du joueur : clavier (ZQSD / WASD / flèches, Maj pour courir),
 * joystick tactile (moitié gauche de l'écran) et glisser pour tourner la caméra
 * (souris n'importe où, ou doigt sur la moitié droite de l'écran).
 */

export interface MoveInput {
  /** Direction voulue, relative à la caméra : x vers la droite, z vers l'avant */
  x: number;
  z: number;
  /** Intensité entre 0 (immobile) et 1 (course) */
  force: number;
}

const JOYSTICK_RAYON = 50; // en pixels

export class Input {
  private keys = new Set<string>();
  private joyPointer = -1;
  private joyOrigin = { x: 0, y: 0 };
  private joyVec = { x: 0, y: 0 };
  private lookPointer = -1;
  private lookLastX = 0;
  private yawDelta = 0;

  /** Quand vrai (pendant un dialogue), l'avatar ne bouge pas et le joystick n'apparaît pas */
  private _bloque = false;

  private joyBase: HTMLDivElement;
  private joyKnob: HTMLDivElement;

  constructor(surface: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      // e.code = position physique de la touche : Z sur un clavier AZERTY = KeyW
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    // Si la fenêtre perd le focus, on relâche tout (évite un avatar qui avance tout seul)
    window.addEventListener('blur', () => this.keys.clear());

    this.joyBase = document.createElement('div');
    this.joyBase.className = 'joystick';
    this.joyKnob = document.createElement('div');
    this.joyKnob.className = 'joystick-knob';
    this.joyBase.appendChild(this.joyKnob);
    document.body.appendChild(this.joyBase);

    surface.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));
    surface.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onDown(e: PointerEvent) {
    const tactile = e.pointerType !== 'mouse';
    if (tactile && e.clientX < window.innerWidth / 2) {
      if (this._bloque || this.joyPointer >= 0) return;
      // Le joystick apparaît là où le doigt se pose
      this.joyPointer = e.pointerId;
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      this.joyVec = { x: 0, y: 0 };
      this.joyBase.style.left = `${e.clientX}px`;
      this.joyBase.style.top = `${e.clientY}px`;
      this.joyKnob.style.transform = 'translate(-50%, -50%)';
      this.joyBase.classList.add('visible');
    } else if (this.lookPointer < 0) {
      this.lookPointer = e.pointerId;
      this.lookLastX = e.clientX;
    }
  }

  private onMove(e: PointerEvent) {
    if (e.pointerId === this.joyPointer) {
      let dx = e.clientX - this.joyOrigin.x;
      let dy = e.clientY - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > JOYSTICK_RAYON) {
        dx = (dx / len) * JOYSTICK_RAYON;
        dy = (dy / len) * JOYSTICK_RAYON;
      }
      this.joyVec = { x: dx / JOYSTICK_RAYON, y: dy / JOYSTICK_RAYON };
      this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    } else if (e.pointerId === this.lookPointer) {
      this.yawDelta += (e.clientX - this.lookLastX) * 0.006;
      this.lookLastX = e.clientX;
    }
  }

  private onUp(e: PointerEvent) {
    if (e.pointerId === this.joyPointer) {
      this.joyPointer = -1;
      this.joyVec = { x: 0, y: 0 };
      this.joyBase.classList.remove('visible');
    } else if (e.pointerId === this.lookPointer) {
      this.lookPointer = -1;
    }
  }

  set bloque(v: boolean) {
    this._bloque = v;
    if (v) {
      this.keys.clear();
      this.joyPointer = -1;
      this.joyVec = { x: 0, y: 0 };
      this.joyBase.classList.remove('visible');
    }
  }

  /** Rotation de caméra demandée depuis le dernier appel (en radians) */
  consumeYawDelta(): number {
    const d = this.yawDelta;
    this.yawDelta = 0;
    return d;
  }

  getMove(): MoveInput {
    if (this._bloque) return { x: 0, z: 0, force: 0 };
    // Joystick tactile en priorité
    if (this.joyPointer >= 0) {
      const force = Math.hypot(this.joyVec.x, this.joyVec.y);
      if (force < 0.15) return { x: 0, z: 0, force: 0 }; // zone morte
      return { x: this.joyVec.x / force, z: -this.joyVec.y / force, force };
    }

    const k = this.keys;
    const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const z = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const len = Math.hypot(x, z);
    if (len === 0) return { x: 0, z: 0, force: 0 };
    const course = k.has('ShiftLeft') || k.has('ShiftRight');
    return { x: x / len, z: z / len, force: course ? 1 : 0.6 };
  }
}

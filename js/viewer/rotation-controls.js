import * as THREE from 'three';

const RADIANS_PER_PIXEL = 0.009;
const KEY_STEP = 0.35;           // radians added per arrow-key press
const FLING_DAMPING = 3.5;       // how fast a flick slows down (higher = sooner)
const IDLE_SPIN_SPEED = 0.35;    // radians per second when nobody is touching it
const IDLE_SPIN_DELAY = 2.5;     // seconds of no input before the idle spin starts
const RESET_SPEED = 6;           // how fast "reset" glides home

const SCREEN_UP = new THREE.Vector3(0, 1, 0);
const SCREEN_RIGHT = new THREE.Vector3(1, 0, 0);

/**
 * Lets the user spin an object freely in every direction, like rolling a ball.
 *
 * Why not OrbitControls? Orbit controls stop at the poles, so you can never
 * turn a model fully upside down. Here every drag rotates the object around
 * the *screen's* axes, so any orientation is reachable.
 *
 * Supports mouse, touch and pen (pointer events), arrow keys, a "flick"
 * that keeps spinning and slows down, double-click to reset, and a slow
 * idle spin.
 */
export class FreeRotationControls {
  constructor(target, element, { idleSpin = true } = {}) {
    this.target = target;
    this.element = element;
    this.idleSpin = idleSpin;

    this.homeQuaternion = target.quaternion.clone();
    this.velocity = new THREE.Vector2();   // x: spin speed left/right, y: tip speed up/down
    this.isDragging = false;
    this.isResetting = false;
    this.secondsSinceInput = Infinity;
    this.activePointerId = null;
    this.lastPointer = { x: 0, y: 0, time: 0 };

    this.bindEvents();
  }

  setHome(quaternion) {
    this.homeQuaternion.copy(quaternion);
    this.target.quaternion.copy(quaternion);
    this.velocity.set(0, 0);
    this.isResetting = false;
  }

  reset() {
    this.velocity.set(0, 0);
    this.isResetting = true;
    this.secondsSinceInput = 0;
  }

  /** Rotate around the screen's vertical axis (yaw) and horizontal axis (pitch). */
  rotateBy(yaw, pitch) {
    const spin = new THREE.Quaternion().setFromAxisAngle(SCREEN_UP, yaw);
    const tip = new THREE.Quaternion().setFromAxisAngle(SCREEN_RIGHT, pitch);
    // premultiply = apply in screen space, not in the model's own (already rotated) space
    this.target.quaternion.premultiply(spin).premultiply(tip);
  }

  /** Call once per frame. */
  update(deltaSeconds) {
    this.secondsSinceInput += deltaSeconds;

    if (this.isResetting) {
      this.glideHome(deltaSeconds);
      return;
    }
    if (this.isDragging) return;

    // Keep spinning after a flick, slowing down smoothly.
    this.rotateBy(this.velocity.x * deltaSeconds, this.velocity.y * deltaSeconds);
    this.velocity.multiplyScalar(Math.exp(-FLING_DAMPING * deltaSeconds));

    if (this.idleSpin && this.secondsSinceInput > IDLE_SPIN_DELAY) {
      // Ease the idle spin in instead of snapping to full speed.
      const easeIn = Math.min((this.secondsSinceInput - IDLE_SPIN_DELAY) / 1.5, 1);
      this.rotateBy(IDLE_SPIN_SPEED * easeIn * deltaSeconds, 0);
    }
  }

  glideHome(deltaSeconds) {
    const step = 1 - Math.exp(-RESET_SPEED * deltaSeconds);
    this.target.quaternion.slerp(this.homeQuaternion, step);
    if (this.target.quaternion.angleTo(this.homeQuaternion) < 0.002) {
      this.target.quaternion.copy(this.homeQuaternion);
      this.isResetting = false;
    }
  }

  // ───────────── input handling ─────────────

  bindEvents() {
    const el = this.element;
    el.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    el.addEventListener('pointermove', (event) => this.onPointerMove(event));
    el.addEventListener('pointerup', (event) => this.onPointerUp(event));
    el.addEventListener('pointercancel', (event) => this.onPointerUp(event));
    el.addEventListener('dblclick', () => this.reset());
    el.addEventListener('keydown', (event) => this.onKeyDown(event));
  }

  onPointerDown(event) {
    if (this.activePointerId !== null) return; // ignore a second finger
    if (event.target.closest('button, a')) return; // let buttons inside the slot get their click
    this.activePointerId = event.pointerId;
    this.element.setPointerCapture(event.pointerId);
    this.element.classList.add('is-dragging');

    this.isDragging = true;
    this.isResetting = false;
    this.velocity.set(0, 0);
    this.lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    this.secondsSinceInput = 0;
  }

  onPointerMove(event) {
    if (!this.isDragging || event.pointerId !== this.activePointerId) return;

    const yaw = (event.clientX - this.lastPointer.x) * RADIANS_PER_PIXEL;
    const pitch = (event.clientY - this.lastPointer.y) * RADIANS_PER_PIXEL;
    this.rotateBy(yaw, pitch);

    // Remember how fast the pointer was moving, for the flick on release.
    const elapsed = Math.max((event.timeStamp - this.lastPointer.time) / 1000, 1 / 120);
    const instantVelocity = new THREE.Vector2(yaw / elapsed, pitch / elapsed);
    this.velocity.lerp(instantVelocity, 0.5);

    this.lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    this.secondsSinceInput = 0;
  }

  onPointerUp(event) {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.isDragging = false;
    this.element.classList.remove('is-dragging');

    // If the pointer paused before letting go, it was a "place", not a "flick".
    const heldStillFor = event.timeStamp - this.lastPointer.time;
    if (heldStillFor > 80) this.velocity.set(0, 0);
    this.secondsSinceInput = 0;
  }

  onKeyDown(event) {
    const keySpins = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    if (event.key === 'Home' || event.key === '0') {
      this.reset();
      event.preventDefault();
      return;
    }
    const spin = keySpins[event.key];
    if (!spin) return;

    event.preventDefault(); // don't scroll the page
    this.isResetting = false;
    // A key press gives the model a nudge that then glides to a stop.
    this.velocity.x += spin[0] * FLING_DAMPING;
    this.velocity.y += spin[1] * FLING_DAMPING;
    this.secondsSinceInput = 0;
  }
}

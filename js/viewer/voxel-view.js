import * as THREE from 'three';
import { buildVoxelModel, MODEL_RADIUS } from './voxel-builder.js';
import { FreeRotationControls } from './rotation-controls.js';

const SHRINK_SECONDS = 0.18;   // old model shrinks away…
const GROW_SECONDS = 0.6;      // …then the new one pops in
const CAMERA_FOV = 30;
const FIT_WITH_SPHERE = MODEL_RADIUS * 1.3;     // a little room around the dotted sphere
const FIT_WITHOUT_SPHERE = MODEL_RADIUS * 1.05; // no sphere: let the model fill the slot

/**
 * One 3D slot on the page: its own little scene, camera and drag controls.
 * It does not draw itself; the shared VoxelStage draws it into the slot's
 * rectangle each frame.
 *
 * Scene layout:
 *   scene
 *   ├─ lights (fixed, so shading changes as you turn the model)
 *   └─ rotor  ← FreeRotationControls turns this
 *       ├─ dotted sphere (shows you are rolling a ball)
 *       └─ floater (gentle bob) → current model
 */
export class VoxelView {
  constructor(element, models, { onModelChange, idleSpin = true, showSphere = true } = {}) {
    this.element = element;
    this.models = models;
    this.onModelChange = onModelChange;
    this.isMotionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
    this.addLights();

    this.rotor = new THREE.Group();
    this.floater = new THREE.Group();
    this.fitRadius = showSphere ? FIT_WITH_SPHERE : FIT_WITHOUT_SPHERE;
    this.rotor.add(this.floater);
    if (showSphere) this.rotor.add(createDottedSphere(MODEL_RADIUS * 1.18));
    this.scene.add(this.rotor);

    this.controls = new FreeRotationControls(this.rotor, element, {
      idleSpin: idleSpin && !this.isMotionReduced,
    });

    this.current = null;     // { built, startedAt }
    this.outgoing = null;    // { built, startedAt }
    this.pendingIndex = null;
    this.modelIndex = 0;
    this.lastNow = 0;
    this.lastSize = { width: 0, height: 0 };

    this.showModel(0);
  }

  // ───────────── public API ─────────────

  showModel(index) {
    const wrapped = (index + this.models.length) % this.models.length;
    this.modelIndex = wrapped;
    this.onModelChange?.(this.models[wrapped], wrapped);

    if (this.current) {
      // Shrink the current model first; the new one starts when that finishes.
      this.outgoing = { built: this.current.built, startedAt: this.lastNow };
      this.current = null;
      this.pendingIndex = wrapped;
    } else {
      this.startModel(wrapped);
    }
  }

  resetRotation() {
    this.controls.reset();
  }

  /** Pop the current model in again from nothing (used when the intro finishes). */
  replayEntrance() {
    if (!this.current) return;
    this.current.startedAt = this.lastNow;
    this.controls.setHome(this.controls.homeQuaternion.clone());
  }

  /** Called by VoxelStage each frame while the slot is on screen. */
  update(delta, now, width, height) {
    this.lastNow = now;
    this.fitCameraTo(width, height);
    this.controls.update(delta);
    this.updateOutgoing(now);
    this.updateCurrent(now);
    if (!this.isMotionReduced) this.floater.position.y = Math.sin(now * 1.6) * 0.04;
  }

  // ───────────── setup ─────────────

  addLights() {
    const ambient = new THREE.HemisphereLight('#DEE7E2', '#123322', 1.5);
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(3, 4, 5);
    const rim = new THREE.DirectionalLight('#7FE4A5', 1.8); // phosphor back-light for the green edge glow
    rim.position.set(-4, -1, -4);
    this.scene.add(ambient, key, rim);
  }

  /** Move the camera back just far enough that the sphere fits, for wide or tall slots alike. */
  fitCameraTo(width, height) {
    if (width === this.lastSize.width && height === this.lastSize.height) return;
    this.lastSize = { width, height };

    const aspect = width / height;
    const halfVertical = THREE.MathUtils.degToRad(CAMERA_FOV / 2);
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
    const tightestHalfAngle = Math.min(halfVertical, halfHorizontal);

    this.camera.aspect = aspect;
    this.camera.position.set(0, 0, this.fitRadius / Math.sin(tightestHalfAngle));
    this.camera.updateProjectionMatrix();
  }

  // ───────────── model lifecycle ─────────────

  startModel(index) {
    const definition = this.models[index];
    const built = buildVoxelModel(definition);
    built.root.userData.fullScale = built.root.scale.x;
    built.root.scale.setScalar(0);
    this.floater.add(built.root);

    const [tiltX, tiltY] = definition.homeTilt;
    this.controls.setHome(new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltX, tiltY, 0, 'XYZ')));
    this.current = { built, startedAt: this.lastNow };
  }

  updateOutgoing(now) {
    if (!this.outgoing) return;
    const { built, startedAt } = this.outgoing;
    const progress = Math.min((now - startedAt) / SHRINK_SECONDS, 1);
    built.root.scale.setScalar(built.root.userData.fullScale * (1 - progress ** 2));

    if (progress === 1) {
      this.floater.remove(built.root);
      built.dispose();
      this.outgoing = null;
      this.startModel(this.pendingIndex);
    }
  }

  updateCurrent(now) {
    if (!this.current) return;
    const { built, startedAt } = this.current;
    const progress = Math.min((now - startedAt) / GROW_SECONDS, 1);
    built.root.scale.setScalar(built.root.userData.fullScale * easeOutBack(progress));
    if (!this.isMotionReduced) built.animate(now);
  }
}

/** A sphere drawn with evenly spaced dots (a "Fibonacci sphere"), like a dot-matrix globe. */
function createDottedSphere(radius, dotCount = 280) {
  const positions = new Float32Array(dotCount * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < dotCount; i++) {
    const y = 1 - (i / (dotCount - 1)) * 2;
    const ringRadius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * i;
    positions.set([Math.cos(angle) * ringRadius * radius, y * radius, Math.sin(angle) * ringRadius * radius], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: '#33724C',
    size: 0.04,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

/** Overshoots slightly then settles: the "pop" when a model appears. */
function easeOutBack(t) {
  const overshoot = 1.7;
  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
}

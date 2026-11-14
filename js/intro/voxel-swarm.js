import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { layoutPixelText } from './pixel-font.js';

/**
 * The 3D part of the intro.
 *
 * Hundreds of small rounded cubes start as a spinning globe, fly out one
 * column at a time and lock into the name in pixel letters. On exit they
 * blast towards the camera and past it, like jumping to warp speed.
 *
 * Times below are in seconds since the swarm started.
 */
export const SWARM_TIMING = {
  globeFormSeconds: 0.6,     // cubes pop into place on the globe
  assembleStartsAt: 0.6,     // first cubes leave the globe
  sweepSeconds: 0.6,         // left-most to right-most cube start time spread
  flightSeconds: 0.85,       // how long one cube's flight takes
  exitSeconds: 0.9,          // warp-out duration
};
/** When every cube has landed. */
export const SWARM_ASSEMBLED_AT =
  SWARM_TIMING.assembleStartsAt + SWARM_TIMING.sweepSeconds + 0.12 + SWARM_TIMING.flightSeconds;

const CUBES_PER_PIXEL_SIDE = 2;   // each font pixel becomes 2×2 cubes, for a denser swarm
const COLORS = { w: '#DEE7E2', g: '#7FE4A5' };

export class VoxelSwarm {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2000);
    this.addLights();

    this.buildName();
    this.buildGlobeDust();
    this.resize();
  }

  // ───────────── setup ─────────────

  addLights() {
    const ambient = new THREE.HemisphereLight('#DEE7E2', '#123322', 1.4);
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(20, 30, 60);
    const rim = new THREE.DirectionalLight('#7FE4A5', 2);
    rim.position.set(-40, -10, -30);
    this.scene.add(ambient, key, rim);
  }

  /** Lay out the name as target positions, one per cube. */
  buildName() {
    // Narrow (phone) screens get the name on two lines.
    const isNarrow = window.innerWidth / window.innerHeight < 0.9;
    const lines = isNarrow
      ? [[{ text: 'ILYAS', color: 'w' }], [{ text: 'KHAN', color: 'g' }]]
      : [[{ text: 'ILYAS ', color: 'w' }, { text: 'KHAN', color: 'g' }]];
    const layout = layoutPixelText(lines);

    this.nameWidth = layout.width * CUBES_PER_PIXEL_SIDE;
    this.nameHeight = layout.height * CUBES_PER_PIXEL_SIDE;
    this.globeRadius = Math.max(this.nameWidth * 0.24, this.nameHeight * 0.9);
    const liftUp = this.nameHeight * 0.35; // leave room for the tagline underneath

    const cubes = [];
    for (const pixel of layout.pixels) {
      for (let subX = 0; subX < CUBES_PER_PIXEL_SIDE; subX++) {
        for (let subY = 0; subY < CUBES_PER_PIXEL_SIDE; subY++) {
          const x = pixel.x * CUBES_PER_PIXEL_SIDE + subX - this.nameWidth / 2 + 0.5;
          const y = -(pixel.y * CUBES_PER_PIXEL_SIDE + subY) + this.nameHeight / 2 - 0.5 + liftUp;
          cubes.push({ target: new THREE.Vector3(x, y, 0), color: pixel.color });
        }
      }
    }

    const globeDirections = fibonacciSphere(cubes.length);
    // Shuffle which globe spot each cube starts from, so the flight paths cross nicely.
    shuffle(globeDirections);

    cubes.forEach((cube, index) => {
      cube.globeDirection = globeDirections[index];
      // Cubes leave the globe in a sweep from left to right, with a little jitter.
      const leftToRight = (cube.target.x + this.nameWidth / 2) / this.nameWidth;
      cube.delay = leftToRight * SWARM_TIMING.sweepSeconds + Math.random() * 0.12;
      cube.spinAxis = new THREE.Vector3().randomDirection();
      cube.spinTurns = 1 + Math.random() * 2;
      cube.exitDrift = new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, 1);
      cube.exitSpeed = 0.7 + Math.random() * 0.6;
    });

    // One instanced mesh per colour: hundreds of cubes for the price of two draw calls.
    const geometry = new RoundedBoxGeometry(0.9, 0.9, 0.9, 2, 0.15);
    this.disposables = [geometry];
    this.groups = Object.entries(COLORS).map(([colorKey, hex]) => {
      const groupCubes = cubes.filter((cube) => cube.color === colorKey);
      const material = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.5,
        emissive: colorKey === 'g' ? hex : '#000000',
        emissiveIntensity: colorKey === 'g' ? 0.6 : 0,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, groupCubes.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
      this.disposables.push(material);
      return { mesh, cubes: groupCubes };
    });
  }

  /** The faint dotted globe, same motif as the 3D models on the page. */
  buildGlobeDust() {
    const directions = fibonacciSphere(700);
    const positions = new Float32Array(directions.length * 3);
    directions.forEach((direction, index) => positions.set([direction.x, direction.y, direction.z], index * 3));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dustMaterial = new THREE.PointsMaterial({ color: '#33724C', size: 0.35, transparent: true, depthWrite: false });
    this.dust = new THREE.Points(geometry, this.dustMaterial);
    this.scene.add(this.dust);
    this.disposables.push(geometry, this.dustMaterial);
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.renderer.setSize(width, height, false);

    const aspect = width / height;
    const halfVertical = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
    // Back off until both the name (sideways) and the globe (up and down) fit.
    const fitWidth = (this.nameWidth / 2) * 1.35 / Math.tan(halfHorizontal);
    const fitHeight = this.globeRadius * 1.35 / Math.tan(halfVertical);

    this.camera.aspect = aspect;
    this.camera.position.set(0, 0, Math.max(fitWidth, fitHeight));
    this.camera.updateProjectionMatrix();
  }

  // ───────────── animation ─────────────

  /**
   * Draw one frame.
   * seconds: time since the swarm started.
   * exitProgress: 0 until the warp-out begins, then 0 → 1.
   */
  render(seconds, exitProgress = 0) {
    const globeSpin = seconds * 0.9;
    const holdRipple = clamp01((seconds - SWARM_ASSEMBLED_AT) / 0.4);
    const warp = exitProgress * exitProgress; // starts slow, then rushes

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (const { mesh, cubes } of this.groups) {
      cubes.forEach((cube, index) => {
        // 1. Where the cube sits on the spinning globe.
        const onGlobe = cube.globeDirection.clone().multiplyScalar(this.globeRadius)
          .applyAxisAngle(Y_AXIS, globeSpin);
        const popIn = easeOutBack(clamp01(seconds / SWARM_TIMING.globeFormSeconds - cube.delay * 0.3));

        // 2. Fly from the globe to its letter, arcing towards the viewer on the way.
        const flight = clamp01((seconds - SWARM_TIMING.assembleStartsAt - cube.delay) / SWARM_TIMING.flightSeconds);
        const landed = easeOutBack(flight, 1.2);
        position.lerpVectors(onGlobe, cube.target, landed);
        position.z += Math.sin(Math.PI * flight) * this.globeRadius * 0.6;

        // 3. Once the name is formed, a gentle wave runs through it.
        position.z += Math.sin(seconds * 5 - cube.target.x * 0.15) * 0.35 * holdRipple;

        // 4. Warp out: rush towards (and past) the camera.
        position.addScaledVector(cube.exitDrift, warp * this.camera.position.z * 1.4 * cube.exitSpeed);

        const tumble = (1 - landed) * cube.spinTurns * Math.PI * 2 + warp * cube.spinTurns * 3;
        rotation.setFromAxisAngle(cube.spinAxis, tumble);
        scale.setScalar(popIn * (1 + warp * 0.8));

        matrix.compose(position, rotation, scale);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }

    // Globe dust: spins, dims once the name forms, then bursts outward on exit.
    const assembled = clamp01((seconds - SWARM_TIMING.assembleStartsAt) / 1.2);
    this.dust.rotation.y = globeSpin;
    this.dust.scale.setScalar(this.globeRadius * 1.12 * (1 + warp * 4));
    this.dustMaterial.opacity = (1 - assembled * 0.6) * (1 - exitProgress);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const item of this.disposables) item.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss(); // hand the WebGL slot back to the browser
  }
}

// ───────────── helpers ─────────────

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

/** Overshoots a little, then settles: gives each cube a satisfying "snap". */
function easeOutBack(t, overshoot = 1.7) {
  if (t <= 0) return 0;
  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
}

/** Evenly spread unit vectors over a sphere. */
function fibonacciSphere(count) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    return new THREE.Vector3(Math.cos(goldenAngle * i) * ring, y, Math.sin(goldenAngle * i) * ring);
  });
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

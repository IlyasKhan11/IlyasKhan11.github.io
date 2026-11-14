import * as THREE from 'three';
import { VoxelGrid } from '../voxel-grid.js';
import { offsetPart, rotatePartAroundHinge } from '../voxel-builder.js';

/**
 * One small model per project card, each hinting at what the project does.
 * Same shape as the hero models: { id, caption, homeTilt, build() }.
 */

const Z_AXIS = new THREE.Vector3(0, 0, 1);

// ───────────── Football Free-Kick Analyzer: ball + tracked trajectory ─────────────
const football = {
  id: 'football',
  caption: 'kick detected · trajectory traced',
  homeTilt: [0.2, -0.4],
  build() {
    // The dark patches sit where an icosahedron's 12 corners point,
    // which is exactly how a real football's pentagons are laid out.
    const golden = (1 + Math.sqrt(5)) / 2;
    const patchCentres = [
      [0, 1, golden], [0, 1, -golden], [0, -1, golden], [0, -1, -golden],
      [1, golden, 0], [1, -golden, 0], [-1, golden, 0], [-1, -golden, 0],
      [golden, 0, 1], [golden, 0, -1], [-golden, 0, 1], [-golden, 0, -1],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());

    const ball = new VoxelGrid().fillSphere(5.4, (direction) => {
      const pointing = new THREE.Vector3(direction.x, direction.y, direction.z);
      const onPatch = patchCentres.some((centre) => centre.dot(pointing) > 0.93);
      return onPatch ? 'l' : 'w';
    });

    // Dotted flight path behind the ball, like the analyzer's annotation.
    const trail = [[-7, -1, 0], [-9, -3, 0], [-11, -6, 0]].map(([x, y, z]) => new VoxelGrid().set(x, y, z, 'g'));

    return {
      parts: { ball, trail0: trail[0], trail1: trail[1], trail2: trail[2] },
      animate(parts, seconds) {
        parts.ball.rotation.z = -seconds * 1.6;  // spinning like a curled free kick
        // Trail dots light up one after another, then all switch off.
        const step = Math.floor(seconds * 3) % 5;
        parts.trail0.visible = step >= 1;
        parts.trail1.visible = step >= 2;
        parts.trail2.visible = step >= 3;
      },
    };
  },
};

// ───────────── AlphaStream Omni: earnings-call audio → signal ─────────────
const microphone = {
  id: 'microphone',
  caption: 'audio → transcript → signal',
  homeTilt: [0.15, -0.45],
  build() {
    const mic = new VoxelGrid()
      .fillDisc(0, 0, 0, 3.2, 'l')                    // stand base
      .fillBox([0, 0], [1, 4], [0, 0], 'm')           // stand pole
      .fillBox([-1, 1], [5, 7], [-1, 1], 'm')         // handle
      .fillBox([-2, 2], [8, 8], [-2, 2], 'd')         // collar ring
      .fillSoftBox([-3, 3], [9, 15], [-3, 3], 'w');   // head
    // Grille stripes on the mic head.
    for (const voxel of [...mic]) {
      if (voxel.y >= 10 && voxel.y <= 14 && voxel.y % 2 === 0 && voxel.color === 'w') voxel.color = 'm';
    }

    // Four equaliser bars to the right; they bounce like a live audio meter.
    const barHeight = 8;
    const bars = [6, 8, 10, 12].map((x, index) =>
      new VoxelGrid().fillBox([x, x], [0, barHeight - 1], [0, 0], index % 2 ? 'd' : 'g'));

    return {
      parts: { mic, bar0: bars[0], bar1: bars[1], bar2: bars[2], bar3: bars[3] },
      animate(parts, seconds) {
        [parts.bar0, parts.bar1, parts.bar2, parts.bar3].forEach((bar, index) => {
          const level = 0.3 + 0.7 * Math.abs(Math.sin(seconds * (2.1 + index * 0.7) + index));
          bar.scale.y = level;
          // Keep the bar standing on the floor while it shrinks.
          offsetPart(bar, 0, -(1 - level) * (barHeight / 2));
        });
      },
    };
  },
};

// ───────────── Exoplanet Prediction: ringed planet + orbiting moons ─────────────
const planet = {
  id: 'planet',
  caption: '92.79% · kepler candidates',
  homeTilt: [0.35, -0.3],
  build() {
    const body = new VoxelGrid().fillSphere(4.6, ({ y }) => {
      // Horizontal cloud bands.
      if (Math.abs(y - 0.35) < 0.12 || Math.abs(y + 0.4) < 0.12) return 'g';
      return y > 0 ? 'd' : 'm';
    });
    const ring = new VoxelGrid().fillRing(0, 6.2, 8, 'w');
    // Two moons on opposite sides keep the model balanced around the planet.
    const moons = new VoxelGrid()
      .fillBox([10, 11], [1, 2], [0, 1], 'w')
      .fillBox([-11, -10], [1, 2], [0, 1], 'm');

    return {
      parts: { body, ring, moons },
      animate(parts, seconds) {
        parts.body.rotation.y = seconds * 0.6;
        parts.ring.rotation.set(0.32, 0, 0.18);
        parts.moons.rotation.set(0.25, seconds * 0.9, 0);
      },
    };
  },
};

// ───────────── Document OCR: ID card being scanned ─────────────
const idCard = {
  id: 'id-card',
  caption: 'opencv → tesseract → json',
  homeTilt: [0.15, -0.35],
  build() {
    const card = new VoxelGrid()
      .fillBox([-7, 7], [0, 9], [0, 0], 'w')
      .fillBox([-7, 7], [9, 9], [0, 0], 'd')          // header band
      .remove(-7, 0, 0).remove(7, 0, 0).remove(-7, 9, 0).remove(7, 9, 0)  // rounded corners
      // photo with a little head-and-shoulders silhouette
      .fillBox([-6, -3], [2, 7], [1, 1], 'm')
      .fillBox([-5, -4], [5, 6], [1, 1], 'l')
      .fillBox([-6, -3], [2, 3], [1, 1], 'l')
      // text lines
      .fillBox([-1, 5], [7, 7], [1, 1], 'l')
      .fillBox([-1, 4], [5, 5], [1, 1], 'l')
      .fillBox([-1, 3], [3, 3], [1, 1], 'd');

    const scanLine = new VoxelGrid().fillBox([-8, 8], [4, 4], [2, 2], 'g');

    return {
      parts: { card, scanLine },
      animate(parts, seconds) {
        // Sweep up and down across the card, like a scanner.
        offsetPart(parts.scanLine, 0, Math.sin(seconds * 1.8) * 4.8);
      },
    };
  },
};

// ───────────── Creator Studio: clapperboard ─────────────
const clapperboard = {
  id: 'clapperboard',
  caption: 'take 1 · content studio',
  homeTilt: [0.2, -0.45],
  build() {
    const stripe = (x) => (Math.floor((x + 7) / 2) % 2 ? 'w' : 'l');

    const board = new VoxelGrid()
      .fillBox([-6, 6], [0, 7], [0, 1], 'l')
      .fillBox([-4, 3], [5, 5], [2, 2], 'w')   // "title" line
      .fillBox([-4, 0], [3, 3], [2, 2], 'm')
      .fillBox([2, 4], [1, 2], [2, 2], 'g');   // little "REC" light block
    for (let x = -6; x <= 6; x++) board.fillBox([x, x], [8, 8], [0, 1], stripe(x));

    const clapper = new VoxelGrid();
    for (let x = -6; x <= 6; x++) clapper.fillBox([x, x], [9, 9], [0, 1], stripe(x + 1));

    return {
      parts: { board, clapper },
      animate(parts, seconds) {
        // Snap open, then clap shut, once every two seconds.
        const phase = seconds % 2;
        const openAmount = phase < 1.4 ? Math.min(phase / 0.3, 1) : Math.max(1 - (phase - 1.4) / 0.08, 0);
        rotatePartAroundHinge(parts.clapper, [-6.5, 9.5, 0.5], Z_AXIS, openAmount * 0.5);
      },
    };
  },
};

export const PROJECT_MODELS = { football, microphone, planet, 'id-card': idCard, clapperboard };

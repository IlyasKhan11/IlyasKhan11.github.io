import { VoxelGrid } from '../voxel-grid.js';
import { offsetPart } from '../voxel-builder.js';

/**
 * The 3D models in the hero gallery (switchable with tabs).
 *
 * Each model ties back to the brand: chess (think in moves), AI engineering,
 * the terminal look, gaming, and logic/maths.
 *
 * Fields:
 *   id          used for the tab and the "~/models/<file>" label
 *   caption     one short line shown under the model
 *   homeTilt    starting rotation [x, y] in radians, so the model faces you nicely
 *   build()     returns { parts: { name: VoxelGrid }, animate?(parts, seconds) }
 *
 * Colour keys: w white · m grey · l dark · k screen black · d deep green · g phosphor
 */

// ───────────────────────────── chess knight ─────────────────────────────
const knight = {
  id: 'knight',
  file: 'knight.vox',
  caption: 'think in moves',
  homeTilt: [0.2, -0.6],
  build() {
    // Side profile, facing left. Bottom row sits on the base.
    const profile = [
      '....w.w...',
      '...wwwww..',
      '..wwwwwwd.',
      '.wwgwwwwdd',
      'wwwwwwwwdd',
      'wwwwwwwwdd',
      'ww..wwwwdd',
      '....wwwwdd',
      '...wwwwwdd',
      '..wwwwwwdd',
      '..wwwwwwwd',
      '.wwwwwwwwww',
    ];
    const piece = new VoxelGrid()
      .extrudeFrontView(profile, { bottomY: 3, zRange: [-2, 1], surfaceOnly: { g: 'w' } })
      .fillDisc(5.5, -0.5, 0, 5.2, 'w')
      .fillDisc(5.5, -0.5, 1, 4.7, 'g')
      .fillDisc(5.5, -0.5, 2, 4.2, 'w');
    return { parts: { piece } };
  },
};

// ───────────────────────────── little robot ─────────────────────────────
const robot = {
  id: 'robot',
  file: 'agent.vox',
  caption: 'an agent that knows when to stop',
  homeTilt: [0.15, -0.45],
  build() {
    const body = new VoxelGrid()
      // feet
      .fillBox([-3, -1], [0, 0], [-1, 1], 'd')
      .fillBox([1, 3], [0, 0], [-1, 1], 'd')
      // torso with a dark chest panel and a glowing "heart"
      .fillSoftBox([-3, 3], [1, 5], [-2, 2], 'w')
      .fillBox([-1, 1], [2, 4], [2, 2], 'l')
      .set(0, 3, 2, 'g')
      // stubby arms
      .fillBox([-4, -4], [2, 4], [-1, 0], 'm')
      .fillBox([4, 4], [2, 4], [-1, 0], 'm')
      // neck
      .fillBox([-1, 1], [6, 6], [-1, 1], 'm')
      // big round head with a screen face
      .fillSoftBox([-5, 5], [7, 14], [-4, 3], 'w')
      .fillBox([-4, 4], [8, 13], [3, 3], 'k')
      // smile
      .set(-2, 9, 3, 'd').set(-1, 8, 3, 'd').set(0, 8, 3, 'd').set(1, 8, 3, 'd').set(2, 9, 3, 'd')
      // ears
      .fillBox([-6, -6], [9, 12], [-2, 1], 'd')
      .fillBox([6, 6], [9, 12], [-2, 1], 'd')
      // antenna stalk
      .fillBox([0, 0], [15, 16], [0, 0], 'm');

    // Eyes sit one step in front of the screen so they can blink.
    const eyes = new VoxelGrid()
      .fillBox([-3, -2], [10, 11], [4, 4], 'g')
      .fillBox([2, 3], [10, 11], [4, 4], 'g');

    const bulb = new VoxelGrid().set(0, 17, 0, 'g');

    return {
      parts: { body, eyes, bulb },
      animate(parts, seconds) {
        // Quick blink every ~3.5 s.
        const isBlinking = seconds % 3.5 < 0.14;
        parts.eyes.scale.y = isBlinking ? 0.15 : 1;
        // Antenna bulb gently pulses.
        parts.bulb.scale.setScalar(1 + Math.sin(seconds * 4) * 0.18);
      },
    };
  },
};

// ───────────────────────────── retro terminal ─────────────────────────────
const terminal = {
  id: 'terminal',
  file: 'terminal.vox',
  caption: '~ $ ship it',
  homeTilt: [0.25, -0.5],
  build() {
    // Screen pixels, top row first. Columns map to x = -3 … 3.
    // g = prompt, d = text, C = where the blinking cursor goes.
    const screenRows = [
      'g.dddd.',
      '.......',
      'g.ddd..',
      '.......',
      'g.C....',
      '.......',
    ];
    const cursorPosition = { x: 0, y: 0 };

    const body = new VoxelGrid()
      .fillBox([-4, 4], [0, 0], [-4, 2], 'm')          // stand
      .fillSoftBox([-5, 5], [1, 12], [-5, 3], 'w')     // case
      .fillBox([-4, 4], [4, 11], [3, 3], 'm')          // bezel
      .fillBox([-3, 3], [5, 10], [3, 3], 'k')          // screen
      .fillBox([1, 3], [2, 2], [3, 3], 'l')            // floppy slot
      .set(-3, 2, 3, 'g')                              // power light
      // keyboard + keys + space bar
      .fillBox([-5, 5], [0, 0], [5, 8], 'm')
      .fillBox([-4, 4], [1, 1], [5, 6], 'w')
      .fillBox([-2, 2], [1, 1], [7, 7], 'w')
      // mouse
      .fillBox([7, 7], [0, 0], [6, 7], 'w');

    screenRows.forEach((row, rowIndex) => {
      const y = 10 - rowIndex;
      [...row].forEach((char, column) => {
        const x = column - 3;
        if (char === 'C') {
          // Leave a dark recess behind the cursor so it looks "off" when hidden.
          body.remove(x, y, 3).set(x, y, 2, 'k');
          cursorPosition.x = x;
          cursorPosition.y = y;
        } else if (char !== '.') {
          body.set(x, y, 3, char);
        }
      });
    });

    const cursor = new VoxelGrid().set(cursorPosition.x, cursorPosition.y, 3, 'g');

    return {
      parts: { body, cursor },
      animate(parts, seconds) {
        parts.cursor.visible = seconds % 1.1 < 0.55;
      },
    };
  },
};

// ───────────────────────────── game controller ─────────────────────────────
const gamepad = {
  id: 'gamepad',
  file: 'gamepad.vox',
  caption: 'player one, ready',
  homeTilt: [0.75, -0.3],
  build() {
    // Seen from above. rows[0] is the back edge.
    const outline = [
      '...wwwwwwwwwwwww...',
      '.wwwwwwwwwwwwwwwww.',
      'wwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwww',
      'wwwwww.......wwwwww',
      '.wwww.........wwww.',
      '..ww...........ww..',
    ];
    // (column, row) helpers so the details line up with the outline above.
    const top = 3;
    const body = new VoxelGrid()
      .extrudeTopView(outline, { yRange: [0, 2] })
      // d-pad
      .set(4, top, 2, 'l').set(3, top, 3, 'l').set(4, top, 3, 'l').set(5, top, 3, 'l').set(4, top, 4, 'l')
      // select / start, centre badge
      .set(8, top, 3, 'm').set(10, top, 3, 'm').set(9, top, 1, 'd')
      // shoulder buttons
      .fillBox([3, 5], [top, top], [0, 0], 'm')
      .fillBox([13, 15], [top, top], [0, 0], 'm');

    const buttons = new VoxelGrid()
      .set(14, top, 2, 'g').set(13, top, 3, 'g').set(15, top, 3, 'g').set(14, top, 4, 'g');

    const leftStick = new VoxelGrid().set(6, top, 5, 'm').set(6, top + 1, 5, 'd');
    const rightStick = new VoxelGrid().set(12, top, 5, 'm').set(12, top + 1, 5, 'd');

    return {
      parts: { body, buttons, leftStick, rightStick },
      animate(parts, seconds) {
        // Buttons "press" with a little dip.
        offsetPart(parts.buttons, 0, -Math.max(0, Math.sin(seconds * 5)) * 0.35);
        // Thumbsticks wobble as if someone is playing.
        parts.leftStick.rotation.set(Math.cos(seconds * 1.7) * 0.25, 0, Math.sin(seconds * 2.2) * 0.25);
        parts.rightStick.rotation.set(Math.sin(seconds * 1.9) * 0.25, 0, Math.cos(seconds * 2.5) * 0.25);
      },
    };
  },
};

// ───────────────────────────── puzzle cube ─────────────────────────────
const cube = {
  id: 'cube',
  file: 'puzzle.vox',
  caption: 'logic, one twist at a time',
  homeTilt: [0.55, -0.75],
  voxelSize: 0.9,
  build() {
    // Face centres glow, corners are white, edges are deep green.
    const colorFor = (x, y, z) => {
      const offCenter = (x !== 0) + (y !== 0) + (z !== 0);
      if (offCenter === 1) return 'g';
      if (offCenter === 3) return 'w';
      return 'd';
    };
    const lowerLayers = new VoxelGrid();
    const topLayer = new VoxelGrid();
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const layer = y === 1 ? topLayer : lowerLayers;
          layer.set(x, y, z, colorFor(x, y, z));
        }
      }
    }

    const TWIST_EVERY = 2.6; // seconds between twists
    const TWIST_TIME = 0.7;  // seconds a twist takes

    return {
      parts: { lowerLayers, topLayer },
      animate(parts, seconds) {
        const twistsDone = Math.floor(seconds / TWIST_EVERY);
        const timeIntoTwist = seconds % TWIST_EVERY;
        const progress = Math.min(timeIntoTwist / TWIST_TIME, 1);
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        parts.topLayer.rotation.y = (twistsDone + eased) * (Math.PI / 2);
      },
    };
  },
};

export const HERO_MODELS = { knight, robot, terminal, gamepad, cube };

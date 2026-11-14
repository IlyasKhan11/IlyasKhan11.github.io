import * as THREE from 'three';
import { VoxelGrid } from '../voxel-grid.js';
import { offsetPart, rotatePartAroundHinge } from '../voxel-builder.js';

/**
 * One model per page section, sitting next to the section title.
 * Same shape as the hero models: { id, caption, homeTilt, build() }.
 */

const Z_AXIS = new THREE.Vector3(0, 0, 1);

// ───────────── Career: camera with a detection box (computer vision work) ─────────────
const camera = {
  id: 'camera',
  caption: 'detect · track · segment · pose',
  homeTilt: [0.15, -0.55],
  build() {
    const body = new VoxelGrid()
      .fillSoftBox([-6, 6], [0, 7], [-3, 2], 'w')
      .fillBox([-5, -2], [8, 9], [-2, 1], 'm')          // viewfinder hump
      .fillBox([3, 4], [8, 8], [-1, 0], 'd')            // shutter button
      // lens: three rings stepping forward
      .fillDiscFacingFront(0, 3.5, 3, 3.4, 'm')
      .fillDiscFacingFront(0, 3.5, 4, 2.8, 'l')
      .fillDiscFacingFront(0, 3.5, 5, 2.0, 'k')
      .set(1, 5, 5, 'g');                                // glint on the glass

    const recordLight = new VoxelGrid().set(-5, 6, 3, 'g');

    // Corner brackets of a bounding box, like a detector's output.
    const detectionBox = new VoxelGrid();
    for (const [x, y, dx, dy] of [[-6, 10, 1, -1], [6, 10, -1, -1], [-6, -3, 1, 1], [6, -3, -1, 1]]) {
      detectionBox.set(x, y, 8, 'g').set(x + dx, y, 8, 'g').set(x, y + dy, 8, 'g');
    }

    return {
      parts: { body, recordLight, detectionBox },
      animate(parts, seconds) {
        parts.recordLight.visible = seconds % 1.2 < 0.7;
        // The box "locks on": eases tighter, then lets go.
        parts.detectionBox.scale.setScalar(1 + Math.abs(Math.sin(seconds * 1.4)) * 0.12);
      },
    };
  },
};

// ───────────── Stack: a chip with a glowing core ─────────────
const chip = {
  id: 'chip',
  caption: 'python · pytorch · fastapi · aws',
  homeTilt: [0.75, -0.6],
  build() {
    const body = new VoxelGrid()
      .fillBox([-5, 5], [0, 1], [-5, 5], 'l')
      .fillBox([-3, 3], [2, 2], [-3, 3], 'm')
      .set(-4, 2, -4, 'w');                              // "pin 1" marker
    for (const offset of [-4, -2, 0, 2, 4]) {
      body.fillBox([offset, offset], [0, 0], [6, 7], 'm')
        .fillBox([offset, offset], [0, 0], [-7, -6], 'm')
        .fillBox([6, 7], [0, 0], [offset, offset], 'm')
        .fillBox([-7, -6], [0, 0], [offset, offset], 'm');
    }
    const core = new VoxelGrid().fillBox([-1, 1], [3, 3], [-1, 1], 'g');

    return {
      parts: { body, core },
      animate(parts, seconds) {
        const pulse = 1 + Math.sin(seconds * 3) * 0.12;
        parts.core.scale.set(pulse, 1, pulse);
      },
    };
  },
};

// ───────────── Principles: a knight hopping round in L-moves ─────────────
const chessboard = {
  id: 'chessboard',
  caption: 'see the next ten moves',
  homeTilt: [0.6, -0.6],
  build() {
    const SQUARE = 2; // each board square is 2×2 voxels
    const board = new VoxelGrid().fillBox([-1, 10], [-1, -1], [-1, 10], 'l');
    for (let column = 0; column < 5; column++) {
      for (let row = 0; row < 5; row++) {
        const x = column * SQUARE;
        const z = row * SQUARE;
        board.fillBox([x, x + 1], [0, 0], [z, z + 1], (column + row) % 2 ? 'd' : 'w');
      }
    }

    // A small king to "think about".
    const king = new VoxelGrid().extrudeFrontView(
      ['.m.', 'mmm', '.m.', '.m.', 'mmm', 'mmm'],
      { leftX: 6, bottomY: 1, zRange: [6, 7] },
    );

    // The green knight starts on square (1, 1).
    const knight = new VoxelGrid().extrudeFrontView(
      ['.gg', 'ggg', '..g', '.gg', 'ggg'],
      { leftX: 2, bottomY: 1, zRange: [2, 3] },
    );

    // Four L-moves that bring the knight back to where it started.
    const moves = [[1, 2], [2, -1], [-1, -2], [-2, 1]];
    const MOVE_SECONDS = 1.3;
    const HOP_SECONDS = 0.5;

    return {
      parts: { board, king, knight },
      animate(parts, seconds) {
        const moveIndex = Math.floor(seconds / MOVE_SECONDS) % moves.length;
        const hop = Math.min((seconds % MOVE_SECONDS) / HOP_SECONDS, 1);
        const eased = hop * hop * (3 - 2 * hop);

        // Square the knight stood on before this move.
        let fromColumn = 0;
        let fromRow = 0;
        for (let i = 0; i < moveIndex; i++) {
          fromColumn += moves[i][0];
          fromRow += moves[i][1];
        }
        const [stepColumn, stepRow] = moves[moveIndex];
        offsetPart(
          parts.knight,
          (fromColumn + stepColumn * eased) * SQUARE,
          Math.sin(Math.PI * hop) * 3,
          (fromRow + stepRow * eased) * SQUARE,
        );
      },
    };
  },
};

// ───────────── About: graduation cap with a swinging tassel ─────────────
const graduationCap = {
  id: 'graduation-cap',
  caption: 'b.s. computer science · 2027',
  homeTilt: [0.4, 0.6],
  build() {
    const cap = new VoxelGrid()
      .fillSoftBox([-4, 4], [0, 3], [-4, 4], 'l')
      .fillBox([-7, 7], [4, 4], [-7, 7], 'd')
      .set(0, 5, 0, 'g');                                // button on top
    for (let i = 1; i <= 6; i++) cap.set(i, 5, i, 'm');  // cord to the corner

    const tassel = new VoxelGrid()
      .fillBox([7, 7], [0, 3], [7, 7], 'm')
      .fillBox([7, 7], [-2, -1], [7, 7], 'g');

    return {
      parts: { cap, tassel },
      animate(parts, seconds) {
        rotatePartAroundHinge(parts.tassel, [7, 3.5, 7], Z_AXIS, Math.sin(seconds * 2.2) * 0.35);
      },
    };
  },
};

// ───────────── Writing: open book with a page turning ─────────────
const book = {
  id: 'book',
  caption: 'notes on medium',
  homeTilt: [0.7, -0.25],
  build() {
    const open = new VoxelGrid()
      .fillBox([-8, 8], [0, 0], [-5, 5], 'd')            // cover
      .fillBox([-7, -1], [1, 1], [-4, 4], 'w')           // left pages
      .fillBox([1, 7], [1, 1], [-4, 4], 'w');            // right pages
    for (const z of [-3, -1, 1, 3]) {                   // lines of "text"
      open.fillBox([-6, -2], [1, 1], [z, z], 'm').fillBox([2, 6], [1, 1], [z, z], 'm');
    }
    const page = new VoxelGrid().fillBox([1, 7], [2, 2], [-4, 4], 'w');
    const bookmark = new VoxelGrid().fillBox([-3, -3], [1, 1], [5, 7], 'g');

    const CYCLE = 3;
    const FLIP_SECONDS = 1.1;

    return {
      parts: { open, page, bookmark },
      animate(parts, seconds) {
        const flip = Math.min((seconds % CYCLE) / FLIP_SECONDS, 1);
        const eased = flip * flip * (3 - 2 * flip);
        rotatePartAroundHinge(parts.page, [0.5, 1.5, 0], Z_AXIS, eased * Math.PI * 0.97);
        // Once it lands on the left it would overlap the pages there, so hide it until the next turn.
        parts.page.visible = flip < 1;
      },
    };
  },
};

// ───────────── Contact: envelope with a letter popping out ─────────────
const envelope = {
  id: 'envelope',
  caption: 'inbox open',
  homeTilt: [0.15, -0.5],
  build() {
    const pocket = new VoxelGrid()
      .fillBox([-7, 7], [0, 8], [-1, -1], 'd')           // back
      .fillBox([-7, 7], [0, 8], [1, 1], 'd')             // front
      .fillBox([-7, -7], [0, 8], [0, 0], 'd')            // sides
      .fillBox([7, 7], [0, 8], [0, 0], 'd')
      .fillBox([-7, 7], [0, 0], [0, 0], 'd')             // bottom
      .set(0, 4, 2, 'g');                                // seal
    // The flap's "V" drawn on the front.
    for (let x = -7; x <= 7; x++) {
      pocket.set(x, 8 - Math.round(((7 - Math.abs(x)) * 4) / 7), 1, 'm');
    }

    const letter = new VoxelGrid()
      .fillBox([-5, 5], [2, 10], [0, 0], 'w')
      .fillBox([-4, 3], [9, 9], [0, 0], 'm')
      .fillBox([-4, 1], [7, 7], [0, 0], 'm');

    return {
      parts: { pocket, letter },
      animate(parts, seconds) {
        offsetPart(parts.letter, 0, (Math.sin(seconds * 1.5) * 0.5 + 0.5) * 3.5);
      },
    };
  },
};

export const SECTION_MODELS = {
  camera,
  chip,
  chessboard,
  'graduation-cap': graduationCap,
  book,
  envelope,
};

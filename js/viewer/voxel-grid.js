/**
 * A tiny "3D pixel art" canvas.
 *
 * A model is a set of voxels (cubes on an integer grid). Each voxel has a
 * one-letter colour key from PALETTE. The helpers below let a model be
 * described in a few lines (boxes, discs, pixel-art rows) instead of
 * listing every cube by hand.
 *
 * Axes: x = right, y = up, z = towards the viewer.
 */

// Brand colours only (see personal-brand-kit/brand-guide.md).
export const PALETTE = {
  w: '#DEE7E2', // signal: main "white" body colour
  m: '#7C8A82', // dim: mid grey details
  l: '#252E29', // line: dark details
  k: '#0E1612', // shell: screens, near-black
  d: '#33724C', // deep phosphor: secondary green
  g: '#7FE4A5', // phosphor: the one bright accent, glows
};

export class VoxelGrid {
  constructor() {
    this.cells = new Map();
  }

  static keyOf(x, y, z) {
    return `${x},${y},${z}`;
  }

  get size() {
    return this.cells.size;
  }

  [Symbol.iterator]() {
    return this.cells.values();
  }

  set(x, y, z, color) {
    this.cells.set(VoxelGrid.keyOf(x, y, z), { x, y, z, color });
    return this;
  }

  remove(x, y, z) {
    this.cells.delete(VoxelGrid.keyOf(x, y, z));
    return this;
  }

  has(x, y, z) {
    return this.cells.has(VoxelGrid.keyOf(x, y, z));
  }

  /** Fill every cell in an inclusive box. Ranges are [from, to]. */
  fillBox([x0, x1], [y0, y1], [z0, z1], color) {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) this.set(x, y, z, color);
      }
    }
    return this;
  }

  /**
   * Like fillBox, but leaves out cells that sit on two or more outer faces
   * at once (the edges). That gives a softer, "cuter" chunky shape.
   */
  fillSoftBox([x0, x1], [y0, y1], [z0, z1], color) {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          const outerFaces = (x === x0 || x === x1) + (y === y0 || y === y1) + (z === z0 || z === z1);
          if (outerFaces < 2) this.set(x, y, z, color);
        }
      }
    }
    return this;
  }

  /** A flat horizontal disc, one voxel tall. */
  fillDisc(centerX, centerZ, y, radius, color) {
    const reach = Math.ceil(radius);
    for (let x = Math.floor(centerX - reach); x <= Math.ceil(centerX + reach); x++) {
      for (let z = Math.floor(centerZ - reach); z <= Math.ceil(centerZ + reach); z++) {
        if ((x - centerX) ** 2 + (z - centerZ) ** 2 <= radius ** 2) this.set(x, y, z, color);
      }
    }
    return this;
  }

  /** A flat disc standing upright, facing the viewer (like a camera lens). */
  fillDiscFacingFront(centerX, centerY, z, radius, color) {
    const reach = Math.ceil(radius);
    for (let x = Math.floor(centerX - reach); x <= Math.ceil(centerX + reach); x++) {
      for (let y = Math.floor(centerY - reach); y <= Math.ceil(centerY + reach); y++) {
        if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) this.set(x, y, z, color);
      }
    }
    return this;
  }

  /**
   * A solid ball. colorAt(direction) picks each voxel's colour from its
   * unit direction away from the centre, so you can paint patterns on it.
   */
  fillSphere(radius, colorAt) {
    const reach = Math.ceil(radius);
    for (let x = -reach; x <= reach; x++) {
      for (let y = -reach; y <= reach; y++) {
        for (let z = -reach; z <= reach; z++) {
          const distance = Math.hypot(x, y, z);
          if (distance > radius) continue;
          const direction = distance === 0 ? { x: 0, y: 1, z: 0 } : { x: x / distance, y: y / distance, z: z / distance };
          this.set(x, y, z, colorAt(direction));
        }
      }
    }
    return this;
  }

  /** A flat ring lying on the floor (like Saturn's rings). */
  fillRing(y, innerRadius, outerRadius, color) {
    const reach = Math.ceil(outerRadius);
    for (let x = -reach; x <= reach; x++) {
      for (let z = -reach; z <= reach; z++) {
        const distance = Math.hypot(x, z);
        if (distance >= innerRadius && distance <= outerRadius) this.set(x, y, z, color);
      }
    }
    return this;
  }

  /**
   * Draw pixel art seen from the FRONT and push it back into depth.
   * rows[0] is the top row. '.' or ' ' means empty.
   *
   * surfaceOnly: colours that should only appear on the front and back
   * layers (e.g. an eye), with a replacement colour for the inside.
   */
  extrudeFrontView(rows, { leftX = 0, bottomY = 0, zRange: [z0, z1], surfaceOnly = {} }) {
    rows.forEach((row, rowIndex) => {
      const y = bottomY + (rows.length - 1 - rowIndex);
      [...row].forEach((char, column) => {
        if (char === '.' || char === ' ') return;
        for (let z = z0; z <= z1; z++) {
          const isSurface = z === z0 || z === z1;
          const color = !isSurface && surfaceOnly[char] ? surfaceOnly[char] : char;
          this.set(leftX + column, y, z, color);
        }
      });
    });
    return this;
  }

  /**
   * Draw pixel art seen from ABOVE and push it up into height.
   * rows[0] is the back row (furthest from the viewer).
   */
  extrudeTopView(rows, { leftX = 0, backZ = 0, yRange: [y0, y1] }) {
    rows.forEach((row, rowIndex) => {
      const z = backZ + rowIndex;
      [...row].forEach((char, column) => {
        if (char === '.' || char === ' ') return;
        for (let y = y0; y <= y1; y++) this.set(leftX + column, y, z, char);
      });
    });
    return this;
  }
}

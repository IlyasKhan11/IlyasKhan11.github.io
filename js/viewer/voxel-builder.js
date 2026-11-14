import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PALETTE, VoxelGrid } from './voxel-grid.js';

/** Every model is scaled so it fits inside a sphere of this radius. */
export const MODEL_RADIUS = 1;

const DEFAULT_VOXEL_SIZE = 0.94; // < 1 leaves a thin gap, so the blocks read as "pixels"

// One material per palette colour, shared by every model.
const materialCache = new Map();

function materialFor(colorKey) {
  if (materialCache.has(colorKey)) return materialCache.get(colorKey);

  const hex = PALETTE[colorKey];
  const isGlowing = colorKey === 'g';
  const material = new THREE.MeshStandardMaterial({
    color: hex,
    roughness: colorKey === 'k' ? 0.35 : 0.6,
    metalness: 0,
    emissive: isGlowing ? hex : '#000000',
    emissiveIntensity: isGlowing ? 0.55 : 0,
  });
  materialCache.set(colorKey, material);
  return material;
}

/**
 * Turn a model definition into a ready-to-render THREE.Group.
 *
 * definition.build() returns { parts: { name: VoxelGrid }, animate? }.
 * Each part becomes its own group, pivoting around its own centre, so
 * animations can blink, spin or bob a part without touching the rest.
 */
export function buildVoxelModel(definition) {
  const { parts, animate } = definition.build();
  const voxelSize = definition.voxelSize ?? DEFAULT_VOXEL_SIZE;
  const geometry = new RoundedBoxGeometry(voxelSize, voxelSize, voxelSize, 2, voxelSize * 0.16);

  const allVoxels = Object.values(parts).flatMap((grid) => [...grid]);
  const modelCenter = centerOf(allVoxels);
  const scale = MODEL_RADIUS / boundingRadius(allVoxels, modelCenter);

  const root = new THREE.Group();
  root.scale.setScalar(scale);

  const partGroups = {};
  for (const [partName, grid] of Object.entries(parts)) {
    const partGroup = buildPart(grid, geometry, modelCenter);
    partGroup.name = partName;
    partGroups[partName] = partGroup;
    root.add(partGroup);
  }

  return {
    root,
    animate: (elapsedSeconds) => animate?.(partGroups, elapsedSeconds),
    dispose: () => geometry.dispose(),
  };
}

function buildPart(grid, geometry, modelCenter) {
  const partCenter = averageOf([...grid]);
  const group = new THREE.Group();
  group.position.copy(partCenter).sub(modelCenter);
  // Remembered so animations can move a part relative to where it started.
  group.userData.centroid = partCenter.clone();
  group.userData.restingPosition = group.position.clone();

  // Group visible voxels by colour: one InstancedMesh per colour is far
  // cheaper than one mesh per cube.
  const voxelsByColor = new Map();
  for (const voxel of grid) {
    if (isBuried(grid, voxel)) continue;
    if (!voxelsByColor.has(voxel.color)) voxelsByColor.set(voxel.color, []);
    voxelsByColor.get(voxel.color).push(voxel);
  }

  const matrix = new THREE.Matrix4();
  for (const [colorKey, voxels] of voxelsByColor) {
    const mesh = new THREE.InstancedMesh(geometry, materialFor(colorKey), voxels.length);
    voxels.forEach((voxel, index) => {
      matrix.makeTranslation(voxel.x - partCenter.x, voxel.y - partCenter.y, voxel.z - partCenter.z);
      mesh.setMatrixAt(index, matrix);
    });
    group.add(mesh);
  }
  return group;
}

/** A voxel boxed in on all six sides can never be seen, so we skip drawing it. */
function isBuried(grid, { x, y, z }) {
  return grid.has(x + 1, y, z) && grid.has(x - 1, y, z)
      && grid.has(x, y + 1, z) && grid.has(x, y - 1, z)
      && grid.has(x, y, z + 1) && grid.has(x, y, z - 1);
}

function centerOf(voxels) {
  const box = new THREE.Box3();
  for (const { x, y, z } of voxels) box.expandByPoint(new THREE.Vector3(x, y, z));
  return box.getCenter(new THREE.Vector3());
}

function averageOf(voxels) {
  const sum = new THREE.Vector3();
  for (const { x, y, z } of voxels) sum.add(new THREE.Vector3(x, y, z));
  return sum.divideScalar(voxels.length);
}

/** Distance from the centre to the furthest cube corner. */
function boundingRadius(voxels, center) {
  const halfDiagonal = Math.sqrt(3) / 2;
  let furthest = 0;
  for (const { x, y, z } of voxels) {
    furthest = Math.max(furthest, center.distanceTo(new THREE.Vector3(x, y, z)) + halfDiagonal);
  }
  return furthest;
}

/**
 * Rotate a part around a hinge instead of around its own centre.
 * Used for things that swing: a clapperboard arm, a book page, a tassel.
 *
 * hingeVoxel: the hinge position in the model's voxel coordinates.
 */
export function rotatePartAroundHinge(part, hingeVoxel, axis, angle) {
  const { centroid, restingPosition } = part.userData;
  const hingeFromCentre = new THREE.Vector3(...hingeVoxel).sub(centroid);
  const rotatedHinge = hingeFromCentre.clone().applyAxisAngle(axis, angle);
  part.quaternion.setFromAxisAngle(axis, angle);
  // Shift the part so the hinge point stays exactly where it was.
  part.position.copy(restingPosition).add(hingeFromCentre).sub(rotatedHinge);
}

/** Move a part by an offset (in voxels) from where it was built. */
export function offsetPart(part, x = 0, y = 0, z = 0) {
  part.position.copy(part.userData.restingPosition).add(new THREE.Vector3(x, y, z));
}

export { VoxelGrid };

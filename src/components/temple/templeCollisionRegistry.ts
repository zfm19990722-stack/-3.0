import * as THREE from 'three';
import { evalValleyHeight } from './templeValleyBuilder';

/**
 * Static Walk Collision Registry & Continuous Ground Elevation Evaluator (Phase 2C.2C).
 * Aligned strictly with Phase 2C.2B Open Mountain Temple Layout (Scheme C):
 * - Forecourt paving (Y = 0.000m) + Central axial path (Y = +0.025m)
 * - Lower 6-step stairs (Z ∈ [-4.40, -1.60], 0.000/0.025 -> +0.900m)
 * - Widened Mid-Landing (Z ∈ [-6.00, -4.40], Y = +0.900m)
 * - Upper 6-step stairs (Z ∈ [-8.60, -6.00], +0.900 -> +1.800m)
 * - Main Terrace (Z ∈ [-11.80, -8.60], Y = +1.800m) & Main Hall Interior (Y = +1.830m)
 * - Relocated West & East Side Halls (±11.800, +0.360/+0.385, +2.400) & 2-step stairs
 * - Relocated South Gate (0, +0.240, +14.000), inner/outer 2-step stairs & Arrival Pad (+0.025m)
 */

export type WalkColliderCategory =
  | 'wall'
  | 'portal-frame'
  | 'column'
  | 'altar'
  | 'dais'
  | 'backdrop'
  | 'cushion'
  | 'lantern'
  | 'rail'
  | 'ledge-guard';

export interface WalkBoxCollider {
  id: string;
  category: WalkColliderCategory;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface WalkCylinderCollider {
  id: string;
  category: WalkColliderCategory;
  x: number;
  z: number;
  radius: number;
  minY: number;
  maxY: number;
}

export interface TempleCollisionRegistry {
  boxes: readonly WalkBoxCollider[];
  cylinders: readonly WalkCylinderCollider[];
  instancedColumnCount: number;
}

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Evaluates a discrete-tread stone flight over normalized progress u ∈ [0, 1]
 * with a short front chamfer on each riser so footsteps lock onto actual stone treads
 * while maintaining C¹ continuity across every step edge.
 */
function evalSteppedStairY(
  u: number,
  steps: number,
  baseY: number,
  topY: number,
  chamferFraction = 0.16
): number {
  const clampedU = THREE.MathUtils.clamp(u, 0, 1);
  if (clampedU <= 0) return baseY;
  if (clampedU >= 1) return topY;

  const f = clampedU * steps;
  const stepIdx = Math.min(steps - 1, Math.floor(f));
  const frac = f - stepIdx;
  const stepH = (topY - baseY) / steps;
  const riserBlend = smoothstep(0, chamferFraction, frac);
  return baseY + (stepIdx + riserBlend) * stepH;
}

/**
 * Evaluates continuous walkable surface height Y at world (x, z) matching every
 * Phase 2C.2B architectural terrace, stepped stair tread, threshold, forecourt slab,
 * South Gate arrival pad, and surrounding valley terrain.
 */
export function resolveWalkableGroundY(x: number, z: number): number {
  const absX = Math.abs(x);

  // 1. Main Hall Interior (大雄宝殿: X ∈ [-7.45,+7.45], Z ∈ [-23.40,-11.80], Y = 1.830m)
  // Smooth 3cm portal threshold ramp across Z ∈ [-12.00, -11.80]
  if (absX <= 7.45 && z >= -23.4 && z <= -11.8) {
    if (z >= -12.0) {
      const t = THREE.MathUtils.clamp((-11.8 - z) / 0.2, 0, 1);
      return THREE.MathUtils.lerp(1.8, 1.83, t);
    }
    return 1.83;
  }

  // 2. Main Hall Front Terrace (月台: X ∈ [-7.40,+7.40], Z ∈ [-11.80,-8.60], Y = 1.800m)
  if (absX <= 7.4 && z >= -11.8 && z <= -8.6) {
    return 1.8;
  }

  // 3. Upper Stair Flight (上段御阶: X ∈ [-3.25,+3.25], Z ∈ [-8.60,-6.00], 6 steps 0.900 -> 1.800m)
  if (absX <= 3.25 && z >= -8.6 && z <= -6.0) {
    const u = (-6.0 - z) / 2.6;
    return evalSteppedStairY(u, 6, 0.9, 1.8);
  }

  // 4. Mid-Landing (中段歇台: X ∈ [-4.40,+4.40], Z ∈ [-6.00,-4.40], Y = 0.900m)
  if (absX <= 4.4 && z >= -6.0 && z <= -4.4) {
    return 0.9;
  }

  // 5. Lower Stair Flight (下段御阶: X ∈ [-3.25,+3.25], Z ∈ [-4.40,-1.60], 6 steps 0.000/0.025 -> 0.900m)
  if (absX <= 3.25 && z >= -4.4 && z <= -1.6) {
    const entryY = absX <= 1.4 ? 0.025 : 0;
    const u = (-1.6 - z) / 2.8;
    return evalSteppedStairY(u, 6, entryY, 0.9);
  }

  // 6. West & East Side Hall Interiors (东西偏殿: X ∈ ±[8.50,15.10], Z ∈ [-1.80,+6.60], Y = 0.360 -> 0.385m)
  if (absX >= 8.5 && absX <= 15.1 && z >= -1.8 && z <= 6.6) {
    if (absX <= 8.75) {
      return 0.36;
    }
    if (absX <= 8.95) {
      const t = THREE.MathUtils.clamp((absX - 8.75) / 0.2, 0, 1);
      return THREE.MathUtils.lerp(0.36, 0.385, t);
    }
    return 0.385;
  }

  // 7. West & East Side Hall Stairs (偏殿门阶: X ∈ ±[7.70,8.50], Z ∈ [+1.00,+3.80], 2 steps 0.000 -> 0.360m)
  if (absX >= 7.7 && absX <= 8.5 && z >= 1.0 && z <= 3.8) {
    const u = (absX - 7.7) / 0.8;
    return evalSteppedStairY(u, 2, 0, 0.36);
  }

  // 8. South Gate Platform (南山门台基: X ∈ [-3.40,+3.40], Z ∈ [+12.60,+15.40], Y = 0.240m)
  if (absX <= 3.4 && z >= 12.6 && z <= 15.4) {
    return 0.24;
  }

  // 9. South Gate Inner Stairs (山门内阶: X ∈ [-1.75,+1.75], Z ∈ [+11.80,+12.60], 2 steps 0.000/0.025 -> 0.240m)
  if (absX <= 1.75 && z >= 11.8 && z <= 12.6) {
    const entryY = absX <= 1.4 ? 0.025 : 0;
    const u = (z - 11.8) / 0.8;
    return evalSteppedStairY(u, 2, entryY, 0.24);
  }

  // 10. South Gate Outer Stairs (山门外阶: X ∈ [-1.75,+1.75], Z ∈ [+15.40,+16.20], 2 steps 0.025 -> 0.240m)
  if (absX <= 1.75 && z >= 15.4 && z <= 16.2) {
    const u = (16.2 - z) / 0.8;
    return evalSteppedStairY(u, 2, 0.025, 0.24);
  }

  // 11. South Gate Arrival Pad (山门外引道垫石: X ∈ [-2.15,+2.15], Z ∈ [+15.40,+16.80], Y = +0.025m)
  if (absX <= 2.15 && z >= 15.4 && z <= 16.8) {
    return 0.025;
  }

  // 12. Central Granite Axial Path (前院御道: X ∈ [-1.40,+1.40], Z ∈ [-1.60,+11.80], Y = +0.025m)
  if (absX <= 1.4 && z >= -1.6 && z <= 11.8) {
    return 0.025;
  }

  // 13. Open Forecourt Charcoal Stone Paving (开放前院: X ∈ [-14.00,+14.00], Z ∈ [-1.60,+12.60], Y = 0.000m)
  if (absX <= 14.0 && z >= -1.6 && z <= 12.6) {
    return 0;
  }

  // 14. HiddenRecessEarthCap Ground-Hugging Wings (X ∈ [-15.00,+15.00], Z ∈ [-22.50,-1.60])
  if (absX <= 15.0 && z >= -22.5 && z <= -1.6) {
    const fx = THREE.MathUtils.clamp((absX - 12.5) / 2.5, 0, 1);
    const fz = z < -20.0 ? THREE.MathUtils.clamp((-20.0 - z) / 2.5, 0, 1) : 0;
    const skirtBlend = Math.max(fx, fz);
    const outerTargetY = Math.min(-0.025, evalValleyHeight(x, z) - 0.02);
    return THREE.MathUtils.lerp(-0.005, outerTargetY, skirtBlend);
  }

  // 15. Exterior Valley Terrain (beyond architectural slabs / outside South Gate)
  return evalValleyHeight(x, z);
}

/**
 * Extracts exact world-space column colliders from all InstancedMesh column
 * batches inside courtyardGroup and combines them with Phase 2C.2B architectural
 * walls, portals, podium/terrace edges, stair cheeks, lanterns, and interior furnishings.
 */
export function buildTempleCollisionRegistry(
  courtyardGroup: THREE.Group
): TempleCollisionRegistry {
  const boxes: WalkBoxCollider[] = [];
  const cylinders: WalkCylinderCollider[] = [];
  let instancedColumnCount = 0;

  // 1. Extract all 48 InstancedMesh column shafts directly from runtime instance matrices
  courtyardGroup.updateMatrixWorld(true);
  courtyardGroup.traverse((obj) => {
    if (!(obj as THREE.InstancedMesh).isInstancedMesh) return;
    const inst = obj as THREE.InstancedMesh;
    inst.geometry.computeBoundingBox();
    const bb = inst.geometry.boundingBox;
    if (!bb) return;
    const geoH = bb.max.y - bb.min.y;
    if (geoH < 0.5) return;

    for (let i = 0; i < inst.count; i++) {
      inst.getMatrixAt(i, _mat4);
      _mat4.decompose(_pos, _quat, _scale);
      if (_scale.y < 1.5) continue;

      const colRadius = _scale.x * 1.16;
      const halfH = _scale.y * 0.5;
      cylinders.push({
        id: `inst-col-${instancedColumnCount}`,
        category: 'column',
        x: _pos.x,
        z: _pos.z,
        radius: colRadius,
        minY: _pos.y - halfH,
        maxY: _pos.y + halfH,
      });
      instancedColumnCount++;
    }
  });

  // 2. Courtyard Stone Lanterns on Widened Mid-Landing ((±3.800, +0.900, -5.200))
  ([-3.8, 3.8] as const).forEach((lx) => {
    cylinders.push({
      id: lx < 0 ? 'courtyard-lantern-west' : 'courtyard-lantern-east',
      category: 'lantern',
      x: lx,
      z: -5.2,
      radius: 0.4,
      minY: 0.9,
      maxY: 2.65,
    });
  });

  // 3. Main Hall (大雄宝殿 @ (0, +1.800, -17.600)) — 3.30m central portal open (X ∈ [-1.46, +1.46])
  boxes.push(
    // North rear wall (Z = -23.22)
    {
      id: 'main-hall-north-wall',
      category: 'wall',
      minX: -7.35,
      maxX: 7.35,
      minY: 1.8,
      maxY: 6.75,
      minZ: -23.36,
      maxZ: -23.08,
    },
    // West & East outer walls (X = ±7.25)
    {
      id: 'main-hall-west-wall',
      category: 'wall',
      minX: -7.38,
      maxX: -7.12,
      minY: 1.8,
      maxY: 6.75,
      minZ: -23.24,
      maxZ: -12.0,
    },
    {
      id: 'main-hall-east-wall',
      category: 'wall',
      minX: 7.12,
      maxX: 7.38,
      minY: 1.8,
      maxY: 6.75,
      minZ: -23.24,
      maxZ: -12.0,
    },
    // South lattice wall bays flanking open doorway (Z = -12.05)
    {
      id: 'main-hall-south-wall-west',
      category: 'wall',
      minX: -7.25,
      maxX: -1.55,
      minY: 1.8,
      maxY: 6.45,
      minZ: -12.16,
      maxZ: -11.94,
    },
    {
      id: 'main-hall-south-wall-east',
      category: 'wall',
      minX: 1.55,
      maxX: 7.25,
      minY: 1.8,
      maxY: 6.45,
      minZ: -12.16,
      maxZ: -11.94,
    },
    // Inward-opened wooden door leaves + jambs + stone pillows (leaves at X = ±1.49)
    {
      id: 'main-hall-door-leaf-west',
      category: 'portal-frame',
      minX: -1.66,
      maxX: -1.46,
      minY: 1.8,
      maxY: 5.7,
      minZ: -13.04,
      maxZ: -11.9,
    },
    {
      id: 'main-hall-door-leaf-east',
      category: 'portal-frame',
      minX: 1.46,
      maxX: 1.66,
      minY: 1.8,
      maxY: 5.7,
      minZ: -13.04,
      maxZ: -11.9,
    }
  );

  // Main Hall Podium, Terrace Balustrades, Mid-Landing & Two-Flight Stair Cheeks
  // Lower minY=0 guards both elevated edge drop-offs AND lower masonry side walls from earth cap
  ([-1, 1] as const).forEach((sideSign) => {
    const label = sideSign < 0 ? 'west' : 'east';
    const cheek1 = sideSign * 3.2;
    const cheek2 = sideSign * 3.38;
    const midSide1 = sideSign * 4.32;
    const midSide2 = sideSign * 4.48;
    const shoulder1 = sideSign * 3.22;
    const shoulder2 = sideSign * 4.44;
    const terraceSide1 = sideSign * 7.24;
    const terraceSide2 = sideSign * 7.46;
    const terraceSouth1 = sideSign * 3.2;
    const terraceSouth2 = sideSign * 7.44;
    const podiumSide1 = sideSign * 7.26;
    const podiumSide2 = sideSign * 7.82;

    boxes.push(
      // Lower Stair Cheeks (Z ∈ [-4.40, -1.60], X = ±[3.20, 3.38])
      {
        id: `lower-stair-cheek-${label}`,
        category: 'ledge-guard',
        minX: Math.min(cheek1, cheek2),
        maxX: Math.max(cheek1, cheek2),
        minY: 0,
        maxY: 0.9,
        minZ: -4.44,
        maxZ: -1.56,
      },
      // Mid-Landing East/West Edge Guard (X = ±4.40, Z ∈ [-6.00, -4.40])
      {
        id: `mid-landing-edge-${label}`,
        category: 'ledge-guard',
        minX: Math.min(midSide1, midSide2),
        maxX: Math.max(midSide1, midSide2),
        minY: 0,
        maxY: 1.4,
        minZ: -6.04,
        maxZ: -4.36,
      },
      // Mid-Landing South & North Flanking Shoulders (|X| ∈ [3.22, 4.44])
      {
        id: `mid-landing-south-shoulder-${label}`,
        category: 'ledge-guard',
        minX: Math.min(shoulder1, shoulder2),
        maxX: Math.max(shoulder1, shoulder2),
        minY: 0,
        maxY: 1.4,
        minZ: -4.48,
        maxZ: -4.32,
      },
      {
        id: `mid-landing-north-shoulder-${label}`,
        category: 'ledge-guard',
        minX: Math.min(shoulder1, shoulder2),
        maxX: Math.max(shoulder1, shoulder2),
        minY: 0,
        maxY: 1.85,
        minZ: -6.08,
        maxZ: -5.92,
      },
      // Upper Stair Cheeks & Under-Podium Sides (Z ∈ [-8.60, -6.00], X = ±[3.20, 3.38])
      {
        id: `upper-stair-cheek-${label}`,
        category: 'ledge-guard',
        minX: Math.min(cheek1, cheek2),
        maxX: Math.max(cheek1, cheek2),
        minY: 0,
        maxY: 1.85,
        minZ: -8.64,
        maxZ: -5.96,
      },
      // MainTerrace South Balustrades flanking Upper Stair Exit (Z = -8.68, |X| ∈ [3.20, 7.44])
      {
        id: `main-terrace-south-curb-${label}`,
        category: 'ledge-guard',
        minX: Math.min(terraceSouth1, terraceSouth2),
        maxX: Math.max(terraceSouth1, terraceSouth2),
        minY: 0,
        maxY: 2.3,
        minZ: -8.78,
        maxZ: -8.56,
      },
      // MainTerrace East/West Balustrades (X = ±7.32, Z ∈ [-11.80, -8.60])
      {
        id: `main-terrace-side-curb-${label}`,
        category: 'ledge-guard',
        minX: Math.min(terraceSide1, terraceSide2),
        maxX: Math.max(terraceSide1, terraceSide2),
        minY: 0,
        maxY: 2.3,
        minZ: -11.82,
        maxZ: -8.58,
      },
      // MainHallPodium East/West Vertical Masonry Skirt (X = ±[7.26, 7.82], Z ∈ [-23.40, -11.80])
      {
        id: `main-hall-podium-side-${label}`,
        category: 'ledge-guard',
        minX: Math.min(podiumSide1, podiumSide2),
        maxX: Math.max(podiumSide1, podiumSide2),
        minY: 0,
        maxY: 1.85,
        minZ: -23.42,
        maxZ: -11.78,
      }
    );
  });

  // MainHallPodium North Rear Vertical Masonry Skirt (Z = -23.40)
  boxes.push({
    id: 'main-hall-podium-north-skirt',
    category: 'ledge-guard',
    minX: -7.82,
    maxX: 7.82,
    minY: 0,
    maxY: 1.85,
    minZ: -23.44,
    maxZ: -23.1,
  });

  // 4. Main Hall Sacred Interior Focal Point (Scheme A1 + Scheme C podium ΔY=+1.20, ΔZ=-3.40)
  boxes.push(
    {
      id: 'main-hall-sacred-backdrop',
      category: 'backdrop',
      minX: -2.16,
      maxX: 2.16,
      minY: 1.83,
      maxY: 6.08,
      minZ: -22.86,
      maxZ: -22.41,
    },
    {
      id: 'main-hall-sumeru-dais',
      category: 'dais',
      minX: -1.45,
      maxX: 1.45,
      minY: 1.83,
      maxY: 3.35,
      minZ: -22.175,
      maxZ: -20.025,
    },
    {
      id: 'main-hall-altar-table',
      category: 'altar',
      minX: -1.62,
      maxX: 1.62,
      minY: 1.83,
      maxY: 3.2,
      minZ: -18.2,
      maxZ: -17.3,
    }
  );

  // Contemplation Cushion inside Main Hall ((0, 1.83, -14.55), Ø0.48m)
  cylinders.push({
    id: 'main-hall-contemplation-cushion',
    category: 'cushion',
    x: 0,
    z: -14.55,
    radius: 0.25,
    minY: 1.83,
    maxY: 1.98,
  });

  // 5. West & East Side Halls (东西偏殿 @ (±11.800, +0.360, +2.400))
  // Open 2.42m portal centered at Z = +2.400 (Z ∈ [+1.19, +3.61]); stairs X ∈ ±[7.70, 8.50], Z ∈ [+1.00, +3.80]
  ([-1, 1] as const).forEach((sideSign) => {
    const label = sideSign < 0 ? 'west' : 'east';
    const back1 = sideSign * 14.84;
    const back2 = sideSign * 15.12;
    const gable1 = sideSign * 8.5;
    const gable2 = sideSign * 15.12;
    const front1 = sideSign * 8.5;
    const front2 = sideSign * 8.88;
    const leafX1 = sideSign * 8.8;
    const leafX2 = sideSign * 9.6;
    const stair1 = sideSign * 7.66;
    const stair2 = sideSign * 8.54;
    const alt1 = sideSign * 13.1;
    const alt2 = sideSign * 14.2;

    boxes.push(
      // Outer back wall + plinth skirt
      {
        id: `${label}-side-back-wall`,
        category: 'wall',
        minX: Math.min(back1, back2),
        maxX: Math.max(back1, back2),
        minY: 0,
        maxY: 3.96,
        minZ: -1.82,
        maxZ: 6.62,
      },
      // North & South gable walls + plinth skirt (Z = -1.70 & Z = +6.50)
      {
        id: `${label}-side-north-gable`,
        category: 'wall',
        minX: Math.min(gable1, gable2),
        maxX: Math.max(gable1, gable2),
        minY: 0,
        maxY: 3.96,
        minZ: -1.82,
        maxZ: -1.56,
      },
      {
        id: `${label}-side-south-gable`,
        category: 'wall',
        minX: Math.min(gable1, gable2),
        maxX: Math.max(gable1, gable2),
        minY: 0,
        maxY: 3.96,
        minZ: 6.36,
        maxZ: 6.62,
      },
      // Front lattice walls & plinth shoulders flanking open portal (Z ∈ [+1.19, +3.61] open)
      {
        id: `${label}-side-front-wall-north`,
        category: 'wall',
        minX: Math.min(front1, front2),
        maxX: Math.max(front1, front2),
        minY: 0,
        maxY: 3.8,
        minZ: -1.62,
        maxZ: 1.18,
      },
      {
        id: `${label}-side-front-wall-south`,
        category: 'wall',
        minX: Math.min(front1, front2),
        maxX: Math.max(front1, front2),
        minY: 0,
        maxY: 3.8,
        minZ: 3.62,
        maxZ: 6.42,
      },
      // Open inward door leaves & jambs (leaves at Z = +1.35 & Z = +3.45 -> clear interior Z ∈ [+1.43, +3.37])
      {
        id: `${label}-side-door-leaf-north`,
        category: 'portal-frame',
        minX: Math.min(leafX1, leafX2),
        maxX: Math.max(leafX1, leafX2),
        minY: 0.36,
        maxY: 3.25,
        minZ: 1.18,
        maxZ: 1.42,
      },
      {
        id: `${label}-side-door-leaf-south`,
        category: 'portal-frame',
        minX: Math.min(leafX1, leafX2),
        maxX: Math.max(leafX1, leafX2),
        minY: 0.36,
        maxY: 3.25,
        minZ: 3.38,
        maxZ: 3.62,
      },
      // Side stair cheek curbs (Z = +0.91..+1.09 & Z = +3.71..+3.89)
      {
        id: `${label}-side-stair-cheek-north`,
        category: 'ledge-guard',
        minX: Math.min(stair1, stair2),
        maxX: Math.max(stair1, stair2),
        minY: 0,
        maxY: 0.65,
        minZ: 0.91,
        maxZ: 1.09,
      },
      {
        id: `${label}-side-stair-cheek-south`,
        category: 'ledge-guard',
        minX: Math.min(stair1, stair2),
        maxX: Math.max(stair1, stair2),
        minY: 0,
        maxY: 0.65,
        minZ: 3.71,
        maxZ: 3.89,
      },
      // Twin interior stone altar bases inside Side Hall (local z = ±2.10 -> world Z = +0.30 & +4.50)
      {
        id: `${label}-side-altar-north`,
        category: 'altar',
        minX: Math.min(alt1, alt2),
        maxX: Math.max(alt1, alt2),
        minY: 0.36,
        maxY: 0.96,
        minZ: -0.65,
        maxZ: 1.25,
      },
      {
        id: `${label}-side-altar-south`,
        category: 'altar',
        minX: Math.min(alt1, alt2),
        maxX: Math.max(alt1, alt2),
        minY: 0.36,
        maxY: 0.96,
        minZ: 3.55,
        maxZ: 5.45,
      }
    );
  });

  // 6. South Gate (山门 @ (0, +0.240, +14.000))
  // Preserves 3.04m portal open (X ∈ [-1.32, +1.32]) & continuous walkthrough to ArrivalPad & outside
  boxes.push(
    // West & East gate side walls (X ∈ ±[1.775, 3.125], Z = 14.00)
    {
      id: 'south-gate-wall-west',
      category: 'wall',
      minX: -3.25,
      maxX: -1.75,
      minY: 0.24,
      maxY: 3.15,
      minZ: 13.86,
      maxZ: 14.14,
    },
    {
      id: 'south-gate-wall-east',
      category: 'wall',
      minX: 1.75,
      maxX: 3.25,
      minY: 0.24,
      maxY: 3.15,
      minZ: 13.86,
      maxZ: 14.14,
    },
    // Inward-opened wooden gate leaves & stone pillows (leaves at X = ±1.36, Z ∈ [13.09, 13.94])
    {
      id: 'south-gate-door-leaf-west',
      category: 'portal-frame',
      minX: -1.56,
      maxX: -1.32,
      minY: 0.24,
      maxY: 3.05,
      minZ: 13.05,
      maxZ: 14.1,
    },
    {
      id: 'south-gate-door-leaf-east',
      category: 'portal-frame',
      minX: 1.32,
      maxX: 1.56,
      minY: 0.24,
      maxY: 3.05,
      minZ: 13.05,
      maxZ: 14.1,
    },
    // South Gate Inner Stair Cheeks (Z ∈ [11.80, 12.60])
    {
      id: 'south-gate-inner-stair-cheek-west',
      category: 'ledge-guard',
      minX: -1.94,
      maxX: -1.75,
      minY: 0,
      maxY: 0.45,
      minZ: 11.76,
      maxZ: 12.64,
    },
    {
      id: 'south-gate-inner-stair-cheek-east',
      category: 'ledge-guard',
      minX: 1.75,
      maxX: 1.94,
      minY: 0,
      maxY: 0.45,
      minZ: 11.76,
      maxZ: 12.64,
    },
    // South Gate Outer Stair Cheeks (Z ∈ [15.40, 16.20])
    {
      id: 'south-gate-outer-stair-cheek-west',
      category: 'ledge-guard',
      minX: -1.94,
      maxX: -1.75,
      minY: 0,
      maxY: 0.45,
      minZ: 15.36,
      maxZ: 16.24,
    },
    {
      id: 'south-gate-outer-stair-cheek-east',
      category: 'ledge-guard',
      minX: 1.75,
      maxX: 1.94,
      minY: 0,
      maxY: 0.45,
      minZ: 15.36,
      maxZ: 16.24,
    },
    // South Gate Plinth Edge Guards flanking stairs (|X| ∈ [1.80, 3.42], Z = 12.60 & 15.40 & sides X=±3.40)
    {
      id: 'south-gate-north-ledge-west',
      category: 'ledge-guard',
      minX: -3.42,
      maxX: -1.8,
      minY: 0,
      maxY: 0.65,
      minZ: 12.54,
      maxZ: 12.68,
    },
    {
      id: 'south-gate-north-ledge-east',
      category: 'ledge-guard',
      minX: 1.8,
      maxX: 3.42,
      minY: 0,
      maxY: 0.65,
      minZ: 12.54,
      maxZ: 12.68,
    },
    {
      id: 'south-gate-south-ledge-west',
      category: 'ledge-guard',
      minX: -3.42,
      maxX: -1.8,
      minY: 0,
      maxY: 0.65,
      minZ: 15.32,
      maxZ: 15.46,
    },
    {
      id: 'south-gate-south-ledge-east',
      category: 'ledge-guard',
      minX: 1.8,
      maxX: 3.42,
      minY: 0,
      maxY: 0.65,
      minZ: 15.32,
      maxZ: 15.46,
    },
    {
      id: 'south-gate-side-ledge-west',
      category: 'ledge-guard',
      minX: -3.44,
      maxX: -3.3,
      minY: 0,
      maxY: 0.65,
      minZ: 12.56,
      maxZ: 15.44,
    },
    {
      id: 'south-gate-side-ledge-east',
      category: 'ledge-guard',
      minX: 3.3,
      maxX: 3.44,
      minY: 0,
      maxY: 0.65,
      minZ: 12.56,
      maxZ: 15.44,
    }
  );

  return { boxes, cylinders, instancedColumnCount };
}

/**
 * Resolves single-step horizontal capsule-vs-box and capsule-vs-cylinder collisions
 * with corner anti-stuck relaxation. Modifies `pos` in place.
 */
function depenetrateWalkStep(
  pos: THREE.Vector3,
  radius: number,
  actorMinY: number,
  actorMaxY: number,
  registry: TempleCollisionRegistry
) {
  // Ignore tiny ankle steps <= 0.10m (e.g. door sill or axial path border)
  const stepClearanceY = actorMinY + 0.1;

  for (let pass = 0; pass < 4; pass++) {
    let anyHit = false;

    // 1. Horizontal Circle vs AABB colliders
    for (let i = 0; i < registry.boxes.length; i++) {
      const b = registry.boxes[i];
      if (b.maxY <= stepClearanceY || b.minY >= actorMaxY) continue;

      const closestX = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
      const closestZ = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        anyHit = true;
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist + 0.0005;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        } else {
          // Center fell inside box: push out toward nearest face
          const dLeft = pos.x - b.minX;
          const dRight = b.maxX - pos.x;
          const dBack = pos.z - b.minZ;
          const dFront = b.maxZ - pos.z;
          const minD = Math.min(dLeft, dRight, dBack, dFront);
          if (minD === dLeft) pos.x = b.minX - radius - 0.001;
          else if (minD === dRight) pos.x = b.maxX + radius + 0.001;
          else if (minD === dBack) pos.z = b.minZ - radius - 0.001;
          else pos.z = b.maxZ + radius + 0.001;
        }
      }
    }

    // 2. Horizontal Circle vs Cylinder colliders (InstancedMesh columns, lanterns, cushion)
    for (let i = 0; i < registry.cylinders.length; i++) {
      const c = registry.cylinders[i];
      if (c.maxY <= stepClearanceY || c.minY >= actorMaxY) continue;

      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const minR = radius + c.radius;
      const distSq = dx * dx + dz * dz;

      if (distSq < minR * minR) {
        anyHit = true;
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const push = minR - dist + 0.0005;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        } else {
          pos.z = c.z + minR + 0.001;
        }
      }
    }

    if (!anyHit) break;
  }
}

/**
 * Moves the actor capsule continuously in small substeps (max 0.05m per substep)
 * to prevent tunneling through thin walls, provides smooth tangential wall-sliding,
 * and evaluates the continuous walkable ground height at the resolved position.
 */
export function moveActorWithCollisions(
  position: THREE.Vector3,
  deltaX: number,
  deltaZ: number,
  radius: number,
  height: number,
  registry: TempleCollisionRegistry
): number {
  const moveDist = Math.hypot(deltaX, deltaZ);
  const substeps = Math.max(1, Math.min(10, Math.ceil(moveDist / 0.05)));
  const stepX = deltaX / substeps;
  const stepZ = deltaZ / substeps;

  for (let s = 0; s < substeps; s++) {
    position.x += stepX;
    position.z += stepZ;
    const gY = resolveWalkableGroundY(position.x, position.z);
    depenetrateWalkStep(position, radius, gY, gY + height, registry);
  }

  const finalGroundY = resolveWalkableGroundY(position.x, position.z);
  position.y = finalGroundY;
  return finalGroundY;
}

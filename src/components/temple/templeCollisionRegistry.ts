import * as THREE from 'three';

/**
 * Static Walk Collision Registry & Continuous Ground Elevation Evaluator (Phase 2B.2).
 * Extracts live InstancedMesh column matrices directly from the courtyard group,
 * preserves all real architectural portals, stairs, and aisles, and prevents
 * penetrating walls, columns, altars, lanterns, bench rails, or dropping off plinths.
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

/**
 * Evaluates continuous walkable surface height Y at world (x, z)
 * matching all courtyard floors, axial path, granite stair ramps,
 * corridors, Main Hall terrace, Main Hall interior, and Side Halls.
 */
export function resolveWalkableGroundY(x: number, z: number): number {
  const absX = Math.abs(x);

  // 1. Main Hall Interior (大雄宝殿地面: Y = 0.630, gentle 3cm threshold ramp Z ∈ [-8.60, -8.40])
  if (z <= -8.4 && absX <= 7.45) {
    if (z >= -8.6) {
      const t = THREE.MathUtils.clamp((-8.4 - z) / 0.2, 0, 1);
      return THREE.MathUtils.lerp(0.6, 0.63, t);
    }
    return 0.63;
  }

  // 2. Main Hall Front Terrace (月台: Z ∈ [-8.40, -5.40], X ∈ [-6.60, +6.60], Y = 0.600)
  if (z <= -5.4 && z >= -8.4 && absX <= 6.6) {
    return 0.6;
  }

  // 3. Central Terrace Front Stairs (御阶: Z ∈ [-5.40, -4.20], X ∈ [-2.15, +2.15], 0.00 -> 0.60)
  if (z <= -4.2 && z >= -5.4 && absX <= 2.15) {
    const t = THREE.MathUtils.clamp((-4.2 - z) / 1.2, 0, 1);
    return THREE.MathUtils.lerp(0, 0.6, t);
  }

  // 4. NW / NE Corridor-to-Terrace Stairs (X ∈ ±[6.60, 7.30], Z ∈ [-7.63, -6.53], 0.30 -> 0.60)
  if (absX >= 6.6 && absX <= 7.3 && z >= -7.65 && z <= -6.5) {
    const t = THREE.MathUtils.clamp((7.3 - absX) / 0.7, 0, 1);
    return THREE.MathUtils.lerp(0.3, 0.6, t);
  }

  // 5. NW / NE North Link Corridors (X ∈ ±[6.60, 8.60], Z ∈ [-8.40, -4.20], Y = 0.30)
  if (absX >= 6.6 && absX <= 8.65 && z >= -8.4 && z <= -4.2) {
    return 0.3;
  }

  // 6. Courtyard-to-NW/NE Corridor Stairs (X ∈ ±[6.00, 6.60], Z ∈ [-5.25, -4.35], 0.00 -> 0.30)
  if (absX >= 6.0 && absX <= 6.6 && z >= -5.25 && z <= -4.35) {
    const t = THREE.MathUtils.clamp((absX - 6.0) / 0.6, 0, 1);
    return THREE.MathUtils.lerp(0, 0.3, t);
  }

  // 7. Side Hall Interiors (东西偏殿: X ∈ ±[6.60, 13.20], Z ∈ [-4.20, +4.20], Y = 0.325)
  if (absX >= 6.6 && absX <= 13.25 && Math.abs(z) <= 4.2) {
    if (absX <= 6.85) {
      const t = THREE.MathUtils.clamp((absX - 6.6) / 0.25, 0, 1);
      return THREE.MathUtils.lerp(0.3, 0.325, t);
    }
    return 0.325;
  }

  // 8. Side Hall Courtyard Stairs (X ∈ ±[5.90, 6.60], Z ∈ [-1.45, +1.45], 0.00 -> 0.30)
  if (absX >= 5.9 && absX <= 6.6 && Math.abs(z) <= 1.45) {
    const t = THREE.MathUtils.clamp((absX - 5.9) / 0.7, 0, 1);
    return THREE.MathUtils.lerp(0, 0.3, t);
  }

  // 9. SW / SE South Corridors, Corner Pavilions & South E-W Corridors (Y = 0.30)
  if (absX >= 6.6 && absX <= 8.65 && z >= 4.2 && z <= 10.65) {
    return 0.3;
  }
  if (absX >= 3.4 && absX <= 6.6 && z >= 8.6 && z <= 10.65) {
    return 0.3;
  }

  // 10. South Gate Platform (山门台基: X ∈ [-3.40, +3.40], Z ∈ [8.425, 11.20], Y = 0.30)
  if (absX <= 3.4 && z >= 8.425 && z <= 11.25) {
    return 0.3;
  }

  // 11. South Gate Courtyard Stairs (X ∈ [-1.75, +1.75], Z ∈ [7.675, 8.425], 0.00 -> 0.30)
  if (absX <= 1.75 && z >= 7.675 && z <= 8.425) {
    const t = THREE.MathUtils.clamp((z - 7.675) / 0.75, 0, 1);
    return THREE.MathUtils.lerp(0, 0.3, t);
  }

  // 12. Central Granite Axial Path (御道: X ∈ [-1.32, +1.32], Z ∈ [-4.20, +7.675], Y = 0.025)
  if (absX <= 1.32 && z >= -4.2 && z <= 7.675) {
    return 0.025;
  }

  // 13. Courtyard Charcoal Stone Paving (Y = 0.000)
  return 0;
}

/**
 * Extracts exact world-space column colliders from all InstancedMesh column
 * batches inside courtyardGroup and combines them with architectural walls,
 * portals, stairs, rails, lanterns, and Main Hall / Side Hall furnishings.
 */
export function buildTempleCollisionRegistry(
  courtyardGroup: THREE.Group
): TempleCollisionRegistry {
  const boxes: WalkBoxCollider[] = [];
  const cylinders: WalkCylinderCollider[] = [];
  let instancedColumnCount = 0;

  // 1. Extract all InstancedMesh column shafts directly from runtime instance matrices
  courtyardGroup.updateMatrixWorld(true);
  courtyardGroup.traverse((obj) => {
    if (!(obj as THREE.InstancedMesh).isInstancedMesh) return;
    const inst = obj as THREE.InstancedMesh;
    inst.geometry.computeBoundingBox();
    const bb = inst.geometry.boundingBox;
    if (!bb) return;
    const geoH = bb.max.y - bb.min.y;
    // Column shafts use unit CylinderGeometry(1, 1.05, 1, 18) -> geoH ≈ 1.0, scaled vertically by spec.height (> 1.5)
    // Column bases use height 0.16 -> skip duplicate low base batch
    if (geoH < 0.5) return;

    for (let i = 0; i < inst.count; i++) {
      inst.getMatrixAt(i, _mat4);
      _mat4.decompose(_pos, _quat, _scale);
      if (_scale.y < 1.5) continue;

      // Account for slight 1.05 bottom flare + stone column base shoulder (~1.16x shaft)
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

  // 2. Courtyard Stone Lanterns (Z = -4.25, X = ±3.0)
  ([-3.0, 3.0] as const).forEach((lx) => {
    cylinders.push({
      id: lx < 0 ? 'courtyard-lantern-west' : 'courtyard-lantern-east',
      category: 'lantern',
      x: lx,
      z: -4.25,
      radius: 0.39,
      minY: 0,
      maxY: 1.72,
    });
  });

  // 3. Main Hall (大雄宝殿) Architecture — preserving 3.30m central portal open (X ∈ [-1.455, +1.455])
  boxes.push(
    // North rear wall
    {
      id: 'main-hall-north-wall',
      category: 'wall',
      minX: -7.35,
      maxX: 7.35,
      minY: 0.6,
      maxY: 5.55,
      minZ: -19.96,
      maxZ: -19.68,
    },
    // West & East outer walls
    {
      id: 'main-hall-west-wall',
      category: 'wall',
      minX: -7.38,
      maxX: -7.12,
      minY: 0.6,
      maxY: 5.55,
      minZ: -19.85,
      maxZ: -8.58,
    },
    {
      id: 'main-hall-east-wall',
      category: 'wall',
      minX: 7.12,
      maxX: 7.38,
      minY: 0.6,
      maxY: 5.55,
      minZ: -19.85,
      maxZ: -8.58,
    },
    // South lattice wall bays flanking open doorway
    {
      id: 'main-hall-south-wall-west',
      category: 'wall',
      minX: -7.25,
      maxX: -1.49,
      minY: 0.6,
      maxY: 5.2,
      minZ: -8.75,
      maxZ: -8.55,
    },
    {
      id: 'main-hall-south-wall-east',
      category: 'wall',
      minX: 1.49,
      maxX: 7.25,
      minY: 0.6,
      maxY: 5.2,
      minZ: -8.75,
      maxZ: -8.55,
    },
    // Inward-opened wooden door leaves + jambs + stone pillows (leaves at X = ±1.49)
    {
      id: 'main-hall-door-leaf-west',
      category: 'portal-frame',
      minX: -1.66,
      maxX: -1.455,
      minY: 0.6,
      maxY: 4.5,
      minZ: -9.68,
      maxZ: -8.48,
    },
    {
      id: 'main-hall-door-leaf-east',
      category: 'portal-frame',
      minX: 1.455,
      maxX: 1.66,
      minY: 0.6,
      maxY: 4.5,
      minZ: -9.68,
      maxZ: -8.48,
    }
  );

  // Main Hall Front Terrace Curbs, Stair Cheeks & Un-staired Edge Guards
  ([-1, 1] as const).forEach((sideSign) => {
    const cx1 = sideSign * 2.12;
    const cx2 = sideSign * 6.56;
    const cheek1 = sideSign * 2.1;
    const cheek2 = sideSign * 2.28;
    const edgeX = sideSign * 6.6;
    boxes.push(
      {
        id: sideSign < 0 ? 'main-terrace-curb-west' : 'main-terrace-curb-east',
        category: 'ledge-guard',
        minX: Math.min(cx1, cx2),
        maxX: Math.max(cx1, cx2),
        minY: 0.6,
        maxY: 1.05,
        minZ: -5.6,
        maxZ: -5.4,
      },
      {
        id: sideSign < 0 ? 'main-stair-cheek-west' : 'main-stair-cheek-east',
        category: 'ledge-guard',
        minX: Math.min(cheek1, cheek2),
        maxX: Math.max(cheek1, cheek2),
        minY: 0,
        maxY: 0.72,
        minZ: -5.44,
        maxZ: -4.16,
      },
      // Guard non-stair terrace sides so player routes cleanly via corridor stairs [-7.63, -6.53]
      {
        id: sideSign < 0 ? 'main-terrace-side-guard-south-w' : 'main-terrace-side-guard-south-e',
        category: 'ledge-guard',
        minX: edgeX - 0.08,
        maxX: edgeX + 0.08,
        minY: 0.3,
        maxY: 1.1,
        minZ: -6.52,
        maxZ: -5.5,
      },
      {
        id: sideSign < 0 ? 'main-terrace-side-guard-north-w' : 'main-terrace-side-guard-north-e',
        category: 'ledge-guard',
        minX: edgeX - 0.08,
        maxX: edgeX + 0.08,
        minY: 0.3,
        maxY: 1.1,
        minZ: -8.55,
        maxZ: -7.65,
      }
    );
  });

  // 4. Main Hall Sacred Interior Focal Point (Scheme A1)
  boxes.push(
    // Sacred Backdrop Shrine Niche (Z ∈ [-19.46, -19.01])
    {
      id: 'main-hall-sacred-backdrop',
      category: 'backdrop',
      minX: -2.16,
      maxX: 2.16,
      minY: 0.63,
      maxY: 4.88,
      minZ: -19.46,
      maxZ: -19.01,
    },
    // Stepped Sumeru Dais & Double-Lotus Pedestal (2.90m × 2.15m)
    {
      id: 'main-hall-sumeru-dais',
      category: 'dais',
      minX: -1.45,
      maxX: 1.45,
      minY: 0.63,
      maxY: 2.15,
      minZ: -18.775,
      maxZ: -16.625,
    },
    // Main Dark Hardwood Offering Altar + Censer/Lamps/Vases (3.24m w/ wings × 0.90m)
    {
      id: 'main-hall-altar-table',
      category: 'altar',
      minX: -1.62,
      maxX: 1.62,
      minY: 0.63,
      maxY: 2.0,
      minZ: -14.8,
      maxZ: -13.9,
    }
  );

  // Contemplation Cushion inside Main Hall (center [0, 0.63, -11.15], Ø0.48m)
  cylinders.push({
    id: 'main-hall-contemplation-cushion',
    category: 'cushion',
    x: 0,
    z: -11.15,
    radius: 0.25,
    minY: 0.63,
    maxY: 0.78,
  });

  // 5. Left & Right Side Halls (东西偏殿) — preserving 2.03m open portal at Z ∈ [-1.015, +1.015]
  ([-1, 1] as const).forEach((sideSign) => {
    const label = sideSign < 0 ? 'west' : 'east';
    const back1 = sideSign * 12.92;
    const back2 = sideSign * 13.22;
    const gable1 = sideSign * 6.72;
    const gable2 = sideSign * 13.08;
    const front1 = sideSign * 6.76;
    const front2 = sideSign * 6.94;
    const leafX1 = sideSign * 6.8;
    const leafX2 = sideSign * 7.62;
    const stair1 = sideSign * 5.86;
    const stair2 = sideSign * 6.64;
    const alt1 = sideSign * 11.2;
    const alt2 = sideSign * 12.3;

    boxes.push(
      // Outer back wall
      {
        id: `${label}-side-back-wall`,
        category: 'wall',
        minX: Math.min(back1, back2),
        maxX: Math.max(back1, back2),
        minY: 0.3,
        maxY: 3.9,
        minZ: -4.18,
        maxZ: 4.18,
      },
      // North & South gable walls
      {
        id: `${label}-side-north-gable`,
        category: 'wall',
        minX: Math.min(gable1, gable2),
        maxX: Math.max(gable1, gable2),
        minY: 0.3,
        maxY: 3.9,
        minZ: -4.22,
        maxZ: -3.98,
      },
      {
        id: `${label}-side-south-gable`,
        category: 'wall',
        minX: Math.min(gable1, gable2),
        maxX: Math.max(gable1, gable2),
        minY: 0.3,
        maxY: 3.9,
        minZ: 3.98,
        maxZ: 4.22,
      },
      // Front courtyard-facing lattice walls flanking open portal
      {
        id: `${label}-side-front-wall-north`,
        category: 'wall',
        minX: Math.min(front1, front2),
        maxX: Math.max(front1, front2),
        minY: 0.3,
        maxY: 3.6,
        minZ: -4.1,
        maxZ: -1.05,
      },
      {
        id: `${label}-side-front-wall-south`,
        category: 'wall',
        minX: Math.min(front1, front2),
        maxX: Math.max(front1, front2),
        minY: 0.3,
        maxY: 3.6,
        minZ: 1.05,
        maxZ: 4.1,
      },
      // Open inward door leaves & jambs
      {
        id: `${label}-side-door-leaf-north`,
        category: 'portal-frame',
        minX: Math.min(leafX1, leafX2),
        maxX: Math.max(leafX1, leafX2),
        minY: 0.3,
        maxY: 3.15,
        minZ: -1.24,
        maxZ: -1.015,
      },
      {
        id: `${label}-side-door-leaf-south`,
        category: 'portal-frame',
        minX: Math.min(leafX1, leafX2),
        maxX: Math.max(leafX1, leafX2),
        minY: 0.3,
        maxY: 3.15,
        minZ: 1.015,
        maxZ: 1.24,
      },
      // Side stair cheek curbs
      {
        id: `${label}-side-stair-cheek-north`,
        category: 'ledge-guard',
        minX: Math.min(stair1, stair2),
        maxX: Math.max(stair1, stair2),
        minY: 0,
        maxY: 0.45,
        minZ: -1.58,
        maxZ: -1.4,
      },
      {
        id: `${label}-side-stair-cheek-south`,
        category: 'ledge-guard',
        minX: Math.min(stair1, stair2),
        maxX: Math.max(stair1, stair2),
        minY: 0,
        maxY: 0.45,
        minZ: 1.4,
        maxZ: 1.58,
      },
      // Twin interior stone altar bases inside Side Hall
      {
        id: `${label}-side-altar-north`,
        category: 'altar',
        minX: Math.min(alt1, alt2),
        maxX: Math.max(alt1, alt2),
        minY: 0.3,
        maxY: 0.9,
        minZ: -3.05,
        maxZ: -1.15,
      },
      {
        id: `${label}-side-altar-south`,
        category: 'altar',
        minX: Math.min(alt1, alt2),
        maxX: Math.max(alt1, alt2),
        minY: 0.3,
        maxY: 0.9,
        minZ: 1.15,
        maxZ: 3.05,
      }
    );
  });

  // 6. Covered Corridors, Bench Rails, Stair Cheeks & Ledge Guards
  ([-1, 1] as const).forEach((sideSign) => {
    const label = sideSign < 0 ? 'west' : 'east';
    const rx1 = sideSign * 6.62;
    const rx2 = sideSign * 6.94;
    const ewx1 = sideSign * 3.55;
    const ewx2 = sideSign * 6.65;
    const cStair1 = sideSign * 5.98;
    const cStair2 = sideSign * 6.62;
    const tStair1 = sideSign * 6.58;
    const tStair2 = sideSign * 7.32;
    const edgeX = sideSign * 6.6;
    const northDrop1 = sideSign * 7.35;
    const northDrop2 = sideSign * 8.6;

    boxes.push(
      // NW/NE corridor bench rail (Z = -6.20..-4.35)
      {
        id: `${label}-nw-bench-rail`,
        category: 'rail',
        minX: Math.min(rx1, rx2),
        maxX: Math.max(rx1, rx2),
        minY: 0.3,
        maxY: 1.1,
        minZ: -6.2,
        maxZ: -4.35,
      },
      // Guard between NW/NE corridor stair (-5.23..-4.37) & bench (-6.2)
      {
        id: `${label}-nw-ledge-north-of-stair`,
        category: 'ledge-guard',
        minX: edgeX - 0.08,
        maxX: edgeX + 0.08,
        minY: 0,
        maxY: 0.7,
        minZ: -6.5,
        maxZ: -5.25,
      },
      // Courtyard->NW/NE corridor stair cheeks
      {
        id: `${label}-nw-stair-cheek-n`,
        category: 'ledge-guard',
        minX: Math.min(cStair1, cStair2),
        maxX: Math.max(cStair1, cStair2),
        minY: 0,
        maxY: 0.45,
        minZ: -5.4,
        maxZ: -5.23,
      },
      {
        id: `${label}-nw-stair-cheek-s`,
        category: 'ledge-guard',
        minX: Math.min(cStair1, cStair2),
        maxX: Math.max(cStair1, cStair2),
        minY: 0,
        maxY: 0.45,
        minZ: -4.37,
        maxZ: -4.2,
      },
      // NW/NE corridor->Terrace stair cheeks
      {
        id: `${label}-terrace-stair-cheek-n`,
        category: 'ledge-guard',
        minX: Math.min(tStair1, tStair2),
        maxX: Math.max(tStair1, tStair2),
        minY: 0.3,
        maxY: 0.85,
        minZ: -7.8,
        maxZ: -7.63,
      },
      {
        id: `${label}-terrace-stair-cheek-s`,
        category: 'ledge-guard',
        minX: Math.min(tStair1, tStair2),
        maxX: Math.max(tStair1, tStair2),
        minY: 0.3,
        maxY: 0.85,
        minZ: -6.53,
        maxZ: -6.36,
      },
      // NW/NE corridor north end guard at Z = -8.40
      {
        id: `${label}-nw-north-edge-guard`,
        category: 'ledge-guard',
        minX: Math.min(northDrop1, northDrop2),
        maxX: Math.max(northDrop1, northDrop2),
        minY: 0.3,
        maxY: 1.0,
        minZ: -8.5,
        maxZ: -8.35,
      },
      // SW/SE N-S corridor bench rail + open plinth edge to Z = 8.60
      {
        id: `${label}-sw-ns-bench-rail`,
        category: 'rail',
        minX: Math.min(rx1, rx2),
        maxX: Math.max(rx1, rx2),
        minY: 0.3,
        maxY: 1.1,
        minZ: 4.35,
        maxZ: 6.45,
      },
      {
        id: `${label}-sw-ns-ledge-guard`,
        category: 'ledge-guard',
        minX: edgeX - 0.08,
        maxX: edgeX + 0.08,
        minY: 0,
        maxY: 0.85,
        minZ: 6.45,
        maxZ: 8.65,
      },
      // SW/SE E-W corridor bench rail along Z = 8.78
      {
        id: `${label}-sw-ew-bench-rail`,
        category: 'rail',
        minX: Math.min(ewx1, ewx2),
        maxX: Math.max(ewx1, ewx2),
        minY: 0.3,
        maxY: 1.1,
        minZ: 8.62,
        maxZ: 8.94,
      }
    );
  });

  // 7. South Gate (山门) — preserving 2.65m open portal at X ∈ [-1.325, +1.325]
  boxes.push(
    // West & East gate side walls (X ∈ ±[1.775, 3.125])
    {
      id: 'south-gate-wall-west',
      category: 'wall',
      minX: -3.25,
      maxX: -1.75,
      minY: 0.3,
      maxY: 3.25,
      minZ: 9.66,
      maxZ: 9.94,
    },
    {
      id: 'south-gate-wall-east',
      category: 'wall',
      minX: 1.75,
      maxX: 3.25,
      minY: 0.3,
      maxY: 3.25,
      minZ: 9.66,
      maxZ: 9.94,
    },
    // Inward-opened wooden gate leaves & stone pillows (leaves at X = ±1.36)
    {
      id: 'south-gate-door-leaf-west',
      category: 'portal-frame',
      minX: -1.56,
      maxX: -1.325,
      minY: 0.3,
      maxY: 3.15,
      minZ: 8.84,
      maxZ: 9.98,
    },
    {
      id: 'south-gate-door-leaf-east',
      category: 'portal-frame',
      minX: 1.325,
      maxX: 1.56,
      minY: 0.3,
      maxY: 3.15,
      minZ: 8.84,
      maxZ: 9.98,
    },
    // South Gate stair cheeks
    {
      id: 'south-gate-stair-cheek-west',
      category: 'ledge-guard',
      minX: -1.94,
      maxX: -1.75,
      minY: 0,
      maxY: 0.45,
      minZ: 7.64,
      maxZ: 8.46,
    },
    {
      id: 'south-gate-stair-cheek-east',
      category: 'ledge-guard',
      minX: 1.75,
      maxX: 1.94,
      minY: 0,
      maxY: 0.45,
      minZ: 7.64,
      maxZ: 8.46,
    },
    // Ledge guards flanking Gate Stairs along Z = 8.40
    {
      id: 'south-gate-ledge-west',
      category: 'ledge-guard',
      minX: -3.45,
      maxX: -1.8,
      minY: 0,
      maxY: 0.75,
      minZ: 8.34,
      maxZ: 8.52,
    },
    {
      id: 'south-gate-ledge-east',
      category: 'ledge-guard',
      minX: 1.8,
      maxX: 3.45,
      minY: 0,
      maxY: 0.75,
      minZ: 8.34,
      maxZ: 8.52,
    },
    // South Gate outer boundary at Z = 10.95 (keeps player safely on gate plinth)
    {
      id: 'south-gate-outer-boundary',
      category: 'ledge-guard',
      minX: -3.5,
      maxX: 3.5,
      minY: 0.3,
      maxY: 2.5,
      minZ: 10.88,
      maxZ: 11.25,
    }
  );

  // 8. Compound Perimeter Enclosure Walls (院墙)
  ([-1, 1] as const).forEach((sideSign) => {
    const label = sideSign < 0 ? 'west' : 'east';
    const wx1 = sideSign * 8.55;
    const wx2 = sideSign * 8.85;
    const sw1 = sideSign * 3.35;
    const sw2 = sideSign * 8.78;
    const nw1 = sideSign * 7.55;
    const nw2 = sideSign * 8.85;
    boxes.push(
      {
        id: `${label}-perimeter-north`,
        category: 'wall',
        minX: Math.min(wx1, wx2),
        maxX: Math.max(wx1, wx2),
        minY: 0,
        maxY: 2.8,
        minZ: -20.02,
        maxZ: -4.2,
      },
      {
        id: `${label}-perimeter-south`,
        category: 'wall',
        minX: Math.min(wx1, wx2),
        maxX: Math.max(wx1, wx2),
        minY: 0,
        maxY: 2.8,
        minZ: 4.2,
        maxZ: 10.65,
      },
      {
        id: `${label}-perimeter-south-ew`,
        category: 'wall',
        minX: Math.min(sw1, sw2),
        maxX: Math.max(sw1, sw2),
        minY: 0,
        maxY: 2.8,
        minZ: 10.5,
        maxZ: 10.8,
      },
      {
        id: `${label}-perimeter-north-stub`,
        category: 'wall',
        minX: Math.min(nw1, nw2),
        maxX: Math.max(nw1, nw2),
        minY: 0,
        maxY: 2.8,
        minZ: -20.1,
        maxZ: -19.8,
      }
    );
  });

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

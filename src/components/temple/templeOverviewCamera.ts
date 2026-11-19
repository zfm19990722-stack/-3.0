import * as THREE from 'three';

/**
 * Courtyard 360° Overview Camera Safety & Orbit Configuration (Phase 2B.1).
 * Keeps OrbitControls strictly exterior to all solid temple structures,
 * walls, columns, lanterns, curved Chinese roofs, and above ground,
 * with continuous swept-segment sliding and zero fighting with OrbitControls.
 */

export const OVERVIEW_ORBIT_CONFIG = {
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity,
  minPolarAngle: Math.PI * 0.12, // ~21.6 deg: high aerial overview without zenith gimbal flip
  maxPolarAngle: Math.PI * 0.495, // ~89.1 deg: horizon/eye-level view without dipping underground
  minDistance: 4.2,
  maxDistance: 36.0,
  panSpeed: 0.72,
  zoomSpeed: 0.85,
} as const;

export const OVERVIEW_TARGET_BOUNDS = {
  minX: -11.5,
  maxX: 11.5,
  minY: 0.65,
  maxY: 5.2,
  minZ: -17.5,
  maxZ: 8.5,
} as const;

/** Safety radius around perspective camera (near = 0.15m + FOV corner cushion) */
export const OVERVIEW_CAM_CLEARANCE = 0.52;
export const OVERVIEW_MIN_GROUND_Y = 0.88;

interface SolidBoxSpec {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  /** If true, low plinth/stair where camera should lift upward over surface */
  preferLiftOnly?: boolean;
}

interface CurvedRoofSpec {
  id: string;
  centerX: number;
  centerZ: number;
  baseY: number;
  /** If true, roof group is rotated Math.PI / 2 around Y in world space */
  rotated90: boolean;
  eaveHalfW: number;
  eaveHalfD: number;
  ridgeHalfW: number;
  topHalfD: number;
  height: number;
  cornerLift: number;
  withMainRidge: boolean;
  /** Minimum Y at which camera approaches roof slope rather than passing under eaves */
  skirtApproachMinY: number;
}

interface CylinderSpec {
  id: string;
  x: number;
  z: number;
  radius: number;
  maxY: number;
}

const SOLID_BOXES: readonly SolidBoxSpec[] = [
  // 1. Main Hall (大雄宝殿) solid interior & structural envelope
  {
    id: 'main-hall-body',
    minX: -7.45,
    maxX: 7.45,
    minY: 0,
    maxY: 5.55,
    minZ: -19.98,
    maxZ: -8.4,
  },
  // Main Hall upper neck beneath upper roof
  {
    id: 'main-hall-upper-neck',
    minX: -6.35,
    maxX: 6.35,
    minY: 5.55,
    maxY: 7.05,
    minZ: -18.6,
    maxZ: -9.7,
  },
  // Main Hall terrace & front stairs (low stone plinth)
  {
    id: 'main-terrace',
    minX: -6.65,
    maxX: 6.65,
    minY: 0,
    maxY: 0.72,
    minZ: -8.4,
    maxZ: -5.4,
    preferLiftOnly: true,
  },
  {
    id: 'main-terrace-stairs',
    minX: -2.35,
    maxX: 2.35,
    minY: 0,
    maxY: 0.65,
    minZ: -5.4,
    maxZ: -4.15,
    preferLiftOnly: true,
  },

  // 2. Left (West, -X) & Right (East, +X) Side Halls (东西偏殿)
  ...([-1, 1] as const).flatMap((sideSign): SolidBoxSpec[] => {
    const x1 = sideSign * 6.55;
    const x2 = sideSign * 13.3;
    const stairX1 = sideSign * 5.85;
    const stairX2 = sideSign * 6.6;
    return [
      {
        id: sideSign < 0 ? 'west-side-hall' : 'east-side-hall',
        minX: Math.min(x1, x2),
        maxX: Math.max(x1, x2),
        minY: 0,
        maxY: 3.92,
        minZ: -4.24,
        maxZ: 4.24,
      },
      {
        id: sideSign < 0 ? 'west-side-stairs' : 'east-side-stairs',
        minX: Math.min(stairX1, stairX2),
        maxX: Math.max(stairX1, stairX2),
        minY: 0,
        maxY: 0.38,
        minZ: -1.65,
        maxZ: 1.65,
        preferLiftOnly: true,
      },
    ];
  }),

  // 3. Covered Corridors & Corner Pavilions (回廊与角亭)
  ...([-1, 1] as const).flatMap((sideSign): SolidBoxSpec[] => {
    const cx1 = sideSign * 6.55;
    const cx2 = sideSign * 8.65;
    const ew1 = sideSign * 3.4;
    const ew2 = sideSign * 6.6;
    return [
      {
        id: sideSign < 0 ? 'nw-corridor' : 'ne-corridor',
        minX: Math.min(cx1, cx2),
        maxX: Math.max(cx1, cx2),
        minY: 0,
        maxY: 2.78,
        minZ: -8.4,
        maxZ: -4.2,
      },
      {
        id: sideSign < 0 ? 'sw-ns-corridor' : 'se-ns-corridor',
        minX: Math.min(cx1, cx2),
        maxX: Math.max(cx1, cx2),
        minY: 0,
        maxY: 2.78,
        minZ: 4.2,
        maxZ: 8.6,
      },
      {
        id: sideSign < 0 ? 'sw-corner-pavilion' : 'se-corner-pavilion',
        minX: Math.min(cx1, cx2),
        maxX: Math.max(cx1, cx2),
        minY: 0,
        maxY: 2.78,
        minZ: 8.6,
        maxZ: 10.6,
      },
      {
        id: sideSign < 0 ? 'sw-ew-corridor' : 'se-ew-corridor',
        minX: Math.min(ew1, ew2),
        maxX: Math.max(ew1, ew2),
        minY: 0,
        maxY: 2.78,
        minZ: 8.6,
        maxZ: 10.6,
      },
    ];
  }),

  // 4. South Gate (山门)
  {
    id: 'south-gate-body',
    minX: -3.44,
    maxX: 3.44,
    minY: 0,
    maxY: 3.4,
    minZ: 8.38,
    maxZ: 11.22,
  },
  {
    id: 'south-gate-steps',
    minX: -1.98,
    maxX: 1.98,
    minY: 0,
    maxY: 0.36,
    minZ: 7.62,
    maxZ: 8.42,
    preferLiftOnly: true,
  },

  // 5. Compound Perimeter Enclosure Walls (院墙)
  ...([-1, 1] as const).flatMap((sideSign): SolidBoxSpec[] => {
    const wx1 = sideSign * 8.45;
    const wx2 = sideSign * 8.95;
    const swx1 = sideSign * 3.35;
    const swx2 = sideSign * 8.78;
    const nwx1 = sideSign * 7.55;
    const nwx2 = sideSign * 8.85;
    return [
      {
        id: sideSign < 0 ? 'perimeter-west-north' : 'perimeter-east-north',
        minX: Math.min(wx1, wx2),
        maxX: Math.max(wx1, wx2),
        minY: 0,
        maxY: 2.82,
        minZ: -20.05,
        maxZ: -4.18,
      },
      {
        id: sideSign < 0 ? 'perimeter-west-south' : 'perimeter-east-south',
        minX: Math.min(wx1, wx2),
        maxX: Math.max(wx1, wx2),
        minY: 0,
        maxY: 2.82,
        minZ: 4.18,
        maxZ: 10.68,
      },
      {
        id: sideSign < 0 ? 'perimeter-south-west' : 'perimeter-south-east',
        minX: Math.min(swx1, swx2),
        maxX: Math.max(swx1, swx2),
        minY: 0,
        maxY: 2.82,
        minZ: 10.4,
        maxZ: 10.9,
      },
      {
        id: sideSign < 0 ? 'perimeter-north-west' : 'perimeter-north-east',
        minX: Math.min(nwx1, nwx2),
        maxX: Math.max(nwx1, nwx2),
        minY: 0,
        maxY: 2.82,
        minZ: -20.2,
        maxZ: -19.7,
      },
    ];
  }),
];

const CURVED_ROOFS: readonly CurvedRoofSpec[] = [
  // Main Hall Lower Eave Roof
  {
    id: 'main-lower-roof',
    centerX: 0,
    centerZ: -14.15,
    baseY: 5.49,
    rotated90: false,
    eaveHalfW: 8.15,
    eaveHalfD: 6.35,
    ridgeHalfW: 6.65,
    topHalfD: 4.65,
    height: 1.05,
    cornerLift: 0.3,
    withMainRidge: false,
    skirtApproachMinY: 4.95,
  },
  // Main Hall Upper Roof
  {
    id: 'main-upper-roof',
    centerX: 0,
    centerZ: -14.15,
    baseY: 6.95,
    rotated90: false,
    eaveHalfW: 7.65,
    eaveHalfD: 5.35,
    ridgeHalfW: 4.8,
    topHalfD: 0,
    height: 2.2,
    cornerLift: 0.36,
    withMainRidge: true,
    skirtApproachMinY: 6.35,
  },
  // Left & Right Side Hall Roofs (rotated 90 deg)
  ...([-1, 1] as const).map(
    (sideSign): CurvedRoofSpec => ({
      id: sideSign < 0 ? 'west-side-roof' : 'east-side-roof',
      centerX: sideSign * 9.88,
      centerZ: 0,
      baseY: 3.87,
      rotated90: true,
      eaveHalfW: 4.55,
      eaveHalfD: 3.62,
      ridgeHalfW: 2.95,
      topHalfD: 0,
      height: 1.65,
      cornerLift: 0.24,
      withMainRidge: true,
      skirtApproachMinY: 3.55,
    })
  ),
  // NW / NE Corridor Roofs (rotated 90 deg)
  ...([-1, 1] as const).map(
    (sideSign): CurvedRoofSpec => ({
      id: sideSign < 0 ? 'nw-corridor-roof' : 'ne-corridor-roof',
      centerX: sideSign * 7.6,
      centerZ: -6.18,
      baseY: 2.74,
      rotated90: true,
      eaveHalfW: 1.52,
      eaveHalfD: 1.32,
      ridgeHalfW: 1.2,
      topHalfD: 0,
      height: 0.72,
      cornerLift: 0.12,
      withMainRidge: true,
      skirtApproachMinY: 2.55,
    })
  ),
  // SW / SE N-S Corridor Roofs (rotated 90 deg)
  ...([-1, 1] as const).map(
    (sideSign): CurvedRoofSpec => ({
      id: sideSign < 0 ? 'sw-ns-corridor-roof' : 'se-ns-corridor-roof',
      centerX: sideSign * 7.6,
      centerZ: 6.4,
      baseY: 2.74,
      rotated90: true,
      eaveHalfW: 1.72,
      eaveHalfD: 1.3,
      ridgeHalfW: 1.35,
      topHalfD: 0,
      height: 0.72,
      cornerLift: 0.12,
      withMainRidge: true,
      skirtApproachMinY: 2.55,
    })
  ),
  // SW / SE Corner Pavilion Roofs
  ...([-1, 1] as const).map(
    (sideSign): CurvedRoofSpec => ({
      id: sideSign < 0 ? 'sw-corner-roof' : 'se-corner-roof',
      centerX: sideSign * 7.6,
      centerZ: 9.6,
      baseY: 2.74,
      rotated90: false,
      eaveHalfW: 1.24,
      eaveHalfD: 1.24,
      ridgeHalfW: 0.05,
      topHalfD: 0,
      height: 0.88,
      cornerLift: 0.16,
      withMainRidge: true,
      skirtApproachMinY: 2.55,
    })
  ),
  // South E-W Corridor Roofs
  ...([-1, 1] as const).map(
    (sideSign): CurvedRoofSpec => ({
      id: sideSign < 0 ? 'sw-ew-corridor-roof' : 'se-ew-corridor-roof',
      centerX: sideSign * 5.02,
      centerZ: 9.6,
      baseY: 2.74,
      rotated90: false,
      eaveHalfW: 1.15,
      eaveHalfD: 1.28,
      ridgeHalfW: 0.9,
      topHalfD: 0,
      height: 0.72,
      cornerLift: 0.12,
      withMainRidge: true,
      skirtApproachMinY: 2.55,
    })
  ),
  // South Gate Roof
  {
    id: 'south-gate-roof',
    centerX: 0,
    centerZ: 9.8,
    baseY: 3.37,
    rotated90: false,
    eaveHalfW: 3.75,
    eaveHalfD: 1.85,
    ridgeHalfW: 2.5,
    topHalfD: 0,
    height: 1.35,
    cornerLift: 0.24,
    withMainRidge: true,
    skirtApproachMinY: 3.12,
  },
];

const CYLINDER_OBSTACLES: readonly CylinderSpec[] = [
  { id: 'courtyard-lantern-west', x: -3.0, z: -4.25, radius: 0.4, maxY: 1.74 },
  { id: 'courtyard-lantern-east', x: 3.0, z: -4.25, radius: 0.4, maxY: 1.74 },
];

// Reusable scratch vectors (zero per-frame GC allocation)
const _segDelta = new THREE.Vector3();
const _stepStart = new THREE.Vector3();
const _stepEnd = new THREE.Vector3();
const _targetOffset = new THREE.Vector3();
const _defaultOffset = new THREE.Vector3();
const _curSpherical = new THREE.Spherical();
const _defSpherical = new THREE.Spherical();

function evalSpecRoofAt(
  spec: CurvedRoofSpec,
  worldX: number,
  worldZ: number,
  marginXZ: number
): {
  roofY: number;
  horizEdgeDist: number;
  dxEdgeSigned: number;
  dzEdgeSigned: number;
} | null {
  const dx = worldX - spec.centerX;
  const dz = worldZ - spec.centerZ;
  // For rotation.y = +PI/2: localX = -dz, localZ = dx (symmetric in abs)
  const lx = spec.rotated90 ? -dz : dx;
  const lz = spec.rotated90 ? dx : dz;
  const absLx = Math.abs(lx);
  const absLz = Math.abs(lz);

  const effHalfW = spec.eaveHalfW + marginXZ;
  const effHalfD = spec.eaveHalfD + marginXZ;
  if (absLx > effHalfW || absLz > effHalfD) {
    return null;
  }

  const clampedLx = Math.min(absLx, spec.eaveHalfW);
  const clampedLz = Math.min(absLz, spec.eaveHalfD);

  const overX = Math.max(0, absLx - spec.eaveHalfW);
  const overZ = Math.max(0, absLz - spec.eaveHalfD);
  const horizEdgeDist = Math.hypot(overX, overZ);
  if (horizEdgeDist >= marginXZ && marginXZ > 0) {
    return null;
  }

  const spanZ = Math.max(0.001, spec.eaveHalfD - spec.topHalfD);
  const sz =
    clampedLz <= spec.topHalfD ? 0 : (clampedLz - spec.topHalfD) / spanZ;

  const spanX = Math.max(0.001, spec.eaveHalfW - spec.ridgeHalfW);
  const sx =
    clampedLx <= spec.ridgeHalfW ? 0 : (clampedLx - spec.ridgeHalfW) / spanX;

  const s = Math.min(1, Math.max(sx, sz));
  let edgeU = 0;
  if (sx <= sz) {
    const halfRowW = Math.max(
      0.01,
      THREE.MathUtils.lerp(spec.ridgeHalfW, spec.eaveHalfW, s)
    );
    edgeU = Math.min(1, clampedLx / halfRowW);
  } else {
    const halfRowD = Math.max(
      0.01,
      THREE.MathUtils.lerp(spec.topHalfD, spec.eaveHalfD, s)
    );
    edgeU = Math.min(1, clampedLz / halfRowD);
  }

  const concave = spec.height * Math.pow(Math.max(0, 1 - s), 1.5);
  const cornerFactor = Math.pow(s, 2.2) * Math.pow(edgeU, 2.3);
  let y = spec.baseY + concave + spec.cornerLift * cornerFactor;

  if (spec.withMainRidge && s < 0.08) {
    y += spec.ridgeHalfW <= 0.12 ? 0.28 : 0.24;
  } else {
    y += 0.09;
  }

  // Signed edge outward vector in world XZ
  const lxOut = lx >= 0 ? overX : -overX;
  const lzOut = lz >= 0 ? overZ : -overZ;
  const dxEdgeSigned = spec.rotated90 ? lzOut : lxOut;
  const dzEdgeSigned = spec.rotated90 ? -lxOut : lzOut;

  return { roofY: y, horizEdgeDist, dxEdgeSigned, dzEdgeSigned };
}

function evalSpecRoofYAt(
  spec: CurvedRoofSpec,
  worldX: number,
  worldZ: number,
  marginXZ: number
): number | null {
  const hit = evalSpecRoofAt(spec, worldX, worldZ, marginXZ);
  return hit ? hit.roofY : null;
}

function resolveRoofSurfaceForPoint(
  pos: THREE.Vector3,
  pad: number
): boolean {
  let adjusted = false;
  for (let i = 0; i < CURVED_ROOFS.length; i++) {
    const roof = CURVED_ROOFS[i];
    const hit = evalSpecRoofAt(roof, pos.x, pos.z, pad);
    if (!hit || pos.y < roof.skirtApproachMinY) continue;

    const verticalPad = Math.sqrt(
      Math.max(0, pad * pad - hit.horizEdgeDist * hit.horizEdgeDist)
    );
    const safeTop = hit.roofY + verticalPad;
    if (pos.y < safeTop) {
      if (hit.horizEdgeDist > 0.08 && pos.y < hit.roofY - 0.04) {
        // Lateral eave graze: push outward horizontally instead of snapping Y up
        const scale = (pad + 0.002) / hit.horizEdgeDist;
        const need = scale - 1;
        pos.x += hit.dxEdgeSigned * need;
        pos.z += hit.dzEdgeSigned * need;
      } else {
        pos.y = safeTop;
      }
      adjusted = true;
    }
  }
  return adjusted;
}

/**
 * Evaluates the highest architectural roof surface Y at (x, z),
 * or null if (x, z) is not covered by any roof eave footprint.
 */
export function evaluateOverviewRoofTopY(
  x: number,
  z: number,
  marginXZ = 0
): number | null {
  let maxY: number | null = null;
  for (let i = 0; i < CURVED_ROOFS.length; i++) {
    const roofY = evalSpecRoofYAt(CURVED_ROOFS[i], x, z, marginXZ);
    if (roofY !== null && (maxY === null || roofY > maxY)) {
      maxY = roofY;
    }
  }
  return maxY;
}

/**
 * Clamps OrbitControls target inside the temple compound envelope so users
 * can pan across Main Hall, Side Halls, Corridors, and South Gate without
 * drifting into empty void.
 */
export function clampOverviewTarget(target: THREE.Vector3): boolean {
  const prevX = target.x;
  const prevY = target.y;
  const prevZ = target.z;
  target.x = THREE.MathUtils.clamp(
    target.x,
    OVERVIEW_TARGET_BOUNDS.minX,
    OVERVIEW_TARGET_BOUNDS.maxX
  );
  target.y = THREE.MathUtils.clamp(
    target.y,
    OVERVIEW_TARGET_BOUNDS.minY,
    OVERVIEW_TARGET_BOUNDS.maxY
  );
  target.z = THREE.MathUtils.clamp(
    target.z,
    OVERVIEW_TARGET_BOUNDS.minZ,
    OVERVIEW_TARGET_BOUNDS.maxZ
  );
  return (
    Math.abs(target.x - prevX) > 1e-6 ||
    Math.abs(target.y - prevY) > 1e-6 ||
    Math.abs(target.z - prevZ) > 1e-6
  );
}

/**
 * Tests segment [p0 -> p1] against an expanded AABB [bMin, bMax].
 * Returns earliest entry fraction t in [0, 1] and hit outward normal axis,
 * or null if segment misses or starts strictly inside.
 */
function intersectSegmentExpandedBox(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number
): { t: number; axis: 'x' | 'y' | 'z'; sign: number } | null {
  // Only sweep-resolve when p0 started outside or on boundary
  if (
    p0.x > minX &&
    p0.x < maxX &&
    p0.y > minY &&
    p0.y < maxY &&
    p0.z > minZ &&
    p0.z < maxZ
  ) {
    return null;
  }

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dz = p1.z - p0.z;

  let tMin = 0;
  let tMax = 1;
  let hitAxis: 'x' | 'y' | 'z' = 'x';
  let hitSign = 1;

  // X slab
  if (Math.abs(dx) < 1e-8) {
    if (p0.x <= minX || p0.x >= maxX) return null;
  } else {
    const inv = 1 / dx;
    let t1 = (minX - p0.x) * inv;
    let t2 = (maxX - p0.x) * inv;
    let s = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      s = 1;
    }
    if (t1 > tMin) {
      tMin = t1;
      hitAxis = 'x';
      hitSign = s;
    }
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return null;
  }

  // Y slab
  if (Math.abs(dy) < 1e-8) {
    if (p0.y <= minY || p0.y >= maxY) return null;
  } else {
    const inv = 1 / dy;
    let t1 = (minY - p0.y) * inv;
    let t2 = (maxY - p0.y) * inv;
    let s = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      s = 1;
    }
    if (t1 > tMin) {
      tMin = t1;
      hitAxis = 'y';
      hitSign = s;
    }
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return null;
  }

  // Z slab
  if (Math.abs(dz) < 1e-8) {
    if (p0.z <= minZ || p0.z >= maxZ) return null;
  } else {
    const inv = 1 / dz;
    let t1 = (minZ - p0.z) * inv;
    let t2 = (maxZ - p0.z) * inv;
    let s = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      s = 1;
    }
    if (t1 > tMin) {
      tMin = t1;
      hitAxis = 'z';
      hitSign = s;
    }
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return null;
  }

  if (tMin < 0 || tMin > 1) return null;
  return { t: tMin, axis: hitAxis, sign: hitSign };
}

function depenetrateSingleBox(
  pos: THREE.Vector3,
  prevSafePos: THREE.Vector3,
  box: SolidBoxSpec,
  pad: number
): boolean {
  const minX = box.minX - pad;
  const maxX = box.maxX + pad;
  const minY = box.minY - pad;
  const maxY = box.maxY + pad;
  const minZ = box.minZ - pad;
  const maxZ = box.maxZ + pad;

  if (
    pos.x <= minX ||
    pos.x >= maxX ||
    pos.y <= minY ||
    pos.y >= maxY ||
    pos.z <= minZ ||
    pos.z >= maxZ
  ) {
    return false;
  }

  if (box.preferLiftOnly) {
    pos.y = Math.max(pos.y, maxY + 0.002);
    return true;
  }

  // Check if camera is skimming near top of low wall/corridor/building
  const distTop = maxY - pos.y;
  if (distTop <= 0.72 && prevSafePos.y >= box.maxY - 0.15) {
    pos.y = maxY + 0.002;
    return true;
  }

  const dLeft = pos.x - minX;
  const dRight = maxX - pos.x;
  const dBack = pos.z - minZ;
  const dFront = maxZ - pos.z;

  // Prefer horizontal exit closest to prevSafePos to avoid corner flipping
  let bestAxis: 'x' | 'z' | 'y' = 'x';
  let bestVal = minX - 0.002;
  let bestCost = dLeft + Math.abs(minX - prevSafePos.x) * 0.25;

  const costRight = dRight + Math.abs(maxX - prevSafePos.x) * 0.25;
  if (costRight < bestCost) {
    bestCost = costRight;
    bestAxis = 'x';
    bestVal = maxX + 0.002;
  }

  const costBack = dBack + Math.abs(minZ - prevSafePos.z) * 0.25;
  if (costBack < bestCost) {
    bestCost = costBack;
    bestAxis = 'z';
    bestVal = minZ - 0.002;
  }

  const costFront = dFront + Math.abs(maxZ - prevSafePos.z) * 0.25;
  if (costFront < bestCost) {
    bestCost = costFront;
    bestAxis = 'z';
    bestVal = maxZ + 0.002;
  }

  const costTop = distTop + Math.abs(maxY - prevSafePos.y) * 0.25;
  if (costTop < bestCost) {
    bestAxis = 'y';
    bestVal = maxY + 0.002;
  }

  if (bestAxis === 'x') pos.x = bestVal;
  else if (bestAxis === 'z') pos.z = bestVal;
  else pos.y = bestVal;

  return true;
}

function resolveSingleStep(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  pad: number
) {
  // 1. Minimum ground clearance
  if (p1.y < OVERVIEW_MIN_GROUND_Y) {
    p1.y = OVERVIEW_MIN_GROUND_Y;
  }

  // 2. Curved roof slope smooth glide (prevents roof penetration without snapping)
  resolveRoofSurfaceForPoint(p1, pad);

  // 3. Swept-segment face slide against solid building bodies & walls
  for (let pass = 0; pass < 3; pass++) {
    let earliestT = 2;
    let earliestBox: SolidBoxSpec | null = null;
    let earliestAxis: 'x' | 'y' | 'z' = 'x';
    let earliestSign = 1;

    for (let i = 0; i < SOLID_BOXES.length; i++) {
      const box = SOLID_BOXES[i];
      if (box.preferLiftOnly) continue;
      const hit = intersectSegmentExpandedBox(
        p0,
        p1,
        box.minX - pad,
        box.maxX + pad,
        box.minY - pad,
        box.maxY + pad,
        box.minZ - pad,
        box.maxZ + pad
      );
      if (hit && hit.t < earliestT) {
        earliestT = hit.t;
        earliestBox = box;
        earliestAxis = hit.axis;
        earliestSign = hit.sign;
      }
    }

    if (!earliestBox) break;

    if (earliestAxis === 'x') {
      p1.x =
        earliestSign < 0
          ? earliestBox.minX - pad - 0.002
          : earliestBox.maxX + pad + 0.002;
    } else if (earliestAxis === 'y') {
      p1.y =
        earliestSign < 0
          ? earliestBox.minY - pad - 0.002
          : earliestBox.maxY + pad + 0.002;
    } else {
      p1.z =
        earliestSign < 0
          ? earliestBox.minZ - pad - 0.002
          : earliestBox.maxZ + pad + 0.002;
    }
  }

  // 4. Multi-pass point depenetration for corners, plinths, and roof skirts
  for (let iter = 0; iter < 4; iter++) {
    let anyAdjusted = false;
    for (let i = 0; i < SOLID_BOXES.length; i++) {
      if (depenetrateSingleBox(p1, p0, SOLID_BOXES[i], pad)) {
        anyAdjusted = true;
      }
    }
    // Re-check roof envelopes after horizontal/box push
    if (resolveRoofSurfaceForPoint(p1, pad)) {
      anyAdjusted = true;
    }
    if (!anyAdjusted) break;
  }

  // 5. Courtyard stone lanterns (cylindrical)
  for (let i = 0; i < CYLINDER_OBSTACLES.length; i++) {
    const cyl = CYLINDER_OBSTACLES[i];
    if (p1.y >= cyl.maxY + pad) continue;
    const dx = p1.x - cyl.x;
    const dz = p1.z - cyl.z;
    const minR = cyl.radius + pad;
    const distSq = dx * dx + dz * dz;
    if (distSq < minR * minR) {
      if (p1.y >= cyl.maxY - 0.25 && p0.y >= cyl.maxY - 0.1) {
        p1.y = cyl.maxY + pad + 0.002;
      } else {
        const dist = Math.sqrt(distSq);
        if (dist > 1e-5) {
          const scale = (minR + 0.002) / dist;
          p1.x = cyl.x + dx * scale;
          p1.z = cyl.z + dz * scale;
        } else {
          p1.z = cyl.z + minR + 0.002;
        }
      }
    }
  }

  if (p1.y < OVERVIEW_MIN_GROUND_Y) {
    p1.y = OVERVIEW_MIN_GROUND_Y;
  }
}

/**
 * Checks whether a given world-space camera point (with optional clearance radius)
 * penetrates any solid temple architecture, roof, lantern, or ground.
 */
export function isOverviewCameraColliding(
  pos: THREE.Vector3,
  pad = OVERVIEW_CAM_CLEARANCE * 0.9
): boolean {
  if (pos.y < OVERVIEW_MIN_GROUND_Y - 0.02) return true;

  for (let i = 0; i < SOLID_BOXES.length; i++) {
    const b = SOLID_BOXES[i];
    if (
      pos.x > b.minX - pad &&
      pos.x < b.maxX + pad &&
      pos.y > b.minY - pad &&
      pos.y < b.maxY + pad &&
      pos.z > b.minZ - pad &&
      pos.z < b.maxZ + pad
    ) {
      return true;
    }
  }

  for (let i = 0; i < CURVED_ROOFS.length; i++) {
    const roof = CURVED_ROOFS[i];
    const hit = evalSpecRoofAt(roof, pos.x, pos.z, pad);
    if (!hit || pos.y < roof.skirtApproachMinY) continue;
    const verticalPad = Math.sqrt(
      Math.max(0, pad * pad - hit.horizEdgeDist * hit.horizEdgeDist)
    );
    if (pos.y < hit.roofY + verticalPad) {
      return true;
    }
  }

  for (let i = 0; i < CYLINDER_OBSTACLES.length; i++) {
    const cyl = CYLINDER_OBSTACLES[i];
    if (pos.y < cyl.maxY + pad) {
      const dx = pos.x - cyl.x;
      const dz = pos.z - cyl.z;
      if (dx * dx + dz * dz < (cyl.radius + pad) * (cyl.radius + pad)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves camera position safely outside all architectural bodies, roofs, walls,
 * lanterns, and ground using multi-substep swept sliding from `prevSafePos`.
 * Also prevents OrbitControls `minDistance` fighting when panned adjacent to a facade.
 *
 * Returns true if `cameraPos` or `target` was modified.
 */
export function resolveOverviewCameraPosition(
  cameraPos: THREE.Vector3,
  prevSafePos: THREE.Vector3,
  target: THREE.Vector3,
  minDistance: number = OVERVIEW_ORBIT_CONFIG.minDistance
): boolean {
  const startCamX = cameraPos.x;
  const startCamY = cameraPos.y;
  const startCamZ = cameraPos.z;
  const startTgtX = target.x;
  const startTgtY = target.y;
  const startTgtZ = target.z;

  clampOverviewTarget(target);

  _segDelta.copy(cameraPos).sub(prevSafePos);
  const segLen = _segDelta.length();
  const substeps = Math.min(8, Math.max(1, Math.ceil(segLen / 0.45)));

  _stepStart.copy(prevSafePos);
  for (let s = 1; s <= substeps; s++) {
    const frac = s / substeps;
    _stepEnd.copy(prevSafePos).addScaledVector(_segDelta, frac);
    resolveSingleStep(_stepStart, _stepEnd, OVERVIEW_CAM_CLEARANCE);
    _stepStart.copy(_stepEnd);
  }
  cameraPos.copy(_stepStart);

  // Prevent OrbitControls minDistance push-back oscillation if camera is pressed against a facade
  _targetOffset.copy(cameraPos).sub(target);
  const currentDist = _targetOffset.length();
  if (currentDist > 1e-4 && currentDist < minDistance - 0.02) {
    const deficit = minDistance - currentDist;
    _targetOffset.divideScalar(currentDist); // unit vector target -> camera
    // Shift target slightly opposite camera direction, clamped safely within target bounds
    target.addScaledVector(_targetOffset, -deficit);
    clampOverviewTarget(target);
  }

  return (
    Math.abs(cameraPos.x - startCamX) > 1e-4 ||
    Math.abs(cameraPos.y - startCamY) > 1e-4 ||
    Math.abs(cameraPos.z - startCamZ) > 1e-4 ||
    Math.abs(target.x - startTgtX) > 1e-4 ||
    Math.abs(target.y - startTgtY) > 1e-4 ||
    Math.abs(target.z - startTgtZ) > 1e-4
  );
}

/**
 * Smoothly returns camera and target to the South Gate Courtyard default view
 * using spherical azimuth/polar/radius interpolation around the target so
 * resetting from 180° behind the Main Hall sweeps gracefully around the exterior
 * rather than cutting straight through the Main Hall interior.
 */
export function stepResetCameraSpherical(
  cameraPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  defaultCamPos: THREE.Vector3,
  defaultTargetPos: THREE.Vector3,
  prevSafePos: THREE.Vector3,
  lambda: number,
  delta: number,
  instant: boolean
): boolean {
  if (instant) {
    targetPos.copy(defaultTargetPos);
    cameraPos.copy(defaultCamPos);
    prevSafePos.copy(defaultCamPos);
    return true;
  }

  targetPos.x = THREE.MathUtils.damp(targetPos.x, defaultTargetPos.x, lambda, delta);
  targetPos.y = THREE.MathUtils.damp(targetPos.y, defaultTargetPos.y, lambda, delta);
  targetPos.z = THREE.MathUtils.damp(targetPos.z, defaultTargetPos.z, lambda, delta);

  _targetOffset.copy(cameraPos).sub(targetPos);
  _curSpherical.setFromVector3(_targetOffset);

  _defaultOffset.copy(defaultCamPos).sub(defaultTargetPos);
  _defSpherical.setFromVector3(_defaultOffset);

  // Shortest signed angular delta across +-PI wraparound
  let dTheta = _defSpherical.theta - _curSpherical.theta;
  while (dTheta > Math.PI) dTheta -= Math.PI * 2;
  while (dTheta < -Math.PI) dTheta += Math.PI * 2;

  const targetTheta = _curSpherical.theta + dTheta;
  _curSpherical.theta = THREE.MathUtils.damp(
    _curSpherical.theta,
    targetTheta,
    lambda,
    delta
  );
  _curSpherical.phi = THREE.MathUtils.damp(
    _curSpherical.phi,
    _defSpherical.phi,
    lambda,
    delta
  );
  _curSpherical.radius = THREE.MathUtils.damp(
    _curSpherical.radius,
    _defSpherical.radius,
    lambda,
    delta
  );

  _targetOffset.setFromSpherical(_curSpherical);
  cameraPos.copy(targetPos).add(_targetOffset);
  resolveOverviewCameraPosition(
    cameraPos,
    prevSafePos,
    targetPos,
    OVERVIEW_ORBIT_CONFIG.minDistance
  );
  prevSafePos.copy(cameraPos);

  const distCam = cameraPos.distanceTo(defaultCamPos);
  const distTarget = targetPos.distanceTo(defaultTargetPos);
  if (distCam < 0.02 && distTarget < 0.02) {
    targetPos.copy(defaultTargetPos);
    cameraPos.copy(defaultCamPos);
    prevSafePos.copy(defaultCamPos);
    return true;
  }

  return false;
}

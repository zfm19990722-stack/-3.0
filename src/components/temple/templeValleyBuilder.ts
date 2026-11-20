import * as THREE from 'three';

export interface ValleyBuildResult {
  group: THREE.Group;
  sampleTerrainHeight: (x: number, z: number) => number;
}

/**
 * Courtyard & Overview Camera Bounds mirrored as read-only constants from
 * templeCourtyardBuilder.ts & templeOverviewCamera.ts so valley terrain adapts
 * strictly around the temple without modifying protected architecture or camera code.
 */
const TEMPLE_FLOOR_BOUNDS = {
  minX: -13.9,
  maxX: 13.9,
  minZ: -20.6,
  maxZ: 12.0,
} as const;

const CAMERA_TARGET_ENVELOPE = {
  minX: -11.5,
  maxX: 11.5,
  minZ: -17.5,
  maxZ: 8.5,
  /** maxDistance (36.0m) + clearance (0.52m) + near/safety margin (2.08m) */
  safeHorizontalRadius: 38.6,
} as const;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function smoothMax(a: number, b: number, k = 4.5): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

function smoothMin(a: number, b: number, k = 0.22): number {
  if (k <= 1e-5) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function gaussianLobe(
  x: number,
  z: number,
  cx: number,
  cz: number,
  rx: number,
  rz: number,
  height: number
): number {
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  const d2 = dx * dx + dz * dz;
  if (d2 > 9) return 0;
  return height * Math.exp(-d2);
}

/**
 * Horizontal distance from world (x, z) to the Overview camera target bounds rectangle.
 * Since OrbitControls maxDistance = 36.0m, any point with dist >= 38.6m is strictly
 * outside the permitted Overview camera movement volume.
 */
export function distanceToOverviewTargetEnvelope(x: number, z: number): number {
  const dx = Math.max(
    CAMERA_TARGET_ENVELOPE.minX - x,
    0,
    x - CAMERA_TARGET_ENVELOPE.maxX
  );
  const dz = Math.max(
    CAMERA_TARGET_ENVELOPE.minZ - z,
    0,
    z - CAMERA_TARGET_ENVELOPE.maxZ
  );
  return Math.hypot(dx, dz);
}

/**
 * Evaluates the continuous Jiangnan Mountain Valley terrain height Y at world (x, z):
 * - Under courtyard footprint: -0.095m (cleanly beneath courtyardFloor bottom -0.08m)
 * - Inside Overview camera envelope (dCam < 38.6m): low gentle earth swells <= +0.36m
 *   plus subtle south creek swale depression (~ -0.26m) -> always >= 0.50m below camera min Y (0.88m)
 * - Outside Overview camera envelope:
 *   - North (Xuanwu, -Z): layered rounded backdrop mountains (Y up to ~29.5m)
 *   - East (Qinglong, +X): gently rising rolling hills (Y up to ~17.0m)
 *   - West (Baihu, -X): lower, quieter hills (Y up to ~11.0m)
 *   - South (Zhuque, +Z): open low valley floor & reserved creek/path foreground
 */
export function evalValleyHeight(x: number, z: number): number {
  // 1. Courtyard apron depression so ground never pokes through or Z-fights courtyard paving
  const dxFloor = Math.max(
    TEMPLE_FLOOR_BOUNDS.minX - x,
    0,
    x - TEMPLE_FLOOR_BOUNDS.maxX
  );
  const dzFloor = Math.max(
    TEMPLE_FLOOR_BOUNDS.minZ - z,
    0,
    z - TEMPLE_FLOOR_BOUNDS.maxZ
  );
  const distToFloor = Math.hypot(dxFloor, dzFloor);
  if (distToFloor === 0) {
    return -0.095;
  }

  // Smooth ground rise from courtyard edge (-0.095m) up to 0.00m over 1.35m skirt
  const apronBlend = smoothstep(0.0, 1.35, distToFloor);

  // 2. Subtle near-valley floor contour (kept strictly <= +0.36m inside camera envelope)
  const eastSideBias =
    smoothstep(14.5, 42.0, x) *
    (1 - smoothstep(10.0, 34.0, Math.abs(z + 2.0))) *
    0.3;
  const westSideBias =
    smoothstep(-14.5, -42.0, x) *
    (1 - smoothstep(10.0, 34.0, Math.abs(z + 2.0))) *
    0.18;
  const microUndulation =
    (Math.sin(x * 0.085) * Math.cos(z * 0.075) * 0.055 +
      Math.sin((x + z) * 0.045) * 0.038) *
    smoothstep(1.2, 10.0, distToFloor);

  // 2B. N1-B1-V1.4 Reshaped South Creek, Mossy Banks & Independent East Pond
  // Asymmetric organic S-curve (~51m dominant wavelength, ~4.35m lateral swing)
  const creekCenterZ =
    27.4 +
    4.05 * Math.sin(x * 0.123 + 0.16) +
    0.72 * Math.sin(x * 0.058 - 0.85) +
    0.34 * Math.cos(x * 0.215 + 0.65);

  // Derivative dZ/dX keeps true perpendicular stream width & bank slope even on bends
  const dCenterZdX =
    4.05 * 0.123 * Math.cos(x * 0.123 + 0.16) +
    0.72 * 0.058 * Math.cos(x * 0.058 - 0.85) -
    0.34 * 0.215 * Math.sin(x * 0.215 + 0.65);
  const normalScale = Math.min(1.32, Math.hypot(1, dCenterZdX));

  // Gentle natural width modulation along stream (narrower riffles vs slightly softer bends)
  const widthFactor =
    1.0 +
    0.09 * Math.sin(x * 0.23 + 0.4) +
    0.06 * Math.cos(x * 0.13 - 0.9);
  const absDn = Math.abs(z - creekCenterZ) / (widthFactor * normalScale);

  const creekEastWestFade = 1 - smoothstep(35.0, 48.0, Math.abs(x));

  // Gentle bank terrace across south foreground (strictly fades in for Z > 18.8 so
  // SouthGateArrivalPad Z≈15.4-16.8 and gate apron Z<=18.8 stay untouched)
  const southBankMask =
    smoothstep(18.8, 22.0, z) *
    (1 - smoothstep(46.0, 66.0, z)) *
    (1 - smoothstep(38.0, 56.0, Math.abs(x)));
  // Keep future South Gate -> Bridge approach slightly gentler around |X| < 3.5
  const bridgeShoulderRelief =
    1 - 0.28 * (1 - smoothstep(2.0, 5.5, Math.abs(x))) * (1 - smoothstep(22.0, 27.0, z));

  // V1.5A: Low, soft natural south-east earthen enclosure framing the quiet East Pond
  // (+0.16m..+0.24m crest outside south rim, dipping naturally so it never looks like a dike)
  const seEnclosureBand =
    smoothstep(6.8, 10.5, x) *
    (1 - smoothstep(22.5, 26.8, x)) *
    smoothstep(34.6, 38.0, z) *
    (1 - smoothstep(41.8, 48.0, z));
  const seNaturalSwell =
    0.108 +
    0.036 * Math.sin((x - 10.2) * 0.44 + 0.25) +
    0.022 * Math.cos((z - 38.0) * 0.65 - x * 0.12);
  const eastPondSouthEnclosure = seEnclosureBand * Math.max(0.035, seNaturalSwell);

  const bankTerrace =
    (0.155 + 0.032 * Math.sin(x * 0.095 + z * 0.07)) *
      southBankMask *
      bridgeShoulderRelief +
    eastPondSouthEnclosure;

  // Channel profile: rounded streambed rising cleanly over 13-20 deg banks
  const channelWallT = 1 - smoothstep(0.68, 2.82, absDn);
  const channelBedDepth = 0.59 + 0.04 * Math.cos(x * 0.19 - 0.5);
  const creekCarve = -channelBedDepth * channelWallT * creekEastWestFade;

  // V1.5A Independent Quiet East Pond basin (~15.5m x 11.5m, organic asymmetric belly, ~47cm deep)
  // Soft domain warp avoids artificial ellipse silhouette while preserving C1 continuity
  const warpX = 0.52 * Math.sin(z * 0.34 - 0.6) + 0.28 * Math.cos(x * 0.24);
  const warpZ =
    0.36 * Math.sin(x * 0.29 + 0.8) + 0.2 * Math.cos((x - z) * 0.22);

  // Main tranquil pond belly skewed gently south-east of stream centerline
  const pondDx = (x - 15.0 + warpX * 0.5) / 7.5;
  const pondDz = (z - 31.35 + warpZ * 0.55) / 6.12;
  const pondR2 = pondDx * pondDx + pondDz * pondDz;
  const pondMainLobe = pondR2 < 4.5 ? Math.exp(-pondR2 * 0.92) : 0;

  // Gradual west-mouth flare (X≈6.5..12.0) so main creek widens smoothly into the pond
  const westMouthDx = (x - 10.1 + warpX * 0.3) / 4.7;
  const westMouthDz = (z - 30.8 + warpZ * 0.3) / 4.1;
  const westMouthR2 = westMouthDx * westMouthDx + westMouthDz * westMouthDz;
  const westMouthLobe = westMouthR2 < 4.2 ? Math.exp(-westMouthR2 * 0.96) * 0.72 : 0;

  // Long, gentle east-outlet taper (X≈18.5..24.5) so pond narrows softly without X=22-23 pinching
  const eastTailDx = (x - 20.55 + warpX * 0.3) / 4.75;
  const eastTailDz = (z - 30.18 + warpZ * 0.3) / 3.55;
  const eastTailR2 = eastTailDx * eastTailDx + eastTailDz * eastTailDz;
  const eastTailLobe = eastTailR2 < 4.2 ? Math.exp(-eastTailR2 * 0.96) * 0.62 : 0;

  // Smooth C1 union of the three asymmetric lobes (never hard max cusps)
  const pondRaw = smoothMax(
    pondMainLobe,
    smoothMax(westMouthLobe, eastTailLobe, 0.22),
    0.24
  );
  const pondShape =
    pondRaw * (1 + 0.045 * Math.sin(x * 0.27 + z * 0.23));
  const pondIntensity = THREE.MathUtils.clamp(pondShape, 0, 1.18);
  // Deepens tranquil center to ~ -0.578m (~47.3cm water depth) with soft shallow shore shelves
  const pondCarve = -0.702 * smoothstep(0.05, 0.92, pondIntensity);

  // Localized C1 smoothMin strictly scoped to the East Pond corridor (zero side-effect on bridge/upstream)
  const pondBlendK =
    0.25 *
    smoothstep(4.2, 7.2, x) *
    (1 - smoothstep(24.0, 28.0, x)) *
    smoothstep(22.0, 25.0, z) *
    (1 - smoothstep(37.5, 40.5, z));
  const totalCarve = smoothMin(creekCarve, pondCarve, pondBlendK);

  const nearFloorY = THREE.MathUtils.clamp(
    eastSideBias + westSideBias + microUndulation + bankTerrace + totalCarve,
    -0.6,
    0.34
  );

  // 3. Outer mountain & hill envelope (strictly gated outside Overview camera volume)
  const distToCamEnv = distanceToOverviewTargetEnvelope(x, z);
  const outerMountainGate = smoothstep(
    CAMERA_TARGET_ENVELOPE.safeHorizontalRadius,
    CAMERA_TARGET_ENVELOPE.safeHorizontalRadius + 16.0,
    distToCamEnv
  );

  // Keep Southern Zhuque valley corridor wide open (|X| < 48m, Z > +12m stays low)
  const southOpenCorridor =
    smoothstep(12.0, 36.0, z) * (1 - smoothstep(46.0, 68.0, Math.abs(x)));
  const mountainMask = outerMountainGate * (1 - southOpenCorridor * 0.96);

  let macroElevation = 0;
  if (mountainMask > 0.001) {
    // 3A. North — Xuanwu layered, rounded mountain backdrop (-Z)
    // Near foothills framing side views of Main Hall
    const xuanwuNearLeft = gaussianLobe(x, z, -30, -64, 24, 15, 13.5);
    const xuanwuNearRight = gaussianLobe(x, z, 32, -63, 25, 15, 14.5);
    const xuanwuNearLayer = smoothMax(xuanwuNearLeft, xuanwuNearRight, 3.5);

    // Mid rounded range gently rising above the 9.15m Main Hall ridge sightline (~23m)
    const xuanwuMidCenter = gaussianLobe(x, z, -6, -82, 34, 18, 25.5);
    const xuanwuMidEast = gaussianLobe(x, z, 38, -81, 28, 18, 21.5);
    const xuanwuMidWest = gaussianLobe(x, z, -42, -84, 30, 18, 18.5);
    const xuanwuMidLayer = smoothMax(
      xuanwuMidCenter,
      smoothMax(xuanwuMidEast, xuanwuMidWest, 4.0),
      4.0
    );

    // Deep northern backdrop crest (~29m)
    const xuanwuDeepPeak = gaussianLobe(x, z, 10, -104, 46, 22, 28.5);
    const xuanwuDeepWingW = gaussianLobe(x, z, -64, -101, 36, 22, 20.5);
    const xuanwuDeepWingE = gaussianLobe(x, z, 68, -98, 38, 22, 23.5);
    const xuanwuDeepLayer = smoothMax(
      xuanwuDeepPeak,
      smoothMax(xuanwuDeepWingW, xuanwuDeepWingE, 4.5),
      4.5
    );

    const xuanwuRidge = smoothMax(
      xuanwuNearLayer,
      smoothMax(xuanwuMidLayer, xuanwuDeepLayer, 4.5),
      4.0
    );

    // 3B. East — Qinglong gentle higher hills (+X, ~13–17m crest)
    const qinglongNorth = gaussianLobe(x, z, 72, -38, 26, 24, 15.8);
    const qinglongMid = gaussianLobe(x, z, 76, -8, 24, 24, 13.8);
    const qinglongSouthShoulder = gaussianLobe(x, z, 72, 20, 22, 20, 8.8);
    const qinglongOuter = gaussianLobe(x, z, 108, -22, 32, 36, 16.5);
    const qinglongRidge = smoothMax(
      smoothMax(qinglongNorth, qinglongMid, 3.5),
      smoothMax(qinglongSouthShoulder, qinglongOuter, 3.5),
      3.5
    );

    // 3C. West — Baihu lower, quieter hills (-X, ~7–11m crest)
    const baihuNorth = gaussianLobe(x, z, -70, -40, 25, 22, 9.8);
    const baihuMid = gaussianLobe(x, z, -74, -8, 24, 24, 8.0);
    const baihuSouthKnoll = gaussianLobe(x, z, -68, 18, 22, 19, 4.8);
    const baihuOuter = gaussianLobe(x, z, -106, -24, 32, 34, 10.4);
    const baihuRidge = smoothMax(
      smoothMax(baihuNorth, baihuMid, 3.0),
      smoothMax(baihuSouthKnoll, baihuOuter, 3.0),
      3.0
    );

    // Subtle organic hillside rolling rhythm (keeps silhouettes rounded, never jagged)
    const hillTextureWave =
      1 +
      0.045 * Math.sin(x * 0.055 + z * 0.04) +
      0.03 * Math.cos(x * 0.09 - z * 0.07);

    const rawHills = smoothMax(
      xuanwuRidge,
      smoothMax(qinglongRidge, baihuRidge, 3.0),
      4.0
    );

    macroElevation = rawHills * hillTextureWave * mountainMask;
  }

  const baseTransition = THREE.MathUtils.lerp(-0.095, nearFloorY, apronBlend);
  return baseTransition + macroElevation;
}

const COLOR_VERGE = new THREE.Color(0x747360); // Warm mossy earth near courtyard
const COLOR_BED_DEEP = new THREE.Color(0x26312e); // Deep quiet cyan-slate pond & streambed
const COLOR_BED_SHALLOW = new THREE.Color(0x566059); // Natural blue-grey shallow gravel bed
const COLOR_WET_BANK = new THREE.Color(0x3c4335); // Tight damp moss-mud shoreline rim
const COLOR_MEADOW_LOW = new THREE.Color(0x6b7b52); // Natural Jiangnan dry moss & grass slope
const COLOR_HILL_MID = new THREE.Color(0x4c5e4a); // Restrained Jiangnan forest green
const COLOR_RIDGE_HIGH = new THREE.Color(0x5b6e68); // Muted blue-green ridge
const COLOR_DISTANT_MIST = new THREE.Color(0x73837e); // Lighter desaturated mountain blue-green
const COLOR_SILHOUETTE_BASE = new THREE.Color(0x5e706b);
const COLOR_SILHOUETTE_PEAK = new THREE.Color(0x7b8a86);
const _tmpColor = new THREE.Color();

function computeTerrainVertexColor(
  x: number,
  y: number,
  z: number,
  target: THREE.Color
) {
  // South creek & pond 4-layer stratification:
  // 1) Deep bed (y < -0.14..-0.38) -> 2) Shallow bed (y < -0.105)
  // 3) Tight wet shoreline rim (y ∈ [-0.105, -0.045]) -> 4) Dry moss grass (y >= +0.025)
  // Organic shorelineJitter modulates color lookup only (never terrain vertex height).
  if (z > 18.2 && y < 0.08) {
    const shorelineJitter =
      (Math.sin(x * 0.95 + z * 0.72) * 0.55 +
        Math.cos(x * 1.63 - z * 1.31) * 0.45) *
      0.008;
    const lookupY = y + shorelineJitter;
    const microTone =
      (Math.sin(x * 0.62 - z * 0.54) + Math.cos(x * 0.37 + z * 0.49)) * 0.011;

    if (lookupY < -0.105) {
      const deepT = smoothstep(-0.14, -0.38, lookupY);
      target.lerpColors(COLOR_BED_SHALLOW, COLOR_BED_DEEP, deepT);
      target.offsetHSL(0, 0, microTone * 0.45);
      return;
    }
    if (lookupY < -0.045) {
      const rimT = smoothstep(-0.105, -0.055, lookupY);
      target.lerpColors(COLOR_BED_SHALLOW, COLOR_WET_BANK, rimT);
      target.offsetHSL(0, -0.006, microTone * 0.65);
      return;
    }
    const dryT = smoothstep(-0.045, 0.025, lookupY);
    target.lerpColors(COLOR_WET_BANK, COLOR_MEADOW_LOW, dryT);
    const nBank =
      (Math.sin(x * 0.18 + z * 0.14) + Math.cos(x * 0.1 - z * 0.16)) * 0.014;
    target.offsetHSL(0, -0.008 * dryT, nBank * dryT + microTone * 0.55);
    return;
  }

  if (y < -0.06) {
    target.copy(COLOR_BED_SHALLOW);
    return;
  }

  if (y < 0.8) {
    const t = smoothstep(-0.05, 0.8, y);
    const southBankBlend = smoothstep(18.2, 20.5, z);
    _tmpColor.lerpColors(COLOR_VERGE, COLOR_MEADOW_LOW, southBankBlend);
    target.lerpColors(_tmpColor, COLOR_MEADOW_LOW, t);
  } else if (y < 9.5) {
    const t = smoothstep(0.8, 9.5, y);
    target.lerpColors(COLOR_MEADOW_LOW, COLOR_HILL_MID, t);
  } else if (y < 21.0) {
    const t = smoothstep(9.5, 21.0, y);
    target.lerpColors(COLOR_HILL_MID, COLOR_RIDGE_HIGH, t);
  } else {
    const t = smoothstep(21.0, 31.0, y);
    target.lerpColors(COLOR_RIDGE_HIGH, COLOR_DISTANT_MIST, t);
  }

  // Soft distance desaturation toward horizon for atmospheric perspective
  const radial = Math.hypot(x, z + 5);
  const distFade = smoothstep(55, 140, radial) * 0.42;
  target.lerp(COLOR_DISTANT_MIST, distFade);

  // Subtle organic tonal variation so slopes do not read as flat plastic
  const n =
    (Math.sin(x * 0.14 + z * 0.11) + Math.cos(x * 0.08 - z * 0.17)) * 0.025;
  target.offsetHSL(0, -0.015, n);
}

/**
 * Builds an independent low-detail distant Xuanwu background ridge silhouette
 * behind the main heightfield (Z ∈ [-106, -138]) so northern mountains frame
 * the Main Hall roofline with atmospheric depth while keeping camera space clear.
 */
function buildDistantXuanwuSilhouette(material: THREE.Material): THREE.Mesh {
  const segU = 64;
  const segV = 8;
  const cols = segU + 1;
  const rows = segV + 1;

  const positions = new Float32Array(cols * rows * 3);
  const colors = new Float32Array(cols * rows * 3);
  const indices: number[] = [];

  for (let iv = 0; iv < rows; iv++) {
    const v = iv / segV; // 0 = front skirt, 1 = far back base
    for (let iu = 0; iu < cols; iu++) {
      const u = iu / segU; // 0..1 spanning West -> North -> East arc
      const angle = THREE.MathUtils.lerp(-Math.PI * 0.56, Math.PI * 0.56, u);
      const radius = THREE.MathUtils.lerp(106, 136, v);
      const x = Math.sin(angle) * radius * 1.18;
      const z = -10 - Math.cos(angle) * radius;

      // Smooth rounded crest at v ≈ 0.5, tapering cleanly to Y = -1.5 at front/back skirts
      const profile = Math.sin(v * Math.PI);
      const northFocus = Math.pow(Math.max(0, Math.cos(angle * 0.85)), 1.25);
      const ridgeWave =
        28.5 +
        4.5 * Math.cos(angle * 3.1 - 0.35) +
        3.0 * Math.sin(angle * 5.8 + 0.9) +
        1.5 * Math.cos(angle * 9.0);
      // Slight east bias matching Qinglong > Baihu asymmetry
      const eastBias = x > 0 ? 1.05 : 0.93;
      const y = -1.5 + profile * northFocus * ridgeWave * eastBias;

      const idx = iv * cols + iu;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      const altT = THREE.MathUtils.clamp((y - 2) / 34, 0, 1);
      _tmpColor.lerpColors(COLOR_SILHOUETTE_BASE, COLOR_SILHOUETTE_PEAK, altT);
      colors[idx * 3] = _tmpColor.r;
      colors[idx * 3 + 1] = _tmpColor.g;
      colors[idx * 3 + 2] = _tmpColor.b;
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * cols + iu;
      const b = a + 1;
      const c = (iv + 1) * cols + iu;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'temple-valley-distant-xuanwu-ridge';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Builds monotonically increasing axis coordinates concentrating ~0.68m x 0.95m
 * triangle resolution inside the south creek & pond corridor while keeping outer
 * valleys and mountains lightweight (~23k verts total, zero seam T-junctions).
 */
function buildNonUniformAxis(
  zones: { start: number; end: number; step: number }[]
): number[] {
  const coords: number[] = [];
  zones.forEach((zone, zIdx) => {
    const segs = Math.max(1, Math.round((zone.end - zone.start) / zone.step));
    const iStart = zIdx === 0 ? 0 : 1;
    for (let i = iStart; i <= segs; i++) {
      coords.push(zone.start + ((zone.end - zone.start) * i) / segs);
    }
  });
  return coords;
}

/**
 * Generates a lightweight seamless 256x256 near-white moss/earth micro-grain
 * CanvasTexture so valleyMat breaks up smooth shoreline gradients without
 * darkening terrain vertex colors or introducing visible repeat seams.
 */
function createTerrainMossGrainTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#eff1ec';
  ctx.fillRect(0, 0, size, size);

  const colors = ['#e2e6dc', '#f5f6f1', '#e5e1d7', '#dde2d6'];
  for (let i = 0; i < 1400; i++) {
    const x = ((i * 89 + (i % 19) * 23) % size + size) % size;
    const y = ((i * 53 + (i % 29) * 17) % size + size) % size;
    const rx = 2.0 + (i % 5) * 1.1;
    const ry = 1.6 + (i % 4) * 0.9;
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.08 + (i % 5) * 0.028;

    // Wrap across periodic tile boundaries for zero repeat seams
    for (let ox = -size; ox <= size; ox += size) {
      const px = x + ox;
      if (px + rx < 0 || px - rx > size) continue;
      for (let oy = -size; oy <= size; oy += size) {
        const py = y + oy;
        if (py + ry < 0 || py - ry > size) continue;
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, (i % 7) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(95, 91);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Constructs the Phase 2C.1 / N1-B1-V1.4 Jiangnan Mountain Valley terrain:
 * - Single contiguous rectilinear heightfield (X ∈ [-170,+170], Z ∈ [-150,+175])
 *   with local south-creek enrichment (~0.95m X × ~0.68m Z) and coarse outer hills
 * - Secondary distant northern Xuanwu mountain silhouette ribbon
 */
export function buildTempleValley(): ValleyBuildResult {
  const group = new THREE.Group();
  group.name = 'temple-jiangnan-valley-blockout';

  const xCoords = buildNonUniformAxis([
    { start: -170, end: -48, step: 4.0 },
    { start: -48, end: 46, step: 0.95 },
    { start: 46, end: 170, step: 4.0 },
  ]);
  const zCoords = buildNonUniformAxis([
    { start: -150, end: 12, step: 3.2 },
    { start: 12, end: 18, step: 1.5 },
    { start: 18, end: 42, step: 0.65 },
    { start: 42, end: 175, step: 3.4 },
  ]);

  const cols = xCoords.length;
  const rows = zCoords.length;
  const vertexCount = cols * rows;

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  for (let iz = 0; iz < rows; iz++) {
    const vz = zCoords[iz];
    const vUv = 1 - (vz + 150) / 325;
    for (let ix = 0; ix < cols; ix++) {
      const vx = xCoords[ix];
      const vy = evalValleyHeight(vx, vz);
      const idx = iz * cols + ix;

      positions[idx * 3] = vx;
      positions[idx * 3 + 1] = vy;
      positions[idx * 3 + 2] = vz;

      uvs[idx * 2] = (vx + 170) / 340;
      uvs[idx * 2 + 1] = vUv;

      computeTerrainVertexColor(vx, vy, vz, _tmpColor);
      colors[idx * 3] = _tmpColor.r;
      colors[idx * 3 + 1] = _tmpColor.g;
      colors[idx * 3 + 2] = _tmpColor.b;
    }
  }

  for (let iz = 0; iz < rows - 1; iz++) {
    for (let ix = 0; ix < cols - 1; ix++) {
      const a = iz * cols + ix;
      const b = a + 1;
      const c = (iz + 1) * cols + ix;
      const d = c + 1;
      // Upward +Y normal winding matching PlaneGeometry rotated -PI/2
      indices.push(a, c, b, b, c, d);
    }
  }

  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  terrainGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.setIndex(indices);
  terrainGeo.computeVertexNormals();
  terrainGeo.computeBoundingBox();
  terrainGeo.computeBoundingSphere();

  const valleyGrainTex = createTerrainMossGrainTexture();
  const valleyMat = new THREE.MeshStandardMaterial({
    map: valleyGrainTex,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.01,
    envMapIntensity: 0.35,
  });
  valleyMat.addEventListener('dispose', () => {
    valleyGrainTex.dispose();
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, valleyMat);
  terrainMesh.name = 'temple-valley-terrain-mesh';
  terrainMesh.castShadow = false;
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  const distantMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0.0,
    envMapIntensity: 0.25,
  });
  const distantRidge = buildDistantXuanwuSilhouette(distantMat);
  group.add(distantRidge);

  return {
    group,
    sampleTerrainHeight: evalValleyHeight,
  };
}

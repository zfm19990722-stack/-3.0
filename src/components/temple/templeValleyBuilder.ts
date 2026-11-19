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
    0.34;
  const westSideBias =
    smoothstep(-14.5, -42.0, x) *
    (1 - smoothstep(10.0, 34.0, Math.abs(z + 2.0))) *
    0.2;
  const microUndulation =
    (Math.sin(x * 0.085) * Math.cos(z * 0.075) * 0.07 +
      Math.sin((x + z) * 0.045) * 0.05) *
    smoothstep(1.2, 10.0, distToFloor);

  // Subtle reserved South Gate approach & Zhuque creek swale (Z ≈ +22..+33, gently curved)
  const creekCenterZ = 27.5 + Math.sin(x * 0.065) * 3.2;
  const creekBand = 1 - smoothstep(1.8, 6.2, Math.abs(z - creekCenterZ));
  const creekEastWestFade = 1 - smoothstep(32.0, 56.0, Math.abs(x));
  const pondLobe = gaussianLobe(x, z, 7.5, 29.0, 8.5, 5.2, 1.0);
  const southGatePathFlat =
    1 -
    smoothstep(2.8, 6.5, Math.abs(x)) *
      (1 - smoothstep(12.0, 21.5, z));
  const creekDepression =
    -0.24 *
    Math.max(creekBand * creekEastWestFade, pondLobe * 0.95) *
    (1 - 0.65 * (1 - southGatePathFlat) * smoothstep(12.0, 19.5, z));

  const nearFloorY = THREE.MathUtils.clamp(
    eastSideBias + westSideBias + microUndulation + creekDepression,
    -0.28,
    0.36
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
const COLOR_CREEK_BED = new THREE.Color(0x645f50); // Damp riverbed slate-earth
const COLOR_MEADOW_LOW = new THREE.Color(0x616d52); // Muted moss green
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
  if (y < -0.06) {
    target.copy(COLOR_CREEK_BED);
    return;
  }

  if (y < 0.8) {
    const t = smoothstep(-0.05, 0.8, y);
    target.lerpColors(COLOR_VERGE, COLOR_MEADOW_LOW, t);
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
 * Constructs the Phase 2C.1 Jiangnan Mountain Valley terrain & spatial blockout:
 * - Single contiguous low-poly heightfield (340m × 325m, X ∈ [-170,+170], Z ∈ [-150,+175])
 *   extending far beyond max orbit extremes into atmospheric fog
 * - Secondary distant northern Xuanwu mountain silhouette ribbon
 * - Zero trees, bamboo, water, bridges, or rocks (reserved cleanly for Phase 2C.2+)
 */
export function buildTempleValley(): ValleyBuildResult {
  const group = new THREE.Group();
  group.name = 'temple-jiangnan-valley-blockout';

  const width = 340;
  const depth = 325;
  const centerZ = 12.5;
  const segX = 136;
  const segZ = 130;

  const terrainGeo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, centerZ);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const vertexCount = posAttr.count;
  const colors = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = evalValleyHeight(vx, vz);
    posAttr.setY(i, vy);

    computeTerrainVertexColor(vx, vy, vz, _tmpColor);
    colors[i * 3] = _tmpColor.r;
    colors[i * 3 + 1] = _tmpColor.g;
    colors[i * 3 + 2] = _tmpColor.b;
  }

  posAttr.needsUpdate = true;
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  terrainGeo.computeBoundingBox();
  terrainGeo.computeBoundingSphere();

  const valleyMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.01,
    envMapIntensity: 0.35,
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

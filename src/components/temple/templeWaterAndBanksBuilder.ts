import * as THREE from 'three';

/**
 * N1-B1: South Creek, East Pond Water Surface & Natural Jiangnan Stone Banks
 *
 * Calibrated strictly against the actual triangulated valley heightfield
 * (`PlaneGeometry(340, 325, 136, 130)` in templeValleyBuilder.ts):
 * - Water surface elevation: Y = -0.105m (0.010m below courtyard under-floor -0.095m,
 *   0.130m below SouthGateArrivalPad +0.025m; zero dry-land leaks in Z < 19.5m).
 * - Connected wet basin extent at Y = -0.105m: X in [-45.0, +43.2], Z in [20.5, 35.6].
 * - Future South Gate -> Stone Bridge axis (X in [-2.55, +2.55], Z in [16.5, 36.0])
 *   kept completely free of above-water bank boulders.
 */

export const TEMPLE_CREEK_WATER_Y = -0.105;

export interface WaterContourSample {
  x: number;
  zNorth: number;
  zSouth: number;
  width: number;
  minBedY: number;
  maxDepth: number;
}

export interface TempleWaterAndBanksBuildResult {
  group: THREE.Group;
  waterMaterial: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  materials: THREE.Material[];
  contourSamples: WaterContourSample[];
  stats: {
    waterVertices: number;
    waterTriangles: number;
    bankBoulderCount: number;
    shoreCobbleCount: number;
    submergedPebbleCount: number;
  };
  updateWaterEnvironment: (
    nightFactor: number,
    elapsedSec: number,
    allowMotion: boolean
  ) => void;
}

const DAY_WATER_MODULATE = new THREE.Color(0xffffff);
const NIGHT_WATER_MODULATE = new THREE.Color(0x648c9c);
const DAY_WATER_EMISSIVE = new THREE.Color(0x081718);
const NIGHT_WATER_EMISSIVE = new THREE.Color(0x163846);

const COLOR_SHORE_WATER = new THREE.Color(0x5c897f);
const COLOR_MID_WATER = new THREE.Color(0x2f5a52);
const COLOR_DEEP_POND = new THREE.Color(0x153538);
const _tmpWaterColor = new THREE.Color();

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Deterministic hash in [0, 1) for natural non-random layout reproducibility.
 */
function seeded01(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Binary-searches sorted grid coordinates for the enclosing segment index.
 */
function findGridInterval(coords: number[], value: number): number {
  let lo = 0;
  let hi = coords.length - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (value < coords[mid]) {
      hi = mid - 1;
    } else if (value > coords[mid + 1]) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }
  return Math.max(0, Math.min(coords.length - 2, lo));
}

/**
 * Creates an exact O(log N) evaluator matching the actual triangulated rectilinear
 * grid (uniform or non-uniform) of `temple-valley-terrain-mesh`, ensuring water
 * contours and stone grounding stay synced to rendered triangles down to float32 precision.
 */
export function createTerrainMeshHeightSampler(
  valleyGroup: THREE.Group
): (x: number, z: number) => number {
  const mesh = valleyGroup.getObjectByName(
    'temple-valley-terrain-mesh'
  ) as THREE.Mesh | null;
  if (!mesh) {
    return () => 0;
  }

  const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const count = posAttr.count;
  if (count < 4) {
    return () => 0;
  }

  // Infer grid dimensions directly from the first row where Z stays constant
  const z0 = posAttr.getZ(0);
  let cols = count;
  for (let i = 1; i < count; i++) {
    if (Math.abs(posAttr.getZ(i) - z0) > 1e-4) {
      cols = i;
      break;
    }
  }
  const rows = Math.floor(count / cols);
  if (cols < 2 || rows < 2) {
    return () => 0;
  }

  const xCoords = new Array<number>(cols);
  for (let ix = 0; ix < cols; ix++) {
    xCoords[ix] = posAttr.getX(ix);
  }
  const zCoords = new Array<number>(rows);
  for (let iz = 0; iz < rows; iz++) {
    zCoords[iz] = posAttr.getZ(iz * cols);
  }

  return (x: number, z: number): number => {
    const ix = findGridInterval(xCoords, x);
    const iz = findGridInterval(zCoords, z);
    const dx = Math.max(1e-6, xCoords[ix + 1] - xCoords[ix]);
    const dz = Math.max(1e-6, zCoords[iz + 1] - zCoords[iz]);
    const fx = THREE.MathUtils.clamp((x - xCoords[ix]) / dx, 0, 1);
    const fz = THREE.MathUtils.clamp((z - zCoords[iz]) / dz, 0, 1);

    const yA = posAttr.getY(iz * cols + ix);
    const yB = posAttr.getY(iz * cols + ix + 1);
    const yC = posAttr.getY((iz + 1) * cols + ix);
    const yD = posAttr.getY((iz + 1) * cols + ix + 1);

    if (fx + fz <= 1) {
      return yA + fx * (yB - yA) + fz * (yC - yA);
    }
    return yD + (1 - fx) * (yC - yD) + (1 - fz) * (yB - yD);
  };
}

/**
 * Generates a subtle, tileable tangent-space micro-ripple normal texture
 * (Linear NoColorSpace) so still mountain water catches soft sky highlights
 * without stylized noise or harsh waves.
 */
function createCalmWaterNormalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const twoPi = Math.PI * 2;
  for (let py = 0; py < size; py++) {
    const v = py / size;
    for (let px = 0; px < size; px++) {
      const u = px / size;
      // Superposition of calm elongated stream ripples (tileable integer harmonics)
      const dhdu =
        0.28 * Math.cos(twoPi * (u * 2 + v * 3)) +
        0.18 * Math.cos(twoPi * (u * 5 - v * 2 + 0.3)) +
        0.12 * Math.sin(twoPi * (u * 7 + v * 5 + 0.7));
      const dhdv =
        0.34 * Math.cos(twoPi * (v * 4 + u * 1 + 0.15)) +
        0.22 * Math.sin(twoPi * (v * 6 - u * 3 + 0.4)) +
        0.14 * Math.cos(twoPi * (v * 9 + u * 4));

      const nx = -dhdu * 0.22;
      const ny = -dhdv * 0.28;
      const nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);

      const idx = (py * size + px) * 4;
      data[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 2.5);
  return tex;
}

/**
 * Generates a continuous equirectangular outdoor sky + distant Jiangnan mountain
 * environment map dedicated exclusively to water specular & Fresnel reflections,
 * eliminating the harsh rectangular studio lightboxes from RoomEnvironment.
 */
function createOutdoorWaterEnvTexture(): THREE.CanvasTexture {
  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  // Palette in normalized sRGB [0..1], calibrated for clear sky-ridge-mountain reflection hierarchy
  const zenithR = 155 / 255; // #9bb4c4
  const zenithG = 180 / 255;
  const zenithB = 196 / 255;

  const skyR = 214 / 255; // #d6e3e6
  const skyG = 227 / 255;
  const skyB = 230 / 255;

  const mistR = 194 / 255; // #c2d2cf
  const mistG = 210 / 255;
  const mistB = 207 / 255;

  const farMtnR = 122 / 255; // #7a908a (distant hazy ridge behind foreground ridge)
  const farMtnG = 144 / 255;
  const farMtnB = 138 / 255;

  const mtnR = 60 / 255; // #3c514b (calm Jiangnan cyan-slate mountain reflection)
  const mtnG = 81 / 255;
  const mtnB = 75 / 255;

  const basinR = 44 / 255; // #2c3e38
  const basinG = 62 / 255;
  const basinB = 56 / 255;

  const nadirR = 34 / 255; // #22312c
  const nadirG = 49 / 255;
  const nadirB = 44 / 255;

  const twoPi = Math.PI * 2;
  for (let py = 0; py < height; py++) {
    const v = py / (height - 1); // 0 = zenith, 0.5 = horizon, 1 = nadir
    for (let px = 0; px < width; px++) {
      const u = px / width;
      const theta = u * twoPi;

      // Primary rolling ridge centered around v ≈ 0.435 (elev ~7°..16°) so both
      // Overview and near-bank pond views span bright sky, misty far ridge & dark mountain silhouette
      const ridgeOffset =
        0.017 * Math.sin(theta * 2 + 0.4) +
        0.011 * Math.cos(theta * 3 - 1.1) +
        0.006 * Math.sin(theta * 5 + 2.0);
      const ridgeV = 0.435 + ridgeOffset;

      const farRidgeOffset =
        0.014 * Math.cos(theta * 2 - 0.8) +
        0.009 * Math.sin(theta * 4 + 1.4);
      const farRidgeV = ridgeV - 0.032 + farRidgeOffset * 0.5;

      let r = skyR;
      let g = skyG;
      let b = skyB;

      if (v < farRidgeV) {
        // Upper sky hemisphere: zenith -> bright sky -> misty horizon glow
        const skyT = THREE.MathUtils.clamp(v / Math.max(farRidgeV, 0.01), 0, 1);
        if (skyT < 0.58) {
          const t = smoothstep(0, 0.58, skyT);
          r = THREE.MathUtils.lerp(zenithR, skyR, t);
          g = THREE.MathUtils.lerp(zenithG, skyG, t);
          b = THREE.MathUtils.lerp(zenithB, skyB, t);
        } else {
          const t = smoothstep(0.58, 1.0, skyT);
          r = THREE.MathUtils.lerp(skyR, mistR, t);
          g = THREE.MathUtils.lerp(skyG, mistG, t);
          b = THREE.MathUtils.lerp(skyB, mistB, t);
        }

        // Broad atmospheric southern sky warmth (zero hard edges/boxes)
        const sunAzimuthDist = Math.cos(theta - 2.1);
        const softGlow =
          Math.pow(Math.max(0, sunAzimuthDist * 0.5 + 0.5), 3) *
          smoothstep(0.08, 0.5, skyT) *
          0.065;
        r = Math.min(0.96, r + softGlow * 0.9);
        g = Math.min(0.97, g + softGlow * 0.86);
        b = Math.min(0.97, b + softGlow * 0.75);
      } else if (v < ridgeV) {
        // Distant mist-veiled secondary range bridging sky into primary ridge
        const farBlend = smoothstep(farRidgeV, farRidgeV + 0.018, v);
        r = THREE.MathUtils.lerp(mistR, farMtnR, farBlend);
        g = THREE.MathUtils.lerp(mistG, farMtnG, farBlend);
        b = THREE.MathUtils.lerp(mistB, farMtnB, farBlend);
      } else if (v < 0.56) {
        // Primary mountain silhouette band fading smoothly into dark valley basin
        const mtnBlend = smoothstep(ridgeV, ridgeV + 0.024, v);
        const valleyBlend = smoothstep(ridgeV + 0.032, 0.56, v);
        r = THREE.MathUtils.lerp(farMtnR, mtnR, mtnBlend);
        g = THREE.MathUtils.lerp(farMtnG, mtnG, mtnBlend);
        b = THREE.MathUtils.lerp(farMtnB, mtnB, mtnBlend);

        r = THREE.MathUtils.lerp(r, basinR, valleyBlend);
        g = THREE.MathUtils.lerp(g, basinG, valleyBlend);
        b = THREE.MathUtils.lerp(b, basinB, valleyBlend);
      } else {
        // Lower shaded valley & bank bounce
        const lowT = smoothstep(0.56, 1.0, v);
        r = THREE.MathUtils.lerp(basinR, nadirR, lowT);
        g = THREE.MathUtils.lerp(basinG, nadirG, lowT);
        b = THREE.MathUtils.lerp(basinB, nadirB, lowT);
      }

      const idx = (py * width + px) * 4;
      data[idx] = Math.round(THREE.MathUtils.clamp(r, 0, 1) * 255);
      data[idx + 1] = Math.round(THREE.MathUtils.clamp(g, 0, 1) * 255);
      data[idx + 2] = Math.round(THREE.MathUtils.clamp(b, 0, 1) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural Jiangnan blue-grey creek stone texture calibrated at balanced slate
 * (#c2c6c1) so multiplying with instance palettes preserves mid blue-grey stone detail.
 */
function createCreekStoneTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c2c6c1';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 650; i++) {
    const x = (i * 73 + (i % 13) * 19) % size;
    const y = (i * 41 + (i % 17) * 11) % size;
    const w = 4 + (i % 18);
    const h = 2 + (i % 7);
    ctx.fillStyle = i % 3 === 0 ? '#a6aca7' : i % 3 === 1 ? '#cfd3cd' : '#b2b9ae';
    ctx.globalAlpha = 0.08 + (i % 4) * 0.03;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Generates a soft radial RGBA contact-shadow texture local to water & banks
 * so stone contact shadows remain subtle and cleanly disposed without dark halos.
 */
function createBoulderContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.5
  );
  grad.addColorStop(0, 'rgba(38, 35, 32, 0.42)');
  grad.addColorStop(0.55, 'rgba(38, 35, 32, 0.14)');
  grad.addColorStop(1, 'rgba(38, 35, 32, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds an organic river stone / boulder BufferGeometry by subtly sculpting
 * a subdivided polyhedron with layered cosine strata, flattened resting base,
 * and optional damp root darkening vertex colors (y <= -0.04 -> ~0.76 -> 1.0 at y > 0.09).
 */
function buildSculptedStoneGeometry(
  detail: number,
  flatness: number,
  angularity: number,
  seedOffset: number,
  applyWetRootDarkening = false
): THREE.BufferGeometry {
  const baseGeo = new THREE.IcosahedronGeometry(0.5, detail);
  const pos = baseGeo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const colors = applyWetRootDarkening ? new Float32Array(pos.count * 3) : null;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();
    const strata =
      Math.cos(dir.x * 3.4 + seedOffset) *
        Math.sin(dir.z * 2.9 - seedOffset * 0.7) *
        angularity +
      Math.sin(dir.y * 4.7 + dir.x * 2.1 + seedOffset * 1.3) *
        (angularity * 0.55);
    const radialScale = 1.0 + strata;
    v.multiplyScalar(radialScale);

    // Gently flatten underside so stones embed cleanly without awkward tilt
    v.y *= flatness;
    if (v.y < 0) {
      v.y *= 0.65;
    }
    pos.setXYZ(i, v.x, v.y, v.z);

    if (colors) {
      const rootT = smoothstep(-0.04, 0.09, v.y);
      const mul = THREE.MathUtils.lerp(0.76, 1.0, rootT);
      colors[i * 3] = mul;
      colors[i * 3 + 1] = mul;
      colors[i * 3 + 2] = mul;
    }
  }

  pos.needsUpdate = true;
  if (colors) {
    baseGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  baseGeo.computeVertexNormals();
  baseGeo.computeBoundingSphere();
  return baseGeo;
}

/**
 * Samples the real terrain mesh height along each X cross-section to extract
 * exact north/south wet shoreline Z coordinates where `terrainMeshY == waterY`.
 */
function sampleWaterBasinContours(
  sampleTerrainY: (x: number, z: number) => number,
  waterY: number
): WaterContourSample[] {
  const samples: WaterContourSample[] = [];
  const xStart = -44.0;
  const xEnd = 42.5;
  const stepX = 0.35;
  const zScanStep = 0.04;

  const findCrossingZ = (zDry: number, zWet: number): number => {
    let a = zDry;
    let b = zWet;
    for (let iter = 0; iter < 8; iter++) {
      const m = 0.5 * (a + b);
      if (sampleTerrainY(currentX, m) < waterY) {
        b = m;
      } else {
        a = m;
      }
    }
    return 0.5 * (a + b);
  };

  let currentX = 0;
  for (let x = xStart; x <= xEnd + 1e-4; x += stepX) {
    currentX = Math.min(x, xEnd);
    let zNorthWet = Infinity;
    let zSouthWet = -Infinity;
    let minBedY = Infinity;

    for (let z = 18.8; z <= 39.5; z += zScanStep) {
      const y = sampleTerrainY(currentX, z);
      if (y < minBedY) minBedY = y;
      if (y < waterY) {
        if (z < zNorthWet) zNorthWet = z;
        if (z > zSouthWet) zSouthWet = z;
      }
    }

    if (zNorthWet < Infinity && zSouthWet > zNorthWet) {
      const zNorth = findCrossingZ(zNorthWet - zScanStep, zNorthWet);
      const zSouth = findCrossingZ(zSouthWet + zScanStep, zSouthWet);
      samples.push({
        x: currentX,
        zNorth,
        zSouth,
        width: zSouth - zNorth,
        minBedY,
        maxDepth: Math.max(0, waterY - minBedY),
      });
    }
  }

  return samples;
}

/**
 * Builds the contour-fitted creek & pond water surface BufferGeometry.
 * Edge vertices tuck ~0.07m horizontally beneath the surrounding upward terrain slope
 * with RGBA vertex alpha smoothly tapering to 0.0 right at the real intersection line,
 * guaranteeing zero floating edges, zero out-of-band leaks, and zero Z-fighting.
 */
function buildContourWaterGeometry(
  contours: WaterContourSample[],
  sampleTerrainY: (x: number, z: number) => number,
  waterY: number
): THREE.BufferGeometry {
  const crossRows = 15; // indices 0..14 across stream from North bank to South bank
  const cols = contours.length;
  const totalVerts = cols * crossRows;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const colors = new Float32Array(totalVerts * 4);
  const indices: number[] = [];

  // Slightly non-uniform cross-stream u so shore alpha transition has finer rings
  const crossUValues = [
    0.0, 0.04, 0.1, 0.18, 0.28, 0.39, 0.5, 0.61, 0.72, 0.82, 0.9, 0.96, 1.0,
  ];
  const rowCount = crossUValues.length;
  const realPositions = new Float32Array(cols * rowCount * 3);
  const realNormals = new Float32Array(cols * rowCount * 3);
  const realUvs = new Float32Array(cols * rowCount * 2);
  const realColors = new Float32Array(cols * rowCount * 4);
  const pondMasks = new Float32Array(cols * rowCount);

  const firstX = contours[0].x;
  const lastX = contours[cols - 1].x;
  let uAccum = 0;

  for (let ic = 0; ic < cols; ic++) {
    const c = contours[ic];
    // Broader, calmer surface UV & stillness mask across the secluded East Pond belly
    const pondCalm =
      smoothstep(6.2, 10.5, c.x) * (1 - smoothstep(19.5, 24.0, c.x));
    const uFreq = THREE.MathUtils.lerp(1.0, 0.4, pondCalm);
    const vFreq = THREE.MathUtils.lerp(1.0, 0.45, pondCalm);
    if (ic > 0) {
      uAccum += (c.x - contours[ic - 1].x) * 0.08 * uFreq;
    }

    const endFade =
      smoothstep(firstX, firstX + 1.1, c.x) *
      smoothstep(lastX, lastX - 1.0, c.x);
    const shoreTuck = 0.075 * endFade;
    const zMin = c.zNorth - shoreTuck;
    const zMax = c.zSouth + shoreTuck;

    for (let ir = 0; ir < rowCount; ir++) {
      const u = crossUValues[ir];
      const vz = THREE.MathUtils.lerp(zMin, zMax, u);
      const bedY = sampleTerrainY(c.x, vz);
      const depth = Math.max(0, waterY - bedY);

      const idx = ic * rowCount + ir;
      realPositions[idx * 3] = c.x;
      realPositions[idx * 3 + 1] = waterY;
      realPositions[idx * 3 + 2] = vz;

      realNormals[idx * 3] = 0;
      realNormals[idx * 3 + 1] = 1;
      realNormals[idx * 3 + 2] = 0;

      realUvs[idx * 2] = uAccum;
      realUvs[idx * 2 + 1] = (vz - 20.0) * 0.12 * vFreq;
      pondMasks[idx] = pondCalm;

      // Color gradient from clear shallow shore to serene deep cyan-indigo pond (0..0.42m depth)
      if (depth < 0.15) {
        const t = smoothstep(0.0, 0.15, depth);
        _tmpWaterColor.lerpColors(COLOR_SHORE_WATER, COLOR_MID_WATER, t);
      } else {
        const t = smoothstep(0.15, 0.36, depth);
        _tmpWaterColor.lerpColors(COLOR_MID_WATER, COLOR_DEEP_POND, t);
      }

      // 4-layer translucency curve:
      // crisp shallow shore contour (0..0.05m -> 0.22),
      // mid channel 0.22-0.50, deep pond capped at 0.72 (deep still pool without solid opacity)
      const shallowAlpha = smoothstep(0.0, 0.05, depth) * 0.22;
      const midAlpha = smoothstep(0.05, 0.22, depth) * 0.28;
      const deepAlpha = smoothstep(0.22, 0.42, depth) * 0.22;
      const edgePinchMask = ir === 0 || ir === rowCount - 1 ? 0 : 1;
      const alpha =
        (shallowAlpha + midAlpha + deepAlpha) * endFade * edgePinchMask;

      realColors[idx * 4] = _tmpWaterColor.r;
      realColors[idx * 4 + 1] = _tmpWaterColor.g;
      realColors[idx * 4 + 2] = _tmpWaterColor.b;
      realColors[idx * 4 + 3] = THREE.MathUtils.clamp(alpha, 0, 0.72);
    }
  }

  for (let ic = 0; ic < cols - 1; ic++) {
    for (let ir = 0; ir < rowCount - 1; ir++) {
      const a = ic * rowCount + ir;
      const b = (ic + 1) * rowCount + ir;
      const c = ic * rowCount + (ir + 1);
      const d = (ic + 1) * rowCount + (ir + 1);
      // Upward +Y normal winding
      indices.push(a, c, b, b, c, d);
    }
  }

  // Silence unused buffer vars above by using real* directly
  void positions;
  void normals;
  void uvs;
  void colors;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(realPositions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(realNormals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(realUvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(realColors, 4));
  geo.setAttribute('aPondMask', new THREE.BufferAttribute(pondMasks, 1));
  geo.setIndex(indices);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Constructs N1-B1 South Creek, East Pond & Natural Jiangnan Stone Banks.
 */
export function buildTempleWaterAndBanks(
  valleyGroup: THREE.Group,
  maxAnisotropy = 4
): TempleWaterAndBanksBuildResult {
  const group = new THREE.Group();
  group.name = 'temple-south-creek-and-banks';

  const sampleTerrainY = createTerrainMeshHeightSampler(valleyGroup);
  const contourSamples = sampleWaterBasinContours(
    sampleTerrainY,
    TEMPLE_CREEK_WATER_Y
  );

  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  // -------------------------------------------------------------------------
  // 1. WATER SURFACE (Contour-Fitted Basin, Dedicated Outdoor Sky-Mountain Env)
  // -------------------------------------------------------------------------
  const waterNormalTex = createCalmWaterNormalTexture();
  waterNormalTex.anisotropy = Math.min(maxAnisotropy, 4);
  textures.push(waterNormalTex);

  const outdoorWaterEnvTex = createOutdoorWaterEnvTexture();
  textures.push(outdoorWaterEnvTex);

  const waterGeo = buildContourWaterGeometry(
    contourSamples,
    sampleTerrainY,
    TEMPLE_CREEK_WATER_Y
  );

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: DAY_WATER_MODULATE.clone(),
    emissive: DAY_WATER_EMISSIVE.clone(),
    emissiveIntensity: 0.08,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    roughness: 0.115,
    metalness: 0.04,
    envMap: outdoorWaterEnvTex,
    envMapIntensity: 0.86,
    normalMap: waterNormalTex,
    normalScale: new THREE.Vector2(0.075, 0.075),
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  waterMaterial.customProgramCacheKey = () => 'temple-water-pond-v15b1';
  waterMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader =
      'attribute float aPondMask;\nvarying float vPondMask;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vPondMask = aPondMask;'
      );
    shader.fragmentShader =
      'varying float vPondMask;\n' +
      shader.fragmentShader
        .replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.052, clamp(vPondMask, 0.0, 1.0));'
        )
        .replace(
          '#include <normal_fragment_maps>',
          '#include <normal_fragment_maps>\n  normal = normalize(mix(normal, nonPerturbedNormal, 0.65 * clamp(vPondMask, 0.0, 1.0)));'
        );
  };
  materials.push(waterMaterial);

  const waterMesh = new THREE.Mesh(waterGeo, waterMaterial);
  waterMesh.name = 'temple-south-creek-water-surface';
  waterMesh.castShadow = false;
  waterMesh.receiveShadow = true;
  waterMesh.renderOrder = 2;
  group.add(waterMesh);

  // -------------------------------------------------------------------------
  // 2. NATURAL JIANGNAN BANK BOULDERS, SHORE COBBLES & SUBMERGED PEBBLES
  // -------------------------------------------------------------------------
  const stoneTex = createCreekStoneTexture();
  stoneTex.anisotropy = Math.min(maxAnisotropy, 4);
  textures.push(stoneTex);

  // Bind boulders & cobbles to outdoorWaterEnvTex + softened damp-root vertexColors
  // so stones read as balanced mid-tone blue-grey rock with natural facet shading.
  const bankBoulderMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.02,
    envMap: outdoorWaterEnvTex,
    envMapIntensity: 0.34,
  });

  const shoreCobbleMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.52,
    metalness: 0.04,
    envMap: outdoorWaterEnvTex,
    envMapIntensity: 0.3,
  });

  const submergedPebbleMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.44,
    metalness: 0.04,
    envMap: outdoorWaterEnvTex,
    envMapIntensity: 0.28,
  });
  materials.push(bankBoulderMat, shoreCobbleMat, submergedPebbleMat);

  const boulderGeo = buildSculptedStoneGeometry(2, 0.62, 0.16, 1.3, true);
  const cobbleGeo = buildSculptedStoneGeometry(1, 0.5, 0.1, 3.7, true);
  const pebbleGeo = buildSculptedStoneGeometry(1, 0.42, 0.08, 6.1, false);

  interface StoneTransform {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    ry: number;
    rx: number;
    rz: number;
    color: number;
  }

  const boulderList: StoneTransform[] = [];
  const cobbleList: StoneTransform[] = [];
  const pebbleList: StoneTransform[] = [];

  const boulderPalette = [0x6a7473, 0x5f6a67, 0x76807c, 0x58635f, 0x66716e];
  const cobblePalette = [0x626e6b, 0x56625f, 0x707a76, 0x5c6860];
  const pebblePalette = [0x767d73, 0x86897d, 0x909185, 0x66726a];

  // Helper: preserve future South Gate -> Bridge corridor clean of above-water bank stones
  const isReservedBridgeCorridor = (x: number, z: number) =>
    Math.abs(x) < 2.55 && z >= 16.5 && z <= 36.2;

  const findNearestContour = (x: number) =>
    contourSamples.reduce((best, item) =>
      Math.abs(item.x - x) < Math.abs(best.x - x) ? item : best
    );

  // Sample center + 4 perimeter support points so sloped-bank stones never overhang dry air
  const getPerimeterGroundedY = (
    px: number,
    pz: number,
    sx: number,
    sz: number
  ) => {
    const rx = sx * 0.4;
    const rz = sz * 0.4;
    const centerY = sampleTerrainY(px, pz);
    const minEdgeY = Math.min(
      centerY,
      sampleTerrainY(px - rx, pz),
      sampleTerrainY(px + rx, pz),
      sampleTerrainY(px, pz - rz),
      sampleTerrainY(px, pz + rz)
    );
    return { centerY, minEdgeY };
  };

  // A. Organic Bank Stone Outcrops: 1 primary anchor boulder + 2-4 nestled secondary
  //    stones + clustered shore cobbles around the base, preserving wide mossy earth gaps.
  interface BankClusterSpec {
    x: number;
    side: 'north' | 'south';
    secondaryCount: number;
    cobbleCount: number;
    scaleBias: number;
    shoreOffset: number;
  }

  const bankClusters: BankClusterSpec[] = [
    // West upstream quiet stretches (irregular spacing, hugging lower 13-20 deg bank toes)
    { x: -31.8, side: 'north', secondaryCount: 2, cobbleCount: 4, scaleBias: 0.88, shoreOffset: 0.16 },
    { x: -24.2, side: 'north', secondaryCount: 3, cobbleCount: 5, scaleBias: 0.94, shoreOffset: 0.12 },
    { x: -20.8, side: 'south', secondaryCount: 2, cobbleCount: 4, scaleBias: 0.9, shoreOffset: 0.2 },
    { x: -13.4, side: 'north', secondaryCount: 3, cobbleCount: 6, scaleBias: 1.02, shoreOffset: 0.14 },
    { x: -9.6, side: 'south', secondaryCount: 3, cobbleCount: 5, scaleBias: 0.96, shoreOffset: 0.18 },
    // Flanking bridge approach shoulders outside |X| >= 2.55
    { x: -4.4, side: 'north', secondaryCount: 3, cobbleCount: 6, scaleBias: 1.04, shoreOffset: 0.14 },
    { x: -3.9, side: 'south', secondaryCount: 2, cobbleCount: 5, scaleBias: 0.92, shoreOffset: 0.2 },
    { x: 4.3, side: 'north', secondaryCount: 3, cobbleCount: 5, scaleBias: 1.0, shoreOffset: 0.14 },
    { x: 4.7, side: 'south', secondaryCount: 2, cobbleCount: 3, scaleBias: 0.92, shoreOffset: 0.18 },
    // V1.5A Quiet East Pond: 2 asymmetric north-shore stone outcrops (wide mossy gaps),
    // open south mossy slope whitespace (zero south pond boulder clusters),
    // and 1 light east-outlet shoulder marker leaving water exit open
    { x: 9.4, side: 'north', secondaryCount: 3, cobbleCount: 4, scaleBias: 1.14, shoreOffset: 0.14 },
    { x: 17.6, side: 'north', secondaryCount: 4, cobbleCount: 4, scaleBias: 1.18, shoreOffset: 0.14 },
    { x: 23.6, side: 'south', secondaryCount: 2, cobbleCount: 3, scaleBias: 0.94, shoreOffset: 0.18 },
    { x: 32.4, side: 'north', secondaryCount: 2, cobbleCount: 4, scaleBias: 0.86, shoreOffset: 0.2 },
  ];

  // Explicit zero-overlap V1.5B coordinates for East Pond north outcrops b[32..40]
  // (primary anchor seated slightly higher on wet shore; secondary stones fanned cleanly lower)
  const eastPondClusterOverrides: Record<
    number,
    { primary: [number, number]; secondaries: [number, number][] }
  > = {
    9: {
      primary: [9.45, 26.77],
      secondaries: [
        [8.18, 27.57],
        [10.68, 26.41],
        [10.22, 25.55],
      ],
    },
    10: {
      primary: [17.5, 25.57],
      secondaries: [
        [16.18, 25.51],
        [16.72, 24.66],
        [18.88, 26.18],
        [19.95, 26.02],
      ],
    },
  };

  bankClusters.forEach((cluster, cIdx) => {
    const anchorContour = findNearestContour(cluster.x);
    const anchorBankDir = cluster.side === 'north' ? -1 : 1;
    const anchorShoreZ =
      cluster.side === 'north' ? anchorContour.zNorth : anchorContour.zSouth;
    const pondOverride = eastPondClusterOverrides[cIdx];

    // 1. Primary Anchor Boulder (主石)
    const primarySeed = cIdx * 97 + 11;
    const pSx = (1.12 + seeded01(primarySeed + 1) * 0.4) * cluster.scaleBias;
    const pSy = (0.48 + seeded01(primarySeed + 2) * 0.22) * cluster.scaleBias;
    const pSz = (0.86 + seeded01(primarySeed + 3) * 0.34) * cluster.scaleBias;
    const pX = pondOverride
      ? pondOverride.primary[0]
      : cluster.x + (seeded01(primarySeed + 4) - 0.5) * 0.35;
    const pZ = pondOverride
      ? pondOverride.primary[1]
      : anchorShoreZ + anchorBankDir * cluster.shoreOffset;

    if (!isReservedBridgeCorridor(pX, pZ) && pZ >= 19.6) {
      const { centerY, minEdgeY } = getPerimeterGroundedY(pX, pZ, pSx, pSz);
      if (centerY <= 0.3) {
        const yLift = pondOverride ? pSy * 0.015 : pSy * 0.04;
        boulderList.push({
          x: pX,
          y: minEdgeY + yLift,
          z: pZ,
          sx: pSx,
          sy: pSy,
          sz: pSz,
          ry: seeded01(primarySeed + 5) * Math.PI * 2,
          rx: (seeded01(primarySeed + 6) - 0.5) * 0.1,
          rz: (seeded01(primarySeed + 7) - 0.5) * 0.1,
          color:
            boulderPalette[Math.floor(seeded01(primarySeed + 8) * boulderPalette.length)],
        });
      }
    }

    // 2. Nestled Secondary Stones (2-4 副石 hugging the primary boulder)
    for (let k = 0; k < cluster.secondaryCount; k++) {
      const seed = cIdx * 97 + 31 + k * 19;
      const sx = (0.54 + seeded01(seed + 1) * 0.32) * cluster.scaleBias;
      const sy = (0.26 + seeded01(seed + 2) * 0.16) * cluster.scaleBias;
      const sz = (0.48 + seeded01(seed + 3) * 0.28) * cluster.scaleBias;

      const angle =
        (k / Math.max(cluster.secondaryCount, 1)) * Math.PI * 1.45 +
        seeded01(seed + 4) * 0.8 +
        (anchorBankDir > 0 ? 0.15 : Math.PI + 0.15);
      const dist = 0.58 + seeded01(seed + 5) * 0.52;
      const overridePos = pondOverride?.secondaries[k];
      const px = overridePos ? overridePos[0] : pX + Math.cos(angle) * dist * 1.12;
      const localContour = findNearestContour(px);
      const localShoreZ =
        cluster.side === 'north' ? localContour.zNorth : localContour.zSouth;
      const pz = overridePos
        ? overridePos[1]
        : localShoreZ +
          anchorBankDir *
            (cluster.shoreOffset * 0.6 + (seeded01(seed + 6) - 0.35) * 0.36);

      if (isReservedBridgeCorridor(px, pz) || pz < 19.6) continue;
      const { centerY, minEdgeY } = getPerimeterGroundedY(px, pz, sx, sz);
      if (centerY > 0.3) continue;

      const yLift = pondOverride ? sy * 0.015 : sy * 0.04;
      boulderList.push({
        x: px,
        y: minEdgeY + yLift,
        z: pz,
        sx,
        sy,
        sz,
        ry: seeded01(seed + 7) * Math.PI * 2,
        rx: (seeded01(seed + 8) - 0.5) * 0.12,
        rz: (seeded01(seed + 9) - 0.5) * 0.12,
        color: boulderPalette[Math.floor(seeded01(seed + 10) * boulderPalette.length)],
      });
    }

    // 3. Clustered Shore Cobbles (碎石 apron tightly grouped around boulder base & wet toe)
    for (let j = 0; j < cluster.cobbleCount; j++) {
      const seed = cIdx * 131 + 211 + j * 17;
      const sx = 0.2 + seeded01(seed + 1) * 0.26;
      const sy = 0.12 + seeded01(seed + 2) * 0.12;
      const sz = 0.18 + seeded01(seed + 3) * 0.22;

      const ox = (seeded01(seed + 4) - 0.5) * 2.1;
      let px = pX + ox;
      const localContour = findNearestContour(px);
      const localShoreZ =
        cluster.side === 'north' ? localContour.zNorth : localContour.zSouth;
      let pz =
        localShoreZ + anchorBankDir * (-0.1 + seeded01(seed + 5) * 0.42);

      // East Pond cobble separation from b[32..40] (leave upstream clusters untouched)
      if (px >= 6.5 && px <= 22.5) {
        const cRad = Math.max(sx, sz) * 0.56;
        for (let iter = 0; iter < 4; iter++) {
          let nudged = false;
          for (const b of boulderList) {
            if (b.x < 6.0 || b.x > 23.0) continue;
            const bRad = Math.max(b.sx, b.sz) * 0.58;
            const minSep = bRad + cRad + 0.06;
            const dx = px - b.x;
            const dz = pz - b.z;
            const d = Math.hypot(dx, dz);
            if (d < minSep) {
              const push = minSep - d + 0.02;
              const nx = d > 1e-4 ? dx / d : (j % 2 === 0 ? 1 : -1);
              const nz = d > 1e-4 ? dz / d : anchorBankDir * 0.4;
              px += nx * push;
              pz += nz * push;
              nudged = true;
            }
          }
          if (!nudged) break;
        }
        const stillCollides = boulderList.some(
          (b) =>
            b.x >= 6.0 &&
            b.x <= 23.0 &&
            Math.hypot(px - b.x, pz - b.z) <
              Math.max(b.sx, b.sz) * 0.58 + cRad + 0.04
        );
        if (stillCollides) continue;
      }

      if (isReservedBridgeCorridor(px, pz) || pz < 19.8) continue;
      const { centerY, minEdgeY } = getPerimeterGroundedY(px, pz, sx, sz);
      if (centerY < -0.15 || centerY > 0.14) continue;

      cobbleList.push({
        x: px,
        y: minEdgeY + sy * 0.04,
        z: pz,
        sx,
        sy,
        sz,
        ry: seeded01(seed + 6) * Math.PI * 2,
        rx: (seeded01(seed + 7) - 0.5) * 0.1,
        rz: (seeded01(seed + 8) - 0.5) * 0.1,
        color: cobblePalette[Math.floor(seeded01(seed + 9) * cobblePalette.length)],
      });
    }
  });

  // B. Natural Shallow Shoal Cobble Patches (quiet northwest pond inlet shoal + upstream riffles;
  //    south pond bank left free of scattered white cobbles for continuous mossy meadow edge)
  const shoalPatches: { x: number; side: 'north' | 'south'; count: number }[] = [
    { x: -16.8, side: 'south', count: 7 },
    { x: -6.4, side: 'north', count: 6 },
    { x: 7.4, side: 'north', count: 5 },
    { x: 26.2, side: 'north', count: 5 },
  ];

  shoalPatches.forEach((patch, pIdx) => {
    const bankDir = patch.side === 'north' ? -1 : 1;
    for (let k = 0; k < patch.count; k++) {
      const seed = 700 + pIdx * 53 + k * 13;
      const sx = 0.2 + seeded01(seed + 1) * 0.24;
      const sy = 0.12 + seeded01(seed + 2) * 0.1;
      const sz = 0.18 + seeded01(seed + 3) * 0.22;

      let px = patch.x + (seeded01(seed + 4) - 0.5) * 1.9;
      const localContour = findNearestContour(px);
      const localShoreZ =
        patch.side === 'north' ? localContour.zNorth : localContour.zSouth;
      let pz = localShoreZ + bankDir * (-0.12 + seeded01(seed + 5) * 0.34);

      if (px >= 6.5 && px <= 22.5) {
        const cRad = Math.max(sx, sz) * 0.56;
        const hitsPondBoulder = boulderList.some(
          (b) =>
            b.x >= 6.0 &&
            b.x <= 23.0 &&
            Math.hypot(px - b.x, pz - b.z) <
              Math.max(b.sx, b.sz) * 0.58 + cRad + 0.04
        );
        if (hitsPondBoulder) continue;
      }

      if (isReservedBridgeCorridor(px, pz) || pz < 19.8) continue;
      const { centerY, minEdgeY } = getPerimeterGroundedY(px, pz, sx, sz);
      if (centerY < -0.155 || centerY > 0.12) continue;

      cobbleList.push({
        x: px,
        y: minEdgeY + sy * 0.04,
        z: pz,
        sx,
        sy,
        sz,
        ry: seeded01(seed + 6) * Math.PI * 2,
        rx: (seeded01(seed + 7) - 0.5) * 0.1,
        rz: (seeded01(seed + 8) - 0.5) * 0.1,
        color: cobblePalette[Math.floor(seeded01(seed + 9) * cobblePalette.length)],
      });
    }
  });

  // C. Submerged Creek & Inlet Pebbles (calm East Pond center X∈[9.5, 22.0] kept open & quiet;
  //    only sparse north-edge shoal pebbles near northwest inlet + regular creek riffles)
  const submergedGroups: { centerX: number; count: number; northEdgeOnly?: boolean }[] = [
    { centerX: -21.5, count: 13 },
    { centerX: -15.5, count: 13 },
    { centerX: -10.5, count: 13 },
    { centerX: -5.8, count: 13 },
    { centerX: 5.4, count: 11 },
    { centerX: 8.2, count: 7, northEdgeOnly: true },
    { centerX: 25.8, count: 10 },
  ];
  submergedGroups.forEach(({ centerX, count, northEdgeOnly }, gIdx) => {
    for (let k = 0; k < count; k++) {
      const seed = 950 + gIdx * 67 + k * 19;
      const px = centerX + (seeded01(seed + 1) - 0.5) * 2.8;
      const contour = findNearestContour(px);
      if (contour.width < 1.8) continue;

      // Bias toward visible shallow-to-mid shelves; keep East Pond belly unobstructed
      const sidePick = seeded01(seed + 2);
      const spanT = northEdgeOnly
        ? 0.08 + seeded01(seed + 11) * 0.16
        : sidePick < 0.42
          ? 0.09 + seeded01(seed + 11) * 0.24
          : sidePick < 0.84
            ? 0.67 + seeded01(seed + 12) * 0.24
            : 0.33 + seeded01(seed + 13) * 0.34;
      const pz = THREE.MathUtils.lerp(contour.zNorth, contour.zSouth, spanT);

      if (isReservedBridgeCorridor(px, pz)) continue;

      const sx = 0.18 + seeded01(seed + 3) * 0.26;
      const sy = 0.08 + seeded01(seed + 4) * 0.09;
      const sz = 0.16 + seeded01(seed + 5) * 0.24;

      const { centerY, minEdgeY } = getPerimeterGroundedY(px, pz, sx, sz);
      if (centerY > TEMPLE_CREEK_WATER_Y - 0.035) continue;

      // Keep top of submerged pebble >= 0.018m below water surface (-0.105m -> <= -0.123m)
      const maxCenterY = TEMPLE_CREEK_WATER_Y - 0.018 - sy * 0.4;
      const py = Math.min(minEdgeY + sy * 0.04, maxCenterY);

      pebbleList.push({
        x: px,
        y: py,
        z: pz,
        sx,
        sy,
        sz,
        ry: seeded01(seed + 6) * Math.PI * 2,
        rx: (seeded01(seed + 7) - 0.5) * 0.08,
        rz: (seeded01(seed + 8) - 0.5) * 0.08,
        color: pebblePalette[Math.floor(seeded01(seed + 9) * pebblePalette.length)],
      });
    }
  });

  const populateInstancedStones = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: StoneTransform[],
    castShadow: boolean
  ) => {
    if (items.length === 0) return;
    const inst = new THREE.InstancedMesh(geo, mat, items.length);
    inst.name = name;
    inst.castShadow = castShadow;
    inst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();

    items.forEach((item, idx) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(item.rx, item.ry, item.rz);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);

      tmpColor.setHex(item.color);
      inst.setColorAt(idx, tmpColor);
    });

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  };

  populateInstancedStones(
    'temple-creek-bank-boulders',
    boulderGeo,
    bankBoulderMat,
    boulderList,
    true
  );
  populateInstancedStones(
    'temple-creek-shore-cobbles',
    cobbleGeo,
    shoreCobbleMat,
    cobbleList,
    false
  );
  populateInstancedStones(
    'temple-creek-submerged-pebbles',
    pebbleGeo,
    submergedPebbleMat,
    pebbleList,
    false
  );

  // Dispose unused base stone geometries only if list was empty
  if (boulderList.length === 0) boulderGeo.dispose();
  if (cobbleList.length === 0) cobbleGeo.dispose();
  if (pebbleList.length === 0) pebbleGeo.dispose();

  // -------------------------------------------------------------------------
  // 3. MERGED TERRAIN-CONFORMED BOULDER CONTACT SHADOWS (+1 Draw Call)
  // -------------------------------------------------------------------------
  const contactShadowTex = createBoulderContactShadowTexture();
  textures.push(contactShadowTex);

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  materials.push(contactShadowMat);

  if (boulderList.length > 0) {
    const gridSegs = 4; // 4x4 grid cells -> 5x5=25 verts, 32 tris per boulder
    const vertsPerGrid = gridSegs + 1;
    const vertsPerPatch = vertsPerGrid * vertsPerGrid;
    const totalShadowVerts = boulderList.length * vertsPerPatch;

    const shadowPositions = new Float32Array(totalShadowVerts * 3);
    const shadowUvs = new Float32Array(totalShadowVerts * 2);
    const shadowColors = new Float32Array(totalShadowVerts * 4);
    const shadowIndices: number[] = [];

    boulderList.forEach((b, bIdx) => {
      const vBase = bIdx * vertsPerPatch;
      const patchW = b.sx * 1.2;
      const patchD = b.sz * 1.2;
      const cosR = Math.cos(b.ry);
      const sinR = Math.sin(b.ry);
      // Slight shadow shift opposite skylightKey (13, 21, 10)
      const shiftX = -0.05 * b.sx;
      const shiftZ = -0.04 * b.sz;

      for (let iz = 0; iz <= gridSegs; iz++) {
        const vCoord = iz / gridSegs;
        const lz = (vCoord - 0.5) * patchD;
        for (let ix = 0; ix <= gridSegs; ix++) {
          const uCoord = ix / gridSegs;
          const lx = (uCoord - 0.5) * patchW;

          const wx = b.x + shiftX + lx * cosR + lz * sinR;
          const wz = b.z + shiftZ - lx * sinR + lz * cosR;
          const tY = sampleTerrainY(wx, wz);

          // Fade contact shadow alpha smoothly to 0 across shoreline & underwater
          const waterFade = smoothstep(
            TEMPLE_CREEK_WATER_Y - 0.007,
            TEMPLE_CREEK_WATER_Y + 0.03,
            tY
          );

          const vIdx = vBase + iz * vertsPerGrid + ix;
          shadowPositions[vIdx * 3] = wx;
          shadowPositions[vIdx * 3 + 1] = tY + 0.009;
          shadowPositions[vIdx * 3 + 2] = wz;

          shadowUvs[vIdx * 2] = uCoord;
          shadowUvs[vIdx * 2 + 1] = 1 - vCoord;

          shadowColors[vIdx * 4] = 1;
          shadowColors[vIdx * 4 + 1] = 1;
          shadowColors[vIdx * 4 + 2] = 1;
          shadowColors[vIdx * 4 + 3] = waterFade;
        }
      }

      for (let iz = 0; iz < gridSegs; iz++) {
        for (let ix = 0; ix < gridSegs; ix++) {
          const a = vBase + iz * vertsPerGrid + ix;
          const bVert = a + 1;
          const c = vBase + (iz + 1) * vertsPerGrid + ix;
          const d = c + 1;
          shadowIndices.push(a, c, bVert, bVert, c, d);
        }
      }
    });

    const contactShadowGeo = new THREE.BufferGeometry();
    contactShadowGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(shadowPositions, 3)
    );
    contactShadowGeo.setAttribute('uv', new THREE.BufferAttribute(shadowUvs, 2));
    contactShadowGeo.setAttribute(
      'color',
      new THREE.BufferAttribute(shadowColors, 4)
    );
    contactShadowGeo.setIndex(shadowIndices);
    contactShadowGeo.computeBoundingBox();
    contactShadowGeo.computeBoundingSphere();

    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.name = 'temple-creek-boulder-contact-shadows';
    contactShadowMesh.castShadow = false;
    contactShadowMesh.receiveShadow = false;
    contactShadowMesh.renderOrder = 1;
    group.add(contactShadowMesh);
  }

  const updateWaterEnvironment = (
    nightFactor: number,
    elapsedSec: number,
    allowMotion: boolean
  ) => {
    const nf = THREE.MathUtils.clamp(nightFactor, 0, 1);
    waterMaterial.color.lerpColors(DAY_WATER_MODULATE, NIGHT_WATER_MODULATE, nf);
    waterMaterial.emissive.lerpColors(
      DAY_WATER_EMISSIVE,
      NIGHT_WATER_EMISSIVE,
      nf
    );
    waterMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.08, 0.44, nf);
    waterMaterial.envMapIntensity = THREE.MathUtils.lerp(0.86, 0.38, nf);

    bankBoulderMat.envMapIntensity = THREE.MathUtils.lerp(0.34, 0.14, nf);
    shoreCobbleMat.envMapIntensity = THREE.MathUtils.lerp(0.3, 0.12, nf);
    submergedPebbleMat.envMapIntensity = THREE.MathUtils.lerp(0.28, 0.11, nf);
    contactShadowMat.opacity = THREE.MathUtils.lerp(0.28, 0.1, nf);

    if (allowMotion) {
      // Gentle downstream micro-drift only when frames are already rendering
      waterNormalTex.offset.set(
        (elapsedSec * 0.0042) % 1,
        (elapsedSec * 0.0014) % 1
      );
    }
  };

  return {
    group,
    waterMaterial,
    textures,
    materials,
    contourSamples,
    stats: {
      waterVertices: waterGeo.attributes.position.count,
      waterTriangles: waterGeo.index ? waterGeo.index.count / 3 : 0,
      bankBoulderCount: boulderList.length,
      shoreCobbleCount: cobbleList.length,
      submergedPebbleCount: pebbleList.length,
    },
    updateWaterEnvironment,
  };
}

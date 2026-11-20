import * as THREE from 'three';
import { TempleMaterialPalette } from './templeProceduralMaterials';
import { evalValleyHeight } from './templeValleyBuilder';

export interface CourtyardBuildResult {
  group: THREE.Group;
  courtyardSconceHalos: THREE.MeshBasicMaterial[];
  courtyardSconceFlames: THREE.Mesh[];
}

interface ChineseRoofOptions {
  /** Half-width along the local ridge axis (X) at the outer eave line */
  eaveHalfW: number;
  /** Half-depth perpendicular to ridge (Z) at the outer eave line */
  eaveHalfD: number;
  /** Half-length of the top main ridge along X (< eaveHalfW yields hip-gable slopes) */
  ridgeHalfW: number;
  /** Half-depth of the top opening along Z (0 = closed ridge peak; >0 = skirt opening for double eaves) */
  topHalfD?: number;
  /** Height rise from base eave plane to ridge peak */
  height: number;
  /** Upward corner sweep at eave corners (飞檐) */
  cornerLift: number;
  /** Whether to draw main ridge beam + end finials */
  withMainRidge?: boolean;
  roofMat: THREE.Material;
  ridgeMat: THREE.Material;
  woodMat: THREE.Material;
}

/**
 * Computes Y elevation along a traditional Chinese concave roof slope (举折)
 * with upturned corner eaves (飞檐). Shared cleanly across front/back & side hip faces
 * so every corner ridge meets watertight.
 */
function evalChineseRoofY(
  s: number,
  edgeU: number,
  height: number,
  cornerLift: number
): number {
  const concave = height * Math.pow(Math.max(0, 1 - s), 1.5);
  const cornerFactor = Math.pow(s, 2.2) * Math.pow(Math.abs(edgeU), 2.3);
  return concave + cornerLift * cornerFactor;
}

/**
 * Builds a single sloped face of a Chinese curved roof as an indexed BufferGeometry.
 * Local X = ridge direction, Z = perpendicular, Y = upward.
 */
function buildRoofSlopeGeometry(
  topStart: [number, number],
  topEnd: [number, number],
  botStart: [number, number],
  botEnd: [number, number],
  height: number,
  cornerLift: number,
  segU = 14,
  segV = 9
): THREE.BufferGeometry {
  const cols = segU + 1;
  const rows = segV + 1;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let iv = 0; iv < rows; iv++) {
    const s = iv / segV;
    for (let iu = 0; iu < cols; iu++) {
      const t = iu / segU;
      const edgeU = THREE.MathUtils.lerp(-1, 1, t);

      const tx = THREE.MathUtils.lerp(topStart[0], topEnd[0], t);
      const tz = THREE.MathUtils.lerp(topStart[1], topEnd[1], t);
      const bx = THREE.MathUtils.lerp(botStart[0], botEnd[0], t);
      const bz = THREE.MathUtils.lerp(botStart[1], botEnd[1], t);

      const x = THREE.MathUtils.lerp(tx, bx, s);
      const z = THREE.MathUtils.lerp(tz, bz, s);
      const y = evalChineseRoofY(s, edgeU, height, cornerLift);

      const idx = iv * cols + iu;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      uvs[idx * 2] = t * 2.5;
      uvs[idx * 2 + 1] = s * 1.5;
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
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a watertight traditional Chinese curved roof assembly with dark tile slopes,
 * dark timber soffit lining, diagonal hip ridges (垂脊), and main ridge (正脊).
 */
function createChineseCurvedRoof(opts: ChineseRoofOptions): THREE.Group {
  const {
    eaveHalfW,
    eaveHalfD,
    ridgeHalfW,
    topHalfD = 0,
    height,
    cornerLift,
    withMainRidge = true,
    roofMat,
    ridgeMat,
    woodMat,
  } = opts;

  const group = new THREE.Group();

  const slopes: THREE.BufferGeometry[] = [
    // South slope (+Z)
    buildRoofSlopeGeometry(
      [-ridgeHalfW, topHalfD],
      [ridgeHalfW, topHalfD],
      [-eaveHalfW, eaveHalfD],
      [eaveHalfW, eaveHalfD],
      height,
      cornerLift
    ),
    // North slope (-Z)
    buildRoofSlopeGeometry(
      [ridgeHalfW, -topHalfD],
      [-ridgeHalfW, -topHalfD],
      [eaveHalfW, -eaveHalfD],
      [-eaveHalfW, -eaveHalfD],
      height,
      cornerLift
    ),
    // East hip slope (+X)
    buildRoofSlopeGeometry(
      [ridgeHalfW, topHalfD],
      [ridgeHalfW, -topHalfD],
      [eaveHalfW, eaveHalfD],
      [eaveHalfW, -eaveHalfD],
      height,
      cornerLift,
      8,
      9
    ),
    // West hip slope (-X)
    buildRoofSlopeGeometry(
      [-ridgeHalfW, -topHalfD],
      [-ridgeHalfW, topHalfD],
      [-eaveHalfW, -eaveHalfD],
      [-eaveHalfW, eaveHalfD],
      height,
      cornerLift,
      8,
      9
    ),
  ];

  slopes.forEach((geo) => {
    const mesh = new THREE.Mesh(geo, roofMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  // Dark timber under-eave soffit lining
  const soffit = new THREE.Mesh(
    new THREE.BoxGeometry(
      Math.max(0.4, (eaveHalfW - 0.25) * 2),
      0.08,
      Math.max(0.4, (eaveHalfD - 0.25) * 2)
    ),
    woodMat
  );
  soffit.position.y = 0.03;
  group.add(soffit);

  // Four diagonal hip ridges (垂脊)
  const hipCorners: [number, number, number, number][] = [
    [ridgeHalfW, topHalfD, eaveHalfW, eaveHalfD],
    [-ridgeHalfW, topHalfD, -eaveHalfW, eaveHalfD],
    [ridgeHalfW, -topHalfD, eaveHalfW, -eaveHalfD],
    [-ridgeHalfW, -topHalfD, -eaveHalfW, -eaveHalfD],
  ];
  hipCorners.forEach(([tx, tz, bx, bz]) => {
    const pts: THREE.Vector3[] = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      pts.push(
        new THREE.Vector3(
          THREE.MathUtils.lerp(tx, bx, s),
          evalChineseRoofY(s, 1, height, cornerLift) + 0.04,
          THREE.MathUtils.lerp(tz, bz, s)
        )
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const hipMesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 12, 0.048, 6, false),
      ridgeMat
    );
    hipMesh.castShadow = true;
    group.add(hipMesh);
  });

  // Main horizontal ridge beam (正脊) + finials
  if (withMainRidge) {
    if (ridgeHalfW > 0.12) {
      const ridgeBeam = new THREE.Mesh(
        new THREE.BoxGeometry(ridgeHalfW * 2 + 0.1, 0.15, 0.15),
        ridgeMat
      );
      ridgeBeam.position.y = height + 0.05;
      ridgeBeam.castShadow = true;
      group.add(ridgeBeam);

      [-1, 1].forEach((side) => {
        const finial = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.28, 0.18),
          ridgeMat
        );
        finial.position.set(side * (ridgeHalfW + 0.02), height + 0.15, 0);
        finial.rotation.z = -side * 0.15;
        finial.castShadow = true;
        group.add(finial);
      });
    } else {
      // Corner pavilion finial (宝顶)
      const capFinial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.14, 0.28, 8),
        ridgeMat
      );
      capFinial.position.y = height + 0.12;
      group.add(capFinial);
    }
  }

  return group;
}

/**
 * Helper to create a multi-stepped granite stair flight facing -Z, +Z, -X, or +X.
 */
function addGraniteStairs(
  parent: THREE.Group,
  centerX: number,
  centerZ: number,
  width: number,
  runDepth: number,
  totalRise: number,
  steps: number,
  axis: 'z+' | 'z-' | 'x+' | 'x-',
  stepMat: THREE.Material,
  trimMat: THREE.Material,
  baseY = 0
) {
  const stepH = totalRise / steps;
  const stepD = runDepth / steps;

  for (let i = 0; i < steps; i++) {
    const h = totalRise - i * stepH;
    const offset = (i + 0.5) * stepD - runDepth / 2;

    if (axis === 'z+' || axis === 'z-') {
      const dir = axis === 'z+' ? 1 : -1;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, stepH, stepD + 0.02),
        stepMat
      );
      mesh.position.set(centerX, baseY + h - stepH / 2, centerZ + dir * offset);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      parent.add(mesh);

      if (h > stepH + 0.01) {
        const riser = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.04, h - stepH, stepD),
          trimMat
        );
        riser.position.set(
          centerX,
          baseY + (h - stepH) / 2,
          centerZ + dir * offset
        );
        riser.receiveShadow = true;
        parent.add(riser);
      }
    } else {
      const dir = axis === 'x+' ? 1 : -1;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(stepD + 0.02, stepH, width),
        stepMat
      );
      mesh.position.set(centerX + dir * offset, baseY + h - stepH / 2, centerZ);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      parent.add(mesh);

      if (h > stepH + 0.01) {
        const riser = new THREE.Mesh(
          new THREE.BoxGeometry(stepD, h - stepH, width - 0.04),
          trimMat
        );
        riser.position.set(
          centerX + dir * offset,
          baseY + (h - stepH) / 2,
          centerZ
        );
        riser.receiveShadow = true;
        parent.add(riser);
      }
    }
  }

  const cheekH = totalRise * 0.68;
  [-1, 1].forEach((side) => {
    if (axis === 'z+' || axis === 'z-') {
      const cheek = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, cheekH, runDepth + 0.08),
        trimMat
      );
      cheek.position.set(
        centerX + side * (width / 2 + 0.09),
        baseY + cheekH / 2,
        centerZ
      );
      cheek.castShadow = true;
      cheek.receiveShadow = true;
      parent.add(cheek);
    } else {
      const cheek = new THREE.Mesh(
        new THREE.BoxGeometry(runDepth + 0.08, cheekH, 0.18),
        trimMat
      );
      cheek.position.set(
        centerX,
        baseY + cheekH / 2,
        centerZ + side * (width / 2 + 0.09)
      );
      cheek.castShadow = true;
      cheek.receiveShadow = true;
      parent.add(cheek);
    }
  });
}

/**
 * Adds a restrained wooden lattice bay screen (格扇窗/槛墙) with stone sill.
 */
function addLatticeWallBay(
  parent: THREE.Group,
  x: number,
  yFloor: number,
  z: number,
  span: number,
  totalHeight: number,
  orient: 'x' | 'z',
  sillMat: THREE.Material,
  woodMat: THREE.Material,
  beamMat: THREE.Material
) {
  const sillH = 0.85;
  const latticeH = totalHeight - sillH;
  const thick = 0.14;

  const sill = new THREE.Mesh(
    orient === 'x'
      ? new THREE.BoxGeometry(span, sillH, thick)
      : new THREE.BoxGeometry(thick, sillH, span),
    sillMat
  );
  sill.position.set(x, yFloor + sillH / 2, z);
  sill.castShadow = true;
  sill.receiveShadow = true;
  parent.add(sill);

  [yFloor + sillH + 0.04, yFloor + totalHeight - 0.08].forEach((ry) => {
    const rail = new THREE.Mesh(
      orient === 'x'
        ? new THREE.BoxGeometry(span, 0.1, thick + 0.02)
        : new THREE.BoxGeometry(thick + 0.02, 0.1, span),
      beamMat
    );
    rail.position.set(x, ry, z);
    parent.add(rail);
  });

  const mullionCount = Math.max(4, Math.floor(span / 0.36));
  const mullionGeo = new THREE.BoxGeometry(0.05, latticeH - 0.12, 0.05);
  for (let i = 1; i < mullionCount; i++) {
    const offset = -span / 2 + (span * i) / mullionCount;
    const mullion = new THREE.Mesh(mullionGeo, woodMat);
    mullion.position.set(
      orient === 'x' ? x + offset : x,
      yFloor + sillH + latticeH / 2,
      orient === 'x' ? z : z + offset
    );
    parent.add(mullion);
  }
}

/**
 * Builds subtle stepped timber corbel bracket (斗拱简制) beneath eaves at a column point.
 */
function addCorbelBracket(
  parent: THREE.Group,
  x: number,
  yTopOfCol: number,
  z: number,
  beamMat: THREE.Material
) {
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.11, 0.44), beamMat);
  tier1.position.set(x, yTopOfCol + 0.055, z);
  parent.add(tier1);

  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.11, 0.64), beamMat);
  tier2.position.set(x, yTopOfCol + 0.165, z);
  parent.add(tier2);
}

/**
 * Builds a traditional courtyard granite/bronze lantern flanking the Main Hall terrace steps.
 */
function addCourtyardLantern(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  stoneMat: THREE.Material,
  bronzeMat: THREE.Material,
  flameMat: THREE.Material,
  haloList: THREE.MeshBasicMaterial[],
  flameList: THREE.Mesh[]
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.18, 8),
    stoneMat
  );
  plinth.position.y = 0.09;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.14, 0.92, 8),
    stoneMat
  );
  shaft.position.y = 0.64;
  shaft.castShadow = true;
  g.add(shaft);

  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.2, 0.12, 8),
    stoneMat
  );
  tray.position.y = 1.15;
  g.add(tray);

  for (let a = 0; a < 4; a++) {
    const ang = (a * Math.PI) / 2 + Math.PI / 4;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.28, 6),
      bronzeMat
    );
    post.position.set(Math.cos(ang) * 0.16, 1.35, Math.sin(ang) * 0.16);
    g.add(post);
  }

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.22, 8),
    stoneMat
  );
  cap.position.y = 1.58;
  cap.castShadow = true;
  g.add(cap);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.032, 0.095, 10),
    flameMat
  );
  flame.position.y = 1.34;
  g.add(flame);
  flameList.push(flame);

  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffd082,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  haloList.push(haloMat);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), haloMat);
  halo.position.y = 1.34;
  g.add(halo);

  parent.add(g);
}

/**
 * Builds crisp open doorway framing: jamb posts (抱框), low wooden threshold (门槛),
 * stone door pillow blocks (门枕石), pair of inward-opened folding lattice door leaves (敞开格扇),
 * and a subtle dark-timber inscribed plaque frame (匾额框) above the portal.
 */
function addArchitecturalPortal(
  parent: THREE.Group,
  opts: {
    x: number;
    yFloor: number;
    z: number;
    axis: 'x' | 'z';
    dirSign: 1 | -1; // interior direction along perpendicular axis
    clearWidth: number;
    portalHeight: number;
    hasPlaque?: boolean;
    stoneMat: THREE.Material;
    woodMat: THREE.Material;
    beamMat: THREE.Material;
    trimMat: THREE.Material;
  }
) {
  const {
    x,
    yFloor,
    z,
    axis,
    dirSign,
    clearWidth,
    portalHeight,
    hasPlaque = true,
    stoneMat,
    woodMat,
    beamMat,
    trimMat,
  } = opts;

  const halfSpan = clearWidth / 2;
  const leafWidth = Math.min(0.95, clearWidth * 0.28);
  const leafHeight = portalHeight - 0.14;

  // Low wooden threshold sill (门槛) + flanking carved stone pillow blocks (门枕石)
  const sill = new THREE.Mesh(
    axis === 'x'
      ? new THREE.BoxGeometry(clearWidth, 0.09, 0.14)
      : new THREE.BoxGeometry(0.14, 0.09, clearWidth),
    beamMat
  );
  sill.position.set(x, yFloor + 0.045, z);
  sill.receiveShadow = true;
  parent.add(sill);

  [-1, 1].forEach((side) => {
    const offset = side * (halfSpan - 0.08);
    const pillow = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(0.18, 0.18, 0.36)
        : new THREE.BoxGeometry(0.36, 0.18, 0.18),
      stoneMat
    );
    pillow.position.set(
      axis === 'x' ? x + offset : x,
      yFloor + 0.09,
      axis === 'x' ? z : z + offset
    );
    pillow.castShadow = true;
    pillow.receiveShadow = true;
    parent.add(pillow);

    // Vertical wooden door jamb post (抱框)
    const jamb = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(0.12, portalHeight, 0.16)
        : new THREE.BoxGeometry(0.16, portalHeight, 0.12),
      beamMat
    );
    jamb.position.set(
      axis === 'x' ? x + offset : x,
      yFloor + portalHeight / 2,
      axis === 'x' ? z : z + offset
    );
    jamb.castShadow = true;
    parent.add(jamb);

    // Opened folding lattice door leaf swung 90° inward into the hall
    const leafGroup = new THREE.Group();
    const leafOffset = side * (halfSpan - 0.16);
    leafGroup.position.set(
      axis === 'x' ? x + leafOffset : x + dirSign * (leafWidth / 2 + 0.06),
      yFloor + 0.08 + leafHeight / 2,
      axis === 'x' ? z + dirSign * (leafWidth / 2 + 0.06) : z + leafOffset
    );

    const panel = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(0.055, leafHeight, leafWidth)
        : new THREE.BoxGeometry(leafWidth, leafHeight, 0.055),
      woodMat
    );
    panel.castShadow = true;
    panel.receiveShadow = true;
    leafGroup.add(panel);

    const frame = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(0.07, 0.1, leafWidth + 0.02)
        : new THREE.BoxGeometry(leafWidth + 0.02, 0.1, 0.07),
      beamMat
    );
    const frameTop = frame.clone();
    frameTop.position.y = leafHeight / 2 - 0.05;
    const frameMid = frame.clone();
    frameMid.position.y = -leafHeight * 0.15;
    leafGroup.add(frameTop, frameMid);

    parent.add(leafGroup);
  });

  // Subtle horizontal plaque frame above portal lintel (匾额框)
  if (hasPlaque) {
    const plaqueW = Math.min(2.05, clearWidth * 0.62);
    const plaqueH = 0.48;
    const plaqueCenterY = yFloor + portalHeight + 0.25;
    const perpOut = -dirSign * 0.2;

    const plaqueFrame = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(plaqueW, plaqueH, 0.08)
        : new THREE.BoxGeometry(0.08, plaqueH, plaqueW),
      beamMat
    );
    plaqueFrame.position.set(
      axis === 'x' ? x : x + perpOut,
      plaqueCenterY,
      axis === 'x' ? z + perpOut : z
    );
    plaqueFrame.castShadow = true;
    parent.add(plaqueFrame);

    const plaqueField = new THREE.Mesh(
      axis === 'x'
        ? new THREE.BoxGeometry(plaqueW - 0.14, plaqueH - 0.14, 0.03)
        : new THREE.BoxGeometry(0.03, plaqueH - 0.14, plaqueW - 0.14),
      trimMat
    );
    plaqueField.position.set(
      axis === 'x' ? x : x + perpOut - dirSign * 0.04,
      plaqueCenterY,
      axis === 'x' ? z + perpOut - dirSign * 0.04 : z
    );
    parent.add(plaqueField);
  }
}

/**
 * Builds one ground-hugging wing of HiddenRecessEarthCap with inner edges at Y = -0.005m
 * and outer perimeter skirts tucked >= 2cm below the 2.5m valley terrain triangle grid
 * so zero vertical drop-off steps or Z-fighting appear along X=±15.0 / Z=-22.5.
 */
function buildEarthCapWingMesh(
  name: string,
  zMin: number,
  zMax: number,
  xInnerFn: (z: number) => number,
  sideSign: -1 | 1,
  segX: number,
  segZ: number,
  material: THREE.Material
): THREE.Mesh {
  const xOuter = 15.0;
  const cols = segX + 1;
  const rows = segZ + 1;
  const positions = new Float32Array(cols * rows * 3);
  const colors = new Float32Array(cols * rows * 3);
  const indices: number[] = [];

  const colorVerge = new THREE.Color(0x747360);
  const colorMeadow = new THREE.Color(0x616d52);
  const tmpColor = new THREE.Color();

  for (let iz = 0; iz < rows; iz++) {
    const vz = iz / segZ;
    const z = THREE.MathUtils.lerp(zMin, zMax, vz);
    const xIn = xInnerFn(z);
    for (let ix = 0; ix < cols; ix++) {
      const vx = ix / segX;
      const absX = THREE.MathUtils.lerp(xIn, xOuter, vx);
      const x = sideSign * absX;

      const fx = THREE.MathUtils.clamp((absX - 12.5) / (15.0 - 12.5), 0, 1);
      const fz = z < -20.0 ? THREE.MathUtils.clamp((-20.0 - z) / 2.5, 0, 1) : 0;
      const skirtBlend = Math.max(fx, fz);
      const outerTargetY = Math.min(-0.025, evalValleyHeight(x, z) - 0.02);
      const y = THREE.MathUtils.lerp(-0.005, outerTargetY, skirtBlend);

      const idx = iz * cols + ix;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      const cT = THREE.MathUtils.clamp((absX - 7.4) / 7.6, 0, 1) * 0.45;
      tmpColor.lerpColors(colorVerge, colorMeadow, cT);
      colors[idx * 3] = tmpColor.r;
      colors[idx * 3 + 1] = tmpColor.g;
      colors[idx * 3 + 2] = tmpColor.b;
    }
  }

  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * cols + ix;
      const b = a + 1;
      const c = (iz + 1) * cols + ix;
      const d = c + 1;
      if (sideSign > 0) {
        indices.push(a, c, b, b, c, d);
      } else {
        indices.push(a, b, c, b, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

/**
 * Constructs the Open Mountain Temple Layout (开放式山地寺院布局 · Scheme C):
 * - Layer 1: VisibleForecourtPaving (X ∈ [-14.0,+14.0], Z ∈ [-1.6,+12.6], Y=0.000m) + Axial Path (+0.025m)
 * - Layer 2: MainHallPodium (Y=-0.150..+1.800m), MainTerrace (月台 Y=+1.800m),
 *            Two-Flight 6.4m Stone Stairs (Lower 0->0.90m, MidLanding 8.8m wide Y=0.90m w/ lanterns, Upper 0.90->1.80m)
 * - Layer 3: Six non-overlapping ground-hugging HiddenRecessEarthCap wings
 * - Modular Units: MainHallUnit @(0,1.800,-17.600), SideHallUnits @(±11.800,0.360,2.400), SouthGateUnit @(0,0.240,14.000)
 * - Bell & Drum Pavilions: footprint reserved at (±10.200, +10.800), zero geometry built
 * - All enclosed Siheyuan perimeter walls & continuous corridors removed
 */
export function buildTempleCourtyard(
  palette: TempleMaterialPalette
): CourtyardBuildResult {
  const group = new THREE.Group();
  group.name = 'temple-courtyard-compound';

  const courtyardSconceHalos: THREE.MeshBasicMaterial[] = [];
  const courtyardSconceFlames: THREE.Mesh[] = [];

  interface ColumnSpec {
    x: number;
    yBase: number;
    z: number;
    radius: number;
    height: number;
  }
  const columnSpecs: ColumnSpec[] = [];
  const registerColumn = (
    x: number,
    yBase: number,
    z: number,
    radius: number,
    height: number
  ) => {
    columnSpecs.push({ x, yBase, z, radius, height });
  };

  // =========================================================================
  // 1. LAYER 1 — VISIBLE FORECOURT PAVING & CENTRAL AXIAL PATH (开放前院)
  // =========================================================================
  const forecourtGroup = new THREE.Group();
  forecourtGroup.name = 'temple-forecourt-paving-layer';
  group.add(forecourtGroup);

  // 28.00m × 14.20m forecourt slab (X ∈ [-14.0,+14.0], Z ∈ [-1.6,+12.6], Y ∈ [-0.120, 0.000])
  const visibleForecourtPaving = new THREE.Mesh(
    new THREE.BoxGeometry(28.0, 0.12, 14.2),
    palette.charcoalStonePaving
  );
  visibleForecourtPaving.name = 'VisibleForecourtPaving';
  visibleForecourtPaving.position.set(0, -0.06, 5.5);
  visibleForecourtPaving.receiveShadow = true;
  forecourtGroup.add(visibleForecourtPaving);

  // Central Axial Approach (御道: X ∈ [-1.40,+1.40], Z ∈ [-1.60,+11.80], Y_top = +0.025m)
  const axialPath = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.025, 13.4),
    palette.charcoalGraniteTrim
  );
  axialPath.position.set(0, 0.0125, 5.1);
  axialPath.receiveShadow = true;
  forecourtGroup.add(axialPath);

  [-1.35, 1.35].forEach((ex) => {
    const borderStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.025, 13.4),
      palette.stonePedestal
    );
    borderStrip.position.set(ex, 0.0125, 5.1);
    borderStrip.receiveShadow = true;
    forecourtGroup.add(borderStrip);
  });

  // =========================================================================
  // 2. LAYER 2 — MAIN HALL PODIUM, TERRACE & TWO-FLIGHT MEDITATIVE STAIRS
  // =========================================================================
  const mainHallOriginY = 1.8;
  const mainHallOriginZ = -17.6;
  const mainColH = 4.75;

  const podiumAndStairsGroup = new THREE.Group();
  podiumAndStairsGroup.name = 'temple-podium-and-stairs-layer';
  group.add(podiumAndStairsGroup);

  // Unified Main Hall Body Podium (X ∈ [-7.80,+7.80], Z ∈ [-23.40,-11.80], Y ∈ [-0.150,+1.800])
  const mainHallPodium = new THREE.Mesh(
    new THREE.BoxGeometry(15.6, 1.95, 11.6),
    palette.charcoalGraniteTrim
  );
  mainHallPodium.name = 'MainHallPodium';
  mainHallPodium.position.set(0, 0.825, -17.6);
  mainHallPodium.receiveShadow = true;
  mainHallPodium.castShadow = true;
  podiumAndStairsGroup.add(mainHallPodium);

  // Main Terrace (月台: X ∈ [-7.40,+7.40], Z ∈ [-11.80,-8.60], Y ∈ [-0.150,+1.800])
  const mainTerrace = new THREE.Mesh(
    new THREE.BoxGeometry(14.8, 1.95, 3.2),
    palette.charcoalGraniteTrim
  );
  mainTerrace.name = 'MainTerrace';
  mainTerrace.position.set(0, 0.825, -10.2);
  mainTerrace.receiveShadow = true;
  mainTerrace.castShadow = true;
  podiumAndStairsGroup.add(mainTerrace);

  // Subtle dressed stone coping rim around MainTerrace (top Y = 1.800m, skirt Y ∈ [1.68, 1.80])
  const terraceEastRim = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.12, 3.24),
    palette.stonePedestal
  );
  terraceEastRim.position.set(7.37, 1.74, -10.2);
  terraceEastRim.receiveShadow = true;
  const terraceWestRim = terraceEastRim.clone();
  terraceWestRim.position.x = -7.37;
  podiumAndStairsGroup.add(terraceEastRim, terraceWestRim);

  // MainTerrace stone balustrades (栏板/望柱) closing E/W & S flanking wings, leaving X ∈ [-3.20,+3.20] open
  [-7.32, 7.32].forEach((bx) => {
    const sideCurb = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.24, 3.2),
      palette.stonePedestal
    );
    sideCurb.position.set(bx, mainHallOriginY + 0.12, -10.2);
    sideCurb.castShadow = true;
    sideCurb.receiveShadow = true;
    podiumAndStairsGroup.add(sideCurb);

    [-11.69, -10.2, -8.71].forEach((pz) => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.44, 0.22),
        palette.stonePedestal
      );
      post.position.set(bx, mainHallOriginY + 0.22, pz);
      post.castShadow = true;
      podiumAndStairsGroup.add(post);
    });
  });

  [-5.3, 5.3].forEach((cx) => {
    const southWingCurb = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.24, 0.16),
      palette.stonePedestal
    );
    southWingCurb.position.set(cx, mainHallOriginY + 0.12, -8.68);
    southWingCurb.castShadow = true;
    southWingCurb.receiveShadow = true;
    podiumAndStairsGroup.add(southWingCurb);
  });
  [-5.3, -3.31, 3.31, 5.3].forEach((px) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.44, 0.22),
      palette.stonePedestal
    );
    post.position.set(px, mainHallOriginY + 0.22, -8.71);
    post.castShadow = true;
    podiumAndStairsGroup.add(post);
  });

  // Lower Stair Flight (下段御阶: X ∈ [-3.20,+3.20], Z ∈ [-4.40,-1.60], 6 steps, 0.000 -> +0.900m)
  const lowerStairUnderBase = new THREE.Mesh(
    new THREE.BoxGeometry(6.76, 0.15, 2.8),
    palette.charcoalGraniteTrim
  );
  lowerStairUnderBase.position.set(0, -0.075, -3.0);
  lowerStairUnderBase.receiveShadow = true;
  podiumAndStairsGroup.add(lowerStairUnderBase);

  addGraniteStairs(
    podiumAndStairsGroup,
    0,
    -3.0,
    6.4,
    2.8,
    0.9,
    6,
    'z+',
    palette.stonePedestal,
    palette.charcoalGraniteTrim,
    0
  );

  // Mid-Landing (中段歇台: X ∈ [-4.40,+4.40], Z ∈ [-6.00,-4.40], Y ∈ [-0.150,+0.900m])
  // Widened to ±4.40m so courtyard lanterns at (±3.800, +0.900, -5.200) sit solidly on masonry
  const midLanding = new THREE.Mesh(
    new THREE.BoxGeometry(8.8, 1.05, 1.6),
    palette.charcoalGraniteTrim
  );
  midLanding.name = 'MidLanding';
  midLanding.position.set(0, 0.375, -5.2);
  midLanding.receiveShadow = true;
  midLanding.castShadow = true;
  podiumAndStairsGroup.add(midLanding);

  const midLandingSurface = new THREE.Mesh(
    new THREE.BoxGeometry(8.76, 0.02, 1.56),
    palette.stonePedestal
  );
  midLandingSurface.position.set(0, 0.892, -5.2);
  midLandingSurface.receiveShadow = true;
  podiumAndStairsGroup.add(midLandingSurface);

  // Upper Stair Flight (上段御阶: X ∈ [-3.20,+3.20], Z ∈ [-8.60,-6.00], 6 steps, +0.900 -> +1.800m)
  // Solid masonry under-podium fills Y ∈ [-0.150,+0.900] directly beneath upper steps & cheeks
  const upperStairUnderPodium = new THREE.Mesh(
    new THREE.BoxGeometry(6.76, 1.05, 2.6),
    palette.charcoalGraniteTrim
  );
  upperStairUnderPodium.name = 'UpperStairUnderPodium';
  upperStairUnderPodium.position.set(0, 0.375, -7.3);
  upperStairUnderPodium.receiveShadow = true;
  upperStairUnderPodium.castShadow = true;
  podiumAndStairsGroup.add(upperStairUnderPodium);

  addGraniteStairs(
    podiumAndStairsGroup,
    0,
    -7.3,
    6.4,
    2.6,
    0.9,
    6,
    'z+',
    palette.stonePedestal,
    palette.charcoalGraniteTrim,
    0.9
  );

  // =========================================================================
  // 3. LAYER 3 — SIX SPLIT-WING GROUND-HUGGING HIDDEN RECESS EARTH CAPS
  // =========================================================================
  const earthCapGroup = new THREE.Group();
  earthCapGroup.name = 'HiddenRecessEarthCap';
  group.add(earthCapGroup);

  const earthCapMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.01,
    envMapIntensity: 0.35,
  });

  ([-1, 1] as const).forEach((sideSign) => {
    const sideLabel = sideSign < 0 ? 'west' : 'east';

    // Wings 1 & 2: Flanking MainHallPodium (X ∈ ±[7.80,15.00], Z ∈ [-22.50,-11.80])
    earthCapGroup.add(
      buildEarthCapWingMesh(
        `hidden-earth-cap-main-${sideLabel}`,
        -22.5,
        -11.8,
        () => 7.8,
        sideSign,
        6,
        8,
        earthCapMat
      )
    );

    // Wings 3 & 4: Flanking MainTerrace (X ∈ ±[7.40,15.00], Z ∈ [-11.80,-8.60])
    earthCapGroup.add(
      buildEarthCapWingMesh(
        `hidden-earth-cap-terrace-${sideLabel}`,
        -11.8,
        -8.6,
        () => 7.4,
        sideSign,
        6,
        3,
        earthCapMat
      )
    );

    // Wings 5 & 6: Flanking Stairs & MidLanding north of SideHalls & Forecourt (Z ∈ [-8.60,-1.80])
    // Stepped inner edge follows UpperStairs(±3.38) -> MidLanding(±4.40) -> LowerStairs(±3.38);
    // Z stops at -1.80 for |X|>=8.50 (SideHall boundary); remaining narrow Z∈[-1.80,-1.60], |X|∈[3.38,8.50]
    // strip is covered seamlessly by a non-overlapping inner sub-strip inside this same wing group.
    const stairWingGroup = new THREE.Group();
    stairWingGroup.name = `hidden-earth-cap-stairs-${sideLabel}`;
    stairWingGroup.add(
      buildEarthCapWingMesh(
        `hidden-earth-cap-stairs-upper-${sideLabel}`,
        -8.6,
        -6.0,
        () => 3.38,
        sideSign,
        6,
        3,
        earthCapMat
      ),
      buildEarthCapWingMesh(
        `hidden-earth-cap-stairs-mid-${sideLabel}`,
        -6.0,
        -4.4,
        () => 4.4,
        sideSign,
        6,
        2,
        earthCapMat
      ),
      buildEarthCapWingMesh(
        `hidden-earth-cap-stairs-lower-${sideLabel}`,
        -4.4,
        -1.8,
        () => 3.38,
        sideSign,
        6,
        3,
        earthCapMat
      )
    );

    // Non-overlapping south apron strip between LowerStairs (±3.38) & SideHall (±8.50), Z ∈ [-1.80, -1.60]
    const notchStrip = new THREE.Mesh(
      new THREE.BoxGeometry(8.5 - 3.38, 0.115, 0.2),
      earthCapMat
    );
    notchStrip.name = `hidden-earth-cap-stairs-notch-${sideLabel}`;
    const notchGeo = notchStrip.geometry;
    const nCount = notchGeo.attributes.position.count;
    const nColors = new Float32Array(nCount * 3);
    const notchColor = new THREE.Color(0x747360);
    for (let i = 0; i < nCount; i++) {
      nColors[i * 3] = notchColor.r;
      nColors[i * 3 + 1] = notchColor.g;
      nColors[i * 3 + 2] = notchColor.b;
    }
    notchGeo.setAttribute('color', new THREE.BufferAttribute(nColors, 3));
    notchStrip.position.set(sideSign * ((3.38 + 8.5) / 2), -0.0625, -1.7);
    notchStrip.receiveShadow = true;
    stairWingGroup.add(notchStrip);

    earthCapGroup.add(stairWingGroup);
  });

  // =========================================================================
  // 4. MAIN HALL UNIT (大雄宝殿) — Local (0,0,0) = World (0, +1.800, -17.600)
  // =========================================================================
  const mainHallUnit = new THREE.Group();
  mainHallUnit.name = 'MainHallUnit';
  mainHallUnit.position.set(0, mainHallOriginY, mainHallOriginZ);
  group.add(mainHallUnit);

  // Main Hall interior stone floor top (world Y = 1.800..1.830m, Z ∈ [-23.40,-11.80])
  const mainHallFloorTop = new THREE.Mesh(
    new THREE.BoxGeometry(14.8, 0.03, 11.6),
    palette.stonePedestal
  );
  mainHallFloorTop.position.set(0, 0.015, 0);
  mainHallFloorTop.receiveShadow = true;
  mainHallUnit.add(mainHallFloorTop);

  // Main Hall 5-Bay × 3-Depth Timber Column Grid (registered in root world coordinates!)
  const mainColXs = [-7.1, -4.45, -1.9, 1.9, 4.45, 7.1];
  const mainFrontLocalZ = 5.55; // world Z = -12.05
  const mainRearLocalZ = -5.5; // world Z = -23.10
  mainColXs.forEach((cx) => {
    registerColumn(cx, mainHallOriginY, mainHallOriginZ + mainFrontLocalZ, 0.24, mainColH);
    registerColumn(cx, mainHallOriginY, mainHallOriginZ + mainRearLocalZ, 0.24, mainColH);
    addCorbelBracket(
      mainHallUnit,
      cx,
      mainColH,
      mainFrontLocalZ,
      palette.darkWalnutWood
    );
  });
  [-7.1, 7.1].forEach((sx) => {
    registerColumn(sx, mainHallOriginY, mainHallOriginZ + 1.85, 0.24, mainColH); // world Z = -15.75
    registerColumn(sx, mainHallOriginY, mainHallOriginZ - 1.85, 0.24, mainColH); // world Z = -19.45
  });
  [-4.45, -1.9, 1.9, 4.45].forEach((ix) => {
    registerColumn(ix, mainHallOriginY, mainHallOriginZ + 1.25, 0.22, mainColH + 0.72); // world Z = -16.35
    registerColumn(ix, mainHallOriginY, mainHallOriginZ - 2.25, 0.22, mainColH + 0.72); // world Z = -19.85
  });

  const mainFrontBeam = new THREE.Mesh(
    new THREE.BoxGeometry(14.6, 0.3, 0.28),
    palette.darkWalnutWood
  );
  mainFrontBeam.position.set(0, mainColH - 0.12, mainFrontLocalZ);
  mainFrontBeam.castShadow = true;
  mainHallUnit.add(mainFrontBeam);

  const mainRearBeam = mainFrontBeam.clone();
  mainRearBeam.position.z = mainRearLocalZ;
  mainHallUnit.add(mainRearBeam);

  mainColXs.forEach((cx) => {
    const crossBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.32, 11.35),
      palette.darkWalnutWood
    );
    crossBeam.position.set(cx, mainColH + 0.1, 0.02);
    mainHallUnit.add(crossBeam);
  });

  const mainCeiling = new THREE.Mesh(
    new THREE.BoxGeometry(14.6, 0.16, 11.4),
    palette.darkTimberCeiling
  );
  mainCeiling.position.set(0, mainColH + 0.4, 0.02);
  mainHallUnit.add(mainCeiling);

  const mainNorthWall = new THREE.Mesh(
    new THREE.BoxGeometry(14.6, mainColH + 0.2, 0.26),
    palette.courtyardEarthWall
  );
  mainNorthWall.position.set(0, (mainColH + 0.2) / 2, -5.62);
  mainNorthWall.receiveShadow = true;
  mainHallUnit.add(mainNorthWall);

  const altarBackdropWood = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 4.5, 0.16),
    palette.darkWalnutWood
  );
  altarBackdropWood.position.set(0, 2.25, -5.42);
  mainHallUnit.add(altarBackdropWood);

  [-7.25, 7.25].forEach((wx) => {
    const sideWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, mainColH + 0.2, 11.2),
      palette.courtyardEarthWall
    );
    sideWall.position.set(wx, (mainColH + 0.2) / 2, -0.02);
    sideWall.receiveShadow = true;
    sideWall.castShadow = true;
    mainHallUnit.add(sideWall);
  });

  const centralPortalLintel = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.28, 0.24),
    palette.darkWalnutWood
  );
  centralPortalLintel.position.set(0, 4.0, mainFrontLocalZ);
  mainHallUnit.add(centralPortalLintel);

  addArchitecturalPortal(mainHallUnit, {
    x: 0,
    yFloor: 0.03,
    z: mainFrontLocalZ,
    axis: 'x',
    dirSign: -1,
    clearWidth: 3.3,
    portalHeight: 3.83,
    hasPlaque: true,
    stoneMat: palette.stonePedestal,
    woodMat: palette.naturalWood,
    beamMat: palette.darkWalnutWood,
    trimMat: palette.roofRidgeSlate,
  });

  [-3.18, 3.18].forEach((bx) => {
    addLatticeWallBay(
      mainHallUnit,
      bx,
      0,
      mainFrontLocalZ,
      2.35,
      mainColH - 0.3,
      'x',
      palette.charcoalGraniteTrim,
      palette.naturalWood,
      palette.darkWalnutWood
    );
  });
  [-5.78, 5.78].forEach((bx) => {
    addLatticeWallBay(
      mainHallUnit,
      bx,
      0,
      mainFrontLocalZ,
      2.4,
      mainColH - 0.3,
      'x',
      palette.charcoalGraniteTrim,
      palette.naturalWood,
      palette.darkWalnutWood
    );
  });

  // Double-Eave Roof (重檐歇山顶):
  // World Y: lowerBase=6.690m, upperBase=8.150m -> Slope Apex=10.350m, Ridge Beam=10.475m, Finial Peak=10.6496m
  const mainLowerEaveRoof = createChineseCurvedRoof({
    eaveHalfW: 8.15,
    eaveHalfD: 6.35,
    ridgeHalfW: 6.65,
    topHalfD: 4.65,
    height: 1.05,
    cornerLift: 0.3,
    withMainRidge: false,
    roofMat: palette.roofTileCharcoal,
    ridgeMat: palette.roofRidgeSlate,
    woodMat: palette.darkWalnutWood,
  });
  mainLowerEaveRoof.position.set(0, mainColH + 0.14, 0.05);
  mainHallUnit.add(mainLowerEaveRoof);

  const upperNeck = new THREE.Mesh(
    new THREE.BoxGeometry(12.6, 0.58, 8.8),
    palette.darkWalnutWood
  );
  upperNeck.position.set(0, mainColH + 1.36, 0.05);
  upperNeck.castShadow = true;
  mainHallUnit.add(upperNeck);

  const mainUpperRoof = createChineseCurvedRoof({
    eaveHalfW: 7.65,
    eaveHalfD: 5.35,
    ridgeHalfW: 4.8,
    topHalfD: 0,
    height: 2.2,
    cornerLift: 0.36,
    withMainRidge: true,
    roofMat: palette.roofTileCharcoal,
    ridgeMat: palette.roofRidgeSlate,
    woodMat: palette.darkWalnutWood,
  });
  mainUpperRoof.position.set(0, mainColH + 1.6, 0.05);
  mainHallUnit.add(mainUpperRoof);

  // =========================================================================
  // 5. WEST & EAST SIDE HALL UNITS (东西偏殿) — (±11.800, +0.360, +2.400)
  // =========================================================================
  const sideHallY = 0.36;
  const sideHallZ = 2.4;
  const sideColH = 3.45;

  ([-1, 1] as const).forEach((sideSign) => {
    const isWest = sideSign < 0;
    const unitCenterX = sideSign * 11.8;
    const sideHallUnit = new THREE.Group();
    sideHallUnit.name = isWest ? 'WestSideHallUnit' : 'EastSideHallUnit';
    sideHallUnit.position.set(unitCenterX, sideHallY, sideHallZ);
    group.add(sideHallUnit);

    const localFrontColX = -sideSign * 3.05; // world ±8.75
    const localRearColX = sideSign * 3.02; // world ±14.82
    const localOuterEdgeX = sideSign * 3.3; // world ±15.10

    // Side Hall Podium (X ∈ ±[8.50,15.10], Z ∈ [-1.80,+6.60], Y ∈ [-0.150,+0.360])
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.51, 8.4),
      palette.charcoalGraniteTrim
    );
    plinth.position.set(0, -0.255, 0);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    sideHallUnit.add(plinth);

    const floorSurface = new THREE.Mesh(
      new THREE.BoxGeometry(6.1, 0.025, 7.9),
      palette.stonePedestal
    );
    floorSurface.position.set(0, 0.0125, 0);
    floorSurface.receiveShadow = true;
    sideHallUnit.add(floorSurface);

    // Side Hall Entrance Stairs aligned to portal center Z = +2.400 (X ∈ ±[7.70,8.50], Z ∈ [+1.00,+3.80])
    addGraniteStairs(
      group,
      sideSign * 8.1,
      sideHallZ,
      2.8,
      0.8,
      sideHallY,
      2,
      isWest ? 'x+' : 'x-',
      palette.stonePedestal,
      palette.charcoalGraniteTrim,
      0
    );

    const sideColZs = [-4.0, -1.4, 1.4, 4.0];
    sideColZs.forEach((cz) => {
      registerColumn(unitCenterX + localFrontColX, sideHallY, sideHallZ + cz, 0.18, sideColH);
      registerColumn(unitCenterX + localRearColX, sideHallY, sideHallZ + cz, 0.18, sideColH);
      addCorbelBracket(
        sideHallUnit,
        localFrontColX,
        sideColH,
        cz,
        palette.darkWalnutWood
      );

      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(6.1, 0.22, 0.2),
        palette.darkWalnutWood
      );
      beam.position.set(0, sideColH + 0.06, cz);
      sideHallUnit.add(beam);
    });

    [localFrontColX, localRearColX].forEach((lx) => {
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.24, 8.2),
        palette.darkWalnutWood
      );
      lintel.position.set(lx, sideColH - 0.1, 0);
      sideHallUnit.add(lintel);
    });

    const sideCeiling = new THREE.Mesh(
      new THREE.BoxGeometry(6.1, 0.14, 7.9),
      palette.darkTimberCeiling
    );
    sideCeiling.position.set(0, sideColH + 0.24, 0);
    sideHallUnit.add(sideCeiling);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, sideColH + 0.15, 8.1),
      palette.courtyardEarthWall
    );
    backWall.position.set(localOuterEdgeX - sideSign * 0.14, sideColH / 2, 0);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    sideHallUnit.add(backWall);

    [-4.1, 4.1].forEach((gz) => {
      const gableWall = new THREE.Mesh(
        new THREE.BoxGeometry(6.3, sideColH + 0.15, 0.22),
        palette.courtyardEarthWall
      );
      gableWall.position.set(0, sideColH / 2, gz);
      gableWall.receiveShadow = true;
      sideHallUnit.add(gableWall);
    });

    const portalHeader = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 2.8),
      palette.darkWalnutWood
    );
    portalHeader.position.set(localFrontColX, 2.95, 0);
    sideHallUnit.add(portalHeader);

    addArchitecturalPortal(sideHallUnit, {
      x: localFrontColX,
      yFloor: 0.025,
      z: 0,
      axis: 'z',
      dirSign: sideSign > 0 ? 1 : -1,
      clearWidth: 2.42,
      portalHeight: 2.82,
      hasPlaque: true,
      stoneMat: palette.stonePedestal,
      woodMat: palette.naturalWood,
      beamMat: palette.darkWalnutWood,
      trimMat: palette.roofRidgeSlate,
    });

    [-2.7, 2.7].forEach((bz) => {
      addLatticeWallBay(
        sideHallUnit,
        localFrontColX,
        0,
        bz,
        2.35,
        sideColH - 0.24,
        'z',
        palette.charcoalGraniteTrim,
        palette.naturalWood,
        palette.darkWalnutWood
      );
    });

    [-2.1, 2.1].forEach((az) => {
      const sideAltarBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.56, 1.9),
        palette.charcoalGraniteTrim
      );
      sideAltarBase.position.set(sideSign * 1.85, 0.28, az);
      sideAltarBase.castShadow = true;
      sideAltarBase.receiveShadow = true;
      sideHallUnit.add(sideAltarBase);
    });

    const sideRoof = createChineseCurvedRoof({
      eaveHalfW: 4.55,
      eaveHalfD: 3.62,
      ridgeHalfW: 2.95,
      topHalfD: 0,
      height: 1.65,
      cornerLift: 0.24,
      withMainRidge: true,
      roofMat: palette.roofTileCharcoal,
      ridgeMat: palette.roofRidgeSlate,
      woodMat: palette.darkWalnutWood,
    });
    sideRoof.rotation.y = Math.PI / 2;
    sideRoof.position.set(-sideSign * 0.02, sideColH + 0.12, 0);
    sideHallUnit.add(sideRoof);
  });

  // =========================================================================
  // 6. SOUTH ENTRANCE GATE UNIT (山门) — (0, +0.240, +14.000)
  // =========================================================================
  const gateY = 0.24;
  const gateZ = 14.0;
  const gateColH = 2.95;

  const southGateUnit = new THREE.Group();
  southGateUnit.name = 'SouthGateUnit';
  southGateUnit.position.set(0, gateY, gateZ);
  group.add(southGateUnit);

  // Gate Plinth (X ∈ [-3.40,+3.40], Z ∈ [+12.60,+15.40], Y ∈ [-0.120,+0.240])
  const gatePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.36, 2.8),
    palette.charcoalGraniteTrim
  );
  gatePlinth.position.set(0, -0.18, 0);
  gatePlinth.receiveShadow = true;
  gatePlinth.castShadow = true;
  southGateUnit.add(gatePlinth);

  // South Gate Inner Stairs (Z ∈ [+11.80,+12.60], 2 steps, 0.000 -> +0.240m onto Forecourt)
  addGraniteStairs(
    group,
    0,
    12.2,
    3.5,
    0.8,
    gateY,
    2,
    'z-',
    palette.stonePedestal,
    palette.charcoalGraniteTrim,
    0
  );

  // Independent SouthGateArrivalPad (X ∈ [-2.15,+2.15], Z ∈ [+15.40,+16.80], Y ∈ [-0.100,+0.025m])
  const southGateArrivalPad = new THREE.Mesh(
    new THREE.BoxGeometry(4.3, 0.125, 1.4),
    palette.charcoalGraniteTrim
  );
  southGateArrivalPad.name = 'SouthGateArrivalPad';
  southGateArrivalPad.position.set(0, -0.0375, 16.1);
  southGateArrivalPad.receiveShadow = true;
  group.add(southGateArrivalPad);

  // South Gate Outer Stairs (X ∈ [-1.75,+1.75], Z ∈ [+15.40,+16.20], axis='z+', baseY=+0.025 -> +0.240m, 2 steps @ 0.1075m)
  addGraniteStairs(
    group,
    0,
    15.8,
    3.5,
    0.8,
    gateY - 0.025,
    2,
    'z+',
    palette.stonePedestal,
    palette.charcoalGraniteTrim,
    0.025
  );

  [-3.2, -1.7, 1.7, 3.2].forEach((gx) => {
    registerColumn(gx, gateY, gateZ - 1.15, 0.17, gateColH);
    registerColumn(gx, gateY, gateZ + 1.15, 0.17, gateColH);
    addCorbelBracket(southGateUnit, gx, gateColH, -1.15, palette.darkWalnutWood);
  });

  [-1.15, 1.15].forEach((lz) => {
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.24, 0.22),
      palette.darkWalnutWood
    );
    lintel.position.set(0, gateColH - 0.1, lz);
    southGateUnit.add(lintel);
  });

  [-2.45, 2.45].forEach((wx) => {
    const gateSideWall = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, gateColH - 0.15, 0.22),
      palette.courtyardEarthWall
    );
    gateSideWall.position.set(wx, (gateColH - 0.15) / 2, 0);
    gateSideWall.castShadow = true;
    gateSideWall.receiveShadow = true;
    southGateUnit.add(gateSideWall);
  });

  const gateCeiling = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 0.14, 2.4),
    palette.darkTimberCeiling
  );
  gateCeiling.position.set(0, gateColH + 0.18, 0);
  southGateUnit.add(gateCeiling);

  addArchitecturalPortal(southGateUnit, {
    x: 0,
    yFloor: 0,
    z: 0,
    axis: 'x',
    dirSign: -1,
    clearWidth: 3.04,
    portalHeight: gateColH - 0.14,
    hasPlaque: false,
    stoneMat: palette.stonePedestal,
    woodMat: palette.naturalWood,
    beamMat: palette.darkWalnutWood,
    trimMat: palette.roofRidgeSlate,
  });

  const gateRoof = createChineseCurvedRoof({
    eaveHalfW: 3.75,
    eaveHalfD: 1.85,
    ridgeHalfW: 2.5,
    topHalfD: 0,
    height: 1.35,
    cornerLift: 0.24,
    withMainRidge: true,
    roofMat: palette.roofTileCharcoal,
    ridgeMat: palette.roofRidgeSlate,
    woodMat: palette.darkWalnutWood,
  });
  gateRoof.position.set(0, gateColH + 0.12, 0);
  southGateUnit.add(gateRoof);

  // =========================================================================
  // 7. INSTANCED DARK ROSEWOOD COLUMNS & STONE BASES (Root World Coordinates)
  //    Bell & Drum Pavilions reserved at (±10.200, +10.800) — no geometry built
  // =========================================================================
  if (columnSpecs.length > 0) {
    const colGeo = new THREE.CylinderGeometry(1, 1.05, 1, 18);
    const colInst = new THREE.InstancedMesh(
      colGeo,
      palette.deepRosewoodPillar,
      columnSpecs.length
    );
    colInst.castShadow = true;
    colInst.receiveShadow = true;

    const baseGeo = new THREE.CylinderGeometry(1.38, 1.56, 0.16, 12);
    const baseInst = new THREE.InstancedMesh(
      baseGeo,
      palette.stonePedestal,
      columnSpecs.length
    );
    baseInst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    columnSpecs.forEach((spec, idx) => {
      dummy.position.set(spec.x, spec.yBase + spec.height / 2, spec.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(spec.radius, spec.height, spec.radius);
      dummy.updateMatrix();
      colInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(spec.x, spec.yBase + 0.08, spec.z);
      dummy.scale.set(spec.radius, 1, spec.radius);
      dummy.updateMatrix();
      baseInst.setMatrixAt(idx, dummy.matrix);
    });

    colInst.instanceMatrix.needsUpdate = true;
    baseInst.instanceMatrix.needsUpdate = true;
    colInst.computeBoundingSphere();
    baseInst.computeBoundingSphere();

    group.add(colInst);
    group.add(baseInst);
  }

  // =========================================================================
  // 8. PAIR OF STONE COURTYARD LANTERNS ON MID-LANDING (±3.800, +0.900, -5.200)
  // =========================================================================
  [-3.8, 3.8].forEach((lx) => {
    addCourtyardLantern(
      group,
      lx,
      0.9,
      -5.2,
      palette.charcoalGraniteTrim,
      palette.bronzeMetal,
      palette.lampFlame,
      courtyardSconceHalos,
      courtyardSconceFlames
    );
  });

  return {
    group,
    courtyardSconceHalos,
    courtyardSconceFlames,
  };
}

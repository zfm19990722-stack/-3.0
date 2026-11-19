import * as THREE from 'three';
import { TempleMaterialPalette } from './templeProceduralMaterials';

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
 * Constructs the connected Chinese Buddhist courtyard compound (四合院)
 * with strictly non-overlapping roof lines, clear open courtyard center,
 * deepened Main Hall (10.97m clear), widened Side Halls (5.91m clear E-W),
 * and explicit open doorway architecture:
 * - Main Hall (大雄宝殿) on North axis (Z: -20.0..-8.4, terrace to -5.4)
 * - Left & Right Side Halls (东西偏殿) (X: ±[6.6..13.2], Z: -4.2..+4.2)
 * - Continuous Covered Corridors (NW/NE/SW/SE 回廊 + square corner caps)
 * - South Entrance Gate (山门) (Z: +8.4..+11.2)
 * - Enclosing Compound Perimeter Wall (院墙)
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
  // 1. CONTINUOUS CHARCOAL STONE COURTYARD FLOOR & CENTRAL AXIAL APPROACH
  // =========================================================================
  const courtyardFloor = new THREE.Mesh(
    new THREE.BoxGeometry(27.8, 0.08, 32.6),
    palette.charcoalStonePaving
  );
  courtyardFloor.position.set(0, -0.04, -4.3);
  courtyardFloor.receiveShadow = true;
  group.add(courtyardFloor);

  // Dressed granite central axial pathway (御道) from South Gate steps to Main Hall stairs
  const axialPath = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.025, 11.8),
    palette.charcoalGraniteTrim
  );
  axialPath.position.set(0, 0.012, 1.7);
  axialPath.receiveShadow = true;
  group.add(axialPath);

  [-1.34, 1.34].forEach((ex) => {
    const borderStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.03, 11.8),
      palette.stonePedestal
    );
    borderStrip.position.set(ex, 0.015, 1.7);
    borderStrip.receiveShadow = true;
    group.add(borderStrip);
  });

  // =========================================================================
  // 2. MAIN HALL (大雄宝殿) — NORTH AXIS (Z: -20.0 to -8.4, internal 10.97m deep)
  // =========================================================================
  const mainHallY = 0.6;
  const mainColH = 4.75;

  // Main Hall Body Plinth (Z: -20.0 to -8.4, W: 15.6m) & Sunlit Front Terrace (月台 Z: -8.4 to -5.4, W: 13.2m)
  const mainHallBodyPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(15.6, mainHallY, 11.6),
    palette.charcoalGraniteTrim
  );
  mainHallBodyPlinth.position.set(0, mainHallY / 2, -14.2);
  mainHallBodyPlinth.receiveShadow = true;
  mainHallBodyPlinth.castShadow = true;
  group.add(mainHallBodyPlinth);

  const mainTerracePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(13.2, mainHallY, 3.0),
    palette.charcoalGraniteTrim
  );
  mainTerracePlinth.position.set(0, mainHallY / 2, -6.9);
  mainTerracePlinth.receiveShadow = true;
  mainTerracePlinth.castShadow = true;
  group.add(mainTerracePlinth);

  const mainHallFloorTop = new THREE.Mesh(
    new THREE.BoxGeometry(14.8, 0.03, 11.6),
    palette.stonePedestal
  );
  mainHallFloorTop.position.set(0, mainHallY + 0.015, -14.2);
  mainHallFloorTop.receiveShadow = true;
  group.add(mainHallFloorTop);

  // Central Front Stone Stairs (御阶: Z = -5.4 to -4.2)
  addGraniteStairs(
    group,
    0,
    -4.8,
    4.2,
    1.2,
    mainHallY,
    3,
    'z+',
    palette.stonePedestal,
    palette.charcoalGraniteTrim
  );

  // Low stone terrace coping (栏板) flanking stairs along Z = -5.5
  [-4.35, 4.35].forEach((cx) => {
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 0.22, 0.16),
      palette.stonePedestal
    );
    curb.position.set(cx, mainHallY + 0.11, -5.5);
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  });

  [-6.45, -2.25, 2.25, 6.45].forEach((px) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.42, 0.22),
      palette.stonePedestal
    );
    post.position.set(px, mainHallY + 0.21, -5.5);
    post.castShadow = true;
    group.add(post);
  });

  // Main Hall 5-Bay × 3-Depth Timber Column Grid (Z: -8.65 front -> -19.70 north)
  const mainColXs = [-7.1, -4.45, -1.9, 1.9, 4.45, 7.1];
  mainColXs.forEach((cx) => {
    registerColumn(cx, mainHallY, -8.65, 0.24, mainColH);
    registerColumn(cx, mainHallY, -19.7, 0.24, mainColH);
    addCorbelBracket(group, cx, mainHallY + mainColH, -8.65, palette.darkWalnutWood);
  });
  [-7.1, 7.1].forEach((sx) => {
    registerColumn(sx, mainHallY, -12.35, 0.24, mainColH);
    registerColumn(sx, mainHallY, -16.05, 0.24, mainColH);
  });
  // Two sets of tall interior nave columns creating authentic deep 3-bay interior space
  [-4.45, -1.9, 1.9, 4.45].forEach((ix) => {
    registerColumn(ix, mainHallY, -12.95, 0.22, mainColH + 0.72);
    registerColumn(ix, mainHallY, -16.45, 0.22, mainColH + 0.72);
  });

  const mainFrontBeam = new THREE.Mesh(
    new THREE.BoxGeometry(14.6, 0.3, 0.28),
    palette.darkWalnutWood
  );
  mainFrontBeam.position.set(0, mainHallY + mainColH - 0.12, -8.65);
  mainFrontBeam.castShadow = true;
  group.add(mainFrontBeam);

  const mainRearBeam = mainFrontBeam.clone();
  mainRearBeam.position.z = -19.7;
  group.add(mainRearBeam);

  mainColXs.forEach((cx) => {
    const crossBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.32, 11.35),
      palette.darkWalnutWood
    );
    crossBeam.position.set(cx, mainHallY + mainColH + 0.1, -14.18);
    group.add(crossBeam);
  });

  const mainCeiling = new THREE.Mesh(
    new THREE.BoxGeometry(14.6, 0.16, 11.4),
    palette.darkTimberCeiling
  );
  mainCeiling.position.set(0, mainHallY + mainColH + 0.4, -14.18);
  group.add(mainCeiling);

  const mainNorthWall = new THREE.Mesh(
    new THREE.BoxGeometry(14.6, mainColH + 0.2, 0.26),
    palette.courtyardEarthWall
  );
  mainNorthWall.position.set(0, mainHallY + (mainColH + 0.2) / 2, -19.82);
  mainNorthWall.receiveShadow = true;
  group.add(mainNorthWall);

  const altarBackdropWood = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 4.5, 0.16),
    palette.darkWalnutWood
  );
  altarBackdropWood.position.set(0, mainHallY + 2.25, -19.62);
  group.add(altarBackdropWood);

  [-7.25, 7.25].forEach((wx) => {
    const sideWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, mainColH + 0.2, 11.2),
      palette.courtyardEarthWall
    );
    sideWall.position.set(wx, mainHallY + (mainColH + 0.2) / 2, -14.22);
    sideWall.receiveShadow = true;
    sideWall.castShadow = true;
    group.add(sideWall);
  });

  // Main Hall South Facade: wide open 3.32m central bay with open doors & lintel plaque
  const centralPortalLintel = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.28, 0.24),
    palette.darkWalnutWood
  );
  centralPortalLintel.position.set(0, mainHallY + 4.0, -8.65);
  group.add(centralPortalLintel);

  addArchitecturalPortal(group, {
    x: 0,
    yFloor: mainHallY + 0.03,
    z: -8.65,
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
      group,
      bx,
      mainHallY,
      -8.65,
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
      group,
      bx,
      mainHallY,
      -8.65,
      2.4,
      mainColH - 0.3,
      'x',
      palette.charcoalGraniteTrim,
      palette.naturalWood,
      palette.darkWalnutWood
    );
  });

  // Proportioned Double-Eave Roof (重檐歇山顶: front lower eave stops cleanly at Z = -7.80)
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
  mainLowerEaveRoof.position.set(0, mainHallY + mainColH + 0.14, -14.15);
  group.add(mainLowerEaveRoof);

  const upperNeck = new THREE.Mesh(
    new THREE.BoxGeometry(12.6, 0.58, 8.8),
    palette.darkWalnutWood
  );
  upperNeck.position.set(0, mainHallY + mainColH + 1.36, -14.15);
  upperNeck.castShadow = true;
  group.add(upperNeck);

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
  mainUpperRoof.position.set(0, mainHallY + mainColH + 1.6, -14.15);
  group.add(mainUpperRoof);

  // =========================================================================
  // 3. LEFT & RIGHT SIDE HALLS (东西偏殿) — X: ±[6.6, 13.2], internal 5.91m E-W clear
  // =========================================================================
  const sideHallY = 0.3;
  const sideColH = 3.45;

  [-1, 1].forEach((sideSign) => {
    const isWest = sideSign < 0;
    const innerX = sideSign * 6.6;
    const outerX = sideSign * 13.2;
    const centerX = sideSign * 9.9; // 6.6m wide plinth
    const frontColX = sideSign * 6.85;
    const rearColX = sideSign * 12.92;

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, sideHallY, 8.4),
      palette.charcoalGraniteTrim
    );
    plinth.position.set(centerX, sideHallY / 2, 0);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    group.add(plinth);

    const floorSurface = new THREE.Mesh(
      new THREE.BoxGeometry(6.1, 0.025, 7.9),
      palette.stonePedestal
    );
    floorSurface.position.set(centerX, sideHallY + 0.012, 0);
    floorSurface.receiveShadow = true;
    group.add(floorSurface);

    addGraniteStairs(
      group,
      innerX - sideSign * 0.35,
      0,
      2.8,
      0.7,
      sideHallY,
      2,
      isWest ? 'x+' : 'x-',
      palette.stonePedestal,
      palette.charcoalGraniteTrim
    );

    const sideColZs = [-4.0, -1.4, 1.4, 4.0];
    sideColZs.forEach((cz) => {
      registerColumn(frontColX, sideHallY, cz, 0.18, sideColH);
      registerColumn(rearColX, sideHallY, cz, 0.18, sideColH);
      addCorbelBracket(
        group,
        frontColX,
        sideHallY + sideColH,
        cz,
        palette.darkWalnutWood
      );

      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(6.1, 0.22, 0.2),
        palette.darkWalnutWood
      );
      beam.position.set(centerX, sideHallY + sideColH + 0.06, cz);
      group.add(beam);
    });

    [frontColX, rearColX].forEach((lx) => {
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.24, 8.2),
        palette.darkWalnutWood
      );
      lintel.position.set(lx, sideHallY + sideColH - 0.1, 0);
      group.add(lintel);
    });

    const sideCeiling = new THREE.Mesh(
      new THREE.BoxGeometry(6.1, 0.14, 7.9),
      palette.darkTimberCeiling
    );
    sideCeiling.position.set(centerX, sideHallY + sideColH + 0.24, 0);
    group.add(sideCeiling);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, sideColH + 0.15, 8.1),
      palette.courtyardEarthWall
    );
    backWall.position.set(outerX - sideSign * 0.14, sideHallY + sideColH / 2, 0);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    group.add(backWall);

    [-4.1, 4.1].forEach((gz) => {
      const gableWall = new THREE.Mesh(
        new THREE.BoxGeometry(6.3, sideColH + 0.15, 0.22),
        palette.courtyardEarthWall
      );
      gableWall.position.set(centerX, sideHallY + sideColH / 2, gz);
      gableWall.receiveShadow = true;
      group.add(gableWall);
    });

    const portalHeader = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 2.8),
      palette.darkWalnutWood
    );
    portalHeader.position.set(frontColX, sideHallY + 2.95, 0);
    group.add(portalHeader);

    addArchitecturalPortal(group, {
      x: frontColX,
      yFloor: sideHallY + 0.025,
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
        group,
        frontColX,
        sideHallY,
        bz,
        2.35,
        sideColH - 0.24,
        'z',
        palette.charcoalGraniteTrim,
        palette.naturalWood,
        palette.darkWalnutWood
      );
    });

    // Dignified side-hall altar bases shifted back for >0.60m Phase 3 shrine clearance
    [-2.1, 2.1].forEach((az) => {
      const sideAltarBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.56, 1.9),
        palette.charcoalGraniteTrim
      );
      sideAltarBase.position.set(sideSign * 11.75, sideHallY + 0.28, az);
      sideAltarBase.castShadow = true;
      sideAltarBase.receiveShadow = true;
      group.add(sideAltarBase);
    });

    // Widened Side Hall Roof: Z ∈ [-4.55, +4.55], inner X eave at ±6.26m (12.52m open yard!)
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
    sideRoof.position.set(sideSign * 9.88, sideHallY + sideColH + 0.12, 0);
    group.add(sideRoof);
  });

  // =========================================================================
  // 4. CONTINUOUS COVERED CORRIDORS (NW, NE, SW, SE 回廊) — ZERO ROOF OVERLAP
  // =========================================================================
  const corrY = 0.3;
  const corrColH = 2.4;
  const corrInnerX = 6.6;
  const corrOuterX = 8.6;
  const corrMidX = 7.6; // 2.0m clear corridor

  const addCorridorBenchRail = (
    x1: number,
    z1: number,
    x2: number,
    z2: number
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.3) return;
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const isAlongZ = Math.abs(dz) >= Math.abs(dx);

    const bench = new THREE.Mesh(
      isAlongZ
        ? new THREE.BoxGeometry(0.3, 0.07, len - 0.22)
        : new THREE.BoxGeometry(len - 0.22, 0.07, 0.3),
      palette.naturalWood
    );
    bench.position.set(midX, corrY + 0.4, midZ);
    group.add(bench);

    const topRail = new THREE.Mesh(
      isAlongZ
        ? new THREE.BoxGeometry(0.11, 0.08, len - 0.22)
        : new THREE.BoxGeometry(len - 0.22, 0.08, 0.11),
      palette.darkWalnutWood
    );
    topRail.position.set(midX, corrY + 0.74, midZ);
    group.add(topRail);
  };

  [-1, 1].forEach((sideSign) => {
    // 4A. North Link Corridor (Z: -8.4 to -4.2, bridging Side Hall to Main Hall terrace)
    const nwPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, corrY, 4.2),
      palette.charcoalGraniteTrim
    );
    nwPlinth.position.set(sideSign * corrMidX, corrY / 2, -6.3);
    nwPlinth.receiveShadow = true;
    group.add(nwPlinth);

    // Granite transition steps bridging Y=0.30 corridor up to Y=0.60 Main Hall terrace
    addGraniteStairs(
      group,
      sideSign * 6.95,
      -7.08,
      1.1,
      0.7,
      0.3,
      2,
      sideSign < 0 ? 'x-' : 'x+',
      palette.stonePedestal,
      palette.charcoalGraniteTrim,
      corrY
    );

    // Granite steps bridging Y=0.00 courtyard up to Y=0.30 corridor walk between terrace & side hall
    addGraniteStairs(
      group,
      sideSign * 6.3,
      -4.8,
      0.86,
      0.6,
      0.3,
      2,
      sideSign < 0 ? 'x+' : 'x-',
      palette.stonePedestal,
      palette.charcoalGraniteTrim,
      0
    );

    [-7.95, -6.2, -4.35].forEach((cz) => {
      registerColumn(sideSign * (corrInnerX + 0.18), corrY, cz, 0.13, corrColH);
      registerColumn(sideSign * (corrOuterX - 0.18), corrY, cz, 0.13, corrColH);
    });
    addCorridorBenchRail(
      sideSign * (corrInnerX + 0.18),
      -6.2,
      sideSign * (corrInnerX + 0.18),
      -4.35
    );

    const nwLintel = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 4.2),
      palette.darkWalnutWood
    );
    nwLintel.position.set(sideSign * (corrInnerX + 0.18), corrY + corrColH - 0.04, -6.3);
    group.add(nwLintel);

    // NW/NE Corridor Roof: Z ∈ [-7.70, -4.65], cleanly between Main Hall (-7.80) & Side Hall (-4.55)
    const nwRoof = createChineseCurvedRoof({
      eaveHalfW: 1.52,
      eaveHalfD: 1.32,
      ridgeHalfW: 1.2,
      topHalfD: 0,
      height: 0.72,
      cornerLift: 0.12,
      withMainRidge: true,
      roofMat: palette.roofTileCharcoal,
      ridgeMat: palette.roofRidgeSlate,
      woodMat: palette.darkWalnutWood,
    });
    nwRoof.rotation.y = Math.PI / 2;
    nwRoof.position.set(sideSign * corrMidX, corrY + corrColH + 0.04, -6.18);
    group.add(nwRoof);

    // 4B. South N-S Corridor Wing (Z: +4.2 to +8.6)
    const swPlinthNS = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, corrY, 4.4),
      palette.charcoalGraniteTrim
    );
    swPlinthNS.position.set(sideSign * corrMidX, corrY / 2, 6.4);
    swPlinthNS.receiveShadow = true;
    group.add(swPlinthNS);

    const swColZs = [4.35, 6.45, 8.55];
    swColZs.forEach((cz, idx) => {
      registerColumn(sideSign * (corrInnerX + 0.18), corrY, cz, 0.13, corrColH);
      registerColumn(sideSign * (corrOuterX - 0.18), corrY, cz, 0.13, corrColH);
      if (idx === 0) {
        addCorridorBenchRail(
          sideSign * (corrInnerX + 0.18),
          cz,
          sideSign * (corrInnerX + 0.18),
          swColZs[idx + 1]
        );
      }
    });

    const swLintelNS = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 4.4),
      palette.darkWalnutWood
    );
    swLintelNS.position.set(
      sideSign * (corrInnerX + 0.18),
      corrY + corrColH - 0.04,
      6.4
    );
    group.add(swLintelNS);

    // Roof Z ∈ [+4.68, +8.12]: cleanly between Side Hall (+4.55) & Corner Cap (+8.36)
    const swRoofNS = createChineseCurvedRoof({
      eaveHalfW: 1.72,
      eaveHalfD: 1.3,
      ridgeHalfW: 1.35,
      topHalfD: 0,
      height: 0.72,
      cornerLift: 0.12,
      withMainRidge: true,
      roofMat: palette.roofTileCharcoal,
      ridgeMat: palette.roofRidgeSlate,
      woodMat: palette.darkWalnutWood,
    });
    swRoofNS.rotation.y = Math.PI / 2;
    swRoofNS.position.set(sideSign * corrMidX, corrY + corrColH + 0.04, 6.4);
    group.add(swRoofNS);

    // 4C. Corner Pavilion Junction (X: ±[6.6..8.6], Z: [+8.6..+10.6])
    const cornerPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, corrY, 2.0),
      palette.charcoalGraniteTrim
    );
    cornerPlinth.position.set(sideSign * corrMidX, corrY / 2, 9.6);
    cornerPlinth.receiveShadow = true;
    group.add(cornerPlinth);

    registerColumn(sideSign * (corrInnerX + 0.18), corrY, 10.42, 0.13, corrColH);
    registerColumn(sideSign * (corrOuterX - 0.18), corrY, 10.42, 0.13, corrColH);

    // Square Hip-Pyramid Corner Cap Roof (攒尖角亭顶: X ±[6.36..8.84], Z [8.36..10.84])
    const cornerCapRoof = createChineseCurvedRoof({
      eaveHalfW: 1.24,
      eaveHalfD: 1.24,
      ridgeHalfW: 0.05,
      topHalfD: 0,
      height: 0.88,
      cornerLift: 0.16,
      withMainRidge: true,
      roofMat: palette.roofTileCharcoal,
      ridgeMat: palette.roofRidgeSlate,
      woodMat: palette.darkWalnutWood,
    });
    cornerCapRoof.position.set(sideSign * corrMidX, corrY + corrColH + 0.04, 9.6);
    group.add(cornerCapRoof);

    // 4D. South E-W Corridor Wing (X: ±[3.4, 6.6], Z: [+8.6, +10.6])
    const swPlinthEW = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, corrY, 2.0),
      palette.charcoalGraniteTrim
    );
    swPlinthEW.position.set(sideSign * 5.0, corrY / 2, 9.6);
    swPlinthEW.receiveShadow = true;
    group.add(swPlinthEW);

    const ewColXs = [3.55, 5.1, 6.65];
    ewColXs.forEach((cx, idx) => {
      registerColumn(sideSign * cx, corrY, 8.78, 0.13, corrColH);
      registerColumn(sideSign * cx, corrY, 10.42, 0.13, corrColH);
      if (idx < ewColXs.length - 1) {
        addCorridorBenchRail(
          sideSign * cx,
          8.78,
          sideSign * ewColXs[idx + 1],
          8.78
        );
      }
    });

    const swLintelEW = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.18, 0.18),
      palette.darkWalnutWood
    );
    swLintelEW.position.set(sideSign * 5.0, corrY + corrColH - 0.04, 8.78);
    group.add(swLintelEW);

    // E-W Roof: X ∈ ±[3.87..6.17], cleanly between South Gate (±3.75) & Corner Cap (±6.36)
    const swRoofEW = createChineseCurvedRoof({
      eaveHalfW: 1.15,
      eaveHalfD: 1.28,
      ridgeHalfW: 0.9,
      topHalfD: 0,
      height: 0.72,
      cornerLift: 0.12,
      withMainRidge: true,
      roofMat: palette.roofTileCharcoal,
      ridgeMat: palette.roofRidgeSlate,
      woodMat: palette.darkWalnutWood,
    });
    swRoofEW.position.set(sideSign * 5.02, corrY + corrColH + 0.04, 9.6);
    group.add(swRoofEW);
  });

  // =========================================================================
  // 5. SOUTH ENTRANCE GATE (山门) — X: [-3.4, +3.4], Z: [+8.4, +11.2]
  // =========================================================================
  const gateY = 0.3;
  const gateColH = 2.95;

  const gatePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, gateY, 2.8),
    palette.charcoalGraniteTrim
  );
  gatePlinth.position.set(0, gateY / 2, 9.8);
  gatePlinth.receiveShadow = true;
  gatePlinth.castShadow = true;
  group.add(gatePlinth);

  // Courtyard-facing gate steps down to Z = +7.65
  addGraniteStairs(
    group,
    0,
    8.05,
    3.5,
    0.75,
    gateY,
    2,
    'z-',
    palette.stonePedestal,
    palette.charcoalGraniteTrim
  );

  [-3.2, -1.7, 1.7, 3.2].forEach((gx) => {
    registerColumn(gx, gateY, 8.65, 0.17, gateColH);
    registerColumn(gx, gateY, 10.95, 0.17, gateColH);
    addCorbelBracket(group, gx, gateY + gateColH, 8.65, palette.darkWalnutWood);
  });

  [8.65, 10.95].forEach((gz) => {
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.24, 0.22),
      palette.darkWalnutWood
    );
    lintel.position.set(0, gateY + gateColH - 0.1, gz);
    group.add(lintel);
  });

  [-2.45, 2.45].forEach((wx) => {
    const gateSideWall = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, gateColH - 0.15, 0.22),
      palette.courtyardEarthWall
    );
    gateSideWall.position.set(wx, gateY + (gateColH - 0.15) / 2, 9.8);
    gateSideWall.castShadow = true;
    gateSideWall.receiveShadow = true;
    group.add(gateSideWall);
  });

  const gateCeiling = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 0.14, 2.4),
    palette.darkTimberCeiling
  );
  gateCeiling.position.set(0, gateY + gateColH + 0.18, 9.8);
  group.add(gateCeiling);

  // Open inward wooden gate leaves & stone door pillows at South Gate (Z = 9.8)
  addArchitecturalPortal(group, {
    x: 0,
    yFloor: gateY,
    z: 9.8,
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

  // South Gate Roof: X ∈ [-3.75..+3.75], Z ∈ [+7.95..+11.65]
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
  gateRoof.position.set(0, gateY + gateColH + 0.12, 9.8);
  group.add(gateRoof);

  // =========================================================================
  // 6. COMPOUND PERIMETER ENCLOSURE WALLS (院墙)
  // =========================================================================
  const addPerimeterWallSegment = (
    x: number,
    z: number,
    len: number,
    orient: 'x' | 'z',
    height = 2.65
  ) => {
    const base = new THREE.Mesh(
      orient === 'x'
        ? new THREE.BoxGeometry(len, 0.55, 0.3)
        : new THREE.BoxGeometry(0.3, 0.55, len),
      palette.charcoalGraniteTrim
    );
    base.position.set(x, 0.275, z);
    base.receiveShadow = true;
    group.add(base);

    const wall = new THREE.Mesh(
      orient === 'x'
        ? new THREE.BoxGeometry(len, height - 0.55, 0.24)
        : new THREE.BoxGeometry(0.24, height - 0.55, len),
      palette.courtyardEarthWall
    );
    wall.position.set(x, 0.55 + (height - 0.55) / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    const cap = new THREE.Mesh(
      orient === 'x'
        ? new THREE.BoxGeometry(len + 0.1, 0.14, 0.42)
        : new THREE.BoxGeometry(0.42, 0.14, len + 0.1),
      palette.roofRidgeSlate
    );
    cap.position.set(x, height + 0.07, z);
    cap.castShadow = true;
    group.add(cap);
  };

  [-1, 1].forEach((sideSign) => {
    addPerimeterWallSegment(sideSign * 8.7, -12.1, 15.8, 'z');
    addPerimeterWallSegment(sideSign * 8.2, -19.95, 1.2, 'x');
    addPerimeterWallSegment(sideSign * 8.7, 7.4, 6.4, 'z');
    addPerimeterWallSegment(sideSign * 6.05, 10.65, 5.4, 'x');
  });

  // =========================================================================
  // 7. INSTANCED DARK ROSEWOOD COLUMNS & STONE COLUMN BASES (柱础)
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
  // 8. PAIR OF STONE COURTYARD LANTERNS FLANKING MAIN HALL STEPS
  // =========================================================================
  [-3.0, 3.0].forEach((lx) => {
    addCourtyardLantern(
      group,
      lx,
      0,
      -4.25,
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

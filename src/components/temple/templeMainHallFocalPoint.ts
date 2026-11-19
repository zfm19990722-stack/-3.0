import * as THREE from 'three';
import { TempleMaterialPalette } from './templeProceduralMaterials';
import { TempleModelSlot } from './templeModelManifest';

export interface MainHallFocalPointBuild {
  /** Stepped Sumeru dais + Lotus pedestal sitting on Main Hall floor [0, 0.63, -17.70] */
  pedestalGroup: THREE.Group;
  /** Empty GLB mount seated flush on lotus pedestal crown (world [0, 2.13, -17.70], facing +Z south) */
  buddhaModelAnchor: THREE.Group;
  /** Traditional dark hardwood Chinese Buddhist altar [0, 0.63, -14.35], top at world Y = 1.49 */
  altarGroup: THREE.Group;
  /** Carved wooden shrine niche & restrained architectural halo behind the dais [0, 0.63, -19.25] */
  backdropGroup: THREE.Group;
}

/**
 * Creates a watertight sculpted 3D lotus petal geometry with double-curvature
 * S-curve bend and cupped longitudinal concavity.
 */
function createLotusPetalGeometry(
  width: number,
  height: number,
  depth: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width * 0.56, height * 0.28, width * 0.44, height * 0.74);
  shape.quadraticCurveTo(width * 0.22, height * 0.96, 0, height);
  shape.quadraticCurveTo(-width * 0.22, height * 0.96, -width * 0.44, height * 0.74);
  shape.quadraticCurveTo(-width * 0.56, height * 0.28, 0, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.42,
    bevelSize: width * 0.065,
    bevelSegments: 2,
    curveSegments: 12,
  });

  // Shift so base is y = 0, centered horizontally in X & Z
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const centerX = (bb.min.x + bb.max.x) * 0.5;
  const centerZ = (bb.min.z + bb.max.z) * 0.5;
  geo.translate(-centerX, -bb.min.y, -centerZ);

  // Deform vertices for natural cupped belly & softly curled lotus tip
  const pos = geo.attributes.position;
  const halfW = Math.max(width * 0.5, 0.001);
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const v = THREE.MathUtils.clamp(vy / height, 0, 1);
    const u = THREE.MathUtils.clamp(vx / halfW, -1, 1);
    const bellyBend =
      Math.sin(v * Math.PI) * (height * 0.145) -
      Math.pow(v, 2.2) * (height * 0.055);
    const cupBend = -(u * u) * (width * 0.11) * Math.sin(v * Math.PI * 0.92);
    pos.setZ(i, vz + bellyBend + cupBend);
  }

  // Re-center vertically around petal mid-height for clean pivot placement
  geo.translate(0, -height * 0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the Scheme A1 charcoal-granite & limestone Sumeru dais (0.86m high -> Y=1.490m)
 * topped by a 20-petal sculpted double-lotus pedestal (0.64m high -> crown Y=2.130m),
 * exposing `buddhaModelAnchor` cleanly with no placeholder statue meshes.
 */
export function buildLotusPedestalAndBuddhaAnchor(
  palette: TempleMaterialPalette,
  slot: TempleModelSlot
): { pedestalGroup: THREE.Group; buddhaModelAnchor: THREE.Group } {
  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'temple-main-hall-sumeru-lotus-pedestal';
  pedestalGroup.position.set(...slot.anchorPosition);

  // Restrained contact shadow bounded strictly inside [Z -1.17, +1.17] (no overlap with backdrop)
  const contactMat = new THREE.MeshBasicMaterial({
    map: palette.contactShadowTexture,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.24, 2.34),
    contactMat
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.004;
  pedestalGroup.add(contactShadow);

  // 1. Stepped Traditional Sumeru Architectural Dais (须弥座: local y = 0.00 -> 0.86, world Y = 1.490m)
  // 下枋底座 (2.90m W × 2.15m D × 0.24m H)
  const daisLower = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.24, 2.15),
    palette.charcoalGraniteTrim
  );
  daisLower.position.y = 0.12;
  daisLower.castShadow = true;
  daisLower.receiveShadow = true;
  pedestalGroup.add(daisLower);

  // 圭角下枭 (2.52m W × 1.84m D × 0.16m H -> y = 0.24..0.40)
  const daisMidStep = new THREE.Mesh(
    new THREE.BoxGeometry(2.52, 0.16, 1.84),
    palette.stonePedestal
  );
  daisMidStep.position.y = 0.32;
  daisMidStep.castShadow = true;
  daisMidStep.receiveShadow = true;
  pedestalGroup.add(daisMidStep);

  // 束腰 (2.16m W × 1.54m D × 0.26m H -> y = 0.40..0.66)
  const daisWaist = new THREE.Mesh(
    new THREE.BoxGeometry(2.16, 0.26, 1.54),
    palette.charcoalGraniteTrim
  );
  daisWaist.position.y = 0.53;
  daisWaist.castShadow = true;
  daisWaist.receiveShadow = true;
  pedestalGroup.add(daisWaist);

  // 四隅角柱 & 束腰分隔间柱 (quiet carved Sumeru framing)
  const cornerPilasterGeo = new THREE.BoxGeometry(0.14, 0.26, 0.14);
  [
    [-1.02, -0.71],
    [1.02, -0.71],
    [-1.02, 0.71],
    [1.02, 0.71],
  ].forEach(([px, pz]) => {
    const pilaster = new THREE.Mesh(cornerPilasterGeo, palette.stoneRunner);
    pilaster.position.set(px, 0.53, pz);
    pilaster.castShadow = true;
    pilaster.receiveShadow = true;
    pedestalGroup.add(pilaster);
  });

  const dividerGeoFB = new THREE.BoxGeometry(0.11, 0.26, 0.06);
  [-0.4, 0.4].forEach((px) => {
    [-0.76, 0.76].forEach((pz) => {
      const divider = new THREE.Mesh(dividerGeoFB, palette.stoneRunner);
      divider.position.set(px, 0.53, pz);
      divider.castShadow = true;
      pedestalGroup.add(divider);
    });
  });

  // 上枭过渡线脚 (2.34m W × 1.68m D × 0.08m H -> y = 0.66..0.74)
  const daisUpperNeck = new THREE.Mesh(
    new THREE.BoxGeometry(2.34, 0.08, 1.68),
    palette.stonePedestal
  );
  daisUpperNeck.position.y = 0.7;
  daisUpperNeck.castShadow = true;
  daisUpperNeck.receiveShadow = true;
  pedestalGroup.add(daisUpperNeck);

  // 上枋座盘 (2.46m W × 1.78m D × 0.12m H -> y = 0.74..0.86)
  const daisDeck = new THREE.Mesh(
    new THREE.BoxGeometry(2.46, 0.12, 1.78),
    palette.stoneRunner
  );
  daisDeck.position.y = 0.8;
  daisDeck.castShadow = true;
  daisDeck.receiveShadow = true;
  pedestalGroup.add(daisDeck);

  // 2. Sculpted Double-Lotus Pedestal (仰覆莲座: y = 0.86 -> 1.50, crown world Y = 2.130m)
  // 下盘径 1.88m (r=0.94), 束腰径 1.22m (r=0.61), 冠径 1.66m (r=0.83), 高 0.64m
  const lotusGroup = new THREE.Group();
  lotusGroup.name = 'temple-lotus-pedestal';
  lotusGroup.position.y = 0.86;

  const lotusProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.94, 0),
    new THREE.Vector2(0.91, 0.075),
    new THREE.Vector2(0.77, 0.175),
    new THREE.Vector2(0.61, 0.28), // recessed lotus waist (束腰 Ø1.22m)
    new THREE.Vector2(0.62, 0.365),
    new THREE.Vector2(0.8, 0.49),
    new THREE.Vector2(0.865, 0.58),
    new THREE.Vector2(0.83, 0.64), // flat seating crown (Ø1.66m)
    new THREE.Vector2(0, 0.64),
  ];
  const lotusCore = new THREE.Mesh(
    new THREE.LatheGeometry(lotusProfile, 48),
    palette.stoneRunner
  );
  lotusCore.castShadow = true;
  lotusCore.receiveShadow = true;
  lotusGroup.add(lotusCore);

  // Restrained bronze waist ring & muted gold crown fillet
  const waistRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.616, 0.015, 12, 48),
    palette.bronzeMetal
  );
  waistRing.rotation.x = Math.PI / 2;
  waistRing.position.y = 0.322;
  lotusGroup.add(waistRing);

  const crownTrimRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.824, 0.012, 12, 56),
    palette.mutedGold
  );
  crownTrimRing.rotation.x = Math.PI / 2;
  crownTrimRing.position.y = 0.634;
  lotusGroup.add(crownTrimRing);

  // 20 Sculpted Curved Double-Tier Lotus Petals (仰莲 20 瓣 + 覆莲 20 瓣错落)
  const upperPetalGeo = createLotusPetalGeometry(0.25, 0.225, 0.032);
  const lowerPetalGeo = createLotusPetalGeometry(0.255, 0.185, 0.03);
  const petalCount = 20;

  for (let i = 0; i < petalCount; i++) {
    const theta = (i / petalCount) * Math.PI * 2;
    const upperPetal = new THREE.Mesh(upperPetalGeo, palette.stoneRunner);
    upperPetal.position.set(
      Math.sin(theta) * 0.765,
      0.455,
      Math.cos(theta) * 0.765
    );
    upperPetal.rotation.y = theta;
    upperPetal.rotation.x = -0.32;
    upperPetal.castShadow = true;
    upperPetal.receiveShadow = true;
    lotusGroup.add(upperPetal);

    const lowerTheta = theta + Math.PI / petalCount;
    const lowerPetal = new THREE.Mesh(lowerPetalGeo, palette.stonePedestal);
    lowerPetal.position.set(
      Math.sin(lowerTheta) * 0.805,
      0.175,
      Math.cos(lowerTheta) * 0.805
    );
    lowerPetal.rotation.y = lowerTheta;
    lowerPetal.rotation.x = Math.PI - 0.36;
    lowerPetal.castShadow = true;
    lowerPetal.receiveShadow = true;
    lotusGroup.add(lowerPetal);
  }

  pedestalGroup.add(lotusGroup);

  // 3. Dedicated Shakyamuni Buddha GLB Model Slot (world [0, 2.13, -17.70], facing +Z south)
  // Intentionally left bare in Phase 2A — zero placeholder spheres, cylinders, or stone tablets.
  const mountOffsetY = slot.pedestalTopOffsetY ?? 1.5;
  const buddhaModelAnchor = new THREE.Group();
  buddhaModelAnchor.name = 'shakyamuni-buddha-model-slot';
  buddhaModelAnchor.position.set(0, mountOffsetY, 0);
  buddhaModelAnchor.rotation.y = slot.facingYawRadians ?? 0;

  pedestalGroup.add(buddhaModelAnchor);

  return { pedestalGroup, buddhaModelAnchor };
}

/**
 * Builds the traditional dark hardwood Main Hall offering altar (翘头长条供案)
 * Scheme A1: 3.10m wide × 0.88m deep × 0.86m high -> mensa top at world Y = 1.490m.
 */
export function buildMainAltar(
  palette: TempleMaterialPalette,
  slot: TempleModelSlot
): THREE.Group {
  const altarGroup = new THREE.Group();
  altarGroup.name = 'temple-main-hall-altar';
  altarGroup.position.set(...slot.anchorPosition);

  const tableWidth = 3.1;
  const tableDepth = 0.88;
  const totalHeight = slot.targetHeightMeters; // 0.86m

  // 1. Stone & Bronze Floor Shoes at 4 Corners (柱脚铜套)
  const legPositions: [number, number][] = [
    [-1.3, -0.31],
    [1.3, -0.31],
    [-1.3, 0.31],
    [1.3, 0.31],
  ];

  const shoeGeo = new THREE.BoxGeometry(0.13, 0.045, 0.13);
  const legGeo = new THREE.BoxGeometry(0.105, 0.74, 0.105);

  legPositions.forEach(([lx, lz]) => {
    const shoe = new THREE.Mesh(shoeGeo, palette.bronzeMetal);
    shoe.position.set(lx, 0.0225, lz);
    shoe.castShadow = true;
    shoe.receiveShadow = true;
    altarGroup.add(shoe);

    const leg = new THREE.Mesh(legGeo, palette.darkWalnutWood);
    leg.position.set(lx, 0.415, lz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    altarGroup.add(leg);
  });

  // 2. Lower Structural Stretchers (管脚枨)
  const frontBackRailGeo = new THREE.BoxGeometry(2.6, 0.055, 0.06);
  [-0.31, 0.31].forEach((rz) => {
    const rail = new THREE.Mesh(frontBackRailGeo, palette.darkWalnutWood);
    rail.position.set(0, 0.17, rz);
    rail.castShadow = true;
    altarGroup.add(rail);
  });

  const sideRailGeo = new THREE.BoxGeometry(0.06, 0.055, 0.62);
  [-1.3, 1.3].forEach((rx) => {
    const sideRail = new THREE.Mesh(sideRailGeo, palette.darkWalnutWood);
    sideRail.position.set(rx, 0.17, 0);
    sideRail.castShadow = true;
    altarGroup.add(sideRail);
  });

  // 3. Recessed Upper Apron & Timber Framing (束腰牙板)
  const apronCore = new THREE.Mesh(
    new THREE.BoxGeometry(2.66, 0.155, 0.67),
    palette.naturalWood
  );
  apronCore.position.y = totalHeight - 0.165;
  apronCore.castShadow = true;
  apronCore.receiveShadow = true;
  altarGroup.add(apronCore);

  [-0.86, 0, 0.86].forEach((px) => {
    const panelFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.105, 0.71),
      palette.darkWalnutWood
    );
    panelFrame.position.set(px, totalHeight - 0.165, 0);
    altarGroup.add(panelFrame);
  });

  // Restrained brushed bronze waist trim line
  const bronzeTrim = new THREE.Mesh(
    new THREE.BoxGeometry(tableWidth - 0.04, 0.015, tableDepth - 0.04),
    palette.bronzeMetal
  );
  bronzeTrim.position.y = totalHeight - 0.084;
  altarGroup.add(bronzeTrim);

  // 4. Heavy Mensa Tabletop (案面: top at exact local y = 0.86 -> world Y = 1.490m)
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(tableWidth, 0.075, tableDepth),
    palette.darkWalnutWood
  );
  tableTop.position.y = totalHeight - 0.0375;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  altarGroup.add(tableTop);

  // Traditional Subtle Upturned Scroll Wing Ends (翘头)
  const wingGeo = new THREE.BoxGeometry(0.1, 0.082, tableDepth + 0.02);
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(wingGeo, palette.darkWalnutWood);
    wing.position.set(side * (tableWidth / 2 + 0.02), totalHeight - 0.02, 0);
    wing.rotation.z = side * 0.2;
    wing.castShadow = true;
    altarGroup.add(wing);
  });

  // 5. Centered Bronze Three-Footed Sanctuary Incense Burner (三足青铜香炉: 0.26m H × 0.38m W)
  const censerGroup = new THREE.Group();
  censerGroup.name = 'temple-main-altar-censer';
  censerGroup.position.set(0, totalHeight, 0);

  const footGeo = new THREE.CylinderGeometry(0.021, 0.016, 0.06, 12);
  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((angle) => {
    const foot = new THREE.Mesh(footGeo, palette.bronzeMetal);
    foot.position.set(Math.sin(angle) * 0.095, 0.03, Math.cos(angle) * 0.095);
    foot.castShadow = true;
    censerGroup.add(foot);
  });

  // Bowl body reaches y = 0.215m; upright ears reach y = 0.260m (outer width = 0.380m)
  const censerProfile = [
    new THREE.Vector2(0, 0.042),
    new THREE.Vector2(0.115, 0.042),
    new THREE.Vector2(0.158, 0.11),
    new THREE.Vector2(0.162, 0.168),
    new THREE.Vector2(0.145, 0.205),
    new THREE.Vector2(0.128, 0.215),
    new THREE.Vector2(0.114, 0.16),
    new THREE.Vector2(0, 0.138),
  ];
  const censerBody = new THREE.Mesh(
    new THREE.LatheGeometry(censerProfile, 32),
    palette.bronzeMetal
  );
  censerBody.castShadow = true;
  censerBody.receiveShadow = true;
  censerGroup.add(censerBody);

  // Inner ash bed & twin restrained upright bronze loop ears (双冲耳: total width 0.380m, peak 0.260m)
  const ashDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.112, 0.112, 0.014, 24),
    palette.stonePedestal
  );
  ashDisc.position.y = 0.146;
  censerGroup.add(ashDisc);

  const earGeo = new THREE.TorusGeometry(0.036, 0.0085, 10, 22);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeo, palette.bronzeMetal);
    ear.position.set(side * 0.1455, 0.2155, 0);
    ear.castShadow = true;
    censerGroup.add(ear);
  });

  altarGroup.add(censerGroup);

  return altarGroup;
}

/**
 * Builds the traditional Chinese wooden shrine niche & circular architectural aureole
 * under Scheme A1:
 * - Anchor: [0, 0.630, -19.250]
 * - Cornice width: 4.32m (X ∈ [-2.160, +2.160])
 * - Height: 4.250m -> World Top Y = 4.880m (0.20m below lowest beam 5.08m, 0.41m below crossBeam 5.29m)
 * - Z bounds: [-19.460, -19.010] (0.08m ahead of north wall paneling, 0.235m behind Sumeru dais)
 * - Aureole: outer Ø2.24m centered at world Y = 3.500m
 */
export function buildSacredBackdrop(palette: TempleMaterialPalette): THREE.Group {
  const backdropGroup = new THREE.Group();
  backdropGroup.name = 'temple-main-hall-sacred-backdrop';
  backdropGroup.position.set(0, 0.63, -19.25);

  // 1. Stone & Hardwood Shrine Base Sill (y = 0.00 -> 0.34, world Y = 0.63 -> 0.97)
  const stoneSill = new THREE.Mesh(
    new THREE.BoxGeometry(4.1, 0.2, 0.42),
    palette.charcoalGraniteTrim
  );
  stoneSill.position.y = 0.1;
  stoneSill.castShadow = true;
  stoneSill.receiveShadow = true;
  backdropGroup.add(stoneSill);

  const woodSubPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(3.86, 0.14, 0.34),
    palette.darkWalnutWood
  );
  woodSubPlinth.position.y = 0.27;
  woodSubPlinth.castShadow = true;
  woodSubPlinth.receiveShadow = true;
  backdropGroup.add(woodSubPlinth);

  // 2. Flanking Rosewood Shrine Niche Pillars (佛龛立柱: y = 0.34 -> 4.01, world Y = 0.97 -> 4.64)
  const pillarGeo = new THREE.CylinderGeometry(0.092, 0.1, 3.67, 18);
  const shoeGeo = new THREE.CylinderGeometry(0.118, 0.128, 0.09, 18);
  [-1.72, 1.72].forEach((px) => {
    const shoe = new THREE.Mesh(shoeGeo, palette.stonePedestal);
    shoe.position.set(px, 0.385, 0.04);
    backdropGroup.add(shoe);

    const pillar = new THREE.Mesh(pillarGeo, palette.deepRosewoodPillar);
    pillar.position.set(px, 2.175, 0.04);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    backdropGroup.add(pillar);
  });

  // 3. Recessed Timber Back Screen & Restrained Architectural Framing (木作背屏)
  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 3.67, 0.1),
    palette.darkWalnutWood
  );
  backPanel.position.set(0, 2.175, -0.06);
  backPanel.receiveShadow = true;
  backdropGroup.add(backPanel);

  // Subtle vertical stiles separating side bays from center bay
  [-1.08, 1.08].forEach((dx) => {
    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 3.67, 0.12),
      palette.deepRosewoodPillar
    );
    divider.position.set(dx, 2.175, -0.04);
    backdropGroup.add(divider);
  });

  // Horizontal wainscot rail (腰板枋) & upper frieze rail (额枋花罩线)
  const wainscotRail = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.1, 0.13),
    palette.deepRosewoodPillar
  );
  wainscotRail.position.set(0, 1.04, -0.03);
  backdropGroup.add(wainscotRail);

  const upperFriezeRail = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.08, 0.125),
    palette.deepRosewoodPillar
  );
  upperFriezeRail.position.set(0, 3.84, -0.03);
  backdropGroup.add(upperFriezeRail);

  // Quiet inset lower wainscot panels (素面绦环板)
  [-1.36, 0, 1.36].forEach((px, idx) => {
    const w = idx === 1 ? 1.88 : 0.44;
    const panelInset = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.5, 0.03),
      palette.naturalWood
    );
    panelInset.position.set(px, 0.69, -0.005);
    backdropGroup.add(panelInset);
  });

  // 4. Upper Shrine Lintel, Corbels & Cornice Cap (楣枋冠顶 -> local y_top = 4.250 -> world Y = 4.880m)
  const lintelBeam = new THREE.Mesh(
    new THREE.BoxGeometry(4.1, 0.16, 0.34),
    palette.darkWalnutWood
  );
  lintelBeam.position.set(0, 4.09, 0.02);
  lintelBeam.castShadow = true;
  backdropGroup.add(lintelBeam);

  const corniceCap = new THREE.Mesh(
    new THREE.BoxGeometry(4.32, 0.08, 0.42),
    palette.deepRosewoodPillar
  );
  corniceCap.position.set(0, 4.21, 0.03);
  corniceCap.castShadow = true;
  backdropGroup.add(corniceCap);

  const corbelGeo = new THREE.BoxGeometry(0.16, 0.14, 0.24);
  [-1.08, 0, 1.08].forEach((cx) => {
    const corbel = new THREE.Mesh(corbelGeo, palette.naturalWood);
    corbel.position.set(cx, 3.94, 0.05);
    backdropGroup.add(corbel);
  });

  // 5. Restrained Circular Architectural Aureole (背光: outer Ø2.24m, centered at world Y = 3.500m)
  const aureoleY = 2.87; // 0.63 + 2.87 = 3.500m
  const aureoleGroup = new THREE.Group();
  aureoleGroup.position.set(0, aureoleY, 0.04);

  const backDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.09, 1.09, 0.035, 64),
    palette.darkTimberCeiling
  );
  backDisc.rotation.x = Math.PI / 2;
  backDisc.receiveShadow = true;
  aureoleGroup.add(backDisc);

  // Outer rim: major radius 1.106 + tube radius 0.014 = 1.120m outer radius -> exact Ø2.240m
  const outerRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.106, 0.014, 16, 72),
    palette.mutedGold
  );
  outerRim.position.z = 0.012;
  aureoleGroup.add(outerRim);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.012, 12, 56),
    palette.bronzeMetal
  );
  innerRing.position.z = 0.014;
  aureoleGroup.add(innerRing);

  const haloCoreRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.009, 10, 48),
    palette.bronzeMetal
  );
  haloCoreRing.position.z = 0.014;
  aureoleGroup.add(haloCoreRing);

  backdropGroup.add(aureoleGroup);

  return backdropGroup;
}

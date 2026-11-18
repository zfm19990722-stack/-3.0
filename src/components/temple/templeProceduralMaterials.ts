import * as THREE from 'three';

export interface TempleMaterialPalette {
  stoneFloor: THREE.MeshStandardMaterial;
  stoneRunner: THREE.MeshStandardMaterial;
  stonePedestal: THREE.MeshStandardMaterial;
  warmPlasterWall: THREE.MeshStandardMaterial;
  ceilingPlaster: THREE.MeshStandardMaterial;
  naturalWood: THREE.MeshStandardMaterial;
  darkWalnutWood: THREE.MeshStandardMaterial;
  charcoalStonePaving: THREE.MeshStandardMaterial;
  charcoalGraniteTrim: THREE.MeshStandardMaterial;
  deepRosewoodPillar: THREE.MeshStandardMaterial;
  darkTimberCeiling: THREE.MeshStandardMaterial;
  roofTileCharcoal: THREE.MeshStandardMaterial;
  roofRidgeSlate: THREE.MeshStandardMaterial;
  courtyardEarthWall: THREE.MeshStandardMaterial;
  mutedGold: THREE.MeshPhysicalMaterial;
  bronzeMetal: THREE.MeshStandardMaterial;
  ceramicStoneware: THREE.MeshStandardMaterial;
  linenCushion: THREE.MeshStandardMaterial;
  foliageStem: THREE.MeshStandardMaterial;
  blossomPetal: THREE.MeshStandardMaterial;
  lampFlame: THREE.MeshBasicMaterial;
  skylightGlow: THREE.MeshBasicMaterial;
  contactShadowTexture: THREE.CanvasTexture;
  textures: THREE.Texture[];
  materials: THREE.Material[];
}

function createTravertineTexture(
  baseHex: string,
  veinHex: string,
  gridLines: boolean,
  gridStroke = 'rgba(124, 98, 76, 0.14)'
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle organic stone mineral variation
  for (let i = 0; i < 420; i++) {
    const x = (i * 97) % size;
    const y = (i * 53) % size;
    const w = 18 + (i % 45);
    const h = 2 + (i % 4);
    ctx.fillStyle = veinHex;
    ctx.globalAlpha = 0.055 + (i % 5) * 0.014;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;

  if (gridLines) {
    ctx.strokeStyle = gridStroke;
    ctx.lineWidth = 2;
    const step = size / 2;
    for (let pos = 0; pos <= size; pos += step) {
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createRoofTileTexture(baseHex: string, ribHex: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Traditional cylindrical barrel-tile ribs (筒瓦)
  const ribCount = 16;
  const step = size / ribCount;
  for (let i = 0; i < ribCount; i++) {
    const x = i * step;
    const grad = ctx.createLinearGradient(x, 0, x + step, 0);
    grad.addColorStop(0, 'rgba(12, 13, 15, 0.32)');
    grad.addColorStop(0.45, ribHex);
    grad.addColorStop(0.9, 'rgba(10, 11, 13, 0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, step, size);
  }

  // Subtle horizontal tile overlap courses
  ctx.strokeStyle = 'rgba(12, 13, 15, 0.24)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createWoodGrainTexture(baseHex: string, grainHex: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 240; i++) {
    const x = (i * 19) % size;
    const width = 1 + (i % 3);
    ctx.fillStyle = grainHex;
    ctx.globalAlpha = 0.06 + (i % 6) * 0.016;
    ctx.fillRect(x, 0, width, size);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
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
  grad.addColorStop(0, 'rgba(38, 35, 32, 0.52)');
  grad.addColorStop(0.55, 'rgba(38, 35, 32, 0.2)');
  grad.addColorStop(1, 'rgba(38, 35, 32, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTempleMaterials(
  maxAnisotropy: number
): TempleMaterialPalette {
  const floorTex = createTravertineTexture('#e8e0d1', '#b8ab96', true);
  floorTex.repeat.set(6, 7);
  floorTex.anisotropy = maxAnisotropy;

  const charcoalPavingTex = createTravertineTexture(
    '#43464a',
    '#2f3235',
    true,
    'rgba(24, 25, 27, 0.34)'
  );
  charcoalPavingTex.repeat.set(14, 15);
  charcoalPavingTex.anisotropy = maxAnisotropy;

  const charcoalTrimTex = createTravertineTexture('#55585c', '#3d4044', false);
  charcoalTrimTex.repeat.set(3, 3);
  charcoalTrimTex.anisotropy = maxAnisotropy;

  const limestoneTex = createTravertineTexture('#efe9dd', '#c7baa3', false);
  limestoneTex.repeat.set(2, 2);
  limestoneTex.anisotropy = maxAnisotropy;

  const plasterTex = createTravertineTexture('#cfc5b4', '#b6aa97', false);
  plasterTex.repeat.set(4, 2);
  plasterTex.anisotropy = maxAnisotropy;

  const woodTex = createWoodGrainTexture('#6e513b', '#463122');
  woodTex.repeat.set(1, 2);
  woodTex.anisotropy = maxAnisotropy;

  const walnutTex = createWoodGrainTexture('#4e3626', '#2c1d13');
  walnutTex.repeat.set(2, 1);
  walnutTex.anisotropy = maxAnisotropy;

  const rosewoodTex = createWoodGrainTexture('#412a1d', '#24160e');
  rosewoodTex.repeat.set(1, 2);
  rosewoodTex.anisotropy = maxAnisotropy;

  const roofTileTex = createRoofTileTexture('#2d3035', 'rgba(62, 66, 72, 0.38)');
  roofTileTex.repeat.set(5, 3);
  roofTileTex.anisotropy = maxAnisotropy;

  const contactShadowTexture = createContactShadowTexture();

  const stoneFloor = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.84,
    metalness: 0.04,
  });

  const stoneRunner = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    color: 0xdad2c4,
    roughness: 0.8,
    metalness: 0.05,
  });

  const stonePedestal = new THREE.MeshStandardMaterial({
    map: charcoalTrimTex,
    color: 0x6f7173,
    roughness: 0.78,
    metalness: 0.06,
  });

  const warmPlasterWall = new THREE.MeshStandardMaterial({
    map: plasterTex,
    color: 0xd8cebc,
    roughness: 0.92,
    metalness: 0.02,
  });

  const ceilingPlaster = new THREE.MeshStandardMaterial({
    color: 0x3b2a1e,
    roughness: 0.88,
    metalness: 0.02,
  });

  const naturalWood = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.68,
    metalness: 0.04,
  });

  const darkWalnutWood = new THREE.MeshStandardMaterial({
    map: walnutTex,
    roughness: 0.58,
    metalness: 0.05,
  });

  const charcoalStonePaving = new THREE.MeshStandardMaterial({
    map: charcoalPavingTex,
    roughness: 0.86,
    metalness: 0.05,
  });

  const charcoalGraniteTrim = new THREE.MeshStandardMaterial({
    map: charcoalTrimTex,
    color: 0x5c6066,
    roughness: 0.78,
    metalness: 0.06,
  });

  const deepRosewoodPillar = new THREE.MeshStandardMaterial({
    map: rosewoodTex,
    roughness: 0.54,
    metalness: 0.06,
  });

  const darkTimberCeiling = new THREE.MeshStandardMaterial({
    map: walnutTex,
    color: 0x3a281c,
    roughness: 0.78,
    metalness: 0.03,
  });

  const roofTileCharcoal = new THREE.MeshStandardMaterial({
    map: roofTileTex,
    roughness: 0.74,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const roofRidgeSlate = new THREE.MeshStandardMaterial({
    color: 0x282a2e,
    roughness: 0.66,
    metalness: 0.1,
  });

  const courtyardEarthWall = new THREE.MeshStandardMaterial({
    map: plasterTex,
    color: 0xc8bca8,
    roughness: 0.93,
    metalness: 0.02,
  });

  const mutedGold = new THREE.MeshPhysicalMaterial({
    color: 0xb8934b,
    metalness: 0.86,
    roughness: 0.28,
    clearcoat: 0.18,
    clearcoatRoughness: 0.35,
  });

  const bronzeMetal = new THREE.MeshStandardMaterial({
    color: 0x876a3b,
    metalness: 0.82,
    roughness: 0.34,
  });

  const ceramicStoneware = new THREE.MeshStandardMaterial({
    color: 0xd9d1c3,
    roughness: 0.4,
    metalness: 0.05,
  });

  const linenCushion = new THREE.MeshStandardMaterial({
    color: 0xcabfa8,
    roughness: 0.9,
    metalness: 0.02,
  });

  const foliageStem = new THREE.MeshStandardMaterial({
    color: 0x544231,
    roughness: 0.85,
    metalness: 0.02,
  });

  const blossomPetal = new THREE.MeshStandardMaterial({
    color: 0xf7f1e5,
    roughness: 0.65,
    metalness: 0.02,
  });

  const lampFlame = new THREE.MeshBasicMaterial({
    color: 0xffd58a,
  });

  const skylightGlow = new THREE.MeshBasicMaterial({
    color: 0xfff8eb,
  });

  const textures: THREE.Texture[] = [
    floorTex,
    charcoalPavingTex,
    charcoalTrimTex,
    limestoneTex,
    plasterTex,
    woodTex,
    walnutTex,
    rosewoodTex,
    roofTileTex,
    contactShadowTexture,
  ];

  const materials: THREE.Material[] = [
    stoneFloor,
    stoneRunner,
    stonePedestal,
    warmPlasterWall,
    ceilingPlaster,
    naturalWood,
    darkWalnutWood,
    charcoalStonePaving,
    charcoalGraniteTrim,
    deepRosewoodPillar,
    darkTimberCeiling,
    roofTileCharcoal,
    roofRidgeSlate,
    courtyardEarthWall,
    mutedGold,
    bronzeMetal,
    ceramicStoneware,
    linenCushion,
    foliageStem,
    blossomPetal,
    lampFlame,
    skylightGlow,
  ];

  return {
    stoneFloor,
    stoneRunner,
    stonePedestal,
    warmPlasterWall,
    ceilingPlaster,
    naturalWood,
    darkWalnutWood,
    charcoalStonePaving,
    charcoalGraniteTrim,
    deepRosewoodPillar,
    darkTimberCeiling,
    roofTileCharcoal,
    roofRidgeSlate,
    courtyardEarthWall,
    mutedGold,
    bronzeMetal,
    ceramicStoneware,
    linenCushion,
    foliageStem,
    blossomPetal,
    lampFlame,
    skylightGlow,
    contactShadowTexture,
    textures,
    materials,
  };
}

export function disposeSceneHierarchy(root: THREE.Object3D) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material?.dispose();
      }
    }
  });
}

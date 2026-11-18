import * as THREE from 'three';

export interface TempleMaterialPalette {
  stoneFloor: THREE.MeshStandardMaterial;
  stoneRunner: THREE.MeshStandardMaterial;
  stonePedestal: THREE.MeshStandardMaterial;
  warmPlasterWall: THREE.MeshStandardMaterial;
  ceilingPlaster: THREE.MeshStandardMaterial;
  naturalWood: THREE.MeshStandardMaterial;
  darkWalnutWood: THREE.MeshStandardMaterial;
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
  gridLines: boolean
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle organic travertine mineral variation
  for (let i = 0; i < 420; i++) {
    const x = (i * 97) % size;
    const y = (i * 53) % size;
    const w = 18 + (i % 45);
    const h = 2 + (i % 4);
    ctx.fillStyle = veinHex;
    ctx.globalAlpha = 0.045 + (i % 5) * 0.012;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;

  if (gridLines) {
    ctx.strokeStyle = 'rgba(124, 98, 76, 0.14)';
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
    ctx.globalAlpha = 0.05 + (i % 6) * 0.014;
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

  const limestoneTex = createTravertineTexture('#efe9dd', '#c7baa3', false);
  limestoneTex.repeat.set(2, 2);
  limestoneTex.anisotropy = maxAnisotropy;

  const plasterTex = createTravertineTexture('#f6f1e7', '#dfd5c3', false);
  plasterTex.repeat.set(3, 2);
  plasterTex.anisotropy = maxAnisotropy;

  const woodTex = createWoodGrainTexture('#8c6f55', '#5c4634');
  woodTex.repeat.set(1, 2);
  woodTex.anisotropy = maxAnisotropy;

  const walnutTex = createWoodGrainTexture('#634b38', '#3c2b1e');
  walnutTex.repeat.set(2, 1);
  walnutTex.anisotropy = maxAnisotropy;

  const contactShadowTexture = createContactShadowTexture();

  const stoneFloor = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.84,
    metalness: 0.04,
  });

  const stoneRunner = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    color: 0xf4eee2,
    roughness: 0.78,
    metalness: 0.05,
  });

  const stonePedestal = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    color: 0xe6decb,
    roughness: 0.72,
    metalness: 0.06,
  });

  const warmPlasterWall = new THREE.MeshStandardMaterial({
    map: plasterTex,
    color: 0xf6f1e8,
    roughness: 0.92,
    metalness: 0.02,
  });

  const ceilingPlaster = new THREE.MeshStandardMaterial({
    color: 0xefe9dd,
    roughness: 0.94,
    metalness: 0.01,
  });

  const naturalWood = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.68,
    metalness: 0.04,
  });

  const darkWalnutWood = new THREE.MeshStandardMaterial({
    map: walnutTex,
    roughness: 0.56,
    metalness: 0.06,
  });

  const mutedGold = new THREE.MeshPhysicalMaterial({
    color: 0xc5a25b,
    metalness: 0.88,
    roughness: 0.26,
    clearcoat: 0.2,
    clearcoatRoughness: 0.35,
  });

  const bronzeMetal = new THREE.MeshStandardMaterial({
    color: 0x9c7b43,
    metalness: 0.82,
    roughness: 0.34,
  });

  const ceramicStoneware = new THREE.MeshStandardMaterial({
    color: 0xe5dfd2,
    roughness: 0.38,
    metalness: 0.05,
  });

  const linenCushion = new THREE.MeshStandardMaterial({
    color: 0xd9cfc0,
    roughness: 0.9,
    metalness: 0.02,
  });

  const foliageStem = new THREE.MeshStandardMaterial({
    color: 0x5c4a38,
    roughness: 0.85,
    metalness: 0.02,
  });

  const blossomPetal = new THREE.MeshStandardMaterial({
    color: 0xfaf5eb,
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
    limestoneTex,
    plasterTex,
    woodTex,
    walnutTex,
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

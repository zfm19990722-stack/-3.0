import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type TempleAssetSlotId =
  | 'mainStatue'
  | 'altarTable'
  | 'offeringLampLeft'
  | 'offeringLampRight'
  | 'floralVaseLeft'
  | 'floralVaseRight'
  | 'beadsProp'
  | 'woodenFishProp'
  | 'devoteeAvatar';

export type TempleAssetStatus =
  | 'placeholder-architectural'
  | 'procedural-sanctuary'
  | 'reserved-v2.2'
  | 'reserved-v2.3'
  | 'glb-loaded';

export interface TempleModelSlot {
  id: TempleAssetSlotId;
  labelZh: string;
  labelEn: string;
  /** Future external GLB asset path (e.g. '/models/temple/shakyamuni_stone.glb') */
  glbUrl: string | null;
  status: TempleAssetStatus;
  /** Target world anchor inside the temple hall */
  anchorPosition: [number, number, number];
  /** Target bounding height in meters when normalizing an imported GLB */
  targetHeightMeters: number;
  notesZh: string;
  notesEn: string;
}

/**
 * Registry of 3D model slots for the Temple Sanctuary.
 * Replacing a slot with a verified GLB model only requires populating `glbUrl`
 * and calling `loadTempleGlbAsset` into its mounted `THREE.Group` anchor.
 */
export const TEMPLE_MODEL_MANIFEST: Record<TempleAssetSlotId, TempleModelSlot> = {
  mainStatue: {
    id: 'mainStatue',
    labelZh: '正殿主尊造像',
    labelEn: 'Main Sanctuary Statue',
    glbUrl: null,
    status: 'placeholder-architectural',
    anchorPosition: [0, 0.36, -5.6],
    targetHeightMeters: 2.85,
    notesZh:
      '当前使用「阶梯石座 + 莲台 + 柔金背光弧」建筑占位结构；待接入经文化核校的高精度佛像 GLB 模型。',
    notesEn:
      'Currently rendered with a respectful stepped stone dais, lotus plinth, and architectural nimbus placeholder; awaiting verified GLB statue model.',
  },
  altarTable: {
    id: 'altarTable',
    labelZh: '长条木石供奉台',
    labelEn: 'Main Offering Table',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [0, 0.18, -4.45],
    targetHeightMeters: 0.92,
    notesZh: 'V2.1 已由程序化胡桃木与黄铜嵌条结构构建，后续可按需替换为精雕木作 GLB。',
    notesEn: 'Built procedurally in walnut timber and brushed brass; optional GLB replacement.',
  },
  offeringLampLeft: {
    id: 'offeringLampLeft',
    labelZh: '左侧供灯',
    labelEn: 'Left Offering Lamp',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [-1.42, 1.1, -4.42],
    targetHeightMeters: 0.42,
    notesZh: 'V2.1 程序化黄铜灯盏；V2.3 供灯记录交互可直接绑定此锚点。',
    notesEn: 'Procedural brass sanctuary lamp; ready to bind V2.3 lamp-lighting state.',
  },
  offeringLampRight: {
    id: 'offeringLampRight',
    labelZh: '右侧供灯',
    labelEn: 'Right Offering Lamp',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [1.42, 1.1, -4.42],
    targetHeightMeters: 0.42,
    notesZh: 'V2.1 程序化黄铜灯盏；V2.3 供灯记录交互可直接绑定此锚点。',
    notesEn: 'Procedural brass sanctuary lamp; ready to bind V2.3 lamp-lighting state.',
  },
  floralVaseLeft: {
    id: 'floralVaseLeft',
    labelZh: '左侧供花瓷瓶',
    labelEn: 'Left Floral Vessel',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [-2.12, 1.1, -4.48],
    targetHeightMeters: 0.65,
    notesZh: 'V2.1 程序化素陶花瓶与极简枝叶陈设，支持替换为精细花艺 GLB。',
    notesEn: 'Procedural stoneware vessel with quiet botanical stems; optional GLB upgrade.',
  },
  floralVaseRight: {
    id: 'floralVaseRight',
    labelZh: '右侧供花瓷瓶',
    labelEn: 'Right Floral Vessel',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [2.12, 1.1, -4.48],
    targetHeightMeters: 0.65,
    notesZh: 'V2.1 程序化素陶花瓶与极简枝叶陈设，支持替换为精细花艺 GLB。',
    notesEn: 'Procedural stoneware vessel with quiet botanical stems; optional GLB upgrade.',
  },
  beadsProp: {
    id: 'beadsProp',
    labelZh: '念珠法器交互位',
    labelEn: 'Mala Beads Anchor (V2.2)',
    glbUrl: null,
    status: 'reserved-v2.2',
    anchorPosition: [-0.65, 0.12, -2.05],
    targetHeightMeters: 0.25,
    notesZh: 'V2.2 预留：接入念珠 GLB 与拨动计数/触觉交互接口。',
    notesEn: 'Reserved for V2.2: interactive mala beads GLB & gentle bead-rolling state.',
  },
  woodenFishProp: {
    id: 'woodenFishProp',
    labelZh: '木鱼法器交互位',
    labelEn: 'Wooden Fish Anchor (V2.2)',
    glbUrl: null,
    status: 'reserved-v2.2',
    anchorPosition: [0.65, 0.12, -2.05],
    targetHeightMeters: 0.28,
    notesZh: 'V2.2 预留：接入木鱼 GLB 与轻敲声景动画接口。',
    notesEn: 'Reserved for V2.2: wooden fish GLB & resonant acoustic tap animation.',
  },
  devoteeAvatar: {
    id: 'devoteeAvatar',
    labelZh: '礼佛身形动作锚点',
    labelEn: 'Reverence Bowing Avatar (V2.3)',
    glbUrl: null,
    status: 'reserved-v2.3',
    anchorPosition: [0, 0.04, -1.65],
    targetHeightMeters: 1.65,
    notesZh: 'V2.3 预留：接入含骨骼动画的礼佛人物 GLB 与 AnimationMixer 状态机。',
    notesEn: 'Reserved for V2.3: rigged character GLB & AnimationMixer bowing sequence.',
  },
};

/**
 * Future-ready scene extension interface for Temple V2.2 (Beads & Wooden Fish)
 * and V2.3 (Reverence Bowing Animation & Offering Lamp Records).
 */
export interface Temple3DInteractionBridge {
  /** Called once the 3D scene mounts with anchor groups for V2.2/V2.3 attachments */
  onSceneReady?: (anchors: Partial<Record<TempleAssetSlotId, THREE.Group>>) => void;
  /** Optional V2.2 hook when user taps an interactive prop inside the hall */
  onPropInteract?: (slotId: TempleAssetSlotId) => void;
  /** Optional V2.3 external trigger state for lamp glow / bowing animation */
  activeOfferingLamp?: boolean;
  reverenceTriggerCount?: number;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

/**
 * Loads an external GLB asset into an anchor group, normalizing scale and grounding
 * its bottom-center cleanly onto y = 0 of the anchor.
 * Intended for V2.1+ drop-in replacement without rewriting scene or React logic.
 */
export async function loadTempleGlbAsset(
  slot: TempleModelSlot,
  anchorGroup: THREE.Group,
  signal?: AbortSignal
): Promise<THREE.AnimationClip[]> {
  if (!slot.glbUrl) {
    return [];
  }

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(slot.glbUrl);

  if (signal?.aborted) {
    gltf.scene.traverse((obj) => {
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
    return [];
  }

  const root = gltf.scene;
  _box.setFromObject(root);
  _box.getSize(_size);
  _box.getCenter(_center);

  const height = Math.max(_size.y, 0.001);
  const scaleFactor = slot.targetHeightMeters / height;

  root.scale.setScalar(scaleFactor);
  root.position.set(
    -_center.x * scaleFactor,
    -_box.min.y * scaleFactor,
    -_center.z * scaleFactor
  );

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Replace placeholder children once GLB is ready
  while (anchorGroup.children.length > 0) {
    const oldChild = anchorGroup.children[0];
    anchorGroup.remove(oldChild);
  }
  anchorGroup.add(root);

  return gltf.animations || [];
}

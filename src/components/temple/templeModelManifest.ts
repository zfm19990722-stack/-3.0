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
  /** Target world anchor inside the temple hall (flush on floor surface) */
  anchorPosition: [number, number, number];
  /** Target bounding height in meters when normalizing an imported GLB */
  targetHeightMeters: number;
  /** Vertical offset from anchorPosition.y to pedestal seating crown (for seated icons) */
  pedestalTopOffsetY?: number;
  /** Default Y-axis orientation in radians (0 = +Z south toward courtyard) */
  facingYawRadians?: number;
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
    labelZh: '正殿主尊造像 · 释迦牟尼佛',
    labelEn: 'Main Sanctuary Icon · Shakyamuni Buddha',
    glbUrl: null,
    status: 'placeholder-architectural',
    anchorPosition: [0, 0.63, -17.7],
    targetHeightMeters: 2.65,
    pedestalTopOffsetY: 1.5,
    facingYawRadians: 0,
    notesZh:
      '须弥座（0.86m）与 20 瓣仰覆莲台（0.64m）已按方案 A1 校准确位，莲台座冠 Y=2.130m（面朝正南 +Z）；现阶段保留空莲座待接入经文化核校的 2.65m 释迦牟尼佛 GLB 模型。',
    notesEn:
      'Sumeru dais (0.86m) & 20-petal double-lotus pedestal (0.64m) calibrated to Scheme A1 (crown Y=2.130m, facing south +Z); open lotus seat awaiting verified 2.65m Shakyamuni Buddha GLB.',
  },
  altarTable: {
    id: 'altarTable',
    labelZh: '长条硬木供案',
    labelEn: 'Main Hardwood Offering Altar',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [0, 0.63, -14.35],
    targetHeightMeters: 0.86,
    notesZh: '已由传统深木翘头供案与三足青铜香炉程序化构建（3.10m × 0.88m × 0.86m，案面 Y=1.490m）。',
    notesEn: 'Built procedurally as a 3.10m × 0.88m dark hardwood Chinese altar with bronze censer (mensa Y=1.490m).',
  },
  offeringLampLeft: {
    id: 'offeringLampLeft',
    labelZh: '左侧供灯',
    labelEn: 'Left Offering Lamp',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [-0.82, 1.49, -14.33],
    targetHeightMeters: 0.34,
    notesZh: '程序化青铜供灯盏（总高 0.34m）；后续供灯记录交互可直接绑定此锚点。',
    notesEn: 'Procedural bronze sanctuary lamp (0.34m); ready to bind lamp-lighting state.',
  },
  offeringLampRight: {
    id: 'offeringLampRight',
    labelZh: '右侧供灯',
    labelEn: 'Right Offering Lamp',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [0.82, 1.49, -14.33],
    targetHeightMeters: 0.34,
    notesZh: '程序化青铜供灯盏（总高 0.34m）；后续供灯记录交互可直接绑定此锚点。',
    notesEn: 'Procedural bronze sanctuary lamp (0.34m); ready to bind lamp-lighting state.',
  },
  floralVaseLeft: {
    id: 'floralVaseLeft',
    labelZh: '左侧供花瓷瓶',
    labelEn: 'Left Floral Vessel',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [-1.24, 1.49, -14.35],
    targetHeightMeters: 0.5,
    notesZh: '程序化素陶花瓶与极简枝叶陈设（瓶高 0.34m，含枝总高 0.50m）。',
    notesEn: 'Procedural stoneware vessel (0.34m) with quiet botanical stems (0.50m total).',
  },
  floralVaseRight: {
    id: 'floralVaseRight',
    labelZh: '右侧供花瓷瓶',
    labelEn: 'Right Floral Vessel',
    glbUrl: null,
    status: 'procedural-sanctuary',
    anchorPosition: [1.24, 1.49, -14.35],
    targetHeightMeters: 0.5,
    notesZh: '程序化素陶花瓶与极简枝叶陈设（瓶高 0.34m，含枝总高 0.50m）。',
    notesEn: 'Procedural stoneware vessel (0.34m) with quiet botanical stems (0.50m total).',
  },
  beadsProp: {
    id: 'beadsProp',
    labelZh: '念珠法器交互位',
    labelEn: 'Mala Beads Anchor (V2.2)',
    glbUrl: null,
    status: 'reserved-v2.2',
    anchorPosition: [-0.5, 0.68, -11.4],
    targetHeightMeters: 0.18,
    notesZh: 'V2.2 预留：接入念珠 GLB 与拨动计数/触觉交互接口。',
    notesEn: 'Reserved for V2.2: interactive mala beads GLB & gentle bead-rolling state.',
  },
  woodenFishProp: {
    id: 'woodenFishProp',
    labelZh: '木鱼法器交互位',
    labelEn: 'Wooden Fish Anchor (V2.2)',
    glbUrl: null,
    status: 'reserved-v2.2',
    anchorPosition: [0.5, 0.68, -11.4],
    targetHeightMeters: 0.2,
    notesZh: 'V2.2 预留：接入木鱼 GLB 与轻敲声景动画接口。',
    notesEn: 'Reserved for V2.2: wooden fish GLB & resonant acoustic tap animation.',
  },
  devoteeAvatar: {
    id: 'devoteeAvatar',
    labelZh: '礼佛身形动作锚点',
    labelEn: 'Reverence Bowing Avatar (V2.3)',
    glbUrl: null,
    status: 'reserved-v2.3',
    anchorPosition: [0, 0.63, -11.15],
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

function disposeSubtree(root: THREE.Object3D) {
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

export interface LoadTempleGlbOptions {
  /** Override target normalized height in meters */
  targetHeightMeters?: number;
  /** Override Y-axis yaw rotation if source GLB faces a non-+Z direction */
  sourceForwardYawOffset?: number;
}

/**
 * Loads an external GLB asset into an anchor group, normalizing orientation, scale,
 * and grounding its bottom-center flush onto y = 0 of the anchor (e.g. lotus pedestal crown).
 * Intended for drop-in replacement without modifying Main Hall architecture or scene logic.
 */
export async function loadTempleGlbAsset(
  slot: TempleModelSlot,
  anchorGroup: THREE.Group,
  signal?: AbortSignal,
  options?: LoadTempleGlbOptions
): Promise<THREE.AnimationClip[]> {
  if (!slot.glbUrl) {
    return [];
  }

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(slot.glbUrl);

  if (signal?.aborted) {
    disposeSubtree(gltf.scene);
    return [];
  }

  const root = gltf.scene;
  if (options?.sourceForwardYawOffset) {
    root.rotation.y = options.sourceForwardYawOffset;
  }
  root.updateMatrixWorld(true);

  _box.setFromObject(root);
  _box.getSize(_size);
  _box.getCenter(_center);

  const targetHeight = options?.targetHeightMeters ?? slot.targetHeightMeters;
  const height = Math.max(_size.y, 0.001);
  const scaleFactor = targetHeight / height;

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

  // Dispose & replace placeholder children cleanly once GLB is ready
  while (anchorGroup.children.length > 0) {
    const oldChild = anchorGroup.children[0];
    anchorGroup.remove(oldChild);
    disposeSubtree(oldChild);
  }
  anchorGroup.add(root);

  return gltf.animations || [];
}

/**
 * Dedicated drop-in loader for the Shakyamuni Buddha GLB into `shakyamuni-buddha-model-slot`.
 * Preserves pedestal grounding, south (+Z) alignment, and 2.25m seated scale normalization.
 */
export async function loadShakyamuniBuddhaModel(
  buddhaAnchorGroup: THREE.Group,
  glbUrl: string,
  signal?: AbortSignal,
  options?: LoadTempleGlbOptions
): Promise<THREE.AnimationClip[]> {
  const slot: TempleModelSlot = {
    ...TEMPLE_MODEL_MANIFEST.mainStatue,
    glbUrl,
    status: 'glb-loaded',
  };
  return loadTempleGlbAsset(slot, buddhaAnchorGroup, signal, options);
}

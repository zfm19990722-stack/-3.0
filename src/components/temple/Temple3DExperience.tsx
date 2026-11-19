import { type MouseEvent, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  Compass,
  Footprints,
  Info,
  Moon,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import {
  TEMPLE_MODEL_MANIFEST,
  Temple3DInteractionBridge,
  TempleAssetSlotId,
} from './templeModelManifest';
import {
  createTempleMaterials,
  disposeSceneHierarchy,
} from './templeProceduralMaterials';
import { buildTempleCourtyard } from './templeCourtyardBuilder';
import { buildTempleValley } from './templeValleyBuilder';
import {
  buildLotusPedestalAndBuddhaAnchor,
  buildMainAltar,
  buildSacredBackdrop,
} from './templeMainHallFocalPoint';
import type {
  TempleLightingPreference,
  TempleResolvedEnvironment,
} from './templeLightingTime';
import {
  OVERVIEW_ORBIT_CONFIG,
  resolveOverviewCameraPosition,
  stepResetCameraSpherical,
} from './templeOverviewCamera';
import { buildTempleCollisionRegistry } from './templeCollisionRegistry';
import { createTempleWalkController } from './templeWalkController';

interface Temple3DExperienceProps {
  language: 'zh' | 'en';
  onClose: () => void;
  lightingPreference: TempleLightingPreference;
  onChangeLightingPreference: (next: TempleLightingPreference) => void;
  resolvedEnvironment: TempleResolvedEnvironment;
  beijingTimeLabel: string;
  interactionBridge?: Temple3DInteractionBridge;
}

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 4.65, 7.6);
const DEFAULT_TARGET_POS = new THREE.Vector3(0, 1.85, -7.5);

// Day vs Night lighting color constants (pre-allocated outside render loop)
const DAY_BG_COLOR = new THREE.Color(0xe6dfd3);
const NIGHT_BG_COLOR = new THREE.Color(0x221d18);

const DAY_HEMI_SKY = new THREE.Color(0xfefcf6);
const NIGHT_HEMI_SKY = new THREE.Color(0x5c4f42);

const DAY_HEMI_GROUND = new THREE.Color(0x5e5a54);
const NIGHT_HEMI_GROUND = new THREE.Color(0x35291e);

const DAY_KEY_COLOR = new THREE.Color(0xfff1dc);
const NIGHT_KEY_COLOR = new THREE.Color(0xcab69c);

const DAY_FILL_COLOR = new THREE.Color(0xfff7ea);
const NIGHT_FILL_COLOR = new THREE.Color(0xffd08c);

const DAY_LAMP_COLOR = new THREE.Color(0xffd48f);
const NIGHT_LAMP_COLOR = new THREE.Color(0xffb454);

const DAY_SKYLIGHT_COLOR = new THREE.Color(0xfff8eb);
const NIGHT_SKYLIGHT_COLOR = new THREE.Color(0x302a24);

const DAY_FLAME_COLOR = new THREE.Color(0xffe0a8);
const NIGHT_FLAME_COLOR = new THREE.Color(0xffc364);

const DAY_FOCAL_COLOR = new THREE.Color(0xfff6ea);
const NIGHT_FOCAL_COLOR = new THREE.Color(0xffcf88);

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      testCanvas.getContext('webgl2') ||
      (testCanvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) {
      return { supported: false, isSoftwareGl: true };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl =
      /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

// Build procedural offering lamp (LatheGeometry + flame + soft glow halo, 0.34m total height)
function buildOfferingLamp(
  bronzeMat: THREE.Material,
  goldMat: THREE.Material,
  flameMat: THREE.Material
) {
  const group = new THREE.Group();

  const baseProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.09, 0),
    new THREE.Vector2(0.082, 0.026),
    new THREE.Vector2(0.036, 0.055),
    new THREE.Vector2(0.022, 0.155),
    new THREE.Vector2(0.032, 0.195),
    new THREE.Vector2(0.082, 0.242),
    new THREE.Vector2(0.09, 0.278),
    new THREE.Vector2(0.076, 0.282),
    new THREE.Vector2(0.064, 0.232),
    new THREE.Vector2(0, 0.222),
  ];
  const bodyMesh = new THREE.Mesh(
    new THREE.LatheGeometry(baseProfile, 28),
    bronzeMat
  );
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  const rimMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.082, 0.007, 12, 28),
    goldMat
  );
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.28;
  group.add(rimMesh);

  const flameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.015, 0.064, 14),
    flameMat
  );
  flameMesh.position.y = 0.304;
  group.add(flameMesh);

  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffd58e,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const haloMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.036, 14, 12),
    haloMat
  );
  haloMesh.position.y = 0.304;
  group.add(haloMesh);

  return { group, flameMesh, haloMesh, haloMat };
}

// Build procedural stoneware floral vase (0.34m vessel + botanical stems peaking at 0.50m total)
function buildFloralVase(
  ceramicMat: THREE.Material,
  stemMat: THREE.Material,
  petalMat: THREE.Material,
  mirrorSide: number
) {
  const group = new THREE.Group();

  const vaseProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.066, 0),
    new THREE.Vector2(0.095, 0.1),
    new THREE.Vector2(0.088, 0.205),
    new THREE.Vector2(0.044, 0.29),
    new THREE.Vector2(0.05, 0.34),
    new THREE.Vector2(0.042, 0.34),
    new THREE.Vector2(0.035, 0.275),
    new THREE.Vector2(0, 0.26),
  ];
  const vaseMesh = new THREE.Mesh(
    new THREE.LatheGeometry(vaseProfile, 28),
    ceramicMat
  );
  vaseMesh.castShadow = true;
  vaseMesh.receiveShadow = true;
  group.add(vaseMesh);

  const branchCurve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.275, 0),
    new THREE.Vector3(0.024 * mirrorSide, 0.36, 0.014),
    new THREE.Vector3(0.068 * mirrorSide, 0.44, -0.012),
    new THREE.Vector3(0.1 * mirrorSide, 0.488, 0.018),
  ]);
  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(branchCurve1, 14, 0.0048, 6, false),
      stemMat
    )
  );

  const branchCurve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.275, 0),
    new THREE.Vector3(-0.016 * mirrorSide, 0.37, -0.014),
    new THREE.Vector3(-0.05 * mirrorSide, 0.445, 0.018),
  ]);
  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(branchCurve2, 12, 0.0042, 6, false),
      stemMat
    )
  );

  const blossomPositions: [number, number, number, number][] = [
    [0.062 * mirrorSide, 0.43, -0.01, 0.017],
    [0.096 * mirrorSide, 0.485, 0.016, 0.015],
    [-0.046 * mirrorSide, 0.44, 0.016, 0.016],
    [0.022 * mirrorSide, 0.385, 0.016, 0.014],
  ];
  const budGeo = new THREE.SphereGeometry(1, 12, 10);
  blossomPositions.forEach(([bx, by, bz, scale]) => {
    const blossom = new THREE.Mesh(budGeo, petalMat);
    blossom.position.set(bx, by, bz);
    blossom.scale.set(scale * 1.15, scale * 0.85, scale * 1.15);
    group.add(blossom);
  });

  return group;
}

export default function Temple3DExperience({
  language,
  onClose,
  lightingPreference,
  onChangeLightingPreference,
  resolvedEnvironment,
  beijingTimeLabel,
  interactionBridge,
}: Temple3DExperienceProps) {
  const isEn = language === 'en';

  const mountRef = useRef<HTMLDivElement | null>(null);
  const resetCameraFnRef = useRef<(() => void) | null>(null);
  const resetWalkSpawnFnRef = useRef<(() => void) | null>(null);
  const switchModeFnRef = useRef<((nextMode: 'overview' | 'walk') => void) | null>(
    null
  );
  const notifyLightingChangeRef = useRef<(() => void) | null>(null);
  const bridgeRef = useRef<Temple3DInteractionBridge | undefined>(interactionBridge);
  bridgeRef.current = interactionBridge;

  const [cameraMode, setCameraMode] = useState<'overview' | 'walk'>('overview');
  const cameraModeRef = useRef<'overview' | 'walk'>('overview');

  // Live target night factor (0 = Day, 1 = Night) read by WebGL loop without remounting
  const targetNightFactorRef = useRef<number>(
    resolvedEnvironment === 'night' ? 1 : 0
  );
  useEffect(() => {
    targetNightFactorRef.current = resolvedEnvironment === 'night' ? 1 : 0;
    notifyLightingChangeRef.current?.();
  }, [resolvedEnvironment]);

  const [isLoading, setIsLoading] = useState(true);
  const [webglError, setWebglError] = useState<'unsupported' | 'context-lost' | null>(
    null
  );
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      setPrefersReducedMotion(mq.matches);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const capability = detectSoftwareWebGL();
    if (!capability.supported) {
      setWebglError('unsupported');
      setIsLoading(false);
      return;
    }

    const isSoftwareGl = capability.isSoftwareGl;
    const isSmallViewport = window.innerWidth <= 640;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: isSmallViewport ? 'default' : 'high-performance',
      });
    } catch {
      setWebglError('unsupported');
      setIsLoading(false);
      return;
    }

    let disposed = false;
    let contextLost = false;
    let frameId = 0;
    let flickerTimerId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let isResettingCamera = false;
    let currentNightFactor = targetNightFactorRef.current;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    renderer.setSize(width, height);
    const maxDpr = isSoftwareGl ? 1 : isSmallViewport ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgColor = DAY_BG_COLOR.clone();
    const fog = new THREE.FogExp2(0xe6dfd3, 0.011);
    scene.background = bgColor;
    scene.fog = fog;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const aspect = width / height;
    const initialFov = aspect < 0.85 ? 64 : 48;
    const camera = new THREE.PerspectiveCamera(initialFov, aspect, 0.15, 220);
    camera.position.copy(DEFAULT_CAMERA_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_TARGET_POS);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.panSpeed = OVERVIEW_ORBIT_CONFIG.panSpeed;
    controls.rotateSpeed = isSmallViewport ? 0.65 : 0.78;
    controls.zoomSpeed = OVERVIEW_ORBIT_CONFIG.zoomSpeed;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controls.minDistance = OVERVIEW_ORBIT_CONFIG.minDistance;
    controls.maxDistance = OVERVIEW_ORBIT_CONFIG.maxDistance;
    controls.minAzimuthAngle = OVERVIEW_ORBIT_CONFIG.minAzimuthAngle;
    controls.maxAzimuthAngle = OVERVIEW_ORBIT_CONFIG.maxAzimuthAngle;
    controls.minPolarAngle = OVERVIEW_ORBIT_CONFIG.minPolarAngle;
    controls.maxPolarAngle = OVERVIEW_ORBIT_CONFIG.maxPolarAngle;
    controls.update();

    const maxAnisotropy = Math.min(
      renderer.capabilities.getMaxAnisotropy() || 1,
      isSmallViewport ? 4 : 8
    );
    const palette = createTempleMaterials(maxAnisotropy);

    const extraTextures: THREE.Texture[] = [envTarget.texture];
    const extraMaterials: THREE.Material[] = [];

    // ------------------------------------------------------------
    // 1. TRADITIONAL CHINESE COURTYARD ARCHITECTURE (四合院)
    // ------------------------------------------------------------
    const courtyard = buildTempleCourtyard(palette);
    scene.add(courtyard.group);
    extraMaterials.push(...courtyard.courtyardSconceHalos);
    const collisionRegistry = buildTempleCollisionRegistry(courtyard.group);

    // 1B. JIANGNAN MOUNTAIN VALLEY TERRAIN & SPATIAL BLOCKOUT (Phase 2C.1)
    const valley = buildTempleValley();
    scene.add(valley.group);

    // ------------------------------------------------------------
    // 2. ANCHORS FOR SANCTUARY ELEMENTS & FUTURE V2.2 / V2.3 ASSETS
    // ------------------------------------------------------------
    const anchors: Partial<Record<TempleAssetSlotId, THREE.Group>> = {};
    const createAnchor = (slotId: TempleAssetSlotId) => {
      const slot = TEMPLE_MODEL_MANIFEST[slotId];
      const group = new THREE.Group();
      group.name = `temple-anchor-${slotId}`;
      group.position.set(...slot.anchorPosition);
      scene.add(group);
      anchors[slotId] = group;
      return group;
    };

    // A. Main Hall Sacred Focal Point (Backdrop -> Lotus Pedestal -> Buddha Slot -> Dark Hardwood Altar)
    const sacredBackdrop = buildSacredBackdrop(palette);
    scene.add(sacredBackdrop);

    const { pedestalGroup, buddhaModelAnchor } = buildLotusPedestalAndBuddhaAnchor(
      palette,
      TEMPLE_MODEL_MANIFEST.mainStatue
    );
    scene.add(pedestalGroup);
    anchors.mainStatue = buddhaModelAnchor;

    // B. Traditional Dark Hardwood Main Altar & Three-Footed Bronze Censer
    const mainAltarGroup = buildMainAltar(
      palette,
      TEMPLE_MODEL_MANIFEST.altarTable
    );
    scene.add(mainAltarGroup);
    anchors.altarTable = mainAltarGroup;

    // C. Left & Right Sanctuary Offering Lamps
    const leftLampBuilt = buildOfferingLamp(
      palette.bronzeMetal,
      palette.mutedGold,
      palette.lampFlame
    );
    const leftLampAnchor = createAnchor('offeringLampLeft');
    leftLampAnchor.add(leftLampBuilt.group);

    const rightLampBuilt = buildOfferingLamp(
      palette.bronzeMetal,
      palette.mutedGold,
      palette.lampFlame
    );
    const rightLampAnchor = createAnchor('offeringLampRight');
    rightLampAnchor.add(rightLampBuilt.group);

    extraMaterials.push(leftLampBuilt.haloMat, rightLampBuilt.haloMat);

    // D. Left & Right Floral Stoneware Vases
    const leftVaseAnchor = createAnchor('floralVaseLeft');
    leftVaseAnchor.add(
      buildFloralVase(
        palette.ceramicStoneware,
        palette.foliageStem,
        palette.blossomPetal,
        1
      )
    );

    const rightVaseAnchor = createAnchor('floralVaseRight');
    rightVaseAnchor.add(
      buildFloralVase(
        palette.ceramicStoneware,
        palette.foliageStem,
        palette.blossomPetal,
        -1
      )
    );

    // E. Contemplation Mat (0.78m × 0.78m × 0.04m wood mat + Ø0.48m × 0.075m cushion) & Reserved Anchors
    const devoteeAnchor = createAnchor('devoteeAvatar');
    {
      const cushionMatBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.04, 0.78),
        palette.darkWalnutWood
      );
      cushionMatBase.position.y = 0.02;
      cushionMatBase.receiveShadow = true;
      devoteeAnchor.add(cushionMatBase);

      const cushionTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.075, 28),
        palette.linenCushion
      );
      cushionTop.position.y = 0.0775;
      cushionTop.receiveShadow = true;
      devoteeAnchor.add(cushionTop);
    }

    createAnchor('beadsProp');
    createAnchor('woodenFishProp');

    bridgeRef.current?.onSceneReady?.(anchors);

    // ------------------------------------------------------------
    // 3. DAY & NIGHT DYNAMIC COURTYARD & SANCTUARY LIGHTING RIG
    // ------------------------------------------------------------
    const hemiLight = new THREE.HemisphereLight(0xfefcf6, 0x5e5a54, 1.2);
    hemiLight.position.set(0, 14, 0);
    scene.add(hemiLight);

    const skylightKey = new THREE.DirectionalLight(0xfff1dc, 2.05);
    skylightKey.position.set(13.0, 21.0, 10.0);
    skylightKey.target.position.set(0, 1.2, -7.0);
    scene.add(skylightKey.target);
    if (!isSoftwareGl) {
      skylightKey.castShadow = true;
      skylightKey.shadow.mapSize.set(
        isSmallViewport ? 1024 : 2048,
        isSmallViewport ? 1024 : 2048
      );
      skylightKey.shadow.camera.near = 1.0;
      skylightKey.shadow.camera.far = 56;
      skylightKey.shadow.camera.left = -18;
      skylightKey.shadow.camera.right = 18;
      skylightKey.shadow.camera.top = 20;
      skylightKey.shadow.camera.bottom = -20;
      skylightKey.shadow.bias = -0.0005;
      skylightKey.shadow.normalBias = 0.025;
    }
    scene.add(skylightKey);

    const altarFill = new THREE.DirectionalLight(0xfff7ea, 0.62);
    altarFill.position.set(-8.0, 6.5, 8.0);
    scene.add(altarFill);

    // Primary offering lamps on Main Hall altar
    const leftLampLight = new THREE.PointLight(0xffcb7a, 0.45, 12.0, 1.65);
    leftLampLight.position.set(-0.82, 1.81, -14.33);
    scene.add(leftLampLight);

    const rightLampLight = new THREE.PointLight(0xffcb7a, 0.45, 12.0, 1.65);
    rightLampLight.position.set(0.82, 1.81, -14.33);
    scene.add(rightLampLight);

    // Warm sanctuary front lamp light illuminating altar, lotus pedestal & backdrop at night
    const sanctuaryFrontGlowLight = new THREE.PointLight(0xffcd85, 0.0, 11.5, 1.55);
    sanctuaryFrontGlowLight.position.set(0, 2.2, -14.8);
    scene.add(sanctuaryFrontGlowLight);

    // Restrained directional sanctuary focal accent integrated with Day/Night environment
    const sanctuaryBuddhaFocalLight = new THREE.SpotLight(
      0xfff6ea,
      0.55,
      11.5,
      Math.PI / 4.2,
      0.85,
      1.45
    );
    sanctuaryBuddhaFocalLight.position.set(0, 4.65, -14.35);
    sanctuaryBuddhaFocalLight.target.position.set(0, 3.2, -17.7);
    scene.add(sanctuaryBuddhaFocalLight.target);
    scene.add(sanctuaryBuddhaFocalLight);

    // Flanking Side Hall & Courtyard Lantern warm lights at night
    const leftWallSconceLight = new THREE.PointLight(0xffc372, 0.0, 14.5, 1.65);
    leftWallSconceLight.position.set(-6.8, 2.35, 0);
    scene.add(leftWallSconceLight);

    const rightWallSconceLight = new THREE.PointLight(0xffc372, 0.0, 14.5, 1.65);
    rightWallSconceLight.position.set(6.8, 2.35, 0);
    scene.add(rightWallSconceLight);

    const applyEnvironmentAtFactor = (nf: number, elapsedSec: number) => {
      // Background & Fog
      bgColor.lerpColors(DAY_BG_COLOR, NIGHT_BG_COLOR, nf);
      fog.color.copy(bgColor);
      fog.density = THREE.MathUtils.lerp(0.011, 0.014, nf);

      // Environment reflection & exposure
      scene.environmentIntensity = THREE.MathUtils.lerp(0.95, 0.42, nf);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.06, 1.04, nf);

      // Hemisphere & Sky Key/Fill
      hemiLight.color.lerpColors(DAY_HEMI_SKY, NIGHT_HEMI_SKY, nf);
      hemiLight.groundColor.lerpColors(DAY_HEMI_GROUND, NIGHT_HEMI_GROUND, nf);
      hemiLight.intensity = THREE.MathUtils.lerp(1.2, 0.68, nf);

      skylightKey.color.lerpColors(DAY_KEY_COLOR, NIGHT_KEY_COLOR, nf);
      skylightKey.intensity = THREE.MathUtils.lerp(2.05, 0.34, nf);

      altarFill.color.lerpColors(DAY_FILL_COLOR, NIGHT_FILL_COLOR, nf);
      altarFill.intensity = THREE.MathUtils.lerp(0.62, 0.36, nf);

      palette.skylightGlow.color.lerpColors(
        DAY_SKYLIGHT_COLOR,
        NIGHT_SKYLIGHT_COLOR,
        nf
      );

      // Natural subtle flame flicker (only when Night & motion allowed)
      const allowFlicker =
        nf > 0.04 && !prefersReducedMotionRef.current && !isSoftwareGl;
      const flickerA = allowFlicker
        ? Math.sin(elapsedSec * 4.6) * 0.045 +
          Math.sin(elapsedSec * 10.9) * 0.025
        : 0;
      const flickerB = allowFlicker
        ? Math.cos(elapsedSec * 5.1) * 0.045 +
          Math.sin(elapsedSec * 9.7 + 1.2) * 0.025
        : 0;

      // Offering lamps become primary warm light sources inside Main Hall at night
      leftLampLight.color.lerpColors(DAY_LAMP_COLOR, NIGHT_LAMP_COLOR, nf);
      rightLampLight.color.lerpColors(DAY_LAMP_COLOR, NIGHT_LAMP_COLOR, nf);

      const baseLampPower = THREE.MathUtils.lerp(0.45, 4.4, nf);
      leftLampLight.intensity = baseLampPower * (1 + flickerA * nf);
      rightLampLight.intensity = baseLampPower * (1 + flickerB * nf);

      sanctuaryFrontGlowLight.intensity =
        THREE.MathUtils.lerp(0.0, 2.35, nf) * (1 + (flickerA + flickerB) * 0.3);

      sanctuaryBuddhaFocalLight.color.lerpColors(
        DAY_FOCAL_COLOR,
        NIGHT_FOCAL_COLOR,
        nf
      );
      sanctuaryBuddhaFocalLight.intensity = THREE.MathUtils.lerp(0.55, 2.65, nf);

      const sconcePower = THREE.MathUtils.lerp(0.0, 2.55, nf);
      leftWallSconceLight.intensity = sconcePower * (1 + flickerA * 0.5);
      rightWallSconceLight.intensity = sconcePower * (1 + flickerB * 0.5);

      // Flame & Halo materials
      palette.lampFlame.color.lerpColors(DAY_FLAME_COLOR, NIGHT_FLAME_COLOR, nf);

      const offeringHaloOpacity = THREE.MathUtils.lerp(0.14, 0.62, nf);
      leftLampBuilt.haloMat.opacity = offeringHaloOpacity + flickerA * 0.08;
      rightLampBuilt.haloMat.opacity = offeringHaloOpacity + flickerB * 0.08;

      const sconceHaloOpacity = THREE.MathUtils.lerp(0.08, 0.54, nf);
      courtyard.courtyardSconceHalos.forEach((haloMat, idx) => {
        const fl = idx % 2 === 0 ? flickerA : flickerB;
        haloMat.opacity = sconceHaloOpacity + fl * 0.06;
      });

      const scaleA = 1 + flickerA * 0.85 * nf;
      const scaleB = 1 + flickerB * 0.85 * nf;
      leftLampBuilt.flameMesh.scale.set(1, scaleA, 1);
      rightLampBuilt.flameMesh.scale.set(1, scaleB, 1);
      courtyard.courtyardSconceFlames.forEach((flameMesh, idx) => {
        flameMesh.scale.set(1, idx % 2 === 0 ? scaleA : scaleB, 1);
      });
    };

    // Apply initial Day/Night lighting immediately before first draw
    applyEnvironmentAtFactor(currentNightFactor, 0);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ------------------------------------------------------------
    // 4. COALESCED ON-DEMAND RENDERING + WALK/OVERVIEW MODES + SAFE FLICKER
    // ------------------------------------------------------------
    let lastTimestamp = performance.now();
    const startClockMs = lastTimestamp;
    const prevSafeCameraPos = DEFAULT_CAMERA_POS.clone();
    const savedOverviewCamPos = DEFAULT_CAMERA_POS.clone();
    const savedOverviewTarget = DEFAULT_TARGET_POS.clone();

    let walkController: ReturnType<typeof createTempleWalkController>;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function scheduleCandlePulseIfNeeded() {
      window.clearTimeout(flickerTimerId);
      if (
        disposed ||
        contextLost ||
        document.hidden ||
        isSoftwareGl ||
        prefersReducedMotionRef.current
      ) {
        return;
      }
      if (currentNightFactor > 0.08) {
        // Calm ~20fps gentle candle shimmer on night mode without overheating mobile devices
        flickerTimerId = window.setTimeout(() => {
          if (!disposed && !contextLost && !document.hidden) {
            requestRender();
          }
        }, isSmallViewport ? 55 : 42);
      }
    }

    function requestRender() {
      if (disposed || contextLost || document.hidden) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed || contextLost) {
          renderBusy = false;
          return;
        }
        renderDirty = false;
        const delta = Math.min((now - lastTimestamp) / 1000, 0.1);
        lastTimestamp = now;
        const elapsedSec = (now - startClockMs) / 1000;

        // Smooth 3-6s Day <-> Night exponential transition (instant if reduced motion)
        const targetNf = targetNightFactorRef.current;
        const diffNf = Math.abs(currentNightFactor - targetNf);
        if (diffNf > 0.002) {
          if (prefersReducedMotionRef.current || isSoftwareGl) {
            currentNightFactor = targetNf;
          } else {
            // lambda = 1.25 -> ~3.8s smooth architectural crossfade
            currentNightFactor = THREE.MathUtils.damp(
              currentNightFactor,
              targetNf,
              1.25,
              delta
            );
            renderDirty = true;
          }
        } else {
          currentNightFactor = targetNf;
        }

        applyEnvironmentAtFactor(currentNightFactor, elapsedSec);

        if (cameraModeRef.current === 'walk') {
          const instantWalk = isSoftwareGl || prefersReducedMotionRef.current;
          const walkNeedsMoreFrames = walkController.step(delta, instantWalk);
          if (walkNeedsMoreFrames) {
            renderDirty = true;
          }
        } else if (isResettingCamera) {
          const factor = isSoftwareGl || prefersReducedMotionRef.current ? 1 : 8;
          const instant = isSoftwareGl || prefersReducedMotionRef.current;
          const arrived = stepResetCameraSpherical(
            camera.position,
            controls.target,
            DEFAULT_CAMERA_POS,
            DEFAULT_TARGET_POS,
            prevSafeCameraPos,
            factor,
            delta,
            instant
          );
          camera.lookAt(controls.target);

          if (arrived) {
            const prevDamping = controls.enableDamping;
            controls.enableDamping = false;
            controls.update();
            controls.enableDamping = prevDamping;
            isResettingCamera = false;
          } else {
            renderDirty = true;
          }
        } else {
          const didMove = controls.update();
          const adjusted = resolveOverviewCameraPosition(
            camera.position,
            prevSafeCameraPos,
            controls.target,
            controls.minDistance
          );
          if (adjusted) {
            camera.lookAt(controls.target);
          }
          prevSafeCameraPos.copy(camera.position);

          if (didMove && controls.enableDamping) {
            renderDirty = true;
          }
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && renderDirty) {
            requestRender();
          } else {
            scheduleCandlePulseIfNeeded();
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    }

    const switchCameraMode = (nextMode: 'overview' | 'walk') => {
      if (disposed || contextLost || cameraModeRef.current === nextMode) return;

      if (nextMode === 'walk') {
        savedOverviewCamPos.copy(camera.position);
        savedOverviewTarget.copy(controls.target);
        isResettingCamera = false;
        controls.enabled = false;
        cameraModeRef.current = 'walk';
        setCameraMode('walk');
        walkController.activate();
        lastTimestamp = performance.now();
        requestRender();
      } else {
        walkController.deactivate();
        camera.up.set(0, 1, 0);
        camera.rotation.order = 'XYZ';
        camera.rotation.set(0, 0, 0);
        controls.target.copy(savedOverviewTarget);
        camera.position.copy(savedOverviewCamPos);
        prevSafeCameraPos.copy(savedOverviewCamPos);
        resolveOverviewCameraPosition(
          camera.position,
          prevSafeCameraPos,
          controls.target,
          controls.minDistance
        );
        prevSafeCameraPos.copy(camera.position);
        camera.lookAt(controls.target);
        const prevDamping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = prevDamping;
        controls.enabled = true;
        cameraModeRef.current = 'overview';
        setCameraMode('overview');
        lastTimestamp = performance.now();
        requestRender();
      }
    };

    walkController = createTempleWalkController({
      camera,
      domElement: renderer.domElement,
      registry: collisionRegistry,
      requestRender,
      onRequestExitWalk: () => switchCameraMode('overview'),
    });

    if (cameraModeRef.current === 'walk') {
      controls.enabled = false;
      walkController.activate();
    }

    const handleControlsStart = () => {
      isResettingCamera = false;
    };
    const handleControlsChange = () => {
      if (cameraModeRef.current === 'overview') {
        requestRender();
      }
    };

    controls.addEventListener('start', handleControlsStart);
    controls.addEventListener('change', handleControlsChange);

    notifyLightingChangeRef.current = () => {
      lastTimestamp = performance.now();
      requestRender();
    };

    switchModeFnRef.current = switchCameraMode;

    resetWalkSpawnFnRef.current = () => {
      if (!disposed && !contextLost && cameraModeRef.current === 'walk') {
        walkController.resetToSpawn();
        lastTimestamp = performance.now();
        requestRender();
      }
    };

    resetCameraFnRef.current = () => {
      if (disposed || contextLost) return;
      if (cameraModeRef.current === 'walk') {
        walkController.resetToSpawn();
      } else {
        isResettingCamera = true;
      }
      lastTimestamp = performance.now();
      requestRender();
    };

    const handleResize = () => {
      if (disposed || contextLost || !container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      const nextAspect = w / h;
      camera.fov = nextAspect < 0.85 ? 64 : 48;
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        window.clearTimeout(flickerTimerId);
        walkController.clearInputs();
      } else if (!disposed && !contextLost) {
        lastTimestamp = performance.now();
        requestRender();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (disposed) return;
      contextLost = true;
      renderBusy = false;
      renderDirty = false;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      clearTimeout(flickerTimerId);
      walkController.clearInputs();
      controls.enabled = false;
      setIsLoading(false);
      setWebglError('context-lost');
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    requestRender();
    setIsLoading(false);

    return () => {
      disposed = true;
      resetCameraFnRef.current = null;
      resetWalkSpawnFnRef.current = null;
      switchModeFnRef.current = null;
      notifyLightingChangeRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      clearTimeout(flickerTimerId);

      walkController.dispose();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      controls.removeEventListener('start', handleControlsStart);
      controls.removeEventListener('change', handleControlsChange);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );

      controls.dispose();
      disposeSceneHierarchy(scene);
      palette.textures.forEach((tex) => tex.dispose());
      palette.materials.forEach((mat) => mat.dispose());
      extraTextures.forEach((tex) => tex.dispose());
      extraMaterials.forEach((mat) => mat.dispose());

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleResetView = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    if (cameraMode === 'walk') {
      resetWalkSpawnFnRef.current?.();
    } else {
      resetCameraFnRef.current?.();
    }
  };

  const isNight = resolvedEnvironment === 'night';

  const modeOptions: {
    id: TempleLightingPreference;
    label: string;
    icon: typeof Compass;
  }[] = [
    {
      id: 'auto',
      label: 'Auto',
      icon: Compass,
    },
    {
      id: 'day',
      label: isEn ? 'Day' : '白天',
      icon: Sun,
    },
    {
      id: 'night',
      label: isEn ? 'Night' : '夜晚',
      icon: Moon,
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col select-none transition-colors ${
        prefersReducedMotion ? 'duration-0' : 'duration-700'
      } ${isNight ? 'bg-[#26201a]' : 'bg-[#ede6da]'}`}
      id="temple-3d-experience"
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? 'Yixiu Little Temple 3D Space' : '一休小庙 3D 空间'}
    >
      {/* Top Minimal Control Bar (Fits 390px single-row cleanly, zero backdrop-blur over WebGL) */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3.5 bg-[#faf7f2]/95 border-b border-[#e5dec9]">
        <button
          type="button"
          onClick={onClose}
          id="temple-3d-exit-btn"
          aria-label={isEn ? 'Return from Yixiu Little Temple' : '离开一休小庙返回上一页'}
          className="px-3 sm:px-3.5 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--amnd-wood)] shrink-0" />
          <span>{isEn ? 'Back' : '返回'}</span>
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-[var(--amnd-text-secondary)]">
          <Compass className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
          <span className="font-serif font-medium text-[var(--amnd-text-primary)]">
            {isEn ? 'Yixiu Little Temple' : '一休小庙'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {isNight
              ? isEn
                ? 'Evening Lamp Illumination'
                : '夜间供灯模式'
              : isEn
                ? 'Natural Daylight'
                : '日间自然天光'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {!webglError && (
            <>
              <div
                className="inline-flex items-center p-0.5 rounded-xl bg-[#ebe5d9] border border-[#d4cbb5]"
                role="group"
                aria-label={isEn ? 'Viewing Mode' : '浏览模式'}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    switchModeFnRef.current?.('overview');
                  }}
                  id="temple-3d-mode-overview-btn"
                  aria-pressed={cameraMode === 'overview'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                    cameraMode === 'overview'
                      ? 'bg-[#7c624c] text-[#fffdf9]'
                      : 'text-[#544e46] hover:text-[#262320] hover:bg-[#f3efe7]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{isEn ? '360°' : '全景'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    switchModeFnRef.current?.('walk');
                  }}
                  id="temple-3d-mode-walk-btn"
                  aria-pressed={cameraMode === 'walk'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                    cameraMode === 'walk'
                      ? 'bg-[#7c624c] text-[#fffdf9]'
                      : 'text-[#544e46] hover:text-[#262320] hover:bg-[#f3efe7]'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Walk' : '漫游'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetView}
                id="temple-3d-reset-view-btn"
                className="px-2.5 sm:px-3 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[44px]"
                title={
                  cameraMode === 'walk'
                    ? isEn
                      ? 'Return to South Gate Walk Spawn'
                      : '回到山门漫游起点'
                    : isEn
                      ? 'Return to South Gate Courtyard View'
                      : '回到南门庭院视角'
                }
              >
                <RotateCcw className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
                <span className="hidden sm:inline">
                  {cameraMode === 'walk'
                    ? isEn
                      ? 'Gate Start'
                      : '山门起点'
                    : isEn
                      ? 'South Gate'
                      : '南门视角'}
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowInfoSheet((prev) => !prev)}
            className="p-2.5 amnd-btn-secondary inline-flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            aria-label={isEn ? 'Space & Model Info' : '空间与模型说明'}
            aria-expanded={showInfoSheet}
          >
            <Info className="w-4 h-4 text-[var(--amnd-wood)]" />
          </button>
        </div>
      </div>

      {/* Main Viewport Area */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          ref={mountRef}
          className="w-full h-full"
          id="temple-3d-canvas-container"
        />

        {/* Minimal WebGL Error State (keeps Return control available) */}
        {webglError && (
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center ${
              isNight ? 'bg-[#221d18] text-[#f5efe6]' : 'bg-[#ede6da] text-[#262320]'
            }`}
            id="temple-3d-webgl-error"
            role="alert"
          >
            <div
              className={`max-w-md w-full rounded-2xl border p-6 space-y-4 ${
                isNight
                  ? 'bg-[#2c251e] border-[#493c2f]'
                  : 'bg-[#fffdf9] border-[#e5dec9]'
              }`}
            >
              <p className="font-serif text-base font-semibold">
                {isEn
                  ? 'Unable to Start 3D Space'
                  : '暂时无法启动 3D 实时空间'}
              </p>
              <p
                className={`text-xs leading-relaxed ${
                  isNight ? 'text-[#cfc4b5]' : 'text-[var(--amnd-text-secondary)]'
                }`}
              >
                {webglError === 'context-lost'
                  ? isEn
                    ? 'The WebGL graphics context was interrupted by your browser or device. Please return and re-enter Yixiu Little Temple.'
                    : '浏览器或设备的 WebGL 图形上下文已中断，请返回后重新进入一休小庙。'
                  : isEn
                    ? 'WebGL 3D rendering is unavailable in this browser or environment.'
                    : '当前浏览器或设备环境暂不支持 WebGL 实时 3D 渲染。'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 amnd-btn-primary text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Back' : '返回'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && !webglError && (
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 space-y-3 ${
              isNight ? 'bg-[#26201a] text-[#f5efe6]' : 'bg-[#ede6da] text-[#262320]'
            }`}
          >
            <Compass
              className="w-6 h-6 text-[var(--amnd-gold)] animate-spin"
              style={{ animationDuration: '6s' }}
            />
            <p className="font-serif text-base font-medium">
              {isEn ? 'Preparing Yixiu Little Temple…' : '正在布置一休小庙空间与昼夜光影…'}
            </p>
            <p className="text-xs opacity-75">
              {isEn
                ? 'On-demand 3D loading for calm performance'
                : '按需加载轻量化 3D 场景'}
            </p>
          </div>
        )}

        {/* Collapsible Model & Lighting Info Card */}
        {showInfoSheet && (
          <div className="absolute top-3 right-3 left-3 sm:left-auto sm:w-96 z-20 amnd-surface p-4 sm:p-5 space-y-3 text-left shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--amnd-border)] pb-2">
              <span className="font-serif text-sm font-semibold text-[var(--amnd-text-primary)]">
                {isEn ? 'Yixiu Little Temple · Space & Time' : '一休小庙 · 光影与空间说明'}
              </span>
              <button
                type="button"
                onClick={() => setShowInfoSheet(false)}
                className="p-1.5 rounded-lg text-[var(--amnd-text-muted)] hover:text-[var(--amnd-text-primary)] cursor-pointer"
                aria-label={isEn ? 'Close' : '关闭'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-[var(--amnd-text-secondary)] leading-relaxed">
              <p className="font-serif text-[var(--amnd-text-primary)]">
                {isEn
                  ? 'A little place to pause and return to yourself.'
                  : '累了，就回来歇一歇。'}
              </p>
              <p>
                <strong className="text-[var(--amnd-text-primary)]">
                  {isEn ? 'Beijing Time Auto Mode: ' : '北京时间昼夜规则：'}
                </strong>
                {isEn
                  ? `06:00–18:59 Day, 19:00–05:59 Night (Asia/Shanghai · now ${beijingTimeLabel}). Manual selection stays saved on this device.`
                  : `06:00–18:59 为白天自然光，19:00–05:59 为夜间供灯模式（当前北京时间 ${beijingTimeLabel}）。切换过程平滑过渡。`}
              </p>
              <p>
                <strong className="text-[var(--amnd-text-primary)]">
                  {isEn ? 'Exploration Modes: ' : '空间浏览方式：'}
                </strong>
                {cameraMode === 'walk'
                  ? isEn
                    ? 'Walk mode: use WASD or Arrow keys to stroll slowly through the South Gate, Courtyard, Corridors, Main Hall, and Side Halls; drag with mouse or finger to look around; press Esc to return to 360° Overview.'
                    : '第一人称漫游模式：使用 WASD 或方向键缓步穿行山门、庭院、回廊、大雄宝殿及东西侧殿；拖动画面环顾四周；按 Esc 返回 360° 全景观察。'
                  : isEn
                    ? '360° Overview: drag to orbit around the temple exterior, right-drag or two-finger drag to pan, scroll or pinch to zoom, or switch to Walk to step inside the halls.'
                    : '360° 全景模式：拖动可环绕观察寺院建筑群，右键或双指拖动平移焦点，滚轮或双指缩放；点击顶部“漫游”可由山门步入殿堂内部。'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Compact Lighting Mode Bar + Guidance (Clean on 390px & Desktop) */}
      <div className="relative z-20 px-3 py-2.5 sm:px-6 bg-[#faf7f2]/95 border-t border-[#e5dec9] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#ebe5d9] border border-[#d4cbb5] w-full sm:w-auto justify-between sm:justify-start"
          role="group"
          aria-label={isEn ? 'Lighting Environment Mode' : '昼夜光影模式'}
        >
          {modeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = lightingPreference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeLightingPreference(opt.id)}
                id={`temple-3d-lighting-${opt.id}`}
                aria-pressed={active}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                  active
                    ? 'bg-[#7c624c] text-[#fffdf9]'
                    : 'text-[#544e46] hover:text-[#262320] hover:bg-[#f3efe7]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-2 text-[11px] text-[var(--amnd-text-muted)] text-center">
          <span className="tabular-nums text-[var(--amnd-wood)] font-medium">
            {isEn ? `Beijing ${beijingTimeLabel}` : `北京时间 ${beijingTimeLabel}`}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {lightingPreference === 'auto'
              ? isNight
                ? isEn
                  ? 'Auto (Night)'
                  : '自动 · 夜晚'
                : isEn
                  ? 'Auto (Day)'
                  : '自动 · 白天'
              : isNight
                ? isEn
                  ? 'Manual Night'
                  : '手动夜晚'
                : isEn
                  ? 'Manual Day'
                  : '手动白天'}
          </span>
          {!webglError && (
            <>
              <span className="hidden md:inline" aria-hidden="true">
                ·
              </span>
              <span className="hidden md:inline">
                {cameraMode === 'walk'
                  ? isEn
                    ? 'WASD / Arrows to walk · Drag to look · Esc for 360°'
                    : 'WASD / 方向键漫步 · 拖动环顾四周 · Esc 返回全景'
                  : isEn
                    ? 'Drag to orbit 360° · Right-drag to pan · Scroll or pinch to zoom'
                    : '拖动 360° 环绕 · 右键平移 · 缩放调节远近'}
              </span>
              <span className="md:hidden" aria-hidden="true">
                ·
              </span>
              <span className="md:hidden">
                {cameraMode === 'walk'
                  ? isEn
                    ? 'Drag to look'
                    : '拖动环顾'
                  : isEn
                    ? 'Drag to orbit · Pinch zoom'
                    : '单指环绕 · 双指缩放'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

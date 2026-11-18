import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  Compass,
  Eye,
  Info,
  Moon,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import templeHallImg from '../../assets/images/temple_modern_hall_1794884029399.jpg';
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
import type {
  TempleLightingPreference,
  TempleResolvedEnvironment,
} from './templeLightingTime';

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

const _desiredCamPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

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
  const notifyLightingChangeRef = useRef<(() => void) | null>(null);
  const bridgeRef = useRef<Temple3DInteractionBridge | undefined>(interactionBridge);
  bridgeRef.current = interactionBridge;

  // Live target night factor (0 = Day, 1 = Night) read by WebGL loop without remounting
  const targetNightFactorRef = useRef<number>(
    resolvedEnvironment === 'night' ? 1 : 0
  );
  useEffect(() => {
    targetNightFactorRef.current = resolvedEnvironment === 'night' ? 1 : 0;
    notifyLightingChangeRef.current?.();
  }, [resolvedEnvironment]);

  const [isLoading, setIsLoading] = useState(true);
  const [useStaticFallback, setUseStaticFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<'unsupported' | 'user' | null>(
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

  // Build procedural offering lamp (LatheGeometry + flame + soft glow halo)
  const buildOfferingLamp = (
    bronzeMat: THREE.Material,
    goldMat: THREE.Material,
    flameMat: THREE.Material
  ) => {
    const group = new THREE.Group();

    const baseProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.11, 0),
      new THREE.Vector2(0.1, 0.03),
      new THREE.Vector2(0.045, 0.06),
      new THREE.Vector2(0.025, 0.16),
      new THREE.Vector2(0.035, 0.2),
      new THREE.Vector2(0.095, 0.25),
      new THREE.Vector2(0.105, 0.29),
      new THREE.Vector2(0.088, 0.295),
      new THREE.Vector2(0.075, 0.24),
      new THREE.Vector2(0, 0.23),
    ];
    const bodyMesh = new THREE.Mesh(
      new THREE.LatheGeometry(baseProfile, 28),
      bronzeMat
    );
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    const rimMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.096, 0.008, 12, 28),
      goldMat
    );
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.292;
    group.add(rimMesh);

    const flameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, 0.058, 14),
      flameMat
    );
    flameMesh.position.y = 0.28;
    group.add(flameMesh);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd58e,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 14, 12),
      haloMat
    );
    haloMesh.position.y = 0.282;
    group.add(haloMesh);

    return { group, flameMesh, haloMesh, haloMat };
  };

  // Build procedural stoneware floral vase with quiet botanical stems
  const buildFloralVase = (
    ceramicMat: THREE.Material,
    stemMat: THREE.Material,
    petalMat: THREE.Material,
    mirrorSide: number
  ) => {
    const group = new THREE.Group();

    const vaseProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.085, 0),
      new THREE.Vector2(0.125, 0.12),
      new THREE.Vector2(0.115, 0.25),
      new THREE.Vector2(0.055, 0.36),
      new THREE.Vector2(0.062, 0.42),
      new THREE.Vector2(0.052, 0.42),
      new THREE.Vector2(0.044, 0.34),
      new THREE.Vector2(0, 0.32),
    ];
    const vaseMesh = new THREE.Mesh(
      new THREE.LatheGeometry(vaseProfile, 28),
      ceramicMat
    );
    vaseMesh.castShadow = true;
    vaseMesh.receiveShadow = true;
    group.add(vaseMesh);

    const branchCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.34, 0),
      new THREE.Vector3(0.03 * mirrorSide, 0.48, 0.02),
      new THREE.Vector3(0.1 * mirrorSide, 0.62, -0.02),
      new THREE.Vector3(0.15 * mirrorSide, 0.72, 0.03),
    ]);
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(branchCurve1, 14, 0.006, 6, false),
        stemMat
      )
    );

    const branchCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.34, 0),
      new THREE.Vector3(-0.02 * mirrorSide, 0.5, -0.02),
      new THREE.Vector3(-0.07 * mirrorSide, 0.63, 0.03),
    ]);
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(branchCurve2, 12, 0.005, 6, false),
        stemMat
      )
    );

    const blossomPositions: [number, number, number, number][] = [
      [0.09 * mirrorSide, 0.6, -0.015, 0.024],
      [0.145 * mirrorSide, 0.71, 0.028, 0.02],
      [-0.065 * mirrorSide, 0.62, 0.028, 0.022],
      [0.03 * mirrorSide, 0.53, 0.025, 0.018],
    ];
    const budGeo = new THREE.SphereGeometry(1, 12, 10);
    blossomPositions.forEach(([bx, by, bz, scale]) => {
      const blossom = new THREE.Mesh(budGeo, petalMat);
      blossom.position.set(bx, by, bz);
      blossom.scale.set(scale * 1.15, scale * 0.85, scale * 1.15);
      group.add(blossom);
    });

    return group;
  };

  useEffect(() => {
    if (useStaticFallback) {
      setIsLoading(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const capability = detectSoftwareWebGL();
    if (!capability.supported) {
      setUseStaticFallback(true);
      setFallbackReason('unsupported');
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
      setUseStaticFallback(true);
      setFallbackReason('unsupported');
      setIsLoading(false);
      return;
    }

    let disposed = false;
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
    const camera = new THREE.PerspectiveCamera(initialFov, aspect, 0.15, 95);
    camera.position.copy(DEFAULT_CAMERA_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_TARGET_POS);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.rotateSpeed = isSmallViewport ? 0.65 : 0.78;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 2.8;
    controls.maxDistance = 19.5;
    controls.minAzimuthAngle = -Math.PI * 0.48;
    controls.maxAzimuthAngle = Math.PI * 0.48;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.53;
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

    // A. Main Statue Slot (Stepped Limestone Pedestal + Lotus Base + Nimbus)
    const mainStatueAnchor = createAnchor('mainStatue');
    {
      const plinthLower = new THREE.Mesh(
        new THREE.CylinderGeometry(1.18, 1.32, 0.24, 32),
        palette.stonePedestal
      );
      plinthLower.position.y = 0.12;
      plinthLower.castShadow = true;
      plinthLower.receiveShadow = true;
      mainStatueAnchor.add(plinthLower);

      const plinthMid = new THREE.Mesh(
        new THREE.BoxGeometry(1.85, 0.32, 1.45),
        palette.stoneRunner
      );
      plinthMid.position.y = 0.4;
      plinthMid.castShadow = true;
      plinthMid.receiveShadow = true;
      mainStatueAnchor.add(plinthMid);

      const lotusProfile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.76, 0),
        new THREE.Vector2(0.84, 0.08),
        new THREE.Vector2(0.68, 0.16),
        new THREE.Vector2(0.82, 0.24),
        new THREE.Vector2(0.74, 0.31),
        new THREE.Vector2(0, 0.31),
      ];
      const lotusPlinth = new THREE.Mesh(
        new THREE.LatheGeometry(lotusProfile, 36),
        palette.mutedGold
      );
      lotusPlinth.position.y = 0.56;
      lotusPlinth.castShadow = true;
      lotusPlinth.receiveShadow = true;
      mainStatueAnchor.add(lotusPlinth);

      const nimbusOuter = new THREE.Mesh(
        new THREE.TorusGeometry(1.22, 0.045, 16, 64),
        palette.mutedGold
      );
      nimbusOuter.position.set(0, 2.02, -0.45);
      mainStatueAnchor.add(nimbusOuter);

      const nimbusInner = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.022, 12, 48),
        palette.bronzeMetal
      );
      nimbusInner.position.set(0, 2.02, -0.45);
      mainStatueAnchor.add(nimbusInner);

      const haloBackplate = new THREE.Mesh(
        new THREE.CircleGeometry(0.88, 40),
        palette.stoneRunner
      );
      haloBackplate.position.set(0, 2.02, -0.47);
      mainStatueAnchor.add(haloBackplate);

      const steleBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.38, 0.12, 24),
        palette.stonePedestal
      );
      steleBase.position.y = 0.93;
      mainStatueAnchor.add(steleBase);

      const steleArchShape = new THREE.Shape();
      steleArchShape.moveTo(-0.34, 0);
      steleArchShape.lineTo(0.34, 0);
      steleArchShape.lineTo(0.34, 1.05);
      steleArchShape.absarc(0, 1.05, 0.34, 0, Math.PI, false);
      steleArchShape.closePath();

      const steleGeo = new THREE.ExtrudeGeometry(steleArchShape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3,
      });
      steleGeo.center();
      const steleMesh = new THREE.Mesh(steleGeo, palette.stoneRunner);
      steleMesh.position.set(0, 1.69, 0);
      steleMesh.castShadow = true;
      steleMesh.receiveShadow = true;
      mainStatueAnchor.add(steleMesh);

      const shadowMat = new THREE.MeshBasicMaterial({
        map: palette.contactShadowTexture,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      });
      extraMaterials.push(shadowMat);
      const contactShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 2.6),
        shadowMat
      );
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.y = 0.006;
      mainStatueAnchor.add(contactShadow);
    }

    // B. Offering Table & Censer
    const altarAnchor = createAnchor('altarTable');
    {
      const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(5.1, 0.1, 1.06),
        palette.darkWalnutWood
      );
      tableTop.position.y = 0.87;
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      altarAnchor.add(tableTop);

      const brassInlay = new THREE.Mesh(
        new THREE.BoxGeometry(5.12, 0.022, 1.08),
        palette.mutedGold
      );
      brassInlay.position.y = 0.815;
      altarAnchor.add(brassInlay);

      const apron = new THREE.Mesh(
        new THREE.BoxGeometry(4.65, 0.14, 0.82),
        palette.naturalWood
      );
      apron.position.y = 0.74;
      altarAnchor.add(apron);

      const legGeo = new THREE.BoxGeometry(0.14, 0.82, 0.14);
      [
        [-2.25, -0.36],
        [2.25, -0.36],
        [-2.25, 0.36],
        [2.25, 0.36],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, palette.darkWalnutWood);
        leg.position.set(lx, 0.41, lz);
        leg.castShadow = true;
        altarAnchor.add(leg);
      });

      const censerProfile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.09, 0),
        new THREE.Vector2(0.075, 0.03),
        new THREE.Vector2(0.14, 0.1),
        new THREE.Vector2(0.15, 0.15),
        new THREE.Vector2(0.125, 0.16),
        new THREE.Vector2(0.11, 0.11),
        new THREE.Vector2(0, 0.1),
      ];
      const censer = new THREE.Mesh(
        new THREE.LatheGeometry(censerProfile, 28),
        palette.bronzeMetal
      );
      censer.position.y = 0.92;
      censer.castShadow = true;
      altarAnchor.add(censer);
    }

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

    // E. Contemplation Mat & Reserved V2.2 / V2.3 Anchors
    const devoteeAnchor = createAnchor('devoteeAvatar');
    {
      const cushionMatBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.04, 1.15),
        palette.darkWalnutWood
      );
      cushionMatBase.position.y = -0.01;
      cushionMatBase.receiveShadow = true;
      devoteeAnchor.add(cushionMatBase);

      const cushionTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.42, 0.09, 28),
        palette.linenCushion
      );
      cushionTop.position.y = 0.055;
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
    skylightKey.position.set(11.0, 18.0, 9.0);
    skylightKey.target.position.set(0, 1.2, -5.5);
    scene.add(skylightKey.target);
    if (!isSoftwareGl) {
      skylightKey.castShadow = true;
      skylightKey.shadow.mapSize.set(
        isSmallViewport ? 1024 : 2048,
        isSmallViewport ? 1024 : 2048
      );
      skylightKey.shadow.camera.near = 1.0;
      skylightKey.shadow.camera.far = 46;
      skylightKey.shadow.camera.left = -16;
      skylightKey.shadow.camera.right = 16;
      skylightKey.shadow.camera.top = 16;
      skylightKey.shadow.camera.bottom = -16;
      skylightKey.shadow.bias = -0.0005;
      skylightKey.shadow.normalBias = 0.025;
    }
    scene.add(skylightKey);

    const altarFill = new THREE.DirectionalLight(0xfff7ea, 0.62);
    altarFill.position.set(-8.0, 6.5, 8.0);
    scene.add(altarFill);

    // Primary offering lamps on Main Hall table
    const leftLampLight = new THREE.PointLight(0xffcb7a, 0.5, 13.5, 1.65);
    leftLampLight.position.set(-1.42, 1.88, -11.88);
    scene.add(leftLampLight);

    const rightLampLight = new THREE.PointLight(0xffcb7a, 0.5, 13.5, 1.65);
    rightLampLight.position.set(1.42, 1.88, -11.88);
    scene.add(rightLampLight);

    // Warm sanctuary front lamp light keeping main statue & pedestal contours legible at night
    const sanctuaryFrontGlowLight = new THREE.PointLight(0xffcd85, 0.0, 12.5, 1.55);
    sanctuaryFrontGlowLight.position.set(0, 2.25, -12.0);
    scene.add(sanctuaryFrontGlowLight);

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
        THREE.MathUtils.lerp(0.0, 3.1, nf) * (1 + (flickerA + flickerB) * 0.35);

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
    // 4. COALESCED ON-DEMAND RENDERING + SMOOTH 4s TRANSITION + SAFE FLICKER
    // ------------------------------------------------------------
    let lastTimestamp = performance.now();
    const startClockMs = lastTimestamp;

    function clampCameraInsideHall() {
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -10.8, 10.8);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.35, 10.0);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -14.8, 9.5);
    }

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
        document.hidden ||
        isSoftwareGl ||
        prefersReducedMotionRef.current
      ) {
        return;
      }
      if (currentNightFactor > 0.08) {
        // Calm ~20fps gentle candle shimmer on night mode without overheating mobile devices
        flickerTimerId = window.setTimeout(() => {
          if (!disposed && !document.hidden) {
            requestRender();
          }
        }, isSmallViewport ? 55 : 42);
      }
    }

    function requestRender() {
      if (disposed || document.hidden) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
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

        if (isResettingCamera) {
          const factor = isSoftwareGl || prefersReducedMotionRef.current ? 1 : 8;
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            DEFAULT_CAMERA_POS.x,
            factor,
            delta
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            DEFAULT_CAMERA_POS.y,
            factor,
            delta
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            DEFAULT_CAMERA_POS.z,
            factor,
            delta
          );
          controls.target.x = THREE.MathUtils.damp(
            controls.target.x,
            DEFAULT_TARGET_POS.x,
            factor,
            delta
          );
          controls.target.y = THREE.MathUtils.damp(
            controls.target.y,
            DEFAULT_TARGET_POS.y,
            factor,
            delta
          );
          controls.target.z = THREE.MathUtils.damp(
            controls.target.z,
            DEFAULT_TARGET_POS.z,
            factor,
            delta
          );

          const distCam = _desiredCamPos
            .copy(camera.position)
            .distanceTo(DEFAULT_CAMERA_POS);
          const distTarget = _desiredTarget
            .copy(controls.target)
            .distanceTo(DEFAULT_TARGET_POS);
          if (distCam < 0.015 && distTarget < 0.015) {
            camera.position.copy(DEFAULT_CAMERA_POS);
            controls.target.copy(DEFAULT_TARGET_POS);
            isResettingCamera = false;
          } else {
            renderDirty = true;
          }
        }

        const didMove = controls.update();
        clampCameraInsideHall();
        renderer.render(scene, camera);

        if (didMove && controls.enableDamping) {
          renderDirty = true;
        }

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

    const handleControlsStart = () => {
      isResettingCamera = false;
    };
    const handleControlsChange = () => {
      requestRender();
    };

    controls.addEventListener('start', handleControlsStart);
    controls.addEventListener('change', handleControlsChange);

    notifyLightingChangeRef.current = () => {
      lastTimestamp = performance.now();
      requestRender();
    };

    resetCameraFnRef.current = () => {
      isResettingCamera = true;
      lastTimestamp = performance.now();
      requestRender();
    };

    const handleResize = () => {
      if (disposed || !container) return;
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
      } else if (!disposed) {
        lastTimestamp = performance.now();
        requestRender();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (!disposed) {
        setUseStaticFallback(true);
        setFallbackReason('unsupported');
      }
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    requestRender();
    setIsLoading(false);

    return () => {
      disposed = true;
      resetCameraFnRef.current = null;
      notifyLightingChangeRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      clearTimeout(flickerTimerId);

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
  }, [useStaticFallback]);

  const handleResetView = () => {
    resetCameraFnRef.current?.();
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
      aria-label={isEn ? '3D Temple Sanctuary Hall' : '3D 静观大殿空间'}
    >
      {/* Top Minimal Control Bar (Fits 390px single-row cleanly, zero backdrop-blur over WebGL) */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3.5 bg-[#faf7f2]/95 border-b border-[#e5dec9]">
        <button
          type="button"
          onClick={onClose}
          id="temple-3d-exit-btn"
          className="px-3.5 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--amnd-wood)]" />
          <span>{isEn ? 'Back to Temple' : '返回寺庙'}</span>
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-[var(--amnd-text-secondary)]">
          <Compass className="w-3.5 h-3.5 text-[var(--amnd-gold)]" />
          <span className="font-serif font-medium text-[var(--amnd-text-primary)]">
            {isEn ? 'Courtyard Sanctuary' : '静观大雄宝殿庭院'}
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

        <div className="flex items-center gap-2">
          {!useStaticFallback && (
            <button
              type="button"
              onClick={handleResetView}
              id="temple-3d-reset-view-btn"
              className="px-3 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[44px]"
              title={isEn ? 'Return to South Gate Courtyard View' : '回到南门庭院视角'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
              <span>{isEn ? 'South Gate' : '南门视角'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (useStaticFallback) {
                setFallbackReason(null);
                setUseStaticFallback(false);
                setIsLoading(true);
              } else {
                setFallbackReason('user');
                setUseStaticFallback(true);
              }
            }}
            id="temple-3d-toggle-static-btn"
            className="px-3 py-2 amnd-btn-secondary text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[44px]"
            title={
              useStaticFallback
                ? isEn
                  ? 'Switch to 3D Interactive Mode'
                  : '切换回 3D 交互空间'
                : isEn
                  ? 'Low-Power Static View'
                  : '切换静态省电视图'
            }
          >
            <Eye className="w-3.5 h-3.5 text-[var(--amnd-wood)]" />
            <span className="hidden sm:inline">
              {useStaticFallback
                ? isEn
                  ? '3D View'
                  : '3D 视角'
                : isEn
                  ? 'Static'
                  : '静态视图'}
            </span>
          </button>

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
        {!useStaticFallback ? (
          <div
            ref={mountRef}
            className="w-full h-full"
            id="temple-3d-canvas-container"
          />
        ) : (
          /* Low-Performance / Static Fallback Scene with Day & Night Atmosphere */
          <div
            className={`w-full h-full relative flex items-center justify-center p-4 sm:p-8 overflow-y-auto transition-colors ${
              prefersReducedMotion ? 'duration-0' : 'duration-1000'
            } ${isNight ? 'bg-[#221d18]' : 'bg-[#ede6da]'}`}
            id="temple-3d-static-fallback"
          >
            <div
              className={`max-w-3xl w-full rounded-2xl border p-4 sm:p-6 space-y-4 transition-colors ${
                prefersReducedMotion ? 'duration-0' : 'duration-1000'
              } ${
                isNight
                  ? 'bg-[#2c251e] border-[#493c2f] text-[#f5efe6]'
                  : 'bg-[#fffdf9] border-[#e5dec9] text-[#262320]'
              }`}
            >
              <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#1e1914]">
                <img
                  src={templeHallImg}
                  alt={
                    isEn
                      ? 'Minimalist temple sanctuary hall static fallback view'
                      : '静观大殿静态降级视图'
                  }
                  className={`w-full h-full object-cover transition-all ${
                    prefersReducedMotion ? 'duration-0' : 'duration-1000'
                  } ${
                    isNight
                      ? 'brightness-[0.58] contrast-[1.06]'
                      : 'brightness-100 contrast-100'
                  }`}
                  referrerPolicy="no-referrer"
                />
                {isNight && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 48%, rgba(242, 186, 98, 0.22) 0%, rgba(30, 24, 18, 0.35) 58%, rgba(22, 18, 14, 0.65) 100%)',
                    }}
                  />
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="space-y-1">
                  <p className="font-serif text-base font-semibold">
                    {isNight
                      ? isEn
                        ? 'Static Sanctuary View · Night Lamps'
                        : '静态大殿预览 · 夜间供灯氛围'
                      : isEn
                        ? 'Static Sanctuary View · Daylight'
                        : '静态大殿预览 · 日间自然光'}
                  </p>
                  <p
                    className={`text-xs ${
                      isNight ? 'text-[#cfc4b5]' : 'text-[var(--amnd-text-secondary)]'
                    }`}
                  >
                    {fallbackReason === 'unsupported'
                      ? isEn
                        ? 'WebGL is unavailable in this environment, so a calm static sanctuary preview is active.'
                        : '当前环境暂不支持 WebGL 实时渲染，已自动切换为静态大殿视图以保持流畅浏览。'
                      : isEn
                        ? 'Low-power static preview enabled. Day and night atmosphere updates cleanly here too.'
                        : '当前处于静态省电视图，昼夜光影氛围同样在此生效。'}
                  </p>
                </div>

                {fallbackReason !== 'unsupported' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFallbackReason(null);
                      setUseStaticFallback(false);
                      setIsLoading(true);
                    }}
                    className="px-4 py-2.5 amnd-btn-primary text-xs font-medium cursor-pointer whitespace-nowrap min-h-[40px]"
                  >
                    {isEn ? 'Enter 3D Hall' : '恢复 3D 交互'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && !useStaticFallback && (
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
              {isEn ? 'Preparing Sanctuary Space…' : '正在布置大殿空间与昼夜光影…'}
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
                {isEn ? 'Sanctuary & Time Rules' : '大殿光影与模型说明'}
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
                  {isEn ? 'Observation: ' : '视角操作：'}
                </strong>
                {isEn
                  ? 'Drag with mouse or one finger to orbit inside the hall; scroll or pinch to adjust distance.'
                  : '鼠标左键或单指拖动可环顾大殿；滚轮或双指缩放可拉近观察供台与供灯。'}
              </p>
              <p>
                <strong className="text-[var(--amnd-text-primary)]">
                  {isEn ? 'Statue Slot: ' : '主尊模型接口：'}
                </strong>
                {isEn
                  ? TEMPLE_MODEL_MANIFEST.mainStatue.notesEn
                  : TEMPLE_MODEL_MANIFEST.mainStatue.notesZh}
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
          <span className="hidden md:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden md:inline">
            {isEn
              ? 'Drag to orbit · Scroll or pinch to zoom'
              : '拖动旋转视角 · 缩放调节远近'}
          </span>
        </div>
      </div>
    </div>
  );
}

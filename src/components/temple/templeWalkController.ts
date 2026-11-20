import * as THREE from 'three';
import {
  moveActorWithCollisions,
  resolveWalkableGroundY,
  TempleCollisionRegistry,
} from './templeCollisionRegistry';

/**
 * First-Person Walk Controller & Reusable Actor State (Phase 2B.2).
 * Cleanly decouples Input -> Actor Movement -> Collision -> Camera so future
 * third-person / novice avatar views can reuse the same actor & ground system.
 */

export interface WalkActorState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  groundY: number;
  eyeHeight: number;
  radius: number;
  height: number;
  isMoving: boolean;
}

export const WALK_DEFAULTS = {
  spawnX: 0,
  spawnY: 0.025,
  spawnZ: 11.2,
  spawnYaw: 0, // Facing North (-Z) from inside South Gate across open forecourt toward Main Hall
  spawnPitch: 0.06,
  eyeHeight: 1.65,
  radius: 0.27,
  height: 1.72,
  walkSpeed: 1.85, // Calm meditative walking pace (m/s)
  accelLambda: 14,
  decelLambda: 18,
  lookLambda: 22,
  eyeYLambda: 16,
  minPitch: -0.62,
  maxPitch: 0.68,
  pointerSensitivity: 0.0032,
} as const;

export interface TempleWalkController {
  readonly actor: WalkActorState;
  activate: (instant?: boolean) => void;
  deactivate: () => void;
  resetToSpawn: (instant?: boolean) => void;
  clearInputs: () => void;
  step: (delta: number, instant: boolean) => boolean;
  dispose: () => void;
}

interface CreateWalkControllerParams {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  registry: TempleCollisionRegistry;
  requestRender: () => void;
  onRequestExitWalk?: () => void;
}

const FOCUS_BLOCKED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);

function isInteractiveElementFocused(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  if (FOCUS_BLOCKED_TAGS.has(active.tagName)) return true;
  if (active.isContentEditable) return true;
  return false;
}

export function createTempleWalkController({
  camera,
  domElement,
  registry,
  requestRender,
  onRequestExitWalk,
}: CreateWalkControllerParams): TempleWalkController {
  const spawnGroundY = resolveWalkableGroundY(
    WALK_DEFAULTS.spawnX,
    WALK_DEFAULTS.spawnZ
  );

  const actor: WalkActorState = {
    position: new THREE.Vector3(
      WALK_DEFAULTS.spawnX,
      spawnGroundY,
      WALK_DEFAULTS.spawnZ
    ),
    velocity: new THREE.Vector3(),
    yaw: WALK_DEFAULTS.spawnYaw,
    pitch: WALK_DEFAULTS.spawnPitch,
    groundY: spawnGroundY,
    eyeHeight: WALK_DEFAULTS.eyeHeight,
    radius: WALK_DEFAULTS.radius,
    height: WALK_DEFAULTS.height,
    isMoving: false,
  };

  let enabled = false;
  let targetYaw: number = WALK_DEFAULTS.spawnYaw;
  let targetPitch: number = WALK_DEFAULTS.spawnPitch;
  let smoothedEyeY = spawnGroundY + WALK_DEFAULTS.eyeHeight;

  const heldKeys = new Set<string>();
  let activePointerId: number | null = null;
  let lastPointerX = 0;
  let lastPointerY = 0;

  const syncCameraToActor = () => {
    camera.rotation.order = 'YXZ';
    camera.position.set(actor.position.x, smoothedEyeY, actor.position.z);
    camera.rotation.set(actor.pitch, actor.yaw, 0, 'YXZ');
  };

  const releasePointer = () => {
    if (activePointerId !== null) {
      try {
        if (domElement.hasPointerCapture(activePointerId)) {
          domElement.releasePointerCapture(activePointerId);
        }
      } catch {
        // Ignore if pointer capture already ended
      }
      activePointerId = null;
    }
  };

  const clearInputs = () => {
    heldKeys.clear();
    actor.velocity.set(0, 0, 0);
    actor.isMoving = false;
    releasePointer();
  };

  const resetToSpawn = () => {
    const gY = resolveWalkableGroundY(WALK_DEFAULTS.spawnX, WALK_DEFAULTS.spawnZ);
    actor.position.set(WALK_DEFAULTS.spawnX, gY, WALK_DEFAULTS.spawnZ);
    actor.velocity.set(0, 0, 0);
    actor.groundY = gY;
    actor.yaw = WALK_DEFAULTS.spawnYaw;
    actor.pitch = WALK_DEFAULTS.spawnPitch;
    actor.isMoving = false;
    targetYaw = WALK_DEFAULTS.spawnYaw;
    targetPitch = WALK_DEFAULTS.spawnPitch;
    smoothedEyeY = gY + actor.eyeHeight;
    heldKeys.clear();
    releasePointer();
    syncCameraToActor();
    requestRender();
  };

  const activate = () => {
    enabled = true;
    resetToSpawn();
  };

  const deactivate = () => {
    enabled = false;
    clearInputs();
  };

  const isMovementKey = (code: string) =>
    code === 'KeyW' ||
    code === 'KeyA' ||
    code === 'KeyS' ||
    code === 'KeyD' ||
    code === 'ArrowUp' ||
    code === 'ArrowDown' ||
    code === 'ArrowLeft' ||
    code === 'ArrowRight';

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!enabled) return;

    if (e.key === 'Escape') {
      clearInputs();
      onRequestExitWalk?.();
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isInteractiveElementFocused()) return;

    if (isMovementKey(e.code)) {
      e.preventDefault();
      if (!heldKeys.has(e.code)) {
        heldKeys.add(e.code);
        requestRender();
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (heldKeys.delete(e.code) && enabled) {
      requestRender();
    }
  };

  const handleWindowBlur = () => {
    if (heldKeys.size > 0 || activePointerId !== null) {
      clearInputs();
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (!enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (activePointerId !== null) return;

    // Blur any focused toolbar button so WASD engages seamlessly after looking around
    if (
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement &&
      FOCUS_BLOCKED_TAGS.has(document.activeElement.tagName)
    ) {
      document.activeElement.blur();
    }

    activePointerId = e.pointerId;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    try {
      domElement.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if capture is unsupported
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!enabled || e.pointerId !== activePointerId) return;

    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    if (dx === 0 && dy === 0) return;

    targetYaw -= dx * WALK_DEFAULTS.pointerSensitivity;
    targetPitch = THREE.MathUtils.clamp(
      targetPitch - dy * WALK_DEFAULTS.pointerSensitivity,
      WALK_DEFAULTS.minPitch,
      WALK_DEFAULTS.maxPitch
    );
    requestRender();
  };

  const handlePointerEnd = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return;
    releasePointer();
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', handleWindowBlur);
  domElement.addEventListener('pointerdown', handlePointerDown);
  domElement.addEventListener('pointermove', handlePointerMove);
  domElement.addEventListener('pointerup', handlePointerEnd);
  domElement.addEventListener('pointercancel', handlePointerEnd);

  const step = (delta: number, instant: boolean): boolean => {
    if (!enabled) return false;

    const safeDelta = Math.min(Math.max(delta, 0.001), 0.1);

    // 1. Smoothly damp look orientation
    if (instant) {
      actor.yaw = targetYaw;
      actor.pitch = targetPitch;
    } else {
      actor.yaw = THREE.MathUtils.damp(
        actor.yaw,
        targetYaw,
        WALK_DEFAULTS.lookLambda,
        safeDelta
      );
      actor.pitch = THREE.MathUtils.damp(
        actor.pitch,
        targetPitch,
        WALK_DEFAULTS.lookLambda,
        safeDelta
      );
    }

    // 2. Compute horizontal-only desired input vector independent of pitch
    let forwardInput = 0;
    let strafeInput = 0;
    if (heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) forwardInput += 1;
    if (heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) forwardInput -= 1;
    if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) strafeInput += 1;
    if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) strafeInput -= 1;

    const inputLen = Math.hypot(forwardInput, strafeInput);
    let desiredVx = 0;
    let desiredVz = 0;

    if (inputLen > 0) {
      const fNorm = forwardInput / inputLen;
      const sNorm = strafeInput / inputLen;
      const sinY = Math.sin(actor.yaw);
      const cosY = Math.cos(actor.yaw);
      // Forward = (-sinY, -cosY), Right = (cosY, -sinY)
      desiredVx = (-sinY * fNorm + cosY * sNorm) * WALK_DEFAULTS.walkSpeed;
      desiredVz = (-cosY * fNorm - sinY * sNorm) * WALK_DEFAULTS.walkSpeed;
    }

    if (instant) {
      actor.velocity.x = desiredVx;
      actor.velocity.z = desiredVz;
    } else {
      const lambda =
        inputLen > 0 ? WALK_DEFAULTS.accelLambda : WALK_DEFAULTS.decelLambda;
      actor.velocity.x = THREE.MathUtils.damp(
        actor.velocity.x,
        desiredVx,
        lambda,
        safeDelta
      );
      actor.velocity.z = THREE.MathUtils.damp(
        actor.velocity.z,
        desiredVz,
        lambda,
        safeDelta
      );
    }

    const speedSq =
      actor.velocity.x * actor.velocity.x + actor.velocity.z * actor.velocity.z;
    if (inputLen === 0 && speedSq < 1e-4) {
      actor.velocity.set(0, 0, 0);
    }

    // 3. Advance capsule through collision registry & evaluate walkable elevation
    const moveX = actor.velocity.x * safeDelta;
    const moveZ = actor.velocity.z * safeDelta;
    if (Math.abs(moveX) > 1e-6 || Math.abs(moveZ) > 1e-6) {
      actor.groundY = moveActorWithCollisions(
        actor.position,
        moveX,
        moveZ,
        actor.radius,
        actor.height,
        registry
      );
      actor.isMoving = true;
    } else {
      actor.isMoving = false;
    }

    // 4. Smoothly track stair & terrace height transitions at eye level
    const targetEyeY = actor.groundY + actor.eyeHeight;
    if (instant || Math.abs(targetEyeY - smoothedEyeY) < 0.0008) {
      smoothedEyeY = targetEyeY;
    } else {
      smoothedEyeY = THREE.MathUtils.damp(
        smoothedEyeY,
        targetEyeY,
        WALK_DEFAULTS.eyeYLambda,
        safeDelta
      );
    }

    syncCameraToActor();

    const yawRemaining = Math.abs(targetYaw - actor.yaw);
    const pitchRemaining = Math.abs(targetPitch - actor.pitch);
    const eyeRemaining = Math.abs(targetEyeY - smoothedEyeY);
    const velActive =
      inputLen > 0 ||
      actor.velocity.x * actor.velocity.x + actor.velocity.z * actor.velocity.z >
        1e-4;

    if (!velActive && yawRemaining <= 1e-4 && pitchRemaining <= 1e-4) {
      actor.yaw = targetYaw;
      actor.pitch = targetPitch;
      syncCameraToActor();
    }

    return (
      velActive ||
      yawRemaining > 1e-4 ||
      pitchRemaining > 1e-4 ||
      eyeRemaining > 0.0008
    );
  };

  const dispose = () => {
    enabled = false;
    clearInputs();
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', handleWindowBlur);
    domElement.removeEventListener('pointerdown', handlePointerDown);
    domElement.removeEventListener('pointermove', handlePointerMove);
    domElement.removeEventListener('pointerup', handlePointerEnd);
    domElement.removeEventListener('pointercancel', handlePointerEnd);
  };

  return {
    actor,
    activate,
    deactivate,
    resetToSpawn,
    clearInputs,
    step,
    dispose,
  };
}

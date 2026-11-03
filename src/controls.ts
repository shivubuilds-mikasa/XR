import * as THREE from 'three';
import type { ArtworkMeta } from './types';

const WALKABLE = (x: number, z: number) =>
  (Math.abs(x) < 12.65 && Math.abs(z) < 37.65) ||
  (Math.abs(x) < 39.65 && Math.abs(z) < 11.65);

export function createControls(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  colliders: THREE.Box3[],
  artworkTargets: THREE.Object3D[],
  onFocus: (artwork: ArtworkMeta | null) => void,
  onLockChange: (locked: boolean) => void,
  onWake: () => void,
) {
  const keys = new Set<string>();
  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const velocity = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;
  let locked = false;
  let active = false;
  let lastRaycast = 0;
  let focused: ArtworkMeta | null = null;
  let forceRaycast = false;

  const updateRotation = () => { camera.rotation.set(pitch, yaw, 0, 'YXZ'); };
  const onPointerLockChange = () => {
    locked = document.pointerLockElement === canvas;
    active = locked;
    if (!active) {
      keys.clear();
      velocity.set(0, 0, 0);
      focused = null;
      onFocus(null);
    }
    onLockChange(locked);
    onWake();
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!active) return;
    yaw -= event.movementX * 0.0021;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0021, -1.38, 1.38);
    updateRotation();
    forceRaycast = true;
    onWake();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Escape' && active && !locked) {
      active = false;
      keys.clear();
      velocity.set(0, 0, 0);
      onFocus(null);
      onLockChange(false);
      onWake();
      return;
    }
    if (!active) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
      onWake();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (keys.delete(event.code)) onWake();
  };
  const onBlur = () => {
    keys.clear();
    velocity.set(0, 0, 0);
    onWake();
  };

  const isBlocked = (x: number, z: number) => colliders.some((box) =>
    x > box.min.x - 0.34 && x < box.max.x + 0.34 &&
    z > box.min.z - 0.34 && z < box.max.z + 0.34,
  );

  const inspectCenter = () => {
    raycaster.setFromCamera(center, camera);
    const hit = raycaster.intersectObjects(artworkTargets, false)[0];
    const next = (hit?.object.userData['artwork'] as ArtworkMeta | undefined) ?? null;
    if (next?.file !== focused?.file) {
      focused = next;
      onFocus(next);
    }
  };

  const enterGallery = () => {
    active = true;
    onLockChange(true);
    onWake();
    try {
      const request = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (request && typeof request.catch === 'function') void request.catch(() => {});
    } catch { /* Mouse-look fallback stays active. */ }
  };

  const onCanvasClick = () => {
    if (!active) { enterGallery(); return; }
    inspectCenter();
    if (focused) onFocus(focused);
  };

  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('click', onCanvasClick);

  return {
    enter: enterGallery,
    update(dt: number, now: number): boolean {
      if (!active) return false;
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      const inputLength = Math.hypot(x, z);
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const inputScale = inputLength ? 4.3 / Math.max(1, inputLength) : 0;
      const targetX = (forward.x * -z + right.x * x) * inputScale;
      const targetZ = (forward.z * -z + right.z * x) * inputScale;
      const response = 1 - Math.exp(-(inputLength ? 13 : 10) * dt);
      velocity.x += (targetX - velocity.x) * response;
      velocity.z += (targetZ - velocity.z) * response;

      const nextX = camera.position.x + velocity.x * dt;
      if (WALKABLE(nextX, camera.position.z) && !isBlocked(nextX, camera.position.z)) camera.position.x = nextX;
      else velocity.x = 0;
      const nextZ = camera.position.z + velocity.z * dt;
      if (WALKABLE(camera.position.x, nextZ) && !isBlocked(camera.position.x, nextZ)) camera.position.z = nextZ;
      else velocity.z = 0;

      const looked = forceRaycast;
      if (looked || now - lastRaycast > 100) {
        lastRaycast = now;
        forceRaycast = false;
        inspectCenter();
      }
      // Keep the render loop alive while exploring so the slow exhibit and
      // dust animations remain smooth even when the visitor pauses.
      return active || looked || inputLength > 0 || velocity.lengthSq() > 0.0016;
    },
  };
}

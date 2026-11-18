import * as THREE from 'three';
import type { GalleryExhibit } from './types';

const WALKABLE = (x: number, z: number) =>
  (Math.abs(x) < 12.65 && Math.abs(z) < 37.65) ||
  (Math.abs(x) < 39.65 && Math.abs(z) < 11.65);

export function createControls(
  camera: THREE.PerspectiveCamera,
  playerRig: THREE.Group,
  renderer: THREE.WebGLRenderer,
  canvas: HTMLCanvasElement,
  colliders: THREE.Box3[],
  artworkTargets: THREE.Object3D[],
  onFocus: (exhibit: GalleryExhibit | null) => void,
  onLockChange: (locked: boolean) => void,
  onWake: () => void,
  onOpenDetails: (exhibit: GalleryExhibit) => void,
  onCloseDetails: () => void,
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
  let focused: GalleryExhibit | null = null;
  let detailOpen = false;
  let forceRaycast = false;
  const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
  const controllerRay = new THREE.Raycaster();
  controllerRay.far = 8;
  let leftStickX = 0;
  let leftStickY = 0;
  let lastTriggerAction = -Infinity;
  const triggerWasDown = new Map<string, boolean>();
  const controllersByHand = new Map<string, THREE.XRTargetRaySpace>();

  const activateControllerTarget = (controller: THREE.XRTargetRaySpace) => {
    const now = performance.now();
    // Quest browsers report both the WebXR `select` event and a gamepad button
    // state. Debounce them so one squeeze can never open and immediately close.
    if (now - lastTriggerAction < 300 || !renderer.xr.isPresenting || !active) return;
    lastTriggerAction = now;
    if (detailOpen) {
      onCloseDetails();
      return;
    }
    inspectController(controller);
    if (focused) {
      detailOpen = true;
      keys.clear();
      velocity.set(0, 0, 0);
      onOpenDetails(focused);
      onWake();
    }
  };

  for (const controller of controllers) {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xe5c58a, transparent: true, opacity: 0.72 }),
    );
    beam.scale.z = 7;
    controller.add(beam);
    playerRig.add(controller);
    controller.addEventListener('connected', (event) => {
      const source = (event as unknown as { data?: XRInputSource }).data;
      if (source?.handedness) controllersByHand.set(source.handedness, controller);
    });
    controller.addEventListener('disconnected', () => {
      for (const [hand, current] of controllersByHand) if (current === controller) controllersByHand.delete(hand);
    });
    controller.addEventListener('select', () => {
      activateControllerTarget(controller);
    });
  }

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
    if (!active || detailOpen) return;
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
    if (event.code === 'Space') {
      event.preventDefault();
      if (focused && !detailOpen) {
        detailOpen = true;
        keys.clear();
        velocity.set(0, 0, 0);
        onOpenDetails(focused);
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        onWake();
      }
      return;
    }
    if (detailOpen) return;
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

  const setFocused = (next: GalleryExhibit | null) => {
    const key = (exhibit: GalleryExhibit | null) => exhibit
      ? `${exhibit.kind}:${exhibit.kind === 'artwork' ? exhibit.artwork.file : exhibit.file}`
      : null;
    if (key(next) !== key(focused)) {
      focused = next;
      onFocus(next);
    }
  };

  const inspectCenter = () => {
    raycaster.setFromCamera(center, camera);
    const hit = raycaster.intersectObjects(artworkTargets, false)[0];
    const next = (hit?.object.userData['exhibit'] as GalleryExhibit | undefined) ?? null;
    setFocused(next);
  };

  const inspectController = (controller: THREE.XRTargetRaySpace) => {
    // WebXR dispatches `select` between render callbacks, so ensure the ray and
    // exhibit matrices reflect the latest headset pose before intersecting.
    playerRig.updateWorldMatrix(true, true);
    controller.updateWorldMatrix(true, false);
    for (const target of artworkTargets) target.updateWorldMatrix(true, false);
    controllerRay.setFromXRController(controller);
    const hit = controllerRay.intersectObjects(artworkTargets, false)[0];
    setFocused((hit?.object.userData['exhibit'] as GalleryExhibit | undefined) ?? null);
  };

  const enterGallery = () => {
    active = true;
    onLockChange(true);
    onWake();
    if (renderer.xr.isPresenting) return;
    try {
      const request = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (request && typeof request.catch === 'function') void request.catch(() => {});
    } catch { /* Mouse-look fallback stays active. */ }
  };

  const onCanvasClick = () => {
    if (detailOpen) return;
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
  renderer.xr.addEventListener('sessionstart', () => {
    active = true;
    detailOpen = false;
    keys.clear();
    velocity.set(0, 0, 0);
    onLockChange(true);
    onWake();
  });
  renderer.xr.addEventListener('sessionend', () => {
    active = false;
    detailOpen = false;
    keys.clear();
    velocity.set(0, 0, 0);
    setFocused(null);
    onLockChange(false);
    onWake();
  });

  return {
    enter: enterGallery,
    closeDetails() {
      detailOpen = false;
      focused = null;
      onFocus(null);
      onWake();
    },
    setXRInputSources(sources: readonly XRInputSource[]) {
      const left = sources.find((source) => source.handedness === 'left' && source.gamepad);
      if (!left?.gamepad) {
        leftStickX = 0;
        leftStickY = 0;
      } else {
        const axes = left.gamepad.axes;
        const offset = axes.length >= 4 ? 2 : 0;
        leftStickX = Math.abs(axes[offset] ?? 0) > 0.14 ? axes[offset] : 0;
        leftStickY = Math.abs(axes[offset + 1] ?? 0) > 0.14 ? axes[offset + 1] : 0;
      }
      // Some Quest Browser/WebXR versions omit `select` for a frame or two.
      // Poll the xr-standard primary trigger as a fallback, with edge detection.
      for (const source of sources) {
        if (!source.handedness || !source.gamepad) continue;
        const hand = source.handedness;
        const isDown = Boolean(source.gamepad.buttons[0]?.pressed);
        const wasDown = triggerWasDown.get(hand) ?? false;
        if (isDown && !wasDown) {
          const controller = controllersByHand.get(hand);
          if (controller) activateControllerTarget(controller);
        }
        triggerWasDown.set(hand, isDown);
      }
    },
    update(dt: number, now: number): boolean {
      if (!active || detailOpen) return false;
      const x = renderer.xr.isPresenting ? leftStickX : (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const z = renderer.xr.isPresenting ? leftStickY : (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      const inputLength = Math.hypot(x, z);
      if (renderer.xr.isPresenting) {
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.set(-forward.z, 0, forward.x);
      } else {
        forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      }
      const inputScale = inputLength ? (renderer.xr.isPresenting ? 2.1 : 4.3) / Math.max(1, inputLength) : 0;
      const targetX = (forward.x * -z + right.x * x) * inputScale;
      const targetZ = (forward.z * -z + right.z * x) * inputScale;
      const response = 1 - Math.exp(-(inputLength ? 13 : 10) * dt);
      velocity.x += (targetX - velocity.x) * response;
      velocity.z += (targetZ - velocity.z) * response;

      const nextX = playerRig.position.x + velocity.x * dt;
      if (WALKABLE(nextX, playerRig.position.z) && !isBlocked(nextX, playerRig.position.z)) playerRig.position.x = nextX;
      else velocity.x = 0;
      const nextZ = playerRig.position.z + velocity.z * dt;
      if (WALKABLE(playerRig.position.x, nextZ) && !isBlocked(playerRig.position.x, nextZ)) playerRig.position.z = nextZ;
      else velocity.z = 0;

      const looked = forceRaycast;
      if (renderer.xr.isPresenting) {
        if (now - lastRaycast > 100) {
          lastRaycast = now;
          let nextFocus: GalleryExhibit | null = null;
          let closestDistance = Infinity;
          for (const controller of controllers) {
            playerRig.updateWorldMatrix(true, true);
            controller.updateWorldMatrix(true, false);
            controllerRay.setFromXRController(controller);
            const hit = controllerRay.intersectObjects(artworkTargets, false)[0];
            if (hit && hit.distance < closestDistance) {
              closestDistance = hit.distance;
              nextFocus = hit.object.userData['exhibit'] as GalleryExhibit | undefined ?? null;
            }
          }
          setFocused(nextFocus);
        }
      } else if (looked || now - lastRaycast > 100) {
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

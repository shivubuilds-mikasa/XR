import * as THREE from 'three';
import './style.css';
import { buildGallery } from './gallery';
import { createControls } from './controls';
import { createUI } from './ui';
import type { ArtworkMeta } from './types';

async function loadCollection(): Promise<ArtworkMeta[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}metadata.json`);
    if (!response.ok) return [];
    const metadata = await response.json() as ArtworkMeta[];
    return metadata.filter((item) => Boolean(item.file));
  } catch (error) {
    console.error('The gallery collection could not be read.', error);
    return [];
  }
}

async function start() {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Gallery canvas is missing.');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  const initialPixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
  let pixelRatio = initialPixelRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a241d);
  scene.fog = new THREE.FogExp2(0x1a241d, 0.0035);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 180);
  camera.position.set(0, 1.68, 7.4);

  const collection = await loadCollection();
  let wakeRenderer = () => {};
  const gallery = buildGallery(scene, collection, () => wakeRenderer());
  let enterGallery = () => {};
  const ui = createUI(() => enterGallery());
  ui.setArtworkCount(gallery.displays.length);
  ui.setArtworkIndex(new Map(gallery.displays.map((display, index) => [display.meta.file, index])));

  const controls = createControls(
    camera,
    renderer.domElement,
    gallery.colliders,
    gallery.imageTargets,
    ui.showArtwork,
    ui.setLocked,
    () => wakeRenderer(),
  );
  enterGallery = controls.enter;

  let frameHandle = 0;
  let last = performance.now();
  let lastStream = 0;
  let lastRoomUpdate = 0;
  let streamTimer: ReturnType<typeof setTimeout> | null = null;
  let fpsWindowStart = last;
  let fpsFrames = 0;
  let slowWindows = 0;
  let fastWindows = 0;
  let running = true;

  const roomAt = (x: number, z: number) => {
    if (Math.abs(x) < 13 && Math.abs(z) < 12) return 'The Atrium';
    if (Math.abs(x) < 13) return z < 0 ? 'North Gallery' : 'South Gallery';
    return x < 0 ? 'West Gallery' : 'East Gallery';
  };

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    wakeRenderer();
  };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
    if (!document.hidden) wakeRenderer();
  });

  const loop = (now: number) => {
    if (!running) return;
    frameHandle = 0;
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    const moving = controls.update(dt, now);
    gallery.animateDetails(now / 1000);

    if (now - lastStream > 320) {
      lastStream = now;
      const loadingOrNearby = gallery.loadNearbyArt(camera.position);
      if (loadingOrNearby && !streamTimer) {
        streamTimer = setTimeout(() => {
          streamTimer = null;
          wakeRenderer();
        }, 340);
      }
    }
    if (now - lastRoomUpdate > 450) {
      lastRoomUpdate = now;
      ui.setRoom(roomAt(camera.position.x, camera.position.z));
    }

    renderer.render(scene, camera);

    // If the GPU cannot hold frame rate, lower resolution slightly. Restore it
    // only after several stable windows to avoid quality oscillation.
    if (moving) fpsFrames++;
    else {
      fpsWindowStart = now;
      fpsFrames = 0;
      slowWindows = 0;
      fastWindows = 0;
    }
    if (moving && now - fpsWindowStart >= 2000) {
      const fps = fpsFrames * 1000 / (now - fpsWindowStart);
      fpsWindowStart = now;
      fpsFrames = 0;
      slowWindows = fps < 53 ? slowWindows + 1 : 0;
      fastWindows = fps > 59 ? fastWindows + 1 : 0;
      if (slowWindows >= 2 && pixelRatio > 0.78) {
        pixelRatio = Math.max(0.78, pixelRatio - 0.14);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        slowWindows = 0;
      } else if (fastWindows >= 5 && pixelRatio < initialPixelRatio) {
        pixelRatio = Math.min(initialPixelRatio, pixelRatio + 0.08);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        fastWindows = 0;
      }
    }

    if (moving) wakeRenderer();
  };

  wakeRenderer = () => {
    if (running && !document.hidden && !frameHandle) frameHandle = requestAnimationFrame(loop);
  };
  wakeRenderer();
  window.addEventListener('pagehide', () => {
    running = false;
    if (frameHandle) cancelAnimationFrame(frameHandle);
    if (streamTimer) clearTimeout(streamTimer);
  });
}

void start();

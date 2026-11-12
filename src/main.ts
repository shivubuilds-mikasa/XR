import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import { buildGallery } from './gallery';
import { createControls } from './controls';
import { createUI } from './ui';
import type { ArtworkMeta } from './types';

function createModelPreview(environmentMap: THREE.Texture) {
  let renderer: THREE.WebGLRenderer | null = null;
  let previewScene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let previewModel: THREE.Object3D | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let frameHandle = 0;
  let lastFrame = 0;
  let running = false;

  const ensureRenderer = (target: HTMLCanvasElement) => {
    if (renderer && canvas === target) return;
    renderer?.dispose();
    canvas = target;
    renderer = new THREE.WebGLRenderer({ canvas: target, alpha: false, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = false;
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x151c17);
    previewScene.environment = environmentMap;
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.16, 5.6);
    camera.lookAt(0, 0, 0);
    previewScene.add(new THREE.HemisphereLight(0xfff0d4, 0x27332c, 1.8));
    const key = new THREE.DirectionalLight(0xffe4bd, 3.2);
    key.position.set(-3, 5, 4);
    previewScene.add(key);
    const fill = new THREE.DirectionalLight(0xb8cfc2, 1.15);
    fill.position.set(4, 1.5, -3);
    previewScene.add(fill);
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.55, 0.08, 64),
      new THREE.MeshStandardMaterial({ color: 0x303831, roughness: 0.38, metalness: 0.32 }),
    );
    plinth.position.y = -1.48;
    previewScene.add(plinth);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.018, 6, 64),
      new THREE.MeshStandardMaterial({ color: 0xc7a36a, roughness: 0.28, metalness: 0.7 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.425;
    previewScene.add(rim);
  };

  const render = (now: number) => {
    if (!running || !renderer || !previewScene || !camera || !canvas) return;
    frameHandle = 0;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    if (renderer.domElement.width !== Math.round(width * renderer.getPixelRatio()) ||
      renderer.domElement.height !== Math.round(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    if (previewModel) previewModel.rotation.y += Math.min((now - lastFrame) / 1000, 0.04) * 0.18;
    lastFrame = now;
    renderer.render(previewScene, camera);
    frameHandle = requestAnimationFrame(render);
  };

  return {
    open(target: HTMLCanvasElement, model: THREE.Object3D) {
      this.close();
      ensureRenderer(target);
      if (!previewScene) return;
      canvas = target;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 2.7 / Math.max(size.x, size.y, size.z, 0.001);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      previewModel = model;
      previewScene.add(model);
      lastFrame = performance.now();
      running = true;
      frameHandle = requestAnimationFrame(render);
    },
    close() {
      running = false;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      frameHandle = 0;
      if (previewScene && previewModel) previewScene.remove(previewModel);
      previewModel = null;
    },
    dispose() {
      this.close();
      renderer?.dispose();
      renderer = null;
      previewScene = null;
      camera = null;
      canvas = null;
    },
  };
}

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

  // Give brass, stone, and sculpture materials a soft museum-studio reflection.
  // A single prefiltered map is shared by the whole scene, so this adds depth
  // without adding per-frame lighting work.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  const environmentMap = pmrem.fromScene(roomEnvironment).texture;
  scene.environment = environmentMap;
  scene.environmentIntensity = 0.48;
  roomEnvironment.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 180);
  camera.position.set(0, 1.68, 7.4);

  const collection = await loadCollection();
  let wakeRenderer = () => {};
  const gallery = buildGallery(scene, collection, () => wakeRenderer());
  // The architecture and sculpture silhouettes are static. Render the shadow
  // map once instead of paying for a full shadow pass on every movement frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  let enterGallery = () => {};
  let closeControlsDetails = () => {};
  const modelPreview = createModelPreview(environmentMap);
  const ui = createUI(
    () => enterGallery(),
    (file, previewCanvas) => {
      const model = gallery.getModelPreview(file);
      if (model) modelPreview.open(previewCanvas, model);
    },
    () => {
      modelPreview.close();
      closeControlsDetails();
    },
  );
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
    ui.showDetails,
  );
  enterGallery = controls.enter;
  closeControlsDetails = controls.closeDetails;

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

    // React quickly when the GPU falls below a smooth 60fps target, then restore
    // quality only after several stable windows to avoid resolution oscillation.
    if (moving) fpsFrames++;
    else {
      fpsWindowStart = now;
      fpsFrames = 0;
      slowWindows = 0;
      fastWindows = 0;
    }
    if (moving && now - fpsWindowStart >= 1500) {
      const fps = fpsFrames * 1000 / (now - fpsWindowStart);
      fpsWindowStart = now;
      fpsFrames = 0;
      slowWindows = fps < 56 ? slowWindows + 1 : 0;
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
    environmentMap.dispose();
    modelPreview.dispose();
    renderer.dispose();
  });
}

void start();

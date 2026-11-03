import * as THREE from 'three';
import type { ArtworkMeta } from './types';

type ArtworkDisplay = {
  meta: ArtworkMeta;
  image: THREE.Mesh;
  hitArea: THREE.Mesh;
  position: THREE.Vector3;
  width: number;
  height: number;
  loading: boolean;
  loaded: boolean;
};

const BASE = import.meta.env.BASE_URL;
const WALL_HEIGHT = 6.5;

function makeFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6c4b34';
  ctx.fillRect(0, 0, 512, 512);
  const plankH = 64;
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 ? -64 : 0;
    for (let col = -1; col < 5; col++) {
      const x = col * 128 + offset;
      const hue = 24 + ((row * 7 + col * 11) % 7);
      ctx.fillStyle = `hsl(${hue}, 31%, ${30 + ((row + col + 20) % 7)}%)`;
      ctx.fillRect(x + 1, row * plankH + 1, 126, plankH - 2);
      ctx.fillStyle = 'rgba(255,225,180,0.055)';
      for (let line = 0; line < 5; line++) {
        const y = row * plankH + 8 + line * 12;
        ctx.fillRect(x + 10, y, 104, 1);
      }
      ctx.fillStyle = 'rgba(24,15,10,0.42)';
      ctx.fillRect(x, row * plankH, 128, 2);
      ctx.fillRect(x + 127, row * plankH, 1, plankH);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.anisotropy = 2;
  return texture;
}

function makeWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e9e5dc';
  ctx.fillRect(0, 0, 512, 512);
  let seed = 72341;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 18000; i++) {
    const shade = random() > 0.5 ? 255 : 35;
    const alpha = 0.012 + random() * 0.035;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
    const size = 1 + Math.floor(random() * 2);
    ctx.fillRect(random() * 512, random() * 512, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.anisotropy = 2;
  return texture;
}

function placeholderTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, '#35483a');
  gradient.addColorStop(1, '#1d2b24');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(206,174,115,.72)';
  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, 228, 228);
  ctx.fillStyle = 'rgba(255,242,214,.76)';
  ctx.font = '600 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('COLLECTION', 128, 134);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

async function loadSmallTexture(url: string): Promise<THREE.Texture> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Artwork request failed: ${response.status}`);
  const source = await createImageBitmap(await response.blob());
  const scale = Math.min(1, 1024 / Math.max(source.width, source.height));
  const options: ImageBitmapOptions = { imageOrientation: 'flipY' };
  if (scale < 1) {
    options.resizeWidth = Math.max(1, Math.round(source.width * scale));
    options.resizeHeight = Math.max(1, Math.round(source.height * scale));
    options.resizeQuality = 'high';
  }
  const resized = await createImageBitmap(source, options);
  source.close();

  const texture = new THREE.Texture(resized);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
}

export function buildGallery(scene: THREE.Scene, artworks: ArtworkMeta[], onAssetReady: () => void = () => {}) {
  const floorTexture = makeFloorTexture();
  const wallTexture = makeWallTexture();
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x526a53, map: wallTexture, roughness: 0.94 });
  const ceilingMaterial = new THREE.MeshBasicMaterial({ color: 0xc8c5b8, toneMapped: false });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x987346, roughness: 0.32, metalness: 0.55 });
  const darkWoodMaterial = new THREE.MeshStandardMaterial({ color: 0x38291e, roughness: 0.5 });
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.48, metalness: 0.04 });
  const warmGlow = new THREE.MeshStandardMaterial({
    color: 0xffe4b0, emissive: 0xffbc64, emissiveIntensity: 1.25, roughness: 0.32,
  });
  const placeholder = placeholderTexture();
  const frameGeometry = new THREE.BoxGeometry(1, 1, 1);
  const frameImageGeometry = new THREE.PlaneGeometry(1, 1);
  const hitGeometry = new THREE.PlaneGeometry(1, 1);
  const hitMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const artMaterial = new THREE.MeshStandardMaterial({ color: 0x9a7542, roughness: 0.28, metalness: 0.72 });
  const imageTargets: THREE.Object3D[] = [];
  const displays: ArtworkDisplay[] = [];
  const colliders: THREE.Box3[] = [];

  const rooms = [
    { x0: -13, x1: 13, z0: -12, z1: 12, name: 'The Atrium' },
    { x0: -13, x1: 13, z0: -38, z1: -12, name: 'North Gallery' },
    { x0: -13, x1: 13, z0: 12, z1: 38, name: 'South Gallery' },
    { x0: -40, x1: -13, z0: -12, z1: 12, name: 'West Gallery' },
    { x0: 13, x1: 40, z0: -12, z1: 12, name: 'East Gallery' },
  ];

  const addBox = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number, y: number, z: number,
    sx: number, sy: number, sz: number,
    castShadow = false,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = false;
    scene.add(mesh);
    return mesh;
  };

  const addWall = (x: number, z: number, width: number, height: number, depth: number, material = wallMaterial) => {
    const mesh = addBox(frameGeometry, material, x, height / 2, z, width, height, depth, true);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    // Long brass rails and deep stained-wood skirting make the wall read as a gallery.
    const horizontal = width >= depth;
    // Keep the rails inset from the wall ends, but proud of both wall faces.
    // Matching the wall thickness exactly made their faces coplanar, causing
    // z-fighting and the dark flickering stripe while the camera moved.
    const railWidth = horizontal ? Math.max(0.1, width - 0.3) : width + 0.12;
    const railDepth = horizontal ? depth + 0.12 : Math.max(0.1, depth - 0.3);
    addBox(frameGeometry, darkWoodMaterial, x, 0.22, z, railWidth, 0.44, railDepth);
    const trimWidth = railWidth + (horizontal ? 0 : 0.035);
    const trimDepth = railDepth + (horizontal ? 0.035 : 0);
    addBox(frameGeometry, trimMaterial, x, 0.49, z, trimWidth, 0.045, trimDepth);
    addBox(frameGeometry, trimMaterial, x, height - 0.18, z, trimWidth, 0.07, trimDepth);
  };

  function addFloor(room: typeof rooms[number]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(room.x1 - room.x0, room.z1 - room.z0), floorMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((room.x0 + room.x1) / 2, -0.08, (room.z0 + room.z1) / 2);
    plane.receiveShadow = true;
    scene.add(plane);
    addBox(frameGeometry, ceilingMaterial, (room.x0 + room.x1) / 2, WALL_HEIGHT - 0.08,
      (room.z0 + room.z1) / 2, room.x1 - room.x0, 0.16, room.z1 - room.z0);
  }

  // Five connected spaces keep long sight lines while the cross-shaped layout
  // makes it easy to explore without getting trapped against a wall.
  for (const room of rooms) addFloor(room);

  // Central hall: four broad doorways open into the wings.
  addWall(-7.75, -12, 10.5, WALL_HEIGHT, 0.42);
  addWall(7.75, -12, 10.5, WALL_HEIGHT, 0.42);
  addWall(-7.75, 12, 10.5, WALL_HEIGHT, 0.42);
  addWall(7.75, 12, 10.5, WALL_HEIGHT, 0.42);
  addWall(-13, -7.5, 0.42, WALL_HEIGHT, 9);
  addWall(-13, 7.5, 0.42, WALL_HEIGHT, 9);
  addWall(13, -7.5, 0.42, WALL_HEIGHT, 9);
  addWall(13, 7.5, 0.42, WALL_HEIGHT, 9);

  // Crafted brass lintels finish each broad doorway and create a clear rhythm
  // between the central hall and its four quieter wings.
  for (const z of [-12, 12]) {
    addBox(frameGeometry, wallMaterial, 0, 5.82, z, 5.5, 1.36, 0.42);
    for (const side of [-1, 1]) addBox(frameGeometry, trimMaterial, side * 2.72, 2.8, z, 0.1, 5.6, 0.52);
    addBox(frameGeometry, trimMaterial, 0, 5.08, z, 5.55, 0.09, 0.52);
  }
  for (const x of [-13, 13]) {
    addBox(frameGeometry, wallMaterial, x, 5.82, 0, 0.42, 1.36, 5.5);
    for (const side of [-1, 1]) addBox(frameGeometry, trimMaterial, x, 2.8, side * 2.72, 0.52, 5.6, 0.1);
    addBox(frameGeometry, trimMaterial, x, 5.08, 0, 0.52, 0.09, 5.55);
  }

  // Wing perimeter walls and their shared partitions.
  addWall(-13, -25, 0.42, WALL_HEIGHT, 26);
  addWall(13, -25, 0.42, WALL_HEIGHT, 26);
  addWall(0, -38, 26, WALL_HEIGHT, 0.42);
  addWall(-13, 25, 0.42, WALL_HEIGHT, 26);
  addWall(13, 25, 0.42, WALL_HEIGHT, 26);
  addWall(0, 38, 26, WALL_HEIGHT, 0.42);
  addWall(-26.5, -12, 27, WALL_HEIGHT, 0.42);
  addWall(-26.5, 12, 27, WALL_HEIGHT, 0.42);
  addWall(-40, 0, 0.42, WALL_HEIGHT, 24);
  addWall(26.5, -12, 27, WALL_HEIGHT, 0.42);
  addWall(26.5, 12, 27, WALL_HEIGHT, 0.42);
  addWall(40, 0, 0.42, WALL_HEIGHT, 24);

  // Ceiling coffers, warm inset light bars, and track-mounted spots (emissive
  // geometry rather than dozens of realtime point lights).
  for (const room of rooms) {
    const cx = (room.x0 + room.x1) / 2;
    const cz = (room.z0 + room.z1) / 2;
    const rw = room.x1 - room.x0 - 1;
    const rd = room.z1 - room.z0 - 1;
    for (const xSign of [-1, 1]) {
      addBox(frameGeometry, trimMaterial, cx + xSign * rw * 0.26, WALL_HEIGHT - 0.28, cz,
        0.095, 0.12, rd);
    }
    addBox(frameGeometry, warmGlow, cx, WALL_HEIGHT - 0.15, cz, 0.075, 0.045, rd * 0.72);
    const spotCount = Math.max(2, Math.floor(rd / 5));
    for (let i = 0; i < spotCount; i++) {
      const z = room.z0 + 2.8 + i * (rd - 4) / Math.max(1, spotCount - 1);
      addBox(frameGeometry, trimMaterial, cx - 2.4, WALL_HEIGHT - 0.12, z, 0.22, 0.1, 0.32);
      addBox(frameGeometry, warmGlow, cx - 2.4, WALL_HEIGHT - 0.2, z, 0.13, 0.025, 0.16);
    }
  }

  // A quiet centerpiece in the atrium: sculptural brass rings on a dark stone plinth.
  addBox(frameGeometry, darkWoodMaterial, 0, 0.22, 0, 2.4, 0.44, 2.4);
  addBox(frameGeometry, trimMaterial, 0, 0.46, 0, 2.35, 0.06, 2.35);
  const torusMaterial = new THREE.MeshStandardMaterial({ color: 0xc4995c, roughness: 0.25, metalness: 0.75 });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64 + i * 0.2, 0.035, 8, 56), torusMaterial);
    ring.position.set(0, 1.45 + i * 0.18, 0);
    ring.rotation.set(0.7 + i * 0.46, i * 0.75, 0.15);
    scene.add(ring);
  }
  const sculpture = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshStandardMaterial({ color: 0x98a98d, roughness: 0.27, metalness: 0.48 }),
  );
  sculpture.castShadow = true;
  sculpture.position.set(0, 1.65, 0);
  scene.add(sculpture);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d')!;
  const shadowGradient = shadowContext.createRadialGradient(64, 64, 10, 64, 64, 64);
  shadowGradient.addColorStop(0, 'rgba(15,12,8,.46)');
  shadowGradient.addColorStop(1, 'rgba(15,12,8,0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const softShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 3.8),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  );
  softShadow.rotation.x = -Math.PI / 2;
  softShadow.position.set(0, -0.055, 0);
  scene.add(softShadow);

  const ambient = new THREE.HemisphereLight(0xfff4df, 0x26372d, 3.0);
  const key = new THREE.DirectionalLight(0xffe8c8, 3.2);
  key.position.set(-7, 13, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -44;
  key.shadow.camera.right = 44;
  key.shadow.camera.top = 44;
  key.shadow.camera.bottom = -44;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 110;
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.00012;
  key.shadow.normalBias = 0.015;
  const fill = new THREE.DirectionalLight(0xbdd2d8, 0.75);
  fill.position.set(8, 7, -8);
  scene.add(ambient, key, fill);

  function addArtwork(meta: ArtworkMeta, index: number, x: number, z: number, yaw: number) {
    const aspect = [1.16, 0.8, 1, 0.9, 1.22, 0.72, 1, 0.84][index % 8];
    // Monumental salon-scale canvases read clearly from the atrium while
    // retaining the source artwork's aspect ratio.
    const height = aspect >= 1 ? 3.25 : 3.45;
    const width = height * aspect;
    const group = new THREE.Group();
    group.position.set(x, 2.85, z);
    group.rotation.y = yaw;
    scene.add(group);

    const backing = new THREE.Mesh(frameGeometry, darkWoodMaterial);
    backing.scale.set(width + 0.2, height + 0.2, 0.16);
    backing.castShadow = true;
    group.add(backing);
    const frame = new THREE.Mesh(frameGeometry, artMaterial);
    frame.scale.set(width + 0.14, height + 0.14, 0.11);
    frame.position.z = 0.055;
    frame.castShadow = true;
    group.add(frame);

    const imageMaterial = new THREE.MeshBasicMaterial({ map: placeholder, color: 0xffffff, toneMapped: false });
    const image = new THREE.Mesh(frameImageGeometry, imageMaterial);
    image.scale.set(width, height, 1);
    image.position.z = 0.116;
    group.add(image);

    const hitArea = new THREE.Mesh(hitGeometry, hitMaterial);
    hitArea.scale.set(width + 0.34, height + 0.34, 1);
    hitArea.position.z = 0.13;
    hitArea.userData['artwork'] = meta;
    group.add(hitArea);
    imageTargets.push(hitArea);

    const display: ArtworkDisplay = {
      meta, image, hitArea, position: new THREE.Vector3(x, 2.52, z), width, height, loading: false, loaded: false,
    };
    displays.push(display);
    return display;
  }

  const artList = artworks.length ? artworks : [];
  let artworkIndex = 0;
  const addNext = (x: number, z: number, yaw: number) => {
    if (artList.length === 0) return;
    const meta = artList[artworkIndex % artList.length];
    addArtwork(meta, artworkIndex, x, z, yaw);
    artworkIndex++;
  };
  const wallXs = [-9.3, -3.1, 3.1, 9.3];
  const northWallZs = [-32, -19];
  const westWallXs = [-34, -20];
  for (const x of [-7.75, 7.75]) { addNext(x, -11.72, 0); addNext(x, 11.72, Math.PI); }
  for (const z of [-7.5, 7.5]) { addNext(-12.72, z, Math.PI / 2); addNext(12.72, z, -Math.PI / 2); }
  for (const x of wallXs) addNext(x, -37.72, 0);
  for (const z of northWallZs) { addNext(-12.72, z, Math.PI / 2); addNext(12.72, z, -Math.PI / 2); }
  for (const x of wallXs) addNext(x, 37.72, Math.PI);
  for (const z of northWallZs) { addNext(-12.72, -z, Math.PI / 2); addNext(12.72, -z, -Math.PI / 2); }
  for (const z of [-8, -2.7, 2.7, 8]) addNext(-39.72, z, Math.PI / 2);
  for (const x of westWallXs) { addNext(x, -11.72, 0); addNext(x, 11.72, Math.PI); }
  for (const z of [-8, -2.7, 2.7, 8]) addNext(39.72, z, -Math.PI / 2);
  for (const x of [-34, -20]) { addNext(x, -11.72, 0); addNext(x, 11.72, Math.PI); }

  // Small wall sconces use emissive surfaces instead of expensive point lights.
  for (const room of rooms.slice(1)) {
    const x = (room.x0 + room.x1) / 2;
    const z = (room.z0 + room.z1) / 2;
    const sideWalls = room.x1 - room.x0 < room.z1 - room.z0;
    for (const side of [-1, 1]) {
      if (sideWalls) {
        const wallX = side < 0 ? room.x0 : room.x1;
        const bodyX = wallX - side * 0.32;
        addBox(frameGeometry, trimMaterial, bodyX, 2.52, z, 0.22, 0.64, 0.38);
        addBox(frameGeometry, warmGlow, bodyX - side * 0.13, 2.52, z, 0.035, 0.38, 0.18);
      } else {
        const wallZ = side < 0 ? room.z0 : room.z1;
        const bodyZ = wallZ - side * 0.32;
        addBox(frameGeometry, trimMaterial, x, 2.52, bodyZ, 0.38, 0.64, 0.22);
        addBox(frameGeometry, warmGlow, x, 2.52, bodyZ - side * 0.13, 0.18, 0.38, 0.035);
      }
    }
  }

  // A discreet sculpture plinth gives each wing a focal point without crowding
  // the route through the rooms.
  const wingSculptures: THREE.Mesh[] = [];
  const plinthMaterial = new THREE.MeshStandardMaterial({ color: 0x303832, roughness: 0.42, metalness: 0.2 });
  const wingSculptureMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xb99058, roughness: 0.26, metalness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0xc5c2aa, roughness: 0.38, metalness: 0.12 }),
    new THREE.MeshStandardMaterial({ color: 0x718675, roughness: 0.32, metalness: 0.55 }),
    new THREE.MeshStandardMaterial({ color: 0xb9785c, roughness: 0.3, metalness: 0.4 }),
  ];
  const wingCenters: Array<[number, number]> = [[0, -25], [0, 25], [-26.5, 0], [26.5, 0]];
  wingCenters.forEach(([x, z], index) => {
    const pedestal = addBox(frameGeometry, plinthMaterial, x, 0.55, z, 1.2, 1.1, 1.2);
    colliders.push(new THREE.Box3().setFromObject(pedestal));
    addBox(frameGeometry, trimMaterial, x, 1.12, z, 1.24, 0.06, 1.24);
    const form = index % 2 === 0
      ? new THREE.TorusKnotGeometry(0.34, 0.075, 64, 8, 2, 3)
      : new THREE.DodecahedronGeometry(0.48, 0);
    const sculpture = new THREE.Mesh(form, wingSculptureMaterials[index]);
    sculpture.position.set(x, 1.66, z);
    sculpture.castShadow = true;
    scene.add(sculpture);
    wingSculptures.push(sculpture);
  });

  // A sparse, low-cost dust field catches the gallery light.
  const dustCount = 88;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustBase = new Float32Array(dustCount * 3);
  const dustPhase = new Float32Array(dustCount);
  let seed = 93871;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < dustCount; i++) {
    const room = rooms[Math.floor(random() * rooms.length)];
    const j = i * 3;
    dustBase[j] = room.x0 + 1 + random() * (room.x1 - room.x0 - 2);
    dustBase[j + 1] = 1 + random() * 3.8;
    dustBase[j + 2] = room.z0 + 1 + random() * (room.z1 - room.z0 - 2);
    dustPositions[j] = dustBase[j];
    dustPositions[j + 1] = dustBase[j + 1];
    dustPositions[j + 2] = dustBase[j + 2];
    dustPhase[i] = random() * Math.PI * 2;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.computeBoundingSphere();
  dustGeometry.boundingSphere!.radius += 0.3;
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
    color: 0xe8d7ae, size: 0.045, transparent: true, opacity: 0.32, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(dust);

  const animationBase = wingSculptures.map((sculpture) => sculpture.rotation.y);
  const animateDetails = (time: number) => {
    for (let i = 0; i < wingSculptures.length; i++) {
      wingSculptures[i].rotation.y = animationBase[i] + time * (i % 2 ? -0.045 : 0.045);
    }
    for (let i = 0; i < dustCount; i++) {
      const j = i * 3;
      const phase = dustPhase[i] + time * 0.28;
      dustPositions[j] = dustBase[j] + Math.sin(phase) * 0.12;
      dustPositions[j + 1] = dustBase[j + 1] + Math.sin(phase * 0.7) * 0.18;
      dustPositions[j + 2] = dustBase[j + 2] + Math.cos(phase * 0.8) * 0.12;
    }
    dustGeometry.attributes.position.needsUpdate = true;
  };

  let textureLoads = 0;
  const loadNearbyArt = (position: THREE.Vector3): boolean => {
    const nearby = displays
      .filter((display) => !display.loading && !display.loaded && display.position.distanceToSquared(position) < 24 * 24)
      .sort((a, b) => a.position.distanceToSquared(position) - b.position.distanceToSquared(position))
      .slice(0, Math.max(0, 2 - textureLoads));
    for (const display of nearby) {
      display.loading = true;
      textureLoads++;
      void loadSmallTexture(`${BASE}images/${encodeURIComponent(display.meta.file)}`)
        .then((texture) => {
          (display.image.material as THREE.MeshBasicMaterial).map = texture;
          (display.image.material as THREE.MeshBasicMaterial).needsUpdate = true;
          const image = texture.image as ImageBitmap;
          const aspect = image.width / image.height;
          const frameAspect = display.width / display.height;
          if (aspect > frameAspect) display.image.scale.set(display.width, display.width / aspect, 1);
          else display.image.scale.set(display.height * aspect, display.height, 1);
          display.loaded = true;
          onAssetReady();
        })
        .catch((error) => {
          console.warn('Artwork could not be loaded:', display.meta.file, error);
          display.loaded = true;
          onAssetReady();
        })
        .finally(() => { display.loading = false; textureLoads--; });
    }
    return textureLoads > 0 || nearby.length > 0 || displays.some((display) =>
      !display.loading && !display.loaded && display.position.distanceToSquared(position) < 24 * 24,
    );
  };

  return {
    displays,
    imageTargets,
    colliders,
    rooms,
    loadNearbyArt,
    animateDetails,
  };
}

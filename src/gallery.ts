import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { ArtworkMeta, GalleryExhibit } from './types';

type ArtworkDisplay = {
  meta: ArtworkMeta;
  image: THREE.Mesh;
  hitArea: THREE.Mesh;
  position: THREE.Vector3;
  width: number;
  height: number;
  yaw: number;
  front: THREE.Vector3;
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
  // Warm sand-mustard plaster keeps the room bright while giving the art a
  // quieter, more traditional museum backdrop.
  ctx.fillStyle = '#cdb782';
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
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xfff6df, map: wallTexture, roughness: 0.96 });
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
  const doorSystems: Array<{
    center: THREE.Vector3;
    leaves: THREE.Group[];
    bounds: THREE.Box3[];
    progress: number;
  }> = [];
  const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x604a31, roughness: 0.3, metalness: 0.72 });
  const doorGlassMaterial = new THREE.MeshStandardMaterial({
    color: 0xb6c5bf,
    roughness: 0.28,
    metalness: 0.08,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const doorLeafWidth = 1.6;
  const doorHeight = 5.02;
  const doorDepth = 0.1;
  const doorBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const doorGeometryPart = (
    parent: THREE.Group,
    material: THREE.Material,
    x: number, y: number, z: number,
    width: number, height: number, depth: number,
  ) => {
    const part = new THREE.Mesh(doorBoxGeometry, material);
    part.position.set(x, y, z);
    part.scale.set(width, height, depth);
    part.castShadow = false;
    parent.add(part);
  };
  const addAutomaticDoor = (x: number, z: number, yaw: number) => {
    const doorway = new THREE.Group();
    doorway.position.set(x, 0, z);
    doorway.rotation.y = yaw;
    scene.add(doorway);

    const leaves: THREE.Group[] = [];
    const bounds: THREE.Box3[] = [];
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.position.set(side * doorLeafWidth / 2, doorHeight / 2, 0.07);
      doorway.add(leaf);
      doorGeometryPart(leaf, doorGlassMaterial, 0, 0, doorDepth * 0.54,
        doorLeafWidth - 0.15, doorHeight - 0.16, 0.018);
      doorGeometryPart(leaf, doorFrameMaterial, -doorLeafWidth / 2 + 0.045, 0, doorDepth * 0.62,
        0.055, doorHeight, 0.035);
      doorGeometryPart(leaf, doorFrameMaterial, doorLeafWidth / 2 - 0.045, 0, doorDepth * 0.62,
        0.055, doorHeight, 0.035);
      doorGeometryPart(leaf, doorFrameMaterial, 0, -doorHeight / 2 + 0.045, doorDepth * 0.62,
        doorLeafWidth, 0.055, 0.035);
      doorGeometryPart(leaf, doorFrameMaterial, 0, doorHeight / 2 - 0.045, doorDepth * 0.62,
        doorLeafWidth, 0.055, 0.035);
      leaves.push(leaf);
      const collider = new THREE.Box3();
      colliders.push(collider);
      bounds.push(collider);
    }
    doorSystems.push({ center: new THREE.Vector3(x, 0, z), leaves, bounds, progress: 0 });
  };
  const addRoomFans = (rooms: Array<{ x0: number; x1: number; z0: number; z1: number }>) => {
    const rotors: THREE.Group[] = [];
    const fanMetal = new THREE.MeshStandardMaterial({ color: 0x252a2d, roughness: 0.42, metalness: 0.72 });
    const fanBladeMaterial = new THREE.MeshStandardMaterial({ color: 0x303437, roughness: 0.55, metalness: 0.62 });
    const fanRodGeometry = new THREE.CylinderGeometry(0.055, 0.065, 0.42, 12);
    const fanMotorGeometry = new THREE.CylinderGeometry(0.26, 0.34, 0.24, 16);
    const fanCapGeometry = new THREE.SphereGeometry(0.12, 12, 8);
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.12, -0.18);
    bladeShape.lineTo(2.55, -0.34);
    bladeShape.lineTo(3.05, -0.2);
    bladeShape.lineTo(3.18, 0.02);
    bladeShape.lineTo(2.76, 0.31);
    bladeShape.lineTo(0.12, 0.18);
    bladeShape.closePath();
    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.075,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.025,
    });

    for (const room of rooms) {
      const fan = new THREE.Group();
      fan.position.set((room.x0 + room.x1) / 2, WALL_HEIGHT - 0.16, (room.z0 + room.z1) / 2);
      scene.add(fan);
      const rod = new THREE.Mesh(fanRodGeometry, fanMetal);
      rod.position.y = -0.21;
      fan.add(rod);
      const motor = new THREE.Mesh(fanMotorGeometry, fanMetal);
      motor.position.y = -0.48;
      fan.add(motor);
      const rotor = new THREE.Group();
      rotor.position.y = -0.61;
      fan.add(rotor);
      const centerCap = new THREE.Mesh(fanCapGeometry, trimMaterial);
      centerCap.scale.set(1.2, 0.72, 1.2);
      rotor.add(centerCap);

      for (let i = 0; i < 5; i++) {
        const mount = new THREE.Group();
        mount.rotation.y = i * Math.PI * 2 / 5;
        rotor.add(mount);
        const blade = new THREE.Mesh(bladeGeometry, fanBladeMaterial);
        blade.rotation.x = -Math.PI / 2;
        blade.castShadow = false;
        mount.add(blade);
      }
      rotors.push(rotor);
    }
    return (time: number) => {
      for (let i = 0; i < rotors.length; i++) rotors[i].rotation.y = time * 0.48 + (i % 2) * 0.14;
    };
  };
  const baseTransforms: THREE.Matrix4[] = [];
  const postTransforms: THREE.Matrix4[] = [];
  const finialTransforms: THREE.Matrix4[] = [];
  const ropeTransforms: THREE.Matrix4[] = [];
  const barrierMatrix = new THREE.Matrix4();
  const barrierPosition = new THREE.Vector3();
  const barrierRotation = new THREE.Quaternion();
  const barrierScale = new THREE.Vector3(1, 1, 1);
  const barrierEuler = new THREE.Euler();
  const barrierDark = new THREE.MeshStandardMaterial({ color: 0x161719, roughness: 0.28, metalness: 0.72 });
  const barrierRope = new THREE.MeshStandardMaterial({ color: 0x831b1d, roughness: 0.78, metalness: 0.02 });
  const barrierBaseGeometry = new THREE.CylinderGeometry(0.22, 0.26, 0.14, 12);
  const barrierPostGeometry = new THREE.CylinderGeometry(0.055, 0.075, 0.9, 10);
  const barrierFinialGeometry = new THREE.SphereGeometry(0.13, 12, 8);
  const barrierRopeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.5, 0.82, 0),
    new THREE.Vector3(-0.28, 0.65, 0),
    new THREE.Vector3(0, 0.59, 0),
    new THREE.Vector3(0.28, 0.65, 0),
    new THREE.Vector3(0.5, 0.82, 0),
  ]);
  const barrierRopeGeometry = new THREE.TubeGeometry(barrierRopeCurve, 16, 0.034, 6, false);
  const putBarrierTransform = (target: THREE.Matrix4[], position: THREE.Vector3, yaw = 0, scaleX = 1) => {
    barrierPosition.copy(position);
    barrierEuler.set(0, yaw, 0);
    barrierRotation.setFromEuler(barrierEuler);
    barrierScale.set(scaleX, 1, 1);
    barrierMatrix.compose(barrierPosition, barrierRotation, barrierScale);
    target.push(barrierMatrix.clone());
  };
  const addStanchion = (x: number, z: number, yaw = 0) => {
    putBarrierTransform(baseTransforms, new THREE.Vector3(x, 0.08, z), yaw);
    putBarrierTransform(postTransforms, new THREE.Vector3(x, 0.58, z), yaw);
    putBarrierTransform(finialTransforms, new THREE.Vector3(x, 1.08, z), yaw);
  };
  const addBarrierLine = (start: THREE.Vector3, end: THREE.Vector3) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx);
    const midpoint = new THREE.Vector3((start.x + end.x) / 2, 0, (start.z + end.z) / 2);
    putBarrierTransform(ropeTransforms, midpoint, yaw, length);
    const bounds = new THREE.Box3().setFromPoints([start, end]);
    bounds.min.y = 0;
    bounds.max.y = 1;
    bounds.expandByVector(new THREE.Vector3(0.2, 0, 0.2));
    colliders.push(bounds);
  };
  const addArtworkBarrier = (display: ArtworkDisplay) => {
    const normal = display.front;
    const tangent = new THREE.Vector3(Math.cos(display.yaw), 0, -Math.sin(display.yaw));
    const center = new THREE.Vector3(display.position.x, 0, display.position.z).addScaledVector(normal, 2.15);
    const half = display.width / 2 + 0.5;
    const left = center.clone().addScaledVector(tangent, -half);
    const middle = center.clone();
    const right = center.clone().addScaledVector(tangent, half);
    addStanchion(left.x, left.z, display.yaw);
    addStanchion(middle.x, middle.z, display.yaw);
    addStanchion(right.x, right.z, display.yaw);
    addBarrierLine(left, middle);
    addBarrierLine(middle, right);
  };
  const addSculptureBarrier = (x: number, z: number, radius: number) => {
    const corners = [
      new THREE.Vector3(x - radius, 0, z - radius),
      new THREE.Vector3(x + radius, 0, z - radius),
      new THREE.Vector3(x + radius, 0, z + radius),
      new THREE.Vector3(x - radius, 0, z + radius),
    ];
    for (const corner of corners) addStanchion(corner.x, corner.z);
    for (let i = 0; i < corners.length; i++) addBarrierLine(corners[i], corners[(i + 1) % corners.length]);
  };

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
  const animateRoomFans = addRoomFans(rooms);

  // Central hall: three-metre portals keep each wing connected while making
  // the cross walls read as continuous architecture instead of one open hall.
  addWall(-7.25, -12, 11.5, WALL_HEIGHT, 0.42);
  addWall(7.25, -12, 11.5, WALL_HEIGHT, 0.42);
  addWall(-7.25, 12, 11.5, WALL_HEIGHT, 0.42);
  addWall(7.25, 12, 11.5, WALL_HEIGHT, 0.42);
  addWall(-13, -6.75, 0.42, WALL_HEIGHT, 10.5);
  addWall(-13, 6.75, 0.42, WALL_HEIGHT, 10.5);
  addWall(13, -6.75, 0.42, WALL_HEIGHT, 10.5);
  addWall(13, 6.75, 0.42, WALL_HEIGHT, 10.5);

  // Crafted brass lintels finish each broad doorway and create a clear rhythm
  // between the central hall and its four quieter wings.
  for (const z of [-12, 12]) {
    addBox(frameGeometry, wallMaterial, 0, 5.82, z, 3.5, 1.36, 0.42);
    for (const side of [-1, 1]) addBox(frameGeometry, trimMaterial, side * 1.6, 2.8, z, 0.1, 5.6, 0.52);
    addBox(frameGeometry, trimMaterial, 0, 5.08, z, 3.55, 0.09, 0.52);
  }
  for (const x of [-13, 13]) {
    addBox(frameGeometry, wallMaterial, x, 5.82, 0, 0.42, 1.36, 3.5);
    for (const side of [-1, 1]) addBox(frameGeometry, trimMaterial, x, 2.8, side * 1.6, 0.52, 5.6, 0.1);
    addBox(frameGeometry, trimMaterial, x, 5.08, 0, 0.52, 0.09, 3.55);
  }

  // Each of the four wing portals has a pair of sliding glass doors. Their
  // colliders follow the leaves so the opening becomes walkable as they slide.
  addAutomaticDoor(0, -11.72, 0);
  addAutomaticDoor(0, 11.72, Math.PI);
  addAutomaticDoor(-12.72, 0, Math.PI / 2);
  addAutomaticDoor(12.72, 0, -Math.PI / 2);

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
  const atriumSculpture = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshStandardMaterial({ color: 0x98a98d, roughness: 0.27, metalness: 0.48 }),
  );
  atriumSculpture.castShadow = false;
  atriumSculpture.position.set(0, 1.65, 0);
  scene.add(atriumSculpture);
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

  const ambient = new THREE.HemisphereLight(0xfff4df, 0x44382a, 1.35);
  const key = new THREE.DirectionalLight(0xffe8c8, 1.65);
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
  const fill = new THREE.DirectionalLight(0xe5dcc9, 0.38);
  fill.position.set(8, 7, -8);
  scene.add(ambient, key, fill);

  // Warm pools of light make each wing feel like its own room while keeping
  // the lighting cost low: these lights do not cast additional shadow maps.
  for (const room of rooms) {
    const light = new THREE.PointLight(0xffe2bd, room.name === 'The Atrium' ? 22 : 16, 27, 2);
    light.position.set((room.x0 + room.x1) / 2, WALL_HEIGHT - 0.9, (room.z0 + room.z1) / 2);
    scene.add(light);
  }

  function addArtwork(meta: ArtworkMeta, index: number, x: number, z: number, yaw: number) {
    const aspect = meta.aspectRatio ?? [1.16, 0.8, 1, 0.9, 1.22, 0.72, 1, 0.84][index % 8];
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

    const imageMaterial = new THREE.MeshStandardMaterial({ map: placeholder, color: 0xffffff, roughness: 0.9 });
    const image = new THREE.Mesh(frameImageGeometry, imageMaterial);
    image.scale.set(width, height, 1);
    image.position.z = 0.116;
    group.add(image);

    const hitArea = new THREE.Mesh(hitGeometry, hitMaterial);
    hitArea.scale.set(width + 0.34, height + 0.34, 1);
    hitArea.position.z = 0.13;
    hitArea.userData['exhibit'] = { kind: 'artwork', artwork: meta } satisfies GalleryExhibit;
    group.add(hitArea);
    imageTargets.push(hitArea);

    const display: ArtworkDisplay = {
      meta, image, hitArea, position: new THREE.Vector3(x, 2.52, z), width, height, loading: false, loaded: false,
      yaw,
      front: new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
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
  // The east wing mirrors the west wing; keep each work on its own wall slot.
  for (const x of [20, 34]) { addNext(x, -11.72, 0); addNext(x, 11.72, Math.PI); }

  // Rope stanchions protect each canvas. Instanced meshes keep the high post
  // count inexpensive on standalone Quest hardware.
  for (const display of displays) addArtworkBarrier(display);

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
    sculpture.castShadow = false;
    scene.add(sculpture);
    wingSculptures.push(sculpture);
  });

  // Real collection sculptures replace the procedural placeholders as the
  // visitor approaches each wing. The shipped GLBs are simplified and
  // meshopt-compressed; load and decode one at a time to protect frame pacing.
  const statueSpecs = [
    { file: 'cesar_-_louvre_museum.glb', title: 'Classical Bust', description: 'A three-dimensional portrait in the classical Roman tradition, with carved features and a close-cropped bust form that rewards a slow turn around the pedestal.', x: 0, z: -25, height: 2.15, baseY: 1.2, fallbackIndex: 0 },
    { file: 'cleopatra_art_noveau_sculpture.glb', title: 'Cleopatra', description: 'An Art Nouveau take on Cleopatra, pairing a portrait subject with flowing decorative lines and an elegant, sculptural silhouette.', x: 0, z: 25, height: 2.15, baseY: 1.2, fallbackIndex: 1 },
    { file: 'ship_in_a_bottle.glb', title: 'Ship in a Bottle', description: 'A miniature sailing ship sits inside a glass bottle, bringing rigging, hull, and delicate model-making into one compact object. Displayed in the West Gallery.', x: -26.5, z: 0, height: 1.25, baseY: 1.2, fallbackIndex: 2 },
    { file: 'tete_dhomme_barbu_coiffe_dun_turban.glb', title: 'Bearded Man with a Turban', description: 'A sculpted head study of a bearded man, where the wrapped turban and carefully modelled features give the portrait its strong outline.', x: 26.5, z: 0, height: 2.15, baseY: 1.2, fallbackIndex: 3 },
  ];
  addSculptureBarrier(0, 0, 2.05);
  statueSpecs.forEach((statue) => addSculptureBarrier(statue.x, statue.z, 1.95));
  const addInstances = (geometry: THREE.BufferGeometry, material: THREE.Material, transforms: THREE.Matrix4[]) => {
    if (transforms.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    mesh.count = transforms.length;
    for (let i = 0; i < transforms.length; i++) mesh.setMatrixAt(i, transforms[i]);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    scene.add(mesh);
  };
  addInstances(barrierBaseGeometry, barrierDark, baseTransforms);
  addInstances(barrierPostGeometry, barrierDark, postTransforms);
  addInstances(barrierFinialGeometry, barrierDark, finialTransforms);
  addInstances(barrierRopeGeometry, barrierRope, ropeTransforms);
  const statues = statueSpecs.map((spec) => ({
    ...spec,
    loading: false,
    loaded: false,
  }));
  let statueLoads = 0;
  const modelPreviews = new Map<string, THREE.Object3D>();

  // Reuse four focused spots and move them to the nearest paintings. This gives
  // the artwork a warm highlight without creating one real-time light per wall.
  const artworkSpotlights = Array.from({ length: 4 }, () => {
    const spot = new THREE.SpotLight(0xffd7a1, 48, 10, 0.68, 0.78, 2);
    spot.castShadow = false;
    spot.visible = false;
    scene.add(spot, spot.target);
    return spot;
  });
  let lastArtworkLightUpdate = -Infinity;
  const updateArtworkSpotlights = (position: THREE.Vector3) => {
    const now = performance.now();
    if (now - lastArtworkLightUpdate < 450) return;
    lastArtworkLightUpdate = now;
    const nearest = displays
      .map((display) => ({ display, distance: display.position.distanceToSquared(position) }))
      .filter(({ distance }) => distance < 21 * 21)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, artworkSpotlights.length);
    for (let i = 0; i < artworkSpotlights.length; i++) {
      const light = artworkSpotlights[i];
      const item = nearest[i]?.display;
      if (!item) {
        light.visible = false;
        continue;
      }
      light.visible = true;
      light.position.set(
        item.position.x + item.front.x * 1.8,
        5.35,
        item.position.z + item.front.z * 1.8,
      );
      light.target.position.copy(item.position);
      light.target.updateMatrixWorld();
    }
  };

  const loadStatue = (statue: typeof statues[number]) => {
    statue.loading = true;
    statueLoads++;
    const finish = () => {
      statue.loading = false;
      statue.loaded = true;
      statueLoads--;
      onAssetReady();
    };
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(`${BASE}models/featured/${statue.file}`, (gltf) => {
      const model = gltf.scene;
      modelPreviews.set(statue.file, model.clone(true));
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const height = Math.max(size.y, size.x, size.z);
      const scale = statue.height / Math.max(height, 0.001);
      const center = bounds.getCenter(new THREE.Vector3());
      model.scale.setScalar(scale);
      model.position.set(
        statue.x - center.x * scale,
        statue.baseY - bounds.min.y * scale,
        statue.z - center.z * scale,
      );
      model.traverse((part) => {
        if (part instanceof THREE.Mesh) {
          part.castShadow = false;
          part.receiveShadow = false;
          part.frustumCulled = true;
        }
      });
      scene.add(model);
      const targetWidth = Math.max(size.x * scale * 1.2, 0.85);
      const targetHeight = Math.max(size.y * scale * 1.2, 1.2);
      const targetDepth = Math.max(size.z * scale * 1.2, 0.85);
      const hitArea = new THREE.Mesh(
        new THREE.BoxGeometry(targetWidth, targetHeight, targetDepth),
        hitMaterial,
      );
      hitArea.position.set(statue.x, statue.baseY + targetHeight / 2, statue.z);
      const exhibit: GalleryExhibit = {
        kind: 'model',
        file: statue.file,
        title: statue.title,
        description: statue.description,
      };
      hitArea.userData['exhibit'] = exhibit;
      imageTargets.push(hitArea);
      scene.add(hitArea);
      if (statue.fallbackIndex >= 0) {
        const fallback = wingSculptures[statue.fallbackIndex];
        scene.remove(fallback);
        fallback.geometry.dispose();
        (fallback.material as THREE.Material).dispose();
      } else {
        scene.remove(atriumSculpture);
        atriumSculpture.geometry.dispose();
        (atriumSculpture.material as THREE.Material).dispose();
      }
      finish();
    }, undefined, (error) => {
      console.warn(`Statue model could not be loaded: ${statue.file}`, error);
      finish();
    });
  };

  const animationBase = wingSculptures.map((sculpture) => sculpture.rotation.y);
  const animateDetails = (time: number) => {
    animateRoomFans(time);
    for (let i = 0; i < wingSculptures.length; i++) {
      wingSculptures[i].rotation.y = animationBase[i] + time * (i % 2 ? -0.045 : 0.045);
    }
  };

  const updateDoors = (position: THREE.Vector3, dt: number) => {
    for (const door of doorSystems) {
      const distance = Math.hypot(position.x - door.center.x, position.z - door.center.z);
      const open = distance < (door.progress > 0.01 ? 7.5 : 6.2);
      const target = open ? 1 : 0;
      door.progress += (target - door.progress) * (1 - Math.exp(-7.5 * dt));
      for (let i = 0; i < door.leaves.length; i++) {
        const side = i === 0 ? -1 : 1;
        const leaf = door.leaves[i];
        leaf.position.x = side * (doorLeafWidth / 2 + doorLeafWidth * door.progress);
        leaf.updateWorldMatrix(true, true);
        door.bounds[i].setFromObject(leaf);
      }
    }
  };

  let textureLoads = 0;
  const loadNearbyArt = (position: THREE.Vector3): boolean => {
    updateArtworkSpotlights(position);
    const nearbyStatue = statues.find((statue) => !statue.loading && !statue.loaded &&
      Math.hypot(statue.x - position.x, statue.z - position.z) < (statue.fallbackIndex < 0 ? 24 : 30));
    if (nearbyStatue && statueLoads === 0) loadStatue(nearbyStatue);

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
    return statueLoads > 0 || textureLoads > 0 || nearby.length > 0 || displays.some((display) =>
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
    updateDoors,
    getModelPreview(file: string) {
      return modelPreviews.get(file)?.clone(true) ?? null;
    },
  };
}

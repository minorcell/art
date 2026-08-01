// Human skeleton built from dense, deterministic Gaussian-splat samples.

import { Item } from '../Item.js';
import { makeBackground, createRandom, mix, pushPoint } from '../bg-utils.js';

const TAU = Math.PI * 2;

const BONE = [0.60, 0.68, 0.74];
const BONE_LIGHT = [0.90, 0.94, 0.96];
const BONE_SHADE = [0.22, 0.29, 0.36];
const MARROW = [0.22, 0.50, 0.62];
const MARROW_LIGHT = [0.52, 0.76, 0.84];
const SOCKET = [0.018, 0.035, 0.060];

function length3(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

function normalize3(a) {
  const length = length3(a) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function varyColor(color, random, amount = 0.10) {
  const factor = 1 - amount * 0.5 + random() * amount;
  return [
    Math.min(1, color[0] * factor),
    Math.min(1, color[1] * factor),
    Math.min(1, color[2] * factor),
  ];
}

function makeCloud(seed) {
  const random = createRandom(seed);
  return {
    random,
    positions: [],
    colors: [],
    point(x, y, z, color, jitter = 0, variation = 0.08) {
      this.positions.push(
        x + (random() - 0.5) * jitter,
        y + (random() - 0.5) * jitter,
        z + (random() - 0.5) * jitter,
      );
      const shaded = varyColor(color, random, variation);
      this.colors.push(shaded[0], shaded[1], shaded[2]);
    },
  };
}

function sampleSegment(cloud, count, a, b, radius, color, variation = 0.10) {
  const direction = normalize3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const reference = Math.abs(direction[1]) < 0.86 ? [0, 1, 0] : [1, 0, 0];
  const side = normalize3(cross3(direction, reference));
  const other = cross3(direction, side);
  const { random } = cloud;

  for (let i = 0; i < count; i += 1) {
    const t = random();
    const angle = random() * TAU;
    const radial = radius * (0.60 + Math.sqrt(random()) * 0.52);
    const axial = (random() - 0.5) * radius * 0.18;
    const center = [
      a[0] + (b[0] - a[0]) * t + direction[0] * axial,
      a[1] + (b[1] - a[1]) * t + direction[1] * axial,
      a[2] + (b[2] - a[2]) * t + direction[2] * axial,
    ];
    const px = center[0] + (side[0] * Math.cos(angle) + other[0] * Math.sin(angle)) * radial;
    const py = center[1] + (side[1] * Math.cos(angle) + other[1] * Math.sin(angle)) * radial;
    const pz = center[2] + (side[2] * Math.cos(angle) + other[2] * Math.sin(angle)) * radial;
    const shade = random() < 0.18 ? BONE_LIGHT : (random() < 0.22 ? BONE_SHADE : color);
    cloud.point(px, py, pz, shade, radius * 0.10, variation);
  }
}

function sampleSphere(cloud, count, center, radius, color, variation = 0.10) {
  const { random } = cloud;
  for (let i = 0; i < count; i += 1) {
    const y = random() * 2 - 1;
    const angle = random() * TAU;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const distance = Math.pow(random(), 0.34);
    const shade = random() < 0.22 ? BONE_LIGHT : color;
    cloud.point(
      center[0] + Math.cos(angle) * ring * radius[0] * distance,
      center[1] + y * radius[1] * distance,
      center[2] + Math.sin(angle) * ring * radius[2] * distance,
      shade,
      Math.min(...radius) * 0.08,
      variation,
    );
  }
}

function sampleCurve(cloud, count, curve, radius, color, variation = 0.10) {
  const { random } = cloud;
  for (let i = 0; i < count; i += 1) {
    const t = random();
    const center = curve(t);
    const theta = random() * TAU;
    const phi = Math.acos(2 * random() - 1);
    const distance = radius * Math.pow(random(), 0.42);
    cloud.point(
      center[0] + Math.sin(phi) * Math.cos(theta) * distance,
      center[1] + Math.cos(phi) * distance,
      center[2] + Math.sin(phi) * Math.sin(theta) * distance,
      random() < 0.25 ? BONE_LIGHT : color,
      radius * 0.08,
      variation,
    );
  }
}

function sampleRing(cloud, count, center, radius, normal, color, variation = 0.10) {
  const n = normalize3(normal);
  const reference = Math.abs(n[1]) < 0.86 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize3(cross3(n, reference));
  const v = cross3(n, u);
  const { random } = cloud;
  for (let i = 0; i < count; i += 1) {
    const angle = random() * TAU;
    const wobble = radius * (0.90 + random() * 0.13);
    cloud.point(
      center[0] + (u[0] * Math.cos(angle) + v[0] * Math.sin(angle)) * wobble,
      center[1] + (u[1] * Math.cos(angle) + v[1] * Math.sin(angle)) * wobble,
      center[2] + (u[2] * Math.cos(angle) + v[2] * Math.sin(angle)) * wobble,
      color,
      radius * 0.06,
      variation,
    );
  }
}

function addFinger(cloud, side, start, spread, length, zOffset) {
  const direction = [side * spread, -0.15, zOffset];
  const end = [
    start[0] + direction[0] * length,
    start[1] + direction[1] * length,
    start[2] + direction[2] * length,
  ];
  sampleSegment(cloud, 220, start, end, 0.022, BONE, 0.13);
  sampleSphere(cloud, 100, end, [0.030, 0.030, 0.030], BONE_LIGHT, 0.12);
}

function addHand(cloud, side, wrist) {
  const palm = [wrist[0] + side * 0.018, wrist[1] - 0.16, wrist[2] + 0.015];
  sampleEllipsoid(cloud, 620, palm, [0.115, 0.19, 0.070], BONE, 0.12);
  for (let finger = 0; finger < 4; finger += 1) {
    const spread = (finger - 1.5) * 0.055;
    addFinger(cloud, side, [palm[0] + side * spread, palm[1] - 0.11, palm[2]], spread * 0.55, 1 - Math.abs(finger - 1.5) * 0.07, 0.015 + (finger - 1.5) * 0.010);
  }
  const thumbStart = [palm[0] + side * 0.10, palm[1] - 0.02, palm[2] + 0.01];
  addFinger(cloud, side, thumbStart, 0.24, 0.38, 0.045);
}

function sampleEllipsoid(cloud, count, center, radius, color, variation = 0.10) {
  const { random } = cloud;
  for (let i = 0; i < count; i += 1) {
    const u = random() * 2 - 1;
    const angle = random() * TAU;
    const ring = Math.sqrt(Math.max(0, 1 - u * u));
    const distance = Math.pow(random(), 0.30);
    const shade = random() < 0.18 ? BONE_LIGHT : color;
    cloud.point(
      center[0] + Math.cos(angle) * ring * radius[0] * distance,
      center[1] + u * radius[1] * distance,
      center[2] + Math.sin(angle) * ring * radius[2] * distance,
      shade,
      Math.min(...radius) * 0.08,
      variation,
    );
  }
}

function addSkull(cloud) {
  sampleEllipsoid(cloud, 5600, [0, 2.67, 0.01], [0.34, 0.39, 0.30], BONE, 0.14);
  sampleEllipsoid(cloud, 1200, [0, 2.38, 0.105], [0.23, 0.17, 0.22], BONE_SHADE, 0.12);

  // Eye sockets, nasal bridge, cheekbones, jaw and teeth make the head legible.
  for (const side of [-1, 1]) {
    sampleRing(cloud, 420, [side * 0.125, 2.70, 0.285], 0.105, [0, 0, 1], BONE_LIGHT, 0.10);
    sampleEllipsoid(cloud, 210, [side * 0.125, 2.70, 0.300], [0.070, 0.066, 0.020], SOCKET, 0.06);
    sampleSegment(cloud, 260, [side * 0.10, 2.57, 0.28], [side * 0.21, 2.52, 0.20], 0.035, BONE_LIGHT, 0.10);
  }
  sampleSegment(cloud, 440, [0, 2.82, 0.30], [0, 2.47, 0.32], 0.034, BONE_LIGHT, 0.10);
  sampleSegment(cloud, 520, [-0.18, 2.43, 0.25], [0.18, 2.43, 0.25], 0.035, BONE_LIGHT, 0.10);
  for (let i = 0; i < 8; i += 1) {
    const x = -0.13 + i * 0.037;
    sampleSegment(cloud, 90, [x, 2.43, 0.282], [x, 2.35, 0.275], 0.012, BONE_LIGHT, 0.08);
  }
}

function addSpineAndRibs(cloud) {
  const { random } = cloud;
  const spineTop = [0, 2.20, -0.015];
  const spineBottom = [0, 0.60, -0.03];
  sampleSegment(cloud, 1800, spineBottom, spineTop, 0.060, MARROW, 0.12);

  for (let i = 0; i < 15; i += 1) {
    const t = i / 14;
    const y = 0.64 + t * 1.48;
    const x = Math.sin(t * 2.4) * 0.018;
    sampleEllipsoid(cloud, 300, [x, y, -0.025], [0.105, 0.060, 0.075], BONE_LIGHT, 0.11);
    sampleRing(cloud, 125, [x, y, -0.078], 0.045, [0, 1, 0], MARROW_LIGHT, 0.08);
  }

  sampleSegment(cloud, 1000, [0, 2.07, 0.27], [0, 1.16, 0.27], 0.052, BONE_LIGHT, 0.10);
  sampleSegment(cloud, 620, [-0.07, 2.08, 0.16], [-0.44, 2.10, 0.03], 0.042, BONE, 0.11);
  sampleSegment(cloud, 620, [0.07, 2.08, 0.16], [0.44, 2.10, 0.03], 0.042, BONE, 0.11);

  const ribs = [
    [2.00, 0.48, 0.17], [1.84, 0.57, 0.19], [1.68, 0.64, 0.20],
    [1.51, 0.66, 0.18], [1.34, 0.61, 0.15], [1.19, 0.52, 0.11],
  ];
  for (const [y, width, depth] of ribs) {
    for (const side of [-1, 1]) {
      sampleCurve(cloud, 980, (t) => {
        const angle = t * Math.PI * 0.94;
        return [
          side * width * Math.sin(angle),
          y - 0.035 * Math.sin(angle),
          0.25 - depth * (1 - Math.cos(angle)),
        ];
      }, 0.028, BONE, 0.12);
      // A fine inner contour adds the thin layered rib appearance.
      sampleCurve(cloud, 340, (t) => {
        const angle = t * Math.PI * 0.94;
        return [
          side * (width - 0.032) * Math.sin(angle),
          y - 0.035 * Math.sin(angle),
          0.25 - depth * (1 - Math.cos(angle)) + 0.018,
        ];
      }, 0.010, MARROW_LIGHT, 0.08);
    }
  }
}

function addPelvis(cloud) {
  sampleEllipsoid(cloud, 1500, [0, 0.48, 0.00], [0.24, 0.28, 0.13], BONE_SHADE, 0.12);
  for (const side of [-1, 1]) {
    sampleCurve(cloud, 1100, (t) => {
      const angle = Math.PI * (0.12 + 0.88 * t);
      return [
        side * (0.20 + 0.25 * Math.sin(angle)),
        0.58 - 0.30 * t + 0.10 * Math.cos(angle),
        0.03 - 0.16 * Math.sin(angle),
      ];
    }, 0.050, BONE, 0.12);
    sampleEllipsoid(cloud, 520, [side * 0.31, 0.45, 0.00], [0.12, 0.15, 0.12], BONE_LIGHT, 0.10);
    sampleSegment(cloud, 420, [side * 0.23, 0.34, 0.17], [side * 0.08, 0.29, 0.20], 0.040, BONE_LIGHT, 0.10);
  }
  sampleSegment(cloud, 520, [-0.08, 0.30, 0.20], [0.08, 0.30, 0.20], 0.045, MARROW_LIGHT, 0.09);
}

function addArms(cloud) {
  for (const side of [-1, 1]) {
    const shoulder = [side * 0.63, 2.03, 0.01];
    const elbow = [side * 0.82, 1.40, 0.02];
    const wrist = [side * 0.73, 0.77, 0.10];
    sampleSphere(cloud, 820, shoulder, [0.15, 0.15, 0.15], BONE_LIGHT, 0.12);
    sampleSegment(cloud, 1900, shoulder, elbow, 0.095, BONE, 0.13);
    sampleSphere(cloud, 640, elbow, [0.115, 0.11, 0.11], MARROW_LIGHT, 0.12);
    sampleSegment(cloud, 1450, [elbow[0], elbow[1], -0.06], wrist, 0.060, BONE, 0.13);
    sampleSegment(cloud, 1350, [elbow[0], elbow[1], 0.09], [wrist[0], wrist[1], 0.18], 0.052, BONE_SHADE, 0.13);
    sampleSphere(cloud, 460, wrist, [0.085, 0.085, 0.085], BONE_LIGHT, 0.12);
    addHand(cloud, side, wrist);
  }
}

function addLegs(cloud) {
  for (const side of [-1, 1]) {
    const hip = [side * 0.30, 0.48, 0.00];
    const knee = [side * 0.36, -0.34, 0.015];
    const ankle = [side * 0.31, -1.18, 0.025];
    sampleSphere(cloud, 760, hip, [0.14, 0.14, 0.14], BONE_LIGHT, 0.12);
    sampleSegment(cloud, 2750, hip, knee, 0.125, BONE, 0.13);
    sampleSegment(cloud, 800, [side * 0.33, 0.44, 0.10], [side * 0.39, -0.28, 0.10], 0.045, MARROW, 0.12);
    sampleSphere(cloud, 700, knee, [0.125, 0.12, 0.12], BONE_LIGHT, 0.12);
    sampleSegment(cloud, 2500, knee, ankle, 0.085, BONE, 0.13);
    sampleSegment(cloud, 1700, [side * 0.42, -0.38, 0.02], [side * 0.36, -1.16, 0.095], 0.047, BONE_SHADE, 0.13);
    sampleSphere(cloud, 440, ankle, [0.085, 0.10, 0.09], MARROW_LIGHT, 0.12);
    const heel = [side * 0.31, -1.28, 0.04];
    const toe = [side * 0.31, -1.31, 0.32];
    sampleSegment(cloud, 950, ankle, heel, 0.055, BONE, 0.12);
    sampleSegment(cloud, 980, heel, toe, 0.062, BONE_LIGHT, 0.12);
    for (let i = 0; i < 5; i += 1) {
      const toeStart = [toe[0] + side * (i - 2) * 0.026, toe[1] - 0.015, toe[2] + 0.035];
      const toeEnd = [toeStart[0] + side * (i - 2) * 0.016, toeStart[1] - 0.015, toeStart[2] + 0.105 - Math.abs(i - 2) * 0.012];
      sampleSegment(cloud, 180, toeStart, toeEnd, 0.022, BONE_LIGHT, 0.11);
    }
  }
}

function buildSkeletonCloud() {
  const cloud = makeCloud(0x51e1e70);
  addSkull(cloud);
  sampleSegment(cloud, 620, [0, 2.36, 0.00], [0, 2.14, -0.005], 0.072, BONE, 0.12);
  addSpineAndRibs(cloud);
  addPelvis(cloud);
  addArms(cloud);
  addLegs(cloud);

  // A restrained halo of osteocyte-like particles keeps the splat character
  // without turning the anatomy into a cloud of confetti.
  const { random } = cloud;
  for (let i = 0; i < 1100; i += 1) {
    const t = random();
    const y = -1.35 + random() * 4.15;
    const radius = 0.25 + random() * 0.58;
    const angle = random() * TAU;
    cloud.point(
      Math.cos(angle) * radius,
      y,
      -0.75 + Math.sin(angle) * 0.30,
      random() < 0.65 ? MARROW : MARROW_LIGHT,
      0.012,
      0.20,
    );
  }
  return cloud;
}

function buildSkeletonDetails() {
  const cloud = makeCloud(0x8b0e15);
  const detail = [0.46, 0.68, 0.76];
  const detailLight = [0.76, 0.88, 0.91];

  // Fine cortical striations follow the long bones instead of filling them
  // with a uniform tube. The small rings read as epiphyseal landmarks.
  const bones = [
    [[-0.63, 2.03, 0.01], [-0.82, 1.40, 0.02], 0.020, 1150],
    [[0.63, 2.03, 0.01], [0.82, 1.40, 0.02], 0.020, 1150],
    [[-0.82, 1.40, -0.06], [-0.73, 0.77, 0.10], 0.014, 900],
    [[0.82, 1.40, -0.06], [0.73, 0.77, 0.10], 0.014, 900],
    [[-0.30, 0.48, 0.00], [-0.36, -0.34, 0.015], 0.024, 1500],
    [[0.30, 0.48, 0.00], [0.36, -0.34, 0.015], 0.024, 1500],
    [[-0.36, -0.34, 0.015], [-0.31, -1.18, 0.025], 0.018, 1300],
    [[0.36, -0.34, 0.015], [0.31, -1.18, 0.025], 0.018, 1300],
  ];
  for (const [a, b, radius, count] of bones) {
    sampleSegment(cloud, count, a, b, radius, detail, 0.10);
    const direction = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    for (const t of [0.08, 0.22, 0.50, 0.78, 0.92]) {
      sampleRing(cloud, 96, [
        a[0] + direction[0] * t,
        a[1] + direction[1] * t,
        a[2] + direction[2] * t,
      ], radius * 1.55, direction, detailLight, 0.07);
    }
  }

  // Costal cartilage and the fine seam between each rib.
  for (const y of [2.00, 1.84, 1.68, 1.51, 1.34, 1.19]) {
    sampleSegment(cloud, 260, [0, y, 0.27], [0, y - 0.01, 0.28], 0.014, detailLight, 0.07);
  }

  return cloud;
}

function applyArticulatedMotion(target, source, time) {
  const breath = Math.sin(time * 1.20) * 0.014;
  const armSwing = Math.sin(time * 0.72) * 0.032 + Math.sin(time * 1.31 + 0.8) * 0.008;
  const legSwing = Math.sin(time * 0.66 + 0.9) * 0.018;
  const headNod = Math.sin(time * 0.44 + 0.5) * 0.014;

  for (let i = 0; i < source.length; i += 3) {
    const baseX = source[i];
    const baseY = source[i + 1];
    const baseZ = source[i + 2];
    let x = baseX;
    let y = baseY;
    let z = baseZ;

    const chest = Math.max(0, Math.min(1, (baseY - 0.98) / 1.12));
    const chestWidth = Math.max(0, 1 - Math.abs(baseX) / 0.72);
    z += breath * chest * chestWidth;

    if (Math.abs(baseX) > 0.50 && baseY > 0.62 && baseY < 2.18) {
      const side = Math.sign(baseX);
      const pivotX = side * 0.63;
      const pivotY = 2.03;
      const angle = side * armSwing;
      const dx = x - pivotX;
      const dy = y - pivotY;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      x = pivotX + dx * cosine - dy * sine;
      y = pivotY + dx * sine + dy * cosine;
    } else if (Math.abs(baseX) > 0.20 && baseY < 0.40) {
      const side = Math.sign(baseX);
      const pivotX = side * 0.30;
      const pivotY = 0.48;
      const angle = side * legSwing;
      const dx = x - pivotX;
      const dy = y - pivotY;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      x = pivotX + dx * cosine - dy * sine;
      y = pivotY + dx * sine + dy * cosine;
    }

    if (baseY > 2.32 && Math.abs(baseX) < 0.38) {
      const pivotY = 2.28;
      const dy = y - pivotY;
      const cosine = Math.cos(headNod);
      const sine = Math.sin(headNod);
      y = pivotY + dy * cosine - z * sine;
      z = pivotY + dy * sine + z * cosine - pivotY;
    }

    target[i] = x;
    target[i + 1] = y;
    target[i + 2] = z;
  }
}

function buildSkeletonBackground(ctx) {
  const positions = [];
  const colors = [];
  const random = createRandom(0x7a11e7);
  const deep = [0.012, 0.025, 0.055];
  const blue = [0.07, 0.18, 0.28];
  const violet = [0.12, 0.09, 0.20];

  for (let i = 0; i < 5200; i += 1) {
    const angle = random() * TAU;
    const radius = Math.pow(random(), 0.52) * 4.8;
    const x = Math.cos(angle) * radius;
    const y = -1.4 + random() * 4.3;
    const z = -2.5 - random() * 2.4;
    pushPoint(positions, colors, x, y, z, mix(deep, random() < 0.64 ? blue : violet, random() * 0.48), 0.035, random);
  }
  for (let ring = 0; ring < 7; ring += 1) {
    const y = -1.32 + ring * 0.70;
    for (let i = 0; i < 340; i += 1) {
      const a = (i / 340) * TAU;
      const r = 1.1 + ring * 0.28;
      pushPoint(positions, colors, Math.cos(a) * r, y + Math.sin(a * 3) * 0.035, -1.95, [0.07, 0.13, 0.20], 0.018, random);
    }
  }
  return makeBackground(ctx, positions, colors, { pointSize: 0.020, scatterRadius: 1.1, centerY: 0.8 });
}

export class Skeleton extends Item {
  static id = 'skeleton';
  static displayName = '人体骨架';
  static autoRotate = true;
  static camera = { position: [0, 1.15, 6.3], target: [0, 1.05, 0] };

  buildBackground(ctx) {
    return buildSkeletonBackground(ctx);
  }

  buildModel(ctx) {
    const cloud = buildSkeletonCloud();
    const details = buildSkeletonDetails();
    const finalPos = new Float32Array(cloud.positions);
    const finalColor = new Float32Array(cloud.colors);
    const detailPos = new Float32Array(details.positions);
    const detailColor = new Float32Array(details.colors);
    const scatterPos = ctx.scatterFrom(finalPos, 3.5, 1.05);
    const detailScatter = ctx.scatterFrom(detailPos, 3.2, 1.05);
    const skeletonMesh = ctx.createSplatMesh(finalPos, finalColor, scatterPos, 0.013);
    const detailMesh = ctx.createSplatMesh(detailPos, detailColor, detailScatter, 0.0065);
    skeletonMesh.renderOrder = 10;
    detailMesh.renderOrder = 11;
    skeletonMesh.frustumCulled = false;
    detailMesh.frustumCulled = false;

    const THREE = ctx.THREE;
    const ambient = new THREE.AmbientLight(0x1c2b46, 2.8);
    const key = new THREE.DirectionalLight(0xd8f4ff, 6.0);
    key.position.set(3.5, 5.0, 4.0);
    const rim = new THREE.DirectionalLight(0x4e8fff, 4.2);
    rim.position.set(-3.0, 2.0, -4.0);
    const core = new THREE.PointLight(0x39c6ff, 2.4, 4.4);
    core.position.set(0, 1.15, 0.4);

    this._mesh = skeletonMesh;
    this._detailMesh = detailMesh;
    this._core = core;
    this._basePointSize = 0.013;
    this._sf = ctx.scatterFrom;
    this._finalPos = new Float32Array(finalPos);
    this._detailPos = new Float32Array(detailPos);
    this._phaseStart = 0;

    console.log(`Skeleton splats: ${((finalPos.length + detailPos.length) / 3).toLocaleString()}`);
    return { meshes: [skeletonMesh, detailMesh], lights: [ambient, key, rim, core] };
  }

  onBeforeGather() {
    for (const mesh of [this._mesh, this._detailMesh]) {
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
    }
    this._mesh.geometry.attributes.position.array.set(this._finalPos);
    this._mesh.geometry.attributes.position.needsUpdate = true;
    this._mesh.geometry.attributes.scatterPos.array.set(this._sf(this._finalPos, 3.5, 1.05));
    this._mesh.geometry.attributes.scatterPos.needsUpdate = true;
    this._detailMesh.geometry.attributes.position.array.set(this._detailPos);
    this._detailMesh.geometry.attributes.position.needsUpdate = true;
    this._detailMesh.geometry.attributes.scatterPos.array.set(this._sf(this._detailPos, 3.2, 1.05));
    this._detailMesh.geometry.attributes.scatterPos.needsUpdate = true;
    this._mesh.material.uniforms.uPointSize.value = this._basePointSize;
    this._detailMesh.material.uniforms.uPointSize.value = 0.0065;
    this._core.intensity = 2.4;
    this._phaseStart = 0;
  }

  animate(time) {
    const sway = Math.sin(time * 0.62) * 0.014;
    const bob = Math.sin(time * 1.24 + 0.4) * 0.012;
    for (const mesh of [this._mesh, this._detailMesh]) {
      mesh.position.y = bob;
      mesh.rotation.z = sway;
      mesh.rotation.y = Math.sin(time * 0.38) * 0.010;
    }

    // Expand the thorax and articulate the main joints from their rest pose.
    const positions = this._mesh.geometry.attributes.position.array;
    applyArticulatedMotion(positions, this._finalPos, time);
    this._mesh.geometry.attributes.position.needsUpdate = true;

    const detailPositions = this._detailMesh.geometry.attributes.position.array;
    applyArticulatedMotion(detailPositions, this._detailPos, time);
    this._detailMesh.geometry.attributes.position.needsUpdate = true;

    const pulse = 1 + Math.sin(time * 1.7) * 0.035 + Math.sin(time * 4.1) * 0.012;
    this._mesh.material.uniforms.uPointSize.value = this._basePointSize * pulse;
    this._detailMesh.material.uniforms.uPointSize.value = 0.0065 * (0.96 + pulse * 0.04);
    this._core.intensity = 2.4 + Math.sin(time * 1.7) * 0.45;
  }

  reset() {
    this.onBeforeGather();
  }
}

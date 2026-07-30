// J-20-inspired twin-engine stealth fighter. The aircraft is a deterministic
// Gaussian point cloud with X as wingspan, Y as height, and the nose at +Z.

import { Item } from '../Item.js';
import { makeBackground, createRandom, mix, pushPoint, addCloud } from '../bg-utils.js';

function createJ20Background(ctx) {
  const positions = [];
  const colors = [];
  const random = createRandom(0x6a3230);
  const skyDark = [0.025, 0.08, 0.15];
  const cloudDark = [0.26, 0.38, 0.48];
  const cloudLight = [0.72, 0.84, 0.88];

  for (let i = 0; i < 2800; i += 1) {
    const x = -7.5 + random() * 15;
    const y = 0.3 + random() * 5.2;
    const z = -9.0 + random() * 3.0;
    pushPoint(positions, colors, x, y, z, mix(skyDark, cloudDark, random() * 0.45), 0.035, random);
  }

  for (let i = 0; i < 18; i += 1) {
    addCloud(
      positions,
      colors,
      random,
      [-5.6 + random() * 11.2, 1.2 + random() * 3.2, -6.0 + random() * 2.0],
      [1.0 + random() * 1.4, 0.28 + random() * 0.48, 0.8 + random() * 1.2],
      180,
      cloudDark,
      cloudLight,
    );
  }

  for (let i = 0; i < 900; i += 1) {
    const x = -8 + random() * 16;
    const y = -0.5 + random() * 0.9;
    const z = -7.8 + random() * 1.5;
    pushPoint(positions, colors, x, y, z, mix([0.06, 0.16, 0.20], cloudDark, random() * 0.55), 0.03, random);
  }

  return makeBackground(ctx, positions, colors, {
    pointSize: 0.036,
    scatterRadius: 1.0,
    centerY: 0.6,
    animate(mesh, time) {
      mesh.position.x = Math.sin(time * 0.045) * 0.22;
      mesh.position.y = Math.sin(time * 0.032) * 0.08;
    },
  });
}

// ═══════════════════════════════════════════════════════
// J-20 FIGHTER MODEL
// ═══════════════════════════════════════════════════════

const COLOR = {
  skin:       [0.29, 0.32, 0.34],
  skinLight:  [0.40, 0.44, 0.46],
  skinDark:   [0.16, 0.18, 0.20],
  edge:       [0.52, 0.55, 0.56],
  panel:      [0.075, 0.085, 0.095],
  intake:     [0.018, 0.024, 0.030],
  canopy:     [0.24, 0.18, 0.085],
  canopyHigh: [0.58, 0.40, 0.13],
  steel:      [0.31, 0.29, 0.27],
  steelLight: [0.57, 0.52, 0.46],
  red:        [0.86, 0.045, 0.028],
  green:      [0.04, 0.90, 0.31],
  white:      [0.82, 0.93, 1.00],
  amber:      [1.00, 0.46, 0.06],
  flameCore:  [0.75, 0.91, 1.00],
  flameBlue:  [0.11, 0.42, 1.00],
  flameHot:   [1.00, 0.24, 0.035],
  flow:       [0.15, 0.38, 0.48],
  flowHigh:   [0.46, 0.76, 0.84],
};

const FUSELAGE_PROFILE = [
  // z,     half width, lower y, upper y
  [-1.62,   0.43,       0.35,    0.60],
  [-1.36,   0.54,       0.34,    0.65],
  [-0.98,   0.61,       0.35,    0.68],
  [-0.45,   0.60,       0.36,    0.70],
  [ 0.10,   0.53,       0.38,    0.72],
  [ 0.55,   0.43,       0.41,    0.69],
  [ 0.96,   0.29,       0.44,    0.63],
  [ 1.31,   0.14,       0.47,    0.57],
  [ 1.62,   0.012,      0.51,    0.52],
];

const TAU = Math.PI * 2;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function profileAt(keys, z) {
  if (z <= keys[0][0]) return keys[0].slice(1);
  if (z >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);

  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (z < a[0] || z > b[0]) continue;
    const t = smoothstep((z - a[0]) / (b[0] - a[0]));
    return a.slice(1).map((value, index) => lerp(value, b[index + 1], t));
  }
  return keys[keys.length - 1].slice(1);
}

function fuselageAt(z) {
  return profileAt(FUSELAGE_PROFILE, z);
}

function createCloud(seed) {
  const random = createRandom(seed);
  const positions = [];
  const colors = [];

  function point(x, y, z, color, variation = 0.04, jitter = 0.0015) {
    positions.push(
      x + (random() - 0.5) * jitter,
      y + (random() - 0.5) * jitter,
      z + (random() - 0.5) * jitter,
    );
    const factor = 1 + (random() - 0.5) * variation;
    colors.push(
      Math.min(1, color[0] * factor),
      Math.min(1, color[1] * factor),
      Math.min(1, color[2] * factor),
    );
  }

  return { random, positions, colors, point };
}

function polygonSample(random, vertices) {
  const center = vertices.reduce(
    (sum, vertex) => [sum[0] + vertex[0], sum[1] + vertex[1]],
    [0, 0],
  ).map((value) => value / vertices.length);
  const edgeIndex = Math.floor(random() * vertices.length);
  const a = vertices[edgeIndex];
  const b = vertices[(edgeIndex + 1) % vertices.length];
  const edgeT = random();
  const radial = Math.sqrt(random());
  return [
    lerp(center[0], lerp(a[0], b[0], edgeT), radial),
    lerp(center[1], lerp(a[1], b[1], edgeT), radial),
  ];
}

function sampleLine(cloud, count, a, b, radius, color, variation = 0.03) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const t = random();
    point(
      lerp(a[0], b[0], t) + (random() - 0.5) * radius,
      lerp(a[1], b[1], t) + (random() - 0.5) * radius,
      lerp(a[2], b[2], t) + (random() - 0.5) * radius,
      color,
      variation,
    );
  }
}

function samplePolyline(cloud, count, vertices, radius, color, variation = 0.03) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const segment = Math.floor(random() * (vertices.length - 1));
    const a = vertices[segment];
    const b = vertices[segment + 1];
    const t = random();
    point(
      lerp(a[0], b[0], t) + (random() - 0.5) * radius,
      lerp(a[1], b[1], t) + (random() - 0.5) * radius,
      lerp(a[2], b[2], t) + (random() - 0.5) * radius,
      color,
      variation,
    );
  }
}

function sampleEllipsoid(cloud, count, center, radius, color, variation = 0.04) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const u = random() * 2 - 1;
    const angle = random() * TAU;
    const ring = Math.sqrt(1 - u * u);
    point(
      center[0] + radius[0] * ring * Math.cos(angle),
      center[1] + radius[1] * u,
      center[2] + radius[2] * ring * Math.sin(angle),
      color,
      variation,
    );
  }
}

function sampleWingSurface(cloud, count, vertices, side) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const [x, z] = polygonSample(random, vertices);
    const spanRatio = Math.min(1, Math.abs(x) / 1.12);
    const topY = 0.535 - spanRatio * 0.105 + z * 0.012;
    const top = random() < 0.72;
    const y = top ? topY : topY - 0.065;
    const color = top
      ? (random() < 0.22 ? COLOR.skinLight : COLOR.skin)
      : COLOR.skinDark;
    point(x, y, z, color, 0.065);
  }

  const edgePoints = vertices.map(([x, z]) => {
    const y = 0.538 - Math.min(1, Math.abs(x) / 1.12) * 0.105 + z * 0.012;
    return [x, y, z];
  });
  edgePoints.push(edgePoints[0]);
  samplePolyline(cloud, 1600, edgePoints, 0.008, COLOR.edge, 0.035);

  const trailingRoot = [side * 0.32, 0.49, -0.76];
  const trailingTip = [side * 0.99, 0.43, -0.66];
  sampleLine(cloud, 650, trailingRoot, trailingTip, 0.007, COLOR.panel, 0.025);
}

function samplePlanform(cloud, count, vertices, topY, thickness, color) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const [x, z] = polygonSample(random, vertices);
    const isTop = random() < 0.72;
    point(x, topY(x, z) - (isTop ? 0 : thickness), z, isTop ? color : COLOR.skinDark, 0.06);
  }
}

function sampleSidePanel(cloud, count, side, vertices, color) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const [y, z] = polygonSample(random, vertices);
    const x = side * (0.505 + 0.025 * Math.sin((z + 0.05) * Math.PI));
    point(x, y, z, color, 0.045, 0.001);
  }
}

function sampleTubeZ(cloud, count, centerX, centerY, z0, z1, radiusX, radiusY, color) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const angle = random() * TAU;
    const z = lerp(z0, z1, random());
    point(
      centerX + radiusX * Math.cos(angle),
      centerY + radiusY * Math.sin(angle),
      z,
      color,
      0.07,
    );
  }
}

function sampleRingXY(cloud, count, centerX, centerY, z, radiusX, radiusY, color) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const angle = random() * TAU;
    point(
      centerX + radiusX * Math.cos(angle),
      centerY + radiusY * Math.sin(angle),
      z,
      color,
      0.04,
      0.003,
    );
  }
}

function sampleDiscXY(cloud, count, centerX, centerY, z, radiusX, radiusY, color) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const distance = Math.sqrt(random());
    const angle = random() * TAU;
    point(
      centerX + radiusX * distance * Math.cos(angle),
      centerY + radiusY * distance * Math.sin(angle),
      z,
      color,
      0.04,
    );
  }
}

function buildFuselage(cloud) {
  const { random, point } = cloud;

  for (let i = 0; i < 34000; i += 1) {
    const z = lerp(-1.62, 1.62, random());
    const [halfWidth, lower, upper] = fuselageAt(z);
    const angle = random() * TAU;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = halfWidth * Math.sign(cos) * Math.pow(Math.abs(cos), 0.82);
    const halfHeight = (upper - lower) * 0.5;
    const centerY = (upper + lower) * 0.5;
    const y = centerY + halfHeight * Math.sign(sin) * Math.pow(Math.abs(sin), 1.12);
    const color = sin > 0.48 ? COLOR.skinLight : sin < -0.35 ? COLOR.skinDark : COLOR.skin;
    point(x, y, z, color, 0.07);
  }

  for (const side of [-1, 1]) {
    samplePolyline(
      cloud,
      1100,
      [
        [0, 0.525, 1.61],
        [side * 0.17, 0.585, 1.17],
        [side * 0.40, 0.650, 0.58],
        [side * 0.57, 0.630, -0.12],
      ],
      0.008,
      COLOR.edge,
    );
  }

  sampleRingXY(cloud, 550, 0, 0.52, 1.08, 0.245, 0.090, COLOR.panel);
  sampleDiscXY(cloud, 350, 0, 0.515, 1.615, 0.020, 0.012, COLOR.panel);
}

function buildWings(cloud) {
  for (const side of [-1, 1]) {
    const wing = [
      [side * 0.26, 0.42],
      [side * 1.12, -0.40],
      [side * 1.03, -0.71],
      [side * 0.39, -1.12],
      [side * 0.24, -0.63],
    ];
    sampleWingSurface(cloud, 13500, wing, side);

    const lerx = [
      [side * 0.18, 1.07],
      [side * 0.54, 0.35],
      [side * 0.53, -0.15],
      [side * 0.25, 0.18],
    ];
    samplePlanform(
      cloud,
      4200,
      lerx,
      (x, z) => 0.585 - Math.abs(x) * 0.07 + z * 0.015,
      0.070,
      COLOR.skin,
    );

  }
}

function buildCanard(cloud, side) {
  const canard = [
    [side * 0.30, 0.68],
    [side * 0.80, 0.34],
    [side * 0.68, 0.06],
    [side * 0.33, 0.22],
  ];
  samplePlanform(
    cloud,
    5200,
    canard,
    (x, z) => 0.585 - Math.abs(x) * 0.065 + z * 0.012,
    0.048,
    COLOR.skinLight,
  );
  const canardEdge = canard.map(([x, z]) => [x, 0.592 - Math.abs(x) * 0.065 + z * 0.012, z]);
  canardEdge.push(canardEdge[0]);
  samplePolyline(cloud, 1000, canardEdge, 0.006, COLOR.edge);

  sampleLine(
    cloud,
    420,
    [side * 0.34, 0.570, 0.26],
    [side * 0.70, 0.545, 0.18],
    0.006,
    COLOR.panel,
  );
}

function buildIntakes(cloud) {
  const intakeShape = [
    [0.435, 0.61],
    [0.605, 0.54],
    [0.565, 0.05],
    [0.405, -0.02],
  ];

  for (const side of [-1, 1]) {
    sampleSidePanel(cloud, 3200, side, intakeShape, COLOR.intake);
    sampleEllipsoid(cloud, 2100, [side * 0.48, 0.545, 0.42], [0.095, 0.085, 0.245], COLOR.skinLight, 0.055);
    samplePolyline(
      cloud,
      900,
      [
        [side * 0.515, 0.610, 0.58],
        [side * 0.535, 0.565, 0.18],
        [side * 0.515, 0.420, 0.00],
      ],
      0.008,
      COLOR.edge,
    );
  }
}

function buildEngines(cloud) {
  for (const side of [-1, 1]) {
    const centerX = side * 0.285;
    sampleTubeZ(cloud, 6600, centerX, 0.485, -1.48, -0.36, 0.225, 0.165, COLOR.skinDark);
    sampleTubeZ(cloud, 2500, centerX, 0.485, -1.60, -1.45, 0.175, 0.135, COLOR.steel);
    sampleRingXY(cloud, 1300, centerX, 0.485, -1.605, 0.178, 0.138, COLOR.steelLight);
    sampleRingXY(cloud, 900, centerX, 0.485, -1.612, 0.125, 0.095, COLOR.intake);

    for (let petal = 0; petal < 12; petal += 1) {
      const angle = petal * TAU / 12;
      const x = centerX + 0.151 * Math.cos(angle);
      const y = 0.485 + 0.115 * Math.sin(angle);
      sampleLine(
        cloud,
        95,
        [x, y, -1.47],
        [centerX + 0.167 * Math.cos(angle), 0.485 + 0.130 * Math.sin(angle), -1.61],
        0.006,
        petal % 2 ? COLOR.steel : COLOR.steelLight,
      );
    }
  }
}

function buildTailFins(cloud) {
  const { random, point } = cloud;
  const fin = [
    [0.57, -0.70],
    [1.05, -1.02],
    [0.96, -1.36],
    [0.57, -1.47],
  ];

  for (const side of [-1, 1]) {
    for (let i = 0; i < 6200; i += 1) {
      const [y, z] = polygonSample(random, fin);
      const cant = Math.max(0, y - 0.57) * 0.34;
      const x = side * (0.35 + cant) + (random() - 0.5) * 0.022;
      point(x, y, z, random() < 0.25 ? COLOR.skinLight : COLOR.skin, 0.06);
    }

    const finEdge = fin.map(([y, z]) => {
      const x = side * (0.35 + Math.max(0, y - 0.57) * 0.34);
      return [x, y, z];
    });
    finEdge.push(finEdge[0]);
    samplePolyline(cloud, 900, finEdge, 0.007, COLOR.edge);
    sampleLine(
      cloud,
      480,
      [side * 0.43, 0.77, -0.86],
      [side * 0.47, 0.78, -1.35],
      0.006,
      COLOR.panel,
    );

    const ventral = [
      [side * 0.33, -0.82],
      [side * 0.57, -1.22],
      [side * 0.48, -1.42],
      [side * 0.30, -1.15],
    ];
    samplePlanform(
      cloud,
      1500,
      ventral,
      () => 0.345,
      0.035,
      COLOR.skinDark,
    );
  }
}

function buildCanopy(cloud) {
  const { random, point } = cloud;
  const z0 = -0.02;
  const z1 = 0.72;

  for (let i = 0; i < 7600; i += 1) {
    const z = lerp(z0, z1, random());
    const t = (z - z0) / (z1 - z0);
    const profile = Math.sin(t * Math.PI);
    const angle = random() * Math.PI;
    const [, , upper] = fuselageAt(z);
    const width = 0.225 * profile;
    const height = 0.145 * profile;
    const x = width * Math.cos(angle);
    const y = upper - 0.010 + height * Math.sin(angle);
    const color = y > upper + height * 0.52 ? COLOR.canopyHigh : COLOR.canopy;
    point(x, y, z, color, 0.08);
  }

  for (const side of [-1, 1]) {
    const edge = [];
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const z = lerp(z0, z1, t);
      const [, , upper] = fuselageAt(z);
      edge.push([side * 0.225 * Math.sin(t * Math.PI), upper - 0.004, z]);
    }
    samplePolyline(cloud, 700, edge, 0.007, COLOR.panel);
  }
  sampleLine(cloud, 520, [0, 0.715, -0.015], [0, 0.705, 0.715], 0.008, COLOR.canopyHigh);
}

function sampleStar(cloud, centerX, centerZ, radius, y) {
  const vertices = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? radius : radius * 0.42;
    vertices.push([centerX + Math.cos(angle) * r, centerZ + Math.sin(angle) * r]);
  }
  const { random, point } = cloud;
  for (let i = 0; i < 650; i += 1) {
    const [x, z] = polygonSample(random, vertices);
    point(x, y, z, COLOR.red, 0.05, 0.001);
  }
}

function buildSurfaceDetails(cloud) {
  for (const side of [-1, 1]) {
    samplePolyline(
      cloud,
      800,
      [
        [side * 0.37, 0.535, 0.26],
        [side * 0.70, 0.480, -0.08],
        [side * 1.04, 0.430, -0.47],
      ],
      0.006,
      COLOR.panel,
    );
    samplePolyline(
      cloud,
      700,
      [
        [side * 0.34, 0.505, -0.55],
        [side * 0.65, 0.465, -0.73],
        [side * 0.88, 0.438, -0.67],
      ],
      0.006,
      COLOR.panel,
    );
    sampleStar(cloud, side * 0.72, -0.48, 0.085, 0.460);
  }

  const bayLines = [
    [[-0.18, 0.342, 0.34], [0.18, 0.342, 0.34]],
    [[0.18, 0.342, 0.34], [0.18, 0.342, -0.46]],
    [[0.18, 0.342, -0.46], [-0.18, 0.342, -0.46]],
    [[-0.18, 0.342, -0.46], [-0.18, 0.342, 0.34]],
  ];
  for (const [a, b] of bayLines) {
    sampleLine(cloud, 360, a, b, 0.006, COLOR.panel);
  }

  sampleLine(cloud, 500, [-0.24, 0.585, 1.07], [0.24, 0.585, 1.07], 0.007, COLOR.panel);
  sampleLine(cloud, 450, [-0.23, 0.698, -0.12], [0.23, 0.698, -0.12], 0.007, COLOR.panel);
}

function buildLights(cloud) {
  for (const side of [-1, 1]) {
    const centerX = side * 0.285;
    sampleDiscXY(cloud, 900, centerX, 0.485, -1.620, 0.112, 0.082, COLOR.flameCore);
    sampleRingXY(cloud, 650, centerX, 0.485, -1.625, 0.135, 0.102, COLOR.flameBlue);
  }

  sampleDiscXY(cloud, 320, -1.105, 0.445, -0.45, 0.018, 0.018, COLOR.red);
  sampleDiscXY(cloud, 320, 1.105, 0.445, -0.45, 0.018, 0.018, COLOR.green);
  sampleDiscXY(cloud, 260, 0, 0.665, -1.52, 0.018, 0.018, COLOR.white);

  for (const side of [-1, 1]) {
    sampleLine(
      cloud,
      240,
      [side * 0.44, 0.575, 0.16],
      [side * 0.49, 0.565, -0.06],
      0.008,
      COLOR.amber,
    );
  }
}

function buildFlames(cloud) {
  const { random, point } = cloud;
  for (const side of [-1, 1]) {
    const centerX = side * 0.285;
    for (let i = 0; i < 3400; i += 1) {
      const t = random();
      const z = lerp(-1.64, -2.22, t);
      const maxRadius = lerp(0.108, 0.020, t);
      const radius = maxRadius * Math.sqrt(random());
      const angle = random() * TAU;
      const color = mixColor(COLOR.flameBlue, COLOR.flameHot, Math.min(1, t * 1.35));
      point(
        centerX + radius * Math.cos(angle),
        0.485 + radius * 0.76 * Math.sin(angle),
        z,
        color,
        0.08,
        0.003,
      );
    }
  }
}

function buildAirflow(cloud) {
  const { random, point } = cloud;

  for (let trail = 0; trail < 520; trail += 1) {
    const angle = random() * TAU;
    const startZ = lerp(-1.34, 1.60, random());
    const surfaceOffset = lerp(0.040, 0.085, random());
    const length = lerp(0.10, 0.26, random());
    const points = 5 + Math.floor(random() * 4);
    const color = random() < 0.22 ? COLOR.flowHigh : COLOR.flow;

    for (let i = 0; i < points; i += 1) {
      const z = startZ - length * i / Math.max(1, points - 1);
      const [halfWidth, lower, upper] = fuselageAt(z);
      const halfHeight = (upper - lower) * 0.5;
      const centerY = (upper + lower) * 0.5;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const x = (halfWidth + surfaceOffset) * Math.sign(cosine) * Math.pow(Math.abs(cosine), 0.82);
      const y = centerY
        + (halfHeight + surfaceOffset * 0.65) * Math.sign(sine) * Math.pow(Math.abs(sine), 1.12);
      point(x, y, z, color, 0.15, 0.002);
    }
  }

  const bodyCount = cloud.positions.length / 3;
  for (const side of [-1, 1]) {
    for (let trail = 0; trail < 260; trail += 1) {
      const startZ = lerp(-2.85, -0.38, random());
      const downstream = Math.min(1, Math.max(0, (-startZ - 0.38) / 2.47));
      const radius = lerp(0.025, 0.28, downstream) * lerp(0.65, 1.0, random());
      const phase = random() * TAU;
      const points = 6 + Math.floor(random() * 4);

      for (let i = 0; i < points; i += 1) {
        const angle = phase + i * 0.13;
        point(
          side * (1.07 + radius * Math.cos(angle)),
          0.445 + radius * Math.sin(angle),
          startZ - i * 0.035,
          i % 3 === 0 ? COLOR.flowHigh : COLOR.flow,
          0.13,
          0.002,
        );
      }
    }
  }

  return { bodyCount };
}

function toFloat32(values) {
  return values instanceof Float32Array ? values : new Float32Array(values);
}

export class J20 extends Item {
  static id = 'j20';
  static displayName = 'J-20 Fighter';
  static autoRotate = false;

  // ── Background ──────────────────────────────

  buildBackground(ctx) {
    return createJ20Background(ctx);
  }

  // ── Model ───────────────────────────────────

  buildModel(ctx) {
    const airframe = createCloud(0x4a323001);
    const canopy = createCloud(0x4a323002);
    const lights = createCloud(0x4a323003);
    const flames = createCloud(0x4a323004);
    const airflow = createCloud(0x4a323005);
    const canards = [-1, 1].map((side, index) => {
      const cloud = createCloud(0x4a323010 + index);
      buildCanard(cloud, side);
      return { cloud, side, hinge: [side * 0.34, 0.57, 0.27] };
    });

    buildFuselage(airframe);
    buildWings(airframe);
    buildIntakes(airframe);
    buildEngines(airframe);
    buildTailFins(airframe);
    buildSurfaceDetails(airframe);
    buildCanopy(canopy);
    buildLights(lights);
    buildFlames(flames);
    const airflowLayout = buildAirflow(airflow);

    const airframePos = toFloat32(airframe.positions);
    const airframeColor = toFloat32(airframe.colors);
    const canopyPos = toFloat32(canopy.positions);
    const canopyColor = toFloat32(canopy.colors);
    const lightPos = toFloat32(lights.positions);
    const lightColor = toFloat32(lights.colors);
    const flamePos = toFloat32(flames.positions);
    const flameBaseColor = toFloat32(flames.colors);
    const airflowPos = toFloat32(airflow.positions);
    const airflowColor = toFloat32(airflow.colors);

    const airframeMesh = ctx.createSplatMesh(
      airframePos, airframeColor, ctx.scatterFrom(airframePos, 4.2, 0.55), 0.0065);
    airframeMesh.renderOrder = 10;

    const canopyMesh = ctx.createSplatMesh(
      canopyPos, canopyColor, ctx.scatterFrom(canopyPos, 4.2, 0.55), 0.0072);
    canopyMesh.renderOrder = 11;

    const canardInstances = canards.map(({ cloud, side, hinge }) => {
      const position = toFloat32(cloud.positions);
      const color = toFloat32(cloud.colors);
      const mesh = ctx.createSplatMesh(
        position, color, ctx.scatterFrom(position, 4.2, 0.55), 0.0067);
      mesh.renderOrder = 10;
      return { mesh, position, color, side, hinge };
    });

    const lightMesh = ctx.createSplatMesh(
      lightPos, lightColor, ctx.scatterFrom(lightPos, 4.2, 0.55), 0.0088);
    lightMesh.renderOrder = 12;
    lightMesh.material.depthWrite = false;

    const flameMesh = ctx.createSplatMesh(
      flamePos, flameBaseColor, ctx.scatterFrom(flamePos, 4.2, 0.55), 0.0082);
    flameMesh.renderOrder = 12;
    flameMesh.material.depthWrite = false;

    const airflowMesh = ctx.createSplatMesh(
      airflowPos, airflowColor, ctx.scatterFrom(airflowPos, 4.8, 0.55), 0.0060);
    airflowMesh.renderOrder = 8;
    airflowMesh.material.depthWrite = false;

    // Store instance state
    this._sf = ctx.scatterFrom;
    this._airframeMesh = airframeMesh;
    this._canopyMesh = canopyMesh;
    this._canardInstances = canardInstances;
    this._lightMesh = lightMesh;
    this._flameMesh = flameMesh;
    this._airflowMesh = airflowMesh;
    this._airframePos = airframePos;
    this._airframeColor = airframeColor;
    this._canopyPos = canopyPos;
    this._canopyColor = canopyColor;
    this._lightPos = lightPos;
    this._lightColor = lightColor;
    this._flamePos = flamePos;
    this._flameBaseColor = flameBaseColor;
    this._airflowPos = airflowPos;
    this._airflowColor = airflowColor;
    this._airflowLayout = airflowLayout;
    this._flameTravel = 0;
    this._airflowTravel = 0;

    return {
      meshes: [
        airframeMesh,
        ...canardInstances.map(({ mesh }) => mesh),
        canopyMesh,
        lightMesh,
        flameMesh,
        airflowMesh,
      ],
      lights: [],
    };
  }

  // ── Lifecycle ───────────────────────────────

  onBeforeGather() {
    this._resetMesh(this._airframeMesh, this._airframePos, this._airframeColor);
    for (const canard of this._canardInstances) {
      this._resetMesh(canard.mesh, canard.position, canard.color);
    }
    this._resetMesh(this._canopyMesh, this._canopyPos, this._canopyColor);
    this._resetMesh(this._lightMesh, this._lightPos, this._lightColor);
    this._resetMesh(this._flameMesh, this._flamePos, this._flameBaseColor);
    this._resetMesh(this._airflowMesh, this._airflowPos, this._airflowColor);
    this._flameTravel = 0;
    this._airflowTravel = 0;
  }

  animate(time, dt) {
    const maneuver = this._maneuverAt(time);
    const roll = Math.sin(time * 0.46) * 0.045 + maneuver.direction * maneuver.amount * 0.16;
    const pitch = Math.sin(time * 0.31 + 0.7) * 0.020 + maneuver.amount * 0.055;
    const yaw = Math.sin(time * 0.22) * 0.018;
    const bob = Math.sin(time * 0.72) * 0.035 + maneuver.amount * 0.035;
    const lateral = maneuver.direction * maneuver.amount * 0.055;
    for (const mesh of this.meshes) {
      mesh.position.set(lateral, bob, 0);
      mesh.rotation.set(pitch, yaw, roll);
    }

    const canardAngle = maneuver.amount * -0.018;
    this._updateCanard(this._canardInstances[0], canardAngle);
    this._updateCanard(this._canardInstances[1], canardAngle);
    this._updateFlames(dt);
    this._updateAirflow(time, dt);
  }

  reset() {
    this._flameTravel = 0;
    this._airflowTravel = 0;
    for (const canard of this._canardInstances) {
      canard.mesh.geometry.attributes.position.array.set(canard.position);
      canard.mesh.geometry.attributes.position.needsUpdate = true;
    }
    this._flameMesh.geometry.attributes.position.array.set(this._flamePos);
    this._flameMesh.geometry.attributes.position.needsUpdate = true;
    this._flameMesh.geometry.attributes.color.array.set(this._flameBaseColor);
    this._flameMesh.geometry.attributes.color.needsUpdate = true;
    this._airflowMesh.geometry.attributes.position.array.set(this._airflowPos);
    this._airflowMesh.geometry.attributes.position.needsUpdate = true;
    for (const mesh of this.meshes) {
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
    }
  }

  // ── Internal helpers ────────────────────────

  _resetMesh(mesh, position, color) {
    mesh.geometry.attributes.position.array.set(position);
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.attributes.scatterPos.array.set(this._sf(position, 4.2, 0.55));
    mesh.geometry.attributes.scatterPos.needsUpdate = true;
    mesh.geometry.attributes.color.array.set(color);
    mesh.geometry.attributes.color.needsUpdate = true;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
  }

  _updateCanard(instance, angle) {
    const positions = instance.mesh.geometry.attributes.position.array;
    const [, hingeY, hingeZ] = instance.hinge;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    for (let i = 0; i < positions.length; i += 3) {
      const dy = instance.position[i + 1] - hingeY;
      const dz = instance.position[i + 2] - hingeZ;
      positions[i] = instance.position[i];
      positions[i + 1] = hingeY + dy * cosine - dz * sine;
      positions[i + 2] = hingeZ + dy * sine + dz * cosine;
    }
    instance.mesh.geometry.attributes.position.needsUpdate = true;
  }

  _updateFlames(dt) {
    this._flameTravel = (this._flameTravel + dt * 1.18) % 1;
    const positions = this._flameMesh.geometry.attributes.position.array;
    const colors = this._flameMesh.geometry.attributes.color.array;

    for (let i = 0; i < positions.length; i += 3) {
      const centerX = this._flamePos[i] < 0 ? -0.285 : 0.285;
      const originalT = Math.min(1, Math.max(0, (-1.64 - this._flamePos[i + 2]) / 0.58));
      const t = (originalT + this._flameTravel) % 1;
      const originalMaxRadius = lerp(0.108, 0.020, originalT);
      const dx = this._flamePos[i] - centerX;
      const dy = (this._flamePos[i + 1] - 0.485) / 0.76;
      const radiusRatio = Math.min(1, Math.hypot(dx, dy) / Math.max(0.001, originalMaxRadius));
      const angle = Math.atan2(dy, dx);
      const radius = lerp(0.108, 0.020, t) * radiusRatio;
      positions[i] = centerX + radius * Math.cos(angle);
      positions[i + 1] = 0.485 + radius * 0.76 * Math.sin(angle);
      positions[i + 2] = lerp(-1.64, -2.22, t);

      const color = mixColor(COLOR.flameBlue, COLOR.flameHot, Math.min(1, t * 1.35));
      const shock = 0.76 + 0.24 * (0.5 + 0.5 * Math.cos(t * Math.PI * 10));
      const particle = i / 3;
      const identity = 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(particle * 12.9898));
      colors[i] = Math.min(1, color[0] * shock * identity);
      colors[i + 1] = Math.min(1, color[1] * shock * identity);
      colors[i + 2] = Math.min(1, color[2] * shock * identity);
    }
    this._flameMesh.geometry.attributes.position.needsUpdate = true;
    this._flameMesh.geometry.attributes.color.needsUpdate = true;
  }

  _updateAirflow(time, dt) {
    this._airflowTravel = (this._airflowTravel + dt * 0.72) % 5.3;
    const positions = this._airflowMesh.geometry.attributes.position.array;
    const bodyLimit = this._airflowLayout.bodyCount * 3;

    for (let i = 0; i < bodyLimit; i += 3) {
      const shiftedZ = this._airflowPos[i + 2] - this._airflowTravel;
      const z = ((shiftedZ + 1.62) % 3.24 + 3.24) % 3.24 - 1.62;
      const [baseWidth, baseLower, baseUpper] = fuselageAt(this._airflowPos[i + 2]);
      const baseHalfHeight = (baseUpper - baseLower) * 0.5;
      const baseCenterY = (baseUpper + baseLower) * 0.5;
      const normalizedX = this._airflowPos[i] / Math.max(0.035, baseWidth);
      const normalizedY = (this._airflowPos[i + 1] - baseCenterY) / Math.max(0.035, baseHalfHeight);
      const angle = Math.atan2(normalizedY, normalizedX);
      const surfaceOffset = 0.052 + 0.025 * (0.5 + 0.5 * Math.sin(i * 0.019));
      const [halfWidth, lower, upper] = fuselageAt(z);
      const halfHeight = (upper - lower) * 0.5;
      const centerY = (upper + lower) * 0.5;
      const wakeTwist = Math.max(0, -z - 1.10) * 0.10;
      const flowAngle = angle + wakeTwist + Math.sin(time * 0.45 + i * 0.003) * 0.004;
      const cosine = Math.cos(flowAngle);
      const sine = Math.sin(flowAngle);
      positions[i] = (halfWidth + surfaceOffset)
        * Math.sign(cosine) * Math.pow(Math.abs(cosine), 0.82);
      positions[i + 1] = centerY
        + (halfHeight + surfaceOffset * 0.65)
        * Math.sign(sine) * Math.pow(Math.abs(sine), 1.12);
      positions[i + 2] = z;
    }

    for (let i = bodyLimit; i < positions.length; i += 3) {
      const side = this._airflowPos[i] < 0 ? -1 : 1;
      const baseDx = Math.abs(this._airflowPos[i]) - 1.07;
      const baseDy = this._airflowPos[i + 1] - 0.445;
      const baseRadius = Math.hypot(baseDx, baseDy);
      const baseAngle = Math.atan2(baseDy, baseDx);
      const originalDistance = Math.max(0, -this._airflowPos[i + 2] - 0.38);
      const distance = (originalDistance + this._airflowTravel * 0.78) % 2.52;
      const downstream = distance / 2.52;
      const originalDownstream = Math.min(1, originalDistance / 2.52);
      const originalMaxRadius = lerp(0.025, 0.28, originalDownstream);
      const radiusScale = baseRadius / Math.max(0.001, originalMaxRadius);
      const radius = lerp(0.025, 0.30, downstream) * radiusScale;
      const angle = baseAngle + this._airflowTravel * 3.8 + downstream * TAU * 1.4;
      positions[i] = side * (1.07 + radius * Math.cos(angle));
      positions[i + 1] = 0.445 + radius * Math.sin(angle);
      positions[i + 2] = -0.38 - distance;
    }
    this._airflowMesh.geometry.attributes.position.needsUpdate = true;

    const drift = Math.sin(time * 0.55) * 0.002;
    this._airflowMesh.position.x += drift;
  }

  _maneuverAt(time) {
    const cycleDuration = 10.5;
    const eventStart = 6.1;
    const eventDuration = 2.4;
    const cycle = Math.floor(time / cycleDuration);
    const localTime = time % cycleDuration;
    if (localTime < eventStart || localTime > eventStart + eventDuration) {
      return { amount: 0, direction: cycle % 2 === 0 ? 1 : -1 };
    }
    const progress = (localTime - eventStart) / eventDuration;
    return {
      amount: Math.sin(progress * Math.PI),
      direction: cycle % 2 === 0 ? 1 : -1,
    };
  }
}

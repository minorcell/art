// Xiaomi SU7 Max in Gulf Blue. The model is built as a deterministic point
// cloud, with X as width, Y as height, Z as length, and the nose facing +Z.

const COLOR = {
  body:       [0.035, 0.42, 0.66],
  bodyLight:  [0.12, 0.60, 0.82],
  bodyShade:  [0.018, 0.24, 0.40],
  glass:      [0.025, 0.055, 0.080],
  glassLight: [0.070, 0.13, 0.17],
  black:      [0.018, 0.022, 0.028],
  trim:       [0.34, 0.38, 0.42],
  silver:     [0.68, 0.72, 0.74],
  tire:       [0.016, 0.018, 0.021],
  wheel:      [0.32, 0.35, 0.38],
  wheelDark:  [0.075, 0.085, 0.095],
  rotor:      [0.29, 0.31, 0.33],
  caliper:    [0.92, 0.17, 0.055],
  white:      [0.80, 0.92, 1.00],
  red:        [1.00, 0.035, 0.018],
  amber:      [1.00, 0.46, 0.035],
  shadow:     [0.004, 0.009, 0.014],
};

const BODY_PROFILE = [
  // z,     half width, sill, shoulder, crown
  [-1.75,   0.48,       0.18, 0.48,     0.54],
  [-1.65,   0.62,       0.14, 0.55,     0.61],
  [-1.30,   0.67,       0.13, 0.59,     0.65],
  [-0.85,   0.69,       0.13, 0.61,     0.67],
  [ 0.00,   0.68,       0.13, 0.61,     0.67],
  [ 0.72,   0.68,       0.13, 0.60,     0.66],
  [ 1.22,   0.67,       0.14, 0.57,     0.64],
  [ 1.58,   0.61,       0.16, 0.49,     0.56],
  [ 1.75,   0.43,       0.22, 0.38,     0.43],
];

const CABIN_PROFILE = [
  // z,     half width, beltline, roof center
  [-1.02,   0.34,       0.635,    0.66],
  [-0.78,   0.44,       0.650,    0.82],
  [-0.48,   0.49,       0.660,    0.93],
  [-0.12,   0.51,       0.665,    0.97],
  [ 0.18,   0.51,       0.665,    0.965],
  [ 0.42,   0.49,       0.660,    0.92],
  [ 0.78,   0.41,       0.645,    0.67],
];

const AXLES = [-1.05, 1.03];
const WHEEL_Y = 0.27;
const TAU = Math.PI * 2;

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function profileAt(keys, z) {
  if (z <= keys[0][0]) return keys[0].slice(1);
  if (z >= keys[keys.length - 1][0]) return keys[keys.length - 1].slice(1);

  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (z < a[0] || z > b[0]) continue;
    let t = (z - a[0]) / (b[0] - a[0]);
    t = t * t * (3 - 2 * t);
    return a.slice(1).map((value, index) => lerp(value, b[index + 1], t));
  }
  return keys[keys.length - 1].slice(1);
}

function bodyAt(z) {
  return profileAt(BODY_PROFILE, z);
}

function bodyTopY(x, z) {
  const [halfWidth, , shoulder, crown] = bodyAt(z);
  const ratio = Math.min(1, Math.abs(x) / (halfWidth * 0.94));
  return shoulder + (crown - shoulder) * (1 - ratio * ratio);
}

function cabinAt(z) {
  return profileAt(CABIN_PROFILE, z);
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

function sampleEllipsePanel(cloud, count, center, radius, color, variation = 0.04) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const distance = Math.sqrt(random());
    const angle = random() * TAU;
    point(
      center[0] + radius[0] * distance * Math.cos(angle),
      center[1] + radius[1] * distance * Math.sin(angle),
      center[2],
      color,
      variation,
    );
  }
}

function sampleEllipseRing(cloud, count, center, radius, color, start = 0, end = TAU) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const angle = lerp(start, end, random());
    point(
      center[0] + radius[0] * Math.cos(angle),
      center[1] + radius[1] * Math.sin(angle),
      center[2],
      color,
      0.025,
      0.004,
    );
  }
}

function sampleDiscYZ(cloud, count, center, radius, color, variation = 0.04) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const distance = Math.sqrt(random());
    const angle = random() * TAU;
    point(
      center[0],
      center[1] + radius[0] * distance * Math.cos(angle),
      center[2] + radius[1] * distance * Math.sin(angle),
      color,
      variation,
    );
  }
}

function sampleRingYZ(cloud, count, center, radius, color) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const angle = random() * TAU;
    point(
      center[0],
      center[1] + radius[0] * Math.cos(angle),
      center[2] + radius[1] * Math.sin(angle),
      color,
      0.025,
      0.004,
    );
  }
}

function samplePolygonPanel(cloud, count, vertices, color, variation = 0.04) {
  const { random, point } = cloud;
  const center = vertices.reduce(
    (sum, vertex) => [sum[0] + vertex[0], sum[1] + vertex[1], sum[2] + vertex[2]],
    [0, 0, 0],
  ).map((value) => value / vertices.length);

  for (let i = 0; i < count; i += 1) {
    const edgeIndex = Math.floor(random() * vertices.length);
    const a = vertices[edgeIndex];
    const b = vertices[(edgeIndex + 1) % vertices.length];
    const edgeT = random();
    const radial = Math.sqrt(random());
    point(
      lerp(center[0], lerp(a[0], b[0], edgeT), radial),
      lerp(center[1], lerp(a[1], b[1], edgeT), radial),
      lerp(center[2], lerp(a[2], b[2], edgeT), radial),
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

function sampleBodyDisc(cloud, count, centerX, centerZ, radiusX, radiusZ, color, variation = 0.04) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const distance = Math.sqrt(random());
    const angle = random() * TAU;
    const x = centerX + radiusX * distance * Math.cos(angle);
    const z = centerZ + radiusZ * distance * Math.sin(angle);
    point(x, bodyTopY(x, z) + 0.013, z, color, variation, 0.001);
  }
}

function sampleBodyRing(cloud, count, centerX, centerZ, radiusX, radiusZ, color) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const angle = random() * TAU;
    const x = centerX + radiusX * Math.cos(angle);
    const z = centerZ + radiusZ * Math.sin(angle);
    point(x, bodyTopY(x, z) + 0.018, z, color, 0.025, 0.003);
  }
}

function sampleBodyPolygon(cloud, count, vertices, color, variation = 0.04) {
  const { random, point } = cloud;
  const center = vertices.reduce(
    (sum, vertex) => [sum[0] + vertex[0], sum[1] + vertex[1]],
    [0, 0],
  ).map((value) => value / vertices.length);

  for (let i = 0; i < count; i += 1) {
    const edgeIndex = Math.floor(random() * vertices.length);
    const a = vertices[edgeIndex];
    const b = vertices[(edgeIndex + 1) % vertices.length];
    const edgeT = random();
    const radial = Math.sqrt(random());
    const x = lerp(center[0], lerp(a[0], b[0], edgeT), radial);
    const z = lerp(center[1], lerp(a[1], b[1], edgeT), radial);
    point(x, bodyTopY(x, z) + 0.010, z, color, variation, 0.001);
  }
}

function sampleBodyPolyline(cloud, count, vertices, radius, color, variation = 0.03) {
  const { random, point } = cloud;
  for (let i = 0; i < count; i += 1) {
    const segment = Math.floor(random() * (vertices.length - 1));
    const a = vertices[segment];
    const b = vertices[segment + 1];
    const t = random();
    const x = lerp(a[0], b[0], t) + (random() - 0.5) * radius;
    const z = lerp(a[1], b[1], t) + (random() - 0.5) * radius;
    point(x, bodyTopY(x, z) + 0.018, z, color, variation, 0.001);
  }
}

function inWheelOpening(z, y) {
  return AXLES.some((axle) => {
    const dz = (z - axle) / 0.405;
    const dy = (y - WHEEL_Y) / 0.40;
    return dz * dz + dy * dy < 1;
  });
}

function buildBody(cloud) {
  const { random, point } = cloud;

  for (let i = 0; i < 38000; i += 1) {
    const z = lerp(-1.75, 1.75, random());
    const [halfWidth, sill, shoulder, crown] = bodyAt(z);
    const surface = random();

    if (surface < 0.57) {
      const side = random() < 0.5 ? -1 : 1;
      const yRatio = Math.pow(random(), 0.9);
      const y = lerp(sill, shoulder, yRatio);
      if (inWheelOpening(z, y)) continue;
      const sideTuck = 0.020 * Math.pow((y - (sill + shoulder) * 0.5) / (shoulder - sill), 2);
      const x = side * (halfWidth - sideTuck);
      point(x, y, z, yRatio > 0.72 ? COLOR.bodyLight : COLOR.body, 0.07);
    } else if (surface < 0.94) {
      const x = lerp(-halfWidth * 0.94, halfWidth * 0.94, random());
      if (z > -1.00 && z < 0.76) {
        const [cabinWidth] = cabinAt(z);
        if (Math.abs(x) < cabinWidth * 1.02) continue;
      }
      const ratio = Math.abs(x) / (halfWidth * 0.94);
      const y = shoulder + (crown - shoulder) * (1 - ratio * ratio);
      point(x, y, z, COLOR.bodyLight, 0.065);
    } else {
      const x = lerp(-halfWidth * 0.88, halfWidth * 0.88, random());
      point(x, sill, z, COLOR.bodyShade, 0.04);
    }
  }

  for (const z of [-1.748, 1.748]) {
    const [halfWidth, sill, shoulder, crown] = bodyAt(z);
    for (let i = 0; i < 1500; i += 1) {
      const y = lerp(sill, crown, random());
      const upperRatio = Math.max(0, (y - shoulder) / (crown - shoulder));
      const allowedWidth = halfWidth * (upperRatio > 0 ? Math.sqrt(1 - upperRatio) : 1);
      const x = lerp(-allowedWidth, allowedWidth, random());
      point(x, y, z, y > shoulder ? COLOR.bodyLight : COLOR.body, 0.06);
    }
  }

  for (const side of [-1, 1]) {
    for (const axle of AXLES) {
      for (let i = 0; i < 1000; i += 1) {
        const angle = lerp(0.08, Math.PI - 0.08, random());
        const z = axle + 0.405 * Math.cos(angle);
        const y = WHEEL_Y + 0.40 * Math.sin(angle);
        const [halfWidth] = bodyAt(z);
        const offset = (random() - 0.5) * 0.018;
        point(side * (halfWidth + offset), y, z, COLOR.bodyLight, 0.055, 0.002);
        if (i % 3 === 0) {
          point(side * (halfWidth - 0.018), y - 0.012, z, COLOR.black, 0.03, 0.002);
        }
      }
    }
  }
}

function roofY(z, x) {
  const [halfWidth, , roof] = cabinAt(z);
  return roof - 0.055 * Math.pow(x / halfWidth, 2);
}

function buildCabinTransition(cloud) {
  const { random, point } = cloud;

  for (let i = 0; i < 12500; i += 1) {
    const z = lerp(-1.00, 0.76, random());
    const [bodyWidth, , shoulder] = bodyAt(z);
    const [cabinWidth, belt] = cabinAt(z);
    const side = random() < 0.5 ? -1 : 1;
    const t = random();
    const eased = t * t * (3 - 2 * t);
    const x = side * lerp(bodyWidth - 0.008, cabinWidth + 0.006, eased);
    const y = lerp(shoulder - 0.008, belt + 0.010, t) + Math.sin(t * Math.PI) * 0.008;
    point(x, y, z, t > 0.52 ? COLOR.bodyLight : COLOR.body, 0.060, 0.0015);
  }
}

function buildCabin(cloud) {
  const { random, point } = cloud;

  buildCabinTransition(cloud);

  for (let i = 0; i < 14500; i += 1) {
    const z = lerp(-1.02, 0.78, random());
    const [halfWidth, belt, roof] = cabinAt(z);

    if (random() < 0.58) {
      const side = random() < 0.5 ? -1 : 1;
      const edgeTop = roof - 0.055;
      const y = lerp(belt, edgeTop, random());
      const tumblehome = 0.032 * (y - belt) / Math.max(0.01, edgeTop - belt);
      point(side * (halfWidth - tumblehome), y, z, COLOR.glassLight, 0.09);
    } else {
      const x = lerp(-halfWidth * 0.94, halfWidth * 0.94, random());
      point(x, roofY(z, x), z, COLOR.glass, 0.07);
    }
  }

  // The black inner skin prevents the sparse glass layer from revealing body
  // points behind it. It follows the glazing instead of filling the cabin.
  for (let i = 0; i < 10500; i += 1) {
    const z = lerp(-1.00, 0.76, random());
    const [halfWidth, belt, roof] = cabinAt(z);
    const side = random() < 0.5 ? -1 : 1;
    const edgeTop = roof - 0.060;
    const y = lerp(belt + 0.006, edgeTop, random());
    const tumblehome = 0.032 * (y - belt) / Math.max(0.01, edgeTop - belt);
    point(side * (halfWidth - tumblehome - 0.012), y, z, COLOR.black, 0.025, 0.001);
  }

  for (const side of [-1, 1]) {
    const xAt = (z, y) => {
      const [halfWidth, belt, roof] = cabinAt(z);
      return side * (halfWidth - 0.032 * (y - belt) / Math.max(0.01, roof - belt));
    };

    sampleLine(cloud, 950, [xAt(0.73, 0.65), 0.65, 0.74], [xAt(0.39, 0.91), 0.91, 0.39], 0.018, COLOR.black);
    sampleLine(cloud, 850, [xAt(0.05, 0.67), 0.67, 0.05], [xAt(0.05, 0.95), 0.95, 0.05], 0.020, COLOR.black);
    sampleLine(cloud, 900, [xAt(-0.91, 0.64), 0.64, -0.93], [xAt(-0.52, 0.89), 0.89, -0.52], 0.025, COLOR.black);
    sampleLine(cloud, 800, [side * 0.39, 0.642, -0.96], [side * 0.48, 0.657, 0.72], 0.010, COLOR.silver);
    sampleLine(cloud, 650, [side * 0.43, 0.90, -0.53], [side * 0.46, 0.92, 0.34], 0.012, COLOR.black);
  }

  for (let i = 0; i < 4200; i += 1) {
    const z = lerp(-0.46, 0.28, random());
    const [halfWidth] = cabinAt(z);
    const x = lerp(-halfWidth * 0.82, halfWidth * 0.82, random());
    point(x, roofY(z, x) + 0.004, z, COLOR.glass, 0.045);
  }

  sampleEllipsoid(cloud, 650, [0, 0.975, 0.25], [0.090, 0.022, 0.115], COLOR.black, 0.035);
}

function sampleTire(cloud, centerX, centerZ) {
  const { random, point } = cloud;
  const majorRadius = 0.282;
  const minorRadius = 0.064;

  for (let i = 0; i < 2500; i += 1) {
    const around = random() * TAU;
    const section = random() * TAU;
    const radius = majorRadius + minorRadius * Math.cos(section);
    point(
      centerX + minorRadius * Math.sin(section),
      WHEEL_Y + radius * Math.cos(around),
      centerZ + radius * Math.sin(around),
      COLOR.tire,
      0.10,
      0.002,
    );
  }
}

function sampleWheelFace(cloud, stationary, side, centerZ) {
  const { random, point } = cloud;
  const { random: fixedRandom, point: fixedPoint } = stationary;
  const centerX = side * 0.665;
  const faceX = centerX + side * 0.066;

  for (let i = 0; i < 850; i += 1) {
    const radius = Math.sqrt(lerp(0.205 ** 2, 0.248 ** 2, random()));
    const angle = random() * TAU;
    point(faceX, WHEEL_Y + radius * Math.cos(angle), centerZ + radius * Math.sin(angle), COLOR.wheel, 0.10);
  }

  for (let i = 0; i < 520; i += 1) {
    const radius = Math.sqrt(lerp(0.055 ** 2, 0.205 ** 2, fixedRandom()));
    const angle = fixedRandom() * TAU;
    fixedPoint(faceX - side * 0.012, WHEEL_Y + radius * Math.cos(angle), centerZ + radius * Math.sin(angle), COLOR.rotor, 0.08);
  }

  for (let spoke = 0; spoke < 5; spoke += 1) {
    const baseAngle = spoke * TAU / 5 + 0.08;
    for (const branch of [-1, 1]) {
      for (let i = 0; i < 105; i += 1) {
        const t = random();
        const radius = lerp(0.055, 0.218, t);
        const split = branch * 0.12 * Math.max(0, (t - 0.38) / 0.62);
        const angle = baseAngle + split;
        const bladeWidth = lerp(0.028, 0.012, t);
        const lateral = (random() - 0.5) * bladeWidth;
        point(
          faceX + side * 0.004,
          WHEEL_Y + radius * Math.cos(angle) - lateral * Math.sin(angle),
          centerZ + radius * Math.sin(angle) + lateral * Math.cos(angle),
          COLOR.silver,
          0.07,
        );
      }
    }
  }

  sampleDiscYZ(cloud, 300, [faceX + side * 0.006, WHEEL_Y, centerZ], [0.052, 0.052], COLOR.wheelDark, 0.05);
  sampleRingYZ(cloud, 180, [faceX + side * 0.008, WHEEL_Y, centerZ], [0.035, 0.035], COLOR.silver);

  for (let i = 0; i < 320; i += 1) {
    const y = lerp(WHEEL_Y + 0.09, WHEEL_Y + 0.18, fixedRandom());
    const z = centerZ - 0.165 + (fixedRandom() - 0.5) * 0.055;
    fixedPoint(faceX - side * 0.017, y, z, COLOR.caliper, 0.07);
  }
}

function buildWheels(stationary) {
  const wheels = [];
  let index = 0;
  for (const side of [-1, 1]) {
    for (const axle of AXLES) {
      const cloud = createCloud(0x53553710 + index);
      sampleTire(cloud, side * 0.665, axle);
      sampleWheelFace(cloud, stationary, side, axle);
      wheels.push({ cloud, center: [side * 0.665, WHEEL_Y, axle] });
      index += 1;
    }
  }
  return wheels;
}

function frontSurfaceZ(x) {
  return 1.716 - 0.055 * Math.pow(x / 0.68, 2);
}

function buildFront(cloud, lamps) {
  const { random, point } = cloud;

  for (let i = 0; i < 2600; i += 1) {
    const y = lerp(0.18, 0.36, random());
    const halfWidth = lerp(0.48, 0.37, (y - 0.18) / 0.18);
    const x = lerp(-halfWidth, halfWidth, random());
    point(x, y, frontSurfaceZ(x) + 0.007, COLOR.black, 0.05);
  }

  for (const side of [-1, 1]) {
    const housing = [
      [side * 0.255, 1.53],
      [side * 0.420, 1.61],
      [side * 0.595, 1.50],
      [side * 0.610, 1.28],
      [side * 0.505, 1.05],
      [side * 0.330, 1.17],
    ];
    sampleBodyPolygon(cloud, 1750, housing, COLOR.black, 0.035);
    sampleBodyPolyline(
      lamps,
      1250,
      [housing[0], housing[1], housing[2], housing[3], housing[4]],
      0.012,
      COLOR.white,
      0.022,
    );

    sampleBodyDisc(cloud, 460, side * 0.490, 1.34, 0.050, 0.070, COLOR.trim, 0.035);
    sampleBodyRing(lamps, 380, side * 0.490, 1.34, 0.033, 0.048, COLOR.white);
    sampleBodyDisc(cloud, 340, side * 0.365, 1.39, 0.039, 0.056, COLOR.trim, 0.035);
    sampleBodyRing(lamps, 280, side * 0.365, 1.39, 0.025, 0.038, COLOR.white);
    sampleBodyPolyline(
      lamps,
      360,
      [[side * 0.315, 1.22], [side * 0.445, 1.08]],
      0.006,
      COLOR.white,
    );

    for (let i = 0; i < 650; i += 1) {
      const y = lerp(0.22, 0.42, random());
      const width = lerp(0.030, 0.060, (y - 0.22) / 0.20);
      point(side * 0.58 + (random() - 0.5) * width, y, frontSurfaceZ(side * 0.58) + 0.010, COLOR.black, 0.045);
    }
    samplePolyline(
      lamps,
      320,
      [
        [side * 0.615, 0.245, 1.683],
        [side * 0.605, 0.315, 1.688],
        [side * 0.590, 0.385, 1.690],
      ],
      0.008,
      COLOR.amber,
    );
  }

  sampleEllipseRing(cloud, 240, [0, 0.445, 1.724], [0.030, 0.030], COLOR.silver);
  sampleLine(cloud, 950, [-0.53, 0.145, 1.690], [0.53, 0.145, 1.690], 0.014, COLOR.black);
  sampleLine(cloud, 500, [-0.55, 0.125, 1.685], [0.55, 0.125, 1.685], 0.008, COLOR.trim);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 420; i += 1) {
      const z = lerp(0.72, 1.47, random());
      const [, , , crown] = bodyAt(z);
      const x = side * lerp(0.25, 0.18, (z - 0.72) / 0.75) + (random() - 0.5) * 0.012;
      point(x, crown + 0.006, z, COLOR.bodyLight, 0.04);
    }
  }
}

function buildRear(cloud, lamps) {
  const { random, point } = cloud;
  const rearZ = -1.708;

  sampleLine(cloud, 2100, [-0.60, 0.555, rearZ - 0.004], [0.60, 0.555, rearZ - 0.004], 0.036, COLOR.black, 0.025);
  sampleLine(lamps, 2200, [-0.49, 0.558, rearZ], [0.49, 0.558, rearZ], 0.010, COLOR.red, 0.018);
  sampleLine(lamps, 900, [-0.40, 0.567, rearZ + 0.002], [0.40, 0.567, rearZ + 0.002], 0.004, COLOR.white, 0.018);
  for (const side of [-1, 1]) {
    const housing = [
      [side * 0.36, 0.557, rearZ - 0.002],
      [side * 0.50, 0.607, rearZ],
      [side * 0.635, 0.575, rearZ + 0.010],
      [side * 0.625, 0.505, rearZ + 0.012],
      [side * 0.505, 0.487, rearZ + 0.004],
      [side * 0.405, 0.520, rearZ],
    ];
    samplePolygonPanel(cloud, 950, housing, COLOR.black, 0.025);
    samplePolyline(
      lamps,
      980,
      [housing[0], housing[1], housing[2], housing[3], housing[4], housing[5]],
      0.009,
      COLOR.red,
      0.020,
    );
    sampleLine(
      lamps,
      240,
      [side * 0.535, 0.508, rearZ + 0.010],
      [side * 0.615, 0.523, rearZ + 0.014],
      0.005,
      COLOR.amber,
    );
  }

  for (let i = 0; i < 2100; i += 1) {
    const y = lerp(0.12, 0.31, random());
    const halfWidth = lerp(0.55, 0.39, (y - 0.12) / 0.19);
    point(lerp(-halfWidth, halfWidth, random()), y, rearZ, COLOR.black, 0.045);
  }

  for (let i = 0; i < 600; i += 1) {
    point(lerp(-0.18, 0.18, random()), lerp(0.31, 0.39, random()), rearZ - 0.004, COLOR.black, 0.035);
  }

  sampleLine(cloud, 780, [-0.58, 0.095, -1.69], [0.58, 0.095, -1.69], 0.018, COLOR.trim);
  sampleLine(cloud, 450, [-0.55, 0.64, -1.56], [0.55, 0.64, -1.56], 0.015, COLOR.bodyLight);
  sampleLine(cloud, 320, [-0.075, 0.46, rearZ - 0.006], [0.075, 0.46, rearZ - 0.006], 0.010, COLOR.silver);
}

function buildMirror(cloud, lamps, side) {
  sampleLine(
    cloud,
    620,
    [side * 0.50, 0.655, 0.43],
    [side * 0.68, 0.700, 0.47],
    0.025,
    COLOR.black,
    0.035,
  );
  sampleLine(
    cloud,
    420,
    [side * 0.53, 0.674, 0.44],
    [side * 0.69, 0.714, 0.48],
    0.017,
    COLOR.body,
    0.055,
  );

  sampleEllipsoid(
    cloud,
    1850,
    [side * 0.765, 0.725, 0.49],
    [0.135, 0.058, 0.108],
    COLOR.body,
    0.065,
  );
  sampleDiscYZ(
    cloud,
    780,
    [side * 0.892, 0.724, 0.475],
    [0.043, 0.074],
    COLOR.glass,
    0.035,
  );
  sampleRingYZ(
    cloud,
    360,
    [side * 0.894, 0.724, 0.475],
    [0.049, 0.082],
    COLOR.black,
  );

  samplePolyline(
    lamps,
    440,
    [
      [side * 0.700, 0.728, 0.568],
      [side * 0.765, 0.739, 0.590],
      [side * 0.835, 0.727, 0.565],
    ],
    0.007,
    COLOR.amber,
  );
}

function buildSideDetails(cloud, lamps) {
  const { random, point } = cloud;

  for (const side of [-1, 1]) {
    for (const seamZ of [-0.52, 0.12, 0.64]) {
      for (let i = 0; i < 420; i += 1) {
        const y = lerp(0.22, 0.61, random());
        if (inWheelOpening(seamZ, y)) continue;
        const [halfWidth] = bodyAt(seamZ);
        point(side * (halfWidth + 0.004), y, seamZ, COLOR.black, 0.02, 0.004);
      }
    }

    for (const handleZ of [-0.43, 0.29]) {
      const [halfWidth] = bodyAt(handleZ);
      sampleLine(
        cloud,
        260,
        [side * (halfWidth + 0.009), 0.535, handleZ - 0.070],
        [side * (halfWidth + 0.009), 0.535, handleZ + 0.070],
        0.012,
        COLOR.trim,
      );
    }

    sampleLine(cloud, 850, [side * 0.675, 0.155, -0.62], [side * 0.675, 0.155, 0.64], 0.018, COLOR.black);

    buildMirror(cloud, lamps, side);

    for (let i = 0; i < 750; i += 1) {
      const z = lerp(-0.72, 1.30, random());
      const [halfWidth, , shoulder] = bodyAt(z);
      point(side * (halfWidth + 0.004), shoulder - 0.015, z, COLOR.bodyLight, 0.04, 0.003);
    }
  }

  sampleRingYZ(cloud, 420, [-0.690, 0.47, -0.78], [0.065, 0.090], COLOR.bodyShade);
}

function buildUnderbody(cloud) {
  const { random, point } = cloud;

  for (let i = 0; i < 5200; i += 1) {
    const angle = random() * TAU;
    const radius = Math.sqrt(random());
    point(
      0.64 * radius * Math.cos(angle),
      -0.078 + random() * 0.005,
      1.57 * radius * Math.sin(angle),
      COLOR.shadow,
      0.18,
      0.004,
    );
  }

  for (let i = 0; i < 1300; i += 1) {
    point(lerp(-0.54, 0.54, random()), 0.105, lerp(-1.30, 1.33, random()), COLOR.black, 0.04);
  }
}

function buildWind(cloud) {
  const { random, point } = cloud;
  for (let trail = 0; trail < 360; trail += 1) {
    const side = random() < 0.5 ? -1 : 1;
    const x = side * lerp(0.72, 1.85, Math.pow(random(), 0.75));
    const y = lerp(-0.02, 1.42, random());
    const startZ = lerp(-3.8, 3.8, random());
    const length = lerp(0.10, 0.42, random());
    const points = 5 + Math.floor(random() * 5);
    const color = random() < 0.22 ? COLOR.white : COLOR.bodyLight;

    for (let i = 0; i < points; i += 1) {
      const t = i / Math.max(1, points - 1);
      point(
        x + (random() - 0.5) * 0.012,
        y + (random() - 0.5) * 0.012,
        startZ - length * t,
        color,
        0.18,
        0.002,
      );
    }
  }
}

function toFloat32(values) {
  return values instanceof Float32Array ? values : new Float32Array(values);
}

function localize(values, center) {
  const local = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 3) {
    local[i] = values[i] - center[0];
    local[i + 1] = values[i + 1] - center[1];
    local[i + 2] = values[i + 2] - center[2];
  }
  return local;
}

export default {
  id: 'su7',
  name: 'Xiaomi SU7',

  generate(ctx) {
    const solid = createCloud(0x53553701);
    const lamps = createCloud(0x53553702);
    const wind = createCloud(0x53553703);

    buildBody(solid);
    buildCabin(solid);
    const wheels = buildWheels(solid);
    buildFront(solid, lamps);
    buildRear(solid, lamps);
    buildSideDetails(solid, lamps);
    buildUnderbody(solid);
    buildWind(wind);

    const solidPos = toFloat32(solid.positions);
    const solidColor = toFloat32(solid.colors);
    const lampPos = toFloat32(lamps.positions);
    const lampColor = toFloat32(lamps.colors);
    const windPos = toFloat32(wind.positions);
    const windBaseColor = toFloat32(wind.colors);
    const windDimColor = new Float32Array(windBaseColor.length);
    for (let i = 0; i < windDimColor.length; i += 1) {
      windDimColor[i] = windBaseColor[i] * 0.025;
    }

    const solidMesh = ctx.createSplatMesh(
      solidPos,
      solidColor,
      ctx.scatterFrom(solidPos, 4.0, 0.45),
      0.0068,
    );
    solidMesh.renderOrder = 10;

    const wheelInstances = wheels.map(({ cloud, center }) => {
      const position = localize(toFloat32(cloud.positions), center);
      const color = toFloat32(cloud.colors);
      const mesh = ctx.createSplatMesh(
        position,
        color,
        ctx.scatterFrom(position, 2.2, 0),
        0.0072,
      );
      mesh.position.set(center[0], center[1], center[2]);
      mesh.renderOrder = 10;
      return { mesh, position, color, center };
    });

    const lampMesh = ctx.createSplatMesh(
      lampPos,
      lampColor,
      ctx.scatterFrom(lampPos, 4.0, 0.45),
      0.009,
    );
    lampMesh.renderOrder = 11;
    lampMesh.material.depthWrite = false;

    const windMesh = ctx.createSplatMesh(
      windPos,
      windDimColor,
      ctx.scatterFrom(windPos, 4.5, 0.55),
      0.0058,
    );
    windMesh.renderOrder = 8;
    windMesh.material.depthWrite = false;

    const baseLampColor = new Float32Array(lampColor);
    const carMeshes = [solidMesh, ...wheelInstances.map(({ mesh }) => mesh), lampMesh];
    let lastPulse = -1;
    let wheelAngle = 0;
    let windTravel = 0;
    let currentTime = 0;
    let cycleOrigin = 0;

    function resetMesh(mesh, position, color, center = [0, 0, 0], scatterRadius = 4.0, scatterY = 0.45) {
      mesh.geometry.attributes.position.array.set(position);
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.attributes.scatterPos.array.set(ctx.scatterFrom(position, scatterRadius, scatterY));
      mesh.geometry.attributes.scatterPos.needsUpdate = true;
      mesh.geometry.attributes.color.array.set(color);
      mesh.geometry.attributes.color.needsUpdate = true;
      mesh.position.set(center[0], center[1], center[2]);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
    }

    function motionAt(time) {
      const accelerateDuration = 10.0;
      const scatterDuration = 2.0;
      const gatherDuration = 1.8;
      const cycleDuration = accelerateDuration + scatterDuration + gatherDuration;
      const cycleTime = time % cycleDuration;

      if (cycleTime < accelerateDuration) {
        const t = cycleTime / accelerateDuration;
        return { speed: t * t, assembly: 1 };
      }
      if (cycleTime < accelerateDuration + scatterDuration) {
        const t = (cycleTime - accelerateDuration) / scatterDuration;
        return { speed: 1, assembly: 1 - t * t * t };
      }

      const t = (cycleTime - accelerateDuration - scatterDuration) / gatherDuration;
      const eased = 1 - Math.pow(1 - t, 3);
      return { speed: 1 - eased, assembly: eased };
    }

    function updateWind(time, dt, speed) {
      windTravel = (windTravel + dt * (0.08 + speed * 6.8)) % 7.6;
      const positions = windMesh.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        const shiftedZ = windPos[i + 2] - windTravel;
        positions[i] = windPos[i] + Math.sin(time * 3.2 + i * 0.017) * speed * 0.008;
        positions[i + 1] = windPos[i + 1];
        positions[i + 2] = ((shiftedZ + 3.8) % 7.6 + 7.6) % 7.6 - 3.8;
      }
      windMesh.geometry.attributes.position.needsUpdate = true;
    }

    return {
      meshes: [...carMeshes, windMesh],
      lights: [],

      onBeforeGather() {
        resetMesh(solidMesh, solidPos, solidColor);
        for (const wheel of wheelInstances) {
          resetMesh(wheel.mesh, wheel.position, wheel.color, wheel.center, 2.2, 0);
        }
        resetMesh(lampMesh, lampPos, baseLampColor);
        resetMesh(windMesh, windPos, windDimColor, [0, 0, 0], 4.5, 0.55);
        lastPulse = -1;
        wheelAngle = 0;
        windTravel = 0;
        currentTime = 0;
        cycleOrigin = 0;
      },

      onGathered() {},

      animate(time, dt) {
        currentTime = time;
        const motion = motionAt(Math.max(0, time - cycleOrigin));
        wheelAngle += dt * (0.35 + motion.speed * 13.5);
        for (const wheel of wheelInstances) {
          wheel.mesh.rotation.x = wheelAngle;
        }
        for (const mesh of carMeshes) {
          mesh.material.uniforms.uProgress.value = motion.assembly;
        }
        updateWind(time, dt, motion.speed);

        const pulse = Math.floor(time * 20);
        if (pulse === lastPulse) return;
        lastPulse = pulse;
        const factor = 0.91 + Math.sin(time * 2.2) * 0.09;
        const colors = lampMesh.geometry.attributes.color.array;
        for (let i = 0; i < colors.length; i += 1) {
          colors[i] = Math.min(1, baseLampColor[i] * factor);
        }
        lampMesh.geometry.attributes.color.needsUpdate = true;

        const windColors = windMesh.geometry.attributes.color.array;
        const windFactor = 0.025 + motion.speed * (0.72 + Math.sin(time * 7.0) * 0.08);
        for (let i = 0; i < windColors.length; i += 1) {
          windColors[i] = Math.min(1, windBaseColor[i] * windFactor);
        }
        windMesh.geometry.attributes.color.needsUpdate = true;
      },

      onScatterStart() {},

      reset() {
        cycleOrigin = currentTime;
        wheelAngle = 0;
        windTravel = 0;
        solidMesh.position.set(0, 0, 0);
        solidMesh.rotation.set(0, 0, 0);
        solidMesh.scale.set(1, 1, 1);
        for (const wheel of wheelInstances) {
          wheel.mesh.position.set(wheel.center[0], wheel.center[1], wheel.center[2]);
          wheel.mesh.rotation.set(0, 0, 0);
          wheel.mesh.scale.set(1, 1, 1);
        }
        lampMesh.position.set(0, 0, 0);
        lampMesh.rotation.set(0, 0, 0);
        lampMesh.scale.set(1, 1, 1);
        windMesh.geometry.attributes.position.array.set(windPos);
        windMesh.geometry.attributes.position.needsUpdate = true;
        windMesh.geometry.attributes.color.array.set(windDimColor);
        windMesh.geometry.attributes.color.needsUpdate = true;
        for (const mesh of carMeshes) {
          mesh.material.uniforms.uProgress.value = 1;
        }
      },
    };
  },
};

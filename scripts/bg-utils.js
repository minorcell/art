// Shared utilities for procedural background generation using Gaussian splats.

export function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function pushPoint(positions, colors, x, y, z, color, jitter, random) {
  const amount = jitter || 0;
  positions.push(
    x + (random() - 0.5) * amount,
    y + (random() - 0.5) * amount,
    z + (random() - 0.5) * amount,
  );
  colors.push(color[0], color[1], color[2]);
}

export function addCloud(positions, colors, random, center, radius, count, dark, light) {
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const elevation = random() * 2 - 1;
    const ring = Math.sqrt(Math.max(0, 1 - elevation * elevation));
    const distance = Math.pow(random(), 0.38);
    const color = mix(dark, light, 0.18 + random() * 0.62);
    pushPoint(
      positions,
      colors,
      center[0] + Math.cos(angle) * ring * radius[0] * distance,
      center[1] + elevation * radius[1] * distance,
      center[2] + Math.sin(angle) * ring * radius[2] * distance,
      color,
      0.018,
      random,
    );
  }
}

export function addCaveBlock(positions, colors, random, center, size, count, base, highlight) {
  for (let i = 0; i < count; i += 1) {
    const face = Math.floor(random() * 6);
    const u = random() * 2 - 1;
    const v = random() * 2 - 1;
    const x = face < 2 ? center[0] + (face === 0 ? -size[0] : size[0]) : center[0] + u * size[0];
    const y = face < 4 ? center[1] + v * size[1] : center[1] + (face === 4 ? size[1] : -size[1]);
    const z = face < 2 ? center[2] + u * size[2] : center[2] + (face < 4 ? (face === 2 ? size[2] : -size[2]) : v * size[2]);
    pushPoint(positions, colors, x, y, z, mix(base, highlight, random() * 0.5), 0.012, random);
  }
}

export function makeBackground(ctx, positions, colors, options = {}) {
  const finalPos = new Float32Array(positions);
  const finalColor = new Float32Array(colors);
  const mesh = ctx.createSplatMesh(
    finalPos,
    finalColor,
    ctx.scatterFrom(finalPos, options.scatterRadius || 0.8, options.centerY || 0.5),
    options.pointSize || 0.018,
  );
  mesh.renderOrder = -100;
  mesh.frustumCulled = false;
  mesh.material.depthWrite = false;
  mesh.material.depthTest = false;

  const repeat = options.repeat || 1;
  const repeatDistance = options.repeatDistance || 0;
  const meshes = [mesh];
  for (let i = 1; i < repeat; i += 1) {
    const copy = mesh.clone();
    copy.position.z = (i - Math.floor(repeat / 2)) * repeatDistance;
    copy.frustumCulled = false;
    meshes.push(copy);
  }

  function resetTransforms() {
    meshes.forEach((item, index) => {
      item.position.set(0, 0, repeatDistance ? (index - Math.floor(repeat / 2)) * repeatDistance : 0);
      item.rotation.set(0, 0, 0);
    });
  }

  const animate = options.animate || null;
  return {
    meshes,
    lights: [],
    onBeforeGather() {
      resetTransforms();
      if (options.prepare) options.prepare();
      if (options.resetAll) options.resetAll();
    },
    animate: (animate || options.animateAll)
      ? (time, dt) => {
        if (options.animateAll) options.animateAll(meshes, time, dt);
        else animate(mesh, time, dt);
      }
      : undefined,
    reset() {
      resetTransforms();
      if (options.resetAll) options.resetAll();
    },
  };
}

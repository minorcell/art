// Klein bottle — exact parametrization from Three.js ParametricGeometry.
// Sample densely and convert to Gaussian splat point cloud.

function kleinPoint(u, v) {
  // u, v both in [0, 2π] — directly as used inside the Three.js function
  // (after the internal mapping: param_u→u*π→u*2, param_v→v*2π)

  const cu = Math.cos(u);
  const su = Math.sin(u);
  const cv = Math.cos(v);
  const sv = Math.sin(v);

  // Body offset — makes one side bulge (the "body")
  const body = 3 * cu * (1 + su);

  // Cross-section radius
  const R = 2 * (1 - cu / 2);

  let x, z;

  if (u < Math.PI) {
    x = body + R * cu * cv;
    z = -8 * su - R * su * cv;
  } else {
    x = body + R * Math.cos(v + Math.PI);
    z = -8 * su;
  }

  const y = -R * sv;

  return [x, y, z];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60)      { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [r + m, g + m, b + m];
}

export default {
  id: 'klein',
  name: 'Klein Bottle',

  generate(ctx) {
    const THREE = ctx.THREE;
    console.time('Klein');

    const NU = 520;
    const NV = 450;
    const P = [], C = [];

    for (let i = 0; i < NU; i++) {
      const u = ((i + Math.random()) / NU) * Math.PI * 2;

      for (let j = 0; j < NV; j++) {
        const v = ((j + Math.random()) / NV) * Math.PI * 2;

        let [x, y, z] = kleinPoint(u, v);

        // Scale down to match rose size (~3-4 units)
        x *= 0.30; y *= 0.30; z *= 0.30;

        // Rotate -90° around X: stand the bottle upright (long axis Z → Y)
        const ty = z;        // Z becomes vertical
        const tz = -y;       // Y becomes depth
        y = ty + 0.8; z = tz;

        // Subtle noise for Gaussian texture
        const n = 0.005;
        x += (Math.random() - 0.5) * n;
        y += (Math.random() - 0.5) * n;
        z += (Math.random() - 0.5) * n;

        P.push(x, y, z);

        // Cool palette: blue at bottom → purple at top, hue varies with u
        const hue = 215 + (u / (Math.PI * 2)) * 50 + (y + 5) * 3;
        const sat = 0.55 + 0.35 * Math.sin(v);
        const light = 0.24 + 0.30 * ((y + 6) / 12);
        const [r, g, b] = hslToRgb(hue, sat, Math.min(0.82, light));
        C.push(r, g, b);
      }
    }

    const n = P.length / 3;
    const scat = ctx.scatterFrom(P, 3.0, 0.0);
    const mesh = ctx.createSplatMesh(P, C, scat, 0.014);
    mesh.renderOrder = 10;

    const amb = new THREE.AmbientLight(0x1a1a3a, 2.2);
    const key = new THREE.DirectionalLight(0xccddff, 5); key.position.set(4, 5, 4);
    const fil = new THREE.DirectionalLight(0x4466aa, 2); fil.position.set(-3, -2, -3);
    const rim = new THREE.DirectionalLight(0x6688cc, 2.5); rim.position.set(0, -1, 4);

    const inst = {
      meshes: [mesh],
      lights: [amb, key, fil, rim],
      onBeforeGather() { mesh.rotation.y = 0; mesh.scale.set(1, 1, 1); },
      onGathered()      { mesh.rotation.y = 0; mesh.scale.set(1, 1, 1); },
      animate(t, dt)    { mesh.rotation.y += dt * 0.12; const s = 1 + Math.sin(t * 0.4) * 0.025; mesh.scale.set(s, s, s); },
      onScatterStart() {},
      reset()           { mesh.rotation.y = 0; mesh.scale.set(1, 1, 1); },
    };

    console.timeEnd('Klein');
    console.log(`Klein splats: ${n.toLocaleString()}`);
    return inst;
  },
};

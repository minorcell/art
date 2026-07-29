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

// Klein Blue: #002FA7
const KB = [0 / 255, 47 / 255, 167 / 255];

function kleinBlue(seed) {
  // Subtle variation around Klein Blue for depth/texture
  const v = 0.85 + (seed - 0.5) * 0.30;
  return [KB[0] * v, KB[1] * v, KB[2] * v];
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
        x *= 0.22; y *= 0.22; z *= 0.22;

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

        const [r, g, b] = kleinBlue(Math.random());
        C.push(r, g, b);
      }
    }

    const n = P.length / 3;
    const scat = ctx.scatterFrom(P, 3.0, 0.0);
    const mesh = ctx.createSplatMesh(P, C, scat, 0.014);
    mesh.renderOrder = 10;
    mesh.material.depthWrite = false;

    const _sf = ctx.scatterFrom;
    const _origPos = P;

    const amb = new THREE.AmbientLight(0x1a1a3a, 2.2);
    const key = new THREE.DirectionalLight(0xccddff, 5); key.position.set(4, 5, 4);
    const fil = new THREE.DirectionalLight(0x4466aa, 2); fil.position.set(-3, -2, -3);
    const rim = new THREE.DirectionalLight(0x6688cc, 2.5); rim.position.set(0, -1, 4);

    const inst = {
      meshes: [mesh],
      lights: [amb, key, fil, rim],
      onBeforeGather() {
        mesh.rotation.y = 0; mesh.scale.set(1, 1, 1);
        mesh.geometry.attributes.scatterPos.array.set(_sf(_origPos, 3.0, 0.0));
        mesh.geometry.attributes.scatterPos.needsUpdate = true;
      },
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

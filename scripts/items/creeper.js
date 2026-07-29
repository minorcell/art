// Minecraft Creeper — walk + flash → explode → regather (loop).

const GREEN_BASE  = [90/255, 143/255, 60/255];
const GREEN_DARK  = [65/255, 110/255, 38/255];
const GREEN_LIGHT = [110/255, 165/255, 80/255];
const FACE_DARK   = [18/255, 22/255, 14/255];

function vary(c, amt) {
  const f = 1 + (Math.random() - 0.5) * amt;
  return [Math.min(1, c[0]*f), Math.min(1, c[1]*f), Math.min(1, c[2]*f)];
}

// ═══════════════════════════════════════════
// Box surface points (centered at origin)
// ═══════════════════════════════════════════

function boxSurface(hw, hh, hd, density) {
  const P = [];
  const faces = [
    { area:(hw*2)*(hh*2), fn:(u,v)=>[-hw+u*hw*2, -hh+v*hh*2,  hd] },
    { area:(hw*2)*(hh*2), fn:(u,v)=>[-hw+u*hw*2, -hh+v*hh*2, -hd] },
    { area:(hd*2)*(hh*2), fn:(u,v)=>[ hw, -hh+u*hh*2, -hd+v*hd*2] },
    { area:(hd*2)*(hh*2), fn:(u,v)=>[-hw, -hh+u*hh*2, -hd+v*hd*2] },
    { area:(hw*2)*(hd*2), fn:(u,v)=>[-hw+u*hw*2,  hh, -hd+v*hd*2] },
    { area:(hw*2)*(hd*2), fn:(u,v)=>[-hw+u*hw*2, -hh, -hd+v*hd*2] },
  ];
  for (const f of faces) {
    const n = Math.max(10, Math.floor(f.area * density));
    for (let i = 0; i < n; i++) {
      const pt = f.fn(Math.random(), Math.random());
      P.push({ x:pt[0]+(Math.random()-0.5)*0.002, y:pt[1]+(Math.random()-0.5)*0.002, z:pt[2]+(Math.random()-0.5)*0.002 });
    }
  }
  return P;
}

// ═══════════════════════════════════════════
// Face pixel check (8×8 grid, row 0 = top)
// ═══════════════════════════════════════════

function faceRegion(px, py) {
  const x = Math.floor(px), y = Math.floor(py);
  if (y >= 1 && y < 3 && ((x >= 1 && x < 3) || (x >= 5 && x < 7))) return 'eye';
  if (y >= 5 && y < 7 && x >= 2 && x < 6) return 'mouth';
  return null;
}

// ═══════════════════════════════════════════
// ITEM
// ═══════════════════════════════════════════

export default {
  id: 'creeper',
  name: 'Creeper',

  generate(ctx) {
    const THREE = ctx.THREE;
    console.time('Creeper');

    const S = 3.0 / 26;
    const HEAD_SZ = [4*S, 4*S, 4*S];
    const BODY_SZ = [4*S, 6*S, 2*S];
    const LEG_SZ  = [2*S, 3*S, 2*S];
    const DENSITY = 8000;

    // ── Build a mesh from point arrays ────

    function makeMesh(pts, cols) {
      const pos = new Float32Array(pts.length * 3);
      const col = new Float32Array(cols.length * 3);
      for (let i = 0; i < pts.length; i++) {
        pos[i*3]=pts[i].x; pos[i*3+1]=pts[i].y; pos[i*3+2]=pts[i].z;
        col[i*3]=cols[i][0]; col[i*3+1]=cols[i][1]; col[i*3+2]=cols[i][2];
      }
      const scat = ctx.scatterFrom(pos, 3.0, 0.0);
      const m = ctx.createSplatMesh(pos, col, scat, 0.010);
      m.renderOrder = 10;
      m.material.depthWrite = false;
      return m;
    }

    // ── Generate each body part ────────────

    function randomGreen() {
      const r = Math.random();
      if (r < 0.15)      return vary(GREEN_DARK, 0.2);
      else if (r < 0.85) return vary(GREEN_BASE, 0.12);
      else               return vary(GREEN_LIGHT, 0.12);
    }

    // Head
    const headPts = boxSurface(HEAD_SZ[0], HEAD_SZ[1], HEAD_SZ[2], DENSITY);
    const headWithFaces = headPts.map(p => {
      let id = 'other';
      if (Math.abs(p.z - HEAD_SZ[2]) < 0.01) id = 'front';
      else if (Math.abs(p.z + HEAD_SZ[2]) < 0.01) id = 'back';
      else if (Math.abs(p.x - HEAD_SZ[0]) < 0.01) id = 'right';
      else if (Math.abs(p.x + HEAD_SZ[0]) < 0.01) id = 'left';
      else if (Math.abs(p.y - HEAD_SZ[1]) < 0.01) id = 'top';
      else if (Math.abs(p.y + HEAD_SZ[1]) < 0.01) id = 'bottom';
      return { ...p, faceId: id };
    });
    const headCols = headWithFaces.map(p => {
      if (p.faceId === 'front') {
        const px = ((p.x + HEAD_SZ[0]) / (HEAD_SZ[0]*2)) * 8;
        const py = 8 - ((p.y + HEAD_SZ[1]) / (HEAD_SZ[1]*2)) * 8;
        return faceRegion(px, py) ? vary(FACE_DARK, 0.2) : vary(GREEN_LIGHT, 0.15);
      }
      return vary(GREEN_BASE, 0.15);
    });
    const headMesh = makeMesh(headPts, headCols);
    headMesh.position.set(0, 10*S, 0);

    // Body
    const bodyPts = boxSurface(BODY_SZ[0], BODY_SZ[1], BODY_SZ[2], DENSITY);
    const bodyCols = bodyPts.map(() => randomGreen());
    const bodyMesh = makeMesh(bodyPts, bodyCols);
    bodyMesh.position.set(0, 2*S, 0);

    // Legs — pivot at top (local y=0 = hip)
    function makeLeg() {
      const pts = boxSurface(LEG_SZ[0], LEG_SZ[1], LEG_SZ[2], DENSITY);
      const shifted = pts.map(p => ({ x: p.x, y: p.y - LEG_SZ[1], z: p.z }));
      const cols = pts.map(() => randomGreen());
      return { mesh: makeMesh(shifted, cols) };
    }

    const legFL = makeLeg(), legFR = makeLeg();
    const legBL = makeLeg(), legBR = makeLeg();

    legFL.mesh.position.set(-2*S, -4*S,  3*S);
    legFR.mesh.position.set( 2*S, -4*S,  3*S);
    legBL.mesh.position.set(-2*S, -4*S, -3*S);
    legBR.mesh.position.set( 2*S, -4*S, -3*S);

    const allMeshes = [headMesh, bodyMesh, legFL.mesh, legFR.mesh, legBL.mesh, legBR.mesh];
    const pairA = [legFL, legBR];
    const pairB = [legFR, legBL];

    // ── Flat arrays for explosion + scatter regen ──
    const _sf = ctx.scatterFrom;
    const allOrigPos = [];
    const allOrigCol = [];
    const meshOrigPos = []; // per-mesh original position arrays
    for (const m of allMeshes) {
      const pa = m.geometry.attributes.position.array;
      const ca = m.geometry.attributes.color.array;
      meshOrigPos.push(new Float32Array(pa)); // snapshot
      for (let i = 0; i < pa.length; i++) allOrigPos.push(pa[i]);
      for (let i = 0; i < ca.length; i++) allOrigCol.push(ca[i]);
    }
    const N = allOrigPos.length / 3;
    const origPosArr = new Float32Array(allOrigPos);
    const origColArr = new Float32Array(allOrigCol);
    const explodePosArr = ctx.scatterFrom(allOrigPos, 3.5, 0.0);

    // ── Lights ─────────────────────────────
    const amb = new THREE.AmbientLight(0x404040, 2.5);
    const key = new THREE.DirectionalLight(0xffffff, 5); key.position.set(5, 8, 5);
    const fil = new THREE.DirectionalLight(0x668844, 2); fil.position.set(-3, -1, -3);

    // ── Animation state ────────────────────
    const WALK_FLASH_DUR  = 6.0;
    const EXPLODE_DUR     = 0.8;
    const SCATTERED_HOLD  = 0.4;
    const REGATHER_DUR    = 1.5;
    const LEG_SWING        = 0.35;

    let phase = 'walk_flash';
    let phaseStart = 0;
    let flashOn = false;

    const inst = {
      meshes: allMeshes,
      lights: [amb, key, fil],

      onBeforeGather() { resetAll(); },
      onGathered()      { resetAll(); },

      animate(time, dt) {
        const elapsed = time - phaseStart;

        switch (phase) {

          // ── WALK + FLASH ──────────────────
          case 'walk_flash': {
            const progress = elapsed / WALK_FLASH_DUR;

            // Leg swing
            const cycle = elapsed / 1.6;
            const swing = Math.sin(cycle * Math.PI * 2) * LEG_SWING;
            pairA.forEach(l => { l.mesh.rotation.x = swing; });
            pairB.forEach(l => { l.mesh.rotation.x = -swing; });

            // Body bob
            const bob = Math.abs(Math.sin(cycle * Math.PI * 2)) * 0.05;
            bodyMesh.position.y = 2*S + bob;
            headMesh.position.y = 10*S + bob * 0.7;

            // Body sway
            bodyMesh.rotation.z = Math.sin(cycle * Math.PI * 2) * 0.03;
            headMesh.rotation.z = Math.sin(cycle * Math.PI * 2) * 0.02;

            // Flash: frequency ramps up
            const freq = 0.6 + progress * progress * 14; // 0.6Hz → ~15Hz
            const toggled = Math.floor(elapsed * freq) % 2 === 0;

            if (toggled !== flashOn) {
              flashOn = toggled;
              let off = 0;
              for (const m of allMeshes) {
                const ca = m.geometry.attributes.color.array;
                if (flashOn) {
                  for (let i = 0; i < ca.length; i++) ca[i] = 1;
                } else {
                  for (let i = 0; i < ca.length; i++) {
                    ca[i] = origColArr[off+i];
                  }
                }
                m.geometry.attributes.color.needsUpdate = true;
                off += ca.length;
              }
            }

            if (progress >= 1.0) {
              phase = 'explode'; phaseStart = time;
              // Set white
              for (const m of allMeshes) {
                const ca = m.geometry.attributes.color.array;
                for (let i = 0; i < ca.length; i++) ca[i] = 1;
                m.geometry.attributes.color.needsUpdate = true;
              }
              // Reset poses
              [legFL, legFR, legBL, legBR].forEach(l => { l.mesh.rotation.x = 0; });
              bodyMesh.rotation.z = 0; headMesh.rotation.z = 0;
              bodyMesh.position.y = 2*S; headMesh.position.y = 10*S;
            }
            break;
          }

          // ── EXPLODE ───────────────────────
          case 'explode': {
            const p = Math.min(elapsed / EXPLODE_DUR, 1.0);
            const ep = 1 - Math.pow(1 - p, 3);

            let off = 0;
            for (const m of allMeshes) {
              const pa = m.geometry.attributes.position.array;
              const ca = m.geometry.attributes.color.array;
              for (let i = 0; i < pa.length; i++) {
                pa[i] = origPosArr[off+i] + (explodePosArr[off+i] - origPosArr[off+i]) * ep;
              }
              for (let i = 0; i < ca.length; i++) {
                ca[i] = 1 + (origColArr[off/3*3+i] - 1) * p; // white→green
              }
              m.geometry.attributes.position.needsUpdate = true;
              m.geometry.attributes.color.needsUpdate = true;
              off += pa.length;
            }

            if (p >= 1.0) { phase = 'scattered'; phaseStart = time; }
            break;
          }

          case 'scattered':
            if (elapsed >= SCATTERED_HOLD) { phase = 'regather'; phaseStart = time; }
            break;

          // ── REGATHER ──────────────────────
          case 'regather': {
            const p = Math.min(elapsed / REGATHER_DUR, 1.0);
            const ep = 1 - Math.pow(1 - p, 3);

            let off = 0;
            for (const m of allMeshes) {
              const pa = m.geometry.attributes.position.array;
              for (let i = 0; i < pa.length; i++) {
                pa[i] = explodePosArr[off+i] + (origPosArr[off+i] - explodePosArr[off+i]) * ep;
              }
              m.geometry.attributes.position.needsUpdate = true;
              off += pa.length;
            }

            if (p >= 1.0) { resetAll(); phase = 'walk_flash'; phaseStart = time; }
            break;
          }
        }
      },

      onScatterStart() {},
      reset() { resetAll(); phase = 'walk_flash'; phaseStart = 0; },
    };

    function resetAll() {
      let off = 0;
      for (let mi = 0; mi < allMeshes.length; mi++) {
        const m = allMeshes[mi];
        const pa = m.geometry.attributes.position.array;
        const ca = m.geometry.attributes.color.array;
        for (let i = 0; i < pa.length; i++) pa[i] = origPosArr[off+i];
        for (let i = 0; i < ca.length; i++) ca[i] = origColArr[off/3*3+i];
        m.geometry.attributes.position.needsUpdate = true;
        m.geometry.attributes.color.needsUpdate = true;
        // Regenerate scatter positions (overwritten by previous scatter-out)
        const newScat = _sf(meshOrigPos[mi], 3.0, 0.0);
        m.geometry.attributes.scatterPos.array.set(newScat);
        m.geometry.attributes.scatterPos.needsUpdate = true;
        off += pa.length;
      }
      [legFL, legFR, legBL, legBR].forEach(l => { l.mesh.rotation.x = 0; });
      bodyMesh.rotation.y = 0; bodyMesh.rotation.z = 0;
      bodyMesh.position.y = 2*S;
      headMesh.rotation.y = 0; headMesh.rotation.z = 0;
      headMesh.position.y = 10*S;
      flashOn = false;
    }

    console.timeEnd('Creeper');
    console.log(`Creeper splats: ${N.toLocaleString()}`);
    return inst;
  },
};

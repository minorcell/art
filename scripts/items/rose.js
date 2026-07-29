// Rose item — procedurally generated 3D rose using Gaussian splatting.
// Extracted from main.js and adapted for the Gallery architecture.
// Internal bud→bloom animation uses CPU-side position interpolation.

// ═══════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════

function buildPalette($) {
  return {
    P_BASE:   $.rgb(55, 3, 8),
    P_DEEP:   $.rgb(128, 8, 22),
    P_MID:    $.rgb(170, 18, 38),
    P_HIGH:   $.rgb(195, 34, 52),
    P_EDGE:   $.rgb(205, 52, 65),
    P_TIP:    $.rgb(210, 72, 82),
    SEP_D:    $.rgb(26, 60, 24),
    SEP_L:    $.rgb(48, 98, 40),
    STM_D:    $.rgb(28, 68, 28),
    STM_L:    $.rgb(52, 108, 45),
    TH_B:     $.rgb(75, 42, 32),
    TH_T:     $.rgb(135, 85, 65),
    LF_D:     $.rgb(20, 62, 22),
    LF_M:     $.rgb(35, 95, 38),
    LF_L:     $.rgb(68, 140, 58),
    LF_V:     $.rgb(28, 75, 30),
  };
}

// ═══════════════════════════════════════════════════════
// PETAL COLOR FUNCTION
// ═══════════════════════════════════════════════════════

function petalColor(s, tAbs, depth, CLR, $) {
  let c;
  if (s < 0.06)       c = $.lerp3(CLR.P_BASE, CLR.P_DEEP, s/0.06);
  else if (s < 0.35)  c = $.lerp3(CLR.P_DEEP, CLR.P_MID,  (s-0.06)/0.29);
  else if (s < 0.68)  c = $.lerp3(CLR.P_MID,  CLR.P_HIGH, (s-0.35)/0.33);
  else if (s < 0.88)  c = $.lerp3(CLR.P_HIGH, CLR.P_EDGE, (s-0.68)/0.20);
  else                c = $.lerp3(CLR.P_EDGE, CLR.P_TIP,  (s-0.88)/0.12);

  const edgeDarken = tAbs > 0.75 ? (tAbs - 0.75) / 0.25 * 0.06 : 0;
  const sat = 1 - tAbs*0.22 - edgeDarken;
  const light = tAbs*0.08;
  const d = depth != null ? depth : 0.5;
  const scale = 1.20 - d * 0.32;
  return [
    Math.min(1, (c[0]*sat+light*0.12) * scale),
    Math.min(1, (c[1]*sat+light*0.08) * scale),
    Math.min(1, (c[2]*sat+light*0.08) * scale),
  ];
}

// ═══════════════════════════════════════════════════════
// PETAL GEOMETRY
// ═══════════════════════════════════════════════════════

function petalWidth(s) {
  return Math.pow(s, 0.40) * Math.pow(1 - s, 0.32) * 2.55;
}

function generatePetal(len, cup, curl, resS, resT, depth, CLR, $) {
  const pos = [], col = [];
  for (let i = 0; i <= resS; i++) {
    const s = i / resS;
    const w = petalWidth(s);
    const ly = s * len;
    for (let j = 0; j <= resT; j++) {
      const t = (j / resT) * 2 - 1;
      const ta = Math.abs(t);
      const lx = t * w * len * 0.22;
      const cz = -cup * (1 - ta) * Math.pow(s, 0.55);
      const ec = curl * 0.25 * Math.pow(ta, 3.5) * s;
      const tc = -curl * 0.50 * Math.pow(s, 2.7) * (1 - ta * 0.35);
      const ruffle = 0.007 * Math.sin(s * Math.PI * 9.5 + t * 5.0) * ta * ta * s * (1 + curl * 1.8);
      const crease = -0.005 * (1 - ta * ta) * Math.pow(s, 0.45) * (1 - Math.pow(1 - s, 0.45));
      pos.push(lx, ly, cz + ec + tc + ruffle + crease);
      const cl = petalColor(s, ta, depth, CLR, $);
      col.push(cl[0], cl[1], cl[2]);
    }
  }
  return { positions: pos, colors: col };
}

// ═══════════════════════════════════════════════════════
// ROSE LAYER DEFINITIONS
// ═══════════════════════════════════════════════════════

const LAYERS_BUD = [
  [  9, 0.55, 0.010, 0.24, 0.02, 0.42, 128, 100],
  [ 11, 0.62, 0.025, 0.26, 0.04, 0.37, 136, 108],
  [ 14, 0.72, 0.05,  0.28, 0.06, 0.30, 144, 114],
  [ 18, 0.85, 0.09,  0.28, 0.08, 0.22, 144, 114],
  [ 20, 0.95, 0.14,  0.26, 0.10, 0.14, 134, 106],
  [ 18, 1.05, 0.22,  0.20, 0.13, 0.06, 122, 98],
  [ 12, 1.10, 0.32,  0.12, 0.15, -0.02, 108, 86],
];

const LAYERS_BLOOM = [
  [  9, 0.55, 0.04,  0.17, 0.12, 0.42, 128, 100],
  [ 11, 0.62, 0.10,  0.18, 0.16, 0.37, 136, 108],
  [ 14, 0.72, 0.18,  0.20, 0.22, 0.30, 144, 114],
  [ 18, 0.85, 0.30,  0.22, 0.28, 0.21, 144, 114],
  [ 20, 0.95, 0.44,  0.23, 0.34, 0.12, 134, 106],
  [ 18, 1.05, 0.62,  0.18, 0.40, 0.03, 122, 98],
  [ 12, 1.10, 0.88,  0.10, 0.46, -0.08, 108, 86],
];

// ═══════════════════════════════════════════════════════
// ROSE ASSEMBLY
// ═══════════════════════════════════════════════════════

function generateRose(layers, CLR, $, mulberry32) {
  const allPos = [], allCol = [];
  const GA = Math.PI * (3 - Math.sqrt(5));
  let pi = 0;
  let li = 0;

  for (const [count, len, tilt, cup, curl, h, rS, rT] of layers) {
    const depth = li / (layers.length - 1);
    const subC = Math.max(1, Math.floor(count / 4));
    const perS = Math.ceil(count / subC);
    let placed = 0;

    for (let sub = 0; sub < subC && placed < count; sub++) {
      const nSub = Math.min(perS, count - placed);
      const st = tilt + sub * 0.04;
      const sh = h + sub * 0.028;

      for (let p = 0; p < nSub; p++) {
        const angle = pi * GA;
        const sizeVar = 0.82 + mulberry32(pi * 7 + 5) * 0.36;
        const petal = generatePetal(len * sizeVar, cup, curl, rS, rT, depth, CLR, $);

        const tv = st + (mulberry32(pi * 7 + 1) - 0.5) * 0.07;
        const tw = (mulberry32(pi * 7 + 2) - 0.5) * 0.09;

        for (let k = 0; k < petal.positions.length; k += 3) {
          let x = petal.positions[k], y = petal.positions[k+1], z = petal.positions[k+2];
          [x, y, z] = $.rotZ(x, y, z, tw);
          [x, y, z] = $.rotX(x, y, z, tv);
          [x, y, z] = $.rotY(x, y, z, angle);
          allPos.push(x, y + sh, z);
          allCol.push(petal.colors[k], petal.colors[k+1], petal.colors[k+2]);
        }
        pi++; placed++;
      }
    }
    li++;
  }
  return { positions: allPos, colors: allCol };
}

// ═══════════════════════════════════════════════════════
// SEPALS, STEM, THORNS, LEAVES
// ═══════════════════════════════════════════════════════

function generateSepals(n, CLR, $, mulberry32) {
  const pos = [], col = [];
  for (let i = 0; i < n; i++) {
    const angle = (i/n)*Math.PI*2 + (mulberry32(i*13+5)-0.5)*0.22;
    const len = 0.50 + mulberry32(i*13+6)*0.18;
    const rS = 50, rT = 28;
    for (let si = 0; si <= rS; si++) {
      const s = si/rS;
      const w = (1-s)*0.08 + s*0.010;
      const ly = -s*len - 0.03;
      for (let ti = 0; ti <= rT; ti++) {
        const t = (ti/rT)*2-1;
        let rx = t*w, ry = ly, rz = -0.008*(1-Math.abs(t))*Math.pow(s, 0.55);
        [rx,ry,rz] = $.rotX(rx,ry,rz, 2.30);
        [rx,ry,rz] = $.rotY(rx,ry,rz, angle);
        rx += (mulberry32(i*1000+si*rT+ti)-0.5)*0.005;
        rz += (mulberry32(i*1000+si*rT+ti+1)-0.5)*0.005;
        pos.push(rx, ry-0.14, rz);
        const cl = $.lerp3(CLR.SEP_D, CLR.SEP_L, mulberry32(i*2000+si*rT+ti)*0.28+s*0.72);
        col.push(cl[0], cl[1], cl[2]);
      }
    }
  }
  return { positions: pos, colors: col };
}

function generateStem(h, thick, n, CLR, $, mulberry32) {
  const pos = [], col = [];
  for (let i = 0; i < n; i++) {
    const t = i/n;
    const y = -t*h;
    const sx = Math.sin(t*1.7)*0.065;
    const sz = Math.cos(t*1.35)*0.045;
    const r = thick*(1-t*0.38)*(0.55+mulberry32(i*3)*0.9);
    const a = mulberry32(i*3+1)*Math.PI*2;
    pos.push(sx+Math.cos(a)*r, y, sz+Math.sin(a)*r);
    const cl = $.lerp3(CLR.STM_D, CLR.STM_L, mulberry32(i*3+2));
    col.push(cl[0], cl[1], cl[2]);
  }
  return { positions: pos, colors: col };
}

function generateThorns(sh, CLR, $, mulberry32) {
  const pos = [], col = [];
  const count = 11;
  for (let i = 0; i < count; i++) {
    const t = 0.04 + (i/(count-1))*0.84;
    const y = -t*sh;
    const angle = (i*2.4 + mulberry32(i*31)*0.45) % (Math.PI*2);
    const sx = Math.sin(t*1.7)*0.065, sz = Math.cos(t*1.35)*0.045;
    const r0 = 0.042*(1-t*0.38);
    const bx = sx+Math.cos(angle)*r0, bz = sz+Math.sin(angle)*r0;
    const tl = 0.035 + mulberry32(i*17)*0.10;
    const rs = 28;
    const droop = 0.22 + mulberry32(i*41)*0.18;
    for (let j = 0; j <= rs; j++) {
      const s = j/rs;
      const rr = (1-s)*0.012 * Math.pow(1-s, 0.50);
      const d = s*tl;
      const ta = mulberry32(i*100+j)*Math.PI*2;
      const thornX = bx + Math.cos(angle)*d;
      const thornY = y - d*droop;
      const thornZ = bz + Math.sin(angle)*d;
      pos.push(thornX+Math.cos(ta)*rr, thornY, thornZ+Math.sin(ta)*rr);
      const baseRust = [0.52, 0.20, 0.10];
      const cl = s < 0.35
        ? $.lerp3(CLR.TH_B, baseRust, s/0.35)
        : $.lerp3(baseRust, CLR.TH_T, (s-0.35)/0.65);
      col.push(cl[0], cl[1], cl[2]);
    }
  }
  return { positions: pos, colors: col };
}

function generateLeaf(length, width, CLR, $, mulberry32) {
  const pos = [], col = [];
  const rL = Math.floor(length*132), rW = Math.floor(width*92);
  for (let i = 0; i <= rL; i++) {
    const s = i/rL;
    const leafShape = Math.pow(Math.sin(Math.PI * s), 0.50);
    const w = leafShape * width * 1.22;
    const ly = s*length;
    for (let j = 0; j <= rW; j++) {
      const t = (j/rW)*2-1, ta = Math.abs(t);
      const lx = t*w;
      const midribFade = (1 - Math.pow(1-s, 0.22)) * (1 - Math.pow(s, 0.30));
      const midrib = -0.042 * ta * Math.pow(1-ta, 0.50) * midribFade;
      const crossCurl = -0.028 * ta*ta * (1 - Math.pow(1-s, 0.32));
      const lengthCurl = -0.18 * Math.pow(s, 1.50) * length;
      const marginWave = 0.016 * Math.sin(s*Math.PI*7.2 + ta*3.0) * ta*ta * s;
      const microTex = 0.004 * Math.sin(s*Math.PI*21) * (1-ta) * s;
      const z = midrib + crossCurl + lengthCurl + marginWave + microTex;
      pos.push(lx, ly, z);
      let cl;
      const nearMidrib = ta < 0.038;
      const lateralVein = Math.abs(ta - 0.30) < 0.032 && s < 0.80;
      if (nearMidrib && s < 0.86)      cl = $.lerp3(CLR.LF_V, CLR.LF_M, ta/0.038);
      else if (s < 0.05)                cl = $.lerp3(CLR.LF_D, CLR.LF_M, s/0.05);
      else if (s > 0.84)                cl = $.lerp3(CLR.LF_M, CLR.LF_L, (s-0.84)/0.16);
      else if (lateralVein)             cl = $.lerp3(CLR.LF_V, CLR.LF_M, 0.22+mulberry32(i*rW+j)*0.28);
      else                              cl = $.lerp3(CLR.LF_M, CLR.LF_L, mulberry32(i*rW+j)*0.38);
      col.push(cl[0], cl[1], cl[2]);
    }
  }
  return { positions: pos, colors: col };
}

function generateLeavesOnStem(stH, yOffset, CLR, $, mulberry32) {
  const allPos = [], allCol = [];
  const defs = [
    { ay: 0.30, a: 0.18,          l: 0.70, w: 0.23, tilt: 0.56 },
    { ay: 0.62, a: Math.PI*0.56,  l: 0.92, w: 0.30, tilt: 0.44 },
    { ay: 1.00, a: Math.PI*1.28,  l: 0.80, w: 0.26, tilt: 0.50 },
    { ay: 1.46, a: Math.PI*0.34,  l: 0.58, w: 0.20, tilt: 0.62 },
  ];
  for (const d of defs) {
    const leaf = generateLeaf(d.l, d.w, CLR, $, mulberry32);
    const adjAy = d.ay + yOffset;
    const sy = Math.sin(adjAy/stH*1.7)*0.065;
    const sz = Math.cos(adjAy/stH*1.35)*0.045;
    const sr = 0.042*(1-adjAy/stH*0.38) + 0.030;
    for (let k = 0; k < leaf.positions.length; k += 3) {
      let x = leaf.positions[k], y = leaf.positions[k+1], z = leaf.positions[k+2];
      [x,y,z] = $.rotX(x,y,z, d.tilt);
      [x,y,z] = $.rotY(x,y,z, d.a);
      y -= adjAy; x += sy+Math.sin(d.a)*sr; z += sz+Math.cos(d.a)*sr;
      allPos.push(x, y, z);
      allCol.push(leaf.colors[k], leaf.colors[k+1], leaf.colors[k+2]);
    }
  }
  return { positions: allPos, colors: allCol };
}

// ═══════════════════════════════════════════════════════
// EASING
// ═══════════════════════════════════════════════════════

function easeOutCubic(t)   { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

// ═══════════════════════════════════════════════════════
// LERP ARRAY HELPER
// ═══════════════════════════════════════════════════════

function lerpArray(out, a, b, t) {
  for (let i = 0; i < out.length; i++) {
    out[i] = a[i] + (b[i] - a[i]) * t;
  }
}

// ═══════════════════════════════════════════════════════
// ITEM DEFINITION
// ═══════════════════════════════════════════════════════

const BUD_HOLD_DURATION = 2.5;
const BLOOM_DURATION = 4.5;

export default {
  id: 'rose',
  name: 'Rose',

  generate(ctx) {
    const CLR = buildPalette(ctx.$);
    const $ = ctx.$;
    const mul = ctx.mulberry32;
    const THREE = ctx.THREE;

    console.time('Rose Generate');

    // Generate all geometry
    const roseBudData   = generateRose(LAYERS_BUD, CLR, $, mul);
    const roseBloomData = generateRose(LAYERS_BLOOM, CLR, $, mul);
    const sepalData     = generateSepals(5, CLR, $, mul);
    const stemData      = generateStem(2.2, 0.042, 8000, CLR, $, mul);
    const thornData     = generateThorns(2.2, CLR, $, mul);
    const leafData      = generateLeavesOnStem(2.2, 0, CLR, $, mul);
    const leafBloomData = generateLeavesOnStem(2.2, 0.26, CLR, $, mul);

    // Combine geometry
    const flowerBudPos   = [...roseBudData.positions,   ...sepalData.positions];
    const flowerBloomPos = [...roseBloomData.positions, ...sepalData.positions];
    const flowerCols     = [...roseBudData.colors,       ...sepalData.colors];
    const stemAllPos     = [...stemData.positions,       ...thornData.positions];
    const stemAllCol     = [...stemData.colors,          ...thornData.colors];

    // Scatter positions (from bud form — the initial gathered state)
    const flowerScatter = ctx.scatterFrom(flowerBudPos);
    const stemScatter   = ctx.scatterFrom(stemAllPos, 2.5, 0.0);
    const leafScatter   = ctx.scatterFrom(leafData.positions, 2.8, -0.3);

    // Create meshes
    const flowerMesh = ctx.createSplatMesh(flowerBudPos, flowerCols, flowerScatter, 0.016);
    const stemMesh   = ctx.createSplatMesh(stemAllPos, stemAllCol, stemScatter, 0.016);
    const leafMesh   = ctx.createSplatMesh(leafData.positions, leafData.colors, leafScatter, 0.016);

    flowerMesh.renderOrder = 10;
    stemMesh.renderOrder   = 5;
    leafMesh.renderOrder   = 7;

    // Lights — warm rose tone
    const ambient = new THREE.AmbientLight(0x2a2a40, 2.5);
    const key     = new THREE.DirectionalLight(0xffeedd, 7);
    key.position.set(5, 7, 5);
    const fill    = new THREE.DirectionalLight(0x8899cc, 1.5);
    fill.position.set(-3, -1, -2);
    const rim     = new THREE.DirectionalLight(0xffffff, 3.5);
    rim.position.set(0, -1.5, 4);
    const warm    = new THREE.PointLight(0xff5533, 5, 2.0);
    warm.position.set(0, 0.5, 0.25);

    const lights = [ambient, key, fill, rim, warm];

    // Frozen bud & bloom arrays for CPU interpolation
    const flowerBudArr   = new Float32Array(flowerBudPos);
    const flowerBloomArr = new Float32Array(flowerBloomPos);
    const leafBudArr     = new Float32Array(leafData.positions);
    const leafBloomArr   = new Float32Array(leafBloomData.positions);

    // Internal animation state
    let phase = 'bud_hold';  // 'bud_hold' | 'blooming' | 'complete'
    let phaseStartTime = 0;
    const warmBaseIntensity = 5;

    // Save scatter function + params to regenerate on re-entry
    const _sf = ctx.scatterFrom;
    const _flowerBudPos = flowerBudPos;
    const _stemAllPos = stemAllPos;
    const _leafPos = leafData.positions;

    const inst = {
      meshes: [flowerMesh, stemMesh, leafMesh],
      lights,

      // ── Called by Gallery during SWAP, before GATHER_IN ──
      onBeforeGather() {
        flowerMesh.geometry.attributes.position.array.set(flowerBudArr);
        flowerMesh.geometry.attributes.position.needsUpdate = true;
        leafMesh.geometry.attributes.position.array.set(leafBudArr);
        leafMesh.geometry.attributes.position.needsUpdate = true;
        // Regenerate scatter positions (overwritten by previous scatter-out)
        flowerMesh.geometry.attributes.scatterPos.array.set(_sf(_flowerBudPos));
        flowerMesh.geometry.attributes.scatterPos.needsUpdate = true;
        stemMesh.geometry.attributes.scatterPos.array.set(_sf(_stemAllPos, 2.5, 0.0));
        stemMesh.geometry.attributes.scatterPos.needsUpdate = true;
        leafMesh.geometry.attributes.scatterPos.array.set(_sf(_leafPos, 2.8, -0.3));
        leafMesh.geometry.attributes.scatterPos.needsUpdate = true;
        // Reset mesh transforms
        stemMesh.rotation.z = 0;
        leafMesh.rotation.z = 0;
        for (const m of inst.meshes) {
          m.material.uniforms.uPointSize.value = 0.016;
        }
        phase = 'bud_hold';
        phaseStartTime = 0;
      },

      // ── Called by Gallery after GATHER_IN completes ──
      onGathered() {
        phase = 'bud_hold';
        phaseStartTime = 0;
      },

      // ── Called by Gallery each frame while active (IDLE) ──
      animate(time, dt) {
        const flowerPosAttr = flowerMesh.geometry.attributes.position;
        const leafPosAttr   = leafMesh.geometry.attributes.position;
        const flowerPosArr  = flowerPosAttr.array;
        const leafPosArr    = leafPosAttr.array;

        switch (phase) {
          case 'bud_hold':
            if (time >= BUD_HOLD_DURATION) {
              phase = 'blooming';
              phaseStartTime = time;
            }
            break;

          case 'blooming': {
            const elapsed = time - phaseStartTime;
            const raw = Math.min(elapsed / BLOOM_DURATION, 1.0);
            const p = easeInOutCubic(raw);

            lerpArray(flowerPosArr, flowerBudArr, flowerBloomArr, p);
            flowerPosAttr.needsUpdate = true;

            lerpArray(leafPosArr, leafBudArr, leafBloomArr, p);
            leafPosAttr.needsUpdate = true;

            if (raw >= 1.0) {
              phase = 'complete';
            }
            break;
          }

          case 'complete': {
            // Breathing point size
            const br = 1 + Math.sin(time*0.65)*0.018 + Math.sin(time*1.2)*0.010;
            for (const m of inst.meshes) {
              m.material.uniforms.uPointSize.value = 0.016 * br;
            }

            // Sway
            const sway = Math.sin(time * 0.5) * 0.01;
            stemMesh.rotation.z = sway;
            leafMesh.rotation.z = sway;

            // Warm light pulse
            warm.intensity = warmBaseIntensity + Math.sin(time * 0.85) * 0.8;
            break;
          }
        }
      },

      // ── Called by Gallery on Space key ──
      reset() {
        flowerMesh.geometry.attributes.position.array.set(flowerBudArr);
        flowerMesh.geometry.attributes.position.needsUpdate = true;
        leafMesh.geometry.attributes.position.array.set(leafBudArr);
        leafMesh.geometry.attributes.position.needsUpdate = true;

        for (const m of inst.meshes) {
          m.material.uniforms.uPointSize.value = 0.016;
        }

        phase = 'bud_hold';
        phaseStartTime = 0;
      },

      // No-op: scatter positions are computed dynamically by Gallery
      onScatterStart() {},
    };

    console.timeEnd('Rose Generate');

    const totalSplats = Math.round(
      (flowerBudPos.length + stemAllPos.length + leafData.positions.length) / 3
    );
    console.log(`Rose splats: ${totalSplats.toLocaleString()}`);

    return inst;
  },
};

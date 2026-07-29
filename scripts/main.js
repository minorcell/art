import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ═══════════════════════════════════════════════════════
// 1. SCENE, CAMERA, RENDERER
// ═══════════════════════════════════════════════════════

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06060c);
scene.fog = new THREE.Fog(0x06060c, 7, 28);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(3.0, 1.8, 5.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const pixelRatio = renderer.getPixelRatio();
const getFocal = () => {
  const h = renderer.domElement.height * pixelRatio;
  return h / (2 * Math.tan(camera.fov * Math.PI / 360));
};

// ═══════════════════════════════════════════════════════
// 2. CONTROLS
// ═══════════════════════════════════════════════════════

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.48, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.2;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI * 0.82;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.update();

// ═══════════════════════════════════════════════════════
// 3. LIGHTING
// ═══════════════════════════════════════════════════════

scene.add(new THREE.AmbientLight(0x2a2a40, 2.5));
const key = new THREE.DirectionalLight(0xffeedd, 7);
key.position.set(5, 7, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0x8899cc, 1.5);
fill.position.set(-3, -1, -2);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 3.5);
rim.position.set(0, -1.5, 4);
scene.add(rim);
const warm = new THREE.PointLight(0xff5533, 5, 2.0);
warm.position.set(0, 0.5, 0.25);
scene.add(warm);

// ═══════════════════════════════════════════════════════
// 4. GAUSSIAN TEXTURE
// ═══════════════════════════════════════════════════════

function createGaussianTex(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,255,255,0.99)');
  g.addColorStop(0.30, 'rgba(255,255,255,0.90)');
  g.addColorStop(0.48, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.52)');
  g.addColorStop(0.80, 'rgba(255,255,255,0.33)');
  g.addColorStop(0.92, 'rgba(255,255,255,0.20)');
  g.addColorStop(1.00, 'rgba(255,255,255,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
const gTex = createGaussianTex();

// ═══════════════════════════════════════════════════════
// 5. MATH HELPERS
// ═══════════════════════════════════════════════════════

function mulberry32(seed) {
  let t = (seed | 0) + 1;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const $ = {
  lerp3: (a, b, t) => [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, a[2] + (b[2]-a[2])*t],
  rgb: (r, g, b) => [r/255, g/255, b/255],
  rotX: (x, y, z, a) => { const c=Math.cos(a),s=Math.sin(a); return [x, y*c-z*s, y*s+z*c]; },
  rotY: (x, y, z, a) => { const c=Math.cos(a),s=Math.sin(a); return [x*c+z*s, y, -x*s+z*c]; },
  rotZ: (x, y, z, a) => { const c=Math.cos(a),s=Math.sin(a); return [x*c-y*s, x*s+y*c, z]; },
};

// ═══════════════════════════════════════════════════════
// 6. COLOR PALETTE
// ═══════════════════════════════════════════════════════

const CLR = {
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

function petalColor(s, tAbs, depth) {
  let c;
  // Real rose: dark base → rich crimson body → subtle edge darkening (not pink)
  if (s < 0.06)       c = $.lerp3(CLR.P_BASE, CLR.P_DEEP, s/0.06);
  else if (s < 0.35)  c = $.lerp3(CLR.P_DEEP, CLR.P_MID,  (s-0.06)/0.29);
  else if (s < 0.68)  c = $.lerp3(CLR.P_MID,  CLR.P_HIGH, (s-0.35)/0.33);
  else if (s < 0.88)  c = $.lerp3(CLR.P_HIGH, CLR.P_EDGE, (s-0.68)/0.20);
  else                c = $.lerp3(CLR.P_EDGE, CLR.P_TIP,  (s-0.88)/0.12);
  // Subtle edge darkening (real roses have darker rim, not lighter)
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
// 7. PETAL GENERATION
// ═══════════════════════════════════════════════════════

function petalWidth(s) {
  return Math.pow(s, 0.40) * Math.pow(1 - s, 0.32) * 2.55;
}

function generatePetal(len, cup, curl, resS, resT, depth) {
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
      // Edge ruffling for organic irregularity
      const ruffle = 0.007 * Math.sin(s * Math.PI * 9.5 + t * 5.0) * ta * ta * s * (1 + curl * 1.8);
      // Subtle center crease line
      const crease = -0.005 * (1 - ta * ta) * Math.pow(s, 0.45) * (1 - Math.pow(1 - s, 0.45));
      pos.push(lx, ly, cz + ec + tc + ruffle + crease);
      const cl = petalColor(s, ta, depth);
      col.push(cl[0], cl[1], cl[2]);
    }
  }
  return { positions: pos, colors: col };
}

// ═══════════════════════════════════════════════════════
// 8. ROSE ASSEMBLY
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

function generateRose(layers) {
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
        const petal = generatePetal(len * sizeVar, cup, curl, rS, rT, depth);

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
// 9. SEPALS, STEM, THORNS, LEAVES
// ═══════════════════════════════════════════════════════

function generateSepals(n = 5) {
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

function generateStem(h = 2.2, thick = 0.042, n = 8000) {
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

function generateThorns(sh = 2.2) {
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

function generateLeaf(length, width) {
  const pos = [], col = [];
  const rL = Math.floor(length*132), rW = Math.floor(width*92);
  for (let i = 0; i <= rL; i++) {
    const s = i/rL;
    // Tapered leaf silhouette
    const leafShape = Math.pow(Math.sin(Math.PI * s), 0.50);
    const w = leafShape * width * 1.22;
    const ly = s*length;
    for (let j = 0; j <= rW; j++) {
      const t = (j/rW)*2-1, ta = Math.abs(t);
      const lx = t*w;
      // Strong midrib V-crease: deepest at center, fades at base and tip
      const midribFade = (1 - Math.pow(1-s, 0.22)) * (1 - Math.pow(s, 0.30));
      const midrib = -0.042 * ta * Math.pow(1-ta, 0.50) * midribFade;
      // Cross-section curl: edges fold downward
      const crossCurl = -0.028 * ta*ta * (1 - Math.pow(1-s, 0.32));
      // Length-wise downward curvature
      const lengthCurl = -0.18 * Math.pow(s, 1.50) * length;
      // Margin undulation
      const marginWave = 0.016 * Math.sin(s*Math.PI*7.2 + ta*3.0) * ta*ta * s;
      // Fine surface texture
      const microTex = 0.004 * Math.sin(s*Math.PI*21) * (1-ta) * s;
      const z = midrib + crossCurl + lengthCurl + marginWave + microTex;
      pos.push(lx, ly, z);
      // Color with midrib and lateral vein accents
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

function generateLeavesOnStem(stH = 2.2, yOffset = 0) {
  const allPos = [], allCol = [];
  const defs = [
    { ay: 0.30, a: 0.18,          l: 0.70, w: 0.23, tilt: 0.56 },
    { ay: 0.62, a: Math.PI*0.56,  l: 0.92, w: 0.30, tilt: 0.44 },
    { ay: 1.00, a: Math.PI*1.28,  l: 0.80, w: 0.26, tilt: 0.50 },
    { ay: 1.46, a: Math.PI*0.34,  l: 0.58, w: 0.20, tilt: 0.62 },
  ];
  for (const d of defs) {
    const leaf = generateLeaf(d.l, d.w);
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
// 10. BOKEH & GROUND
// ═══════════════════════════════════════════════════════

function createBokeh(n = 2000) {
  const pos = [], col = [];
  for (let i = 0; i < n; i++) {
    const th = mulberry32(i*5)*Math.PI*2;
    const ph = Math.acos(2*mulberry32(i*5+1)-1)*0.52;
    const r = 3.8+mulberry32(i*5+2)*9;
    pos.push(Math.cos(th)*Math.sin(ph)*r, Math.cos(ph)*r+0.7, Math.sin(th)*Math.sin(ph)*r);
    const b = 0.03+mulberry32(i*5+3)*0.07;
    col.push(b, b, b*1.35);
  }
  return { positions: pos, colors: col };
}

// ═══════════════════════════════════════════════════════
// 11. SCATTER POSITIONS
// ═══════════════════════════════════════════════════════

function scatterFrom(finalPos, radius = 3.0, centerY = 0.25) {
  const scattered = new Array(finalPos.length);
  for (let i = 0; i < finalPos.length; i += 3) {
    const fx = finalPos[i], fy = finalPos[i+1], fz = finalPos[i+2];
    const r = mulberry32(i);
    let sx, sy, sz;
    if (r < 0.28) {
      const dx = fx, dy = fy - centerY, dz = fz;
      const dist = Math.sqrt(dx*dx+dy*dy+dz*dz) || 0.001;
      const rad = radius * (1.2 + mulberry32(i+1) * 2.8);
      sx = fx + (dx/dist) * rad; sy = fy + (dy/dist) * rad; sz = fz + (dz/dist) * rad;
    } else if (r < 0.43) {
      const a = mulberry32(i+2)*Math.PI*2;
      const rad = radius*(1.5+mulberry32(i+3)*1.5);
      sx=Math.cos(a)*rad; sy=centerY+(mulberry32(i+4)-0.5)*radius*0.3; sz=Math.sin(a)*rad;
    } else {
      const th = mulberry32(i+2)*Math.PI*2;
      const ph = Math.acos(2*mulberry32(i+3)-1);
      const rad = radius*(0.35+mulberry32(i+4)*1.3);
      sx=Math.cos(th)*Math.sin(ph)*rad; sy=Math.cos(ph)*rad+centerY; sz=Math.sin(th)*Math.sin(ph)*rad;
    }
    scattered[i]=sx; scattered[i+1]=sy; scattered[i+2]=sz;
  }
  return scattered;
}

// ═══════════════════════════════════════════════════════
// 12. CUSTOM SHADER
// ═══════════════════════════════════════════════════════

const VERT = /* glsl */`
  attribute vec3 scatterPos;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uProgress;
  uniform float uPointSize;
  uniform float uFocal;
  void main() {
    vec3 worldPos = mix(scatterPos, position, uProgress);
    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    gl_PointSize = clamp(uPointSize * uFocal / -mvPosition.z, 0.5, 40.0);
    gl_Position = projectionMatrix * mvPosition;
    vColor = color;
  }
`;

const FRAG = /* glsl */`
  varying vec3 vColor;
  uniform sampler2D uTex;
  void main() {
    vec4 tex = texture2D(uTex, gl_PointCoord);
    float alpha = tex.a;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

function createSplatMesh(finalPos, colors, scatterPos, pointSize) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',   new THREE.BufferAttribute(new Float32Array(finalPos), 3));
  geo.setAttribute('scatterPos', new THREE.BufferAttribute(new Float32Array(scatterPos), 3));
  geo.setAttribute('color',      new THREE.BufferAttribute(new Float32Array(colors), 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uProgress:  { value: 0 },
      uPointSize: { value: pointSize },
      uFocal:     { value: getFocal() },
      uTex:       { value: gTex },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
  return new THREE.Points(geo, mat);
}

// ═══════════════════════════════════════════════════════
// 13. GENERATE ALL GEOMETRY
// ═══════════════════════════════════════════════════════

console.time('Rose Generate');

const roseBudData   = generateRose(LAYERS_BUD);
const roseBloomData = generateRose(LAYERS_BLOOM);
const sepalData     = generateSepals();
const stemData      = generateStem();
const thornData     = generateThorns();
const leafData      = generateLeavesOnStem();
const leafBloomData = generateLeavesOnStem(2.2, 0.26);
const bokehData     = createBokeh();

const flowerBudPos   = [...roseBudData.positions,   ...sepalData.positions];
const flowerBloomPos = [...roseBloomData.positions, ...sepalData.positions];
const flowerCols     = [...roseBudData.colors,       ...sepalData.colors];
const stemAllPos     = [...stemData.positions,       ...thornData.positions];
const stemAllCol     = [...stemData.colors,          ...thornData.colors];

const flowerScatter = scatterFrom(flowerBudPos);
const stemScatter   = scatterFrom(stemAllPos, 2.5, 0.0);
const leafScatter   = scatterFrom(leafData.positions, 2.8, -0.3);

const flowerBudArr   = new Float32Array(flowerBudPos);
const flowerBloomArr = new Float32Array(flowerBloomPos);
const flowerScattArr = new Float32Array(flowerScatter);
const stemFinalArr   = new Float32Array(stemAllPos);
const stemScattArr   = new Float32Array(stemScatter);
const leafFinalArr   = new Float32Array(leafData.positions);
const leafBloomArr   = new Float32Array(leafBloomData.positions);
const leafScattArr   = new Float32Array(leafScatter);

const flowerMesh = createSplatMesh(flowerBudPos, flowerCols, flowerScatter, 0.016);
const stemMesh   = createSplatMesh(stemAllPos, stemAllCol, stemScatter, 0.016);
const leafMesh   = createSplatMesh(leafData.positions, leafData.colors, leafScatter, 0.016);

const bokehGeo = new THREE.BufferGeometry();
bokehGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bokehData.positions), 3));
bokehGeo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(bokehData.colors), 3));
const bokehMesh = new THREE.Points(bokehGeo, new THREE.PointsMaterial({
  size: 0.025, map: gTex, vertexColors: true,
  blending: THREE.NormalBlending, depthWrite: false, depthTest: true, transparent: true,
}));

const gndN = 3000, gndP = new Float32Array(gndN*3);
for (let i = 0; i < gndN; i++) {
  const a = mulberry32(i)*Math.PI*2;
  const r = Math.sqrt(mulberry32(i+1))*3.0;
  gndP[i*3]=Math.cos(a)*r; gndP[i*3+1]=-2.38+mulberry32(i+2)*0.04; gndP[i*3+2]=Math.sin(a)*r;
}
const gndGeo = new THREE.BufferGeometry();
gndGeo.setAttribute('position', new THREE.BufferAttribute(gndP, 3));
const gndMesh = new THREE.Points(gndGeo, new THREE.PointsMaterial({
  size: 0.07, map: gTex, color: 0x100e08,
  blending: THREE.NormalBlending, depthWrite: true, transparent: true, opacity: 0.45,
}));

flowerMesh.renderOrder = 10;
stemMesh.renderOrder   = 5;
leafMesh.renderOrder   = 7;
bokehMesh.renderOrder  = 0;
gndMesh.renderOrder    = -5;
scene.add(gndMesh, bokehMesh, stemMesh, leafMesh, flowerMesh);

console.timeEnd('Rose Generate');

const totalSplats = Math.round(
  (flowerBudPos.length + stemAllPos.length + leafData.positions.length + bokehData.positions.length + gndN*3) / 3
);
console.log(`Total Gaussian splats: ${totalSplats.toLocaleString()}`);

// ═══════════════════════════════════════════════════════
// 14. ANIMATION STATE MACHINE
// ═══════════════════════════════════════════════════════

const PHASE = { SCATTERED: 0, TO_BUD: 1, BUD_HOLD: 2, TO_BLOOM: 3, COMPLETE: 4 };
const BUD_DURATION  = 2.5;
const HOLD_DURATION = 0.3;
const BLOOM_DURATION = 4.5;
const INITIAL_DELAY = 0.7;

let phase = PHASE.SCATTERED;
let phaseStart = 0;
let formationDone = false;

function easeOutCubic(t)   { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

function swapFlowerToBloom() {
  const geo = flowerMesh.geometry;
  geo.attributes.position.array.set(flowerBloomArr);
  geo.attributes.position.needsUpdate = true;
  geo.attributes.scatterPos.array.set(flowerBudArr);
  geo.attributes.scatterPos.needsUpdate = true;
  flowerMesh.material.uniforms.uProgress.value = 0;

  // Animate leaves downward as petals expand to avoid clipping
  const lg = leafMesh.geometry;
  lg.attributes.scatterPos.array.set(leafFinalArr);
  lg.attributes.scatterPos.needsUpdate = true;
  lg.attributes.position.array.set(leafBloomArr);
  lg.attributes.position.needsUpdate = true;
  leafMesh.material.uniforms.uProgress.value = 0;
}

function resetAllToScattered() {
  const fg = flowerMesh.geometry;
  fg.attributes.position.array.set(flowerBudArr);
  fg.attributes.position.needsUpdate = true;
  fg.attributes.scatterPos.array.set(flowerScattArr);
  fg.attributes.scatterPos.needsUpdate = true;
  flowerMesh.material.uniforms.uProgress.value = 0;
  flowerMesh.material.uniforms.uPointSize.value = 0.016;

  const sg = stemMesh.geometry;
  sg.attributes.position.array.set(stemFinalArr);
  sg.attributes.position.needsUpdate = true;
  sg.attributes.scatterPos.array.set(stemScattArr);
  sg.attributes.scatterPos.needsUpdate = true;
  stemMesh.material.uniforms.uProgress.value = 0;
  stemMesh.material.uniforms.uPointSize.value = 0.016;

  const lg = leafMesh.geometry;
  lg.attributes.position.array.set(leafFinalArr);
  lg.attributes.position.needsUpdate = true;
  lg.attributes.scatterPos.array.set(leafScattArr);
  lg.attributes.scatterPos.needsUpdate = true;
  leafMesh.material.uniforms.uProgress.value = 0;
  leafMesh.material.uniforms.uPointSize.value = 0.016;

  phase = PHASE.SCATTERED;
  formationDone = false;
}

// ═══════════════════════════════════════════════════════
// 15. RENDER LOOP
// ═══════════════════════════════════════════════════════

const clock = new THREE.Clock();

function animate(timestamp) {
  requestAnimationFrame(animate);

  const now = timestamp / 1000;
  const t = clock.getElapsedTime();
  controls.update();

  if (phase === PHASE.SCATTERED) {
    if (phaseStart === 0) phaseStart = now;
    if (now - phaseStart >= INITIAL_DELAY) {
      phase = PHASE.TO_BUD;
      phaseStart = now;
    }
  }

  if (phase === PHASE.TO_BUD) {
    const el = now - phaseStart;
    const raw = Math.min(el / BUD_DURATION, 1.0);
    const p = easeOutCubic(raw);

    flowerMesh.material.uniforms.uProgress.value = p;
    stemMesh.material.uniforms.uProgress.value   = p;
    leafMesh.material.uniforms.uProgress.value   = p;

    if (raw >= 1.0) {
      phase = PHASE.BUD_HOLD;
      phaseStart = now;
    }
  }

  if (phase === PHASE.BUD_HOLD) {
    if (now - phaseStart >= HOLD_DURATION) {
      swapFlowerToBloom();
      phase = PHASE.TO_BLOOM;
      phaseStart = now;
    }
  }

  if (phase === PHASE.TO_BLOOM) {
    const el = now - phaseStart;
    const raw = Math.min(el / BLOOM_DURATION, 1.0);
    const p = easeInOutCubic(raw);

    flowerMesh.material.uniforms.uProgress.value = p;
    leafMesh.material.uniforms.uProgress.value   = p;

    if (raw >= 1.0) {
      phase = PHASE.COMPLETE;
      formationDone = true;
    }
  }

  if (formationDone) {
    const br = 1 + Math.sin(t*0.65)*0.018 + Math.sin(t*1.2)*0.010;
    flowerMesh.material.uniforms.uPointSize.value = 0.016 * br;
    stemMesh.material.uniforms.uPointSize.value   = 0.016 * br;
    leafMesh.material.uniforms.uPointSize.value   = 0.016 * br;

    stemMesh.material.uniforms.uProgress.value = 1.0;
    leafMesh.material.uniforms.uProgress.value = 1.0;
  }

  const sway = Math.sin(t * 0.5) * 0.01;
  stemMesh.rotation.z = sway;
  leafMesh.rotation.z = sway;

  warm.intensity = 4.5 + Math.sin(t * 0.85) * 0.8;

  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════
// 16. EVENT HANDLERS
// ═══════════════════════════════════════════════════════

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const fl = getFocal();
  flowerMesh.material.uniforms.uFocal.value = fl;
  stemMesh.material.uniforms.uFocal.value   = fl;
  leafMesh.material.uniforms.uFocal.value   = fl;
});

window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case ' ':
      e.preventDefault();
      resetAllToScattered();
      phaseStart = 0;
      break;
    case 'r':
      camera.position.set(3.0, 1.8, 5.2);
      controls.target.set(0, 0.48, 0);
      controls.update();
      break;
    case 'f':
      camera.position.set(0, 0.55, 5.5);
      controls.target.set(0, 0.48, 0);
      controls.update();
      break;
    case 't':
      camera.position.set(0, 5.5, 0.02);
      controls.target.set(0, 0.45, 0);
      controls.update();
      break;
    case 'a':
      controls.autoRotate = !controls.autoRotate;
      break;
  }
});

// ═══════════════════════════════════════════════════════
// 17. START
// ═══════════════════════════════════════════════════════

flowerMesh.material.uniforms.uProgress.value = 0;
stemMesh.material.uniforms.uProgress.value   = 0;
leafMesh.material.uniforms.uProgress.value   = 0;

console.log('Rose Bud -> Bloom sequence ready');
console.log(`   Phase 1: scatter -> bud  (${BUD_DURATION}s)`);
console.log(`   Phase 2: bud hold       (${HOLD_DURATION}s)`);
console.log(`   Phase 3: bud -> bloom    (${BLOOM_DURATION}s)`);
console.log('   Press Space to replay');

requestAnimationFrame(animate);

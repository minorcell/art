import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
// SHARED SHADERS
// ═══════════════════════════════════════════════════════

export const VERT = /* glsl */`
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

export const FRAG = /* glsl */`
  varying vec3 vColor;
  uniform sampler2D uTex;
  void main() {
    vec4 tex = texture2D(uTex, gl_PointCoord);
    float alpha = tex.a;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// ═══════════════════════════════════════════════════════
// GAUSSIAN TEXTURE
// ═══════════════════════════════════════════════════════

export function createGaussianTex(size = 128) {
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

// ═══════════════════════════════════════════════════════
// MATH HELPERS
// ═══════════════════════════════════════════════════════

export function mulberry32(seed) {
  let t = (seed | 0) + 1;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const $ = {
  lerp3: (a, b, t) => [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, a[2] + (b[2]-a[2])*t],
  rgb: (r, g, b) => [r/255, g/255, b/255],
  rotX: (x, y, z, a) => { const c=Math.cos(a),s=Math.sin(a); return [x, y*c-z*s, y*s+z*c]; },
  rotY: (x, y, z, a) => { const c=Math.cos(a),s=Math.sin(a); return [x*c+z*s, y, -x*s+z*c]; },
  rotZ: (x, y, z, a) => { const c=Math.cos(a),s=Math.sin(a); return [x*c-y*s, x*s+y*c, z]; },
};

// ═══════════════════════════════════════════════════════
// SCATTER POSITIONS
// ═══════════════════════════════════════════════════════

export function scatterFrom(finalPos, radius = 3.0, centerY = 0.25) {
  // finalPos can be a regular array or a Float32Array
  const count = finalPos.length / 3;
  const scattered = new Float32Array(finalPos.length);
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const fx = finalPos[idx], fy = finalPos[idx+1], fz = finalPos[idx+2];
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
    scattered[idx]=sx; scattered[idx+1]=sy; scattered[idx+2]=sz;
  }
  return scattered;
}

// ═══════════════════════════════════════════════════════
// SPLAT MESH FACTORY
// ═══════════════════════════════════════════════════════

export function createSplatMesh(finalPos, colors, scatterPos, pointSize, gTex, getFocal) {
  // Accept both regular arrays and TypedArrays
  const posArr = finalPos instanceof Float32Array ? finalPos : new Float32Array(finalPos);
  const colArr = colors instanceof Float32Array ? colors : new Float32Array(colors);
  const scatArr = scatterPos instanceof Float32Array ? scatterPos : new Float32Array(scatterPos);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',   new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('scatterPos', new THREE.BufferAttribute(scatArr, 3));
  geo.setAttribute('color',      new THREE.BufferAttribute(colArr, 3));

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

// ── Utilities consumed by Gallery.js (rendering) and ctx (items) ──

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

// ═══════════════════════════════════════════════════════
// GALLERY CLASS
// ═══════════════════════════════════════════════════════

const Phase = {
  IDLE: 'idle',
  SCATTER_OUT: 'scatter_out',
  SWAP: 'swap',
  GATHER_IN: 'gather_in',
};

function easeInCubic(t)    { return t * t * t; }
function easeOutCubic(t)   { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

export class Gallery {
  constructor() {
    // ── Scene ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 7, 28);

    // ── Camera ──
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 50);
    this.camera.position.set(3.0, 1.8, 5.2);

    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    const pixelRatio = this.renderer.getPixelRatio();
    this.getFocal = () => {
      const h = this.renderer.domElement.height * pixelRatio;
      return h / (2 * Math.tan(this.camera.fov * Math.PI / 360));
    };

    // ── Controls ──
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.48, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = Math.PI * 0.82;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.update();
    this._autoRotateOverride = null;

    // ── Shared Resources ──
    this.gTex = createGaussianTex();

    // ── Item Registry ──
    this._items = new Map();       // id → itemDef
    this._instances = new Map();   // id → instance (lazy)

    // ── State ──
    this._currentId = null;
    this._activeInstance = null;
    this._phase = Phase.IDLE;
    this._transition = null;

    // ── Item Bar ──
    this._createItemBar();

    // ── Event Handlers ──
    this._onResize = this._onResize.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKeyDown);

    // ── Clock ──
    this._clock = new THREE.Clock();
    this._activationTime = 0;

    // Kick off render loop (will idle until start() is called)
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  // ─────────────────────────────────────────────
  // ITEM BAR UI
  // ─────────────────────────────────────────────

  _createItemBar() {
    this._barEl = document.createElement('nav');
    this._barEl.className = 'item-wheel';
    this._barEl.id = 'item-bar';
    this._barEl.setAttribute('aria-label', '展品轮盘');
    document.body.appendChild(this._barEl);

    this._barEl.addEventListener('wheel', (e) => {
      if (this._phase !== Phase.IDLE || this._items.size < 2) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 4) return;
      e.preventDefault();

      const deltaScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const step = window.matchMedia('(max-width: 767px)').matches ? 84 : 56;
      const movement = Math.max(-1.2, Math.min(1.2, delta * deltaScale / step));
      this._wheelPosition += movement;
      this._barEl.classList.add('is-dragging');
      this._updateWheel();

      clearTimeout(this._wheelSnapTimer);
      this._wheelSnapTimer = setTimeout(() => this._snapWheel(), 120);
    }, { passive: false });

    this._barEl.addEventListener('pointerdown', (e) => {
      if (this._phase !== Phase.IDLE || this._items.size < 2) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      clearTimeout(this._wheelSnapTimer);
      this._barEl.setPointerCapture(e.pointerId);
      this._barEl.classList.add('is-dragging');
      this._wheelPointerStart = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        position: this._wheelPosition,
      };
    });

    this._barEl.addEventListener('pointermove', (e) => {
      const start = this._wheelPointerStart;
      if (!start || start.pointerId !== e.pointerId) return;
      e.preventDefault();

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const isHorizontal = window.matchMedia('(max-width: 767px)').matches;
      const distance = isHorizontal ? dx : dy;
      const step = isHorizontal ? 84 : 56;
      this._wheelPosition = start.position - distance / step;
      this._updateWheel();
    });

    const finishDrag = (e) => {
      const start = this._wheelPointerStart;
      if (!start || start.pointerId !== e.pointerId) return;
      this._wheelPointerStart = null;
      this._snapWheel();
    };
    this._barEl.addEventListener('pointerup', finishDrag);
    this._barEl.addEventListener('pointercancel', finishDrag);
  }

  _renderItemBar() {
    if (!this._wheelTrackEl) {
      const viewport = document.createElement('div');
      viewport.className = 'item-wheel-viewport';
      viewport.tabIndex = 0;
      viewport.setAttribute('role', 'listbox');
      viewport.setAttribute('aria-label', '旋转选择展品');
      this._wheelViewportEl = viewport;
      this._wheelTrackEl = document.createElement('div');
      this._wheelTrackEl.className = 'item-wheel-track';
      viewport.appendChild(this._wheelTrackEl);

      this._wheelCountEl = document.createElement('span');
      this._wheelCountEl.className = 'wheel-count';
      this._wheelCountEl.setAttribute('aria-live', 'polite');
      this._barEl.append(viewport, this._wheelCountEl);
    }

    this._wheelTrackEl.innerHTML = '';
    let index = 0;
    for (const [id, def] of this._items) {
      const item = document.createElement('span');
      item.className = 'item-wheel-item';
      item.id = `item-wheel-option-${index}`;
      item.dataset.item = id;
      item.setAttribute('role', 'option');
      item.textContent = def.name || id;
      item.title = def.name || id;
      this._wheelTrackEl.appendChild(item);
      index += 1;
    }

    const currentIndex = [...this._items.keys()].indexOf(this._currentId);
    if (currentIndex >= 0) this._wheelPosition = currentIndex;
    if (!Number.isFinite(this._wheelPosition)) this._wheelPosition = 0;
    this._updateWheel();
  }

  _moveWheel(delta) {
    if (this._phase !== Phase.IDLE) return;
    if (this._items.size < 2) return;
    this._wheelPosition = Math.round(this._wheelPosition) + delta;
    this._updateWheel();
    this._snapWheel();
  }

  _snapWheel() {
    clearTimeout(this._wheelSnapTimer);
    this._wheelSnapTimer = null;
    this._barEl.classList.remove('is-dragging');

    const ids = [...this._items.keys()];
    if (!ids.length) return;
    this._wheelPosition = Math.round(this._wheelPosition);
    this._updateWheel();

    const selectedIndex = ((this._wheelPosition % ids.length) + ids.length) % ids.length;
    const selectedId = ids[selectedIndex];
    if (selectedId !== this._currentId) this.switchTo(selectedId);
  }

  _updateWheel() {
    if (!this._wheelTrackEl) return;
    const ids = [...this._items.keys()];
    const total = ids.length;
    if (!total) {
      this._wheelCountEl.textContent = '';
      return;
    }

    const centeredIndex = ((Math.round(this._wheelPosition) % total) + total) % total;
    this._wheelCountEl.textContent = `${String(centeredIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    this._wheelViewportEl.setAttribute('aria-activedescendant', `item-wheel-option-${centeredIndex}`);

    [...this._wheelTrackEl.children].forEach((item, index) => {
      const rawDistance = index - this._wheelPosition;
      const distance = ((rawDistance + total / 2) % total + total) % total - total / 2;

      const absDistance = Math.abs(distance);
      const angle = distance * Math.PI / 5.3;
      const scale = Math.max(0.68, 1 - absDistance * 0.13);
      const opacity = Math.max(0, 1 - absDistance * 0.32);
      item.style.setProperty('--wheel-offset-x', `${Math.sin(angle) * 158}px`);
      item.style.setProperty('--wheel-offset-y', `${Math.sin(angle) * 96}px`);
      item.style.setProperty('--wheel-scale', scale);
      item.style.setProperty('--wheel-angle', `${distance * 34}deg`);
      item.style.setProperty('--wheel-opacity', opacity);
      item.style.zIndex = String(10 - Math.round(absDistance));
      item.classList.toggle('is-centered', index === centeredIndex);
      item.classList.toggle('is-hidden', absDistance > 2.6);
      item.setAttribute('aria-selected', index === centeredIndex ? 'true' : 'false');
    });
  }

  // ─────────────────────────────────────────────
  // REGISTRATION
  // ─────────────────────────────────────────────

  register(itemDef) {
    this._items.set(itemDef.id, itemDef);
    this._renderItemBar();
  }

  start() {
    const firstId = this._items.keys().next().value;
    if (!firstId) {
      console.warn('Gallery: no items registered');
      return;
    }
    // Load first item with instant gather (no scatter-out)
    this._loadItemInstance(firstId);
    this._currentId = firstId;
    this._applyItemControlPreferences(firstId);
    this._activeInstance = this._instances.get(firstId);
    this._phase = Phase.GATHER_IN;
    this._transition = {
      instance: this._activeInstance,
      duration: 1.2,
      elapsed: 0,
      lights: this._activeInstance.lights || [],
      targetIntensities: (this._activeInstance.lights || []).map(l => l._targetIntensity != null ? l._targetIntensity : l.intensity),
    };
    // Add to scene at uProgress=0, light intensity=0
    for (const m of this._activeInstance.meshes) {
      m.material.uniforms.uProgress.value = 0;
      this.scene.add(m);
    }
    for (const l of this._activeInstance.lights) {
      l.intensity = 0;
      this.scene.add(l);
    }
    this._renderItemBar();
  }

  // ─────────────────────────────────────────────
  // SWITCHING
  // ─────────────────────────────────────────────

  switchTo(itemId) {
    if (this._phase !== Phase.IDLE) return;   // ignore during transition
    if (itemId === this._currentId) return;    // already active

    const oldInst = this._activeInstance;

    // Pre-load new item if needed
    this._loadItemInstance(itemId);
    const newInst = this._instances.get(itemId);

    // Notify old item
    if (oldInst && oldInst.onScatterStart) {
      oldInst.onScatterStart(oldInst);
    }

    // Save old light intensities for fade-out (capture current, which may be animated)
    const oldLights = oldInst ? oldInst.lights : [];
    const oldTargetIntensities = oldLights.map(l => l.intensity);

    // Recompute scatter positions from current visual state for old meshes
    if (oldInst) {
      for (const m of oldInst.meshes) {
        const posArr = m.geometry.attributes.position.array;
        const newScatter = scatterFrom(posArr, 3.0, 0.25);
        m.geometry.attributes.scatterPos.array.set(newScatter);
        m.geometry.attributes.scatterPos.needsUpdate = true;
        m.material.uniforms.uProgress.value = 1.0;
      }
    }

    // Begin SCATTER_OUT
    this._phase = Phase.SCATTER_OUT;
    this._transition = {
      oldInstance: oldInst,
      oldLights,
      oldTargetIntensities,
      newInstance: newInst,
      newLights: newInst.lights || [],
      newTargetIntensities: (newInst.lights || []).map(l => l._targetIntensity != null ? l._targetIntensity : l.intensity),
      duration: 1.2,
      elapsed: 0,
    };

    // Set new item lights to 0 — not yet in scene until SWAP
    for (const l of newInst.lights) {
      l.intensity = 0;
    }

    this._currentId = itemId;
    this._applyItemControlPreferences(itemId);
    this._updateWheel();
  }

  _applyItemControlPreferences(itemId) {
    const autoRotateDisabled = this._items.get(itemId)?.autoRotate === false;
    if (autoRotateDisabled) {
      if (!this._autoRotateOverride) {
        this._autoRotateOverride = { restoreValue: this.controls.autoRotate };
      }
      this.controls.autoRotate = false;
      return;
    }

    if (this._autoRotateOverride) {
      this.controls.autoRotate = this._autoRotateOverride.restoreValue;
      this._autoRotateOverride = null;
    }
  }

  _loadItemInstance(itemId) {
    if (this._instances.has(itemId)) return;
    const def = this._items.get(itemId);
    if (!def) throw new Error(`Gallery: unknown item "${itemId}"`);

    const ctx = {
      THREE,
      gTex: this.gTex,
      getFocal: () => this.getFocal(),
      scatterFrom: (pos, r, cy) => scatterFrom(pos, r, cy),
      createSplatMesh: (pos, col, scat, ps) => createSplatMesh(pos, col, scat, ps, this.gTex, () => this.getFocal()),
      $,
      mulberry32,
    };

    const inst = def.generate(ctx);
    // Store target intensities for light fading
    for (const l of (inst.lights || [])) {
      l._targetIntensity = l.intensity;
      l.intensity = 0;  // start dark
    }
    this._instances.set(itemId, inst);
  }

  // ─────────────────────────────────────────────
  // RENDER LOOP
  // ─────────────────────────────────────────────

  _animate(timestamp) {
    requestAnimationFrame(this._animate);

    const dt = Math.min(this._clock.getDelta(), 0.1); // cap delta
    const now = timestamp / 1000;

    this.controls.update();

    switch (this._phase) {
      case Phase.IDLE:
        if (this._activeInstance && this._activeInstance.animate) {
          const sinceActivation = now - this._activationTime;
          this._activeInstance.animate(sinceActivation, dt, {
            meshes: this._activeInstance.meshes,
            lights: this._activeInstance.lights,
          });
        }
        break;

      case Phase.SCATTER_OUT:
        this._stepScatterOut(dt);
        break;

      case Phase.SWAP:
        this._stepSwap();
        break;

      case Phase.GATHER_IN:
        this._stepGatherIn(dt, now);
        break;
    }

    this.renderer.render(this.scene, this.camera);
  }

  _stepScatterOut(dt) {
    const t = this._transition;
    t.elapsed += dt;
    const raw = Math.min(t.elapsed / t.duration, 1.0);
    // Mirror of GATHER_IN: easeOutCubic in reverse — quick separation then drift
    const p = easeOutCubic(raw);

    if (t.oldInstance) {
      for (const m of t.oldInstance.meshes) {
        m.material.uniforms.uProgress.value = 1.0 - p;
      }
      for (let i = 0; i < t.oldLights.length; i++) {
        t.oldLights[i].intensity = t.oldTargetIntensities[i] * (1.0 - p);
      }
    }

    if (raw >= 1.0) {
      this._phase = Phase.SWAP;
    }
  }

  _stepSwap() {
    const t = this._transition;

    // Remove old from scene
    if (t.oldInstance) {
      for (const m of t.oldInstance.meshes) this.scene.remove(m);
      for (const l of t.oldLights) this.scene.remove(l);
    }

    // Give new item a chance to reset internal state before gathering
    if (t.newInstance.onBeforeGather) {
      t.newInstance.onBeforeGather(t.newInstance);
    }

    // Add new to scene at uProgress=0
    for (const m of t.newInstance.meshes) {
      m.material.uniforms.uProgress.value = 0;
      this.scene.add(m);
    }
    for (const l of t.newLights) {
      l.intensity = 0;
      this.scene.add(l);
    }

    this._activeInstance = t.newInstance;

    // Repurpose transition object for GATHER_IN
    this._transition = {
      instance: t.newInstance,
      lights: t.newLights,
      targetIntensities: t.newTargetIntensities,
      duration: 1.2,
      elapsed: 0,
    };

    this._phase = Phase.GATHER_IN;
  }

  _stepGatherIn(dt, now) {
    const t = this._transition;
    t.elapsed += dt;
    const raw = Math.min(t.elapsed / t.duration, 1.0);
    const p = easeOutCubic(raw);

    for (const m of t.instance.meshes) {
      m.material.uniforms.uProgress.value = p;
    }
    for (let i = 0; i < t.lights.length; i++) {
      t.lights[i].intensity = t.targetIntensities[i] * p;
    }

    if (raw >= 1.0) {
      this._phase = Phase.IDLE;
      this._activationTime = now;
      if (this._activeInstance && this._activeInstance.onGathered) {
        this._activeInstance.onGathered(this._activeInstance);
      }
    }
  }

  // ─────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const fl = this.getFocal();
    // Update uFocal on all meshes in scene
    this.scene.traverse((obj) => {
      if (obj.isPoints && obj.material.uniforms && obj.material.uniforms.uFocal) {
        obj.material.uniforms.uFocal.value = fl;
      }
    });
  }

  _onKeyDown(e) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        this._moveWheel(-1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        this._moveWheel(1);
        break;
      case ' ':
        e.preventDefault();
        if (this._activeInstance && this._activeInstance.reset) {
          this._activeInstance.reset(this._activeInstance);
        }
        break;
      case 'r':
        this.camera.position.set(3.0, 1.8, 5.2);
        this.controls.target.set(0, 0.48, 0);
        this.controls.update();
        break;
      case 'f':
        this.camera.position.set(0, 0.55, 5.5);
        this.controls.target.set(0, 0.48, 0);
        this.controls.update();
        break;
      case 't':
        this.camera.position.set(0, 5.5, 0.02);
        this.controls.target.set(0, 0.45, 0);
        this.controls.update();
        break;
      case 'a':
        if (this._items.get(this._currentId)?.autoRotate === false) break;
        this.controls.autoRotate = !this.controls.autoRotate;
        break;
    }
  }
}

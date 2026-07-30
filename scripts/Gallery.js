import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  VERT,
  FRAG,
  createGaussianTex,
  mulberry32,
  $,
  scatterFrom,
  createSplatMesh,
} from './core.js';

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
    this.scene.background = null;
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
    this._items = new Map();       // id → itemClass
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
      item.textContent = def.displayName || id;
      item.title = def.displayName || id;
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

  register(itemClass) {
    this._items.set(itemClass.id, itemClass);
    this._renderItemBar();
  }

  _getLayers(instance) {
    return instance ? [instance, instance.background].filter(Boolean) : [];
  }

  _getMeshes(instance) {
    return this._getLayers(instance).flatMap((layer) => layer.meshes || []);
  }

  _getLights(instance) {
    return this._getLayers(instance).flatMap((layer) => layer.lights || []);
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
    const startLayers = this._getLayers(this._activeInstance);
    const startLights = this._getLights(this._activeInstance);
    this._transition = {
      instance: this._activeInstance,
      layers: startLayers,
      duration: 1.2,
      elapsed: 0,
      lights: startLights,
      targetIntensities: startLights.map(l => l._targetIntensity != null ? l._targetIntensity : l.intensity),
    };
    // Add to scene at uProgress=0, light intensity=0
    for (const layer of startLayers) {
      for (const m of layer.meshes || []) {
        m.material.uniforms.uProgress.value = 0;
        this.scene.add(m);
      }
    }
    for (const l of startLights) {
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

    const oldLayers = this._getLayers(oldInst);
    const newLayers = this._getLayers(newInst);
    const newLights = this._getLights(newInst);
    for (const layer of oldLayers) {
      if (layer.onScatterStart) layer.onScatterStart(layer);
    }

    // Save old light intensities for fade-out (capture current, which may be animated)
    const oldLights = this._getLights(oldInst);
    const oldTargetIntensities = oldLights.map(l => l.intensity);

    // Recompute scatter positions from current visual state for old meshes
    for (const m of this._getMeshes(oldInst)) {
      const posArr = m.geometry.attributes.position.array;
      const newScatter = scatterFrom(posArr, 3.0, 0.25);
      m.geometry.attributes.scatterPos.array.set(newScatter);
      m.geometry.attributes.scatterPos.needsUpdate = true;
      m.material.uniforms.uProgress.value = 1.0;
    }

    // Begin SCATTER_OUT
    this._phase = Phase.SCATTER_OUT;
    this._transition = {
      oldInstance: oldInst,
      oldLayers,
      oldLights,
      oldTargetIntensities,
      newInstance: newInst,
      newLayers,
      newLights,
      newTargetIntensities: newLights.map(l => l._targetIntensity != null ? l._targetIntensity : l.intensity),
      duration: 1.2,
      elapsed: 0,
    };

    // Set new item lights to 0 — not yet in scene until SWAP
    for (const l of newLights) {
      l.intensity = 0;
    }

    this._currentId = itemId;
    this._applyItemControlPreferences(itemId);
    this._updateWheel();
  }

  _applyItemControlPreferences(itemId) {
    const ItemClass = this._items.get(itemId);
    const autoRotateDisabled = ItemClass?.autoRotate === false;
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
    const ItemClass = this._items.get(itemId);
    if (!ItemClass) throw new Error(`Gallery: unknown item "${itemId}"`);

    const ctx = {
      THREE,
      gTex: this.gTex,
      getFocal: () => this.getFocal(),
      scatterFrom: (pos, r, cy) => scatterFrom(pos, r, cy),
      createSplatMesh: (pos, col, scat, ps) => createSplatMesh(pos, col, scat, ps, this.gTex, () => this.getFocal()),
      $,
      mulberry32,
    };

    const inst = new ItemClass(ctx);
    // Store target intensities for light fading
    for (const l of this._getLights(inst)) {
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
        if (this._activeInstance) {
          const sinceActivation = now - this._activationTime;
          for (const layer of this._getLayers(this._activeInstance)) {
            if (layer.animate) {
              layer.animate(sinceActivation, dt, {
                meshes: layer.meshes || [],
                lights: layer.lights || [],
              });
            }
          }
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

    for (const m of this._getMeshes(t.oldInstance)) {
      m.material.uniforms.uProgress.value = 1.0 - p;
    }
    for (let i = 0; i < t.oldLights.length; i++) {
      t.oldLights[i].intensity = t.oldTargetIntensities[i] * (1.0 - p);
    }

    if (raw >= 1.0) {
      this._phase = Phase.SWAP;
    }
  }

  _stepSwap() {
    const t = this._transition;

    // Remove old from scene
    for (const layer of t.oldLayers || this._getLayers(t.oldInstance)) {
      for (const m of layer.meshes || []) this.scene.remove(m);
    }
    for (const l of t.oldLights) this.scene.remove(l);

    // Give new item a chance to reset internal state before gathering
    for (const layer of t.newLayers || this._getLayers(t.newInstance)) {
      if (layer.onBeforeGather) layer.onBeforeGather(layer);
    }

    // Add new to scene at uProgress=0
    for (const layer of t.newLayers || this._getLayers(t.newInstance)) {
      for (const m of layer.meshes || []) {
        m.material.uniforms.uProgress.value = 0;
        this.scene.add(m);
      }
    }
    for (const l of t.newLights) {
      l.intensity = 0;
      this.scene.add(l);
    }

    this._activeInstance = t.newInstance;

    // Repurpose transition object for GATHER_IN
    this._transition = {
      instance: t.newInstance,
      layers: t.newLayers || this._getLayers(t.newInstance),
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

    for (const layer of t.layers || this._getLayers(t.instance)) {
      for (const m of layer.meshes || []) {
        m.material.uniforms.uProgress.value = p;
      }
    }
    for (let i = 0; i < t.lights.length; i++) {
      t.lights[i].intensity = t.targetIntensities[i] * p;
    }

    if (raw >= 1.0) {
      this._phase = Phase.IDLE;
      this._activationTime = now;
      for (const layer of t.layers || this._getLayers(this._activeInstance)) {
        if (layer.onGathered) layer.onGathered(layer);
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
        for (const layer of this._getLayers(this._activeInstance)) {
          if (layer.reset) layer.reset(layer);
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

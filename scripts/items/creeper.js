// Minecraft Creeper — walk + flash → explode → regather (loop).

import { Item } from '../Item.js';
import { makeBackground, createRandom, mix, pushPoint, addCloud, addCaveBlock } from '../bg-utils.js';

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

// ═══════════════════════════════════════════════════════
// BACKGROUND
// ═══════════════════════════════════════════════════════

function createCreeperBackground(ctx) {
  const positions = [];
  const colors = [];
  const random = createRandom(0x63726176);
  const stone = [0.055, 0.064, 0.052];
  const stoneLight = [0.16, 0.18, 0.13];
  const moss = [0.06, 0.12, 0.055];
  const ore = [0.32, 0.20, 0.10];

  for (let i = 0; i < 3300; i += 1) {
    const x = -5.2 + random() * 10.4;
    const y = -1.1 + random() * 5.7;
    const z = -6.8 + random() * 1.5;
    pushPoint(positions, colors, x, y, z, mix(stone, stoneLight, random() * 0.65), 0.035, random);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 1200; i += 1) {
      const x = side * (2.5 + random() * 2.6);
      const y = -0.8 + random() * 3.4;
      const z = -5.8 + random() * 4.0;
      pushPoint(positions, colors, x, y, z, mix(stone, moss, random() * 0.8), 0.04, random);
    }
  }

  for (let i = 0; i < 26; i += 1) {
    const x = (random() < 0.5 ? -1 : 1) * (2.4 + random() * 2.0);
    const y = -0.1 + random() * 2.8;
    const z = -5.9 + random() * 3.5;
    addCaveBlock(positions, colors, random, [x, y, z], [0.18, 0.18, 0.18], 90, ore, [0.58, 0.28, 0.08]);
  }

  for (const x of [-3.3, 3.3]) {
    addCloud(positions, colors, random, [x, 0.85, -3.1], [0.18, 0.42, 0.18], 180, [0.36, 0.10, 0.025], [1.0, 0.52, 0.10]);
    for (let i = 0; i < 70; i += 1) {
      pushPoint(positions, colors, x + (random() - 0.5) * 0.2, 0.25 + random() * 1.3, -3.1 + (random() - 0.5) * 0.25, [0.45, 0.22, 0.07], 0.02, random);
    }
  }

  for (let i = 0; i < 1400; i += 1) {
    const x = -4.8 + random() * 9.6;
    const z = -5.5 + random() * 5.2;
    pushPoint(positions, colors, x, -1.05 + random() * 0.12, z, mix(stone, moss, random() * 0.45), 0.03, random);
  }

  return makeBackground(ctx, positions, colors, { pointSize: 0.024, scatterRadius: 0.75, centerY: 0.2 });
}

// ═══════════════════════════════════════════
// CREEPER CLASS
// ═══════════════════════════════════════════

const WALK_FLASH_DUR  = 6.0;
const EXPLODE_DUR     = 0.8;
const SCATTERED_HOLD  = 0.4;
const REGATHER_DUR    = 1.5;
const LEG_SWING        = 0.35;

export class Creeper extends Item {
  static id = 'creeper';
  static displayName = 'Creeper';

  // ── Background ──────────────────────────────

  buildBackground(ctx) {
    return createCreeperBackground(ctx);
  }

  // ── Model ───────────────────────────────────

  buildModel(ctx) {
    const THREE = ctx.THREE;
    console.time('Creeper');

    this._s = 3.0 / 26;
    const S = this._s;
    const HEAD_SZ = [4*S, 4*S, 4*S];
    const BODY_SZ = [4*S, 6*S, 2*S];
    const LEG_SZ  = [2*S, 3*S, 2*S];
    const DENSITY = 8000;

    const makeMesh = (pts, cols) => {
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
    };

    const randomGreen = () => {
      const r = Math.random();
      if (r < 0.15)      return vary(GREEN_DARK, 0.2);
      else if (r < 0.85) return vary(GREEN_BASE, 0.12);
      else               return vary(GREEN_LIGHT, 0.12);
    };

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

    // Legs
    const makeLeg = () => {
      const pts = boxSurface(LEG_SZ[0], LEG_SZ[1], LEG_SZ[2], DENSITY);
      const shifted = pts.map(p => ({ x: p.x, y: p.y - LEG_SZ[1], z: p.z }));
      const cols = pts.map(() => randomGreen());
      return { mesh: makeMesh(shifted, cols) };
    };

    const legFL = makeLeg(), legFR = makeLeg();
    const legBL = makeLeg(), legBR = makeLeg();

    legFL.mesh.position.set(-2*S, -4*S,  3*S);
    legFR.mesh.position.set( 2*S, -4*S,  3*S);
    legBL.mesh.position.set(-2*S, -4*S, -3*S);
    legBR.mesh.position.set( 2*S, -4*S, -3*S);

    const allMeshes = [headMesh, bodyMesh, legFL.mesh, legFR.mesh, legBL.mesh, legBR.mesh];

    // Flat arrays for explosion + scatter regen
    this._sf = ctx.scatterFrom;
    const allOrigPos = [];
    const allOrigCol = [];
    this._meshOrigPos = [];
    for (const m of allMeshes) {
      const pa = m.geometry.attributes.position.array;
      const ca = m.geometry.attributes.color.array;
      this._meshOrigPos.push(new Float32Array(pa));
      for (let i = 0; i < pa.length; i++) allOrigPos.push(pa[i]);
      for (let i = 0; i < ca.length; i++) allOrigCol.push(ca[i]);
    }
    this._origPosArr = new Float32Array(allOrigPos);
    this._origColArr = new Float32Array(allOrigCol);
    this._explodePosArr = ctx.scatterFrom(allOrigPos, 3.5, 0.0);

    // Store references for animation
    this._legFL = legFL; this._legFR = legFR;
    this._legBL = legBL; this._legBR = legBR;
    this._pairA = [legFL, legBR];
    this._pairB = [legFR, legBL];
    this._bodyMesh = bodyMesh;
    this._headMesh = headMesh;

    // Lights
    const amb = new THREE.AmbientLight(0x404040, 2.5);
    const key = new THREE.DirectionalLight(0xffffff, 5); key.position.set(5, 8, 5);
    const fil = new THREE.DirectionalLight(0x668844, 2); fil.position.set(-3, -1, -3);

    // Animation state
    this._phase = 'walk_flash';
    this._phaseStart = 0;
    this._flashOn = false;

    const total = allOrigPos.length / 3;
    console.timeEnd('Creeper');
    console.log(`Creeper splats: ${total.toLocaleString()}`);

    return {
      meshes: allMeshes,
      lights: [amb, key, fil],
    };
  }

  // ── Lifecycle ───────────────────────────────

  onBeforeGather() { this._resetAll(); }
  onGathered()     { this._resetAll(); }

  animate(time, dt) {
    const S = this._s;
    const elapsed = time - this._phaseStart;

    switch (this._phase) {

      case 'walk_flash': {
        const progress = elapsed / WALK_FLASH_DUR;
        const cycle = elapsed / 1.6;
        const swing = Math.sin(cycle * Math.PI * 2) * LEG_SWING;
        this._pairA.forEach(l => { l.mesh.rotation.x = swing; });
        this._pairB.forEach(l => { l.mesh.rotation.x = -swing; });

        const bob = Math.abs(Math.sin(cycle * Math.PI * 2)) * 0.05;
        this._bodyMesh.position.y = 2*S + bob;
        this._headMesh.position.y = 10*S + bob * 0.7;

        this._bodyMesh.rotation.z = Math.sin(cycle * Math.PI * 2) * 0.03;
        this._headMesh.rotation.z = Math.sin(cycle * Math.PI * 2) * 0.02;

        const freq = 0.6 + progress * progress * 14;
        const toggled = Math.floor(elapsed * freq) % 2 === 0;

        if (toggled !== this._flashOn) {
          this._flashOn = toggled;
          let off = 0;
          for (const m of this.meshes) {
            const ca = m.geometry.attributes.color.array;
            if (this._flashOn) {
              for (let i = 0; i < ca.length; i++) ca[i] = 1;
            } else {
              for (let i = 0; i < ca.length; i++) ca[i] = this._origColArr[off + i];
            }
            m.geometry.attributes.color.needsUpdate = true;
            off += ca.length;
          }
        }

        if (progress >= 1.0) {
          this._phase = 'explode'; this._phaseStart = time;
          for (const m of this.meshes) {
            const ca = m.geometry.attributes.color.array;
            for (let i = 0; i < ca.length; i++) ca[i] = 1;
            m.geometry.attributes.color.needsUpdate = true;
          }
          [this._legFL, this._legFR, this._legBL, this._legBR].forEach(l => { l.mesh.rotation.x = 0; });
          this._bodyMesh.rotation.z = 0; this._headMesh.rotation.z = 0;
          this._bodyMesh.position.y = 2*S; this._headMesh.position.y = 10*S;
        }
        break;
      }

      case 'explode': {
        const p = Math.min(elapsed / EXPLODE_DUR, 1.0);
        const ep = 1 - Math.pow(1 - p, 3);
        let off = 0;
        for (const m of this.meshes) {
          const pa = m.geometry.attributes.position.array;
          const ca = m.geometry.attributes.color.array;
          for (let i = 0; i < pa.length; i++) {
            pa[i] = this._origPosArr[off+i] + (this._explodePosArr[off+i] - this._origPosArr[off+i]) * ep;
          }
          for (let i = 0; i < ca.length; i++) {
            ca[i] = 1 + (this._origColArr[off/3*3+i] - 1) * p;
          }
          m.geometry.attributes.position.needsUpdate = true;
          m.geometry.attributes.color.needsUpdate = true;
          off += pa.length;
        }
        if (p >= 1.0) { this._phase = 'scattered'; this._phaseStart = time; }
        break;
      }

      case 'scattered':
        if (elapsed >= SCATTERED_HOLD) { this._phase = 'regather'; this._phaseStart = time; }
        break;

      case 'regather': {
        const p = Math.min(elapsed / REGATHER_DUR, 1.0);
        const ep = 1 - Math.pow(1 - p, 3);
        let off = 0;
        for (const m of this.meshes) {
          const pa = m.geometry.attributes.position.array;
          for (let i = 0; i < pa.length; i++) {
            pa[i] = this._explodePosArr[off+i] + (this._origPosArr[off+i] - this._explodePosArr[off+i]) * ep;
          }
          m.geometry.attributes.position.needsUpdate = true;
          off += pa.length;
        }
        if (p >= 1.0) { this._resetAll(); this._phase = 'walk_flash'; this._phaseStart = time; }
        break;
      }
    }
  }

  reset() { this._resetAll(); this._phase = 'walk_flash'; this._phaseStart = 0; }

  // ── Internal ────────────────────────────────

  _resetAll() {
    const S = this._s;
    let off = 0;
    for (let mi = 0; mi < this.meshes.length; mi++) {
      const m = this.meshes[mi];
      const pa = m.geometry.attributes.position.array;
      const ca = m.geometry.attributes.color.array;
      for (let i = 0; i < pa.length; i++) pa[i] = this._origPosArr[off+i];
      for (let i = 0; i < ca.length; i++) ca[i] = this._origColArr[off/3*3+i];
      m.geometry.attributes.position.needsUpdate = true;
      m.geometry.attributes.color.needsUpdate = true;
      const newScat = this._sf(this._meshOrigPos[mi], 3.0, 0.0);
      m.geometry.attributes.scatterPos.array.set(newScat);
      m.geometry.attributes.scatterPos.needsUpdate = true;
      off += pa.length;
    }
    [this._legFL, this._legFR, this._legBL, this._legBR].forEach(l => { l.mesh.rotation.x = 0; });
    this._bodyMesh.rotation.y = 0; this._bodyMesh.rotation.z = 0;
    this._bodyMesh.position.y = 2*S;
    this._headMesh.rotation.y = 0; this._headMesh.rotation.z = 0;
    this._headMesh.position.y = 10*S;
    this._flashOn = false;
  }
}

// Duel: Jedi blue lightsaber × Sith red lightsaber, crossed.

const DARK   =[.14,.14,.17], SILVER=[.55,.55,.58], GOLD=[.70,.55,.25];
const COPPER =[.60,.32,.18], RED_BTN=[.82,.12,.08], BLACK=[.06,.06,.08];
const STEEL  =[.40,.40,.45], RED_GLOW=[.95,.08,.05];
const BLUE_CORE=[.60,.80,1], BLUE_OUTER=[.06,.22,.90];
const RED_CORE =[1,.75,.55], RED_OUTER=[.92,.06,.03];

function vary(c,a){ const f=1+(Math.random()-.5)*a; return[Math.min(1,c[0]*f),Math.min(1,c[1]*f),Math.min(1,c[2]*f)]; }
function mix3(a,b,t){ return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }

function cylSurface(cx,cy,cz,r,h,d){
  const P=[], top=cy+h/2, bot=cy-h/2, n=Math.max(20,Math.floor(2*Math.PI*r*h*d));
  for(let i=0;i<n;i++){ const th=Math.random()*Math.PI*2, y=bot+Math.random()*h, j=.002;
    P.push({x:cx+r*Math.cos(th)+(Math.random()-.5)*j,y:y+(Math.random()-.5)*j,z:cz+r*Math.sin(th)+(Math.random()-.5)*j}); }
  const nT=Math.max(5,Math.floor(Math.PI*r*r*d));
  for(let i=0;i<nT;i++){ const a=Math.random()*Math.PI*2, d2=Math.sqrt(Math.random())*r;
    P.push({x:cx+d2*Math.cos(a),y:top,z:cz+d2*Math.sin(a)}); }
  for(let i=0;i<nT;i++){ const a=Math.random()*Math.PI*2, d2=Math.sqrt(Math.random())*r;
    P.push({x:cx+d2*Math.cos(a),y:bot,z:cz+d2*Math.sin(a)}); }
  return P;
}
function boxS(cx,cy,cz,hw,hh,hd,d){
  const P=[], x0=cx-hw,x1=cx+hw,y0=cy-hh,y1=cy+hh,z0=cz-hd,z1=cz+hd;
  const fs=[
    {a:(x1-x0)*(y1-y0),fn:(u,v)=>[x0+u*(x1-x0),y0+v*(y1-y0),z1]},
    {a:(x1-x0)*(y1-y0),fn:(u,v)=>[x0+u*(x1-x0),y0+v*(y1-y0),z0]},
    {a:(z1-z0)*(y1-y0),fn:(u,v)=>[x1,y0+u*(y1-y0),z0+v*(z1-z0)]},
    {a:(z1-z0)*(y1-y0),fn:(u,v)=>[x0,y0+u*(y1-y0),z0+v*(z1-z0)]},
    {a:(x1-x0)*(z1-z0),fn:(u,v)=>[x0+u*(x1-x0),y1,z0+v*(z1-z0)]},
    {a:(x1-x0)*(z1-z0),fn:(u,v)=>[x0+u*(x1-x0),y0,z0+v*(z1-z0)]},
  ];
  for(const f of fs){ const n=Math.max(6,Math.floor(f.a*d));
    for(let i=0;i<n;i++){ const pt=f.fn(Math.random(),Math.random());
      P.push({x:pt[0]+(Math.random()-.5)*.002,y:pt[1]+(Math.random()-.5)*.002,z:pt[2]+(Math.random()-.5)*.002}); }}
  return P;
}
function bladeVol(cx,cyBot,cz,rBot,rTop,h,d){
  const P=[], vol=Math.PI*h*(rBot*rBot+rBot*rTop+rTop*rTop)/3, n=Math.max(50,Math.floor(vol*d));
  for(let i=0;i<n;i++){ const t=Math.random(), r=rBot+(rTop-rBot)*t, a=Math.random()*Math.PI*2;
    const dist=Math.pow(Math.random(),.35)*r, y=cyBot+t*h, j=.007*(1-Math.pow(Math.random(),.35));
    P.push({x:cx+dist*Math.cos(a)+(Math.random()-.5)*j,y:y+(Math.random()-.5)*j,z:cz+dist*Math.sin(a)+(Math.random()-.5)*j,dist,maxR:r}); }
  return P;
}

// ══════════════════════════════════════
// Build a hilt (Jedi = silver/clean, Sith = black/aggressive)
// ══════════════════════════════════════

function buildHilt(style){
  const P=[], C=[];
  function add(pts,color){ for(const p of pts){P.push(p);C.push(vary(color,.12));} }
  const D=10000;

  if(style==='jedi'){
    add(cylSurface(0,-1.2,0,.24,.18,D),DARK);
    add(cylSurface(0,-1.05,0,.22,.10,D),SILVER);
    for(let y=-.95;y<.20;y+=.07){ const r=(Math.floor(y*40)%2===0)?.20:.185, c=(Math.floor(y*40)%2===0)?SILVER:DARK; add(cylSurface(0,y+.035,0,r,.07,D),c); }
    add(cylSurface(0,.23,0,.21,.06,D),SILVER);
    add(boxS(0,.03,.36,.12,.18,.08,D),DARK); add(cylSurface(0,.20,.36,.05,.04,D),GOLD);
    add(cylSurface(0,.29,0,.22,.06,D),GOLD); add(cylSurface(0,.35,0,.20,.06,D),DARK);
    add(cylSurface(0,.40,0,.19,.30,D),SILVER); add(cylSurface(0,.57,0,.19,.05,D),COPPER);
    add(cylSurface(0,.62,0,.19,.18,D),SILVER); add(cylSurface(0,.74,0,.21,.06,D),GOLD);
    add(cylSurface(0,.82,0,.26,.12,D),DARK); add(cylSurface(0,.92,0,.17,.08,D),SILVER);
    add(cylSurface(0,1.01,0,.20,.10,D),DARK); add(cylSurface(0,1.10,0,.16,.08,D),DARK);
    add(cylSurface(0,1.18,0,.13,.07,D),SILVER);
  }else{
    // Sith — black/steel, angular, aggressive
    add(cylSurface(0,-1.15,0,.22,.20,D),BLACK);
    add(cylSurface(0,-1.00,0,.20,.08,D),STEEL);
    // Grip: black with steel rings
    for(let y=-.92;y<.15;y+=.10){ const isRing=Math.floor(y*30)%3===0, r=isRing?.22:.20, c=isRing?STEEL:BLACK; add(cylSurface(0,y+.05,0,r,.10,D),c); }
    add(cylSurface(0,.20,0,.22,.08,D),STEEL);
    // Control section: wider, red button
    add(cylSurface(0,.28,0,.23,.10,D),BLACK);
    add(boxS(.08,.28,.38,.06,.15,.07,D),BLACK);
    add(cylSurface(.08,.40,.38,.04,.03,D),RED_BTN);
    // Upper section
    add(cylSurface(0,.40,0,.21,.35,D),BLACK);
    add(cylSurface(0,.60,0,.22,.06,D),STEEL);
    add(cylSurface(0,.68,0,.21,.20,D),BLACK);
    add(cylSurface(0,.82,0,.25,.08,D),STEEL);
    // Emitter — wider, aggressive flared shape
    add(cylSurface(0,.90,0,.28,.10,D),BLACK);
    add(cylSurface(0,1.00,0,.24,.08,D),STEEL);
    add(cylSurface(0,1.08,0,.18,.08,D),BLACK);
    add(cylSurface(0,1.15,0,.14,.06,D),STEEL);
  }
  return {P,C};
}

// ══════════════════════════════════════
// Build blade point cloud
// ══════════════════════════════════════

function buildBlade(core,outer,colorLight){
  const pts=bladeVol(0,1.05,0,.09,.04,6.5,35000);
  const tip=bladeVol(0,7.55,0,.04,0,.15,80000);
  const all=[...pts,...tip];
  const pos=all.flatMap(p=>[p.x,p.y,p.z]);
  const col=[];
  for(const p of all){
    const frac=Math.min(1,(p.dist||0)/(p.maxR||.001));
    const c=mix3(core,outer,Math.pow(frac,.6));
    col.push(c[0],c[1],c[2]);
  }
  return {pos,col,lightColor:colorLight};
}

export default {
  id:'lightsaber',
  name:'Lightsabers',

  generate(ctx){
    const THREE=ctx.THREE; console.time('Sabers');
    const D=10000;

    // ── Jedi (blue) ──────────────────────
    const jediHilt=buildHilt('jedi');
    const jediBlade=buildBlade(BLUE_CORE,BLUE_OUTER,[.2,.4,1]);
    const jHPos=jediHilt.P.flatMap(p=>[p.x,p.y,p.z]), jHCol=jediHilt.C.flat();
    const jHScat=ctx.scatterFrom(jHPos,4.0,2.0);
    const jHMesh=ctx.createSplatMesh(jHPos,jHCol,jHScat,.008);
    jHMesh.renderOrder=10; jHMesh.material.depthWrite=true;
    const jBScat=ctx.scatterFrom(jediBlade.pos,4.0,2.0);
    const jBMesh=ctx.createSplatMesh(jediBlade.pos,jediBlade.col,jBScat,.008);
    jBMesh.renderOrder=10; jBMesh.material.depthWrite=false;
    const jBColArr=new Float32Array(jediBlade.col);
    // Blade midpoint local y=4.375, tilt ±0.72, scale 0.4
    // x spread = 4.375*sin(0.72)*0.4 ≈ 1.15, y ofs = 4.375*cos(0.72)*0.4 ≈ 1.32
    // Goal: blade midpoints cross at world (0, 0.8, 0)
    const SCALE = 0.4, SPREAD = 1.15, Y0 = 0.8 - 1.32;
    jHMesh.rotation.set(-.2,0,-.72); jBMesh.rotation.set(-.2,0,-.72);
    jHMesh.position.set(-SPREAD,Y0,0); jBMesh.position.set(-SPREAD,Y0,0);

    // ── Sith (red) ───────────────────────
    const sithHilt=buildHilt('sith');
    const sithBlade=buildBlade(RED_CORE,RED_OUTER,[1,.15,.05]);
    const sHPos=sithHilt.P.flatMap(p=>[p.x,p.y,p.z]), sHCol=sithHilt.C.flat();
    const sHScat=ctx.scatterFrom(sHPos,4.0,2.0);
    const sHMesh=ctx.createSplatMesh(sHPos,sHCol,sHScat,.008);
    sHMesh.renderOrder=10; sHMesh.material.depthWrite=true;
    const sBScat=ctx.scatterFrom(sithBlade.pos,4.0,2.0);
    const sBMesh=ctx.createSplatMesh(sithBlade.pos,sithBlade.col,sBScat,.008);
    sBMesh.renderOrder=10; sBMesh.material.depthWrite=false;
    const sBColArr=new Float32Array(sithBlade.col);
    sHMesh.rotation.set(-.2,0,.72); sBMesh.rotation.set(-.2,0,.72);
    sHMesh.position.set(SPREAD,Y0,0); sBMesh.position.set(SPREAD,Y0,0);

    const allMeshes=[jHMesh,jBMesh,sHMesh,sBMesh];
    const _sf=ctx.scatterFrom;
    const _jHPos=jHPos, _jBPos=jediBlade.pos, _sHPos=sHPos, _sBPos=sithBlade.pos;

    const jBLight=new THREE.PointLight(.2,.4,1,3,9); jBLight.position.set(-1.5,2.5,0);
    const sBLight=new THREE.PointLight(1,.12,.05,3,9); sBLight.position.set(1.5,2.5,0);
    const amb=new THREE.AmbientLight(.2,.2,.3,1.5);
    const key=new THREE.DirectionalLight(.8,.8,.9,3); key.position.set(3,5,3);

    let lastFlicker=0, lastFlash=0;

    const inst={
      meshes:allMeshes,
      lights:[amb,key,jBLight,sBLight],

      onBeforeGather(){
        jHMesh.rotation.set(-.2,0,-.72); jBMesh.rotation.set(-.2,0,-.72);
        jHMesh.position.set(-SPREAD,Y0,0); jBMesh.position.set(-SPREAD,Y0,0);
        sHMesh.rotation.set(-.2,0,.72); sBMesh.rotation.set(-.2,0,.72);
        sHMesh.position.set(SPREAD,Y0,0); sBMesh.position.set(SPREAD,Y0,0);
        for(const m of allMeshes) m.scale.set(SCALE,SCALE,SCALE);
        jHMesh.geometry.attributes.scatterPos.array.set(_sf(_jHPos,4.0,2.0)); jHMesh.geometry.attributes.scatterPos.needsUpdate=true;
        jBMesh.geometry.attributes.scatterPos.array.set(_sf(_jBPos,4.0,2.0)); jBMesh.geometry.attributes.scatterPos.needsUpdate=true;
        sHMesh.geometry.attributes.scatterPos.array.set(_sf(_sHPos,4.0,2.0)); sHMesh.geometry.attributes.scatterPos.needsUpdate=true;
        sBMesh.geometry.attributes.scatterPos.array.set(_sf(_sBPos,4.0,2.0)); sBMesh.geometry.attributes.scatterPos.needsUpdate=true;
        jBMesh.geometry.attributes.color.array.set(jBColArr); jBMesh.geometry.attributes.color.needsUpdate=true;
        sBMesh.geometry.attributes.color.array.set(sBColArr); sBMesh.geometry.attributes.color.needsUpdate=true;
        lastFlicker=0; lastFlash=0;
      },
      onGathered(){},
      animate(time,dt){
        const sway=Math.sin(time*.6)*.05;
        jHMesh.rotation.z=-.72+sway; jBMesh.rotation.z=-.72+sway;
        sHMesh.rotation.z=.72-sway; sBMesh.rotation.z=.72-sway;
        for(const m of allMeshes) m.rotation.y+=dt*.1;
        const bob=Math.sin(time*.8)*.06;
        jHMesh.position.y=Y0+bob; jBMesh.position.y=Y0+bob;
        sHMesh.position.y=Y0-bob; sBMesh.position.y=Y0-bob;

        const tick=Math.floor(time/.04);
        if(tick!==lastFlicker){
          lastFlicker=tick;
          // Blue blade
          const jArr=jBMesh.geometry.attributes.color.array;
          const jN=jBColArr.length/3;
          for(let k=0;k<Math.floor(jN*.3);k++){
            const i=Math.floor(Math.random()*jN)*3, f=.6+Math.random()*.8;
            jArr[i]=Math.min(1,jBColArr[i]*f); jArr[i+1]=Math.min(1,jBColArr[i+1]*f); jArr[i+2]=Math.min(1,jBColArr[i+2]*f);
          }
          jBMesh.geometry.attributes.color.needsUpdate=true;
          // Red blade
          const sArr=sBMesh.geometry.attributes.color.array;
          const sN=sBColArr.length/3;
          for(let k=0;k<Math.floor(sN*.3);k++){
            const i=Math.floor(Math.random()*sN)*3, f=.6+Math.random()*.8;
            sArr[i]=Math.min(1,sBColArr[i]*f); sArr[i+1]=Math.min(1,sBColArr[i+1]*f); sArr[i+2]=Math.min(1,sBColArr[i+2]*f);
          }
          sBMesh.geometry.attributes.color.needsUpdate=true;
          jBLight.intensity=2.5+.5*Math.random(); sBLight.intensity=2.5+.5*Math.random();
        }

        // Occasional full flash (every ~1.5s)
        const flashTick=Math.floor(time/1.5);
        if(flashTick!==lastFlash){
          lastFlash=flashTick;
          const jArr=jBMesh.geometry.attributes.color.array;
          for(let i=0;i<jArr.length;i++) jArr[i]=Math.min(1,jArr[i]*1.6);
          jBMesh.geometry.attributes.color.needsUpdate=true;
          const sArr=sBMesh.geometry.attributes.color.array;
          for(let i=0;i<sArr.length;i++) sArr[i]=Math.min(1,sArr[i]*1.6);
          sBMesh.geometry.attributes.color.needsUpdate=true;
          jBLight.intensity=6; sBLight.intensity=6;
        }
      },
      onScatterStart(){},
      reset(){
        jHMesh.rotation.set(-.2,0,-.72); jBMesh.rotation.set(-.2,0,-.72);
        jHMesh.position.set(-SPREAD,Y0,0); jBMesh.position.set(-SPREAD,Y0,0);
        sHMesh.rotation.set(-.2,0,.72); sBMesh.rotation.set(-.2,0,.72);
        sHMesh.position.set(SPREAD,Y0,0); sBMesh.position.set(SPREAD,Y0,0);
        for(const m of allMeshes) m.scale.set(SCALE,SCALE,SCALE);
      },
    };

    const N=(jHPos.length+jediBlade.pos.length+sHPos.length+sithBlade.pos.length)/3;
    console.timeEnd('Sabers');
    console.log(`Duel splats: ${N.toLocaleString()}`);
    return inst;
  },
};

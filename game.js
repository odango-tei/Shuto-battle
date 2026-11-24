import * as THREE from 'three';

(() => {
  "use strict";

  const container = document.getElementById('game-container');
  const stageSwitchEl = document.getElementById('stage-switch');
  const joystickEl = document.getElementById('joystick');
  const joystickKnob = document.getElementById('joystick-knob');
  const minimap = document.getElementById('minimap');
  const minimapLabel = document.getElementById('minimap-label');
  const mmCtx = minimap.getContext('2d');

  // --- Renderer / Scene / Camera ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec5dc);
  scene.fog = new THREE.Fog(0x9ec5dc, 250, 1400);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 2500);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x556677, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(200, 350, 150);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sd = 600;
  sun.shadow.camera.left = -sd; sun.shadow.camera.right = sd;
  sun.shadow.camera.top = sd; sun.shadow.camera.bottom = -sd;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 1200;
  scene.add(sun);

  // --- State ---
  let colliders = [];
  let occluders = []; // meshes to fade
  let currentStageId = 'shinjuku';
  const keys = new Set();
  const joystick = { active: false, x: 0, y: 0, pointerId: null };
  const player = { x: 0, y: 1.7, z: 0, yaw: Math.PI, pitch: 0 };
  const raycaster = new THREE.Raycaster();
  let stageData = { shinjuku: null, shibuya: null };
  let activeGroups = [];

  // --- Helpers ---
  function roundRectCtx(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function makeLabel(text, color='#fff') {
    const c = document.createElement('canvas'); const ctx = c.getContext('2d');
    ctx.font = 'bold 28px sans-serif';
    const tw = Math.ceil(ctx.measureText(text).width);
    c.width = tw + 24; c.height = 48;
    const g = c.getContext('2d');
    g.font = 'bold 28px sans-serif';
    g.fillStyle = 'rgba(15,23,42,0.72)';
    roundRectCtx(g,2,2,c.width-4,c.height-4,10); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth=2; g.stroke();
    g.fillStyle = color; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(text, c.width/2, c.height/2+1);
    const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true}));
    const s=0.05; sp.scale.set(c.width*s, c.height*s, 1);
    return sp;
  }

  function clearStageObjects() {
    for (const obj of activeGroups) {
      scene.remove(obj);
      obj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material.dispose(); } });
    }
    activeGroups = [];
    colliders = [];
    occluders = [];
  }

  function addCollider(x,z,w,d,pad=0.8){ colliders.push({minX:x-w/2-pad,maxX:x+w/2+pad,minZ:z-d/2-pad,maxZ:z+d/2+pad}); }
  function addBounds(bounds){
    const t=8,w=bounds.maxX-bounds.minX,d=bounds.maxZ-bounds.minZ;
    const cx=(bounds.minX+bounds.maxX)/2, cz=(bounds.minZ+bounds.maxZ)/2;
    addCollider(cx,bounds.minZ-t/2,w+t*2,t,0);
    addCollider(cx,bounds.maxZ+t/2,w+t*2,t,0);
    addCollider(bounds.minX-t/2,cz,t,d+t*2,0);
    addCollider(bounds.maxX+t/2,cz,t,d+t*2,0);
  }

  // --- Build from plateau processed data ---
  function buildPlateauStage(data) {
    clearStageObjects();
    const group = new THREE.Group();
    activeGroups.push(group);
    scene.add(group);

    // ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2400,2400),
      new THREE.MeshStandardMaterial({color:0x2a3444, roughness:1})
    );
    ground.rotation.x = -Math.PI/2; ground.position.y = -0.05; ground.receiveShadow = true;
    group.add(ground);

    // roads (merged)
    const roadMat = new THREE.MeshStandardMaterial({color:0x3f4a5a, roughness:0.95});
    const roadGeoms = [];
    for (const r of data.roads) {
      const rings = r.f; if (!rings || !rings.length) continue;
      const outer = rings[0];
      if (outer.length < 3) continue;
      const shape = new THREE.Shape();
      shape.moveTo(outer[0][0], -outer[0][1]);
      for (let i=1;i<outer.length;i++) shape.lineTo(outer[i][0], -outer[i][1]);
      for (let h=1;h<rings.length;h++){
        const holePts=rings[h]; if(holePts.length<3) continue;
        const hole=new THREE.Path();
        hole.moveTo(holePts[0][0], -holePts[0][1]);
        for(let i=1;i<holePts.length;i++) hole.lineTo(holePts[i][0], -holePts[i][1]);
        shape.holes.push(hole);
      }
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI/2);
      geo.translate(0,0.03,0);
      roadGeoms.push(geo);
    }
    if(roadGeoms.length){
      const mergedRoad = mergeGeometries(roadGeoms);
      roadGeoms.forEach(g=>g.dispose());
      if(mergedRoad){
        const rm = new THREE.Mesh(mergedRoad, roadMat);
        rm.receiveShadow = true;
        group.add(rm);
      }
    }

    // buildings - chunked merge for performance
    const chunkSize = 120; // meters
    const chunks = new Map();
    function chunkKey(cx,cz){ return cx+','+cz; }
    for (const b of data.buildings) {
      const rings=b.f; if(!rings||!rings.length) continue;
      const outer=rings[0]; if(outer.length<3) continue;
      // centroid approx
      let sx=0, sz=0; for(const p of outer){sx+=p[0]; sz+=p[1];}
      const ccx=sx/outer.length, ccz=sz/outer.length;
      const ix=Math.floor(ccx/chunkSize), iz=Math.floor(ccz/chunkSize);
      const k=chunkKey(ix,iz);
      if(!chunks.has(k)) chunks.set(k, []);
      chunks.get(k).push(b);
    }

    const bldMat = new THREE.MeshStandardMaterial({color:0x8a99ad, roughness:0.55, metalness:0.1, transparent:true, opacity:1});
    const bldGeos = []; // for per-chunk mesh
    for (const [k, blist] of chunks) {
      const geoms = [];
      let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity, maxY=0;
      for (const b of blist) {
        const rings=b.f; const outer=rings[0];
        const shape = new THREE.Shape();
        shape.moveTo(outer[0][0], -outer[0][1]);
        for(let i=1;i<outer.length;i++) shape.lineTo(outer[i][0], -outer[i][1]);
        for(let h=1;h<rings.length;h++){
          const holePts=rings[h]; if(holePts.length<3) continue;
          const hole=new THREE.Path(); hole.moveTo(holePts[0][0], -holePts[0][1]);
          for(let i=1;i<holePts.length;i++) hole.lineTo(holePts[i][0], -holePts[i][1]);
          shape.holes.push(hole);
        }
        const h = Math.max(2, b.h || 3);
        const base = (b.g || 35) - 35; // relative to station ground ~35m
        const geo = new THREE.ExtrudeGeometry(shape, {depth: h, bevelEnabled:false});
        geo.rotateX(-Math.PI/2);
        geo.translate(0, base, 0);
        geoms.push(geo);

        for(const p of outer){ if(p[0]<minX)minX=p[0]; if(p[0]>maxX)maxX=p[0]; if(p[1]<minZ)minZ=p[1]; if(p[1]>maxZ)maxZ=p[1]; }
        if(base+h>maxY) maxY=base+h;

        // collider (AABB of footprint)
        let bx1=Infinity,bx2=-Infinity,bz1=Infinity,bz2=-Infinity;
        for(const p of outer){ if(p[0]<bx1)bx1=p[0]; if(p[0]>bx2)bx2=p[0]; if(p[1]<bz1)bz1=p[1]; if(p[1]>bz2)bz2=p[1]; }
        addCollider((bx1+bx2)/2,(bz1+bz2)/2,Math.max(1,bx2-bx1),Math.max(1,bz2-bz1),0.5);
      }
      if(!geoms.length) continue;
      const merged = mergeGeometries(geoms);
      geoms.forEach(g=>g.dispose());
      if(!merged) continue;
      const mat = bldMat.clone();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.box = {minX,maxX,minZ,maxZ,maxY};
      group.add(mesh);
      occluders.push(mesh);
    }

    // POIs / labels
    for (const p of data.pois) {
      if (!p.n) continue;
      // show important ones and some landmarks
      const important = p.c === 'station' || p.c === 'landmark' || p.c === 'shelter';
      if (!important) continue;
      const label = makeLabel(p.n, p.c==='station' ? '#fde68a' : '#e2e8f0');
      label.position.set(p.x, 12, p.z);
      group.add(label);
    }

    // Station center marker
    const centerLabel = makeLabel('新宿駅', '#fde68a');
    centerLabel.position.set(0, 18, 0);
    group.add(centerLabel);

    const bounds = {minX:-980, maxX:980, minZ:-980, maxZ:980};
    addBounds(bounds);
    return bounds;
  }

  // Simple geometry merge (BufferGeometry utils replacement)
  function mergeGeometries(geoms) {
    const valid = geoms.filter(g=>g && g.attributes.position);
    if(!valid.length) return null;
    let totalVerts=0, totalIdx=0;
    let hasNormal=false, hasUv=false;
    for(const g of valid){
      const pos=g.attributes.position;
      totalVerts += pos.count;
      totalIdx += g.index ? g.index.count : pos.count;
      if(g.attributes.normal) hasNormal=true;
      if(g.attributes.uv) hasUv=true;
    }
    const posArr = new Float32Array(totalVerts*3);
    const normArr = hasNormal ? new Float32Array(totalVerts*3) : null;
    const idxArr = (totalVerts > 65535) ? new Uint32Array(totalIdx) : new Uint16Array(totalIdx);
    let vOff=0, iOff=0;
    for(const g of valid){
      const pos=g.attributes.position;
      posArr.set(pos.array, vOff*3);
      if(normArr){
        const n=g.attributes.normal;
        if(n) normArr.set(n.array, vOff*3);
      }
      const idx=g.index;
      if(idx){
        for(let i=0;i<idx.count;i++) idxArr[iOff+i]=idx.array[i]+vOff;
        iOff+=idx.count;
      } else {
        for(let i=0;i<pos.count;i++) idxArr[iOff+i]=i+vOff;
        iOff+=pos.count;
      }
      vOff+=pos.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(posArr,3));
    if(normArr) out.setAttribute('normal', new THREE.BufferAttribute(normArr,3));
    else out.computeVertexNormals();
    out.setIndex(new THREE.BufferAttribute(idxArr,1));
    return out;
  }

  // --- Simple Shibuya fallback stage (hand-crafted, not PLATEAU extract) ---
  function buildSimpleStage(area) {
    clearStageObjects();
    const group = new THREE.Group();
    activeGroups.push(group); scene.add(group);

    const base = new THREE.Mesh(new THREE.PlaneGeometry(1200,1200), new THREE.MeshStandardMaterial({color:0x1a2433, roughness:1}));
    base.rotation.x=-Math.PI/2; base.position.set(area.center.x,-0.05,area.center.z); base.receiveShadow=true; group.add(base);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(area.ground.width, area.ground.depth), new THREE.MeshStandardMaterial({color:0x252f3f, roughness:0.95}));
    ground.rotation.x=-Math.PI/2; ground.position.set(area.ground.x,0,area.ground.z); ground.receiveShadow=true; group.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({color:0x3a4556, roughness:0.92});
    for(const r of area.roads||[]){
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r.width,r.depth), roadMat);
      m.rotation.x=-Math.PI/2; m.position.set(r.x,0.02,r.z); m.receiveShadow=true; group.add(m);
    }
    const bldMat = new THREE.MeshStandardMaterial({color:0x8a99ad, roughness:0.55, metalness:0.12, transparent:true, opacity:1});
    for(const b of area.buildings||[]){
      const geo = new THREE.BoxGeometry(b.w,b.h,b.d);
      const mat = bldMat.clone(); mat.color.setHex(b.color||0x8a99ad);
      const mesh = new THREE.Mesh(geo,mat);
      mesh.position.set(b.x,b.h/2,b.z); mesh.castShadow=true; mesh.receiveShadow=true;
      mesh.userData.box={minX:b.x-b.w/2,maxX:b.x+b.w/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2,maxY:b.h};
      group.add(mesh); occluders.push(mesh);
      addCollider(b.x,b.z,b.w,b.d,0.8);
      if(b.label){ const l=makeLabel(b.label,'#f8fafc'); l.position.set(b.x,b.h+5,b.z); group.add(l); }
    }
    for(const lm of area.landmarks||[]){
      const l=makeLabel(lm.name, lm.color||'#fff'); l.position.set(lm.x,8,lm.z); group.add(l);
    }
    addBounds(area.bounds);
    return area.bounds;
  }

  // --- Stage definitions ---
  const SHIBUYA_SIMPLE = {
    id:'shibuya', name:'渋谷駅周辺', shortName:'渋谷',
    center:{x:0,z:700}, spawn:{x:-5,z:735,yaw:Math.PI},
    ground:{x:0,z:700,width:500,depth:440},
    bounds:{minX:-245,maxX:245,minZ:485,maxZ:915},
    roads:[
      {x:0,z:700,width:500,depth:24},{x:-70,z:700,width:22,depth:440},
      {x:40,z:760,width:20,depth:160},{x:30,z:640,width:18,depth:160},
      {x:80,z:760,width:14,depth:120},{x:120,z:700,width:18,depth:300},
    ],
    buildings:[
      {x:-30,z:700,w:80,d:45,h:26,color:0x6b7280,label:'渋谷駅'},
      {x:50,z:690,w:40,d:38,h:230,color:0xf0a0c8,label:'渋谷スクランブルスクエア'},
      {x:95,z:675,w:34,d:34,h:183,color:0xc4b5fd,label:'渋谷ヒカリエ'},
      {x:130,z:690,w:32,d:30,h:120,color:0xb8a5f0,label:'渋谷ストリーム'},
      {x:-100,z:690,w:34,d:30,h:55,color:0x7a8699,label:'渋谷フクラス'},
      {x:-120,z:725,w:30,d:28,h:45,color:0x8896a8,label:'渋谷マークシティ'},
      {x:25,z:760,w:30,d:30,h:75,color:0xf472b6,label:'SHIBUYA109'},
      {x:-25,z:755,w:28,d:24,h:35,color:0x94a3b8,label:'MAGNET by SHIBUYA109'},
      {x:65,z:755,w:24,d:22,h:40,color:0x94a3b8,label:'渋谷モディ'},
      {x:75,z:790,w:26,d:24,h:28,color:0x94a3b8,label:'渋谷PARCO'},
      {x:150,z:740,w:45,d:30,h:38,color:0x86efac,label:'MIYASHITA PARK'},
      {x:-40,z:775,w:28,d:26,h:38,color:0x94a3b8},{x:-75,z:780,w:26,d:24,h:32,color:0x8896a8},
      {x:-110,z:770,w:28,d:26,h:34,color:0x8896a8},{x:-20,z:820,w:30,d:24,h:30,color:0x8896a8},
      {x:30,z:835,w:28,d:24,h:28,color:0x8896a8},{x:80,z:830,w:26,d:22,h:30,color:0x8896a8},
      {x:-30,z:640,w:28,d:24,h:30,color:0x94a3b8},{x:60,z:640,w:26,d:22,h:32,color:0x94a3b8},
      {x:170,z:700,w:28,d:26,h:36,color:0x94a3b8},{x:190,z:740,w:24,d:24,h:30,color:0x8896a8},
      {x:-150,z:720,w:28,d:26,h:32,color:0x8896a8},{x:-180,z:690,w:30,d:28,h:34,color:0x8896a8},
    ],
    landmarks:[
      {name:'渋谷駅',x:-30,z:700,color:'#fbbf24'},{name:'スクランブル交差点',x:5,z:725,color:'#f472b6'},
      {name:'ハチ公',x:-15,z:718,color:'#a3e635'},{name:'SHIBUYA109',x:25,z:760,color:'#fb7185'},
    ]
  };

  // --- Gun ---
  const gunGroup = new THREE.Group();
  function buildGun(){
    const dark=new THREE.MeshStandardMaterial({color:0x2a2f38,roughness:0.4,metalness:0.6});
    const darker=new THREE.MeshStandardMaterial({color:0x1a1d22,roughness:0.5,metalness:0.5});
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.16,0.55),dark); body.position.set(0,-0.02,-0.2); gunGroup.add(body);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.03,0.45,10),darker); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.03,-0.62); gunGroup.add(barrel);
    const grip=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.18,0.12),darker); grip.position.set(0,-0.14,-0.05); grip.rotation.x=0.25; gunGroup.add(grip);
    const mag=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.16,0.09),darker); mag.position.set(0,-0.22,-0.22); mag.rotation.x=0.15; gunGroup.add(mag);
    const sight=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.03,0.02),new THREE.MeshStandardMaterial({color:0xff4444,emissive:0x441111})); sight.position.set(0,0.08,-0.35); gunGroup.add(sight);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.11,0.5),new THREE.MeshStandardMaterial({color:0x2d3a4d,roughness:0.8})); arm.position.set(0.02,-0.14,0.18); arm.rotation.x=0.15; gunGroup.add(arm);
    gunGroup.position.set(0.28,-0.28,-0.55);
    camera.add(gunGroup); scene.add(camera);
  }

  // --- Stages ---
  function getStageDef(id){
    if(id==='shinjuku') return {id:'shinjuku', name:'新宿駅周辺', shortName:'新宿', spawn:{x:0,z:40,yaw:Math.PI}};
    if(id==='shibuya') return {id:'shibuya', name:'渋谷駅周辺', shortName:'渋谷', spawn:SHIBUYA_SIMPLE.spawn};
    return null;
  }

  function switchStage(id){
    currentStageId = id;
    const def = getStageDef(id);
    if(!def) return;
    if(id==='shinjuku' && stageData.shinjuku){
      buildPlateauStage(stageData.shinjuku);
    } else if(id==='shibuya'){
      buildSimpleStage(SHIBUYA_SIMPLE);
    } else {
      clearStageObjects();
    }
    player.x=def.spawn.x; player.z=def.spawn.z; player.y=1.7; player.yaw=def.spawn.yaw; player.pitch=0;
    // unstuck if spawned inside collider
    for(let r=0;r<20 && collides(player.x,player.z);r++){
      player.x += (Math.random()-0.5)*4; player.z += (Math.random()-0.5)*4;
    }
    keys.clear(); resetJoystick(); updateStageUI();
  }

  function updateStageUI(){
    document.querySelectorAll('.stage-btn').forEach(b=>b.classList.toggle('active', b.dataset.stage===currentStageId));
    const def=getStageDef(currentStageId);
    minimapLabel.textContent = def ? def.name : '-';
  }

  function buildStageUI(){
    stageSwitchEl.innerHTML='';
    for(const id of ['shinjuku','shibuya']){
      const def=getStageDef(id);
      const btn=document.createElement('button');
      btn.type='button'; btn.className='stage-btn'; btn.dataset.stage=id; btn.textContent=def.shortName;
      btn.addEventListener('click',()=>switchStage(id));
      stageSwitchEl.appendChild(btn);
    }
  }

  // --- Input ---
  const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right',W:'up',A:'left',S:'down',D:'right'};
  window.addEventListener('keydown',e=>{const k=keyMap[e.key]; if(k){e.preventDefault(); keys.add(k);}});
  window.addEventListener('keyup',e=>{const k=keyMap[e.key]; if(k) keys.delete(k);});
  window.addEventListener('blur',()=>{keys.clear(); resetJoystick();});

  function setJoystickFromEvent(e){
    const base=joystickEl.querySelector('.joystick-base');
    const rect=base.getBoundingClientRect();
    const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
    let dx=e.clientX-cx, dy=e.clientY-cy;
    const dist=Math.hypot(dx,dy); const maxR=rect.width*0.28;
    if(dist>maxR){ dx=dx/dist*maxR; dy=dy/dist*maxR; }
    joystick.x=dx/maxR; joystick.y=-(dy/maxR); joystick.active=Math.hypot(joystick.x,joystick.y)>0.06;
    joystickKnob.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joystickEl.classList.toggle('active', joystick.active);
  }
  function resetJoystick(){ joystick.active=false; joystick.x=0; joystick.y=0; joystick.pointerId=null; joystickKnob.style.transform='translate(-50%,-50%)'; joystickEl.classList.remove('active'); }
  joystickEl.addEventListener('pointerdown',e=>{e.preventDefault(); joystick.pointerId=e.pointerId; joystickEl.setPointerCapture(e.pointerId); setJoystickFromEvent(e);});
  joystickEl.addEventListener('pointermove',e=>{if(e.pointerId!==joystick.pointerId) return; e.preventDefault(); setJoystickFromEvent(e);});
  const joyEnd=e=>{if(e.pointerId!==joystick.pointerId) return; e.preventDefault(); resetJoystick();};
  joystickEl.addEventListener('pointerup',joyEnd); joystickEl.addEventListener('pointercancel',joyEnd);

  // --- Collision ---
  const playerRadius=0.45;
  function collides(x,z){ for(const c of colliders){ if(x+playerRadius>c.minX && x-playerRadius<c.maxX && z+playerRadius>c.minZ && z-playerRadius<c.maxZ) return true; } return false; }
  function tryMove(nx,nz){ if(!collides(nx,nz)){player.x=nx;player.z=nz;return;} if(!collides(nx,player.z)){player.x=nx;return;} if(!collides(player.x,nz)){player.z=nz;} }

  // --- Occlusion ---
  function updateOcclusion(){
    const camPos=camera.position;
    const camDir=new THREE.Vector3(); camera.getWorldDirection(camDir);
    const hitSet=new Set();
    const dirs=[camDir.clone(), camDir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),0.18), camDir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-0.18)];
    for(const dir of dirs){ raycaster.set(camPos,dir.normalize()); raycaster.far=25; const hits=raycaster.intersectObjects(occluders,false); for(const h of hits) hitSet.add(h.object); }
    for(const mesh of occluders){
      const box=mesh.userData.box; if(!box) continue;
      const dx=Math.max(box.minX-camPos.x,0,camPos.x-box.maxX);
      const dz=Math.max(box.minZ-camPos.z,0,camPos.z-box.maxZ);
      const distXZ=Math.hypot(dx,dz);
      const close=distXZ<8; const blocking=hitSet.has(mesh);
      const target=(close||blocking)?0.15:1.0;
      mesh.material.opacity += (target-mesh.material.opacity)*0.18;
      mesh.material.transparent = mesh.material.opacity < 0.99;
    }
  }

  // --- Minimap (cached background) ---
  let mmCache = null; let mmCacheKey = '';
  function buildMinimapCache(){
    const w=minimap.width,h=minimap.height;
    const key = currentStageId + ':' + (currentStageId==='shinjuku' && stageData.shinjuku ? '1':'0');
    if(mmCache && mmCacheKey===key) return;
    const off=document.createElement('canvas'); off.width=w; off.height=h;
    const ctx=off.getContext('2d');
    ctx.fillStyle='rgba(10,16,28,0.55)'; ctx.fillRect(0,0,w,h);
    let bounds;
    if(currentStageId==='shinjuku') bounds={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};
    else bounds=SHIBUYA_SIMPLE.bounds;
    const bw=bounds.maxX-bounds.minX, bd=bounds.maxZ-bounds.minZ;
    const pad=10; const scale=Math.min((w-pad*2)/bw,(h-pad*2)/bd);
    const ox=(w-bw*scale)/2 - bounds.minX*scale;
    const oy=(h-bd*scale)/2 - bounds.minZ*scale;
    const tx=x=>x*scale+ox, ty=z=>z*scale+oy;
    ctx.fillStyle='rgba(100,116,139,0.55)';
    if(currentStageId==='shinjuku' && stageData.shinjuku){
      for(const r of stageData.shinjuku.roads){
        const ring=r.f&&r.f[0]; if(!ring||ring.length<3) continue;
        ctx.beginPath(); ctx.moveTo(tx(ring[0][0]),ty(ring[0][1]));
        for(let i=1;i<ring.length;i++) ctx.lineTo(tx(ring[i][0]),ty(ring[i][1]));
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle='rgba(148,163,184,0.5)';
      for(const b of stageData.shinjuku.buildings){
        const ring=b.f&&b.f[0]; if(!ring||ring.length<3) continue;
        ctx.beginPath(); ctx.moveTo(tx(ring[0][0]),ty(ring[0][1]));
        for(let i=1;i<ring.length;i++) ctx.lineTo(tx(ring[i][0]),ty(ring[i][1]));
        ctx.closePath(); ctx.fill();
      }
    } else {
      for(const r of SHIBUYA_SIMPLE.roads) ctx.fillRect(tx(r.x-r.width/2),ty(r.z-r.depth/2),r.width*scale,r.depth*scale);
      ctx.fillStyle='rgba(148,163,184,0.65)';
      for(const b of SHIBUYA_SIMPLE.buildings) ctx.fillRect(tx(b.x-b.w/2),ty(b.z-b.d/2),b.w*scale,b.d*scale);
    }
    mmCache={canvas:off,bounds,scale,ox,oy}; mmCacheKey=key;
  }
  function drawMinimap(){
    const w=minimap.width,h=minimap.height;
    buildMinimapCache();
    if(!mmCache){ mmCtx.clearRect(0,0,w,h); return; }
    mmCtx.clearRect(0,0,w,h);
    mmCtx.drawImage(mmCache.canvas,0,0);
    const {scale,ox,oy}=mmCache;
    const tx=x=>x*scale+ox, ty=z=>z*scale+oy;
    const px=tx(player.x), py=ty(player.z);
    const a=Math.atan2(Math.cos(player.yaw), Math.sin(player.yaw));
    mmCtx.beginPath(); mmCtx.moveTo(px,py); mmCtx.arc(px,py,18, a-0.45,a+0.45); mmCtx.closePath();
    mmCtx.fillStyle='rgba(96,165,250,0.25)'; mmCtx.fill();
    mmCtx.beginPath(); mmCtx.arc(px,py,4,0,Math.PI*2); mmCtx.fillStyle='#60a5fa'; mmCtx.fill();
    mmCtx.strokeStyle='#fff'; mmCtx.lineWidth=1.5; mmCtx.stroke();
    mmCtx.beginPath(); mmCtx.moveTo(px,py); mmCtx.lineTo(px+Math.cos(a)*9, py+Math.sin(a)*9); mmCtx.strokeStyle='#fff'; mmCtx.lineWidth=2; mmCtx.stroke();
  }

  // --- Resize / Animate ---
  function resize(){ const w=container.clientWidth,h=container.clientHeight; if(!w||!h) return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize',resize); if(window.ResizeObserver) new ResizeObserver(resize).observe(container);

  let lastTime=0, bobPhase=0;
  function animate(ts){
    requestAnimationFrame(animate);
    if(!lastTime) lastTime=ts;
    const dt=Math.min((ts-lastTime)/1000,0.05); lastTime=ts;
    let ix=0,iy=0;
    if(keys.has('up')) iy+=1; if(keys.has('down')) iy-=1; if(keys.has('left')) ix-=1; if(keys.has('right')) ix+=1;
    if(joystick.active){ ix+=joystick.x; iy+=joystick.y; }
    const moving=Math.hypot(ix,iy)>0.06;
    if(moving){
      const len=Math.hypot(ix,iy); if(len>1){ix/=len;iy/=len;}
      const speed=6.0;
      const fx=Math.sin(player.yaw), fz=Math.cos(player.yaw);
      const rx=Math.cos(player.yaw), rz=-Math.sin(player.yaw);
      const mx=fx*iy+rx*ix, mz=fz*iy+rz*ix; const ml=Math.hypot(mx,mz)||1;
      const targetYaw=Math.atan2(mx/ml,mz/ml);
      let dyaw=targetYaw-player.yaw; while(dyaw>Math.PI) dyaw-=Math.PI*2; while(dyaw<-Math.PI) dyaw+=Math.PI*2;
      player.yaw += dyaw*Math.min(1,7*dt);
      tryMove(player.x+(mx/ml)*speed*dt, player.z+(mz/ml)*speed*dt);
      bobPhase+=dt*8;
    } else { bobPhase*=0.9; }
    const bob=Math.sin(bobPhase)*(moving?0.035:0);
    camera.position.set(player.x, player.y+bob, player.z);
    camera.rotation.order='YXZ'; camera.rotation.y=player.yaw; camera.rotation.x=player.pitch;
    gunGroup.position.y=-0.28+Math.sin(bobPhase)*0.008;
    gunGroup.position.x=0.28+Math.sin(bobPhase*0.5)*0.004;
    updateOcclusion();
    drawMinimap();
    renderer.render(scene,camera);
  }

  // --- Init ---
  buildGun(); buildStageUI(); resize(); requestAnimationFrame(animate);
  // Start on Shibuya immediately, then switch to Shinjuku once PLATEAU data loads
  switchStage('shibuya');
  minimapLabel.textContent = '新宿データ読込中...';
  fetch('./data/shinjuku_plateau.json')
    .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(data=>{
      stageData.shinjuku=data;
      switchStage('shinjuku');
    })
    .catch(err=>{
      console.error('Failed to load plateau data', err);
      minimapLabel.textContent = '新宿データ読込失敗';
    });
})();

import * as THREE from 'three';

(() => {
  "use strict";
  function showErr(msg){
    let el=document.getElementById('debug-err');
    if(!el){ el=document.createElement('div'); el.id='debug-err'; el.style.cssText='position:fixed;left:8px;top:8px;z-index:9999;max-width:90vw;background:rgba(180,0,0,.85);color:#fff;padding:8px 10px;font:12px/1.4 monospace;white-space:pre-wrap;border-radius:6px;pointer-events:none'; document.body.appendChild(el); }
    el.textContent += msg + '\n';
  }
  window.addEventListener('error', e=>showErr('ERR: '+(e.message||e.error)));
  window.addEventListener('unhandledrejection', e=>showErr('REJ: '+(e.reason&&e.reason.message?e.reason.message:e.reason)));

  const container = document.getElementById('game-container');
  const stageSwitchEl = document.getElementById('stage-switch');
  const moveStickEl = document.getElementById('joystick-move');
  const moveStickKnob = document.getElementById('joystick-move-knob');
  const lookStickEl = document.getElementById('joystick-look');
  const lookStickKnob = document.getElementById('joystick-look-knob');
  const shootBtn = document.getElementById('btn-shoot');
  const jumpBtn = document.getElementById('btn-jump');
  const minimap = document.getElementById('minimap');
  const minimapLabel = document.getElementById('minimap-label');
  const mmCtx = minimap.getContext('2d');
  const barHp = document.getElementById('bar-hp');
  const barStamina = document.getElementById('bar-stamina');
  const barGenki = document.getElementById('bar-genki');
  const valHp = document.getElementById('val-hp');
  const valStamina = document.getElementById('val-stamina');
  const valGenki = document.getElementById('val-genki');
  const mapToggle = document.getElementById('map-toggle');
  const bigmap = document.getElementById('bigmap');
  const bigmapClose = document.getElementById('bigmap-close');
  const bigmapCanvas = document.getElementById('bigmap-canvas');
  const bigmapCtx = bigmapCanvas.getContext('2d');
  const hpTagsEl = document.getElementById('hp-tags');
  const charSelect = document.getElementById('char-select');
  const charPreview = document.getElementById('char-preview');
  const charOptions = document.getElementById('char-options');
  const enemyCountInput = document.getElementById('enemy-count');
  const enemyCountVal = document.getElementById('enemy-count-val');
  const startGameBtn = document.getElementById('start-game');

  // --- Renderer / Scene / Camera ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaab9c8);
  scene.fog = new THREE.Fog(0xaab9c8, 120, 850);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 2500);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff3d6, 0x6b7c8f, 0.75));
  const sun = new THREE.DirectionalLight(0xfff1cc, 2.2);
  sun.position.set(260, 420, 180);
  sun.castShadow = false;
  scene.add(sun);
  scene.add(sun.target);

  // visible sun
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(18, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9 })
  );
  sunMesh.position.copy(sun.position).multiplyScalar(1.6);
  scene.add(sunMesh);

  // --- State ---
  let colliders = [];
  let occluders = []; // meshes to fade
  let currentStageId = 'shinjuku';
  const keys = new Set();
  const moveJoy = { active: false, x: 0, y: 0, pointerId: null };
  const lookJoy = { active: false, x: 0, y: 0, pointerId: null };
  const player = { x: 0, y: 2.05, z: 0, yaw: Math.PI, pitch: 0, vy: 0, grounded: true };
  const raycaster = new THREE.Raycaster();
  let stageData = { shinjuku: null };
  let activeGroups = [];
  // gameplay
  const CHARACTERS = [
    {id:'basque', name:'バスク', icon:'🔫', weapon:'gun', desc:'銃で正確に遠距離攻撃', hp:110, stamina:100, genki:100, speed:1.0, staminaRegen:1.0},
    {id:'aaaa', name:'ああああ', icon:'💨', weapon:'fart', desc:'オナラ爆弾で周囲に範囲ダメージ', hp:120, stamina:110, genki:120, speed:1.05, staminaRegen:1.1},
  ];
  let selectedChar = CHARACTERS[0];
  let gameStarted = false;
  let enemyCount = 20;
  let playRadius = 400;
  const stats = {hp:100, maxHp:100, stamina:100, maxStamina:100, genki:100, maxGenki:100};
  let enemies = [];
  let enemyBullets = [];
  let items = [];
  let hpTagPool = [];
  let shootCooldownPlayer = 0;
  const ENEMY_VARIANTS = [
    {name:'赤スーツ兵', body:0xc0392b, trim:0x2c3e50, skin:0xf1c27d},
    {name:'青ジャケット兵', body:0x2980b9, trim:0x34495e, skin:0xe0ac69},
    {name:'緑戦闘員', body:0x27ae60, trim:0x1c2833, skin:0xf0c8a0},
    {name:'黄偵察兵', body:0xd4a017, trim:0x4a3f35, skin:0xf1c27d},
    {name:'紫工作員', body:0x8e44ad, trim:0x2c3e50, skin:0xdba97a},
  ];

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
    for (const e of enemies) { if(e.mesh){ scene.remove(e.mesh); disposeObject3D(e.mesh); } }
    for (const b of enemyBullets) { if(b.mesh){ scene.remove(b.mesh); disposeObject3D(b.mesh); } }
    for (const it of items) { if(it.mesh){ scene.remove(it.mesh); disposeObject3D(it.mesh); } }
    enemies=[]; enemyBullets=[]; items=[];
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


  // --- Gameplay ---
  const ITEM_DEFS = [
    {icon:'🍎', name:'りんご', type:'food', hp:12, stamina:5, genki:3, msg:'HP+12'},
    {icon:'🍞', name:'パン', type:'food', hp:10, stamina:15, genki:5, msg:'スタミナ+15'},
    {icon:'🍫', name:'チョコレート', type:'food', hp:5, stamina:8, genki:20, msg:'元気度+20'},
    {icon:'🥝', name:'キウイ', type:'food', hp:8, stamina:8, genki:8, msg:'バランス回復'},
    {icon:'🍮', name:'プリン', type:'food', hp:6, stamina:6, genki:15, msg:'元気度+15'},
    {icon:'🍿', name:'ポップコーン', type:'food', hp:4, stamina:12, genki:6, msg:'スタミナ+12'},
    {icon:'🎂', name:'ケーキ', type:'food', hp:15, stamina:5, genki:18, msg:'HP/元気回復'},
    {icon:'🍰', name:'ショートケーキ', type:'food', hp:10, stamina:4, genki:14, msg:'元気度+14'},
    {icon:'🍧', name:'かき氷', type:'food', hp:6, stamina:10, genki:10, msg:'クール回復'},
    {icon:'🌭', name:'ホットドッグ', type:'food', hp:14, stamina:12, genki:4, msg:'HP/スタミナ'},
    {icon:'🧇', name:'ワッフル', type:'food', hp:8, stamina:14, genki:8, msg:'スタミナ+14'},
    {icon:'🥨', name:'プレッツェル', type:'food', hp:7, stamina:10, genki:5, msg:'スタミナ+10'},
    {icon:'🍐', name:'洋梨', type:'food', hp:9, stamina:6, genki:6, msg:'HP+9'},
    {icon:'🍝', name:'パスタ', type:'food', hp:18, stamina:18, genki:6, msg:'HP/スタミナ大'},
    {icon:'🍱', name:'弁当', type:'food', hp:20, stamina:20, genki:10, msg:'大回復'},
    {icon:'🍚', name:'ごはん', type:'food', hp:12, stamina:16, genki:6, msg:'スタミナ+16'},
    {icon:'🥮', name:'月餅', type:'food', hp:10, stamina:8, genki:12, msg:'元気度+12'},
    {icon:'🍓', name:'いちご', type:'food', hp:7, stamina:5, genki:9, msg:'元気度+9'},
    {icon:'🍟', name:'ポテト', type:'food', hp:8, stamina:13, genki:5, msg:'スタミナ+13'},
    {icon:'🍔', name:'バーガー', type:'food', hp:22, stamina:10, genki:5, msg:'HP大回復'},
    {icon:'🧋', name:'タピオカ', type:'drink', hp:4, stamina:10, genki:14, msg:'元気度+14'},
    {icon:'☕️', name:'コーヒー', type:'drink', hp:0, stamina:18, genki:10, msg:'スタミナ+18'},
    {icon:'🫖', name:'お茶', type:'drink', hp:5, stamina:8, genki:12, msg:'落ち着く'},
    {icon:'🍷', name:'グレープジュース', type:'drink', hp:6, stamina:6, genki:16, msg:'元気度+16'},
    {icon:'🥤', name:'アイスティー', type:'drink', hp:4, stamina:12, genki:10, msg:'スタミナ+12'},
    {icon:'🧃', name:'サイダー', type:'drink', hp:3, stamina:14, genki:12, msg:'シュワッと回復'},
    {icon:'⚡', name:'エナジードリンク', type:'drink', hp:-2, stamina:30, genki:18, msg:'スタミナ特大'},
  ];

  function calcPlayRadius(count){
    return Math.max(200, Math.round(180 + count * 5.5));
  }
  function clampStat(v,max){ return Math.max(0, Math.min(max,v)); }
  function updateStatsUI(){
    const hpPct=100*stats.hp/stats.maxHp, stPct=100*stats.stamina/stats.maxStamina, gkPct=100*stats.genki/stats.maxGenki;
    barHp.style.width=hpPct+'%'; barStamina.style.width=stPct+'%'; barGenki.style.width=gkPct+'%';
    valHp.textContent=Math.ceil(stats.hp); valStamina.textContent=Math.ceil(stats.stamina); valGenki.textContent=Math.ceil(stats.genki);
  }
  function applyItem(def){
    const healBonus = selectedChar.healBonus || 1;
    stats.hp = clampStat(stats.hp + (def.hp||0)*healBonus, stats.maxHp);
    stats.stamina = clampStat(stats.stamina + (def.stamina||0)*healBonus, stats.maxStamina);
    stats.genki = clampStat(stats.genki + (def.genki||0)*healBonus, stats.maxGenki);
    updateStatsUI();
  }

  function makeBillboard(text, font='28px sans-serif', color='#fff'){
    const c=document.createElement('canvas'); const ctx=c.getContext('2d');
    ctx.font=font; const tw=Math.ceil(ctx.measureText(text).width);
    c.width=tw+16; c.height=44; const g=c.getContext('2d');
    g.font=font; g.fillStyle='rgba(15,23,42,0.55)'; roundRectCtx(g,1,1,c.width-2,c.height-2,8); g.fill();
    g.fillStyle=color; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,c.width/2,c.height/2+1);
    const tex=new THREE.CanvasTexture(c); tex.minFilter=THREE.LinearFilter;
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false}));
    const s=0.03; sp.scale.set(c.width*s,c.height*s,1); sp.renderOrder=10; return sp;
  }

  function spawnItems(){
    // clear old
    for (const it of items){ if(it.mesh) scene.remove(it.mesh); }
    items=[];
    const count = Math.max(20, Math.floor(playRadius/12));
    for(let i=0;i<count;i++){
      const def = ITEM_DEFS[Math.floor(Math.random()*ITEM_DEFS.length)];
      const a=Math.random()*Math.PI*2, r=Math.random()* (playRadius-20);
      const x=Math.cos(a)*r, z=Math.sin(a)*r;
      if(collides(x,z)) continue;
      const groupI=new THREE.Group();
      const sprite=makeBillboard(def.icon, '34px serif', '#fff');
      sprite.position.y=1.4;
      groupI.add(sprite);
      const ring=new THREE.Mesh(new THREE.RingGeometry(0.25,0.35,24), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.5, side:THREE.DoubleSide}));
      ring.rotation.x=-Math.PI/2; ring.position.y=0.4; groupI.add(ring);
      groupI.position.set(x,0.35,z);
      scene.add(groupI);
      items.push({def,x,z,mesh:groupI,baseY:0.35,phase:Math.random()*Math.PI*2});
    }
  }

  function updateItems(dt){
    const t=performance.now()*0.001;
    for(let i=items.length-1;i>=0;i--){
      const it=items[i];
      if(!it.mesh) continue;
      it.mesh.position.y = it.baseY + Math.sin(t*2 + it.phase)*0.08;
      it.mesh.rotation.y += dt*0.8;
      const dx=player.x-it.x, dz=player.z-it.z;
      if(dx*dx+dz*dz < 1.5*1.5){
        applyItem(it.def);
        scene.remove(it.mesh); it.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose(); if(o.material){ if(Array.isArray(o.material))o.material.forEach(m=>m.dispose()); else o.material.dispose();}});
        items.splice(i,1);
      }
    }
  }

  function makeEnemyMesh(variant){
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({color:variant.body, roughness:0.72, metalness:0.08});
    const trimMat = new THREE.MeshStandardMaterial({color:variant.trim, roughness:0.8, metalness:0.05});
    const skinMat = new THREE.MeshStandardMaterial({color:variant.skin, roughness:0.75});
    const gunMat = new THREE.MeshStandardMaterial({color:0x2d3748, roughness:0.45, metalness:0.35});

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.72,0.34), bodyMat);
    torso.position.y = 1.08; torso.castShadow=true; g.add(torso);
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.58,0.28,0.32), trimMat);
    hips.position.y = 0.62; hips.castShadow=true; g.add(hips);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27,14,12), skinMat);
    head.position.y = 1.68; head.castShadow=true; g.add(head);
    // visor/eyes
    const eyeMat = new THREE.MeshStandardMaterial({color:0x111827, roughness:0.3});
    const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.05,0.02), eyeMat); eye1.position.set(-0.08,1.71,0.24); g.add(eye1);
    const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.05,0.02), eyeMat); eye2.position.set(0.08,1.71,0.24); g.add(eye2);
    // arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.56,0.16), bodyMat); armL.position.set(-0.39,1.02,0); armL.castShadow=true; g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.56,0.16), bodyMat); armR.position.set(0.39,1.02,0.12); armR.rotation.x=-0.55; armR.castShadow=true; g.add(armR);
    // legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.62,0.2), trimMat); legL.position.set(-0.15,0.31,0); legL.castShadow=true; g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.62,0.2), trimMat); legR.position.set(0.15,0.31,0); legR.castShadow=true; g.add(legR);
    // gun
    const gun = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.1,0.55), gunMat); barrel.position.set(0,0,0.28); gun.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.18,0.1), gunMat); grip.position.set(0,-0.11,0.05); gun.add(grip);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.06), new THREE.MeshStandardMaterial({color:0xfbbf24, emissive:0xf59e0b, emissiveIntensity:0.4})); muzzle.position.set(0,0,0.58); gun.add(muzzle);
    gun.position.set(0.42,1.02,0.36);
    gun.rotation.x = -0.55;
    g.add(gun);
    g.userData.gun = gun;
    g.userData.muzzle = muzzle;
    return g;
  }

  function disposeObject3D(obj){
    if(!obj) return;
    obj.traverse(o=>{
      if(o.geometry) o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose());
        else o.material.dispose();
      }
    });
  }

  function spawnEnemies(){
    for (const e of enemies){ if(e.mesh){ scene.remove(e.mesh); disposeObject3D(e.mesh); } }
    for (const b of enemyBullets){ if(b.mesh){ scene.remove(b.mesh); disposeObject3D(b.mesh); } }
    enemies=[];
    enemyBullets=[];
    const n = Math.max(3, Math.min(99, enemyCount));
    for(let i=0;i<n;i++){
      let x=0,z=0,ok=false;
      for(let tries=0;tries<200;tries++){
        const a=Math.random()*Math.PI*2, r=30+Math.random()*(playRadius-40);
        x=Math.cos(a)*r; z=Math.sin(a)*r;
        if(!collides(x,z) && Math.hypot(x-player.x,z-player.z)>25){ ok=true; break; }
      }
      if(!ok) continue;
      const variant = ENEMY_VARIANTS[i % ENEMY_VARIANTS.length];
      const mesh = makeEnemyMesh(variant);
      mesh.position.set(x,0.35,z);
      scene.add(mesh);
      enemies.push({
        id:i, x, z, y:0.35, mesh, variant,
        name: variant.name,
        hp:55, maxHp:55, alive:true, dying:false, deathT:0,
        speed:1.8+Math.random()*1.4,
        dir:Math.random()*Math.PI*2, turnT:0,
        atkCd:0.8+Math.random()*1.2,
        shootCd:0.6+Math.random()*1.4,
        target:null, // 'player' or enemy id
        flashT:0
      });
    }
  }

  function enemyCanTarget(e, target){
    if(!target) return false;
    if(target==='player') return stats.hp>0;
    if(target === e) return false;
    return target.alive && !target.dying;
  }

  function pickEnemyTarget(e){
    let best=null, bestD=Infinity;
    // consider player
    const dp=Math.hypot(player.x-e.x, player.z-e.z);
    if(dp < 70) { best='player'; bestD=dp; }
    // consider other enemies - fight each other
    for(const o of enemies){
      if(o===e || !o.alive || o.dying) continue;
      const d=Math.hypot(o.x-e.x, o.z-e.z);
      if(d < 45 && d < bestD*0.85){ best=o; bestD=d; }
    }
    // occasionally prefer enemy fights for variety
    if(best==='player' && Math.random()<0.35){
      let be=null, bd=Infinity;
      for(const o of enemies){
        if(o===e || !o.alive || o.dying) continue;
        const d=Math.hypot(o.x-e.x, o.z-e.z);
        if(d<55 && d<bd){ be=o; bd=d; }
      }
      if(be) best=be;
    }
    return best;
  }

  function spawnEnemyBullet(e, tx, tz){
    if(enemyBullets.length>180) return;
    const dir=Math.atan2(tx-e.x, tz-e.z);
    const muzzleY = e.y + 1.25;
    const mx = e.x + Math.sin(dir)*0.7;
    const mz = e.z + Math.cos(dir)*0.7;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({color:0xfff176, emissive:0xffb300, emissiveIntensity:1.8, roughness:0.2})
    );
    mesh.position.set(mx, muzzleY, mz);
    scene.add(mesh);
    enemyBullets.push({mesh, x:mx, y:muzzleY, z:mz, dir, speed:28, life:2.2, owner:e, dmg:8});
  }

  function updateEnemyBullets(dt){
    for(let i=enemyBullets.length-1;i>=0;i--){
      const b=enemyBullets[i];
      b.life -= dt;
      const nx=b.x + Math.sin(b.dir)*b.speed*dt;
      const nz=b.z + Math.cos(b.dir)*b.speed*dt;
      b.x=nx; b.z=nz;
      if(b.mesh) b.mesh.position.set(b.x,b.y,b.z);
      let hit=false;
      // hit player
      if(stats.hp>0){
        const dpl=Math.hypot(player.x-b.x, player.z-b.z);
        if(dpl < 0.7 && Math.abs((player.y+0.2)-b.y) < 1.6){
          stats.hp = clampStat(stats.hp - b.dmg, stats.maxHp);
          stats.genki = clampStat(stats.genki - 1.5, stats.maxGenki);
          updateStatsUI();
          hit=true;
        }
      }
      // hit enemies
      if(!hit){
        for(const e of enemies){
          if(!e.alive || e.dying || e===b.owner) continue;
          const de=Math.hypot(e.x-b.x, e.z-b.z);
          if(de < 0.75 && Math.abs((e.y+1.0)-b.y) < 1.5){
            damageEnemy(e, b.dmg, b.owner);
            hit=true;
            break;
          }
        }
      }
      if(hit || b.life<=0 || Math.abs(b.x)>playRadius+50 || Math.abs(b.z)>playRadius+50 || collides(b.x,b.z)){
        if(b.mesh){ scene.remove(b.mesh); disposeObject3D(b.mesh); }
        enemyBullets.splice(i,1);
      }
    }
  }

  function updateEnemies(dt){
    for(const e of enemies){
      if(!e.mesh) continue;
      if(e.dying){
        e.deathT -= dt;
        e.mesh.rotation.x = Math.min(Math.PI/2, e.mesh.rotation.x + dt*2.8);
        e.mesh.position.y = Math.max(-0.2, e.mesh.position.y - dt*0.8);
        e.mesh.traverse(o=>{ if(o.material && o.material.transparent!==undefined){ o.material.transparent=true; o.material.opacity=Math.max(0, e.deathT/0.9); }});
        if(e.deathT<=0){
          scene.remove(e.mesh); disposeObject3D(e.mesh); e.mesh=null;
        }
        continue;
      }
      if(!e.alive) continue;
      e.flashT = Math.max(0, e.flashT-dt);

      const dp=Math.hypot(player.x-e.x, player.z-e.z);
      e.mesh.visible = dp <= 10;
      e.turnT -= dt;
      e.shootCd -= dt;

      // pick/validate target
      if(!enemyCanTarget(e, e.target) || Math.random()<dt*0.5){
        e.target = pickEnemyTarget(e);
      }

      let tx, tz, tdist, hasTarget=false;
      if(e.target==='player'){ tx=player.x; tz=player.z; tdist=dp; hasTarget=true; }
      else if(e.target && enemyCanTarget(e,e.target)){ tx=e.target.x; tz=e.target.z; tdist=Math.hypot(tx-e.x, tz-e.z); hasTarget=true; }
      else { e.target=null; }

      if(hasTarget && tdist < 90){
        e.dir = Math.atan2(tx-e.x, tz-e.z);
        const wantDist = 10 + (e.id%5)*2;
        let sp = e.speed;
        if(tdist < wantDist-2) sp = -e.speed*0.55;
        else if(tdist < wantDist+2) sp = 0;
        if(sp!==0){
          const nx=e.x + Math.sin(e.dir)*sp*dt;
          const nz=e.z + Math.cos(e.dir)*sp*dt;
          if(!collides(nx,nz)){ e.x=nx; e.z=nz; }
          else if(!collides(nx,e.z)) e.x=nx;
          else if(!collides(e.x,nz)) e.z=nz;
          else e.dir += Math.PI*0.5;
        }
        // shoot at target
        if(tdist < 55 && e.shootCd<=0){
          spawnEnemyBullet(e, tx, tz);
          e.shootCd = 0.9 + Math.random()*1.1;
        }
      } else {
        if(e.turnT<=0){ e.dir += (Math.random()-0.5)*1.5; e.turnT=1+Math.random()*2; }
        const nx=e.x + Math.sin(e.dir)*e.speed*0.35*dt;
        const nz=e.z + Math.cos(e.dir)*e.speed*0.35*dt;
        if(!collides(nx,nz)){ e.x=nx; e.z=nz; } else e.dir += Math.PI*0.7;
      }

      // keep in radius
      const d0=Math.hypot(e.x,e.z);
      if(d0>playRadius-5){ e.x*= (playRadius-5)/d0; e.z*= (playRadius-5)/d0; }
      e.mesh.position.set(e.x,0.35,e.z);
      e.mesh.rotation.y = e.dir;

      // hit flash
      if(e.flashT>0){
        e.mesh.traverse(o=>{ if(o.isMesh && o.material && o.material.emissive){ o.material.emissive.setHex(0xff3333); o.material.emissiveIntensity=0.6; }});
      } else {
        e.mesh.traverse(o=>{ if(o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity!==undefined){ if(o.material.color && o.material.color.getHex()===0xfbbf24){ o.material.emissive.setHex(0xf59e0b); o.material.emissiveIntensity=0.4; } else { o.material.emissive.setHex(0x000000); o.material.emissiveIntensity=0; } }});
      }
    }
  }

  function damageEnemy(e, dmg, attacker){
    if(!e.alive || e.dying) return;
    e.hp -= dmg;
    e.flashT = 0.12;
    if(e.hp<=0){
      e.hp=0; e.alive=false; e.dying=true; e.deathT=0.9;
      // death effect: brief burst (small emissive flash via scale pop)
      if(e.mesh){ e.mesh.scale.set(1.05,1.05,1.05); }
    }
  }

  function shootAtEnemies(){
    // apply damage (visual handled in doShoot)
    const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    const origin=camera.position.clone();
    let best=null, bestT=999;
    for(const e of enemies){
      if(!e.alive || !e.mesh || !e.mesh.visible) continue;
      // ray-sphere-ish test against body
      const cx=e.x, cy=1.2+0.35, cz=e.z, r=0.8;
      const ox=origin.x-cx, oy=origin.y-cy, oz=origin.z-cz;
      const b=ox*dir.x+oy*dir.y+oz*dir.z;
      const c=b*b-(ox*ox+oy*oy+oz*oz-r*r);
      if(c<0) continue;
      const t=-b-Math.sqrt(c);
      if(t>0 && t<bestT){ bestT=t; best=e; }
    }
    if(best && bestT<120){ damageEnemy(best, 25); }
  }

  function updateHPTags(){
    const w=container.clientWidth, h=container.clientHeight;
    hpTagsEl.innerHTML='';
    const cam=camToScreen;
    function camToScreen(x,y,z){
      const v=new THREE.Vector3(x,y,z); v.project(camera);
      if(v.z>1) return null;
      return {x:(v.x*0.5+0.5)*w, y:(-v.y*0.5+0.5)*h};
    }
    // player
    const ps=camToScreen(player.x, player.y+0.9, player.z);
    if(ps){
      const d=document.createElement('div'); d.className='hp-tag'; d.style.left=ps.x+'px'; d.style.top=ps.y+'px';
      d.innerHTML=`<div class="name">YOU</div><div class="bar"><i style="width:${100*stats.hp/stats.maxHp}%"></i></div>`;
      hpTagsEl.appendChild(d);
    }
    for(const e of enemies){
      if(!e.alive) continue;
      const dx=e.x-player.x, dz=e.z-player.z; if(dx*dx+dz*dz>10*10) continue;
      const s=camToScreen(e.x, 2.7, e.z); if(!s) continue;
      const d=document.createElement('div'); d.className='hp-tag enemy'; d.style.left=s.x+'px'; d.style.top=s.y+'px';
      d.innerHTML=`<div class="name">${e.name||'敵CPU'}</div><div class="bar"><i style="width:${100*e.hp/e.maxHp}%"></i></div>`;
      hpTagsEl.appendChild(d);
    }
  }

  function drawBigMap(){
    const c=bigmapCanvas, ctx=bigmapCtx; const w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h); ctx.fillStyle='rgba(10,16,28,0.7)'; ctx.fillRect(0,0,w,h);
    const bounds={minX:-playRadius,maxX:playRadius,minZ:-playRadius,maxZ:playRadius};
    const pad=20, bw=bounds.maxX-bounds.minX, bd=bounds.maxZ-bounds.minZ;
    const scale=Math.min((w-pad*2)/bw,(h-pad*2)/bd);
    const ox=(w-bw*scale)/2 - bounds.minX*scale; const oy=(h-bd*scale)/2 - bounds.minZ*scale;
    const tx=x=>x*scale+ox, ty=z=>z*scale+oy;
    // buildings
    if(stageData.shinjuku){
      ctx.fillStyle='rgba(148,163,184,0.35)';
      for(const b of stageData.shinjuku.buildings){
        const ring=b.f&&b.f[0]; if(!ring||ring.length<3) continue;
        // quick bounds reject
        let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9; for(const p of ring){ if(p[0]<minx)minx=p[0]; if(p[0]>maxx)maxx=p[0]; if(p[1]<minz)minz=p[1]; if(p[1]>maxz)maxz=p[1]; }
        if(maxx<bounds.minX||minx>bounds.maxX||maxz<bounds.minZ||minz>bounds.maxZ) continue;
        ctx.beginPath(); ctx.moveTo(tx(ring[0][0]),ty(ring[0][1]));
        for(let i=1;i<ring.length;i++) ctx.lineTo(tx(ring[i][0]),ty(ring[i][1]));
        ctx.closePath(); ctx.fill();
      }
    }
    // items
    ctx.font='14px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    for(const it of items){ ctx.fillText(it.def.icon, tx(it.x), ty(it.z)); }
    // enemies
    for(const e of enemies){ if(!e.alive) continue; ctx.fillStyle='#fb7185'; ctx.beginPath(); ctx.arc(tx(e.x),ty(e.z),4,0,Math.PI*2); ctx.fill(); }
    // player
    const px=tx(player.x), py=ty(player.z);
    const a=Math.atan2(Math.cos(player.yaw), Math.sin(player.yaw));
    ctx.fillStyle='#60a5fa'; ctx.beginPath(); ctx.arc(px,py,6,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+Math.cos(a)*14,py+Math.sin(a)*14); ctx.stroke();
  }

  function renderCharPreview(c){
    const statsEl = document.getElementById('char-stats');
    if(statsEl && c){
      const rows = [
        {lbl:'HP', val:c.hp, max:150, color:'#ef4444'},
        {lbl:'スタミナ', val:c.stamina, max:150, color:'#22c55e'},
        {lbl:'元気度', val:c.genki, max:150, color:'#eab308'},
        {lbl:'スピード', val:Math.round((c.speed||1)*100), max:150, color:'#38bdf8'},
      ];
      statsEl.innerHTML = rows.map(r =>
        `<div class="char-stat-row"><span class="lbl">${r.lbl}</span><span class="bar"><i style="width:${Math.min(100,Math.round(r.val/r.max*100))}%;background:${r.color}"></i></span><span class="val">${r.val}</span></div>`
      ).join('');
    }
    charPreview.innerHTML='';
    const wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:14px;align-items:center;width:100%';
    const canvas=document.createElement('canvas');
    canvas.width=260; canvas.height=260; canvas.className='char-preview-canvas';
    const ctx=canvas.getContext('2d');
    const grd=ctx.createLinearGradient(0,0,0,260); grd.addColorStop(0,'#3b82f6'); grd.addColorStop(1,'#0f172a');
    ctx.fillStyle=grd; ctx.fillRect(0,0,260,260);
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(0,200,260,60);
    ctx.fillStyle='#94a3b8'; ctx.font='bold 13px sans-serif'; ctx.fillText('キャラプレビュー', 10, 22);
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(130,205,38,10,0,0,Math.PI*2); ctx.fill();
    // body
    ctx.fillStyle = c.id==='basque' ? '#3b82f6' : '#84cc16';
    roundRectCtx(ctx,100,105,60,72,12); ctx.fill();
    // head
    ctx.fillStyle='#f5cba7'; ctx.beginPath(); ctx.arc(130,78,28,0,Math.PI*2); ctx.fill();
    // eyes
    ctx.fillStyle='#111827'; ctx.beginPath(); ctx.arc(121,74,4,0,Math.PI*2); ctx.arc(139,74,4,0,Math.PI*2); ctx.fill();
    // mouth
    ctx.strokeStyle='#111827'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(130,86,7,0,Math.PI); ctx.stroke();
    // legs
    ctx.strokeStyle='#1f2937'; ctx.lineWidth=10; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(116,172); ctx.lineTo(106,205); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(144,172); ctx.lineTo(154,205); ctx.stroke();
    if(c.weapon==='gun'){
      ctx.fillStyle='#475569'; ctx.fillRect(150,112,60,14);
      ctx.fillRect(162,124,14,26);
      ctx.fillStyle='#fbbf24'; ctx.fillRect(206,115,8,8);
      ctx.fillStyle='#fff'; ctx.font='bold 20px sans-serif'; ctx.fillText('🔫 銃', 160, 170);
    } else {
      ctx.fillStyle='#65a30d'; ctx.beginPath(); ctx.arc(170,128,18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#365314'; ctx.font='bold 22px sans-serif'; ctx.fillText('💣', 160, 135);
      ctx.fillStyle='#ecfccb'; ctx.font='bold 18px sans-serif'; ctx.fillText('💨 オナラ爆弾', 70, 185);
      ctx.fillStyle='rgba(163,230,53,0.28)';
      ctx.beginPath(); ctx.arc(55,145,30,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(35,125,20,0,Math.PI*2); ctx.fill();
    }
    const info=document.createElement('div'); info.className='char-preview-info';
    info.innerHTML=`<div class="pname">${c.icon} ${c.name}</div><div class="pweapon">${c.weapon==='gun'?'武器: 銃':'武器: オナラ爆弾'}</div><div class="pdesc">${c.desc}</div><div class="pstats">HP ${c.hp}<br>スタミナ ${c.stamina}<br>元気度 ${c.genki}</div>`;
    wrap.appendChild(canvas); wrap.appendChild(info);
    charPreview.appendChild(wrap);
  }

  function initCharacterSelect(){
    charOptions.innerHTML='';
    CHARACTERS.forEach((c,idx)=>{
      const btn=document.createElement('button'); btn.type='button'; btn.className='char-opt'+(idx===0?' selected':'');
      btn.innerHTML=`<span class="icon">${c.icon}</span><span class="nm">${c.name}</span><span class="desc">${c.desc}</span>`;
      btn.addEventListener('click',()=>{
        selectedChar=c; charOptions.querySelectorAll('.char-opt').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected');
        renderCharPreview(c);
      });
      charOptions.appendChild(btn);
    });
    renderCharPreview(selectedChar);
    enemyCountVal.textContent=String(enemyCountInput.value);
    enemyCountInput.addEventListener('input',()=>{ enemyCountVal.textContent=String(enemyCountInput.value); });
  }

  function startGame(){
    enemyCount = Math.max(3, Math.min(99, parseInt(enemyCountInput.value||'20',10)));
    playRadius = calcPlayRadius(enemyCount);
    stats.maxHp=selectedChar.hp; stats.hp=selectedChar.hp;
    stats.maxStamina=selectedChar.stamina; stats.stamina=selectedChar.stamina;
    stats.maxGenki=selectedChar.genki; stats.genki=selectedChar.genki;
    updateStatsUI();
    shootBtn.textContent = selectedChar.weapon === 'fart' ? 'オナラ爆弾' : '撃つ';
    updateWeaponModel();
    charSelect.classList.add('hidden');
    gameStarted=true;
    // Visible play-area boundary wall
    {
      const wallGroup = new THREE.Group();
      const wallGeo = new THREE.CylinderGeometry(playRadius, playRadius, 26, 72, 1, true);
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        emissive: 0xdc2626,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.y = 13;
      wallGroup.add(wallMesh);

      const curbGeo = new THREE.RingGeometry(Math.max(1, playRadius - 1.2), playRadius + 0.4, 72);
      const curbMat = new THREE.MeshBasicMaterial({
        color: 0xff453a,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
      });
      const curbMesh = new THREE.Mesh(curbGeo, curbMat);
      curbMesh.rotation.x = -Math.PI / 2;
      curbMesh.position.y = 0.25;
      wallGroup.add(curbMesh);

      scene.add(wallGroup);
      activeGroups.push(wallGroup);
    }
    spawnEnemies();
    spawnItems();
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
      new THREE.MeshStandardMaterial({color:0x3a4555, roughness:1, transparent:true, opacity:0.72})
    );
    ground.rotation.x = -Math.PI/2; ground.position.y = 0.35; ground.receiveShadow = true;
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
      geo.translate(0,0.38,0);
      roadGeoms.push(geo);
    }
    if(roadGeoms.length){
      const mergedRoad = mergeGeometries(roadGeoms);
      roadGeoms.forEach(g=>g.dispose());
      if(mergedRoad){
        mergedRoad.computeBoundingSphere();
        const rm = new THREE.Mesh(mergedRoad, roadMat);
        rm.receiveShadow = true;
        rm.frustumCulled = false;
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

    const bldMat = new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.62, metalness:0.08});
    function buildingColor(usage){
      const u = usage || '';
      if(u.includes('住宅')) return [0.91, 0.86, 0.78]; // warm beige
      if(u.includes('業務')) return [0.78, 0.83, 0.88]; // light blue-gray
      if(u.includes('商業')) return [0.86, 0.84, 0.80]; // light stone
      if(u.includes('文教厚生')) return [0.88, 0.86, 0.76]; // pale sand
      if(u.includes('宿泊')) return [0.84, 0.87, 0.82]; // soft sage-gray
      if(u.includes('官公庁')) return [0.82, 0.84, 0.86]; // civic gray
      if(u.includes('運輸倉庫')) return [0.80, 0.80, 0.78]; // concrete
      if(u.includes('工場')||u.includes('供給処理')) return [0.78, 0.79, 0.77];
      return [0.83, 0.85, 0.87]; // default light concrete
    }
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
        const base = 0.36; // sit on flat ground
        const geo = new THREE.ExtrudeGeometry(shape, {depth: h, bevelEnabled:false});
        geo.rotateX(-Math.PI/2);
        geo.translate(0, base, 0);
        // vertex colors
        const col = buildingColor(b.u);
        const pos = geo.attributes.position;
        const colArr = new Float32Array(pos.count*3);
        for(let i=0;i<pos.count;i++){ colArr[i*3]=col[0]; colArr[i*3+1]=col[1]; colArr[i*3+2]=col[2]; }
        geo.setAttribute('color', new THREE.BufferAttribute(colArr,3));
        geoms.push(geo);

        for(const p of outer){ if(p[0]<minX)minX=p[0]; if(p[0]>maxX)maxX=p[0]; if(p[1]<minZ)minZ=p[1]; if(p[1]>maxZ)maxZ=p[1]; }
        if(base+h>maxY) maxY=base+h;

        // collider (AABB of footprint)
        let bx1=Infinity,bx2=-Infinity,bz1=Infinity,bz2=-Infinity;
        for(const p of outer){ if(p[0]<bx1)bx1=p[0]; if(p[0]>bx2)bx2=p[0]; if(p[1]<bz1)bz1=p[1]; if(p[1]>bz2)bz2=p[1]; }
        addCollider((bx1+bx2)/2,(bz1+bz2)/2,Math.max(1,bx2-bx1),Math.max(1,bz2-bz1),-0.35);
      }
      if(!geoms.length) continue;
      const merged = mergeGeometries(geoms);
      if(merged){
        geoms.forEach(g=>g.dispose());
        const mat = bldMat.clone();
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData.box = {minX,maxX,minZ,maxZ,maxY};
        group.add(mesh);
        occluders.push(mesh);
      } else {
        // fallback: add individually to avoid invisible walls
        for(const g of geoms){
          const m=new THREE.Mesh(g, bldMat.clone());
          m.castShadow=true; m.receiveShadow=true;
          m.userData.box={minX,maxX,minZ,maxZ,maxY};
          group.add(m); occluders.push(m);
        }
      }
    }

    // --- Integrated underground/station/bridges ---
    const indoorMat = new THREE.MeshStandardMaterial({color:0xd8d4cc, roughness:0.7, metalness:0.05});
    const indoorWallMat = new THREE.MeshStandardMaterial({color:0xe8e4dc, roughness:0.8, metalness:0.02, side:THREE.DoubleSide});
    const ugMat = new THREE.MeshStandardMaterial({color:0xb8c7c0, roughness:0.58, metalness:0.05, emissive:0x7f968d, emissiveIntensity:0.16});
    const bridgeMat = new THREE.MeshStandardMaterial({color:0x9aa3ad, roughness:0.75, metalness:0.1});
    const indoorFloorPalette = {
      '-1':0xd6ccb3, '-2':0xcfc3a8, '-3':0xc8bc9d, '-4':0xc1b592, '-5':0xbbae87, '-6':0xb4a77c, '-7':0xada071,
      '0':0xe7dcc2, '1':0xe1d4b8, '2':0xdbcdae, '3':0xd5c6a4
    };
    function indoorFloorMat(zl){
      const key=String(zl);
      const color = indoorFloorPalette[key] || 0xddd1b6;
      return new THREE.MeshStandardMaterial({color, roughness:0.52, metalness:0.06, emissive:0x8a7f68, emissiveIntensity:0.10});
    }

    function addIndoorLights(pts, color, intensity, dist, cap){
      let n=0;
      for(let i=0;i<pts.length && n<cap;i++){
        const p=pts[i];
        const pl=new THREE.PointLight(color, intensity, dist, 2);
        pl.position.set(p.x, p.y, p.z);
        group.add(pl); n++;
      }
    }

    // Underground mall rooms
    if (Array.isArray(data.underground)) {
      const geoms=[];
      const lightPts=[];
      for (const r of data.underground) {
        const rings=r.f; if(!rings||!rings.length) continue;
        const outer=rings[0]; if(outer.length<3) continue;
        const shape=new THREE.Shape();
        shape.moveTo(outer[0][0], -outer[0][1]);
        for(let i=1;i<outer.length;i++) shape.lineTo(outer[i][0], -outer[i][1]);
        for(let h=1;h<rings.length;h++){
          const holePts=rings[h]; if(holePts.length<3) continue;
          const hole=new THREE.Path(); hole.moveTo(holePts[0][0], -holePts[0][1]);
          for(let i=1;i<holePts.length;i++) hole.lineTo(holePts[i][0], -holePts[i][1]);
          shape.holes.push(hole);
        }
        const hgt=Math.max(2.5, r.h||3);
        const baseY=(r.z0||32.6) - 35.0 + 0.35;
        const geo=new THREE.ExtrudeGeometry(shape,{depth:hgt, bevelEnabled:false});
        geo.rotateX(-Math.PI/2);
        geo.translate(0, baseY, 0);
        geoms.push(geo);
        let sx=0,sz=0; for(const p of outer){sx+=p[0]; sz+=p[1];}
        lightPts.push({x:sx/outer.length, y:baseY+hgt-0.3, z:sz/outer.length});
      }
      if(geoms.length){
        const merged=mergeGeometries(geoms); geoms.forEach(g=>g.dispose());
        if(merged){ merged.computeBoundingSphere(); const m=new THREE.Mesh(merged, ugMat); m.frustumCulled=false; m.receiveShadow=true; group.add(m); }
      }
      // sparse lights
      const step=Math.max(1, Math.floor(lightPts.length/8));
      addIndoorLights(lightPts.filter((_,i)=>i%step===0), 0xfff2d6, 0.9, 14, 8);
    }

    // Station indoor floors
    if (Array.isArray(data.indoor)) {
      const byLevel=new Map();
      for (const r of data.indoor) {
        const zl=r.zl||0;
        if(!byLevel.has(zl)) byLevel.set(zl,[]);
        byLevel.get(zl).push(r);
      }
      const lightPts=[];
      for (const [zl, items] of byLevel) {
        const geoms=[];
        const baseY = 0.36 + zl * 4.0;
        for (const r of items) {
          const rings=r.f; if(!rings||!rings.length) continue;
          const outer=rings[0]; if(outer.length<3) continue;
          const shape=new THREE.Shape();
          shape.moveTo(outer[0][0], -outer[0][1]);
          for(let i=1;i<outer.length;i++) shape.lineTo(outer[i][0], -outer[i][1]);
          for(let h=1;h<rings.length;h++){
            const holePts=rings[h]; if(holePts.length<3) continue;
            const hole=new THREE.Path(); hole.moveTo(holePts[0][0], -holePts[0][1]);
            for(let i=1;i<holePts.length;i++) hole.lineTo(holePts[i][0], -holePts[i][1]);
            shape.holes.push(hole);
          }
          const geo=new THREE.ExtrudeGeometry(shape,{depth:0.25, bevelEnabled:false});
          geo.rotateX(-Math.PI/2);
          geo.translate(0, baseY, 0);
          geoms.push(geo);
          if(geoms.length % 12 === 0){
            let sx=0,sz=0; for(const p of outer){sx+=p[0]; sz+=p[1];}
            lightPts.push({x:sx/outer.length, y:baseY+3.2, z:sz/outer.length});
          }
        }
        if(!geoms.length) continue;
        const merged=mergeGeometries(geoms); geoms.forEach(g=>g.dispose());
        if(merged){ merged.computeBoundingSphere(); const m=new THREE.Mesh(merged, indoorFloorMat(zl)); m.frustumCulled=false; m.receiveShadow=true; group.add(m); }
      }
      const step=Math.max(1, Math.floor(lightPts.length/10));
      addIndoorLights(lightPts.filter((_,i)=>i%step===0), 0xfff4d8, 0.85, 12, 10);
    }

    // Bridges
    if (Array.isArray(data.bridges)) {
      const geoms=[];
      for (const r of data.bridges) {
        const rings=r.f; if(!rings||!rings.length) continue;
        const outer=rings[0]; if(outer.length<3) continue;
        const shape=new THREE.Shape();
        shape.moveTo(outer[0][0], -outer[0][1]);
        for(let i=1;i<outer.length;i++) shape.lineTo(outer[i][0], -outer[i][1]);
        const baseY=(r.z0||33.0)-35.0+0.35;
        const topY=(r.z1||40.0)-35.0+0.35;
        const hgt=Math.max(0.5, topY-baseY);
        const geo=new THREE.ExtrudeGeometry(shape,{depth:hgt, bevelEnabled:false});
        geo.rotateX(-Math.PI/2);
        geo.translate(0, baseY, 0);
        geoms.push(geo);
      }
      if(geoms.length){
        const merged=mergeGeometries(geoms); geoms.forEach(g=>g.dispose());
        if(merged){ merged.computeBoundingSphere(); const m=new THREE.Mesh(merged, bridgeMat); m.frustumCulled=false; m.receiveShadow=true; group.add(m); }
      }
    }

    // Station entity labels (sparse)
    if (Array.isArray(data.stationEntities)) {
      let shown=0;
      for (const e of data.stationEntities) {
        if(!e.n) continue;
        const fa=e.fa||'';
        const important = /改札|出口|ホーム|階段|エレベータ|トイレ|案内/.test(fa+e.n);
        if(!important) continue;
        const baseY = 0.36 + (e.zl||0)*4.0;
        const label=makeLabel(e.n, '#dbeafe');
        label.position.set(e.x, baseY+2.5, e.z);
        group.add(label);
        shown++; if(shown>80) break;
      }
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
    let hasNormal=false, hasColor=false;
    for(const g of valid){
      const pos=g.attributes.position;
      totalVerts += pos.count;
      totalIdx += g.index ? g.index.count : pos.count;
      if(g.attributes.normal) hasNormal=true;
      if(g.attributes.color) hasColor=true;
    }
    const posArr = new Float32Array(totalVerts*3);
    const normArr = hasNormal ? new Float32Array(totalVerts*3) : null;
    const colArr = hasColor ? new Float32Array(totalVerts*3) : null;
    const idxArr = (totalVerts > 65535) ? new Uint32Array(totalIdx) : new Uint16Array(totalIdx);
    let vOff=0, iOff=0;
    for(const g of valid){
      const pos=g.attributes.position;
      posArr.set(pos.array, vOff*3);
      if(normArr){
        const n=g.attributes.normal;
        if(n) normArr.set(n.array, vOff*3);
      }
      if(colArr){
        const c=g.attributes.color;
        if(c) colArr.set(c.array, vOff*3);
        else { for(let i=0;i<pos.count;i++){ colArr[(vOff+i)*3]=0.8; colArr[(vOff+i)*3+1]=0.8; colArr[(vOff+i)*3+2]=0.8; } }
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
    if(colArr) out.setAttribute('color', new THREE.BufferAttribute(colArr,3));
    out.setIndex(new THREE.BufferAttribute(idxArr,1));
    return out;
  }

  // --- Gun ---
  const gunGroup = new THREE.Group();
  let gunModel=null, fartModel=null;
  function buildGun(){
    gunGroup.clear();
    gunModel = new THREE.Group();
    const dark=new THREE.MeshStandardMaterial({color:0x2a2f38,roughness:0.4,metalness:0.6});
    const darker=new THREE.MeshStandardMaterial({color:0x1a1d22,roughness:0.5,metalness:0.5});
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.16,0.55),dark); body.position.set(0,-0.02,-0.2); gunModel.add(body);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.03,0.45,10),darker); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.03,-0.62); gunModel.add(barrel);
    const grip=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.18,0.12),darker); grip.position.set(0,-0.14,-0.05); grip.rotation.x=0.25; gunModel.add(grip);
    const mag=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.16,0.09),darker); mag.position.set(0,-0.22,-0.22); mag.rotation.x=0.15; gunModel.add(mag);
    const sight=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.03,0.02),new THREE.MeshStandardMaterial({color:0xff4444,emissive:0x441111})); sight.position.set(0,0.08,-0.35); gunModel.add(sight);
    const armG=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.11,0.5),new THREE.MeshStandardMaterial({color:0x2d3a4d,roughness:0.8})); armG.position.set(0.02,-0.14,0.18); armG.rotation.x=0.15; gunModel.add(armG);
    gunGroup.add(gunModel);

    fartModel = new THREE.Group();
    const armF=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.11,0.45),new THREE.MeshStandardMaterial({color:0x4d7c0f,roughness:0.8}));
    armF.position.set(0.02,-0.14,0.16); armF.rotation.x=0.2; fartModel.add(armF);
    const bomb=new THREE.Mesh(new THREE.SphereGeometry(0.11,16,16), new THREE.MeshStandardMaterial({color:0x65a30d, emissive:0x365314, emissiveIntensity:0.4, roughness:0.5}));
    bomb.position.set(0,-0.02,-0.18); fartModel.add(bomb);
    const fuse=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.08,8), new THREE.MeshStandardMaterial({color:0x78350f}));
    fuse.position.set(0,0.1,-0.18); fartModel.add(fuse);
    const spark=new THREE.Mesh(new THREE.SphereGeometry(0.025,8,8), new THREE.MeshBasicMaterial({color:0xfbbf24}));
    spark.position.set(0,0.15,-0.18); fartModel.add(spark);
    fartModel.visible=false;
    gunGroup.add(fartModel);

    gunGroup.position.set(0.28,-0.28,-0.55);
    camera.add(gunGroup); scene.add(camera);
  }
  function updateWeaponModel(){
    const isFart = selectedChar && selectedChar.weapon === 'fart';
    if(gunModel) gunModel.visible = !isFart;
    if(fartModel) fartModel.visible = isFart;
  }

  // --- Stages ---
  function getStageDef(id){
    if(id==='shinjuku') return {id:'shinjuku', name:'新宿駅周辺', shortName:'新宿', spawn:{x:0,z:55,yaw:Math.PI}};
    return null;
  }

  function canMoveFrom(x,z){
    let free=0;
    for(let a=0;a<8;a++){
      const ang=a*Math.PI/4;
      const nx=x+Math.cos(ang)*1.0, nz=z+Math.sin(ang)*1.0;
      if(!collides(nx,nz)) free++;
    }
    return free>=3;
  }
  function randomSafeSpawn(){
    const margin = 60; // keep away from edge bounds
    const minX = -980 + margin, maxX = 980 - margin;
    const minZ = -980 + margin, maxZ = 980 - margin;
    for(let i=0; i<800; i++){
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);
      if(!collides(x, z) && canMoveFrom(x,z)){
        return {x, z, yaw: Math.random() * Math.PI * 2};
      }
    }
    // fallback: spiral from center
    for(let r=5; r<=900; r+=5){
      for(let a=0; a<24; a++){
        const ang = (a/24)*Math.PI*2;
        const x = Math.cos(ang)*r, z = Math.sin(ang)*r;
        if(!collides(x,z) && canMoveFrom(x,z)) return {x, z, yaw: Math.random()*Math.PI*2};
      }
    }
    // last resort
    for(let r=5; r<=900; r+=5){
      for(let a=0; a<24; a++){
        const ang = (a/24)*Math.PI*2;
        const x = Math.cos(ang)*r, z = Math.sin(ang)*r;
        if(!collides(x,z)) return {x, z, yaw: Math.random()*Math.PI*2};
      }
    }
    return {x:0, z:55, yaw:Math.PI};
  }

  function switchStage(id){
    currentStageId = 'shinjuku';
    const def = getStageDef('shinjuku');
    if(!def) return;
    if(stageData.shinjuku){
      buildPlateauStage(stageData.shinjuku);
    } else {
      clearStageObjects();
    }
    const spawn = randomSafeSpawn();
    player.x=spawn.x; player.z=spawn.z; player.y=2.05; player.yaw=spawn.yaw; player.pitch=0; player.vy=0; player.grounded=true;
    unstuckPlayer();
    keys.clear(); resetJoystick(); updateStageUI();
  }

  function updateStageUI(){
    const def=getStageDef(currentStageId);
    minimapLabel.textContent = def ? def.name : '-';
  }

  function buildStageUI(){
    if(stageSwitchEl){ stageSwitchEl.innerHTML=''; stageSwitchEl.style.display='none'; }
  }

  // --- Input ---
  const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right',W:'up',A:'left',S:'down',D:'right',q:'turnL',e:'turnR',Q:'turnL',E:'turnR'};
  window.addEventListener('keydown',e=>{const k=keyMap[e.key]; if(k){e.preventDefault(); keys.add(k);}});
  window.addEventListener('keyup',e=>{const k=keyMap[e.key]; if(k) keys.delete(k);});
  window.addEventListener('blur',()=>{keys.clear(); resetJoystick();});

  function setupJoystick(el, knob, state) {
    function setFromEvent(e){
      const base = el.querySelector('.joystick-base');
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.hypot(dx,dy);
      const maxR = rect.width * 0.28;
      if(dist>maxR){ dx=dx/dist*maxR; dy=dy/dist*maxR; }
      state.x = dx/maxR; state.y = -(dy/maxR);
      state.active = Math.hypot(state.x,state.y) > 0.06;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      el.classList.toggle('active', state.active);
    }
    function reset(){
      state.active=false; state.x=0; state.y=0; state.pointerId=null;
      knob.style.transform='translate(-50%,-50%)';
      el.classList.remove('active');
    }
    el.addEventListener('pointerdown', e=>{
      e.preventDefault();
      state.pointerId=e.pointerId;
      try{ el.setPointerCapture(e.pointerId); }catch(_){}
      setFromEvent(e);
    });
    el.addEventListener('pointermove', e=>{ if(e.pointerId!==state.pointerId) return; e.preventDefault(); setFromEvent(e); });
    const end=e=>{ if(e.pointerId!==state.pointerId) return; e.preventDefault(); reset(); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // window fallback in case pointer capture fails
    window.addEventListener('pointermove', e=>{ if(e.pointerId!==state.pointerId) return; setFromEvent(e); });
    window.addEventListener('pointerup', e=>{ if(e.pointerId!==state.pointerId) return; reset(); });
    return reset;
  }
  const resetMoveJoy = setupJoystick(moveStickEl, moveStickKnob, moveJoy);
  const resetLookJoy = setupJoystick(lookStickEl, lookStickKnob, lookJoy);
  function resetJoystick(){ resetMoveJoy(); resetLookJoy(); }

  // --- Actions: jump / shoot ---
  let shootCooldown = 0;
  function doJump(){
    if(player.grounded){ player.vy = 7.5; player.grounded = false; }
  }
  function fartBombAttack(){
    const radius = 6;
    const center = new THREE.Vector3(player.x, 1.0, player.z);
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 16),
      new THREE.MeshStandardMaterial({color:0x7cb342, emissive:0x33691e, emissiveIntensity:0.6, transparent:true, opacity:0.35, depthWrite:false})
    );
    cloud.position.copy(center);
    scene.add(cloud);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, radius, 32),
      new THREE.MeshBasicMaterial({color:0xaed581, transparent:true, opacity:0.45, side:THREE.DoubleSide})
    );
    ring.rotation.x = -Math.PI/2; ring.position.set(player.x, 0.5, player.z);
    scene.add(ring);
    let t0 = performance.now();
    const anim = setInterval(()=>{
      const t = (performance.now()-t0)/1000;
      cloud.scale.setScalar(0.6 + t*1.2);
      cloud.material.opacity = Math.max(0, 0.35 - t*0.25);
      ring.scale.setScalar(0.8 + t*1.5);
      ring.material.opacity = Math.max(0, 0.45 - t*0.35);
      if(t>1.2){ clearInterval(anim); scene.remove(cloud); scene.remove(ring); cloud.geometry.dispose(); cloud.material.dispose(); ring.geometry.dispose(); ring.material.dispose(); }
    }, 50);
    for(const e of enemies){
      if(!e.alive) continue;
      const dx=e.x-player.x, dz=e.z-player.z;
      if(dx*dx+dz*dz <= radius*radius){ damageEnemy(e, 35); }
    }
  }

  function doShoot(){
    const isFart = selectedChar && selectedChar.weapon === 'fart';
    if(shootCooldownPlayer > 0) return;
    shootCooldownPlayer = isFart ? 0.9 : 0.22;
    if(isFart){
      fartBombAttack();
      return;
    }
    // muzzle flash
    const flash = new THREE.PointLight(0xfff2a8, 8, 8);
    const muzzle = new THREE.Vector3(0.28,-0.22,-1.2).applyMatrix4(camera.matrixWorld);
    flash.position.copy(muzzle);
    scene.add(flash);
    setTimeout(()=>scene.remove(flash), 60);
    // tracer
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const start = muzzle.clone();
    const end = start.clone().add(dir.multiplyScalar(80));
    const geo = new THREE.BufferGeometry().setFromPoints([start,end]);
    const mat = new THREE.LineBasicMaterial({color:0xfff3b0, transparent:true, opacity:0.9});
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    setTimeout(()=>{ scene.remove(line); geo.dispose(); mat.dispose(); }, 80);
    // small recoil
    player.pitch += 0.01;
    shootAtEnemies();
  }
  jumpBtn.addEventListener('pointerdown', e=>{ e.preventDefault(); doJump(); });
  shootBtn.addEventListener('pointerdown', e=>{ e.preventDefault(); doShoot(); });
  window.addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); doJump(); } });

  // --- Collision ---
  const playerRadius=0.32;
  function collides(x,z){ for(const c of colliders){ if(x+playerRadius>c.minX && x-playerRadius<c.maxX && z+playerRadius>c.minZ && z-playerRadius<c.maxZ) return true; } return false; }
  function tryMove(nx,nz){
    // If already stuck inside a collider, allow movement out
    if(collides(player.x,player.z)){ player.x=nx; player.z=nz; return; }
    if(!collides(nx,nz)){player.x=nx;player.z=nz;return;}
    if(!collides(nx,player.z)){player.x=nx;return;}
    if(!collides(player.x,nz)){player.z=nz;return;}
    // nudge around AABB corners/overhangs
    const dx=nx-player.x, dz=nz-player.z;
    const len=Math.hypot(dx,dz)||1;
    const px=-dz/len, pz=dx/len;
    for(const d of [0.3,0.6,1.0,-0.3,-0.6,-1.0]){
      const tx=nx+px*d, tz=nz+pz*d;
      if(!collides(tx,tz)){player.x=tx;player.z=tz;return;}
      if(!collides(tx,player.z)){player.x=tx;return;}
      if(!collides(player.x,tz)){player.z=tz;return;}
    }
  }
  function unstuckPlayer(){
    if(!collides(player.x,player.z)) return;
    const sx=player.x, sz=player.z;
    for(let r=1; r<=200; r+=1){
      const step = Math.max(1, r*0.5);
      for(let a=0; a<16; a++){
        const ang = (a/16)*Math.PI*2;
        const nx = sx + Math.cos(ang)*step;
        const nz = sz + Math.sin(ang)*step;
        if(!collides(nx,nz)){ player.x=nx; player.z=nz; return; }
      }
    }
  }

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
    const bounds={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};
    const bw=bounds.maxX-bounds.minX, bd=bounds.maxZ-bounds.minZ;
    const pad=10; const scale=Math.min((w-pad*2)/bw,(h-pad*2)/bd);
    const ox=(w-bw*scale)/2 - bounds.minX*scale;
    const oy=(h-bd*scale)/2 - bounds.minZ*scale;
    const tx=x=>x*scale+ox, ty=z=>z*scale+oy;
    ctx.fillStyle='rgba(100,116,139,0.55)';
    if(stageData.shinjuku){
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

  let lastTime=0, bobPhase=0, lastHpTagT=0, lastStatsUiT=0, lastBigMapT=0;
  function animate(ts){
    requestAnimationFrame(animate);
    if(!lastTime) lastTime=ts;
    const dt=Math.min((ts-lastTime)/1000,0.05); lastTime=ts;
    let ix=0,iy=0;
    if(keys.has('up')) iy+=1; if(keys.has('down')) iy-=1; if(keys.has('left')) ix-=1; if(keys.has('right')) ix+=1;
    if(moveJoy.active){ ix+=moveJoy.x; iy-=moveJoy.y; }
    // look stick
    if(lookJoy.active){
      player.yaw -= lookJoy.x * 2.2 * dt;
      player.pitch += lookJoy.y * 1.6 * dt;
      const pLim = Math.PI/2 - 0.15;
      if(player.pitch > pLim) player.pitch = pLim;
      if(player.pitch < -pLim) player.pitch = -pLim;
    }
    // keyboard turn (Q/E) for desktop
    if(keys.has('turnL')) player.yaw += 2.2 * dt;
    if(keys.has('turnR')) player.yaw -= 2.2 * dt;
    const moving=Math.hypot(ix,iy)>0.06;
    if(moving){
      const len=Math.hypot(ix,iy); if(len>1){ix/=len;iy/=len;}
      const speed=7.2;
      const fx=Math.sin(player.yaw), fz=Math.cos(player.yaw);
      const rx=Math.cos(player.yaw), rz=-Math.sin(player.yaw);
      const mx=fx*iy+rx*ix, mz=fz*iy+rz*ix; const ml=Math.hypot(mx,mz)||1;
      tryMove(player.x+(mx/ml)*speed*dt, player.z+(mz/ml)*speed*dt);
      bobPhase+=dt*8;
    } else { bobPhase*=0.9; }
    // jump physics
    shootCooldownPlayer = Math.max(0, shootCooldownPlayer - dt);
    if(!player.grounded || player.vy > 0){
      player.vy -= 18 * dt;
      player.y += player.vy * dt;
      if(player.y <= 2.05){
        player.y = 2.05; player.vy = 0; player.grounded = true;
      }
    } else {
      player.y = 2.05;
    }

    // gameplay updates
    if(gameStarted){
      const movingNow = moving;
      if(movingNow) stats.stamina = clampStat(stats.stamina - 0.9*dt, stats.maxStamina);
      else stats.stamina = clampStat(stats.stamina + 7*dt*(selectedChar.staminaRegen||1), stats.maxStamina);
      if(stats.stamina < 15) stats.genki = clampStat(stats.genki - 1.5*dt, stats.maxGenki);
      else stats.genki = clampStat(stats.genki + 0.8*dt, stats.maxGenki);
      if(stats.genki <= 0) stats.hp = clampStat(stats.hp - 2*dt, stats.maxHp);
      // clamp to play radius
      const dpr=Math.hypot(player.x,player.z);
      if(dpr>playRadius-2){ const s=(playRadius-2)/dpr; player.x*=s; player.z*=s; }
      updateItems(dt);
      updateEnemies(dt);
      updateEnemyBullets(dt);
      if(ts-lastHpTagT>150){ updateHPTags(); lastHpTagT=ts; }
      if(!bigmap.classList.contains('hidden') && ts-lastBigMapT>400){ drawBigMap(); lastBigMapT=ts; }
      if(ts-lastStatsUiT>200){ updateStatsUI(); lastStatsUiT=ts; }
    }

    const bob=Math.sin(bobPhase)*(moving && player.grounded ? 0.035:0);
    camera.position.set(player.x, player.y+bob, player.z);
    camera.rotation.order='YXZ'; camera.rotation.y=player.yaw; camera.rotation.x=player.pitch;
    gunGroup.position.y=-0.28+Math.sin(bobPhase)*(moving?0.008:0);
    gunGroup.position.x=0.28+Math.sin(bobPhase*0.5)*(moving?0.004:0);
    drawMinimap();
    renderer.render(scene,camera);
  }

  // --- Init ---
  // prevent tap/double-tap zoom on mobile
  document.addEventListener('dblclick', e => e.preventDefault(), {passive:false});
  document.addEventListener('gesturestart', e => e.preventDefault(), {passive:false});
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const t = e.target;
    if (t && t.closest && t.closest('.joystick, .action-btn, button')) { lastTouchEnd = Date.now(); return; }
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, {passive:false});

  buildGun(); buildStageUI(); resize(); initCharacterSelect(); updateStatsUI();
  mapToggle.addEventListener('click',()=>{ bigmap.classList.toggle('hidden'); if(!bigmap.classList.contains('hidden')) drawBigMap(); });
  bigmapClose.addEventListener('click',()=>bigmap.classList.add('hidden'));
  startGameBtn.addEventListener('click',()=>{ if(stageData.shinjuku){ startGame(); } else { startGameBtn.textContent='読込中...'; startGameBtn.disabled=true; window.__pendingStart=true; } });
  requestAnimationFrame(animate);
  minimapLabel.textContent = '新宿データ読込中...';
  fetch('./data/shinjuku_plateau.json')
    .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(data=>{
      stageData.shinjuku=data;
      switchStage('shinjuku');
      if(window.__pendingStart){ startGame(); }
    })
    .catch(err=>{
      console.error('Failed to load plateau data', err);
      minimapLabel.textContent = '新宿データ読込失敗';
    });
})();

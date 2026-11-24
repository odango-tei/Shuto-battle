import * as THREE from 'three';
import { AREA_DATA } from './data/areas.js';

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
  scene.background = new THREE.Color(0x87b5d6);
  scene.fog = new THREE.Fog(0x87b5d6, 180, 650);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x445566, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(120, 220, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 320;
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 700;
  scene.add(sun);

  // --- State ---
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const buildingMeshes = []; // for occlusion fading
  const raycaster = new THREE.Raycaster();
  let currentStageId = AREA_DATA.areas[0].id;
  const keys = new Set();
  const joystick = { active: false, x: 0, y: 0, pointerId: null };
  const player = { x: 0, y: 1.7, z: 0, yaw: 0, pitch: 0 };

  // --- Helpers ---
  function roundRectCtx(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function makeLabel(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 32px sans-serif';
    const tw = Math.ceil(ctx.measureText(text).width);
    canvas.width = tw + 28;
    canvas.height = 54;
    const c = canvas.getContext('2d');
    c.font = 'bold 32px sans-serif';
    c.fillStyle = 'rgba(15,23,42,0.72)';
    roundRectCtx(c, 2, 2, canvas.width - 4, canvas.height - 4, 10);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 2; c.stroke();
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
    const s = 0.045;
    sprite.scale.set(canvas.width * s, canvas.height * s, 1);
    return sprite;
  }

  function addCollider(x, z, w, d, pad = 0.8) {
    colliders.push({ minX: x - w / 2 - pad, maxX: x + w / 2 + pad, minZ: z - d / 2 - pad, maxZ: z + d / 2 + pad });
  }

  function createGround(g) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(g.width, g.depth),
      new THREE.MeshStandardMaterial({ color: g.color, roughness: 0.95, metalness: 0.03 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(g.x, 0, g.z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  function createRoad(r) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(r.width, r.depth),
      new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.92, metalness: 0.02 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(r.x, 0.015, r.z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    const isX = r.width >= r.depth;
    const len = (isX ? r.width : r.depth) - 8;
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(isX ? len : 0.35, isX ? 0.35 : len),
      new THREE.MeshBasicMaterial({ color: 0xf5d76e, transparent: true, opacity: 0.35 })
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(r.x, 0.025, r.z);
    scene.add(line);
  }

  function createCrosswalk(cw) {
    const stripes = 6;
    const alongW = cw.w >= cw.d;
    const stripeW = (alongW ? cw.w : cw.d) / (stripes * 2 - 1);
    for (let i = 0; i < stripes; i++) {
      const geo = new THREE.PlaneGeometry(alongW ? stripeW * 0.85 : cw.d, alongW ? cw.d : stripeW * 0.85);
      const mat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.8 });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      const off = (i - (stripes - 1) / 2) * stripeW * 2;
      m.position.set(cw.x + (alongW ? off : 0), 0.03, cw.z + (alongW ? 0 : off));
      scene.add(m);
    }
  }

  function registerOccluder(mesh, box) {
    mesh.userData.occluder = true;
    mesh.userData.box = box; // {minX,maxX,minZ,maxZ, maxY}
    mesh.userData.baseOpacity = mesh.material.opacity ?? 1;
    mesh.userData.baseTransparent = !!mesh.material.transparent;
    buildingMeshes.push(mesh);
  }

  function createBuilding(b) {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.5, metalness: 0.12, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);

    // windows
    if (b.h > 20) {
      const winMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.08 });
      for (let y = 6; y < b.h - 3; y += 6) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.12, 1.0, b.d + 0.12), winMat);
        s.position.set(b.x, y, b.z);
        scene.add(s);
      }
    }
    // edges
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 })
    );
    edges.position.copy(mesh.position);
    scene.add(edges);

    if (b.label) {
      const label = makeLabel(b.label, '#f8fafc');
      label.position.set(b.x, b.h + 5, b.z);
      scene.add(label);
    }

    addCollider(b.x, b.z, b.w, b.d, 0.8);
    registerOccluder(mesh, { minX: b.x - b.w/2, maxX: b.x + b.w/2, minZ: b.z - b.d/2, maxZ: b.z + b.d/2, maxY: b.h });
  }

  function createTree(t) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.9, transparent: true, opacity: 1 })
    );
    trunk.position.set(t.x, 1.2, t.z);
    trunk.castShadow = true; trunk.receiveShadow = true;
    scene.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x2f855a, roughness: 0.95, transparent: true, opacity: 1 })
    );
    foliage.position.set(t.x, 3.5, t.z);
    foliage.castShadow = true;
    scene.add(foliage);

    addCollider(t.x, t.z, 1.0, 1.0, 0.5);
    registerOccluder(foliage, { minX: t.x-1.8, maxX: t.x+1.8, minZ: t.z-1.8, maxZ: t.z+1.8, maxY: 5.5 });
  }

  function createLandmark(lm) {
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
    );
    pin.position.set(lm.x, 2.25, lm.z);
    scene.add(pin);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 12),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(lm.color || '#fbbf24'), emissive: new THREE.Color(lm.color || '#fbbf24'), emissiveIntensity: 0.4 })
    );
    head.position.set(lm.x, 4.8, lm.z);
    scene.add(head);
    const label = makeLabel(lm.name, lm.color || '#ffffff');
    label.position.set(lm.x, 7.2, lm.z);
    scene.add(label);
  }

  function addBoundsColliders(bounds) {
    const t = 6, w = bounds.maxX - bounds.minX, d = bounds.maxZ - bounds.minZ;
    const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2;
    addCollider(cx, bounds.minZ - t/2, w + t*2, t, 0);
    addCollider(cx, bounds.maxZ + t/2, w + t*2, t, 0);
    addCollider(bounds.minX - t/2, cz, t, d + t*2, 0);
    addCollider(bounds.maxX + t/2, cz, t, d + t*2, 0);
  }

  function buildWorld() {
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.06;
    base.receiveShadow = true;
    scene.add(base);

    for (const area of AREA_DATA.areas) {
      createGround(area.ground);
      for (const r of area.roads || []) createRoad(r);
      for (const cw of area.crosswalks || []) createCrosswalk(cw);
      for (const b of area.buildings || []) createBuilding(b);
      for (const t of area.trees || []) createTree(t);
      for (const lm of area.landmarks || []) createLandmark(lm);
      addBoundsColliders(area.bounds);
    }
  }

  // --- Gun (first-person) ---
  const gunGroup = new THREE.Group();
  function buildGun() {
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.4, metalness: 0.6 });
    const darker = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.5, metalness: 0.5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.55), dark);
    body.position.set(0, -0.02, -0.2);
    gunGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 10), darker);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.62);
    gunGroup.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.12), darker);
    grip.position.set(0, -0.14, -0.05);
    grip.rotation.x = 0.25;
    gunGroup.add(grip);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.09), darker);
    mag.position.set(0, -0.22, -0.22);
    mag.rotation.x = 0.15;
    gunGroup.add(mag);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x441111 }));
    sight.position.set(0, 0.08, -0.35);
    gunGroup.add(sight);

    // arm
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2d3a4d, roughness: 0.8 });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.5), armMat);
    arm.position.set(0.02, -0.14, 0.18);
    arm.rotation.x = 0.15;
    gunGroup.add(arm);

    gunGroup.position.set(0.28, -0.28, -0.55);
    camera.add(gunGroup);
    scene.add(camera);
  }

  // --- Stage ---
  function getStage(id) { return AREA_DATA.areas.find(a => a.id === id); }

  function switchStage(id) {
    const stage = getStage(id);
    if (!stage) return;
    currentStageId = id;
    player.x = stage.spawn.x;
    player.z = stage.spawn.z;
    player.y = 1.7;
    player.yaw = stage.spawn.yaw ?? 0;
    player.pitch = 0;
    keys.clear();
    resetJoystick();
    updateStageUI();
  }

  function updateStageUI() {
    document.querySelectorAll('.stage-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.stage === currentStageId);
    });
    const stage = getStage(currentStageId);
    minimapLabel.textContent = stage ? stage.name : '-';
  }

  function buildStageUI() {
    stageSwitchEl.innerHTML = '';
    for (const area of AREA_DATA.areas) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-btn';
      btn.dataset.stage = area.id;
      btn.textContent = area.shortName;
      btn.addEventListener('click', () => switchStage(area.id));
      stageSwitchEl.appendChild(btn);
    }
  }

  // --- Input: keyboard ---
  const keyMap = {
    ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
    w:'up', a:'left', s:'down', d:'right', W:'up', A:'left', S:'down', D:'right'
  };
  window.addEventListener('keydown', (e) => { const k = keyMap[e.key]; if (k) { e.preventDefault(); keys.add(k); } });
  window.addEventListener('keyup', (e) => { const k = keyMap[e.key]; if (k) keys.delete(k); });
  window.addEventListener('blur', () => { keys.clear(); resetJoystick(); });

  // --- Input: joystick ---
  function setJoystickFromEvent(e) {
    const base = joystickEl.querySelector('.joystick-base');
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxR = rect.width * 0.28;
    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
    joystick.x = dx / maxR;
    joystick.y = -(dy / maxR); // up is forward
    joystick.active = Math.hypot(joystick.x, joystick.y) > 0.06;
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joystickEl.classList.toggle('active', joystick.active);
  }
  function resetJoystick() {
    joystick.active = false; joystick.x = 0; joystick.y = 0; joystick.pointerId = null;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    joystickEl.classList.remove('active');
  }
  joystickEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joystick.pointerId = e.pointerId;
    joystickEl.setPointerCapture(e.pointerId);
    setJoystickFromEvent(e);
  });
  joystickEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joystick.pointerId) return;
    e.preventDefault();
    setJoystickFromEvent(e);
  });
  const joyEnd = (e) => { if (e.pointerId !== joystick.pointerId) return; e.preventDefault(); resetJoystick(); };
  joystickEl.addEventListener('pointerup', joyEnd);
  joystickEl.addEventListener('pointercancel', joyEnd);

  // --- Collision ---
  const playerRadius = 0.45;
  function collides(x, z) {
    for (const c of colliders) {
      if (x + playerRadius > c.minX && x - playerRadius < c.maxX && z + playerRadius > c.minZ && z - playerRadius < c.maxZ) return true;
    }
    return false;
  }
  function tryMove(nx, nz) {
    if (!collides(nx, nz)) { player.x = nx; player.z = nz; return; }
    if (!collides(nx, player.z)) { player.x = nx; return; }
    if (!collides(player.x, nz)) { player.z = nz; }
  }

  // --- Occlusion: fade buildings close to camera / blocking view ---
  function updateOcclusion() {
    const camPos = camera.position;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    // Raycast forward to detect buildings blocking view
    const hitSet = new Set();
    const dirs = [
      camDir.clone(),
      camDir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), 0.12),
      camDir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), -0.12),
      camDir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), 0.24),
      camDir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), -0.24),
    ];
    for (const dir of dirs) {
      raycaster.set(camPos, dir.normalize());
      raycaster.far = 18;
      const hits = raycaster.intersectObjects(buildingMeshes, false);
      for (const h of hits) hitSet.add(h.object);
    }

    for (const mesh of buildingMeshes) {
      const box = mesh.userData.box;
      if (!box) continue;
      const dx = Math.max(box.minX - camPos.x, 0, camPos.x - box.maxX);
      const dz = Math.max(box.minZ - camPos.z, 0, camPos.z - box.maxZ);
      const distXZ = Math.hypot(dx, dz);
      const close = distXZ < 5;
      const blocking = hitSet.has(mesh);
      const target = (close || blocking) ? 0.15 : 1.0;
      const cur = mesh.material.opacity;
      mesh.material.opacity += (target - cur) * 0.18;
      mesh.material.transparent = mesh.material.opacity < 0.99;
      mesh.material.depthWrite = mesh.material.opacity > 0.6;
    }
  }

  // --- Minimap ---
  function drawMinimap() {
    const stage = getStage(currentStageId);
    if (!stage) return;
    const w = minimap.width, h = minimap.height;
    mmCtx.clearRect(0, 0, w, h);
    mmCtx.fillStyle = 'rgba(10,16,28,0.55)';
    mmCtx.fillRect(0, 0, w, h);

    const b = stage.bounds;
    const bw = b.maxX - b.minX, bd = b.maxZ - b.minZ;
    const pad = 12;
    const scale = Math.min((w - pad*2) / bw, (h - pad*2) / bd);
    const ox = (w - bw * scale) / 2 - b.minX * scale;
    const oy = (h - bd * scale) / 2 - b.minZ * scale;
    const tx = (x) => x * scale + ox;
    const ty = (z) => z * scale + oy;

    // ground
    mmCtx.fillStyle = 'rgba(51,65,85,0.5)';
    mmCtx.fillRect(tx(b.minX), ty(b.minZ), bw*scale, bd*scale);

    // roads
    mmCtx.fillStyle = 'rgba(100,116,139,0.65)';
    for (const r of stage.roads || []) {
      mmCtx.fillRect(tx(r.x - r.width/2), ty(r.z - r.depth/2), r.width*scale, r.depth*scale);
    }
    // buildings
    for (const bl of stage.buildings || []) {
      mmCtx.fillStyle = 'rgba(148,163,184,0.75)';
      mmCtx.fillRect(tx(bl.x - bl.w/2), ty(bl.z - bl.d/2), bl.w*scale, bl.d*scale);
    }

    // player
    const px = tx(player.x), py = ty(player.z);
    // view cone / heading
    // world forward (sin(yaw), cos(yaw)) maps to screen (dx*scale, dz*scale)
    const a = Math.atan2(Math.cos(player.yaw), Math.sin(player.yaw));
    const fLen = 18 * scale;
    mmCtx.beginPath();
    mmCtx.moveTo(px, py);
    mmCtx.arc(px, py, fLen, a - 0.45, a + 0.45);
    mmCtx.closePath();
    mmCtx.fillStyle = 'rgba(96,165,250,0.25)';
    mmCtx.fill();

    mmCtx.beginPath();
    mmCtx.arc(px, py, 4.5, 0, Math.PI*2);
    mmCtx.fillStyle = '#60a5fa';
    mmCtx.fill();
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 1.5;
    mmCtx.stroke();

    mmCtx.beginPath();
    mmCtx.moveTo(px, py);
    mmCtx.lineTo(px + Math.cos(a)*10, py + Math.sin(a)*10);
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 2;
    mmCtx.stroke();
  }

  // --- Resize ---
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(container);

  // --- Animate ---
  let lastTime = 0;
  let bobPhase = 0;

  function animate(ts) {
    requestAnimationFrame(animate);
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    // input
    let ix = 0, iy = 0;
    if (keys.has('up')) iy += 1;
    if (keys.has('down')) iy -= 1;
    if (keys.has('left')) ix -= 1;
    if (keys.has('right')) ix += 1;
    if (joystick.active) { ix += joystick.x; iy += joystick.y; }

    const moving = Math.hypot(ix, iy) > 0.06;
    if (moving) {
      const len = Math.hypot(ix, iy);
      if (len > 1) { ix /= len; iy /= len; }
      const speed = 6.0; // m/s, 1:1 scale (fast walk for game feel)

      // movement relative to yaw
      const forwardX = Math.sin(player.yaw);
      const forwardZ = Math.cos(player.yaw);
      const rightX = Math.cos(player.yaw);
      const rightZ = -Math.sin(player.yaw);

      const mx = forwardX * iy + rightX * ix;
      const mz = forwardZ * iy + rightZ * ix;
      const ml = Math.hypot(mx, mz) || 1;

      // turn yaw toward movement direction smoothly
      const targetYaw = Math.atan2(mx / ml, mz / ml);
      let dyaw = targetYaw - player.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      player.yaw += dyaw * Math.min(1, 7 * dt);

      tryMove(player.x + (mx / ml) * speed * dt, player.z + (mz / ml) * speed * dt);
      bobPhase += dt * 8;
    } else {
      bobPhase *= 0.9;
    }

    const bob = Math.sin(bobPhase) * (moving ? 0.035 : 0.0);
    camera.position.set(player.x, player.y + bob, player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    // gun sway
    gunGroup.position.y = -0.28 + Math.sin(bobPhase) * 0.008;
    gunGroup.position.x = 0.28 + Math.sin(bobPhase * 0.5) * 0.004;
    gunGroup.rotation.z = Math.sin(bobPhase * 0.5) * 0.01;

    updateOcclusion();
    drawMinimap();
    renderer.render(scene, camera);
  }

  // --- Init ---
  buildWorld();
  buildGun();
  buildStageUI();
  switchStage(currentStageId);
  resize();
  requestAnimationFrame(animate);
})();

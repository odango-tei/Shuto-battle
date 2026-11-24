import * as THREE from 'three';
import { AREA_DATA } from './data/areas.js';

(() => {
  "use strict";

  const container = document.getElementById('game-container');
  const areaLabelEl = document.getElementById('current-area');
  const posEl = document.getElementById('current-pos');
  const areaListEl = document.getElementById('area-list');
  const stageButtonsEl = document.getElementById('stage-buttons');
  const joystickEl = document.getElementById('joystick');
  const joystickKnob = document.getElementById('joystick-knob');

  // --- Scene / Camera / Renderer ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 120, 450);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x243044, 0.95);
  scene.add(hemi);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
  dirLight.position.set(90, 150, 70);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  const d = 220;
  dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 1; dirLight.shadow.camera.far = 500;
  scene.add(dirLight);

  // --- State ---
  const colliders = []; // {minX,maxX,minZ,maxZ}
  let currentStageId = AREA_DATA.areas[0].id;
  const keys = new Set();
  const joystick = { active: false, x: 0, y: 0 }; // x: right positive, y: up positive (screen-up = forward)

  // --- Utilities ---
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
    const fontSize = 34;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const paddingX = 22;
    const textWidth = Math.ceil(ctx.measureText(text).width);
    canvas.width = textWidth + paddingX * 2;
    canvas.height = 60;
    const c = canvas.getContext('2d');
    c.font = `bold ${fontSize}px sans-serif`;
    c.fillStyle = 'rgba(15,23,42,0.78)';
    roundRectCtx(c, 2, 2, canvas.width - 4, canvas.height - 4, 12);
    c.fill();
    c.strokeStyle = 'rgba(148,163,184,0.45)';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const scale = 0.055;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    return sprite;
  }

  function addCollider(x, z, w, d, pad = 1.1) {
    colliders.push({
      minX: x - w / 2 - pad,
      maxX: x + w / 2 + pad,
      minZ: z - d / 2 - pad,
      maxZ: z + d / 2 + pad,
    });
  }

  // --- World building ---
  function createGround(g) {
    const geo = new THREE.PlaneGeometry(g.width, g.depth);
    const mat = new THREE.MeshStandardMaterial({ color: g.color, roughness: 0.95, metalness: 0.04 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(g.x, 0, g.z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(Math.max(g.width, g.depth), Math.floor(Math.max(g.width, g.depth) / 10), 0x334155, 0x1e293b);
    grid.position.set(g.x, 0.01, g.z);
    grid.material.opacity = 0.18;
    grid.material.transparent = true;
    scene.add(grid);
  }

  function createRoad(r) {
    const geo = new THREE.PlaneGeometry(r.width, r.depth);
    const mat = new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.92, metalness: 0.02 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(r.x, 0.02, r.z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    const isWideX = r.width >= r.depth;
    const lineLen = (isWideX ? r.width : r.depth) - 8;
    const lineGeo = new THREE.PlaneGeometry(isWideX ? lineLen : 0.45, isWideX ? 0.45 : lineLen);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.28 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(r.x, 0.032, r.z);
    scene.add(line);
  }

  function createCrosswalk(cw) {
    // cw: {x, z, w, d} - draw stripes along the longer dimension
    const stripes = 5;
    const alongW = cw.w >= cw.d;
    const stripeLen = alongW ? cw.d : cw.w;
    const stripeW = (alongW ? cw.w : cw.d) / (stripes * 2 - 1);
    for (let i = 0; i < stripes; i++) {
      const geo = new THREE.PlaneGeometry(alongW ? stripeW * 0.9 : stripeLen, alongW ? stripeLen : stripeW * 0.9);
      const mat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.75 });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      const offset = (i - (stripes - 1) / 2) * stripeW * 2;
      m.position.set(cw.x + (alongW ? offset : 0), 0.035, cw.z + (alongW ? 0 : offset));
      scene.add(m);
    }
  }

  function createBuilding(b) {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.52, metalness: 0.16 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // simple windows for taller buildings
    if (b.h > 30) {
      const winMat = new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.07 });
      for (let y = 8; y < b.h - 4; y += 8) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.15, 1.1, b.d + 0.15), winMat);
        s.position.set(b.x, y, b.z);
        scene.add(s);
      }
    }

    // edge line
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }));
    line.position.copy(mesh.position);
    scene.add(line);

    if (b.label) {
      const label = makeLabel(b.label, '#f8fafc');
      label.position.set(b.x, b.h + 6.5, b.z);
      scene.add(label);
    }
    addCollider(b.x, b.z, b.w, b.d, 1.2);
  }

  function createTree(t) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 2.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.9 })
    );
    trunk.position.set(t.x, 1.3, t.z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x2f855a, roughness: 0.95 })
    );
    foliage.position.set(t.x, 3.8, t.z);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    scene.add(foliage);
    addCollider(t.x, t.z, 1.2, 1.2, 0.8);
  }

  function createLandmark(lm) {
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x332200, roughness: 0.4 })
    );
    pin.position.set(lm.x, 2.5, lm.z);
    scene.add(pin);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 12, 12),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(lm.color || '#fbbf24'), emissive: new THREE.Color(lm.color || '#fbbf24'), emissiveIntensity: 0.35 })
    );
    head.position.set(lm.x, 5.5, lm.z);
    scene.add(head);

    const label = makeLabel(lm.name, lm.color || '#ffffff');
    label.position.set(lm.x, 8.5, lm.z);
    scene.add(label);
  }

  function addBoundsColliders(bounds) {
    const t = 4; // wall thickness
    const w = bounds.maxX - bounds.minX;
    const d = bounds.maxZ - bounds.minZ;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    // north, south, west, east walls (just outside bounds)
    addCollider(cx, bounds.minZ - t / 2, w + t * 2, t, 0);
    addCollider(cx, bounds.maxZ + t / 2, w + t * 2, t, 0);
    addCollider(bounds.minX - t / 2, cz, t, d + t * 2, 0);
    addCollider(bounds.maxX + t / 2, cz, t, d + t * 2, 0);
  }

  function buildWorld() {
    // base
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.05;
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

      const areaLabel = makeLabel(area.stageLabel || area.name, area.cssColor);
      areaLabel.position.set(area.center.x, 16, area.bounds.minZ + 10);
      scene.add(areaLabel);
    }
  }

  // --- Player ---
  const player = new THREE.Group();
  const playerRadius = 1.1;

  function buildPlayer() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf4d6b0, roughness: 0.7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 1.6, 4, 8), bodyMat);
    torso.position.y = 3.0;
    torso.castShadow = true;
    player.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), skinMat);
    head.position.y = 4.85;
    head.castShadow = true;
    player.add(head);

    const legGeo = new THREE.CapsuleGeometry(0.36, 1.5, 4, 8);
    const legL = new THREE.Mesh(legGeo, darkMat);
    legL.position.set(-0.42, 1.11, 0); // bottom ~ 0.0
    legL.castShadow = true;
    legL.name = 'legL';
    player.add(legL);
    const legR = new THREE.Mesh(legGeo, darkMat);
    legR.position.set(0.42, 1.11, 0);
    legR.castShadow = true;
    legR.name = 'legR';
    player.add(legR);

    const armGeo = new THREE.CapsuleGeometry(0.26, 1.2, 4, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-1.25, 3.1, 0);
    armL.rotation.z = 0.25;
    armL.castShadow = true;
    armL.name = 'armL';
    player.add(armL);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(1.25, 3.1, 0);
    armR.rotation.z = -0.25;
    armR.castShadow = true;
    armR.name = 'armR';
    player.add(armR);

    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x1d4ed8, emissiveIntensity: 0.45 })
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.35, 1.6);
    player.add(arrow);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    player.add(shadow);

    scene.add(player);
  }

  function groundPlayer() {
    // Flat stages: always on ground
    player.position.y = 0;
  }

  // --- Stage switching ---
  function getStage(id) {
    return AREA_DATA.areas.find(a => a.id === id);
  }

  function switchStage(id) {
    const stage = getStage(id);
    if (!stage) return;
    currentStageId = id;
    player.position.set(stage.spawn.x, 0, stage.spawn.z);
    player.rotation.y = stage.spawn.yaw || 0;
    groundPlayer();
    keys.clear();
    joystick.x = 0; joystick.y = 0; joystick.active = false;
    updateJoystickKnob();
    snapCamera();
    updateHUD();
    updateStageUI();
  }

  function updateStageUI() {
    document.querySelectorAll('.stage-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.stage === currentStageId);
    });
    document.querySelectorAll('.area-item').forEach(el => {
      el.classList.toggle('active', el.dataset.areaId === currentStageId);
    });
  }

  function buildStageUI() {
    stageButtonsEl.innerHTML = '';
    areaListEl.innerHTML = '';
    for (const area of AREA_DATA.areas) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-btn';
      btn.dataset.stage = area.id;
      btn.textContent = area.shortName;
      btn.addEventListener('click', () => switchStage(area.id));
      stageButtonsEl.appendChild(btn);

      const li = document.createElement('li');
      li.className = 'area-item';
      li.dataset.areaId = area.id;
      li.innerHTML = `
        <div class="area-name"><span class="area-dot" style="background:${area.cssColor}"></span><span>${area.name}</span></div>
        <div class="area-desc">${area.description}</div>
      `;
      li.addEventListener('click', () => switchStage(area.id));
      areaListEl.appendChild(li);
    }
  }

  // --- Input: Keyboard ---
  const keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', a: 'left', s: 'down', d: 'right',
    W: 'up', A: 'left', S: 'down', D: 'right',
  };
  window.addEventListener('keydown', (e) => {
    const k = keyMap[e.key];
    if (k) { e.preventDefault(); keys.add(k); }
  });
  window.addEventListener('keyup', (e) => {
    const k = keyMap[e.key];
    if (k) keys.delete(k);
  });
  window.addEventListener('blur', () => { keys.clear(); resetJoystick(); });

  // --- Input: Joystick (pointer events) ---
  let joystickPointerId = null;
  const joystickRadius = 38; // max knob offset in px (base 140 / knob 64 => room ~38)

  function setJoystickFromEvent(e) {
    const rect = joystickEl.querySelector('.joystick-base').getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxR = rect.width * 0.28;
    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
    joystick.x = dx / maxR;        // right positive
    joystick.y = -(dy / maxR);     // up positive (screen up = forward)
    joystick.active = Math.hypot(joystick.x, joystick.y) > 0.05;
    updateJoystickKnob(dx, dy);
  }

  function updateJoystickKnob(dx = 0, dy = 0) {
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joystickEl.classList.toggle('active', joystick.active);
  }

  function resetJoystick() {
    joystick.active = false; joystick.x = 0; joystick.y = 0; joystickPointerId = null;
    updateJoystickKnob(0, 0);
  }

  joystickEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joystickPointerId = e.pointerId;
    joystickEl.setPointerCapture(e.pointerId);
    setJoystickFromEvent(e);
  });
  joystickEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joystickPointerId) return;
    e.preventDefault();
    setJoystickFromEvent(e);
  });
  function onJoyEnd(e) {
    if (e.pointerId !== joystickPointerId) return;
    e.preventDefault();
    resetJoystick();
  }
  joystickEl.addEventListener('pointerup', onJoyEnd);
  joystickEl.addEventListener('pointercancel', onJoyEnd);

  // --- Collision / Movement ---
  function collides(x, z) {
    const r = playerRadius;
    for (const c of colliders) {
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
    }
    return false;
  }

  function tryMove(nx, nz) {
    if (!collides(nx, nz)) { player.position.x = nx; player.position.z = nz; return; }
    if (!collides(nx, player.position.z)) { player.position.x = nx; return; }
    if (!collides(player.position.x, nz)) { player.position.z = nz; }
  }

  // --- Camera ---
  const currentCamPos = new THREE.Vector3();
  const currentLookAt = new THREE.Vector3();

  function getIdealCamera() {
    const behind = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
    const idealPos = new THREE.Vector3(
      player.position.x - behind.x * 34,
      player.position.y + 24,
      player.position.z - behind.z * 34
    );
    const idealLook = new THREE.Vector3(
      player.position.x + behind.x * 8,
      player.position.y + 3.5,
      player.position.z + behind.z * 8
    );
    return { idealPos, idealLook };
  }

  function snapCamera() {
    const { idealPos, idealLook } = getIdealCamera();
    currentCamPos.copy(idealPos);
    currentLookAt.copy(idealLook);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);
  }

  function updateCamera(dt) {
    const { idealPos, idealLook } = getIdealCamera();
    const t = 1 - Math.exp(-5 * dt);
    currentCamPos.lerp(idealPos, t);
    currentLookAt.lerp(idealLook, t);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);
  }

  // --- HUD ---
  function updateHUD() {
    const stage = getStage(currentStageId);
    areaLabelEl.textContent = stage ? stage.name : '-';
    areaLabelEl.style.color = stage ? stage.cssColor : '#e5eefc';
    posEl.textContent = `${Math.round(player.position.x)}, ${Math.round(player.position.z)}`;
  }

  // --- Resize ---
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(container);

  // --- Animation ---
  let lastTime = 0;
  let walkPhase = 0;

  function animate(ts) {
    requestAnimationFrame(animate);
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    // Input vector
    let ix = 0, iy = 0; // ix: right, iy: forward
    if (keys.has('up')) iy += 1;
    if (keys.has('down')) iy -= 1;
    if (keys.has('left')) ix -= 1;
    if (keys.has('right')) ix += 1;
    if (joystick.active) {
      ix += joystick.x;
      iy += joystick.y;
    }

    const moving = Math.hypot(ix, iy) > 0.08;
    if (moving) {
      // Clamp/normalize input
      const ilen = Math.hypot(ix, iy);
      if (ilen > 1) { ix /= ilen; iy /= ilen; }
      const speed = 34;

      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0; camDir.normalize();
      const camRight = new THREE.Vector3(-camDir.z, 0, camDir.x);

      const move = new THREE.Vector3();
      move.addScaledVector(camDir, iy);
      move.addScaledVector(camRight, ix);
      if (move.lengthSq() > 0.0001) move.normalize();

      // Face movement
      const targetYaw = Math.atan2(move.x, move.z);
      let dyaw = targetYaw - player.rotation.y;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      player.rotation.y += dyaw * Math.min(1, 10 * dt);

      const nx = player.position.x + move.x * speed * dt;
      const nz = player.position.z + move.z * speed * dt;
      tryMove(nx, nz);
      groundPlayer();

      walkPhase += dt * 8;
      const swing = Math.sin(walkPhase) * 0.45;
      const legL = player.getObjectByName('legL');
      const legR = player.getObjectByName('legR');
      const armL = player.getObjectByName('armL');
      const armR = player.getObjectByName('armR');
      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
      if (armL) armL.rotation.x = -swing * 0.6;
      if (armR) armR.rotation.x = swing * 0.6;
    } else {
      const legL = player.getObjectByName('legL');
      const legR = player.getObjectByName('legR');
      const armL = player.getObjectByName('armL');
      const armR = player.getObjectByName('armR');
      if (legL) legL.rotation.x *= 0.82;
      if (legR) legR.rotation.x *= 0.82;
      if (armL) armL.rotation.x *= 0.82;
      if (armR) armR.rotation.x *= 0.82;
    }

    updateCamera(dt);
    updateHUD();
    renderer.render(scene, camera);
  }

  // --- Init ---
  buildWorld();
  buildPlayer();
  buildStageUI();
  switchStage(currentStageId);
  resize();
  requestAnimationFrame(animate);
})();

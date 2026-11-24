import * as THREE from 'three';
import { AREA_DATA } from './data/areas.js';

(() => {
  "use strict";

  const container = document.getElementById('game-container');
  const areaLabelEl = document.getElementById('current-area');
  const posEl = document.getElementById('current-pos');
  const areaListEl = document.getElementById('area-list');

  // --- Renderer / Scene / Camera ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 120, 420);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 800);
  camera.position.set(0, 35, 55);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // --- Lights ---
  const hemi = new THREE.HemisphereLight(0xbfd7ff, 0x1f2937, 0.85);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLight.position.set(80, 140, 60);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  const d = 180;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 400;
  scene.add(dirLight);

  // --- Helpers ---
  function makeLabel(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 36;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const paddingX = 24;
    const textWidth = Math.ceil(ctx.measureText(text).width);
    canvas.width = textWidth + paddingX * 2;
    canvas.height = 64;
    // redraw after resize
    const ctx2 = canvas.getContext('2d');
    ctx2.font = `bold ${fontSize}px sans-serif`;
    ctx2.fillStyle = 'rgba(15,23,42,0.72)';
    roundRectCtx(ctx2, 2, 2, canvas.width - 4, canvas.height - 4, 12);
    ctx2.fill();
    ctx2.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx2.lineWidth = 2;
    ctx2.stroke();
    ctx2.fillStyle = color;
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
    const sprite = new THREE.Sprite(mat);
    const scale = 0.06;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    return sprite;
  }

  function roundRectCtx(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const colliders = []; // {minX,maxX,minZ,maxZ}

  function addCollider(x, z, w, d) {
    colliders.push({
      minX: x - w / 2 - 1.2,
      maxX: x + w / 2 + 1.2,
      minZ: z - d / 2 - 1.2,
      maxZ: z + d / 2 + 1.2,
    });
  }

  function createGround(g) {
    const geo = new THREE.PlaneGeometry(g.width, g.depth);
    const mat = new THREE.MeshStandardMaterial({ color: g.color, roughness: 0.95, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(g.x, 0, g.z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // subtle grid overlay
    const grid = new THREE.GridHelper(Math.max(g.width, g.depth), Math.floor(Math.max(g.width, g.depth) / 10), 0x334155, 0x1e293b);
    grid.position.set(g.x, 0.01, g.z);
    grid.material.opacity = 0.22;
    grid.material.transparent = true;
    scene.add(grid);
  }

  function createRoad(r) {
    const geo = new THREE.PlaneGeometry(r.width, r.depth);
    const mat = new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.9, metalness: 0.02 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(r.x, 0.02, r.z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // center line for longer roads
    const isWideX = r.width >= r.depth;
    const lineLen = isWideX ? r.width - 6 : r.depth - 6;
    const lineW = 0.5;
    const lineGeo = new THREE.PlaneGeometry(isWideX ? lineLen : lineW, isWideX ? lineW : lineLen);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.35 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(r.x, 0.03, r.z);
    scene.add(line);
  }

  function createBuilding(b) {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.55, metalness: 0.15 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Simple window stripes for tall buildings
    if (b.h > 35) {
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.08 });
      for (let y = 8; y < b.h - 4; y += 8) {
        const sGeo = new THREE.BoxGeometry(b.w + 0.2, 1.2, b.d + 0.2);
        const stripe = new THREE.Mesh(sGeo, stripeMat);
        stripe.position.set(b.x, y, b.z);
        scene.add(stripe);
      }
    }

    if (b.label) {
      const label = makeLabel(b.label, '#f8fafc');
      label.position.set(b.x, b.h + 6, b.z);
      scene.add(label);
    }

    addCollider(b.x, b.z, b.w, b.d);
  }

  function createLandmark(lm) {
    const pinGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 8);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x332200, roughness: 0.4 });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(lm.x, 3, lm.z);
    scene.add(pin);

    const headGeo = new THREE.SphereGeometry(0.7, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(lm.color || '#fbbf24'), emissive: new THREE.Color(lm.color || '#fbbf24'), emissiveIntensity: 0.35 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(lm.x, 6.3, lm.z);
    scene.add(head);

    const label = makeLabel(lm.name, lm.color || '#ffffff');
    label.position.set(lm.x, 10, lm.z);
    scene.add(label);
  }

  // --- Build world ---
  function buildWorld() {
    // Base ground
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.05;
    base.receiveShadow = true;
    scene.add(base);

    // Connector
    const conn = AREA_DATA.connector;
    if (conn) {
      createGround(conn.ground);
      createRoad(conn.road);
      const connLabel = makeLabel(conn.label, '#cbd5e1');
      connLabel.position.set(conn.road.x, 8, conn.road.z);
      scene.add(connLabel);
    }

    for (const area of AREA_DATA.areas) {
      createGround(area.ground);
      for (const r of area.roads || []) createRoad(r);
      for (const b of area.buildings || []) createBuilding(b);
      for (const lm of area.landmarks || []) createLandmark(lm);

      // Area name label on ground
      const areaLabel = makeLabel(area.name, area.cssColor);
      areaLabel.position.set(area.center.x, 18, area.center.z - (area.ground.depth / 2) + 12);
      scene.add(areaLabel);
    }
  }

  // --- Player ---
  const player = new THREE.Group();
  player.position.set(0, 0, 30); // Start near Shinjuku station

  function buildPlayer() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf4d6b0, roughness: 0.7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 1.8, 4, 8), bodyMat);
    torso.position.y = 3.2;
    torso.castShadow = true;
    player.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 16), skinMat);
    head.position.y = 5.1;
    head.castShadow = true;
    player.add(head);

    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.6, 4, 8), darkMat);
    legL.position.set(-0.45, 1.2, 0);
    legL.castShadow = true;
    player.add(legL);

    const legR = legL.clone();
    legR.position.x = 0.45;
    player.add(legR);

    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.3, 4, 8), bodyMat);
    armL.position.set(-1.35, 3.3, 0);
    armL.rotation.z = 0.25;
    armL.castShadow = true;
    player.add(armL);

    const armR = armL.clone();
    armR.position.x = 1.35;
    armR.rotation.z = -0.25;
    player.add(armR);

    // direction indicator
    const arrowGeo = new THREE.ConeGeometry(0.4, 1.0, 8);
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x1d4ed8, emissiveIntensity: 0.4 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.5, 1.8);
    arrow.name = 'dirArrow';
    player.add(arrow);

    // name tag
    const nameLabel = makeLabel('主人公', '#93c5fd');
    nameLabel.position.set(0, 7.2, 0);
    nameLabel.scale.multiplyScalar(0.6);
    player.add(nameLabel);

    scene.add(player);
  }

  // --- Input ---
  const keys = new Set();
  const keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', a: 'left', s: 'down', d: 'right',
    W: 'up', A: 'left', S: 'down', D: 'right',
    Shift: 'shift',
  };

  window.addEventListener('keydown', (e) => {
    const k = keyMap[e.key];
    if (k) {
      if (['up', 'down', 'left', 'right'].includes(k)) e.preventDefault();
      keys.add(k);
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = keyMap[e.key];
    if (k) keys.delete(k);
  });
  window.addEventListener('blur', () => keys.clear());

  // --- Area detection / HUD ---
  function getCurrentArea(x, z) {
    for (const area of AREA_DATA.areas) {
      const g = area.ground;
      if (x >= g.x - g.width / 2 && x <= g.x + g.width / 2 &&
          z >= g.z - g.depth / 2 && z <= g.z + g.depth / 2) {
        return area;
      }
    }
    const c = AREA_DATA.connector;
    if (c) {
      const g = c.ground;
      if (x >= g.x - g.width / 2 && x <= g.x + g.width / 2 &&
          z >= g.z - g.depth / 2 && z <= g.z + g.depth / 2) {
        return { id: 'connector', name: '接続エリア', shortName: '接続路', cssColor: '#94a3b8' };
      }
    }
    return null;
  }

  function buildAreaList() {
    areaListEl.innerHTML = '';
    for (const area of AREA_DATA.areas) {
      const li = document.createElement('li');
      li.className = 'area-item';
      li.dataset.areaId = area.id;
      li.innerHTML = `
        <div class="area-name">
          <span class="area-dot" style="background:${area.cssColor}"></span>
          <span>${area.name}</span>
        </div>
        <div class="area-desc">${area.description}</div>
      `;
      areaListEl.appendChild(li);
    }
  }

  function updateHUD() {
    const area = getCurrentArea(player.position.x, player.position.z);
    areaLabelEl.textContent = area ? area.name : 'エリア外';
    areaLabelEl.style.color = area ? (area.cssColor || '#e5eefc') : '#e5eefc';
    posEl.textContent = `${Math.round(player.position.x)}, ${Math.round(player.position.z)}`;
    document.querySelectorAll('.area-item').forEach((el) => {
      el.classList.toggle('active', !!(area && el.dataset.areaId === area.id));
    });
  }

  // --- Movement / Collision ---
  function collides(x, z) {
    const r = 1.2; // player radius
    for (const c of colliders) {
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
    }
    return false;
  }

  function tryMove(nx, nz) {
    if (!collides(nx, nz)) {
      player.position.x = nx;
      player.position.z = nz;
      return;
    }
    if (!collides(nx, player.position.z)) {
      player.position.x = nx;
      return;
    }
    if (!collides(player.position.x, nz)) {
      player.position.z = nz;
    }
  }

  // --- Camera ---
  const camOffset = new THREE.Vector3(0, 28, -38); // behind and above (relative to player facing)
  const camLookOffset = new THREE.Vector3(0, 4, 10);
  const currentCamPos = new THREE.Vector3();
  const currentLookAt = new THREE.Vector3();

  function updateCamera(dt, snap = false) {
    // Camera follows behind player based on player's facing direction
    const facing = player.rotation.y;
    const behind = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    const idealPos = new THREE.Vector3(
      player.position.x - behind.x * 38,
      player.position.y + 28,
      player.position.z - behind.z * 38
    );
    const idealLook = new THREE.Vector3(
      player.position.x + behind.x * 10,
      player.position.y + 4,
      player.position.z + behind.z * 10
    );

    if (snap) {
      currentCamPos.copy(idealPos);
      currentLookAt.copy(idealLook);
    } else {
      const t = 1 - Math.exp(-4.5 * dt);
      currentCamPos.lerp(idealPos, t);
      currentLookAt.lerp(idealLook, t);
    }
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);
  }

  // --- Resize ---
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // --- Animation loop ---
  let lastTime = 0;
  let walkPhase = 0;

  function animate(ts) {
    requestAnimationFrame(animate);
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    let dx = 0, dz = 0;
    if (keys.has('up')) dz += 1;
    if (keys.has('down')) dz -= 1;
    if (keys.has('left')) dx += 1;
    if (keys.has('right')) dx -= 1;

    const moving = dx !== 0 || dz !== 0;
    const speed = keys.has('shift') ? 55 : 32;

    if (moving) {
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;

      // Move relative to camera's horizontal facing (third-person)
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0;
      camDir.normalize();
      const camRight = new THREE.Vector3(-camDir.z, 0, camDir.x);

      const move = new THREE.Vector3();
      move.addScaledVector(camDir, dz);  // W = forward (toward look direction)
      move.addScaledVector(camRight, dx); // D = right
      if (move.lengthSq() > 0) move.normalize();

      // Face movement direction
      const targetYaw = Math.atan2(move.x, move.z);
      // smooth rotation
      let yawDiff = targetYaw - player.rotation.y;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      player.rotation.y += yawDiff * Math.min(1, 10 * dt);

      const nx = player.position.x + move.x * speed * dt;
      const nz = player.position.z + move.z * speed * dt;
      tryMove(nx, nz);

      walkPhase += dt * (keys.has('shift') ? 10 : 7);
      // simple leg swing
      const swing = Math.sin(walkPhase) * 0.4;
      player.children.forEach((c) => {
        if (c.geometry && c.geometry.type === 'CapsuleGeometry' && c.position.y < 2.5 && c.position.y > 0.5) {
          // legs: distinguish by x
          if (c.position.x < 0) c.rotation.x = swing;
          else c.rotation.x = -swing;
        }
      });
    } else {
      // reset leg rotation
      player.children.forEach((c) => {
        if (c.geometry && c.geometry.type === 'CapsuleGeometry' && c.position.y < 2.5 && c.position.y > 0.5) {
          c.rotation.x *= 0.8;
        }
      });
    }

    updateCamera(dt);
    updateHUD();
    renderer.render(scene, camera);
  }

  // --- Init ---
  buildWorld();
  buildPlayer();
  buildAreaList();
  resize();
  updateCamera(0, true);
  updateHUD();
  requestAnimationFrame(animate);
})();

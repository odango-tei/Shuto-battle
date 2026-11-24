(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const areaLabelEl = document.getElementById("current-area");
  const posEl = document.getElementById("current-pos");
  const areaListEl = document.getElementById("area-list");

  const DATA = window.AREA_DATA;
  const AREAS = DATA.areas;

  // Player state in game coordinates (same coordinate space as area polygons)
  const player = {
    name: "主人公",
    x: 360,
    y: 150, // start in Shinjuku
    r: 10,
    speed: 180, // pixels per second
    dir: "down",
    walkPhase: 0,
    moving: false,
  };

  const keys = new Set();
  const keyMap = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", a: "left", s: "down", d: "right",
    W: "up", A: "left", S: "down", D: "right",
  };

  function pointInPolygon(x, y, polygon) {
    // Ray casting
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function getCurrentArea(x, y) {
    for (const area of AREAS) {
      if (pointInPolygon(x, y, area.polygon)) return area;
    }
    if (DATA.corridor && pointInPolygon(x, y, DATA.corridor.polygon)) {
      return { id: "corridor", name: "エリア間通路", color: "#94a3b8" };
    }
    return null;
  }

  function isWalkable(x, y) {
    if (getCurrentArea(x, y)) return true;
    // Allow a small margin around walkable space so player doesn't get stuck on edges
    for (const area of AREAS) {
      if (pointInPolygon(x, y, area.polygon)) return true;
    }
    if (DATA.corridor && pointInPolygon(x, y, DATA.corridor.polygon)) return true;
    return false;
  }

  function clampToWalkable(nx, ny) {
    if (isWalkable(nx, ny)) return { x: nx, y: ny };
    // Try axis-aligned sliding
    if (isWalkable(nx, player.y)) return { x: nx, y: player.y };
    if (isWalkable(player.x, ny)) return { x: player.x, y: ny };
    return { x: player.x, y: player.y };
  }

  function buildAreaList() {
    areaListEl.innerHTML = "";
    for (const area of AREAS) {
      const li = document.createElement("li");
      li.className = "area-item";
      li.dataset.areaId = area.id;
      li.innerHTML = `
        <div class="area-name">
          <span class="area-dot" style="background:${area.color}"></span>
          <span>${area.name}</span>
        </div>
        <div class="area-desc">${area.description}</div>
      `;
      areaListEl.appendChild(li);
    }
  }

  function updateHUD() {
    const area = getCurrentArea(player.x, player.y);
    const areaName = area ? area.name : "エリア外";
    areaLabelEl.textContent = areaName;
    areaLabelEl.style.color = area && area.color ? area.color : "#e5eefc";
    posEl.textContent = `${Math.round(player.x)}, ${Math.round(player.y)}`;

    document.querySelectorAll(".area-item").forEach((el) => {
      const active = area && el.dataset.areaId === area.id;
      el.classList.toggle("active", !!active);
    });
  }

  // Drawing helpers
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.07)";
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x <= canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawPolygon(polygon, fill, stroke, lineWidth = 2) {
    if (!polygon || polygon.length < 3) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(polygon[0][0], polygon[0][1]);
    for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i][0], polygon[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
    ctx.restore();
  }

  function drawCorridor() {
    const c = DATA.corridor;
    if (!c) return;
    drawPolygon(c.polygon, "rgba(148, 163, 184, 0.08)", "rgba(148, 163, 184, 0.25)", 1.5);
    // label
    ctx.save();
    ctx.fillStyle = "rgba(148,163,184,0.6)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⇅ 移動通路", 390, 305);
    ctx.restore();
  }

  function drawAreas() {
    for (const area of AREAS) {
      drawPolygon(area.polygon, area.fill, area.stroke, 2.5);

      // Area label
      ctx.save();
      ctx.fillStyle = area.color;
      ctx.font = "bold 28px 'Noto Sans JP', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.95;
      ctx.fillText(area.name, area.labelPos[0], area.labelPos[1]);
      ctx.globalAlpha = 1;
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(226,232,240,0.75)";
      ctx.fillText(area.description, area.labelPos[0], area.labelPos[1] + 26);
      ctx.restore();
    }
  }

  function landmarkIcon(type) {
    switch (type) {
      case "station": return "🚉";
      case "gov": return "🏛";
      case "park": return "🌳";
      default: return "📍";
    }
  }

  function drawLandmarks() {
    for (const area of AREAS) {
      for (const lm of area.landmarks) {
        const [x, y] = lm.pos;
        ctx.save();
        // glow
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15,23,42,0.7)";
        ctx.fill();
        ctx.strokeStyle = area.stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(landmarkIcon(lm.type), x, y + 0.5);

        ctx.font = "11px 'Noto Sans JP', sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.textBaseline = "top";
        ctx.fillText(lm.name, x, y + 14);
        ctx.restore();
      }
    }
  }

  function drawPlayer() {
    const { x, y, dir, moving, walkPhase } = player;
    const bob = moving ? Math.sin(walkPhase * 10) * 1.5 : 0;

    ctx.save();
    ctx.translate(x, y + bob);

    // shadow
    ctx.beginPath();
    ctx.ellipse(0, 14, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();

    // direction indicator (small ring)
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(96,165,250,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // body
    ctx.fillStyle = "#3b82f6";
    roundRect(ctx, -8, -2, 16, 14, 4);
    ctx.fill();

    // legs
    const legSwing = moving ? Math.sin(walkPhase * 10) * 3 : 0;
    ctx.fillStyle = "#1e293b";
    roundRect(ctx, -6 + legSwing, 10, 5, 7, 2); ctx.fill();
    roundRect(ctx, 1 - legSwing, 10, 5, 7, 2); ctx.fill();

    // head
    ctx.beginPath();
    ctx.arc(0, -8, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#f4d6b0";
    ctx.fill();

    // eyes based on direction
    ctx.fillStyle = "#1e293b";
    let ex = 0, ey = -8;
    if (dir === "left") ex = -2;
    if (dir === "right") ex = 2;
    if (dir === "up") ey = -9;
    if (dir === "down") ey = -7;
    ctx.beginPath(); ctx.arc(ex - 2, ey, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 2, ey, 1.2, 0, Math.PI * 2); ctx.fill();

    // direction arrow
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath();
    if (dir === "up") { ctx.moveTo(0, -22); ctx.lineTo(-4, -16); ctx.lineTo(4, -16); }
    else if (dir === "down") { ctx.moveTo(0, 24); ctx.lineTo(-4, 18); ctx.lineTo(4, 18); }
    else if (dir === "left") { ctx.moveTo(-20, 0); ctx.lineTo(-14, -4); ctx.lineTo(-14, 4); }
    else { ctx.moveTo(20, 0); ctx.lineTo(14, -4); ctx.lineTo(14, 4); }
    ctx.closePath();
    ctx.fill();

    // name tag
    ctx.font = "bold 11px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const name = player.name;
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    roundRect(ctx, -tw / 2 - 6, -38, tw + 12, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(name, 0, -23);

    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawLegend() {
    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    roundRect(ctx, 14, canvas.height - 44, 330, 30, 6);
    ctx.fill();
    ctx.font = "11px 'Noto Sans JP', sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.textBaseline = "middle";
    ctx.fillText("🚉 駅  🏛 公共施設  🌳 公園  📍 スポット", 24, canvas.height - 29);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#111827");
    g.addColorStop(1, "#0b1020");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawCorridor();
    drawAreas();
    drawLandmarks();
    drawPlayer();
    drawLegend();
  }

  let lastTime = 0;
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    let dx = 0, dy = 0;
    if (keys.has("up")) dy -= 1;
    if (keys.has("down")) dy += 1;
    if (keys.has("left")) dx -= 1;
    if (keys.has("right")) dx += 1;

    player.moving = dx !== 0 || dy !== 0;
    if (player.moving) {
      // normalize diagonal
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? "right" : "left";
      else player.dir = dy > 0 ? "down" : "up";

      const nx = player.x + dx * player.speed * dt;
      const ny = player.y + dy * player.speed * dt;
      const clamped = clampToWalkable(nx, ny);
      player.x = clamped.x;
      player.y = clamped.y;
      player.walkPhase += dt;
    }

    updateHUD();
    render();
    requestAnimationFrame(loop);
  }

  // Input
  window.addEventListener("keydown", (e) => {
    const dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      keys.add(dir);
    }
  });
  window.addEventListener("keyup", (e) => {
    const dir = keyMap[e.key];
    if (dir) keys.delete(dir);
  });
  // prevent arrow keys scrolling page when canvas focused/visible
  window.addEventListener("blur", () => keys.clear());

  // Init
  buildAreaList();
  updateHUD();
  render();
  requestAnimationFrame(loop);
})();

"use strict";
/* 보상 쇼케이스 레시피: 보물상자, 레벨 업, 10연차 뽑기, 출석 보상, 코인 줍기, 업적, 별 3개 결과, 승급, 알 부화 */
(() => {
  /* ───── 공통 도우미 ───── */
  const part = (p, light, dark) => Object.assign(p, { light, dark });
  // 앞 동작에서 남은 예약·트윈을 지우고 새로 시작
  const reset = w => { w.timers.length = 0; w.tweens.length = 0; };
  // 무대: 화면 전체를 채우는 둥근 그라데이션
  function stage(ctx, inner, outer, cy = 170) {
    const g = ctx.createRadialGradient(270, cy, 10, 270, cy, 340);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(-80, -80, 700, 520);
  }
  // 둥근 받침대 (윗면 + 옆면 두께)
  function plinth(ctx, x, y, rx, ry, top, side) {
    ctx.fillStyle = side;
    ctx.beginPath(); ctx.ellipse(x, y + 10, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillRect(x - rx, y, rx * 2, 10);
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  }
  function stars(w, x, y, n, cols, s0 = 180, s1 = 440) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(s0, s1);
      w.spawn({ type: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.4, g: 240, size: rand(6, 11), life: rand(0.8, 1.4), color: pick(cols) });
    }
  }
  function confetti(w, n) {
    for (let i = 0; i < n; i++) w.spawn({ type: "chunk", x: rand(60, 480), y: rand(-30, 30), vx: rand(-70, 70), vy: rand(40, 160), g: 220, drag: 1.4, vr: rand(-10, 10),
      size: rand(3.5, 6), life: rand(1.8, 2.6), hold: true, color: pick(["255,90,120", "255,210,80", "90,220,255", "140,255,150", "200,140,255"]) });
  }

  // 매 프레임 직접 그리는 로우폴리 (회전·뚜껑 열림처럼 모양이 바뀌는 물체용)
  const LIT = (() => { const v = [-0.55, 0.62, 0.56], n = Math.hypot(...v); return v.map(q => q / n); })();
  function poly3d(ctx, parts, X, Y, k, yaw, pitch, tint = null, ta = 0) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const T = ([a, b, c]) => { const x1 = a * cy + c * sy, z1 = -a * sy + c * cy; return [x1, b * cp - z1 * sp, b * sp + z1 * cp]; };
    const avg = qs => qs.reduce((s, q) => [s[0] + q[0], s[1] + q[1], s[2] + q[2]], [0, 0, 0]).map(v => v / qs.length);
    const faces = [];
    for (const p of parts) {
      const tv = p.v.map(T), cen = avg(tv), L = p.light || [246, 244, 240], D = p.dark || [70, 70, 80];
      for (const f of p.f) {
        const q = f.map(i => tv[i]), fc = avg(q);
        const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]], v = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]];
        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        if (n[0] * (fc[0] - cen[0]) + n[1] * (fc[1] - cen[1]) + n[2] * (fc[2] - cen[2]) < 0) n = n.map(r => -r);
        const nl = Math.hypot(...n) || 1; n = n.map(r => r / nl);
        if (n[2] <= 0.01) continue;
        const b = 0.16 + 0.84 * Math.max(0, n[0] * LIT[0] + n[1] * LIT[1] + n[2] * LIT[2]);
        let col = L.map((l, i) => D[i] + (l - D[i]) * b);
        if (tint && ta > 0) col = col.map((c, i) => c + (tint[i] - c) * ta);
        faces.push({ q, z: fc[2], col: `rgb(${col.map(Math.round).join(",")})` });
      }
    }
    faces.sort((a, b) => a.z - b.z);
    ctx.lineJoin = "round"; ctx.lineWidth = 1.1; ctx.strokeStyle = "rgba(20,20,26,0.35)";
    for (const f of faces) {
      ctx.fillStyle = f.col; ctx.beginPath();
      f.q.forEach((q, i) => ctx[i ? "lineTo" : "moveTo"](X + q[0] * k, Y - q[1] * k));
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // 경첩 축(x축과 평행, 높이 py·깊이 pz)을 중심으로 부품 회전
  const rotX = (p, a, py, pz) => ({ ...p, v: p.v.map(([x, y, z]) => {
    const dy = y - py, dz = z - pz;
    return [x, py + dy * Math.cos(a) + dz * Math.sin(a), pz - dy * Math.sin(a) + dz * Math.cos(a)];
  }) });

  // 동전: 옆으로 돌면 납작해지고 두께가 보임
  function drawCoin(ctx, x, y, r, sp = 0) {
    const c = Math.cos(sp), s = Math.abs(Math.sin(sp)), rx = Math.max(1.5, r * Math.abs(c));
    ctx.fillStyle = "#9a5c06"; ctx.beginPath(); ctx.ellipse(x + 2 * s, y + 1, rx + 2 * s, r, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c > 0 ? "#ffd84a" : "#f0b02a"; ctx.beginPath(); ctx.ellipse(x, y, rx, r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(150,90,0,0.85)"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.6, r * 0.6, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,230,0.8)"; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, y - r * 0.4, rx * 0.22, r * 0.16, -0.5, 0, TAU); ctx.fill();
  }
  // 튀어나온 전리품(동전·보석) 물리: 중력, 바닥 튕김
  const toss = (w, x, y, vx, vy, gem = -1) => w.loot.push({ x, y, vx, vy, gem, sp: rand(0, TAU), vs: rand(9, 16), age: 0, life: rand(2.4, 3), gy: rand(272, 304) });
  function stepLoot(w, dt) {
    for (const o of w.loot) {
      o.age += dt; o.vy += 1500 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.sp += o.vs * dt;
      if (o.y > o.gy) { o.y = o.gy; if (o.vy > 140) { o.vy *= -0.42; o.vx *= 0.6; o.vs *= 0.6; } else { o.vy = 0; o.vx *= 0.85; o.vs *= 0.85; } }
    }
    w.loot = w.loot.filter(o => o.age < o.life);
  }
  function drawLoot(ctx, w) {
    for (const o of w.loot) {
      ctx.globalAlpha = Math.min(1, (o.life - o.age) * 3);
      if (o.gem < 0) drawCoin(ctx, o.x, o.y, 8, o.sp);
      else { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.sp * 0.3); drawGem(ctx, o.gem, 0, 0, 8); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }

  /* ───── 보물상자 모델 ───── */
  const WOOD = [[188, 118, 62], [60, 30, 14]], GOLD = [[255, 214, 100], [122, 66, 10]], HEAP = [[255, 232, 130], [160, 96, 10]];
  const chestBody = [
    part(blk(0, 0, 0, 132, 60, 82), ...WOOD),
    part(blk(0, 53, 0, 118, 8, 70, 0.9), ...HEAP),
    part(blk(-48, -1, 0, 14, 62, 86), ...GOLD),
    part(blk(48, -1, 0, 14, 62, 86), ...GOLD),
    part(blk(0, 26, 42, 22, 26, 4), ...GOLD),
  ];
  const chestLid = [
    part(blk(0, 60, 0, 132, 20, 82, 0.9), ...WOOD),
    part(blk(0, 80, 0, 119, 10, 74, 0.7), ...WOOD),
    part(blk(-48, 59, 0, 14, 22, 86, 0.9), ...GOLD),
    part(blk(48, 59, 0, 14, 22, 86, 0.9), ...GOLD),
    part(blk(0, 64, 42, 20, 14, 4), ...GOLD),
  ];
  const chestParts = a => chestBody.concat(chestLid.map(p => rotX(p, a, 60, -41)));

  /* ───── 10연차 카드 ───── */
  const RAR = [["#2f6bb0", "#122a52", "110,190,255"], ["#7b34b8", "#2a0f4c", "200,130,255"], ["#e0a01c", "#5e3404", "255,210,90"]];
  function drawMini(ctx, w, c) {
    const W = 60, H = 84, s = Math.cos(c.ang), front = s < 0, sx = Math.max(0.02, Math.abs(s)) * c.sc;
    ctx.save();
    ctx.translate(c.x + (c.vib ? rand(-c.vib, c.vib) : 0), c.y - c.lift);
    if (front && c.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, 0, 64, RAR[c.rar][2], 0.55 * c.glow); ctx.globalCompositeOperation = "source-over"; }
    ctx.scale(sx, c.sc);
    if (!front) {
      rr(ctx, -W / 2, -H / 2, W, H, 8, c.gold ? "#4a3208" : "#1b2138", c.gold ? "#ffcf4a" : "#5a6280", 3);
      ctx.strokeStyle = c.gold ? "rgba(255,210,90,.8)" : "rgba(140,150,180,.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(18, 0); ctx.lineTo(0, 26); ctx.lineTo(-18, 0); ctx.closePath(); ctx.stroke();
    } else {
      const [a, b] = RAR[c.rar], g = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
      g.addColorStop(0, a); g.addColorStop(1, b);
      rr(ctx, -W / 2, -H / 2, W, H, 8, g, c.rar === 2 ? "#fff1b0" : "rgba(255,255,255,.55)", 3);
      drawGem(ctx, [1, 4, 3][c.rar], 0, -8, 14);
      ctx.fillStyle = "#ffe27a";
      const k = 3 + c.rar;
      for (let i = 0; i < k; i++) { starPath(ctx, (i - (k - 1) / 2) * 9, H / 2 - 14, 4.5); ctx.fill(); }
    }
    ctx.restore();
  }

  /* ───── 출석 보상: 선물 상자 ───── */
  function drawGift(ctx, d, x, y) {
    // 몸통: 앞면 + 오른쪽 옆면
    ctx.fillStyle = "#e0446a"; ctx.fillRect(x - 38, y - 30, 76, 54);
    ctx.fillStyle = "#9c2446"; ctx.beginPath(); ctx.moveTo(x + 38, y - 30); ctx.lineTo(x + 54, y - 40); ctx.lineTo(x + 54, y + 14); ctx.lineTo(x + 38, y + 24); ctx.fill();
    ctx.fillStyle = "#ffd75a"; ctx.fillRect(x - 7, y - 30, 14, 54);
    ctx.fillStyle = "#c99a20"; ctx.beginPath(); ctx.moveTo(x + 38, y - 10); ctx.lineTo(x + 54, y - 20); ctx.lineTo(x + 54, y - 12); ctx.lineTo(x + 38, y - 2); ctx.fill();
    if (d.open) {
      // 열린 상자 안쪽
      ctx.fillStyle = "#5a1028"; ctx.beginPath(); ctx.moveTo(x - 38, y - 30); ctx.lineTo(x - 22, y - 40); ctx.lineTo(x + 54, y - 40); ctx.lineTo(x + 38, y - 30); ctx.fill();
    }
    const L = d.lidFly;
    if (!d.open || L) {
      ctx.save();
      ctx.translate(x + (L ? L.x : 0), y - 30 + (L ? L.y : 0)); ctx.rotate(L ? L.rot : 0);
      ctx.fillStyle = "#ff6a8e"; ctx.beginPath(); ctx.moveTo(-42, 0); ctx.lineTo(-26, -12); ctx.lineTo(58, -12); ctx.lineTo(42, 0); ctx.fill();
      ctx.fillStyle = "#c83058"; ctx.fillRect(-42, 0, 84, 9);
      ctx.fillStyle = "#ffe27a"; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(13, -12); ctx.lineTo(25, -12); ctx.lineTo(11, 0); ctx.fill();
      ctx.fillStyle = "#ffd75a"; ctx.fillRect(-7, 0, 14, 9);
      ctx.beginPath(); ctx.ellipse(-2, -16, 13, 8, -0.5, 0, TAU); ctx.ellipse(24, -16, 13, 8, 0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  // 곡선으로 날아가는 아이템 (2차 베지어)
  function flyTo(w, o) { w.fly2.push(Object.assign({ t: -o.delay, cx: (o.x0 + o.x1) / 2 + o.bend, cy: Math.min(o.y0, o.y1) - 120 }, o)); }
  function stepFly(w, dt) {
    for (const f of w.fly2) {
      f.t += dt;
      const k = f.ease(Math.max(0, Math.min(1, f.t / f.dur))), u = 1 - k;
      f.x = u * u * f.x0 + 2 * u * k * f.cx + k * k * f.x1;
      f.y = u * u * f.y0 + 2 * u * k * f.cy + k * k * f.y1;
      if (f.trail && f.t > 0) w.spawn({ type: "glow", x: f.x, y: f.y, size: 9, size1: 0, life: 0.3, color: f.trail });
      if (f.t >= f.dur && !f.done) { f.done = true; f.cb && f.cb(f); }
    }
    w.fly2 = w.fly2.filter(f => !f.done);
  }

  /* ───── 코인 더미 ───── */
  const PILE = (() => {
    const out = [];
    const rows = [[11, 62], [9, 46], [7, 30], [4, 15], [1, 0]];
    rows.forEach(([n, r], L) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + L; out.push({ L, hx: Math.cos(a) * r, hy: Math.sin(a) * r * 0.32 - L * 9 }); } });
    return out.sort((a, b) => a.L - b.L || a.hy - b.hy);
  })();
  function drawFlatCoin(ctx, x, y, r) {
    ctx.fillStyle = "#9a5c06"; ctx.beginPath(); ctx.ellipse(x, y + 3, r, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(150,90,0,0.8)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.25, 0, 0, TAU); ctx.stroke();
  }

  /* ───── 업적 메달 ───── */
  // n각 기둥 (z축 방향 두께). star = true면 별 모양
  function prism(r, t, n, z0 = 0, star = false) {
    const ring = z => Array.from({ length: n }, (_, i) => {
      const a = Math.PI / 2 + i * TAU / n, q = star && i % 2 ? r * 0.45 : r;
      return [Math.cos(a) * q, Math.sin(a) * q, z];
    });
    const v = ring(z0 - t / 2).concat(ring(z0 + t / 2)), idx = [...Array(n).keys()];
    const f = [idx, idx.map(i => i + n)];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push([i, j, j + n, i + n]); }
    return { v, f };
  }
  const MEDAL = [
    part(prism(48, 12, 14), [255, 214, 100], [120, 64, 8]),
    part(prism(38, 16, 14), [255, 236, 150], [150, 90, 10]),
    part(prism(24, 20, 10, 0, true), [255, 120, 110], [120, 20, 20]),
  ];

  /* ───── 별 3개 결과 ───── */
  function star5(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.46 : r; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * q, Math.sin(a) * q); }
    ctx.closePath();
  }
  // 입체 별: 아래로 두께, 앞면 그라데이션, 안쪽 하이라이트
  function drawStar3d(ctx, s) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    star5(ctx, s.r); ctx.fillStyle = "#2a1404"; ctx.fill();
    ctx.strokeStyle = "#6a3c14"; ctx.lineWidth = 3; ctx.stroke();
    if (s.on) {
      ctx.globalAlpha = s.a; ctx.scale(s.sc, s.sc);
      ctx.translate(0, 6); star5(ctx, s.r); ctx.fillStyle = "#a85a06"; ctx.fill(); ctx.translate(0, -6);
      const g = ctx.createLinearGradient(0, -s.r, 0, s.r); g.addColorStop(0, "#fff2a0"); g.addColorStop(1, "#f0a01c");
      star5(ctx, s.r); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "#fff6c8"; ctx.lineWidth = 2; ctx.stroke();
      star5(ctx, s.r * 0.42); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  /* ───── 승급 엠블럼 ───── */
  const SILVER = ["#f2f5fa", "#8e98ac", "#3e465a"], GOLDE = ["#fff2b8", "#f2b232", "#7a4806"];
  function shieldPath(ctx, k = 1) {
    ctx.beginPath();
    ctx.moveTo(0, -70 * k); ctx.lineTo(56 * k, -52 * k); ctx.lineTo(52 * k, 18 * k);
    ctx.quadraticCurveTo(40 * k, 52 * k, 0, 74 * k); ctx.quadraticCurveTo(-40 * k, 52 * k, -52 * k, 18 * k);
    ctx.lineTo(-56 * k, -52 * k); ctx.closePath();
  }
  function drawEmblem(ctx, [hi, mid, lo], chev, wing, gem) {
    if (wing > 0) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.scale(side * wing, 1); ctx.translate(46, -24 + i * 22); ctx.rotate(-0.5 + i * 0.32);
      rr(ctx, 0, -9, 74 - i * 16, 18, 9, i % 2 ? mid : hi, lo, 2);
      ctx.restore();
    }
    ctx.save(); ctx.translate(0, 7); shieldPath(ctx); ctx.fillStyle = lo; ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(-50, -70, 50, 70); g.addColorStop(0, hi); g.addColorStop(0.55, mid); g.addColorStop(1, lo);
    shieldPath(ctx); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = hi; ctx.lineWidth = 3; ctx.stroke();
    shieldPath(ctx, 0.8); ctx.strokeStyle = lo; ctx.lineWidth = 3; ctx.stroke();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; i < chev; i++) {
      const y = -6 + i * 20 - (chev - 2) * 10;
      ctx.strokeStyle = lo; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(-30, y + 3); ctx.lineTo(0, y + 21); ctx.lineTo(30, y + 3); ctx.stroke();
      ctx.strokeStyle = hi; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-30, y); ctx.lineTo(0, y + 18); ctx.lineTo(30, y); ctx.stroke();
    }
    if (gem) { drawGem(ctx, 0, 0, -40, 11); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(-3, -44, 3, 0, TAU); ctx.fill(); }
  }

  /* ───── 알과 새끼 ───── */
  const MINT = [[130, 236, 196], [18, 78, 70]], CREAM = [[255, 242, 206], [120, 92, 52]], HORN = [[255, 206, 120], [120, 60, 10]];
  const critter = () => polySprite("spot-reward-critter", () => [
    part(blk(-14, 0, -14, 16, 12, 16), ...MINT), part(blk(-14, 0, 14, 16, 12, 16), ...MINT),
    part(blk(16, 0, -14, 16, 12, 16), ...MINT), part(blk(16, 0, 14, 16, 12, 16), ...MINT),
    part(pyr([[-28, 14, -10], [-28, 14, 10], [-28, 32, 10], [-28, 32, -10]], [-66, 22, 0]), ...MINT),
    part(blk(0, 10, 0, 60, 46, 50, 0.85), ...MINT),
    part(blk(22, 14, 0, 18, 34, 40, 0.8), ...CREAM),
    part(pyr([[-10, 40, -24], [6, 40, -24], [6, 48, -24], [-10, 48, -24]], [-30, 82, -44]), ...MINT),
    part(pyr([[-10, 40, 24], [6, 40, 24], [6, 48, 24], [-10, 48, 24]], [-30, 82, 44]), ...MINT),
    part(blk(18, 52, 0, 56, 44, 50, 0.9), ...MINT),
    part(blk(48, 58, 0, 22, 20, 34, 0.9), ...CREAM),
    part(pyr([[4, 95, -18], [16, 95, -18], [16, 95, -8], [4, 95, -8]], [6, 118, -14]), ...HORN),
    part(pyr([[4, 95, 8], [16, 95, 8], [16, 95, 18], [4, 95, 18]], [6, 118, 14]), ...HORN),
  ], 150, 140, 0.6, 0.22);
  const CRACK = [[-52, -62], [-36, -78], [-22, -58], [-6, -82], [8, -60], [24, -80], [38, -60], [52, -70]];
  function eggShape(ctx) { ctx.beginPath(); ctx.ellipse(0, -66, 52, 66, 0, 0, TAU); }
  function eggFill(ctx) {
    const g = ctx.createRadialGradient(-18, -96, 6, 0, -60, 80);
    g.addColorStop(0, "#fffbea"); g.addColorStop(0.6, "#efe0b8"); g.addColorStop(1, "#b89c64");
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = "rgba(90,200,160,0.75)";
    for (const [x, y, r] of [[-22, -104, 9], [18, -88, 12], [-30, -40, 11], [26, -30, 8], [0, -60, 6]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0.4, 0, TAU); ctx.fill(); }
  }
  function drawEgg(ctx, e, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(e.t * 24) * 0.22 * e.wob);
    eggShape(ctx); eggFill(ctx);
    if (e.crack > 0) {
      const n = 1 + Math.floor(e.crack * (CRACK.length - 1));
      ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, -70, 40 + 50 * e.crack, "160,255,210", 0.5 * e.crack); ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#4a3410"; ctx.lineWidth = 4; ctx.lineJoin = "miter";
      ctx.beginPath(); CRACK.slice(0, n + 1).forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](px, py)); ctx.stroke();
      ctx.strokeStyle = "#d8fff0"; ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();
  }
  // 깨진 아래쪽 껍질 (새끼 앞에 그림)
  function drawHalfShell(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-52, -50);
    [[-40, -36], [-28, -52], [-14, -38], [0, -54], [14, -38], [28, -52], [40, -36], [52, -50]].forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.ellipse(0, -66, 52, 66, 0, 0.24, Math.PI - 0.24); ctx.closePath();
    eggFill(ctx);
    ctx.restore();
  }

  RECIPES.push(
    /* ───────── 1. 보물상자 ───────── */
    {
      id: "spot-reward-chest", cat: "rpg", view: "3d",
      title: { en: "Make chests *burst* with loot", ko: "보물상자를 *터지듯* 열기" },
      intro: { en: "A treasure chest. The lid just *swings*.", ko: "보물상자인데 뚜껑만 *스윽* 열려요." },
      interval: 3.0, stepDur: 4.0,
      setup(w) {
        w.ch = { x: 270, y: 256, lid: 0, peek: 0, vib: 0, sx: 1, sy: 1, glow: 0 };
        w.loot = [];
      },
      fire(w) {
        reset(w);
        const c = w.ch;
        Object.assign(c, { lid: 0, peek: 0, vib: 0, sx: 1, sy: 1, glow: 0 });
        w.loot = [];
        const open = () => {
          c.vib = 0; c.peek = 0;
          const fast = w.on("burst");
          w.tween(c, { lid: 1.95 }, fast ? 0.22 : 0.4, fast ? "back" : "lin");
          w.emit("open", c, c.x, c.y - 70);
        };
        if (w.on("rattle")) { w.emit("rattle", c); w.after(0.7, open); } else w.after(0.35, open);
      },
      update(w, dt) { stepLoot(w, dt); },
      drawFloor(w, ctx) {
        stage(ctx, "#12474a", "#03100f", 150);
        plinth(ctx, 270, 262, 150, 32, "#175457", "#0a2a2c");
        ctx.strokeStyle = "rgba(120,255,230,0.25)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(270, 262, 118, 24, 0, 0, TAU); ctx.stroke();
      },
      drawFront(w, ctx) {
        const c = w.ch, lid = c.lid + c.peek * Math.abs(Math.sin(w.time * 38));
        ctx.save();
        ctx.translate(c.x + rand(-c.vib, c.vib), c.y);
        ctx.scale(c.sx, c.sy);
        poly3d(ctx, chestParts(lid), 0, 0, 1.25, 0.5, 0.34);
        if (c.glow > 0) {
          ctx.globalCompositeOperation = "lighter";
          glow(ctx, 0, -74, 70, "255,210,90", 0.8 * c.glow);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();
        drawLoot(ctx, w);
      },
      steps: [
        {
          id: "rattle", name: { en: "Tension Rattle", ko: "덜컹 예고" }, param: "0.7s · vib 5px",
          cap: { en: "*Rattle* the lid. Let *light* leak out.", ko: "뚜껑이 *덜컹덜컹*, 틈으로 *빛*이 새요." },
          rattle(w, c) {
            w.tween(c, { vib: 5, peek: 0.13, glow: 0.7 }, 0.65, "in");
            w.spawn({ type: "glow", under: true, x: c.x, y: c.y - 70, size: 30, size1: 160, life: 0.75, color: "255,200,80" });
          },
        },
        {
          id: "burst", name: { en: "Lid Burst", ko: "뚜껑 폭발" }, param: "0.22s back · stop 80ms",
          cap: { en: "Kick the lid *open*. Squash the box.", ko: "뚜껑을 *뻥* 차올리고, 상자는 *찌그러져요*." },
          open(w, c) {
            w.hitstop(0.08); w.shake(0.45); w.flash("255,236,170", 0.5);
            c.sx = 1.2; c.sy = 0.78;
            w.tween(c, { sx: 1, sy: 1 }, 0.45, "back");
          },
        },
        {
          id: "geyser", name: { en: "Coin Geyser", ko: "동전 분수" }, param: "coins 28 · bounce",
          cap: { en: "Shoot a *geyser* of coins. Let them *bounce*.", ko: "동전이 *분수*처럼 솟고 *짤랑짤랑* 튀어요." },
          open(w, c, x, y) {
            for (let i = 0; i < 28; i++) w.after(i * 0.018, () => toss(w, x + rand(-36, 36), y, rand(-250, 250), rand(-740, -420)));
          },
        },
        {
          id: "gems", name: { en: "Gem Spray", ko: "보석 흩뿌리기" }, param: "gems 8 · stars 14",
          cap: { en: "Mix in *gems* and *sparkles*.", ko: "*보석*과 *반짝이*를 섞어요." },
          open(w, c, x, y) {
            for (let i = 0; i < 8; i++) toss(w, x + rand(-20, 20), y, rand(-300, 300), rand(-800, -560), i % 5);
            stars(w, x, y, 14, ["255,230,120", "120,240,255", "255,255,255"]);
          },
        },
        {
          id: "pillar", name: { en: "Light Pillar", ko: "빛기둥" }, param: "beam · rays 12 · rings",
          cap: { en: "A *pillar* of light. Rings *wash* the floor.", ko: "*빛기둥*이 솟고, 바닥에 *고리*가 퍼져요." },
          open(w, c, x, y) {
            c.glow = 1; w.tween(c, { glow: 0.4 }, 1.6);
            w.spawn({ type: "beam", under: true, x, y: 262, size: 50, h: 420, life: 1.5, hold: true, color: "255,210,110" });
            w.spawn({ type: "rays", under: true, x, y, n: 12, size: 50, size1: 240, vr: 0.7, life: 2.6, hold: true, color: "255,200,90" });
            for (let i = 0; i < 2; i++) w.spawn({ type: "ring", flat: true, x, y: 262, size: 30, size1: 240 + i * 70, life: 0.6 + i * 0.2, w: 10, color: i ? "80,240,220" : "255,220,110" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rattle + slam + chimes",
          cap: { en: "Wooden *rattle*, heavy *slam*, coin *chimes*.", ko: "*덜그럭*, *쾅*, 동전 *짤랑짤랑*." },
          rattle(w) { w.sfx.rattle(); },
          open(w) {
            w.sfx.slam(); w.sfx.fanfare();
            for (let i = 0; i < 6; i++) w.after(0.1 + i * 0.07, () => w.sfx.chime(i * 2));
          },
        },
      ],
    },

    /* ───────── 2. 레벨 업 ───────── */
    {
      id: "spot-reward-levelup", cat: "rpg", view: "3d",
      title: { en: "Make level ups feel *earned*", ko: "레벨 업을 *벅차게*" },
      intro: { en: "Level up. The number just *changes*.", ko: "레벨이 올랐는데 숫자만 *바뀌어요*." },
      interval: 3.0, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 270, h: 112, gy: 262 });
        w.lv = { n: 7, old: 7, roll: 1, pop: 1, xp: 0.25, bar: 0 };
      },
      fire(w) {
        reset(w);
        const h = w.hero, v = w.lv;
        Object.assign(v, { n: 7, old: 7, roll: 1, pop: 1, xp: 0.25, bar: 0 });
        Object.assign(h, { oy: 0, burn: 0 });
        const up = () => { v.old = v.n; v.n++; v.xp = 0; v.bar = 0; h.burn = 0; w.emit("level", h, v); };
        const slow = w.on("gather");
        w.emit("gather", h, v);
        w.after(slow ? 0 : 0.2, () => w.tween(v, { xp: 1 }, slow ? 0.7 : 0.45, slow ? "in" : "lin", up));
      },
      drawFloor(w, ctx) {
        stage(ctx, "#33226a", "#09061a", 190);
        plinth(ctx, 270, 262, 120, 26, "#3d2f78", "#1a1240");
        ctx.strokeStyle = "rgba(255,214,110,0.4)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(270, 262, 96, 20, 0, 0, TAU); ctx.stroke();
      },
      drawHud(w, ctx) {
        const v = w.lv, y = 74;
        // 롤링 숫자: 옛 숫자가 위로 빠지고 새 숫자가 아래에서 올라옴
        ctx.save(); ctx.translate(270, y); ctx.scale(v.pop, v.pop);
        label(ctx, "LV", -34, 2, 18, "#c9b8ff");
        ctx.save(); ctx.beginPath(); ctx.rect(-14, -24, 60, 48); ctx.clip();
        label(ctx, String(v.old), 14, -v.roll * 46, 40, "#fff");
        label(ctx, String(v.n), 14, (1 - v.roll) * 46, 40, v.n > 7 ? "#ffd75a" : "#fff");
        ctx.restore(); ctx.restore();
        // 경험치 막대
        rr(ctx, 170, 302, 200, 12, 6, "#120c2a", "#5a4aa0", 2);
        if (v.bar > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 170 + 200 * v.xp, 308, 30, "255,214,90", v.bar); ctx.globalCompositeOperation = "source-over"; }
        if (v.xp > 0.01) rr(ctx, 172, 304, 196 * v.xp, 8, 4, "#ffcf4a");
        label(ctx, "EXP", 150, 308, 11, "#a99ad8");
      },
      steps: [
        {
          id: "gather", name: { en: "XP Gather", ko: "경험치 모으기" }, param: "orbs 22 · ease-in",
          cap: { en: "Suck *XP orbs* in. The bar *accelerates*.", ko: "*경험치 구슬*을 빨아들이고 막대가 *가속*해요." },
          gather(w, h, v) {
            v.bar = 1; w.tween(h, { burn: 0.9 }, 0.6, "in");
            for (let i = 0; i < 22; i++) w.after(i * 0.026, () => {
              const a = rand(0, TAU), d = rand(110, 170);
              w.spawn({ type: "spark", seek: true, x: h.x + Math.cos(a) * d, y: h.gy - 60 + Math.sin(a) * d, tx: h.x, ty: h.gy - 60, life: 0.32, size: 3, color: pick(["255,214,90", "190,150,255"]) });
            });
          },
        },
        {
          id: "pillar", name: { en: "Golden Pillar", ko: "황금 빛기둥" }, param: "stop 100ms · beam",
          cap: { en: "*Freeze*, then a golden *pillar* lifts you.", ko: "*멈칫*, 황금 *빛기둥*이 몸을 띄워요." },
          level(w, h) {
            w.hitstop(0.1); w.flash("255,240,190", 0.55); h.flash = 1; h.sx = 0.8; h.sy = 1.3;
            w.spawn({ type: "beam", under: true, x: h.x, y: h.gy + 4, size: 58, h: 440, life: 1.3, hold: true, color: "255,214,90" });
            w.tween(h, { oy: -26 }, 0.18, "out", () => w.tween(h, { oy: 0 }, 0.6, "back"));
          },
        },
        {
          id: "roll", name: { en: "Number Roll", ko: "숫자 굴리기" }, param: "roll 0.4s · ×1.7",
          cap: { en: "*Roll* the digit like a slot. *Pop* it big.", ko: "숫자가 슬롯처럼 *드르륵*, 크게 *톡*." },
          level(w, h, v) {
            v.roll = 0; v.pop = 1.7;
            w.tween(v, { roll: 1 }, 0.4, "back");
            w.tween(v, { pop: 1 }, 0.55, "back");
          },
        },
        {
          id: "runes", name: { en: "Rune Rings", ko: "마법진 고리" }, param: "rings 3 · motes 24",
          cap: { en: "Rings *ripple* out. Motes *drift* up.", ko: "*고리*가 퍼지고, 빛가루가 *둥실* 올라요." },
          level(w, h) {
            for (let i = 0; i < 3; i++) w.spawn({ type: "ring", flat: true, x: h.x, y: 262, size: 20, size1: 150 + i * 60, life: 0.7 + i * 0.25, w: 9, color: i === 1 ? "190,150,255" : "255,214,90" });
            w.spawn({ type: "rays", under: true, x: h.x, y: h.gy - 60, n: 16, size: 50, size1: 230, vr: 0.6, life: 2, hold: true, color: "255,214,110" });
            for (let i = 0; i < 24; i++) w.spawn({ type: "glow", x: h.x + rand(-90, 90), y: 262 + rand(-14, 14), vy: rand(-240, -90), drag: 0.4, size: rand(4, 8), life: rand(1, 1.8), color: pick(["255,224,120", "200,170,255"]) });
          },
        },
        {
          id: "banner", name: { en: "Level Shout", ko: "레벨 업 외침" }, param: "text · stats · stars 18",
          cap: { en: "Shout *LEVEL UP*. Float the *stat gains*.", ko: "*LEVEL UP!* 외치고 *능력치*가 떠올라요." },
          level(w, h) {
            w.spawn({ type: "text", x: 270, y: 122, text: "LEVEL UP!", size: 34, color: "#ffd75a", life: 2 });
            w.spawn({ type: "text", x: 150, y: 196, vy: -30, text: "+3 ATK", size: 18, color: "#ff9a7a", life: 1.8 });
            w.spawn({ type: "text", x: 392, y: 214, vy: -30, text: "+2 DEF", size: 18, color: "#8ad8ff", life: 1.8 });
            stars(w, h.x, h.gy - 60, 18, ["255,224,110", "255,255,255", "200,160,255"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rise + chord + chime",
          cap: { en: "Rising *hum*, bright *chord*, a high *ding*.", ko: "차오르는 *웅~*, 밝은 *화음*, 높은 *딩*." },
          gather(w) { w.play(() => tn({ type: "sawtooth", f: 160, f2: 640, dur: 0.7, vol: 0.1 })); },
          level(w) { w.sfx.fanfare(); w.sfx.magic(); w.after(0.4, () => w.sfx.chime(12)); },
        },
      ],
    },

    /* ───────── 3. 10연차 뽑기 ───────── */
    {
      id: "spot-reward-gacha", cat: "ui", view: "ui",
      title: { en: "Make ten-pulls *build* to the rare", ko: "10연차를 *한 장씩* 쌓아 올리기" },
      intro: { en: "Ten cards flip at *once*. Rare? Who noticed.", ko: "열 장이 *한꺼번에* 뒤집혀요. 희귀 카드도 묻혀요." },
      interval: 3.2, stepDur: 4.2,
      setup(w) {
        const rar = [0, 0, 1, 0, 0, 0, 1, 0, 0, 2];
        w.cards = rar.map((r, i) => ({ i, rar: r, x: 270 + (i % 5 - 2) * 78, y: i < 5 ? 128 : 226, ang: 0, sc: 1, lift: 0, vib: 0, glow: 0, gold: false }));
        w.dim = 0;
      },
      fire(w) {
        reset(w);
        w.dim = 0;
        for (const c of w.cards) Object.assign(c, { ang: 0, sc: 1, lift: 0, vib: 0, glow: 0, gold: false });
        const flip = (c, d, ease = "out") => w.tween(c, { ang: Math.PI }, d, ease, () => w.emit("reveal", c));
        if (!w.on("cascade")) { w.after(0.15, () => w.cards.forEach(c => flip(c, 0.3, "lin"))); return; }
        const last = w.cards[9], t = 0.1 + 9 * 0.09;
        w.cards.slice(0, 9).forEach((c, i) => w.after(0.1 + i * 0.09, () => flip(c, 0.16)));
        if (w.on("hold")) { w.after(t, () => w.emit("hold", last)); w.after(t + 0.6, () => flip(last, 0.14)); }
        else w.after(t, () => flip(last, 0.16));
      },
      drawFloor(w, ctx) {
        stage(ctx, "#18326a", "#050a1a", 180);
        ctx.fillStyle = "rgba(255,255,255,0.04)"; rr(ctx, 70, 72, 400, 210, 16, "rgba(10,20,50,0.55)", "rgba(120,160,255,0.25)", 2);
      },
      drawFront(w, ctx) {
        for (const c of w.cards) {
          ctx.globalAlpha = c.i === 9 ? 1 : 1 - w.dim * 0.65;
          drawMini(ctx, w, c);
        }
        ctx.globalAlpha = 1;
      },
      steps: [
        {
          id: "cascade", name: { en: "Cascade Flip", ko: "도미노 뒤집기" }, param: "90ms stagger · pop",
          cap: { en: "Flip them *one by one*. Each one *pops*.", ko: "*한 장씩* 차례로 뒤집고 *톡톡* 튀어요." },
          reveal(w, c) {
            c.sc = 1.25;
            w.tween(c, { sc: 1 }, 0.25, "back");
          },
        },
        {
          id: "rarity", name: { en: "Rarity Glow", ko: "등급 빛" }, param: "glow · ring per card",
          cap: { en: "Each card *glows* its rarity color.", ko: "카드마다 *등급 색*으로 빛나요." },
          reveal(w, c) {
            c.glow = 1;
            w.spawn({ type: "ring", x: c.x, y: c.y, size: 20, size1: 60 + c.rar * 30, life: 0.4, w: 5, color: RAR[c.rar][2] });
          },
        },
        {
          id: "hold", name: { en: "Rare Hold", ko: "마지막 뜸 들이기" }, param: "pause 0.6s · dim",
          cap: { en: "*Pause* on the last card. Dim the rest.", ko: "마지막 장에서 *뜸*, 나머지는 *어둡게*." },
          hold(w, c) {
            c.gold = true; w.tween(w, { dim: 1 }, 0.25);
            w.tween(c, { vib: 4, lift: 14, sc: 1.2 }, 0.55, "in");
            w.spawn({ type: "glow", under: true, x: c.x, y: c.y, size: 20, size1: 110, life: 0.6, color: "255,200,80" });
          },
          reveal(w, c) {
            if (c.rar < 2) return;
            c.vib = 0; w.hitstop(0.1); w.flash("255,240,200", 0.5); w.shake(0.4);
            w.tween(w, { dim: 0 }, 0.6);
          },
        },
        {
          id: "burst", name: { en: "Gold Burst", ko: "황금 폭발" }, param: "rays 14 · stars 20",
          cap: { en: "Blast *rays* and *stars* from the rare.", ko: "희귀 카드에서 *빛줄기*와 *별*이 터져요." },
          reveal(w, c) {
            if (c.rar < 2) return;
            w.spawn({ type: "rays", under: true, x: c.x, y: c.y, n: 14, size: 40, size1: 220, vr: 0.9, life: 2, hold: true, color: "255,210,90" });
            w.spawn({ type: "ring", x: c.x, y: c.y, size: 20, size1: 200, life: 0.5, w: 10, color: "255,230,140" });
            stars(w, c.x, c.y, 20, ["255,220,90", "255,255,255", "255,170,80"]);
            w.spawn({ type: "text", x: 270, y: 54, text: "SUPER RARE!", size: 26, color: "#ffd75a", life: 2 });
          },
        },
        {
          id: "confetti", name: { en: "Confetti Rain", ko: "꽃가루" }, param: "pieces 50",
          cap: { en: "Rain *confetti* over the whole board.", ko: "화면 가득 *꽃가루*가 쏟아져요." },
          reveal(w, c) { if (c.rar === 2) confetti(w, 50); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising blips + fanfare",
          cap: { en: "Each flip *pitches up*. The rare gets a *fanfare*.", ko: "뒤집을수록 *음이 올라가고*, 희귀는 *팡파레*." },
          hold(w) { w.play(() => tn({ type: "sawtooth", f: 220, f2: 880, dur: 0.6, vol: 0.1 })); },
          reveal(w, c) { if (c.rar === 2) { w.sfx.boom(); w.sfx.fanfare(); } else w.sfx.blip(c.i + 1); },
        },
      ],
    },

    /* ───────── 4. 출석 보상 ───────── */
    {
      id: "spot-reward-daily", cat: "ui", view: "ui",
      title: { en: "Make daily rewards feel like *gifts*", ko: "출석 보상을 *선물*처럼" },
      intro: { en: "Day 7 reward. The number just *jumps*.", ko: "7일차 보상인데 숫자만 *휙* 바뀌어요." },
      interval: 3.0, stepDur: 4.0,
      setup(w) {
        w.dr = { sc: 1, open: false, item: 0, lidFly: null, claimed: false, stamp: 1 };
        w.ct = { n: 120, shown: 120, pop: 1, glow: 0 };
        w.fly2 = [];
      },
      fire(w) {
        reset(w);
        const d = w.dr, ct = w.ct;
        Object.assign(d, { sc: 1, open: false, item: 0, lidFly: null, claimed: false, stamp: 1 });
        Object.assign(ct, { n: 120, shown: 120, pop: 1, glow: 0 });
        w.fly2 = [];
        const claim = () => { d.claimed = true; w.emit("claim", d); };
        const open = () => {
          d.open = true;
          w.emit("open", d, 222, 184);
          if (w.on("fly")) w.after(0.85, claim);
          else { d.item = 1; ct.n += 50; w.emit("gain", ct, 50); w.after(0.4, claim); }
        };
        if (w.on("press")) { w.emit("press", d); w.after(0.25, open); } else w.after(0.35, open);
      },
      update(w, dt) {
        const d = w.dr, ct = w.ct, L = d.lidFly;
        stepFly(w, dt);
        if (!w.on("tick")) ct.shown = ct.n;
        ct.glow = Math.max(0, ct.glow - dt * 3);
        if (L) { L.vy += 1800 * dt; L.x += L.vx * dt; L.y += L.vy * dt; L.rot += L.vr * dt; if (L.y > 260) d.lidFly = null; }
      },
      drawFloor(w, ctx) {
        stage(ctx, "#561c3c", "#13050d", 170);
        // 옆 칸: 6일차(받음), 8일차(잠김)
        rr(ctx, 54, 140, 70, 96, 12, "#3a1428", "rgba(255,150,190,.25)", 2);
        label(ctx, "DAY 6", 89, 158, 12, "#c890a8"); label(ctx, "✓", 89, 196, 30, "#7ad08a");
        rr(ctx, 336, 140, 70, 96, 12, "#2a0f1e", "rgba(255,150,190,.18)", 2);
        label(ctx, "DAY 8", 371, 158, 12, "#8a6070"); label(ctx, "?", 371, 196, 30, "#6a4858");
      },
      drawFront(w, ctx) {
        const d = w.dr;
        ctx.save(); ctx.translate(230, 190); ctx.scale(d.sc, d.sc); ctx.translate(-230, -190);
        rr(ctx, 150, 96, 160, 188, 16, "#6a2448", "#ffb0cc", 3);
        label(ctx, "DAY 7", 230, 118, 16, "#ffe0ec");
        drawGift(ctx, d, 222, 214);
        if (d.item) { drawGem(ctx, 1, 230, 150, 16); label(ctx, "×50", 262, 156, 14, "#fff"); }
        if (d.claimed) {
          rr(ctx, 150, 96, 160, 188, 16, "rgba(20,6,14,0.5)");
          ctx.save(); ctx.translate(230, 196); ctx.rotate(-0.25); ctx.scale(d.stamp, d.stamp);
          rr(ctx, -66, -20, 132, 40, 8, "rgba(0,0,0,0)", "#7ef0a0", 4);
          label(ctx, "CLAIMED", 0, 1, 22, "#7ef0a0");
          ctx.restore();
        }
        ctx.restore();
        for (const f of w.fly2) if (f.t > 0) drawGem(ctx, 1, f.x, f.y, 11);
      },
      drawHud(w, ctx) {
        const ct = w.ct;
        ctx.save(); ctx.translate(425, 71); ctx.scale(ct.pop, ct.pop);
        if (ct.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, 0, 80, "120,200,255", ct.glow * 0.7); ctx.globalCompositeOperation = "source-over"; }
        rr(ctx, -58, -17, 116, 34, 17, "#1c0a14", "#ff9ec2", 2);
        drawGem(ctx, 1, -38, 0, 11);
        label(ctx, String(Math.round(ct.shown)), 12, 1, 18, "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "press", name: { en: "Press Squash", ko: "눌림 찌그러짐" }, param: "×0.86 · back 0.35s",
          cap: { en: "*Squash* the tile on tap. Let it *spring* back.", ko: "누르면 칸이 *꾹*, 놓으면 *통*." },
          press(w, d) {
            d.sc = 0.86;
            w.tween(d, { sc: 1 }, 0.35, "back");
            w.spawn({ type: "ring", x: 230, y: 190, size: 40, size1: 130, life: 0.3, w: 6, color: "255,170,210" });
          },
        },
        {
          id: "pop", name: { en: "Lid Pop", ko: "뚜껑 뻥" }, param: "lid fly · stop 60ms",
          cap: { en: "*Pop* the lid off. Light bursts *out*.", ko: "뚜껑이 *뻥* 날아가고 빛이 *쏟아져요*." },
          open(w, d, x, y) {
            d.lidFly = { x: 0, y: 0, vx: 170, vy: -720, rot: 0, vr: 9 };
            w.hitstop(0.06); w.flash("255,220,235", 0.4); w.shake(0.3);
            w.spawn({ type: "rays", under: true, x, y, n: 12, size: 30, size1: 170, vr: 1, life: 2.2, hold: true, color: "255,200,230" });
            stars(w, x, y, 10, ["255,220,240", "255,255,255", "120,200,255"], 150, 340);
          },
        },
        {
          id: "fly", name: { en: "Arc Fly", ko: "곡선 비행" }, param: "gems 5 · 0.45s curve",
          cap: { en: "Gems *arc* into the counter, one by one.", ko: "보석이 *곡선*을 그리며 하나씩 날아가요." },
          open(w, d, x, y) {
            for (let i = 0; i < 5; i++) flyTo(w, { x0: x, y0: y - 20, x1: 387, y1: 71, bend: -60 + i * 30, delay: i * 0.08, dur: 0.45, ease: E.inout, trail: "120,200,255",
              cb: () => { w.ct.n += 10; w.emit("gain", w.ct, 10); } });
          },
        },
        {
          id: "tick", name: { en: "Counter Tick", ko: "숫자 똑딱" }, param: "roll 0.3s · ×1.35",
          cap: { en: "The counter *rolls* up and *pulses* on each hit.", ko: "숫자가 *드르륵* 오르고, 받을 때마다 *톡*." },
          gain(w, ct, v) {
            w.tween(ct, { shown: ct.n }, 0.3);
            ct.pop = 1.35; ct.glow = 1;
            w.tween(ct, { pop: 1 }, 0.3, "back");
            w.spawn({ type: "text", x: 425, y: 104, vy: -40, text: "+" + v, size: 16, color: "#9ad8ff", life: 0.7 });
          },
        },
        {
          id: "stamp", name: { en: "Claimed Stamp", ko: "받음 도장" }, param: "×2.6 → 1 · shake .35",
          cap: { en: "*Slam* a stamp on it. Done means *done*.", ko: "*쾅* 도장으로 받았다고 못 박아요." },
          claim(w, d) {
            d.stamp = 2.6;
            w.tween(d, { stamp: 1 }, 0.16, "in", () => {
              w.shake(0.35);
              w.spawn({ type: "ring", x: 230, y: 196, size: 50, size1: 120, life: 0.35, w: 8, color: "126,240,160" });
            });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "click + pop + blips",
          cap: { en: "*Click*, *pop*, rising *blips*, a *thunk*.", ko: "*딸깍*, *뻥*, *띠링띠링*, *쾅*." },
          press(w) { w.sfx.clickDown(); },
          open(w) { w.sfx.pop(); w.sfx.chime(4); },
          gain(w, ct) { w.sfx.blip((ct.n - 120) / 10); },
          claim(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* ───────── 5. 코인 더미 줍기 ───────── */
    {
      id: "spot-reward-coins", cat: "ui", view: "3d",
      title: { en: "Make coin pickups *pour* in", ko: "코인 줍기를 *쏟아지듯*" },
      intro: { en: "32 coins. They all *slide* up together.", ko: "코인 32개가 *한 덩어리*로 스르륵 올라가요." },
      interval: 3.0, stepDur: 4.0,
      setup(w) {
        w.coins = PILE.map(p => Object.assign({}, p));
        w.ct = { n: 1250, shown: 1250, pop: 1, glow: 0 };
        w.got = 0;
      },
      fire(w) {
        reset(w);
        const ct = w.ct;
        Object.assign(ct, { n: 1250, shown: 1250, pop: 1, glow: 0 });
        w.got = 0;
        for (const c of w.coins) Object.assign(c, { x: 270 + c.hx, y: 262 + c.hy, st: "pile", vx: 0, vy: 0, sp: 0, delay: 0, bend: 0, ease: E.lin, dur: 0.4, trail: false });
        const launch = c => Object.assign(c, { st: "fly", t: 0, x0: c.x, y0: c.y });
        w.after(0.35, () => {
          w.emit("collect", w.coins);
          const wait = w.on("scatter") ? 0.35 : 0;
          for (const c of w.coins) { c.st = "loose"; w.after(wait + c.delay, () => launch(c)); }
        });
        w.after(2.5, () => w.coins.forEach(c => Object.assign(c, { st: "pile", x: 270 + c.hx, y: 262 + c.hy })));
      },
      update(w, dt) {
        const ct = w.ct;
        if (!w.on("tick")) ct.shown = ct.n;
        ct.glow = Math.max(0, ct.glow - dt * 3);
        for (const c of w.coins) {
          if (c.st === "loose") {
            c.vy += 1600 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.sp += dt * 12;
            if (c.y > 284) { c.y = 284; c.vy *= -0.4; c.vx *= 0.6; }
          } else if (c.st === "fly") {
            c.t += dt; c.sp += dt * 16;
            if (c.trail) w.spawn({ type: "glow", x: c.x, y: c.y, size: 8, size1: 0, life: 0.25, color: "255,210,80" });
            const k = c.ease(Math.min(1, c.t / c.dur)), u = 1 - k, cx = (c.x0 + 206) / 2 + c.bend, cy = (c.y0 + 66) / 2;
            c.x = u * u * c.x0 + 2 * u * k * cx + k * k * 206;
            c.y = u * u * c.y0 + 2 * u * k * cy + k * k * 66;
            if (c.t >= c.dur) {
              c.st = "gone"; ct.n += 10; w.got++;
              w.emit("arrive", ct, c.x, c.y);
              if (w.got === w.coins.length) w.emit("done", ct);
            }
          }
        }
      },
      drawFloor(w, ctx) {
        stage(ctx, "#12502a", "#03120a", 200);
        plinth(ctx, 270, 268, 130, 28, "#176236", "#0a3018");
      },
      drawFront(w, ctx) {
        for (const c of w.coins) if (c.st === "pile") drawFlatCoin(ctx, c.x, c.y, 13);
        for (const c of w.coins) if (c.st === "loose" || c.st === "fly") drawCoin(ctx, c.x, c.y, 10, c.sp);
      },
      drawHud(w, ctx) {
        const ct = w.ct;
        ctx.save(); ctx.translate(270, 66); ctx.scale(ct.pop, ct.pop);
        if (ct.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, -64, 0, 70, "255,214,90", ct.glow * 0.8); ctx.globalCompositeOperation = "source-over"; }
        rr(ctx, -96, -22, 192, 44, 22, "#08200f", "#ffd75a", 3);
        drawCoin(ctx, -64, 0, 14, 0);
        label(ctx, Math.round(ct.shown).toLocaleString("en-US"), 18, 1, 24, "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "scatter", name: { en: "Pop Scatter", ko: "톡 흩어짐" }, param: "0.35s · bounce",
          cap: { en: "*Burst* the pile first. Let coins *bounce*.", ko: "먼저 더미가 *톡* 터지고 동전이 *통통*." },
          collect(w, coins) {
            for (const c of coins) { c.vx = rand(-280, 280); c.vy = rand(-560, -280); }
            w.spawn({ type: "ring", flat: true, x: 270, y: 268, size: 30, size1: 180, life: 0.4, w: 8, color: "255,220,110" });
          },
        },
        {
          id: "magnet", name: { en: "Magnet Pull", ko: "자석 끌림" }, param: "30ms stagger · ease-in",
          cap: { en: "Pull them *one by one*, *speeding up* on curves.", ko: "*하나씩* 곡선으로, 점점 *빨라지며* 빨려 가요." },
          collect(w, coins) {
            coins.forEach((c, i) => Object.assign(c, { delay: i * 0.03, bend: rand(-170, 170), ease: E.in, dur: 0.45, trail: true }));
          },
        },
        {
          id: "tick", name: { en: "Rolling Count", ko: "숫자 굴리기" }, param: "+10 per coin · 0.25s",
          cap: { en: "Count *up* coin by coin. Don't jump.", ko: "한 번에 말고 *한 닢씩* 올려요." },
          arrive(w, ct) { w.tween(ct, { shown: ct.n }, 0.25); },
        },
        {
          id: "pulse", name: { en: "Counter Pulse", ko: "숫자판 들썩" }, param: "×1.18 per coin",
          cap: { en: "The counter *gulps* every coin.", ko: "동전 먹을 때마다 숫자판이 *꿀꺽*." },
          arrive(w, ct) {
            ct.pop = 1.18; ct.glow = 1;
            w.tween(ct, { pop: 1 }, 0.2, "back");
          },
        },
        {
          id: "spark", name: { en: "Arrival Sparks", ko: "도착 불꽃" }, param: "4 sparks · +320 text",
          cap: { en: "*Spark* on arrival. Shout the *total*.", ko: "도착할 때 *반짝*, 끝에 *총합*을 외쳐요." },
          arrive(w, ct, x, y) {
            for (let i = 0; i < 4; i++) w.spawn({ type: "spark", x, y, vx: rand(-260, 260), vy: rand(-200, 200), drag: 4, size: 2.5, life: 0.35, color: "255,230,120" });
          },
          done(w) {
            w.spawn({ type: "text", x: 270, y: 116, text: "+320", size: 32, color: "#ffd75a", life: 1.6 });
            w.spawn({ type: "rays", under: true, x: 270, y: 66, n: 14, size: 40, size1: 200, vr: 0.8, life: 1.6, hold: true, color: "255,214,90" });
            w.flash("255,240,180", 0.3);
            w.spawn({ type: "ring", x: 270, y: 66, size: 60, size1: 170, life: 0.45, w: 8, color: "255,220,110" });
            stars(w, 270, 66, 12, ["255,230,120", "255,255,255"], 150, 320);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising blips + chime",
          cap: { en: "Each coin *pings* a little higher.", ko: "한 닢마다 *띵* 소리가 조금씩 높아져요." },
          arrive(w) { if (w.got % 2) w.sfx.blip(w.got / 3); },
          done(w) { w.sfx.chime(7); },
        },
      ],
    },

    /* ───────── 6. 업적 메달 ───────── */
    {
      id: "spot-reward-achieve", cat: "ui", view: "3d",
      title: { en: "Make achievements *land* like medals", ko: "업적을 *메달*처럼 떨어뜨리기" },
      intro: { en: "Achievement unlocked. It just *appears*.", ko: "업적 달성! 그런데 그냥 *뿅* 나타나요." },
      interval: 3.0, stepDur: 4.0,
      setup(w) { w.md = { vis: false, y: 0, vy: 0, fall: false, sx: 1, sy: 1, yaw: 0, shine: -1, ban: 1 }; },
      fire(w) {
        reset(w);
        const m = w.md;
        Object.assign(m, { vis: false, y: 0, vy: 0, fall: false, sx: 1, sy: 1, yaw: 0, shine: -1, ban: 0, onLand: null });
        const unlock = () => { m.ban = 1; w.emit("unlock", m); };
        w.after(w.on("drop") ? 0.2 : 0.5, () => {
          m.vis = true;
          w.emit("show", m);
          if (m.fall) m.onLand = unlock;
          else unlock();
        });
      },
      update(w, dt) {
        const m = w.md;
        if (!m.fall) return;
        m.vy += 2600 * dt; m.y += m.vy * dt;
        if (m.y < 0) return;
        m.y = 0;
        if (m.vy > 300) {
          m.vy *= -0.32;
          w.emit("land", m);
          if (m.onLand) { m.onLand(); m.onLand = null; }
        } else { m.vy = 0; m.fall = false; }
      },
      drawFloor(w, ctx) {
        stage(ctx, "#2c3a58", "#070a14", 150);
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(270, 218, 60, 8, 0, 0, TAU); ctx.fill();
      },
      drawFront(w, ctx) {
        const m = w.md, cy = 140 + m.y;
        if (m.vis) {
          // 리본 두 갈래
          ctx.fillStyle = "#2a62c8"; ctx.beginPath(); ctx.moveTo(250, cy - 50); ctx.lineTo(214, cy - 150); ctx.lineTo(246, cy - 150); ctx.lineTo(276, cy - 50); ctx.fill();
          ctx.fillStyle = "#d8344a"; ctx.beginPath(); ctx.moveTo(290, cy - 50); ctx.lineTo(326, cy - 150); ctx.lineTo(294, cy - 150); ctx.lineTo(264, cy - 50); ctx.fill();
          ctx.save(); ctx.translate(270, cy); ctx.scale(m.sx, m.sy);
          poly3d(ctx, MEDAL, 0, 0, 1.35, m.yaw, 0.12);
          if (m.shine >= 0 && m.shine <= 1) {
            ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 66 * Math.abs(Math.cos(m.yaw)) + 2, 66, 0, 0, TAU); ctx.clip();
            const sx = -110 + m.shine * 220, g = ctx.createLinearGradient(sx - 30, -40, sx + 30, 40);
            g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(-80, -80, 160, 160);
            ctx.restore();
          }
          ctx.restore();
        }
        if (m.vis && m.ban > 0.02) {
          ctx.globalAlpha = Math.min(1, m.ban);
          label(ctx, "ACHIEVEMENT UNLOCKED", 270, 230, 13, "#ffd75a");
          ctx.save(); ctx.translate(270, 266); ctx.scale(m.ban, 1);
          ctx.fillStyle = "#7a1424";
          ctx.beginPath(); ctx.moveTo(-130, -12); ctx.lineTo(-168, -12); ctx.lineTo(-154, 4); ctx.lineTo(-168, 22); ctx.lineTo(-130, 22); ctx.fill();
          ctx.beginPath(); ctx.moveTo(130, -12); ctx.lineTo(168, -12); ctx.lineTo(154, 4); ctx.lineTo(168, 22); ctx.lineTo(130, 22); ctx.fill();
          rr(ctx, -140, -20, 280, 36, 6, "#d8344a", "#ffd75a", 3);
          label(ctx, "TREASURE HUNTER", 0, -1, 20, "#fff");
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      },
      steps: [
        {
          id: "drop", name: { en: "Drop & Bounce", ko: "툭 떨어져 통통" }, param: "g 2600 · bounce .32",
          cap: { en: "*Drop* it from above. *Squash* on landing.", ko: "위에서 *툭* 떨어져 *찌그러지며* 통통." },
          show(w, m) { m.y = -260; m.vy = 0; m.fall = true; },
          land(w, m) {
            m.sx = 1.25; m.sy = 0.78;
            w.tween(m, { sx: 1, sy: 1 }, 0.3, "back");
            w.shake(0.3);
            w.spawn({ type: "ring", flat: true, x: 270, y: 216, size: 30, size1: 150, life: 0.4, w: 8, color: "200,220,255" });
          },
        },
        {
          id: "spin", name: { en: "Coin Spin", ko: "팽그르르 회전" }, param: "2 turns · 0.9s out",
          cap: { en: "*Spin* it twice so the *thickness* shows.", ko: "*두 바퀴* 돌려서 *두께*를 보여 줘요." },
          unlock(w, m) {
            m.yaw = -TAU * 2;
            w.tween(m, { yaw: 0 }, 0.9, "out");
          },
        },
        {
          id: "shine", name: { en: "Shine Sweep", ko: "광택 훑기" }, param: "sweep 0.4s · glint",
          cap: { en: "Sweep a *shine* across. Add a *glint*.", ko: "*광택*이 쓱 지나가고 *반짝*." },
          unlock(w, m) {
            w.after(0.75, () => {
              m.shine = 0;
              w.tween(m, { shine: 1 }, 0.4, "inout");
              w.spawn({ type: "star", x: 316, y: 98, size: 18, life: 0.6, color: "255,255,255" });
            });
          },
        },
        {
          id: "banner", name: { en: "Banner Unfurl", ko: "현수막 펼치기" }, param: "0.35s back",
          cap: { en: "*Unfurl* the banner from the middle.", ko: "현수막이 가운데서 *쫙* 펼쳐져요." },
          unlock(w, m) {
            m.ban = 0;
            w.after(0.15, () => w.tween(m, { ban: 1 }, 0.35, "back"));
          },
        },
        {
          id: "glory", name: { en: "Glory Burst", ko: "영광의 폭발" }, param: "rays 16 · confetti 40",
          cap: { en: "*Rays* behind, *confetti* everywhere.", ko: "뒤로 *빛줄기*, 사방에 *꽃가루*." },
          unlock(w) {
            w.flash("255,240,200", 0.35);
            w.spawn({ type: "rays", under: true, x: 270, y: 140, n: 16, size: 60, size1: 250, vr: 0.6, life: 2.2, hold: true, color: "255,210,100" });
            w.spawn({ type: "ring", x: 270, y: 140, size: 60, size1: 200, life: 0.5, w: 10, color: "255,230,140" });
            stars(w, 270, 140, 16, ["255,220,90", "255,255,255", "140,190,255"]);
            confetti(w, 40);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thud + fanfare + ting",
          cap: { en: "Metal *clank*, a *fanfare*, a bright *ting*.", ko: "*철컹*, *팡파레*, 맑은 *팅*." },
          land(w) { w.sfx.thud(); },
          unlock(w) { w.sfx.fanfare(); w.after(0.75, () => w.sfx.chime(9)); },
        },
      ],
    },

    /* ───────── 7. 별 3개 결과 화면 ───────── */
    {
      id: "spot-reward-stars", cat: "ui", view: "ui",
      title: { en: "Make three stars *slam* in", ko: "별 3개를 *쾅쾅쾅* 박기" },
      intro: { en: "Perfect clear. Three stars just *show up*.", ko: "완벽 클리어인데 별 3개가 그냥 *켜져요*." },
      interval: 3.2, stepDur: 4.2,
      setup(w) {
        w.st = [[188, 166, 34, -0.22], [270, 150, 46, 0], [352, 166, 34, 0.22]].map(([x, y, r, rot]) => ({ x, y, r, rot, on: 0, a: 1, sc: 1 }));
        w.score = { shown: 0 };
      },
      fire(w) {
        reset(w);
        for (const s of w.st) Object.assign(s, { on: 0, a: 1, sc: 1 });
        w.score.shown = 0;
        const show = (s, i) => {
          s.on = 1; s.a = 1; s.sc = 1;
          w.emit("star", s, i);
          if (!w.on("slam")) w.emit("land", s, i);
          if (i === 2 && !w.on("count")) w.score.shown = 12480;
        };
        if (w.on("slam")) w.st.forEach((s, i) => w.after(0.3 + i * 0.36, () => show(s, i)));
        else w.after(0.45, () => w.st.forEach(show));
      },
      drawFloor(w, ctx) {
        stage(ctx, "#663409", "#160802", 150);
        rr(ctx, 110, 60, 320, 234, 22, "rgba(30,14,4,0.7)", "rgba(255,190,110,0.35)", 2);
        label(ctx, "STAGE CLEAR", 270, 82, 20, "#ffe2b0");
      },
      drawFront(w, ctx) {
        for (const s of w.st) drawStar3d(ctx, s);
        label(ctx, "SCORE", 270, 242, 13, "#d8a878");
        label(ctx, Math.round(w.score.shown).toLocaleString("en-US"), 270, 266, 28, "#fff");
      },
      steps: [
        {
          id: "slam", name: { en: "Slam In", ko: "쾅 박히기" }, param: "×3 → 1 · 0.36s apart",
          cap: { en: "Drop each star from *huge* to *slot*, one by one.", ko: "*크게* 떨어져서 칸에 *쾅*, 하나씩." },
          star(w, s, i) {
            s.sc = 3; s.a = 0;
            w.tween(s, { sc: 1, a: 1 }, 0.18, "in", () => w.emit("land", s, i));
          },
        },
        {
          id: "shake", name: { en: "Impact Shake", ko: "충격 흔들림" }, param: "trauma .2 → .5",
          cap: { en: "*Shake* harder with every star.", ko: "별이 늘수록 *더 세게* 흔들어요." },
          land(w, s, i) {
            w.shake(0.2 + i * 0.15);
            w.hitstop(0.04 + i * 0.03);
            w.kick(0, 6 + i * 4);
          },
        },
        {
          id: "burst", name: { en: "Star Burst", ko: "별 터짐" }, param: "ring · 8/14/20 sparks",
          cap: { en: "Ring and *sparks* on each landing.", ko: "박힐 때마다 *고리*와 *불꽃*." },
          land(w, s, i) {
            w.spawn({ type: "ring", x: s.x, y: s.y, size: s.r, size1: s.r * 2.6, life: 0.35, w: 8, color: "255,220,120" });
            for (let k = 0; k < 8 + i * 6; k++) {
              const a = rand(0, TAU), v = rand(160, 420);
              w.spawn({ type: "spark", x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 4, size: 3, life: 0.4, color: pick(["255,230,120", "255,160,60"]) });
            }
          },
        },
        {
          id: "finale", name: { en: "Third-Star Finale", ko: "세 번째 별 피날레" }, param: "flash · rays · zoom .1",
          cap: { en: "Save the *biggest* hit for the *last* star.", ko: "*마지막 별*에 가장 *큰 한 방*." },
          land(w, s, i) {
            if (i < 2) return;
            w.flash("255,230,170", 0.5); w.zoomPunch(0.1);
            w.spawn({ type: "rays", under: true, x: s.x, y: s.y, n: 16, size: 50, size1: 280, vr: 0.7, life: 2, hold: true, color: "255,200,90" });
            w.spawn({ type: "text", x: 270, y: 214, text: "PERFECT!", size: 30, color: "#ffd75a", life: 1.8 });
            stars(w, s.x, s.y, 18, ["255,230,120", "255,255,255", "255,170,80"]);
          },
        },
        {
          id: "count", name: { en: "Score Count", ko: "점수 올리기" }, param: "0 → 12,480 · 0.9s",
          cap: { en: "*Count* the score up. Don't just print it.", ko: "점수는 *0부터* 촤르륵 올려요." },
          land(w, s, i) {
            if (i < 2) return;
            w.tween(w.score, { shown: 12480 }, 0.9, "out");
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "3 rising chimes",
          cap: { en: "Each star rings a *higher* note.", ko: "별마다 *한 음씩* 높아져요." },
          land(w, s, i) {
            w.sfx.thud(); w.sfx.chime(i * 4);
            if (i === 2) w.sfx.fanfare();
          },
        },
      ],
    },

    /* ───────── 8. 승급 엠블럼 ───────── */
    {
      id: "spot-reward-rankup", cat: "rpg", view: "3d",
      title: { en: "Make promotions *shatter* the old rank", ko: "승급은 옛 계급을 *깨부수고*" },
      intro: { en: "Rank up. The icon just *swaps*.", ko: "승급했는데 아이콘만 *바뀌어요*." },
      interval: 3.0, stepDur: 4.0,
      setup(w) { w.em = { old: 1, nu: 0, vib: 0, sc: 1, wing: 1, glow: 0 }; },
      fire(w) {
        reset(w);
        const e = w.em;
        Object.assign(e, { old: 1, nu: 0, vib: 0, sc: 1, wing: 1, glow: 0 });
        const swap = () => {
          e.old = 0; e.vib = 0;
          w.emit("break", e, 270, 158);
          if (w.on("assemble")) return;
          e.nu = 1;
          w.emit("form", e, 270, 158);
        };
        if (w.on("crack")) { w.emit("charge", e); w.after(0.7, swap); } else w.after(0.45, swap);
      },
      drawFloor(w, ctx) {
        stage(ctx, "#5c1226", "#130306", 160);
        plinth(ctx, 270, 268, 120, 22, "#6a1a2e", "#2e0812");
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(270, 268, 50, 9, 0, 0, TAU); ctx.fill();
      },
      drawFront(w, ctx) {
        const e = w.em;
        ctx.save();
        ctx.translate(270 + (e.vib ? rand(-e.vib, e.vib) : 0), 158);
        ctx.scale(e.sc, e.sc);
        if (e.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, 0, 120, "255,120,80", e.glow * 0.6); ctx.globalCompositeOperation = "source-over"; }
        if (e.old) drawEmblem(ctx, SILVER, 2, 0, false);
        if (e.nu) drawEmblem(ctx, GOLDE, 3, e.wing, true);
        ctx.restore();
      },
      steps: [
        {
          id: "crack", name: { en: "Crack Up", ko: "금 가기" }, param: "0.7s · cracks 8",
          cap: { en: "The old badge *trembles* and *cracks* glow.", ko: "옛 계급장이 *덜덜*, 틈이 *빛나요*." },
          charge(w, e) {
            w.tween(e, { vib: 5, glow: 1 }, 0.65, "in");
            for (let i = 0; i < 8; i++) w.after(i * 0.08, () => {
              const a = rand(0, TAU), pts = [[0, 0]];
              for (let k = 1; k < 5; k++) pts.push([Math.cos(a) * k * 12 + rand(-6, 6), Math.sin(a) * k * 12 + rand(-6, 6)]);
              w.spawn({ type: "crack", x: 270 + rand(-30, 30), y: 158 + rand(-40, 40), pts, w: 3, life: 0.7 - i * 0.08, add: true, color: "255,190,120" });
            });
          },
        },
        {
          id: "shatter", name: { en: "Shatter", ko: "산산조각" }, param: "shards 34 · stop 110ms",
          cap: { en: "*Freeze*, then blow it into *shards*.", ko: "*멈칫*, 그리고 *와장창*." },
          break(w, e, x, y) {
            w.hitstop(0.11); w.flash("255,255,255", 0.5); w.shake(0.5);
            for (let i = 0; i < 34; i++) {
              const a = rand(0, TAU), s = rand(200, 600);
              w.spawn({ type: "chunk", x: x + rand(-40, 40), y: y + rand(-50, 50), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, g: 1500, vr: rand(-14, 14),
                ground: true, gy: 282, bounce: 0.4, size: rand(5, 11), life: rand(1.6, 2.3), hold: true, color: pick(["242,245,250", "142,152,172", "90,100,120"]) });
            }
          },
        },
        {
          id: "assemble", name: { en: "Reassemble", ko: "다시 조립" }, param: "orbs 18 · 0.45s",
          cap: { en: "Light *rushes in* and *forges* the new rank.", ko: "빛이 *모여들어* 새 계급장을 *빚어요*." },
          break(w, e, x, y) {
            for (let i = 0; i < 18; i++) {
              const a = rand(0, TAU), d = rand(150, 220);
              w.spawn({ type: "spark", seek: true, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, tx: x, ty: y, life: 0.42, size: 4, color: pick(["255,214,90", "255,250,200"]) });
            }
            w.after(0.45, () => {
              e.nu = 1; e.sc = 1.5;
              w.tween(e, { sc: 1 }, 0.4, "back");
              w.emit("form", e, x, y);
            });
          },
        },
        {
          id: "wings", name: { en: "Wing Unfurl", ko: "날개 펼치기" }, param: "0.45s back · rays 14",
          cap: { en: "*Unfold* the wings. Light *fans* out behind.", ko: "날개가 *촤악*, 뒤로 *빛살*이 퍼져요." },
          form(w, e, x, y) {
            e.wing = 0;
            w.tween(e, { wing: 1 }, 0.45, "back");
            w.spawn({ type: "rays", under: true, x, y, n: 14, size: 60, size1: 260, vr: 0.7, life: 2, hold: true, color: "255,200,100" });
            w.spawn({ type: "ring", x, y, size: 50, size1: 220, life: 0.5, w: 10, color: "255,220,130" });
          },
        },
        {
          id: "title", name: { en: "Rank Title", ko: "계급 외치기" }, param: "text · stars 18",
          cap: { en: "Shout the *new rank*. Throw *stars*.", ko: "*새 계급*을 외치고 *별*을 뿌려요." },
          form(w, e, x, y) {
            w.spawn({ type: "text", x: 270, y: 54, text: "PROMOTED!", size: 28, color: "#ffd75a", life: 2 });
            w.spawn({ type: "text", x: 270, y: 296, text: "GOLD III", size: 18, color: "#fff1c0", life: 2 });
            stars(w, x, y, 18, ["255,220,90", "255,255,255", "255,140,120"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "creak + crash + chord",
          cap: { en: "Straining *creak*, glass *crash*, a bright *chord*.", ko: "*끼긱*, *와장창*, 밝은 *화음*." },
          charge(w) { w.sfx.creak(); },
          break(w) { w.sfx.crit(); w.play(() => nz({ type: "highpass", f: 3000, f2: 6000, dur: 0.4, vol: 0.3 })); },
          form(w) { w.sfx.fanfare(); w.sfx.magic(); },
        },
      ],
    },

    /* ───────── 9. 알 부화 ───────── */
    {
      id: "spot-reward-hatch", cat: "rpg", view: "3d",
      title: { en: "Make egg hatches feel *alive*", ko: "알 부화를 *살아 있게*" },
      intro: { en: "The egg *vanishes*. A pet appears.", ko: "알이 *사라지고* 펫이 그냥 나와요." },
      interval: 3.0, stepDur: 4.0,
      setup(w) { w.egg = { egg: 1, t: 0, wob: 0, crack: 0, cs: 0, sx: 1, sy: 1, sil: 0, half: 0 }; },
      fire(w) {
        reset(w);
        const e = w.egg;
        Object.assign(e, { egg: 1, wob: 0, crack: 0, cs: 0, sx: 1, sy: 1, sil: 0, half: 0 });
        const hatch = () => {
          e.egg = 0; e.wob = 0; e.cs = 1;
          w.emit("hatch", e, 270, 196);
        };
        if (w.on("wobble")) { w.emit("wobble", e); w.after(0.9, hatch); } else w.after(0.45, hatch);
      },
      update(w, dt) { w.egg.t += dt; },
      drawFloor(w, ctx) {
        stage(ctx, "#3f5216", "#0c1104", 170);
        // 둥지
        ctx.fillStyle = "#3a2410"; ctx.beginPath(); ctx.ellipse(270, 266, 96, 22, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#8a5a28"; ctx.lineWidth = 4;
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(270, 262, 92 - (i % 3) * 6, 18, (i - 4) * 0.03, 0.1 + i * 0.6, 1.6 + i * 0.6); ctx.stroke(); }
      },
      drawFront(w, ctx) {
        const e = w.egg;
        if (e.egg) drawEgg(ctx, e, 270, 262);
        if (e.cs) {
          const s = critter(), H = 112, W = H * s.c.width / s.c.height;
          ctx.save(); ctx.translate(270, 256); ctx.scale(e.sx, e.sy);
          ctx.drawImage(s.c, -W / 2, -H, W, H);
          if (e.sil > 0) { ctx.globalAlpha = Math.min(1, e.sil); ctx.drawImage(s.white, -W / 2, -H, W, H); ctx.globalAlpha = 1; }
          ctx.restore();
        }
        if (e.half) drawHalfShell(ctx, 270, 262);
      },
      steps: [
        {
          id: "wobble", name: { en: "Wobble", ko: "흔들흔들" }, param: "0.9s · ±0.22 rad",
          cap: { en: "*Rock* the egg harder and harder.", ko: "알이 점점 *세게* 흔들려요." },
          wobble(w, e) { w.tween(e, { wob: 1 }, 0.85, "in"); },
        },
        {
          id: "cracks", name: { en: "Glowing Cracks", ko: "빛나는 금" }, param: "7 segments · glow",
          cap: { en: "A *crack* runs across. Light *leaks* out.", ko: "*쩍* 금이 가고 틈으로 *빛*이 새요." },
          wobble(w, e) { w.after(0.2, () => w.tween(e, { crack: 1 }, 0.6, "in")); },
        },
        {
          id: "burst", name: { en: "Shell Burst", ko: "껍질 폭발" }, param: "shards 22 · stop 90ms",
          cap: { en: "*Freeze*, then *pop* the shell. Keep the bottom.", ko: "*멈칫*, 껍질이 *팡*, 아래 반쪽은 남겨요." },
          hatch(w, e, x, y) {
            e.half = 1;
            w.hitstop(0.09); w.flash("240,255,220", 0.5); w.shake(0.4);
            for (let i = 0; i < 22; i++) {
              const a = rand(-Math.PI, 0), s = rand(220, 560);
              w.spawn({ type: "chunk", x: x + rand(-30, 30), y: y - 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 100, g: 1500, vr: rand(-12, 12),
                ground: true, gy: 270, bounce: 0.4, size: rand(5, 10), life: rand(1.6, 2.3), hold: true, color: pick(["255,248,226", "232,214,170", "120,210,170"]) });
            }
          },
        },
        {
          id: "reveal", name: { en: "Silhouette Pop", ko: "실루엣 등장" }, param: "white → color 0.6s",
          cap: { en: "Pop out as a *white silhouette*, then *color in*.", ko: "*하얀 실루엣*으로 톡, 그다음 *색이 차요*." },
          hatch(w, e) {
            e.sil = 1.4; e.sx = 0.6; e.sy = 1.5;
            w.tween(e, { sx: 1, sy: 1 }, 0.45, "back");
            w.tween(e, { sil: 0 }, 0.7, "in");
          },
        },
        {
          id: "joy", name: { en: "Joy Burst", ko: "탄생 축하" }, param: "rays 12 · stars · text",
          cap: { en: "*Rays*, *sparkles* and a big hello.", ko: "*빛살*, *반짝이*, 그리고 반가운 인사." },
          hatch(w, e, x, y) {
            w.spawn({ type: "rays", under: true, x, y: y - 10, n: 12, size: 50, size1: 240, vr: 0.6, life: 2.2, hold: true, color: "200,255,170" });
            w.spawn({ type: "ring", flat: true, x, y: 264, size: 30, size1: 220, life: 0.6, w: 10, color: "180,255,200" });
            w.spawn({ type: "text", x: 270, y: 60, text: "NEW BUDDY!", size: 28, color: "#c8ff8a", life: 2 });
            stars(w, x, y - 20, 16, ["220,255,170", "255,255,255", "130,240,200"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tock + crack + chirp",
          cap: { en: "Shell *tocks*, a *crack*, a happy *chirp*.", ko: "*톡톡*, *빠직*, 그리고 *삐약*." },
          wobble(w) { for (let i = 0; i < 4; i++) w.after(i * 0.2, () => w.sfx.tock()); },
          hatch(w) {
            w.sfx.crit();
            w.after(0.2, () => w.play(() => { tn({ type: "triangle", f: 1400, f2: 2100, dur: 0.09, vol: 0.2 }); tn({ type: "triangle", f: 1600, f2: 2400, dur: 0.09, vol: 0.2, delay: 0.12 }); }));
          },
        },
      ],
    },
  );
})();

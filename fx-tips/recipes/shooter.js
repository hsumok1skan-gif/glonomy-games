"use strict";
/* shooter — 탄막·FPS·TPS 레시피 */
(() => {
  /* ───────── 종스크롤 탄막 공용 ───────── */
  const PF0 = 130, PF1 = 410; // 탄막 플레이 영역 (가운데 세로 띠)
  const bhFloor = (w, ctx) => {
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(-40, -40, PF0 + 40, 440); ctx.fillRect(PF1, -40, 200, 440);
    ctx.fillStyle = "#0a0b11"; ctx.fillRect(PF0, -40, PF1 - PF0, 440);
    for (let i = 0; i < 46; i++) {
      const lay = i % 4, sp = 30 + lay * 40, x = PF0 + 6 + ((i * 97) % (PF1 - PF0 - 12)), y = ((i * 53 + w.time * sp) % 420) - 30;
      ctx.fillStyle = `rgba(200,210,255,${0.12 + lay * 0.1})`; ctx.fillRect(x, y, 1.5 + lay * 0.3, 2 + lay * 2);
    }
    ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(PF0 - 2, -40, 2, 440); ctx.fillRect(PF1, -40, 2, 440);
  };
  const shipModel = () => [
    blk(0, 0, 4, 16, 14, 64, 0.7),
    blk(0, 0, 14, 86, 6, 24, 1, 0, 4),
    blk(-12, 0, 30, 6, 16, 14, 0.6), blk(12, 0, 30, 6, 16, 14, 0.6),
    pyr([[-8, 0, -28], [8, 0, -28], [8, 12, -28], [-8, 12, -28]], [0, 6, -52]),
    blk(0, 12, -6, 9, 7, 18, 0.7),
  ];
  const makeShip = (w, x = 270, y = 296) => {
    if (!ACTOR["shooter-ship"]) {
      polySprite("shooter-ship", shipModel, 110, 110, 0, Math.PI / 2 - 0.001, [246, 244, 240], [70, 70, 80]);
      ACTOR["shooter-ship"] = { spr: "shooter-ship", h: 52, home: 270, top: true };
    }
    const s = w.actor("shooter-ship", { home: x, gy: y });
    s.noShadow = true;
    return s;
  };
  // 적 탄: 색 원. p.core 흰 심, p.rim 어두운 테두리, p.halo 번짐, p.pop 생겨날 때 크게
  const ebDraw = (ctx, p) => {
    const pop = p.pop ? 1 + Math.max(0, 1 - p.age / 0.14) * 1.4 : 1, r = p.r * pop;
    if (p.halo) { ctx.globalCompositeOperation = "lighter"; glow(ctx, p.x, p.y, r * 2.8, p.col, 0.45); ctx.globalCompositeOperation = "source-over"; }
    if (p.rim) { ctx.fillStyle = "rgba(6,6,12,0.95)"; ctx.beginPath(); ctx.arc(p.x, p.y, r + 2.5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = p.white ? "#fff" : `rgb(${p.col})`; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    if (p.core) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.55, 0, TAU); ctx.fill(); }
  };
  const enemyShot = (w, x, y, a, sp, o = {}) => w.shoot(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5, col: "244,114,182", enemy: true, draw: ebDraw, box: [PF0 - 10, -30, PF1 + 10, 380] }, o));
  const pShotDraw = (ctx, p) => {
    ctx.globalAlpha = p.alpha ?? 1;
    ctx.globalCompositeOperation = "lighter"; glow(ctx, p.x, p.y, 12, "198,244,50", 0.5); ctx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
    ctx.fillStyle = "#efffc2"; ctx.beginPath(); ctx.roundRect(-2.5, -10, 5, 20, 2.5); ctx.fill(); ctx.restore();
  };
  const playerShot = (w, x, y, a = -Math.PI / 2, o = {}) => w.shoot(Object.assign({ x, y, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, draw: pShotDraw, box: [PF0, -30, PF1, 380] }, o));
  const enemyShots = w => w.shots.filter(p => p.enemy);
  const panelText = (ctx, t, x, y, size, col, align = "left") => {
    ctx.font = `800 ${size}px 'JetBrains Mono', monospace`; ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.lineWidth = size * 0.2; ctx.strokeStyle = "rgba(8,9,14,0.9)"; ctx.lineJoin = "round"; ctx.strokeText(t, x, y);
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  };
  const pt = a => ({ x: a.x + a.ox, y: a.gy + a.oy });

  /* ───────── 1인칭(FPS) 공용 ───────── */
  // 카메라 공간: X 오른쪽, Y 위(눈높이 0), Z 앞. 조준점 = 화면 (270, 180)
  const HY = 180, FF = 280, FLOOR = -0.75;
  const P3 = (w, X, Y, Z) => {
    const f = FF * (w.fz || 1), z = Math.max(0.12, Z);
    return { x: 270 + X * f / z + (w.lookX || 0), y: HY - Y * f / z + (w.lookY || 0), s: f / z };
  };
  const PG = ([X, Y, Z]) => { const z = Math.max(0.12, Z); return { x: 270 + X * FF / z, y: HY - Y * FF / z }; };
  const unP = (w, sx, sy, Z) => { const f = FF * (w.fz || 1); return { X: (sx - 270 - (w.lookX || 0)) * Z / f, Y: -(sy - HY - (w.lookY || 0)) * Z / f, Z }; };
  const BOXF = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5], [3, 2, 6, 7], [0, 1, 5, 4]];
  const LIT = (() => { const l = [-0.45, 0.8, -0.4], n = Math.hypot(...l); return l.map(v => v / n); })();
  // 상자 여러 개를 그림: list = [{ b:[x0,x1,y0,y1,z0,z1], c:[r,g,b] }], xf = 꼭짓점 변환, proj = 투영
  function drawBoxes(ctx, list, xf, proj) {
    const items = list.map(it => {
      const [x0, x1, y0, y1, z0, z1] = it.b;
      const V = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(xf);
      const c = V.reduce((s, v) => [s[0] + v[0] / 8, s[1] + v[1] / 8, s[2] + v[2] / 8], [0, 0, 0]);
      return { V, c, col: it.c, a: it.a ?? 1, d: Math.hypot(...c) };
    }).sort((p, q) => q.d - p.d);
    ctx.lineJoin = "round"; ctx.lineWidth = 1; ctx.strokeStyle = "rgba(10,10,14,0.35)";
    for (const it of items) {
      for (const f of BOXF) {
        const q = f.map(i => it.V[i]);
        const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]], v = [q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]];
        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const fc = q.reduce((s, r) => [s[0] + r[0] / 4, s[1] + r[1] / 4, s[2] + r[2] / 4], [0, 0, 0]);
        if (n[0] * (fc[0] - it.c[0]) + n[1] * (fc[1] - it.c[1]) + n[2] * (fc[2] - it.c[2]) < 0) n = n.map(r => -r);
        if (n[0] * fc[0] + n[1] * fc[1] + n[2] * fc[2] >= 0) continue;
        const nl = Math.hypot(...n) || 1, b = 0.32 + 0.68 * Math.max(0, (n[0] * LIT[0] + n[1] * LIT[1] + n[2] * LIT[2]) / nl);
        ctx.globalAlpha = it.a;
        ctx.fillStyle = `rgb(${it.col.map(k => Math.round(k * b)).join(",")})`;
        ctx.beginPath(); q.forEach((r, i) => { const p = proj(r); ctx[i ? "lineTo" : "moveTo"](p.x, p.y); }); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  const GUNC = [86, 94, 112], DARK = [46, 50, 62], SKIN = [228, 225, 218];
  const GUN = [
    { b: [0.215, 0.375, -0.62, -0.42, 0.06, 0.32], c: SKIN },
    { b: [0.22, 0.34, -0.36, -0.22, 0.25, 0.78], c: GUNC },
    { b: [0.25, 0.31, -0.54, -0.36, 0.56, 0.67], c: DARK, mag: true },
    { b: [0.255, 0.305, -0.22, -0.19, 0.32, 0.74], c: DARK, slide: true },
    { b: [0.265, 0.295, -0.19, -0.165, 0.38, 0.42], c: DARK },
    { b: [0.341, 0.346, -0.3, -0.275, 0.34, 0.74], c: [198, 244, 50] },
    { b: [0.235, 0.325, -0.33, -0.23, 0.78, 1.08], c: [70, 78, 94] },
    { b: [0.265, 0.295, -0.29, -0.26, 1.08, 1.38], c: [40, 44, 54] },
    { b: [0.273, 0.287, -0.23, -0.165, 1.0, 1.03], c: DARK },
    { b: [0.205, 0.37, -0.44, -0.3, 0.3, 0.46], c: SKIN },
    { b: [0.215, 0.35, -0.39, -0.3, 0.86, 0.99], c: SKIN },
  ];
  const gunXf = w => {
    const g = w.fp, piv = [0.28, -0.3, 0.4], cr = Math.cos(g.roll), sr = Math.sin(g.roll), cp = Math.cos(g.rot), sp = Math.sin(g.rot);
    return ([x, y, z]) => {
      let dx = x - piv[0], dy = y - piv[1], dz = z - piv[2];
      [dx, dy] = [dx * cr - dy * sr, dx * sr + dy * cr];
      [dy, dz] = [dy * cp + dz * sp, -dy * sp + dz * cp];
      return [piv[0] + dx + g.ox - 0.06 - 0.22 * g.ads, piv[1] + dy + g.oy + 0.03 + 0.14 * g.ads + g.kick * 0.2 - g.dip * 0.3, piv[2] + dz - g.kick];
    };
  };
  const gunPt = (w, p) => PG(gunXf(w)(p));
  const fpMuzzle = w => gunPt(w, [0.28, -0.275, 1.4]);
  const drawFpGun = (w, ctx) => {
    const g = w.fp, xf = gunXf(w);
    const parts = GUN.filter(p => !(p.mag && g.mag <= 0)).map(p => {
      if (p.mag && g.magY) return { b: [p.b[0], p.b[1], p.b[2] - g.magY, p.b[3] - g.magY, p.b[4], p.b[5]], c: p.c };
      if (p.slide && g.slide) return { b: [p.b[0], p.b[1], p.b[2], p.b[3], p.b[4] - g.slide, p.b[5] - g.slide], c: p.c };
      return p;
    });
    drawBoxes(ctx, parts, xf, PG);
  };
  const fpSpring = (w, dt) => {
    const g = w.fp, k = Math.min(1, dt * 14);
    g.kick -= g.kick * k; g.rot -= g.rot * Math.min(1, dt * 10); g.ox -= g.ox * k; g.oy -= g.oy * k;
    if (!g.holdRoll) g.roll -= g.roll * Math.min(1, dt * 8);
  };
  const fpsSetup = (w, gobs, props) => {
    w.fp = { kick: 0, rot: 0, roll: 0, dip: 0, ads: 0, ox: 0, oy: 0, mag: 1, magY: 0, slide: 0 };
    w.fz = 1; w.lookX = 0; w.lookY = 0;
    w.props = props || [
      { b: [-3.6, -2.6, FLOOR, FLOOR + 1, 6, 7], c: [161, 98, 7] },
      { b: [2.8, 3.6, FLOOR, 2.6, 9, 9.8], c: [90, 96, 112] },
      { b: [-5.2, -4.4, FLOOR, 2.6, 12, 12.8], c: [90, 96, 112] },
    ];
    if (!ACTOR["shooter-gob"]) {
      polySprite("shooter-gob", goblinModel, 170, 190, 1.15, 0.12, [150, 205, 95], [32, 56, 26]);
      ACTOR["shooter-gob"] = { spr: "shooter-gob", h: 80, home: 270, hp: 100 };
    }
    w.gobs = (gobs || []).map(([X, Z]) => { const g = w.actor("shooter-gob"); g.X = X; g.Z = Z; placeG(w, g); return g; });
  };
  const placeG = (w, g) => {
    const p = P3(w, g.X, FLOOR, g.Z);
    g.home = p.x; if (!g.flying) g.x = p.x;
    g.gy = p.y; g.h = 1.3 * p.s; g.w = g.h * g.s.c.width / g.s.c.height;
  };
  const fpsTick = (w, dt) => { fpSpring(w, dt); for (const g of w.gobs) placeG(w, g); };
  const torso = g => ({ x: g.x + g.ox + g.w * 0.02, y: g.gy + g.oy - g.h * 0.42 });
  const headPt = g => ({ x: g.x + g.ox - g.w * 0.1, y: g.gy + g.oy - g.h * 0.74 });
  const fpsRoom = (w, ctx) => {
    const zb = 18, back = P3(w, 0, FLOOR, zb), top = P3(w, 0, 3.2, zb).y;
    const sky = ctx.createLinearGradient(0, -60, 0, back.y); sky.addColorStop(0, "#0c0d12"); sky.addColorStop(1, "#1c1e27");
    ctx.fillStyle = sky; ctx.fillRect(-80, -80, 700, back.y + 80);
    ctx.fillStyle = "#23252f"; ctx.fillRect(-80, top, 700, back.y - top);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let X = -20; X <= 20; X += 2.5) { const p = P3(w, X, 0, zb); ctx.fillRect(p.x, top, 1.5, back.y - top); }
    const fl = ctx.createLinearGradient(0, back.y, 0, 380); fl.addColorStop(0, "#1a1b22"); fl.addColorStop(1, "#2a2c36");
    ctx.fillStyle = fl; ctx.fillRect(-80, back.y, 700, 480);
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let X = -12; X <= 12; X += 1.5) { const a = P3(w, X, FLOOR, 0.9), b = P3(w, X, FLOOR, zb); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    for (const Z of [1.2, 1.7, 2.4, 3.3, 4.6, 6.4, 9, 13]) { const a = P3(w, -14, FLOOR, Z), b = P3(w, 14, FLOOR, Z); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    drawBoxes(ctx, w.props, v => v, ([X, Y, Z]) => P3(w, X, Y, Z));
  };
  const xhair = (ctx, gap = 6, col = "rgba(255,255,255,0.9)", len = 8, cx = 270, cy = HY) => {
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 4; ctx.lineCap = "round";
    const seg = () => { ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(cx + dx * gap, cy + dy * gap); ctx.lineTo(cx + dx * (gap + len), cy + dy * (gap + len)); } ctx.stroke(); };
    seg(); ctx.strokeStyle = col; ctx.lineWidth = 2; seg();
  };
  const xMark = (ctx, x, y, r0, r1, col, lw = 3) => {
    ctx.lineCap = "round";
    for (const [c, l] of [["rgba(0,0,0,0.55)", lw + 2.5], [col, lw]]) {
      ctx.strokeStyle = c; ctx.lineWidth = l; ctx.beginPath();
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(x + dx * r0, y + dy * r0); ctx.lineTo(x + dx * r1, y + dy * r1); }
      ctx.stroke();
    }
  };
  const mFlash = (w, m, s = 1) => {
    w.spawn({ type: "glow", x: m.x, y: m.y, size: 56 * s, size1: 12, life: 0.07, color: "255,210,120" });
    w.spawn({ type: "star", x: m.x, y: m.y, size: 34 * s, life: 0.05, color: "255,245,220" });
  };
  const hudNum = (ctx, t, x, y, size, col, align = "right") => panelText(ctx, t, x, y, size, col, align);
  // 화면 자체를 다시 그려 흐림/흑백/겹침 효과 (clipFn으로 영역 제한)
  const screenFx = (ctx, filter, alpha, dx = 0, dy = 0, clipFn) => {
    ctx.save();
    if (clipFn) { ctx.beginPath(); clipFn(ctx); ctx.clip("evenodd"); }
    const m = ctx.getTransform(), sx = Math.hypot(m.a, m.b);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = filter; ctx.globalAlpha = alpha;
    ctx.drawImage(ctx.canvas, dx * sx, dy * sx);
    ctx.restore();
  };
  const PAT = [[0, 0], [0, 1.2], [0.3, 2.4], [0.9, 3.4], [1.8, 4.2], [1.2, 5], [0.2, 5.6], [-0.8, 6.1]]; // 반동 패턴 (고정)
  const tracerDraw = (w, m, h) => (ctx, p) => {
    const col = h.hot ? "255,110,50" : "255,244,210";
    const k = Math.min(1, p.age / 0.13), tx = p.x - (p.x - m.x) * 0.6, ty = p.y - (p.y - m.y) * 0.6;
    const lw = w.trace ? 7 - 5.5 * k : 3;
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    const g = ctx.createLinearGradient(tx, ty, p.x, p.y); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},1)`);
    ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(p.x, p.y); ctx.stroke();
    glow(ctx, p.x, p.y, 6 + lw * 2, col, 0.8);
  };
  // 재질별 자국: metal 찌그러짐, wood 구멍+갈라짐, flesh 초록 얼룩
  const drawDecal = (w, ctx, d) => {
    let x = d.x, y = d.y, s = d.s;
    if (d.X != null) { const p = P3(w, d.X, d.Y, d.Z); x = p.x; y = p.y; s = p.s / 56; }
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(d.rot || 0);
    if (d.mat === "metal") {
      const g = ctx.createRadialGradient(-1, -1, 0, 0, 0, 7); g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#cbd5e1"); g.addColorStop(1, "rgba(30,41,59,0.9)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.6)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
    } else if (d.mat === "wood") {
      ctx.strokeStyle = "rgba(60,30,8,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); } ctx.stroke();
      ctx.fillStyle = "#1c0f04"; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(77,124,15,0.95)";
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      for (let i = 0; i < 4; i++) { const a = i * 1.7; ctx.beginPath(); ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.6, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  };
  // 모아 쏘기 색 단계와 발사
  const TIER = ["198,244,50", "56,189,248", "167,139,250", "244,114,182"];
  const release = w => {
    const m = muzzle(w), k = w.ch; w.ch = -1;
    const b = { x: m.x + 8, y: m.y, vx: 900, vy: 0, big: false, k, col: TIER[w.tier], hitX: w.foe.x - 40 };
    w.emit("release", b);
    b.draw = (ctx, p) => {
      const r = p.big ? 8 + p.k * 26 : 6;
      ctx.globalCompositeOperation = "lighter"; glow(ctx, p.x, p.y, r * 2.4, p.col, 0.9); ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.6, 0, TAU); ctx.fill();
    };
    b.onHit = p => { w.emit("hit", { x: p.x, y: p.y }); w.foe.flash = Math.max(w.foe.flash, 0.6); w.after(0.3, () => { w.busy = false; }); };
    w.shoot(b);
  };
  const edgeClip = (rx, ry) => c => { c.rect(-100, -100, 740, 560); c.ellipse(270, HY, rx, ry, 0, 0, TAU); };

  RECIPES.push(
    /* 1 ─ 스치기 */
    {
      id: "shooter-graze", cat: "shooter", view: "top",
      title: { en: "Reward the *graze*", ko: "*스치기*에 보상 주기" },
      intro: { en: "Bullets skim the ship. *Nobody notices.*", ko: "총알이 아슬아슬 스쳐요. *아무도 몰라요.*" },
      interval: 0.8, stepDur: 3.6,
      drawFloor: bhFloor,
      setup(w) {
        w.ship = makeShip(w);
        w.boss = w.actor("foeTop", { home: 270, gy: 62 }); w.boss.maxHp = 0;
        w.gz = { n: 0, bump: 0, aura: 0, meter: 0, full: 0 };
        w.side = 1;
      },
      fire(w) {
        for (let i = 0; i < 7; i++) w.after(i * 0.09, () => {
          const s = pt(w.ship), b = w.boss;
          w.side = -w.side;
          const tx = s.x + w.side * rand(20, 26), a = Math.atan2(s.y - b.gy - 20, tx - b.x);
          enemyShot(w, b.x, b.gy + 20, a, 320);
        });
      },
      update(w, dt) {
        const s = w.ship;
        s.x = 270 + Math.sin(w.time * 1.1) * 60;
        const p = pt(s);
        for (const b of enemyShots(w)) {
          if (!b.grazed && Math.hypot(b.x - p.x, b.y - p.y) < 30) { b.grazed = true; w.gz.n++; w.emit("graze", b, p); }
        }
        w.gz.bump = Math.max(0, w.gz.bump - dt * 5); w.gz.aura = Math.max(0, w.gz.aura - dt * 4); w.gz.full = Math.max(0, w.gz.full - dt);
      },
      drawFront(w, ctx) {
        const g = w.gz, p = pt(w.ship);
        if (g.aura > 0) {
          ctx.strokeStyle = `rgba(125,211,252,${g.aura})`; ctx.lineWidth = 2 + g.aura * 3;
          ctx.beginPath(); ctx.arc(p.x, p.y, 30 + (1 - g.aura) * 8, 0, TAU); ctx.stroke();
        }
      },
      drawHud(w, ctx) {
        const g = w.gz;
        if (w.on("count")) {
          panelText(ctx, "GRAZE", 30, 70, 14, "rgba(255,255,255,0.6)");
          ctx.save(); ctx.translate(30, 100); ctx.scale(1 + g.bump * 0.4, 1 + g.bump * 0.4);
          panelText(ctx, String(g.n), 0, 0, 28, g.bump > 0.3 ? "#7dd3fc" : "#fff"); ctx.restore();
        }
        if (w.on("meter")) {
          panelText(ctx, "POWER", 30, 150, 14, "rgba(255,255,255,0.6)");
          rr(ctx, 30, 166, 84, 14, 4, "rgba(255,255,255,0.12)");
          rr(ctx, 30, 166, Math.max(4, 84 * g.meter), 14, 4, g.full > 0 ? "#fff" : "#7dd3fc");
        }
      },
      steps: [
        {
          id: "spark", name: { en: "Graze Sparks", ko: "스치는 불꽃" }, param: "5 sparks / graze",
          cap: { en: "Throw *sparks* where the bullet skims past.", ko: "총알이 스친 자리에 *불꽃*이 튀어요." },
          graze(w, b, s) {
            const mx = (b.x + s.x) / 2, my = (b.y + s.y) / 2, a = Math.atan2(my - s.y, mx - s.x);
            sparks(w, mx, my, 5, "186,230,253", [160, 380], a - 0.7, a + 0.7);
          },
        },
        {
          id: "aura", name: { en: "Graze Ring", ko: "스치기 고리" }, param: "r 30px pulse",
          cap: { en: "Pulse a *ring* around the ship. It was *that* close.", ko: "기체 둘레에 *고리*가 번져요. *그만큼* 가까웠어요." },
          graze(w) { w.gz.aura = 1; },
        },
        {
          id: "count", name: { en: "Graze Counter", ko: "스치기 카운터" }, param: "+1 · bump 40%",
          cap: { en: "*Count* every graze. Danger becomes *score*.", ko: "스칠 때마다 *숫자*가 올라가요. 위험이 *점수*가 돼요." },
          graze(w, b, s) {
            w.gz.bump = 1;
            w.spawn({ type: "text", text: "+10", x: s.x + (b.x - s.x) * 1.6, y: s.y - 18, vy: -90, life: 0.5, size: 15, color: "#7dd3fc" });
          },
        },
        {
          id: "tint", name: { en: "Mark the Bullet", ko: "스친 총알 표시" }, param: "turns white",
          cap: { en: "Turn the grazed bullet *white*. You see what you skimmed.", ko: "스친 총알은 *하얗게*. 뭘 피했는지 보여요." },
          graze(w, b) { b.white = true; b.r = 6; },
        },
        {
          id: "meter", name: { en: "Graze Meter", ko: "스치기 게이지" }, param: "+6% / graze",
          cap: { en: "Fill a *meter*. When it's full, *power up*.", ko: "*게이지*가 차오르고, 꽉 차면 *강해져요*." },
          graze(w, b, s) {
            const g = w.gz; g.meter += 0.06;
            if (g.meter >= 1) {
              g.meter = 0; g.full = 0.6; w.ship.flash = 1;
              w.spawn({ type: "ring", x: s.x, y: s.y, size: 10, size1: 90, life: 0.4, w: 8, color: "125,211,252" });
            }
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick + pitch climb",
          cap: { en: "A tiny *tick*, rising with the meter.", ko: "작은 *틱* 소리가 게이지 따라 올라가요." },
          graze(w) { w.sfx.blip(w.on("meter") ? 1 + Math.floor(w.gz.meter * 12) : 1); },
        },
      ],
    },

    /* 2 ─ 피격 판정점 보이기 */
    {
      id: "shooter-hitbox", cat: "shooter", view: "top", polished: true,
      title: { en: "Show the *real hitbox*", ko: "*진짜 판정점* 보여 주기" },
      intro: { en: "The ship is big. The hitbox is a *dot*. Who knew?", ko: "기체는 큰데 판정은 *점* 하나. 누가 알아요?" },
      interval: 2.6, stepDur: 4.0,
      drawFloor: bhFloor,
      setup(w) {
        w.ship = makeShip(w);
        w.hb = { focus: 0, k: 0, pop: 0, spin: 0 };
        w.rowT = 0;
      },
      fire(w) { w.hb.focus = 2.0; w.emit("focus", pt(w.ship)); },
      update(w, dt) {
        const h = w.hb, s = w.ship;
        h.focus = Math.max(0, h.focus - dt);
        h.k += ((h.focus > 0 ? 1 : 0) - h.k) * Math.min(1, dt * 12);
        h.pop = Math.max(0, h.pop - dt * 3); h.spin += dt * 2.5;
        h.dot = 0; h.ring = 0; h.near = 0;
        s.x = 270 + Math.sin(w.time * 0.9) * 46 + Math.sin(w.time * 2.3) * 10;
        s.alpha = 1;
        w.rowT -= dt;
        if (w.rowT <= 0) {
          w.rowT = 0.2;
          for (let i = 0; i < 3; i++) enemyShot(w, rand(PF0 + 10, PF1 - 10), -10, Math.PI / 2 + rand(-0.12, 0.12), rand(150, 210), { r: 6, col: "244,114,182" });
        }
      },
      drawFront(w, ctx) {
        const h = w.hb, p = pt(w.ship);
        if (h.k < 0.05) return;
        if (h.near) for (const b of enemyShots(w)) {
          const d = Math.hypot(b.x - p.x, b.y - p.y);
          if (d < h.near) { ctx.strokeStyle = `rgba(255,255,255,${h.k * (1 - d / h.near)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, 0, TAU); ctx.stroke(); }
        }
        if (h.ring) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(h.spin); ctx.strokeStyle = `rgba(255,255,255,${h.k * 0.85})`; ctx.lineWidth = 2;
          const R = h.ring + h.pop * 26;
          for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(0, 0, R, i * TAU / 8, i * TAU / 8 + 0.45); ctx.stroke(); }
          ctx.restore();
        }
        if (h.dot) {
          ctx.globalAlpha = h.k;
          ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(p.x, p.y, h.dot + 2.5, 0, TAU); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, h.dot, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
      },
      steps: [
        {
          id: "dot", name: { en: "Hitbox Dot", ko: "판정점" }, param: "r 3.5px · on focus",
          cap: { en: "On focus, draw the *one pixel* that can die.", ko: "집중하면 *맞는 곳* 딱 한 점을 보여 줘요." },
          update(w) { w.hb.dot = 3.5; },
        },
        {
          id: "fade", name: { en: "Ghost the Ship", ko: "기체 흐리게" }, param: "alpha 0.45",
          cap: { en: "Fade the ship. The *dot* is what matters now.", ko: "기체는 흐리게. 이제 *점*만 보면 돼요." },
          update(w) { w.ship.alpha = 1 - w.hb.k * 0.55; },
        },
        {
          id: "ring", name: { en: "Focus Ring", ko: "집중 고리" }, param: "8 ticks · spin",
          cap: { en: "A spinning *ring* frames the dot.", ko: "도는 *고리*가 판정점을 감싸요." },
          update(w) { w.hb.ring = 20; },
        },
        {
          id: "pop", name: { en: "Snap In", ko: "툭 나타나기" }, param: "ring 46→20px",
          cap: { en: "The ring *snaps in* from wide. You *feel* focus start.", ko: "고리가 넓게 시작해 *툭* 조여요. 집중이 *느껴져요*." },
          focus(w, p) { w.hb.pop = 1; w.spawn({ type: "ring", x: p.x, y: p.y, size: 60, size1: 8, life: 0.22, w: 4, color: "255,255,255" }); },
        },
        {
          id: "near", name: { en: "Danger Outline", ko: "가까운 탄 테두리" }, param: "< 60px",
          cap: { en: "Outline bullets *near the dot*. Read danger fast.", ko: "점 *가까운 총알*만 테두리. 위험이 한눈에 보여요." },
          update(w) { w.hb.near = 60; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "click + hum",
          cap: { en: "A crisp *click* when focus kicks in.", ko: "집중 들어갈 때 또렷한 *딸깍*." },
          focus(w) { w.sfx.clickDown(); w.play(() => tn({ type: "triangle", f: 880, f2: 1320, dur: 0.12, vol: 0.12 })); },
        },
      ],
    },

    /* 3 ─ 폭탄으로 화면 지우기 */
    {
      id: "shooter-bomb", cat: "shooter", view: "top", polished: true,
      title: { en: "Make the bomb *clear the screen*", ko: "폭탄이 *화면을 싹* 쓸게" },
      intro: { en: "Press bomb. Bullets just *vanish*.", ko: "폭탄을 눌러요. 총알이 그냥 *사라져요*." },
      interval: 2.4, stepDur: 4.0,
      drawFloor: bhFloor,
      setup(w) {
        w.ship = makeShip(w, 270, 300);
        w.foes = [190, 350].map(x => { const f = w.actor("foeTop", { home: x, gy: 70 }); f.maxHp = 0; return f; });
        w.bomb = null; w.calm = 0; w.sprayT = 0; w.cut = 0; w.spin = 0;
      },
      fire(w) {
        if (w.bomb) return;
        const s = pt(w.ship);
        w.calm = 1.2; w.emit("bomb", s);
        if (!w.on("wave")) for (const b of enemyShots(w)) { b.dead = true; w.emit("clear", b); }
      },
      update(w, dt) {
        w.ship.x = 270 + Math.sin(w.time * 0.8) * 30;
        w.calm = Math.max(0, w.calm - dt); w.cut = Math.max(0, w.cut - dt);
        w.sprayT -= dt;
        if (w.sprayT <= 0 && w.calm <= 0) {
          w.sprayT = 0.16; w.spin += 0.35;
          for (const f of w.foes) for (let i = 0; i < 6; i++) enemyShot(w, f.x, f.gy + 10, w.spin + i * TAU / 6, 120, { r: 5, col: i % 2 ? "244,114,182" : "251,191,36", core: true });
        }
        const B = w.bomb;
        if (B) {
          B.r += dt * 420;
          for (const b of enemyShots(w)) if (!b.dead && Math.hypot(b.x - B.x, b.y - B.y) < B.r) { b.dead = true; w.emit("clear", b); }
          if (B.r > 460) w.bomb = null;
        }
        w.shots = w.shots.filter(p => !p.dead);
      },
      drawFront(w, ctx) {
        const B = w.bomb;
        if (B) {
          ctx.save(); ctx.beginPath(); ctx.rect(PF0, -40, PF1 - PF0, 440); ctx.clip();
          ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, TAU); ctx.stroke();
          ctx.strokeStyle = "rgba(125,211,252,0.5)"; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(B.x, B.y, Math.max(0, B.r - 18), 0, TAU); ctx.stroke();
          ctx.restore();
        }
      },
      drawHud(w, ctx) {
        if (w.cut <= 0) return;
        const k = w.cut / 1.2, slide = k > 0.8 ? (k - 0.8) / 0.2 : k < 0.2 ? -(0.2 - k) / 0.2 : 0;
        ctx.save(); ctx.translate(270 + slide * 420, 180);
        ctx.fillStyle = "rgba(198,244,50,0.92)"; ctx.beginPath(); ctx.moveTo(-200, -26); ctx.lineTo(220, -26); ctx.lineTo(200, 26); ctx.lineTo(-220, 26); ctx.closePath(); ctx.fill();
        ctx.font = "900 36px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#10120a"; ctx.fillText("BOMB!", 0, 2);
        ctx.restore();
      },
      steps: [
        {
          id: "wave", name: { en: "Shockwave", ko: "충격파" }, param: "420 px/s",
          cap: { en: "Clear with an *expanding wave*. You *see* it sweep.", ko: "*퍼지는 파동*으로 지워요. 쓸려 나가는 게 *보여요*." },
          bomb(w, s) { w.bomb = { x: s.x, y: s.y, r: 0 }; },
        },
        {
          id: "points", name: { en: "Bullets → Points", ko: "총알이 점수로" }, param: "seek ship 0.5s",
          cap: { en: "Every cleared bullet *turns into a star* and flies home.", ko: "지운 총알이 *별*이 돼서 기체로 날아와요." },
          clear(w, b) { const s = pt(w.ship); w.spawn({ type: "star", seek: true, x: b.x, y: b.y, tx: s.x, ty: s.y, life: rand(0.45, 0.7), size: 7, color: "253,224,71" }); },
        },
        {
          id: "flash", name: { en: "Flash + Shake", ko: "섬광 + 흔들림" }, param: "white .8 · trauma .5",
          cap: { en: "Blind the screen *white*, then shake.", ko: "화면을 *하얗게* 덮고, 크게 흔들어요." },
          bomb(w) { w.flash("255,255,255", 0.8); w.shake(0.5); w.zoomPunch(0.06); },
        },
        {
          id: "cutin", name: { en: "Cut-in Banner", ko: "컷인 띠" }, param: "slide 1.0s",
          cap: { en: "A *banner* slashes across. Big moment, big type.", ko: "*띠*가 가로질러요. 큰 순간엔 큰 글씨." },
          bomb(w) { w.cut = 1.2; },
        },
        {
          id: "enemy", name: { en: "Enemies Reel", ko: "적도 휘청" }, param: "flash + knock 18px",
          cap: { en: "Enemies *flinch* too. The bomb hits *everything*.", ko: "적도 *움찔*해요. 폭탄은 *전부* 때려요." },
          bomb(w) { for (const f of w.foes) { f.flash = 1.4; f.oy -= 18; f.vib = 6; } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "boom + sweep",
          cap: { en: "A deep *boom*, then a rising *sweep*.", ko: "낮은 *쾅*, 이어서 올라가는 *쉬익*." },
          bomb(w) { if (w.on("wave")) w.sfx.boom(); else w.sfx.burst(); if (w.on("cutin")) w.sfx.boost(); },
        },
      ],
    },

    /* 4 ─ 파워업 */
    {
      id: "shooter-powerup", cat: "shooter", view: "top", polished: true,
      title: { en: "Make power-ups *feel big*", ko: "파워업을 *크게* 느끼게" },
      intro: { en: "Got the item. Shot changed. *Did it?*", ko: "아이템 먹었는데… 뭐가 *바뀐 거죠?*" },
      interval: 1.8, stepDur: 3.8,
      drawFloor: bhFloor,
      setup(w) {
        w.ship = makeShip(w);
        w.lv = 1; w.shotT = 0; w.items = []; w.pip = 0; w.spin = 0;
      },
      fire(w) {
        const it = { x: rand(PF0 + 50, PF1 - 50), y: 10, t: 0, dead: false };
        w.items.push(it);
      },
      update(w, dt) {
        const s = w.ship; s.x = 270 + Math.sin(w.time * 0.9) * 40;
        const p = pt(s); w.spin += dt * 4; w.itemFx = false; w.pip = Math.max(0, w.pip - dt * 3);
        for (const it of w.items) {
          it.t += dt; it.y += dt * 260; it.x += (p.x - it.x) * Math.min(1, dt * 2.5);
          if (it.y > p.y - 10) { it.dead = true; w.lv = w.lv % 4 + 1; w.emit("power", p, w.lv); }
        }
        w.items = w.items.filter(i => !i.dead);
        w.shotT -= dt;
        if (w.shotT <= 0) {
          w.shotT = 0.11;
          const n = [1, 2, 3, 5][w.lv - 1], sp = [0, 0.05, 0.14, 0.2][w.lv - 1];
          for (let i = 0; i < n; i++) {
            const k = n === 1 ? 0 : i / (n - 1) - 0.5;
            playerShot(w, p.x + k * (n === 2 ? 20 : 12), p.y - 24, -Math.PI / 2 + (n === 2 ? 0 : k * sp * 2));
          }
        }
      },
      drawFront(w, ctx) {
        for (const it of w.items) {
          const fancy = w.itemFx;
          if (fancy) { ctx.globalCompositeOperation = "lighter"; glow(ctx, it.x, it.y, 34, "248,113,113", 0.7); ctx.globalCompositeOperation = "source-over"; }
          ctx.save(); ctx.translate(it.x, it.y); if (fancy) ctx.rotate(Math.sin(it.t * 8) * 0.25);
          rr(ctx, -12, -12, 24, 24, 5, fancy && Math.floor(it.t * 10) % 2 ? "#fff" : "#ef4444");
          ctx.font = "900 17px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#1a0606"; ctx.fillText("P", 0, 1);
          ctx.restore();
        }
      },
      drawHud(w, ctx) {
        if (!w.on("hud")) return;
        panelText(ctx, "POWER", 30, 70, 14, "rgba(255,255,255,0.6)");
        for (let i = 0; i < 4; i++) {
          const on = i < w.lv, cur = i === w.lv - 1, sc = cur ? 1 + w.pip * 0.6 : 1;
          ctx.save(); ctx.translate(38 + i * 22, 98); ctx.scale(sc, sc);
          rr(ctx, -8, -12, 16, 24, 3, on ? (cur && w.pip > 0.3 ? "#fff" : "#c6f432") : "rgba(255,255,255,0.12)");
          ctx.restore();
        }
        if (w.lv === 4) panelText(ctx, "MAX", 30, 128, 16, "#fde047");
      },
      steps: [
        {
          id: "item", name: { en: "Glowing Item", ko: "빛나는 아이템" }, param: "glow + blink 10Hz",
          cap: { en: "Make the item *glow and blink*. You *want* it.", ko: "아이템이 *빛나고 깜빡여요*. 먹고 *싶어져요*." },
          update(w) { w.itemFx = true; },
        },
        {
          id: "flash", name: { en: "Pickup Flash", ko: "먹는 순간 섬광" }, param: "ring 90px",
          cap: { en: "Flash the ship and blow out a *ring*.", ko: "기체가 번쩍, *고리*가 퍼져요." },
          power(w, p) {
            w.ship.flash = 1.3; w.ship.sx = w.ship.sy = 1.35;
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 12, size1: 90, life: 0.35, w: 8, color: "248,113,113" });
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 70, size1: 10, life: 0.3, color: "255,200,200" });
          },
        },
        {
          id: "text", name: { en: "Shout It", ko: "글자로 외치기" }, param: "\"POWER UP!\"",
          cap: { en: "Shout it in *text*. Say what changed.", ko: "*글자*로 외쳐요. 뭐가 바뀌었는지 말해 줘요." },
          power(w, p, lv) { w.spawn({ type: "text", text: lv === 4 ? "MAX POWER!" : lv === 1 ? "RESET" : "POWER UP!", x: p.x, y: p.y - 56, vy: -60, life: 0.9, size: 24, color: lv === 4 ? "#fde047" : "#fca5a5" }); },
        },
        {
          id: "hud", name: { en: "Level Pips", ko: "단계 칸" }, param: "4 pips · bump",
          cap: { en: "Fill a *pip* in the HUD. Progress you can *count*.", ko: "옆 칸이 *한 칸* 차요. *셀 수 있는* 성장." },
          power(w) { w.pip = 1; },
        },
        {
          id: "burst", name: { en: "Show-off Volley", ko: "자랑 사격" }, param: "14-shot fan",
          cap: { en: "Fire one *huge fan* right away. Show the new power.", ko: "바로 *부채꼴 한 방*. 새 힘을 보여 줘요." },
          power(w, p) { for (let i = 0; i < 14; i++) playerShot(w, p.x, p.y - 20, -Math.PI / 2 + (i / 13 - 0.5) * 1.6); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "fanfare",
          cap: { en: "A short *fanfare*. The ear gets the news too.", ko: "짧은 *빰빠밤*. 귀도 소식을 들어요." },
          power(w) { if (w.on("text") || w.on("burst")) w.sfx.fanfare(); else w.sfx.itemGet(); },
        },
      ],
    },

    /* 5 ─ 옵션 드론 */
    {
      id: "shooter-options", cat: "shooter", view: "top", polished: true,
      title: { en: "Give option drones *life*", ko: "옵션 드론에 *생기* 넣기" },
      intro: { en: "Two dots, *glued* to the ship.", ko: "점 두 개가 기체에 *붙어만* 있어요." },
      interval: 1.6, stepDur: 3.8,
      drawFloor: bhFloor,
      setup(w) {
        w.ship = makeShip(w);
        w.form = 0; w.formT = 0; w.shotT = 0; w.spin = 0;
        w.opts = [-1, 1].map(s => ({ s, x: 270 + s * 46, y: 306, fl: 0 }));
      },
      fire(w) {
        w.formT = 1 - w.formT;
        if (!w.on("ease")) w.form = w.formT;
        w.emit("switch", w.formT);
      },
      update(w, dt) {
        const s = w.ship;
        s.x = 270 + Math.sin(w.time * 1.7) * 80; s.gy = 292 + Math.sin(w.time * 2.6) * 14;
        const p = pt(s); w.spin += dt * 6;
        const lag = w.lag; w.lag = 0; w.orb = w.tether = false;
        for (const o of w.opts) {
          const tx = p.x + o.s * (46 - 30 * w.form), ty = p.y + 12 - 34 * w.form;
          if (lag) { o.x += (tx - o.x) * Math.min(1, dt * lag); o.y += (ty - o.y) * Math.min(1, dt * lag); }
          else { o.x = tx; o.y = ty; }
          o.fl = Math.max(0, o.fl - dt * 10);
        }
        w.shotT -= dt;
        if (w.shotT <= 0) {
          w.shotT = 0.12;
          playerShot(w, p.x, p.y - 24);
          for (const o of w.opts) { playerShot(w, o.x, o.y - 10, -Math.PI / 2 - o.s * 0.12 * (1 - w.form)); w.emit("ofire", o); }
        }
      },
      drawFront(w, ctx) {
        const p = pt(w.ship);
        if (w.tether) for (const o of w.opts) {
          ctx.strokeStyle = "rgba(125,211,252,0.45)"; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -w.time * 40;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(o.x, o.y); ctx.stroke(); ctx.setLineDash([]);
        }
        for (const o of w.opts) {
          if (w.orb) {
            ctx.globalCompositeOperation = "lighter"; glow(ctx, o.x, o.y, 26, "125,211,252", 0.8); ctx.globalCompositeOperation = "source-over";
            ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(w.spin * o.s);
            ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI, Math.PI + 1.6); ctx.stroke();
            ctx.restore();
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, TAU); ctx.fill();
          } else { ctx.fillStyle = "#9ca3af"; ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, TAU); ctx.fill(); }
          if (o.fl > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, o.x, o.y - 14, 14 * o.fl + 6, "198,244,50", o.fl); ctx.globalCompositeOperation = "source-over"; }
        }
      },
      steps: [
        {
          id: "follow", name: { en: "Lag Behind", ko: "살짝 늦게 따라오기" }, param: "lerp 6/s",
          cap: { en: "Let drones *trail* the ship. Now they *swing*.", ko: "드론이 *한 박자 늦게* 따라와요. *출렁*거려요." },
          update(w) { w.lag = 6; },
        },
        {
          id: "ease", name: { en: "Formation Ease", ko: "대형 바꾸기" }, param: "0.35s back-ease",
          cap: { en: "Swap formation with an *overshoot*, not a teleport.", ko: "대형은 순간이동 말고, *살짝 지나쳤다* 돌아와요." },
          switch(w, to) { w.tween(w, { form: to }, 0.35, "back"); },
        },
        {
          id: "orb", name: { en: "Glowing Core", ko: "빛나는 몸체" }, param: "glow + spin ring",
          cap: { en: "Glow + a *spinning ring*. Drones look *alive*.", ko: "빛 + *도는 고리*. 드론이 *살아* 보여요." },
          update(w) { w.orb = true; },
        },
        {
          id: "flash", name: { en: "Drone Muzzle", ko: "드론 총구 불빛" }, param: "1 frame flash",
          cap: { en: "Every drone shot *flashes*. They pull their weight.", ko: "드론도 쏠 때마다 *번쩍*. 제 몫을 해요." },
          ofire(w, o) { o.fl = 1; },
        },
        {
          id: "tether", name: { en: "Link Line", ko: "연결선" }, param: "dashed · flowing",
          cap: { en: "A thin *flowing line* ties drones to the ship.", ko: "가는 *흐르는 선*이 기체와 이어 줘요." },
          update(w) { w.tether = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh on swap",
          cap: { en: "A soft *whoosh* when the formation changes.", ko: "대형이 바뀔 때 가벼운 *휙*." },
          switch(w) { w.sfx.dash(); },
        },
      ],
    },

    /* 6 ─ 적 탄 읽히게 */
    {
      id: "shooter-readable", cat: "shooter", view: "top", polished: true,
      title: { en: "Make enemy bullets *readable*", ko: "적 탄을 *잘 보이게*" },
      intro: { en: "Busy screen. Which ones *kill you?*", ko: "화면이 정신없어요. 뭐가 *위험하죠?*" },
      interval: 0.45, stepDur: 3.6,
      drawFloor(w, ctx) {
        bhFloor(w, ctx);
        ctx.save(); ctx.beginPath(); ctx.rect(PF0, -40, PF1 - PF0, 440); ctx.clip();
        ctx.globalCompositeOperation = "lighter";
        const blobs = [[200, 0, "236,72,153"], [330, 140, "56,189,248"], [230, 260, "168,85,247"], [360, 330, "244,114,182"]];
        for (const [x, y0, c] of blobs) glow(ctx, x + Math.sin(w.time + y0) * 20, ((y0 + w.time * 40) % 460) - 50, 120, c, 0.55);
        ctx.globalCompositeOperation = "source-over";
        if (w.dimBg) { ctx.fillStyle = `rgba(6,6,10,${w.dimBg})`; ctx.fillRect(PF0, -40, PF1 - PF0, 440); }
        ctx.restore();
      },
      setup(w) {
        w.ship = makeShip(w);
        w.boss = w.actor("foeTop", { home: 270, gy: 66 }); w.boss.maxHp = 0;
        w.st = { r: 4, core: false, rim: false, halo: false, pop: false }; w.shotA = 1; w.shotT = 0; w.ang = 0;
      },
      fire(w) {
        const b = w.boss; w.ang += 0.21;
        for (let i = 0; i < 12; i++) {
          const o = Object.assign({}, w.st, { col: "236,72,153" });
          w.emit("spawn", o);
          enemyShot(w, b.x, b.gy + 10, w.ang + i * TAU / 12, 120, o);
        }
      },
      update(w, dt) {
        const s = w.ship; s.x = 270 + Math.sin(w.time * 1.2) * 40;
        w.dimBg = 0; w.shotA = 1;
        w.shotT -= dt;
        if (w.shotT <= 0) {
          w.shotT = 0.07; const p = pt(s);
          for (const dx of [-14, 0, 14]) playerShot(w, p.x + dx, p.y - 22, -Math.PI / 2, { alpha: w.shotA });
        }
      },
      steps: [
        {
          id: "core", name: { en: "White Core", ko: "흰 심" }, param: "core 55%",
          cap: { en: "A *white core* pops against any color.", ko: "가운데 *흰 심*. 어떤 배경에서도 튀어요." },
          spawn(w, o) { o.core = true; },
        },
        {
          id: "size", name: { en: "Bigger", ko: "크게" }, param: "r 4 → 7px",
          cap: { en: "Bullets that kill you deserve *size*.", ko: "죽이는 총알은 *커야* 해요." },
          spawn(w, o) { o.r = 7; },
        },
        {
          id: "rim", name: { en: "Dark Rim", ko: "어두운 테두리" }, param: "2.5px outline",
          cap: { en: "A *dark rim* cuts it off the background.", ko: "*어두운 테두리*로 배경에서 떼어 내요." },
          spawn(w, o) { o.rim = true; },
        },
        {
          id: "dimbg", name: { en: "Dim Background", ko: "배경 낮추기" }, param: "bg × 0.38",
          cap: { en: "Turn the *background down*. It's decoration.", ko: "*배경은 어둡게*. 어차피 장식이에요." },
          update(w) { w.dimBg = 0.62; },
        },
        {
          id: "dimshots", name: { en: "Quiet Player Shots", ko: "내 총알 낮추기" }, param: "alpha 0.3",
          cap: { en: "Your own shots go *see-through*. They can't hurt you.", ko: "내 총알은 *반투명*. 날 해치지 않으니까요." },
          update(w) { w.shotA = 0.3; },
        },
        {
          id: "pop", name: { en: "Spawn Pop", ko: "생길 때 크게" }, param: "2.4× → 1× 140ms",
          cap: { en: "Bullets *pop in big*. You see the volley *start*.", ko: "총알이 *크게 생겨나요*. 발사 순간이 보여요." },
          spawn(w, o) { o.pop = true; o.halo = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "volley chirp",
          cap: { en: "A *chirp* per volley. Ears warn you too.", ko: "발사마다 *찍*. 귀로도 경고해요." },
          spawn(w, o) { if (!w.chirp || w.time - w.chirp > 0.1) { w.chirp = w.time; w.sfx.magic(); } },
        },
      ],
    },

    /* 7 ─ 보스 탄막 피어나기 */
    {
      id: "shooter-bloom", cat: "shooter", view: "top",
      title: { en: "Let boss patterns *bloom*", ko: "보스 탄막을 *꽃처럼*" },
      intro: { en: "A ring of bullets. *Flat* and dull.", ko: "총알 한 바퀴. *밋밋해요*." },
      interval: 1.7, stepDur: 4.0,
      drawFloor: bhFloor,
      setup(w) {
        w.ship = makeShip(w, 270, 312);
        w.boss = w.actor("foeTop", { home: 270, gy: 96, h: 96 }); w.boss.maxHp = 0;
        w.wave = 0; w.glowB = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const release = () => {
          const b = w.boss, n = 20; w.wave++;
          w.emit("release", b);
          for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n; i++) {
            const a = (i + layer * 0.5) * TAU / n + w.wave * 0.2;
            const o = { r: 6, col: "244,114,182", core: true, a, sp: 150 - layer * 40, curve: 0, ramp: false };
            w.emit("bullet", o, layer);
            enemyShot(w, b.x, b.gy, a, o.ramp ? 30 : o.sp, Object.assign(o, { box: [PF0 - 20, -60, PF1 + 20, 400] }));
          }
          w.after(0.3, () => { w.busy = false; });
        };
        if (w.on("tele")) { w.emit("tele", w.boss); w.after(0.45, release); } else release();
      },
      update(w, dt) {
        w.ship.x = 270 + Math.sin(w.time * 0.7) * 30;
        w.glowB = Math.max(0, w.glowB - dt * 2.2);
        for (const p of enemyShots(w)) {
          if (p.ramp) { const sp = Math.min(p.sp * 1.15, 30 + p.age * p.age * 520); p.cur = sp; }
          else p.cur = p.sp;
          if (p.curve) p.a += p.curve * dt;
          p.vx = Math.cos(p.a) * p.cur; p.vy = Math.sin(p.a) * p.cur;
        }
      },
      drawBack(w, ctx) {
        if (w.glowB > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, w.boss.x, w.boss.gy, 90 * w.glowB + 20, "244,114,182", w.glowB); ctx.globalCompositeOperation = "source-over"; }
      },
      steps: [
        {
          id: "tele", name: { en: "Telegraph", ko: "예고" }, param: "0.45s wind-up",
          cap: { en: "*Glow and gather* first. Players need a warning.", ko: "먼저 *빛을 모아요*. 피할 *예고*가 필요해요." },
          tele(w, b) {
            w.glowB = 1;
            w.spawn({ type: "ring", x: b.x, y: b.gy, size: 110, size1: 14, life: 0.45, w: 5, color: "244,114,182" });
            for (let i = 0; i < 14; i++) { const a = rand(0, TAU), d = rand(60, 110); w.spawn({ type: "spark", seek: true, x: b.x + Math.cos(a) * d, y: b.gy + Math.sin(a) * d, tx: b.x, ty: b.gy, life: 0.4, size: 2.5, color: "251,207,232" }); }
          },
        },
        {
          id: "ramp", name: { en: "Slow → Fast", ko: "느리게 → 빠르게" }, param: "accelerate 0.4s",
          cap: { en: "Start *slow*, then accelerate. The shape *opens up*.", ko: "*천천히* 나와서 빨라져요. 모양이 *피어나요*." },
          bullet(w, o) { o.ramp = true; },
        },
        {
          id: "spin", name: { en: "Curve", ko: "휘어지기" }, param: "±0.5 rad/s",
          cap: { en: "Bend each layer *opposite ways*. Now it *swirls*.", ko: "두 겹을 *반대로* 휘어요. *소용돌이*가 돼요." },
          bullet(w, o, layer) { o.curve = layer ? -0.5 : 0.5; },
        },
        {
          id: "petal", name: { en: "Two-tone Petals", ko: "두 가지 색 꽃잎" }, param: "pink / gold",
          cap: { en: "Color each layer *differently*. Read the layers apart.", ko: "겹마다 *색을 다르게*. 겹이 구분돼요." },
          bullet(w, o, layer) { if (layer) o.col = "251,191,36"; o.pop = true; o.halo = true; },
        },
        {
          id: "recoil", name: { en: "Boss Recoil", ko: "보스 반동" }, param: "kick 14px · shake .2",
          cap: { en: "The boss *jolts* when it fires. It has *weight*.", ko: "쏠 때 보스가 *움찔*. *무게*가 느껴져요." },
          release(w, b) { b.oy -= 14; b.flash = 1; b.sx = b.sy = 1.15; w.shake(0.2); w.spawn({ type: "ring", x: b.x, y: b.gy, size: 20, size1: 80, life: 0.3, w: 6, color: "255,255,255" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge + burst",
          cap: { en: "A *rising hum*, then a *burst*.", ko: "*위잉* 모으고, *팡* 터져요." },
          tele(w) { w.sfx.charge(); },
          release(w) { w.sfx.burst(); },
        },
      ],
    },
  );
  RECIPES.push(
    /* 8 ─ 히트마커 */
    {
      id: "shooter-hitmarker", cat: "shooter", view: "3d",
      title: { en: "Confirm every hit with a *hitmarker*", ko: "맞힐 때마다 *히트마커*" },
      intro: { en: "Far target. Did that *land?*", ko: "멀리 있는 적. 방금 *맞았나요?*" },
      interval: 0.42, stepDur: 3.4,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[0.1, 5.6]]); w.hm = { t: 0, red: 0 }; w.gap = 0; },
      fire(w) {
        const g = w.gobs[0]; if (!g.alive) return;
        const m = fpMuzzle(w), h = torso(g);
        w.fp.kick = 0.04; w.fp.rot = 0.03;
        w.emit("fire", m);
        g.hp -= 25; g.ox += 4;
        w.spawn({ type: "circle", x: h.x, y: h.y, size: 7, life: 0.12, color: "255,255,255" });
        w.emit("hit", h, g, 25);
        if (g.hp <= 0) w.kill(g);
      },
      update(w, dt) { fpsTick(w, dt); w.hm.t = Math.max(0, w.hm.t - dt * 2.5); w.hm.red = Math.max(0, w.hm.red - dt * 2); w.gap -= w.gap * Math.min(1, dt * 10); },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx, 6 + w.gap);
        const t = w.hm.t, red = w.hm.red > 0;
        if (t > 0) xMark(ctx, 270, HY, 9 + (1 - t) * 5 + (red ? 5 : 0), 22 + (red ? 10 : 0) + t * 6, red ? "#ef4444" : `rgba(255,255,255,${Math.min(1, t * 2)})`, red ? 4 : 3);
      },
      steps: [
        {
          id: "marker", name: { en: "Hitmarker", ko: "히트마커" }, param: "X · 250ms",
          cap: { en: "Flash an *X* on the crosshair. Hit confirmed.", ko: "조준점에 *X*가 번쩍. 맞았다는 확인이에요." },
          hit(w) { w.hm.t = 1; },
        },
        {
          id: "flash", name: { en: "Target Flash", ko: "적 번쩍임" }, param: "white 1 frame",
          cap: { en: "Far targets flash *white*. Tiny, but readable.", ko: "멀리 있는 적도 *하얗게* 번쩍. 작아도 보여요." },
          hit(w, h, g) { g.flash = 1; g.vib = 3; },
        },
        {
          id: "kill", name: { en: "Kill Marker", ko: "처치 마커" }, param: "red · bigger",
          cap: { en: "The killing shot gets a *red, bigger* X.", ko: "마지막 한 발은 *빨갛고 크게*." },
          kill(w) { w.hm.t = 1; w.hm.red = 0.6; },
        },
        {
          id: "num", name: { en: "Damage Numbers", ko: "데미지 숫자" }, param: "pop + drift",
          cap: { en: "Pop the *damage* right at the hit.", ko: "맞은 자리에 *데미지*가 톡." },
          hit(w, h, g, d) { w.spawn({ type: "text", text: String(d), x: h.x + rand(-14, 14), y: h.y - 22, vx: rand(-30, 30), vy: -110, life: 0.55, size: 18, color: "#fff" }); },
        },
        {
          id: "bloom", name: { en: "Crosshair Bloom", ko: "조준선 벌어짐" }, param: "+9px / shot",
          cap: { en: "The crosshair *opens* on every shot.", ko: "쏠 때마다 조준선이 *벌어져요*." },
          fire(w) { w.gap = 9; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick on hit",
          cap: { en: "A dry *tick* on hit. Ears confirm it first.", ko: "맞으면 건조한 *틱*. 귀가 먼저 알아요." },
          fire(w) { w.sfx.smg(rand(0.95, 1.05)); },
          hit(w) { w.play(() => tn({ type: "square", f: 2400, dur: 0.03, vol: 0.12 })); },
          kill(w) { w.sfx.ping(); },
        },
      ],
    },

    /* 9 ─ 헤드샷 */
    {
      id: "shooter-headshot", cat: "shooter", view: "3d",
      title: { en: "Make headshots feel *special*", ko: "헤드샷을 *특별하게*" },
      intro: { en: "Head or body. *Same* feeling.", ko: "머리든 몸이든 *똑같은* 느낌." },
      interval: 0.7, stepDur: 3.8,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[0.05, 4.3]]); w.cnt = 0; w.hm = { t: 0, gold: false }; },
      fire(w) {
        const g = w.gobs[0]; if (!g.alive) return;
        w.cnt++; const head = w.cnt % 2 === 0, d = head ? 100 : 20;
        const h = head ? headPt(g) : torso(g);
        w.fp.kick = 0.05; w.fp.rot = 0.04;
        g.hp -= d; g.ox += 4;
        w.spawn({ type: "circle", x: h.x, y: h.y, size: 7, life: 0.12, color: "255,255,255" });
        w.emit(head ? "head" : "body", h, g, d);
        if (g.hp <= 0) w.kill(g);
      },
      update(w, dt) { fpsTick(w, dt); w.hm.t = Math.max(0, w.hm.t - dt * 3); },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx);
        const t = w.hm.t;
        if (t > 0) xMark(ctx, 270, HY, 8 + (1 - t) * 4, (w.hm.gold ? 26 : 16) + t * 4, w.hm.gold ? "#fbbf24" : "#fff", w.hm.gold ? 4.5 : 3);
      },
      steps: [
        {
          id: "marker", name: { en: "Gold Marker", ko: "금색 마커" }, param: "gold · 1.6×",
          cap: { en: "Body = small white X. Head = *big gold* X.", ko: "몸은 작은 흰 X, 머리는 *크고 금색* X." },
          body(w) { w.hm.t = 1; w.hm.gold = false; },
          head(w) { w.hm.t = 1; w.hm.gold = true; },
        },
        {
          id: "pop", name: { en: "Head Pop", ko: "머리 파편" }, param: "12 chunks",
          cap: { en: "Chunks *burst off the head*. You see where it hit.", ko: "머리에서 *파편이 튀어요*. 어디 맞았는지 보여요." },
          head(w, h) {
            for (let i = 0; i < 12; i++) w.spawn({ type: "chunk", x: h.x, y: h.y, vx: rand(-60, 260), vy: rand(-380, -60), g: 1300, vr: rand(-14, 14), life: 0.7, size: rand(3, 6), color: pick(["132,204,22", "77,124,15", "220,252,231"]) });
            w.spawn({ type: "star", x: h.x, y: h.y, size: 44, life: 0.12, color: "255,240,180" });
          },
        },
        {
          id: "num", name: { en: "Crit Number", ko: "치명타 숫자" }, param: "18px vs 40px",
          cap: { en: "Head damage is *huge and gold*. Body stays small.", ko: "머리 데미지는 *크고 금색*. 몸은 작게." },
          body(w, h, g, d) { w.spawn({ type: "text", text: String(d), x: h.x + 18, y: h.y - 14, vy: -90, life: 0.5, size: 18, color: "#fff" }); },
          head(w, h, g, d) { w.spawn({ type: "text", text: d + "!", x: h.x + 30, y: h.y - 26, vy: -140, g: 300, life: 0.9, size: 40, color: "#fbbf24" }); },
        },
        {
          id: "label", name: { en: "HEADSHOT Tag", ko: "헤드샷 문구" }, param: "under crosshair",
          cap: { en: "Name it under the crosshair: *HEADSHOT*.", ko: "조준점 아래에 *HEADSHOT*." },
          head(w) { w.spawn({ type: "text", text: "HEADSHOT", x: 270, y: HY + 46, life: 0.9, size: 20, color: "#fbbf24" }); },
        },
        {
          id: "snap", name: { en: "Head Snap", ko: "고개 젖힘" }, param: "stop 120ms + fly",
          cap: { en: "*Freeze*, then snap it *backward*.", ko: "*멈칫* 했다가 *뒤로* 확 젖혀요." },
          head(w, h, g) { w.hitstop(0.12); g.flash = 1.5; w.fly(g, 140, -420, -6); },
        },
        {
          id: "slow", name: { en: "Slow-mo Beat", ko: "잠깐 슬로우" }, param: "0.3× · 0.4s",
          cap: { en: "A short *slow-mo* beat. Let the player *enjoy* it.", ko: "짧은 *슬로우*. *즐길* 시간을 줘요." },
          head(w) { w.slowmo(0.3, 0.4); w.zoomPunch(0.05); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ping on head",
          cap: { en: "Body *thud*. Head gets a bright *ping*.", ko: "몸은 *퍽*, 머리는 맑은 *팅*." },
          body(w) { w.sfx.gun(); w.sfx.hit(); },
          head(w) { w.sfx.gun(); w.sfx.crit(); w.sfx.ping(); },
        },
      ],
    },

    /* 10 ─ 처치 확인 */
    {
      id: "shooter-killconfirm", cat: "shooter", view: "3d",
      title: { en: "Make kills *unmistakable*", ko: "처치를 *확실하게* 알리기" },
      intro: { en: "It vanished. Dead? *Hiding?*", ko: "사라졌어요. 죽었나? *숨었나?*" },
      interval: 0.45, stepDur: 3.6,
      drawFloor: fpsRoom,
      setup(w) {
        fpsSetup(w, [[-0.05, 4.4]]); w.gobs[0].maxHp = w.gobs[0].hp = 60;
        w.kmk = 0; w.score = 0; w.skulls = 0; w.skT = 0; w.rot = 0; w.impactGlow=0;w.muzzleGlow=0;w.hpView=60;w.hpLag=60;w.hpPulse=0;w.killGlow=0;
      },
      fire(w) {
        const g = w.gobs[0]; if (!g.alive) return;
        w.fp.kick=.085;w.fp.rot=.065;w.muzzleGlow=1;
        const t=torso(g);
        g.hp-=20;g.vib=3.1;g.ox+=7;g.flash=.32;
        w.impactGlow=.95;w.hpPulse=.85;
        w.emit("hit",t,g);
        w.spawn({type:"spark",x:t.x,y:t.y,vx:rand(-95,115),vy:rand(-160,50),
          life:.19,drag:2,size:2.4,color:"255,231,180"});
        if(w.on("sound")){
          w.shake(.075,1);
          for(let i=0;i<5;i++){
            const a=i*TAU/5+rand(-.26,.26);
            w.spawn({type:"spark",x:t.x,y:t.y,vx:Math.cos(a)*rand(100,220),
              vy:Math.sin(a)*rand(100,220),life:.22,drag:3,size:1.8,color:"255,213,147"});
          }
        }
        if(g.hp<=0){
          w.kill(g);w.killGlow=1;
          if(w.on("sound")){
            w.hitstop(.075);w.zoomPunch(.052);w.shake(.17,1);
            w.flash("250,238,199",.12);
          }
        }
      },
      update(w,dt){
        fpsTick(w,dt);
        w.kmk=Math.max(0,w.kmk-dt*1.6);w.skT=Math.max(0,w.skT-dt*3);w.rot+=dt*3;
        w.impactGlow=Math.max(0,w.impactGlow-dt*6);
        w.muzzleGlow=Math.max(0,w.muzzleGlow-dt*9);
        w.killGlow=Math.max(0,w.killGlow-dt*1.65);
        w.hpPulse=Math.max(0,w.hpPulse-dt*2.8);
        const hp=Math.max(0,w.gobs[0].hp);
        w.hpView+=(hp-w.hpView)*Math.min(1,dt*7.4);
        w.hpLag+=(hp-w.hpLag)*Math.min(1,dt*1.5);
      },
      drawFront(w,ctx){
        drawFpGun(w,ctx);
        if(w.on("sound")&&w.muzzleGlow>0){
          ctx.save();ctx.globalCompositeOperation="lighter";
          const x=270,y=HY+89,alpha=w.muzzleGlow;
          glow(ctx,x,y,70,"255,175,83",alpha*.44);
          ctx.fillStyle="rgba(255,245,197,"+(alpha*.82)+")";
          ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x+56*alpha,y-19);
          ctx.lineTo(x+23*alpha,y);ctx.lineTo(x+50*alpha,y+18);
          ctx.lineTo(x,y+8);ctx.closePath();ctx.fill();
          ctx.restore();
        }
      },
      drawHud(w, ctx) {
        xhair(ctx);
        if(w.on("sound")){
          const t=torso(w.gobs[0]),p=w.impactGlow;
          if(p>0){
            ctx.save();ctx.globalCompositeOperation="lighter";
            glow(ctx,t.x,t.y,35+25*(1-p),"255,212,129",p*.31);
            ctx.strokeStyle="rgba(255,245,215,"+(p*.78)+")";ctx.lineWidth=2;
            for(let i=0;i<4;i++){
              const a=i*TAU/4+.79,r=12+19*(1-p);
              ctx.beginPath();ctx.moveTo(t.x+Math.cos(a)*r,t.y+Math.sin(a)*r);
              ctx.lineTo(t.x+Math.cos(a)*(r+9),t.y+Math.sin(a)*(r+9));ctx.stroke();
            }
            ctx.restore();
          }
          // Delayed lost-health strip visually confirms three landed shots.
          const x=201,y=45,bw=138,bh=11;
          const hp=Math.max(0,Math.min(1,w.hpView/60)),lag=Math.max(hp,Math.min(1,w.hpLag/60));
          ctx.save();ctx.fillStyle="rgba(7,13,23,.83)";
          ctx.beginPath();ctx.roundRect(x-7,y-7,bw+14,bh+14,7);ctx.fill();
          ctx.fillStyle="rgba(251,195,107,.65)";ctx.fillRect(x,y,bw*lag,bh);
          const g=ctx.createLinearGradient(x,y,x,y+bh);
          g.addColorStop(0,w.hpPulse>0?"#fff7c8":"#ff8684");
          g.addColorStop(1,"#c32a43");
          ctx.fillStyle=g;ctx.fillRect(x,y,bw*hp,bh);
          ctx.strokeStyle="rgba(255,240,194,"+(w.hpPulse*.9)+")";ctx.lineWidth=2;
          if(w.hpPulse>0)ctx.strokeRect(x,y,bw*hp,bh);
          ctx.font="700 11px sans-serif";ctx.textAlign="center";
          ctx.fillStyle="#d8e4eb";ctx.fillText(w.gobs[0].alive?"TARGET HP":"TARGET DOWN",270,35);
          if(w.killGlow>0){
            ctx.globalCompositeOperation="lighter";
            glow(ctx,270,HY,96,"255,199,117",w.killGlow*.18);
          }
          ctx.restore();
        }
        if (w.kmk > 0) {
          const k = Math.max(0, w.kmk - 0.8);
          ctx.save(); ctx.translate(270, HY); ctx.rotate(k * 3); ctx.scale(1 + k * 2, 1 + k * 2);
          xMark(ctx, 0, 0, 10, 26, `rgba(239,68,68,${Math.min(1, w.kmk * 2)})`, 5); ctx.restore();
        }
        if (w.on("xp")) { hudNum(ctx, "SCORE", 34, 60, 12, "rgba(255,255,255,0.6)", "left"); hudNum(ctx, String(w.score), 34, 82, 22, "#fde047", "left"); }
        if (w.skulls) {
          const sc = 1 + w.skT * 0.5;
          ctx.save(); ctx.translate(270, 300); ctx.scale(sc, sc);
          rr(ctx, -46, -18, 92, 36, 8, "rgba(10,10,14,0.75)");
          ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(-20, -2, 10, 0, TAU); ctx.fill(); ctx.fillRect(-26, 4, 12, 7);
          ctx.fillStyle = "#0b0b0f"; ctx.fillRect(-25, -5, 4, 4); ctx.fillRect(-19, -5, 4, 4);
          hudNum(ctx, "×" + w.skulls, 6, 0, 20, "#fff", "left"); ctx.restore();
        }
      },
      steps: [
        {
          id: "xmark", name: { en: "Kill Marker", ko: "처치 마커" }, param: "red X · spin in",
          cap: { en: "A *red X* spins in. Unmistakably dead.", ko: "*빨간 X*가 돌며 박혀요. 확실히 끝." },
          kill(w) { w.kmk = 1.2; },
        },
        {
          id: "ragdoll", name: { en: "Ragdoll Off", ko: "날아가며 사라지기" }, param: "fly + fade 1.2s",
          cap: { en: "Don't delete it. Let it *fall and fade*.", ko: "지우지 말고 *쓰러지며 사라지게*." },
          kill(w, g) { g.keep = true; g.flash = 1.4; w.fly(g, rand(-60, 60), -380, rand(-5, 5)); },
        },
        {
          id: "hitstop", name: { en: "Kill Pause", ko: "처치 멈칫" }, param: "stop 80ms · zoom",
          cap: { en: "A tiny *pause* and a *zoom punch* on the kill.", ko: "처치 순간 살짝 *멈칫*, 화면이 *툭* 다가와요." },
          kill(w) { w.hitstop(0.08); w.zoomPunch(0.05); },
        },
        {
          id: "xp", name: { en: "Score Pop", ko: "점수 팝업" }, param: "+100 → corner",
          cap: { en: "*+100* flies to the score. The kill *counts*.", ko: "*+100*이 점수판으로 날아가요. 처치가 *쌓여요*." },
          kill(w, g) {
            const t = torso(g);
            w.spawn({ type: "text", text: "+100", x: t.x, y: t.y - 30, life: 0.8, size: 22, color: "#fde047", seek: true, tx: 60, ty: 82 });
            w.after(0.8, () => { w.score += 100; });
          },
        },
        {
          id: "skull", name: { en: "Kill Icon", ko: "처치 아이콘" }, param: "skull ×N · bump",
          cap: { en: "A *skull icon* stacks up. ×1, ×2, ×3…", ko: "*해골 아이콘*이 쌓여요. ×1, ×2, ×3…" },
          kill(w) { w.skulls++; w.skT = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "two-tone ding",
          cap: { en: "A *two-note ding* means one thing: dead.", ko: "*딩-동* 두 음은 하나만 뜻해요. 처치." },
          kill(w) { w.sfx.chime(0); w.after(0.08, () => w.sfx.chime(7)); },
        },
      ],
    },

    /* 11 ─ 반동 패턴 */
    {
      id: "shooter-recoil-climb", cat: "shooter", view: "3d",
      title: { en: "Give full-auto a *recoil pattern*", ko: "연사에 *반동 패턴* 주기" },
      intro: { en: "Eight shots. *One hole.* No skill needed.", ko: "여덟 발이 *한 구멍*에. 실력이 필요 없어요." },
      interval: 1.7, stepDur: 4.0,
      drawFloor(w, ctx) {
        fpsRoom(w, ctx);
        const a = P3(w, -0.75, -0.55, 5), b = P3(w, 0.75, 0.95, 5), c = P3(w, 0, 0, 5);
        rr(ctx, a.x, b.y, b.x - a.x, a.y - b.y, 4, "#e7e2d6");
        ctx.strokeStyle = "rgba(190,40,40,0.75)"; ctx.lineWidth = 2;
        for (const r of [0.15, 0.32, 0.5]) { ctx.beginPath(); ctx.arc(c.x, c.y, r * c.s, 0, TAU); ctx.stroke(); }
        if (w.guide) for (let i = 0; i < 8; i++) { const p = P3(w, PAT[i][0] * 0.107, PAT[i][1] * 0.107, 5); ctx.fillStyle = "rgba(56,189,248,0.55)"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill(); }
        for (const h of w.holes) { const p = P3(w, h.X, h.Y, 5); ctx.fillStyle = "#16161c"; ctx.beginPath(); ctx.arc(p.x, p.y, 3.6, 0, TAU); ctx.fill(); }
      },
      setup(w) {
        fpsSetup(w, [], [{ b: [-3.2, -2.2, FLOOR, FLOOR + 1, 4, 5], c: [161, 98, 7] }]);
        w.holes = []; w.climb = { x: 0, y: 0 }; w.shotN = 0; w.since = 9; w.guide = false;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true; w.shotN = 0; w.holes = [];
        for (let i = 0; i < 8; i++) w.after(i * 0.085, () => {
          w.shotN = i; w.since = 0;
          const m = fpMuzzle(w), p = unP(w, 270, HY, 5);
          w.emit("shot", m, i);
          w.emit("hole", p);
          if (i === 7) w.after(0.2, () => { w.busy = false; });
        });
      },
      update(w, dt) {
        fpsTick(w, dt);
        w.since += dt; w.guide = false;
        if (w.since > 0.12 && !w.on("recover")) { w.climb.x = 0; w.climb.y = 0; }
        w.lookX = w.climb.x; w.lookY = w.climb.y;
      },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) { xhair(ctx, 5, "rgba(255,255,255,0.9)", 6); },
      steps: [
        {
          id: "holes", name: { en: "Bullet Holes", ko: "총알 자국" }, param: "stay till next burst",
          cap: { en: "Leave *holes*. Now you can *see* the spread.", ko: "*구멍*을 남겨요. 퍼진 모양이 *보여요*." },
          hole(w, p) { w.holes.push(p); },
        },
        {
          id: "kick", name: { en: "Gun Kick", ko: "총 반동" }, param: "0.06m back",
          cap: { en: "The gun *slams back* each shot.", ko: "쏠 때마다 총이 *뒤로 쾅*." },
          shot(w) { w.fp.kick = 0.06; w.fp.rot = 0.05; w.fp.roll = rand(-0.04, 0.04); },
        },
        {
          id: "climb", name: { en: "View Climb", ko: "시점 들림" }, param: "pattern ↑ then ↗↖",
          cap: { en: "The view *climbs* in a *fixed* pattern. Up, then sideways.", ko: "시점이 *정해진 모양*으로 올라가요. 위로, 옆으로." },
          shot(w, m, i) {
            const [dx, dy] = i ? [PAT[i][0] - PAT[i - 1][0], PAT[i][1] - PAT[i - 1][1]] : [0, 0];
            w.climb.x -= dx * 6; w.climb.y += dy * 6;
          },
        },
        {
          id: "recover", name: { en: "Smooth Recovery", ko: "부드러운 복귀" }, param: "ease back 0.4s",
          cap: { en: "Let go and the view *drifts back*. No snapping.", ko: "손을 떼면 시점이 *스르르* 돌아와요." },
          update(w, dt) { if (w.since > 0.12) { const k = Math.min(1, dt * 6); w.climb.x -= w.climb.x * k; w.climb.y -= w.climb.y * k; } },
        },
        {
          id: "flash", name: { en: "Muzzle Flash", ko: "총구 불꽃" }, param: "per shot",
          cap: { en: "Flash every shot. Count the rhythm.", ko: "한 발마다 번쩍. 리듬이 보여요." },
          shot(w, m) { mFlash(w, m); },
        },
        {
          id: "guide", name: { en: "Learnable Shape", ko: "익힐 수 있는 모양" }, param: "same 8 points",
          cap: { en: "Same pattern *every time*. Players can *learn* it.", ko: "*매번 같은* 모양. 연습하면 *잡을 수* 있어요." },
          update(w) { w.guide = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "smg ±8% pitch",
          cap: { en: "A tight *rattle*, pitch wobbling.", ko: "짧은 *드르륵*, 음높이는 조금씩." },
          shot(w) { w.sfx.smg(rand(0.92, 1.08)); },
        },
      ],
    },

    /* 12 ─ 정조준 */
    {
      id: "shooter-ads", cat: "shooter", view: "3d",
      title: { en: "Make aiming down sights *smooth*", ko: "정조준을 *부드럽게*" },
      intro: { en: "Aim. The screen *teleports*.", ko: "조준하면 화면이 *순간이동*해요." },
      interval: 2.6, stepDur: 4.0,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[0.05, 9], [-1.6, 12]]); w.adsT = 0; w.adsHold = 0; w.vgn = 0; w.blur = 0; w.sway = 0; w.dot = false; },
      fire(w) { w.adsT = 1; w.adsHold = 1.6; w.emit("aim", 1); },
      update(w, dt) {
        fpsTick(w, dt);
        if (w.adsHold > 0) { w.adsHold -= dt; if (w.adsHold <= 0) { w.adsT = 0; w.emit("aim", 0); } }
        if (!w.on("ease")) w.fp.ads = w.adsT;
        w.fz = 1 + 0.7 * w.fp.ads; w.vgn = 0; w.blur = 0; w.dot = false;
      },
      drawFront(w, ctx) {
        drawFpGun(w, ctx);
        if (w.dot && w.fp.ads > 0.7) { const p = gunPt(w, [0.28, -0.17, 1.02]); ctx.globalCompositeOperation = "lighter"; glow(ctx, p.x, p.y, 12, "239,68,68", 1); ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#fecaca"; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, TAU); ctx.fill(); }
      },
      drawHud(w, ctx) {
        const a = w.dot ? 1 - w.fp.ads : 1;
        if (a > 0.05) { ctx.globalAlpha = a; xhair(ctx, 6 + (w.dot ? w.fp.ads * 20 : 0)); ctx.globalAlpha = 1; }
        if (w.blur > 0.05) screenFx(ctx, "blur(5px)", w.blur, 0, 0, edgeClip(150, 100));
        if (w.vgn > 0.01) {
          const g = ctx.createRadialGradient(270, HY, 90, 270, HY, 320);
          g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${w.vgn})`);
          ctx.fillStyle = g; ctx.fillRect(-60, -60, 660, 480);
        }
      },
      steps: [
        {
          id: "ease", name: { en: "Ease In/Out", ko: "부드럽게 전환" }, param: "~0.2s ease",
          cap: { en: "*Ease* the gun and zoom. Never snap.", ko: "총과 줌을 *스르르*. 절대 툭 끊지 마요." },
          update(w, dt) { w.fp.ads += (w.adsT - w.fp.ads) * Math.min(1, dt * 11); },
        },
        {
          id: "sight", name: { en: "Sight Takes Over", ko: "조준경으로 교체" }, param: "crosshair → red dot",
          cap: { en: "Crosshair *fades*, a *red dot* takes over.", ko: "조준선은 *사라지고*, *빨간 점*이 대신해요." },
          update(w) { w.dot = true; },
        },
        {
          id: "vig", name: { en: "Focus Vignette", ko: "가장자리 어둡게" }, param: "edges .7 dark",
          cap: { en: "Darken the edges. *Focus* goes to the sight.", ko: "가장자리를 어둡게. 시선이 *조준경*으로 가요." },
          update(w) { w.vgn = 0.7 * w.fp.ads; },
        },
        {
          id: "blur", name: { en: "Edge Blur", ko: "가장자리 흐림" }, param: "blur 5px",
          cap: { en: "*Blur the edges*. Like your eye really focusing.", ko: "*가장자리를 흐리게*. 진짜 눈이 초점 맞추듯." },
          update(w) { w.blur = w.fp.ads; },
        },
        {
          id: "sway", name: { en: "Hip Sway", ko: "허리 사격 흔들림" }, param: "hip 1× · ADS 0.1×",
          cap: { en: "The gun *sways* at the hip, *steadies* when aiming.", ko: "허리에선 *흔들리고*, 조준하면 *딱* 멈춰요." },
          update(w) { const k = 1 - w.fp.ads * 0.9; w.fp.ox = Math.sin(w.time * 1.7) * 0.025 * k; w.fp.oy = Math.sin(w.time * 3.4) * 0.012 * k; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "cloth + clack",
          cap: { en: "A *rustle* and a soft *clack* as the gun comes up.", ko: "총을 올릴 때 *사락*, 그리고 *착*." },
          aim(w, on) { w.sfx.swish(); if (on) w.after(0.1, () => w.sfx.clickDown()); },
        },
      ],
    },

    /* 13 ─ 재장전 */
    {
      id: "shooter-reload", cat: "shooter", view: "3d",
      title: { en: "Make reloads feel *physical*", ko: "재장전에 *손맛* 넣기" },
      intro: { en: "0 → 30. A number changed. *That's it.*", ko: "0 → 30. 숫자만 바뀌어요. *끝.*" },
      interval: 2.3, stepDur: 4.0,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[0.6, 9]]); w.ammo = 0; w.shown = 0; w.prog = -1; },
      fire(w) {
        if (w.busy) return;
        w.busy = true; w.ammo = 0; w.shown = 0; w.prog = 0;
        w.emit("start");
        w.after(0.3, () => w.emit("magout"));
        w.after(0.75, () => w.emit("magin"));
        w.after(1.05, () => { w.ammo = 30; w.prog = -1; w.emit("bolt"); });
        w.after(1.15, () => { w.busy = false; });
      },
      update(w, dt) {
        fpsTick(w, dt);
        if (w.prog >= 0) w.prog = Math.min(1, w.prog + dt / 1.05);
        w.ring = false;
        if (!w.on("count")) w.shown = w.ammo;
      },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx);
        if (w.ring && w.prog >= 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(270, HY, 26, 0, TAU); ctx.stroke();
          ctx.strokeStyle = "#c6f432"; ctx.beginPath(); ctx.arc(270, HY, 26, -Math.PI / 2, -Math.PI / 2 + w.prog * TAU); ctx.stroke();
        }
        rr(ctx, 410, 284, 104, 40, 8, "rgba(8,9,14,0.7)");
        hudNum(ctx, String(Math.round(w.shown)), 470, 305, 26, w.shown < 1 ? "#ef4444" : "#fff");
        hudNum(ctx, "/90", 506, 309, 13, "rgba(255,255,255,0.55)");
      },
      steps: [
        {
          id: "tilt", name: { en: "Tilt & Dip", ko: "총 기울이기" }, param: "roll 0.5 · dip",
          cap: { en: "*Tilt the gun* toward you. Show the mag well.", ko: "*총을 기울여* 탄창 넣는 곳을 보여 줘요." },
          start(w) { const g = w.fp; g.holdRoll = true; w.tween(g, { roll: 0.5, dip: 0.25 }, 0.25, "out"); },
          bolt(w) { const g = w.fp; w.tween(g, { roll: 0, dip: 0 }, 0.3, "back", () => { g.holdRoll = false; }); },
        },
        {
          id: "mag", name: { en: "Mag Out / In", ko: "탄창 빼고 넣기" }, param: "drop + slide in",
          cap: { en: "The old mag *drops*. The new one *slides in*.", ko: "헌 탄창은 *툭 떨어지고*, 새 탄창이 *쏙*." },
          magout(w) {
            const p = gunPt(w, [0.28, -0.45, 0.6]);
            w.fp.mag = 0;
            w.spawn({ type: "chunk", x: p.x, y: p.y, vx: -40, vy: 120, g: 1600, vr: 3, life: 0.6, size: 18, color: "34,37,46" });
          },
          magin(w) { const g = w.fp; g.mag = 1; g.magY = 0.25; w.tween(g, { magY: 0 }, 0.16, "in"); },
        },
        {
          id: "jolt", name: { en: "Bolt Jolt", ko: "장전 손잡이 철컥" }, param: "kick 0.05 · slide",
          cap: { en: "Rack the bolt with a *jolt*. Ready.", ko: "장전 손잡이를 *철컥*. 준비 끝." },
          bolt(w) { const g = w.fp; g.kick = 0.05; g.rot = 0.05; g.slide = 0.12; w.tween(g, { slide: 0 }, 0.18, "back"); },
        },
        {
          id: "count", name: { en: "Count Up", ko: "숫자 채우기" }, param: "0→30 in 0.35s",
          cap: { en: "The counter *fills up*. Ammo feels *loaded*.", ko: "숫자가 *차오르며* 채워져요." },
          update(w, dt) { if (w.shown < w.ammo) w.shown = Math.min(w.ammo, w.shown + dt * 90); },
        },
        {
          id: "ring", name: { en: "Progress Ring", ko: "진행 고리" }, param: "fills in 1.05s",
          cap: { en: "A *ring* fills around the crosshair. You know *how long*.", ko: "조준점 둘레에 *고리*가 차요. *얼마 남았는지* 알아요." },
          update(w) { w.ring = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "3 clicks in sync",
          cap: { en: "*Click*, *clack*, *chk-chk*. Each sound on its motion.", ko: "*딸깍*, *착*, *철컥*. 동작마다 소리 하나씩." },
          magout(w) { w.sfx.clickUp(); },
          magin(w) { w.sfx.clickDown(); w.sfx.thunk(); },
          bolt(w) { w.sfx.pump(); },
        },
      ],
    },

    /* 14 ─ 빈 탄창 딸깍 */
    {
      id: "shooter-dryfire", cat: "shooter", view: "3d",
      title: { en: "Make an empty gun *obvious*", ko: "탄이 *떨어진 걸* 알리기" },
      intro: { en: "Pulling the trigger. Nothing. *Is it broken?*", ko: "방아쇠를 당겨도 무반응. *고장?*" },
      interval: 0.38, stepDur: 4.0,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[0.1, 7]]); w.ammo = 3; w.dry = 0; w.low = 0; w.warn = 0; w.xdim = false; },
      fire(w) {
        const g = w.gobs[0];
        if (w.ammo > 0) {
          w.ammo--; w.fp.kick = 0.05; w.fp.rot = 0.04; mFlash(w, fpMuzzle(w), 0.7);
          if (g.alive) { g.hp -= 10; g.flash = 0.6; }
          w.emit("shot", w.ammo);
        } else {
          w.dry++; w.emit("dry");
          if (w.dry >= 4) { w.dry = 0; w.after(0.3, () => { w.ammo = 3; }); }
        }
      },
      update(w, dt) { fpsTick(w, dt); w.low += dt; w.warn = Math.max(0, w.warn - dt * 2); w.lowOn = false; w.xdim = false; },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        const empty = w.ammo === 0;
        xhair(ctx, 6, w.xdim && empty ? "rgba(150,150,160,0.6)" : "rgba(255,255,255,0.9)");
        if (w.warn > 0) {
          ctx.globalAlpha = Math.min(1, w.warn * 2);
          rr(ctx, 210, HY + 30, 120, 30, 6, "rgba(10,10,14,0.8)");
          label(ctx, "RELOAD", 270, HY + 46, 17, Math.floor(w.time * 8) % 2 ? "#fff" : "#ef4444");
          ctx.globalAlpha = 1;
        }
        const lowc = w.lowOn && w.ammo <= 2, pulse = lowc ? 1 + 0.12 * Math.max(0, Math.sin(w.low * 14)) : 1;
        rr(ctx, 410, 284, 104, 40, 8, lowc ? "rgba(127,29,29,0.75)" : "rgba(8,9,14,0.7)");
        ctx.save(); ctx.translate(470, 305); ctx.scale(pulse, pulse);
        hudNum(ctx, String(w.ammo), 0, 0, 26, lowc ? "#fca5a5" : "#fff"); ctx.restore();
        hudNum(ctx, "/90", 506, 309, 13, "rgba(255,255,255,0.55)");
      },
      steps: [
        {
          id: "low", name: { en: "Low Ammo Red", ko: "탄 부족 빨강" }, param: "≤ 2 · pulse",
          cap: { en: "At *2 rounds*, the counter turns *red* and pulses.", ko: "*2발* 남으면 숫자가 *빨갛게* 두근거려요." },
          update(w) { w.lowOn = true; },
        },
        {
          id: "twitch", name: { en: "Dry Twitch", ko: "헛방 움찔" }, param: "tiny dip, no kick",
          cap: { en: "The trigger moves, *nothing fires*. A tiny *twitch*.", ko: "방아쇠는 당겨지는데 *안 나가요*. 작게 *움찔*." },
          dry(w) { w.fp.oy = -0.012; w.fp.roll = 0.03; },
        },
        {
          id: "prompt", name: { en: "RELOAD Prompt", ko: "재장전 안내" }, param: "blink 4Hz",
          cap: { en: "Tell them *what to do*: RELOAD.", ko: "*뭘 할지* 알려 줘요. RELOAD." },
          dry(w) { w.warn = 1.2; },
        },
        {
          id: "dim", name: { en: "Grey Crosshair", ko: "회색 조준선" }, param: "dim when empty",
          cap: { en: "The crosshair goes *grey*. The gun is *dead*.", ko: "조준선이 *회색*으로. 총이 *죽었어요*." },
          update(w) { w.xdim = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hollow click",
          cap: { en: "A hollow *click*. The most *disappointing* sound.", ko: "텅 빈 *딸깍*. 제일 *허무한* 소리." },
          shot(w, left) { w.sfx.gun(left <= 1 ? 1.25 : 1); },
          dry(w) { w.sfx.clickDown(); w.sfx.tick(); },
        },
      ],
    },
  );
  RECIPES.push(
    /* 15 ─ 총구 연기 */
    {
      id: "shooter-muzzle-smoke", cat: "shooter", view: "3d",
      title: { en: "Let the barrel *smoke*", ko: "총구에 *연기* 남기기" },
      intro: { en: "Burst ends. The gun is *instantly cold*.", ko: "연사가 끝나면 총이 *바로 식어요*." },
      interval: 2.2, stepDur: 4.0,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[0.3, 8]]); w.heat = 0; w.wispT = 0; w.glowK = 0; },
      fire(w) {
        for (let i = 0; i < 6; i++) w.after(i * 0.09, () => {
          const m = fpMuzzle(w), g = w.gobs[0];
          w.fp.kick = 0.05; w.fp.rot = 0.04; w.heat = Math.min(1, w.heat + 0.2);
          w.emit("shot", m);
          if (g.alive) { g.hp -= 8; g.vib = 2; if (g.hp <= 0) w.kill(g); }
        });
      },
      update(w, dt) {
        fpsTick(w, dt);
        w.heat = Math.max(0, w.heat - dt * 0.35); w.glowK = 0;
      },
      drawFront(w, ctx) {
        drawFpGun(w, ctx);
        if (w.glowK > 0.02) { const m = fpMuzzle(w); ctx.globalCompositeOperation = "lighter"; glow(ctx, m.x, m.y, 22, "255,120,40", w.glowK); ctx.globalCompositeOperation = "source-over"; }
      },
      drawHud(w, ctx) { xhair(ctx); },
      steps: [
        {
          id: "flash", name: { en: "Muzzle Flash", ko: "총구 불꽃" }, param: "per shot",
          cap: { en: "First, *flash* every shot.", ko: "먼저 한 발마다 *번쩍*." },
          shot(w, m) { mFlash(w, m); },
        },
        {
          id: "puff", name: { en: "Shot Puff", ko: "발사 연기" }, param: "3 puffs · forward",
          cap: { en: "Each shot pushes a *puff* forward.", ko: "쏠 때마다 *연기*가 앞으로 훅." },
          shot(w, m) { for (let i = 0; i < 3; i++) w.spawn({ type: "smoke", x: m.x, y: m.y, vx: rand(-160, -60), vy: rand(-90, -30), drag: 3, size: rand(4, 7), size1: rand(16, 26), life: rand(0.4, 0.7), color: "210,210,220" }); },
        },
        {
          id: "linger", name: { en: "Lingering Wisps", ko: "남는 연기" }, param: "heat → 2.5s",
          cap: { en: "After the burst, smoke *keeps curling* off the barrel.", ko: "다 쏜 뒤에도 연기가 *계속 피어올라요*." },
          update(w, dt) {
            w.wispT -= dt;
            if (w.heat > 0.05 && w.wispT <= 0) {
              w.wispT = 0.05; const m = fpMuzzle(w);
              w.spawn({ type: "smoke", wisp: true, seed: rand(0, 6), x: m.x + rand(-3, 3), y: m.y - 4, vx: rand(-15, 15), vy: rand(-70, -45), size: 4, size1: 15, life: 1.4, color: "200,200,210", alpha: w.heat });
            }
          },
        },
        {
          id: "glow", name: { en: "Hot Barrel", ko: "달아오른 총구" }, param: "orange × heat",
          cap: { en: "The barrel tip *glows orange*, then cools.", ko: "총구 끝이 *주황색*으로 달았다가 식어요." },
          update(w) { w.glowK = w.heat; },
        },
        {
          id: "curl", name: { en: "Curl", ko: "말려 오르기" }, param: "sine sway",
          cap: { en: "Make it *curl*, not rise straight. Smoke is *lazy*.", ko: "곧게 말고 *구불구불*. 연기는 *느긋해요*." },
          update(w, dt) { for (const p of w.parts) if (p.wisp) p.vx += Math.sin(w.time * 3 + p.seed) * 70 * dt; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "shots + tick-tick",
          cap: { en: "After the shots, quiet *ticks* of cooling metal.", ko: "총성 뒤에 식는 쇠의 *틱, 틱*." },
          shot(w) { w.sfx.smg(rand(0.95, 1.05)); w.after(0.7, () => w.sfx.tick()); },
        },
      ],
    },

    /* 16 ─ 1인칭 탄피 */
    {
      id: "shooter-fp-shells", cat: "shooter", view: "3d",
      title: { en: "Eject shells in *first person*", ko: "1인칭 *탄피* 튀기기" },
      intro: { en: "Bang. Bang. Feels like a *laser pointer*.", ko: "탕, 탕. *레이저 포인터* 같아요." },
      interval: 0.32, stepDur: 3.6,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[-0.2, 7]]); },
      fire(w) {
        const g = w.gobs[0];
        w.fp.kick = 0.04; w.fp.rot = 0.035;
        w.emit("shot", gunPt(w, [0.35, -0.22, 0.55]));
        if (g.alive) { g.hp -= 10; g.vib = 2; if (g.hp <= 0) w.kill(g); }
      },
      update(w, dt) { fpsTick(w, dt); },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) { xhair(ctx); },
      steps: [
        {
          id: "shell", name: { en: "Spinning Shell", ko: "도는 탄피" }, param: "up-right · spin",
          cap: { en: "Kick a shell *up and right*, spinning.", ko: "탄피를 *오른쪽 위로*, 빙글빙글." },
          shot(w, p) { w.spawn({ type: "shell", x: p.x, y: p.y, vx: rand(120, 260), vy: rand(-620, -480), g: 2200, vr: rand(14, 24), life: 0.8, size: 22, color: "234,179,8", hold: true }); },
        },
        {
          id: "slide", name: { en: "Bolt Cycle", ko: "노리쇠 왕복" }, param: "0.1m back · 90ms",
          cap: { en: "The bolt *slams back* and returns. Machinery *moves*.", ko: "노리쇠가 *철컥* 갔다 와요. 기계가 *움직여요*." },
          shot(w) { const g = w.fp; g.slide = 0.1; w.tween(g, { slide: 0 }, 0.09, "in"); },
        },
        {
          id: "glint", name: { en: "Brass Glint", ko: "황동 반짝" }, param: "star on eject",
          cap: { en: "A *glint* as the brass catches light.", ko: "탄피가 빛을 받아 *반짝*." },
          shot(w, p) { w.spawn({ type: "star", x: p.x + 10, y: p.y - 20, vx: 180, vy: -420, g: 1400, size: 14, life: 0.18, color: "255,236,170" }); },
        },
        {
          id: "smoke", name: { en: "Port Smoke", ko: "배출구 연기" }, param: "2 puffs",
          cap: { en: "A wisp of *smoke* from the ejection port.", ko: "배출구에서 *연기*가 살짝." },
          shot(w, p) { for (let i = 0; i < 2; i++) w.spawn({ type: "smoke", x: p.x, y: p.y, vx: rand(20, 90), vy: rand(-120, -60), drag: 3, size: 5, size1: 22, life: 0.5, color: "210,210,220" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "shot + tinkle later",
          cap: { en: "Shot now, *tinkle* later. The brass *lands somewhere*.", ko: "총성은 지금, *짤랑*은 나중에. 어딘가 *떨어졌어요*." },
          shot(w) { w.sfx.gun(rand(0.95, 1.05)); w.after(0.45, () => w.play(() => tn({ type: "triangle", f: rand(2600, 3400), dur: 0.08, vol: 0.12 }))); },
        },
      ],
    },

    /* 17 ─ 재질별 탄흔 */
    {
      id: "shooter-materials", cat: "shooter", view: "3d",
      title: { en: "Give each material its *own impact*", ko: "재질마다 *다른 탄흔*" },
      intro: { en: "Steel, wood, enemy. *Same grey dot.*", ko: "강철, 나무, 적. *같은 회색 점*." },
      interval: 0.45, stepDur: 4.0,
      drawFloor(w, ctx) {
        fpsRoom(w, ctx);
        for (const d of w.decals) if (d.mat !== "flesh") drawDecal(w, ctx, d);
      },
      setup(w) {
        fpsSetup(w, [[1.7, 5.5]]);
        w.plate = 0; w.crate = 0; w.decals = []; w.k = 0;
        w.buildProps = () => {
          const pw = Math.sin(w.time * 30) * w.plate * 0.06, cj = w.crate * 0.05;
          w.props = [
            { b: [-2.3 + pw, -1.1 + pw, -0.35, 0.55, 5.5, 5.58], c: [148, 163, 184] },
            { b: [-1.75, -1.65, FLOOR, -0.35, 5.52, 5.58], c: [71, 85, 105] },
            { b: [-0.45 - cj, 0.45 - cj, FLOOR, 0.15 + cj, 5.5, 6.4], c: [180, 112, 30] },
          ];
        };
        w.buildProps();
      },
      fire(w) {
        const k = w.k++ % 3, mat = ["metal", "wood", "flesh"][k];
        const tgt = [{ X: -1.7, Y: 0.1 }, { X: 0, Y: -0.25 }, null][k];
        let h;
        if (tgt) { const X = tgt.X + rand(-0.4, 0.4), Y = tgt.Y + rand(-0.3, 0.3), p = P3(w, X, Y, 5.5); h = { x: p.x, y: p.y, X, Y, Z: 5.5 }; }
        else { const g = w.gobs[0]; const t = torso(g); h = { x: t.x + rand(-10, 10), y: t.y + rand(-14, 14), g }; }
        w.fp.kick = 0.04; w.fp.rot = 0.03;
        const m = fpMuzzle(w);
        w.spawn({ type: "slash", x: (m.x + h.x) / 2, y: (m.y + h.y) / 2, ang: Math.atan2(h.y - m.y, h.x - m.x), len: Math.hypot(h.x - m.x, h.y - m.y) / 2, size: 2, life: 0.06, color: "255,240,200" });
        w.emit("impact", h, mat);
        if (!w.on("decal")) w.spawn({ type: "circle", x: h.x, y: h.y, size: 4, life: 0.4, color: "160,160,170" });
      },
      update(w, dt) {
        fpsTick(w, dt);
        w.plate = Math.max(0, w.plate - dt * 2); w.crate = Math.max(0, w.crate - dt * 6); w.buildProps();
        if (w.decals.length > 24) w.decals.shift();
      },
      drawFront(w, ctx) {
        for (const d of w.decals) if (d.mat === "flesh" && d.g.alive) { const t = torso(d.g); drawDecal(w, ctx, { mat: "flesh", x: t.x + d.dx * d.g.h, y: t.y + d.dy * d.g.h, s: d.g.h / 100 }); }
        drawFpGun(w, ctx);
      },
      steps: [
        {
          id: "decal", name: { en: "Material Decals", ko: "재질별 자국" }, param: "dent / hole / splat",
          cap: { en: "Steel *dents*, wood *splinters*, enemy *splats*.", ko: "강철은 *찌그러지고*, 나무는 *쪼개지고*, 적은 *철퍽*." },
          impact(w, h, mat) {
            if (mat === "flesh") { const t = torso(h.g); w.decals.push({ mat, g: h.g, dx: (h.x - t.x) / h.g.h, dy: (h.y - t.y) / h.g.h }); }
            else w.decals.push({ mat, X: h.X, Y: h.Y, Z: h.Z, rot: rand(0, TAU) });
          },
        },
        {
          id: "debris", name: { en: "Material Debris", ko: "재질별 파편" }, param: "sparks/chips/drops",
          cap: { en: "Steel throws *sparks*, wood *chips*, enemy *drops*.", ko: "강철은 *불꽃*, 나무는 *조각*, 적은 *방울*." },
          impact(w, h, mat) {
            if (mat === "metal") sparks(w, h.x, h.y, 12, "255,214,120", [200, 600]);
            if (mat === "wood") for (let i = 0; i < 7; i++) w.spawn({ type: "chunk", x: h.x, y: h.y, vx: rand(-200, 200), vy: rand(-320, -80), g: 1300, vr: rand(-15, 15), life: 0.7, size: rand(3, 6), color: "146,84,20" });
            if (mat === "flesh") for (let i = 0; i < 9; i++) w.spawn({ type: "circle", x: h.x, y: h.y, vx: rand(-60, 220), vy: rand(-260, -40), g: 1100, life: 0.6, size: rand(2, 4), color: "101,163,13" });
          },
        },
        {
          id: "puff", name: { en: "Impact Puff", ko: "충돌 먼지" }, param: "flash/dust/mist",
          cap: { en: "Steel *flashes*, wood *dusts*, enemy *mists*.", ko: "강철은 *번쩍*, 나무는 *먼지*, 적은 *안개*." },
          impact(w, h, mat) {
            if (mat === "metal") w.spawn({ type: "star", x: h.x, y: h.y, size: 26, life: 0.08, color: "255,255,255" });
            else for (let i = 0; i < 4; i++) w.spawn({ type: "smoke", x: h.x, y: h.y, vx: rand(-60, 60), vy: rand(-60, -10), drag: 3, size: 4, size1: 16, life: 0.5, color: mat === "wood" ? "214,180,130" : "132,204,22" });
          },
        },
        {
          id: "react", name: { en: "Material Reaction", ko: "재질별 반응" }, param: "ring / jolt / flinch",
          cap: { en: "Steel *rings*, the crate *jolts*, the enemy *flinches*.", ko: "강철은 *떨리고*, 상자는 *들썩*, 적은 *움찔*." },
          impact(w, h, mat) {
            if (mat === "metal") w.plate = 1;
            if (mat === "wood") w.crate = 1;
            if (mat === "flesh") { h.g.flash = 1; h.g.vib = 4; h.g.ox += 6; }
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ping / thunk / thud",
          cap: { en: "*Ping*, *thunk*, *thud*. Eyes closed, you'd still know.", ko: "*팅*, *쿵*, *퍽*. 눈 감아도 알아요." },
          impact(w, h, mat) { w.sfx.smg(); if (mat === "metal") w.sfx.ping(); if (mat === "wood") w.sfx.thunk(); if (mat === "flesh") w.sfx.hit(); },
        },
      ],
    },

    /* 18 ─ 도탄 */
    {
      id: "shooter-ricochet", cat: "shooter", view: "3d",
      title: { en: "Make ricochets *sing*", ko: "도탄이 *노래하게*" },
      intro: { en: "Shoot the steel plate. It just… *absorbs it*.", ko: "강철판을 쐈는데 그냥 *먹혀요*." },
      interval: 0.7, stepDur: 3.8,
      drawFloor(w, ctx) {
        fpsRoom(w, ctx);
        for (const d of w.marks) { const p = P3(w, d.X, d.Y, d.Z); ctx.fillStyle = "rgba(10,10,14,0.85)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 3, 0, 0, TAU); ctx.fill(); }
      },
      setup(w) {
        fpsSetup(w, [[2.6, 9]]);
        w.wob = 0; w.marks = [];
        w.buildProps = () => {
          const t = Math.sin(w.time * 26) * w.wob * 0.12;
          w.props = [
            { b: [-0.2, 0.2, FLOOR, -0.2, 5.2, 5.6], c: [71, 85, 105] },
            { b: [-0.7 + t, 0.7 + t, -0.2, 0.35, 5.0, 5.5], c: [148, 163, 184] },
          ];
        };
        w.buildProps();
      },
      fire(w) {
        const m = fpMuzzle(w), h = P3(w, rand(-0.4, 0.4), rand(-0.05, 0.25), 5.0);
        w.fp.kick = 0.05; w.fp.rot = 0.04;
        w.spawn({ type: "slash", x: (m.x + h.x) / 2, y: (m.y + h.y) / 2, ang: Math.atan2(h.y - m.y, h.x - m.x), len: Math.hypot(h.x - m.x, h.y - m.y) / 2, size: 2, life: 0.05, color: "255,240,200" });
        const end = { X: rand(1.6, 3.4), Y: FLOOR, Z: rand(7, 10) }, e = P3(w, end.X, end.Y, end.Z);
        w.emit("hit", h, e, end);
      },
      update(w, dt) { fpsTick(w, dt); w.wob = Math.max(0, w.wob - dt * 1.5); w.buildProps(); if (w.marks.length > 10) w.marks.shift(); },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) { xhair(ctx); },
      steps: [
        {
          id: "spark", name: { en: "Glancing Sparks", ko: "비껴 튀는 불꽃" }, param: "cone along bounce",
          cap: { en: "Sparks spray *the way it bounces*, not everywhere.", ko: "불꽃은 아무 데나 말고 *튕기는 쪽*으로." },
          hit(w, h, e) { const a = Math.atan2(e.y - h.y, e.x - h.x); sparks(w, h.x, h.y, 14, "255,220,140", [300, 800], a - 0.45, a + 0.45); w.spawn({ type: "star", x: h.x, y: h.y, size: 24, life: 0.07, color: "255,255,255" }); },
        },
        {
          id: "tracer", name: { en: "Ricochet Tracer", ko: "튕겨 나간 궤적" }, param: "streak 0.12s",
          cap: { en: "Draw the bullet *flying off*. Now you *see* the bounce.", ko: "*튕겨 나가는* 총알을 그려요. 이제 *보여요*." },
          hit(w, h, e, end) {
            const dur = 0.12;
            w.shoot({ x: h.x, y: h.y, vx: (e.x - h.x) / dur, vy: (e.y - h.y) / dur, len: 40, lw: 3, test: p => p.age >= dur, onHit: () => w.emit("land", e, end) });
          },
        },
        {
          id: "land", name: { en: "Second Impact", ko: "두 번째 착탄" }, param: "dust + mark",
          cap: { en: "It *lands* somewhere. Dust and a mark *prove* it.", ko: "어딘가에 *떨어져요*. 먼지와 자국이 *증거*." },
          land(w, e, end) { dust(w, e.x, e.y, 5); w.marks.push(end); },
        },
        {
          id: "wobble", name: { en: "Plate Wobble", ko: "판 흔들림" }, param: "26Hz · decays",
          cap: { en: "The plate *shivers* after each hit.", ko: "맞을 때마다 판이 *부르르*." },
          hit(w) { w.wob = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ping + falling whine",
          cap: { en: "*Ping*, then the classic *pee-yoo* whine.", ko: "*팅*, 그리고 그 유명한 *피융~*." },
          hit(w) { w.sfx.smg(); w.sfx.ping(); w.play(() => tn({ type: "sine", f: 2600, f2: 900, dur: 0.35, vol: 0.14, delay: 0.03 })); },
        },
      ],
    },

    /* 19 ─ 예광탄 */
    {
      id: "shooter-tracers", cat: "shooter", view: "3d",
      title: { en: "Every *third* bullet is a tracer", ko: "*세 발에 한 발*은 예광탄" },
      intro: { en: "Full auto. Where are the bullets *going?*", ko: "연사 중. 총알이 *어디로* 가죠?" },
      interval: 1.3, stepDur: 3.8,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[-0.4, 7], [1.0, 8.5]]); w.trace = 0; },
      fire(w) {
        for (let i = 0; i < 9; i++) w.after(i * 0.075, () => {
          const g = w.gobs[i % 2 ? 1 : 0], m = fpMuzzle(w);
          w.fp.kick = 0.045; w.fp.rot = 0.035;
          const t = g.alive ? torso(g) : P3(w, rand(-1, 1), 0, 14);
          const h = { x: t.x + rand(-12, 12), y: t.y + rand(-12, 12), tracer: i % 3 === 0 };
          w.emit("shot", m, h);
          if (g.alive) { g.hp -= 6; g.vib = 2; if (g.hp <= 0) w.kill(g); }
        });
      },
      update(w, dt) { fpsTick(w, dt); w.trace = 0; },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) { xhair(ctx); },
      steps: [
        {
          id: "tracer", name: { en: "Tracer Rounds", ko: "예광탄" }, param: "1 in 3",
          cap: { en: "Only *every third* bullet glows. Enough to *read* the stream.", ko: "*세 발에 한 발*만 빛나요. 흐름이 *읽혀요*." },
          shot(w, m, h) {
            if (!h.tracer) return;
            const dur = 0.13;
            w.shoot({ x: m.x, y: m.y, vx: (h.x - m.x) / dur, vy: (h.y - m.y) / dur, test: p => p.age >= dur, onHit: () => w.emit("thit", h), draw: tracerDraw(w, m, h) });
          },
        },
        {
          id: "glow", name: { en: "Hot Color", ko: "뜨거운 색" }, param: "orange-red core",
          cap: { en: "Tracers burn *orange-red*. Not white, not yellow.", ko: "예광탄은 *주황빨강*. 흰색도 노랑도 아니에요." },
          shot(w, m, h) { h.hot = true; },
        },
        {
          id: "taper", name: { en: "Perspective Taper", ko: "멀어질수록 가늘게" }, param: "6px → 1.5px",
          cap: { en: "Thick near you, *thin far away*. Sells the depth.", ko: "가까이선 굵고 *멀수록 가늘게*. 깊이가 생겨요." },
          update(w) { w.trace = 1; },
        },
        {
          id: "impact", name: { en: "Tracer Impact", ko: "예광탄 착탄" }, param: "burst on tracers",
          cap: { en: "Tracers *burst* on impact. The rest stay quiet.", ko: "예광탄이 맞은 곳만 *팍*. 나머지는 조용히." },
          thit(w, h) { sparks(w, h.x, h.y, 8, "255,150,80", [120, 360]); w.spawn({ type: "glow", x: h.x, y: h.y, size: 26, size1: 4, life: 0.2, color: "255,120,60" }); },
        },
        {
          id: "flash", name: { en: "Muzzle Flash", ko: "총구 불꽃" }, param: "per shot",
          cap: { en: "Flash every shot. Count the *rhythm*.", ko: "한 발마다 번쩍. *리듬*이 보여요." },
          shot(w, m) { mFlash(w, m, 0.8); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "smg + snap",
          cap: { en: "A tight *rattle*. Tracers add a faint *snap*.", ko: "짧은 *드르륵*. 예광탄엔 *딱* 소리를 살짝." },
          shot(w, m, h) { w.sfx.smg(rand(0.95, 1.05)); if (h.tracer) w.sfx.tick(); },
        },
      ],
    },

    /* 20 ─ 제압 효과 */
    {
      id: "shooter-suppression", cat: "shooter", view: "3d",
      title: { en: "Make near-misses *scary*", ko: "빗나간 총알도 *무섭게*" },
      intro: { en: "Bullets fly past. You feel *nothing*.", ko: "총알이 스쳐 가도 *아무렇지 않아요*." },
      interval: 1.6, stepDur: 4.0,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[-1.8, 9], [1.6, 11]]); w.sup = 0; w.vgn = 0; w.blur = 0; w.gray = 0; },
      fire(w) {
        for (let i = 0; i < 6; i++) w.after(i * 0.11, () => {
          const g = w.gobs[i % 2]; if (!g.alive) return;
          const t = torso(g), mz = { x: t.x - g.w * 0.3 * (g.X < 0 ? -1 : 1), y: t.y };
          w.spawn({ type: "glow", x: mz.x, y: mz.y, size: 16, size1: 4, life: 0.08, color: "255,200,110" });
          const side = rand(0, 1) < 0.5 ? -1 : 1, e = { x: 270 + side * rand(160, 320), y: HY + rand(-160, 160) };
          w.emit("whiz", mz, e);
          w.sup = Math.min(1, w.sup + 0.17);
        });
      },
      update(w, dt) { fpsTick(w, dt); w.sup = Math.max(0, w.sup - dt * 0.3); w.vgn = 0; w.blur = 0; w.gray = 0; },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx, 6 + w.sup * 8 * (w.vgn ? 1 : 0));
        if (w.gray > 0.02) screenFx(ctx, "grayscale(1)", w.gray);
        if (w.blur > 0.02) screenFx(ctx, "blur(6px)", w.blur, 0, 0, edgeClip(140, 90));
        if (w.vgn > 0.01) {
          const g = ctx.createRadialGradient(270, HY, 80, 270, HY, 330);
          g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${w.vgn})`);
          ctx.fillStyle = g; ctx.fillRect(-60, -60, 660, 480);
        }
      },
      steps: [
        {
          id: "whiz", name: { en: "Whiz Streaks", ko: "스치는 탄 줄기" }, param: "grow toward camera",
          cap: { en: "Show bullets *rushing past* your head.", ko: "총알이 *머리 옆을 휙* 지나가요." },
          whiz(w, a, e) { const dur = 0.1; w.shoot({ x: a.x, y: a.y, vx: (e.x - a.x) / dur, vy: (e.y - a.y) / dur, len: 90, lw: 5, test: p => p.age >= dur }); },
        },
        {
          id: "vig", name: { en: "Dark Edges", ko: "가장자리 어둡게" }, param: "× suppression",
          cap: { en: "Edges *darken* as the fire builds up.", ko: "총알이 쏟아질수록 가장자리가 *어두워져요*." },
          update(w) { w.vgn = w.sup * 0.85; },
        },
        {
          id: "blur", name: { en: "Edge Blur", ko: "가장자리 흐림" }, param: "blur 6px",
          cap: { en: "Vision *narrows*. The edges *smear*.", ko: "시야가 *좁아져요*. 가장자리가 *번져요*." },
          update(w) { w.blur = w.sup; },
        },
        {
          id: "shake", name: { en: "Flinch Shake", ko: "움찔 흔들림" }, param: "trauma .18 / miss",
          cap: { en: "Each near-miss makes the view *flinch*.", ko: "스칠 때마다 시야가 *움찔*." },
          whiz(w, a, e) { w.shake(0.18, e.x < 270 ? 1 : -1); w.fp.oy -= 0.01; },
        },
        {
          id: "gray", name: { en: "Drain Color", ko: "색 빠지기" }, param: "grayscale × sup",
          cap: { en: "Color *drains*. Panic looks grey.", ko: "색이 *빠져요*. 공포는 잿빛이에요." },
          update(w) { w.gray = w.sup * 0.8; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "supersonic crack",
          cap: { en: "A sharp *crack* right by your ear.", ko: "귓가에서 날카로운 *딱!*" },
          whiz(w) { w.play(() => { nz({ type: "highpass", f: 3000, dur: 0.05, vol: 0.35 }); nz({ type: "bandpass", f: 1800, f2: 500, q: 2, dur: 0.15, vol: 0.25 }); }); },
        },
      ],
    },

    /* 21 ─ 피격 방향 표시 */
    {
      id: "shooter-damage-dir", cat: "shooter", view: "3d",
      title: { en: "Show *where* the hit came from", ko: "*어디서* 맞았는지 보여 주기" },
      intro: { en: "Taking damage. From *where?*", ko: "맞고 있어요. *어디서요?*" },
      interval: 1.1, stepDur: 4.0,
      drawFloor: fpsRoom,
      setup(w) {
        fpsSetup(w, [[-2.4, 6.5]]); w.gobs[0].maxHp = 0;
        w.hp = 100; w.hpLag = 100; w.lagWait = 0; w.k = 0; w.ind = []; w.edge = null; w.hpShake = 0;
      },
      fire(w) {
        const from = [-Math.PI * 0.82, 0, Math.PI / 2][w.k++ % 3];
        if (from < -1) { const t = torso(w.gobs[0]); w.spawn({ type: "glow", x: t.x + 14, y: t.y, size: 24, size1: 4, life: 0.1, color: "255,200,110" }); }
        w.hp -= 12; if (w.hp <= 30) w.after(0.6, () => { w.hp = 100; });
        w.emit("hurt", from);
      },
      update(w, dt) {
        fpsTick(w, dt);
        for (const d of w.ind) d.t -= dt;
        w.ind = w.ind.filter(d => d.t > 0);
        if (w.hpLag < w.hp) w.hpLag = w.hp;
        if (!w.on("hp")) w.hpLag = w.hp;
        w.hpShake = Math.max(0, w.hpShake - dt);
      },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx);
        if (w.edge && w.edge.t > 0) {
          const a = w.edge.a, ex = 270 + Math.cos(a) * 300, ey = HY + Math.sin(a) * 220;
          const g = ctx.createRadialGradient(ex, ey, 10, ex, ey, 260);
          g.addColorStop(0, `rgba(220,38,38,${0.9 * w.edge.t})`); g.addColorStop(1, "rgba(220,38,38,0)");
          ctx.fillStyle = g; ctx.fillRect(-60, -60, 660, 480);
        }
        for (const d of w.ind) {
          ctx.save(); ctx.translate(270, HY); ctx.rotate(d.a); ctx.globalAlpha = Math.min(1, d.t);
          ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 16;
          ctx.fillStyle = "rgba(239,68,68,0.95)"; ctx.beginPath(); ctx.arc(0, 0, 86, -0.5, 0.5); ctx.arc(0, 0, 66, 0.4, -0.4, true); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(108, 0); ctx.lineTo(90, -14); ctx.lineTo(90, 14); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        const x = 40 + (w.hpShake > 0 ? rand(-3, 3) : 0), y = 300;
        rr(ctx, x - 4, y - 4, 128, 18, 5, "rgba(8,9,14,0.75)");
        ctx.fillStyle = "#facc15"; ctx.fillRect(x, y, 120 * w.hpLag / 100, 10);
        ctx.fillStyle = w.hp < 40 ? "#ef4444" : "#e5e7eb"; ctx.fillRect(x, y, 120 * w.hp / 100, 10);
        hudNum(ctx, "HP", x, y - 14, 12, "rgba(255,255,255,0.6)", "left");
      },
      steps: [
        {
          id: "arc", name: { en: "Direction Arc", ko: "방향 표시" }, param: "arc · fade 1.2s",
          cap: { en: "A red *arc* around the crosshair *points at the shooter*.", ko: "조준점 둘레 빨간 *호*가 *쏜 쪽*을 가리켜요." },
          hurt(w, a) { w.ind.push({ a, t: 1.2 }); },
        },
        {
          id: "edge", name: { en: "Edge Glow", ko: "가장자리 붉게" }, param: "that side only",
          cap: { en: "Only *that side* of the screen glows red.", ko: "*맞은 쪽* 가장자리만 붉게." },
          hurt(w, a) { w.edge = { a, t: 1 }; w.tween(w.edge, { t: 0 }, 0.8, "in"); },
        },
        {
          id: "jolt", name: { en: "Push Away", ko: "반대로 밀림" }, param: "view 14px away",
          cap: { en: "The view *jolts away* from the hit.", ko: "맞은 반대쪽으로 시야가 *툭* 밀려요." },
          hurt(w, a) { w.kick(-Math.cos(a) * 14, -Math.sin(a) * 10); w.fp.ox -= Math.cos(a) * 0.03; },
        },
        {
          id: "hp", name: { en: "Two-layer HP", ko: "두 겹 체력바" }, param: "lag 0.35s · shake",
          cap: { en: "HP drops *now*, the yellow *follows*. The bar shakes.", ko: "체력은 *바로*, 노랑은 *천천히*. 바가 흔들려요." },
          hurt(w) { w.lagWait = 0.35; w.hpShake = 0.3; },
          update(w, dt) { if (w.lagWait > 0) w.lagWait -= dt; else w.hpLag += (w.hp - w.hpLag) * Math.min(1, dt * 3.5); },
        },
        {
          id: "flash", name: { en: "Red Pulse", ko: "붉은 번쩍" }, param: "vignette .45",
          cap: { en: "A quick *red pulse* on every hit.", ko: "맞을 때마다 짧게 *붉은 번쩍*." },
          hurt(w) { w.vignette(0.45); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hurt + grunt",
          cap: { en: "A dull *thump* and a grunt.", ko: "둔한 *퍽*, 그리고 *윽*." },
          hurt(w) { w.sfx.hurt(); },
        },
      ],
    },
  );
  RECIPES.push(
    /* 22 ─ 빈사 상태 심장 박동 */
    {
      id: "shooter-low-health", cat: "shooter", view: "3d",
      title: { en: "Make low health *feel urgent*", ko: "빈사 상태를 *절박하게*" },
      intro: { en: "9 HP left. The screen looks *perfectly calm*.", ko: "체력 9. 화면은 *평화로워요*." },
      interval: 1.3, stepDur: 4.2,
      drawFloor: fpsRoom,
      setup(w) {
        fpsSetup(w, [[-0.6, 8], [1.4, 10]]);
        w.hp = 45; w.beatT = 0; w.bar = 0; w.gray = 0; w.low = false;
      },
      fire(w) {
        w.hp -= 12; w.emit("hurt");
        if (w.hp <= 0) w.hp = 45;
      },
      update(w, dt) {
        fpsTick(w, dt);
        w.low = w.hp <= 35; w.gray = 0; w.bar = Math.max(0, w.bar - dt * 3);
        w.beatT -= dt;
        if (w.low && w.beatT <= 0) { w.beatT = 0.38 + w.hp / 60; w.emit("beat"); w.after(0.16, () => w.emit("beat2")); }
      },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx);
        if (w.gray > 0.02) screenFx(ctx, "grayscale(1)", w.gray);
        const x = 40, y = 300, red = w.bar > 0.1 && Math.floor(w.time * 10) % 2;
        rr(ctx, x - 4, y - 4, 128, 18, 5, "rgba(8,9,14,0.75)");
        ctx.fillStyle = red ? "#fff" : w.low ? "#ef4444" : "#e5e7eb"; ctx.fillRect(x, y, 120 * w.hp / 100, 10);
        hudNum(ctx, "HP " + w.hp, x, y - 14, 12, w.low && w.bar ? "#fca5a5" : "rgba(255,255,255,0.6)", "left");
      },
      steps: [
        {
          id: "pulse", name: { en: "Pulsing Edges", ko: "뛰는 가장자리" }, param: "red .55 per beat",
          cap: { en: "Red edges *pulse with the heartbeat*.", ko: "붉은 가장자리가 *심장 박동*에 맞춰 뛰어요." },
          beat(w) { w.vignette(0.55); },
          beat2(w) { w.vignette(0.35); },
        },
        {
          id: "gray", name: { en: "Drain Color", ko: "색 빠지기" }, param: "grayscale .75",
          cap: { en: "The world *loses its color*. You're fading.", ko: "세상이 *색을 잃어요*. 정신이 흐려져요." },
          update(w) { if (w.low) w.gray = 0.75; },
        },
        {
          id: "throb", name: { en: "Screen Throb", ko: "화면 쿵쿵" }, param: "zoom .03 per beat",
          cap: { en: "The whole view *throbs* on each beat.", ko: "박동마다 화면 전체가 *쿵*." },
          beat(w) { w.zoomPunch(0.035); },
          beat2(w) { w.zoomPunch(0.02); },
        },
        {
          id: "bar", name: { en: "Flashing HP", ko: "깜빡이는 체력" }, param: "blink on beat",
          cap: { en: "The HP bar *blinks* with your pulse.", ko: "체력바가 맥박 따라 *깜빡*." },
          beat(w) { w.bar = 1; },
        },
        {
          id: "heavy", name: { en: "Heavy Arms", ko: "무거운 팔" }, param: "gun sags · sways",
          cap: { en: "The gun *sags* and wobbles. Arms feel weak.", ko: "총이 *축 처지고* 흔들려요. 팔에 힘이 빠져요." },
          update(w) { if (w.low) { w.fp.oy = -0.05 + Math.sin(w.time * 2) * 0.012; w.fp.ox = Math.sin(w.time * 1.3) * 0.02; } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "lub-dub · low",
          cap: { en: "A deep *lub-dub* under everything.", ko: "모든 소리 아래 깔리는 *쿵-쿵*." },
          beat(w) { w.play(() => tn({ f: 70, f2: 40, dur: 0.14, vol: 0.6 })); },
          beat2(w) { w.play(() => tn({ f: 60, f2: 35, dur: 0.12, vol: 0.45 })); },
          hurt(w) { w.sfx.hurt(); },
        },
      ],
    },

    /* 23 ─ 수류탄 경고 */
    {
      id: "shooter-grenade-warn", cat: "shooter", view: "3d",
      title: { en: "Warn about *grenades*", ko: "*수류탄*을 경고하기" },
      intro: { en: "Something landed nearby. *Boom.* What was that?", ko: "뭔가 떨어지더니 *쾅*. 뭐였죠?" },
      interval: 3.0, stepDur: 4.2,
      drawFloor(w, ctx) {
        fpsRoom(w, ctx);
        const n = w.nade;
        if (n && n.ring) {
          const k = 1 - n.fuse / 2.2, pulse = 0.5 + 0.5 * Math.sin(w.time * (8 + k * 30));
          ctx.beginPath();
          for (let i = 0; i <= 32; i++) { const a = i / 32 * TAU, p = P3(w, n.lx + Math.cos(a) * 1.3, FLOOR, n.lz + Math.sin(a) * 1.3); ctx[i ? "lineTo" : "moveTo"](p.x, p.y); }
          ctx.fillStyle = `rgba(239,68,68,${0.12 + 0.18 * pulse})`; ctx.fill();
          ctx.strokeStyle = `rgba(248,113,113,${0.5 + 0.5 * pulse})`; ctx.lineWidth = 3; ctx.stroke();
        }
      },
      setup(w) { fpsSetup(w, [[-1.4, 8]]); w.gobs[0].maxHp = 0; w.nade = null; },
      fire(w) {
        if (w.nade) return;
        const g = w.gobs[0]; g.sy = 1.2;
        const T = 0.9, n = { X: -1.4, Y: -0.1, Z: 7.8, lx: -0.55, lz: 3.0, t: 0, fuse: 2.2, landed: false, ring: false, icon: false, fast: false };
        n.vx = (n.lx - n.X) / T; n.vz = (n.lz - n.Z) / T; n.vy = (FLOOR + 0.12 - n.Y + 0.5 * 9 * T * T) / T;
        w.nade = n; w.emit("throw", n);
      },
      update(w, dt) {
        fpsTick(w, dt);
        const n = w.nade; if (!n) return;
        n.t += dt; n.fuse -= dt;
        if (!n.landed) {
          n.X += n.vx * dt; n.Z += n.vz * dt; n.Y += n.vy * dt; n.vy -= 9 * dt;
          if (n.Y <= FLOOR + 0.12) { n.Y = FLOOR + 0.12; n.landed = true; w.emit("land", n); }
        }
        w.emit("tick", n, dt);
        if (n.fuse <= 0) { w.nade = null; w.emit("boom", P3(w, n.X, n.Y, n.Z)); }
      },
      drawFront(w, ctx) {
        const n = w.nade;
        if (n) {
          const p = P3(w, n.X, n.Y, n.Z), c = SPR.grenade.c, s = 0.22 * p.s;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(n.t * (n.landed ? 0 : 12)); ctx.drawImage(c, -s / 2, -s * 0.6, s, s * c.height / c.width); ctx.restore();
          if (n.icon) {
            const blink = n.fast ? Math.floor(w.time * (4 + (1 - n.fuse / 2.2) * 16)) % 2 : 1;
            const ix = p.x, iy = Math.max(70, p.y - 70);
            ctx.globalAlpha = blink ? 1 : 0.35;
            ctx.fillStyle = "rgba(10,10,14,0.85)"; ctx.beginPath(); ctx.arc(ix, iy, 21, 0, TAU); ctx.fill();
            ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.stroke();
            ctx.drawImage(c, ix - 10, iy - 13, 20, 20 * c.height / c.width);
            ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(ix - 9, iy + 25); ctx.lineTo(ix + 9, iy + 25); ctx.lineTo(ix, iy + 36); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
        drawFpGun(w, ctx);
      },
      drawHud(w, ctx) { xhair(ctx); },
      steps: [
        {
          id: "icon", name: { en: "Grenade Icon", ko: "수류탄 아이콘" }, param: "icon + arrow",
          cap: { en: "Pin an *icon* above it. Name the danger.", ko: "위에 *아이콘*을 띄워요. 위험에 이름을 붙여요." },
          throw(w, n) { n.icon = true; },
        },
        {
          id: "ring", name: { en: "Blast Radius", ko: "폭발 범위" }, param: "r 1.3m on floor",
          cap: { en: "Paint the *blast radius* on the floor. Get out of it.", ko: "바닥에 *폭발 범위*를 그려요. 여기서 나가요." },
          land(w, n) { n.ring = true; },
        },
        {
          id: "fast", name: { en: "Faster Blink", ko: "점점 빨리 깜빡" }, param: "4 → 20 Hz",
          cap: { en: "Blink *faster* as the fuse burns down.", ko: "터질 때가 가까울수록 *더 빨리* 깜빡여요." },
          throw(w, n) { n.fast = true; },
        },
        {
          id: "fuse", name: { en: "Fuse Sparks", ko: "도화선 불꽃" }, param: "sparks while live",
          cap: { en: "Tiny *sparks* spit from the fuse. It's *live*.", ko: "도화선에서 *불꽃*이 튀어요. *살아 있어요*." },
          tick(w, n, dt) { if (Math.random() < dt * 40) { const p = P3(w, n.X, n.Y + 0.1, n.Z); w.spawn({ type: "spark", x: p.x, y: p.y, vx: rand(-80, 80), vy: rand(-160, -60), g: 400, life: 0.25, size: 2, color: "255,200,90" }); } },
        },
        {
          id: "boom", name: { en: "Big Blast", ko: "큰 폭발" }, param: "flash · shake .6",
          cap: { en: "When it goes, *sell it*: flash, fire, shake.", ko: "터질 땐 *확실하게*. 섬광, 불, 흔들림." },
          boom(w, p) {
            w.flash("255,230,180", 0.7); w.shake(0.6);
            w.spawn({ type: "glow", x: p.x, y: p.y - 20, size: 160, size1: 40, life: 0.4, color: "255,150,60" });
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 20, size1: 200, life: 0.35, w: 14, color: "255,220,170" });
            for (let i = 0; i < 10; i++) w.spawn({ type: "smoke", x: p.x + rand(-40, 40), y: p.y - rand(0, 40), vx: rand(-200, 200), vy: rand(-220, -40), drag: 2, size: 14, size1: 40, life: 0.9, color: "90,90,100" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "beeps speed up",
          cap: { en: "*Beep… beep.. beep.* Faster and faster.", ko: "*삑… 삑.. 삑.* 점점 빨라져요." },
          tick(w, n) { const gap = 0.08 + n.fuse * 0.2; if (n.landed && w.time - (n.beep || 0) > gap) { n.beep = w.time; w.play(() => tn({ type: "square", f: 1600, dur: 0.04, vol: 0.1 })); } },
          boom(w) { w.sfx.boom(); },
        },
      ],
    },

    /* 24 ─ 폭발 후 귀 울림 */
    {
      id: "shooter-ear-ring", cat: "shooter", view: "3d",
      title: { en: "Make blasts *ring in your ears*", ko: "폭발 뒤 *귀가 멍하게*" },
      intro: { en: "Huge blast, one meter away. You *shrug it off*.", ko: "바로 옆에서 큰 폭발. 그냥 *멀쩡해요*." },
      interval: 3.0, stepDur: 4.4,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[1.6, 9]]); w.gobs[0].maxHp = 0; w.daze = 0; w.wo = 0; w.muf = 0; w.ghost = 0; },
      fire(w) {
        const p = P3(w, 0.7, FLOOR + 0.3, 3.8);
        w.daze = 1; w.emit("boom", p);
        w.spawn({ type: "circle", x: p.x, y: p.y - 20, size: 46, life: 0.25, color: "255,170,80" });
      },
      update(w, dt) {
        fpsTick(w, dt);
        w.daze = Math.max(0, w.daze - dt * 0.4); w.wo = Math.max(0, w.wo - dt * 3);
        w.muf = 0; w.ghost = 0;
      },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx);
        if (w.muf > 0.02) screenFx(ctx, "blur(3px) grayscale(0.8)", w.muf);
        if (w.ghost > 0.02) screenFx(ctx, "none", w.ghost * 0.45, 14 * Math.sin(w.time * 2.2), 4 * Math.cos(w.time * 1.7));
        if (w.wo > 0) { ctx.fillStyle = `rgba(255,252,240,${Math.min(0.95, w.wo)})`; ctx.fillRect(-60, -60, 660, 480); }
      },
      steps: [
        {
          id: "blast", name: { en: "Fireball", ko: "불덩이" }, param: "fire + smoke + shake",
          cap: { en: "A real *fireball*, debris and a hard shake.", ko: "제대로 된 *불덩이*, 파편, 그리고 큰 흔들림." },
          boom(w, p) {
            w.shake(0.75);
            for (let i = 0; i < 14; i++) w.spawn({ type: "glow", x: p.x + rand(-40, 40), y: p.y - rand(0, 70), vx: rand(-200, 200), vy: rand(-240, -40), drag: 2, size: rand(30, 60), size1: 6, life: rand(0.4, 0.7), color: pick(["255,170,60", "255,110,40", "255,220,140"]) });
            for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: p.x, y: p.y - 20, vx: rand(-500, 500), vy: rand(-600, -200), g: 1400, vr: rand(-12, 12), life: 1, size: rand(4, 8), color: "60,60,70" });
          },
        },
        {
          id: "white", name: { en: "White-out", ko: "하얗게 날아감" }, param: "fade 0.3s",
          cap: { en: "Blow the screen *white*, fade back *slowly*.", ko: "화면을 *하얗게* 날리고, *천천히* 돌아와요." },
          boom(w) { w.wo = 0.85; },
        },
        {
          id: "muffle", name: { en: "Muffled Vision", ko: "멍한 시야" }, param: "blur + gray × daze",
          cap: { en: "Everything goes *soft and grey*. You're dazed.", ko: "모든 게 *뿌옇고 잿빛*. 정신이 멍해요." },
          update(w) { w.muf = w.daze; },
        },
        {
          id: "ghost", name: { en: "Double Vision", ko: "겹쳐 보임" }, param: "ghost ±14px",
          cap: { en: "A drifting *double image*. Eyes won't focus.", ko: "흔들리는 *겹상*. 초점이 안 맞아요." },
          update(w) { w.ghost = w.daze; },
        },
        {
          id: "sway", name: { en: "Stagger", ko: "비틀거림" }, param: "view sway × daze",
          cap: { en: "The view *staggers*, the gun drifts.", ko: "시야가 *비틀*, 총도 흘러내려요." },
          update(w) { const d = w.daze; w.lookX = Math.sin(w.time * 1.6) * 22 * d; w.lookY = Math.sin(w.time * 2.3) * 10 * d; w.fp.roll = Math.sin(w.time * 1.6) * 0.15 * d; w.fp.oy = -0.06 * d; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "boom → 3.8kHz ring",
          cap: { en: "Boom, then a thin *eeeee* that slowly fades.", ko: "쾅, 그리고 천천히 사라지는 *삐이이*." },
          boom(w) { w.sfx.boom(); w.play(() => { tn({ type: "sine", f: 3800, dur: 2.6, vol: 0.09, delay: 0.15 }); tn({ type: "sine", f: 3820, dur: 2.2, vol: 0.05, delay: 0.15 }); }); },
        },
      ],
    },

    /* 25 ─ 저격 조준경 흔들림 + 숨 참기 */
    {
      id: "shooter-scope-breath", cat: "shooter", view: "3d",
      title: { en: "Make the scope *breathe*", ko: "조준경에 *숨결* 넣기" },
      intro: { en: "A rock-steady scope. *No skill* in the shot.", ko: "흔들림 없는 조준경. 실력이 *필요 없어요*." },
      interval: 2.8, stepDur: 4.4,
      drawFloor: fpsRoom,
      setup(w) {
        fpsSetup(w, [[0, 17]]); w.fz = 3.2;
        w.amp = 0; w.ampT = 0; w.holding = false; w.breath = 1; w.shaky = 0; w.dark = 0; w.zoomK = 0; w.showMeter = false;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const shoot = () => {
          w.holding = false;
          const g = w.gobs[0], t = torso(g), hit = g.alive && Math.hypot(t.x - 270, t.y - HY) < g.w * 0.35;
          w.emit("shot", hit);
          if (hit) { g.flash = 1.5; w.kill(g); } else dust(w, 270, HY, 4);
          w.after(0.6, () => { w.busy = false; });
        };
        if (w.on("hold")) { w.holding = true; w.emit("inhale"); w.after(1.2, shoot); } else shoot();
      },
      update(w, dt) {
        fpsTick(w, dt);
        w.amp += (w.ampT - w.amp) * Math.min(1, dt * 5); w.ampT = 0;
        w.shaky = Math.max(0, w.shaky - dt);
        w.breath = w.holding ? Math.max(0, w.breath - dt / 1.4) : Math.min(1, w.breath + dt / 1.5);
        w.lookX = (Math.sin(w.time * 0.9) * 30 + Math.sin(w.time * 7) * 4 * (w.shaky > 0 ? 1 : 0)) * w.amp;
        w.lookY = Math.sin(w.time * 1.8) * 16 * w.amp;
        w.fz = 3.2 + w.zoomK * 0.4; w.dark = 0; w.showMeter = false;
      },
      drawHud(w, ctx) {
        ctx.save();
        ctx.beginPath(); ctx.rect(-80, -80, 700, 520); ctx.arc(270, HY, 132, 0, TAU); ctx.fillStyle = "#050507"; ctx.fill("evenodd");
        const g = ctx.createRadialGradient(270, HY, 110 - w.dark * 50, 270, HY, 134);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${0.45 + w.dark * 0.5})`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(270, HY, 134, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.9)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(140, HY); ctx.lineTo(400, HY); ctx.moveTo(270, 50); ctx.lineTo(270, 310); ctx.stroke();
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(140, HY); ctx.lineTo(225, HY); ctx.moveTo(315, HY); ctx.lineTo(400, HY); ctx.moveTo(270, HY + 45); ctx.lineTo(270, 312); ctx.stroke();
        for (let i = 1; i <= 3; i++) { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(270, HY + i * 12, 2, 0, TAU); ctx.fill(); }
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(270, HY, 2, 0, TAU); ctx.fill();
        ctx.restore();
        if (w.showMeter) {
          rr(ctx, 410, 300, 104, 12, 4, "rgba(255,255,255,0.12)");
          rr(ctx, 410, 300, Math.max(3, 104 * w.breath), 12, 4, w.breath < 0.3 ? "#ef4444" : "#7dd3fc");
          hudNum(ctx, "BREATH", 410, 288, 11, "rgba(255,255,255,0.6)", "left");
        }
      },
      steps: [
        {
          id: "sway", name: { en: "Scope Sway", ko: "조준경 흔들림" }, param: "figure-8 · 30px",
          cap: { en: "The reticle *drifts* in a slow figure-8.", ko: "십자선이 느린 *8자*로 흘러요." },
          update(w) { w.ampT = 1; },
        },
        {
          id: "hold", name: { en: "Hold Breath", ko: "숨 참기" }, param: "1.2s · sway ×0.08",
          cap: { en: "*Hold your breath*. The drift almost stops.", ko: "*숨을 참으면* 흔들림이 거의 멈춰요." },
          update(w) { if (w.holding) w.ampT = 0.08; },
        },
        {
          id: "focus", name: { en: "Tunnel In", ko: "시야 조이기" }, param: "dark ring + zoom",
          cap: { en: "While holding, the scope *darkens* and *zooms* a touch.", ko: "참는 동안 테두리가 *어두워지고* 살짝 *당겨져요*." },
          update(w, dt) { w.zoomK += ((w.holding ? 1 : 0) - w.zoomK) * Math.min(1, dt * 6); w.dark = w.zoomK; },
        },
        {
          id: "meter", name: { en: "Breath Meter", ko: "숨 게이지" }, param: "drains 1.4s",
          cap: { en: "A *breath meter* drains. You can't hold forever.", ko: "*숨 게이지*가 줄어요. 영원히는 못 참아요." },
          update(w) { w.showMeter = true; },
        },
        {
          id: "recoil", name: { en: "Kick + Gasp", ko: "반동 + 헐떡임" }, param: "kick 40px · shaky 1s",
          cap: { en: "The shot *kicks*, then you *gasp*. The sway gets worse.", ko: "쏘면 *턱* 튀고, 숨을 *헐떡*. 흔들림이 커져요." },
          shot(w) { w.kick(0, 40); w.flash("255,240,210", 0.25); w.shaky = 1; w.amp = 1.8; },
          update(w) { if (w.shaky > 0) w.ampT = 1.6; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "inhale · crack",
          cap: { en: "A quiet *inhale*… then a huge *crack*.", ko: "조용히 *흡*… 그리고 큰 *탕!*" },
          inhale(w) { w.play(() => nz({ type: "bandpass", f: 900, f2: 1800, q: 1, dur: 0.5, vol: 0.12 })); },
          shot(w, hit) { w.sfx.shotgun(); if (hit) w.after(0.12, () => w.sfx.hit()); },
        },
      ],
    },
  );
  RECIPES.push(
    /* 26 ─ 탄도 낙차 */
    {
      id: "shooter-bullet-drop", cat: "shooter", view: "side",
      title: { en: "Show *bullet drop* at long range", ko: "먼 거리 *탄도 낙차* 보여 주기" },
      intro: { en: "400 meters. The bullet flies like a *laser*.", ko: "400미터. 총알이 *레이저*처럼 날아가요." },
      interval: 2.2, stepDur: 4.2,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(-80, G, 700, 120);
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
        for (let i = 1; i <= 4; i++) { const x = 70 + i * 100; ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x, G, 1.5, 10); label(ctx, i * 100 + "m", x, G + 22, 11, "rgba(255,255,255,0.45)", "center", "'JetBrains Mono', monospace", 700); }
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 70 }); w.gun = { kick: 0, rot: 0 };
        w.foe = w.actor("foe", { home: 478, h: 104 }); w.foe.maxHp = 0;
        w.grav = 0; w.aimRot = 0; w.prev = false; w.path = [];
      },
      plan(w) {
        const m = muzzle(w), tx = w.foe.x - 18, ty = G - 58, vx = 760, t = (tx - m.x) / vx;
        const vy = (ty - m.y - 0.5 * w.grav * t * t) / t;
        return { m, vx, vy, t };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const P = this.plan(w);
        w.gun.rot = Math.atan2(P.vy, P.vx);
        w.after(0.25, () => {
          const Q = this.plan(w), b = { x: Q.m.x, y: Q.m.y, vx: Q.vx, vy: Q.vy, g: w.grav, r: 3, color: "#e5e7eb", hitX: w.foe.x - 18 };
          b.onHit = () => { w.emit("hit", { x: b.x, y: b.y }); w.foe.flash = 1; w.foe.ox += 10; w.after(0.4, () => { w.busy = false; }); };
          w.path = [];
          w.emit("fire", Q.m, b, Q.t);
          w.shoot(b);
        });
      },
      update(w, dt) {
        const g = w.gun; g.kick -= g.kick * Math.min(1, dt * 16);
        if (!w.busy) g.rot -= g.rot * Math.min(1, dt * 4);
        w.grav = 0; w.prev = false;
      },
      drawBack(w, ctx) {
        if (w.prev && !w.busy) {
          const P = this.plan(w);
          ctx.fillStyle = "rgba(198,244,50,0.55)";
          for (let k = 0.04; k < 1; k += 0.05) { const t = P.t * k; ctx.beginPath(); ctx.arc(P.m.x + P.vx * t, P.m.y + P.vy * t + 0.5 * w.grav * t * t, 2.2, 0, TAU); ctx.fill(); }
        }
        if (w.path.length > 1) {
          ctx.strokeStyle = "rgba(255,200,120,0.6)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
          ctx.beginPath(); w.path.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p.x, p.y)); ctx.stroke(); ctx.setLineDash([]);
        }
      },
      drawFront(w, ctx) { drawGun(w, ctx); },
      steps: [
        {
          id: "drop", name: { en: "Gravity", ko: "중력" }, param: "g 600 px/s²",
          cap: { en: "Bullets *fall*. Aim *above* the target to hit it.", ko: "총알은 *떨어져요*. 맞히려면 *위를* 겨눠요." },
          update(w) { w.grav = 600; },
        },
        {
          id: "preview", name: { en: "Arc Preview", ko: "궤적 미리 보기" }, param: "dotted · before shot",
          cap: { en: "Show the *predicted arc* while aiming.", ko: "조준하는 동안 *예상 궤적*을 점선으로." },
          update(w) { w.prev = true; },
        },
        {
          id: "trail", name: { en: "Flight Trail", ko: "비행 궤적" }, param: "dashed · stays 1s",
          cap: { en: "Leave the *real path* behind the bullet.", ko: "총알 뒤에 *실제 경로*를 남겨요." },
          update(w) { for (const b of w.shots) w.path.push({ x: b.x, y: b.y }); },
        },
        {
          id: "slow", name: { en: "Bullet Time", ko: "총알 시점 슬로우" }, param: "0.3× in flight",
          cap: { en: "*Slow time* while it flies. Let them watch the arc.", ko: "날아가는 동안 *느리게*. 궤적을 감상해요." },
          fire(w, m, b, t) { w.slowmo(0.3, t * 0.9); },
        },
        {
          id: "impact", name: { en: "Range Tag", ko: "거리 표시" }, param: "dust + \"400m\"",
          cap: { en: "On impact, puff dust and *stamp the distance*.", ko: "맞으면 먼지와 함께 *거리*를 찍어요." },
          hit(w, h) {
            sparks(w, h.x, h.y, 10, "255,220,160", [150, 420]);
            w.spawn({ type: "text", text: "400m", x: h.x - 20, y: h.y - 70, vy: -40, life: 1.2, size: 24, color: "#c6f432" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack … thump",
          cap: { en: "*Crack*… a long beat… *thump*. Distance you can hear.", ko: "*탕*… 한참 뒤… *퍽*. 거리가 들려요." },
          fire(w) { w.sfx.shotgun(); },
          hit(w) { w.sfx.thud(); },
        },
      ],
    },

    /* 27 ─ 킬 피드 */
    {
      id: "shooter-killfeed", cat: "shooter", view: "3d",
      title: { en: "Build a *readable* kill feed", ko: "한눈에 읽히는 *킬 피드*" },
      intro: { en: "A wall of grey text. *Who* did what?", ko: "회색 글자 덩어리. *누가* 뭘 했죠?" },
      interval: 0.9, stepDur: 4.2,
      drawFloor: fpsRoom,
      setup(w) {
        fpsSetup(w, [[-1.6, 7], [0.1, 6], [1.9, 8]]);
        w.feed = []; w.k = 0; w.style = { slide: false, you: false, icons: false, flash: false };
      },
      fire(w) {
        const g = w.gobs.find(q => q.alive); if (!g) return;
        w.fp.kick = 0.05; w.fp.rot = 0.04;
        g.flash = 1; w.kill(g);
        const head = w.k++ % 2 === 0;
        const add = e => { w.feed.push(e); w.feed = w.feed.slice(-5); w.emit("add", e); };
        add({ a: "YOU", b: "Goblin_0" + (2 + w.k % 7), you: true, head, t: 0, y: -1 });
        if (w.k % 2) w.after(0.35, () => add({ a: pick(["Mira", "Kai", "Juno"]), b: "Goblin_1" + w.k % 9, you: false, head: false, t: 0, y: -1 }));
      },
      update(w, dt) {
        fpsTick(w, dt);
        for (const e of w.feed) e.t += dt;
        w.feed.forEach((e, i) => { const ty = 50 + i * 26; e.y = e.y < 0 || !w.ease ? ty : e.y + (ty - e.y) * Math.min(1, dt * 12); });
        w.ease = false; w.style = { slide: false, you: false, icons: false, flash: false };
      },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx);
        ctx.font = "800 13px 'JetBrains Mono', monospace"; ctx.textBaseline = "middle";
        for (const e of w.feed) {
          const st = w.style, slide = st.slide ? (1 - E.out(Math.min(1, e.t / 0.25))) * 220 : 0;
          const a = e.fade == null ? 1 : e.fade;
          const wa = ctx.measureText(e.a).width, wb = ctx.measureText(e.b).width, gap = st.icons ? 44 + (e.head ? 18 : 0) : 22;
          const W = wa + wb + gap + 16, x1 = 516 + slide, x0 = x1 - W, y = e.y;
          ctx.globalAlpha = a;
          if (st.you && e.you) rr(ctx, x0, y - 11, W, 22, 4, "rgba(198,244,50,0.22)");
          else if (st.you) rr(ctx, x0, y - 11, W, 22, 4, "rgba(8,9,14,0.6)");
          if (st.flash && e.t < 0.15) rr(ctx, x0, y - 11, W, 22, 4, "rgba(255,255,255,0.85)");
          if (st.you && e.you) { ctx.fillStyle = "#c6f432"; ctx.fillRect(x0, y - 11, 3, 22); }
          ctx.textAlign = "left";
          ctx.fillStyle = st.you ? (e.you ? "#c6f432" : "#7dd3fc") : "#9ca3af"; ctx.fillText(e.a, x0 + 8, y);
          ctx.fillStyle = st.you ? "#fca5a5" : "#9ca3af"; ctx.fillText(e.b, x1 - 8 - wb, y);
          const ix = x0 + 8 + wa + 8;
          if (st.icons) {
            ctx.fillStyle = "#e5e7eb"; ctx.fillRect(ix, y - 3, 22, 5); ctx.fillRect(ix + 3, y + 1, 5, 6); ctx.fillRect(ix + 20, y - 5, 3, 3);
            if (e.head) { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(ix + 36, y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = "#111"; ctx.fillRect(ix + 33, y - 2, 2, 2); ctx.fillRect(ix + 37, y - 2, 2, 2); }
          } else { ctx.fillStyle = "#9ca3af"; ctx.fillText(">", ix, y); }
          ctx.globalAlpha = 1;
        }
      },
      steps: [
        {
          id: "you", name: { en: "Highlight You", ko: "내 처치 강조" }, param: "lime row",
          cap: { en: "*Your* kills glow lime. Find yourself instantly.", ko: "*내* 처치는 연두색. 바로 찾아요." },
          update(w) { w.style.you = true; },
        },
        {
          id: "icons", name: { en: "Weapon Icons", ko: "무기 아이콘" }, param: "gun + head icon",
          cap: { en: "Icons, not words. A *gold head* means headshot.", ko: "글자 말고 아이콘. *금색 머리*는 헤드샷." },
          update(w) { w.style.icons = true; },
        },
        {
          id: "slide", name: { en: "Slide In", ko: "밀려 들어오기" }, param: "220px · 0.25s",
          cap: { en: "New lines *slide in* from the edge.", ko: "새 줄은 가장자리에서 *쓱* 들어와요." },
          update(w) { w.style.slide = true; },
        },
        {
          id: "flash", name: { en: "Entry Flash", ko: "들어올 때 번쩍" }, param: "white 150ms",
          cap: { en: "Flash *white* for a moment. The eye jumps to it.", ko: "잠깐 *하얗게* 번쩍. 눈이 바로 가요." },
          update(w) { w.style.flash = true; },
        },
        {
          id: "fade", name: { en: "Fade & Collapse", ko: "사라지며 당겨짐" }, param: "life 3s · max 4",
          cap: { en: "Old lines *fade out*, the rest *slide up*.", ko: "오래된 줄은 *사라지고*, 나머지는 *스르르* 올라가요." },
          update(w) {
            w.ease = true;
            for (const e of w.feed) e.fade = Math.max(0, Math.min(1, (3 - e.t) * 3));
            w.feed = w.feed.filter(e => e.fade > 0).slice(-4);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick for yours only",
          cap: { en: "Only *your* kills make a *tick*.", ko: "*내* 처치만 *틱* 소리가 나요." },
          add(w, e) { if (e.you) w.sfx.blip(5); },
        },
      ],
    },

    /* 28 ─ 연속 처치 알림 */
    {
      id: "shooter-multikill", cat: "shooter", view: "3d",
      title: { en: "Celebrate the *multi-kill*", ko: "*연속 처치*를 축하하기" },
      intro: { en: "Three kills in a second. *Not a word.*", ko: "1초에 셋. *아무 말도* 없어요." },
      interval: 2.4, stepDur: 4.2,
      drawFloor: fpsRoom,
      setup(w) {
        fpsSetup(w, [[-1.3, 6.5], [0, 6], [1.3, 6.5]]);
        w.mk = 0; w.mkT = 0; w.anT = 0; w.medals = 0; w.win = 0; w.showWin = false;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true; w.mk = 0;
        w.gobs.forEach((g, i) => w.after(i * 0.24, () => {
          w.fp.kick = 0.05; w.fp.rot = 0.04;
          g.flash = 1; w.kill(g); w.mk++; w.win = 1;
          w.emit("multi", w.mk, torso(g));
          if (i === 2) w.after(0.5, () => { w.busy = false; });
        }));
      },
      update(w, dt) { fpsTick(w, dt); w.anT = Math.max(0, w.anT - dt / 1.4); w.win = Math.max(0, w.win - dt / 1.2); w.showWin = false; },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx);
        if (w.anT > 0 && w.mk >= 2) {
          const age = 1.4 * (1 - w.anT), sc = age < 0.12 ? 2.2 - age / 0.12 * 1.2 : 1;
          ctx.save(); ctx.translate(270, 92); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, w.anT * 4);
          const t = w.mk >= 3 ? "TRIPLE KILL" : "DOUBLE KILL";
          ctx.font = "900 34px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineWidth = 7; ctx.strokeStyle = "rgba(10,10,14,0.9)"; ctx.strokeText(t, 0, 0);
          ctx.fillStyle = w.mk >= 3 ? "#fbbf24" : "#fff"; ctx.fillText(t, 0, 0);
          ctx.restore(); ctx.globalAlpha = 1;
        }
        for (let i = 0; i < w.medals; i++) {
          const x = 270 + (i - (w.medals - 1) / 2) * 34, y = 132;
          ctx.fillStyle = i === 2 ? "#fbbf24" : "#e5e7eb"; ctx.beginPath();
          for (let k = 0; k < 6; k++) { const a = k / 6 * TAU - Math.PI / 2; ctx[k ? "lineTo" : "moveTo"](x + Math.cos(a) * 13, y + Math.sin(a) * 13); }
          ctx.closePath(); ctx.fill(); ctx.fillStyle = "#111"; ctx.font = "900 12px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(i + 1), x, y + 1);
        }
        if (w.showWin && w.win > 0) { rr(ctx, 200, 152, 140, 6, 3, "rgba(255,255,255,0.15)"); rr(ctx, 200, 152, 140 * w.win, 6, 3, "#c6f432"); }
      },
      steps: [
        {
          id: "text", name: { en: "Announcer Text", ko: "알림 문구" }, param: "slam 2.2× → 1×",
          cap: { en: "*DOUBLE KILL* slams in. The third turns it *gold*.", ko: "*DOUBLE KILL*이 쾅. 세 번째엔 *금색*." },
          multi(w, n) { if (n >= 2) w.anT = 1; },
        },
        {
          id: "medal", name: { en: "Medals Stack", ko: "메달 쌓기" }, param: "1 hex per kill",
          cap: { en: "A *medal* per kill. You count them at a glance.", ko: "처치마다 *메달* 하나. 한눈에 세어져요." },
          multi(w, n) { w.medals = n; if (n === 1) w.after(1.6, () => { if (!w.busy) w.medals = 0; }); },
        },
        {
          id: "flash", name: { en: "Rising Punch", ko: "점점 센 펀치" }, param: "flash + zoom × n",
          cap: { en: "Each kill hits *harder* than the last.", ko: "처치할수록 화면이 *더 세게* 쳐요." },
          multi(w, n) { w.flash("255,255,255", 0.12 * n); w.zoomPunch(0.025 * n); w.shake(0.1 * n); },
        },
        {
          id: "timer", name: { en: "Combo Window", ko: "연속 처치 시간" }, param: "1.2s bar",
          cap: { en: "A *timer bar* shows how long you have for the next.", ko: "*시간 막대*가 다음 처치까지 남은 시간을 보여요." },
          update(w) { w.showWin = true; },
        },
        {
          id: "slow", name: { en: "Slow-mo Finish", ko: "마무리 슬로우" }, param: "0.35× on 3rd",
          cap: { en: "On the third, *slow time* for a beat.", ko: "세 번째엔 *잠깐 느리게*." },
          multi(w, n) { if (n === 3) w.slowmo(0.35, 0.6); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "chimes climb",
          cap: { en: "Chimes *climb* with each kill. Triple gets a *fanfare*.", ko: "처치마다 음이 *올라가고*, 셋이면 *빰빠밤*." },
          multi(w, n) { w.sfx.gun(); w.sfx.chime(n * 4); if (n === 3) w.sfx.fanfare(); },
        },
      ],
    },
  );
  RECIPES.push(
    /* 29 ─ 3인칭 엄폐물 피탄 */
    {
      id: "shooter-cover-hits", cat: "shooter", view: "side",
      title: { en: "Make cover *take the hits*", ko: "엄폐물이 *맞아 주게*" },
      intro: { en: "Bullets hit the wall. *Are you even safe?*", ko: "벽에 총알이 박혀요. *안전한 거 맞죠?*" },
      interval: 1.0, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 160, h: 124 });
        w.foe = w.actor("foe", { home: 455 }); w.foe.maxHp = 0;
        w.cols = Array(9).fill(0); w.holes = [];
      },
      fire(w) {
        for (let i = 0; i < 5; i++) w.after(i * 0.1, () => {
          const f = w.foe, m = { x: f.x + f.ox - 62, y: G - 64 }, ty = rand(G - 76, G - 12), sp = 1500;
          f.ox += 4; w.spawn({ type: "glow", x: m.x, y: m.y, size: 26, size1: 6, life: 0.06, color: "255,210,120" });
          const t = (m.x - 232) / sp, b = { x: m.x, y: m.y, vx: -sp, vy: (ty - m.y) / t, r: 2.5, color: "#cbd5e1" };
          b.test = p => p.x <= 232;
          b.onHit = p => { if (w.cols.reduce((a, c) => a + c, 0) > 120) { w.cols.fill(0); w.holes = []; } w.emit("hit", { x: 230, y: p.y }); };
          w.emit("shot", b);
          w.shoot(b);
        });
      },
      drawFront(w, ctx) {
        const x0 = 170, x1 = 222, top = G - 74, dx = 14, dy = 8, cw = (x1 - x0) / w.cols.length;
        ctx.fillStyle = "#8b8f98"; ctx.beginPath(); ctx.moveTo(x1, top + w.cols[8]); ctx.lineTo(x1 + dx, top - dy + w.cols[8]); ctx.lineTo(x1 + dx, G - dy); ctx.lineTo(x1, G); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#b9bdc6"; ctx.beginPath(); ctx.moveTo(x0, top + w.cols[0]); ctx.lineTo(x0 + dx, top - dy + w.cols[0]);
        w.cols.forEach((c, i) => { ctx.lineTo(x0 + dx + (i + 1) * cw, top - dy + c); });
        ctx.lineTo(x1, top + w.cols[8]); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#a3a8b2"; ctx.beginPath(); ctx.moveTo(x0, G);
        w.cols.forEach((c, i) => { ctx.lineTo(x0 + i * cw, top + c); ctx.lineTo(x0 + (i + 1) * cw, top + c); });
        ctx.lineTo(x1, G); ctx.closePath(); ctx.fill();
        for (const h of w.holes) { ctx.fillStyle = "rgba(30,30,36,0.9)"; ctx.beginPath(); ctx.ellipse(h.x, h.y, 3, 4.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(230,230,235,0.5)"; ctx.lineWidth = 1; ctx.stroke(); }
        const f = w.foe; ctx.fillStyle = "#2a2f3a"; ctx.fillRect(f.x + f.ox - 64, G - 68, 30, 8);
      },
      steps: [
        {
          id: "tracer", name: { en: "Incoming Tracers", ko: "날아오는 궤적" }, param: "len 60px",
          cap: { en: "Make incoming fire *visible*. Streaks, not dots.", ko: "날아오는 총알이 *보이게*. 점 말고 줄기로." },
          shot(w, b) { b.len = 60; b.lw = 3; },
        },
        {
          id: "puff", name: { en: "Concrete Puff", ko: "콘크리트 먼지" }, param: "dust + 5 chips",
          cap: { en: "Every hit kicks out *dust and chips*.", ko: "맞을 때마다 *먼지와 조각*이 튀어요." },
          hit(w, h) {
            for (let i = 0; i < 4; i++) w.spawn({ type: "smoke", x: h.x, y: h.y, vx: rand(40, 200), vy: rand(-90, 10), drag: 3, size: 5, size1: 18, life: 0.6, color: "200,200,205" });
            for (let i = 0; i < 5; i++) w.spawn({ type: "chunk", x: h.x, y: h.y, vx: rand(60, 280), vy: rand(-300, -60), g: 1400, vr: rand(-15, 15), life: 0.8, size: rand(2, 4), color: "170,174,182", ground: true, bounce: 0.3 });
          },
        },
        {
          id: "holes", name: { en: "Bullet Holes", ko: "총알 자국" }, param: "stay · max 20",
          cap: { en: "Holes *stay*. The wall shows how close it was.", ko: "자국이 *남아요*. 얼마나 위험했는지 보여요." },
          hit(w, h) { w.holes.push({ x: h.x + rand(-1, 5), y: h.y }); if (w.holes.length > 20) w.holes.shift(); },
        },
        {
          id: "erode", name: { en: "Cover Erodes", ko: "엄폐물이 깎임" }, param: "top chips −6px",
          cap: { en: "High hits *bite chunks* off the top. Cover won't last.", ko: "높은 탄은 윗부분을 *뜯어내요*. 오래 못 버텨요." },
          hit(w, h) {
            if (h.y > G - 52) return;
            const i = 8 - Math.floor(rand(0, 4)); w.cols[i] = Math.min(30, w.cols[i] + rand(4, 8));
            w.spawn({ type: "chunk", x: 210, y: G - 74 + w.cols[i], vx: rand(-40, 120), vy: rand(-260, -120), g: 1400, vr: 10, life: 1, size: 6, color: "185,189,198", ground: true, bounce: 0.3 });
          },
        },
        {
          id: "flinch", name: { en: "Duck & Shake", ko: "몸 숙이기 + 흔들림" }, param: "squash .85 · trauma .1",
          cap: { en: "The hero *ducks* and the camera *jolts* on each hit.", ko: "맞을 때마다 주인공이 *움츠리고* 화면이 *덜컹*." },
          hit(w) { const c = w.hero; c.sy = 0.86; c.sx = 1.08; c.ox -= 3; w.shake(0.1, -1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack + thunk",
          cap: { en: "Far *crack*, close *thunk*. Two distances.", ko: "멀리서 *탕*, 가까이서 *퍽*. 거리감이 둘." },
          shot(w) { w.sfx.smg(0.8); },
          hit(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 30 ─ 탄약 숫자 흔들기 */
    {
      id: "shooter-ammo-shake", cat: "shooter", view: "3d",
      title: { en: "Make the ammo counter *react*", ko: "탄약 숫자가 *반응하게*" },
      intro: { en: "12, 11, 10… The counter just *sits there*.", ko: "12, 11, 10… 숫자가 *가만히* 있어요." },
      interval: 0.28, stepDur: 3.8,
      drawFloor: fpsRoom,
      setup(w) { fpsSetup(w, [[0.2, 8]]); w.ammo = 12; w.pun = 0; w.jit = 0; w.roll = 1; w.prev = 12; w.icons = false; w.lowOn = false; },
      fire(w) {
        if (w.ammo <= 0) return;
        w.prev = w.ammo; w.ammo--; w.roll = 0;
        w.fp.kick = 0.045; w.fp.rot = 0.035;
        w.emit("shot", w.ammo);
        if (w.ammo === 0) w.after(0.5, () => { w.prev = 0; w.ammo = 12; w.roll = 0; });
      },
      update(w, dt) {
        fpsTick(w, dt);
        w.pun = Math.max(0, w.pun - dt * 6); w.jit = Math.max(0, w.jit - dt * 5);
        w.roll = w.on("roll") ? Math.min(1, w.roll + dt * 9) : 1;
        w.icons = false; w.lowOn = false;
      },
      drawFront(w, ctx) { drawFpGun(w, ctx); },
      drawHud(w, ctx) {
        xhair(ctx);
        const low = w.lowOn && w.ammo <= 4, cx = 466 + (w.jit ? rand(-5, 5) * w.jit : 0), cy = 300 + (w.jit ? rand(-3, 3) * w.jit : 0);
        rr(ctx, 412, 280, 102, 42, 8, low ? "rgba(127,29,29,0.8)" : "rgba(8,9,14,0.72)");
        ctx.save(); ctx.beginPath(); ctx.rect(412, 280, 102, 42); ctx.clip();
        const sc = 1 + w.pun * 0.45 + (low ? 0.08 * Math.max(0, Math.sin(w.time * 12)) : 0), col = low ? "#fca5a5" : "#fff";
        ctx.translate(cx, cy); ctx.scale(sc, sc);
        if (w.roll < 1) { ctx.globalAlpha = 1 - w.roll; hudNum(ctx, String(w.prev), 0, w.roll * 26, 26, col); ctx.globalAlpha = w.roll; hudNum(ctx, String(w.ammo), 0, (w.roll - 1) * 26, 26, col); ctx.globalAlpha = 1; }
        else hudNum(ctx, String(w.ammo), 0, 0, 26, col);
        ctx.restore();
        hudNum(ctx, "/48", 508, 306, 12, "rgba(255,255,255,0.55)");
        if (w.icons) for (let i = 0; i < 12; i++) rr(ctx, 418 + i * 8, 262, 5, 12, 2, i < w.ammo ? (low ? "#f87171" : "#facc15") : "rgba(255,255,255,0.15)");
      },
      steps: [
        {
          id: "punch", name: { en: "Scale Punch", ko: "숫자 펀치" }, param: "+45% → 1×",
          cap: { en: "The number *punches* bigger on every shot.", ko: "쏠 때마다 숫자가 *팡* 커져요." },
          shot(w) { w.pun = 1; },
        },
        {
          id: "shake", name: { en: "Jitter", ko: "떨림" }, param: "±5px · 0.2s",
          cap: { en: "A tiny *jitter*. The HUD feels the recoil too.", ko: "살짝 *떨려요*. 화면 글자도 반동을 느껴요." },
          shot(w) { w.jit = 1; },
        },
        {
          id: "roll", name: { en: "Digit Roll", ko: "숫자 굴림" }, param: "slide 26px",
          cap: { en: "Old number *slides out*, new one *drops in*.", ko: "이전 숫자는 *빠지고*, 새 숫자가 *내려와요*." },
          shot(w) { w.roll = 0; },
        },
        {
          id: "icons", name: { en: "Round Icons", ko: "총알 아이콘" }, param: "12 pips · flick off",
          cap: { en: "Show each *round*. The spent one *flicks away*.", ko: "*한 발씩* 보여 줘요. 쏜 건 *톡* 튕겨 나가요." },
          update(w) { w.icons = true; },
          shot(w, n) { w.spawn({ type: "shell", x: 420 + n * 8, y: 268, vx: rand(40, 120), vy: -260, g: 1200, vr: 12, life: 0.6, size: 9, color: "250,204,21" }); },
        },
        {
          id: "low", name: { en: "Low Ammo", ko: "탄 부족" }, param: "≤ 4 · red pulse",
          cap: { en: "Under *4*, everything turns *red* and pulses.", ko: "*4발* 아래면 전부 *빨갛게* 두근거려요." },
          update(w) { w.lowOn = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch up when low",
          cap: { en: "The shot's tail gets *higher* as you run dry.", ko: "탄이 줄수록 끝소리가 *높아져요*." },
          shot(w, n) { w.sfx.smg(1); w.sfx.blip(13 - n); },
        },
      ],
    },

    /* 31 ─ 조준 보정 */
    {
      id: "shooter-aim-assist", cat: "shooter", view: "3d",
      title: { en: "Hide the *aim assist*", ko: "*조준 보정*을 티 안 나게" },
      intro: { en: "Swipe past a target. *Miss*, every time.", ko: "적을 스쳐 지나가요. 매번 *빗나가요*." },
      interval: 1.7, stepDur: 4.2,
      drawFloor: fpsRoom,
      setup(w) {
        fpsSetup(w, [[-0.2, 6.5]]);
        w.aim = { x: 150, y: 190, vx: 0, on: false, t: 0 }; w.lock = 0; w.brk = 0; w.red = false;
      },
      fire(w) {
        const A = w.aim; A.x = 140; A.y = 196; A.vx = 300; A.t = 0; A.on = true; w.lock = 0;
      },
      update(w, dt) {
        fpsTick(w, dt);
        const A = w.aim, g = w.gobs[0], t = torso(g);
        A.near = g.alive && Math.hypot(A.x - t.x, A.y - t.y) < 70; A.inBox = g.alive && Math.abs(A.x - t.x) < g.w * 0.35;
        A.spd = 1; A.pull = 0;
        w.emit("assist", A, t);
        if (A.on) {
          A.t += dt; A.x += A.vx * A.spd * dt;
          if (A.pull) { A.x += (t.x - A.x) * Math.min(1, dt * A.pull); A.y += (t.y - A.y) * Math.min(1, dt * A.pull); }
          if (A.inBox && !w.lock) { w.lock = 1; w.emit("lock", t); }
          if (A.t >= 0.95) {
            A.on = false;
            const hit = g.alive && Math.abs(A.x - t.x) < g.w * 0.35 && Math.abs(A.y - t.y) < g.h * 0.4;
            w.fp.kick = 0.05; w.fp.rot = 0.04;
            w.emit("shot", hit);
            if (hit) { g.flash = 1.4; w.kill(g); } else dust(w, A.x, A.y + 30, 3);
          }
        }
        w.brk = Math.max(0, w.brk - dt * 2); w.red = false;
      },
      drawFront(w, ctx) {
        drawFpGun(w, ctx);
        const g = w.gobs[0];
        if (w.brk > 0 && g.alive) {
          const x0 = g.x + g.ox - g.w * 0.4, x1 = g.x + g.ox + g.w * 0.4, y0 = g.gy - g.h, y1 = g.gy, k = 8 + (1 - Math.min(1, w.brk * 2)) * 0;
          ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x0 + k, y0); ctx.lineTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x0 + k, y1); ctx.moveTo(x1 - k, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1 - k, y1); ctx.stroke();
        }
      },
      drawHud(w, ctx) { xhair(ctx, 6, w.red ? "#ef4444" : "rgba(255,255,255,0.9)", 8, w.aim.x, w.aim.y); },
      steps: [
        {
          id: "friction", name: { en: "Friction", ko: "마찰" }, param: "speed ×0.3 on target",
          cap: { en: "The aim *slows down* over a target. Easier to stop.", ko: "적 위에선 조준이 *느려져요*. 멈추기 쉬워요." },
          assist(w, A) { if (A.inBox) A.spd = 0.3; },
        },
        {
          id: "magnet", name: { en: "Magnetism", ko: "자석" }, param: "pull 6/s within 70px",
          cap: { en: "Near a target, the aim is *gently pulled in*.", ko: "적 근처에선 조준이 *살짝 끌려가요*." },
          assist(w, A) { if (A.near) A.pull = 6; },
        },
        {
          id: "red", name: { en: "Red Crosshair", ko: "빨간 조준선" }, param: "on target",
          cap: { en: "Crosshair turns *red* on target. Pull the trigger *now*.", ko: "적 위면 조준선이 *빨갛게*. *지금* 쏴요." },
          assist(w, A) { if (A.inBox) w.red = true; },
        },
        {
          id: "bracket", name: { en: "Lock Brackets", ko: "고정 괄호" }, param: "[ ] 0.5s",
          cap: { en: "*Brackets* snap around the target.", ko: "적 둘레에 *괄호*가 착." },
          lock(w) { w.brk = 1; },
        },
        {
          id: "ping", name: { en: "Lock Ring", ko: "고정 고리" }, param: "ring 60 → 10px",
          cap: { en: "A ring *shrinks* onto it. Locked.", ko: "고리가 *조여 들어와요*. 고정 완료." },
          lock(w, t) { w.spawn({ type: "ring", x: t.x, y: t.y, size: 60, size1: 10, life: 0.25, w: 4, color: "248,113,113" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft beep · shot",
          cap: { en: "A soft *beep* on lock, then the shot.", ko: "고정되면 작게 *삑*, 그리고 탕." },
          lock(w) { w.play(() => tn({ type: "triangle", f: 1760, dur: 0.06, vol: 0.12 })); },
          shot(w, hit) { w.sfx.gun(); if (hit) w.sfx.hit(); },
        },
      ],
    },

    /* 32 ─ 모아 쏘기 */
    {
      id: "shooter-charge-shot", cat: "shooter", view: "side",
      title: { en: "Make a charge shot *build up*", ko: "모아 쏘기를 *쌓이게*" },
      intro: { en: "Hold… hold… *pew*. Was it charged?", ko: "꾹… 꾹… *퓽*. 모인 거 맞아요?" },
      interval: 2.0, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero"); w.foe = w.actor("foe", { home: 440 }); w.foe.maxHp = 0;
        w.gun = { kick: 0, rot: 0 }; w.ch = -1; w.tier = 0; w.big = false;
      },
      fire(w) {
        if (w.ch >= 0 || w.busy) return;
        w.busy = true; w.ch = 0; w.tier = 0;
      },
      update(w, dt) {
        gunSpring(w, dt); w.orb = false;
        if (w.ch >= 0) {
          w.ch = Math.min(1, w.ch + dt / 0.8);
          const tier = w.ch >= 1 ? 3 : w.ch >= 0.66 ? 2 : w.ch >= 0.33 ? 1 : 0;
          if (tier > w.tier) { w.tier = tier; w.emit("tier", tier, muzzle(w)); }
          w.emit("charging", muzzle(w), w.ch, dt);
          if (w.ch >= 1 && !w.relQ) { w.relQ = true; w.after(0.15, () => { w.relQ = false; release(w); }); }
        }
      },
      drawFront(w, ctx) {
        drawGun(w, ctx);
        if (w.ch >= 0 && w.orb) { const m = muzzle(w), c = TIER[w.tier]; ctx.globalCompositeOperation = "lighter"; glow(ctx, m.x + 8, m.y, 10 + w.ch * 34, c, 0.9); glow(ctx, m.x + 8, m.y, 5 + w.ch * 10, "255,255,255", 0.9); ctx.globalCompositeOperation = "source-over"; }
      },
      steps: [
        {
          id: "orb", name: { en: "Growing Orb", ko: "커지는 구슬" }, param: "r 10 → 44px",
          cap: { en: "A ball of light *grows* at the barrel.", ko: "총구에 빛 구슬이 *점점 커져요*." },
          charging(w) { w.orb = true; },
        },
        {
          id: "suck", name: { en: "Pull In", ko: "빨아들이기" }, param: "seek particles",
          cap: { en: "Particles get *sucked in*. Energy is gathering.", ko: "입자가 *빨려 들어와요*. 힘이 모여요." },
          charging(w, m, k, dt) { if (Math.random() < dt * (20 + k * 50)) { const a = rand(0, TAU), d = rand(50, 90); w.spawn({ type: "spark", seek: true, x: m.x + 8 + Math.cos(a) * d, y: m.y + Math.sin(a) * d, tx: m.x + 8, ty: m.y, life: 0.25, size: 2.2, color: TIER[w.tier] }); } },
        },
        {
          id: "tiers", name: { en: "Color Tiers", ko: "단계별 색" }, param: "lime → cyan → MAX",
          cap: { en: "Clear *tiers*: color steps and a *MAX* flash.", ko: "또렷한 *단계*: 색이 바뀌고, 끝엔 *MAX* 번쩍." },
          tier(w, t, m) {
            w.spawn({ type: "ring", x: m.x + 8, y: m.y, size: 10, size1: 60, life: 0.25, w: 5, color: TIER[t] });
            if (t === 3) { w.spawn({ type: "text", text: "MAX", x: m.x + 8, y: m.y - 48, vy: -30, life: 0.6, size: 22, color: "#f9a8d4" }); w.hero.flash = 0.8; }
          },
        },
        {
          id: "tremble", name: { en: "Tremble", ko: "떨림" }, param: "vib × charge",
          cap: { en: "The hero *trembles* harder as it fills.", ko: "모일수록 주인공이 *더 떨려요*." },
          charging(w, m, k) { w.hero.vib = 1 + k * 3; w.trauma = Math.max(w.trauma, k * 0.12); },
        },
        {
          id: "blast", name: { en: "Big Release", ko: "크게 터뜨리기" }, param: "size × charge · kick",
          cap: { en: "Release *big*: huge shot, recoil, shake.", ko: "*크게* 터뜨려요. 큰 탄, 반동, 흔들림." },
          release(w, b) { b.big = true; w.hero.ox -= 26; w.gun.kick = 24; w.gun.rot = -0.4; w.shake(0.35, -1); },
          hit(w, h) { w.shake(0.5, 1); w.foe.ox += 40; w.foe.flash = 1.5; w.spawn({ type: "ring", x: h.x, y: h.y, size: 16, size1: 130, life: 0.4, w: 12, color: TIER[3] }); sparks(w, h.x, h.y, 24, "255,220,240", [200, 700]); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising hum + boom",
          cap: { en: "A *rising whine*, then a fat *boom*.", ko: "*올라가는 위잉*, 그리고 묵직한 *쾅*." },
          tier(w, t) { w.sfx.chime(t * 4); if (t === 1) w.sfx.charge(); },
          release(w) { w.sfx.burst(); },
          hit(w) { w.sfx.boom(); },
        },
      ],
    },
  );
  RECIPES.push(
    /* 33 ─ 관통탄 */
    {
      id: "shooter-pierce", cat: "shooter", view: "side",
      title: { en: "Make piercing shots *feel* it", ko: "관통탄이 *꿰뚫는 맛*" },
      intro: { en: "Four in a row. The bolt *ghosts through*.", ko: "일렬로 넷. 탄이 *유령처럼* 통과해요." },
      interval: 1.4, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 90 }); w.gun = { kick: 0, rot: 0 };
        w.foes = [250, 325, 400, 475].map(x => { const f = w.actor("foe", { home: x, h: 104 }); f.maxHp = 0; return f; });
        w.bolt = null; w.rail = null;
      },
      fire(w) {
        if (w.bolt) return;
        const m = muzzle(w);
        w.gun.kick = 10; w.gun.rot = -0.12;
        w.bolt = { x: m.x, y: m.y, x0: m.x, n: 0, next: 0 };
        w.emit("fire", m);
      },
      update(w, dt) {
        gunSpring(w, dt);
        const b = w.bolt;
        if (b) {
          b.x += 950 * dt;
          const f = w.foes[b.next];
          if (f && b.x >= f.x - 20) { b.next++; b.n++; f.ox += 10; w.emit("pierce", f, { x: f.x - 20, y: b.y }, b.n); }
          if (b.x > 600) { w.emit("done", b); w.bolt = null; }
        }
        if (w.rail) w.rail.a -= dt * 1.6;
      },
      drawFront(w, ctx) {
        drawGun(w, ctx);
        const r = w.rail;
        if (r && r.a > 0) { ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(125,211,252,${r.a})`; ctx.lineWidth = 3 + r.a * 6; ctx.beginPath(); ctx.moveTo(r.x0, r.y); ctx.lineTo(r.x1, r.y); ctx.stroke(); ctx.globalCompositeOperation = "source-over"; }
        const b = w.bolt;
        if (b) {
          ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
          const g = ctx.createLinearGradient(b.x - 90, 0, b.x, 0); g.addColorStop(0, "rgba(125,211,252,0)"); g.addColorStop(1, "rgba(224,242,254,1)");
          ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(b.x - 90, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          glow(ctx, b.x, b.y, 16, "125,211,252", 0.9); ctx.globalCompositeOperation = "source-over";
        }
      },
      steps: [
        {
          id: "react", name: { en: "Each One Reacts", ko: "하나하나 반응" }, param: "flash + jerk",
          cap: { en: "Every body it passes *flashes and jerks*.", ko: "지나간 적마다 *번쩍*하고 *움찔*." },
          pierce(w, f) { f.flash = 1.2; f.ox += 14; f.sx = 0.82; f.sy = 1.14; },
        },
        {
          id: "stop", name: { en: "Stutter Stops", ko: "끊어치는 멈칫" }, param: "35ms × each",
          cap: { en: "A *micro-freeze* per body. Tk-tk-tk-tk.", ko: "적마다 *아주 짧게 멈칫*. 탁-탁-탁-탁." },
          pierce(w) { w.hitstop(0.035); },
        },
        {
          id: "exit", name: { en: "Exit Spray", ko: "뚫고 나가는 파편" }, param: "spray out the back",
          cap: { en: "Spray out *the back side*. It went *through*.", ko: "*뒤쪽*으로 파편이 튀어요. *뚫고* 나갔어요." },
          pierce(w, f, h) { sparks(w, h.x + 40, h.y, 9, "190,242,100", [200, 520], -0.5, 0.5); },
        },
        {
          id: "count", name: { en: "Pierce Count", ko: "관통 숫자" }, param: "×1 … ×4 grows",
          cap: { en: "Count it: *×1, ×2, ×3, ×4*, each bigger.", ko: "세어 줘요. *×1, ×2, ×3, ×4*, 점점 크게." },
          pierce(w, f, h, n) { w.spawn({ type: "text", text: "×" + n, x: h.x + 20, y: G - 128, vy: -60, life: 0.8, size: 16 + n * 6, color: n >= 4 ? "#fde047" : "#fff" }); },
        },
        {
          id: "rail", name: { en: "Rail Line", ko: "관통 궤적선" }, param: "line fades 0.6s",
          cap: { en: "Leave a *rail line* through all of them.", ko: "모두를 꿰는 *한 줄*을 남겨요." },
          done(w, b) { w.rail = { x0: b.x0, x1: 560, y: b.y, a: 1 }; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "+3 semitones each",
          cap: { en: "Each pierce plays *higher*. Ta-ti-ti-*TING*.", ko: "꿰뚫을 때마다 음이 *높아져요*. 따-띠-띠-*띵*." },
          fire(w) { w.sfx.magic(); },
          pierce(w, f, h, n) { w.sfx.blip(n * 3); w.sfx.hit(1 + n * 0.15); },
        },
      ],
    },

    /* 34 ─ 방어막 */
    {
      id: "shooter-shield", cat: "shooter", view: "side",
      title: { en: "Make a shield *soak* bullets", ko: "방어막이 총알을 *받아 내게*" },
      intro: { en: "Bullets vanish at the line. *Is it working?*", ko: "선에서 총알이 사라져요. *막는 거 맞죠?*" },
      interval: 1.0, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 455 }); w.foe.maxHp = 0;
        w.sh = { hp: 100, flare: 0, broken: false, rips: [], col: "125,211,252", bar: false };
      },
      fire(w) {
        for (let i = 0; i < 4; i++) w.after(i * 0.12, () => {
          const f = w.foe, m = { x: f.x + f.ox - 62, y: G - 64 }, ty = rand(G - 120, G - 30);
          f.ox += 4; w.spawn({ type: "glow", x: m.x, y: m.y, size: 24, size1: 6, life: 0.06, color: "255,210,120" });
          const sp = 1100, t = (m.x - 200) / sp, b = { x: m.x, y: m.y, vx: -sp, vy: (ty - m.y) / t, r: 3, color: "#fde68a", len: 30, lw: 3 };
          const S = { x: 110, y: G - 70, r: 92 };
          b.test = p => !w.sh.broken && Math.hypot(p.x - S.x, (p.y - S.y) * 1.1) <= S.r;
          b.onHit = p => { const sh = w.sh; sh.hp = Math.max(0, sh.hp - 7); w.emit("block", { x: p.x, y: p.y, a: Math.atan2(p.y - S.y, p.x - S.x) }); if (sh.hp <= 0) w.emit("empty"); };
          w.shoot(b);
        });
      },
      update(w, dt) {
        const sh = w.sh; sh.flare = Math.max(0, sh.flare - dt * 3); sh.bar = false;
        for (const r of sh.rips) r.t += dt;
        sh.rips = sh.rips.filter(r => r.t < 0.5);
        if (sh.hp <= 0 && !w.on("break")) sh.hp = 100;
      },
      drawFront(w, ctx) {
        const sh = w.sh; if (sh.broken) return;
        const S = { x: 110, y: G - 70, r: 92 }, a = 0.25 + sh.flare * 0.6, col = sh.col;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(S.x, S.y, S.r, S.r / 1.1, 0, -1.25, 1.25); ctx.stroke();
        ctx.strokeStyle = `rgba(${col},${a * 0.35})`; ctx.lineWidth = 16;
        ctx.beginPath(); ctx.ellipse(S.x, S.y, S.r - 6, S.r / 1.1 - 6, 0, -1.2, 1.2); ctx.stroke();
        for (const r of sh.rips) {
          const k = r.t / 0.5;
          ctx.strokeStyle = `rgba(${col},${1 - k})`; ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) {
            const hx = r.x - 4 + j * 10, hy = r.y + i * 11 + (j & 1) * 5.5, d = Math.hypot(hx - r.x, hy - r.y);
            if (d > 8 + k * 30) continue;
            ctx.beginPath(); for (let q = 0; q < 6; q++) { const an = q / 6 * TAU; ctx[q ? "lineTo" : "moveTo"](hx + Math.cos(an) * 5, hy + Math.sin(an) * 5); } ctx.closePath(); ctx.stroke();
          }
        }
        ctx.restore();
        if (sh.bar) {
          const x = 70, y = G - 172; rr(ctx, x - 3, y - 3, 86, 13, 4, "rgba(0,0,0,0.6)");
          rr(ctx, x, y, 80 * sh.hp / 100, 7, 3, `rgb(${col})`);
        }
      },
      steps: [
        {
          id: "ripple", name: { en: "Hex Ripple", ko: "육각 물결" }, param: "hex grid · 0.5s",
          cap: { en: "Hits make *hex ripples* spread on the surface.", ko: "맞은 곳에 *육각 물결*이 퍼져요." },
          block(w, h) { w.sh.rips.push({ x: h.x, y: h.y, t: 0 }); },
        },
        {
          id: "flare", name: { en: "Flare Up", ko: "번쩍 밝아짐" }, param: "alpha +60%",
          cap: { en: "The whole shield *flares* on impact.", ko: "맞을 때마다 방어막 전체가 *확* 밝아져요." },
          block(w) { w.sh.flare = 1; },
        },
        {
          id: "deflect", name: { en: "Splash Sparks", ko: "튕겨 나는 불꽃" }, param: "6 sparks outward",
          cap: { en: "Bullets *splash* into sparks along the surface.", ko: "총알이 표면에서 *불꽃으로 부서져요*." },
          block(w, h) { sparks(w, h.x, h.y, 6, "255,230,160", [150, 420], h.a - 1, h.a + 1); },
        },
        {
          id: "bar", name: { en: "Shield Meter", ko: "방어막 게이지" }, param: "blue → orange → red",
          cap: { en: "A meter drains, and the shield *changes color*.", ko: "게이지가 줄고, 방어막 *색이 변해요*." },
          update(w) { const sh = w.sh; sh.bar = true; sh.col = sh.hp > 60 ? "125,211,252" : sh.hp > 30 ? "251,146,60" : "248,113,113"; },
        },
        {
          id: "break", name: { en: "Shatter & Regen", ko: "깨지고 다시 차기" }, param: "shards · 1.2s regen",
          cap: { en: "At zero it *shatters*. Then it *refills*.", ko: "0이 되면 *와장창*. 그리고 다시 *차올라요*." },
          empty(w) {
            const sh = w.sh; sh.broken = true; w.shake(0.3);
            for (let i = 0; i < 22; i++) { const a = rand(-1.2, 1.2); w.spawn({ type: "chunk", x: 110 + Math.cos(a) * 92, y: G - 70 + Math.sin(a) * 84, vx: Math.cos(a) * rand(100, 300), vy: rand(-300, 0), g: 1200, vr: rand(-10, 10), life: 0.9, size: rand(4, 8), color: sh.col }); }
            w.after(1.2, () => { sh.broken = false; sh.hp = 100; sh.flare = 1.5; w.spawn({ type: "ring", x: 110, y: G - 70, size: 20, size1: 100, life: 0.4, w: 6, color: "125,211,252" }); });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "zap per hit",
          cap: { en: "An electric *zap* per hit. A *crash* when it breaks.", ko: "맞을 때마다 *지직*, 깨질 땐 *와장창*." },
          block(w) { w.play(() => { tn({ type: "sawtooth", f: 900, f2: 300, dur: 0.08, vol: 0.08 }); nz({ type: "bandpass", f: 3000, q: 3, dur: 0.06, vol: 0.2 }); }); },
          empty(w) { w.sfx.burst(); },
        },
      ],
    },

    /* 35 ─ 레이저 조준기 */
    {
      id: "shooter-laser-sight", cat: "shooter", view: "side",
      title: { en: "Make a laser sight *glow*", ko: "레이저 조준기를 *빛나게*" },
      intro: { en: "A thin red line. *Through* walls, too.", ko: "가는 빨간 선. 벽도 *뚫고* 가요." },
      interval: 1.5, stepDur: 4.2,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(4,5,8,0.7)"; ctx.fillRect(-80, -80, 700, 520);
        ctx.fillStyle = "rgba(255,255,255,0.02)"; ctx.fillRect(-80, G, 700, 120);
        ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(-80, G - 1, 700, 1.5);
        ctx.fillStyle = "#2b2418"; ctx.fillRect(372, G - 62, 92, 62); ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 2; ctx.strokeRect(372, G - 62, 92, 62);
        ctx.fillStyle = "#1a1c22"; ctx.fillRect(522, 40, 40, G - 40);
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 80 }); w.gun = { kick: 0, rot: 0 };
        w.foes = [[250, G, 100], [418, G - 62, 92], [490, G, 100]].map(([x, gy, h]) => { const f = w.actor("foe", { home: x, gy, h }); f.maxHp = 0; return f; });
        w.ti = 0; w.ang = 0; w.angT = 0; w.beam = null; w.lz = { glow: false, dot: false, jit: 0, paint: false };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foes[w.ti++ % 3], m = muzzle(w);
        w.tween(w, { angT: Math.atan2(f.gy - f.h * 0.5 - m.y, f.x - m.x) }, 0.45, "inout");
        w.after(0.85, () => {
          w.gun.kick = 12; w.emit("shot", f, w.beam);
          if (f.alive && w.beam && w.beam.t === f) { f.flash = 1.4; w.kill(f); }
          w.after(0.2, () => { w.busy = false; });
        });
      },
      update(w, dt) {
        const g = w.gun; g.kick -= g.kick * Math.min(1, dt * 16);
        w.ang = w.angT + w.lz.jit * Math.sin(w.time * 23) * 0.006; g.rot = w.ang;
        const m = muzzle(w), dx = Math.cos(w.ang), dy = Math.sin(w.ang);
        let t = null, L = 0;
        for (; L < 620; L += 3) {
          const x = m.x + dx * L, y = m.y + dy * L;
          if (!w.lz.dot) continue;
          if (y >= G || x >= 522 || (x > 372 && x < 464 && y > G - 62)) break;
          t = w.foes.find(f => f.alive && Math.abs(x - f.x) < f.w * 0.3 && y > f.gy - f.h * 0.9 && y < f.gy);
          if (t) break;
        }
        w.beam = { x0: m.x, y0: m.y, x1: m.x + dx * L, y1: m.y + dy * L, t };
        w.lz = { glow: false, dot: false, jit: 0, paint: false };
      },
      drawFront(w, ctx) {
        drawGun(w, ctx);
        const B = w.beam; if (!B) return;
        const L = w.lz;
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
        if (L.glow) { ctx.strokeStyle = "rgba(239,68,68,0.22)"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(B.x0, B.y0); ctx.lineTo(B.x1, B.y1); ctx.stroke(); }
        ctx.strokeStyle = L.glow ? "rgba(254,202,202,0.95)" : "rgba(220,38,38,0.8)"; ctx.lineWidth = L.glow ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(B.x0, B.y0); ctx.lineTo(B.x1, B.y1); ctx.stroke();
        if (L.dot) { glow(ctx, B.x1, B.y1, B.t && L.paint ? 30 : 18, "239,68,68", 1); glow(ctx, B.x1, B.y1, 5, "255,255,255", 1); }
        ctx.restore();
      },
      steps: [
        {
          id: "dot", name: { en: "Stop at Surface", ko: "닿는 곳에서 멈춤" }, param: "raycast + dot",
          cap: { en: "Stop the beam where it *hits*. Put a *dot* there.", ko: "빛은 *닿는 곳*에서 멈추고, 거기에 *점*." },
          update(w) { w.lz.dot = true; },
        },
        {
          id: "glow", name: { en: "Beam Glow", ko: "빛 번짐" }, param: "core 2px + halo 9px",
          cap: { en: "Hot *white core*, soft red *halo*.", ko: "가운데는 *하얗게*, 바깥은 붉게 *번지게*." },
          update(w) { w.lz.glow = true; },
        },
        {
          id: "motes", name: { en: "Dust Motes", ko: "떠다니는 먼지" }, param: "sparkles in beam",
          cap: { en: "*Dust* sparkles only inside the beam.", ko: "빛줄기 안에서만 *먼지*가 반짝여요." },
          update(w, dt) {
            const B = w.beam; if (!B || Math.random() > dt * 40) return;
            const k = Math.random(); w.spawn({ type: "glow", x: B.x0 + (B.x1 - B.x0) * k, y: B.y0 + (B.y1 - B.y0) * k + rand(-2, 2), vy: rand(-6, 6), size: 3, life: 0.5, color: "255,160,160" });
          },
        },
        {
          id: "jitter", name: { en: "Hand Jitter", ko: "손떨림" }, param: "±0.35°",
          cap: { en: "A tiny *hand tremble*. The dot never sits perfectly still.", ko: "아주 작은 *손떨림*. 점이 완벽히 멈추지 않아요." },
          update(w) { w.lz.jit = 1; },
        },
        {
          id: "paint", name: { en: "Paint the Target", ko: "적을 비추기" }, param: "red light on target",
          cap: { en: "The dot *lights up* whoever it touches.", ko: "점이 닿은 적은 *붉게 물들어요*." },
          update(w) { w.lz.paint = true; if (w.beam && w.beam.t) w.beam.t.tint = 0.7; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "lock tick · shot",
          cap: { en: "A tiny *tick* when it lands, then the shot.", ko: "점이 닿으면 작게 *틱*, 그리고 탕." },
          shot(w) { w.sfx.gun(); },
          update(w) { const t = w.beam && w.beam.t; if (t && t !== w.lastT) w.sfx.tick(); w.lastT = t; },
        },
      ],
    },
  );
  // 1인칭 레시피 공통: 총이 튀는 순간 총구에 맨 점 하나 + 반동 조금 더. 효과 없이도 "쐈다"가 보이게
  const FPGUN = ["ads", "aim-assist", "ammo-shake", "damage-dir", "dryfire", "fp-shells", "headshot", "hitmarker", "killconfirm", "killfeed",
    "low-health", "materials", "multikill", "muzzle-smoke", "recoil-climb", "reload", "ricochet", "suppression", "tracers"].map(n => "shooter-" + n);
  for (const r of RECIPES) {
    if (!FPGUN.includes(r.id) || r.popped) continue;
    const up = r.update;
    r.popped = true;
    r.update = function (w, dt) {
      if (w.fp && w.fp.kick > (w.fpK || 0) + 0.02) {
        w.fp.kick *= 1.5;
        const m = fpMuzzle(w);
        w.spawn({ type: "circle", x: m.x, y: m.y, size: 9, life: 0.07, color: "255,236,190" });
      }
      if (up) up.call(this, w, dt);
      w.fpK = w.fp ? w.fp.kick : 0;
    };
  }
})();

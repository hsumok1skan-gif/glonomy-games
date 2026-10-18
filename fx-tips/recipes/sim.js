"use strict";
/* sim — 시뮬레이션·경영·타이쿤·방치형 레시피 30편 */
(() => {
  /* ───────── 공용 도우미 (이 파일 안에서만) ───────── */
  const CL = {
    wall: [[250, 244, 232], [96, 88, 80]], red: [[248, 113, 113], [90, 24, 24]], teal: [[94, 234, 212], [15, 80, 70]],
    blue: [[125, 211, 252], [20, 60, 100]], wood: [[222, 170, 110], [80, 45, 20]], green: [[163, 230, 53], [30, 70, 20]],
    dark: [[100, 106, 120], [22, 24, 30]], yellow: [[253, 224, 71], [110, 80, 10]], gray: [[214, 218, 224], [60, 64, 72]],
    purple: [[196, 181, 253], [60, 40, 110]], orange: [[253, 186, 116], [110, 50, 10]], pink: [[249, 168, 212], [100, 30, 70]],
  };
  const P = (part, c) => Object.assign(part, { light: c[0], dark: c[1] });
  const YAW = Math.PI / 4, PITCH = 0.52;
  const META = {};
  const iso3 = (key, model, W = 200, H = 200, yaw = YAW, pitch = PITCH) => { META[key] = { model, W, H, yaw, pitch }; return polySprite(key, model, W, H, yaw, pitch); };
  // 구운 모델 위의 3D 점 (a,b,c)가 화면 어디에 있는지: put()과 같은 기준(아래 가운데)
  const at3 = (key, x, y, wd, a, b, c) => {
    const m = META[key];
    if (!m.f) {
      const cy = Math.cos(m.yaw), sy = Math.sin(m.yaw), cp = Math.cos(m.pitch), sp = Math.sin(m.pitch);
      const T = ([a, b, c]) => { const x1 = a * cy + c * sy, z1 = -a * sy + c * cy; return [x1, b * cp - z1 * sp]; };
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of m.model()) for (const v of p.v) { const q = T(v); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      const k = Math.min((m.W - 8) / (x1 - x0), (m.H - 8) / (y1 - y0)), ox = m.W / 2 - (x0 + x1) / 2 * k, oy = m.H - 4 + y0 * k;
      m.f = (a, b, c) => { const q = T([a, b, c]); return [ox + q[0] * k, oy - q[1] * k]; };
    }
    const [px, py] = m.f(a, b, c), s = wd / m.W;
    return { x: x + (px - m.W / 2) * s, y: y + (py - m.H) * s };
  };
  const gable = (wx, y, dz, h, c) => P({ v: [[-wx, y, -dz], [wx, y, -dz], [wx, y, dz], [-wx, y, dz], [-wx, y + h, 0], [wx, y + h, 0]], f: [[0, 1, 2, 3], [0, 1, 5, 4], [3, 2, 5, 4], [0, 3, 4], [1, 2, 5]] }, c);
  const roof = (s, y, h, c) => P(pyr([[-s, y, -s], [s, y, -s], [s, y, s], [-s, y, s]], [0, y + h, 0]), c);

  // 로우폴리 모델들 (한 번만 구워짐)
  const mShop = () => iso3("sim-shop", () => [
    P(blk(0, 0, 0, 100, 62, 100), CL.wall), roof(60, 62, 46, CL.red),
    P(blk(-18, 0, 50, 26, 40, 3), CL.dark), P(blk(22, 22, 51, 34, 22, 2), CL.blue),
    P(blk(0, 46, 58, 96, 6, 18, 1, 0, 4), CL.teal), P(blk(-51, 22, 0, 2, 22, 40), CL.blue),
  ], 200, 190);
  const mHouse = (key, c) => iso3(key, () => [
    P(blk(0, 0, 0, 80, 50, 80), CL.wall), roof(48, 50, 40, c),
    P(blk(-12, 0, 40, 20, 32, 3), CL.dark), P(blk(-41, 18, 0, 2, 18, 26), CL.blue), P(blk(20, 18, 41, 22, 18, 2), CL.blue),
  ], 160, 150);
  const mPerson = (key, c) => polySprite(key, () => humanModel().map((p, i) => P(p, i < 2 ? CL.dark : i === 7 ? CL.wall : c)), 110, 170, -0.9, 0.35);

  const ease1 = (o, dt, k = 12) => { o.sx += (1 - o.sx) * Math.min(1, dt * k); o.sy += (1 - o.sy) * Math.min(1, dt * k); };
  const comma = n => Math.round(n).toLocaleString("en-US");
  const fmt = n => { const u = ["", "K", "M", "B", "T", "Qa", "Qi"]; let i = 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return i ? n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i] : String(Math.round(n)); };
  const txt = (ctx, t, x, y, size, color = "#fff", align = "center", lw = 0.2) => {
    ctx.font = `800 ${size}px Pretendard, "Apple SD Gothic Neo", sans-serif`; ctx.textAlign = align; ctx.textBaseline = "middle";
    if (lw) { ctx.lineJoin = "round"; ctx.lineWidth = size * lw; ctx.strokeStyle = "rgba(10,12,20,0.9)"; ctx.strokeText(t, x, y); }
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  };
  const put = (ctx, key, x, y, wd, sx = 1, sy = 1, a = 1, tint = null, ta = 0) => {
    const s = SPR[key], c = s.c, h = wd * c.height / c.width;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sx, sy); ctx.drawImage(c, -wd / 2, -h, wd, h);
    if (tint && ta > 0) { ctx.globalAlpha = a * Math.min(1, ta); ctx.drawImage(s[tint], -wd / 2, -h, wd, h); }
    ctx.restore();
  };
  const tilePath = (ctx, gx, gy, w = 1, h = 1) => {
    const a = isoPt(gx, gy), b = isoPt(gx + w, gy), c = isoPt(gx + w, gy + h), d = isoPt(gx, gy + h);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  };
  const isoFloor = (ctx, fill, n = 5, m = 5) => {
    const L = isoPt(0, m), B = isoPt(n, m), Rt = isoPt(n, 0), d = 12;
    ctx.fillStyle = "#20232c"; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x, B.y + d); ctx.lineTo(L.x, L.y + d); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#171920"; ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(Rt.x, Rt.y); ctx.lineTo(Rt.x, Rt.y + d); ctx.lineTo(B.x, B.y + d); ctx.closePath(); ctx.fill();
    for (let gy = 0; gy < m; gy++) for (let gx = 0; gx < n; gx++) {
      tilePath(ctx, gx, gy);
      ctx.fillStyle = (fill && fill(gx, gy)) || ((gx + gy) % 2 ? "rgba(255,255,255,0.065)" : "rgba(255,255,255,0.035)"); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.stroke();
    }
  };
  const star5 = (c, r, ri = r * 0.45) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? ri : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); };
  const heartPath = (c, s) => { c.beginPath(); c.moveTo(0, s * 0.42); c.bezierCurveTo(-s * 0.62, 0, -s * 0.5, -s * 0.5, 0, -s * 0.2); c.bezierCurveTo(s * 0.5, -s * 0.5, s * 0.62, 0, 0, s * 0.42); c.closePath(); };
  const img = (c, k, s) => { const i = SPR[k].c, h = s * i.height / i.width; c.drawImage(i, -s / 2, -h / 2, s, h); };
  const ICO = {
    coin: (c, s) => img(c, "coin", s), gem: (c, s) => img(c, "gem", s * 0.9), heart: (c, s) => img(c, "heart", s),
    star: (c, s) => { star5(c, s / 2); c.fillStyle = "#facc15"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#a16207"; c.stroke(); },
    carrot: (c, s) => {
      c.fillStyle = "#4ade80"; for (const a of [-0.5, 0, 0.5]) { c.save(); c.rotate(a); c.beginPath(); c.ellipse(0, -s * 0.32, s * 0.08, s * 0.2, 0, 0, TAU); c.fill(); c.restore(); }
      c.fillStyle = "#fb923c"; c.beginPath(); c.moveTo(-s * 0.2, -s * 0.16); c.lineTo(s * 0.2, -s * 0.16); c.lineTo(0, s * 0.5); c.closePath(); c.fill();
    },
    box: (c, s) => { c.fillStyle = "#d9a066"; c.fillRect(-s * 0.4, -s * 0.34, s * 0.8, s * 0.68); c.fillStyle = "#a16207"; c.fillRect(-s * 0.4, -s * 0.06, s * 0.8, s * 0.1); c.fillRect(-s * 0.05, -s * 0.34, s * 0.1, s * 0.68); },
    burger: (c, s) => { rr(c, -s * 0.42, -s * 0.36, s * 0.84, s * 0.3, s * 0.15, "#f59e0b"); c.fillStyle = "#4ade80"; c.fillRect(-s * 0.44, -s * 0.08, s * 0.88, s * 0.08); c.fillStyle = "#7c2d12"; c.fillRect(-s * 0.4, 0, s * 0.8, s * 0.14); rr(c, -s * 0.4, s * 0.16, s * 0.8, s * 0.18, s * 0.08, "#f59e0b"); },
    cup: (c, s) => { c.fillStyle = "#38bdf8"; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.3); c.lineTo(s * 0.3, -s * 0.3); c.lineTo(s * 0.22, s * 0.42); c.lineTo(-s * 0.22, s * 0.42); c.closePath(); c.fill(); c.fillStyle = "#fff"; c.fillRect(-s * 0.32, -s * 0.36, s * 0.64, s * 0.08); c.fillRect(s * 0.04, -s * 0.56, s * 0.06, s * 0.22); },
    fries: (c, s) => { c.fillStyle = "#fde047"; for (let i = -2; i <= 2; i++) c.fillRect(i * s * 0.09 - s * 0.03, -s * 0.42 + Math.abs(i) * s * 0.05, s * 0.07, s * 0.4); c.fillStyle = "#ef4444"; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.08); c.lineTo(s * 0.3, -s * 0.08); c.lineTo(s * 0.22, s * 0.42); c.lineTo(-s * 0.22, s * 0.42); c.closePath(); c.fill(); },
  };
  Object.assign(ICO, {
    wheat: (c, s) => { c.strokeStyle = "#a16207"; c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(0, s * 0.45); c.lineTo(0, -s * 0.1); c.stroke(); c.fillStyle = "#facc15"; for (let i = 0; i < 4; i++) for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * s * 0.09, -s * 0.38 + i * s * 0.12, s * 0.07, s * 0.11, d * 0.5, 0, TAU); c.fill(); } },
    flour: (c, s) => { c.fillStyle = "#f5f5f4"; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.3); c.lineTo(s * 0.3, -s * 0.3); c.lineTo(s * 0.38, s * 0.42); c.lineTo(-s * 0.38, s * 0.42); c.closePath(); c.fill(); c.fillStyle = "#d6d3d1"; c.fillRect(-s * 0.3, -s * 0.4, s * 0.6, s * 0.12); c.fillStyle = "#38bdf8"; c.fillRect(-s * 0.16, -s * 0.02, s * 0.32, s * 0.2); },
    bread: (c, s) => { c.fillStyle = "#b45309"; c.beginPath(); c.ellipse(0, 0, s * 0.46, s * 0.3, 0, 0, TAU); c.fill(); c.strokeStyle = "#fcd34d"; c.lineWidth = s * 0.06; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * s * 0.18 - s * 0.06, -s * 0.18); c.lineTo(i * s * 0.18 + s * 0.06, s * 0.1); c.stroke(); } },
    log: (c, s) => { rr(c, -s * 0.42, -s * 0.18, s * 0.84, s * 0.36, s * 0.18, "#92400e"); c.fillStyle = "#fcd34d"; c.beginPath(); c.ellipse(s * 0.32, 0, s * 0.12, s * 0.17, 0, 0, TAU); c.fill(); },
    ingot: (c, s) => { c.fillStyle = "#cbd5e1"; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.16); c.lineTo(s * 0.3, -s * 0.16); c.lineTo(s * 0.44, s * 0.2); c.lineTo(-s * 0.44, s * 0.2); c.closePath(); c.fill(); c.fillStyle = "#f8fafc"; c.fillRect(-s * 0.24, -s * 0.14, s * 0.48, s * 0.07); },
    pick: (c, s) => { c.save(); c.rotate(-0.7); rr(c, -s * 0.05, -s * 0.3, s * 0.1, s * 0.8, s * 0.04, "#92400e"); c.fillStyle = "#38bdf8"; c.beginPath(); c.moveTo(-s * 0.48, -s * 0.2); c.quadraticCurveTo(0, -s * 0.5, s * 0.48, -s * 0.2); c.quadraticCurveTo(0, -s * 0.36, -s * 0.48, -s * 0.2); c.fill(); c.restore(); },
    orb: (c, s) => { c.globalCompositeOperation = "lighter"; glow(c, 0, 0, s * 0.8, "198,244,50", 0.9); c.globalCompositeOperation = "source-over"; c.fillStyle = "#f7fee7"; c.beginPath(); c.arc(0, 0, s * 0.22, 0, TAU); c.fill(); },
    mail: (c, s) => { rr(c, -s * 0.45, -s * 0.3, s * 0.9, s * 0.6, s * 0.06, "#f8fafc"); c.strokeStyle = "#94a3b8"; c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(-s * 0.42, -s * 0.26); c.lineTo(0, s * 0.06); c.lineTo(s * 0.42, -s * 0.26); c.stroke(); },
    fish: (c, s) => { c.fillStyle = "#7dd3fc"; c.beginPath(); c.ellipse(0, 0, s * 0.42, s * 0.2, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-s * 0.34, 0); c.lineTo(-s * 0.56, -s * 0.18); c.lineTo(-s * 0.56, s * 0.18); c.closePath(); c.fill(); c.fillStyle = "#e0f2fe"; c.beginPath(); c.ellipse(s * 0.05, s * 0.06, s * 0.26, s * 0.08, 0, 0, TAU); c.fill(); },
    pstar: (c, s) => { star5(c, s / 2); c.fillStyle = "#c084fc"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#f5d0fe"; c.stroke(); },
  });
  const ico = (ctx, k, x, y, s, rot = 0, a = 1) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a; (typeof k === "function" ? k : ICO[k])(ctx, s); ctx.restore(); };
  // 지갑(돈 칸): 아이콘 + 숫자, bump만큼 톡 커짐
  const wallet = (ctx, x, y, t, bump = 0, k = "coin", w = 140) => {
    const s = 1 + bump * 0.35;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rr(ctx, -18, -16, w, 32, 16, "rgba(0,0,0,0.6)", "rgba(255,255,255,0.12)", 1.5);
    ico(ctx, k, 0, 0, 26);
    txt(ctx, t, 20, 1, 19, bump > 0.25 ? "#fde047" : "#fff", "left", 0);
    ctx.restore();
  };
  // 아이콘이 곡선을 그리며 날아감 (x0,y0) → (x1,y1)
  const flyer = (w, o) => {
    const f = Object.assign({ t: 0, dur: 0.6, delay: 0, k: "coin", s: 22, ease: "in" }, o);
    if (f.cx == null) f.cx = f.x0 + rand(-90, 90);
    if (f.cy == null) f.cy = f.y0 - rand(50, 120);
    (w.flyers = w.flyers || []).push(f); return f;
  };
  const flyStep = (w, dt) => {
    for (const f of w.flyers || []) {
      if (f.delay > 0) { f.delay -= dt; continue; }
      f.t += dt / f.dur;
      if (f.t >= 1 && !f.done) { f.done = true; if (f.end) f.end(f); }
    }
    if (w.flyers) w.flyers = w.flyers.filter(f => !f.done);
  };
  const flyDraw = (w, ctx) => {
    for (const f of w.flyers || []) {
      if (f.delay > 0) continue;
      const k = E[f.ease](Math.min(1, f.t)), q = 1 - k;
      const x = q * q * f.x0 + 2 * q * k * f.cx + k * k * f.x1, y = q * q * f.y0 + 2 * q * k * f.cy + k * k * f.y1;
      ico(ctx, f.k, x, y, f.s * (1 - 0.3 * k), f.spin ? f.t * f.spin : 0);
    }
  };
  // 떠오르는 글자 상자 {x,y,age,life,size,col,fade,pop}
  const popTxt = (ctx, p, t) => {
    const k = p.age / p.life, a = p.fade ? Math.min(1, (1 - k) * 3) : 1, s = p.pop ? E.back(Math.min(1, p.age / 0.22)) : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.scale(s, s); txt(ctx, t, 0, 0, p.size || 20, p.col || "#fff"); ctx.restore();
  };
  const confetti = (w, x, y, n = 24, sp = 1) => {
    const cols = ["198,244,50", "250,204,21", "56,189,248", "244,114,182", "255,255,255"];
    for (let i = 0; i < n; i++) { const a = rand(-Math.PI * 0.95, -Math.PI * 0.05), v = rand(220, 520) * sp; w.spawn({ type: "chunk", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, drag: 1.5, vr: rand(-14, 14), size: rand(3, 6), life: rand(0.8, 1.3), color: pick(cols), hold: true }); }
  };
  const tw = (w, o, to, d, e, done) => w.tween(o, to, d, e, done);
  const bubble = (ctx, x, y, bw, bh, fill, stroke) => {
    rr(ctx, x - bw / 2, y - bh / 2, bw, bh, 12, fill, stroke, 2);
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x - 8, y + bh / 2 - 1); ctx.lineTo(x + 2, y + bh / 2 + 12); ctx.lineTo(x + 8, y + bh / 2 - 1); ctx.closePath(); ctx.fill();
  };
  const bar = (ctx, x, y, bw, bh, v, col, bg = "rgba(0,0,0,0.6)") => {
    rr(ctx, x - 3, y - 3, bw + 6, bh + 6, (bh + 6) / 2, bg);
    if (v > 0) rr(ctx, x, y, Math.max(bh, bw * Math.min(1, v)), bh, bh / 2, col);
  };

  RECIPES.push(
    /* ───────── 1. 수입 팝업 ───────── */
    {
      id: "sim-income", cat: "sim", view: "iso",
      title: { en: "Make income *pop*", ko: "수입 숫자를 *톡톡* 튀게" },
      intro: { en: "Money goes up. *From where?*", ko: "돈은 오르는데, *어디서* 벌었죠?" },
      interval: 0.7, stepDur: 3.4,
      drawFloor(w, ctx) { isoFloor(ctx); },
      setup(w) { mShop(); w.S = { money: 1200, shown: 1200, bump: 0, sx: 1, sy: 1, n: 0, pops: [] }; w.flyers = []; },
      fire(w) {
        const S = w.S, amt = ++S.n % 4 === 0 ? 80 : 10 + ((Math.random() * 9) | 0);
        const p = { x: 270 + rand(-34, 34), y: 96, amt, age: 0, life: 0.5, vy: 0, size: 22, col: "#e5e7eb", show: false };
        S.money += amt; S.pops.push(p);
        w.emit("sale", p);
      },
      update(w, dt) {
        const S = w.S; ease1(S, dt); flyStep(w, dt);
        S.bump = Math.max(0, S.bump - dt * 5);
        for (const p of S.pops) { p.age += dt; p.y += p.vy * dt; }
        S.pops = S.pops.filter(p => p.age < p.life);
        S.shown = w.on("bump") ? S.shown + (S.money - S.shown) * Math.min(1, dt * 7) : S.money;
      },
      drawFront(w, ctx) { put(ctx, "sim-shop", 270, 236, 180, w.S.sx, w.S.sy); },
      drawHud(w, ctx) {
        for (const p of w.S.pops) if (p.show) popTxt(ctx, p, "+$" + p.amt);
        flyDraw(w, ctx);
        wallet(ctx, 214, 26, "$" + comma(w.S.shown), w.S.bump);
      },
      steps: [
        { id: "text", name: { en: "Show the Amount", ko: "금액 보여주기" }, param: "+$ text · 0.5s",
          cap: { en: "Show *how much*, right where it was earned.", ko: "번 자리에서 *얼마인지* 보여줘요." },
          sale(w, p) { p.show = true; } },
        { id: "float", name: { en: "Float & Fade", ko: "떠오르며 사라짐" }, param: "vy −70 · fade",
          cap: { en: "Let it *float up* and fade. Never just vanish.", ko: "툭 사라지지 말고 *떠오르며* 흐려져요." },
          sale(w, p) { p.vy = -70; p.life = 0.9; p.fade = true; } },
        { id: "pop", name: { en: "Pop-in", ko: "톡 튀어나오기" }, param: "ease-back 220ms",
          cap: { en: "*Pop it in* a bit too big. The shop *squashes*.", ko: "글자는 *톡* 튀어나오고, 가게는 *꿀렁*." },
          sale(w, p) { p.pop = true; w.S.sx = 1.08; w.S.sy = 0.9; } },
        { id: "tier", name: { en: "Size by Value", ko: "금액만큼 크게" }, param: "≥50 → gold · 36px",
          cap: { en: "Big money gets *big gold* text.", ko: "큰돈은 *크고 노랗게*." },
          sale(w, p) { p.col = "#86efac"; if (p.amt >= 50) { p.col = "#fde047"; p.size = 36; p.life += 0.3; } } },
        { id: "coins", name: { en: "Coins to Wallet", ko: "지갑으로 동전" }, param: "3–8 coins · arc",
          cap: { en: "Coins *fly to the wallet*. Now you see where it went.", ko: "동전이 *지갑으로* 날아가요. 어디로 갔는지 보이죠." },
          sale(w, p) { for (let i = 0; i < (p.amt >= 50 ? 8 : 3); i++) flyer(w, { x0: p.x, y0: 150, x1: 214, y1: 26, delay: i * 0.05, end: () => w.emit("arrive") }); } },
        { id: "bump", name: { en: "Bump + Roll", ko: "지갑 톡 + 숫자 굴리기" }, param: "scale 1.35 · lerp ×7",
          cap: { en: "Each coin *bumps* the wallet. Numbers *roll* up.", ko: "동전마다 지갑이 *톡*, 숫자는 *도르륵*." },
          arrive(w) { w.S.bump = 1; } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "cha-ching / tick",
          cap: { en: "A *cha-ching* per sale, a tiny *tick* per coin.", ko: "팔 때 *짤랑*, 동전마다 작게 *틱*." },
          sale(w, p) { w.sfx.chime(p.amt >= 50 ? 7 : 0); },
          arrive(w) { w.sfx.tick(); } },
      ],
    },

    /* ───────── 2. 손님 만족도 ───────── */
    {
      id: "sim-mood", cat: "sim", view: "iso",
      title: { en: "Show customer *mood* at a glance", ko: "손님 *기분*이 한눈에 보이게" },
      intro: { en: "Happy? Angry? *No idea.*", ko: "좋은 건지 화난 건지 *모르겠어요*." },
      interval: 0.75, stepDur: 3.6,
      drawFloor(w, ctx) { isoFloor(ctx); },
      setup(w) {
        mShop(); mPerson("sim-cust", CL.blue);
        w.S = { i: 0, meter: 0.55, shown: 0.55, bump: 0 }; w.flyers = [];
        w.cus = [[160, 272], [270, 300], [380, 272]].map(([x, y]) => ({ x, y, oy: 0, sh: 0, sx: 1, sy: 1, b: null }));
      },
      fire(w) {
        const S = w.S, c = w.cus[S.i % 3], mood = [2, 2, 0, 2, 1, 2][S.i % 6]; S.i++;
        c.b = { mood, age: 0, life: 0.8, pop: false, col: false };
        S.meter = Math.max(0.05, Math.min(1, S.meter + (mood - 1) * 0.12));
        if (S.meter >= 1) S.meter = 0.5;
        w.emit("react", c, c.b);
      },
      update(w, dt) {
        const S = w.S; flyStep(w, dt);
        S.bump = Math.max(0, S.bump - dt * 5);
        S.shown += (S.meter - S.shown) * Math.min(1, dt * (w.on("meter") ? 5 : 60));
        for (const c of w.cus) { ease1(c, dt); c.sh = Math.max(0, c.sh - dt * 2); if (c.b) { c.b.age += dt; if (c.b.age > c.b.life) c.b = null; } }
      },
      drawFront(w, ctx) {
        put(ctx, "sim-shop", 270, 196, 150);
        for (const c of [w.cus[0], w.cus[2], w.cus[1]]) put(ctx, "sim-cust", c.x + Math.sin(w.time * 70) * 6 * c.sh, c.y + c.oy, 56, c.sx, c.sy);
        for (const c of w.cus) {
          const b = c.b; if (!b) continue;
          const x = c.x, y = c.y + c.oy - 112, s = b.pop ? E.back(Math.min(1, b.age / 0.22)) : 1;
          const col = ["#ef4444", "#facc15", "#f43f5e"][b.mood];
          ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
          if (b.pop) bubble(ctx, 0, 0, 50, 42, b.col ? ["#fee2e2", "#fef9c3", "#dcfce7"][b.mood] : "#f1f5f9", b.col ? col : "rgba(0,0,0,0.2)");
          const g = b.col ? col : "#9ca3af", sz = b.pop ? 26 : 16;
          ctx.fillStyle = g;
          if (b.mood === 2) { heartPath(ctx, sz * 1.1); ctx.fill(); }
          else if (b.mood === 1) for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * sz * 0.34, 0, sz * 0.12, 0, TAU); ctx.fill(); }
          else { ctx.lineWidth = sz * 0.16; ctx.strokeStyle = g; ctx.lineCap = "round"; for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2 + 0.78); ctx.beginPath(); ctx.moveTo(sz * 0.12, -sz * 0.4); ctx.quadraticCurveTo(sz * 0.12, -sz * 0.12, sz * 0.4, -sz * 0.12); ctx.stroke(); ctx.restore(); } }
          ctx.restore();
        }
      },
      drawHud(w, ctx) {
        flyDraw(w, ctx);
        const S = w.S, s = 1 + S.bump * 0.25, v = S.shown;
        ctx.save(); ctx.translate(270, 24); ctx.scale(s, s);
        bar(ctx, -60, -6, 140, 12, v, v > 0.66 ? "#4ade80" : v > 0.33 ? "#facc15" : "#ef4444");
        ctx.fillStyle = "#f43f5e"; ctx.translate(-78, 0); heartPath(ctx, 26); ctx.fill();
        ctx.restore();
      },
      steps: [
        { id: "bubble", name: { en: "Speech Bubble", ko: "말풍선" }, param: "ease-back 220ms",
          cap: { en: "Put the feeling in a *bubble* that *pops* in.", ko: "기분은 *말풍선*에 담아 *톡* 띄워요." },
          react(w, c, b) { b.pop = true; b.life = 1.1; } },
        { id: "color", name: { en: "Mood Colors", ko: "기분 색" }, param: "green · yellow · red",
          cap: { en: "*Color* reads faster than any icon.", ko: "아이콘보다 *색*이 먼저 읽혀요." },
          react(w, c, b) { b.col = true; } },
        { id: "body", name: { en: "Body Language", ko: "몸으로 표현" }, param: "hop 26px / shake",
          cap: { en: "Happy *hops*. Angry *shakes*. No face needed.", ko: "좋으면 *폴짝*, 화나면 *부들부들*. 얼굴 없어도 돼요." },
          react(w, c, b) {
            if (b.mood === 2) tw(w, c, { oy: -26 }, 0.12, "out", () => tw(w, c, { oy: 0 }, 0.2, "in"));
            else if (b.mood === 0) c.sh = 0.6; else c.sy = 0.88;
          } },
        { id: "emote", name: { en: "Emote Particles", ko: "감정 파티클" }, param: "4 hearts / 5 steam",
          cap: { en: "Hearts *float up*. Anger *steams*.", ko: "하트는 *몽글몽글*, 화는 *부글부글*." },
          react(w, c, b) {
            const y = c.y - 70;
            if (b.mood === 2) for (let i = 0; i < 4; i++) w.spawn({ type: "ghost", img: SPR.heart.c, top: true, w: 16, h: 15, alpha0: 1, add: false, x: c.x + rand(-20, 20), y, vx: rand(-40, 40), vy: rand(-120, -70), life: 0.9 });
            if (b.mood === 0) for (let i = 0; i < 5; i++) w.spawn({ type: "smoke", x: c.x + rand(-10, 10), y, vx: rand(-60, 60), vy: rand(-110, -60), size: 6, size1: 16, life: 0.6, color: "120,120,130" });
          } },
        { id: "meter", name: { en: "Feed the Meter", ko: "만족도 바 채우기" }, param: "icon → bar · bump",
          cap: { en: "Send the mood *up to the meter*. Bump it.", ko: "기분이 *위쪽 바로* 날아가서 톡." },
          react(w, c, b) { flyer(w, { k: b.mood === 2 ? "heart" : "coin", s: 18, x0: c.x, y0: c.y - 112, x1: 192, y1: 24, cy: 60, end: () => { w.S.bump = 1; } }); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "chime / buzz",
          cap: { en: "Happy *chime*, grumpy *buzz*.", ko: "좋으면 *띠링*, 싫으면 *부웅*." },
          react(w, c, b) {
            if (b.mood === 2) w.sfx.chime(4); else if (b.mood === 1) w.sfx.tock();
            else w.play(() => tn({ type: "sawtooth", f: 120, f2: 90, dur: 0.3, vol: 0.12 }));
          } },
      ],
    },

    /* ───────── 3. 주문 완료 ───────── */
    {
      id: "sim-order", cat: "sim", view: "ui",
      title: { en: "Make *order complete* land", ko: "주문 완료를 *확실하게*" },
      intro: { en: "Ticket gone. *Was it done?*", ko: "주문서가 사라졌어요. *끝난 거죠?*" },
      interval: 0.6, stepDur: 3.8,
      drawFloor(w, ctx) { ctx.fillStyle = "#3f3f46"; ctx.fillRect(-80, 56, 700, 6); ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(-80, 56, 700, 1.5); },
      setup(w) { w.S = { no: 12, tips: 40, shown: 40, bump: 0 }; w.flyers = []; w.T = null; this.newT(w); },
      newT(w) { w.T = { no: w.S.no++, x: 270, rot: 0, stamp: 0, lock: false, rows: ["burger", "cup", "fries"].map(k => ({ k, done: false, chk: 0, strike: 0 })) }; },
      fire(w) {
        const T = w.T; if (T.lock) return;
        const r = T.rows.find(r => !r.done);
        r.done = true; r.chk = 1; w.emit("check", r);
        if (T.rows.every(r => r.done)) {
          T.lock = true;
          w.after(0.25, () => {
            w.emit("done", T);
            w.after(0.75, () => { this.newT(w); w.emit("next", w.T); });
          });
        }
      },
      update(w, dt) { const S = w.S; flyStep(w, dt); S.bump = Math.max(0, S.bump - dt * 5); S.shown += (S.tips - S.shown) * Math.min(1, dt * 8); },
      drawFront(w, ctx) {
        const T = w.T, names = { burger: "Burger", cup: "Soda", fries: "Fries" };
        ctx.save(); ctx.translate(T.x, 70); ctx.rotate(T.rot);
        ctx.fillStyle = "#71717a"; ctx.fillRect(-6, -14, 12, 22);
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(-96, 6, 200, 236);
        rr(ctx, -100, 0, 200, 232, 6, "#fafaf9");
        ctx.fillStyle = "#fde047"; ctx.fillRect(-100, 0, 200, 40);
        txt(ctx, "ORDER #" + T.no, 0, 21, 18, "#1c1917", "center", 0);
        T.rows.forEach((r, i) => {
          const y = 76 + i * 52;
          ico(ctx, r.k, -66, y, 34, 0, r.strike ? 0.45 : 1);
          txt(ctx, names[r.k], -40, y, 18, r.strike ? "#a8a29e" : "#292524", "left", 0);
          if (r.strike) { ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-42, y); ctx.lineTo(-42 + 84 * r.strike, y); ctx.stroke(); }
          ctx.strokeStyle = "#a8a29e"; ctx.lineWidth = 2; ctx.strokeRect(56, y - 13, 26, 26);
          if (r.chk > 0) { ctx.save(); ctx.translate(69, y); ctx.scale(r.chk, r.chk); ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-3, 8); ctx.lineTo(12, -10); ctx.stroke(); ctx.restore(); }
        });
        if (T.stamp > 0) {
          ctx.save(); ctx.translate(0, 130); ctx.rotate(-0.22); const s = T.stamp; ctx.scale(s, s); ctx.globalAlpha = Math.min(1, 3.2 - s);
          ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 5; ctx.strokeRect(-78, -28, 156, 56); txt(ctx, "DONE!", 0, 2, 40, "#dc2626", "center", 0);
          ctx.restore();
        }
        ctx.restore();
      },
      drawHud(w, ctx) { flyDraw(w, ctx); wallet(ctx, 214, 24, "$" + comma(w.S.shown), w.S.bump, "coin", 110); },
      steps: [
        { id: "check", name: { en: "Check Pop", ko: "체크 톡" }, param: "scale 0 → 1 back",
          cap: { en: "*Pop* each check mark in. Small win, small party.", ko: "체크도 *톡* 튀게. 작은 성공, 작은 축하." },
          check(w, r) { r.chk = 0; w.tween(r, { chk: 1 }, 0.25, "back"); } },
        { id: "strike", name: { en: "Strike-through", ko: "줄 긋기" }, param: "draw 180ms",
          cap: { en: "*Draw a line* through what's done.", ko: "끝난 건 *쭉* 줄을 그어요." },
          check(w, r) { w.tween(r, { strike: 1 }, 0.18, "out"); } },
        { id: "stamp", name: { en: "Stamp Slam", ko: "도장 쾅" }, param: "scale 2.6 → 1 · shake",
          cap: { en: "Slam a *DONE* stamp. Shake the table.", ko: "*완료* 도장을 *쾅*. 화면도 살짝 흔들." },
          done(w, T) { T.stamp = 2.6; w.tween(T, { stamp: 1 }, 0.14, "in", () => w.shake(0.25)); } },
        { id: "slide", name: { en: "Slide Out / In", ko: "밀려나고 들어오기" }, param: "out 300ms · in back",
          cap: { en: "Done ticket *flies off*. The next one *slides in*.", ko: "끝난 주문서는 *휙* 나가고, 다음 건 *쓱* 들어와요." },
          done(w, T) { w.after(0.45, () => w.tween(T, { x: 720, rot: 0.5 }, 0.3, "in")); },
          next(w, T) { T.x = -160; T.rot = -0.3; w.tween(T, { x: 270, rot: 0 }, 0.4, "back"); } },
        { id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "24 bits",
          cap: { en: "A burst of *confetti* on completion.", ko: "완료하면 *꽃가루* 팡." },
          done(w) { confetti(w, 270, 200); } },
        { id: "tip", name: { en: "Tip Coins", ko: "팁 동전" }, param: "5 coins → wallet",
          cap: { en: "Pay it out: *coins fly* to the wallet.", ko: "보상은 *동전*으로 지갑까지 날려요." },
          done(w) { for (let i = 0; i < 5; i++) flyer(w, { x0: 270, y0: 200, x1: 214, y1: 24, delay: i * 0.06, end: () => { w.S.tips += 5; w.S.bump = 1; } }); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick / thunk / fanfare",
          cap: { en: "*Tick* per item, *thunk* for the stamp.", ko: "항목마다 *틱*, 도장은 *쿵*." },
          check(w) { w.sfx.tick(); w.sfx.blip(3); },
          done(w) { w.after(0.14, () => w.sfx.thunk()); w.after(0.3, () => w.sfx.fanfare()); } },
      ],
    },

    /* ───────── 4. 요리 진행 ───────── */
    {
      id: "sim-cook", cat: "sim", view: "side",
      title: { en: "Make cooking *sizzle*", ko: "요리가 *지글지글* 익게" },
      intro: { en: "A bar fills. That's *cooking*?", ko: "막대만 차요. 이게 *요리*?" },
      interval: 2.3, stepDur: 3.8,
      drawFloor(w, ctx) {
        rr(ctx, 100, G - 4, 340, 90, 8, "#2a2f3a"); ctx.fillStyle = "#3b4252"; ctx.fillRect(100, G - 4, 340, 10);
        ctx.fillStyle = "rgba(239,68,68,0.5)"; ctx.beginPath(); ctx.ellipse(270, G - 2, 70, 7, 0, 0, TAU); ctx.fill();
      },
      setup(w) { w.K = { p: 0, cook: false, done: false, c: 0, panX: 0, fy: 0, frot: 0, fsx: 1, fsy: 1, flash: 0 }; },
      fire(w) {
        const K = w.K; if (K.cook || K.done) return;
        K.cook = true; K.p = 0; w.emit("start", K);
      },
      update(w, dt) {
        const K = w.K;
        K.fsx += (1 - K.fsx) * Math.min(1, dt * 10); K.fsy += (1 - K.fsy) * Math.min(1, dt * 10); K.flash = Math.max(0, K.flash - dt * 3);
        if (K.cook) {
          K.p = Math.min(1, K.p + dt / 1.5);
          if (K.p >= 1) { K.cook = false; K.done = true; w.emit("done", K); w.after(0.8, () => { K.done = false; K.p = 0; }); }
        }
        K.c = K.done ? 1 : 0; K.bc = "#9ca3af";
        if (!K.cook) K.panX = 0;
      },
      drawFront(w, ctx) {
        const K = w.K, x = 270 + K.panX, y = G - 18;
        ctx.fillStyle = "#1f2937"; ctx.fillRect(x - 170, y - 2, 80, 10);
        ctx.fillStyle = "#374151"; ctx.beginPath(); ctx.ellipse(x, y, 92, 18, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.ellipse(x, y, 92, 14, 0, 0, TAU); ctx.fill();
        const c0 = [244, 114, 140], c1 = [146, 64, 14], k = K.c, col = `rgb(${c0.map((v, i) => Math.round(v + (c1[i] - v) * k)).join(",")})`;
        ctx.save(); ctx.translate(x, y - 6 + K.fy); ctx.rotate(Math.sin(K.frot) * 0.3); ctx.scale(K.fsx, K.fsy * Math.cos(K.frot));
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 50, 14, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.beginPath(); ctx.ellipse(-14, -4, 22, 4, 0, 0, TAU); ctx.fill();
        if (k > 0.5) { ctx.strokeStyle = "rgba(60,20,5,0.6)"; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 18 - 8, -5); ctx.lineTo(i * 18 + 8, 5); ctx.stroke(); } }
        ctx.restore();
      },
      drawHud(w, ctx) {
        const K = w.K;
        bar(ctx, 170, 110, 200, 16, K.p, K.bc);
        if (K.flash > 0) { ctx.globalAlpha = K.flash; rr(ctx, 167, 107, 206, 22, 11, "#fff"); ctx.globalAlpha = 1; }
      },
      steps: [
        { id: "color", name: { en: "Gradual Browning", ko: "서서히 익는 색" }, param: "pink → brown lerp",
          cap: { en: "Cook the *color* along with the bar.", ko: "막대와 함께 *색*도 익어가요." },
          update(w) { const K = w.K; K.c = K.p; K.bc = K.p < 0.5 ? "#fb923c" : K.p < 0.95 ? "#facc15" : "#4ade80"; } },
        { id: "sizzle", name: { en: "Sizzle & Steam", ko: "기름 튀김 + 김" }, param: "spits + steam / frame",
          cap: { en: "Oil *spits*, steam *rises*. It's alive.", ko: "기름이 *톡톡*, 김이 *모락모락*." },
          update(w) {
            const K = w.K; if (!K.cook) return;
            if (Math.random() < 0.5) w.spawn({ type: "spark", x: 270 + rand(-50, 50), y: G - 26, vx: rand(-120, 120), vy: rand(-300, -150), g: 900, life: 0.3, size: 2, color: "255,236,180" });
            if (Math.random() < 0.15 + K.p * 0.3) w.spawn({ type: "smoke", x: 270 + rand(-40, 40), y: G - 30, vx: rand(-15, 15), vy: rand(-90, -50), size: 6, size1: 22, life: 0.9, color: "230,230,240" });
          } },
        { id: "jiggle", name: { en: "Pan Jiggle", ko: "팬 떨림" }, param: "±1.5px · 50Hz",
          cap: { en: "A tiny *jiggle* says heat is on.", ko: "살짝 *달달* 떨려야 불이 켜진 느낌." },
          update(w) {
            const K = w.K;
            if (K.cook) { K.panX = Math.sin(w.time * 50) * 1.5; K.fsx = 1 + Math.sin(w.time * 31) * 0.03; }
          } },
        { id: "flip", name: { en: "Done Flip", ko: "다 되면 뒤집기" }, param: "up 110px · 1 spin",
          cap: { en: "When it's done, *flip it*. Land with a *squash*.", ko: "다 익으면 *휙* 뒤집고, *철퍼덕* 착지." },
          done(w, K) { tw(w, K, { fy: -110, frot: Math.PI }, 0.22, "out", () => tw(w, K, { fy: 0, frot: TAU }, 0.2, "in", () => { K.frot = 0; K.fsx = 1.3; K.fsy = 0.6; })); } },
        { id: "burst", name: { en: "Done Burst", ko: "완성 표시" }, param: "steam + DONE! + flash",
          cap: { en: "Puff of *steam*, a big *DONE!*, bar flashes.", ko: "김이 *푹*, *완성!* 글자, 막대도 번쩍." },
          done(w, K) {
            K.flash = 1; w.spawn({ type: "text", text: "DONE!", x: 270, y: 160, vy: -30, life: 1, size: 34, color: "#4ade80" });
            for (let i = 0; i < 10; i++) w.spawn({ type: "smoke", x: 270 + rand(-50, 50), y: G - 30, vx: rand(-80, 80), vy: rand(-160, -80), drag: 2, size: 10, size1: 30, life: 0.9, color: "240,240,245" });
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "sizzle loop / ding",
          cap: { en: "A soft *sizzle* loop, a clear *ding* when done.", ko: "*지글지글* 깔고, 다 되면 *띵*." },
          update(w) {
            const K = w.K;
            if (K.cook && Math.random() < 0.12) w.play(() => nz({ type: "highpass", f: 5000, dur: 0.12, vol: 0.12 }));
          },
          done(w) { w.sfx.chime(5); } },
      ],
    },

    /* ───────── 5. 작물 성장 단계 ───────── */
    {
      id: "sim-crop", cat: "sim", view: "iso",
      title: { en: "Make crops *grow*, not swap", ko: "작물이 *자라는* 느낌" },
      intro: { en: "Sprite swap. Sprite swap. *Snore.*", ko: "그림만 바뀌어요. *휙, 휙*." },
      interval: 0.9, stepDur: 3.6,
      drawFloor(w, ctx) { isoFloor(ctx, (gx, gy) => gx >= 1 && gx <= 3 && gy >= 1 && gy <= 3 ? "rgba(120,72,40,0.75)" : null); },
      setup(w) {
        w.plots = [];
        for (let gy = 1; gy <= 3; gy++) for (let gx = 1; gx <= 3; gx++) w.plots.push({ gx, gy, st: 1, sy: 1, delay: 0 });
      },
      fire(w) {
        for (const p of w.plots) {
          p.delay = 0; w.emit("grow", p);
          w.after(p.delay, () => { p.st = (p.st + 1) % 4; w.emit("pop", p); });
        }
      },
      drawFront(w, ctx) {
        for (const p of w.plots) {
          const c = isoPt(p.gx + 0.5, p.gy + 0.5);
          ctx.save(); ctx.translate(c.x, c.y + 4); ctx.scale(1 / Math.sqrt(Math.max(0.3, p.sy)), p.sy);
          ctx.fillStyle = "rgba(60,30,10,0.6)"; ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, 0, 0, TAU); ctx.fill();
          const leaf = (x, y, rx, ry, a, col) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill(); ctx.restore(); };
          if (p.st === 0) { ctx.fillStyle = "#a16207"; ctx.beginPath(); ctx.ellipse(0, -3, 6, 4, 0, 0, TAU); ctx.fill(); }
          if (p.st >= 1) { ctx.strokeStyle = "#65a30d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -12 - p.st * 10); ctx.stroke(); }
          if (p.st === 1) { leaf(-6, -12, 8, 4, -0.4, "#84cc16"); leaf(6, -14, 8, 4, 0.4, "#a3e635"); }
          if (p.st >= 2) for (let i = 0; i < (p.st === 2 ? 4 : 7); i++) leaf(Math.cos(i * 2.4) * (8 + p.st * 3), -14 - p.st * 6 + Math.sin(i * 2.4) * 10, 12, 7, i * 0.9, i % 2 ? "#65a30d" : "#84cc16");
          if (p.st === 3) for (let i = 0; i < 3; i++) { const x = (i - 1) * 13, y = -26 + (i % 2) * 10; ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(x - 2, y - 3, 2, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
      },
      steps: [
        { id: "stretch", name: { en: "Stretch Pop", ko: "쑥 늘어나기" }, param: "sy .3 → 1 back",
          cap: { en: "Squash it down, then let it *spring up*.", ko: "꾹 눌렀다가 *쑥* 솟아나요." },
          pop(w, p) { p.sy = 0.3; w.tween(p, { sy: 1 }, 0.4, "back"); } },
        { id: "wave", name: { en: "Ripple Wave", ko: "물결처럼 차례로" }, param: "70ms per tile",
          cap: { en: "Don't grow all at once. *Ripple* across the field.", ko: "한꺼번에 말고 *파도처럼* 차례로." },
          grow(w, p) { p.delay = (p.gx + p.gy) * 0.07; } },
        { id: "leaves", name: { en: "Leaf Burst", ko: "잎사귀 팡" }, param: "5 leaves",
          cap: { en: "A few *leaves* fly off each pop.", ko: "자랄 때마다 *잎사귀*가 팔랑." },
          pop(w, p) {
            const c = isoPt(p.gx + 0.5, p.gy + 0.5);
            for (let i = 0; i < 5; i++) w.spawn({ type: "chunk", x: c.x, y: c.y - 20, vx: rand(-140, 140), vy: rand(-260, -120), g: 700, vr: rand(-10, 10), size: 4, life: 0.6, color: pick(["132,204,22", "163,230,53", "101,163,13"]) });
          } },
        { id: "puff", name: { en: "Soil Puff", ko: "흙먼지 링" }, param: "flat ring + dust",
          cap: { en: "A *ring of dust* where it pushes out of the soil.", ko: "흙을 뚫고 나오는 자리에 *먼지 고리*." },
          pop(w, p) {
            const c = isoPt(p.gx + 0.5, p.gy + 0.5);
            w.spawn({ type: "ring", flat: true, x: c.x, y: c.y + 4, size: 6, size1: 34, life: 0.35, w: 4, color: "214,180,140" });
          } },
        { id: "ripe", name: { en: "Ripe Twinkle", ko: "다 익으면 반짝" }, param: "star / 0.3s",
          cap: { en: "Ripe ones *twinkle*. \"Pick me!\"", ko: "다 익은 건 *반짝반짝*. \"나 따 줘!\"" },
          update(w) {
            for (const p of w.plots) if (p.st === 3 && Math.random() < 0.04) {
              const c = isoPt(p.gx + 0.5, p.gy + 0.5);
              w.spawn({ type: "star", x: c.x + rand(-16, 16), y: c.y - rand(20, 40), size: rand(8, 13), life: 0.4, color: "255,250,200" });
            }
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "pop · pitch by stage",
          cap: { en: "Each pop a *note*. Higher stage, *higher* note.", ko: "자랄 때마다 *뿅*. 단계가 높을수록 *높게*." },
          pop(w, p) { w.sfx.blip(p.st * 4 + p.gx); } },
      ],
    },

    /* ───────── 6. 수확 ───────── */
    {
      id: "sim-harvest", cat: "sim", view: "iso",
      title: { en: "Make harvesting *juicy*", ko: "수확을 *쏙쏙* 손맛 있게" },
      intro: { en: "Tap. Gone. *+3.*", ko: "누르면 사라지고 *+3*. 끝." },
      interval: 0.8, stepDur: 3.6,
      drawFloor(w, ctx) { isoFloor(ctx, (gx, gy) => gx >= 1 && gx <= 3 && gy >= 1 && gy <= 3 ? "rgba(120,72,40,0.75)" : null); },
      setup(w) {
        w.S = { row: 0, count: 24, bump: 0, combo: 0 }; w.flyers = [];
        w.cs = []; for (let gy = 1; gy <= 3; gy++) for (let gx = 1; gx <= 3; gx++) w.cs.push({ gx, gy, has: true, lift: 0, sy: 1, wait: 0, flies: false });
      },
      fire(w) {
        const S = w.S; if (S.row >= 3) return;
        const row = w.cs.filter(c => c.gy === S.row + 1); S.row++;
        if (S.row === 3) w.after(1.2, () => { S.row = 0; S.combo = 0; for (const c of w.cs) { Object.assign(c, { has: true, lift: 0, sy: 1, wait: 0, flies: false }); w.emit("regrow", c); } });
        row.forEach((c, i) => {
          c.i = i; w.emit("pull", c);
          w.after(c.wait, () => { c.has = false; w.emit("pick", c); if (!c.flies) S.count++; });
        });
      },
      update(w, dt) { flyStep(w, dt); w.S.bump = Math.max(0, w.S.bump - dt * 5); },
      drawFront(w, ctx) {
        for (const c of w.cs) {
          if (!c.has) continue;
          const p = isoPt(c.gx + 0.5, c.gy + 0.5);
          ctx.fillStyle = "rgba(50,25,8,0.7)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 12, 5, 0, 0, TAU); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.rect(p.x - 40, p.y - 120, 80, 122); ctx.clip();
          ctx.translate(p.x, p.y + 4 - c.lift * 44); ctx.rotate(c.lift * 0.5); ctx.scale(1, c.sy);
          ICO.carrot(ctx, 48); ctx.restore();
        }
      },
      drawHud(w, ctx) { flyDraw(w, ctx); wallet(ctx, 220, 26, String(w.S.count), w.S.bump, "carrot", 92); },
      steps: [
        { id: "pull", name: { en: "Pull Out", ko: "쑥 뽑기" }, param: "lift 40px · 300ms",
          cap: { en: "*Pull* it out of the ground before it goes.", ko: "사라지기 전에 땅에서 *쑥* 뽑혀요." },
          pull(w, c) { c.wait = 0.3 + c.i * 0.08; w.after(c.i * 0.08, () => w.tween(c, { lift: 1 }, 0.22, "back")); } },
        { id: "fly", name: { en: "Fly to Basket", ko: "바구니로 슝" }, param: "arc 550ms · ease-in",
          cap: { en: "Then it *flies* to your stock.", ko: "그리고 창고로 *슝* 날아가요." },
          pick(w, c) {
            c.flies = true;
            const p = isoPt(c.gx + 0.5, c.gy + 0.5);
            flyer(w, { k: "carrot", s: 34, spin: 12, x0: p.x, y0: p.y - 40, x1: 220, y1: 26, dur: 0.55, end: () => { w.S.count++; w.emit("arrive"); } });
          } },
        { id: "dirt", name: { en: "Dirt Kick", ko: "흙 튀기" }, param: "6 clods",
          cap: { en: "Kick up a few *clods* of dirt.", ko: "*흙덩이*가 툭툭 튀어요." },
          pull(w, c) {
            const p = isoPt(c.gx + 0.5, c.gy + 0.5);
            for (let i = 0; i < 6; i++) w.spawn({ type: "chunk", x: p.x, y: p.y, vx: rand(-150, 150), vy: rand(-280, -120), g: 1000, vr: rand(-12, 12), size: rand(2.5, 4.5), life: 0.55, color: "120,72,40" });
          } },
        { id: "bump", name: { en: "Counter Bump", ko: "숫자 칸 톡" }, param: "scale 1.35",
          cap: { en: "Every carrot *bumps* the counter.", ko: "당근이 들어올 때마다 숫자 칸이 *톡*." },
          arrive(w) { w.S.bump = 1; } },
        { id: "regrow", name: { en: "Regrow Pop", ko: "다시 쏙" }, param: "sy .2 → 1 · staggered",
          cap: { en: "Regrow with a *pop*, not a blink.", ko: "다시 날 땐 깜빡 말고 *쏙쏙*." },
          regrow(w, c) { c.sy = 0; w.after((c.gx + c.gy) * 0.05, () => w.tween(c, { sy: 1 }, 0.35, "back")); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "pluck · rising blips",
          cap: { en: "*Pluck!* Then notes that *climb* per carrot.", ko: "*뽁!* 들어올수록 음이 *올라가요*." },
          pull(w) { w.sfx.pop(); },
          arrive(w) { w.sfx.blip(++w.S.combo); } },
      ],
    },
    /* ───────── 7. 건물 업그레이드 ───────── */
    {
      id: "sim-upgrade", cat: "sim", view: "iso",
      title: { en: "Make upgrades feel *big*", ko: "업그레이드를 *크게* 느끼게" },
      intro: { en: "Lv.2. The sprite just… *changed*.", ko: "레벨업. 그림만 *휙* 바뀌어요." },
      interval: 1.5, stepDur: 3.8,
      drawFloor(w, ctx) { isoFloor(ctx); },
      setup(w) {
        const W = 200, H = 320;
        iso3("sim-up1", () => [P(blk(0, 0, 0, 100, 56, 100), CL.wall), roof(60, 56, 44, CL.red), P(blk(-14, 0, 50, 24, 38, 3), CL.dark), P(blk(-51, 20, 0, 2, 20, 34), CL.blue), P(blk(24, 20, 51, 26, 20, 2), CL.blue)], W, H);
        iso3("sim-up2", () => [P(blk(0, 0, 0, 100, 60, 100), CL.wall), P(blk(0, 58, 0, 112, 6, 112), CL.wood), P(blk(0, 64, 0, 92, 52, 92), CL.wall), roof(60, 116, 48, CL.blue),
          P(blk(-14, 0, 50, 24, 40, 3), CL.dark), P(blk(24, 20, 51, 26, 22, 2), CL.blue), P(blk(-14, 80, 47, 26, 22, 2), CL.blue), P(blk(20, 80, 47, 26, 22, 2), CL.blue), P(blk(-47, 80, 0, 2, 22, 40), CL.blue)], W, H);
        iso3("sim-up3", () => [P(blk(0, 0, 0, 100, 70, 100), CL.gray), P(blk(0, 70, 0, 120, 8, 120), CL.yellow), P(blk(0, 78, 0, 84, 70, 84), CL.wall), P(blk(0, 148, 0, 64, 40, 64), CL.wall),
          roof(40, 188, 50, CL.purple), P(blk(0, 238, 0, 3, 26, 3), CL.dark), P(blk(0, 252, 12, 2, 12, 22), CL.red),
          P(blk(-14, 0, 50, 30, 46, 3), CL.blue), P(blk(-42, 94, 0, 2, 36, 50), CL.blue), P(blk(0, 94, 42, 50, 36, 2), CL.blue), P(blk(0, 158, 32, 30, 20, 2), CL.yellow)], W, H);
        w.B = { lv: 1, sx: 1, sy: 1, wob: 0, badge: 0, glow: 0, wait: 0 };
      },
      fire(w) {
        const B = w.B; if (w.busy) return;
        w.busy = true; B.wait = 0; w.emit("pre", B);
        w.after(B.wait, () => { B.lv = B.lv % 3 + 1; w.emit("up", B); w.busy = false; });
      },
      update(w, dt) { const B = w.B; ease1(B, dt, 9); B.badge = Math.max(0, B.badge - dt * 2.5); B.glow = Math.max(0, B.glow - dt * 2); },
      drawFront(w, ctx) {
        const B = w.B, x = 270 + Math.sin(w.time * 80) * B.wob * 4;
        if (B.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, 200, 140, "198,244,50", B.glow * 0.6); ctx.globalCompositeOperation = "source-over"; }
        put(ctx, "sim-up" + B.lv, x, 238, 135, B.sx, B.sy, 1, "white", B.glow);
      },
      drawHud(w, ctx) {
        const B = w.B, s = 1 + B.badge * 0.8;
        ctx.save(); ctx.translate(410, 92); ctx.scale(s, s); ctx.rotate(-B.badge * 0.2);
        rr(ctx, -40, -18, 80, 36, 18, B.badge > 0.1 ? "#c6f432" : "rgba(0,0,0,0.6)", "rgba(255,255,255,0.2)", 1.5);
        txt(ctx, "Lv." + B.lv, 0, 1, 20, B.badge > 0.1 ? "#111" : "#fff", "center", 0);
        ctx.restore();
      },
      steps: [
        { id: "stretch", name: { en: "Stretch Pop", ko: "쭉 늘었다 착" }, param: "sy .5 → 1.15 → 1",
          cap: { en: "The new building *springs up* from the ground.", ko: "새 건물이 땅에서 *쭉* 솟아올라요." },
          up(w, B) { B.sx = 1.25; B.sy = 0.5; w.tween(B, { sx: 0.92, sy: 1.15 }, 0.12, "out"); } },
        { id: "dust", name: { en: "Dust Cover", ko: "먼지로 가리기" }, param: "14 puffs · ring",
          cap: { en: "A *dust cloud* hides the swap.", ko: "*먼지 구름*이 바뀌는 순간을 가려요." },
          up(w) {
            for (let i = 0; i < 14; i++) { const a = rand(0, TAU); w.spawn({ type: "smoke", x: 270 + Math.cos(a) * 60, y: 205 + Math.sin(a) * 30, vx: Math.cos(a) * rand(60, 160), vy: Math.sin(a) * rand(30, 80) - 30, drag: 3, size: 14, size1: 30, life: 0.7, color: "215,210,200" }); }
            w.spawn({ type: "ring", flat: true, x: 270, y: 215, size: 40, size1: 150, life: 0.45, w: 6, color: "230,225,215" });
          } },
        { id: "beam", name: { en: "Light Beam", ko: "빛기둥" }, param: "beam + white flash",
          cap: { en: "A *light beam* and a *white flash* on the building.", ko: "*빛기둥*이 내리꽂히고 건물이 *하얗게*." },
          up(w, B) {
            B.glow = 1;
            w.spawn({ type: "beam", x: 270, y: 225, size: 70, h: 260, life: 0.6, color: "198,244,50" });
          } },
        { id: "badge", name: { en: "Level Badge", ko: "레벨 배지" }, param: "scale 1.8 · lime",
          cap: { en: "The *level badge* pops and turns lime.", ko: "*레벨 배지*가 커졌다가 연두색으로." },
          up(w, B) { B.badge = 1; } },
        { id: "anticip", name: { en: "Anticipation", ko: "두근두근 예고" }, param: "shake 350ms · squash",
          cap: { en: "Shake and *squash down* first. Then release.", ko: "먼저 *부르르* 떨며 움츠렸다가, 펑." },
          pre(w, B) {
            B.wait = 0.35;
            B.wob = 1;
            w.tween(B, { sx: 1.12, sy: 0.82 }, 0.35, "in", () => { B.wob = 0; });
          } },
        { id: "stars", name: { en: "Star Burst", ko: "별 폭죽" }, param: "12 stars + shake",
          cap: { en: "*Stars* burst out. A small *shake*.", ko: "*별*이 사방으로, 화면은 살짝 *쿵*." },
          up(w) {
            w.shake(0.2);
            for (let i = 0; i < 12; i++) { const a = rand(-Math.PI, 0), v = rand(200, 420); w.spawn({ type: "star", x: 270, y: 140, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 500, drag: 2, size: rand(9, 15), life: 0.8, color: "253,224,71" }); }
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "rattle → fanfare",
          cap: { en: "Rising *rattle*, then a *fanfare*.", ko: "*덜덜덜* 모았다가 *빠밤!*" },
          pre(w) { w.sfx.charge(); },
          up(w) { w.sfx.boom(); w.sfx.fanfare(); } },
      ],
    },

    /* ───────── 8. 낮과 밤 ───────── */
    {
      id: "sim-daynight", cat: "sim", view: "iso",
      title: { en: "Make nightfall *cozy*", ko: "밤이 오는 걸 *포근하게*" },
      intro: { en: "Day. *Click.* Night.", ko: "낮. *딸깍.* 밤." },
      interval: 1.7, stepDur: 3.6,
      drawFloor(w, ctx) { isoFloor(ctx, (gx, gy) => gy === 2 ? "rgba(80,86,100,0.5)" : null); },
      setup(w) {
        const m = c => () => [P(blk(0, 0, 0, 80, 50, 80), CL.wall), roof(48, 50, 40, c), P(blk(-12, 0, 40, 20, 32, 3), CL.dark), P(blk(-41, 18, 0, 2, 18, 26), CL.blue), P(blk(20, 18, 41, 22, 18, 2), CL.blue)];
        iso3("sim-dn-a", m(CL.red), 160, 150); iso3("sim-dn-b", m(CL.teal), 160, 150); iso3("sim-dn-c", m(CL.purple), 160, 150);
        w.D = { t: 0, night: false, dur: 0, warm: 0, lamp: 0 };
        w.hs = [["sim-dn-a", 1.5, 0.9], ["sim-dn-b", 3.4, 0.7], ["sim-dn-c", 0.9, 3.4], ["sim-dn-a", 3.2, 3.6]].map(([k, gx, gy]) => {
          const p = isoPt(gx, gy), x = p.x, y = p.y + 30;
          return { k, x, y, wins: [at3(k, x, y, 96, -41, 27, 0), at3(k, x, y, 96, 20, 27, 41)].map(q => Object.assign(q, { l: 0 })) };
        }).sort((a, b) => a.y - b.y);
      },
      fire(w) {
        const D = w.D; D.night = !D.night; D.dur = 0;
        w.emit("toggle", D);
        w.tween(D, { t: D.night ? 1 : 0 }, Math.max(0.01, D.dur), "inout");
      },
      update(w) { w.D.warm = 0; },
      drawFront(w, ctx) {
        const D = w.D, lp = isoPt(2.6, 2.1);
        for (const h of w.hs) put(ctx, h.k, h.x, h.y, 96);
        ctx.strokeStyle = "#4b5563"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.lineTo(lp.x, lp.y - 70); ctx.lineTo(lp.x + 14, lp.y - 74); ctx.stroke();
        ctx.fillStyle = D.lamp > 0.5 ? "#fef08a" : "#9ca3af"; ctx.fillRect(lp.x + 8, lp.y - 76, 14, 7);
        ctx.fillStyle = `rgba(14,20,58,${0.66 * D.t})`; ctx.fillRect(-100, -100, 800, 600);
        if (D.warm > 0) { ctx.fillStyle = `rgba(251,113,60,${0.32 * D.warm})`; ctx.fillRect(-100, -100, 800, 600); }
        ctx.globalCompositeOperation = "lighter";
        for (const h of w.hs) for (const q of h.wins) if (q.l > 0) { glow(ctx, q.x, q.y, 26, "253,200,90", q.l * 0.9); glow(ctx, q.x, q.y, 8, "255,250,220", q.l); }
        if (D.lamp > 0) { const f = D.lamp * (0.85 + 0.15 * Math.sin(w.time * 23)); glow(ctx, lp.x + 15, lp.y - 70, 40, "254,240,138", f); ctx.save(); ctx.translate(lp.x + 15, lp.y); ctx.scale(1, 0.4); glow(ctx, 0, 0, 80, "254,220,120", f * 0.6); ctx.restore(); }
        ctx.globalCompositeOperation = "source-over";
      },
      drawHud(w, ctx) {
        const D = w.D, a = Math.PI * (1 + D.t);
        ctx.save(); ctx.translate(270, 46);
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.rotate(a); ctx.translate(-22, 0); ctx.rotate(-a);
        if (D.t < 0.5) { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = "#e0e7ff"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); ctx.fillStyle = "#1f2937"; ctx.beginPath(); ctx.arc(4, -3, 7, 0, TAU); ctx.fill(); }
        ctx.restore(); ctx.restore();
      },
      steps: [
        { id: "fade", name: { en: "Slow Fade", ko: "천천히 어두워짐" }, param: "1.1s ease-in-out",
          cap: { en: "Never cut to night. *Fade* into it.", ko: "밤은 딸깍 말고 *스르륵*." },
          toggle(w, D) { D.dur = 1.1; } },
        { id: "warm", name: { en: "Sunset Tint", ko: "노을빛" }, param: "orange at mid",
          cap: { en: "Pass through a warm *sunset orange*.", ko: "중간에 *주황 노을*을 한 번 지나요." },
          update(w) { w.D.warm = Math.sin(Math.PI * w.D.t); } },
        { id: "windows", name: { en: "Window Lights", ko: "창문 불빛" }, param: "random 0–0.8s each",
          cap: { en: "Windows light up *one by one*.", ko: "창문 불이 *하나씩* 켜져요." },
          toggle(w, D) { for (const h of w.hs) for (const q of h.wins) w.after(rand(0.2, 0.9), () => w.tween(q, { l: D.night ? 1 : 0 }, 0.15)); } },
        { id: "lamp", name: { en: "Street Lamp", ko: "가로등" }, param: "flicker on · pool",
          cap: { en: "The lamp *flickers on* and pools light.", ko: "가로등이 *깜빡* 켜지고 바닥을 비춰요." },
          toggle(w, D) { w.after(0.5, () => { D.lamp = D.night ? 0.3 : 0; w.after(0.1, () => { D.lamp = 0; w.after(0.08, () => { D.lamp = D.night ? 1 : 0; }); }); }); } },
        { id: "stars", name: { en: "Stars & Fireflies", ko: "별과 반딧불" }, param: "twinkle · drift",
          cap: { en: "*Stars* twinkle above, *fireflies* drift below.", ko: "위엔 *별*이 반짝, 아래엔 *반딧불*이 둥실." },
          update(w) {
            if (w.D.t < 0.6) return;
            if (Math.random() < 0.12) w.spawn({ type: "star", x: rand(30, 510), y: rand(44, 110), size: rand(4, 8), life: 0.8, color: "220,230,255" });
            if (Math.random() < 0.06) w.spawn({ type: "glow", x: rand(120, 420), y: rand(170, 280), vx: rand(-20, 20), vy: rand(-25, -5), size: 9, life: 1.4, color: "190,242,100" });
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "crickets / bird",
          cap: { en: "*Crickets* at night, a *chirp* at dawn.", ko: "밤엔 *귀뚤귀뚤*, 아침엔 *짹*." },
          toggle(w, D) {
            if (D.night) for (let i = 0; i < 6; i++) w.play(() => tn({ type: "square", f: 4200, dur: 0.03, vol: 0.04, delay: 0.5 + i * 0.07 }));
            else w.play(() => { tn({ f: 2400, f2: 3400, dur: 0.08, vol: 0.12, delay: 0.4 }); tn({ f: 2600, f2: 3600, dur: 0.08, vol: 0.12, delay: 0.52 }); });
          } },
      ],
    },

    /* ───────── 9. 빨리 감기 ───────── */
    {
      id: "sim-ffwd", cat: "sim", view: "iso",
      title: { en: "Make fast-forward *feel fast*", ko: "빨리 감기가 *빨라 보이게*" },
      intro: { en: "3× speed. Looks like *1.2×*.", ko: "3배속인데 *별 차이* 없어 보여요." },
      interval: 2.2, stepDur: 4.0,
      drawFloor(w, ctx) { isoFloor(ctx, (gx, gy) => gx === 0 || gy === 0 || gx === 4 || gy === 4 ? "rgba(70,74,88,0.7)" : "rgba(74,222,128,0.12)"); },
      setup(w) {
        mShop();
        w.S = { spd: 1, goal: 1, ramp: false, btn: 1, clock: 0, tint: 0 };
        w.cars = [0, 4, 8, 12].map((u, i) => ({ u, col: [["#f87171", "#b91c1c", "#991b1b"], ["#60a5fa", "#1d4ed8", "#1e3a8a"], ["#facc15", "#ca8a04", "#a16207"], ["#e5e7eb", "#9ca3af", "#6b7280"]][i] }));
      },
      carPos(u) { u = ((u % 16) + 16) % 16; const s = Math.floor(u / 4), f = u % 4; return [[f, 0], [4, f], [4 - f, 4], [0, 4 - f]][s].map(v => v + 0.5); },
      fire(w) {
        const S = w.S, tok = S.tok = (S.tok || 0) + 1;
        if (S.goal === 1) { S.goal = 3; w.emit("fast", S); if (!S.ramp) S.spd = 3; }
        w.after(1.4, () => { if (S.tok !== tok) return; S.goal = 1; w.emit("slow", S); if (!S.ramp) S.spd = 1; });
      },
      update(w, dt) {
        const S = w.S;
        for (const c of w.cars) c.u += dt * 1.2 * S.spd;
        S.clock += dt * S.spd * 2; S.btn += (1 - S.btn) * Math.min(1, dt * 10); S.tint = 0;
      },
      drawFront(w, ctx) {
        const R = this, order = w.cars.map(c => ({ c, p: R.carPos(c.u) }));
        const car = o => { drawCube(ctx, o.p[0] - 0.5, o.p[1] - 0.5, 12, o.c.col, 0.42, 1); const b = isoPt(o.p[0], o.p[1]); ctx.save(); ctx.translate(0, -12); drawCube(ctx, o.p[0] - 0.5, o.p[1] - 0.5, 9, ["#e0f2fe", "#64748b", "#475569"], 0.26, 1); ctx.restore(); return b; };
        order.filter(o => o.p[0] + o.p[1] < 5).forEach(car);
        put(ctx, "sim-shop", 270, 222, 150);
        order.filter(o => o.p[0] + o.p[1] >= 5).forEach(car);
        w.carPts = order.map(o => isoPt(o.p[0], o.p[1]));
      },
      drawHud(w, ctx) {
        const S = w.S;
        if (S.tint > 0) { const g = ctx.createRadialGradient(270, 180, 120, 270, 180, 330); g.addColorStop(0, "rgba(56,189,248,0)"); g.addColorStop(1, `rgba(56,189,248,${0.45 * S.tint})`); ctx.fillStyle = g; ctx.fillRect(-60, -60, 660, 480); }
        ctx.save(); ctx.translate(270, 46); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round";
        if (S.spd > 1.5 && w.on("clock")) { ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, 10, S.clock - 1.6 - Math.PI / 2, S.clock - Math.PI / 2); ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; }
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(S.clock - Math.PI / 2) * 17, Math.sin(S.clock - Math.PI / 2) * 17); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(S.clock / 12 - Math.PI / 2) * 11, Math.sin(S.clock / 12 - Math.PI / 2) * 11); ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.translate(456, 66); ctx.scale(S.btn, S.btn);
        const on = S.goal > 1;
        rr(ctx, -40, -18, 80, 36, 10, on ? "#c6f432" : "rgba(0,0,0,0.6)", "rgba(255,255,255,0.2)", 1.5);
        txt(ctx, on ? "▶▶ ×3" : "▶ ×1", 0, 1, 16, on ? "#111" : "#fff", "center", 0);
        ctx.restore();
      },
      steps: [
        { id: "button", name: { en: "Button Punch", ko: "버튼 톡" }, param: "scale 1.4 · lime",
          cap: { en: "The *×3 button* punches and lights up.", ko: "*×3 버튼*이 톡 튀며 불이 켜져요." },
          fast(w, S) { S.btn = 1.4; }, slow(w, S) { S.btn = 0.85; } },
        { id: "ramp", name: { en: "Speed Ramp", ko: "가속 램프" }, param: "250ms up · 400ms down",
          cap: { en: "*Ramp* the speed. Don't jump it.", ko: "속도는 점프 말고 *붕~* 올려요." },
          fast(w, S) { S.ramp = true; w.tween(S, { spd: 3 }, 0.25, "in"); }, slow(w, S) { w.tween(S, { spd: 1 }, 0.4, "out"); } },
        { id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "streaks while fast",
          cap: { en: "*Speed lines* rush across the screen.", ko: "*속도선*이 화면을 휙휙 지나가요." },
          update(w) { if (w.S.spd > 1.5 && Math.random() < 0.7) w.spawn({ type: "spark", x: rand(-40, 200), y: rand(60, 330), vx: 1400, vy: 700, size: 1.6, life: 0.3, color: "200,230,255" }); } },
        { id: "trails", name: { en: "Motion Trails", ko: "잔상" }, param: "glow trail / frame",
          cap: { en: "Cars leave *trails* behind them.", ko: "차 뒤로 *잔상*이 남아요." },
          update(w) { if (w.S.spd > 1.5 && w.carPts) for (const p of w.carPts) w.spawn({ type: "glow", x: p.x, y: p.y - 8, size: 12, size1: 2, life: 0.35, color: "160,210,255" }); } },
        { id: "clock", name: { en: "Clock Blur", ko: "시곗바늘 잔상" }, param: "hand smear",
          cap: { en: "The clock hand *smears* as it spins.", ko: "시곗바늘이 *휘리릭* 번져요." },
          fast(w) { w.spawn({ type: "ring", x: 270, y: 46, size: 24, size1: 44, life: 0.3, w: 4, color: "255,255,255" }); } },
        { id: "tint", name: { en: "Edge Tint", ko: "가장자리 물들이기" }, param: "cyan edge .45",
          cap: { en: "Tint the *edges*. You're in a different time now.", ko: "화면 *가장자리*를 물들여요. 시간이 다르게 흘러요." },
          update(w) { w.S.tint = Math.max(0, (w.S.spd - 1) / 2); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh up / down",
          cap: { en: "*Whoosh up* in, *wind down* out.", ko: "들어갈 때 *휘잉↑*, 나올 때 *휘잉↓*." },
          fast(w) { w.sfx.boost(); }, slow(w) { w.play(() => nz({ type: "bandpass", f: 2400, f2: 300, q: 1, dur: 0.5, vol: 0.3 })); } },
      ],
    },

    /* ───────── 10. 하루 마감 정산 ───────── */
    {
      id: "sim-summary", cat: "sim", view: "ui",
      title: { en: "Make the day's *results* rewarding", ko: "하루 *정산*을 뿌듯하게" },
      intro: { en: "A table of numbers. *Next.*", ko: "숫자 표 한 장. *다음.*" },
      interval: 3.0, stepDur: 4.2,
      drawFloor() {},
      setup(w) { w.D = { y: 0, best: 1500, day: 7, rows: [], tot: null, stars: [], rec: 0, a: 0 }; },
      fire(w) {
        const D = w.D; if (w.busy) return;
        w.busy = true; w.after(2.7, () => { w.busy = false; });
        const vals = [rand(30, 60) | 0, rand(900, 1500) | 0, rand(80, 220) | 0];
        D.day++; D.y = 0; D.a = 1; D.rec = 0;
        D.rows = ["Customers", "Sales", "Tips"].map((l, i) => ({ l, v: vals[i], shown: vals[i], vis: false, i, delay: 0, sc: 1 }));
        D.tot = { v: vals[1] + vals[2], shown: vals[1] + vals[2], vis: false, sc: 1, delay: 0 };
        D.stars = [0, 1, 2, 3, 4].map(i => ({ i, on: i < 4, vis: false, sc: 1, delay: 0 }));
        w.emit("open", D);
        for (const r of D.rows) { w.emit("row", r); w.after(r.delay, () => { r.vis = true; w.emit("show", r); }); }
        w.emit("total", D.tot); w.after(D.tot.delay, () => { D.tot.vis = true; w.emit("showTotal", D.tot, D); });
        for (const s of D.stars) { w.emit("star", s); w.after(s.delay, () => { s.vis = true; w.emit("showStar", s); }); }
      },
      update(w, dt) { const D = w.D; for (const r of D.rows.concat(D.tot || [])) r.sc += (1 - r.sc) * Math.min(1, dt * 10); for (const s of D.stars) s.sc += (1 - s.sc) * Math.min(1, dt * 10); },
      drawFront(w, ctx) {
        const D = w.D; if (!D.a) return;
        ctx.save(); ctx.globalAlpha = D.a; ctx.translate(0, D.y);
        rr(ctx, 130, 46, 280, 290, 16, "#1f2430", "rgba(255,255,255,0.15)", 2);
        rr(ctx, 130, 46, 280, 44, 16, "#c6f432"); ctx.fillStyle = "#c6f432"; ctx.fillRect(130, 74, 280, 16);
        txt(ctx, "DAY " + D.day + " CLOSED", 270, 69, 18, "#111", "center", 0);
        D.rows.forEach((r, i) => {
          if (!r.vis) return; const y = 118 + i * 38;
          txt(ctx, r.l, 156, y, 17, "#cbd5e1", "left", 0);
          ctx.save(); ctx.translate(384, y); ctx.scale(r.sc, r.sc); txt(ctx, (i ? "$" : "") + comma(r.shown), 0, 0, 19, "#fff", "right", 0); ctx.restore();
        });
        ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(152, 222, 236, 2);
        const T = D.tot;
        if (T && T.vis) { txt(ctx, "Total", 156, 248, 19, "#fff", "left", 0); ctx.save(); ctx.translate(384, 248); ctx.scale(T.sc, T.sc); txt(ctx, "$" + comma(T.shown), 0, 0, 24, T.gold ? "#fde047" : "#fff", "right", 0); ctx.restore(); }
        for (const s of D.stars) {
          if (!s.vis) continue;
          ctx.save(); ctx.translate(206 + s.i * 32, 296); ctx.scale(s.sc, s.sc); star5(ctx, 13);
          ctx.fillStyle = s.on ? "#facc15" : "#3f4655"; ctx.fill(); ctx.restore();
        }
        if (D.rec > 0) { ctx.save(); ctx.translate(372, 76); ctx.rotate(0.25); ctx.scale(D.rec, D.rec); rr(ctx, -66, -14, 132, 28, 6, "#ef4444"); txt(ctx, "NEW RECORD!", 0, 1, 15, "#fff", "center", 0); ctx.restore(); }
        ctx.restore();
      },
      steps: [
        { id: "slide", name: { en: "Panel Drop", ko: "패널 툭 떨어지기" }, param: "−300px → 0 back",
          cap: { en: "Drop the panel in with a little *bounce*.", ko: "패널이 위에서 *툭* 떨어지며 출렁." },
          open(w, D) { D.y = -320; w.tween(D, { y: 0 }, 0.45, "back"); } },
        { id: "stagger", name: { en: "Row by Row", ko: "한 줄씩" }, param: "300ms per row",
          cap: { en: "Reveal *one line at a time*. Build suspense.", ko: "*한 줄씩* 보여줘요. 기대감이 쌓여요." },
          row(w, r) { r.delay = 0.45 + r.i * 0.3; }, total(w, T) { T.delay = 1.45; }, star(w, s) { s.delay = 1.8 + s.i * 0.12; } },
        { id: "count", name: { en: "Count Up", ko: "숫자 올라가기" }, param: "0 → value · 400ms",
          cap: { en: "Every number *counts up* from zero.", ko: "숫자는 0부터 *도르륵* 올라가요." },
          show(w, r) { r.shown = 0; w.tween(r, { shown: r.v }, 0.4, "out"); }, showTotal(w, T) { T.shown = 0; w.tween(T, { shown: T.v }, 0.5, "out"); } },
        { id: "total", name: { en: "Total Punch", ko: "합계 쾅" }, param: "scale 1.8 · gold",
          cap: { en: "The *total* lands big and gold.", ko: "*합계*는 크게, 금색으로 쾅." },
          showTotal(w, T) { T.sc = 1.8; T.gold = true; w.shake(0.15); } },
        { id: "stars", name: { en: "Star Pops", ko: "별 하나씩 톡" }, param: "scale 1.8 · sparkle",
          cap: { en: "Stars *pop* one by one with a sparkle.", ko: "별이 하나씩 *톡톡*, 반짝." },
          showStar(w, s) {
            s.sc = 1.8;
            if (s.on) w.spawn({ type: "star", x: 206 + s.i * 32, y: 296, size: 26, life: 0.3, color: "255,240,180" });
          } },
        { id: "record", name: { en: "New Record", ko: "신기록" }, param: "ribbon + confetti",
          cap: { en: "Beat your best? *Ribbon* and *confetti*.", ko: "최고 기록이면 *리본*에 *꽃가루*까지." },
          showTotal(w, T, D) { w.tween(D, { rec: 1 }, 0.3, "back"); confetti(w, 270, 240, 30); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick rows · chime stars",
          cap: { en: "A *tick* per line, rising *chimes* for stars.", ko: "줄마다 *틱*, 별마다 *띵* 올라가는 음." },
          show(w, r) { w.sfx.tick(); w.sfx.blip(r.i * 2 + 1); }, showTotal(w) { w.sfx.thunk(); }, showStar(w, s) { if (s.on) w.sfx.chime(s.i * 2); } },
      ],
    },

    /* ───────── 11. 방치형 큰 숫자 ───────── */
    {
      id: "sim-bignum", cat: "sim", view: "ui",
      title: { en: "Make *huge numbers* readable", ko: "*엄청 큰 숫자*를 읽히게" },
      intro: { en: "1,284,019,337… *how much is that?*", ko: "1,284,019,337… *그래서 얼마예요?*" },
      interval: 0.7, stepDur: 3.6,
      drawFloor() {},
      setup(w) { w.N = { v: 1500, shown: 1500, label: "", col: "#fff", size: 30, sc: 1, rate: 0, tier: 1, log: false }; },
      fire(w) {
        const N = w.N, old = Math.floor(Math.log10(N.v) / 3);
        N.v *= rand(2.4, 4.2); if (N.v > 5e16) N.v = 1500;
        N.rate = N.v * 0.08;
        const t = Math.floor(Math.log10(N.v) / 3); N.tier = t;
        w.emit("gain", N);
        if (t > old) w.emit("unit", N, t);
      },
      update(w, dt) {
        const N = w.N;
        N.shown = N.log ? Math.exp(Math.log(N.shown) + (Math.log(N.v) - Math.log(N.shown)) * Math.min(1, dt * 6)) : N.v;
        N.label = comma(N.shown); N.size = 30; N.col = "#fff";
        N.sc += (1 - N.sc) * Math.min(1, dt * 9);
      },
      drawFront(w, ctx) {
        const N = w.N;
        glow(ctx, 270, 170, 170, "198,244,50", 0.05);
        ctx.save(); ctx.translate(270, 170); ctx.scale(N.sc, N.sc);
        ico(ctx, "coin", 0, -70, 44);
        ctx.save(); ctx.font = `800 ${N.size}px Pretendard, sans-serif`; const wd = ctx.measureText(N.label).width; if (wd > 470) ctx.scale(470 / wd, 1);
        txt(ctx, N.label, 0, 0, N.size, N.col, "center", 0.12); ctx.restore();
        ctx.restore();
      },
      steps: [
        { id: "suffix", name: { en: "Short Suffix", ko: "단위 붙이기" }, param: "K · M · B · T",
          cap: { en: "Nobody reads 13 digits. Use *K, M, B, T*.", ko: "13자리는 아무도 안 읽어요. *K, M, B*로." },
          update(w) { const N = w.N; N.label = fmt(N.shown); N.size = 72; } },
        { id: "roll", name: { en: "Log Roll", ko: "로그로 굴리기" }, param: "lerp in log space",
          cap: { en: "Roll the number in *log space*. Smooth at any size.", ko: "숫자는 *로그로* 굴려요. 크기에 상관없이 부드럽게." },
          gain(w, N) { N.log = true; } },
        { id: "color", name: { en: "Tier Colors", ko: "단위별 색" }, param: "K white → T purple",
          cap: { en: "Each unit gets its *own color*. Progress at a glance.", ko: "단위마다 *색*이 달라요. 성장이 한눈에." },
          update(w) {
            const N = w.N;
            N.col = ["#fff", "#e5e7eb", "#86efac", "#7dd3fc", "#fde047", "#f0abfc"][Math.min(5, Math.floor(Math.log10(N.shown) / 3))];
          } },
        { id: "punch", name: { en: "Unit Punch", ko: "단위 바뀔 때 쾅" }, param: "scale 1.5 + ring",
          cap: { en: "New unit? *Punch* it with a ring and a name.", ko: "단위가 바뀌면 *쾅*. 고리와 이름까지." },
          unit(w, N, t) {
            N.sc = 1.5; w.shake(0.2); w.spawn({ type: "ring", x: 270, y: 170, size: 60, size1: 240, life: 0.5, w: 10, color: "253,224,71" });
            w.spawn({ type: "text", text: ["", "THOUSAND!", "MILLION!", "BILLION!", "TRILLION!", "QUADRILLION!"][t], x: 270, y: 250, vy: -30, life: 1.1, size: 26, color: "#fde047" });
          } },
        { id: "rate", name: { en: "Per-Second Pops", ko: "초당 수입 팝" }, param: "+x/s floaters",
          cap: { en: "Little *+per second* pops keep it alive.", ko: "작은 *+초당 수입*이 계속 톡톡." },
          gain(w, N) { w.spawn({ type: "text", text: "+" + fmt(N.rate) + "/s", x: 270 + rand(-150, 150), y: 262 + rand(0, 30), vy: -50, life: 0.8, size: 18, color: "#86efac" }); } },
        { id: "rain", name: { en: "Coin Rain", ko: "동전 비" }, param: "tier × 2 coins",
          cap: { en: "Bigger tier, *more coins* raining behind.", ko: "단위가 클수록 *동전 비*도 많이." },
          gain(w, N) {
            for (let i = 0; i < N.tier * 2; i++)
              w.spawn({ type: "ghost", img: SPR.coin.c, top: true, w: 18, h: 18, alpha0: 0.8, add: false, under: true,
                x: rand(40, 500), y: rand(-20, 40), vy: rand(200, 320), g: 400, life: 1.2 });
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick · boom on unit",
          cap: { en: "Soft *ticks*, a deep *boom* on a new unit.", ko: "평소엔 *틱틱*, 단위 바뀌면 *쿵*." },
          gain(w) { w.sfx.tick(); }, unit(w, N, t) { w.sfx.slam(); w.sfx.chime(t * 2); } },
      ],
    },

    /* ───────── 12. 오프라인 보상 ───────── */
    {
      id: "sim-offline", cat: "sim", view: "ui",
      title: { en: "Make *welcome back* worth it", ko: "*돌아온 보상*을 반갑게" },
      intro: { en: "\"You earned 52K.\" *OK.*", ko: "\"52K 벌었어요.\" *네.*" },
      interval: 2.6, stepDur: 4.0,
      drawFloor() {},
      setup(w) { w.O = { a: 0, sc: 1, dim: 0, mins: 0, minsT: 0, v: 0, vT: 0, btn: 1, show: false, money: 18200, shown: 18200, bump: 0, gold: 0 }; w.flyers = []; },
      fire(w) {
        const O = w.O; if (w.busy) return; w.busy = true;
        O.minsT = 300 + ((Math.random() * 400) | 0); O.vT = O.minsT * 87; O.mins = O.minsT; O.v = O.vT; O.show = true; O.a = 1; O.btn = 1;
        w.emit("open", O);
        w.after(1.25, () => {
          w.emit("collect", O);
          O.show = false; O.a = 0;
          if (!O.paid) O.money += O.vT;
          w.after(0.9, () => { w.busy = false; O.paid = false; });
        });
      },
      update(w, dt) {
        const O = w.O; flyStep(w, dt);
        O.btn += (1 - O.btn) * Math.min(1, dt * 12); O.bump = Math.max(0, O.bump - dt * 5); O.dim = Math.max(0, O.dim - dt * 2);
        O.shown = w.on("bump") ? O.shown + (O.money - O.shown) * Math.min(1, dt * 6) : O.money;
      },
      drawFront(w, ctx) {
        const O = w.O;
        if (O.show && O.dim) { ctx.fillStyle = `rgba(0,0,0,${0.5 * Math.min(1, O.dim)})`; ctx.fillRect(-60, -60, 660, 480); }
        if (!O.show) return;
        ctx.save(); ctx.translate(270, 196); ctx.scale(O.sc, O.sc); ctx.globalAlpha = O.a;
        rr(ctx, -140, -126, 280, 252, 18, "#1f2430", "rgba(255,255,255,0.16)", 2);
        txt(ctx, "Welcome back!", 0, -98, 22, "#c6f432", "center", 0);
        const h = Math.floor(O.mins / 60), m = Math.floor(O.mins % 60);
        ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-74, -56, 13, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-74, -56); ctx.lineTo(-74 + Math.cos(O.mins / 9.55) * 10, -56 + Math.sin(O.mins / 9.55) * 10); ctx.stroke();
        txt(ctx, `Away ${h}h ${String(m).padStart(2, "0")}m`, -52, -56, 17, "#cbd5e1", "left", 0);
        if (O.gold) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, -6, 120, "250,204,21", 0.25 * O.gold); ctx.globalCompositeOperation = "source-over"; }
        ico(ctx, "coin", -78, -6, 34);
        txt(ctx, "$" + comma(O.v), -54, -4, 34, "#fde047", "left", 0);
        ctx.save(); ctx.translate(0, 74); ctx.scale(O.btn, 1 / O.btn);
        rr(ctx, -90, -24, 180, 48, 24, "#22c55e"); txt(ctx, "COLLECT", 0, 1, 20, "#fff", "center", 0); ctx.restore();
        ctx.restore();
      },
      drawHud(w, ctx) { flyDraw(w, ctx); wallet(ctx, 210, 24, "$" + comma(w.O.shown), w.O.bump, "coin", 130); },
      steps: [
        { id: "popup", name: { en: "Pop-up + Dim", ko: "팝업 + 배경 어둡게" }, param: "scale .4 → 1 back",
          cap: { en: "*Dim* the game and *pop* the panel in.", ko: "배경은 *어둡게*, 패널은 *톡* 등장." },
          open(w, O) { O.sc = 0.4; O.dim = 3; w.tween(O, { sc: 1 }, 0.35, "back"); } },
        { id: "clock", name: { en: "Time Spin", ko: "시간 돌리기" }, param: "0 → away · 600ms",
          cap: { en: "Spin the *clock* through the hours you were gone.", ko: "자리 비운 시간만큼 *시계*가 휘리릭." },
          open(w, O) { O.mins = 0; w.tween(O, { mins: O.minsT }, 0.6, "out"); } },
        { id: "count", name: { en: "Earnings Count", ko: "번 돈 올라가기" }, param: "0 → total · glow",
          cap: { en: "The earnings *count up* with a warm *glow*.", ko: "번 돈이 *도르륵* 올라가며 *반짝*." },
          open(w, O) {
            O.v = 0;
            w.after(0.25, () => w.tween(O, { v: O.vT }, 0.6, "out"));
            O.gold = 0;
            w.tween(O, { gold: 1 }, 0.8);
          } },
        { id: "press", name: { en: "Button Press", ko: "버튼 꾹" }, param: "squash .85 · ripple",
          cap: { en: "The button *squashes* and *ripples* on press.", ko: "버튼이 *꾹* 눌리고 *물결*이 퍼져요." },
          collect(w, O) {
            O.btn = 0.85;
            w.spawn({ type: "ring", flat: true, x: 270, y: 270, size: 80, size1: 160, life: 0.35, w: 5, color: "74,222,128" });
          } },
        { id: "shower", name: { en: "Coin Shower", ko: "동전 샤워" }, param: "16 coins · stagger",
          cap: { en: "A *shower of coins* flies into the wallet.", ko: "*동전 샤워*가 지갑으로 쏟아져요." },
          collect(w, O) {
            O.paid = true;
            for (let i = 0; i < 16; i++) flyer(w, { x0: 270 + rand(-60, 60), y0: 250, x1: 210, y1: 24, delay: i * 0.035, end: () => { O.money += O.vT / 16; w.emit("arrive"); } });
          } },
        { id: "bump", name: { en: "Wallet Bump", ko: "지갑 톡" }, param: "scale 1.35 · roll",
          cap: { en: "Wallet *bumps*, number *rolls*.", ko: "지갑이 *톡톡*, 숫자는 *도르륵*." },
          arrive(w) { w.O.bump = 1; } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh · coin patter",
          cap: { en: "A soft *whoosh* in, then a *patter* of coins.", ko: "*슝* 등장, 그다음 *짤랑짤랑*." },
          open(w) { w.sfx.swish(); w.after(0.3, () => w.sfx.chime(0)); }, arrive(w) { w.sfx.tick(); } },
      ],
    },
    /* ───────── 13. 환생(프레스티지) ───────── */
    {
      id: "sim-prestige", cat: "sim", view: "iso",
      title: { en: "Make prestige feel like a *rebirth*", ko: "환생을 *새 출발*처럼" },
      intro: { en: "Everything's gone. *Was that good?*", ko: "다 사라졌어요. *잘된 거예요?*" },
      interval: 2.8, stepDur: 4.2,
      drawFloor(w, ctx) { isoFloor(ctx); },
      setup(w) {
        mShop(); mHouse("sim-ph-a", CL.red); mHouse("sim-ph-b", CL.teal); mHouse("sim-ph-c", CL.purple);
        w.Pz = { stars: 2, mult: 1.5, bump: 0, orb: 0, wait: 0 }; w.flyers = [];
        w.bs = [["sim-ph-a", 1.2, 1, 84], ["sim-ph-b", 4, 1.2, 84], ["sim-shop", 2.5, 2.5, 130], ["sim-ph-c", 1, 4, 84], ["sim-ph-a", 4, 4, 84]]
          .map(([k, gx, gy, wd]) => { const p = isoPt(gx, gy); return { k, x: p.x, y: p.y + wd * 0.2, wd, s: 1, ox: 0, oy: 0 }; }).sort((a, b) => a.y - b.y);
      },
      fire(w) {
        const Pz = w.Pz; if (w.busy) return; w.busy = true;
        Pz.wait = 0; w.emit("charge", Pz);
        w.after(Pz.wait, () => {
          Pz.orb = 0; Pz.stars++; Pz.mult += 0.5;
          for (const b of w.bs) { b.s = 0; w.emit("reset", b); }
          w.emit("prestige", Pz);
          w.after(1.0, () => { for (const b of w.bs) { b.ox = 0; b.oy = 0; b.s = 1; w.emit("rebuild", b); } w.busy = false; });
        });
      },
      update(w, dt) { flyStep(w, dt); w.Pz.bump = Math.max(0, w.Pz.bump - dt * 4); },
      drawFront(w, ctx) {
        for (const b of w.bs) if (b.s > 0.01) put(ctx, b.k, b.x + b.ox, b.y + b.oy, b.wd, b.s, b.s);
        const o = w.Pz.orb;
        if (o > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, 170, 30 + o * 90, "216,180,254", 0.5 + o * 0.5); glow(ctx, 270, 170, 10 + o * 20, "255,255,255", 1); ctx.globalCompositeOperation = "source-over"; }
      },
      drawHud(w, ctx) { flyDraw(w, ctx); const Pz = w.Pz; wallet(ctx, 212, 26, `${Pz.stars}   ×${Pz.mult.toFixed(1)}`, Pz.bump, "pstar", 120); },
      steps: [
        { id: "implode", name: { en: "Implode", ko: "빨려 들어가기" }, param: "to center · 350ms in",
          cap: { en: "Don't delete the city. *Suck it in.*", ko: "도시를 지우지 말고 *쏙* 빨아들여요." },
          reset(w, b) { b.s = 1; w.tween(b, { ox: 270 - b.x, oy: 190 - b.y, s: 0 }, 0.35, "in"); } },
        { id: "charge", name: { en: "Charge-up", ko: "기 모으기" }, param: "600ms · rising shake",
          cap: { en: "*Charge* an orb first. Let the moment build.", ko: "먼저 빛을 *모아요*. 순간을 쌓아 올려요." },
          charge(w, Pz) { Pz.wait = 0.6; w.tween(Pz, { orb: 1 }, 0.6, "in"); },
          update(w) { if (w.Pz.orb > 0) w.shake(w.Pz.orb * 0.04); } },
        { id: "flash", name: { en: "Flash + Wave", ko: "번쩍 + 충격파" }, param: "white .9 · ring 300",
          cap: { en: "*White flash* and a shockwave. A clean slate.", ko: "*하얗게* 번쩍, 충격파. 깨끗한 새 판." },
          prestige(w) { w.after(0.33, () => { w.flash("255,255,255", 0.9); w.spawn({ type: "ring", x: 270, y: 190, size: 20, size1: 320, life: 0.6, w: 14, color: "216,180,254" }); }); } },
        { id: "payout", name: { en: "Star Payout", ko: "별 지급" }, param: "6 stars → counter",
          cap: { en: "Pay out *prestige stars* to the counter.", ko: "*환생 별*이 위쪽 칸으로 날아가요." },
          prestige(w, Pz) { for (let i = 0; i < 6; i++) flyer(w, { k: "pstar", s: 26, x0: 270, y0: 190, x1: 212, y1: 26, delay: 0.4 + i * 0.06, end: () => { Pz.bump = 1; } }); } },
        { id: "mult", name: { en: "Multiplier Reveal", ko: "배율 공개" }, param: "48px text · 1.2s",
          cap: { en: "Show *what you gained*: the new multiplier.", ko: "*얻은 것*을 보여줘요. 새 배율!" },
          prestige(w, Pz) { w.after(0.45, () => w.spawn({ type: "text", text: "×" + Pz.mult.toFixed(1) + " PROFIT", x: 270, y: 190, vy: -20, life: 1.3, size: 40, color: "#d8b4fe" })); } },
        { id: "rebuild", name: { en: "Fresh Sprouts", ko: "새싹처럼 다시" }, param: "stagger 90ms · back",
          cap: { en: "Rebuild with *pops*. A fresh start feels fresh.", ko: "*톡톡* 다시 세워요. 새 출발은 상큼하게." },
          rebuild(w, b) { b.s = 0; w.after(rand(0, 0.35), () => w.tween(b, { s: 1 }, 0.35, "back")); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge · boom · chimes",
          cap: { en: "Rising *charge*, deep *boom*, then bright *chimes*.", ko: "*우웅* 모으고, *쿵*, 맑은 *띠링*." },
          charge(w) { w.sfx.charge(); }, prestige(w) { w.after(0.33, () => w.sfx.boom()); w.after(0.5, () => w.sfx.fanfare()); } },
      ],
    },

    /* ───────── 14. 직원 고용 ───────── */
    {
      id: "sim-hire", cat: "sim", view: "iso",
      title: { en: "Give new hires an *entrance*", ko: "새 직원에게 *등장*을" },
      intro: { en: "Hired. *Blink*, they're there.", ko: "고용 완료. *깜빡*, 서 있어요." },
      interval: 0.9, stepDur: 3.6,
      drawFloor(w, ctx) { isoFloor(ctx); },
      setup(w) {
        mShop(); [CL.red, CL.blue, CL.yellow, CL.purple].forEach((c, i) => mPerson("sim-staff" + i, c));
        w.S = { n: 0, rate: 10, bump: 0 };
        w.ws = [[1, 4], [2, 3], [3, 2], [4, 1]].map(([gx, gy], i) => { const p = isoPt(gx + 0.5, gy + 0.5); return { i, gx, gy, x: p.x, y: p.y + 26, on: false, oy: 0, sx: 1, sy: 1, tag: 0, bob: 0 }; });
      },
      fire(w) {
        const S = w.S, b = w.ws.find(b => !b.on);
        if (!b) { for (const q of w.ws) q.on = false; S.rate = 10; return; }
        b.on = true; b.tag = 0; S.rate += 10; w.emit("hire", b);
      },
      update(w, dt) { w.S.bump = Math.max(0, w.S.bump - dt * 4); for (const b of w.ws) { ease1(b, dt, 10); b.bob = 0; b.tag = Math.max(0, b.tag - dt * 0.6); } },
      drawFront(w, ctx) {
        put(ctx, "sim-shop", 270, 172, 130);
        for (const b of w.ws) {
          drawCube(ctx, b.gx, b.gy, 16, ["#d6b48a", "#8b5e34", "#6b4423"], 0.62);
          if (!b.on) continue;
          put(ctx, "sim-staff" + b.i, b.x, b.y + b.oy + b.bob, 52, b.sx, b.sy);
          if (b.tag > 0) { const y = b.y + b.oy - 96 + Math.sin(w.time * 8) * 3; ctx.save(); ctx.globalAlpha = Math.min(1, b.tag * 3); rr(ctx, b.x - 24, y - 11, 48, 22, 11, "#c6f432"); txt(ctx, "NEW!", b.x, y + 1, 13, "#111", "center", 0); ctx.restore(); }
        }
      },
      drawHud(w, ctx) { wallet(ctx, 214, 26, w.S.rate + " /s", w.S.bump, "coin", 110); },
      steps: [
        { id: "drop", name: { en: "Drop In", ko: "위에서 툭" }, param: "−220px · ease-in",
          cap: { en: "Drop them in *from above*. Land with a *squash*.", ko: "*위에서 툭* 떨어져 *철퍼덕* 착지." },
          hire(w, b) {
            b.oy = -220;
            w.tween(b, { oy: 0 }, 0.28, "in", () => { b.sx = 1.3; b.sy = 0.7; w.emit("land", b); });
          } },
        { id: "dust", name: { en: "Landing Dust", ko: "착지 먼지" }, param: "ring + 8 puffs",
          cap: { en: "A *dust ring* sells the landing.", ko: "*먼지 고리*가 착지를 살려요." },
          land(w, b) {
            w.spawn({ type: "ring", flat: true, x: b.x, y: b.y, size: 10, size1: 60, life: 0.35, w: 5, color: "220,215,205" });
            for (let i = 0; i < 8; i++) w.spawn({ type: "smoke", x: b.x, y: b.y, vx: rand(-140, 140), vy: rand(-40, -5), drag: 3, size: 5, size1: 14, life: 0.5, color: "210,205,195" });
          } },
        { id: "spot", name: { en: "Spotlight", ko: "스포트라이트" }, param: "beam 600ms",
          cap: { en: "Give them a *spotlight* moment.", ko: "잠깐 *스포트라이트*를 비춰줘요." },
          hire(w, b) {
            w.spawn({ type: "beam", x: b.x, y: b.y, size: 30, h: 300, life: 0.7, color: "255,250,210" });
            w.spawn({ type: "ellipse", x: b.x, y: b.y, size: 40, life: 0.8, color: "255,250,210", under: true });
          } },
        { id: "tag", name: { en: "NEW! Tag", ko: "NEW! 꼬리표" }, param: "bobbing · 1.6s",
          cap: { en: "A bobbing *NEW!* tag. Who's the new one?", ko: "통통 뜨는 *NEW!* 꼬리표. 누가 새로 왔는지 보여요." },
          hire(w, b) { b.tag = 1; } },
        { id: "work", name: { en: "Get to Work", ko: "바로 일하기" }, param: "bob 12Hz · coins",
          cap: { en: "They *start working* right away. Bob, bob, coin.", ko: "바로 *일 시작*. 꼼지락, 꼼지락, 동전." },
          update(w) {
            for (const b of w.ws) if (b.on && b.oy === 0) {
              b.bob = -Math.abs(Math.sin(w.time * 12 + b.i)) * 5;
              if (Math.random() < 0.02) w.spawn({ type: "ghost", img: SPR.coin.c, top: true, w: 16, h: 16, alpha0: 1, add: false, x: b.x, y: b.y - 70, vy: -60, life: 0.6 });
            }
          } },
        { id: "stat", name: { en: "Stat Bump", ko: "생산량 톡" }, param: "+10/s text · bump",
          cap: { en: "Show *what they add*: +10/s, bumped.", ko: "*얼마나 보태는지*: +10/s, 톡." },
          hire(w, b) { w.after(0.3, () => { w.S.bump = 1; w.spawn({ type: "text", text: "+10/s", x: b.x, y: b.y - 120, vy: -40, life: 0.9, size: 20, color: "#86efac" }); }); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "whistle · thud · chime",
          cap: { en: "Falling *whistle*, a *thud*, a cheerful *chime*.", ko: "*휘이* 떨어지고 *쿵*, 그리고 *띠링*." },
          hire(w) { w.play(() => tn({ f: 1400, f2: 500, dur: 0.28, vol: 0.1 })); }, land(w) { w.sfx.land(); w.sfx.chime(4); } },
      ],
    },

    /* ───────── 15. 생산 체인 ───────── */
    {
      id: "sim-chain", cat: "sim", view: "iso",
      title: { en: "Make production chains *flow*", ko: "생산 체인이 *흐르게*" },
      intro: { en: "Wheat. Flour. Bread. *Teleporting.*", ko: "밀, 밀가루, 빵이 *순간이동*해요." },
      interval: 1.1, stepDur: 3.8,
      drawFloor(w, ctx) {
        isoFloor(ctx, (gx, gy) => gx + gy === 4 || gx + gy === 5 ? "rgba(90,96,112,0.55)" : null);
        const S = w.S, a = 0.18 + S.pulse * 0.7;
        ctx.save(); ctx.strokeStyle = `rgba(198,244,50,${a})`; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -w.time * 60 * S.pulse;
        ctx.beginPath(); ctx.moveTo(171, 236); ctx.lineTo(369, 236); ctx.stroke(); ctx.restore();
      },
      setup(w) {
        mHouse("sim-farm", CL.green); mHouse("sim-mill", CL.blue); mHouse("sim-bake", CL.pink);
        w.S = { count: 30, bump: 0, pulse: 0 }; w.flyers = []; w.items = [];
        w.B = [["sim-farm", 171], ["sim-mill", 270], ["sim-bake", 369]].map(([k, x]) => ({ k, x, y: 214, sx: 1, sy: 1, sh: 0 }));
      },
      fire(w) {
        const S = w.S, B = w.B, it = { k: "wheat", x: B[0].x, y: 240, sc: 1, vis: true, t: 0, going: false };
        w.items.push(it); w.emit("make", it);
        const leg = i => {
          Object.assign(it, { from: B[i], to: B[i + 1], t: 0, going: true }); w.emit("leg", it);
          w.after(0.5, () => {
            Object.assign(it, { going: false, vis: false, x: B[i + 1].x }); w.emit("intake", it, B[i + 1]);
            w.after(0.3, () => {
              it.k = ["flour", "bread"][i]; it.vis = true; w.emit("out", it, B[i + 1], i);
              if (i === 0) leg(1);
              else w.after(0.3, () => { it.dead = true; w.emit("ship", it); if (!it.flies) S.count++; });
            });
          });
        };
        w.after(0.15, () => leg(0));
      },
      update(w, dt) {
        const S = w.S; flyStep(w, dt); S.bump = Math.max(0, S.bump - dt * 5); S.pulse = Math.max(0, S.pulse - dt * 1.2);
        for (const b of w.B) { ease1(b, dt, 10); b.sh = Math.max(0, b.sh - dt); }
        for (const it of w.items) if (it.going) { it.t = Math.min(1, it.t + dt / 0.5); if (it.move) it.x = it.from.x + (it.to.x - it.from.x) * E.inout(it.t); }
        w.items = w.items.filter(it => !it.dead);
      },
      drawFront(w, ctx) {
        for (const b of w.B) put(ctx, b.k, b.x + (b.sh > 0 ? Math.sin(w.time * 90) * 2 : 0), b.y, 96, b.sx, b.sy);
        for (const it of w.items) if (it.vis) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(it.x, it.y + 12, 13, 4, 0, 0, TAU); ctx.fill(); ico(ctx, it.k, it.x, it.y - 6, 34 * it.sc); }
      },
      drawHud(w, ctx) { flyDraw(w, ctx); wallet(ctx, 220, 26, String(w.S.count), w.S.bump, "bread", 92); },
      steps: [
        { id: "travel", name: { en: "Travel", ko: "길 따라 이동" }, param: "500ms ease-in-out",
          cap: { en: "Let goods *travel*. Now you can follow them.", ko: "물건이 길을 따라 *이동*해요. 눈으로 따라가져요." },
          leg(w, it) { it.move = true; } },
        { id: "path", name: { en: "Flowing Path", ko: "흐르는 길" }, param: "marching dashes",
          cap: { en: "The road *flows* while goods move.", ko: "물건이 지나갈 땐 길도 *흘러요*." },
          leg(w) { w.S.pulse = 1; } },
        { id: "gulp", name: { en: "Gulp", ko: "꿀꺽" }, param: "squash .82 · shake 300ms",
          cap: { en: "Buildings *gulp* the input and rattle while working.", ko: "건물이 *꿀꺽* 삼키고 일하며 *달달*." },
          intake(w, it, b) { b.sx = 1.15; b.sy = 0.82; b.sh = 0.3; } },
        { id: "morph", name: { en: "Transform Pop", ko: "변신 톡" }, param: "scale 0 → 1 · star",
          cap: { en: "The new product *pops out* with a sparkle.", ko: "새 물건은 반짝이며 *톡* 튀어나와요." },
          out(w, it, b) {
            it.sc = 0;
            w.tween(it, { sc: 1 }, 0.3, "back");
            w.spawn({ type: "star", x: b.x, y: 232, size: 26, life: 0.25, color: "255,255,255" });
          } },
        { id: "ship", name: { en: "Ship to Stock", ko: "창고로 출고" }, param: "fly → counter · bump",
          cap: { en: "Finished goods *fly to the counter*.", ko: "완성품은 *숫자 칸*으로 날아가요." },
          ship(w, it) {
            it.flies = true;
            flyer(w, { k: "bread", s: 30, x0: it.x, y0: 230, x1: 220, y1: 26, end: () => { w.S.count++; w.S.bump = 1; } });
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk · rising pops",
          cap: { en: "*Thunk* in, *pop* out. Pitch rises down the line.", ko: "들어갈 땐 *쿵*, 나올 땐 *뽁*. 갈수록 음이 높아져요." },
          intake(w) { w.sfx.thunk(); }, out(w, it, b, i) { w.sfx.blip(4 + i * 5); } },
      ],
    },

    /* ───────── 16. 제작 완료 ───────── */
    {
      id: "sim-craft", cat: "sim", view: "ui",
      title: { en: "Make crafting *satisfying*", ko: "제작 완료를 *짜릿하게*" },
      intro: { en: "Materials gone. Item there. *Meh.*", ko: "재료 사라지고 아이템 생김. *음.*" },
      interval: 2.2, stepDur: 4.0,
      drawFloor() {},
      setup(w) { w.C = { ins: [["log", 120], ["ingot", 182], ["gem", 244]].map(([k, y]) => ({ k, y, a: 1 })), has: false, sc: 1, ring: 0, glow: 0, tag: 0, wait: 0 }; w.flyers = []; },
      fire(w) {
        const C = w.C; if (w.busy) return; w.busy = true;
        C.wait = 0; for (const i of C.ins) i.a = 0;
        w.emit("craft", C);
        w.after(C.wait, () => {
          C.has = true; C.ring = 0; w.emit("done", C);
          w.after(1.2, () => { C.has = false; C.tag = 0; C.glow = 0; for (const i of C.ins) i.a = 1; w.busy = false; });
        });
      },
      update(w, dt) { flyStep(w, dt); },
      drawFront(w, ctx) {
        const C = w.C;
        rr(ctx, 100, 64, 340, 232, 18, "#1f2430", "rgba(255,255,255,0.14)", 2);
        for (const i of C.ins) { rr(ctx, 136, i.y - 28, 56, 56, 10, "#2b3140", "rgba(255,255,255,0.1)", 1.5); if (i.a > 0) ico(ctx, i.k, 164, i.y, 40, 0, i.a); }
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.moveTo(236, 166); ctx.lineTo(276, 166); ctx.lineTo(276, 154); ctx.lineTo(300, 182); ctx.lineTo(276, 210); ctx.lineTo(276, 198); ctx.lineTo(236, 198); ctx.closePath(); ctx.fill();
        if (C.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 364, 182, 90, "56,189,248", C.glow * 0.9); ctx.globalCompositeOperation = "source-over"; }
        rr(ctx, 320, 138, 88, 88, 14, "#2b3140", C.has ? "#38bdf8" : "rgba(255,255,255,0.1)", 2.5);
        if (C.ring > 0) { ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(364, 182, 54, -Math.PI / 2, -Math.PI / 2 + TAU * C.ring); ctx.stroke(); }
        if (C.has) ico(ctx, "pick", 364, 182, 64 * C.sc);
        if (C.tag > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, C.tag); ctx.translate(364, 262 + (1 - C.tag) * 20); txt(ctx, "Crystal Pickaxe", 0, 0, 16, "#fff"); txt(ctx, "RARE", 0, 20, 13, "#38bdf8"); ctx.restore(); }
      },
      drawHud(w, ctx) { flyDraw(w, ctx); },
      steps: [
        { id: "fly", name: { en: "Materials Fly In", ko: "재료가 날아 들어감" }, param: "3 arcs · 450ms",
          cap: { en: "Materials *fly into* the result slot.", ko: "재료가 결과 칸으로 *슝슝* 들어가요." },
          craft(w, C) {
            C.wait = 0.5;
            C.ins.forEach((i, n) => flyer(w, { k: i.k, s: 40, x0: 164, y0: i.y, x1: 364, y1: 182, cy: i.y - 60, delay: n * 0.06, dur: 0.42 }));
          } },
        { id: "ring", name: { en: "Progress Ring", ko: "진행 고리" }, param: "fill 500ms",
          cap: { en: "A short *progress ring*. Tiny wait, big payoff.", ko: "짧은 *진행 고리*. 조금 기다리면 더 반가워요." },
          craft(w, C) { const t0 = C.wait; C.wait += 0.5; w.after(t0, () => w.tween(C, { ring: 1 }, 0.5, "lin")); } },
        { id: "flash", name: { en: "Flash Burst", ko: "번쩍 터짐" }, param: "rays + 14 sparks",
          cap: { en: "*Burst* of light where the item forms.", ko: "아이템이 생기는 곳에서 빛이 *팡*." },
          done(w) {
            w.spawn({ type: "rays", x: 364, y: 182, size: 130, n: 12, vr: 1.2, life: 0.9, color: "125,211,252" });
            sparks(w, 364, 182, 14, "186,230,253", [200, 500]);
            w.spawn({ type: "glow", x: 364, y: 182, size: 90, size1: 20, life: 0.3, color: "255,255,255" });
          } },
        { id: "pop", name: { en: "Item Pop", ko: "아이템 톡" }, param: "scale 0 → 1 back · glow",
          cap: { en: "The item *pops* in, glowing its rarity color.", ko: "아이템이 *톡*, 등급 색으로 빛나요." },
          done(w, C) { C.sc = 0; w.tween(C, { sc: 1 }, 0.35, "back"); C.glow = 1; } },
        { id: "tag", name: { en: "Name Tag", ko: "이름표" }, param: "slide up 300ms",
          cap: { en: "Slide up its *name* and *rarity*.", ko: "*이름*과 *등급*이 스윽 올라와요." },
          done(w, C) { w.tween(C, { tag: 1 }, 0.3, "out"); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh · clinks · chime",
          cap: { en: "*Whoosh*, a few *clinks*, then a bright *chime*.", ko: "*슝*, *땅땅*, 맑은 *띠링*." },
          craft(w, C) {
            w.sfx.swish();
            for (let i = 0; i < 3; i++) w.after(0.5 + i * 0.16, () => w.play(() => tn({ type: "triangle", f: 1800, dur: 0.08, vol: 0.12 })));
          },
          done(w) { w.sfx.chime(7); } },
      ],
    },

    /* ───────── 17. 별점 ───────── */
    {
      id: "sim-rating", cat: "sim", view: "ui",
      title: { en: "Make star ratings *sparkle*", ko: "별점이 *반짝이게*" },
      intro: { en: "Five stars. Felt like *one*.", ko: "별 다섯 개인데 *한 개* 받은 기분." },
      interval: 1.4, stepDur: 3.8,
      drawFloor() {},
      setup(w) { w.Rt = { stars: [0, 1, 2, 3, 4].map(i => ({ i, f: 0, sc: 1, rot: 0, delay: 0 })), avg: 4.21, shown: 4.21, cnt: 128, dir: 0, arrow: 0, n: 0, from: 4.21 }; },
      fire(w) {
        const Rt = w.Rt, r = [5, 4, 5, 3, 5][Rt.n++ % 5];
        const old = Rt.avg; Rt.avg = (Rt.avg * Rt.cnt + r) / (Rt.cnt + 1); Rt.cnt++; Rt.dir = Rt.avg >= old ? 1 : -1;
        let last = 0;
        for (const s of Rt.stars) {
          s.f = 0; if (s.i >= r) continue;
          s.delay = 0; w.emit("star", s); last = Math.max(last, s.delay);
          w.after(s.delay, () => { s.f = 1; w.emit("fill", s); });
        }
        w.emit("rate", Rt);
        if (r === 5) w.after(last + 0.05, () => w.emit("perfect", Rt));
      },
      update(w, dt) { const Rt = w.Rt; for (const s of Rt.stars) { s.sc += (1 - s.sc) * Math.min(1, dt * 9); s.rot -= s.rot * Math.min(1, dt * 9); } Rt.arrow = Math.max(0, Rt.arrow - dt * 1.2); Rt.shown = Rt.avg; },
      drawFront(w, ctx) {
        const Rt = w.Rt;
        for (const s of Rt.stars) {
          ctx.save(); ctx.translate(110 + s.i * 80, 150); ctx.rotate(s.rot); ctx.scale(s.sc, s.sc);
          star5(ctx, 32, 14); ctx.fillStyle = s.f ? "#facc15" : "#2b3140"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = s.f ? "#a16207" : "#4b5563"; ctx.stroke();
          if (s.f) { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(-8, -8, 7, 4, -0.6, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
        txt(ctx, Rt.shown.toFixed(2), 250, 250, 40, "#fff", "right", 0);
        txt(ctx, `(${Rt.cnt} reviews)`, 262, 254, 16, "#94a3b8", "left", 0);
        if (Rt.arrow > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, Rt.arrow * 2); txt(ctx, Rt.dir > 0 ? "▲" : "▼", 412, 252 - (1 - Rt.arrow) * 12, 26, Rt.dir > 0 ? "#4ade80" : "#f87171", "center", 0); ctx.restore(); }
      },
      steps: [
        { id: "seq", name: { en: "One by One", ko: "하나씩 차례로" }, param: "120ms per star",
          cap: { en: "Fill stars *one at a time*, left to right.", ko: "별은 *하나씩*, 왼쪽부터 채워요." },
          star(w, s) { s.delay = 0.1 + s.i * 0.12; } },
        { id: "pop", name: { en: "Star Pop", ko: "별 톡" }, param: "scale 1.7 · spin .6",
          cap: { en: "Each star *pops* and twists into place.", ko: "별마다 *톡* 커지며 빙그르." },
          fill(w, s) { s.sc = 1.7; s.rot = 0.6; } },
        { id: "sparkle", name: { en: "Sparkle Burst", ko: "반짝 가루" }, param: "8 sparks / star",
          cap: { en: "A pinch of *sparkle dust* per star.", ko: "별마다 *반짝 가루*를 한 줌." },
          fill(w, s) { sparks(w, 110 + s.i * 80, 150, 8, "253,224,71", [120, 320]); } },
        { id: "perfect", name: { en: "Perfect Five", ko: "만점 연출" }, param: "rays + flash + text",
          cap: { en: "Five stars? *Celebrate it* differently.", ko: "만점이면 *특별하게* 축하해요." },
          perfect(w) {
            w.flash("250,204,21", 0.25);
            w.spawn({ type: "rays", x: 270, y: 150, size: 260, n: 14, vr: 0.6, life: 1.1, color: "253,224,71" });
            w.spawn({ type: "text", text: "PERFECT!", x: 270, y: 80, vy: -20, life: 1, size: 32, color: "#fde047" });
          } },
        { id: "avg", name: { en: "Average Roll", ko: "평균 굴리기" }, param: "lerp · ▲▼ arrow",
          cap: { en: "The *average* rolls, with an up or down *arrow*.", ko: "*평균*이 굴러가고, *▲▼* 화살표로 방향까지." },
          rate(w, Rt) { Rt.arrow = 1; Rt.from = Rt.shown; },
          update(w, dt) { const Rt = w.Rt; Rt.from += (Rt.avg - Rt.from) * Math.min(1, dt * 3); Rt.shown = Rt.from; } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "+2 semitones / star",
          cap: { en: "Each star *a step higher*. Five sounds like a tune.", ko: "별마다 음이 *한 칸씩*. 다섯 개면 노래가 돼요." },
          fill(w, s) { w.sfx.chime(s.i * 2); }, perfect(w) { w.sfx.fanfare(); } },
      ],
    },

    /* ───────── 18. 청소 반짝임 ───────── */
    {
      id: "sim-clean", cat: "sim", view: "iso",
      title: { en: "Make clean feel *sparkling*", ko: "청소가 *반짝반짝* 느껴지게" },
      intro: { en: "Dirt gone. *Is it clean?*", ko: "얼룩이 사라졌어요. *깨끗해진 거죠?*" },
      interval: 0.85, stepDur: 3.6,
      drawFloor(w, ctx) {
        isoFloor(ctx, (gx, gy) => (gx + gy) % 2 ? "rgba(196,140,90,0.55)" : "rgba(176,120,74,0.55)");
        for (const d of w.dirt) if (d.shine > 0 && d.shine < 1) {
          ctx.save(); tilePath(ctx, d.gx, d.gy); ctx.clip();
          const c = isoPt(d.gx + 0.5, d.gy + 0.5), x = c.x - 60 + d.shine * 120;
          const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g; ctx.fillRect(x - 20, c.y - 30, 40, 60); ctx.restore();
        }
      },
      setup(w) {
        w.S = { pct: 40, shown: 40, bump: 0 };
        w.dirt = [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]].map(([gx, gy]) => ({ gx, gy, a: 1, s: 1, rot: 0, shine: 0, blobs: [0, 1, 2, 3].map(() => [rand(-14, 14), rand(-6, 6), rand(6, 12)]) }));
        const p = isoPt(0.5, 2.5); w.bot = { x: p.x, y: p.y };
      },
      fire(w) {
        const S = w.S, d = w.dirt.find(d => d.a === 1 && !d.busy); if (!d) return;
        d.busy = true; const c = isoPt(d.gx + 0.5, d.gy + 0.5);
        w.tween(w.bot, { x: c.x, y: c.y }, 0.3, "inout", () => {
          d.a = 0; S.pct += 12; w.emit("clean", d);
          if (w.dirt.every(q => q.busy)) w.after(1.0, () => { S.pct = 40; for (const q of w.dirt) Object.assign(q, { a: 1, s: 1, rot: 0, busy: false }); });
        });
      },
      update(w, dt) { const S = w.S; S.bump = Math.max(0, S.bump - dt * 4); S.shown = S.pct; },
      drawFront(w, ctx) {
        for (const d of w.dirt) {
          if (d.a <= 0) continue; const c = isoPt(d.gx + 0.5, d.gy + 0.5);
          ctx.save(); ctx.globalAlpha = d.a; ctx.translate(c.x, c.y); ctx.scale(d.s, d.s * 0.5); ctx.rotate(d.rot);
          ctx.fillStyle = "#4a3320"; for (const [x, y, r] of d.blobs) { ctx.beginPath(); ctx.arc(x, y * 2, r * 1.4, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
        const b = w.bot;
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + 4, 26, 12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.ellipse(b.x, b.y, 24, 12, 0, 0, TAU); ctx.fill(); ctx.fillRect(b.x - 24, b.y - 8, 48, 8);
        ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.ellipse(b.x, b.y - 8, 24, 12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#c6f432"; ctx.beginPath(); ctx.arc(b.x + 8, b.y - 10, 3, 0, TAU); ctx.fill();
      },
      drawHud(w, ctx) {
        const S = w.S, s = 1 + S.bump * 0.3, v = Math.min(100, S.shown);
        ctx.save(); ctx.translate(270, 26); ctx.scale(s, s);
        bar(ctx, -60, -6, 150, 12, v / 100, v >= 99 ? "#7dd3fc" : "#a5f3fc");
        ctx.fillStyle = "#e0f2fe"; ctx.save(); ctx.translate(-80, 0); starPath(ctx, 0, 0, 12); ctx.fill(); ctx.restore();
        ctx.restore();
      },
      steps: [
        { id: "wipe", name: { en: "Swirl Away", ko: "빙글 닦이기" }, param: "shrink + spin 350ms",
          cap: { en: "Dirt *swirls away* under the cleaner.", ko: "얼룩이 *빙글빙글* 닦여 사라져요." },
          clean(w, d) { d.a = 1; w.tween(d, { a: 0, s: 0.3, rot: 3 }, 0.35, "in"); } },
        { id: "bubbles", name: { en: "Soap Bubbles", ko: "비누 거품" }, param: "8 bubbles",
          cap: { en: "A few *soap bubbles* float up.", ko: "*비누 거품*이 몽글몽글 올라와요." },
          clean(w, d) {
            const c = isoPt(d.gx + 0.5, d.gy + 0.5);
            for (let i = 0; i < 8; i++) w.spawn({ type: "ring", x: c.x + rand(-26, 26), y: c.y - rand(0, 10), vx: rand(-20, 20), vy: rand(-90, -40), size: rand(3, 7), life: rand(0.6, 1), w: 1.6, color: "200,240,255", hold: true });
          } },
        { id: "shine", name: { en: "Gloss Sweep", ko: "광택 스윽" }, param: "streak 400ms",
          cap: { en: "A *gloss streak* sweeps the clean tile.", ko: "닦인 바닥에 *광택*이 스윽 지나가요." },
          clean(w, d) { d.shine = 0.001; w.tween(d, { shine: 1 }, 0.4, "inout"); } },
        { id: "sparkle", name: { en: "Twinkles", ko: "반짝 별" }, param: "4 stars · staggered",
          cap: { en: "*Twinkles* linger a moment. Squeaky clean.", ko: "*반짝 별*이 잠깐 남아요. 뽀득뽀득." },
          clean(w, d) {
            const c = isoPt(d.gx + 0.5, d.gy + 0.5);
            for (let i = 0; i < 4; i++) w.after(0.15 + i * 0.12, () => w.spawn({ type: "star", x: c.x + rand(-28, 28), y: c.y - rand(4, 30), size: rand(9, 15), life: 0.45, color: "255,255,255" }));
          } },
        { id: "meter", name: { en: "Clean Meter", ko: "청결도 바" }, param: "bump 1.3",
          cap: { en: "Each spot *bumps* the cleanliness bar.", ko: "닦을 때마다 청결도 바가 *톡*." },
          clean(w) { w.after(0.25, () => { w.S.bump = 1; }); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "squeak · ting",
          cap: { en: "A rubbery *squeak*, then a tiny *ting*.", ko: "*뽀드득*, 그리고 작게 *팅*." },
          clean(w) {
            w.play(() => { tn({ type: "triangle", f: 900, f2: 1700, dur: 0.12, vol: 0.12 }); tn({ type: "triangle", f: 1100, f2: 2000, dur: 0.1, vol: 0.1, delay: 0.13 }); });
            w.after(0.3, () => w.sfx.chime(9));
          } },
      ],
    },
    /* ───────── 19. 펫 행복도 ───────── */
    {
      id: "sim-pet", cat: "sim", view: "side",
      title: { en: "Make petting *heartwarming*", ko: "쓰다듬기를 *몽글몽글하게*" },
      intro: { en: "Pet. Bar goes up. *That's it.*", ko: "쓰다듬으면 막대가 올라요. *끝.*" },
      interval: 1.0, stepDur: 3.6,
      setup(w) {
        iso3("sim-pet", () => [
          P(blk(-20, 0, -9, 9, 22, 9), CL.orange), P(blk(-20, 0, 9, 9, 22, 9), CL.orange), P(blk(20, 0, -9, 9, 22, 9), CL.orange), P(blk(20, 0, 9, 9, 22, 9), CL.orange),
          P(blk(0, 20, 0, 64, 28, 30, 0.95), CL.orange), P(blk(40, 34, 0, 30, 26, 28, 0.9), CL.orange), P(blk(56, 36, 0, 8, 10, 14), CL.wall),
          P(pyr([[30, 58, -13], [42, 58, -13], [42, 58, -4], [30, 58, -4]], [36, 74, -9]), CL.orange), P(pyr([[30, 58, 4], [42, 58, 4], [42, 58, 13], [30, 58, 13]], [36, 74, 9]), CL.orange),
        ], 220, 170, -0.35, 0.25);
        w.Pt = { joy: 0.3, shown: 0.3, bump: 0, oy: 0, sx: 1, sy: 1, wag: 0, hand: -1 };
      },
      fire(w) {
        const Pt = w.Pt; Pt.hand = 0; Pt.joy += 0.18;
        w.emit("pet", Pt);
        if (Pt.joy >= 1) { w.emit("full", Pt); w.after(0.8, () => { Pt.joy = 0.2; }); }
      },
      update(w, dt) {
        const Pt = w.Pt; ease1(Pt, dt, 10);
        Pt.bump = Math.max(0, Pt.bump - dt * 4); Pt.wag = Math.max(0, Pt.wag - dt * 0.9);
        if (Pt.hand >= 0) { Pt.hand += dt / 0.5; if (Pt.hand > 1) Pt.hand = -1; }
        Pt.shown = w.on("bar") ? Pt.shown + (Math.min(1, Pt.joy) - Pt.shown) * Math.min(1, dt * 6) : Math.min(1, Pt.joy);
      },
      drawFront(w, ctx) {
        const Pt = w.Pt, x = 280, y = G + Pt.oy, wd = 190, t = at3("sim-pet", x, y, wd, -30, 44, 0);
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, G + 2, 70 / (1 - Pt.oy / 200), 8, 0, 0, TAU); ctx.fill();
        const a = -2.3 + Math.sin(w.time * 22) * 0.5 * Pt.wag;
        ctx.strokeStyle = "#c2702a"; ctx.lineWidth = 9; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.quadraticCurveTo(t.x + Math.cos(a) * 30, t.y + Math.sin(a) * 30, t.x + Math.cos(a + 0.6) * 52, t.y + Math.sin(a + 0.6) * 52 - 10); ctx.stroke();
        put(ctx, "sim-pet", x, y, wd, Pt.sx, Pt.sy);
        if (Pt.hand >= 0) { const k = Pt.hand, hx = 220 + k * 120, hy = G - 128 - Math.sin(k * Math.PI) * 8; rr(ctx, hx - 22, hy - 12, 44, 24, 12, "#fde2c8", "rgba(0,0,0,0.25)", 1.5); rr(ctx, hx - 30, hy - 4, 16, 10, 5, "#fde2c8"); }
      },
      drawHud(w, ctx) {
        const Pt = w.Pt, s = 1 + Pt.bump * 0.3;
        ctx.save(); ctx.translate(270, 26); ctx.scale(s, s);
        bar(ctx, -60, -6, 150, 12, Pt.shown, "#fb7185");
        ctx.fillStyle = "#f43f5e"; ctx.translate(-80, 0); heartPath(ctx, 28); ctx.fill(); ctx.restore();
      },
      steps: [
        { id: "hearts", name: { en: "Floating Hearts", ko: "하트 몽글" }, param: "4 hearts · drift up",
          cap: { en: "*Hearts* drift up from where you touched.", ko: "만진 자리에서 *하트*가 몽글몽글." },
          pet(w) {
            for (let i = 0; i < 4; i++)
              w.spawn({ type: "ghost", img: SPR.heart.c, top: true, w: 22, h: 20, alpha0: 1, add: false,
                x: 290 + rand(-40, 40), y: G - 120, vx: rand(-50, 50), vy: rand(-140, -80), drag: 0.6, life: 1.1 });
          } },
        { id: "hop", name: { en: "Happy Hop", ko: "기뻐서 폴짝" }, param: "squash → hop 30px",
          cap: { en: "Crouch, then a *happy hop*.", ko: "움찔 웅크렸다가 *폴짝*." },
          pet(w, Pt) {
            Pt.sx = 1.15;
            Pt.sy = 0.82;
            w.after(0.1, () => tw(w, Pt, { oy: -30 }, 0.14, "out", () => tw(w, Pt, { oy: 0 }, 0.16, "in", () => { Pt.sx = 1.12; Pt.sy = 0.88; })));
          } },
        { id: "wag", name: { en: "Tail Wag", ko: "꼬리 살랑" }, param: "22Hz · fade 1.1s",
          cap: { en: "The *tail wags* and slowly calms down.", ko: "*꼬리*가 살랑살랑, 천천히 잦아들어요." },
          pet(w, Pt) { Pt.wag = 1; } },
        { id: "bar", name: { en: "Bar Fill + Bump", ko: "막대 차오름 + 톡" }, param: "lerp ×6 · bump 1.3",
          cap: { en: "The bar *fills smoothly*, the heart *bumps*.", ko: "막대는 *스르륵*, 하트는 *톡*." },
          pet(w, Pt) { w.after(0.25, () => { Pt.bump = 1; }); } },
        { id: "max", name: { en: "Love Max", ko: "애정 만땅" }, param: "big heart + ring",
          cap: { en: "Full bar? A *big heart* burst.", ko: "막대가 꽉 차면 *왕하트*가 팡." },
          full(w) {
            w.spawn({ type: "ghost", img: SPR.heart.c, top: true, w: 90, h: 83, alpha0: 1, add: false, hold: true, x: 300, y: G - 150, vy: -30, life: 0.9 });
            w.spawn({ type: "ring", x: 300, y: G - 150, size: 30, size1: 160, life: 0.5, w: 8, color: "251,113,133" });
            for (let i = 0; i < 10; i++) w.spawn({ type: "ghost", img: SPR.heart.c, top: true, w: 16, h: 15, alpha0: 1, add: false, x: 300, y: G - 150, vx: rand(-260, 260), vy: rand(-260, 120), drag: 2, life: 0.9 });
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "purr · pop",
          cap: { en: "A soft *purr* and a little *pop* per heart.", ko: "*그르릉* 소리에 하트마다 *뽁*." },
          pet(w) { w.play(() => { for (let i = 0; i < 6; i++) nz({ type: "lowpass", f: 300, dur: 0.06, vol: 0.25, delay: i * 0.07 }); }); w.sfx.blip(5); }, full(w) { w.sfx.chime(7); } },
      ],
    },

    /* ───────── 20. 장식 배치 스냅 ───────── */
    {
      id: "sim-place", cat: "sim", view: "iso",
      title: { en: "Make placing decor *snap*", ko: "꾸미기 배치가 *착* 붙게" },
      intro: { en: "Slide… stop. *Did it place?*", ko: "스르륵… 멈춤. *놓인 거예요?*" },
      interval: 0.95, stepDur: 3.6,
      drawFloor(w, ctx) {
        isoFloor(ctx, (gx, gy) => { const f = w.flashT[gx + "," + gy]; return f > 0 ? `rgba(198,244,50,${f * 0.5})` : null; });
        const c = w.carry;
        if (c && c.ghost) { tilePath(ctx, c.gx, c.gy); ctx.fillStyle = "rgba(198,244,50,0.25)"; ctx.fill(); ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 2; ctx.stroke(); }
      },
      setup(w) {
        iso3("sim-tree", () => [P(blk(0, 0, 0, 14, 28, 14), CL.wood), P(pyr([[-30, 26, -30], [30, 26, -30], [30, 26, 30], [-30, 26, 30]], [0, 100, 0]), CL.green)], 120, 160);
        iso3("sim-bush", () => [P(blk(0, 0, 0, 56, 30, 56, 0.75), CL.green), P(blk(0, 28, 0, 40, 14, 40, 0.6), CL.green), P(blk(14, 30, 10, 8, 8, 8), CL.pink)], 120, 90);
        iso3("sim-lamp", () => [P(blk(0, 0, 0, 18, 6, 18), CL.dark), P(blk(0, 6, 0, 6, 70, 6), CL.dark), P(blk(0, 76, 0, 18, 16, 18, 0.8), CL.yellow)], 80, 150);
        w.S = { n: 0, beauty: 120, bump: 0 }; w.placed = []; w.carry = null; w.flashT = {};
      },
      DECO: { "sim-tree": 74, "sim-bush": 64, "sim-lamp": 26 },
      fire(w) {
        if (w.carry) return;
        const S = w.S, spots = [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]];
        if (w.placed.length >= 5) { w.placed = []; }
        const [gx, gy] = spots[w.placed.length], k = ["sim-tree", "sim-bush", "sim-lamp", "sim-bush", "sim-tree"][w.placed.length];
        const t = isoPt(gx + 0.5, gy + 0.5), c = w.carry = { k, gx, gy, x: 60, y: 150, x0: 60, y0: 150, tx: t.x, ty: t.y + 8, t: 0, lift: 0, ease: "lin" };
        w.emit("pick", c);
        w.tween(c, { t: 1 }, 0.45, "lin", () => w.tween(c, { lift: 0 }, c.lift ? 0.12 : 0.01, "in", () => {
          const d = { k, gx, gy, x: c.tx, y: c.ty, sx: 1, sy: 1 }; w.placed.push(d); w.carry = null; S.beauty += 5;
          w.emit("place", d);
        }));
      },
      update(w, dt) {
        const c = w.carry; w.S.bump = Math.max(0, w.S.bump - dt * 4);
        for (const k in w.flashT) w.flashT[k] = Math.max(0, w.flashT[k] - dt * 2.5);
        for (const d of w.placed) ease1(d, dt, 11);
        if (c) { const e = E[c.ease](c.t); c.x = c.x0 + (c.tx - c.x0) * e; c.y = c.y0 + (c.ty - c.y0) * e; }
      },
      drawFront(w, ctx) {
        const R = this, c = w.carry;
        for (const d of [...w.placed].sort((a, b) => a.y - b.y)) put(ctx, d.k, d.x, d.y, R.DECO[d.k], d.sx, d.sy);
        if (c) {
          if (c.ghost) put(ctx, c.k, c.tx, c.ty, R.DECO[c.k], 1, 1, 0.3);
          if (c.lift > 0) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(c.x, c.y, 22, 9, 0, 0, TAU); ctx.fill(); }
          put(ctx, c.k, c.x, c.y - c.lift, R.DECO[c.k]);
        }
      },
      drawHud(w, ctx) { const S = w.S; ctx.save(); wallet(ctx, 214, 26, "Beauty " + S.beauty, S.bump, "heart", 150); ctx.restore(); },
      steps: [
        { id: "ghost", name: { en: "Ghost Preview", ko: "미리보기 그림자" }, param: "tile glow + 30% ghost",
          cap: { en: "Show *where it'll land* before it lands.", ko: "놓기 전에 *어디 놓일지* 먼저 보여줘요." },
          pick(w, c) { c.ghost = true; } },
        { id: "lift", name: { en: "Lift & Shadow", ko: "들어 올림 + 그림자" }, param: "lift 40px",
          cap: { en: "*Lift* it while carrying. The shadow stays down.", ko: "옮길 땐 *들어 올려요*. 그림자는 바닥에." },
          pick(w, c) { c.lift = 40; } },
        { id: "snap", name: { en: "Snap Squash", ko: "착 + 찌그러짐" }, param: "ease-out · squash .65",
          cap: { en: "Ease in, drop, and *squash* on contact.", ko: "부드럽게 와서 *착*, 닿는 순간 *꾹*." },
          pick(w, c) { c.ease = "out"; }, place(w, d) { d.sx = 1.3; d.sy = 0.65; } },
        { id: "dust", name: { en: "Dust Ring", ko: "먼지 고리" }, param: "flat ring + 6 puffs",
          cap: { en: "A little *dust ring* on contact.", ko: "닿는 자리에 작은 *먼지 고리*." },
          place(w, d) {
            w.spawn({ type: "ring", flat: true, x: d.x, y: d.y - 6, size: 10, size1: 44, life: 0.35, w: 4, color: "230,225,215" });
            dust(w, d.x, d.y - 6, 6);
          } },
        { id: "grid", name: { en: "Grid Pulse", ko: "격자 물결" }, param: "tile + neighbors",
          cap: { en: "The *tile flashes* and the pulse spreads.", ko: "놓인 칸이 *번쩍*, 옆 칸으로 *퍼져요*." },
          place(w, d) { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) w.flashT[(d.gx + i) + "," + (d.gy + j)] = i || j ? 0.5 : 1; } },
        { id: "score", name: { en: "Beauty +5", ko: "꾸미기 점수 +5" }, param: "text + bump",
          cap: { en: "Tell them it *counted*: +5 beauty.", ko: "*점수가 올랐다*고 알려줘요. +5." },
          place(w, d) {
            w.S.bump = 1;
            w.spawn({ type: "text", text: "+5", x: d.x, y: d.y - 80, vy: -50, life: 0.8, size: 22, color: "#fda4af" });
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "lift swish · tock",
          cap: { en: "*Swish* on pick-up, *tock* on place.", ko: "들 때 *슉*, 놓을 때 *톡*." },
          pick(w) { w.sfx.swish(); }, place(w) { w.sfx.tock(); w.sfx.blip(6); } },
      ],
    },

    /* ───────── 21. 창고 가득 경고 ───────── */
    {
      id: "sim-storage", cat: "sim", view: "iso",
      title: { en: "Make *storage full* impossible to miss", ko: "*창고 가득*을 놓칠 수 없게" },
      intro: { en: "Full. Crates vanish. *Nobody notices.*", ko: "꽉 찼어요. 상자가 사라져요. *아무도 몰라요.*" },
      interval: 0.7, stepDur: 3.8,
      drawFloor(w, ctx) { isoFloor(ctx); },
      setup(w) {
        iso3("sim-ware", () => [P(blk(0, 0, 0, 110, 56, 90), CL.gray), gable(60, 56, 50, 34, CL.red), P(blk(0, 0, 45.5, 54, 42, 2), CL.dark), P(blk(-55.5, 26, 0, 2, 16, 40), CL.blue)], 200, 170);
        sprite("sim-boxspr", 60, 60, x => { x.translate(30, 30); ICO.box(x, 56); });
        w.S = { n: 8, cap: 10, rej: 0, sh: 0, col: "#e5e7eb", warn: false, bump: 0 }; w.flyers = [];
      },
      fire(w) {
        const S = w.S;
        flyer(w, { k: "box", s: 30, x0: 70, y0: 250, x1: 280, y1: 200, cy: 110, dur: 0.45, ease: "out", end: () => {
          if (S.n < S.cap) { S.n++; w.emit("store", S); return; }
          w.emit("reject", S);
          if (++S.rej >= 4) w.after(0.5, () => { S.n = 8; S.rej = 0; });
        } });
      },
      update(w, dt) { const S = w.S; flyStep(w, dt); S.sh = Math.max(0, S.sh - dt * 2); S.bump = Math.max(0, S.bump - dt * 5); S.col = "#e5e7eb"; S.warn = false; },
      drawFront(w, ctx) {
        const S = w.S;
        put(ctx, "sim-ware", 290, 252, 190);
        for (let i = 0; i < Math.min(S.n, 6); i++) drawCube(ctx, 0 + (i % 2) * 0.55 + 0.3, 2.6 + Math.floor(i / 2) * 0.5, 16, ["#e8b980", "#a16207", "#854d0e"], 0.45);
        if (S.warn) {
          const y = 70 + Math.sin(w.time * 10) * 5;
          ctx.globalCompositeOperation = "lighter"; glow(ctx, 380, y, 50 + Math.sin(w.time * 12) * 8, "239,68,68", 0.6); ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(380, y - 22); ctx.lineTo(404, y + 18); ctx.lineTo(356, y + 18); ctx.closePath(); ctx.fill();
          txt(ctx, "!", 380, y + 4, 24, "#fff", "center", 0);
        }
      },
      drawHud(w, ctx) {
        const S = w.S, x = 220 + (S.sh > 0 ? Math.sin(w.time * 90) * 6 * S.sh : 0), s = 1 + S.bump * 0.15;
        flyDraw(w, ctx);
        ctx.save(); ctx.translate(x, 72); ctx.scale(s, s);
        bar(ctx, -60, -7, 130, 14, S.n / S.cap, S.col);
        txt(ctx, `${S.n}/${S.cap}`, 92, 0, 16, S.n >= S.cap ? "#fca5a5" : "#fff", "left");
        ctx.restore();
      },
      steps: [
        { id: "color", name: { en: "Fill Color", ko: "채움 색" }, param: "green → yellow → red",
          cap: { en: "The bar goes *green → yellow → red* as it fills.", ko: "찰수록 *초록 → 노랑 → 빨강*." },
          update(w) {
            const S = w.S, k = S.n / S.cap;
            S.col = k >= 1 ? "#ef4444" : k > 0.75 ? "#facc15" : "#4ade80";
          } },
        { id: "shake", name: { en: "Bar Shake", ko: "막대 덜덜" }, param: "±6px · 500ms",
          cap: { en: "When it's full and more comes in, the bar *shakes no*.", ko: "꽉 찼는데 또 오면 막대가 *도리도리*." },
          reject(w, S) {
            S.sh = 1;
            w.spawn({ type: "text", text: "FULL!", x: 220, y: 106, vy: -20, life: 0.7, size: 18, color: "#f87171" });
          } },
        { id: "bounce", name: { en: "Bounce Off", ko: "튕겨 나감" }, param: "crate ricochets",
          cap: { en: "The crate *bounces off* the door and falls.", ko: "상자가 문에 *팅* 맞고 떨어져요." },
          reject(w) {
            w.spawn({ type: "ghost", img: SPR["sim-boxspr"].c, top: true, w: 30, h: 30, alpha0: 1, add: false, hold: true,
              x: 280, y: 200, vx: -220, vy: -260, g: 1300, ground: true, gy: 262, bounce: 0.4, life: 0.9 });
          } },
        { id: "warn", name: { en: "Warning Icon", ko: "경고 아이콘" }, param: "bob + red glow",
          cap: { en: "A bobbing *red warning* sits on the building.", ko: "건물 위에 *빨간 경고*가 둥실둥실." },
          update(w) { w.S.warn = w.S.n >= w.S.cap; } },
        { id: "edge", name: { en: "Edge Pulse", ko: "가장자리 빨갛게" }, param: "vignette .45",
          cap: { en: "Pulse the *screen edges* red on each miss.", ko: "놓칠 때마다 *화면 테두리*가 빨갛게." },
          reject(w) { w.vignette(0.45); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk · buzz",
          cap: { en: "Stored: *thunk*. Rejected: a dull *buzz*.", ko: "들어가면 *쿵*, 튕기면 *부-*." },
          store(w) { w.sfx.thunk(); }, reject(w) { w.play(() => tn({ type: "square", f: 110, dur: 0.22, vol: 0.12 })); } },
      ],
    },

    /* ───────── 22. 시세 등락 ───────── */
    {
      id: "sim-stock", cat: "sim", view: "ui",
      title: { en: "Make prices feel *alive*", ko: "시세가 *살아 움직이게*" },
      intro: { en: "A line. A number. *Up or down?*", ko: "선 하나, 숫자 하나. *올랐어요 내렸어요?*" },
      interval: 0.55, stepDur: 3.4,
      drawFloor() {},
      setup(w) {
        const pts = [120]; for (let i = 1; i < 30; i++) pts.push(Math.max(80, Math.min(160, pts[i - 1] * (1 + rand(-0.04, 0.045)))));
        w.S = { pts, off: 0, dir: 1, col: "#e5e7eb", area: false, flash: 0, badge: 0, pct: 0, bump: 0, n: 0 };
      },
      fire(w) {
        const S = w.S, last = S.pts[S.pts.length - 1], nx = Math.max(80, Math.min(160, last * (1 + (S.n++ % 5 === 3 ? -0.07 : rand(-0.035, 0.05)))));
        S.pts.push(nx); S.pts.shift(); S.dir = nx >= last ? 1 : -1; S.pct = (nx / last - 1) * 100;
        w.emit("tick", S);
      },
      update(w, dt) { const S = w.S; S.flash = Math.max(0, S.flash - dt * 3); S.badge = Math.max(0, S.badge - dt * 1.5); S.bump = Math.max(0, S.bump - dt * 5); S.col = "#e5e7eb"; S.area = false; },
      drawFront(w, ctx) {
        const S = w.S, n = S.pts.length, dx = 400 / (n - 1), x0 = 70;
        let lo = Math.min(...S.pts), hi = Math.max(...S.pts); const pad = (hi - lo) * 0.15 + 1; lo -= pad; hi += pad;
        const X = i => x0 + (i + S.off) * dx, Y = v => 286 - (v - lo) / (hi - lo) * 170;
        rr(ctx, 44, 98, 452, 210, 14, "rgba(255,255,255,0.03)", "rgba(255,255,255,0.08)", 1);
        ctx.save(); ctx.beginPath(); ctx.rect(46, 100, 448, 206); ctx.clip();
        if (S.area) { ctx.beginPath(); S.pts.forEach((v, i) => ctx.lineTo(X(i), Y(v))); ctx.lineTo(X(n - 1), 306); ctx.lineTo(X(0), 306); ctx.closePath(); const g = ctx.createLinearGradient(0, 110, 0, 306); g.addColorStop(0, S.dir > 0 ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fill(); }
        ctx.strokeStyle = S.col; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.beginPath(); S.pts.forEach((v, i) => ctx.lineTo(X(i), Y(v))); ctx.stroke();
        ctx.restore();
        S.head = { x: X(n - 1), y: Y(S.pts[n - 1]) };
        const v = S.pts[n - 1], s = 1 + S.bump * 0.25;
        if (S.flash > 0) rr(ctx, 172, 40, 196, 46, 12, S.dir > 0 ? `rgba(74,222,128,${S.flash * 0.45})` : `rgba(248,113,113,${S.flash * 0.45})`);
        ctx.save(); ctx.translate(270, 64); ctx.scale(s, s); txt(ctx, "$" + v.toFixed(2), 0, 0, 30, S.area ? S.col : "#fff", "center", 0); ctx.restore();
        if (S.badge > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.badge * 2); ctx.translate(428, 64); const b = 1 + Math.max(0, S.badge - 0.7) * 1.5; ctx.scale(b, b); rr(ctx, -46, -14, 92, 28, 14, S.dir > 0 ? "#16a34a" : "#dc2626"); txt(ctx, (S.dir > 0 ? "▲ +" : "▼ ") + S.pct.toFixed(1) + "%", 0, 1, 14, "#fff", "center", 0); ctx.restore(); }
      },
      steps: [
        { id: "color", name: { en: "Up / Down Color", ko: "오르면 초록, 내리면 빨강" }, param: "line + area fill",
          cap: { en: "*Green* up, *red* down. Fill under the line.", ko: "오르면 *초록*, 내리면 *빨강*. 선 아래도 칠해요." },
          update(w) { const S = w.S; S.col = S.dir > 0 ? "#4ade80" : "#f87171"; S.area = true; } },
        { id: "scroll", name: { en: "Smooth Scroll", ko: "부드럽게 흐르기" }, param: "slide 1 step · 300ms",
          cap: { en: "Don't redraw. *Slide* the chart along.", ko: "다시 그리지 말고 차트를 *스르륵* 밀어요." },
          tick(w, S) { S.off = 1; w.tween(S, { off: 0 }, 0.3, "out"); } },
        { id: "head", name: { en: "Live Dot", ko: "살아있는 점" }, param: "glow + ring / tick",
          cap: { en: "A glowing *live dot* pulses at the tip.", ko: "선 끝에 *빛나는 점*이 두근두근." },
          tick(w, S) {
            w.after(0.3, () => {
              const h = S.head;
              w.spawn({ type: "ring", x: h.x, y: h.y, size: 4, size1: 26, life: 0.45, w: 3, color: S.dir > 0 ? "74,222,128" : "248,113,113" });
              w.spawn({ type: "glow", x: h.x, y: h.y, size: 18, life: 0.5, color: "255,255,255" });
            });
          } },
        { id: "badge", name: { en: "Change Badge", ko: "등락 배지" }, param: "▲▼ % · pop",
          cap: { en: "A *▲ +2.4%* badge pops next to the price.", ko: "가격 옆에 *▲ +2.4%* 배지가 톡." },
          tick(w, S) { S.badge = 1; } },
        { id: "flash", name: { en: "Price Flash", ko: "가격 번쩍" }, param: "bg flash + bump",
          cap: { en: "The price *flashes* its color and *bumps*.", ko: "가격 칸이 색으로 *번쩍*, 숫자는 *톡*." },
          tick(w, S) { S.flash = 1; S.bump = 1; } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "high up · low down",
          cap: { en: "*High blip* up, *low blip* down. Eyes free.", ko: "오르면 *높게 띡*, 내리면 *낮게 뚝*." },
          tick(w, S) { w.play(() => tn({ type: "triangle", f: S.dir > 0 ? 1320 : 330, f2: S.dir > 0 ? 1760 : 250, dur: 0.1, vol: 0.18 })); } },
      ],
    },

    /* ───────── 23. 배달 트럭 도착 ───────── */
    {
      id: "sim-truck", cat: "sim", view: "iso",
      title: { en: "Make deliveries *arrive*", ko: "배달 트럭이 *도착하는* 맛" },
      intro: { en: "Slides in. Stops dead. *Stuff appears.*", ko: "미끄러져 와서 뚝. *물건이 생겨요.*" },
      interval: 2.6, stepDur: 4.0,
      drawFloor(w, ctx) { isoFloor(ctx, (gx, gy) => gy === 3 ? "rgba(70,74,88,0.75)" : null); },
      setup(w) {
        mShop();
        iso3("sim-truck", () => [P(blk(0, 10, -14, 40, 42, 64), CL.wall), P(blk(0, 10, 32, 38, 30, 24), CL.red), P(blk(0, 26, 44.5, 30, 12, 1), CL.blue), P(blk(-20.5, 22, 32, 1, 10, 14), CL.blue),
          P(blk(-21, 0, -30, 4, 14, 14), CL.dark), P(blk(21, 0, -30, 4, 14, 14), CL.dark), P(blk(-21, 0, 30, 4, 14, 14), CL.dark), P(blk(21, 0, 30, 4, 14, 14), CL.dark), P(blk(0, 34, -14, 41, 4, 40), CL.teal)], 160, 150);
        w.T = { g: -2, a: 0, rot: 0, sx: 1, sy: 1, ease: "lin", ease2: "lin", moving: false };
        w.S = { stock: 12, bump: 0, ssx: 1, ssy: 1 }; w.flyers = [];
      },
      fire(w) {
        const T = w.T, S = w.S; if (w.busy) return; w.busy = true;
        Object.assign(T, { g: -2, a: 1, moving: true, ease: "lin", ease2: "lin" }); w.emit("drive", T);
        w.tween(T, { g: 2.3 }, 0.9, T.ease, () => {
          T.moving = false; w.emit("stop", T);
          w.after(0.15, () => { w.emit("unload", T); if (!T.tossed) S.stock += 3; });
          w.after(1.0, () => { T.moving = true; w.emit("leave", T); w.tween(T, { g: 7.5 }, 0.8, T.ease2, () => { T.a = 0; T.moving = false; T.tossed = false; w.busy = false; }); });
        });
      },
      update(w, dt) { const T = w.T, S = w.S; ease1(T, dt, 10); T.rot -= T.rot * Math.min(1, dt * 8); flyStep(w, dt); S.bump = Math.max(0, S.bump - dt * 5); S.ssx += (1 - S.ssx) * Math.min(1, dt * 10); S.ssy += (1 - S.ssy) * Math.min(1, dt * 10); },
      truckXY(w) { const p = isoPt(w.T.g, 3.5), o = at3("sim-truck", 0, 0, 96, 0, 0, 0); return { p, o }; },
      drawFront(w, ctx) {
        const T = w.T, S = w.S;
        put(ctx, "sim-shop", 300, 178, 130, S.ssx, S.ssy);
        if (T.a > 0) { const { p, o } = this.truckXY(w); ctx.save(); ctx.globalAlpha = T.a; ctx.translate(p.x, p.y); ctx.rotate(T.rot); put(ctx, "sim-truck", -o.x, -o.y, 96, T.sx, T.sy); ctx.restore(); }
      },
      drawHud(w, ctx) { flyDraw(w, ctx); wallet(ctx, 220, 26, String(w.S.stock), w.S.bump, "box", 92); },
      steps: [
        { id: "ease", name: { en: "Brake & Accelerate", ko: "감속과 가속" }, param: "ease-out in · ease-in out",
          cap: { en: "*Slow down* to stop. *Speed up* to leave.", ko: "설 땐 *천천히*, 떠날 땐 *붕~*." },
          drive(w, T) { T.ease = "out"; }, leave(w, T) { T.ease2 = "in"; } },
        { id: "dip", name: { en: "Brake Dip", ko: "브레이크 끄덕" }, param: "nose dip .12 · squash",
          cap: { en: "The truck *dips forward* when it brakes.", ko: "멈출 때 앞으로 *꾸벅*." },
          stop(w, T) { T.rot = 0.12; T.sx = 1.06; T.sy = 0.92; }, leave(w, T) { T.rot = -0.08; } },
        { id: "exhaust", name: { en: "Exhaust Puffs", ko: "배기 연기" }, param: "puff / frame moving",
          cap: { en: "*Puffs* from the exhaust while it moves.", ko: "움직이는 동안 꽁무니에서 *뿌연 연기*." },
          update(w) {
            const T = w.T;
            if (!T.moving || Math.random() > 0.5) return;
            const p = isoPt(T.g - 0.9, 3.5);
            w.spawn({ type: "smoke", x: p.x, y: p.y - 6, vx: rand(-60, -20), vy: rand(-50, -20), size: 4, size1: 14, life: 0.6, color: "180,180,190" });
          } },
        { id: "honk", name: { en: "Honk Bubble", ko: "빵빵 말풍선" }, param: "bubble + shop bounce",
          cap: { en: "*Honk!* The shop perks up.", ko: "*빵빵!* 가게가 들썩." },
          stop(w, T) {
            const p = isoPt(T.g, 3.5);
            w.spawn({ type: "text", text: "HONK!", x: p.x + 20, y: p.y - 80, vy: -30, life: 0.7, size: 20, color: "#fde047" });
            w.S.ssx = 0.9;
            w.S.ssy = 1.12;
          } },
        { id: "toss", name: { en: "Box Toss", ko: "상자 던지기" }, param: "3 boxes · arc",
          cap: { en: "Boxes are *tossed* into the shop.", ko: "상자가 가게로 *휙휙* 들어가요." },
          unload(w, T) {
            T.tossed = true;
            const p = isoPt(T.g, 3.5);
            for (let i = 0; i < 3; i++) flyer(w, { k: "box", s: 26, x0: p.x, y0: p.y - 40, x1: 220, y1: 26, cx: p.x + 40, cy: p.y - 160, delay: i * 0.12, dur: 0.6, end: () => { w.S.stock++; w.emit("arrive"); } });
          } },
        { id: "bump", name: { en: "Stock Bump", ko: "재고 톡" }, param: "scale 1.35",
          cap: { en: "Stock *bumps* as each box lands.", ko: "상자가 들어올 때마다 재고가 *톡*." },
          arrive(w) { w.S.bump = 1; } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "engine · honk · thunk",
          cap: { en: "Engine *rumble*, a *honk*, box *thunks*.", ko: "*부릉*, *빵빵*, 상자 *쿵쿵*." },
          drive(w) { w.play(() => tn({ type: "sawtooth", f: 60, f2: 45, dur: 0.9, vol: 0.08 })); },
          stop(w) {
            w.play(() => {
              tn({ type: "square", f: 440, dur: 0.12, vol: 0.12 }); tn({ type: "square", f: 554, dur: 0.12, vol: 0.1 });
              tn({ type: "square", f: 440, dur: 0.14, vol: 0.12, delay: 0.16 });
            });
          },
          arrive(w) { w.sfx.thunk(); } },
      ],
    },

    /* ───────── 24. 건설 비계 ───────── */
    {
      id: "sim-build", cat: "sim", view: "iso",
      title: { en: "Make construction *rise*", ko: "건물이 *올라가는* 맛" },
      intro: { en: "25%. 50%. Jump, jump. *Done?*", ko: "25%, 50%. 툭툭 커져요. *다 된 거예요?*" },
      interval: 0.75, stepDur: 4.0,
      drawFloor(w, ctx) { isoFloor(ctx, (gx, gy) => gx >= 1 && gx <= 3 && gy >= 1 && gy <= 3 ? "rgba(160,120,80,0.35)" : null); },
      setup(w) {
        iso3("sim-bld", () => [P(blk(0, 0, 0, 100, 60, 100), CL.wall), P(blk(0, 58, 0, 112, 6, 112), CL.wood), P(blk(0, 64, 0, 92, 52, 92), CL.wall), roof(60, 116, 48, CL.teal),
          P(blk(-14, 0, 50, 24, 40, 3), CL.dark), P(blk(24, 20, 51, 26, 22, 2), CL.blue), P(blk(-14, 80, 47, 26, 22, 2), CL.blue), P(blk(20, 80, 47, 26, 22, 2), CL.blue), P(blk(-47, 80, 0, 2, 22, 40), CL.blue)], 200, 320);
        w.Pb = { v: 0, h: 0, done: false, wob: 0, seg: 0, wf: 0 };
      },
      fire(w) {
        const Pb = w.Pb; if (Pb.done) return;
        Pb.v = Math.min(1, Pb.v + 0.25); w.emit("hit", Pb);
        if (Pb.v >= 1) { Pb.done = true; w.after(0.35, () => w.emit("finish", Pb)); w.after(1.8, () => { Pb.v = Pb.h = 0; Pb.done = false; }); }
      },
      update(w, dt) { const Pb = w.Pb; if (!w.on("rise")) Pb.h = Pb.v; Pb.wob = Math.max(0, Pb.wob - dt * 3); Pb.seg = Math.max(0, Pb.seg - dt * 4); Pb.wf = Math.max(0, Pb.wf - dt * 2.5); },
      drawFront(w, ctx) {
        const Pb = w.Pb, x = 270, y = 236, wd = 150, top = at3("sim-bld", x, y, wd, 0, 164, 0).y, ch = (y - top + 6) * Pb.h;
        ctx.save(); ctx.beginPath(); ctx.rect(x - 120, y - ch, 240, ch + 20); ctx.clip(); put(ctx, "sim-bld", x, y, wd, 1, 1, 1, "white", Pb.wf); ctx.restore();
        if (Pb.h > 0.02) { const e = at3("sim-bld", x, y, wd, 0, 164 * Pb.h, 50); ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(e.x - 50, y - ch - 1, 100, 2); }
        if (!Pb.gone) {
          const wb = Math.sin(w.time * 50) * 3 * Pb.wob, H = 172 * Math.max(Pb.h, 0.15) + 12;
          ctx.strokeStyle = "rgba(234,179,8,0.85)"; ctx.lineWidth = 3;
          for (const [a, c] of [[-56, -56], [56, -56], [-56, 56], [56, 56]]) { const b = at3("sim-bld", x, y, wd, a, 0, c), t = at3("sim-bld", x, y, wd, a, H, c); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x + wb, t.y); ctx.stroke(); }
          ctx.strokeStyle = "rgba(234,179,8,0.6)"; ctx.lineWidth = 2;
          for (let hh = 30; hh < H; hh += 36) { const q = [[-56, 56], [56, 56], [56, -56]].map(([a, c]) => at3("sim-bld", x, y, wd, a, hh, c)); ctx.beginPath(); q.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p.x + wb * hh / H, p.y)); ctx.stroke(); }
        }
      },
      drawHud(w, ctx) {
        const Pb = w.Pb;
        for (let i = 0; i < 4; i++) {
          const on = Pb.v > i * 0.25 + 0.01, s = on && Math.abs(Pb.v - (i + 1) * 0.25) < 0.01 ? 1 + Pb.seg * 0.6 : 1;
          ctx.save(); ctx.translate(222 + i * 32, 26); ctx.scale(s, s); rr(ctx, -13, -7, 26, 14, 4, on ? "#facc15" : "rgba(255,255,255,0.12)"); ctx.restore();
        }
      },
      steps: [
        { id: "rise", name: { en: "Smooth Rise", ko: "스르륵 올라감" }, param: "350ms ease-back",
          cap: { en: "Let each floor *rise*, with a tiny overshoot.", ko: "층마다 *쑥* 올라가며 살짝 넘쳐요." },
          hit(w, Pb) { w.tween(Pb, { h: Pb.v }, 0.35, "back"); } },
        { id: "sparks", name: { en: "Hammer Sparks", ko: "망치 불꽃" }, param: "10 sparks + dust",
          cap: { en: "*Sparks* and dust where the work happens.", ko: "일하는 자리에서 *불꽃*과 먼지가 탁탁." },
          hit(w, Pb) {
            const p = at3("sim-bld", 270, 236, 150, 0, 164 * Pb.v, 50);
            sparks(w, p.x, p.y, 10, "253,224,71", [150, 380], -Math.PI, 0);
            dust(w, p.x, p.y, 4);
          } },
        { id: "segments", name: { en: "Segment Pop", ko: "칸 채우기 톡" }, param: "4 segments · 1.6×",
          cap: { en: "Each progress *segment pops* as it fills.", ko: "진행 칸이 찰 때마다 *톡*." },
          hit(w, Pb) { Pb.seg = 1; } },
        { id: "wobble", name: { en: "Scaffold Wobble", ko: "비계 흔들림" }, param: "±3px · 330ms",
          cap: { en: "The *scaffold wobbles* with every blow.", ko: "망치질마다 *비계*가 흔들흔들." },
          hit(w, Pb) { Pb.wob = 1; w.shake(0.06); } },
        { id: "reveal", name: { en: "Grand Opening", ko: "개장 연출" }, param: "poles fly · confetti",
          cap: { en: "Done? *Scaffold flies off*, confetti, flash.", ko: "완성되면 *비계가 날아가고* 꽃가루, 번쩍." },
          finish(w, Pb) {
            Pb.gone = true;
            Pb.wf = 1;
            w.after(1.4, () => { Pb.gone = false; });
            for (let i = 0; i < 12; i++) w.spawn({ type: "chunk", x: 270 + rand(-60, 60), y: rand(70, 220), vx: rand(-320, 320), vy: rand(-380, -120), g: 1200, vr: rand(-10, 10), size: rand(4, 8), life: 0.9, color: "234,179,8" });
            confetti(w, 270, 120, 26);
            w.spawn({ type: "text", text: "OPEN!", x: 270, y: 70, vy: -10, life: 1.2, size: 36, color: "#c6f432" });
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "clank · fanfare",
          cap: { en: "Metal *clank* per hit, *fanfare* at the end.", ko: "망치마다 *깡*, 완성하면 *빠밤*." },
          hit(w) { w.play(() => { tn({ type: "square", f: 820, f2: 600, dur: 0.06, vol: 0.12 }); nz({ type: "bandpass", f: 3000, q: 3, dur: 0.08, vol: 0.3 }); }); }, finish(w) { w.sfx.fanfare(); } },
      ],
    },
    /* ───────── 25. 공장 컨베이어 ───────── */
    {
      id: "sim-conveyor", cat: "sim", view: "side",
      title: { en: "Make the factory line *thump*", ko: "공장 라인이 *쿵쿵* 돌아가게" },
      intro: { en: "Grey box in. Orange box out. *Magic?*", ko: "회색 상자가 주황 상자로. *마법?*" },
      interval: 1.0, stepDur: 3.8,
      drawFloor(w, ctx) {
        const S = w.S, o = S.belt % 24;
        ctx.fillStyle = "#2a2f3a"; ctx.fillRect(20, 240, 500, 22);
        ctx.save(); ctx.beginPath(); ctx.rect(20, 240, 500, 22); ctx.clip(); ctx.fillStyle = "rgba(255,255,255,0.08)";
        for (let x = 8 + o; x < 540; x += 24) ctx.fillRect(x, 240, 10, 22);
        ctx.restore();
        for (let x = 40; x < 520; x += 48) { ctx.save(); ctx.translate(x, 272); ctx.rotate(S.belt / 10); ctx.fillStyle = "#4b5563"; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.restore(); }
        ctx.fillStyle = "#1c1f27"; ctx.fillRect(20, 284, 500, 60);
      },
      setup(w) { w.S = { belt: 0, pause: false, pz: 0, hitT: 0.05 }; w.items = []; },
      fire(w) { w.items.push({ x: -20, done: false, stamped: false, sx: 1, sy: 1, flash: 0, bob: 0 }); },
      update(w, dt) {
        const S = w.S;
        for (const it of w.items) {
          it.sx += (1 - it.sx) * Math.min(1, dt * 12); it.sy += (1 - it.sy) * Math.min(1, dt * 12); it.flash = Math.max(0, it.flash - dt * 3); it.bob = 0;
          if (!S.pause) it.x += 140 * dt;
          if (!it.stamped && it.x >= 270) { it.x = 270; it.stamped = true; this.stamp(w, it); }
        }
        w.items = w.items.filter(it => it.x < 600);
      },
      stamp(w, it) {
        const S = w.S; S.pause = true; S.pz = 1; S.hitT = 0.05;
        w.emit("stamp", S, it);
        w.after(S.hitT, () => { it.done = true; w.emit("pressed", S, it); });
        w.after(S.hitT + 0.2, () => { S.pz = 0; S.pause = false; });
      },
      drawFront(w, ctx) {
        const S = w.S;
        for (const it of w.items) {
          ctx.save(); ctx.translate(it.x, 240 + it.bob); ctx.scale(it.sx, it.sy);
          if (it.done) { rr(ctx, -22, -40, 44, 40, 6, "#f59e0b"); ctx.fillStyle = "#b45309"; ctx.fillRect(-22, -24, 44, 7); }
          else rr(ctx, -20, -36, 40, 36, 3, "#6b7280");
          if (it.flash > 0) { ctx.globalAlpha = it.flash; rr(ctx, -23, -41, 46, 42, 6, "#fff"); }
          ctx.restore();
        }
        const hy = 150 + Math.max(-0.5, S.pz) * 50;
        rr(ctx, 210, 50, 120, 60, 8, "#3b4252", "rgba(255,255,255,0.12)", 1.5); ctx.fillStyle = "#c6f432"; ctx.fillRect(222, 98, 96, 4);
        ctx.fillStyle = "#9ca3af"; ctx.fillRect(262, 110, 16, hy - 110);
        rr(ctx, 236, hy, 68, 20, 4, "#64748b", "rgba(0,0,0,0.3)", 2);
      },
      steps: [
        { id: "belt", name: { en: "Moving Belt", ko: "움직이는 벨트" }, param: "stripes + rollers",
          cap: { en: "The *belt moves* with the goods. Rollers spin.", ko: "물건과 함께 *벨트도* 움직여요. 롤러도 빙글." },
          update(w, dt) { if (!w.S.pause) w.S.belt += 140 * dt; } },
        { id: "windup", name: { en: "Press Wind-up", ko: "프레스 예비 동작" }, param: "up 120ms → slam 60ms",
          cap: { en: "Lift the press *up first*, then *slam*.", ko: "프레스를 *살짝 올렸다가*, *쾅*." },
          stamp(w, S) {
            S.hitT = 0.18;
            S.pz = 0;
            w.tween(S, { pz: -0.5 }, 0.12, "out", () => w.tween(S, { pz: 1 }, 0.06, "in"));
          } },
        { id: "squash", name: { en: "Item Squash", ko: "물건 찌그러짐" }, param: "1.3 × 0.6",
          cap: { en: "The item *squashes* under the hit.", ko: "맞은 물건이 *납작*해졌다 펴져요." },
          pressed(w, S, it) { it.sx = 1.3; it.sy = 0.6; w.shake(0.12); } },
        { id: "steam", name: { en: "Steam & Sparks", ko: "증기와 불꽃" }, param: "6 puffs · 10 sparks",
          cap: { en: "*Steam* bursts out sideways. A few *sparks*.", ko: "옆으로 *치익* 증기, 불꽃 몇 개." },
          pressed(w) {
            for (let i = 0; i < 6; i++) {
              const d = i % 2 ? 1 : -1;
              w.spawn({ type: "smoke", x: 270 + d * 34, y: 226, vx: d * rand(120, 220), vy: rand(-60, -10), drag: 3, size: 6, size1: 20, life: 0.6, color: "230,230,240" });
            }
            sparks(w, 270, 214, 10, "253,224,71", [150, 420], -Math.PI, 0);
          } },
        { id: "flash", name: { en: "Product Flash", ko: "완성품 번쩍" }, param: "white 330ms + glint",
          cap: { en: "The new product *flashes white* with a glint.", ko: "완성품이 *하얗게* 번쩍, 반짝 별." },
          pressed(w, S, it) {
            it.flash = 1;
            w.after(0.15, () => w.spawn({ type: "star", x: it.x + 14, y: 214, size: 18, life: 0.3, color: "255,255,255" }));
          } },
        { id: "jiggle", name: { en: "Roller Jiggle", ko: "롤러 덜컹" }, param: "2px per roller",
          cap: { en: "Goods *jiggle* over each roller.", ko: "롤러를 지날 때마다 *덜컹덜컹*." },
          update(w) { for (const it of w.items) if (!w.S.pause) it.bob = -Math.abs(Math.sin(it.x / 48 * Math.PI)) * 3; } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "slam · hiss · rattle",
          cap: { en: "Heavy *slam*, a *hiss*, the belt's *rattle*.", ko: "묵직한 *쾅*, *치익*, 벨트 *덜덜*." },
          pressed(w) { w.sfx.slam(); w.play(() => nz({ type: "highpass", f: 3000, dur: 0.4, vol: 0.2 })); },
          update(w) { if (Math.random() < 0.03) w.sfx.tick(); } },
      ],
    },

    /* ───────── 26. 낚시 입질 ───────── */
    {
      id: "sim-fish", cat: "sim", view: "side",
      title: { en: "Make a fish bite *thrilling*", ko: "낚시 입질을 *두근거리게*" },
      intro: { en: "Bobber dips. Fish appears. *Huh.*", ko: "찌가 내려가고 물고기 등장. *어?*" },
      interval: 2.4, stepDur: 4.0,
      drawFloor(w, ctx) {
        const g = ctx.createLinearGradient(0, 236, 0, 360); g.addColorStop(0, "rgba(56,189,248,0.28)"); g.addColorStop(1, "rgba(14,60,100,0.3)");
        ctx.fillStyle = g; ctx.fillRect(-80, 236, 700, 140);
        ctx.strokeStyle = "rgba(186,230,253,0.6)"; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = 0; x <= 540; x += 10) ctx.lineTo(x, 236 + Math.sin(x / 30 + w.time * 2) * 2); ctx.stroke();
        ctx.fillStyle = "#7c5a3a"; ctx.fillRect(10, 232, 170, 12); ctx.fillStyle = "#5b4128"; ctx.fillRect(30, 244, 10, 80); ctx.fillRect(150, 244, 10, 80);
      },
      setup(w) { w.hero = w.actor("hero", { home: 100, gy: 232, h: 118 }); w.F = { by: 0, ten: 0, wait: 0, n: 3, bump: 0, fish: null }; },
      fire(w) {
        const F = w.F; if (w.busy) return; w.busy = true;
        F.wait = 0; w.emit("wait", F);
        w.after(F.wait, () => {
          F.by = 16; w.emit("bite", F);
          w.after(0.4, () => {
            F.by = 0; F.fish = { x: 360, y: 236, t: 0, a: 1, leap: false, rot: 0 }; w.emit("catch", F, F.fish);
            w.after(0.7, () => { F.n++; F.bump = 1; F.fish = null; w.emit("land", F); });
            w.after(1.1, () => { w.busy = false; });
          });
        });
      },
      update(w, dt) {
        const F = w.F; F.bump = Math.max(0, F.bump - dt * 4);
        const f = F.fish; if (f) { f.t = Math.min(1, f.t + dt / 0.7); if (f.leap) { const k = f.t; f.x = 360 + (150 - 360) * k; f.y = 236 - Math.sin(k * Math.PI) * 170 + k * -20; f.rot = k * 9; } else f.a = 1 - f.t; }
      },
      drawFront(w, ctx) {
        const F = w.F, hx = w.hero.x + 34, hy = 232 - 70, tx = hx + 96 - F.ten * 16, ty = hy - 96 + F.ten * 30, bx = 360, by = 236 + F.by;
        ctx.strokeStyle = "#a16207"; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + 60, hy - 70 + F.ten * 30, tx, ty); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx, ty);
        if (F.ten > 0.1) ctx.lineTo(bx, by - 8); else ctx.quadraticCurveTo((tx + bx) / 2, by - 30, bx, by - 8); ctx.stroke();
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(bx, by - 6, 7, Math.PI, TAU); ctx.fill(); ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(bx, by - 6, 7, 0, Math.PI); ctx.fill();
        const f = F.fish; if (f) ico(ctx, "fish", f.x, f.y - 14, 46, f.rot, f.a);
      },
      drawHud(w, ctx) { wallet(ctx, 220, 26, String(w.F.n), w.F.bump, "fish", 92); },
      steps: [
        { id: "nibble", name: { en: "Nibbles", ko: "톡톡 입질" }, param: "2 small bobs · 600ms",
          cap: { en: "Two tiny *nibbles* first. Hold your breath.", ko: "먼저 *톡, 톡* 두 번. 숨죽이게." },
          wait(w, F) {
            F.wait = 0.65;
            for (let i = 0; i < 2; i++) w.after(i * 0.28, () => { w.tween(F, { by: 4 }, 0.06, "out", () => w.tween(F, { by: 0 }, 0.12)); w.emit("nibble", F); });
          } },
        { id: "dip", name: { en: "Big Dip + Splash", ko: "쑥 + 첨벙" }, param: "dive 80ms · 12 drops",
          cap: { en: "Then the bobber *dives*. Splash!", ko: "그리고 찌가 *쑥!* 첨벙." },
          bite(w, F) {
            F.by = 0;
            w.tween(F, { by: 24 }, 0.08, "in");
            for (let i = 0; i < 12; i++) w.spawn({ type: "circle", x: 360, y: 232, vx: rand(-160, 160), vy: rand(-320, -120), g: 1100, size: rand(2, 3.5), life: 0.5, color: "186,230,253" });
          } },
        { id: "alert", name: { en: "! Alert", ko: "느낌표!" }, param: "pop + shake .15",
          cap: { en: "A big *!* pops. Now's the moment.", ko: "커다란 *!*가 톡. 지금이에요." },
          bite(w) {
            w.spawn({ type: "text", text: "!", x: 360, y: 170, vy: -20, life: 0.6, size: 54, color: "#fde047" });
            w.shake(0.15);
          } },
        { id: "ripple", name: { en: "Ripples", ko: "물결" }, param: "flat rings",
          cap: { en: "*Ripples* spread with every touch.", ko: "건드릴 때마다 *물결*이 퍼져요." },
          nibble(w) { w.spawn({ type: "ring", flat: true, x: 360, y: 238, size: 6, size1: 40, life: 0.5, w: 3, color: "186,230,253" }); },
          bite(w) { for (let i = 0; i < 3; i++) w.after(i * 0.1, () => w.spawn({ type: "ring", flat: true, x: 360, y: 238, size: 10, size1: 90, life: 0.7, w: 4, color: "186,230,253" })); } },
        { id: "bend", name: { en: "Rod Bend", ko: "낚싯대 휨" }, param: "tension 1 · taut line",
          cap: { en: "The *rod bends*, the line goes *taut*.", ko: "*낚싯대가 휘고*, 줄이 *팽팽*해져요." },
          bite(w, F) { F.ten = 1; }, catch(w, F) { w.tween(F, { ten: 0 }, 0.4, "back"); } },
        { id: "leap", name: { en: "Fish Leap", ko: "물고기 점프" }, param: "arc 700ms · spin",
          cap: { en: "The fish *leaps* out in an arc, right to you.", ko: "물고기가 *포물선*을 그리며 품으로." },
          catch(w, F, f) {
            f.leap = true;
            for (let i = 0; i < 10; i++) w.spawn({ type: "circle", x: 360, y: 232, vx: rand(-200, 100), vy: rand(-380, -160), g: 1100, size: rand(2, 4), life: 0.6, color: "186,230,253" });
          } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "plip · splash · chime",
          cap: { en: "*Plip*, *plip*, *SPLASH*, then a happy *chime*.", ko: "*퐁*, *퐁*, *첨벙!* 그리고 *띠링*." },
          nibble(w) { w.play(() => tn({ f: 900, f2: 1300, dur: 0.05, vol: 0.15 })); }, bite(w) { w.play(() => nz({ f: 1800, f2: 300, dur: 0.3, vol: 0.4 })); }, land(w) { w.sfx.chime(4); } },
      ],
    },

    /* ───────── 27. 탭해서 수확 ───────── */
    {
      id: "sim-tap", cat: "sim", view: "iso",
      title: { en: "Make tap-to-collect *irresistible*", ko: "톡 눌러 걷기를 *못 참게*" },
      intro: { en: "Tap the icon. Icon gone. *Okay.*", ko: "아이콘 누르면 사라짐. *그렇군요.*" },
      interval: 0.6, stepDur: 3.6,
      drawFloor(w, ctx) { isoFloor(ctx); },
      setup(w) {
        mHouse("sim-ph-a", CL.red); mHouse("sim-ph-b", CL.teal); mHouse("sim-ph-c", CL.purple);
        w.S = { money: 2400, shown: 2400, bump: 0, i: 0, tap: null }; w.flyers = [];
        w.hs = [["sim-ph-b", 3.6, 1.2], ["sim-ph-a", 1.2, 1.6], ["sim-ph-c", 2.6, 3.4]].map(([k, gx, gy]) => { const p = isoPt(gx, gy); return { k, x: p.x, y: p.y + 26, ready: true, sc: 1, bob: 0, glow: 0 }; }).sort((a, b) => a.y - b.y);
      },
      fire(w) {
        const S = w.S, b = w.hs[S.i++ % 3]; if (!b.ready) return;
        b.ready = false; S.tap = { x: b.x, y: b.y - 112, t: 0.25 };
        w.emit("tap", b);
        if (!b.flies) S.money += 50;
        w.after(1.3, () => { b.ready = true; b.flies = false; w.emit("ready", b); });
      },
      update(w, dt) {
        const S = w.S; flyStep(w, dt); S.bump = Math.max(0, S.bump - dt * 5);
        if (S.tap) { S.tap.t -= dt; if (S.tap.t <= 0) S.tap = null; }
        for (const b of w.hs) { b.bob = 0; b.glow = 0; }
        S.shown = w.on("bump") ? S.shown + (S.money - S.shown) * Math.min(1, dt * 7) : S.money;
      },
      drawFront(w, ctx) {
        for (const b of w.hs) put(ctx, b.k, b.x, b.y, 100);
        for (const b of w.hs) {
          if (!b.ready) continue;
          const y = b.y - 112 + b.bob;
          if (b.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, b.x, y, 38, "250,204,21", b.glow); ctx.globalCompositeOperation = "source-over"; }
          ctx.save(); ctx.translate(b.x, y); ctx.scale(b.sc, b.sc);
          bubble(ctx, 0, 0, 40, 40, "#f8fafc", "rgba(0,0,0,0.2)"); ico(ctx, "coin", 0, 0, 26); ctx.restore();
        }
        const t = w.S.tap; if (t) { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x + 10, t.y + 14, 9, 0, TAU); ctx.fill(); ctx.stroke(); }
      },
      drawHud(w, ctx) { flyDraw(w, ctx); wallet(ctx, 212, 26, "$" + comma(w.S.shown), w.S.bump, "coin", 120); },
      steps: [
        { id: "idle", name: { en: "Ready Bob + Glow", ko: "둥실 + 빛" }, param: "bob 5px · glow pulse",
          cap: { en: "Ready bubbles *bob and glow*. They beg to be tapped.", ko: "준비된 말풍선은 *둥실둥실 반짝*. 눌러 달라고 해요." },
          update(w) { for (const b of w.hs) { b.bob = Math.sin(w.time * 5 + b.x) * 5; b.glow = 0.35 + 0.25 * Math.sin(w.time * 6 + b.x); } } },
        { id: "ripple", name: { en: "Tap Ripple", ko: "터치 물결" }, param: "ring + squash .7",
          cap: { en: "Answer the finger: a *ripple* and a *squish*.", ko: "손가락에 대답해요. *물결*과 *꾹*." },
          tap(w, b) { w.spawn({ type: "ring", x: b.x, y: b.y - 112, size: 14, size1: 50, life: 0.3, w: 4, color: "255,255,255" }); } },
        { id: "burst", name: { en: "Bubble Burst", ko: "말풍선 팡" }, param: "ring + 10 bits",
          cap: { en: "The bubble *bursts*, not blinks.", ko: "말풍선은 깜빡 말고 *팡* 터져요." },
          tap(w, b) {
            const y = b.y - 112;
            w.spawn({ type: "ring", x: b.x, y, size: 20, size1: 44, life: 0.2, w: 6, color: "248,250,252" });
            for (let i = 0; i < 10; i++) { const a = rand(0, TAU); w.spawn({ type: "chunk", x: b.x, y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, drag: 4, vr: 10, size: 3, life: 0.35, color: "248,250,252" }); }
          } },
        { id: "coins", name: { en: "Coin Arc", ko: "동전 포물선" }, param: "4 coins → wallet",
          cap: { en: "*Coins arc* up to the wallet.", ko: "*동전*이 포물선을 그리며 지갑으로." },
          tap(w, b) {
            b.flies = true;
            for (let i = 0; i < 4; i++) flyer(w, { x0: b.x, y0: b.y - 112, x1: 212, y1: 26, delay: i * 0.05, end: () => { w.S.money += 12.5; w.emit("arrive"); } });
          } },
        { id: "bump", name: { en: "Wallet Bump", ko: "지갑 톡" }, param: "scale 1.35 · roll",
          cap: { en: "Wallet *bumps* and the number *rolls*.", ko: "지갑이 *톡*, 숫자는 *도르륵*." },
          arrive(w) { w.S.bump = 1; } },
        { id: "regrow", name: { en: "Pop Back", ko: "다시 톡" }, param: "scale 0 → 1 back",
          cap: { en: "When it's ready again, it *pops back*.", ko: "다시 준비되면 *톡* 하고 나타나요." },
          ready(w, b) { b.sc = 0; w.tween(b, { sc: 1 }, 0.35, "back"); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "pop · coin ticks",
          cap: { en: "Bubble *pop*, then tiny coin *ticks*.", ko: "말풍선 *뽁*, 그다음 동전 *틱틱*." },
          tap(w) { w.sfx.pop(); }, arrive(w) { w.sfx.blip(8); } },
      ],
    },

    /* ───────── 28. 가게 레벨업 ───────── */
    {
      id: "sim-shoplv", cat: "sim", view: "ui",
      title: { en: "Make shop level-ups *pay off*", ko: "가게 레벨업을 *보람차게*" },
      intro: { en: "Bar resets. Number +1. *That's it?*", ko: "막대 리셋, 숫자 +1. *그게 다예요?*" },
      interval: 0.8, stepDur: 4.0,
      drawFloor() {},
      setup(w) {
        mShop();
        w.L = { lv: 3, xp: 20, shown: 0.2, sm: 0.2, bump: 0, flash: 0, perks: ["Seats +2", "Menu: Pie"], fresh: -1, slide: 0, shine: 0 }; w.flyers = [];
      },
      fire(w) {
        const L = w.L; L.flies = false;
        w.emit("gain", L);
        if (!L.flies) this.add(w, 40);
      },
      add(w, n) {
        const L = w.L; L.xp += n;
        if (L.xp >= 100) {
          L.xp -= 100; L.lv++;
          if (L.perks.length >= 3) L.perks = L.perks.slice(1);
          L.perks.push(pick(["Tips +5%", "Faster Service", "Menu: Cake", "Seats +4", "Menu: Tea"])); L.fresh = L.perks.length - 1;
          w.emit("level", L);
        }
      },
      update(w, dt) {
        const L = w.L; flyStep(w, dt); L.bump = Math.max(0, L.bump - dt * 3); L.flash = Math.max(0, L.flash - dt * 3); L.shine = Math.max(0, L.shine - dt);
        L.shown = L.xp / 100;
      },
      drawFront(w, ctx) {
        const L = w.L;
        rr(ctx, 100, 50, 340, 262, 18, "#1f2430", "rgba(255,255,255,0.14)", 2);
        put(ctx, "sim-shop", 168, 168, 104);
        txt(ctx, "Corner Café", 236, 92, 22, "#fff", "left", 0);
        const s = 1 + L.bump * 0.8;
        ctx.save(); ctx.translate(398, 92); ctx.scale(s, s); ctx.fillStyle = L.bump > 0.1 ? "#c6f432" : "#3b4252"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
        txt(ctx, String(L.lv), 0, 1, 20, L.bump > 0.1 ? "#111" : "#fff", "center", 0); ctx.restore();
        bar(ctx, 236, 130, 176, 14, L.shown, "#c6f432");
        if (w.on("fill") && L.shown > 0.02) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 236 + 176 * L.shown, 137, 22, "198,244,50", 0.8); ctx.globalCompositeOperation = "source-over"; }
        if (L.flash > 0) { ctx.globalAlpha = L.flash; rr(ctx, 233, 127, 182, 20, 10, "#fff"); ctx.globalAlpha = 1; }
        txt(ctx, `XP ${Math.round(L.xp)}/100`, 236, 160, 13, "#94a3b8", "left", 0);
        L.perks.forEach((p, i) => {
          const y = 214 + i * 32, isNew = i === L.fresh, dx = isNew ? L.slide * 220 : 0;
          ctx.save(); ctx.translate(dx, 0);
          rr(ctx, 130, y - 13, 280, 26, 8, isNew && L.shine > 0 ? `rgba(198,244,50,${0.15 + L.shine * 0.3})` : "rgba(255,255,255,0.05)");
          txt(ctx, "◆ " + p, 144, y, 15, "#e2e8f0", "left", 0);
          if (isNew && L.tag) { rr(ctx, 350, y - 9, 48, 18, 9, "#c6f432"); txt(ctx, "NEW", 374, y + 1, 11, "#111", "center", 0); }
          ctx.restore();
        });
      },
      drawHud(w, ctx) { flyDraw(w, ctx); },
      steps: [
        { id: "orbs", name: { en: "XP Orbs", ko: "경험치 구슬" }, param: "4 orbs → bar head",
          cap: { en: "XP *flies in* as glowing orbs.", ko: "경험치가 *빛 구슬*로 날아 들어가요." },
          gain(w, L) {
            L.flies = true;
            for (let i = 0; i < 4; i++) flyer(w, { k: "orb", s: 22, x0: 270 + rand(-80, 80), y0: 330, x1: 236 + 176 * L.shown, y1: 137, cy: 250, delay: i * 0.06, dur: 0.45 });
            w.after(0.6, () => w.R.add(w, 40));
          } },
        { id: "fill", name: { en: "Glowing Fill", ko: "빛나며 차오름" }, param: "lerp ×8 + head glow",
          cap: { en: "The bar *fills smoothly* with a glowing tip.", ko: "막대가 *스르륵*, 끝이 *반짝*." },
          update(w, dt) { const L = w.L; L.sm += (L.xp / 100 - L.sm) * Math.min(1, dt * 8); L.shown = L.sm; } },
        { id: "flash", name: { en: "Overflow Flash", ko: "넘침 번쩍" }, param: "bar white 330ms",
          cap: { en: "Full bar *flashes white* before it resets.", ko: "꽉 차면 리셋 전에 *하얗게* 번쩍." },
          level(w, L) { L.flash = 1; } },
        { id: "burst", name: { en: "Level Burst", ko: "레벨 팡" }, param: "badge 1.8× + rays",
          cap: { en: "The *level badge* bursts with rays.", ko: "*레벨 배지*가 빛줄기와 함께 팡." },
          level(w, L) {
            L.bump = 1;
            w.spawn({ type: "rays", x: 398, y: 92, size: 120, n: 12, vr: 1, life: 0.9, color: "198,244,50" });
            w.spawn({ type: "text", text: "LEVEL UP!", x: 270, y: 34, vy: -10, life: 1, size: 26, color: "#c6f432" });
          } },
        { id: "unlock", name: { en: "Unlock Reveal", ko: "해금 공개" }, param: "slide in + NEW tag",
          cap: { en: "Show *what unlocked*. Slide it in, tag it NEW.", ko: "*뭐가 열렸는지* 보여줘요. 쓱 들어오고 NEW." },
          level(w, L) { L.slide = 1; L.tag = true; L.shine = 1; w.tween(L, { slide: 0 }, 0.4, "back"); } },
        { id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "30 bits",
          cap: { en: "A little *confetti*. You earned it.", ko: "*꽃가루* 조금. 그럴 자격 있어요." },
          level(w) { confetti(w, 398, 100, 30, 0.9); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "orb ticks · fanfare",
          cap: { en: "Soft orb *ticks*, then a *fanfare*.", ko: "구슬은 *톡톡*, 레벨업은 *빠바밤*." },
          gain(w) { w.sfx.blip(3); }, level(w) { w.sfx.fanfare(); } },
      ],
    },

    /* ───────── 29. 퀘스트 게시판 ───────── */
    {
      id: "sim-quest", cat: "sim", view: "ui",
      title: { en: "Make the quest board *rewarding*", ko: "퀘스트 게시판을 *뿌듯하게*" },
      intro: { en: "3/3. Note swaps. *Reward?*", ko: "3/3. 쪽지가 바뀌어요. *보상은?*" },
      interval: 0.6, stepDur: 3.8,
      drawFloor(w, ctx) { rr(ctx, 50, 52, 440, 262, 14, "#8b6b4a"); rr(ctx, 62, 64, 416, 238, 8, "#a9845c"); },
      setup(w) {
        w.S = { gems: 8, bump: 0, k: 0 }; w.flyers = [];
        w.qs = [[150, -0.05, 1], [270, 0.03, 2], [390, -0.02, 0]].map(([x, rot, prog], i) => this.note(w, x, rot, prog, i));
      },
      TITLES: ["Bake 3 bread", "Serve 3 guests", "Water 3 crops", "Sell 3 cakes", "Clean 3 tables", "Catch 3 fish"],
      note(w, x, rot, prog, i) { return { x, rot, prog, need: 3, title: this.TITLES[(i + w.S.k++) % 6], dy: 0, a: 1, seal: 0, sr: 0, shown: prog / 3, bump: 0, psy: 1, glow: 0 }; },
      fire(w) {
        const q = w.qs.filter(q => !q.done).sort((a, b) => b.prog - a.prog)[0]; if (!q) return;
        q.prog++; w.emit("progress", q);
        if (q.prog >= q.need) {
          q.done = true; w.emit("complete", q);
          w.after(0.9, () => { const i = w.qs.indexOf(q), n = this.note(w, q.x, rand(-0.06, 0.06), 0, i); w.qs[i] = n; w.emit("pin", n); });
        }
      },
      update(w, dt) {
        const S = w.S; flyStep(w, dt); S.bump = Math.max(0, S.bump - dt * 5);
        for (const q of w.qs) { q.bump = Math.max(0, q.bump - dt * 5); q.psy += (1 - q.psy) * Math.min(1, dt * 10); q.shown = q.prog / q.need; }
      },
      drawFront(w, ctx) {
        for (const q of w.qs) {
          if (q.a <= 0) continue;
          ctx.save(); ctx.globalAlpha = q.a; ctx.translate(q.x, 182 + q.dy); ctx.rotate(q.rot);
          ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-50, -66, 108, 140);
          rr(ctx, -54, -70, 108, 140, 3, "#fef9c3");
          txt(ctx, q.title, 0, -36, 13, "#44403c", "center", 0);
          ctx.save(); ctx.translate(0, 8); ctx.scale(1 + q.bump * 0.15, 1 + q.bump * 0.15);
          rr(ctx, -40, -6, 80, 12, 6, "#e7e5e4"); if (q.shown > 0) rr(ctx, -40, -6, Math.max(12, 80 * Math.min(1, q.shown)), 12, 6, q.prog >= q.need ? "#22c55e" : "#f59e0b");
          ctx.restore();
          txt(ctx, `${q.prog}/${q.need}`, 0, 34, 16, "#57534e", "center", 0);
          if (q.seal > 0) { ctx.save(); ctx.translate(18, 34); ctx.rotate(q.sr); ctx.scale(q.seal, q.seal); ctx.fillStyle = "#16a34a"; ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill(); ctx.strokeStyle = "#bbf7d0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.stroke(); txt(ctx, "✓", 0, 1, 24, "#fff", "center", 0); ctx.restore(); }
          ctx.save(); ctx.translate(0, -62); ctx.scale(1 / q.psy, q.psy); ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(-2, -2, 2, 0, TAU); ctx.fill(); ctx.restore();
          ctx.restore();
        }
      },
      drawHud(w, ctx) { flyDraw(w, ctx); wallet(ctx, 220, 26, String(w.S.gems), w.S.bump, "gem", 92); },
      steps: [
        { id: "tick", name: { en: "Progress Tick", ko: "진행 칸 톡" }, param: "lerp bar · bump",
          cap: { en: "Each step *ticks* the bar up with a bump.", ko: "한 번 할 때마다 막대가 *톡* 올라요." },
          progress(w, q) { q.bump = 1; },
          update(w, dt) { for (const q of w.qs) { q.from = q.from ?? q.shown; q.from += (q.prog / q.need - q.from) * Math.min(1, dt * 8); q.shown = q.from; } } },
        { id: "seal", name: { en: "Seal Spin", ko: "완료 도장 빙글" }, param: "scale 2.2 → 1 · spin",
          cap: { en: "A *seal* spins down onto the finished note.", ko: "끝난 쪽지에 *도장*이 빙글 쾅." },
          complete(w, q) {
            q.seal = 2.2;
            q.sr = -2;
            w.tween(q, { seal: 1, sr: -0.2 }, 0.22, "in", () => w.shake(0.12));
          } },
        { id: "tear", name: { en: "Tear Off", ko: "쪽지 떼기" }, param: "pin pops · fall 450ms",
          cap: { en: "The pin *pops* and the note *flutters* away.", ko: "핀이 *톡* 빠지고 쪽지는 *팔랑* 떨어져요." },
          complete(w, q) {
            w.after(0.45, () => {
              w.spawn({ type: "chunk", x: q.x, y: 120, vx: rand(-120, 120), vy: -300, g: 1200, vr: 12, size: 5, life: 0.6, color: "239,68,68" });
              w.tween(q, { dy: 220, rot: q.rot + 0.9, a: 0 }, 0.45, "in");
            });
          } },
        { id: "reward", name: { en: "Reward Fly", ko: "보상 날아가기" }, param: "3 gems → counter",
          cap: { en: "*Gems fly* from the note to your counter.", ko: "쪽지에서 *보석*이 날아 내 칸으로." },
          complete(w, q) { for (let i = 0; i < 3; i++) flyer(w, { k: "gem", s: 24, x0: q.x, y0: 190, x1: 220, y1: 26, delay: 0.2 + i * 0.08, end: () => { w.S.gems++; w.S.bump = 1; } }); } },
        { id: "pin", name: { en: "Pin Drop", ko: "새 쪽지 꽂기" }, param: "drop −260 · back · pin squash",
          cap: { en: "The next note *drops in* and gets *pinned*.", ko: "다음 쪽지가 *툭* 내려와 *콕* 꽂혀요." },
          pin(w, q) { q.dy = -260; w.tween(q, { dy: 0 }, 0.35, "back", () => { q.psy = 0.5; }); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick · stamp · rustle",
          cap: { en: "*Tick*, a *stamp*, paper *rustle*, a *tack*.", ko: "*틱*, *쾅*, 종이 *사락*, 핀 *콕*." },
          progress(w) { w.sfx.tick(); }, complete(w) { w.after(0.2, () => w.sfx.thunk()); w.after(0.45, () => w.sfx.swish()); }, pin(w) { w.after(0.3, () => w.sfx.tock()); } },
      ],
    },

    /* ───────── 30. 알림 배지 ───────── */
    {
      id: "sim-badge", cat: "sim", view: "ui",
      title: { en: "Make notification badges *pop*", ko: "알림 배지가 *톡* 튀게" },
      intro: { en: "A red dot. Did it just change?", ko: "빨간 점. *방금 바뀐 거예요?*" },
      interval: 0.8, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        w.bs = [0, 1, 2, 3].map(i => ({ i, x: 120 + i * 100, y: 250, n: i === 2 ? 2 : 0, sc: 1, wig: 0, roll: 0, wait: 0 }));
        w.S = { toast: 0, k: 0 }; w.flyers = [];
      },
      fire(w) {
        const S = w.S, b = w.bs[[2, 2, 1, 2, 3][S.k++ % 5]];
        if (w.bs.reduce((s, q) => s + q.n, 0) >= 9) for (const q of w.bs) q.n = 0;
        b.wait = 0; w.emit("notify", b);
        w.after(b.wait, () => { b.n++; w.emit("arrive", b); });
      },
      update(w, dt) { flyStep(w, dt); for (const b of w.bs) { b.sc += (1 - b.sc) * Math.min(1, dt * 10); b.wig = Math.max(0, b.wig - dt * 2); b.roll = Math.max(0, b.roll - dt * 5); } },
      drawFront(w, ctx) {
        const S = w.S;
        for (let i = 0; i < 3; i++) { rr(ctx, 90, 56 + i * 48, 360, 38, 10, "rgba(255,255,255,0.05)"); rr(ctx, 104, 66 + i * 48, 18, 18, 9, "rgba(255,255,255,0.1)"); rr(ctx, 132, 70 + i * 48, 140 - i * 30, 10, 5, "rgba(255,255,255,0.1)"); }
        rr(ctx, 60, 212, 420, 76, 22, "#1f2430", "rgba(255,255,255,0.12)", 1.5);
        const draw = [
          c => { c.beginPath(); c.moveTo(-16, -2); c.lineTo(0, -16); c.lineTo(16, -2); c.lineTo(12, -2); c.lineTo(12, 14); c.lineTo(-12, 14); c.lineTo(-12, -2); c.closePath(); c.fill(); },
          c => { c.beginPath(); c.moveTo(-14, -8); c.lineTo(14, -8); c.lineTo(11, 14); c.lineTo(-11, 14); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = c.fillStyle; c.beginPath(); c.arc(0, -8, 7, Math.PI, TAU); c.stroke(); },
          c => { c.fillRect(-16, -11, 32, 22); c.strokeStyle = "#1f2430"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-15, -10); c.lineTo(0, 2); c.lineTo(15, -10); c.stroke(); },
          c => { c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 11 : 16; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = "#1f2430"; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); },
        ];
        for (const b of w.bs) {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.sin(w.time * 40) * 0.35 * b.wig); ctx.fillStyle = b.n ? "#e2e8f0" : "#64748b"; draw[b.i](ctx); ctx.restore();
          if (!b.n) continue;
          ctx.save(); ctx.translate(b.x + 18, b.y - 18); ctx.scale(b.sc, b.sc);
          ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill(); ctx.strokeStyle = "#1f2430"; ctx.lineWidth = 3; ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.clip();
          if (b.roll > 0) { txt(ctx, String(b.n - 1), 0, 1 - (1 - b.roll) * 22, 14, "#fff", "center", 0); txt(ctx, String(b.n), 0, 1 + b.roll * 22, 14, "#fff", "center", 0); }
          else txt(ctx, String(b.n), 0, 1, 14, "#fff", "center", 0);
          ctx.restore();
        }
        if (S.toast > 0) { ctx.save(); ctx.translate(270, -40 + S.toast * 110); rr(ctx, -110, -20, 220, 40, 20, "#f8fafc"); ico(ctx, "mail", -84, 0, 26); txt(ctx, "New message!", 8, 1, 16, "#111", "center", 0); ctx.restore(); }
      },
      drawHud(w, ctx) { flyDraw(w, ctx); },
      steps: [
        { id: "pop", name: { en: "Badge Pop", ko: "배지 톡" }, param: "0 → 1.5 → 1",
          cap: { en: "The badge *pops in* and bumps on every new one.", ko: "배지가 *톡* 튀어나오고, 올 때마다 또 톡." },
          arrive(w, b) { b.sc = b.n === 1 ? 0 : 1.5; if (b.n === 1) w.tween(b, { sc: 1 }, 0.3, "back"); } },
        { id: "wiggle", name: { en: "Icon Wiggle", ko: "아이콘 흔들" }, param: "±0.35 rad · 500ms",
          cap: { en: "The icon *wiggles* like a ringing bell.", ko: "아이콘이 종처럼 *달랑달랑*." },
          arrive(w, b) { b.wig = 1; } },
        { id: "ring", name: { en: "Pulse Ring", ko: "퍼지는 고리" }, param: "ring 12 → 40",
          cap: { en: "A red *pulse ring* draws the eye.", ko: "빨간 *고리*가 퍼지며 시선을 끌어요." },
          arrive(w, b) { w.spawn({ type: "ring", x: b.x + 18, y: b.y - 18, size: 12, size1: 42, life: 0.45, w: 4, color: "239,68,68" }); } },
        { id: "fly", name: { en: "Fly-in", ko: "날아 들어오기" }, param: "mail arc 400ms",
          cap: { en: "Show *what arrived*: it flies into the icon.", ko: "*뭐가 왔는지* 보여줘요. 아이콘으로 쏙." },
          notify(w, b) {
            b.wait = 0.4;
            flyer(w, { k: "mail", s: 30, x0: 270, y0: 90, x1: b.x, y1: b.y, cx: (270 + b.x) / 2, cy: 40, dur: 0.4 });
          } },
        { id: "roll", name: { en: "Number Roll", ko: "숫자 굴리기" }, param: "slide 200ms",
          cap: { en: "The count *rolls* to the next number.", ko: "숫자가 위로 *또르륵* 넘어가요." },
          arrive(w, b) { if (b.n > 1) b.roll = 1; } },
        { id: "toast", name: { en: "Toast Banner", ko: "토스트 알림" }, param: "slide down 1.2s",
          cap: { en: "A short *toast* says what it is.", ko: "짧은 *알림 띠*가 무슨 일인지 알려줘요." },
          notify(w) { w.tween(w.S, { toast: 1 }, 0.25, "back", () => w.after(0.6, () => w.tween(w.S, { toast: 0 }, 0.2, "in"))); } },
        { id: "sound", name: { en: "Sound", ko: "소리" }, param: "two-note ding",
          cap: { en: "A light *two-note ding*. Never a harsh beep.", ko: "가벼운 *딩동*. 거친 삐 소리는 금지." },
          arrive(w) { w.sfx.chime(0); w.after(0.09, () => w.sfx.chime(5)); } },
      ],
    },
  );
})();

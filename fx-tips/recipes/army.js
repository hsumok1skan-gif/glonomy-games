"use strict";
/* army — 여럿 대 여럿: 전투, RTS 교전, 오토배틀러 */
(() => {
  // ───── 팀 색과 로우폴리 병사 ─────
  const TEAM = {
    b: [[120, 170, 255], [20, 38, 96]],
    r: [[255, 122, 110], [100, 22, 26]],
    g: [[176, 176, 182], [56, 56, 64]],
    y: [[253, 224, 120], [120, 80, 10]],
  };
  const RGB = { b: "96,165,250", r: "248,113,113", g: "180,180,186", y: "250,204,21" };
  const RIM = { b: "#bfdbfe", r: "#fecaca", g: "#d4d4d8", y: "#fef08a" };
  const paint = k => o => Object.assign(o, { light: TEAM[k][0], dark: TEAM[k][1] });
  const soldier = k => {
    const T = paint(k);
    return [
      blk(0, 0, -11, 22, 44, 18, 0.9), blk(0, 0, 11, 22, 44, 18, 0.9),
      T(blk(0, 42, 0, 34, 46, 46, 1.12)),
      blk(0, 88, 0, 10, 6, 14),
      blk(2, 92, 0, 34, 30, 32, 0.85),
      T(pyr([[-20, 118, -19], [20, 118, -19], [20, 118, 19], [-20, 118, 19]], [0, 142, 0])),
      T(blk(12, 34, 32, 30, 54, 8)),
      blk(18, 10, -31, 5, 128, 5),
      pyr([[15, 136, -34], [21, 136, -34], [21, 136, -28], [15, 136, -28]], [18, 158, -31]),
    ];
  };
  const soldierTop = k => {
    const T = paint(k);
    return [
      T(blk(0, 40, 0, 26, 40, 54, 0.95)),
      blk(2, 80, 0, 22, 16, 22),
      T(pyr([[-12, 96, -12], [12, 96, -12], [12, 96, 12], [-12, 96, 12]], [0, 112, 0])),
      T(blk(8, 30, -32, 26, 44, 8)),
      T(blk(-20, 44, 0, 14, 30, 46, 0.8)),
      blk(26, 70, 24, 48, 5, 5),
      pyr([[50, 68, 21], [50, 68, 27], [50, 76, 27], [50, 76, 21]], [62, 72, 24]),
    ];
  };
  const rider = k => {
    const T = paint(k);
    return [
      blk(-34, 0, -12, 10, 46, 10), blk(-34, 0, 12, 10, 46, 10), blk(30, 0, -12, 10, 46, 10), blk(30, 0, 12, 10, 46, 10),
      blk(0, 44, 0, 96, 36, 34),
      blk(46, 66, 0, 20, 40, 20, 0.8, 10, 0), blk(64, 98, 0, 36, 18, 18),
      T(blk(-6, 80, 0, 30, 40, 36, 1.1)), blk(-4, 120, 0, 26, 24, 26, 0.85),
      T(pyr([[-18, 142, -15], [14, 142, -15], [14, 142, 15], [-18, 142, 15]], [-2, 164, 0])),
      blk(56, 100, 24, 110, 5, 5),
    ];
  };
  const catapultModel = () => [
    blk(0, 10, 0, 130, 16, 60), blk(-48, 0, -32, 22, 22, 6), blk(-48, 0, 32, 22, 22, 6), blk(48, 0, -32, 22, 22, 6), blk(48, 0, 32, 22, 22, 6),
    blk(14, 26, -22, 12, 60, 10, 0.8), blk(14, 26, 22, 12, 60, 10, 0.8), blk(14, 84, 0, 14, 10, 54),
  ];
  function ensure() {
    for (const k of ["b", "r", "g", "y"]) {
      polySprite(`army-${k}-i`, () => soldier(k), 70, 100, -0.72, 0.3);
      polySprite(`army-${k}-t`, () => soldierTop(k), 80, 80, 0, Math.PI / 2 - 0.001);
    }
    polySprite("army-cav", () => rider("b"), 150, 120, -0.5, 0.25);
    polySprite("army-cata", catapultModel, 150, 90, -0.5, 0.3, [214, 170, 120], [70, 44, 22]);
  }
  const TC = new WeakMap();
  const tint = (c, col) => {
    let m = TC.get(c); if (!m) TC.set(c, (m = new Map()));
    if (!m.has(col)) m.set(col, tinted(c, col));
    return m.get(col);
  };
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];

  // ───── 유닛 ─────
  function U(w, team, x, y, o = {}) {
    const u = Object.assign({ team, x, y, hx: x, hy: y, ox: 0, oy: 0, sx: 1, sy: 1, rot: 0, face: team === "r" ? Math.PI : 0,
      flash: 0, alpha: 1, hp: 10, maxHp: 10, hpLag: 10, alive: true, h: 36, top: false, flip: team === "r", skin: null, dead: false }, o);
    (w.U || (w.U = [])).push(u);
    return u;
  }
  const sprOf = u => SPR[u.spr || `army-${u.skin || u.team}-${u.top ? "t" : "i"}`];
  function drawU(ctx, u, rim) {
    if (u.alpha <= 0.01) return;
    const s = sprOf(u), h = u.h, wd = h * s.c.width / s.c.height, y0 = u.top ? -h / 2 : -h;
    ctx.save(); ctx.globalAlpha = Math.min(1, u.alpha);
    ctx.translate(u.x + u.ox, u.y + u.oy);
    if (u.top) ctx.rotate(u.face + u.rot); else if (u.rot) ctx.rotate(u.rot);
    ctx.scale(u.sx * (u.flip && !u.top ? -1 : 1), u.sy);
    if (rim) { const t = tint(s.c, rim); for (const [dx, dy] of D8) ctx.drawImage(t, -wd / 2 + dx * 1.8, y0 + dy * 1.8, wd, h); }
    ctx.drawImage(s.c, -wd / 2, y0, wd, h);
    if (u.flash > 0) { ctx.globalAlpha = Math.min(1, u.alpha) * Math.min(1, u.flash); ctx.drawImage(s.white, -wd / 2, y0, wd, h); }
    ctx.restore();
  }
  function drawShadowU(ctx, u) {
    if (u.alpha <= 0.01 || u.noShadow) return;
    ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.min(1, u.alpha)})`; ctx.beginPath();
    if (u.top) ctx.ellipse(u.x + u.ox + 3, u.y + u.oy + 4, u.h * 0.42, u.h * 0.42, 0, 0, TAU);
    else ctx.ellipse(u.x + u.ox, u.y, u.h * 0.32, u.h * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  // 그리기: under → 그림자 → (원판) → 유닛(y 순) → 앞 효과
  function drawUnits(w, ctx, o = {}) {
    const L = (w.U || []).slice().sort((a, b) => a.y - b.y);
    for (const u of L) drawShadowU(ctx, u);
    if (o.disc) for (const u of L) if (u.alpha > 0.05) {
      ctx.fillStyle = `rgba(${RGB[u.team]},${0.55 * u.alpha})`; ctx.strokeStyle = `rgba(${RGB[u.team]},${u.alpha})`; ctx.lineWidth = 2;
      ctx.beginPath(); if (u.top) ctx.arc(u.x + u.ox, u.y + u.oy, u.h * 0.55, 0, TAU); else ctx.ellipse(u.x + u.ox, u.y, u.h * 0.42, u.h * 0.14, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
    }
    for (const u of L) { if (o.pre) o.pre(u); drawU(ctx, u, o.rim ? o.rim(u) : null); }
  }
  function uStep(w, dt) {
    for (const u of w.U || []) {
      if (u.fly) {
        u.x += u.vx * dt; u.oy += u.vy * dt; u.vy += 1500 * dt; u.rot += u.spin * dt;
        if (u.vy > 0 && u.oy >= 0) {
          Object.assign(u, { fly: false, dead: true, oy: 0, rot: Math.sign(u.spin || 1) * Math.PI / 2 });
          dust(w, u.x, u.y, 3, 0, "190,175,150");
        }
      } else if (!u.hold) { u.ox -= u.ox * Math.min(1, dt * 10); u.oy -= u.oy * Math.min(1, dt * 10); }
      if (!u.dead) { u.sx += (1 - u.sx) * Math.min(1, dt * 12); u.sy += (1 - u.sy) * Math.min(1, dt * 12); }
      if (!u.dead && !u.fly) u.rot -= u.rot * Math.min(1, dt * 4);
      u.flash = Math.max(0, u.flash - dt * 6);
    }
    for (const f of w.FX || []) f.t += dt;
    if (w.FX) w.FX = w.FX.filter(f => f.t < f.life);
  }
  // 다시 쏘면 진행 중인 움직임을 끊고 새로 시작 (세대 번호로 묵은 타이머 무시)
  function restart(w, objs) { w.tweens = w.tweens.filter(t => !objs.includes(t.o)); return (w.gen = (w.gen || 0) + 1); }
  const launch = (u, vx, vy, spin) => Object.assign(u, { fly: true, vx, vy, spin });
  const reset = u => Object.assign(u, { fly: false, dead: false, x: u.hx, y: u.hy, ox: 0, oy: 0, rot: 0, alpha: 1, skin: null, hp: u.maxHp, sx: 0.3, sy: 0.3 });
  // 그림 효과: draw(ctx, k) 를 수명 동안 그림 (k = 0..1)
  const fx = (w, life, draw, under = false) => (w.FX || (w.FX = [])).push({ t: 0, life, draw, under });
  const drawFX = (w, ctx, under) => { for (const f of w.FX || []) if (!!f.under === under) { ctx.save(); f.draw(ctx, f.t / f.life); ctx.restore(); } };
  const nearest = (w, u, pred) => (w.U || []).filter(pred).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0];

  // ───── 바닥 ─────
  function isoField(w, ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(-40, 104, 620, 260);
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) { const y = 110 + i * i * 5.2; ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(580, y); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-40, 104, 620, 1.5);
  }
  function board(w, ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(14, 14, 512, 332);
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 3; ctx.strokeRect(14, 14, 512, 332);
  }
  function grass(w, ctx) {
    const s = sprite("army-grass", 512, 332, x => {
      x.fillStyle = "#2a3326"; x.fillRect(0, 0, 512, 332);
      for (let i = 0; i < 520; i++) {
        x.fillStyle = pick(["#36412f", "#1f271c", "#3d3a2a", "#2f3b3c", "#46503a", "#4a3a3a"]);
        x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 332, rand(4, 16), rand(3, 10), rand(0, 3), 0, TAU); x.fill();
      }
    });
    ctx.drawImage(s.c, 14, 14);
  }

  // ───── 작은 그림 도우미 ─────
  function chevrons(w, p, col = "198,244,50") {
    fx(w, 0.7, (ctx, k) => {
      ctx.strokeStyle = `rgba(${col},${1 - k})`; ctx.lineWidth = 3; ctx.lineJoin = "round";
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, d = 34 - 26 * E.out(k);
        ctx.save(); ctx.translate(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d); ctx.rotate(a + Math.PI);
        ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(3, 0); ctx.lineTo(-5, 7); ctx.stroke(); ctx.restore();
      }
    });
  }
  function marker(w, p) {
    fx(w, 1.6, (ctx, k) => {
      const r = k < 0.15 ? 56 - 40 * E.out(k / 0.15) : 16 + Math.sin(k * 30) * 2, a = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.strokeStyle = `rgba(198,244,50,${a})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.8, 0, 0, TAU); ctx.stroke();
      glow(ctx, p.x, p.y, 22, "198,244,50", 0.8 * a);
    }, true);
  }
  function trail(w, x0, y0, x1, y1, life = 0.9) {
    fx(w, life, (ctx, k) => {
      ctx.setLineDash([6, 6]); ctx.strokeStyle = `rgba(198,244,50,${0.85 * (1 - k)})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }, true);
  }
  function ghost(w, x, y, life = 0.8, r = 14) {
    fx(w, life, (ctx, k) => {
      ctx.strokeStyle = `rgba(198,244,50,${0.8 * (1 - k)})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(198,244,50,${0.18 * (1 - k)})`; ctx.fill();
    }, true);
  }
  function callout(w, text, x, y, life, col = "#c6f432") {
    fx(w, life, (ctx, k) => {
      const s = E.back(Math.min(1, k * life / 0.2));
      ctx.globalAlpha = k > 0.9 ? (1 - k) * 10 : 1; ctx.translate(x, y); ctx.scale(s, s);
      label(ctx, text, 0, 0, 30, col, "center", "Pretendard, sans-serif", 900);
    });
  }
  function pill(ctx, text, x, y, size, bg, fg = "#0b0c10") {
    ctx.font = `900 ${size}px Pretendard, sans-serif`;
    const tw = ctx.measureText(text).width + size * 0.9;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - tw / 2, y - size * 0.75, tw, size * 1.5, size * 0.4); ctx.fill();
    label(ctx, text, x, y + 1, size, fg);
  }
  function cursor(ctx, x, y, down) {
    ctx.save(); ctx.translate(x, y); if (down) ctx.scale(0.88, 0.88);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0b0c10"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.lineTo(6, 16); ctx.lineTo(11, 26); ctx.lineTo(15, 24); ctx.lineTo(10, 15); ctx.lineTo(18, 15); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function arrowSm(ctx, x, y, a, al = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = al;
    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(7, 0); ctx.stroke();
    ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -3.5); ctx.lineTo(5, 3.5); ctx.fill();
    ctx.fillStyle = "#fb7185"; ctx.fillRect(-14, -2.5, 5, 5);
    ctx.restore();
  }
  const arrowShot = (ctx, p) => arrowSm(ctx, p.x, p.y, p.align ? Math.atan2(p.vy, p.vx) : 0);
  function stuckArrow(w, x, y, a) { fx(w, 2.5, (ctx, k) => arrowSm(ctx, x - Math.cos(a) * 5, y - Math.sin(a) * 5, a, Math.min(1, (1 - k) * 4))); }
  function dangerZone(w, x, y, rx, ry, life) {
    fx(w, life, (ctx, k) => {
      const a = k < 0.8 ? 0.15 + 0.35 * k : 0.43 * (1 - k) / 0.2;
      ctx.fillStyle = `rgba(239,68,68,${a})`; ctx.strokeStyle = `rgba(252,165,165,${a * 1.6})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }, true);
  }
  function growShadow(w, x, y, life) {
    fx(w, life, (ctx, k) => {
      ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.5 * k})`;
      ctx.beginPath(); ctx.ellipse(x, y, 6 + 40 * k * k, 2 + 12 * k * k, 0, 0, TAU); ctx.fill();
    }, true);
  }
  function drawRock(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
    ctx.fillStyle = "#9a948a"; ctx.strokeStyle = "#3f3a33"; ctx.lineWidth = 2;
    ctx.beginPath(); [[-11, -4], [-4, -11], [8, -9], [12, 2], [5, 11], [-8, 9]].forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-5, -7, 6, 3);
    ctx.restore();
  }
  const armPivot = w => ({ x: w.cata.x + 6, y: w.cata.y - 44 });
  const armTip = w => { const p = armPivot(w); return { x: p.x + Math.cos(w.arm.a) * 58, y: p.y + Math.sin(w.arm.a) * 58 }; };
  function crackLine(x, y, n) {
    const pts = [[x, y]]; let a = rand(-0.8, 0.8);
    for (let i = 0; i < n; i++) { a += rand(-0.6, 0.6); x += Math.cos(a) * 11; y += Math.sin(a) * 11; pts.push([x, y]); }
    return pts;
  }

  function edgeArrow(w, fx_, fy_) {
    const cx = 270, cy = 190, a = Math.atan2(fy_ - 0.5, fx_ - 0.5), r = 150;
    const x = cx + Math.cos(a) * r * 1.5, y = cy + Math.sin(a) * r;
    fx(w, 2.4, (ctx, k) => {
      const p = 1 + 0.15 * Math.sin(k * 48);
      ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      ctx.translate(x, y); ctx.rotate(a); ctx.scale(p, p);
      ctx.fillStyle = "#ef4444"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -14); ctx.lineTo(-4, 0); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  }

  // 오토배틀러 판
  const AB = { x: 116, y: 58, s: 44 };
  function abBoard(w, ctx) {
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
      ctx.fillStyle = (r + c) % 2 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)";
      ctx.fillRect(AB.x + c * AB.s, AB.y + r * AB.s, AB.s, AB.s);
    }
    ctx.fillStyle = "rgba(248,113,113,0.05)"; ctx.fillRect(AB.x, AB.y, AB.s * 7, AB.s * 3);
    ctx.fillStyle = "rgba(96,165,250,0.05)"; ctx.fillRect(AB.x, AB.y + AB.s * 3, AB.s * 7, AB.s * 3);
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; ctx.strokeRect(AB.x, AB.y, AB.s * 7, AB.s * 6);
  }
  function banner(w, text, life) {
    fx(w, life, (ctx, k) => {
      const x = k < 0.2 ? -200 + 470 * E.out(k / 0.2) : k > 0.8 ? 270 + 470 * E.in((k - 0.8) / 0.2) : 270;
      ctx.fillStyle = `rgba(0,0,0,${0.4 * Math.sin(Math.PI * k)})`; ctx.fillRect(14, 14, 512, 332);
      ctx.fillStyle = "#c6f432"; ctx.beginPath(); ctx.moveTo(x - 170, 166); ctx.lineTo(x + 180, 166); ctx.lineTo(x + 160, 214); ctx.lineTo(x - 190, 214); ctx.closePath(); ctx.fill();
      label(ctx, text, x - 5, 191, 30, "#0b0c10", "center", "Pretendard, sans-serif", 900);
    });
  }
  function stamp(w, text, x, y, life, col) {
    fx(w, life, (ctx, k) => {
      const s = 2.2 - 1.2 * E.back(Math.min(1, k * life / 0.15));
      ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1; ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.06);
      ctx.lineWidth = 8; ctx.strokeStyle = "#0b0c10"; ctx.lineJoin = "round"; ctx.font = "900 54px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0);
    });
  }
  // 안개
  function fogReset(w) {
    const m = w.mask.getContext("2d");
    m.globalCompositeOperation = "source-over"; m.clearRect(0, 0, 540, 360);
    m.fillStyle = "#07080c"; m.fillRect(14, 14, 512, 332);
    w.foes.forEach(e => (e.seen = false));
    const s = w.scout; Object.assign(s, { x: s.hx, y: s.hy, lx: null });
    reveal(w, s.x, s.y, 80);
  }
  function reveal(w, x, y, r) {
    const m = w.mask.getContext("2d");
    m.globalCompositeOperation = "destination-out";
    if (w.soft) {
      const g = m.createRadialGradient(x, y, r * 0.45, x, y, r * 1.25);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      m.fillStyle = g; m.beginPath(); m.arc(x, y, r * 1.25, 0, TAU); m.fill();
    } else { m.fillStyle = "#000"; m.beginPath(); m.arc(x, y, r, 0, TAU); m.fill(); }
  }
  function fogClouds() {
    return sprite("army-cloud", 540, 360, x => {
      x.fillStyle = "#0a0c12"; x.fillRect(0, 0, 540, 360);
      for (let i = 0; i < 70; i++) {
        const cx = Math.random() * 540, cy = Math.random() * 360, r = rand(30, 80);
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(70,78,98,0.35)"); g.addColorStop(1, "rgba(70,78,98,0)");
        x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    });
  }

  RECIPES.push(
    // 1 ─ 앞줄 충돌
    {
      id: "army-clash", cat: "army", view: "iso", polished: true,
      title: { en: "Make the front lines *collide*", ko: "두 군대가 *쾅* 부딪히게" },
      intro: { en: "Two blocks slide together. *Politely.*", ko: "두 덩어리가 스르륵 붙어요. *얌전하게*." },
      interval: 1.3, stepDur: 3.6,
      drawFloor: isoField,
      setup(w) {
        ensure(); w.U = [];
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
          U(w, "b", 60 + c * 40, 150 + r * 38, { rank: 2 - c, h: 42 });
          U(w, "r", 480 - c * 40, 150 + r * 38, { rank: 2 - c, h: 42 });
        }
      },
      fire(w) {
        const g = restart(w, w.U);
        for (const u of w.U) {
          u.x = u.hx; u.delay = 0;
          w.emit("charge", u);
          const dx = u.team === "b" ? 118 : -118;
          w.after(u.delay, () => g === w.gen && w.tween(u, { x: u.hx + dx }, 0.26, "in", () => {
            if (u.rank === 0 && u.team === "b") w.emit("clash", { x: u.x + 20, y: u.y - 20 });
          }));
        }
        w.after(0.75, () => g === w.gen && w.U.forEach(u => w.tween(u, { x: u.hx }, 0.35, "inout")));
      },
      update(w, dt) { uStep(w, dt); },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      steps: [
        {
          id: "lean", name: { en: "Lean In", ko: "몸 기울이기" }, param: "tilt 16° · stretch",
          cap: { en: "Running units *lean forward*. Static ones look like *pieces*.", ko: "달리는 병사는 *앞으로 기울어요*." },
          charge(w, u) { u.rot = u.team === "b" ? 0.28 : -0.28; u.sx = 1.2; u.sy = 0.86; },
        },
        {
          id: "stagger", name: { en: "Ragged Wave", ko: "들쭉날쭉 출발" }, param: "+0~130ms each",
          cap: { en: "Don't move as one block. *Stagger* every soldier.", ko: "한 덩어리로 말고, *제각각* 출발해요." },
          charge(w, u) { u.delay = u.rank * 0.03 + rand(0, 0.07); },
        },
        {
          id: "spark", name: { en: "Contact Sparks", ko: "부딪힘 불꽃" }, param: "star + 12 sparks",
          cap: { en: "Every row that meets *throws sparks*.", ko: "닿는 줄마다 *불꽃*이 튀어요." },
          clash(w, p) {
            w.spawn({ type: "star", x: p.x, y: p.y, size: 26, life: 0.16, color: "255,255,255" });
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 22, size1: 6, life: 0.3, under: true, color: "255,190,90" });
            for (let i = 0; i < 12; i++) w.spawn({ type: "spark", x: p.x, y: p.y, vx: rand(-300, 300), vy: rand(-360, 60), g: 900, drag: 2, life: rand(0.3, 0.55), size: 2.6, color: "255,220,150" });
          },
        },
        {
          id: "recoil", name: { en: "Recoil", ko: "튕겨 나감" }, param: "front row ±18px",
          cap: { en: "The front row *bounces back* and flashes.", ko: "맨 앞줄이 *튕기며* 번쩍." },
          clash(w, p) {
            for (const u of w.U) if (u.rank === 0 && Math.abs(u.y - 20 - p.y) < 4) {
              u.ox += u.team === "b" ? -18 : 18; u.flash = 1;
            }
          },
        },
        {
          id: "dust", name: { en: "Line Dust", ko: "전선 흙먼지" }, param: "ring + 4 puffs · 2s",
          cap: { en: "Kick up *dust* along the whole front.", ko: "전선을 따라 *흙먼지*가 일어요." },
          clash(w, p) {
            w.spawn({ type: "ring", flat: true, x: p.x, y: p.y + 20, size: 6, size1: 44, life: 0.4, w: 4, color: "220,200,160" });
            for (let i = 0; i < 4; i++) w.spawn({ type: "smoke", x: p.x + rand(-16, 16), y: p.y + 14, vx: rand(-50, 50), vy: rand(-30, -8), drag: 1.5, size: rand(6, 9), size1: rand(16, 22), life: rand(1.2, 1.6), color: "96,88,74" });
          },
        },
        {
          id: "shake", name: { en: "Rolling Shake", ko: "줄줄이 흔들림" }, param: "trauma .08 × rows",
          cap: { en: "Small shake *per row*. It rolls like *thunder*.", ko: "줄마다 *살짝씩*. 천둥처럼 *구르는* 흔들림." },
          clash(w) { w.shake(0.08); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clang × rows",
          cap: { en: "A *clang* per row, each pitch a bit off.", ko: "줄마다 *챙*, 음높이는 조금씩 다르게." },
          clash(w) { w.sfx.hit(rand(0.8, 1.2)); if (w.on("spark")) w.play(() => { sMetal(1700 * rand(0.9, 1.1), 0.3, 0.08); sMetal(2300 * rand(0.9, 1.1), 0.25, 0.05, 0.05); }); },
        },
      ],
    },

    // 2 ─ 팀 색과 외곽선
    {
      id: "army-colors", cat: "army", view: "top", polished: true,
      title: { en: "Tell teams apart *at a glance*", ko: "우리 편을 *한눈에*" },
      intro: { en: "Who's who? *No idea.*", ko: "누가 누구 편이죠? *모르겠어요*." },
      interval: 0.5, stepDur: 3.4,
      drawFloor: grass,
      setup(w) {
        ensure(); w.U = [];
        for (let i = 0; i < 18; i++) {
          const a = i * 2.4, d = 30 + (i % 6) * 18, x = 270 + Math.cos(a) * d * 1.5, y = 185 + Math.sin(a) * d;
          const t = x + rand(-50, 50) < 270 ? "b" : "r";
          U(w, t, x, y, { top: true, h: 30, face: t === "b" ? 0 : Math.PI });
        }
      },
      fire(w) {
        for (let i = 0; i < 4; i++) {
          const a = pick(w.U), t = nearest(w, a, o => o.team !== a.team);
          if (!t) continue;
          const ang = Math.atan2(t.y - a.y, t.x - a.x);
          a.face = ang; a.ox += Math.cos(ang) * 10; a.oy += Math.sin(ang) * 10;
          w.after(0.08, () => {
            t.hp -= 3; if (t.hp <= 0) t.hp = t.maxHp;
            w.emit("hit", t, ang);
          });
        }
      },
      update(w, dt) { uStep(w, dt); w.skin = "g"; w.rim = false; w.disc = false; w.bars = false; },
      drawBack(w, ctx) {
        drawUnits(w, ctx, { disc: w.disc, pre: u => { u.skin = w.skin === "team" ? null : "g"; }, rim: u => w.rim ? RIM[u.team] : null });
      },
      drawHud(w, ctx) {
        if (!w.bars) return;
        for (const u of w.U) if (u.hp < u.maxHp) {
          const x = u.x + u.ox - 13, y = u.y + u.oy - 24;
          ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(x - 1, y - 1, 28, 6);
          ctx.fillStyle = `rgb(${RGB[u.team]})`; ctx.fillRect(x, y, 26 * u.hp / u.maxHp, 4);
        }
      },
      steps: [
        {
          id: "tint", name: { en: "Team Colors", ko: "팀 색" }, param: "blue vs red",
          cap: { en: "Paint the *armor*, not the whole body.", ko: "몸 전체 말고 *갑옷*만 칠해요." },
          update(w) { w.skin = "team"; },
        },
        {
          id: "rim", name: { en: "Light Rim", ko: "밝은 테두리" }, param: "1.8px rim",
          cap: { en: "A *bright rim* pulls units off a busy floor.", ko: "*밝은 테두리*가 바닥에서 떼어내요." },
          update(w) { w.rim = true; },
        },
        {
          id: "disc", name: { en: "Ground Disc", ko: "발밑 원판" }, param: "team disc 55%",
          cap: { en: "A *colored disc* under the feet reads even in a pile.", ko: "발밑 *색 원판*은 뭉쳐도 읽혀요." },
          update(w) { w.disc = true; },
        },
        {
          id: "bars", name: { en: "Hurt-only Bars", ko: "다친 유닛만 체력바" }, param: "show if hp < max",
          cap: { en: "Show HP bars *only on hurt units*. Less noise.", ko: "체력바는 *다친 유닛만*. 덜 시끄러워요." },
          update(w) { w.bars = true; },
        },
        {
          id: "hit", name: { en: "Hit Flash", ko: "맞으면 번쩍" }, param: "flash + 4 sparks",
          cap: { en: "Flash whoever gets hit. *Where's the fight?* There.", ko: "맞은 유닛이 번쩍. *싸움이 어디인지* 보여요." },
          hit(w, t, ang) {
            t.flash = 1; t.ox += Math.cos(ang) * 6; t.oy += Math.sin(ang) * 6;
            sparks(w, t.x, t.y, 4, "255,230,170", [80, 240], ang - 0.7, ang + 0.7);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick ±15%",
          cap: { en: "Tiny *ticks*. A crowd gets loud fast.", ko: "아주 작은 *틱*. 많으면 금방 시끄러워요." },
          hit(w) { w.sfx.smg(rand(0.85, 1.15)); },
        },
      ],
    },

    // 3 ─ 드래그 선택
    {
      id: "army-select", cat: "army", view: "top", polished: true,
      title: { en: "Make box-select *feel good*", ko: "드래그 선택을 *기분 좋게*" },
      intro: { en: "Did it select? *Hard to tell.*", ko: "선택된 거야? *잘 모르겠어요*." },
      interval: 1.25, stepDur: 3.6,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = []; w.panel = []; w.k = 0;
        const P = [[110, 110], [160, 150], [125, 205], [200, 95], [215, 190], [180, 250], [260, 140], [290, 220], [340, 110], [360, 190], [400, 260], [430, 150]];
        for (const [x, y] of P) U(w, "b", x, y, { top: true, h: 30, face: -Math.PI / 2 + rand(-0.4, 0.4) });
        w.drag = { x0: 0, y0: 0, x1: 0, y1: 0, on: false, fade: 0 };
        w.cur = { x: 270, y: 200, down: false };
      },
      fire(w) {
        const B = [[96, 78, 238, 230], [236, 90, 450, 280]][w.k++ % 2], d = w.drag;
        for (const u of w.U) u.sel = false;
        w.panel = [];
        Object.assign(d, { x0: B[0], y0: B[1], x1: B[0], y1: B[1], on: true });
        Object.assign(w.cur, { x: B[0], y: B[1], down: true });
        w.tween(d, { x1: B[2], y1: B[3] }, 0.28, "inout", () => {
          d.on = false; d.fade = 1; w.cur.down = false;
          const S = w.U.filter(u => u.x > B[0] && u.x < B[2] && u.y > B[1] && u.y < B[3]);
          S.sort((a, b) => Math.hypot(a.x - B[0], a.y - B[1]) - Math.hypot(b.x - B[0], b.y - B[1]));
          S.forEach((u, i) => { u.sel = true; w.emit("select", u, i, S.length); });
        });
      },
      update(w, dt) {
        uStep(w, dt);
        const d = w.drag; d.fade = Math.max(0, d.fade - dt * 4);
        if (d.on) { w.cur.x = d.x1; w.cur.y = d.y1; }
        if (w.badge) w.badge.t -= dt;
        for (const p of w.panel) p.t += dt;
        for (const u of w.U) if (u.ringT != null) u.ringT += dt;
      },
      drawBack(w, ctx) {
        for (const u of w.U) if (u.sel) {
          if (u.ringT != null) {
            const s = E.back(Math.min(1, u.ringT / 0.22));
            ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(198,244,50,0.18)";
            ctx.beginPath(); ctx.ellipse(u.x, u.y + 3, 22 * s, 18 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
          } else {
            ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(u.x, u.y, 17, 0, TAU); ctx.stroke();
          }
        }
        drawUnits(w, ctx);
      },
      drawFront(w, ctx) {
        const d = w.drag, a = d.on ? 1 : (w.fancy ? d.fade : 0);
        if (a > 0) {
          const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), bw = Math.abs(d.x1 - d.x0), bh = Math.abs(d.y1 - d.y0);
          if (w.fancy) {
            ctx.globalAlpha = a;
            ctx.fillStyle = "rgba(198,244,50,0.12)"; ctx.fillRect(x, y, bw, bh);
            ctx.setLineDash([7, 5]); ctx.lineDashOffset = -w.time * 40; ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh);
            ctx.setLineDash([]); ctx.lineWidth = 4;
            for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + bw, y, -1, 1], [x, y + bh, 1, -1], [x + bw, y + bh, -1, -1]]) {
              ctx.beginPath(); ctx.moveTo(cx, cy + sy * 12); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 12, cy); ctx.stroke();
            }
            ctx.globalAlpha = 1;
          } else { ctx.strokeStyle = "rgba(200,200,200,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, bw, bh); }
        }
        cursor(ctx, w.cur.x, w.cur.y, w.cur.down);
        if (w.badge && w.badge.t > 0) {
          const s = 1 + 0.4 * Math.max(0, w.badge.t - 1.0) * 5;
          ctx.save(); ctx.translate(w.cur.x + 34, w.cur.y + 8); ctx.scale(s, s); pill(ctx, "×" + w.badge.n, 0, 0, 16, "#c6f432"); ctx.restore();
        }
      },
      drawHud(w, ctx) {
        if (!w.panel.length) return;
        const n = w.panel.length, x0 = 270 - n * 17;
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(x0 - 8, 296, n * 34 + 16, 38, 8); ctx.fill();
        w.panel.forEach((p, i) => {
          const s = E.back(Math.min(1, p.t / 0.2));
          ctx.save(); ctx.translate(x0 + i * 34 + 17, 315); ctx.scale(s, s);
          ctx.fillStyle = "rgba(96,165,250,0.35)"; ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(-14, -14, 28, 28, 5); ctx.fill(); ctx.stroke();
          ctx.drawImage(SPR["army-b-i"].c, -9, -14, 18, 26); ctx.restore();
        });
      },
      steps: [
        {
          id: "box", name: { en: "Living Box", ko: "살아있는 상자" }, param: "fill 12% · dash",
          cap: { en: "Tinted fill, *marching dashes*, corner brackets.", ko: "옅은 채움, *흐르는 점선*, 모서리 꺾쇠." },
          update(w) { w.fancy = true; },
        },
        {
          id: "ring", name: { en: "Pop-in Rings", ko: "톡 튀는 고리" }, param: "back-ease 220ms",
          cap: { en: "Selection rings *overshoot* as they appear.", ko: "선택 고리가 *톡* 커졌다 자리 잡아요." },
          select(w, u) { u.ringT = 0; },
        },
        {
          id: "hop", name: { en: "Ripple Hop", ko: "차례로 폴짝" }, param: "35ms apart",
          cap: { en: "Units *hop in order*, nearest first.", ko: "가까운 순서로 *폴짝* 대답해요." },
          select(w, u, i) { w.after(i * 0.035, () => { u.sx = 0.7; u.sy = 1.4; u.flash = 1; }); },
        },
        {
          id: "count", name: { en: "Count Badge", ko: "숫자 배지" }, param: "×N by cursor",
          cap: { en: "Show *how many* right at the cursor.", ko: "*몇 명*인지 커서 옆에 바로." },
          select(w, u, i, n) { w.badge = { n, t: 1.2 }; },
        },
        {
          id: "panel", name: { en: "Unit Panel", ko: "선택 패널" }, param: "icons pop 35ms",
          cap: { en: "Icons *pop into the panel* one by one.", ko: "아래 패널에 아이콘이 *하나씩* 톡톡." },
          select(w, u, i) { w.after(i * 0.035, () => w.panel.push({ t: 0 })); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "blip +1 semitone",
          cap: { en: "A blip per unit, *climbing in pitch*.", ko: "유닛마다 삑, 음이 *한 칸씩* 올라가요." },
          select(w, u, i) { w.after(i * 0.035, () => w.sfx.blip(i + 1)); },
        },
      ],
    },

    // 4 ─ 이동 명령 표시
    {
      id: "army-move", cat: "army", view: "top", polished: true,
      title: { en: "Confirm move orders *clearly*", ko: "이동 명령을 *확실하게*" },
      intro: { en: "Clicked. Did they *hear* me?", ko: "클릭했는데… *들은 거야?*" },
      interval: 1.6, stepDur: 3.8,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = []; w.k = 0;
        w.OFF = [[-40, -36], [-40, 0], [-40, 36], [40, -36], [40, 0], [40, 36]];
        for (const [dx, dy] of w.OFF) U(w, "b", 140 + dx, 190 + dy, { top: true, h: 28 });
      },
      fire(w) {
        const p = [{ x: 390, y: 120 }, { x: 150, y: 250 }, { x: 390, y: 250 }, { x: 150, y: 120 }][w.k++ % 4];
        w.spawn({ type: "circle", x: p.x, y: p.y, size: 3, life: 0.3, color: "255,255,255", add: false });
        w.emit("order", p);
        w.U.forEach((u, i) => {
          const s = { x: p.x + w.OFF[i][0], y: p.y + w.OFF[i][1] };
          u.face = Math.atan2(s.y - u.y, s.x - u.x);
          w.emit("go", u, s, i);
          w.tween(u, { x: s.x, y: s.y }, 0.9, "inout");
        });
      },
      update(w, dt) { uStep(w, dt); },
      drawBack(w, ctx) { drawFX(w, ctx, true); drawUnits(w, ctx); },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      steps: [
        {
          id: "ring", name: { en: "Shrinking Ring", ko: "줄어드는 고리" }, param: "56→16px · pulse",
          cap: { en: "A ring that *shrinks onto* the spot you clicked.", ko: "클릭한 자리로 *쏙* 줄어드는 고리." },
          order(w, p) { marker(w, p); },
        },
        {
          id: "chev", name: { en: "Chevrons", ko: "꺾쇠 화살표" }, param: "4 arrows in",
          cap: { en: "Four arrows *point in*. No doubt where.", ko: "화살표 넷이 *안으로*. 헷갈릴 일 없어요." },
          order(w, p) { chevrons(w, p); },
        },
        {
          id: "lines", name: { en: "Path Lines", ko: "이동 경로" }, param: "dashed · 1.3s",
          cap: { en: "Draw each unit's *path* for a moment.", ko: "잠깐 동안 유닛마다 *가는 길*을 그려요." },
          go(w, u, s) { trail(w, u.x, u.y, s.x, s.y, 1.3); },
        },
        {
          id: "slots", name: { en: "Slot Ghosts", ko: "도착 자리" }, param: "dashed circles",
          cap: { en: "Mark *where each one* will stand.", ko: "*한 명씩* 설 자리를 미리 보여줘요." },
          go(w, u, s) { ghost(w, s.x, s.y, 1.6); },
        },
        {
          id: "ack", name: { en: "Acknowledge", ko: "알겠습니다!" }, param: "hop 40ms apart",
          cap: { en: "Units *hop* to say “got it”.", ko: "유닛이 *폴짝*. “알겠습니다!”" },
          go(w, u, s, i) { w.after(i * 0.04, () => { u.sx = 1.35; u.sy = 1.35; u.flash = 0.8; }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "click + tock",
          cap: { en: "*Click* on the ground, a *tock* back from the squad.", ko: "바닥에 *딸깍*, 부대가 *톡* 대답." },
          order(w) { w.sfx.clickDown(); w.after(0.08, () => w.sfx.tock()); },
        },
      ],
    },

    // 5 ─ 진형 스냅
    {
      id: "army-formation", cat: "army", view: "top", polished: true,
      title: { en: "Snap into formation *with style*", ko: "진형을 *착* 맞추기" },
      intro: { en: "They drift into place. *Like ice.*", ko: "미끄러지듯 스르륵. *얼음 위*처럼." },
      interval: 1.6, stepDur: 3.8,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = []; w.k = 0;
        for (let i = 0; i < 9; i++) U(w, "b", rand(90, 450), rand(80, 290), { top: true, h: 28 });
        w.U[0].skin = "y";
        const line = Array.from({ length: 9 }, (_, i) => ({ x: 110 + i * 40, y: 190 }));
        const box = Array.from({ length: 9 }, (_, i) => ({ x: 230 + (i % 3) * 44, y: 146 + ((i / 3) | 0) * 44 }));
        const wedge = Array.from({ length: 9 }, (_, i) => { const r = Math.ceil(i / 2), s = i % 2 ? -1 : 1; return { x: 360 - r * 40, y: 190 + s * r * 34 }; });
        line.name = "LINE"; box.name = "BOX"; wedge.name = "WEDGE";
        w.FORMS = [line, box, wedge];
      },
      fire(w) {
        const S = w.FORMS[w.k++ % 3];
        restart(w, w.U);
        w.FX = [];
        w.emit("plan", S);
        w.U.forEach((u, i) => {
          u.delay = 0; u.ease = "lin";
          w.emit("move", u, S[i], i);
          w.after(u.delay, () => w.tween(u, { x: S[i].x, y: S[i].y }, 0.35, u.ease, () => w.emit("arrive", u)));
        });
      },
      update(w, dt) { uStep(w, dt); },
      drawBack(w, ctx) { drawFX(w, ctx, true); drawUnits(w, ctx); },
      steps: [
        {
          id: "ghost", name: { en: "Preview Slots", ko: "자리 미리보기" }, param: "9 circles · hold",
          cap: { en: "Flash the *target shape* first.", ko: "먼저 *목표 모양*을 보여줘요." },
          plan(w, S) { for (const s of S) ghost(w, s.x, s.y, 3); },
        },
        {
          id: "ripple", name: { en: "Leader First", ko: "대장부터" }, param: "30ms per unit",
          cap: { en: "The *leader* moves first. The rest *follow*.", ko: "*대장*이 먼저, 나머지가 *줄줄이*." },
          move(w, u, s, i) { u.delay = i * 0.03; },
        },
        {
          id: "ease", name: { en: "Overshoot", ko: "살짝 지나치기" }, param: "back ease",
          cap: { en: "Overshoot a hair, then *settle*.", ko: "살짝 지나쳤다가 *착* 자리 잡아요." },
          move(w, u) { u.ease = "back"; },
        },
        {
          id: "snap", name: { en: "Snap Pulse", ko: "착 고리" }, param: "squash + ring",
          cap: { en: "On arrival: *squash* and a tiny *ring*.", ko: "도착하면 *꾹* 눌리고 작은 *고리*." },
          arrive(w, u) {
            u.sx = 1.3; u.sy = 0.75;
            w.spawn({ type: "ring", x: u.x, y: u.y, size: 8, size1: 24, life: 0.25, w: 3, color: "198,244,50" });
          },
        },
        {
          id: "label", name: { en: "Formation Name", ko: "진형 이름" }, param: "text pop",
          cap: { en: "Say the *name* of the formation.", ko: "진형 *이름*을 크게 띄워요." },
          plan(w, S) { callout(w, S.name, 270, 60, 3); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick per unit",
          cap: { en: "A *tick* each time someone *clicks in*.", ko: "한 명씩 자리 잡을 때마다 *틱*." },
          plan(w) { w.sfx.clickDown(); },
          arrive(w) { w.sfx.tick(); },
        },
      ],
    },
    // 6 ─ 화살비
    {
      id: "army-volley", cat: "army", view: "side", polished: true,
      title: { en: "Rain down an *arrow volley*", ko: "화살비를 *쏟아붓기*" },
      intro: { en: "Sticks float over. *Nobody flinches.*", ko: "막대기가 둥둥. *아무도 안 놀라요*." },
      interval: 1.2, stepDur: 3.8,
      setup(w) {
        ensure(); w.U = [];
        for (let i = 0; i < 6; i++) U(w, "b", 50 + (i % 3) * 34 + ((i / 3) | 0) * 14, 262 + ((i / 3) | 0) * 24, { h: 40 });
        w.foes = [];
        for (let i = 0; i < 8; i++) w.foes.push(U(w, "r", 362 + (i % 4) * 36 + ((i / 4) | 0) * 16, 258 + ((i / 4) | 0) * 28, { h: 40 }));
      },
      fire(w) {
        const zone = { x: 425, y: 272 };
        w.emit("volley", zone);
        for (let i = 0; i < 12; i++) {
          const sh = w.U[i % 6], x0 = sh.x + 10, y0 = sh.y - 34;
          const tx = zone.x + rand(-75, 75), ty = zone.y + rand(-14, 26), T = 0.8, g = 900;
          const a = { x: x0, y: y0, vx: (tx - x0) / T, vy: (ty - y0 - 0.5 * g * T * T) / T, g, hitY: ty, delay: 0, draw: arrowShot };
          a.onHit = p => w.emit("land", p, w.foes.find(u => Math.abs(u.x - p.x) < 15 && Math.abs(u.y - p.y) < 16));
          w.emit("loose", a, i);
          w.after(a.delay, () => w.shoot(a));
        }
      },
      update(w, dt) { uStep(w, dt); },
      drawBack(w, ctx) { drawFX(w, ctx, true); drawUnits(w, ctx); },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      steps: [
        {
          id: "align", name: { en: "Point Along Flight", ko: "날아가는 쪽으로" }, param: "rot = atan2(vy, vx)",
          cap: { en: "Turn each arrow to *follow its arc*.", ko: "화살 머리가 *포물선을 따라* 돌아요." },
          loose(w, a) { a.align = true; },
        },
        {
          id: "stagger", name: { en: "Ragged Release", ko: "제각각 발사" }, param: "25ms + jitter",
          cap: { en: "Archers don't fire in sync. *Spread* the release.", ko: "궁수는 동시에 안 쏴요. 조금씩 *흩어서*." },
          loose(w, a, i) { a.delay = i * 0.025 + rand(0, 0.05); },
        },
        {
          id: "zone", name: { en: "Landing Zone", ko: "떨어질 자리" }, param: "red ellipse 0.9s",
          cap: { en: "Darken the ground *where it will land*.", ko: "*떨어질 땅*을 미리 붉게 물들여요." },
          volley(w, z) { dangerZone(w, z.x, z.y + 6, 100, 30, 0.95); },
        },
        {
          id: "stick", name: { en: "Arrows Stick", ko: "꽂힌 화살" }, param: "stay 2.5s",
          cap: { en: "Arrows *stay stuck* in the ground for a while.", ko: "화살이 땅에 *꽂힌 채* 남아요." },
          land(w, p) { stuckArrow(w, p.x, p.y, Math.atan2(p.vy, p.vx)); },
        },
        {
          id: "hit", name: { en: "Hits & Puffs", ko: "맞음 + 흙먼지" }, param: "flash · dip · dust",
          cap: { en: "Units *duck and flash*. Misses kick *dust*.", ko: "맞으면 *움찔·번쩍*, 빗나가면 *흙먼지*." },
          land(w, p, u) {
            dust(w, p.x, p.y, 2, 0, "190,175,150");
            if (u) { u.flash = 1; u.oy = 5; u.sy = 0.8; u.sx = 1.15; }
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "twang · tick",
          cap: { en: "A few *twangs*, then a *patter* like rain.", ko: "*팅팅* 쏘고, 빗소리처럼 *타닥타닥*." },
          loose(w, a, i) { if (i % 4 === 0) w.after(a.delay, () => w.sfx.twang()); },
          land(w) { w.sfx.tick(); },
        },
      ],
    },

    // 7 ─ 기병 돌격
    {
      id: "army-cavalry", cat: "army", view: "side", polished: true,
      title: { en: "Make a cavalry charge *crash*", ko: "기병 돌격을 *쾅*" },
      intro: { en: "Horses pass *through* people.", ko: "말이 사람을 *통과*해요." },
      interval: 1.4, stepDur: 3.8,
      drawFloor: isoField,
      setup(w) {
        ensure(); w.U = [];
        w.riders = [0, 1, 2].map(i => U(w, "b", 70 - i * 8, 230 + i * 34, { spr: "army-cav", h: 62 }));
        w.inf = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) w.inf.push(U(w, "r", 380 + c * 44, 230 + r * 34, { h: 40, row: r }));
      },
      fire(w) {
        const g = restart(w, w.U);
        w.U.forEach(reset);
        w.emit("ready");
        w.after(w.on("windup") ? 0.1 : 0, () => g === w.gen && w.riders.forEach((r, i) => {
          r.run = true;
          w.tween(r, { x: 362 }, 0.24, "in", () => {
            const row = w.inf.filter(u => u.row === i);
            for (const u of row) u.ox += 10;
            w.emit("impact", r, row);
            w.tween(r, { x: 470 }, 0.4, "out", () => { r.run = false; });
          });
        }));
      },
      update(w, dt) { uStep(w, dt); },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      steps: [
        {
          id: "windup", name: { en: "Rear Up", ko: "앞발 들기" }, param: "100ms · tilt −14°",
          cap: { en: "*Rear up* first. Then go.", ko: "먼저 *앞발을 번쩍*. 그다음 출발." },
          ready(w) { for (const r of w.riders) { r.rot = -0.25; r.ox = -16; } },
        },
        {
          id: "dust", name: { en: "Hoof Dust", ko: "말발굽 먼지" }, param: "puff per frame",
          cap: { en: "Leave a *dust trail* behind the hooves.", ko: "말발굽 뒤로 *흙먼지*를 남겨요." },
          update(w) { for (const r of w.riders) if (r.run && Math.random() < 0.3) dust(w, r.x - 24, r.y, 1, -1, "96,88,74"); },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "streaks −700px/s",
          cap: { en: "*Speed lines* sell the momentum.", ko: "*속도선*이 기세를 보여줘요." },
          update(w) {
            for (const r of w.riders) if (r.run && r.x < 600) w.spawn({ type: "spark", x: r.x - 30, y: r.y - rand(14, 56), vx: -700, life: 0.14, size: 2, color: "255,255,255" });
          },
        },
        {
          id: "impact", name: { en: "Impact Freeze", ko: "충돌 멈칫" }, param: "stop 70ms · flash",
          cap: { en: "On contact, *freeze* and flash the *whole row*.", ko: "부딪히면 *멈칫*, 그 줄 *전체가* 번쩍." },
          impact(w, r, row) {
            w.hitstop(0.07);
            for (const u of row) u.flash = 1.4;
            w.spawn({ type: "star", x: r.x + 36, y: r.y - 30, size: 46, life: 0.16, color: "255,255,255" });
          },
        },
        {
          id: "scatter", name: { en: "Bodies Fly", ko: "튕겨 날아감" }, param: "vx 120–260 · spin",
          cap: { en: "Send the infantry *flying*, spinning.", ko: "보병이 *빙글빙글* 날아가요." },
          impact(w, r, row) { for (const u of row) launch(u, rand(120, 260), rand(-560, -380), rand(8, 14)); },
        },
        {
          id: "shake", name: { en: "Shake + Zoom", ko: "흔들림 + 확대" }, param: "trauma .25 · zoom 4%",
          cap: { en: "Push the camera *with the charge*.", ko: "돌격 *방향으로* 화면을 밀어요." },
          impact(w) { w.shake(0.25, 1); w.zoomPunch(0.04); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rush + thud",
          cap: { en: "A rising *rush*, then a heavy *thud*.", ko: "*두두두* 몰아치고, 묵직한 *쿵*." },
          ready(w) { w.sfx.dash(); },
          impact(w) { w.sfx.thud(); },
        },
      ],
    },

    // 8 ─ 투석기
    {
      id: "army-catapult", cat: "army", view: "side", polished: true,
      title: { en: "Give a siege shot *weight*", ko: "투석기에 *무게* 싣기" },
      intro: { en: "A pebble. A *polite* pebble.", ko: "조약돌 하나. *얌전한* 조약돌." },
      interval: 1.2, stepDur: 3.8,
      setup(w) {
        ensure(); w.U = [];
        w.cata = U(w, "b", 100, G + 4, { spr: "army-cata", h: 54 });
        w.REST = Math.PI + 0.2; w.arm = { a: w.REST, loaded: true };
        w.foes = [];
        for (let i = 0; i < 7; i++) w.foes.push(U(w, "r", 370 + (i % 4) * 34 + ((i / 4) | 0) * 18, 262 + ((i / 4) | 0) * 26, { h: 40 }));
      },
      fire(w) {
        const g = restart(w, [w.arm]);
        Object.assign(w.arm, { a: w.REST, loaded: true });
        w.foes.forEach(u => u.dead && reset(u));
        w.emit("wind");
        w.after(w.on("windup") ? 0.15 : 0, () => g === w.gen && w.tween(w.arm, { a: -Math.PI / 2 + 0.25 }, 0.08, "in", () => {
          const b = armTip(w), tx = 425, ty = 284, T = 0.5, g2 = 1300;
          const r = { x: b.x, y: b.y, vx: (tx - b.x) / T, vy: (ty - b.y - 0.5 * g2 * T * T) / T, g: g2, hitY: ty, tx, ty, T, draw: drawRock };
          r.onHit = () => {
            const e = { x: r.x, y: ty }, hit = w.foes.filter(u => Math.abs(u.x - e.x) < 70);
            w.spawn({ type: "circle", x: e.x, y: e.y - 8, size: 10, size1: 20, life: 0.15, color: "190,175,150", add: false });
            w.emit("impact", e, hit);
                      };
          w.arm.loaded = false;
          w.emit("throw", r);
          w.shoot(r);
          w.after(0.25, () => g === w.gen && w.tween(w.arm, { a: w.REST }, 0.3, "inout", () => { w.arm.loaded = true; }));
        }));
      },
      update(w, dt) {
        uStep(w, dt);
        for (const s of w.shots) if (s.smoke && Math.random() < 0.7) w.spawn({ type: "smoke", x: s.x, y: s.y, vx: rand(-20, 20), vy: rand(-20, 0), size: 4, size1: 12, life: 0.5, color: "150,140,120" });
      },
      drawBack(w, ctx) { drawFX(w, ctx, true); drawUnits(w, ctx); },
      drawFront(w, ctx) {
        const p = armPivot(w), t = armTip(w);
        ctx.strokeStyle = "#8b5a2b"; ctx.lineWidth = 7; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        ctx.fillStyle = "#5b3a1a"; ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, TAU); ctx.fill();
        if (w.arm.loaded) drawRock(ctx, { x: t.x, y: t.y - 4, rot: 0 });
        drawFX(w, ctx, false);
      },
      steps: [
        {
          id: "windup", name: { en: "Creak Back", ko: "끼익 당기기" }, param: "+20° · 150ms",
          cap: { en: "Pull the arm *further back* before it snaps.", ko: "튕기기 전에 팔을 *더 뒤로*." },
          wind(w) { w.tween(w.arm, { a: w.REST + 0.35 }, 0.14, "out"); w.cata.sx = 1.08; w.cata.sy = 0.92; },
        },
        {
          id: "spin", name: { en: "Spin + Dust Trail", ko: "회전 + 먼지 꼬리" }, param: "vr 10 · smoke",
          cap: { en: "The rock *tumbles* and sheds *dust*.", ko: "돌이 *빙글빙글*, 뒤로 *흙가루*." },
          throw(w, r) { r.vr = 10; r.smoke = true; },
        },
        {
          id: "shadow", name: { en: "Growing Shadow", ko: "커지는 그림자" }, param: "6 → 46px",
          cap: { en: "A shadow *grows* where it's going to land.", ko: "떨어질 자리에 그림자가 *점점 커져요*." },
          throw(w, r) { growShadow(w, r.tx, r.ty, r.T); },
        },
        {
          id: "crater", name: { en: "Crater", ko: "패인 자국" }, param: "chunks + scorch",
          cap: { en: "Throw *dirt chunks*, leave a *dent*.", ko: "*흙덩이*가 튀고, *패인 자국*이 남아요." },
          impact(w, e) {
            w.spawn({ type: "ellipse", under: true, x: e.x, y: e.y + 4, size: 52, life: 3, color: "20,14,10", alpha: 0.6, hold: true, add: false });
            w.spawn({ type: "ring", flat: true, x: e.x, y: e.y, size: 10, size1: 110, life: 0.4, w: 8, color: "230,210,170" });
            for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: e.x, y: e.y - 6, vx: rand(-320, 320), vy: rand(-620, -240), g: 1600, ground: true, gy: e.y + rand(-6, 10), bounce: 0.3, vr: rand(-18, 18), life: rand(1.4, 2.2), size: rand(4, 9), color: pick(["120,82,50", "92,64,40", "150,140,120"]), hold: true });
          },
        },
        {
          id: "fling", name: { en: "Fling Outward", ko: "바깥으로 튕김" }, param: "away from center",
          cap: { en: "Everyone nearby gets *thrown away* from the center.", ko: "가까운 유닛은 *중심 반대쪽*으로 날아가요." },
          impact(w, e, hit) {
            for (const u of hit) { const d = u.x - e.x; launch(u, d * 6 + Math.sign(d) * 80, rand(-720, -450), Math.sign(d) * rand(6, 12)); u.flash = 1; }
          },
        },
        {
          id: "shake", name: { en: "Heavy Shake", ko: "묵직한 흔들림" }, param: "trauma .6 · stop 60ms",
          cap: { en: "A big *shake* and a short *freeze*.", ko: "크게 *흔들고*, 짧게 *멈칫*." },
          impact(w) { w.shake(0.6); w.hitstop(0.06); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "creak · whoosh · boom",
          cap: { en: "*Creak*, *whoosh*, *boom*. Three beats.", ko: "*끼익*, *휘익*, *쿵*. 세 박자." },
          wind(w) { w.sfx.creak(); },
          throw(w) { w.sfx.toss(); },
          impact(w) { w.sfx.boom(); },
        },
      ],
    },

    // 9 ─ 성벽 돌파
    {
      id: "army-breach", cat: "army", view: "side", polished: true,
      title: { en: "Make a wall breach *count*", ko: "성벽 뚫리는 순간 *크게*" },
      intro: { en: "Bonk. Bonk. *Gone.*", ko: "툭. 툭. *사라짐.*" },
      interval: 1.2, stepDur: 4.0,
      setup(w) {
        ensure(); w.U = []; w.cracks = [];
        w.wall = { ox: 0, flash: 0, hp: 2 };
        w.bricks = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) w.bricks.push({ x: 372 + c * 22 - (r % 2) * 6, y: G - (r + 1) * 20, r, alive: true });
        w.ram = { x: 0 };
        w.crew = [U(w, "b", 250, G, { h: 40 }), U(w, "b", 300, G, { h: 40 })];
        w.def = [0, 1, 2].map(i => U(w, "r", 450 + i * 30, G, { h: 40 }));
      },
      fire(w) {
        restart(w, [w.ram]);
        w.ram.x = 0; w.cracks = [];
        w.bricks.forEach(b => (b.alive = true));
        w.def.forEach(u => u.dead && reset(u));
        const ram = done => w.tween(w.ram, { x: -30 }, 0.14, "out", () => w.tween(w.ram, { x: 18 }, 0.1, "in", () => {
          w.emit("hit", { x: 368, y: G - 30 });
          done();
        }));
        ram(() => ram(() => {
          for (const b of w.bricks) b.alive = false;
          w.cracks = [];
          w.emit("breach", { x: 390, y: G - 60 });
          w.tween(w.ram, { x: 0 }, 0.3, "inout");
        }));
      },
      update(w, dt) {
        uStep(w, dt);
        w.crew.forEach(u => { u.x = u.hx + w.ram.x; });
        w.wall.ox -= w.wall.ox * Math.min(1, dt * 14); w.wall.flash = Math.max(0, w.wall.flash - dt * 6);
      },
      drawBack(w, ctx) {
        const L = w.ram.x;
        ctx.fillStyle = "#7c4a1e"; ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(230 + L, G - 34, 140, 14, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.roundRect(360 + L, G - 37, 12, 20, 3); ctx.fill();
        drawUnits(w, ctx);
        const ox = w.wall.ox * (Math.random() < 0.5 ? 1 : -1);
        for (const b of w.bricks) if (b.alive) {
          // 픽셀 돌벽돌: 어두운 줄눈 + 밝은 윗면 + 그늘진 아래 + 돌 얼룩
          const bx = Math.round(b.x + ox), v = (b.r * 7 + b.x) % 3;
          ctx.fillStyle = "#3a3f4a"; ctx.fillRect(bx, b.y, 21, 19);
          ctx.fillStyle = ["#7d838f", "#868c98", "#737985"][v]; ctx.fillRect(bx + 1, b.y + 1, 19, 17);
          ctx.fillStyle = "#a9afba"; ctx.fillRect(bx + 1, b.y + 1, 19, 2); ctx.fillRect(bx + 1, b.y + 1, 2, 15);
          ctx.fillStyle = "#5c616c"; ctx.fillRect(bx + 1, b.y + 15, 19, 3); ctx.fillRect(bx + 18, b.y + 3, 2, 13);
          ctx.fillStyle = "#666b77"; ctx.fillRect(bx + 6 + v * 3, b.y + 7, 3, 2); ctx.fillRect(bx + 12 - v * 2, b.y + 11, 2, 2);
          if (w.wall.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${w.wall.flash * 0.8})`; ctx.fillRect(b.x + ox, b.y, 21, 19); }
        }
        ctx.strokeStyle = "rgba(15,15,20,0.9)"; ctx.lineWidth = 2;
        for (const c of w.cracks) { ctx.beginPath(); c.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x + ox, y)); ctx.stroke(); }
      },
      steps: [
        {
          id: "crack", name: { en: "Cracks Grow", ko: "금이 간다" }, param: "2 cracks / hit",
          cap: { en: "The first hit *cracks* it. Now you know it's coming.", ko: "첫 방에 *금*이 가요. 곧 뚫릴 걸 알죠." },
          hit(w, p) { w.cracks.push(crackLine(p.x + 4, p.y, 5)); w.cracks.push(crackLine(p.x + 4, p.y, 4)); },
        },
        {
          id: "wobble", name: { en: "Wall Shudder", ko: "벽 흔들림" }, param: "8px · flash",
          cap: { en: "The wall *shudders* and flashes.", ko: "벽이 *부르르* 떨고 번쩍." },
          hit(w) { w.wall.ox = 8; w.wall.flash = 1; },
        },
        {
          id: "chips", name: { en: "Stone Chips", ko: "돌 부스러기" }, param: "6 chips",
          cap: { en: "Knock off a few *stone chips*.", ko: "*돌 부스러기*가 조금씩 떨어져요." },
          hit(w, p) {
            for (let i = 0; i < 6; i++) w.spawn({ type: "chunk", x: p.x, y: p.y, vx: rand(-260, -60), vy: rand(-320, -80), g: 1500, ground: true, bounce: 0.3, vr: rand(-15, 15), life: 1.4, size: rand(3, 6), color: "150,155,165", hold: true });
          },
        },
        {
          id: "collapse", name: { en: "Bricks Fly", ko: "벽돌이 날아감" }, param: "24 bricks",
          cap: { en: "Don't delete it. *Throw the bricks*.", ko: "그냥 지우지 말고 *벽돌을 날려요*." },
          breach(w) {
            for (const b of w.bricks) w.spawn({ type: "chunk", x: b.x + 10, y: b.y + 10, vx: rand(80, 520), vy: rand(-560, -120), g: 1500, ground: true, bounce: 0.25, vr: rand(-10, 10), life: rand(1.6, 2.2), size: rand(8, 11), color: "139,145,156", hold: true });
            for (const u of w.def) launch(u, rand(200, 380), rand(-560, -320), rand(6, 10));
          },
        },
        {
          id: "dust", name: { en: "Dust Burst", ko: "흙먼지 폭발" }, param: "10 puffs · 1.2s",
          cap: { en: "A thick *dust cloud* hides the hole for a beat.", ko: "두꺼운 *먼지*가 잠깐 구멍을 가려요." },
          breach(w, p) {
            for (let i = 0; i < 10; i++) w.spawn({ type: "smoke", x: p.x + rand(-20, 50), y: p.y + rand(-30, 50), vx: rand(-40, 180), vy: rand(-50, 10), drag: 1.5, size: rand(12, 18), size1: rand(30, 44), life: rand(0.8, 1.2), color: "86,80,70" });
          },
        },
        {
          id: "shake", name: { en: "Two-tier Shake", ko: "두 단계 흔들림" }, param: "hit .15 · breach .7",
          cap: { en: "Small shakes for hits, *one big one* for the breach.", ko: "칠 땐 *작게*, 뚫릴 땐 *한 번 크게*." },
          hit(w) { w.shake(0.15, 1); },
          breach(w) { w.shake(0.7, 1); w.hitstop(0.1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk · slam",
          cap: { en: "*Thunk*, *thunk*… then a deep *crash*.", ko: "*쿵*, *쿵*… 그리고 무너지는 *와르르*." },
          hit(w) { w.sfx.thunk(); },
          breach(w) { w.sfx.slam(); },
        },
      ],
    },

    // 10 ─ 쓰러진 유닛 정리
    {
      id: "army-death", cat: "army", view: "top", polished: true,
      title: { en: "Clear the dead *without clutter*", ko: "쓰러진 유닛, *깔끔하게* 치우기" },
      intro: { en: "Dead or alive? *Can't tell.*", ko: "죽은 거야, 산 거야? *모르겠어요*." },
      interval: 0.7, stepDur: 3.6,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = [];
        w.blue = [0, 1, 2, 3, 4].map(i => U(w, "b", 60, 70 + i * 55, { top: true, h: 28 }));
        w.red = [];
        for (let i = 0; i < 10; i++) w.red.push(U(w, "r", 260 + (i % 5) * 50 + rand(-10, 10), 60 + (i % 5) * 56 + ((i / 5) | 0) * 26, { top: true, h: 28 }));
      },
      fire(w) {
        const T = w.red.filter(u => u.x < 520).sort((a, b) => a.x - b.x).slice(0, 3);
        for (const u of T) {
          const s = nearest(w, u, o => o.team === "b");
          fx(w, 0.16, ctx => { ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(u.x, u.y); ctx.stroke(); });
          const c = U(w, "r", u.x, u.y, { top: true, h: 28, face: u.face, dead: true, born: w.time });
          w.emit("die", c);
          u.x = rand(530, 570);
        }
      },
      update(w, dt) {
        uStep(w, dt);
        for (const u of w.red) u.x -= dt * 40;
        for (const u of w.red) if (u.x < 150) u.x = rand(530, 570);
        w.U = w.U.filter(u => !u.dead || (w.time - u.born < 6 && u.alpha > 0.01));
      },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      steps: [
        {
          id: "topple", name: { en: "Topple", ko: "털썩" }, param: "flash · tilt · flatten",
          cap: { en: "Flash, *tip over*, flatten. Clearly *down*.", ko: "번쩍, *옆으로* 털썩. 확실히 *쓰러졌어요*." },
          die(w, c) { c.flash = 1.2; c.rot = pick([-1, 1]) * rand(1, 1.6); c.sx = 1.25; c.sy = 0.7; },
        },
        {
          id: "grey", name: { en: "Drain Color", ko: "색 빼기" }, param: "team → grey",
          cap: { en: "Dead units *lose team color*. Never mistaken.", ko: "죽으면 *팀 색*을 빼요. 헷갈릴 일 없어요." },
          die(w, c) { c.skin = "g"; },
        },
        {
          id: "fade", name: { en: "Sink & Fade", ko: "스르륵 사라짐" }, param: "hold .4s · fade .8s",
          cap: { en: "Hold a moment, then *fade out*. The field stays clean.", ko: "잠깐 남았다가 *스르륵*. 전장이 깔끔해요." },
          die(w, c) { w.after(0.4, () => w.tween(c, { alpha: 0 }, 0.8, "in")); },
        },
        {
          id: "decal", name: { en: "Faint Mark", ko: "옅은 자국" }, param: "decal 2.4s",
          cap: { en: "Leave a *faint mark* that fades too.", ko: "*옅은 자국*만 남고, 그것도 사라져요." },
          die(w, c) { w.spawn({ type: "ellipse", under: true, round: true, x: c.x, y: c.y, size: 16, life: 2.4, color: "140,20,30", alpha: 0.5, add: false }); },
        },
        {
          id: "wisp", name: { en: "Soul Wisp", ko: "작은 넋" }, param: "glow rises",
          cap: { en: "A tiny *wisp* floats up. Easy to spot, gone fast.", ko: "작은 *빛*이 떠올라요. 잘 보이고 금방 사라져요." },
          die(w, c) { w.spawn({ type: "glow", x: c.x, y: c.y, vy: -70, size: 14, size1: 4, life: 0.8, color: "226,232,240" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft thunk",
          cap: { en: "*Soft* thunks. Many deaths shouldn't be loud.", ko: "*작은* 퍽. 많이 죽어도 시끄러우면 안 돼요." },
          die(w) { w.sfx.thud(); },
        },
      ],
    },

    // 11 ─ 사기 붕괴, 패주
    {
      id: "army-rout", cat: "army", view: "iso", polished: true,
      title: { en: "Show the moment *morale breaks*", ko: "사기가 *꺾이는* 순간" },
      intro: { en: "They… back away. *Calmly.*", ko: "뒤로… 스르륵. *침착하게*." },
      interval: 2.2, stepDur: 4.0,
      drawFloor: isoField,
      setup(w) {
        ensure(); w.U = [];
        w.blue = [];
        for (let i = 0; i < 8; i++) w.blue.push(U(w, "b", 90 + (i % 2) * 40, 150 + ((i / 2) | 0) * 42, { h: 40 }));
        w.red = [];
        for (let i = 0; i < 12; i++) w.red.push(U(w, "r", 270 + (i % 3) * 40, 150 + ((i / 3) | 0) * 42, { h: 40 }));
        w.bar = { v: 1, shake: 0, flash: 0 };
      },
      fire(w) {
        const g = restart(w, w.U.concat([w.bar]));
        for (const u of w.red) Object.assign(reset(u), { flip: true, dx: 130, dy: 0 });
        w.bar.v = 1;
        w.tween(w.bar, { v: 0 }, 0.25, "in", () => {
          w.emit("break");
          w.red.forEach((u, i) => {
            u.flee = true;
            w.emit("flee", u, i);
            w.tween(u, { x: u.x + u.dx, y: u.y + u.dy }, 1.6, "out");
          });
        });
      },
      update(w, dt) {
        uStep(w, dt);
        const b = w.bar; b.shake = Math.max(0, b.shake - dt); b.flash = Math.max(0, b.flash - dt * 3);
      },
      drawBack(w, ctx) { drawFX(w, ctx, true); drawUnits(w, ctx); },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      drawHud(w, ctx) {
        const b = w.bar, x = 190 + (b.shake > 0 ? rand(-4, 4) : 0), y = 58;
        label(ctx, "MORALE", 270, y - 16, 12, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - 3, y - 3, 166, 16);
        ctx.fillStyle = "#ef4444"; ctx.fillRect(x, y, 160 * b.v, 10);
        if (b.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${b.flash})`; ctx.fillRect(x - 3, y - 3, 166, 16); }
      },
      steps: [
        {
          id: "turn", name: { en: "Turn & Run", ko: "등 돌리기" }, param: "flip · 40ms apart",
          cap: { en: "Routing troops *turn their backs*. One by one.", ko: "도망치는 병사는 *등을 돌려요*. 하나씩." },
          flee(w, u, i) { w.after(i * 0.04, () => { u.flip = false; u.sx = 0.6; }); },
        },
        {
          id: "scatter", name: { en: "Scatter", ko: "흩어지기" }, param: "dx 90–200 · dy ±30",
          cap: { en: "No formation. Everyone runs *their own way*.", ko: "대열은 끝. *제각각* 흩어져요." },
          flee(w, u) { u.dx = rand(90, 200); u.dy = rand(-30, 30); },
        },
        {
          id: "panic", name: { en: "Panic Bob", ko: "허둥지둥" }, param: "fast bob 6px",
          cap: { en: "A fast, *frantic bob*. Running scared looks different.", ko: "빠르게 *허둥지둥*. 겁먹은 뜀은 달라요." },
          update(w) { for (const u of w.red) if (u.flee) u.oy = -Math.abs(Math.sin(w.time * 20 + u.hx)) * 7; },
        },
        {
          id: "icon", name: { en: "Panic Marks", ko: "느낌표" }, param: "“!” 1.8s",
          cap: { en: "Pop a *“!”* over every head.", ko: "머리 위에 *“!”*가 톡." },
          flee(w, u, i) {
            fx(w, 1.8, (ctx, k) => {
              const s = E.back(Math.min(1, k * 8));
              ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
              ctx.translate(u.x + u.ox, u.y + u.oy - u.h - 12); ctx.scale(s, s);
              label(ctx, "!", 0, 0, 22, "#fde047", "center", "Pretendard, sans-serif", 900);
            });
          },
        },
        {
          id: "bar", name: { en: "Bar Snaps", ko: "게이지 깨짐" }, param: "flash · shake · text",
          cap: { en: "The morale bar *snaps*: flash, shake, a word.", ko: "사기 게이지가 *깨져요*. 번쩍, 덜덜, 한마디." },
          break(w) {
            w.bar.flash = 1; w.bar.shake = 0.5;
            w.spawn({ type: "text", text: "ROUT!", x: 270, y: 94, vy: -10, life: 1.8, size: 30, color: "#f87171", hold: true });
          },
        },
        {
          id: "drop", name: { en: "Dropped Shields", ko: "버린 방패" }, param: "1 shield each",
          cap: { en: "They *drop their shields*. The ground tells the story.", ko: "*방패를 버리고* 가요. 땅에 흔적이 남아요." },
          flee(w, u) { w.spawn({ type: "chunk", x: u.x, y: u.y - 20, vx: rand(-80, 40), vy: rand(-260, -120), g: 1300, ground: true, gy: u.y, bounce: 0.3, vr: rand(-12, 12), life: 2.2, size: 7, color: "220,80,70", hold: true }); },
        },
        {
          id: "cheer", name: { en: "Winners Cheer", ko: "이긴 쪽 환호" }, param: "hop 50ms apart",
          cap: { en: "The other side *hops*. Show who won.", ko: "반대편은 *폴짝폴짝*. 누가 이겼는지 보여요." },
          break(w) { w.blue.forEach((u, i) => w.after(i * 0.05, () => { u.oy = -16; u.sy = 1.2; u.sx = 0.85; })); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack + scatter",
          cap: { en: "A *crack* when it breaks, then *scrambling* feet.", ko: "깨질 때 *쩍*, 이어서 *후다닥*." },
          break(w) { w.sfx.rattle(); if (w.on("icon") || w.on("panic")) w.sfx.slam(); },
        },
      ],
    },

    // 12 ─ 깃발 점령
    {
      id: "army-flag", cat: "army", view: "iso", polished: true,
      title: { en: "Make a flag capture *feel earned*", ko: "깃발 점령을 *뿌듯하게*" },
      intro: { en: "Red… now blue. *That's it?*", ko: "빨강이… 파랑. *끝이야?*" },
      interval: 2.0, stepDur: 4.0,
      drawFloor: isoField,
      setup(w) {
        ensure(); w.U = [];
        w.runner = U(w, "b", 110, 250, { h: 42 });
        w.squad = [U(w, "b", 80, 200, { h: 40 }), U(w, "b", 70, 290, { h: 40 })];
        w.flag = { team: "r", h: 1, wave: false };
        w.zone = null;
      },
      fire(w) {
        const g = restart(w, [w.runner, w.flag]);
        reset(w.runner);
        Object.assign(w.flag, { team: "r", h: 1 });
        w.zone = null;
        w.tween(w.runner, { x: 238 }, 0.35, "inout", () => {
          w.flag.team = "b";
          w.emit("capture", { x: 270, y: 236 });
        });
      },
      update(w, dt) { uStep(w, dt); w.flag.wave = false; if (w.zone) w.zone.t += dt; },
      drawBack(w, ctx) {
        if (w.zone) {
          const s = E.back(Math.min(1, w.zone.t / 0.35)), a = 0.25 + 0.1 * Math.sin(w.time * 6);
          ctx.fillStyle = `rgba(96,165,250,${a})`; ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(270, 250, 90 * s, 28 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
        } else {
          ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(270, 250, 90, 28, 0, 0, TAU); ctx.stroke();
        }
        drawUnits(w, ctx);
        const f = w.flag, top = 110, y = top + (1 - f.h) * 110;
        ctx.fillStyle = "#cbd5e1"; ctx.fillRect(268, top - 6, 4, 146);
        ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.arc(270, top - 8, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = f.team === "b" ? "#3b82f6" : "#ef4444";
        ctx.beginPath(); ctx.moveTo(272, y);
        for (let i = 0; i <= 8; i++) { const x = 272 + i * 7, wv = f.wave ? Math.sin(w.time * 9 - i * 0.8) * i * 0.8 : 0; ctx.lineTo(x, y + wv); }
        for (let i = 8; i >= 0; i--) { const x = 272 + i * 7, wv = f.wave ? Math.sin(w.time * 9 - i * 0.8) * i * 0.8 : 0; ctx.lineTo(x, y + 36 + wv); }
        ctx.closePath(); ctx.fill();
      },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      steps: [
        {
          id: "raise", name: { en: "Raise It", ko: "올리기" }, param: "bottom → top 0.5s",
          cap: { en: "Don't swap colors. *Raise* the new flag.", ko: "색만 바꾸지 말고, 새 깃발을 *올려요*." },
          capture(w) { w.flag.h = 0; w.tween(w.flag, { h: 1 }, 0.5, "back"); },
        },
        {
          id: "wave", name: { en: "Cloth Wave", ko: "펄럭임" }, param: "sine 9Hz",
          cap: { en: "A flag that *flutters* feels alive.", ko: "*펄럭*여야 살아 있어요." },
          update(w) { w.flag.wave = true; },
        },
        {
          id: "zone", name: { en: "Zone Turns Blue", ko: "땅이 파랗게" }, param: "fill + pulse",
          cap: { en: "Color the *ground* too. The area is yours now.", ko: "*땅*도 물들여요. 이제 우리 땅." },
          capture(w) { w.zone = { t: 0 }; },
        },
        {
          id: "burst", name: { en: "Color Burst", ko: "색 터짐" }, param: "ring + rays",
          cap: { en: "A burst *in the new color*.", ko: "*새 팀 색*으로 팡." },
          capture(w, p) {
            w.spawn({ type: "ring", x: p.x, y: p.y - 70, size: 10, size1: 120, life: 0.5, w: 10, color: "147,197,253" });
            w.spawn({ type: "rays", x: p.x, y: p.y - 70, n: 10, size: 90, vr: 1.5, life: 0.9, color: "147,197,253" });
          },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "24 bits · stay",
          cap: { en: "Throw *confetti* that settles on the ground.", ko: "*꽃가루*를 뿌리고 땅에 남겨요." },
          capture(w, p) {
            for (let i = 0; i < 24; i++) w.spawn({ type: "chunk", x: p.x + rand(-10, 10), y: p.y - 110, vx: rand(-220, 220), vy: rand(-420, -120), g: 900, drag: 1.2, ground: true, gy: p.y + rand(-20, 30), bounce: 0.1, vr: rand(-20, 20), life: rand(2, 2.6), size: rand(3, 5), color: pick(["96,165,250", "255,255,255", "191,219,254"]), hold: true });
          },
        },
        {
          id: "text", name: { en: "Callout", ko: "점령 알림" }, param: "text 1.8s",
          cap: { en: "Say it: *CAPTURED*.", ko: "말로도 한 번: *점령!*" },
          capture(w) { w.spawn({ type: "text", text: "CAPTURED", x: 270, y: 70, vy: -8, life: 1.8, size: 30, color: "#93c5fd", hold: true }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "fanfare",
          cap: { en: "A short *fanfare*. Earned it.", ko: "짧은 *빰빠밤*. 해냈어요." },
          capture(w) { w.sfx.swish(); if (w.on("burst") || w.on("text")) w.sfx.fanfare(); },
        },
      ],
    },

    // 13 ─ 증원 도착
    {
      id: "army-reinforce", cat: "army", view: "iso", polished: true,
      title: { en: "Make reinforcements *arrive*", ko: "지원군을 *등장*시키기" },
      intro: { en: "Six more units. *Just… there.*", ko: "여섯 명 추가. *그냥… 있어요*." },
      interval: 1.8, stepDur: 4.0,
      drawFloor: isoField,
      setup(w) {
        ensure(); w.U = []; w.squad = []; w.count = 6; w.bump = 0;
        for (let i = 0; i < 6; i++) U(w, "b", 70 + (i % 2) * 40, 160 + ((i / 2) | 0) * 50, { h: 40 });
      },
      fire(w) {
        w.U = w.U.filter(u => !w.squad.includes(u));
        w.squad = []; w.count = 6;
        const z = { x: 330, y: 220 };
        w.emit("call", z);
        w.after(0.3, () => {
          for (let i = 0; i < 6; i++) {
            const u = U(w, "b", z.x - 50 + (i % 3) * 50, z.y - 30 + ((i / 3) | 0) * 56, { h: 40 });
            w.squad.push(u);
            u.delay = 0;
            w.emit("arrive", u, i);
            w.after(u.delay, () => { w.count++; w.emit("land", u); });
          }
        });
      },
      update(w, dt) { uStep(w, dt); w.bump = Math.max(0, w.bump - dt * 4); },
      drawBack(w, ctx) { drawFX(w, ctx, true); drawUnits(w, ctx); },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      drawHud(w, ctx) {
        const s = 1 + w.bump * 0.4;
        ctx.save(); ctx.translate(270, 56); ctx.scale(s, s);
        pill(ctx, "ARMY " + w.count, 0, 0, 18, w.bump > 0.1 ? "#c6f432" : "rgba(255,255,255,0.85)");
        ctx.restore();
      },
      steps: [
        {
          id: "drop", name: { en: "Drop In", ko: "하늘에서 쿵" }, param: "fall 250ms · 60ms apart",
          cap: { en: "Don't pop in. *Drop in*, one after another.", ko: "뿅 말고, 차례로 *뚝 떨어져요*." },
          arrive(w, u, i) {
            u.delay = 0.12 + i * 0.06; u.oy = -320; u.hold = true;
            w.after(u.delay - 0.12, () => w.tween(u, { oy: 0 }, 0.12, "in", () => { u.hold = false; }));
          },
        },
        {
          id: "marker", name: { en: "Landing Marker", ko: "착지 표시" }, param: "zone 0.9s",
          cap: { en: "Mark the *landing zone* first.", ko: "먼저 *내릴 자리*를 표시해요." },
          call(w, z) {
            fx(w, 0.9, (ctx, k) => {
              ctx.strokeStyle = `rgba(198,244,50,${1 - k})`; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -k * 60;
              ctx.beginPath(); ctx.ellipse(z.x, z.y + 10, 110, 52, 0, 0, TAU); ctx.stroke();
            }, true);
          },
        },
        {
          id: "land", name: { en: "Landing Dust", ko: "착지 먼지" }, param: "squash + ring",
          cap: { en: "Every landing *squashes* and puffs *dust*.", ko: "내릴 때마다 *꾹* 눌리고 *흙먼지*." },
          land(w, u) {
            u.sx = 1.4; u.sy = 0.6;
            w.spawn({ type: "ring", flat: true, x: u.x, y: u.y, size: 6, size1: 34, life: 0.35, w: 3, color: "220,200,160" });
            dust(w, u.x, u.y, 3, 0, "190,175,150");
          },
        },
        {
          id: "beam", name: { en: "Light Pillar", ko: "빛기둥" }, param: "beam 0.5s",
          cap: { en: "A *beam of light* where each one lands.", ko: "내린 자리마다 *빛기둥*." },
          land(w, u) { w.spawn({ type: "beam", x: u.x, y: u.y, h: 160, size: 16, life: 0.5, color: "147,197,253" }); },
        },
        {
          id: "count", name: { en: "Count Up", ko: "숫자 올라감" }, param: "+1 bump each",
          cap: { en: "*Count them in*. The army counter bumps.", ko: "*하나씩* 세요. 병력 숫자가 톡톡." },
          land(w, u) { w.bump = 1; w.spawn({ type: "text", text: "+1", x: u.x, y: u.y - 54, vy: -60, life: 0.6, size: 16, color: "#c6f432" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "horn + thumps",
          cap: { en: "A *horn* call, then a *thump* per soldier.", ko: "*뿌우* 나팔, 내릴 때마다 *쿵*." },
          call(w) { if (w.on("marker")) w.play(() => { tn({ type: "sawtooth", f: 220, dur: 0.35, vol: 0.12 }); tn({ type: "sawtooth", f: 330, dur: 0.3, vol: 0.1, delay: 0.12 }); }); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    // 14 ─ 미니맵 핑
    {
      id: "army-ping", cat: "army", view: "ui",
      title: { en: "Make minimap alerts *impossible to miss*", ko: "미니맵 알림을 *놓칠 수 없게*" },
      intro: { en: "Something happened. *Somewhere.*", ko: "어딘가에서… *무슨 일이*." },
      interval: 1.8, stepDur: 4.0,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = []; w.k = 0;
        for (let i = 0; i < 7; i++) U(w, "b", 110 + (i % 4) * 46, 120 + ((i / 4) | 0) * 60 + (i % 2) * 14, { top: true, h: 28, face: rand(-0.5, 0.5) });
        w.MM = { x: 386, y: 198, w: 126, h: 126 };
        w.ping = null; w.mmFlash = 0;
      },
      fire(w) {
        const P = [[0.88, 0.2], [0.85, 0.82], [0.15, 0.85], [0.6, 0.1]][w.k++ % 4];
        const M = w.MM, p = { x: M.x + P[0] * M.w, y: M.y + P[1] * M.h, wx: P[0], wy: P[1], t: 0 };
        w.ping = p;
        w.emit("ping", p);
      },
      update(w, dt) { uStep(w, dt); if (w.ping) w.ping.t += dt; w.mmFlash = Math.max(0, w.mmFlash - dt * 2); },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      drawFront(w, ctx) {
        const M = w.MM, f = w.mmFlash;
        ctx.save(); ctx.translate(M.x + M.w / 2, M.y + M.h / 2); ctx.scale(1 + f * 0.06, 1 + f * 0.06); ctx.translate(-M.x - M.w / 2, -M.y - M.h / 2);
        ctx.fillStyle = "rgba(8,10,14,0.92)"; ctx.fillRect(M.x, M.y, M.w, M.h);
        ctx.fillStyle = "rgba(96,165,250,0.9)"; for (const u of w.U) ctx.fillRect(M.x + 10 + (u.x - 100) * 0.12, M.y + 50 + (u.y - 110) * 0.12, 3, 3);
        ctx.fillStyle = "rgba(248,113,113,0.8)"; [[0.8, 0.3], [0.9, 0.25], [0.82, 0.78], [0.2, 0.9]].forEach(([a, b]) => ctx.fillRect(M.x + a * M.w, M.y + b * M.h, 3, 3));
        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(M.x + 8, M.y + 40, 44, 32);
        ctx.strokeStyle = f > 0 ? `rgba(248,113,113,${0.4 + f * 0.6})` : "rgba(255,255,255,0.3)"; ctx.lineWidth = 2 + f * 3; ctx.strokeRect(M.x, M.y, M.w, M.h);
        const p = w.ping;
        if (p && p.t < 2.2) { ctx.fillStyle = "#f87171"; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
        drawFX(w, ctx, false);
        ctx.restore();
      },
      steps: [
        {
          id: "rings", name: { en: "Pulse Rings", ko: "퍼지는 고리" }, param: "4 pulses · 2.4s",
          cap: { en: "*Pulse rings* that repeat. One is easy to miss.", ko: "*고리가 반복*해서 퍼져요. 한 번이면 놓쳐요." },
          ping(w, p) {
            fx(w, 2.4, (ctx, k) => {
              const q = (k * 4) % 1;
              ctx.strokeStyle = `rgba(248,113,113,${1 - q})`; ctx.lineWidth = 2.5;
              ctx.beginPath(); ctx.arc(p.x, p.y, 4 + q * 26, 0, TAU); ctx.stroke();
            });
          },
        },
        {
          id: "flash", name: { en: "Frame Flash", ko: "테두리 번쩍" }, param: "red border · bump",
          cap: { en: "Flash the *minimap border* and bump it.", ko: "미니맵 *테두리*를 붉게, 톡 튀게." },
          ping(w) { w.mmFlash = 1; },
        },
        {
          id: "arrow", name: { en: "Edge Arrow", ko: "가장자리 화살표" }, param: "points to event",
          cap: { en: "An *arrow on the main view* points the way.", ko: "*큰 화면*에도 화살표로 방향을." },
          ping(w, p) { edgeArrow(w, p.wx, p.wy); },
        },
        {
          id: "icon", name: { en: "Swords Icon", ko: "전투 아이콘" }, param: "⚔ pop",
          cap: { en: "Say *what kind* of event it is.", ko: "*무슨 일*인지 아이콘으로." },
          ping(w, p) {
            fx(w, 2.0, (ctx, k) => {
              const s = E.back(Math.min(1, k * 7));
              ctx.translate(p.x, p.y - 14); ctx.scale(s, s); ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
              pill(ctx, "⚔", 0, 0, 12, "#f87171", "#fff");
            });
          },
        },
        {
          id: "toast", name: { en: "Alert Toast", ko: "알림 문구" }, param: "text 2.4s",
          cap: { en: "A short line: *“Under attack!”*", ko: "짧게 한 줄: *“공격받고 있어요!”*" },
          ping(w) {
            fx(w, 2.4, (ctx, k) => {
              ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : Math.min(1, k * 12);
              pill(ctx, "UNDER ATTACK!", 270, 56 - 8 * (1 - Math.min(1, k * 8)), 16, "#ef4444", "#fff");
            });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "two-tone alert",
          cap: { en: "A *two-tone* alert. Learnable in one hearing.", ko: "*딩-동* 두 음. 한 번 들으면 외워요." },
          ping(w) { w.sfx.chime(0); w.after(0.15, () => w.sfx.chime(-5)); },
        },
      ],
    },

    // 15 ─ 전장 흙먼지
    {
      id: "army-dust", cat: "army", view: "iso", polished: true,
      title: { en: "Fill the melee with *dust*", ko: "난전을 *흙먼지*로 채우기" },
      intro: { en: "A brawl in a *clean room*.", ko: "*깨끗한 방*에서 싸우는 느낌." },
      interval: 0.5, stepDur: 3.8,
      drawFloor: isoField,
      setup(w) {
        ensure(); w.U = [];
        for (let i = 0; i < 16; i++) {
          const t = i % 2 ? "b" : "r", r = (i / 4) | 0;
          U(w, t, 190 + (i % 4) * 44 + (t === "b" ? -8 : 8) + rand(-4, 4), 150 + r * 40 + rand(-6, 6), { h: 40 });
        }
        w.haze = false;
      },
      fire(w) {
        for (let n = 0; n < 4; n++) {
          const a = pick(w.U), t = nearest(w, a, o => o.team !== a.team);
          const d = Math.sign(t.x - a.x) || 1;
          a.ox += d * 12; a.flip = d < 0;
          t.ox += d * 6; t.flash = 0.6;
          w.emit("blow", { x: (a.x + t.x) / 2, y: (a.y + t.y) / 2 });
        }
      },
      update(w, dt) { uStep(w, dt); w.haze = false; },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      drawOver(w, ctx) {
        if (!w.haze) return;
        ctx.save(); ctx.translate(270, 262); ctx.scale(1, 0.32);
        const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 220);
        g.addColorStop(0, "rgba(150,135,105,0.38)"); g.addColorStop(0.6, "rgba(150,135,105,0.22)"); g.addColorStop(1, "rgba(170,155,125,0)");
        ctx.fillStyle = g; ctx.fillRect(-240, -240, 480, 480); ctx.restore();
      },
      steps: [
        {
          id: "feet", name: { en: "Foot Puffs", ko: "발밑 먼지" }, param: "2 puffs / blow",
          cap: { en: "Every lunge kicks a little *puff*.", ko: "한 번 덤빌 때마다 발밑에 *폴폴*." },
          blow(w, p) { dust(w, p.x, p.y, 2, 0, "190,175,150"); },
        },
        {
          id: "cloud", name: { en: "Rolling Cloud", ko: "뭉게 먼지" }, param: "big · 2.5s life",
          cap: { en: "Big, slow *clouds* that hang around.", ko: "크고 느린 *먼지구름*이 오래 머물러요." },
          blow(w, p) {
            w.spawn({ type: "smoke", x: p.x + rand(-20, 20), y: p.y - rand(10, 30), vx: rand(-15, 15), vy: rand(-12, -4), size: rand(18, 26), size1: rand(46, 64), life: rand(2.2, 2.8), color: "100,92,76", alpha: 0.45 });
          },
        },
        {
          id: "haze", name: { en: "Ground Haze", ko: "바닥 안개" }, param: "front layer 45%",
          cap: { en: "A haze *in front of* the feet adds depth.", ko: "발 *앞을* 가리는 안개가 깊이를 줘요." },
          update(w) { w.haze = true; },
        },
        {
          id: "drift", name: { en: "Wind Drift", ko: "바람에 흘러감" }, param: "+24px/s",
          cap: { en: "Let the dust *drift* with the wind.", ko: "먼지가 바람 따라 *흘러가요*." },
          update(w, dt) { for (const p of w.parts) if (p.type === "smoke") p.x += 24 * dt; },
        },
        {
          id: "glint", name: { en: "Steel Glints", ko: "칼날 반짝" }, param: "star 120ms",
          cap: { en: "Tiny *glints* inside the cloud. Fighting in there.", ko: "먼지 속 *반짝*. 안에서 싸우고 있어요." },
          blow(w, p) { w.spawn({ type: "star", x: p.x, y: p.y - 26, size: 16, life: 0.16, color: "255,255,255" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "muffled clash",
          cap: { en: "*Muffled* clangs. The dust eats the highs.", ko: "*먹먹한* 챙챙. 먼지가 고음을 삼켜요." },
          blow(w) { w.play(() => nz({ type: "bandpass", f: rand(900, 1300), q: 3, dur: 0.08, vol: 0.25 })); },
        },
      ],
    },

    // 16 ─ 치유 오라
    {
      id: "army-heal", cat: "army", view: "top", polished: true,
      title: { en: "Show a healer *working*", ko: "힐러가 *일하는 게* 보이게" },
      intro: { en: "Bars go up. *From where?*", ko: "체력이 차요. *누가?*" },
      interval: 1.2, stepDur: 3.8,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = []; w.rad = 120;
        w.healer = U(w, "y", 250, 190, { top: true, h: 30 });
        w.pals = [];
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, d = i % 2 ? 80 : 100; w.pals.push(U(w, "b", 250 + Math.cos(a) * d * 1.2, 190 + Math.sin(a) * d, { top: true, h: 28, hp: rand(3, 6), maxHp: 10 })); }
        w.aura = false;
      },
      fire(w) {
        w.emit("pulse", w.healer);
        for (const u of w.pals) {
          if (Math.hypot(u.x - w.healer.x, u.y - w.healer.y) > w.rad * 1.25) continue;
          u.prev = u.hp; u.hp = Math.min(u.maxHp, u.hp + 4);
          w.emit("heal", u);
        }
      },
      update(w, dt) {
        uStep(w, dt); w.aura = false;
        for (const u of w.pals) { u.hp = Math.max(1, u.hp - dt * 1.6); u.gain = Math.max(0, (u.gain || 0) - dt * 1.2); }
      },
      drawBack(w, ctx) {
        if (w.aura) {
          const h = w.healer;
          ctx.fillStyle = "rgba(74,222,128,0.08)"; ctx.strokeStyle = "rgba(74,222,128,0.6)"; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -w.time * 20;
          ctx.beginPath(); ctx.ellipse(h.x, h.y, w.rad * 1.25, w.rad, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        }
        drawFX(w, ctx, true); drawUnits(w, ctx);
      },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      drawHud(w, ctx) {
        for (const u of w.pals) {
          const x = u.x - 16, y = u.y - 26, bw = 32;
          ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(x - 1, y - 1, bw + 2, 7);
          ctx.fillStyle = "#4ade80"; ctx.fillRect(x, y, bw * u.hp / u.maxHp, 5);
          if (u.gain > 0) { ctx.fillStyle = `rgba(255,255,255,${u.gain})`; ctx.fillRect(x + bw * u.prev / u.maxHp, y, bw * (u.hp - u.prev) / u.maxHp, 5); }
        }
      },
      steps: [
        {
          id: "aura", name: { en: "Range Ring", ko: "범위 표시" }, param: "dashed ring",
          cap: { en: "Show the *range*. Players need to know who's in.", ko: "*범위*를 보여줘요. 누가 안에 있는지." },
          update(w) { w.aura = true; },
        },
        {
          id: "wave", name: { en: "Pulse Wave", ko: "퍼지는 파동" }, param: "ring 0 → R",
          cap: { en: "A *wave* rolls out from the healer.", ko: "힐러에게서 *파동*이 퍼져요." },
          pulse(w, h) {
            w.spawn({ type: "ring", x: h.x, y: h.y, size: 10, size1: w.rad * 1.2, life: 0.45, w: 6, color: "134,239,172" });
            w.spawn({ type: "glow", x: h.x, y: h.y, size: 50, size1: 10, life: 0.4, color: "74,222,128" });
          },
        },
        {
          id: "links", name: { en: "Link Beams", ko: "연결선" }, param: "beam 0.35s",
          cap: { en: "Draw a *line* to everyone healed.", ko: "치유받은 유닛까지 *선*을 이어요." },
          heal(w, u) {
            const h = w.healer;
            fx(w, 0.6, (ctx, k) => {
              ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(134,239,172,${1 - k})`; ctx.lineWidth = 4 * (1 - k) + 1;
              ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(u.x, u.y); ctx.stroke();
            }, true);
          },
        },
        {
          id: "plus", name: { en: "Rising Plus", ko: "떠오르는 +" }, param: "3 per unit",
          cap: { en: "Little *green pluses* float up.", ko: "작은 *초록 +*가 떠올라요." },
          heal(w, u) {
            for (let i = 0; i < 3; i++) w.spawn({ type: "text", text: "+", x: u.x + rand(-14, 14), y: u.y - rand(0, 10), vy: rand(-90, -50), life: rand(0.8, 1.2), size: rand(14, 20), color: "#4ade80" });
            u.flash = 0.7;
          },
        },
        {
          id: "bars", name: { en: "Gain Highlight", ko: "찬 만큼 강조" }, param: "white segment",
          cap: { en: "Light up *the part that filled*.", ko: "*새로 찬 부분*만 하얗게." },
          heal(w, u) { u.gain = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft chime",
          cap: { en: "A soft *chime*. Heals should sound *kind*.", ko: "부드러운 *띵*. 치유는 *다정하게*." },
          pulse(w) { if (w.on("wave")) w.sfx.chime(rand(-2, 2)); },
        },
      ],
    },

    // 17 ─ 광역 마법
    {
      id: "army-aoe", cat: "army", view: "top", polished: true,
      title: { en: "Land an area spell on a *blob*", ko: "뭉친 적에 *광역기* 꽂기" },
      intro: { en: "Some of them… *vanished?*", ko: "몇 명이… *사라졌나?*" },
      interval: 1.4, stepDur: 3.8,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = [];
        for (let i = 0; i < 16; i++) { const a = i * 2.4, d = 14 + (i % 6) * 16; U(w, "r", 330 + Math.cos(a) * d * 1.3, 190 + Math.sin(a) * d, { top: true, h: 28 }); }
        w.mage = U(w, "b", 70, 190, { top: true, h: 30 });
      },
      fire(w) {
        restart(w, w.U);
        w.U.forEach(u => u !== w.mage && reset(u));
        const c = { x: 330, y: 190, r: 70 };
        w.emit("aim", c);
        w.after(0.35, () => {
          w.emit("blast", c);
          for (const u of w.U) {
            const d = Math.hypot(u.x - c.x, u.y - c.y);
            if (u.team !== "r") continue;
            if (d < c.r) { u.alpha = 0; w.emit("kill", u, Math.atan2(u.y - c.y, u.x - c.x)); }
            else w.emit("push", u, Math.atan2(u.y - c.y, u.x - c.x));
          }
        });
      },
      update(w, dt) { uStep(w, dt); },
      drawBack(w, ctx) { drawFX(w, ctx, true); drawUnits(w, ctx); },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      steps: [
        {
          id: "tele", name: { en: "Telegraph", ko: "예고 원" }, param: "fill 350ms",
          cap: { en: "Fill a circle *before* it hits. Fair and tense.", ko: "맞기 *전에* 원이 차올라요. 긴장감." },
          aim(w, c) {
            fx(w, 0.35, (ctx, k) => {
              ctx.fillStyle = "rgba(251,146,60,0.18)"; ctx.strokeStyle = "rgba(251,146,60,0.9)"; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); ctx.stroke();
              ctx.fillStyle = "rgba(251,146,60,0.35)"; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * k, 0, TAU); ctx.fill();
            }, true);
          },
        },
        {
          id: "blast", name: { en: "Blast Flash", ko: "폭발 섬광" }, param: "glow 140px · flash",
          cap: { en: "A *huge* glow and one bright frame.", ko: "*크게* 번쩍, 화면도 한 프레임 밝게." },
          blast(w, c) {
            w.flash("255,220,160", 0.5);
            w.spawn({ type: "glow", x: c.x, y: c.y, size: 140, size1: 40, life: 0.4, color: "255,170,60" });
            w.spawn({ type: "star", x: c.x, y: c.y, size: 70, life: 0.15, color: "255,255,255" });
          },
        },
        {
          id: "push", name: { en: "Shockwave Push", ko: "충격파 밀기" }, param: "ring · push 26px",
          cap: { en: "Survivors get *shoved outward*.", ko: "살아남은 유닛은 *바깥으로* 밀려요." },
          blast(w, c) { w.spawn({ type: "ring", x: c.x, y: c.y, size: 20, size1: c.r * 2.2, life: 0.4, w: 10, color: "255,230,190" }); },
          push(w, u, a) { u.ox += Math.cos(a) * 26; u.oy += Math.sin(a) * 26; u.flash = 1; },
        },
        {
          id: "bodies", name: { en: "Bodies Fly", ko: "날아간 몸" }, param: "slide 60px · spin",
          cap: { en: "Don't delete the dead. *Throw them* and leave them.", ko: "지우지 말고 *날려서* 남겨요." },
          kill(w, u, a) {
            Object.assign(u, { alpha: 1, dead: true, skin: "g", flash: 1, rot: rand(2, 5) });
            w.tween(u, { x: u.x + Math.cos(a) * 60, y: u.y + Math.sin(a) * 60 }, 0.45, "out");
          },
        },
        {
          id: "scorch", name: { en: "Scorch + Embers", ko: "그을음 + 불씨" }, param: "decal 3s",
          cap: { en: "Leave a *burn mark* and a few *embers*.", ko: "*그을린 자국*과 *불씨* 몇 개." },
          blast(w, c) {
            w.spawn({ type: "ellipse", under: true, round: true, x: c.x, y: c.y, size: c.r * 0.9, life: 3, color: "20,10,6", alpha: 0.6, hold: true, add: false });
            for (let i = 0; i < 14; i++) w.spawn({ type: "glow", x: c.x + rand(-50, 50), y: c.y + rand(-50, 50), vy: rand(-30, -8), size: rand(5, 9), size1: 1, life: rand(1, 2), color: "255,140,40" });
          },
        },
        {
          id: "shake", name: { en: "Shake + Stop", ko: "흔들림 + 멈칫" }, param: "trauma .5 · 80ms",
          cap: { en: "Big *shake*, tiny *freeze*.", ko: "크게 *흔들고*, 살짝 *멈칫*." },
          blast(w) { w.shake(0.5); w.hitstop(0.08); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge + boom",
          cap: { en: "A rising *hum*, then the *boom*.", ko: "*우웅* 모였다가 *쾅*." },
          aim(w) { w.sfx.charge(); },
          blast(w) { w.sfx.boom(); },
        },
      ],
    },

    // 18 ─ 오토배틀러 라운드 시작
    {
      id: "army-round", cat: "army", view: "top", polished: true,
      title: { en: "Kick off an auto-battle round *with a bang*", ko: "오토배틀 라운드 시작을 *쾅*" },
      intro: { en: "The round started. *Probably.*", ko: "라운드가… 시작됐나 봐요. *아마도*." },
      interval: 2.4, stepDur: 4.2,
      drawFloor: abBoard,
      setup(w) {
        ensure(); w.U = []; w.round = 2;
        const B = [[1, 3], [3, 4], [5, 3], [2, 5], [4, 5], [6, 4]], R = [[1, 2], [3, 1], [5, 2], [2, 0], [4, 0], [6, 1]];
        for (const [c, r] of B) U(w, "b", AB.x + c * AB.s + AB.s / 2, AB.y + r * AB.s + AB.s / 2, { top: true, h: 30, face: -Math.PI / 2 });
        for (const [c, r] of R) U(w, "r", AB.x + c * AB.s + AB.s / 2, AB.y + r * AB.s + AB.s / 2, { top: true, h: 30, face: Math.PI / 2 });
      },
      fire(w) {
        const g = restart(w, w.U);
        w.U.forEach(u => { u.x = u.hx; u.y = u.hy; });
        w.round++;
        w.emit("start", w.round);
        w.after(0.9, () => {
          if (g !== w.gen) return;
          w.emit("fight");
          for (const u of w.U) w.tween(u, { y: u.hy + (u.team === "b" ? -24 : 24) }, 0.25, "in");
        });
      },
      update(w, dt) { uStep(w, dt); },
      drawBack(w, ctx) { drawFX(w, ctx, true); drawUnits(w, ctx); },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      drawHud(w, ctx) { label(ctx, "Round " + w.round, 270, 44, 13, "rgba(255,255,255,0.55)"); },
      steps: [
        {
          id: "banner", name: { en: "Slide-in Banner", ko: "띠 배너" }, param: "dim 40% · 1.0s",
          cap: { en: "*Dim* the board, slide a banner across.", ko: "판을 *어둡게*, 배너가 *쓱* 지나가요." },
          start(w, n) { banner(w, "ROUND " + n, 1.0); },
        },
        {
          id: "sweep", name: { en: "Grid Sweep", ko: "격자 훑기" }, param: "scan 0.6s",
          cap: { en: "A light *sweeps the grid*. The board wakes up.", ko: "빛이 *격자를 훑어요*. 판이 깨어나요." },
          start(w) {
            fx(w, 0.6, (ctx, k) => {
              const y = AB.y + k * AB.s * 6;
              const g = ctx.createLinearGradient(0, y - 40, 0, y);
              g.addColorStop(0, "rgba(198,244,50,0)"); g.addColorStop(1, "rgba(198,244,50,0.35)");
              ctx.fillStyle = g; ctx.fillRect(AB.x, Math.max(AB.y, y - 40), AB.s * 7, Math.min(40, y - AB.y));
            }, true);
          },
        },
        {
          id: "ready", name: { en: "Ready Hop", ko: "준비 폴짝" }, param: "row by row 60ms",
          cap: { en: "Units *hop* row by row: “ready!”", ko: "줄마다 *폴짝*. “준비 완료!”" },
          start(w) { for (const u of w.U) w.after(0.1 + Math.abs(u.hy - 190) / AB.s * 0.06, () => { u.sx = 1.4; u.sy = 1.4; u.flash = 1; }); },
        },
        {
          id: "fight", name: { en: "FIGHT Stamp", ko: "FIGHT 도장" }, param: "scale 2.2 → 1",
          cap: { en: "Slam a big *FIGHT!* right as they move.", ko: "움직이는 순간 *FIGHT!*를 쾅." },
          fight(w) { stamp(w, "FIGHT!", 270, 190, 1.2, "#c6f432"); w.flash("255,255,255", 0.3); },
        },
        {
          id: "shake", name: { en: "Charge Kick", ko: "돌격 반동" }, param: "trauma .2 · dust",
          cap: { en: "Everyone lunges: a *kick* and a puff of *dust*.", ko: "모두 튀어 나가요. *쿵*, 그리고 *흙먼지*." },
          fight(w) { w.shake(0.2); for (const u of w.U) dust(w, u.x, u.y + 6, 1, 0, "190,175,150"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "chime · crash",
          cap: { en: "A *chime* for the banner, a *crash* for FIGHT.", ko: "배너엔 *띵*, FIGHT엔 *쾅*." },
          start(w) { if (w.on("banner")) w.sfx.swish(); },
          fight(w) { w.sfx.slam(); if (w.on("fight")) w.sfx.fanfare(); },
        },
      ],
    },

    // 19 ─ 3 합체
    {
      id: "army-merge", cat: "army", view: "ui", polished: true,
      title: { en: "Make a 3-merge *feel like a level-up*", ko: "3개 합치기를 *레벨업처럼*" },
      intro: { en: "Three gone, one bigger. *Okay?*", ko: "셋이 사라지고 하나가 커졌어요. *그래서?*" },
      interval: 1.8, stepDur: 4.0,
      drawFloor: abBoard,
      setup(w) {
        ensure(); w.U = [];
        w.trio = [200, 270, 340].map(x => U(w, "b", x, 300, { top: true, h: 30, face: -Math.PI / 2 }));
        w.res = U(w, "y", 270, 170, { top: true, h: 48, face: -Math.PI / 2, alpha: 0 });
      },
      fire(w) {
        const g = restart(w, w.U);
        w.trio.forEach(reset);
        Object.assign(w.res, { alpha: 0, starT: null });
        w.after(0.3, () => {
          if (g !== w.gen) return;
          w.trio.forEach(u => w.emit("gather", u));
          w.after(w.on("pull") ? 0.28 : 0, () => {
            if (g !== w.gen) return;
            w.trio.forEach(u => (u.alpha = 0));
            w.res.alpha = 1;
            w.emit("merge", w.res);
          });
        });
      },
      update(w, dt) { uStep(w, dt); if (w.res.starT != null) w.res.starT += dt; },
      drawBack(w, ctx) {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.roundRect(150, 276, 240, 48, 8); ctx.fill();
        label(ctx, "BENCH", 270, 334, 10, "rgba(255,255,255,0.4)", "center", "'JetBrains Mono', monospace", 700);
        drawFX(w, ctx, true); drawUnits(w, ctx);
      },
      drawFront(w, ctx) {
        drawFX(w, ctx, false);
        const r = w.res;
        if (r.starT == null || r.alpha < 0.5) return;
        for (let i = 0; i < 2; i++) {
          const t = r.starT - 0.12 - i * 0.12; if (t < 0) continue;
          const s = E.back(Math.min(1, t / 0.2));
          ctx.save(); ctx.translate(256 + i * 28, 128); ctx.scale(s, s);
          ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2; starPath(ctx, 0, 0, 13); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      },
      steps: [
        {
          id: "pull", name: { en: "Pull Together", ko: "모여들기" }, param: "ease-in 280ms",
          cap: { en: "The three *fly together* first.", ko: "먼저 셋이 *한 점으로* 모여요." },
          gather(w, u) { w.tween(u, { x: 270, y: 170, sx: 0.5, sy: 0.5 }, 0.28, "in"); },
        },
        {
          id: "glow", name: { en: "Go White", ko: "하얗게" }, param: "flash 0.5s",
          cap: { en: "They turn *white-hot* on the way in.", ko: "모이는 동안 *하얗게* 달아올라요." },
          gather(w, u) { u.flash = 3; },
        },
        {
          id: "pop", name: { en: "Big Pop", ko: "크게 톡" }, param: "scale 1.7 → 1",
          cap: { en: "The result *pops in big*, then settles.", ko: "결과물은 *크게* 튀어나왔다 자리 잡아요." },
          merge(w, r) { r.sx = r.sy = 1.7; r.flash = 1.5; },
        },
        {
          id: "burst", name: { en: "Burst + Pillar", ko: "터짐 + 빛기둥" }, param: "ring · rays · beam",
          cap: { en: "A *ring*, *rays* and a *pillar of light*.", ko: "*고리*, *빛살*, 그리고 *빛기둥*." },
          merge(w, r) {
            w.spawn({ type: "ring", x: r.x, y: r.y, size: 10, size1: 110, life: 0.45, w: 10, color: "253,224,71" });
            w.spawn({ type: "rays", x: r.x, y: r.y, n: 12, size: 110, vr: 1.2, life: 1.2, color: "253,224,71" });
            w.spawn({ type: "beam", x: r.x, y: r.y + 20, h: 200, size: 40, life: 0.6, color: "254,240,138" });
          },
        },
        {
          id: "stars", name: { en: "Star Pop", ko: "별 톡톡" }, param: "2 stars · 120ms",
          cap: { en: "Stars *pop in one by one*. That's the upgrade.", ko: "별이 *하나씩* 톡톡. 이게 업그레이드." },
          merge(w, r) { r.starT = 0; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "3 blips + chime",
          cap: { en: "Three rising *blips*, then a bright *chime*.", ko: "*삑삑삑* 올라가고, 맑은 *띵*." },
          gather(w) { w.sfx.blip(w.trio.filter(u => u.flash > 2).length * 3); },
          merge(w) { w.sfx.pop(); if (w.on("burst") || w.on("stars")) w.sfx.chime(5); },
        },
      ],
    },

    // 20 ─ 시너지 발동
    {
      id: "army-synergy", cat: "army", view: "ui", polished: true,
      title: { en: "Light up a *synergy*", ko: "시너지 발동을 *반짝*" },
      intro: { en: "3/4 became 4/4. *Did you notice?*", ko: "3/4가 4/4로. *눈치채셨어요?*" },
      interval: 1.8, stepDur: 4.0,
      drawFloor: abBoard,
      setup(w) {
        ensure(); w.U = [];
        w.knights = [[300, 125], [380, 125], [260, 195], [340, 195]].map(([x, y]) => U(w, "b", x, y, { top: true, h: 30, face: -Math.PI / 2 }));
        w.new = w.knights[3]; w.new.hx = 300; w.new.hy = 302; w.slot = { x: 340, y: 195 };
        U(w, "b", 420, 195, { top: true, h: 30, face: -Math.PI / 2, skin: "g" });
        w.count = 3;
      },
      fire(w) {
        const g = restart(w, w.U);
        reset(w.new);
        w.count = 3; w.active = false; w.pipT = null; w.linkT = null; w.glowRow = false;
        w.knights.forEach(u => (u.aura = 0));
        w.after(0.15, () => g === w.gen && w.tween(w.new, { x: w.slot.x, y: w.slot.y }, 0.3, "inout", () => {
          w.count = 4; w.active = true;
          w.emit("activate");
        }));
      },
      update(w, dt) {
        uStep(w, dt); w.glowRow = false;
        if (w.pipT != null) w.pipT += dt;
        if (w.linkT != null) w.linkT += dt;
      },
      drawBack(w, ctx) {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.roundRect(230, 280, 140, 44, 8); ctx.fill();
        if (w.linkT != null) {
          const a = 0.35 + 0.65 * Math.max(0, 1 - w.linkT * 2);
          ctx.strokeStyle = `rgba(250,204,21,${a})`; ctx.lineWidth = 2 + 3 * Math.max(0, 1 - w.linkT * 2);
          const K = w.knights; ctx.beginPath();
          [[0, 1], [0, 2], [1, 3], [2, 3]].forEach(([i, j]) => { ctx.moveTo(K[i].x, K[i].y); ctx.lineTo(K[j].x, K[j].y); });
          ctx.stroke();
        }
        for (const u of w.knights) if (u.aura) {
          const p = 1 + 0.08 * Math.sin(w.time * 6);
          ctx.strokeStyle = "rgba(250,204,21,0.9)"; ctx.fillStyle = "rgba(250,204,21,0.18)"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(u.x, u.y, 20 * p, 0, TAU); ctx.fill(); ctx.stroke();
        }
        drawUnits(w, ctx);
      },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      drawHud(w, ctx) {
        const x = 34, y = 70, gold = w.pipT != null;
        if (w.glowRow) glow(ctx, x + 66, y, 90 + 10 * Math.sin(w.time * 6), "250,204,21", 0.35);
        ctx.fillStyle = gold ? "rgba(120,80,10,0.85)" : "rgba(0,0,0,0.6)"; ctx.strokeStyle = gold ? "#facc15" : "rgba(255,255,255,0.2)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x, y - 20, 140, 40, 8); ctx.fill(); ctx.stroke();
        label(ctx, "KNIGHT", x + 10, y - 6, 13, gold ? "#fde047" : "rgba(255,255,255,0.7)", "left");
        label(ctx, w.count + "/4", x + 130, y - 6, 13, gold ? "#fde047" : "rgba(255,255,255,0.7)", "right");
        if (gold) for (let i = 0; i < 4; i++) {
          const s = i < 3 ? 1 : E.back(Math.min(1, w.pipT / 0.25));
          ctx.save(); ctx.translate(x + 16 + i * 22, y + 9); ctx.scale(s, s);
          ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.roundRect(-8, -4, 16, 8, 3); ctx.fill(); ctx.restore();
        }
      },
      steps: [
        {
          id: "pips", name: { en: "Pips + Gold Row", ko: "칸 채움 + 금빛" }, param: "4 pips · gold",
          cap: { en: "Fill the last *pip* with a pop. Turn the row *gold*.", ko: "마지막 *칸*이 톡, 줄이 *금빛*으로." },
          activate(w) { w.pipT = 0; },
        },
        {
          id: "glow", name: { en: "Row Glow", ko: "줄 빛남" }, param: "pulse while on",
          cap: { en: "Keep it *glowing* while it's active.", ko: "켜져 있는 동안 계속 *은은하게*." },
          update(w) { if (w.active) w.glowRow = true; },
        },
        {
          id: "links", name: { en: "Link Lines", ko: "연결선" }, param: "flash → 35%",
          cap: { en: "*Connect* the units that share the trait.", ko: "같은 특성끼리 *선으로* 이어요." },
          activate(w) { w.linkT = 0; },
        },
        {
          id: "aura", name: { en: "Unit Aura", ko: "유닛 오라" }, param: "gold ring",
          cap: { en: "Every member gets a *gold ring*. Who got the buff?", ko: "해당 유닛에 *금빛 고리*. 누가 강해졌는지." },
          activate(w) { w.knights.forEach((u, i) => w.after(i * 0.06, () => { u.aura = 1; u.flash = 1; u.sx = u.sy = 1.3; })); },
        },
        {
          id: "callout", name: { en: "Callout", ko: "효과 알림" }, param: "text 1.8s",
          cap: { en: "Say *what it does*: ARMOR +30.", ko: "*무슨 효과*인지 말해줘요: 방어 +30." },
          activate(w) { w.spawn({ type: "text", text: "KNIGHTS · ARMOR +30", x: 300, y: 56, vy: -8, life: 1.9, size: 20, color: "#fde047", hold: true }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "major chord",
          cap: { en: "A bright *chord*. Not a click.", ko: "딸깍 말고 밝은 *화음*." },
          activate(w) { w.sfx.clickDown(); if (w.on("glow") || w.on("callout")) [0, 4, 7].forEach((n, i) => w.after(i * 0.05, () => w.sfx.chime(n))); },
        },
      ],
    },

    // 21 ─ 점령 진행 고리
    {
      id: "army-capring", cat: "army", view: "top", polished: true,
      title: { en: "Make capture progress *readable*", ko: "점령 진행을 *한눈에*" },
      intro: { en: "A tiny number. *Squint.*", ko: "작은 숫자 하나. *눈을 찡그려요*." },
      interval: 2.2, stepDur: 4.0,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = [];
        [150, 190, 230].forEach((y, i) => U(w, "b", 100, y, { top: true, h: 28, to: { x: 290 + (i % 2) * 34, y: 160 + i * 30 } }));
        w.cap = { v: 0, last: 0, done: false, bump: 0, doneT: null, x: 320, y: 190, r: 80 };
      },
      fire(w) {
        const g = restart(w, w.U.concat([w.cap]));
        w.U.forEach(reset);
        Object.assign(w.cap, { v: 0, last: 0, done: false, doneT: null });
        w.U.forEach(u => w.tween(u, { x: u.to.x, y: u.to.y }, 0.3, "out"));
        w.after(0.3, () => g === w.gen && w.tween(w.cap, { v: 1 }, 1.1, "lin", () => { w.cap.done = true; w.emit("done", w.cap); }));
      },
      update(w, dt) {
        uStep(w, dt);
        const c = w.cap, n = Math.floor(c.v * 5 + 1e-6);
        if (n > c.last && n < 5) { c.last = n; w.emit("tick", c, n); }
        c.bump = Math.max(0, c.bump - dt * 4);
        if (c.doneT != null) c.doneT += dt;
        w.arc = false; w.fill = false;
      },
      drawBack(w, ctx) {
        const c = w.cap, s = 1 + c.bump * 0.08;
        ctx.save(); ctx.translate(c.x, c.y); ctx.scale(s, s);
        if (w.fill) {
          ctx.fillStyle = `rgba(96,165,250,${0.12 + 0.25 * c.v})`;
          ctx.beginPath(); ctx.arc(0, 0, c.r * c.v, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = c.done ? "#60a5fa" : "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, c.r, 0, TAU); ctx.stroke();
        if (w.arc) {
          ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, c.r + 8, 0, TAU); ctx.stroke();
          ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 8; ctx.lineCap = "round";
          ctx.beginPath(); ctx.arc(0, 0, c.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * c.v); ctx.stroke(); ctx.lineCap = "butt";
        }
        if (c.doneT != null) {
          const k = E.back(Math.min(1, c.doneT / 0.3));
          ctx.scale(k, k); ctx.fillStyle = "#3b82f6"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#fff"; ctx.fillRect(-2, -12, 3, 24); ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(13, -7); ctx.lineTo(1, -2); ctx.fill();
        }
        ctx.restore();
        drawUnits(w, ctx);
      },
      drawHud(w, ctx) { const c = w.cap; if (c.doneT == null) label(ctx, Math.round(c.v * 100) + "%", c.x, c.y - c.r - 22, 12, "rgba(255,255,255,0.6)"); },
      steps: [
        {
          id: "arc", name: { en: "Progress Arc", ko: "진행 고리" }, param: "8px arc",
          cap: { en: "A thick *arc* around the zone. Readable from afar.", ko: "구역을 두르는 *두꺼운 고리*. 멀리서도 보여요." },
          update(w) { w.arc = true; },
        },
        {
          id: "fill", name: { en: "Spreading Fill", ko: "번지는 색" }, param: "radius = progress",
          cap: { en: "Color *spreads from the center* as it fills.", ko: "*가운데부터* 색이 번져요." },
          update(w) { w.fill = true; },
        },
        {
          id: "ticks", name: { en: "20% Pulses", ko: "20%마다 톡" }, param: "bump every 20%",
          cap: { en: "*Pulse* every 20%. Progress you can *feel*.", ko: "20%마다 *톡*. 진행이 *느껴져요*." },
          tick(w, c) { c.bump = 1; w.spawn({ type: "ring", x: c.x, y: c.y, size: c.r, size1: c.r + 26, life: 0.3, w: 3, color: "147,197,253" }); },
        },
        {
          id: "burst", name: { en: "Capture Burst", ko: "점령 터짐" }, param: "ring + rays",
          cap: { en: "At 100%: a *burst* in the team color.", ko: "100%에 팀 색으로 *팡*." },
          done(w, c) {
            w.spawn({ type: "ring", x: c.x, y: c.y, size: c.r, size1: c.r * 2, life: 0.5, w: 10, color: "147,197,253" });
            w.spawn({ type: "rays", x: c.x, y: c.y, n: 12, size: 130, vr: 1, life: 1, color: "147,197,253" });
          },
        },
        {
          id: "flag", name: { en: "Owner Badge", ko: "주인 표시" }, param: "badge pop",
          cap: { en: "Pop an *owner badge* in the middle.", ko: "가운데에 *주인 배지*가 톡." },
          done(w, c) { c.doneT = 0; c.bump = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising blips · fanfare",
          cap: { en: "Each pulse a *step higher*. Finish with a fanfare.", ko: "톡마다 *한 단씩* 높게, 끝은 빰빠밤." },
          tick(w, c, n) { if (w.on("ticks")) w.sfx.blip(n * 3); },
          done(w) { w.sfx.thunk(); if (w.on("burst") || w.on("flag")) w.sfx.fanfare(); },
        },
      ],
    },

    // 22 ─ 군중 데미지 숫자
    {
      id: "army-numbers", cat: "army", view: "top",
      title: { en: "Tame damage numbers over *crowds*", ko: "떼거리 데미지 숫자 *정리하기*" },
      intro: { en: "Numbers *everywhere*. Read any?", ko: "숫자가 *우수수*. 하나라도 읽혀요?" },
      interval: 0.35, stepDur: 3.8,
      drawFloor: board,
      setup(w) {
        ensure(); w.U = [];
        w.archers = [0, 1, 2, 3].map(i => U(w, "b", 60, 100 + i * 60, { top: true, h: 28 }));
        w.foes = [];
        for (let i = 0; i < 10; i++) w.foes.push(U(w, "r", 330 + (i % 4) * 40 + ((i / 4) | 0) * 14, 140 + ((i / 4) | 0) * 62 + (i % 2) * 18, { top: true, h: 28 }));
        w.tot = { v: 0, shown: 0, bump: 0 };
      },
      fire(w) {
        for (let i = 0; i < 8; i++) w.after(i * 0.03, () => {
          const u = pick(w.foes), a = w.archers[i % 4], crit = Math.random() < 0.15, d = Math.round(rand(8, 16) * (crit ? 2.5 : 1));
          fx(w, 0.06, ctx => { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(u.x, u.y); ctx.stroke(); });
          u.flash = 0.6;
          if (!w.on("merge")) w.spawn({ type: "text", text: String(d), x: u.x + rand(-10, 10), y: u.y - 22, vy: -50, life: 1.1, size: 14, color: "#ffffff" });
          w.emit("hit", u, d, crit);
        });
      },
      update(w, dt) {
        uStep(w, dt);
        w.big = false; w.heat = false;
        for (const u of w.foes) {
          if (!u.acc) continue;
          u.accT -= dt; u.bump = Math.max(0, (u.bump || 0) - dt * 6); u.crit = Math.max(0, (u.crit || 0) - dt);
          if (u.accT <= 0) { w.emit("release", u); u.acc = 0; }
        }
        const t = w.tot; t.shown += (t.v - t.shown) * Math.min(1, dt * 6); t.bump = Math.max(0, t.bump - dt * 5);
      },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      drawFront(w, ctx) { drawFX(w, ctx, false); },
      drawHud(w, ctx) {
        for (const u of w.foes) if (u.acc) {
          const sz = (w.big ? 14 + Math.log2(1 + u.acc / 10) * 5 : 15) * (1 + u.bump * 0.35);
          const col = u.crit > 0 ? "#fde047" : w.heat ? (u.acc > 60 ? "#fb923c" : u.acc > 30 ? "#fde68a" : "#ffffff") : "#ffffff";
          ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,12,20,0.9)"; ctx.lineJoin = "round";
          ctx.font = `900 ${sz}px Pretendard, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.strokeText(String(u.acc), u.x, u.y - 26); ctx.fillStyle = col; ctx.fillText(String(u.acc), u.x, u.y - 26); ctx.restore();
        }
        if (w.tot.v > 0 && w.showTot) {
          const s = 1 + w.tot.bump * 0.25;
          ctx.save(); ctx.translate(390, 56); ctx.scale(s, s);
          pill(ctx, "−" + Math.round(w.tot.shown).toLocaleString("en-US"), 0, 0, 20, "#f87171", "#fff"); ctx.restore();
        }
      },
      steps: [
        {
          id: "merge", name: { en: "One Number per Unit", ko: "유닛당 숫자 하나" }, param: "sum · 0.7s window",
          cap: { en: "*Add hits up* on one number per unit.", ko: "유닛마다 숫자 *하나에 더해요*." },
          hit(w, u, d) { u.acc = (u.acc || 0) + d; u.accT = 0.7; u.bump = 1; },
        },
        {
          id: "size", name: { en: "Size by Amount", ko: "클수록 크게" }, param: "14 + log2 × 5",
          cap: { en: "*Bigger totals*, bigger text.", ko: "*많이 쌓일수록* 글자도 크게." },
          update(w) { w.big = true; },
        },
        {
          id: "heat", name: { en: "Heat Color", ko: "온도 색" }, param: "white → orange",
          cap: { en: "White → yellow → orange. *Crits flash gold.*", ko: "하양 → 노랑 → 주황. *치명타는 금빛*." },
          update(w) { w.heat = true; },
          hit(w, u, d, crit) { if (crit) u.crit = 0.4; },
        },
        {
          id: "release", name: { en: "Float Off", ko: "떠나보내기" }, param: "rise + fade 0.8s",
          cap: { en: "When hits stop, the total *floats up* and fades.", ko: "공격이 멈추면 합계가 *떠오르며* 사라져요." },
          release(w, u) { w.spawn({ type: "text", text: String(u.acc), x: u.x, y: u.y - 26, vy: -70, life: 0.8, size: 18, color: "#fde68a" }); },
        },
        {
          id: "total", name: { en: "Group Total", ko: "전체 합계" }, param: "rolling counter",
          cap: { en: "One *big total* for the whole crowd.", ko: "무리 전체엔 *큰 합계* 하나." },
          hit(w, u, d) { w.tot.v += d; w.tot.bump = 1; },
          update(w) { w.showTot = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick · crit",
          cap: { en: "Quiet *ticks*. Only crits get a *punch*.", ko: "작은 *틱틱*. 치명타만 *퍽*." },
          hit(w, u, d, crit) { if (crit) w.sfx.crit(); else w.sfx.tick(); },
        },
      ],
    },

    // 23 ─ 승리 배너
    {
      id: "army-victory", cat: "army", view: "iso",
      title: { en: "Celebrate *VICTORY*", ko: "*승리*를 크게 축하하기" },
      intro: { en: "You won. Says so in *small print*.", ko: "이겼대요. *작은 글씨*로." },
      interval: 2.6, stepDur: 4.4,
      drawFloor: isoField,
      setup(w) {
        ensure(); w.U = [];
        w.blue = [];
        for (let i = 0; i < 6; i++) w.blue.push(U(w, "b", 150 + (i % 3) * 44, 200 + ((i / 3) | 0) * 50, { h: 42, ph: i * 0.9 }));
        w.last = U(w, "r", 360, 225, { h: 42 });
      },
      fire(w) {
        const g = restart(w, w.U);
        w.U.forEach(reset);
        Object.assign(w, { won: false, bannerT: null, raysOn: false, starsT: null });
        w.after(0.2, () => {
          if (g !== w.gen) return;
          const a = w.blue[2]; a.ox += 30; a.flash = 0.5;
          w.last.flash = 1.5;
          w.emit("final", w.last);
          if (!w.last.fly) w.last.alpha = 0;
          w.after(w.on("slow") ? 0.35 : 0.05, () => { if (g !== w.gen) return; w.won = true; w.emit("win"); });
        });
      },
      update(w, dt) {
        uStep(w, dt);
        if (w.bannerT != null) w.bannerT += dt;
        if (w.starsT != null) w.starsT += dt;
      },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      drawHud(w, ctx) {
        if (!w.won) return;
        if (w.bannerT == null) { label(ctx, "Victory", 270, 120, 16, "rgba(255,255,255,0.8)"); return; }
        if (w.raysOn) {
          ctx.save(); ctx.translate(270, 112); ctx.rotate(w.time * 0.6); ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.fillStyle = "rgba(253,224,71,0.13)"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(170, -18); ctx.lineTo(170, 18); ctx.closePath(); ctx.fill(); }
          ctx.restore();
        }
        const k = Math.min(1, w.bannerT / 0.25), s = 1.6 - 0.6 * E.back(k);
        ctx.save(); ctx.translate(270, 112); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, k * 3);
        ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#78350f"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-150, -30); ctx.lineTo(150, -30); ctx.lineTo(132, 0); ctx.lineTo(150, 30); ctx.lineTo(-150, 30); ctx.lineTo(-132, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        label(ctx, "VICTORY", 0, 2, 40, "#422006", "center", "Pretendard, sans-serif", 900);
        ctx.restore();
        if (w.starsT != null) for (let i = 0; i < 3; i++) {
          const t = w.starsT - 0.25 - i * 0.15; if (t < 0) continue;
          const q = E.back(Math.min(1, t / 0.2));
          ctx.save(); ctx.translate(230 + i * 40, 168 - (i === 1 ? 6 : 0)); ctx.scale(q, q);
          ctx.fillStyle = "#fde047"; ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2; starPath(ctx, 0, 0, 16); ctx.fill(); ctx.stroke(); ctx.restore();
        }
      },
      steps: [
        {
          id: "slow", name: { en: "Last-hit Slow-mo", ko: "마지막 한 방 슬로" }, param: "×0.2 · 0.6s",
          cap: { en: "*Slow down* the final blow. Send it flying.", ko: "마지막 일격은 *느리게*. 멀리 날려요." },
          final(w, u) { w.slowmo(0.2, 0.6); w.zoomPunch(0.08); launch(u, 240, -520, 8); },
        },
        {
          id: "banner", name: { en: "Banner Slam", ko: "배너 쾅" }, param: "scale 1.6 → 1",
          cap: { en: "A *big banner slams* down from the camera.", ko: "*큰 배너*가 화면 앞에서 쾅." },
          win(w) { w.bannerT = 0; },
        },
        {
          id: "rays", name: { en: "Light Rays", ko: "빛살" }, param: "12 rays · spin",
          cap: { en: "*Slow-turning rays* behind it.", ko: "뒤에서 *천천히 도는 빛살*." },
          win(w) { w.raysOn = true; },
        },
        {
          id: "stars", name: { en: "Star Rating", ko: "별 평가" }, param: "3 stars · 150ms",
          cap: { en: "Stars land *one at a time*. Each one counts.", ko: "별이 *하나씩* 착. 하나하나 기뻐요." },
          win(w) { w.starsT = 0; },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "40 bits",
          cap: { en: "*Confetti* from the top of the screen.", ko: "화면 위에서 *꽃가루*." },
          win(w) {
            for (let i = 0; i < 40; i++) w.spawn({ type: "chunk", x: rand(40, 500), y: rand(-40, 20), vx: rand(-40, 40), vy: rand(40, 160), g: 160, vr: rand(-12, 12), life: rand(2.2, 2.8), size: rand(3, 5), color: pick(["250,204,21", "96,165,250", "255,255,255", "244,114,182"]), hold: true });
          },
        },
        {
          id: "cheer", name: { en: "Cheer", ko: "환호" }, param: "hop 14px",
          cap: { en: "The army *jumps for joy*.", ko: "병사들이 *방방* 뛰어요." },
          update(w) { if (w.won) for (const u of w.blue) u.oy = -Math.abs(Math.sin(w.time * 8 + u.ph)) * 14; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hit · fanfare",
          cap: { en: "A heavy *last hit*, then the *fanfare*.", ko: "묵직한 *마지막 한 방*, 그리고 *팡파레*." },
          final(w) { w.sfx.crit(); },
          win(w) { w.sfx.fanfare(); },
        },
      ],
    },

    // 24 ─ 전력 줄다리기 바
    {
      id: "army-tug", cat: "army", view: "iso",
      title: { en: "Make the strength bar a *tug-of-war*", ko: "전력 게이지를 *줄다리기*처럼" },
      intro: { en: "The line *teleports*. Who's winning?", ko: "경계선이 *순간이동*. 누가 이겨요?" },
      interval: 0.9, stepDur: 3.8,
      drawFloor: isoField,
      setup(w) {
        ensure(); w.U = [];
        for (let i = 0; i < 8; i++) {
          U(w, "b", 220 - (i % 2) * 40 - ((i / 2) | 0) % 2 * 16, 150 + ((i / 2) | 0) * 40, { h: 38 });
          U(w, "r", 320 + (i % 2) * 40 + ((i / 2) | 0) % 2 * 16, 150 + ((i / 2) | 0) * 40, { h: 38 });
        }
        Object.assign(w, { val: 0.5, show: 0.5, lag: 0.5, lagWait: 0, follow: false, pct: false });
        w.bar = { shake: 0, hurt: 0, side: "r" };
      },
      fire(w) {
        const dir = w.val > 0.62 ? -1 : w.val < 0.38 ? 1 : pick([-1, 1]), d = dir * rand(0.07, 0.18);
        w.val = Math.min(0.85, Math.max(0.15, w.val + d));
        w.emit("swing", d);
      },
      update(w, dt) {
        uStep(w, dt);
        if (!w.on("ease")) w.show = w.val;
        if (!w.on("lag")) w.lag = w.show;
        w.bar.shake = Math.max(0, w.bar.shake - dt); w.bar.hurt = Math.max(0, w.bar.hurt - dt * 3);
        const off = w.follow ? (w.show - 0.5) * 300 : 0;
        for (const u of w.U) u.x += (u.hx + off - u.x) * Math.min(1, dt * 6);
        w.follow = false; w.pct = false;
      },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      drawHud(w, ctx) {
        const b = w.bar, X = 70 + (b.shake > 0 ? rand(-4, 4) : 0), Y = 50, W = 400, H = 18, sx = X + W * w.show, lx = X + W * w.lag;
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.beginPath(); ctx.roundRect(X - 4, Y - 4, W + 8, H + 8, 6); ctx.fill();
        ctx.fillStyle = "#3b82f6"; ctx.fillRect(X, Y, sx - X, H);
        ctx.fillStyle = "#ef4444"; ctx.fillRect(sx, Y, X + W - sx, H);
        if (Math.abs(lx - sx) > 0.5) { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(Math.min(lx, sx), Y, Math.abs(lx - sx), H); }
        if (b.hurt > 0) { ctx.fillStyle = `rgba(255,255,255,${b.hurt * 0.5})`; b.side === "b" ? ctx.fillRect(X, Y, sx - X, H) : ctx.fillRect(sx, Y, X + W - sx, H); }
        ctx.fillStyle = "#fff"; ctx.fillRect(sx - 1.5, Y - 4, 3, H + 8);
        if (w.pct) {
          label(ctx, Math.round(w.show * 100) + "%", X + 8, Y + H / 2 + 1, 13, "#fff", "left");
          label(ctx, Math.round((1 - w.show) * 100) + "%", X + W - 8, Y + H / 2 + 1, 13, "#fff", "right");
        }
      },
      steps: [
        {
          id: "ease", name: { en: "Slide, Don't Jump", ko: "미끄러지게" }, param: "lerp 5/s",
          cap: { en: "The seam *slides* to its new spot.", ko: "경계선이 *스르륵* 미끄러져요." },
          update(w, dt) { w.show += (w.val - w.show) * Math.min(1, dt * 5); },
        },
        {
          id: "lag", name: { en: "Loss Trail", ko: "잃은 만큼 흔적" }, param: "white · 0.3s delay",
          cap: { en: "Leave a *white trail* of what was just lost.", ko: "방금 잃은 만큼 *하얀 흔적*이 남아요." },
          swing(w) { w.lagWait = 0.3; },
          update(w, dt) { if ((w.lagWait -= dt) < 0) w.lag += (w.show - w.lag) * Math.min(1, dt * 3); },
        },
        {
          id: "seam", name: { en: "Seam Sparks", ko: "경계 불꽃" }, param: "8 sparks · push dir",
          cap: { en: "*Sparks fly* from the seam, the way it's pushed.", ko: "밀리는 쪽으로 경계에서 *불꽃*이 튀어요." },
          swing(w, d) {
            const x = 70 + 400 * w.val;
            for (let i = 0; i < 8; i++) w.spawn({ type: "spark", x, y: 59, vx: Math.sign(d) * rand(150, 420), vy: rand(-200, 200), drag: 5, life: rand(0.2, 0.4), size: 2.4, color: "255,240,200" });
            w.spawn({ type: "glow", x, y: 59, size: 34, size1: 8, life: 0.3, color: "255,240,200" });
          },
        },
        {
          id: "shake", name: { en: "Losing Side Flash", ko: "밀린 쪽 번쩍" }, param: "big swing → shake",
          cap: { en: "Flash the *losing side*. Shake on *big swings*.", ko: "*밀린 쪽*이 번쩍. *크게* 밀리면 흔들려요." },
          swing(w, d) { w.bar.side = d > 0 ? "r" : "b"; w.bar.hurt = 1; if (Math.abs(d) > 0.12) { w.bar.shake = 0.3; w.shake(0.12); } },
        },
        {
          id: "pct", name: { en: "Percents", ko: "퍼센트" }, param: "both ends",
          cap: { en: "Print the *numbers* at both ends.", ko: "양 끝에 *숫자*를 붙여요." },
          update(w) { w.pct = true; },
        },
        {
          id: "crowd", name: { en: "Army Follows", ko: "군대도 밀림" }, param: "±150px with seam",
          cap: { en: "The *armies move with the bar*. Bar and field agree.", ko: "*군대도 게이지 따라* 밀려요. 화면이 하나로." },
          update(w) { w.follow = true; },
          swing(w, d) { for (const u of w.U) if ((u.team === "b") === (d < 0)) u.flash = 0.6; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "up = chime · down = thud",
          cap: { en: "Gaining *chimes*, losing *thuds*.", ko: "밀어붙이면 *띵*, 밀리면 *쿵*." },
          swing(w, d) { if (d > 0) w.sfx.chime(Math.round(w.val * 12)); else w.sfx.thunk(); },
        },
      ],
    },

    // 25 ─ 전장의 안개
    {
      id: "army-fog", cat: "army", view: "top",
      title: { en: "Reveal fog of war *with drama*", ko: "전장의 안개를 *극적으로* 걷기" },
      intro: { en: "Holes punched in black paper.", ko: "검은 종이에 *구멍* 뚫는 느낌." },
      interval: 0.9, stepDur: 4.0,
      drawFloor: grass,
      setup(w) {
        ensure(); w.U = [];
        w.scout = U(w, "b", 70, 290, { top: true, h: 28 });
        w.foes = [[200, 110], [230, 140], [350, 260], [380, 235], [450, 90], [470, 120]].map(([x, y]) => U(w, "r", x, y, { top: true, h: 26, face: rand(0, TAU) }));
        w.WP = [[160, 230], [230, 200], [300, 170], [370, 180], [430, 140], [470, 80]];
        w.mask = document.createElement("canvas"); w.mask.width = 540; w.mask.height = 360;
        w.tmp = document.createElement("canvas"); w.tmp.width = 540; w.tmp.height = 360;
        w.k = 0; fogReset(w);
      },
      fire(w) {
        if (w.k >= w.WP.length) { w.k = 0; fogReset(w); }
        const [x, y] = w.WP[w.k++], s = w.scout;
        restart(w, [s]);
        s.face = Math.atan2(y - s.y, x - s.x);
        w.tween(s, { x, y }, 0.45, "inout", () => { reveal(w, s.x, s.y, 70); w.emit("arrive", s); });
      },
      update(w, dt) {
        uStep(w, dt);
        const s = w.scout;
        if (s.lx == null || Math.hypot(s.x - s.lx, s.y - s.ly) > 8) { reveal(w, s.x, s.y, 56); s.lx = s.x; s.ly = s.y; }
        for (const e of w.foes) if (!e.seen && Math.hypot(e.x - s.x, e.y - s.y) < 74) { e.seen = true; w.emit("spot", e); }
        w.memory = false; w.clouds = false; w.soft = false;
      },
      drawBack(w, ctx) { drawUnits(w, ctx); },
      drawFront(w, ctx) {
        const s = w.scout;
        if (w.memory) {
          const g = ctx.createRadialGradient(s.x, s.y, 60, s.x, s.y, 90);
          g.addColorStop(0, "rgba(8,10,16,0)"); g.addColorStop(1, "rgba(8,10,16,0.55)");
          ctx.fillStyle = g; ctx.fillRect(14, 14, 512, 332);
        }
        if (w.clouds) {
          const t = w.tmp.getContext("2d"), cl = SPR["army-cloud"] || fogClouds();
          t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, 540, 360);
          const ox = (w.time * 14) % 540;
          t.drawImage(cl.c, ox - 540, 0); t.drawImage(cl.c, ox, 0);
          t.globalCompositeOperation = "destination-in"; t.drawImage(w.mask, 0, 0);
          ctx.drawImage(w.tmp, 0, 0);
        } else ctx.drawImage(w.mask, 0, 0);
        drawFX(w, ctx, false);
      },
      steps: [
        {
          id: "soft", name: { en: "Soft Edge", ko: "부드러운 경계" }, param: "radial falloff",
          cap: { en: "*Feather* the edge. Fog should fade, not cut.", ko: "경계를 *부드럽게*. 안개는 잘리면 안 돼요." },
          update(w) { w.soft = true; },
        },
        {
          id: "memory", name: { en: "Seen vs Visible", ko: "본 곳 vs 보이는 곳" }, param: "veil 55% outside",
          cap: { en: "Places you've *seen* stay dim. Only *now* is clear.", ko: "*본 곳*은 어둡게, *지금 보는 곳*만 선명하게." },
          update(w) { w.memory = true; },
        },
        {
          id: "pulse", name: { en: "Reveal Pulse", ko: "걷히는 고리" }, param: "ring 20 → 90px",
          cap: { en: "A *ring pushes the fog* back when you arrive.", ko: "도착하면 *고리가 안개를 밀어내요*." },
          arrive(w, s) { w.spawn({ type: "ring", x: s.x, y: s.y, size: 20, size1: 90, life: 0.5, w: 5, color: "191,219,254" }); },
        },
        {
          id: "spot", name: { en: "Spotted!", ko: "발견!" }, param: "flash · “!” · ring",
          cap: { en: "Enemies found get a *flash and a “!”*.", ko: "찾은 적엔 *번쩍*하고 *“!”*." },
          spot(w, e) {
            e.flash = 1.5; e.sx = e.sy = 1.4;
            w.spawn({ type: "ring", x: e.x, y: e.y, size: 8, size1: 34, life: 0.4, w: 3, color: "248,113,113" });
            w.spawn({ type: "text", text: "!", x: e.x, y: e.y - 24, vy: -30, life: 1.4, size: 22, color: "#f87171", hold: true });
          },
        },
        {
          id: "clouds", name: { en: "Drifting Clouds", ko: "흐르는 구름" }, param: "texture 14px/s",
          cap: { en: "Give the fog a *slow-moving texture*.", ko: "안개에 *천천히 흐르는 결*을 줘요." },
          update(w) { w.clouds = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh · ping",
          cap: { en: "A soft *whoosh* to reveal, a *ping* when spotted.", ko: "걷힐 때 *쉬익*, 발견하면 *핑*." },
          arrive(w) { w.sfx.swish(); },
          spot(w) { w.sfx.blip(8); },
        },
      ],
    },
  );
})();

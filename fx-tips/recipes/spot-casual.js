"use strict";
/* 캐주얼 게임 쇼케이스: 플레이 버튼, 특수 보석 조합, 퍼펙트 착지, 카운트다운, 슬롯 잭팟, 승리 화면, 최고 기록, 줄 지우기, 버블 연쇄 */
(() => {
  /* ───── 공통 도우미 ───── */
  const backdrop = (ctx, cx, cy, inner, outer, r = 360) => {
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(-80, -80, 700, 520);
  };
  const CONF = ["255,90,120", "255,210,70", "90,220,255", "140,255,140", "200,130,255", "255,255,255"];
  const confetti = (w, x, y, n, a0 = -2.7, a1 = -0.45, sp = [260, 640]) => {
    for (let i = 0; i < n; i++) {
      const a = rand(a0, a1), s = rand(sp[0], sp[1]);
      w.spawn({ type: "chunk", x: x + rand(-24, 24), y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 650, drag: 2.4, vr: rand(-16, 16),
        size: rand(4, 7), life: rand(1.5, 2.3), hold: true, color: pick(CONF) });
    }
  };
  const starBurst = (w, x, y, n, cols, sp = [180, 440]) => {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(sp[0], sp[1]);
      w.spawn({ type: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.6, g: 220, size: rand(6, 11), life: rand(0.8, 1.4), color: pick(cols) });
    }
  };
  // sx, sy 를 1로 되돌리는 출렁 스프링
  const wobble = (o, dt) => {
    o.vsx = (o.vsx || 0) + ((1 - o.sx) * 380 - o.vsx * 12) * dt; o.sx += o.vsx * dt;
    o.vsy = (o.vsy || 0) + ((1 - o.sy) * 380 - o.vsy * 12) * dt; o.sy += o.vsy * dt;
  };

  /* ───── 1. 플레이 버튼 ───── */
  function drawPlay(w, ctx, b) {
    const W = 236, H = 86, T = b.thick, sink = b.down * b.sink;
    ctx.save();
    ctx.translate(b.x, b.y + H / 2 + T / 2);
    ctx.fillStyle = "rgba(0,0,0,0.42)"; ctx.beginPath(); ctx.ellipse(0, 10, W * 0.52, 13, 0, 0, TAU); ctx.fill();
    ctx.scale(b.sx, b.sy);
    if (T) {
      rr(ctx, -W / 2, -H, W, H, H / 2, "#2f5606");
      rr(ctx, -W / 2, -H - 4, W, H, H / 2, "#4f8a0c");
    }
    const fy = -H - T + sink;
    const g = ctx.createLinearGradient(0, fy, 0, fy + H);
    g.addColorStop(0, "#e2ff6a"); g.addColorStop(1, "#8fcc14");
    rr(ctx, -W / 2, fy, W, H, H / 2, T ? g : b.down ? "#7fae18" : "#a9dc2a");
    if (T) { ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.roundRect(-W / 2 + 30, fy + 9, W - 60, 13, 7); ctx.fill(); }
    ctx.fillStyle = "#1c3300";
    ctx.beginPath(); ctx.moveTo(-70, fy + H / 2 - 17); ctx.lineTo(-40, fy + H / 2); ctx.lineTo(-70, fy + H / 2 + 17); ctx.closePath(); ctx.fill();
    label(ctx, "PLAY", 18, fy + H / 2 + 2, 42, "#1c3300");
    if (b.shine > 0 && b.shine < 1) {
      ctx.save(); ctx.beginPath(); ctx.roundRect(-W / 2, fy, W, H, H / 2); ctx.clip();
      const sx = -W / 2 - 80 + b.shine * (W + 160);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.moveTo(sx, fy); ctx.lineTo(sx + 34, fy); ctx.lineTo(sx + 4, fy + H); ctx.lineTo(sx - 30, fy + H); ctx.fill();
      ctx.restore();
    }
    if (b.flash > 0) { ctx.globalAlpha = Math.min(1, b.flash); rr(ctx, -W / 2, fy, W, H, H / 2, "#ffffff"); ctx.globalAlpha = 1; }
    ctx.restore();
  }

  /* ───── 2. 특수 보석 조합 ───── */
  const GC = 7, GR = 6, GS = 36, GX = 270 - (GC - 1) * GS / 2, GY = 86;
  const newBoard = B => {
    B.cells = [];
    for (let r = 0; r < GR; r++) {
      B.cells.push([]);
      for (let c = 0; c < GC; c++) B.cells[r].push({ c: (Math.random() * 5) | 0, sp: 0, gone: false, s: 1, dx: 0, dy: 0, glow: 0 });
    }
    Object.assign(B.cells[2][3], { c: 1, sp: 1 });
    Object.assign(B.cells[3][3], { c: 4, sp: 2 });
    B.arc = 0; B.wave = 0;
  };
  function drawCell(w, ctx, cell, x, y) {
    if (cell.gone) return;
    const r = 14 * cell.s;
    if (cell.sp) glow(ctx, x, y, 26 + Math.sin(w.time * 10) * 3 + cell.glow * 20, cell.sp === 1 ? "120,210,255" : "230,150,255", 0.55 + cell.glow * 0.4);
    if (cell.sp === 2) {
      ctx.fillStyle = "#2b1840"; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill();
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + w.time * 3; ctx.fillStyle = `rgb(${GEM_COL[i]})`; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.26, 0, TAU); ctx.fill(); }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, r * 0.25, 0, TAU); ctx.fill();
      return;
    }
    drawGem(ctx, cell.c, x, y, r);
    if (cell.sp === 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
      for (const k of [-5, 1, 7]) { ctx.beginPath(); ctx.moveTo(x - r * 0.7, y + k - 1); ctx.lineTo(x + r * 0.7, y + k - 1); ctx.stroke(); }
    }
  }
  const flyGem = (ctx, p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); drawGem(ctx, p.c, 0, 0, 15); ctx.restore(); };

  /* ───── 3. 퍼펙트 쌓기 ───── */
  const SLAB_COL = [[255, 122, 140], [255, 170, 92], [255, 222, 96], [124, 222, 160], [110, 190, 255], [180, 142, 255]];
  function drawSlab(ctx, x, yb, wid, h, col, fl) {
    const d = 12, x0 = x - wid / 2, x1 = x + wid / 2, yt = yb - h;
    ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(20,10,30,0.35)"; ctx.lineWidth = 1.2;
    ctx.fillStyle = mixc(col, [30, 20, 40], 0.55);
    ctx.beginPath(); ctx.moveTo(x1, yt); ctx.lineTo(x1 + d, yt - d * 0.8); ctx.lineTo(x1 + d, yb - d * 0.8); ctx.lineTo(x1, yb); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mixc(col, [30, 20, 40], 1);
    ctx.beginPath(); ctx.moveTo(x0, yt); ctx.lineTo(x0 + d, yt - d * 0.8); ctx.lineTo(x1 + d, yt - d * 0.8); ctx.lineTo(x1, yt); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mixc(col, [30, 20, 40], 0.8);
    ctx.fillRect(x0, yt, wid, h); ctx.strokeRect(x0, yt, wid, h);
    if (fl > 0) {
      ctx.globalAlpha = Math.min(1, fl); ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(x0, yt); ctx.lineTo(x0 + d, yt - d * 0.8); ctx.lineTo(x1 + d, yt - d * 0.8); ctx.lineTo(x1 + d, yb - d * 0.8); ctx.lineTo(x1, yb); ctx.lineTo(x0, yb); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  const stackTop = st => st.slabs.reduce((y, s) => y - 24 * (1 - s.sq * 0.4), 300);

  /* ───── 4. 카운트다운 ───── */
  const CD_COL = ["#ff5a6e", "#ffa340", "#ffe14a", "#c6f432"], CD_DARK = ["#7a1424", "#8a420a", "#8a6400", "#3f6a00"];
  const CD_RGB = ["255,90,110", "255,163,64", "255,225,74", "198,244,50"];
  function drawCount(ctx, c, txt, s, alpha) {
    if (!txt || s <= 0 || alpha <= 0) return;
    const size = txt.length > 1 ? 112 : 160, col = c.depth ? CD_COL[c.i] : "#e8e8ee";
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(270, 186); ctx.rotate(c.rot); ctx.scale(s, s);
    ctx.font = `900 ${size}px Pretendard, "Apple SD Gothic Neo", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (let k = c.depth; k > 0; k -= 2) { ctx.fillStyle = CD_DARK[c.i]; ctx.fillText(txt, k * 0.5, k); }
    ctx.lineWidth = 10; ctx.strokeStyle = "rgba(8,10,16,0.9)"; ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = col; ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  /* ───── 5. 슬롯 잭팟 ───── */
  const STRIP = [0, 1, 2, 3, 4, 1, 3, 2, 4, 1]; // 0 = 7
  const SYH = 58, RX = [192, 270, 348], RCY = 180;
  function drawSym(ctx, k, x, y, s) {
    if (k === 0) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.font = "900 50px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = "#5a0010"; ctx.strokeText("7", 0, 2);
      ctx.fillStyle = "#ff3b4e"; ctx.fillText("7", 0, 2); ctx.restore();
    } else if (k === 1) { ctx.fillStyle = "#ffc21a"; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = (i % 2 ? 9 : 21) * s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.fill(); }
    else if (k === 2) drawGem(ctx, 1, x, y, 19 * s);
    else if (k === 3) ctx.drawImage(SPR.heart.c, x - 20 * s, y - 18 * s, 40 * s, 37 * s);
    else ctx.drawImage(SPR.coin.c, x - 19 * s, y - 19 * s, 38 * s, 38 * s);
  }
  const BULBS = (() => {
    const out = [];
    for (let x = 152; x <= 388; x += 21.5) out.push([x, 72]);
    for (let y = 94; y <= 284; y += 21) out.push([388, y]);
    for (let y = 284; y >= 94; y -= 21) out.push([152, y]);
    return out;
  })();
  function drawSlot(w, ctx, m) {
    // 옆면(두께)과 몸통
    ctx.fillStyle = "#4a0a14"; ctx.beginPath(); ctx.moveTo(400, 66); ctx.lineTo(418, 56); ctx.lineTo(418, 290); ctx.lineTo(400, 302); ctx.fill();
    const g = ctx.createLinearGradient(0, 60, 0, 302); g.addColorStop(0, "#e83a4a"); g.addColorStop(1, "#7a0e1c");
    rr(ctx, 140, 60, 260, 242, 22, g);
    rr(ctx, 196, 40, 148, 34, 10, "#ffcf4a", "#8a5a00", 3);
    label(ctx, "BONUS", 270, 58, 22, "#6a2a00");
    // 손잡이
    const la = -1.2 + m.lever * 2.2, lx = 424 + Math.cos(la) * 66, ly = 170 + Math.sin(la) * 66;
    ctx.strokeStyle = "#c8ccd8"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(424, 170); ctx.lineTo(lx, ly); ctx.stroke();
    rr(ctx, 414, 160, 14, 22, 5, "#555c6c");
    seg(ctx, lx, ly, 12, 12, ["#ff9aa4", "#e8233a", "#6a0010"]);
    // 릴 창
    rr(ctx, 150, 96, 240, 168, 12, "#1a0a10");
    m.reels.forEach((r, k) => {
      const x = RX[k];
      ctx.save(); ctx.beginPath(); ctx.roundRect(x - 36, RCY - 78, 72, 156, 8); ctx.clip();
      ctx.fillStyle = "#fff6e6"; ctx.fillRect(x - 36, RCY - 78, 72, 156);
      const base = Math.floor(r.pos);
      for (let j = base - 2; j <= base + 2; j++) {
        const y = RCY + (r.pos - j) * SYH, sym = STRIP[((j % 10) + 10) % 10];
        const pul = sym === 0 && j === Math.round(r.pos) ? 1 + r.pulse * 0.3 * Math.abs(Math.sin(w.time * 9)) : 1;
        ctx.save(); ctx.translate(x, y); if (r.spin) ctx.scale(1, 1.5);
        drawSym(ctx, sym, 0, 0, pul); ctx.restore();
      }
      const sh = ctx.createLinearGradient(0, RCY - 78, 0, RCY + 78);
      sh.addColorStop(0, "rgba(40,10,20,0.75)"); sh.addColorStop(0.3, "rgba(40,10,20,0)"); sh.addColorStop(0.7, "rgba(40,10,20,0)"); sh.addColorStop(1, "rgba(40,10,20,0.75)");
      ctx.fillStyle = sh; ctx.fillRect(x - 36, RCY - 78, 72, 156);
      if (r.fl > 0) { ctx.fillStyle = `rgba(255,255,255,${r.fl * 0.8})`; ctx.fillRect(x - 36, RCY - 78, 72, 156); }
      ctx.restore();
    });
    ctx.strokeStyle = m.chase ? `rgba(255,240,120,${0.6 + 0.4 * Math.sin(w.time * 20)})` : "rgba(255,80,90,0.7)"; ctx.lineWidth = m.chase ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(152, RCY); ctx.lineTo(388, RCY); ctx.stroke();
    // 전구
    const step = Math.floor(w.time * 14);
    BULBS.forEach(([x, y], i) => {
      const lit = m.chase ? (i + step) % 4 < 2 : i % 2 === 0;
      if (lit && m.chase) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, 16, "255,220,120", 0.8); ctx.globalCompositeOperation = "source-over"; }
      ctx.fillStyle = lit ? (m.chase ? "#fff6c0" : "#d8a050") : "#6a3a20"; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    });
    // 크레딧 창
    rr(ctx, 206, 270, 128, 24, 6, "#140608");
    label(ctx, m.credit ? `WIN ${m.credit}` : "- - -", 270, 283, 16, m.credit ? "#ffd84a" : "#7a4a40");
  }

  /* ───── 6. 승리 화면 ───── */
  const part = (p, light, dark) => Object.assign(p, { light, dark });
  const trophyArt = () => polySprite("spot-casual-trophy", () => {
    const gold = [[255, 224, 120], [130, 66, 8]], dk = [[110, 90, 150], [24, 16, 40]];
    return [
      part(blk(0, 0, 0, 84, 18, 50, 0.9), ...dk),
      part(blk(0, 18, 0, 58, 14, 36, 0.85), ...gold),
      part(blk(0, 32, 0, 16, 34, 16, 0.8), ...gold),
      part(blk(0, 66, 0, 40, 58, 40, 1.8), ...gold),
      part(blk(-50, 80, 0, 10, 40, 10), ...gold), part(blk(50, 80, 0, 10, 40, 10), ...gold),
      part(blk(-38, 80, 0, 26, 8, 8), ...gold), part(blk(38, 80, 0, 26, 8, 8), ...gold),
      part(blk(-42, 112, 0, 18, 8, 8), ...gold), part(blk(42, 112, 0, 18, 8, 8), ...gold),
      part(pyr([[-8, 124, -8], [8, 124, -8], [8, 124, 8], [-8, 124, 8]], [0, 146, 0]), [255, 140, 160], [120, 10, 40]),
    ];
  }, 150, 170, 0.5, 0.25);
  function drawBanner(ctx, v) {
    if (v.ban <= 0) return;
    ctx.save(); ctx.translate(270, 92);
    if (v.ban > 0.8) {
      ctx.globalAlpha = Math.min(1, (v.ban - 0.8) * 5);
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#8a1626";
        ctx.beginPath(); ctx.moveTo(s * 128, -10); ctx.lineTo(s * 178, -10); ctx.lineTo(s * 162, 12); ctx.lineTo(s * 178, 34); ctx.lineTo(s * 128, 34); ctx.fill();
        ctx.fillStyle = "#4a0812"; ctx.beginPath(); ctx.moveTo(s * 128, 24); ctx.lineTo(s * 142, 34); ctx.lineTo(s * 128, 34); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.scale(v.ban, 1);
    const g = ctx.createLinearGradient(0, -26, 0, 26); g.addColorStop(0, "#ff5a6a"); g.addColorStop(1, "#b81830");
    ctx.fillStyle = g; ctx.fillRect(-142, -26, 284, 52);
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-142, -22, 284, 5);
    ctx.font = "900 36px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = "#5a0614"; ctx.strokeText("VICTORY", 0, 2);
    ctx.fillStyle = "#fff6d8"; ctx.fillText("VICTORY", 0, 2);
    ctx.restore();
  }
  const firework = (w, x, y, col, delay) => w.after(delay, () => {
    w.spawn({ type: "spark", x, y: 330, vx: 0, vy: -(330 - y) / 0.26, life: 0.26, size: 3, color: "255,240,200" });
    w.after(0.26, () => {
      w.spawn({ type: "glow", x, y, size: 20, size1: 70, life: 0.5, color: col });
      for (let i = 0; i < 34; i++) {
        const a = i / 34 * TAU, s = rand(220, 290);
        w.spawn({ type: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 1.8, g: 160, size: 2.8, life: rand(0.9, 1.3), color: col });
      }
    });
  });

  /* ───── 7. 최고 기록 ───── */
  const HS_FROM = 7600, HS_TO = 9150, HS_BEST = 8420;
  const fmtNum = n => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  function drawScore(w, ctx, h) {
    const v = h.val, DW = 46, DH = 70, cy = 176, n = 4, totalW = n * DW + 16;
    const col = h.heat > 0 ? mixc([255, 214, 80], [255, 255, 255], Math.min(1, h.heat)) : "#f2f2f6";
    ctx.save(); ctx.translate(270, cy); ctx.scale(h.sx, h.sy);
    ctx.font = "900 68px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(10,4,10,0.9)";
    let x = -totalW / 2 + DW / 2;
    for (let p = n - 1; p >= 0; p--) {
      const q = v / Math.pow(10, p), d = Math.floor(q) % 10;
      let fr = 0;
      if (h.roll) fr = p === 0 ? q % 1 : Math.max(0, ((v % Math.pow(10, p)) / Math.pow(10, p) - 0.85) / 0.15);
      ctx.save(); ctx.beginPath(); ctx.rect(x - DW / 2, -DH / 2, DW, DH); ctx.clip();
      for (const [dd, oy] of [[d, -fr * DH], [(d + 1) % 10, (1 - fr) * DH]]) {
        if (oy >= DH) continue;
        ctx.strokeText(dd, x, oy + 3); ctx.fillStyle = col; ctx.fillText(dd, x, oy + 3);
      }
      ctx.restore();
      x += DW;
      if (p === 3) { ctx.strokeText(",", x - 10, 12); ctx.fillStyle = col; ctx.fillText(",", x - 10, 12); x += 16; }
    }
    ctx.restore();
  }
  function drawStamp(ctx, h) {
    if (h.stamp <= 0) return;
    ctx.save(); ctx.translate(270, 252); ctx.rotate(-0.12); ctx.scale(h.stamp, h.stamp);
    ctx.strokeStyle = "#ff4a6a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-112, -22, 224, 44, 8); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-104, -16, 208, 32, 5); ctx.stroke();
    label(ctx, "NEW RECORD!", 0, 2, 26, "#ff4a6a", "center", "Pretendard, sans-serif", 900);
    ctx.restore();
  }

  /* ───── 8. 줄 지우기 ───── */
  // single-hue lime/teal palette + merged irregular clusters (generic block puzzle, not the classic look)
  const LCOL = ["206,246,92", "160,214,72", "112,186,96", "70,160,128", "52,128,116"];
  const PIECE = 5; LCOL[PIECE] = "236,255,150";
  const LW = 10, LH = 12, LC = 20, LX = 270 - LW * LC / 2, LY = 48, GAP = 7;
  const PCELLS = [[0, 0], [1, 0], [2, 0], [3, 0], [-1, 1]]; // irregular 5-cell piece
  // one tile; seams only where the neighbor belongs to another cluster
  function drawTile(ctx, x, y, col, same) {
    const rgb = col.split(",").map(Number), [t, rt, b, l] = same;
    ctx.fillStyle = `rgb(${col})`; ctx.fillRect(x, y, LC, LC);
    ctx.fillStyle = mixc([255, 255, 255], rgb, 0.5);
    if (!t) ctx.fillRect(x + 1, y + 1, LC - 2, 3);
    if (!l) ctx.fillRect(x + 1, y + 1, 3, LC - 2);
    ctx.fillStyle = mixc(rgb, [6, 20, 16], 0.6);
    if (!b) ctx.fillRect(x + 1, y + LC - 4, LC - 2, 3);
    if (!rt) ctx.fillRect(x + LC - 4, y + 1, 3, LC - 2);
    ctx.fillStyle = "rgba(4,14,10,0.9)";
    if (!t) ctx.fillRect(x, y, LC, 1); if (!b) ctx.fillRect(x, y + LC - 1, LC, 1);
    if (!l) ctx.fillRect(x, y, 1, LC); if (!rt) ctx.fillRect(x + LC - 1, y, 1, LC);
  }
  const newWell = L => {
    L.grid = [];
    for (let r = 0; r < LH; r++) L.grid.push(new Array(LW).fill(-1));
    const tops = [6, 5, 7, 6, 4, 7, 6, 12, 8, 5], s = (Math.random() * 9) | 0;
    // blobby cluster ids: cells share a shade in uneven 2–4 cell patches
    for (let c = 0; c < LW; c++) for (let r = tops[c]; r < LH; r++) if (c !== GAP)
      L.grid[r][c] = (Math.floor((c + s + ((r >> 1) & 1) * 2) / 3) * 2 + Math.floor((r + ((c * 5 + s) % 3)) / 3)) % 5;
    Object.assign(L, { piece: { y: 1 }, hard: false, delay: 0, fall: 0, flash: 0, off: 0, clearing: false });
  };

  /* ───── 9. 버블 연쇄 ───── */
  const BCOL = [[255, 90, 150], [80, 180, 255], [110, 220, 110], [255, 205, 70], [180, 120, 255]];
  const BR = 16, BX0 = 134, BY0 = 64, BCOLS = 9;
  const bpos = (r, c) => [BX0 + c * 32 + (r % 2) * 16, BY0 + r * 28];
  const bubble = (ctx, k, x, y, r) => seg(ctx, x, y, r, r, [mixc([255, 255, 255], BCOL[k], 0.55), `rgb(${BCOL[k]})`, mixc(BCOL[k], [30, 10, 50], 0.45)]);
  const bnbrs = (r, c) => (r % 2
    ? [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]]
    : [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]]);
  const newBubbles = B => {
    B.g = [];
    for (let r = 0; r < 7; r++) { B.g.push([]); for (let c = 0; c < BCOLS - (r % 2); c++) B.g[r].push(r < 3 ? { k: 1 + ((Math.random() * 4) | 0), s: 1 } : null); }
    const put = (r, c, k) => (B.g[r][c] = { k, s: 1 });
    for (let c = 0; c < 8; c++) put(3, c, c >= 2 && c <= 6 ? 0 : 1 + ((Math.random() * 4) | 0));
    [2, 3, 4, 5].forEach(c => put(4, c, 0));
    put(4, 1, 2); put(4, 6, 3); put(4, 7, 1);
    put(5, 2, 1); put(5, 3, 3); put(5, 4, 2); put(5, 6, 4);
    Object.assign(B, { gap: 0, shot: null, tally: null });
  };
  const flyBubble = (ctx, p) => bubble(ctx, p.k, p.x, p.y, BR);

  RECIPES.push(
    /* ───────── 1. 플레이 버튼 ───────── */
    {
      id: "spot-casual-play-button", cat: "ui", view: "ui",
      title: { en: "Make the PLAY button feel *juicy*", ko: "플레이 버튼을 *쫀득하게*" },
      intro: { en: "Tap PLAY. It moves *two pixels*.", ko: "눌러도 *2픽셀* 움직이고 끝이에요." },
      interval: 2.4, stepDur: 3.6,
      setup(w) {
        w.btn = { x: 270, y: 186, down: 0, thick: 0, sink: 2, sx: 1, sy: 1, vsx: 0, vsy: 0, flash: 0, shine: 0 };
      },
      fire(w) {
        const b = w.btn;
        Object.assign(b, { down: 0, thick: 0, sink: 2, sx: 1, sy: 1, vsx: 0, vsy: 0, flash: 0, shine: 0 });
        w.after(0.3, () => {
          w.spawn({ type: "ring", x: b.x + 52, y: b.y - 4, size: 6, size1: 24, life: 0.3, w: 3, color: "230,230,240" });
          b.down = 1; w.emit("press", b);
        });
        w.after(0.5, () => { b.down = 0; w.emit("release", b); });
      },
      update(w, dt) {
        const b = w.btn;
        wobble(b, dt);
        b.flash = Math.max(0, b.flash - dt * 4);
      },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 170, "#23306e", "#070a1c");
        ctx.fillStyle = "rgba(120,150,255,0.10)"; ctx.beginPath(); ctx.ellipse(270, 244, 200, 30, 0, 0, TAU); ctx.fill();
      },
      drawFront(w, ctx) { drawPlay(w, ctx, w.btn); },
      steps: [
        {
          id: "depth", name: { en: "3D Thickness", ko: "입체 두께" }, param: "side 16px · sink 13",
          cap: { en: "Give it *thickness*. Press it *into* the base.", ko: "*두께*를 주고, 누르면 *쑥* 들어가요." },
          update(w) { w.btn.thick = 16; },
          press(w, b) { b.sink = 13; },
        },
        {
          id: "squash", name: { en: "Squish & Spring", ko: "말랑 탄성" }, param: "×1.12 / ×0.8",
          cap: { en: "*Squish* on press, *spring* back on release.", ko: "누르면 *납작*, 떼면 *통* 튀어요." },
          press(w, b) { b.sx = 1.12; b.sy = 0.8; },
          release(w, b) { b.sx = 0.9; b.sy = 1.2; },
        },
        {
          id: "ripple", name: { en: "Flash Ripple", ko: "번쩍 물결" }, param: "white · rings 2",
          cap: { en: "Flash it *white*. Push *rings* out.", ko: "*하얗게* 번쩍, *고리*가 퍼져요." },
          release(w, b) {
            b.flash = 1;
            w.spawn({ type: "ring", x: b.x, y: b.y, size: 70, size1: 230, life: 0.5, w: 10, color: "220,255,140" });
            w.spawn({ type: "ring", x: b.x, y: b.y, size: 50, size1: 170, life: 0.4, w: 6, color: "255,255,255" });
          },
        },
        {
          id: "shine", name: { en: "Shine & Rays", ko: "광택과 빛줄기" }, param: "sweep .45s · rays 16",
          cap: { en: "Sweep a *shine* across. Rays *behind*.", ko: "*반짝* 광택이 지나가고, 뒤로 *빛줄기*." },
          release(w, b) {
            w.tween(b, { shine: 1 }, 0.45, "out");
            w.spawn({ type: "rays", under: true, x: b.x, y: b.y, n: 16, size: 90, size1: 300, vr: 0.6, life: 1.8, hold: true, color: "200,255,110" });
            w.spawn({ type: "glow", under: true, x: b.x, y: b.y, size: 80, size1: 170, life: 1.4, color: "150,230,60" });
          },
        },
        {
          id: "confetti", name: { en: "Confetti Pop", ko: "꽃가루 팡" }, param: "60 bits · 12 stars",
          cap: { en: "Throw *confetti*. Shout *LET'S GO*.", ko: "*꽃가루*를 뿌리고, *출발*을 외쳐요." },
          release(w, b) {
            confetti(w, b.x, b.y - 40, 60);
            starBurst(w, b.x, b.y, 12, ["255,240,120", "255,255,255"]);
            w.spawn({ type: "text", x: b.x, y: 82, text: "LET'S GO!", size: 32, color: "#e2ff6a", life: 1.6 });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "click + pop + chime",
          cap: { en: "Low *click* down, bright *pop* up.", ko: "누를 땐 *딸깍*, 뗄 땐 *뽁*, *띵*." },
          press(w) { w.sfx.clickDown(); },
          // 뗄 때 딸깍은 항상, 뽁은 튕길 때만, 반짝 화음은 꽃가루가 터질 때만
          release(w) { w.sfx.clickUp(); if (w.on("squash")) w.sfx.pop(); if (w.on("confetti")) w.sfx.sparkle(); },
        },
      ],
    },

    /* ───────── 2. 특수 보석 조합 ───────── */
    {
      id: "spot-casual-gem-combo", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make special gem combos *detonate*", ko: "특수 보석 조합을 *대폭발*로" },
      intro: { en: "Two specials meet. Gems just *disappear*.", ko: "특수 보석 둘이 만났는데 그냥 *사라져요*." },
      interval: 2.8, stepDur: 4.0,
      setup(w) { w.gb = {}; newBoard(w.gb); },
      fire(w) {
        const B = w.gb; newBoard(B);
        const a = B.cells[2][3], b = B.cells[3][3], s = { dur: 0, arc: 0 };
        const blast = () => {
          const cx = GX + 3 * GS, cy = GY + 3 * GS;
          w.emit("boom", B, cx, cy);
          for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
            if (Math.abs(r - 3) > 1 && Math.abs(c - 3) > 1) continue;
            const cell = B.cells[r][c], d = Math.hypot(r - 3, c - 3);
            w.after(d * B.wave, () => { cell.gone = true; w.emit("pop", cell, GX + c * GS + cell.dx, GY + r * GS + cell.dy); });
          }
          w.after(1.3, () => {
            for (const row of B.cells) for (const cell of row) if (cell.gone) {
              Object.assign(cell, { gone: false, sp: 0, c: (Math.random() * 5) | 0, s: 0, dx: 0, dy: 0 });
              w.tween(cell, { s: 1 }, 0.2, "back");
            }
          });
        };
        w.after(0.3, () => {
          w.emit("swap", s, a, b);
          B.arc = s.arc;
          if (s.dur) { w.tween(a, { dy: GS }, s.dur, "inout"); w.tween(b, { dy: -GS }, s.dur, "inout", blast); }
          else { a.dy = GS; b.dy = -GS; w.after(0.15, blast); }
        });
      },
      update(w, dt) {
        for (const row of w.gb.cells) for (const cell of row) cell.glow = Math.max(0, cell.glow - dt * 2);
      },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 180, "#4a1658", "#11051a");
        const x0 = GX - GS / 2 - 8, y0 = GY - GS / 2 - 8, W = GC * GS + 16, H = GR * GS + 16;
        rr(ctx, x0 + 6, y0 + 10, W, H, 16, "rgba(0,0,0,0.4)");
        rr(ctx, x0, y0, W, H, 16, "#2a1236", "rgba(230,160,255,0.35)", 3);
        for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) if ((r + c) % 2) {
          ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(GX + c * GS - GS / 2, GY + r * GS - GS / 2, GS, GS);
        }
      },
      drawFront(w, ctx) {
        const B = w.gb;
        for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
          const cell = B.cells[r][c];
          if (cell.sp) continue;
          drawCell(w, ctx, cell, GX + c * GS, GY + r * GS);
        }
        // 특수 보석은 위에 그림 (서로 비켜 가는 호)
        for (const [r, sgn] of [[3, -1], [2, 1]]) {
          const cell = B.cells[r][3];
          if (!cell.sp) continue;
          const k = Math.abs(cell.dy) / GS, bx = sgn * Math.sin(k * Math.PI) * B.arc;
          drawCell(w, ctx, cell, GX + 3 * GS + bx, GY + r * GS + cell.dy);
        }
      },
      steps: [
        {
          id: "swap", name: { en: "Arc Swap", ko: "곡선 교환" }, param: "0.26s · arc 22px",
          cap: { en: "Swap along an *arc*. Specials *glow* hot.", ko: "*곡선*으로 바꾸고, 특수 보석이 *달아올라요*." },
          swap(w, s, a, b) {
            s.dur = 0.26; s.arc = 22;
            a.glow = b.glow = 1;
          },
        },
        {
          id: "freeze", name: { en: "Power Freeze", ko: "폭발 직전 멈춤" }, param: "stop 140ms · flash",
          cap: { en: "*Freeze*, flash, punch the *camera*.", ko: "*멈칫*, 번쩍, 화면이 *쿵*." },
          boom(w) {
            w.hitstop(0.14); w.flash("255,190,255", 0.16);
            w.zoomPunch(0.08); w.shake(0.5);
          },
        },
        {
          id: "lasers", name: { en: "Cross Lasers", ko: "십자 레이저" }, param: "3 rows + 3 cols",
          cap: { en: "Fire *lasers* down three rows and columns.", ko: "가로세로 세 줄씩 *레이저*가 쭉." },
          boom(w, B, x, y) {
            for (let k = -1; k <= 1; k++) {
              w.spawn({ type: "slash", x, y: y + k * GS, ang: 0, len: 140, size: 8, life: 0.32, color: "90,200,255" });
              w.spawn({ type: "slash", x: x + k * GS, y: y - 18, ang: Math.PI / 2, len: 120, size: 8, life: 0.32, color: "220,110,255" });
            }
            w.spawn({ type: "glow", under: true, x, y, size: 30, size1: 170, life: 0.6, color: "170,90,230" });
          },
        },
        {
          id: "wave", name: { en: "Ripple Clear", ko: "물결 소거" }, param: "50ms per cell",
          cap: { en: "Clear in a *ripple* from the center.", ko: "가운데부터 *물결*처럼 터져요." },
          boom(w, B) { B.wave = 0.05; },
          pop(w, cell, x, y) {
            w.spawn({ type: "ring", x, y, size: 6, size1: 30, life: 0.3, w: 5, color: GEM_COL[cell.c] });
          },
        },
        {
          id: "shower", name: { en: "Gem Shower", ko: "보석 소나기" }, param: "30 gems · spin",
          cap: { en: "Gems *fly off* the board and *spin*.", ko: "보석이 판 밖으로 *휙휙* 날아가요." },
          pop(w, cell, x, y) {
            w.shoot({ x, y, vx: (x - 270) * 3 + rand(-120, 120), vy: rand(-620, -320), g: 1500, vr: rand(-12, 12), c: cell.c, draw: flyGem });
            sparks(w, x, y, 2, GEM_COL[cell.c]);
          },
        },
        {
          id: "combo", name: { en: "Combo Shout", ko: "콤보 외치기" }, param: "text · rays 12",
          cap: { en: "Shout the *combo*. Burst *stars*.", ko: "*콤보*를 크게 외치고, *별*이 팡." },
          boom(w, B, x, y) {
            w.after(0.22, () => w.spawn({ type: "text", x: 270, y: 176, text: "SUPER COMBO!", size: 38, color: "#ffe14a", life: 1.6 }));
            w.spawn({ type: "rays", under: true, x, y, n: 12, size: 80, size1: 320, vr: 0.7, life: 1.6, hold: true, color: "255,200,120" });
            starBurst(w, x, y, 12, ["255,230,120", "255,200,90", "240,150,255"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish + boom + blips",
          cap: { en: "*Swish*, a deep *boom*, popping *blips*.", ko: "*휙*, *콰앙*, *톡톡톡*." },
          swap(w) { w.sfx.swish(); },
          boom(w) { w.sfx.boom(); w.sfx.magic(); },
          pop(w) { w.sfx.blip(((w.time * 20) | 0) % 10); },
        },
      ],
    },

    /* ───────── 3. 퍼펙트 착지 ───────── */
    {
      id: "spot-casual-perfect-stack", cat: "casual", view: "side",
      title: { en: "Make a perfect stack feel *perfect*", ko: "딱 맞게 쌓으면 *짜릿하게*" },
      intro: { en: "Perfect drop. It just *sits there*.", ko: "완벽하게 쌓았는데 그냥 *얹혀요*." },
      interval: 2.6, stepDur: 3.8,
      setup(w) {
        w.st = { slabs: [], mover: null, edge: 0, score: 5 };
      },
      fire(w) {
        const st = w.st;
        st.slabs = SLAB_COL.slice(0, 5).map(col => ({ col, sq: 0, v: 0, fl: 0 }));
        st.score = 5; st.edge = 0;
        const top = stackTop(st), m = { x: 120, yb: top - 46, col: SLAB_COL[5], sq: 0, v: 0, fl: 0 };
        st.mover = m;
        w.tween(m, { x: 270 }, 0.5, "lin", () => w.tween(m, { yb: top }, 0.1, "in", () => {
          st.mover = null; st.slabs.push(m); st.score++;
          w.emit("land", st, m, top - 24);
        }));
      },
      update(w, dt) {
        const st = w.st;
        for (const s of st.slabs) { s.v += (-s.sq * 420 - s.v * 11) * dt; s.sq += s.v * dt; s.fl = Math.max(0, s.fl - dt * 3); }
        st.edge = Math.max(0, st.edge - dt * 1.6);
      },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 160, "#6a2a4e", "#14070f");
        ctx.fillStyle = "#24101c"; ctx.beginPath(); ctx.ellipse(276, 302, 150, 22, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,170,190,0.4)"; ctx.lineWidth = 2; ctx.stroke();
      },
      drawFront(w, ctx) {
        const st = w.st;
        let y = 300;
        for (const s of st.slabs) {
          const h = 24 * (1 - s.sq * 0.4), wid = 150 * (1 + s.sq * 0.16);
          drawSlab(ctx, 270, y, wid, h, s.col, s.fl);
          y -= h;
        }
        if (st.edge > 0) {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(255,250,200,${st.edge})`; ctx.lineWidth = 4;
          ctx.strokeRect(195, y, 150, 24 * (1 - (st.slabs.at(-1).sq || 0) * 0.4));
          ctx.globalCompositeOperation = "source-over";
        }
        const m = st.mover;
        if (m) drawSlab(ctx, m.x, m.yb, 150, 24, m.col, 0);
      },
      drawHud(w, ctx) { label(ctx, String(w.st.score), 270, 56, 34, "rgba(255,255,255,0.9)"); },
      steps: [
        {
          id: "squash", name: { en: "Squash Wave", ko: "눌림 물결" }, param: "40ms stagger · ×.6",
          cap: { en: "*Squash* the tower top to bottom.", ko: "위에서 아래로 탑이 *꾹꾹* 눌려요." },
          land(w, st) {
            const n = st.slabs.length;
            st.slabs.forEach((s, i) => w.after((n - 1 - i) * 0.04, () => (s.sq = 0.6)));
            w.kick(0, 8);
          },
        },
        {
          id: "freeze", name: { en: "Perfect Freeze", ko: "딱 멈춤" }, param: "stop 80ms · edge",
          cap: { en: "*Freeze* a beat. Flash the *edges*.", ko: "잠깐 *멈칫*, 모서리가 *번쩍*." },
          land(w, st, s) { w.hitstop(0.08); s.fl = 1; st.edge = 1; },
        },
        {
          id: "rings", name: { en: "Edge Rings", ko: "모서리 고리" }, param: "rings 3 · sparks 20",
          cap: { en: "Rings *ripple out*. Sparks *jump* off edges.", ko: "*고리*가 퍼지고, 모서리에서 *불꽃*." },
          land(w, st, s, y) {
            for (let i = 0; i < 3; i++) w.after(i * 0.08, () => w.spawn({ type: "ring", flat: true, x: 276, y: y + 4, size: 90, size1: 240, life: 0.55, w: 8, color: "255,240,170" }));
            for (const ex of [195, 357]) sparks(w, ex, y, 10, "255,230,150", [200, 520], -Math.PI * 0.95, -Math.PI * 0.05);
          },
        },
        {
          id: "text", name: { en: "PERFECT Pop", ko: "퍼펙트 글자" }, param: "text · combo ×5",
          cap: { en: "Pop *PERFECT* and the *combo* count.", ko: "*PERFECT*와 *콤보 수*를 띄워요." },
          land(w, st, s, y) {
            w.spawn({ type: "text", x: 270, y: y - 46, text: "PERFECT!", size: 36, color: "#fff27a", life: 1.5 });
            w.spawn({ type: "text", x: 410, y: y - 14, text: "×5", size: 26, color: "#ff9ec2", life: 1.4 });
            starBurst(w, 270, y - 10, 10, ["255,240,140", "255,255,255"]);
          },
        },
        {
          id: "climb", name: { en: "Glow Climb", ko: "빛이 타고 오름" }, param: "60ms per slab · rays",
          cap: { en: "Light *climbs* the tower. *Rays* crown it.", ko: "빛이 탑을 *타고 올라*, 꼭대기에 *빛줄기*." },
          land(w, st, s, y) {
            st.slabs.forEach((b, i) => w.after(0.1 + i * 0.06, () => (b.fl = 0.8)));
            w.spawn({ type: "rays", under: true, x: 276, y, n: 14, size: 70, size1: 260, vr: 0.5, life: 1.8, hold: true, color: "255,200,140" });
            w.spawn({ type: "beam", under: true, x: 276, y: 300, size: 90, h: 360, life: 0.8, color: "255,170,190" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk + rising chord",
          cap: { en: "Solid *thunk*, then a *rising* chime.", ko: "묵직한 *턱*, 그리고 *올라가는* 띠링." },
          // 블록이 놓이는 턱은 항상, 올라가는 띠링은 PERFECT 연출이 있을 때만
          land(w) {
            w.play(() => { sBody(180, 0.09, 0.6); sSnap(0.25, 0, 2200); nz({ dur: 0.05, type: "bandpass", f: 900, q: 1.5, vol: 0.3 }); });
            if (w.on("text") || w.on("rings")) [0, 4, 7, 12].forEach((n, i) => w.after(i * 0.06, () => w.sfx.chime(n)));
          },
        },
      ],
    },

    /* ───────── 4. 3-2-1-GO 카운트다운 ───────── */
    {
      id: "spot-casual-countdown", cat: "ui", view: "ui", polished: true,
      title: { en: "Make a countdown *hype* the start", ko: "카운트다운으로 *두근두근*" },
      intro: { en: "3, 2, 1, GO. Numbers just *swap*.", ko: "3, 2, 1, GO. 숫자만 *바뀌어요*." },
      interval: 3.0, stepDur: 4.0,
      setup(w) { w.cd = { txt: "", i: 0, s: 1, rot: 0, depth: 0, gTxt: "", gA: 0, gS: 1, prog: 0 }; },
      fire(w) {
        const c = w.cd;
        Object.assign(c, { txt: "", s: 1, rot: 0, depth: 0, gA: 0, prog: 0 });
        w.tween(c, { prog: 1 }, 1.6, "lin");
        ["3", "2", "1", "GO!"].forEach((t, i) => w.after(0.1 + i * 0.5, () => {
          c.gTxt = c.txt; c.txt = t; c.i = i; c.s = 1;
          w.emit(i < 3 ? "tick" : "go", c, i);
        }));
        w.after(2.6, () => (c.txt = ""));
      },
      update(w, dt) {
        const c = w.cd;
        c.gA = Math.max(0, c.gA - dt * 2.4); c.gS += dt * 2.2;
      },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 186, "#0f4a48", "#031110");
        const c = w.cd;
        ctx.strokeStyle = "rgba(120,255,230,0.14)"; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.arc(270, 186, 112, 0, TAU); ctx.stroke();
        ctx.strokeStyle = "rgba(120,255,230,0.55)"; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(270, 186, 112, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - c.prog)); ctx.stroke();
      },
      drawFront(w, ctx) {
        const c = w.cd;
        drawCount(ctx, c, c.gTxt, c.gS, c.gA * 0.6);
        drawCount(ctx, c, c.txt, c.s, 1);
      },
      steps: [
        {
          id: "slam", name: { en: "Slam In", ko: "쾅 내려찍기" }, param: "×2.4 → 1 · 0.24s",
          cap: { en: "*Slam* each number in from huge.", ko: "숫자가 크게 날아와 *쾅* 박혀요." },
          tick(w, c) {
            c.s = 2.4; c.rot = -0.25;
            w.tween(c, { s: 1, rot: 0 }, 0.24, "back");
            w.kick(0, 8);
          },
          go(w, c) { c.s = 3; w.tween(c, { s: 1 }, 0.3, "back"); },
        },
        {
          id: "extrude", name: { en: "3D Extrude", ko: "입체 숫자" }, param: "depth 14 · 4 colors",
          cap: { en: "Give numbers *depth* and a *color* each.", ko: "숫자마다 *두께*와 *색*을 줘요." },
          update(w) { w.cd.depth = 14; },
        },
        {
          id: "rings", name: { en: "Beat Rings", ko: "박자 고리" }, param: "ring 90→230 · glow",
          cap: { en: "Every beat pushes a *colored ring*.", ko: "박자마다 *색 고리*가 퍼져요." },
          tick(w, c, i) {
            w.spawn({ type: "ring", x: 270, y: 186, size: 90, size1: 230, life: 0.45, w: 12, color: CD_RGB[i] });
            w.spawn({ type: "glow", under: true, x: 270, y: 186, size: 60, size1: 150, life: 0.45, color: CD_RGB[i] });
          },
        },
        {
          id: "ghost", name: { en: "Afterimage", ko: "잔상" }, param: "grow ×2.2 · fade",
          cap: { en: "The old number *blows up* and fades.", ko: "앞 숫자가 *훅* 커지며 사라져요." },
          tick(w, c) { c.gA = 1; c.gS = 1; },
          go(w, c) { c.gA = 1; c.gS = 1; },
        },
        {
          id: "boom", name: { en: "GO Explosion", ko: "GO 대폭발" }, param: "stop 100ms · rays 18",
          cap: { en: "*GO* explodes: flash, rays, *confetti*.", ko: "*GO*에서 번쩍, 빛줄기, *꽃가루*." },
          go(w) {
            w.hitstop(0.1); w.flash("220,255,140", 0.2); w.shake(0.6); w.zoomPunch(0.1);
            w.spawn({ type: "rays", under: true, x: 270, y: 186, n: 18, size: 90, size1: 340, vr: 0.9, life: 1.5, hold: true, color: "200,255,90" });
            for (let i = 0; i < 3; i++) w.spawn({ type: "ring", x: 270, y: 186, size: 60, size1: 260 + i * 70, life: 0.5 + i * 0.12, w: 12, color: i ? "255,255,255" : "200,255,90" });
            confetti(w, 120, 330, 30, -1.4, -0.9); confetti(w, 420, 330, 30, -2.2, -1.7);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising beeps + boom",
          cap: { en: "Beeps *climb* in pitch. GO *booms*.", ko: "*삑* 소리가 점점 높게, GO에서 *쾅*." },
          tick(w, c, i) { w.sfx.blip(1 + i * 3); if (w.on("slam")) w.sfx.tock(); },
          go(w) { if (w.on("boom")) { w.sfx.burst(); w.sfx.fanfare(); } else w.sfx.chime(12); },
        },
      ],
    },

    /* ───────── 5. 슬롯머신 잭팟 ───────── */
    {
      id: "spot-casual-slot-jackpot", cat: "casual", view: "3d",
      title: { en: "Make a jackpot feel like a *jackpot*", ko: "잭팟을 *잭팟답게*" },
      intro: { en: "Triple seven. It just *says WIN*.", ko: "7이 세 개인데 *WIN* 글자뿐이에요." },
      interval: 3.0, stepDur: 4.0,
      setup(w) {
        w.slot = { reels: [0, 1, 2].map(k => ({ pos: k * 3 + 0.5, spin: false, fl: 0, pulse: 0 })), lever: 0, chase: 0, gap: 0, settle: 0, credit: 0 };
      },
      fire(w) {
        const m = w.slot;
        Object.assign(m, { gap: 0, settle: 0, chase: 0, credit: 0 });
        m.reels.forEach(r => Object.assign(r, { spin: true, fl: 0, pulse: 0 }));
        w.emit("spin", m);
        w.tween(m, { lever: 1 }, 0.12, "out", () => w.tween(m, { lever: 0 }, 0.35, "back"));
        const stop = (r, k) => {
          const to = Math.ceil((r.pos + 3) / 10) * 10;
          r.spin = false;
          if (m.settle) w.tween(r, { pos: to }, m.settle, "back"); else r.pos = to;
          w.emit("stop", m, r, k);
        };
        m.reels.forEach((r, k) => w.after(0.55 + k * m.gap, () => stop(r, k)));
        w.after(0.65 + 2 * m.gap + m.settle, () => { m.credit = 500; w.emit("win", m); });
      },
      update(w, dt) {
        for (const r of w.slot.reels) {
          if (r.spin) r.pos += 16 * dt;
          r.fl = Math.max(0, r.fl - dt * 4);
          r.pulse = Math.max(0, r.pulse - dt * 0.6);
        }
      },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 170, "#1f5a34", "#04120a");
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(278, 304, 170, 18, 0, 0, TAU); ctx.fill();
      },
      drawFront(w, ctx) { drawSlot(w, ctx, w.slot); },
      steps: [
        {
          id: "stagger", name: { en: "One by One", ko: "하나씩 멈춤" }, param: "gap .32s · settle .22",
          cap: { en: "Stop reels *one by one*. Let each *wobble*.", ko: "릴이 *하나씩* 멈추고, *출렁* 자리 잡아요." },
          spin(w, m) { m.gap = 0.32; m.settle = 0.22; },
        },
        {
          id: "thunk", name: { en: "Reel Thunk", ko: "릴 철컥" }, param: "kick 6 · flash",
          cap: { en: "Each stop *kicks* the machine and *flashes*.", ko: "멈출 때마다 기계가 *철컥*, 릴이 *번쩍*." },
          stop(w, m, r, k) {
            r.fl = 1; w.kick(0, 6); w.shake(0.18);
            sparks(w, RX[k], RCY - 78, 6, "255,220,120", [150, 350], -Math.PI, 0);
          },
        },
        {
          id: "lights", name: { en: "Chase Lights", ko: "달리는 불빛" }, param: "28 bulbs · 14 Hz",
          cap: { en: "Bulbs *chase* around. The payline *glows*.", ko: "전구가 *빙글빙글* 달리고, 줄이 *반짝*." },
          win(w, m) { m.chase = 1; },
        },
        {
          id: "coins", name: { en: "Coin Spout", ko: "동전 쏟기" }, param: "40 coins · spout",
          cap: { en: "*Spout* coins out. Let them *bounce*.", ko: "*동전*이 와르르 쏟아져 바닥에 *통통*." },
          win(w) {
            // 받침 아래 배출구에서 양옆으로 쏟아져 릴은 가리지 않아요
            for (let i = 0; i < 40; i++) w.after(i * 0.03, () => {
              const s = i % 2 ? 1 : -1;
              w.spawn({ type: "ghost", img: SPR.coin.c, top: true, alpha0: 1, w: 24, h: 24, x: 270 + s * 30, y: 292,
                vx: s * rand(140, 420), vy: rand(-260, -120), g: 1100, ground: true, gy: rand(310, 326), bounce: 0.45, life: 2.2, hold: true });
            });
          },
        },
        {
          id: "jackpot", name: { en: "JACKPOT Shout", ko: "잭팟 외치기" }, param: "text · rays 16",
          cap: { en: "Pulse the *sevens*. Shout *JACKPOT*.", ko: "*7*이 두근두근, *JACKPOT*을 외쳐요." },
          win(w, m) {
            m.reels.forEach(r => (r.pulse = 1));
            w.flash("255,220,120", 0.17); w.zoomPunch(0.08);
            w.spawn({ type: "rays", under: true, x: 270, y: 180, n: 16, size: 120, size1: 380, vr: 0.5, life: 2, hold: true, color: "255,210,90" });
            w.spawn({ type: "text", x: 270, y: 116, text: "JACKPOT!", size: 44, color: "#ffe14a", life: 1.8 });
            starBurst(w, 270, 180, 14, ["255,230,120", "255,255,255"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rattle + thunk + coins",
          cap: { en: "*Rattle*, *clunk* ×3, a shower of *dings*.", ko: "*드르륵*, *철컥* 세 번, *짤랑짤랑*." },
          spin(w) { w.sfx.rattle(); },
          // 릴 멈춤: 철컥 (쇳소리 + 툭)
          stop(w) { w.play(() => { sSnap(0.3, 0, 2000); sBody(220, 0.06, 0.5); sMetal(1300, 0.08, 0.06); }); },
          // 팡파레는 JACKPOT 글자와, 짤랑짤랑은 동전이 쏟아질 때만
          win(w) {
            if (w.on("jackpot")) w.sfx.fanfare(); else w.sfx.chime(7);
            if (w.on("coins")) for (let i = 0; i < 12; i++) w.after(0.1 + i * 0.06, () => w.play(() => sMetal(2200 + Math.random() * 1200, 0.14, 0.05)));
          },
        },
      ],
    },

    /* ───────── 6. 승리 화면 ───────── */
    {
      id: "spot-casual-victory", cat: "ui", view: "ui", polished: true,
      title: { en: "Make the victory screen *celebrate*", ko: "승리 화면을 *축제*처럼" },
      intro: { en: "You won. A trophy just *appears*.", ko: "이겼는데 트로피가 그냥 *나타나요*." },
      interval: 3.0, stepDur: 4.0,
      setup(w) { w.vic = { show: false, oy: 0, sx: 1, sy: 1, vsx: 0, vsy: 0, ban: 0, fall: 0 }; },
      fire(w) {
        const v = w.vic;
        Object.assign(v, { show: false, oy: 0, sx: 1, sy: 1, vsx: 0, vsy: 0, ban: 0, fall: 0 });
        w.after(0.25, () => {
          v.show = true; v.ban = 1;
          w.emit("show", v);
          if (v.fall) { v.oy = -320; w.tween(v, { oy: 0 }, v.fall, "in", () => w.emit("land", v)); }
          else w.emit("land", v);
        });
      },
      update(w, dt) { wobble(w.vic, dt); },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 170, "#24449a", "#050a1e");
        facetCyl(ctx, 270, 270, 304, 104, 112, 14, 16, [110, 140, 230], [18, 26, 70]);
      },
      drawFront(w, ctx) {
        const v = w.vic;
        if (!v.show) return;
        const art = trophyArt().c, h = 156, wd = h * art.width / art.height;
        ctx.save(); ctx.translate(270, 274 + v.oy); ctx.scale(v.sx, v.sy);
        ctx.drawImage(art, -wd / 2, -h, wd, h);
        ctx.restore();
        drawBanner(ctx, v);
      },
      steps: [
        {
          id: "drop", name: { en: "Trophy Drop", ko: "트로피 낙하" }, param: "0.32s · squash ×1.3",
          cap: { en: "*Drop* the trophy in. *Squash* on impact.", ko: "트로피가 *쿵* 떨어져서 *찌그러져요*." },
          show(w, v) { v.fall = 0.32; },
          land(w, v) { v.sx = 1.3; v.sy = 0.7; w.shake(0.35); dust(w, 270, 272, 14); },
        },
        {
          id: "unfurl", name: { en: "Banner Unfurl", ko: "현수막 펼치기" }, param: "0.5s · back ease",
          cap: { en: "*Unroll* the banner from the middle.", ko: "현수막이 가운데서 *촤악* 펼쳐져요." },
          land(w, v) { v.ban = 0; w.tween(v, { ban: 1 }, 0.5, "back"); },
        },
        {
          id: "shine", name: { en: "Golden Glow", ko: "황금빛" }, param: "rays 18 · glints 6",
          cap: { en: "Golden *rays* behind. *Glints* on the cup.", ko: "뒤로 *금빛 줄기*, 컵 위에 *반짝*." },
          land(w) {
            w.spawn({ type: "rays", under: true, x: 270, y: 196, n: 18, size: 80, size1: 320, vr: 0.4, life: 2.4, hold: true, color: "255,210,100" });
            w.spawn({ type: "glow", under: true, x: 270, y: 196, size: 60, size1: 140, life: 2.2, hold: true, color: "255,180,60" });
            for (let i = 0; i < 6; i++) w.after(i * 0.22, () => w.spawn({ type: "star", x: 270 + rand(-36, 36), y: rand(150, 220), size: 12, life: 0.4, color: "255,255,230" }));
          },
        },
        {
          id: "fireworks", name: { en: "Fireworks", ko: "불꽃놀이" }, param: "3 shells · 34 sparks",
          cap: { en: "Launch *fireworks* left, right, center.", ko: "왼쪽, 오른쪽, 가운데 *불꽃*이 팡팡." },
          land(w) {
            firework(w, 130, 120, "255,120,160", 0.05);
            firework(w, 410, 110, "120,220,255", 0.3);
            firework(w, 300, 56, "255,230,120", 0.55);
          },
        },
        {
          id: "confetti", name: { en: "Confetti Rain", ko: "꽃가루 비" }, param: "70 bits · drift",
          cap: { en: "Let *confetti* rain over everything.", ko: "화면 가득 *꽃가루*가 내려요." },
          land(w) {
            for (let i = 0; i < 70; i++) w.spawn({ type: "chunk", x: rand(60, 480), y: rand(-80, -10), vx: rand(-40, 40), vy: rand(60, 200), g: 200, drag: 0.8,
              vr: rand(-12, 12), size: rand(4, 7), life: 2.4, hold: true, color: pick(CONF) });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thud + fanfare + pops",
          cap: { en: "Heavy *thud*, a *fanfare*, firework *pops*.", ko: "*쿵*, *빰빠밤*, 불꽃 *팡팡*." },
          // 트로피가 쿵 떨어질 때만 쿵, 띠가 펼쳐질 때 팡파레, 불꽃놀이가 있을 때만 팡팡
          land(w) {
            if (w.on("drop")) w.sfx.thud(); else w.sfx.tock();
            if (w.on("unfurl")) w.sfx.fanfare();
            if (w.on("fireworks")) [0.31, 0.56, 0.81].forEach(t => w.after(t, () => w.play(() => { sSnap(0.4, 0, 3000); nz({ dur: 0.4, type: "highpass", f: 2500, f2: 6000, vol: 0.2, rv: 0.4 }); })));
          },
        },
      ],
    },


    /* ───────── 7. 최고 기록 갱신 ───────── */
    {
      id: "spot-casual-high-score", cat: "ui", view: "ui", polished: true,
      title: { en: "Make a new high score feel *historic*", ko: "최고 기록을 *역사적으로*" },
      intro: { en: "New best. The number just *counts up*.", ko: "신기록인데 숫자만 *올라가요*." },
      interval: 3.0, stepDur: 4.0,
      setup(w) { w.hs = { val: HS_FROM, best: HS_BEST, bestA: 1, beat: false, heat: 0, roll: false, sx: 1, sy: 1, vsx: 0, vsy: 0, stamp: 0, last: HS_FROM }; },
      fire(w) {
        const h = w.hs;
        Object.assign(h, { val: HS_FROM, best: HS_BEST, bestA: 1, beat: false, heat: 0, roll: false, sx: 1, sy: 1, vsx: 0, vsy: 0, stamp: 0, last: HS_FROM });
        w.emit("start", h);
        w.after(0.2, () => w.tween(h, { val: HS_TO }, 1.1, h.roll ? "inout" : "lin", () => {
          h.best = HS_TO; h.bestA = 1;
          w.emit("record", h);
        }));
      },
      update(w, dt) {
        const h = w.hs;
        if (!h.beat && h.val > h.best) { h.beat = true; w.emit("beat", h); }
        if (Math.floor(h.val / 100) !== Math.floor(h.last / 100)) w.emit("digit", h);
        h.last = h.val;
        wobble(h, dt);
      },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 170, "#5c1430", "#12040a");
        rr(ctx, 124, 78, 304, 222, 22, "rgba(0,0,0,0.45)");
        rr(ctx, 118, 70, 304, 222, 22, "#24101c", "rgba(255,150,190,0.35)", 3);
        label(ctx, "SCORE", 270, 132, 15, "rgba(255,220,235,0.55)");
      },
      drawFront(w, ctx) {
        const h = w.hs;
        ctx.globalAlpha = h.bestA; label(ctx, `BEST  ${fmtNum(h.best)}`, 270, 100, 22, "#ffcf6a"); ctx.globalAlpha = 1;
        drawScore(w, ctx, h);
        drawStamp(ctx, h);
      },
      steps: [
        {
          id: "roll", name: { en: "Odometer Roll", ko: "숫자 굴리기" }, param: "per digit · inout",
          cap: { en: "*Roll* every digit like an odometer.", ko: "숫자가 한 칸씩 *도르륵* 굴러가요." },
          start(w, h) { h.roll = true; },
        },
        {
          id: "heat", name: { en: "Heat & Pump", ko: "달아오르기" }, param: "pump ×1.12 / 100",
          cap: { en: "*Pump* every hundred. Heat to *gold*.", ko: "백 점마다 *통통*, 점점 *금색*으로." },
          digit(w, h) { h.sx = h.sy = 1.12; },
          update(w) { const h = w.hs; h.heat = (h.val - HS_FROM) / (HS_TO - HS_FROM); },
        },
        {
          id: "beat", name: { en: "Break the Best", ko: "기록 깨기" }, param: "stop 120ms · 22 shards",
          cap: { en: "*Freeze* as you pass it. *Shatter* the old best.", ko: "넘는 순간 *멈칫*, 옛 기록이 *와장창*." },
          beat(w, h) {
            w.hitstop(0.12); w.flash("255,200,220", 0.2); w.shake(0.4);
            h.bestA = 0;
            for (let i = 0; i < 22; i++) w.spawn({ type: "chunk", x: 270 + rand(-70, 70), y: 100 + rand(-8, 8), vx: rand(-200, 200), vy: rand(-320, -60),
              g: 1200, vr: rand(-14, 14), size: rand(4, 8), life: 1.2, color: "255,207,106" });
          },
        },
        {
          id: "stamp", name: { en: "Record Stamp", ko: "기록 도장" }, param: "×2.6 → 1 · 0.16s",
          cap: { en: "*Slam* a NEW RECORD stamp on it.", ko: "*신기록* 도장을 *쾅* 찍어요." },
          record(w, h) {
            h.stamp = 2.6;
            w.tween(h, { stamp: 1 }, 0.16, "in", () => {
              w.shake(0.5); w.kick(0, 8);
              w.spawn({ type: "ring", x: 270, y: 252, size: 60, size1: 190, life: 0.4, w: 8, color: "255,90,120" });
              sparks(w, 270, 252, 14, "255,120,150", [200, 460]);
            });
          },
        },
        {
          id: "gold", name: { en: "Gold Burst", ko: "황금 폭죽" }, param: "rays 16 · 50 bits",
          cap: { en: "Gold *rays*, *stars* and *confetti*.", ko: "금빛 *줄기*, *별*, *꽃가루*까지." },
          record(w) {
            w.spawn({ type: "rays", under: true, x: 270, y: 176, n: 16, size: 100, size1: 360, vr: 0.5, life: 2, hold: true, color: "255,200,90" });
            w.spawn({ type: "glow", under: true, x: 270, y: 176, size: 80, size1: 180, life: 1.6, color: "255,120,160" });
            starBurst(w, 270, 176, 14, ["255,230,120", "255,255,255", "255,140,180"]);
            confetti(w, 110, 310, 26, -2.1, -1.6); confetti(w, 430, 310, 26, -1.55, -1.05);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ticks + crack + slam",
          cap: { en: "Fast *ticks*, a *crack*, a stamp *slam*.", ko: "*따다닥*, *쩍*, 도장 *쾅*." },
          digit(w) { w.sfx.tick(); },
          // 기록을 넘는 순간 "쩍" (금 가는 연출이 있을 때만), 도장이 박힐 때만 "쾅", 금빛일 때 팡파레
          beat(w) { if (w.on("beat")) w.play(() => { sSnap(0.6, 0, 3000); sMetal(1500, 0.25, 0.08); }); },
          record(w) { if (w.on("stamp")) w.after(0.16, () => w.sfx.thud()); if (w.on("gold")) w.sfx.fanfare(); else w.sfx.chime(7); },
        },
      ],
    },

    /* ───────── 8. 네 줄 동시 지우기 ───────── */
    {
      id: "spot-casual-line-clear", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make a 4-line clear feel *massive*", ko: "네 줄 지우기를 *거대하게*" },
      intro: { en: "Four lines at once. They just *vanish*.", ko: "네 줄을 한 번에 지웠는데 그냥 *없어져요*." },
      interval: 2.8, stepDur: 4.0,
      setup(w) { w.lc = {}; newWell(w.lc); },
      fire(w) {
        const L = w.lc; newWell(L);
        w.emit("start", L);
        const p = L.piece, px = LX + GAP * LC + LC / 2;
        const lock = () => {
          for (const [dr, dc] of PCELLS) L.grid[8 + dr][GAP + dc] = PIECE;
          L.piece = null;
          w.emit("lock", L, px, LY + LH * LC);
          const rows = [8, 9, 10, 11];
          L.clearing = true;
          w.emit("clear", L, rows);
          w.after(L.delay, () => {
            const blocks = [];
            for (const r of rows) for (let c = 0; c < LW; c++) blocks.push([LX + c * LC + LC / 2, LY + r * LC + LC / 2, LCOL[L.grid[r][c]]]);
            L.grid.splice(8, 4);
            for (let i = 0; i < 4; i++) L.grid.unshift(new Array(LW).fill(-1));
            L.clearing = false;
            w.emit("collapse", L, blocks);
            if (L.fall) { L.off = 4 * LC; w.tween(L, { off: 0 }, L.fall, "in", () => w.emit("settle", L)); }
            else w.emit("settle", L);
          });
        };
        w.after(0.25, () => {
          if (L.hard) { w.emit("drop", L, px); w.tween(p, { y: 8 }, 0.08, "in", lock); }
          else { const down = () => { if (p.y >= 8) return lock(); p.y++; w.after(0.07, down); }; down(); }
        });
      },
      update(w, dt) { w.lc.flash = Math.max(0, w.lc.flash - dt * 2.5); },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 170, "#1d4a34", "#030c08");
        rr(ctx, LX - 8, LY - 8, LW * LC + 16, LH * LC + 16, 8, "#08160f", "rgba(190,240,120,0.45)", 3);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        for (let c = 1; c < LW; c++) ctx.fillRect(LX + c * LC, LY, 1, LH * LC);
        for (let r = 1; r < LH; r++) ctx.fillRect(LX, LY + r * LC, LW * LC, 1);
      },
      drawFront(w, ctx) {
        const L = w.lc;
        ctx.save(); ctx.beginPath(); ctx.rect(LX - 2, LY - 2, LW * LC + 4, LH * LC + 4); ctx.clip();
        const g = (r, c) => (L.grid[r] && c >= 0 && c < LW ? L.grid[r][c] : -1);
        for (let r = 0; r < LH; r++) for (let c = 0; c < LW; c++) {
          const k = L.grid[r][c]; if (k < 0) continue;
          const x = LX + c * LC, y = LY + r * LC - L.off;
          drawTile(ctx, x, y, LCOL[k], [g(r - 1, c) === k, g(r, c + 1) === k, g(r + 1, c) === k, g(r, c - 1) === k]);
          if (L.clearing && r >= 8 && L.flash > 0) { ctx.fillStyle = `rgba(236,255,190,${0.3 + 0.6 * L.flash})`; ctx.fillRect(x, y, LC, LC); }
        }
        if (L.piece) {
          const has = (dr, dc) => PCELLS.some(([a, b]) => a === dr && b === dc);
          for (const [dr, dc] of PCELLS) drawTile(ctx, LX + (GAP + dc) * LC, LY + (L.piece.y + dr) * LC, LCOL[PIECE],
            [has(dr - 1, dc), has(dr, dc + 1), has(dr + 1, dc), has(dr, dc - 1)]);
        }
        ctx.restore();
      },
      steps: [
        {
          id: "hard", name: { en: "Hard Drop", ko: "한 번에 꽂기" }, param: "0.08s · streak",
          cap: { en: "*Slam* the bar down with a light *streak*.", ko: "막대가 빛 꼬리를 끌며 *쾅* 꽂혀요." },
          start(w, L) { L.hard = true; },
          drop(w, L, x) { w.spawn({ type: "beam", x, y: LY + LH * LC, size: 12, h: 220, life: 0.3, color: "210,255,120" }); },
          lock(w) { w.kick(0, 10); w.shake(0.25); },
        },
        {
          id: "flash", name: { en: "Line Flash", ko: "줄 번쩍" }, param: "hold 240ms · stop 60",
          cap: { en: "*Hold* the full lines and flash them *white*.", ko: "꽉 찬 줄을 잠깐 *하얗게* 번쩍." },
          clear(w, L) { L.delay = 0.24; L.flash = 1; w.hitstop(0.06); },
        },
        {
          id: "sweep", name: { en: "Side Beams", ko: "가로 광선" }, param: "4 beams · 260px",
          cap: { en: "Shoot *beams* out of both sides.", ko: "줄마다 양옆으로 *광선*이 쭉." },
          clear(w, L, rows) {
            rows.forEach(r => w.spawn({ type: "slash", x: 270, y: LY + r * LC + LC / 2, ang: 0, len: 150, size: 16, life: 0.35, color: "225,255,160" }));
            w.spawn({ type: "glow", under: true, x: 270, y: LY + 10 * LC, size: 50, size1: 200, life: 0.6, color: "150,230,90" });
          },
        },
        {
          id: "burst", name: { en: "Block Burst", ko: "블록 산산조각" }, param: "40 blocks · bounce",
          cap: { en: "Blocks *burst* out and *bounce* away.", ko: "블록이 *팡* 튀어나가 *통통* 굴러요." },
          collapse(w, L, blocks) {
            for (const [x, y, col] of blocks) w.spawn({ type: "chunk", x, y, vx: (x - 270) * 4 + rand(-80, 80), vy: rand(-560, -200), g: 1300,
              vr: rand(-12, 12), size: rand(7, 10), life: rand(1.2, 1.7), hold: true, ground: true, gy: 322, bounce: 0.4, color: col });
          },
        },
        {
          id: "fall", name: { en: "Heavy Fall", ko: "묵직한 낙하" }, param: "0.18s · dust",
          cap: { en: "The stack *falls* and lands *heavy*.", ko: "위 블록이 *뚝* 떨어져 *쿵* 내려앉아요." },
          collapse(w, L) { L.fall = 0.18; },
          settle(w) { w.shake(0.3); w.kick(0, 8); dust(w, 270, LY + LH * LC - 2, 12); },
        },
        {
          id: "text", name: { en: "4 LINES!", ko: "네 줄 외치기" }, param: "text · rays 14",
          cap: { en: "Shout *4 LINES!* and the *points*.", ko: "*4 LINES!*와 *점수*를 크게 띄워요." },
          collapse(w) {
            w.spawn({ type: "text", x: 270, y: 150, text: "4 LINES!", size: 44, color: "#d8ff6a", life: 1.6 });
            w.spawn({ type: "text", x: 270, y: 204, text: "+1200", size: 26, color: "#ffe14a", life: 1.5 });
            w.spawn({ type: "rays", under: true, x: 270, y: 170, n: 14, size: 80, size1: 320, vr: 0.6, life: 1.6, hold: true, color: "170,240,110" });
            starBurst(w, 270, 170, 12, ["220,255,150", "255,255,255"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "dash + slam + burst",
          cap: { en: "*Whoosh*, *slam*, glassy *burst*.", ko: "*슝*, *쾅*, *와르르*." },
          drop(w) { w.sfx.dash(); },
          lock(w) { w.sfx.slam(); },
          collapse(w) { w.sfx.burst(); w.sfx.fanfare(); },
          settle(w) { w.sfx.thud(); },
        },
      ],
    },

    /* ───────── 9. 버블 연쇄 터뜨리기 ───────── */
    {
      id: "spot-casual-bubble-chain", cat: "puzzle", view: "top",
      title: { en: "Make bubble chains *cascade*", ko: "버블 연쇄를 *줄줄이*" },
      intro: { en: "Ten bubbles. All gone in *one frame*.", ko: "열 개가 *한 프레임*에 다 사라져요." },
      interval: 2.8, stepDur: 4.0,
      setup(w) { w.bb = {}; newBubbles(w.bb); },
      fire(w) {
        const B = w.bb; newBubbles(B);
        const [tx, ty] = bpos(5, 5);
        const shot = (B.shot = { x: 270, y: 296 }), gen = (B.gen = (B.gen || 0) + 1);
        w.after(0.25, () => w.tween(shot, { x: tx, y: ty }, 0.22, "lin", () => {
          if (B.gen !== gen) return;
          B.g[5][5] = { k: 0, s: 1 }; B.shot = null;
          w.emit("hit", B);
          const seen = new Set(["5,5"]), q = [[5, 5]], cl = [];
          while (q.length) {
            const [r, c] = q.shift(); cl.push([r, c]);
            for (const [nr, nc] of bnbrs(r, c)) { const b = B.g[nr] && B.g[nr][nc]; if (b && b.k === 0 && !seen.has(nr + "," + nc)) { seen.add(nr + "," + nc); q.push([nr, nc]); } }
          }
          cl.forEach(([r, c], i) => w.after(i * B.gap, () => { B.g[r][c] = null; w.emit("pop", B, ...bpos(r, c), i, r, c); }));
          w.after(cl.length * B.gap + 0.05, () => {
            const keep = new Set(), st = [];
            B.g[0].forEach((b, c) => { if (b) { keep.add("0," + c); st.push([0, c]); } });
            while (st.length) {
              const [r, c] = st.pop();
              for (const [nr, nc] of bnbrs(r, c)) if (B.g[nr] && B.g[nr][nc] && !keep.has(nr + "," + nc)) { keep.add(nr + "," + nc); st.push([nr, nc]); }
            }
            B.g.forEach((row, r) => row.forEach((b, c) => { if (b && !keep.has(r + "," + c)) { row[c] = null; w.emit("orphan", b, ...bpos(r, c)); } }));
            w.emit("chain", B, cl.length);
          });
        }));
      },
      update(w, dt) {
        for (const row of w.bb.g) for (const b of row) if (b) b.s += (1 - b.s) * Math.min(1, dt * 10);
        const T = w.bb.tally; if (T) { T.t += dt; T.s += (1 - T.s) * Math.min(1, dt * 14); if (T.t > 0.9) w.bb.tally = null; }
      },
      drawFloor(w, ctx) {
        backdrop(ctx, 270, 170, "#6a4512", "#140c02");
        rr(ctx, 110, 40, 320, 230, 18, "rgba(20,12,4,0.55)", "rgba(255,210,140,0.35)", 3);
        ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(255,120,100,0.45)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(116, 250); ctx.lineTo(424, 250); ctx.stroke(); ctx.setLineDash([]);
      },
      drawFront(w, ctx) {
        const B = w.bb;
        B.g.forEach((row, r) => row.forEach((b, c) => { if (b) { const [x, y] = bpos(r, c); bubble(ctx, b.k, x, y, BR * b.s); } }));
        const [tx, ty] = bpos(5, 5), a = Math.atan2(ty - 312, tx - 270);
        ctx.save(); ctx.translate(270, 314); ctx.rotate(a);
        rr(ctx, 0, -11, 40, 22, 6, "#c8b090"); ctx.restore();
        ctx.fillStyle = "#8a6a40"; ctx.beginPath(); ctx.arc(270, 318, 26, Math.PI, 0); ctx.fill();
        if (B.shot) bubble(ctx, 0, B.shot.x, B.shot.y, BR);
        const T = B.tally;
        if (T) {
          ctx.save(); ctx.globalAlpha = Math.min(1, (0.9 - T.t) * 4); ctx.translate(T.x, T.y - T.t * 20); ctx.scale(T.s, T.s);
          ctx.font = `900 ${18 + T.v / 10 * 1.6}px Pretendard, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "#3a1c00"; ctx.strokeText(`+${T.v}`, 0, 0);
          ctx.fillStyle = "#fff4d8"; ctx.fillText(`+${T.v}`, 0, 0); ctx.restore();
        }
      },
      steps: [
        {
          id: "cascade", name: { en: "Cascade Pop", ko: "줄줄이 터짐" }, param: "60ms per bubble",
          cap: { en: "Pop them *one after another*, not all at once.", ko: "한꺼번에 말고 *하나씩 차례로* 터뜨려요." },
          hit(w, B) { B.gap = 0.06; },
        },
        {
          id: "splash", name: { en: "Burst Splash", ko: "물방울 튐" }, param: "ring · 8 drops · jiggle",
          cap: { en: "*Splash* each pop. *Jiggle* the neighbors.", ko: "터질 때 *촥*, 옆 버블이 *출렁*." },
          pop(w, B, x, y, i, r, c) {
            w.spawn({ type: "ring", x, y, size: 10, size1: 34, life: 0.3, w: 6, color: "255,150,200" });
            sparks(w, x, y, 8, "255,170,210", [160, 380]);
            for (const [nr, nc] of bnbrs(r, c)) { const n = B.g[nr] && B.g[nr][nc]; if (n) n.s = 1.25; }
          },
        },
        {
          id: "score", name: { en: "Score Climb", ko: "점수 오르기" }, param: "+10 ×n · grows",
          cap: { en: "Each pop scores *more* and pops *bigger*.", ko: "터질수록 점수가 *커지고* 글자도 *커져요*." },
          pop(w, B, x, y, i) {
            B.tally = { v: (i + 1) * 10, x, y: y - 24, s: 1.5, t: 0 }; // 한 자리에서 숫자만 커져요
          },
        },
        {
          id: "drop", name: { en: "Orphan Drop", ko: "떨어지는 버블" }, param: "gravity · splat",
          cap: { en: "Cut-off bubbles *fall* and *splat*.", ko: "끊긴 버블이 *뚝* 떨어져 *퐁*." },
          orphan(w, b, x, y) {
            w.shoot({ x, y, vx: rand(-60, 60), vy: -140, g: 1500, k: b.k, draw: flyBubble, test: p => p.y > 296,
              onHit: p => { sparks(w, p.x, 296, 10, BCOL[p.k].join(","), [150, 360], -Math.PI, 0); w.spawn({ type: "ring", flat: true, x: p.x, y: 300, size: 10, size1: 50, life: 0.35, w: 5, color: "255,230,200" }); } });
          },
        },
        {
          id: "chain", name: { en: "Chain Finale", ko: "연쇄 마무리" }, param: "text · rays 14",
          cap: { en: "End with a big *CHAIN* shout and *stars*.", ko: "마지막에 *CHAIN*을 크게, *별*이 팡." },
          chain(w, B, n) {
            w.shake(0.4); w.zoomPunch(0.07); w.flash("255,220,160", 0.16);
            w.spawn({ type: "text", x: 270, y: 274, text: `CHAIN ×${n}!`, size: 38, color: "#ffd84a", life: 1.6 });
            w.spawn({ type: "rays", under: true, x: 270, y: 150, n: 14, size: 80, size1: 320, vr: 0.6, life: 1.6, hold: true, color: "255,190,110" });
            starBurst(w, 270, 150, 14, ["255,230,140", "255,255,255", "255,150,200"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch +1 per pop",
          cap: { en: "Each pop goes *one note higher*.", ko: "터질 때마다 음이 *한 칸씩* 올라가요." },
          hit(w) { w.sfx.tock(); },
          pop(w, B, x, y, i) { w.sfx.pop(Math.pow(2, i / 12)); },
          chain(w) { if (w.on("chain")) w.sfx.fanfare(); },
        },
      ],
    },

  );
})();

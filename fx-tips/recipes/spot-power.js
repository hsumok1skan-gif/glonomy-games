"use strict";
/* 한 대상만 크게 보여 주는 쇼케이스 레시피: 파워업·제작·강화 계열 */
(() => {
  /* ───── 공통 도우미 (이 파일 안에서만) ───── */
  const part = (p, light, dark) => Object.assign(p, { light, dark });
  // 테마 배경: 가운데가 밝은 원형 그라디언트를 화면 가득
  // 계단식(픽셀) 배경: 매끈한 그라디언트 대신 6단 동심원 띠 + 디더 점
  const hx = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
  function backdrop(ctx, inner, outer, cy = 170, r = 340) {
    const A = hx(inner), B = hx(outer), N = 6;
    ctx.fillStyle = outer; ctx.fillRect(-80, -80, 700, 520);
    for (let i = N - 1; i >= 0; i--) {
      const t = i / (N - 1), col = `rgb(${B.map((v, j) => Math.round(v + (A[j] - v) * (1 - t) * 0.85)).join(",")})`;
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(270, cy, r * (0.22 + t * 0.78), r * (0.22 + t * 0.78) * 0.82, 0, 0, TAU); ctx.fill();
      if (i > 0) { ctx.fillStyle = `rgb(${B.map((v, j) => Math.round(v + (A[j] - v) * (1 - (i - 0.5) / (N - 1)) * 0.85)).join(",")})`; const R = r * (0.22 + t * 0.78);
        for (let k = 0; k < 90; k++) { const a = k / 90 * TAU, rr = R - 3 - (k % 3) * 3; ctx.fillRect(Math.round(270 + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.82), 3, 3); } }
    }
  }
  // 받침대: 어두운 타원 + 테두리 고리 두 줄
  function pedestal(ctx, x, y, rx, ry, fill, line) {
    ctx.fillStyle = "#04060c"; ctx.beginPath(); ctx.ellipse(x, y + 4, rx + 4, ry + 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgb(${line})`; ctx.globalAlpha = 0.7; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, rx - 2, ry - 1, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(x, y, rx * 0.68, ry * 0.68, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }
  const mix3 = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",");
  function bolts(w, x, y, n, cols, step = 22, spread = Math.PI) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-spread, spread), pts = [[0, 0]];
      for (let k = 1; k < 7; k++) pts.push([Math.cos(a) * k * step + rand(-12, 12), Math.sin(a) * k * step + rand(-12, 12)]);
      w.spawn({ type: "crack", x, y, pts, w: 3.5, life: 0.35, add: true, color: pick(cols) });
    }
  }
  function starBurst(w, x, y, n, cols, s0 = 180, s1 = 420) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(s0, s1);
      w.spawn({ type: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.5, g: 260, size: rand(6, 11), life: rand(0.8, 1.4), color: pick(cols) });
    }
  }
  function suckIn(w, x, y, n, cols, r0 = 110, r1 = 170, life = 0.32) {
    for (let i = 0; i < n; i++) w.after(i * 0.028, () => {
      const a = rand(0, TAU), d = rand(r0, r1);
      w.spawn({ type: "spark", seek: true, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, tx: x, ty: y, life, size: 3, color: pick(cols) });
    });
  }
  function shards(w, x, y, n, cols, gy = G + 10, sp = [220, 560]) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0), s = rand(sp[0], sp[1]);
      w.spawn({ type: "chunk", x: x + rand(-14, 14), y: y + rand(-14, 14), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 100, g: 1500, vr: rand(-14, 14),
        ground: true, gy, bounce: 0.45, size: rand(4, 9), life: rand(1.5, 2.2), hold: true, color: pick(cols) });
    }
  }
  const ease = (k) => k * k;

  /* ───── 그림: 검(세로), 룬 글자 ───── */
  const swordArt = () => polySprite("spot-power-sword", () => {
    const steel = [[232, 238, 250], [60, 70, 100]], guard = [[150, 170, 220], [30, 36, 80]];
    return [
      part(blk(0, 70, 0, 28, 150, 9, 0.75), ...steel),
      part(pyr([[-10, 220, -3], [10, 220, -3], [10, 220, 3], [-10, 220, 3]], [0, 262, 0]), ...steel),
      part(blk(0, 58, 0, 90, 14, 16, 0.85), ...guard),
      part(blk(0, 14, 0, 14, 44, 14, 0.9), [120, 80, 150], [30, 16, 40]),
      part(blk(0, 0, 0, 22, 14, 22, 0.6), ...guard),
    ];
  }, 110, 210, 0.35, 0.16);
  // 단순한 룬 모양 6가지 (선분 목록)
  const RUNES = [
    [[0, -10, 0, 10], [0, -10, 7, -4], [0, -2, 7, 3]],
    [[-6, -10, -6, 10], [-6, -10, 6, 0], [6, 0, -6, 10]],
    [[0, -10, 0, 10], [-7, -4, 7, 4], [7, -4, -7, 4]],
    [[-6, 10, 0, -10], [0, -10, 6, 10], [-3, 2, 3, 2]],
    [[-6, -10, -6, 10], [6, -10, 6, 10], [-6, -2, 6, 4]],
    [[0, -10, 7, 0], [7, 0, 0, 10], [0, 10, -7, 0], [-7, 0, 0, -10]],
  ];
  function rune(ctx, i, x, y, s, col, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath(); for (const [x0, y0, x1, y1] of RUNES[i % RUNES.length]) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); } ctx.stroke();
    ctx.restore();
  }

  /* ───── 그림: 물약병, 초록 영웅 실루엣, 재료, 부적 ───── */
  const heroGreen = () => {
    const src = SPR.hero.c;
    return sprite("spot-power-hero-green", src.width, src.height, x => {
      x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-atop";
      x.fillStyle = "#6dff8f"; x.fillRect(0, 0, src.width, src.height);
    });
  };
  function drawFlask(ctx, x, y, rot, level, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, 8, 17, 0, TAU); ctx.rect(-6, -22, 12, 20);
    ctx.fillStyle = "rgba(220,240,255,0.25)"; ctx.fill();
    if (level > 0) { // 물약: 병 아래에서 level 만큼
      ctx.save(); ctx.clip();
      ctx.fillStyle = "#38e070"; ctx.fillRect(-20, 25 - 40 * level, 40, 40 * level);
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-20, 25 - 40 * level, 40, 3);
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(230,250,255,0.9)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 8, 17, -1.2, Math.PI + 1.2); ctx.lineTo(-6, -22); ctx.moveTo(6, -22); ctx.lineTo(6, -7.6); ctx.stroke();
    rr(ctx, -7, -30, 14, 9, 2, "#a0703c");
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(-8, 2, 3, 6, 0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawAmulet(ctx, x, y, s, sx) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * sx, s);
    ctx.strokeStyle = "#e8b94a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-26, -60); ctx.quadraticCurveTo(0, -10, 26, -60); ctx.stroke();
    ctx.fillStyle = "#b07a1c"; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f2c654"; ctx.beginPath(); ctx.arc(0, -2, 31, 0, TAU); ctx.fill();
    ctx.fillStyle = "#8a5a10"; ctx.beginPath(); ctx.arc(0, -2, 25, 0, TAU); ctx.fill();
    drawGem(ctx, 4, 0, -2, 21);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + TAU / 8; ctx.fillStyle = "#fff3c4"; ctx.beginPath(); ctx.arc(Math.cos(a) * 28, -2 + Math.sin(a) * 28, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  const INGR = [1, 2, 3, 0]; // drawGem 모양 번호 (파랑 결정, 초록 약초, 노랑 광석, 빨강 열매)

  RECIPES.push(
    /* ───────── 1. 파워업 획득 ───────── */
    {
      id: "spot-power-orb", cat: "action", view: "3d", polished: true, hookDur: 3.1,
      title: { en: "Make power-ups feel *powerful*", ko: "파워업을 *힘 있게*" },
      intro: { en: "Grab the orb. It just *disappears*.", ko: "구슬을 먹었는데 그냥 *사라져요*." },
      interval: 2.8, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 210, h: 156, gy: 284 });
        w.orb = { x: 410, y: 150, s: 1, vib: 0, fly: false, alive: true, t: 0 };
        w.aura = 0;
      },
      fire(w) {
        const o = w.orb, h = w.hero, tx = h.x + 10, ty = h.gy - 92;
        Object.assign(o, { x: 410, y: 150, s: 1, vib: 0, fly: false, alive: true, t: 0 });
        const absorb = () => {
          o.alive = false; o.fly = false;
          if (!w.on("text")) w.spawn({ type: "text", x: tx + 70, y: ty - 30, text: "ATK +50", size: 14, color: "#dfe8ff", life: 1 });
          w.emit("absorb", h, tx, ty);
          w.after(1.5, () => { o.alive = true; o.x = 410; o.y = 150; o.s = 0; w.tween(o, { s: 1 }, 0.3, "back"); });
        };
        if (w.on("magnet")) {
          w.emit("launch", o);
          w.after(0.35, () => { o.vib = 0; o.fly = true; w.tween(o, { t: 1 }, 0.42, "in", absorb); });
        } else w.after(0.2, () => w.tween(o, { x: tx, y: ty }, 0.5, "lin", absorb));
      },
      update(w, dt) {
        const o = w.orb, h = w.hero;
        if (o.fly) { // 곡선 경로 (2차 베지어)
          const t = o.t, u = 1 - t, cx = 380, cy = 30, tx = h.x + 10, ty = h.gy - 92;
          o.x = u * u * 410 + 2 * u * t * cx + t * t * tx; o.y = u * u * 150 + 2 * u * t * cy + t * t * ty;
        }
      },
      drawFloor(w, ctx) {
        backdrop(ctx, "#1d3577", "#060a18", 160);
        pedestal(ctx, 270, 286, 210, 36, "#0b1430", "120,170,255");
      },
      drawFront(w, ctx) {
        // 구슬: 계단식 빛 + 4단 명암 구 + 흰 하이라이트, 아래 그림자
        const o = w.orb; if (!o.alive || o.s <= 0) return;
        const bob = o.fly ? 0 : Math.round(Math.sin(w.time * 3) * 5), v = o.vib ? rand(-o.vib, o.vib) : 0;
        const x = o.x + v, y = o.y + bob + v * 0.6, r = 16 * o.s;
        if (!o.fly) { ctx.fillStyle = "#04060c"; ctx.beginPath(); ctx.ellipse(o.x, 286, 18 * o.s, 4, 0, 0, TAU); ctx.fill(); }
        glow(ctx, x, y, r * 2.6, "90,170,255", 0.6);
        for (const [k, c] of [[1, "#10318a"], [0.86, "#1f5fd8"], [0.66, "#4fa0ff"], [0.42, "#a8deff"]]) pxDisc(ctx, x + (1 - k) * r * 0.4, y - (1 - k) * r * 0.45, r * k, c);
        pxDisc(ctx, x - r * 0.35, y - r * 0.4, Math.max(1.5, r * 0.16), "#ffffff");
        // 구슬 둘레를 도는 작은 반짝이 2개
        for (let i = 0; i < 2; i++) { const a = w.time * 3 + i * Math.PI; pxPlus(ctx, x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 0.6, 3, "#cfeeff"); }
      },
      steps: [
        {
          id: "magnet", name: { en: "Magnet Pull", ko: "자석 끌림" }, param: "wobble .35 · arc .42",
          cap: { en: "*Wobble*, then *whip* it in on a curve.", ko: "*덜덜* 떨다가 곡선으로 *휙* 빨려 와요." },
          launch(w, o) { w.tween(o, { vib: 5 }, 0.35, "in"); },
          update(w) {
            const o = w.orb;
            if (o.fly) { w.spawn({ type: "glow", x: o.x, y: o.y, size: 12, size1: 0, life: 0.28, color: "120,190,255" }); if (Math.random() < 0.6) w.spawn({ type: "star", x: o.x + rand(-6, 6), y: o.y + rand(-6, 6), size: 4, life: 0.3, color: "200,235,255" }); }
          },
        },
        {
          id: "squash", name: { en: "Absorb Squash", ko: "흡수 찌그러짐" }, param: "stop 80ms · ×1.2",
          cap: { en: "*Freeze*, flash, *squash* the hero.", ko: "*멈칫*, 번쩍, 몸이 *꾹* 눌려요." },
          absorb(w, h) {
            w.hitstop(0.08);
            h.flash = 0.4; h.sx = 1.2; h.sy = 0.82;
          },
        },
        {
          id: "aura", name: { en: "Power Aura", ko: "힘의 오라" }, param: "1.8s · flames",
          cap: { en: "Wrap the hero in a *blazing aura*.", ko: "온몸에 *푸른 오라*가 활활." },
          absorb(w) { w.aura = 1.8; },
          update(w, dt) {
            if ((w.aura -= dt) <= 0) return;
            const h = w.hero, k = Math.min(1, w.aura);
            // 몸 둘레에서 솟는 픽셀 불꽃 (아래가 넓고 위로 갈수록 가늘게)
            for (let i = 0; i < 6; i++) { const hgt = rand(16, 34), wid = rand(4, 8), col = pick(["#1f4fc0", "#2f6fe0", "#5aa8ff", "#a8deff"]);
              w.spawn({ x: h.x + rand(-44, 44), y: h.gy - rand(0, 150), vy: rand(-300, -160), life: 0.5, draw: (ctx, p, kk) => { const s = 1 - kk; ctx.globalAlpha = k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p.x - wid * s, p.y); ctx.lineTo(p.x, p.y - hgt * s); ctx.lineTo(p.x + wid * s, p.y); ctx.lineTo(p.x, p.y + wid * 0.8 * s); ctx.closePath(); ctx.fill(); } }); }
          },
        },
        {
          id: "burst", name: { en: "Energy Burst", ko: "기운 폭발" }, param: "rings 3 · bolts 6",
          cap: { en: "Blast *rings* and *lightning* out.", ko: "*고리*가 퍼지고 *번개*가 튀어요." },
          absorb(w, h, x, y) {
            for (let i = 0; i < 3; i++) w.spawn({ type: "ring", flat: true, x, y: 286, size: 20, size1: 200 + i * 55, life: 0.6 + i * 0.15, w: 9, color: i ? "120,200,255" : "235,248,255" });
            w.spawn({ x, y, life: 0.2, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 60, k, "200,235,255") });
            w.spawn({ type: "rays", x, y, n: 12, size: 50, size1: 200, vr: 1, life: 0.9, color: "110,180,255" });
            bolts(w, x, y, 6, ["150,210,255", "255,255,255"]);
            w.shake(0.45);
          },
        },
        {
          id: "text", name: { en: "Stat Pop", ko: "능력치 팡" }, param: "text · stars 14",
          cap: { en: "Shout *POWER UP* and the stat *gain*.", ko: "*POWER UP*과 *오른 수치*를 크게." },
          absorb(w, h, x, y) {
            w.spawn({ type: "text", x: 300, y: 104, text: "POWER UP!", size: 33, color: "#8fd0ff", life: 1.9 });
            w.spawn({ type: "text", x: x + 100, y: y - 34, vy: -40, text: "ATK +50", size: 22, color: "#ffe066", life: 1.6 });
            starBurst(w, x, y, 14, ["140,200,255", "255,255,255", "255,230,120"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + rise + boom",
          cap: { en: "A *whoosh*, a rising *chord*, a *boom*.", ko: "*휘익*, 차오르는 *화음*, *쿵*." },
          launch(w) { w.play(() => nz({ type: "bandpass", f: 400, f2: 2600, q: 2, dur: 0.6, vol: 0.2 })); },
          absorb(w) { w.sfx.boost(); w.sfx.boom(); w.sfx.chime(5); },
        },
      ],
    },

    /* ───────── 2. 무기 단조 ───────── */
    {
      id: "spot-power-forge", cat: "sim", view: "3d",
      title: { en: "Make forging feel *red-hot*", ko: "대장간 망치질을 *뜨겁게*" },
      intro: { en: "Three hits. Just *tap, tap, tap*.", ko: "세 번 쳤는데 그냥 *톡, 톡, 톡*." },
      interval: 2.9, stepDur: 4.0,
      setup(w) {
        w.blade = { len: 150, th: 30, heat: 0.45, sheen: -1 };
        w.ham = { a: Math.PI + 0.55 };
      },
      fire(w) {
        const b = w.blade, hm = w.ham, HIT = Math.PI - 0.1;
        Object.assign(b, { len: 150, th: 30, heat: 0.45, sheen: -1 });
        const strike = (i) => {
          w.tween(hm, { a: Math.PI + 0.9 }, 0.2, "out", () => w.tween(hm, { a: HIT }, 0.08, "in", () => {
            b.len += 16; b.th -= 3;
            w.emit("strike", b, 310, 166, i);
            if (i < 2) w.after(0.1, () => strike(i + 1));
            else { w.emit("forged", b); w.after(0.25, () => w.tween(hm, { a: Math.PI + 0.55 }, 0.4, "out")); }
          }));
        };
        strike(0);
      },
      update(w, dt) { const b = w.blade; b.heat += (0.45 - b.heat) * Math.min(1, dt * 1.6); },
      drawFloor(w, ctx) {
        backdrop(ctx, "#5a2a10", "#120804", 200);
        pedestal(ctx, 270, 290, 200, 30, "#1c0d06", "255,150,80");
      },
      drawFront(w, ctx) {
        const b = w.blade, hm = w.ham;
        // 모루
        const st = ["#8a92a6", "#4c5468", "#2c3240"];
        ctx.fillStyle = st[2]; ctx.beginPath(); ctx.moveTo(200, 290); ctx.lineTo(340, 290); ctx.lineTo(330, 268); ctx.lineTo(210, 268); ctx.fill();
        ctx.fillStyle = st[1]; ctx.beginPath(); ctx.moveTo(232, 268); ctx.lineTo(308, 268); ctx.lineTo(296, 230); ctx.lineTo(244, 230); ctx.fill();
        ctx.fillStyle = st[1]; ctx.beginPath(); ctx.moveTo(180, 214); ctx.lineTo(372, 214); ctx.lineTo(360, 234); ctx.lineTo(196, 234); ctx.fill();
        ctx.fillStyle = st[0]; ctx.beginPath(); ctx.moveTo(176, 214); ctx.lineTo(372, 214); ctx.lineTo(386, 204); ctx.lineTo(190, 204); ctx.fill();
        ctx.fillStyle = st[1]; ctx.beginPath(); ctx.moveTo(190, 204); ctx.lineTo(176, 214); ctx.lineTo(116, 208); ctx.fill();
        ctx.fillStyle = st[2]; ctx.beginPath(); ctx.moveTo(176, 214); ctx.lineTo(196, 234); ctx.lineTo(116, 208); ctx.fill();
        // 칼날: 열기에 따라 색이 바뀜
        const heat = b.heat, col = heat > 0.7 ? mix3([255, 150, 40], [255, 245, 200], (heat - 0.7) / 0.3) : mix3([140, 50, 30], [255, 150, 40], (heat - 0.3) / 0.4);
        const x0 = 262 - b.len / 2, y = 204;
        if (heat > 0.5) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, y - 40, 50 + b.len * 0.6, "255,110,20", (heat - 0.45) * 0.9); ctx.globalCompositeOperation = "source-over"; }
        // 손잡이 + 칼날 (윗면 · 앞면 두 면, 가운데 능선)
        ctx.fillStyle = "#3a2618"; ctx.fillRect(x0 - 44, y - b.th / 2 - 6, 46, 12);
        ctx.fillStyle = "#6a4a2a"; ctx.fillRect(x0 - 44, y - b.th / 2 - 6, 46, 4);
        const tip = x0 + b.len + 34, top = y - b.th, D = 9;
        ctx.strokeStyle = "rgba(40,10,0,0.75)"; ctx.lineWidth = 2; ctx.lineJoin = "round";
        ctx.fillStyle = `rgb(${mix3(col.split(",").map(Number), [255, 255, 255], 0.35)})`; // 윗면
        ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + 8, top - D); ctx.lineTo(x0 + b.len + 6, top - D); ctx.lineTo(tip, y - b.th / 2); ctx.lineTo(x0 + b.len, top); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgb(${col})`; // 앞면
        ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + b.len, top); ctx.lineTo(tip, y - b.th / 2); ctx.lineTo(x0 + b.len, y); ctx.lineTo(x0, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(${mix3(col.split(",").map(Number), [60, 10, 0], 0.45)},0.8)`; // 아래 날 그늘
        ctx.beginPath(); ctx.moveTo(x0, y - b.th * 0.45); ctx.lineTo(x0 + b.len, y - b.th * 0.45); ctx.lineTo(tip, y - b.th / 2); ctx.lineTo(x0 + b.len, y); ctx.lineTo(x0, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(x0, top + 2, b.len, 3);
        if (b.sheen >= 0 && b.sheen <= 1) {
          ctx.save(); ctx.beginPath(); ctx.rect(x0, y - b.th - 12, b.len + 36, b.th + 14); ctx.clip();
          const sx = x0 + b.sheen * (b.len + 60) - 30;
          ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath(); ctx.moveTo(sx, y + 2); ctx.lineTo(sx + 18, y + 2); ctx.lineTo(sx + 40, y - b.th - 12); ctx.lineTo(sx + 22, y - b.th - 12); ctx.fill();
          ctx.restore();
        }
        // 망치: 오른쪽 위 손잡이 끝을 축으로 회전
        const px = 446, py = 150, L = 138, hx = px + Math.cos(hm.a) * L, hy = py + Math.sin(hm.a) * L;
        ctx.strokeStyle = "#6b4426"; ctx.lineWidth = 9; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(hm.a + Math.PI / 2);
        rr(ctx, -26, -16, 52, 32, 4, "#59606e"); rr(ctx, -26, -16, 52, 10, 4, "#9aa2b4");
        ctx.restore();
      },
      steps: [
        {
          id: "heat", name: { en: "Hot Metal", ko: "달아오른 쇠" }, param: "heat 1.0 → cool",
          cap: { en: "Each hit makes the metal *glow white-hot*.", ko: "칠 때마다 쇠가 *하얗게* 달아요." },
          strike(w, b) { b.heat = 1; },
        },
        {
          id: "stop", name: { en: "Impact Freeze", ko: "타격 멈춤" }, param: "stop 60ms · shake .3",
          cap: { en: "*Freeze* a beat on every blow.", ko: "칠 때마다 *딱* 멈춰요." },
          strike(w, b, x, y, i) {
            w.hitstop(i === 2 ? 0.12 : 0.06);
            w.shake(i === 2 ? 0.5 : 0.3); w.zoomPunch(0.05);
          },
        },
        {
          id: "sparks", name: { en: "Spark Spray", ko: "불똥 튀기" }, param: "sparks 22 · bits 6",
          cap: { en: "Spray *sparks* that bounce on the floor.", ko: "*불똥*이 튀고 바닥에서 *톡톡*." },
          strike(w, b, x, y) {
            sparks(w, x, y, 22, "255,190,80", [250, 650], -Math.PI, 0);
            shards(w, x, y, 6, ["255,200,90", "255,120,40"], 288);
          },
        },
        {
          id: "ring", name: { en: "Shock Ring", ko: "충격 고리" }, param: "ring · steam",
          cap: { en: "A *ring* on impact, a puff of *steam*.", ko: "때린 자리에 *고리*, *치익* 김." },
          strike(w, b, x, y) {
            w.spawn({ type: "ring", x, y, size: 8, size1: 70, life: 0.25, w: 8, color: "255,230,180" });
            w.spawn({ type: "ring", flat: true, x, y: y + 6, size: 10, size1: 130, life: 0.4, w: 8, color: "255,160,60" });
            for (let i = 0; i < 4; i++) w.spawn({ type: "smoke", x: x + rand(-20, 20), y, vy: rand(-90, -40), size: 8, size1: 24, life: 0.6, color: "200,190,180" });
          },
        },
        {
          id: "gleam", name: { en: "Forged Gleam", ko: "완성 광택" }, param: "sheen · rays · text",
          cap: { en: "Done! A *gleam* runs down the blade.", ko: "완성! 칼날에 *번쩍* 광이 흘러요." },
          forged(w, b) {
            w.after(0.15, () => w.tween(b, { sheen: 1.2 }, 0.5, "inout"));
            b.sheen = 0;
            w.spawn({ type: "rays", under: true, x: 270, y: 200, n: 12, size: 60, size1: 220, vr: 0.7, life: 1.8, hold: true, color: "255,190,90" });
            w.spawn({ type: "text", x: 230, y: 64, text: "FORGED +1", size: 28, color: "#ffc35a", life: 1.8 });
            starBurst(w, 300, 196, 10, ["255,220,120", "255,255,255"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clang ×3 + hiss",
          cap: { en: "Ringing *clang*, *clang*, then a *hiss*.", ko: "*깡*, *깡*, 마지막에 *치익*." },
          strike(w, b, x, y, i) {
            w.play(() => { tn({ type: "square", f: 1400 + i * 120, f2: 1300, dur: 0.22, vol: 0.12 }); nz({ type: "highpass", f: 3000, f2: 2000, q: 1, dur: 0.08, vol: 0.3 }); });
            w.sfx.thud();
          },
          forged(w) { w.play(() => nz({ type: "highpass", f: 4000, f2: 2500, q: 1, dur: 0.6, vol: 0.18 })); w.sfx.chime(4); },
        },
      ],
    },

    /* ───────── 3. 무기 마법 부여 ───────── */
    {
      id: "spot-power-enchant", cat: "rpg", view: "3d",
      title: { en: "Make enchanting feel *magical*", ko: "마법 부여를 *신비롭게*" },
      intro: { en: "Enchant done. It just turns *blue*.", ko: "마법을 걸었는데 그냥 *파래져요*." },
      interval: 2.9, stepDur: 4.0,
      setup(w) {
        w.sw = { runes: false, R: 110, ang: 0, spin: 0, fill: 0, edge: 0, scale: 1, ra: 1 };
      },
      fire(w) {
        const s = w.sw;
        Object.assign(s, { runes: true, R: 110, ang: 0, spin: 0, fill: 0, edge: 0, scale: 1, ra: 1 });
        const done = () => w.emit("enchant", s, 270, 150);
        const infuse = () => {
          s.runes = false;
          if (w.on("infuse")) { w.emit("infuse", s); w.tween(s, { fill: 1 }, 0.4, "in", done); } else { s.fill = 1; done(); }
        };
        if (w.on("orbit")) { w.emit("orbit", s); w.after(0.85, infuse); } else w.after(0.45, infuse);
      },
      update(w, dt) { w.sw.ang += w.sw.spin * dt; },
      drawFloor(w, ctx) {
        backdrop(ctx, "#3a2276", "#0a0618", 160);
        pedestal(ctx, 270, 290, 150, 26, "#140c2c", "180,140,255");
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(270, 290, 40, 7, 0, 0, TAU); ctx.fill();
      },
      drawFront(w, ctx) {
        const s = w.sw, art = swordArt(), bob = Math.sin(w.time * 2.4) * 5;
        const H = 236 * s.scale, W = 124 * s.scale, x = 270 - W / 2, y = 168 + bob - H / 2;
        const ring = (front) => {
          if (!s.runes) return;
          for (let i = 0; i < 6; i++) {
            const a = s.ang + i * TAU / 6, z = Math.sin(a);
            if ((z > 0) !== front) continue;
            rune(ctx, i, 270 + Math.cos(a) * s.R, 170 + bob + z * s.R * 0.28, 1.4 * (0.75 + 0.25 * z) * Math.min(1, s.R / 50 + 0.3), "200,170,255", s.ra * (0.55 + 0.45 * z));
          }
        };
        ring(false);
        if (s.edge > 0) { // 칼 테두리 발광: 하늘색 실루엣을 조금 크게, 더하기 합성
          const k = 1.1 + 0.04 * Math.sin(w.time * 8);
          ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.filter = "blur(6px)"; ctx.globalAlpha = 0.8;
          ctx.drawImage(art.cyan, 270 - W * k / 2, 168 + bob - H * k / 2, W * k, H * k);
          ctx.restore();
        }
        ctx.drawImage(art.c, x, y, W, H);
        if (s.fill > 0) { // 아래에서 위로 차오르는 얼음빛
          ctx.save(); ctx.beginPath(); ctx.rect(x - 5, y + H * (1 - s.fill), W + 10, H * s.fill + 5); ctx.clip();
          ctx.globalAlpha = 0.38; ctx.drawImage(art.cyan, x, y, W, H); ctx.restore();
        }
        ring(true);
      },
      steps: [
        {
          id: "orbit", name: { en: "Rune Orbit", ko: "룬 공전" }, param: "6 runes · spin 9",
          cap: { en: "Spin the *runes* in 3D, faster and *closer*.", ko: "*룬*이 입체로 돌며 *조여 와요*." },
          orbit(w, s) { w.tween(s, { spin: 9, R: 12 }, 0.85, "in"); },
        },
        {
          id: "infuse", name: { en: "Frost Infuse", ko: "냉기 주입" }, param: "fill 0.4s · wisps 18",
          cap: { en: "*Frost* climbs the blade from hilt to *tip*.", ko: "냉기가 손잡이부터 *끝까지* 차올라요." },
          infuse(w) {
            for (let i = 0; i < 18; i++) w.after(i * 0.02, () => w.spawn({ type: "spark", seek: true, x: 270 + rand(-80, 80), y: 280, tx: 270, ty: 70 + i * 4, life: 0.4, size: 3, color: pick(["120,230,255", "255,255,255"]) }));
          },
        },
        {
          id: "edge", name: { en: "Glow Edge", ko: "빛나는 날" }, param: "rim light · pulse",
          cap: { en: "Give the edge a cold *rim glow*.", ko: "칼날 테두리가 *은은히* 빛나요." },
          enchant(w, s) { s.edge = 1; },
          update(w) {
            if (w.sw.edge && Math.random() < 0.4) w.spawn({ type: "glow", x: 270 + rand(-14, 14), y: rand(70, 250), vy: -30, size: 5, life: 0.8, color: "160,240,255" });
          },
        },
        {
          id: "pulse", name: { en: "Flash Pulse", ko: "번쩍 맥동" }, param: "stop 100ms · ×1.2",
          cap: { en: "*Freeze*, flash, the sword *swells* and settles.", ko: "*멈칫*, 번쩍, 칼이 *부풀었다* 돌아와요." },
          enchant(w, s, x, y) {
            w.hitstop(0.1); w.flash("170,240,255", 0.23); w.shake(0.4);
            s.scale = 1.2; w.tween(s, { scale: 1 }, 0.45, "back");
            w.spawn({ type: "ring", x, y, size: 80, size1: 230, life: 0.45, w: 10, color: "160,230,255" });
          },
        },
        {
          id: "frost", name: { en: "Ice Burst", ko: "얼음 폭발" }, param: "shards 18 · rays",
          cap: { en: "Burst *ice shards*, light *rays*, the element *name*.", ko: "*얼음 조각*, *빛줄기*, 속성 이름 *팡*." },
          enchant(w, s, x, y) {
            shards(w, x, y, 18, ["200,245,255", "120,210,255", "160,230,255"], 292);
            w.spawn({ type: "rays", under: true, x, y, n: 14, size: 60, size1: 240, vr: 0.6, life: 1.9, hold: true, color: "130,220,255" });
            w.spawn({ type: "text", x, y: 50, text: "❄ FROST +40", size: 26, color: "#9fe8ff", life: 1.9 });
            starBurst(w, x, y, 10, ["200,240,255", "200,170,255"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hum + chime + crack",
          cap: { en: "A rising *hum*, icy *crack*, a *chime*.", ko: "차오르는 *웅~*, *쩡*, 맑은 *딩*." },
          orbit(w) { w.play(() => tn({ type: "sine", f: 220, f2: 880, dur: 0.85, vol: 0.14 })); },
          enchant(w) { w.sfx.crit(); w.sfx.chime(6); },
        },
      ],
    },

    /* ───────── 4. 회복 물약 마시기 ───────── */
    {
      id: "spot-power-potion", cat: "rpg", view: "3d",
      title: { en: "Make healing feel *refreshing*", ko: "회복 물약을 *시원하게*" },
      intro: { en: "Drink it. The bar just *jumps*.", ko: "마셨는데 체력 바만 *툭* 올라가요." },
      interval: 2.8, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 236, h: 160, gy: 286 });
        w.fl = { x: 0, y: 0, rot: 0, level: 1, on: true };
        w.hp = { v: 25, flash: 0 };
        w.wave = { t: 0, a: 0 };
        heroGreen();
      },
      fire(w) {
        const h = w.hero, f = w.fl, hp = w.hp, hx = h.x + 62, hy = h.gy - 84;
        Object.assign(f, { x: hx, y: hy, rot: 0, level: 1, on: true }); hp.v = 25;
        w.tween(f, { x: h.x + 34, y: h.gy - 150, rot: -2.3 }, 0.25, "out", () => {
          w.after(0.08, () => w.emit("gulp", h, f));
          w.after(0.32, () => w.emit("gulp", h, f));
          w.tween(f, { level: 0 }, 0.5, "lin", () => {
            f.on = false;
            if (w.on("fill")) w.tween(hp, { v: 100 }, 0.7, "out"); else hp.v = 100;
            w.emit("heal", h, h.x, h.gy - 80);
            w.after(1.5, () => { Object.assign(f, { x: hx, y: hy, rot: 0, level: 1, on: true }); w.tween(hp, { v: 25 }, 0.3, "in"); });
          });
        });
      },
      update(w, dt) { w.hp.flash = Math.max(0, w.hp.flash - dt * 2.5); },
      drawFloor(w, ctx) {
        backdrop(ctx, "#1d5a34", "#05140b", 170);
        pedestal(ctx, 270, 290, 190, 30, "#082214", "120,255,170");
      },
      drawFront(w, ctx) {
        const h = w.hero, f = w.fl, hp = w.hp, wv = w.wave;
        if (wv.a > 0) { // 발끝부터 머리까지 차오르는 초록빛
          const top = h.gy - h.h * wv.t;
          ctx.save(); ctx.beginPath(); ctx.rect(h.x - 100, top, 200, h.h * wv.t + 4); ctx.clip();
          ctx.globalAlpha = 0.55 * wv.a; ctx.drawImage(SPR["spot-power-hero-green"].c, h.x + h.ox - h.w / 2, h.gy - h.h, h.w, h.h);
          ctx.restore();
          ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(140,255,170,${0.8 * wv.a})`; ctx.fillRect(h.x - 46, top - 2, 92, 4); ctx.globalCompositeOperation = "source-over";
        }
        if (f.on) drawFlask(ctx, f.x, f.y, f.rot, f.level, 1.2);
        // 큰 체력 바
        const bx = 160, by = 64, bw = 220, bh = 18, k = hp.v / 100;
        rr(ctx, bx - 4, by - 4, bw + 8, bh + 8, 6, "rgba(0,0,0,0.7)");
        ctx.fillStyle = k < 0.4 ? "#ef4444" : "#3ddc6e"; ctx.fillRect(bx, by, bw * k, bh);
        if (hp.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${hp.flash})`; ctx.fillRect(bx, by, bw * k, bh); }
        label(ctx, `HP ${Math.round(hp.v)} / 100`, bx + bw / 2, by + bh / 2 + 1, 12, "#fff");
      },
      steps: [
        {
          id: "glug", name: { en: "Gulp Bounce", ko: "꿀꺽 바운스" }, param: "2 gulps · bubbles",
          cap: { en: "*Gulp, gulp*. The body bobs, bubbles rise.", ko: "*꿀꺽꿀꺽*, 몸이 들썩, 거품이 *보글*." },
          gulp(w, h, f) {
            h.sy = 1.1; h.sx = 0.93;
            for (let i = 0; i < 5; i++) w.spawn({ type: "glow", x: f.x + rand(-8, 8), y: f.y + rand(-8, 8), vy: rand(-120, -60), vx: rand(-30, 30), size: rand(4, 7), life: 0.5, color: "150,255,180" });
          },
        },
        {
          id: "wave", name: { en: "Green Wave", ko: "초록 물결" }, param: "0.6s · rings 4",
          cap: { en: "A *green wave* washes up from the feet.", ko: "발끝부터 *초록 물결*이 쭉 올라가요." },
          heal(w, h) {
            Object.assign(w.wave, { t: 0, a: 1 });
            w.tween(w.wave, { t: 1 }, 0.6, "out", () => w.tween(w.wave, { a: 0 }, 0.6, "in"));
            for (let i = 0; i < 4; i++) w.spawn({ type: "ring", flat: true, x: h.x, y: h.gy - i * 10, vy: -260, size: 50, size1: 70, life: 0.6, w: 5, color: "120,255,160" });
          },
        },
        {
          id: "fill", name: { en: "Bar Fill", ko: "바 차오르기" }, param: "0.7s ease · flash",
          cap: { en: "*Fill* the bar smoothly and *flash* it.", ko: "바가 *쭉* 차오르고 *반짝*." },
          heal(w) { w.hp.flash = 1; },
        },
        {
          id: "numbers", name: { en: "Heal Numbers", ko: "회복 숫자" }, param: "+75 · ticks ×4",
          cap: { en: "Pop a big *+75*, then small *ticks*.", ko: "큰 *+75*, 이어서 작은 숫자 *톡톡*." },
          heal(w, h, x, y) {
            w.spawn({ type: "text", x: x + 90, y: y - 40, vy: -25, text: "+75", size: 40, color: "#5dff8a", life: 1.6 });
            for (let i = 0; i < 4; i++) w.after(0.2 + i * 0.15, () => w.spawn({ type: "text", x: x - 64 - (i % 2) * 30, y: y + 30, vy: -150, text: "+12", size: 18, color: "#b8ffcb", life: 0.7 }));
          },
        },
        {
          id: "sparkle", name: { en: "Healing Sparkle", ko: "치유 반짝이" }, param: "plus ×14 · glow",
          cap: { en: "Float *plus signs* and a soft *glow*.", ko: "*십자 빛*이 둥실, 몸이 *은은하게*." },
          heal(w, h, x, y) {
            w.spawn({ type: "glow", under: true, x, y, size: 60, size1: 140, life: 1.4, color: "80,255,140" });
            for (let i = 0; i < 14; i++) w.spawn({ type: "text", under: true, x: x + rand(-70, 70), y: h.gy - rand(0, 40), vy: rand(-160, -80), text: "+", size: rand(14, 24), color: "#7dffa0", life: rand(0.8, 1.3) });
            starBurst(w, x, y, 8, ["150,255,180", "255,255,255"], 120, 260);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "glug ×2 + shimmer",
          cap: { en: "Two *glugs*, then a bright *shimmer*.", ko: "*꿀꺽* 두 번, 맑은 *띠링~*." },
          gulp(w) { w.play(() => tn({ type: "sine", f: 300, f2: 140, dur: 0.12, vol: 0.25 })); },
          heal(w) { w.sfx.chime(3); w.sfx.chime(7); w.sfx.boost(); },
        },
      ],
    },

    /* ───────── 5. 차원문 열기 ───────── */
    {
      id: "spot-power-portal", cat: "rpg", view: "3d",
      title: { en: "Make portals open with *awe*", ko: "차원문을 *압도적으로*" },
      intro: { en: "The portal opens. Just a *purple disc*.", ko: "문이 열렸는데 그냥 *보라 원판*." },
      interval: 3.0, stepDur: 4.0,
      setup(w) {
        w.pt = { open: 0, lit: 0, ang: 0, vortex: 0 };
      },
      fire(w) {
        const p = w.pt;
        Object.assign(p, { open: 0, lit: 0, vortex: 0 });
        const open = () => {
          if (!w.on("tear")) p.open = 1;
          if (!w.on("runes")) p.lit = 10;
          w.emit("open", p, 270, 170);
          w.after(1.7, () => w.tween(p, { open: 0, lit: 0 }, 0.3, "in"));
        };
        if (w.on("runes")) { w.emit("charge", p); w.after(0.7, open); } else w.after(0.2, open);
      },
      update(w, dt) { w.pt.ang += dt * 3; },
      drawFloor(w, ctx) {
        backdrop(ctx, "#5a1650", "#12040f", 165);
        pedestal(ctx, 270, 288, 200, 30, "#1e0619", "255,120,220");
      },
      drawFront(w, ctx) {
        const p = w.pt, cx = 270, cy = 170, RX = 80, RY = 108;
        // 안쪽: 열린 정도만큼
        if (p.open > 0.01) {
          const rx = RX * Math.min(1.1, p.open), ry = RY * Math.min(1.1, p.open);
          ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
          const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, ry);
          g.addColorStop(0, "#1a0420"); g.addColorStop(0.6, "#7a1fa0"); g.addColorStop(1, "#ff7ae0");
          ctx.fillStyle = g; ctx.fillRect(cx - RX - 10, cy - RY - 10, RX * 2 + 20, RY * 2 + 20);
          if (p.vortex) { // 소용돌이 팔
            ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
            for (let k = 0; k < 5; k++) {
              ctx.strokeStyle = `rgba(255,170,240,${0.55 * p.vortex})`; ctx.lineWidth = 5;
              ctx.beginPath();
              for (let t = 0; t < 1; t += 0.05) {
                const a = -p.ang * 1.6 + k * TAU / 5 + t * 4, r = t;
                ctx.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
              }
              ctx.stroke();
            }
          }
          ctx.restore();
        }
        // 돌 고리 + 룬 10개
        ctx.lineWidth = 22; ctx.strokeStyle = "#4a3a58"; ctx.beginPath(); ctx.ellipse(cx, cy, RX + 10, RY + 10, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = "#7d6a90"; ctx.beginPath(); ctx.ellipse(cx, cy, RX + 20, RY + 20, 0, 0, TAU); ctx.stroke();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * TAU / 10, x = cx + Math.cos(a) * (RX + 10), y = cy + Math.sin(a) * (RY + 10), on = Math.max(0, Math.min(1, p.lit - i));
          if (on > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, 20, "255,120,230", on * 0.8); ctx.globalCompositeOperation = "source-over"; }
          rune(ctx, i, x, y, 0.75, on > 0 ? "255,200,250" : "30,20,40", on > 0 ? 1 : 0.8);
        }
      },
      steps: [
        {
          id: "runes", name: { en: "Rune Ignite", ko: "룬 점화" }, param: "10 runes · 0.6s",
          cap: { en: "Light the *runes* one by one.", ko: "*룬*이 하나씩 *착착* 켜져요." },
          charge(w, p) {
            w.tween(p, { lit: 10 }, 0.6, "lin");
            suckIn(w, 270, 170, 16, ["255,140,230", "255,255,255"], 150, 200, 0.4);
          },
        },
        {
          id: "vortex", name: { en: "Vortex Spin", ko: "소용돌이" }, param: "5 arms · suck-in",
          cap: { en: "Spin a *vortex* inside that *pulls* things in.", ko: "안쪽에 *소용돌이*, 빛을 *빨아들여요*." },
          open(w, p) { p.vortex = 1; },
          update(w) {
            if (w.pt.open > 0.5 && Math.random() < 0.6) {
              const a = rand(0, TAU);
              w.spawn({ type: "spark", seek: true, x: 270 + Math.cos(a) * 200, y: 170 + Math.sin(a) * 160, tx: 270, ty: 170, life: 0.5, size: 2.5, color: "255,190,245" });
            }
          },
        },
        {
          id: "tear", name: { en: "Reality Tear", ko: "공간 찢기" }, param: "stop 100ms · back",
          cap: { en: "*Rip* it open with a *freeze* and lightning.", ko: "*멈칫*하고 번개와 함께 *쫙* 찢어져요." },
          open(w, p, x, y) {
            p.open = 0.05; w.tween(p, { open: 1 }, 0.4, "back");
            w.hitstop(0.1); w.shake(0.5); w.flash("255,190,250", 0.25);
            bolts(w, x, y, 7, ["255,160,240", "255,255,255"], 26);
          },
        },
        {
          id: "spill", name: { en: "Light Spill", ko: "빛 쏟아짐" }, param: "rays 16 · floor glow",
          cap: { en: "Let *light spill* out onto the floor.", ko: "*빛*이 바닥까지 *쏟아져요*." },
          open(w, p, x, y) {
            w.spawn({ type: "rays", under: true, x, y, n: 16, size: 90, size1: 300, vr: 0.4, life: 2, hold: true, color: "255,120,220" });
            w.spawn({ type: "ellipse", under: true, x, y: 288, size: 220, life: 2, hold: true, color: "255,120,230" });
            for (let i = 0; i < 3; i++) w.spawn({ type: "ring", flat: true, x, y: 288, size: 30, size1: 240 + i * 50, life: 0.7 + i * 0.15, w: 8, color: "255,170,240" });
          },
        },
        {
          id: "debris", name: { en: "Floating Debris", ko: "떠오르는 돌" }, param: "rocks 14 · rise",
          cap: { en: "Rocks *lift* off the floor toward it.", ko: "바닥 돌들이 *둥실* 떠올라요." },
          open(w, p, x) {
            for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: x + rand(-200, 200), y: 288 - rand(0, 10), vx: rand(-20, 20), vy: rand(-140, -60), g: -60, vr: rand(-3, 3), size: rand(4, 9), life: rand(1.6, 2.2), hold: true, color: pick(["120,100,140", "90,70,110", "170,150,190"]) });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ticks + tear + drone",
          cap: { en: "Rune *ticks*, a *tear*, a deep *drone*.", ko: "*틱틱틱*, *찌직*, 낮은 *웅웅*." },
          charge(w) { for (let i = 0; i < 5; i++) w.after(i * 0.12, () => w.sfx.tick()); },
          open(w) { w.sfx.boom(); w.sfx.magic(); w.play(() => tn({ type: "sawtooth", f: 70, f2: 55, dur: 1.4, vol: 0.12 })); },
        },
      ],
    },

    /* ───────── 6. 제작 성공 ───────── */
    {
      id: "spot-power-craft", cat: "sim", view: "3d",
      title: { en: "Make crafting feel *rewarding*", ko: "제작 성공을 *뿌듯하게*" },
      intro: { en: "Four items in. One *pops* out. Meh.", ko: "재료 넷이 들어가고 하나가 *툭* 나와요." },
      interval: 3.0, stepDur: 4.0,
      setup(w) {
        w.cr = { R: 120, ang: 0, spin: 0, items: true, res: 0, sx: 1, float: 0 };
      },
      fire(w) {
        const c = w.cr;
        Object.assign(c, { R: 120, ang: 0, spin: 0, items: true, res: 0, sx: 1, float: 0 });
        const fuse = () => {
          c.items = false; c.res = 1;
          w.emit("fuse", c, 270, 160);
          w.after(1.8, () => w.tween(c, { res: 0 }, 0.2, "in", () => {
            Object.assign(c, { items: true, R: 0, spin: 0, float: 0 }); w.tween(c, { R: 120 }, 0.35, "back");
          }));
        };
        if (w.on("orbit")) { w.emit("orbit", c); w.after(0.95, fuse); } else w.after(0.2, () => w.tween(c, { R: 0 }, 0.45, "lin", fuse));
      },
      update(w, dt) { w.cr.ang += w.cr.spin * dt; },
      drawFloor(w, ctx) {
        backdrop(ctx, "#4e4612", "#100e03", 160);
        pedestal(ctx, 270, 288, 190, 32, "#1c1904", "255,220,120");
        ctx.strokeStyle = "rgba(255,220,120,0.3)"; ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.moveTo(270, 288); ctx.lineTo(270 + Math.cos(a) * 130, 288 + Math.sin(a) * 22); ctx.stroke(); }
      },
      drawFront(w, ctx) {
        const c = w.cr, bob = Math.sin(w.time * 2.6) * 6;
        if (c.items) for (let i = 0; i < 4; i++) {
          const a = c.ang + i * TAU / 4, z = Math.sin(a), x = 270 + Math.cos(a) * c.R, y = 160 + z * c.R * 0.3 + bob * 0.5;
          drawGem(ctx, INGR[i], x, y, 23 * (0.8 + 0.2 * z));
        }
        if (c.res > 0) {
          const sx = c.float ? Math.cos(w.time * 3) : 1;
          drawAmulet(ctx, 270, 168 + (c.float ? bob : 0), c.res * 1.4, Math.abs(sx) < 0.15 ? 0.15 * Math.sign(sx || 1) : sx);
        }
      },
      steps: [
        {
          id: "orbit", name: { en: "Spiral In", ko: "나선 회전" }, param: "spin 12 · 0.95s",
          cap: { en: "Spin the parts and *spiral* them together.", ko: "재료가 빙글빙글 *나선*으로 모여요." },
          orbit(w, c) {
            w.tween(c, { spin: 12, R: 0 }, 0.95, "in");
            for (let i = 0; i < 20; i++) w.after(i * 0.045, () => w.spawn({ type: "glow", x: 270 + Math.cos(c.ang) * c.R, y: 160 + Math.sin(c.ang) * c.R * 0.3, size: 10, size1: 0, life: 0.35, color: "255,220,120" }));
          },
        },
        {
          id: "fuse", name: { en: "Fuse Pop", ko: "합체 팡" }, param: "stop 100ms · ×1.4",
          cap: { en: "*Freeze*, flash, the item *pops* big.", ko: "*멈칫*, 번쩍, 결과물이 *통* 커져요." },
          fuse(w, c) {
            w.hitstop(0.1); w.flash("255,250,220", 0.25); w.shake(0.35);
            c.res = 1.45; w.tween(c, { res: 1 }, 0.5, "back");
          },
        },
        {
          id: "float", name: { en: "Hover Spin", ko: "둥실 회전" }, param: "bob · Y spin",
          cap: { en: "Let it *hover* and *turn* to show off.", ko: "*둥실* 떠서 *빙그르* 뽐내요." },
          fuse(w, c) { c.float = 1; },
        },
        {
          id: "rays", name: { en: "Glory Rays", ko: "영광의 빛" }, param: "rays 14 · rings 3",
          cap: { en: "Golden *rays* behind, *rings* on the floor.", ko: "뒤로 *금빛 줄기*, 바닥엔 *고리*." },
          fuse(w, c, x, y) {
            w.spawn({ type: "rays", under: true, x, y, n: 14, size: 70, size1: 260, vr: 0.7, life: 1.75, hold: true, color: "255,210,90" });
            w.spawn({ type: "glow", under: true, x, y, size: 40, size1: 90, life: 1.75, hold: true, color: "255,160,60" });
            for (let i = 0; i < 3; i++) w.spawn({ type: "ring", flat: true, x, y: 288, size: 20, size1: 220 + i * 50, life: 0.6 + i * 0.15, w: 9, color: "255,220,120" });
          },
        },
        {
          id: "banner", name: { en: "Crafted Banner", ko: "완성 배너" }, param: "text · stars 16",
          cap: { en: "Shout *CRAFTED!* and name the item.", ko: "*CRAFTED!*, 아이템 이름까지 *팡*." },
          fuse(w, c, x, y) {
            w.spawn({ type: "text", x, y: 54, text: "CRAFTED!", size: 32, color: "#ffd45a", life: 1.75 });
            w.spawn({ type: "text", x, y: 258, text: "Amulet of Dawn", size: 17, color: "#e4c8ff", life: 1.75 });
            starBurst(w, x, y, 16, ["255,220,110", "255,255,255", "200,150,255"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whirl + pop + jingle",
          cap: { en: "A *whirl*, a *pop*, a happy *jingle*.", ko: "*휘리릭*, *뽕*, 신나는 *딴따단*." },
          orbit(w) { w.play(() => tn({ type: "triangle", f: 300, f2: 1200, dur: 0.95, vol: 0.12 })); },
          fuse(w) { w.sfx.pop(); w.sfx.fanfare(); },
        },
      ],
    },

    /* ───────── 7. 아이템 합성 (같은 등급 둘 → 상위 등급) ───────── */
    {
      id: "spot-power-fusion", cat: "rpg", view: "3d",
      title: { en: "Make item fusion feel *epic*", ko: "아이템 합성을 *짜릿하게*" },
      intro: { en: "Two gems merge. A bigger one *appears*.", ko: "보석 둘이 합쳐지고 큰 게 *짠*." },
      interval: 2.8, stepDur: 4.0,
      setup(w) {
        w.fu = { d: 110, two: true, s: 0, stars: 0 };
      },
      fire(w) {
        const f = w.fu;
        Object.assign(f, { d: 110, two: true, s: 0, stars: 0 });
        const merge = () => {
          f.two = false; f.s = 1; f.stars = 3;
          w.emit("merge", f, 270, 160);
          w.after(1.6, () => w.tween(f, { s: 0 }, 0.2, "in", () => { f.two = true; f.d = 0; w.tween(f, { d: 110 }, 0.35, "back"); }));
        };
        if (w.on("windup")) { w.emit("windup", f); w.after(0.62, merge); } else w.after(0.15, () => w.tween(f, { d: 0 }, 0.4, "lin", merge));
      },
      drawFloor(w, ctx) {
        backdrop(ctx, "#5c1420", "#140306", 160);
        pedestal(ctx, 270, 288, 200, 30, "#230609", "255,120,130");
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(270, 288, 60, 9, 0, 0, TAU); ctx.fill();
      },
      drawFront(w, ctx) {
        const f = w.fu, bob = Math.sin(w.time * 2.6) * 5;
        if (f.two) { drawGem(ctx, 1, 270 - f.d - 26, 160 + bob, 30); drawGem(ctx, 1, 270 + f.d + 26, 160 + bob, 30); }
        if (f.s > 0) {
          drawGem(ctx, 4, 270, 160 + bob, 54 * f.s);
          for (let i = 0; i < 3; i++) {
            const on = f.stars > i;
            ctx.fillStyle = on ? "#ffd34d" : "rgba(255,255,255,0.15)";
            starPath(ctx, 238 + i * 32, 238, 12); ctx.fill();
          }
        }
      },
      steps: [
        {
          id: "windup", name: { en: "Pull Back", ko: "뒤로 당기기" }, param: "back 30 · dash .18",
          cap: { en: "*Pull back*, then *dash* into each other.", ko: "뒤로 *쭉* 당겼다가 *쾅* 돌진." },
          windup(w, f) {
            w.tween(f, { d: 150 }, 0.42, "out", () => w.tween(f, { d: 0 }, 0.18, "in"));
            w.after(0.44, () => { for (const s of [-1, 1]) sparks(w, 270 + s * 150, 160, 8, "150,210,255", [300, 600], s < 0 ? Math.PI - 0.2 : -0.2, s < 0 ? Math.PI + 0.2 : 0.2); });
          },
        },
        {
          id: "clash", name: { en: "Clash Freeze", ko: "충돌 멈춤" }, param: "stop 140ms · bolts 8",
          cap: { en: "*Freeze* on contact. *Lightning* crackles.", ko: "부딪히는 순간 *멈칫*, *번개* 찌직." },
          merge(w, f, x, y) {
            w.hitstop(0.14); w.shake(0.55); w.flash("255,200,220", 0.25);
            bolts(w, x, y, 8, ["255,140,160", "255,200,230", "190,150,255"], 24);
          },
        },
        {
          id: "morph", name: { en: "Morph Bounce", ko: "변신 바운스" }, param: "×1.5 → 1 back",
          cap: { en: "The new gem *bursts* big, then *settles*.", ko: "새 보석이 *팡* 커졌다 *착* 자리 잡아요." },
          merge(w, f, x, y) {
            f.s = 1.5; w.tween(f, { s: 1 }, 0.5, "back");
            w.spawn({ type: "ring", x, y, size: 80, size1: 210, life: 0.45, w: 9, color: "200,140,255" });
          },
        },
        {
          id: "tier", name: { en: "Tier Up", ko: "등급 상승" }, param: "stars 1·2·3 · text",
          cap: { en: "Pop the *tier stars* in one by one.", ko: "*등급 별*이 하나씩 *톡톡톡*." },
          merge(w, f, x) {
            f.stars = 0;
            for (let i = 0; i < 3; i++) w.after(0.2 + i * 0.16, () => { f.stars = i + 1; starBurst(w, 238 + i * 32, 238, 5, ["255,220,90", "255,255,255"], 80, 200); });
            w.spawn({ type: "text", x, y: 56, text: "TIER UP!", size: 32, color: "#ff8fa8", life: 1.8 });
          },
        },
        {
          id: "shards", name: { en: "Shard Burst", ko: "파편 폭발" }, param: "shards 22 · rays",
          cap: { en: "Blow out *shards* and a *ray* fountain.", ko: "*파편*이 튀고 *빛줄기*가 솟아요." },
          merge(w, f, x, y) {
            shards(w, x, y, 22, ["120,200,255", "200,150,255", "255,255,255"], 294);
            w.spawn({ type: "rays", under: true, x, y, n: 14, size: 70, size1: 260, vr: -0.8, life: 1.8, hold: true, color: "255,110,150" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + crash + ding",
          cap: { en: "A *whoosh*, a *crash*, rising *dings*.", ko: "*슈욱*, *쨍강*, 올라가는 *띵띵띵*." },
          windup(w) { w.after(0.42, () => w.sfx.dash()); },
          merge(w) { w.sfx.crit(); for (let i = 0; i < 3; i++) w.after(0.2 + i * 0.16, () => w.sfx.chime(4 + i * 2)); },
        },
      ],
    },

    /* ───────── 8. 금고 문 열기 ───────── */
    {
      id: "spot-power-vault", cat: "rpg", view: "3d",
      title: { en: "Make vault doors feel *heavy*", ko: "금고 문을 *묵직하게*" },
      intro: { en: "Key in. The door just *slides open*.", ko: "열쇠 넣으니 문이 그냥 *스윽*." },
      interval: 3.4, stepDur: 4.2,
      setup(w) {
        w.vt = { kx: 120, krot: 0, key: true, wheel: 0, bolt: [1, 1, 1, 1, 1, 1, 1, 1], open: 0 };
      },
      fire(w) {
        const v = w.vt;
        Object.assign(v, { kx: 120, krot: 0, key: true, wheel: 0, bolt: [1, 1, 1, 1, 1, 1, 1, 1], open: 0 });
        const done = () => { w.emit("open", v, 270, 170); w.after(1.0, () => w.tween(v, { open: 0 }, 0.35, "in", () => v.bolt.fill(1))); };
        const swing = () => {
          w.emit("unseal", v);
          if (w.on("swing")) { w.emit("swing", v); w.tween(v, { open: 1 }, 0.8, "inout", done); } else w.tween(v, { open: 1 }, 0.4, "lin", done);
        };
        const unbolt = () => {
          if (w.on("bolts")) { for (let i = 0; i < 8; i++) w.after(i * 0.05, () => w.emit("bolt", v, i)); w.after(0.5, swing); } else { v.bolt.fill(0); swing(); }
        };
        w.tween(v, { kx: 0 }, 0.25, "out", () => {
          if (w.on("turn")) { w.emit("turn", v); w.after(0.35, unbolt); } else unbolt();
        });
      },
      drawFloor(w, ctx) {
        backdrop(ctx, "#2c3a4a", "#080b10", 170);
        // 벽 + 문틀
        ctx.fillStyle = "#1a222c"; ctx.fillRect(110, 30, 320, 262);
        ctx.fillStyle = "#121820"; ctx.fillRect(-80, 292, 700, 120);
        ctx.fillStyle = "#3a4656"; ctx.beginPath(); ctx.arc(270, 165, 122, 0, TAU); ctx.fill();
        // 금고 안쪽: 금빛 보물
        ctx.fillStyle = "#0c0a06"; ctx.beginPath(); ctx.arc(270, 165, 104, 0, TAU); ctx.fill();
        if (w.vt.open > 0) {
          ctx.save(); ctx.beginPath(); ctx.arc(270, 165, 104, 0, TAU); ctx.clip();
          const g = ctx.createRadialGradient(270, 200, 10, 270, 190, 130); g.addColorStop(0, `rgba(255,200,90,${w.vt.open})`); g.addColorStop(1, "rgba(80,50,10,0)");
          ctx.fillStyle = g; ctx.fillRect(160, 60, 220, 220);
          ctx.fillStyle = "#e0a52c";
          for (const [x, y, r] of [[230, 250, 44], [300, 255, 50], [265, 235, 34]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, Math.PI, TAU); ctx.fill(); }
          ctx.restore();
        }
      },
      drawFront(w, ctx) {
        const v = w.vt, sx = Math.cos(v.open * 1.35), edge = Math.sin(v.open * 1.35) * 22;
        ctx.save();
        ctx.translate(166, 0); ctx.scale(Math.max(0.02, sx), 1); ctx.translate(-166, 0);
        // 빗장: 문 밖으로 나온 정도 bolt (1 = 잠김)
        for (let i = 0; i < 8; i++) {
          const a = i * TAU / 8, r0 = 84, r1 = r0 + 14 + 22 * v.bolt[i];
          ctx.strokeStyle = "#c8ccd4"; ctx.lineWidth = 12; ctx.lineCap = "butt";
          ctx.beginPath(); ctx.moveTo(270 + Math.cos(a) * r0, 165 + Math.sin(a) * r0); ctx.lineTo(270 + Math.cos(a) * r1, 165 + Math.sin(a) * r1); ctx.stroke();
        }
        const g = ctx.createRadialGradient(240, 130, 10, 270, 165, 104);
        g.addColorStop(0, "#9aa6b8"); g.addColorStop(1, "#4a5566");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(270, 165, 100, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#2c3440"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(270, 165, 82, 0, TAU); ctx.stroke();
        // 바퀴 손잡이
        ctx.save(); ctx.translate(270, 165); ctx.rotate(v.wheel);
        ctx.strokeStyle = "#d9b45a"; ctx.lineWidth = 7; ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) { const a = i * TAU / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 46, Math.sin(a) * 46); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#3a2c10"; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
        ctx.restore();
        // 열쇠 구멍 + 열쇠
        ctx.fillStyle = "#151a20"; ctx.beginPath(); ctx.arc(270, 225, 7, 0, TAU); ctx.fill(); ctx.fillRect(267, 225, 6, 14);
        ctx.restore();
        if (edge > 1) { ctx.fillStyle = "#2c3440"; ctx.fillRect(166 - edge, 65, edge, 200); }
        if (v.key && v.open < 0.05) {
          ctx.save(); ctx.translate(270 + v.kx, 230); ctx.rotate(v.krot);
          ctx.fillStyle = "#f2c24a"; ctx.strokeStyle = "#8a5c10"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(52, 0, 15, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillRect(0, -4, 40, 8); ctx.fillRect(4, 4, 6, 8); ctx.fillRect(14, 4, 5, 6);
          ctx.fillStyle = "#3a2810"; ctx.beginPath(); ctx.arc(52, 0, 6, 0, TAU); ctx.fill();
          ctx.restore();
        }
      },
      steps: [
        {
          id: "turn", name: { en: "Key Turn", ko: "열쇠 돌리기" }, param: "90° · wheel spin",
          cap: { en: "*Turn* the key. The wheel *spins*.", ko: "열쇠를 *철컥* 돌리면 바퀴가 *휙*." },
          turn(w, v) {
            w.tween(v, { krot: Math.PI / 2 }, 0.15, "back");
            w.tween(v, { wheel: Math.PI * 1.5 }, 0.35, "inout");
          },
        },
        {
          id: "bolts", name: { en: "Bolt Retract", ko: "빗장 풀림" }, param: "8 bolts · 50ms each",
          cap: { en: "Pull the *bolts* one by one, *clack-clack*.", ko: "빗장이 하나씩 *철컥철컥* 빠져요." },
          bolt(w, v, i) {
            w.tween(v.bolt, { [i]: 0 }, 0.08, "in");
            const a = i * TAU / 8;
            sparks(w, 270 + Math.cos(a) * 100, 165 + Math.sin(a) * 100, 4, "255,220,150", [100, 240]);
            w.shake(0.12);
          },
        },
        {
          id: "unseal", name: { en: "Pressure Hiss", ko: "압력 해제" }, param: "steam 16 · ring",
          cap: { en: "Break the seal with a burst of *steam*.", ko: "봉인이 풀리며 *피식* 김이 새요." },
          unseal(w) {
            for (let i = 0; i < 16; i++) {
              const a = i * TAU / 16;
              w.spawn({ type: "smoke", x: 270 + Math.cos(a) * 104, y: 165 + Math.sin(a) * 104, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220 - 30, drag: 4, size: 4, size1: 18, life: 0.55, color: "150,170,190" });
            }
            w.spawn({ type: "ring", x: 270, y: 165, size: 104, size1: 160, life: 0.4, w: 8, color: "200,230,255" });
          },
        },
        {
          id: "swing", name: { en: "Heavy Swing", ko: "묵직한 열림" }, param: "0.8s inout · thud",
          cap: { en: "Swing it *slow and heavy*. *Thud* at the end.", ko: "*천천히 묵직하게*, 끝에서 *쿵*." },
          swing(w) { w.after(0.78, () => { w.shake(0.45); dust(w, 150, 288, 10, -1, "110,120,135"); }); },
        },
        {
          id: "light", name: { en: "Treasure Light", ko: "보물 빛" }, param: "rays 16 · glints",
          cap: { en: "*Gold light* floods out. Coins *glint*.", ko: "*금빛*이 쏟아지고 동전이 *반짝*." },
          open(w, v, x, y) {
            w.spawn({ type: "rays", under: true, x, y, n: 16, size: 90, size1: 320, vr: 0.4, life: 1.6, hold: true, color: "255,200,90" });
            w.spawn({ type: "ellipse", under: true, x, y: 300, size: 260, life: 1.6, hold: true, color: "255,190,80" });
            for (let i = 0; i < 10; i++) w.after(i * 0.08, () => w.spawn({ type: "star", x: x + rand(-70, 70), y: y + rand(30, 85), size: rand(6, 11), life: 0.5, color: "255,240,180" }));
            w.spawn({ type: "text", x, y: 50, text: "VAULT OPEN", size: 28, color: "#ffd166", life: 1.6 });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clicks + hiss + creak",
          cap: { en: "*Clicks*, a *hiss*, a long *creak*, *boom*.", ko: "*철컥*, *피식*, *끼이익*, *쿵*." },
          bolt(w) { w.sfx.clickDown(); },
          unseal(w) { w.play(() => nz({ type: "highpass", f: 3000, f2: 1500, q: 1, dur: 0.5, vol: 0.2 })); w.sfx.creak(); },
          open(w) { w.sfx.slam(); w.sfx.chime(5); },
        },
      ],
    },

    /* ───────── 9. 스킬 트리 노드 해금 ───────── */
    {
      id: "spot-power-skill", cat: "rpg", view: "ui",
      title: { en: "Make skill unlocks feel *earned*", ko: "스킬 해금을 *뿌듯하게*" },
      intro: { en: "Skill unlocked. The icon just *turns on*.", ko: "스킬을 찍었는데 아이콘만 *딸깍*." },
      interval: 2.9, stepDur: 4.0,
      setup(w) {
        w.sk = { lit: 0, charge: 0, flow: 0, s: 1, spread: 0, vib: 0 };
      },
      fire(w) {
        const k = w.sk;
        Object.assign(k, { lit: 0, charge: 0, flow: 0, s: 1, spread: 0, vib: 0 });
        const unlock = () => { k.lit = 1; k.vib = 0; w.emit("unlock", k, 270, 165); w.after(1.6, () => Object.assign(k, { lit: 0, flow: 0, spread: 0, charge: 0 })); };
        const flow = () => { if (w.on("flow")) w.tween(k, { flow: 1 }, 0.3, "in", unlock); else { k.flow = 1; unlock(); } };
        if (w.on("charge")) { w.emit("charge", k); w.after(0.65, flow); } else w.after(0.2, flow);
      },
      drawFloor(w, ctx) {
        backdrop(ctx, "#0f4a4c", "#03100f", 165);
        ctx.strokeStyle = "rgba(120,255,240,0.06)"; ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(270, 165, 40 + i * 45, 0, TAU); ctx.stroke(); }
      },
      drawFront(w, ctx) {
        const k = w.sk, T = [270, 165], R = [270, 290], C = [[160, 72], [380, 72]], S = [[130, 210], [410, 210]];
        const line = (a, b, on, t = 1) => {
          ctx.lineCap = "round";
          ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 12;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          if (on && t > 0) {
            const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
            ctx.strokeStyle = "#45f0d8"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(x, y); ctx.stroke();
            if (t < 1) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, 30, "160,255,240", 1); ctx.globalCompositeOperation = "source-over"; }
          }
        };
        for (const s of S) line(R, s, false);
        line(R, T, true, k.flow);
        for (const c of C) line(T, c, k.spread > 0, k.spread);
        const node = (x, y, r, state, icon) => { // state: 0 잠김, 1 열 수 있음, 2 해금
          ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(x + 3, y + 6, r + 2, 0, TAU); ctx.fill();
          ctx.fillStyle = state === 2 ? "#127a6e" : "#1b2426"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = state === 2 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)"; ctx.beginPath(); ctx.arc(x, y - r * 0.25, r * 0.72, Math.PI, 0); ctx.fill();
          ctx.lineWidth = r > 30 ? 6 : 5; ctx.strokeStyle = state === 2 ? "#7dfbe8" : state === 1 ? `rgba(125,251,232,${0.5 + 0.4 * Math.sin(w.time * 10)})` : "#3a4648"; ctx.stroke();
          if (icon) { // 번개 아이콘
            ctx.fillStyle = state === 2 ? "#ffffff" : "#4a5658";
            ctx.beginPath(); ctx.moveTo(x + r * 0.15, y - r * 0.6); ctx.lineTo(x - r * 0.35, y + r * 0.08); ctx.lineTo(x - r * 0.02, y + r * 0.08); ctx.lineTo(x - r * 0.15, y + r * 0.6); ctx.lineTo(x + r * 0.35, y - r * 0.08); ctx.lineTo(x + r * 0.02, y - r * 0.08); ctx.closePath(); ctx.fill();
          }
        };
        node(R[0], R[1], 28, 2, true);
        for (const s of S) node(s[0], s[1], 26, 0, true);
        for (const c of C) node(c[0], c[1], 30, k.spread >= 1 ? 1 : 0, true);
        if (k.charge > 0 && !k.lit) {
          ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 8; ctx.lineCap = "round";
          ctx.beginPath(); ctx.arc(T[0], T[1], 62, -Math.PI / 2, -Math.PI / 2 + TAU * k.charge); ctx.stroke();
        }
        const v = k.vib ? rand(-k.vib, k.vib) : 0;
        node(T[0] + v, T[1], 50 * k.s, k.lit ? 2 : 0, true);
      },
      steps: [
        {
          id: "charge", name: { en: "Hold Charge", ko: "길게 누르기" }, param: "ring 0.6s · shake",
          cap: { en: "Fill a *ring* while the node *trembles*.", ko: "*고리*가 차오르며 노드가 *덜덜*." },
          charge(w, k) {
            w.tween(k, { charge: 1, vib: 3 }, 0.6, "in");
            suckIn(w, 270, 165, 18, ["120,255,230", "255,240,150"], 90, 140, 0.35);
          },
        },
        {
          id: "flow", name: { en: "Energy Flow", ko: "에너지 흐름" }, param: "pulse 0.3s",
          cap: { en: "Run *energy* up the line into the node.", ko: "선을 타고 *에너지*가 쭉 올라와요." },
          unlock(w, k, x, y) { w.spawn({ type: "glow", x, y, size: 40, size1: 90, life: 0.3, color: "120,255,230" }); },
        },
        {
          id: "pop", name: { en: "Unlock Pop", ko: "해금 팡" }, param: "stop 90ms · ×1.45",
          cap: { en: "*Freeze*, flash, the node *pops* big.", ko: "*멈칫*, 번쩍, 노드가 *통* 커져요." },
          unlock(w, k, x, y) {
            w.hitstop(0.09); w.flash("200,255,245", 0.2); w.shake(0.3);
            k.s = 1.45; w.tween(k, { s: 1 }, 0.45, "back");
            w.spawn({ type: "ring", x, y, size: 50, size1: 190, life: 0.45, w: 10, color: "150,255,235" });
            starBurst(w, x, y, 10, ["150,255,235", "255,255,255"]);
          },
        },
        {
          id: "spread", name: { en: "Path Reveal", ko: "다음 길 열기" }, param: "lines 0.5s · blink",
          cap: { en: "Light the *next paths* so you want more.", ko: "*다음 길*까지 불이 켜져요." },
          unlock(w, k) { w.after(0.15, () => w.tween(k, { spread: 1 }, 0.5, "out")); },
        },
        {
          id: "banner", name: { en: "Skill Banner", ko: "스킬 배너" }, param: "rays · name tag",
          cap: { en: "*Rays* behind, the skill *name* up front.", ko: "뒤엔 *빛줄기*, 앞엔 스킬 *이름*." },
          unlock(w, k, x, y) {
            w.spawn({ type: "rays", under: true, x, y, n: 12, size: 50, size1: 200, vr: 0.8, life: 1.7, hold: true, color: "90,240,220" });
            w.spawn({ type: "text", x, y: 240, text: "CHAIN LIGHTNING", size: 22, color: "#bffcf2", life: 1.7 });
            w.spawn({ type: "text", x, y: 98, vy: -20, text: "UNLOCKED!", size: 30, color: "#ffe066", life: 1.5 });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge + zap + ding",
          cap: { en: "Rising *charge*, an electric *zap*, a *ding*.", ko: "차오르는 *웅*, *파직*, 맑은 *딩*." },
          charge(w) { w.sfx.charge(); },
          unlock(w) { w.sfx.magic(); w.sfx.chime(6); },
        },
      ],
    },
  );
})();

"use strict";
/* fighting — 2D 격투 게임 레시피 30편 */
(() => {
  /* ───── 공용 도우미 (이 파일 안에서만) ───── */
  const HX = 190, FX = 350;
  // 주인공(왼쪽) vs 고블린(오른쪽), 격투 거리
  const duel = (w, o = {}) => {
    w.hero = w.actor("hero", { home: o.hx || HX });
    w.hero.maxHp = w.hero.hp = w.hero.hpLag = 100;
    w.foe = w.actor("foe", { home: o.fx || FX });
    w.k = 0;
  };
  // 맞는 자리 (고블린 몸 앞쪽)
  const cp = (w, y = 82) => ({ x: w.foe.x + w.foe.ox - 44, y: w.foe.gy + w.foe.oy - y });
  // 체력 깎기. floor 아래로 내려가면 잠시 뒤 다시 채움 (KO 레시피는 floor 0)
  const hurt = (w, a, n, floor = 22) => {
    a.hp = Math.max(0, a.hp - n); a.lagWait = 0.35;
    if (floor && a.hp <= floor && !a.refill) { a.refill = true; w.after(0.9, () => { a.hp = a.hpLag = a.maxHp; a.refill = false; }); }
  };
  const tick = (w, dt) => {
    lagBar(w.hero, dt); lagBar(w.foe, dt);
    // 주먹이 너무 빨리 들어가지 않게 (맨 그림에서도 보이도록)
    for (const a of [w.hero, w.foe]) if (Math.abs(a.ox) > 4 && a.k > 7) a.k = 7;
  };
  // 공중 몸: vy·vx 로 움직이고 땅에 닿으면 true
  const body = (a, dt, g = 2000) => {
    if (!a.air) return false;
    a.vy += g * dt; a.oy += a.vy * dt; a.x += (a.vx || 0) * dt;
    if (a.oy >= 0 && a.vy > 0) { a.oy = 0; a.vy = 0; a.vx = 0; a.air = false; return true; }
    return false;
  };
  const burst = (w, x, y, col, s = 1) => {
    w.spawn({ type: "star", x, y, size: 44 * s, life: 0.18, color: "255,255,255" });
    w.spawn({ type: "glow", x, y, size: 64 * s, size1: 12, life: 0.3, color: col });
    w.spawn({ type: "ring", x, y, size: 8, size1: 62 * s, life: 0.34, w: 7 * s, color: col });
    for (let i = 0; i < 6 * s; i++) w.spawn({ type: "spark", x, y, vx: rand(-260, 260) * s, vy: rand(-320, -60) * s, g: 900, drag: 1.5, size: 2.5, life: rand(0.45, 0.7), color: col });
  };
  const pop = (w, text, x, y, size = 26, color = "#fff", life = 0.8) =>
    w.spawn({ type: "text", text, x, y, vy: -60, drag: 2.5, life, size, color });
  const ghost = (w, a, life = 0.3, tint = "cyan", al = 0.5) =>
    w.spawn({ type: "ghost", img: a.s[tint], x: a.x + a.ox, y: a.gy + a.oy, w: a.w * a.sx, h: a.h * a.sy, life, alpha0: al });
  const lines = (w, x, y, n, dir, col = "255,255,255", spread = 50) => {
    for (let i = 0; i < n; i++) w.spawn({ type: "slash", x: x + rand(-30, 30), y: y + rand(-spread, spread), ang: dir, len: rand(30, 60), size: 3, life: rand(0.14, 0.24), color: col });
  };
  // 큰 글자 (배너)
  const big = (ctx, t, x, y, size, col, sc = 1, a = 1, rot = -0.06) => {
    if (a <= 0 || sc <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, a);
    ctx.font = `italic 900 ${size}px Pretendard, "Apple SD Gothic Neo", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.lineWidth = size * 0.18; ctx.strokeStyle = "rgba(10,12,20,0.95)"; ctx.strokeText(t, 0, 0);
    ctx.fillStyle = col; ctx.fillText(t, 0, 0); ctx.restore();
  };
  // 격투 게임 체력바: 가운데 타이머 기준 좌우, 깎이면 바깥쪽부터 비어요
  const BY = 42, BH = 14;
  const lifeBar = (ctx, a, x0, x1, dir, col, lagCol) => {
    const bw = x1 - x0, f = Math.max(0, a.hp) / a.maxHp, l = Math.max(0, a.hpLag) / a.maxHp;
    const sx = a.barShake > 0 ? rand(-3, 3) : 0;
    ctx.save(); ctx.translate(sx, 0);
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.beginPath(); ctx.roundRect(x0 - 3, BY - 3, bw + 6, BH + 6, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(x0, BY, bw, BH);
    const seg = (t, c) => { const ww = bw * Math.max(0, Math.min(1, t)); ctx.fillStyle = c; ctx.fillRect(dir < 0 ? x1 - ww : x0, BY, ww, BH); };
    seg(l, lagCol || "#ef4444"); seg(f, col || "#facc15");
    ctx.fillStyle = "rgba(255,255,255,0.28)"; const ww = bw * f; ctx.fillRect(dir < 0 ? x1 - ww : x0, BY, ww, 4);
    ctx.restore();
  };
  const hud = (w, ctx, o = {}) => {
    ctx.save(); ctx.translate(w.cam.x, w.cam.y);
    lifeBar(ctx, w.hero, 40, 248, -1, o.hcol, o.hlag);
    lifeBar(ctx, w.foe, 292, 500, 1, o.fcol, o.flag);
    rr(ctx, 252, 32, 36, 32, 6, "rgba(0,0,0,0.75)");
    label(ctx, o.timer != null ? o.timer : "99", 270, 49, 20, o.tcol || "#fff", "center", "'JetBrains Mono', monospace", 800);
    label(ctx, "P1", 42, 68, 11, "rgba(255,255,255,0.55)", "left", "'JetBrains Mono', monospace", 700);
    label(ctx, "P2", 498, 68, 11, "rgba(255,255,255,0.55)", "right", "'JetBrains Mono', monospace", 700);
    ctx.restore();
  };
  // 아래쪽 슈퍼 게이지 (칸 3개)
  const MX0 = 150, MX1 = 390, MY = 306;
  const meterAt = v => MX0 + (MX1 - MX0) * Math.max(0, Math.min(1, v));
  const arrowG = (ctx, ang, x, y, s, col) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * 0.22; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.2, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.55, 0); ctx.lineTo(s * 0.05, -s * 0.38); ctx.lineTo(s * 0.05, s * 0.38); ctx.closePath(); ctx.fill(); ctx.restore();
  };
  const standUp = w => w.tween(w.foe, { x: w.foe.home }, 0.3, "inout", () => { w.busy = false; });
  // 선택·VS 화면용 캐릭터 6명 (석고상 사람 4색 + 고블린 2색)
  const CAST = [
    { name: "STONE", m: "h", l: [246, 244, 240], d: [70, 70, 80] },
    { name: "EMBER", m: "h", l: [252, 165, 165], d: [90, 30, 30] },
    { name: "TIDE", m: "h", l: [147, 197, 253], d: [25, 45, 95] },
    { name: "GILT", m: "h", l: [253, 230, 138], d: [100, 70, 20] },
    { name: "ENEMY", m: "g", l: [150, 205, 95], d: [32, 56, 26] },
    { name: "HEX", m: "g", l: [196, 181, 253], d: [45, 30, 90] },
  ];
  const roster = () => CAST.forEach((c, i) => c.m === "h"
    ? polySprite("fighting-c" + i, humanModel, 170, 260, -0.72, 0.3, c.l, c.d)
    : polySprite("fighting-c" + i, goblinModel, 210, 210, 0.62, 0.3, c.l, c.d));
  // 초상: 위쪽(머리·상체)이 보이게 크게 그림. dim 이면 어둡게
  const drawPortrait = (ctx, i, cx, top, hgt, dim) => {
    const c = SPR["fighting-c" + i].c, wd = hgt * c.width / c.height;
    ctx.drawImage(c, cx - wd / 2, top, wd, hgt);
    if (dim) { ctx.fillStyle = "rgba(18,19,24,0.45)"; ctx.fillRect(cx - wd / 2, top, wd, hgt); }
  };
  const cell = i => ({ x: 214 + (i % 3) * 96, y: 100 + Math.floor(i / 3) * 104 });
  // 장풍: glow 가 켜지면 하얀 핵 + 색 번짐
  const orb = (ctx, p) => {
    if (!p.glow) { ctx.fillStyle = `rgb(${p.col})`; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, TAU); ctx.fill(); return; }
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, p.x, p.y, 32 * (1 + 0.15 * Math.sin(p.age * 40)), p.col, 1); glow(ctx, p.x, p.y, 13, "255,255,255", 0.9);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill();
  };
  const swish = w => w.play(() => nz({ type: "bandpass", f: 1400, f2: 3800, q: 1.4, dur: 0.09, vol: 0.18 }));
  // 기본 동작: 몸이 앞으로 나가면 팔(주먹)도 쭉 뻗어요. 효과 없이도 "때렸다"가 보이게
  const limb = (ctx, a, dir, light, dark) => {
    const reach = Math.min(70, dir * a.ox * 2.2);
    if (reach < 12 || !a.alive || a.alpha <= 0 || Math.abs(a.rot) > 0.3) return;
    const x = a.x + a.ox + dir * 16, y = a.gy + a.oy - a.h * 0.6 * a.sy;
    ctx.save(); ctx.fillStyle = light; ctx.strokeStyle = dark; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.roundRect(dir > 0 ? x : x - reach, y - 6, reach, 12, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(dir > 0 ? x + reach - 6 : x - reach - 14, y - 11, 20, 22, 6); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  const arms = (w, ctx) => {
    if (!w.hero || !w.foe || w.hero.key !== "hero") return;
    limb(ctx, w.hero, 1, "#ece9e2", "#55565f");
    limb(ctx, w.foe, -1, "#8cc35a", "#2c4520");
  };

  RECIPES.push(
    /* 1 ─ 맞기 / 막기 / 카운터 */
    {
      id: "fighting-hit-block-counter", cat: "fighting", view: "side", polished: true, melee: true,
      title: { en: "Make hit, block, counter *read apart*", ko: "맞기·막기·카운터를 *한눈에*" },
      intro: { en: "Hit? Blocked? Counter? *Can't tell.*", ko: "맞은 건지 막은 건지 *모르겠어요*." },
      interval: 0.7, stepDur: 3.8,
      setup(w) { duel(w); },
      fire(w) {
        const kind = ["hit", "block", "counter"][w.k++ % 3];
        w.hero.ox = 36;
        w.after(0.05, () => {
          const p = cp(w);
          hurt(w, w.foe, kind === "block" ? 2 : kind === "hit" ? 10 : 18);
          w.foe.ox += kind === "block" ? 6 : 16;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit(kind, p);
        });
      },
      update(w, dt) { tick(w, dt); },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "hitspark", name: { en: "Hit Spark", ko: "맞기 불꽃" }, param: "orange · 10 sparks",
          cap: { en: "A clean hit bursts *orange*, sparks fly *forward*.", ko: "제대로 맞으면 *주황* 불꽃이 앞으로 *팍*." },
          hit(w, p) {
            burst(w, p.x, p.y, "255,170,60");
            sparks(w, p.x, p.y, 10, "255,210,120", [220, 560], -0.8, 0.8);
          },
        },
        {
          id: "guard", name: { en: "Guard Spark", ko: "막기 불꽃" }, param: "blue ring · bounce",
          cap: { en: "A block flashes *blue* and bounces *back*.", ko: "막으면 *파랗게* 튕겨 나와요." },
          block(w, p) {
            w.spawn({ type: "ring", x: p.x + 10, y: p.y, size: 30, size1: 46, life: 0.25, w: 9, color: "96,165,250" });
            w.spawn({ type: "glow", x: p.x + 10, y: p.y, size: 50, size1: 20, life: 0.2, color: "96,165,250" });
            sparks(w, p.x, p.y, 8, "191,219,254", [200, 420], Math.PI - 0.9, Math.PI + 0.9);
          },
        },
        {
          id: "counter", name: { en: "Counter Burst", ko: "카운터 폭발" }, param: "red · ×1.7 · text",
          cap: { en: "A counter is *red*, *bigger*, and *says so*.", ko: "카운터는 *빨갛고*, *크고*, 글자까지." },
          counter(w, p) {
            burst(w, p.x, p.y, "255,60,60", 1.7);
            sparks(w, p.x, p.y, 16, "255,140,140", [260, 700]);
            pop(w, "COUNTER!", p.x, p.y - 70, 30, "#f87171");
          },
        },
        {
          id: "stop", name: { en: "Stop by Type", ko: "멈칫도 다르게" }, param: "4f · 2f · 10f",
          cap: { en: "Hit *pauses*, block *barely*, counter *holds long*.", ko: "맞기는 *멈칫*, 막기는 *살짝*, 카운터는 *길게*." },
          hit(w) { w.hitstop(0.07); w.foe.vib = 5; },
          block(w) { w.hitstop(0.035); },
          counter(w) { w.hitstop(0.17); w.foe.vib = 9; },
        },
        {
          id: "react", name: { en: "Body Reaction", ko: "몸 반응" }, param: "flinch / slide / reel",
          cap: { en: "Hit *flinches*, block *slides*, counter *reels*.", ko: "맞으면 *움찔*, 막으면 *밀림*, 카운터는 *휘청*." },
          hit(w) { const f = w.foe; f.flash = 1; f.ox += 26; f.sx = 0.85; },
          block(w) { const f = w.foe; f.ox += 44; f.k = 4; f.sx = 1.1; f.sy = 0.9; },
          counter(w) { const f = w.foe; f.tint = 1; f.ox += 60; f.rot = 0.3; w.tween(f, { rot: 0 }, 0.5, "out"); },
        },
        {
          id: "sound", name: { en: "Three Sounds", ko: "소리 세 가지" }, param: "thud / clack / crack",
          cap: { en: "*Thud* for hit, *clack* for block, *crack* for counter.", ko: "맞기 *퍽*, 막기 *탁*, 카운터 *빡*." },
          hit(w) { w.sfx.hit(); },
          block(w) { w.play(() => { sSnap(0.6, 0, 3000); sBody(260, 0.06, 0.5); if (w.on("guard")) sMetal(1700, 0.3, 0.08); }); },
          counter(w) { if (w.on("counter")) w.sfx.critBig(); else w.sfx.hit(); },
        },
      ],
    },

    /* 2 ─ 콤보 카운터 */
    {
      id: "fighting-combo-counter", cat: "fighting", view: "side",
      title: { en: "Make the combo counter *climb*", ko: "콤보 숫자가 *달아오르게*" },
      intro: { en: "Five hits. The number just *sits there*.", ko: "다섯 대 때렸는데 숫자가 *가만히* 있어요." },
      interval: 1.7, stepDur: 3.8,
      setup(w) { duel(w); w.C = { n: 0, t: 0, sc: 1, dmg: 0, shown: 0, out: 0, col: "#cbd5e1", size: 20, shk: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const C = w.C; Object.assign(C, { n: 0, dmg: 0, shown: 0, out: 0, col: "#cbd5e1", size: 20 });
        for (let i = 0; i < 5; i++) w.after(i * 0.12, () => {
          const p = cp(w, rand(70, 100));
          w.hero.ox = 26; w.foe.flash = 1; w.foe.ox += 7;
          C.n++; C.dmg += 10 + C.n * 4; C.t = 0.7;
          hurt(w, w.foe, 5);
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("hit", C, p);
        });
        w.after(1.18, () => { w.emit("end", C); w.busy = false; });
      },
      update(w, dt) {
        tick(w, dt);
        const C = w.C;
        C.t -= dt; C.sc += (1 - C.sc) * Math.min(1, dt * 12); C.shk = Math.max(0, C.shk - dt * 30);
        C.out = Math.max(0, C.out - dt * 1.4);
        if (!w.on("dmg")) C.shown = C.dmg;
      },
      drawHud(w, ctx) {
        hud(w, ctx);
        const C = w.C, live = C.n > 0 && (C.t > 0 || C.out > 0);
        if (!live) return;
        const a = C.t > 0 ? 1 : C.out, x = 92 - (C.t > 0 ? 0 : (1 - C.out) * 60);
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x + rand(-C.shk, C.shk), 128 + rand(-C.shk, C.shk)); ctx.scale(C.sc, C.sc); ctx.rotate(-0.08);
        ctx.font = `italic 900 ${C.size}px Pretendard, sans-serif`; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
        ctx.lineWidth = 6; ctx.strokeStyle = "rgba(10,12,20,0.95)"; ctx.lineJoin = "round";
        ctx.strokeText(String(C.n), 0, 0); ctx.fillStyle = C.col; ctx.fillText(String(C.n), 0, 0);
        ctx.font = "italic 900 14px Pretendard, sans-serif"; ctx.textAlign = "left";
        ctx.strokeText("HITS", 4, 0); ctx.fillText("HITS", 4, 0);
        if (w.on("dmg")) { ctx.font = "800 13px 'JetBrains Mono', monospace"; ctx.fillStyle = "#e5e7eb"; ctx.strokeText(Math.round(C.shown) + " DMG", -36, 20); ctx.fillText(Math.round(C.shown) + " DMG", -36, 20); }
        ctx.restore();
      },
      steps: [
        {
          id: "bump", name: { en: "Bump per Hit", ko: "때릴 때마다 톡" }, param: "scale 1.8 → 1",
          cap: { en: "Every hit *punches* the number bigger.", ko: "때릴 때마다 숫자가 *톡* 커져요." },
          hit(w, C) { C.sc = 1.8; },
        },
        {
          id: "grow", name: { en: "Grow with Combo", ko: "길수록 크게" }, param: "20px + 7px / hit",
          cap: { en: "Longer combo, *bigger* number.", ko: "콤보가 길수록 숫자도 *커져요*." },
          hit(w, C) { C.size = 20 + C.n * 7; },
        },
        {
          id: "heat", name: { en: "Heat Color", ko: "달아오르는 색" }, param: "white → red",
          cap: { en: "White, yellow, orange, *red*. The combo *heats up*.", ko: "하양 → 노랑 → 주황 → *빨강*. *달아올라요*." },
          hit(w, C) { C.col = ["#ffffff", "#fde047", "#fbbf24", "#fb923c", "#f43f5e"][Math.min(4, C.n - 1)]; },
        },
        {
          id: "shake", name: { en: "Number Shake", ko: "숫자 떨림" }, param: "6px jitter",
          cap: { en: "Rattle the number *on every hit*.", ko: "때릴 때마다 숫자가 *부르르*." },
          hit(w, C) { C.shk = 6; },
        },
        {
          id: "dmg", name: { en: "Rolling Damage", ko: "굴러가는 데미지" }, param: "count up",
          cap: { en: "Total damage *rolls up* under the count.", ko: "누적 데미지가 아래에서 *촤르륵*." },
          update(w, dt) { const C = w.C; C.shown += (C.dmg - C.shown) * Math.min(1, dt * 8); },
        },
        {
          id: "end", name: { en: "Combo Finish", ko: "콤보 마무리" }, param: "grade + slide out",
          cap: { en: "When it ends, *grade it*, then slide it away.", ko: "끝나면 *한마디* 남기고 스르륵 퇴장." },
          end(w, C) { C.out = 1; pop(w, C.n >= 5 ? "GREAT!" : "GOOD", 96, 168, 30, "#c6f432", 1); },
        },
        {
          id: "sound", name: { en: "Rising Pitch", ko: "올라가는 음" }, param: "+2 semitones / hit",
          cap: { en: "Each hit plays *a step higher*.", ko: "때릴 때마다 음이 *한 칸씩* 올라가요." },
          hit(w, C) { w.sfx.blip(C.n * 2); w.sfx.hit(1 + C.n * 0.04); },
        },
      ],
    },

    /* 3 ─ 띄우기 + 저글 */
    {
      id: "fighting-launcher", cat: "fighting", view: "side",
      title: { en: "Make a launcher *lift*", ko: "띄우기를 *높이 높이*" },
      intro: { en: "It's a launcher. It *hops*.", ko: "띄우기 기술인데 *깡충* 뛰어요." },
      interval: 1.5, stepDur: 4.0,
      setup(w) { duel(w); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, p = cp(w, 50);
        w.hero.ox = 30; w.hero.sy = 1.12; w.hero.sx = 0.9;
        hurt(w, f, 12); f.flash = 1;
        f.air = true; f.vy = w.on("lift") ? -620 : -380;
        w.emit("launch", p);
        const juggle = () => {
          if (!f.air) return;
          const q = { x: f.x - 30, y: f.gy + f.oy - 70 };
          w.hero.ox = 28; f.flash = 1; f.vy = Math.min(f.vy, -300); hurt(w, f, 6);
          w.emit("juggle", q);
        };
        w.after(0.3, juggle); w.after(0.52, juggle);
      },
      update(w, dt) {
        tick(w, dt);
        const f = w.foe, g = w.on("float") && Math.abs(f.vy) < 260 ? 800 : 2000;
        if (body(f, dt, g)) { w.emit("land", f); w.busy = false; }
      },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "lift", name: { en: "Real Height", ko: "진짜 높이" }, param: "vy −620",
          cap: { en: "Launch it *high*. Air time is the reward.", ko: "*높이* 띄워요. 체공 시간이 보상이에요." },
          launch(w, p) { w.foe.sy = 1.25; w.foe.sx = 0.8; },
        },
        {
          id: "streak", name: { en: "Rising Streak", ko: "솟구치는 궤적" }, param: "arc + up-lines",
          cap: { en: "Draw the uppercut *swinging up*.", ko: "어퍼컷 궤적이 *위로* 쭉." },
          launch(w, p) {
            w.spawn({ type: "arc", x: p.x - 20, y: p.y + 10, size: 70, life: 0.2, a0: 0.4, a1: -1.9, color: "255,240,200" });
            lines(w, p.x + 10, p.y - 60, 6, -Math.PI / 2, "255,255,255", 30);
          },
        },
        {
          id: "juggle", name: { en: "Juggle Sparks", ko: "공중 타격 불꽃" }, param: "burst per hit",
          cap: { en: "Every air hit gets its own *burst*.", ko: "공중에서 맞을 때마다 *팡*." },
          launch(w, p) { burst(w, p.x, p.y, "255,190,90", 1.2); },
          juggle(w, q) { burst(w, q.x, q.y, "255,190,90"); sparks(w, q.x, q.y, 8, "255,220,150", [200, 480], -1.6, 0.4); },
        },
        {
          id: "float", name: { en: "Apex Hang", ko: "꼭대기에서 둥실" }, param: "gravity ×0.35 at top",
          cap: { en: "Ease gravity at the top. It *hangs* there.", ko: "꼭대기에선 중력을 줄여 *둥실* 떠요." },
          update(w, dt) { const f = w.foe; if (f.air) f.rot = Math.sin(w.time * 9) * 0.18; else f.rot = 0; },
        },
        {
          id: "dust", name: { en: "Dust Rings", ko: "먼지 고리" }, param: "takeoff + landing",
          cap: { en: "*Dust* on takeoff, *thump* on landing.", ko: "뜰 때 *먼지*, 떨어질 때 *쿵*." },
          launch(w) { const f = w.foe; w.spawn({ type: "ring", flat: true, x: f.x, y: G, size: 20, size1: 90, life: 0.4, w: 6, color: "220,210,190" }); dust(w, f.x, G, 8); },
          land(w, f) { w.spawn({ type: "ring", flat: true, x: f.x, y: G, size: 20, size1: 110, life: 0.4, w: 6, color: "220,210,190" }); dust(w, f.x, G, 10); f.sy = 0.7; f.sx = 1.25; },
        },
        {
          id: "camera", name: { en: "Camera Follow", ko: "카메라 따라가기" }, param: "35% of height",
          cap: { en: "Tilt the camera *up* with the body.", ko: "카메라도 *같이* 올라가요." },
          update(w) { w.cam.ty = Math.min(0, w.foe.oy * 0.35); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh up · pops",
          cap: { en: "A *whoosh* going up, *pops* in the air.", ko: "올라갈 때 *휘익*, 공중에서 *팡팡*." },
          launch(w) { w.sfx.crit(); w.play(() => nz({ type: "bandpass", f: 500, f2: 3000, q: 2, dur: 0.3, vol: 0.3 })); },
          juggle(w) { w.sfx.hit(1.2); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 4 ─ 벽 바운드 */
    {
      id: "fighting-wall-bounce", cat: "fighting", view: "side",
      title: { en: "Make a wall bounce *slam*", ko: "벽 바운드를 *쾅*" },
      intro: { en: "It touches the wall and *politely* returns.", ko: "벽에 닿고 *얌전히* 돌아와요." },
      interval: 1.4, stepDur: 3.8,
      setup(w) { duel(w, { fx: 330 }); w.WX = 500; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, p = cp(w);
        w.hero.ox = 40; hurt(w, f, 14); f.flash = 1;
        burst(w, p.x, p.y, "255,190,90", 0.8);
        f.air = true; f.vx = 950; f.vy = -260; f.hitWall = false;
        w.emit("launch", p);
      },
      update(w, dt) {
        tick(w, dt);
        const f = w.foe;
        if (f.air && !f.hitWall && f.x + 58 >= w.WX) {
          f.hitWall = true; f.x = w.WX - 58; f.vx = -330; f.vy = -420;
          w.emit("wall", { x: w.WX, y: f.gy + f.oy - 70 });
        }
        if (body(f, dt)) { w.emit("land", f); w.tween(f, { x: f.home }, 0.35, "inout", () => { w.busy = false; }); }
      },
      drawBack(w, ctx) {
        ctx.fillStyle = "#2a2d36"; ctx.fillRect(w.WX, 70, 60, G - 70);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        for (let y = 80; y < G; y += 28) ctx.fillRect(w.WX, y, 60, 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(w.WX, 70, 3, G - 70);
      },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "impact", name: { en: "Wall Impact", ko: "벽 충돌 섬광" }, param: "star + flash",
          cap: { en: "Flash *at the wall*, not just on the body.", ko: "몸 말고 *벽에서도* 번쩍." },
          wall(w, p) { burst(w, p.x - 6, p.y, "255,230,180", 1.5); w.foe.flash = 1.2; },
        },
        {
          id: "squash", name: { en: "Splat", ko: "철퍽" }, param: "sx .5 · sy 1.3",
          cap: { en: "*Flatten* the body against the wall.", ko: "벽에 *철퍽* 납작하게." },
          wall(w) { const f = w.foe; f.sx = 0.5; f.sy = 1.3; },
        },
        {
          id: "stop", name: { en: "Wall Stop", ko: "벽에서 멈칫" }, param: "130ms",
          cap: { en: "*Freeze* on the wall. Let it sink in.", ko: "벽에 붙은 채 *멈칫*. 느낄 시간을 줘요." },
          wall(w) { w.hitstop(0.13); w.foe.vib = 7; w.foe.vibAxis = "y"; },
        },
        {
          id: "crack", name: { en: "Wall Crack", ko: "벽 금" }, param: "crack · 2.5s",
          cap: { en: "Leave a *crack*. The wall remembers.", ko: "*금*을 남겨요. 벽도 기억해요." },
          wall(w, p) {
            for (let i = 0; i < 6; i++) {
              const a = Math.PI / 2 + (i / 5 - 0.5) * 2.6, pts = [[0, 0]];
              for (let j = 1; j < 4; j++) pts.push([Math.cos(a) * j * 16 + rand(-5, 5) + 30, Math.sin(a) * j * 16 + rand(-5, 5)]);
              w.spawn({ type: "crack", x: p.x - 2, y: p.y, pts: pts.map(q => [Math.min(q[0], 40), q[1]]), w: 3, life: 2.5, hold: true, color: "225,228,240", add: false });
            }
          },
        },
        {
          id: "debris", name: { en: "Debris", ko: "벽 파편" }, param: "12 chunks",
          cap: { en: "Chip the wall. *Chunks* fall to the floor.", ko: "벽이 깨져서 *파편*이 우수수." },
          wall(w, p) { for (let i = 0; i < 12; i++) w.spawn({ type: "chunk", x: p.x, y: p.y + rand(-30, 30), vx: rand(-320, -60), vy: rand(-420, -60), g: 1500, ground: true, bounce: 0.3, vr: rand(-15, 15), life: 1.6, size: rand(4, 8), color: "110,112,124", hold: true }); },
        },
        {
          id: "shake", name: { en: "Sideways Shake", ko: "옆으로 쾅" }, param: "trauma .45 · →",
          cap: { en: "Shake *toward the wall*. Direction sells it.", ko: "*벽 쪽으로* 흔들어요. 방향이 중요해요." },
          wall(w) { w.shake(0.45, 1); w.kick(14, 0); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slam + crumble",
          cap: { en: "A deep *slam*, then a little *crumble*.", ko: "묵직한 *쾅*, 뒤에 *부스스*." },
          launch(w) { w.sfx.thud(); },
          wall(w) { w.sfx.slam(); w.sfx.rattle(); },
        },
      ],
    },

    /* 5 ─ 바닥 바운드 */
    {
      id: "fighting-ground-bounce", cat: "fighting", view: "side",
      title: { en: "Spike them into the *floor*", ko: "바닥에 *내리꽂기*" },
      intro: { en: "Smashed down. Floor *didn't notice*.", ko: "내리꽂았는데 바닥은 *모른 척*." },
      interval: 1.5, stepDur: 3.8,
      setup(w) { duel(w); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, h = w.hero;
        f.air = true; f.vy = -560; f.spiked = false;
        w.tween(h, { oy: -84 }, 0.16, "out");
        w.after(0.2, () => {
          f.vy = 1500; f.spiked = true; hurt(w, f, 14); f.flash = 1;
          const p = { x: f.x - 20, y: f.gy + f.oy - 90 };
          w.emit("spike", p);
          w.tween(h, { oy: 0 }, 0.22, "in");
        });
      },
      update(w, dt) {
        tick(w, dt);
        const f = w.foe;
        if (body(f, dt)) {
          if (f.spiked) { f.spiked = false; f.air = true; f.vy = -520; w.emit("ground", { x: f.x, y: G }); }
          else w.busy = false;
        }
      },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "trail", name: { en: "Downward Lines", ko: "내리꽂는 선" }, param: "arc + 6 lines",
          cap: { en: "Draw the *downward* force.", ko: "*아래로* 꽂히는 힘을 그려요." },
          spike(w, p) {
            w.spawn({ type: "arc", x: p.x - 10, y: p.y - 20, size: 70, life: 0.2, a0: -1.6, a1: 0.9, color: "255,240,200" });
            lines(w, p.x + 20, p.y + 60, 6, Math.PI / 2, "255,255,255", 22);
          },
        },
        {
          id: "stop", name: { en: "Floor Stop", ko: "바닥에서 멈칫" }, param: "120ms",
          cap: { en: "*Freeze* the instant it hits the floor.", ko: "바닥에 닿는 순간 *멈칫*." },
          ground(w) { w.hitstop(0.12); w.foe.vib = 6; w.foe.vibAxis = "y"; },
        },
        {
          id: "squash", name: { en: "Pancake", ko: "납작" }, param: "sy .5 · sx 1.4",
          cap: { en: "*Squash* it flat on contact.", ko: "닿는 순간 *납작*하게." },
          ground(w) { const f = w.foe; f.sy = 0.5; f.sx = 1.4; },
        },
        {
          id: "ring", name: { en: "Floor Ring", ko: "바닥 충격파" }, param: "flat ring 140px",
          cap: { en: "A *flat ring* races across the floor.", ko: "바닥을 따라 *충격파*가 쫙." },
          ground(w, p) {
            w.spawn({ type: "ring", flat: true, x: p.x, y: p.y, size: 20, size1: 150, life: 0.45, w: 9, color: "255,230,190" });
            dust(w, p.x - 30, p.y, 8, -1); dust(w, p.x + 30, p.y, 8, 1);
          },
        },
        {
          id: "crack", name: { en: "Floor Crack", ko: "바닥 금" }, param: "decal 3s",
          cap: { en: "*Crack* the floor. Leave the dent.", ko: "바닥이 *쩍*. 자국은 남겨요." },
          ground(w, p) {
            w.spawn({ type: "ellipse", under: true, x: p.x, y: p.y + 2, size: 70, life: 3, color: "0,0,0", alpha: 0.6, hold: true, add: false });
            for (let i = 0; i < 5; i++) { const s = i % 2 ? 1 : -1; w.spawn({ type: "crack", under: true, x: p.x, y: p.y + 2, pts: [[0, 0], [s * rand(20, 30), rand(-2, 3)], [s * rand(40, 60), rand(-3, 5)], [s * rand(60, 80), rand(-2, 6)]], w: 2.5, life: 3, hold: true, color: "8,8,10", add: false }); }
          },
        },
        {
          id: "shake", name: { en: "Vertical Kick", ko: "위아래로 쿵" }, param: "kick 14px ↓",
          cap: { en: "Kick the camera *down*, the way it fell.", ko: "떨어진 방향, *아래로* 화면을 쿵." },
          ground(w) { w.kick(0, 14); w.shake(0.35); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh · slam",
          cap: { en: "A short *whoosh*, then a *floor slam*.", ko: "짧은 *쉭*, 그리고 *쿵*." },
          spike(w) { w.sfx.slash(); },
          ground(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 6 ─ 잡기 */
    {
      id: "fighting-throw", cat: "fighting", view: "side",
      title: { en: "Make a throw feel *heavy*", ko: "잡기를 *묵직하게*" },
      intro: { en: "Grab… and it *slides* behind you.", ko: "잡았는데… 뒤로 *스르륵*." },
      interval: 1.6, stepDur: 4.0,
      setup(w) { duel(w); w.T = { t: 0, on: false }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe, T = w.T;
        w.tween(h, { x: f.x - 86 }, 0.08, "in", () => {
          w.emit("grab", { x: f.x - 50, y: G - 80 });
          T.x0 = f.x; T.x1 = h.x - 96; T.t = 0; T.on = true;
          w.tween(T, { t: 1 }, 0.34, "inout", () => {
            T.on = false; f.oy = 0; f.rot = 1.35; f.x = T.x1;
            w.emit("slam", { x: f.x, y: G });
            hurt(w, f, 16);
            w.after(0.45, () => {
              w.tween(f, { x: f.home, rot: 0 }, 0.3, "inout");
              w.tween(h, { x: h.home }, 0.3, "inout", () => { w.busy = false; });
            });
          });
        });
      },
      update(w, dt) {
        tick(w, dt);
        const T = w.T, f = w.foe;
        if (!T.on) return;
        f.x = T.x0 + (T.x1 - T.x0) * T.t;
        f.oy = w.on("arc") ? -Math.sin(Math.PI * T.t) * 150 : 0;
        f.rot = w.on("arc") ? T.t * 1.35 + Math.sin(Math.PI * T.t) * 1.5 : 0;
      },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "grab", name: { en: "Grab Flash", ko: "잡는 순간 번쩍" }, param: "both flash · 80ms",
          cap: { en: "Flash *both* bodies. A tiny freeze: *got you*.", ko: "*둘 다* 번쩍, 살짝 멈칫. *잡았다*." },
          grab(w, p) {
            w.hero.flash = 1; w.foe.flash = 1; w.hitstop(0.08);
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 50, size1: 14, life: 0.2, w: 6, color: "255,255,255" });
          },
        },
        {
          id: "arc", name: { en: "Over the Head", ko: "머리 위로 휙" }, param: "arc 150px · spin",
          cap: { en: "Throw it *over the head*, spinning. Not along the floor.", ko: "바닥 말고 *머리 위로* 돌려서 휙." },
          grab(w) { w.hero.sx = 1.1; w.hero.sy = 0.9; },
        },
        {
          id: "trail", name: { en: "Afterimage", ko: "잔상" }, param: "ghost / frame",
          cap: { en: "Leave *afterimages* along the arc.", ko: "궤적을 따라 *잔상*을 남겨요." },
          update(w) { if (w.T.on && Math.random() < 0.5) ghost(w, w.foe, 0.2, "cyan", 0.22); },
        },
        {
          id: "slam", name: { en: "Slam Impact", ko: "메치기 충격" }, param: "ring + dust",
          cap: { en: "*Slam* it down. Ring, dust, squash.", ko: "*쾅* 내리꽂아요. 충격파, 먼지, 찌그러짐." },
          slam(w, p) {
            const f = w.foe; f.sy = 0.7; f.sx = 1.25; f.flash = 1;
            w.spawn({ type: "ring", flat: true, x: p.x, y: p.y, size: 20, size1: 130, life: 0.45, w: 8, color: "255,230,190" });
            dust(w, p.x - 30, p.y, 8, -1); dust(w, p.x + 30, p.y, 8, 1);
          },
        },
        {
          id: "shake", name: { en: "Slam Shake", ko: "메치기 흔들림" }, param: "trauma .5 + stop",
          cap: { en: "Shake *hard*, freeze *a beat*.", ko: "*세게* 흔들고, *잠깐* 멈춰요." },
          slam(w) { w.shake(0.5); w.kick(0, 10); w.hitstop(0.1); },
        },
        {
          id: "label", name: { en: "Throw Label", ko: "잡기 표시" }, param: "\"THROW\" text",
          cap: { en: "Name it. Players learn *what got them*.", ko: "이름을 띄워요. *뭐에 당했는지* 알게." },
          slam(w, p) { pop(w, "THROW!", p.x + 20, G - 150, 30, "#fde047", 0.9); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "grab · swish · slam",
          cap: { en: "A *grab* click, a *swish*, a *slam*.", ko: "*턱* 잡고, *휙* 넘기고, *쾅*." },
          grab(w) { w.sfx.thunk(); w.after(0.1, () => w.sfx.swish()); },
          slam(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 7 ─ 필살기 컷인 */
    {
      id: "fighting-super-cutin", cat: "fighting", view: "side",
      title: { en: "Make a super move *stop the world*", ko: "필살기에 *컷인* 넣기" },
      intro: { en: "Biggest move in the game. Looks like a *jab*.", ko: "최강 기술인데 *잽*처럼 보여요." },
      interval: 2.2, stepDur: 4.2,
      setup(w) { duel(w); w.dim = 0; w.cut = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        w.emit("start", { x: h.x + 20, y: G - 80 });
        w.after(w.on("freeze") ? 0.62 : 0.08, () => {
          w.tween(h, { x: f.x - 90 }, 0.08, "in", () => {
            const p = cp(w);
            hurt(w, f, 30); f.flash = 1.4; f.ox += 70; f.k = 4; h.ox = 34;
            w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
            w.emit("hit", p);
            w.after(0.35, () => w.tween(h, { x: h.home }, 0.3, "inout", () => { w.busy = false; }));
          });
        });
      },
      update(w, dt) { tick(w, dt); },
      drawBack(w, ctx) {
        if (w.dim <= 0) return;
        ctx.fillStyle = `rgba(4,4,10,${0.78 * w.dim})`; ctx.fillRect(-60, -60, 660, 480);
      },
      drawHud(w, ctx) {
        hud(w, ctx);
        const c = w.cut;
        if (!(c > 0 && c < 1)) return;
        const off = c < 0.25 ? (1 - E.out(c / 0.25)) * -600 : c > 0.8 ? E.in((c - 0.8) / 0.2) * 640 : (c - 0.25) * 40;
        ctx.save(); ctx.translate(off, 0);
        ctx.beginPath(); ctx.moveTo(-40, 120); ctx.lineTo(600, 96); ctx.lineTo(600, 196); ctx.lineTo(-40, 222); ctx.closePath();
        ctx.fillStyle = "#c6f432"; ctx.fill(); ctx.save(); ctx.clip();
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        for (let i = 0; i < 9; i++) ctx.fillRect(((w.time * 900 + i * 90) % 700) - 80, 100 + i * 12, 80, 3);
        ctx.drawImage(SPR.hero.c, 250, 40, 230, 352);
        ctx.restore();
        big(ctx, "SUPER ART", 150, 160, 40, "#121318", 1, 1, -0.04);
        ctx.restore();
      },
      steps: [
        {
          id: "freeze", name: { en: "Super Freeze", ko: "세상이 멈춤" }, param: "600ms · hero glows",
          cap: { en: "*Freeze everything* before the move. Hero glows.", ko: "쓰기 전에 *모든 게 멈춰요*. 주인공만 빛나고." },
          start(w, p) { w.hero.flash = 2; w.spawn({ type: "glow", x: p.x - 10, y: p.y, size: 30, size1: 110, life: 0.6, color: "198,244,50" }); },
        },
        {
          id: "dim", name: { en: "Dim the World", ko: "배경 어둡게" }, param: "black 78%",
          cap: { en: "*Black out* the stage. Only the fighters stay lit.", ko: "무대를 *까맣게*. 싸우는 둘만 남겨요." },
          start(w) { w.dim = 1; w.after(0.7, () => w.tween(w, { dim: 0 }, 0.3)); },
        },
        {
          id: "cutin", name: { en: "Cut-in Banner", ko: "컷인 띠" }, param: "slide · hold · exit",
          cap: { en: "A *banner* slides through with the hero's face.", ko: "주인공 얼굴이 담긴 *띠*가 휙 지나가요." },
          start(w) { w.cut = 0.001; w.tween(w, { cut: 1 }, 0.62, "lin"); },
        },
        {
          id: "rays", name: { en: "Power Rays", ko: "기운 빛살" }, param: "14 rays spin",
          cap: { en: "*Rays* spin out from behind the hero.", ko: "주인공 뒤로 *빛살*이 돌아요." },
          start(w, p) { w.spawn({ type: "rays", x: p.x - 20, y: p.y, size: 220, life: 0.7, n: 14, vr: 2.5, color: "198,244,50", under: true }); },
        },
        {
          id: "impact", name: { en: "Super Impact", ko: "필살 타격" }, param: "white frame + burst",
          cap: { en: "Land it with a *white frame* and a huge burst.", ko: "*하얀 한 프레임*과 큰 폭발로 마무리." },
          hit(w, p) {
            w.flash("255,255,255", 0.55); burst(w, p.x, p.y, "198,244,50", 2.2);
            sparks(w, p.x, p.y, 22, "230,255,160", [300, 800]); w.hitstop(0.14); w.shake(0.55, 1);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge · boom",
          cap: { en: "A rising *charge*, then a *boom*.", ko: "차오르는 *우우웅*, 그리고 *쾅*." },
          start(w) { w.sfx.charge(); w.sfx.boost(); },
          hit(w) { w.sfx.boom(); w.sfx.crit(); },
        },
      ],
    },

    /* 8 ─ 슈퍼 게이지 */
    {
      id: "fighting-meter-fill", cat: "fighting", view: "side",
      title: { en: "Make the super meter *fill up*", ko: "필살 게이지가 *차오르게*" },
      intro: { en: "The meter just *jumps*. Nobody looks at it.", ko: "게이지가 *툭툭* 바뀌어요. 아무도 안 봐요." },
      interval: 0.75, stepDur: 4.0,
      setup(w) { duel(w); w.M = { v: 0, show: 0, flash: 0, idle: 0 }; },
      fire(w) {
        const M = w.M;
        if (M.v >= 3) { if (++M.idle < 2) return; M.v = M.show = M.idle = 0; return; }
        const p = cp(w);
        w.hero.ox = 30; w.foe.flash = 1; w.foe.ox += 12; hurt(w, w.foe, 6);
        w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
        const lv = Math.floor(M.v);
        M.v = Math.min(3, M.v + 0.31);
        w.emit("gain", M, p);
        if (Math.floor(M.v) > lv) w.emit("level", M, Math.floor(M.v));
      },
      update(w, dt) {
        tick(w, dt);
        const M = w.M; M.flash = Math.max(0, M.flash - dt * 3);
        if (!w.on("smooth")) M.show = M.v;
      },
      drawHud(w, ctx) {
        hud(w, ctx);
        const M = w.M, full = M.v >= 3 && w.on("max");
        rr(ctx, MX0 - 4, MY - 4, MX1 - MX0 + 8, 22, 5, "rgba(0,0,0,0.72)");
        const pulse = full ? 0.5 + 0.5 * Math.sin(w.time * 14) : 0;
        if (full) glow(ctx, 270, MY + 7, 160, "198,244,50", 0.25 + pulse * 0.3);
        ctx.fillStyle = full ? `rgb(${198 + 57 * pulse},${244},${50 + 205 * pulse})` : "#38bdf8";
        ctx.fillRect(MX0, MY, meterAt(M.show / 3) - MX0, 14);
        if (M.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${M.flash})`; ctx.fillRect(MX0, MY, MX1 - MX0, 14); }
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        for (let i = 1; i < 3; i++) ctx.fillRect(meterAt(i / 3) - 1.5, MY, 3, 14);
        if (w.on("tip") && M.show > 0.02 && M.show < 3) { glow(ctx, meterAt(M.show / 3), MY + 7, 22, "186,230,253", 0.9); ctx.fillStyle = "#fff"; ctx.fillRect(meterAt(M.show / 3) - 2, MY - 3, 4, 20); }
        label(ctx, String(Math.floor(M.v)), MX0 - 22, MY + 7, 22, full ? "#c6f432" : "#fff", "center", "'JetBrains Mono', monospace", 800);
        if (full) big(ctx, "MAX", 270, MY - 22, 30, "#c6f432", 1 + pulse * 0.12, 1, 0);
      },
      steps: [
        {
          id: "smooth", name: { en: "Smooth Fill", ko: "부드럽게 차오름" }, param: "ease 6/s",
          cap: { en: "Let the bar *pour in*, not snap.", ko: "툭 바뀌지 말고 *스르륵* 차오르게." },
          update(w, dt) { const M = w.M; M.show += (M.v - M.show) * Math.min(1, dt * 6); },
        },
        {
          id: "orbs", name: { en: "Energy Orbs", ko: "기운 구슬" }, param: "8 orbs → meter",
          cap: { en: "Fly *orbs* from the hit into the meter.", ko: "때린 자리에서 게이지로 *구슬*이 쏙." },
          gain(w, M, p) {
            for (let i = 0; i < 8; i++) w.after(i * 0.02, () => w.spawn({ type: "spark", seek: true, x: p.x + rand(-20, 20), y: p.y + rand(-20, 20), tx: meterAt(M.v / 3), ty: MY + 7, life: 0.35, size: 3, color: "125,211,252" }));
          },
        },
        {
          id: "tip", name: { en: "Glowing Tip", ko: "빛나는 끝" }, param: "white edge + glow",
          cap: { en: "A *bright edge* shows exactly where it's filling.", ko: "*빛나는 끝*이 차는 자리를 보여줘요." },
          gain(w, M) { M.flash = 0.25; },
        },
        {
          id: "stock", name: { en: "Stock Up", ko: "한 칸 완성" }, param: "flash + \"LV\"",
          cap: { en: "Each full bar *flashes* and says its level.", ko: "한 칸 찰 때마다 *번쩍*, 단계도 알려줘요." },
          level(w, M, lv) { M.flash = 1; pop(w, "LV " + lv, meterAt(lv / 3), MY - 26, 22, "#7dd3fc", 0.7); },
        },
        {
          id: "max", name: { en: "MAX Pulse", ko: "가득 참 맥박" }, param: "pulse 14/s",
          cap: { en: "Full meter *throbs*. It begs to be used.", ko: "가득 차면 *두근두근*. 쓰고 싶어져요." },
          level(w, M, lv) { if (lv === 3) w.spawn({ type: "ring", x: 270, y: MY + 7, size: 40, size1: 180, life: 0.4, w: 6, color: "198,244,50" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick · chime · rise",
          cap: { en: "Tiny *ticks* as it fills, a *chime* per level.", ko: "찰 때 *똑*, 한 칸마다 *띵*." },
          gain(w) { w.sfx.tick(); w.sfx.hit(); },
          level(w, M, lv) { w.sfx.chime(lv * 4); },
        },
      ],
    },
    /* 9 ─ 가드 크러시 */
    {
      id: "fighting-guard-crush", cat: "fighting", view: "side",
      title: { en: "Make a guard break *shatter*", ko: "가드 크러시를 *와장창*" },
      intro: { en: "The guard broke. Looked like a *normal hit*.", ko: "가드가 깨졌는데 *그냥 맞은* 것 같아요." },
      interval: 0.7, stepDur: 4.0,
      setup(w) { duel(w); w.gd = { v: 1, stag: 0, bf: 0, sh: 0 }; },
      fire(w) {
        const g = w.gd, f = w.foe;
        if (g.stag > 0) return;
        const p = cp(w);
        w.hero.ox = 36;
        g.v = Math.max(0, g.v - 0.34);
        w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
        if (g.v > 0.01) { f.ox += 10; hurt(w, f, 1); w.emit("block", p, g); return; }
        g.stag = 1.1; hurt(w, f, 12); f.flash = 1; f.ox += 20;
        w.emit("crush", p, g);
      },
      update(w, dt) {
        tick(w, dt);
        const g = w.gd;
        g.bf = Math.max(0, g.bf - dt * 4); g.sh = Math.max(0, g.sh - dt * 3);
        if (g.stag > 0) { g.stag -= dt; if (g.stag <= 0) { g.v = 1; w.foe.rot = 0; } }
      },
      drawFront(w, ctx) {
        const g = w.gd, f = w.foe;
        if (!w.on("shield") || g.stag > 0) return;
        const x = f.x + f.ox - 62, y = G - 74, col = g.v > 0.5 ? "96,165,250" : g.v > 0.2 ? "250,204,21" : "248,113,113";
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + TAU / 12; ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * 26, y + Math.sin(a) * 66); }
        ctx.closePath();
        ctx.fillStyle = `rgba(${col},${0.14 + g.sh * 0.3})`; ctx.fill();
        ctx.strokeStyle = `rgba(${col},${0.6 + g.sh * 0.4})`; ctx.lineWidth = 3 + g.sh * 4; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2;
        const n = Math.round((1 - g.v) * 6);
        for (let i = 0; i < n; i++) { const a = i * 2.2 + 0.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 30); ctx.lineTo(x + Math.cos(a + 0.3) * 22, y + Math.sin(a + 0.3) * 58); ctx.stroke(); }
        ctx.restore();
      },
      drawHud(w, ctx) {
        hud(w, ctx);
        if (!w.on("gauge")) return;
        const g = w.gd, low = g.v < 0.4, x0 = 292, bw = 150;
        rr(ctx, x0 - 2, 62, bw + 4, 10, 3, "rgba(0,0,0,0.75)");
        ctx.fillStyle = g.bf > 0 ? "#fff" : low && Math.sin(w.time * 30) > 0 ? "#f87171" : "#60a5fa";
        ctx.fillRect(x0, 64, bw * g.v, 6);
      },
      steps: [
        {
          id: "gauge", name: { en: "Guard Gauge", ko: "가드 게이지" }, param: "3 blocks to break",
          cap: { en: "Show the guard *running out*. Blink when it's low.", ko: "가드가 *닳는 게* 보이게. 바닥이면 깜빡." },
          block(w, p, g) { g.bf = 1; },
        },
        {
          id: "shield", name: { en: "Cracking Shield", ko: "금 가는 방패" }, param: "blue → yellow → red",
          cap: { en: "Draw the guard as a *shield*. Crack it each block.", ko: "가드를 *방패*로. 막을수록 *금*이 가요." },
          block(w, p, g) { g.sh = 1; },
        },
        {
          id: "shatter", name: { en: "Shatter", ko: "와장창" }, param: "20 shards",
          cap: { en: "When it breaks, *shards* fly everywhere.", ko: "깨지면 *파편*이 사방으로." },
          crush(w, p) {
            w.spawn({ type: "ring", x: p.x - 16, y: p.y, size: 20, size1: 120, life: 0.4, w: 8, color: "147,197,253" });
            for (let i = 0; i < 20; i++) w.spawn({ type: "chunk", x: p.x - 16, y: p.y + rand(-50, 50), vx: rand(-420, 260), vy: rand(-520, -80), g: 1400, ground: true, bounce: 0.3, vr: rand(-20, 20), life: 1.4, size: rand(4, 9), color: pick(["147,197,253", "96,165,250", "219,234,254"]), hold: true });
          },
        },
        {
          id: "stagger", name: { en: "Stagger", ko: "비틀거림" }, param: "1.1s wobble",
          cap: { en: "The victim *reels*, wide open.", ko: "깨진 쪽은 *휘청*, 무방비예요." },
          crush(w) { w.foe.ox += 50; w.foe.k = 3; },
          update(w) { if (w.gd.stag > 0) w.foe.rot = Math.sin(w.time * 8) * 0.22; },
        },
        {
          id: "flash", name: { en: "Red Alarm", ko: "빨간 경고" }, param: "red flash + 180ms",
          cap: { en: "*Red flash*, a long freeze, and a name.", ko: "*빨간 번쩍*, 긴 멈칫, 이름까지." },
          crush(w) {
            w.flash("255,70,70", 0.55); w.hitstop(0.18);
            pop(w, "GUARD CRUSH!", 300, 128, 30, "#f87171", 1.1);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clack · glass",
          cap: { en: "*Clack*, *clack*… then *glass*.", ko: "*탁*, *탁*… 그리고 *쨍그랑*." },
          block(w) { w.sfx.tock(); },
          crush(w) {
            w.sfx.crit();
            w.play(() => { for (let i = 0; i < 4; i++) tn({ type: "triangle", f: rand(1800, 3200), dur: 0.12, vol: 0.08, delay: i * 0.03 }); nz({ type: "highpass", f: 4000, dur: 0.25, vol: 0.3 }); });
          },
        },
      ],
    },

    /* 10 ─ 저스트 가드 */
    {
      id: "fighting-just-defend", cat: "fighting", view: "side",
      title: { en: "Reward a perfect block with a *flash*", ko: "저스트 가드에 *번쩍* 보상" },
      intro: { en: "Frame-perfect block. Felt like *any block*.", ko: "딱 맞춰 막았는데 *평범한 막기* 같아요." },
      interval: 0.9, stepDur: 3.8,
      setup(w) { duel(w); w.hero.hp = w.hero.hpLag = 64; w.heal = 0; },
      fire(w) {
        const f = w.foe, h = w.hero;
        f.ox = -48; f.sx = 1.08;
        w.after(0.06, () => {
          const p = { x: h.x + h.ox + 40, y: G - 88 };
          h.ox -= 4;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("just", p);
        });
      },
      update(w, dt) { tick(w, dt); w.heal = Math.max(0, w.heal - dt * 2); },
      drawHud(w, ctx) { hud(w, ctx, { hcol: w.heal > 0 ? "#86efac" : null }); },
      steps: [
        {
          id: "flash", name: { en: "Blue-white Flash", ko: "푸른 번쩍임" }, param: "ghost ×1.15",
          cap: { en: "Flash the *defender*, not the attacker.", ko: "때린 쪽 말고 *막은 쪽*이 번쩍." },
          just(w) { const h = w.hero; h.flash = 1.4; const g = ghost(w, h, 0.35, "cyan", 0.9); g.sx = 1.15; g.sy = 1.06; },
        },
        {
          id: "ring", name: { en: "Crisp Ring", ko: "또렷한 고리" }, param: "thin ring + 4 stars",
          cap: { en: "A *thin, crisp* ring. Precise, not explosive.", ko: "*가늘고 또렷한* 고리. 폭발 말고 정확함." },
          just(w, p) {
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 90, life: 0.35, w: 3, color: "165,243,252" });
            for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.5; w.spawn({ type: "star", x: p.x + Math.cos(a) * 34, y: p.y + Math.sin(a) * 34, size: 14, life: 0.3, color: "207,250,254" }); }
          },
        },
        {
          id: "freeze", name: { en: "Attacker Stuck", ko: "때린 쪽이 굳음" }, param: "120ms · foe trembles",
          cap: { en: "The *attacker* freezes and trembles. Punished.", ko: "*때린 쪽*이 굳어서 덜덜. 벌 받는 느낌." },
          just(w) { w.hitstop(0.12); w.foe.vib = 7; w.foe.tint = 0.5; },
        },
        {
          id: "text", name: { en: "JUST!", ko: "JUST!" }, param: "cyan text",
          cap: { en: "Say it. *JUST!* Players chase that word.", ko: "*JUST!* 이 한 마디를 보려고 연습해요." },
          just(w, p) { pop(w, "JUST!", p.x, p.y - 72, 34, "#67e8f9"); },
        },
        {
          id: "reward", name: { en: "Visible Reward", ko: "보이는 보상" }, param: "+6 HP · green bar",
          cap: { en: "Give something back and *show it*: green HP.", ko: "보상을 주고 *보여줘요*. 체력바가 초록." },
          just(w) {
            const h = w.hero; h.hp = Math.min(100, h.hp + 6); w.heal = 1;
            pop(w, "+6", 150, 86, 20, "#86efac", 0.7);
            if (h.hp >= 100) w.after(0.6, () => { h.hp = h.hpLag = 64; });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "high ting",
          cap: { en: "A clean, high *ting*. Not a thud.", ko: "*퍽* 말고 맑고 높은 *팅*." },
          just(w) { w.sfx.chime(7); w.sfx.tock(); },
        },
      ],
    },

    /* 11 ─ 라운드 시작 */
    {
      id: "fighting-round-start", cat: "fighting", view: "side",
      title: { en: "Start the round with a *bang*", ko: "라운드 시작을 *쾅*" },
      intro: { en: "\"ROUND 1. FIGHT.\" Like a *memo*.", ko: "\"ROUND 1. FIGHT.\" *공지사항* 같아요." },
      interval: 2.0, stepDur: 4.0,
      setup(w) { duel(w); w.ban = { t: -1, from: 0, slam: 1, band: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const b = w.ban; Object.assign(b, { t: 0, from: 0, slam: 1, band: 0 });
        w.emit("round", b);
        w.after(0.9, () => w.emit("fight", b));
        w.after(1.75, () => { w.busy = false; });
      },
      update(w, dt) { tick(w, dt); if (w.ban.t >= 0) w.ban.t += dt; },
      drawHud(w, ctx) {
        hud(w, ctx);
        const b = w.ban, t = b.t;
        if (t < 0 || t > 1.75) return;
        if (b.band) {
          const k = Math.min(1, t / 0.15) * (t > 1.55 ? Math.max(0, (1.75 - t) / 0.2) : 1);
          ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.fillRect(0, 180 - 36 * k, 540, 72 * k);
          ctx.fillStyle = "#c6f432"; ctx.fillRect(0, 180 - 36 * k, 540, 3); ctx.fillRect(0, 177 + 36 * k, 540, 3);
        }
        if (t < 0.88) {
          const k = Math.min(1, t / 0.25), out = Math.max(0, (t - 0.68) / 0.2);
          const x = 270 + (b.from ? b.from * (1 - E.back(k)) + E.in(out) * 620 : 0);
          big(ctx, "ROUND 1", x, 180, 46, "#fff");
        } else if (t >= 0.9) {
          const k = Math.min(1, (t - 0.9) / 0.14), sc = 1 + (b.slam - 1) * (1 - E.out(k));
          big(ctx, "FIGHT!", 270, 180, 64, b.slam > 1 ? "#c6f432" : "#fff", sc, Math.min(1, (1.75 - t) / 0.2));
        }
      },
      steps: [
        {
          id: "band", name: { en: "Black Band", ko: "검은 띠" }, param: "72px strip",
          cap: { en: "Put the words on a *band*. It frames the moment.", ko: "글자 뒤에 *띠*를 깔아요. 순간이 또렷해져요." },
          round(w, b) { b.band = 1; },
        },
        {
          id: "slide", name: { en: "Slide Through", ko: "휙 지나가기" }, param: "ease back · exit →",
          cap: { en: "\"ROUND 1\" *slides in*, overshoots, and *leaves*.", ko: "\"ROUND 1\"이 *휙* 들어와 살짝 넘치고 *나가요*." },
          round(w, b) { b.from = -480; },
        },
        {
          id: "slam", name: { en: "FIGHT Slam", ko: "FIGHT 쾅" }, param: "scale 3 → 1 · 140ms",
          cap: { en: "\"FIGHT!\" *slams in* from huge.", ko: "\"FIGHT!\"은 크게 시작해서 *쾅* 박혀요." },
          fight(w, b) { b.slam = 3; },
        },
        {
          id: "flash", name: { en: "White Pop", ko: "하얀 번쩍" }, param: "flash .6",
          cap: { en: "A *white pop* on FIGHT. The gate opens.", ko: "FIGHT에 *번쩍*. 문이 열리는 느낌." },
          fight(w) { w.flash("255,255,255", 0.6); },
        },
        {
          id: "stance", name: { en: "Fighters React", ko: "자세 잡기" }, param: "squash + dust",
          cap: { en: "Both fighters *drop into stance* on the word.", ko: "외치는 순간 둘 다 *자세를 낮춰요*." },
          fight(w) { for (const a of [w.hero, w.foe]) { a.sx = 1.15; a.sy = 0.82; dust(w, a.x, G, 6); } },
        },
        {
          id: "shake", name: { en: "Shake", ko: "흔들림" }, param: "trauma .35",
          cap: { en: "Shake the screen *once*. Then it's on.", ko: "화면을 *한 번* 흔들어요. 이제 시작." },
          fight(w) { w.shake(0.35); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "gong · slam",
          cap: { en: "A low *gong*, then a *slam* on FIGHT.", ko: "낮은 *둥*, FIGHT에 *쾅*." },
          round(w) { w.play(() => { tn({ type: "triangle", f: 196, dur: 0.7, vol: 0.3 }); tn({ f: 294, dur: 0.6, vol: 0.12 }); }); },
          fight(w) { w.sfx.crit(); w.sfx.slam(); },
        },
      ],
    },

    /* 12 ─ KO 멈춤 + 슬로모션 */
    {
      id: "fighting-ko-slowmo", cat: "fighting", view: "side",
      title: { en: "Make the K.O. *land*", ko: "K.O.를 *제대로* 꽂기" },
      intro: { en: "Fight's over. Nobody *noticed*.", ko: "경기가 끝났는데 *아무도 몰라요*." },
      interval: 2.0, stepDur: 4.2,
      setup(w) { duel(w); w.koT = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, h = w.hero;
        f.hp = f.hpLag = 22;
        w.tween(h, { x: f.x - 96 }, 0.07, "in", () => {
          const p = cp(w);
          f.hp = 0; f.lagWait = 0.4; f.flash = 1; h.ox = 34;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("ko", p, f);
          if (!f.flying) w.tween(f, { rot: 1.35 }, 0.35, "in");
          w.after(1.5, () => {
            Object.assign(f, { flying: false, alpha: 1, x: f.home, oy: 0, rot: 0, vx: 0, vy: 0, spin: 0, hp: 100, hpLag: 100 });
            w.cam.tx = 0;
            w.tween(h, { x: h.home }, 0.25, "inout", () => { w.busy = false; });
          });
        });
      },
      update(w, dt) { tick(w, dt); w.koT = Math.max(0, w.koT - dt); },
      drawHud(w, ctx) {
        hud(w, ctx);
        if (w.koT <= 0) return;
        const k = 1 - w.koT / 1.4, sc = k < 0.08 ? 2.4 - k / 0.08 * 1.4 : 1;
        big(ctx, "K.O.", 270, 118, 80, "#ef4444", sc, Math.min(1, w.koT / 0.2));
      },
      steps: [
        {
          id: "freeze", name: { en: "Final Freeze", ko: "마지막 멈춤" }, param: "300ms · tremble",
          cap: { en: "Hold the last hit *a long time*.", ko: "마지막 한 방은 *오래* 멈춰요." },
          ko(w, p, f) { w.hitstop(0.3); f.vib = 10; f.flash = 1.5; },
        },
        {
          id: "flash", name: { en: "White Out", ko: "하얗게" }, param: "flash .9 + burst",
          cap: { en: "*White out* the screen, a huge burst.", ko: "화면을 *하얗게*, 큰 폭발까지." },
          ko(w, p) { w.flash("255,255,255", 0.55); burst(w, p.x, p.y, "255,90,90", 2.2); sparks(w, p.x, p.y, 20, "255,200,180", [300, 800]); },
        },
        {
          id: "fly", name: { en: "Send Flying", ko: "날려 버리기" }, param: "vx 520 · spin 8",
          cap: { en: "Don't let it just fall. *Launch it.*", ko: "그냥 쓰러지지 말고 *날아가게*." },
          ko(w, p, f) { w.fly(f, 520, -720, 8); },
        },
        {
          id: "slowmo", name: { en: "Slow-mo", ko: "슬로모션" }, param: "0.22× for 1.3s",
          cap: { en: "*Slow time* so everyone sees it.", ko: "모두가 보게 *느리게*." },
          ko(w) { w.slowmo(0.22, 1.3); },
        },
        {
          id: "zoom", name: { en: "Zoom In", ko: "확대" }, param: "zoom .14 → foe",
          cap: { en: "*Push in* on the loser.", ko: "진 쪽으로 *훅* 다가가요." },
          ko(w) { w.zoomPunch(0.14); w.cam.tx = 50; w.cam.ty = -10; w.after(0.9, () => { w.cam.tx = 0; w.cam.ty = 0; }); },
        },
        {
          id: "text", name: { en: "K.O. Slam", ko: "K.O. 글자" }, param: "92px · scale 2.4 → 1",
          cap: { en: "Slam *K.O.* across the screen.", ko: "*K.O.*를 화면에 *쾅*." },
          ko(w) { w.koT = 1.4; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack + boom",
          cap: { en: "A *crack*, then a long *boom*.", ko: "*빡*, 그리고 길게 *쿠웅*." },
          ko(w) { w.sfx.crit(); w.sfx.boom(); },
        },
      ],
    },

    /* 13 ─ 깎기 데미지 */
    {
      id: "fighting-chip-damage", cat: "fighting", view: "side",
      title: { en: "Make chip damage *visible*", ko: "가드 데미지를 *보이게*" },
      intro: { en: "Blocking still costs HP. *Where did it go?*", ko: "막아도 체력이 닳아요. *어디서?*" },
      interval: 0.55, stepDur: 3.6,
      setup(w) { duel(w); w.chip = { t: 0, from: 100 }; },
      fire(w) {
        const f = w.foe;
        w.hero.ox = 36;
        w.after(0.04, () => {
          const p = cp(w);
          w.chip.from = f.hp; hurt(w, f, 4); f.ox += 6;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("chip", p, f);
        });
      },
      update(w, dt) { tick(w, dt); w.chip.t = Math.max(0, w.chip.t - dt); },
      drawHud(w, ctx) {
        hud(w, ctx);
        const c = w.chip, f = w.foe;
        if (c.t <= 0 || f.hp >= c.from) return;
        const x0 = 292 + 208 * f.hp / 100, x1 = 292 + 208 * c.from / 100;
        ctx.fillStyle = Math.sin(w.time * 40) > 0 ? "#ffffff" : "#93c5fd"; ctx.fillRect(x0, BY - 2, x1 - x0, BH + 4);
      },
      steps: [
        {
          id: "guard", name: { en: "Guard Spark", ko: "막기 불꽃" }, param: "blue · backward",
          cap: { en: "A small *blue* spark. It was a block.", ko: "작은 *파란* 불꽃. 막은 거예요." },
          chip(w, p) {
            w.spawn({ type: "ring", x: p.x + 6, y: p.y, size: 18, size1: 36, life: 0.22, w: 6, color: "96,165,250" });
            sparks(w, p.x, p.y, 6, "191,219,254", [180, 380], Math.PI - 0.8, Math.PI + 0.8);
          },
        },
        {
          id: "sliver", name: { en: "Blinking Sliver", ko: "깜빡이는 조각" }, param: "white/blue 0.6s",
          cap: { en: "*Blink* the exact sliver that was chipped off.", ko: "깎인 *그 조각*만 깜빡깜빡." },
          chip(w) { w.chip.t = 0.6; },
        },
        {
          id: "number", name: { en: "Tiny Number", ko: "작은 숫자" }, param: "−4 · gray · small",
          cap: { en: "A *small gray* number. Small hit, small text.", ko: "*작고 회색*인 숫자. 작은 피해엔 작은 글자." },
          chip(w, p) { pop(w, "-4", p.x + 24, p.y - 50, 18, "#cbd5e1", 0.6); },
        },
        {
          id: "barshake", name: { en: "Bar Jolt", ko: "체력바 움찔" }, param: "shake 0.2s",
          cap: { en: "*Jolt the bar* so eyes go up there.", ko: "*체력바를 툭* 흔들어 시선을 끌어요." },
          chip(w, p, f) { f.barShake = 0.2; },
        },
        {
          id: "slide", name: { en: "Grind Back", ko: "밀려나기" }, param: "+26px · dust",
          cap: { en: "Each block *grinds* the defender back.", ko: "막을 때마다 *질질* 밀려요." },
          chip(w, p, f) { f.ox += 26; f.k = 5; dust(w, f.x + 30, G, 3, 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clack + tick",
          cap: { en: "A *clack* plus a thin *tick* for the damage.", ko: "*탁* 위에 얇은 *틱*." },
          chip(w) { w.sfx.tock(); w.sfx.tick(); },
        },
      ],
    },

    /* 14 ─ 세기별 타격 불꽃 */
    {
      id: "fighting-spark-strength", cat: "fighting", view: "side",
      title: { en: "Size hit sparks by *strength*", ko: "약·중·강 불꽃을 *다르게*" },
      intro: { en: "Light, medium, heavy. *Same spark.*", ko: "약·중·강인데 *불꽃이 똑같아요*." },
      interval: 0.7, stepDur: 3.8,
      setup(w) { duel(w); w.str = 0; },
      fire(w) {
        const s = w.k++ % 3; w.str = s;
        w.hero.ox = [22, 34, 48][s];
        w.after(0.05, () => {
          const p = cp(w, [98, 84, 70][s]);
          hurt(w, w.foe, [4, 9, 16][s]); w.foe.flash = 1;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("hit", p, s);
        });
      },
      update(w, dt) { tick(w, dt); },
      drawHud(w, ctx) { hud(w, ctx); label(ctx, ["LIGHT", "MEDIUM", "HEAVY"][w.str], 270, 92, 14, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 800); },
      steps: [
        {
          id: "size", name: { en: "Spark Size", ko: "불꽃 크기" }, param: "22 / 40 / 70px",
          cap: { en: "Heavier hit, *bigger* flash. Simple.", ko: "셀수록 *크게*. 그게 다예요." },
          hit(w, p, s) { w.spawn({ type: "star", x: p.x, y: p.y, size: [22, 40, 70][s], life: 0.16, color: "255,255,255" }); },
        },
        {
          id: "color", name: { en: "Spark Color", ko: "불꽃 색" }, param: "white / gold / orange",
          cap: { en: "*White*, *gold*, *orange*. Color reads strength.", ko: "*하양*, *금색*, *주황*. 색으로도 세기가 읽혀요." },
          hit(w, p, s) { w.spawn({ type: "glow", x: p.x, y: p.y, size: [30, 56, 96][s], size1: 10, life: 0.24, color: ["230,240,255", "253,224,71", "251,113,60"][s] }); },
        },
        {
          id: "count", name: { en: "Spark Count", ko: "불꽃 개수" }, param: "4 / 10 / 24",
          cap: { en: "More sparks, flying *faster*.", ko: "개수도 늘고, *더 빨리* 튀어요." },
          hit(w, p, s) { sparks(w, p.x, p.y, [4, 10, 24][s], ["230,240,255", "255,230,140", "255,160,90"][s], [[150, 320], [220, 520], [300, 820]][s], -1.1, 1.1); },
        },
        {
          id: "ring", name: { en: "Heavy Ring", ko: "강공격 충격파" }, param: "heavy only",
          cap: { en: "Save the *shockwave* for heavy.", ko: "*충격파*는 강공격에만 아껴 둬요." },
          hit(w, p, s) {
            if (s < 2) return;
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 110, life: 0.32, w: 10, color: "255,200,140" });
            lines(w, p.x + 70, p.y, 5, 0, "255,230,200", 30);
          },
        },
        {
          id: "knock", name: { en: "Knockback", ko: "밀림" }, param: "8 / 22 / 50px",
          cap: { en: "Push the body *more* for heavier hits.", ko: "셀수록 몸도 *더* 밀려요." },
          hit(w, p, s) { w.foe.ox += [8, 22, 50][s]; w.foe.sx = [0.95, 0.88, 0.78][s]; },
        },
        {
          id: "shake", name: { en: "Shake", ko: "흔들림" }, param: "0 / .15 / .4",
          cap: { en: "Light doesn't shake. *Heavy does.*", ko: "약은 안 흔들고, *강만* 흔들어요." },
          hit(w, p, s) { w.shake([0, 0.15, 0.42][s], 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tap / thud / crack",
          cap: { en: "*Tap*, *thud*, *crack*. Heavier, lower.", ko: "*톡*, *퍽*, *빡*. 셀수록 낮게." },
          hit(w, p, s) { if (s === 0) w.sfx.hit(1.6); else if (s === 1) w.sfx.thud(); else w.sfx.crit(); },
        },
      ],
    },

    /* 15 ─ 막을 때 밀어내기 */
    {
      id: "fighting-block-pushback", cat: "fighting", view: "side",
      title: { en: "Push both apart on *block*", ko: "막으면 *서로 밀려나게*" },
      intro: { en: "Blocked, and they stay *glued* together.", ko: "막았는데 둘이 *딱 붙어* 있어요." },
      interval: 0.9, stepDur: 3.6,
      setup(w) { duel(w); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        w.tween(h, { x: f.x + f.ox - 100 }, 0.07, "in", () => {
          const p = cp(w);
          h.ox = 18; hurt(w, f, 1);
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("block", p);
          w.after(0.45, () => w.tween(h, { x: h.home }, 0.3, "inout", () => { w.busy = false; }));
        });
      },
      update(w, dt) { tick(w, dt); },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "push", name: { en: "Defender Slides", ko: "막은 쪽 밀림" }, param: "+70px · slow return",
          cap: { en: "The blocker *slides back*. Space opens up.", ko: "막은 쪽이 *쭉* 밀려요. 거리가 생겨요." },
          block(w) { const f = w.foe; f.ox += 70; f.k = 2.6; },
        },
        {
          id: "skid", name: { en: "Skid Marks", ko: "미끄러진 자국" }, param: "dust + streaks",
          cap: { en: "*Dust* and *skid lines* under the feet.", ko: "발밑에 *먼지*와 *끌린 자국*." },
          block(w) {
            const f = w.foe;
            for (let i = 0; i < 6; i++) w.after(i * 0.04, () => w.spawn({ type: "smoke", x: f.x + f.ox - 10, y: G - 4, vx: rand(-60, 20), vy: rand(-40, -10), drag: 3, size: 6, size1: 16, life: 0.5, color: "200,190,170" }));
            w.spawn({ type: "ellipse", under: true, x: f.x + 40, y: G + 2, size: 60, life: 1.2, color: "0,0,0", alpha: 0.5, add: false, hold: true });
          },
        },
        {
          id: "recoil", name: { en: "Attacker Recoils", ko: "때린 쪽도 반동" }, param: "−34px",
          cap: { en: "The *attacker* bounces back too.", ko: "*때린 쪽*도 튕겨 나가요." },
          block(w) { const h = w.hero; h.ox -= 34; h.sx = 0.9; },
        },
        {
          id: "guard", name: { en: "Guard Spark", ko: "막기 불꽃" }, param: "blue ring",
          cap: { en: "A *blue* spark marks the block.", ko: "*파란* 불꽃으로 막았다고 알려요." },
          block(w, p) {
            w.spawn({ type: "ring", x: p.x + 8, y: p.y, size: 24, size1: 48, life: 0.25, w: 7, color: "96,165,250" });
            sparks(w, p.x, p.y, 7, "191,219,254", [180, 420], Math.PI - 0.8, Math.PI + 0.8);
          },
        },
        {
          id: "brace", name: { en: "Brace", ko: "버티기" }, param: "sx 1.12 · sy .88",
          cap: { en: "The blocker *crouches* and braces.", ko: "막는 쪽이 *몸을 낮춰* 버텨요." },
          block(w) { const f = w.foe; f.sx = 1.12; f.sy = 0.88; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clack + skid",
          cap: { en: "A *clack* and a short *skid*.", ko: "*탁*, 그리고 짧게 *끼익*." },
          block(w) { w.sfx.tock(); w.sfx.skid(); },
        },
      ],
    },

    /* 16 ─ 입력 표시 / 커맨드 궤적 */
    {
      id: "fighting-input-display", cat: "fighting", view: "side",
      title: { en: "Show the *motion* input", ko: "커맨드 입력을 *보여주기*" },
      intro: { en: "Down, forward, punch. *You'd never know.*", ko: "↓↘→+P 했는데 *아무도 몰라요*." },
      interval: 1.2, stepDur: 4.0,
      setup(w) { duel(w); w.inp = { sx: 0, sy: 0, cx: 0, cy: 0, trail: [], log: [], btn: 0, ok: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const I = w.inp;
        [[0, 1, "d"], [0.71, 0.71, "df"], [1, 0, "f"]].forEach(([x, y, n], i) => w.after(i * 0.07, () => { I.sx = x; I.sy = y; w.emit("dir", I, n); }));
        w.after(0.22, () => {
          const h = w.hero, o = { x: h.x + 50, y: G - 80, vx: 640, vy: 0, orb: true, hitX: w.foe.x - 40 };
          I.btn = 1; h.ox = 20;
          o.onHit = () => { hurt(w, w.foe, 10); w.foe.flash = 1; w.foe.ox += 14; w.emit("hit", o); };
          w.emit("press", I);
          w.emit("launch", o);
          w.shoot(o);
        });
        w.after(0.45, () => { I.sx = 0; I.sy = 0; });
        w.after(0.95, () => { w.busy = false; });
      },
      update(w, dt) {
        tick(w, dt);
        const I = w.inp, k = Math.min(1, dt * 30);
        I.cx += (I.sx - I.cx) * k; I.cy += (I.sy - I.cy) * k;
        I.btn = Math.max(0, I.btn - dt * 3); I.ok = Math.max(0, I.ok - dt * 1.1);
        for (const q of I.trail) q.a -= dt * 1.6;
        I.trail = I.trail.filter(q => q.a > 0);
        for (const q of I.log) q.a -= dt * 0.35;
        I.log = I.log.filter(q => q.a > 0).slice(0, 5);
      },
      drawHud(w, ctx) {
        hud(w, ctx);
        const I = w.inp, JX = 70, JY = 238, R = 24;
        if (I.ok > 0) glow(ctx, JX, JY, 60, "198,244,50", I.ok * 0.6);
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.arc(JX, JY, R + 12, 0, TAU); ctx.fill();
        ctx.strokeStyle = I.ok > 0 ? "#c6f432" : "rgba(255,255,255,0.25)"; ctx.lineWidth = 2; ctx.stroke();
        if (I.trail.length > 1) {
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          for (let i = 1; i < I.trail.length; i++) {
            const a = I.trail[i - 1], b = I.trail[i];
            ctx.strokeStyle = `rgba(198,244,50,${b.a})`; ctx.lineWidth = 8 * b.a;
            ctx.beginPath(); ctx.moveTo(JX + a.x * R, JY + a.y * R); ctx.lineTo(JX + b.x * R, JY + b.y * R); ctx.stroke();
          }
        }
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(JX + I.cx * R, JY + I.cy * R, 10, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(JX + I.cx * R - 3, JY + I.cy * R - 3, 3.5, 0, TAU); ctx.fill();
        ctx.fillStyle = I.btn > 0 ? "#fca5a5" : "#7f1d1d"; ctx.beginPath(); ctx.arc(122, 250, 12, 0, TAU); ctx.fill();
        label(ctx, "P", 122, 251, 12, "#fff");
        I.log.forEach((q, i) => {
          ctx.save(); ctx.globalAlpha = Math.min(1, q.a * 1.5);
          const y = 104 + i * 22;
          if (q.n === "P") { ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(40, y, 9, 0, TAU); ctx.fill(); label(ctx, "P", 40, y + 1, 11, "#fff"); }
          else arrowG(ctx, { d: Math.PI / 2, df: Math.PI / 4, f: 0 }[q.n], 40, y, 18, I.ok > 0 ? "#c6f432" : "#e5e7eb");
          ctx.restore();
        });
        if (I.ok > 0) big(ctx, "SPECIAL!", 100, 178, 24, "#c6f432", 1, Math.min(1, I.ok * 2));
      },
      steps: [
        {
          id: "trail", name: { en: "Stick Trail", ko: "스틱 궤적" }, param: "fading path",
          cap: { en: "Leave a *trail* where the stick moved.", ko: "스틱이 지나간 길에 *꼬리*를 남겨요." },
          update(w) { const I = w.inp; if (Math.hypot(I.cx, I.cy) > 0.3) I.trail.push({ x: I.cx, y: I.cy, a: 1 }); },
        },
        {
          id: "log", name: { en: "Input Log", ko: "입력 기록" }, param: "last 5 inputs",
          cap: { en: "List the *last inputs*. Players can check themselves.", ko: "*최근 입력*을 쌓아요. 스스로 확인해요." },
          dir(w, I, n) { I.log.unshift({ n, a: 1 }); },
          press(w, I) { I.log.unshift({ n: "P", a: 1 }); },
        },
        {
          id: "button", name: { en: "Button Ring", ko: "버튼 고리" }, param: "ring on press",
          cap: { en: "The button *rings out* when pressed.", ko: "버튼을 누르면 *고리*가 퍼져요." },
          press(w) { w.spawn({ type: "ring", x: 122, y: 250, size: 12, size1: 36, life: 0.3, w: 4, color: "248,113,113" }); },
        },
        {
          id: "read", name: { en: "Success Glow", ko: "성공 빛" }, param: "lime + \"SPECIAL!\"",
          cap: { en: "When the motion *counts*, light it up *lime*.", ko: "커맨드가 *먹히면* 연두색으로 *번쩍*." },
          press(w, I) { I.ok = 1; },
        },
        {
          id: "orb", name: { en: "Charged Projectile", ko: "기 덩어리" }, param: "core + trail + burst",
          cap: { en: "Pay it off: the move itself *glows*.", ko: "보상은 확실히. 기술도 *빛나게*." },
          launch(w, o) { o.core = true; o.trail = "196,181,253"; },
          hit(w, o) { burst(w, o.x, o.y, "167,139,250", 1.2); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ticks · click · whoosh",
          cap: { en: "A *tick* per input, a *whoosh* on release.", ko: "입력마다 *톡*, 나갈 때 *슈욱*." },
          dir(w) { w.sfx.tick(); },
          press(w) { w.sfx.clickDown(); },
          launch(w) { w.sfx.magic(); },
          hit(w) { w.sfx.burst(); },
        },
      ],
    },
    /* 17 ─ 필살 기술 궤적 */
    {
      id: "fighting-special-trail", cat: "fighting", view: "side",
      title: { en: "Give a special move a *trail*", ko: "필살 기술에 *잔상* 남기기" },
      intro: { en: "A rising uppercut. Looks like a *jump*.", ko: "솟구치는 어퍼컷인데 *점프* 같아요." },
      interval: 1.4, stepDur: 4.0,
      setup(w) { duel(w); w.rise = false; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        w.rise = true;
        w.emit("start", { x: h.x + 40, y: G - 60 });
        w.tween(h, { oy: -105, x: h.home + 70 }, 0.24, "out", () => {
          w.rise = false;
          w.tween(h, { oy: 0, x: h.home + 40 }, 0.3, "in", () => {
            w.emit("land", h);
            w.tween(h, { x: h.home }, 0.25, "inout", () => { w.busy = false; });
          });
        });
        w.after(0.07, () => {
          const p = cp(w, 96);
          hurt(w, f, 16); f.flash = 1; f.air = true; f.vy = -520; f.vx = 120;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("hit", p);
        });
      },
      update(w, dt) {
        tick(w, dt);
        const f = w.foe;
        if (body(f, dt)) w.tween(f, { x: f.home }, 0.3, "inout");
      },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "ghosts", name: { en: "Afterimages", ko: "잔상" }, param: "1 ghost / frame",
          cap: { en: "Leave *afterimages* all the way up.", ko: "올라가는 내내 *잔상*을 남겨요." },
          update(w) { if (w.hero.oy < -4) ghost(w, w.hero, 0.25, "orange", 0.45); },
        },
        {
          id: "arc", name: { en: "Rising Arc", ko: "솟는 궤적" }, param: "crescent 0.3s",
          cap: { en: "Draw the *path* of the fist as a crescent.", ko: "주먹이 지나간 *길*을 초승달로." },
          start(w, p) {
            w.spawn({ type: "arc", x: p.x + 10, y: p.y - 70, size: 92, life: 0.32, a0: 1.2, a1: -1.7, color: "255,200,120" });
            w.spawn({ type: "arc", x: p.x + 10, y: p.y - 70, size: 76, life: 0.26, a0: 1.1, a1: -1.5, color: "255,255,255" });
          },
        },
        {
          id: "flame", name: { en: "Fist Fire", ko: "주먹 불꽃" }, param: "glow · 2 / frame",
          cap: { en: "Set the *fist on fire* while it rises.", ko: "올라가는 *주먹에 불*을 붙여요." },
          update(w) {
            if (!w.rise) return;
            const h = w.hero, x = h.x + h.ox + 42, y = G + h.oy - 128;
            for (let i = 0; i < 2; i++) w.spawn({ type: "glow", x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-40, 40), vy: rand(40, 120), size: rand(14, 22), size1: 2, life: rand(0.3, 0.5), color: i ? "255,140,40" : "255,220,120" });
          },
        },
        {
          id: "burst", name: { en: "Upward Burst", ko: "위로 터짐" }, param: "burst + up sparks",
          cap: { en: "Sparks fly *up*, the way the hit goes.", ko: "때린 방향, *위로* 불꽃이 튀어요." },
          hit(w, p) { burst(w, p.x, p.y, "255,150,60", 1.6); sparks(w, p.x, p.y, 16, "255,210,140", [250, 650], -2.3, -0.8); w.hitstop(0.08); },
        },
        {
          id: "dust", name: { en: "Takeoff Dust", ko: "도약 먼지" }, param: "ring + dust",
          cap: { en: "Kick up *dust* on takeoff and landing.", ko: "뛸 때, 내려올 때 *먼지*를 일으켜요." },
          start(w, p) { w.spawn({ type: "ring", flat: true, x: p.x - 30, y: G, size: 16, size1: 90, life: 0.4, w: 6, color: "220,210,190" }); dust(w, p.x - 30, G, 8); },
          land(w, h) { dust(w, h.x, G, 6); h.sy = 0.85; h.sx = 1.12; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "roar up · crack",
          cap: { en: "A *rising roar*, a sharp *crack*.", ko: "올라가는 *후오옹*, 날카로운 *빡*." },
          start(w) { w.play(() => { nz({ type: "bandpass", f: 400, f2: 2600, q: 1.5, dur: 0.3, vol: 0.4 }); tn({ type: "sawtooth", f: 110, f2: 330, dur: 0.25, vol: 0.06 }); }); },
          hit(w) { w.sfx.crit(); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 18 ─ 대시 캔슬 */
    {
      id: "fighting-dash-cancel", cat: "fighting", view: "side",
      title: { en: "Make a dash cancel *snap*", ko: "대시 캔슬을 *착*" },
      intro: { en: "Hit, dash, hit. Was that a *cancel?*", ko: "치고, 대시, 또 치고. *캔슬*이었나?" },
      interval: 1.2, stepDur: 4.0,
      setup(w) { duel(w); w.dashing = false; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        const strike = (n, dmg, push) => {
          const p = cp(w); hurt(w, f, dmg); f.flash = 1; f.ox += push; f.k = 4;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("hit", p, n);
        };
        h.ox = 30;
        w.after(0.04, () => strike(0, 6, 34));
        w.after(0.14, () => {
          w.emit("cancel", { x: h.x + h.ox, y: G });
          w.dashing = true;
          w.tween(h, { x: h.home + 62 }, 0.12, "out", () => {
            w.dashing = false; h.ox = 36;
            w.after(0.03, () => strike(1, 12, 50));
            w.after(0.45, () => w.tween(h, { x: h.home }, 0.3, "inout", () => { w.busy = false; }));
          });
        });
      },
      update(w, dt) { tick(w, dt); },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "flash", name: { en: "Cancel Flash", ko: "캔슬 번쩍" }, param: "cyan outline",
          cap: { en: "Flash the body *the frame* you cancel.", ko: "캔슬하는 *그 프레임*에 몸이 번쩍." },
          cancel(w) { const h = w.hero; h.flash = 1.2; const g = ghost(w, h, 0.3, "cyan", 0.9); g.sx = 1.2; g.sy = 1.08; },
        },
        {
          id: "ghosts", name: { en: "Dash Ghosts", ko: "대시 잔상" }, param: "ghost / frame",
          cap: { en: "Leave a line of *ghosts* through the dash.", ko: "대시 길을 따라 *잔상*을 줄줄이." },
          update(w) { if (w.dashing) ghost(w, w.hero, 0.22, "cyan", 0.45); },
        },
        {
          id: "dust", name: { en: "Push-off Dust", ko: "박차는 먼지" }, param: "dust back + ring",
          cap: { en: "*Dust* kicks backward from the feet.", ko: "발에서 *뒤로* 먼지가 튀어요." },
          cancel(w, p) { dust(w, p.x - 20, G, 8, -1); w.spawn({ type: "ring", flat: true, x: p.x - 10, y: G, size: 10, size1: 60, life: 0.3, w: 5, color: "200,230,255" }); },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "6 lines",
          cap: { en: "Streak *speed lines* behind the dash.", ko: "대시 뒤로 *속도선*을 그어요." },
          cancel(w, p) { lines(w, p.x - 10, G - 80, 6, 0, "165,243,252", 50); },
        },
        {
          id: "label", name: { en: "CANCEL Tag", ko: "CANCEL 표시" }, param: "small cyan text",
          cap: { en: "A small *CANCEL* tag teaches the trick.", ko: "작은 *CANCEL* 글자가 기술을 알려줘요." },
          cancel(w, p) { pop(w, "CANCEL", p.x, G - 168, 22, "#67e8f9", 0.6); },
        },
        {
          id: "payoff", name: { en: "Bigger Follow-up", ko: "더 센 후속타" }, param: "hit 2 = ×1.4",
          cap: { en: "The hit *after* the cancel lands *harder*.", ko: "캔슬 *뒤* 한 방은 *더 세게*." },
          hit(w, p, n) { burst(w, p.x, p.y, n ? "255,150,60" : "255,220,150", n ? 1.4 : 0.7); if (n) w.hitstop(0.08); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tap · whoosh · crack",
          cap: { en: "*Tap*, *whoosh*, *crack*. Three beats.", ko: "*톡*, *슉*, *빡*. 세 박자." },
          cancel(w) { w.sfx.dash(); },
          hit(w, p, n) { if (n) w.sfx.crit(); else w.sfx.hit(1.3); },
        },
      ],
    },

    /* 19 ─ 공중 콤보 */
    {
      id: "fighting-air-combo", cat: "fighting", view: "side",
      title: { en: "Keep an air combo *afloat*", ko: "공중 콤보를 *띄워 두기*" },
      intro: { en: "Air combo. Both just *fall* through it.", ko: "공중 콤보인데 둘 다 *그냥 떨어져요*." },
      interval: 1.5, stepDur: 4.2,
      setup(w) { duel(w); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        h.ox = 28; f.air = true; f.vy = -620; f.flash = 1; hurt(w, f, 6);
        w.after(0.08, () => { h.air = true; h.vy = -640; h.vx = 130; f.vx = 50; });
        [0.24, 0.36, 0.48].forEach((t, i) => w.after(t, () => {
          if (!f.air) return;
          const q = { x: f.x - 34, y: f.gy + f.oy - 70 };
          h.ox = 26; f.flash = 1; hurt(w, f, 5);
          w.spawn({ type: "circle", x: q.x, y: q.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("air", q, i + 2);
        }));
        w.after(0.62, () => {
          if (!f.air) return;
          f.vy = 1100; f.flash = 1; hurt(w, f, 10);
          w.emit("spike", { x: f.x - 30, y: f.gy + f.oy - 80 });
        });
      },
      update(w, dt) {
        tick(w, dt);
        const h = w.hero, f = w.foe;
        if (body(f, dt)) w.emit("land", f);
        if (body(h, dt)) { w.tween(h, { x: h.home }, 0.3, "inout"); w.tween(f, { x: f.home }, 0.3, "inout", () => { w.busy = false; }); }
        w.cam.ty = Math.min(0, Math.min(h.oy, f.oy) * 0.4);
      },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "sparks", name: { en: "Air Sparks", ko: "공중 불꽃" }, param: "burst per hit",
          cap: { en: "Every air hit gets a *burst*.", ko: "공중 타격마다 *팡*." },
          air(w, q) { burst(w, q.x, q.y, "255,190,90"); sparks(w, q.x, q.y, 8, "255,220,150", [200, 460]); },
        },
        {
          id: "arcs", name: { en: "Alternating Arcs", ko: "번갈아 궤적" }, param: "up / down swings",
          cap: { en: "Swing *up*, swing *down*. Arcs alternate.", ko: "*위로*, *아래로*. 궤적이 번갈아요." },
          air(w, q, n) { const up = n % 2; w.spawn({ type: "arc", x: q.x - 24, y: q.y, size: 56, life: 0.18, a0: up ? 1.2 : -1.2, a1: up ? -1.2 : 1.2, color: "255,250,230" }); },
        },
        {
          id: "float", name: { en: "Hits Hold You Up", ko: "때리면 떠 있음" }, param: "vy → −230 per hit",
          cap: { en: "Each hit *props both bodies up*. Gravity waits.", ko: "때릴 때마다 *둘 다 살짝 뜨게*. 중력은 잠깐 대기." },
          air(w) { const f = w.foe, h = w.hero; f.vy = Math.min(f.vy, -230); h.vy = Math.min(h.vy, -230); },
        },
        {
          id: "count", name: { en: "Hit Count", ko: "타수 표시" }, param: "growing text",
          cap: { en: "Count the hits *right in the air*.", ko: "*공중에서 바로* 타수를 세요." },
          air(w, q, n) { pop(w, n + " HIT", q.x + 64, q.y + 20, 18 + n * 3, "#fde047", 0.6); },
        },
        {
          id: "spike", name: { en: "Spike Finish", ko: "내리꽂기 마무리" }, param: "burst + floor ring",
          cap: { en: "End with a *spike*. Down hard, ring on the floor.", ko: "*내리꽂기*로 끝. 바닥에 충격파." },
          spike(w, p) { burst(w, p.x, p.y, "255,90,60", 1.8); lines(w, p.x + 10, p.y + 60, 6, Math.PI / 2, "255,255,255", 24); w.hitstop(0.1); },
          land(w, f) { w.spawn({ type: "ring", flat: true, x: f.x, y: G, size: 20, size1: 130, life: 0.45, w: 8, color: "255,230,190" }); dust(w, f.x, G, 12); f.sy = 0.6; f.sx = 1.3; w.shake(0.35); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising pops · slam",
          cap: { en: "Pops that *climb*, then a *slam*.", ko: "올라가는 *팡팡*, 그리고 *쾅*." },
          air(w, q, n) { w.sfx.hit(1 + n * 0.1); },
          spike(w) { w.sfx.crit(); },
          land(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 20 ─ 낙법 */
    {
      id: "fighting-tech-recovery", cat: "fighting", view: "side",
      title: { en: "Make a tech recovery *flash*", ko: "낙법을 *번쩍* 보이게" },
      intro: { en: "Knocked down. Gets up *very slowly*.", ko: "넘어지면 *세월아 네월아* 일어나요." },
      interval: 1.6, stepDur: 4.0,
      setup(w) { duel(w); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        w.hero.ox = 40;
        w.after(0.04, () => {
          const p = cp(w);
          hurt(w, f, 12); f.flash = 1; f.air = true; f.vy = -380; f.vx = 150;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.tween(f, { rot: 1.35 }, 0.25, "out");
        });
      },
      update(w, dt) {
        tick(w, dt);
        const f = w.foe;
        if (body(f, dt)) {
          w.emit("down", f);
          if (!w.on("tech")) w.after(0.75, () => w.tween(f, { rot: 0 }, 0.5, "inout", () => standUp(w)));
        }
      },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "tech", name: { en: "Quick Roll", ko: "빠른 구르기" }, param: "roll 260ms",
          cap: { en: "Roll *out of the fall* and stand right up.", ko: "넘어지자마자 *데굴* 굴러 바로 일어나요." },
          down(w, f) {
            f.rolling = true; w.emit("tech", f);
            w.tween(f, { rot: TAU, x: f.x + 26 }, 0.26, "out", () => { f.rot = 0; f.rolling = false; standUp(w); });
          },
        },
        {
          id: "flash", name: { en: "Tech Flash", ko: "낙법 번쩍" }, param: "white + cyan ring",
          cap: { en: "*Flash* on the frame you tech.", ko: "낙법하는 *순간* 번쩍." },
          tech(w, f) { f.flash = 1.3; w.spawn({ type: "ring", x: f.x, y: G - 50, size: 20, size1: 90, life: 0.35, w: 6, color: "103,232,249" }); },
        },
        {
          id: "label", name: { en: "TECH! Tag", ko: "TECH! 표시" }, param: "cyan text",
          cap: { en: "Name it, so players know *they did it*.", ko: "이름을 띄워요. *내가 해냈다*는 걸 알게." },
          tech(w, f) { pop(w, "TECH!", f.x, G - 150, 28, "#67e8f9", 0.8); },
        },
        {
          id: "ghosts", name: { en: "Roll Ghosts", ko: "구르기 잔상" }, param: "ghost / frame",
          cap: { en: "*Afterimages* make the roll read as fast.", ko: "*잔상*이 있어야 빨라 보여요." },
          update(w) { if (w.foe.rolling) ghost(w, w.foe, 0.2, "cyan", 0.4); },
        },
        {
          id: "blink", name: { en: "Safe Blink", ko: "무적 깜빡임" }, param: "blink 0.6s",
          cap: { en: "*Blink* while it's safe to get up.", ko: "일어나는 동안 *깜빡* = 무적." },
          tech(w, f) { f.blink = 0.6; },
        },
        {
          id: "dust", name: { en: "Landing Dust", ko: "착지 먼지" }, param: "ring + dust",
          cap: { en: "The fall still *lands*. Dust first.", ko: "넘어진 건 넘어진 거예요. 먼저 *먼지*." },
          down(w, f) { w.spawn({ type: "ring", flat: true, x: f.x, y: G, size: 20, size1: 100, life: 0.4, w: 6, color: "220,210,190" }); dust(w, f.x, G, 10); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thud · swish · ting",
          cap: { en: "*Thud* down, *swish* roll, tiny *ting*.", ko: "*쿵* 넘어지고, *휙* 구르고, *팅*." },
          down(w) { w.sfx.thud(); },
          tech(w) { w.sfx.swish(); w.sfx.chime(5); },
        },
      ],
    },

    /* 21 ─ 슈퍼 아머 */
    {
      id: "fighting-super-armor", cat: "fighting", view: "side",
      title: { en: "Show super armor *tanking* hits", ko: "슈퍼 아머가 *버티는* 게 보이게" },
      intro: { en: "Hit lands. It doesn't flinch. *Bug?*", ko: "맞았는데 꿈쩍도 안 해요. *버그?*" },
      interval: 0.6, stepDur: 3.6,
      setup(w) { duel(w); },
      fire(w) {
        const h = w.hero, f = w.foe;
        f.ox = -14; h.ox = 36;
        w.after(0.05, () => {
          const p = cp(w); hurt(w, f, 5);
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("hit", p);
        });
      },
      update(w, dt) { tick(w, dt); },
      drawBack(w, ctx) { if (w.on("tint")) { const f = w.foe; glow(ctx, f.x + f.ox, G - 70, 110, "251,146,60", 0.35 + 0.1 * Math.sin(w.time * 10)); } },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "tint", name: { en: "Armor Glow", ko: "아머 빛" }, param: "orange aura",
          cap: { en: "Glow *orange* while armored. Readable at a glance.", ko: "아머 중엔 *주황빛*. 한눈에 알아봐요." },
          update(w) { w.foe.burn = 1; },
        },
        {
          id: "clank", name: { en: "Metal Sparks", ko: "쇳소리 불꽃" }, param: "12 white sparks",
          cap: { en: "Sparks like hitting *metal*, not flesh.", ko: "살이 아니라 *쇠*를 친 불꽃." },
          hit(w, p) {
            w.spawn({ type: "star", x: p.x, y: p.y, size: 30, life: 0.12, color: "255,255,255" });
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 44, life: 0.22, w: 5, color: "251,146,60" });
            sparks(w, p.x, p.y, 12, "255,250,235", [300, 700], Math.PI - 1.2, Math.PI + 1.2);
          },
        },
        {
          id: "bounce", name: { en: "Attacker Bounces", ko: "때린 쪽이 튕김" }, param: "hero −40px",
          cap: { en: "The *attacker* bounces off instead.", ko: "오히려 *때린 쪽*이 튕겨 나가요." },
          hit(w) { const h = w.hero; h.ox -= 40; h.sx = 0.9; },
        },
        {
          id: "stop", name: { en: "Tiny Shiver", ko: "작은 떨림" }, param: "80ms · vib 3",
          cap: { en: "A short freeze. The armor *barely shivers*.", ko: "짧게 멈칫. 아머는 *살짝만* 떨려요." },
          hit(w) { w.hitstop(0.08); w.foe.vib = 3; w.hero.vib = 6; },
        },
        {
          id: "label", name: { en: "ARMOR Tag", ko: "ARMOR 표시" }, param: "orange text",
          cap: { en: "Say *ARMOR*. Now it's a rule, not a bug.", ko: "*ARMOR*라고 써요. 버그 아니고 규칙." },
          hit(w, p) { pop(w, "ARMOR", p.x + 34, p.y - 66, 22, "#fb923c", 0.6); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clank",
          cap: { en: "A metal *clank*, not a thud.", ko: "*퍽* 말고 *깡*." },
          hit(w) {
            w.play(() => { tn({ type: "square", f: 1250, f2: 900, dur: 0.12, vol: 0.12 }); tn({ type: "triangle", f: 2500, dur: 0.2, vol: 0.08 }); nz({ type: "highpass", f: 3500, dur: 0.08, vol: 0.3 }); });
            w.sfx.thunk();
          },
        },
      ],
    },

    /* 22 ─ 기상 리버설 */
    {
      id: "fighting-wakeup-reversal", cat: "fighting", view: "side",
      title: { en: "Make a wake-up reversal *explode*", ko: "기상 반격을 *폭발*하게" },
      intro: { en: "Gets up, uppercuts. *Just happened.*", ko: "일어나서 어퍼컷. *그냥 그랬어요*." },
      interval: 1.7, stepDur: 4.0,
      setup(w) { duel(w); w.hero.rot = -1.35; w.hero.oy = 26; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        w.tween(f, { x: h.x + 118 }, 0.18, "inout");
        w.after(0.2, () => { f.ox = -24; });
        w.after(0.22, () => {
          w.emit("wake", { x: h.x, y: G - 70 });
          w.tween(h, { rot: 0, oy: 0 }, 0.07, "out", () => {
            const p = cp(w, 100);
            h.ox = 30; hurt(w, f, 14); f.flash = 1; f.air = true; f.vy = -560; f.vx = 200;
            w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
            w.emit("hit", p);
          });
        });
      },
      update(w, dt) {
        tick(w, dt);
        const f = w.foe, h = w.hero;
        if (body(f, dt)) w.after(0.4, () => {
          w.tween(f, { x: f.home }, 0.3, "inout");
          w.tween(h, { rot: -1.35, oy: 26 }, 0.25, "in", () => { w.busy = false; });
        });
      },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "flash", name: { en: "Wake-up Flash", ko: "기상 번쩍" }, param: "flash + 100ms",
          cap: { en: "Flash and *freeze* on the first frame up.", ko: "일어나는 첫 프레임에 *번쩍, 멈칫*." },
          wake(w) { w.hero.flash = 1.6; w.hitstop(0.1); },
        },
        {
          id: "shine", name: { en: "Invincible Shine", ko: "무적 빛" }, param: "gold rays 0.4s",
          cap: { en: "Gold *rays* say: you can't touch me now.", ko: "금빛 *빛살* = 지금은 못 건드려요." },
          wake(w, p) {
            w.spawn({ type: "rays", x: p.x, y: p.y - 20, size: 170, life: 0.45, n: 12, vr: 3, color: "253,224,71", under: true });
            w.spawn({ type: "glow", under: true, x: p.x, y: p.y - 20, size: 40, size1: 120, life: 0.4, color: "253,224,71" });
          },
        },
        {
          id: "streak", name: { en: "Rising Streak", ko: "솟는 궤적" }, param: "arc + up-lines",
          cap: { en: "Swing the arc *straight up*.", ko: "궤적은 *위로 곧게*." },
          hit(w, p) {
            w.spawn({ type: "arc", x: p.x - 20, y: p.y + 10, size: 76, life: 0.24, a0: 0.6, a1: -1.9, color: "255,240,200" });
            lines(w, p.x, p.y - 60, 6, -Math.PI / 2, "255,255,255", 26);
          },
        },
        {
          id: "impact", name: { en: "Heavy Impact", ko: "묵직한 타격" }, param: "burst + 120ms + shake",
          cap: { en: "The punish hits *hard*. Freeze and shake.", ko: "반격은 *세게*. 멈칫하고 흔들어요." },
          hit(w, p) { burst(w, p.x, p.y, "255,190,60", 1.3); sparks(w, p.x, p.y, 18, "255,230,150", [260, 700], -2.4, -0.6); w.hitstop(0.12); w.shake(0.4); },
        },
        {
          id: "label", name: { en: "REVERSAL!", ko: "REVERSAL!" }, param: "gold text",
          cap: { en: "Call it out: *REVERSAL!*", ko: "크게 외쳐요. *REVERSAL!*" },
          hit(w) { pop(w, "REVERSAL!", 200, 112, 30, "#fde047", 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "shing · crack",
          cap: { en: "A bright *shing*, then a *crack*.", ko: "밝은 *챙*, 그리고 *빡*." },
          wake(w) { w.sfx.chime(0); w.sfx.swish(); },
          hit(w) { w.sfx.crit(); },
        },
      ],
    },

    /* 23 ─ 퍼펙트 KO */
    {
      id: "fighting-perfect-ko", cat: "fighting", view: "side",
      title: { en: "Celebrate a *PERFECT*", ko: "*퍼펙트* 승리 축하하기" },
      intro: { en: "Won without a scratch. *Same as any win.*", ko: "한 대도 안 맞고 이겼는데 *평범해요*." },
      interval: 2.0, stepDur: 4.2,
      setup(w) { duel(w); w.pT = 0; w.pf = 0; w.koT = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        f.hp = f.hpLag = 20; h.hp = h.hpLag = 100;
        h.ox = 40;
        w.after(0.05, () => {
          const p = cp(w);
          f.hp = 0; f.flash = 1; w.koT = 1.6;
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.tween(f, { rot: 1.35 }, 0.3, "in");
          w.emit("ko", p);
          w.after(0.2, () => w.emit("perfect", h));
          w.after(1.7, () => { Object.assign(f, { rot: 0, hp: 100, hpLag: 100 }); w.busy = false; });
        });
      },
      update(w, dt) { tick(w, dt); w.pT = Math.max(0, w.pT - dt); w.pf = Math.max(0, w.pf - dt); w.koT = Math.max(0, w.koT - dt); },
      drawHud(w, ctx) {
        hud(w, ctx, { hcol: w.pf > 0 ? "#fbbf24" : null });
        if (w.pf > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(40, BY, 208, BH); ctx.clip();
          const x = 20 + ((w.time * 420) % 280);
          ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.moveTo(x, BY); ctx.lineTo(x + 18, BY); ctx.lineTo(x + 6, BY + BH); ctx.lineTo(x - 12, BY + BH); ctx.closePath(); ctx.fill();
          ctx.restore();
          glow(ctx, 144, BY + 7, 120, "251,191,36", 0.25 * Math.min(1, w.pf));
        }
        if (w.pT > 0) {
          const k = 1 - w.pT / 1.5, sc = k < 0.1 ? 2 - k * 10 : 1 + Math.sin(w.time * 8) * 0.03;
          big(ctx, "PERFECT", 270, 166, 66, "#fde047", sc, Math.min(1, w.pT / 0.25));
        } else if (w.koT > 0) label(ctx, "K.O.", 270, 110, 24, "#fff");
      },
      steps: [
        {
          id: "text", name: { en: "PERFECT Banner", ko: "PERFECT 글자" }, param: "66px gold",
          cap: { en: "Not \"K.O.\". Say *PERFECT*, in gold.", ko: "\"K.O.\" 말고 금색 *PERFECT*." },
          perfect(w) { w.pT = 1.5; },
        },
        {
          id: "shine", name: { en: "Golden Bar", ko: "금빛 체력바" }, param: "gold + sweep",
          cap: { en: "Turn the *untouched bar* gold with a shine.", ko: "*한 칸도 안 깎인 바*를 금빛으로 반짝." },
          perfect(w) { w.pf = 1.5; },
        },
        {
          id: "rays", name: { en: "Gold Rays", ko: "금빛 빛살" }, param: "16 rays · 1.2s",
          cap: { en: "*Rays* behind the winner.", ko: "이긴 쪽 뒤로 *빛살*." },
          perfect(w, h) { w.spawn({ type: "rays", x: h.x, y: G - 70, size: 260, life: 1.3, n: 16, vr: 1.2, color: "253,224,71", under: true, hold: true }); },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "40 pieces",
          cap: { en: "Drop *confetti*. It's a party.", ko: "*꽃가루*를 뿌려요. 잔치예요." },
          perfect(w) {
            for (let i = 0; i < 40; i++) w.spawn({ type: "chunk", x: rand(40, 500), y: rand(70, 100), vx: rand(-60, 60), vy: rand(0, 120), g: 260, drag: 1, vr: rand(-10, 10), life: rand(1.2, 1.8), size: rand(3, 6), color: pick(["253,224,71", "198,244,50", "255,255,255", "251,146,60"]), hold: true });
          },
        },
        {
          id: "pose", name: { en: "Winner Pops", ko: "이긴 쪽 으쓱" }, param: "stretch + flash",
          cap: { en: "The winner *pops up* and glows.", ko: "이긴 쪽이 *으쓱* 커지고 빛나요." },
          perfect(w, h) { h.sy = 1.22; h.sx = 0.86; h.flash = 1; },
        },
        {
          id: "slow", name: { en: "Slow Finish", ko: "느린 마무리" }, param: "stop 150ms + 0.3×",
          cap: { en: "*Freeze*, then let the fall play *slow*.", ko: "*멈칫*하고, 쓰러지는 건 *느리게*." },
          ko(w, p) { w.hitstop(0.15); w.slowmo(0.3, 0.8); burst(w, p.x, p.y, "253,224,71", 1.6); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack · fanfare",
          cap: { en: "A *crack*, then a *fanfare*.", ko: "*빡*, 그리고 *빠바밤*." },
          ko(w) { w.sfx.crit(); },
          perfect(w) { w.sfx.fanfare(); },
        },
      ],
    },

    /* 24 ─ 시간 초과 */
    {
      id: "fighting-time-over", cat: "fighting", view: "side",
      title: { en: "Make TIME OVER *tense*", ko: "타임 오버에 *긴장감*" },
      intro: { en: "The clock hits zero. Fight *just stops*.", ko: "시간이 0이 되면 *그냥 멈춰요*." },
      interval: 2.6, stepDur: 4.2,
      setup(w) {
        duel(w);
        w.hero.hp = w.hero.hpLag = 72; w.foe.hp = w.foe.hpLag = 41;
        Object.assign(w, { tm: 99, run: false, last: 99, tmP: 0, toT: 0, win: 0 });
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        w.tm = 5.99; w.last = 6; w.run = true;
      },
      update(w, dt) {
        tick(w, dt);
        w.tmP = Math.max(0, w.tmP - dt * 4); w.toT = Math.max(0, w.toT - dt); w.win = Math.max(0, w.win - dt);
        if (!w.run) return;
        w.tm -= dt * 5;
        const n = Math.max(0, Math.ceil(w.tm));
        if (n < w.last) {
          w.last = n;
          if (n % 2) w.hero.ox = 18; else w.foe.ox = -18;
          w.emit("tick", n);
        }
        if (w.tm <= 0) {
          w.run = false; w.tm = 0;
          w.emit("timeup");
          w.after(1.4, () => { w.tm = 99; w.busy = false; });
        }
      },
      drawHud(w, ctx) {
        const n = Math.max(0, Math.ceil(w.tm)), red = w.on("red") && n <= 3;
        hud(w, ctx, { timer: "", hcol: w.win > 0 && Math.sin(w.time * 20) > 0 ? "#fef08a" : null });
        ctx.save(); ctx.translate(270, 49); ctx.scale(1 + w.tmP * 0.6, 1 + w.tmP * 0.6);
        label(ctx, String(n), 0, 0, 20, red ? "#f87171" : "#fff", "center", "'JetBrains Mono', monospace", 800);
        ctx.restore();
        if (w.toT > 0) {
          const k = Math.min(1, (1.4 - w.toT) / 0.12), a = Math.min(1, w.toT / 0.2);
          ctx.globalAlpha = a; ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, 150, 540, 64 * k); ctx.globalAlpha = 1;
          big(ctx, "TIME OVER", 270, 182, 50, "#f87171", 1, a, 0);
        }
        if (w.win > 0) big(ctx, "P1 WINS", 270, 238, 24, "#fde047", 1, Math.min(1, w.win / 0.2), 0);
      },
      steps: [
        {
          id: "red", name: { en: "Red Countdown", ko: "빨간 초읽기" }, param: "≤3 · scale 1.6",
          cap: { en: "Last seconds go *red* and *thump*.", ko: "마지막 몇 초는 *빨갛게*, *쿵쿵*." },
          tick(w, n) { if (n <= 3) w.tmP = 1; },
        },
        {
          id: "pulse", name: { en: "Clock Rings", ko: "시계 고리" }, param: "ring per second",
          cap: { en: "Each second *rings out* from the clock.", ko: "1초마다 시계에서 *고리*가 퍼져요." },
          tick(w, n) { if (n <= 3) w.spawn({ type: "ring", x: 270, y: 48, size: 16, size1: 46, life: 0.35, w: 4, color: "248,113,113" }); },
        },
        {
          id: "freeze", name: { en: "Freeze Both", ko: "둘 다 정지" }, param: "300ms · flash",
          cap: { en: "At zero, *everyone freezes*. Flash white.", ko: "0이 되면 *모두 정지*. 하얗게 번쩍." },
          timeup(w) { w.hitstop(0.3); w.hero.flash = 1; w.foe.flash = 1; w.flash("255,255,255", 0.45); },
        },
        {
          id: "banner", name: { en: "TIME OVER Band", ko: "TIME OVER 띠" }, param: "band + 50px text",
          cap: { en: "Say *TIME OVER* on a band.", ko: "띠 위에 *TIME OVER*." },
          timeup(w) { w.toT = 1.4; },
        },
        {
          id: "winner", name: { en: "Show the Winner", ko: "이긴 쪽 표시" }, param: "bar blink + text",
          cap: { en: "Blink the *bigger bar*. Who won is instant.", ko: "*더 긴 체력바*가 깜빡. 승자가 바로 보여요." },
          timeup(w) { w.win = 1.4; w.foe.tint = 0.6; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ticks · buzzer",
          cap: { en: "*Ticks* that count down, then a *buzzer*.", ko: "*똑딱* 초읽기, 그리고 *삐—*." },
          tick(w) { w.sfx.tock(); },
          timeup(w) { w.play(() => { tn({ type: "square", f: 150, dur: 0.7, vol: 0.16 }); tn({ type: "square", f: 152, dur: 0.7, vol: 0.12 }); }); },
        },
      ],
    },
    /* 25 ─ 캐릭터 선택 확정 */
    {
      id: "fighting-select-lockin", cat: "fighting", view: "ui",
      title: { en: "Make character select *lock in*", ko: "캐릭터 선택을 *딱* 확정" },
      intro: { en: "Picked a fighter. *Did it register?*", ko: "캐릭터 골랐는데 *된 거예요?*" },
      interval: 1.6, stepDur: 4.0,
      drawFloor() {},
      setup(w) {
        roster();
        w.k = 0; w.S = { cur: 0, cx: 0, pop: 1, pv: 1, lock: -1, lf: 0, ready: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, start = (w.k++ * 2) % 6;
        S.lock = -1; S.ready = 0;
        [1, 2].forEach(d => w.after(d * 0.11, () => { S.cur = (start + d) % 6; w.emit("move", S); }));
        w.after(0.36, () => { S.lock = S.cur; w.emit("lock", S); });
        w.after(1.45, () => { w.busy = false; });
        S.cur = start; w.emit("move", S);
      },
      update(w, dt) {
        const S = w.S;
        S.pop += (1.1 - S.pop) * Math.min(1, dt * 14); S.lf = Math.max(0, S.lf - dt * 3); S.ready = Math.max(0, S.ready - dt * 0.8);
        if (!w.on("glide")) S.cx = S.cur;
        if (!w.on("hover")) S.pop = 1;
        if (!w.on("preview")) S.pv = 1;
      },
      drawBack(w, ctx) {
        const S = w.S;
        // 왼쪽 큰 초상
        const id = S.cur, pv = S.pv;
        ctx.save(); ctx.beginPath(); ctx.rect(26, 80, 150, 230); ctx.clip();
        rr(ctx, 26, 80, 150, 230, 10, "rgba(255,255,255,0.05)");
        ctx.globalAlpha = Math.min(1, pv * 1.4);
        drawPortrait(ctx, id, 101 - (1 - pv) * 120, 92, 180, false);
        if (pv < 0.5) { ctx.globalAlpha = (0.5 - pv) * 1.6; ctx.fillStyle = "#fff"; ctx.fillRect(26, 80, 150, 230); }
        ctx.restore();
        label(ctx, CAST[id].name, 101, 296, 16, "#fff", "center", "'JetBrains Mono', monospace", 800);
        if (S.ready > 0) { const k = Math.min(1, (1 - S.ready) / 0.08); big(ctx, "READY", 101, 200, 34, "#c6f432", 2 - k, Math.min(1, S.ready * 3), -0.2); }
        // 칸 6개
        for (let i = 0; i < 6; i++) {
          const c = cell(i), hov = i === S.cur && S.lock < 0, sc = hov ? S.pop : 1, locked = i === S.lock;
          ctx.save(); ctx.translate(c.x + 40, c.y + 42); ctx.scale(sc, sc);
          ctx.beginPath(); ctx.roundRect(-38, -40, 76, 80, 8); ctx.fillStyle = locked ? "#2b3410" : "#1d2029"; ctx.fill();
          ctx.save(); ctx.clip(); drawPortrait(ctx, i, 0, -34, 120, !(hov || locked)); ctx.restore();
          if (locked && S.lf > 0) { ctx.fillStyle = `rgba(255,255,255,${S.lf})`; ctx.beginPath(); ctx.roundRect(-38, -40, 76, 80, 8); ctx.fill(); }
          ctx.lineWidth = locked ? 4 : 1.5; ctx.strokeStyle = locked ? "#c6f432" : "rgba(255,255,255,0.18)"; ctx.beginPath(); ctx.roundRect(-38, -40, 76, 80, 8); ctx.stroke();
          ctx.restore();
        }
        // 커서
        const a = cell(Math.floor(S.cx)), b = cell(Math.min(5, Math.floor(S.cx) + 1)), t = S.cx - Math.floor(S.cx);
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 2, y - 2, 84, 88, 10); ctx.stroke();
        label(ctx, "1P", x + 12, y - 8, 12, "#ef4444", "center", "'JetBrains Mono', monospace", 800);
      },
      steps: [
        {
          id: "glide", name: { en: "Cursor Glide", ko: "커서 미끄러짐" }, param: "ease 20/s",
          cap: { en: "The cursor *glides* between cells, not teleports.", ko: "커서가 순간이동 말고 *스윽* 이동." },
          update(w, dt) { const S = w.S; S.cx += (S.cur - S.cx) * Math.min(1, dt * 20); },
        },
        {
          id: "hover", name: { en: "Hover Pop", ko: "고른 칸 톡" }, param: "scale 1.25 → 1.1",
          cap: { en: "The hovered fighter *pops* and lights up.", ko: "올린 칸이 *톡* 커지고 밝아져요." },
          move(w, S) { S.pop = 1.25; },
        },
        {
          id: "preview", name: { en: "Preview Slide", ko: "큰 그림 슥" }, param: "slide + white",
          cap: { en: "The big portrait *slides in* each move.", ko: "옮길 때마다 큰 그림이 *슥* 들어와요." },
          move(w, S) { S.pv = 0; w.tween(S, { pv: 1 }, 0.18, "out"); },
        },
        {
          id: "flash", name: { en: "Lock Flash", ko: "확정 번쩍" }, param: "white cell + ring",
          cap: { en: "On lock: the cell *flashes white*.", ko: "확정하면 칸이 *하얗게* 번쩍." },
          lock(w, S) { S.lf = 1; const c = cell(S.lock); w.spawn({ type: "ring", x: c.x + 40, y: c.y + 42, size: 40, size1: 90, life: 0.35, w: 6, color: "198,244,50" }); },
        },
        {
          id: "stamp", name: { en: "READY Stamp", ko: "READY 도장" }, param: "scale 2 → 1 + shake",
          cap: { en: "*Stamp* READY on the portrait. Thunk.", ko: "초상 위에 *READY* 도장. 쾅." },
          lock(w, S) { S.ready = 1; w.shake(0.25); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ticks · shout",
          cap: { en: "Light *ticks* moving, a heavy *thunk* on lock.", ko: "옮길 땐 *톡톡*, 확정은 *쿵*." },
          move(w) { w.sfx.tick(); },
          lock(w) { w.sfx.crit(); w.sfx.chime(4); },
        },
      ],
    },

    /* 26 ─ VS 화면 */
    {
      id: "fighting-versus-screen", cat: "fighting", view: "ui",
      title: { en: "Make the VS screen *clash*", ko: "VS 화면에 *불꽃* 튀기기" },
      intro: { en: "Two pictures and \"VS\". *A slideshow.*", ko: "그림 둘에 \"VS\". *슬라이드쇼* 같아요." },
      interval: 2.0, stepDur: 4.0,
      drawFloor() {},
      setup(w) { roster(); w.V = { t: 9, slide: 0, diag: 0, slam: 1, names: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const V = w.V; Object.assign(V, { t: 0, slide: 0, diag: 0, slam: 1, names: 0 });
        w.emit("go", V);
        w.after(0.26, () => w.emit("vs", V));
        w.after(1.8, () => { w.busy = false; });
      },
      update(w, dt) { w.V.t += dt; },
      drawBack(w, ctx) {
        const V = w.V, t = V.t;
        if (t > 1.8) return;
        const k = V.slide ? E.out(Math.min(1, t / 0.24)) : 1, off = (1 - k) * 320, d = V.diag ? 40 : 0;
        ctx.save();
        ctx.beginPath(); ctx.moveTo(-off, 40); ctx.lineTo(270 + d - off, 40); ctx.lineTo(270 - d - off, 330); ctx.lineTo(-off, 330); ctx.closePath();
        ctx.fillStyle = "#1e3a5f"; ctx.fill(); ctx.save(); ctx.clip(); drawPortrait(ctx, 0, 150 - off, 60, 300); ctx.restore();
        ctx.beginPath(); ctx.moveTo(540 + off, 40); ctx.lineTo(270 + d + off, 40); ctx.lineTo(270 - d + off, 330); ctx.lineTo(540 + off, 330); ctx.closePath();
        ctx.fillStyle = "#5f1e1e"; ctx.fill(); ctx.save(); ctx.clip(); drawPortrait(ctx, 4, 400 + off, 90, 250); ctx.restore();
        if (V.diag) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(270 + d, 40); ctx.lineTo(270 - d, 330); ctx.stroke(); }
        if (V.names) {
          const n = E.out(Math.min(1, Math.max(0, (t - 0.3) / 0.2)));
          rr(ctx, 30 - (1 - n) * 200, 280, 150, 30, 4, "#c6f432"); label(ctx, "STONE", 105 - (1 - n) * 200, 296, 18, "#121318");
          rr(ctx, 360 + (1 - n) * 200, 280, 150, 30, 4, "#f87171"); label(ctx, "ENEMY", 435 + (1 - n) * 200, 296, 18, "#121318");
        }
        ctx.restore();
        if (t >= 0.26) { const q = Math.min(1, (t - 0.26) / 0.12), sc = 1 + (V.slam - 1) * (1 - E.out(q)); big(ctx, "VS", 270, 186, 80, "#fde047", sc, 1, -0.1); }
      },
      steps: [
        {
          id: "slide", name: { en: "Panels Slide In", ko: "양쪽에서 등장" }, param: "±320px · 240ms",
          cap: { en: "Fighters *rush in* from both sides.", ko: "양쪽에서 *돌진*하듯 들어와요." },
          go(w, V) { V.slide = 1; },
        },
        {
          id: "diag", name: { en: "Diagonal Split", ko: "사선 분할" }, param: "slant 40px + edge",
          cap: { en: "Split on a *slant*. Straight lines feel calm.", ko: "*사선*으로 나눠요. 직선은 너무 차분해요." },
          go(w, V) { V.diag = 1; },
        },
        {
          id: "slam", name: { en: "VS Slam", ko: "VS 쾅" }, param: "scale 3.2 → 1",
          cap: { en: "*VS* drops in huge and slams.", ko: "*VS*가 크게 떨어져 *쾅*." },
          vs(w, V) { V.slam = 3.2; },
        },
        {
          id: "bolts", name: { en: "Sparks at VS", ko: "VS 불꽃" }, param: "ring + 24 sparks",
          cap: { en: "*Sparks* where the two sides meet.", ko: "두 편이 맞닿는 곳에 *불꽃*." },
          vs(w) { w.spawn({ type: "ring", x: 270, y: 186, size: 20, size1: 150, life: 0.4, w: 10, color: "253,224,71" }); sparks(w, 270, 186, 24, "255,240,180", [250, 700]); },
        },
        {
          id: "names", name: { en: "Name Plates", ko: "이름표" }, param: "slide after VS",
          cap: { en: "*Name plates* slide in right after.", ko: "바로 뒤에 *이름표*가 슥." },
          go(w, V) { V.names = 1; },
        },
        {
          id: "shake", name: { en: "Impact", ko: "충격" }, param: "flash + trauma .4",
          cap: { en: "*Flash and shake* on VS. Two forces collide.", ko: "VS에 *번쩍, 흔들*. 두 힘이 부딪쳐요." },
          vs(w) { w.flash("255,255,255", 0.6); w.shake(0.4); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swoosh · slam",
          cap: { en: "Two *swooshes*, one big *slam*.", ko: "*슉슉* 두 번, 크게 *쾅*." },
          go(w) { w.sfx.dash(); },
          vs(w) { w.sfx.slam(); w.sfx.crit(); },
        },
      ],
    },

    /* 27 ─ 회복 가능한 빨간 체력 */
    {
      id: "fighting-red-health", cat: "fighting", view: "side",
      title: { en: "Show *recoverable* red health", ko: "되찾을 수 있는 *빨간 체력*" },
      intro: { en: "Every hit is *gone forever*. No reason to back off.", ko: "맞으면 *영영* 끝. 물러날 이유가 없어요." },
      interval: 1.3, stepDur: 4.0,
      setup(w) { duel(w); w.rec = 100; w.since = 9; w.pulse = 1; },
      fire(w) {
        const h = w.hero, f = w.foe;
        f.ox = -46;
        w.after(0.06, () => {
          const d = 24, p = { x: h.x + 34, y: G - 90 };
          h.ox -= 10; h.flash = 0.6; w.since = 0;
          hurt(w, h, d);
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("hurt", h, d, p);
        });
      },
      update(w, dt) { tick(w, dt); w.since += dt; if (!w.on("red") || w.rec < w.hero.hp) w.rec = w.hero.hp; },
      drawHud(w, ctx) {
        hud(w, ctx, { hlag: "rgba(255,255,255,0.6)" });
        const h = w.hero, bw = 208;
        if (w.rec > h.hp) {
          ctx.fillStyle = `rgba(239,68,68,${0.55 + 0.45 * w.pulse})`;
          ctx.fillRect(248 - bw * w.rec / 100, BY, bw * (w.rec - h.hp) / 100, BH);
        }
      },
      steps: [
        {
          id: "red", name: { en: "Red Portion", ko: "빨간 부분" }, param: "60% recoverable",
          cap: { en: "Part of the damage stays *red*: not gone yet.", ko: "피해 일부는 *빨갛게* 남아요. 아직 안 잃었어요." },
          hurt(w, h, d) { w.rec = Math.min(100, h.hp + d * 0.6); },
        },
        {
          id: "regen", name: { en: "Slow Regen", ko: "천천히 회복" }, param: "14 HP/s after 0.4s",
          cap: { en: "Stay safe and the red *grows back*.", ko: "안 맞고 버티면 빨간 부분이 *차올라요*." },
          update(w, dt) { const h = w.hero; if (w.since > 0.4 && w.rec > h.hp) { h.hp = Math.min(w.rec, h.hp + dt * 14); h.hpLag = Math.max(h.hpLag, h.hp); } },
        },
        {
          id: "pulse", name: { en: "Pulsing Red", ko: "맥박 치는 빨강" }, param: "8 Hz",
          cap: { en: "Make the red *throb*. It's still yours.", ko: "빨간 부분이 *두근두근*. 아직 내 거예요." },
          update(w) { w.pulse = 0.5 + 0.5 * Math.sin(w.time * 8); },
        },
        {
          id: "sparkle", name: { en: "Edge Sparkle", ko: "회복 반짝" }, param: "glow at bar edge",
          cap: { en: "*Sparkle* the edge while it refills.", ko: "차오르는 끝에서 *반짝반짝*." },
          update(w) {
            const h = w.hero;
            if (w.since > 0.4 && w.rec > h.hp + 0.5 && Math.random() < 0.4) w.spawn({ type: "glow", x: 248 - 208 * h.hp / 100, y: BY + 7 + rand(-6, 6), vy: rand(-40, -10), size: rand(6, 12), size1: 0, life: 0.4, color: "134,239,172" });
          },
        },
        {
          id: "numbers", name: { en: "Split Numbers", ko: "나눠 보이는 숫자" }, param: "−10 lost · −14 red",
          cap: { en: "Show what's *lost* and what's *recoverable*.", ko: "*잃은 것*과 *되찾을 것*을 나눠 보여요." },
          hurt(w, h, d, p) { pop(w, "-" + Math.round(d * 0.4), p.x - 14, p.y - 50, 30, "#fff", 0.9); pop(w, "-" + Math.round(d * 0.6), p.x + 30, p.y - 22, 26, "#f87171", 0.9); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hurt · soft tick",
          cap: { en: "A hurt *grunt*, and a soft *tick* as it heals.", ko: "맞으면 *윽*, 차오를 땐 작은 *똑*." },
          hurt(w) { w.sfx.hurt(); },
          update(w) { const h = w.hero; if (w.since > 0.4 && w.rec > h.hp + 0.5 && Math.random() < 0.05) w.sfx.tick(); },
        },
      ],
    },

    /* 28 ─ 기절 */
    {
      id: "fighting-dizzy", cat: "fighting", view: "side",
      title: { en: "Make a stun *dizzy*", ko: "기절을 *빙글빙글*" },
      intro: { en: "It's stunned. It's just… *standing there*.", ko: "기절했는데… 그냥 *서 있어요*." },
      interval: 1.9, stepDur: 4.0,
      setup(w) { duel(w); w.dz = { t: 0, bar: 0, stars: 0, bf: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, D = w.dz;
        [0, 0.14].forEach((t, i) => w.after(t, () => {
          const p = cp(w); w.hero.ox = 34; f.flash = 1; f.ox += 10; hurt(w, f, 8);
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("hit", p, i + 1);
          if (i === 1) { D.t = 1.3; w.emit("stun", p); }
        }));
        w.after(1.6, () => { w.busy = false; });
      },
      update(w, dt) {
        tick(w, dt);
        const D = w.dz, f = w.foe;
        D.bf = Math.max(0, D.bf - dt * 3);
        if (D.t > 0) { D.t -= dt; if (D.t <= 0) { f.rot = 0; D.bar = 0; D.stars = 0; } }
      },
      drawFront(w, ctx) {
        const D = w.dz, f = w.foe;
        if (!(D.t > 0 && D.stars)) return;
        const cx = f.x + f.ox - 16, cy = G - f.h - 6;
        for (let i = 0; i < 4; i++) {
          const a = w.time * 7 + i * TAU / 4, x = cx + Math.cos(a) * 40, y = cy + Math.sin(a) * 11, s = 9 + 3 * Math.sin(a);
          ctx.fillStyle = Math.sin(a) > 0 ? "#fde047" : "rgba(253,224,71,0.5)"; starPath(ctx, x, y, s); ctx.fill();
        }
      },
      drawHud(w, ctx) {
        hud(w, ctx);
        if (!w.on("meter")) return;
        const D = w.dz;
        rr(ctx, 290, 62, 154, 10, 3, "rgba(0,0,0,0.75)");
        ctx.fillStyle = D.bf > 0 && Math.sin(w.time * 40) > 0 ? "#fff" : "#fde047"; ctx.fillRect(292, 64, 150 * D.bar, 6);
      },
      steps: [
        {
          id: "meter", name: { en: "Stun Meter", ko: "기절 게이지" }, param: "fills per hit",
          cap: { en: "A *stun meter* fills up, so it's no surprise.", ko: "*기절 게이지*가 차요. 갑자기가 아니게." },
          hit(w, p, n) { w.dz.bar = n / 2; w.dz.bf = n === 2 ? 1 : 0; },
        },
        {
          id: "burst", name: { en: "Stun Burst", ko: "기절 순간" }, param: "yellow burst + 150ms",
          cap: { en: "The moment it breaks: *yellow burst*, freeze.", ko: "기절하는 순간 *노란 폭발*, 멈칫." },
          stun(w, p) { burst(w, p.x, p.y, "253,224,71", 1.6); w.foe.flash = 1.5; w.hitstop(0.15); },
        },
        {
          id: "stars", name: { en: "Circling Stars", ko: "도는 별" }, param: "4 stars orbit",
          cap: { en: "*Stars* circle the head. Universal sign.", ko: "머리 위로 *별*이 빙글. 만국 공통." },
          stun(w) { w.dz.stars = 1; },
        },
        {
          id: "wobble", name: { en: "Wobble", ko: "휘청휘청" }, param: "rot ±0.2 · sway",
          cap: { en: "The body *sways* on its feet.", ko: "몸이 제자리에서 *휘청휘청*." },
          update(w) { const D = w.dz, f = w.foe; if (D.t > 0) { f.rot = Math.sin(w.time * 6) * 0.2; f.ox = Math.sin(w.time * 3) * 8; } },
        },
        {
          id: "label", name: { en: "DIZZY! Tag", ko: "DIZZY! 표시" }, param: "yellow text",
          cap: { en: "Tell the attacker: *free hits now*.", ko: "때린 쪽에 알려줘요. *지금이야*." },
          stun(w, p) { pop(w, "DIZZY!", p.x - 80, G - 160, 28, "#fde047", 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thuds · chirps",
          cap: { en: "Two *thuds*, then cartoon *chirps*.", ko: "*퍽퍽*, 그리고 *짹짹*." },
          hit(w) { w.sfx.thud(); },
          stun(w) { w.play(() => { for (let i = 0; i < 6; i++) tn({ type: "triangle", f: i % 2 ? 2400 : 2000, dur: 0.07, vol: 0.1, delay: 0.15 + i * 0.1 }); }); },
        },
      ],
    },

    /* 29 ─ 장풍 상쇄 */
    {
      id: "fighting-projectile-clash", cat: "fighting", view: "side",
      title: { en: "Make projectiles *collide*", ko: "장풍끼리 *부딪치게*" },
      intro: { en: "Two fireballs meet and… *vanish*.", ko: "장풍 두 개가 만나서… *사라져요*." },
      interval: 1.2, stepDur: 3.8,
      setup(w) { duel(w, { hx: 140, fx: 400 }); },
      fire(w) {
        const h = w.hero, f = w.foe;
        const a = { x: h.x + 50, y: G - 80, vx: 300, vy: 0, col: "196,181,253", draw: orb };
        const b = { x: f.x - 60, y: G - 80, vx: -300, vy: 0, col: "134,239,172", draw: orb };
        a.test = p => p.x >= b.x;
        a.onHit = () => { w.shots = w.shots.filter(s => s !== b); w.emit("clash", { x: (a.x + b.x) / 2, y: a.y }); };
        h.ox = 26; f.ox = -26;
        w.emit("launch", a, b);
        w.shoot(a); w.shoot(b);
      },
      update(w, dt) { tick(w, dt); },
      drawHud(w, ctx) { hud(w, ctx); },
      steps: [
        {
          id: "glow", name: { en: "Glowing Cores", ko: "빛나는 핵" }, param: "white core + color",
          cap: { en: "*White core*, colored glow. Each side its color.", ko: "가운데는 *하얗게*, 바깥은 각자 색." },
          launch(w, a, b) { a.glow = b.glow = true; },
        },
        {
          id: "trail", name: { en: "Trails", ko: "꼬리" }, param: "colored embers",
          cap: { en: "Give both a *trail* so the paths read.", ko: "둘 다 *꼬리*를 달아 길이 보이게." },
          launch(w, a, b) { a.trail = a.col; b.trail = b.col; },
        },
        {
          id: "burst", name: { en: "Two-color Burst", ko: "두 색 폭발" }, param: "purple + green",
          cap: { en: "Burst in *both colors* where they meet.", ko: "만난 자리에서 *두 색*이 터져요." },
          clash(w, c) {
            w.spawn({ type: "star", x: c.x, y: c.y, size: 60, life: 0.18, color: "255,255,255" });
            w.spawn({ type: "glow", under: true, x: c.x - 20, y: c.y, size: 90, size1: 40, life: 0.7, color: "167,139,250" });
            w.spawn({ type: "glow", under: true, x: c.x + 20, y: c.y, size: 90, size1: 40, life: 0.7, color: "74,222,128" });
            sparks(w, c.x, c.y, 14, "196,181,253", [250, 650], Math.PI / 2, Math.PI * 1.5);
            sparks(w, c.x, c.y, 14, "134,239,172", [250, 650], -Math.PI / 2, Math.PI / 2);
          },
        },
        {
          id: "stop", name: { en: "Clash Freeze", ko: "부딪힘 멈칫" }, param: "120ms",
          cap: { en: "*Freeze* on contact. Two forces push.", ko: "닿는 순간 *멈칫*. 힘겨루기." },
          clash(w) { w.hitstop(0.12); },
        },
        {
          id: "wave", name: { en: "Shockwave", ko: "충격파" }, param: "ring + beam + push",
          cap: { en: "A *shockwave* pushes both fighters back.", ko: "*충격파*가 두 사람을 밀어내요." },
          clash(w, c) {
            w.spawn({ type: "ring", x: c.x, y: c.y, size: 10, size1: 140, life: 0.45, w: 10, color: "255,255,255" });
            w.spawn({ type: "beam", x: c.x, y: G, size: 26, h: 190, life: 0.3, color: "230,230,255" });
            w.hero.ox -= 22; w.foe.ox += 22; w.shake(0.3);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh ×2 · boom",
          cap: { en: "Two *whooshes*, one *boom*.", ko: "*슈욱* 두 번, *펑* 한 번." },
          launch(w) { w.sfx.magic(); },
          clash(w) { w.sfx.burst(); w.sfx.thud(); },
        },
      ],
    },

    /* 30 ─ 세기별 히트스톱 */
    {
      id: "fighting-hitstop-scale", cat: "fighting", view: "side",
      title: { en: "Scale hit stop by *strength*", ko: "히트스톱을 *세기별로*" },
      intro: { en: "Jab or haymaker? They feel *the same*.", ko: "잽이나 강펀치나 *똑같은 느낌*." },
      interval: 0.8, stepDur: 3.8,
      setup(w) { duel(w); w.str = 0; w.fr = { n: 0, t: 0 }; },
      fire(w) {
        const s = w.k++ % 3; w.str = s;
        w.hero.ox = [22, 34, 48][s];
        w.after(0.05, () => {
          const p = cp(w, [98, 84, 70][s]);
          hurt(w, w.foe, [4, 9, 16][s]); w.foe.flash = 1; w.foe.ox += [6, 14, 28][s];
          w.spawn({ type: "circle", x: p.x, y: p.y, size: 12, life: 0.16, color: "245,245,245" });
          w.emit("hit", p, s);
        });
      },
      update(w, dt) { tick(w, dt); w.fr.t = Math.max(0, w.fr.t - dt); },
      drawHud(w, ctx) {
        hud(w, ctx);
        label(ctx, ["LIGHT", "MEDIUM", "HEAVY"][w.str], 270, 92, 14, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 800);
        const F = w.fr;
        if (!(F.t > 0)) return;
        ctx.globalAlpha = Math.min(1, F.t * 3);
        for (let i = 0; i < 10; i++) rr(ctx, 160 + i * 20, 308, 16, 16, 3, i < F.n ? "#c6f432" : "rgba(255,255,255,0.12)");
        label(ctx, `HIT STOP ${F.n}f`, 270, 297, 13, "#c6f432", "center", "'JetBrains Mono', monospace", 800);
        ctx.globalAlpha = 1;
      },
      steps: [
        {
          id: "stop", name: { en: "Scaled Freeze", ko: "세기별 멈춤" }, param: "2f / 5f / 10f",
          cap: { en: "Light *barely* stops. Heavy *holds*.", ko: "약은 *찰나*, 강은 *오래* 멈춰요." },
          hit(w, p, s) { w.hitstop([0.033, 0.083, 0.166][s]); },
        },
        {
          id: "vib", name: { en: "Scaled Tremble", ko: "세기별 떨림" }, param: "vib 2 / 5 / 10px",
          cap: { en: "The victim *trembles* more on heavy hits.", ko: "셀수록 맞은 쪽이 *더 떨려요*." },
          hit(w, p, s) { w.foe.vib = [2, 5, 10][s]; w.foe.vibFade = 40; },
        },
        {
          id: "frames", name: { en: "Frame Meter", ko: "프레임 표시" }, param: "boxes = frames",
          cap: { en: "Here's the frame count. *Feel* the difference.", ko: "멈춘 프레임 수예요. 차이를 *느껴* 봐요." },
          hit(w, p, s) { w.fr = { n: [2, 5, 10][s], t: 0.7 }; },
        },
        {
          id: "spark", name: { en: "Scaled Spark", ko: "세기별 불꽃" }, param: "×0.5 / ×0.9 / ×1.5",
          cap: { en: "Match the spark to the stop.", ko: "불꽃 크기도 멈춤에 맞춰요." },
          hit(w, p, s) { burst(w, p.x, p.y, "255,200,120", [0.5, 0.9, 1.5][s]); },
        },
        {
          id: "zoom", name: { en: "Heavy Zoom", ko: "강공격 확대" }, param: "heavy · zoom .08",
          cap: { en: "Only heavy gets a *zoom punch*.", ko: "*확대*는 강공격만." },
          hit(w, p, s) { if (s === 2) { w.zoomPunch(0.08); w.shake(0.3, 1); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch by strength",
          cap: { en: "Lower pitch, *longer* sound for heavy.", ko: "셀수록 *낮고 길게*." },
          hit(w, p, s) { if (s === 2) w.sfx.crit(); else w.sfx.hit(s ? 1 : 1.5); },
        },
      ],
    },
  );
  // 격투 장면 레시피는 모두 팔 그리기를 앞쪽 그림 단계에 끼워 넣어요
  for (const r of RECIPES) {
    if (!r.id.startsWith("fighting-") || r.armed) continue;
    const front = r.drawFront;
    r.armed = true;
    r.drawFront = function (w, ctx) { arms(w, ctx); if (front) front.call(this, w, ctx); };
  }
})();

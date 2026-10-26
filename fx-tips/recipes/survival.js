"use strict";
/* survival — 생존·샌드박스·제작·공포 레시피 */
(() => {
  // 먼지: 블룸에 하얗게 번지지 않도록 바닥 레이어(under)에 그림
  const dirt = (w, x, y, n, dir = 0, col = "150,140,130") => { for (let i = 0; i < n; i++) w.spawn({ type: "smoke", under: true, x: x + rand(-10, 10), y: y - rand(0, 6), vx: (dir || (Math.random() < 0.5 ? -1 : 1)) * rand(40, 180), vy: rand(-60, -10), drag: 3, size: rand(4, 8), size1: rand(12, 20), life: rand(0.35, 0.6), color: col }); };
  /* ───────── 파일 전용 도우미 ───────── */
  // 어둠 레이어: 검게 덮고, 빛이 닿는 곳만 지움 (원형 또는 원뿔)
  let DK = null;
  const shade = (ctx, a, lights = [], col = "6,8,16") => {
    if (!DK) { DK = document.createElement("canvas"); DK.width = 700; DK.height = 520; }
    const x = DK.getContext("2d"), O = 80;
    x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, 700, 520);
    x.fillStyle = `rgba(${col},${a})`; x.fillRect(0, 0, 700, 520);
    x.globalCompositeOperation = "destination-out";
    for (const L of lights) {
      const cx = L.x + O, cy = L.y + O, g = x.createRadialGradient(cx, cy, 0, cx, cy, L.r);
      g.addColorStop(0, `rgba(0,0,0,${L.a ?? 1})`); g.addColorStop(L.hard ?? 0.4, `rgba(0,0,0,${(L.a ?? 1) * 0.8})`); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.beginPath();
      if (L.cone) { x.moveTo(cx, cy); x.arc(cx, cy, L.r, L.cone[0] - L.cone[1], L.cone[0] + L.cone[1]); x.closePath(); }
      else x.arc(cx, cy, L.r, 0, TAU);
      x.fill();
    }
    ctx.drawImage(DK, -O, -O);
  };
  const sky = (ctx, top, bot, y1 = G) => {
    const g = ctx.createLinearGradient(0, -40, 0, y1);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(-80, -80, 700, y1 + 80);
  };
  const soil = (ctx, col = "rgba(255,255,255,0.03)", line = "rgba(255,255,255,0.22)") => {
    ctx.fillStyle = col; ctx.fillRect(-80, G, 700, 140);
    ctx.fillStyle = line; ctx.fillRect(-80, G - 1, 700, 1.5);
  };
  const txt = (w, x, y, t, size = 22, color = "#fff", vy = -90) => w.spawn({ type: "text", text: t, x, y, vy, life: 0.9, size, color });
  const chips = (w, x, y, n, cols, vx = [-380, -80], sz = [3, 6]) => {
    for (let i = 0; i < n; i++) w.spawn({ type: "chunk", x, y, vx: rand(vx[0], vx[1]), vy: rand(-520, -180), g: 1500, ground: true, bounce: 0.35, vr: rand(-20, 20), life: rand(1.2, 2), size: rand(sz[0], sz[1]), color: pick(cols), hold: true });
  };
  const lerpc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",");
  const sprIn = (ctx, key, x, y, w, h, a = 1) => { if (a <= 0) return; const c = SPR[key].c; ctx.globalAlpha = a; ctx.drawImage(c, x - w / 2, y - h, w, h); ctx.globalAlpha = 1; };
  // 배우 위에 색 덮기 (하늘색·흰색 등)
  const tintActor = (ctx, a, which, alpha) => {
    // 픽셀 동작 그림 인물은 그림 위에 색을 칠해 줌(다음 프레임부터), 옛 그림을 겹쳐 그리지 않음
    if (poseSet(a)) { a.chill = which === "cyan" ? Math.max(0, alpha) : 0; return; }
    if (alpha <= 0 || a.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, alpha) * a.alpha;
    ctx.translate(a.x + a.ox, a.gy + a.oy); ctx.scale(a.sx, a.sy);
    ctx.drawImage(a.s[which], -a.w / 2, a.top ? -a.h / 2 : -a.h, a.w, a.h); ctx.restore();
  };
  // 도구: 손잡이 + 머리. rot 0 = 위로, +는 앞(오른쪽)으로
  const drawTool = (ctx, px, py, rot, kind, crack = 0) => {
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
    ctx.fillStyle = "#a16207"; ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-4, -86, 8, 96, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    if (kind === "axe") { ctx.moveTo(-2, -88); ctx.lineTo(26, -98); ctx.quadraticCurveTo(34, -78, 26, -58); ctx.lineTo(-2, -68); }
    else { ctx.moveTo(-40, -70); ctx.quadraticCurveTo(0, -98, 40, -70); ctx.lineTo(36, -66); ctx.quadraticCurveTo(0, -86, -36, -66); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; if (kind === "axe") ctx.fillRect(18, -92, 5, 30);
    ctx.restore();
  };
  // 불꽃: 세 겹 물방울, s = 크기, f = 흔들림(0이면 정지)
  // 픽셀 불꽃: 4px 칸으로 찍는 불혀 4겹(검붉음 → 빨강 → 주황 → 노랑 심), 줄마다 좌우로 일렁이고 위쪽은 톱니처럼 갈라짐
  const flame = (ctx, x, y, s, f, t) => {
    const C = 4, lay = [[1, "#7a1a10"], [0.86, "#e2402a"], [0.66, "#ff8a2a"], [0.42, "#ffd45a"], [0.2, "#fff4c8"]];
    x = Math.round(x / C) * C; y = Math.round(y / C) * C;
    for (const [k, col] of lay) {
      const H = Math.round(76 * s * k / C), W = 30 * s * k;
      ctx.fillStyle = col;
      for (let r = 0; r < H; r++) {
        const u = r / H, sway = f * Math.sin(t * 11 - r * 0.45) * 5 * u, tongue = f * (Math.sin(t * 19 + r * 1.3) * 0.5 + 0.5) * u;
        const half = Math.max(0, Math.round((W * Math.pow(1 - u, 0.8) * (1 - 0.35 * tongue)) / C));
        if (!half && u > 0.85) continue;
        ctx.fillRect(x + Math.round(sway / C) * C - half * C, y - (r + 1) * C, Math.max(1, half * 2) * C, C);
      }
    }
  };
  // 픽셀 장작 두 개를 엇갈려 쌓고, 단면은 밝은 나이테 + 빨갛게 탄 끝
  const logs = (ctx, x, y) => {
    x = Math.round(x); y = Math.round(y);
    for (const d of [-1, 1]) {
      for (let i = 0; i < 18; i++) { const px = x - 36 * d + i * 4 * d, py = y - 2 - Math.round(i * 0.55); ctx.fillStyle = "#1a0f0a"; ctx.fillRect(px - 2, py - 7, 6, 14); ctx.fillStyle = i % 5 ? "#5a3418" : "#7a4a24"; ctx.fillRect(px - 1, py - 6, 4, 12); ctx.fillStyle = "#3a2010"; ctx.fillRect(px - 1, py + 3, 4, 3); }
      const ex = x - 38 * d, ey = y - 2; ctx.fillStyle = "#1a0f0a"; ctx.fillRect(ex - 6, ey - 8, 12, 16); ctx.fillStyle = "#c8925a"; ctx.fillRect(ex - 4, ey - 6, 8, 12); ctx.fillStyle = "#8a5a30"; ctx.fillRect(ex - 2, ey - 2, 4, 4);
      ctx.fillStyle = "#ff6a2a"; ctx.fillRect(x - 8 * d - 2, y - 14, 4, 4);
    }
  };
  const meter = (ctx, x, y, wd, h, f, col, bg = "rgba(0,0,0,0.55)") => {
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, wd + 6, h + 6, (h + 6) / 2); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, wd * Math.min(1, f)), h, h / 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x + 4, y + 2, Math.max(0, wd * Math.min(1, f) - 8), 2);
  };
  // 그림 (한 번만 굽기)
  const mkSprites = () => {
    polySprite("survival-rock", () => [blk(0, 0, 0, 150, 60, 110, 0.7, 6, 0), blk(-10, 56, 6, 96, 34, 70, 0.55, 8, 0), blk(40, 0, 30, 60, 40, 50, 0.6)], 200, 130, 0.5, 0.35, [176, 176, 186], [40, 42, 52]);
    polySprite("survival-crate", () => [blk(0, 0, 0, 100, 70, 80), blk(0, 68, 0, 106, 10, 86)], 170, 140, 0.55, 0.35, [196, 150, 90], [60, 38, 20]);
    polySprite("survival-lid", () => [blk(0, 0, 0, 106, 10, 86)], 170, 60, 0.55, 0.35, [210, 165, 100], [70, 44, 24]);
    polySprite("survival-wolf", () => [blk(0, 0, -14, 12, 34, 12), blk(0, 0, 14, 12, 34, 12), blk(70, 0, -14, 12, 34, 12), blk(70, 0, 14, 12, 34, 12), blk(35, 30, 0, 96, 34, 40, 0.9), blk(88, 50, 0, 34, 30, 30, 0.8, 8, 0), pyr([[104, 60, -10], [104, 60, 10], [104, 74, 10], [104, 74, -10]], [134, 58, 0]), pyr([[80, 78, -12], [92, 78, -12], [92, 78, -4], [80, 78, -4]], [86, 98, -8]), pyr([[80, 78, 4], [92, 78, 4], [92, 78, 12], [80, 78, 12]], [86, 98, 8]), blk(-18, 44, 0, 34, 10, 10, 0.6, -10, 0)], 200, 120, 0, 0.25, [96, 104, 120], [18, 20, 28]);
    sprite("survival-fish", 120, 60, x => {
      x.fillStyle = "#38bdf8"; x.beginPath(); x.ellipse(52, 30, 44, 20, 0, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(90, 30); x.lineTo(118, 10); x.lineTo(118, 50); x.closePath(); x.fill();
      x.fillStyle = "rgba(255,255,255,0.45)"; x.beginPath(); x.ellipse(40, 22, 22, 6, -0.2, 0, TAU); x.fill();
    });
  };
  const ensure = () => { if (!SPR["survival-rock"]) mkSprites(); if (!ACTOR["survival-rock"]) ACTOR["survival-rock"] = { spr: "survival-rock", h: 110, home: 320, hp: 100 }; };
  // 작은 아이콘 (제작·인벤토리용)
  const icon = (ctx, k, x, y, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = "round";
    if (k === "log") { rr(ctx, -20, -10, 40, 20, 8, "#92400e", "rgba(0,0,0,0.3)", 2); ctx.fillStyle = "#fcd34d"; ctx.beginPath(); ctx.ellipse(18, 0, 6, 10, 0, 0, TAU); ctx.fill(); }
    else if (k === "stone") { ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-12, -12); ctx.lineTo(8, -16); ctx.lineTo(20, 2); ctx.lineTo(8, 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-8, -10, 10, 4); }
    else if (k === "rope") { ctx.strokeStyle = "#e7d3a7"; ctx.lineWidth = 5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 16 - i * 5, 12 - i * 4, 0, 0, TAU); ctx.stroke(); } }
    else if (k === "axe") { drawTool(ctx, -4, 34, 0.5, "axe"); }
    else if (k === "bandage") { rr(ctx, -20, -9, 40, 18, 6, "#f1f5f9", null); ctx.fillStyle = "#ef4444"; ctx.fillRect(-4, -9, 8, 18); }
    else if (k === "can") { rr(ctx, -12, -16, 24, 32, 4, "#cbd5e1", null); ctx.fillStyle = "#16a34a"; ctx.fillRect(-12, -8, 24, 14); }
    else if (k === "ammo") { for (let i = -1; i <= 1; i++) { rr(ctx, i * 10 - 4, -14, 8, 28, 3, "#facc15", null); ctx.fillStyle = "#b45309"; ctx.fillRect(i * 10 - 4, 8, 8, 6); } }
    else if (k === "meat") { ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.ellipse(-4, 0, 16, 12, -0.4, 0, TAU); ctx.fill(); rr(ctx, 8, -3, 16, 6, 3, "#f1f5f9", null); }
    else if (k === "drop") { ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(14, 2, 0, 14); ctx.quadraticCurveTo(-14, 2, 0, -16); ctx.fill(); }
    else if (k === "gem") { const g = SPR.gem.c; ctx.drawImage(g, -16, -17, 32, 34); }
    ctx.restore();
  };

  RECIPES.push(
    /* ───────── 1. 나무 베기 ───────── */
    {
      id: "survival-chop", cat: "survival", view: "side", polished: true, melee: true, weapon: "axe", hookDur: 3.4, hookFires: [0.1, 0.8, 1.5, 2.2],
      title: { en: "Make tree chopping *satisfying*", ko: "나무 베기를 *시원하게*" },
      intro: { en: "Hit, hit, hit… it just *vanishes*.", ko: "툭, 툭, 툭… 나무가 *그냥 사라져요*." },
      interval: 0.75, stepDur: 4.2,
      // 주인공이 칼 대신 도끼를 쥐고 찍음. 나무는 밤 숲 소나무 픽셀 그림
      setup(w) {
        w.hero = w.actor("hero", { home: 182 });
        w.T = { x: 280, hp: 4, rot: 0, wob: 0, notch: 0, down: false, a: 1, sc: 1, jx: 0, fl: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const T = w.T, h = w.hero;
        w.after(0.14, () => {
          w.emit("swing");
          w.after(0.07, () => {
            if (!T.down && T.a > 0.9) {
              T.hp--; T.jx = 6; w.emit("chop", { x: T.x - 6, y: G - 42 }, T);
              if (T.hp <= 0) {
                T.down = true;
                if (w.on("fall")) w.emit("fell", T); else T.a = 0;
                w.after(1.8, () => { Object.assign(T, { hp: 4, rot: 0, a: 1, notch: 0, down: false, sc: 0.3 }); w.tween(T, { sc: 1 }, 0.3, "back"); });
              }
            }
            w.after(0.2, () => { w.busy = false; });
          });
        });
      },
      update(w, dt) { const T = w.T; T.wob *= Math.pow(0.03, dt); T.jx *= Math.pow(0.002, dt); T.fl = Math.max(0, T.fl - dt * 8); },
      drawBack(w, ctx) {
        const T = w.T, S = 1.41;
        if (T.down) pxSprite(ctx, "env-stump-px", T.x, G + 2, S * 1.4, 0, 10, 11);
        if (T.a <= 0) return;
        const sway = Math.sin(w.time * 30) * T.wob * 0.03;
        ctx.save(); ctx.globalAlpha = T.a; ctx.translate(Math.round(T.x + T.jx * Math.sin(w.time * 70)), G); ctx.rotate(T.rot + sway); ctx.scale(T.sc, T.sc);
        pxSprite(ctx, "env-pine-px", 0, 0, S, 0, 24, 127);
        // 찍힌 홈: 줄기 왼쪽에 쐐기 모양으로 파이고, 속살은 밝은 나무색
        if (T.notch > 0) {
          const n = Math.min(4, T.notch);
          ctx.fillStyle = "#1a1210"; ctx.beginPath(); ctx.moveTo(-5, -54); ctx.lineTo(-5 + n * 2.2, -42); ctx.lineTo(-5, -32); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#d8a874"; ctx.beginPath(); ctx.moveTo(-5, -51); ctx.lineTo(-5 + n * 1.8, -42); ctx.lineTo(-5, -35); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#f2d2a0"; ctx.fillRect(-5, -44, Math.max(1, n * 1.4), 2);
        }
        if (T.fl > 0) { ctx.globalAlpha = T.fl * 0.5; ctx.fillStyle = "#fff3dc"; ctx.fillRect(-5, -60, 10, 34); }
        ctx.restore();
      },
      steps: [
        {
          id: "chips", name: { en: "Wood Chips", ko: "나무 조각" }, param: "12 chips · bounce",
          cap: { en: "Every swing throws *wood chips*. They stay a while.", ko: "찍을 때마다 *나무 조각*이 튀어요." },
          chop(w, at) {
            for (let i = 0; i < 12; i++) { const sz = rand(2, 4.5), rot = rand(0, 6), c = pick([["#e8c088", "#7a4a24"], ["#c8925a", "#5a3418"], ["#f2d2a0", "#8a5a30"]]); w.spawn({ x: at.x, y: at.y, vx: rand(-380, -60), vy: rand(-420, -120), g: 1300, ground: true, bounce: 0.3, vr: rand(-16, 16), life: rand(1.2, 1.8), hold: true, draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, c[0], c[1]) }); }
            w.spawn({ x: at.x, y: at.y, life: 0.1, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 26, k, "255,236,190") });
          },
        },
        {
          id: "notch", name: { en: "Growing Notch", ko: "파이는 자국" }, param: "+1 / hit",
          cap: { en: "Cut a *notch* that grows. Show the progress.", ko: "칠 때마다 *홈이 깊어져요*. 진행이 보여요." },
          chop(w, at, T) { T.notch += 1; },
        },
        {
          id: "sway", name: { en: "Needle Shake", ko: "잎 흔들림" }, param: "sway + 8 needles",
          cap: { en: "The *whole tree* shakes. Needles *drift down*.", ko: "나무 *전체가 흔들리고*, 잎이 *팔랑*." },
          chop(w, at, T) {
            T.wob = 1;
            for (let i = 0; i < 8; i++) { const sz = rand(1.5, 3), rot = rand(0, 6); w.spawn({ x: T.x + rand(-40, 40), y: G - rand(90, 170), vx: rand(-40, 40), vy: rand(-10, 20), g: 140, drag: 1.5, vr: rand(-6, 6), life: 1.6, hold: true, draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#4a7a58", "#16302a") }); }
          },
        },
        {
          id: "stop", name: { en: "Bite", ko: "박히는 멈칫" }, param: "stop 60ms · shake",
          cap: { en: "The axe *bites* in. Freeze for a beat.", ko: "도끼가 *콱* 박혀요. 아주 잠깐 멈칫." },
          chop(w, at, T) { w.hitstop(0.06); w.shake(0.16, 1); T.fl = 1; },
        },
        {
          id: "fall", name: { en: "Timber!", ko: "쓰러짐" }, param: "ease-in 700ms",
          cap: { en: "Don't delete it. Let it *fall*, slow then fast.", ko: "지우지 말고 *쓰러뜨려요*. 천천히, 그리고 쿵." },
          fell(w, T) { w.tween(T, { rot: 1.52 }, 0.75, "in", () => w.emit("land", T)); w.after(1.3, () => w.tween(T, { a: 0 }, 0.4)); },
          land(w, T) {
            w.shake(0.55); w.hitstop(0.05);
            for (let i = 0; i < 16; i++) w.spawn({ type: "smoke", x: T.x + rand(60, 200), y: G - 4, vx: rand(-90, 90), vy: rand(-90, -20), drag: 2, size: rand(10, 16), size1: rand(22, 34), life: rand(0.8, 1.2), color: "80,88,96" });
            for (let i = 0; i < 14; i++) { const sz = rand(2, 4), rot = rand(0, 6); w.spawn({ x: T.x + rand(80, 200), y: G - 10, vx: rand(-200, 260), vy: rand(-420, -120), g: 1200, ground: true, bounce: 0.3, vr: rand(-12, 12), life: 1.2, hold: true, draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#4a7a58", "#16302a") }); }
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thock / crack / crash",
          cap: { en: "*Thock* each hit. Fibers *crack*, then a big *crash*.", ko: "찍을 땐 *턱*, 넘어갈 땐 *우지끈… 쿵*." },
          // 도끼가 나무에 박힘: 딱 + 둔탁한 나무 울림
          chop(w) { w.play(() => { sSnap(0.5, 0, 2400); sBody(190, 0.1, 0.75); nz({ dur: 0.07, type: "bandpass", f: 750, q: 1.6, vol: 0.45 }); tn({ type: "triangle", f: 420, f2: 360, dur: 0.12, vol: 0.06 }); }); },
          // 쓰러질 때만: 섬유가 우지끈 찢기는 소리 + 낮은 신음
          fell(w) { w.play(() => { let t = 0; for (let i = 0; i < 12; i++) { sSnap(0.12 + i * 0.015, t, 1400 + Math.random() * 1600); t += 0.07 * Math.pow(0.86, i); } tn({ type: "sawtooth", f: 70, f2: 48, dur: 0.7, vol: 0.06, lp: 400, att: 0.2 }); }); },
          // 땅에 닿을 때: 쿵 + 잎이 쏴아
          land(w) { w.sfx.slam(); w.play(() => nz({ dur: 0.8, type: "highpass", f: 2500, f2: 5000, vol: 0.15, att: 0.02, rv: 0.3 })); },
        },
      ],
    },

    /* ───────── 2. 바위 캐기 ───────── */
    {
      id: "survival-mine", cat: "survival", view: "side", polished: true, melee: true, weapon: "pickaxe", hookDur: 3.6, hookFires: [0.1, 0.7, 1.3, 1.9, 2.5],
      title: { en: "Make mining *crunchy*", ko: "바위 캐기를 *단단하게*" },
      intro: { en: "Tink. Tink. Rock *gone*.", ko: "톡. 톡. 바위가 *없어졌어요*." },
      interval: 0.65, stepDur: 3.8,
      setup(w) {
        ensure();
        w.hero = w.actor("hero", { home: 190 });
        w.rock = w.actor("survival-rock", { home: 300 }); w.rock.alpha = 0; // 그림은 픽셀 바위로 직접
        w.rock.cracks = [];
        w.pick = { rot: -0.3 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const R = w.rock;
        w.after(0.14, () => { w.emit("swing"); w.after(0.07, () => {
          if (R.alive) {
            R.hp -= 20; R.ox = 7;
            w.emit("hit", { x: R.x - 54, y: G - 36 }, R);
            if (R.hp <= 0) { R.cracks = []; w.kill(R); R.alpha = 0; w.after(0.6, () => { R.alpha = 0; }); }
          }
          w.after(0.2, () => { w.busy = false; });
        }); });
      },
      update(w) { const R = w.rock; if (R.alive) R.alpha = 0; },
      drawBack(w, ctx) {
        const R = w.rock; if (!R.alive) return;
        const vb = R.vib > 0 ? ((frameNo & 1) ? 1 : -1) * R.vib : 0;
        ctx.save(); ctx.translate(Math.round(R.x + R.ox + vb), G + 2); ctx.scale(R.sx, R.sy);
        pxSprite(ctx, "env-rock-px", 0, 0, 1.6, 0, 40, 63);
        if (R.flash > 0.05) { ctx.globalAlpha = R.flash * 0.5; ctx.globalCompositeOperation = "lighter"; pxSprite(ctx, "env-rock-px", 0, 0, 1.6, 0, 40, 63); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; }
        ctx.restore();
        ctx.strokeStyle = "#141419"; ctx.lineWidth = 3; ctx.lineJoin = "miter";
        for (const c of R.cracks) { ctx.beginPath(); c.forEach((q, i) => ctx[i ? "lineTo" : "moveTo"](Math.round(R.x + R.ox + q[0] * 0.8), Math.round(G + q[1] * 0.8))); ctx.stroke(); }
      },

      steps: [
        {
          id: "sparks", name: { en: "Sparks", ko: "불똥" }, param: "10 sparks",
          cap: { en: "Steel on stone *throws sparks*.", ko: "쇠가 돌에 닿으면 *불똥*이 튀어요." },
          hit(w, at) {
            sparks(w, at.x, at.y, 12, "255,220,150", [250, 650], Math.PI * 0.75, Math.PI * 1.45);
            w.spawn({ x: at.x, y: at.y, life: 0.09, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 24, k, "255,240,200") });
          },
        },
        {
          id: "cracks", name: { en: "Cracks Build Up", ko: "쌓이는 금" }, param: "+1 crack / hit",
          cap: { en: "Each hit leaves a *crack*. You see it about to *break*.", ko: "칠 때마다 *금이 하나씩*. 곧 깨질 게 보여요." },
          hit(w, at, R) {
            const p = [[-76, -46]]; for (let i = 0; i < 4; i++) { const q = p[p.length - 1]; p.push([q[0] + rand(14, 30), q[1] + rand(-22, 22)]); }
            R.cracks.push(p);
          },
        },
        {
          id: "chunks", name: { en: "Stone Chips", ko: "돌 부스러기" }, param: "6 chips",
          cap: { en: "*Gray chips* fly back toward you.", ko: "*돌 부스러기*가 이쪽으로 튀어요." },
          hit(w, at) { for (let i = 0; i < 7; i++) { const sz = rand(2, 4.5), rot = rand(0, 6), c = pick([["#9aa0b4", "#34364a"], ["#6c7088", "#262838"]]); w.spawn({ x: at.x, y: at.y, vx: rand(-380, -60), vy: rand(-420, -120), g: 1300, ground: true, bounce: 0.3, vr: rand(-16, 16), life: rand(1, 1.4), hold: true, draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, c[0], c[1]) }); } },
        },
        {
          id: "squash", name: { en: "Rock Reacts", ko: "바위 반응" }, param: "flash · squash .9",
          cap: { en: "Even rocks *flinch*. Flash it and squash a little.", ko: "바위도 *움찔*해요. 번쩍, 살짝 찌그러짐." },
          hit(w, at, R) { R.flash = 0.8; R.sx = 1.06; R.sy = 0.92; R.vib = 4; },
        },
        {
          id: "shatter", name: { en: "Shatter + Ore", ko: "와르르 + 광석" }, param: "18 chunks · 3 ore",
          cap: { en: "Last hit: *burst apart* and pop out the *ore*.", ko: "마지막엔 *와르르*, *광석*이 톡 튀어나와요." },
          kill(w, R) {
            for (let i = 0; i < 20; i++) { const sz = rand(3, 7), rot = rand(0, 6), c = pick([["#9aa0b4", "#34364a"], ["#6c7088", "#262838"], ["#b8bdcc", "#4a4c60"]]); w.spawn({ x: R.x + rand(-30, 30), y: G - rand(20, 70), vx: rand(-420, 420), vy: rand(-700, -200), g: 1500, ground: true, bounce: 0.3, vr: rand(-16, 16), life: rand(1.2, 1.8), hold: true, draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, c[0], c[1]) }); }
            for (let i = 0; i < 3; i++) { const rot = rand(0, 6); w.spawn({ x: R.x, y: G - 50, vx: rand(-200, 200), vy: rand(-620, -420), g: 1500, ground: true, bounce: 0.45, vr: rand(-10, 10), life: 1.8, hold: true, draw: (ctx, p) => { pxChip(ctx, p.x, p.y, 6, rot + p.rot, "#ffd27a", "#8a5a10"); pxPlus(ctx, p.x, p.y - 6, 3 + 2 * Math.sin(p.age * 20), "#fff4cc"); } }); }
            for (let i = 0; i < 12; i++) w.spawn({ type: "smoke", under: true, x: R.x + rand(-60, 60), y: G - rand(10, 60), vx: rand(-120, 120), vy: rand(-80, -10), drag: 2, size: 14, size1: 38, life: rand(0.8, 1.2), color: "120,125,140" });
            w.spawn({ type: "ring", flat: true, x: R.x, y: G, size: 20, size1: 170, life: 0.5, w: 10, color: "226,232,240" });
            w.spawn({ x: R.x, y: G - 50, life: 0.2, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 70, k, "255,226,160") });
            txt(w, R.x, G - 140, "+3", 34, "#fbbf24");
            w.shake(0.5); w.hitstop(0.12);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clink + thud",
          cap: { en: "A bright *clink* on top of a dull *thud*.", ko: "둔한 *퍽* 위에 맑은 *깡*." },
          // 곡괭이가 돌에 박힘: 둔한 퍽 + 쇠가 튀는 깡 (불똥이 있을 때만 맑게)
          hit(w) { w.play(() => { sSnap(0.5, 0, 2600); sBody(170, 0.08, 0.6); if (w.on("sparks")) sMetal(1800 + Math.random() * 300, 0.14, 0.07); }); },
          // 바위가 부서질 때: 와르르 (부서지는 효과가 있을 때만 크게)
          kill(w) { if (w.on("shatter")) w.play(() => { sSnap(0.8, 0, 2000); sBody(110, 0.35, 0.9); nz({ dur: 0.7, f: 1600, f2: 200, vol: 0.5, rv: 0.3 }); for (let i = 0; i < 9; i++) sSnap(0.12, 0.05 + Math.random() * 0.5, 1500 + Math.random() * 2000); }); else w.sfx.hit(0.8); },
        },
      ],
    },

    /* ───────── 3. 제작 ───────── */
    {
      id: "survival-craft", cat: "survival", view: "ui", polished: true,
      title: { en: "Make crafting feel like *making*", ko: "제작이 *만드는 맛* 나게" },
      intro: { en: "Click. Items gone. Axe *appears*.", ko: "누르면 재료 사라지고 도끼 *뿅*." },
      interval: 2.6, stepDur: 4.0,
      setup(w) {
        w.C = { prog: 0, glint: -1 };
        w.reset = () => {
          w.C.ing = ["log", "stone", "rope"].map((k, i) => ({ k, x: 100 + i * 90, y: 170, sc: 1, a: 1 }));
          Object.assign(w.C, { res: { a: 0, sc: 1 }, prog: 0, glint: -1 });
        };
        w.reset();
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true; w.reset();
        const C = w.C, d = 0.35 + (w.on("ring") ? 0.75 : 0.05);
        w.after(0.35, () => {
          w.emit("craft", C);
          if (!w.on("fly")) C.ing.forEach(it => { it.a = 0; });
        });
        w.after(d, () => { C.res.a = 1; w.emit("done", C.res); });
        w.after(d + 1.1, () => { w.reset(); w.busy = false; });
      },
      drawFloor(w, ctx) {
        const C = w.C;
        rr(ctx, 40, 60, 460, 220, 18, "rgba(255,255,255,0.04)", "rgba(255,255,255,0.14)", 2);
        for (let i = 0; i < 3; i++) rr(ctx, 70 + i * 90, 140, 60, 60, 10, "rgba(0,0,0,0.35)", "rgba(255,255,255,0.12)", 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.moveTo(350, 158); ctx.lineTo(370, 170); ctx.lineTo(350, 182); ctx.closePath(); ctx.fill();
        rr(ctx, 392, 126, 88, 88, 14, "rgba(0,0,0,0.4)", "rgba(198,244,50,0.35)", 3);
        if (C.prog > 0 && C.prog < 1) {
          ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 7; ctx.lineCap = "round";
          ctx.beginPath(); ctx.arc(436, 170, 54, -Math.PI / 2, -Math.PI / 2 + TAU * C.prog); ctx.stroke();
        }
        label(ctx, "CRAFT", 270, 92, 16, "rgba(255,255,255,0.45)");
      },
      drawFront(w, ctx) {
        const C = w.C;
        for (const it of C.ing) if (it.a > 0) { ctx.globalAlpha = it.a; icon(ctx, it.k, it.x, it.y, 1.2 * it.sc); ctx.globalAlpha = 1; }
        if (C.res.a > 0) {
          icon(ctx, "axe", 436, 166, 1.1 * C.res.sc);
          if (C.glint > -1 && C.glint < 1) {
            ctx.save(); ctx.beginPath(); ctx.roundRect(392, 126, 88, 88, 14); ctx.clip();
            const gx = 392 + C.glint * 160 - 20; ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.beginPath(); ctx.moveTo(gx, 126); ctx.lineTo(gx + 22, 126); ctx.lineTo(gx - 18, 214); ctx.lineTo(gx - 40, 214); ctx.closePath(); ctx.fill(); ctx.restore();
          }
        }
      },
      steps: [
        {
          id: "fly", name: { en: "Ingredients Fly In", ko: "재료가 날아감" }, param: "ease-in · stagger 80ms",
          cap: { en: "Don't delete materials. *Pull them in*, one by one.", ko: "재료는 지우지 말고 *하나씩 빨아들여요*." },
          craft(w, C) {
            C.ing.forEach((it, i) => w.tween(it, { x: 436, y: 170, sc: 0.3 }, 0.32 + i * 0.08, "in", () => { it.a = 0; }));
          },
        },
        {
          id: "ring", name: { en: "Progress Ring", ko: "진행 고리" }, param: "750ms",
          cap: { en: "A short *progress ring*. Making takes a moment.", ko: "짧은 *진행 고리*. 만드는 데 시간이 걸려요." },
          craft(w, C) { C.prog = 0.001; w.tween(C, { prog: 1 }, 0.7, "lin"); },
        },
        {
          id: "pop", name: { en: "Result Pop", ko: "결과물 톡" }, param: "scale .2 → 1 back",
          cap: { en: "The result *pops* in with overshoot.", ko: "결과물이 *톡* 튀어나와요." },
          done(w, r) { r.sc = 0.2; w.tween(r, { sc: 1 }, 0.4, "back"); },
        },
        {
          id: "burst", name: { en: "Burst", ko: "완성 빛" }, param: "rays + 12 sparks",
          cap: { en: "Celebrate it: *rays* and *sparks*.", ko: "완성을 축하해요. *빛줄기*와 *불꽃*." },
          done(w) {
            w.spawn({ type: "rays", under: true, x: 436, y: 170, size: 130, n: 10, vr: 1.2, life: 1.1, hold: true, color: "198,244,50" });
            w.spawn({ type: "glow", under: true, x: 436, y: 170, size: 50, size1: 90, life: 1.1, hold: true, color: "198,244,50" });
            w.spawn({ type: "ring", x: 436, y: 170, size: 30, size1: 110, life: 0.4, w: 6, color: "198,244,50" });
            sparks(w, 436, 170, 12, "236,252,203", [150, 420]);
          },
        },
        {
          id: "glint", name: { en: "Shine Sweep", ko: "반짝 훑기" }, param: "sweep 450ms",
          cap: { en: "A *shine sweeps* across. It looks brand new.", ko: "빛이 *쓱* 지나가요. 새것 같아요." },
          done(w) { w.C.glint = 0; w.after(0.25, () => w.tween(w.C, { glint: 1 }, 0.45, "inout")); },
        },
        {
          id: "label", name: { en: "NEW Tag", ko: "NEW 표시" }, param: "text pop",
          cap: { en: "Tag it *NEW*. First crafts deserve a fanfare.", ko: "*NEW* 표시. 처음 만든 건 티를 내요." },
          done(w) { w.spawn({ type: "text", text: "NEW!", x: 470, y: 112, vy: -20, life: 1.2, size: 24, color: "#c6f432" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh / clink / chime",
          cap: { en: "*Whoosh* in, *clink*, then a bright *ding*.", ko: "*쉭* 들어가고, *딸깍*, 그리고 *띠링*." },
          craft(w) { w.sfx.toss(); w.after(0.4, () => w.sfx.tick()); },
          done(w) { if (w.on("pop") || w.on("burst")) w.sfx.itemGet(); else w.sfx.chime(5); },
        },
      ],
    },

    /* ───────── 4. 건축 조각 놓기 ───────── */
    {
      id: "survival-build", cat: "survival", view: "side", polished: true,
      title: { en: "Make building *snap*", ko: "건축이 *착* 붙게" },
      intro: { en: "Walls just *appear*. No weight.", ko: "벽이 그냥 *생겨요*. 무게가 없어요." },
      interval: 0.8, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 110 });
        w.slots = [[250, 0], [312, 0], [374, 0], [436, 0], [281, 1], [343, 1], [405, 1], [374, 2]];
        w.pieces = []; w.ghost = null;
      },
      fire(w) {
        if (w.pieces.length >= w.slots.length) w.pieces = [];
        const [x, r] = w.slots[w.pieces.length];
        const p = { x, y: G - r * 62, oy: 0, sx: 1, sy: 1, flash: 0 };
        w.pieces.push(p);
        w.emit("place", p);
        if (!w.on("drop")) w.emit("snap", p);
      },
      update(w, dt) {
        for (const p of w.pieces) { const k = Math.min(1, dt * 12); p.sx += (1 - p.sx) * k; p.sy += (1 - p.sy) * k; p.flash = Math.max(0, p.flash - dt * 2); }
        w.ghost = null;
      },
      drawBack(w, ctx) {
        if (w.ghost) {
          const [x, r] = w.ghost, y = G - r * 62, a = 0.45 + 0.25 * Math.sin(w.time * 8);
          ctx.setLineDash([6, 5]); rr(ctx, x - 30, y - 60, 60, 60, 4, `rgba(56,189,248,${a * 0.35})`, `rgba(125,211,252,${a + 0.2})`, 2); ctx.setLineDash([]);
        }
        for (const p of w.pieces) {
          ctx.save(); ctx.translate(p.x, p.y + p.oy); ctx.scale(p.sx, p.sy);
          if (!pxSprite(ctx, "env-crate-px", -30, -60, 2, 0, 0, 0)) rr(ctx, -30, -60, 60, 60, 4, "#a16207", "rgba(0,0,0,0.35)", 2);
          if (p.flash > 0) { ctx.strokeStyle = `rgba(198,244,50,${p.flash})`; ctx.lineWidth = 5; ctx.strokeRect(-30, -60, 60, 60); ctx.fillStyle = `rgba(255,255,255,${p.flash * 0.5})`; ctx.fillRect(-30, -60, 60, 60); }
          ctx.restore();
        }
      },
      steps: [
        {
          id: "ghost", name: { en: "Blueprint Preview", ko: "설계도 미리보기" }, param: "dashed · pulse",
          cap: { en: "Show a *blue ghost* where it will go.", ko: "놓일 자리에 *파란 설계도*를 미리." },
          update(w) { w.ghost = w.slots[w.pieces.length] || null; },
        },
        {
          id: "drop", name: { en: "Drop In", ko: "위에서 툭" }, param: "-50px · ease-in 120ms",
          cap: { en: "Drop it from above. It *lands*, it doesn't appear.", ko: "위에서 *툭* 떨어뜨려요. 생기는 게 아니라 *놓이는* 거예요." },
          place(w, p) { p.oy = -110; w.tween(p, { oy: 0 }, 0.18, "in", () => { p.sx = 1.18; p.sy = 0.78; w.emit("snap", p); }); },
        },
        {
          id: "dust", name: { en: "Dust Puff", ko: "먼지" }, param: "8 puffs",
          cap: { en: "A *puff of dust* at the seam.", ko: "닿는 자리에 *먼지 폴폴*." },
          snap(w, p) { dirt(w, p.x - 30, p.y, 6, -1, "170,140,100"); dirt(w, p.x + 30, p.y, 6, 1, "170,140,100"); },
        },
        {
          id: "flash", name: { en: "Snap Outline", ko: "딱 맞음 테두리" }, param: "lime outline 330ms",
          cap: { en: "Flash a *lime outline*: it locked in.", ko: "*연두 테두리*가 번쩍. 딱 맞았다는 신호." },
          snap(w, p) { p.flash = 1; },
        },
        {
          id: "support", name: { en: "Neighbors Bump", ko: "옆 조각도 들썩" }, param: "neighbors sy .9",
          cap: { en: "Neighbors *bump* too. It's one structure now.", ko: "옆 조각도 *들썩*. 이제 한 몸이에요." },
          snap(w, p) { for (const q of w.pieces) if (q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 80) { q.sy = 0.9; q.sx = 1.06; q.flash = 0.4; } },
        },
        {
          id: "shake", name: { en: "Tiny Thump", ko: "작은 쿵" }, param: "kick 4px down",
          cap: { en: "Nudge the *camera down*. Heavy things land.", ko: "화면을 *아래로 톡*. 무거운 게 내려앉아요." },
          snap(w) { w.kick(0, 5); w.shake(0.1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk + tick",
          cap: { en: "A wooden *thunk* plus a tiny *click*.", ko: "나무 *쿵* 위에 작은 *딸깍*." },
          snap(w) { w.play(() => { sBody(180, 0.09, 0.6); nz({ dur: 0.06, type: "bandpass", f: 750, q: 1.6, vol: 0.35 }); }); if (w.on("flash")) w.sfx.clickUp(); },
        },
      ],
    },

    /* ───────── 5. 모닥불 온기 ───────── */
    {
      id: "survival-campfire", cat: "survival", view: "side", polished: true,
      title: { en: "Make a campfire feel *warm*", ko: "모닥불을 *따뜻하게*" },
      intro: { en: "Is that fire? Or a *cone*?", ko: "불인가요… *고깔*인가요?" },
      interval: 1.6, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 165 });
        w.F = { x: 300, flick: 0, flare: 0, light: 0, cold: 0.55 };
      },
      fire(w) {
        const F = w.F, h = w.hero;
        const lg = { x: h.x + 30, y: G - 70, vx: (F.x - h.x - 30) / 0.45, vy: -420, g: 1500, rot: 0, vr: 9,
          draw: (ctx, p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); rr(ctx, -20, -6, 40, 12, 5, "#92400e", null); ctx.restore(); } };
        lg.test = p => p.vy > 0 && p.y > G - 22;
        lg.onHit = () => w.emit("feed", F);
        w.shoot(lg);
      },
      update(w, dt) { w.F.flare = Math.max(0, w.F.flare - dt * 0.9); },
      drawBack(w, ctx) {
        const F = w.F;
        logs(ctx, F.x, G - 8);
        flame(ctx, F.x, G - 10, 1 + F.flare * 0.6, F.flick, w.time);
      },
      drawFront(w, ctx) {
        const F = w.F;
        tintActor(ctx, w.hero, "cyan", F.cold);
        if (F.light > 0) shade(ctx, 0.78, [{ x: F.x, y: G - 30, r: F.light * (1 + F.flare * 0.4) * (0.95 + 0.05 * Math.sin(w.time * 21)), hard: 0.5 }]);
        if (F.light > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, F.x, G - 30, F.light * 0.9, "255,140,40", 0.35); ctx.globalCompositeOperation = "source-over"; }
      },
      steps: [
        {
          id: "flicker", name: { en: "Flicker", ko: "일렁임" }, param: "2 sines · 19/11Hz",
          cap: { en: "Fire never holds still. *Wobble* every layer.", ko: "불은 가만히 있지 않아요. 겹마다 *일렁*." },
          update(w) { w.F.flick = 1; },
        },
        {
          id: "light", name: { en: "Light Pool", ko: "빛 웅덩이" }, param: "r 230 · night .78",
          cap: { en: "Make it *night*. Fire is the only light.", ko: "*밤*으로 만들어요. 빛은 불뿐이에요." },
          update(w) { w.F.light = 230; },
        },
        {
          id: "embers", name: { en: "Embers", ko: "불티" }, param: "~10 / sec",
          cap: { en: "*Embers* float up and fade.", ko: "*불티*가 하늘하늘 올라가요." },
          update(w, dt) {
            if (Math.random() < dt * 12) w.spawn({ type: "glow", x: w.F.x + rand(-16, 16), y: G - 40, vx: rand(-30, 30), vy: rand(-140, -60), size: rand(4, 7), size1: 1, life: rand(0.8, 1.4), color: "255,170,60" });
          },
        },
        {
          id: "flare", name: { en: "Log Flare-up", ko: "장작 넣으면 확" }, param: "+60% · 1.1s",
          cap: { en: "Feed it a log: the fire *flares up*.", ko: "장작을 넣으면 불이 *확* 커져요." },
          feed(w, F) {
            F.flare = 1;
            w.spawn({ type: "glow", under: true, x: F.x, y: G - 50, size: 60, size1: 150, life: 0.7, color: "255,140,40" });
            w.spawn({ type: "ring", flat: true, x: F.x, y: G, size: 20, size1: 120, life: 0.5, w: 8, color: "255,190,90" });
            for (let i = 0; i < 22; i++) w.spawn({ type: "spark", x: F.x + rand(-20, 20), y: G - 30, vx: rand(-160, 160), vy: rand(-480, -160), drag: 2, size: 3, life: rand(0.5, 0.9), color: pick(["255,200,90", "255,120,40"]) });
          },
        },
        {
          id: "warm", name: { en: "Warm Up", ko: "몸이 녹음" }, param: "blue → 0 · 800ms",
          cap: { en: "The hero's *frost-blue* melts away near the fire.", ko: "불 곁에서 *파란 냉기*가 스르르 풀려요." },
          feed(w, F) { w.tween(F, { cold: 0 }, 0.8, "out"); txt(w, w.hero.x, G - 160, "+WARM", 20, "#fb923c", -60); },
          update(w, dt) { w.F.cold = Math.min(0.55, w.F.cold + dt * 0.2); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "random crackles",
          cap: { en: "Random *crackles*. A soft *whoomp* on each log.", ko: "*타닥타닥*. 장작 넣으면 *훅*." },
          update(w, dt) { if (Math.random() < dt * 5) w.play(() => nz({ dur: 0.02, type: "highpass", f: rand(2500, 5000), vol: 0.2 })); },
          feed(w) { w.play(() => nz({ dur: 0.5, f: 300, f2: 1200, vol: 0.35 })); },
        },
      ],
    },

    /* ───────── 6. 배고픔 경고 ───────── */
    {
      id: "survival-hunger", cat: "survival", view: "side", polished: true,
      title: { en: "Make hunger *hard to ignore*", ko: "배고픔을 *못 본 척 못 하게*" },
      intro: { en: "Hunger: 10%. Did you *notice?*", ko: "배고픔 10%. *눈치채셨어요?*" },
      interval: 0.6, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 270 });
        w.H = { v: 100, col: "#cbd5e1", pulse: 0, shake: 0, sc: 1 };
      },
      fire(w) {
        const H = w.H;
        if (H.v <= 0) { H.v = 100; w.emit("eat", H); return; }
        H.v = Math.max(0, H.v - 20);
        w.emit("drain", H);
      },
      update(w, dt) { const H = w.H; H.shake = Math.max(0, H.shake - dt * 3); H.sc += (1 - H.sc) * Math.min(1, dt * 10); },
      drawHud(w, ctx) {
        const H = w.H, x = 170, y = 76, sx = H.shake * rand(-4, 4);
        ctx.save(); ctx.translate(x + 100 + sx, y); ctx.scale(H.sc, H.sc); ctx.translate(-x - 100, -y);
        meter(ctx, x, y - 11, 200, 22, H.v / 100, H.col);
        icon(ctx, "meat", x - 34 + H.shake * rand(-8, 8), y, 1.4);
        label(ctx, Math.round(H.v) + "%", x + 238, y, 20, "rgba(255,255,255,0.85)");
        ctx.restore();
      },
      steps: [
        {
          id: "color", name: { en: "Color by Level", ko: "단계별 색" }, param: "green › amber › red",
          cap: { en: "*Green → amber → red*. Color says it first.", ko: "*초록 → 주황 → 빨강*. 색이 먼저 말해요." },
          update(w) { const v = w.H.v; w.H.col = v > 60 ? "#4ade80" : v > 30 ? "#f59e0b" : "#ef4444"; },
        },
        {
          id: "pulse", name: { en: "Low Pulse", ko: "낮으면 두근" }, param: "< 35% · 3Hz",
          cap: { en: "Below 35%, the bar *pulses*.", ko: "35% 아래면 바가 *두근두근*." },
          update(w) { const H = w.H; if (H.v < 35) H.sc = Math.max(H.sc, 1 + 0.12 * Math.abs(Math.sin(w.time * 9))); },
        },
        {
          id: "icon", name: { en: "Icon Shake", ko: "아이콘 덜덜" }, param: "shake 330ms",
          cap: { en: "Each drop *shakes* the food icon.", ko: "줄어들 때마다 아이콘이 *덜덜*." },
          drain(w, H) { H.shake = 1; },
        },
        {
          id: "growl", name: { en: "Stomach Growl", ko: "꼬르륵" }, param: "rings + hunch",
          cap: { en: "Low? The hero *hunches* and the belly *growls*.", ko: "배고프면 몸이 *움츠러들고* 배에서 *꼬르륵*." },
          drain(w, H) {
            if (H.v > 40) return;
            const h = w.hero; h.sy = 0.84; h.sx = 1.1;
            for (let i = 0; i < 3; i++) w.after(i * 0.12, () => w.spawn({ type: "ring", x: h.x + 10, y: G - 70, size: 10, size1: 80, life: 0.5, w: 6, color: "245,158,11" }));
            txt(w, h.x + 60, G - 120, "grrr…", 22, "#f59e0b", -40);
          },
        },
        {
          id: "vignette", name: { en: "Edge Warning", ko: "가장자리 경고" }, param: "vignette .45",
          cap: { en: "Tint the *edges* so you feel it mid-fight.", ko: "*화면 끝*을 물들여요. 싸우는 중에도 느껴요." },
          update(w) { if (w.H.v < 40) w.vignette(0.35 + 0.2 * Math.sin(w.time * 6)); },
        },
        {
          id: "eat", name: { en: "Satisfying Refill", ko: "먹으면 꽉 참" }, param: "fill 600ms + sparkle",
          cap: { en: "Eating *fills* the bar, not snaps it.", ko: "먹으면 바가 *차오르게*. 뚝 바뀌지 않게." },
          eat(w, H) {
            H.v = 0; w.tween(H, { v: 100 }, 0.6, "out");
            for (let i = 0; i < 12; i++) w.spawn({ type: "star", x: 170 + i * 18, y: 76, vx: rand(-40, 40), vy: rand(-160, -60), size: 9, life: 0.7, color: "134,239,172" });
            w.spawn({ type: "glow", under: true, x: w.hero.x, y: G - 70, size: 50, size1: 120, life: 0.6, color: "74,222,128" });
            w.spawn({ type: "ring", flat: true, x: w.hero.x, y: G, size: 20, size1: 110, life: 0.5, w: 8, color: "134,239,172" });
            w.hero.sy = 1.15; w.hero.sx = 0.92;
            txt(w, w.hero.x, G - 160, "+100", 30, "#4ade80");
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "low growl / crunch",
          cap: { en: "A *low growl* when hungry, a *crunch* when eating.", ko: "배고프면 *꾸르륵*, 먹으면 *와삭*." },
          drain(w, H) { if (H.v < 40) w.play(() => tn({ type: "sawtooth", f: 70, f2: 48, dur: 0.5, vol: 0.12 })); },
          eat(w) { w.play(() => { nz({ dur: 0.08, type: "bandpass", f: 2200, q: 1, vol: 0.35 }); nz({ dur: 0.08, type: "bandpass", f: 1800, q: 1, vol: 0.3, delay: 0.12 }); }); if (w.on("eat")) w.after(0.25, () => w.sfx.chime(4)); },
        },
      ],
    },

    /* ───────── 7. 목마름 (탑다운) ───────── */
    {
      id: "survival-thirst", cat: "survival", view: "top", polished: true,
      title: { en: "Make thirst feel *dry*", ko: "목마름이 *바싹* 느껴지게" },
      intro: { en: "A drop disappears. *So what?*", ko: "물방울 하나 사라짐. *그래서?*" },
      interval: 0.6, stepDur: 4.0,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#3a2f1f"; ctx.fillRect(-80, -80, 700, 520);
        ctx.fillStyle = "rgba(255,220,150,0.06)";
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 62, 120 + (i % 3) * 80, 70, 14, 0.2, 0, TAU); ctx.fill(); }
      },
      setup(w) {
        w.hero = w.actor("heroTop", { home: 270, gy: 210, h: 92, w: 92 });
        w.D = { n: 5, pop: -1, heat: 0, ghost: 0, grade: 0 };
      },
      fire(w) {
        const D = w.D;
        if (D.n <= 0) { D.n = 5; w.emit("drink", D); return; }
        D.n--;
        w.emit("lose", D, 182 + D.n * 44);
      },
      update(w, dt) {
        const h = w.hero; h.x = 270 + Math.sin(w.time * 0.9) * 120; h.rot = Math.cos(w.time * 0.9) > 0 ? 0 : Math.PI;
      },
      drawFront(w, ctx) {
        const D = w.D, h = w.hero;
        if (D.ghost > 0) { ctx.save(); ctx.globalAlpha = 0.35 * D.ghost; ctx.translate(h.x + 14 * Math.sin(w.time * 3), h.gy + 6); ctx.rotate(h.rot); ctx.drawImage(h.s.c, -h.w / 2, -h.h / 2, h.w, h.h); ctx.restore(); }
        if (D.grade > 0) { ctx.fillStyle = `rgba(255,170,40,${D.grade})`; ctx.fillRect(-80, -80, 700, 520); }
      },
      drawHud(w, ctx) {
        const D = w.D;
        for (let i = 0; i < 5; i++) {
          const x = 182 + i * 44, y = 72, full = i < D.n;
          ctx.globalAlpha = full ? 1 : 0.25; icon(ctx, "drop", x, y, 1.4 * (full && i === D.n - 1 && D.n <= 1 && D.warn ? 1 + 0.2 * Math.abs(Math.sin(w.time * 10)) : 1)); ctx.globalAlpha = 1;
        }
      },
      steps: [
        {
          id: "burst", name: { en: "Drop Bursts", ko: "물방울 톡 터짐" }, param: "6 drops · splash",
          cap: { en: "The lost drop *bursts*. You see what you lost.", ko: "사라지는 물방울이 *톡 터져요*. 잃은 게 보여요." },
          lose(w, D, x) {
            for (let i = 0; i < 10; i++) w.spawn({ type: "circle", x, y: 72, vx: rand(-160, 160), vy: rand(-240, 40), g: 800, size: rand(3, 6), life: 0.6, color: "56,189,248", add: false });
            w.spawn({ type: "ring", x, y: 72, size: 8, size1: 46, life: 0.35, w: 5, color: "125,211,252" });
          },
        },
        {
          id: "sun", name: { en: "Harsh Sun", ko: "뜨거운 해" }, param: "rays · spin",
          cap: { en: "Put the *sun* in the frame. Heat needs a source.", ko: "화면에 *해*를 걸어요. 더위엔 원인이 있어야죠." },
          update(w) {
            if (!w.D.sunT || w.time > w.D.sunT) { w.D.sunT = w.time + 1; w.spawn({ type: "rays", x: 450, y: 130, size: 100, n: 9, vr: 0.3, life: 1.05, color: "255,220,120", hold: true }); w.spawn({ type: "glow", x: 450, y: 130, size: 40, life: 1.05, color: "255,240,180", hold: true }); }
          },
        },
        {
          id: "haze", name: { en: "Heat Haze", ko: "아지랑이" }, param: "wavy wisps",
          cap: { en: "Wavy *heat haze* rises off the sand.", ko: "모래 위로 *아지랑이*가 피어올라요." },
          update(w, dt) { if (Math.random() < dt * 6) w.spawn({ type: "ellipse", x: rand(30, 510), y: rand(130, 330), vx: rand(-10, 10), vy: -26, size: rand(30, 60), life: 1.4, color: "255,236,190", alpha: 0.22, add: true }); },
        },
        {
          id: "grade", name: { en: "Dry Color Grade", ko: "누렇게 바래기" }, param: "orange × thirst",
          cap: { en: "The thirstier, the more *orange* the world.", ko: "목마를수록 세상이 *누렇게*." },
          update(w) { w.D.grade = (1 - w.D.n / 5) * 0.35; },
        },
        {
          id: "double", name: { en: "Double Vision", ko: "겹쳐 보임" }, param: "ghost ≤ 2 drops",
          cap: { en: "Almost empty? Things start to *double*.", ko: "거의 비면 몸이 *겹쳐 보여요*." },
          update(w) { w.D.ghost = w.D.n <= 2 ? 1 : 0; w.D.warn = true; },
        },
        {
          id: "drink", name: { en: "Big Gulp", ko: "벌컥 마시기" }, param: "splash + refill",
          cap: { en: "Drinking is a *relief*. Splash and refill.", ko: "마실 땐 *시원하게*. 촤악, 다시 꽉." },
          drink(w) {
            w.flash("125,211,252", 0.35);
            for (let i = 0; i < 18; i++) w.spawn({ type: "circle", x: w.hero.x, y: w.hero.gy, vx: rand(-260, 260), vy: rand(-260, 260), drag: 3, size: rand(3, 6), life: 0.6, color: "125,211,252", add: false });
            w.spawn({ type: "ring", x: w.hero.x, y: w.hero.gy, size: 10, size1: 90, life: 0.5, w: 6, color: "186,230,253" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "drip / gulp",
          cap: { en: "A dry *drip* when lost, a deep *gulp* when you drink.", ko: "줄면 *똑*, 마시면 *꿀꺽*." },
          lose(w) { w.play(() => tn({ type: "sine", f: 1400, f2: 500, dur: 0.12, vol: 0.2 })); },
          drink(w) { w.play(() => { tn({ f: 220, f2: 120, dur: 0.15, vol: 0.4 }); tn({ f: 200, f2: 110, dur: 0.15, vol: 0.4, delay: 0.2 }); }); },
        },
      ],
    },

    /* ───────── 8. 얼어붙는 화면 가장자리 ───────── */
    {
      id: "survival-frost", cat: "survival", view: "side", polished: true,
      title: { en: "Make the cold *creep in*", ko: "추위가 *스며들게*" },
      intro: { en: "-20°C. Feels like *room temp*.", ko: "영하 20도인데 *실내* 같아요." },
      interval: 0.9, stepDur: 4.0,
      drawFloor(w, ctx) { sky(ctx, "#1b2333", "#2a3446"); soil(ctx, "rgba(226,232,240,0.12)", "rgba(226,232,240,0.5)"); },
      setup(w) {
        w.hero = w.actor("hero", { home: 250 });
        w.cold = 0.2; w.frost = 0; w.blue = 0;
        w.spikes = Array.from({ length: 46 }, (_, i) => ({ e: i % 4, t: rand(0, 1), len: rand(30, 90), a: rand(-0.6, 0.6) }));
      },
      fire(w) {
        if (w.cold >= 1) { w.cold = 0.2; return; }
        w.cold = Math.min(1, w.cold + 0.2);
        w.emit("gust", w.cold);
      },
      drawFront(w, ctx) { tintActor(ctx, w.hero, "cyan", w.blue * 0.75); },
      drawHud(w, ctx) {
        const c = w.cold;
        label(ctx, `${Math.round(-c * 30)}°C`, 270, 60, 26, "#e0f2fe");
        if (w.frost <= 0) return;
        const f = w.frost, X0 = 20, X1 = 520, Y0 = 0, Y1 = 360;
        const g = ctx.createRadialGradient(270, 180, 120, 270, 180, 360);
        g.addColorStop(0, "rgba(186,230,253,0)"); g.addColorStop(1, `rgba(224,242,254,${0.75 * f})`);
        ctx.fillStyle = g; ctx.fillRect(X0, Y0, X1 - X0, Y1);
        ctx.strokeStyle = `rgba(240,249,255,${0.85 * f})`; ctx.lineWidth = 2; ctx.lineCap = "round";
        for (const s of w.spikes) {
          const [x, y, a] = s.e === 0 ? [X0 + s.t * 500, Y0, Math.PI / 2] : s.e === 1 ? [X0 + s.t * 500, Y1, -Math.PI / 2] : s.e === 2 ? [X0, Y0 + s.t * 360, 0] : [X1, Y0 + s.t * 360, Math.PI];
          const L = s.len * f, d = a + s.a, ex = x + Math.cos(d) * L, ey = y + Math.sin(d) * L;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
          const mx = x + Math.cos(d) * L * 0.55, my = y + Math.sin(d) * L * 0.55;
          ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(d + 0.7) * L * 0.3, my + Math.sin(d + 0.7) * L * 0.3);
          ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(d - 0.7) * L * 0.3, my + Math.sin(d - 0.7) * L * 0.3);
          ctx.stroke();
        }
      },
      steps: [
        {
          id: "snow", name: { en: "Snowfall", ko: "눈발" }, param: "~25 flakes / sec",
          cap: { en: "Start with *snow*. Cold needs a picture.", ko: "먼저 *눈*을 내려요. 추위도 그림이 있어야죠." },
          update(w, dt) { if (Math.random() < dt * 25) w.spawn({ type: "circle", x: rand(20, 600), y: -10, vx: rand(-60, -20) * (1 + w.cold), vy: rand(50, 90), size: rand(1.5, 3.5), life: 4.5, color: "241,245,249", hold: true, add: false }); },
        },
        {
          id: "gust", name: { en: "Wind Gust", ko: "칼바람" }, param: "14 streaks",
          cap: { en: "Each drop in temp comes with a *gust*.", ko: "온도가 떨어질 때마다 *칼바람* 휙." },
          gust(w) { for (let i = 0; i < 14; i++) w.spawn({ type: "spark", x: rand(300, 640), y: rand(40, 270), vx: rand(-1100, -700), vy: rand(-40, 40), size: 2, life: rand(0.35, 0.6), color: "226,232,240" }); w.hero.ox -= 8; },
        },
        {
          id: "frost", name: { en: "Frost Edges", ko: "얼어붙는 가장자리" }, param: "46 spikes × cold",
          cap: { en: "*Ice grows* in from the screen edges.", ko: "화면 끝에서 *성에*가 자라요." },
          update(w, dt) { w.frost += (w.cold - w.frost) * Math.min(1, dt * 3); },
        },
        {
          id: "blue", name: { en: "Blue Body", ko: "파래지는 몸" }, param: "cyan × cold",
          cap: { en: "The hero turns *blue* as it gets colder.", ko: "추울수록 몸이 *파랗게* 질려요." },
          update(w) { w.blue = w.cold; },
        },
        {
          id: "breath", name: { en: "Breath Vapor", ko: "입김" }, param: "1 puff / 0.9s",
          cap: { en: "*Breath vapor* tells you it's freezing.", ko: "*입김*이 보이면 추운 거예요." },
          update(w) {
            if (w.time < (w.breathT || 0)) return;
            w.breathT = w.time + 0.9; const h = w.hero;
            for (let i = 0; i < 6; i++) w.spawn({ type: "smoke", under: true, x: h.x + 30 + i * 4, y: G - 120, vx: rand(40, 110), vy: rand(-30, 0), drag: 1.5, size: 3, size1: rand(12, 22), life: 1.1, alpha: 0.6, color: "241,245,249" });
          },
        },
        {
          id: "shiver", name: { en: "Shiver", ko: "덜덜" }, param: "vib 3px × cold",
          cap: { en: "Make the body *shiver*. Stronger when colder.", ko: "몸이 *덜덜*. 추울수록 더 세게." },
          update(w) { w.hero.vib = 3.5 * w.cold; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "wind noise",
          cap: { en: "A hollow *whoosh* of wind on each gust.", ko: "바람 불 때마다 *휘이잉*." },
          gust(w) { w.play(() => nz({ dur: 0.9, type: "bandpass", f: 500, f2: 1400, q: 3, vol: 0.35 })); },
        },
      ],
    },

    /* ───────── 9. 밤이 온다 ───────── */
    {
      id: "survival-nightfall", cat: "survival", view: "side",
      title: { en: "Make nightfall feel *dangerous*", ko: "밤이 *무섭게* 오게" },
      intro: { en: "Day… *click*… night.", ko: "낮… *딸깍*… 밤." },
      interval: 2.6, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 160 });
        w.N = { t: 0, smooth: false, dark: 0, stars: 0, sun: false };
        w.starPts = Array.from({ length: 40 }, () => [rand(20, 520), rand(40, 200), rand(0, 6)]);
        w.night = 2;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const N = w.N; N.t = 0; w.night++;
        w.emit("dusk", N);
        w.tween(N, { t: 1 }, 0.55, "inout", () => w.emit("dark", N));
        w.after(1.8, () => w.tween(N, { t: 0 }, 0.4, "inout", () => { w.busy = false; }));
      },
      drawFloor(w, ctx) {
        const N = w.N, t = N.smooth ? N.t : N.t > 0.5 ? 1 : 0;
        const mid = 1 - Math.abs(t - 0.5) * 2;
        const top = t < 0.5 ? lerpc([96, 165, 250], [124, 58, 237], t * 2) : lerpc([124, 58, 237], [8, 10, 24], t * 2 - 1);
        const bot = t < 0.5 ? lerpc([186, 230, 253], [251, 146, 60], t * 2) : lerpc([251, 146, 60], [20, 22, 40], t * 2 - 1);
        sky(ctx, `rgb(${top})`, `rgb(${N.smooth ? bot : top})`);
        if (N.stars > 0) for (const [x, y, p] of w.starPts) { ctx.fillStyle = `rgba(255,255,255,${N.stars * (0.5 + 0.5 * Math.sin(w.time * 4 + p))})`; ctx.fillRect(x, y, 2, 2); }
        if (N.sun) {
          const a = Math.PI * (1.15 + t * 0.7), sx = 270 + Math.cos(a) * 230, sy = 290 + Math.sin(a) * 210;
          ctx.globalCompositeOperation = "lighter"; glow(ctx, sx, sy, 70, mid > 0.3 ? "251,146,60" : "253,224,71", 0.8); ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.arc(sx, sy, 20, 0, TAU); ctx.fill();
          const ma = a - Math.PI * 0.8, mx = 270 + Math.cos(ma) * 230, my = 300 + Math.sin(ma) * 220;
          ctx.fillStyle = `rgba(226,232,240,${t})`; ctx.beginPath(); ctx.arc(mx, my, 16, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = `rgb(${lerpc([30, 64, 40], [8, 14, 12], t)})`;
        for (let i = 0; i < 8; i++) { const x = 30 + i * 70; ctx.beginPath(); ctx.moveTo(x - 30, G); ctx.lineTo(x, G - 70 - (i % 3) * 22); ctx.lineTo(x + 30, G); ctx.closePath(); ctx.fill(); }
        soil(ctx);
        rr(ctx, 360, G - 90, 120, 90, 6, `rgb(${lerpc([120, 80, 50], [40, 28, 20], t)})`, null);
        ctx.fillStyle = `rgb(${lerpc([90, 50, 30], [24, 16, 12], t)})`; ctx.beginPath(); ctx.moveTo(350, G - 88); ctx.lineTo(420, G - 140); ctx.lineTo(490, G - 88); ctx.closePath(); ctx.fill();
        rr(ctx, 400, G - 66, 30, 26, 3, N.dark > 0 ? `rgba(253,224,71,${0.3 + 0.7 * t})` : "#1e293b", null);
        if (N.long) { ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - t * 0.7)})`; ctx.beginPath(); ctx.ellipse(w.hero.x + 30 + mid * 90, G + 3, 40 + mid * 120, 7, 0, 0, TAU); ctx.fill(); }
      },
      drawFront(w, ctx) {
        const N = w.N;
        if (N.dark > 0) shade(ctx, N.dark * N.t, [{ x: 415, y: G - 53, r: 150 }, { x: w.hero.x, y: G - 70, r: 110, a: 0.6 }], "4,6,20");
      },
      steps: [
        {
          id: "smooth", name: { en: "Sunset Gradient", ko: "노을 그라데이션" }, param: "blue › orange › navy",
          cap: { en: "Pass through *orange*. Don't jump from blue to black.", ko: "파랑에서 검정으로 뚝 말고, *노을*을 거쳐요." },
          update(w) { w.N.smooth = true; },
        },
        {
          id: "sun", name: { en: "Sun Sets, Moon Rises", ko: "해 지고 달 뜸" }, param: "arc 0.7π",
          cap: { en: "Move the *sun down* and the *moon up*.", ko: "*해는 내려가고*, *달이 떠요*." },
          update(w) { w.N.sun = true; },
        },
        {
          id: "shadow", name: { en: "Long Shadows", ko: "길어지는 그림자" }, param: "stretch ×4",
          cap: { en: "Shadows *stretch* at dusk. Time feels like it moves.", ko: "해 질 녘엔 그림자가 *길게*. 시간이 흘러요." },
          update(w) { w.N.long = true; },
        },
        {
          id: "dark", name: { en: "Darkness + Window", ko: "어둠과 창문 불빛" }, param: "dark .8 · 2 lights",
          cap: { en: "Darken the world. *Lit windows* mean safety.", ko: "세상은 어둡게. *켜진 창문*은 안전해 보여요." },
          update(w) { w.N.dark = 0.8; },
        },
        {
          id: "stars", name: { en: "Stars", ko: "별" }, param: "40 twinkles",
          cap: { en: "*Stars* fade in. Night is pretty, *and* scary.", ko: "*별*이 하나둘. 예쁘지만 무섭죠." },
          update(w) { w.N.stars = Math.max(0, w.N.t - 0.5) * 2; },
        },
        {
          id: "card", name: { en: "Night Title", ko: "밤 알림" }, param: "big text · 1s",
          cap: { en: "Announce it: *NIGHT 3*. Now it's official.", ko: "*NIGHT 3*. 이제 진짜 밤이에요." },
          dark(w) { w.spawn({ type: "text", text: `NIGHT ${w.night}`, x: 270, y: 120, vy: -10, life: 1.3, size: 44, color: "#fca5a5" }); w.shake(0.15); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "low drone + bell",
          cap: { en: "A *low drone* and a single *bell*.", ko: "낮게 *웅*, 종이 한 번 *댕*." },
          dark(w) { w.play(() => { tn({ type: "sawtooth", f: 55, dur: 1.4, vol: 0.12 }); tn({ type: "triangle", f: 330, f2: 320, dur: 1.2, vol: 0.2 }); }); },
        },
      ],
    },

    /* ───────── 10. 깜짝 놀람 ───────── */
    {
      id: "survival-jumpscare", cat: "survival", view: "side",
      title: { en: "Make a jump scare *land*", ko: "깜짝 놀람이 *제대로* 먹히게" },
      intro: { en: "Monster appears. *Oh. Hi.*", ko: "괴물 등장. *아, 안녕?*" },
      interval: 2.0, stepDur: 4.0,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1e1b24"; ctx.fillRect(-80, -80, 700, G + 80);
        for (let i = 0; i < 5; i++) rr(ctx, 40 + i * 120, 80, 64, 200, 2, "#141119", null);
        soil(ctx, "rgba(80,60,60,0.25)");
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 110 });
        w.mon = w.actor("foe", { home: 430 }); w.mon.alpha = 0; w.mon.keep = true;
        w.S = { light: 1 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const m = w.mon;
        const scare = () => { w.S.light = 1; m.alpha = 1; m.x = 430; w.emit("scare", m); };
        if (w.on("hush")) { w.emit("hush", w.S); w.after(0.35, scare); } else scare();
        w.after(1.4, () => { m.alpha = 0; m.sx = m.sy = 1; m.x = 430; w.busy = false; });
      },
      drawFront(w, ctx) {
        const h = w.hero, L = w.S.light;
        shade(ctx, 0.6, [{ x: h.x + 40, y: G - 80, r: 420 * L, cone: [0.05, 0.32], hard: 0.6 }, { x: h.x, y: G - 70, r: 90 * L, a: 0.6 }]);
        ctx.fillStyle = "#334155"; ctx.fillRect(h.x + 28, G - 86, 18, 10);
      },
      steps: [
        {
          id: "hush", name: { en: "Quiet Beat", ko: "고요한 한 박자" }, param: "lights off 350ms",
          cap: { en: "Kill the light *first*. The silence is the setup.", ko: "*먼저* 불을 꺼요. 정적이 밑밥이에요." },
          hush(w, S) { S.light = 0.15; },
        },
        {
          id: "lunge", name: { en: "Lunge at Camera", ko: "화면으로 덮침" }, param: "x −200 · scale 1.5",
          cap: { en: "It doesn't stand there. It *rushes* the camera.", ko: "서 있지 말고, *화면으로 달려들어요*." },
          scare(w, m) { m.sx = m.sy = 1; w.tween(m, { x: 250, sx: 1.55, sy: 1.55 }, 0.14, "out"); },
        },
        {
          id: "flash", name: { en: "Flash Frame", ko: "번쩍 한 프레임" }, param: "white .8 + red",
          cap: { en: "*One white frame*, then red on the creature.", ko: "*하얀 한 프레임*, 괴물은 *빨갛게*." },
          scare(w, m) { w.flash("255,255,255", 0.5); m.tint = 1.2; },
        },
        {
          id: "zoom", name: { en: "Zoom Punch", ko: "확 다가옴" }, param: "zoom +18%",
          cap: { en: "*Punch the zoom in*. It's in your face now.", ko: "화면을 *확 당겨요*. 코앞이에요." },
          scare(w) { w.zoomPunch(0.18); w.kick(-18, 0); },
        },
        {
          id: "shake", name: { en: "Violent Shake", ko: "격한 흔들림" }, param: "trauma .8",
          cap: { en: "Shake *hard*. The hero *flinches* back.", ko: "*격하게* 흔들고, 주인공은 *움찔*." },
          scare(w) { w.shake(0.8); w.hero.ox -= 30; w.hero.sx = 0.85; w.hero.sy = 1.1; },
        },
        {
          id: "split", name: { en: "Color Split", ko: "색 갈라짐" }, param: "red / cyan ghosts",
          cap: { en: "Split it into *red and cyan*. The eye can't settle.", ko: "*빨강·하늘색*으로 갈라져요. 눈이 못 버텨요." },
          scare(w, m) {
            for (const [c, d] of [["red", -18], ["cyan", 18]]) w.spawn({ type: "ghost", img: m.s[c], x: 250 + d, y: G, w: m.w * 1.55, h: m.h * 1.55, alpha0: 0.4, life: 0.35, add: true });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "screech + hit",
          cap: { en: "A harsh *screech* on top of a low *hit*.", ko: "낮은 *쿵* 위에 날카로운 *끼아악*." },
          scare(w) { w.sfx.slam(); w.play(() => { tn({ type: "sawtooth", f: 1400, f2: 900, dur: 0.5, vol: 0.18 }); nz({ dur: 0.4, type: "bandpass", f: 3000, q: 2, vol: 0.4 }); }); },
        },
      ],
    },

    /* ───────── 11. 괴물이 가까우면 두근 (탑다운) ───────── */
    {
      id: "survival-heartbeat", cat: "survival", view: "top",
      title: { en: "Let the heart say *it's close*", ko: "심장이 *가깝다고* 말하게" },
      intro: { en: "It's right there. You feel *nothing*.", ko: "바로 옆인데 *아무 느낌*이 없어요." },
      interval: 2.4, stepDur: 4.0,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#16151c"; ctx.fillRect(-80, -80, 700, 520);
        ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 2;
        for (let x = 20; x < 540; x += 50) { ctx.beginPath(); ctx.moveTo(x, -80); ctx.lineTo(x, 440); ctx.stroke(); }
        for (let y = 10; y < 380; y += 50) { ctx.beginPath(); ctx.moveTo(-80, y); ctx.lineTo(620, y); ctx.stroke(); }
        if (w.zone) {
          const near = w.p > 0.55;
          ctx.strokeStyle = near ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.25)"; ctx.lineWidth = near ? 4 : 2; ctx.setLineDash([10, 8]);
          ctx.beginPath(); ctx.arc(w.hero.x, w.hero.gy, 120, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        }
      },
      setup(w) {
        w.hero = w.actor("heroTop", { home: 270, gy: 190 });
        w.mon = w.actor("foeTop", { home: 470, gy: 190 });
        w.M = { r: 210, a: 0 }; w.p = 0; w.heart = { sc: 1 }; w.beatT = 0; w.tunnel = 0;
      },
      fire(w) {
        const M = w.M;
        w.tween(M, { r: 70 }, 0.55, "inout", () => w.after(0.6, () => w.tween(M, { r: 210 }, 0.9, "inout")));
      },
      update(w, dt) {
        const M = w.M, m = w.mon, h = w.hero;
        M.a += dt * 0.7;
        m.x = h.x + Math.cos(M.a) * M.r; m.gy = h.gy + Math.sin(M.a) * M.r * 0.75;
        m.rot = Math.atan2(h.gy - m.gy, h.x - m.x);
        w.p = Math.max(0, Math.min(1, (200 - Math.hypot(m.x - h.x, m.gy - h.gy)) / 120));
        w.heart.sc += (1 - w.heart.sc) * Math.min(1, dt * 10);
      },
      drawFront(w, ctx) { if (w.tunnel > 0) shade(ctx, 0.85, [{ x: w.hero.x, y: w.hero.gy, r: w.tunnel, hard: 0.35 }], "10,2,4"); },
      drawHud(w, ctx) {
        ctx.save(); ctx.translate(270, 62); ctx.scale(w.heart.sc * 0.42, w.heart.sc * 0.42);
        ctx.drawImage(SPR.heart.c, -65, -60); ctx.restore();
      },
      steps: [
        {
          id: "zone", name: { en: "Danger Ring", ko: "위험 거리" }, param: "r 120 · red inside",
          cap: { en: "Show the *danger radius*. Red means too close.", ko: "*위험 거리*를 보여줘요. 빨가면 너무 가까워요." },
          update(w) { w.zone = true; },
        },
        {
          id: "beat", name: { en: "Heartbeat", ko: "심장 박동" }, param: "1.2 → 3.7 Hz",
          cap: { en: "The heart *beats faster* the closer it gets.", ko: "가까울수록 심장이 *빨리* 뛰어요." },
          update(w, dt) {
            w.beatT -= dt * (1.2 + w.p * 2.5);
            if (w.beatT <= 0) { w.beatT = 1; w.heart.sc = 1.45; w.emit("beat", w.p); }
          },
        },
        {
          id: "vignette", name: { en: "Pulse Vignette", ko: "맥박 테두리" }, param: ".15 + p × .6",
          cap: { en: "Every beat *pulses* red at the edges.", ko: "박동마다 가장자리가 *붉게 쿵*." },
          beat(w, p) { w.vignette(0.15 + p * 0.6); },
        },
        {
          id: "throb", name: { en: "Screen Throb", ko: "화면 쿵쿵" }, param: "zoom 1–5%",
          cap: { en: "The *whole screen* throbs with the beat.", ko: "*화면 전체*가 박동에 맞춰 쿵쿵." },
          beat(w, p) { w.zoomPunch(0.01 + p * 0.045); },
        },
        {
          id: "tunnel", name: { en: "Tunnel Vision", ko: "시야 좁아짐" }, param: "r 250 → 110",
          cap: { en: "Fear *narrows* your view.", ko: "무서우면 *시야가 좁아져요*." },
          update(w) { w.tunnel = 250 - w.p * 140; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "lub-dub",
          cap: { en: "A deep *lub-dub*. Players' hearts sync to it.", ko: "묵직한 *쿵-쿵*. 듣는 사람 심장도 따라 뛰어요." },
          beat(w, p) { w.play(() => { tn({ f: 60, f2: 40, dur: 0.12, vol: 0.5 + p * 0.3 }); tn({ f: 55, f2: 38, dur: 0.1, vol: 0.35 + p * 0.3, delay: 0.16 }); }); },
        },
      ],
    },

    /* ───────── 12. 손전등 깜빡임 ───────── */
    {
      id: "survival-flashlight", cat: "survival", view: "side",
      title: { en: "Make a flashlight *flicker* with fear", ko: "손전등 깜빡임을 *오싹하게*" },
      intro: { en: "Light blinks once. *Nothing.*", ko: "한 번 깜빡. *그게 다예요*." },
      interval: 2.0, stepDur: 4.0,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#24212b"; ctx.fillRect(-80, -80, 700, G + 80);
        ctx.fillStyle = "#2c2834"; for (let i = 0; i < 12; i++) ctx.fillRect(i * 50, 60, 2, G - 60);
        soil(ctx, "rgba(60,50,50,0.3)");
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 110 });
        w.fig = w.actor("foe", { home: 420 }); w.fig.alpha = 0; w.fig.keep = true;
        w.L = { on: 1, dark: 0, ang: 0.02, jit: 0, glow: false };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const L = w.L;
        if (w.on("stutter")) w.emit("flick", L);
        else { L.on = 0; w.after(0.15, () => { L.on = 1; }); }
        w.after(1.3, () => { w.fig.alpha = 0; w.busy = false; });
      },
      update(w, dt) { const L = w.L; L.jit *= Math.pow(0.05, dt); L.ang = 0.02 + Math.sin(w.time * 40) * L.jit; },
      drawFront(w, ctx) {
        const h = w.hero, L = w.L, ox = h.x + 46, oy = G - 84;
        if (L.dark > 0) shade(ctx, L.dark, L.on ? [{ x: ox, y: oy, r: 470, cone: [L.ang + 0.1, 0.26], hard: 0.55 }, { x: h.x, y: G - 70, r: L.glow ? 100 : 0.1, a: 0.5 }] : [], "4,4,8");
        if (L.on) {
          ctx.fillStyle = `rgba(253,230,138,${L.dark ? 0.16 : 0.35})`;
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, 460, L.ang + 0.1 - 0.26, L.ang + 0.1 + 0.26); ctx.closePath(); ctx.fill();
          if (L.glow) { ctx.globalCompositeOperation = "lighter"; glow(ctx, ox, oy, 26, "255,240,200", 1); ctx.globalCompositeOperation = "source-over"; }
        }
        ctx.fillStyle = "#475569"; ctx.fillRect(ox - 18, oy - 5, 20, 10);
      },
      steps: [
        {
          id: "dark", name: { en: "Real Darkness", ko: "진짜 어둠" }, param: "dark .9 · cone",
          cap: { en: "Make it *dark*. Now the beam is all you have.", ko: "*어둡게*. 이제 믿을 건 불빛뿐이에요." },
          update(w) { w.L.dark = 0.9; },
        },
        {
          id: "stutter", name: { en: "Stutter Pattern", ko: "불규칙 깜빡임" }, param: "5 uneven blinks",
          cap: { en: "Blink *unevenly*. Short, short, *long*.", ko: "*불규칙하게*. 짧게, 짧게, *길게*." },
          flick(w, L) {
            [[0, 0], [0.06, 1], [0.12, 0], [0.2, 1], [0.48, 0], [0.8, 1]].forEach(([t, v]) => w.after(t, () => { L.on = v; w.emit("toggle", L, t); }));
          },
        },
        {
          id: "figure", name: { en: "Something's There", ko: "뭔가 있다" }, param: "visible 1 blink",
          cap: { en: "In *one* blink, something *stands there*. Next blink, gone.", ko: "*한 번* 켜졌을 때 뭔가 *서 있어요*. 다음엔 없어요." },
          toggle(w, L, t) { w.fig.alpha = t === 0.2 ? 1 : 0; w.fig.tint = 0.6; },
        },
        {
          id: "jitter", name: { en: "Shaky Hands", ko: "떨리는 손" }, param: "±0.08 rad",
          cap: { en: "The beam *trembles*. The hero is scared too.", ko: "불빛이 *덜덜*. 주인공도 무서운 거예요." },
          flick(w, L) { L.jit = 0.08; },
          update(w) { w.L.jit = Math.max(w.L.jit, 0.012); },
        },
        {
          id: "motes", name: { en: "Dust in Beam", ko: "빛 속 먼지" }, param: "~8 / sec",
          cap: { en: "*Dust* floats in the beam. Light has volume.", ko: "빛 속에 *먼지*가 떠다녀요. 빛에 부피가 생겨요." },
          update(w, dt) { if (w.L.on && Math.random() < dt * 10) w.spawn({ type: "glow", x: rand(180, 480), y: G - 84 + rand(-60, 60), vx: rand(-8, 8), vy: rand(-8, 8), size: rand(2, 4), life: 2, color: "255,240,200" }); },
        },
        {
          id: "glow", name: { en: "Bulb Glow", ko: "전구 빛" }, param: "lens + spill",
          cap: { en: "A hot *lens glow* and a little spill on the hero.", ko: "*전구가 빛나고*, 주인공도 살짝 비춰요." },
          update(w) { w.L.glow = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "click + buzz",
          cap: { en: "Every blink: a tiny *click* and an electric *buzz*.", ko: "깜빡일 때마다 *딸깍*, 전기 *지직*." },
          toggle(w, L) { w.sfx.tick(); if (L.on) w.play(() => tn({ type: "sawtooth", f: 120, dur: 0.05, vol: 0.08 })); },
          flick(w) { w.play(() => nz({ dur: 0.3, type: "bandpass", f: 900, q: 6, vol: 0.12 })); },
        },
      ],
    },

    /* ───────── 13. 정신력 왜곡 ───────── */
    {
      id: "survival-sanity", cat: "survival", view: "side",
      title: { en: "Make losing your mind *visible*", ko: "정신이 *흔들리는 게* 보이게" },
      intro: { en: "Sanity dropping. Screen: *totally fine*.", ko: "정신력이 떨어지는데 화면은 *멀쩡*." },
      interval: 0.85, stepDur: 4.0,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1d1a22"; ctx.fillRect(-80, -80, 700, G + 80);
        rr(ctx, 380, G - 70, 110, 12, 3, "#3f3346", null); ctx.fillStyle = "#3f3346"; ctx.fillRect(390, G - 58, 8, 58); ctx.fillRect(472, G - 58, 8, 58);
        rr(ctx, 60, 70, 80, 100, 4, "#2b2533", "rgba(255,255,255,0.1)", 3);
        soil(ctx);
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 240 });
        w.Z = { v: 100, tint: 0, dbl: 0, glitch: 0 };
        sprite("survival-shadow", 210, 210, x => { x.drawImage(SPR.foe.c, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = "#05030a"; x.fillRect(0, 0, 210, 210); });
      },
      fire(w) {
        const Z = w.Z;
        Z.v = Z.v <= 0 ? 100 : Math.max(0, Z.v - 16);
        w.emit("drop", 1 - Z.v / 100);
      },
      update(w) { w.s = 1 - w.Z.v / 100; },
      drawBack(w, ctx) {
        if (w.Z.dbl > 0) { const h = w.hero, d = 18 * w.Z.dbl; for (const [c, k] of [["red", -1], ["cyan", 1]]) { ctx.save(); ctx.globalAlpha = 0.4; ctx.drawImage(h.s[c], h.x - h.w / 2 + d * k + Math.sin(w.time * 3) * 6 * k, G - h.h, h.w, h.h); ctx.restore(); } }
      },
      drawFront(w, ctx) { if (w.Z.tint > 0) { ctx.fillStyle = `rgba(126,34,206,${w.Z.tint})`; ctx.fillRect(-80, -80, 700, 520); } },
      drawHud(w, ctx) {
        const Z = w.Z, j = Z.glitch * w.s;
        meter(ctx, 190 + rand(-1, 1) * j * 6, 62 + rand(-1, 1) * j * 3, 160, 14, Z.v / 100, "#a78bfa");
        label(ctx, j > 0.4 && Math.random() < 0.3 ? "S?N!TY" : "SANITY", 270, 46, 13, "rgba(255,255,255,0.6)");
      },
      steps: [
        {
          id: "tint", name: { en: "Purple Creep", ko: "보랏빛 물듦" }, param: "tint × 0.35",
          cap: { en: "The world slowly turns *purple*.", ko: "세상이 천천히 *보랏빛*으로." },
          update(w) { w.Z.tint = w.s * 0.35; },
        },
        {
          id: "sway", name: { en: "Seasick Camera", ko: "울렁이는 화면" }, param: "sway 22px · zoom",
          cap: { en: "The camera *sways* like you're seasick.", ko: "화면이 *뱃멀미*처럼 울렁울렁." },
          update(w) { w.cam.tx = Math.sin(w.time * 1.3) * 22 * w.s; w.cam.ty = Math.cos(w.time * 1.7) * 10 * w.s; w.zoomPunch(0.04 * w.s * (1 + Math.sin(w.time * 2))); },
        },
        {
          id: "double", name: { en: "Double Vision", ko: "겹쳐 보임" }, param: "red/cyan ±18px",
          cap: { en: "The body *splits* into red and cyan copies.", ko: "몸이 *빨강·하늘색*으로 갈라져 보여요." },
          update(w) { w.Z.dbl = w.s; },
        },
        {
          id: "shadows", name: { en: "False Shadows", ko: "헛것" }, param: "random · 0.6s",
          cap: { en: "*Shadows* flicker at the edge. Were they real?", ko: "구석에 *그림자*가 휙. 진짜였을까요?" },
          drop(w, s) {
            if (s < 0.3) return;
            const x = pick([60, 470]);
            w.spawn({ type: "ghost", img: SPR["survival-shadow"].c, x, y: G, w: 130, h: 130, alpha0: 0.8, life: 0.7, add: false, vx: x < 270 ? -40 : 40 });
          },
        },
        {
          id: "whisper", name: { en: "Whispers", ko: "속삭임" }, param: "symbols drift",
          cap: { en: "Scraps of *whispers* drift past.", ko: "알 수 없는 *속삭임*이 스쳐 가요." },
          drop(w, s) { for (let i = 0; i < 1 + s * 2; i++) w.spawn({ type: "text", text: pick(["…", "?", "shh"]), x: pick([rand(70, 170), rand(340, 470)]), y: rand(120, 240), vx: rand(-30, 30), vy: -20, life: 1.1, size: rand(20, 28), color: "#c4b5fd" }); },
        },
        {
          id: "glitch", name: { en: "UI Glitch", ko: "UI 오류" }, param: "jitter + typo",
          cap: { en: "Even the *UI* starts to glitch.", ko: "*UI*까지 오락가락해요." },
          update(w) { w.Z.glitch = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "detuned pair",
          cap: { en: "Two tones, *slightly out of tune*. Unsettling.", ko: "*살짝 어긋난* 두 음. 기분 나빠요." },
          drop(w, s) { w.play(() => { tn({ type: "triangle", f: 220, dur: 0.6, vol: 0.12 }); tn({ type: "triangle", f: 220 * (1.03 + s * 0.05), dur: 0.6, vol: 0.12 }); }); },
        },
      ],
    },

    /* ───────── 14. 삐걱이는 문 ───────── */
    {
      id: "survival-door", cat: "survival", view: "side",
      title: { en: "Make a door *creak* open", ko: "문이 *삐걱* 열리게" },
      intro: { en: "Door: closed. Door: *open*.", ko: "문 닫힘. 문 *열림*. 끝." },
      interval: 2.6, stepDur: 4.2,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#2a2430"; ctx.fillRect(-80, -80, 700, G + 80);
        soil(ctx, "rgba(70,55,50,0.35)");
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 110 });
        w.D = { o: 0, spill: false, dark: 0, push: false };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const D = w.D;
        const open = () => {
          w.emit("opening", D);
          if (!w.on("slow")) D.o = 0.85;
          w.after(1.9, () => w.tween(D, { o: 0 }, 0.25, "in", () => { w.busy = false; }));
        };
        if (D.o > 0) w.tween(D, { o: 0 }, 0.15, "in", open); else open();
      },
      update(w) { if (w.D.push) { w.zoomPunch(w.D.o * 0.12); w.cam.tx = w.D.o * 30; } },
      drawBack(w, ctx) {
        const D = w.D, hx = 300, dw = 84, top = G - 160, open = Math.max(0, D.o);
        ctx.fillStyle = "#07060a"; ctx.fillRect(hx, top, dw, 160);
        if (D.spill && open > 0.02) {
          const gx = hx + dw * Math.cos(open * 1.45);
          ctx.globalCompositeOperation = "lighter";
          const g = ctx.createLinearGradient(gx, 0, gx + 160, 0); g.addColorStop(0, "rgba(253,186,116,0.55)"); g.addColorStop(1, "rgba(253,186,116,0)");
          ctx.fillStyle = `rgba(253,186,116,${0.6 * open})`; ctx.fillRect(gx, top, hx + dw - gx, 160);
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(gx, G); ctx.lineTo(hx + dw, G); ctx.lineTo(hx + dw + 220 * open, G + 60); ctx.lineTo(gx - 40 * open, G + 60); ctx.closePath(); ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }
        const c = Math.cos(open * 1.45), sk = Math.sin(open * 1.45) * 18;
        ctx.fillStyle = "#6b4226"; ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hx, top); ctx.lineTo(hx + dw * c, top - sk); ctx.lineTo(hx + dw * c, G + sk * 0.4); ctx.lineTo(hx, G); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(hx + dw * c * 0.85, G - 80, 4, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#3b2a20"; ctx.lineWidth = 8; ctx.strokeRect(hx - 4, top - 4, dw + 8, 164);
      },
      drawFront(w, ctx) {
        const D = w.D;
        if (D.dark > 0) { const gx = 300 + 84 * Math.cos(D.o * 1.45); const L = [{ x: w.hero.x, y: G - 70, r: 130, a: 0.5 }]; if (D.spill && D.o > 0.02) L.push({ x: (gx + 384) / 2 + 30, y: G - 60, r: 110 + 220 * D.o, hard: 0.3 }); shade(ctx, D.dark, L); }
      },
      steps: [
        {
          id: "slow", name: { en: "Slow, Hesitant Swing", ko: "멈칫멈칫 열림" }, param: "0.4 · pause · 0.85",
          cap: { en: "Open a crack, *pause*, then the rest.", ko: "*살짝* 열고, *멈칫*, 그다음 끝까지." },
          opening(w, D) { w.tween(D, { o: 0.4 }, 0.25, "out", () => w.after(0.25, () => w.tween(D, { o: 0.85 }, 0.6, "inout", () => w.emit("settle", D)))); },
        },
        {
          id: "dark", name: { en: "Dark Room", ko: "어두운 방" }, param: "dark .6",
          cap: { en: "Darken our side. What's *behind* matters now.", ko: "이쪽은 어둡게. 이제 *문 너머*가 중요해요." },
          update(w) { w.D.dark = 0.6; },
        },
        {
          id: "spill", name: { en: "Light Spill", ko: "새어 나오는 빛" }, param: "wedge × open",
          cap: { en: "Light *spills out* through the gap, wider and wider.", ko: "틈으로 *빛이 새어 나와요*. 점점 넓게." },
          update(w) { w.D.spill = true; },
        },
        {
          id: "dust", name: { en: "Falling Dust", ko: "떨어지는 먼지" }, param: "10 specks",
          cap: { en: "*Dust drops* from the frame. Nobody opened this in years.", ko: "문틀에서 *먼지가 후두둑*. 오래 닫혀 있었죠." },
          opening(w) { for (let i = 0; i < 10; i++) w.after(i * 0.05, () => w.spawn({ type: "circle", x: rand(300, 384), y: G - 162, vy: rand(20, 80), g: 260, size: rand(1.5, 2.5), life: 1.3, color: "214,200,180", add: false })); },
        },
        {
          id: "settle", name: { en: "Settle Wobble", ko: "끝에서 흔들" }, param: "overshoot ±0.05",
          cap: { en: "At the end, the door *wobbles* on its hinge.", ko: "다 열리면 경첩에서 *흔들흔들*." },
          settle(w, D) { w.tween(D, { o: 0.9 }, 0.12, "out", () => w.tween(D, { o: 0.83 }, 0.2, "inout", () => w.tween(D, { o: 0.85 }, 0.2))); },
        },
        {
          id: "push", name: { en: "Slow Push-in", ko: "천천히 다가감" }, param: "zoom 12% · lead 50",
          cap: { en: "Ease the camera *toward the door*.", ko: "카메라가 *문 쪽으로* 천천히 다가가요." },
          update(w) { w.D.push = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "2-part creak",
          cap: { en: "Two *creaks*, with a silence in between.", ko: "*끼익*… 정적… *끼이이익*." },
          opening(w) { w.sfx.creak(); w.after(0.75, () => w.play(() => tn({ type: "sawtooth", f: 80, f2: 190, dur: 0.8, vol: 0.06 }))); },
        },
      ],
    },

    /* ───────── 15. 발소리 ───────── */
    {
      id: "survival-footsteps", cat: "survival", view: "side",
      title: { en: "Make footsteps feel *heavy*", ko: "발소리가 *다가오게*" },
      intro: { en: "Something's coming. It *glides*.", ko: "뭔가 오는데… *미끄러지듯* 와요." },
      interval: 0.42, stepDur: 4.0,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1f1d26"; ctx.fillRect(-80, -80, 700, G + 80);
        for (let i = 0; i < 6; i++) rr(ctx, 10 + i * 100, 90, 40, 150, 3, "#18161e", null);
        soil(ctx, "rgba(90,80,70,0.25)");
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 100 });
        w.mon = w.actor("foe", { home: 560 });
        w.foot = 0; w.noise = 0;
      },
      fire(w) {
        const m = w.mon;
        if (m.x < 300) { m.x = 580; return; }
        m.x -= 22; w.foot ^= 1;
        const near = Math.max(0, Math.min(1, (560 - m.x) / 260));
        w.emit("step", { x: m.x - 18 + w.foot * 26, y: G }, near);
      },
      update(w, dt) { w.noise = Math.max(0, w.noise - dt * 2); },
      drawHud(w, ctx) {
        if (w.noise <= 0) return;
        ctx.strokeStyle = `rgba(248,113,113,${w.noise})`; ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) { ctx.lineWidth = 5 - i; ctx.beginPath(); ctx.arc(510, 200, 20 + i * 16, Math.PI * 0.75, Math.PI * 1.25); ctx.stroke(); }
      },
      steps: [
        {
          id: "bob", name: { en: "Step Bob", ko: "걸음 출렁" }, param: "oy −8 · squash",
          cap: { en: "Each step *lifts and drops* the body.", ko: "걸을 때마다 몸이 *들썩*." },
          step(w) { const m = w.mon; m.oy = -8; m.sy = 0.92; m.sx = 1.06; w.after(0.08, () => { m.oy = 0; }); },
        },
        {
          id: "dust", name: { en: "Dust Kick", ko: "먼지" }, param: "3 puffs",
          cap: { en: "A little *dust* where the foot lands.", ko: "발 닿는 곳에 *먼지 폴폴*." },
          step(w, f) { dirt(w, f.x, f.y, 6, 0, "110,100,92"); },
        },
        {
          id: "prints", name: { en: "Footprints", ko: "발자국" }, param: "decal 4s",
          cap: { en: "Leave *prints*. You see the path it took.", ko: "*발자국*을 남겨요. 지나온 길이 보여요." },
          step(w, f) { w.spawn({ type: "ellipse", under: true, x: f.x, y: G + 5, size: 22, life: 4, color: "0,0,0", alpha: 0.9, hold: true, add: false }); },
        },
        {
          id: "rings", name: { en: "Sound Rings", ko: "소리 고리" }, param: "r × proximity",
          cap: { en: "*Draw the sound*. Louder as it gets closer.", ko: "*소리를 그려요*. 가까울수록 크게." },
          step(w, f, near) { w.spawn({ type: "ring", x: f.x, y: G, size: 8, size1: 50 + near * 110, life: 0.55, w: 6, flat: true, color: "248,113,113" }); },
        },
        {
          id: "thump", name: { en: "Camera Thump", ko: "화면 쿵" }, param: "kick 1–6px",
          cap: { en: "The *camera thumps* with each step.", ko: "발걸음마다 *화면이 쿵*." },
          step(w, f, near) { w.kick(0, 1 + near * 5); },
        },
        {
          id: "edge", name: { en: "Direction Hint", ko: "방향 표시" }, param: "edge arcs",
          cap: { en: "Show *which side* it's coming from.", ko: "*어느 쪽*에서 오는지 알려줘요." },
          step(w, f, near) { w.noise = 0.4 + near * 0.6; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "vol × proximity",
          cap: { en: "Heavy *thuds*, louder each step.", ko: "묵직한 *쿵*, 걸음마다 더 크게." },
          step(w, f, near) { w.play(() => { tn({ f: 90, f2: 45, dur: 0.12, vol: 0.15 + near * 0.45 }); nz({ dur: 0.05, f: 600, vol: 0.1 + near * 0.2 }); }); },
        },
      ],
    },

    /* ───────── 16. 숨기·숨 참기 ───────── */
    {
      id: "survival-hide", cat: "survival", view: "side",
      title: { en: "Make hiding *hold your breath*", ko: "숨을 *같이 참게* 만들기" },
      intro: { en: "It walks by. You're *fine*. Boring.", ko: "지나가요. *안전해요*. 그래서 심심해요." },
      interval: 2.9, stepDur: 4.2,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1c2026"; ctx.fillRect(-80, -80, 700, G + 80);
        soil(ctx);
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 160 }); w.hero.sy = 0.72;
        w.mon = w.actor("foe", { home: 600 });
        w.B = { k: 0, hold: false, cone: false, dark: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const B = w.B, m = w.mon;
        m.x = 600; B.k = 1; B.hold = true;
        w.emit("hold", B);
        w.tween(m, { x: -60 }, 2.3, "lin");
        w.tween(B, { k: 0 }, 2.3, "lin", () => { B.hold = false; w.emit("release", B); w.after(0.4, () => { w.busy = false; }); });
      },
      update(w) { const h = w.hero; h.sy = Math.min(h.sy, 0.74); h.sx = Math.max(h.sx, 1.04); },
      drawBack(w, ctx) {
        const m = w.mon;
        if (w.B.cone && m.x < 560) {
          const near = Math.abs(m.x - 230) < 90;
          ctx.fillStyle = near ? "rgba(239,68,68,0.28)" : "rgba(253,224,71,0.16)";
          ctx.beginPath(); ctx.moveTo(m.x - 40, G - 100); ctx.lineTo(m.x - 220, G - 40); ctx.lineTo(m.x - 210, G + 6); ctx.closePath(); ctx.fill();
        }
      },
      drawFront(w, ctx) {
        rr(ctx, 210, G - 92, 80, 92, 6, "#4b3b2a", "rgba(0,0,0,0.4)", 2);
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(210, G - 62, 80, 4); ctx.fillRect(210, G - 32, 80, 4);
        if (w.B.dark > 0) shade(ctx, w.B.dark, [{ x: w.hero.x + 20, y: G - 60, r: 150, hard: 0.4 }, { x: w.mon.x, y: G - 70, r: 110, a: 0.6 }]);
        const B = w.B, h = w.hero;
        if (B.ring && B.hold) {
          ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(h.x, G - 140, 20, 0, TAU); ctx.stroke();
          ctx.strokeStyle = B.k < 0.3 ? "#ef4444" : "#7dd3fc"; ctx.lineWidth = 6; ctx.lineCap = "round";
          ctx.beginPath(); ctx.arc(h.x, G - 140, 20, -Math.PI / 2, -Math.PI / 2 + TAU * B.k); ctx.stroke();
        }
      },
      steps: [
        {
          id: "ring", name: { en: "Breath Meter", ko: "숨 게이지" }, param: "2.3s · red < 30%",
          cap: { en: "Show the *air left*. It turns red near the end.", ko: "*남은 숨*을 보여줘요. 끝이 다가오면 빨갛게." },
          hold(w, B) { B.ring = true; },
        },
        {
          id: "dark", name: { en: "Dim the World", ko: "주변을 어둡게" }, param: "dark .7",
          cap: { en: "*Dim* everything. Your hiding spot feels small.", ko: "주변을 *어둡게*. 숨은 곳이 좁게 느껴져요." },
          update(w) { w.B.dark = 0.7; },
        },
        {
          id: "cone", name: { en: "Vision Cone", ko: "괴물 시야" }, param: "red when near",
          cap: { en: "Show *where it looks*. Red when it's on you.", ko: "괴물이 *보는 곳*을 그려요. 닿으면 빨갛게." },
          update(w) { w.B.cone = true; },
        },
        {
          id: "tremble", name: { en: "Rising Tremble", ko: "점점 떨림" }, param: "vib 0 → 4px",
          cap: { en: "The less air, the *harder* you shake.", ko: "숨이 줄수록 *더 떨려요*." },
          update(w) { if (w.B.hold) w.hero.vib = (1 - w.B.k) * 4; },
        },
        {
          id: "zoom", name: { en: "Slow Squeeze", ko: "조여 오는 화면" }, param: "zoom 0 → 10%",
          cap: { en: "Slowly *zoom in*. Tension builds.", ko: "천천히 *다가가요*. 긴장이 쌓여요." },
          update(w) { if (w.B.hold) w.zoomPunch((1 - w.B.k) * 0.1); },
        },
        {
          id: "exhale", name: { en: "Big Exhale", ko: "푸하" }, param: "10 puffs · stretch",
          cap: { en: "Let it out: a *big puff* and the body *relaxes*.", ko: "*푸하* 내쉬고, 몸이 *풀려요*." },
          release(w) {
            const h = w.hero; h.sy = 0.9; h.sx = 0.96;
            for (let i = 0; i < 12; i++) w.spawn({ type: "smoke", under: true, x: h.x + 10, y: G - 96, vx: rand(-90, 40), vy: rand(-140, -40), drag: 2.5, size: 3, size1: rand(10, 18), life: 0.9, alpha: 0.7, color: "170,180,195" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "muffled beats / gasp",
          cap: { en: "Muffled *thumps*, then a long *gasp*.", ko: "먹먹한 *쿵쿵*, 그리고 *하아*." },
          hold(w) { for (let i = 0; i < 6; i++) w.after(i * 0.38, () => w.play(() => tn({ f: 55, f2: 40, dur: 0.12, vol: 0.4 }))); },
          release(w) { w.play(() => nz({ dur: 0.6, type: "bandpass", f: 900, f2: 500, q: 1, vol: 0.3 })); },
        },
      ],
    },

    /* ───────── 17. 뒤져서 줍기 ───────── */
    {
      id: "survival-scavenge", cat: "survival", view: "side",
      title: { en: "Make scavenging feel like *finding*", ko: "뒤지는 맛 *찾는 맛*" },
      intro: { en: "Search. +1. *Next.*", ko: "뒤짐. +1. *끝.*" },
      interval: 1.6, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 150 });
        w.S = { prog: 0, wob: 0, count: 0, bump: 0 };
        w.items = [];
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, d = w.on("search") ? 0.6 : 0;
        w.emit("dig", S);
        w.after(d, () => {
          const r = pick([0, 0, 1, 1, 2]);
          const it = { k: pick(["bandage", "can", "ammo"]), r, x: 330, y: G - 50, a: 1, sc: 1 };
          w.items.push(it); S.count++;
          w.emit("found", it);
          if (!it.moving) w.after(0.5, () => { it.a = 0; });
          w.after(0.9, () => { w.busy = false; });
        });
      },
      update(w, dt) {
        const S = w.S; S.wob *= Math.pow(0.05, dt); S.bump = Math.max(0, S.bump - dt * 5);
        w.items = w.items.filter(it => it.a > 0);
      },
      drawBack(w, ctx) {
        const S = w.S, sw = Math.sin(w.time * 50) * S.wob * 4;
        ctx.save(); ctx.translate(330 + sw, G);
        [[-50, -10, 60, 30, "#475569"], [10, -12, 70, 26, "#78350f"], [-20, -40, 50, 34, "#334155"], [20, -36, 30, 30, "#a16207"], [-60, -30, 26, 22, "#64748b"]].forEach(([x, y, wd, h, c]) => rr(ctx, x, y - h + 20, wd, h, 4, c, "rgba(0,0,0,0.3)", 2));
        ctx.restore();
        if (S.prog > 0 && S.prog < 1) {
          ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(330, G - 110, 18, 0, TAU); ctx.stroke();
          ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(330, G - 110, 18, -Math.PI / 2, -Math.PI / 2 + TAU * S.prog); ctx.stroke();
        }
      },
      drawFront(w, ctx) {
        for (const it of w.items) {
          if (it.glow) { ctx.globalCompositeOperation = "lighter"; glow(ctx, it.x, it.y, 46, ["203,213,225", "56,189,248", "192,132,252"][it.r], 0.9 * it.a); ctx.globalCompositeOperation = "source-over"; }
          ctx.globalAlpha = it.a; icon(ctx, it.k, it.x, it.y, 1.3 * it.sc); ctx.globalAlpha = 1;
        }
      },
      drawHud(w, ctx) {
        const S = w.S, sc = 1 + S.bump * 0.3;
        ctx.save(); ctx.translate(70, 76); ctx.scale(sc, sc);
        rr(ctx, -26, -26, 52, 52, 10, "rgba(0,0,0,0.5)", "rgba(255,255,255,0.25)", 2);
        icon(ctx, "bandage", 0, 0, 0.9);
        ctx.restore();
        label(ctx, "×" + S.count, 112, 76, 20, S.bump > 0.2 ? "#c6f432" : "#fff");
      },
      steps: [
        {
          id: "search", name: { en: "Search Time", ko: "뒤지는 시간" }, param: "600ms ring",
          cap: { en: "Searching takes a moment. Show a *ring*.", ko: "뒤지는 데 시간이 걸려요. *고리*로 보여줘요." },
          dig(w, S) { S.prog = 0.001; w.tween(S, { prog: 1 }, 0.6, "lin"); },
        },
        {
          id: "rummage", name: { en: "Rummage", ko: "부스럭" }, param: "wobble + 8 bits",
          cap: { en: "The pile *shakes*, junk *flies out*.", ko: "더미가 *들썩*, 잡동사니가 *휙휙*." },
          dig(w, S) {
            S.wob = 1;
            for (let i = 0; i < 8; i++) w.after(i * 0.07, () => chips(w, 330, G - 30, 1, ["100,116,139", "120,53,15", "71,85,105"], [-240, 240]));
          },
        },
        {
          id: "pop", name: { en: "Pop + Fly to Bag", ko: "톡 튀어 가방으로" }, param: "arc → slot",
          cap: { en: "The find *pops up*, then flies into your *bag*.", ko: "찾은 게 *톡* 튀고, *가방*으로 쏙." },
          found(w, it) {
            it.moving = true; it.sc = 0.3;
            w.tween(it, { y: G - 150, sc: 1.4 }, 0.3, "out", () => w.after(0.25, () => w.tween(it, { x: 70, y: 76, sc: 0.5 }, 0.3, "in", () => { it.a = 0; w.emit("bag", it); })));
          },
        },
        {
          id: "rarity", name: { en: "Rarity Glow", ko: "등급 빛" }, param: "gray / blue / purple",
          cap: { en: "Color the glow by *rarity*. Blue makes you smile.", ko: "*등급*별로 빛 색을 달리. 파랑이면 웃음이 나요." },
          found(w, it) {
            it.glow = true;
            if (it.r > 0) w.spawn({ type: "beam", x: 330, y: G, size: 22, h: 260, life: 0.6, color: it.r > 1 ? "192,132,252" : "56,189,248" });
          },
        },
        {
          id: "bump", name: { en: "Bag Bump", ko: "가방 톡" }, param: "scale 1.3 + sparkle",
          cap: { en: "The *bag slot bumps* when it lands.", ko: "들어오면 *가방 칸이 톡*." },
          bag(w) { w.S.bump = 1; sparks(w, 70, 76, 8, "236,252,203", [80, 200]); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rustle / pop / blip",
          cap: { en: "*Rustle*, a *pop*, then a soft *blip*.", ko: "*부스럭*, *톡*, 그리고 *뾰롱*." },
          dig(w) { w.play(() => nz({ dur: 0.5, type: "bandpass", f: 1800, q: 0.8, vol: 0.2 })); },
          found(w, it) { w.sfx.pop(); if (it.r > 1) w.sfx.chime(7); },
          bag(w) { w.sfx.blip(3); },
        },
      ],
    },

    /* ───────── 18. 도구 내구도 파손 ───────── */
    {
      id: "survival-toolbreak", cat: "survival", view: "side",
      title: { en: "Make a tool *break* with drama", ko: "도구가 *부서지는* 순간" },
      intro: { en: "The hammer just… *vanished*?", ko: "망치가… *어디 갔지?*" },
      interval: 0.6, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 120 });
        w.T = { rot: -0.4, dur: 100, broken: false, bar: false, warn: false, cracks: false, iconT: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const T = w.T;
        if (T.broken) { Object.assign(T, { broken: false, dur: 100 }); w.after(0.3, () => { w.busy = false; }); return; }
        w.tween(T, { rot: -0.9 }, 0.12, "out", () => w.tween(T, { rot: 1.4 }, 0.07, "in", () => {
          T.dur -= 20;
          w.emit("hit", { x: 262, y: G - 84 }, T);
          if (T.dur <= 0) { T.broken = true; w.emit("break", T); }
          w.after(0.08, () => w.tween(T, { rot: -0.4 }, 0.2, "inout", () => { w.busy = false; }));
        }));
      },
      update(w, dt) { w.T.iconT = Math.max(0, w.T.iconT - dt); },
      drawBack(w, ctx) {
        rr(ctx, 230, G - 84, 150, 14, 3, "#a16207", "rgba(0,0,0,0.35)", 2);
        ctx.fillStyle = "#713f12"; ctx.fillRect(244, G - 70, 10, 70); ctx.fillRect(356, G - 70, 10, 70);
        ctx.fillStyle = "#94a3b8"; for (const x of [270, 300, 330]) ctx.fillRect(x, G - 92, 4, 8);
      },
      drawFront(w, ctx) {
        const T = w.T, h = w.hero, px = h.x + h.ox + 30, py = G - 74;
        ctx.save(); ctx.translate(px, py); ctx.rotate(T.rot);
        rr(ctx, -5, T.broken ? -60 : -120, 10, T.broken ? 70 : 130, 4, "#a16207", "rgba(0,0,0,0.3)", 2);
        if (T.broken) { ctx.fillStyle = "#fcd9a0"; ctx.beginPath(); ctx.moveTo(-5, -60); ctx.lineTo(0, -70); ctx.lineTo(5, -60); ctx.closePath(); ctx.fill(); }
        else {
          rr(ctx, -30, -142, 60, 34, 6, T.warn && T.dur <= 40 && Math.sin(w.time * 20) > 0 ? "#ef4444" : "#64748b", "rgba(0,0,0,0.3)", 2);
          if (T.cracks && T.dur < 100) {
            ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2.5; const n = Math.round((100 - T.dur) / 20);
            for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(-24 + i * 12, -142); ctx.lineTo(-18 + i * 12, -130); ctx.lineTo(-26 + i * 12, -118); ctx.stroke(); }
          }
        }
        ctx.restore();
        if (T.bar) {
          const c = T.dur > 50 ? "#4ade80" : T.dur > 20 ? "#f59e0b" : "#ef4444";
          meter(ctx, 200, 60, 140, 12, T.dur / 100, T.warn && T.dur <= 40 && Math.sin(w.time * 20) > 0 ? "#fff" : c);
          label(ctx, "DURABILITY", 270, 44, 12, "rgba(255,255,255,0.55)");
        }
        if (T.iconT > 0) { const k = Math.min(1, (1.2 - T.iconT) * 6); ctx.save(); ctx.translate(270, 150); ctx.scale(0.6 + k * 0.4, 0.6 + k * 0.4); label(ctx, "BROKEN", 0, 0, 40, "#ef4444"); ctx.restore(); }
      },
      steps: [
        {
          id: "bar", name: { en: "Durability Bar", ko: "내구도 바" }, param: "−20 / hit",
          cap: { en: "Show *durability*. No surprise breaks.", ko: "*내구도*를 보여줘요. 갑자기 부서지면 억울해요." },
          hit(w, at, T) { T.bar = true; },
        },
        {
          id: "warn", name: { en: "Low Warning", ko: "경고 깜빡임" }, param: "≤ 40% · 10Hz blink",
          cap: { en: "Near the end, the tool *blinks red*.", ko: "얼마 안 남으면 *빨갛게 깜빡*." },
          hit(w, at, T) { T.warn = true; if (T.dur <= 40) txt(w, w.hero.x, G - 170, "!", 34, "#ef4444"); },
        },
        {
          id: "cracks", name: { en: "Visible Cracks", ko: "보이는 금" }, param: "+1 crack / hit",
          cap: { en: "The head *cracks* a little more every hit.", ko: "칠 때마다 머리에 *금이 하나씩*." },
          hit(w, at, T) { T.cracks = true; },
        },
        {
          id: "shatter", name: { en: "Shatter", ko: "산산조각" }, param: "head flies · 8 bits",
          cap: { en: "The head *flies off* in pieces. Only the handle stays.", ko: "머리가 *날아가고*, 손잡이만 남아요." },
          break(w, T) {
            w.spawn({ type: "chunk", x: 262, y: G - 140, vx: 260, vy: -520, g: 1500, ground: true, bounce: 0.4, vr: 14, size: 24, life: 2.2, color: "100,116,139", hold: true });
            chips(w, 262, G - 120, 16, ["148,163,184", "71,85,105", "161,98,7"], [-260, 360], [4, 9]);
            w.spawn({ type: "star", x: 262, y: G - 120, size: 70, life: 0.15, color: "255,255,255" });
            sparks(w, 262, G - 120, 16, "255,220,150", [250, 650]);
            w.shake(0.4);
          },
        },
        {
          id: "slowmo", name: { en: "Slow Moment", ko: "슬로모션" }, param: "0.3× · 500ms",
          cap: { en: "*Slow time* so the loss sinks in.", ko: "*느리게*. 잃은 걸 느낄 시간." },
          break(w) { w.slowmo(0.3, 0.5); },
        },
        {
          id: "banner", name: { en: "BROKEN Banner", ko: "파손 알림" }, param: "pop 1.2s",
          cap: { en: "Say it big: *BROKEN*.", ko: "크게 알려요: *BROKEN*." },
          break(w, T) { T.iconT = 1.2; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tink / snap",
          cap: { en: "*Tink* on hits, a sharp *snap* when it breaks.", ko: "칠 땐 *탕*, 부서질 땐 *뚝*." },
          hit(w) { w.sfx.thunk(); },
          break(w) { w.sfx.crit(); w.play(() => nz({ dur: 0.08, type: "highpass", f: 3500, vol: 0.5 })); },
        },
      ],
    },

    /* ───────── 19. 낚시 ───────── */
    {
      id: "survival-fish", cat: "survival", view: "side",
      title: { en: "Make fishing *tense*", ko: "낚시에 *손맛* 넣기" },
      intro: { en: "Cast. Wait. Fish. *Huh.*", ko: "던지고, 기다리고, 물고기. *응?*" },
      interval: 2.8, stepDur: 4.2,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#0c2a3e"; ctx.fillRect(250, G + 14, 400, 140);
        ctx.fillStyle = "rgba(125,211,252,0.35)"; ctx.fillRect(250, G + 12, 400, 3);
        rr(ctx, -80, G - 2, 340, 14, 2, "#6b4226", null);
        ctx.fillStyle = "#4a2d1a"; for (const x of [60, 160, 240]) ctx.fillRect(x, G + 10, 10, 120);
      },
      setup(w) {
        ensure();
        w.hero = w.actor("hero", { home: 170 });
        w.B = { x: 0, y: 0, k: 0, arc: 0, sag: 0, out: false, bob: 0, dip: 0, tense: 0 };
        w.SURF = G + 12;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const B = w.B, tip = { x: w.hero.x + 70, y: G - 150 };
        Object.assign(B, { x0: tip.x, y0: tip.y, x1: 420, y1: w.SURF, k: 0, out: true, dip: 0, tense: 0 });
        w.emit("cast", B);
        w.tween(B, { k: 1 }, 0.4, "lin", () => {
          w.emit("land", B);
          w.after(0.6, () => {
            w.emit("bite", B);
            w.after(0.5, () => {
              B.out = false; w.emit("catch", B);
              w.after(w.on("leap") ? 0.7 : 0, () => { w.caught = 1; });
              w.after(1.3, () => { w.busy = false; });
            });
          });
        });
      },
      update(w, dt) {
        const B = w.B; w.caught = Math.max(0, (w.caught || 0) - dt);
        B.x = B.x0 + (B.x1 - B.x0) * B.k;
        B.y = B.y0 + (B.y1 - B.y0) * B.k - B.arc * 4 * B.k * (1 - B.k) + (B.k >= 1 ? Math.sin(w.time * 5) * B.bob + B.dip : 0);
      },
      drawFront(w, ctx) {
        const B = w.B, h = w.hero, bend = B.tense * 0.35, tip = { x: h.x + 70 - bend * 40, y: G - 150 + bend * 30 };
        ctx.strokeStyle = "#a16207"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(h.x + 24, G - 70); ctx.quadraticCurveTo(h.x + 50, G - 120, tip.x, tip.y); ctx.stroke();
        if (w.caught > 0) {
          const sw = Math.sin(w.time * 9) * 0.25;
          ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x, tip.y + 30); ctx.stroke();
          ctx.save(); ctx.translate(tip.x, tip.y + 30); ctx.rotate(Math.PI / 2 + sw); ctx.drawImage(SPR["survival-fish"].c, -10, -22, 88, 44); ctx.restore();
        }
        if (!B.out) return;
        const jx = B.tense ? rand(-2, 2) : 0;
        ctx.strokeStyle = B.tense ? "#fde047" : "rgba(255,255,255,0.7)"; ctx.lineWidth = B.tense ? 2 : 1.2;
        ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.quadraticCurveTo((tip.x + B.x) / 2 + jx, (tip.y + B.y) / 2 + (B.tense ? 0 : B.sag), B.x, B.y); ctx.stroke();
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(B.x, B.y - 4, 7, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(B.x, B.y - 4, 7, 0, Math.PI); ctx.fill();
      },
      steps: [
        {
          id: "arc", name: { en: "Cast Arc", ko: "포물선 던지기" }, param: "arc 110 · sag 70",
          cap: { en: "Cast in an *arc*, with a sagging line.", ko: "*포물선*으로 던지고, 줄은 *축 처지게*." },
          cast(w, B) { B.arc = 110; B.sag = 70; },
        },
        {
          id: "splash", name: { en: "Splash", ko: "첨벙" }, param: "ring + 8 drops",
          cap: { en: "A *ring* and a few *drops* where it lands.", ko: "떨어진 자리에 *물결*과 *물방울*." },
          land(w, B) {
            w.spawn({ type: "ring", x: B.x, y: w.SURF, size: 6, size1: 50, life: 0.6, w: 4, flat: true, color: "186,230,253" });
            for (let i = 0; i < 8; i++) w.spawn({ type: "circle", x: B.x, y: w.SURF, vx: rand(-90, 90), vy: rand(-260, -120), g: 1200, size: 2.5, life: 0.5, color: "186,230,253", add: false });
          },
        },
        {
          id: "bob", name: { en: "Idle Bob", ko: "찌 까딱" }, param: "±3px · 5Hz",
          cap: { en: "The float *bobs*. Waiting looks alive.", ko: "찌가 *까딱까딱*. 기다림에도 움직임이." },
          land(w, B) { B.bob = 3; },
        },
        {
          id: "bite", name: { en: "The Bite", ko: "입질" }, param: "dip 14px · !",
          cap: { en: "*Yank* the float under. Pop a *!*", ko: "찌가 *쑥* 들어가요. *!* 표시." },
          bite(w, B) {
            B.dip = 14; w.after(0.12, () => { B.dip = 4; });
            txt(w, B.x, w.SURF - 60, "!", 44, "#fde047", -40);
            w.spawn({ type: "ring", x: B.x, y: w.SURF, size: 6, size1: 34, life: 0.35, w: 4, flat: true, color: "253,224,71" });
          },
        },
        {
          id: "tense", name: { en: "Line Tension", ko: "팽팽한 줄" }, param: "bend + jitter",
          cap: { en: "The rod *bends*, the line goes *tight* and shakes.", ko: "낚싯대가 *휘고*, 줄이 *팽팽하게* 떨려요." },
          bite(w, B) { B.tense = 1; w.hero.ox -= 12; w.shake(0.12); },
        },
        {
          id: "leap", name: { en: "Fish Leap", ko: "물고기 점프" }, param: "arc + spray",
          cap: { en: "The fish *leaps out* in a spray. Show the prize.", ko: "물고기가 *물보라*와 함께 튀어 올라요." },
          catch(w, B) {
            w.spawn({ type: "ghost", img: SPR["survival-fish"].c, x: B.x, y: w.SURF, w: 70, h: 35, top: true, alpha0: 1, add: false, vx: -220, vy: -620, g: 900, life: 0.9, hold: true });
            for (let i = 0; i < 14; i++) w.spawn({ type: "circle", x: B.x + rand(-10, 10), y: w.SURF, vx: rand(-200, 120), vy: rand(-420, -150), g: 1200, size: rand(2, 4), life: 0.6, color: "186,230,253", add: false });
            w.flash("186,230,253", 0.25);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whiz / plip / splash",
          cap: { en: "*Whiz* out, *plip* in, a big *splash* on the catch.", ko: "*쉬익*, *퐁*, 잡을 땐 *촤악*." },
          cast(w) { w.sfx.swish(); },
          land(w) { w.play(() => tn({ f: 900, f2: 400, dur: 0.08, vol: 0.2 })); },
          bite(w) { w.sfx.tock(); },
          catch(w) { w.play(() => nz({ dur: 0.45, f: 2500, f2: 400, vol: 0.4 })); },
        },
      ],
    },

    /* ───────── 20. 불에 굽기 ───────── */
    {
      id: "survival-cook", cat: "survival", view: "side",
      title: { en: "Make cooking look *delicious*", ko: "굽는 걸 *맛있어 보이게*" },
      intro: { en: "Raw… raw… raw… *cooked*.", ko: "날것… 날것… 날것… *익음*." },
      interval: 0.7, stepDur: 4.0,
      setup(w) { w.M = { done: 0, rot: 0, sx: 1, sy: 1, smooth: false, flick: 0 }; },
      fire(w) {
        const M = w.M;
        if (M.done >= 1) { M.done = 0; return; }
        M.done = Math.min(1, M.done + 0.2);
        w.emit("turn", M);
        if (M.done >= 1) w.emit("ready", M);
      },
      update(w, dt) { const M = w.M, k = Math.min(1, dt * 12); M.sx += (1 - M.sx) * k; M.sy += (1 - M.sy) * k; },
      drawBack(w, ctx) {
        logs(ctx, 270, G - 8);
        flame(ctx, 270, G - 10, 0.8, 1, w.time);
        ctx.strokeStyle = "#57534e"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(170, G); ctx.lineTo(190, G - 140); ctx.moveTo(370, G); ctx.lineTo(350, G - 140); ctx.stroke();
      },
      drawFront(w, ctx) {
        const M = w.M, d = M.smooth ? M.done : M.done >= 1 ? 1 : 0;
        const col = d < 0.8 ? lerpc([244, 114, 182], [146, 64, 14], d / 0.8) : lerpc([146, 64, 14], [120, 53, 15], (d - 0.8) / 0.2);
        ctx.strokeStyle = "#d6d3d1"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(160, G - 136); ctx.lineTo(380, G - 136); ctx.stroke();
        ctx.save(); ctx.translate(270, G - 136); ctx.rotate(M.rot); ctx.scale(M.sx, M.sy);
        ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.ellipse(0, 0, 62, 34, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.beginPath(); ctx.ellipse(-16, -14, 30, 8, -0.2, 0, TAU); ctx.fill();
        if (M.smooth && d > 0.4) { ctx.strokeStyle = `rgba(60,25,10,${(d - 0.4) * 1.4})`; ctx.lineWidth = 4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 22 - 10, -26); ctx.lineTo(i * 22 + 10, 26); ctx.stroke(); } }
        ctx.restore();
        meter(ctx, 200, 60, 140, 12, M.done, M.done >= 1 ? "#fbbf24" : "#fb923c");
      },
      steps: [
        {
          id: "smooth", name: { en: "Gradual Browning", ko: "서서히 익는 색" }, param: "pink › brown + grill",
          cap: { en: "Color shifts *bit by bit*. Grill marks appear.", ko: "색이 *조금씩* 변하고, *그릴 자국*이 생겨요." },
          update(w) { w.M.smooth = true; },
        },
        {
          id: "flip", name: { en: "Flip Spin", ko: "뒤집기" }, param: "π spin · squash",
          cap: { en: "Turning it *spins* with a little *squash*.", ko: "뒤집을 때 *휙* 돌고 살짝 *눌려요*." },
          turn(w, M) { w.tween(M, { rot: M.rot + Math.PI }, 0.22, "out"); M.sx = 1.15; M.sy = 0.8; },
        },
        {
          id: "drip", name: { en: "Grease Drips", ko: "기름 똑똑" }, param: "drip → flare",
          cap: { en: "*Grease drips* into the fire. It *flares*.", ko: "*기름*이 똑, 불이 *화르륵*." },
          update(w, dt) {
            if (Math.random() < dt * 4 * (0.3 + w.M.done)) {
              const x = 270 + rand(-40, 40);
              w.spawn({ type: "circle", x, y: G - 110, vy: 60, g: 900, size: 2.5, life: 0.28, color: "253,224,71", add: false });
              w.after(0.27, () => w.spawn({ type: "glow", x, y: G - 30, vy: -120, size: 18, size1: 4, life: 0.35, color: "255,160,60" }));
            }
          },
        },
        {
          id: "steam", name: { en: "Steam Wisps", ko: "김" }, param: "∝ doneness",
          cap: { en: "*Steam* rises more as it cooks.", ko: "익을수록 *김*이 더 피어나요." },
          update(w, dt) { if (Math.random() < dt * 10 * w.M.done) w.spawn({ type: "smoke", under: true, x: 270 + rand(-40, 40), y: G - 166, vx: rand(-15, 15), vy: rand(-60, -30), size: 4, size1: 20, life: 1.1, alpha: 0.55, color: "200,205,215" }); },
        },
        {
          id: "perfect", name: { en: "Perfect Moment", ko: "딱 익었을 때" }, param: "gold ring + text",
          cap: { en: "Done? A *golden ring* says *now*.", ko: "다 익으면 *금빛 고리*. *지금이에요*." },
          ready(w) {
            w.spawn({ type: "ring", x: 270, y: G - 136, size: 30, size1: 130, life: 0.5, w: 8, color: "251,191,36" });
            w.spawn({ type: "glow", x: 270, y: G - 136, size: 110, size1: 40, life: 0.5, color: "251,191,36" });
            w.spawn({ type: "text", text: "PERFECT!", x: 270, y: G - 210, vy: -30, life: 1.2, size: 32, color: "#fbbf24" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "sizzle loop + ding",
          cap: { en: "Constant *sizzle*. A little *ding* when ready.", ko: "계속 *지글지글*, 다 되면 *띵*." },
          update(w, dt) { if (Math.random() < dt * 14) w.play(() => nz({ dur: 0.04, type: "highpass", f: rand(4000, 7000), vol: 0.08 })); },
          ready(w) { w.sfx.chime(2); },
        },
      ],
    },

    /* ───────── 21. 폭풍 ───────── */
    {
      id: "survival-storm", cat: "survival", view: "side",
      title: { en: "Make a storm *crackle*", ko: "폭풍을 *번쩍 쾅*" },
      intro: { en: "Line flashes. *That* was lightning?", ko: "선 하나 번쩍. 이게 *번개*?" },
      interval: 1.8, stepDur: 4.0,
      drawFloor(w, ctx) {
        sky(ctx, w.S.dark ? "#0b1020" : "#3b4658", w.S.dark ? "#1a2233" : "#566175");
        ctx.fillStyle = w.S.dark ? "#0d121a" : "#2c3440";
        ctx.beginPath(); ctx.moveTo(-80, G); ctx.lineTo(80, G - 60); ctx.lineTo(200, G - 20); ctx.lineTo(330, G - 80); ctx.lineTo(620, G); ctx.closePath(); ctx.fill();
        soil(ctx);
        ctx.fillStyle = w.S.burn > 0 ? "#1c1917" : "#3f2a1d"; ctx.fillRect(404, G - 110, 12, 110);
        ctx.fillStyle = w.S.hit > 0 ? "#f8fafc" : w.S.burn > 0 ? "#292524" : "#14532d"; ctx.beginPath(); ctx.moveTo(370, G - 90); ctx.lineTo(410, G - 180); ctx.lineTo(450, G - 90); ctx.closePath(); ctx.fill();
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 130 });
        w.S = { dark: false, wind: 0, burn: 0 };
      },
      fire(w) {
        const b = { x: 410, top: -20, bot: G - 150 };
        w.S.hit = 0.15;
        w.emit("strike", b);
        if (!w.on("bolt")) w.spawn({ type: "crack", x: b.x, y: b.top, pts: [[0, 0], [0, b.bot - b.top]], w: 5, life: 0.3, hold: true, add: false, color: "255,255,255" });
      },
      update(w, dt) {
        const S = w.S; S.burn = Math.max(0, S.burn - dt * 0.4); S.hit = Math.max(0, (S.hit || 0) - dt);
        if (Math.random() < dt * 40) w.spawn({ type: "spark", x: rand(-40, 620) + S.wind * 0.6, y: -20, vx: -S.wind, vy: 900, size: 1.4, life: 0.4, color: "186,200,220" });
      },
      steps: [
        {
          id: "mood", name: { en: "Dark Sky + Wind", ko: "어두운 하늘과 바람" }, param: "slant 350px/s",
          cap: { en: "*Darken* the sky and slant the rain. Flash needs dark.", ko: "하늘은 *어둡게*, 비는 *비스듬히*. 번쩍이려면 어두워야 해요." },
          update(w) { w.S.dark = true; w.S.wind = 350; },
        },
        {
          id: "flash", name: { en: "Double Flash", ko: "두 번 번쩍" }, param: ".7 → .4 · 80ms gap",
          cap: { en: "Real lightning flashes *twice*.", ko: "진짜 번개는 *두 번* 번쩍여요." },
          strike(w) { w.flash("230,240,255", 0.5); w.after(0.09, () => w.flash("230,240,255", 0.3)); },
        },
        {
          id: "bolt", name: { en: "Jagged Bolt", ko: "갈라지는 번개" }, param: "12 segs + 2 forks",
          cap: { en: "A *jagged* bolt with *forks*. Glow around it.", ko: "*지그재그*에 *가지*까지. 주위엔 빛 번짐." },
          strike(w, b) {
            const pts = [[0, 0]]; for (let i = 1; i <= 12; i++) pts.push([rand(-22, 22), (b.bot - b.top) * i / 12]);
            pts[12][0] = 0;
            w.spawn({ type: "crack", x: b.x, y: b.top, pts, w: 5, life: 0.22, color: "230,240,255", add: true, hold: true });
            for (const k of [4, 7]) { const p = pts[k], f = [[p[0], p[1]], [p[0] + rand(30, 60) * (k % 2 ? 1 : -1), p[1] + 40], [p[0] + rand(50, 90) * (k % 2 ? 1 : -1), p[1] + 70]]; w.spawn({ type: "crack", x: b.x, y: b.top, pts: f, w: 2.5, life: 0.18, color: "196,210,255", add: true }); }
            w.spawn({ type: "glow", x: b.x, y: b.bot, size: 140, size1: 60, life: 0.3, color: "180,200,255" });
          },
        },
        {
          id: "impact", name: { en: "Scorched Tree", ko: "그을린 나무" }, param: "sparks + burn 2.5s",
          cap: { en: "It *hits something*. Sparks, smoke, a *burnt tree*.", ko: "어딘가 *맞아요*. 불꽃, 연기, *탄 나무*." },
          strike(w, b) {
            w.S.burn = 1;
            sparks(w, b.x, b.bot, 16, "255,230,180", [200, 600]);
            for (let i = 0; i < 6; i++) w.spawn({ type: "smoke", under: true, x: b.x + rand(-20, 20), y: b.bot + rand(0, 40), vx: rand(-30, 30), vy: rand(-60, -20), size: 8, size1: 30, life: 1.5, color: "60,60,70" });
            for (let i = 0; i < 10; i++) w.spawn({ type: "glow", x: b.x + rand(-30, 30), y: b.bot + rand(0, 90), vx: rand(-20, 20), vy: rand(-50, -15), size: rand(3, 5), life: rand(1.2, 2), color: "255,150,60" });
          },
        },
        {
          id: "thunder", name: { en: "Delayed Thunder", ko: "늦게 오는 천둥" }, param: "+350ms · trauma .5",
          cap: { en: "*Flash first*, then the shake. Like real thunder.", ko: "*빛 먼저*, 흔들림은 나중에. 진짜처럼." },
          strike(w) { w.after(0.35, () => { w.shake(0.5); w.emit("rumble"); }); },
        },
        {
          id: "splash", name: { en: "Rain Splashes", ko: "빗방울 튐" }, param: "~30 / sec",
          cap: { en: "Rain *splashes* on the ground. Heavy rain.", ko: "땅에서 *빗방울이 튀어요*. 세찬 비." },
          update(w, dt) { if (Math.random() < dt * 30) { const x = rand(20, 520); for (let i = 0; i < 2; i++) w.spawn({ type: "circle", x, y: G - 1, vx: rand(-60, 60), vy: rand(-120, -60), g: 800, size: 1.6, life: 0.2, color: "186,200,220", add: false }); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack → rumble",
          cap: { en: "A sharp *crack*, then a long low *rumble*.", ko: "날카로운 *쩍*, 이어서 긴 *우르릉*." },
          strike(w) { w.play(() => nz({ dur: 0.15, type: "highpass", f: 2000, vol: 0.5 })); },
          rumble(w) { w.play(() => { nz({ dur: 1.6, f: 300, f2: 60, vol: 0.6 }); tn({ f: 50, f2: 30, dur: 1.2, vol: 0.4 }); }); },
        },
      ],
    },

    /* ───────── 22. 쉼터의 안도감 ───────── */
    {
      id: "survival-shelter", cat: "survival", view: "side",
      title: { en: "Make shelter feel *safe*", ko: "쉼터를 *안심되게*" },
      intro: { en: "Inside or outside? *Same thing.*", ko: "안이든 밖이든 *똑같아요*." },
      interval: 1.9, stepDur: 4.2,
      drawFloor(w, ctx) {
        sky(ctx, "#1e2635", "#2b3546"); soil(ctx);
      },
      setup(w) {
        w.hero = w.actor("hero", { home: 110 });
        w.Sh = { k: 0, cold: 0, lamp: 0, inside: false };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const Sh = w.Sh, h = w.hero, goIn = !Sh.inside;
        w.tween(h, { x: goIn ? 420 : 110 }, 0.5, "inout", () => { Sh.inside = goIn; if (goIn) w.emit("inside", h); w.busy = false; });
        w.tween(Sh, { k: goIn ? 1 : 0 }, 0.5, "inout");
      },
      update(w, dt) {
        if (Math.random() < dt * 45) { const x = rand(-40, 600); if (x < 335 || x > 515) w.spawn({ type: "spark", x: x + 60, y: -20, vx: -120, vy: 900, size: 1.4, life: 0.38, color: "170,190,215" }); }
      },
      drawBack(w, ctx) {
        ctx.fillStyle = "#3b2a20"; ctx.fillRect(340, G - 140, 10, 140); ctx.fillRect(500, G - 140, 10, 140);
        ctx.fillStyle = "#5b3b25"; ctx.beginPath(); ctx.moveTo(320, G - 136); ctx.lineTo(425, G - 200); ctx.lineTo(530, G - 136); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#2a1d14"; ctx.fillRect(350, G - 136, 150, 136);
        ctx.fillStyle = "#facc15"; ctx.fillRect(452, G - 120, 10, 14);
      },
      drawFront(w, ctx) {
        const Sh = w.Sh;
        if (Sh.cold > 0) { ctx.fillStyle = `rgba(56,120,220,${Sh.cold * 0.28})`; ctx.fillRect(-80, -80, 700, 520); }
        if (Sh.lamp > 0) { shade(ctx, 0.55, [{ x: 457, y: G - 110, r: 170 * Sh.lamp + 20, hard: 0.5 }]); ctx.globalCompositeOperation = "lighter"; glow(ctx, 457, G - 110, 120, "253,186,116", 0.45); ctx.globalCompositeOperation = "source-over"; }
      },
      steps: [
        {
          id: "cold", name: { en: "Cold Outside", ko: "바깥은 차갑게" }, param: "blue .28 × outside",
          cap: { en: "Outside is *cold blue*. It fades as you step in.", ko: "바깥은 *차가운 파랑*. 들어가면 걷혀요." },
          update(w) { w.Sh.cold = 1 - w.Sh.k; },
        },
        {
          id: "lamp", name: { en: "Warm Lamp", ko: "따뜻한 등불" }, param: "dark .55 · warm r170",
          cap: { en: "A *warm lamp* inside. Light means safety.", ko: "안에는 *따뜻한 등불*. 빛은 곧 안전이에요." },
          update(w) { w.Sh.lamp = 0.5 + 0.5 * w.Sh.k; },
        },
        {
          id: "drips", name: { en: "Roof Drips", ko: "처마 물방울" }, param: "edge drips",
          cap: { en: "Rain *drips off the roof edge*. You're under cover.", ko: "*처마 끝*에서 빗물이 똑똑. 지붕 아래예요." },
          update(w, dt) { if (Math.random() < dt * 8) w.spawn({ type: "circle", x: pick([322, 528]), y: G - 134, vy: 40, g: 1200, size: 2.4, life: 0.4, color: "170,190,215", add: false }); },
        },
        {
          id: "badge", name: { en: "SAFE Badge", ko: "SAFE 표시" }, param: "ring + text",
          cap: { en: "Tell them clearly: *SAFE*.", ko: "분명하게: *SAFE*." },
          inside(w, h) {
            w.spawn({ type: "ring", x: h.x, y: G, size: 10, size1: 90, life: 0.6, w: 6, flat: true, color: "198,244,50" });
            w.spawn({ type: "text", text: "SAFE", x: h.x, y: G - 170, vy: -30, life: 1.2, size: 28, color: "#c6f432" });
          },
        },
        {
          id: "relax", name: { en: "Shoulders Drop", ko: "어깨가 풀림" }, param: "squash + steam",
          cap: { en: "The body *relaxes*. Wet clothes start to *steam*.", ko: "몸이 *풀리고*, 젖은 옷에서 *김*이 나요." },
          inside(w, h) { h.sy = 0.88; h.sx = 1.08; },
          update(w, dt) { if (w.Sh.inside && Math.random() < dt * 6) w.spawn({ type: "smoke", under: true, x: w.hero.x + rand(-30, 30), y: G - rand(40, 130), vy: -40, size: 3, size1: 14, life: 0.9, alpha: 0.5, color: "190,195,205" }); },
        },
        {
          id: "regen", name: { en: "Rest Regen", ko: "쉬면 회복" }, param: "+ crosses",
          cap: { en: "Floating *+ signs*: resting heals you.", ko: "*+ 표시*가 둥실. 쉬면 회복돼요." },
          update(w, dt) { if (w.Sh.inside && Math.random() < dt * 3) w.spawn({ type: "text", text: "+", x: w.hero.x + rand(-40, 40), y: G - rand(60, 140), vy: -50, life: 0.9, size: 22, color: "#4ade80" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rain dulls inside",
          cap: { en: "Rain *dulls* inside. A soft *chime* on entry.", ko: "안에선 빗소리가 *먹먹*. 들어갈 때 *띵*." },
          update(w, dt) { if (Math.random() < dt * 6) w.play(() => nz({ dur: 0.3, type: w.Sh.inside ? "lowpass" : "highpass", f: w.Sh.inside ? 500 : 2500, vol: w.Sh.inside ? 0.06 : 0.12 })); },
          inside(w) { w.sfx.chime(0); },
        },
      ],
    },

    /* ───────── 23. 먼 울음소리 경고 ───────── */
    {
      id: "survival-howl", cat: "survival", view: "side",
      title: { en: "Make a distant howl *a warning*", ko: "먼 울음소리를 *경고*로" },
      intro: { en: "Something howled. *Where?*", ko: "뭔가 울었는데… *어디서?*" },
      interval: 2.2, stepDur: 4.2,
      drawFloor(w, ctx) {
        sky(ctx, "#070a16", "#1a1f38");
        const H = w.Hw;
        ctx.globalCompositeOperation = "lighter"; glow(ctx, 260, 80, 50 + H.moon * 60, "226,232,240", 0.25 + H.moon * 0.35); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(260, 80, 22, 0, TAU); ctx.fill();
        ctx.fillStyle = "#0b0f1c"; ctx.beginPath(); ctx.moveTo(250, G); ctx.quadraticCurveTo(420, G - 110, 620, G - 90); ctx.lineTo(620, G); ctx.closePath(); ctx.fill();
        soil(ctx);
      },
      setup(w) {
        ensure();
        w.hero = w.actor("hero", { home: 140 });
        w.Hw = { rot: 0, moon: 0, pack: 0, arrow: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const Hw = w.Hw;
        Hw.rot = -0.5;
        w.emit("howl", { x: 395, y: G - 135 });
        w.after(1.0, () => { Hw.rot = 0; w.busy = false; });
      },
      update(w, dt) { const Hw = w.Hw; Hw.arrow = Math.max(0, Hw.arrow - dt * 0.8); Hw.moon = Math.max(0, Hw.moon - dt * 0.6); },
      drawBack(w, ctx) {
        const Hw = w.Hw, c = SPR["survival-wolf"].c;
        const wolf = (x, y, s, a, r = 0) => { ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(-s, s); ctx.rotate(r); ctx.drawImage(c, -65, -76, 130, 78); ctx.restore(); };
        if (Hw.pack > 0) { wolf(360, G - 58, 0.7, Hw.pack); wolf(470, G - 92, 0.75, Hw.pack); }
        wolf(440, G - 80, 1, 1, Hw.rot);
      },
      drawHud(w, ctx) {
        const a = w.Hw.arrow;
        if (a <= 0) return;
        const p = 1 + 0.2 * Math.sin(w.time * 14);
        ctx.save(); ctx.translate(500, 170); ctx.scale(p, p); ctx.fillStyle = `rgba(239,68,68,${a})`;
        ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -18); ctx.lineTo(-10, 18); ctx.closePath(); ctx.fill(); ctx.restore();
      },
      steps: [
        {
          id: "waves", name: { en: "Sound Waves", ko: "소리 물결" }, param: "4 rings · 150ms",
          cap: { en: "*Draw the howl*. Rings roll out from the source.", ko: "*울음을 그려요*. 소리가 퍼져 나와요." },
          howl(w, s) { for (let i = 0; i < 4; i++) w.after(i * 0.15, () => w.spawn({ type: "ring", x: s.x, y: s.y, size: 12, size1: 140, life: 0.9, w: 6, color: "203,213,225" })); },
        },
        {
          id: "arrow", name: { en: "Direction Arrow", ko: "방향 화살표" }, param: "edge · 1.2s",
          cap: { en: "A red *arrow* at the edge: *that way*.", ko: "가장자리에 빨간 *화살표*. *저쪽*이에요." },
          howl(w) { w.Hw.arrow = 1; },
        },
        {
          id: "alert", name: { en: "Hero Alert", ko: "주인공 경계" }, param: "! + flinch",
          cap: { en: "The hero *flinches*. A *!* pops overhead.", ko: "주인공이 *움찔*, 머리 위에 *!*." },
          howl(w) { const h = w.hero; h.sx = 0.86; h.sy = 1.1; h.ox -= 10; txt(w, h.x, G - 170, "!", 44, "#fbbf24", -40); },
        },
        {
          id: "moon", name: { en: "Moon Flare", ko: "달빛 번짐" }, param: "glow +60px",
          cap: { en: "The *moon flares*. The night feels watchful.", ko: "*달빛*이 번져요. 밤이 지켜보는 느낌." },
          howl(w) { w.Hw.moon = 1; },
        },
        {
          id: "pack", name: { en: "Pack Reveal", ko: "무리 드러남" }, param: "+2 silhouettes",
          cap: { en: "It's *not alone*. More shapes fade in.", ko: "*혼자가 아니에요*. 그림자가 더 나타나요." },
          howl(w) { w.Hw.pack = 0; w.tween(w.Hw, { pack: 1 }, 0.5, "out"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "glide 300 → 600 → 250",
          cap: { en: "A long *howl* that rises and falls.", ko: "길게 올라갔다 내려오는 *아우우*." },
          howl(w) { w.play(() => { tn({ type: "sine", f: 300, f2: 620, dur: 0.5, vol: 0.25 }); tn({ type: "sine", f: 620, f2: 260, dur: 0.9, vol: 0.22, delay: 0.5 }); }); },
        },
      ],
    },

    /* ───────── 24. 무거운 가방 ───────── */
    {
      id: "survival-overweight", cat: "survival", view: "side",
      title: { en: "Make a heavy bag *feel* heavy", ko: "무거운 가방이 *무겁게*" },
      intro: { en: "120% weight. Walks like *nothing*.", ko: "무게 120%인데 *가뿐하게* 걸어요." },
      interval: 0.55, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 250 });
        w.Wt = { v: 30, pile: [], over: false, col: "#cbd5e1" };
        w.phase = 0;
      },
      fire(w) {
        const Wt = w.Wt;
        if (Wt.v >= 120) { Wt.v = 30; Wt.pile = []; Wt.over = false; return; }
        Wt.v += 15;
        const it = { c: pick(["#a16207", "#475569", "#7c2d12", "#3f6212"]), wd: rand(36, 50), h: rand(16, 24) };
        w.emit("add", it, Wt);
        if (Wt.v >= 100 && !Wt.over) { Wt.over = true; w.emit("over", Wt); }
      },
      update(w, dt) {
        const Wt = w.Wt, h = w.hero, slow = Wt.slow ? Math.max(0.35, 1.2 - Wt.v / 100) : 1;
        const prev = Math.sin(w.phase); w.phase += dt * 9 * slow;
        h.oy = -Math.abs(Math.sin(w.phase)) * 6;
        if (prev < 0 !== Math.sin(w.phase) < 0) w.emit("stepped", Wt);
      },
      drawBack(w, ctx) {
        const h = w.hero; let y = G - 118 + h.oy;
        rr(ctx, h.x - 74, y, 40, 60, 8, "#57534e", "rgba(0,0,0,0.3)", 2);
        for (const it of w.Wt.pile) { y -= it.h; rr(ctx, h.x - 54 - it.wd / 2, y, it.wd, it.h, 4, it.c, "rgba(0,0,0,0.35)", 2); }
      },
      drawHud(w, ctx) {
        const Wt = w.Wt;
        meter(ctx, 170, 60, 200, 20, Wt.v / 120, Wt.col);
        ctx.fillStyle = "#fff"; ctx.fillRect(170 + 200 * 100 / 120, 52, 3, 36);
        label(ctx, `${Wt.v} / 100 kg`, 270, 104, 18, "rgba(255,255,255,0.85)");
      },
      steps: [
        {
          id: "pile", name: { en: "Visible Pile", ko: "보이는 짐더미" }, param: "1 box / item",
          cap: { en: "Every item *stacks* on the back. You see the load.", ko: "주운 만큼 등에 *쌓여요*. 짐이 보여요." },
          add(w, it, Wt) { Wt.pile.push(it); },
        },
        {
          id: "squat", name: { en: "Weight Squash", ko: "눌리는 몸" }, param: "sy 1 → .85",
          cap: { en: "The heavier, the more the body *squashes*.", ko: "무거울수록 몸이 *눌려요*." },
          update(w) { const h = w.hero; h.sy = 1 - Math.min(1.2, w.Wt.v / 100) * 0.13; h.sx = 2 - h.sy; },
        },
        {
          id: "slow", name: { en: "Slow Trudge", ko: "느려진 걸음" }, param: "step rate ×0.35",
          cap: { en: "Steps get *slower*. Weight steals speed.", ko: "걸음이 *느려져요*. 무게가 속도를 뺏어요." },
          update(w) { w.Wt.slow = true; },
        },
        {
          id: "warn", name: { en: "Over-limit Alert", ko: "초과 경고" }, param: "red + OVERWEIGHT",
          cap: { en: "Cross the line: bar turns *red*, a *warning* pops.", ko: "선을 넘으면 바가 *빨갛게*, *경고*가 떠요." },
          update(w) { w.Wt.col = w.Wt.v >= 100 ? "#ef4444" : w.Wt.v >= 80 ? "#f59e0b" : "#4ade80"; },
          over(w) { w.spawn({ type: "text", text: "OVERWEIGHT", x: 270, y: 140, vy: -20, life: 1.2, size: 30, color: "#ef4444" }); w.shake(0.2); },
        },
        {
          id: "sweat", name: { en: "Sweat Drops", ko: "땀방울" }, param: "over limit only",
          cap: { en: "Over the limit, *sweat* flies off.", ko: "넘치면 *땀*이 뚝뚝." },
          stepped(w, Wt) { if (Wt.v < 100) return; const h = w.hero; for (let i = 0; i < 2; i++) w.spawn({ type: "circle", x: h.x + rand(-10, 30), y: G - 135, vx: rand(-90, 90), vy: rand(-200, -120), g: 900, size: 3, life: 0.5, color: "125,211,252", add: false }); },
        },
        {
          id: "stomp", name: { en: "Heavy Steps", ko: "쿵쿵 걸음" }, param: "dust + kick 3px",
          cap: { en: "Each step *thumps* the ground.", ko: "걸음마다 땅이 *쿵*." },
          stepped(w, Wt) { if (Wt.v < 80) return; dirt(w, w.hero.x, G, 3, 0, "180,170,160"); w.kick(0, 3); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clunk / thud",
          cap: { en: "A *clunk* per item. Heavy *thuds* when overloaded.", ko: "넣을 때 *덜컹*, 넘치면 *쿵쿵*." },
          add(w) { w.sfx.thunk(); },
          stepped(w, Wt) { if (Wt.v >= 100) w.sfx.land(); },
        },
      ],
    },

    /* ───────── 25. 사망 화면 ───────── */
    {
      id: "survival-death", cat: "survival", view: "side",
      title: { en: "Make death feel *final*", ko: "죽음을 *묵직하게*" },
      intro: { en: "Hero gone. Text appears. *Next.*", ko: "주인공 사라짐, 글자 뜸. *다음.*" },
      interval: 3.2, stepDur: 4.4,
      setup(w) {
        w.hero = w.actor("hero", { home: 200 }); w.hero.keep = true;
        w.foe = w.actor("foe", { home: 420 });
        w.Dd = { on: 0, fade: 0, ring: 0, sp: 0, stats: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe, Dd = w.Dd;
        w.tween(f, { x: 290 }, 0.12, "in", () => {
          w.emit("die", h, Dd);
          if (!w.on("fall")) h.alpha = 0;
          Dd.on = 1;
          w.tween(f, { x: 420 }, 0.4, "inout");
        });
        w.after(2.7, () => { Object.assign(Dd, { on: 0, fade: 0, ring: 0, sp: 0, stats: 0 }); Object.assign(h, { alpha: 1, rot: 0, oy: 0 }); w.busy = false; });
      },
      drawFront(w, ctx) {
        const Dd = w.Dd;
        if (Dd.fade > 0) { ctx.fillStyle = `rgba(40,4,8,${Dd.fade * 0.65})`; ctx.fillRect(-80, -80, 700, 520); }
        if (Dd.ring > 0) shade(ctx, 0.9 * Dd.ring, [{ x: w.hero.x, y: G - 40, r: 420 - 280 * Dd.ring, hard: 0.5 }], "0,0,0");
      },
      drawHud(w, ctx) {
        const Dd = w.Dd;
        if (!Dd.on) return;
        ctx.save(); ctx.globalAlpha = Dd.title != null ? Dd.title : 1;
        ctx.font = "900 54px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${4 + Dd.sp * 14}px`;
        ctx.lineWidth = 8; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.strokeText("DEAD", 270, 130); ctx.fillStyle = "#dc2626"; ctx.fillText("DEAD", 270, 130);
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
        ctx.restore();
        if (Dd.stats > 0) { ctx.globalAlpha = Dd.stats; label(ctx, "DAY 12  ·  34 KILLS", 270, 178, 16, "#e5e7eb"); ctx.globalAlpha = 1; }
      },
      steps: [
        {
          id: "slowmo", name: { en: "Fatal Slow-mo", ko: "치명타 슬로" }, param: "0.25× · 800ms",
          cap: { en: "The killing blow plays in *slow motion*.", ko: "마지막 일격은 *느리게*." },
          die(w, h) { w.slowmo(0.25, 0.8); h.flash = 1; w.shake(0.3, -1); },
        },
        {
          id: "fall", name: { en: "Collapse", ko: "쓰러짐" }, param: "rot −90° · ease-in",
          cap: { en: "Don't delete the body. Let it *fall*.", ko: "지우지 말고 *쓰러지게*." },
          die(w, h) { w.tween(h, { rot: -1.5, oy: 24 }, 0.45, "in", () => { dirt(w, h.x, G, 10, 0, "120,90,90"); w.shake(0.2); }); },
        },
        {
          id: "fade", name: { en: "Drain to Red", ko: "핏빛으로" }, param: "red .65 · 1s",
          cap: { en: "The color *drains* into dark red.", ko: "화면이 *핏빛*으로 가라앉아요." },
          die(w) { w.tween(w.Dd, { fade: 1 }, 1.0, "out"); },
        },
        {
          id: "close", name: { en: "Closing Circle", ko: "닫히는 원" }, param: "r 420 → 140",
          cap: { en: "Darkness *closes in* on the body.", ko: "어둠이 몸 쪽으로 *좁혀 와요*." },
          die(w) { w.tween(w.Dd, { ring: 1 }, 1.1, "inout"); },
        },
        {
          id: "title", name: { en: "Slow Title", ko: "천천히 뜨는 글자" }, param: "fade 0.8s · spread",
          cap: { en: "The title *fades in slowly* and spreads out.", ko: "글자는 *천천히* 떠오르며 퍼져요." },
          die(w) { const Dd = w.Dd; Dd.title = 0; Dd.sp = 0; w.after(0.3, () => { w.tween(Dd, { title: 1 }, 0.8, "out"); w.tween(Dd, { sp: 1 }, 1.8, "out"); }); },
        },
        {
          id: "stats", name: { en: "What You Did", ko: "버틴 기록" }, param: "delay 0.9s",
          cap: { en: "Show *how far you got*. It softens the loss.", ko: "*얼마나 버텼는지* 보여줘요. 덜 허무해요." },
          die(w) { w.after(0.9, () => w.tween(w.Dd, { stats: 1 }, 0.5)); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hit + long drone",
          cap: { en: "One heavy *hit*, then a long falling *drone*.", ko: "묵직한 *퍽*, 길게 가라앉는 *우웅*." },
          die(w) { w.sfx.crit(); w.play(() => { tn({ type: "sawtooth", f: 110, f2: 40, dur: 2.2, vol: 0.12 }); tn({ f: 220, f2: 80, dur: 2, vol: 0.1 }); }); },
        },
      ],
    },

    /* ───────── 26. 부활 ───────── */
    {
      id: "survival-respawn", cat: "survival", view: "side",
      title: { en: "Make respawning feel like a *fresh start*", ko: "부활을 *새 출발*처럼" },
      intro: { en: "Pop. You're back. *Okay.*", ko: "뿅. 돌아왔어요. *그래요.*" },
      interval: 2.2, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 270 }); w.hero.alpha = 0;
        w.Rs = { black: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, d = w.on("gather") ? 0.4 : 0;
        h.alpha = 0;
        w.emit("begin", h);
        w.after(d, () => { h.alpha = 1; w.emit("spawn", h); });
        w.after(1.7, () => { h.alpha = 0; w.busy = false; });
      },
      drawBack(w, ctx) {
        ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.ellipse(270, G + 2, 70, 12, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(198,244,50,0.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(270, G + 2, 56, 9, 0, 0, TAU); ctx.stroke();
      },
      drawFront(w, ctx) { if (w.Rs.black > 0) { ctx.fillStyle = `rgba(0,0,0,${w.Rs.black})`; ctx.fillRect(-80, -80, 700, 520); } },
      steps: [
        {
          id: "fade", name: { en: "Fade from Black", ko: "검은 화면에서" }, param: "black 1 → 0 · 0.6s",
          cap: { en: "Come back *from black*. A clean break.", ko: "*까만 화면*에서 시작해요. 확실한 구분." },
          begin(w) { w.Rs.black = 1; w.tween(w.Rs, { black: 0 }, 0.6, "in"); },
        },
        {
          id: "beam", name: { en: "Light Column", ko: "빛기둥" }, param: "beam 0.9s",
          cap: { en: "A *column of light* marks the spot.", ko: "*빛기둥*이 자리를 표시해요." },
          begin(w) { w.spawn({ type: "beam", x: 270, y: G, size: 46, h: 420, life: 0.9, color: "198,244,50" }); },
        },
        {
          id: "gather", name: { en: "Particles Gather", ko: "빛이 모임" }, param: "24 seek · 400ms",
          cap: { en: "Light *gathers* first, then the body forms.", ko: "빛이 먼저 *모이고*, 몸이 생겨요." },
          begin(w) {
            for (let i = 0; i < 24; i++) { const a = rand(0, TAU), d = rand(90, 160); w.spawn({ type: "spark", seek: true, x: 270 + Math.cos(a) * d, y: G - 70 + Math.sin(a) * d, tx: 270, ty: G - 70, life: 0.4, size: 3, color: "236,252,203" }); }
          },
        },
        {
          id: "form", name: { en: "Stretch Pop", ko: "쭉 늘었다 톡" }, param: "sx .3 sy 1.6 → 1",
          cap: { en: "The body *stretches* in, then *settles*.", ko: "몸이 *쭉* 늘었다가 *톡* 자리잡아요." },
          spawn(w, h) { h.sx = 0.3; h.sy = 1.6; h.flash = 1; },
        },
        {
          id: "ring", name: { en: "Ground Ring", ko: "바닥 고리" }, param: "flat ring r 130",
          cap: { en: "A *ring* pushes out along the floor.", ko: "바닥을 따라 *고리*가 퍼져요." },
          spawn(w) { w.spawn({ type: "ring", x: 270, y: G, size: 20, size1: 130, life: 0.6, w: 8, flat: true, color: "198,244,50" }); sparks(w, 270, G - 10, 12, "236,252,203", [150, 400], Math.PI, TAU); },
        },
        {
          id: "shield", name: { en: "Spawn Shield", ko: "부활 보호막" }, param: "blink 1.2s + bubble",
          cap: { en: "*Blink* and a *bubble*: you're safe for a moment.", ko: "*깜빡*과 *보호막*. 잠깐은 안전해요." },
          spawn(w, h) { h.blink = 1.2; w.spawn({ type: "glow", under: true, x: 270, y: G - 70, size: 110, life: 1.2, alpha: 0.6, color: "125,211,252", hold: true }); w.spawn({ type: "ring", x: 270, y: G - 70, size: 90, life: 1.2, w: 4, color: "186,230,253", hold: true }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising arpeggio",
          cap: { en: "A *rising* sparkle of notes.", ko: "*올라가는* 반짝 소리." },
          begin(w) { w.sfx.charge(); },
          spawn(w) { w.sfx.fanfare(); },
        },
      ],
    },

    /* ───────── 27. 보급 상자 열기 ───────── */
    {
      id: "survival-lootcrate", cat: "survival", view: "side",
      title: { en: "Make a supply crate *burst open*", ko: "보급 상자를 *팍* 열기" },
      intro: { en: "Lid gone. Three icons. *Fine.*", ko: "뚜껑 사라짐. 아이콘 셋. *끝.*" },
      interval: 2.4, stepDur: 4.2,
      setup(w) {
        ensure();
        w.K = { jit: 0, lid: true, items: [], sx: 1, sy: 1 };
      },
      fire(w) {
        const K = w.K, id = (K.id = (K.id || 0) + 1);
        K.lid = true; K.items = [];
        const open = () => {
          if (K.id !== id) return;
          K.lid = false; K.jit = 0;
          K.items = ["ammo", "can", "gem"].map((k, i) => ({ k, i, x: 210 + i * 60, y: G - 150, sc: 1, rare: k === "gem" }));
          w.emit("open", K);
        };
        if (w.on("pry")) { w.emit("pry", K); w.after(0.35, open); } else open();
        w.after(1.8, () => { if (K.id === id) { K.lid = true; K.items = []; } });
      },
      update(w, dt) { const K = w.K, k = Math.min(1, dt * 12); K.sx += (1 - K.sx) * k; K.sy += (1 - K.sy) * k; },
      drawBack(w, ctx) {
        const K = w.K, j = K.jit ? rand(-1, 1) * K.jit : 0;
        ctx.save(); ctx.translate(270 + j, G); ctx.rotate(j * 0.01); ctx.scale(K.sx, K.sy);
        sprIn(ctx, "survival-crate", 0, 0, 150, 124);
        if (K.lid) sprIn(ctx, "survival-lid", 0, -96, 150, 53);
        ctx.restore();
      },
      drawFront(w, ctx) {
        for (const it of w.K.items) {
          if (it.beam) { ctx.globalCompositeOperation = "lighter"; glow(ctx, it.x, it.y, 56, "251,191,36", 0.9); ctx.globalCompositeOperation = "source-over"; }
          icon(ctx, it.k, it.x, it.y, 1.7 * it.sc);
        }
      },
      steps: [
        {
          id: "pry", name: { en: "Pry Rattle", ko: "덜컹덜컹" }, param: "jitter 0 → 6px · 0.35s",
          cap: { en: "It *rattles harder* before it gives.", ko: "열리기 전에 *덜컹덜컹*, 점점 세게." },
          pry(w, K) { K.jit = 0; w.tween(K, { jit: 6 }, 0.35, "in"); },
        },
        {
          id: "lid", name: { en: "Lid Launch", ko: "뚜껑 날아감" }, param: "spin + bounce",
          cap: { en: "The lid *launches*, spins, and *bounces* away.", ko: "뚜껑이 *팍* 날아가 *통통* 굴러요." },
          open(w, K) {
            w.spawn({ type: "ghost", img: SPR["survival-lid"].c, x: 270, y: G - 96, w: 150, h: 53, top: true, alpha0: 1, add: false, vx: 260, vy: -700, g: 1700, vr: 9, ground: true, gy: G - 10, bounce: 0.3, life: 1.6, hold: true });
            K.sx = 1.12; K.sy = 0.88;
          },
        },
        {
          id: "dust", name: { en: "Dust Burst", ko: "먼지 펑" }, param: "12 puffs",
          cap: { en: "Old crate? A *puff of dust* bursts out.", ko: "오래된 상자라 *먼지가 펑*." },
          open(w) {
            for (let i = 0; i < 14; i++) w.spawn({ type: "smoke", under: true, x: 270 + rand(-60, 60), y: G - 100, vx: rand(-200, 200), vy: rand(-160, -20), drag: 3, size: 8, size1: 28, life: 0.9, alpha: 0.7, color: "140,120,95" });
            w.spawn({ type: "ring", x: 270, y: G - 100, size: 30, size1: 150, life: 0.4, w: 8, color: "255,230,170" });
          },
        },
        {
          id: "fan", name: { en: "Fan Out", ko: "부채꼴로 착착" }, param: "stagger 90ms · back",
          cap: { en: "Items *fan out* one by one, not all at once.", ko: "아이템이 *하나씩* 부채꼴로 착착." },
          open(w, K) {
            K.items.forEach(it => {
              const a = -Math.PI / 2 + (it.i - 1) * 0.6, tx = 270 + Math.cos(a) * 120, ty = G - 110 + Math.sin(a) * 90;
              it.x = 270; it.y = G - 100; it.sc = 0;
              w.after(it.i * 0.09, () => w.tween(it, { x: tx, y: ty, sc: 1 }, 0.35, "back"));
            });
          },
        },
        {
          id: "rare", name: { en: "Rare Beam", ko: "희귀 빛기둥" }, param: "gold beam + glow",
          cap: { en: "The *rare* one gets a *golden beam*.", ko: "*희귀템*에는 *금빛 기둥*." },
          open(w, K) { const it = K.items.find(i => i.rare); it.beam = true; w.after(0.3, () => w.spawn({ type: "beam", x: it.x, y: it.y + 30, size: 28, h: 330, life: 1.0, color: "251,191,36" })); },
        },
        {
          id: "counts", name: { en: "Amount Tags", ko: "수량 표시" }, param: "x30 · x2 · x1",
          cap: { en: "Tag each with *how many*. Numbers feel generous.", ko: "*몇 개*인지 붙여요. 숫자가 넉넉해 보여요." },
          open(w, K) {
            const items = K.items;
            ["x30", "x2", "x1"].forEach((t, i) => w.after(0.45 + i * 0.09, () => txt(w, items[i].x, items[i].y + 40, t, 20, i === 2 ? "#fbbf24" : "#fff", -10)));
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rattle / crack / pops",
          cap: { en: "*Rattle*, a wood *crack*, then quick *pops*.", ko: "*덜컹*, 나무 *빠각*, 이어서 *톡톡톡*." },
          pry(w) { w.sfx.rattle(); },
          open(w) { w.sfx.thunk(); w.play(() => nz({ dur: 0.1, type: "bandpass", f: 1500, q: 1, vol: 0.5 })); [0, 1, 2].forEach(i => w.after(i * 0.09, () => w.sfx.blip(i * 3))); },
        },
      ],
    },

    /* ───────── 28. 기지 습격 경보 ───────── */
    {
      id: "survival-raid", cat: "survival", view: "side",
      title: { en: "Make a base raid *alarming*", ko: "기지 습격을 *다급하게*" },
      intro: { en: "Base under attack. Nobody *noticed*.", ko: "기지가 공격받는데 *아무도 몰라요*." },
      interval: 1.1, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 120 });
        w.foe = w.actor("foe", { home: 450 });
        w.A = { t: 0, ban: -1, wall: 100, wsh: 0, arrow: 0 };
      },
      fire(w) {
        const f = w.foe, A = w.A;
        w.tween(f, { x: 400 }, 0.1, "in", () => {
          A.wall = A.wall <= 10 ? 100 : A.wall - 10; A.wsh = Math.max(A.wsh, 0.5);
          w.emit("hit", { x: 340, y: G - 70 }, A);
          w.tween(f, { x: 450 }, 0.3, "out");
        });
        if (A.t <= 0) w.emit("alarm", A);
        A.t = 2;
      },
      update(w, dt) { const A = w.A; A.t = Math.max(0, A.t - dt); A.wsh = Math.max(0, A.wsh - dt * 4); A.arrow = Math.max(0, A.arrow - dt * 0.5); },
      drawBack(w, ctx) {
        const A = w.A, j = A.wsh * rand(-4, 4);
        ctx.save(); ctx.translate(j, 0);
        for (let i = 0; i < 4; i++) { rr(ctx, 300 + i * 12, G - 150, 12, 150, 3, "#78350f", "rgba(0,0,0,0.35)", 2); ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.moveTo(300 + i * 12, G - 150); ctx.lineTo(306 + i * 12, G - 162); ctx.lineTo(312 + i * 12, G - 150); ctx.fill(); }
        rr(ctx, 312, G - 182, 24, 18, 4, A.lamp && A.t > 0 && Math.sin(w.time * 16) > 0 ? "#ef4444" : "#7f1d1d", null);
        ctx.restore();
        meter(ctx, 280, G - 210, 90, 8, A.wall / 100, "#fbbf24");
      },
      drawHud(w, ctx) {
        const A = w.A;
        if (A.ban > -1 && A.ban < 1) {
          const x = -260 + E.out(Math.min(1, A.ban * 3)) * 530 + (A.ban > 0.75 ? (A.ban - 0.75) * 2400 : 0);
          rr(ctx, x - 150, 52, 300, 50, 6, "rgba(220,38,38,0.92)", null);
          label(ctx, "RAID INCOMING", x, 78, 26, "#fff");
        }
        if (A.arrow > 0) {
          const p = 1 + 0.25 * Math.sin(w.time * 14);
          ctx.save(); ctx.translate(504, 190); ctx.scale(p, p); ctx.fillStyle = `rgba(239,68,68,${Math.min(1, A.arrow * 1.5)})`;
          ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -16); ctx.lineTo(-10, 16); ctx.closePath(); ctx.fill(); ctx.restore();
        }
      },
      steps: [
        {
          id: "siren", name: { en: "Siren Lamp", ko: "경광등" }, param: "rays · 8Hz blink",
          cap: { en: "A spinning *siren lamp* on the wall.", ko: "벽 위에서 *경광등*이 빙글빙글." },
          update(w) {
            const A = w.A; A.lamp = true;
            if (A.t > 0 && w.time > (A.rayT || 0)) { A.rayT = w.time + 0.25; w.spawn({ type: "rays", x: 324, y: G - 173, size: 170, n: 3, vr: 7, life: 0.27, color: "239,68,68", rot: w.time * 7 }); }
          },
        },
        {
          id: "pulse", name: { en: "Red Pulse", ko: "붉은 맥박" }, param: "flash .22 / 0.5s",
          cap: { en: "The *whole screen* pulses red while it lasts.", ko: "경보 동안 *화면 전체*가 붉게 쿵쿵." },
          update(w) { const A = w.A; if (A.t > 0 && w.time > (A.pT || 0)) { A.pT = w.time + 0.5; w.flash("220,38,38", 0.22); w.vignette(0.5); } },
        },
        {
          id: "banner", name: { en: "Banner Slide", ko: "알림 띠" }, param: "slide in · hold · out",
          cap: { en: "A *banner* slides in, holds, and slides out.", ko: "*알림 띠*가 쓱 들어와 머물다 나가요." },
          alarm(w, A) { A.ban = 0; w.tween(A, { ban: 1 }, 1.6, "lin", () => { A.ban = -1; }); },
        },
        {
          id: "wallhit", name: { en: "Wall Takes Hits", ko: "벽이 맞음" }, param: "shake + splinters",
          cap: { en: "The *wall shakes* and splinters on every hit.", ko: "맞을 때마다 *벽이 흔들리고* 나뭇조각이 튀어요." },
          hit(w, at, A) { A.wsh = 1; chips(w, at.x + 10, at.y, 5, ["146,64,14", "120,53,15", "217,160,90"], [-60, 260]); w.foe.flash = 0; },
        },
        {
          id: "arrow", name: { en: "Threat Arrow", ko: "위협 방향" }, param: "edge arrow",
          cap: { en: "A red *arrow* points at the attackers.", ko: "빨간 *화살표*가 적 쪽을 가리켜요." },
          hit(w, at, A) { A.arrow = 1; },
        },
        {
          id: "shake", name: { en: "Impact Shake", ko: "충격 흔들림" }, param: "trauma .25",
          cap: { en: "Each hit *shakes* the camera.", ko: "맞을 때마다 화면이 *쿵*." },
          hit(w) { w.shake(0.25, 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "two-tone siren",
          cap: { en: "A *two-tone siren*. Nobody misses that.", ko: "*삐뽀삐뽀* 두 음 사이렌. 못 들을 수가 없죠." },
          alarm(w) { for (let i = 0; i < 4; i++) w.after(i * 0.5, () => w.play(() => { tn({ type: "square", f: 880, dur: 0.24, vol: 0.08 }); tn({ type: "square", f: 660, dur: 0.24, vol: 0.08, delay: 0.25 }); })); },
          hit(w) { w.sfx.thunk(); },
        },
      ],
    },
  );
})();

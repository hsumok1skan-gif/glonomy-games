"use strict";
/* ui — 게임 UI와 보상 연출 28편 */
(() => {
  /* ───── 이 파일 전용 도우미 ───── */
  const L = (en, ko) => (typeof app !== "undefined" && app.lang === "ko" ? ko : en);
  const FONT = 'Pretendard, "Apple SD Gothic Neo", sans-serif';
  const box = (ctx, x, y, w, h, r, fill, stroke, lw = 2) => {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  const txt = (ctx, s, x, y, size, color = "#fff", align = "center", weight = 800) => {
    ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (o, k, to, dt, rate = 10) => { o[k] += (to - o[k]) * Math.min(1, dt * rate); };
  const PANEL = "#1d2029", PANEL2 = "#262a35", LINE = "rgba(255,255,255,0.12)", DIM = "#8b93a7", LIME = "#c6f432";
  // 화면을 누르는 손가락 표시 (입력 자체를 보여줌 — 효과 아님)
  const tap = (x = 270, y = 200) => ({ x, y, a: 0, p: 0 });
  const tapTick = (T, dt) => { T.p = Math.max(0, T.p - dt * 5); if (!T.hold) T.a = Math.max(0, T.a - dt * 1.6); };
  const tapAt = (T, x, y) => { T.x = x; T.y = y; T.a = 1; T.p = 1; };
  const drawTap = (ctx, T) => {
    if (T.a <= 0.01) return;
    const r = 17 - T.p * 5;
    ctx.fillStyle = `rgba(255,255,255,${0.28 * T.a + 0.25 * T.p})`; ctx.beginPath(); ctx.arc(T.x, T.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * T.a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(T.x, T.y, r + 4, 0, TAU); ctx.stroke();
  };
  const ring = (w, x, y, r0, r1, col, life = 0.35, lw = 6) => w.spawn({ type: "ring", x, y, size: r0, size1: r1, life, w: lw, color: col });
  const confetti = (w, x, y, n, sp = 420) => {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0), v = rand(sp * 0.4, sp);
      w.spawn({ type: "chunk", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, drag: 1.5, vr: rand(-14, 14), life: rand(0.8, 1.4), size: rand(4, 7), color: pick(["198,244,50", "250,204,21", "56,189,248", "244,114,182", "255,255,255"]) });
    }
  };
  const later = (w, i, gap, fn) => (i ? w.after(i * gap, fn) : fn());
  const check = (ctx, x, y, s, k, col, lw) => { // 체크 표시를 k(0..1)만큼 그림
    const p = [[-0.5, 0], [-0.15, 0.35], [0.55, -0.4]], L1 = 0.5, L2 = 1.06, d = k * (L1 + L2);
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x + p[0][0] * s, y + p[0][1] * s);
    if (d <= L1) { const t = d / L1; ctx.lineTo(x + lerp(p[0][0], p[1][0], t) * s, y + lerp(p[0][1], p[1][1], t) * s); }
    else { const t = (d - L1) / L2; ctx.lineTo(x + p[1][0] * s, y + p[1][1] * s); ctx.lineTo(x + lerp(p[1][0], p[2][0], t) * s, y + lerp(p[1][1], p[2][1], t) * s); }
    ctx.stroke();
  };
  const notches = (w, a, b) => { for (let n = 0; n <= 10; n++) if ((a < n * 10) !== (b < n * 10)) w.emit("notch", w.S, n); };
  // 날아가는 아이콘 (동전·보석·점·아이템): 곡선을 그리며 x0,y0 → x1,y1
  const flyStart = (w, o) => { o.t = -(o.delay || 0); (w.fl = w.fl || []).push(o); };
  const flyTick = (w, dt) => {
    if (!w.fl) return;
    for (const o of w.fl) { o.t += dt; if (o.t >= o.dur && !o.end) { o.end = true; if (o.done) o.done(o); } }
    w.fl = w.fl.filter(o => !o.end);
  };
  const drawFly = (ctx, w) => {
    for (const o of w.fl || []) {
      if (o.t < 0) continue;
      const k = clamp(o.t / o.dur), e = o.ease ? E[o.ease](k) : E.inout(k);
      const x = lerp(o.x0, o.x1, e), y = lerp(o.y0, o.y1, e) - (o.arc || 0) * 4 * k * (1 - k), r = o.r || 10;
      if (o.kind === "coin") coinIcon(ctx, x, y, r);
      else if (o.kind === "gem") gemIcon(ctx, x, y, r);
      else if (o.kind === "item") { ctx.save(); ctx.translate(x, y); ctx.scale(1 - k * 0.5, 1 - k * 0.5); ctx.rotate(k * 6); swordIcon(ctx, 0, 0, r); ctx.restore(); }
      else { glow(ctx, x, y, r * 2.2, o.col || "255,255,255", 0.8); ctx.fillStyle = `rgb(${o.col || "255,255,255"})`; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill(); }
    }
  };
  const swordIcon = (ctx, x, y, r) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.moveTo(-r * 0.14, r * 0.35); ctx.lineTo(-r * 0.14, -r * 0.85); ctx.lineTo(0, -r * 1.05); ctx.lineTo(r * 0.14, -r * 0.85); ctx.lineTo(r * 0.14, r * 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.fillRect(-r * 0.45, r * 0.32, r * 0.9, r * 0.14);
    ctx.fillStyle = "#a16207"; ctx.fillRect(-r * 0.09, r * 0.46, r * 0.18, r * 0.42);
    ctx.restore();
  };
  const dailyPos = i => (i < 4 ? { x: 116 + i * 102, y: 152 } : { x: 167 + (i - 4) * 102, y: 268 });
  const dotPos = i => ({ x: 236 + i * 38, y: 240 });
  const msX = at => 80 + 3.8 * at;
  const rankY = i => 84 + i * 54;
  const starX = i => 190 + i * 80;
  // 이전 동작의 예약을 무효로: 새로 누르면 옛 타이머는 무시
  const seq = (w, o) => { const id = o.run = (o.run || 0) + 1; return (t, fn) => w.after(t, () => { if (o.run === id) fn(); }); };
  const togY = i => 110 + i * 80;
  const dragSlot = i => ({ x: 130 + (i % 4) * 94, y: 156 + Math.floor(i / 4) * 100 });
  const dragHit = (x, y) => { for (let i = 0; i < 8; i++) { const p = dragSlot(i); if (Math.abs(x - p.x) < 47 && Math.abs(y - p.y) < 50) return i; } return -1; };
  const newPos = i => ({ x: 150 + (i % 3) * 120, y: 150 + Math.floor(i / 3) * 112 });
  const RAR = ["156,163,175", "56,189,248", "192,132,252", "250,204,21"];
  const heart = (ctx, x, y, s, col) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9); ctx.fill();
  };
  const coinIcon = (ctx, x, y, r) => {
    ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.arc(x, y + r * 0.12, r, 0, TAU); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#fde68a"; ctx.lineWidth = Math.max(1.5, r * 0.15); ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.stroke();
  };
  const gemIcon = (ctx, x, y, r) => {
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.9, y - r * 0.2); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.9, y - r * 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.45, y - r * 0.2); ctx.lineTo(x - r * 0.45, y - r * 0.2); ctx.closePath(); ctx.fill();
  };

  RECIPES.push(
    /* 1 ───── 화면 전환 와이프 ───── */
    {
      id: "ui-wipe", cat: "ui", view: "ui",
      title: { en: "Hide the *screen cut*", ko: "화면 전환을 *가려요*" },
      intro: { en: "Screen A. Screen B. *Blink.*", ko: "화면이 *툭* 바뀌어요." },
      interval: 1.4, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        w.S = { scr: 0, t: -1, delay: 0, edge: false, tsc: 1, items: [0, 1, 2, 3].map(() => ({ x: 0, a: 1 })) };
        w.T = tap();
      },
      fire(w) {
        const S = w.S;
        tapAt(w.T, 400, 290);
        w.after(0.2, () => {
          S.delay = 0;
          w.emit("go", S);
          w.after(S.delay, () => { S.scr = 1 - S.scr; w.emit("reveal", S); });
        });
      },
      update(w, dt) { tapTick(w.T, dt); },
      drawFront(w, ctx) {
        const S = w.S, A = S.scr === 0;
        const bg = A ? "#1e293b" : "#14532d", hi = A ? "#38bdf8" : "#4ade80";
        box(ctx, 40, 44, 460, 290, 18, bg, LINE);
        ctx.save(); ctx.translate(270, 82); ctx.scale(S.tsc, S.tsc);
        txt(ctx, A ? L("LOBBY", "로비") : L("WORLD MAP", "월드 맵"), 0, 0, 30, "#fff");
        ctx.restore();
        S.items.forEach((it, i) => {
          ctx.globalAlpha = clamp(it.a);
          const x = 70 + i * 104 + it.x;
          box(ctx, x, 120, 88, 120, 12, A ? "#334155" : "#166534", LINE);
          ctx.fillStyle = hi; ctx.beginPath();
          if (A) ctx.arc(x + 44, 165, 22, 0, TAU); else { ctx.moveTo(x + 44, 140); ctx.lineTo(x + 68, 188); ctx.lineTo(x + 20, 188); ctx.closePath(); }
          ctx.fill();
          box(ctx, x + 14, 206, 60, 10, 5, "rgba(255,255,255,0.3)");
          ctx.globalAlpha = 1;
        });
        box(ctx, 330, 268, 140, 44, 12, hi);
        txt(ctx, A ? L("PLAY", "시작") : L("BACK", "뒤로"), 400, 290, 18, "#0b0c10");
      },
      drawHud(w, ctx) {
        const S = w.S;
        if (S.t > 0 && S.t < 1) {
          const L0 = -940 + S.t * 1660, sl = 140;
          ctx.fillStyle = "#0b0c10";
          ctx.beginPath(); ctx.moveTo(L0 + sl, 0); ctx.lineTo(L0 + 800 + sl, 0); ctx.lineTo(L0 + 800, 380); ctx.lineTo(L0, 380); ctx.closePath(); ctx.fill();
          if (S.edge) for (const [ex, wd, c] of [[L0 + 800, 26, LIME], [L0 + 836, 10, "#ffffff"], [L0 - 40, 14, LIME]]) {
            ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(ex + sl, 0); ctx.lineTo(ex + sl + wd, 0); ctx.lineTo(ex + wd, 380); ctx.lineTo(ex, 380); ctx.closePath(); ctx.fill();
          }
        }
        drawTap(ctx, w.T);
      },
      steps: [
        {
          id: "wipe", name: { en: "Cover the Cut", ko: "덮고 바꾸기" }, param: "900ms · swap at 50%",
          cap: { en: "Slide a panel over. *Swap* while it's covered.", ko: "판을 덮고, *가려진 순간* 바꿔요." },
          go(w, S) { S.t = 0; w.tween(S, { t: 1 }, 0.9, "inout"); S.delay = 0.45; },
        },
        {
          id: "edge", name: { en: "Bright Edges", ko: "밝은 테두리" }, param: "lime 26px + white",
          cap: { en: "Give the wipe a *bright edge*. Now it reads as motion.", ko: "가장자리를 *밝게*. 그래야 움직임이 읽혀요." },
          go(w, S) { S.edge = true; },
        },
        {
          id: "stagger", name: { en: "Stagger In", ko: "차례로 등장" }, param: "60ms apart",
          cap: { en: "New items slide in *one after another*.", ko: "새 화면 요소는 *하나씩* 밀려 들어와요." },
          reveal(w, S) {
            S.items.forEach((it, i) => { it.x = 140; it.a = 0; later(w, i, 0.06, () => w.tween(it, { x: 0, a: 1 }, 0.32, "back")); });
          },
        },
        {
          id: "title", name: { en: "Title Pop", ko: "제목 톡" }, param: "scale 0.4 → 1",
          cap: { en: "The *title pops* last. Eyes land there.", ko: "*제목이 톡* 튀어나와요. 눈이 거기로 가요." },
          reveal(w, S) { S.tsc = 0.4; w.tween(S, { tsc: 1 }, 0.4, "back"); },
        },
        {
          id: "punch", name: { en: "Arrival Punch", ko: "도착 반동" }, param: "zoom 6% · kick 10px",
          cap: { en: "A tiny *zoom punch* when the new screen lands.", ko: "새 화면이 닿을 때 *살짝 쿵*." },
          reveal(w) { w.zoomPunch(0.06); w.kick(-10, 0); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish + tock",
          cap: { en: "*Whoosh* on the wipe, *tock* when it lands.", ko: "덮을 때 *휙*, 닿을 때 *톡*." },
          go(w) { w.sfx.swish(); },
          reveal(w) { w.sfx.tock(); },
        },
      ],
    },

    /* 2 ───── 메뉴 열기 ───── */
    {
      id: "ui-menu", cat: "ui", view: "ui",
      title: { en: "Make menus *slide*, not blink", ko: "메뉴는 *미끄러지게*" },
      intro: { en: "Menu: *on*. Menu: *off*.", ko: "메뉴가 *켜졌다 꺼졌다*." },
      interval: 1.8, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        w.M = { open: 0, p: 0, dim: 0, icon: 0, bsc: 1, items: [0, 1, 2, 3, 4].map(() => ({ x: 0, a: 1 })) };
        w.T = tap();
      },
      fire(w) {
        const M = w.M;
        tapAt(w.T, 470, 66);
        const at = seq(w, M);
        M.open = 1; w.emit("open", M);
        at(1.1, () => { tapAt(w.T, 470, 66); M.open = 0; w.emit("close", M); });
      },
      update(w, dt) {
        const M = w.M; tapTick(w.T, dt); ease(M, "bsc", 1, dt, 12);
        if (!w.on("slide")) M.p = M.open;
        if (!w.on("morph")) M.icon = M.open;
      },
      drawFront(w, ctx) {
        // 뒤쪽 게임 화면
        box(ctx, 40, 40, 460, 296, 18, "#1e293b", LINE);
        for (let i = 0; i < 6; i++) {
          const x = 64 + (i % 3) * 140, y = 104 + Math.floor(i / 3) * 112;
          box(ctx, x, y, 124, 96, 12, "#334155");
          drawGem(ctx, i % 5, x + 62, y + 44, 22);
        }
        txt(ctx, L("STAGE SELECT", "스테이지 선택"), 70, 70, 20, "#fff", "left");
      },
      drawHud(w, ctx) {
        const M = w.M;
        if (M.dim > 0.01) { ctx.fillStyle = `rgba(0,0,0,${M.dim})`; ctx.fillRect(40, 40, 460, 296); }
        if (M.p > 0.001) {
          const x0 = 540 - 240 * M.p;
          ctx.save(); ctx.beginPath(); ctx.rect(40, 0, 460, 360); ctx.clip();
          box(ctx, x0, 40, 260, 296, 18, PANEL, LINE);
          const names = L(["Profile", "Inventory", "Shop", "Settings", "Quit"], ["프로필", "가방", "상점", "설정", "나가기"]);
          M.items.forEach((it, i) => {
            ctx.globalAlpha = clamp(it.a);
            const y = 112 + i * 44, x = x0 + 22 + it.x;
            box(ctx, x, y - 17, 196, 34, 10, PANEL2);
            ctx.fillStyle = GEM_COL[i]; ctx.fillStyle = `rgb(${GEM_COL[i]})`; ctx.beginPath(); ctx.arc(x + 20, y, 8, 0, TAU); ctx.fill();
            txt(ctx, names[i], x + 38, y, 16, "#e5e7eb", "left");
            ctx.globalAlpha = 1;
          });
          ctx.restore();
        }
        // 메뉴 버튼 (햄버거 ↔ X)
        const k = clamp(M.icon);
        ctx.save(); ctx.translate(470, 66); ctx.scale(M.bsc, M.bsc);
        box(ctx, -22, -22, 44, 44, 12, PANEL2, LINE);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.save(); ctx.translate(0, -9 * (1 - k)); ctx.rotate(k * Math.PI / 4); ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke(); ctx.restore();
        ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.save(); ctx.translate(0, 9 * (1 - k)); ctx.rotate(-k * Math.PI / 4); ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke(); ctx.restore();
        ctx.restore();
        drawTap(ctx, w.T);
      },
      steps: [
        {
          id: "slide", name: { en: "Slide In", ko: "밀려 들어오기" }, param: "350ms · back ease",
          cap: { en: "Slide it in from the edge it *belongs to*.", ko: "메뉴가 *있던 쪽*에서 밀려 나와요." },
          open(w, M) { w.tween(M, { p: 1 }, 0.35, "back"); },
          close(w, M) { w.tween(M, { p: 0 }, 0.22, "in"); },
        },
        {
          id: "dim", name: { en: "Dim Behind", ko: "뒤를 어둡게" }, param: "black 60%",
          cap: { en: "*Dim* the game behind. Focus goes to the menu.", ko: "뒤 화면을 *어둡게*. 시선이 메뉴로 가요." },
          update(w, dt) { const M = w.M; M.dim += (M.open * 0.6 - M.dim) * Math.min(1, dt * 8); },
        },
        {
          id: "stagger", name: { en: "Cascade Items", ko: "줄줄이 등장" }, param: "50ms apart",
          cap: { en: "Items follow the panel *one by one*.", ko: "항목이 판을 따라 *하나씩* 들어와요." },
          open(w, M) {
            M.items.forEach((it, i) => { it.x = 70; it.a = 0; w.after(0.08 + i * 0.05, () => w.tween(it, { x: 0, a: 1 }, 0.28, "out")); });
          },
        },
        {
          id: "morph", name: { en: "Icon Morph", ko: "아이콘 변신" }, param: "≡ → ✕ 250ms",
          cap: { en: "The ≡ *turns into* ✕. Now you know how to close it.", ko: "≡가 ✕로 *변해요*. 닫는 법이 보여요." },
          open(w, M) { w.tween(M, { icon: 1 }, 0.25, "back"); },
          close(w, M) { w.tween(M, { icon: 0 }, 0.25, "back"); },
        },
        {
          id: "press", name: { en: "Button Squish", ko: "버튼 눌림" }, param: "scale 0.75",
          cap: { en: "The button *squishes* and *ripples* under the finger.", ko: "손가락 밑에서 버튼이 *꾹*, *물결*." },
          open(w, M) { M.bsc = 0.75; ring(w, 470, 66, 18, 54, "198,244,50", 0.3, 4); },
          close(w, M) { M.bsc = 0.75; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish / tock",
          cap: { en: "*Swish* open, soft *tock* closed.", ko: "열 때 *휙*, 닫을 때 *톡*." },
          open(w) { w.sfx.swish(); },
          close(w) { w.sfx.tock(); },
        },
      ],
    },

    /* 3 ───── 탭 전환 밑줄 ───── */
    {
      id: "ui-tabs", cat: "ui", view: "ui",
      title: { en: "Let the tab *underline travel*", ko: "탭 밑줄이 *따라가게*" },
      intro: { en: "Which tab am I on? *Look closely.*", ko: "지금 어느 탭이죠? *잘 봐야* 알아요." },
      interval: 0.95, stepDur: 3.3,
      drawFloor() {},
      setup(w) {
        w.TB = { i: 0, tl: 62, tr: 158, ul: 62, ur: 158, cx: 0, ca: 1, pop: [1, 1, 1, 1], hue: "#ffffff" };
        w.T = tap();
      },
      fire(w) {
        const B = w.TB, from = B.i;
        B.i = (B.i + 1 + Math.floor(Math.random() * 3)) % 4;
        B.tl = 62 + B.i * 106; B.tr = B.tl + 96;
        tapAt(w.T, B.tl + 48, 78);
        w.emit("tab", B, Math.sign(B.i - from));
      },
      update(w, dt) {
        const B = w.TB; tapTick(w.T, dt);
        if (!w.on("slide")) { B.ul = B.tl; B.ur = B.tr; }
        B.pop.forEach((p, i) => { B.pop[i] += (1 - p) * Math.min(1, dt * 10); });
      },
      drawFront(w, ctx) {
        const B = w.TB, names = L(["Heroes", "Items", "Quests", "Shop"], ["영웅", "아이템", "퀘스트", "상점"]);
        box(ctx, 50, 44, 440, 290, 18, PANEL, LINE);
        names.forEach((n, i) => {
          const x = 110 + i * 106, on = i === B.i;
          ctx.save(); ctx.translate(x, 78); ctx.scale(B.pop[i], B.pop[i]);
          txt(ctx, n, 0, 0, 18, on ? B.hue : DIM); ctx.restore();
        });
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(62, 100, 414, 3);
        box(ctx, B.ul, 98, B.ur - B.ul, 7, 4, B.hue === "#ffffff" ? "#ffffff" : LIME);
        // 탭 내용
        ctx.save(); ctx.beginPath(); ctx.rect(56, 108, 428, 220); ctx.clip();
        ctx.globalAlpha = clamp(B.ca); ctx.translate(B.cx, 0);
        const col = GEM_COL[B.i];
        for (let r = 0; r < 3; r++) {
          box(ctx, 76, 124 + r * 64, 388, 52, 10, PANEL2);
          drawGem(ctx, B.i, 104, 150 + r * 64, 15);
          box(ctx, 132, 140 + r * 64, 150 - r * 30, 10, 5, `rgba(${col},0.8)`);
          box(ctx, 132, 156 + r * 64, 220, 8, 4, "rgba(255,255,255,0.15)");
        }
        ctx.restore();
      },
      drawHud(w, ctx) { drawTap(ctx, w.T); },
      steps: [
        {
          id: "slide", name: { en: "Slide Underline", ko: "밑줄 이동" }, param: "spring k=8",
          cap: { en: "Don't teleport the underline. *Slide* it over.", ko: "밑줄을 순간이동 말고 *미끄러지게*." },
          update(w, dt) { const B = w.TB, k = Math.min(1, dt * 8); B.ul += (B.tl - B.ul) * k; B.ur += (B.tr - B.ur) * k; },
        },
        {
          id: "stretch", name: { en: "Lead Edge First", ko: "앞쪽 먼저" }, param: "front ×2.5 faster",
          cap: { en: "The *front edge* moves first. It *stretches* like a worm.", ko: "*앞쪽 끝*이 먼저 가요. 애벌레처럼 *쭉*." },
          update(w, dt) {
            const B = w.TB, k = Math.min(1, dt * 20);
            if (B.tr > B.ur) B.ur += (B.tr - B.ur) * k; else B.ul += (B.tl - B.ul) * k;
          },
        },
        {
          id: "content", name: { en: "Content Follows", ko: "내용도 같이" }, param: "140px · 300ms",
          cap: { en: "Content slides in *from the side you tapped*.", ko: "내용도 *누른 쪽*에서 밀려 들어와요." },
          tab(w, B, dir) { B.cx = 140 * dir; B.ca = 0; w.tween(B, { cx: 0, ca: 1 }, 0.3, "out"); },
        },
        {
          id: "label", name: { en: "Active Label Pop", ko: "선택 글자 톡" }, param: "scale 1.35 · lime",
          cap: { en: "The chosen label *pops* and takes the *accent color*.", ko: "고른 탭 글자가 *톡*, *강조색*으로." },
          tab(w, B) { B.pop[B.i] = 1.35; B.hue = LIME; },
        },
        {
          id: "ripple", name: { en: "Tap Ripple", ko: "누른 자리 물결" }, param: "ring 10 → 60",
          cap: { en: "A *ripple* right where the finger landed.", ko: "손가락 닿은 *자리에 물결*." },
          tab(w, B) { ring(w, B.tl + 48, 78, 10, 60, "198,244,50", 0.35, 5); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick + swish",
          cap: { en: "A light *tick* and a soft *swish*.", ko: "가벼운 *틱*, 부드러운 *쉭*." },
          tab(w) { w.sfx.tick(); w.sfx.swish(); },
        },
      ],
    },

    /* 4 ───── 토글 스위치 ───── */
    {
      id: "ui-toggle", cat: "ui", view: "ui",
      title: { en: "Make a toggle *feel switched*", ko: "토글을 *딸깍* 넘어가게" },
      intro: { en: "On? Off? It just *swaps*.", ko: "켜졌나? 꺼졌나? 그냥 *바뀌어요*." },
      interval: 0.9, stepDur: 3.4,
      drawFloor() {},
      setup(w) {
        w.KS = [0, 1, 2].map(i => ({ i, on: false, x: 0, px: 0, v: 0, sx: 1, sy: 1, col: 0, glow: 0 }));
        w.kn = 0; w.T = tap();
      },
      fire(w) {
        const K = w.KS[w.kn % 3], y = togY(K.i);
        w.kn++;
        K.on = !K.on;
        tapAt(w.T, 380 + (K.on ? 22 : -22), y);
        w.emit("flip", K, y);
      },
      update(w, dt) {
        tapTick(w.T, dt);
        for (const K of w.KS) {
          if (!w.on("slide")) K.x = K.on ? 1 : 0;
          if (!w.on("color")) K.col = K.on ? 1 : 0;
          K.v = (K.x - K.px) / Math.max(dt, 1e-3); K.px = K.x; K.sx = K.sy = 1;
        }
      },
      drawFront(w, ctx) {
        box(ctx, 90, 50, 360, 280, 22, PANEL, LINE);
        const names = L(["Music", "Vibration", "Notifications"], ["음악", "진동", "알림"]);
        for (const K of w.KS) {
          const y = togY(K.i), cx = 380 + lerp(-26, 26, K.x);
          txt(ctx, names[K.i], 122, y, 20, "#e5e7eb", "left", 700);
          if (K.glow > 0.01) glow(ctx, 380, y, 80, "198,244,50", 0.4 * K.glow);
          box(ctx, 326, y - 28, 108, 56, 28, mixc([150, 205, 40], [60, 65, 80], K.col), "rgba(255,255,255,0.15)", 2);
          ctx.save(); ctx.translate(cx, y); ctx.scale(K.sx, K.sy);
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(0, 3, 23, 0, TAU); ctx.fill();
          ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(0, 0, 23, 0, TAU); ctx.fill();
          ctx.restore();
        }
      },
      drawHud(w, ctx) { drawTap(ctx, w.T); },
      steps: [
        {
          id: "slide", name: { en: "Knob Slides", ko: "손잡이 이동" }, param: "180ms ease-out",
          cap: { en: "The knob *travels*. Your eye follows it.", ko: "손잡이가 *건너가요*. 눈이 따라가요." },
          flip(w, K) { w.tween(K, { x: K.on ? 1 : 0 }, 0.18, "out"); },
        },
        {
          id: "stretch", name: { en: "Speed Stretch", ko: "속도만큼 늘어남" }, param: "up to 1.5×",
          cap: { en: "Fast knob? *Stretch it* along the way.", ko: "빠르게 움직이면 *쭉 늘어나요*." },
          update(w) { for (const K of w.KS) { const s = 1 + Math.min(0.5, Math.abs(K.v) * 0.07); K.sx = s; K.sy = 1 / s; } },
        },
        {
          id: "color", name: { en: "Color Follows", ko: "색이 따라옴" }, param: "blend 200ms",
          cap: { en: "Blend the track color *with* the knob, not after.", ko: "바탕색도 손잡이와 *함께* 바뀌어요." },
          flip(w, K) { w.tween(K, { col: K.on ? 1 : 0 }, 0.2, "out"); },
        },
        {
          id: "glow", name: { en: "On = Glow", ko: "켜지면 빛남" }, param: "halo 40%",
          cap: { en: "*On* should look *alive*. Add a soft glow.", ko: "*켜짐*은 *살아 있게*. 은은하게 빛나요." },
          update(w, dt) { for (const K of w.KS) K.glow += ((K.on ? 1 : 0) - K.glow) * Math.min(1, dt * 6); },
        },
        {
          id: "burst", name: { en: "Arrival Burst", ko: "도착 팡" }, param: "ring + 8 sparks",
          cap: { en: "When it lands on *ON*, a little *burst*.", ko: "*ON*에 닿는 순간 작게 *팡*." },
          flip(w, K, y) {
            if (!K.on) return;
            w.after(0.16, () => { ring(w, 406, y, 22, 64, "198,244,50", 0.35, 5); sparks(w, 406, y, 8, "236,252,203", [150, 380]); });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "on high · off low",
          cap: { en: "*Higher* click for on, *lower* for off.", ko: "켤 때 *높게*, 끌 때 *낮게* 딸깍." },
          flip(w, K) { if (K.on) w.sfx.clickUp(); else w.sfx.clickDown(); },
        },
      ],
    },

    /* 5 ───── 슬라이더 드래그 ───── */
    {
      id: "ui-slider", cat: "ui", view: "ui",
      title: { en: "Make a slider *grabbable*", ko: "슬라이더를 *잡는 맛*" },
      intro: { en: "Drag… drag… *jump* to the end.", ko: "끌었는데… 놓으면 *뚝* 이동." },
      interval: 1.05, stepDur: 3.4,
      drawFloor() {},
      setup(w) {
        w.S = { v: 30, to: 30, drag: false, sc: 1, bub: 0, ticks: Array(11).fill(0), wave: 1 };
        w.T = tap(); w.T.hold = false;
      },
      fire(w) {
        const S = w.S, T = w.T;
        S.to = S.v > 55 ? rand(5, 35) : rand(70, 100);
        T.x = 110 + S.v * 3.2; T.y = 200; T.a = 1; T.p = 1; T.hold = true;
        S.drag = true; w.emit("grab", S);
        w.tween(T, { x: 110 + S.to * 3.2 }, 0.42, "inout", () => {
          S.drag = false; T.hold = false;
          const old = S.v; S.v = S.to; notches(w, old, S.v);
          w.emit("release", S);
        });
      },
      update(w, dt) {
        const S = w.S; tapTick(w.T, dt);
        S.ticks.forEach((t, i) => { S.ticks[i] = Math.max(0, t - dt * 4); });
        ease(S, "wave", 1, dt, 8);
      },
      drawFront(w, ctx) {
        const S = w.S, hx = 110 + S.v * 3.2;
        box(ctx, 50, 90, 440, 200, 22, PANEL, LINE);
        txt(ctx, L("Music Volume", "배경음 크기"), 80, 128, 20, "#e5e7eb", "left");
        // 스피커
        ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.moveTo(400, 120); ctx.lineTo(412, 120); ctx.lineTo(424, 110); ctx.lineTo(424, 146); ctx.lineTo(412, 136); ctx.lineTo(400, 136); ctx.closePath(); ctx.fill();
        const nw = S.waveN != null ? S.waveN : 2;
        ctx.save(); ctx.translate(424, 128); ctx.scale(S.wave, S.wave);
        ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 3;
        for (let i = 0; i < nw; i++) { ctx.beginPath(); ctx.arc(0, 0, 9 + i * 8, -0.8, 0.8); ctx.stroke(); }
        ctx.restore();
        for (let n = 0; n <= 10; n++) {
          const x = 110 + n * 32, t = S.ticks[n];
          box(ctx, x - 1.5 - t * 2, 222 - t * 8, 3 + t * 4, 12 + t * 8, 2, t > 0.05 ? LIME : "rgba(255,255,255,0.25)");
        }
        box(ctx, 110, 194, 320, 12, 6, "rgba(255,255,255,0.12)");
        box(ctx, 110, 194, Math.max(12, S.v * 3.2), 12, 6, S.fillCol || "#94a3b8");
        if (S.fillCol) glow(ctx, hx, 200, 46, "198,244,50", 0.45);
        ctx.save(); ctx.translate(hx, 200); ctx.scale(S.sc, S.sc);
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.arc(0, 3, 17, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
        ctx.restore();
        if (S.bub > 0.02) {
          ctx.save(); ctx.translate(hx, 160); ctx.scale(S.bub, S.bub); ctx.globalAlpha = clamp(S.bub);
          box(ctx, -30, -20, 60, 36, 10, LIME);
          ctx.fillStyle = LIME; ctx.beginPath(); ctx.moveTo(-8, 15); ctx.lineTo(8, 15); ctx.lineTo(0, 24); ctx.closePath(); ctx.fill();
          txt(ctx, String(Math.round(S.v)), 0, -2, 20, "#0b0c10");
          ctx.restore();
        }
        txt(ctx, Math.round(S.v) + "%", 80, 262, 18, DIM, "left", 700);
      },
      drawHud(w, ctx) { drawTap(ctx, w.T); },
      steps: [
        {
          id: "follow", name: { en: "Follow the Finger", ko: "손가락 따라가기" }, param: "every frame",
          cap: { en: "The handle stays *under the finger* the whole way.", ko: "손잡이가 *손가락 밑에* 계속 붙어 있어요." },
          update(w) {
            const S = w.S; if (!S.drag) return;
            const old = S.v; S.v = clamp((w.T.x - 110) / 3.2, 0, 100); notches(w, old, S.v);
          },
        },
        {
          id: "grow", name: { en: "Grab = Grow", ko: "잡으면 커짐" }, param: "scale 1.45",
          cap: { en: "*Grow* the handle while held. It peeks out from the finger.", ko: "잡는 동안 *커져요*. 손가락에 안 가려져요." },
          grab(w, S) { w.tween(S, { sc: 1.45 }, 0.12, "out"); },
          release(w, S) { w.tween(S, { sc: 1 }, 0.3, "back"); },
        },
        {
          id: "bubble", name: { en: "Value Bubble", ko: "숫자 말풍선" }, param: "above the finger",
          cap: { en: "Show the number *above* the finger, not under it.", ko: "숫자는 손가락 *위에* 띄워요." },
          grab(w, S) { w.tween(S, { bub: 1 }, 0.18, "back"); },
          release(w, S) { w.after(0.25, () => w.tween(S, { bub: 0 }, 0.15, "in")); },
        },
        {
          id: "fill", name: { en: "Lit Fill", ko: "빛나는 채움" }, param: "lime + glow",
          cap: { en: "Color the *filled part*. The amount reads at a glance.", ko: "*채운 부분*에 색을. 양이 한눈에 보여요." },
          grab(w, S) { S.fillCol = LIME; },
        },
        {
          id: "notch", name: { en: "Notch Ticks", ko: "눈금 톡톡" }, param: "every 10%",
          cap: { en: "Each *10%* you cross, a notch *pops*.", ko: "*10%* 지날 때마다 눈금이 *톡*." },
          notch(w, S, n) { S.ticks[n] = 1; },
          update(w) { const S = w.S, n = Math.min(3, Math.ceil(S.v / 34)); if (n !== S.waveN) { S.waveN = n; S.wave = 1.3; } },
        },
        {
          id: "sound", name: { en: "Rising Ticks", ko: "올라가는 틱" }, param: "pitch = value",
          cap: { en: "Tick on every notch. *Higher value, higher pitch.*", ko: "눈금마다 틱. *값이 클수록 높은 음*." },
          notch(w, S, n) { w.sfx.blip(n + 1); },
          grab(w) { w.sfx.clickDown(); },
          release(w) { w.sfx.clickUp(); },
        },
      ],
    },

    /* 6 ───── 알림 팝업 ───── */
    {
      id: "ui-notify", cat: "ui", view: "ui",
      title: { en: "Make notifications *get noticed*", ko: "알림이 *눈에 띄게*" },
      intro: { en: "A notice appeared. *Nobody saw it.*", ko: "알림이 떴는데 *아무도 못 봤어요*." },
      interval: 1.9, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        w.N = { show: 0, p: 0, ring: 0, life: 0, strip: false, glowA: 0 };
        w.hero = w.actor("hero", { home: 150 });
      },
      fire(w) {
        const N = w.N;
        const at = seq(w, N);
        N.show = 1; N.life = 1; w.emit("show", N);
        at(1.3, () => { N.show = 0; w.emit("hide", N); });
      },
      update(w, dt) {
        const N = w.N;
        if (!w.on("slide")) N.p = N.show;
        N.ring = Math.max(0, N.ring - dt * 1.6);
        N.glowA = Math.max(0, N.glowA - dt * 1.5);
        w.hero.sy = 1 + Math.sin(w.time * 3) * 0.015;
      },
      drawBack(w, ctx) {
        box(ctx, 290, 220, 190, 22, 11, "rgba(255,255,255,0.08)");
        box(ctx, 290, 220, 190, 22, 11, "#22d3ee");
        txt(ctx, L("ENERGY 100/100", "에너지 100/100"), 385, 254, 13, "#a5f3fc", "center", 700);
      },
      drawHud(w, ctx) {
        const N = w.N; if (N.p < 0.001) return;
        const x = lerp(560, 290, N.p), y = 52;
        ctx.save();
        if (N.glowA > 0) { ctx.shadowColor = `rgba(198,244,50,${N.glowA})`; ctx.shadowBlur = 30; }
        box(ctx, x, y, 220, 76, 16, PANEL2, LINE);
        ctx.restore();
        if (N.strip) box(ctx, x, y, 8, 76, [16, 0, 0, 16], LIME);
        // 종 아이콘
        ctx.save(); ctx.translate(x + 40, y + 34); ctx.rotate(Math.sin(w.time * 34) * 0.45 * N.ring);
        ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-14, -16, 0, -16); ctx.quadraticCurveTo(14, -16, 14, 10); ctx.closePath(); ctx.fill();
        ctx.fillRect(-17, 8, 34, 5); ctx.beginPath(); ctx.arc(0, 16, 4, 0, TAU); ctx.fill();
        ctx.restore();
        txt(ctx, L("Energy is full!", "에너지가 가득 찼어요!"), x + 68, y + 28, 15, "#fff", "left");
        txt(ctx, L("Tap to play", "눌러서 플레이"), x + 68, y + 50, 12, DIM, "left", 600);
        if (N.bar) box(ctx, x + 12, y + 68, 196 * N.life, 4, 2, "rgba(198,244,50,0.8)");
      },
      steps: [
        {
          id: "slide", name: { en: "Slide In", ko: "밀려 들어오기" }, param: "350ms · overshoot",
          cap: { en: "*Movement* catches the eye. Slide it in.", ko: "*움직임*이 눈을 끌어요. 밀어 넣어요." },
          show(w, N) { w.tween(N, { p: 1 }, 0.35, "back"); },
          hide(w, N) { w.tween(N, { p: 0 }, 0.25, "in"); },
        },
        {
          id: "bell", name: { en: "Ringing Icon", ko: "흔들리는 종" }, param: "±25° · 0.6s",
          cap: { en: "The icon *rings*. Now it says *what* it is.", ko: "종이 *딸랑딸랑*. 무슨 알림인지 보여요." },
          show(w, N) { w.after(0.2, () => { N.ring = 1; ring(w, 330, 86, 16, 60, "250,204,21", 0.45, 5); }); },
        },
        {
          id: "accent", name: { en: "Accent + Glow", ko: "강조 띠와 빛" }, param: "lime strip · blur 30",
          cap: { en: "A *color strip* and a short *glow*. It stands out from the game.", ko: "*색 띠*와 짧은 *빛*. 게임 화면과 구분돼요." },
          show(w, N) { N.strip = true; N.glowA = 1; w.after(0.3, () => w.spawn({ type: "glow", x: 400, y: 90, size: 60, size1: 150, life: 0.5, color: "198,244,50" })); },
        },
        {
          id: "timer", name: { en: "Timer Bar", ko: "남은 시간 줄" }, param: "1.3s shrink",
          cap: { en: "A bar *shrinks* until it leaves. No surprise exit.", ko: "사라질 때까지 줄이 *줄어요*. 갑자기 안 꺼져요." },
          show(w, N) { N.bar = true; w.tween(N, { life: 0 }, 1.3, "lin"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "2-note chime",
          cap: { en: "Two soft *chimes*. Up, not down.", ko: "부드러운 *딩동*. 내려가지 말고 올라가게." },
          show(w) { w.sfx.chime(0); w.after(0.12, () => w.sfx.chime(5)); },
        },
      ],
    },

    /* 7 ───── 토스트 메시지 ───── */
    {
      id: "ui-toast", cat: "ui", view: "ui",
      title: { en: "Stack toasts *smoothly*", ko: "토스트를 *부드럽게* 쌓기" },
      intro: { en: "Messages *teleport* around.", ko: "메시지가 *순간이동*해요." },
      interval: 0.8, stepDur: 3.4,
      drawFloor() {},
      setup(w) { w.toasts = []; w.kind = 0; },
      fire(w) {
        const K = [["Saved", "저장했어요", "74,222,128"], ["+1 Friend", "친구 +1", "56,189,248"], ["Quest updated", "퀘스트 갱신", "250,204,21"], ["Gift received", "선물 도착", "244,114,182"]][w.kind++ % 4];
        const t = { en: K[0], ko: K[1], kc: K[2], col: "100,116,139", y: 0, dy: 0, a: 1, sc: 1, dying: false };
        w.toasts.unshift(t);
        w.emit("push", t);
        const live = w.toasts.filter(q => !q.dying);
        if (live.length > 3) { const old = live[3]; w.emit("drop", old); if (!old.dying) w.toasts.splice(w.toasts.indexOf(old), 1); }
      },
      update(w, dt) {
        let i = 0;
        for (const t of w.toasts) { if (t.dying) continue; t.slot = 296 - i * 50; if (!w.on("stack")) t.y = t.slot; i++; }
        w.toasts = w.toasts.filter(t => t.a > 0.01 || !t.dying);
      },
      drawFront(w, ctx) {
        box(ctx, 60, 44, 420, 290, 18, "#172033", LINE);
        for (let i = 0; i < 4; i++) box(ctx, 90 + i * 92, 74, 76, 76, 14, "#25304a");
      },
      drawHud(w, ctx) {
        for (const t of w.toasts) {
          ctx.save(); ctx.globalAlpha = clamp(t.a); ctx.translate(270, t.y + t.dy); ctx.scale(t.sc, t.sc);
          box(ctx, -120, -20, 240, 40, 20, "rgba(30,34,44,0.95)", LINE);
          ctx.fillStyle = `rgb(${t.col})`; ctx.beginPath(); ctx.arc(-96, 0, 10, 0, TAU); ctx.fill();
          txt(ctx, L(t.en, t.ko), -78, 1, 16, "#f1f5f9", "left", 700);
          ctx.restore();
        }
      },
      steps: [
        {
          id: "rise", name: { en: "Rise In", ko: "올라오며 등장" }, param: "+40px · fade 250ms",
          cap: { en: "New toast *rises and fades in* from below.", ko: "새 메시지는 아래에서 *스르륵* 올라와요." },
          push(w, t) { t.dy = 40; t.a = 0; w.tween(t, { dy: 0, a: 1 }, 0.25, "out"); },
        },
        {
          id: "stack", name: { en: "Push the Stack", ko: "밀어 올리기" }, param: "spring k=12",
          cap: { en: "Older toasts *slide up* to make room.", ko: "먼저 온 메시지는 *밀려 올라가요*." },
          update(w, dt) { for (const t of w.toasts) if (!t.dying) t.y += (t.slot - t.y) * Math.min(1, dt * 12); },
          push(w, t) { t.y = t.slot = 296; },
        },
        {
          id: "pop", name: { en: "Little Pop", ko: "작게 톡" }, param: "scale 0.7 → 1",
          cap: { en: "A tiny *pop* on arrival. Not too much.", ko: "들어올 때 *살짝 톡*. 과하지 않게." },
          push(w, t) { t.sc = 0.7; w.tween(t, { sc: 1 }, 0.3, "back"); },
        },
        {
          id: "icon", name: { en: "Colored Icon", ko: "종류별 색" }, param: "4 kinds · 4 colors",
          cap: { en: "Give each kind its *own color*. Read it without reading.", ko: "종류마다 *색*을 달리. 안 읽어도 알아요." },
          push(w, t) { t.col = t.kc; },
        },
        {
          id: "drift", name: { en: "Drift Out", ko: "흐려지며 퇴장" }, param: "−20px · fade 300ms",
          cap: { en: "The oldest one *drifts up and fades*. No pop-out.", ko: "제일 오래된 건 *위로 흐려지며* 사라져요." },
          drop(w, t) { t.dying = true; w.tween(t, { dy: -24, a: 0 }, 0.3, "out"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft blip",
          cap: { en: "Quiet *blip*. Toasts shouldn't shout.", ko: "작게 *뿅*. 토스트는 소리치면 안 돼요." },
          push(w) { w.sfx.blip(3); },
        },
      ],
    },

    /* 8 ───── 배지 숫자 ───── */
    {
      id: "ui-badge", cat: "ui", view: "ui",
      title: { en: "Make badge counts *pop*", ko: "배지 숫자를 *톡* 튀게" },
      intro: { en: "3 became 5. *Did you notice?*", ko: "3이 5가 됐어요. *알아챘어요?*" },
      interval: 1.0, stepDur: 3.3,
      drawFloor() {},
      setup(w) {
        w.icons = [0, 1, 2].map(i => ({ i, x: 160 + i * 110, y: 200, n: [2, 0, 5][i], sc: 1, wig: 0 }));
        w.last = 0;
      },
      fire(w) {
        const I = w.icons[w.last++ % 3], n = 1 + Math.floor(Math.random() * 3);
        if (I.n > 20) I.n = 0;
        const land = () => { I.n += n; w.emit("land", I, n); };
        if (w.on("fly")) w.emit("fly", I, land); else land();
      },
      update(w, dt) {
        flyTick(w, dt);
        for (const I of w.icons) { ease(I, "sc", 1, dt, 10); I.wig = Math.max(0, I.wig - dt * 2); }
      },
      drawFront(w, ctx) {
        box(ctx, 70, 120, 400, 170, 30, PANEL, LINE);
        for (const I of w.icons) {
          ctx.save(); ctx.translate(I.x, I.y); ctx.rotate(Math.sin(w.time * 40) * 0.22 * I.wig);
          box(ctx, -38, -38, 76, 76, 20, ["#2563eb", "#9333ea", "#16a34a"][I.i]);
          ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
          if (I.i === 0) { ctx.strokeRect(-20, -13, 40, 27); ctx.beginPath(); ctx.moveTo(-20, -13); ctx.lineTo(0, 4); ctx.lineTo(20, -13); ctx.stroke(); }
          else if (I.i === 1) { ctx.fillRect(-18, -8, 36, 26); ctx.beginPath(); ctx.arc(0, -8, 10, Math.PI, 0); ctx.stroke(); }
          else { ctx.beginPath(); ctx.arc(0, -8, 10, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, 22, 20, Math.PI, 0); ctx.fill(); }
          ctx.restore();
          txt(ctx, L(["Mail", "Shop", "Friends"][I.i], ["우편", "상점", "친구"][I.i]), I.x, I.y + 60, 14, DIM, "center", 700);
          if (I.n > 0) {
            ctx.save(); ctx.translate(I.x + 34, I.y - 34); ctx.scale(I.sc, I.sc);
            ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
            ctx.strokeStyle = PANEL; ctx.lineWidth = 4; ctx.stroke();
            txt(ctx, String(I.n), 0, 1, 20, "#fff");
            ctx.restore();
          }
        }
      },
      drawHud(w, ctx) { drawFly(ctx, w); },
      steps: [
        {
          id: "pop", name: { en: "Badge Pop", ko: "배지 톡" }, param: "scale 1.8 → 1",
          cap: { en: "When the number changes, the badge *pops*.", ko: "숫자가 바뀌면 배지가 *톡* 커져요." },
          land(w, I) { I.sc = 1.8; },
        },
        {
          id: "wiggle", name: { en: "Icon Wiggle", ko: "아이콘 흔들기" }, param: "±12° · 0.5s",
          cap: { en: "The icon *wiggles*. Even peripheral vision catches it.", ko: "아이콘이 *흔들흔들*. 곁눈으로도 보여요." },
          land(w, I) { I.wig = 1; },
        },
        {
          id: "fly", name: { en: "Fly Into It", ko: "날아 들어오기" }, param: "350ms arc",
          cap: { en: "Show *where it came from*. A dot flies into the badge.", ko: "*어디서 왔는지* 보여줘요. 점이 날아 들어가요." },
          fly(w, I, land) { flyStart(w, { x0: 270, y0: 40, x1: I.x + 34, y1: I.y - 34, dur: 0.35, arc: 40, col: "248,113,113", r: 9, done: land }); },
        },
        {
          id: "ring", name: { en: "Ring Pulse", ko: "고리 퍼짐" }, param: "ring 16 → 46",
          cap: { en: "A red *ring* spreads from the badge.", ko: "배지에서 빨간 *고리*가 퍼져요." },
          land(w, I) { ring(w, I.x + 34, I.y - 34, 18, 64, "248,113,113", 0.45, 7); sparks(w, I.x + 34, I.y - 34, 10, "254,202,202", [150, 360]); },
        },
        {
          id: "plus", name: { en: "+N Float", ko: "+N 떠오름" }, param: "text 22px",
          cap: { en: "Say *how many* came in. *+3* floats up.", ko: "*몇 개*가 왔는지. *+3*이 떠올라요." },
          land(w, I, n) { w.spawn({ type: "text", text: "+" + n, x: I.x + 34, y: I.y - 62, vy: -70, life: 0.7, size: 22, color: "#fca5a5" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pop",
          cap: { en: "A tiny *pop*. One per arrival.", ko: "도착할 때마다 작게 *뽁*." },
          land(w) { w.sfx.pop(); },
        },
      ],
    },

    /* 9 ───── 출석 보상 달력 ───── */
    {
      id: "ui-daily", cat: "ui", view: "ui",
      title: { en: "Make daily rewards *worth it*", ko: "출석 보상을 *받는 맛*" },
      intro: { en: "Day 3 claimed. *Gray box.*", ko: "3일차 받음. *회색 칸* 끝." },
      interval: 1.15, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        w.D = { day: 2, coins: 120, shown: 120, bump: 0, big: false, cards: [0, 1, 2, 3, 4, 5, 6].map(i => ({ got: i < 2, sc: 1, st: 1 })) };
      },
      fire(w) {
        const D = w.D;
        if (D.day >= 7) { D.day = 0; D.cards.forEach(c => { c.got = false; }); }
        const i = D.day++, c = D.cards[i], p = dailyPos(i);
        c.got = true; D.coins += (i + 1) * 10;
        w.emit("claim", c, p, i);
      },
      update(w, dt) {
        const D = w.D; flyTick(w, dt);
        D.bump = Math.max(0, D.bump - dt * 4);
        if (!w.on("roll")) D.shown = D.coins;
        for (const c of D.cards) ease(c, "sc", 1, dt, 10);
      },
      drawFront(w, ctx) {
        const D = w.D;
        box(ctx, 50, 44, 440, 294, 18, PANEL, LINE);
        txt(ctx, L("Daily Reward", "출석 보상"), 74, 72, 20, "#fff", "left");
        ctx.save(); ctx.translate(420, 72); ctx.scale(1 + D.bump * 0.35, 1 + D.bump * 0.35);
        coinIcon(ctx, -34, 0, 11); txt(ctx, String(Math.round(D.shown)), -18, 1, 18, D.bump > 0.2 ? "#fde047" : "#fff", "left");
        ctx.restore();
        D.cards.forEach((c, i) => {
          const p = dailyPos(i), today = i === D.day;
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(c.sc, c.sc);
          if (today && D.pulse) { const k = 0.5 + 0.5 * Math.sin(w.time * 7); glow(ctx, 0, 0, 70, "198,244,50", 0.25 + 0.2 * k); }
          box(ctx, -42, -50, 84, 100, 12, c.got ? "#181b22" : PANEL2, today && D.pulse ? LIME : LINE, today && D.pulse ? 3 : 2);
          txt(ctx, L("Day ", "") + (i + 1) + L("", "일"), 0, -34, 13, c.got ? "#4b5563" : DIM, "center", 700);
          ctx.globalAlpha = c.got ? 0.35 : 1;
          if (i === 6) gemIcon(ctx, 0, 2, 18); else coinIcon(ctx, 0, 2, 14);
          txt(ctx, "×" + (i + 1) * 10, 0, 32, 14, "#e5e7eb");
          ctx.globalAlpha = 1;
          if (c.got) {
            if (D.big) {
              ctx.save(); ctx.scale(c.st, c.st); ctx.rotate(-0.25);
              ctx.strokeStyle = LIME; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke();
              check(ctx, 0, 2, 34, 1, LIME, 7); ctx.restore();
            } else check(ctx, 26, -34, 14, 1, "#6b7280", 3);
          }
          ctx.restore();
        });
      },
      drawHud(w, ctx) { drawFly(ctx, w); },
      steps: [
        {
          id: "pulse", name: { en: "Point at Today", ko: "오늘 칸 강조" }, param: "glow pulse 7Hz",
          cap: { en: "Today's box *glows*. No need to search.", ko: "오늘 칸이 *빛나요*. 찾을 필요 없어요." },
          claim(w) { w.D.pulse = true; },
        },
        {
          id: "stamp", name: { en: "Stamp Slam", ko: "도장 쾅" }, param: "scale 2.4 → 1",
          cap: { en: "Not a gray-out. *Slam a stamp* on it.", ko: "회색 처리 말고 *도장을 쾅*." },
          claim(w, c) { w.D.big = true; c.st = 2.4; w.tween(c, { st: 1 }, 0.18, "in", () => { c.sc = 0.85; w.shake(0.15); }); },
        },
        {
          id: "rays", name: { en: "Light Rays", ko: "빛줄기" }, param: "10 rays · 0.6s",
          cap: { en: "*Rays* burst behind the box. It feels like a prize.", ko: "칸 뒤로 *빛줄기*. 상 받는 느낌이에요." },
          claim(w, c, p) { w.spawn({ type: "rays", under: true, x: p.x, y: p.y, n: 10, size: 20, size1: 110, vr: 1.5, life: 0.6, color: "253,224,71" }); },
        },
        {
          id: "fly", name: { en: "Coins Fly Home", ko: "동전이 지갑으로" }, param: "6 coins · 60ms gap",
          cap: { en: "Coins *fly into the wallet*. Now you see where it went.", ko: "동전이 *지갑으로 날아가요*. 어디로 갔는지 보여요." },
          claim(w, c, p) {
            for (let k = 0; k < 6; k++) flyStart(w, { kind: "coin", x0: p.x + rand(-20, 20), y0: p.y + rand(-10, 10), x1: 386, y1: 72, dur: 0.45, delay: k * 0.06, arc: 60, r: 9, done: () => { w.D.bump = 1; } });
          },
        },
        {
          id: "roll", name: { en: "Rolling Total", ko: "굴러가는 합계" }, param: "lerp 5/s",
          cap: { en: "The total *counts up* as coins arrive.", ko: "동전이 닿는 동안 합계가 *올라가요*." },
          update(w, dt) { const D = w.D; D.shown += (D.coins - D.shown) * Math.min(1, dt * 5); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "stamp + coin blips",
          cap: { en: "A *thunk* for the stamp, *clinks* for the coins.", ko: "도장은 *쿵*, 동전은 *짤랑*." },
          claim(w, c, p, i) { w.after(0.18, () => w.sfx.thunk()); for (let k = 0; k < 6; k++) w.after(0.45 + k * 0.06, () => w.sfx.blip(k + i)); },
        },
      ],
    },

    /* 10 ───── 연속 출석 ───── */
    {
      id: "ui-streak", cat: "ui", view: "ui",
      title: { en: "Make a streak feel *on fire*", ko: "연속 출석이 *불타오르게*" },
      intro: { en: "5 days in a row. *Just a number.*", ko: "5일 연속인데 *그냥 숫자*예요." },
      interval: 1.0, stepDur: 3.5,
      drawFloor() {},
      setup(w) { w.F = { n: 4, prev: 3, roll: 1, sc: 1, size: 1, live: false, dots: Array(7).fill(0).map(() => ({ sc: 1 })) }; },
      fire(w) {
        const F = w.F;
        F.prev = F.n; F.n++;
        if ((F.n - 1) % 7 === 0) F.dots.forEach(d => { d.sc = 1; });
        const d = (F.n - 1) % 7;
        w.emit("day", F, d, dotPos(d));
        if (F.n % 7 === 0) w.emit("milestone", F);
      },
      update(w, dt) {
        const F = w.F; ease(F, "sc", 1, dt, 8);
        for (const d of F.dots) ease(d, "sc", 1, dt, 10);
      },
      drawFront(w, ctx) {
        const F = w.F;
        box(ctx, 50, 60, 440, 250, 22, PANEL, LINE);
        // 불꽃
        const s = F.sc * F.size, fl = F.live ? Math.sin(w.time * 17) * 0.06 : 0;
        ctx.save(); ctx.translate(150, 200); ctx.scale(s * (1 - fl), s * (1 + fl));
        if (F.live) glow(ctx, 0, -40, 90, "251,146,60", 0.45);
        const tip = F.live ? Math.sin(w.time * 11) * 6 : 0;
        ctx.fillStyle = F.hot ? "#f97316" : "#9a6b4a"; ctx.beginPath(); ctx.moveTo(0, -95); ctx.quadraticCurveTo(48 + tip, -30, 38, 0); ctx.quadraticCurveTo(0, 26, -38, 0); ctx.quadraticCurveTo(-48 - tip, -40, 0, -95); ctx.fill();
        ctx.fillStyle = F.hot ? "#fde047" : "#c9a27e"; ctx.beginPath(); ctx.moveTo(0 + tip * 0.5, -48); ctx.quadraticCurveTo(24, -10, 18, 4); ctx.quadraticCurveTo(0, 16, -18, 4); ctx.quadraticCurveTo(-24, -10, 0 + tip * 0.5, -48); ctx.fill();
        ctx.restore();
        // 숫자 (굴러가는 자리)
        ctx.save(); ctx.beginPath(); ctx.rect(210, 98, 140, 64); ctx.clip();
        const k = E.out(clamp(F.roll));
        txt(ctx, String(F.prev), 270, 130 - 64 * k, 54, "#fff");
        txt(ctx, String(F.n), 270, 130 + 64 * (1 - k), 54, F.hot ? "#fdba74" : "#fff");
        ctx.restore();
        txt(ctx, L("day streak", "일 연속"), 360, 132, 18, DIM, "left", 700);
        // 7칸 점
        F.dots.forEach((d, i) => {
          const p = dotPos(i), got = i < ((F.n - 1) % 7) + 1;
          if (i > 0 && F.chain) box(ctx, p.x - 34, p.y - 3, 34, 6, 3, got ? "#fb923c" : "rgba(255,255,255,0.08)");
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(d.sc, d.sc);
          ctx.fillStyle = got ? (F.hot ? "#fb923c" : "#a8a29e") : "#2f3441"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
          ctx.restore();
          txt(ctx, L("MTWTFSS"[i], "월화수목금토일"[i]), p.x, p.y + 28, 12, DIM, "center", 700);
        });
      },
      steps: [
        {
          id: "flame", name: { en: "Living Flame", ko: "살아 있는 불꽃" }, param: "flicker + embers",
          cap: { en: "Let the flame *flicker* and throw *embers*.", ko: "불꽃이 *일렁이고* *불씨*가 튀어요." },
          update(w, dt) {
            const F = w.F; F.live = true; F.hot = true;
            if (Math.random() < dt * 14) w.spawn({ type: "glow", x: 150 + rand(-20, 20), y: 150, vx: rand(-30, 30), vy: rand(-140, -70), size: rand(4, 8), size1: 0, life: rand(0.5, 0.9), color: "253,186,116" });
          },
        },
        {
          id: "grow", name: { en: "Bigger Every Day", ko: "날마다 커짐" }, param: "+5% / day · pop",
          cap: { en: "The flame *grows* with the streak and *pops* each day.", ko: "연속일수만큼 불꽃이 *커지고*, 매일 *톡*." },
          day(w, F) { F.size = Math.min(1.35, 0.9 + F.n * 0.03); F.sc = 1.3; },
        },
        {
          id: "roll", name: { en: "Odometer Roll", ko: "숫자 굴리기" }, param: "old up · new in",
          cap: { en: "The old number *rolls up*, the new one *rolls in*.", ko: "옛 숫자는 *위로*, 새 숫자가 *굴러 들어와요*." },
          day(w, F) { F.roll = 0; w.tween(F, { roll: 1 }, 0.35, "back"); },
        },
        {
          id: "chain", name: { en: "Chain the Dots", ko: "점 잇기" }, param: "link + pop 1.6",
          cap: { en: "*Link* the days. Breaking a chain hurts.", ko: "날짜를 *이어요*. 끊기면 아깝잖아요." },
          day(w, F, d, p) { F.chain = true; F.dots[d].sc = 1.6; ring(w, p.x, p.y, 12, 34, "251,146,60", 0.35, 4); },
        },
        {
          id: "milestone", name: { en: "Week Milestone", ko: "7일 달성" }, param: "confetti + text",
          cap: { en: "Every *7 days*, throw a small *party*.", ko: "*7일*마다 작은 *파티*를 열어요." },
          milestone(w) {
            confetti(w, 270, 150, 30, 480);
            w.spawn({ type: "text", text: L("1 WEEK!", "일주일!"), x: 300, y: 190, vy: -30, life: 1.2, size: 30, color: "#fde047" });
          },
        },
        {
          id: "sound", name: { en: "Rising Chime", ko: "올라가는 종소리" }, param: "+1 semitone / day",
          cap: { en: "The chime goes *higher* each day of the week.", ko: "요일이 갈수록 종소리가 *높아져요*." },
          day(w, F, d) { w.sfx.chime(d * 2); },
          milestone(w) { w.sfx.fanfare(); },
        },
      ],
    },

    /* 11 ───── 로딩 바 ───── */
    {
      id: "ui-loading", cat: "ui", view: "ui",
      title: { en: "Make loading feel *faster*", ko: "로딩을 *빨라 보이게*" },
      intro: { en: "Stuck… stuck… *jump*.", ko: "멈춤… 멈춤… *뚝* 점프." },
      interval: 1.9, stepDur: 3.8,
      drawFloor() {},
      setup(w) { w.B = { to: 0, v: 0, done: 0, sc: 1, flash: 0, lastTen: 0 }; },
      fire(w) {
        const B = w.B, run = B.run = (B.run || 0) + 1;
        B.to = 0; B.v = 0; B.done = 0; B.lastTen = 0;
        const at = (t, fn) => w.after(t, () => { if (B.run === run) fn(); });
        [[0.12, 22], [0.3, 41], [0.5, 58], [0.7, 80], [0.95, 100]].forEach(([t, v]) => at(t, () => { B.to = v; w.emit("chunk", B); }));
        at(1.1, () => { B.done = 1; w.emit("done", B); });
      },
      update(w, dt) {
        const B = w.B;
        if (!w.on("smooth")) B.v = B.to;
        const ten = Math.floor(B.v / 10);
        if (ten > B.lastTen) { B.lastTen = ten; w.emit("ten", B, ten); }
        ease(B, "sc", 1, dt, 10); B.flash = Math.max(0, B.flash - dt * 3);
      },
      drawFront(w, ctx) {
        const B = w.B, x = 90, y = 196, W = 360, fw = W * B.v / 100;
        box(ctx, 50, 60, 440, 250, 22, PANEL, LINE);
        txt(ctx, B.done ? L("Ready!", "준비 완료!") : L("Loading…", "불러오는 중…"), 270, 120, 26, B.done ? LIME : "#fff");
        ctx.save(); ctx.translate(270, y + 11); ctx.scale(B.sc, B.sc); ctx.translate(-270, -y - 11);
        box(ctx, x - 4, y - 4, W + 8, 30, 15, "#0b0d12", LINE);
        if (fw > 1) {
          ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, Math.max(22, fw), 22, 11); ctx.clip();
          ctx.fillStyle = B.col || "#64748b"; ctx.fillRect(x, y, fw, 22);
          if (B.stripes) {
            ctx.fillStyle = "rgba(255,255,255,0.22)";
            const off = (w.time * 60) % 28;
            for (let sx = x - 40 + off; sx < x + fw; sx += 28) { ctx.beginPath(); ctx.moveTo(sx, y + 22); ctx.lineTo(sx + 14, y + 22); ctx.lineTo(sx + 26, y); ctx.lineTo(sx + 12, y); ctx.closePath(); ctx.fill(); }
          }
          if (B.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${B.flash})`; ctx.fillRect(x, y, fw, 22); }
          ctx.restore();
        }
        ctx.restore();
        if (B.head && !B.done && fw > 2) glow(ctx, x + fw, y + 11, 34, "236,252,203", 0.9);
        if (B.pct) txt(ctx, Math.round(B.v) + "%", Math.max(x + 24, x + fw), y - 22, 18, "#e5e7eb");
      },
      steps: [
        {
          id: "smooth", name: { en: "Smooth Fill", ko: "부드럽게 채우기" }, param: "lerp 6/s",
          cap: { en: "Chunks arrive. The bar *glides* toward them.", ko: "덩어리로 와도 바는 *미끄러지듯* 채워요." },
          update(w, dt) { const B = w.B; B.v += (B.to - B.v) * Math.min(1, dt * 6); },
        },
        {
          id: "stripes", name: { en: "Moving Stripes", ko: "흐르는 줄무늬" }, param: "60px/s",
          cap: { en: "*Moving stripes* say \"still working\" even when stuck.", ko: "*흐르는 줄무늬*는 멈춰도 \"일하는 중\"이에요." },
          chunk(w, B) { B.stripes = true; B.col = "#65a30d"; },
        },
        {
          id: "head", name: { en: "Glowing Head", ko: "빛나는 끝" }, param: "glow + sparks",
          cap: { en: "Light up the *leading edge*. Sparks trail off it.", ko: "*앞쪽 끝*을 밝혀요. 불꽃이 흩날려요." },
          update(w, dt) {
            const B = w.B; B.head = true;
            if (!B.done && B.v > 1 && Math.random() < dt * 30) w.spawn({ type: "spark", x: 90 + 3.6 * B.v, y: 207, vx: rand(-260, -80), vy: rand(-90, 90), drag: 4, life: 0.3, size: 2, color: "236,252,203" });
          },
        },
        {
          id: "pct", name: { en: "Riding Percent", ko: "따라다니는 %" }, param: "on the head",
          cap: { en: "The *number rides* on the bar's tip.", ko: "*숫자*가 바 끝을 타고 다녀요." },
          chunk(w, B) { B.pct = true; },
        },
        {
          id: "finish", name: { en: "Finish Pop", ko: "완료 팡" }, param: "flash + scale 1.12",
          cap: { en: "At 100%: *flash* and *pop*. A clear finish line.", ko: "100%에서 *번쩍*, *톡*. 끝이 확실해요." },
          done(w, B) { B.flash = 1; B.sc = 1.12; ring(w, 450, 207, 10, 70, "198,244,50", 0.4, 6); sparks(w, 450, 207, 12, "236,252,203", [150, 420]); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick / 10% + chime",
          cap: { en: "Soft *ticks* while filling, a *chime* when done.", ko: "채우는 동안 *틱틱*, 끝나면 *딩*." },
          ten(w) { w.sfx.tick(); },
          done(w) { w.sfx.chime(7); },
        },
      ],
    },

    /* 12 ───── 구매 확인 ───── */
    {
      id: "ui-purchase", cat: "ui", view: "ui",
      title: { en: "Make buying feel *final*", ko: "구매를 *확실하게*" },
      intro: { en: "Tap Buy. Window gone. *Did I buy it?*", ko: "구매 누르니 창이 사라짐. *산 거예요?*" },
      interval: 1.9, stepDur: 4.0,
      drawFloor() {},
      setup(w) { w.P = { open: 0, sc: 1, dim: 0, press: 1, ok: 0, hold: 0, bag: 1, owned: 3 }; w.T = tap(); },
      fire(w) {
        const P = w.P;
        const at = seq(w, P);
        P.open = 1; P.ok = 0; P.press = 1;
        w.emit("open", P);
        at(0.3, () => {
          tapAt(w.T, 270, 252);
          P.hold = 0; w.emit("buy", P);
          at(P.hold, () => { P.open = 0; P.owned++; w.emit("close", P); });
        });
      },
      update(w, dt) { const P = w.P; tapTick(w.T, dt); flyTick(w, dt); ease(P, "press", 1, dt, 12); ease(P, "bag", 1, dt, 10); },
      drawFront(w, ctx) {
        const P = w.P;
        box(ctx, 40, 44, 460, 292, 18, "#1a2234", LINE);
        for (let i = 0; i < 3; i++) { box(ctx, 70 + i * 110, 80, 96, 96, 14, "#253047"); swordIcon(ctx, 118 + i * 110, 128, 26); }
        ctx.save(); ctx.translate(462, 294); ctx.scale(P.bag, P.bag);
        box(ctx, -24, -18, 48, 40, 10, "#a16207"); ctx.strokeStyle = "#a16207"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -18, 12, Math.PI, 0); ctx.stroke();
        txt(ctx, String(P.owned), 0, 3, 16, "#fff");
        ctx.restore();
      },
      drawHud(w, ctx) {
        const P = w.P;
        if (P.dim > 0.01) { ctx.fillStyle = `rgba(0,0,0,${P.dim})`; ctx.fillRect(40, 44, 460, 292); }
        if (P.open && P.sc > 0.02) {
          ctx.save(); ctx.translate(270, 180); ctx.scale(P.sc, P.sc); ctx.globalAlpha = clamp(P.sc);
          box(ctx, -140, -110, 280, 220, 20, PANEL, "rgba(255,255,255,0.2)");
          txt(ctx, L("Buy Flame Sword?", "불꽃 검을 살까요?"), 0, -82, 18, "#fff");
          if (!P.flying) swordIcon(ctx, 0, -24, 40);
          gemIcon(ctx, -26, 34, 11); txt(ctx, "300", -10, 35, 18, "#7dd3fc", "left");
          ctx.save(); ctx.translate(0, 72); ctx.scale(P.press, 2 - P.press);
          box(ctx, -80, -20, 160, 40, 12, P.ok ? "#22c55e" : LIME);
          if (P.ok) check(ctx, 0, 0, 26, P.ok, "#fff", 5); else txt(ctx, L("BUY", "구매"), 0, 1, 18, "#0b0c10");
          ctx.restore();
          ctx.restore();
        }
        drawFly(ctx, w);
        drawTap(ctx, w.T);
      },
      steps: [
        {
          id: "pop", name: { en: "Dialog Pop + Dim", ko: "창 톡 + 어둡게" }, param: "scale 0.6 → 1 · 55%",
          cap: { en: "The dialog *pops* and the rest goes *dark*. This matters.", ko: "창이 *톡*, 뒤는 *어둡게*. 중요한 순간이에요." },
          open(w, P) { P.sc = 0.6; w.tween(P, { sc: 1, dim: 0.55 }, 0.22, "back"); },
          close(w, P) { w.tween(P, { dim: 0 }, 0.25, "out"); },
        },
        {
          id: "press", name: { en: "Button Squish", ko: "버튼 꾹" }, param: "0.85 × 1.15",
          cap: { en: "The button *squishes* under the finger.", ko: "손가락 밑에서 버튼이 *꾹*." },
          buy(w, P) { P.press = 0.85; },
        },
        {
          id: "confirm", name: { en: "Check Morph", ko: "체크로 변신" }, param: "green ✓ · hold 1s",
          cap: { en: "BUY *turns into a ✓*. Hold it a moment before closing.", ko: "구매 버튼이 *✓로 변해요*. 잠깐 보여주고 닫아요." },
          buy(w, P) { P.hold = 1.0; w.tween(P, { ok: 1 }, 0.2, "out"); },
        },
        {
          id: "fly", name: { en: "Item to Bag", ko: "가방으로 쏙" }, param: "arc 600ms",
          cap: { en: "The item *flies into your bag*. Now you know where it is.", ko: "아이템이 *가방으로 쏙*. 어디 있는지 알아요." },
          buy(w, P) {
            P.flying = true;
            flyStart(w, { kind: "item", x0: 270, y0: 156, x1: 462, y1: 294, dur: 0.6, delay: 0.1, arc: 90, r: 40, ease: "in", done: () => { P.bag = 1.5; P.flying = false; } });
          },
        },
        {
          id: "sparkle", name: { en: "Sparkle", ko: "반짝" }, param: "8 stars",
          cap: { en: "A few *sparkles* where it left. Something *good* happened.", ko: "떠난 자리에 *반짝*. *좋은 일*이 생겼어요." },
          buy(w) { for (let i = 0; i < 8; i++) w.spawn({ type: "star", x: 270 + rand(-60, 60), y: 156 + rand(-40, 30), size: rand(8, 15), life: rand(0.3, 0.5), color: "254,240,138" }); },
        },
        {
          id: "sound", name: { en: "Cha-ching", ko: "짤랑" }, param: "2 bright notes",
          cap: { en: "A bright *cha-ching*. Spending should feel *good*.", ko: "밝은 *짤랑*. 쓰는 것도 *기분 좋게*." },
          buy(w) { w.play(() => { tn({ type: "square", f: 1320, dur: 0.06, vol: 0.12 }); tn({ type: "square", f: 1760, dur: 0.2, vol: 0.12, delay: 0.07 }); nz({ type: "highpass", f: 5000, dur: 0.15, vol: 0.15, delay: 0.07 }); }); },
        },
      ],
    },

    /* 13 ───── 재화 소비 ───── */
    {
      id: "ui-spend", cat: "ui", view: "ui",
      title: { en: "Show where the *gold went*", ko: "쓴 돈이 *어디 갔는지*" },
      intro: { en: "1,250 → 1,130. *Where'd it go?*", ko: "1,250 → 1,130. *어디로 갔죠?*" },
      interval: 1.1, stepDur: 3.6,
      drawFloor() {},
      setup(w) { w.W = { gold: 1250, shown: 1250, red: 0, shake: 0, lv: 3, lsc: 1, cost: 120 }; w.T = tap(); },
      fire(w) {
        const S = w.W;
        if (S.gold < S.cost) { S.gold = S.shown = 1250; S.lv = 3; }
        tapAt(w.T, 270, 290);
        S.gold -= S.cost;
        w.emit("spend", S);
        const up = () => { S.lv++; w.emit("upgrade", S); };
        if (w.on("fly")) w.after(0.45, up); else up();
      },
      update(w, dt) {
        const S = w.W; tapTick(w.T, dt); flyTick(w, dt);
        if (!w.on("roll")) S.shown = S.gold;
        S.red = Math.max(0, S.red - dt * 2); S.shake = Math.max(0, S.shake - dt * 3); ease(S, "lsc", 1, dt, 9);
      },
      drawFront(w, ctx) {
        const S = w.W, sx = Math.sin(w.time * 60) * 6 * S.shake;
        box(ctx, 40, 44, 460, 292, 18, PANEL, LINE);
        ctx.save(); ctx.translate(sx, 0);
        box(ctx, 330, 52, 150, 38, 19, S.red > 0.05 ? `rgba(239,68,68,${0.25 + 0.4 * S.red})` : "#0b0d12", LINE);
        coinIcon(ctx, 352, 71, 12);
        txt(ctx, Math.round(S.shown).toLocaleString("en"), 468, 72, 18, S.red > 0.2 ? "#fca5a5" : "#fde047", "right");
        ctx.restore();
        ctx.save(); ctx.translate(270, 170); ctx.scale(S.lsc, S.lsc);
        box(ctx, -80, -76, 160, 128, 16, PANEL2, LINE);
        swordIcon(ctx, 0, -20, 38);
        txt(ctx, "Lv " + S.lv, 0, 30, 18, "#fff");
        ctx.restore();
        box(ctx, 190, 270, 160, 42, 12, LIME);
        txt(ctx, L("UPGRADE", "강화"), 236, 291, 16, "#0b0c10");
        coinIcon(ctx, 294, 291, 9); txt(ctx, String(S.cost), 306, 292, 15, "#0b0c10", "left");
      },
      drawHud(w, ctx) { drawFly(ctx, w); drawTap(ctx, w.T); },
      steps: [
        {
          id: "roll", name: { en: "Count Down", ko: "숫자 굴리기" }, param: "lerp 6/s",
          cap: { en: "Let the wallet *count down*. You see it drain.", ko: "지갑 숫자가 *줄어드는 게* 보여요." },
          update(w, dt) { const S = w.W; S.shown += (S.gold - S.shown) * Math.min(1, dt * 6); },
        },
        {
          id: "fly", name: { en: "Coins Fly Out", ko: "동전이 날아감" }, param: "8 coins → item",
          cap: { en: "Coins *leave the wallet* and *land on the item*.", ko: "동전이 *지갑에서 나와* *아이템에 꽂혀요*." },
          spend(w) { for (let k = 0; k < 8; k++) flyStart(w, { kind: "coin", x0: 352, y0: 71, x1: 270 + rand(-30, 30), y1: 160 + rand(-20, 20), dur: 0.35, delay: k * 0.03, arc: -50, r: 10 }); },
        },
        {
          id: "minus", name: { en: "Red −120", ko: "빨간 −120" }, param: "text 24px",
          cap: { en: "Say the cost out loud: *−120* in red.", ko: "얼마 썼는지 *−120*을 빨갛게." },
          spend(w, S) { w.spawn({ type: "text", text: "−" + S.cost, x: 410, y: 112, vy: 60, life: 0.8, size: 24, color: "#f87171" }); },
        },
        {
          id: "wallet", name: { en: "Wallet Flinch", ko: "지갑 움찔" }, param: "red tint + shake",
          cap: { en: "The wallet *flinches* red for a moment.", ko: "지갑이 잠깐 *빨갛게 움찔*." },
          spend(w, S) { S.red = 1; S.shake = 1; },
        },
        {
          id: "upgrade", name: { en: "Payoff Pop", ko: "보상 톡" }, param: "scale 1.3 + rays",
          cap: { en: "Spending needs a *payoff*. The item *levels up* loudly.", ko: "쓴 만큼 *보상*이 보여야 해요. 레벨이 *팡*." },
          upgrade(w, S) {
            S.lsc = 1.3;
            w.spawn({ type: "rays", under: true, x: 270, y: 150, n: 12, size: 30, size1: 130, vr: 1.2, life: 0.6, color: "198,244,50" });
            w.spawn({ type: "text", text: "Lv " + S.lv + "!", x: 270, y: 90, vy: -50, life: 0.8, size: 26, color: "#c6f432" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clinks + level ping",
          cap: { en: "*Clinks* going out, a *ping* when it lands.", ko: "나갈 때 *짤랑짤랑*, 닿으면 *핑*." },
          spend(w) { for (let k = 0; k < 4; k++) w.after(k * 0.06, () => w.sfx.blip(8 - k)); },
          upgrade(w) { w.sfx.chime(4); },
        },
      ],
    },

    /* 14 ───── 오류 흔들기 ───── */
    {
      id: "ui-error", cat: "ui", view: "ui",
      title: { en: "Say *no* with a shake", ko: "흔들어서 *아니라고*" },
      intro: { en: "Wrong password. *Tiny red text.*", ko: "비밀번호 틀림. *작은 빨간 글씨*뿐." },
      interval: 1.4, stepDur: 3.5,
      drawFloor() {},
      setup(w) { w.ER = { sh: 0, red: 0, icon: 0, msg: 0, my: 0, dots: 6 }; w.T = tap(); },
      fire(w) {
        const R = w.ER;
        R.dots = 6; R.msg = 0; R.icon = 0;
        tapAt(w.T, 270, 250);
        w.after(0.12, () => { R.msg = 1; w.emit("fail", R); });
      },
      update(w, dt) { const R = w.ER; tapTick(w.T, dt); R.sh = Math.max(0, R.sh - dt * 2.2); R.red = Math.max(0, R.red - dt * 0.9); },
      drawFront(w, ctx) {
        const R = w.ER, ox = Math.sin(w.time * 55) * 18 * R.sh * R.sh;
        box(ctx, 90, 50, 360, 284, 20, PANEL, LINE);
        txt(ctx, L("Log in", "로그인"), 270, 86, 24, "#fff");
        ctx.save(); ctx.translate(ox, 0);
        txt(ctx, L("Password", "비밀번호"), 130, 126, 14, DIM, "left", 700);
        box(ctx, 120, 140, 300, 50, 12, R.red > 0.02 ? `rgba(127,29,29,${0.5 * R.red + 0.2})` : "#0b0d12", R.red > 0.02 ? `rgba(248,113,113,${0.4 + 0.6 * R.red})` : LINE, R.red > 0.02 ? 3 : 2);
        for (let i = 0; i < R.dots; i++) { ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.arc(146 + i * 22, 165, 6, 0, TAU); ctx.fill(); }
        if (R.icon > 0.02) {
          ctx.save(); ctx.translate(392, 165); ctx.scale(R.icon, R.icon);
          ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
          txt(ctx, "!", 0, 1, 18, "#fff"); ctx.restore();
        }
        if (R.msg > 0.02) { ctx.globalAlpha = clamp(R.msg); txt(ctx, L("Wrong password", "비밀번호가 달라요"), 124, 206 + R.my, 14, "#f87171", "left", 700); ctx.globalAlpha = 1; }
        box(ctx, 120, 230, 300, 44, 12, LIME); txt(ctx, L("LOG IN", "로그인"), 270, 252, 17, "#0b0c10");
        ctx.restore();
      },
      drawHud(w, ctx) { drawTap(ctx, w.T); },
      steps: [
        {
          id: "shake", name: { en: "Head-shake", ko: "도리도리" }, param: "18px · decays 0.45s",
          cap: { en: "Shake the form *side to side*. Like shaking your head.", ko: "*좌우로* 흔들어요. 고개를 젓듯이." },
          fail(w, R) { R.sh = 1; },
        },
        {
          id: "border", name: { en: "Red Field", ko: "빨간 입력칸" }, param: "border + tint 1s",
          cap: { en: "Turn *the field itself* red. Show *where* it's wrong.", ko: "*입력칸 자체*를 빨갛게. *어디가* 틀렸는지." },
          fail(w, R) { R.red = 1; },
        },
        {
          id: "icon", name: { en: "Warning Pop", ko: "경고 아이콘" }, param: "scale 0 → 1 back",
          cap: { en: "A *!* icon pops inside the field.", ko: "입력칸 안에 *!*가 톡." },
          fail(w, R) { w.tween(R, { icon: 1 }, 0.3, "back"); },
        },
        {
          id: "msg", name: { en: "Message Slides", ko: "문구 스르륵" }, param: "−10px · fade",
          cap: { en: "The message *slides down* instead of blinking on.", ko: "문구는 깜빡 말고 *스르륵* 내려와요." },
          fail(w, R) { R.msg = 0; R.my = -10; w.tween(R, { msg: 1, my: 0 }, 0.25, "out"); },
        },
        {
          id: "clear", name: { en: "Drop the Dots", ko: "글자 떨어뜨리기" }, param: "6 dots fall",
          cap: { en: "The wrong input *falls out*. Ready to retype.", ko: "틀린 입력이 *우수수*. 바로 다시 쳐요." },
          fail(w, R) {
            for (let i = 0; i < R.dots; i++) w.spawn({ type: "circle", x: 146 + i * 22, y: 165, vx: rand(-60, 60), vy: rand(-220, -80), g: 1400, life: 0.7, size: 6, color: "229,231,235" });
            R.dots = 0;
          },
        },
        {
          id: "sound", name: { en: "Buzz", ko: "삑삑" }, param: "2 low buzzes",
          cap: { en: "Two short, low *buzzes*. Not a scary alarm.", ko: "낮고 짧게 *삑삑*. 무서운 경보 말고." },
          fail(w) { w.play(() => { tn({ type: "square", f: 180, dur: 0.08, vol: 0.12 }); tn({ type: "square", f: 150, dur: 0.12, vol: 0.12, delay: 0.11 }); }); },
        },
      ],
    },

    /* 15 ───── 성공 체크 ───── */
    {
      id: "ui-success", cat: "ui", view: "ui",
      title: { en: "Make *success* feel earned", ko: "성공을 *뿌듯하게*" },
      intro: { en: "A check icon. *Okay, done.*", ko: "체크 하나. *네, 끝.*" },
      interval: 1.6, stepDur: 3.6,
      drawFloor() {},
      setup(w) { w.C = { show: 0, ring: 1, ck: 1, sc: 1, hue: 0, halo: 0 }; },
      fire(w) {
        const C = w.C;
        C.show = 0; C.halo = 0; C.hue = 0;
        w.after(0.25, () => { C.show = 1; C.ring = 1; C.ck = 1; C.sc = 1; w.emit("done", C); });
      },
      update(w, dt) { const C = w.C; if (C.halo > 0) C.pulse = 0.5 + 0.5 * Math.sin(w.time * 5); },
      drawFront(w, ctx) {
        const C = w.C;
        box(ctx, 110, 50, 320, 280, 24, PANEL, LINE);
        if (!C.show) { txt(ctx, L("Saving…", "처리 중…"), 270, 170, 18, DIM, "center", 700); return; }
        const col = C.hue ? "#22c55e" : "#e5e7eb";
        if (C.halo > 0) glow(ctx, 270, 160, 150, "34,197,94", 0.35 * C.halo * (0.75 + 0.25 * C.pulse));
        ctx.save(); ctx.translate(270, 160); ctx.scale(C.sc, C.sc);
        if (C.hue) { ctx.fillStyle = "rgba(34,197,94,0.18)"; ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(0, 0, 62, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(C.ring)); ctx.stroke();
        if (C.ck > 0.01) check(ctx, 0, 4, 70, clamp(C.ck), col, 10);
        ctx.restore();
        txt(ctx, L("Quest Complete", "퀘스트 완료"), 270, 270, 22, C.hue ? "#86efac" : "#e5e7eb");
      },
      steps: [
        {
          id: "draw", name: { en: "Draw the Circle", ko: "원 그리기" }, param: "300ms stroke",
          cap: { en: "*Draw* the circle instead of stamping it.", ko: "원을 찍지 말고 *그려 나가요*." },
          done(w, C) { C.ring = 0; C.ck = 0; w.tween(C, { ring: 1 }, 0.3, "inout"); },
        },
        {
          id: "check", name: { en: "Then the Check", ko: "이어서 체크" }, param: "+250ms stroke",
          cap: { en: "Then the check *writes itself*. Short, then long.", ko: "이어서 체크가 *스윽*. 짧게, 길게." },
          done(w, C) { w.after(0.28, () => w.tween(C, { ck: 1 }, 0.25, "out")); },
        },
        {
          id: "pop", name: { en: "Overshoot Pop", ko: "튕기는 톡" }, param: "scale 1.25 → 1",
          cap: { en: "As the check lands, the whole icon *pops*.", ko: "체크가 끝나는 순간 아이콘이 *톡*." },
          done(w, C) { w.after(0.5, () => { C.sc = 1.25; w.tween(C, { sc: 1 }, 0.3, "back"); }); },
        },
        {
          id: "color", name: { en: "Turn Green", ko: "초록으로" }, param: "#22c55e + halo",
          cap: { en: "Success has a color. *Green*, with a soft *halo*.", ko: "성공엔 색이 있어요. *초록*과 은은한 *빛*." },
          done(w, C) { w.after(0.5, () => { C.hue = 1; w.tween(C, { halo: 1 }, 0.3, "out"); }); },
        },
        {
          id: "burst", name: { en: "Burst", ko: "터짐" }, param: "ring + 14 sparks",
          cap: { en: "A *ring* and a spray of *sparks*. A small celebration.", ko: "*고리*와 *불꽃*. 작은 축하예요." },
          done(w) {
            w.after(0.5, () => {
              ring(w, 270, 160, 60, 150, "134,239,172", 0.5, 8);
              sparks(w, 270, 160, 14, "187,247,208", [220, 520]);
            });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "major chord",
          cap: { en: "A quick *up-up-up* chord. Bright and short.", ko: "*도미솔*을 빠르게. 밝고 짧게." },
          done(w) { [0, 4, 7].forEach((n, i) => w.after(0.3 + i * 0.07, () => w.sfx.chime(n))); },
        },
      ],
    },

    /* 16 ───── 툴팁 ───── */
    {
      id: "ui-tooltip", cat: "ui", view: "ui",
      title: { en: "Point the *tooltip* at its item", ko: "툴팁이 *가리키게*" },
      intro: { en: "Which item is this text *about?*", ko: "이 설명, *어느 아이템* 거예요?" },
      interval: 1.8, stepDur: 3.8,
      drawFloor() {},
      setup(w) {
        w.TT = { i: -1, show: 0, sc: 1, a: 1, lift: [0, 0, 0, 0], rows: [1, 1, 1], anchor: false, head: null };
        w.T = tap(); w.T.hold = false;
      },
      fire(w) {
        const P = w.TT;
        P.i = (P.i + 1) % 4;
        const x = 120 + P.i * 100;
        w.T.x = x; w.T.y = 270; w.T.a = 1; w.T.p = 1; w.T.hold = true;
        const at = seq(w, P);
        at(0.15, () => { P.show = 1; w.emit("show", P, x); });
        at(1.65, () => { P.show = 0; w.T.hold = false; w.emit("hide", P); });
      },
      update(w, dt) {
        const P = w.TT; tapTick(w.T, dt);
        P.lift.forEach((v, i) => { P.lift[i] += ((P.show && i === P.i && P.raise ? 1 : 0) - v) * Math.min(1, dt * 12); });
      },
      drawFront(w, ctx) {
        const P = w.TT;
        box(ctx, 50, 44, 440, 292, 18, "#161b26", LINE);
        for (let i = 0; i < 4; i++) {
          const x = 120 + i * 100, y = 262 - P.lift[i] * 10, on = P.raise && P.show && i === P.i;
          box(ctx, x - 38, y - 38, 76, 76, 14, PANEL2, on ? LIME : LINE, on ? 3 : 2);
          drawGem(ctx, i + 1, x, y, 22);
        }
      },
      drawHud(w, ctx) {
        const P = w.TT;
        if (P.show && P.sc > 0.02) {
          const ix = 120 + P.i * 100, bw = 190, bh = 116;
          const bx = P.anchor ? clamp(ix - bw / 2, 60, 480 - bw) : 70, by = P.anchor ? 104 : 60;
          const ox = P.anchor ? ix : bx + bw / 2, oy = by + bh;
          ctx.save(); ctx.globalAlpha = clamp(P.a); ctx.translate(ox, oy); ctx.scale(P.sc, P.sc); ctx.translate(-ox, -oy);
          box(ctx, bx, by, bw, bh, 12, "rgba(15,17,24,0.97)", "rgba(255,255,255,0.25)");
          if (P.anchor) { ctx.fillStyle = "rgba(15,17,24,0.97)"; ctx.beginPath(); ctx.moveTo(ix - 10, oy - 1); ctx.lineTo(ix + 10, oy - 1); ctx.lineTo(ix, oy + 12); ctx.closePath(); ctx.fill(); }
          if (P.head) box(ctx, bx, by, bw, 34, [12, 12, 0, 0], `rgba(${GEM_COL[P.i + 1]},0.85)`);
          txt(ctx, L(["Frost Shard", "Moss Cube", "Sun Prism", "Void Hex"][P.i], ["서리 조각", "이끼 큐브", "태양 프리즘", "공허 육각"][P.i]), bx + 14, by + 18, 16, P.head ? "#0b0c10" : "#fff", "left");
          ["ATK +12", "SPD +3", "CRIT 5%"].forEach((s, r) => {
            ctx.globalAlpha = clamp(P.a) * clamp(P.rows[r]);
            txt(ctx, s, bx + 14 + (1 - clamp(P.rows[r])) * 20, by + 52 + r * 22, 14, "#cbd5e1", "left", 700);
          });
          ctx.restore();
        }
        drawTap(ctx, w.T);
      },
      steps: [
        {
          id: "anchor", name: { en: "Anchor + Arrow", ko: "붙이고 가리키기" }, param: "above item · clamp",
          cap: { en: "Put it *right above* the item, with an *arrow*.", ko: "아이템 *바로 위*에, *화살표*까지." },
          show(w, P) { P.anchor = true; },
        },
        {
          id: "grow", name: { en: "Grow from Arrow", ko: "화살표에서 자라기" }, param: "scale 0.5 → 1",
          cap: { en: "It *grows out* of the arrow tip. Origin = the item.", ko: "화살표 끝에서 *자라나요*. 출처가 보여요." },
          show(w, P) { P.sc = 0.5; P.a = 0; w.tween(P, { sc: 1, a: 1 }, 0.2, "back"); },
        },
        {
          id: "raise", name: { en: "Lift the Slot", ko: "칸 들어 올리기" }, param: "−10px · lime",
          cap: { en: "The pressed slot *lifts* and lights up.", ko: "누른 칸이 *들리고* 빛나요." },
          show(w, P) { P.raise = true; },
        },
        {
          id: "rows", name: { en: "Stagger Lines", ko: "줄줄이 등장" }, param: "60ms per line",
          cap: { en: "Stat lines *slide in one by one*. Easy to read.", ko: "능력치가 *한 줄씩* 들어와요. 읽기 편해요." },
          show(w, P) { P.rows = [0, 0, 0]; P.rows.forEach((_, r) => w.after(0.1 + r * 0.06, () => w.tween(P.rows, { [r]: 1 }, 0.2, "out"))); },
        },
        {
          id: "head", name: { en: "Color Header", ko: "색깔 머리띠" }, param: "item color",
          cap: { en: "Tint the header with the *item's color*.", ko: "머리띠를 *아이템 색*으로." },
          show(w, P) { P.head = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick",
          cap: { en: "A soft *tick*. Info pops shouldn't be loud.", ko: "작게 *틱*. 설명창은 조용해야 해요." },
          show(w) { w.sfx.tick(); },
        },
      ],
    },

    /* 17 ───── 카드 뒤집기 ───── */
    {
      id: "ui-flip", cat: "ui", view: "ui",
      title: { en: "Flip cards with *drama*", ko: "카드 뒤집기에 *긴장감*" },
      intro: { en: "Back. Front. *Swap.*", ko: "뒷면. 앞면. *휙* 바뀜." },
      interval: 2.3, stepDur: 3.8,
      drawFloor() {},
      setup(w) { w.CF = { face: false, f: 0, lift: 0, rot: 0, shine: -1, aura: 0, rar: 3 }; w.T = tap(); },
      fire(w) {
        const C = w.CF;
        C.face = false; C.f = 0; C.aura = 0; C.shine = -1; C.rar = pick([1, 3, 4]);
        w.after(0.3, () => tapAt(w.T, 270, 180));
        w.after(0.45, () => {
          w.emit("flip", C);
          if (!w.on("turn")) { C.face = true; w.emit("reveal", C); }
        });
      },
      update(w, dt) { tapTick(w.T, dt); },
      drawFront(w, ctx) {
        const C = w.CF, sxv = Math.abs(Math.cos(C.f * Math.PI)), s = 1 + C.lift * 0.15;
        box(ctx, 40, 44, 460, 292, 18, "#151821", LINE);
        if (C.aura > 0.01) {
          glow(ctx, 270, 180, 170, GEM_COL[C.rar], 0.5 * C.aura);
        }
        ctx.fillStyle = `rgba(0,0,0,${0.35 + 0.2 * C.lift})`;
        ctx.beginPath(); ctx.ellipse(270 + C.lift * 14, 290 + C.lift * 10, 70 * sxv * s, 12, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(270, 180 - C.lift * 26); ctx.rotate(C.rot); ctx.scale(Math.max(0.02, sxv) * s, s);
        if (!C.face) {
          box(ctx, -66, -92, 132, 184, 14, "#3b3f8f", "rgba(255,255,255,0.35)", 3);
          ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
          for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, 14 + i * 12, 0, TAU); ctx.stroke(); }
        } else {
          box(ctx, -66, -92, 132, 184, 14, "#f8fafc", `rgb(${GEM_COL[C.rar]})`, 6);
          drawGem(ctx, C.rar, 0, -14, 38);
          txt(ctx, ["", "RARE", "", "EPIC", "LEGEND"][C.rar], 0, 58, 16, `rgb(${GEM_COL[C.rar]})`);
          if (C.shine > -1 && C.shine < 1) {
            ctx.save(); ctx.beginPath(); ctx.roundRect(-66, -92, 132, 184, 14); ctx.clip();
            const x = C.shine * 160;
            const g = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
            g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g; ctx.rotate(0.3); ctx.fillRect(x - 40, -140, 80, 280); ctx.restore();
          }
        }
        ctx.restore();
      },
      drawHud(w, ctx) { drawTap(ctx, w.T); },
      steps: [
        {
          id: "turn", name: { en: "Real Turn", ko: "진짜로 돌리기" }, param: "scaleX cos · 400ms",
          cap: { en: "Squeeze to *zero width*, swap faces, open back up.", ko: "폭을 *0까지* 좁히고, 면을 바꾸고, 다시 펴요." },
          flip(w, C) {
            w.tween(C, { f: 0.5 }, 0.2, "in", () => {
              C.face = true; w.emit("reveal", C);
              w.tween(C, { f: 1 }, 0.2, "out");
            });
          },
        },
        {
          id: "lift", name: { en: "Lift Off", ko: "들어 올리기" }, param: "+15% · shadow",
          cap: { en: "*Lift* the card while it turns. The shadow drops away.", ko: "도는 동안 카드가 *떠올라요*. 그림자가 멀어져요." },
          flip(w, C) { w.tween(C, { lift: 1 }, 0.2, "out", () => w.after(0.25, () => w.tween(C, { lift: 0 }, 0.35, "back"))); },
        },
        {
          id: "aura", name: { en: "Rarity Aura", ko: "등급 오라" }, param: "glow by rarity",
          cap: { en: "The *rarity color* floods out behind the card.", ko: "카드 뒤로 *등급 색*이 퍼져요." },
          reveal(w, C) {
            w.tween(C, { aura: 1 }, 0.2, "out");
            w.spawn({ type: "rays", under: true, x: 270, y: 180, n: 14, size: 40, size1: 200, vr: 0.8, life: 1.2, color: GEM_COL[C.rar], hold: true });
          },
        },
        {
          id: "shine", name: { en: "Shine Sweep", ko: "광택 쓸기" }, param: "band 80px · 450ms",
          cap: { en: "A *shine* sweeps the face. It looks like glossy foil.", ko: "앞면에 *광택*이 스윽. 반짝이는 카드 같아요." },
          reveal(w, C) { C.shine = -1; w.after(0.15, () => w.tween(C, { shine: 1 }, 0.45, "inout")); },
        },
        {
          id: "wobble", name: { en: "Settle Wobble", ko: "흔들리며 안착" }, param: "±0.15 rad decay",
          cap: { en: "It *wobbles* and settles. It has weight.", ko: "살짝 *흔들리다* 멈춰요. 무게가 생겨요." },
          reveal(w, C) { C.wob = 0.16; },
          update(w, dt) { const C = w.CF; C.wob = (C.wob || 0) * Math.pow(0.03, dt); C.rot = Math.sin(w.time * 26) * C.wob; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish + reveal",
          cap: { en: "*Swish* as it turns, a bright *ping* on the face.", ko: "돌 때 *휙*, 앞면에서 *띵*." },
          flip(w) { w.sfx.swish(); },
          reveal(w, C) { if (C.rar >= 3) w.sfx.ping(); else w.sfx.pop(); },
        },
      ],
    },

    /* 18 ───── 진행 바 마일스톤 ───── */
    {
      id: "ui-milestone", cat: "ui", view: "ui",
      title: { en: "Celebrate each *milestone*", ko: "진행 바의 *중간 보상*" },
      intro: { en: "The bar passed a chest. *Nothing.*", ko: "상자를 지나쳤는데 *아무 일*도 없어요." },
      interval: 1.0, stepDur: 3.6,
      drawFloor() {},
      setup(w) { w.MS = { v: 10, shown: 10, flash: 0, nodes: [34, 67, 100].map(at => ({ at, got: false, sc: 1, open: 0 })) }; },
      fire(w) {
        const M = w.MS;
        if (M.v >= 100) { M.v = M.shown = 0; M.nodes.forEach(n => { n.got = false; n.open = 0; }); }
        const add = Math.round(rand(16, 22));
        M.v = Math.min(100, M.v + add);
        w.emit("add", M, add);
        for (const n of M.nodes) if (!n.got && M.v >= n.at) { n.got = true; w.emit("reach", M, n, msX(n.at)); }
      },
      update(w, dt) {
        const M = w.MS;
        if (!w.on("smooth")) M.shown = M.v;
        M.flash = Math.max(0, M.flash - dt * 3);
        for (const n of M.nodes) ease(n, "sc", 1, dt, 9);
      },
      drawFront(w, ctx) {
        const M = w.MS, x0 = 80, W = 380, y = 200;
        box(ctx, 50, 70, 440, 220, 22, PANEL, LINE);
        txt(ctx, L("Season Pass", "시즌 패스"), 80, 110, 20, "#fff", "left");
        txt(ctx, Math.round(M.shown) + " / 100", 460, 110, 16, DIM, "right", 700);
        box(ctx, x0, y - 9, W, 18, 9, "#0b0d12");
        box(ctx, x0, y - 9, Math.max(18, W * M.shown / 100), 18, 9, M.col || "#94a3b8");
        if (M.flash > 0) box(ctx, x0, y - 9, W * M.shown / 100, 18, 9, `rgba(255,255,255,${M.flash})`);
        for (const n of M.nodes) {
          const nx = msX(n.at);
          ctx.save(); ctx.translate(nx, y); ctx.scale(n.sc, n.sc);
          ctx.fillStyle = n.got ? "#f59e0b" : "#374151"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
          ctx.strokeStyle = PANEL; ctx.lineWidth = 4; ctx.stroke();
          box(ctx, -11, -6, 22, 14, 3, n.got ? "#92400e" : "#4b5563");
          ctx.save(); ctx.translate(-11, -6); ctx.rotate(-n.open * 0.9); box(ctx, 0, -6, 22, 7, 3, n.got ? "#b45309" : "#6b7280"); ctx.restore();
          ctx.restore();
        }
      },
      steps: [
        {
          id: "smooth", name: { en: "Smooth Fill", ko: "부드럽게 채우기" }, param: "lerp 5/s",
          cap: { en: "The bar *grows* instead of jumping.", ko: "바가 점프 말고 *자라나요*." },
          update(w, dt) { const M = w.MS; M.shown += (M.v - M.shown) * Math.min(1, dt * 5); },
        },
        {
          id: "gain", name: { en: "+XP at the Tip", ko: "끝에서 +XP" }, param: "lime fill + text",
          cap: { en: "Show the *gain* right at the bar's tip.", ko: "늘어난 만큼을 *바 끝에서* 보여줘요." },
          add(w, M, n) { M.col = LIME; w.spawn({ type: "text", text: "+" + n, x: 80 + 3.8 * M.v, y: 168, vy: -60, life: 0.8, size: 20, color: "#d9f99d" }); },
        },
        {
          id: "node", name: { en: "Node Pop", ko: "보상 칸 톡" }, param: "scale 1.6 + ring",
          cap: { en: "When the bar *reaches* a chest, the chest *pops*.", ko: "바가 *닿는* 순간 상자가 *톡*." },
          reach(w, M, n, x) { n.sc = 1.6; ring(w, x, 200, 22, 64, "251,191,36", 0.4, 6); },
        },
        {
          id: "open", name: { en: "Lid + Reward", ko: "뚜껑 열고 보상" }, param: "lid 0.9 rad · coin up",
          cap: { en: "The lid *opens* and a *reward jumps out*.", ko: "뚜껑이 *열리고* 보상이 *튀어나와요*." },
          reach(w, M, n, x) {
            w.tween(n, { open: 1 }, 0.25, "back");
            flyStart(w, { kind: "coin", x0: x, y0: 196, x1: x, y1: 132, dur: 0.4, ease: "out", r: 14 });
            w.after(0.4, () => w.spawn({ type: "star", x, y: 132, size: 24, life: 0.4, color: "253,224,71" }));
          },
        },
        {
          id: "flash", name: { en: "Bar Flash", ko: "바 번쩍" }, param: "white 100%",
          cap: { en: "The *whole bar flashes* on a milestone.", ko: "보상 칸에 닿으면 *바 전체가 번쩍*." },
          reach(w, M) { M.flash = 1; w.shake(0.12); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "blip + chime",
          cap: { en: "Tiny *blip* per gain, a *chime* at each chest.", ko: "늘 때마다 *뿅*, 상자마다 *딩*." },
          add(w, M) { w.sfx.blip(Math.round(M.v / 10)); },
          reach(w, M, n) { w.sfx.chime(n.at / 10); },
        },
      ],
    },

    /* 19 ───── 업적 달성 ───── */
    {
      id: "ui-achieve", cat: "ui", view: "ui",
      title: { en: "Make achievements *shine*", ko: "업적 달성을 *빛나게*" },
      intro: { en: "Achievement unlocked. *Grey box.*", ko: "업적 달성. *회색 상자* 하나." },
      interval: 2.1, stepDur: 4.0,
      drawFloor() {},
      setup(w) { w.A = { show: 0, y: 110, tsc: 1, rot: 0, lines: [1, 1], gold: false, pulse: 0 }; w.hero = w.actor("hero", { home: 270 }); w.hero.alpha = 0.35; },
      fire(w) {
        const A = w.A;
        const at = seq(w, A);
        A.show = 1; A.y = 110; w.emit("unlock", A);
        at(1.7, () => { A.show = 0; });
      },
      update(w, dt) { const A = w.A; A.pulse = 0.5 + 0.5 * Math.sin(w.time * 8); },
      drawHud(w, ctx) {
        const A = w.A; if (!A.show) return;
        ctx.save(); ctx.translate(270, A.y);
        if (A.gold) { ctx.shadowColor = `rgba(250,204,21,${0.5 + 0.4 * A.pulse})`; ctx.shadowBlur = 30; }
        box(ctx, -190, -48, 380, 96, 20, A.gold ? "#2a2410" : PANEL2, A.gold ? "#facc15" : LINE, A.gold ? 3 : 2);
        ctx.restore();
        ctx.save(); ctx.translate(270, A.y);
        ctx.save(); ctx.translate(-138, 0); ctx.rotate(A.rot); ctx.scale(A.tsc, A.tsc);
        ctx.fillStyle = A.gold ? "#facc15" : "#9ca3af";
        ctx.beginPath(); ctx.moveTo(-20, -24); ctx.lineTo(20, -24); ctx.quadraticCurveTo(20, 8, 0, 10); ctx.quadraticCurveTo(-20, 8, -20, -24); ctx.fill();
        ctx.fillRect(-4, 8, 8, 12); ctx.fillRect(-14, 18, 28, 7);
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(-20, -12, 9, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(20, -12, 9, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = clamp(A.lines[0]); txt(ctx, L("ACHIEVEMENT UNLOCKED", "업적 달성"), -96, -14 + (1 - clamp(A.lines[0])) * 12, 13, A.gold ? "#fde047" : DIM, "left", 800);
        ctx.globalAlpha = clamp(A.lines[1]); txt(ctx, L("First Victory", "첫 승리"), -96, 14 + (1 - clamp(A.lines[1])) * 12, 24, "#fff", "left");
        ctx.restore();
      },
      steps: [
        {
          id: "drop", name: { en: "Drop In", ko: "떨어지며 등장" }, param: "from −120 · back",
          cap: { en: "The banner *drops in* and bounces a little.", ko: "배너가 *툭 떨어져* 살짝 튕겨요." },
          unlock(w, A) { A.y = -60; w.tween(A, { y: 110 }, 0.4, "back"); },
        },
        {
          id: "gold", name: { en: "Gold Frame", ko: "금색 테두리" }, param: "gold + glow pulse",
          cap: { en: "Make it *gold*, with a pulsing *glow*. It's special.", ko: "*금색*에 *빛*이 두근두근. 특별하니까요." },
          unlock(w, A) { A.gold = true; },
        },
        {
          id: "trophy", name: { en: "Trophy Spin-in", ko: "트로피 회전" }, param: "scale 0 → 1 · spin",
          cap: { en: "The trophy *spins in* and lands with a pop.", ko: "트로피가 *빙그르* 들어와 *톡* 멈춰요." },
          unlock(w, A) {
            A.tsc = 0; A.rot = -3;
            w.after(0.3, () => {
              w.tween(A, { tsc: 1, rot: 0 }, 0.4, "back");
              w.spawn({ type: "rays", under: true, x: 132, y: 110, n: 12, size: 20, size1: 90, vr: 2, life: 1, color: "253,224,71", hold: true });
            });
          },
        },
        {
          id: "text", name: { en: "Text in Order", ko: "글자 순서대로" }, param: "100ms apart",
          cap: { en: "Label first, *name second*. Read in order.", ko: "제목 먼저, *업적 이름* 다음. 순서대로 읽혀요." },
          unlock(w, A) { A.lines = [0, 0]; [0, 1].forEach(i => w.after(0.4 + i * 0.12, () => w.tween(A.lines, { [i]: 1 }, 0.25, "out"))); },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "40 pieces",
          cap: { en: "*Confetti* bursts from the banner. Party time.", ko: "배너에서 *꽃가루*가 펑. 축하해요." },
          unlock(w) { w.after(0.4, () => { confetti(w, 170, 90, 20, 520); confetti(w, 370, 90, 20, 520); }); },
        },
        {
          id: "sound", name: { en: "Fanfare", ko: "팡파르" }, param: "5-note arpeggio",
          cap: { en: "A short *fanfare*. Rising, never falling.", ko: "짧은 *빰빠밤*. 올라가기만 해요." },
          unlock(w) { w.after(0.35, () => w.sfx.fanfare()); },
        },
      ],
    },

    /* 20 ───── 랭킹 상승 ───── */
    {
      id: "ui-rank", cat: "ui", view: "ui",
      title: { en: "Make rank-ups *climb*", ko: "순위 상승을 *올라가게*" },
      intro: { en: "Rank 5 → 3. The list just *redraws*.", ko: "5위 → 3위. 목록이 *다시 그려질* 뿐." },
      interval: 1.4, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        w.RK = { rows: ["Ari", "Bo", "Cyd", "Dee", "YOU"].map((n, i) => ({ n, me: n === "YOU", slot: i, y: rankY(i), dip: 0, flash: 0 })), lift: 0, up: 0, upN: 0, upA: 0 };
      },
      fire(w) {
        const K = w.RK, me = K.rows.find(r => r.me);
        if (me.slot === 0) { K.rows.forEach((r, i) => { r.slot = r.me ? 4 : [0, 1, 2, 3][i]; r.y = rankY(r.slot); }); return; }
        const n = Math.min(me.slot, 1 + Math.floor(Math.random() * 2)), passed = K.rows.filter(r => !r.me && r.slot < me.slot && r.slot >= me.slot - n);
        passed.forEach(r => { r.slot++; }); me.slot -= n;
        w.emit("climb", K, me, passed, n);
      },
      update(w, dt) {
        const K = w.RK;
        for (const r of K.rows) { if (!w.on("slide")) r.y = rankY(r.slot); r.dip = Math.max(0, r.dip - dt * 3); r.flash = Math.max(0, r.flash - dt * 2); }
        K.upA = Math.max(0, K.upA - dt * 0.8);
      },
      drawFront(w, ctx) {
        const K = w.RK;
        box(ctx, 90, 44, 360, 292, 18, PANEL, LINE);
        const order = [...K.rows].sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0));
        for (const r of order) {
          const lift = r.me ? K.lift : 0, y = r.y + r.dip * 8;
          ctx.save(); ctx.translate(270, y); ctx.scale(1 + lift * 0.08, 1 + lift * 0.08);
          if (r.me && lift > 0.05) { ctx.shadowColor = "rgba(198,244,50,0.6)"; ctx.shadowBlur = 24 * lift; }
          box(ctx, -160, -22, 320, 44, 12, r.me ? (K.hi ? "#3f4d14" : "#3a3f4b") : PANEL2, r.me && K.hi ? LIME : LINE, r.me && K.hi ? 2.5 : 1.5);
          ctx.shadowBlur = 0;
          if (r.dip > 0.05) box(ctx, -160, -22, 320, 44, 12, `rgba(0,0,0,${r.dip * 0.4})`);
          const rank = Math.round((r.y - rankY(0)) / 54) + 1;
          txt(ctx, "#" + rank, -136, 1, 18, r.me ? "#fff" : DIM, "left");
          txt(ctx, r.n === "YOU" ? L("YOU", "나") : r.n, -80, 1, 18, "#fff", "left");
          txt(ctx, String(9000 - Math.round(r.y * 10)), 140, 1, 16, DIM, "right", 700);
          ctx.restore();
        }
        if (K.upA > 0.02) { const me = K.rows.find(r => r.me); ctx.globalAlpha = clamp(K.upA * 2); txt(ctx, "▲" + K.upN, 466, me.y, 20, LIME, "right"); ctx.globalAlpha = 1; }
      },
      steps: [
        {
          id: "slide", name: { en: "Rows Slide", ko: "줄이 미끄러짐" }, param: "500ms ease",
          cap: { en: "Rows *swap by sliding*. You see who you passed.", ko: "줄이 *미끄러지며* 자리를 바꿔요. 누굴 제쳤는지 보여요." },
          climb(w, K) { for (const r of K.rows) w.tween(r, { y: rankY(r.slot) }, r.me ? 0.55 : 0.45, "inout"); },
        },
        {
          id: "lift", name: { en: "Lift Your Row", ko: "내 줄 띄우기" }, param: "scale 1.08 · glow",
          cap: { en: "*Your* row lifts *above* the others as it climbs.", ko: "올라가는 동안 *내 줄*이 *위로 떠요*." },
          climb(w, K) { K.hi = true; w.tween(K, { lift: 1 }, 0.15, "out", () => w.after(0.4, () => w.tween(K, { lift: 0 }, 0.3, "back"))); },
        },
        {
          id: "dip", name: { en: "Passed Rows Dip", ko: "밀린 줄 꾹" }, param: "8px + dim",
          cap: { en: "The rows you pass get *pushed down* a bit.", ko: "제친 줄은 살짝 *눌려 내려가요*." },
          climb(w, K, me, passed) { passed.forEach((r, i) => w.after(0.12 + i * 0.12, () => { r.dip = 1; })); },
        },
        {
          id: "arrow", name: { en: "▲ Indicator", ko: "▲ 표시" }, param: "▲N · 1s",
          cap: { en: "Say *how far* you climbed: *▲2*.", ko: "*몇 칸* 올랐는지: *▲2*." },
          climb(w, K, me, passed, n) { K.upN = n; w.after(0.5, () => { K.upA = 1.2; }); },
        },
        {
          id: "trail", name: { en: "Climb Trail", ko: "올라간 흔적" }, param: "sparks upward",
          cap: { en: "Leave a *spark trail* along the climb.", ko: "올라간 길에 *불꽃 꼬리*를 남겨요." },
          update(w, dt) {
            const me = w.RK.rows.find(r => r.me);
            if (Math.abs(me.y - rankY(me.slot)) > 4 && Math.random() < dt * 40) w.spawn({ type: "spark", x: rand(120, 420), y: me.y + 22, vx: 0, vy: rand(80, 200), drag: 3, life: 0.35, size: 2.4, color: "198,244,50" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "blip per pass",
          cap: { en: "A rising *blip* for every row you pass.", ko: "한 줄 제칠 때마다 *뿅*, 점점 높게." },
          climb(w, K, me, passed) { passed.forEach((r, i) => w.after(0.12 + i * 0.12, () => w.sfx.blip(6 + (4 - me.slot) * 2 + i))); },
        },
      ],
    },

    /* 21 ───── 별점 ───── */
    {
      id: "ui-stars", cat: "ui", view: "ui",
      title: { en: "Hand out stars *one by one*", ko: "별은 *하나씩* 쾅쾅쾅" },
      intro: { en: "Three stars. *All at once.*", ko: "별 세 개가 *한꺼번에*." },
      interval: 1.9, stepDur: 4.0,
      drawFloor() {},
      setup(w) { w.ST = { stars: [0, 1, 2].map(i => ({ on: false, sc: 1 })), score: 0, shown: 0, gap: 0 }; },
      fire(w) {
        const S = w.ST;
        S.stars.forEach(s => { s.on = false; s.sc = 1; }); S.score = 0; S.shown = 0;
        S.gap = 0; w.emit("result", S);
        S.stars.forEach((s, i) => w.after(0.3 + i * S.gap, () => { s.on = true; w.emit("star", s, i, starX(i)); }));
      },
      update(w) { const S = w.ST; if (!w.on("count")) S.shown = S.score; },
      drawFront(w, ctx) {
        const S = w.ST;
        box(ctx, 90, 50, 360, 280, 24, PANEL, LINE);
        txt(ctx, L("STAGE CLEAR", "스테이지 클리어"), 270, 90, 24, "#fff");
        S.stars.forEach((s, i) => {
          const x = starX(i), y = i === 1 ? 160 : 176;
          ctx.save(); ctx.translate(x, y); ctx.scale(s.sc, s.sc);
          ctx.fillStyle = s.on ? "#facc15" : "#2f3441";
          ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 17 : 40; ctx[k ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
          if (s.on) { ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 3; ctx.stroke(); }
          ctx.restore();
        });
        txt(ctx, Math.round(S.shown).toLocaleString("en"), 270, 262, 34, "#fde047");
      },
      steps: [
        {
          id: "seq", name: { en: "One at a Time", ko: "하나씩" }, param: "300ms apart",
          cap: { en: "Give stars *one at a time*. Each is a tiny event.", ko: "별은 *하나씩*. 하나하나가 작은 사건이에요." },
          result(w, S) { S.gap = 0.3; },
        },
        {
          id: "slam", name: { en: "Slam Down", ko: "쾅 내려찍기" }, param: "scale 2.4 → 1",
          cap: { en: "Each star *slams down* from big to small.", ko: "별이 크게 시작해서 *쾅* 박혀요." },
          star(w, s) { s.sc = 2.4; w.tween(s, { sc: 1 }, 0.16, "in", () => w.shake(0.12)); },
        },
        {
          id: "burst", name: { en: "Star Burst", ko: "별 터짐" }, param: "ring + 10 sparks",
          cap: { en: "On impact: a *ring* and golden *sparks*.", ko: "박히는 순간 *고리*와 금빛 *불꽃*." },
          star(w, s, i, x) {
            w.after(0.16, () => { ring(w, x, 170, 30, 80, "253,224,71", 0.35, 6); sparks(w, x, 170, 10, "254,240,138", [180, 420]); });
          },
        },
        {
          id: "finale", name: { en: "Third Star Finale", ko: "세 번째는 크게" }, param: "rays + shake .4",
          cap: { en: "The *last star* gets the biggest moment.", ko: "*마지막 별*에 제일 큰 연출을." },
          star(w, s, i, x) {
            if (i < 2) return;
            w.after(0.16, () => { w.shake(0.4); w.flash("255,240,180", 0.35); w.spawn({ type: "rays", under: true, x: 270, y: 168, n: 16, size: 40, size1: 230, vr: 1, life: 1.2, alpha: 0.7, color: "253,224,71", hold: true }); });
          },
        },
        {
          id: "count", name: { en: "Score Count-up", ko: "점수 올라가기" }, param: "0 → 12,450",
          cap: { en: "The score *counts up* while stars land.", ko: "별이 박히는 동안 점수가 *쭉쭉* 올라가요." },
          result(w, S) { S.score = 12450; w.tween(S, { shown: 12450 }, 0.9, "out"); },
        },
        {
          id: "sound", name: { en: "Rising Notes", ko: "올라가는 음" }, param: "+4 semitones each",
          cap: { en: "Each star is *a step higher*. The third one sings.", ko: "별마다 음이 *한 단계 위로*. 세 번째는 노래해요." },
          star(w, s, i) { w.after(0.16, () => { w.sfx.chime(i * 4); if (i === 2) w.sfx.fanfare(); }); },
        },
      ],
    },

    /* 22 ───── 좋아요 하트 ───── */
    {
      id: "ui-heart", cat: "ui", view: "ui",
      title: { en: "Make a like *burst*", ko: "좋아요를 *팡* 터지게" },
      intro: { en: "Gray heart → red heart. *That's it.*", ko: "회색 하트 → 빨간 하트. *끝.*" },
      interval: 1.5, stepDur: 3.6,
      drawFloor() {},
      setup(w) { w.H = { on: false, sc: 1, n: 127, prev: 126, roll: 1, big: 0, bigSc: 1 }; w.T = tap(); },
      fire(w) {
        const H = w.H;
        H.on = false; H.big = 0;
        tapAt(w.T, 128, 290);
        w.after(0.1, () => { H.on = true; H.prev = H.n; H.n++; w.emit("like", H); });
      },
      update(w, dt) { tapTick(w.T, dt); },
      drawFront(w, ctx) {
        const H = w.H;
        box(ctx, 90, 40, 360, 296, 20, PANEL, LINE);
        box(ctx, 106, 56, 328, 196, 14, "#334155");
        ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.moveTo(106, 252); ctx.lineTo(200, 150); ctx.lineTo(270, 210); ctx.lineTo(330, 160); ctx.lineTo(434, 252); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(380, 100, 20, 0, TAU); ctx.fill();
        if (H.big > 0.01) { ctx.save(); ctx.globalAlpha = clamp(H.big); heart(ctx, 270, 158, 62 * H.bigSc, "#be123c"); heart(ctx, 270, 154, 56 * H.bigSc, "#fb7185"); ctx.restore(); }
        ctx.save(); ctx.translate(128, 290); ctx.scale(H.sc * 1.3, H.sc * 1.3);
        if (H.on) heart(ctx, 0, 0, 18, "#ef4444"); else { heart(ctx, 0, 0, 18, "#64748b"); heart(ctx, 0, 0, 12, PANEL); }
        ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(150, 274, 120, 32); ctx.clip();
        const k = E.out(clamp(H.roll));
        txt(ctx, String(H.prev), 156, 290 - 26 * k, 18, "#e5e7eb", "left");
        txt(ctx, String(H.n), 156, 290 + 26 * (1 - k), 18, "#e5e7eb", "left");
        ctx.restore();
      },
      drawHud(w, ctx) { drawTap(ctx, w.T); },
      steps: [
        {
          id: "pop", name: { en: "Squash Pop", ko: "꾹 눌렀다 톡" }, param: "0.6 → 1.35 → 1",
          cap: { en: "*Shrink* first, then *overshoot*. The heart bounces.", ko: "*작아졌다가* *크게 튕겨요*. 하트가 통통." },
          like(w, H) { H.sc = 0.6; w.tween(H, { sc: 1.35 }, 0.12, "out", () => w.tween(H, { sc: 1 }, 0.25, "back")); },
        },
        {
          id: "dots", name: { en: "Dot Ring Burst", ko: "점 고리 팡" }, param: "10 dots · 5 colors",
          cap: { en: "A *ring of colored dots* bursts outward.", ko: "*알록달록 점*이 동그랗게 터져요." },
          like(w) {
            for (let i = 0; i < 10; i++) {
              const a = i / 10 * TAU;
              w.spawn({ type: "circle", x: 128 + Math.cos(a) * 18, y: 290 + Math.sin(a) * 18, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, drag: 7, life: 0.45, size: 5, size1: 1, color: GEM_COL[i % 5] });
            }
            ring(w, 128, 290, 14, 46, "248,113,113", 0.3, 5);
          },
        },
        {
          id: "float", name: { en: "Floating Hearts", ko: "떠오르는 하트" }, param: "5 hearts",
          cap: { en: "Little *hearts float up* and drift away.", ko: "작은 *하트가 둥실둥실* 올라가요." },
          like(w) { for (let i = 0; i < 5; i++) w.after(i * 0.07, () => w.spawn({ type: "text", text: "♥", x: 128 + rand(-14, 14), y: 270, vx: rand(-50, 50), vy: rand(-180, -110), life: 0.9, size: rand(16, 26), color: pick(["#f87171", "#fb7185", "#f472b6"]) })); },
        },
        {
          id: "big", name: { en: "Big Heart on Post", ko: "사진 위 큰 하트" }, param: "scale 0 → 1.2 → 1",
          cap: { en: "A *big heart* blooms on the post itself.", ko: "사진 위에 *큰 하트*가 피어나요." },
          like(w, H) {
            H.big = 1; H.bigSc = 0; w.tween(H, { bigSc: 1 }, 0.3, "back", () => w.after(0.8, () => w.tween(H, { big: 0 }, 0.3, "in")));
            ring(w, 270, 150, 40, 140, "251,113,133", 0.5, 8);
          },
        },
        {
          id: "roll", name: { en: "Count Rolls", ko: "숫자 굴리기" }, param: "slide 26px",
          cap: { en: "The count *rolls up* by one.", ko: "숫자가 하나 *굴러 올라가요*." },
          like(w, H) { H.roll = 0; w.tween(H, { roll: 1 }, 0.3, "out"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pop",
          cap: { en: "A juicy little *pop*.", ko: "말랑한 *뽁*." },
          like(w) { w.sfx.pop(); },
        },
      ],
    },

    /* 23 ───── 설정 저장 ───── */
    {
      id: "ui-saved", cat: "ui", view: "ui",
      title: { en: "Show that settings *stuck*", ko: "설정이 *저장된 게* 보이게" },
      intro: { en: "Tapped Save. *Did it save?*", ko: "저장 눌렀는데… *된 거예요?*" },
      interval: 1.9, stepDur: 3.8,
      drawFloor() {},
      setup(w) {
        w.SV = { st: "idle", wd: 1, spin: 0, ok: 0, col: 0, note: 0, sweep: -1, dots: [1, 0, 1].map(d => ({ on: d, sc: 1 })) };
        w.T = tap();
      },
      fire(w) {
        const S = w.SV;
        S.st = "idle"; S.ok = 0; S.col = 0; S.note = 0; S.wd = 1; S.dots[0].on = S.dots[2].on = 1; S.dots.forEach(d => { d.sc = 1; });
        tapAt(w.T, 270, 296);
        const at = seq(w, S);
        S.wait = 0; w.emit("press", S);
        at(S.wait, () => {
          S.st = "done"; S.keepDots = false;
          w.emit("saved", S);
          if (!S.keepDots) S.dots.forEach(d => { d.on = 0; });
        });
        at(1.7, () => { S.st = "idle"; S.note = 0; });
      },
      update(w, dt) { const S = w.SV; tapTick(w.T, dt); S.spin += dt * 9; if (!w.on("spinner") && S.st === "done") S.note = 1; },
      drawFront(w, ctx) {
        const S = w.SV;
        box(ctx, 100, 40, 340, 296, 20, PANEL, LINE);
        txt(ctx, L("Settings", "설정"), 126, 74, 20, "#fff", "left");
        const rows = L(["Music", "Shake", "Language"], ["음악", "화면 흔들림", "언어"]);
        rows.forEach((r, i) => {
          const y = 120 + i * 52, d = S.dots[i];
          box(ctx, 120, y - 20, 300, 40, 10, PANEL2);
          if (S.sweep > -1) { const k = clamp(1 - Math.abs(S.sweep * 3 - i - 0.5)); if (k > 0) box(ctx, 120, y - 20, 300, 40, 10, `rgba(198,244,50,${0.35 * k})`); }
          txt(ctx, r, 138, y, 16, "#e5e7eb", "left", 700);
          if (d.on && d.sc > 0.05) { ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.arc(232, y, 5 * d.sc, 0, TAU); ctx.fill(); }
          box(ctx, 352, y - 11, 48, 22, 11, i === 1 ? "#4b5563" : "#65a30d");
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(i === 1 ? 363 : 389, y, 9, 0, TAU); ctx.fill();
        });
        // 저장 버튼
        const bw = 200 * S.wd + 44 * (1 - S.wd);
        box(ctx, 270 - bw / 2, 274, bw, 44, 22, mixc([34, 197, 94], [198, 244, 50], S.col));
        if (S.st === "busy") {
          ctx.strokeStyle = "#0b0c10"; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.arc(270, 296, 11, S.spin, S.spin + 4.2); ctx.stroke();
        } else if (S.ok > 0.01) { check(ctx, 236, 297, 22, clamp(S.ok), "#fff", 4); txt(ctx, L("Saved", "저장됨"), 258, 297, 17, "#fff", "left"); }
        else txt(ctx, L("SAVE", "저장"), 270, 297, 17, "#0b0c10");
        if (S.note > 0) txt(ctx, L("Saved.", "저장됨."), 378, 297, 13, DIM, "left", 600);
      },
      drawHud(w, ctx) { drawTap(ctx, w.T); },
      steps: [
        {
          id: "spinner", name: { en: "Button → Spinner", ko: "버튼이 빙글빙글" }, param: "shrink to 44px",
          cap: { en: "The button *shrinks into a spinner*. Wait is visible.", ko: "버튼이 *동그랗게 말려* 빙글빙글. 기다림이 보여요." },
          press(w, S) { S.st = "busy"; S.wait = 0.5; w.tween(S, { wd: 0 }, 0.18, "inout"); },
          saved(w, S) { w.tween(S, { wd: 1 }, 0.25, "back"); },
        },
        {
          id: "check", name: { en: "Green ✓ Saved", ko: "초록 ✓ 저장됨" }, param: "color + check 250ms",
          cap: { en: "It opens back up *green* with a *✓ Saved*.", ko: "다시 펴지며 *초록색* *✓ 저장됨*." },
          saved(w, S) { w.tween(S, { col: 1 }, 0.2, "out"); w.after(0.1, () => w.tween(S, { ok: 1 }, 0.25, "out")); },
        },
        {
          id: "dots", name: { en: "Clear Edit Dots", ko: "수정 점 지우기" }, param: "pop out · 80ms gap",
          cap: { en: "The *\"changed\" dots* pop away. Nothing pending.", ko: "*바뀜 표시* 점이 톡톡 사라져요. 남은 게 없어요." },
          saved(w, S) {
            S.keepDots = true;
            S.dots.forEach((d, i) => w.after(i * 0.08, () => { if (!d.on) return; d.sc = 1.8; w.tween(d, { sc: 0 }, 0.2, "in", () => { d.on = 0; }); }));
          },
        },
        {
          id: "sweep", name: { en: "Confirm Sweep", ko: "확인 훑기" }, param: "top → bottom 400ms",
          cap: { en: "A light *sweeps down* the list: \"all of this is saved\".", ko: "빛이 목록을 *쓱 훑어요*. \"전부 저장됨\"." },
          saved(w, S) { S.sweep = 0; w.tween(S, { sweep: 1.4 }, 0.5, "lin", () => { S.sweep = -1; }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick… chime",
          cap: { en: "Quiet *tick* on tap, warm *chime* when done.", ko: "누를 때 *틱*, 끝나면 따뜻한 *딩*." },
          press(w) { w.sfx.clickDown(); },
          saved(w) { w.sfx.chime(4); },
        },
      ],
    },

    /* 24 ───── 카운트다운 ───── */
    {
      id: "ui-countdown", cat: "ui", view: "ui",
      title: { en: "Make a timer feel *urgent*", ko: "타이머에 *조급함*을" },
      intro: { en: "3… 2… 1… *No pressure at all.*", ko: "3… 2… 1… *하나도 안 급해요*." },
      interval: 0.7, stepDur: 4.2,
      drawFloor() {},
      setup(w) { w.CD = { n: 6, ring: 1, sc: 1, up: 0 }; },
      fire(w) {
        const C = w.CD;
        if (C.n <= 0) { C.n = 6; C.ring = 1; C.up = 0; return; }
        C.n--;
        w.emit("tick", C);
        if (C.n === 0) w.emit("timeup", C);
      },
      update(w, dt) { const C = w.CD; ease(C, "sc", 1, dt, 10); },
      drawFront(w, ctx) {
        const C = w.CD, hot = C.hot && C.n <= 3, col = hot ? "#ef4444" : "#e5e7eb";
        box(ctx, 140, 44, 260, 292, 24, PANEL, LINE);
        ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(270, 176, 92, 0, TAU); ctx.stroke();
        if (C.drain) { ctx.strokeStyle = hot ? "#ef4444" : LIME; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(270, 176, 92, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(C.ring)); ctx.stroke(); }
        ctx.save(); ctx.translate(270, 178); ctx.scale(C.sc, C.sc);
        if (hot && C.n > 0) glow(ctx, 0, 0, 90, "239,68,68", 0.35);
        txt(ctx, C.n > 0 ? String(C.n) : "0", 0, 0, 84, col);
        ctx.restore();
        txt(ctx, L("seconds left", "초 남음"), 270, 300, 16, DIM, "center", 700);
        if (C.up > 0.01) {
          ctx.save(); ctx.translate(270, 176); ctx.scale(C.up, C.up);
          box(ctx, -130, -36, 260, 72, 16, "#ef4444");
          txt(ctx, L("TIME UP!", "시간 끝!"), 0, 2, 38, "#fff");
          ctx.restore();
        }
      },
      steps: [
        {
          id: "drain", name: { en: "Draining Ring", ko: "줄어드는 고리" }, param: "smooth, not stepped",
          cap: { en: "A ring that *drains smoothly*. Time feels like it flows.", ko: "고리가 *계속 줄어요*. 시간이 흐르는 게 보여요." },
          tick(w, C) { C.drain = true; w.tween(C, { ring: Math.max(0, C.n - 1) / 6 + 0.001 }, 0.7, "lin"); },
        },
        {
          id: "pulse", name: { en: "Tick Pulse", ko: "초마다 톡" }, param: "scale 1.35",
          cap: { en: "Every second the number *pulses*.", ko: "1초마다 숫자가 *톡* 커져요." },
          tick(w, C) { C.sc = C.n <= 3 ? 1.5 : 1.25; },
        },
        {
          id: "hot", name: { en: "Turn Red at 3", ko: "3초부터 빨강" }, param: "≤3s red + glow",
          cap: { en: "Last *3 seconds* go *red*. The color says hurry.", ko: "마지막 *3초*는 *빨갛게*. 색이 재촉해요." },
          tick(w, C) { C.hot = true; },
        },
        {
          id: "panic", name: { en: "Edge Pulse", ko: "가장자리 두근" }, param: "vignette .45 + shake",
          cap: { en: "The *screen edges* throb with each final second.", ko: "마지막 몇 초는 *화면 가장자리*가 두근두근." },
          tick(w, C) { if (C.n <= 3) { w.vignette(0.45); w.shake(0.12); } },
        },
        {
          id: "timeup", name: { en: "TIME UP Slam", ko: "시간 끝 쾅" }, param: "scale 2 → 1 · flash",
          cap: { en: "At zero: *slam* a banner. Don't just stop at 0.", ko: "0에서 그냥 멈추지 말고 *쾅* 배너." },
          timeup(w, C) { C.up = 2; w.tween(C, { up: 1 }, 0.2, "in", () => { w.shake(0.5); w.flash("255,80,80", 0.4); }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tock → higher at 3",
          cap: { en: "*Tock* each second. *Higher and louder* near the end.", ko: "1초마다 *똑*. 끝으로 갈수록 *높고 크게*." },
          tick(w, C) { if (C.n > 3) w.sfx.tock(); else w.sfx.blip(8 + (3 - C.n) * 3); },
          timeup(w) { w.sfx.boom(); },
        },
      ],
    },

    /* 25 ───── 인벤토리 끌어다 놓기 ───── */
    {
      id: "ui-drag", cat: "ui", view: "ui",
      title: { en: "Make drag-and-drop *snap*", ko: "끌어다 놓기를 *착* 붙게" },
      intro: { en: "Item vanishes. Item *reappears*.", ko: "아이템이 사라졌다가 *다시 나타나요*." },
      interval: 1.6, stepDur: 3.8,
      drawFloor() {},
      setup(w) {
        w.DG = { from: 0, to: 0, drag: false, x: dragSlot(0).x, y: dragSlot(0).y, lift: 0, rot: 0, vx: 0, sx: 1, sy: 1, hot: -1 };
        w.T = tap();
      },
      fire(w) {
        const D = w.DG, T = w.T;
        D.from = D.to; do { D.to = Math.floor(Math.random() * 8); } while (D.to === D.from);
        const a = dragSlot(D.from), b = dragSlot(D.to);
        T.x = a.x; T.y = a.y; T.a = 1; T.p = 1; T.hold = true;
        D.drag = true; D.x = a.x; D.y = a.y; w.emit("grab", D);
        w.after(0.15, () => w.tween(T, { x: b.x, y: b.y }, 0.8, "inout", () => {
          D.drag = false; T.hold = false; T.p = 1;
          if (!w.on("follow")) { D.x = b.x; D.y = b.y; }
          w.emit("drop", D, b);
        }));
      },
      update(w, dt) {
        const D = w.DG; tapTick(w.T, dt);
        ease(D, "sx", 1, dt, 10); ease(D, "sy", 1, dt, 10);
      },
      drawFront(w, ctx) {
        const D = w.DG;
        box(ctx, 70, 50, 400, 280, 20, PANEL, LINE);
        txt(ctx, L("Bag", "가방"), 96, 80, 18, "#fff", "left");
        for (let i = 0; i < 8; i++) {
          const p = dragSlot(i), hot = D.hot === i;
          if (hot) glow(ctx, p.x, p.y, 60, "198,244,50", 0.35);
          box(ctx, p.x - 38, p.y - 38, 76, 76, 12, hot ? "#2f3a17" : PANEL2, hot ? LIME : LINE, hot ? 3 : 2);
        }
        if (D.drag && D.lift > 0.05) { const p = dragSlot(D.from); ctx.globalAlpha = 0.25; swordIcon(ctx, p.x, p.y, 28); ctx.globalAlpha = 1; }
        const hide = D.drag && !w.on("follow");
        if (!hide) {
          const s = 1 + D.lift * 0.3;
          if (D.lift > 0.05) { ctx.fillStyle = `rgba(0,0,0,${0.35 * D.lift})`; ctx.beginPath(); ctx.ellipse(D.x + 10, D.y + 30, 30, 10, 0, 0, TAU); ctx.fill(); }
          ctx.save(); ctx.translate(D.x, D.y - D.lift * 12); ctx.rotate(D.rot); ctx.scale(s * D.sx, s * D.sy);
          swordIcon(ctx, 0, 0, 28); ctx.restore();
        }
      },
      drawHud(w, ctx) { drawTap(ctx, w.T); },
      steps: [
        {
          id: "follow", name: { en: "Stick to Finger", ko: "손가락에 붙기" }, param: "every frame",
          cap: { en: "The item *rides under the finger*. You're carrying it.", ko: "아이템이 *손가락에 붙어* 따라와요." },
          update(w) { const D = w.DG; if (D.drag) { D.x = w.T.x; D.y = w.T.y; } },
        },
        {
          id: "lift", name: { en: "Pick Up", ko: "집어 들기" }, param: "scale 1.3 · shadow",
          cap: { en: "*Lift* it off the grid: bigger, with a *shadow*.", ko: "칸에서 *들어 올려요*. 커지고 *그림자*." },
          grab(w, D) { w.tween(D, { lift: 1 }, 0.12, "out"); },
          drop(w, D) { w.tween(D, { lift: 0 }, 0.12, "in"); },
        },
        {
          id: "tilt", name: { en: "Swing Tilt", ko: "흔들리는 기울기" }, param: "rot = vx × 0.0012",
          cap: { en: "It *tilts* with the motion, like it has weight.", ko: "움직이는 쪽으로 *기울어요*. 무게가 느껴져요." },
          update(w, dt) {
            const D = w.DG, vx = (w.T.x - (D.px ?? w.T.x)) / Math.max(dt, 1e-3); D.px = w.T.x;
            D.rot += (clamp(vx * 0.0012, -0.6, 0.6) * (D.drag ? 1 : 0) - D.rot) * Math.min(1, dt * 10);
          },
        },
        {
          id: "target", name: { en: "Light the Target", ko: "놓을 칸 표시" }, param: "slot under finger",
          cap: { en: "The slot *under the finger lights up*. No guessing.", ko: "*손가락 밑 칸*이 빛나요. 어디 놓일지 알아요." },
          update(w) { const D = w.DG; D.hot = D.drag ? dragHit(w.T.x, w.T.y) : -1; },
        },
        {
          id: "snap", name: { en: "Snap In", ko: "착 붙기" }, param: "spring + squash",
          cap: { en: "On release it *springs* into the slot and *squashes*.", ko: "놓으면 칸으로 *착* 붙고 *찌그러져요*." },
          drop(w, D, b) { w.tween(D, { x: b.x, y: b.y }, 0.18, "back"); D.sx = 1.3; D.sy = 0.75; ring(w, b.x, b.y, 30, 60, "198,244,50", 0.3, 5); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pick / thunk",
          cap: { en: "Light *pick* up, solid *thunk* down.", ko: "집을 때 *톡*, 놓을 때 *턱*." },
          grab(w) { w.sfx.clickUp(); },
          drop(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 26 ───── 등급 테두리 ───── */
    {
      id: "ui-rarity", cat: "ui", view: "ui",
      title: { en: "Make rarity *readable*", ko: "등급이 *한눈에* 보이게" },
      intro: { en: "Common or legendary? *Same box.*", ko: "일반이에요, 전설이에요? *똑같은 상자*." },
      interval: 2.0, stepDur: 3.8,
      drawFloor() {},
      setup(w) { w.RA = { cards: [0, 1, 2, 3].map(i => ({ i, sc: 1, y: 0, a: 1 })), frame: false, fill: false, aura: false }; },
      fire(w) {
        const R = w.RA;
        R.cards.forEach((c, i) => { c.sc = 1; c.y = 0; c.a = 1; w.emit("deal", c, i); });
      },
      update(w, dt) {},
      drawFront(w, ctx) {
        const R = w.RA, t = w.time;
        box(ctx, 40, 44, 460, 292, 18, "#13161d", LINE);
        R.cards.forEach((c, i) => {
          const x = 110 + i * 107, y = 186 + c.y, col = RAR[i];
          ctx.save(); ctx.globalAlpha = clamp(c.a); ctx.translate(x, y); ctx.scale(c.sc, c.sc);
          if (R.aura && i >= 2) glow(ctx, 0, 0, 90, col, (i === 3 ? 0.5 : 0.3) * (0.75 + 0.25 * Math.sin(t * 4 + i)));
          let bg = PANEL2;
          if (R.fill) { const g = ctx.createLinearGradient(0, -80, 0, 80); g.addColorStop(0, `rgba(${col},0.55)`); g.addColorStop(1, "#1d2029"); bg = g; }
          box(ctx, -46, -80, 92, 160, 12, bg, R.frame ? `rgb(${col})` : "#4b5563", R.frame ? 4 : 2);
          if (R.shine && i >= 2) {
            const per = 2 * (92 + 160), d = ((t * (i === 3 ? 260 : 170)) % per);
            const p = d < 92 ? [-46 + d, -80] : d < 252 ? [46, -80 + d - 92] : d < 344 ? [46 - (d - 252), 80] : [-46, 80 - (d - 344)];
            glow(ctx, p[0], p[1], 18, "255,255,255", 0.95);
          }
          drawGem(ctx, [0, 1, 4, 3][i], 0, -16, 26);
          txt(ctx, L(["COMMON", "RARE", "EPIC", "LEGEND"][i], ["일반", "희귀", "영웅", "전설"][i]), 0, 50, 13, R.frame ? `rgb(${col})` : DIM);
          ctx.restore();
        });
      },
      steps: [
        {
          id: "frame", name: { en: "Color Frame", ko: "등급 색 테두리" }, param: "gray·blue·purple·gold",
          cap: { en: "One *color per rarity*. Players learn it in seconds.", ko: "*등급마다 색* 하나. 금방 외워요." },
          deal(w) { w.RA.frame = true; },
        },
        {
          id: "fill", name: { en: "Tinted Fill", ko: "배경 물들이기" }, param: "gradient 55%",
          cap: { en: "Tint the *background* too, fading down.", ko: "*배경*도 위에서 아래로 물들여요." },
          deal(w) { w.RA.fill = true; },
        },
        {
          id: "shine", name: { en: "Running Light", ko: "테두리 빛 달리기" }, param: "epic+ only",
          cap: { en: "Higher tiers get a *light running* around the frame.", ko: "높은 등급은 테두리에 *빛이 달려요*." },
          deal(w) { w.RA.shine = true; },
        },
        {
          id: "aura", name: { en: "Pulsing Aura", ko: "두근대는 오라" }, param: "epic .3 · legend .5",
          cap: { en: "Epic and up *glow*. Legendary glows *brightest*.", ko: "영웅부터 *빛나요*. 전설이 *제일* 밝게." },
          deal(w) { w.RA.aura = true; },
        },
        {
          id: "motes", name: { en: "Rising Motes", ko: "피어오르는 빛가루" }, param: "legend only",
          cap: { en: "Only *legendary* gets *floating sparkles*. Save it for the top.", ko: "*전설*만 *빛가루*. 최고 등급에만 써요." },
          update(w, dt) {
            if (Math.random() < dt * 16) w.spawn({ type: "glow", x: 431 + rand(-40, 40), y: 260, vy: rand(-110, -60), size: rand(4, 7), size1: 0, life: rand(0.8, 1.2), color: "253,224,71" });
          },
        },
        {
          id: "deal", name: { en: "Deal by Tier", ko: "등급순 등장" }, param: "low → high · 120ms",
          cap: { en: "Deal them *in order*. The best one *lands last and biggest*.", ko: "*순서대로* 놓고, 최고 등급은 *마지막에 크게*." },
          deal(w, c, i) { c.a = 0; c.y = -30; w.after(i * 0.12, () => { c.sc = i === 3 ? 1.5 : 1.15; w.tween(c, { a: 1, y: 0, sc: 1 }, 0.3, "back"); }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch by tier",
          cap: { en: "Each tier sounds *a step higher*.", ko: "등급이 오를수록 소리도 *한 단계 위*." },
          deal(w, c, i) { w.after(i * 0.12, () => (i === 3 ? w.sfx.ping() : w.sfx.chime(i * 4))); },
        },
      ],
    },

    /* 27 ───── NEW 해금 배지 ───── */
    {
      id: "ui-new", cat: "ui", view: "ui",
      title: { en: "Make unlocks *announce* themselves", ko: "새로 열린 걸 *알리기*" },
      intro: { en: "Something unlocked. *Where?*", ko: "뭔가 열렸대요. *어디요?*" },
      interval: 1.4, stepDur: 3.8,
      drawFloor() {},
      setup(w) {
        w.NW = { k: 0, tab: 0, tabSc: 1, cells: [0, 1, 2, 3, 4, 5].map(i => ({ i, open: i < 2, isNew: false, sh: 0, flash: 0, sc: 1, bsc: 1 })) };
      },
      fire(w) {
        const N = w.NW;
        let c = N.cells.find(q => !q.open);
        if (!c) { N.cells.forEach((q, i) => { q.open = i < 2; q.isNew = false; }); N.tab = 0; c = N.cells[2]; }
        N.hold = 0; w.emit("crack", c, newPos(c.i));
        w.after(N.hold, () => { c.open = true; c.isNew = true; w.emit("unlock", c, newPos(c.i)); });
      },
      update(w, dt) {
        const N = w.NW;
        for (const c of N.cells) { c.sh = Math.max(0, c.sh - dt * 3); c.flash = Math.max(0, c.flash - dt * 3); ease(c, "sc", 1, dt, 9); }
        ease(N, "tabSc", 1, dt, 9);
      },
      drawFront(w, ctx) {
        const N = w.NW;
        box(ctx, 70, 44, 400, 292, 20, PANEL, LINE);
        txt(ctx, L("Skills", "스킬"), 100, 76, 20, "#fff", "left");
        if (N.tab) { ctx.save(); ctx.translate(166, 66); ctx.scale(N.tabSc, N.tabSc); ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.restore(); }
        for (const c of N.cells) {
          const p = newPos(c.i), sx = Math.sin(w.time * 70) * 5 * c.sh;
          ctx.save(); ctx.translate(p.x + sx, p.y); ctx.scale(c.sc, c.sc);
          box(ctx, -44, -44, 88, 88, 16, c.open ? "#2b3142" : "#1a1d25", LINE);
          if (c.open) drawGem(ctx, c.i % 5, 0, 0, 26);
          else {
            ctx.globalAlpha = 0.35; drawGem(ctx, c.i % 5, 0, 0, 26); ctx.globalAlpha = 1;
            ctx.fillStyle = "rgba(10,12,18,0.55)"; ctx.fillRect(-44, -44, 88, 88);
            ctx.fillStyle = "#9ca3af"; box(ctx, -13, -4, 26, 20, 4, "#9ca3af");
            ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -6, 9, Math.PI, 0); ctx.stroke();
          }
          if (c.flash > 0) box(ctx, -44, -44, 88, 88, 16, `rgba(255,255,255,${c.flash})`);
          ctx.restore();
          if (c.isNew) {
            const bob = N.bob ? Math.sin(w.time * 6 + c.i) * 3 : 0;
            ctx.save(); ctx.translate(p.x + 34, p.y - 40 + bob); ctx.scale(c.bsc, c.bsc);
            if (N.big) { box(ctx, -24, -11, 48, 22, 11, "#ef4444"); txt(ctx, "NEW", 0, 1, 12, "#fff"); if (N.gleam) { const k = (w.time * 1.2 + c.i * 0.3) % 1.4; if (k < 1) { ctx.save(); ctx.beginPath(); ctx.roundRect(-24, -11, 48, 22, 11); ctx.clip(); ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.rotate(0.4); ctx.fillRect(-30 + k * 60, -20, 8, 40); ctx.restore(); } } }
            else txt(ctx, "new", 0, 0, 11, DIM, "center", 600);
            ctx.restore();
          }
        }
      },
      steps: [
        {
          id: "break", name: { en: "Break the Lock", ko: "자물쇠 부수기" }, param: "shake 0.3s → shatter",
          cap: { en: "The lock *rattles*, then *shatters*. Anticipation first.", ko: "자물쇠가 *덜덜*, 그리고 *와장창*. 기대감 먼저." },
          crack(w, c) { c.sh = 1; w.NW.hold = 0.32; },
          unlock(w, c, p) { for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: p.x + rand(-10, 10), y: p.y, vx: rand(-260, 260), vy: rand(-380, -120), g: 1300, vr: rand(-15, 15), life: 0.7, size: rand(4, 7), color: "156,163,175" }); },
        },
        {
          id: "reveal", name: { en: "Flash Reveal", ko: "번쩍 공개" }, param: "white + scale 1.3",
          cap: { en: "The icon *flashes white* and *pops* into color.", ko: "아이콘이 *하얗게 번쩍*, 색이 *톡*." },
          unlock(w, c, p) { c.flash = 1; c.sc = 1.3; ring(w, p.x, p.y, 40, 90, "255,255,255", 0.35, 6); },
        },
        {
          id: "badge", name: { en: "Red NEW Badge", ko: "빨간 NEW 배지" }, param: "pill · scale 0 → 1",
          cap: { en: "A loud *red NEW* badge *pops* on the corner.", ko: "모서리에 *빨간 NEW*가 *톡*." },
          unlock(w, c) { w.NW.big = true; c.bsc = 0; w.after(0.1, () => w.tween(c, { bsc: 1 }, 0.3, "back")); },
        },
        {
          id: "alive", name: { en: "Bob + Gleam", ko: "둥실 + 반짝" }, param: "±3px · sweep 1.4s",
          cap: { en: "The badge *bobs* and *gleams* until you look.", ko: "볼 때까지 배지가 *둥실둥실*, *반짝*." },
          unlock(w) { w.NW.bob = true; w.NW.gleam = true; },
        },
        {
          id: "tab", name: { en: "Tab Dot", ko: "탭에 빨간 점" }, param: "dot pop 1.8",
          cap: { en: "Also mark the *tab*. Players find it from anywhere.", ko: "*탭*에도 표시. 어디서든 찾아와요." },
          unlock(w) { const N = w.NW; N.tab = 1; N.tabSc = 1.8; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rattle → chime",
          cap: { en: "A *rattle*, a *crack*, then a bright *chime*.", ko: "*달그락*, *깨짐*, 밝은 *띵*." },
          crack(w) { w.sfx.rattle(); },
          unlock(w) { w.sfx.pop(); w.sfx.chime(7); },
        },
      ],
    },

    /* 28 ───── 일시정지 메뉴 블러 ───── */
    {
      id: "ui-pause", cat: "ui", view: "ui",
      title: { en: "Make pausing feel *calm*", ko: "일시정지를 *차분하게*" },
      intro: { en: "Paused. A box *on top of chaos*.", ko: "일시정지. *정신없는 화면* 위에 상자 하나." },
      interval: 2.1, stepDur: 4.0,
      drawFloor() {},
      setup(w) {
        w.PA = { on: 0, spd: 1, gt: 0, dim: 0, blur: 0, my: 0, ma: 1, btn: [1, 1, 1] };
        w.hero = w.actor("hero", { home: 150 }); w.foe = w.actor("foe", { home: 400 });
        w.T = tap();
      },
      fire(w) {
        const P = w.PA;
        tapAt(w.T, 478, 62);
        const at = seq(w, P);
        P.on = 1; w.emit("pause", P);
        at(1.6, () => { P.on = 0; w.emit("resume", P); });
      },
      update(w, dt) {
        const P = w.PA; tapTick(w.T, dt);
        if (!w.on("ease")) P.spd = P.on ? 0 : 1;
        P.gt += dt * P.spd;
        w.hero.oy = -Math.abs(Math.sin(P.gt * 6)) * 40; w.foe.ox = Math.sin(P.gt * 4) * 40;
        if (P.spd > 0.2 && Math.random() < dt * 30 * P.spd) w.spawn({ type: "spark", x: rand(80, 460), y: rand(60, 260), vx: rand(-300, 300), vy: rand(-300, 300), drag: 3, life: 0.3, size: 2.5, color: pick(["253,224,71", "248,113,113", "125,211,252"]) });
      },
      drawBack(w, ctx) {
        const P = w.PA;
        for (let i = 0; i < 5; i++) { const x = 90 + ((P.gt * 120 + i * 100) % 380); coinIcon(ctx, x, 110 + Math.sin(P.gt * 5 + i) * 20, 10); }
        ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(20, G - 1, 500, 2);
      },
      drawHud(w, ctx) {
        const P = w.PA;
        if (P.blur > 0.02) {
          const m = ctx.getTransform();
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.filter = `blur(${(P.blur * 7 * m.a).toFixed(1)}px)`;
          ctx.drawImage(ctx.canvas, m.e, m.f, 540 * m.a, 360 * m.d, m.e, m.f, 540 * m.a, 360 * m.d);
          ctx.restore();
        }
        if (P.dim > 0.01) { ctx.fillStyle = `rgba(8,10,16,${P.dim})`; ctx.fillRect(0, 0, 540, 360); }
        box(ctx, 456, 40, 44, 44, 12, PANEL2, LINE);
        ctx.fillStyle = "#fff"; ctx.fillRect(470, 51, 6, 22); ctx.fillRect(481, 51, 6, 22);
        if (P.on || (P.anim && P.ma > 0.01)) {
          {
            ctx.save(); ctx.globalAlpha = clamp(P.ma); ctx.translate(0, P.my);
            box(ctx, 160, 70, 220, 230, 20, PANEL, "rgba(255,255,255,0.2)");
            txt(ctx, L("PAUSED", "일시정지"), 270, 106, 24, "#fff");
            L(["Resume", "Settings", "Quit"], ["계속하기", "설정", "나가기"]).forEach((s, i) => {
              const k = clamp(P.btn[i]);
              ctx.globalAlpha = clamp(P.ma) * k;
              box(ctx, 186 + (1 - k) * 30, 136 + i * 52, 168, 40, 12, i === 0 ? LIME : PANEL2);
              txt(ctx, s, 270 + (1 - k) * 30, 156 + i * 52, 16, i === 0 ? "#0b0c10" : "#e5e7eb");
            });
            ctx.restore();
          }
        }
        drawTap(ctx, w.T);
      },
      steps: [
        {
          id: "dim", name: { en: "Dim the Game", ko: "게임을 어둡게" }, param: "black 55%",
          cap: { en: "*Dim* the game. The menu becomes the only bright thing.", ko: "게임을 *어둡게*. 메뉴만 밝게 남아요." },
          pause(w, P) { w.tween(P, { dim: 0.55 }, 0.25, "out"); },
          resume(w, P) { w.tween(P, { dim: 0 }, 0.2, "in"); },
        },
        {
          id: "blur", name: { en: "Blur Behind", ko: "뒤를 흐리게" }, param: "blur 7px",
          cap: { en: "*Blur* it too. Busy details stop pulling your eye.", ko: "*흐리게*도. 복잡한 화면이 눈을 안 끌어요." },
          pause(w, P) { w.tween(P, { blur: 1 }, 0.25, "out"); },
          resume(w, P) { w.tween(P, { blur: 0 }, 0.2, "in"); },
        },
        {
          id: "ease", name: { en: "Ease to a Stop", ko: "천천히 멈추기" }, param: "speed 1 → 0 · 300ms",
          cap: { en: "Time *slows to a stop* instead of freezing dead.", ko: "뚝 끊지 말고 시간이 *스르르 멈춰요*." },
          pause(w, P) { w.tween(P, { spd: 0 }, 0.3, "out"); },
          resume(w, P) { w.tween(P, { spd: 1 }, 0.3, "in"); },
        },
        {
          id: "drop", name: { en: "Menu Drops In", ko: "메뉴 내려오기" }, param: "−40px · back",
          cap: { en: "The panel *drops in* softly instead of appearing.", ko: "판이 툭 뜨지 말고 *부드럽게 내려와요*." },
          pause(w, P) { P.anim = true; P.my = -40; P.ma = 0; w.tween(P, { my: 0, ma: 1 }, 0.3, "back"); },
          resume(w, P) { w.tween(P, { my: 30, ma: 0 }, 0.18, "in"); },
        },
        {
          id: "buttons", name: { en: "Buttons in Order", ko: "버튼 차례로" }, param: "70ms apart",
          cap: { en: "Buttons arrive *one by one*. *Resume* first.", ko: "버튼이 *하나씩*. *계속하기*가 먼저." },
          pause(w, P) { P.btn = [0, 0, 0]; P.btn.forEach((_, i) => w.after(0.12 + i * 0.07, () => w.tween(P.btn, { [i]: 1 }, 0.22, "out"))); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch down / up",
          cap: { en: "A *falling* tone to pause, *rising* to resume.", ko: "멈출 때 *내려가는* 소리, 다시 갈 때 *올라가는* 소리." },
          pause(w) { w.play(() => tn({ type: "triangle", f: 600, f2: 200, dur: 0.25, vol: 0.2 })); },
          resume(w) { w.play(() => tn({ type: "triangle", f: 200, f2: 600, dur: 0.2, vol: 0.2 })); },
        },
      ],
    },
  );
})();

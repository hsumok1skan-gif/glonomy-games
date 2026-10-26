"use strict";
/* casual — 리듬·하이퍼캐주얼·아케이드 */
(() => {
  // 먼지: 블룸에 하얗게 번지지 않도록 바닥 레이어(under)에 그림
  const dirt = (w, x, y, n, dir = 0, col = "150,140,130") => { for (let i = 0; i < n; i++) w.spawn({ type: "smoke", under: true, x: x + rand(-10, 10), y: y - rand(0, 6), vx: (dir || (Math.random() < 0.5 ? -1 : 1)) * rand(40, 180), vy: rand(-60, -10), drag: 3, size: rand(4, 8), size1: rand(12, 20), life: rand(0.35, 0.6), color: col }); };
  /* ───── 파일 안에서만 쓰는 도우미 ───── */
  const RB = ["244,63,94", "251,146,60", "250,204,21", "74,222,128", "56,189,248", "192,132,252"];
  const FONT = 'Pretendard, "Apple SD Gothic Neo", sans-serif';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // 테두리 있는 글자
  const T = (ctx, s, x, y, size, col = "#fff", align = "center", lw = 0.18) => {
    ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.lineWidth = size * lw; ctx.strokeStyle = "rgba(10,12,20,0.92)";
    ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
  };
  const ring = (w, x, y, r0, r1, col, life = 0.35, lw = 6, flat = false) => w.spawn({ type: "ring", x, y, size: r0, size1: r1, life, w: lw, color: col, flat });
  const popText = (w, x, y, text, col = "#fff", size = 28, vy = -90) => w.spawn({ type: "text", text, x, y, vy, life: 0.8, size, color: col });
  const confetti = (w, x, y, n, sp = [220, 560], a0 = -Math.PI, a1 = 0, life = 1.3) => {
    for (let i = 0; i < n; i++) {
      const a = rand(a0, a1), v = rand(sp[0], sp[1]);
      w.spawn({ type: "chunk", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, drag: 1.2, vr: rand(-18, 18), size: rand(4, 7), life: rand(life * 0.7, life), color: pick(RB), hold: true });
    }
  };
  const shards = (w, x, y, n, col, sp = [160, 420]) => {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(sp[0], sp[1]);
      w.spawn({ type: "chunk", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1100, drag: 1.5, vr: rand(-20, 20), size: rand(4, 8), life: rand(0.5, 0.8), color: col });
    }
  };
  const coinSpray = (w, x, y, n, spread, up, gy = 0) => {
    for (let i = 0; i < n; i++) w.spawn({ type: "ghost", img: SPR.coin.c, top: true, w: 22, h: 22, alpha0: 1, add: false, hold: true, x: x + rand(-20, 20), y, vx: rand(-spread, spread), vy: -rand(up[0], up[1]), g: 1400, ground: !!gy, gy, bounce: 0.45, life: 1.4 });
  };
  const coinAt = (ctx, x, y, s, spin = 1) => { const c = SPR.coin.c; ctx.save(); ctx.translate(x, y); ctx.scale(spin, 1); ctx.drawImage(c, -s / 2, -s / 2, s, s); ctx.restore(); };
  const panel = (ctx, x, y, wd, ht, r = 14, fill = "rgba(255,255,255,0.05)", stroke = "rgba(255,255,255,0.12)") => {
    ctx.beginPath(); ctx.roundRect(x, y, wd, ht, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke();
  };

  /* 9번 구멍: 물건 흩뿌리기 */
  const casualHoleFill = w => {
    w.obj = [];
    const pts = [[110, 100], [200, 80], [350, 90], [440, 120], [120, 260], [220, 290], [330, 280], [450, 260], [170, 180], [390, 190]];
    pts.forEach(([x, y], i) => w.obj.push({ x: x + rand(-10, 10), y: y + rand(-10, 10), s: rand(22, 34), c: RB[i % 6], round: i % 3 === 0, rot: rand(0, 1), sc: 1, gone: false }));
  };
  /* 10번 과일 */
  const FRUITS = [["74,160,60", "244,63,94", "244,63,94"], ["251,146,60", "253,186,116", "251,146,60"], ["220,38,38", "254,240,200", "253,224,71"], ["250,204,21", "254,249,195", "250,204,21"], ["139,92,246", "233,213,255", "168,85,247"]];
  const casualFruitToss = w => {
    const n = 2 + (w.wave++ % 3);
    for (let i = 0; i < n; i++) {
      const [c, inn, juice] = pick(FRUITS);
      w.F.push({ x: 150 + i * (240 / Math.max(1, n - 1)) + rand(-15, 15), y: 380, vx: rand(-40, 40), vy: rand(-760, -700), r: rand(24, 30), c, in: inn, juice, rot: rand(0, 3), vr: rand(-3, 3) });
    }
  };
  const casualFruitDraw = (ctx, f, side) => {
    ctx.beginPath();
    if (side) ctx.arc(side * 4, 0, f.r, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? Math.PI * 1.5 : Math.PI / 2); else ctx.arc(0, 0, f.r, 0, TAU);
    ctx.closePath(); ctx.fillStyle = `rgb(${f.c})`; ctx.fill();
    if (side) { ctx.fillStyle = `rgb(${f.in})`; ctx.fillRect(side < 0 ? side * 4 - 4 : side * 4, -f.r * 0.85, 4, f.r * 1.7); ctx.beginPath(); ctx.arc(side * 4, 0, f.r * 0.82, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(-f.r * 0.35, -f.r * 0.4, f.r * 0.3, f.r * 0.18, -0.6, 0, TAU); ctx.fill(); }
  };
  /* 8번 탑: 바닥 몇 층 깔고 시작 */
  const casualStackReset = w => {
    w.tw = [0, 1, 2, 3].map(() => ({ x: 270, w: 150, sy: 1, glow: 0 }));
    w.cyT = 0; w.streak = 0;
  };
  /* 11번 합치기 공 */
  const casualR = v => 16 + Math.log2(v) * 4.5;
  const casualHue = v => RB[(Math.log2(v) - 1) % 6];
  const casualBall = (ctx, x, y, b) => {
    const r = casualR(b.v) * (b.sc || 1), sy = b.sy || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(2 - sy, sy);
    ctx.fillStyle = b.hue ? `rgb(${b.hue})` : "#6b7280"; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.35, r * 0.2, -0.5, 0, TAU); ctx.fill();
    T(ctx, String(b.v), 0, 2, Math.max(14, r * 0.8), "#fff");
    ctx.restore();
  };

  /* 14번 침략자 */
  const INV = [".X....X.", "..XXXX..", ".XXXXXX.", "XXXXXXXX", "X.XXXX.X", "X.X..X.X"];
  const casualInvaders = w => {
    w.inv = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) w.inv.push({ x: 145 + c * 50, y: 124 + r * 44, c: RB[5 - r], pts: [300, 200, 100][r], alive: true });
  };
  const casualInvader = (ctx, v) => {
    // 각진 드론 (특정 게임 캐릭터를 닮지 않게 단순한 마름모)
    ctx.fillStyle = `rgb(${v.c})`; ctx.beginPath(); ctx.moveTo(v.x, v.y - 13); ctx.lineTo(v.x + 17, v.y); ctx.lineTo(v.x, v.y + 13); ctx.lineTo(v.x - 17, v.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.moveTo(v.x, v.y - 13); ctx.lineTo(v.x + 17, v.y); ctx.lineTo(v.x, v.y); ctx.closePath(); ctx.fill();
  };
  /* 16번 슬롯 그림 */
  const casualSym = (ctx, i, x, y, sx, sy) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    if (i === 0) T(ctx, "7", 0, 2, 46, "#e11d48", "center", 0.12);
    else if (i === 1) { ctx.strokeStyle = "#15803d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-4, -18, 6, -18); ctx.moveTo(10, 4); ctx.quadraticCurveTo(10, -12, 6, -18); ctx.stroke(); ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(-10, 8, 10, 0, TAU); ctx.arc(11, 10, 10, 0, TAU); ctx.fill(); }
    else if (i === 2) { rr(ctx, -30, -13, 60, 26, 5, "#111827"); label(ctx, "BAR", 0, 1, 17, "#fde047"); }
    else if (i === 3) { ctx.fillStyle = "#f59e0b"; starPath(ctx, 0, 0, 24); ctx.fill(); }
    else if (i === 4) drawGem(ctx, 1, 0, 0, 20);
    else { const c = SPR.heart.c; ctx.drawImage(c, -20, -18, 40, 37); }
    ctx.restore();
  };
  /* 18번 복권 은박 */
  const casualScratchReset = w => {
    const S = w.S, x = S.cv.getContext("2d");
    x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, 260, 150);
    const g = x.createLinearGradient(0, 0, 260, 150); g.addColorStop(0, "#e2e8f0"); g.addColorStop(0.5, "#94a3b8"); g.addColorStop(1, "#cbd5e1");
    x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, 260, 150, 10); x.fill();
    x.fillStyle = "rgba(255,255,255,0.35)"; x.font = "900 22px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    for (let r = 0; r < 3; r++) x.fillText("SCRATCH  ·  SCRATCH", 130 + (r % 2) * 20, 30 + r * 45);
    Object.assign(S, { cover: 1, shine: -1, sc: 1, tool: null, toolA: 0 });
  };

  /* 19번 캡슐 장난감 */
  const casualCapsule = (ctx, t) => {
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot); ctx.scale(t.sx, t.sy);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(3, 18, 18, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI); ctx.fill();
    ctx.fillStyle = `rgb(${t.c})`; ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(-20, -1.5, 40, 3);
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(-7, -10, 6, 3.5, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  };
  /* 20번 풍선 */
  const casualBalloon = (i, rising) => ({ x: 130 + i * 72, y: rising ? 430 : 110 + (i % 2) * 60, ty: 110 + (i % 2) * 60, c: RB[i], s: 1, ph: rand(0, 6) });
  const casualBalloonDraw = (ctx, b) => {
    const y = b.y + Math.sin(b.ph) * 4;
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x, y + 34 * b.s);
    for (let i = 1; i <= 6; i++) ctx.lineTo(b.x + Math.sin(b.ph + i) * 4, y + 34 * b.s + i * 10); ctx.stroke();
    ctx.save(); ctx.translate(b.x, y); ctx.scale(b.s, b.s);
    ctx.fillStyle = `rgb(${b.c})`; ctx.beginPath(); ctx.ellipse(0, 0, 26, 32, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, 34); ctx.lineTo(5, 34); ctx.lineTo(0, 29); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.ellipse(-9, -12, 6, 10, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  };
  const casualDart = (ctx, x, y, a) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1.6, 1.6);
    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-40, -8); ctx.lineTo(-24, 0); ctx.lineTo(-40, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  /* 21번 뽁뽁이 판 */
  const casualWrap = w => {
    w.wrap = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) w.wrap.push({ x: 116 + c * 44 + (r % 2) * 0, y: 116 + r * 42, sx: 1, sy: 1, popped: false, pressing: false, wr: null });
  };
  /* 22번 시계 */
  const casualClock = (ctx, x, y, r) => {
    ctx.fillStyle = "rgba(74,222,128,0.25)"; ctx.beginPath(); ctx.arc(x, y, r + 8, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#22c55e"; ctx.stroke();
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.6); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.45, y + r * 0.1); ctx.stroke();
    T(ctx, "+3", x, y + r + 16, 16, "#4ade80");
  };

  RECIPES.push(
    /* ───────── 1. 리듬 판정 ───────── */
    {
      id: "casual-judge", cat: "casual", view: "ui",
      title: { en: "Make rhythm judgments *pop*", ko: "리듬 판정을 *톡 쏘게*" },
      intro: { en: "PERFECT and MISS look *the same*.", ko: "PERFECT도 MISS도 *똑같아* 보여요." },
      interval: 0.5, stepDur: 3.4,
      drawFloor(w, ctx) {
        const HX = 140, LY = 200;
        ctx.fillStyle = `rgba(${w.laneRed > 0 ? "244,63,94" : "255,255,255"},${0.05 + w.laneRed * 0.25})`; ctx.fillRect(40, LY - 34, 480, 68);
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(40, LY - 35, 480, 2); ctx.fillRect(40, LY + 33, 480, 2);
        if (w.recep > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, HX, LY, 70, w.recepC, w.recep); ctx.globalCompositeOperation = "source-over"; }
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(HX, LY, 28, 0, TAU); ctx.stroke();
      },
      setup(w) { w.notes = []; w.J = { text: "", col: "#e5e7eb", sc: 1, t: 0, shk: 0 }; w.seq = 0; w.laneRed = 0; w.recep = 0; w.recepC = "255,255,255"; },
      fire(w) {
        const n = { x: 540, dead: false, miss: false };
        w.notes.push(n);
        w.after(0.76, () => {
          const k = ["PERFECT", "GREAT", "PERFECT", "MISS"][w.seq++ % 4];
          Object.assign(w.J, { text: k, col: "#e5e7eb", t: 1, sink: false });
          if (k === "MISS") n.miss = true; else n.dead = true;
          w.emit("judge", n, k);
        });
      },
      update(w, dt) {
        for (const n of w.notes) n.x -= 524 * dt;
        w.notes = w.notes.filter(n => !n.dead && n.x > 20);
        const J = w.J; J.t = Math.max(0, J.t - dt * 1.1); J.sc += (1 - J.sc) * Math.min(1, dt * 14); J.shk = Math.max(0, J.shk - dt * 3);
        w.laneRed = Math.max(0, w.laneRed - dt * 1.5); w.recep = Math.max(0, w.recep - dt * 2);
      },
      drawFront(w, ctx) {
        for (const n of w.notes) {
          ctx.globalAlpha = n.miss ? 0.35 : 1;
          ctx.fillStyle = "#f472b6"; ctx.beginPath(); ctx.arc(n.x, 200, 22, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(n.x - 6, 193, 7, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
      },
      drawHud(w, ctx) {
        const J = w.J; if (J.t <= 0) return;
        ctx.save(); ctx.globalAlpha = Math.min(1, J.t * 2);
        ctx.translate(150 + Math.sin(w.time * 70) * J.shk * 12, 110 + (J.sink ? (1 - J.t) * 40 : 0)); ctx.scale(J.sc, J.sc);
        T(ctx, J.text, 0, 0, 30, J.col); ctx.restore();
      },
      steps: [
        {
          id: "color", name: { en: "Judgment Colors", ko: "판정 색" }, param: "gold / cyan / red",
          cap: { en: "Give each grade its *own color*.", ko: "판정마다 *색*을 따로 줘요." },
          judge(w, n, k) { w.J.col = { PERFECT: "#fde047", GREAT: "#38bdf8", MISS: "#f43f5e" }[k]; },
        },
        {
          id: "pop", name: { en: "Scale Pop", ko: "크게 톡" }, param: "1.8× → 1 · 70ms",
          cap: { en: "Slam the word in *big*, then settle.", ko: "글자가 *크게* 박혔다 제자리." },
          judge(w, n, k) { w.J.sc = k === "PERFECT" ? 1.9 : 1.5; },
        },
        {
          id: "ring", name: { en: "Hit Ring", ko: "판정 고리" }, param: "ring 90px · 12 sparks",
          cap: { en: "A *ring* bursts from the hit circle.", ko: "판정 원에서 *고리*가 퍼져요." },
          judge(w, n, k) {
            if (k === "MISS") return;
            const c = k === "PERFECT" ? "253,224,71" : "56,189,248";
            ring(w, 140, 200, 26, k === "PERFECT" ? 110 : 75, c, 0.5, 9);
            w.spawn({ type: "star", x: 140, y: 200, size: k === "PERFECT" ? 60 : 40, life: 0.14, color: "255,255,255" });
            sparks(w, 140, 200, 18, c, [200, 520]);
          },
        },
        {
          id: "flare", name: { en: "Receptor Flare", ko: "판정 원 번쩍" }, param: "glow 70px",
          cap: { en: "The hit circle *lights up* in the grade color.", ko: "판정 원이 판정 *색으로 번쩍*." },
          judge(w, n, k) {
            w.recep = 1;
            w.recepC = { PERFECT: "253,224,71", GREAT: "56,189,248", MISS: "244,63,94" }[k];
          },
        },
        {
          id: "miss", name: { en: "Miss Wobble", ko: "미스는 흔들" }, param: "shake + red lane",
          cap: { en: "MISS *wobbles and sinks*. The lane flashes *red*.", ko: "MISS는 *흔들리며 가라앉고*, 길이 *빨개져요*." },
          judge(w, n, k) { if (k === "MISS") { w.J.shk = 1; w.J.sink = true; w.laneRed = 1; } },
        },
        {
          id: "sound", name: { en: "Graded Sound", ko: "판정별 소리" }, param: "high / mid / buzz",
          cap: { en: "PERFECT rings *high*. MISS goes *bzzt*.", ko: "PERFECT는 *높게 띵*, MISS는 *부웅*." },
          judge(w, n, k) {
            if (k === "PERFECT") w.sfx.chime(7); else if (k === "GREAT") w.sfx.chime(0);
            else w.play(() => tn({ type: "sawtooth", f: 140, f2: 70, dur: 0.22, vol: 0.18 }));
          },
        },
      ],
    },

    /* ───────── 2. 노트 타격 ───────── */
    {
      id: "casual-note", cat: "casual", view: "ui", polished: true,
      title: { en: "Make note hits *burst*", ko: "노트 치는 맛 *터뜨리기*" },
      intro: { en: "Notes hit the line and *vanish*.", ko: "노트가 줄에 닿고 *사라질* 뿐." },
      interval: 0.3, stepDur: 3.3,
      drawFloor(w, ctx) {
        for (let l = 0; l < 4; l++) {
          ctx.fillStyle = l % 2 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)"; ctx.fillRect(142 + l * 64, 40, 64, 260);
        }
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(140, 40, 2, 260); ctx.fillRect(398, 40, 2, 260);
      },
      setup(w) { w.notes = []; w.keys = [0, 1, 2, 3].map(() => ({ lit: 0, sq: 1 })); w.last = 0; },
      fire(w) {
        let l; do { l = (Math.random() * 4) | 0; } while (l === w.last);
        w.last = l; w.notes.push({ l, y: 40 });
      },
      update(w, dt) {
        for (const n of w.notes) { n.y += 640 * dt; if (n.y >= 272 && !n.done) { n.done = true; w.emit("hit", n.l, 174 + n.l * 64, 272); } }
        w.notes = w.notes.filter(n => !n.done);
        for (const k of w.keys) { k.lit = Math.max(0, k.lit - dt * 3); k.sq += (1 - k.sq) * Math.min(1, dt * 14); }
      },
      drawFront(w, ctx) {
        w.keys.forEach((k, l) => {
          const x = 174 + l * 64, h = 22 * k.sq;
          ctx.fillStyle = k.lit > 0 ? `rgba(${RB[l + 1]},${0.3 + k.lit * 0.7})` : "rgba(255,255,255,0.08)";
          ctx.strokeStyle = `rgba(${RB[l + 1]},0.9)`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.roundRect(x - 28, 272 - h / 2, 56, h, 7); ctx.fill(); ctx.stroke();
        });
        for (const n of w.notes) {
          const x = 174 + n.l * 64;
          ctx.fillStyle = `rgb(${RB[n.l + 1]})`; ctx.beginPath(); ctx.roundRect(x - 28, n.y - 9, 56, 18, 7); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillRect(x - 20, n.y - 5, 40, 4);
        }
      },
      steps: [
        {
          id: "key", name: { en: "Key Press", ko: "키 눌림" }, param: "lit + squash .6",
          cap: { en: "The key *lights up* and *squashes*.", ko: "키가 *켜지고* *꾹* 눌려요." },
          hit(w, l) { const k = w.keys[l]; k.lit = 1; k.sq = 0.55; },
        },
        {
          id: "burst", name: { en: "Spark Fan", ko: "불꽃 부채" }, param: "16 sparks · upward",
          cap: { en: "Sparks *fan up* in the note's color.", ko: "노트 색 불꽃이 *위로 부채꼴*." },
          hit(w, l, x, y) {
            for (let i = 0; i < 16; i++) {
              const a = rand(-2.9, -0.25), v = rand(240, 620);
              w.spawn({ type: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 4, size: 3.5, life: rand(0.25, 0.45), color: RB[l + 1] });
            }
          },
        },
        {
          id: "beam", name: { en: "Lane Beam", ko: "레인 빛기둥" }, param: "beam 230px · 250ms",
          cap: { en: "Shoot a *light column* up the lane.", ko: "레인을 따라 *빛기둥*이 솟아요." },
          hit(w, l, x, y) { w.spawn({ type: "beam", x, y, h: 232, size: 34, life: 0.35, color: RB[l + 1] }); },
        },
        {
          id: "star", name: { en: "Flash Star", ko: "별 섬광" }, param: "star 40 + flat ring",
          cap: { en: "A white *star* right on the line.", ko: "판정선 위에 하얀 *별*이 반짝." },
          hit(w, l, x, y) {
            w.spawn({ type: "star", x, y, size: 52, life: 0.16, color: "255,255,255" });
            ring(w, x, y, 20, 70, RB[l + 1], 0.3, 6, true);
          },
        },
        {
          id: "bump", name: { en: "Board Bump", ko: "판 흔들" }, param: "kick 5px down",
          cap: { en: "The whole board *bumps* on each beat.", ko: "칠 때마다 판 전체가 *쿵*." },
          hit(w) { w.kick(0, 5); },
        },
        {
          id: "sound", name: { en: "Lane Pitch", ko: "레인별 음" }, param: "4 lanes · 4 notes",
          cap: { en: "Each lane has its *own note*.", ko: "레인마다 *음*이 달라요." },
          hit(w, l) { w.sfx.blip([1, 5, 8, 13][l]); },
        },
      ],
    },

    /* ───────── 3. 콤보 끊김 ───────── */
    {
      id: "casual-combo-break", cat: "casual", view: "ui",
      title: { en: "Make a combo break *hurt*", ko: "콤보 끊김을 *아프게*" },
      intro: { en: "23 combo… *0*. Nobody noticed.", ko: "23콤보가 *0*. 아무도 몰라요." },
      interval: 2.4, stepDur: 3.8,
      drawFloor() {},
      setup(w) { w.combo = 23; w.tick = 0; w.pause = 0; w.D = null; w.grey = 0; w.bump = 0; },
      fire(w) {
        if (w.pause > 0) return;
        const lost = w.combo;
        w.combo = 0; w.pause = 1.3;
        w.emit("break", lost);
      },
      update(w, dt) {
        w.pause -= dt; w.tick -= dt; w.bump = Math.max(0, w.bump - dt * 6);
        if (w.pause <= 0 && w.tick <= 0) { w.tick = 0.075; w.combo++; w.bump = 1; }
        const D = w.D; if (D) { D.vy += 450 * dt; D.y += D.vy * dt; D.rot += D.vr * dt; if (D.y > 300) w.D = null; }
        w.grey = Math.max(0, w.grey - dt * 0.5); w.missT = Math.max(0, (w.missT || 0) - dt * 0.5);
      },
      drawHud(w, ctx) {
        T(ctx, "COMBO", 270, 92, 22, "rgba(255,255,255,0.7)");
        const s = 1 + w.bump * 0.12;
        ctx.save(); ctx.translate(270, 160); ctx.scale(s, s); T(ctx, String(w.combo), 0, 0, 72, "#fff"); ctx.restore();
        // 노트 레인 (계속 치는 중)
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(110, 262, 320, 30);
        for (let i = 0; i < 8; i++) { const x = 430 - ((w.time * 320 + i * 40) % 320); ctx.fillStyle = `rgb(${RB[i % 6]})`; ctx.beginPath(); ctx.arc(x, 277, 8, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(130, 277, 13, 0, TAU); ctx.stroke();
        if (w.grey > 0) {
          ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha = Math.min(1, w.grey);
          ctx.fillStyle = "#808080"; ctx.fillRect(-60, -60, 660, 480); ctx.restore();
          ctx.fillStyle = `rgba(0,0,0,${w.grey * 0.3})`; ctx.fillRect(-60, -60, 660, 480);
        }
        if (w.D) { ctx.save(); ctx.translate(270 + w.D.x, 160 + w.D.y); ctx.rotate(w.D.rot); T(ctx, String(w.D.v), 0, 0, 72, "#f43f5e"); ctx.restore(); }
        if (w.missT > 0) { const s = 1 + Math.max(0, w.missT - 0.8) * 4; ctx.save(); ctx.globalAlpha = Math.min(1, w.missT * 3); ctx.translate(270, 225); ctx.scale(s, s); T(ctx, "MISS", 0, 0, 46, "#f43f5e"); ctx.restore(); }
      },
      steps: [
        {
          id: "fall", name: { en: "Number Falls", ko: "숫자 추락" }, param: "g 1400 · spin",
          cap: { en: "The old number *falls off* the screen.", ko: "끊긴 숫자가 *툭 떨어져요*." },
          break(w, n) { w.D = { v: n, x: 0, y: 0, vy: -260, rot: 0, vr: rand(-3, 3) }; },
        },
        {
          id: "shatter", name: { en: "Shatter", ko: "산산조각" }, param: "18 shards",
          cap: { en: "It *shatters* into shards.", ko: "숫자가 *와장창* 깨져요." },
          break(w) {
            shards(w, 270, 160, 18, "244,63,94", [200, 520]);
            shards(w, 270, 160, 8, "255,255,255");
          },
        },
        {
          id: "shake", name: { en: "Shake", ko: "흔들림" }, param: "trauma .4",
          cap: { en: "A hard *shake* says \"you blew it\".", ko: "*흔들림*이 \"놓쳤다\"고 말해줘요." },
          break(w) { w.shake(0.4); },
        },
        {
          id: "grey", name: { en: "Color Drain", ko: "색 빠짐" }, param: "desaturate 0.8s",
          cap: { en: "*Drain the color* for a moment.", ko: "잠깐 화면 *색을 빼요*." },
          break(w) { w.grey = 1; w.vignette(0.5); },
        },
        {
          id: "miss", name: { en: "MISS Stamp", ko: "MISS 도장" }, param: "size 46 · red",
          cap: { en: "Stamp a big *MISS* on the spot.", ko: "그 자리에 *MISS*를 쾅." },
          break(w) { w.missT = 1; },
        },
        {
          id: "sound", name: { en: "Fall Sound", ko: "떨어지는 소리" }, param: "600 → 80Hz",
          cap: { en: "A *falling* tone. Let it sting.", ko: "*뚝 떨어지는* 음. 아프게." },
          break(w) {
            w.play(() => {
              tn({ type: "sawtooth", f: 620, f2: 80, dur: 0.45, vol: 0.16 });
              nz({ dur: 0.2, type: "bandpass", f: 900, q: 1.5, vol: 0.3 });
            });
          },
        },
      ],
    },

    /* ───────── 4. 피버 모드 ───────── */
    {
      id: "casual-fever", cat: "casual", view: "ui",
      title: { en: "Make fever mode *explode*", ko: "피버 모드를 *터지게*" },
      intro: { en: "Gauge full. *Fever?* Where?", ko: "게이지 꽉 참. *피버*… 어디요?" },
      interval: 2.6, stepDur: 3.8,
      drawFloor(w, ctx) {
        if (w.bgA > 0.01) {
          const g = ctx.createLinearGradient(0, -40, 540, 400);
          for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsla(${(w.hue + i * 60) % 360},90%,55%,${0.35 * w.bgA})`);
          ctx.fillStyle = g; ctx.fillRect(-60, -60, 660, 480);
        }
      },
      setup(w) { w.g = 0; w.fever = 0; w.hue = 0; w.bgA = 0; w.ban = null; w.score = 0; w.beat = 0; },
      fire(w) {
        w.fever = 0; w.g = 0; w.ban = null;
        for (let i = 0; i < 4; i++) w.after(i * 0.08, () => { w.g = Math.min(100, w.g + 25); w.score += 50; w.emit("hit"); if (w.g >= 100) { w.fever = 2.1; w.emit("start"); } });
      },
      update(w, dt) {
        if (w.fever > 0) { w.fever = Math.max(0, w.fever - dt); w.g = w.fever / 2.1 * 100; w.score += dt * 400; }
        w.bgA += ((w.fever > 0 && w.on("bg") ? 1 : 0) - w.bgA) * Math.min(1, dt * 6);
      },
      drawHud(w, ctx) {
        const on = w.fever > 0;
        T(ctx, String(Math.round(w.score)).padStart(6, "0"), 270, 160, 54, on ? "#fde047" : "#fff");
        if (w.ban) { ctx.save(); ctx.translate(270, 86); ctx.scale(w.ban.sc, w.ban.sc); ctx.rotate(-0.06); T(ctx, "FEVER!!", 0, 0, 52, `hsl(${w.hue % 360},95%,65%)`, "center", 0.22); ctx.restore(); }
        panel(ctx, 110, 262, 320, 26, 13, "rgba(0,0,0,0.5)");
        ctx.fillStyle = on ? "#fde047" : "#f472b6"; ctx.beginPath(); ctx.roundRect(113, 265, 314 * w.g / 100, 20, 10); ctx.fill();
        if (on && !w.ban) T(ctx, "FEVER", 270, 240, 18, "#fde047");
      },
      steps: [
        {
          id: "bg", name: { en: "Rainbow Background", ko: "무지개 배경" }, param: "hue +300°/s",
          cap: { en: "The *whole background* turns into a party.", ko: "*배경 전체*가 파티로 바뀌어요." },
          update(w, dt) { w.hue = (w.hue + dt * 300) % 360; },
        },
        {
          id: "banner", name: { en: "Banner Slam", ko: "글자 쾅" }, param: "3× → 1 · back",
          cap: { en: "*FEVER!!* slams in from huge.", ko: "*FEVER!!* 글자가 크게 쾅." },
          start(w) {
            w.ban = { sc: 3 };
            w.tween(w.ban, { sc: 1 }, 0.3, "back");
            w.after(2.1, () => { if (w.fever <= 0) w.ban = null; });
          },
        },
        {
          id: "rays", name: { en: "Spinning Rays", ko: "회전 빛살" }, param: "14 rays · 2.1s",
          cap: { en: "*Rays* spin behind the score.", ko: "점수 뒤로 *빛살*이 빙글빙글." },
          start(w) { w.spawn({ type: "rays", under: true, x: 270, y: 160, size: 300, n: 14, vr: 1.4, life: 2.1, hold: true, alpha: 0.7, color: "255,240,180" }); },
        },
        {
          id: "punch", name: { en: "Impact", ko: "시작 임팩트" }, param: "zoom .12 · flash",
          cap: { en: "Kick it off with a *flash* and *zoom*.", ko: "*번쩍*하고 *줌*으로 시작해요." },
          start(w) { w.flash("255,255,255", 0.7); w.zoomPunch(0.12); w.shake(0.35); },
        },
        {
          id: "flames", name: { en: "Gauge on Fire", ko: "불붙은 게이지" }, param: "embers / frame",
          cap: { en: "The gauge *burns* while fever lasts.", ko: "피버 동안 게이지가 *활활*." },
          update(w) {
            if (w.fever <= 0) return;
            const x = 113 + rand(0, 314 * w.g / 100);
            w.spawn({ type: "glow", x, y: 268, vy: rand(-160, -60), size: rand(8, 16), size1: 0, life: rand(0.3, 0.5), color: pick(["255,120,40", "255,200,80", "244,63,94"]) });
          },
        },
        {
          id: "pulse", name: { en: "Beat Pulse", ko: "박자 펄스" }, param: "zoom .04 / 0.25s",
          cap: { en: "Everything *pulses* on the beat.", ko: "모든 게 *박자*에 맞춰 둥둥." },
          update(w, dt) {
            if (w.fever <= 0) return;
            w.beat -= dt; if (w.beat <= 0) { w.beat = 0.25; w.zoomPunch(0.04); }
          },
        },
        {
          id: "sound", name: { en: "Fever Sound", ko: "피버 소리" }, param: "sweep + fanfare",
          cap: { en: "A rising *whoosh* into a *fanfare*.", ko: "*슈우욱* 올라가서 *빠밤*." },
          hit(w) { w.sfx.blip(w.g / 10); },
          start(w) { w.sfx.boost(); w.sfx.fanfare(); },
        },
      ],
    },

    /* ───────── 5. 탭 타깃 ───────── */
    {
      id: "casual-tap", cat: "casual", view: "ui",
      title: { en: "Make tap targets *satisfying*", ko: "터치 타깃 *손맛 있게*" },
      intro: { en: "Tap. It's gone. *Did I hit it?*", ko: "톡. 없어짐. *맞힌 거예요?*" },
      interval: 0.55, stepDur: 3.3,
      drawFloor() {},
      setup(w) {
        w.tg = [];
        const spots = [[150, 120], [390, 110], [270, 210], [140, 260], [400, 255]];
        w.spots = spots; w.si = 0;
        for (let i = 0; i < 3; i++) w.tg.push(Object.assign({ sc: 1, fl: 0, c: i }, { x: spots[i][0], y: spots[i][1] }));
        w.si = 3;
      },
      fire(w) {
        const t = w.tg.find(q => !q.dying); if (!t) return;
        w.emit("tap", t);
        if (!t.dying) t.dead = true;
        const s = w.spots[w.si++ % w.spots.length];
        const nt = { x: s[0], y: s[1], sc: 1, fl: 0, c: w.si % 6 };
        w.tg.push(nt); w.emit("appear", nt);
      },
      update(w, dt) { for (const t of w.tg) t.fl = Math.max(0, t.fl - dt * 6); w.tg = w.tg.filter(t => !t.dead); },
      drawFront(w, ctx) {
        for (const t of w.tg) {
          if (t.sc <= 0.01) continue;
          ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.sc, t.sc);
          [[38, RB[t.c]], [27, "255,255,255"], [17, RB[t.c]], [7, "255,255,255"]].forEach(([r, c]) => { ctx.fillStyle = `rgb(${c})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); });
          if (t.fl > 0) { ctx.globalAlpha = Math.min(1, t.fl); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 39, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
      },
      steps: [
        {
          id: "pop", name: { en: "Pop Out", ko: "부풀고 퐁" }, param: "1.35× → 0 · 150ms",
          cap: { en: "Swell *first*, then pop away.", ko: "*살짝 부풀었다* 퐁 사라져요." },
          tap(w, t) {
            t.dying = true;
            w.tween(t, { sc: 1.35 }, 0.05, "out", () => w.tween(t, { sc: 0 }, 0.1, "in", () => { t.dead = true; }));
          },
        },
        {
          id: "flash", name: { en: "White Flash", ko: "하얀 번쩍" }, param: "1 frame",
          cap: { en: "Flash it *white* the instant you tap.", ko: "누른 순간 *하얗게* 번쩍." },
          tap(w, t) { t.fl = 1.3; },
        },
        {
          id: "ring", name: { en: "Ripple", ko: "물결" }, param: "ring 40 → 100",
          cap: { en: "A *ripple* rolls out from the tap.", ko: "누른 자리에서 *물결*이 퍼져요." },
          tap(w, t) { ring(w, t.x, t.y, 40, 100, RB[t.c], 0.35, 7); },
        },
        {
          id: "shards", name: { en: "Color Shards", ko: "색 조각" }, param: "14 chunks",
          cap: { en: "Bits fly off in the *target's color*.", ko: "*타깃 색* 조각이 튀어요." },
          tap(w, t) { shards(w, t.x, t.y, 14, RB[t.c], [200, 480]); },
        },
        {
          id: "score", name: { en: "+100", ko: "+100" }, param: "rise · fade",
          cap: { en: "Show *what you earned*, right there.", ko: "*얻은 점수*를 그 자리에 보여줘요." },
          tap(w, t) { popText(w, t.x, t.y - 20, "+100", "#fde047", 30, -60); },
        },
        {
          id: "appear", name: { en: "Pop In", ko: "통 등장" }, param: "0 → 1 · back",
          cap: { en: "New targets *bounce in*. No popping into view.", ko: "새 타깃은 *통* 튀어나와요." },
          appear(w, t) { t.sc = 0; w.tween(t, { sc: 1 }, 0.32, "back"); },
        },
        {
          id: "sound", name: { en: "Pop Sound", ko: "퐁 소리" }, param: "pop + pitch ±",
          cap: { en: "A crisp *pop*, a little different each time.", ko: "*퐁*. 매번 살짝 다른 높이로." },
          tap(w) { w.sfx.pop(); w.sfx.blip(rand(3, 8)); },
        },
      ],
    },

    /* ───────── 6. 날갯짓 ───────── */
    {
      id: "casual-flap", cat: "casual", view: "side",
      title: { en: "Make a flap feel *alive*", ko: "날갯짓을 *살아 있게*" },
      intro: { en: "Up, down. A *box* on a string.", ko: "올라가고 내려가고. *상자* 같아요." },
      interval: 0.42, stepDur: 3.3,
      drawFloor(w, ctx) {
        const off = (w.time * 150) % 220;
        for (let i = -1; i < 4; i++) {
          const x = 600 - off - i * 220 - 140, gap = 140 + Math.sin(i * 2.3 + Math.floor((w.time * 150) / 220) * 1.7) * 40;
          rr(ctx, x, -40, 56, gap - 70 + 40, 6, "#475569"); rr(ctx, x - 5, gap - 92, 66, 22, 5, "#64748b");
          rr(ctx, x, gap + 70, 56, 400, 6, "#475569"); rr(ctx, x - 5, gap + 70, 66, 22, 5, "#64748b");
        }
        ctx.fillStyle = "#3f2d1a"; ctx.fillRect(-60, 300, 660, 100);
        ctx.fillStyle = "#65a30d"; ctx.fillRect(-60, 296, 660, 8);
      },
      setup(w) {
        sprite("casual-bird", 120, 120, x => { facetTop(x, 60, 60, 54, 9, [253, 224, 71], [180, 83, 9]); });
        w.bird = { x: 170, y: 170, vy: 0, rot: 0, sx: 1, sy: 1, wing: 0 };
      },
      fire(w) {
        const b = w.bird;
        b.vy = -470;
        w.emit("flap", b);
      },
      update(w, dt) {
        const b = w.bird;
        b.vy += 2240 * dt; b.y += b.vy * dt;
        if (b.y > 268) { b.y = 268; b.vy = -470; }
        if (b.y < 60) { b.y = 60; b.vy = Math.max(0, b.vy); }
        const k = Math.min(1, dt * 12); b.sx += (1 - b.sx) * k; b.sy += (1 - b.sy) * k; b.wing += (0 - b.wing) * Math.min(1, dt * 9);
      },
      drawFront(w, ctx) {
        const b = w.bird;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.scale(b.sx, b.sy);
        ctx.fillStyle = "#ea580c"; ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-40, -14); ctx.lineTo(-38, 8); ctx.closePath(); ctx.fill();
        ctx.drawImage(SPR["casual-bird"].c, -26, -26, 52, 52);
        ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.moveTo(22, -2); ctx.lineTo(36, 3); ctx.lineTo(22, 8); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.translate(-4, 2); ctx.rotate(b.wing);
        ctx.fillStyle = "#fef3c7"; ctx.strokeStyle = "rgba(120,53,15,0.5)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-24, -6); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore(); ctx.restore();
      },
      steps: [
        {
          id: "tilt", name: { en: "Velocity Tilt", ko: "속도대로 기울기" }, param: "rot = vy / 700",
          cap: { en: "*Nose up* when rising, *dive* when falling.", ko: "오를 땐 *고개 들고*, 떨어질 땐 *곤두박질*." },
          update(w) { const b = w.bird; b.rot = clamp(b.vy / 700, -0.55, 1.1); },
        },
        {
          id: "squash", name: { en: "Stretch", ko: "늘어남" }, param: "0.72 / 1.3",
          cap: { en: "*Stretch* on each flap. It's pushing air.", ko: "날갯짓마다 *쭉 늘어나요*." },
          flap(w, b) { b.sx = 0.72; b.sy = 1.3; },
        },
        {
          id: "wing", name: { en: "Wing Beat", ko: "날개 퍼덕" }, param: "-1.5 rad snap",
          cap: { en: "The wing *snaps down* hard.", ko: "날개를 *팍* 내려쳐요." },
          flap(w, b) { b.wing = -1.5; },
        },
        {
          id: "puff", name: { en: "Air Puff", ko: "바람 뭉치" }, param: "5 puffs + feather",
          cap: { en: "*Puffs of air* push out below.", ko: "아래로 *바람 뭉치*가 퐁퐁." },
          flap(w, b) {
            for (let i = 0; i < 6; i++) w.spawn({ type: "smoke", under: true, x: b.x - 12, y: b.y + 16, vx: rand(-180, -40), vy: rand(60, 220), drag: 4, size: 4, size1: rand(14, 22), life: 0.5, alpha: 0.5, color: "170,200,235" });
            w.spawn({ type: "ring", x: b.x - 8, y: b.y + 18, size: 8, size1: 40, life: 0.3, w: 4, color: "200,225,255" });
            for (let i = 0; i < 2; i++) w.spawn({ type: "chunk", x: b.x - 10, y: b.y + 8, vx: rand(-140, -60), vy: rand(-60, 40), g: 160, vr: rand(-6, 6), size: 6, life: 1.1, color: "254,243,199" });
          },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "streaks / frame",
          cap: { en: "*Streaks* behind it sell forward speed.", ko: "뒤로 흐르는 *선*이 앞으로 가는 느낌을 줘요." },
          update(w) {
            if (Math.random() < 0.5) w.spawn({ type: "spark", x: w.bird.x - 30, y: w.bird.y + rand(-22, 22), vx: -900, vy: 0, size: 2, life: 0.18, color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Flap Sound", ko: "퍼덕 소리" }, param: "short rising chirp",
          cap: { en: "A short *flap* sound on every tap.", ko: "탭마다 짧게 *푸드덕*." },
          flap(w) { w.sfx.jump(); w.sfx.swish(); },
        },
      ],
    },
    /* ───────── 7. 러너 코인 ───────── */
    {
      id: "casual-runner-coins", cat: "casual", view: "side",
      title: { en: "Make coin runs *addictive*", ko: "달리며 줍는 코인 *중독되게*" },
      intro: { en: "Coins touch you. Number goes up. *Meh.*", ko: "닿으면 숫자만 오름. *밍밍해요*." },
      interval: 1.2, stepDur: 3.5,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1f2430"; ctx.fillRect(-60, G, 660, 120);
        ctx.fillStyle = "#c6f432"; ctx.fillRect(-60, G - 2, 660, 3);
        const off = (w.time * 340) % 60;
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (let x = -off - 60; x < 600; x += 60) ctx.fillRect(x, G + 16, 30, 4);
        for (let i = 0; i < 6; i++) { const x = ((i * 120 - w.time * 90) % 720 + 720) % 720 - 90; ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(x, G - 150 - (i % 3) * 30, 60, 150 + (i % 3) * 30); }
      },
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.coins = []; w.total = 0; w.streak = 0; w.bump = 0; },
      fire(w) {
        w.streak = 0;
        for (let i = 0; i < 6; i++) w.coins.push({ x: 300 + i * 46, y: G - 70 - Math.sin(i / 5 * Math.PI) * 60, spin: 1, got: false });
      },
      update(w, dt) {
        const h = w.hero; h.oy = -Math.abs(Math.sin(w.time * 13)) * 8;
        for (const c of w.coins) {
          c.x -= 380 * dt;
          if (!c.got && c.x <= h.x + 22) { c.got = true; w.total++; w.streak++; w.emit("coin", c, w.streak); }
        }
        w.coins = w.coins.filter(c => !c.got && c.x > -40);
        w.bump = Math.max(0, w.bump - dt * 6);
      },
      drawFront(w, ctx) { for (const c of w.coins) coinAt(ctx, c.x, c.y, 30, c.spin); },
      drawHud(w, ctx) {
        const s = 1 + w.bump * 0.4;
        ctx.save(); ctx.translate(46, 62); ctx.scale(s, s); coinAt(ctx, 0, 0, 28); T(ctx, String(w.total), 22, 1, 26, w.bump > 0.3 ? "#fde047" : "#fff", "left"); ctx.restore();
      },
      steps: [
        {
          id: "spin", name: { en: "Coin Spin", ko: "코인 회전" }, param: "cos(t·8)",
          cap: { en: "*Spin* the coins. Shiny things move.", ko: "코인을 *빙글빙글*. 반짝이는 건 움직여요." },
          update(w) { for (const c of w.coins) c.spin = Math.cos(w.time * 8 + c.x * 0.03); },
        },
        {
          id: "sparkle", name: { en: "Grab Sparkle", ko: "반짝 획득" }, param: "star + 6 sparks",
          cap: { en: "A *sparkle* exactly where you grab it.", ko: "먹은 자리에서 *반짝*." },
          coin(w, c) {
            w.spawn({ type: "star", x: c.x, y: c.y, size: 26, life: 0.18, color: "255,240,170" });
            sparks(w, c.x, c.y, 6, "253,224,71", [120, 300]);
          },
        },
        {
          id: "fly", name: { en: "Fly to Counter", ko: "카운터로 날아감" }, param: "seek 0.4s",
          cap: { en: "The coin *flies to the counter*.", ko: "코인이 *숫자 칸으로 날아가요*." },
          coin(w, c) {
            w.spawn({ type: "ghost", img: SPR.coin.c, w: 24, h: 24, top: true, alpha0: 1, add: false, hold: true, seek: true, x: c.x, y: c.y, tx: 46, ty: 62, life: 0.4 });
          },
        },
        {
          id: "bump", name: { en: "Counter Bump", ko: "숫자 칸 톡" }, param: "scale 1.4",
          cap: { en: "The counter *bumps* when it lands.", ko: "도착하면 숫자 칸이 *톡*." },
          coin(w) { w.after(0.4, () => { w.bump = 1; }); },
        },
        {
          id: "streak", name: { en: "Streak Numbers", ko: "연속 숫자" }, param: "+1 … +6 · bigger",
          cap: { en: "Count the streak. *Each one bigger.*", ko: "연속으로 셀수록 *숫자가 커져요*." },
          coin(w, c, n) { w.spawn({ type: "text", text: "+" + n, x: c.x + 24, y: c.y - 34, vy: -80, life: 0.45, size: 18 + n * 4, color: `rgb(${RB[n % 6]})` }); },
        },
        {
          id: "sound", name: { en: "Rising Chain", ko: "올라가는 음" }, param: "+2 semitones / coin",
          cap: { en: "Each coin plays *one step higher*.", ko: "코인마다 음이 *한 칸씩* 올라가요." },
          coin(w, c, n) { w.sfx.blip(n * 2); },
        },
      ],
    },

    /* ───────── 8. 탑 쌓기 ───────── */
    {
      id: "casual-stack", cat: "casual", view: "side",
      title: { en: "Make a perfect drop *sing*", ko: "딱 맞게 쌓으면 *짜릿하게*" },
      intro: { en: "Perfect drop. Feels *like any other*.", ko: "딱 맞췄는데 *그냥 쌓일 뿐*." },
      interval: 0.8, stepDur: 3.6,
      setup(w) {
        casualStackReset(w); w.cy = w.cyT; w.seq = 0; w.mv = null;
      },
      fire(w) {
        if (w.busy) return;
        const tw = w.tw, top = tw[tw.length - 1];
        if (tw.length >= 12 || top.w < 50) { casualStackReset(w); return; }
        w.busy = true;
        const off = [0, 0, 26, 0, 0, -20][w.seq++ % 6];
        const s = { x: top.x + off, w: top.w, sy: 1, glow: 0, y: -90 };
        w.mv = s;
        w.tween(s, { y: 0 }, 0.09, "in", () => {
          w.mv = null; w.busy = false;
          const perfect = off === 0;
          if (!perfect) {
            const keep = top.w - Math.abs(off), dir = Math.sign(off);
            const piece = { x: top.x + dir * (keep / 2 + Math.abs(off) / 2), w: Math.abs(off), y: G - tw.length * 24 + w.cy, dir, hue: tw.length };
            s.w = keep; s.x = top.x + off / 2;
            w.emit("cut", piece);
          }
          tw.push(s);
          w.streak = perfect ? w.streak + 1 : 0;
          w.cyT = Math.max(0, (tw.length - 5) * 24);
          w.emit("land", s, perfect, w.streak);
        });
      },
      update(w, dt) {
        for (const s of w.tw) { s.sy += (1 - s.sy) * Math.min(1, dt * 12); s.glow = Math.max(0, s.glow - dt * 2); }
        if (!w.on("cam")) w.cy = w.cyT;
      },
      drawBack(w, ctx) {
        const slab = (s, i, y) => {
          const h = 24 * s.sy, col = `hsl(${(i * 34 + 190) % 360},80%,60%)`, top = `hsl(${(i * 34 + 190) % 360},85%,75%)`;
          ctx.fillStyle = col; ctx.fillRect(s.x - s.w / 2, y - h, s.w, h);
          ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(s.x - s.w / 2, y - h); ctx.lineTo(s.x - s.w / 2 + 10, y - h - 8); ctx.lineTo(s.x + s.w / 2 + 10, y - h - 8); ctx.lineTo(s.x + s.w / 2, y - h); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.moveTo(s.x + s.w / 2, y - h); ctx.lineTo(s.x + s.w / 2 + 10, y - h - 8); ctx.lineTo(s.x + s.w / 2 + 10, y - 8); ctx.lineTo(s.x + s.w / 2, y); ctx.closePath(); ctx.fill();
          if (s.glow > 0) { ctx.strokeStyle = `rgba(255,255,255,${s.glow})`; ctx.lineWidth = 4; ctx.strokeRect(s.x - s.w / 2 - 3, y - h - 3, s.w + 6, h + 6); }
        };
        w.tw.forEach((s, i) => slab(s, i, G - i * 24 + w.cy));
        const n = w.tw.length, top = w.tw[n - 1];
        if (w.mv) slab(w.mv, n, G - n * 24 + w.cy + w.mv.y);
        else if (!w.busy) slab({ x: 270 + Math.sin(w.time * 3.2) * 150, w: top.w, sy: 1, glow: 0 }, n, G - n * 24 + w.cy - 90);
      },
      steps: [
        {
          id: "squash", name: { en: "Land Squash", ko: "착지 눌림" }, param: "sy 0.55 → 1",
          cap: { en: "The slab *squashes* as it lands.", ko: "내려앉을 때 *꾹* 눌려요." },
          land(w, s) { s.sy = 0.55; },
        },
        {
          id: "cut", name: { en: "Falling Offcut", ko: "잘린 조각 추락" }, param: "g 1600 · spin",
          cap: { en: "The overhang *breaks off and tumbles*.", ko: "삐져나온 부분이 *뚝 잘려 떨어져요*." },
          cut(w, p) {
            w.shoot({ x: p.x, y: p.y - 12, vx: p.dir * 120, vy: -120, g: 1600, vr: p.dir * 5,
              draw(ctx, q) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot || 0); ctx.fillStyle = `hsl(${(p.hue * 34 + 190) % 360},80%,60%)`; ctx.fillRect(-p.w / 2, -12, p.w, 24); ctx.restore(); } });
          },
        },
        {
          id: "perfect", name: { en: "PERFECT Glow", ko: "PERFECT 빛" }, param: "outline + ring",
          cap: { en: "Perfect drop? *Outline glow* and a ring.", ko: "딱 맞으면 *테두리가 빛나고* 고리." },
          land(w, s, perfect) {
            if (!perfect) return;
            s.glow = 1; const y = G - (w.tw.length - 1) * 24 + w.cy - 12;
            ring(w, s.x, y, s.w * 0.5, s.w * 0.5 + 60, "255,255,255", 0.4, 6, true);
            popText(w, s.x, y - 50, "PERFECT", "#fff", 26, -60);
          },
        },
        {
          id: "streak", name: { en: "Streak Build", ko: "연속 보상" }, param: "ring + text ×n",
          cap: { en: "In a row? *Bigger ring*, *brighter text*.", ko: "연속이면 *고리가 커지고* *글자가 빛나요*." },
          land(w, s, perfect, n) {
            if (n < 2) return;
            const y = G - (w.tw.length - 1) * 24 + w.cy - 12;
            ring(w, s.x, y, s.w * 0.5, s.w * 0.5 + 60 + n * 30, RB[n % 6], 0.55, 8, true);
            popText(w, s.x, y - 84, "×" + n, `rgb(${RB[n % 6]})`, 24 + n * 6, -50);
          },
        },
        {
          id: "cam", name: { en: "Smooth Camera", ko: "부드러운 카메라" }, param: "lerp ×5",
          cap: { en: "The camera *glides* up. No jumping.", ko: "카메라가 *스르륵* 올라가요." },
          update(w, dt) { w.cy += (w.cyT - w.cy) * Math.min(1, dt * 5); },
        },
        {
          id: "shake", name: { en: "Thud", ko: "쿵" }, param: "trauma .1 / .25",
          cap: { en: "A little *thud*. Bigger on perfect.", ko: "*쿵*. 딱 맞으면 더 크게." },
          land(w, s, perfect) { w.shake(perfect ? 0.25 : 0.1); },
        },
        {
          id: "sound", name: { en: "Streak Pitch", ko: "연속 음 올리기" }, param: "+2 semitones / streak",
          cap: { en: "Each perfect in a row rings *higher*.", ko: "연속 성공마다 음이 *올라가요*." },
          land(w, s, perfect, n) { w.sfx.thunk(); if (perfect) w.sfx.chime(n * 2); },
        },
      ],
    },

    /* ───────── 9. 구멍이 삼키기 ───────── */
    {
      id: "casual-hole", cat: "casual", view: "top",
      title: { en: "Make the hole *hungry*", ko: "구멍이 *꿀꺽* 삼키게" },
      intro: { en: "Objects just *blink out*.", ko: "물건이 그냥 *뿅* 사라져요." },
      interval: 0.6, stepDur: 3.4,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1c2230"; ctx.fillRect(30, 40, 480, 290);
        ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
        for (let x = 30; x <= 510; x += 40) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 330); ctx.stroke(); }
        for (let y = 40; y <= 330; y += 40) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(510, y); ctx.stroke(); }
        const h = w.H, r = h.r * (1 + h.bump * 0.25);
        ctx.fillStyle = "#05060a"; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.fill();
        const g = ctx.createRadialGradient(h.x, h.y, r * 0.3, h.x, h.y, r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(60,70,100,0.6)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = h.rim > 0 ? `rgba(198,244,50,${0.4 + h.rim * 0.6})` : "rgba(255,255,255,0.35)"; ctx.lineWidth = 3 + h.rim * 4;
        ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.stroke();
      },
      setup(w) { w.H = { x: 270, y: 190, r: 34, bump: 0, rim: 0 }; w.obj = []; w.eaten = 0; casualHoleFill(w); },
      fire(w) {
        const h = w.H, live = w.obj.filter(o => !o.gone && !o.sinking);
        if (live.length < 2) { casualHoleFill(w); return; }
        live.sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y));
        const o = live[0];
        w.tween(h, { x: o.x, y: o.y }, 0.18, "inout", () => {
          w.eaten++;
          w.emit("eat", o, h);
          if (!o.sinking) o.gone = true;
        });
      },
      update(w, dt) { const h = w.H; h.bump = Math.max(0, h.bump - dt * 4); h.rim = Math.max(0, h.rim - dt * 1.6); },
      drawFront(w, ctx) {
        for (const o of w.obj) {
          if (o.gone || o.sc <= 0.02) continue;
          const s = o.s * o.sc;
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
          ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(-s / 2 + 5, -s / 2 + 6, s, s);
          ctx.fillStyle = `rgb(${o.c})`;
          if (o.round) { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, TAU); ctx.fill(); } else ctx.fillRect(-s / 2, -s / 2, s, s);
          ctx.fillStyle = "rgba(255,255,255,0.35)"; if (o.round) { ctx.beginPath(); ctx.arc(-s * 0.12, -s * 0.12, s * 0.28, 0, TAU); ctx.fill(); } else ctx.fillRect(-s / 2 + 3, -s / 2 + 3, s - 6, s * 0.3);
          ctx.restore();
        }
      },
      drawHud(w, ctx) { T(ctx, String(w.eaten), 270, 62, 26, "#fff"); },
      steps: [
        {
          id: "sink", name: { en: "Fall In", ko: "빨려 떨어짐" }, param: "spin + shrink 0.3s",
          cap: { en: "Things *spin and shrink* into the hole.", ko: "물건이 *빙글 돌며 작아지듯* 떨어져요." },
          eat(w, o, h) {
            o.sinking = true;
            w.tween(o, { sc: 0, rot: o.rot + 4 }, 0.3, "in", () => { o.gone = true; });
          },
        },
        {
          id: "grow", name: { en: "Hole Gulp", ko: "구멍 꿀꺽" }, param: "+3px · pulse 25%",
          cap: { en: "The hole *gulps* and grows a little.", ko: "구멍이 *꿀꺽* 하고 조금 커져요." },
          eat(w, o, h) { h.bump = 1; h.r = h.r > 64 ? 34 : h.r + 3; },
        },
        {
          id: "rim", name: { en: "Rim Flash", ko: "테두리 번쩍" }, param: "lime rim + ring",
          cap: { en: "The rim *flashes* and rings outward.", ko: "테두리가 *번쩍*, 고리가 퍼져요." },
          eat(w, o, h) { h.rim = 1; ring(w, h.x, h.y, h.r, h.r + 50, "198,244,50", 0.35, 6); },
        },
        {
          id: "suck", name: { en: "Suction Dust", ko: "빨려드는 먼지" }, param: "10 motes · seek",
          cap: { en: "*Dust gets pulled in* from around it.", ko: "주변 *먼지*까지 쓱 빨려 들어가요." },
          eat(w, o, h) {
            for (let i = 0; i < 10; i++) { const a = rand(0, TAU), d = rand(50, 90); w.spawn({ type: "spark", seek: true, x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, tx: h.x, ty: h.y, life: 0.3, size: 2.5, color: o.c }); }
          },
        },
        {
          id: "count", name: { en: "+1 Pop", ko: "+1 톡" }, param: "rise 80px",
          cap: { en: "A *+1* pops right over the hole.", ko: "구멍 위로 *+1*이 톡." },
          eat(w, o, h) { popText(w, h.x, h.y - h.r - 14, "+1", "#c6f432", 28, -120); },
        },
        {
          id: "sound", name: { en: "Gulp Sound", ko: "꿀꺽 소리" }, param: "low drop pitch",
          cap: { en: "A low *gulp*, slightly different each time.", ko: "낮은 *꿀꺽*, 매번 살짝 다르게." },
          eat(w) { w.play(() => { tn({ f: rand(260, 340), f2: 60, dur: 0.2, vol: 0.4 }); nz({ dur: 0.1, f: 600, vol: 0.2 }); }); },
        },
      ],
    },

    /* ───────── 10. 과일 베기 ───────── */
    {
      id: "casual-fruit", cat: "casual", view: "side",
      title: { en: "Make fruit slicing *juicy*", ko: "과일 베기를 *과즙 터지게*" },
      intro: { en: "Swipe. Fruit vanishes. *Dry.*", ko: "쓱. 과일이 사라짐. *퍽퍽해요*." },
      interval: 1.15, stepDur: 3.6,
      drawFloor(w, ctx) { ctx.fillStyle = "#2a1f18"; ctx.fillRect(-60, -60, 660, 480); ctx.fillStyle = "rgba(255,255,255,0.03)"; for (let x = 0; x < 560; x += 90) ctx.fillRect(x, -60, 4, 480); },
      setup(w) { w.F = []; w.halves = []; w.wave = 0; casualFruitToss(w); },
      fire(w) {
        const live = w.F.filter(f => !f.dead && f.y < 330);
        // A swipe on frame one should be queued until the tossed fruit is
        // actually in reach. Previously the first input did nothing at all.
        if (!live.length && !w.swipeQueued) {
          w.swipeQueued = true;
          w.after(.30, () => { w.swipeQueued = false; if(w.F.some(f => !f.dead && f.y < 330)) w.R.fire(w); });
          return;
        }
        if (live.length) {
          const y = live.reduce((s, f) => s + f.y, 0) / live.length;
          if (!w.on("trail")) w.spawn({ type: "crack", x: 30, y: y + 30, pts: [[0, 0], [480, -60]], w: 2, life: 0.18, add: false, color: "255,255,255" });
          w.emit("swipe", y);
          live.forEach((f, i) => { f.dead = true; w.emit("slice", f, i); });
          w.emit("combo", live.length, y);
        }
        w.after(0.2, () => casualFruitToss(w));
      },
      update(w, dt) {
        for (const f of w.F.concat(w.halves)) { f.vy += 1000 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; }
        w.F = w.F.filter(f => !f.dead && f.y < 520); w.halves = w.halves.filter(f => f.y < 520);
      },
      drawFront(w, ctx) {
        for (const f of w.F) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); casualFruitDraw(ctx, f, 0); ctx.restore(); }
        for (const f of w.halves) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); casualFruitDraw(ctx, f, f.side); ctx.restore(); }
      },
      steps: [
        {
          id: "trail", name: { en: "Blade Trail", ko: "칼 궤적" }, param: "slash 260px",
          cap: { en: "*Draw the swipe*. Show where the blade went.", ko: "*칼이 지나간 길*을 그려요." },
          swipe(w, y) { w.spawn({ type: "slash", x: 270, y, ang: -0.12, len: 250, size: 12, life: 0.3, color: "255,255,255" }); },
        },
        {
          id: "halves", name: { en: "Split Halves", ko: "반으로 쩍" }, param: "2 halves · spin",
          cap: { en: "Split it *in two*. Halves fly apart.", ko: "*반으로 갈라져* 양쪽으로 날아가요." },
          slice(w, f) { for (const side of [-1, 1]) w.halves.push({ ...f, side, vx: f.vx + side * 160, vy: f.vy - 160, vr: side * 6 }); },
        },
        {
          id: "juice", name: { en: "Juice Splat", ko: "과즙 튀김" }, param: "splat + 14 drops",
          cap: { en: "*Juice splats* on the wall and drips.", ko: "벽에 *과즙*이 철퍽 튀어요." },
          slice(w, f) {
            w.spawn({ type: "ellipse", round: true, under: true, x: f.x, y: f.y, size: 38, life: 2.2, hold: true, color: f.juice, alpha: 0.45, add: false });
            for (let i = 0; i < 14; i++) { const a = rand(0, TAU), v = rand(120, 420); w.spawn({ type: "circle", x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1200, drag: 2, size: rand(3, 6), life: rand(0.4, 0.7), color: f.juice, add: false }); }
          },
        },
        {
          id: "flash", name: { en: "Cut Flash", ko: "베는 순간 번쩍" }, param: "star + stop 50ms",
          cap: { en: "A *flash* and a tiny *freeze* on the cut.", ko: "베는 순간 *번쩍*, 아주 잠깐 *멈칫*." },
          slice(w, f) {
            w.spawn({ type: "star", x: f.x, y: f.y, size: 50, life: 0.14, color: "255,255,255" });
            w.hitstop(0.05);
          },
        },
        {
          id: "combo", name: { en: "Combo Callout", ko: "콤보 외침" }, param: "3+ fruits · zoom",
          cap: { en: "Several in one swipe? *Shout about it.*", ko: "한 번에 여러 개? *크게 외쳐요*." },
          combo(w, n, y) {
            if (n < 2) return;
            popText(w, 270, Math.max(80, y - 70), n + " FRUIT COMBO!", "#fde047", 30, -30);
            w.zoomPunch(0.06);
          },
        },
        {
          id: "sound", name: { en: "Slash + Squish", ko: "쉭 + 철퍽" }, param: "slash / wet noise",
          cap: { en: "A *swish* for the blade, a *squish* for the fruit.", ko: "칼은 *쉭*, 과일은 *철퍽*." },
          swipe(w) { w.sfx.slash(); },
          slice(w, f, i) { w.play(() => nz({ dur: 0.18, type: "lowpass", f: 1400, f2: 300, vol: 0.4, delay: i * 0.03 })); },
        },
      ],
    },

    /* ───────── 11. 숫자 합치기 ───────── */
    {
      id: "casual-merge", cat: "casual", view: "side",
      title: { en: "Make merges feel *rewarding*", ko: "합치기를 *뿌듯하게*" },
      intro: { en: "Two 8s touch. One 16. *That's all?*", ko: "8 두 개가 닿으면 16. *끝?*" },
      interval: 0.9, stepDur: 3.6,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(170, 50, 200, 250);
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(166, 50, 4, 254); ctx.fillRect(370, 50, 4, 254); ctx.fillRect(166, 300, 208, 4);
      },
      setup(w) { w.B = { v: 2, sc: 1, sy: 1 }; w.drop = null; w.side = [{ v: 4, x: 196 }, { v: 2, x: 346 }]; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        w.drop = { v: w.B.v, x: 270, y: 70, vy: 0, sy: 1, sc: 1 };
      },
      update(w, dt) {
        const B = w.B, d = w.drop, rB = casualR(B.v);
        B.sy += (1 - B.sy) * Math.min(1, dt * 12);
        if (d && !d.landed) {
          d.vy += 2200 * dt; d.y += d.vy * dt;
          if (d.y + casualR(d.v) >= 300 - rB * 2) {
            d.y = 300 - rB * 2 - casualR(d.v); d.landed = true;
            w.emit("land", d, B);
            const merge = () => { B.v *= 2; if (B.v > 1024) B.v = 2; w.drop = null; w.busy = false; w.emit("merge", B, 300 - casualR(B.v)); };
            if (w.on("suck")) w.emit("suck", d, B, merge); else merge();
          }
        }
        if (d) d.sy += (1 - d.sy) * Math.min(1, dt * 12);
      },
      drawFront(w, ctx) {
        for (const s of w.side) casualBall(ctx, s.x, 300 - casualR(s.v), s);
        const B = w.B;
        casualBall(ctx, 270, 300 - casualR(B.v) * B.sy, B);
        if (w.drop) casualBall(ctx, w.drop.x, w.drop.y, w.drop);
      },
      steps: [
        {
          id: "suck", name: { en: "Pull Together", ko: "서로 끌어당김" }, param: "120ms ease-in",
          cap: { en: "The two balls *pull into each other*.", ko: "두 공이 *쏙 빨려 붙어요*." },
          suck(w, d, B, done) { w.tween(d, { y: 300 - casualR(B.v), sc: 0.6 }, 0.12, "in", done); },
        },
        {
          id: "squash", name: { en: "Land Squash", ko: "착지 눌림" }, param: "sy 0.7",
          cap: { en: "Both *squash* on contact.", ko: "닿는 순간 둘 다 *꾹*." },
          land(w, d, B) { d.sy = 0.7; B.sy = 0.78; },
        },
        {
          id: "pop", name: { en: "Merge Pop", ko: "합체 퐁" }, param: "1.45× → 1 · back",
          cap: { en: "The new ball *pops* out bigger.", ko: "새 공이 *퐁* 크게 튀어나와요." },
          merge(w, B) { B.sc = 1.45; w.tween(B, { sc: 1 }, 0.3, "back"); },
        },
        {
          id: "color", name: { en: "Value Colors", ko: "숫자별 색" }, param: "hue per value",
          cap: { en: "Every value gets *its own color*.", ko: "숫자마다 *색*이 달라요." },
          update(w) { for (const b of [w.B, w.drop, ...w.side]) if (b) b.hue = casualHue(b.v); },
        },
        {
          id: "burst", name: { en: "Color Burst", ko: "색 터짐" }, param: "ring + 14 sparks",
          cap: { en: "Burst in the *new color*.", ko: "*새 색깔*로 터져요." },
          merge(w, B, y) {
            const c = casualHue(B.v);
            ring(w, 270, y, casualR(B.v), casualR(B.v) + 60, c, 0.4, 8);
            sparks(w, 270, y, 14, c, [200, 480]);
          },
        },
        {
          id: "score", name: { en: "Score Pop", ko: "점수 톡" }, param: "+value",
          cap: { en: "Show the *points* you just made.", ko: "방금 얻은 *점수*를 톡." },
          merge(w, B, y) { popText(w, 270, y - casualR(B.v) - 26, "+" + B.v, "#fff", 26, -110); },
        },
        {
          id: "sound", name: { en: "Value Pitch", ko: "숫자만큼 높은 음" }, param: "+2 semitones / ×2",
          cap: { en: "Bigger number, *higher* pop.", ko: "숫자가 클수록 *높은* 퐁." },
          merge(w, B) { w.sfx.pop(); w.sfx.blip(Math.log2(B.v) * 2); },
        },
      ],
    },

    /* ───────── 12. 방치형 치명타 ───────── */
    {
      id: "casual-idle-crit", cat: "casual", view: "ui",
      title: { en: "Make idle crits *pay off*", ko: "방치형 치명타 *짜릿하게*" },
      intro: { en: "Normal hit. Crit. *Spot the difference.*", ko: "일반, 치명타. *차이 찾기* 해보세요." },
      interval: 0.45, stepDur: 3.5,
      drawFloor() {},
      setup(w) {
        sprite("casual-crystal", 140, 190, x => facetCrystal(x, 70, 8, 182, 52, 40, 10, 14, [190, 240, 255], [30, 70, 160]));
        w.C = { sx: 1, sy: 1 }; w.nums = []; w.n = 0; w.gold = 0;
      },
      fire(w) {
        const crit = ++w.n % 3 === 0, d = crit ? 60 : 12;
        w.gold += d;
        const num = { text: String(d), x: 270 + rand(-40, 40), y: 84, vx: 0, vy: 0, g: 0, t: 0.8, size: 22, col: "#fff", crit };
        w.spawn({ type: "circle", x: 270 + rand(-20, 20), y: 200 + rand(-20, 20), size: 9, life: 0.15, add: false, color: "255,255,255" });
        w.emit("tap", crit, num);
        w.nums.push(num);
      },
      update(w, dt) {
        const C = w.C; C.sx += (1 - C.sx) * Math.min(1, dt * 14); C.sy += (1 - C.sy) * Math.min(1, dt * 14);
        for (const n of w.nums) { n.vy += n.g * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.t -= dt; }
        w.nums = w.nums.filter(n => n.t > 0);
      },
      drawFront(w, ctx) {
        const C = w.C, c = SPR["casual-crystal"].c;
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(270, 292, 70, 12, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(270, 290); ctx.scale(C.sx, C.sy); ctx.drawImage(c, -70, -190, 140, 190); ctx.restore();
      },
      drawHud(w, ctx) {
        for (const n of w.nums) { ctx.globalAlpha = Math.min(1, n.t * 3); T(ctx, n.text, n.x, n.y, n.size, n.col); }
        ctx.globalAlpha = 1;
        coinAt(ctx, 44, 62, 24); T(ctx, String(w.gold), 62, 63, 24, "#fde047", "left");
      },
      steps: [
        {
          id: "squish", name: { en: "Tap Squish", ko: "톡 찌그러짐" }, param: "1.12 / 0.88",
          cap: { en: "The rock *squishes* under your finger.", ko: "누를 때마다 *말랑하게* 눌려요." },
          tap(w, crit) { w.C.sx = crit ? 1.25 : 1.12; w.C.sy = crit ? 0.78 : 0.88; },
        },
        {
          id: "fling", name: { en: "Flung Numbers", ko: "튀는 숫자" }, param: "arc · g 1100",
          cap: { en: "Numbers *fly out* and fall. Never static.", ko: "숫자가 *톡 튀어 올라* 떨어져요." },
          tap(w, crit, n) { n.vx = rand(-200, 200); n.vy = -360; n.g = 1100; },
        },
        {
          id: "crit", name: { en: "Crit Style", ko: "치명타 모양" }, param: "2.2× · gold · \"!\"",
          cap: { en: "Crits are *huge*, *gold*, and shout.", ko: "치명타는 *크고*, *금색*으로 외쳐요." },
          tap(w, crit, n) {
            if (!crit) return;
            Object.assign(n, { size: 50, col: "#fde047", text: n.text + "!" });
            w.spawn({ type: "rays", x: 270, y: 190, size: 200, n: 12, vr: 2, life: 0.5, color: "253,224,71" });
          },
        },
        {
          id: "impact", name: { en: "Crit Impact", ko: "치명타 충격" }, param: "stop 80ms · shake",
          cap: { en: "Crits *freeze* a beat and *shake*.", ko: "치명타는 *멈칫*하고 *흔들려요*." },
          tap(w, crit) { if (crit) { w.hitstop(0.08); w.shake(0.4); w.flash("253,224,71", 0.3); } },
        },
        {
          id: "coins", name: { en: "Coin Spill", ko: "코인 쏟아짐" }, param: "2 / 8 coins",
          cap: { en: "Coins *spill out*. More on crits.", ko: "*코인*이 쏟아져요. 치명타면 더 많이." },
          tap(w, crit) {
            coinSpray(w, 270, 180, crit ? 8 : 2, 260, [300, 560], 300);
          },
        },
        {
          id: "sound", name: { en: "Tap / Crit Sound", ko: "톡 / 치명타 소리" }, param: "tick vs crit",
          cap: { en: "Small *tick* for hits, a big *crack* for crits.", ko: "일반은 *톡*, 치명타는 *쾅*." },
          tap(w, crit) { if (crit) w.sfx.crit(); else w.sfx.tock(); },
        },
      ],
    },
    /* ───────── 13. 통통 튀는 공 ───────── */
    {
      id: "casual-bounce", cat: "casual", view: "side",
      title: { en: "Make a bouncing ball *bouncy*", ko: "튀는 공을 *말랑하게*" },
      intro: { en: "It bounces. Like a *coin*. A rigid one.", ko: "튀긴 하는데 *쇠구슬* 같아요." },
      interval: 1.3, stepDur: 3.5,
      setup(w) { w.b = { x: 150, y: G - 26, vx: 210, vy: 0, sx: 1, sy: 1, st: 0, rot: 0 }; w.shadow = null; },
      fire(w) { const b = w.b; b.vy = -Math.sqrt(2 * 1900 * Math.max(10, b.y - 100)); w.emit("kick", b); },
      update(w, dt) {
        const b = w.b, R = 26;
        b.vy += 1900 * dt; b.y += b.vy * dt; b.x += b.vx * dt; b.rot += b.vx * dt / R;
        if (b.x < 70 || b.x > 470) { b.vx *= -1; b.x = clamp(b.x, 70, 470); }
        if (b.y > G - R) {
          b.y = G - R;
          const v = b.vy;
          if (v > 160) { b.vy = -v * 0.72; w.emit("land", b, v); } else b.vy = 0;
        }
        const k = Math.min(1, dt * 14); b.sx += (1 - b.sx) * k; b.sy += (1 - b.sy) * k;
      },
      drawBack(w, ctx) {
        const b = w.b;
        if (w.shadow != null) { ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.4 * w.shadow})`; ctx.beginPath(); ctx.ellipse(b.x, G + 2, 30 * (0.4 + 0.6 * w.shadow), 7 * (0.4 + 0.6 * w.shadow), 0, 0, TAU); ctx.fill(); }
      },
      drawFront(w, ctx) {
        const b = w.b, R = 26, st = b.st;
        ctx.save(); ctx.translate(b.x, b.y + (1 - b.sy) * R); ctx.scale(b.sx * (1 - st), b.sy * (1 + st));
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); ctx.rotate(b.rot);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgb(${RB[i]})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, i * TAU / 6, (i + 1) * TAU / 6); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.ellipse(-8, -10, 8, 5, -0.5, 0, TAU); ctx.fill();
        ctx.restore();
      },
      steps: [
        {
          id: "stretch", name: { en: "Speed Stretch", ko: "속도만큼 늘어남" }, param: "|vy| / 3000",
          cap: { en: "*Stretch* along the motion when it's fast.", ko: "빠를수록 *길쭉하게*." },
          update(w) { const b = w.b; b.st = Math.min(0.32, Math.abs(b.vy) / 3000); },
        },
        {
          id: "squash", name: { en: "Impact Squash", ko: "닿을 때 납작" }, param: "1.5 / 0.55",
          cap: { en: "*Squash flat* the moment it hits.", ko: "닿는 순간 *납작*." },
          land(w, b, v) { const k = Math.min(1, v / 1000); b.sx = 1 + 0.5 * k; b.sy = 1 - 0.45 * k; },
        },
        {
          id: "shadow", name: { en: "Ground Shadow", ko: "바닥 그림자" }, param: "size by height",
          cap: { en: "A *shadow* tells you how high it is.", ko: "*그림자*가 높이를 알려줘요." },
          update(w) { w.shadow = clamp(1 - (G - 26 - w.b.y) / 260, 0, 1); },
        },
        {
          id: "dust", name: { en: "Impact Dust", ko: "착지 먼지" }, param: "ring + puffs",
          cap: { en: "Hit harder, *bigger puff*.", ko: "세게 닿을수록 *먼지*도 크게." },
          land(w, b, v) {
            const k = Math.min(1, v / 1000);
            ring(w, b.x, G, 12, 30 + 60 * k, "255,255,255", 0.35, 5, true);
            dirt(w, b.x, G, Math.round(3 + 6 * k), 0, "120,120,140");
          },
        },
        {
          id: "trail", name: { en: "Rainbow Trail", ko: "무지개 꼬리" }, param: "glow / frame",
          cap: { en: "A short *trail* shows the arc.", ko: "짧은 *꼬리*가 궤적을 보여줘요." },
          update(w) {
            const b = w.b;
            w.spawn({ type: "glow", x: b.x, y: b.y, size: 20, size1: 4, life: 0.3, color: RB[Math.floor(w.time * 12) % 6] });
          },
        },
        {
          id: "sound", name: { en: "Boing", ko: "뿅 소리" }, param: "pitch + vol by speed",
          cap: { en: "A *boing* that gets quieter each bounce.", ko: "튈수록 작아지는 *뿅*." },
          land(w, b, v) {
            const k = Math.min(1, v / 1000);
            w.play(() => tn({ type: "sine", f: 220 + 180 * k, f2: 520 + 300 * k, dur: 0.14, vol: 0.12 + 0.3 * k }));
          },
          kick(w) { w.sfx.jump(); },
        },
      ],
    },

    /* ───────── 14. 아케이드 점수 팝업 ───────── */
    {
      id: "casual-score-pop", cat: "casual", view: "ui",
      title: { en: "Make score popups *pop*", ko: "점수 팝업을 *톡 튀게*" },
      intro: { en: "Tiny grey numbers. *Who reads those?*", ko: "작고 흐린 숫자. *누가 봐요?*" },
      interval: 0.4, stepDur: 3.4,
      drawFloor(w, ctx) { for (const s of w.stars) { ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(s.x, (s.y + w.time * 40) % 360, 2, 2); } },
      setup(w) {
        w.stars = [...Array(40)].map(() => ({ x: rand(20, 520), y: rand(0, 360) }));
        w.inv = []; casualInvaders(w);
        w.ship = { x: 270 }; w.score = 0; w.shown = 0; w.bump = 0; w.pops = []; w.chain = 0; w.lastHit = -9;
      },
      fire(w) {
        const live = w.inv.filter(v => v.alive);
        if (!live.length) { casualInvaders(w); return; }
        const t = pick(live); w.ship.x = t.x;
        w.shoot({ x: t.x, y: 300, vx: 0, vy: -1300, r: 3, color: "#c6f432", len: 0, test: p => p.y <= t.y, onHit: () => {
          if (!t.alive) return;
          t.alive = false;
          w.chain = w.time - w.lastHit < 0.9 ? (w.chain + 1) % 4 : 0; w.lastHit = w.time;
          const pts = t.pts * (1 << w.chain);
          w.score += pts;
          const p = { x: t.x, y: t.y, text: String(pts), col: "rgba(255,255,255,0.55)", size: 14, sc: 1, vy: 0, t: 0.6 };
          w.pops.push(p);
          w.emit("hit", t, p, w.chain);
        } });
      },
      update(w, dt) {
        for (const p of w.pops) { p.y += p.vy * dt; p.t -= dt; p.sc += (1 - p.sc) * Math.min(1, dt * 12); }
        w.pops = w.pops.filter(p => p.t > 0);
        w.bump = Math.max(0, w.bump - dt * 5);
        if (!w.on("fly")) w.shown = w.score;
      },
      drawFront(w, ctx) {
        for (const v of w.inv) if (v.alive) casualInvader(ctx, v);
        ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.moveTo(w.ship.x, 290); ctx.lineTo(w.ship.x + 20, 316); ctx.lineTo(w.ship.x - 20, 316); ctx.closePath(); ctx.fill();
      },
      drawHud(w, ctx) {
        for (const p of w.pops) { ctx.save(); ctx.globalAlpha = Math.min(1, p.t * 4); ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc); if (p.out) T(ctx, p.text, 0, 0, p.size, p.col); else label(ctx, p.text, 0, 0, p.size, p.col); ctx.restore(); }
        const s = 1 + w.bump * 0.3;
        ctx.save(); ctx.translate(270, 54); ctx.scale(s, s); T(ctx, String(Math.round(w.shown)).padStart(6, "0"), 0, 0, 24, w.bump > 0.3 ? "#c6f432" : "#fff"); ctx.restore();
      },
      steps: [
        {
          id: "rise", name: { en: "Rise & Fade", ko: "떠오르며 사라짐" }, param: "vy -70 · 0.9s",
          cap: { en: "Popups *float up* and fade. They live longer.", ko: "숫자가 *떠오르며* 사라져요." },
          hit(w, t, p) { p.vy = -70; p.t = 0.75; },
        },
        {
          id: "big", name: { en: "Bold + Outline", ko: "굵게 + 테두리" }, param: "24px · stroke",
          cap: { en: "*Bigger*, *bolder*, with an outline.", ko: "*크고 굵게*, 테두리까지." },
          hit(w, t, p) { p.size = 24; p.out = true; p.col = "#fff"; },
        },
        {
          id: "color", name: { en: "Value Color", ko: "점수별 색" }, param: "row color",
          cap: { en: "Color by value. *Rarer = warmer.*", ko: "점수마다 *색*이 달라요." },
          hit(w, t, p) { p.col = `rgb(${t.c})`; },
        },
        {
          id: "pop", name: { en: "Scale Pop", ko: "톡 커짐" }, param: "1.8× → 1",
          cap: { en: "Each number *pops in* from big.", ko: "숫자가 *크게 톡* 나왔다 제자리." },
          hit(w, t, p) { p.sc = 1.8; },
        },
        {
          id: "chain", name: { en: "Chain Multiplier", ko: "연쇄 배수" }, param: "×2 ×4 ×8",
          cap: { en: "Quick chains *double up*. Show the ×!", ko: "빠르게 이어 맞히면 *×2, ×4*!" },
          hit(w, t, p, n) { if (n > 0) { p.text += " ×" + (1 << n); p.size += n * 4; } },
        },
        {
          id: "burst", name: { en: "Pixel Burst", ko: "픽셀 폭발" }, param: "12 chunks",
          cap: { en: "The enemy *bursts* into shards.", ko: "적이 *조각*으로 터져요." },
          hit(w, t) {
            shards(w, t.x, t.y, 12, t.c, [150, 380]);
            w.spawn({ type: "glow", x: t.x, y: t.y, size: 40, size1: 6, life: 0.2, color: t.c });
          },
        },
        {
          id: "fly", name: { en: "Fly to Score", ko: "점수판으로" }, param: "seek + roll",
          cap: { en: "Points *fly to the score* and roll up.", ko: "점수가 *점수판으로 날아가* 올라가요." },
          hit(w, t, p) {
            w.spawn({ type: "glow", seek: true, x: t.x, y: t.y, tx: 270, ty: 54, size: 10, life: 0.4, color: t.c });
            w.after(0.4, () => { w.bump = 1; });
          },
          update(w, dt) { w.shown += (w.score - w.shown) * Math.min(1, dt * 8); },
        },
        {
          id: "sound", name: { en: "Arcade Bleeps", ko: "아케이드 삐뽀" }, param: "square · chain pitch",
          cap: { en: "Square-wave *bleeps*, higher in a chain.", ko: "*삐뽀* 소리, 연쇄면 더 높게." },
          hit(w, t, p, n) {
            w.play(() => tn({ type: "square", f: 520 * Math.pow(2, n * 4 / 12), f2: 1040, dur: 0.08, vol: 0.12 }));
            w.sfx.pop();
          },
        },
      ],
    },

    /* ───────── 15. 최고 기록 경신 ───────── */
    {
      id: "casual-highscore", cat: "casual", view: "ui",
      title: { en: "Celebrate a *new best*", ko: "최고 기록을 *축제처럼*" },
      intro: { en: "New record! …said a *tiny line*.", ko: "신기록! …이라고 *작게* 써 있어요." },
      interval: 2.3, stepDur: 3.8,
      drawFloor() {},
      setup(w) { w.S = { v: 6000, best: 8000, nb: false, flag: 1, gold: 0, ban: null }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S; Object.assign(S, { v: 6000, nb: false, gold: 0, ban: null, flag: 1 });
        w.tween(S, { v: 9600 }, 0.7, "out", () => w.after(1.2, () => { w.busy = false; }));
      },
      update(w, dt) {
        const S = w.S;
        if (!S.nb && S.v > S.best) { S.nb = true; w.emit("best", S); }
        S.gold = Math.max(0, S.gold - dt * 0.4);
      },
      drawHud(w, ctx) {
        const S = w.S, g = S.gold > 0;
        if (g) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, 150, 150, "253,224,71", 0.5 * S.gold); ctx.globalCompositeOperation = "source-over"; }
        const sc = 1 + (g ? 0.15 * Math.abs(Math.sin(w.time * 8)) * S.gold : 0);
        ctx.save(); ctx.translate(270, 150); ctx.scale(sc, sc); T(ctx, Math.round(S.v).toLocaleString("en-US"), 0, 0, 64, g ? "#fde047" : "#fff"); ctx.restore();
        // 진행 막대와 최고 기록 깃발
        const x0 = 110, x1 = 430, k = clamp((S.v - 6000) / 4000, 0, 1), bx = x0 + (x1 - x0) * 0.5;
        panel(ctx, x0, 250, x1 - x0, 14, 7, "rgba(0,0,0,0.5)");
        ctx.fillStyle = S.nb ? "#fde047" : "#38bdf8"; ctx.beginPath(); ctx.roundRect(x0 + 2, 252, (x1 - x0 - 4) * k, 10, 5); ctx.fill();
        ctx.save(); ctx.translate(bx, 248); ctx.scale(S.flag, S.flag);
        ctx.fillStyle = "#fff"; ctx.fillRect(-1.5, -30, 3, 30); ctx.fillStyle = S.nb ? "#fde047" : "#f43f5e"; ctx.beginPath(); ctx.moveTo(1.5, -30); ctx.lineTo(24, -23); ctx.lineTo(1.5, -16); ctx.closePath(); ctx.fill();
        ctx.restore();
        label(ctx, "BEST 8,000", bx, 286, 13, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
        if (S.nb && !S.ban) label(ctx, "new best", 270, 205, 14, "rgba(255,255,255,0.7)");
        if (S.ban) {
          ctx.save(); ctx.translate(270, 84); ctx.rotate(-0.05); ctx.scale(S.ban.sc, S.ban.sc);
          ctx.fillStyle = "#e11d48"; ctx.beginPath(); ctx.moveTo(-130, -22); ctx.lineTo(130, -22); ctx.lineTo(116, 0); ctx.lineTo(130, 22); ctx.lineTo(-130, 22); ctx.lineTo(-116, 0); ctx.closePath(); ctx.fill();
          T(ctx, "NEW BEST!", 0, 1, 30, "#fff"); ctx.restore();
        }
      },
      steps: [
        {
          id: "flag", name: { en: "Flag Pop", ko: "깃발 톡" }, param: "2× → 1 · back",
          cap: { en: "The *best-score flag* pops as you pass it.", ko: "기록 *깃발*을 넘는 순간 톡." },
          best(w, S) {
            S.flag = 2;
            w.tween(S, { flag: 1 }, 0.4, "back");
            ring(w, 270, 232, 10, 60, "253,224,71", 0.4, 5);
          },
        },
        {
          id: "banner", name: { en: "Ribbon Banner", ko: "리본 배너" }, param: "3× → 1 slam",
          cap: { en: "Slam a *NEW BEST!* ribbon on screen.", ko: "*NEW BEST!* 리본이 쾅." },
          best(w, S) { S.ban = { sc: 3 }; w.tween(S.ban, { sc: 1 }, 0.3, "back"); },
        },
        {
          id: "gold", name: { en: "Golden Score", ko: "황금 점수" }, param: "glow + pulse",
          cap: { en: "The score turns *gold* and *pulses*.", ko: "점수가 *금색*으로 *두근두근*." },
          best(w, S) { S.gold = 1; },
        },
        {
          id: "confetti", name: { en: "Confetti Cannons", ko: "꽃가루 대포" }, param: "2 × 30 pieces",
          cap: { en: "*Confetti cannons* from both corners.", ko: "양쪽 구석에서 *꽃가루* 펑." },
          best(w) {
            confetti(w, 40, 330, 30, [400, 750], -1.4, -0.6, 1.8);
            confetti(w, 500, 330, 30, [400, 750], -2.5, -1.7, 1.8);
          },
        },
        {
          id: "fireworks", name: { en: "Fireworks", ko: "불꽃놀이" }, param: "3 bursts · stagger",
          cap: { en: "A few *fireworks*, one after another.", ko: "*불꽃*이 차례로 펑, 펑, 펑." },
          best(w) {
            [[130, 90], [410, 100], [270, 50]].forEach(([x, y], i) => w.after(0.15 + i * 0.2, () => {
              const c = RB[(i * 2 + 1) % 6]; sparks(w, x, y, 22, c, [140, 320]); ring(w, x, y, 6, 60, c, 0.4, 4);
            }));
          },
        },
        {
          id: "slowmo", name: { en: "Slow-mo Moment", ko: "슬로모션" }, param: "0.3× · 0.5s + flash",
          cap: { en: "*Slow time* right as you cross the line.", ko: "선을 넘는 순간 *시간이 느려져요*." },
          best(w) { w.slowmo(0.3, 0.5); w.flash("255,255,255", 0.5); },
        },
        {
          id: "sound", name: { en: "Fanfare", ko: "팡파르" }, param: "5-note arpeggio",
          cap: { en: "A short *fanfare*. You earned it.", ko: "짧은 *팡파르*. 자격 있어요." },
          best(w) { w.sfx.fanfare(); w.after(0.3, () => w.sfx.chime(12)); },
        },
      ],
    },

    /* ───────── 16. 슬롯머신 ───────── */
    {
      id: "casual-slot", cat: "casual", view: "ui",
      title: { en: "Make a slot spin *thrilling*", ko: "슬롯머신을 *두근두근하게*" },
      intro: { en: "Symbols change. Then *stop*. Okay.", ko: "그림이 바뀌다가 *멈춤*. 그래서요?" },
      interval: 2.6, stepDur: 4.0,
      drawFloor(w, ctx) {
        rr(ctx, 100, 66, 340, 238, 22, "#3b0d2e"); ctx.lineWidth = 4; ctx.strokeStyle = "#f472b6"; ctx.stroke();
        for (let i = 0; i < 18; i++) {
          const t = i / 18, x = t < 0.5 ? 116 + t * 2 * 308 : 424 - (t - 0.5) * 2 * 308, y = t < 0.5 ? 80 : 290;
          const on = w.party > 0 ? (Math.floor(w.time * 14) + i) % 3 === 0 : i % 2 === 0;
          ctx.fillStyle = on ? (w.party > 0 ? `rgb(${RB[(i + Math.floor(w.time * 10)) % 6]})` : "#fde68a") : "rgba(255,255,255,0.15)";
          ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
        }
      },
      setup(w) { w.reels = [0, 1, 2].map(i => ({ x: 170 + i * 100, pos: i * 2, spin: false, kick: 0, glow: 0, blur: false })); w.party = 0; w.line = 0; w.round = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const win = w.round++ % 2 === 0, res = win ? [0, 0, 0] : [0, 0, 3];
        w.reels.forEach(r => { r.spin = true; w.emit("spin", r); });
        const stop = (i) => { const r = w.reels[i]; r.spin = false; r.blur = false; r.pos = res[i]; w.emit("stop", r, i); };
        w.after(0.45, () => stop(0));
        w.after(0.7, () => { stop(1); w.emit("tease", w.reels[2]); });
        const t3 = w.on("tease") ? 1.5 : 0.95;
        w.after(t3, () => { stop(2); if (win) w.emit("win"); w.after(1.0, () => { w.busy = false; }); });
      },
      update(w, dt) {
        for (const r of w.reels) {
          if (r.spin) r.pos = (r.pos + dt * (r.glow > 0 ? 9 : 22)) % 6;
          r.kick += (0 - r.kick) * Math.min(1, dt * 10); r.glow = r.spin ? r.glow : Math.max(0, r.glow - dt * 3);
        }
        w.party = Math.max(0, w.party - dt); w.line = Math.max(0, w.line - dt * 0.8);
      },
      drawFront(w, ctx) {
        for (const r of w.reels) {
          ctx.save(); ctx.beginPath(); ctx.roundRect(r.x - 42, 110, 84, 150, 10); ctx.fillStyle = "#fff7ed"; ctx.fill(); ctx.clip();
          const base = Math.floor(r.pos), fr = r.pos - base;
          for (let k = -2; k <= 2; k++) {
            const idx = ((base - k) % 6 + 6) % 6, y = 185 + (k + fr) * 62 + r.kick * 62;
            if (r.blur) { ctx.globalAlpha = 0.35; casualSym(ctx, idx, r.x, y - 16, 1, 1.5); casualSym(ctx, idx, r.x, y + 16, 1, 1.5); ctx.globalAlpha = 1; }
            else casualSym(ctx, idx, r.x, y, 1, 1);
          }
          const sh = ctx.createLinearGradient(0, 110, 0, 260); sh.addColorStop(0, "rgba(0,0,0,0.45)"); sh.addColorStop(0.3, "rgba(0,0,0,0)"); sh.addColorStop(0.7, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.45)");
          ctx.fillStyle = sh; ctx.fillRect(r.x - 42, 110, 84, 150);
          ctx.restore();
          if (r.glow > 0) { ctx.strokeStyle = `rgba(253,224,71,${r.glow})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(r.x - 45, 107, 90, 156, 12); ctx.stroke(); }
        }
        if (w.line > 0) { ctx.fillStyle = `rgba(244,63,94,${Math.min(1, w.line) * (0.6 + 0.4 * Math.sin(w.time * 30))})`; ctx.fillRect(116, 182, 308, 6); }
      },
      steps: [
        {
          id: "blur", name: { en: "Motion Blur", ko: "모션 블러" }, param: "2 ghosts · 1.5× tall",
          cap: { en: "Spinning symbols *smear*. Speed you can see.", ko: "돌 때는 그림이 *번지게*. 속도가 보여요." },
          spin(w, r) { r.blur = true; },
        },
        {
          id: "bounce", name: { en: "Stop Bounce", ko: "멈출 때 덜컹" }, param: "overshoot .35",
          cap: { en: "Each reel *overshoots* and clunks back.", ko: "릴이 *살짝 넘어갔다* 덜컹 제자리." },
          stop(w, r) { r.kick = 0.4; },
        },
        {
          id: "tease", name: { en: "Last-Reel Tease", ko: "마지막 릴 애태우기" }, param: "slow + glow 0.8s",
          cap: { en: "Two match? *Slow the last reel* and make it glow.", ko: "두 개 맞으면 *마지막 릴을 천천히*, 빛나게." },
          tease(w, r) { r.glow = 1; },
        },
        {
          id: "line", name: { en: "Win Line", ko: "당첨 줄" }, param: "flashing line",
          cap: { en: "A *flashing line* through the winners.", ko: "당첨 줄이 *번쩍번쩍*." },
          win(w) { w.line = 1.5; w.flash("253,224,71", 0.35); },
        },
        {
          id: "coins", name: { en: "Coin Fountain", ko: "동전 분수" }, param: "24 coins",
          cap: { en: "*Coins pour out* of the machine.", ko: "기계에서 *동전이 쏟아져요*." },
          win(w) { coinSpray(w, 270, 300, 24, 300, [400, 720]); },
        },
        {
          id: "lights", name: { en: "Party Lights", ko: "파티 조명" }, param: "chase 14Hz · 2s",
          cap: { en: "The bulbs go *crazy* on a win.", ko: "당첨되면 전구가 *난리*가 나요." },
          win(w) { w.party = 2; },
        },
        {
          id: "sound", name: { en: "Ticks + Jackpot", ko: "딸깍 + 잭팟" }, param: "tick / clunk / fanfare",
          cap: { en: "*Ticks* while spinning, *clunk* per stop.", ko: "돌 땐 *따르륵*, 멈출 땐 *덜컹*." },
          update(w, dt) { if (w.reels.some(r => r.spin) && (w.tk = (w.tk || 0) - dt) <= 0) { w.tk = 0.06; w.sfx.tick(); } },
          stop(w) { w.sfx.thunk(); },
          win(w) { w.sfx.fanfare(); },
        },
      ],
    },

    /* ───────── 17. 룰렛 돌림판 ───────── */
    {
      id: "casual-wheel", cat: "casual", view: "ui",
      title: { en: "Make the prize wheel *tense*", ko: "돌림판을 *쫄깃하게*" },
      intro: { en: "Spins. *Stops dead.* No drama.", ko: "돌다가 *뚝* 멈춤. 긴장감 0." },
      interval: 2.8, stepDur: 4.0,
      drawFloor() {},
      setup(w) { w.S = { a: 0, ptr: 0, win: -1, glow: 0, ease: "lin", dur: 1.1, wind: 0 }; w.lastSeg = 0; w.pick = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S; S.win = -1; S.ease = "lin"; S.dur = 1.1; S.wind = 0;
        w.emit("spin", S);
        const seg = [2, 5, 0, 6][w.pick++ % 4], target = Math.ceil(S.a / TAU) * TAU + TAU * 3 - (seg + 0.5) * TAU / 8;
        const go = () => w.tween(S, { a: target }, S.dur, S.ease, () => { S.win = seg; w.emit("land", S, seg); w.after(0.9, () => { w.busy = false; }); });
        if (S.wind) w.tween(S, { a: S.a - S.wind }, 0.22, "out", go); else go();
      },
      update(w, dt) {
        const S = w.S, seg = Math.floor(S.a / (TAU / 8));
        if (seg !== w.lastSeg) { w.lastSeg = seg; w.emit("peg", S); }
        S.ptr += (0 - S.ptr) * Math.min(1, dt * 14); S.glow = Math.max(0, S.glow - dt * 0.4);
      },
      drawFront(w, ctx) {
        const S = w.S, cx = 270, cy = 200, R = 120, labels = ["100", "×2", "50", "500", "10", "×3", "1000", "20"];
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(cx + 6, cy + 8, R + 10, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1f2937"; ctx.beginPath(); ctx.arc(cx, cy, R + 10, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.a);
        for (let i = 0; i < 8; i++) {
          const a0 = -Math.PI / 2 + i * TAU / 8;
          ctx.fillStyle = `rgb(${RB[i % 6]})`; if (i >= 6) ctx.fillStyle = i === 6 ? "#f472b6" : "#2dd4bf";
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a0 + TAU / 8); ctx.closePath(); ctx.fill();
          if (S.win === i && S.glow > 0) { ctx.fillStyle = `rgba(255,255,255,${0.55 * S.glow * (0.6 + 0.4 * Math.sin(w.time * 20))})`; ctx.fill(); }
          ctx.save(); ctx.rotate(a0 + TAU / 16 + Math.PI / 2); T(ctx, labels[i], 0, -R * 0.68, 18, "#fff"); ctx.restore();
          const pa = a0; ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.arc(Math.cos(pa) * (R + 4), Math.sin(pa) * (R + 4), 4, 0, TAU); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(cx, cy - R - 16); ctx.rotate(S.ptr);
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(14, -12); ctx.lineTo(0, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      },
      steps: [
        {
          id: "ease", name: { en: "Ease-out Spin", ko: "점점 느려지기" }, param: "1.9s ease-out",
          cap: { en: "Fast, then *slower and slower*…", ko: "빠르다가 *점점, 점점* 느려져요…" },
          spin(w, S) { S.ease = "out"; S.dur = 1.9; },
        },
        {
          id: "windup", name: { en: "Wind-up", ko: "뒤로 당기기" }, param: "-0.35 rad · 220ms",
          cap: { en: "*Pull back* a little before the spin.", ko: "돌리기 전에 *살짝 뒤로*." },
          spin(w, S) { S.wind = 0.35; },
        },
        {
          id: "flapper", name: { en: "Flapper", ko: "바늘 튕김" }, param: "kick .55 / peg",
          cap: { en: "The pointer *flicks* on every peg.", ko: "핀을 지날 때마다 바늘이 *탁탁*." },
          peg(w, S) { S.ptr = -0.55; },
        },
        {
          id: "glow", name: { en: "Winner Glow", ko: "당첨 칸 번쩍" }, param: "pulse 20Hz",
          cap: { en: "The winning slice *pulses*.", ko: "당첨 칸이 *깜빡깜빡*." },
          land(w, S) { S.glow = 1.5; },
        },
        {
          id: "prize", name: { en: "Prize Reveal", ko: "상품 공개" }, param: "rays + text",
          cap: { en: "*Rays* and the prize, front and center.", ko: "*빛살*과 함께 상품을 크게." },
          land(w, S, seg) {
            w.spawn({ type: "rays", under: true, x: 270, y: 200, size: 240, n: 12, vr: 1.2, life: 1.8, hold: true, color: "253,224,71" });
            w.spawn({ type: "text", text: ["100", "×2", "50", "500", "10", "×3", "1000", "20"][seg] + "!", x: 270, y: 200, vy: -20, life: 1.8, size: 52, color: "#fde047" });
          },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "40 pieces",
          cap: { en: "A pop of *confetti* to finish.", ko: "마무리로 *꽃가루* 팡." },
          land(w) { confetti(w, 270, 80, 40, [200, 520], -Math.PI, 0, 2); },
        },
        {
          id: "sound", name: { en: "Clicks + Ding", ko: "딸깍 + 딩" }, param: "tick / peg · chime",
          cap: { en: "*Click* per peg, *ding* at the end.", ko: "핀마다 *딸깍*, 끝에 *딩*." },
          peg(w) { w.sfx.tick(); },
          land(w) { w.sfx.chime(5); w.sfx.fanfare(); },
        },
      ],
    },

    /* ───────── 18. 복권 긁기 ───────── */
    {
      id: "casual-scratch", cat: "casual", view: "ui",
      title: { en: "Make scratch cards *crispy*", ko: "복권 긁기를 *사각사각하게*" },
      intro: { en: "Grey goes away. *Prize is just… there.*", ko: "회색이 지워짐. 상금은 *그냥 거기*." },
      interval: 1.6, stepDur: 3.8,
      drawFloor() {},
      setup(w) {
        const cv = document.createElement("canvas"); cv.width = 260; cv.height = 150;
        w.S = { cv, x: 140, y: 120, cover: 1, shine: -1, sc: 1, tool: null, toolA: 0 };
        casualScratchReset(w);
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S; casualScratchReset(w);
        const N = 16, pts = [...Array(N)].map((_, i) => ({ x: 30 + i / (N - 1) * 200, y: i % 2 ? 30 : 120 }));
        pts.forEach((p, i) => w.after(i * 0.024, () => {
          const q = pts[Math.max(0, i - 1)], x = S.cv.getContext("2d");
          x.globalCompositeOperation = "destination-out"; x.lineCap = "round"; x.lineWidth = 46;
          x.beginPath(); x.moveTo(q.x, q.y); x.lineTo(p.x, p.y); x.stroke();
          w.emit("scratch", { x: S.x + p.x, y: S.y + p.y });
          if (i === N - 1) { w.emit("done", S); w.after(0.9, () => { w.busy = false; }); }
        }));
      },
      update(w, dt) { const S = w.S; S.toolA = Math.max(0, S.toolA - dt * 3); S.sc += (1 - S.sc) * Math.min(1, dt * 8); },
      drawFront(w, ctx) {
        const S = w.S;
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.roundRect(S.x - 14, S.y - 50, 288, 226, 16); ctx.fill();
        rr(ctx, S.x - 20, S.y - 56, 300, 226, 16, "#7c3aed");
        T(ctx, "LUCKY CARD", 270, S.y - 30, 20, "#fde047");
        ctx.save(); ctx.translate(270, S.y + 75); ctx.scale(S.sc, S.sc);
        rr(ctx, -130, -75, 260, 150, 10, "#fef3c7");
        T(ctx, "★ 1,000 ★", 0, 0, 40, "#e11d48");
        if (S.shine >= 0 && S.shine <= 1) {
          ctx.save(); ctx.beginPath(); ctx.roundRect(-130, -75, 260, 150, 10); ctx.clip();
          const x = -200 + S.shine * 400, g = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g; ctx.transform(1, 0, -0.4, 1, 0, 0); ctx.fillRect(x - 40, -80, 80, 160); ctx.restore();
        }
        ctx.restore();
        ctx.globalAlpha = S.cover; ctx.drawImage(S.cv, S.x, S.y); ctx.globalAlpha = 1;
        if (S.tool && S.toolA > 0) { ctx.globalAlpha = Math.min(1, S.toolA * 2); coinAt(ctx, S.tool.x + 10, S.tool.y - 10, 44); ctx.globalAlpha = 1; }
      },
      steps: [
        {
          id: "coin", name: { en: "Coin Tool", ko: "긁는 동전" }, param: "follows the stroke",
          cap: { en: "Show *what's scratching*. A coin.", ko: "*뭘로 긁는지* 보여줘요. 동전!" },
          scratch(w, p) { w.S.tool = p; w.S.toolA = 1; },
        },
        {
          id: "flakes", name: { en: "Silver Flakes", ko: "은박 부스러기" }, param: "3 flakes / move",
          cap: { en: "*Silver flakes* fly off the card.", ko: "*은박 부스러기*가 사각사각 튀어요." },
          scratch(w, p) {
            for (let i = 0; i < 3; i++) w.spawn({ type: "chunk", x: p.x, y: p.y, vx: rand(-200, 200), vy: rand(-260, -60), g: 1300, vr: rand(-20, 20), size: rand(2.5, 4.5), life: rand(0.5, 0.8), color: pick(["203,213,225", "148,163,184", "241,245,249"]) });
          },
        },
        {
          id: "reveal", name: { en: "Auto Clear", ko: "나머지 싹" }, param: "fade 0.3s",
          cap: { en: "Mostly scratched? *Clear the rest* for them.", ko: "거의 긁었으면 *나머지는 싹* 지워줘요." },
          done(w, S) { w.tween(S, { cover: 0 }, 0.3, "out"); },
        },
        {
          id: "shine", name: { en: "Shine Sweep", ko: "반짝 훑기" }, param: "sweep 0.5s",
          cap: { en: "A *shine sweeps* across the prize.", ko: "상금 위로 *반짝*이 쓱 지나가요." },
          done(w, S) { S.shine = 0; w.tween(S, { shine: 1.01 }, 0.55, "inout"); },
        },
        {
          id: "pop", name: { en: "Prize Pop", ko: "상금 톡" }, param: "1.25× + rays",
          cap: { en: "The prize *pops* with rays behind it.", ko: "상금이 *톡* 커지고 뒤로 빛살." },
          done(w, S) {
            S.sc = 1.25;
            w.spawn({ type: "rays", x: 270, y: S.y + 75, size: 230, n: 14, vr: 1, life: 2, hold: true, color: "253,224,71", under: true });
            confetti(w, 270, S.y + 40, 30, [250, 560], -Math.PI, 0, 1.8);
          },
        },
        {
          id: "sound", name: { en: "Scratch Sound", ko: "사각 소리" }, param: "noise / stroke",
          cap: { en: "A dry *scritch* per stroke, a *ding* at the end.", ko: "긁을 때 *사각*, 끝나면 *딩*." },
          scratch(w) { w.play(() => nz({ dur: 0.05, type: "bandpass", f: rand(2500, 4000), q: 1, vol: 0.18 })); },
          done(w) { w.sfx.chime(7); },
        },
      ],
    },
    /* ───────── 19. 인형 뽑기 ───────── */
    {
      id: "casual-claw", cat: "casual", view: "side",
      title: { en: "Make the claw machine *tense*", ko: "인형 뽑기를 *조마조마하게*" },
      intro: { en: "Grab. Lift. Drop. Like a *forklift*.", ko: "집고, 들고, 놓기. *지게차* 같아요." },
      interval: 2.3, stepDur: 4.0,
      drawFloor(w, ctx) {
        const p = w.party;
        rr(ctx, 70, 40, 400, 270, 18, "#1e1b4b"); ctx.lineWidth = 5; ctx.strokeStyle = p > 0 ? `rgb(${RB[Math.floor(w.time * 12) % 6]})` : "#6366f1"; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(84, 54, 372, 242);
        ctx.fillStyle = "#334155"; ctx.fillRect(84, 58, 372, 8);
        ctx.fillStyle = "#0f172a"; ctx.fillRect(392, 200, 58, 96); ctx.fillStyle = "#fbbf24"; ctx.fillRect(388, 196, 66, 6);
        label(ctx, "PRIZE", 421, 284, 11, "rgba(255,255,255,0.5)", "center", "'JetBrains Mono', monospace", 700);
      },
      setup(w) {
        w.C = { x: 160, y: 100, open: 1, swing: 0, sv: 0, px: 160 }; w.party = 0; w.pick = 0;
        w.toys = [[130, 0], [180, 1], [230, 2], [280, 3], [330, 4], [155, 5], [205, 4], [255, 1], [305, 0]].map(([x, c], i) => ({ x, y: i < 5 ? 272 : 240, hx: x, hy: i < 5 ? 272 : 240, c: RB[c], rot: 0, sx: 1, sy: 1, held: false, gone: false, vy: 0 }));
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const C = w.C, t = w.toys[5 + (w.pick++ % 4)];
        const step = (props, d, fn) => { w.emit("move"); w.tween(C, props, d, "inout", fn); };
        step({ x: t.x }, 0.32, () => step({ y: t.y - 34 }, 0.25, () => {
          C.open = 0; t.held = true; w.emit("grab", t);
          w.after(0.12, () => step({ y: 110 }, 0.3, () => step({ x: 421 }, 0.32, () => {
            C.open = 1; t.held = false; w.emit("drop", t);
            if (!t.falling) t.gone = true;
            w.emit("win", t);
            w.after(0.3, () => step({ x: 160 }, 0.3, () => { w.busy = false; }));
            w.after(1.2, () => Object.assign(t, { x: t.hx, y: t.hy, gone: false, falling: false, rot: 0 }));
          })));
        }));
      },
      update(w, dt) {
        const C = w.C;
        C.vx = (C.x - C.px) / Math.max(dt, 1e-4); C.px = C.x;
        for (const t of w.toys) {
          if (t.held) { t.x = C.x + Math.sin(C.swing) * (C.y - 66); t.y = 66 + Math.cos(C.swing) * (C.y - 66) + 34; }
          if (t.falling) { t.vy += 1600 * dt; t.y += t.vy * dt; if (t.y > 300) { t.gone = true; t.falling = false; } }
          t.sx += (1 - t.sx) * Math.min(1, dt * 10); t.sy += (1 - t.sy) * Math.min(1, dt * 10);
        }
        w.party = Math.max(0, w.party - dt);
      },
      drawFront(w, ctx) {
        for (const t of w.toys) if (!t.gone) casualCapsule(ctx, t);
        const C = w.C, ax = C.x, ay = 66, ex = ax + Math.sin(C.swing) * (C.y - ay), ey = ay + Math.cos(C.swing) * (C.y - ay);
        ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
        rr(ctx, ax - 16, ay - 4, 32, 12, 4, "#94a3b8");
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(-C.swing);
        rr(ctx, -12, -6, 24, 14, 4, "#e2e8f0");
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(s * 9, 6); ctx.rotate(s * (0.15 + C.open * 0.55));
          ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 6, 22); ctx.lineTo(-s * 4, 34); ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      },
      steps: [
        {
          id: "sway", name: { en: "Claw Sway", ko: "집게 흔들림" }, param: "pendulum k 60",
          cap: { en: "The claw *sways* on its cable when it moves.", ko: "움직이면 집게가 줄에 매달려 *흔들려요*." },
          update(w, dt) {
            const C = w.C;
            C.sv += (-C.swing * 60 - C.sv * 3 - C.vx * 0.06) * dt;
            C.swing += C.sv * dt;
          },
        },
        {
          id: "grip", name: { en: "Squeeze Grip", ko: "꽉 집기" }, param: "150ms close + squash",
          cap: { en: "Prongs *close slowly*. The prize *squishes*.", ko: "집게가 *천천히 오므라들고* 상품이 *눌려요*." },
          grab(w, t) { w.C.open = 1; w.tween(w.C, { open: 0 }, 0.15, "out"); t.sx = 1.25; t.sy = 0.78; },
        },
        {
          id: "wobble", name: { en: "Slip Wobble", ko: "빠질 듯 흔들" }, param: "rot ±0.2 · 25Hz",
          cap: { en: "Lifting, it *wobbles*. Will it slip?", ko: "들어올릴 때 *달랑달랑*. 빠질까?" },
          update(w) { for (const t of w.toys) if (t.held) t.rot = Math.sin(w.time * 25) * 0.2; },
        },
        {
          id: "chute", name: { en: "Chute Drop", ko: "출구로 쿵" }, param: "g 1600 + GET!",
          cap: { en: "It *falls* into the chute. *GET!*", ko: "출구로 *쿵* 떨어져요. *GET!*" },
          drop(w, t) {
            t.falling = true;
            t.vy = 0;
            w.after(0.25, () => { popText(w, 421, 170, "GET!", "#fde047", 34, -60); w.shake(0.2); });
          },
        },
        {
          id: "lights", name: { en: "Win Lights", ko: "당첨 조명" }, param: "rainbow 1s + confetti",
          cap: { en: "The cabinet *lights up*. Confetti!", ko: "기계 *조명이 번쩍번쩍*, 꽃가루까지." },
          win(w) {
            w.party = 1.6;
            w.after(0.25, () => confetti(w, 421, 200, 30, [250, 560], -2.6, -0.5, 1.6));
          },
        },
        {
          id: "sound", name: { en: "Motor + Clunk", ko: "모터 + 덜컥" }, param: "whirr / clunk / win",
          cap: { en: "*Whirr* while moving, *clunk* on the grab.", ko: "움직일 땐 *위잉*, 집을 땐 *덜컥*." },
          move(w) { w.play(() => tn({ type: "sawtooth", f: 90, f2: 110, dur: 0.28, vol: 0.06 })); },
          grab(w) { w.sfx.clickDown(); w.sfx.thunk(); },
          win(w) { w.after(0.25, () => w.sfx.fanfare()); },
        },
      ],
    },

    /* ───────── 20. 풍선 터뜨리기 ───────── */
    {
      id: "casual-balloon", cat: "casual", view: "side",
      title: { en: "Make balloon pops *POP*", ko: "풍선을 *빵* 터지게" },
      intro: { en: "Dart hits. Balloon… *leaves*.", ko: "다트 맞음. 풍선이… *퇴장*." },
      interval: 0.7, stepDur: 3.4,
      drawFloor(w, ctx) { const g = ctx.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, "#0c4a6e"); g.addColorStop(1, "#164e63"); ctx.fillStyle = g; ctx.fillRect(-60, -60, 660, 480); },
      setup(w) {
        w.bl = []; w.slot = 0;
        for (let i = 0; i < 5; i++) w.bl.push(casualBalloon(i, 0));
      },
      fire(w) {
        const live = w.bl.filter(b => !b.dead && !b.dying && b.y < 260);
        if (!live.length) return;
        const b = live[0], x0 = 40, y0 = 320;
        const T0 = 0.18, vx = (b.x - x0) / T0, vy = (b.y - y0) / T0;
        w.shoot({ x: x0, y: y0, vx, vy, draw: (ctx, p) => casualDart(ctx, p.x, p.y, Math.atan2(vy, vx)), test: p => p.x >= b.x - 4, onHit: () => {
          w.emit("hit", b);
          if (!b.dying) { b.dead = true; w.emit("burst", b); }
          w.after(0.4, () => w.bl.push(casualBalloon(w.slot++ % 5, 1)));
        } });
      },
      update(w, dt) {
        for (const b of w.bl) { b.y += (b.ty - b.y) * Math.min(1, dt * 2.5); b.ph += dt * 2; }
        w.bl = w.bl.filter(b => !b.dead);
      },
      drawFront(w, ctx) { for (const b of w.bl) casualBalloonDraw(ctx, b); },
      steps: [
        {
          id: "swell", name: { en: "Pre-pop Swell", ko: "터지기 직전 부풂" }, param: "1.3× in 50ms",
          cap: { en: "It *swells* for a split second, then pops.", ko: "아주 잠깐 *부풀었다가* 빵." },
          hit(w, b) {
            b.dying = true;
            w.tween(b, { s: 1.3 }, 0.05, "out", () => { b.dead = true; w.emit("burst", b); });
          },
        },
        {
          id: "shreds", name: { en: "Rubber Shreds", ko: "고무 조각" }, param: "12 shreds",
          cap: { en: "Torn *rubber bits* fly out.", ko: "찢어진 *고무 조각*이 흩어져요." },
          burst(w, b) { shards(w, b.x, b.y, 12, b.c, [220, 480]); },
        },
        {
          id: "ring", name: { en: "Air Burst", ko: "공기 파동" }, param: "ring + star",
          cap: { en: "A *ring of air* and a white flash.", ko: "*공기 고리*와 하얀 번쩍임." },
          burst(w, b) {
            ring(w, b.x, b.y, 20, 85, "255,255,255", 0.3, 7);
            w.spawn({ type: "star", x: b.x, y: b.y, size: 48, life: 0.12, color: "255,255,255" });
          },
        },
        {
          id: "confetti", name: { en: "Confetti Inside", ko: "속에 든 꽃가루" }, param: "26 pieces",
          cap: { en: "Hide *confetti inside*. Surprise!", ko: "안에 *꽃가루*를 숨겨둬요. 깜짝!" },
          burst(w, b) { confetti(w, b.x, b.y, 26, [120, 420], -Math.PI, Math.PI, 1.6); },
        },
        {
          id: "string", name: { en: "Falling String", ko: "떨어지는 끈" }, param: "g 700 · wiggle",
          cap: { en: "Leave the *string* to fall. Nice detail.", ko: "남은 *끈*이 팔랑 떨어져요." },
          burst(w, b) {
            w.shoot({ x: b.x, y: b.y + 30, vx: rand(-30, 30), vy: -40, g: 700, draw(ctx, p) {
              ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.y);
              for (let i = 1; i <= 6; i++) ctx.lineTo(p.x + Math.sin(p.age * 14 + i) * 5, p.y + i * 9); ctx.stroke();
            } });
          },
        },
        {
          id: "sound", name: { en: "Pop!", ko: "빵!" }, param: "pop + noise burst",
          cap: { en: "A sharp *bang*, not a soft click.", ko: "부드러운 딸깍 말고 *빵*." },
          burst(w) { w.sfx.pop(); w.play(() => nz({ dur: 0.08, type: "highpass", f: 1800, vol: 0.5 })); },
        },
      ],
    },

    /* ───────── 21. 뽁뽁이 ───────── */
    {
      id: "casual-bubble-wrap", cat: "casual", view: "ui",
      title: { en: "Make bubble wrap *addictive*", ko: "뽁뽁이를 *멈출 수 없게*" },
      intro: { en: "Click. Circle goes flat. *Not satisfying.*", ko: "톡. 동그라미가 납작. *시원하지 않아요*." },
      interval: 0.22, stepDur: 3.3,
      drawFloor(w, ctx) { rr(ctx, 92, 92, 356, 214, 16, "rgba(186,230,253,0.12)"); },
      setup(w) { casualWrap(w); w.count = 0; w.bump = 0; },
      fire(w) {
        const left = w.wrap.filter(b => !b.popped && !b.pressing);
        if (!left.length) { casualWrap(w); return; }
        const b = pick(left);
        w.emit("press", b);
        const pop = () => { b.popped = true; w.count++; w.emit("pop", b, w.count); };
        if (b.pressing) w.after(0.07, pop); else pop();
      },
      update(w, dt) { for (const b of w.wrap) { b.sx += (1 - b.sx) * Math.min(1, dt * 12); b.sy += (1 - b.sy) * Math.min(1, dt * 12); } w.bump = Math.max(0, w.bump - dt * 6); },
      drawFront(w, ctx) {
        for (const b of w.wrap) {
          ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.sx, b.sy);
          if (!b.popped) {
            const g = ctx.createRadialGradient(-6, -7, 2, 0, 0, 20); g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.4, "rgba(186,230,253,0.55)"); g.addColorStop(1, "rgba(125,211,252,0.25)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
          } else {
            ctx.fillStyle = "rgba(8,14,22,0.75)"; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
            ctx.strokeStyle = "rgba(186,230,253,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
            if (b.wr) { ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.5; ctx.beginPath(); b.wr.forEach(([x0, y0, x1, y1]) => { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }); ctx.stroke(); }
          }
          ctx.restore();
        }
      },
      drawHud(w, ctx) { const s = 1 + w.bump * 0.35; ctx.save(); ctx.translate(270, 62); ctx.scale(s, s); T(ctx, w.count + " POPS", 0, 0, 24, w.bump > 0.3 ? "#7dd3fc" : "#fff"); ctx.restore(); },
      steps: [
        {
          id: "press", name: { en: "Press Squash", ko: "꾹 누르기" }, param: "70ms · 1.3 / 0.65",
          cap: { en: "*Squash* it first. The pop comes after.", ko: "먼저 *꾹* 눌리고, 그다음 터져요." },
          press(w, b) { b.pressing = true; b.sx = 1.3; b.sy = 0.65; },
        },
        {
          id: "wrinkle", name: { en: "Crumpled Plastic", ko: "구겨진 비닐" }, param: "4 creases",
          cap: { en: "Popped bubbles look *crumpled*, not just flat.", ko: "터진 자리는 *쭈글쭈글*하게." },
          pop(w, b) {
            b.wr = [...Array(4)].map(() => [rand(-12, 12), rand(-12, 12), rand(-12, 12), rand(-12, 12)]);
            b.sx = 1.15;
            b.sy = 0.85;
          },
        },
        {
          id: "puff", name: { en: "Air Puff", ko: "바람 퓩" }, param: "ring + 4 puffs",
          cap: { en: "A tiny *puff of air* escapes.", ko: "작은 *바람*이 퓩 빠져나가요." },
          pop(w, b) {
            ring(w, b.x, b.y, 10, 38, "186,230,253", 0.3, 4);
            for (let i = 0; i < 5; i++) w.spawn({ type: "smoke", under: true, x: b.x, y: b.y, vx: rand(-110, 110), vy: rand(-130, -30), drag: 4, size: 3, size1: 12, life: 0.4, alpha: 0.5, color: "160,200,230" });
          },
        },
        {
          id: "glint", name: { en: "Glint", ko: "반짝" }, param: "star 24",
          cap: { en: "A little *glint* on each pop.", ko: "터질 때마다 *반짝*." },
          pop(w, b) { w.spawn({ type: "star", x: b.x, y: b.y, size: 26, life: 0.15, color: "255,255,255" }); },
        },
        {
          id: "kick", name: { en: "Micro Kick", ko: "미세 흔들림" }, param: "kick 3px",
          cap: { en: "The sheet *jolts* a tiny bit. You feel it.", ko: "판이 *아주 살짝* 튀어요. 손끝에 와요." },
          pop(w) { w.kick(rand(-3, 3), 3); },
        },
        {
          id: "count", name: { en: "Counter Bump", ko: "숫자 톡" }, param: "scale 1.35",
          cap: { en: "The pop counter *bumps*. Keep going.", ko: "숫자가 *톡톡*. 멈출 수 없어요." },
          pop(w) { w.bump = 1; },
        },
        {
          id: "sound", name: { en: "Random Pop", ko: "제각각 뽁" }, param: "pitch ±30%",
          cap: { en: "Every pop sounds *a bit different*.", ko: "*뽁* 소리가 매번 조금씩 달라요." },
          pop(w) {
            w.play(() => {
              tn({ f: rand(700, 1200), f2: 200, dur: 0.05, vol: 0.3 });
              nz({ dur: 0.04, type: "highpass", f: rand(2500, 4500), vol: 0.35 });
            });
          },
        },
      ],
    },

    /* ───────── 22. 시간 보너스 ───────── */
    {
      id: "casual-time-bonus", cat: "casual", view: "ui",
      title: { en: "Make time bonuses *feel like air*", ko: "시간 보너스를 *숨통 트이게*" },
      intro: { en: "+3 seconds. The bar *blinks*. Missed it.", ko: "+3초. 막대가 *툭*. 놓쳤어요." },
      interval: 1.3, stepDur: 3.6,
      drawFloor() {},
      setup(w) { w.t = 5; w.shown = 5; w.bump = 0; w.warnT = 0; w.clock = { x: 380, y: 230, sc: 1 }; w.spots = [[380, 230], [160, 250], [300, 270], [210, 215], [430, 270]]; w.si = 0; },
      fire(w) {
        const c = w.clock, add = () => { w.t = Math.min(10, w.t + 3); w.emit("bonus"); };
        w.emit("grab", c);
        if (w.on("fly")) w.after(0.35, add); else add();
        const s = w.spots[++w.si % w.spots.length]; c.x = s[0]; c.y = s[1];
      },
      update(w, dt) {
        w.t = Math.max(0.5, w.t - dt * 2.4);
        w.shown = w.on("fill") && w.shown < w.t ? w.shown + (w.t - w.shown) * Math.min(1, dt * 8) : w.t;
        w.bump = Math.max(0, w.bump - dt * 4);
        w.clock.sc = 1 + Math.sin(w.time * 6) * 0.06;
      },
      drawFront(w, ctx) { casualClock(ctx, w.clock.x, w.clock.y, 26 * w.clock.sc); },
      drawHud(w, ctx) {
        const x0 = 100, x1 = 440, k = w.shown / 10, low = w.warnT > 0;
        panel(ctx, x0, 80, x1 - x0, 24, 12, "rgba(0,0,0,0.55)");
        ctx.fillStyle = low ? `rgb(244,${63 + 60 * Math.abs(Math.sin(w.time * 10))},94)` : "#38bdf8";
        ctx.beginPath(); ctx.roundRect(x0 + 3, 83, (x1 - x0 - 6) * k, 18, 9); ctx.fill();
        if (w.bump > 0 && w.on("fill")) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x0 + (x1 - x0) * k, 92, 40, "134,239,172", w.bump); ctx.globalCompositeOperation = "source-over"; }
        const s = 1 + w.bump * 0.5 * (w.big ? 1 : 0);
        ctx.save(); ctx.translate(270, 140); ctx.scale(s, s); T(ctx, w.shown.toFixed(1), 0, 0, 40, w.big && w.bump > 0.2 ? "#4ade80" : low ? "#fb7185" : "#fff"); ctx.restore();
      },
      steps: [
        {
          id: "fly", name: { en: "Fly to Timer", ko: "타이머로 날아감" }, param: "seek 0.35s",
          cap: { en: "The clock *flies into the timer*. Cause → effect.", ko: "시계가 *타이머로 날아가요*. 원인 → 결과." },
          grab(w, c) {
            w.spawn({ type: "glow", seek: true, x: c.x, y: c.y, tx: 270 + (w.t / 10 - 0.5) * 340, ty: 92, life: 0.35, size: 22, color: "134,239,172" });
          },
        },
        {
          id: "fill", name: { en: "Smooth Refill", ko: "차오르는 막대" }, param: "lerp ×8 + glow tip",
          cap: { en: "The bar *fills up* with a glowing tip.", ko: "막대가 *쭉 차오르고* 끝이 빛나요." },
          bonus(w) { w.shown = w.t - 3; w.bump = 1; },
        },
        {
          id: "text", name: { en: "+3s Pop", ko: "+3초 톡" }, param: "green · 34px",
          cap: { en: "A big green *+3s* right by the bar.", ko: "막대 옆에 초록 *+3초*." },
          bonus(w) { w.spawn({ type: "text", text: "+3s", x: 440, y: 120, vy: -50, life: 1.1, size: 34, color: "#4ade80" }); },
        },
        {
          id: "bump", name: { en: "Digit Bump", ko: "숫자 톡" }, param: "1.5× · green",
          cap: { en: "The numbers *bump* and flash *green*.", ko: "숫자가 *톡* 커지며 *초록*으로." },
          bonus(w) { w.big = true; w.bump = 1; },
        },
        {
          id: "warn", name: { en: "Low-Time Warning", ko: "시간 부족 경고" }, param: "< 3s · red pulse",
          cap: { en: "Low time *pulses red*. Relief feels bigger.", ko: "시간이 없으면 *빨갛게 깜빡*. 안도감이 커져요." },
          update(w) {
            w.warnT = w.t < 3 ? 1 : 0;
            if (w.t < 3 && Math.sin(w.time * 10) > 0.95) w.vignette(0.25);
          },
        },
        {
          id: "flash", name: { en: "Relief Flash", ko: "안도의 번쩍" }, param: "green flash .25",
          cap: { en: "A soft *green flash*. Breathe.", ko: "부드러운 *초록 번쩍*. 휴." },
          bonus(w) { w.flash("74,222,128", 0.25); ring(w, 270, 92, 30, 180, "134,239,172", 0.4, 6, true); },
        },
        {
          id: "sound", name: { en: "Tick → Chime", ko: "째깍 → 띵" }, param: "tick when low",
          cap: { en: "Nervous *ticks* when low, a bright *chime* on bonus.", ko: "급할 땐 *째깍째깍*, 보너스엔 *띵*." },
          update(w, dt) { if (w.t < 3 && (w.tk = (w.tk || 0) - dt) <= 0) { w.tk = 0.25; w.sfx.tick(); } },
          bonus(w) { w.sfx.chime(9); },
        },
      ],
    },
  );
})();

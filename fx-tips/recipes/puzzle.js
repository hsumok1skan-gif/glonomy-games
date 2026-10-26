"use strict";
/* puzzle — 퍼즐 장르 이펙트 레시피 28개 */
(() => {
  /* ───── 이 파일 전용 도우미 ───── */
  const PAL = ["244,63,94", "56,189,248", "74,222,128", "250,204,21", "192,132,252", "251,146,60", "45,212,191"];
  const LIME = "198,244,50";
  // 떨어지는 블록 계열은 한 가지 색조만 씀 (판: 진한 단계, 조각: 밝은 단계)
  const SKY = ["14,165,233", "2,132,199", "3,105,161", "7,89,133"], SKY_HI = "125,211,252";
  const VIO = ["139,92,246", "124,58,237", "109,40,217", "91,33,182"], VIO_HI = "196,181,253";
  const EME = ["16,185,129", "5,150,105", "4,120,87", "6,95,70"], EME_HI = "110,231,183";
  // 둥근 블록 한 칸: 위는 밝게, 아래는 어둡게 (x, y = 가운데)
  function tile(ctx, x, y, s, c, k = 1, white = 0) {
    const h = (s / 2) * k;
    if (h <= 0.5) return;
    ctx.fillStyle = `rgb(${c})`; ctx.beginPath(); ctx.roundRect(x - h, y - h, h * 2, h * 2, h * 0.25); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x - h + 3, y - h + 3, h * 2 - 6, h * 0.32);
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(x - h + 3, y + h * 0.6, h * 2 - 6, h * 0.3);
    if (white > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, white)})`; ctx.beginPath(); ctx.roundRect(x - h, y - h, h * 2, h * 2, h * 0.25); ctx.fill(); }
  }
  // 판 배경: 어두운 판 + 칸 줄
  function board(ctx, x0, y0, cols, rows, cs, pad = 6) {
    ctx.fillStyle = "rgba(255,255,255,0.045)"; ctx.beginPath(); ctx.roundRect(x0 - pad, y0 - pad, cols * cs + pad * 2, rows * cs + pad * 2, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let c = 1; c < cols; c++) { ctx.moveTo(x0 + c * cs, y0); ctx.lineTo(x0 + c * cs, y0 + rows * cs); }
    for (let r = 1; r < rows; r++) { ctx.moveTo(x0, y0 + r * cs); ctx.lineTo(x0 + cols * cs, y0 + r * cs); }
    ctx.stroke();
  }
  // 네모 파편
  function shards(w, x, y, c, n = 6, sp = 280) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(sp * 0.35, sp);
      w.spawn({ type: "chunk", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, g: 1100, vr: rand(-14, 14), size: rand(3, 6), life: rand(0.45, 0.75), color: c });
    }
  }
  // 떠오르는 글자
  function say(w, text, x, y, size = 26, color = "#fff", life = 0.8) { return w.spawn({ type: "text", text, x, y, vy: -46, life, size, color }); }
  // 반짝이 별 몇 개
  function twinkle(w, x, y, n = 5, r = 30, c = "255,255,255") {
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), d = rand(r * 0.5, r); w.spawn({ type: "star", x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 20, size: rand(7, 12), life: rand(0.3, 0.5), color: c }); }
  }
  // 문자열 그림판 → 칸 배열 ('#' = 블록)
  const fromRows = (rows, total, cols, colorOf) => {
    const B = [];
    for (let r = 0; r < total; r++) {
      const s = rows[r - (total - rows.length)] || "";
      B.push(Array.from({ length: cols }, (_, c) => (s[c] === "#" ? { c: colorOf(r, c), sc: 1, wh: 0, dy: 0 } : null)));
    }
    return B;
  };
  const decay = (o, keys, dt, sp = 4) => { for (const k of keys) if (o[k] > 0) o[k] = Math.max(0, o[k] - dt * sp); };

  /* ───── 1. 낙하 블록 줄 지우기 ───── */
  const LC = { x0: 150, y0: 40, cs: 24, cols: 10, rows: 11 };
  const lcPos = (r, c) => ({ x: LC.x0 + c * LC.cs + LC.cs / 2, y: LC.y0 + r * LC.cs + LC.cs / 2 });
  const LC_PIECE = [[0, 0], [0, 1], [1, 0]];
  const lcBuild = () => fromRows(["#.......##", "##.....###", "###...####", "####..####", "####.#####"], LC.rows, LC.cols, (r, c) => SKY[(r + c * 3) % 4]);

  /* ───── 2. 하드 드롭 ───── */
  const HD = { x0: 166, y0: 44, cs: 26, cols: 8, rows: 10, land: 6 };
  const HD_PIECE = [[0, 0], [1, 0], [1, 1], [1, 2], [0, 2]];
  const HD_GRAY = ["100,116,139", "71,85,105", "148,163,184"];
  const hdBuild = () => fromRows(["#......#", "##..#.##", "###.####"], HD.rows, HD.cols, (r, c) => HD_GRAY[(r + c) % 3]);

  /* ───── 3. 회전 보너스 ───── */
  const SP = { x0: 150, y0: 50, cs: 24, cols: 10, rows: 10 };
  const spPos = (r, c) => ({ x: SP.x0 + c * SP.cs + SP.cs / 2, y: SP.y0 + r * SP.cs + SP.cs / 2 });
  const spBuild = () => fromRows(["......####", "###..#####", "###...####", "####..####"], SP.rows, SP.cols, (r, c) => VIO[(r + c * 3) % 4]);

  /* ───── 4. 숫자 합치기 ───── */
  const MG = { x0: 135, y0: 44, cs: 60, gap: 6 };
  const mgPos = (r, c) => ({ x: MG.x0 + MG.gap + c * (MG.cs + MG.gap) + MG.cs / 2, y: MG.y0 + MG.gap + r * (MG.cs + MG.gap) + MG.cs / 2 });
  const MG_COL = ["238,228,218", "237,224,200", "242,177,121", "245,149,99", "246,124,95", "246,94,59", "237,207,114", "237,204,97", "237,200,80", "237,197,63", "237,194,46"];
  const mgCol = v => MG_COL[Math.min(10, Math.max(0, Math.log2(v) - 1))];
  function mgTile(ctx, w, t) {
    if (!t || t.sc <= 0.02) return;
    const p = mgPos(t.r, t.c), x = t.x ?? p.x, s = MG.cs * t.sc, col = w.on("color") ? mgCol(t.v) : "150,150,162";
    if (t.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, p.y, 70, col, t.glow * 0.8); ctx.globalCompositeOperation = "source-over"; }
    ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.roundRect(x - s / 2, p.y - s / 2, s, s, 8 * t.sc); ctx.fill();
    const dark = w.on("color") && t.v <= 4;
    label(ctx, String(t.v), x, p.y + 1, (t.v < 100 ? 26 : t.v < 1000 ? 22 : 17) * t.sc, dark ? "#6b5d4f" : "#fff");
  }

  /* ───── 5. 얼음 미끄러짐 (쿼터뷰) ───── */
  const ICE_ROW = 1;

  /* ───── 6. 숫자 칸 정답 ───── */
  const NG = { x0: 138, y0: 42, cs: 44, n: 6 };
  const NG_SOL = ["123456", "456123", "231564", "564231", "312645", "645312"];
  const NG_SHOW = ["#.##.#", "##.#.#", "#.##.#", ".##.##", "#.#.##", "##.##."];
  const ngPos = (r, c) => ({ x: NG.x0 + c * NG.cs + NG.cs / 2, y: NG.y0 + r * NG.cs + NG.cs / 2 });

  /* ───── 7. 오답 흔들기 ───── */
  const QZ = [{ t: "16", x: 190, y: 182 }, { t: "13", x: 350, y: 182 }, { t: "11", x: 190, y: 262 }, { t: "10", x: 350, y: 262 }];

  RECIPES.push(
    /* 1 ─────────────────────────────── */
    {
      id: "puzzle-line-clear", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make line clears *explode*", ko: "줄 지우기를 *시원하게*" },
      intro: { en: "Two lines gone. Like they were *never there*.", ko: "두 줄이 사라졌는데 *원래 없던 것* 같아요." },
      interval: 1.4, stepDur: 3.6,
      drawFloor(w, ctx) { board(ctx, LC.x0, LC.y0, LC.cols, LC.rows, LC.cs); },
      setup(w) { w.S = { B: lcBuild(), py: 9, piece: false, clearT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.B = lcBuild(); S.py = -1; S.piece = true;
        w.tween(S, { py: 9 }, 0.18, "in", () => {
          S.piece = false;
          for (const [dr, dc] of LC_PIECE) S.B[9 + dr][4 + dc] = { c: SKY_HI, sc: 1, wh: 0, dy: 0 };
          S.clearT = 0;
          w.emit("clear", [9, 10]);
          w.after(S.clearT, () => {
            S.B.splice(9, 2);
            S.B.unshift(Array(LC.cols).fill(null), Array(LC.cols).fill(null));
            const moved = S.B.flat().filter(Boolean);
            w.emit("collapse", moved);
            w.after(0.3, () => { w.busy = false; });
          });
        });
      },
      update(w, dt) { for (const m of w.S.B.flat()) if (m) decay(m, ["wh"], dt, 3); },
      drawFront(w, ctx) {
        const S = w.S;
        S.B.forEach((row, r) => row.forEach((m, c) => { if (m) { const p = lcPos(r, c); tile(ctx, p.x, p.y + m.dy, LC.cs - 2, m.c, m.sc, m.wh); } }));
        if (S.piece) for (const [dr, dc] of LC_PIECE) { const p = lcPos(S.py + dr, 4 + dc); tile(ctx, p.x, p.y, LC.cs - 2, SKY_HI); }
      },
      steps: [
        {
          id: "flash", name: { en: "White Flash", ko: "하얀 번쩍임" }, param: "rows white · 150ms",
          cap: { en: "Flash the full rows *white* before they go.", ko: "꽉 찬 줄이 사라지기 전에 *하얗게* 번쩍." },
          clear(w, rows) { w.S.clearT = 0.15; rows.forEach(r => w.S.B[r].forEach(m => { m.wh = 1; })); },
        },
        {
          id: "pop", name: { en: "Center-out Pop", ko: "가운데부터 톡톡" }, param: "35ms stagger",
          cap: { en: "Pop the cells from the *middle out*.", ko: "*가운데부터 바깥으로* 톡톡 터져요." },
          clear(w, rows) {
            w.S.clearT = 0.32;
            rows.forEach(r => w.S.B[r].forEach((m, c) => w.after(Math.abs(c - 4.5) * 0.035, () => w.tween(m, { sc: 0 }, 0.12, "in"))));
          },
        },
        {
          id: "shards", name: { en: "Colored Shards", ko: "같은 색 파편" }, param: "4 chunks / cell",
          cap: { en: "Each cell breaks into *its own color*.", ko: "칸마다 *제 색깔* 파편이 튀어요." },
          clear(w, rows) {
            rows.forEach(r => w.S.B[r].forEach((m, c) => {
              const p = lcPos(r, c);
              w.after(Math.abs(c - 4.5) * 0.035 + 0.1, () => shards(w, p.x, p.y, m.c, 6, 340));
            }));
          },
        },
        {
          id: "drop", name: { en: "Stack Falls In", ko: "위 블록이 떨어짐" }, param: "ease-in 200ms",
          cap: { en: "The stack above *falls* into the gap. No teleport.", ko: "위에 있던 블록이 *툭 떨어져요*. 순간이동 금지." },
          collapse(w, moved) { moved.forEach(m => { m.dy = -LC.cs * 2; w.tween(m, { dy: 0 }, 0.2, "in"); }); },
        },
        {
          id: "shake", name: { en: "Landing Thud", ko: "내려앉는 쿵" }, param: "kick 10px down",
          cap: { en: "When it lands, *kick* the screen down.", ko: "내려앉을 때 화면을 아래로 *쿵*." },
          collapse(w) { w.after(0.2, () => { w.shake(0.22); w.kick(0, 10); }); },
        },
        {
          id: "banner", name: { en: "Line Count Banner", ko: "몇 줄인지 외치기" }, param: "2 lines = DOUBLE",
          cap: { en: "Shout *how many* lines. Two is a *DOUBLE*.", ko: "*몇 줄*인지 크게. 두 줄이면 *DOUBLE*." },
          clear(w, rows) {
            say(w, "DOUBLE!", 270, 196, 42, "#c6f432", 0.9);
            w.spawn({ type: "glow", x: 270, y: lcPos(10, 0).y - 12, size: 150, size1: 40, life: 0.3, color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "burst + thud",
          cap: { en: "*Crack* on clear, *thud* when the stack lands.", ko: "지울 때 *파삭*, 내려앉을 때 *쿵*." },
          clear(w) { if (w.on("shards") || w.on("pop")) w.play(() => { sSnap(0.5, 0, 3500); for (let i = 0; i < 6; i++) sSnap(0.15, 0.02 + i * 0.03, 2500 + i * 300); }); else w.sfx.tock(); },
          collapse(w) { if (w.on("drop")) w.after(0.2, () => w.sfx.thud()); },
        },
      ],
    },

    /* 2 ─────────────────────────────── */
    {
      id: "puzzle-hard-drop", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make hard drops *slam*", ko: "한 번에 내리기를 *쾅!*" },
      intro: { en: "It just *blinks* to the bottom.", ko: "그냥 바닥으로 *깜빡* 이동해요." },
      interval: 1.15, stepDur: 3.5,
      drawFloor(w, ctx) { board(ctx, HD.x0, HD.y0 + w.S.bdy, HD.cols, HD.rows, HD.cs); },
      setup(w) { w.S = { B: hdBuild(), r: HD.land, ghost: false, trail: 0, sx: 1, sy: 1, wh: 0, bdy: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.r = 0; S.ghost = false;
        w.emit("spawn", S);
        w.after(0.3, () => {
          S.ghost = false; S.r = HD.land;
          w.emit("drop", S);
          w.emit("land", S);
          w.after(0.35, () => { w.busy = false; });
        });
      },
      update(w, dt) {
        const S = w.S, k = Math.min(1, dt * 14);
        S.sx += (1 - S.sx) * k; S.sy += (1 - S.sy) * k; S.bdy -= S.bdy * Math.min(1, dt * 16);
        decay(S, ["trail"], dt, 2); decay(S, ["wh"], dt, 2.5);
      },
      drawFront(w, ctx) {
        const S = w.S, cs = HD.cs, X = c => HD.x0 + c * cs + cs / 2, Y = r => HD.y0 + r * cs + cs / 2 + S.bdy;
        S.B.forEach((row, r) => row.forEach((m, c) => { if (m) tile(ctx, X(c), Y(r), cs - 2, m.c); }));
        if (S.trail > 0) {
          const y0 = Y(0) - cs / 2, y1 = Y(HD.land + 1) + cs / 2;
          ctx.globalCompositeOperation = "lighter";
          for (const c of [2, 3, 4]) {
            const g = ctx.createLinearGradient(0, y0, 0, y1);
            g.addColorStop(0, "rgba(56,189,248,0)"); g.addColorStop(1, `rgba(186,230,253,${0.9 * S.trail})`);
            ctx.fillStyle = g; ctx.fillRect(X(c) - cs / 2 + 2, y0, cs - 4, y1 - y0 - cs);
          }
          ctx.globalCompositeOperation = "source-over";
        }
        if (S.ghost) {
          ctx.strokeStyle = "rgba(125,211,252,0.85)"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
          for (const [dr, dc] of HD_PIECE) { ctx.beginPath(); ctx.roundRect(X(2 + dc) - cs / 2 + 3, Y(HD.land + dr) - cs / 2 + 3, cs - 6, cs - 6, 4); ctx.stroke(); }
          ctx.setLineDash([]);
        }
        const bx = X(3), by = Y(S.r + 1) + cs / 2;
        ctx.save(); ctx.translate(bx, by); ctx.scale(S.sx, S.sy); ctx.translate(-bx, -by);
        for (const [dr, dc] of HD_PIECE) tile(ctx, X(2 + dc), Y(S.r + dr), cs - 2, SKY_HI, 1, S.wh);
        ctx.restore();
      },
      steps: [
        {
          id: "ghost", name: { en: "Landing Ghost", ko: "착지 미리보기" }, param: "dashed outline",
          cap: { en: "Show *where it lands* before you drop.", ko: "내리기 전에 *떨어질 자리*를 보여줘요." },
          spawn(w, S) { S.ghost = true; },
        },
        {
          id: "trail", name: { en: "Speed Trail", ko: "속도 꼬리" }, param: "column fade 280ms",
          cap: { en: "Leave a *streak* down the whole drop path.", ko: "떨어진 길 전체에 *빛 꼬리*를 남겨요." },
          drop(w, S) { S.trail = 1; },
        },
        {
          id: "squash", name: { en: "Squash + Board Dip", ko: "찌그러짐 + 판 눌림" }, param: "1.25 / 0.7 · 8px",
          cap: { en: "The piece *squashes*. The whole board *dips*.", ko: "블록이 *찌그러지고*, 판 전체가 *쑥* 눌려요." },
          land(w, S) { S.sx = 1.25; S.sy = 0.7; S.bdy = 9; },
        },
        {
          id: "impact", name: { en: "Impact Kick", ko: "충격 반동" }, param: "stop 50ms · kick 14",
          cap: { en: "Freeze *one beat*, then kick the camera down.", ko: "*한 박자* 멈추고, 화면을 아래로 *쾅*." },
          land(w) { w.hitstop(0.05); w.shake(0.2); w.kick(0, 14); },
        },
        {
          id: "dust", name: { en: "Side Dust", ko: "양옆 먼지" }, param: "6 puffs + sparks",
          cap: { en: "Air *puffs out* from both sides.", ko: "양옆으로 공기가 *훅* 빠져나가요." },
          land(w) {
            const y = HD.y0 + (HD.land + 2) * HD.cs;
            dust(w, HD.x0 + 2 * HD.cs, y, 4, -1); dust(w, HD.x0 + 5 * HD.cs, y, 4, 1);
            sparks(w, HD.x0 + 3.5 * HD.cs, y, 8, "186,230,253", [200, 420], Math.PI, TAU);
          },
        },
        {
          id: "lock", name: { en: "Lock Flash", ko: "고정 번쩍" }, param: "white → 330ms",
          cap: { en: "Flash it *white*: locked, no take-backs.", ko: "*하얗게* 번쩍. 이제 고정이에요." },
          land(w, S) { S.wh = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + slam",
          cap: { en: "A short *whoosh*, then a heavy *slam*.", ko: "짧게 *휙*, 이어서 묵직하게 *쾅*." },
          drop(w) { w.sfx.swish(); },
          land(w) { if (w.on("impact") || w.on("squash")) w.sfx.thud(); else w.sfx.tock(); },
        },
      ],
    },

    /* 3 ─────────────────────────────── */
    {
      id: "puzzle-spin-bonus", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Reward the *tricky spin*", ko: "어려운 회전엔 *보상*을" },
      intro: { en: "A hard trick. Scored like a *normal drop*.", ko: "어려운 기술인데 *보통 착지*랑 똑같아요." },
      interval: 1.5, stepDur: 3.8,
      drawFloor(w, ctx) { board(ctx, SP.x0, SP.y0, SP.cols, SP.rows, SP.cs); },
      setup(w) { w.S = { B: spBuild(), pr: 8, ang: 0, wh: 0, score: 0, shown: 0, bump: 0, turnT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.pr = 7; S.ang = Math.PI / 2;
        w.after(0.22, () => {
          S.turnT = 0;
          w.emit("turn", S);
          if (!S.turnT) { S.ang = 0; S.pr = 8; }
          w.after(S.turnT, () => {
            S.score += 800;
            w.emit("lock", S);
            w.after(0.5, () => { w.busy = false; });
          });
        });
      },
      update(w, dt) {
        const S = w.S;
        decay(S, ["wh"], dt, 2.5); decay(S, ["bump"], dt, 5);
        S.shown = w.on("points") ? S.shown + (S.score - S.shown) * Math.min(1, dt * 6) : S.score;
      },
      drawFront(w, ctx) {
        const S = w.S, cs = SP.cs;
        S.B.forEach((row, r) => row.forEach((m, c) => { if (m) { const p = spPos(r, c); tile(ctx, p.x, p.y, cs - 2, m.c); } }));
        const pv = spPos(S.pr, 4), co = Math.cos(S.ang), si = Math.sin(S.ang);
        for (const [dc, dr] of [[-1, 0], [0, 0], [1, 0], [0, 1], [1, 1]]) tile(ctx, pv.x + (dc * co - dr * si) * cs, pv.y + (dc * si + dr * co) * cs, cs - 2, VIO_HI, 1, S.wh);
      },
      drawHud(w, ctx) {
        const S = w.S, sc = 1 + S.bump * 0.35;
        ctx.save(); ctx.translate(44, 96); ctx.scale(sc, sc);
        label(ctx, "SCORE", 0, 0, 12, "rgba(255,255,255,0.6)", "left", "'JetBrains Mono', monospace", 700);
        label(ctx, String(Math.round(S.shown)), 0, 22, 22, S.bump > 0.3 ? "#c6f432" : "#fff", "left");
        ctx.restore();
      },
      steps: [
        {
          id: "turn", name: { en: "Eased Turn", ko: "부드러운 회전" }, param: "160ms · overshoot",
          cap: { en: "Rotate *smoothly* into the slot, with a tiny overshoot.", ko: "홈 안으로 *부드럽게* 돌아 들어가요." },
          turn(w, S) { S.turnT = 0.16; w.tween(S, { ang: 0, pr: 8 }, 0.16, "back"); },
        },
        {
          id: "swoosh", name: { en: "Spin Swoosh", ko: "회전 궤적" }, param: "2 arcs",
          cap: { en: "Draw the *spin path* as a swoosh.", ko: "돌아간 *궤적*을 휙 그려요." },
          turn(w) {
            const p = spPos(7.5, 4);
            w.spawn({ type: "arc", x: p.x, y: p.y, size: 46, a0: -2.8, a1: -0.3, life: 0.28, color: "216,180,254" });
            w.spawn({ type: "arc", x: p.x, y: p.y, size: 30, a0: 0.3, a1: 2.8, life: 0.28, color: "216,180,254" });
          },
        },
        {
          id: "lock", name: { en: "Snug Fit Flash", ko: "쏙 맞는 번쩍" }, param: "white + ring",
          cap: { en: "Flash the piece: it *fits perfectly*.", ko: "블록이 번쩍. *딱 맞았다*는 신호." },
          lock(w, S) {
            S.wh = 1;
            const p = spPos(8.3, 4);
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 16, size1: 80, life: 0.35, w: 6, color: "216,180,254" });
          },
        },
        {
          id: "stop", name: { en: "Hit Stop + Zoom", ko: "멈칫 + 확대" }, param: "stop 90ms · zoom .07",
          cap: { en: "Freeze and *zoom* a hair. This moment matters.", ko: "멈칫하며 살짝 *확대*. 중요한 순간이니까요." },
          lock(w) { w.hitstop(0.09); w.zoomPunch(0.07); },
        },
        {
          id: "banner", name: { en: "Bonus Banner", ko: "보너스 외침" }, param: "rays + SPIN!",
          cap: { en: "Name the trick *out loud*: SPIN!", ko: "기술 이름을 *크게* 외쳐요. SPIN!" },
          lock(w) {
            w.spawn({ type: "rays", x: 270, y: 150, size: 150, n: 12, vr: 1.2, life: 0.9, color: "192,132,252" });
            say(w, "SPIN!", 270, 150, 48, "#e9d5ff", 1);
          },
        },
        {
          id: "points", name: { en: "Points Fly Home", ko: "점수가 날아감" }, param: "+800 → score",
          cap: { en: "Big points *fly* to the score and *count up*.", ko: "큰 점수가 점수판으로 *날아가 올라가요*." },
          lock(w, S) {
            const p = spPos(8, 4);
            say(w, "+800", p.x + 40, p.y - 40, 24, "#c6f432", 0.6);
            w.spawn({ type: "glow", seek: true, x: p.x, y: p.y, tx: 64, ty: 118, life: 0.5, size: 14, color: LIME });
            w.after(0.5, () => { S.bump = 1; });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish / crit / chime",
          cap: { en: "*Whip* on the turn, a *crack* on lock, then a chime.", ko: "돌 때 *휙*, 맞을 때 *딱*, 이어서 *띠링*." },
          turn(w) { w.sfx.swish(); },
          lock(w) { w.play(() => { sSnap(0.5, 0, 3000); sBody(220, 0.07, 0.5); }); if (w.on("banner")) w.after(0.12, () => w.sfx.fanfare()); else if (w.on("points")) w.after(0.12, () => w.sfx.chime(5)); },
        },
      ],
    },

    /* 4 ─────────────────────────────── */
    {
      id: "puzzle-merge-tiles", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make number merges *grow*", ko: "숫자 합치기를 *커지게*" },
      intro: { en: "2 + 2 = 4. The number changed. *That's it.*", ko: "2+2=4. 숫자만 바뀌었어요. *끝.*" },
      interval: 1.1, stepDur: 3.6,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.beginPath(); ctx.roundRect(MG.x0, MG.y0, 4 * (MG.cs + MG.gap) + MG.gap, 4 * (MG.cs + MG.gap) + MG.gap, 12); ctx.fill();
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const p = mgPos(r, c); ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.beginPath(); ctx.roundRect(p.x - MG.cs / 2, p.y - MG.cs / 2, MG.cs, MG.cs, 8); ctx.fill(); }
      },
      setup(w) {
        w.S = {
          A: { r: 1, c: 0, v: 2, sc: 1, glow: 0 }, B: { r: 1, c: 3, v: 2, sc: 1, glow: 0 }, slideT: 0, score: 0, bump: 0,
          rest: [[0, 1, 2], [0, 3, 8], [2, 0, 16], [3, 2, 4], [3, 3, 2], [2, 3, 32]].map(([r, c, v]) => ({ r, c, v, sc: 1, glow: 0 })),
        };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, A = S.A, B = S.B, tx = mgPos(1, 3).x;
        A.x = mgPos(1, 0).x; S.slideT = 0;
        w.emit("slide", A, tx);
        if (!S.slideT) A.x = tx;
        w.after(S.slideT, () => {
          S.A = null; B.v *= 2; S.score += B.v;
          w.emit("merge", B);
          w.after(0.3, () => {
            if (B.v >= 1024) B.v = 2;
            S.A = { r: 1, c: 0, v: B.v, sc: 1, glow: 0 };
            w.emit("spawn", S.A);
            w.after(0.15, () => { w.busy = false; });
          });
        });
      },
      update(w, dt) {
        const S = w.S;
        decay(S, ["bump"], dt, 5);
        for (const t of [S.A, S.B]) if (t) decay(t, ["glow"], dt, 1.4);
      },
      drawFront(w, ctx) { const S = w.S; S.rest.forEach(t => mgTile(ctx, w, t)); mgTile(ctx, w, S.B); mgTile(ctx, w, S.A); },
      drawHud(w, ctx) {
        const S = w.S, sc = 1 + S.bump * 0.4;
        ctx.save(); ctx.translate(462, 70); ctx.scale(sc, sc);
        label(ctx, "SCORE", 0, 0, 11, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
        label(ctx, String(S.score), 0, 22, 22, S.bump > 0.3 ? "#c6f432" : "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "slide", name: { en: "Slide In", ko: "미끄러져 오기" }, param: "100ms ease-in",
          cap: { en: "The tile *slides* into its twin. Speeding up.", ko: "타일이 짝을 향해 *쭉* 미끄러져요." },
          slide(w, A, tx) { w.S.slideT = 0.1; w.tween(A, { x: tx }, 0.1, "in"); },
        },
        {
          id: "pop", name: { en: "Merge Pop", ko: "합쳐질 때 뽕" }, param: "scale 1.3 → 1",
          cap: { en: "The merged tile *swells* for a moment.", ko: "합쳐진 타일이 잠깐 *뽕* 부풀어요." },
          merge(w, B) { B.sc = 1.3; w.tween(B, { sc: 1 }, 0.2, "out"); },
        },
        {
          id: "color", name: { en: "Value Colors + Glow", ko: "숫자별 색 + 빛" }, param: "11-step ramp",
          cap: { en: "Bigger number, *warmer color*. It glows on change.", ko: "숫자가 클수록 *뜨거운 색*. 바뀔 때 빛나요." },
          merge(w, B) { B.glow = 1; },
        },
        {
          id: "burst", name: { en: "Color Burst", ko: "색 터짐" }, param: "ring + 10 chunks",
          cap: { en: "A *ring* and sparks in the *new color*.", ko: "*새 색깔*로 고리와 불꽃이 퍼져요." },
          merge(w, B) {
            const p = mgPos(1, 3), c = mgCol(B.v);
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 30, size1: 90, life: 0.5, w: 7, color: c });
            shards(w, p.x, p.y, c, 10, 320);
          },
        },
        {
          id: "spawn", name: { en: "New Tile Grows", ko: "새 타일 자라기" }, param: "0 → 1 · back",
          cap: { en: "New tiles *grow* in. Never just appear.", ko: "새 타일은 *쑥 자라나요*. 그냥 나타나지 않게." },
          spawn(w, A) { A.sc = 0; w.tween(A, { sc: 1 }, 0.22, "back"); },
        },
        {
          id: "score", name: { en: "Score Pops", ko: "점수 톡" }, param: "+N float · bump",
          cap: { en: "Float the *points*. Bump the score.", ko: "*얻은 점수*가 떠오르고, 점수판이 *톡*." },
          merge(w, B) { const p = mgPos(1, 3); say(w, "+" + B.v, p.x, p.y - 44, 24, "#fde68a", 0.6); w.S.bump = 1; },
        },
        {
          id: "sound", name: { en: "Rising Pitch", ko: "올라가는 음" }, param: "+2 semitones / ×2",
          cap: { en: "Bigger merge, *higher note*.", ko: "숫자가 클수록 *음이 높아져요*." },
          slide(w) { w.sfx.swish(); },
          merge(w, B) { w.sfx.blip(Math.log2(B.v) * 2); if (w.on("burst")) w.sfx.pop(); },
        },
      ],
    },

    /* 5 ─────────────────────────────── */
    {
      id: "puzzle-ice-slide", cat: "puzzle", view: "iso", polished: true,
      title: { en: "Make ice slides *glide*", ko: "얼음 미끄러짐을 *쭈욱*" },
      intro: { en: "It moves. Stops. *Like a robot.*", ko: "움직이고, 멈춰요. *로봇처럼.*" },
      interval: 1.2, stepDur: 3.6,
      drawFloor(w, ctx) {
        for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 6; gx++) {
          const a = isoPt(gx, gy), b = isoPt(gx + 1, gy), c = isoPt(gx + 1, gy + 1), d = isoPt(gx, gy + 1);
          ctx.fillStyle = (gx + gy) % 2 ? "rgba(125,211,252,0.13)" : "rgba(125,211,252,0.07)";
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(186,230,253,0.12)"; ctx.lineWidth = 1; ctx.stroke();
        }
      },
      setup(w) { w.S = { x: 0, dir: 1, sx: 1, sy: 1, moving: false, trail: [], wallL: 0, wallR: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, to = S.dir > 0 ? 5 : 0;
        const go = () => {
          S.moving = true;
          w.emit("launch", S);
          w.tween(S, { x: to }, 0.42, "lin", () => {
            S.moving = false;
            w.emit("hit", S);
            S.dir *= -1;
            w.after(0.2, () => { w.busy = false; });
          });
        };
        if (w.on("windup")) { w.emit("windup", S); w.after(0.1, go); } else go();
      },
      update(w, dt) {
        const S = w.S, k = Math.min(1, dt * 12);
        S.sx += (1 - S.sx) * k; S.sy += (1 - S.sy) * k;
        S.wallL -= S.wallL * Math.min(1, dt * 10); S.wallR -= S.wallR * Math.min(1, dt * 10);
        if (!S.moving && S.trail.length) S.trail.shift();
      },
      drawFront(w, ctx) {
        const S = w.S, wall = ["#64748b", "#334155", "#1e293b"];
        for (let gy = 0; gy < 4; gy++) {
          ctx.save(); ctx.translate(-S.wallL * 8, 0); drawCube(ctx, -1, gy, 34, wall); ctx.restore();
        }
        S.trail.forEach((x, i) => { ctx.globalAlpha = (i / S.trail.length) * 0.35; drawCube(ctx, x, ICE_ROW, 40, ["#bae6fd", "#7dd3fc", "#38bdf8"]); });
        ctx.globalAlpha = 1;
        drawCube(ctx, S.x, ICE_ROW, 40, ["#f0f9ff", "#7dd3fc", "#0ea5e9"], S.sx, S.sy);
        for (let gy = 0; gy < 4; gy++) {
          ctx.save(); ctx.translate(S.wallR * 8, S.wallR * 4); drawCube(ctx, 6, gy, 34, wall); ctx.restore();
        }
      },
      steps: [
        {
          id: "windup", name: { en: "Pull Back", ko: "뒤로 당기기" }, param: "−0.15 tile · 100ms",
          cap: { en: "*Pull back* a little before launch.", ko: "출발 전에 살짝 *뒤로 당겨요*." },
          windup(w, S) { S.sx = 0.85; S.sy = 1.15; w.tween(S, { x: S.x - S.dir * 0.15 }, 0.1, "out"); },
        },
        {
          id: "trail", name: { en: "Afterimages", ko: "잔상" }, param: "8 ghosts",
          cap: { en: "Leave *afterimages* behind. Speed you can see.", ko: "뒤에 *잔상*을 남겨요. 속도가 눈에 보이게." },
          update(w) { const S = w.S; if (S.moving) { S.trail.push(S.x); if (S.trail.length > 8) S.trail.shift(); } },
        },
        {
          id: "frost", name: { en: "Ice Spray", ko: "얼음 가루" }, param: "sparks / frame",
          cap: { en: "Kick up *ice dust* along the way.", ko: "지나가는 자리마다 *얼음 가루*가 날려요." },
          update(w) {
            const S = w.S; if (!S.moving) return;
            const b = isoPt(S.x + 0.5 - S.dir * 0.45, ICE_ROW + 0.9);
            w.spawn({ type: "spark", x: b.x, y: b.y, vx: -S.dir * rand(60, 160), vy: rand(-90, -20), drag: 3, life: 0.35, size: 2, color: "224,242,254" });
          },
        },
        {
          id: "bump", name: { en: "Wall Bump", ko: "벽에 쿵" }, param: "squash + wall shove",
          cap: { en: "Hit the wall: *squash*, and the wall *gets pushed*.", ko: "벽에 닿으면 *찌그러지고*, 벽도 *밀려요*." },
          hit(w, S) { S.sx = 1.2; S.sy = 0.72; S[S.dir > 0 ? "wallR" : "wallL"] = 1; w.kick(S.dir * 10, S.dir * 4); },
        },
        {
          id: "recoil", name: { en: "Bounce Back", ko: "튕겨 돌아옴" }, param: "0.25 tile · 270ms",
          cap: { en: "*Bounce back* a little, then settle.", ko: "살짝 *튕겼다가* 제자리에 붙어요." },
          hit(w, S) { const x = S.x; w.tween(S, { x: x - S.dir * 0.25 }, 0.07, "out", () => w.tween(S, { x }, 0.2, "inout")); },
        },
        {
          id: "shatter", name: { en: "Frost Burst", ko: "얼음 파편" }, param: "ring + 8 chunks",
          cap: { en: "A burst of *frost* where it hits.", ko: "부딪힌 자리에 *서리*가 팍." },
          hit(w, S) {
            const b = isoPt(S.dir > 0 ? 6 : 0, ICE_ROW + 0.5, 18);
            w.spawn({ type: "ring", flat: true, x: b.x, y: b.y + 18, size: 10, size1: 60, life: 0.4, w: 5, color: "186,230,253" });
            shards(w, b.x, b.y, "224,242,254", 8, 260);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "skid / thunk",
          cap: { en: "A long *skid*, then a dull *thunk*.", ko: "길게 *스르륵*, 이어서 둔하게 *퉁*." },
          launch(w) { w.sfx.skid(); },
          hit(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 6 ─────────────────────────────── */
    {
      id: "puzzle-number-correct", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make right answers *click*", ko: "정답 입력을 *딱 맞게*" },
      intro: { en: "Right number. *No reaction.*", ko: "정답을 넣었는데 *반응이 없어요*." },
      interval: 1.0, stepDur: 3.5,
      drawFloor(w, ctx) {
        const S = w.S, cs = NG.cs, x0 = NG.x0, y0 = NG.y0, L = NG.n * cs;
        ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(x0, y0, L, L);
        if (S.hl > 0) {
          ctx.fillStyle = `rgba(56,189,248,${0.16 * S.hl})`;
          ctx.fillRect(x0, y0 + S.hr * cs, L, cs); ctx.fillRect(x0 + S.hc * cs, y0, cs, L);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 1; i < NG.n; i++) { ctx.moveTo(x0 + i * cs, y0); ctx.lineTo(x0 + i * cs, y0 + L); ctx.moveTo(x0, y0 + i * cs); ctx.lineTo(x0 + L, y0 + i * cs); }
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.moveTo(x0 + 3 * cs, y0); ctx.lineTo(x0 + 3 * cs, y0 + L);
        for (const r of [2, 4]) { ctx.moveTo(x0, y0 + r * cs); ctx.lineTo(x0 + L, y0 + r * cs); }
        ctx.strokeRect(x0, y0, L, L); ctx.stroke();
      },
      setup(w) {
        w.S = { next: 0, hl: 0, hr: 2, hc: 1, cells: NG_SOL.map((row, r) => [...row].map((v, c) => ({ v, given: NG_SHOW[r][c] === "#", user: false, sc: 1, ok: 0, hop: 0 }))) };
      },
      fire(w) {
        const S = w.S, row = S.cells[2];
        if (S.next === 0) { row[1].user = false; row[4].user = false; }
        const c = [1, 4][S.next], m = row[c];
        m.user = true; S.hr = 2; S.hc = c;
        w.emit("input", m, 2, c);
        if (S.next === 1) w.after(0.15, () => w.emit("row", row));
        S.next ^= 1;
      },
      update(w, dt) { const S = w.S; decay(S, ["hl"], dt, 1.6); for (const m of S.cells.flat()) { decay(m, ["ok"], dt, 2); decay(m, ["hop"], dt, 5); } },
      drawFront(w, ctx) {
        const S = w.S;
        S.cells.forEach((row, r) => row.forEach((m, c) => {
          const p = ngPos(r, c);
          if (m.ok > 0) { ctx.fillStyle = `rgba(74,222,128,${0.55 * m.ok})`; ctx.fillRect(p.x - NG.cs / 2 + 1, p.y - NG.cs / 2 + 1, NG.cs - 2, NG.cs - 2); }
          if (!m.given && !m.user) return;
          ctx.save(); ctx.translate(p.x, p.y - Math.sin(m.hop * Math.PI) * 12); ctx.scale(m.sc, m.sc);
          label(ctx, m.v, 0, 1, 24, m.given ? "rgba(255,255,255,0.75)" : "#7dd3fc");
          ctx.restore();
        }));
      },
      steps: [
        {
          id: "pop", name: { en: "Stamp In", ko: "콕 찍히기" }, param: "scale 1.9 → 1",
          cap: { en: "The digit *stamps* in, big to normal.", ko: "숫자가 크게 들어와 *콕* 찍혀요." },
          input(w, m) { m.sc = 1.9; w.tween(m, { sc: 1 }, 0.18, "out"); },
        },
        {
          id: "green", name: { en: "Green Cell", ko: "초록 칸" }, param: "fade 500ms",
          cap: { en: "Tint the cell *green*. Right, at a glance.", ko: "칸이 *초록색*으로. 한눈에 정답." },
          input(w, m) { m.ok = 1; },
        },
        {
          id: "cross", name: { en: "Row + Column Check", ko: "가로세로 확인" }, param: "bands fade 600ms",
          cap: { en: "Light up the *row and column* it just checked.", ko: "방금 확인한 *가로줄과 세로줄*을 비춰요." },
          input(w) { w.S.hl = 1; },
        },
        {
          id: "sparkle", name: { en: "Sparkle", ko: "반짝" }, param: "5 stars",
          cap: { en: "A few *sparkles* around the digit.", ko: "숫자 둘레에 *반짝이* 몇 개." },
          input(w, m, r, c) { const p = ngPos(r, c); twinkle(w, p.x, p.y, 5, 30, "186,230,253"); },
        },
        {
          id: "wave", name: { en: "Row Wave", ko: "한 줄 파도" }, param: "50ms / cell hop",
          cap: { en: "Row done? Make it *wave*, cell by cell.", ko: "한 줄을 채우면 칸마다 *파도타기*." },
          row(w, row) { row.forEach((m, c) => w.after(c * 0.05, () => { m.hop = 1; m.ok = 1; })); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "chime / arpeggio",
          cap: { en: "A soft *chime*. A full row plays a *run*.", ko: "정답엔 *띵*, 한 줄 완성엔 *띠리링*." },
          input(w) { w.sfx.tock(); if (w.on("green")) w.sfx.chime(0); },
          row(w) { if (w.on("wave")) [0, 4, 7, 12].forEach((n, i) => w.after(i * 0.06, () => w.sfx.chime(n))); },
        },
      ],
    },

    /* 7 ─────────────────────────────── */
    {
      id: "puzzle-wrong-shake", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Say *no* without words", ko: "말 없이 *틀렸다*고 하기" },
      intro: { en: "Wrong answer. A thin red line. *Missed it?*", ko: "틀렸는데 빨간 테두리뿐. *봤어요?*" },
      interval: 1.1, stepDur: 3.6,
      drawFloor() {},
      setup(w) { w.S = { lives: 3, cur: 0, opts: QZ.map(o => ({ ...o, bad: 0, shk: 0, red: 0, hint: 0 })) }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, o = S.opts[0];
        S.cur = 1;
        w.after(0.12, () => {
          o.bad = 1; S.lives -= 1;
          w.emit("wrong", o, S);
          w.after(0.55, () => { S.cur = 0; o.bad = 0; if (S.lives <= 0) S.lives = 3; w.busy = false; });
        });
      },
      update(w, dt) { for (const o of w.S.opts) { decay(o, ["shk"], dt, 2.6); decay(o, ["red"], dt, 1.8); decay(o, ["hint"], dt, 1.2); } },
      drawFront(w, ctx) {
        const S = w.S;
        rr(ctx, 110, 72, 320, 56, 12, "rgba(255,255,255,0.08)");
        label(ctx, "3 + 5 × 2 = ?", 270, 100, 26, "#fff");
        for (let i = 0; i < 3; i++) {
          const on = i < S.lives;
          ctx.globalAlpha = on ? 1 : 0.18; ctx.drawImage(SPR.heart.c, 236 + i * 26, 38, 22, 20); ctx.globalAlpha = 1;
        }
        for (const o of S.opts) {
          const x = o.x + Math.sin(w.time * 70) * 14 * o.shk;
          if (o.hint > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, o.y, 110, "74,222,128", 0.5 * Math.abs(Math.sin(o.hint * 9))); ctx.globalCompositeOperation = "source-over"; }
          rr(ctx, x - 70, o.y - 30, 140, 60, 12, o.red > 0 ? `rgba(239,68,68,${0.25 + o.red * 0.6})` : "#262a35", o.bad ? "#ef4444" : o.hint > 0 ? "#4ade80" : "rgba(255,255,255,0.14)", 2.5);
          label(ctx, o.t, x, o.y + 1, 26, o.red > 0.3 ? "#fecaca" : "#fff");
        }
        if (S.cur) {
          const o = S.opts[0];
          ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.arc(o.x + 40, o.y + 16, 11, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x + 40, o.y + 16, 18, 0, TAU); ctx.stroke();
        }
      },
      steps: [
        {
          id: "shake", name: { en: "Head Shake", ko: "도리도리" }, param: "±14px · 380ms",
          cap: { en: "*Shake* the button side to side. A clear *no*.", ko: "버튼을 좌우로 *도리도리*. 확실한 *아니요*." },
          wrong(w, o) { o.shk = 1; },
        },
        {
          id: "red", name: { en: "Red Fill", ko: "빨간 채움" }, param: "fill → fade 550ms",
          cap: { en: "Fill it *red*, not just the outline.", ko: "테두리만 말고 *속까지 빨갛게*." },
          wrong(w, o) { o.red = 1; },
        },
        {
          id: "stamp", name: { en: "X Stamp", ko: "X 도장" }, param: "60px pop",
          cap: { en: "Stamp a big *X*. No doubt left.", ko: "커다란 *X*를 콱. 헷갈릴 틈 없게." },
          wrong(w, o) { w.spawn({ type: "text", text: "✕", x: o.x, y: o.y - 4, life: 0.6, size: 62, color: "#ef4444" }); },
        },
        {
          id: "heart", name: { en: "Heart Falls", ko: "하트가 떨어짐" }, param: "spin + gravity",
          cap: { en: "Show the cost: a *heart falls* off.", ko: "대가를 보여줘요. *하트 하나가 툭*." },
          wrong(w, o, S) { w.spawn({ type: "ghost", img: SPR.heart.c, top: true, w: 22, h: 20, alpha0: 1, add: false, x: 247 + S.lives * 26, y: 48, vx: 60, vy: -220, g: 1200, vr: 6, life: 0.8, hold: true }); },
        },
        {
          id: "kick", name: { en: "Screen Jolt", ko: "화면 움찔" }, param: "kick 10 · red edge",
          cap: { en: "The whole screen *flinches*. Edges go red.", ko: "화면 전체가 *움찔*. 가장자리가 붉게." },
          wrong(w) { w.kick(-10, 0); w.vignette(0.35); },
        },
        {
          id: "hint", name: { en: "Show the Answer", ko: "정답 알려주기" }, param: "pulse after 300ms",
          cap: { en: "Then gently *pulse the right one*. Teach, don't punish.", ko: "곧이어 *정답을 깜빡*. 혼내지 말고 알려줘요." },
          wrong(w, o, S) { w.after(0.3, () => { S.opts[1].hint = 1; }); },
        },
        {
          id: "sound", name: { en: "Soft Buzz", ko: "낮은 삐빅" }, param: "2 detuned squares",
          cap: { en: "A *low buzz*. Short, never shrill.", ko: "*낮게 삐빅*. 짧게, 귀 아프지 않게." },
          wrong(w) { w.play(() => { tn({ type: "square", f: 150, f2: 120, dur: 0.22, vol: 0.14 }); tn({ type: "square", f: 157, f2: 125, dur: 0.22, vol: 0.12 }); }); },
        },
      ],
    },
  );
  /* ───── 8. 힌트 ───── */
  const HG = { x0: 120, y0: 50, cs: 50, cols: 6, rows: 5, a: [2, 2], b: [2, 3] };
  const hgPos = (r, c) => ({ x: HG.x0 + c * HG.cs + HG.cs / 2, y: HG.y0 + r * HG.cs + HG.cs / 2 });
  const HG_BOARD = ["013420", "241031", "320412", "104243", "432104"];

  /* ───── 9. 버블 슈터 ───── */
  const BB = { r: 16, y0: 52, dy: 28 };
  const BB_COL = { R: "244,63,94", B: "56,189,248", G: "74,222,128", Y: "250,204,21" };
  const BB_MAP = ["GBYBBYGBY", "BGRRYYBG", "YB.RR.BYG", "..GRY..."];
  const bbPos = (r, c) => ({ x: 142 + c * 32 + (r % 2 ? 16 : 0), y: BB.y0 + r * BB.dy });
  const bbNbr = (r, c) => (r % 2 ? [[r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1], [r, c - 1], [r, c + 1]] : [[r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c], [r, c - 1], [r, c + 1]]);
  function bbBuild() {
    const list = [];
    BB_MAP.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== ".") list.push({ r, c, col: BB_COL[ch], k: ch, ...bbPos(r, c), gone: false, fall: false, vy: 0, ox: 0, oy: 0 }); }));
    return list;
  }
  function bbFind(list, r, c) { return list.find(b => !b.gone && b.r === r && b.c === c); }
  function bubble(ctx, x, y, r, c, k = 1) {
    if (k <= 0.02) return;
    r *= k;
    ctx.fillStyle = `rgb(${c})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.85)"); g.addColorStop(0.3, "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  /* ───── 10. 쌓기 탑 (쿼터뷰) ───── */
  const ST = { h: 20, wy: 2.2, base: 3 };
  const hslRgb = h => { const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (0.6 - 0.4 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return `${f(0)},${f(8)},${f(4)}`; };
  const stPt = (x, y, z) => ({ x: 270 + (x - y) * 42, y: 236 + (x + y) * 21 - z });
  function stBox(ctx, cx, wx, z, h, hue, on, a = 1) {
    const x0 = cx - wx / 2, x1 = cx + wx / 2, y0 = -ST.wy / 2, y1 = ST.wy / 2, zt = z + h;
    const col = on ? [`hsl(${hue},80%,72%)`, `hsl(${hue},62%,48%)`, `hsl(${hue},60%,36%)`] : ["#e2e8f0", "#94a3b8", "#64748b"];
    const poly = (pts, f) => { ctx.fillStyle = f; ctx.beginPath(); pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p.x, p.y)); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    ctx.globalAlpha = a; ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1; ctx.lineJoin = "round";
    poly([stPt(x0, y1, z), stPt(x1, y1, z), stPt(x1, y1, zt), stPt(x0, y1, zt)], col[1]);
    poly([stPt(x1, y0, z), stPt(x1, y1, z), stPt(x1, y1, zt), stPt(x1, y0, zt)], col[2]);
    poly([stPt(x0, y0, zt), stPt(x1, y0, zt), stPt(x1, y1, zt), stPt(x0, y1, zt)], col[0]);
    ctx.globalAlpha = 1;
  }

  /* ───── 11. 줄 끊기 ───── */
  const RP = { ax: 190, ay: 46, L: 140, A: 0.9, om: 5, cupX: 362, cupY: 262 };
  function drawCandy(ctx, x, y, rot, sx = 1, sy = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
    ctx.fillStyle = "#f472b6";
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-30, -11); ctx.lineTo(-30, 11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(30, -11); ctx.lineTo(30, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fb7185"; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 10, -1.2, 1.9); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(-6, -8, 6, 3.5, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ───── 12. 점 잇기 ───── */
  const CD = { x0: 140, y0: 44, cs: 52, n: 5 };
  const cdPos = ([r, c]) => ({ x: CD.x0 + c * CD.cs + CD.cs / 2, y: CD.y0 + r * CD.cs + CD.cs / 2 });
  const CD_DONE = [{ col: "244,63,94", path: [[0, 0], [1, 0], [2, 0], [3, 0]] }, { col: "250,204,21", path: [[0, 4], [0, 3], [0, 2], [0, 1]] }];
  const CD_BLUE = [[1, 1], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2]];
  const CD_OPEN = { col: "74,222,128", dots: [[2, 1], [3, 3]] };
  function cdLine(ctx, path, n, col, lw, a = 1) {
    if (n < 1) return;
    ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i <= Math.min(n, path.length - 1); i++) { const p = cdPos(path[i]); ctx[i ? "lineTo" : "moveTo"](p.x, p.y); }
    const f = n - Math.floor(n);
    if (f > 0 && Math.floor(n) + 1 < path.length) { const a0 = cdPos(path[Math.floor(n)]), b0 = cdPos(path[Math.floor(n) + 1]); ctx.lineTo(a0.x + (b0.x - a0.x) * f, a0.y + (b0.y - a0.y) * f); }
    ctx.stroke();
  }

  /* ───── 13. 단어 찾기 ───── */
  const WF = { x0: 137, y0: 46, cs: 38, cols: 7, rows: 6 };
  const WF_GRID = ["KTLAPEB", "OHNDQMU", "XSTARQO", "WEIBVOJ", "ZRCUHNY", "GLAFDSI"];
  const WF_WORDS = [{ w: "STAR", cells: [[2, 1], [2, 2], [2, 3], [2, 4]], lx: 220, col: "250,204,21" }, { w: "MOON", cells: [[1, 5], [2, 5], [3, 5], [4, 5]], lx: 320, col: "56,189,248" }];
  const wfPos = ([r, c]) => ({ x: WF.x0 + c * WF.cs + WF.cs / 2, y: WF.y0 + r * WF.cs + WF.cs / 2 });

  /* ───── 14. 직소 퍼즐 ───── */
  const JG = { x0: 130, y0: 46, s: 70, cols: 4, rows: 3, hr: 1, hc: 2 };
  const jgEdge = (r, c, side) => {
    if (side === 0) return r === 0 ? 0 : -jgEdge(r - 1, c, 2);
    if (side === 3) return c === 0 ? 0 : -jgEdge(r, c - 1, 1);
    if (side === 1) return c === JG.cols - 1 ? 0 : (r + c) % 2 ? 1 : -1;
    return r === JG.rows - 1 ? 0 : (r + c) % 2 ? -1 : 1;
  };
  function jgPath(ctx, x, y, s, r, c) {
    const t = s * 0.15, pts = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % 4], e = jgEdge(r, c, k);
      const dx = (bx - ax) / s, dy = (by - ay) / s, nx = dy, ny = -dx;
      if (e) {
        ctx.lineTo(ax + dx * s * 0.35, ay + dy * s * 0.35);
        const mx = ax + dx * s * 0.5 + nx * e * t * 0.6, my = ay + dy * s * 0.5 + ny * e * t * 0.6;
        const ang = Math.atan2(dy, dx);
        ctx.arc(mx, my, t, ang + Math.PI + (e > 0 ? 0.6 : -0.6), ang - (e > 0 ? 0.6 : -0.6), e < 0);
      }
      ctx.lineTo(bx, by);
    }
    ctx.closePath();
  }
  function jgScene(ctx) {
    const W = JG.cols * JG.s, H = JG.rows * JG.s, x0 = JG.x0, y0 = JG.y0;
    ctx.fillStyle = lg(ctx, 0, y0, 0, y0 + H, [[0, "#fb923c"], [0.5, "#f472b6"], [1, "#6d28d9"]]); ctx.fillRect(x0 - 20, y0 - 20, W + 40, H + 40);
    ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(x0 + W * 0.62, y0 + H * 0.42, 34, 0, TAU); ctx.fill();
    ctx.fillStyle = "#4c1d95"; ctx.beginPath(); ctx.moveTo(x0 - 20, y0 + H + 20); ctx.lineTo(x0 + W * 0.25, y0 + H * 0.45); ctx.lineTo(x0 + W * 0.5, y0 + H * 0.75); ctx.lineTo(x0 + W * 0.78, y0 + H * 0.5); ctx.lineTo(x0 + W + 20, y0 + H * 0.8); ctx.lineTo(x0 + W + 20, y0 + H + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1e1b4b"; ctx.fillRect(x0 - 20, y0 + H * 0.85, W + 40, H * 0.2);
  }

  RECIPES.push(
    /* 8 ─────────────────────────────── */
    {
      id: "puzzle-hint-glow", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make hints *impossible to miss*", ko: "힌트를 *놓칠 수 없게*" },
      intro: { en: "There's a hint. A thin box. *Where?*", ko: "힌트가 떴는데 얇은 테두리뿐. *어디?*" },
      interval: 1.4, stepDur: 3.6,
      drawFloor(w, ctx) { board(ctx, HG.x0, HG.y0, HG.cols, HG.rows, HG.cs); },
      setup(w) { w.S = { H: { on: 0, sc: 1, glow: 0, nx: 0, arrow: 0, dim: 0 } }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const H = w.S.H;
        H.on = 1;
        w.emit("show", H);
        w.after(0.8, () => { H.on = 0; w.emit("hide", H); w.busy = false; });
      },
      drawFront(w, ctx) {
        const H = w.S.H, pa = hgPos(...HG.a), pb = hgPos(...HG.b), mx = (pa.x + pb.x) / 2;
        HG_BOARD.forEach((row, r) => [...row].forEach((ch, c) => {
          const p = hgPos(r, c), isA = r === HG.a[0] && c === HG.a[1], isB = r === HG.b[0] && c === HG.b[1];
          const off = isA ? H.nx : isB ? -H.nx : 0;
          ctx.globalAlpha = isA || isB ? 1 : 1 - H.dim * 0.7;
          drawGem(ctx, +ch, p.x + off, p.y, 17);
        }));
        ctx.globalAlpha = 1;
        if (!H.on) return;
        if (H.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, mx, pa.y, 80, "253,224,71", 0.35 + H.glow * 0.35); ctx.globalCompositeOperation = "source-over"; }
        ctx.save(); ctx.translate(mx, pa.y); ctx.scale(H.sc, H.sc);
        ctx.strokeStyle = H.glow > 0 ? "#fde047" : "rgba(255,255,255,0.7)"; ctx.lineWidth = H.glow > 0 ? 3.5 : 1.5;
        ctx.beginPath(); ctx.roundRect(-HG.cs, -HG.cs / 2, HG.cs * 2, HG.cs, 10); ctx.stroke();
        ctx.restore();
        if (H.arrow > 0) {
          const y = pa.y - 46 + Math.sin(w.time * 10) * 5;
          ctx.save(); ctx.translate(mx, y); ctx.scale(H.arrow, H.arrow);
          ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(14, -6); ctx.lineTo(14, -14); ctx.lineTo(30, 0); ctx.lineTo(14, 14); ctx.lineTo(14, 6); ctx.lineTo(-26, 6); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      },
      steps: [
        {
          id: "pulse", name: { en: "Breathing Glow", ko: "숨 쉬는 빛" }, param: "±12% · 9 rad/s",
          cap: { en: "Make the hint *breathe*. Motion grabs the eye.", ko: "힌트가 *숨 쉬듯* 커졌다 작아져요. 움직이면 눈이 가요." },
          update(w) { const H = w.S.H; H.sc = 1 + Math.sin(w.time * 9) * 0.12 * H.on; H.glow = H.on * (0.5 + 0.5 * Math.sin(w.time * 9)); },
        },
        {
          id: "nudge", name: { en: "Nudge Toward", ko: "서로 쿡쿡" }, param: "7px wiggle",
          cap: { en: "The two gems *lean toward* each other. Swap us!", ko: "두 보석이 서로 *쿡쿡*. 우리를 바꿔요!" },
          update(w) { const H = w.S.H; H.nx = H.on * Math.max(0, Math.sin(w.time * 12)) * 7; },
        },
        {
          id: "arrow", name: { en: "Bouncing Arrow", ko: "통통 화살표" }, param: "pop-in · bob 5px",
          cap: { en: "A bouncing *arrow* shows the move.", ko: "통통 튀는 *화살표*가 방향을 알려줘요." },
          show(w, H) { H.arrow = 0; w.tween(H, { arrow: 1 }, 0.25, "back"); },
          hide(w, H) { H.arrow = 0; },
        },
        {
          id: "dim", name: { en: "Spotlight", ko: "주변 어둡게" }, param: "others 30%",
          cap: { en: "*Dim everything else*. Spotlight the answer.", ko: "*나머지는 어둡게*. 답만 조명 받게." },
          show(w, H) { w.tween(H, { dim: 1 }, 0.3); },
          hide(w, H) { w.tween(H, { dim: 0 }, 0.2); },
        },
        {
          id: "orbit", name: { en: "Orbiting Sparkle", ko: "도는 반짝이" }, param: "1 spark / frame",
          cap: { en: "A *sparkle circles* the pair. Hard to ignore.", ko: "*반짝이가 빙글빙글*. 무시하기 어려워요." },
          update(w) {
            if (!w.S.H.on) return;
            const a = w.time * 7, p = hgPos(...HG.a);
            w.spawn({ type: "glow", x: p.x + 25 + Math.cos(a) * 62, y: p.y + Math.sin(a) * 34, size: 10, life: 0.35, color: "253,224,71" });
          },
        },
        {
          id: "sound", name: { en: "Soft Ping", ko: "작은 딩동" }, param: "2 notes · quiet",
          cap: { en: "A quiet *ding-dong*. A nudge, not an alarm.", ko: "조용히 *딩동*. 경보 말고 귀띔." },
          show(w) { if (w.on("pulse") || w.on("arrow")) w.sfx.chime(7); },
        },
      ],
    },

    /* 9 ─────────────────────────────── */
    {
      id: "puzzle-bubble-pop", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make bubble pops *chain*", ko: "버블 터짐을 *줄줄이*" },
      intro: { en: "Six bubbles vanish *at once*. Blink.", ko: "여섯 개가 *한꺼번에* 사라져요. 깜빡." },
      interval: 1.7, stepDur: 3.8,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.035)"; ctx.beginPath(); ctx.roundRect(118, 30, 304, 300, 12); ctx.fill();
        ctx.strokeStyle = "rgba(244,63,94,0.25)"; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(122, 270); ctx.lineTo(418, 270); ctx.stroke(); ctx.setLineDash([]);
      },
      setup(w) { w.S = { list: bbBuild(), shot: null, aim: 0, popT: 0, dropT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, to = bbPos(4, 3);
        S.list = bbBuild(); S.pops = 0;
        w.emit("aim", S);
        w.after(0.15, () => {
          S.aim = 0;
          S.shot = { x: 270, y: 300, col: BB_COL.R, sx: 1, sy: 1 };
          w.emit("shoot", S.shot);
          w.tween(S.shot, { x: to.x, y: to.y }, 0.16, "lin", () => {
            const b = { r: 4, c: 3, col: BB_COL.R, k: "R", ...to, gone: false, fall: false, vy: 0, ox: 0, oy: 0 };
            S.shot = null; S.list.push(b);
            const seen = new Set([b]), q = [b];
            while (q.length) { const x = q.shift(); x.d = x.d || 0; for (const [r, c] of bbNbr(x.r, x.c)) { const n = bbFind(S.list, r, c); if (n && n.k === "R" && !seen.has(n)) { n.d = x.d + 1; seen.add(n); q.push(n); } } }
            const group = [...seen];
            w.emit("land", b);
            S.popT = 0; w.emit("pop", group);
            if (!S.popT) group.forEach(g => { g.gone = true; });
            const keep = new Set(S.list.filter(x => x.r === 0 && !seen.has(x))), st = [...keep];
            while (st.length) { const x = st.pop(); for (const [r, c] of bbNbr(x.r, x.c)) { const n = bbFind(S.list, r, c); if (n && !seen.has(n) && !keep.has(n)) { keep.add(n); st.push(n); } } }
            const orphans = S.list.filter(x => !seen.has(x) && !keep.has(x));
            w.after(S.popT, () => {
              S.dropT = 0; w.emit("drop", orphans);
              if (!S.dropT) orphans.forEach(o => { o.gone = true; });
            });
            w.after(0.75, () => { w.busy = false; });
          });
        });
      },
      update(w, dt) {
        for (const b of w.S.list) {
          b.ox -= b.ox * Math.min(1, dt * 10); b.oy -= b.oy * Math.min(1, dt * 10);
          if (b.fall && !b.gone) { b.vy += 1600 * dt; b.y += b.vy * dt; if (b.y > 380) b.gone = true; }
        }
      },
      drawFront(w, ctx) {
        const S = w.S;
        if (S.aim) {
          const to = bbPos(4, 3);
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          for (let i = 1; i < 9; i++) { const k = i / 9; ctx.beginPath(); ctx.arc(270 + (to.x - 270) * k, 300 + (to.y - 300) * k, 3, 0, TAU); ctx.fill(); }
        }
        for (const b of S.list) if (!b.gone) bubble(ctx, b.x + b.ox, b.y + b.oy, BB.r - 1, b.col, b.sc ?? 1);
        if (S.shot) { ctx.save(); ctx.translate(S.shot.x, S.shot.y); ctx.scale(S.shot.sx, S.shot.sy); bubble(ctx, 0, 0, BB.r - 1, S.shot.col); ctx.restore(); }
        ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.arc(270, 316, 22, Math.PI, TAU); ctx.fill();
        if (!S.shot) bubble(ctx, 270, 304, BB.r - 1, BB_COL.R);
      },
      steps: [
        {
          id: "aim", name: { en: "Aim Dots", ko: "조준 점선" }, param: "8 dots",
          cap: { en: "Show the *path* before the shot.", ko: "쏘기 전에 *날아갈 길*을 보여줘요." },
          aim(w, S) { S.aim = 1; },
        },
        {
          id: "chain", name: { en: "Chain Pop", ko: "하나씩 연달아" }, param: "50ms / step",
          cap: { en: "Pop them *one after another*, outward from the hit.", ko: "맞은 곳부터 *하나씩 연달아* 터져요." },
          pop(w, group) {
            w.S.popT = 0.3;
            group.forEach(g => w.after(g.d * 0.06, () => { g.gone = true; w.emit("burst", g); }));
          },
        },
        {
          id: "burst", name: { en: "Pop Ring + Drops", ko: "고리 + 물방울" }, param: "ring + 6 drops",
          cap: { en: "Each pop leaves a *ring* and *droplets*.", ko: "터질 때마다 *고리*와 *물방울*." },
          burst(w, g) {
            w.spawn({ type: "ring", x: g.x, y: g.y, size: 10, size1: 34, life: 0.3, w: 5, color: g.col });
            sparks(w, g.x, g.y, 6, g.col, [120, 300]);
          },
        },
        {
          id: "drop", name: { en: "Orphans Fall", ko: "남은 건 떨어짐" }, param: "g 1600",
          cap: { en: "Cut-off bubbles *fall*. Bonus you can watch.", ko: "끊긴 버블은 *뚝 떨어져요*. 눈에 보이는 보너스." },
          drop(w, list) { w.S.dropT = 1; list.forEach(b => { b.fall = true; b.vy = rand(-200, -60); }); },
        },
        {
          id: "jolt", name: { en: "Neighbor Jolt", ko: "주변이 출렁" }, param: "push 6px out",
          cap: { en: "The hit *jolts* the neighbors outward.", ko: "맞은 충격에 *주변이 출렁*." },
          land(w, b) {
            for (const n of w.S.list) { const dx = n.x - b.x, dy = n.y - b.y, d = Math.hypot(dx, dy); if (d > 0 && d < 80) { n.ox = (dx / d) * 7; n.oy = (dy / d) * 7; } }
          },
        },
        {
          id: "score", name: { en: "Counting Points", ko: "세어지는 점수" }, param: "+10 × n",
          cap: { en: "Each pop *counts up*: +10, +20, +30...", ko: "터질 때마다 *점수가 올라가요*. +10, +20..." },
          burst(w, g) {
            const S = w.S, n = ++S.pops;
            if (!S.tx || S.tx.age >= S.tx.life) S.tx = say(w, "", g.x, g.y - 30, 20, "#fff", 0.9);
            Object.assign(S.tx, { text: "+" + n * 10, size: 18 + n * 3, age: 0 });
          },
        },
        {
          id: "sound", name: { en: "Rising Pops", ko: "올라가는 뽁" }, param: "+2 semitones / pop",
          cap: { en: "Each pop is *a note higher*. Pop-pop-POP!", ko: "터질수록 *음이 높아져요*. 뽁뽁뽁!" },
          shoot(w) { w.sfx.swish(); },
          burst(w, g) { w.sfx.blip(g.d * 2 + 1); },
        },
      ],
    },

    /* 10 ─────────────────────────────── */
    {
      id: "puzzle-stack-tower", cat: "puzzle", view: "iso", polished: true,
      title: { en: "Make stacking feel *heavy*", ko: "쌓기에 *무게감*을" },
      intro: { en: "It lands. The extra just *disappears*.", ko: "올라가요. 남는 부분은 *그냥 사라져요*." },
      interval: 1.1, stepDur: 3.6,
      drawFloor(w, ctx) {
        const p = [stPt(-2.5, -2, -w.S.camZ), stPt(2.5, -2, -w.S.camZ), stPt(2.5, 2, -w.S.camZ), stPt(-2.5, 2, -w.S.camZ)];
        if (w.on("hue")) glow(ctx, 270, 170, 260, `${hslRgb(w.S.hue)}`, 0.18);
        ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.beginPath(); p.forEach((q, i) => ctx[i ? "lineTo" : "moveTo"](q.x, q.y)); ctx.closePath(); ctx.fill();
      },
      setup(w) {
        w.S = { tower: [], mov: null, cut: [], camZ: 0, hue: 190, n: 0, dip: 0 };
        for (let i = 0; i < ST.base; i++) w.S.tower.push({ cx: 0, wx: 2.4, hue: 190 + i * 14, sy: 1 });
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        if (S.tower.length > 9) { S.tower.length = ST.base; S.camZ = 0; }
        const top = S.tower[S.tower.length - 1], dx = [0.45, 0, -0.38, 0.3][S.n++ % 4];
        S.mov = { cx: -3.2, wx: top.wx, hue: top.hue + 14, z: S.tower.length * ST.h + 34, sy: 1 };
        w.tween(S.mov, { cx: top.cx + dx }, 0.22, "lin", () => {
          w.tween(S.mov, { z: S.tower.length * ST.h }, 0.07, "in", () => {
            const m = S.mov, L = Math.max(m.cx - m.wx / 2, top.cx - top.wx / 2), R = Math.min(m.cx + m.wx / 2, top.cx + top.wx / 2);
            const cut = dx ? { cx: dx > 0 ? (R + m.cx + m.wx / 2) / 2 : (L + m.cx - m.wx / 2) / 2, wx: Math.abs(dx), hue: m.hue, z: m.z, vz: 0, a: 1, vx: Math.sign(dx) * 1.5 } : null;
            const slab = { cx: (L + R) / 2, wx: R - L, hue: m.hue, sy: 1 };
            S.mov = null; S.tower.push(slab);
            w.emit("land", slab, cut, !dx);
            if (!w.on("cam")) S.camZ = Math.max(0, (S.tower.length - 5) * ST.h);
            w.after(0.25, () => { w.busy = false; });
          });
        });
      },
      update(w, dt) {
        const S = w.S;
        for (const s of S.tower) s.sy += (1 - s.sy) * Math.min(1, dt * 12);
        S.dip -= S.dip * Math.min(1, dt * 12);
        for (const c of S.cut) { c.vz -= 900 * dt; c.z += c.vz * dt; c.cx += c.vx * dt; c.a -= dt * 1.4; }
        S.cut = S.cut.filter(c => c.a > 0);
      },
      drawFront(w, ctx) {
        const S = w.S, on = w.on("hue");
        ctx.save(); ctx.translate(0, S.dip);
        let z = -S.camZ;
        S.tower.forEach(s => { stBox(ctx, s.cx, s.wx, z, ST.h * s.sy, s.hue, on); z += ST.h * s.sy; });
        ctx.restore();
        for (const c of S.cut) stBox(ctx, c.cx, c.wx, c.z - S.camZ, ST.h, c.hue, on, Math.max(0, c.a));
        if (S.mov) stBox(ctx, S.mov.cx, S.mov.wx, S.mov.z - S.camZ, ST.h, S.mov.hue, on);
      },
      steps: [
        {
          id: "squash", name: { en: "Squash + Dip", ko: "눌림 + 탑 꿀렁" }, param: "sy .55 · dip 6px",
          cap: { en: "The slab *squashes*. The whole tower *dips*.", ko: "판이 *눌리고*, 탑 전체가 *꿀렁*." },
          land(w, slab) { slab.sy = 0.55; w.S.dip = 6; },
        },
        {
          id: "slice", name: { en: "Falling Slice", ko: "잘린 조각 낙하" }, param: "g 900 · fade",
          cap: { en: "The overhang *breaks off and falls*. Show the loss.", ko: "삐져나온 부분이 *잘려서 떨어져요*. 손해를 보여줘요." },
          land(w, slab, cut) { if (cut) w.S.cut.push(cut); },
        },
        {
          id: "perfect", name: { en: "Perfect Ring", ko: "딱 맞음 고리" }, param: "ring + text",
          cap: { en: "A *perfect* drop gets a ring and a word.", ko: "*딱 맞으면* 고리와 칭찬 한마디." },
          land(w, slab, cut, perfect) {
            const p = stPt(slab.cx, 0, (w.S.tower.length - 1) * ST.h - w.S.camZ + ST.h);
            w.spawn({ type: "ring", flat: true, x: p.x, y: p.y, size: 60, size1: 150, life: 0.45, w: perfect ? 8 : 3, color: perfect ? LIME : "255,255,255" });
            if (perfect) say(w, "PERFECT", p.x, p.y - 50, 28, "#c6f432", 0.7);
          },
        },
        {
          id: "dust", name: { en: "Edge Dust", ko: "모서리 먼지" }, param: "6 puffs",
          cap: { en: "Dust puffs out at the *edges*.", ko: "*모서리*에서 먼지가 훅." },
          land(w, slab) {
            const z = (w.S.tower.length - 1) * ST.h - w.S.camZ;
            for (const s of [-1, 1]) { const p = stPt(slab.cx + s * slab.wx / 2, ST.wy / 2, z); dust(w, p.x, p.y, 3, s); }
          },
        },
        {
          id: "cam", name: { en: "Camera Rises", ko: "카메라 올라감" }, param: "ease 300ms",
          cap: { en: "The camera *glides up* with the tower.", ko: "탑이 크는 만큼 카메라가 *스르륵* 올라가요." },
          land(w) { const S = w.S; w.tween(S, { camZ: Math.max(0, (S.tower.length - 5) * ST.h) }, 0.3, "inout"); },
        },
        {
          id: "hue", name: { en: "Color Climb", ko: "층마다 색 변화" }, param: "+14° hue / floor",
          cap: { en: "Shift the *color* each floor. Height you can see.", ko: "층마다 *색이 바뀌어요*. 높이가 눈에 보이게." },
          land(w, slab) { w.S.hue = slab.hue; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk / chime",
          cap: { en: "A wooden *thunk*. Perfect adds a *chime*.", ko: "나무 *툭*. 딱 맞으면 *띵*까지." },
          land(w, slab, cut, perfect) { w.sfx.thunk(); if (perfect && w.on("perfect")) w.sfx.chime(w.S.tower.length); },
        },
      ],
    },

    /* 11 ─────────────────────────────── */
    {
      id: "puzzle-rope-cut", cat: "puzzle", view: "side", polished: true,
      title: { en: "Make rope cuts *snap*", ko: "줄 끊기를 *팅!*" },
      intro: { en: "The rope just *vanishes*. Candy drops.", ko: "줄이 그냥 *없어지고* 사탕이 떨어져요." },
      interval: 1.5, stepDur: 3.8,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(-80, G, 700, 120);
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
      },
      setup(w) { w.S = { t: 0.32, hang: true, c: null, rot: 0, up: 0, cut: false, cupSx: 1, cupSy: 1, gone: false }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        Object.assign(S, { t: 0, hang: true, c: null, rot: 0, up: 0, gone: false });
        w.after(Math.PI / (2 * RP.om), () => {
          const th = -RP.A * Math.cos(RP.om * S.t), dth = RP.A * RP.om * Math.sin(RP.om * S.t);
          const x = RP.ax + Math.sin(th) * RP.L, y = RP.ay + Math.cos(th) * RP.L;
          S.hang = false; S.rot = th;
          S.c = { x, y, vx: Math.cos(th) * dth * RP.L, vy: -Math.sin(th) * dth * RP.L };
          w.emit("cut", S, x, y);
          w.after(0.6, () => { w.busy = false; });
        });
      },
      update(w, dt) {
        const S = w.S, k = Math.min(1, dt * 12);
        S.t += dt;
        S.cupSx += (1 - S.cupSx) * k; S.cupSy += (1 - S.cupSy) * k;
        if (S.c && !S.gone) {
          S.c.vy += 1500 * dt; S.c.x += S.c.vx * dt; S.c.y += S.c.vy * dt;
          if (S.c.y > RP.cupY - 6) { S.gone = true; w.emit("catch", S); }
        }
      },
      drawBack(w, ctx) {
        const S = w.S;
        ctx.save(); ctx.translate(RP.cupX, G); ctx.scale(S.cupSx, S.cupSy);
        if (S.gone) drawCandy(ctx, 0, -52, 0.4, 0.8, 0.8);
        ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.moveTo(-46, -46); ctx.lineTo(46, -46); ctx.lineTo(34, 0); ctx.lineTo(-34, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.ellipse(0, -46, 46, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.ellipse(0, -46, 38, 6, 0, 0, TAU); ctx.fill();
        ctx.restore();
      },
      drawFront(w, ctx) {
        const S = w.S;
        ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.arc(RP.ax, RP.ay, 7, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#e7d3a8"; ctx.lineWidth = 3; ctx.lineCap = "round";
        if (S.hang) {
          const th = -RP.A * Math.cos(RP.om * S.t), x = RP.ax + Math.sin(th) * RP.L, y = RP.ay + Math.cos(th) * RP.L;
          ctx.beginPath(); ctx.moveTo(RP.ax, RP.ay); ctx.lineTo(x, y); ctx.stroke();
          drawCandy(ctx, x, y, th);
        } else if (S.c && !S.gone) {
          if (S.up > 0) { ctx.beginPath(); ctx.moveTo(RP.ax, RP.ay); ctx.quadraticCurveTo(RP.ax + 18 * S.up, RP.ay + 50 * S.up, RP.ax + 6 * S.up, RP.ay + RP.L * 0.5 * S.up); ctx.stroke(); }
          drawCandy(ctx, S.c.x, S.c.y, S.rot);
        }
      },
      steps: [
        {
          id: "swipe", name: { en: "Blade Swipe", ko: "칼날 궤적" }, param: "slash 90px",
          cap: { en: "Show the *swipe* that cut it.", ko: "줄을 끊은 *손가락 궤적*을 그려요." },
          cut(w, S, x, y) { const my = (RP.ay + y) / 2; w.spawn({ type: "slash", x: (RP.ax + x) / 2, y: my, ang: -0.5, len: 70, size: 7, life: 0.22, color: "255,255,255" }); },
        },
        {
          id: "snap", name: { en: "Rope Recoil", ko: "줄이 튕겨 감김" }, param: "whip back 300ms",
          cap: { en: "The cut rope *whips back* up. Tension released.", ko: "끊긴 줄이 위로 *팅* 튕겨 올라가요." },
          cut(w, S) { S.up = 1; w.tween(S, { up: 0 }, 0.3, "out"); },
        },
        {
          id: "slow", name: { en: "Cut Slow-mo", ko: "끊는 순간 느리게" }, param: "0.35× · 250ms",
          cap: { en: "Slow time for a beat at the *cut*.", ko: "*끊는 순간*만 시간을 살짝 느리게." },
          cut(w) { w.slowmo(0.35, 0.25); },
        },
        {
          id: "spin", name: { en: "Tumble", ko: "빙글빙글" }, param: "12 rad/s",
          cap: { en: "Free candy *tumbles*. It's alive now.", ko: "풀려난 사탕이 *빙글빙글*. 살아 움직여요." },
          update(w, dt) { const S = w.S; if (S.c && !S.gone) S.rot += 12 * dt; },
        },
        {
          id: "trail", name: { en: "Sugar Trail", ko: "설탕 가루 꼬리" }, param: "glow / frame",
          cap: { en: "Leave a *sugary trail* along the arc.", ko: "날아간 길에 *설탕 가루*가 남아요." },
          update(w) { const S = w.S; if (S.c && !S.gone) w.spawn({ type: "glow", x: S.c.x, y: S.c.y, size: 12, size1: 2, life: 0.4, color: "249,168,212" }); },
        },
        {
          id: "catch", name: { en: "Cup Catch", ko: "컵이 받음" }, param: "squash + stars",
          cap: { en: "The cup *squashes* and stars burst out. Yum!", ko: "컵이 *꿀렁* 받고 별이 팡. 냠!" },
          catch(w, S) {
            S.cupSx = 1.25; S.cupSy = 0.8;
            twinkle(w, RP.cupX, G - 60, 7, 40, "253,224,71");
            say(w, "YUM!", RP.cupX, G - 100, 26, "#f9a8d4", 0.7);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "twang / pop",
          cap: { en: "A tight *twang*, then a happy *pop*.", ko: "팽팽하게 *팅*, 받을 때 *뽁*." },
          cut(w) { w.sfx.twang(); },
          catch(w) { w.sfx.pop(); },
        },
      ],
    },

    /* 12 ─────────────────────────────── */
    {
      id: "puzzle-connect-dots", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make connecting lines *flow*", ko: "선 잇기를 *흐르게*" },
      intro: { en: "A thin line. Done. *Was it?*", ko: "얇은 선 하나. 끝. *끝난 거 맞죠?*" },
      interval: 1.2, stepDur: 3.6,
      drawFloor(w, ctx) {
        board(ctx, CD.x0, CD.y0, CD.n, CD.n, CD.cs);
        for (const c of w.S.cells) if (c.tint > 0) { const p = cdPos([c.r, c.c]); ctx.fillStyle = `rgba(56,189,248,${0.22 * c.tint})`; ctx.fillRect(p.x - CD.cs / 2 + 1, p.y - CD.cs / 2 + 1, CD.cs - 2, CD.cs - 2); }
      },
      setup(w) { w.S = { n: CD_BLUE.length - 1, lw: 6, flow: -1, done: 1, bump: 0, cells: CD_BLUE.map(([r, c]) => ({ r, c, tint: 0 })) }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.n = 0; S.done = 0; S.flow = -1;
        S.cells.forEach(c => { c.tint = 0; });
        w.emit("seg", S, 0);
        for (let i = 1; i < CD_BLUE.length; i++) w.after(i * 0.045, () => { S.n = i; w.emit("seg", S, i); });
        w.after(CD_BLUE.length * 0.045, () => { S.done = 1; w.emit("done", S); w.after(0.3, () => { w.busy = false; }); });
      },
      update(w, dt) { decay(w.S, ["bump"], dt, 4); },
      drawFront(w, ctx) {
        const S = w.S;
        for (const d of CD_DONE) cdLine(ctx, d.path, d.path.length - 1, d.col, 12, 0.85);
        cdLine(ctx, CD_BLUE, S.n, "56,189,248", S.lw);
        if (S.flow >= 0) {
          const i = Math.min(CD_BLUE.length - 1.001, S.flow * (CD_BLUE.length - 1)), a = cdPos(CD_BLUE[Math.floor(i)]), b = cdPos(CD_BLUE[Math.floor(i) + 1]), f = i - Math.floor(i);
          ctx.globalCompositeOperation = "lighter"; glow(ctx, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 34, "224,242,254", 0.9); ctx.globalCompositeOperation = "source-over";
        }
        const dots = [...CD_DONE.map(d => [d.path[0], d.path[d.path.length - 1], d.col]), [CD_BLUE[0], CD_BLUE[CD_BLUE.length - 1], "56,189,248"], [...CD_OPEN.dots, CD_OPEN.col]];
        for (const [a, b, col] of dots) for (const q of [a, b]) { const p = cdPos(q); ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, TAU); ctx.fill(); }
        const sc = 1 + S.bump * 0.4;
        ctx.save(); ctx.translate(458, 70); ctx.scale(sc, sc);
        label(ctx, "LINKS", 0, 0, 11, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
        label(ctx, `${2 + S.done}/4`, 0, 22, 22, S.bump > 0.3 ? "#c6f432" : "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "thick", name: { en: "Fat Pipe Line", ko: "굵은 관 같은 선" }, param: "6px → 14px",
          cap: { en: "Draw it *fat* like a pipe, not a pencil line.", ko: "연필 선 말고 *관처럼 굵게*." },
          seg(w, S) { S.lw = 14; },
        },
        {
          id: "tint", name: { en: "Cell Fill", ko: "지나간 칸 물들이기" }, param: "22% tint",
          cap: { en: "*Color the cells* it passes through.", ko: "선이 지나간 *칸까지 물들여요*." },
          seg(w, S, i) { S.cells[i].tint = 1; },
        },
        {
          id: "head", name: { en: "Glowing Tip", ko: "빛나는 끝" }, param: "glow / cell",
          cap: { en: "The *tip glows* as it moves.", ko: "선의 *끝이 빛나며* 나아가요." },
          seg(w, S, i) { const p = cdPos(CD_BLUE[i]); w.spawn({ type: "glow", x: p.x, y: p.y, size: 30, size1: 8, life: 0.3, color: "125,211,252" }); },
        },
        {
          id: "rings", name: { en: "End Dots Ring", ko: "양끝 고리" }, param: "2 rings",
          cap: { en: "Connected? *Both ends* ring out.", ko: "이어지면 *양끝 점*에서 고리가 퍼져요." },
          done(w) {
            for (const q of [CD_BLUE[0], CD_BLUE[CD_BLUE.length - 1]]) { const p = cdPos(q); w.spawn({ type: "ring", x: p.x, y: p.y, size: 14, size1: 46, life: 0.4, w: 6, color: "125,211,252" }); }
          },
        },
        {
          id: "flow", name: { en: "Flow Pulse", ko: "흐르는 빛" }, param: "400ms run",
          cap: { en: "A pulse of light *runs* the whole line.", ko: "빛 한 줄기가 선을 따라 *쭉 흘러요*." },
          done(w, S) { S.flow = 0; w.tween(S, { flow: 1 }, 0.4, "lin", () => { S.flow = -1; }); },
        },
        {
          id: "count", name: { en: "Counter Bump", ko: "개수 톡" }, param: "3/4 → bump",
          cap: { en: "Bump the *progress counter*.", ko: "*진행 숫자*가 톡 튀어요." },
          done(w, S) { S.bump = 1; },
        },
        {
          id: "sound", name: { en: "Rising Steps", ko: "올라가는 음" }, param: "+1 semitone / cell",
          cap: { en: "Each cell plays *one step higher*.", ko: "칸마다 *한 음씩 올라가요*." },
          seg(w, S, i) { w.sfx.blip(i + 1); },
          done(w) { if (w.on("rings") || w.on("flow")) w.sfx.chime(9); },
        },
      ],
    },

    /* 13 ─────────────────────────────── */
    {
      id: "puzzle-word-found", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Celebrate the *found word*", ko: "단어 찾기를 *반갑게*" },
      intro: { en: "Found it! Gray outline. *Yay?*", ko: "찾았다! 회색 테두리. *와아..?*" },
      interval: 1.3, stepDur: 3.6,
      drawFloor(w, ctx) { board(ctx, WF.x0, WF.y0, WF.cols, WF.rows, WF.cs); },
      setup(w) { w.S = { k: 0, sel: null, found: [false, false], hop: {}, strike: [0, 0], bump: [0, 0] }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, W = WF_WORDS[S.k];
        if (S.k === 0) { S.found = [false, false]; S.strike = [0, 0]; }
        S.sel = { W, len: 1, fill: 0 };
        w.emit("pick", S.sel);
        w.after(0.22, () => {
          S.found[S.k] = true;
          w.emit("found", W, S.k);
          if (!w.on("strike")) S.strike[S.k] = 1;
          S.k = (S.k + 1) % 2;
          w.after(0.55, () => { w.busy = false; });
        });
      },
      update(w, dt) {
        const S = w.S;
        for (const k in S.hop) S.hop[k] = Math.max(0, S.hop[k] - dt * 4.5);
        S.bump = S.bump.map(b => Math.max(0, b - dt * 4));
      },
      drawFront(w, ctx) {
        const S = w.S;
        if (S.sel) {
          const W = S.sel.W, a = wfPos(W.cells[0]), z = wfPos(W.cells[3]), b = { x: a.x + (z.x - a.x) * S.sel.len, y: a.y + (z.y - a.y) * S.sel.len };
          ctx.lineCap = "round";
          if (S.sel.fill > 0) { ctx.strokeStyle = `rgba(${W.col},${0.85 * S.sel.fill})`; ctx.lineWidth = 32; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          ctx.strokeStyle = S.sel.fill > 0 ? `rgb(${W.col})` : "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
          const ang = Math.atan2(b.y - a.y, b.x - a.x), L = Math.hypot(b.x - a.x, b.y - a.y);
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(ang); ctx.beginPath(); ctx.roundRect(-17, -17, L + 34, 34, 17); ctx.stroke(); ctx.restore();
        }
        WF_GRID.forEach((row, r) => [...row].forEach((ch, c) => {
          const p = wfPos([r, c]), h = S.hop[r + "," + c] || 0;
          label(ctx, ch, p.x, p.y - Math.sin(h * Math.PI) * 12, 22, "rgba(255,255,255,0.85)");
        }));
        WF_WORDS.forEach((W, i) => {
          const sc = 1 + S.bump[i] * 0.4;
          ctx.save(); ctx.translate(W.lx, 316); ctx.scale(sc, sc);
          label(ctx, W.w, 0, 0, 18, S.found[i] ? `rgb(${W.col})` : "rgba(255,255,255,0.7)");
          if (S.strike[i] > 0) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(-28 + 56 * S.strike[i], 0); ctx.stroke(); }
          ctx.restore();
        });
      },
      steps: [
        {
          id: "sweep", name: { en: "Capsule Sweep", ko: "캡슐이 쭉" }, param: "200ms ease-out",
          cap: { en: "The capsule *stretches* across the word.", ko: "캡슐이 단어 위로 *쭉 늘어나요*." },
          pick(w, sel) { sel.len = 0; w.tween(sel, { len: 1 }, 0.2, "out"); },
        },
        {
          id: "fill", name: { en: "Color Fill", ko: "색 채우기" }, param: "word color 85%",
          cap: { en: "Fill it with the *word's own color*.", ko: "단어마다 *다른 색*으로 꽉 채워요." },
          found(w) { w.S.sel.fill = 1; },
        },
        {
          id: "hop", name: { en: "Letter Wave", ko: "글자 파도" }, param: "60ms / letter",
          cap: { en: "Letters *hop* one by one, like a wave.", ko: "글자가 하나씩 *통통*, 파도처럼." },
          found(w, W) { W.cells.forEach(([r, c], i) => w.after(i * 0.06, () => { w.S.hop[r + "," + c] = 1; })); },
        },
        {
          id: "fly", name: { en: "Fly to List", ko: "목록으로 날아감" }, param: "seek 450ms",
          cap: { en: "The word *flies* down to the list.", ko: "단어가 아래 *목록으로 날아가요*." },
          found(w, W) {
            const p = wfPos(W.cells[1]);
            w.spawn({ type: "glow", seek: true, x: p.x, y: p.y, tx: W.lx, ty: 316, life: 0.45, size: 16, color: W.col });
            say(w, W.w, p.x + 20, p.y - 28, 22, `rgb(${W.col})`, 0.5);
          },
        },
        {
          id: "strike", name: { en: "Animated Strike", ko: "그어지는 줄" }, param: "line 200ms + bump",
          cap: { en: "Strike it out *with a stroke*, and bump.", ko: "목록에 *쓱* 줄을 긋고 톡 튀어요." },
          found(w, W, k) { w.after(0.45, () => { w.S.bump[k] = 1; w.tween(w.S.strike, { [k]: 1 }, 0.2, "out"); }); },
        },
        {
          id: "sparkle", name: { en: "End Sparkles", ko: "양끝 반짝" }, param: "2 × 4 stars",
          cap: { en: "*Sparkles* pop at both ends.", ko: "단어 *양끝에서 반짝*." },
          found(w, W) { for (const q of [W.cells[0], W.cells[3]]) { const p = wfPos(q); twinkle(w, p.x, p.y, 4, 26, W.col); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish / letter blips",
          cap: { en: "A *swish*, then one *blip per letter*.", ko: "*쓱*, 그리고 글자마다 *톡톡톡톡*." },
          pick(w) { w.sfx.swish(); },
          found(w, W) { W.cells.forEach((q, i) => w.after(i * 0.06, () => w.sfx.blip(i * 3 + 4))); },
        },
      ],
    },

    /* 14 ─────────────────────────────── */
    {
      id: "puzzle-jigsaw-snap", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make puzzle pieces *snap*", ko: "퍼즐 조각을 *딸깍*" },
      intro: { en: "Drag, stop. *Is it in?*", ko: "끌어서, 멈춤. *들어간 거예요?*" },
      interval: 1.3, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        const sx = JG.x0 + JG.hc * JG.s, sy = JG.y0 + JG.hr * JG.s;
        w.S = { sx, sy, x: sx, y: sy, lift: 0, sc: 1, seam: 0, bsc: 1, placed: true, start: { x: 420, y: 250 } };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.placed = false; S.x = S.start.x; S.y = S.start.y;
        w.emit("grab", S);
        S.snapT = 0;
        w.emit("drag", S);
        if (!S.snapT) w.tween(S, { x: S.sx, y: S.sy }, 0.36, "lin", () => { S.placed = true; w.emit("snap", S); });
        w.after(0.8, () => { w.busy = false; });
      },
      update(w, dt) { const S = w.S; decay(S, ["seam"], dt, 1.2); S.bsc += (1 - S.bsc) * Math.min(1, dt * 10); },
      drawFront(w, ctx) {
        const S = w.S, s = JG.s;
        ctx.save();
        ctx.translate(270, 151); ctx.scale(S.bsc, S.bsc); ctx.translate(-270, -151);
        ctx.save(); ctx.beginPath(); ctx.rect(JG.x0, JG.y0, JG.cols * s, JG.rows * s); ctx.clip(); jgScene(ctx); ctx.restore();
        ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = 1.5;
        for (let r = 0; r < JG.rows; r++) for (let c = 0; c < JG.cols; c++) { jgPath(ctx, JG.x0 + c * s, JG.y0 + r * s, s, r, c); ctx.stroke(); }
        if (!S.placed) { jgPath(ctx, S.sx, S.sy, s, JG.hr, JG.hc); ctx.fillStyle = "#16171d"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.stroke(); }
        ctx.restore();
        const cx = S.x + s / 2, cy = S.y + s / 2, k = S.sc;
        if (S.lift > 0) { ctx.save(); ctx.translate(cx + 14 * S.lift, cy + 18 * S.lift); ctx.scale(k, k); jgPath(ctx, -s / 2, -s / 2, s, JG.hr, JG.hc); ctx.fillStyle = `rgba(0,0,0,${0.45 * S.lift})`; ctx.fill(); ctx.restore(); }
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
        jgPath(ctx, S.x, S.y, s, JG.hr, JG.hc); ctx.save(); ctx.clip(); ctx.translate(S.x - S.sx, S.y - S.sy); jgScene(ctx); ctx.restore();
        jgPath(ctx, S.x, S.y, s, JG.hr, JG.hc);
        ctx.strokeStyle = S.seam > 0 ? `rgba(255,255,255,${S.seam})` : "rgba(0,0,0,0.3)"; ctx.lineWidth = S.seam > 0 ? 4 : 1.5; ctx.stroke();
        ctx.restore();
      },
      steps: [
        {
          id: "lift", name: { en: "Lifted Piece", ko: "들어 올린 조각" }, param: "scale 1.1 + shadow",
          cap: { en: "Held pieces *float*: bigger, with a shadow.", ko: "잡은 조각은 *붕 떠요*. 크게, 그림자까지." },
          grab(w, S) { S.lift = 1; S.sc = 1.1; },
          snap(w, S) { w.tween(S, { lift: 0, sc: 1 }, 0.12, "out"); },
        },
        {
          id: "magnet", name: { en: "Magnet Snap", ko: "자석처럼 착" }, param: "last 30px · 80ms",
          cap: { en: "Close enough? It *jumps in* like a magnet.", ko: "가까워지면 *자석처럼 착* 붙어요." },
          drag(w, S) {
            S.snapT = 1;
            w.tween(S, { x: S.sx + 30, y: S.sy + 26 }, 0.3, "lin", () => w.tween(S, { x: S.sx, y: S.sy }, 0.08, "back", () => { S.placed = true; w.emit("snap", S); }));
          },
        },
        {
          id: "seam", name: { en: "Seam Flash", ko: "이음새 번쩍" }, param: "white outline 450ms",
          cap: { en: "The *seams flash white*. It's locked in.", ko: "*이음새가 하얗게* 번쩍. 딱 맞았어요." },
          snap(w, S) { S.seam = 1; },
        },
        {
          id: "bump", name: { en: "Board Bump", ko: "판 전체 톡" }, param: "scale 1.03",
          cap: { en: "The *whole puzzle* bumps a little.", ko: "*퍼즐 전체*가 살짝 톡." },
          snap(w, S) { S.bsc = 1.035; },
        },
        {
          id: "sparkle", name: { en: "Corner Sparkles", ko: "모서리 반짝" }, param: "4 corners",
          cap: { en: "A *sparkle* on each corner.", ko: "네 모서리에 *반짝*." },
          snap(w, S) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) twinkle(w, S.sx + dx * JG.s, S.sy + dy * JG.s, 2, 12); },
        },
        {
          id: "sound", name: { en: "Satisfying Click", ko: "기분 좋은 딸깍" }, param: "low + high click",
          cap: { en: "A crisp *click*. The best sound in puzzles.", ko: "또렷한 *딸깍*. 퍼즐 최고의 소리." },
          grab(w) { w.sfx.clickUp(); },
          snap(w) { w.sfx.clickDown(); w.after(0.04, () => w.sfx.clickUp()); },
        },
      ],
    },
  );
  /* ───── 15. 15 퍼즐 ───── */
  const FT = { x0: 136, y0: 46, cs: 62, gap: 4 };
  const ftPos = (r, c) => ({ x: FT.x0 + FT.gap + c * (FT.cs + FT.gap) + FT.cs / 2, y: FT.y0 + FT.gap + r * (FT.cs + FT.gap) + FT.cs / 2 });
  const ftHome = n => [Math.floor((n - 1) / 4), (n - 1) % 4];

  /* ───── 16. 짝 맞추기 ───── */
  const PM_PAIRS = [[0, 5], [2, 7], [1, 4], [3, 6]];
  const PM_SYM = [0, 2, 1, 3, 2, 0, 3, 1];
  const pmPos = i => ({ x: 144 + (i % 4) * 84, y: 112 + Math.floor(i / 4) * 112 });

  /* ───── 17. 색 채우기 ───── */
  const FF = { x0: 140, y0: 44, cs: 26, cols: 10, rows: 8 };
  const ffPos = (r, c) => ({ x: FF.x0 + c * FF.cs + FF.cs / 2, y: FF.y0 + r * FF.cs + FF.cs / 2 });
  const FF_NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function ffRegion(G, col) {
    const seen = new Map([[G[0][0], 0]]), q = [G[0][0]];
    while (q.length) {
      const x = q.shift();
      for (const [dr, dc] of FF_NB) {
        const n = G[x.r + dr] && G[x.r + dr][x.c + dc];
        if (n && !seen.has(n) && (n.col === col || n.col === G[0][0].col)) { seen.set(n, seen.get(x) + 1); q.push(n); }
      }
    }
    return [...seen].map(([c, d]) => { c.d = d; return c; });
  }
  const ffBuild = () => Array.from({ length: FF.rows }, (_, r) => Array.from({ length: FF.cols }, (_, c) => ({ r, c, col: (Math.random() * 5) | 0, sc: 1 })));

  /* ───── 18. 중력 뒤집기 ───── */
  const GV = { x0: 130, x1: 410, y0: 60, y1: 280, s: 38 };

  /* ───── 19. 레이저와 거울 ───── */
  const LZ = { x0: 109, y0: 55, cs: 46, cols: 7, rows: 5 };
  const lzPos = (r, c) => ({ x: LZ.x0 + c * LZ.cs + LZ.cs / 2, y: LZ.y0 + r * LZ.cs + LZ.cs / 2 });
  const lzPath = ok => (ok ? [lzPos(2, 0), lzPos(2, 4), lzPos(0, 4), lzPos(0, 6)] : [lzPos(2, 0), lzPos(2, 4), { x: lzPos(2, 4).x, y: LZ.y0 + LZ.rows * LZ.cs }]);
  function polyPart(ctx, pts, k) {
    let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    let left = total * k;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y), f = Math.min(1, left / L);
      ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); left -= L;
    }
  }

  /* ───── 20. 파이프 물길 ───── */
  const PP = { x0: 102, y0: 62, cs: 56, cols: 6, rows: 4 };
  const ppPos = (r, c) => ({ x: PP.x0 + c * PP.cs + PP.cs / 2, y: PP.y0 + r * PP.cs + PP.cs / 2 });
  const DIRV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const PP_PATH = [[1, 0, "W", "E"], [1, 1, "W", "E"], [1, 2, "W", "S"], [2, 2, "N", "E"], [2, 3, "W", "E"], [2, 4, "W", "E"], [2, 5, "W", "E"]];
  const PP_DECO = [[0, 0, "ES"], [0, 1, "WE"], [0, 3, "SE"], [0, 4, "WS"], [0, 5, "NS"], [3, 0, "NE"], [3, 1, "WE"], [3, 3, "NE"], [3, 4, "WN"], [1, 4, "NS"], [1, 5, "WS"], [3, 5, "NS"]];
  function pipeArm(ctx, x, y, d, lw, col) { const [dx, dy] = DIRV[d]; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "butt"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * PP.cs / 2, y + dy * PP.cs / 2); ctx.stroke(); }
  function pipeCell(ctx, x, y, arms) {
    for (const d of arms) pipeArm(ctx, x, y, d, 18, "#475569");
    ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    for (const d of arms) pipeArm(ctx, x, y, d, 10, "#1e293b");
    ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
  }

  /* ───── 21–22. 지뢰 찾기 ───── */
  const MR = { x0: 135, y0: 50, cs: 30, cols: 9, rows: 7, click: [4, 2] };
  const MR_MINES = ["0,5", "0,8", "1,1", "2,7", "3,0", "4,6", "5,8", "6,4", "6,0"];
  const MR_NUM = ["", "56,189,248", "74,222,128", "244,63,94", "192,132,252"];
  const mrPos = (r, c) => ({ x: MR.x0 + c * MR.cs + MR.cs / 2, y: MR.y0 + r * MR.cs + MR.cs / 2 });
  function mrBuild() {
    const G = Array.from({ length: MR.rows }, (_, r) => Array.from({ length: MR.cols }, (_, c) => ({ r, c, mine: MR_MINES.includes(r + "," + c), open: false, np: 1, d: 0, wob: 0 })));
    for (const row of G) for (const m of row) {
      m.n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const o = G[m.r + dr] && G[m.r + dr][m.c + dc]; if (o && o !== m && o.mine) m.n++; }
    }
    return G;
  }
  function mrFlood(G, r0, c0) {
    const start = G[r0][c0], seen = new Set([start]), q = [start];
    start.d = 0;
    while (q.length) {
      const m = q.shift();
      if (m.n) continue;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const o = G[m.r + dr] && G[m.r + dr][m.c + dc];
        if (o && !seen.has(o) && !o.mine) { o.d = m.d + 1; seen.add(o); q.push(o); }
      }
    }
    return [...seen];
  }
  function mrDraw(ctx, w, G) {
    for (const row of G) for (const m of row) {
      const p = mrPos(m.r, m.c), h = MR.cs / 2 - 1;
      if (!m.open) {
        const wob = m.wob ? Math.sin(w.time * 60) * 2.5 * m.wob : 0;
        ctx.fillStyle = m.warn ? `rgb(${Math.round(100 + 140 * m.warn)},90,100)` : "#64748b"; ctx.beginPath(); ctx.roundRect(p.x - h + wob, p.y - h, h * 2, h * 2, 4); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(p.x - h + 2 + wob, p.y - h + 2, h * 2 - 4, 4);
        continue;
      }
      ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(p.x - h, p.y - h, h * 2, h * 2);
      if (m.mine) {
        ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#111827"; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.moveTo(p.x - Math.cos(a) * 11, p.y - Math.sin(a) * 11); ctx.lineTo(p.x + Math.cos(a) * 11, p.y + Math.sin(a) * 11); }
        ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 2.2, 0, TAU); ctx.fill();
      } else if (m.n) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(m.np, m.np);
        label(ctx, String(m.n), 0, 1, 17, w.on("numbers") ? `rgb(${MR_NUM[m.n]})` : "rgba(255,255,255,0.55)");
        ctx.restore();
      }
    }
  }

  RECIPES.push(
    /* 15 ─────────────────────────────── */
    {
      id: "puzzle-fifteen", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Give sliding tiles *weight*", ko: "숫자 밀기에 *무게*를" },
      intro: { en: "Tap. The tile *teleports*. Did it move?", ko: "누르면 타일이 *순간이동*. 움직인 거 맞아요?" },
      interval: 1.0, stepDur: 3.5,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#3b2f25"; ctx.beginPath(); ctx.roundRect(FT.x0 - 6, FT.y0 - 6, 4 * (FT.cs + FT.gap) + FT.gap + 12, 4 * (FT.cs + FT.gap) + FT.gap + 12, 14); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.roundRect(FT.x0, FT.y0, 4 * (FT.cs + FT.gap) + FT.gap, 4 * (FT.cs + FT.gap) + FT.gap, 10); ctx.fill();
      },
      setup(w) {
        const tiles = [];
        for (let n = 1; n <= 15; n++) { const [r, c] = n === 15 ? [3, 3] : ftHome(n); tiles.push({ n, r, c, ...ftPos(r, c), sx: 1, sy: 1, ox: 0, glow: 0 }); }
        w.S = { tiles, moves: 40, bump: 0, moveT: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, t = S.tiles[14], toC = t.c === 3 ? 2 : 3, to = ftPos(3, toC), dir = toC < t.c ? -1 : 1;
        t.c = toC; S.moves++;
        S.moveT = 0;
        w.emit("move", t, to, dir);
        if (!S.moveT) { t.x = to.x; t.y = to.y; }
        w.after(S.moveT, () => {
          const next = S.tiles.find(o => o.r === 3 && o.c === toC + dir);
          w.emit("stop", t, dir, next);
          if (t.c === 2) w.emit("home", t);
          w.after(0.2, () => { w.busy = false; });
        });
      },
      update(w, dt) {
        const S = w.S, k = Math.min(1, dt * 14);
        for (const t of S.tiles) { t.sx += (1 - t.sx) * k; t.sy += (1 - t.sy) * k; t.ox -= t.ox * k; decay(t, ["glow"], dt, 1.5); }
        decay(S, ["bump"], dt, 4);
      },
      drawFront(w, ctx) {
        const S = w.S, s = FT.cs;
        for (const t of S.tiles) {
          const home = w.on("home") && t.r === ftHome(t.n)[0] && t.c === ftHome(t.n)[1] && t.n === 15;
          if (t.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, t.x, t.y, 70, LIME, t.glow * 0.6); ctx.globalCompositeOperation = "source-over"; }
          ctx.save(); ctx.translate(t.x + t.ox, t.y); ctx.scale(t.sx, t.sy);
          rr(ctx, -s / 2, -s / 2, s, s, 9, "#e8c89a", home ? "#c6f432" : null, 3);
          ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(-s / 2 + 4, s / 2 - 12, s - 8, 8);
          label(ctx, String(t.n), 0, 0, 24, "#5b4330");
          ctx.restore();
        }
        const sc = 1 + S.bump * 0.35;
        ctx.save(); ctx.translate(464, 76); ctx.scale(sc, sc);
        label(ctx, "MOVES", 0, 0, 11, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
        label(ctx, String(S.moves), 0, 22, 22, S.bump > 0.3 ? "#c6f432" : "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "slide", name: { en: "Eased Slide", ko: "부드럽게 밀림" }, param: "140ms · overshoot",
          cap: { en: "Slide, don't teleport. A tiny *overshoot* at the end.", ko: "순간이동 말고 *스윽*. 끝에서 살짝 *지나쳐요*." },
          move(w, t, to) { w.S.moveT = 0.14; w.tween(t, { x: to.x, y: to.y }, 0.14, "back"); },
        },
        {
          id: "stretch", name: { en: "Stretch", ko: "늘어남" }, param: "1.18 × 0.86",
          cap: { en: "*Stretch* along the move. It looks fast.", ko: "가는 방향으로 *쭉 늘어나요*. 빨라 보이게." },
          move(w, t) { t.sx = 1.18; t.sy = 0.86; },
        },
        {
          id: "nudge", name: { en: "Neighbor Nudge", ko: "옆 타일 톡" }, param: "6px push",
          cap: { en: "It *bumps* the tile it stops against.", ko: "멈추면서 *옆 타일을 톡* 밀어요." },
          stop(w, t, dir, next) { if (next) next.ox = dir * 7; else w.kick(dir * 6, 0); },
        },
        {
          id: "home", name: { en: "Right Spot Glow", ko: "제자리 표시" }, param: "lime border + glow",
          cap: { en: "In the *right spot*? Glow and keep a green border.", ko: "*제자리*에 오면 빛나고 초록 테두리가 남아요." },
          home(w, t) {
            t.glow = 1;
            w.spawn({ type: "ring", x: t.x, y: t.y, size: 30, size1: 100, life: 0.45, w: 7, color: LIME });
            sparks(w, t.x, t.y, 12, LIME, [160, 380]);
            twinkle(w, t.x, t.y, 4, 40, "236,252,203");
          },
        },
        {
          id: "count", name: { en: "Move Counter Bump", ko: "이동 수 톡" }, param: "scale 1.35",
          cap: { en: "The *move counter* bumps every move.", ko: "움직일 때마다 *이동 수*가 톡." },
          stop(w) { w.S.bump = 1; },
        },
        {
          id: "sound", name: { en: "Wood Tock", ko: "나무 소리" }, param: "tock / chime",
          cap: { en: "A wooden *tock*. The right spot adds a *chime*.", ko: "나무 블록 *톡*. 제자리면 *띵*까지." },
          stop(w) { w.sfx.tock(); },
          home(w) { if (w.on("home")) w.sfx.chime(4); },
        },
      ],
    },

    /* 16 ─────────────────────────────── */
    {
      id: "puzzle-pair-match", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make card pairs *celebrate*", ko: "카드 짝 맞추기를 *신나게*" },
      intro: { en: "A pair! They just... *vanish*.", ko: "짝을 찾았는데... 그냥 *사라져요*." },
      interval: 1.6, stepDur: 3.8,
      drawFloor(w, ctx) {
        for (let i = 0; i < 8; i++) { const p = pmPos(i); ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(p.x - 35, p.y - 47, 70, 94, 10); ctx.stroke(); }
        ctx.setLineDash([]);
      },
      setup(w) {
        w.S = { k: 0, link: 0, A: null, B: null, flipT: 0, flyT: 0, cards: PM_SYM.map((sym, i) => ({ i, sym, ...pmPos(i), face: 0, sx: 1, lift: 0, sc: 1, a: 1, gone: false, glow: 0 })) };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        if (S.k === 0) S.cards.forEach((c, i) => Object.assign(c, pmPos(i), { face: 0, sx: 1, lift: 0, sc: 1, a: 1, gone: false, glow: 0 }));
        const [A, B] = PM_PAIRS[S.k].map(i => S.cards[i]);
        const flip = c => { S.flipT = 0; w.emit("flip", c); if (!S.flipT) c.face = 1; };
        flip(A);
        w.after(0.25, () => flip(B));
        w.after(0.6, () => {
          S.A = A; S.B = B; S.flyT = 0;
          w.emit("match", A, B);
          if (!S.flyT) { A.gone = true; B.gone = true; }
          S.k = (S.k + 1) % 4;
          w.after(0.45, () => { w.busy = false; });
        });
      },
      update(w, dt) { decay(w.S, ["link"], dt, 2.2); for (const c of w.S.cards) decay(c, ["glow"], dt, 2); },
      drawFront(w, ctx) {
        const S = w.S;
        if (S.link > 0 && S.A) {
          ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(253,224,71,${S.link})`; ctx.lineWidth = 6; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(S.A.x, S.A.y); ctx.quadraticCurveTo((S.A.x + S.B.x) / 2, Math.min(S.A.y, S.B.y) - 70, S.B.x, S.B.y); ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
        for (const c of S.cards) {
          if (c.gone || c.a <= 0) continue;
          ctx.save(); ctx.globalAlpha = c.a;
          if (c.lift > 0) { ctx.fillStyle = `rgba(0,0,0,${0.4 * c.lift})`; ctx.beginPath(); ctx.roundRect(c.x - 35 + 8 * c.lift, c.y - 47 + 12 * c.lift, 70 * c.sx, 94, 10); ctx.fill(); }
          if (c.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, c.x, c.y, 80, "253,224,71", c.glow * 0.7); ctx.globalCompositeOperation = "source-over"; }
          ctx.translate(c.x, c.y - c.lift * 8); ctx.scale(c.sx * c.sc * (1 + c.lift * 0.08), c.sc * (1 + c.lift * 0.08));
          if (c.face) {
            rr(ctx, -35, -47, 70, 94, 10, "#f8fafc", c.glow > 0 ? "#fde047" : null, 4);
            drawGem(ctx, c.sym, 0, 0, 20);
          } else {
            rr(ctx, -35, -47, 70, 94, 10, "#6d28d9", null);
            ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-27, -39, 54, 78, 6); ctx.stroke();
            label(ctx, "?", 0, 2, 30, "rgba(255,255,255,0.45)");
          }
          ctx.restore();
        }
      },
      steps: [
        {
          id: "flip", name: { en: "Card Flip", ko: "카드 뒤집기" }, param: "scaleX 1→0→1",
          cap: { en: "Actually *flip* the card. Squeeze, swap, open.", ko: "진짜로 *뒤집어요*. 좁아졌다가, 바뀌고, 펼쳐짐." },
          flip(w, c) { w.S.flipT = 1; w.tween(c, { sx: 0 }, 0.07, "in", () => { c.face = 1; w.tween(c, { sx: 1 }, 0.09, "out"); }); },
        },
        {
          id: "lift", name: { en: "Lift", ko: "들어 올림" }, param: "+8% · shadow",
          cap: { en: "Open cards *lift up* off the table.", ko: "뒤집힌 카드는 바닥에서 *붕 떠요*." },
          flip(w, c) { w.tween(c, { lift: 1 }, 0.15, "out"); },
        },
        {
          id: "link", name: { en: "Gold Link", ko: "금빛 연결" }, param: "arc + glow",
          cap: { en: "A *golden arc* links the pair. They belong together.", ko: "*금빛 선*이 둘을 이어요. 우리 짝이에요." },
          match(w, A, B) { w.S.link = 1; A.glow = 1; B.glow = 1; },
        },
        {
          id: "fly", name: { en: "Fly Away", ko: "날아가기" }, param: "up + shrink 400ms",
          cap: { en: "Matched cards *fly away* together, not vanish.", ko: "맞춘 카드는 사라지지 말고 *함께 날아가요*." },
          match(w, A, B) {
            w.S.flyT = 1;
            for (const c of [A, B]) w.after(0.15, () => w.tween(c, { y: c.y - 120, sc: 0.3, a: 0 }, 0.4, "in", () => { c.gone = true; }));
          },
        },
        {
          id: "burst", name: { en: "Star Burst", ko: "별 터짐" }, param: "6 stars × 2",
          cap: { en: "*Stars* burst from both cards.", ko: "두 카드에서 *별*이 팡팡." },
          match(w, A, B) { for (const c of [A, B]) { twinkle(w, c.x, c.y, 6, 50, "253,224,71"); w.spawn({ type: "ring", x: c.x, y: c.y, size: 30, size1: 80, life: 0.4, w: 5, color: "253,224,71" }); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "flick / chime pair",
          cap: { en: "Paper *flick* on flip. Two-note *chime* on match.", ko: "뒤집을 땐 *착*, 짝이면 *띵동*." },
          flip(w) { w.sfx.swish(); },
          match(w) { w.sfx.tock(); if (w.on("link") || w.on("burst")) { w.sfx.chime(0); w.after(0.09, () => w.sfx.chime(7)); } },
        },
      ],
    },

    /* 17 ─────────────────────────────── */
    {
      id: "puzzle-flood-fill", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make color floods *spread*", ko: "색 번지기를 *물결처럼*" },
      intro: { en: "Pick a color. The area *snaps* to it.", ko: "색을 고르면 영역이 *휙* 바뀌어요." },
      interval: 1.1, stepDur: 3.6,
      drawFloor(w, ctx) { board(ctx, FF.x0, FF.y0, FF.cols, FF.rows, FF.cs); },
      setup(w) { w.S = { G: ffBuild(), k: 0, waveT: 0, btn: [0, 0, 0, 0, 0], sel: 0 }; },
      fire(w) {
        const S = w.S;
        let region = ffRegion(S.G, S.G[0][0].col);
        if (region.length > 50) { S.G = ffBuild(); region = ffRegion(S.G, S.G[0][0].col); }
        const cur = S.G[0][0].col, ids = new Set(region);
        const cnt = [0, 0, 0, 0, 0];
        for (const c of region) for (const [dr, dc] of FF_NB) { const n = S.G[c.r + dr] && S.G[c.r + dr][c.c + dc]; if (n && !ids.has(n)) cnt[n.col]++; }
        cnt[cur] = -1;
        const k = cnt.indexOf(Math.max(...cnt)), cells = ffRegion(S.G, k);
        S.sel = k; S.waveT = 0;
        w.emit("fill", cells, k, cells.length - region.length);
        if (!S.waveT) cells.forEach(c => { c.col = k; });
      },
      update(w, dt) {
        const S = w.S;
        for (const row of S.G) for (const c of row) c.sc += (1 - c.sc) * Math.min(1, dt * 14);
        S.btn = S.btn.map(b => Math.max(0, b - dt * 4));
      },
      drawFront(w, ctx) {
        const S = w.S;
        for (const row of S.G) for (const c of row) { const p = ffPos(c.r, c.c); tile(ctx, p.x, p.y, FF.cs - 1, PAL[c.col], c.sc); }
        for (let i = 0; i < 5; i++) {
          const x = 198 + i * 36, y = 290, s = 1 - S.btn[i] * 0.25;
          if (S.btn[i] > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, 34, PAL[i], S.btn[i]); ctx.globalCompositeOperation = "source-over"; }
          ctx.fillStyle = `rgb(${PAL[i]})`; ctx.beginPath(); ctx.arc(x, y, 13 * s, 0, TAU); ctx.fill();
          if (i === S.sel) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.stroke(); }
        }
      },
      steps: [
        {
          id: "wave", name: { en: "Spreading Wave", ko: "번지는 물결" }, param: "30ms / step",
          cap: { en: "Spread the color *outward*, step by step.", ko: "색이 *한 칸씩 번져* 나가요." },
          fill(w, cells, k) { w.S.waveT = 1; cells.forEach(c => w.after(c.d * 0.03, () => { c.col = k; w.emit("cell", c); })); },
        },
        {
          id: "pop", name: { en: "Cell Pop", ko: "칸마다 톡" }, param: "0.5 → 1 · back",
          cap: { en: "Each cell *pops* as the color hits it.", ko: "색이 닿는 칸마다 *톡* 튀어요." },
          cell(w, c) { c.sc = 0.5; },
        },
        {
          id: "ripple", name: { en: "Corner Ripple", ko: "모서리 물결" }, param: "ring r 300",
          cap: { en: "A big *ripple* rolls from the corner.", ko: "모서리에서 큰 *물결 고리*가 굴러가요." },
          fill(w, cells, k) { const p = ffPos(0, 0); w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 230, life: 0.6, w: 10, color: PAL[k] }); },
        },
        {
          id: "button", name: { en: "Button Press", ko: "버튼 눌림" }, param: "squash + glow",
          cap: { en: "The color button *presses* and glows.", ko: "누른 색 버튼이 *꾹* 눌리고 빛나요." },
          fill(w, cells, k) { w.S.btn[k] = 1; },
        },
        {
          id: "count", name: { en: "Gain Count", ko: "늘어난 칸 수" }, param: "+N cells",
          cap: { en: "Tell them *how much* they grabbed.", ko: "*몇 칸*을 먹었는지 알려줘요." },
          fill(w, cells, k, gain) { say(w, "+" + gain, FF.x0 + 60, FF.y0 + 40, 32 + Math.min(gain, 20), `rgb(${PAL[k]})`, 1.0); },
        },
        {
          id: "sound", name: { en: "Rolling Notes", ko: "굴러가는 음" }, param: "note / 2 steps",
          cap: { en: "Notes *roll upward* with the wave.", ko: "물결 따라 음이 *또르르* 올라가요." },
          fill(w, cells) { if (!w.on("wave") && !w.on("pop")) { w.sfx.tock(); return; } const far = Math.max(...cells.map(c => c.d)); for (let d = 0; d <= far; d += 2) w.after(d * 0.03, () => w.sfx.blip(d / 2 + 1)); },
        },
      ],
    },

    /* 18 ─────────────────────────────── */
    {
      id: "puzzle-gravity-flip", cat: "puzzle", view: "side", polished: true,
      title: { en: "Make gravity flips *drop*", ko: "중력 뒤집기를 *쿵쿵*" },
      intro: { en: "Gravity flipped. Blocks just *swap sides*.", ko: "중력이 바뀌었는데 블록이 *그냥 반대편에*." },
      interval: 1.2, stepDur: 3.6,
      drawFloor(w, ctx) {
        const S = w.S;
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(GV.x0, GV.y0, GV.x1 - GV.x0, GV.y1 - GV.y0);
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 3; ctx.strokeRect(GV.x0, GV.y0, GV.x1 - GV.x0, GV.y1 - GV.y0);
        if (S.edge > 0) {
          const y = S.down ? GV.y1 : GV.y0;
          ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(198,244,50,${0.8 * S.edge})`; ctx.fillRect(GV.x0, y - 3, GV.x1 - GV.x0, 6);
          glow(ctx, 270, y, 160, LIME, 0.25 * S.edge); ctx.globalCompositeOperation = "source-over";
        }
      },
      setup(w) {
        w.S = { down: true, ang: 0, edge: 0, fallT: 0, blocks: [168, 216, 270, 324, 372].map((x, i) => ({ x, y: GV.y1 - GV.s / 2, col: PAL[i], sx: 1, sy: 1, vy: 0, falling: false, i })) };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.down = !S.down; S.ang = S.down ? 0 : Math.PI;
        w.emit("flip", S);
        S.fallT = 0;
        w.emit("fall", S.blocks);
        if (!S.fallT) S.blocks.forEach(b => { b.y = S.down ? GV.y1 - GV.s / 2 : GV.y0 + GV.s / 2; w.emit("land", b); });
        w.after(0.65, () => { w.busy = false; });
      },
      update(w, dt) {
        const S = w.S, k = Math.min(1, dt * 12), ty = S.down ? GV.y1 - GV.s / 2 : GV.y0 + GV.s / 2;
        decay(S, ["edge"], dt, 1.6);
        for (const b of S.blocks) {
          b.sx += (1 - b.sx) * k; b.sy += (1 - b.sy) * k;
          if (!b.falling) continue;
          if (b.wait > 0) { b.wait -= dt; continue; }
          b.vy += (S.down ? 2600 : -2600) * dt; b.y += b.vy * dt;
          if ((S.down && b.y >= ty) || (!S.down && b.y <= ty)) { b.y = ty; b.falling = false; b.vy = 0; w.emit("land", b); }
        }
      },
      drawFront(w, ctx) {
        const S = w.S, s = GV.s;
        for (const b of S.blocks) {
          const anchorY = b.y + (S.down ? s / 2 : -s / 2);
          ctx.save(); ctx.translate(b.x, anchorY); ctx.scale(b.sx, b.sy); ctx.translate(-b.x, -anchorY);
          tile(ctx, b.x, b.y, s, b.col); ctx.restore();
        }
        ctx.save(); ctx.translate(462, 170); ctx.rotate(S.ang);
        ctx.fillStyle = "#c6f432"; ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(7, -34); ctx.lineTo(7, 6); ctx.lineTo(18, 6); ctx.lineTo(0, 30); ctx.lineTo(-18, 6); ctx.lineTo(-7, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
        label(ctx, "GRAVITY", 462, 222, 11, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
      },
      steps: [
        {
          id: "arrow", name: { en: "Arrow Spin", ko: "화살표 회전" }, param: "180° · 300ms back",
          cap: { en: "*Spin* the gravity arrow. Show the change.", ko: "중력 화살표가 *빙글*. 바뀌는 걸 보여줘요." },
          flip(w, S) { const to = S.ang; S.ang = to - Math.PI; w.tween(S, { ang: to }, 0.3, "back"); },
        },
        {
          id: "fall", name: { en: "Real Fall", ko: "진짜로 떨어짐" }, param: "g 2600 · 40ms stagger",
          cap: { en: "Blocks *accelerate*, one after another.", ko: "블록이 *점점 빨라지며*, 하나씩 떨어져요." },
          fall(w, blocks) { w.S.fallT = 1; blocks.forEach(b => { b.falling = true; b.vy = 0; b.wait = b.i * 0.04; }); },
        },
        {
          id: "squash", name: { en: "Landing Squash", ko: "착지 찌그러짐" }, param: "1.3 × 0.65",
          cap: { en: "Each block *squashes* when it lands.", ko: "닿는 블록마다 *납작*." },
          land(w, b) { b.sx = 1.3; b.sy = 0.65; },
        },
        {
          id: "dust", name: { en: "Impact Dust", ko: "충돌 먼지" }, param: "3 puffs / block",
          cap: { en: "Dust puffs where they *hit*.", ko: "*부딪힌* 자리에 먼지가 훅." },
          land(w, b) {
            const y = w.S.down ? GV.y1 : GV.y0;
            for (let i = 0; i < 3; i++) w.spawn({ type: "smoke", x: b.x + rand(-18, 18), y, vx: rand(-90, 90), vy: w.S.down ? rand(-60, -10) : rand(10, 60), drag: 3, size: 5, size1: 15, life: 0.45, color: "210,210,220" });
          },
        },
        {
          id: "kick", name: { en: "Heavy Kick", ko: "묵직한 반동" }, param: "kick 8 / block",
          cap: { en: "The screen *kicks* toward gravity on each hit.", ko: "닿을 때마다 화면이 중력 쪽으로 *쿵*." },
          land(w) { w.kick(0, w.S.down ? 8 : -8); w.shake(0.06); },
        },
        {
          id: "edge", name: { en: "Floor Light", ko: "바닥면 빛" }, param: "edge glow 600ms",
          cap: { en: "Light up the *new floor*.", ko: "*새 바닥*이 된 면을 밝혀요." },
          flip(w, S) { S.edge = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + thuds",
          cap: { en: "A *whoosh*, then a run of *thuds*.", ko: "*휘익*, 이어서 *쿵쿵쿵*." },
          flip(w) { w.sfx.dash(); },
          land(w, b) { w.play(() => tn({ f: 150 - b.i * 12, f2: 50, dur: 0.12, vol: 0.45 })); },
        },
      ],
    },

    /* 19 ─────────────────────────────── */
    {
      id: "puzzle-laser-mirror", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make lasers *sizzle*", ko: "레이저를 *지지직*" },
      intro: { en: "Mirror turns. A thin line. *Solved?*", ko: "거울이 돌고 얇은 선. *풀린 거예요?*" },
      interval: 1.4, stepDur: 3.8,
      drawFloor(w, ctx) { board(ctx, LZ.x0, LZ.y0, LZ.cols, LZ.rows, LZ.cs); },
      setup(w) { w.S = { ok: true, ang: -Math.PI / 4, len: 1, glow: 0, tgt: 1, turnT: 0, travelT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        Object.assign(S, { ok: false, ang: Math.PI / 4, len: 1, tgt: 0 });
        w.after(0.25, () => {
          S.turnT = 0;
          w.emit("turn", S);
          if (!S.turnT) S.ang = -Math.PI / 4;
          w.after(S.turnT, () => {
            S.ok = true; S.travelT = 0;
            w.emit("beam", S);
            w.after(S.travelT, () => { S.tgt = 1; w.emit("lit", S); });
            w.after(0.6, () => { w.busy = false; });
          });
        });
      },
      drawFront(w, ctx) {
        const S = w.S, pts = lzPath(S.ok), e = lzPos(2, 0), t = lzPos(0, 6);
        rr(ctx, e.x - 18, e.y - 14, 30, 28, 6, "#475569"); ctx.fillStyle = "#ef4444"; ctx.fillRect(e.x + 8, e.y - 5, 6, 10);
        if (S.tgt && w.on("target")) { ctx.globalCompositeOperation = "lighter"; glow(ctx, t.x, t.y, 60, "248,113,113", 0.8); ctx.globalCompositeOperation = "source-over"; }
        ctx.fillStyle = S.tgt ? "#fca5a5" : "#334155"; ctx.beginPath(); ctx.arc(t.x, t.y, 16, 0, TAU); ctx.fill();
        ctx.strokeStyle = S.tgt ? "#fff" : "#64748b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, TAU); ctx.stroke();
        if (S.glow) {
          ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.strokeStyle = `rgba(239,68,68,${0.3 + Math.random() * 0.1})`; ctx.lineWidth = 16; polyPart(ctx, pts, S.len); ctx.stroke();
          ctx.strokeStyle = "rgba(252,165,165,0.7)"; ctx.lineWidth = 7; polyPart(ctx, pts, S.len); ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.strokeStyle = S.glow ? "#fff" : "#ef4444"; ctx.lineWidth = 2.5; polyPart(ctx, pts, S.len); ctx.stroke();
        for (const [p, a] of [[lzPos(2, 4), S.ang], [lzPos(0, 4), -Math.PI / 4]]) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
          ctx.fillStyle = "#cbd5e1"; ctx.fillRect(-20, -3, 40, 6); ctx.fillStyle = "#334155"; ctx.fillRect(-20, 3, 40, 3);
          ctx.restore();
        }
      },
      steps: [
        {
          id: "turn", name: { en: "Eased Turn", ko: "부드러운 회전" }, param: "150ms · back",
          cap: { en: "Rotate the mirror *smoothly*, with a settle.", ko: "거울이 *부드럽게* 돌고 살짝 멈칫." },
          turn(w, S) { S.turnT = 0.15; w.tween(S, { ang: -Math.PI / 4 }, 0.15, "back"); },
        },
        {
          id: "travel", name: { en: "Beam Travels", ko: "빛이 뻗어 감" }, param: "220ms",
          cap: { en: "The beam *races* along the path. Not instant.", ko: "빛이 길을 따라 *쭉 뻗어가요*. 한 번에 말고." },
          beam(w, S) { S.travelT = 0.22; S.len = 0; w.tween(S, { len: 1 }, 0.22, "lin"); },
        },
        {
          id: "glow", name: { en: "Hot Glow", ko: "뜨거운 빛" }, param: "3 layers · flicker",
          cap: { en: "Three layers: *white core*, red glow, flicker.", ko: "*하얀 심*, 붉은 빛, 살짝 떨림. 세 겹으로." },
          beam(w, S) { S.glow = 1; },
        },
        {
          id: "sparks", name: { en: "Mirror Sparks", ko: "거울 불꽃" }, param: "sparks / frame",
          cap: { en: "*Sparks* sizzle where it bounces.", ko: "빛이 꺾이는 곳에서 *지지직* 불꽃." },
          update(w) {
            if (!w.S.ok || w.S.len < 1) return;
            const p = pick([lzPos(2, 4), lzPos(0, 4)]);
            sparks(w, p.x, p.y, 1, "254,202,202", [80, 220]);
          },
        },
        {
          id: "target", name: { en: "Target Charge", ko: "목표 점등" }, param: "glow + rays + ring",
          cap: { en: "The target *charges up*: rays and a ring.", ko: "목표가 *충전되듯* 빛나요. 빛살과 고리." },
          lit(w) {
            const t = lzPos(0, 6);
            w.spawn({ type: "rays", x: t.x, y: t.y, size: 60, n: 10, vr: 1.5, life: 0.9, color: "248,113,113" });
            w.spawn({ type: "ring", x: t.x, y: t.y, size: 16, size1: 70, life: 0.45, w: 6, color: "254,202,202" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "zap / hum / chime",
          cap: { en: "A *zap* as it fires, a *chime* on target.", ko: "쏠 때 *지잉*, 맞으면 *띠링*." },
          turn(w) { w.sfx.clickDown(); },
          beam(w) { w.play(() => tn({ type: "sawtooth", f: 880, f2: 1760, dur: 0.22, vol: 0.06 })); },
          lit(w) { if (w.on("target")) w.sfx.chime(5); },
        },
      ],
    },

    /* 20 ─────────────────────────────── */
    {
      id: "puzzle-pipe-flow", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make water *flow* through pipes", ko: "파이프에 물이 *흐르게*" },
      intro: { en: "Connected! The whole path just *turns blue*.", ko: "연결! 길 전체가 *한 번에 파래져요*." },
      interval: 1.6, stepDur: 3.8,
      drawFloor(w, ctx) { board(ctx, PP.x0, PP.y0, PP.cols, PP.rows, PP.cs); },
      setup(w) { w.S = { rot: Math.PI / 2, fill: PP_PATH.map(() => 1), dash: 0, turnT: 0, flowT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.rot = 0; S.fill = PP_PATH.map(() => 0);
        w.after(0.22, () => {
          S.turnT = 0;
          w.emit("turn", S);
          if (!S.turnT) S.rot = Math.PI / 2;
          w.after(S.turnT, () => {
            S.flowT = 0;
            w.emit("flow", S);
            if (!S.flowT) S.fill = PP_PATH.map(() => 1);
            w.after(S.flowT, () => w.emit("drain", S));
            w.after(0.75, () => { w.busy = false; });
          });
        });
      },
      drawFront(w, ctx) {
        const S = w.S, src = ppPos(1, 0), dr = ppPos(2, 5);
        rr(ctx, src.x - PP.cs / 2 - 30, src.y - 22, 30, 44, 6, "#0369a1");
        rr(ctx, dr.x + PP.cs / 2, dr.y - 18, 22, 36, 6, "#334155");
        for (const [r, c, arms] of PP_DECO) { const p = ppPos(r, c); pipeCell(ctx, p.x, p.y, [...arms]); }
        PP_PATH.forEach(([r, c, a, b], i) => {
          const p = ppPos(r, c);
          if (i === 4) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(S.rot); ctx.fillStyle = "rgba(198,244,50,0.12)"; ctx.fillRect(-PP.cs / 2 + 2, -PP.cs / 2 + 2, PP.cs - 4, PP.cs - 4); pipeCell(ctx, 0, 0, ["N", "S"]); ctx.restore(); }
          else pipeCell(ctx, p.x, p.y, [a, b]);
          const f = S.fill[i]; if (f <= 0) return;
          const [ax, ay] = DIRV[a], [bx, by] = DIRV[b], h = PP.cs / 2, f1 = Math.min(1, f * 2), f2 = Math.max(0, f * 2 - 1);
          const pts = [[p.x + ax * h, p.y + ay * h], [p.x + ax * h * (1 - f1), p.y + ay * h * (1 - f1)]];
          if (f2 > 0) pts.push([p.x + bx * h * f2, p.y + by * h * f2]);
          ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); pts.forEach(([x, y], j) => ctx[j ? "lineTo" : "moveTo"](x, y)); ctx.stroke();
          if (S.dash > 0) {
            ctx.strokeStyle = "rgba(224,242,254,0.85)"; ctx.lineWidth = 3; ctx.setLineDash([6, 12]); ctx.lineDashOffset = -S.dash;
            ctx.beginPath(); pts.forEach(([x, y], j) => ctx[j ? "lineTo" : "moveTo"](x, y)); ctx.stroke(); ctx.setLineDash([]);
          }
        });
      },
      steps: [
        {
          id: "turn", name: { en: "Eased Turn", ko: "부드러운 회전" }, param: "90° · 160ms back",
          cap: { en: "The pipe *twists* into place with a click.", ko: "파이프가 *딸깍* 돌아 맞춰져요." },
          turn(w, S) { S.turnT = 0.16; w.tween(S, { rot: Math.PI / 2 }, 0.16, "back"); },
        },
        {
          id: "flow", name: { en: "Water Travels", ko: "물이 따라 흐름" }, param: "80ms / pipe",
          cap: { en: "Water *runs* through, pipe by pipe.", ko: "물이 파이프를 *하나씩 따라* 흘러요." },
          flow(w, S) {
            S.flowT = PP_PATH.length * 0.08;
            PP_PATH.forEach((p, i) => w.after(i * 0.08, () => { w.tween(S.fill, { [i]: 1 }, 0.08, "lin"); w.emit("pour", i); }));
          },
        },
        {
          id: "shimmer", name: { en: "Moving Shine", ko: "흐르는 물빛" }, param: "dash 80px/s",
          cap: { en: "Moving *highlights* show which way it flows.", ko: "*움직이는 물빛*으로 흐르는 방향을 보여줘요." },
          update(w, dt) { w.S.dash += dt * 80; },
        },
        {
          id: "splash", name: { en: "Joint Splash", ko: "이음새 물방울" }, param: "4 drops / pipe",
          cap: { en: "Little *splashes* at every joint.", ko: "이음새마다 *물방울*이 톡톡." },
          pour(w, i) {
            const [r, c, a] = PP_PATH[i], p = ppPos(r, c), [dx, dy] = DIRV[a];
            for (let k = 0; k < 4; k++) w.spawn({ type: "circle", x: p.x + dx * PP.cs / 2, y: p.y + dy * PP.cs / 2, vx: rand(-80, 80), vy: rand(-160, -60), g: 700, size: rand(2, 3.5), life: 0.4, color: "125,211,252" });
          },
        },
        {
          id: "goal", name: { en: "Drain Fountain", ko: "출구 분수" }, param: "14 drops + text",
          cap: { en: "At the exit: a *fountain* and a reward.", ko: "출구에서 *분수*가 솟고 보상까지." },
          drain(w) {
            const p = ppPos(2, 5);
            for (let k = 0; k < 14; k++) w.spawn({ type: "circle", x: p.x + PP.cs / 2 + 12, y: p.y - 10, vx: rand(-60, 90), vy: rand(-420, -220), g: 1100, size: rand(2.5, 4.5), life: 0.8, color: "125,211,252" });
            say(w, "+100", p.x + 20, p.y - 70, 26, "#7dd3fc", 0.9);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "click / gurgle / chime",
          cap: { en: "*Click*, a soft *gurgle*, then a *chime*.", ko: "*딸깍*, *꼴꼴꼴*, 그리고 *띠링*." },
          turn(w) { w.sfx.clickDown(); },
          pour(w, i) { w.play(() => nz({ type: "bandpass", f: 500 + i * 80, q: 6, dur: 0.08, vol: 0.25 })); },
          drain(w) { if (w.on("goal") || w.on("splash")) w.sfx.chime(7); },
        },
      ],
    },

    /* 21 ─────────────────────────────── */
    {
      id: "puzzle-mine-reveal", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make safe reveals *cascade*", ko: "빈칸 열기를 *와르르*" },
      intro: { en: "One tap opens a big area. *Instantly.*", ko: "한 번 눌렀더니 넓게 열림. *그냥 한 번에.*" },
      interval: 1.4, stepDur: 3.7,
      drawFloor(w, ctx) { board(ctx, MR.x0, MR.y0, MR.cols, MR.rows, MR.cs, 4); },
      setup(w) { w.S = { G: mrBuild(), revT: 0 }; mrFlood(w.S.G, ...MR.click).forEach(m => { m.open = true; }); },
      fire(w) {
        const S = w.S;
        S.G = mrBuild(); S.tap = 1;
        w.after(0.3, () => {
          const list = mrFlood(S.G, ...MR.click);
          S.revT = 0;
          w.emit("reveal", list);
          if (!S.revT) list.forEach(m => { m.open = true; });
        });
      },
      update(w, dt) { decay(w.S, ["tap"], dt, 2.5); },
      drawFront(w, ctx) {
        mrDraw(ctx, w, w.S.G);
        if (w.S.tap > 0) { const p = mrPos(...MR.click); ctx.globalAlpha = Math.min(1, w.S.tap * 2); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + 8, p.y + 10, 9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; }
      },
      steps: [
        {
          id: "cascade", name: { en: "Cascade", ko: "와르르 열림" }, param: "40ms / ring",
          cap: { en: "Open in *rings* from the tap. A satisfying spread.", ko: "누른 곳부터 *둥글게 퍼지며* 열려요." },
          reveal(w, list) { w.S.revT = 1; list.forEach(m => w.after(m.d * 0.04, () => { m.open = true; w.emit("tile", m); })); },
        },
        {
          id: "chips", name: { en: "Tile Chips", ko: "덮개 조각" }, param: "2 chunks / tile",
          cap: { en: "The covers *break off* in little chips.", ko: "덮개가 *조각조각* 떨어져 나가요." },
          tile(w, m) { const p = mrPos(m.r, m.c); shards(w, p.x, p.y, "148,163,184", 2, 180); },
        },
        {
          id: "numbers", name: { en: "Colored Numbers", ko: "숫자별 색" }, param: "1 blue · 2 green · 3 red",
          cap: { en: "Color the numbers and *pop* them in.", ko: "숫자마다 *색을 다르게*, 톡 튀어나오게." },
          tile(w, m) { if (m.n) { m.np = 1.7; w.tween(m, { np: 1 }, 0.2, "out"); } },
        },
        {
          id: "ripple", name: { en: "Tap Ripple", ko: "누른 자리 물결" }, param: "ring + zoom .03",
          cap: { en: "A *ripple* marks where you tapped.", ko: "*누른 자리*에서 물결이 퍼져요." },
          reveal(w) { const p = mrPos(...MR.click); w.spawn({ type: "ring", x: p.x, y: p.y, size: 8, size1: 150, life: 0.5, w: 6, color: "255,255,255" }); w.zoomPunch(0.03); },
        },
        {
          id: "sound", name: { en: "Rolling Ticks", ko: "또르르 소리" }, param: "+1 semitone / ring",
          cap: { en: "Ticks *climb* as the area spreads.", ko: "넓게 퍼질수록 소리가 *또르르* 올라가요." },
          reveal(w, list) { if (!w.on("cascade")) { w.sfx.tock(); return; } const far = Math.max(...list.map(m => m.d)); for (let d = 0; d <= far; d++) w.after(d * 0.04, () => w.sfx.blip(d + 1)); },
        },
      ],
    },
  );
  /* ───── 23. 별 3개 ───── */
  function star5(ctx, x, y, r, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.stroke(); }
  }
  const LV_STARS = [{ x: 200, y: 160, r: 30 }, { x: 270, y: 146, r: 40 }, { x: 340, y: 160, r: 30 }];

  /* ───── 24. 연쇄 반응 ───── */
  const CH = Array.from({ length: 10 }, (_, i) => ({ x: 110 + i * 35.5, y: i % 2 ? 210 : 150, c: PAL[i % 5] }));

  /* ───── 25. 되돌리기 ───── */
  const UD = { x0: 120, y0: 64, cs: 50, cols: 6, rows: 4 };
  const UD_PATH = [[1, 0], [1, 1], [1, 2], [2, 2], [2, 3], [2, 4]];
  const udPos = ([r, c]) => ({ x: UD.x0 + c * UD.cs + UD.cs / 2, y: UD.y0 + r * UD.cs + UD.cs / 2 });

  /* ───── 27. 가로세로 블록 맞추기 ───── */
  const BL = { x0: 150, y0: 40, cs: 30, n: 8, hit: [5, 2] };
  const BL_PIECE = [[5, 2], [5, 3], [6, 2]];
  const blPos = (r, c) => ({ x: BL.x0 + c * BL.cs + BL.cs / 2, y: BL.y0 + r * BL.cs + BL.cs / 2 });
  function blBuild() {
    const B = [];
    for (let r = 0; r < BL.n; r++) {
      B.push([]);
      for (let c = 0; c < BL.n; c++) {
        let on = Math.random() < 0.38;
        if (r === 5 || c === 2) on = true;
        if (BL_PIECE.some(([pr, pc]) => pr === r && pc === c)) on = false;
        if (r === 4 && c !== 2) on = Math.random() < 0.5 && c !== 0;
        B[r].push(on ? { c: EME[(r + c * 2) % 4], sc: 1, wh: 0 } : null);
      }
    }
    return B;
  }

  /* ───── 28. 열쇠와 문 ───── */
  const KD = { kx: 150, ky: 190, lx: 418, ly: 214, dx: 380, dw: 80, dy: 136 };
  function drawKey(ctx, x, y, rot, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#a16207"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-22, 0, 13, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1a1b22"; ctx.beginPath(); ctx.arc(-22, 0, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.fillRect(-10, -4, 36, 8); ctx.fillRect(14, 4, 5, 8); ctx.fillRect(22, 4, 4, 6);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(-8, -3, 30, 2);
    ctx.restore();
  }

  RECIPES.push(
    /* 22 ─────────────────────────────── */
    {
      id: "puzzle-mine-explode", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make a mine hit *hurt*", ko: "지뢰 밟기를 *아프게*" },
      intro: { en: "Game over... it says. *Nothing else happens.*", ko: "게임 오버래요. *근데 아무 일도 없어요.*" },
      interval: 1.7, stepDur: 4.0,
      drawFloor(w, ctx) { board(ctx, MR.x0, MR.y0, MR.cols, MR.rows, MR.cs, 4); },
      setup(w) {
        w.S = { G: mrBuild(), chainT: 0 };
        mrFlood(w.S.G, ...MR.click).forEach(m => { m.open = true; });
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.G = mrBuild();
        mrFlood(S.G, ...MR.click).forEach(m => { m.open = true; });
        const m = S.G[2][7];
        const boom = () => {
          m.open = true; m.hit = true; m.warn = 0; m.wob = 0;
          w.emit("boom", m);
          const others = S.G.flat().filter(o => o.mine && o !== m).sort((a, b) => Math.hypot(a.r - 2, a.c - 7) - Math.hypot(b.r - 2, b.c - 7));
          S.chainT = 0;
          w.emit("chain", others);
          if (!S.chainT) others.forEach(o => { o.open = true; });
          w.after(0.9, () => { w.busy = false; });
        };
        S.tap = 1;
        w.after(0.3, () => { if (w.on("tension")) { w.emit("arm", m); w.after(0.3, boom); } else boom(); });
      },
      update(w, dt) { decay(w.S, ["tap"], dt, 2); },
      drawFront(w, ctx) {
        for (const m of w.S.G.flat()) if (m.hit) { const p = mrPos(m.r, m.c); ctx.fillStyle = "#dc2626"; ctx.fillRect(p.x - 14, p.y - 14, 28, 28); }
        mrDraw(ctx, w, w.S.G);
        if (w.S.tap > 0) { const p = mrPos(2, 7); ctx.globalAlpha = Math.min(1, w.S.tap * 2); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + 8, p.y + 10, 9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; }
      },
      steps: [
        {
          id: "tension", name: { en: "Uh-oh Wobble", ko: "앗 하는 떨림" }, param: "300ms red wobble",
          cap: { en: "A split second of *uh-oh*: the tile wobbles red.", ko: "아주 잠깐 *앗!* 칸이 빨갛게 떨려요." },
          arm(w, m) { m.wob = 1; m.warn = 0; w.tween(m, { warn: 1 }, 0.3, "in"); },
        },
        {
          id: "flash", name: { en: "White Flash + Stop", ko: "하얀 번쩍 + 멈칫" }, param: "flash .8 · stop 80ms",
          cap: { en: "Flash the screen *white* and freeze a beat.", ko: "화면이 *하얗게* 번쩍, 한 박자 멈춰요." },
          boom(w) { w.flash("255,255,255", 0.8); w.hitstop(0.08); },
        },
        {
          id: "blast", name: { en: "Blast", ko: "폭발" }, param: "ring + fire + smoke",
          cap: { en: "A real *blast*: shockwave, fire, smoke.", ko: "진짜 *폭발*. 충격파, 불꽃, 연기." },
          boom(w, m) {
            const p = mrPos(m.r, m.c);
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 14, size1: 170, life: 0.45, w: 10, color: "253,186,116" });
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 110, size1: 40, life: 0.4, color: "251,146,60" });
            for (let i = 0; i < 10; i++) w.spawn({ type: "smoke", x: p.x, y: p.y, vx: rand(-160, 160), vy: rand(-160, 120), drag: 3, size: 8, size1: 26, life: rand(0.6, 1), color: "70,70,80" });
          },
        },
        {
          id: "chain", name: { en: "Mines Reveal in Turn", ko: "지뢰가 차례로" }, param: "70ms / mine",
          cap: { en: "Other mines pop open *one by one*, nearest first.", ko: "나머지 지뢰가 가까운 것부터 *하나씩* 펑펑." },
          chain(w, list) {
            w.S.chainT = 1;
            list.forEach((o, i) => w.after(0.25 + i * 0.07, () => { o.open = true; const p = mrPos(o.r, o.c); w.spawn({ type: "ring", x: p.x, y: p.y, size: 6, size1: 30, life: 0.3, w: 4, color: "248,113,113" }); }));
          },
        },
        {
          id: "shake", name: { en: "Big Shake", ko: "크게 흔들림" }, param: "trauma .7 · zoom .08",
          cap: { en: "*Shake hard*. This is the big fail.", ko: "*세게 흔들어요*. 이건 큰 실패니까." },
          boom(w) { w.shake(0.7); w.zoomPunch(0.08); },
        },
        {
          id: "debris", name: { en: "Tiles Blown Off", ko: "주변 칸이 날아감" }, param: "cracks + chunks",
          cap: { en: "Nearby covers *blow off*, cracks spread.", ko: "주변 덮개가 *날아가고* 금이 쩍." },
          boom(w, m) {
            const p = mrPos(m.r, m.c);
            for (let i = 0; i < 6; i++) { const a = rand(0, TAU), pts = [[0, 0]]; for (let k = 1; k < 5; k++) pts.push([Math.cos(a + rand(-0.4, 0.4)) * k * 18, Math.sin(a + rand(-0.4, 0.4)) * k * 18]); w.spawn({ type: "crack", x: p.x, y: p.y, pts, w: 2.5, life: 1.4, color: "20,20,24", add: false, hold: true }); }
            shards(w, p.x, p.y, "148,163,184", 14, 420);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick / boom / pops",
          cap: { en: "A *tick*, a deep *boom*, then little *pops*.", ko: "*틱*, 묵직한 *쾅*, 이어서 *퐁퐁퐁*." },
          arm(w) { w.sfx.tick(); },
          boom(w) { w.sfx.boom(); },
          chain(w, list) { if (w.on("chain")) list.forEach((o, i) => w.after(0.25 + i * 0.07, () => w.sfx.pop())); },
        },
      ],
    },

    /* 23 ─────────────────────────────── */
    {
      id: "puzzle-level-stars", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make 3 stars feel *earned*", ko: "별 3개를 *뿌듯하게*" },
      intro: { en: "Level clear. Three stars. *Already there.*", ko: "클리어. 별 3개가 *이미 떠 있어요*." },
      interval: 2.0, stepDur: 4.2,
      drawFloor() {},
      setup(w) { w.S = { sc: 1, a: 1, stars: [1, 1, 1], score: 12450, shown: 12450, rays: 0, starT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.stars = [0, 0, 0]; S.shown = 0; S.sc = 1; S.a = 1;
        w.emit("open", S);
        S.starT = 0;
        w.emit("stars", S);
        if (!S.starT) { S.stars = [1, 1, 1]; S.shown = S.score; }
        w.after(1.3, () => { w.busy = false; });
      },
      drawFront(w, ctx) {
        const S = w.S;
        ctx.save(); ctx.globalAlpha = S.a; ctx.translate(270, 170); ctx.scale(S.sc, S.sc); ctx.translate(-270, -170);
        rr(ctx, 120, 60, 300, 230, 22, "#1f2330", "rgba(255,255,255,0.12)", 2);
        label(ctx, "LEVEL CLEAR", 270, 84, 20, "#fff");
        LV_STARS.forEach((st, i) => {
          star5(ctx, st.x, st.y, st.r, "rgba(255,255,255,0.08)");
          const k = S.stars[i];
          if (k > 0) { ctx.save(); ctx.translate(st.x, st.y); ctx.scale(k, k); star5(ctx, 0, 0, st.r, "#facc15", "#fde68a"); ctx.restore(); }
        });
        label(ctx, "SCORE", 270, 210, 12, "rgba(255,255,255,0.55)", "center", "'JetBrains Mono', monospace", 700);
        label(ctx, Math.round(S.shown).toLocaleString("en-US"), 270, 236, 30, "#fff");
        rr(ctx, 210, 256, 120, 24, 12, "#c6f432"); label(ctx, "NEXT ▶", 270, 268, 13, "#14161c");
        ctx.restore();
      },
      steps: [
        {
          id: "panel", name: { en: "Panel Drop-in", ko: "창이 툭 등장" }, param: "0.6 → 1 · back",
          cap: { en: "The panel *pops in*. Never just appear.", ko: "결과 창이 *툭* 튀어나와요. 그냥 뜨지 않게." },
          open(w, S) { S.sc = 0.6; S.a = 0; w.tween(S, { sc: 1, a: 1 }, 0.25, "back"); },
        },
        {
          id: "stamp", name: { en: "Star Stamps", ko: "별 도장 쾅쾅쾅" }, param: "2.2× → 1 · 250ms apart",
          cap: { en: "Stars *slam in one by one*. Let each one land.", ko: "별이 *하나씩 쾅*. 하나하나 느끼게." },
          stars(w, S) {
            S.starT = 1;
            [0, 1, 2].forEach(i => w.after(0.3 + i * 0.25, () => { S.stars[i] = 2.2; w.tween(S.stars, { [i]: 1 }, 0.14, "in", () => w.emit("land", i)); }));
          },
        },
        {
          id: "burst", name: { en: "Star Burst", ko: "별 터짐" }, param: "ring + 8 sparks",
          cap: { en: "Each landing *bursts* with sparks.", ko: "별이 박힐 때마다 *불꽃*이 팡." },
          land(w, i) { const st = LV_STARS[i]; w.spawn({ type: "ring", x: st.x, y: st.y, size: st.r, size1: st.r * 2.4, life: 0.35, w: 6, color: "253,224,71" }); sparks(w, st.x, st.y, 8, "253,224,71", [180, 380]); w.shake(0.12 + i * 0.06); },
        },
        {
          id: "rays", name: { en: "Spinning Rays", ko: "도는 빛살" }, param: "14 rays · slow spin",
          cap: { en: "Slow *rays* spin behind the stars.", ko: "별 뒤로 *빛살*이 천천히 돌아요." },
          open(w) { w.spawn({ type: "rays", x: 270, y: 135, size: 220, n: 14, vr: 0.6, life: 1.9, color: "253,224,71", under: true, hold: true }); },
        },
        {
          id: "count", name: { en: "Score Count-up", ko: "점수 올라가기" }, param: "0 → 12,450 · 700ms",
          cap: { en: "The score *counts up*. Watching it is the reward.", ko: "점수가 *촤르르* 올라가요. 보는 맛." },
          stars(w, S) { w.tween(S, { shown: S.score }, 0.7, "out"); },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "30 pieces",
          cap: { en: "Third star? *Confetti* rains down.", ko: "세 번째 별엔 *꽃가루*가 펑." },
          land(w, i) { if (i === 2) for (let k = 0; k < 30; k++) w.spawn({ type: "chunk", x: 270 + rand(-60, 60), y: 120, vx: rand(-320, 320), vy: rand(-520, -200), g: 700, drag: 1.5, vr: rand(-15, 15), size: rand(3, 5), life: rand(1, 1.6), color: pick(PAL), hold: true }); },
        },
        {
          id: "sound", name: { en: "Rising Chimes", ko: "올라가는 종소리" }, param: "do-mi-sol + fanfare",
          cap: { en: "One chime per star, *higher each time*.", ko: "별마다 종소리가 *한 단계씩* 높아져요." },
          land(w, i) { w.sfx.thunk(); if (w.on("stamp")) w.sfx.chime([0, 4, 7][i]); if (i === 2 && (w.on("burst") || w.on("rays"))) w.after(0.1, () => w.sfx.fanfare()); },
        },
      ],
    },

    /* 24 ─────────────────────────────── */
    {
      id: "puzzle-chain-combo", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make chain reactions *build*", ko: "연쇄 반응이 *점점 커지게*" },
      intro: { en: "Ten in a chain. Gone *all at once*.", ko: "열 개가 연쇄인데 *한 번에* 사라져요." },
      interval: 1.7, stepDur: 4.0,
      drawFloor(w, ctx) {
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); CH.forEach((o, i) => ctx[i ? "lineTo" : "moveTo"](o.x, o.y)); ctx.stroke(); ctx.setLineDash([]);
      },
      setup(w) { w.S = { orbs: CH.map(o => ({ ...o, sc: 1, gone: false })), n: 0, bump: 0, popT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        S.orbs.forEach(o => { o.gone = false; o.sc = 1; });
        S.n = 0; S.popT = 0;
        w.emit("start", S);
        if (!S.popT) { S.orbs.forEach(o => { o.gone = true; }); S.n = S.orbs.length; }
        w.after(1.05, () => { S.orbs.forEach(o => { o.gone = false; o.sc = 0; w.tween(o, { sc: 1 }, 0.15, "out"); }); });
        w.after(1.25, () => { w.busy = false; });
      },
      update(w, dt) { decay(w.S, ["bump"], dt, 4); },
      drawFront(w, ctx) {
        const S = w.S;
        for (const o of S.orbs) if (!o.gone) bubble(ctx, o.x, o.y, 15, o.c, o.sc);
        if (S.n > 0) {
          const sc = 1 + S.bump * 0.5, hot = Math.min(1, S.n / 10);
          ctx.save(); ctx.translate(270, 290); ctx.scale(sc, sc);
          label(ctx, "CHAIN ×" + S.n, 0, 0, 22 + S.n * 1.6, `rgb(255,${Math.round(255 - hot * 140)},${Math.round(255 - hot * 200)})`);
          ctx.restore();
        }
      },
      steps: [
        {
          id: "stagger", name: { en: "One After Another", ko: "하나씩 차례로" }, param: "70ms / link",
          cap: { en: "Pop them *in order*. A chain needs time to travel.", ko: "*차례로* 터뜨려요. 연쇄는 전달되는 시간이 필요해요." },
          start(w, S) {
            S.popT = 1;
            S.orbs.forEach((o, i) => w.after(i * 0.07, () => { o.gone = true; S.n = i + 1; w.emit("pop", o, i + 1); }));
          },
        },
        {
          id: "zap", name: { en: "Link Zap", ko: "번개 전달" }, param: "bolt to next",
          cap: { en: "A *zap* jumps to the next one. See the cause.", ko: "다음 칸으로 *찌릿* 번개가 튀어요. 원인이 보이게." },
          pop(w, o, n) {
            const nx = CH[n]; if (!nx) return;
            const pts = [[0, 0]]; for (let k = 1; k < 5; k++) pts.push([(nx.x - o.x) * k / 5 + rand(-6, 6), (nx.y - o.y) * k / 5 + rand(-6, 6)]); pts.push([nx.x - o.x, nx.y - o.y]);
            w.spawn({ type: "crack", x: o.x, y: o.y, pts, w: 3, life: 0.15, color: "224,242,254", add: true });
          },
        },
        {
          id: "grow", name: { en: "Bigger Each Pop", ko: "갈수록 크게" }, param: "ring +8px / step",
          cap: { en: "Each pop is *bigger* than the last.", ko: "터질 때마다 *앞보다 크게*." },
          pop(w, o, n) { w.spawn({ type: "ring", x: o.x, y: o.y, size: 10, size1: 26 + n * 8, life: 0.35, w: 4 + n * 0.6, color: o.c }); sparks(w, o.x, o.y, 4 + n, o.c, [120, 200 + n * 25]); },
        },
        {
          id: "counter", name: { en: "Chain Counter", ko: "연쇄 숫자" }, param: "bump · hotter color",
          cap: { en: "Count it *out loud*. The number heats up.", ko: "숫자를 *크게* 세요. 갈수록 뜨거운 색." },
          pop(w) { w.S.bump = 1; },
        },
        {
          id: "zoom", name: { en: "Rising Punch", ko: "점점 센 반동" }, param: "shake .03 × n",
          cap: { en: "Shake and zoom *grow* with the chain.", ko: "흔들림과 확대도 *점점 세게*." },
          pop(w, o, n) { w.shake(0.03 * n); w.zoomPunch(0.006 * n); },
        },
        {
          id: "finale", name: { en: "Finale", ko: "마지막 한 방" }, param: "flash + slow-mo",
          cap: { en: "The last link gets a *flash* and slow-mo.", ko: "마지막 연쇄는 *번쩍* + 슬로모션." },
          pop(w, o, n) { if (n < CH.length) return; w.flash("255,255,255", 0.5); w.slowmo(0.3, 0.45); say(w, "AMAZING!", 270, 90, 40, "#c6f432", 1.1); },
        },
        {
          id: "sound", name: { en: "Rising Pitch", ko: "올라가는 음" }, param: "+2 semitones / link",
          cap: { en: "Each link sounds *higher*. The ear feels it build.", ko: "연쇄마다 음이 *올라가요*. 귀로도 쌓여요." },
          pop(w, o, n) { w.sfx.blip(n * 2); if (n === CH.length && w.on("finale")) w.sfx.fanfare(); },
        },
      ],
    },

    /* 25 ─────────────────────────────── */
    {
      id: "puzzle-undo-rewind", cat: "puzzle", view: "top", polished: true,
      title: { en: "Make undo feel like *rewinding*", ko: "되돌리기를 *되감기처럼*" },
      intro: { en: "Undo. You're back. *Wait, what happened?*", ko: "되돌리기. 처음으로. *방금 뭐였죠?*" },
      interval: 1.5, stepDur: 3.8,
      drawFloor(w, ctx) {
        board(ctx, UD.x0, UD.y0, UD.cols, UD.rows, UD.cs);
        const e = udPos(UD_PATH[UD_PATH.length - 1]);
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(e.x - 20, e.y - 20, 40, 40); ctx.setLineDash([]);
      },
      setup(w) { const p = udPos(UD_PATH[0]); w.S = { x: p.x, y: p.y, k: 0, rev: 0, hist: UD_PATH.length - 1, backT: 0, ghosts: [] }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, end = udPos(UD_PATH[UD_PATH.length - 1]);
        S.x = end.x; S.y = end.y; S.hist = UD_PATH.length - 1;
        w.after(0.25, () => {
          S.backT = 0;
          w.emit("undo", S);
          if (!S.backT) { const p = udPos(UD_PATH[0]); S.x = p.x; S.y = p.y; S.hist = 0; }
          w.after(S.backT, () => { w.emit("done", S); w.after(0.3, () => { w.busy = false; }); });
        });
      },
      update(w, dt) { decay(w.S, ["rev"], dt, 2.5); },
      drawFront(w, ctx) {
        const S = w.S;
        for (const g of S.ghosts) { ctx.globalAlpha = 0.25; rr(ctx, g.x - 18, g.y - 18, 36, 36, 9, "#7dd3fc"); }
        ctx.globalAlpha = 1;
        rr(ctx, S.x - 18, S.y - 18, 36, 36, 9, "#f8fafc"); ctx.fillStyle = "#0ea5e9"; ctx.beginPath(); ctx.arc(S.x, S.y, 7, 0, TAU); ctx.fill();
        for (let i = 0; i < UD_PATH.length - 1; i++) { const on = i < S.hist; ctx.fillStyle = on ? "#c6f432" : "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.arc(205 + i * 32, 292, 7, 0, TAU); ctx.fill(); }
        label(ctx, "HISTORY", 270, 316, 10, "rgba(255,255,255,0.5)", "center", "'JetBrains Mono', monospace", 700);
      },
      drawHud(w, ctx) {
        const S = w.S;
        if (S.rev <= 0) return;
        ctx.fillStyle = `rgba(56,120,200,${0.22 * S.rev})`; ctx.fillRect(20, 0, 500, 360);
        ctx.fillStyle = `rgba(255,255,255,${0.06 * S.rev})`; for (let y = (w.time * 120) % 6; y < 360; y += 6) ctx.fillRect(20, y, 500, 2);
      },
      steps: [
        {
          id: "reverse", name: { en: "Play It Backwards", ko: "거꾸로 재생" }, param: "70ms / step",
          cap: { en: "Walk back *step by step*. Show what got undone.", ko: "*한 칸씩 거꾸로* 돌아가요. 뭘 취소했는지 보이게." },
          undo(w, S) {
            S.backT = (UD_PATH.length - 1) * 0.07;
            for (let i = UD_PATH.length - 2; i >= 0; i--) w.after((UD_PATH.length - 2 - i) * 0.07, () => { const p = udPos(UD_PATH[i]); w.tween(S, { x: p.x, y: p.y }, 0.07, "lin"); S.hist = i; w.emit("step", S, i); });
          },
        },
        {
          id: "ghosts", name: { en: "Afterimages", ko: "잔상" }, param: "1 ghost / step",
          cap: { en: "Leave *afterimages* on the path it rewinds.", ko: "되감은 길에 *잔상*을 남겨요." },
          step(w, S) { S.ghosts.push({ x: S.x, y: S.y }); w.after(0.4, () => S.ghosts.shift()); },
        },
        {
          id: "tape", name: { en: "Tape Effect", ko: "테이프 효과" }, param: "blue tint + scanlines",
          cap: { en: "Tint blue, add *scanlines*. It reads as *rewind*.", ko: "푸른 색조에 *줄무늬*. 딱 봐도 *되감기*." },
          undo(w, S) { S.rev = 1.6; },
        },
        {
          id: "icon", name: { en: "Rewind Icon", ko: "되감기 아이콘" }, param: "◀◀ pop",
          cap: { en: "Flash a big *◀◀* so nobody's confused.", ko: "큰 *◀◀*를 띄워요. 헷갈리지 않게." },
          undo(w) { w.spawn({ type: "text", text: "◀◀", x: 270, y: 44, life: 0.7, size: 34, color: "#7dd3fc" }); },
        },
        {
          id: "land", name: { en: "Arrival Bump", ko: "도착 톡" }, param: "ring + settle",
          cap: { en: "A soft *bump* when it's back at the start.", ko: "처음 자리에 오면 *톡* 하고 자리 잡아요." },
          done(w, S) { w.spawn({ type: "ring", x: S.x, y: S.y, size: 16, size1: 50, life: 0.35, w: 5, color: "125,211,252" }); },
        },
        {
          id: "sound", name: { en: "Reverse Sweep", ko: "거꾸로 휘릭" }, param: "falling tone + ticks",
          cap: { en: "A *falling* sweep with ticks. Tape going back.", ko: "*내려가는* 소리와 틱틱틱. 테이프 되감는 소리." },
          undo(w) { if (w.on("reverse") || w.on("tape")) w.play(() => tn({ type: "sawtooth", f: 1200, f2: 300, dur: 0.38, vol: 0.06 })); },
          step(w) { w.sfx.tick(); },
        },
      ],
    },

    /* 26 ─────────────────────────────── */
    {
      id: "puzzle-timer-pressure", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make the last seconds *tense*", ko: "마지막 몇 초를 *쫄깃하게*" },
      intro: { en: "3... 2... 1... Feels like a *calm* number.", ko: "3, 2, 1... 그냥 *평온한* 숫자예요." },
      interval: 0.75, stepDur: 4.0,
      drawFloor() {},
      setup(w) { w.S = { sec: 3, bar: 3 / 6, pulse: 0, shk: 0 }; },
      fire(w) {
        const S = w.S;
        S.sec -= 1;
        if (S.sec < 0) { S.sec = 6; S.bar = 1; w.emit("refill", S); return; }
        S.bar = S.sec / 6;
        w.emit("tick", S);
      },
      update(w, dt) { decay(w.S, ["pulse"], dt, 3.5); decay(w.S, ["shk"], dt, 2.5); },
      drawFront(w, ctx) {
        const S = w.S, ox = S.shk ? Math.sin(w.time * 80) * 5 * S.shk : 0, k = S.bar;
        const col = w.on("color") ? (k > 0.5 ? "#4ade80" : k > 0.25 ? "#facc15" : "#ef4444") : "#94a3b8";
        rr(ctx, 110 + ox, 70, 320, 22, 11, "rgba(255,255,255,0.08)");
        if (k > 0) rr(ctx, 110 + ox, 70, Math.max(22, 320 * k), 22, 11, col);
        const sc = 1 + S.pulse * (0.25 + (S.sec <= 2 ? 0.35 : 0));
        ctx.save(); ctx.translate(270 + ox, 190); ctx.scale(sc, sc);
        label(ctx, String(S.sec), 0, 0, 110, S.sec <= 2 && w.on("color") ? "#fca5a5" : "#fff");
        ctx.restore();
        label(ctx, "SECONDS LEFT", 270, 278, 13, "rgba(255,255,255,0.5)", "center", "'JetBrains Mono', monospace", 700);
      },
      steps: [
        {
          id: "color", name: { en: "Danger Colors", ko: "위험 색" }, param: "green → yellow → red",
          cap: { en: "The bar turns *yellow, then red*.", ko: "막대가 *노랑, 그다음 빨강*으로." },
          tick(w, S) { if (S.sec <= 2) w.spawn({ type: "glow", x: 110 + 320 * S.bar, y: 81, size: 40, size1: 10, life: 0.4, color: "239,68,68" }); },
        },
        {
          id: "pulse", name: { en: "Number Throb", ko: "숫자가 쿵" }, param: "+25% · +60% ≤2",
          cap: { en: "Each second *throbs*. Harder near the end.", ko: "1초마다 숫자가 *쿵*. 끝으로 갈수록 세게." },
          tick(w, S) { S.pulse = 1; },
        },
        {
          id: "shake", name: { en: "Shaky Bar", ko: "떨리는 막대" }, param: "±5px when ≤2",
          cap: { en: "Under 3 seconds, everything *trembles*.", ko: "3초 아래로는 모든 게 *덜덜*." },
          tick(w, S) { if (S.sec <= 2) S.shk = 1; },
        },
        {
          id: "vignette", name: { en: "Red Edges", ko: "붉은 가장자리" }, param: "vignette .25 → .55",
          cap: { en: "The screen edges *pulse red*.", ko: "화면 가장자리가 *붉게* 두근." },
          tick(w, S) { if (S.sec <= 3) w.vignette(0.65 - S.sec * 0.15); },
        },
        {
          id: "beat", name: { en: "Heartbeat Zoom", ko: "심장박동 확대" }, param: "zoom .04 · double",
          cap: { en: "The camera *beats* like a heart: thump-thump.", ko: "화면이 심장처럼 *두근두근*." },
          tick(w) { w.zoomPunch(0.04); w.after(0.16, () => w.zoomPunch(0.025)); },
        },
        {
          id: "sound", name: { en: "Climbing Ticks", ko: "높아지는 째깍" }, param: "+3 semitones / sec",
          cap: { en: "Ticks get *higher* and doubled as time runs out.", ko: "시간이 줄수록 째깍이 *높고 빨라져요*." },
          tick(w, S) { const f = 700 * Math.pow(2, (6 - S.sec) * 3 / 12); w.play(() => { tn({ type: "square", f, dur: 0.05, vol: 0.12 }); if (S.sec <= 2) tn({ type: "square", f, dur: 0.05, vol: 0.1, delay: 0.16 }); }); },
          refill(w) { if (w.on("color")) w.sfx.chime(0); },
        },
      ],
    },

    /* 27 ─────────────────────────────── */
    {
      id: "puzzle-block-blast", cat: "puzzle", view: "ui", polished: true,
      title: { en: "Make cross clears *blast*", ko: "가로세로 동시 지우기를 *팡!*" },
      intro: { en: "Row and column done. They just *blink out*.", ko: "가로세로 동시에! 근데 *깜빡* 하고 끝." },
      interval: 1.4, stepDur: 3.8,
      drawFloor(w, ctx) {
        board(ctx, BL.x0, BL.y0, BL.n, BL.n, BL.cs);
        const S = w.S;
        if (S.prev > 0) {
          ctx.fillStyle = `rgba(198,244,50,${0.2 * S.prev})`;
          ctx.fillRect(BL.x0, BL.y0 + 5 * BL.cs, BL.n * BL.cs, BL.cs); ctx.fillRect(BL.x0 + 2 * BL.cs, BL.y0, BL.cs, BL.n * BL.cs);
        }
      },
      setup(w) { w.S = { B: blBuild(), px: 455, py: 268, ps: 0.6, show: true, prev: 0, clearT: 0, beams: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S, to = blPos(5, 2);
        S.B = blBuild(); S.show = true; S.px = 455; S.py = 268; S.ps = 0.6;
        w.emit("drag", S);
        w.tween(S, { px: to.x, py: to.y, ps: 1 }, 0.26, "out", () => {
          S.show = false;
          BL_PIECE.forEach(([r, c]) => { S.B[r][c] = { c: EME_HI, sc: 1, wh: 0 }; });
          w.emit("place", S);
          const cells = [];
          for (let i = 0; i < BL.n; i++) { cells.push([5, i]); if (i !== 5) cells.push([i, 2]); }
          S.clearT = 0;
          w.emit("clear", cells);
          w.after(S.clearT, () => { cells.forEach(([r, c]) => { S.B[r][c] = null; }); w.after(0.3, () => { w.busy = false; }); });
        });
      },
      update(w, dt) { const S = w.S; decay(S, ["prev"], dt, 0.5); decay(S, ["beams"], dt, 2.5); for (const m of S.B.flat()) if (m) decay(m, ["wh"], dt, 3); },
      drawFront(w, ctx) {
        const S = w.S;
        S.B.forEach((row, r) => row.forEach((m, c) => { if (m) { const p = blPos(r, c); tile(ctx, p.x, p.y, BL.cs - 2, m.c, m.sc, m.wh); } }));
        if (S.beams > 0) {
          ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(255,255,255,${0.7 * S.beams})`;
          const h = BL.cs * S.beams;
          ctx.fillRect(BL.x0 - 10, blPos(5, 0).y - h / 2, BL.n * BL.cs + 20, h); ctx.fillRect(blPos(0, 2).x - h / 2, BL.y0 - 10, h, BL.n * BL.cs + 20);
          ctx.globalCompositeOperation = "source-over";
        }
        if (S.show) {
          const base = blPos(5, 2);
          for (const [r, c] of BL_PIECE) { const p = blPos(r, c); tile(ctx, S.px + (p.x - base.x) * S.ps, S.py + (p.y - base.y) * S.ps, (BL.cs - 2) * S.ps, EME_HI); }
        }
      },
      steps: [
        {
          id: "preview", name: { en: "Line Preview", ko: "지워질 줄 미리보기" }, param: "lime bands",
          cap: { en: "While dragging, *light up* the lines it will clear.", ko: "끌어오는 동안 *지워질 줄*을 미리 밝혀요." },
          drag(w, S) { S.prev = 1; },
        },
        {
          id: "sweep", name: { en: "Sweep From Center", ko: "가운데부터 쓸기" }, param: "30ms / cell",
          cap: { en: "Clear *outward* from where the piece landed.", ko: "놓은 자리부터 *바깥으로* 쓸어내요." },
          clear(w, cells) {
            w.S.clearT = 0.35;
            cells.forEach(([r, c]) => { const m = w.S.B[r][c]; m.wh = 1; w.after((Math.abs(r - 5) + Math.abs(c - 2)) * 0.03, () => w.tween(m, { sc: 0 }, 0.1, "in")); });
          },
        },
        {
          id: "shards", name: { en: "Block Shards", ko: "블록 파편" }, param: "3 chunks / cell",
          cap: { en: "Every block *shatters* in its color.", ko: "블록마다 *제 색깔*로 산산조각." },
          clear(w, cells) { cells.forEach(([r, c]) => { const m = w.S.B[r][c], p = blPos(r, c); w.after((Math.abs(r - 5) + Math.abs(c - 2)) * 0.03 + 0.08, () => shards(w, p.x, p.y, m.c, 3)); }); },
        },
        {
          id: "beams", name: { en: "Cross Beams", ko: "십자 광선" }, param: "white bars 400ms",
          cap: { en: "*Light beams* shoot along the row and column.", ko: "가로세로로 *빛줄기*가 쫙." },
          clear(w) { w.S.beams = 1; },
        },
        {
          id: "combo", name: { en: "Combo Shout", ko: "콤보 외침" }, param: "×2 · shake .3",
          cap: { en: "Two lines at once? Shout *COMBO* and shake.", ko: "두 줄 동시? *COMBO*를 외치고 흔들어요." },
          clear(w) { say(w, "COMBO ×2", 270, 140, 38, "#c6f432", 0.9); w.shake(0.3); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk / burst / chime",
          cap: { en: "*Thunk* on place, *burst* on clear, *chime* for combo.", ko: "놓을 때 *툭*, 지울 때 *팡*, 콤보엔 *띠링*." },
          place(w) { w.sfx.thunk(); },
          clear(w) { w.sfx.pop(); if (w.on("combo") || w.on("beams")) w.after(0.1, () => w.sfx.chime(7)); },
        },
      ],
    },

    /* 28 ─────────────────────────────── */
    {
      id: "puzzle-key-door", cat: "puzzle", view: "side", polished: true,
      title: { en: "Make unlocking *satisfying*", ko: "열쇠로 문 열기를 *짜릿하게*" },
      intro: { en: "Key gone. Door gone. *Was that it?*", ko: "열쇠 사라짐. 문 사라짐. *이게 끝?*" },
      interval: 1.8, stepDur: 4.0,
      setup(w) { w.S = { kx: KD.kx, ky: KD.ky, krot: 0, key: true, lock: true, door: 0, ly: 0, lrot: 0, shk: 0, bob: 0, light: 0, flyT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const S = w.S;
        Object.assign(S, { kx: KD.kx, ky: KD.ky, krot: 0, key: true, lock: true, door: 0, ly: 0, lrot: 0, light: 0 });
        w.after(0.15, () => {
          S.flyT = 0;
          w.emit("fly", S);
          if (!S.flyT) { S.kx = KD.lx - 30; S.ky = KD.ly; }
          w.after(S.flyT, () => {
            S.turnT = 0;
            w.emit("turn", S);
            w.after(S.turnT, () => {
              S.key = false; S.lock = false; S.doorT = 0;
              w.emit("unlock", S);
              if (!S.doorT) S.door = 1;
              w.after(0.6, () => { w.busy = false; });
            });
          });
        });
      },
      update(w, dt) { decay(w.S, ["shk"], dt, 3); },
      drawBack(w, ctx) {
        const S = w.S;
        ctx.fillStyle = "#2a2d38"; ctx.fillRect(KD.dx - 30, 100, KD.dw + 60, G - 100);
        ctx.fillStyle = "#0b0c10"; ctx.fillRect(KD.dx, KD.dy, KD.dw, G - KD.dy);
        if (S.light > 0) {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = `rgba(253,230,138,${0.75 * S.light})`; ctx.fillRect(KD.dx, KD.dy, KD.dw, G - KD.dy);
          const g = ctx.createLinearGradient(KD.dx, 0, KD.dx - 160, 0);
          g.addColorStop(0, `rgba(253,230,138,${0.35 * S.light})`); g.addColorStop(1, "rgba(253,230,138,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(KD.dx, KD.dy); ctx.lineTo(KD.dx - 170, G + 30); ctx.lineTo(KD.dx, G); ctx.closePath(); ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }
        const dh = (G - KD.dy) * (1 - S.door);
        if (dh > 1) {
          rr(ctx, KD.dx + 3, KD.dy, KD.dw - 6, dh, 4, "#8b5a2b");
          ctx.fillStyle = "rgba(0,0,0,0.2)"; for (let i = 1; i < 4; i++) ctx.fillRect(KD.dx + 3 + i * (KD.dw - 6) / 4, KD.dy, 2, dh);
        }
      },
      drawFront(w, ctx) {
        const S = w.S, sx = S.shk ? Math.sin(w.time * 70) * 3 * S.shk : 0;
        if (S.lock || S.ly) {
          ctx.save(); ctx.translate(KD.lx + sx, KD.ly + S.ly); ctx.rotate(S.lrot);
          ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, S.lock ? -14 : -22, 12, Math.PI, TAU); ctx.lineTo(12, S.lock ? -6 : -14); ctx.stroke();
          rr(ctx, -18, -14, 36, 30, 6, "#94a3b8"); ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(0, -1, 4, 0, TAU); ctx.fill(); ctx.fillRect(-1.5, 0, 3, 8);
          ctx.restore();
        }
        if (S.key) drawKey(ctx, S.kx, S.ky + Math.sin(S.bob) * 6, S.krot);
      },
      steps: [
        {
          id: "idle", name: { en: "Float + Glow", ko: "둥실 + 빛" }, param: "bob 6px · glow",
          cap: { en: "Make the key *float and glow*. It wants to be used.", ko: "열쇠가 *둥실둥실 빛나요*. 써 달라고." },
          update(w, dt) {
            const S = w.S; S.bob += dt * 4;
            if (S.key && Math.random() < 0.3) w.spawn({ type: "glow", x: S.kx + rand(-25, 25), y: S.ky + rand(-14, 14), vy: -30, size: 7, life: 0.5, color: "253,224,71" });
          },
        },
        {
          id: "fly", name: { en: "Arc Flight", ko: "포물선 비행" }, param: "350ms · arc 90px",
          cap: { en: "The key *flies* in an arc to the lock.", ko: "열쇠가 *포물선*을 그리며 자물쇠로 날아가요." },
          fly(w, S) {
            S.flyT = 0.35;
            w.tween(S, { kx: KD.lx - 30 }, 0.35, "inout");
            w.tween(S, { ky: KD.ky - 90 }, 0.17, "out", () => w.tween(S, { ky: KD.ly }, 0.18, "in"));
          },
        },
        {
          id: "turn", name: { en: "Key Turn", ko: "열쇠 돌리기" }, param: "90° · 200ms",
          cap: { en: "*Turn* the key. The lock rattles.", ko: "열쇠를 *딸깍 돌리면* 자물쇠가 덜컹." },
          turn(w, S) { S.turnT = 0.22; w.tween(S, { krot: Math.PI / 2 }, 0.2, "back"); S.shk = 1; },
        },
        {
          id: "shackle", name: { en: "Lock Pops Off", ko: "자물쇠 툭" }, param: "spin + fall",
          cap: { en: "The padlock *pops open* and drops.", ko: "자물쇠가 *툭 풀려서* 떨어져요." },
          unlock(w, S) {
            S.ly = 0.01; S.lrot = 0;
            w.tween(S, { ly: -14 }, 0.1, "out", () => w.tween(S, { ly: G - KD.ly - 14, lrot: 1.8 }, 0.35, "in", () => { S.ly = 0; }));
          },
        },
        {
          id: "door", name: { en: "Door Rises", ko: "문이 스르륵" }, param: "rise 400ms + dust",
          cap: { en: "The door *rises* with a puff of dust.", ko: "문이 먼지를 날리며 *스르륵* 올라가요." },
          unlock(w, S) {
            S.doorT = 1; S.door = 0;
            w.after(0.15, () => { w.tween(S, { door: 1 }, 0.4, "inout"); dust(w, KD.dx + 10, G, 4, -1); dust(w, KD.dx + KD.dw - 10, G, 4, 1); w.shake(0.12); });
          },
        },
        {
          id: "light", name: { en: "Light Spill", ko: "빛이 쏟아짐" }, param: "warm glow + beam",
          cap: { en: "Warm *light spills out*. Something good is inside.", ko: "따뜻한 *빛이 쏟아져요*. 안에 좋은 게 있을 것 같게." },
          unlock(w, S) { w.after(0.2, () => w.tween(S, { light: 1 }, 0.4, "out")); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish / click / creak",
          cap: { en: "*Swish*, a heavy *clack*, then a long *creak*.", ko: "*휙*, 묵직한 *철컥*, 길게 *끼이익*." },
          fly(w) { w.sfx.swish(); },
          turn(w) { w.sfx.clickDown(); w.after(0.12, () => w.sfx.thunk()); },
          unlock(w) { w.sfx.clickDown(); if (w.on("door")) w.after(0.15, () => w.sfx.creak()); },
        },
      ],
    },
  );
})();

"use strict";
/* strategy — RTS · 타워 디펜스 · 카드 게임 · 턴제 전술 · 보드 게임 이펙트 30편 */
(() => {
  /* ───────── 공용 도우미 (이 파일 안에서만) ───────── */
  const LIME = "198,244,50";
  const GREEN = ["#86efac", "#22c55e", "#15803d"], RED = ["#fca5a5", "#ef4444", "#b91c1c"], GRAY = ["#e2e8f0", "#94a3b8", "#64748b"];
  const ROCK = ["#78716c", "#57534e", "#44403c"];

  // 위에서 본 전장 바닥
  function field(ctx, tint = "74,222,128") {
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(14, 14, 512, 332);
    ctx.fillStyle = `rgba(${tint},0.05)`;
    [[120, 90, 70, 40], [400, 280, 90, 46], [300, 150, 50, 30], [80, 290, 60, 30], [470, 70, 50, 30]].forEach(([x, y, a, b]) => { ctx.beginPath(); ctx.ellipse(x, y, a, b, 0.3, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; ctx.strokeRect(14, 14, 512, 332);
  }
  // 마우스 커서
  function cursor(ctx, c) {
    if (c.hide) return;
    const s = 1 - (c.press || 0) * 0.25;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(s, s);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0b0c10"; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(7, 20); ctx.lineTo(12, 31); ctx.lineTo(17, 29); ctx.lineTo(12, 18); ctx.lineTo(21, 18); ctx.closePath();
    ctx.stroke(); ctx.fill(); ctx.restore();
  }
  function circle(ctx, x, y, r, fill, stroke, lw = 2) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  // 쿼터뷰 바닥 칸
  function isoTile(ctx, gx, gy, fill, stroke, lw = 1, inset = 0) {
    const a = isoPt(gx + inset, gy + inset), b = isoPt(gx + 1 - inset, gy + inset), c = isoPt(gx + 1 - inset, gy + 1 - inset), d = isoPt(gx + inset, gy + 1 - inset);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function isoGrid(ctx, n, m, fn) {
    for (let gy = 0; gy < m; gy++) for (let gx = 0; gx < n; gx++) {
      const f = fn ? fn(gx, gy) : null;
      isoTile(ctx, gx, gy, f || ((gx + gy) % 2 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)"), "rgba(255,255,255,0.08)");
    }
  }
  // 구운 그림을 바닥 중심(x, y)에 세워 그리기
  function drawSpr(ctx, key, x, y, wpx, o = {}) {
    const s = SPR[key], c = s[o.tint || "c"], h = wpx * c.height / c.width;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; ctx.translate(x, y); ctx.scale(o.sx || 1, o.sy || 1);
    ctx.drawImage(c, -wpx / 2, -h, wpx, h); ctx.restore();
    return h;
  }
  const part = (o, light, dark) => Object.assign(o, { light, dark });
  const roof = (s, y, top, c) => part(pyr([[-s, y, -s], [s, y, -s], [s, y, s], [-s, y, s]], [0, top, 0]), c[0], c[1]);
  const ISO_YAW = Math.PI / 4, ISO_PITCH = 0.52;
  function makeArt() {
    // 회관(2칸짜리 건물): 기단 + 벽 + 붉은 지붕
    polySprite("strategy-hall", () => [
      blk(0, 0, 0, 120, 8, 120),
      blk(0, 8, 0, 100, 52, 100),
      blk(30, 8, 51, 26, 34, 4),
      roof(56, 60, 112, [[248, 113, 113], [88, 24, 24]]),
    ], 200, 200, ISO_YAW, ISO_PITCH);
    // 타워 3단계
    const tower = (h, c, lv) => () => {
      const m = [blk(0, 0, 0, 60, 18, 60, 0.92), blk(0, 18, 0, 46, h, 46, 0.88), part(blk(0, 18 + h, 0, 58, 14, 58), c[0], c[1])];
      for (const [i, k] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) m.push(part(blk(i * 21, 32 + h, k * 21, 14, 12, 14), c[0], c[1]));
      if (lv > 1) m.push(blk(0, 32 + h, 0, 22, 26, 22, 0.8));
      if (lv > 2) m.push(part(pyr([[-14, 58 + h, -14], [14, 58 + h, -14], [14, 58 + h, 14], [-14, 58 + h, 14]], [0, 92 + h, 0]), [250, 204, 21], [110, 70, 10]));
      return m;
    };
    polySprite("strategy-tower1", tower(50, [[203, 213, 225], [60, 64, 80]], 1), 120, 200, ISO_YAW, ISO_PITCH);
    polySprite("strategy-tower2", tower(66, [[125, 211, 252], [20, 60, 110]], 2), 120, 220, ISO_YAW, ISO_PITCH);
    polySprite("strategy-tower3", tower(80, [[196, 181, 253], [60, 30, 120]], 3), 120, 260, ISO_YAW, ISO_PITCH);
    // 위에서 본 본진
    polySprite("strategy-hqTop", () => [blk(0, 0, 0, 120, 8, 120), blk(0, 8, 0, 100, 40, 100), roof(56, 48, 100, [[248, 113, 113], [88, 24, 24]])], 130, 130, 0, Math.PI / 2 - 0.001, [246, 244, 240], [70, 70, 80]);
    // 체스 같은 말 (흰 말 / 검은 말)
    const piece = () => [blk(0, 0, 0, 44, 10, 44), blk(0, 10, 0, 34, 8, 34, 0.8), blk(0, 18, 0, 20, 34, 20, 0.75), blk(0, 50, 0, 30, 10, 30, 0.9), blk(0, 60, 0, 24, 22, 24, 0.55)];
    polySprite("strategy-pieceW", piece, 90, 150, ISO_YAW, ISO_PITCH, [250, 248, 244], [80, 80, 92]);
    polySprite("strategy-pieceB", piece, 90, 150, ISO_YAW, ISO_PITCH, [120, 120, 140], [16, 16, 22]);
  }
  // 위에서 본 수정 광맥
  function crystals(ctx, x, y, s = 1) {
    const one = (dx, dy, r, h) => {
      ctx.fillStyle = "#0e7490"; ctx.beginPath(); ctx.moveTo(x + dx - r, y + dy); ctx.lineTo(x + dx, y + dy - h); ctx.lineTo(x + dx, y + dy + r * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.moveTo(x + dx + r, y + dy); ctx.lineTo(x + dx, y + dy - h); ctx.lineTo(x + dx, y + dy + r * 0.5); ctx.closePath(); ctx.fill();
    };
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, y + 6, 36, 12, 0, 0, TAU); ctx.fill();
    one(-18, 4, 10, 26); one(16, 6, 9, 22); one(0, 0, 13, 40);
    ctx.restore();
  }
  // 나무 아이콘
  function logs(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const [dx, dy] of [[-9, 6], [9, 6], [0, -8]]) {
      ctx.fillStyle = "#92400e"; ctx.beginPath(); ctx.roundRect(dx - 16, dy - 7, 32, 14, 7); ctx.fill();
      ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.ellipse(dx + 14, dy, 5, 7, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawIcon(ctx, kind, x, y, s) {
    if (kind === 1) { logs(ctx, x, y, s); return; }
    const c = SPR[kind === 0 ? "coin" : "gem"].c, w = 40 * s, h = w * c.height / c.width;
    ctx.drawImage(c, x - w / 2, y - h / 2, w, h);
  }
  function numText(ctx, t, x, y, size, color, align = "left") {
    ctx.font = `800 ${size}px Pretendard, "Apple SD Gothic Neo", sans-serif`; ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = "rgba(10,12,20,0.9)"; ctx.lineJoin = "round";
    ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y);
  }

  RECIPES.push(
    /* 1. 유닛 선택 고리 */
    {
      id: "strategy-select", cat: "strategy", view: "top", polished: true,
      title: { en: "Make unit selection *obvious*", ko: "유닛 선택을 *한눈에*" },
      intro: { en: "Which one did I *click?*", ko: "방금 *누구*를 고른 거죠?" },
      interval: 0.9, stepDur: 3.4,
      drawFloor(w, ctx) { field(ctx); },
      setup(w) {
        w.units = [[150, 120], [250, 230], [360, 130], [420, 250]].map(([x, y]) => w.actor("heroTop", { home: x, gy: y }));
        w.units.forEach((u, i) => { u.rot = i * 0.8; });
        w.S = { u: null, r: 1, spin: 0, bar: 0 };
        w.cur = { x: 270, y: 300, press: 0 };
        w.k = 0;
      },
      fire(w) {
        const u = w.units[w.k++ % w.units.length], S = w.S;
        w.tween(w.cur, { x: u.x + 12, y: u.gy + 14 }, 0.14, "out", () => {
          w.cur.press = 1; S.u = u; S.r = 1;
          w.emit("select", u, S);
        });
      },
      update(w, dt) { w.cur.press = Math.max(0, w.cur.press - dt * 6); },
      drawBack(w, ctx) {
        const S = w.S, u = S.u; if (!u) return;
        const x = u.x + u.ox, y = u.gy + u.oy, r = 36 * S.r;
        if (w.on("ring")) circle(ctx, x, y, r, "rgba(198,244,50,0.14)", "#c6f432", 4);
        else circle(ctx, x, y, r, null, "rgba(255,255,255,0.8)", 3);
        if (w.on("spin")) {
          ctx.setLineDash([12, 9]); ctx.lineDashOffset = -S.spin;
          circle(ctx, x, y, r + 10, null, "rgba(198,244,50,0.75)", 2.5);
          ctx.setLineDash([]);
        }
      },
      drawFront(w, ctx) {
        const S = w.S, u = S.u;
        if (u && S.bar > 0.01) {
          const bw = 56 * S.bar, x = u.x - bw / 2, y = u.gy - 52;
          ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, bw + 6, 12, 4); ctx.fill();
          for (let i = 0; i < 5; i++) { ctx.fillStyle = i < 4 ? "#4ade80" : "rgba(255,255,255,0.15)"; ctx.fillRect(x + i * bw / 5 + 1, y, bw / 5 - 2, 6); }
        }
        cursor(ctx, w.cur);
      },
      steps: [
        {
          id: "ring", name: { en: "Pop Ring", ko: "튀어나오는 고리" }, param: "1.5× → 1 · back",
          cap: { en: "A *bold ring* that pops in, then settles.", ko: "*굵은 고리*가 톡 커졌다 자리 잡아요." },
          select(w, u, S) { S.r = 1.5; w.tween(S, { r: 1 }, 0.3, "back"); },
        },
        {
          id: "hop", name: { en: "Unit Hop", ko: "유닛 들썩" }, param: "scale 1.35 + flash",
          cap: { en: "The unit *hops* and flashes: \"Yes, me!\"", ko: "유닛이 *톡* 뛰며 번쩍. \"저요!\"" },
          select(w, u) { u.sx = u.sy = 1.35; u.flash = 1; },
        },
        {
          id: "spin", name: { en: "Marching Dashes", ko: "도는 점선" }, param: "dash ring · 40px/s",
          cap: { en: "A slow *spinning* outer ring keeps it alive.", ko: "바깥 점선이 *천천히 돌아요*. 살아 있는 느낌." },
          update(w, dt) { w.S.spin += dt * 40; },
        },
        {
          id: "burst", name: { en: "Click Burst", ko: "클릭 파동" }, param: "ring 20 → 70",
          cap: { en: "A quick *wave* out from the unit.", ko: "유닛에서 *파동*이 확 퍼져요." },
          select(w, u) {
            w.spawn({ type: "ring", x: u.x, y: u.gy, size: 20, size1: 72, life: 0.3, w: 5, color: "255,255,255" });
            sparks(w, u.x, u.gy, 8, LIME, [160, 320]);
          },
        },
        {
          id: "bar", name: { en: "Health Pips", ko: "체력 칸" }, param: "slide in 200ms",
          cap: { en: "Show *health* only for what you picked.", ko: "고른 유닛만 *체력 칸*을 보여줘요." },
          select(w, u, S) { S.bar = 0; w.tween(S, { bar: 1 }, 0.2, "back"); },
        },
        {
          id: "sound", name: { en: "Ready Chirp", ko: "대답 소리" }, param: "click + 2-note chirp",
          cap: { en: "A click, then a tiny *\"ready!\"* chirp.", ko: "딸깍, 그리고 짧게 *\"준비 완료!\"*" },
          select(w) {
            w.sfx.clickDown();
            w.play(() => { tn({ type: "square", f: 660, dur: 0.06, vol: 0.1 }); tn({ type: "square", f: 990, dur: 0.07, vol: 0.1, delay: 0.07 }); });
          },
        },
      ],
    },

    /* 2. 이동 명령 표시 */
    {
      id: "strategy-move", cat: "strategy", view: "top", polished: true,
      title: { en: "Make move orders *readable*", ko: "이동 명령을 *또렷하게*" },
      intro: { en: "Clicked the ground. *Did they hear me?*", ko: "땅을 찍었는데… *알아들은 거야?*" },
      interval: 1.1, stepDur: 3.6,
      drawFloor(w, ctx) { field(ctx); },
      setup(w) {
        w.units = [0, 1, 2].map(i => w.actor("heroTop", { home: 150, gy: 140 + i * 45, h: 54 }));
        w.units.forEach(u => { u.tx = u.x; u.ty = u.gy; });
        w.lineA = 0; w.k = 0; w.cur = { x: 300, y: 300, press: 0 };
      },
      fire(w) {
        const d = { x: w.k++ % 2 ? 140 : 400, y: rand(120, 240) };
        w.units.forEach((u, i) => { u.tx = d.x + i * 6; u.ty = d.y + i * 5; });
        w.cur.x = d.x + 6; w.cur.y = d.y + 6; w.cur.press = 1;
        w.emit("order", d);
      },
      update(w, dt) {
        w.lineA = Math.max(0, w.lineA - dt * 1.2); w.cur.press = Math.max(0, w.cur.press - dt * 5);
        for (const u of w.units) {
          const dx = u.tx - u.x, dy = u.ty - u.gy, d = Math.hypot(dx, dy), s = Math.min(d, 280 * dt);
          u.moving = d > 1;
          if (u.moving) { u.x += dx / d * s; u.gy += dy / d * s; }
        }
      },
      drawBack(w, ctx) {
        if (w.lineA <= 0) return;
        ctx.setLineDash([6, 7]); ctx.lineDashOffset = -w.time * 40; ctx.lineWidth = 2.5;
        ctx.strokeStyle = `rgba(${LIME},${w.lineA * 0.8})`;
        for (const u of w.units) { ctx.beginPath(); ctx.moveTo(u.x, u.gy); ctx.lineTo(u.tx, u.ty); ctx.stroke(); }
        ctx.setLineDash([]);
      },
      drawFront(w, ctx) { cursor(ctx, w.cur); },
      steps: [
        {
          id: "marker", name: { en: "Ground Marker", ko: "바닥 표시" }, param: "ring 38 → 6",
          cap: { en: "Mark the spot. A ring that *shrinks into* it.", ko: "찍은 자리에 고리가 *쏙* 줄어들어요." },
          order(w, d) {
            w.spawn({ type: "ring", x: d.x, y: d.y, size: 60, size1: 8, life: 0.5, w: 7, color: LIME });
            w.spawn({ type: "ring", x: d.x, y: d.y, size: 36, size1: 4, life: 0.4, w: 4, color: "255,255,255" });
            w.spawn({ type: "ellipse", round: true, under: true, x: d.x, y: d.y, size: 34, life: 1.2, hold: true, color: LIME });
          },
        },
        {
          id: "line", name: { en: "Path Lines", ko: "이동 선" }, param: "dashed · fade 0.8s",
          cap: { en: "Draw a *dashed line* from each unit to the goal.", ko: "유닛마다 목적지까지 *점선*을 그어요." },
          order(w) { w.lineA = 1; },
        },
        {
          id: "form", name: { en: "Formation", ko: "대형 유지" }, param: "triangle · 42px",
          cap: { en: "Don't pile up. Arrive in *formation*.", ko: "한 점에 뭉치지 말고 *대형*으로 도착." },
          order(w, d) {
            const F = [[18, 0], [-22, -36], [-22, 36]];
            w.units.forEach((u, i) => { u.tx = d.x + F[i][0]; u.ty = d.y + F[i][1]; });
          },
        },
        {
          id: "face", name: { en: "Turn to Face", ko: "방향 돌리기" }, param: "rot lerp ×10",
          cap: { en: "Units *turn* toward where they're going.", ko: "가는 쪽으로 *몸을 돌려요*." },
          update(w, dt) {
            for (const u of w.units) if (u.moving) {
              const a = Math.atan2(u.ty - u.gy, u.tx - u.x), da = Math.atan2(Math.sin(a - u.rot), Math.cos(a - u.rot));
              u.rot += da * Math.min(1, dt * 10);
            }
          },
        },
        {
          id: "dust", name: { en: "Start Dust", ko: "출발 먼지" }, param: "4 puffs / unit",
          cap: { en: "A puff of *dust* as they set off.", ko: "출발할 때 *먼지*가 폴폴." },
          order(w) {
            for (const u of w.units) for (let i = 0; i < 4; i++) w.spawn({ type: "smoke", x: u.x + rand(-10, 10), y: u.gy + rand(-10, 10), vx: rand(-60, 60), vy: rand(-60, 60), floor: 3, size: 4, size1: 12, life: 0.45, color: "150,140,120", add: false });
          },
        },
        {
          id: "sound", name: { en: "Roger Chirp", ko: "알겠다는 소리" }, param: "click + falling chirp",
          cap: { en: "Click, then a short *\"roger\"*.", ko: "딸깍, 그리고 짧게 *\"알겠다!\"*" },
          order(w) {
            w.sfx.clickUp();
            w.play(() => { tn({ type: "square", f: 880, f2: 660, dur: 0.08, vol: 0.1 }); tn({ type: "square", f: 660, dur: 0.06, vol: 0.08, delay: 0.09 }); });
          },
        },
      ],
    },

    /* 3. 공격 명령 */
    {
      id: "strategy-attack", cat: "strategy", view: "top", polished: true,
      title: { en: "Make attack orders *aggressive*", ko: "공격 명령을 *공격적으로*" },
      intro: { en: "Attack! …it looks like a *move*.", ko: "공격! …근데 *이동*처럼 보여요." },
      interval: 0.9, stepDur: 3.5,
      drawFloor(w, ctx) { field(ctx, "248,113,113"); },
      setup(w) {
        w.units = [100, 180, 260].map((y, i) => w.actor("heroTop", { home: 100 + (i % 2) * 34, gy: y, h: 54 }));
        w.foe = w.actor("foeTop", { home: 410, gy: 180, h: 92, hp: 120 });
        w.units.forEach(u => { u.rot = Math.atan2(180 - u.gy, 410 - u.x); });
        w.mark = 0; w.lineA = 0; w.cur = { x: 440, y: 210, press: 0 };
      },
      fire(w) {
        const f = w.foe; if (!f.alive) return;
        w.cur.press = 1;
        w.emit("order", f);
        w.units.forEach((u, i) => w.after(0.1 + i * 0.07, () => {
          if (!f.alive) return;
          const a = Math.atan2(f.gy - u.gy, f.x - u.x); u.rot = a;
          const b = { x: u.x + Math.cos(a) * 26, y: u.gy + Math.sin(a) * 26, vx: Math.cos(a) * 800, vy: Math.sin(a) * 800, r: 5, color: "#e2e8f0" };
          b.test = p => f.alive && Math.hypot(p.x - f.x, p.y - f.gy) < 36;
          b.onHit = p => { f.hp -= 10; f.ox += Math.sign(p.vx) * 4; w.emit("hit", p, f); if (f.hp <= 0) w.kill(f); };
          w.emit("shot", b, u);
          w.shoot(b);
        }));
      },
      update(w, dt) { w.mark = Math.max(0, w.mark - dt * 0.7); w.lineA = Math.max(0, w.lineA - dt * 2); w.cur.press = Math.max(0, w.cur.press - dt * 5); },
      drawBack(w, ctx) {
        if (w.lineA <= 0) return;
        ctx.strokeStyle = `rgba(248,113,113,${w.lineA * 0.85})`; ctx.lineWidth = 2.5;
        for (const u of w.units) { ctx.beginPath(); ctx.moveTo(u.x, u.gy); ctx.lineTo(w.foe.x, w.foe.gy); ctx.stroke(); }
      },
      drawFront(w, ctx) {
        const f = w.foe;
        if (w.mark > 0 && f.alive) {
          const s = 58 + Math.max(0, w.mark - 0.75) * 120, a = w.time * 2;
          ctx.save(); ctx.translate(f.x + f.ox, f.gy + f.oy); ctx.rotate(a);
          ctx.strokeStyle = `rgba(248,113,113,${Math.min(1, w.mark * 2)})`; ctx.lineWidth = 5; ctx.lineCap = "round";
          for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(s, s - 18); ctx.lineTo(s, s); ctx.lineTo(s - 18, s); ctx.stroke(); }
          ctx.restore();
        }
        cursor(ctx, w.cur);
      },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "mark", name: { en: "Target Brackets", ko: "표적 괄호" }, param: "red · snap in",
          cap: { en: "Lock *red brackets* on the target.", ko: "표적에 *빨간 괄호*를 철컥." },
          order(w) { w.mark = 1; },
        },
        {
          id: "lines", name: { en: "Attack Lines", ko: "공격 선" }, param: "red · 0.5s",
          cap: { en: "Red lines say *who* attacks *whom*.", ko: "빨간 선이 *누가 누구를* 치는지 알려줘요." },
          order(w) { w.lineA = 1; },
        },
        {
          id: "tracer", name: { en: "Tracers", ko: "총알 꼬리" }, param: "len 30px",
          cap: { en: "Give every shot a *tail*.", ko: "총알마다 *꼬리*를 달아요." },
          shot(w, b) { b.len = 30; b.lw = 3; },
        },
        {
          id: "recoil", name: { en: "Muzzle + Recoil", ko: "총구 불꽃 + 반동" }, param: "8px back",
          cap: { en: "Each shooter *flashes* and *kicks back*.", ko: "쏘는 유닛이 *번쩍*, *뒤로 톡*." },
          shot(w, b, u) {
            u.ox -= Math.cos(u.rot) * 8; u.oy -= Math.sin(u.rot) * 8;
            w.spawn({ type: "glow", x: b.x, y: b.y, size: 26, size1: 6, life: 0.08, color: "255,210,120" });
          },
        },
        {
          id: "hit", name: { en: "Hit Flash", ko: "맞는 반응" }, param: "flash + 6 sparks",
          cap: { en: "The target *flashes* and gets *shoved*.", ko: "표적이 *번쩍*하고 *밀려요*." },
          hit(w, p, f) {
            f.flash = 1; f.ox += Math.sign(p.vx) * 7; f.oy += p.vy / 950 * 7;
            sparks(w, p.x, p.y, 12, "255,220,160", [160, 440]);
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 36, size1: 8, life: 0.25, color: "255,200,120" });
          },
        },
        {
          id: "shake", name: { en: "Tiny Shake", ko: "작은 흔들림" }, param: "trauma .06",
          cap: { en: "A *tiny* shake per hit. RTS needs subtle.", ko: "맞을 때마다 *살짝*. 전략 게임은 은은하게." },
          hit(w) { w.shake(0.06); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "shot / tick",
          cap: { en: "Short *pops* for shots, *ticks* on hits.", ko: "쏠 때 *탁*, 맞을 때 *틱*." },
          order(w) { w.play(() => tn({ type: "square", f: 300, f2: 200, dur: 0.08, vol: 0.1 })); },
          shot(w) { w.sfx.smg(rand(0.9, 1.1)); },
          hit(w) { w.sfx.tick(); },
        },
      ],
    },

    /* 4. 건물 배치 미리보기 */
    {
      id: "strategy-place", cat: "strategy", view: "iso", polished: true,
      title: { en: "Show *where* you can build", ko: "*지을 수 있는 곳*을 보여주기" },
      intro: { en: "Can I build here? *No idea.*", ko: "여기 지어도 돼요? *모르겠어요.*" },
      interval: 0.8, stepDur: 3.6,
      drawFloor(w, ctx) {
        const g = w.Gh;
        isoGrid(ctx, 6, 6, (x, y) => (g.foot && x === g.gx && y === g.gy ? `rgba(${g.foot},0.45)` : null));
        if (g.foot) isoTile(ctx, g.gx, g.gy, null, `rgba(${g.foot},0.95)`, 2.5);
      },
      setup(w) {
        w.rocks = [[2, 2], [4, 3], [1, 4]];
        w.path = [[1, 1], [2, 1], [2, 2], [3, 2], [4, 3], [4, 4], [1, 4], [3, 4]];
        w.Gh = { gx: 1, gy: 1, x: 1, y: 1, sx: 1, sy: 1, shk: 0, a: 0.55, col: GRAY, foot: null, ok: true };
        w.k = 0;
      },
      fire(w) {
        const g = w.Gh, [gx, gy] = w.path[w.k++ % w.path.length];
        g.gx = gx; g.gy = gy; g.ok = !w.rocks.some(r => r[0] === gx && r[1] === gy);
        g.col = GRAY; g.foot = null;
        if (!w.on("snap")) { g.x = gx; g.y = gy; }
        w.emit("move", g);
        if (!g.ok) w.emit("deny", g);
      },
      update(w, dt) {
        const g = w.Gh, k = Math.min(1, dt * 12);
        g.sx += (1 - g.sx) * k; g.sy += (1 - g.sy) * k; g.shk = Math.max(0, g.shk - dt * 2.5);
      },
      drawFront(w, ctx) {
        for (const [x, y] of w.rocks) drawCube(ctx, x, y, 26, ROCK, 0.8, 1);
        const g = w.Gh, sh = Math.sin(w.time * 70) * g.shk * 0.12;
        ctx.save(); ctx.globalAlpha = g.a;
        drawCube(ctx, g.x + sh, g.y - sh, 58, g.col, g.sx, g.sy);
        ctx.restore();
      },
      steps: [
        {
          id: "tint", name: { en: "Green / Red", ko: "초록 / 빨강" }, param: "valid ↔ invalid",
          cap: { en: "*Green* means yes. *Red* means no.", ko: "*초록*이면 돼요. *빨강*이면 안 돼요." },
          move(w, g) { g.col = g.ok ? GREEN : RED; },
        },
        {
          id: "foot", name: { en: "Footprint", ko: "바닥 칸 표시" }, param: "tile fill + outline",
          cap: { en: "Light up the *tile underneath*, too.", ko: "*발밑 칸*도 같은 색으로 칠해요." },
          move(w, g) { g.foot = g.ok ? "74,222,128" : "248,113,113"; },
        },
        {
          id: "snap", name: { en: "Snap Slide", ko: "칸에 착 붙기" }, param: "140ms · back",
          cap: { en: "Slide and *snap* into each cell.", ko: "칸마다 미끄러져 *착* 붙어요." },
          move(w, g) { w.tween(g, { x: g.gx, y: g.gy }, 0.14, "back"); g.sx = 1.12; g.sy = 0.8; },
        },
        {
          id: "deny", name: { en: "Shake \"No\"", ko: "도리도리" }, param: "shake 0.4s + ✕",
          cap: { en: "Blocked? The ghost *shakes its head*.", ko: "막혔으면 건물이 *도리도리*." },
          deny(w, g) {
            g.shk = 1;
            const p = isoPt(g.gx + 0.5, g.gy + 0.5, 90);
            w.spawn({ type: "text", text: "✕", x: p.x, y: p.y, vy: -40, life: 0.6, size: 34, color: "#f87171" });
          },
        },
        {
          id: "breathe", name: { en: "Breathing Ghost", ko: "숨 쉬는 유령" }, param: "alpha .35–.75",
          cap: { en: "Pulse the *transparency*. It's a preview, not real.", ko: "*투명도*가 숨 쉬어요. 아직 진짜가 아니니까." },
          update(w) { w.Gh.a = 0.55 + 0.2 * Math.sin(w.time * 7); },
        },
        {
          id: "sound", name: { en: "Tick / Buzz", ko: "틱 / 부-" }, param: "tick · low buzz",
          cap: { en: "*Tick* on every cell. A low *buzz* when blocked.", ko: "칸마다 *틱*, 막히면 낮게 *부-*." },
          move(w) { w.sfx.tick(); },
          deny(w) { w.play(() => tn({ type: "square", f: 130, dur: 0.16, vol: 0.12 })); },
        },
      ],
    },

    /* 5. 건설 진행 */
    {
      id: "strategy-construct", cat: "strategy", view: "iso", polished: true,
      title: { en: "Make construction *visible*", ko: "건설 중인 걸 *눈에 보이게*" },
      intro: { en: "Building… *where?*", ko: "짓는 중이래요… *어디서요?*" },
      interval: 3.0, stepDur: 4.0,
      drawFloor(w, ctx) {
        isoGrid(ctx, 6, 6, (x, y) => (x >= 2 && x <= 3 && y >= 2 && y <= 3 ? "rgba(161,98,7,0.35)" : null));
      },
      setup(w) { makeArt(); w.B = { p: 0, on: false, done: false, frame: false, rise: false, bar: false, sx: 1, sy: 1, hitT: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const B = w.B; Object.assign(B, { p: 0, on: true, done: false, frame: false, rise: false, bar: false });
        w.emit("start", B);
        w.tween(B, { p: 1 }, 2.2, "lin", () => { B.on = false; B.done = true; w.busy = false; });
      },
      update(w, dt) {
        const B = w.B, k = Math.min(1, dt * 12);
        B.sx += (1 - B.sx) * k; B.sy += (1 - B.sy) * k;
      },
      drawFront(w, ctx) { drawHall(ctx, w, w.B); },
      steps: [
        {
          id: "frame", name: { en: "Scaffold", ko: "비계" }, param: "ghost + poles",
          cap: { en: "Show the *final shape* first, as a scaffold.", ko: "완성될 모양을 *비계*로 먼저 보여줘요." },
          start(w, B) { B.frame = true; },
        },
        {
          id: "rise", name: { en: "Rise From Ground", ko: "아래부터 쌓기" }, param: "clip by progress",
          cap: { en: "Build it *bottom-up*, matching the progress.", ko: "진행만큼 *아래부터* 쌓아 올려요." },
          start(w, B) { B.rise = true; },
        },
        {
          id: "bar", name: { en: "Chunky Bar", ko: "칸 나뉜 막대" }, param: "10 segments",
          cap: { en: "A *chunky bar* reads faster than a number.", ko: "숫자보다 *칸 막대*가 빨리 읽혀요." },
          start(w, B) { B.bar = true; },
        },
        {
          id: "work", name: { en: "Work Sparks", ko: "작업 불꽃" }, param: "hit every 0.28s",
          cap: { en: "*Sparks and dust* from someone working.", ko: "누가 일하는 듯 *불꽃과 먼지*." },
          update(w, dt) {
            const B = w.B; if (!B.on) return;
            B.hitT -= dt; if (B.hitT > 0) return;
            B.hitT = 0.28;
            const p = isoPt(rand(2.2, 3.8), rand(2.2, 3.8), rand(10, 70) * Math.max(0.2, B.p));
            sparks(w, p.x, p.y, 5, "255,210,120", [80, 220], -Math.PI, 0);
            w.spawn({ type: "smoke", x: p.x, y: p.y + 10, vx: rand(-30, 30), vy: -30, size: 5, size1: 16, life: 0.6, color: "210,200,180" });
            w.emit("hammer", B);
          },
        },
        {
          id: "bump", name: { en: "Build Bumps", ko: "쌓을 때 들썩" }, param: "sy 1.05 / hit",
          cap: { en: "Every hit *bumps* the building a little.", ko: "칠 때마다 건물이 *살짝 들썩*." },
          hammer(w, B) { B.sy = 1.06; B.sx = 0.97; },
        },
        {
          id: "sound", name: { en: "Hammering", ko: "망치질" }, param: "tock · pitch ±",
          cap: { en: "*Tock, tock.* Vary the pitch so it doesn't drone.", ko: "*똑, 똑.* 음을 조금씩 바꿔야 안 지루해요." },
          hammer(w) { w.play(() => tn({ f: rand(300, 380), f2: 170, dur: 0.06, vol: 0.3 })); },
        },
      ],
    },

    /* 6. 건설 완료 */
    {
      id: "strategy-complete", cat: "strategy", view: "iso", polished: true,
      title: { en: "Celebrate a *finished* building", ko: "건물 완성을 *축하하기*" },
      intro: { en: "Done. Scaffold gone. *That's it?*", ko: "다 지었대요. *끝이에요?*" },
      interval: 1.8, stepDur: 3.8,
      drawFloor(w, ctx) { isoGrid(ctx, 6, 6, (x, y) => (x >= 2 && x <= 3 && y >= 2 && y <= 3 ? "rgba(161,98,7,0.35)" : null)); },
      setup(w) { makeArt(); w.B = { p: 0.82, on: true, done: false, frame: true, rise: true, bar: true, sx: 1, sy: 1, flash: 0 }; },
      fire(w) {
        const B = w.B;
        Object.assign(B, { p: 0.82, on: true, done: false });
        w.tween(B, { p: 1 }, 0.22, "lin", () => { B.on = false; B.done = true; w.emit("done", B); });
      },
      update(w, dt) {
        const B = w.B, k = Math.min(1, dt * 9);
        B.sx += (1 - B.sx) * k; B.sy += (1 - B.sy) * k; B.flash = Math.max(0, B.flash - dt * 3);
      },
      drawFront(w, ctx) { drawHall(ctx, w, w.B); },
      steps: [
        {
          id: "pop", name: { en: "Stretch Pop", ko: "쭉 늘었다 착" }, param: "sy 1.25 → 1",
          cap: { en: "It *stretches up*, then lands with weight.", ko: "위로 *쭉* 늘었다가 *착* 내려앉아요." },
          done(w, B) { B.sy = 1.25; B.sx = 0.88; },
        },
        {
          id: "flash", name: { en: "White Flash", ko: "하얀 번쩍임" }, param: "overlay 0.3s",
          cap: { en: "Flash the whole building *white*.", ko: "건물 전체가 *하얗게* 번쩍." },
          done(w, B) { B.flash = 0.75; },
        },
        {
          id: "dust", name: { en: "Dust Ring", ko: "먼지 고리" }, param: "16 puffs",
          cap: { en: "Scaffold dust *blows out* all around.", ko: "비계 먼지가 사방으로 *훅*." },
          done(w) {
            const c = isoPt(3, 3);
            for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; w.spawn({ type: "smoke", x: c.x + Math.cos(a) * 70, y: c.y + Math.sin(a) * 36, vx: Math.cos(a) * 120, vy: Math.sin(a) * 60 - 20, drag: 3, size: 8, size1: 22, life: 0.8, color: "215,205,185" }); }
          },
        },
        {
          id: "rays", name: { en: "Light Rays", ko: "빛줄기" }, param: "rays + glow 1s",
          cap: { en: "*Light* bursts from behind it.", ko: "건물 뒤에서 *빛*이 터져요." },
          done(w) {
            const c = isoPt(3, 3, 70);
            w.spawn({ type: "rays", under: true, x: c.x, y: c.y, size: 170, n: 12, vr: 0.8, life: 1.2, color: "253,224,71" });
            w.spawn({ type: "glow", x: c.x, y: c.y, size: 120, size1: 60, life: 0.6, color: "253,224,71" });
          },
        },
        {
          id: "banner", name: { en: "Banner + Stars", ko: "글자 + 별" }, param: "COMPLETE · 8 stars",
          cap: { en: "Say it: *COMPLETE!* Toss a few stars.", ko: "*완성!*이라고 말해줘요. 별도 몇 개." },
          done(w) {
            const c = isoPt(3, 3, 150);
            w.spawn({ type: "text", text: "COMPLETE!", x: c.x, y: c.y, vy: -20, life: 1.3, size: 30, color: "#c6f432" });
            for (let i = 0; i < 8; i++) w.spawn({ type: "star", x: c.x + rand(-90, 90), y: c.y + rand(20, 110), vy: rand(-80, -20), size: rand(8, 15), life: rand(0.5, 0.9), color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Fanfare", ko: "팡파르" }, param: "thud + fanfare",
          cap: { en: "A *thud*, then a short *fanfare*.", ko: "*쿵*, 그리고 짧은 *빰빠밤*." },
          done(w) { w.sfx.tock(); if (w.on("banner")) w.after(0.08, () => w.sfx.fanfare()); else if (w.on("rays")) w.sfx.lightSwell(); },
        },
      ],
    },

    /* 7. 자원 채집 왕복 */
    {
      id: "strategy-gather", cat: "strategy", view: "top", polished: true,
      title: { en: "Make gathering *feel like work*", ko: "자원 채집을 *일하는 것처럼*" },
      intro: { en: "Walk there, walk back. *Got anything?*", ko: "갔다가 왔어요. *뭘 가져온 거죠?*" },
      interval: 0.9, stepDur: 3.8,
      drawFloor(w, ctx) { field(ctx); },
      setup(w) {
        makeArt();
        w.hq = { x: 110, y: 185, s: 1 };
        w.fields = [{ x: 420, y: 110 }, { x: 440, y: 255 }];
        w.workers = [150, 225].map(y => { const u = w.actor("heroTop", { home: 175, gy: y, h: 44 }); u.st = "idle"; u.hy = y; return u; });
        w.res = 120; w.bump = 0; w.k = 0;
      },
      fire(w) {
        const u = w.workers.find(q => q.st === "idle"); if (!u) return;
        const m = w.fields[w.k++ % 2], a = Math.atan2(m.y - u.gy, m.x - 40 - u.x);
        u.st = "go"; u.rot = a;
        w.tween(u, { x: m.x - 42, gy: m.y + 4 }, 0.5, "inout", () => {
          u.st = "mine";
          for (let i = 0; i < 3; i++) w.after(i * 0.15, () => w.emit("mine", u, m));
          w.after(0.45, () => {
            u.st = "back"; u.rot = a + Math.PI;
            w.emit("load", u);
            w.tween(u, { x: u.home, gy: u.hy }, 0.5, "inout", () => {
              u.st = "idle"; u.cargo = false; w.res += 5;
              w.emit("deliver", u);
            });
          });
        });
      },
      update(w, dt) { w.bump = Math.max(0, w.bump - dt * 5); w.hq.s += (1 - w.hq.s) * Math.min(1, dt * 10); },
      drawBack(w, ctx) {
        const h = w.hq, c = SPR["strategy-hqTop"].c, s = 120 * h.s;
        ctx.drawImage(c, h.x - s / 2, h.y - s / 2, s, s);
        for (const m of w.fields) crystals(ctx, m.x, m.y, 1.2);
      },
      drawFront(w, ctx) {
        for (const u of w.workers) if (u.cargo) crystals(ctx, u.x + u.ox, u.gy + u.oy - 22, 0.45);
      },
      drawHud(w, ctx) {
        const s = 1 + w.bump * 0.35;
        ctx.save(); ctx.translate(250, 24); ctx.scale(s, s);
        drawIcon(ctx, 2, -12, 0, 0.55); numText(ctx, String(w.res), 6, 1, 22, w.bump > 0.3 ? "#67e8f9" : "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "carry", name: { en: "Visible Cargo", ko: "들고 오는 게 보임" }, param: "chunk on head",
          cap: { en: "Show the *cargo* on the way back.", ko: "돌아올 때 *들고 있는 걸* 보여줘요." },
          load(w, u) { u.cargo = true; },
        },
        {
          id: "chips", name: { en: "Mining Chips", ko: "캐는 파편" }, param: "6 sparks / swing",
          cap: { en: "Each swing *chips* bright shards off.", ko: "캘 때마다 *반짝이는 조각*이 튀어요." },
          mine(w, u, m) {
            sparks(w, m.x - 14, m.y - 10, 10, "103,232,249", [140, 360]);
            w.spawn({ type: "star", x: m.x - 12, y: m.y - 12, size: 20, life: 0.15, color: "255,255,255" });
            u.ox += 6;
          },
        },
        {
          id: "bob", name: { en: "Walk Bob", ko: "걸음 들썩" }, param: "scale ±10% · 9Hz",
          cap: { en: "A little *bob* while walking. They're working!", ko: "걸을 때 *들썩들썩*. 일하는 중이에요!" },
          update(w) { for (const u of w.workers) if (u.st === "go" || u.st === "back") u.sx = u.sy = 1 + Math.abs(Math.sin(w.time * 18)) * 0.12; },
        },
        {
          id: "plus", name: { en: "+5 Pop", ko: "+5 표시" }, param: "float 0.7s",
          cap: { en: "Drop-off pops a *+5* right there.", ko: "내려놓는 자리에서 *+5*가 톡." },
          deliver(w, u) { w.spawn({ type: "text", text: "+5", x: u.x - 20, y: u.gy - 30, vy: -70, life: 0.7, size: 24, color: "#67e8f9" }); },
        },
        {
          id: "bump", name: { en: "Base + Counter Bump", ko: "본진 · 숫자 톡" }, param: "scale 1.1 / 1.35",
          cap: { en: "The base and the counter both *bump*.", ko: "본진도, 숫자도 *톡* 튀어요." },
          deliver(w) { w.bump = 1; w.hq.s = 1.1; },
        },
        {
          id: "sound", name: { en: "Clink / Blip", ko: "깡 / 띵" }, param: "clink · blip",
          cap: { en: "*Clink* on each swing, *blip* on drop-off.", ko: "캘 때 *깡*, 내려놓을 때 *띵*." },
          mine(w) { w.play(() => tn({ type: "triangle", f: rand(1700, 2000), dur: 0.05, vol: 0.12 })); },
          deliver(w) { w.sfx.blip(6); },
        },
      ],
    },

    /* 8. 자원 숫자 */
    {
      id: "strategy-resource", cat: "strategy", view: "ui",
      title: { en: "Make resource numbers *tick*", ko: "자원 숫자를 *살아 있게*" },
      intro: { en: "The number changed. *Up or down?*", ko: "숫자가 바뀌었는데… *늘었어요, 줄었어요?*" },
      interval: 1.1, stepDur: 3.6,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.beginPath(); ctx.roundRect(110, 70, 320, 230, 16); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5; ctx.stroke();
      },
      setup(w) {
        w.Rs = [0, 1, 2].map(i => ({ i, v: [1240, 380, 95][i], shown: [1240, 380, 95][i], y: 115 + i * 70, bump: 0, colT: 0, col: "#fff" }));
        w.k = 0;
      },
      fire(w) {
        const plan = [[[0, 120], [1, 40]], [[2, 25]], [[0, -300], [1, -60]]][w.k++ % 3];
        plan.forEach(([i, d], n) => w.after(n * 0.12, () => { const r = w.Rs[i]; r.v += d; w.emit("change", r, d); }));
      },
      update(w, dt) {
        for (const r of w.Rs) { r.bump = Math.max(0, r.bump - dt * 5); r.colT = Math.max(0, r.colT - dt); if (!w.on("roll")) r.shown = r.v; }
      },
      drawFront(w, ctx) {
        for (const r of w.Rs) {
          const s = 1 + r.bump * 0.3;
          ctx.save(); ctx.translate(165, r.y); ctx.scale(s, s); drawIcon(ctx, r.i, 0, 0, 1.05); ctx.restore();
          ctx.save(); ctx.translate(205, r.y); ctx.scale(s, s);
          numText(ctx, String(Math.round(r.shown)), 0, 2, 44, r.colT > 0 ? r.col : "#fff");
          ctx.restore();
        }
      },
      steps: [
        {
          id: "roll", name: { en: "Rolling Count", ko: "굴러가는 숫자" }, param: "lerp ×7",
          cap: { en: "Count *up or down*. Never just jump.", ko: "숫자가 *굴러가게*. 툭 바뀌면 못 봐요." },
          update(w, dt) { for (const r of w.Rs) r.shown += (r.v - r.shown) * Math.min(1, dt * 7); },
        },
        {
          id: "bump", name: { en: "Row Bump", ko: "줄 통째로 톡" }, param: "scale 1.3",
          cap: { en: "The changed row *bumps*. Eyes go there.", ko: "바뀐 줄이 *톡*. 눈이 그리로 가요." },
          change(w, r) { r.bump = 1; },
        },
        {
          id: "color", name: { en: "Green Up, Red Down", ko: "늘면 초록, 줄면 빨강" }, param: "tint 1s",
          cap: { en: "*Green* when it grows, *red* when it drops.", ko: "늘면 *초록*, 줄면 *빨강*." },
          change(w, r, d) { r.col = d > 0 ? "#4ade80" : "#f87171"; r.colT = 1; },
        },
        {
          id: "delta", name: { en: "Delta Popup", ko: "변화량 표시" }, param: "+120 / −300",
          cap: { en: "Show *how much*: +120, −300.", ko: "*얼마나* 바뀌었는지: +120, −300." },
          change(w, r, d) { w.spawn({ type: "text", text: (d > 0 ? "+" : "−") + Math.abs(d), x: 385, y: r.y, vy: d > 0 ? -50 : 50, life: 0.9, size: 26, color: d > 0 ? "#4ade80" : "#f87171" }); },
        },
        {
          id: "fly", name: { en: "Flying Coins", ko: "날아드는 자원" }, param: "6 in · 6 out",
          cap: { en: "Income *flies in*. Spending *spills out*.", ko: "들어오면 *날아들고*, 쓰면 *쏟아져요*." },
          change(w, r, d) {
            const col = ["250,204,21", "251,146,60", "103,232,249"][r.i];
            for (let i = 0; i < 6; i++) {
              if (d > 0) w.spawn({ type: "glow", seek: true, x: rand(440, 520), y: r.y + rand(-60, 60), tx: 165, ty: r.y, life: 0.35 + i * 0.04, size: 10, color: col });
              else w.spawn({ type: "glow", x: 165, y: r.y, vx: rand(-120, 120), vy: rand(-200, -60), g: 900, life: 0.6, size: 10, size1: 4, color: col });
            }
          },
        },
        {
          id: "sound", name: { en: "Tick Run", ko: "또르륵" }, param: "5 ticks + tone",
          cap: { en: "A quick *tick-tick-tick* while it rolls.", ko: "굴러갈 때 *또르르륵*." },
          change(w, r, d) {
            for (let i = 0; i < 5; i++) w.after(i * 0.045, () => w.sfx.tick());
            if (d > 0) w.sfx.blip(8); else w.play(() => tn({ type: "triangle", f: 500, f2: 250, dur: 0.15, vol: 0.15 }));
          },
        },
      ],
    },
  );

  /* ───────── 타워 디펜스 · 카드용 도우미 ───────── */
  const TD_PATH = [[1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3], [3, 4], [4, 4], [5, 4]];
  const onPath = (x, y) => TD_PATH.some(p => p[0] === x && p[1] === y);
  function tdFloor(ctx, pads) {
    isoGrid(ctx, 6, 6, (x, y) => (onPath(x, y) ? "rgba(180,140,90,0.32)" : null));
    for (const [x, y] of pads) isoTile(ctx, x, y, "rgba(148,163,184,0.18)", "rgba(203,213,225,0.45)", 1.5, 0.12);
  }
  // 타워를 칸 중심에 세우기 (z = 공중 높이)
  function drawTower(ctx, t, key) {
    const p = isoPt(t.gx + 0.5, t.gy + 0.5);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.max(0.2, 1 - t.z / 200)})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, 26, 13, 0, 0, TAU); ctx.fill();
    const o = { sx: t.sx, sy: t.sy, alpha: t.a == null ? 1 : t.a };
    drawSpr(ctx, key, p.x, p.y + 15 - t.z, 62, o);
    if (t.flash > 0) drawSpr(ctx, key, p.x, p.y + 15 - t.z, 62, { sx: t.sx, sy: t.sy, alpha: Math.min(1, t.flash), tint: "white" });
  }
  // 위에서 본 경로: 점 목록, 거리로 위치 찾기
  function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function pathAt(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0);
      if (d <= l || i === pts.length - 1) { const k = Math.max(0, Math.min(1, d / l)); return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, a: Math.atan2(y1 - y0, x1 - x0) }; }
      d -= l;
    }
    return { x: pts[0][0], y: pts[0][1], a: 0 };
  }
  function strokePath(ctx, pts, upto) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    let d = upto;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0);
      if (d >= l) { ctx.lineTo(x1, y1); d -= l; } else { const k = d / l; ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); break; }
    }
    ctx.stroke();
  }
  const ROAD = [[530, 80], [420, 80], [420, 260], [250, 260], [250, 120], [70, 120]];
  function road(ctx) {
    ctx.strokeStyle = "rgba(180,140,90,0.22)"; ctx.lineWidth = 44; ctx.lineJoin = "round"; ctx.lineCap = "round"; strokePath(ctx, ROAD, 9999);
    ctx.strokeStyle = "rgba(180,140,90,0.12)"; ctx.lineWidth = 56; strokePath(ctx, ROAD, 9999);
  }
  // 본진(수정 핵)
  function core(ctx, x, y, s, tint) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    circle(ctx, 0, 0, 38, "rgba(56,189,248,0.12)", "rgba(125,211,252,0.6)", 3);
    ctx.restore();
    crystals(ctx, x, y + 10, s * 1.3);
    if (tint > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y - 6, 60 * s, "248,60,60", tint); ctx.globalCompositeOperation = "source-over"; }
  }
  const ART = ["248,113,113", "96,165,250", "74,222,128", "250,204,21", "192,132,252"];
  const CW = 84, CH = 118;
  // 카드 한 장: x,y 중심, rot, s, flip(0 뒷면 → 1 앞면), art, cost, atk, hp, glow, sh(그림자), flash, alpha
  function drawCard(ctx, c) {
    const f = c.flip == null ? 1 : c.flip, fx = Math.max(0.02, Math.abs(Math.cos(f * Math.PI))), face = f > 0.5;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot || 0); ctx.scale((c.s || 1) * fx, c.s || 1);
    ctx.globalAlpha = c.alpha == null ? 1 : c.alpha;
    if (c.sh > 0) { ctx.fillStyle = `rgba(0,0,0,${0.45 * c.sh})`; ctx.beginPath(); ctx.roundRect(-CW / 2 + 8 * c.sh, -CH / 2 + 22 * c.sh, CW, CH, 9); ctx.fill(); }
    if (c.glow > 0) { ctx.save(); ctx.shadowColor = `rgba(${c.glowCol || LIME},${c.glow})`; ctx.shadowBlur = 26; ctx.fillStyle = `rgba(${c.glowCol || LIME},${c.glow})`; ctx.beginPath(); ctx.roundRect(-CW / 2 - 4, -CH / 2 - 4, CW + 8, CH + 8, 12); ctx.fill(); ctx.restore(); }
    if (!face) {
      ctx.fillStyle = "#1e3a8a"; ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-CW / 2, -CH / 2, CW, CH, 9); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(147,197,253,0.4)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(26, 0); ctx.lineTo(0, 36); ctx.lineTo(-26, 0); ctx.closePath(); ctx.stroke();
      circle(ctx, 0, 0, 9, "rgba(147,197,253,0.5)");
    } else {
      const a = ART[c.art || 0];
      ctx.fillStyle = "#2a2f3a"; ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-CW / 2, -CH / 2, CW, CH, 9); ctx.fill(); ctx.stroke();
      const g = ctx.createLinearGradient(0, -48, 0, 10); g.addColorStop(0, `rgba(${a},1)`); g.addColorStop(1, `rgba(${a},0.35)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-34, -48, 68, 56, 6); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath();
      if ((c.art || 0) % 2) { ctx.moveTo(0, -38); ctx.lineTo(16, -6); ctx.lineTo(-16, -6); ctx.closePath(); } else ctx.arc(0, -20, 14, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-30, 18, 60, 5); ctx.fillRect(-30, 28, 42, 5);
      circle(ctx, -CW / 2 + 8, -CH / 2 + 8, 13, "#2563eb", "#bfdbfe", 2); numText(ctx, String(c.cost == null ? 3 : c.cost), -CW / 2 + 8, -CH / 2 + 9, 15, "#fff", "center");
      if (c.hp != null) {
        circle(ctx, -CW / 2 + 8, CH / 2 - 8, 13, "#ca8a04", "#fde68a", 2); numText(ctx, String(c.atk), -CW / 2 + 8, CH / 2 - 7, 15, "#fff", "center");
        circle(ctx, CW / 2 - 8, CH / 2 - 8, 13, "#b91c1c", "#fecaca", 2); numText(ctx, String(Math.max(0, c.hp)), CW / 2 - 8, CH / 2 - 7, 15, c.hurt ? "#fca5a5" : "#fff", "center");
      }
    }
    if (c.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, c.flash)})`; ctx.beginPath(); ctx.roundRect(-CW / 2, -CH / 2, CW, CH, 9); ctx.fill(); }
    ctx.restore();
  }
  const fanPos = (i, n) => { const k = i - (n - 1) / 2; return { x: 270 + k * 64, y: 262 + k * k * 4, rot: k * 0.09 }; };

  RECIPES.push(
    /* 9. 타워 설치 */
    {
      id: "strategy-tower", cat: "strategy", view: "iso",
      title: { en: "Make tower placement *land*", ko: "타워 설치에 *무게* 넣기" },
      intro: { en: "Pop. A tower. *Weightless.*", ko: "뿅, 타워. *무게가 없어요.*" },
      interval: 1.0, stepDur: 3.6,
      drawFloor(w, ctx) { tdFloor(ctx, w.pads); },
      setup(w) { makeArt(); w.pads = [[2, 1], [4, 3], [2, 3], [0, 3]]; w.T = []; w.k = 0; },
      fire(w) {
        const [gx, gy] = w.pads[w.k++ % w.pads.length];
        w.T = w.T.filter(t => t.gx !== gx || t.gy !== gy);
        const t = { gx, gy, z: 0, sx: 1, sy: 1, range: 0 };
        w.T.push(t);
        w.emit("place", t);
        if (!w.on("drop")) w.emit("land", t);
      },
      update(w, dt) {
        const k = Math.min(1, dt * 10);
        for (const t of w.T) { t.sx += (1 - t.sx) * k; t.sy += (1 - t.sy) * k; t.range = Math.max(0, t.range - dt * 0.8); }
      },
      drawBack(w, ctx) {
        for (const t of w.T) if (t.range > 0) {
          const p = isoPt(t.gx + 0.5, t.gy + 0.5);
          ctx.fillStyle = `rgba(${LIME},${0.12 * t.range})`; ctx.strokeStyle = `rgba(${LIME},${0.8 * t.range})`; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 125, 62, 0, 0, TAU); ctx.fill(); ctx.stroke();
        }
      },
      drawFront(w, ctx) { [...w.T].sort((a, b) => a.gx + a.gy - b.gx - b.gy).forEach(t => drawTower(ctx, t, "strategy-tower1")); },
      steps: [
        {
          id: "drop", name: { en: "Drop In", ko: "위에서 쿵" }, param: "160px · 220ms ease-in",
          cap: { en: "Drop it from the sky, *accelerating*.", ko: "하늘에서 *점점 빠르게* 떨어뜨려요." },
          place(w, t) { t.z = 160; w.tween(t, { z: 0 }, 0.22, "in", () => w.emit("land", t)); },
        },
        {
          id: "squash", name: { en: "Landing Squash", ko: "착지 찌그러짐" }, param: "sy .7 → 1",
          cap: { en: "*Squash* on impact. It has weight.", ko: "닿는 순간 *꾹*. 무게가 생겨요." },
          land(w, t) { t.sx = 1.25; t.sy = 0.7; },
        },
        {
          id: "dust", name: { en: "Dust Ring", ko: "먼지 고리" }, param: "flat ring + 10 puffs",
          cap: { en: "A *ring of dust* on the ground.", ko: "바닥에 *먼지 고리*가 퍼져요." },
          land(w, t) {
            const p = isoPt(t.gx + 0.5, t.gy + 0.5);
            w.spawn({ type: "ring", flat: true, x: p.x, y: p.y, size: 20, size1: 80, life: 0.4, w: 6, color: "230,220,200" });
            for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; w.spawn({ type: "smoke", x: p.x + Math.cos(a) * 26, y: p.y + Math.sin(a) * 13, vx: Math.cos(a) * 110, vy: Math.sin(a) * 50, drag: 4, size: 6, size1: 16, life: 0.55, color: "210,200,180" }); }
          },
        },
        {
          id: "shake", name: { en: "Ground Shake", ko: "땅 울림" }, param: "trauma .22",
          cap: { en: "Shake the ground *once*.", ko: "땅이 *한 번* 쿵 울려요." },
          land(w) { w.shake(0.22); },
        },
        {
          id: "range", name: { en: "Range Preview", ko: "사거리 표시" }, param: "ellipse · fade 1.2s",
          cap: { en: "Flash its *range* so you learn the reach.", ko: "*사거리*를 잠깐 보여줘요. 어디까지 닿는지." },
          land(w, t) { t.range = 1; },
        },
        {
          id: "cost", name: { en: "Cost Popup", ko: "비용 표시" }, param: "−100 gold",
          cap: { en: "Show the *price* flying off.", ko: "*쓴 돈*이 둥실 떠올라요." },
          land(w, t) { const p = isoPt(t.gx + 0.5, t.gy + 0.5, 110); w.spawn({ type: "text", text: "−100", x: p.x, y: p.y, vy: -60, life: 0.8, size: 22, color: "#facc15" }); },
        },
        {
          id: "sound", name: { en: "Whistle + Thunk", ko: "휘익 + 쿵" }, param: "fall · thunk",
          cap: { en: "A falling *whistle*, then a solid *thunk*.", ko: "떨어지며 *휘익*, 닿으면 *쿵*." },
          place(w) { w.play(() => tn({ type: "triangle", f: 1400, f2: 500, dur: 0.22, vol: 0.08 })); },
          land(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 10. 타워 업그레이드 */
    {
      id: "strategy-upgrade", cat: "strategy", view: "iso",
      title: { en: "Make upgrades feel *earned*", ko: "업그레이드를 *뿌듯하게*" },
      intro: { en: "It swapped sprites. *Stronger?*", ko: "그림만 바뀌었어요. *세진 거예요?*" },
      interval: 1.2, stepDur: 3.6,
      drawFloor(w, ctx) { tdFloor(ctx, [[4, 2]]); },
      setup(w) { makeArt(); w.T = { gx: 4, gy: 2, z: 0, sx: 1, sy: 1, flash: 0, lv: 1, pip: 1, aura: 0 }; },
      fire(w) {
        const t = w.T;
        t.lv = t.lv >= 3 ? 2 : t.lv + 1;
        w.emit("upgrade", t, t.lv);
      },
      update(w, dt) { const t = w.T, k = Math.min(1, dt * 10); t.sx += (1 - t.sx) * k; t.sy += (1 - t.sy) * k; t.flash = Math.max(0, t.flash - dt * 2.5); t.aura = Math.max(0, t.aura - dt * 0.8); },
      drawFront(w, ctx) {
        const t = w.T, a = isoPt(4.5, 2.5);
        if (t.aura > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, a.x, a.y - 50, 110, "253,224,71", t.aura * 0.7); ctx.globalCompositeOperation = "source-over"; }
        drawTower(ctx, t, "strategy-tower" + t.lv);
        const p = isoPt(4.5, 2.5, 160);
        if (w.on("pips")) for (let i = 0; i < t.lv; i++) {
          const last = i === t.lv - 1, s = last ? 1 + (1 - t.pip) * 1.6 : 1, x = p.x + (i - (t.lv - 1) / 2) * 26;
          ctx.save(); ctx.translate(x, p.y - (last ? (1 - t.pip) * 40 : 0)); ctx.scale(s, s);
          ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#0b0c10"; ctx.lineWidth = 2; starPath(ctx, 0, 0, 11); ctx.fill(); ctx.stroke();
          ctx.restore();
        } else label(ctx, "Lv " + t.lv, p.x, p.y + 10, 16, "rgba(255,255,255,0.8)");
      },
      steps: [
        {
          id: "beam", name: { en: "Light Beam", ko: "빛기둥" }, param: "beam + glow",
          cap: { en: "A *beam of light* drops onto the tower.", ko: "타워에 *빛기둥*이 내려와요." },
          upgrade(w, t) {
            const p = isoPt(4.5, 2.5);
            w.spawn({ type: "beam", under: true, x: p.x, y: p.y + 10, size: 46, h: 300, life: 1.1, color: "253,224,71" });
            t.aura = 1;
          },
        },
        {
          id: "pop", name: { en: "Grow Pop", ko: "쑥 커지기" }, param: "sy 1.3 → 1",
          cap: { en: "It *grows past* its new size, then settles.", ko: "새 크기보다 *더 크게* 쑥, 그리고 자리." },
          upgrade(w, t) { t.sy = 1.3; t.sx = 0.85; },
        },
        {
          id: "flash", name: { en: "White Flash", ko: "하얀 번쩍임" }, param: "overlay 0.3s",
          cap: { en: "Flash *white* the moment it changes.", ko: "바뀌는 순간 *하얗게* 번쩍." },
          upgrade(w, t) { t.flash = 1; },
        },
        {
          id: "rings", name: { en: "Rising Rings", ko: "올라가는 고리" }, param: "3 rings · up",
          cap: { en: "Rings *climb* the tower like a power-up.", ko: "고리가 타워를 *타고 올라가요*." },
          upgrade(w) {
            const p = isoPt(4.5, 2.5);
            for (let i = 0; i < 4; i++) w.after(i * 0.12, () => w.spawn({ type: "ring", flat: true, x: p.x, y: p.y, vy: -170, size: 40, size1: 22, life: 0.9, w: 4, color: "253,224,71" }));
          },
        },
        {
          id: "pips", name: { en: "Level Stars", ko: "레벨 별" }, param: "new star slams in",
          cap: { en: "The *new star* slams into place.", ko: "*새 별*이 쾅 박혀요." },
          upgrade(w, t) { t.pip = 0; w.tween(t, { pip: 1 }, 0.25, "in"); },
        },
        {
          id: "sparks", name: { en: "Gold Sparks", ko: "금빛 불꽃" }, param: "14 sparks up",
          cap: { en: "A fountain of *gold sparks*.", ko: "*금빛 불꽃*이 분수처럼." },
          upgrade(w) { const p = isoPt(4.5, 2.5, 60); for (let i = 0; i < 16; i++) w.spawn({ type: "spark", x: p.x, y: p.y, vx: rand(-220, 220), vy: rand(-520, -240), g: 900, drag: 1, life: rand(0.7, 1.1), size: 2.6, color: "253,224,71" }); },
        },
        {
          id: "sound", name: { en: "Rising Chime", ko: "올라가는 띵" }, param: "+4 semitones / lv",
          cap: { en: "Higher level, *higher chime*.", ko: "레벨이 오를수록 *음도 높게*." },
          upgrade(w, t, lv) { w.sfx.chime(lv * 4); w.sfx.burst(); },
        },
      ],
    },

    /* 11. 적 경로 미리보기 */
    {
      id: "strategy-path", cat: "strategy", view: "top",
      title: { en: "Preview the enemy *path*", ko: "적이 올 *길* 미리 보여주기" },
      intro: { en: "A red line. *Which way?*", ko: "빨간 선 하나. *어느 쪽으로요?*" },
      interval: 2.2, stepDur: 3.8,
      drawFloor(w, ctx) { field(ctx); road(ctx); },
      setup(w) { w.P = { a: 0, prog: 1, off: 0, arrow: 0, id: 0 }; w.L = pathLen(ROAD); },
      fire(w) {
        const P = w.P, id = ++P.id; P.a = 1; P.prog = 1;
        w.emit("preview", P);
        w.after(1.8, () => { if (P.id === id) w.tween(P, { a: 0 }, 0.3); });
      },
      drawBack(w, ctx) {
        const P = w.P; if (P.a <= 0) return;
        ctx.save(); ctx.globalAlpha = P.a; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(248,113,113,0.9)"; ctx.lineWidth = 4;
        if (w.on("march")) { ctx.setLineDash([16, 12]); ctx.lineDashOffset = -P.off; }
        strokePath(ctx, ROAD, w.L * P.prog); ctx.setLineDash([]);
        if (w.on("arrows")) for (let d = P.arrow; d < w.L * P.prog; d += 60) {
          const q = pathAt(ROAD, d); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a);
          ctx.strokeStyle = "#fecaca"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(4, 0); ctx.lineTo(-6, 9); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
      },
      drawFront(w, ctx) {
        core(ctx, 60, 120, 0.8, 0);
        const P = w.P;
        if (P.ghost != null && P.a > 0) {
          const q = pathAt(ROAD, P.ghost), c = SPR.foeTop.c;
          ctx.save(); ctx.globalAlpha = 0.55 * P.a; ctx.translate(q.x, q.y); ctx.rotate(q.a + Math.PI); ctx.drawImage(SPR.foeTop.cyan, -26, -26, 52, 52); ctx.restore();
          ctx.save(); ctx.globalAlpha = 0.25 * P.a; const b = pathAt(ROAD, Math.max(0, P.ghost - 30)); ctx.translate(b.x, b.y); ctx.drawImage(c, -22, -22, 44, 44); ctx.restore();
        }
      },
      steps: [
        {
          id: "draw", name: { en: "Draw It On", ko: "길이 그려짐" }, param: "spawn → base 0.5s",
          cap: { en: "Draw the line *from spawn to base*. Direction!", ko: "출발점에서 본진까지 *그려 나가요*. 방향이 보여요." },
          preview(w, P) { P.prog = 0; w.tween(P, { prog: 1 }, 0.5, "inout"); },
        },
        {
          id: "march", name: { en: "Marching Dashes", ko: "흐르는 점선" }, param: "dash · 90px/s",
          cap: { en: "Dashes *flow* toward your base.", ko: "점선이 본진 쪽으로 *흘러가요*." },
          update(w, dt) { w.P.off += dt * 90; },
        },
        {
          id: "arrows", name: { en: "Chevrons", ko: "화살표" }, param: "every 60px",
          cap: { en: "*Chevrons* ride the path. No guessing.", ko: "길 위로 *화살표*가 달려요. 헷갈릴 틈 없게." },
          update(w, dt) { w.P.arrow = (w.P.arrow + dt * 120) % 60; },
        },
        {
          id: "ghost", name: { en: "Ghost Runner", ko: "미리 달리는 유령" }, param: "1 ghost · 0.9s",
          cap: { en: "A *ghost enemy* runs the route first.", ko: "*유령 적*이 먼저 한 번 달려봐요." },
          preview(w, P) { P.ghost = 0; w.tween(P, { ghost: w.L }, 0.9, "lin"); },
        },
        {
          id: "ends", name: { en: "Start / End Pulse", ko: "시작 · 끝 맥박" }, param: "red portal · base ring",
          cap: { en: "Pulse *where they come from* and *where they hit*.", ko: "*나오는 곳*과 *부딪칠 곳*이 두근." },
          preview(w) {
            w.spawn({ type: "ring", x: 505, y: 80, size: 10, size1: 50, life: 0.6, w: 6, color: "248,113,113" });
            w.spawn({ type: "glow", x: 505, y: 80, size: 50, size1: 20, life: 0.8, color: "248,113,113" });
            w.after(0.5, () => w.spawn({ type: "ring", x: 60, y: 120, size: 20, size1: 70, life: 0.5, w: 6, color: "248,113,113" }));
          },
        },
        {
          id: "sound", name: { en: "Whoosh + Ticks", ko: "슉 + 틱틱" }, param: "sweep · 4 ticks",
          cap: { en: "A *sweep* along the path, a *tick* at each turn.", ko: "길 따라 *슉*, 꺾일 때마다 *틱*." },
          preview(w) { w.sfx.dash(); for (let i = 1; i < 5; i++) w.after(i * 0.1, () => w.sfx.tick()); },
        },
      ],
    },

    /* 12. 웨이브 시작 */
    {
      id: "strategy-wave", cat: "strategy", view: "top",
      title: { en: "Make a wave start *loud*", ko: "웨이브 시작을 *크게*" },
      intro: { en: "Wave 3 started. *Did you notice?*", ko: "3웨이브 시작. *눈치챘어요?*" },
      interval: 2.4, stepDur: 4.0,
      drawFloor(w, ctx) { field(ctx, "248,113,113"); road(ctx); },
      setup(w) {
        w.foes = Array.from({ length: 6 }, () => { const f = w.actor("foeTop", { home: 600, gy: 80, h: 40 }); f.alpha = 0; f.d = 0; return f; });
        w.wave = 2; w.W = { bx: -400, a: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true; w.wave++;
        w.emit("wave", w.W, w.wave);
        w.foes.forEach((f, i) => w.after(0.25 + i * 0.16, () => { f.d = 0; f.alpha = 1; f.on = true; w.emit("spawn", f); }));
        w.after(1.3, () => { w.busy = false; });
      },
      update(w, dt) {
        for (const f of w.foes) if (f.on) {
          f.d += dt * 130; const q = pathAt(ROAD, f.d); f.x = q.x; f.gy = q.y; f.rot = q.a + Math.PI;
          if (f.d > pathLen(ROAD) - 10) { f.on = false; f.alpha = 0; }
        }
      },
      drawFront(w, ctx) {
        core(ctx, 60, 120, 0.8, 0);
        ctx.fillStyle = "rgba(127,29,29,0.6)"; ctx.strokeStyle = "#f87171"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(494, 52, 30, 56, 6); ctx.fill(); ctx.stroke();
      },
      drawHud(w, ctx) {
        label(ctx, "WAVE " + w.wave, 270, 22, 16, "rgba(255,255,255,0.75)", "center", "'JetBrains Mono', monospace", 700);
        const W = w.W; if (W.a <= 0) return;
        ctx.save(); ctx.globalAlpha = W.a; ctx.translate(W.bx, 0);
        ctx.fillStyle = "rgba(127,29,29,0.88)"; ctx.fillRect(-20, 150, 580, 64);
        ctx.fillStyle = "#f87171"; ctx.fillRect(-20, 150, 580, 4); ctx.fillRect(-20, 210, 580, 4);
        numText(ctx, "WAVE " + w.wave, 270, 183, 46, "#fff", "center");
        ctx.restore();
      },
      steps: [
        {
          id: "banner", name: { en: "Big Banner", ko: "큰 띠 배너" }, param: "slide in · hold 0.6s",
          cap: { en: "A *huge banner* slides through the middle.", ko: "화면 가운데로 *큰 배너*가 휙." },
          wave(w, W) {
            W.bx = -560; W.a = 1;
            w.tween(W, { bx: 0 }, 0.25, "out", () => w.after(0.6, () => w.tween(W, { bx: 560 }, 0.22, "in", () => { W.a = 0; })));
          },
        },
        {
          id: "alarm", name: { en: "Red Alarm", ko: "붉은 경보" }, param: "vignette .7 + flash",
          cap: { en: "Edges go *red*. Danger is coming.", ko: "가장자리가 *붉게*. 위험이 온다." },
          wave(w) { w.vignette(0.75); w.flash("248,113,113", 0.25); },
        },
        {
          id: "gate", name: { en: "Gate Burst", ko: "문 폭발" }, param: "ring + glow",
          cap: { en: "The *gate* bursts open with light.", ko: "*문*이 빛과 함께 터지듯 열려요." },
          wave(w) {
            w.spawn({ type: "ring", x: 509, y: 80, size: 10, size1: 110, life: 0.5, w: 10, color: "248,113,113" });
            w.spawn({ type: "glow", x: 509, y: 80, size: 90, size1: 30, life: 1.2, color: "248,113,113" });
          },
        },
        {
          id: "pop", name: { en: "Spawn Pop", ko: "등장 뿅" }, param: "scale .2 → 1 + flash",
          cap: { en: "Each enemy *pops* in, not just appears.", ko: "적이 그냥 나타나지 말고 *뿅* 튀어나와요." },
          spawn(w, f) { f.sx = f.sy = 0.2; f.flash = 1; sparks(w, 505, 80, 4, "248,113,113", [80, 200]); },
        },
        {
          id: "punch", name: { en: "Drum Punch", ko: "북소리 펀치" }, param: "zoom .05 + trauma .3",
          cap: { en: "Punch the camera like a *war drum*.", ko: "*전쟁 북*처럼 화면을 쿵." },
          wave(w) { w.zoomPunch(0.06); w.shake(0.3); },
        },
        {
          id: "sound", name: { en: "Horn + Drums", ko: "뿔피리 + 북" }, param: "saw horn · 3 drums",
          cap: { en: "A low *horn*, then *drums* as they spawn.", ko: "낮은 *뿔피리*, 나올 때마다 *둥*." },
          wave(w) { w.play(() => { tn({ type: "sawtooth", f: 110, f2: 98, dur: 0.7, vol: 0.12 }); tn({ type: "sawtooth", f: 165, f2: 147, dur: 0.7, vol: 0.07 }); }); },
          spawn(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 13. 본진 피해 */
    {
      id: "strategy-leak", cat: "strategy", view: "top",
      title: { en: "Make a leak *hurt*", ko: "본진이 뚫리면 *아프게*" },
      intro: { en: "Lives 20 → 19. *Missed it.*", ko: "목숨 20 → 19. *못 봤죠?*" },
      interval: 1.2, stepDur: 3.6,
      drawFloor(w, ctx) { field(ctx); road(ctx); },
      setup(w) {
        w.foe = w.actor("foeTop", { home: 320, gy: 120, h: 46 }); w.foe.rot = Math.PI; w.foe.alpha = 0;
        w.C = { tint: 0, s: 1, lives: 20, bump: 0, cracks: 0 };
      },
      fire(w) {
        const f = w.foe; f.x = 330; f.gy = 120; f.alpha = 1;
        w.tween(f, { x: 70 }, 0.32, "in", () => {
          f.alpha = 0; const C = w.C;
          C.lives = C.lives <= 11 ? 20 : C.lives - 1;
          w.emit("leak", C);
        });
      },
      update(w, dt) { const C = w.C; C.tint = Math.max(0, C.tint - dt * 1.2); C.bump = Math.max(0, C.bump - dt * 1.8); C.s += (1 - C.s) * Math.min(1, dt * 10); },
      drawFront(w, ctx) { core(ctx, 60, 120, 0.8 * w.C.s, w.C.tint); },
      drawHud(w, ctx) {
        const C = w.C, s = 1 + C.bump * 0.4, sh = C.bump > 0 ? rand(-3, 3) * C.bump : 0;
        ctx.save(); ctx.translate(250 + sh, 24); ctx.scale(s, s);
        const h = SPR.heart.c; ctx.drawImage(h, -30, -12, 26, 24);
        numText(ctx, String(C.lives), 2, 1, 24, C.bump > 0.2 ? "#f87171" : "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "flash", name: { en: "Base Flash", ko: "본진 번쩍" }, param: "red glow + squash",
          cap: { en: "The base flashes *red* and flinches.", ko: "본진이 *빨갛게* 번쩍, 움찔." },
          leak(w, C) { C.tint = 1; C.s = 0.82; },
        },
        {
          id: "counter", name: { en: "Counter Shake", ko: "숫자 흔들기" }, param: "scale 1.4 · shake",
          cap: { en: "The life counter *jumps* and *shakes red*.", ko: "목숨 숫자가 *튀고* *빨갛게 떨려요*." },
          leak(w, C) { C.bump = 1; w.spawn({ type: "text", text: "−1", x: 290, y: 44, vy: 50, life: 1.4, size: 26, color: "#f87171" }); },
        },
        {
          id: "vignette", name: { en: "Red Edges", ko: "붉은 테두리" }, param: "vignette .8",
          cap: { en: "Tint the *whole screen edge*. It's your loss.", ko: "*화면 가장자리*까지 붉게. 내 손해니까." },
          leak(w) { w.vignette(0.8); },
        },
        {
          id: "shake", name: { en: "Heavy Shake", ko: "묵직한 흔들림" }, param: "trauma .4 + stop 80ms",
          cap: { en: "A *freeze*, then a heavy *shake*.", ko: "잠깐 *멈칫*, 그리고 *크게 흔들림*." },
          leak(w) { w.hitstop(0.08); w.shake(0.4, -1); },
        },
        {
          id: "shards", name: { en: "Crystal Shards", ko: "수정 파편" }, param: "12 chunks + crack",
          cap: { en: "Chip *shards* off the base. Damage is visible.", ko: "본진에서 *파편*이 튀어요. 다친 게 보여요." },
          leak(w) {
            for (let i = 0; i < 12; i++) w.spawn({ type: "chunk", x: 60, y: 110, vx: rand(-200, 260), vy: rand(-260, 260), floor: 4, vr: rand(-15, 15), life: 1.2, size: rand(4, 7), color: pick(["103,232,249", "14,116,144", "248,113,113"]) });
            w.spawn({ type: "ring", x: 60, y: 120, size: 20, size1: 90, life: 0.4, w: 8, color: "248,113,113" });
            w.spawn({ type: "crack", x: 60, y: 112, pts: [[-4, -26], [4, -10], [-6, 2], [6, 16], [0, 28]], w: 3, life: 2.5, hold: true, color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Crack + Alarm", ko: "쩍 + 경고음" }, param: "crunch · 2 beeps",
          cap: { en: "A *crunch*, then a short *alarm*.", ko: "*쩍*, 그리고 짧은 *삐삐*." },
          leak(w) {
            w.sfx.hurt(); w.sfx.thud();
            w.play(() => { tn({ type: "square", f: 880, dur: 0.08, vol: 0.08, delay: 0.12 }); tn({ type: "square", f: 880, dur: 0.08, vol: 0.08, delay: 0.26 }); });
          },
        },
      ],
    },

    /* 14. 카드 뽑기 */
    {
      id: "strategy-draw", cat: "strategy", view: "ui",
      title: { en: "Make drawing a card *exciting*", ko: "카드 뽑기를 *설레게*" },
      intro: { en: "A card appeared. *Wait, what?*", ko: "카드가 생겼어요. *언제?*" },
      interval: 1.0, stepDur: 3.6,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.roundRect(60, 50, 420, 140, 18); ctx.fill();
      },
      setup(w) { w.hand = []; w.deck = { x: 470, y: 120 }; w.k = 0; },
      fire(w) {
        if (w.hand.length >= 5) w.hand = [];
        const c = { art: w.k % 5, cost: 1 + (w.k * 3) % 7, atk: 2 + w.k % 4, hp: 3 + (w.k * 2) % 5, x: 0, y: 0, rot: 0, flip: 1, fly: 1, glow: 0 };
        w.k++; w.hand.push(c);
        w.emit("draw", c);
      },
      update(w, dt) {
        const n = w.hand.length;
        w.hand.forEach((c, i) => {
          const p = fanPos(i, n);
          if (c.fly < 1) {
            const k = E.out(c.fly), q = 1 - k;
            c.x = q * q * c.x0 + 2 * q * k * 320 + k * k * p.x; c.y = q * q * c.y0 + 2 * q * k * 40 + k * k * p.y; c.rot = (1 - k) * -0.6 + k * p.rot;
          } else if (!w.on("fan")) { c.x = p.x; c.y = p.y; c.rot = p.rot; }
          c.glow = Math.max(0, c.glow - dt * 1.5);
        });
      },
      drawFront(w, ctx) {
        const d = w.deck;
        for (let i = 4; i >= 0; i--) drawCard(ctx, { x: d.x + i * 1.5, y: d.y - i * 2, flip: 0 });
        w.hand.forEach(c => drawCard(ctx, c));
      },
      steps: [
        {
          id: "fly", name: { en: "Arc Flight", ko: "곡선 비행" }, param: "deck → hand · 0.4s",
          cap: { en: "Fly it *from the deck* in an arc.", ko: "*덱에서* 곡선을 그리며 날아와요." },
          draw(w, c) { c.fly = 0; c.x0 = w.deck.x; c.y0 = w.deck.y; w.tween(c, { fly: 1 }, 0.4, "lin"); },
        },
        {
          id: "flip", name: { en: "Mid-air Flip", ko: "공중에서 뒤집기" }, param: "back → face 0.3s",
          cap: { en: "Start *face-down*, flip on the way.", ko: "*뒷면*으로 나와서 날아오며 뒤집혀요." },
          draw(w, c) { c.flip = 0; w.after(0.08, () => w.tween(c, { flip: 1 }, 0.3, "inout")); },
        },
        {
          id: "fan", name: { en: "Hand Re-fan", ko: "손패 다시 펼치기" }, param: "ease ×12",
          cap: { en: "Other cards *slide over* to make room.", ko: "다른 카드들이 *스르륵* 자리를 내줘요." },
          update(w, dt) {
            const n = w.hand.length, k = Math.min(1, dt * 12);
            w.hand.forEach((c, i) => { if (c.fly < 1) return; const p = fanPos(i, n); c.x += (p.x - c.x) * k; c.y += (p.y - c.y) * k; c.rot += (p.rot - c.rot) * k; });
          },
        },
        {
          id: "trail", name: { en: "Sparkle Trail", ko: "반짝이 꼬리" }, param: "2 / frame",
          cap: { en: "Leave *sparkles* along the flight.", ko: "날아오는 길에 *반짝이*를 흘려요." },
          update(w) { for (const c of w.hand) if (c.fly < 0.95) w.spawn({ type: "glow", x: c.x + rand(-20, 20), y: c.y + rand(-30, 30), size: 9, size1: 0, life: 0.35, color: "147,197,253" }); },
        },
        {
          id: "glow", name: { en: "Reveal Glow", ko: "공개 빛" }, param: "glow 0.7s + stars",
          cap: { en: "*Glow* the moment the face shows.", ko: "앞면이 보이는 순간 *빛나요*." },
          draw(w, c) { w.after(0.25, () => { c.glow = 1; for (let i = 0; i < 5; i++) w.spawn({ type: "star", x: c.x + rand(-40, 40), y: c.y + rand(-50, 50), size: rand(8, 13), life: 0.4, color: "255,255,255" }); }); },
        },
        {
          id: "sound", name: { en: "Swish + Flip", ko: "슥 + 착" }, param: "swish · click",
          cap: { en: "A *swish* off the deck, a *snap* on the flip.", ko: "덱에서 *슥*, 뒤집힐 때 *착*." },
          draw(w) { w.sfx.swish(); w.after(0.24, () => w.sfx.clickUp()); },
        },
      ],
    },

    /* 15. 카드 내기 */
    {
      id: "strategy-play", cat: "strategy", view: "ui",
      title: { en: "Make playing a card *matter*", ko: "카드 내는 순간을 *묵직하게*" },
      intro: { en: "Card gone. Number changed. *Hm.*", ko: "카드는 사라지고 숫자만 바뀜. *음…*" },
      interval: 1.6, stepDur: 3.8,
      drawFloor(w, ctx) { ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.roundRect(150, 34, 240, 130, 16); ctx.fill(); },
      setup(w) {
        w.foe = { x: 270, y: 100, art: 4, cost: 4, atk: 3, hp: 9, ox: 0, oy: 0, flash: 0, hurt: false };
        w.hand = [0, 1, 2].map(i => Object.assign({ art: [2, 0, 1][i], cost: [2, 3, 1][i], alpha: 1, s: 1 }, fanPos(i, 3)));
        w.card = w.hand[1];
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const c = w.card, f = w.foe;
        if (f.hp <= 0) f.hp = 9;
        const hit = () => { f.hp -= 3; f.hurt = true; f.oy -= 8; w.emit("hit", f); };
        const cast = () => {
          w.emit("cast", c);
          if (!w.on("lift")) c.alpha = 0;
          if (w.on("bolt")) w.emit("bolt", c, hit); else hit();
        };
        if (w.on("lift")) { w.emit("lift", c); w.after(0.16, cast); } else cast();
        w.after(1.45, () => { Object.assign(c, fanPos(1, 3), { s: 1, alpha: 0 }); w.tween(c, { alpha: 1 }, 0.2); f.hurt = false; w.busy = false; });
      },
      update(w, dt) { const f = w.foe; f.ox -= f.ox * Math.min(1, dt * 12); f.oy -= f.oy * Math.min(1, dt * 12); f.flash = Math.max(0, f.flash - dt * 2.5); },
      drawFront(w, ctx) {
        const f = w.foe; drawCard(ctx, Object.assign({}, f, { x: f.x + f.ox, y: f.y + f.oy, s: 0.95 }));
        w.hand.forEach(c => { if (c.alpha > 0.01) drawCard(ctx, c); });
      },
      steps: [
        {
          id: "lift", name: { en: "Show It Off", ko: "보여주고 내기" }, param: "center · 1.4× · 160ms",
          cap: { en: "Lift the card to *center stage* first.", ko: "먼저 카드를 *가운데로* 들어 보여줘요." },
          lift(w, c) { w.tween(c, { x: 270, y: 215, rot: 0, s: 1.4 }, 0.16, "out"); },
        },
        {
          id: "burn", name: { en: "Dissolve", ko: "타서 사라짐" }, param: "embers + fade",
          cap: { en: "The card *burns away* into embers.", ko: "카드가 *불씨가 되어* 사라져요." },
          cast(w, c) {
            w.tween(c, { alpha: 0, s: c.s * 1.15 }, 0.2, "out");
            for (let i = 0; i < 26; i++) w.spawn({ type: "glow", x: c.x + rand(-55, 55), y: c.y + rand(-80, 80), vx: rand(-40, 40), vy: rand(-160, -40), size: rand(6, 12), size1: 0, life: rand(0.6, 1.3), color: pick(["251,146,60", "253,224,71", "248,113,113"]) });
          },
        },
        {
          id: "bolt", name: { en: "Spell Bolt", ko: "주문 탄" }, param: "orb + trail 180ms",
          cap: { en: "Send a *bolt* to the target. Show cause → effect.", ko: "표적까지 *탄*을 날려요. 원인 → 결과." },
          bolt(w, c, hit) {
            const f = w.foe, o = { x: c.x, y: c.y, vx: (f.x - c.x) / 0.18, vy: (f.y - c.y) / 0.18, orb: true, core: true, trail: "251,146,60", test: p => p.y <= f.y + 20 };
            o.onHit = hit; w.shoot(o);
          },
        },
        {
          id: "impact", name: { en: "Impact", ko: "맞는 반응" }, param: "flash · shove · number",
          cap: { en: "The target *flashes*, *jolts*, shows the damage.", ko: "표적이 *번쩍*, *휘청*, 피해 숫자." },
          hit(w, f) {
            f.flash = 1; f.oy -= 18; f.ox += rand(-10, 10);
            w.spawn({ type: "text", text: "−3", x: f.x + 78, y: f.y - 20, vy: -200, g: 420, life: 1.5, size: 42, color: "#f87171" });
            sparks(w, f.x, f.y + 30, 14, "253,186,116", [150, 420]);
          },
        },
        {
          id: "shake", name: { en: "Shake", ko: "흔들림" }, param: "trauma .3",
          cap: { en: "Shake the *table*. Spells are big.", ko: "*판 전체*를 흔들어요. 주문은 크니까." },
          hit(w) { w.shake(0.3); },
        },
        {
          id: "sound", name: { en: "Whoosh + Boom", ko: "휙 + 펑" }, param: "magic · burst",
          cap: { en: "A *whoosh* on cast, a *boom* on hit.", ko: "낼 때 *휙*, 맞을 때 *펑*." },
          cast(w) { w.sfx.magic(); },
          hit(w) { w.sfx.burst(); },
        },
      ],
    },

    /* 16. 카드 올리기 (호버) */
    {
      id: "strategy-hover", cat: "strategy", view: "ui",
      title: { en: "Make card hover *lift*", ko: "카드 고를 때 *쏙 올라오게*" },
      intro: { en: "Pointing at a card. *Which one?*", ko: "카드를 가리키는데… *어느 거죠?*" },
      interval: 0.7, stepDur: 3.4,
      drawFloor() {},
      setup(w) {
        w.hand = [0, 1, 2, 3, 4].map(i => ({ art: i, cost: [1, 3, 2, 5, 4][i], atk: [1, 3, 2, 5, 4][i], hp: [2, 3, 4, 5, 6][i], lift: 0, push: 0, tilt: 0, sh: 0, glow: 0 }));
        w.hov = 0; w.dir = 1; w.cur = { x: 140, y: 300 };
      },
      fire(w) {
        if (w.hov + w.dir > 4 || w.hov + w.dir < 0) w.dir *= -1;
        w.hov += w.dir;
        const c = w.hand[w.hov], p = fanPos(w.hov, 5);
        w.tween(w.cur, { x: p.x + 10, y: p.y + 6 }, 0.15, "out");
        w.emit("hover", c, w.dir);
      },
      update(w, dt) { for (const c of w.hand) c.tilt -= c.tilt * Math.min(1, dt * 6); },
      drawFront(w, ctx) {
        const order = w.hand.map((c, i) => i).sort((a, b) => (a === w.hov) - (b === w.hov));
        for (const i of order) {
          const c = w.hand[i], p = fanPos(i, 5);
          drawCard(ctx, Object.assign({}, c, { x: p.x + c.push, y: p.y - c.lift * 70, rot: p.rot * (1 - c.lift) + c.tilt, s: 1 + c.lift * 0.3 }));
          if (i === w.hov && !w.on("glow")) { ctx.save(); ctx.translate(p.x + c.push, p.y - c.lift * 70); ctx.rotate(p.rot * (1 - c.lift)); ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-CW / 2 - 3, -CH / 2 - 3, CW + 6, CH + 6, 10); ctx.stroke(); ctx.restore(); }
        }
        cursor(ctx, w.cur);
      },
      steps: [
        {
          id: "lift", name: { en: "Lift + Grow", ko: "올라오며 커짐" }, param: "70px · 1.3×",
          cap: { en: "The hovered card *rises* and *grows*.", ko: "가리킨 카드가 *쏙 올라오고* *커져요*." },
          update(w, dt) { w.hand.forEach((c, i) => { c.lift += ((i === w.hov ? 1 : 0) - c.lift) * Math.min(1, dt * 14); }); },
        },
        {
          id: "spread", name: { en: "Neighbors Step Aside", ko: "옆 카드 비켜주기" }, param: "±26px",
          cap: { en: "Neighbors *step aside* so it can breathe.", ko: "옆 카드들이 *살짝 비켜줘요*." },
          update(w, dt) {
            w.hand.forEach((c, i) => { const d = i - w.hov, t = d === 0 ? 0 : Math.sign(d) * 26 / Math.abs(d); c.push += (t - c.push) * Math.min(1, dt * 12); });
          },
        },
        {
          id: "tilt", name: { en: "Swing Tilt", ko: "흔들 기울기" }, param: "0.25 rad · spring",
          cap: { en: "It *swings* a little in the move direction.", ko: "움직인 쪽으로 *살랑* 기울어요." },
          hover(w, c, dir) { c.tilt = dir * 0.25; },
        },
        {
          id: "shadow", name: { en: "Deep Shadow", ko: "깊은 그림자" }, param: "offset 22px",
          cap: { en: "A *deeper shadow* = higher off the table.", ko: "*그림자가 깊을수록* 높이 떠 보여요." },
          update(w) { for (const c of w.hand) c.sh = c.lift; },
        },
        {
          id: "glow", name: { en: "Playable Glow", ko: "낼 수 있음 빛" }, param: "lime · breathing",
          cap: { en: "A *glowing edge* says \"you can play this\".", ko: "*빛나는 테두리* = \"낼 수 있어요\"." },
          update(w) { w.hand.forEach((c, i) => { c.glow = i === w.hov ? 0.65 + 0.3 * Math.sin(w.time * 8) : 0; }); },
        },
        {
          id: "sound", name: { en: "Soft Tick", ko: "부드러운 틱" }, param: "tick · pitch by slot",
          cap: { en: "A soft *tick*, a bit higher for each card.", ko: "부드러운 *틱*. 카드마다 음이 조금씩 달라요." },
          hover(w) { w.sfx.blip(w.hov + 1); },
        },
      ],
    },
  );

  /* ───────── 턴제 · 육각 · 안개용 도우미 ───────── */
  function manaGem(ctx, x, y, s, state) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(15, -4); ctx.lineTo(9, 18); ctx.lineTo(-9, 18); ctx.lineTo(-15, -4); ctx.closePath();
    if (state === 2) {
      const g = ctx.createLinearGradient(-15, -20, 15, 18); g.addColorStop(0, "#bfdbfe"); g.addColorStop(0.5, "#3b82f6"); g.addColorStop(1, "#1e3a8a");
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "#dbeafe"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(0, -16); ctx.lineTo(2, -4); ctx.closePath(); ctx.fill();
    } else if (state === 1) { ctx.fillStyle = "rgba(30,41,59,0.9)"; ctx.fill(); ctx.strokeStyle = "rgba(147,197,253,0.5)"; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  }
  // 육각 칸 (뾰족한 쪽이 위, 홀수 줄 밀기)
  const HX = { r: 25, x0: 62, y0: 50 };
  const hexC = (c, r) => ({ x: HX.x0 + c * HX.r * 1.732 + (r % 2) * HX.r * 0.866, y: HX.y0 + r * HX.r * 1.5 });
  const toCube = (c, r) => { const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; };
  const hexDist = (a, b) => { const p = toCube(a[0], a[1]), q = toCube(b[0], b[1]); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); };
  function hexPath(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  function chevron(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.strokeStyle = "#0b0c10"; ctx.lineWidth = 2; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(0, 6); ctx.lineTo(18, -6); ctx.lineTo(18, 2); ctx.lineTo(0, 14); ctx.lineTo(-18, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function flask(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(-7, -8); ctx.lineTo(-22, 18); ctx.quadraticCurveTo(-24, 26, -14, 26); ctx.lineTo(14, 26); ctx.quadraticCurveTo(24, 26, 22, 18); ctx.lineTo(7, -8); ctx.lineTo(7, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.moveTo(-15, 8); ctx.lineTo(15, 8); ctx.lineTo(21, 19); ctx.quadraticCurveTo(22, 24, 14, 24); ctx.lineTo(-14, 24); ctx.quadraticCurveTo(-22, 24, -21, 19); ctx.closePath(); ctx.fill();
    circle(ctx, -4, 14, 3, "rgba(255,255,255,0.7)"); circle(ctx, 6, 18, 2, "rgba(255,255,255,0.6)");
    ctx.restore();
  }

  RECIPES.push(
    /* 17. 마나 수정 */
    {
      id: "strategy-mana", cat: "strategy", view: "ui",
      title: { en: "Make mana crystals *satisfying*", ko: "마나 수정을 *채우는 맛*" },
      intro: { en: "Full. Empty. Full. *No feeling.*", ko: "찼다, 비었다. *아무 느낌 없어요.*" },
      interval: 1.0, stepDur: 3.6,
      drawFloor(w, ctx) { ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.beginPath(); ctx.roundRect(40, 140, 460, 120, 18); ctx.fill(); },
      setup(w) { w.M = Array.from({ length: 10 }, (_, i) => ({ i, full: i < 6, s: 1, glow: 0 })); w.max = 6; w.bump = 0; },
      fire(w) {
        const full = w.M.filter(m => m.full);
        if (full.length >= 3) {
          full.slice(-3).reverse().forEach((m, i) => { m.full = false; w.emit("spend", m, i); });
          w.emit("count");
          return;
        }
        w.max = w.max >= 10 ? 6 : w.max + 1;
        const list = w.M.filter(m => m.i < w.max && !m.full);
        const fill = m => { m.full = true; w.emit("fill", m); w.emit("count"); };
        if (w.on("stagger")) w.emit("refill", list, fill); else list.forEach(fill);
      },
      update(w, dt) { for (const m of w.M) m.s += (1 - m.s) * Math.min(1, dt * 10); w.bump = Math.max(0, w.bump - dt * 3); },
      drawFront(w, ctx) {
        for (const m of w.M) {
          const x = 72 + m.i * 44, y = 200;
          if (m.full && m.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, 34, "96,165,250", m.glow); ctx.globalCompositeOperation = "source-over"; }
          manaGem(ctx, x, y, m.s, m.full ? 2 : m.i < w.max ? 1 : 0);
        }
        const n = w.M.filter(m => m.full).length, s = 1 + w.bump * 0.4;
        ctx.save(); ctx.translate(460, 112); ctx.scale(s, s); numText(ctx, n + "/" + w.max, 0, 0, 30, w.bump > 0.2 ? "#93c5fd" : "#fff", "right"); ctx.restore();
      },
      steps: [
        {
          id: "stagger", name: { en: "One by One", ko: "하나씩 차오름" }, param: "70ms apart",
          cap: { en: "Refill *one at a time*, left to right.", ko: "왼쪽부터 *하나씩* 차올라요." },
          refill(w, list, fill) { list.forEach((m, i) => w.after(i * 0.07, () => fill(m))); },
        },
        {
          id: "pop", name: { en: "Pop In", ko: "톡 부풀기" }, param: "scale 1.5 → 1",
          cap: { en: "Each crystal *pops* as it fills.", ko: "찰 때마다 수정이 *톡* 부풀어요." },
          fill(w, m) { m.s = 1.5; },
        },
        {
          id: "shatter", name: { en: "Spend Shatter", ko: "쓸 때 깨짐" }, param: "8 shards + ring",
          cap: { en: "Spending *cracks* the crystal into shards.", ko: "쓰면 수정이 *와장창* 깨져요." },
          spend(w, m, i) {
            const x = 72 + m.i * 44;
            w.after(i * 0.05, () => {
              m.s = 0.6;
              for (let k = 0; k < 8; k++) w.spawn({ type: "chunk", x, y: 200, vx: rand(-160, 160), vy: rand(-380, -120), g: 1200, vr: rand(-15, 15), life: 1.0, size: rand(3, 6), color: pick(["147,197,253", "59,130,246", "219,234,254"]) });
              w.spawn({ type: "ring", x, y: 200, size: 10, size1: 40, life: 0.3, w: 4, color: "147,197,253" });
            });
          },
        },
        {
          id: "glow", name: { en: "Living Glow", ko: "살아 있는 빛" }, param: "wave · 3Hz",
          cap: { en: "Full crystals *breathe* a soft glow.", ko: "찬 수정은 은은하게 *숨 쉬어요*." },
          update(w) { for (const m of w.M) m.glow = 0.45 + 0.3 * Math.sin(w.time * 5 - m.i * 0.6); },
        },
        {
          id: "count", name: { en: "Counter Bump", ko: "숫자 톡" }, param: "scale 1.4 · blue",
          cap: { en: "The *7/10* bumps with every change.", ko: "바뀔 때마다 *7/10*이 톡." },
          count(w) { w.bump = 1; },
        },
        {
          id: "sound", name: { en: "Rising Chimes", ko: "올라가는 띵띵" }, param: "+2 semitones each",
          cap: { en: "Each fill *rings higher*. Spending *crunches*.", ko: "찰수록 *음이 올라가고*, 쓰면 *와작*." },
          fill(w, m) { w.sfx.chime(m.i * 2); },
          spend(w, m, i) { w.after(i * 0.05, () => w.play(() => nz({ type: "bandpass", f: 3000, f2: 900, q: 2, dur: 0.12, vol: 0.25 }))); },
        },
      ],
    },

    /* 18. 턴 넘기기 */
    {
      id: "strategy-turn", cat: "strategy", view: "top",
      title: { en: "Make turn changes *unmissable*", ko: "턴이 바뀌는 걸 *확실하게*" },
      intro: { en: "Whose turn is it? *Still mine?*", ko: "지금 누구 차례예요? *아직 나?*" },
      interval: 1.8, stepDur: 3.8,
      drawFloor(w, ctx) {
        for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { ctx.fillStyle = (r + c) % 2 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)"; ctx.fillRect(45 + c * 50, 40 + r * 50, 50, 50); }
        ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; ctx.strokeRect(45, 40, 450, 300);
      },
      setup(w) {
        w.mine = [[95, 115], [95, 265], [145, 190]].map(([x, y]) => w.actor("heroTop", { home: x, gy: y, h: 46 }));
        w.foes = [[445, 115], [445, 265], [395, 190]].map(([x, y]) => { const f = w.actor("foeTop", { home: x, gy: y, h: 44 }); f.rot = Math.PI; return f; });
        w.T = { side: 0, bx: 600, ba: 0, dim: 0, edge: 0, id: 0 };
      },
      fire(w) {
        const T = w.T; T.side = 1 - T.side;
        w.emit("turn", T, T.side ? w.foes : w.mine);
      },
      update(w, dt) { w.T.edge = Math.max(0, w.T.edge - dt * 0.6); },
      drawHud(w, ctx) {
        const T = w.T, col = T.side ? "248,113,113" : "96,165,250", name = T.side ? "ENEMY TURN" : "YOUR TURN";
        if (T.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${0.5 * T.dim})`; ctx.fillRect(0, 0, 540, 360); }
        if (T.edge > 0) { ctx.strokeStyle = `rgba(${col},${T.edge})`; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 530, 350); }
        label(ctx, name, 270, 22, 20, `rgba(${col},0.95)`, "center", "'JetBrains Mono', monospace", 700);
        if (T.ba > 0) {
          ctx.save(); ctx.globalAlpha = T.ba; ctx.translate(T.bx, 0);
          ctx.fillStyle = `rgba(${col},0.85)`; ctx.beginPath(); ctx.moveTo(-40, 150); ctx.lineTo(600, 150); ctx.lineTo(580, 214); ctx.lineTo(-60, 214); ctx.closePath(); ctx.fill();
          numText(ctx, name, 270, 183, 42, "#fff", "center");
          ctx.restore();
        }
      },
      steps: [
        {
          id: "banner", name: { en: "Sweeping Banner", ko: "가로지르는 띠" }, param: "in 0.25 · hold 0.8",
          cap: { en: "A *banner* sweeps across: whose turn now.", ko: "*띠 배너*가 휙. 이제 누구 차례인지." },
          turn(w, T) {
            const id = ++T.id; T.bx = -600; T.ba = 1;
            w.tween(T, { bx: 0 }, 0.25, "out", () => w.after(0.8, () => { if (T.id === id) w.tween(T, { bx: 600 }, 0.2, "in"); }));
          },
        },
        {
          id: "dim", name: { en: "Dim the Board", ko: "판 어둡게" }, param: "50% · 1.1s",
          cap: { en: "*Dim* everything else while it shows.", ko: "배너가 뜬 동안 나머지는 *어둡게*." },
          turn(w, T) { T.dim = 1; w.after(1.05, () => w.tween(T, { dim: 0 }, 0.2)); },
        },
        {
          id: "edge", name: { en: "Side Color Frame", ko: "차례 색 테두리" }, param: "blue / red frame",
          cap: { en: "Frame the screen in the *side's color*.", ko: "화면 테두리를 *그 편 색*으로." },
          turn(w, T) { T.edge = 1; },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "14 streaks",
          cap: { en: "*Speed lines* make the swap feel fast.", ko: "*속도선*이 휙휙. 빠르게 넘어가는 느낌." },
          turn(w) { for (let i = 0; i < 14; i++) w.spawn({ type: "spark", x: rand(-40, 300), y: rand(140, 224), vx: rand(1400, 2200), vy: 0, life: rand(0.25, 0.45), size: rand(1.5, 3), color: "255,255,255" }); },
        },
        {
          id: "wake", name: { en: "Units Wake Up", ko: "유닛 깨우기" }, param: "hop · 80ms stagger",
          cap: { en: "The active side's units *hop* awake.", ko: "차례가 된 편 유닛들이 *들썩* 깨어나요." },
          turn(w, T, units) { units.forEach((u, i) => w.after(0.35 + i * 0.08, () => { u.sx = u.sy = 1.35; u.flash = 1; })); },
        },
        {
          id: "sound", name: { en: "Whoosh + Gong", ko: "휙 + 징" }, param: "dash · low gong",
          cap: { en: "A *whoosh* and a low *gong*.", ko: "*휙*, 그리고 낮은 *징*." },
          turn(w, T) { w.sfx.dash(); w.play(() => { tn({ f: T.side ? 110 : 165, dur: 0.9, vol: 0.3 }); tn({ type: "triangle", f: T.side ? 220 : 330, dur: 0.6, vol: 0.1 }); }); },
        },
      ],
    },

    /* 19. 육각 이동 범위 */
    {
      id: "strategy-hex", cat: "strategy", view: "top",
      title: { en: "Make move range *readable*", ko: "이동 범위를 *한눈에*" },
      intro: { en: "Blue tiles. Then… *teleport?*", ko: "파란 칸, 그리고… *순간이동?*" },
      interval: 1.7, stepDur: 3.8,
      drawFloor(w, ctx) {
        for (const h of w.H) {
          hexPath(ctx, h.x, h.y, HX.r - 1.5);
          ctx.fillStyle = h.rock ? "rgba(120,113,108,0.5)" : "rgba(255,255,255,0.035)"; ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.09)"; ctx.lineWidth = 1; ctx.stroke();
          if (h.a > 0.01) {
            hexPath(ctx, h.x, h.y, (HX.r - 3) * h.s);
            ctx.fillStyle = `rgba(96,165,250,${0.32 * h.a})`; ctx.fill(); ctx.strokeStyle = `rgba(147,197,253,${0.8 * h.a})`; ctx.lineWidth = 2; ctx.stroke();
          }
        }
        if (w.pathA > 0 && w.path) {
          ctx.strokeStyle = `rgba(${LIME},${w.pathA})`; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); w.path.forEach((h, i) => ctx[i ? "lineTo" : "moveTo"](h.x, h.y)); ctx.stroke();
          const e = w.path[w.path.length - 1]; hexPath(ctx, e.x, e.y, HX.r - 4); ctx.stroke();
        }
      },
      setup(w) {
        w.H = [];
        for (let r = 0; r < 7; r++) for (let c = 0; c < 10; c++) { const p = hexC(c, r); w.H.push({ c, r, x: p.x, y: p.y, a: 0, s: 1, d: 0, rock: [[4, 2], [5, 4], [3, 4], [6, 2]].some(q => q[0] === c && q[1] === r) }); }
        w.at = [4, 3]; const p = hexC(4, 3);
        w.u = w.actor("heroTop", { home: p.x, gy: p.y, h: 44 });
        w.pathA = 0; w.flip = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const reach = w.H.filter(h => !h.rock && (h.d = hexDist([h.c, h.r], w.at)) <= 3 && h.d > 0);
        reach.forEach(h => { h.a = 1; h.s = 1; });
        w.emit("show", reach);
        const far = reach.filter(h => h.d === 3 && (w.flip ? h.c < w.at[0] : h.c > w.at[0]) && h.c > 0 && h.c < 9 && h.r > 0 && h.r < 6);
        w.flip = 1 - w.flip;
        let goal = pick(far.length ? far : reach); const path = [w.H.find(h => h.c === w.at[0] && h.r === w.at[1])];
        let cur = path[0];
        for (let g = 0; g < 6 && cur !== goal; g++) { const next = w.H.filter(h => !h.rock && !path.includes(h) && hexDist([h.c, h.r], [cur.c, cur.r]) === 1).sort((a, b) => hexDist([a.c, a.r], [goal.c, goal.r]) - hexDist([b.c, b.r], [goal.c, goal.r]))[0]; path.push(next); cur = next; }
        goal = cur; w.path = path; w.at = [goal.c, goal.r];
        w.after(0.45, () => {
          w.emit("move", path, w.u);
          const done = () => { w.emit("land", goal); reach.forEach(h => w.tween(h, { a: 0 }, 0.25)); w.tween(w, { pathA: 0 }, 0.25); w.after(0.3, () => { w.busy = false; }); };
          if (w.on("hop")) w.emit("hop", path, w.u, done);
          else w.tween(w.u, { x: goal.x, gy: goal.y }, 0.25, "inout", done);
        });
      },
      steps: [
        {
          id: "ripple", name: { en: "Ripple Out", ko: "물결처럼 퍼짐" }, param: "60ms per ring",
          cap: { en: "Reveal range *ring by ring* from the unit.", ko: "유닛에서 *한 겹씩* 퍼져 나가요." },
          show(w, list) { list.forEach(h => { h.a = 0; w.after(h.d * 0.06, () => w.tween(h, { a: 1 }, 0.12)); }); },
        },
        {
          id: "pop", name: { en: "Tile Pop", ko: "칸 톡" }, param: "0.3 → 1 · back",
          cap: { en: "Each tile *pops* into place.", ko: "칸마다 *톡* 튀어나와요." },
          show(w, list) { list.forEach(h => { h.s = 0.3; w.after(h.d * 0.06, () => w.tween(h, { s: 1 }, 0.2, "back")); }); },
        },
        {
          id: "path", name: { en: "Path Preview", ko: "경로 미리보기" }, param: "lime line + goal",
          cap: { en: "Draw the *exact path* before moving.", ko: "움직이기 전에 *갈 길*을 그어요." },
          show(w) { w.pathA = 0; w.after(0.25, () => w.tween(w, { pathA: 1 }, 0.15)); },
        },
        {
          id: "hop", name: { en: "Tile Hops", ko: "칸마다 깡충" }, param: "110ms / tile",
          cap: { en: "Hop *tile by tile*. Distance you can count.", ko: "*한 칸씩* 깡충. 몇 칸 갔는지 보여요." },
          hop(w, path, u, done) {
            path.slice(1).forEach((h, i) => w.after(i * 0.12, () => {
              w.tween(u, { x: h.x, gy: h.y }, 0.11, "out"); u.sx = u.sy = 1.3;
              if (i === path.length - 2) w.after(0.11, done); else w.emit("step", h);
            }));
          },
        },
        {
          id: "dust", name: { en: "Landing Dust", ko: "착지 먼지" }, param: "puffs per hop",
          cap: { en: "A little *puff* on every landing.", ko: "닿을 때마다 *먼지* 폴폴." },
          step(w, h) { dust(w, h.x, h.y + 8, 3); },
          land(w, h) { dust(w, h.x, h.y + 8, 6); w.spawn({ type: "ring", x: h.x, y: h.y, size: 10, size1: 36, life: 0.3, w: 4, color: LIME }); },
        },
        {
          id: "sound", name: { en: "Tick Ripple + Taps", ko: "틱틱 + 톡톡" }, param: "tick / ring · tap / hop",
          cap: { en: "*Ticks* ripple out, *taps* on each hop.", ko: "퍼질 때 *틱틱*, 뛸 때 *톡톡*." },
          show(w) { for (let i = 1; i <= 3; i++) w.after(i * 0.06, () => w.sfx.blip(i * 2)); },
          step(w) { w.sfx.tock(); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 20. 공격 범위 */
    {
      id: "strategy-range", cat: "strategy", view: "iso",
      title: { en: "Make attack range *clear*", ko: "공격 범위를 *분명하게*" },
      intro: { en: "Red tiles. *Who can I hit?*", ko: "빨간 칸. *누굴 칠 수 있죠?*" },
      interval: 1.7, stepDur: 3.8,
      drawFloor(w, ctx) {
        const A = w.A;
        isoGrid(ctx, 6, 6);
        for (const t of A.tiles) if (t.a > 0.01) isoTile(ctx, t.gx, t.gy, `rgba(248,113,113,${0.3 * t.a * A.pulse})`, null);
        if (A.edge > 0) {
          ctx.strokeStyle = `rgba(254,202,202,${A.edge})`; ctx.lineWidth = 3; ctx.lineCap = "round";
          const inR = (x, y) => A.tiles.some(t => t.gx === x && t.gy === y);
          for (const t of A.tiles) {
            const { gx: x, gy: y } = t, sides = [[0, -1, [x, y], [x + 1, y]], [1, 0, [x + 1, y], [x + 1, y + 1]], [0, 1, [x + 1, y + 1], [x, y + 1]], [-1, 0, [x, y + 1], [x, y]]];
            for (const [dx, dy, a, b] of sides) if (!inR(x + dx, y + dy)) { const p = isoPt(...a), q = isoPt(...b); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
          }
        }
      },
      setup(w) {
        w.hero = { gx: 1, gy: 3 };
        w.foes = [{ gx: 3, gy: 2, flash: 0 }, { gx: 2, gy: 5, flash: 0 }, { gx: 5, gy: 1, flash: 0 }, { gx: 4, gy: 5, flash: 0 }];
        w.A = { tiles: [], edge: 0, pulse: 1, mark: 0, dim: false, id: 0 };
      },
      fire(w) {
        const A = w.A, h = w.hero, id = ++A.id;
        A.tiles = [];
        for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const d = Math.abs(x - h.gx) + Math.abs(y - h.gy); if (d > 0 && d <= 3) A.tiles.push({ gx: x, gy: y, d, a: 1 }); }
        w.foes.forEach(f => { f.inR = Math.abs(f.gx - h.gx) + Math.abs(f.gy - h.gy) <= 3; });
        w.emit("show", A);
        w.after(1.35, () => { if (A.id === id) { A.tiles.forEach(t => w.tween(t, { a: 0 }, 0.2)); A.edge = 0; A.mark = 0; A.dim = false; } });
      },
      drawFront(w, ctx) {
        const A = w.A, list = [{ gx: w.hero.gx, gy: w.hero.gy, me: true }, ...w.foes].sort((a, b) => a.gx + a.gy - b.gx - b.gy);
        for (const u of list) {
          const p = isoPt(u.gx + 0.5, u.gy + 0.5), key = u.me ? "hero" : "foe", c = SPR[key].c, hh = u.me ? 74 : 60, ww = hh * c.width / c.height;
          ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 20, 9, 0, 0, TAU); ctx.fill();
          ctx.save(); ctx.globalAlpha = !u.me && A.dim && !u.inR ? 0.3 : 1;
          ctx.drawImage(c, p.x - ww / 2, p.y + 6 - hh, ww, hh);
          if (u.flash > 0) { ctx.globalAlpha = u.flash; ctx.drawImage(SPR.foe.red, p.x - ww / 2, p.y + 6 - hh, ww, hh); }
          ctx.restore();
          if (!u.me && u.inR && A.mark > 0) {
            const y = p.y - hh - 8 - Math.abs(Math.sin(w.time * 8)) * 10;
            ctx.fillStyle = "#f87171"; ctx.strokeStyle = "#0b0c10"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(p.x - 10, y - 12); ctx.lineTo(p.x + 10, y - 12); ctx.lineTo(p.x, y); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
        }
      },
      update(w, dt) { for (const f of w.foes) f.flash = Math.max(0, f.flash - dt * 2); },
      steps: [
        {
          id: "wave", name: { en: "Fill Outward", ko: "바깥으로 채우기" }, param: "70ms per step",
          cap: { en: "Fill tiles *outward* from the attacker.", ko: "공격하는 쪽부터 *바깥으로* 채워요." },
          show(w, A) { A.tiles.forEach(t => { t.a = 0; w.after(t.d * 0.07, () => w.tween(t, { a: 1 }, 0.12)); }); },
        },
        {
          id: "edge", name: { en: "Bright Border", ko: "밝은 경계선" }, param: "outline only",
          cap: { en: "Draw only the *outer border*. Easy to read.", ko: "*바깥 경계선*만 진하게. 한눈에 읽혀요." },
          show(w, A) { A.edge = 0; w.after(0.24, () => { A.edge = 1; }); },
        },
        {
          id: "targets", name: { en: "Target Arrows", ko: "표적 화살표" }, param: "bounce + red flash",
          cap: { en: "Mark *who you can hit* with a bouncing arrow.", ko: "*칠 수 있는 적*에 통통 화살표." },
          show(w, A) { A.mark = 1; w.foes.forEach(f => { if (f.inR) f.flash = 1; }); },
        },
        {
          id: "dim", name: { en: "Dim the Rest", ko: "나머지는 흐리게" }, param: "out of range 30%",
          cap: { en: "Fade enemies *out of reach*.", ko: "*닿지 않는* 적은 흐리게." },
          show(w, A) { A.dim = true; },
        },
        {
          id: "pulse", name: { en: "Danger Pulse", ko: "두근거림" }, param: "alpha 0.6–1 · 4Hz",
          cap: { en: "The red zone *pulses*. It's dangerous.", ko: "빨간 칸이 *두근두근*. 위험하니까." },
          update(w) { w.A.pulse = 0.8 + 0.35 * Math.sin(w.time * 9); },
        },
        {
          id: "sound", name: { en: "Lock-on Beep", ko: "조준 삑" }, param: "sweep + 2 beeps",
          cap: { en: "A *sweep* out, a *beep* per target.", ko: "퍼질 때 *슥*, 표적마다 *삑*." },
          show(w) {
            w.sfx.swish();
            w.foes.filter(f => f.inR).forEach((f, i) => w.after(0.25 + i * 0.1, () => w.play(() => tn({ type: "square", f: 1200, dur: 0.05, vol: 0.08 }))));
          },
        },
      ],
    },

    /* 21. 전장의 안개 */
    {
      id: "strategy-fog", cat: "strategy", view: "top",
      title: { en: "Make fog of war *feel alive*", ko: "전장의 안개를 *살아 있게*" },
      intro: { en: "Black squares. *Pop, pop.*", ko: "까만 네모가 *툭툭* 사라져요." },
      interval: 1.1, stepDur: 3.8,
      drawFloor(w, ctx) { field(ctx); },
      setup(w) {
        w.fc = document.createElement("canvas"); w.fc.width = 18; w.fc.height = 12;
        w.fog = new Float32Array(216).fill(1); w.seen = new Uint8Array(216);
        w.way = [[90, 280], [200, 190], [330, 260], [430, 150], [320, 80], [160, 90]];
        w.sc = { x: 90, y: 280, rot: 0 }; w.k = 0;
        w.out = { x: 445, y: 120, found: false };
        w.gob = w.actor("foeTop", { home: 330, gy: 300, h: 44 });
        w.post = { x: 460, y: 120 };
      },
      fire(w) {
        w.k++;
        if (w.k % w.way.length === 0) { w.seen.fill(0); w.fog.fill(1); w.out.found = false; }
        const [x, y] = w.way[w.k % w.way.length], s = w.sc;
        s.rot = Math.atan2(y - s.y, x - s.x);
        w.tween(s, { x, y }, 0.6, "inout");
        w.soft = false; w.memA = 0;
        w.emit("move", s);
      },
      update(w, dt) {
        const s = w.sc;
        for (let i = 0; i < 216; i++) {
          const cx = (i % 18) * 30 + 15, cy = ((i / 18) | 0) * 30 + 15, vis = Math.hypot(cx - s.x, cy - s.y) < 95;
          if (vis) w.seen[i] = 1;
          w.fogT = vis ? 0 : w.seen[i] ? w.memA || 0 : 1;
          if (w.on("fade")) w.emit("fade", i, w.fogT, dt); else w.fog[i] = w.fogT;
        }
        const o = w.out;
        if (!o.found && Math.hypot(o.x - s.x, o.y - s.y) < 95) { o.found = true; w.emit("found", o); }
      },
      drawBack(w, ctx) {
        const p = w.post;
        ctx.fillStyle = "#7f1d1d"; ctx.strokeStyle = "#f87171"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(p.x - 28, p.y - 28, 56, 56, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f87171"; ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x + 16, p.y); ctx.lineTo(p.x, p.y + 16); ctx.lineTo(p.x - 16, p.y); ctx.closePath(); ctx.fill();
      },
      drawFront(w, ctx) {
        const x = w.fc.getContext("2d"), img = x.createImageData(18, 12);
        for (let i = 0; i < 216; i++) { img.data[i * 4] = 8; img.data[i * 4 + 1] = 9; img.data[i * 4 + 2] = 13; img.data[i * 4 + 3] = Math.round(w.fog[i] * 255); }
        x.putImageData(img, 0, 0);
        ctx.save(); ctx.imageSmoothingEnabled = !!w.soft; ctx.drawImage(w.fc, 0, 0, 540, 360); ctx.restore();
        const s = w.sc, c = SPR.heroTop.c;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.drawImage(c, -24, -24, 48, 48); ctx.restore();
      },
      steps: [
        {
          id: "soft", name: { en: "Soft Edges", ko: "부드러운 경계" }, param: "bilinear blur",
          cap: { en: "Blur the fog edge. *No hard squares.*", ko: "안개 끝을 흐리게. *네모 각은 그만.*" },
          move(w) { w.soft = true; },
        },
        {
          id: "fade", name: { en: "Fade, Don't Pop", ko: "툭 말고 스르륵" }, param: "lerp ×5",
          cap: { en: "Fog *melts away*. It doesn't blink out.", ko: "안개가 *스르륵* 걷혀요. 툭 꺼지지 않게." },
          fade(w, i, target, dt) { w.fog[i] += (target - w.fog[i]) * Math.min(1, dt * 5); },
        },
        {
          id: "memory", name: { en: "Remembered Areas", ko: "기억하는 땅" }, param: "seen = 55% fog",
          cap: { en: "Places you left go *gray*, not black.", ko: "떠난 곳은 까맣지 말고 *회색*으로." },
          move(w) { w.memA = 0.55; },
        },
        {
          id: "found", name: { en: "Discovery Ping", ko: "발견 알림" }, param: "! + 2 rings",
          cap: { en: "Found something? *Ping* it.", ko: "뭔가 찾았으면 *핑!*" },
          found(w, o) {
            w.spawn({ type: "text", text: "!", x: o.x + 15, y: o.y - 45, vy: -20, life: 1.4, size: 40, color: "#f87171" });
            for (let i = 0; i < 2; i++) w.after(i * 0.18, () => w.spawn({ type: "ring", x: o.x + 15, y: o.y, size: 20, size1: 80, life: 0.6, w: 5, color: "248,113,113" }));
          },
        },
        {
          id: "wisps", name: { en: "Fog Wisps", ko: "안개 자락" }, param: "drifting puffs",
          cap: { en: "Wisps *drift* at the edge of sight.", ko: "시야 끝에서 *안개 자락*이 흘러요." },
          update(w, dt) {
            if (Math.random() > dt * 14) return;
            const a = rand(0, TAU), s = w.sc;
            w.spawn({ type: "smoke", x: s.x + Math.cos(a) * 92, y: s.y + Math.sin(a) * 92, vx: -Math.sin(a) * 30, vy: Math.cos(a) * 30, size: 8, size1: 20, life: 1.0, color: "70,78,96" });
          },
        },
        {
          id: "sound", name: { en: "Breeze + Ping", ko: "바람 + 핑" }, param: "soft noise · ping",
          cap: { en: "A soft *breeze* as fog clears, a *ping* on discovery.", ko: "걷힐 때 *쉬이*, 찾으면 *핑*." },
          move(w) { w.play(() => nz({ type: "bandpass", f: 500, f2: 1400, q: 0.8, dur: 0.5, vol: 0.12 })); },
          found(w) { w.sfx.ping(); },
        },
      ],
    },

    /* 22. 거점 점령 */
    {
      id: "strategy-capture", cat: "strategy", view: "top",
      title: { en: "Make capturing *tense*", ko: "거점 점령을 *쫄깃하게*" },
      intro: { en: "Standing in a circle. *Doing what?*", ko: "원 안에 서 있어요. *뭐 하는 거죠?*" },
      interval: 2.0, stepDur: 4.0,
      drawFloor(w, ctx) { field(ctx); },
      setup(w) {
        w.Z = { x: 290, y: 190, r: 80, p: 0, own: 0, ring: false, fill: false, flag: false };
        w.units = [[255, 170], [320, 160], [295, 225]].map(([x, y]) => w.actor("heroTop", { home: x, gy: y, h: 42 }));
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const Z = w.Z; Z.p = 0; Z.own = 0;
        w.emit("start", Z);
        w.tween(Z, { p: 1 }, 1.0, "lin", () => { Z.own = 1; w.emit("captured", Z); w.after(0.4, () => { w.busy = false; }); });
      },
      drawBack(w, ctx) {
        const Z = w.Z, col = Z.own ? "96,165,250" : "248,113,113";
        circle(ctx, Z.x, Z.y, Z.r, `rgba(${col},0.08)`, `rgba(${col},0.5)`, 2);
        if (Z.fill && !Z.own) circle(ctx, Z.x, Z.y, Z.r * Z.p, "rgba(96,165,250,0.25)");
        if (Z.ring) {
          ctx.lineCap = "round"; ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 9;
          ctx.beginPath(); ctx.arc(Z.x, Z.y, Z.r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * Z.p); ctx.stroke();
        }
      },
      drawFront(w, ctx) {
        const Z = w.Z, col = Z.own ? "#60a5fa" : "#f87171";
        if (Z.flag) {
          const h = 40 + 50 * (Z.own ? 1 : Z.p), x = Z.x + 70, y = Z.y - 50;
          ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 100); ctx.stroke();
          ctx.fillStyle = Z.p > 0.5 || Z.own ? "#60a5fa" : "#f87171"; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + 34, y - h + 11 + Math.sin(w.time * 9) * 3); ctx.lineTo(x, y - h + 22); ctx.closePath(); ctx.fill();
        }
        if (!Z.ring) numText(ctx, Math.round(Z.p * 100) + "%", Z.x, Z.y - Z.r - 18, 18, col, "center");
        else numText(ctx, Math.round(Z.p * 100) + "%", Z.x, Z.y - Z.r - 30, 26, Z.own ? "#93c5fd" : "#fff", "center");
      },
      steps: [
        {
          id: "ring", name: { en: "Progress Ring", ko: "둘레 진행 막대" }, param: "arc · thick",
          cap: { en: "A *ring* fills around the zone.", ko: "거점 *둘레*가 차올라요." },
          start(w, Z) { Z.ring = true; },
        },
        {
          id: "fill", name: { en: "Color Spreads", ko: "색이 번짐" }, param: "radius = progress",
          cap: { en: "Your color *spreads* from the center.", ko: "가운데부터 *우리 색*이 번져요." },
          start(w, Z) { Z.fill = true; },
        },
        {
          id: "flow", name: { en: "Capture Flow", ko: "점령 기운" }, param: "glows → center",
          cap: { en: "Show units *pouring* power into it.", ko: "유닛들이 힘을 *쏟아붓는* 게 보여요." },
          update(w, dt) {
            if (!w.busy || w.Z.own || Math.random() > dt * 30) return;
            const u = pick(w.units), Z = w.Z;
            w.spawn({ type: "glow", seek: true, x: u.x, y: u.gy, tx: Z.x, ty: Z.y, life: 0.4, size: 8, color: "147,197,253" });
          },
        },
        {
          id: "flag", name: { en: "Rising Flag", ko: "올라가는 깃발" }, param: "height = progress",
          cap: { en: "A *flag* climbs and flips color halfway.", ko: "*깃발*이 오르다 중간에 색이 바뀌어요." },
          start(w, Z) { Z.flag = true; },
        },
        {
          id: "burst", name: { en: "Capture Burst", ko: "점령 폭발" }, param: "ring + flash + text",
          cap: { en: "On capture: a *blue blast* and a word.", ko: "점령 순간 *파란 폭발*과 한마디." },
          captured(w, Z) {
            w.flash("96,165,250", 0.35);
            w.spawn({ type: "ring", x: Z.x, y: Z.y, size: Z.r, size1: Z.r * 2.2, life: 0.6, w: 12, color: "147,197,253" });
            w.spawn({ type: "text", text: "CAPTURED", x: Z.x, y: Z.y + Z.r + 24, vy: -10, life: 1.5, size: 30, color: "#93c5fd" });
            w.units.forEach(u => { u.sx = u.sy = 1.3; u.flash = 1; });
          },
        },
        {
          id: "sound", name: { en: "Rising Ticks", ko: "올라가는 틱" }, param: "10 ticks · chime",
          cap: { en: "*Ticks* climb in pitch, then a bright *chime*.", ko: "*틱틱틱* 점점 높게, 끝에 *띵!*" },
          start(w) { for (let i = 0; i < 10; i++) w.after(i * 0.1, () => w.sfx.blip(i + 1)); },
          captured(w) { w.sfx.chime(7); w.sfx.burst(); },
        },
      ],
    },

    /* 23. 연구 완료 */
    {
      id: "strategy-research", cat: "strategy", view: "ui",
      title: { en: "Celebrate *research done*", ko: "연구 완료를 *축하하기*" },
      intro: { en: "Bar full. Text says \"Done\". *Yay?*", ko: "막대 꽉 참. \"완료\". *야호…?*" },
      interval: 1.7, stepDur: 3.8,
      drawFloor(w, ctx) { ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.beginPath(); ctx.roundRect(70, 150, 400, 120, 16); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1.5; ctx.stroke(); },
      setup(w) { w.Q = { p: 0.7, shown: 0.7, done: false, s: 1, toast: -60, shine: -1 }; },
      fire(w) {
        const Q = w.Q;
        Q.done = false; Q.p = 0.7; Q.shown = 0.7; Q.toast = -60;
        w.after(0.45, () => { Q.p = 1; w.emit("fill", Q); });
        w.after(0.75, () => { Q.done = true; w.emit("done", Q); });
      },
      update(w, dt) { const Q = w.Q; Q.s += (1 - Q.s) * Math.min(1, dt * 8); if (!w.on("fill")) Q.shown = Q.p; },
      drawFront(w, ctx) {
        const Q = w.Q;
        if (Q.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 130, 210, 70, LIME, Q.glow); ctx.globalCompositeOperation = "source-over"; }
        ctx.save(); ctx.translate(130, 210); ctx.scale(Q.s, Q.s); circle(ctx, 0, 0, 40, "#1f2937", Q.done ? "#c6f432" : "rgba(255,255,255,0.3)", 3); flask(ctx, 0, 2, 1); ctx.restore();
        label(ctx, "ARMOR TECH II", 190, 186, 18, "#fff", "left");
        const x = 190, y = 210, bw = 250, f = Math.min(1, Q.shown);
        ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.beginPath(); ctx.roundRect(x, y, bw, 16, 8); ctx.fill();
        ctx.fillStyle = Q.done ? "#c6f432" : "#4ade80"; ctx.beginPath(); ctx.roundRect(x, y, bw * f, 16, 8); ctx.fill();
        if (Q.shine > -1 && Q.shine < 1.2) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, bw * f, 16, 8); ctx.clip(); const sx = x + Q.shine * bw; const g = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.8)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(sx - 30, y, 60, 16); ctx.restore(); }
        label(ctx, Q.done ? "DONE" : Math.round(f * 100) + "%", x + bw, 248, 18, Q.done ? "#c6f432" : "rgba(255,255,255,0.75)", "right");
        if (Q.toast > -60) {
          ctx.save(); ctx.translate(270, Q.toast);
          ctx.fillStyle = "rgba(20,24,16,0.95)"; ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-160, -26, 320, 52, 12); ctx.fill(); ctx.stroke();
          label(ctx, "RESEARCH COMPLETE", 0, 1, 22, "#c6f432");
          ctx.restore();
        }
      },
      steps: [
        {
          id: "fill", name: { en: "Smooth Fill + Shine", ko: "부드럽게 + 반짝" }, param: "ease-out · sweep",
          cap: { en: "The bar *slides* full, then a *shine* sweeps.", ko: "막대가 *스르륵* 차고 *반짝* 훑어요." },
          fill(w, Q) { w.tween(Q, { shown: 1 }, 0.26, "out"); Q.shine = -0.2; w.after(0.28, () => w.tween(Q, { shine: 1.2 }, 0.35, "lin")); },
        },
        {
          id: "pop", name: { en: "Icon Pop + Glow", ko: "아이콘 톡 + 빛" }, param: "1.35× · glow 1.2s",
          cap: { en: "The icon *pops* and *glows*.", ko: "아이콘이 *톡* 커지며 *빛나요*." },
          done(w, Q) { Q.s = 1.35; Q.glow = 1; w.tween(Q, { glow: 0 }, 1.4, "in"); },
        },
        {
          id: "rays", name: { en: "Rays", ko: "빛줄기" }, param: "10 rays · spin",
          cap: { en: "*Rays* spin out behind it.", ko: "뒤로 *빛줄기*가 돌아요." },
          done(w) { w.spawn({ type: "rays", under: true, x: 130, y: 210, size: 120, n: 10, vr: 1, life: 1.5, color: "198,244,50" }); },
        },
        {
          id: "toast", name: { en: "Toast Message", ko: "알림 띠" }, param: "drop in · 1.2s",
          cap: { en: "A *toast* drops in: say what happened.", ko: "*알림*이 툭 내려와서 무슨 일인지 말해요." },
          done(w, Q) { Q.toast = -40; w.tween(Q, { toast: 80 }, 0.3, "back", () => w.after(1.0, () => w.tween(Q, { toast: -60 }, 0.25, "in"))); },
        },
        {
          id: "stars", name: { en: "Star Burst", ko: "별 터짐" }, param: "10 stars",
          cap: { en: "*Stars* burst from the icon.", ko: "아이콘에서 *별*이 팡." },
          done(w) { for (let i = 0; i < 10; i++) { const a = rand(0, TAU), s = rand(120, 260); w.spawn({ type: "star", x: 130, y: 210, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3, size: rand(8, 14), life: rand(0.7, 1.1), color: "255,255,255" }); } },
        },
        {
          id: "sound", name: { en: "Fanfare", ko: "팡파르" }, param: "fill whoosh · fanfare",
          cap: { en: "A rising *whoosh*, then a *fanfare*.", ko: "차오르는 *쓔웅*, 그리고 *빰빠밤*." },
          fill(w) { w.sfx.charge(); },
          done(w) { w.sfx.fanfare(); },
        },
      ],
    },

    /* 24. 진급 */
    {
      id: "strategy-promote", cat: "strategy", view: "side",
      title: { en: "Make promotions feel *proud*", ko: "진급을 *뿌듯하게*" },
      intro: { en: "One more stripe. *Barely visible.*", ko: "계급장 하나 늘었어요. *잘 안 보여요.*" },
      interval: 1.6, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 270 }); w.Rk = { n: 1, drop: 1, aura: 0 }; },
      fire(w) {
        const R = w.Rk; R.n = R.n >= 4 ? 1 : R.n + 1;
        w.emit("promote", w.hero, R);
      },
      update(w, dt) { w.Rk.aura = Math.max(0, w.Rk.aura - dt * 0.7); },
      drawFront(w, ctx) {
        const R = w.Rk, x = 270, y0 = 92;
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.roundRect(x - 30, y0 - 26 - R.n * 7, 60, 30 + R.n * 14, 8); ctx.fill();
        for (let i = 0; i < R.n; i++) {
          const last = i === R.n - 1, y = y0 - (R.n - 1) * 7 + i * 14 - (last ? (1 - R.drop) * 70 : 0), s = last ? 1 + (1 - R.drop) * 1.2 : 1;
          chevron(ctx, x, y - 4, s * 0.9, "#facc15");
        }
      },
      steps: [
        {
          id: "beam", name: { en: "Spotlight", ko: "스포트라이트" }, param: "beam 1.2s",
          cap: { en: "Put the unit in a *spotlight*.", ko: "유닛에게 *조명*을 쏴요." },
          promote(w, h) { w.spawn({ type: "beam", under: true, x: h.x, y: G, size: 70, h: 360, life: 1.3, color: "253,224,71" }); },
        },
        {
          id: "slam", name: { en: "Stripe Slam", ko: "계급장 쾅" }, param: "drop 70px · 200ms",
          cap: { en: "The new stripe *slams* onto the badge.", ko: "새 계급장이 *쾅* 박혀요." },
          promote(w, h, R) { R.drop = 0; w.tween(R, { drop: 1 }, 0.2, "in", () => { w.shake(0.15); sparks(w, 270, 92, 10, "253,224,71", [120, 300]); }); },
        },
        {
          id: "flash", name: { en: "Stand Tall", ko: "어깨 쫙" }, param: "flash + sy 1.15",
          cap: { en: "The unit *flashes* and *stands taller*.", ko: "유닛이 *번쩍*, *쭉* 펴져요." },
          promote(w, h) { h.flash = 1.2; h.sy = 1.15; h.sx = 0.92; },
        },
        {
          id: "stats", name: { en: "Stat Popups", ko: "능력치 표시" }, param: "+ATK +HP",
          cap: { en: "Say *what got better*: +ATK, +HP.", ko: "*뭐가 좋아졌는지*: +공격, +체력." },
          promote(w, h) {
            w.spawn({ type: "text", text: "+ATK", x: h.x - 90, y: G - 90, vy: -50, life: 1.4, size: 24, color: "#fca5a5" });
            w.after(0.12, () => w.spawn({ type: "text", text: "+HP", x: h.x + 90, y: G - 90, vy: -50, life: 1.4, size: 24, color: "#86efac" }));
          },
        },
        {
          id: "aura", name: { en: "Golden Aura", ko: "금빛 기운" }, param: "embers 1.4s",
          cap: { en: "Gold *embers* keep rising for a moment.", ko: "*금빛 불씨*가 잠시 피어올라요." },
          promote(w, h, R) { R.aura = 1; },
          update(w, dt) {
            const R = w.Rk; if (R.aura <= 0 || Math.random() > dt * 40) return;
            w.spawn({ type: "glow", x: w.hero.x + rand(-45, 45), y: G - rand(0, 30), vy: rand(-160, -80), size: rand(5, 9), size1: 0, life: rand(0.6, 1), color: "253,224,71" });
          },
        },
        {
          id: "sound", name: { en: "Fanfare + Stamp", ko: "팡파르 + 쾅" }, param: "stamp · fanfare",
          cap: { en: "A *stamp*, then a proud *fanfare*.", ko: "*쾅* 박고, 당당한 *빰빠밤*." },
          promote(w) { w.after(0.2, () => { w.sfx.thunk(); w.sfx.fanfare(); }); },
        },
      ],
    },
  );

  /* ───────── 알림 · 미니맵 · 기술 · 말 · 주사위 · 버튼 도우미 ───────── */
  function lockIcon(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, 0); ctx.lineTo(6, 0); ctx.moveTo(-6, 0); ctx.lineTo(-6, -4); ctx.stroke();
    ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.roundRect(-9, 0, 18, 13, 3); ctx.fill();
    ctx.restore();
  }
  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function die(ctx, d) {
    const s = 46 * (1 + d.z * 0.6) * d.s;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(d.x + 6 + d.z * 30, d.y + 10 + d.z * 40, 26, 14, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(d.x, d.y - d.z * 40); ctx.rotate(d.rot); ctx.scale(s / 46, s / 46);
    if (d.glow > 0) { ctx.save(); ctx.shadowColor = `rgba(253,224,71,${d.glow})`; ctx.shadowBlur = 24; ctx.fillStyle = `rgba(253,224,71,${d.glow})`; ctx.beginPath(); ctx.roundRect(-27, -27, 54, 54, 12); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = "#f8fafc"; ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-23, -23, 46, 46, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(-23, 14, 46, 6);
    ctx.fillStyle = d.v === 1 ? "#dc2626" : "#111827";
    for (const [i, k] of PIPS[d.v]) { ctx.beginPath(); ctx.arc(i * 12, k * 12, d.v === 1 ? 7 : 5, 0, TAU); ctx.fill(); }
    if (d.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${d.flash})`; ctx.beginPath(); ctx.roundRect(-23, -23, 46, 46, 10); ctx.fill(); }
    ctx.restore();
  }

  RECIPES.push(
    /* 25. 알림 핑 */
    {
      id: "strategy-ping", cat: "strategy", view: "top",
      title: { en: "Make alerts *grab attention*", ko: "알림 핑이 *눈길을 끌게*" },
      intro: { en: "\"Under attack!\" …*Where?*", ko: "\"공격받고 있습니다!\" …*어디요?*" },
      interval: 1.5, stepDur: 3.8,
      drawFloor(w, ctx) { field(ctx); },
      setup(w) {
        [[110, 250], [180, 290], [330, 150], [250, 210]].forEach(([x, y], i) => { const u = w.actor("heroTop", { home: x, gy: y, h: 40 }); u.rot = i; });
        w.spots = [[420, 250], [140, 110], [400, 100], [250, 290]]; w.k = 0;
        w.al = { x: 0, y: 0, t: 9, id: 0 };
      },
      fire(w) {
        const [x, y] = w.spots[w.k++ % w.spots.length], al = w.al;
        al.x = x; al.y = y; al.t = 0; al.id++;
        w.spawn({ type: "circle", x, y, size: 11, life: 1.4, hold: true, color: "248,113,113", add: false });
        w.emit("alert", al);
      },
      update(w, dt) { w.al.t += dt; },
      drawBack(w, ctx) {
        const al = w.al;
        if (al.pulse && al.t < 1.6) circle(ctx, al.x, al.y, 26 + Math.sin(al.t * 14) * 6, `rgba(248,113,113,${0.3 * (1 - al.t / 1.6)})`, `rgba(248,113,113,${0.8 * (1 - al.t / 1.6)})`, 2);
      },
      drawFront(w, ctx) {
        const al = w.al;
        if (al.icon && al.t < 1.6) {
          const y = al.y - 50 - Math.abs(Math.sin(al.t * 9)) * 14, s = Math.min(1, al.t * 8);
          ctx.save(); ctx.translate(al.x, y); ctx.scale(s, s); ctx.rotate(Math.PI / 4);
          ctx.fillStyle = "#dc2626"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-14, -14, 28, 28, 4); ctx.fill(); ctx.stroke();
          ctx.restore(); numText(ctx, "!", al.x, y + 1, 24, "#fff", "center");
        }
      },
      steps: [
        {
          id: "rings", name: { en: "Expanding Rings", ko: "퍼지는 고리" }, param: "3 rings · 150ms",
          cap: { en: "*Rings* spread from the spot. Eyes follow.", ko: "그 자리에서 *고리*가 퍼져요. 눈이 따라가요." },
          alert(w, al) { for (let i = 0; i < 3; i++) w.after(i * 0.15, () => w.spawn({ type: "ring", x: al.x, y: al.y, size: 8, size1: 90, life: 0.8, w: 5, color: "248,113,113" })); },
        },
        {
          id: "icon", name: { en: "Bouncing Icon", ko: "통통 아이콘" }, param: "! · bounce 9Hz",
          cap: { en: "A *bouncing \"!\"* says what kind of alert.", ko: "*통통 튀는 \"!\"*가 무슨 알림인지 알려줘요." },
          alert(w, al) { al.icon = true; },
        },
        {
          id: "pulse", name: { en: "Ground Pulse", ko: "바닥 두근" }, param: "pulsing disc 1.6s",
          cap: { en: "The ground *throbs* red until you look.", ko: "볼 때까지 바닥이 *두근두근*." },
          alert(w, al) { al.pulse = true; },
        },
        {
          id: "pan", name: { en: "Camera Nudge", ko: "카메라 끌림" }, param: "25% toward · 0.8s",
          cap: { en: "The camera *leans* toward the trouble.", ko: "카메라가 문제 쪽으로 *살짝 끌려가요*." },
          alert(w, al) {
            const id = al.id;
            w.cam.tx = (al.x - 270) * 0.25; w.cam.ty = (al.y - 180) * 0.25;
            w.after(0.8, () => { if (al.id === id) { w.cam.tx = 0; w.cam.ty = 0; } });
          },
        },
        {
          id: "edge", name: { en: "Red Edge Flash", ko: "붉은 가장자리" }, param: "vignette .55",
          cap: { en: "Flash the *screen edge* red once.", ko: "*화면 가장자리*를 한 번 붉게." },
          alert(w) { w.vignette(0.55); },
        },
        {
          id: "sound", name: { en: "Two-tone Alarm", ko: "삐뽀 경고음" }, param: "high-low ×2",
          cap: { en: "A *two-tone* alarm. Nobody misses that.", ko: "*삐-뽀* 두 음. 못 들을 수가 없어요." },
          alert(w) { w.play(() => [0, 1, 2, 3].forEach(i => tn({ type: "square", f: i % 2 ? 660 : 990, dur: 0.1, vol: 0.09, delay: i * 0.11 }))); },
        },
      ],
    },

    /* 26. 미니맵 */
    {
      id: "strategy-minimap", cat: "strategy", view: "ui",
      title: { en: "Make the minimap *talk*", ko: "미니맵이 *말하게*" },
      intro: { en: "Dots. Lots of dots. *So?*", ko: "점, 점, 점. *그래서요?*" },
      interval: 1.5, stepDur: 3.8,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#0f1a14"; ctx.beginPath(); ctx.roundRect(110, 60, 320, 240, 10); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.roundRect(110, 60, 320, 240, 10); ctx.clip();
        ctx.fillStyle = "rgba(74,222,128,0.12)"; [[170, 120, 60, 40], [350, 240, 70, 45], [300, 110, 40, 30]].forEach(([x, y, a, b]) => { ctx.beginPath(); ctx.ellipse(x, y, a, b, 0.4, 0, TAU); ctx.fill(); });
        ctx.strokeStyle = "rgba(56,189,248,0.35)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(110, 200); ctx.quadraticCurveTo(250, 150, 430, 220); ctx.stroke();
        if (w.sweepOn) {
          const a = w.sweep, cx = 270, cy = 180;
          const g = ctx.createConicGradient ? ctx.createConicGradient(a - 1.2, cx, cy) : null;
          if (g) { g.addColorStop(0, "rgba(74,222,128,0)"); g.addColorStop(0.19, "rgba(74,222,128,0.28)"); g.addColorStop(0.191, "rgba(74,222,128,0)"); ctx.fillStyle = g; ctx.fillRect(110, 60, 320, 240); }
          ctx.strokeStyle = "rgba(134,239,172,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 260, cy + Math.sin(a) * 260); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(110, 60, 320, 240, 10); ctx.stroke();
      },
      setup(w) {
        w.dots = [];
        for (let i = 0; i < 7; i++) w.dots.push({ x: rand(140, 260), y: rand(200, 280), vx: rand(-14, 14), vy: rand(-14, 14), team: 0, hit: 0 });
        for (let i = 0; i < 5; i++) w.dots.push({ x: rand(320, 410), y: rand(80, 150), vx: rand(-14, 14), vy: rand(-14, 14), team: 1, hit: 0 });
        w.vb = { x: 150, y: 210 }; w.spots = [[360, 110], [200, 250], [390, 230], [170, 100]]; w.k = 0; w.blinkA = 1; w.sweep = 0; w.ev = null;
      },
      fire(w) {
        const [x, y] = w.spots[w.k++ % w.spots.length];
        w.ev = { x, y, t: 0 };
        w.dots.filter(d => d.team === 1).slice(0, 3).forEach((d, i) => { d.x = x + rand(-14, 14); d.y = y + rand(-14, 14); });
        w.emit("event", w.ev);
      },
      update(w, dt) {
        for (const d of w.dots) {
          d.x += d.vx * dt; d.y += d.vy * dt;
          if (d.x < 120 || d.x > 420) d.vx *= -1; if (d.y < 70 || d.y > 290) d.vy *= -1;
          d.hit = Math.max(0, d.hit - dt * 1.5);
        }
        if (w.ev) w.ev.t += dt;
      },
      drawFront(w, ctx) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(110, 60, 320, 240, 10); ctx.clip();
        for (const d of w.dots) {
          const a = d.team ? w.blinkA : 1, r = 4 + d.hit * 3;
          if (d.hit > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, d.x, d.y, 14, d.team ? "248,113,113" : "96,165,250", d.hit); ctx.globalCompositeOperation = "source-over"; }
          circle(ctx, d.x, d.y, r, d.team ? `rgba(248,113,113,${a})` : "#60a5fa");
        }
        if (w.ev && w.ev.t < 1.6) circle(ctx, w.ev.x, w.ev.y, 5, null, "#fca5a5", 2);
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(w.vb.x - 40, w.vb.y - 28, 80, 56);
        ctx.restore();
      },
      steps: [
        {
          id: "blink", name: { en: "Enemy Blink", ko: "적 깜빡임" }, param: "4Hz",
          cap: { en: "Enemy dots *blink*. Red that moves gets noticed.", ko: "적 점은 *깜빡깜빡*. 움직이는 빨강은 눈에 띄어요." },
          update(w) { w.blinkA = Math.sin(w.time * 25) > 0 ? 1 : 0.25; },
        },
        {
          id: "ping", name: { en: "Event Ping", ko: "사건 핑" }, param: "2 rings",
          cap: { en: "A *ping* where the fight starts.", ko: "싸움이 난 곳에 *핑!*" },
          event(w, ev) { for (let i = 0; i < 2; i++) w.after(i * 0.2, () => w.spawn({ type: "ring", x: ev.x, y: ev.y, size: 6, size1: 46, life: 0.7, w: 4, color: "248,113,113" })); },
        },
        {
          id: "view", name: { en: "View Box Glides", ko: "시야 상자 이동" }, param: "tween 0.35s",
          cap: { en: "The *view box* glides to the event.", ko: "*시야 상자*가 사건 쪽으로 스르륵." },
          event(w, ev) { w.tween(w.vb, { x: Math.max(150, Math.min(390, ev.x)), y: Math.max(88, Math.min(272, ev.y)) }, 0.35, "inout"); },
        },
        {
          id: "sweep", name: { en: "Radar Sweep", ko: "레이더 훑기" }, param: "1 turn / 2.5s",
          cap: { en: "A *radar sweep*. Blips *light up* as it passes.", ko: "*레이더*가 돌며 지나간 점이 *반짝*." },
          update(w, dt) {
            w.sweepOn = true; w.sweep = (w.sweep + dt * 2.5) % TAU;
            for (const d of w.dots) { const a = (Math.atan2(d.y - 180, d.x - 270) + TAU) % TAU; if (Math.abs(a - w.sweep) < 0.06) d.hit = 1; }
          },
        },
        {
          id: "trails", name: { en: "Motion Trails", ko: "움직임 꼬리" }, param: "fade 0.6s",
          cap: { en: "Short *trails* show where things are going.", ko: "짧은 *꼬리*가 어디로 가는지 보여줘요." },
          update(w, dt) { if (Math.random() < dt * 20) for (const d of w.dots) w.spawn({ type: "circle", x: d.x, y: d.y, size: 2.5, life: 0.6, color: d.team ? "248,113,113" : "96,165,250", alpha: 0.6 }); },
        },
        {
          id: "sound", name: { en: "Sonar Blip", ko: "소나 삑" }, param: "ping · 1.2kHz",
          cap: { en: "A *sonar blip* for every event.", ko: "사건마다 *소나 삑*." },
          event(w) { w.play(() => { tn({ f: 1200, f2: 1150, dur: 0.35, vol: 0.12 }); tn({ f: 1200, dur: 0.2, vol: 0.05, delay: 0.18 }); }); },
        },
      ],
    },

    /* 27. 기술 해금 */
    {
      id: "strategy-tech", cat: "strategy", view: "ui",
      title: { en: "Make tech unlocks *flow*", ko: "기술 해금이 *흘러가게*" },
      intro: { en: "Gray turned green. *That's the unlock?*", ko: "회색이 초록이 됐어요. *이게 해금?*" },
      interval: 1.1, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        const N = [[110, 190], [260, 110], [260, 270], [410, 70], [410, 170], [410, 290]];
        w.N = N.map(([x, y], i) => ({ i, x, y, on: i === 0, s: 1, sh: 0 }));
        w.E = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5]].map(([a, b]) => ({ a, b, t: 0 }));
        w.order = [1, 3, 2, 4, 5]; w.k = 0;
      },
      fire(w) {
        if (w.busy) return;
        if (w.k >= w.order.length) { w.k = 0; w.N.forEach(n => { n.on = n.i === 0; }); w.E.forEach(e => { e.t = 0; }); }
        const n = w.N[w.order[w.k++]], e = w.E.find(q => q.b === n.i);
        const unlock = () => { n.on = true; e.t = 1; w.emit("unlock", n); };
        if (w.on("flow")) { w.busy = true; w.emit("flow", e, () => { w.busy = false; unlock(); }); } else unlock();
      },
      update(w, dt) { for (const n of w.N) n.s += (1 - n.s) * Math.min(1, dt * 10); },
      drawBack(w, ctx) {
        for (const e of w.E) {
          const A = w.N[e.a], B = w.N[e.b];
          ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
          const lit = w.on("line") ? e.t : (B.on ? 1 : 0);
          if (lit > 0) { ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(A.x + (B.x - A.x) * lit, A.y + (B.y - A.y) * lit); ctx.stroke(); }
          if (e.orb > 0 && e.orb < 1) { const x = A.x + (B.x - A.x) * e.orb, y = A.y + (B.y - A.y) * e.orb; ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, 22, LIME, 1); glow(ctx, x, y, 8, "255,255,255", 1); ctx.globalCompositeOperation = "source-over"; }
        }
      },
      drawFront(w, ctx) {
        for (const n of w.N) {
          const avail = !n.on && w.E.some(e => e.b === n.i && w.N[e.a].on);
          ctx.save(); ctx.translate(n.x, n.y); ctx.scale(n.s, n.s);
          if (avail && n.sh > 0) { ctx.setLineDash([6, 5]); ctx.lineDashOffset = -w.time * 20; circle(ctx, 0, 0, 38 + Math.sin(w.time * 6) * 3, null, `rgba(${LIME},${n.sh})`, 2.5); ctx.setLineDash([]); }
          circle(ctx, 0, 0, 30, n.on ? "#3f6212" : "#1f2937", n.on ? "#c6f432" : "rgba(255,255,255,0.25)", 3);
          ctx.fillStyle = n.on ? "#ecfccb" : "rgba(255,255,255,0.25)";
          ctx.beginPath(); if (n.i % 3 === 0) ctx.arc(0, 0, 11, 0, TAU); else if (n.i % 3 === 1) { ctx.moveTo(0, -13); ctx.lineTo(12, 9); ctx.lineTo(-12, 9); ctx.closePath(); } else ctx.rect(-10, -10, 20, 20); ctx.fill();
          ctx.restore();
          if (!n.on) lockIcon(ctx, n.x + 22, n.y + 22, 0.9);
        }
      },
      steps: [
        {
          id: "flow", name: { en: "Energy Flow", ko: "흐르는 에너지" }, param: "orb · 250ms",
          cap: { en: "Energy *flows down the line* first.", ko: "먼저 선을 따라 *에너지가 흘러가요*." },
          flow(w, e, done) { e.orb = 0; w.tween(e, { orb: 1 }, 0.25, "in", () => { e.orb = 0; done(); }); },
        },
        {
          id: "line", name: { en: "Line Lights Up", ko: "선이 켜짐" }, param: "lit behind orb",
          cap: { en: "The line *lights up* behind it.", ko: "지나간 뒤로 선이 *켜져요*." },
          update(w) { for (const e of w.E) if (e.orb > 0) e.t = e.orb; },
        },
        {
          id: "pop", name: { en: "Node Pop", ko: "칸 톡" }, param: "1.4× + ring",
          cap: { en: "The node *pops* with a ring.", ko: "칸이 *톡* 커지며 고리." },
          unlock(w, n) { n.s = 1.4; w.spawn({ type: "ring", x: n.x, y: n.y, size: 30, size1: 70, life: 0.5, w: 6, color: LIME }); },
        },
        {
          id: "lock", name: { en: "Lock Breaks", ko: "자물쇠 툭" }, param: "2 pieces fly",
          cap: { en: "The *lock breaks* and falls away.", ko: "*자물쇠*가 툭 끊어져 떨어져요." },
          unlock(w, n) {
            for (let i = 0; i < 2; i++) w.spawn({ type: "chunk", x: n.x + 22, y: n.y + 22, vx: i ? 140 : -60, vy: -260, g: 1200, vr: i ? 12 : -12, life: 0.9, size: 7, color: "203,213,225" });
            sparks(w, n.x + 22, n.y + 22, 6, "255,255,255", [100, 240]);
          },
        },
        {
          id: "next", name: { en: "What's Next", ko: "다음 후보" }, param: "dashed pulse",
          cap: { en: "What you can unlock *next* starts to pulse.", ko: "*다음에* 열 수 있는 칸이 두근대요." },
          update(w) { for (const n of w.N) n.sh = 0.9; },
        },
        {
          id: "sound", name: { en: "Charge + Clack", ko: "쓔웅 + 철컥" }, param: "rise · clack · chime",
          cap: { en: "A rising *whir*, a *clack*, a *chime*.", ko: "*쓔웅*, *철컥*, *띵*." },
          flow(w) { w.play(() => tn({ type: "triangle", f: 300, f2: 900, dur: 0.25, vol: 0.12 })); },
          unlock(w) { w.sfx.pump(); w.sfx.chime(5); },
        },
      ],
    },

    /* 28. 말 잡기 */
    {
      id: "strategy-chess", cat: "strategy", view: "iso",
      title: { en: "Make captures *crunchy*", ko: "말 잡기를 *통쾌하게*" },
      intro: { en: "Slide. Gone. *Was that a capture?*", ko: "스윽, 사라짐. *잡은 거 맞아요?*" },
      interval: 1.4, stepDur: 3.8,
      drawFloor(w, ctx) {
        isoGrid(ctx, 6, 6, (x, y) => ((x + y) % 2 ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.25)"));
        ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.beginPath(); ctx.roundRect(444, 44, 70, 128, 10); ctx.fill();
      },
      setup(w) {
        makeArt();
        w.Wp = { gx: 1, gy: 4, z: 0, sx: 1, sy: 1 };
        w.targets = [[3, 2], [4, 4], [2, 1], [1, 3], [3, 4], [4, 1]]; w.k = 0;
        w.Bp = { gx: 3, gy: 2, z: 0, sx: 1, sy: 1, a: 1, rot: 0, dx: 0, dy: 0 };
        w.tray = 0; w.trayB = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const P = w.Wp, B = w.Bp;
        const land = () => {
          w.emit("capture", B, P);
          if (!w.on("knock")) B.a = 0;
          w.tray = (w.tray % 6) + 1;
          w.after(0.6, () => {
            let t; do { t = w.targets[w.k++ % w.targets.length]; } while (t[0] === P.gx && t[1] === P.gy);
            Object.assign(B, { gx: t[0], gy: t[1], z: 0, a: 0, rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 });
            w.tween(B, { a: 1 }, 0.2, "out", () => { w.busy = false; });
          });
        };
        const to = { gx: B.gx, gy: B.gy };
        if (w.on("hop")) w.emit("hop", P, to, land);
        else w.tween(P, to, 0.35, "inout", land);
      },
      update(w, dt) {
        const k = Math.min(1, dt * 10), P = w.Wp, a = P.arc;
        for (const p of [P, w.Bp]) { p.sx += (1 - p.sx) * k; p.sy += (1 - p.sy) * k; }
        if (a) { P.gx = a.gx + (a.to.gx - a.gx) * a.t; P.gy = a.gy + (a.to.gy - a.gy) * a.t; P.z = Math.sin(a.t * Math.PI) * 60; }
        w.trayB = Math.max(0, w.trayB - dt * 3);
      },
      drawFront(w, ctx) {
        const P = w.Wp, B = w.Bp;
        const draw = (p, key) => {
          if (p.a <= 0.01) return;
          const q = isoPt(p.gx + 0.5, p.gy + 0.5);
          ctx.fillStyle = `rgba(0,0,0,${0.35 * p.a})`; ctx.beginPath(); ctx.ellipse(q.x + (p.dx || 0), q.y + (p.dy || 0) * 0.4, 20, 10, 0, 0, TAU); ctx.fill();
          ctx.save(); ctx.translate(q.x + (p.dx || 0), q.y + 12 - p.z + (p.dy || 0)); ctx.rotate(p.rot || 0);
          drawSpr(ctx, key, 0, 0, 46, { sx: p.sx, sy: p.sy, alpha: p.a == null ? 1 : p.a });
          ctx.restore();
        };
        [[P, "strategy-pieceW"], [B, "strategy-pieceB"]].sort((a, b) => a[0].gx + a[0].gy - b[0].gx - b[0].gy).forEach(([p, k]) => draw(p, k));
        if (w.on("tray")) {
          const s = 1 + w.trayB * 0.4;
          for (let i = 0; i < w.tray; i++) { const y = 164 - i * 15; ctx.save(); ctx.translate(479, y); if (i === w.tray - 1) ctx.scale(s, s); drawSpr(ctx, "strategy-pieceB", 0, 0, 22); ctx.restore(); }
        }
      },
      steps: [
        {
          id: "hop", name: { en: "Arc Jump", ko: "포물선 점프" }, param: "60px arc · 300ms",
          cap: { en: "Jump *over* in an arc. Don't just slide.", ko: "미끄러지지 말고 *포물선*으로 점프." },
          hop(w, P, to, land) {
            P.arc = { gx: P.gx, gy: P.gy, to, t: 0 };
            w.tween(P.arc, { t: 1 }, 0.3, "inout", () => { P.arc = null; P.z = 0; land(); });
          },
        },
        {
          id: "slam", name: { en: "Slam Down", ko: "쾅 내려찍기" }, param: "squash + stop 70ms",
          cap: { en: "*Slam* down: squash, freeze, shake.", ko: "*쾅*: 찌그러지고, 멈칫, 흔들림." },
          capture(w, B, P) { P.sx = 1.3; P.sy = 0.7; w.hitstop(0.07); w.shake(0.25); },
        },
        {
          id: "knock", name: { en: "Knock Off Board", ko: "판 밖으로 날리기" }, param: "spin + fly 0.6s",
          cap: { en: "Send the captured piece *flying* off.", ko: "잡힌 말은 판 밖으로 *날아가요*." },
          capture(w, B) { w.tween(B, { dx: 170, dy: -60, rot: 4, a: 0 }, 0.6, "out"); w.tween(B, { z: 70 }, 0.3, "out", () => w.tween(B, { z: -30 }, 0.3, "in")); },
        },
        {
          id: "shock", name: { en: "Shockwave", ko: "충격파" }, param: "flat ring + dust",
          cap: { en: "A *ring* and *dust* on the square.", ko: "그 칸에 *고리*와 *먼지*." },
          capture(w, B) {
            const q = isoPt(B.gx + 0.5, B.gy + 0.5);
            w.spawn({ type: "ring", flat: true, x: q.x, y: q.y, size: 18, size1: 110, life: 0.5, w: 8, color: "255,255,255" });
            w.spawn({ type: "ellipse", under: true, x: q.x, y: q.y, size: 60, life: 1.4, hold: true, color: "253,224,71" });
            dust(w, q.x, q.y + 4, 10);
            sparks(w, q.x, q.y - 30, 10, "255,240,200", [160, 380]);
          },
        },
        {
          id: "tray", name: { en: "Trophy Tray", ko: "잡은 말 진열" }, param: "stack + bump",
          cap: { en: "Stack captured pieces where you can *see the score*.", ko: "잡은 말을 쌓아 *전적*이 보이게." },
          capture(w) { w.trayB = 1; },
        },
        {
          id: "sound", name: { en: "Tock + Thud", ko: "톡 + 쿵" }, param: "lift · slam",
          cap: { en: "A light *tock* on lift, a heavy *thud* on landing.", ko: "들 때 가볍게 *톡*, 놓을 때 *쿵*." },
          hop(w) { w.sfx.tock(); },
          capture(w) { w.sfx.thud(); },
        },
      ],
    },

    /* 29. 주사위 굴리기 */
    {
      id: "strategy-dice", cat: "strategy", view: "top",
      title: { en: "Make dice rolls *thrilling*", ko: "주사위 굴리기를 *두근두근*" },
      intro: { en: "Numbers changed. *Did I roll?*", ko: "숫자만 바뀌었어요. *굴린 거예요?*" },
      interval: 1.6, stepDur: 3.8,
      drawFloor(w, ctx) {
        ctx.fillStyle = "#14532d"; ctx.beginPath(); ctx.roundRect(40, 50, 460, 270, 24); ctx.fill();
        ctx.strokeStyle = "#78350f"; ctx.lineWidth = 12; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.ellipse(270, 190, 170, 90, 0, 0, TAU); ctx.fill();
      },
      setup(w) {
        w.D = [{ x: 230, y: 200, v: 3 }, { x: 320, y: 190, v: 5 }].map(d => Object.assign(d, { tx: d.x, ty: d.y, x0: d.x, y0: d.y, rot: 0.2, z: 0, s: 1, t: 1, glow: 0, flash: 0, bn: 0 }));
        w.total = 8; w.tot = { s: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const vals = [1 + ((Math.random() * 6) | 0), 1 + ((Math.random() * 6) | 0)];
        w.D.forEach((d, i) => { d.res = vals[i]; d.tx = 225 + i * 95 + rand(-15, 15); d.ty = 195 + rand(-25, 25); });
        w.total = vals[0] + vals[1];
        const settle = () => { w.D.forEach(d => { d.v = d.res; d.x = d.tx; d.y = d.ty; }); w.emit("result", w.D, w.total); w.after(0.5, () => { w.busy = false; }); };
        if (w.on("tumble")) w.emit("tumble", w.D, settle); else settle();
      },
      update(w, dt) {
        for (const d of w.D) { d.s += (1 - d.s) * Math.min(1, dt * 12); d.glow = Math.max(0, d.glow - dt * 0.8); d.flash = Math.max(0, d.flash - dt * 3); }
      },
      drawFront(w, ctx) { [...w.D].sort((a, b) => a.y - b.y).forEach(d => die(ctx, d)); },
      drawHud(w, ctx) {
        if (w.tot.s > 0.01) { ctx.save(); ctx.translate(270, 90); ctx.scale(w.tot.s, w.tot.s); numText(ctx, "= " + w.total, 0, 0, 40, w.total >= 9 ? "#fde047" : "#fff", "center"); ctx.restore(); }
        else label(ctx, "total " + w.total, 270, 300, 13, "rgba(255,255,255,0.6)");
      },
      steps: [
        {
          id: "tumble", name: { en: "Throw + Tumble", ko: "던지고 구르기" }, param: "0.55s · faces flicker",
          cap: { en: "Throw them in. Faces *flicker* as they roll.", ko: "던져 넣고, 구르는 동안 눈이 *휙휙* 바뀌어요." },
          tumble(w, D, settle) {
            D.forEach((d, i) => {
              d.x0 = 60 + i * 20; d.y0 = 120 + i * 120; d.t = 0;
              w.tween(d, { t: 1 }, 0.55, "lin", i ? settle : null);
            });
          },
          update(w) {
            for (const d of w.D) if (d.t < 1) {
              const k = E.out(d.t); d.x = d.x0 + (d.tx - d.x0) * k; d.y = d.y0 + (d.ty - d.y0) * k; d.rot = (1 - k) * 9;
              if (Math.random() < 0.3) d.v = 1 + ((Math.random() * 6) | 0);
            }
          },
        },
        {
          id: "bounce", name: { en: "Bounces", ko: "통통 튀기" }, param: "3 bounces · decay",
          cap: { en: "They *bounce* and lose height each time.", ko: "*통통* 튀며 점점 낮아져요." },
          update(w) {
            for (const d of w.D) {
              if (d.t >= 1) { d.z = 0; continue; }
              const z = Math.abs(Math.sin(d.t * Math.PI * 3)) * (1 - d.t) * 0.9, n = Math.floor(d.t * 3);
              if (n !== d.bn) { d.bn = n; d.s = 0.85; w.emit("clack", d); }
              d.z = z;
            }
          },
        },
        {
          id: "settle", name: { en: "Settle Wobble", ko: "멈출 때 흔들" }, param: "rot spring",
          cap: { en: "A tiny *wobble* as they come to rest.", ko: "멈추면서 *살짝 흔들*." },
          result(w, D) { D.forEach(d => { d.rot = 0.35; d.s = 1.12; w.tween(d, { rot: 0 }, 0.3, "back"); }); },
        },
        {
          id: "flash", name: { en: "Result Flash", ko: "결과 번쩍" }, param: "white + gold glow",
          cap: { en: "Flash the faces, *glow gold* on a high roll.", ko: "눈을 *번쩍*, 높게 나오면 *금빛*." },
          result(w, D, total) { D.forEach(d => { d.flash = 1; if (total >= 7) d.glow = 1; }); if (total >= 9) sparks(w, 270, 190, 16, "253,224,71", [150, 400]); },
        },
        {
          id: "total", name: { en: "Big Total", ko: "합계 크게" }, param: "= N · back",
          cap: { en: "Say the *total*, big and proud.", ko: "*합계*를 크게 말해줘요." },
          result(w) { w.tot.s = 0; w.tween(w.tot, { s: 1 }, 0.25, "back"); },
        },
        {
          id: "sound", name: { en: "Rattle + Clacks", ko: "달그락 + 딱딱" }, param: "per bounce",
          cap: { en: "A *rattle*, then a *clack* on every bounce.", ko: "*달그락*, 튈 때마다 *딱*." },
          tumble(w) { w.sfx.rattle(); },
          clack(w) { w.play(() => tn({ type: "triangle", f: rand(900, 1300), dur: 0.04, vol: 0.2 })); },
          result(w) { w.sfx.tock(); },
        },
      ],
    },

    /* 30. 턴 종료 버튼 */
    {
      id: "strategy-endbtn", cat: "strategy", view: "ui",
      title: { en: "Make \"End Turn\" *ask to be pressed*", ko: "턴 종료 버튼이 *눌러 달라고*" },
      intro: { en: "Nothing left to do. *Now what?*", ko: "할 게 없어요. *이제 뭐 하지?*" },
      interval: 1.6, stepDur: 3.8,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.roundRect(40, 50, 460, 150, 14); ctx.fill();
        label(ctx, "ACTIONS", 70, 250, 13, "rgba(255,255,255,0.5)", "left", "'JetBrains Mono', monospace", 700);
        for (let i = 0; i < 3; i++) circle(ctx, 80 + i * 26, 276, 9, "rgba(255,255,255,0.06)", "rgba(255,255,255,0.25)", 2);
      },
      setup(w) { w.Bt = { ready: true, press: 0, sx: 1, sy: 1, pulse: 1, glow: 0, shine: -1, ringT: 0, hint: false }; },
      fire(w) {
        const B = w.Bt;
        B.ready = false; B.press = 1;
        w.emit("press", B);
        w.after(0.35, () => { B.ready = true; w.emit("ready", B); });
      },
      update(w, dt) {
        const B = w.Bt, k = Math.min(1, dt * 12);
        B.sx += (1 - B.sx) * k; B.sy += (1 - B.sy) * k; B.press = Math.max(0, B.press - dt * 4);
      },
      drawFront(w, ctx) {
        const B = w.Bt, x = 380, y = 272, bw = 190, bh = 62, s = B.pulse;
        if (B.glow > 0 && B.ready) { ctx.globalCompositeOperation = "lighter"; ctx.save(); ctx.translate(x, y); ctx.scale(1.6, 0.75); glow(ctx, 0, 0, 120, LIME, B.glow); ctx.restore(); ctx.globalCompositeOperation = "source-over"; }
        ctx.save(); ctx.translate(x, y); ctx.scale(B.sx * s, B.sy * s);
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2 + 6, bw, bh, 14); ctx.fill();
        ctx.fillStyle = B.ready ? "#c6f432" : "#475569"; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2 + B.press * 4, bw, bh, 14); ctx.fill();
        if (B.shine > -1 && B.shine < 1.3 && B.ready) {
          ctx.save(); ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 14); ctx.clip();
          const sx = -bw / 2 + B.shine * bw; ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.moveTo(sx - 30, bh / 2); ctx.lineTo(sx, -bh / 2); ctx.lineTo(sx + 22, -bh / 2); ctx.lineTo(sx - 8, bh / 2); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        numText(ctx, "END TURN", 0, B.press * 4 + 1, 24, B.ready ? "#1a2e05" : "#cbd5e1", "center");
        ctx.restore();
        if (B.hint && B.ready) {
          const hx = x - bw / 2 - 30 - Math.abs(Math.sin(w.time * 7)) * 14;
          ctx.fillStyle = "#c6f432"; ctx.beginPath(); ctx.moveTo(hx + 16, y); ctx.lineTo(hx - 4, y - 13); ctx.lineTo(hx - 4, y + 13); ctx.closePath(); ctx.fill();
        }
      },
      steps: [
        {
          id: "pulse", name: { en: "Breathing Scale", ko: "숨 쉬는 크기" }, param: "±6% · 1Hz",
          cap: { en: "When ready, the button *breathes*.", ko: "누를 때가 되면 버튼이 *숨을 쉬어요*." },
          update(w) { const B = w.Bt; B.pulse = B.ready ? 1 + 0.06 * Math.sin(w.time * 6) : 1; },
        },
        {
          id: "glow", name: { en: "Halo Glow", ko: "후광" }, param: "lime · breathing",
          cap: { en: "A soft *halo* that breathes with it.", ko: "같이 숨 쉬는 은은한 *후광*." },
          update(w) { w.Bt.glow = 0.35 + 0.25 * Math.sin(w.time * 6); },
        },
        {
          id: "shine", name: { en: "Shine Sweep", ko: "반짝 훑기" }, param: "every 1.2s",
          cap: { en: "A *shine* sweeps across now and then.", ko: "가끔 *반짝*하고 훑고 지나가요." },
          update(w) { w.Bt.shine = ((w.time % 1.2) / 1.2) * 2.6 - 1.2; },
        },
        {
          id: "ripple", name: { en: "Ripple Rings", ko: "퍼지는 물결" }, param: "1 ring / 0.9s",
          cap: { en: "*Ripples* reach out: \"Press me.\"", ko: "*물결*이 퍼져요. \"저 눌러요.\"" },
          update(w, dt) {
            const B = w.Bt; if (!B.ready) return;
            B.ringT -= dt; if (B.ringT > 0) return;
            B.ringT = 0.9;
            w.spawn({ type: "ring", x: 380, y: 272, size: 70, size1: 150, life: 0.9, w: 4, color: LIME });
          },
        },
        {
          id: "hint", name: { en: "Pointing Arrow", ko: "가리키는 화살표" }, param: "bounce 7Hz",
          cap: { en: "A little *arrow* nudges toward it.", ko: "작은 *화살표*가 콕콕 가리켜요." },
          ready(w, B) { B.hint = true; },
        },
        {
          id: "press", name: { en: "Satisfying Press", ko: "누르는 맛" }, param: "squash + flash",
          cap: { en: "Pressing it *squashes* and *flashes*.", ko: "누르면 *꾹* 눌리고 *번쩍*." },
          press(w, B) { B.sx = 1.12; B.sy = 0.82; w.flash("198,244,50", 0.2); w.spawn({ type: "ring", x: 380, y: 272, size: 60, size1: 200, life: 0.4, w: 8, color: "255,255,255" }); },
        },
        {
          id: "sound", name: { en: "Click + Whoosh", ko: "딸깍 + 휙" }, param: "click · whoosh",
          cap: { en: "A firm *click*, then the turn *whooshes* away.", ko: "단단한 *딸깍*, 그리고 턴이 *휙*." },
          press(w) { w.sfx.clickDown(); w.after(0.08, () => { w.sfx.clickUp(); w.sfx.dash(); }); },
        },
      ],
    },
  );

  // 회관 그리기: 진행도(p)·비계·쌓기·막대·완성 상태를 한 곳에서
  function drawHall(ctx, w, B) {
    const c = isoPt(3, 3), base = c.y + 38 * 0.95, W = 150;
    const img = SPR["strategy-hall"].c, H = W * img.height / img.width, top = base - H;
    const showAll = B.done;
    if (!showAll && B.on && !B.frame && !B.rise) drawSpr(ctx, "strategy-hall", c.x, base, W, { alpha: 0.15 + 0.85 * B.p });
    if (!showAll && B.frame) {
      drawSpr(ctx, "strategy-hall", c.x, base, W, { alpha: 0.16 });
      ctx.strokeStyle = "rgba(251,191,36,0.8)"; ctx.lineWidth = 2;
      for (const [gx, gy] of [[2, 2], [4, 2], [4, 4], [2, 4]]) { const p = isoPt(gx, gy), q = isoPt(gx, gy, 80); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      for (const z of [30, 60]) { ctx.beginPath(); [[2, 4], [4, 4], [4, 2]].forEach(([gx, gy], i) => { const q = isoPt(gx, gy, z); ctx[i ? "lineTo" : "moveTo"](q.x, q.y); }); ctx.stroke(); }
    }
    if (showAll || (B.rise && B.p > 0)) {
      ctx.save();
      if (!showAll) { const hh = (H + 10) * B.p; ctx.beginPath(); ctx.rect(c.x - W, base + 4 - hh, W * 2, hh); ctx.clip(); }
      drawSpr(ctx, "strategy-hall", c.x, base, W, { sx: B.sx, sy: B.sy });
      if (B.flash > 0) drawSpr(ctx, "strategy-hall", c.x, base, W, { sx: B.sx, sy: B.sy, alpha: Math.min(1, B.flash), tint: "white" });
      ctx.restore();
    }
    if (!showAll && B.on) {
      if (B.bar) {
        const bw = 150, x = c.x - bw / 2, y = top - 18;
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(x - 4, y - 4, bw + 8, 20, 6); ctx.fill();
        const n = 10, f = B.p * n;
        for (let i = 0; i < n; i++) { const k = Math.max(0, Math.min(1, f - i)); ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x + i * bw / n + 1, y, bw / n - 2, 12); if (k > 0) { ctx.fillStyle = "#fbbf24"; ctx.fillRect(x + i * bw / n + 1, y, (bw / n - 2) * k, 12); } }
        numText(ctx, Math.floor(B.p * 100) + "%", c.x, y - 18, 18, "#fde68a", "center");
      } else label(ctx, Math.floor(B.p * 100) + "%", c.x, top - 14, 16, "rgba(255,255,255,0.75)");
    }
  }
})();

"use strict";
/* move — 플랫폼·캐릭터 이동 (25개) */
(() => {
  const HH = 72; // 주인공 키
  const slab = (ctx, a, b, y, d = 400) => {
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(a, y, b - a, d);
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(a, y - 1, b - a, 2);
  };
  const wallBox = (ctx, a, b, y0, y1, edge) => {
    ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fillRect(a, y0, b - a, y1 - y0);
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(edge - 1, y0, 2, y1 - y0);
  };
  const put = (h, x, y, surf = G) => { h.x = x; h.gy = surf; h.oy = y - surf; };
  const mkHero = (w, x, y = G, hh = HH) => { const h = w.actor("hero", { h: hh, home: x }); put(h, x, y); return h; };
  const reset = h => Object.assign(h, { alpha: 1, rot: 0, sx: 1, sy: 1, flip: false, flash: 0, ox: 0, vib: 0 });
  const feetY = h => h.gy + h.oy;
  const fadeOut = (w, M, h, dt, wait = 0.5) => { if (M.end != null && M.t - M.end > wait) h.alpha = Math.max(0, h.alpha - dt * 4); };
  const tag = (ctx, text, x, y, col = "rgba(255,255,255,0.55)", size = 10) => {
    ctx.font = `700 ${size}px 'JetBrains Mono', monospace`; ctx.fillStyle = col; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y);
  };

  // 물 표면 스프링 (수영 레시피)
  const WX0 = 230, WX1 = 520, WN = 30, WS = 205;
  const poke = (w, x, amt) => {
    const i = Math.round((x - WX0) / ((WX1 - WX0) / (WN - 1)));
    for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < WN) w.wv[j] += amt * (1 - Math.abs(k) * 0.3); }
  };
  // 진흙 (진흙 레시피)
  const inMud = x => x > 205 && x < 375;
  const BR = new Map();
  const brown = c => { if (!BR.has(c)) BR.set(c, tinted(c, "#6b4423")); return BR.get(c); };
  // 글라이더 날개 끝 위치
  const tips = w => {
    const h = w.hero, M = w.M, cx = h.x, cy = feetY(h) - HH / 2, r = h.rot, half = 52 * M.ws, up = HH / 2 + 14;
    const P = (dx, dy) => [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)];
    return [P(-half, -up + 4), P(half, -up + 4)];
  };

  RECIPES.push(
    /* 1. 벽 점프 */
    {
      id: "move-walljump", cat: "move", view: "side", polished: true,
      title: { en: "Make wall jumps *snap*", ko: "벽 점프가 *착착* 붙게" },
      intro: { en: "Bouncing up the walls like a *pinball*.", ko: "벽을 타는데 *핀볼*처럼 밋밋하게 튕겨요." },
      interval: 2.2, stepDur: 3.6,
      drawFloor(w, ctx) {
        slab(ctx, 20, 520, G);
        wallBox(ctx, 90, 150, 40, G, 150); wallBox(ctx, 390, 450, 40, G, 390);
      },
      drawBack(w, ctx) {
        const T = w.trail; if (T.length < 2) return;
        ctx.lineCap = "round";
        for (const [lw, k] of [[14, 0.12], [5, 0.85]]) {
          ctx.lineWidth = lw;
          for (let i = 1; i < T.length; i++) {
            ctx.strokeStyle = `rgba(198,244,50,${k * i / T.length})`;
            ctx.beginPath(); ctx.moveTo(T[i - 1][0], T[i - 1][1]); ctx.lineTo(T[i][0], T[i][1]); ctx.stroke();
          }
        }
      },
      setup(w) { w.hero = mkHero(w, 270); w.trail = []; w.M = null; },
      fire(w) {
        reset(w.hero); w.trail = [];
        w.M = { t: 0, x: 270, y: G, vx: 400, vy: -560, hits: 0, cling: 0, dir: 1 };
        w.emit("jump", w.hero);
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.cling > 0) {
          M.cling -= dt; M.y += 40 * dt;
          if (M.cling <= 0) { M.vx = -M.dir * 400; M.vy = -560; w.emit("kick", h, M.dir, M.dir > 0 ? 390 : 150, M.y); }
        } else if (M.end == null) {
          M.vy += 2000 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.vx && (M.x >= 366 || M.x <= 174)) {
            M.dir = M.x >= 366 ? 1 : -1; M.x = M.dir > 0 ? 366 : 174; M.hits++;
            if (M.hits < 3) { M.cling = 0.09; M.vy = 0; w.emit("wall", h, M.dir, M.dir > 0 ? 390 : 150, M.y); }
            else M.vx = 0;
          }
          if (M.y >= G && M.vy > 0) { M.y = G; M.end = M.t; w.emit("land", h); }
        }
        if (w.trail.length > 150) w.trail.shift();
        put(h, M.x, M.y);
        fadeOut(w, M, h, dt);
      },
      steps: [
        {
          id: "face", name: { en: "Face Away", ko: "몸 돌리기" }, param: "flip on contact",
          cap: { en: "Touch the wall, *turn around*. Show where you'll go.", ko: "벽에 닿으면 *몸을 돌려요*. 갈 방향이 보여요." },
          wall(w, h, dir) { h.flip = dir > 0; },
        },
        {
          id: "squash", name: { en: "Wall Squash", ko: "벽에 눌림" }, param: "0.6 → 1.3",
          cap: { en: "*Squash* into the wall, *stretch* off it.", ko: "벽에 *눌렸다가*, 찰 때 *쭉 늘어나요*." },
          wall(w, h) { h.sx = 0.6; h.sy = 1.2; },
          kick(w, h) { h.sx = 1.3; h.sy = 0.8; },
        },
        {
          id: "puff", name: { en: "Kick Puff", ko: "벽 먼지" }, param: "6 puffs off wall",
          cap: { en: "A puff of *dust* where the foot pushes off.", ko: "발로 찬 자리에 *먼지* 한 줌." },
          kick(w, h, dir, wx, y) { dust(w, wx, y - 10, 10, -dir); },
          land(w, h) { dust(w, h.x - 10, G, 8, -1); dust(w, h.x + 10, G, 8, 1); },
        },
        {
          id: "spark", name: { en: "Contact Spark", ko: "접촉 불꽃" }, param: "8 sparks",
          cap: { en: "Sparks *burst* off the wall on contact.", ko: "닿는 순간 벽에서 *불꽃*이 튀어요." },
          wall(w, h, dir, wx, y) {
            const a = dir > 0 ? Math.PI : 0;
            sparks(w, wx, y - 36, 16, "198,244,50", [200, 520], a - 1.2, a + 1.2);
            w.spawn({ type: "ring", x: wx, y: y - 36, size: 8, size1: 56, life: 0.3, w: 7, color: "236,252,203" });
            w.spawn({ type: "ellipse", round: true, under: true, x: wx, y: y - 36, size: 26, life: 1.4, hold: true, color: "198,244,50" });
          },
        },
        {
          id: "trail", name: { en: "Zig-zag Trail", ko: "지그재그 꼬리" }, param: "path line · 150 pts",
          cap: { en: "Leave a *zig-zag trail*. The climb reads at a glance.", ko: "*지그재그 꼬리*를 남겨요. 오른 길이 한눈에." },
          update(w) { const h = w.hero; w.trail.push([h.x, feetY(h) - HH / 2]); },
        },
        {
          id: "kick", name: { en: "Camera Nudge", ko: "화면 밀림" }, param: "7px away from wall",
          cap: { en: "Nudge the camera *away* from the wall.", ko: "화면을 벽 *반대쪽*으로 툭 밀어요." },
          kick(w, h, dir) { w.kick(-dir * 7, 3); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tap / hop",
          cap: { en: "A dry *tap* on the wall, a *hop* off it.", ko: "벽에 *탁*, 차고 나갈 때 *뿅*." },
          wall(w) { w.sfx.tock(); },
          kick(w) { w.sfx.jump(); },
        },
      ],
    },

    /* 2. 벽 미끄러짐 */
    {
      id: "move-wallslide", cat: "move", view: "side", polished: true,
      title: { en: "Give wall slides *friction*", ko: "벽 미끄럼에 *마찰*을 주기" },
      intro: { en: "Sliding down a wall. Feels like an *elevator*.", ko: "벽을 타고 내려오는데 *엘리베이터* 같아요." },
      interval: 2.3, stepDur: 3.6,
      drawFloor(w, ctx) {
        slab(ctx, 20, 520, G);
        wallBox(ctx, 360, 440, 44, G, 360);
      },
      drawBack(w, ctx) {
        for (const m of w.marks) {
          const a = Math.max(0, 1 - (w.time - m.t) / 1.6); if (a <= 0) continue;
          ctx.fillStyle = `rgba(255,${150 + 80 * a | 0},80,${a * 0.85})`; ctx.fillRect(359, m.y - 2, 8, 4);
        }
      },
      setup(w) { w.hero = mkHero(w, 336, 80); w.marks = []; w.M = null; },
      fire(w) {
        reset(w.hero); w.marks = [];
        w.M = { t: 0, y: 80, slide: true, tick: 0 };
        w.emit("grab", w.hero);
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.slide) {
          M.y += 150 * dt; M.tick -= dt;
          if (M.tick <= 0) { M.tick = 0.12; w.emit("grind", h, M.y); }
          if (M.y >= G) { M.y = G; M.slide = false; M.end = M.t; w.emit("land", h); }
        }
        put(h, 336, M.y);
        fadeOut(w, M, h, dt);
      },
      steps: [
        {
          id: "pose", name: { en: "Press Into Wall", ko: "벽에 붙는 자세" }, param: "flip · lean 0.1",
          cap: { en: "Turn away and *press* into the wall.", ko: "몸을 돌리고 벽에 *꾹 붙어요*." },
          grab(w, h) { h.flip = true; },
          update(w) { if (w.M && w.M.slide) { w.hero.sx = 0.86; w.hero.rot = 0.1; } },
        },
        {
          id: "sparks", name: { en: "Friction Sparks", ko: "마찰 불꽃" }, param: "1 / frame · g 900",
          cap: { en: "Sparks *spray* from the hand every frame.", ko: "손끝에서 매 프레임 *불꽃*이 튀어요." },
          update(w) {
            const M = w.M; if (!M || !M.slide) return;
            for (let i = 0; i < 2; i++) w.spawn({ type: "spark", x: 360, y: M.y - rand(44, 58), vx: -rand(80, 340), vy: -rand(60, 300), g: 900, drag: 1, life: rand(0.25, 0.5), size: 3, color: pick(["255,190,90", "255,240,200"]) });
          },
        },
        {
          id: "glow", name: { en: "Hot Spot", ko: "달아오른 손" }, param: "orange glow",
          cap: { en: "A *hot glow* where skin meets stone.", ko: "벽과 닿은 곳이 *빨갛게* 달아요." },
          update(w) {
            const M = w.M; if (!M || !M.slide) return;
            w.spawn({ type: "glow", x: 360, y: M.y - 52, size: 34, size1: 8, life: 0.2, color: "255,130,40" });
          },
        },
        {
          id: "marks", name: { en: "Scrape Marks", ko: "긁힌 자국" }, param: "fade 1.6s",
          cap: { en: "Leave a *glowing scrape* on the wall.", ko: "벽에 *달군 자국*이 길게 남아요." },
          update(w) { const M = w.M; if (M && M.slide) w.marks.push({ y: M.y - 52, t: w.time }); },
        },
        {
          id: "jitter", name: { en: "Grip Jitter", ko: "덜덜 떨림" }, param: "±1.2px",
          cap: { en: "A tiny *jitter*. The grip is fighting.", ko: "살짝 *덜덜*. 버티는 게 느껴져요." },
          update(w) { if (w.M && w.M.slide) w.hero.vib = 1.2; },
        },
        {
          id: "crumbs", name: { en: "Crumbs + Land", ko: "부스러기 + 착지" }, param: "debris · dust",
          cap: { en: "Bits of wall *crumble* down. Dust on landing.", ko: "벽 *부스러기*가 떨어지고, 착지엔 먼지." },
          grind(w, h, y) { w.spawn({ type: "chunk", x: 362, y: y - 50, vx: rand(-40, 0), vy: 0, g: 1200, life: 1, size: rand(2, 3.5), color: "160,160,170", ground: true, bounce: 0.3 }); },
          land(w, h) {
            dust(w, h.x, G, 12);
            w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 10, size1: 80, life: 0.4, w: 6, color: "255,210,150" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "scrape loop / tup",
          cap: { en: "A rough *scrape* loop, then a *tup*.", ko: "*지익* 긁는 소리, 끝에 *툭*." },
          grind(w) { if (w.on("sparks")) w.play(() => { nz({ dur: 0.2, type: "bandpass", f: 2600, f2: 1800, q: 2, vol: 0.18 }); sSnap(0.1, 0.03, 4000); }); else w.sfx.scrape(); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 3. 2단 점프 */
    {
      id: "move-doublejump", cat: "move", view: "side", polished: true,
      title: { en: "Make the double jump *visible*", ko: "2단 점프가 *보이게*" },
      intro: { en: "It jumped again. *Off what?*", ko: "공중에서 또 뛰었는데 *뭘 밟은 거죠?*" },
      interval: 1.9, stepDur: 3.4,
      drawFloor(w, ctx) { slab(ctx, 20, 230, G); slab(ctx, 330, 520, 150); },
      drawFront(w, ctx) {
        const M = w.M, h = w.hero; if (!M || M.pips == null || h.alpha <= 0) return;
        for (let i = 0; i < 2; i++) {
          const x = h.x - 7 + i * 14, y = feetY(h) - HH - 14, full = i < M.pips;
          ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU);
          ctx.fillStyle = full ? "#c6f432" : "rgba(255,255,255,0.15)"; ctx.fill();
        }
      },
      setup(w) { w.hero = mkHero(w, 140); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 140, y: G, vx: 215, vy: -520, jumps: 1, surf: G };
        w.emit("jump", w.hero);
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.end == null) {
          const py = M.y;
          M.vy += 1500 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.jumps === 1 && M.vy >= 0) { M.jumps = 2; M.vy = -520; w.emit("djump", h); }
          if (M.x >= 318 && py <= 150 && M.y >= 150 && M.vy > 0) { M.y = 150; M.surf = 150; M.vx = 0; M.end = M.t; w.emit("land", h); }
          if (M.y > 420) M.end = M.t;
        }
        put(h, M.x, M.y, M.surf);
        fadeOut(w, M, h, dt, 0.4);
      },
      steps: [
        {
          id: "puff", name: { en: "Air Puff", ko: "공중 발판" }, param: "flat ring + dust",
          cap: { en: "Kick off a *puff of air*. Now there's something to push.", ko: "*공기 발판*을 차요. 밟은 게 생겨요." },
          djump(w, h) {
            w.spawn({ type: "ring", flat: true, x: h.x, y: feetY(h), size: 10, size1: 70, life: 0.4, w: 8, color: "255,255,255" });
            w.spawn({ type: "ring", flat: true, x: h.x, y: feetY(h) + 8, size: 6, size1: 44, life: 0.5, w: 5, color: "103,232,249" });
            dust(w, h.x, feetY(h), 8);
          },
        },
        {
          id: "flip", name: { en: "Somersault", ko: "공중제비" }, param: "360° · 400ms",
          cap: { en: "Second jump = a *full flip*. Instantly different.", ko: "두 번째는 *한 바퀴* 돌아요. 바로 구분돼요." },
          djump(w, h) { h.rot = 0; w.tween(h, { rot: TAU }, 0.4, "out"); },
        },
        {
          id: "stretch", name: { en: "Squash & Stretch", ko: "늘었다 줄었다" }, param: "0.7 / 1.35",
          cap: { en: "*Stretch* on the air kick, *squash* on landing.", ko: "공중에서 찰 때 *늘고*, 내릴 때 *찌그러져요*." },
          djump(w, h) { h.sx = 0.7; h.sy = 1.35; },
          land(w, h) { h.sx = 1.35; h.sy = 0.7; dust(w, h.x, feetY(h), 10); },
        },
        {
          id: "ghost", name: { en: "Afterimage", ko: "잔상" }, param: "cyan · 400ms",
          cap: { en: "Leave a *ghost* where the second jump began.", ko: "두 번째 점프 자리에 *잔상*을 남겨요." },
          djump(w, h) { w.spawn({ type: "ghost", img: h.s.cyan, x: h.x, y: feetY(h), w: h.w, h: h.h, life: 0.45, alpha0: 0.6, add: false }); },
        },
        {
          id: "pips", name: { en: "Jump Pips", ko: "남은 점프 표시" }, param: "2 dots over head",
          cap: { en: "Show *jumps left* as dots. One pops on use.", ko: "남은 점프를 *점*으로. 쓰면 하나 톡." },
          jump(w) { w.M.pips = 1; },
          djump(w, h) { w.M.pips = 0; sparks(w, h.x + 7, feetY(h) - HH - 14, 10, "198,244,50", [120, 300]); w.spawn({ type: "ring", x: h.x + 7, y: feetY(h) - HH - 14, size: 4, size1: 22, life: 0.3, w: 4, color: "198,244,50" }); },
        },
        {
          id: "trail", name: { en: "Feet Trail", ko: "발끝 꼬리" }, param: "glow · 350ms",
          cap: { en: "Glowing feet until you *touch down*.", ko: "*착지할 때까지* 발끝이 빛나요." },
          update(w) {
            const M = w.M, h = w.hero;
            if (M && M.jumps === 2 && M.end == null) w.spawn({ type: "glow", x: h.x, y: feetY(h) - 6, size: 18, size1: 0, life: 0.5, color: "103,232,249" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hop / higher hop",
          cap: { en: "Second jump sounds *higher* than the first.", ko: "두 번째 점프는 *더 높은* 음으로." },
          jump(w) { w.sfx.jump(); },
          djump(w) { w.play(() => tn({ type: "square", f: 520, f2: 1040, dur: 0.12, vol: 0.08, lp: 3000 })); if (w.on("puff")) w.play(() => nz({ dur: 0.16, f: 1600, f2: 300, vol: 0.25 })); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 4. 난간 잡기 */
    {
      id: "move-ledgegrab", cat: "move", view: "side",
      title: { en: "Make ledge grabs *catch*", ko: "난간 잡기에 *손맛*을" },
      intro: { en: "It grabbed the ledge. Or *teleported*?", ko: "난간을 잡은 건지 *순간이동*한 건지." },
      interval: 2.0, stepDur: 3.5,
      drawFloor(w, ctx) { slab(ctx, 20, 330, G); slab(ctx, 330, 520, 150); ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(329, 150, 2, G - 150); },
      drawFront(w, ctx) {
        const M = w.M, h = w.hero; if (!M || M.st !== "hang") return;
        ctx.strokeStyle = "#e7e5e0"; ctx.lineWidth = 6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(h.x + 8, feetY(h) - HH + 18); ctx.lineTo(328, 152); ctx.stroke();
      },
      setup(w) { w.hero = mkHero(w, 170); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 170, y: G, vx: 300, vy: -600, st: "air", dip: 0, surf: G };
        w.emit("jump", w.hero);
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        const HY = 150 + HH - 4, TX = 360;
        if (M.st === "air") {
          M.vy += 2000 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.x >= 306) { M.x = 306; M.st = "hang"; M.ht = 0; M.y = HY; w.emit("grab", h); }
        } else if (M.st === "hang") {
          M.ht += dt;
          M.y = HY + M.dip * Math.exp(-M.ht * 7) * Math.cos(M.ht * 24);
          if (M.ht > 0.42) { M.st = "pull"; M.pt = 0; w.emit("pull", h); }
        } else if (M.st === "pull") {
          M.pt += dt;
          const p = Math.min(1, M.pt / 0.36);
          if (w.on("pull")) {
            const up = E.out(Math.min(1, p / 0.6)), fw = E.back(Math.max(0, (p - 0.45) / 0.55));
            M.x = 306 + (TX - 306) * fw; M.y = HY + (150 - HY) * up;
          } else { M.x = 306 + (TX - 306) * p; M.y = HY + (150 - HY) * p; }
          if (p >= 1) { M.st = "top"; M.surf = 150; M.end = M.t; w.emit("top", h); }
        }
        put(h, M.x, M.y, M.surf);
        fadeOut(w, M, h, dt);
      },
      steps: [
        {
          id: "catch", name: { en: "Catch Bounce", ko: "잡는 순간 출렁" }, param: "dip 16px · spring",
          cap: { en: "Drop a little *past* the grip, then spring back.", ko: "잡는 순간 살짝 *더 내려갔다* 튕겨요." },
          grab(w, h) { w.M.dip = 16; h.sx = 0.85; h.sy = 1.2; },
        },
        {
          id: "grip", name: { en: "Grip Flash", ko: "손 닿는 곳 번쩍" }, param: "ring + 6 sparks",
          cap: { en: "Flash the *exact spot* the hand grabs.", ko: "손이 닿은 *그 자리*가 번쩍." },
          grab(w) {
            w.spawn({ type: "ring", x: 330, y: 150, size: 8, size1: 52, life: 0.35, w: 7, color: "198,244,50" });
            w.spawn({ type: "star", x: 330, y: 150, size: 34, life: 0.18, color: "255,255,255" });
            w.spawn({ type: "glow", under: true, x: 330, y: 150, size: 60, size1: 20, life: 0.8, color: "198,244,50" });
            sparks(w, 330, 150, 14, "198,244,50", [160, 420], -Math.PI, 0);
          },
        },
        {
          id: "crumbs", name: { en: "Crumbling Edge", ko: "부서지는 모서리" }, param: "5 pebbles",
          cap: { en: "A few *pebbles* fall from the edge.", ko: "모서리에서 *돌 부스러기*가 떨어져요." },
          grab(w) {
            for (let i = 0; i < 9; i++) w.spawn({ type: "chunk", x: 330 + rand(-6, 4), y: 154, vx: rand(-90, 20), vy: rand(-140, 20), g: 1400, vr: rand(-8, 8), life: 1.4, hold: true, size: rand(3, 6), color: pick(["170,170,180", "120,120,130"]), ground: true, gy: G, bounce: 0.35 });
          },
        },
        {
          id: "sway", name: { en: "Hang Sway", ko: "매달려 흔들림" }, param: "±0.14 rad decay",
          cap: { en: "The body *swings* a beat from the hands.", ko: "손에 매달려 몸이 *흔들*해요." },
          update(w) { const M = w.M; if (M && M.st === "hang") w.hero.rot = Math.sin(M.ht * 16) * 0.14 * Math.exp(-M.ht * 5); },
        },
        {
          id: "pull", name: { en: "Two-beat Pull-up", ko: "두 박자 올라서기" }, param: "up ease · step back-ease",
          cap: { en: "Pull *up*, then step *over*. Two beats, not a slide.", ko: "*위로* 끌고, *앞으로* 넘어요. 미끄러지듯 말고." },
          pull(w, h) { h.rot = 0; h.sx = 0.82; h.sy = 1.25; },
          top(w, h) { h.sx = 1.25; h.sy = 0.8; },
        },
        {
          id: "kick", name: { en: "Weight", ko: "무게감" }, param: "6px dip · dust",
          cap: { en: "The camera *dips* with the catch.", ko: "잡는 순간 화면도 *쿵* 내려가요." },
          grab(w) { w.kick(0, 6); },
          top(w, h) { dust(w, h.x, 150, 10); w.spawn({ type: "ring", flat: true, x: h.x, y: 150, size: 10, size1: 70, life: 0.4, w: 6, color: "255,255,255" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk / grunt / tup",
          cap: { en: "A *thunk* on the grab, a *tup* on top.", ko: "잡을 때 *턱*, 올라서면 *툭*." },
          grab(w) { w.sfx.thunk(); },
          pull(w) { w.sfx.swish(); },
          top(w) { w.sfx.land(); },
        },
      ],
    },

    /* 5. 활공 */
    {
      id: "move-glide", cat: "move", view: "side",
      title: { en: "Make gliding feel *airborne*", ko: "활공이 *떠 있게*" },
      intro: { en: "Slowly falling. Is it *flying*?", ko: "천천히 떨어지긴 하는데 *나는* 느낌?" },
      interval: 2.8, stepDur: 3.8,
      drawFloor(w, ctx) { slab(ctx, 150, 520, G); slab(ctx, 20, 150, 110); },
      drawFront(w, ctx) {
        const M = w.M, h = w.hero; if (!M || M.ws <= 0.01 || h.alpha <= 0) return;
        const cx = h.x, cy = feetY(h) - HH / 2, half = 52 * M.ws, up = HH / 2 + 14;
        ctx.save(); ctx.globalAlpha = h.alpha; ctx.translate(cx, cy); ctx.rotate(h.rot);
        ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-half, -up + 4); ctx.lineTo(0, -HH / 2 + 10); ctx.lineTo(half, -up + 4); ctx.stroke();
        ctx.fillStyle = "#c6f432";
        ctx.beginPath(); ctx.moveTo(-half, -up + 4); ctx.quadraticCurveTo(0, -up - M.curve * 2, half, -up + 4);
        ctx.quadraticCurveTo(0, -up - M.curve * 2 + 10, -half, -up + 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      },
      setup(w) { w.hero = mkHero(w, 140, 110); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 140, y: 110, vx: 150, vy: 0, st: "walk", ws: 0, curve: 0, surf: 110 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        M.x += M.vx * dt;
        if (M.st === "walk" && M.x > 166) { M.st = "fall"; M.surf = G; }
        if (M.st === "fall" || M.st === "glide") {
          M.vy += 2000 * dt; M.y += M.vy * dt;
          if (M.st === "fall" && M.vy > 140) { M.st = "glide"; M.ws = 1; w.emit("open", h); }
          if (M.st === "glide") M.vy = Math.min(M.vy, 85);
          if (M.y >= G) {
            M.y = G; M.st = "done"; M.vx = 0; M.end = M.t;
            if (!w.on("soft")) M.ws = 0;
            w.emit("land", h);
          }
        }
        put(h, M.x, M.y, M.surf);
        if (M.st !== "glide") h.rot = 0;
        fadeOut(w, M, h, dt, 0.45);
      },
      steps: [
        {
          id: "open", name: { en: "Pop Open", ko: "펼침 팡" }, param: "scale 0.1→1 · back",
          cap: { en: "The wing *pops open* with an overshoot.", ko: "날개가 *팡* 하고 넘치게 펼쳐져요." },
          open(w, h) {
            w.M.ws = 0.1; w.tween(w.M, { ws: 1 }, 0.3, "back");
            w.spawn({ type: "ring", x: h.x, y: feetY(h) - HH - 12, size: 10, size1: 60, life: 0.3, w: 4, color: "198,244,50" });
          },
        },
        {
          id: "billow", name: { en: "Billowing Canopy", ko: "부푼 날개" }, param: "curve 16 ± 4",
          cap: { en: "Curve the wing. It *catches air* and breathes.", ko: "날개를 휘게. *바람을 머금고* 들썩여요." },
          update(w) { if (w.M) w.M.curve = 16 + Math.sin(w.time * 10) * 4; },
        },
        {
          id: "sway", name: { en: "Sway & Bob", ko: "흔들흔들" }, param: "±0.12 rad · 6px",
          cap: { en: "Gentle *sway and bob*. Air is never still.", ko: "살짝 *흔들리고 출렁*. 공기는 가만있지 않아요." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || M.st !== "glide") return;
            h.rot = Math.sin(w.time * 3.2) * 0.12;
            h.oy += Math.sin(w.time * 4.4) * 6;
          },
        },
        {
          id: "wind", name: { en: "Wind Streaks", ko: "바람 줄기" }, param: "streaks · vx −600",
          cap: { en: "Thin *wind streaks* slide past the body.", ko: "몸 옆으로 가는 *바람 줄기*가 지나가요." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || M.st !== "glide" || Math.random() > 0.5) return;
            w.spawn({ type: "spark", x: h.x + rand(30, 160), y: feetY(h) - rand(0, HH + 30), vx: -600, vy: -40, life: 0.22, size: 2.2, color: "255,255,255" });
          },
        },
        {
          id: "tips", name: { en: "Wingtip Trails", ko: "날개 끝 꼬리" }, param: "2 glows / frame",
          cap: { en: "Wingtips draw the *flight path* in the air.", ko: "날개 끝이 공중에 *비행 궤적*을 그려요." },
          update(w) {
            const M = w.M; if (!M || M.st !== "glide") return;
            for (const p of tips(w)) w.spawn({ type: "glow", x: p[0], y: p[1], size: 6, size1: 0, life: 0.6, color: "198,244,50" });
          },
        },
        {
          id: "soft", name: { en: "Soft Landing", ko: "사뿐한 착지" }, param: "fold 250ms · dust",
          cap: { en: "Fold the wing *as you touch down*.", ko: "*발이 닿으면서* 날개를 접어요." },
          land(w, h) { dust(w, h.x, G, 8); h.sx = 1.3; h.sy = 0.75; w.tween(w.M, { ws: 0 }, 0.25, "in"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "fwump / tup",
          cap: { en: "A cloth *fwump* opens it.", ko: "천이 *펄럭* 하며 펼쳐져요." },
          open(w) { w.play(() => { nz({ type: "lowpass", f: 900, f2: 200, dur: 0.25, vol: 0.5 }); tn({ f: 110, f2: 70, dur: 0.12, vol: 0.3 }); }); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 6. 물에 뛰어들기 */
    {
      id: "move-swim", cat: "move", view: "side",
      title: { en: "Make water *feel wet*", ko: "물에 들어간 *티*가 나게" },
      intro: { en: "Jumped in the water. Like *thin air*.", ko: "물에 들어갔는데 *허공* 같아요." },
      interval: 2.4, stepDur: 3.6,
      drawFloor(w, ctx) { slab(ctx, 20, 230, 170); },
      drawFront(w, ctx) {
        const dx = (WX1 - WX0) / (WN - 1);
        ctx.beginPath(); ctx.moveTo(WX0, 360);
        for (let i = 0; i < WN; i++) ctx.lineTo(WX0 + i * dx, WS + w.wh[i]);
        ctx.lineTo(WX1, 360); ctx.closePath();
        ctx.fillStyle = "rgba(56,160,248,0.3)"; ctx.fill();
        ctx.beginPath();
        for (let i = 0; i < WN; i++) ctx[i ? "lineTo" : "moveTo"](WX0 + i * dx, WS + w.wh[i]);
        ctx.strokeStyle = "rgba(186,230,253,0.9)"; ctx.lineWidth = 2.5; ctx.stroke();
      },
      setup(w) { w.hero = mkHero(w, 190, 170); w.wh = Array(WN).fill(0); w.wv = Array(WN).fill(0); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 190, y: 170, vx: 210, vy: 0, st: "run", surf: 170 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero;
        const n = w.wh.map((v, i) => (w.wh[i - 1] ?? v) + (w.wh[i + 1] ?? v) - 2 * v);
        for (let i = 0; i < WN; i++) { w.wv[i] += (-w.wh[i] * 60 - w.wv[i] * 3 + n[i] * 180) * dt; w.wh[i] += w.wv[i] * dt; }
        if (!M) return;
        M.t += dt;
        if (M.st === "run") { M.x += M.vx * dt; if (M.x > 236) { M.st = "air"; M.surf = G + 70; } }
        else {
          M.x += M.vx * dt;
          if (M.st === "air") { M.vy += 2000 * dt; if (M.y >= WS) { M.st = "wet"; M.wet = true; w.emit("splash", h); } }
          else if (M.buoy) { M.vy += (-(M.y - 262) * 30 - M.vy * 4) * dt; M.vx -= M.vx * 3 * dt; }
          else M.vy += 2000 * dt;
          M.y += M.vy * dt;
          if (M.y > 345) { M.y = 345; M.vy = 0; }
          if (M.x > 470) M.x = 470;
          if (M.st === "wet" && M.end == null && M.t > 1.6) M.end = M.t;
        }
        put(h, M.x, M.y, M.surf);
        fadeOut(w, M, h, dt, 0.2);
      },
      steps: [
        {
          id: "drag", name: { en: "Water Drag", ko: "물의 저항" }, param: "speed ×0.3 · float",
          cap: { en: "Water *grabs* you. Lose speed, then float.", ko: "물이 몸을 *붙잡아요*. 느려지고 떠올라요." },
          splash(w) { w.M.vy *= 0.3; w.M.buoy = true; },
        },
        {
          id: "crown", name: { en: "Splash Crown", ko: "물보라" }, param: "16 drops · g 1400",
          cap: { en: "Throw up a *crown of droplets*.", ko: "*물방울 왕관*이 솟아요." },
          splash(w, h) {
            for (let i = 0; i < 28; i++) w.spawn({ x: h.x + rand(-18, 18), y: WS, vx: rand(-200, 200), vy: -rand(280, 620), g: 1400, life: rand(0.6, 0.9), size: rand(3, 6), color: pick(["186,230,253", "255,255,255"]) });
            for (let i = 0; i < 6; i++) w.spawn({ type: "smoke", x: h.x + rand(-20, 20), y: WS - 4, vx: rand(-80, 80), vy: -rand(40, 120), drag: 3, size: 10, size1: 26, life: 0.7, color: "224,242,254" });
          },
        },
        {
          id: "wave", name: { en: "Surface Wave", ko: "수면 출렁" }, param: "spring surface",
          cap: { en: "Push the *surface* down. Waves roll outward.", ko: "*수면*을 눌러요. 물결이 퍼져 나가요." },
          splash(w, h) { poke(w, h.x, 260); },
        },
        {
          id: "ripple", name: { en: "Ripples", ko: "동심원" }, param: "3 flat rings",
          cap: { en: "*Rings* spread across the top.", ko: "수면 위로 *동그라미*가 번져요." },
          splash(w, h) {
            for (let k = 0; k < 3; k++) w.spawn({ type: "ring", flat: true, x: h.x, y: WS, size: 10, size1: 80 + k * 40, life: 0.6 + k * 0.25, w: 5, color: "186,230,253" });
          },
        },
        {
          id: "bubbles", name: { en: "Bubbles", ko: "물거품" }, param: "rise 90px/s",
          cap: { en: "*Bubbles* rise while you're under.", ko: "물속에선 *보글보글* 거품이 올라와요." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || !M.wet || h.alpha <= 0 || Math.random() > 0.35) return;
            const y = feetY(h) - rand(20, 60);
            if (y > WS + 8) w.spawn({ type: "ring", x: h.x + rand(-14, 14), y, vy: -90, size: rand(2, 4), life: 0.5, w: 1.5, color: "186,230,253" });
          },
        },
        {
          id: "dip", name: { en: "Camera Dip", ko: "화면 출렁" }, param: "8px down · .12",
          cap: { en: "The camera *dips* with the plunge.", ko: "풍덩할 때 화면도 *출렁*." },
          splash(w) { w.kick(0, 8); w.shake(0.12); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "low noise + bloop",
          cap: { en: "A deep *sploosh*, not a click.", ko: "가벼운 소리 말고 묵직한 *풍덩*." },
          splash(w) { w.play(() => { nz({ type: "lowpass", f: 1800, f2: 250, dur: 0.45, vol: 0.5 }); tn({ f: 240, f2: 90, dur: 0.16, vol: 0.3 }); }); },
        },
      ],
    },

    /* 7. 사다리 오르기 */
    {
      id: "move-ladder", cat: "move", view: "side",
      title: { en: "Make ladders feel *climbed*", ko: "사다리를 *오르는* 느낌으로" },
      intro: { en: "Up the ladder like an *escalator*.", ko: "사다리를 *에스컬레이터*처럼 올라가요." },
      interval: 2.2, stepDur: 3.6,
      drawFloor(w, ctx) {
        slab(ctx, 20, 520, G); slab(ctx, 290, 520, 90);
        const o = Math.sin(w.time * 40) * w.lad;
        ctx.strokeStyle = "#a16207"; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(244, G); ctx.lineTo(244 + o, 76); ctx.moveTo(276, G); ctx.lineTo(276 + o, 76); ctx.stroke();
        ctx.lineWidth = 3.5;
        for (let y = G - 14; y > 80; y -= 24) { const k = o * (G - y) / (G - 76); ctx.beginPath(); ctx.moveTo(244 + k, y); ctx.lineTo(276 + k, y); ctx.stroke(); }
      },
      setup(w) { w.hero = mkHero(w, 260); w.lad = 0; w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 260, y: G, st: "climb", rung: 0, surf: G };
      },
      update(w, dt) {
        const M = w.M, h = w.hero;
        w.lad -= w.lad * Math.min(1, dt * 6);
        if (!M) return;
        M.t += dt;
        const N = 8, per = 0.14;
        if (M.st === "climb") {
          const p = Math.min(N, M.t / per), i = Math.floor(p);
          M.y = w.on("rungs") ? G - 24 * (i + E.out(Math.min(1, (p - i) * 1.6))) : G - 24 * p;
          if (i > M.rung && i < N) { M.rung = i; w.emit("rung", h, i); }
          if (p >= N) { M.st = "mantle"; M.mt = 0; }
        } else if (M.st === "mantle") {
          M.mt += dt; const k = Math.min(1, M.mt / 0.25);
          M.x = 260 + 70 * E.out(k); M.y = G - 192 - 4 * Math.sin(k * Math.PI);
          if (k >= 1) { M.y = 90; M.surf = 90; M.st = "top"; M.end = M.t; w.emit("top", h); }
        }
        put(h, M.x, Math.min(M.y, M.st === "top" ? 90 : G), M.surf);
        fadeOut(w, M, h, dt);
      },
      steps: [
        {
          id: "rungs", name: { en: "Rung by Rung", ko: "한 칸씩" }, param: "24px steps · ease",
          cap: { en: "Move in *rung-sized pulls*, not a smooth glide.", ko: "미끄러지듯 말고 *한 칸씩* 끌어올려요." },
          rung(w, h) { h.sx = 0.9; h.sy = 1.12; },
        },
        {
          id: "sway", name: { en: "Hand Over Hand", ko: "번갈아 잡기" }, param: "±0.14 rad",
          cap: { en: "Tilt *left, right*. Hand over hand.", ko: "*왼손, 오른손* 번갈아 몸이 기울어요." },
          rung(w, h, i) { h.rot = i % 2 ? 0.14 : -0.14; w.tween(h, { rot: 0 }, 0.2); },
        },
        {
          id: "grip", name: { en: "Grip Dot", ko: "잡는 손 표시" }, param: "small ring",
          cap: { en: "A small *ring* on each rung you grab.", ko: "잡는 칸마다 작은 *동그라미*." },
          rung(w, h, i) { w.spawn({ type: "ring", x: i % 2 ? 272 : 248, y: G - 14 - 24 * (i + 2), size: 4, size1: 24, life: 0.35, w: 5, color: "198,244,50" }); },
        },
        {
          id: "wobble", name: { en: "Ladder Wobble", ko: "사다리 흔들림" }, param: "3px · decay",
          cap: { en: "The ladder *wobbles* under your weight.", ko: "무게를 받아 사다리가 *흔들*해요." },
          rung(w) { w.lad = 3; },
        },
        {
          id: "dust", name: { en: "Falling Grit", ko: "떨어지는 부스러기" }, param: "2 bits / rung",
          cap: { en: "Bits of *grit* drop from each rung.", ko: "칸마다 *부스러기*가 툭툭." },
          rung(w, h, i) {
            for (let k = 0; k < 2; k++) w.spawn({ type: "chunk", x: 260 + rand(-14, 14), y: G - 14 - 24 * i, vx: rand(-20, 20), g: 1200, vr: rand(-6, 6), life: 0.8, size: rand(1.5, 2.5), color: "190,160,110", ground: true, bounce: 0.2 });
          },
        },
        {
          id: "mantle", name: { en: "Top Pop", ko: "다 오르면 톡" }, param: "squash · dust",
          cap: { en: "*Pop* onto the top. The climb is done.", ko: "꼭대기에 *톡* 올라서요. 끝났다는 신호." },
          top(w, h) {
            h.sx = 1.25; h.sy = 0.8; dust(w, h.x, 90, 10); w.kick(0, 4);
            w.spawn({ type: "ring", flat: true, x: h.x, y: 90, size: 10, size1: 80, life: 0.45, w: 7, color: "198,244,50" });
            sparks(w, h.x, 80, 10, "198,244,50", [120, 300], -Math.PI, 0);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "alternating tok",
          cap: { en: "Wooden *toks*, alternating pitch.", ko: "나무 *톡톡*, 음 높이를 번갈아." },
          rung(w, h, i) { w.play(() => tn({ f: i % 2 ? 360 : 300, f2: 170, dur: 0.06, vol: 0.3 })); },
          top(w) { w.sfx.land(); },
        },
      ],
    },

    /* 8. 앉아 미끄러지기 */
    {
      id: "move-crouchslide", cat: "move", view: "side",
      title: { en: "Sell the *slide* under", ko: "숙여 *미끄러지기*에 속도감" },
      intro: { en: "It ducked under. Was it *sliding*?", ko: "숙이긴 했는데 *미끄러진* 거 맞아요?" },
      interval: 1.8, stepDur: 3.4,
      drawFloor(w, ctx) {
        slab(ctx, 20, 520, G);
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(260, 140, 110, G - 46 - 140);
        ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(260, G - 47, 110, 2);
        for (const m of w.marks) { const a = Math.max(0, 1 - (w.time - m.t) / 1.2); ctx.fillStyle = `rgba(255,190,120,${a * 0.75})`; ctx.fillRect(m.x - 4, G - 2, 8, 4); }
      },
      setup(w) { w.hero = mkHero(w, 60); w.marks = []; w.M = null; },
      fire(w) {
        reset(w.hero); w.marks = [];
        w.M = { t: 0, x: 60, vx: 300, st: "run", hop: 0 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        M.x += M.vx * dt;
        if (M.st === "run" && M.x > 175) { M.st = "slide"; w.emit("slide", h); }
        if (M.st === "slide") {
          h.sx = 1; h.sy = 0.5;
          if (M.x > 395) { M.st = "up"; w.emit("rise", h); }
        }
        if (M.st === "up") { M.vx = Math.max(0, M.vx - 900 * dt); if (!M.vx && M.end == null) M.end = M.t; }
        put(h, M.x, G + M.hop);
        fadeOut(w, M, h, dt, 0.4);
      },
      steps: [
        {
          id: "flat", name: { en: "Long & Low", ko: "길고 낮게" }, param: "1.35 × 0.45",
          cap: { en: "Stretch *long and low*, not just shorter.", ko: "작아지기만 말고 *길고 낮게* 늘려요." },
          update(w) { if (w.M && w.M.st === "slide") { w.hero.sx = 1.35; w.hero.sy = 0.45; } },
        },
        {
          id: "lean", name: { en: "Lean Back", ko: "뒤로 젖히기" }, param: "−0.3 rad",
          cap: { en: "*Lean back* into the slide, feet first.", ko: "*발부터* 들어가게 몸을 뒤로 젖혀요." },
          update(w) { const M = w.M; if (M) w.hero.rot = M.st === "slide" ? -0.3 : 0; },
        },
        {
          id: "boost", name: { en: "Burst + Friction", ko: "확 나가고 서서히" }, param: "450 → 220 px/s",
          cap: { en: "*Burst* into the slide, then friction bleeds it.", ko: "*확* 들어가서 마찰로 *서서히* 느려져요." },
          slide(w) { w.M.vx = 470; },
          update(w, dt) { const M = w.M; if (M && M.st === "slide") M.vx = Math.max(220, M.vx - 380 * dt); },
        },
        {
          id: "dust", name: { en: "Dust Wake", ko: "먼지 꼬리" }, param: "puff / frame",
          cap: { en: "Kick up a *dust wake* behind the feet.", ko: "발뒤로 *먼지 꼬리*가 일어요." },
          update(w) {
            const M = w.M; if (!M || M.st !== "slide" || Math.random() > 0.6) return;
            w.spawn({ type: "smoke", x: M.x - 20, y: G - 4, vx: -rand(40, 140), vy: -rand(20, 70), drag: 3, size: 4, size1: 12, life: 0.5, color: "170,160,140", add: false });
            w.spawn({ type: "spark", x: M.x + 10, y: G - 2, vx: -rand(150, 380), vy: -rand(40, 160), g: 900, life: 0.3, size: 2.5, color: "255,210,140" });
          },
        },
        {
          id: "marks", name: { en: "Skid Marks", ko: "미끄러진 자국" }, param: "fade 1.2s",
          cap: { en: "Leave *skid marks* on the floor.", ko: "바닥에 *쓸린 자국*을 남겨요." },
          update(w) { const M = w.M; if (M && M.st === "slide") w.marks.push({ x: M.x, t: w.time }); },
        },
        {
          id: "pop", name: { en: "Pop Up", ko: "벌떡 일어나기" }, param: "hop 18px · stretch",
          cap: { en: "*Spring* back up with a tiny hop.", ko: "작게 *폴짝* 뛰며 일어나요." },
          rise(w, h) { h.sx = 0.8; h.sy = 1.3; w.M.hop = -18; w.tween(w.M, { hop: 0 }, 0.25, "in"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "shhh / hup",
          cap: { en: "A cloth *shhhk* in, a *hup* out.", ko: "들어갈 때 *쓱*, 나올 때 *훕*." },
          slide(w) { w.play(() => nz({ type: "bandpass", f: 1400, f2: 500, q: 1, dur: 0.5, vol: 0.35 })); },
          rise(w) { w.sfx.jump(); },
        },
      ],
    },

    /* 9. 착지 구르기 */
    {
      id: "move-landroll", cat: "move", view: "side",
      title: { en: "Roll out of a *big drop*", ko: "높은 데서 *굴러서* 착지" },
      intro: { en: "Big drop, dead stop. *Ouch.*", ko: "높이 떨어져서 그대로 멈춤. *아파 보여요.*" },
      interval: 2.0, stepDur: 3.5,
      drawFloor(w, ctx) { slab(ctx, 170, 520, G); slab(ctx, 20, 170, 100); },
      setup(w) { w.hero = mkHero(w, 130, 100); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 130, y: 100, vx: 220, vy: 0, st: "walk", surf: 100, roll: 0 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.st === "walk") { M.x += M.vx * dt; if (M.x > 176) { M.st = "fall"; M.surf = G; } }
        else if (M.st === "fall") {
          M.x += M.vx * dt; M.vy += 2000 * dt; M.y += M.vy * dt;
          if (M.y >= G) { M.y = G; M.st = "land"; M.vx = 0; w.emit("land", h, M.vy); M.end = M.t + (M.roll ? 0.45 : 0); }
        } else if (M.roll > 0) {
          M.roll = Math.max(0, M.roll - dt);
          const k = 1 - M.roll / 0.45;
          M.x += 300 * (1 - k) * dt * 1.6;
          h.rot = TAU * E.out(k); h.sx = 0.9; h.sy = 0.7;
          if (!M.roll) h.rot = 0;
        }
        put(h, M.x, M.y, M.surf);
        fadeOut(w, M, h, dt, 0.4);
      },
      steps: [
        {
          id: "roll", name: { en: "Forward Roll", ko: "앞구르기" }, param: "360° · 450ms",
          cap: { en: "Turn the fall into a *forward roll*. Momentum lives.", ko: "떨어진 힘을 *앞구르기*로. 속도가 살아요." },
          land(w) { w.M.roll = 0.45; },
        },
        {
          id: "squash", name: { en: "Impact Squash", ko: "닿는 순간 찌그러짐" }, param: "1.4 / 0.6",
          cap: { en: "*Squash* the frame you hit the ground.", ko: "땅에 닿는 *그 프레임*에 찌그러져요." },
          land(w, h) { h.sx = 1.4; h.sy = 0.6; },
        },
        {
          id: "dust", name: { en: "Rolling Dust", ko: "구르는 먼지" }, param: "spray forward",
          cap: { en: "*Dust* sprays along the roll.", ko: "구르는 길을 따라 *먼지*가 일어요." },
          land(w, h) { dust(w, h.x, G, 14, 1); },
          update(w) { const M = w.M; if (M && M.roll > 0 && Math.random() < 0.5) dust(w, M.x - 10, G, 1, -1); },
        },
        {
          id: "arc", name: { en: "Roll Smear", ko: "회전 잔상" }, param: "arc · 350ms",
          cap: { en: "A curved *smear* shows the spin.", ko: "둥근 *잔상*이 회전을 보여줘요." },
          land(w, h) {
            w.spawn({ type: "arc", x: h.x + 50, y: G - 30, size: 38, a0: -Math.PI * 0.9, a1: Math.PI * 0.5, life: 0.45, color: "255,255,255" });
          },
        },
        {
          id: "ring", name: { en: "Impact Ring", ko: "충격 고리" }, param: "flat ring 70",
          cap: { en: "A *ring* on the ground where you hit.", ko: "닿은 자리에 *고리*가 퍼져요." },
          land(w, h) {
            w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 10, size1: 120, life: 0.4, w: 8, color: "255,255,255" });
            w.spawn({ type: "ellipse", under: true, x: h.x, y: G + 2, size: 60, life: 1.3, hold: true, color: "0,0,0", add: false });
          },
        },
        {
          id: "kick", name: { en: "Camera Dip", ko: "화면 꿀렁" }, param: "kick ∝ fall speed",
          cap: { en: "The camera *dips* with the landing.", ko: "착지할 때 화면도 *꿀렁*." },
          land(w, h, v) { w.kick(0, v / 120); w.shake(0.1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thud / tumble",
          cap: { en: "A soft *thud*, then a short *tumble*.", ko: "*쿵*, 이어서 *데구르*." },
          land(w) { w.sfx.land(); w.play(() => nz({ type: "bandpass", f: 500, f2: 250, q: 2, dur: 0.35, vol: 0.3, delay: 0.05 })); },
        },
      ],
    },

    /* 10. 연속 토끼뜀 */
    {
      id: "move-bhop", cat: "move", view: "side",
      title: { en: "Reward a *hop chain*", ko: "연속 점프에 *보상*을" },
      intro: { en: "Perfect hops. Nothing *builds up*.", ko: "타이밍 딱딱 맞췄는데 *쌓이는 게* 없어요." },
      interval: 2.6, stepDur: 3.8,
      drawFloor(w, ctx) { slab(ctx, 20, 520, G); },
      setup(w) { w.hero = mkHero(w, 50); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 50, y: G, vx: 110, vy: -420, n: 1 };
        w.emit("hop", w.hero, 1);
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.end == null) {
          M.vy += 2000 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.y >= G && M.vy > 0) {
            M.y = G;
            if (M.n < 5) { M.n++; M.vy = -420; w.emit("hop", h, M.n); }
            else { M.end = M.t; M.vx = 0; w.emit("land", h); }
          }
        }
        put(h, M.x, M.y);
        if (M.end != null) h.rot = 0;
        fadeOut(w, M, h, dt, 0.4);
      },
      steps: [
        {
          id: "speed", name: { en: "Speed Gain", ko: "속도 누적" }, param: "+20% / hop",
          cap: { en: "Each clean hop adds *20% speed*.", ko: "제대로 뛸 때마다 속도 *+20%*." },
          hop(w, h, n) { if (n > 1) w.M.vx *= 1.2; },
        },
        {
          id: "count", name: { en: "Chain Counter", ko: "연속 숫자" }, param: "×n · grows",
          cap: { en: "Count the chain. The number *grows*.", ko: "몇 번째인지 세요. 숫자가 *커져요*." },
          hop(w, h, n) { if (n > 1) w.spawn({ type: "text", text: "×" + n, x: h.x, y: G - HH - 24, vy: -50, life: 0.7, size: 18 + n * 4, color: "#c6f432" }); },
        },
        {
          id: "perfect", name: { en: "Perfect Flash", ko: "타이밍 번쩍" }, param: "ring + white",
          cap: { en: "Flash on the *frame-perfect* takeoff.", ko: "*딱 맞춘* 순간 번쩍." },
          hop(w, h, n) { h.flash = 0.8; w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 8, size1: 40 + n * 10, life: 0.35, w: 6, color: "198,244,50" }); sparks(w, h.x, G - 4, 4 + n * 2, "198,244,50", [120, 320], -Math.PI, 0); },
        },
        {
          id: "lean", name: { en: "Speed Lean", ko: "빠를수록 숙임" }, param: "rot ∝ speed",
          cap: { en: "Lean *further forward* as speed grows.", ko: "빨라질수록 *앞으로 더* 숙여요." },
          update(w) { const M = w.M; if (M && M.end == null) w.hero.rot = Math.min(0.4, (M.vx - 100) / 320); },
        },
        {
          id: "ghost", name: { en: "Heat Trail", ko: "달아오르는 잔상" }, param: "cyan → orange",
          cap: { en: "Afterimages turn *hotter* with speed.", ko: "빨라질수록 잔상이 *뜨거운 색*으로." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || M.end != null || Math.random() > 0.35) return;
            w.spawn({ type: "ghost", img: M.vx > 170 ? h.s.orange : h.s.cyan, x: h.x, y: feetY(h), w: h.w, h: h.h, life: 0.3, alpha0: 0.45, add: false });
          },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "count ∝ speed",
          cap: { en: "More *speed lines* the faster you go.", ko: "빠를수록 *속도선*이 많아져요." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || M.end != null || Math.random() > (M.vx - 100) / 150) return;
            w.spawn({ type: "spark", x: h.x + rand(0, 80), y: feetY(h) - rand(5, HH), vx: -900, life: 0.14, size: 2.6, color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Rising Hops", ko: "올라가는 음" }, param: "+2 semitones / hop",
          cap: { en: "Each hop *two notes higher*.", ko: "뛸 때마다 음이 *두 칸씩* 올라가요." },
          hop(w, h, n) { w.play(() => tn({ type: "square", f: 300 * Math.pow(2, (n * 2) / 12), f2: 600 * Math.pow(2, (n * 2) / 12), dur: 0.09, vol: 0.1 })); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 11. 갈고리 스윙 */
    {
      id: "move-grapple", cat: "move", view: "side",
      title: { en: "Give the grapple *weight*", ko: "갈고리 스윙에 *무게*를" },
      intro: { en: "Rope appears. Body floats across. *Weightless.*", ko: "줄이 생기고 몸이 둥실. *무게가 없어요.*" },
      interval: 2.3, stepDur: 3.8,
      drawFloor(w, ctx) {
        slab(ctx, 20, 150, 190); slab(ctx, 400, 520, 250);
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(200, 30, 140, 6);
        ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.arc(270, 40, 6, 0, TAU); ctx.fill();
      },
      drawBack(w, ctx) {
        const M = w.M, h = w.hero; if (!M || M.st === "fly" || M.st === "done") return;
        const hx = h.x + 10, hy = feetY(h) - HH + 22;
        const ex = hx + (270 - hx) * M.reach, ey = hy + (40 - hy) * M.reach;
        const sx = M.st === "throw" ? hx : M.hx, sy = M.st === "throw" ? hy : M.hy;
        ctx.strokeStyle = "#d6c7a1"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(M.st === "throw" ? sx : 270, M.st === "throw" ? sy : 40);
        if (M.st === "throw") ctx.lineTo(ex, ey);
        else {
          const nx = -(sy - 40), ny = sx - 270, L = Math.hypot(nx, ny) || 1, wob = M.wob * Math.sin(M.st_t * 40);
          ctx.quadraticCurveTo((270 + sx) / 2 + nx / L * wob, (40 + sy) / 2 + ny / L * wob, sx, sy);
        }
        ctx.stroke();
      },
      setup(w) { w.hero = mkHero(w, 120, 190); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, st: "throw", reach: 1, wob: 0, st_t: 0, th: -1.09, om: 0, L: 169, x: 120, y: 190, surf: 190 };
        w.emit("shoot", w.hero);
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt; M.st_t += dt; M.wob -= M.wob * Math.min(1, dt * 6);
        if (M.st === "throw") {
          if (M.reach >= 1 && M.t > 0.05) { M.st = "swing"; M.st_t = 0; w.emit("attach", h); }
          put(h, M.x, M.y, M.surf);
        } else if (M.st === "swing") {
          M.om += -(1600 / M.L) * Math.sin(M.th) * dt; M.th += M.om * dt;
          M.hx = 270 + Math.sin(M.th) * M.L; M.hy = 40 + Math.cos(M.th) * M.L;
          const r = h.rot, cx = M.hx + (HH / 2) * -Math.sin(r), cy = M.hy + (HH / 2) * Math.cos(r);
          put(h, cx, cy + HH / 2, G + 80);
          if (M.th >= 0.7) {
            const v = M.om * M.L;
            M.st = "fly"; M.x = cx; M.y = cy + HH / 2; M.vx = Math.cos(M.th) * v; M.vy = -Math.sin(M.th) * v;
            w.tween(h, { rot: 0 }, 0.2); w.emit("release", h);
          }
        } else if (M.st === "fly") {
          M.vy += 2000 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.y >= 250 && M.vy > 0 && M.x > 390) { M.y = 250; M.st = "done"; M.end = M.t; w.emit("land", h); }
          put(h, M.x, M.y, M.x > 390 ? 250 : G + 80);
        } else put(h, M.x, M.y, 250);
        fadeOut(w, M, h, dt, 0.4);
      },
      steps: [
        {
          id: "throw", name: { en: "Rope Travel", ko: "줄이 날아감" }, param: "150ms to anchor",
          cap: { en: "The rope must *fly* there first.", ko: "줄이 먼저 *날아가서* 걸려야 해요." },
          shoot(w) { w.M.reach = 0; w.tween(w.M, { reach: 1 }, 0.15, "out"); },
        },
        {
          id: "taut", name: { en: "Snap Taut", ko: "팽팽해지는 순간" }, param: "wobble 14px · jolt",
          cap: { en: "Rope *snaps taut*. The body jolts.", ko: "줄이 *팽* 당겨지고 몸이 홱." },
          attach(w, h) { w.M.wob = 14; h.sx = 0.85; h.sy = 1.2; },
        },
        {
          id: "anchor", name: { en: "Anchor Spark", ko: "걸린 곳 불꽃" }, param: "ring + 8 sparks",
          cap: { en: "Sparks where the hook *bites*.", ko: "갈고리가 *박힌* 곳에 불꽃." },
          attach(w) {
            w.spawn({ type: "ring", x: 270, y: 40, size: 6, size1: 44, life: 0.35, w: 6, color: "255,220,140" });
            w.spawn({ type: "star", x: 270, y: 40, size: 30, life: 0.2, color: "255,255,255" });
            sparks(w, 270, 40, 14, "255,220,140", [160, 420], 0, Math.PI);
          },
        },
        {
          id: "lean", name: { en: "Body Follows Rope", ko: "줄 따라 기울기" }, param: "rot = −θ",
          cap: { en: "Tilt the body *along the rope*.", ko: "몸이 *줄 방향대로* 기울어요." },
          update(w) { const M = w.M; if (M && M.st === "swing") w.hero.rot = -M.th; },
        },
        {
          id: "arc", name: { en: "Swing Arc", ko: "스윙 궤적" }, param: "glow trail",
          cap: { en: "The feet draw the *swing arc*.", ko: "발끝이 *스윙 궤적*을 그려요." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || (M.st !== "swing" && M.st !== "fly")) return;
            w.spawn({ type: "glow", x: h.x, y: feetY(h) - 8, size: 17, size1: 0, life: 0.55, color: "198,244,50" });
          },
        },
        {
          id: "release", name: { en: "Release Burst", ko: "놓는 순간 팡" }, param: "stretch + ring",
          cap: { en: "*Stretch* and burst at the release point.", ko: "놓는 순간 *쭉 늘어나며* 팡." },
          release(w, h) {
            h.sx = 0.75; h.sy = 1.3; w.kick(6, -3);
            w.spawn({ type: "ring", x: h.x, y: feetY(h) - HH / 2, size: 10, size1: 80, life: 0.35, w: 7, color: "255,255,255" });
            sparks(w, h.x, feetY(h) - HH / 2, 10, "198,244,50", [200, 460]);
          },
          land(w, h) { dust(w, h.x, 250, 10); w.spawn({ type: "ring", flat: true, x: h.x, y: 250, size: 10, size1: 70, life: 0.4, w: 6, color: "255,255,255" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "zip / twang / whoosh",
          cap: { en: "*Zip* out, *twang* taut, *whoosh* off.", ko: "*슉* 날아가고 *팅* 걸리고 *휙* 날아요." },
          shoot(w) { w.sfx.swish(); },
          attach(w) { w.sfx.twang(); },
          release(w) { w.sfx.dash(); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 12. 대시 충전 크리스털 */
    {
      id: "move-dashcrystal", cat: "move", view: "side",
      title: { en: "Make dash refills *obvious*", ko: "대시 충전이 *확실하게*" },
      intro: { en: "Touched the crystal. Did it *do* anything?", ko: "크리스털에 닿았는데 *뭐가 된* 거예요?" },
      interval: 2.0, stepDur: 3.6,
      drawFloor(w, ctx) {
        slab(ctx, 20, 180, G); slab(ctx, 400, 520, 160);
        const M = w.M, cs = M ? M.cry : 1;
        const spr = sprite("move-crystal", 60, 100, x => facetCrystal(x, 30, 4, 96, 22, 20, 8, 6, [200, 250, 255], [20, 90, 140]));
        if (cs > 0.01) {
          const b = Math.sin(w.time * 3) * 3;
          ctx.save(); ctx.translate(300, 170 + b); ctx.scale(cs, cs);
          glow(ctx, 0, 0, 40, "103,232,249", 0.35); ctx.drawImage(spr.c, -15, -25, 30, 50); ctx.restore();
        } else if (M && M.regrow > 0) {
          ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(103,232,249,0.5)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(300, 145); ctx.lineTo(314, 170); ctx.lineTo(300, 195); ctx.lineTo(286, 170); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        }
      },
      drawBack(w, ctx) {
        const M = w.M, h = w.hero; if (!M || M.aura <= 0.02 || h.alpha <= 0) return;
        ctx.globalCompositeOperation = "lighter"; glow(ctx, h.x, feetY(h) - HH / 2, 52, "103,232,249", 0.6 * M.aura); ctx.globalCompositeOperation = "source-over";
      },
      setup(w) { w.hero = mkHero(w, 90); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 90, y: G, vx: 120, vy: -560, st: "jump", ready: true, cry: 1, aura: 0, regrow: 0, surf: G };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.regrow > 0) { M.regrow -= dt; if (M.regrow <= 0) { M.cry = 0.2; w.tween(M, { cry: 1 }, 0.3, "back"); } }
        const dash = (vx, vy) => { M.st = "dash"; M.dt = 0; M.vx = vx; M.vy = vy; M.ready = false; w.emit("dash", h); };
        if (M.st === "jump" || M.st === "fall") {
          M.vy += 2000 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.st === "jump" && M.vy >= 0) dash(800, 0);
          if (M.st === "fall" && M.x > 392 && M.y >= 160 && M.vy > 0) { M.y = 160; M.surf = 160; M.st = "done"; M.end = M.t; w.emit("land", h); }
          if (M.y > 420) M.end = M.t;
        } else if (M.st === "dash") {
          M.dt += dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.cry >= 1 && !M.got && Math.abs(M.x - 300) < 16) { M.got = true; M.cry = 0; M.ready = true; M.st = "wait"; M.wt = 0; w.emit("refill", h); }
          else if (M.dt > 0.25) { M.st = "fall"; M.vx *= 0.3; M.vy *= 0.3; }
        } else if (M.st === "wait") { M.wt += dt; if (M.wt > 0.08) dash(480, -360); }
        put(h, M.x, M.y, M.surf);
        fadeOut(w, M, h, dt, 0.4);
      },
      steps: [
        {
          id: "shatter", name: { en: "Shatter", ko: "깨지는 크리스털" }, param: "10 shards",
          cap: { en: "The crystal *shatters* into shards.", ko: "크리스털이 *와장창* 깨져요." },
          refill(w) {
            for (let i = 0; i < 18; i++) w.spawn({ type: "chunk", x: 300, y: 170, vx: rand(-320, 320), vy: rand(-380, 80), g: 900, vr: rand(-10, 10), life: rand(0.8, 1.2), size: rand(4, 8), color: pick(["165,243,252", "224,250,255", "34,211,238"]) });
          },
        },
        {
          id: "freeze", name: { en: "Tiny Freeze", ko: "짧은 멈칫" }, param: "70ms",
          cap: { en: "Freeze *70ms*. The game says \"got it\".", ko: "*0.07초* 멈춰요. \"먹었다\"는 신호." },
          refill(w) { w.hitstop(0.07); },
        },
        {
          id: "flash", name: { en: "Body Flash", ko: "몸이 번쩍" }, param: "white 1.0",
          cap: { en: "The body *flashes white* as it fills.", ko: "충전되는 순간 몸이 *하얗게*." },
          refill(w, h) { h.flash = 1; },
        },
        {
          id: "charge", name: { en: "Charge Aura", ko: "충전 표시" }, param: "glow = dash ready",
          cap: { en: "A *glow* means you can dash. No glow, no dash.", ko: "*빛나면* 대시 가능. 꺼지면 불가." },
          update(w) { const M = w.M; if (M) M.aura += ((M.ready ? 1 : 0) - M.aura) * 0.3; },
        },
        {
          id: "rays", name: { en: "Burst Rays", ko: "빛 터짐" }, param: "8 rays + ring",
          cap: { en: "A burst of *rays* from the crystal.", ko: "크리스털 자리에서 *빛줄기*가 터져요." },
          refill(w) {
            w.spawn({ type: "rays", under: true, x: 300, y: 170, n: 12, size: 30, size1: 150, vr: 2, life: 0.6, color: "103,232,249" });
            w.spawn({ type: "ring", x: 300, y: 170, size: 10, size1: 90, life: 0.4, w: 8, color: "165,243,252" });
          },
        },
        {
          id: "regrow", name: { en: "Regrow", ko: "다시 자라기" }, param: "outline · 0.9s",
          cap: { en: "Show an *outline*, then it grows back.", ko: "*윤곽*만 남았다가 다시 자라요." },
          refill(w) { w.M.regrow = 0.9; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh / chime",
          cap: { en: "A bright *chime* means refilled.", ko: "맑은 *띵*이 충전 완료." },
          dash(w) { w.sfx.dash(); },
          refill(w) { w.sfx.chime(4); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 13. 점프대 */
    {
      id: "move-spring", cat: "move", view: "side",
      title: { en: "Make spring pads *boing*", ko: "점프대가 *띠용* 하게" },
      intro: { en: "Stepped on it, shot up. *Just a lift.*", ko: "밟았더니 위로 쭉. *그냥 리프트* 같아요." },
      interval: 2.0, stepDur: 3.5,
      drawFloor(w, ctx) {
        slab(ctx, 20, 350, G); slab(ctx, 350, 520, 110);
        const top = G - 14 + w.pad;
        ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(250, G);
        for (let i = 1; i <= 6; i++) ctx.lineTo(i % 2 ? 290 : 250, G - (G - top) * i / 6);
        ctx.stroke();
        rr(ctx, 236, top - 6, 68, 8, 3, "#c6f432");
        ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(244, G - 4, 52, 4);
      },
      setup(w) { w.hero = mkHero(w, 120); w.pad = 0; w.padV = 0; w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 120, y: G, vx: 240, vy: 0, st: "walk", surf: G };
      },
      update(w, dt) {
        w.padV += (-w.pad * 900 - w.padV * 14) * dt; w.pad += w.padV * dt;
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        const launch = () => { M.st = "air"; M.vy = -850; M.vx = 180; w.emit("launch", h); };
        if (M.st === "walk") {
          M.x += M.vx * dt;
          if (M.x >= 262) { M.x = 262; M.y = G - 14; M.st = "load"; M.lt = 0; w.emit("touch", h); if (!w.on("antic")) launch(); }
        } else if (M.st === "load") { M.lt += dt; if (M.lt > 0.09) launch(); }
        else if (M.st === "air") {
          const py = M.y;
          M.vy += 2000 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.x > 340 && py <= 110 && M.y >= 110) { M.y = 110; M.surf = 110; M.st = "done"; M.end = M.t; w.emit("land", h); }
        }
        put(h, M.x, M.y + (M.st === "load" ? w.pad : 0), M.surf);
        fadeOut(w, M, h, dt, 0.4);
      },
      steps: [
        {
          id: "coil", name: { en: "Coil Bounce", ko: "스프링 출렁" }, param: "spring k 900",
          cap: { en: "The pad *compresses*, then wobbles back.", ko: "판이 *꾹 눌렸다가* 출렁 돌아와요." },
          touch(w) { w.pad = 9; },
          launch(w) { w.padV = -700; },
        },
        {
          id: "antic", name: { en: "Anticipation", ko: "꾹 누르기" }, param: "hold 90ms · 1.35/0.65",
          cap: { en: "*Sink* into the pad for 90ms before launch.", ko: "튀기 전 *0.09초* 꾹 눌려요." },
          touch(w, h) { h.sx = 1.35; h.sy = 0.65; },
        },
        {
          id: "stretch", name: { en: "Launch Stretch", ko: "쭉 늘어나기" }, param: "0.65 × 1.45",
          cap: { en: "*Stretch tall* on the way up.", ko: "올라갈 때 *길쭉하게*." },
          launch(w, h) { h.sx = 0.65; h.sy = 1.45; },
          land(w, h) { h.sx = 1.3; h.sy = 0.75; dust(w, h.x, 110, 8); },
        },
        {
          id: "burst", name: { en: "Launch Burst", ko: "발사 폭발" }, param: "ring + 8 lines",
          cap: { en: "A *ring and upward lines* from the pad.", ko: "판에서 *고리와 위로 솟는 선*." },
          launch(w) {
            w.spawn({ type: "ring", flat: true, x: 270, y: G - 14, size: 10, size1: 110, life: 0.4, w: 8, color: "198,244,50" });
            w.spawn({ type: "glow", under: true, x: 270, y: G - 20, size: 70, size1: 20, life: 0.5, color: "198,244,50" });
            for (let i = 0; i < 14; i++) w.spawn({ type: "spark", x: 270 + rand(-34, 34), y: G - 20, vx: 0, vy: -rand(600, 1000), drag: 3, life: 0.35, size: 3, color: pick(["198,244,50", "255,255,255"]) });
          },
        },
        {
          id: "trail", name: { en: "Rise Trail", ko: "솟는 잔상" }, param: "ghost while vy < −300",
          cap: { en: "*Afterimages* while rising fast.", ko: "빠르게 솟는 동안 *잔상*." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || M.st !== "air" || M.vy > -300) return;
            w.spawn({ type: "ghost", img: h.s.white, x: h.x, y: feetY(h), w: h.w, h: h.h, sx: h.sx, sy: h.sy, life: 0.2, alpha0: 0.4, add: false });
          },
        },
        {
          id: "shake", name: { en: "Kick Up", ko: "위로 반동" }, param: "kick −8px · .15",
          cap: { en: "The camera *jolts* with the launch.", ko: "발사할 때 화면도 *덜컥*." },
          launch(w) { w.kick(0, -8); w.shake(0.15); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "boing sweep",
          cap: { en: "A springy *boing* sweeping up.", ko: "위로 휘는 *띠요옹*." },
          launch(w) { w.play(() => { tn({ type: "triangle", f: 150, f2: 760, dur: 0.32, vol: 0.3 }); tn({ f: 300, f2: 900, dur: 0.2, vol: 0.08 }); }); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 14. 컨베이어 벨트 */
    {
      id: "move-conveyor", cat: "move", view: "side",
      title: { en: "Show the belt is *moving*", ko: "벨트가 *움직이는* 걸 보여주기" },
      intro: { en: "Something moves the player. *What?*", ko: "뭔가 캐릭터를 미는데 *뭐가요?*" },
      interval: 2.6, stepDur: 3.8,
      drawFloor(w, ctx) {
        slab(ctx, 20, 520, G);
        const off = w.belt % 28, j = w.hum ? rand(-1, 1) : 0;
        ctx.save(); ctx.translate(0, j);
        rr(ctx, 110, 220, 320, 22, 11, "#2b2f38");
        ctx.save(); ctx.beginPath(); ctx.roundRect(110, 220, 320, 22, 11); ctx.clip();
        ctx.fillStyle = "rgba(198,244,50,0.75)";
        for (let x = 96 + off; x < 440; x += 28) { ctx.beginPath(); ctx.moveTo(x, 224); ctx.lineTo(x + 8, 231); ctx.lineTo(x, 238); ctx.lineTo(x - 4, 238); ctx.lineTo(x + 4, 231); ctx.lineTo(x - 4, 224); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        for (const cx of [121, 419]) {
          ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.arc(cx, 231, 9, 0, TAU); ctx.fill();
          ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; const a = w.belt / 9;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 8, 231 + Math.sin(a) * 8); ctx.lineTo(cx - Math.cos(a) * 8, 231 - Math.sin(a) * 8); ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(140, 242, 10, G - 242); ctx.fillRect(390, 242, 10, G - 242);
        if (w.lights) for (let i = 0; i < 8; i++) {
          const on = Math.floor(w.belt / 30) % 8 === i;
          ctx.fillStyle = on ? "#c6f432" : "rgba(198,244,50,0.15)"; ctx.beginPath(); ctx.arc(150 + i * 34, 252, 3.5, 0, TAU); ctx.fill();
        }
        ctx.restore();
      },
      setup(w) { w.hero = mkHero(w, 160, 120); w.belt = 0; w.hum = false; w.lights = false; w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 160, y: 110, vx: 0, vy: 0, st: "drop", surf: 220 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.st === "drop") {
          M.vy += 2000 * dt; M.y += M.vy * dt;
          if (M.y >= 220) { M.y = 220; M.st = "ride"; M.vx = 220; w.emit("land", h); }
        } else if (M.st === "ride") {
          M.x += M.vx * dt;
          if (M.x > 432) { M.st = "fall"; M.surf = G; M.vy = 0; }
        } else if (M.st === "fall") {
          M.x += M.vx * dt; M.vy += 2000 * dt; M.y += M.vy * dt;
          if (M.y >= G) { M.y = G; M.st = "done"; M.vx = 0; M.end = M.t; w.emit("off", h); }
        }
        put(h, M.x, M.y, M.surf);
        fadeOut(w, M, h, dt, 0.3);
      },
      steps: [
        {
          id: "arrows", name: { en: "Scrolling Chevrons", ko: "흐르는 화살표" }, param: "220 px/s",
          cap: { en: "*Chevrons scroll* at the belt's real speed.", ko: "벨트 속도 그대로 *화살표가 흘러요*." },
          update(w, dt) { w.belt += 220 * dt; },
        },
        {
          id: "inertia", name: { en: "Catch-up Stumble", ko: "휘청하며 따라감" }, param: "0 → 220 · lean",
          cap: { en: "Land at *zero*, get *dragged* up to speed.", ko: "멈춘 채 내려서 *끌려가며* 속도가 붙어요." },
          land(w) { w.M.vx = 0; },
          update(w, dt) {
            const M = w.M; if (!M || M.st !== "ride") return;
            M.vx += (220 - M.vx) * 4 * dt; w.hero.rot = -(220 - M.vx) / 500;
          },
        },
        {
          id: "slip", name: { en: "Slip Sparks", ko: "발밑 미끄러짐" }, param: "∝ speed gap",
          cap: { en: "Sparks at the feet while they *slip*.", ko: "발이 *미끄러지는* 동안 불꽃이 튀어요." },
          update(w) {
            const M = w.M; if (!M || M.st !== "ride" || Math.random() > (230 - M.vx) / 120) return;
            w.spawn({ type: "spark", x: M.x - 6, y: 218, vx: -rand(120, 300), vy: -rand(40, 140), g: 900, life: 0.3, size: 2.5, color: "255,210,140" });
          },
        },
        {
          id: "land", name: { en: "Landing Squash", ko: "착지 찌그러짐" }, param: "1.3 / 0.75",
          cap: { en: "*Squash* on landing so the drop reads.", ko: "떨어진 게 보이게 *찌그러져요*." },
          land(w, h) { h.sx = 1.3; h.sy = 0.75; w.spawn({ type: "ring", flat: true, x: h.x, y: 220, size: 8, size1: 60, life: 0.35, w: 6, color: "198,244,50" }); },
          off(w, h) { h.sx = 1.3; h.sy = 0.75; dust(w, h.x, G, 8); },
        },
        {
          id: "lights", name: { en: "Chase Lights", ko: "흐르는 불빛" }, param: "8 lamps",
          cap: { en: "*Chase lights* run in the belt's direction.", ko: "벨트 방향으로 *불빛이 달려요*." },
          update(w) { w.lights = true; },
        },
        {
          id: "hum", name: { en: "Machine Hum", ko: "기계 떨림" }, param: "±1px jitter",
          cap: { en: "The belt and rider *buzz* slightly.", ko: "벨트와 캐릭터가 살짝 *웅웅* 떨려요." },
          update(w) { w.hum = true; if (w.M && w.M.st === "ride") w.hero.vib = 0.8; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clunk / rattle",
          cap: { en: "A *clunk* on landing, a *rattle* ride.", ko: "내릴 때 *철컥*, 타는 동안 *덜덜*." },
          land(w) { w.sfx.thunk(); w.sfx.rattle(); },
          off(w) { w.sfx.land(); },
        },
      ],
    },

    /* 15. 빙판 */
    {
      id: "move-ice", cat: "move", view: "top",
      title: { en: "Make ice *slippery*", ko: "빙판을 *미끄럽게*" },
      intro: { en: "Let go on ice. Stopped *dead*.", ko: "빙판에서 손을 뗐는데 *딱* 멈춰요." },
      interval: 2.4, stepDur: 3.6,
      drawFloor(w, ctx) {
        const g = ctx.createLinearGradient(0, 60, 0, 320);
        g.addColorStop(0, "#1b2a3a"); g.addColorStop(1, "#14202c");
        rr(ctx, 40, 60, 460, 250, 40, g, "rgba(186,230,253,0.35)", 3);
        ctx.strokeStyle = "rgba(186,230,253,0.12)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(270, 60); ctx.lineTo(270, 310); ctx.stroke();
        ctx.beginPath(); ctx.arc(270, 185, 40, 0, TAU); ctx.stroke();
        ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(198,244,50,0.6)";
        ctx.beginPath(); ctx.moveTo(230, 130); ctx.lineTo(230, 240); ctx.stroke(); ctx.setLineDash([]);
        tag(ctx, "LET GO", 230, 120, "rgba(198,244,50,0.8)");
        for (const m of w.marks) {
          const a = Math.max(0, 1 - (w.time - m.t) / 2);
          ctx.fillStyle = `rgba(224,242,254,${a * 0.7})`; ctx.fillRect(m.x, m.y - 10, 3, 3); ctx.fillRect(m.x, m.y + 7, 3, 3);
        }
      },
      setup(w) { w.hero = w.actor("heroTop", { h: 52, home: 80, gy: 185 }); w.marks = []; w.M = null; },
      fire(w) {
        const h = w.hero; Object.assign(h, { x: 80, alpha: 1, rot: 0, sx: 1, sy: 1 }); w.marks = [];
        w.M = { t: 0, x: 80, vx: 320, st: "run" };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.st === "run") { M.x += M.vx * dt; if (M.x >= 230) { M.st = "let"; w.emit("release", h); if (!M.slide) { M.vx = 0; M.end = M.t; } } }
        else if (M.slide && M.vx > 0) {
          M.x += M.vx * dt; M.vx = Math.max(0, M.vx - 200 * dt);
          w.emit("sliding", h, M.vx);
          if (!M.vx) M.end = M.t;
        }
        h.x = M.x;
        if (M.end != null && M.t - M.end > 0.5) h.alpha = Math.max(0, h.alpha - dt * 4);
      },
      steps: [
        {
          id: "slide", name: { en: "Low Friction", ko: "낮은 마찰" }, param: "decel 200 px/s²",
          cap: { en: "Letting go doesn't stop you. You *glide on*.", ko: "손을 떼도 안 멈춰요. *주욱* 미끄러져요." },
          release(w) { w.M.slide = true; },
        },
        {
          id: "spin", name: { en: "Lost Control", ko: "중심 잃기" }, param: "spin ±0.5 rad",
          cap: { en: "The body *turns* a little. No grip.", ko: "몸이 *빙글* 돌아가요. 잡을 데가 없어요." },
          sliding(w, h, v) { h.rot = Math.sin(w.time * 6) * 0.5 * Math.min(1, v / 200); },
        },
        {
          id: "marks", name: { en: "Blade Marks", ko: "미끄러진 자국" }, param: "2 lines · 2s",
          cap: { en: "Leave *two thin lines* on the ice.", ko: "얼음 위에 *가는 두 줄*이 남아요." },
          sliding(w, h) { w.marks.push({ x: h.x, y: h.gy, t: w.time }); },
        },
        {
          id: "spray", name: { en: "Ice Spray", ko: "얼음 가루" }, param: "shavings ∝ speed",
          cap: { en: "*Shavings* spray ahead while you skid.", ko: "미끄러지는 동안 *얼음 가루*가 튀어요." },
          sliding(w, h, v) {
            if (Math.random() > v / 300) return;
            w.spawn({ x: h.x + 22, y: h.gy + rand(-16, 16), vx: v * rand(0.7, 1.4), vy: rand(-110, 110), floor: 4, life: 0.6, size: rand(2.5, 4.5), color: pick(["224,242,254", "255,255,255", "125,211,252"]) });
            if (Math.random() < 0.3) w.spawn({ type: "smoke", x: h.x + 18, y: h.gy, vx: v * 0.4, vy: rand(-20, 20), floor: 3, size: 6, size1: 16, life: 0.5, color: "186,230,253" });
          },
        },
        {
          id: "glint", name: { en: "Glints", ko: "반짝임" }, param: "stars on the rink",
          cap: { en: "Tiny *glints* sell a shiny surface.", ko: "작은 *반짝임*이 매끈한 표면을 말해줘요." },
          update(w) {
            if (Math.random() > 0.1) return;
            w.spawn({ type: "star", x: rand(70, 470), y: rand(80, 290), size: rand(3, 6), life: 0.5, color: "224,242,254" });
          },
        },
        {
          id: "stretch", name: { en: "Skid Stretch", ko: "미끄러지는 늘어남" }, param: "sx 1.15",
          cap: { en: "Stretch along the skid. *Momentum* shows.", ko: "미끄러지는 방향으로 늘려요. *관성*이 보여요." },
          sliding(w, h, v) { h.sx = 1 + v / 2000; h.sy = 1 - v / 3000; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hiss on release",
          cap: { en: "A long *hiss* on the skid.", ko: "길게 *쓰으윽*." },
          release(w) { w.play(() => nz({ type: "highpass", f: 5000, f2: 2500, dur: 1.2, vol: 0.18 })); },
        },
      ],
    },

    /* 16. 진흙 */
    {
      id: "move-mud", cat: "move", view: "side",
      title: { en: "Make mud feel *heavy*", ko: "진흙이 *무겁게*" },
      intro: { en: "Walked through mud like a *carpet*.", ko: "진흙을 *카펫*처럼 지나가요." },
      interval: 3.0, stepDur: 4.0,
      drawFloor(w, ctx) { slab(ctx, 20, 520, G); },
      drawFront(w, ctx) {
        const h = w.hero, M = w.M;
        if (M && M.stain > 0 && h.alpha > 0) {
          const c = brown(h.s.c), f = 0.4 * M.stain, sw = c.width, sh = c.height;
          ctx.save(); ctx.globalAlpha = h.alpha * 0.85; ctx.translate(h.x + h.ox, feetY(h)); ctx.scale(h.sx, h.sy);
          ctx.drawImage(c, 0, sh * (1 - f), sw, sh * f, -h.w / 2, -h.h * f, h.w, h.h * f); ctx.restore();
        }
        ctx.fillStyle = "#5b3a1e"; ctx.beginPath(); ctx.moveTo(200, G + 20);
        for (let x = 200; x <= 380; x += 10) ctx.lineTo(x, G - 3 + Math.sin(x * 0.2 + w.time * 2) * w.wob);
        ctx.lineTo(380, G + 20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(200, G - 4, 180, 2);
      },
      setup(w) { w.hero = mkHero(w, 130); w.wob = 1; w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 130, vx: 220, tick: 0, sink: 0, stain: 0 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.end == null) {
          M.x += M.vx * dt; M.tick -= dt;
          if (M.tick <= 0) { M.tick = 0.28; w.emit("step", h, inMud(M.x)); }
          if (M.x > 480) M.end = M.t;
        }
        put(h, M.x, G + M.sink);
        fadeOut(w, M, h, dt, 0.1);
      },
      steps: [
        {
          id: "slow", name: { en: "Drag", ko: "끈적한 저항" }, param: "220 → 90 px/s",
          cap: { en: "Mud *drags* you to a crawl.", ko: "진흙이 발을 *붙잡아* 느려져요." },
          update(w) { const M = w.M; if (M) M.vx = inMud(M.x) ? 90 : 220; },
        },
        {
          id: "sink", name: { en: "Sink In", ko: "푹 빠짐" }, param: "14px down",
          cap: { en: "*Sink* a little. The legs disappear.", ko: "다리가 *푹* 잠겨요." },
          update(w) { const M = w.M; if (M) M.sink += ((inMud(M.x) ? 14 : 0) - M.sink) * 0.15; },
        },
        {
          id: "splat", name: { en: "Mud Splats", ko: "철퍽 튀김" }, param: "5 blobs / step",
          cap: { en: "Each step throws *mud blobs*.", ko: "걸음마다 *진흙 덩어리*가 튀어요." },
          step(w, h, mud) {
            if (!mud) return;
            for (let i = 0; i < 9; i++) w.spawn({ type: "chunk", x: h.x + rand(-12, 12), y: G - 4, vx: rand(-160, 160), vy: -rand(180, 380), g: 1500, vr: rand(-8, 8), life: 0.9, size: rand(3.5, 7), color: pick(["120,80,40", "92,58,30", "150,105,60"]), ground: true, gy: G, bounce: 0.1, add: false });
          },
        },
        {
          id: "heavy", name: { en: "Heavy Steps", ko: "무거운 걸음" }, param: "squash 1.15/0.88",
          cap: { en: "Every step *squashes*. Lifting feet is work.", ko: "걸음마다 *꾹 눌려요*. 발 빼기가 힘들어요." },
          step(w, h, mud) { if (mud) { h.sx = 1.15; h.sy = 0.88; } },
        },
        {
          id: "stain", name: { en: "Mud Stains", ko: "묻은 진흙" }, param: "legs → brown",
          cap: { en: "Legs come out *stained*. Mud sticks.", ko: "나와도 다리가 *갈색*. 진흙이 남아요." },
          update(w) { const M = w.M; if (M && inMud(M.x)) M.stain = Math.min(1, M.stain + 0.03); },
        },
        {
          id: "bubbles", name: { en: "Living Surface", ko: "꿈틀대는 표면" }, param: "wobble + bubbles",
          cap: { en: "The surface *wobbles* and *bubbles*.", ko: "표면이 *출렁*이고 *뽀글*거려요." },
          update(w) {
            w.wob = 3;
            if (Math.random() < 0.08) w.spawn({ type: "ring", x: rand(210, 370), y: G - 4, size: 3, size1: 11, life: 0.5, w: 3, color: "170,120,70", add: false });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "squelch / step",
          cap: { en: "A wet *squelch* every step.", ko: "걸음마다 *철퍽*." },
          step(w, h, mud) { if (mud) w.play(() => { nz({ type: "lowpass", f: 600, f2: 200, dur: 0.18, vol: 0.45 }); tn({ f: 120, f2: 60, dur: 0.1, vol: 0.3 }); }); },
        },
      ],
    },

    /* 17. 적 밟기 */
    {
      id: "move-stomp", cat: "move", view: "side",
      title: { en: "Make stomps *squish*", ko: "적 밟기를 *꾹* 하게" },
      intro: { en: "Landed on its head. It just *vanished*.", ko: "머리를 밟았더니 그냥 *사라져요*." },
      interval: 2.0, stepDur: 3.6,
      drawFloor(w, ctx) { slab(ctx, 20, 520, G); },
      setup(w) { w.hero = mkHero(w, 200); w.foe = w.actor("foe", { h: 70, home: 330 }); w.M = null; },
      fire(w) {
        reset(w.hero); w.respawn(w.foe); w.foe.sx = w.foe.sy = 1;
        w.M = { t: 0, x: 200, y: G, vx: 248, vy: -650, st: "air" };
      },
      update(w, dt) {
        const M = w.M, h = w.hero, f = w.foe; if (!M) return;
        M.t += dt;
        if (M.squish && !f.alive) { f.sx = 1.6; f.sy = 0.25; f.alpha = Math.max(0, f.alpha - dt * 1.5); }
        if (M.st === "air" || M.st === "bounce") {
          const py = M.y;
          M.vy += 2000 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (M.st === "air" && f.alive && M.vy > 0 && py <= G - 66 && M.y >= G - 66 && Math.abs(M.x - f.x) < 40) {
            M.y = G - 66; M.st = "bounce"; M.vx = 110; M.vy = -380;
            w.emit("stomp", f, h); w.kill(f);
          }
          if (M.y >= G && M.vy > 0) { M.y = G; M.st = "done"; M.vx = 0; M.end = M.t; w.emit("land", h); }
        }
        put(h, M.x, M.y);
        fadeOut(w, M, h, dt, 0.5);
      },
      steps: [
        {
          id: "freeze", name: { en: "Hit Stop", ko: "멈칫" }, param: "80ms",
          cap: { en: "Freeze *80ms* on contact.", ko: "밟는 순간 *0.08초* 멈춰요." },
          stomp(w) { w.hitstop(0.08); },
        },
        {
          id: "squish", name: { en: "Pancake", ko: "납작해지기" }, param: "1.6 × 0.25",
          cap: { en: "The enemy goes *flat as a pancake*.", ko: "적이 *납작하게* 눌려요." },
          stomp(w, f) { f.keep = true; w.M.squish = true; },
        },
        {
          id: "bounce", name: { en: "Big Bounce", ko: "높이 튕김" }, param: "vy −380 → −720",
          cap: { en: "*Bounce high* off the head. A reward.", ko: "머리를 밟고 *높이* 튀어요. 보상처럼." },
          stomp(w, f, h) { w.M.vy = -720; h.sx = 0.7; h.sy = 1.35; },
        },
        {
          id: "stars", name: { en: "Star Burst", ko: "별 터짐" }, param: "6 stars",
          cap: { en: "*Stars* pop out from under your feet.", ko: "발밑에서 *별*이 터져요." },
          stomp(w, f) {
            for (let i = 0; i < 8; i++) { const a = Math.PI + (i / 7) * Math.PI; w.spawn({ type: "star", x: f.x, y: G - 60, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, drag: 4, size: 11, life: 0.6, color: "250,204,21" }); }
            w.spawn({ type: "ring", flat: true, x: f.x, y: G, size: 14, size1: 110, life: 0.4, w: 8, color: "255,255,255" });
          },
        },
        {
          id: "flash", name: { en: "White Flash", ko: "하얀 번쩍" }, param: "foe flash 1.0",
          cap: { en: "The enemy *flashes white*.", ko: "적이 *하얗게* 번쩍." },
          stomp(w, f) { f.flash = 1; },
        },
        {
          id: "score", name: { en: "Score Pop", ko: "점수 톡" }, param: "+100 · rise",
          cap: { en: "*+100* pops up where it happened.", ko: "그 자리에서 *+100*이 톡." },
          stomp(w, f) { w.spawn({ type: "text", text: "+100", x: f.x, y: G - 110, vy: -70, life: 1.1, size: 30, color: "#c6f432" }); },
        },
        {
          id: "shake", name: { en: "Down Kick", ko: "아래로 쿵" }, param: "kick 7px · .12",
          cap: { en: "The screen *thumps* downward.", ko: "화면이 아래로 *쿵*." },
          stomp(w) { w.kick(0, 7); w.shake(0.12); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "squish + boing",
          cap: { en: "A wet *squish*, then a *boing*.", ko: "*뿌직*, 그리고 *뾰잉*." },
          stomp(w) { w.sfx.pop(); w.sfx.jump(); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 18. 움직이는 발판 */
    {
      id: "move-platform", cat: "move", view: "side",
      title: { en: "Let moving platforms *carry* you", ko: "움직이는 발판이 *태워 가게*" },
      intro: { en: "Stood on it. It *slid away* underneath.", ko: "올라탔는데 발판만 *쏙* 빠져나가요." },
      interval: 2.8, stepDur: 4.0,
      drawFloor(w, ctx) {
        slab(ctx, 20, 520, G);
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(170, 199, 220, 2);
        for (const x of [170, 390]) { ctx.beginPath(); ctx.arc(x, 200, 4, 0, TAU); ctx.fill(); }
        const M = w.M; if (!M) return;
        rr(ctx, M.px - 55, 190 + M.dip, 110, 14, 5, "#94a3b8");
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(M.px - 50, 192 + M.dip, 100, 3);
      },
      setup(w) { w.hero = mkHero(w, 110); w.M = { px: 170, pdx: 0, dip: 0 }; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 110, y: G, vx: 255, vy: -700, st: "air", px: 170, pdx: 0, dip: 0, dipV: 0, on: false, surf: G, dir: 1 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M.t && M.t !== 0) return;
        M.t += dt;
        const ph = (M.t % 2.8) / 1.4, k = ph < 1 ? ph : 2 - ph;
        const nx = 170 + 220 * (w.on("ease") ? (1 - Math.cos(Math.PI * k)) / 2 : k);
        M.pdx = nx - M.px; M.px = nx;
        const dir = ph < 1 ? 1 : -1; if (dir !== M.dir) { M.dir = dir; w.emit("turn", h, dir); }
        M.dipV += (-M.dip * 500 - M.dipV * 12) * dt; M.dip += M.dipV * dt;
        if (M.st === "air") {
          const py = M.y;
          M.vy += 2000 * dt; M.x += M.vx * dt; M.y += M.vy * dt;
          if (py <= 190 && M.y >= 190 && M.vy > 0 && Math.abs(M.x - M.px) < 55) { M.y = 190; M.st = "ride"; M.on = true; M.vx = 0; M.surf = 190; w.emit("land", h); }
          if (M.y >= G) { M.y = G; M.vx = 0; M.vy = 0; M.surf = G; if (M.end == null) M.end = M.t; }
        } else if (M.st === "ride") {
          M.y = 190 + M.dip;
          if (Math.abs(M.x - M.px) > 58) { M.st = "air"; M.on = false; M.vy = 0; M.surf = G; }
        }
        put(h, M.x, M.y, M.surf);
        if (M.end != null && M.t - M.end > 0.5) h.alpha = Math.max(0, h.alpha - dt * 4);
      },
      steps: [
        {
          id: "carry", name: { en: "Inherit Motion", ko: "발판 움직임 물려받기" }, param: "x += platform dx",
          cap: { en: "Add the platform's movement to the rider. *Every frame.*", ko: "발판이 움직인 만큼 캐릭터도. *매 프레임.*" },
          update(w) { const M = w.M; if (M.on) M.x += M.pdx; },
        },
        {
          id: "dip", name: { en: "Landing Dip", ko: "올라타면 출렁" }, param: "spring 10px",
          cap: { en: "The platform *dips* under your weight.", ko: "무게를 받아 발판이 *출렁*." },
          land(w, h) { w.M.dipV = 260; h.sx = 1.25; h.sy = 0.8; },
        },
        {
          id: "ease", name: { en: "Ease at Ends", ko: "끝에서 부드럽게" }, param: "cosine ping-pong",
          cap: { en: "*Slow down* at the ends. Riders can predict it.", ko: "끝에서 *천천히*. 탄 사람이 예측돼요." },
          turn(w, h, dir) { if (w.M.on) { h.rot = -dir * 0.12; w.tween(h, { rot: 0 }, 0.4); } },
        },
        {
          id: "jets", name: { en: "Hover Jets", ko: "아래 분사" }, param: "glow ∝ speed",
          cap: { en: "*Jets* under it show it's powered.", ko: "아래 *분사*로 움직이는 힘을 보여줘요." },
          update(w) {
            const M = w.M; if (M.px == null) return;
            for (const s of [-36, 36]) w.spawn({ type: "glow", x: M.px + s, y: 206 + M.dip, vx: -M.pdx * 20, vy: 90, size: 12 + Math.abs(M.pdx) * 3, size1: 0, life: 0.25, color: "103,232,249" });
          },
        },
        {
          id: "dust", name: { en: "Ride Dust", ko: "발밑 먼지" }, param: "land + jump",
          cap: { en: "Dust on the jump and on the *landing*.", ko: "뛸 때와 *올라탈 때* 먼지." },
          land(w, h) { dust(w, h.x, 190, 10); w.spawn({ type: "ring", flat: true, x: h.x, y: 196, size: 10, size1: 80, life: 0.4, w: 6, color: "103,232,249" }); },
          update(w) { const M = w.M; if (M.t > 0 && M.t < 0.02) dust(w, 110, G, 8); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clank / soft clunk",
          cap: { en: "A metal *clank* on landing.", ko: "올라탈 때 금속 *철컹*." },
          land(w) { w.sfx.thunk(); },
          turn(w) { w.sfx.tock(); },
        },
      ],
    },

    /* 19. 한쪽 발판 통과 */
    {
      id: "move-dropthrough", cat: "move", view: "side",
      title: { en: "Make drop-through *readable*", ko: "통과 발판을 *티 나게*" },
      intro: { en: "Passed right through the floor. *Bug?*", ko: "바닥을 그냥 뚫고 지나가요. *버그?*" },
      interval: 2.0, stepDur: 3.6,
      drawFloor(w, ctx) {
        slab(ctx, 20, 520, G);
        const M = w.M || { bend: 0, bx: 270, glow: 0 };
        ctx.strokeStyle = M.glow > 0.02 ? `rgba(198,244,50,${0.4 + M.glow * 0.6})` : "rgba(255,255,255,0.6)"; ctx.lineWidth = 6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(160, 170); ctx.quadraticCurveTo(M.bx, 170 + M.bend * 2, 380, 170); ctx.stroke();
        if (M.glow > 0.02) { ctx.globalCompositeOperation = "lighter"; glow(ctx, M.bx, 170, 70, "198,244,50", M.glow * 0.5); ctx.globalCompositeOperation = "source-over"; }
      },
      setup(w) { w.hero = mkHero(w, 270); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, y: G, vy: -760, st: "up", bend: 0, bendV: 0, bx: 270, glow: 0, surf: G };
        w.emit("jump", w.hero);
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        M.bendV += (-M.bend * 700 - M.bendV * 10) * dt; M.bend += M.bendV * dt;
        M.glow = Math.max(0, M.glow - dt * 3);
        if (M.st === "up" || M.st === "fall") {
          const py = M.y;
          M.vy += 2000 * dt; M.y += M.vy * dt;
          if (M.st === "up" && py > 170 + HH && M.y <= 170 + HH) w.emit("pass", h, -1);
          if (M.st === "up" && M.vy > 0 && py <= 170 && M.y >= 170) { M.y = 170; M.st = "on"; M.ot = 0; M.surf = 170; w.emit("land", h, 170); }
          if (M.st === "fall" && M.y >= G) { M.y = G; M.st = "done"; M.surf = G; M.end = M.t; w.emit("land", h, G); }
        } else if (M.st === "on") {
          M.ot += dt;
          if (M.ot > 0.35) { M.st = "fall"; M.vy = 60; M.surf = G; w.emit("drop", h); w.emit("pass", h, 1); }
        }
        put(h, 270, M.y, M.surf);
        fadeOut(w, M, h, dt, 0.4);
      },
      steps: [
        {
          id: "flex", name: { en: "Platform Flex", ko: "발판이 휘어짐" }, param: "bend 12px spring",
          cap: { en: "The plank *bends* as you pass through it.", ko: "지나갈 때 발판이 *휘청* 휘어요." },
          pass(w, h, dir) { w.M.bendV = dir * 420; },
          land(w, h, y) { if (y === 170) w.M.bendV = 260; },
        },
        {
          id: "glow", name: { en: "Pass Glow", ko: "통과 표시" }, param: "lime 330ms",
          cap: { en: "*Glow* on pass. \"This one lets you through.\"", ko: "통과할 때 *빛나요*. \"이건 지나가져요.\"" },
          pass(w) { w.M.glow = 1; },
        },
        {
          id: "crouch", name: { en: "Crouch First", ko: "먼저 웅크리기" }, param: "1.25 / 0.7",
          cap: { en: "*Crouch* a beat before dropping.", ko: "내려가기 전 한 박자 *웅크려요*." },
          update(w) { const M = w.M; if (M && M.st === "on" && M.ot > 0.2) { w.hero.sx = 1.25; w.hero.sy = 0.7; } },
          drop(w, h) { h.sx = 0.8; h.sy = 1.25; },
        },
        {
          id: "bits", name: { en: "Shaken Dust", ko: "털리는 먼지" }, param: "6 bits",
          cap: { en: "Dust *shakes off* the plank.", ko: "발판에서 먼지가 *털려요*." },
          pass(w) { for (let i = 0; i < 6; i++) w.spawn({ type: "chunk", x: rand(200, 340), y: 172, vx: rand(-30, 30), vy: rand(0, 60), g: 1200, vr: rand(-6, 6), life: 0.8, size: rand(1.5, 3), color: "200,200,210", ground: true, bounce: 0.2 }); },
        },
        {
          id: "ghost", name: { en: "Drop Streak", ko: "떨어지는 잔상" }, param: "ghost / frame",
          cap: { en: "A short *streak* sells the drop.", ko: "짧은 *잔상*이 낙하를 보여줘요." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || M.st !== "fall") return;
            w.spawn({ type: "ghost", img: h.s.cyan, x: h.x, y: feetY(h), w: h.w, h: h.h, sx: h.sx, sy: h.sy, life: 0.18, alpha0: 0.4, add: false });
          },
        },
        {
          id: "land", name: { en: "Landing", ko: "착지" }, param: "squash + dust",
          cap: { en: "*Squash* and dust on each landing.", ko: "내릴 때마다 *찌그러지고* 먼지." },
          land(w, h, y) { h.sx = 1.3; h.sy = 0.75; dust(w, h.x, y, 6); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "fwip / tup",
          cap: { en: "A light *fwip* through the plank.", ko: "발판을 지날 때 가벼운 *휙*." },
          pass(w) { w.sfx.swish(); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 20. 순간이동 */
    {
      id: "move-blink", cat: "move", view: "top",
      title: { en: "Make a blink *read*", ko: "순간이동이 *읽히게*" },
      intro: { en: "Here, then there. Eyes *lost* it.", ko: "여기 있다가 저기. 눈이 *놓쳐요*." },
      interval: 1.8, stepDur: 3.4,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(40, 60, 460, 250);
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5; ctx.strokeRect(40, 60, 460, 250);
        for (const x of [130, 390]) { ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.arc(x, 185, 34, 0, TAU); ctx.stroke(); }
      },
      setup(w) { w.hero = w.actor("heroTop", { h: 56, home: 130, gy: 185 }); w.M = null; },
      fire(w) {
        const h = w.hero; Object.assign(h, { x: 130, alpha: 1, sx: 1, sy: 1, rot: 0 });
        w.M = { t: 0, st: "pre" };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.st === "pre" && M.t > 0.3) { M.st = "post"; h.x = 390; w.emit("blink", h, 130, 390); }
        if (M.st === "post" && M.t > 1.4) h.alpha = Math.max(0, h.alpha - dt * 5);
      },
      steps: [
        {
          id: "vanish", name: { en: "Squeeze & Pop", ko: "쪼그라들고 톡" }, param: "0.3 → 1.5 → 1",
          cap: { en: "*Squeeze* thin before, *pop* wide after.", ko: "가기 전 *가늘게*, 도착하면 *톡* 퍼져요." },
          update(w) { if (w.M && w.M.st === "pre") { w.hero.sx = 0.3; w.hero.sy = 1.4; } },
          blink(w, h) { h.sx = 1.5; h.sy = 0.5; },
        },
        {
          id: "ghost", name: { en: "Leave a Ghost", ko: "남겨진 잔상" }, param: "cyan · 1.1s",
          cap: { en: "Leave a *ghost* where you were.", ko: "있던 자리에 *잔상*을 남겨요." },
          blink(w, h, x0) { w.spawn({ type: "ghost", img: h.s.cyan, x: x0, y: h.gy, w: h.w, h: h.h, top: true, life: 1.1, alpha0: 0.7, add: false }); },
        },
        {
          id: "beam", name: { en: "Path Streak", ko: "이동 경로 선" }, param: "slash · 300ms",
          cap: { en: "A *streak* connects start and end.", ko: "출발점과 도착점을 *선*으로 이어요." },
          blink(w, h, x0, x1) { w.spawn({ type: "slash", x: (x0 + x1) / 2, y: h.gy, ang: 0, len: (x1 - x0) / 2, size: 10, life: 0.6, color: "103,232,249" }); },
        },
        {
          id: "suck", name: { en: "Implode → Burst", ko: "빨려 들고 터짐" }, param: "10 in · 12 out",
          cap: { en: "Particles *suck in* at start, *burst* at the end.", ko: "출발점은 *빨려 들고*, 도착점은 *터져요*." },
          blink(w, h, x0, x1) {
            for (let i = 0; i < 10; i++) { const a = rand(0, TAU); w.spawn({ type: "spark", x: x0 + Math.cos(a) * 60, y: h.gy + Math.sin(a) * 60, seek: true, tx: x0, ty: h.gy, life: 0.3, size: 2.5, color: "103,232,249" }); }
            sparks(w, x1, h.gy, 18, "165,243,252", [220, 520]);
          },
        },
        {
          id: "ring", name: { en: "Mark Both Ends", ko: "양 끝 표시" }, param: "ring + 2 floor marks",
          cap: { en: "A *ring* and floor marks at *both ends*.", ko: "*양 끝*에 고리와 바닥 자국." },
          blink(w, h, x0, x1) {
            w.spawn({ type: "ring", x: x1, y: h.gy, size: 10, size1: 90, life: 0.7, w: 8, color: "103,232,249" });
            for (const x of [x0, x1]) w.spawn({ type: "ellipse", round: true, x, y: h.gy, size: 34, life: 1.3, hold: true, under: true, alpha: 0.35, color: "103,232,249", add: false });
          },
        },
        {
          id: "flash", name: { en: "Screen Blip", ko: "화면 깜빡" }, param: "cyan .25 · zoom .04",
          cap: { en: "A quick *blip* of the whole screen.", ko: "화면 전체가 *깜빡*." },
          blink(w) { w.flash("103,232,249", 0.25); w.zoomPunch(0.04); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "zip down / pop up",
          cap: { en: "A *zip* out and a *pop* in.", ko: "사라질 때 *쥽*, 나타날 때 *뿅*." },
          blink(w) { w.play(() => { tn({ type: "sine", f: 1800, f2: 300, dur: 0.1, vol: 0.2 }); tn({ type: "triangle", f: 400, f2: 1600, dur: 0.12, vol: 0.18, delay: 0.08 }); }); },
        },
      ],
    },

    /* 21. 전력 질주 */
    {
      id: "move-sprint", cat: "move", view: "side",
      title: { en: "Make sprinting feel *urgent*", ko: "전력 질주가 *다급하게*" },
      intro: { en: "Sprint is on. Looks like *jogging*.", ko: "전력 질주인데 *조깅*처럼 보여요." },
      interval: 2.4, stepDur: 3.8,
      drawFloor(w, ctx) {
        const S = w.S;
        ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(-100, G, 740, 140);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(-100, G - 1, 740, 2);
        for (let i = 0; i < 9; i++) {
          const x = ((i * 90 - S.dist) % 810 + 810) % 810 - 120;
          ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(x, G - 70, 6, 70);
          ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x - 2, G + 10, 10, 3);
        }
      },
      setup(w) {
        w.hero = mkHero(w, 230); w.S = { v: 180, dist: 0, boostT: 0, fov: 0, tick: 0, ph: 0 };
      },
      fire(w) { w.S.boostT = 1.5; w.emit("sprint", w.hero); },
      update(w, dt) {
        const S = w.S, h = w.hero;
        S.boostT = Math.max(0, S.boostT - dt);
        S.v += ((S.boostT > 0 ? 520 : 180) - S.v) * Math.min(1, dt * 5);
        S.dist += S.v * dt;
        S.tick -= dt; S.ph += dt * S.v / 30;
        if (S.tick <= 0) { S.tick = S.v > 350 ? 0.2 : 0.32; w.emit("stride", h, S.v); }
        put(h, 230, G - Math.abs(Math.sin(S.ph)) * 4);
      },
      steps: [
        {
          id: "lean", name: { en: "Forward Lean", ko: "앞으로 숙이기" }, param: "0.05 → 0.3 rad",
          cap: { en: "*Lean in* hard when sprinting.", ko: "질주할 땐 *확* 숙여요." },
          update(w) { const h = w.hero; h.rot += ((w.S.boostT > 0 ? 0.3 : 0.05) - h.rot) * 0.15; },
        },
        {
          id: "fov", name: { en: "Wider View", ko: "시야 넓히기" }, param: "zoom −10%",
          cap: { en: "*Zoom out* a little. The world opens up.", ko: "살짝 *줌 아웃*. 앞이 넓어져요." },
          update(w) { const S = w.S; S.fov += ((S.boostT > 0 ? -0.1 : 0) - S.fov) * 0.08; w.zoom = S.fov; },
        },
        {
          id: "lead", name: { en: "Camera Lead", ko: "카메라가 앞을 봄" }, param: "+60px ahead",
          cap: { en: "Camera *looks ahead* of the runner.", ko: "카메라가 *앞쪽*을 더 보여줘요." },
          update(w) { w.cam.tx = w.S.boostT > 0 ? 60 : 0; },
        },
        {
          id: "stride", name: { en: "Big Strides", ko: "큰 보폭" }, param: "squash / stride",
          cap: { en: "Each stride *pumps* the body.", ko: "걸음마다 몸이 *쿵쿵* 눌려요." },
          stride(w, h, v) { if (v > 350) { h.sx = 1.12; h.sy = 0.88; } },
        },
        {
          id: "dust", name: { en: "Kicked Dust", ko: "차올린 먼지" }, param: "3 puffs / stride",
          cap: { en: "Feet *kick up dust* behind.", ko: "발뒤로 *먼지*를 차올려요." },
          stride(w, h, v) { if (v > 350) dust(w, h.x - 14, G, 3, -1); },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "2 / frame",
          cap: { en: "*Speed lines* streak past.", ko: "*속도선*이 휙휙 지나가요." },
          update(w) {
            if (w.S.boostT <= 0) return;
            for (let i = 0; i < 3; i++) w.spawn({ type: "spark", x: rand(260, 560), y: rand(60, G - 6), vx: -1400, life: 0.14, size: rand(2, 3.5), color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + fast steps",
          cap: { en: "A *whoosh*, then *quicker* footsteps.", ko: "*휙*, 그리고 *빨라진* 발소리." },
          sprint(w) { w.sfx.dash(); },
          stride(w, h, v) { if (v > 350) w.play(() => tn({ f: 130, f2: 70, dur: 0.05, vol: 0.3 })); },
        },
      ],
    },

    /* 22. 살금살금 */
    {
      id: "move-stealth", cat: "move", view: "side",
      title: { en: "Make sneaking feel *quiet*", ko: "숨어 가기가 *조용하게*" },
      intro: { en: "\"Sneaking\" past it. Looks like a *stroll*.", ko: "몰래 지나간다는데 *산책* 같아요." },
      interval: 2.6, stepDur: 4.0,
      drawFloor(w, ctx) { slab(ctx, 20, 520, G); },
      drawHud(w, ctx) {
        const M = w.M, h = w.hero, f = w.foe;
        if (w.dark > 0.02) {
          const g = ctx.createRadialGradient(f.x, G - 30, 30, f.x, G - 30, 260);
          g.addColorStop(0, `rgba(250,204,21,${0.1 * w.dark})`); g.addColorStop(0.4, `rgba(5,6,10,${0.25 * w.dark})`); g.addColorStop(1, `rgba(5,6,10,${0.7 * w.dark})`);
          ctx.fillStyle = g; ctx.fillRect(-40, -40, 620, 440);
        }
        if (M && M.meter) {
          const x = f.x - 30, y = G - 132;
          rr(ctx, x - 2, y - 2, 64, 10, 4, "rgba(0,0,0,0.6)");
          ctx.fillStyle = M.det > 0.6 ? "#ef4444" : "#facc15"; ctx.fillRect(x, y, 60 * M.det, 6);
          tag(ctx, "?", x + 72, y + 3, "rgba(250,204,21,0.9)", 12);
        }
      },
      setup(w) { w.hero = mkHero(w, 120); w.foe = w.actor("foe", { h: 70, home: 420 }); w.dark = 0; w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 120, vx: 160, tick: 0.1, det: 0 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt; M.det = Math.max(0, M.det - dt * 0.15);
        if (M.end == null) {
          M.x += M.vx * dt; M.tick -= dt;
          if (M.tick <= 0) { M.tick = 0.3; w.emit("step", h); }
          if (M.x > 320) M.end = M.t;
        }
        put(h, M.x, G);
        fadeOut(w, M, h, dt, 0.3);
      },
      steps: [
        {
          id: "crouch", name: { en: "Crouch Walk", ko: "웅크려 걷기" }, param: "1.1 × 0.72 · 95 px/s",
          cap: { en: "*Crouch low* and slow down.", ko: "*낮게 웅크리고* 천천히." },
          update(w) { const M = w.M; if (M && M.end == null) { M.vx = 95; w.hero.sx = 1.1; w.hero.sy = 0.72; } },
        },
        {
          id: "dark", name: { en: "Lights Down", ko: "조명 낮추기" }, param: "vignette .85",
          cap: { en: "*Dim the world*. Only the enemy is lit.", ko: "*주변을 어둡게*. 적만 밝게." },
          update(w) { w.dark += (1 - w.dark) * 0.08; },
        },
        {
          id: "shade", name: { en: "In the Shadows", ko: "그림자 속으로" }, param: "alpha .55",
          cap: { en: "The player turns *half-transparent*. Hidden.", ko: "캐릭터를 *반투명*하게. 숨었다는 뜻." },
          update(w) { const h = w.hero; if (h.alpha > 0.6) h.alpha = 0.6; },
        },
        {
          id: "noise", name: { en: "Noise Rings", ko: "소리 고리" }, param: "r 18 · quiet",
          cap: { en: "Tiny *sound rings* show you're quiet.", ko: "작은 *소리 고리*가 조용하다고 알려줘요." },
          step(w, h) { w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 4, size1: 26, life: 0.5, w: 3, color: "198,244,50" }); },
        },
        {
          id: "meter", name: { en: "Detection Meter", ko: "들킴 게이지" }, param: "+12% / step · decay",
          cap: { en: "A *detection bar* that barely moves.", ko: "*들킴 게이지*가 찔끔찔끔만 차요." },
          update(w) { if (w.M) w.M.meter = true; },
          step(w) { w.M.det = Math.min(1, w.M.det + 0.12); },
        },
        {
          id: "zzz", name: { en: "Sleeping Z", ko: "쿨쿨" }, param: "z every 0.4s",
          cap: { en: "*Zzz* floats up. It's asleep. For now.", ko: "*Zzz*가 떠올라요. 아직은 자는 중." },
          update(w) {
            if (Math.random() > 0.04) return;
            w.spawn({ type: "text", text: "z", x: w.foe.x + 20 + rand(-4, 4), y: G - 78, vx: 22, vy: -30, life: 1, size: rand(16, 22), color: "rgba(255,255,255,0.85)" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft ticks",
          cap: { en: "Soft *tick-tick* steps, nothing louder.", ko: "조심스러운 *톡톡*. 그 이상은 없어요." },
          step(w) { w.sfx.tick(); },
        },
      ],
    },

    /* 23. 등반 지구력 */
    {
      id: "move-stamina", cat: "move", view: "side",
      title: { en: "Make climbing stamina *tense*", ko: "등반 지구력을 *조마조마*하게" },
      intro: { en: "Stamina is running out. *Nobody knows.*", ko: "힘이 다 떨어지는데 *아무도 몰라요*." },
      interval: 2.8, stepDur: 4.0,
      drawFloor(w, ctx) { slab(ctx, 20, 330, G); slab(ctx, 330, 520, 90); ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(329, 90, 2, G - 90); },
      drawFront(w, ctx) {
        const M = w.M, h = w.hero; if (!M || M.meterA < 0.02) return;
        const x = h.x - 40, y = feetY(h) - HH + 6, low = M.sta < 0.3;
        if (low && M.blink && Math.sin(w.time * 22) > 0) return;
        ctx.globalAlpha = M.meterA;
        ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.stroke();
        ctx.strokeStyle = M.col || "#ffffff"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + TAU * M.sta); ctx.stroke();
        ctx.globalAlpha = 1;
      },
      setup(w) { w.hero = mkHero(w, 306); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 306, y: G, st: "climb", sta: 1, spd: 110, meterA: 0, surf: G, beat: 0 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.st === "climb") {
          M.sta = Math.max(0.05, M.sta - dt * 0.75); M.y -= M.spd * dt;
          if (M.sta < 0.3) { M.beat -= dt; if (M.beat <= 0) { M.beat = 0.32; w.emit("beat", h); } }
          if (M.y <= 90 + HH) { M.st = "pull"; M.pt = 0; }
        } else if (M.st === "pull") {
          M.pt += dt; const k = Math.min(1, M.pt / 0.3);
          M.y = 90 + HH - HH * E.out(k); M.x = 306 + 50 * E.out(k);
          if (k >= 1) { M.st = "top"; M.surf = 90; M.end = M.t + 0.4; w.emit("top", h); }
        } else if (M.st === "top") M.sta = Math.min(1, M.sta + dt * 1.6);
        put(h, M.x, M.y, M.surf);
        fadeOut(w, M, h, dt, 0.5);
      },
      steps: [
        {
          id: "meter", name: { en: "Stamina Wheel", ko: "지구력 원" }, param: "show while climbing",
          cap: { en: "A *wheel* by the body. Shown only when climbing.", ko: "몸 옆에 *원 게이지*. 오를 때만 보여요." },
          update(w) { const M = w.M; if (M) M.meterA += ((M.st === "top" && M.sta >= 1 ? 0 : 1) - M.meterA) * 0.15; },
        },
        {
          id: "color", name: { en: "Color Shift", ko: "색 바뀜" }, param: "green → yellow → red",
          cap: { en: "*Green, yellow, red.* Read it in a glance.", ko: "*초록, 노랑, 빨강.* 한눈에 읽혀요." },
          update(w) { const M = w.M; if (M) M.col = M.sta > 0.6 ? "#4ade80" : M.sta > 0.3 ? "#facc15" : "#ef4444"; },
        },
        {
          id: "strain", name: { en: "Strain", ko: "힘겨움" }, param: "tremble · speed ×0.5",
          cap: { en: "Low stamina = *trembling* and *slower*.", ko: "힘이 없으면 *덜덜* 떨고 *느려져요*." },
          update(w) { const M = w.M; if (M && M.st === "climb" && M.sta < 0.35) { w.hero.vib = 1.6; M.spd = 55; } },
        },
        {
          id: "sweat", name: { en: "Sweat Drops", ko: "땀방울" }, param: "drops when low",
          cap: { en: "*Sweat* flies off when it's close.", ko: "아슬아슬하면 *땀*이 튀어요." },
          update(w) {
            const M = w.M, h = w.hero; if (!M || M.st !== "climb" || M.sta > 0.45 || Math.random() > 0.12) return;
            w.spawn({ x: h.x - 8, y: feetY(h) - HH + 8, vx: -rand(40, 120), vy: -rand(60, 160), g: 900, life: 0.6, size: 2.5, color: "125,211,252" });
          },
        },
        {
          id: "blink", name: { en: "Warning Blink", ko: "경고 깜빡임" }, param: "meter blink · red tint",
          cap: { en: "Meter *blinks*, body *flushes red*.", ko: "게이지가 *깜빡*, 몸이 *붉게*." },
          update(w) { const M = w.M; if (M) M.blink = true; },
          beat(w, h) { h.tint = 0.5; },
        },
        {
          id: "relief", name: { en: "Relief", ko: "안도" }, param: "refill burst · breathe",
          cap: { en: "Made it. *Refill burst* and a deep breath.", ko: "다 올랐다. *충전 번쩍*, 그리고 크게 숨." },
          top(w, h) {
            w.spawn({ type: "ring", x: h.x - 40, y: feetY(h) - HH + 6, size: 16, size1: 56, life: 0.5, w: 6, color: "74,222,128" });
            sparks(w, h.x - 40, feetY(h) - HH + 6, 12, "134,239,172", [120, 300]);
            h.sx = 1.15; h.sy = 0.85; w.after(0.3, () => { h.sx = 0.95; h.sy = 1.08; });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "heartbeat when low",
          cap: { en: "A *heartbeat* thumps when you're close.", ko: "아슬아슬하면 *쿵쿵* 심장 소리." },
          beat(w) { w.play(() => { tn({ f: 70, f2: 45, dur: 0.1, vol: 0.5 }); tn({ f: 65, f2: 40, dur: 0.1, vol: 0.35, delay: 0.12 }); }); },
          top(w) { w.sfx.chime(0); },
        },
      ],
    },

    /* 24. 달리기 시작 */
    {
      id: "move-runstart", cat: "move", view: "side",
      title: { en: "Give the first step *weight*", ko: "첫걸음에 *무게*를" },
      intro: { en: "Full speed on frame one. *No body.*", ko: "첫 프레임부터 최고 속도. *몸이 없어요.*" },
      interval: 2.0, stepDur: 3.4,
      drawFloor(w, ctx) { slab(ctx, 20, 520, G); },
      setup(w) { w.hero = mkHero(w, 70); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, x: 70, vx: 330, acc: 0, wait: 0, tick: 0, st: "ready" };
        w.emit("ready", w.hero);
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.st === "ready") { if (M.t >= M.wait) { M.st = "run"; w.emit("go", h); } }
        else if (M.st === "run") {
          if (M.acc) M.vx = Math.min(330, M.vx + M.acc * dt);
          M.x += M.vx * dt; M.tick -= dt;
          if (M.tick <= 0) { M.tick = 0.17; w.emit("stride", h, M.vx); }
          if (M.x > 470) { M.st = "stop"; M.end = M.t; }
        }
        put(h, M.x, G);
        fadeOut(w, M, h, dt, 0.15);
      },
      steps: [
        {
          id: "accel", name: { en: "Acceleration", ko: "가속" }, param: "0 → 330 · 1100/s²",
          cap: { en: "Start from *zero* and build up.", ko: "*0에서* 시작해서 붙여 가요." },
          go(w) { w.M.vx = 0; w.M.acc = 1100; },
        },
        {
          id: "antic", name: { en: "Crouch Before Go", ko: "출발 전 웅크림" }, param: "hold 120ms",
          cap: { en: "*Dip back* for a beat before the push.", ko: "출발 전 한 박자 *뒤로 웅크려요*." },
          ready(w, h) { w.M.wait = 0.12; h.sx = 1.2; h.sy = 0.8; h.rot = -0.12; },
        },
        {
          id: "lean", name: { en: "Acceleration Lean", ko: "가속할수록 숙임" }, param: "rot ∝ (top − v)",
          cap: { en: "*Lean hard* while speeding up, stand at top speed.", ko: "속도 붙일 땐 *확 숙이고*, 최고 속도면 펴요." },
          update(w) { const M = w.M; if (M && M.st === "run") w.hero.rot = 0.08 + (330 - M.vx) / 330 * 0.4; },
        },
        {
          id: "push", name: { en: "Push-off Burst", ko: "박차는 먼지" }, param: "8 puffs back",
          cap: { en: "*Kick off* the ground in a burst of dust.", ko: "땅을 *박차며* 먼지가 확." },
          go(w, h) { dust(w, h.x - 10, G, 14, -1); w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 8, size1: 90, life: 0.4, w: 7, color: "255,255,255" }); },
        },
        {
          id: "stride", name: { en: "Stride Prints", ko: "발자국 간격" }, param: "squash · prints 1.5s",
          cap: { en: "Footprints *spread apart* as speed builds.", ko: "빨라질수록 *발자국 간격*이 벌어져요." },
          stride(w, h) {
            h.sx = 1.1; h.sy = 0.9;
            w.spawn({ type: "ellipse", x: h.x, y: G + 2, size: 13, life: 1.6, hold: true, under: true, color: "198,244,50", add: false });
          },
        },
        {
          id: "lag", name: { en: "Camera Lag", ko: "카메라 따라붙기" }, param: "kick −10px",
          cap: { en: "The camera *lags*, then catches up.", ko: "카메라가 *늦게 따라붙어요*." },
          go(w) { w.kick(-10, 0); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "scuff + steps",
          cap: { en: "A sharp *scuff*, then quickening steps.", ko: "*팍* 박차고, 점점 빨라지는 발소리." },
          go(w) { w.sfx.skid(); },
          stride(w, h, v) { w.play(() => tn({ f: 120 + v / 4, f2: 60, dur: 0.05, vol: 0.28 })); },
        },
      ],
    },

    /* 25. 낙하 데미지 */
    {
      id: "move-hardland", cat: "move", view: "side",
      title: { en: "Make a hard landing *hurt*", ko: "높은 착지가 *아프게*" },
      intro: { en: "Fell from the sky. *Took damage?*", ko: "하늘에서 떨어졌는데 *다친 거예요?*" },
      interval: 1.9, stepDur: 3.6,
      drawFloor(w, ctx) { slab(ctx, 20, 520, G); },
      setup(w) { w.hero = mkHero(w, 270); w.M = null; },
      fire(w) {
        reset(w.hero);
        w.M = { t: 0, y: -10, vy: 0, st: "fall", stun: 0 };
      },
      update(w, dt) {
        const M = w.M, h = w.hero; if (!M) return;
        M.t += dt;
        if (M.st === "fall") {
          M.vy += 2400 * dt; M.y += M.vy * dt;
          if (M.y >= G) { M.y = G; M.st = "down"; w.emit("land", h, M.vy); }
        } else if (M.stun > 0) {
          M.stun -= dt; h.sx = 1.2; h.sy = 0.75;
          if (M.stun <= 0) w.emit("rise", h);
        } else if (M.end == null) M.end = M.t;
        put(h, 270, M.y);
        fadeOut(w, M, h, dt, 0.5);
      },
      steps: [
        {
          id: "squash", name: { en: "Crumple + Stagger", ko: "찌그러지고 휘청" }, param: "1.6/0.45 · stun 400ms",
          cap: { en: "*Crumple* and stay down a moment.", ko: "*푹* 주저앉고 잠깐 못 일어나요." },
          land(w, h) { h.sx = 1.6; h.sy = 0.45; w.M.stun = 0.4; },
          rise(w, h) { h.sx = 0.85; h.sy = 1.2; },
        },
        {
          id: "crack", name: { en: "Ground Cracks", ko: "땅 갈라짐" }, param: "4 cracks · decal",
          cap: { en: "The ground *cracks* under you.", ko: "발밑 땅이 *쩍* 갈라져요." },
          land(w, h) {
            for (const s of [-1, 1]) for (let i = 0; i < 2; i++) w.spawn({ type: "crack", x: h.x, y: G + 1, pts: [[0, 0], [s * rand(25, 40), rand(-2, 4)], [s * rand(60, 80), rand(-4, 6)], [s * rand(95, 125), rand(-2, 8)]], w: 4, life: 1.8, hold: true, under: true, color: "10,10,14", add: false });
          },
        },
        {
          id: "shake", name: { en: "Heavy Shake", ko: "큰 흔들림" }, param: "trauma .45 · kick 14",
          cap: { en: "A *heavy shake* straight down.", ko: "아래로 *쿵* 크게 흔들려요." },
          land(w) { w.shake(0.45); w.kick(0, 14); },
        },
        {
          id: "damage", name: { en: "Damage Number", ko: "피해 숫자" }, param: "−15 · red tint",
          cap: { en: "Show the *cost*. Red number, red body.", ko: "*대가*를 보여줘요. 빨간 숫자, 빨간 몸." },
          land(w, h) { h.tint = 1; w.spawn({ type: "text", text: "−15", x: h.x + 50, y: G - 100, vy: -60, life: 1.1, size: 36, color: "#ef4444" }); },
        },
        {
          id: "debris", name: { en: "Flying Rocks", ko: "튀는 돌" }, param: "10 chunks",
          cap: { en: "*Rocks* burst out to both sides.", ko: "양옆으로 *돌조각*이 튀어요." },
          land(w, h) {
            for (let i = 0; i < 16; i++) w.spawn({ type: "chunk", x: h.x + rand(-20, 20), y: G - 4, vx: rand(-360, 360), vy: -rand(220, 560), g: 1600, vr: rand(-12, 12), life: 1.6, hold: true, size: rand(4, 8), color: pick(["150,150,160", "100,100,110"]), ground: true, gy: G + 4, bounce: 0.35 });
            dust(w, h.x - 20, G, 6, -1); dust(w, h.x + 20, G, 6, 1);
          },
        },
        {
          id: "vignette", name: { en: "Red Edges", ko: "붉은 테두리" }, param: "vignette .55",
          cap: { en: "*Red edges* flash. You got hurt.", ko: "*붉은 테두리*가 번쩍. 다쳤어요." },
          land(w) { w.vignette(0.55); },
        },
        {
          id: "ring", name: { en: "Shockwave", ko: "충격파" }, param: "flat ring 120",
          cap: { en: "A wide *shockwave* rolls out.", ko: "넓은 *충격파*가 퍼져요." },
          land(w, h) {
            w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 14, size1: 180, life: 0.5, w: 10, color: "255,255,255" });
            w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 10, size1: 110, life: 0.7, w: 6, color: "239,68,68" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slam + grunt",
          cap: { en: "A deep *slam* and a pained grunt.", ko: "묵직한 *쾅*, 그리고 *윽*." },
          land(w) { w.sfx.slam(); w.sfx.hurt(); },
        },
      ],
    },
  );
})();

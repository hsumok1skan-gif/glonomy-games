"use strict";
/* env — 환경·월드 반응 레시피 20편 */
(() => {
  // 먼지: 블룸에 하얗게 번지지 않도록 바닥 레이어(under)에 그림
  const dirt = (w, x, y, n, dir = 0, col = "150,140,130") => { for (let i = 0; i < n; i++) w.spawn({ type: "smoke", under: true, x: x + rand(-10, 10), y: y - rand(0, 6), vx: (dir || (Math.random() < 0.5 ? -1 : 1)) * rand(40, 180), vy: rand(-60, -10), drag: 3, size: rand(4, 8), size1: rand(12, 20), life: rand(0.35, 0.6), color: col }); };
  // ───── 파일 전용 도우미 ─────
  const skyFill = (ctx, top, bot, y1 = G) => {
    const g = ctx.createLinearGradient(0, -60, 0, y1);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(-100, -100, 740, y1 + 100);
  };
  const groundFill = (ctx, col = "#1b1d24", line = "rgba(255,255,255,0.22)") => {
    ctx.fillStyle = col; ctx.fillRect(-100, G, 740, 200);
    ctx.fillStyle = line; ctx.fillRect(-100, G - 1, 740, 1.5);
  };
  const add = ctx => { ctx.globalCompositeOperation = "lighter"; };
  const norm = ctx => { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; };

  // 빗방울
  const newDrop = (w, x, y) => {
    const d = { x, y, vx: 0, vy: rand(950, 1150), len: 0, far: false };
    w.emit("drop", d);
    w.drops.push(d);
  };
  // 눈 쌓이는 높이
  const PB = 8;
  const snowBase = (w, x) => { const c = w.crate; return Math.abs(x - c.x) < c.w / 2 - 3 ? G - c.h : G; };
  const addPile = (w, x) => {
    const i = Math.round((x + 20) / PB);
    for (let k = -2; k <= 2; k++) {
      const j = i + k; if (j < 0 || j >= w.pile.length) continue;
      if (snowBase(w, j * PB - 20) !== snowBase(w, x)) continue;
      w.pile[j] = Math.min(26, w.pile[j] + [0.5, 1.4, 2.6, 1.4, 0.5][k + 2]);
    }
  };
  const pileAt = (w, x) => { const i = Math.round((x + 20) / PB); return w.pile[Math.max(0, Math.min(w.pile.length - 1, i))]; };
  // 연못 잎사귀
  const bobPads = (w, dt) => {
    for (const r of w.rip) r.t += dt;
    w.rip = w.rip.filter(r => r.t < 1.4);
    for (const p of w.pads) {
      let px = 0, py = 0;
      for (const r of w.rip) {
        const dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy) || 1, front = r.t * 140;
        const k = Math.exp(-Math.pow((d - front) / 18, 2)) * 9 * (1 - r.t / 1.4);
        px += dx / d * k; py += dy / d * k;
      }
      p.ox += (px - p.ox) * Math.min(1, dt * 10); p.oy += (py - p.oy) * Math.min(1, dt * 10);
      p.rot += px * dt * 0.4;
    }
  };

  // 번개 모양
  const boltPath = (x0, y0, x1, y1, n, j) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, off = i === 0 || i === n ? 0 : rand(-j, j);
      pts.push([x0 + (x1 - x0) * k + off, y0 + (y1 - y0) * k]);
    }
    return pts;
  };
  // 낮·밤
  const lerpRGB = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const nightAt = t => (1 - Math.cos(TAU * t)) / 2;
  const warmAt = t => Math.max(0, 1 - Math.abs((((t % 0.5) + 0.5) % 0.5) - 0.25) / 0.13);
  // 안개 띠
  const fogBand = (ctx, y, r, a, off, col = "180,188,200") => {
    for (let j = 0; j < 10; j++) {
      const x = ((j * 82 + off) % 820 + 820) % 820 - 140;
      ctx.save(); ctx.translate(x, y + Math.sin(j * 1.7) * r * 0.2); ctx.scale(2.4, 1);
      glow(ctx, 0, 0, r, col, a * 0.55); ctx.restore();
    }
    const g = ctx.createLinearGradient(0, y - r * 0.7, 0, y + r * 0.7);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${a * 0.5})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(-100, y - r * 0.7, 740, r * 1.4);
  };

  // 낙엽
  const newLeaf = (w, x, y, vx = 0) => {
    const l = { x, y, vx, vy: 90, rot: rand(0, TAU), spin: 0, sway: 0, ph: rand(0, TAU), c: "200,120,50", stay: false, landed: false };
    w.emit("leaf", l);
    w.leaves.push(l);
  };
  const drawLeaf = (ctx, l, tumble) => {
    ctx.save(); ctx.translate(l.x, l.y);
    if (tumble && !l.landed) { ctx.rotate(Math.sin(l.rot) * 0.8); ctx.scale(Math.cos(l.rot * 1.3), 1); }
    else ctx.rotate(l.landed ? 0.2 : 0);
    ctx.fillStyle = `rgb(${l.c})`;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, -7, 9, 0); ctx.quadraticCurveTo(0, 7, -9, 0); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.restore();
  };
  // 벽돌 벽
  const WB = { x0: 330, cols: 5, rows: 9, bw: 26, bh: 16 };
  const brickXY = (c, r) => ({ x: WB.x0 + c * WB.bw, y: G - (r + 1) * WB.bh });
  const buildWall = w => { w.bricks = Array.from({ length: WB.rows }, () => Array(WB.cols).fill(true)); };
  const brickCount = w => w.bricks.flat().filter(Boolean).length;
  // 유리 조각
  const shardPts = () => { const n = 3 + (Math.random() < 0.4 ? 1 : 0), r = rand(8, 20); return Array.from({ length: n }, (_, i) => { const a = i / n * TAU + rand(-0.4, 0.4); return [Math.cos(a) * r * rand(0.5, 1), Math.sin(a) * r * rand(0.5, 1)]; }); };
  // 드럼통 그림
  const barrelSpr = () => sprite("env-barrel", 92, 140, x => {
    const g = x.createLinearGradient(0, 0, 92, 0);
    g.addColorStop(0, "#7f1d1d"); g.addColorStop(0.35, "#ef4444"); g.addColorStop(0.6, "#dc2626"); g.addColorStop(1, "#5b1010");
    x.fillStyle = g; x.beginPath(); x.roundRect(4, 12, 84, 124, 10); x.fill();
    x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(4, 44, 84, 7); x.fillRect(4, 96, 84, 7);
    x.fillStyle = "#facc15"; x.fillRect(4, 64, 84, 16);
    x.fillStyle = "#991b1b"; x.beginPath(); x.ellipse(46, 13, 42, 10, 0, 0, TAU); x.fill();
    x.fillStyle = "rgba(255,255,255,0.25)"; x.fillRect(22, 18, 8, 110);
  });

  // 횃불 그림자용 검은 실루엣
  let heroBlack = null;
  const blackHero = w => heroBlack || (heroBlack = tinted(w.hero.s.c, "#000000"));
  const flick = t => 0.5 + 0.25 * Math.sin(t * 13) + 0.15 * Math.sin(t * 29 + 1) + 0.1 * Math.sin(t * 47 + 2);
  const flame = (ctx, x, y, h, wd, lean, col) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - wd, y);
    ctx.quadraticCurveTo(x - wd * 1.1, y - h * 0.5, x + lean * h, y - h);
    ctx.quadraticCurveTo(x + wd * 1.1, y - h * 0.5, x + wd, y);
    ctx.quadraticCurveTo(x, y + wd * 0.8, x - wd, y); ctx.fill();
  };
  // 빛줄기 영역
  const SHAFT = [[154, 78], [218, 78], [460, G], [292, G]];
  const inShaft = (x, y) => {
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = SHAFT[i], [bx, by] = SHAFT[(i + 1) % 4];
      if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) return false;
    }
    return true;
  };
  // 나무 상자
  const woodCrate = () => {
    sprite("env-wood", 120, 120, x => {
      x.fillStyle = "#8a5a2b"; x.fillRect(0, 0, 120, 120);
      x.fillStyle = "#b07a3e"; for (let i = 0; i < 4; i++) x.fillRect(14, 14 + i * 24, 92, 20);
      x.strokeStyle = "#6b4220"; x.lineWidth = 14; x.beginPath(); x.moveTo(14, 14); x.lineTo(106, 106); x.stroke();
      x.strokeStyle = "rgba(0,0,0,0.35)"; x.lineWidth = 4; x.strokeRect(2, 2, 116, 116);
      x.fillStyle = "rgba(255,255,255,0.15)"; x.fillRect(0, 0, 120, 6);
    });
    if (!ACTOR["env-wood"]) ACTOR["env-wood"] = { spr: "env-wood", h: 92, home: 400 };
  };

  RECIPES.push(
    // ───────────────────────── 1. 비
    {
      id: "env-rain", cat: "env", view: "side", polished: true,
      title: { en: "Make rain *hit the ground*", ko: "비가 *땅에 닿게*" },
      intro: { en: "Dots fall. Then *vanish* into nothing.", ko: "점이 떨어지다 *그냥 사라져요*." },
      interval: 0.7, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("hero", { home: 150 });
        w.drops = []; w.acc = 0; w.wet = 0;
      },
      fire(w) {
        for (let i = 0; i < 26; i++) newDrop(w, rand(-40, 620), rand(-260, 0));
        w.emit("pour");
      },
      update(w, dt) {
        w.acc += dt * 80;
        while (w.acc > 1) { w.acc--; newDrop(w, rand(-40, 620), rand(-60, -10)); }
        for (const d of w.drops) {
          d.x += d.vx * dt; d.y += d.vy * dt;
          const gy = d.far ? G - 14 : G;
          if (d.y >= gy) { d.dead = true; if (!d.far) w.emit("land", d); }
        }
        w.drops = w.drops.filter(d => !d.dead);
      },
      drawFloor(w, ctx) {
        skyFill(ctx, "#0d1018", "#1a2030");
        groundFill(ctx, "#15171d");
        // 가로등
        ctx.fillStyle = "#2b3040"; ctx.fillRect(418, G - 190, 7, 190); ctx.fillRect(400, G - 194, 36, 8);
        add(ctx); glow(ctx, 410, G - 182, 70, "255,214,140", 0.35); norm(ctx);
        if (w.wet > 0) {
          const g = ctx.createLinearGradient(0, G, 0, G + 70);
          g.addColorStop(0, `rgba(120,150,200,${0.22 * w.wet})`); g.addColorStop(1, "rgba(120,150,200,0)");
          ctx.fillStyle = g; ctx.fillRect(-100, G, 740, 70);
          add(ctx);
          const r = ctx.createLinearGradient(0, G, 0, G + 75);
          r.addColorStop(0, `rgba(255,214,140,${0.5 * w.wet})`); r.addColorStop(1, "rgba(255,214,140,0)");
          ctx.fillStyle = r; ctx.fillRect(398 + Math.sin(w.time * 9) * 2, G, 24, 75);
          norm(ctx);
        }
      },
      drawFront(w, ctx) {
        ctx.lineCap = "round";
        for (const d of w.drops) {
          ctx.strokeStyle = d.far ? "rgba(170,190,225,0.32)" : "rgba(190,210,240,0.85)";
          ctx.fillStyle = ctx.strokeStyle;
          if (d.len > 0) {
            const k = d.len / Math.hypot(d.vx, d.vy);
            ctx.lineWidth = d.far ? 1 : 1.8;
            ctx.beginPath(); ctx.moveTo(d.x - d.vx * k, d.y - d.vy * k); ctx.lineTo(d.x, d.y); ctx.stroke();
          } else { ctx.beginPath(); ctx.arc(d.x, d.y, 1.8, 0, TAU); ctx.fill(); }
        }
      },
      steps: [
        {
          id: "streak", name: { en: "Streaks", ko: "빗줄기" }, param: "len 22px",
          cap: { en: "Fast drops read as *lines*, not dots.", ko: "빠른 물방울은 점 말고 *선*으로." },
          drop(w, d) { d.len = 22; },
        },
        {
          id: "slant", name: { en: "Wind Slant", ko: "바람 기울기" }, param: "vx −180",
          cap: { en: "Tilt it a little. *Wind* makes it feel real.", ko: "살짝 *비스듬히*. 바람이 있어야 진짜 같아요." },
          drop(w, d) { d.vx = -180; d.x += 60; },
        },
        {
          id: "splash", name: { en: "Splash", ko: "튀는 물" }, param: "3 drops / hit",
          cap: { en: "Every drop *bounces back up* when it lands.", ko: "땅에 닿으면 물이 *톡* 튀어 올라요." },
          land(w, d) {
            for (let i = 0; i < 3; i++) w.spawn({ type: "spark", x: d.x, y: G - 1, vx: rand(-90, 90), vy: rand(-230, -110), g: 1100, life: 0.26, size: 1.5, color: "200,220,255" });
          },
        },
        {
          id: "ripple", name: { en: "Ground Rings", ko: "바닥 물결" }, param: "ring 14px · 0.35s",
          cap: { en: "Leave a tiny *ring* where it hits.", ko: "떨어진 자리에 작은 *물결*을 남겨요." },
          land(w, d) { w.spawn({ type: "ring", flat: true, x: d.x, y: G + rand(2, 26), size: 2, size1: 16, life: 0.4, w: 2, color: "170,200,240" }); },
        },
        {
          id: "depth", name: { en: "Two Layers", ko: "앞뒤 두 겹" }, param: "far ×0.7 speed",
          cap: { en: "Half the rain is *far away*: dimmer, slower.", ko: "절반은 *멀리*. 흐리고 느리게." },
          drop(w, d) { if (Math.random() < 0.5) { d.far = true; d.vy *= 0.7; d.len *= 0.5; } },
        },
        {
          id: "wet", name: { en: "Wet Floor", ko: "젖은 바닥" }, param: "reflect lamp",
          cap: { en: "Wet ground *reflects* the light.", ko: "젖은 바닥에 불빛이 *비쳐요*." },
          update(w, dt) { w.wet = Math.min(1, w.wet + dt); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hiss + patter",
          cap: { en: "A soft *hiss* under everything.", ko: "깔리는 *쏴아* 소리." },
          pour(w) { w.play(() => { nz({ dur: 0.7, type: "highpass", f: 2800, vol: 0.2 }); nz({ dur: 0.3, type: "bandpass", f: 900, q: 1, vol: 0.12 }); }); },
        },
      ],
    },

    // ───────────────────────── 2. 눈
    {
      id: "env-snow", cat: "env", view: "side", polished: true,
      title: { en: "Let snow *pile up*", ko: "눈이 *쌓이게*" },
      intro: { en: "It snows forever. The ground *never changes*.", ko: "계속 오는데 땅은 *그대로*예요." },
      interval: 0.9, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 140 });
        woodCrate(); w.crate = w.actor("env-wood", { home: 400, h: 80 });
        w.flakes = []; w.acc = 0;
        w.pile = new Float32Array(Math.ceil(600 / PB));
      },
      fire(w) {
        for (let i = 0; i < 34; i++) {
          const f = { x: rand(-20, 580), y: rand(-20, G - 60), vy: 70, r: 2.5, sway: 0, ph: rand(0, TAU) };
          w.emit("flake", f); w.flakes.push(f);
        }
        w.emit("flurry");
      },
      update(w, dt) {
        w.acc += dt * 28;
        while (w.acc > 1) {
          w.acc--;
          const f = { x: rand(-20, 580), y: -10, vy: 70, r: 2.5, sway: 0, ph: rand(0, TAU) };
          w.emit("flake", f); w.flakes.push(f);
        }
        for (const f of w.flakes) {
          f.y += f.vy * dt; f.x += Math.cos(w.time * 1.7 + f.ph) * f.sway * dt;
          if (f.y >= snowBase(w, f.x) - pileAt(w, f.x)) { f.dead = true; w.emit("land", f); }
        }
        w.flakes = w.flakes.filter(f => !f.dead);
      },
      drawFloor(w, ctx) { skyFill(ctx, "#0e1220", "#232a3c"); groundFill(ctx, "#1c2029"); },
      drawFront(w, ctx) {
        // 쌓인 눈
        ctx.fillStyle = "#eef3fb";
        let run = null;
        const flush = () => {
          if (!run || run.pts.length < 2) { run = null; return; }
          ctx.beginPath(); ctx.moveTo(run.pts[0][0], run.base);
          for (const [x, y] of run.pts) ctx.lineTo(x, y);
          ctx.lineTo(run.pts[run.pts.length - 1][0], run.base); ctx.closePath(); ctx.fill();
          run = null;
        };
        for (let i = 0; i < w.pile.length; i++) {
          const x = i * PB - 20, b = snowBase(w, x);
          if (run && run.base !== b) flush();
          if (!run) run = { base: b, pts: [] };
          run.pts.push([x, b - w.pile[i]]);
        }
        flush();
        for (const f of w.flakes) {
          ctx.fillStyle = `rgba(255,255,255,${f.r < 2 ? 0.45 : 0.95})`;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
        }
      },
      steps: [
        {
          id: "drift", name: { en: "Drift", ko: "흔들리며 낙하" }, param: "sway 25–50px",
          cap: { en: "Snow doesn't drop. It *drifts* side to side.", ko: "눈은 떨어지지 않고 *살랑살랑* 내려요." },
          flake(w, f) { f.sway = rand(25, 50); },
        },
        {
          id: "depth", name: { en: "Three Sizes", ko: "크기 세 가지" }, param: "r 1.5 / 2.5 / 4.5",
          cap: { en: "Big = close and fast. Small = *far and slow*.", ko: "크면 가깝고 빠르게, 작으면 *멀고 느리게*." },
          flake(w, f) { f.r = pick([1.5, 2.5, 4.5]); f.vy *= f.r / 2.5; },
        },
        {
          id: "pile", name: { en: "Pile Up", ko: "쌓이기" }, param: "+2.6px / flake",
          cap: { en: "Each flake *adds height*. The ground turns white.", ko: "한 송이마다 *조금씩* 쌓여요. 땅이 하얘져요." },
          land(w, f) { addPile(w, f.x); },
        },
        {
          id: "stick", name: { en: "Linger", ko: "잠깐 머물기" }, param: "stay 1.2s",
          cap: { en: "Flakes *sit* for a moment before melting in.", ko: "닿은 눈송이가 *잠깐* 머물다 녹아요." },
          land(w, f) { w.spawn({ type: "circle", x: f.x, y: f.y, size: f.r, life: 1.2, hold: true, color: "255,255,255" }); },
        },
        {
          id: "glint", name: { en: "Glints", ko: "반짝임" }, param: "10 / sec",
          cap: { en: "Fresh snow *sparkles* here and there.", ko: "새 눈은 여기저기 *반짝*여요." },
          update(w, dt) {
            if (Math.random() > dt * 10) return;
            const x = rand(0, 540);
            w.spawn({ type: "star", x, y: snowBase(w, x) - pileAt(w, x) + 2, size: rand(4, 8), life: 0.4, color: "220,235,255" });
          },
        },
        {
          id: "breath", name: { en: "Cold Breath", ko: "입김" }, param: "3 puffs",
          cap: { en: "Show the *cold* on the character: breath puffs.", ko: "추위는 *캐릭터*로 보여줘요. 하얀 입김." },
          flurry(w) {
            const h = w.hero;
            for (let i = 0; i < 3; i++) w.spawn({ type: "smoke", under: true, x: h.x + 34, y: G - 124, vx: rand(30, 70), vy: rand(-30, -10), drag: 1.5, size: 3, size1: rand(9, 13), life: rand(0.8, 1.1), alpha: 0.6, color: "230,240,255" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft wind",
          cap: { en: "Snow is *quiet*. Just a low, soft wind.", ko: "눈은 *조용해요*. 낮고 부드러운 바람만." },
          flurry(w) { w.play(() => nz({ dur: 1, type: "bandpass", f: 500, f2: 300, q: 0.8, vol: 0.18 })); },
        },
      ],
    },

    // ───────────────────────── 3. 바람과 풀
    {
      id: "env-wind", cat: "env", view: "side", polished: true,
      title: { en: "Make wind *visible*", ko: "바람을 *눈에 보이게*" },
      intro: { en: "A gust? Everything just *tilts* at once.", ko: "바람이 불면… 전부 *한꺼번에* 기울어요." },
      interval: 1.5, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 300 });
        w.blades = [];
        for (let i = 0; i < 120; i++) w.blades.push({ x: i * 4.6 - 10 + rand(-2, 2), h: rand(16, 42), bend: 0, v: 0, c: pick(["74,140,60", "96,165,70", "60,120,52", "120,180,80"]) });
        w.flat = 0; w.front = null; w.sway = 0;
      },
      fire(w) {
        if (!w.on("wave")) w.flat = 0.7;
        w.emit("gust");
      },
      update(w, dt) {
        w.flat = Math.max(0, w.flat - dt * 1.4);
        if (w.front != null) { w.front += 720 * dt; if (w.front > 700) w.front = null; }
        for (const b of w.blades) {
          let t = w.flat;
          if (w.front != null && b.x < w.front) t += 1.2 * Math.exp(-Math.pow((w.front - b.x) / 140, 2));
          b.v += (t - b.bend) * dt * 140; b.v *= Math.pow(0.02, dt); b.bend += b.v * dt;
        }
      },
      drawFloor(w, ctx) { skyFill(ctx, "#16202a", "#24323a"); groundFill(ctx, "#1d2419"); },
      drawFront(w, ctx) {
        ctx.lineCap = "round";
        for (const b of w.blades) {
          const a = b.bend + Math.sin(w.time * 2.3 + b.x * 0.035) * w.sway;
          const tx = b.x + Math.sin(a) * b.h, ty = G - Math.cos(a) * b.h;
          ctx.strokeStyle = `rgb(${b.c})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(b.x, G + 1); ctx.quadraticCurveTo(b.x, G - b.h * 0.5, tx, ty); ctx.stroke();
        }
      },
      steps: [
        {
          id: "sway", name: { en: "Idle Sway", ko: "평소 살랑임" }, param: "±8° · sine",
          cap: { en: "Even with no wind, grass *never stands still*.", ko: "바람이 없어도 풀은 *살랑살랑*." },
          update(w) { w.sway = 0.14; },
        },
        {
          id: "wave", name: { en: "Traveling Wave", ko: "번져 가는 물결" }, param: "720 px/s",
          cap: { en: "The gust *travels*. Blades bend *one after another*.", ko: "바람은 *지나가요*. 풀이 *차례로* 누워요." },
          gust(w) { w.front = -80; },
        },
        {
          id: "streaks", name: { en: "Wind Lines", ko: "바람 선" }, param: "6 streaks",
          cap: { en: "Draw the air itself: thin *white streaks*.", ko: "공기를 그려요. 가느다란 *흰 선*." },
          gust(w) {
            for (let i = 0; i < 6; i++) w.after(i * 0.06, () => w.spawn({ type: "spark", x: rand(-80, 100), y: rand(60, G - 30), vx: rand(900, 1300), vy: rand(-30, 30), life: 0.55, size: 1.6, color: "235,245,255" }));
          },
        },
        {
          id: "bits", name: { en: "Flying Bits", ko: "날리는 풀잎" }, param: "10 bits",
          cap: { en: "Rip a few *bits* loose. They tumble along.", ko: "풀잎 몇 개가 *뜯겨* 날아가요." },
          gust(w) {
            for (let i = 0; i < 10; i++) w.after(i * 0.07, () => w.spawn({ type: "chunk", x: i * 60 - 40, y: G - rand(10, 40), vx: rand(380, 620), vy: rand(-200, -60), g: 220, vr: rand(-12, 12), life: 1.2, size: 3.5, color: pick(["96,165,70", "140,190,90"]) }));
          },
        },
        {
          id: "lean", name: { en: "Character Leans", ko: "몸도 기울기" }, param: "rot .1 · timed",
          cap: { en: "When the wave *reaches* the hero, he leans.", ko: "바람이 *닿는 순간* 캐릭터도 휘청." },
          gust(w) {
            const h = w.hero;
            w.after((h.x + 80) / 720, () => { h.ox += 12; w.tween(h, { rot: 0.1 }, 0.12, "out", () => w.tween(h, { rot: 0 }, 0.5, "inout")); });
          },
        },
        {
          id: "dust", name: { en: "Ground Dust", ko: "흙먼지" }, param: "follows front",
          cap: { en: "Kick up *dust* right under the wave.", ko: "물결 바로 아래로 *흙먼지*." },
          gust(w) {
            for (let i = 0; i < 8; i++) w.after(i * 0.1, () => w.spawn({ type: "smoke", under: true, x: -80 + i * 72, y: G - 6, vx: rand(200, 320), vy: rand(-40, -10), drag: 2, size: 6, size1: 22, life: 0.7, color: "160,150,120" }));
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising whoosh",
          cap: { en: "A *whoosh* that rises and falls.", ko: "커졌다 잦아드는 *휘잉*." },
          gust(w) { w.play(() => nz({ dur: 1, type: "bandpass", f: 300, f2: 1400, q: 1.2, vol: 0.35 })); },
        },
      ],
    },

    // ───────────────────────── 4. 물웅덩이
    {
      id: "env-puddle", cat: "env", view: "side", polished: true,
      title: { en: "Make puddles *splash*", ko: "물웅덩이 *철벅*" },
      intro: { en: "He lands in water. The water *doesn't care*.", ko: "물에 뛰어들었는데 물이 *반응이 없어요*." },
      interval: 1.0, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("hero", { home: 270 });
        w.pud = { amp: 0 }; w.refl = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero;
        w.tween(h, { oy: -70 }, 0.16, "out", () => w.tween(h, { oy: 0 }, 0.13, "in", () => {
          w.emit("land", { x: h.x, y: G });
          w.busy = false;
        }));
      },
      update(w, dt) { w.pud.amp = Math.max(0, w.pud.amp - dt * 1.2); },
      drawFloor(w, ctx) {
        skyFill(ctx, "#121620", "#1c2230");
        groundFill(ctx, "#3a322a");
        const P = w.pud, wob = Math.sin(w.time * 22) * P.amp;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(270, G + 18, 130 + wob * 4, 26 - wob * 3, 0, 0, TAU);
        ctx.fillStyle = "#1a2a3c"; ctx.fill(); ctx.clip();
        if (w.refl > 0) {
          const h = w.hero, img = h.s.c;
          ctx.globalAlpha = w.refl;
          ctx.translate(h.x + Math.sin(w.time * 30) * 6 * P.amp, G + 4 - h.oy * 0.35);
          ctx.scale(h.sx, -0.4 * h.sy);
          ctx.drawImage(img, -h.w / 2, -h.h, h.w, h.h);
        }
        ctx.restore();
        ctx.strokeStyle = `rgba(170,210,255,${0.25 + P.amp * 0.5})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(270, G + 18, 130 + wob * 4, 26 - wob * 3, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      },
      steps: [
        {
          id: "squash", name: { en: "Landing Squash", ko: "착지 찌그러짐" }, param: "sy .78",
          cap: { en: "First, *squash* on landing. Weight goes down.", ko: "먼저 착지할 때 *찌그러지게*." },
          land(w) { w.hero.sx = 1.22; w.hero.sy = 0.78; },
        },
        {
          id: "crown", name: { en: "Splash Crown", ko: "물 왕관" }, param: "18 drops · g 1400",
          cap: { en: "Throw drops *up and out*. A crown of water.", ko: "물방울을 *위로, 바깥으로*. 왕관 모양." },
          land(w, p) {
            for (let i = 0; i < 18; i++) {
              const s = Math.random() < 0.5 ? -1 : 1;
              w.spawn({ x: p.x + s * rand(20, 50), y: G + 8, vx: s * rand(60, 280), vy: rand(-560, -240), g: 1400, life: 0.6, size: rand(2.5, 4.5), color: "200,230,255" });
            }
          },
        },
        {
          id: "rings", name: { en: "Rings", ko: "물결 고리" }, param: "2 rings",
          cap: { en: "Two *rings* spread across the surface.", ko: "수면에 *고리 두 개*가 퍼져요." },
          land(w, p) {
            w.spawn({ type: "ring", flat: true, x: p.x, y: G + 14, size: 20, size1: 120, life: 0.6, w: 4, color: "190,225,255" });
            w.after(0.15, () => w.spawn({ type: "ring", flat: true, x: p.x, y: G + 14, size: 10, size1: 90, life: 0.6, w: 3, color: "190,225,255" }));
          },
        },
        {
          id: "wobble", name: { en: "Surface Wobble", ko: "수면 출렁임" }, param: "amp 1 → 0",
          cap: { en: "The whole puddle *wobbles*, then settles.", ko: "웅덩이 전체가 *출렁*이다 가라앉아요." },
          land(w) { w.pud.amp = 1; },
        },
        {
          id: "reflect", name: { en: "Reflection", ko: "물에 비친 모습" }, param: "mirror α .35",
          cap: { en: "Mirror the hero *in the water*. It shakes too.", ko: "*물에 비친* 모습. 같이 일렁여요." },
          update(w) { w.refl = 0.35; },
        },
        {
          id: "wet", name: { en: "Wet Splats", ko: "젖은 자국" }, param: "6 splats · 3s",
          cap: { en: "Leave *wet marks* around. They dry slowly.", ko: "주변에 *젖은 자국*. 천천히 말라요." },
          land(w, p) {
            for (let i = 0; i < 6; i++) {
              const s = i % 2 ? 1 : -1;
              w.spawn({ type: "ellipse", under: true, x: p.x + s * rand(135, 190), y: G + rand(4, 24), size: rand(10, 20), life: 3, hold: true, add: false, alpha: 0.8, color: "8,12,20" });
            }
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "splash",
          cap: { en: "A wet *splash*, low and short.", ko: "낮고 짧은 *철벅*." },
          land(w) { w.play(() => { nz({ dur: 0.35, type: "bandpass", f: 1400, f2: 400, q: 1, vol: 0.5 }); tn({ f: 160, f2: 70, dur: 0.12, vol: 0.4 }); }); },
        },
      ],
    },

    // ───────────────────────── 5. 물결 (위에서)
    {
      id: "env-ripple", cat: "env", view: "top", polished: true,
      title: { en: "Make water *ripple*", ko: "물결을 *번지게*" },
      intro: { en: "A stone hits the pond. *Plop*. Gone.", ko: "돌이 연못에 퐁. 그리고 *끝*." },
      interval: 0.9, stepDur: 3.6,
      setup(w) {
        w.pads = [[120, 90], [420, 110], [330, 250], [150, 260], [460, 280], [250, 70]].map(([x, y]) => ({ x, y, ox: 0, oy: 0, rot: rand(0, TAU), r: rand(20, 28) }));
        w.rip = [];
      },
      fire(w) {
        const p = { x: rand(170, 380), y: rand(120, 230) };
        // 돌: 위에서 떨어지며 작아지다가 물에 닿음
        w.spawn({ type: "circle", add: false, x: p.x - 30, y: p.y - 70, vx: 120, vy: 280, size: 22, size1: 10, life: 0.25, alpha: 1, color: "170,170,180" });
        w.after(0.25, () => {
          w.spawn({ type: "circle", add: false, x: p.x, y: p.y, size: 14, size1: 3, life: 0.35, color: "5,20,26" });
          w.emit("drop", p);
        });
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#0f2a33"; ctx.fillRect(14, 14, 512, 332);
        const g = ctx.createRadialGradient(270, 180, 40, 270, 180, 320);
        g.addColorStop(0, "rgba(40,110,120,0.35)"); g.addColorStop(1, "rgba(0,0,0,0.3)");
        ctx.fillStyle = g; ctx.fillRect(14, 14, 512, 332);
        ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 3; ctx.strokeRect(14, 14, 512, 332);
      },
      drawBack(w, ctx) {
        for (const p of w.pads) {
          ctx.save(); ctx.translate(p.x + p.ox, p.y + p.oy); ctx.rotate(p.rot);
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(3, 4, p.r, 0.35, TAU - 0.35); ctx.lineTo(0, 0); ctx.fill();
          ctx.fillStyle = "#4d8a3a"; ctx.beginPath(); ctx.arc(0, 0, p.r, 0.35, TAU - 0.35); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(160,220,120,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.restore();
        }
      },
      steps: [
        {
          id: "ring", name: { en: "One Ring", ko: "고리 하나" }, param: "r 70 · 1s",
          cap: { en: "Start with a single *expanding ring*.", ko: "먼저 *퍼지는 고리* 하나." },
          drop(w, p) { w.spawn({ type: "ring", x: p.x, y: p.y, size: 4, size1: 110, life: 1.8, w: 4, color: "190,235,245" }); },
        },
        {
          id: "echo", name: { en: "Echo Rings", ko: "뒤따르는 고리" }, param: "+3 · 0.15s apart",
          cap: { en: "Real ripples come in *sets*. Add smaller echoes.", ko: "물결은 *여러 겹*이에요. 작은 고리를 더해요." },
          drop(w, p) {
            for (let i = 1; i <= 3; i++) w.after(i * 0.15, () => w.spawn({ type: "ring", x: p.x, y: p.y, size: 3, size1: 100 - i * 18, life: 1.7 - i * 0.2, w: 3, color: "190,235,245" }));
          },
        },
        {
          id: "trough", name: { en: "Light + Dark", ko: "밝은 결, 어두운 골" }, param: "dark ring −6px",
          cap: { en: "Pair each bright crest with a *dark trough*.", ko: "밝은 결 옆에 *어두운 골*을 붙여요." },
          drop(w, p) { w.spawn({ type: "ring", add: false, x: p.x, y: p.y, size: 1, size1: 100, life: 1.8, w: 6, color: "4,18,24" }); },
        },
        {
          id: "splash", name: { en: "Droplets", ko: "튀는 물방울" }, param: "12 drops",
          cap: { en: "A burst of *droplets* jumps out of the center.", ko: "가운데서 *물방울*이 톡톡 튀어요." },
          drop(w, p) {
            w.spawn({ type: "star", x: p.x, y: p.y, size: 18, life: 0.15, color: "230,250,255" });
            for (let i = 0; i < 12; i++) { const a = rand(0, TAU), s = rand(60, 200); w.spawn({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3, size: 3, size1: 0.5, life: 0.45, color: "200,240,255" }); }
          },
        },
        {
          id: "pads", name: { en: "Push Floating Things", ko: "떠 있는 것 밀기" }, param: "front 140 px/s",
          cap: { en: "When the ring *reaches* a leaf, it *bobs* away.", ko: "고리가 *닿으면* 잎이 *살짝* 밀려요." },
          drop(w, p) { w.rip.push({ x: p.x, y: p.y, t: 0 }); },
          update(w, dt) { bobPads(w, dt); },
        },
        {
          id: "caustic", name: { en: "Sparkle", ko: "수면 반짝임" }, param: "14 / sec",
          cap: { en: "Tiny *glints* make it read as water, not paint.", ko: "작은 *반짝임*이 있어야 물로 보여요." },
          update(w, dt) { if (Math.random() < dt * 14) w.spawn({ type: "star", x: rand(30, 510), y: rand(30, 330), size: rand(3, 6), life: 0.5, color: "200,240,255" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "plip ↑",
          cap: { en: "A rising *plip*. Tiny and round.", ko: "작고 동그란 *퐁*." },
          drop(w) { w.play(() => { tn({ f: 700, f2: 1700, dur: 0.09, vol: 0.3 }); nz({ dur: 0.08, type: "bandpass", f: 2000, q: 2, vol: 0.12 }); }); },
        },
      ],
    },
    // ───────────────────────── 6. 폭포 물안개
    {
      id: "env-waterfall", cat: "env", view: "side", polished: true,
      title: { en: "Give waterfalls *mist*", ko: "폭포에 *물안개* 입히기" },
      intro: { en: "A blue rectangle. Is it even *moving*?", ko: "파란 사각형. *움직이긴* 하나요?" },
      interval: 1.2, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 450, h: 110 });
        w.surge = 0; w.flow = 0; w.bow = 0;
      },
      fire(w) { w.surge = 1; w.emit("surge", { x: 190, y: G }); },
      update(w, dt) { w.surge = Math.max(0, w.surge - dt * 2); },
      drawFloor(w, ctx) {
        skyFill(ctx, "#0f1820", "#1b2a30");
        groundFill(ctx, "#1a1f1c");
        ctx.fillStyle = "#2a2f36";
        ctx.beginPath(); ctx.moveTo(-100, 70); ctx.lineTo(165, 70); ctx.lineTo(150, 130); ctx.lineTo(140, G); ctx.lineTo(-100, G); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#363c45"; ctx.fillRect(-100, 64, 266, 10);
        ctx.fillStyle = "#183447"; ctx.fillRect(100, G - 4, 320, 30);
        const s = w.surge, x = 160 - s * 10, wd = 60 + s * 20;
        ctx.fillStyle = "rgba(70,140,195,0.92)"; ctx.fillRect(x, 70, wd, G - 70);
        if (w.flow > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(x, 70, wd, G - 70); ctx.clip();
          ctx.strokeStyle = "rgba(220,240,255,0.55)"; ctx.lineWidth = 3; ctx.setLineDash([26, 20]);
          for (let i = 0; i < 7; i++) { ctx.lineDashOffset = -w.flow * (0.85 + (i % 3) * 0.1) - i * 13; ctx.beginPath(); ctx.moveTo(x + 6 + i * wd / 7, 70); ctx.lineTo(x + 6 + i * wd / 7, G); ctx.stroke(); }
          ctx.restore();
        }
      },
      drawFront(w, ctx) {
        if (w.bow <= 0) return;
        add(ctx); ctx.lineWidth = 7;
        ["255,80,80", "255,170,60", "255,240,90", "90,220,110", "80,150,255", "160,100,255"].forEach((c, i) => {
          ctx.strokeStyle = `rgba(${c},${0.16 * w.bow})`;
          ctx.beginPath(); ctx.arc(250, G + 30, 170 - i * 7, Math.PI * 1.08, Math.PI * 1.62); ctx.stroke();
        });
        norm(ctx);
      },
      steps: [
        {
          id: "flow", name: { en: "Scrolling Streaks", ko: "흐르는 결" }, param: "scroll 520 px/s",
          cap: { en: "Scroll *streaks* down the water. Now it *falls*.", ko: "물줄기에 *결*을 흘려요. 이제 *떨어져요*." },
          update(w, dt) { w.flow += dt * 520; },
        },
        {
          id: "foam", name: { en: "Foam", ko: "물거품" }, param: "40 puffs / s",
          cap: { en: "White *foam* boils where it hits the pool.", ko: "떨어지는 곳에 하얀 *거품*이 끓어요." },
          update(w, dt) { if (Math.random() < dt * 40) w.spawn({ type: "smoke", under: true, x: rand(160, 220), y: G - 4, vx: rand(-90, 90), vy: rand(-40, -10), drag: 2, size: 4, size1: 13, life: 0.4, alpha: 0.4, color: "225,238,250" }); },
        },
        {
          id: "spray", name: { en: "Spray", ko: "물보라" }, param: "25 drops / s",
          cap: { en: "Droplets *bounce out* of the impact zone.", ko: "부딪힌 자리에서 *물방울*이 튀어요." },
          update(w, dt) {
            if (Math.random() > dt * 25) return;
            const s = Math.random() < 0.5 ? -1 : 1;
            w.spawn({ x: 190 + s * rand(10, 30), y: G - 6, vx: s * rand(60, 220), vy: rand(-380, -150), g: 900, life: 0.6, size: 2.2, color: "190,225,255" });
          },
        },
        {
          id: "mist", name: { en: "Rising Mist", ko: "피어오르는 안개" }, param: "slow · 2.5s",
          cap: { en: "Big, slow *mist* clouds. They *drift* away.", ko: "크고 느린 *물안개*가 *흘러가요*." },
          update(w, dt) { if (Math.random() < dt * 9) w.spawn({ type: "smoke", under: true, x: rand(150, 230), y: G - 10, vx: rand(10, 70), vy: rand(-50, -20), size: 20, size1: 70, life: 2.5, alpha: 0.12, color: "190,210,228" }); },
        },
        {
          id: "surge", name: { en: "Surge Burst", ko: "물살 터짐" }, param: "30 drops + shake",
          cap: { en: "When the flow *surges*, everything bursts at once.", ko: "물살이 *세지면* 한꺼번에 터져요." },
          surge(w, p) {
            w.shake(0.2);
            for (let i = 0; i < 30; i++) w.spawn({ x: p.x + rand(-30, 30), y: G - 6, vx: rand(-320, 320), vy: rand(-560, -200), g: 1000, life: 0.8, size: rand(2, 4), color: "200,230,255" });
            for (let i = 0; i < 3; i++) w.spawn({ type: "smoke", under: true, x: p.x + rand(-40, 40), y: G - 20, vx: rand(-60, 80), vy: rand(-90, -40), size: 30, size1: 80, life: 2, alpha: 0.16, color: "200,220,236" });
          },
        },
        {
          id: "rainbow", name: { en: "Rainbow", ko: "무지개" }, param: "α .16 · additive",
          cap: { en: "A faint *rainbow* in the mist. Pure reward.", ko: "안개 속 희미한 *무지개*. 보는 맛이에요." },
          update(w, dt) { w.bow = Math.min(1, w.bow + dt * 0.6); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "low rumble",
          cap: { en: "A deep, constant *roar*. Louder on a surge.", ko: "낮게 깔리는 *콰르르*. 세지면 더 크게." },
          surge(w) { if (w.on("surge")) w.play(() => nz({ dur: 1.2, f: 700, f2: 150, vol: 0.5 })); },
        },
      ],
    },

    // ───────────────────────── 7. 용암
    {
      id: "env-lava", cat: "env", view: "side", polished: true,
      title: { en: "Make lava *bubble*", ko: "용암이 *부글부글*" },
      intro: { en: "Orange floor. A circle grows. *Gone.*", ko: "주황 바닥에 원이 생겼다 *사라져요*." },
      interval: 0.75, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 70, h: 120 });
        w.bubbles = []; w.heat = 0; w.wave = 0;
      },
      fire(w) {
        const b = { x: rand(200, 440), t: 0, stretch: false };
        w.emit("bubble", b);
        w.bubbles.push(b);
      },
      update(w, dt) {
        for (const b of w.bubbles) { b.t += dt; if (b.t >= 0.4) { b.dead = true; w.emit("pop", { x: b.x, y: G - 8 }); } }
        w.bubbles = w.bubbles.filter(b => !b.dead);
      },
      drawFloor(w, ctx) {
        skyFill(ctx, "#140c0c", "#2a1410");
        groundFill(ctx, "#221a18");
        const top = x => G - 6 + Math.sin(x * 0.04 + w.time * 3) * w.wave;
        ctx.beginPath(); ctx.moveTo(130, G + 120);
        for (let x = 130; x <= 560; x += 10) ctx.lineTo(x, top(x));
        ctx.lineTo(560, G + 120); ctx.closePath();
        if (w.heat > 0) {
          const g = ctx.createLinearGradient(0, G - 10, 0, G + 80);
          g.addColorStop(0, "#fff1a8"); g.addColorStop(0.15, "#ff9a2e"); g.addColorStop(0.6, "#c2381a"); g.addColorStop(1, "#5a1208");
          ctx.fillStyle = g;
        } else ctx.fillStyle = "#d2561b";
        ctx.fill();
        if (w.heat > 0) { add(ctx); for (let x = 160; x < 560; x += 70) glow(ctx, x, G - 6, 90, "255,120,30", 0.28); norm(ctx); }
        ctx.fillStyle = "#2c2220"; ctx.beginPath(); ctx.moveTo(-100, G); ctx.lineTo(140, G); ctx.lineTo(120, G + 120); ctx.lineTo(-100, G + 120); ctx.fill();
      },
      drawFront(w, ctx) {
        for (const b of w.bubbles) {
          const k = b.t / 0.4, r = 28 * E.out(Math.min(1, k * 1.3));
          let sx = 1, sy = 1;
          if (b.stretch) { sx = 1 + Math.sin(b.t * 38) * 0.1 + (k > 0.8 ? 0.35 : 0); sy = 2 - sx; }
          ctx.save(); ctx.translate(b.x, G - 6); ctx.scale(sx, sy);
          ctx.fillStyle = w.heat > 0 ? "#ffb347" : "#e0702a";
          ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fill();
          ctx.fillStyle = "rgba(255,255,220,0.6)"; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.55, r * 0.22, r * 0.12, -0.5, 0, TAU); ctx.fill();
          ctx.restore();
        }
      },
      steps: [
        {
          id: "heat", name: { en: "Hot Gradient", ko: "뜨거운 그라데이션" }, param: "white → red + glow",
          cap: { en: "*White-hot* on top, dark red below. Then *glow*.", ko: "위는 *하얗게 뜨겁게*, 아래는 검붉게. 그리고 *빛*." },
          update(w) { w.heat = 1; },
        },
        {
          id: "wave", name: { en: "Slow Surface", ko: "느린 표면" }, param: "sine ±4px",
          cap: { en: "Lava is thick. The surface rolls *slowly*.", ko: "용암은 끈적해요. 표면이 *천천히* 일렁여요." },
          update(w) { w.wave = 4; },
        },
        {
          id: "stretch", name: { en: "Bubble Wobble", ko: "거품 출렁임" }, param: "squash before pop",
          cap: { en: "The bubble *wobbles*, swells, then flattens to pop.", ko: "거품이 *출렁*이다 부풀고, 납작해지며 터져요." },
          bubble(w, b) { b.stretch = true; },
        },
        {
          id: "splat", name: { en: "Splatter", ko: "튀는 용암" }, param: "10 blobs · g 1200",
          cap: { en: "The pop throws *heavy blobs*. They fall back fast.", ko: "터지면 *무거운 덩어리*가 튀었다 뚝 떨어져요." },
          pop(w, p) {
            w.spawn({ type: "ring", flat: true, x: p.x, y: p.y, size: 10, size1: 60, life: 0.4, w: 5, color: "255,210,120" });
            for (let i = 0; i < 10; i++) w.spawn({ type: "glow", x: p.x, y: p.y, vx: rand(-200, 200), vy: rand(-560, -260), g: 1200, life: 0.6, size: rand(7, 11), size1: 4, color: "255,150,40" });
          },
        },
        {
          id: "embers", name: { en: "Embers", ko: "불티" }, param: "20 / sec",
          cap: { en: "*Embers* drift up all the time. Hot air rises.", ko: "*불티*가 계속 올라가요. 뜨거운 공기니까요." },
          update(w, dt) { if (Math.random() < dt * 20) w.spawn({ type: "glow", x: rand(140, 540), y: G - 8, vx: rand(-20, 20), vy: rand(-110, -50), life: rand(1, 1.8), size: rand(2, 4), size1: 0, color: "255,170,60" }); },
        },
        {
          id: "light", name: { en: "Light Pulse", ko: "빛 번짐" }, param: "glow 150 · tint",
          cap: { en: "Each pop *lights up* the area around it.", ko: "터질 때마다 주변이 *환해져요*." },
          pop(w, p) { w.spawn({ type: "glow", x: p.x, y: p.y - 20, size: 160, size1: 60, life: 0.45, color: "255,140,40" }); w.flash("255,120,40", 0.12); },
        },
        {
          id: "smoke", name: { en: "Dark Smoke", ko: "검은 연기" }, param: "3 puffs · 1.6s",
          cap: { en: "A wisp of *dark smoke* lingers after.", ko: "뒤에 *검은 연기*가 남아요." },
          pop(w, p) { for (let i = 0; i < 3; i++) w.spawn({ type: "smoke", under: true, x: p.x + rand(-10, 10), y: p.y - 20, vx: rand(-20, 20), vy: rand(-70, -40), size: 6, size1: 24, life: 1.6, alpha: 0.6, color: "40,30,30" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thick blorp",
          cap: { en: "A thick, low *blorp*.", ko: "걸쭉하고 낮은 *뽀글*." },
          pop(w) { w.play(() => { tn({ f: 180, f2: 60, dur: 0.15, vol: 0.5 }); nz({ dur: 0.2, f: 600, f2: 150, vol: 0.3 }); }); },
        },
      ],
    },

    // ───────────────────────── 8. 번개
    {
      id: "env-lightning", cat: "env", view: "side", polished: true,
      title: { en: "Make lightning *strike*", ko: "번개가 *내리꽂히게*" },
      intro: { en: "A yellow line blinked. *Was that it?*", ko: "노란 선이 깜빡. *이게 번개?*" },
      interval: 1.3, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.lit = 0; },
      fire(w) {
        const x = rand(300, 460);
        w.spawn({ type: "glow", x: x + rand(-60, 60), y: 10, size: 90, life: 0.3, color: "140,130,220" });
        w.after(0.3, () => {
          const s = { x, pts: [[x, -20], [x, G]], w: 5, color: "250,220,90" };
          w.emit("strike", s);
          w.spawn({ type: "crack", x: 0, y: 0, pts: s.pts, w: s.w, life: 0.4, hold: true, color: s.color, add: true });
        });
      },
      update(w, dt) { w.lit = Math.max(0, w.lit - dt * 2.2); },
      drawFloor(w, ctx) {
        const L = w.lit;
        skyFill(ctx, rgb(lerpRGB([10, 10, 22], [120, 110, 190], L)), rgb(lerpRGB([22, 22, 40], [170, 160, 220], L)));
        ctx.fillStyle = rgb(lerpRGB([18, 18, 30], [70, 66, 110], L));
        ctx.beginPath(); ctx.moveTo(-100, G); ctx.lineTo(60, 190); ctx.lineTo(200, 230); ctx.lineTo(340, 170); ctx.lineTo(520, 215); ctx.lineTo(640, 180); ctx.lineTo(640, G); ctx.fill();
        groundFill(ctx, rgb(lerpRGB([20, 20, 26], [80, 78, 100], L)));
      },
      steps: [
        {
          id: "jag", name: { en: "Jagged Path", ko: "지그재그" }, param: "14 segments",
          cap: { en: "Lightning is never straight. *Zigzag* it.", ko: "번개는 곧지 않아요. *지그재그*로." },
          strike(w, s) { s.pts = boltPath(s.x + rand(-60, 60), -20, s.x, G, 14, 22); s.w = 5; },
        },
        {
          id: "branch", name: { en: "Branches", ko: "갈래" }, param: "3 forks",
          cap: { en: "Split off a few thin *forks*.", ko: "가는 *갈래*를 몇 개 뻗어요." },
          strike(w, s) {
            for (let i = 0; i < 3; i++) {
              const p = s.pts[3 + i * 3];
              w.spawn({ type: "crack", x: 0, y: 0, pts: boltPath(p[0], p[1], p[0] + rand(-110, 110), p[1] + rand(50, 100), 5, 14), w: 1.5, life: 0.28, color: s.color, add: true });
            }
          },
        },
        {
          id: "core", name: { en: "White Core", ko: "하얀 심" }, param: "core + wide glow",
          cap: { en: "*White* center, wide *purple glow* that lingers.", ko: "가운데는 *하얗게*, 넓은 *보라 빛*이 남아요." },
          strike(w, s) { s.color = "255,255,255"; w.spawn({ type: "crack", x: 0, y: 0, pts: s.pts, w: 16, life: 1.3, color: "150,120,255", alpha: 0.45, add: true }); },
        },
        {
          id: "flash", name: { en: "Double Flash", ko: "두 번 번쩍" }, param: "0.8 → 0.5",
          cap: { en: "Flash the screen *twice*. Real bolts flicker.", ko: "화면을 *두 번* 번쩍. 진짜 번개는 깜빡여요." },
          strike(w) { w.flash("210,215,255", 0.55); w.after(0.1, () => w.flash("210,215,255", 0.35)); },
        },
        {
          id: "lit", name: { en: "World Lights Up", ko: "세상이 밝아짐" }, param: "sky + actors",
          cap: { en: "For a split second, *the whole world* is lit.", ko: "아주 잠깐 *온 세상*이 드러나요." },
          strike(w) { w.lit = 1; w.hero.flash = 1.2; },
        },
        {
          id: "impact", name: { en: "Ground Impact", ko: "땅 충격" }, param: "sparks + scorch",
          cap: { en: "*Sparks* at the ground. Leave a *burn mark*.", ko: "땅에 *불꽃*, 그리고 *그을린 자국*." },
          strike(w, s) {
            sparks(w, s.x, G - 4, 18, "255,240,200", [200, 600], Math.PI, TAU);
            w.spawn({ type: "ring", flat: true, x: s.x, y: G, size: 10, size1: 110, life: 0.45, w: 6, color: "220,210,255" });
            w.spawn({ type: "ellipse", under: true, x: s.x, y: G + 2, size: 60, life: 3, hold: true, add: false, alpha: 0.8, color: "0,0,0" });
            for (let i = 0; i < 4; i++) w.spawn({ type: "smoke", under: true, x: s.x + rand(-20, 20), y: G - 10, vx: rand(-30, 30), vy: rand(-60, -30), size: 10, size1: 30, life: 1.4, color: "70,70,90" });
          },
        },
        {
          id: "thunder", name: { en: "Late Thunder", ko: "늦게 오는 천둥" }, param: "shake +350ms",
          cap: { en: "Shake *after* the flash. Sound is slower than light.", ko: "번쩍 *다음에* 흔들어요. 소리는 빛보다 느리니까요." },
          strike(w) { w.after(0.35, () => w.shake(0.55)); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack → boom",
          cap: { en: "A sharp *crack* now, a deep *boom* later.", ko: "지금 *빠직*, 조금 뒤 *우르릉*." },
          strike(w) { w.play(() => nz({ dur: 0.15, type: "highpass", f: 3000, vol: 0.5 })); w.after(0.35, () => w.sfx.slam()); },
        },
      ],
    },

    // ───────────────────────── 9. 안개
    {
      id: "env-fog", cat: "env", view: "side", polished: true,
      title: { en: "Layer fog for *depth*", ko: "안개를 *겹겹이*" },
      intro: { en: "Fog? It's a *grey filter* on everything.", ko: "안개라더니 그냥 *회색 필터*예요." },
      interval: 1.4, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 110, h: 120 });
        w.dir = 1; w.layers = 0; w.drift = 0; w.fade = 0; w.low = 0; w.moon = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, to = w.dir > 0 ? 430 : 110;
        h.flip = w.dir < 0;
        w.emit("dash", h, to);
        w.tween(h, { x: to }, 0.6, "inout", () => { w.dir *= -1; w.busy = false; });
      },
      drawFloor(w, ctx) {
        skyFill(ctx, "#1a1e26", "#2a303a");
        if (w.moon) { add(ctx); glow(ctx, 400, 90, 130, "220,230,255", 0.35); glow(ctx, 400, 90, 26, "240,245,255", 0.9); norm(ctx); }
        const far = w.fade ? "#4a5260" : "#15181e", mid = w.fade ? "#323843" : "#15181e";
        ctx.fillStyle = far;
        ctx.beginPath(); ctx.moveTo(-100, G); ctx.lineTo(-20, 150); ctx.lineTo(120, 120); ctx.lineTo(250, 170); ctx.lineTo(390, 110); ctx.lineTo(560, 160); ctx.lineTo(640, G); ctx.fill();
        if (w.layers) fogBand(ctx, 175, 90, 0.35, w.drift * 14);
        ctx.fillStyle = mid;
        for (const [x, s] of [[40, 1], [150, 0.8], [300, 1.1], [470, 0.9]]) { ctx.beginPath(); ctx.moveTo(x, 150 + 70 * (1 - s)); ctx.lineTo(x + 40 * s, G); ctx.lineTo(x - 40 * s, G); ctx.fill(); }
        if (w.layers) fogBand(ctx, 235, 70, 0.45, -w.drift * 26);
        groundFill(ctx, "#15181e");
      },
      drawOver(w, ctx) {
        if (!w.layers) { ctx.fillStyle = "rgba(150,158,170,0.35)"; ctx.fillRect(-100, -100, 740, 560); return; }
        if (w.low) fogBand(ctx, G - 4, 50, 0.6, w.drift * 40, "190,198,210");
      },
      steps: [
        {
          id: "layers", name: { en: "Separate Layers", ko: "층 나누기" }, param: "3 bands",
          cap: { en: "Put fog *between* things, not on top of everything.", ko: "전체에 씌우지 말고 *사이사이*에 넣어요." },
          update(w) { w.layers = 1; },
        },
        {
          id: "drift", name: { en: "Parallax Drift", ko: "층마다 다른 속도" }, param: "14 / 26 px/s",
          cap: { en: "Each layer drifts at its *own speed*.", ko: "층마다 *다른 속도*로 흘러가요." },
          update(w, dt) { w.drift += dt; },
        },
        {
          id: "fade", name: { en: "Fade With Distance", ko: "멀수록 흐리게" }, param: "far = lighter",
          cap: { en: "Far things go *lighter* and blend into the air.", ko: "멀리 있는 건 *밝고 흐리게*." },
          update(w) { w.fade = 1; },
        },
        {
          id: "low", name: { en: "Ground Fog", ko: "깔리는 안개" }, param: "front · α .6",
          cap: { en: "A thick layer *in front*, hiding the feet.", ko: "*앞쪽에* 짙게 깔려서 발을 가려요." },
          update(w) { w.low = 1; },
        },
        {
          id: "wake", name: { en: "Wake Swirl", ko: "지나간 자리" }, param: "8 puffs",
          cap: { en: "Moving through fog *stirs it up*.", ko: "지나가면 안개가 *휘저어져요*." },
          dash(w, h) {
            for (let i = 0; i < 8; i++) w.after(i * 0.07, () => w.spawn({ type: "smoke", under: true, x: h.x - (h.flip ? -30 : 30), y: G - rand(20, 90), vx: (h.flip ? 1 : -1) * rand(40, 100), vy: rand(-20, 10), drag: 1.5, size: 14, size1: 46, life: 1.6, alpha: 0.25, color: "190,198,210" }));
          },
        },
        {
          id: "moon", name: { en: "Backlight", ko: "뒤에서 오는 빛" }, param: "glow 130",
          cap: { en: "A light *behind* the fog makes it glow.", ko: "안개 *뒤에* 빛을 두면 안개가 빛나요." },
          update(w) { w.moon = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "muffled whoosh",
          cap: { en: "Fog *muffles* sound. Keep it dull and soft.", ko: "안개는 소리를 *먹어요*. 둔하고 부드럽게." },
          dash(w) { w.play(() => nz({ dur: 0.6, f: 500, f2: 200, vol: 0.3 })); },
        },
      ],
    },

    // ───────────────────────── 10. 낮과 밤
    {
      id: "env-daynight", cat: "env", view: "side",
      title: { en: "Shift day to night *smoothly*", ko: "낮과 밤을 *부드럽게*" },
      intro: { en: "Day. *Click.* Night. Like a light switch.", ko: "낮. *딸깍.* 밤. 전등 스위치 같아요." },
      interval: 1.4, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 180, h: 120 });
        w.tod = 0.5; w.goal = 0.5; w.grad = 0; w.sun = 0; w.grade = 0; w.stars = 0; w.lamps = 0;
        w.starXY = Array.from({ length: 40 }, () => [rand(0, 540), rand(10, 200), rand(0, TAU)]);
      },
      fire(w) {
        w.goal += 0.25;
        if (!w.on("blend")) w.tod = w.goal;
        w.emit("tod", w.goal);
      },
      drawFloor(w, ctx) {
        const n = nightAt(w.tod), wm = warmAt(w.tod);
        if (w.grad) skyFill(ctx, rgb(lerpRGB(lerpRGB([50, 105, 170], [8, 10, 26], n), [70, 50, 110], wm * 0.6)), rgb(lerpRGB(lerpRGB([140, 185, 215], [20, 26, 50], n), [245, 140, 80], wm)));
        else { ctx.fillStyle = n < 0.5 ? "#5a92c8" : "#0b0e1c"; ctx.fillRect(-100, -100, 740, G + 100); }
        if (w.stars) for (const [x, y, p] of w.starXY) { ctx.fillStyle = `rgba(255,255,255,${n * (0.5 + 0.5 * Math.sin(w.time * 3 + p))})`; ctx.fillRect(x, y, 2, 2); }
        if (w.sun) {
          const a = TAU * w.tod;
          add(ctx);
          glow(ctx, 270 + Math.sin(a) * 240, G - Math.cos(a) * 230, 60, "255,220,140", 0.9);
          glow(ctx, 270 - Math.sin(a) * 240, G + Math.cos(a) * 230, 40, "220,230,255", 0.8);
          norm(ctx);
        }
        groundFill(ctx, "#3d4a32");
        ctx.fillStyle = "#c9b79c"; ctx.fillRect(360, G - 90, 110, 90);
        ctx.fillStyle = "#7a3b2e"; ctx.beginPath(); ctx.moveTo(350, G - 88); ctx.lineTo(415, G - 140); ctx.lineTo(480, G - 88); ctx.fill();
        ctx.fillStyle = "#3a4250"; ctx.fillRect(382, G - 70, 26, 26); ctx.fillRect(424, G - 70, 26, 26);
      },
      drawBack(w, ctx) {
        if (!w.hero.noShadow) return;
        const a = TAU * w.tod, s = Math.sin(a), up = Math.max(0.15, Math.cos(a));
        ctx.fillStyle = `rgba(0,0,0,${0.4 * (1 - nightAt(w.tod) * 0.7)})`;
        ctx.beginPath(); ctx.ellipse(w.hero.x - s * 50 / up, G + 2, 20 + Math.abs(s) * 50 / up, 7, 0, 0, TAU); ctx.fill();
      },
      drawOver(w, ctx) {
        const n = nightAt(w.tod), wm = warmAt(w.tod);
        if (w.grade) {
          ctx.globalCompositeOperation = "multiply";
          ctx.fillStyle = rgb(lerpRGB(lerpRGB([255, 255, 255], [60, 70, 130], n), [255, 170, 120], wm * 0.5));
          ctx.fillRect(-100, -100, 740, 560); norm(ctx);
        }
        if (w.lamps && n > 0.35) {
          const k = Math.min(1, (n - 0.35) * 3);
          ctx.fillStyle = `rgba(255,214,120,${k})`; ctx.fillRect(382, G - 70, 26, 26); ctx.fillRect(424, G - 70, 26, 26);
          add(ctx); glow(ctx, 416, G - 57, 90, "255,190,90", 0.45 * k); norm(ctx);
        }
      },
      steps: [
        {
          id: "blend", name: { en: "Blend Over Time", ko: "서서히 바뀌기" }, param: "0.9s ease",
          cap: { en: "Never snap. *Blend* the time of day.", ko: "딸깍 말고 *서서히* 바꿔요." },
          tod(w, t) { w.tween(w, { tod: t }, 0.9, "inout"); },
        },
        {
          id: "sky", name: { en: "Sky Gradient", ko: "하늘 그라데이션" }, param: "4 keys + sunset",
          cap: { en: "A *gradient* sky. Orange at the *horizon* at dusk.", ko: "하늘은 *그라데이션*. 해 질 녘엔 *지평선*이 주황." },
          update(w) { w.grad = 1; },
        },
        {
          id: "sun", name: { en: "Sun & Moon", ko: "해와 달" }, param: "arc r 240",
          cap: { en: "Move a *sun* and *moon* along an arc.", ko: "*해*와 *달*이 둥글게 지나가요." },
          update(w) { w.sun = 1; },
        },
        {
          id: "grade", name: { en: "Color Grade", ko: "전체 색 보정" }, param: "multiply blue",
          cap: { en: "Tint *the whole world*, not just the sky.", ko: "하늘만 말고 *세상 전체*를 물들여요." },
          update(w) { w.grade = 1; },
        },
        {
          id: "shadow", name: { en: "Moving Shadow", ko: "움직이는 그림자" }, param: "length ∝ sun",
          cap: { en: "Shadows *stretch* when the sun is low.", ko: "해가 낮으면 그림자가 *길어져요*." },
          update(w) { w.hero.noShadow = true; },
        },
        {
          id: "stars", name: { en: "Stars", ko: "별" }, param: "40 · twinkle",
          cap: { en: "*Stars* fade in as it gets dark.", ko: "어두워질수록 *별*이 떠요." },
          update(w) { w.stars = 1; },
        },
        {
          id: "lamps", name: { en: "Windows Light Up", ko: "창문 불 켜기" }, param: "unaffected by grade",
          cap: { en: "Windows *glow* at night. Life in the dark.", ko: "밤엔 *창문에 불*. 어둠 속 온기." },
          update(w) { w.lamps = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft chime",
          cap: { en: "A soft *chime* marks the new hour.", ko: "새 시간엔 부드러운 *딩*." },
          tod(w, t) { w.sfx.chime(Math.round(t * 4) % 4 * 3); },
        },
      ],
    },
    // ───────────────────────── 11. 낙엽
    {
      id: "env-leaves", cat: "env", view: "side",
      title: { en: "Make leaves *flutter* down", ko: "낙엽이 *팔랑팔랑*" },
      intro: { en: "Leaves drop like *stones*.", ko: "낙엽이 *돌멩이처럼* 떨어져요." },
      interval: 1.1, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 110, h: 120 });
        w.leaves = []; w.tree = { wob: 0 }; w.acc = 0;
      },
      fire(w) {
        w.emit("shake");
        for (let i = 0; i < 6; i++) newLeaf(w, 320 + rand(-80, 80), 110 + rand(-30, 30));
      },
      update(w, dt) {
        w.tree.wob = Math.max(0, w.tree.wob - dt * 1.5);
        w.acc += dt * 2; if (w.acc > 1) { w.acc--; newLeaf(w, 320 + rand(-80, 80), 110); }
        for (const l of w.leaves) {
          if (l.landed) { l.life -= dt; if (l.life <= 0) l.dead = true; continue; }
          l.vx *= Math.pow(0.2, dt);
          l.x += (l.vx + Math.cos(w.time * 2.4 + l.ph) * l.sway) * dt; l.y += l.vy * dt; l.rot += l.spin * dt;
          if (l.y >= G - 3) { l.y = G - 3; l.landed = true; l.life = 0; w.emit("land", l); if (!l.stay) l.dead = true; }
        }
        w.leaves = w.leaves.filter(l => !l.dead).slice(-120);
      },
      drawFloor(w, ctx) {
        skyFill(ctx, "#1d1a22", "#3a2c2a");
        groundFill(ctx, "#2a2420");
        const s = Math.sin(w.time * 26) * w.tree.wob;
        ctx.fillStyle = "#4a3426"; ctx.beginPath(); ctx.moveTo(306, G); ctx.lineTo(334, G); ctx.lineTo(328 + s * 4, 120); ctx.lineTo(312 + s * 4, 120); ctx.fill();
        for (const [dx, dy, r] of [[-60, 10, 52], [50, 14, 56], [0, -20, 62], [-20, 40, 48], [40, 46, 44]]) {
          ctx.fillStyle = "#9a4a22"; ctx.beginPath(); ctx.arc(320 + dx + s * (10 + dy * 0.1), 120 + dy, r, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = "rgba(255,180,90,0.18)"; ctx.beginPath(); ctx.arc(300 + s * 10, 90, 50, 0, TAU); ctx.fill();
      },
      drawFront(w, ctx) { const t = w.on("tumble"); for (const l of w.leaves) drawLeaf(ctx, l, t); },
      steps: [
        {
          id: "flutter", name: { en: "Side-to-side", ko: "좌우로 흔들기" }, param: "sway 60–110px",
          cap: { en: "Leaves *swing* side to side. Slower fall, too.", ko: "좌우로 *흔들리며* 천천히 내려와요." },
          leaf(w, l) { l.sway = rand(60, 110); l.vy = 55; },
        },
        {
          id: "tumble", name: { en: "Tumble", ko: "뒤집히기" }, param: "flip 2–5 rad/s",
          cap: { en: "Let them *flip over* as they fall.", ko: "떨어지면서 *뒤집히게*." },
          leaf(w, l) { l.spin = rand(2, 5); },
        },
        {
          id: "color", name: { en: "Color Mix", ko: "색 섞기" }, param: "4 autumn tones",
          cap: { en: "One color looks fake. *Mix* reds, oranges, yellows.", ko: "한 색이면 가짜 같아요. *빨강·주황·노랑* 섞기." },
          leaf(w, l) { l.c = pick(["214,90,40", "236,150,50", "245,200,70", "170,60,40"]); },
        },
        {
          id: "shake", name: { en: "Tree Shake", ko: "나무 흔들림" }, param: "wobble 0.7s",
          cap: { en: "The tree *shakes* first. Then leaves let go.", ko: "나무가 먼저 *흔들*, 그다음 잎이 떨어져요." },
          shake(w) { w.tree.wob = 1; },
        },
        {
          id: "burst", name: { en: "Burst", ko: "우수수" }, param: "+12 leaves",
          cap: { en: "A shake drops *a whole bunch* at once.", ko: "흔들면 *우수수* 한꺼번에." },
          shake(w) { for (let i = 0; i < 12; i++) newLeaf(w, 320 + rand(-90, 90), 110 + rand(-40, 30), rand(-180, 180)); },
        },
        {
          id: "settle", name: { en: "Stay on Ground", ko: "바닥에 쌓이기" }, param: "keep 120",
          cap: { en: "Leaves *stay* where they land. The ground fills up.", ko: "떨어진 잎은 *그대로*. 바닥이 채워져요." },
          land(w, l) { l.stay = true; l.life = 8; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "dry rustle",
          cap: { en: "A dry *rustle* on every shake.", ko: "흔들 때마다 바스락 *사락*." },
          shake(w) { w.play(() => { for (let i = 0; i < 4; i++) nz({ dur: 0.12, type: "bandpass", f: rand(3000, 6000), q: 2, vol: 0.18, delay: i * 0.06 }); }); },
        },
      ],
    },

    // ───────────────────────── 12. 부서지는 벽
    {
      id: "env-wall", cat: "env", view: "side",
      title: { en: "Make walls *crumble*", ko: "벽이 *와르르*" },
      intro: { en: "Bricks just *blink out* of existence.", ko: "벽돌이 *뿅* 하고 사라져요." },
      interval: 0.9, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 90, h: 120 }); buildWall(w); },
      fire(w) {
        const live = [];
        w.bricks.forEach((row, r) => row.forEach((on, c) => { if (on && c < 3) live.push({ r, c }); }));
        if (!live.length) return;
        const t = pick(live), ty = brickXY(t.c, t.r).y + WB.bh / 2;
        const b = { x: 140, y: ty, vx: 700, vy: 0, draw: (ctx, p) => { ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 3, 0, TAU); ctx.fill(); } };
        b.test = p => { const c = Math.floor((p.x - WB.x0) / WB.bw), r = Math.floor((G - p.y) / WB.bh); return c >= 0 && c < WB.cols && w.bricks[r] && w.bricks[r][c]; };
        b.onHit = p => {
          const gone = [];
          w.bricks.forEach((row, r) => row.forEach((on, c) => {
            const q = brickXY(c, r);
            if (on && Math.hypot(q.x + WB.bw / 2 - p.x - 14, q.y + WB.bh / 2 - p.y) < 34) { row[c] = false; gone.push(q); }
          }));
          w.emit("hit", { x: p.x, y: p.y }, gone);
          if (brickCount(w) < 22) w.after(1, () => buildWall(w));
        };
        w.shoot(b);
      },
      drawBack(w, ctx) {
        w.bricks.forEach((row, r) => row.forEach((on, c) => {
          if (!on) return;
          const q = brickXY(c, r);
          ctx.fillStyle = (r + c) % 3 ? "#b4532a" : "#9c4524"; ctx.fillRect(q.x + 1, q.y + 1, WB.bw - 2, WB.bh - 2);
          ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(q.x + 1, q.y + 1, WB.bw - 2, 3);
        }));
      },
      steps: [
        {
          id: "crack", name: { en: "Cracks", ko: "금 가기" }, param: "4 lines · 1.2s",
          cap: { en: "Crack the bricks *around* the hole.", ko: "구멍 *주변*에 금이 가요." },
          hit(w, p) {
            for (let i = 0; i < 4; i++) {
              const a = rand(0, TAU), pts = [[0, 0]];
              for (let k = 1; k < 4; k++) pts.push([Math.cos(a) * k * 14 + rand(-5, 5), Math.sin(a) * k * 14 + rand(-5, 5)]);
              w.spawn({ type: "crack", x: p.x + 14, y: p.y, pts, w: 2, life: 1.2, hold: true, add: false, color: "30,15,10" });
            }
          },
        },
        {
          id: "chunks", name: { en: "Flying Bricks", ko: "날아가는 벽돌" }, param: "per brick · bounce",
          cap: { en: "Every lost brick *becomes a body*. It flies and bounces.", ko: "빠진 벽돌은 *진짜로* 날아가 튀어요." },
          hit(w, p, gone) {
            for (const q of gone) w.spawn({ type: "shell", x: q.x + 13, y: q.y + 8, vx: rand(80, 380), vy: rand(-420, -120), g: 1500, vr: rand(-12, 12), ground: true, bounce: 0.3, size: 24, life: 4, hold: true, color: "180,83,42" });
          },
        },
        {
          id: "dust", name: { en: "Dust Cloud", ko: "먼지 구름" }, param: "8 puffs",
          cap: { en: "A *dust cloud* hides the exact moment. Good.", ko: "*먼지*가 순간을 덮어줘요. 그게 좋아요." },
          hit(w, p) { for (let i = 0; i < 8; i++) w.spawn({ type: "smoke", under: true, x: p.x + rand(0, 40), y: p.y + rand(-20, 20), vx: rand(20, 160), vy: rand(-60, 20), drag: 2, size: 10, size1: rand(26, 40), life: rand(0.8, 1.3), color: "170,150,130" }); },
        },
        {
          id: "gravity", name: { en: "Loose Bricks Fall", ko: "받침 없으면 추락" }, param: "check +120ms",
          cap: { en: "Bricks with *nothing under them* fall too.", ko: "아래가 *빈* 벽돌은 따라 떨어져요." },
          hit(w) {
            w.after(0.12, () => w.bricks.forEach((row, r) => row.forEach((on, c) => {
              if (!on || r === 0 || w.bricks[r - 1][c]) return;
              row[c] = false; const q = brickXY(c, r);
              w.spawn({ type: "shell", x: q.x + 13, y: q.y + 8, vx: rand(-30, 60), vy: 0, g: 1500, vr: rand(-4, 4), ground: true, bounce: 0.25, size: 24, life: 4, hold: true, color: "160,72,38" });
            })));
          },
        },
        {
          id: "impact", name: { en: "Stop + Shake", ko: "멈칫 + 흔들림" }, param: "60ms · trauma .35",
          cap: { en: "Freeze a beat, then *shake* toward the wall.", ko: "잠깐 *멈칫*, 벽 쪽으로 *흔들*." },
          hit(w) { w.hitstop(0.06); w.shake(0.35, 1); },
        },
        {
          id: "pebbles", name: { en: "Pebbles", ko: "작은 부스러기" }, param: "14 bits",
          cap: { en: "Small *pebbles* make the big bricks feel heavy.", ko: "작은 *부스러기*가 큰 벽돌을 무겁게 해요." },
          hit(w, p) { for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: p.x + 14, y: p.y, vx: rand(-200, 420), vy: rand(-500, -100), g: 1500, ground: true, bounce: 0.4, vr: rand(-20, 20), life: 2, hold: true, size: rand(2, 4), color: "120,100,90" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thud + crumble",
          cap: { en: "A heavy *thud*, then a *crumble* tail.", ko: "묵직한 *쿵*, 뒤에 *와르르*." },
          hit(w) { w.sfx.thud(); w.play(() => nz({ dur: 0.6, type: "bandpass", f: 900, f2: 300, q: 0.8, vol: 0.35, delay: 0.05 })); },
        },
      ],
    },

    // ───────────────────────── 13. 유리
    {
      id: "env-glass", cat: "env", view: "side",
      title: { en: "Make glass *shatter*", ko: "유리를 *산산조각*" },
      intro: { en: "The window is just… *not there* anymore.", ko: "유리창이 그냥… *없어졌어요*." },
      interval: 1.6, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 110, h: 120 }); w.pane = { alive: true, cracks: null }; w.shards = []; },
      fire(w) {
        const P = w.pane; if (!P.alive || w.busy) return;
        w.busy = true;
        const rock = { x: 170, y: G - 90, vx: 650, vy: -40, g: 0, hitX: 360, draw: (ctx, p) => { ctx.fillStyle = "#a8a29e"; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, TAU); ctx.fill(); } };
        rock.onHit = p => {
          const smash = () => { P.alive = false; P.cracks = null; w.emit("smash", { x: p.x, y: p.y }); w.after(0.7, () => { P.alive = true; w.busy = false; }); };
          if (w.on("crack")) { w.emit("crack", { x: p.x, y: p.y }); w.after(0.1, smash); } else smash();
        };
        w.shoot(rock);
      },
      update(w, dt) {
        for (const s of w.shards) {
          s.vy += 1300 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt; s.life -= dt;
          if (s.y > G - 3) { s.y = G - 3; s.vy *= -0.25; s.vx *= 0.5; s.vr *= 0.5; }
        }
        w.shards = w.shards.filter(s => s.life > 0);
      },
      drawBack(w, ctx) {
        ctx.fillStyle = "#3f3a36"; ctx.fillRect(296, G - 190, 128, 10); ctx.fillRect(296, G - 50, 128, 10); ctx.fillRect(296, G - 190, 10, 150); ctx.fillRect(414, G - 190, 10, 150);
        ctx.fillStyle = "#2c2825"; ctx.fillRect(352, G - 40, 16, 40);
        const P = w.pane;
        if (P.alive) {
          ctx.fillStyle = "rgba(150,200,230,0.28)"; ctx.fillRect(306, G - 180, 108, 130);
          ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.moveTo(316, G - 170); ctx.lineTo(340, G - 170); ctx.lineTo(316, G - 140); ctx.fill();
          if (P.cracks) { ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5; for (const c of P.cracks) { ctx.beginPath(); c.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x, y)); ctx.stroke(); } }
        }
      },
      drawFront(w, ctx) {
        for (const s of w.shards) {
          const a = Math.min(1, s.life * 2), gl = s.glint ? Math.max(0, Math.sin(s.rot * 2)) : 0;
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = a;
          ctx.fillStyle = `rgba(${Math.round(170 + gl * 85)},${Math.round(215 + gl * 40)},255,${0.45 + gl * 0.5})`;
          ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1;
          ctx.beginPath(); s.pts.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      },
      steps: [
        {
          id: "shards", name: { en: "Shards", ko: "유리 조각" }, param: "16 shards · g 1300",
          cap: { en: "Break it into *sharp pieces* that fly and spin.", ko: "*뾰족한 조각*으로 깨져 돌며 날아가요." },
          smash(w, p) {
            for (let i = 0; i < 16; i++) w.shards.push({ pts: shardPts(), x: rand(310, 410), y: rand(G - 175, G - 55), vx: rand(60, 380), vy: rand(-360, -40), rot: rand(0, TAU), vr: rand(-14, 14), life: 2.2 });
          },
        },
        {
          id: "glint", name: { en: "Glint", ko: "반짝 반사" }, param: "by angle",
          cap: { en: "Shards *flash* when they catch the light.", ko: "빛을 받는 각도에서 *반짝*." },
          smash(w) { w.shards.forEach(s => { s.glint = true; }); },
        },
        {
          id: "crack", name: { en: "Crack First", ko: "먼저 금 가기" }, param: "spiderweb · 100ms",
          cap: { en: "Show a *spiderweb crack* for 0.1s. Then break.", ko: "*거미줄 금*을 0.1초 보여주고 깨요." },
          crack(w, p) {
            w.pane.cracks = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * TAU; return [0, 1, 2, 3].map(k => [p.x + Math.cos(a) * k * 22 + rand(-4, 4), p.y + Math.sin(a) * k * 22 + rand(-4, 4)]); });
            w.hitstop(0.05);
          },
        },
        {
          id: "flash", name: { en: "Impact Flash", ko: "충돌 섬광" }, param: "star + ring",
          cap: { en: "A white *star* right where it hit.", ko: "맞은 자리에 하얀 *별빛*." },
          smash(w, p) { w.spawn({ type: "star", x: p.x, y: p.y, size: 60, life: 0.18, color: "255,255,255" }); w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 90, life: 0.3, w: 5, color: "200,230,255" }); },
        },
        {
          id: "glitter", name: { en: "Floor Glitter", ko: "바닥 반짝이" }, param: "20 bits · 2.5s",
          cap: { en: "Tiny bits *glitter* on the floor after.", ko: "작은 가루가 바닥에서 *반짝반짝*." },
          smash(w) { for (let i = 0; i < 20; i++) w.spawn({ type: "star", x: rand(330, 520), y: G - rand(0, 4), size: rand(2, 5), life: 2.5, hold: true, color: "220,240,255" }); },
        },
        {
          id: "slowmo", name: { en: "Slow-mo", ko: "슬로모션" }, param: "0.3× · 0.45s",
          cap: { en: "*Slow time* so the eye can catch every shard.", ko: "조각이 *다 보이게* 시간을 늦춰요." },
          smash(w) { w.slowmo(0.3, 0.45); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crash + tinkles",
          cap: { en: "A *crash*, then many tiny *tinkles*.", ko: "*쨍그랑*, 뒤에 작은 *짤랑짤랑*." },
          smash(w) { w.play(() => { nz({ dur: 0.25, type: "highpass", f: 3500, vol: 0.5 }); for (let i = 0; i < 6; i++) tn({ type: "triangle", f: rand(2400, 4200), dur: 0.12, vol: 0.08, delay: 0.08 + i * rand(0.04, 0.09) }); }); },
        },
      ],
    },

    // ───────────────────────── 14. 나무 상자
    {
      id: "env-crate", cat: "env", view: "side",
      title: { en: "Make crates *break* nicely", ko: "나무 상자 *부수는 맛*" },
      intro: { en: "Hit, hit… and it *vanishes*.", ko: "퍽, 퍽… 그리고 *사라져요*." },
      interval: 0.8, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("hero", { home: 160 });
        woodCrate();
        w.crate = w.actor("env-wood"); w.crate.hp = 100;
      },
      fire(w) {
        const c = w.crate, h = w.hero;
        if (w.busy || c.alpha <= 0) return;
        w.busy = true;
        w.tween(h, { x: c.x - c.w / 2 - h.w / 2 + 4 }, 0.1, "in", () => {
          const p = { x: c.x - c.w / 2 + 10, y: G - c.h / 2 };
          c.hp -= 50;
          w.emit("hit", p);
          if (c.hp <= 0) { c.alpha = 0; w.emit("break", c); w.after(0.9, () => { c.alpha = 1; c.hp = 100; c.sx = c.sy = 0.2; }); }
          w.tween(h, { x: h.home }, 0.25, "inout", () => { w.busy = false; });
        });
      },
      steps: [
        {
          id: "squash", name: { en: "Hit Squash", ko: "맞으면 찌그러짐" }, param: "flash · sx 1.2",
          cap: { en: "Before it breaks, every hit should *show*.", ko: "부서지기 전에도 맞은 게 *보여야* 해요." },
          hit(w) { const c = w.crate; c.flash = 1; c.sx = 1.2; c.sy = 0.82; c.ox += 12; },
        },
        {
          id: "planks", name: { en: "Planks", ko: "판자 조각" }, param: "6 planks · bounce",
          cap: { en: "Split it into *planks*, not dust.", ko: "가루 말고 *판자*로 쪼개져요." },
          break(w, c) { for (let i = 0; i < 6; i++) w.spawn({ type: "shell", x: c.x + rand(-30, 30), y: G - rand(20, 80), vx: rand(-120, 380), vy: rand(-620, -280), g: 1600, vr: rand(-16, 16), ground: true, bounce: 0.35, size: rand(30, 44), life: 3, hold: true, color: "196,140,72" }); },
        },
        {
          id: "splinter", name: { en: "Splinters", ko: "나뭇가시" }, param: "10 per hit",
          cap: { en: "Thin *splinters* fly off on every hit.", ko: "칠 때마다 가는 *나무 가시*가 튀어요." },
          hit(w, p) { sparks(w, p.x, p.y, 10, "222,170,100", [200, 520], -1.2, 1.2); },
        },
        {
          id: "dust", name: { en: "Dust Puff", ko: "먼지" }, param: "6 puffs",
          cap: { en: "A puff of *dust* where it stood.", ko: "있던 자리에 *먼지* 한 줌." },
          break(w, c) { for (let i = 0; i < 6; i++) w.spawn({ type: "smoke", under: true, x: c.x + rand(-40, 40), y: G - rand(10, 70), vx: rand(-60, 60), vy: rand(-60, -10), drag: 2, size: 12, size1: 34, life: 0.9, color: "170,150,120" }); },
        },
        {
          id: "loot", name: { en: "Loot Pop", ko: "보상 튀어나옴" }, param: "3 coins",
          cap: { en: "Something *pops out*. Breaking pays.", ko: "뭔가 *톡* 튀어나와요. 부순 보람." },
          break(w, c) { for (let i = 0; i < 3; i++) w.spawn({ type: "ghost", img: SPR.coin.c, top: true, w: 24, h: 24, alpha0: 1, add: false, x: c.x, y: G - 50, vx: rand(-160, 200), vy: rand(-700, -500), g: 1500, gy: G - 10, ground: true, bounce: 0.5, life: 1.8, hold: true }); },
        },
        {
          id: "impact", name: { en: "Stop + Shake", ko: "멈칫 + 흔들림" }, param: "50ms / 100ms",
          cap: { en: "Small stop on hits, *bigger* on the break.", ko: "칠 땐 짧게, *부술 땐 길게* 멈칫." },
          hit(w) { w.hitstop(0.05); w.shake(0.15, 1); },
          break(w) { w.hitstop(0.1); w.shake(0.4, 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "knock / crunch",
          cap: { en: "Hollow *knock* on hits, *crunch* on the break.", ko: "칠 땐 *통*, 부술 땐 *우지끈*." },
          hit(w) { w.sfx.thunk(); },
          break(w) { w.play(() => { nz({ dur: 0.3, type: "bandpass", f: 1200, f2: 400, q: 1, vol: 0.5 }); for (let i = 0; i < 4; i++) tn({ type: "square", f: rand(120, 260), dur: 0.03, vol: 0.12, delay: i * 0.04 }); }); },
        },
      ],
    },

    // ───────────────────────── 15. 드럼통 연쇄 폭발
    {
      id: "env-barrels", cat: "env", view: "side",
      title: { en: "Chain barrel *explosions*", ko: "드럼통 *연쇄 폭발*" },
      intro: { en: "Shoot one. All four *disappear at once*.", ko: "하나 쐈더니 넷이 *한꺼번에* 사라져요." },
      interval: 2.2, stepDur: 4.2,
      setup(w) {
        barrelSpr();
        w.hero = w.actor("hero", { home: 90, h: 120 }); w.gun = { kick: 0, rot: 0 };
        w.barrels = [250, 320, 390, 460].map(x => ({ x, alive: true, oy: 0, tint: 0, vib: 0, sc: 1 }));
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const m = muzzle(w), list = w.barrels;
        list.forEach(b => { b.delay = 0; });
        const bl = { x: m.x, y: m.y, vx: 1600, vy: 0, len: 40, hitX: list[0].x - 22 };
        bl.onHit = () => {
          w.emit("arm", list);
          list.forEach((b, i) => w.after(b.delay, () => { b.alive = false; w.emit("boom", { x: b.x, y: G - 35 }, i); }));
          w.after(1.6, () => { list.forEach(b => { b.alive = true; b.sc = 0.2; b.tint = 0; }); w.busy = false; });
        };
        w.gun.kick = 10;
        w.shoot(bl);
      },
      update(w, dt) {
        gunSpring(w, dt);
        for (const b of w.barrels) { b.tint = Math.max(0, b.tint - dt * 3); b.sc += (1 - b.sc) * Math.min(1, dt * 12); b.oy += (0 - b.oy) * Math.min(1, dt * 8); }
      },
      drawBack(w, ctx) {
        const S = SPR["env-barrel"];
        for (const b of w.barrels) {
          if (!b.alive) continue;
          const vx = b.tint > 0 ? rand(-3, 3) : 0;
          ctx.save(); ctx.translate(b.x + vx, G + b.oy); ctx.scale(b.sc, b.sc);
          ctx.drawImage(S.c, -23, -70, 46, 70);
          if (b.tint > 0) { ctx.globalAlpha = Math.min(1, b.tint); ctx.drawImage(S.white, -23, -70, 46, 70); }
          ctx.restore();
        }
      },
      drawFront(w, ctx) { drawGun(w, ctx); },
      steps: [
        {
          id: "chain", name: { en: "Chain Delay", ko: "연쇄 시간차" }, param: "+180ms each",
          cap: { en: "One *after another*. The delay *is* the chain.", ko: "*하나씩 차례로*. 그 틈이 연쇄예요." },
          arm(w, list) { list.forEach((b, i) => { b.delay = i * 0.18; }); },
        },
        {
          id: "warn", name: { en: "Warning Flash", ko: "터지기 직전 번쩍" }, param: "120ms before",
          cap: { en: "Each barrel *flashes and shakes* right before.", ko: "터지기 직전 *번쩍이며 덜덜*." },
          arm(w, list) { list.forEach(b => w.after(Math.max(0, b.delay - 0.12), () => { b.tint = 1; b.sc = 1.15; })); },
        },
        {
          id: "fireball", name: { en: "Fireball", ko: "불덩이" }, param: "glow + 12 flames",
          cap: { en: "A big *fireball* for each one.", ko: "하나마다 큼직한 *불덩이*." },
          boom(w, p) {
            w.spawn({ type: "glow", x: p.x, y: p.y - 10, size: 110, size1: 40, life: 0.35, color: "255,170,60" });
            for (let i = 0; i < 12; i++) w.spawn({ type: "glow", x: p.x + rand(-15, 15), y: p.y, vx: rand(-200, 200), vy: rand(-380, -80), drag: 3.5, size: rand(20, 30), size1: 4, life: rand(0.35, 0.6), color: i % 3 ? "255,140,40" : "255,220,120" });
          },
        },
        {
          id: "push", name: { en: "Shockwave Hop", ko: "충격파로 들썩" }, param: "next barrels hop",
          cap: { en: "The blast makes *the next barrels hop*.", ko: "폭발에 *옆 통들이 들썩*." },
          boom(w, p) {
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 120, life: 0.35, w: 10, color: "255,230,190" });
            w.barrels.forEach(b => { if (b.alive && b.x > p.x) b.oy = -18; });
            w.spawn({ type: "shell", x: p.x, y: p.y - 30, vx: rand(-150, 150), vy: -700, g: 1500, vr: 20, ground: true, bounce: 0.3, size: 30, life: 2.5, hold: true, color: "153,27,27" });
          },
        },
        {
          id: "shake", name: { en: "Growing Shake", ko: "점점 큰 흔들림" }, param: "trauma .2 + .12·i",
          cap: { en: "Each blast shakes *harder* than the last.", ko: "터질수록 *더 세게* 흔들어요." },
          boom(w, p, i) { w.shake(0.2 + i * 0.12); },
        },
        {
          id: "smoke", name: { en: "Smoke + Scorch", ko: "연기 + 그을음" }, param: "lingers 2s",
          cap: { en: "Leave a *row of smoke* and scorch marks.", ko: "*연기 줄*과 그을린 자국을 남겨요." },
          boom(w, p) {
            w.after(0.1, () => { for (let i = 0; i < 5; i++) w.spawn({ type: "smoke", under: true, x: p.x + rand(-25, 25), y: p.y - rand(10, 50), vx: rand(-30, 30), vy: rand(-60, -25), size: 14, size1: 44, life: 2, color: "60,60,70" }); });
            w.spawn({ type: "ellipse", under: true, x: p.x, y: G + 2, size: 50, life: 2.5, hold: true, add: false, alpha: 0.7, color: "10,8,6" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch ↑ per blast",
          cap: { en: "Booms that climb in *pitch*. Feels like a combo.", ko: "터질 때마다 *음이 올라가요*. 콤보처럼." },
          boom(w, p, i) { w.play(() => { nz({ dur: 0.7, f: 900, f2: 90, vol: 0.6 }); tn({ f: 80 + i * 25, f2: 30, dur: 0.5, vol: 0.7 }); }); },
        },
      ],
    },
    // ───────────────────────── 16. 문 박차기
    {
      id: "env-door", cat: "env", view: "side",
      title: { en: "Kick doors open *hard*", ko: "문을 *쾅* 박차기" },
      intro: { en: "Kick. The door *teleports* open.", ko: "뻥. 문이 *순간이동*하듯 열려요." },
      interval: 1.9, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 170 });
        w.door = { a: 0, vib: 0 }; w.spill = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, D = w.door;
        w.tween(h, { x: 300 }, 0.14, "in", () => {
          if (!w.on("swing")) D.a = 1.15;
          w.emit("slam", { x: 340, y: G - 80 });
          w.tween(h, { x: h.home }, 0.35, "inout");
          w.after(1.1, () => w.tween(D, { a: 0 }, 0.3, "in", () => { w.busy = false; }));
        });
      },
      update(w, dt) { w.door.vib = Math.max(0, w.door.vib - dt * 2.5); },
      drawFloor(w, ctx) {
        skyFill(ctx, "#121318", "#16181e");
        const open = Math.min(1, w.door.a / 1.1);
        ctx.fillStyle = `rgb(${lerpRGB([30, 26, 22], [250, 220, 160], open).join(",")})`;
        ctx.fillRect(340, G - 160, 80, 160);
        ctx.fillStyle = "#2a2d36"; ctx.fillRect(320, 30, 400, G - 190); ctx.fillRect(320, G - 160, 20, 160); ctx.fillRect(420, G - 160, 300, 160);
        ctx.fillStyle = "#3a3e4a"; ctx.fillRect(334, G - 166, 92, 8); ctx.fillRect(334, G - 160, 6, 160); ctx.fillRect(420, G - 160, 6, 160);
        groundFill(ctx);
        if (w.spill && open > 0.05) {
          add(ctx);
          const g = ctx.createLinearGradient(420, 0, 180, 0);
          g.addColorStop(0, `rgba(255,214,150,${0.5 * open})`); g.addColorStop(1, "rgba(255,214,150,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(340, G); ctx.lineTo(420, G); ctx.lineTo(260, G + 60); ctx.lineTo(120, G + 60); ctx.fill();
          glow(ctx, 380, G - 80, 150, "255,200,130", 0.3 * open);
          norm(ctx);
        }
      },
      drawBack(w, ctx) {
        const D = w.door, c = Math.cos(D.a), wd = 80 * c, j = Math.sin(w.time * 60) * 4 * D.vib;
        const x0 = 420 + j, y = G - 160;
        const shade = Math.round(150 - Math.abs(Math.sin(D.a)) * 60);
        ctx.fillStyle = `rgb(${shade},${Math.round(shade * 0.66)},${Math.round(shade * 0.4)})`;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 - wd, y - Math.sin(D.a) * 14); ctx.lineTo(x0 - wd, G + Math.sin(D.a) * 14); ctx.lineTo(x0, G); ctx.fill();
        ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x0 - wd * 0.85, G - 78, 4, 0, TAU); ctx.fill();
      },
      steps: [
        {
          id: "swing", name: { en: "Swing + Bounce", ko: "휙 열리고 튕김" }, param: "120ms · back ease",
          cap: { en: "Swing it *fast*, hit the wall, *bounce* back a bit.", ko: "*확* 열리고 벽에 맞고 살짝 *튕겨요*." },
          slam(w) { const D = w.door; D.a = 0; w.tween(D, { a: 1.6 }, 0.12, "out", () => w.tween(D, { a: 1.15 }, 0.4, "back")); },
        },
        {
          id: "impact", name: { en: "Stop + Shake", ko: "멈칫 + 흔들림" }, param: "70ms · trauma .4",
          cap: { en: "Freeze on the *kick*. Shake the room.", ko: "차는 순간 *멈칫*, 방이 *흔들*." },
          slam(w) { w.hitstop(0.07); w.shake(0.4, 1); w.hero.sx = 0.9; w.hero.sy = 1.08; },
        },
        {
          id: "light", name: { en: "Light Spill", ko: "쏟아지는 빛" }, param: "∝ door angle",
          cap: { en: "Light *pours in* from the other room.", ko: "건너편 방의 *빛이 쏟아져요*." },
          slam(w) { w.spill = 1; },
        },
        {
          id: "rattle", name: { en: "Hinge Rattle", ko: "경첩 덜덜" }, param: "vib 4px · 0.4s",
          cap: { en: "The door *rattles* after hitting the wall.", ko: "벽에 부딪힌 문이 *덜덜* 떨려요." },
          slam(w) { w.after(0.12, () => { w.door.vib = 1; }); },
        },
        {
          id: "dust", name: { en: "Dust Fall", ko: "먼지 우수수" }, param: "frame + floor",
          cap: { en: "Dust *falls* from the frame. Old house.", ko: "문틀에서 먼지가 *우수수*. 오래된 집이니까." },
          slam(w) {
            for (let i = 0; i < 14; i++) w.spawn({ type: "smoke", under: true, x: rand(340, 420), y: G - 160, vx: rand(-20, 20), vy: rand(20, 90), g: 60, size: 2, size1: 6, life: 1.2, color: "200,190,170" });
            dirt(w, 380, G, 8, 0, "170,160,140");
          },
        },
        {
          id: "splinter", name: { en: "Splinters", ko: "나뭇조각" }, param: "12 sparks + 3 bits",
          cap: { en: "Wood *splinters* off the lock side.", ko: "자물쇠 쪽에서 *나뭇조각*이 튀어요." },
          slam(w, p) {
            sparks(w, p.x, p.y, 12, "222,170,100", [200, 500], Math.PI * 0.6, Math.PI * 1.4);
            for (let i = 0; i < 3; i++) w.spawn({ type: "shell", x: p.x, y: p.y, vx: rand(-260, -80), vy: rand(-380, -200), g: 1500, vr: rand(-15, 15), ground: true, bounce: 0.3, size: 14, life: 2.5, hold: true, color: "150,100,60" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slam + creak",
          cap: { en: "A big *slam*, then a little *creak*.", ko: "큰 *쾅*, 뒤에 작은 *끼익*." },
          slam(w) { w.sfx.slam(); w.after(0.3, () => w.sfx.creak()); },
        },
      ],
    },

    // ───────────────────────── 17. 횃불
    {
      id: "env-torch", cat: "env", view: "side",
      title: { en: "Make torches *flicker*", ko: "횃불이 *일렁이게*" },
      intro: { en: "An orange triangle. It lights *nothing*.", ko: "주황 삼각형. 아무것도 *안 비춰요*." },
      interval: 1.4, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 380 });
        w.fl = { lean: 0, lv: 0, dim: 0, puff: 0 };
        w.fshape = 0; w.light = 0; w.shadow = 0;
      },
      fire(w) { w.fl.puff = 1; w.fl.lv = 10; w.emit("gust"); },
      update(w, dt) {
        const F = w.fl;
        F.puff = Math.max(0, F.puff - dt * 4);
        F.lv += (-F.lean * 60 - F.lv * 6) * dt; F.lean += F.lv * dt;
        F.dim += (0 - F.dim) * Math.min(1, dt * 2.5);
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#16120f"; ctx.fillRect(-100, -100, 740, G + 100);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        for (let r = 0; r < 12; r++) for (let c = -1; c < 12; c++) ctx.fillRect(c * 56 + (r % 2) * 28, r * 24, 52, 20);
        groundFill(ctx, "#1c1814");
        if (w.shadow) {
          const f = flick(w.time) * (1 - w.fl.dim), h = w.hero;
          ctx.globalAlpha = 0.55 * (0.6 + f * 0.6);
          ctx.drawImage(blackHero(w), h.x + 30 + f * 10, G - h.h * 1.35, h.w * 1.35, h.h * 1.35);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "#3b3530"; ctx.fillRect(262, 150, 16, 46); ctx.fillStyle = "#5a4a3a"; ctx.fillRect(258, 142, 24, 12);
      },
      drawFront(w, ctx) {
        const F = w.fl, x = 270, y = 142, t = w.time, f = flick(t) * (1 - F.dim);
        if (w.light) { add(ctx); glow(ctx, x, y - 10, (190 + f * 60) * (1 + F.puff * 0.3), "255,150,60", 0.35 + f * 0.25); glow(ctx, x, y - 14, 50, "255,210,140", 0.6); norm(ctx); }
        const s = 1 + F.puff * 0.4;
        if (!w.fshape) { ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.moveTo(x - 12 * s, y); ctx.lineTo(x + 12 * s, y); ctx.lineTo(x + F.lean * 40, y - 40 * s); ctx.fill(); return; }
        const h = (38 + Math.sin(t * 17) * 5 + Math.sin(t * 31) * 3) * s * (1 - F.dim * 0.4), lean = F.lean * 1.1 + Math.sin(t * 9) * 0.08;
        add(ctx);
        flame(ctx, x, y, h * 1.15, 13, lean, "rgba(240,90,30,0.85)");
        flame(ctx, x, y, h * 0.8, 9, lean * 0.8, "rgba(255,170,50,0.9)");
        flame(ctx, x, y, h * 0.45, 5, lean * 0.6, "rgba(255,245,200,0.95)");
        norm(ctx);
      },
      steps: [
        {
          id: "shape", name: { en: "Living Flame", ko: "살아 있는 불꽃" }, param: "3 layers · noise",
          cap: { en: "Three layers. *White* inside, *red* outside. Always moving.", ko: "세 겹. 안은 *하얗게*, 밖은 *붉게*. 계속 꿈틀." },
          update(w) { w.fshape = 1; },
        },
        {
          id: "light", name: { en: "Flickering Light", ko: "일렁이는 빛" }, param: "r 190 ± 60",
          cap: { en: "Light the wall. Make the radius *breathe*.", ko: "벽을 비추고, 빛 크기가 *숨 쉬듯* 변해요." },
          update(w) { w.light = 1; },
        },
        {
          id: "shadow", name: { en: "Dancing Shadow", ko: "춤추는 그림자" }, param: "×1.35 · flicker",
          cap: { en: "Cast a *big shadow* that dances with the flame.", ko: "불꽃 따라 *큰 그림자*가 일렁여요." },
          update(w) { w.shadow = 1; },
        },
        {
          id: "embers", name: { en: "Embers", ko: "불씨" }, param: "12 / sec",
          cap: { en: "Tiny *embers* rise and wink out.", ko: "작은 *불씨*가 올라가다 꺼져요." },
          update(w, dt) { if (Math.random() < dt * 12) w.spawn({ type: "glow", x: 270 + rand(-6, 6), y: 120, vx: rand(-30, 30) + w.fl.lean * 80, vy: rand(-110, -60), life: rand(0.5, 1), size: rand(2, 4), size1: 0, color: "255,190,90" }); },
        },
        {
          id: "gust", name: { en: "Gust Reaction", ko: "바람에 휘청" }, param: "lean spring + dim",
          cap: { en: "Wind *bends* the flame and the light *dips*.", ko: "바람에 불꽃이 *휘고*, 빛이 *잠깐 줄어요*." },
          gust(w) { w.fl.lv = 16; w.fl.dim = 0.6; },
        },
        {
          id: "smoke", name: { en: "Thin Smoke", ko: "가는 연기" }, param: "6 / sec",
          cap: { en: "A thin line of *smoke* above the fire.", ko: "불 위로 가느다란 *연기*." },
          update(w, dt) { if (Math.random() < dt * 6) w.spawn({ type: "smoke", under: true, x: 270 + w.fl.lean * 20, y: 100, vx: rand(-10, 10) + w.fl.lean * 60, vy: rand(-50, -30), size: 4, size1: 16, life: 1.6, alpha: 0.6, color: "60,55,55" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + crackle",
          cap: { en: "A *whoosh*, then soft *crackles*.", ko: "*화르륵*, 뒤에 *타닥타닥*." },
          gust(w) { w.play(() => { nz({ dur: 0.4, type: "bandpass", f: 500, f2: 1500, q: 1, vol: 0.3 }); for (let i = 0; i < 5; i++) nz({ dur: 0.02, type: "highpass", f: 3000, vol: 0.25, delay: 0.1 + i * rand(0.05, 0.12) }); }); },
        },
      ],
    },

    // ───────────────────────── 18. 빛줄기 속 먼지
    {
      id: "env-motes", cat: "env", view: "side",
      title: { en: "Fill light shafts with *dust*", ko: "빛줄기에 *먼지* 띄우기" },
      intro: { en: "A yellow shape on the floor. Flat. *Dead.*", ko: "바닥에 노란 도형. 납작하고 *죽어 있어요*." },
      interval: 1.2, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 380, h: 130 });
        w.motes = Array.from({ length: 140 }, () => ({ x: rand(0, 540), y: rand(30, G), vx: rand(-6, 6), vy: rand(-4, 4), ph: rand(0, TAU) }));
        w.soft = 0; w.show = 0; w.beam = 0; w.twinkle = 0; w.pool = 0;
      },
      fire(w) {
        const h = w.hero;
        w.tween(h, { oy: -40 }, 0.18, "out", () => w.tween(h, { oy: 0 }, 0.14, "in", () => { h.sx = 1.2; h.sy = 0.8; w.emit("stomp", { x: h.x, y: G }); }));
      },
      update(w, dt) {
        for (const m of w.motes) {
          m.vx += rand(-8, 8) * dt; m.vy += rand(-8, 8) * dt;
          m.vx *= Math.pow(0.4, dt); m.vy *= Math.pow(0.4, dt);
          m.x += m.vx * dt; m.y += m.vy * dt;
          if (m.y > G - 2) { m.y = G - 2; m.vy = -Math.abs(m.vy); }
          if (m.y < 20 || m.x < -10 || m.x > 550) { m.x = rand(0, 540); m.y = rand(60, G); }
        }
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#121216"; ctx.fillRect(-100, -100, 740, G + 100);
        ctx.fillStyle = "#e9dcb8"; ctx.fillRect(150, 50, 72, 28);
        ctx.fillStyle = "#2a2a30"; ctx.fillRect(184, 50, 4, 28);
        groundFill(ctx, "#1a1a1f");
        if (w.pool) { add(ctx); ctx.save(); ctx.translate(376, G + 10); ctx.scale(1, 0.18); glow(ctx, 0, 0, 120, "255,226,160", 0.6); ctx.restore(); norm(ctx); }
        ctx.beginPath(); SHAFT.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x, y)); ctx.closePath();
        if (w.soft) {
          add(ctx);
          const g = ctx.createLinearGradient(186, 78, 376, G);
          g.addColorStop(0, "rgba(255,230,170,0.42)"); g.addColorStop(1, "rgba(255,230,170,0.06)");
          ctx.fillStyle = g; ctx.filter = "blur(6px)"; ctx.fill(); ctx.filter = "none";
          norm(ctx);
        } else { ctx.fillStyle = "rgba(250,220,120,0.35)"; ctx.fill(); }
      },
      drawFront(w, ctx) {
        if (!w.show) return;
        add(ctx);
        for (const m of w.motes) {
          let a = w.beam ? (inShaft(m.x, m.y) ? 0.95 : 0.04) : 0.35;
          if (w.twinkle) a *= 0.55 + 0.45 * Math.sin(w.time * 3 + m.ph);
          if (a < 0.02) continue;
          ctx.fillStyle = `rgba(255,236,190,${a})`; ctx.beginPath(); ctx.arc(m.x, m.y, w.beam ? 1.8 : 1.4, 0, TAU); ctx.fill();
          if (w.beam && a > 0.3) glow(ctx, m.x, m.y, 5, "255,226,160", a * 0.5);
        }
        norm(ctx);
      },
      steps: [
        {
          id: "soft", name: { en: "Soft Shaft", ko: "부드러운 빛줄기" }, param: "blur + fade down",
          cap: { en: "Blur the edges. *Fade* it toward the floor.", ko: "가장자리는 흐리게, 아래로 갈수록 *옅게*." },
          update(w) { w.soft = 1; },
        },
        {
          id: "motes", name: { en: "Dust Motes", ko: "먼지 입자" }, param: "140 · random walk",
          cap: { en: "Add slow, drifting *dust* to the air.", ko: "공기 중에 느리게 떠다니는 *먼지*." },
          update(w) { w.show = 1; },
        },
        {
          id: "beam", name: { en: "Lit Only in Beam", ko: "빛 안에서만 보이기" }, param: "in 0.95 / out 0.04",
          cap: { en: "The trick: dust *only shows inside* the light.", ko: "핵심은 이거. 먼지는 *빛 안에서만* 보여요." },
          update(w) { w.beam = 1; },
        },
        {
          id: "twinkle", name: { en: "Twinkle", ko: "반짝반짝" }, param: "sine per mote",
          cap: { en: "Each mote *catches the light* at its own time.", ko: "먼지마다 *제각각* 빛을 받아요." },
          update(w) { w.twinkle = 1; },
        },
        {
          id: "stir", name: { en: "Stir Up", ko: "휘저어지기" }, param: "r 140 · +burst",
          cap: { en: "Stomp and the dust *swirls up* into the light.", ko: "쿵 밟으면 먼지가 *휘날려* 빛 속으로." },
          stomp(w, p) {
            for (const m of w.motes) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < 140) { m.vx += (m.x - p.x) / d * 50; m.vy -= 60 * (1 - d / 140); } }
            for (let i = 0; i < 20; i++) w.motes.push({ x: p.x + rand(-40, 40), y: G - 4, vx: rand(-70, 70), vy: rand(-90, -30), ph: rand(0, TAU) });
            w.motes.splice(0, 20);
            dirt(w, p.x, G, 6, 0, "120,110,100");
          },
        },
        {
          id: "pool", name: { en: "Floor Pool", ko: "바닥 빛 웅덩이" }, param: "ellipse glow",
          cap: { en: "Where the beam lands, a *warm pool* of light.", ko: "빛이 닿는 바닥에 *따뜻한 웅덩이*." },
          update(w) { w.pool = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft thud",
          cap: { en: "A soft wooden *thud*. Quiet room.", ko: "조용한 방엔 부드러운 *쿵*." },
          stomp(w) { w.sfx.land(); },
        },
      ],
    },

    // ───────────────────────── 19. 발자국 (위에서)
    {
      id: "env-footprints", cat: "env", view: "top",
      title: { en: "Leave *footprints* behind", ko: "*발자국* 남기기" },
      intro: { en: "He walks on sand. *No trace* at all.", ko: "모래 위를 걷는데 *흔적이 없어요*." },
      interval: 0.3, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("heroTop", { home: 270, gy: 65 });
        w.ang = -Math.PI / 2; w.side = 1; w.prints = []; w.rim = 0;
      },
      fire(w) {
        const h = w.hero;
        w.ang += 0.2; w.side *= -1;
        const x = 270 + Math.cos(w.ang) * 120, y = 180 + Math.sin(w.ang) * 115, rot = w.ang + Math.PI / 2;
        h.rot = rot;
        w.tween(h, { x, gy: y }, 0.25, "lin");
        w.emit("step", { x, y, rot, side: w.side });
      },
      update(w, dt) {
        for (const p of w.prints) p.t += dt;
        w.prints = w.prints.filter(p => p.t < p.life);
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#74603f"; ctx.fillRect(14, 14, 512, 332);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let i = 0; i < 40; i++) ctx.fillRect((i * 137) % 500 + 20, (i * 89) % 320 + 20, 30, 2);
        for (const p of w.prints) {
          const k = p.t / p.life, a = p.fade ? 1 - k : (k > 0.95 ? 0 : 1);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          if (w.rim) { ctx.fillStyle = `rgba(220,195,150,${0.7 * a})`; ctx.beginPath(); ctx.ellipse(p.len * 0.1 + 1.5, 1.5, p.len, p.wd, 0, 0, TAU); ctx.fill(); }
          ctx.fillStyle = `rgba(60,42,22,${0.8 * a})`; ctx.beginPath(); ctx.ellipse(0, 0, p.len, p.wd, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 3; ctx.strokeRect(14, 14, 512, 332);
      },
      steps: [
        {
          id: "prints", name: { en: "Prints", ko: "발자국" }, param: "1 decal / step",
          cap: { en: "Every step leaves a *mark*.", ko: "걸을 때마다 *자국*을 남겨요." },
          step(w, s) { s.print = { x: s.x, y: s.y, rot: 0, len: 10, wd: 10, t: 0, life: 4, fade: false }; w.prints.push(s.print); },
        },
        {
          id: "feet", name: { en: "Left / Right", ko: "왼발 / 오른발" }, param: "±10px · foot shape",
          cap: { en: "Two feet: *alternate* sides, stretched along the path.", ko: "발은 두 개. *좌우 번갈아*, 걷는 방향으로 길게." },
          step(w, s) {
            const p = s.print, n = s.rot + Math.PI / 2;
            p.x += Math.cos(n) * 10 * s.side; p.y += Math.sin(n) * 10 * s.side;
            p.rot = s.rot - Math.PI / 2; p.len = 12; p.wd = 6.5;
          },
        },
        {
          id: "fade", name: { en: "Slow Fade", ko: "천천히 사라짐" }, param: "fade 4s",
          cap: { en: "Don't pop them off. *Fade* them slowly.", ko: "툭 지우지 말고 *서서히* 사라지게." },
          step(w, s) { s.print.fade = true; },
        },
        {
          id: "rim", name: { en: "Pressed Rim", ko: "눌린 테두리" }, param: "light edge +1.5px",
          cap: { en: "A light *rim* makes it look *pressed in*.", ko: "밝은 *테두리*가 있으면 *눌린 것*처럼 보여요." },
          update(w) { w.rim = 1; },
        },
        {
          id: "kick", name: { en: "Sand Kick", ko: "모래 튀김" }, param: "puff + 4 grains",
          cap: { en: "Kick a little *sand* back with each step.", ko: "걸을 때마다 *모래*가 살짝 튀어요." },
          step(w, s) {
            const bx = -Math.sin(s.rot), by = Math.cos(s.rot);
            w.spawn({ type: "smoke", under: true, x: s.x, y: s.y, vx: bx * 40, vy: by * 40, drag: 3, size: 4, size1: 12, life: 0.5, color: "220,190,140" });
            for (let i = 0; i < 4; i++) w.spawn({ x: s.x, y: s.y, vx: bx * rand(60, 140) + rand(-40, 40), vy: by * rand(60, 140) + rand(-40, 40), drag: 6, size: 1.6, life: 0.4, color: "150,115,70" });
          },
        },
        {
          id: "bob", name: { en: "Step Bob", ko: "걸음 출렁" }, param: "scale .92 / 1.08",
          cap: { en: "Squash the body a touch on *each step*.", ko: "*한 걸음마다* 몸이 살짝 눌려요." },
          step(w) { w.hero.sx = 1.1; w.hero.sy = 0.9; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crunch ±pitch",
          cap: { en: "Soft *crunch*. Vary the pitch every step.", ko: "부드러운 *사각*. 걸음마다 음을 바꿔요." },
          step(w) { w.play(() => nz({ dur: 0.07, type: "bandpass", f: rand(1600, 2600), q: 1.5, vol: 0.25 })); },
        },
      ],
    },

    // ───────────────────────── 20. 지진
    {
      id: "env-quake", cat: "env", view: "side",
      title: { en: "Make earthquakes *rumble*", ko: "지진을 *우르르*" },
      intro: { en: "One jolt. That's an *earthquake?*", ko: "한 번 덜컹. 이게 *지진*이라고요?" },
      interval: 2.0, stepDur: 4.2,
      setup(w) {
        woodCrate();
        w.hero = w.actor("hero", { home: 130 });
        w.boxes = [w.actor("env-wood", { home: 380, h: 70 }), w.actor("env-wood", { home: 460, h: 56 })];
        w.boxes.forEach(b => { b.oySpring = true; });
        w.lamp = { a: 0, v: 0 }; w.rumble = 0;
      },
      fire(w) {
        if (!w.on("rumble")) w.shake(0.35);
        for (const b of w.boxes) { b.oy = -18; b.rot = 0.08; }
        w.emit("quake");
      },
      update(w, dt) {
        const L = w.lamp;
        L.v += (-L.a * 18 - L.v * 0.6) * dt; L.a += L.v * dt;
        if (w.rumble > 0) w.rumble = Math.max(0, w.rumble - dt);
        for (const b of w.boxes) b.rot *= Math.pow(0.02, dt);
      },
      drawFloor(w, ctx) {
        skyFill(ctx, "#15161c", "#1d1f27");
        ctx.fillStyle = "#2a2c34"; ctx.fillRect(-100, -100, 740, 120);
        groundFill(ctx, "#1f1d1b");
      },
      drawFront(w, ctx) {
        const L = w.lamp, px = 280, py = 20, len = 110, x = px + Math.sin(L.a) * len, y = py + Math.cos(L.a) * len;
        ctx.strokeStyle = "#555"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        ctx.save(); ctx.translate(x, y); ctx.rotate(-L.a);
        ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.moveTo(-18, 14); ctx.lineTo(18, 14); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.fill();
        ctx.restore();
        add(ctx); glow(ctx, x, y + 18, 60, "255,220,150", 0.5); norm(ctx);
      },
      steps: [
        {
          id: "rumble", name: { en: "Long Rumble", ko: "길게 우르르" }, param: "1.4s · build → fade",
          cap: { en: "Not one jolt. *Build up*, peak, then fade.", ko: "한 번 말고 *점점 세졌다* 잦아들게." },
          quake(w) { w.rumble = 1.4; },
          update(w) { if (w.rumble > 0) w.trauma = Math.max(w.trauma, 0.6 * Math.sin(Math.PI * (1 - w.rumble / 1.4))); },
        },
        {
          id: "hop", name: { en: "Props Hop", ko: "물건이 들썩" }, param: "random 4–14px",
          cap: { en: "Loose objects *hop* on their own.", ko: "물건들이 *제각각* 들썩여요." },
          update(w, dt) { if (w.rumble > 0) for (const b of w.boxes) if (Math.random() < dt * 9) { b.oy = -rand(4, 14); b.rot = rand(-0.06, 0.06); } },
        },
        {
          id: "lamp", name: { en: "Swinging Lamp", ko: "흔들리는 전등" }, param: "pendulum",
          cap: { en: "A hanging lamp *keeps swinging* after it stops.", ko: "멈춘 뒤에도 전등은 *계속 흔들려요*." },
          quake(w) { w.lamp.v += 2.4; },
        },
        {
          id: "crack", name: { en: "Ground Crack", ko: "땅이 갈라짐" }, param: "zigzag · 3s",
          cap: { en: "Tear a *crack* across the floor.", ko: "바닥에 *금*이 쩍 갈라져요." },
          quake(w) {
            const x = rand(180, 300);
            w.after(0.3, () => w.spawn({ type: "crack", x, y: G + 2, pts: boltPath(0, 0, 160, 30, 8, 8), w: 5, life: 3, hold: true, add: false, color: "5,5,8" }));
          },
        },
        {
          id: "debris", name: { en: "Falling Debris", ko: "떨어지는 파편" }, param: "10 rocks",
          cap: { en: "Bits *fall from the ceiling*. Danger is above.", ko: "*천장에서* 부스러기가 떨어져요." },
          quake(w) { for (let i = 0; i < 10; i++) w.after(0.2 + i * 0.08, () => w.spawn({ type: "chunk", x: rand(40, 520), y: 22, vy: rand(50, 150), g: 1300, vr: rand(-10, 10), ground: true, bounce: 0.35, size: rand(3, 7), life: 2.2, hold: true, color: "110,105,100" })); },
        },
        {
          id: "dust", name: { en: "Ground Dust", ko: "바닥 먼지" }, param: "along floor",
          cap: { en: "*Dust* rises all along the ground.", ko: "바닥 전체에서 *먼지*가 일어요." },
          quake(w) { for (let i = 0; i < 12; i++) w.after(i * 0.06, () => w.spawn({ type: "smoke", under: true, x: rand(0, 540), y: G - 4, vx: rand(-40, 40), vy: rand(-40, -10), drag: 1.5, size: 8, size1: 28, life: 1.3, color: "130,120,110" })); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "40Hz rumble",
          cap: { en: "A deep *rumble* you feel more than hear.", ko: "귀보다 *몸으로* 느끼는 낮은 우르르." },
          quake(w) { w.play(() => { tn({ f: 45, f2: 30, dur: 1.4, vol: 0.6 }); nz({ dur: 1.4, f: 300, f2: 80, vol: 0.5 }); }); },
        },
      ],
    },
  );
})();

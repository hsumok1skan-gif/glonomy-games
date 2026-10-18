"use strict";
/* horde — 주인공 하나 vs 적 떼 (뱀서라이크·무쌍) 30편 */
(() => {
  const HX = 270, HY = 188;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const arena = (w, ctx) => {
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(14, 14, 512, 332);
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 3; ctx.strokeRect(14, 14, 512, 332);
  };
  const live = f => f.alive && !(f.wait > 0) && !f.flying;
  const dist = (f, x, y) => Math.hypot(f.x - x, f.gy - y);
  const ang = (f, x, y) => Math.atan2(f.gy - y, f.x - x);
  // 적을 주인공 둘레(edge면 화면 가장자리)에 놓기
  const spot = (w, f, edge) => {
    const a = rand(0, TAU), d = edge ? rand(1, 1.1) : rand(0.4, 1);
    const h = w.hero || { x: HX, gy: HY };
    f.x = f.home = cl(h.x + Math.cos(a) * 290 * d, 28, 512);
    f.gy = cl(h.gy + Math.sin(a) * 190 * d, 48, 332);
    f.kx = f.ky = 0;
  };
  // 적 떼 + 주인공 (주인공을 마지막에 만들어 맨 위에 그림)
  const mob = (w, n, o = {}) => {
    w.foes = [];
    for (let i = 0; i < n; i++) {
      const f = w.actor("foeTop", { home: 0, gy: 0, h: o.h || 30, hp: o.hp || 10 });
      f.kx = f.ky = 0; f.cd = 0; f.sp = rand(0.75, 1.25) * (o.sp || 40);
      w.foes.push(f);
    }
    w.hero = w.actor("heroTop", { home: o.x || HX, gy: o.y || HY, h: o.hh || 46 });
    w.foes.forEach(f => spot(w, f, false));
    return w.foes;
  };
  // 주인공 쪽으로 걷기 + 밀려난 속도 + 서로 밀어내기
  const chase = (w, dt, o = {}) => {
    const h = w.hero, R = o.r == null ? 34 : o.r, sep = o.sep == null ? 22 : o.sep, F = w.foes;
    for (const f of F) {
      if (f.alive && f.gone) { f.gone = false; spot(w, f, true); f.wait = f.delay || 0.001; }
      if (f.wait > 0) {
        f.wait -= dt; f.alpha = 0;
        if (f.wait > 0) continue;
        f.alpha = 1; f.sx = f.sy = 0.3; w.emit("spawn", f);
      }
      f.cd = Math.max(0, (f.cd || 0) - dt);
      if (!f.alive || f.flying) continue;
      const dx = h.x - f.x, dy = h.gy - f.gy, d = Math.hypot(dx, dy) || 1;
      if (!w.frozen && d > R) { const s = Math.min(d - R, f.sp * (o.sp || 1) * dt); f.x += dx / d * s; f.gy += dy / d * s; }
      f.x += f.kx * dt; f.gy += f.ky * dt;
      const k = Math.exp(-dt * 5); f.kx *= k; f.ky *= k;
      if (!o.free) { f.x = cl(f.x, 20, 520); f.gy = cl(f.gy, 46, 338); }
      f.rot = Math.atan2(dy, dx) + Math.PI;
    }
    if (sep > 0) {
      for (let i = 0; i < F.length; i++) {
        const a = F[i]; if (!live(a)) continue;
        for (let j = i + 1; j < F.length; j++) {
          const b = F[j]; if (!live(b)) continue;
          const dx = b.x - a.x, dy = b.gy - a.gy, d = Math.hypot(dx, dy);
          if (d > 0.01 && d < sep) { const p = (sep - d) / d * 0.5; a.x -= dx * p; a.gy -= dy * p; b.x += dx * p; b.gy += dy * p; }
        }
      }
    }
  };
  const die = (w, f, delay = 0) => { if (!f.alive) return; f.gone = true; f.delay = delay; w.kill(f); };
  const nearest = (w, n, x = w.hero.x, y = w.hero.gy) =>
    w.foes.filter(live).sort((a, b) => dist(a, x, y) - dist(b, x, y)).slice(0, n);
  const push = (f, a, v) => { f.kx += Math.cos(a) * v; f.ky += Math.sin(a) * v; };
  const txt = (ctx, t, x, y, size, col = "#fff", align = "center") => {
    ctx.font = `900 ${size}px Pretendard, "Apple SD Gothic Neo", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.2; ctx.strokeStyle = "rgba(10,12,20,0.92)";
    ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
  };
  const burst = (w, x, y, n, col, s0 = 120, s1 = 380) => sparks(w, x, y, n, col, [s0, s1]);
  const once = (w, key, gap) => { const k = "_t" + key; if (w.time - (w[k] || -9) < gap) return false; w[k] = w.time; return true; };

  RECIPES.push(
    /* 1 ─ 넉백 웨이브 */
    {
      id: "horde-knockback", cat: "horde", view: "top",
      title: { en: "Shove the *whole horde* back", ko: "몰려든 적을 *한 번에* 밀어내기" },
      intro: { en: "The pulse fires. Nobody *moves*.", ko: "기술을 썼는데 아무도 *안 밀려요*." },
      interval: 1.2, stepDur: 3.6,
      drawFloor: arena,
      setup(w) { mob(w, 32, { hp: 12, sp: 60 }); w.delay = 0; },
      fire(w) {
        const h = w.hero, R = 160;
        w.delay = 0;
        w.emit("pulse", h, R);
        for (const f of w.foes) {
          const d = dist(f, h.x, h.gy);
          if (!live(f) || d > R) continue;
          const a = ang(f, h.x, h.gy);
          const hit = () => { if (!live(f)) return; f.hp -= 4; w.emit("hit", f, a, d); if (f.hp <= 0) die(w, f, rand(0, 0.6)); };
          if (w.delay) w.after(d * w.delay, hit); else hit();
        }
      },
      update(w, dt) { chase(w, dt); },
      steps: [
        {
          id: "ring", name: { en: "Shock Ring", ko: "충격 고리" }, param: "R 160px · 0.3s",
          cap: { en: "Show the *reach*. A ring that grows to the edge.", ko: "닿는 *범위*를 보여줘요. 끝까지 퍼지는 고리." },
          pulse(w, h, R) {
            w.spawn({ type: "ring", x: h.x, y: h.gy, size: 20, size1: R, life: 0.45, w: 16, color: "198,244,50" });
            w.spawn({ type: "glow", x: h.x, y: h.gy, size: 80, size1: 20, life: 0.25, color: "198,244,50" });
          },
        },
        {
          id: "push", name: { en: "Knockback", ko: "밀어내기" }, param: "700px/s · falloff",
          cap: { en: "Push them *outward*. Closer means *farther*.", ko: "*바깥으로* 밀어요. 가까울수록 *멀리*." },
          hit(w, f, a, d) { push(f, a, 760 * (1 - d / 220)); },
        },
        {
          id: "travel", name: { en: "Wave Travel", ko: "퍼지는 타이밍" }, param: "800 px/s",
          cap: { en: "Hit each one *when the ring arrives*.", ko: "한꺼번에 말고, *고리가 닿을 때* 맞게." },
          pulse(w) { w.delay = 1 / 800; },
        },
        {
          id: "flash", name: { en: "Flash + Squash", ko: "번쩍 + 찌그러짐" }, param: "flash 1 · 0.7×",
          cap: { en: "Every body *flashes* and *squashes*.", ko: "맞은 몸마다 *번쩍*, *찌그러져요*." },
          hit(w, f) { f.flash = 1; f.sx = 1.35; f.sy = 0.7; },
        },
        {
          id: "dust", name: { en: "Skid Dust", ko: "미끄러진 먼지" }, param: "2 puffs / foe",
          cap: { en: "Kick up *dust* where they slide.", ko: "밀려난 자리에 *먼지*가 일어요." },
          hit(w, f, a) {
            for (let i = 0; i < 2; i++) w.spawn({ type: "smoke", x: f.x, y: f.gy, vx: Math.cos(a) * rand(60, 160), vy: Math.sin(a) * rand(60, 160), drag: 3, size: 6, size1: 18, life: 0.6, color: "200,190,170" });
          },
        },
        {
          id: "shake", name: { en: "Shake + Stop", ko: "흔들림 + 멈칫" }, param: "trauma .3 · 50ms",
          cap: { en: "A tiny *freeze*, then a *shake*.", ko: "아주 잠깐 *멈칫*, 그리고 *흔들*." },
          pulse(w) { w.hitstop(0.05); w.shake(0.32); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "burst + thud",
          cap: { en: "One *whump* for the wave, not thirty.", ko: "서른 번 말고, 파동에 *쿵* 한 번." },
          pulse(w) { w.sfx.burst(); w.sfx.thud(); },
        },
      ],
    },

    /* 2 ─ 연쇄 처치 카운터 */
    {
      id: "horde-chain", cat: "horde", view: "top",
      title: { en: "Make a *kill chain* feel alive", ko: "연쇄 처치 숫자에 *생기* 넣기" },
      intro: { en: "The number goes up. *Who cares?*", ko: "숫자는 오르는데… *아무 느낌* 없어요." },
      interval: 0.24, stepDur: 3.8,
      drawFloor: arena,
      setup(w) {
        mob(w, 30, { hp: 1, sp: 32 });
        w.chain = { n: 0, t: 0, sc: 1, col: "#fff", jit: 0, bar: 0 }; w.tick = 0;
      },
      fire(w) {
        if (++w.tick % 20 > 15) return; // 잠깐 쉬어서 연쇄가 끊기게
        const f = nearest(w, 1)[0], h = w.hero; if (!f) return;
        const a = Math.atan2(f.gy - h.gy, f.x - h.x);
        h.rot = a;
        w.shoot({ x: h.x + Math.cos(a) * 26, y: h.gy + Math.sin(a) * 26, vx: Math.cos(a) * 1400, vy: Math.sin(a) * 1400, r: 3, color: "#e5e7eb", len: 22,
          test: p => Math.hypot(p.x - f.x, p.y - f.gy) < 16,
          onHit: () => {
            if (!live(f)) return;
            die(w, f, rand(0, 0.5));
            const c = w.chain; c.n = c.t > 0 ? c.n + 1 : 1; c.t = 1.2;
            w.emit("chain", c, f);
          } });
      },
      update(w, dt) {
        chase(w, dt, { r: 44 });
        const c = w.chain; c.t -= dt; c.sc += (1 - c.sc) * Math.min(1, dt * 10); c.jit *= Math.exp(-dt * 4); c.bar = 0;
      },
      drawHud(w, ctx) {
        const c = w.chain; if (!c.n) return;
        ctx.save(); ctx.globalAlpha = c.t > 0 ? 1 : 0.35;
        const x = 270 + rand(-1, 1) * c.jit, y = 64 + rand(-1, 1) * c.jit;
        ctx.translate(x, y); ctx.scale(c.sc, c.sc);
        txt(ctx, c.n + " CHAIN", 0, 0, 26, c.col);
        ctx.restore();
        if (c.bar > 0) { rr(ctx, 210, 86, 120, 6, 3, "rgba(255,255,255,0.15)"); rr(ctx, 210, 86, 120 * c.bar, 6, 3, c.col); }
      },
      steps: [
        {
          id: "pop", name: { en: "Pop", ko: "톡 튀기" }, param: "scale 1.7 → 1",
          cap: { en: "*Pop* the counter on every kill.", ko: "잡을 때마다 숫자가 *톡* 커져요." },
          chain(w, c) { c.sc = 1.7; },
        },
        {
          id: "heat", name: { en: "Heat Color", ko: "달아오르는 색" }, param: "white → red",
          cap: { en: "Longer chain, *hotter* color.", ko: "길게 이어질수록 *뜨거운* 색으로." },
          chain(w, c) { c.col = ["#ffffff", "#fde047", "#fb923c", "#f43f5e"][Math.min(3, (c.n / 4) | 0)]; },
        },
        {
          id: "bar", name: { en: "Window Bar", ko: "남은 시간 막대" }, param: "1.2s window",
          cap: { en: "Show *how long* until the chain breaks.", ko: "연쇄가 *끊기기까지* 남은 시간을 보여줘요." },
          update(w) { w.chain.bar = Math.max(0, w.chain.t / 1.2); },
        },
        {
          id: "link", name: { en: "Kill → Counter", ko: "처치 → 숫자로" }, param: "spark seeks HUD",
          cap: { en: "Send a *spark* from the kill to the number.", ko: "잡은 자리에서 숫자로 *불씨*가 날아가요." },
          chain(w, c, f) {
            w.spawn({ type: "spark", seek: true, x: f.x, y: f.gy, tx: 270, ty: 64, life: 0.25, size: 3, color: "253,224,71" });
            burst(w, f.x, f.gy, 5, "253,224,71");
          },
        },
        {
          id: "tremble", name: { en: "Tremble", ko: "떨림" }, param: "0.5px × chain",
          cap: { en: "Big chains *tremble* a little.", ko: "길어질수록 숫자가 *부들부들*." },
          chain(w, c) { c.jit = Math.min(7, c.n * 0.5); },
        },
        {
          id: "milestone", name: { en: "Milestones", ko: "단계 보상" }, param: "every 5",
          cap: { en: "Every *5*, a bigger *bang*.", ko: "*5*마다 한 번 더 *크게*." },
          chain(w, c) {
            if (c.n % 5) return;
            w.spawn({ type: "ring", x: 270, y: 64, size: 20, size1: 110, life: 0.4, w: 10, color: "253,224,71" });
            w.spawn({ type: "text", text: "x" + c.n + "!", x: 270, y: 112, vy: -40, life: 0.8, size: 34, color: "#fde047" });
            w.shake(0.15);
          },
        },
        {
          id: "sound", name: { en: "Rising Pitch", ko: "올라가는 음" }, param: "+1 semitone / kill",
          cap: { en: "Each kill plays *one step higher*.", ko: "잡을수록 음이 *한 칸씩* 올라가요." },
          chain(w, c) { w.sfx.blip(Math.min(c.n, 14)); },
        },
      ],
    },

    /* 3 ─ 경험치 보석 빨아들이기 */
    {
      id: "horde-gem-vacuum", cat: "horde", view: "top",
      title: { en: "Make XP gems *want* you", ko: "경험치 보석이 *빨려 오게*" },
      intro: { en: "Gems slide over. Like *luggage*.", ko: "보석이 *짐짝*처럼 미끄러져 와요." },
      interval: 0.7, stepDur: 3.6,
      drawFloor: arena,
      setup(w) { mob(w, 26, { hp: 1, sp: 38 }); w.gems = []; w.xp = { v: 0, bump: 0, glow: 0 }; },
      fire(w) {
        for (const f of nearest(w, 3)) {
          die(w, f, rand(0.2, 0.8));
          burst(w, f.x, f.gy, 4, "255,255,255");
          const g = { x: f.x, y: f.gy, vx: 0, vy: 0, sp: 260, acc: 0, wait: 0.35 };
          w.emit("drop", g);
          w.gems.push(g);
        }
      },
      update(w, dt) {
        chase(w, dt, { r: 60 });
        const h = w.hero, x = w.xp;
        x.bump = Math.max(0, x.bump - dt * 5);
        for (const g of w.gems) {
          g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= Math.exp(-dt * 6); g.vy *= Math.exp(-dt * 6);
          if ((g.wait -= dt) > 0) continue;
          g.sp += g.acc * dt;
          const dx = h.x - g.x, dy = h.gy - g.y, d = Math.hypot(dx, dy) || 1;
          g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
          if (d < 14) { g.dead = true; x.v = (x.v + 6) % 100; w.emit("absorb", g); }
        }
        w.gems = w.gems.filter(g => !g.dead);
      },
      drawFront(w, ctx) { for (const g of w.gems) drawGem(ctx, 1, g.x, g.y, 9); },
      drawHud(w, ctx) {
        const x = w.xp, t = 4 + x.bump * 4;
        rr(ctx, 170, 44 - t / 2, 200, t, t / 2, "rgba(255,255,255,0.15)");
        rr(ctx, 170, 44 - t / 2, 200 * x.v / 100, t, t / 2, x.bump > 0.3 ? "#e0f2fe" : "#38bdf8");
      },
      steps: [
        {
          id: "pop", name: { en: "Pop Out", ko: "톡 튀어나옴" }, param: "scatter 160px/s",
          cap: { en: "Gems *pop out* of the body first.", ko: "보석이 먼저 몸에서 *톡* 튀어나와요." },
          drop(w, g) { const a = rand(0, TAU); g.vx = Math.cos(a) * 260; g.vy = Math.sin(a) * 260; },
        },
        {
          id: "accel", name: { en: "Back-off → Rush", ko: "멈칫 → 확" }, param: "v −140 · a 1800",
          cap: { en: "Lean *away*, then *rush* in. Slow → fast.", ko: "살짝 *물러났다가* 확 빨려 와요." },
          drop(w, g) { g.sp = -140; g.acc = 1800; },
        },
        {
          id: "trail", name: { en: "Trail", ko: "꼬리" }, param: "1 glow / frame",
          cap: { en: "Leave a *blue streak* behind each gem.", ko: "날아오는 보석마다 *파란 꼬리*." },
          update(w) {
            for (const g of w.gems) if (g.wait <= 0 && g.sp > 200) w.spawn({ type: "glow", x: g.x, y: g.y, size: 9, size1: 0, life: 0.22, color: "56,189,248" });
          },
        },
        {
          id: "absorb", name: { en: "Absorb Flash", ko: "흡수 번쩍" }, param: "ring 10 → 40",
          cap: { en: "The hero *glows* as each one lands.", ko: "들어올 때마다 주인공이 *반짝*." },
          absorb(w) {
            const h = w.hero; h.flash = 0.5;
            w.spawn({ type: "ring", x: h.x, y: h.gy, size: 10, size1: 40, life: 0.25, w: 4, color: "125,211,252" });
          },
        },
        {
          id: "bar", name: { en: "Bar Bump", ko: "막대 툭" }, param: "height 4 → 8px",
          cap: { en: "The *XP bar* thickens on every gem.", ko: "보석이 들어오면 *경험치 막대*가 툭." },
          absorb(w) { w.xp.bump = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "blip, pitch climbs",
          cap: { en: "A tiny *tink* per gem, climbing *higher*.", ko: "보석마다 작은 *팅*, 음은 점점 *위로*." },
          absorb(w) { w.sfx.blip((w.xp.v / 6) % 12); },
        },
      ],
    },

    /* 4 ─ 화면 청소 폭탄 */
    {
      id: "horde-nuke", cat: "horde", view: "top",
      title: { en: "Make a screen-clear *feel huge*", ko: "화면 청소 폭탄을 *크게*" },
      intro: { en: "Everyone vanished. *Was that it?*", ko: "다 사라졌는데… *그게 다?*" },
      interval: 2.4, stepDur: 4.2,
      drawFloor: arena,
      setup(w) { mob(w, 36, { hp: 1, sp: 40 }); w.delay = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true; w.delay = 0;
        const h = w.hero;
        const go = () => {
          w.emit("boom", h);
          for (const f of w.foes) {
            if (!live(f)) continue;
            w.after(dist(f, h.x, h.gy) * w.delay, () => die(w, f, rand(0.1, 0.6)));
          }
          w.after(0.6, () => { w.busy = false; });
        };
        if (w.on("charge")) { w.emit("charge", h); w.after(0.35, go); } else go();
      },
      update(w, dt) { chase(w, dt); },
      steps: [
        {
          id: "charge", name: { en: "Wind-up", ko: "모으기" }, param: "350ms",
          cap: { en: "*Suck light in* before it blows.", ko: "터지기 전에 빛을 *빨아들여요*." },
          charge(w, h) {
            for (let i = 0; i < 18; i++) { const a = rand(0, TAU), d = rand(70, 130); w.spawn({ type: "spark", seek: true, x: h.x + Math.cos(a) * d, y: h.gy + Math.sin(a) * d, tx: h.x, ty: h.gy, life: 0.3, size: 3, color: "254,240,138" }); }
            w.spawn({ type: "glow", x: h.x, y: h.gy, size: 10, size1: 60, life: 0.35, color: "253,224,71" });
          },
        },
        {
          id: "flash", name: { en: "White Frame", ko: "하얀 한 프레임" }, param: "alpha .9",
          cap: { en: "Open with *one white frame*.", ko: "시작은 화면 전체 *하얗게*." },
          boom(w) { w.flash("255,250,230", 0.9); },
        },
        {
          id: "ring", name: { en: "Sweeping Ring", ko: "쓸고 가는 고리" }, param: "900 px/s",
          cap: { en: "A ring *sweeps out*. Enemies die *as it passes*.", ko: "고리가 *쓸고 가며* 닿는 순서대로 쓰러져요." },
          boom(w, h) {
            w.delay = 1 / 900;
            w.spawn({ type: "ring", x: h.x, y: h.gy, size: 20, size1: 380, life: 0.5, w: 22, color: "255,236,180" });
            w.spawn({ type: "ring", x: h.x, y: h.gy, size: 10, size1: 300, life: 0.45, w: 8, color: "253,186,116" });
          },
        },
        {
          id: "pop", name: { en: "Death Pops", ko: "터지는 몸" }, param: "sparks + ember mark",
          cap: { en: "Each body *pops* into light. Embers stay.", ko: "몸마다 빛으로 *팡*, 불씨는 남아요." },
          kill(w, f) {
            w.spawn({ type: "glow", x: f.x, y: f.gy, size: 34, size1: 6, life: 0.4, color: "255,200,90" });
            w.spawn({ type: "ellipse", under: true, round: true, x: f.x, y: f.gy, size: 16, life: 2, color: "251,146,60", alpha: 0.5, hold: true, add: true });
            burst(w, f.x, f.gy, 4, "255,230,150", 150, 420);
          },
        },
        {
          id: "slowmo", name: { en: "Slow-mo", ko: "슬로모션" }, param: "0.3× · 0.7s",
          cap: { en: "*Slow time* so you can watch it spread.", ko: "퍼지는 걸 *볼 수 있게* 느리게." },
          boom(w) { w.slowmo(0.3, 0.7); },
        },
        {
          id: "shake", name: { en: "Big Shake", ko: "큰 흔들림" }, param: "trauma .8",
          cap: { en: "Clearing the screen *should* shake it.", ko: "화면을 비웠으면 화면도 *흔들려야죠*." },
          boom(w) { w.shake(0.8); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge → boom",
          cap: { en: "A rising *whine*, then a deep *boom*.", ko: "올라가는 *위잉*, 그리고 낮은 *쾅*." },
          charge(w) { w.sfx.charge(); },
          boom(w) { w.sfx.boom(); },
        },
      ],
    },

    /* 5 ─ 주위를 도는 칼날 */
    {
      id: "horde-orbit", cat: "horde", view: "top",
      title: { en: "Make orbiting blades *bite*", ko: "도는 칼날에 *날* 세우기" },
      intro: { en: "Grey sticks spin. Enemies *just die*.", ko: "회색 막대가 돌고, 적은 *그냥* 죽어요." },
      interval: 1.6, stepDur: 3.6,
      drawFloor: arena,
      setup(w) { mob(w, 30, { hp: 30, sp: 40 }); w.orb = { a: 0, n: 3, r: 72, boost: 0 }; },
      fire(w) { w.orb.boost = 1; w.emit("spin", w.hero); },
      update(w, dt) {
        chase(w, dt, { r: 24 });
        const o = w.orb, h = w.hero;
        o.boost = Math.max(0, o.boost - dt * 1.2);
        o.a += dt * (3.4 + o.boost * 5);
        for (let i = 0; i < o.n; i++) {
          const a = o.a + i * TAU / o.n, b = { x: h.x + Math.cos(a) * o.r, y: h.gy + Math.sin(a) * o.r, a };
          for (const f of w.foes) {
            if (!live(f) || f.cd > 0 || dist(f, b.x, b.y) > 22) continue;
            f.cd = 0.3; const d = (rand(7, 13)) | 0; f.hp -= d;
            w.emit("hit", f, b, d);
            if (f.hp <= 0) die(w, f, rand(0, 0.6));
          }
        }
      },
      drawFront(w, ctx) {
        const o = w.orb, h = w.hero;
        for (let i = 0; i < o.n; i++) {
          const a = o.a + i * TAU / o.n, b = { x: h.x + Math.cos(a) * o.r, y: h.gy + Math.sin(a) * o.r, a, cx: h.x, cy: h.gy, r: o.r };
          w.emit("drawBlade", ctx, b);
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = "#9ca3af"; ctx.fillRect(-10, -3, 20, 6); ctx.restore();
        }
      },
      steps: [
        {
          id: "art", name: { en: "Bright Blade", ko: "빛나는 칼날" }, param: "glow 26px",
          cap: { en: "Make the weapon *glow*. It's the star.", ko: "무기가 주인공이에요. *빛나게*." },
          drawBlade(w, ctx, b) {
            glow(ctx, b.x, b.y, 26, "125,211,252", 0.8);
            ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a + Math.PI / 2);
            ctx.fillStyle = "#e0f2fe"; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, -14, 18, 0); ctx.quadraticCurveTo(0, -4, -18, 0); ctx.fill();
            ctx.restore();
          },
        },
        {
          id: "trail", name: { en: "Motion Arc", ko: "지나간 궤적" }, param: "0.9 rad trail",
          cap: { en: "Paint the *path* behind each blade.", ko: "칼날 뒤에 지나간 *길*을 그려요." },
          drawBlade(w, ctx, b) {
            ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
            for (let k = 0; k < 6; k++) {
              ctx.strokeStyle = `rgba(125,211,252,${0.28 - k * 0.045})`; ctx.lineWidth = 12 - k;
              ctx.beginPath(); ctx.arc(b.cx, b.cy, b.r, b.a - 0.15 * (k + 1), b.a - 0.15 * k); ctx.stroke();
            }
            ctx.globalCompositeOperation = "source-over";
          },
        },
        {
          id: "spark", name: { en: "Contact Sparks", ko: "닿는 불꽃" }, param: "5 sparks · flash",
          cap: { en: "*Sparks* and a *white flash* on contact.", ko: "닿는 순간 *불꽃*과 *하얀 번쩍*." },
          hit(w, f, b) { f.flash = 1; sparks(w, b.x, b.y, 5, "224,242,254", [120, 360], b.a + 0.6, b.a + 2.4); },
        },
        {
          id: "knock", name: { en: "Swat Away", ko: "쳐내기" }, param: "320 px/s out",
          cap: { en: "Swat them *outward*. The blade has mass.", ko: "*바깥으로* 쳐내요. 칼날에도 무게가 있어요." },
          hit(w, f, b) { push(f, ang(f, w.hero.x, w.hero.gy), 320); f.sx = 0.7; f.sy = 1.3; },
        },
        {
          id: "numbers", name: { en: "Damage Numbers", ko: "데미지 숫자" }, param: "18px · 0.5s",
          cap: { en: "Small, fast *numbers*. Don't cover the fight.", ko: "작고 빠르게 *숫자*. 싸움은 가리지 않게." },
          hit(w, f, b, d) { w.spawn({ type: "text", text: String(d), x: f.x + rand(-6, 6), y: f.gy - 18, vy: -90, life: 0.5, size: 18, color: "#e0f2fe" }); },
        },
        {
          id: "spin", name: { en: "Spin-up Flare", ko: "가속 번쩍" }, param: "speed ×2.5",
          cap: { en: "When it *speeds up*, flare and *stretch out*.", ko: "*빨라질* 때 번쩍, 반경도 *쭉*." },
          spin(w, h) {
            w.spawn({ type: "ring", x: h.x, y: h.gy, size: 30, size1: 110, life: 0.35, w: 8, color: "125,211,252" });
            w.orb.r = 100; w.tween(w.orb, { r: 72 }, 0.9, "inout");
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick, max 20/s",
          cap: { en: "Short *ticks*. *Cap* how often they play.", ko: "짧은 *틱*. 너무 자주 안 나게 *제한*해요." },
          hit(w) { if (once(w, "tick", 0.05)) w.sfx.tick(); },
          spin(w) { w.sfx.swish(); },
        },
      ],
    },

    /* 6 ─ 피해 오라 */
    {
      id: "horde-aura", cat: "horde", view: "top",
      title: { en: "Make a damage aura *visible*", ko: "피해 오라를 *눈에 보이게*" },
      intro: { en: "Enemies melt near you. *Why?*", ko: "가까이 오면 녹는데… *왜죠?*" },
      interval: 0.5, stepDur: 3.6,
      drawFloor: arena,
      setup(w) { mob(w, 30, { hp: 15, sp: 42 }); w.auraR = 100; },
      fire(w) {
        const h = w.hero;
        w.emit("tick", h, w.auraR);
        for (const f of w.foes) {
          if (!live(f) || dist(f, h.x, h.gy) > w.auraR) continue;
          f.hp -= 3; w.emit("hit", f);
          if (f.hp <= 0) die(w, f, rand(0, 0.6));
        }
      },
      update(w, dt) { chase(w, dt, { r: 30 }); },
      drawBack(w, ctx) { w.emit("drawAura", ctx, w.hero, w.auraR); },
      steps: [
        {
          id: "disc", name: { en: "Aura Disc", ko: "오라 원판" }, param: "R 100px",
          cap: { en: "First, *show the zone*. A soft disc.", ko: "먼저 *범위*부터. 은은한 원판." },
          drawAura(w, ctx, h, R) {
            glow(ctx, h.x, h.gy, R, "190,24,93", 0.35);
            ctx.strokeStyle = "rgba(244,114,182,0.6)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(h.x, h.gy, R, 0, TAU); ctx.stroke();
          },
        },
        {
          id: "pulse", name: { en: "Tick Pulse", ko: "박동" }, param: "every 0.5s",
          cap: { en: "*Pulse* on every damage tick.", ko: "피해가 들어갈 때마다 *두근*." },
          tick(w, h, R) { w.spawn({ type: "ring", x: h.x, y: h.gy, size: 20, size1: R, life: 0.3, w: 8, color: "244,114,182" }); },
        },
        {
          id: "hurt", name: { en: "Hurt Tint", ko: "붉게 물듦" }, param: "tint .7 · squash",
          cap: { en: "Enemies inside *flush red* and *flinch*.", ko: "안에 든 적은 *붉어지고* 움찔해요." },
          hit(w, f) { f.tint = 0.7; f.sx = f.sy = 0.85; },
        },
        {
          id: "embers", name: { en: "Embers", ko: "불티" }, param: "~25 / s",
          cap: { en: "Let *embers* float inside the zone.", ko: "범위 안에 *불티*가 떠다녀요." },
          update(w, dt) {
            if (Math.random() > dt * 25) return;
            const h = w.hero, a = rand(0, TAU), d = rand(20, w.auraR);
            w.spawn({ type: "glow", x: h.x + Math.cos(a) * d, y: h.gy + Math.sin(a) * d, vx: Math.cos(a) * 20, vy: -30, size: rand(4, 7), size1: 0, life: rand(0.5, 0.9), color: "251,113,133" });
          },
        },
        {
          id: "numbers", name: { en: "Tick Numbers", ko: "작은 숫자" }, param: "14px · pink",
          cap: { en: "Tiny *pink numbers*. Clearly not your main hit.", ko: "작은 *분홍 숫자*. 주공격과 구분돼요." },
          hit(w, f) { w.spawn({ type: "text", text: "3", x: f.x + rand(-8, 8), y: f.gy - 14, vy: -60, life: 0.45, size: 14, color: "#f9a8d4" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "low hum tick",
          cap: { en: "A *low, soft* tick. It plays forever.", ko: "*낮고 부드럽게*. 계속 들리는 소리니까요." },
          tick(w) { w.play(() => tn({ type: "sine", f: 110, f2: 70, dur: 0.12, vol: 0.25 })); },
        },
      ],
    },

    /* 7 ─ 연속 처치 아나운서 */
    {
      id: "horde-announcer", cat: "horde", view: "top",
      title: { en: "Make a kill streak *announce itself*", ko: "연속 처치를 *크게 외치기*" },
      intro: { en: "Rampage… in *tiny letters*.", ko: "대학살인데… *글씨가 작아요*." },
      interval: 0.3, stepDur: 3.8,
      drawFloor: arena,
      setup(w) {
        mob(w, 30, { hp: 1, sp: 34 });
        w.streak = 0; w.ann = null;
        w.words = ["ON FIRE", "RAMPAGE", "UNSTOPPABLE", "MASSACRE", "LEGENDARY"];
      },
      fire(w) {
        const f = nearest(w, 1)[0]; if (!f) return;
        w.hero.rot = Math.atan2(f.gy - w.hero.gy, f.x - w.hero.x);
        w.spawn({ type: "slash", x: f.x, y: f.gy, ang: rand(-1, 1), len: 18, size: 4, life: 0.12, color: "255,255,255" });
        die(w, f, rand(0, 0.6));
        w.streak++;
        if (w.streak % 4) return;
        const tier = (w.streak / 4 - 1) % 5;
        w.ann = { text: w.words[tier], tier, n: w.streak, t: 0, y: 110, sc: 1, size: 20, col: "#fff" };
        w.emit("announce", w.ann);
      },
      update(w, dt) {
        chase(w, dt, { r: 40 });
        const a = w.ann; if (!a) return;
        a.t += dt;
        if (a.exit && a.t > 1.05) a.y -= dt * 260;
        if (a.t > 1.4) w.ann = null;
      },
      drawHud(w, ctx) {
        txt(ctx, "KILLS " + w.streak, 270, 318, 14, "rgba(255,255,255,0.7)");
        const a = w.ann; if (!a) return;
        ctx.save(); ctx.globalAlpha = Math.min(1, (1.4 - a.t) * 4);
        ctx.translate(270, a.y); ctx.scale(a.sc, a.sc);
        txt(ctx, a.text, 0, 0, a.size, a.col);
        if (a.tag) txt(ctx, a.tag, 0, a.size * 0.9, 13, "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "big", name: { en: "Big & Tiered", ko: "크게, 단계별로" }, param: "34px + 4px / tier",
          cap: { en: "Make it *big*. Higher tier, *bigger* word.", ko: "*크게*. 단계가 오를수록 *더 크게*." },
          announce(w, a) { a.size = 34 + a.tier * 4; },
        },
        {
          id: "punch", name: { en: "Punch-in", ko: "쾅 들어오기" }, param: "scale 2.4 → 1 back",
          cap: { en: "Slam it in from *huge*, with a little *overshoot*.", ko: "*아주 크게* 시작해서 쾅, 살짝 *튕기며* 자리 잡아요." },
          announce(w, a) { a.sc = 2.4; w.tween(a, { sc: 1 }, 0.28, "back"); },
        },
        {
          id: "color", name: { en: "Tier Color", ko: "단계별 색" }, param: "5 colors",
          cap: { en: "Each tier gets its *own color*.", ko: "단계마다 *색*이 달라요." },
          announce(w, a) { a.col = ["#fde047", "#fb923c", "#f43f5e", "#e879f9", "#c6f432"][a.tier]; },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "10 streaks",
          cap: { en: "*Speed lines* rush past behind it.", ko: "뒤로 *속도선*이 휙휙 지나가요." },
          announce(w, a) {
            for (let i = 0; i < 10; i++) {
              const y = a.y + rand(-26, 26), s = rand(700, 1100);
              w.spawn({ type: "spark", x: rand(120, 420), y, vx: i % 2 ? s : -s, vy: 0, drag: 2, size: 2.5, life: rand(0.25, 0.45), color: "255,255,255" });
            }
          },
        },
        {
          id: "beat", name: { en: "Flash Beat", ko: "번쩍 한 박자" }, param: "flash .35 · 0.5× 0.3s",
          cap: { en: "A *flash* and a beat of *slow-mo*.", ko: "*번쩍*, 그리고 한 박자 *느리게*." },
          announce(w) { w.flash("255,255,255", 0.35); w.slowmo(0.5, 0.3); },
        },
        {
          id: "tag", name: { en: "Streak Tag", ko: "숫자 꼬리표" }, param: "\"16 KILLS\" · exit up",
          cap: { en: "Add the *count*, then fly it *off the top*.", ko: "*숫자*를 붙이고, 끝나면 *위로* 날아가요." },
          announce(w, a) { a.tag = a.n + " KILLS"; a.exit = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "boom + fanfare",
          cap: { en: "A low *boom* under a short *fanfare*.", ko: "낮은 *쿵* 위에 짧은 *빰빠밤*." },
          announce(w) { w.sfx.thud(); w.sfx.fanfare(); },
        },
      ],
    },

    /* 8 ─ 채찍으로 한 줄 쓸기 (옆에서) */
    {
      id: "horde-whip", cat: "horde", view: "side",
      title: { en: "Make a whip *mow the line*", ko: "채찍으로 한 줄을 *쓸어버리기*" },
      intro: { en: "Seven goblins. One *invisible* whip.", ko: "고블린 일곱. 채찍은 *안 보여요*." },
      interval: 1.0, stepDur: 3.6,
      setup(w) {
        w.foes = [];
        for (let i = 0; i < 7; i++) {
          const f = w.actor("foe", { home: 580, h: 88, hp: 48 });
          f.x = 210 + i * 46; f.hp = 12 * (1 + i % 4); w.foes.push(f);
        }
        w.hero = w.actor("hero", { home: 80, h: 124 });
        w.delay = 0;
      },
      fire(w) {
        const h = w.hero, y = G - 56;
        w.delay = 0;
        w.emit("crack", h.x + 34, y, 520);
        const hits = w.foes.filter(f => f.alive && !f.flying && f.x < 540).sort((a, b) => a.x - b.x);
        hits.forEach((f, i) => w.after((f.x - h.x) * w.delay, () => {
          if (!f.alive) return;
          f.hp -= 12; w.emit("hit", f, i, y);
          if (f.hp <= 0) w.kill(f);
        }));
      },
      update(w, dt) {
        const fs = w.foes.filter(f => f.alive && !f.flying).sort((a, b) => a.x - b.x);
        let min = 190;
        for (const f of fs) { f.x = Math.max(min, f.x - dt * 90); min = f.x + 44; }
      },
      steps: [
        {
          id: "arc", name: { en: "Whip Line", ko: "채찍 선" }, param: "wave 520px",
          cap: { en: "Draw the whip as a *wave* that snaps flat.", ko: "채찍을 *물결*로 그렸다가 쫙 펴요." },
          crack(w, x0, y, x1) {
            const pts = [];
            for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([t * (x1 - x0), Math.sin(t * 9) * 16 * t]); }
            w.spawn({ type: "crack", x: x0, y, pts, w: 5, life: 0.75, color: "255,240,200", add: true });
            w.spawn({ type: "slash", x: (x0 + x1) / 2, y: y + 4, ang: 0, len: (x1 - x0) / 2, size: 12, life: 0.3, color: "253,224,71" });
          },
        },
        {
          id: "sweep", name: { en: "Sweep Order", ko: "순서대로" }, param: "1600 px/s",
          cap: { en: "Hit *front to back*, as the tip travels.", ko: "끝이 지나가는 *순서대로* 맞아요." },
          crack(w) { w.delay = 1 / 1600; },
        },
        {
          id: "flash", name: { en: "Flash + Squash", ko: "번쩍 + 찌그러짐" }, param: "flash 1 · 0.8×",
          cap: { en: "Each body *flashes* and *buckles*.", ko: "맞은 몸마다 *번쩍*, *휘청*." },
          hit(w, f, i, y) { f.flash = 1; f.sx = 0.8; f.sy = 1.15; sparks(w, f.x - 20, y, 4, "255,240,200", [150, 380], -0.8, 0.8); },
        },
        {
          id: "knock", name: { en: "Knock + Launch", ko: "밀림 + 날림" }, param: "+34px · fly on kill",
          cap: { en: "Push each one back. Kills *fly*.", ko: "하나씩 밀리고, 죽으면 *날아가요*." },
          hit(w, f) { f.ox += 34; f.vib = 5; },
          kill(w, f) { w.fly(f, rand(300, 520), rand(-700, -480), rand(8, 14)); },
        },
        {
          id: "stop", name: { en: "Micro Stop", ko: "아주 짧은 멈칫" }, param: "60ms on 1st hit",
          cap: { en: "Freeze *once*, on the first hit only.", ko: "*첫 타*에만 한 번 멈칫." },
          hit(w, f, i) { if (i === 0) { w.hitstop(0.06); w.shake(0.2, 1); } },
        },
        {
          id: "tip", name: { en: "Tip Crack", ko: "끝의 딱" }, param: "star + ring @ tip",
          cap: { en: "A *crack* of light at the very tip.", ko: "채찍 *끝*에서 빛이 딱." },
          crack(w, x0, y, x1) {
            w.spawn({ type: "star", x: x1 - 10, y: y + 14, size: 40, life: 0.14, color: "255,255,255" });
            w.spawn({ type: "ring", x: x1 - 10, y: y + 14, size: 6, size1: 46, life: 0.22, w: 5, color: "253,224,71" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "snap + hits",
          cap: { en: "A sharp *snap*, then quick *thwacks*.", ko: "날카로운 *짝*, 이어서 *퍽퍽퍽*." },
          crack(w) { w.play(() => { nz({ type: "highpass", f: 2500, dur: 0.05, vol: 0.5 }); tn({ type: "square", f: 1800, f2: 400, dur: 0.04, vol: 0.12 }); }); },
          hit(w) { if (once(w, "whip", 0.04)) w.sfx.slashHit(); },
        },
      ],
    },

    /* 9 ─ 한꺼번에 말고 차례로 죽기 (옆에서) */
    {
      id: "horde-stagger", cat: "horde", view: "side",
      title: { en: "Don't kill them *all at once*", ko: "한꺼번에 말고 *차례로* 쓰러뜨리기" },
      intro: { en: "Nine die on the *same frame*. Flat.", ko: "아홉이 *같은 프레임*에 사라져요. 밋밋." },
      interval: 1.8, stepDur: 3.8,
      setup(w) {
        w.foes = [];
        const xs = [200, 240, 285, 320, 360, 400, 435, 470, 505];
        xs.forEach((x, i) => {
          const f = w.actor("foe", { home: x, h: 80, gy: G - 14 + (i % 3) * 12, hp: 1 });
          w.foes.push(f);
        });
        w.foes.sort((a, b) => a.gy - b.gy);
        w.hero = w.actor("hero", { home: 80, h: 124 });
        w.gap = 0; w.hold = 0;
      },
      fire(w) {
        const h = w.hero; h.sx = 0.9; h.sy = 1.1;
        w.gap = 0; w.emit("cast", h);
        const fs = w.foes.filter(f => f.alive).sort((a, b) => a.x - b.x);
        fs.forEach((f, i) => w.after(i * w.gap, () => {
          w.hold = 0;
          w.emit("doom", f, i);
          w.after(w.hold, () => w.kill(f));
        }));
      },
      steps: [
        {
          id: "stagger", name: { en: "Stagger", ko: "시간차" }, param: "70ms apart",
          cap: { en: "Space the deaths *70ms apart*. A ripple, not a cut.", ko: "*0.07초*씩 차이를 둬요. 뚝 끊기지 않고 물결처럼." },
          cast(w) { w.gap = 0.07; },
        },
        {
          id: "hold", name: { en: "Death Flash", ko: "죽기 전 번쩍" }, param: "hold 100ms",
          cap: { en: "Flash and *tremble* a beat *before* they go.", ko: "사라지기 *직전*에 번쩍, *부르르*." },
          doom(w, f) { f.flash = 1.5; f.vib = 6; w.hold = 0.1; },
        },
        {
          id: "launch", name: { en: "Launch", ko: "날려 보내기" }, param: "random arc + spin",
          cap: { en: "Send each one *flying*, all a bit different.", ko: "하나하나 *다르게* 날려요." },
          kill(w, f) { w.fly(f, rand(-120, 420), rand(-820, -480), rand(-14, 14)); },
        },
        {
          id: "puff", name: { en: "Puff", ko: "펑" }, param: "ring + 6 sparks",
          cap: { en: "A little *puff* marks each death.", ko: "쓰러질 때마다 작은 *펑*." },
          kill(w, f) {
            w.spawn({ type: "ring", x: f.x, y: f.gy - 40, size: 8, size1: 50, life: 0.25, w: 6, color: "255,255,255" });
            burst(w, f.x, f.gy - 40, 6, "190,242,100");
          },
        },
        {
          id: "shake", name: { en: "Rolling Shake", ko: "구르는 흔들림" }, param: ".08 per death",
          cap: { en: "A *small shake per death*. It rolls like drums.", ko: "죽을 때마다 *작게* 흔들. 북처럼 굴러가요." },
          kill(w) { w.shake(0.09); },
        },
        {
          id: "sound", name: { en: "Rising Pops", ko: "올라가는 펑" }, param: "+2 semitones each",
          cap: { en: "Each pop a little *higher*. *Pa-pa-pa-pam!*", ko: "펑마다 조금씩 *높게*. *파파파팡!*" },
          doom(w, f, i) { w.play(() => tn({ type: "triangle", f: 330 * Math.pow(2, i * 2 / 12), f2: 160, dur: 0.12, vol: 0.3 })); },
        },
      ],
    },

    /* 10 ─ 데미지 숫자 합치기 */
    {
      id: "horde-dmg-merge", cat: "horde", view: "top",
      title: { en: "Merge damage numbers, *not spam*", ko: "데미지 숫자는 *모아서* 보여주기" },
      intro: { en: "A blizzard of *tiny numbers*.", ko: "작은 숫자가 *눈보라*처럼 쏟아져요." },
      interval: 0.12, stepDur: 3.6,
      drawFloor: arena,
      setup(w) { mob(w, 22, { hp: 999, sp: 26 }); },
      fire(w) {
        const pool = nearest(w, 6);
        for (let k = 0; k < 3 && pool.length; k++) {
          const f = pool.splice((Math.random() * pool.length) | 0, 1)[0];
          const crit = Math.random() < 0.12, d = ((rand(3, 9)) | 0) * (crit ? 3 : 1);
          f.merged = false;
          sparks(w, f.x, f.gy, 2, "255,240,200", [80, 200]);
          w.emit("hit", f, d, crit);
          if (!f.merged) f.num = w.spawn({ type: "text", text: String(d), sum: d, x: f.x + rand(-14, 14), y: f.gy - 16, vy: -60, life: 0.7, size: 14, color: "#ffffff" });
        }
      },
      update(w, dt) { chase(w, dt, { r: 46 }); },
      steps: [
        {
          id: "merge", name: { en: "Sum per Target", ko: "대상별로 합치기" }, param: "window 0.4s",
          cap: { en: "Hits on the same enemy *add up* into one number.", ko: "같은 적의 피해는 *하나로 더해요*." },
          hit(w, f, d, crit) {
            const n = f.num;
            if (crit || !n || n.age > 0.4) return;
            n.sum += d; n.text = String(n.sum); n.age = 0.06; f.merged = true;
          },
        },
        {
          id: "size", name: { en: "Size by Total", ko: "합만큼 크게" }, param: "14 → 34px",
          cap: { en: "The bigger the total, the *bigger* the number.", ko: "합이 클수록 숫자도 *커져요*." },
          hit(w, f) { const n = f.num; if (n) n.size = Math.min(34, 14 + n.sum / 5); },
        },
        {
          id: "tier", name: { en: "Color Tiers", ko: "단계별 색" }, param: "25 / 60",
          cap: { en: "*White → yellow → orange* as it climbs.", ko: "커질수록 *하양 → 노랑 → 주황*." },
          hit(w, f) { const n = f.num; if (n) n.color = n.sum > 60 ? "#fb923c" : n.sum > 25 ? "#fde047" : "#ffffff"; },
        },
        {
          id: "anchor", name: { en: "Stick to Target", ko: "적에게 붙이기" }, param: "follow foe",
          cap: { en: "Pin each number *above its enemy*.", ko: "숫자를 *그 적 머리 위*에 붙여요." },
          update(w) { for (const f of w.foes) if (f.num && f.num.age < f.num.life) { f.num.x = f.x; f.num.y = f.gy - 24; } },
        },
        {
          id: "crit", name: { en: "Crits Stand Apart", ko: "치명타는 따로" }, param: "red · 30px · hop",
          cap: { en: "Crits *never merge*. Red, big, and they *hop*.", ko: "치명타는 *안 합쳐요*. 빨갛고 크게, *통*." },
          hit(w, f, d, crit) {
            if (!crit) return;
            w.spawn({ type: "text", text: d + "!", x: f.x + 22, y: f.gy - 30, vx: 60, vy: -260, g: 700, life: 0.8, size: 30, color: "#f43f5e" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick ≤ 15/s",
          cap: { en: "*Limit* how often the hit sound plays.", ko: "타격음은 *횟수를 제한*해요." },
          hit(w, f, d, crit) { if (crit) w.sfx.crit(); else if (once(w, "t", 0.07)) w.sfx.tick(); },
        },
      ],
    },

    /* 11 ─ 바닥에 쌓이는 흔적 */
    {
      id: "horde-carpet", cat: "horde", view: "top",
      title: { en: "Let the battlefield *remember*", ko: "전장에 *흔적*이 쌓이게" },
      intro: { en: "Hundreds died here. Floor's *spotless*.", ko: "수백이 쓰러졌는데 바닥이 *깨끗해요*." },
      interval: 0.4, stepDur: 3.8,
      drawFloor(w, ctx) {
        arena(w, ctx);
        for (const s of w.stains) {
          ctx.save(); ctx.globalAlpha = s.a; ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.scale(1, s.sq);
          ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, TAU); ctx.fill();
          ctx.restore();
        }
      },
      setup(w) { mob(w, 28, { hp: 1, sp: 44 }); w.stains = []; },
      fire(w) {
        for (const f of nearest(w, 2)) {
          const a = ang(f, w.hero.x, w.hero.gy);
          burst(w, f.x, f.gy, 3, "255,255,255");
          die(w, f, rand(0, 0.5));
          w.emit("splat", f.x, f.gy, a);
          if (w.stains.length > 220) w.stains.splice(0, w.stains.length - 220);
        }
      },
      update(w, dt) {
        const h = w.hero, t = w.time * 0.45;
        h.x = HX + Math.cos(t) * 130; h.gy = HY + Math.sin(t * 2) * 60; h.rot = t + Math.PI / 2;
        chase(w, dt, { r: 44 });
      },
      steps: [
        {
          id: "pool", name: { en: "Pool", ko: "웅덩이" }, param: "r 14–20 · stays",
          cap: { en: "Leave a *pool* where each one fell.", ko: "쓰러진 자리마다 *웅덩이*." },
          splat(w, x, y) { w.stains.push({ x, y, r: rand(14, 20), rot: 0, sq: 1, a: 0.75, col: "#1f4a1a" }); },
        },
        {
          id: "spray", name: { en: "Directional Spray", ko: "튄 방향" }, param: "6 drops away",
          cap: { en: "Spray drops *away from the hit*.", ko: "맞은 *반대쪽으로* 방울이 튀어요." },
          splat(w, x, y, a) {
            for (let i = 0; i < 6; i++) {
              const d = rand(14, 50), b = a + rand(-0.4, 0.4);
              w.stains.push({ x: x + Math.cos(b) * d, y: y + Math.sin(b) * d, r: rand(2, 5), rot: b, sq: 0.6, a: 0.8, col: "#2d6a24" });
            }
          },
        },
        {
          id: "variety", name: { en: "Variety", ko: "제각각" }, param: "shade · shape · angle",
          cap: { en: "Vary *shade, shape, angle*. No stamps.", ko: "*색·모양·각도*를 섞어요. 도장 찍은 티 안 나게." },
          splat(w) {
            const s = w.stains[w.stains.length - 7] || w.stains[0];
            if (!s) return;
            s.col = pick(["#1f4a1a", "#2c5d1f", "#163812", "#3b5e17"]); s.sq = rand(0.55, 1); s.rot = rand(0, TAU); s.r *= rand(0.9, 1.5);
          },
        },
        {
          id: "bits", name: { en: "Bits Stay", ko: "남는 조각" }, param: "2 chunks",
          cap: { en: "Scatter a few *bits* that never leave.", ko: "*조각* 몇 개는 계속 남겨요." },
          splat(w, x, y, a) {
            for (let i = 0; i < 2; i++) w.stains.push({ x: x + rand(-18, 18), y: y + rand(-18, 18), r: rand(2.5, 4), rot: 0, sq: 0.5, a: 1, col: "#d6d3c4" });
          },
        },
        {
          id: "fade", name: { en: "Fade the Oldest", ko: "오래된 건 흐리게" }, param: "max 220",
          cap: { en: "*Cap* the count. Old marks *fade* first.", ko: "개수는 *제한*하고, 오래된 건 *흐려져요*." },
          update(w, dt) { w.stains.forEach((s, i) => { if (i < 80) s.a = Math.max(0.2, s.a - dt * 0.1); }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "wet squish",
          cap: { en: "A short, *wet squish*.", ko: "짧고 *축축한* 철퍽." },
          splat(w) { if (once(w, "sq", 0.08)) w.play(() => nz({ type: "lowpass", f: 900, f2: 200, dur: 0.12, vol: 0.35 })); },
        },
      ],
    },

    /* 12 ─ 레벨업: 멈추고 카드 세 장 */
    {
      id: "horde-levelup", cat: "horde", view: "top",
      title: { en: "Make a level-up *stop the world*", ko: "레벨업은 *세상을 멈추고*" },
      intro: { en: "Cards appear. Enemies *keep biting*.", ko: "카드가 떴는데 적은 *계속 와요*." },
      interval: 2.8, stepDur: 4.2,
      drawFloor: arena,
      setup(w) {
        mob(w, 30, { hp: 1, sp: 46 });
        w.lv = { n: 4, cards: null, a: 0 }; w.atk = 0;
      },
      fire(w) {
        if (w.lv.cards) return;
        const L = w.lv; L.n++;
        const names = ["SPEED", "BLADE", "MAGNET"], cols = ["56,189,248", "253,224,71", "192,132,252"];
        L.cards = names.map((name, i) => ({ name, col: cols[i], x: 145 + i * 125, y: 182, sc: 1, a: 1 }));
        L.a = 1;
        w.emit("levelup", L, w.hero);
        w.after(1.5, () => { w.emit("pick", L.cards[1], L.cards); });
        w.after(1.95, () => { L.cards = null; L.a = 0; w.frozen = false; });
      },
      update(w, dt) {
        chase(w, dt, { r: 38 });
        if (w.frozen) return;
        if ((w.atk -= dt) <= 0) {
          w.atk = 0.3;
          const f = nearest(w, 1)[0];
          if (f && dist(f, w.hero.x, w.hero.gy) < 80) { burst(w, f.x, f.gy, 3, "255,255,255"); die(w, f, rand(0, 0.6)); }
        }
      },
      drawHud(w, ctx) {
        const L = w.lv; if (!L.cards) return;
        w.emit("drawUnder", ctx, L);
        for (const c of L.cards) {
          ctx.save(); ctx.globalAlpha = c.a; ctx.translate(c.x, c.y); ctx.scale(c.sc, c.sc);
          rr(ctx, -52, -72, 104, 144, 10, "rgba(24,26,34,0.96)", c.rare ? "#fde047" : "rgba(255,255,255,0.35)", c.rare ? 4 : 2);
          glow(ctx, 0, -18, 30, c.col, 0.7);
          ctx.fillStyle = `rgb(${c.col})`; ctx.beginPath(); ctx.arc(0, -18, 15, 0, TAU); ctx.fill();
          txt(ctx, c.name, 0, 36, 15, "#fff");
          ctx.restore();
        }
        w.emit("drawOver", ctx, L);
      },
      steps: [
        {
          id: "pause", name: { en: "Freeze the Fight", ko: "싸움 멈추기" }, param: "enemies stop",
          cap: { en: "Choosing takes time. *Freeze* the horde.", ko: "고를 시간을 줘요. 적을 *멈춰요*." },
          levelup(w) { w.frozen = true; },
        },
        {
          id: "dim", name: { en: "Dim Behind", ko: "뒤는 어둡게" }, param: "black 55%",
          cap: { en: "*Dim* the world so the cards *pop*.", ko: "뒤를 *어둡게*, 카드는 *또렷하게*." },
          drawUnder(w, ctx, L) { ctx.fillStyle = `rgba(5,6,10,${0.6 * L.a})`; ctx.fillRect(0, 0, 540, 360); },
        },
        {
          id: "burst", name: { en: "Level-up Burst", ko: "레벨업 번쩍" }, param: "rays + ring",
          cap: { en: "*Celebrate* on the hero first.", ko: "먼저 주인공에서 *축하* 한 번." },
          levelup(w, L, h) {
            w.spawn({ type: "rays", x: h.x, y: h.gy, size: 150, life: 0.9, n: 12, vr: 1.5, color: "253,224,71" });
            w.spawn({ type: "ring", x: h.x, y: h.gy, size: 20, size1: 140, life: 0.45, w: 10, color: "253,224,71" });
          },
          drawOver(w, ctx, L) { txt(ctx, "LEVEL " + L.n, 270, 72, 30, "#fde047"); },
        },
        {
          id: "slide", name: { en: "Deal the Cards", ko: "카드 돌리기" }, param: "80ms apart · back",
          cap: { en: "*Deal* them in one by one, with a bounce.", ko: "한 장씩 *착착*, 통 튀며 들어와요." },
          levelup(w, L) {
            L.cards.forEach((c, i) => {
              c.y = 460; c.sc = 0.6;
              w.after(i * 0.08, () => w.tween(c, { y: 182, sc: 1 }, 0.34, "back"));
            });
          },
        },
        {
          id: "rare", name: { en: "Rare Shine", ko: "희귀 카드 반짝" }, param: "gold border",
          cap: { en: "A *rare* card gets a gold edge.", ko: "*희귀* 카드는 금테를 둘러요." },
          levelup(w, L) { const c = L.cards[1]; c.rare = true; w.after(0.4, () => w.spawn({ type: "star", x: c.x + 36, y: c.y - 56, size: 22, life: 0.5, color: "255,255,255" })); },
        },
        {
          id: "pick", name: { en: "Pick Feedback", ko: "고른 느낌" }, param: "chosen ×1.15",
          cap: { en: "The pick *grows*. The others *drop away*.", ko: "고른 건 *커지고*, 나머지는 *떨어져요*." },
          pick(w, c, all) {
            w.tween(c, { sc: 1.18 }, 0.15, "back");
            w.spawn({ type: "ring", x: c.x, y: c.y, size: 40, size1: 110, life: 0.35, w: 8, color: c.col });
            all.filter(o => o !== c).forEach(o => w.tween(o, { y: 470, a: 0 }, 0.35, "in"));
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "fanfare · chime",
          cap: { en: "A *fanfare* to open, a bright *chime* to pick.", ko: "열 때 *빰빠밤*, 고를 때 *띵*." },
          levelup(w) { w.sfx.fanfare(); },
          pick(w) { w.sfx.chime(4); },
        },
      ],
    },

    /* 13 ─ 무기 진화 */
    {
      id: "horde-evolve", cat: "horde", view: "top",
      title: { en: "Make a weapon evolution *an event*", ko: "무기 진화를 *사건*으로" },
      intro: { en: "Two knives became six. *Silently*.", ko: "칼 두 개가 여섯 개로. *조용히*." },
      interval: 2.8, stepDur: 4.2,
      drawFloor: arena,
      setup(w) { mob(w, 26, { hp: 1, sp: 30 }); w.wp = { lv: 0, a: 0, sc: 1 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true; w.wp.lv = 0;
        const evolve = () => {
          w.wp.lv = 1;
          w.emit("evolve", w.hero, w.wp);
          w.after(1.0, () => { w.busy = false; });
        };
        if (w.on("charge")) { w.emit("charge", w.hero); w.after(0.3, evolve); } else w.after(0.3, evolve);
      },
      update(w, dt) {
        chase(w, dt, { r: 60 });
        const p = w.wp, h = w.hero, n = p.lv ? 6 : 2, r = p.lv ? 66 : 48;
        p.a += dt * (p.lv ? 4.5 : 3);
        p.sc += (1 - p.sc) * Math.min(1, dt * 6);
        for (let i = 0; i < n; i++) {
          const a = p.a + i * TAU / n, x = h.x + Math.cos(a) * r, y = h.gy + Math.sin(a) * r;
          for (const f of w.foes) if (live(f) && dist(f, x, y) < 20) { burst(w, f.x, f.gy, 3, "224,242,254"); die(w, f, rand(0, 0.8)); }
        }
      },
      drawFront(w, ctx) {
        const p = w.wp, h = w.hero, n = p.lv ? 6 : 2, r = p.lv ? 66 : 48;
        for (let i = 0; i < n; i++) {
          const a = p.a + i * TAU / n, x = h.x + Math.cos(a) * r, y = h.gy + Math.sin(a) * r;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.scale(p.sc, p.sc);
          if (p.lv) { glow(ctx, 0, 0, 24, "103,232,249", 0.8); ctx.fillStyle = "#cffafe"; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, -10); ctx.lineTo(20, 0); ctx.lineTo(0, 5); ctx.fill(); }
          else { ctx.fillStyle = "#9ca3af"; ctx.fillRect(-9, -2.5, 18, 5); }
          ctx.restore();
        }
      },
      steps: [
        {
          id: "charge", name: { en: "Gather", ko: "모여드는 빛" }, param: "300ms · 16 sparks",
          cap: { en: "Light *gathers in*. Something's coming.", ko: "빛이 *모여들어요*. 뭔가 온다는 신호." },
          charge(w, h) {
            for (let i = 0; i < 16; i++) { const a = rand(0, TAU), d = rand(60, 120); w.spawn({ type: "spark", seek: true, x: h.x + Math.cos(a) * d, y: h.gy + Math.sin(a) * d, tx: h.x, ty: h.gy, life: 0.3, size: 3, color: "165,243,252" }); }
            h.vib = 4; h.vibFade = 12;
          },
        },
        {
          id: "flash", name: { en: "Flash", ko: "번쩍" }, param: "screen .7 · hero 2",
          cap: { en: "*Flash* the screen and the hero.", ko: "화면도 주인공도 *번쩍*." },
          evolve(w, h) { w.flash("207,250,254", 0.7); h.flash = 2; },
        },
        {
          id: "grow", name: { en: "Blades Grow In", ko: "칼날이 커지며 등장" }, param: "scale 2.2 → 1",
          cap: { en: "New blades *burst out big*, then settle.", ko: "새 칼날이 *크게 튀어나왔다가* 자리 잡아요." },
          evolve(w, h, p) { p.sc = 2.2; },
        },
        {
          id: "rays", name: { en: "God Rays", ko: "후광" }, param: "12 rays · 1.2s",
          cap: { en: "*Rays* spin behind the hero.", ko: "주인공 뒤로 *후광*이 돌아요." },
          evolve(w, h) { w.spawn({ type: "rays", under: true, x: h.x, y: h.gy, size: 170, life: 1.2, n: 12, vr: 1.2, color: "103,232,249", hold: true }); },
        },
        {
          id: "wave", name: { en: "Shockwave", ko: "충격파" }, param: "ring + push 600",
          cap: { en: "The power *shoves the crowd* back.", ko: "새 힘이 *적들을 밀어내요*." },
          evolve(w, h) {
            w.spawn({ type: "ring", x: h.x, y: h.gy, size: 20, size1: 220, life: 0.45, w: 14, color: "165,243,252" });
            for (const f of w.foes) if (live(f)) push(f, ang(f, h.x, h.gy), 600);
            w.shake(0.4);
          },
        },
        {
          id: "name", name: { en: "Name Card", ko: "이름표" }, param: "hold 1.2s",
          cap: { en: "*Name* the new weapon. It deserves one.", ko: "새 무기에 *이름*을 붙여줘요." },
          evolve(w) {
            w.spawn({ type: "text", text: "EVOLVED", x: 270, y: 60, life: 1.3, size: 16, color: "#a5f3fc", hold: true });
            w.spawn({ type: "text", text: "STORM EDGE", x: 270, y: 86, life: 1.3, size: 32, color: "#ffffff", hold: true });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge · chime + boom",
          cap: { en: "Rising *charge*, then a *chime* on a *boom*.", ko: "올라가는 *위잉*, 그리고 *쿵* 위에 *띵*." },
          charge(w) { w.sfx.charge(); },
          evolve(w) { w.sfx.boom(); w.sfx.chime(7); },
        },
      ],
    },

    /* 14 ─ 자석: 맵 전체 보석 한 번에 */
    {
      id: "horde-magnet", cat: "horde", view: "top",
      title: { en: "Make the magnet pickup *a feast*", ko: "자석 아이템을 *잔치*로" },
      intro: { en: "Fifty gems. Gone in *one frame*.", ko: "보석 쉰 개가 *한 프레임*에 사라져요." },
      interval: 2.2, stepDur: 4.0,
      drawFloor: arena,
      setup(w) {
        mob(w, 18, { hp: 1, sp: 26 });
        w.gems = []; w.xp = { v: 0, shown: 0, bump: 0 }; w.pullSp = 0;
        for (let i = 0; i < 46; i++) w.gems.push({ x: rand(30, 510), y: rand(50, 330), c: pick([1, 1, 1, 2, 0]), v: 0, go: false, sc: 1 });
      },
      fire(w) {
        const h = w.hero;
        h.flash = 1;
        w.pullSp = 0;
        w.emit("magnet", h);
        for (const g of w.gems) { g.go = true; g.v = 0; g.side = Math.random() < 0.5 ? 1 : -1; }
        w.after(1.5, () => {
          for (let i = 0; i < 46; i++) w.gems.push({ x: rand(30, 510), y: rand(50, 330), c: pick([1, 1, 1, 2, 0]), v: 0, go: false, sc: 0 });
        });
      },
      update(w, dt) {
        chase(w, dt, { r: 70 });
        const h = w.hero, x = w.xp;
        x.bump = Math.max(0, x.bump - dt * 4);
        if (!w.on("roll")) x.shown = x.v;
        for (const g of w.gems) {
          g.sc += (1 - g.sc) * Math.min(1, dt * 8);
          if (!g.go || (g.wait -= dt) > 0) continue;
          const dx = h.x - g.x, dy = h.gy - g.y, d = Math.hypot(dx, dy) || 1;
          if (!w.pullSp || d < 14) { g.dead = true; x.v += 10; w.emit("absorb", g); continue; }
          g.v += w.pullSp * dt;
          const s = Math.min(d, g.v * dt), sw = (g.swirl || 0) * g.side;
          g.x += (dx / d - dy / d * sw) * s; g.y += (dy / d + dx / d * sw) * s;
          w.emit("move", g);
        }
        w.gems = w.gems.filter(g => !g.dead);
      },
      drawFront(w, ctx) { for (const g of w.gems) drawGem(ctx, g.c, g.x, g.y, 7 * g.sc); },
      drawHud(w, ctx) {
        const s = 1 + w.xp.bump * 0.4;
        ctx.save(); ctx.translate(270, 52); ctx.scale(s, s);
        txt(ctx, "XP " + Math.round(w.xp.shown), 0, 0, 22, w.xp.bump > 0.2 ? "#bae6fd" : "#ffffff");
        ctx.restore();
      },
      steps: [
        {
          id: "pull", name: { en: "Fly In", ko: "날아오기" }, param: "accel 1500 · near first",
          cap: { en: "Don't delete them. *Fly them in*, nearest first.", ko: "지우지 말고 *날아오게*. 가까운 것부터." },
          magnet(w, h) {
            w.pullSp = 1500;
            for (const g of w.gems) g.wait = Math.hypot(g.x - h.x, g.y - h.gy) / 700;
          },
        },
        {
          id: "swirl", name: { en: "Swirl", ko: "소용돌이" }, param: "curve 0.6",
          cap: { en: "Curve the paths into a *whirlpool*.", ko: "직선 말고 *소용돌이*처럼 휘어 들어와요." },
          magnet(w) { for (const g of w.gems) g.swirl = 0.6; },
        },
        {
          id: "streak", name: { en: "Streaks", ko: "빛줄기" }, param: "glow per gem",
          cap: { en: "Each gem draws a *streak* of light.", ko: "보석마다 *빛줄기*를 그어요." },
          move(w, g) { if (Math.random() < 0.6) w.spawn({ type: "glow", x: g.x, y: g.y, size: 8, size1: 0, life: 0.2, color: GEM_COL[g.c] }); },
        },
        {
          id: "glow", name: { en: "Swelling Glow", ko: "부풀어 오르는 빛" }, param: "ring per gem",
          cap: { en: "The hero *swells with light* as they pour in.", ko: "들어올수록 주인공이 *빛으로 부풀어요*." },
          absorb(w) {
            const h = w.hero; h.flash = 0.8; h.sx = h.sy = 1.15;
            w.spawn({ type: "glow", x: h.x, y: h.gy, size: 46, size1: 20, life: 0.2, color: "125,211,252" });
          },
        },
        {
          id: "roll", name: { en: "Rolling Counter", ko: "굴러가는 숫자" }, param: "lerp 6/s + bump",
          cap: { en: "The counter *rolls up* and *bumps*.", ko: "숫자는 *굴러 올라가고* 툭툭 튀어요." },
          update(w, dt) { const x = w.xp; x.shown += (x.v - x.shown) * Math.min(1, dt * 6); },
          absorb(w) { w.xp.bump = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "blips ≤ 25/s",
          cap: { en: "A *rain of tinks*, climbing in pitch.", ko: "*띵띵띵* 쏟아지며 음이 올라가요." },
          magnet(w) { w.sfx.magic(); },
          absorb(w) { if (once(w, "b", 0.04)) w.sfx.blip((w.xp.v / 10) % 16); },
        },
      ],
    },

    /* 15 ─ 떼 속 보스 경고 */
    {
      id: "horde-boss-warn", cat: "horde", view: "top",
      title: { en: "Warn about a boss *before* it arrives", ko: "보스는 오기 *전에* 경고하기" },
      intro: { en: "A giant just *walked in*. No warning.", ko: "거대한 놈이 *그냥* 걸어 들어와요." },
      interval: 3.2, stepDur: 4.2,
      drawFloor: arena,
      setup(w) {
        mob(w, 28, { hp: 1, sp: 30 });
        w.boss = w.actor("foeTop", { home: 700, gy: 170, h: 120 });
        w.warn = null;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const b = w.boss; b.x = 700;
        w.warn = { t: 0 };
        w.emit("warn", w.warn, b);
        w.after(1.3, () => { w.emit("bossIn", b); w.tween(b, { x: 430 }, 0.9, "out"); });
        w.after(2.9, () => { b.x = 700; w.warn = null; w.busy = false; });
      },
      update(w, dt) {
        chase(w, dt, { r: 40 });
        const b = w.boss; b.rot = Math.PI;
        if (w.warn) { w.warn.t += dt; w.emit("warning", w.warn, b, dt); }
      },
      drawBack(w, ctx) { const b = w.boss; if (b.x < 600) glow(ctx, b.x, b.gy, 90, "239,68,68", 0.35); },
      drawHud(w, ctx) { if (w.warn && w.warn.t < 1.6) w.emit("drawWarn", ctx, w.warn, w.boss); },
      steps: [
        {
          id: "arrow", name: { en: "Edge Arrow", ko: "가장자리 화살표" }, param: "pulse 6Hz",
          cap: { en: "Point to *where* it's coming from.", ko: "*어디서* 오는지 화살표로." },
          drawWarn(w, ctx, wn, b) {
            const s = 1 + 0.2 * Math.sin(wn.t * 38), x = 500, y = b.gy;
            ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
            glow(ctx, 0, 0, 40, "239,68,68", 0.6);
            ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -18); ctx.lineTo(-10, 18); ctx.fill();
            txt(ctx, "!", -26, 0, 22, "#fff");
            ctx.restore();
          },
        },
        {
          id: "banner", name: { en: "Warning Banner", ko: "경고 띠" }, param: "blink 4Hz",
          cap: { en: "A *blinking banner*. Nobody misses it.", ko: "*깜빡이는 띠*. 못 볼 수가 없어요." },
          drawWarn(w, ctx, wn) {
            if (Math.floor(wn.t * 8) % 2) return;
            ctx.fillStyle = "rgba(127,29,29,0.85)"; ctx.fillRect(140, 48, 260, 34);
            ctx.fillStyle = "#facc15";
            for (let i = 0; i < 14; i++) ctx.fillRect(140 + i * 20 - (wn.t * 60) % 20, 48, 8, 5), ctx.fillRect(140 + i * 20 + (wn.t * 60) % 20, 77, 8, 5);
            txt(ctx, "WARNING", 270, 66, 22, "#fef2f2");
          },
        },
        {
          id: "vignette", name: { en: "Red Edges", ko: "붉은 가장자리" }, param: "pulse .5",
          cap: { en: "Pulse the *screen edges* red.", ko: "*화면 가장자리*가 붉게 두근두근." },
          warning(w, wn) { if (wn.t < 1.6) w.vignette(0.3 + 0.25 * Math.sin(wn.t * 12)); },
        },
        {
          id: "flee", name: { en: "Crowd Flees", ko: "졸개들이 비킴" }, param: "push away 220",
          cap: { en: "Even the *small fry* get out of the way.", ko: "*졸개들*도 슬금슬금 길을 비켜요." },
          warn(w, wn, b) { for (const f of w.foes) if (live(f) && f.x > 300) push(f, Math.PI + rand(-0.6, 0.6), 220 * (f.x - 280) / 240); },
        },
        {
          id: "rumble", name: { en: "Rumble", ko: "땅울림" }, param: "trauma .15 → .6",
          cap: { en: "A *rumble* that grows. Then *BOOM*.", ko: "점점 커지는 *땅울림*, 그리고 *쿵*." },
          warning(w, wn) { if (wn.t < 1.3) w.trauma = Math.max(w.trauma, 0.12 + wn.t * 0.2); },
          bossIn(w, b) { w.shake(0.6, -1); w.spawn({ type: "ring", x: 470, y: b.gy, size: 30, size1: 160, life: 0.5, w: 10, color: "239,68,68" }); },
        },
        {
          id: "sound", name: { en: "Siren", ko: "사이렌" }, param: "2 wails · boom",
          cap: { en: "A *siren* first. A *boom* when it lands.", ko: "먼저 *사이렌*, 도착하면 *쿵*." },
          warn(w) { w.play(() => { for (let i = 0; i < 2; i++) tn({ type: "sawtooth", f: 520, f2: 880, dur: 0.5, vol: 0.08, delay: i * 0.6 }); }); },
          bossIn(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 16 ─ 엘리트 적 테두리 */
    {
      id: "horde-elite", cat: "horde", view: "top",
      title: { en: "Make elites *pop out* of the crowd", ko: "엘리트를 무리 속에서 *튀게*" },
      intro: { en: "Three of these are elites. *Which?*", ko: "이 중 셋이 엘리트예요. *어느 거?*" },
      interval: 0.45, stepDur: 3.6,
      drawFloor: arena,
      setup(w) {
        mob(w, 30, { hp: 1, sp: 34 });
        w.elites = w.foes.slice(0, 3);
        w.elites.forEach(f => { f.elite = true; f.maxHp = f.hp = 8; f.sp *= 0.7; });
      },
      fire(w) {
        const h = w.hero;
        const n = nearest(w, 8).find(f => !f.elite);
        if (n) { burst(w, n.x, n.gy, 3, "255,255,255"); die(w, n, rand(0, 0.6)); }
        const e = w.elites.filter(live).sort((a, b) => dist(a, h.x, h.gy) - dist(b, h.x, h.gy))[0];
        if (e) { e.hp -= 1; e.flash = 0.6; if (e.hp <= 0) die(w, e, 0.6); }
      },
      update(w, dt) { chase(w, dt, { r: 46 }); },
      drawBack(w, ctx) { for (const f of w.elites) if (live(f)) w.emit("drawElite", ctx, f); },
      drawFront(w, ctx) { for (const f of w.elites) if (live(f)) w.emit("drawEliteTop", ctx, f); },
      steps: [
        {
          id: "outline", name: { en: "Outline", ko: "테두리" }, param: "orange 1.3×",
          cap: { en: "A thick *colored outline*. Readable at a glance.", ko: "두꺼운 *색 테두리*. 한눈에 보여요." },
          drawElite(w, ctx, f) {
            const s = f.w * 1.3;
            ctx.save(); ctx.translate(f.x + f.ox, f.gy + f.oy); ctx.rotate(f.rot);
            ctx.drawImage(f.s.orange, -s / 2, -s / 2, s, s); ctx.restore();
          },
        },
        {
          id: "size", name: { en: "Bigger Body", ko: "더 큰 몸" }, param: "30 → 44px",
          cap: { en: "Make them *bigger*. Size reads as danger.", ko: "*더 크게*. 크기가 곧 위험이에요." },
          update(w) { for (const f of w.elites) f.w = f.h = 44; },
        },
        {
          id: "glow", name: { en: "Pulsing Glow", ko: "두근대는 빛" }, param: "3Hz under",
          cap: { en: "A *pulsing glow* underneath.", ko: "발밑에 *두근대는* 빛." },
          drawElite(w, ctx, f) { glow(ctx, f.x, f.gy, 44 + 8 * Math.sin(w.time * 18), "251,146,60", 0.55); },
        },
        {
          id: "embers", name: { en: "Rising Embers", ko: "피어오르는 불티" }, param: "~12/s each",
          cap: { en: "*Embers* drift off them, even when still.", ko: "가만히 있어도 *불티*가 피어올라요." },
          update(w, dt) {
            for (const f of w.elites) if (live(f) && Math.random() < dt * 12) w.spawn({ type: "glow", x: f.x + rand(-14, 14), y: f.gy + rand(-14, 14), vy: -50, size: 5, size1: 0, life: 0.6, color: "251,146,60" });
          },
        },
        {
          id: "bar", name: { en: "Own HP Bar", ko: "전용 체력바" }, param: "only elites",
          cap: { en: "*Only elites* get an HP bar.", ko: "체력바는 *엘리트만*." },
          drawEliteTop(w, ctx, f) {
            const y = f.gy < 90 ? f.gy + 30 : f.gy - 36;
            rr(ctx, f.x - 22, y, 44, 6, 3, "rgba(0,0,0,0.7)");
            rr(ctx, f.x - 22, y, 44 * f.hp / f.maxHp, 6, 3, "#fb923c");
          },
        },
        {
          id: "sound", name: { en: "Arrival Ping", ko: "등장 알림" }, param: "ring + low chime",
          cap: { en: "When one *spawns*, ping it. When it *dies*, boom.", ko: "*나타날 때* 알리고, *죽을 때* 쾅." },
          spawn(w, f) {
            if (!f.elite) return;
            w.spawn({ type: "ring", x: f.x, y: f.gy, size: 10, size1: 70, life: 0.4, w: 6, color: "251,146,60" });
            w.sfx.chime(-12);
          },
          kill(w, f) { if (f.elite) { w.sfx.crit(); w.shake(0.25); burst(w, f.x, f.gy, 14, "251,146,60"); } },
        },
      ],
    },

    /* 17 ─ 광폭화 */
    {
      id: "horde-frenzy", cat: "horde", view: "top",
      title: { en: "Make frenzy mode *feel unhinged*", ko: "광폭화를 *미친 듯이*" },
      intro: { en: "Frenzy is on. Feels like *Tuesday*.", ko: "광폭화 중인데… *평소랑 똑같아요*." },
      interval: 2.6, stepDur: 4.2,
      drawFloor: arena,
      setup(w) { mob(w, 34, { hp: 1, sp: 44 }); w.fz = 0; w.atk = 0; },
      fire(w) { w.fz = 1.8; w.emit("frenzy", w.hero); },
      update(w, dt) {
        chase(w, dt, { r: 40 });
        w.fz = Math.max(0, w.fz - dt);
        if ((w.atk -= dt) > 0) return;
        w.atk = w.fz > 0 ? 0.07 : 0.35;
        const f = nearest(w, 1)[0], h = w.hero; if (!f) return;
        h.rot = Math.atan2(f.gy - h.gy, f.x - h.x);
        w.spawn({ type: "slash", x: f.x, y: f.gy, ang: rand(-1.5, 1.5), len: 20, size: 4, life: 0.12, color: "255,255,255" });
        die(w, f, rand(0, 0.5));
        w.emit("slay", f);
      },
      drawBack(w, ctx) { if (w.fz > 0) w.emit("drawFz", ctx, w.hero, w.fz); },
      steps: [
        {
          id: "tint", name: { en: "Blood Tint", ko: "붉은 화면" }, param: "red 14% + edges",
          cap: { en: "*Tint the world* red while it lasts.", ko: "광폭화 동안 *세상이 붉어요*." },
          drawFz(w, ctx, h, t) { ctx.fillStyle = `rgba(239,68,68,${0.14 * Math.min(1, t * 3)})`; ctx.fillRect(0, 0, 540, 360); w.vignette(0.45); },
        },
        {
          id: "aura", name: { en: "Hero Aura", ko: "주인공 기운" }, param: "glow 60px · flicker",
          cap: { en: "The hero *burns* with a flickering aura.", ko: "주인공이 *이글이글* 타올라요." },
          drawFz(w, ctx, h) { glow(ctx, h.x, h.gy, 56 + rand(-6, 6), "251,113,60", 0.8); },
        },
        {
          id: "ghost", name: { en: "Afterimages", ko: "잔상" }, param: "every 50ms",
          cap: { en: "Leave *afterimages* as it moves.", ko: "움직일 때마다 *잔상*을 남겨요." },
          update(w) {
            const h = w.hero; if (w.fz <= 0 || !once(w, "gh", 0.05)) return;
            w.spawn({ type: "ghost", img: h.s.red, x: h.x + rand(-6, 6), y: h.gy + rand(-6, 6), w: h.w, h: h.h, top: true, rot: h.rot, life: 0.25, alpha0: 0.6 });
          },
        },
        {
          id: "zoom", name: { en: "Push In", ko: "화면 당기기" }, param: "zoom +6%",
          cap: { en: "*Push the camera in*. The world gets tight.", ko: "*화면을 당겨요*. 세상이 좁아져요." },
          frenzy(w) { w.zoomPunch(0.14); },
          update(w) { if (w.fz > 0) w.zoom = Math.max(w.zoom, 0.06); },
        },
        {
          id: "kills", name: { en: "Hot Kills", ko: "뜨거운 처치" }, param: "orange burst",
          cap: { en: "Kills burst *orange*, not white.", ko: "처치가 하얗지 않고 *주황*으로 터져요." },
          slay(w, f) {
            if (w.fz <= 0) return;
            w.spawn({ type: "star", x: f.x, y: f.gy, size: 26, life: 0.12, color: "253,186,116" });
            burst(w, f.x, f.gy, 4, "251,146,60");
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "roar + fast hits",
          cap: { en: "A *roar* in, then *rapid* little hits.", ko: "시작은 *우오오*, 이어서 *다다다닥*." },
          frenzy(w) { w.sfx.boost(); },
          slay(w) { if (w.fz > 0) w.sfx.slashHit(); },
        },
      ],
    },

    /* 18 ─ 회전 회오리 */
    {
      id: "horde-whirlwind", cat: "horde", view: "top",
      title: { en: "Make a spin attack *a blender*", ko: "회전 베기를 *믹서기*처럼" },
      intro: { en: "The hero twirls. Enemies *politely* die.", ko: "빙글 도는데 적이 *얌전히* 죽어요." },
      interval: 1.8, stepDur: 3.8,
      drawFloor: arena,
      setup(w) { mob(w, 32, { hp: 3, sp: 52 }); w.spin = 0; w.tk = 0; },
      fire(w) { w.spin = 1.3; w.emit("spinStart", w.hero); },
      update(w, dt) {
        chase(w, dt, { r: 30 });
        const h = w.hero;
        if (w.spin <= 0) return;
        w.spin -= dt; h.rot += dt * 22;
        w.emit("spinning", h, dt);
        if ((w.tk -= dt) > 0) return;
        w.tk = 0.12;
        for (const f of w.foes) {
          if (!live(f) || dist(f, h.x, h.gy) > 84) continue;
          f.hp -= 1; w.emit("hit", f, ang(f, h.x, h.gy));
          if (f.hp <= 0) die(w, f, rand(0.2, 0.8));
        }
      },
      steps: [
        {
          id: "blur", name: { en: "Spin Blur", ko: "회전 잔상" }, param: "arc / frame",
          cap: { en: "Smear the blade into *spinning arcs*.", ko: "칼날을 *도는 곡선*으로 번지게." },
          spinning(w, h) {
            const a = h.rot;
            w.spawn({ type: "arc", x: h.x, y: h.gy, size: 62, life: 0.12, a0: a - 1.4, a1: a, color: "255,255,255" });
          },
        },
        {
          id: "wind", name: { en: "Wind Ring", ko: "바람 고리" }, param: "dust swirl",
          cap: { en: "*Dust* swirls around the spin.", ko: "주위로 *먼지*가 휘감겨요." },
          spinning(w, h) {
            if (Math.random() > 0.5) return;
            const a = rand(0, TAU), r = rand(60, 90);
            w.spawn({ type: "smoke", x: h.x + Math.cos(a) * r, y: h.gy + Math.sin(a) * r, vx: -Math.sin(a) * 260, vy: Math.cos(a) * 260, drag: 3, size: 5, size1: 14, life: 0.45, color: "200,195,185" });
          },
        },
        {
          id: "hit", name: { en: "Hit Flash", ko: "타격 번쩍" }, param: "flash + 2 sparks",
          cap: { en: "Every tick *flashes* what it touches.", ko: "닿을 때마다 *번쩍*." },
          hit(w, f, a) { f.flash = 1; sparks(w, f.x, f.gy, 2, "255,255,255", [150, 350], a + 1, a + 2); },
        },
        {
          id: "fling", name: { en: "Fling", ko: "튕겨내기" }, param: "tangent 300",
          cap: { en: "Fling them *sideways*, along the spin.", ko: "도는 *방향으로* 휙 튕겨요." },
          hit(w, f, a) { push(f, a + 1.2, 300); },
        },
        {
          id: "shake", name: { en: "Steady Rumble", ko: "꾸준한 진동" }, param: "trauma ≥ .18",
          cap: { en: "Hold a *low rumble* while spinning.", ko: "도는 동안 *낮게* 계속 떨려요." },
          spinning(w) { w.trauma = Math.max(w.trauma, 0.18); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish / 0.12s",
          cap: { en: "A *swish* each turn. *Whum-whum-whum.*", ko: "돌 때마다 *휙휙휙*." },
          spinning(w) { if (once(w, "sw", 0.12)) w.sfx.swish(); },
          hit(w) { if (once(w, "h", 0.06)) w.sfx.tick(); },
        },
      ],
    },

    /* 19 ─ 내려찍기 범위 공격 (옆에서) */
    {
      id: "horde-slam", cat: "horde", view: "side",
      title: { en: "Make a ground slam *hit the floor*", ko: "내려찍기가 *바닥을 울리게*" },
      intro: { en: "Hop, land… enemies *blink out*.", ko: "콩 뛰고 착지… 적이 *쓱 사라져요*." },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        w.foes = [];
        for (let i = 0; i < 10; i++) {
          const L = i < 5, f = w.actor("foe", { home: L ? -60 : 600, h: 74, hp: 1, flip: L });
          f.side = L ? -1 : 1; f.x = 270 + f.side * (70 + (i % 5) * 42 + rand(0, 10));
          w.foes.push(f);
        }
        w.hero = w.actor("hero", { home: 270, h: 120 });
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero;
        w.emit("jump", h);
        w.tween(h, { oy: -130 }, 0.26, "out", () => w.tween(h, { oy: 0 }, 0.09, "in", () => {
          w.emit("slam", h.x);
          for (const f of w.foes) {
            const d = Math.abs(f.x - h.x);
            if (!f.alive || f.flying || d > 240) continue;
            w.emit("hit", f, d, f.side);
            if (d < 170) w.kill(f);
          }
          w.after(0.25, () => { w.busy = false; });
        }));
      },
      update(w, dt) {
        for (const s of [-1, 1]) {
          const fs = w.foes.filter(f => f.side === s && f.alive && !f.flying).sort((a, b) => s * (a.x - b.x));
          let lim = 270 + s * 62;
          for (const f of fs) { f.x = s < 0 ? Math.min(lim, f.x + dt * 80) : Math.max(lim, f.x - dt * 80); lim = f.x + s * 38; }
        }
      },
      steps: [
        {
          id: "squash", name: { en: "Squash & Stretch", ko: "늘었다 찌그러졌다" }, param: "1.2/0.8 → 1.4/0.65",
          cap: { en: "*Crouch* to jump, *flatten* on landing.", ko: "뛸 땐 *움츠리고*, 내릴 땐 *납작*." },
          jump(w, h) { h.sx = 0.8; h.sy = 1.25; },
          slam(w) { const h = w.hero; h.sx = 1.45; h.sy = 0.62; },
        },
        {
          id: "wave", name: { en: "Shockwave", ko: "충격파" }, param: "flat ring 240px",
          cap: { en: "A ring races out *along the floor*.", ko: "고리가 *바닥을 타고* 퍼져요." },
          slam(w, x) {
            w.spawn({ type: "ring", flat: true, x, y: G, size: 20, size1: 240, life: 0.4, w: 12, color: "255,236,200" });
            w.spawn({ type: "glow", x, y: G - 10, size: 90, size1: 30, life: 0.25, color: "255,220,150" });
            dust(w, x - 40, G, 6, -1); dust(w, x + 40, G, 6, 1);
          },
        },
        {
          id: "launch", name: { en: "Launch", ko: "띄우기" }, param: "up 500–800 · spin",
          cap: { en: "Kills go *up and out*. Survivors *stagger*.", ko: "죽은 건 *위로 펑*, 산 건 *휘청*." },
          hit(w, f, d, s) { f.ox += s * 50; f.flash = 1; },
          kill(w, f) { w.fly(f, f.side * rand(200, 420), rand(-820, -520), f.side * rand(8, 14)); },
        },
        {
          id: "stop", name: { en: "Stop + Shake", ko: "멈칫 + 흔들림" }, param: "80ms · trauma .6",
          cap: { en: "Freeze on impact, then *shake hard*.", ko: "닿는 순간 멈칫, 그리고 *크게* 흔들." },
          slam(w) { w.hitstop(0.08); w.shake(0.6); },
        },
        {
          id: "cracks", name: { en: "Ground Cracks", ko: "땅 갈라짐" }, param: "6 cracks · 1.5s",
          cap: { en: "*Crack* the ground. Leave it there a while.", ko: "땅을 *쩍* 가르고, 한동안 남겨요." },
          slam(w, x) {
            for (let i = 0; i < 6; i++) {
              const s = i % 2 ? 1 : -1, pts = [[0, 0]];
              for (let k = 1; k < 5; k++) pts.push([s * k * rand(14, 24), rand(-2, 10)]);
              w.spawn({ type: "crack", x, y: G + 2, pts, w: 3, life: 1.5, hold: true, color: "20,16,12", add: false });
            }
          },
        },
        {
          id: "debris", name: { en: "Debris", ko: "파편" }, param: "14 chunks",
          cap: { en: "Throw *rocks* up. Let them bounce.", ko: "*돌조각*이 튀어 오르고 통통." },
          slam(w, x) {
            for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: x + rand(-30, 30), y: G - 6, vx: rand(-380, 380), vy: rand(-620, -240), g: 1600, ground: true, bounce: 0.35, vr: rand(-18, 18), life: rand(1.2, 1.8), size: rand(4, 8), color: pick(["120,110,100", "90,84,76", "150,140,128"]), hold: true });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "jump · slam",
          cap: { en: "A light *hup*, then a *crushing* slam.", ko: "가벼운 *훕*, 그리고 *쾅!*" },
          jump(w) { w.sfx.jump(); },
          slam(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 20 ─ 무리를 꿰뚫는 연쇄 번개 */
    {
      id: "horde-chain-zap", cat: "horde", view: "top",
      title: { en: "Make chain lightning *jump*", ko: "연쇄 번개가 *튀어 다니게*" },
      intro: { en: "Eight die. You saw… *a line?*", ko: "여덟이 죽었는데… *선 하나?*" },
      interval: 1.0, stepDur: 3.6,
      drawFloor: arena,
      setup(w) { mob(w, 32, { hp: 1, sp: 34 }); w.gap = 0; w.hold = 0; },
      fire(w) {
        const h = w.hero, used = new Set(), path = [{ x: h.x, gy: h.gy }];
        let cur = path[0];
        for (let i = 0; i < 8; i++) {
          const n = w.foes.filter(f => live(f) && !used.has(f) && dist(f, cur.x, cur.gy) < 170).sort((a, b) => dist(a, cur.x, cur.gy) - dist(b, cur.x, cur.gy))[0];
          if (!n) break;
          used.add(n); path.push(n); cur = n;
        }
        w.gap = 0;
        w.emit("cast", h);
        path.slice(1).forEach((f, i) => w.after(i * w.gap, () => {
          const a = path[i];
          w.spawn({ type: "crack", x: a.x, y: a.gy, pts: [[0, 0], [f.x - a.x, f.gy - a.gy]], w: 1.5, life: 0.08, color: "200,230,255" });
          w.hold = 0;
          w.emit("zap", a, f, i);
          w.after(w.hold, () => die(w, f, rand(0.2, 0.8)));
        }));
      },
      update(w, dt) { chase(w, dt, { r: 50 }); },
      steps: [
        {
          id: "jagged", name: { en: "Jagged Bolt", ko: "지그재그 번개" }, param: "8 kinks · glow",
          cap: { en: "Lightning *zigzags*. Never a straight line.", ko: "번개는 *지그재그*. 직선이면 안 돼요." },
          zap(w, a, b) {
            const dx = b.x - a.x, dy = b.gy - a.gy, L = Math.hypot(dx, dy) || 1, pts = [[0, 0]];
            for (let k = 1; k < 8; k++) { const t = k / 8, j = rand(-14, 14); pts.push([dx * t - dy / L * j, dy * t + dx / L * j]); }
            pts.push([dx, dy]);
            w.spawn({ type: "crack", x: a.x, y: a.gy, pts, w: 7, life: 0.22, color: "103,232,249", add: true });
            w.spawn({ type: "crack", x: a.x, y: a.gy, pts, w: 2.5, life: 0.18, color: "255,255,255", add: true });
          },
        },
        {
          id: "hops", name: { en: "Hop by Hop", ko: "한 마리씩 튀기" }, param: "60ms per hop",
          cap: { en: "Let it *hop* one target at a time.", ko: "한 마리씩 *톡톡* 옮겨 가요." },
          cast(w) { w.gap = 0.06; },
        },
        {
          id: "nodes", name: { en: "Contact Nodes", ko: "닿는 점" }, param: "star + scorch",
          cap: { en: "A bright *node* where it touches. A *scorch* stays.", ko: "닿는 곳마다 *밝은 점*, 그을음은 *남겨요*." },
          zap(w, a, b) {
            w.spawn({ type: "star", x: b.x, y: b.gy, size: 26, life: 0.16, color: "207,250,254" });
            w.spawn({ type: "glow", x: b.x, y: b.gy, size: 40, size1: 10, life: 0.3, color: "103,232,249" });
            w.spawn({ type: "ellipse", under: true, round: true, x: b.x, y: b.gy, size: 22, life: 2.5, color: "8,47,73", alpha: 0.8, hold: true, add: false });
          },
        },
        {
          id: "stun", name: { en: "Shock Hold", ko: "감전 경직" }, param: "hold 150ms · vib",
          cap: { en: "They *jitter* a beat before dying.", ko: "죽기 전에 한 박자 *파르르*." },
          zap(w, a, b) { w.hold = 0.15; b.flash = 1.5; b.vib = 5; },
        },
        {
          id: "flash", name: { en: "Sky Flash", ko: "번개 빛" }, param: "cyan .25",
          cap: { en: "A faint *blue flash* over the screen.", ko: "화면이 살짝 *파랗게* 번쩍." },
          cast(w) { w.flash("165,243,252", 0.25); w.shake(0.15); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crackle per hop",
          cap: { en: "A *crackle* for every hop. *Tz-tz-tz!*", ko: "튈 때마다 *지직지직*." },
          zap(w, a, b, i) { w.play(() => { nz({ type: "highpass", f: 3000 + i * 300, dur: 0.06, vol: 0.35 }); tn({ type: "square", f: 90, dur: 0.05, vol: 0.08 }); }); },
        },
      ],
    },

    /* 21 ─ 독구름 */
    {
      id: "horde-poison", cat: "horde", view: "top",
      title: { en: "Make a poison cloud *look toxic*", ko: "독구름이 *독하게* 보이게" },
      intro: { en: "A purple circle. Pretty *harmless*-looking.", ko: "보라색 원 하나. *별로* 안 무서워요." },
      interval: 1.6, stepDur: 3.8,
      drawFloor: arena,
      setup(w) { mob(w, 32, { hp: 8, sp: 34 }); w.clouds = []; },
      fire(w) {
        const t = pick(nearest(w, 10)); if (!t) return;
        const c = { x: cl(t.x, 90, 450), y: cl(t.gy, 96, 280), r: 70, t: 0, life: 2.8, tk: 0 };
        w.clouds.push(c);
        w.emit("cloud", c);
      },
      update(w, dt) {
        chase(w, dt, { r: 40 });
        for (const c of w.clouds) {
          c.t += dt; w.emit("cloudFrame", c, dt);
          if ((c.tk -= dt) > 0) continue;
          c.tk = 0.35;
          for (const f of w.foes) {
            if (!live(f) || dist(f, c.x, c.y) > c.r) continue;
            f.hp -= 2; w.emit("tick", f, c);
            if (f.hp <= 0) die(w, f, rand(0.2, 0.8));
          }
        }
        w.clouds = w.clouds.filter(c => c.t < c.life);
      },
      drawBack(w, ctx) {
        for (const c of w.clouds) {
          const a = Math.min(1, (c.life - c.t) * 2);
          ctx.fillStyle = `rgba(168,85,247,${0.22 * a})`; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
          w.emit("drawCloud", ctx, c, a);
        }
      },
      steps: [
        {
          id: "billow", name: { en: "Billowing Smoke", ko: "뭉게뭉게 연기" }, param: "~18 puffs/s",
          cap: { en: "Fill it with *slow, rolling* smoke.", ko: "*느리게 굴러가는* 연기로 채워요." },
          cloudFrame(w, c, dt) {
            if (c.t > c.life - 0.5 || Math.random() > dt * 18) return;
            const a = rand(0, TAU), d = rand(0, c.r * 0.8);
            w.spawn({ type: "smoke", x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, vx: rand(-15, 15), vy: rand(-15, 15), size: rand(10, 16), size1: rand(26, 36), life: rand(1, 1.5), color: "147,51,234" });
          },
        },
        {
          id: "edge", name: { en: "Boiling Edge", ko: "끓는 테두리" }, param: "wobbly ring",
          cap: { en: "A *wobbly* edge shows exactly where it hurts.", ko: "*울렁이는* 테두리. 어디까지 아픈지 보여요." },
          drawCloud(w, ctx, c, a) {
            ctx.strokeStyle = `rgba(216,180,254,${0.7 * a})`; ctx.lineWidth = 2.5; ctx.beginPath();
            for (let i = 0; i <= 40; i++) { const t = i / 40 * TAU, r = c.r + 4 * Math.sin(t * 7 + w.time * 6); ctx.lineTo(c.x + Math.cos(t) * r, c.y + Math.sin(t) * r); }
            ctx.stroke();
          },
        },
        {
          id: "bubbles", name: { en: "Popping Bubbles", ko: "톡톡 거품" }, param: "~6 pops/s",
          cap: { en: "Little *bubbles* rise and *pop*.", ko: "작은 *거품*이 올라와 *톡*." },
          cloudFrame(w, c, dt) {
            if (Math.random() > dt * 6) return;
            const a = rand(0, TAU), d = rand(0, c.r * 0.7);
            w.spawn({ type: "ring", x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, size: 2, size1: 9, life: 0.35, w: 2, color: "233,213,255" });
          },
        },
        {
          id: "sick", name: { en: "Sick Flinch", ko: "중독 움찔" }, param: "tint .6 · 0.85×",
          cap: { en: "Every tick, victims *flush* and *shrink*.", ko: "독이 들 때마다 *붉어지고* 움츠러요." },
          tick(w, f) { f.tint = 0.6; f.sx = f.sy = 0.85; },
        },
        {
          id: "numbers", name: { en: "Poison Numbers", ko: "독 숫자" }, param: "purple 15px",
          cap: { en: "*Purple* numbers. You know it's poison.", ko: "*보라색* 숫자. 독인 줄 바로 알아요." },
          tick(w, f) { w.spawn({ type: "text", text: "2", x: f.x + rand(-8, 8), y: f.gy - 16, vy: -50, life: 0.45, size: 15, color: "#d8b4fe" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hiss · soft blips",
          cap: { en: "A wet *hiss* when it lands.", ko: "떨어질 때 *치이익*." },
          cloud(w) { w.play(() => nz({ type: "bandpass", f: 3200, f2: 1800, q: 1, dur: 0.6, vol: 0.25 })); },
          tick(w) { if (once(w, "pt", 0.1)) w.play(() => tn({ f: 220, f2: 180, dur: 0.05, vol: 0.12 })); },
        },
      ],
    },

    /* 22 ─ 포탑 소환 */
    {
      id: "horde-turret", cat: "horde", view: "top",
      title: { en: "Make a summoned turret *arrive*", ko: "소환 포탑이 *등장하게*" },
      intro: { en: "A grey dot appears. It… *shoots?*", ko: "회색 점이 생겼어요. 쏘긴… *쏘나?*" },
      interval: 2.4, stepDur: 4.0,
      drawFloor: arena,
      setup(w) { mob(w, 30, { hp: 2, sp: 36 }); w.tur = null; },
      fire(w) {
        const h = w.hero;
        const t = { x: cl(h.x + rand(-130, 130), 60, 480), y: cl(h.gy + rand(-80, 80), 60, 310), oy: 0, sc: 1, a: 0, kick: 0, cd: 0.25, life: 2.2 };
        w.tur = t;
        w.emit("drop", t);
      },
      update(w, dt) {
        chase(w, dt, { r: 44 });
        const t = w.tur; if (!t) return;
        t.kick = Math.max(0, t.kick - dt * 40);
        if ((t.life -= dt) <= 0) { w.tur = null; return; }
        if (t.oy < -1 || t.sc < 0.9 || (t.cd -= dt) > 0) return;
        const f = nearest(w, 1, t.x, t.y)[0]; if (!f || dist(f, t.x, t.y) > 260) return;
        t.cd = 0.16; t.a = Math.atan2(f.gy - t.y, f.x - t.x);
        const m = { x: t.x + Math.cos(t.a) * 22, y: t.y + Math.sin(t.a) * 22 };
        const b = { x: m.x, y: m.y, vx: Math.cos(t.a) * 1100, vy: Math.sin(t.a) * 1100, r: 3, color: "#e5e7eb", a: t.a,
          test: p => live(f) && dist(f, p.x, p.y) < 16,
          onHit: p => { if (!live(f)) return; f.hp -= 1; w.emit("hit", f, p); if (f.hp <= 0) die(w, f, rand(0.2, 0.8)); } };
        w.emit("shot", t, b, m);
        w.shoot(b);
      },
      drawFront(w, ctx) {
        const t = w.tur; if (!t) return;
        ctx.save(); ctx.translate(t.x, t.y + t.oy); ctx.scale(t.sc, t.sc);
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(4, 6 - t.oy, 18, 16, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
        ctx.rotate(t.a); ctx.fillStyle = "#cbd5e1"; ctx.fillRect(-4 - t.kick, -4, 26, 8);
        ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
        ctx.restore();
      },
      steps: [
        {
          id: "drop", name: { en: "Drop In", ko: "하늘에서 쿵" }, param: "fall 260px · 0.3s",
          cap: { en: "Don't pop it in. *Drop it from the sky*.", ko: "그냥 생기지 말고 *하늘에서 떨어지게*." },
          drop(w, t) { t.oy = -260; w.tween(t, { oy: 0 }, 0.3, "in", () => w.emit("land", t)); },
        },
        {
          id: "impact", name: { en: "Landing Impact", ko: "착지 충격" }, param: "ring + dust + push",
          cap: { en: "Landing *shoves* nearby enemies.", ko: "떨어지면서 주변 적을 *밀쳐요*." },
          land(w, t) {
            w.spawn({ type: "ring", x: t.x, y: t.y, size: 14, size1: 90, life: 0.35, w: 8, color: "203,213,225" });
            for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; w.spawn({ type: "smoke", x: t.x, y: t.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, drag: 4, size: 6, size1: 16, life: 0.5, color: "200,195,185" }); }
            for (const f of w.foes) if (live(f) && dist(f, t.x, t.y) < 90) push(f, ang(f, t.x, t.y), 400);
            w.shake(0.25);
          },
        },
        {
          id: "unfold", name: { en: "Unfold", ko: "펼쳐지기" }, param: "scale .4 → 1 back",
          cap: { en: "*Unfold* with a bounce before it fires.", ko: "쏘기 전에 *통* 펼쳐져요." },
          land(w, t) { t.sc = 0.4; w.tween(t, { sc: 1 }, 0.3, "back"); },
        },
        {
          id: "tracer", name: { en: "Tracer + Flash", ko: "꼬리 + 총구 불" }, param: "len 20",
          cap: { en: "Give bullets a *tail* and the barrel a *flash*.", ko: "총알엔 *꼬리*, 총구엔 *불꽃*." },
          shot(w, t, b, m) { b.len = 20; w.spawn({ type: "glow", x: m.x, y: m.y, size: 22, size1: 6, life: 0.06, color: "255,200,110" }); },
        },
        {
          id: "recoil", name: { en: "Recoil", ko: "반동" }, param: "barrel −6px",
          cap: { en: "The barrel *kicks back* every shot.", ko: "쏠 때마다 총열이 *툭* 밀려요." },
          shot(w, t) { t.kick = 6; },
        },
        {
          id: "hit", name: { en: "Hit Push", ko: "맞으면 밀림" }, param: "flash + 120 push",
          cap: { en: "Targets *flash* and get *pushed* away.", ko: "맞은 적은 *번쩍*, 뒤로 *밀려요*." },
          hit(w, f, p) { f.flash = 1; push(f, p.a, 120); sparks(w, p.x, p.y, 3, "255,230,170", [100, 260], p.a + 2.4, p.a + 3.9); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk · smg",
          cap: { en: "A heavy *thunk*, then a tight *rat-tat*.", ko: "묵직한 *쿵*, 이어서 *따따따*." },
          land(w) { w.sfx.thunk(); },
          shot(w) { w.sfx.smg(rand(1.1, 1.3)); },
        },
      ],
    },

    /* 23 ─ 따라다니는 펫 */
    {
      id: "horde-pets", cat: "horde", view: "top",
      title: { en: "Give pet minions *personality*", ko: "펫에게 *성격* 불어넣기" },
      intro: { en: "Three dots slide out and back. *Robots.*", ko: "점 셋이 갔다 와요. *로봇* 같아요." },
      interval: 1.0, stepDur: 3.6,
      drawFloor: arena,
      setup(w) {
        mob(w, 28, { hp: 1, sp: 30 });
        w.pets = [0, 1, 2].map(i => ({ i, a: i * TAU / 3, x: HX, y: HY, busy: false, bob: 0, sc: 1, wait: 0 }));
      },
      fire(w) {
        const h = w.hero, taken = new Set();
        for (const p of w.pets) {
          if (p.busy) continue;
          const f = w.foes.filter(f => live(f) && !taken.has(f) && dist(f, h.x, h.gy) < 230).sort((a, b) => dist(a, p.x, p.y) - dist(b, p.x, p.y))[0];
          if (!f) continue;
          taken.add(f); p.busy = true; p.wait = 0;
          w.emit("dash", p, f);
          w.after(p.wait + p.i * 0.08, () => w.tween(p, { x: f.x, y: f.gy }, 0.16, "lin", () => {
            if (live(f)) { w.emit("bite", p, f); die(w, f, rand(0.2, 0.8)); }
            w.tween(p, { x: h.x + Math.cos(p.a) * 44, y: h.gy + Math.sin(p.a) * 44 }, 0.2, "lin", () => { p.busy = false; w.emit("back", p); });
          }));
        }
      },
      update(w, dt) {
        chase(w, dt, { r: 56 });
        const h = w.hero;
        for (const p of w.pets) {
          p.a += dt * 2.2; p.sc += (1 - p.sc) * Math.min(1, dt * 8);
          if (!p.busy) { p.x = h.x + Math.cos(p.a) * 44; p.y = h.gy + Math.sin(p.a) * 44; }
        }
      },
      drawFront(w, ctx) {
        for (const p of w.pets) {
          ctx.save(); ctx.translate(p.x, p.y + p.bob); ctx.scale(p.sc, p.sc);
          ctx.fillStyle = "#fde68a"; ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-6, -15); ctx.lineTo(-1, -8); ctx.lineTo(1, -8); ctx.lineTo(6, -15); ctx.lineTo(8, -5); ctx.arc(0, 0, 9, -0.3, Math.PI + 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      },
      steps: [
        {
          id: "bob", name: { en: "Idle Bob", ko: "통통 대기" }, param: "±4px · 8Hz",
          cap: { en: "Let them *bob* while they wait. They're alive.", ko: "기다릴 땐 *통통*. 살아 있는 느낌." },
          update(w) { for (const p of w.pets) p.bob = Math.sin(w.time * 8 + p.i * 2) * 4; },
        },
        {
          id: "windup", name: { en: "Crouch First", ko: "웅크렸다 출발" }, param: "back 14px · 120ms",
          cap: { en: "Pull back *before* the dash.", ko: "뛰어들기 *전에* 살짝 뒤로." },
          dash(w, p, f) {
            const a = Math.atan2(f.gy - p.y, f.x - p.x);
            p.wait = 0.12; p.sc = 0.75;
            w.tween(p, { x: p.x - Math.cos(a) * 14, y: p.y - Math.sin(a) * 14 }, 0.12, "out");
          },
        },
        {
          id: "trail", name: { en: "Dash Trail", ko: "돌진 꼬리" }, param: "glow / frame",
          cap: { en: "A *streak* follows the dash.", ko: "돌진할 땐 *꼬리*가 따라와요." },
          update(w) { for (const p of w.pets) if (p.busy) w.spawn({ type: "glow", x: p.x, y: p.y, size: 10, size1: 0, life: 0.2, color: "253,230,138" }); },
        },
        {
          id: "bite", name: { en: "Bite Impact", ko: "콱 무는 순간" }, param: "star + ring",
          cap: { en: "A sharp *star* on the bite.", ko: "물 때 *별 모양*으로 콱." },
          bite(w, p, f) {
            w.spawn({ type: "star", x: f.x, y: f.gy, size: 28, life: 0.14, color: "255,255,255" });
            w.spawn({ type: "ring", x: f.x, y: f.gy, size: 6, size1: 34, life: 0.22, w: 5, color: "253,230,138" });
            p.sc = 1.5;
          },
        },
        {
          id: "back", name: { en: "Proud Return", ko: "뿌듯한 귀환" }, param: "hop 1.4× + spark",
          cap: { en: "Back home, a happy *hop*.", ko: "돌아오면 신나게 *폴짝*." },
          back(w, p) { p.sc = 1.4; w.spawn({ type: "star", x: p.x, y: p.y - 18, size: 10, life: 0.3, vy: -60, color: "253,230,138" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "squeak · pop",
          cap: { en: "Tiny *squeaks*. Pets sound *small*.", ko: "작은 *삑*. 펫은 소리도 *작게*." },
          dash(w, p) { w.play(() => tn({ type: "square", f: 900 + p.i * 120, f2: 1400, dur: 0.06, vol: 0.08 })); },
          bite(w) { w.sfx.pop(); },
        },
      ],
    },

    /* 24 ─ 포위 경고 표시 */
    {
      id: "horde-surround", cat: "horde", view: "top",
      title: { en: "Show who's coming from *off-screen*", ko: "화면 *밖*에서 오는 적 알려주기" },
      intro: { en: "Surprise! From *every side*.", ko: "깜짝! *사방*에서 튀어나와요." },
      interval: 1.4, stepDur: 3.8,
      drawFloor: arena,
      setup(w) {
        mob(w, 36, { hp: 1, sp: 46 });
        w.foes.forEach((f, i) => { if (i > 7) { f.wait = 99; f.alpha = 0; f.delay = 99; } });
        w.atk = 0;
      },
      fire(w) {
        const a = rand(0, TAU), h = w.hero;
        const g = w.foes.filter(f => f.alive && f.wait > 1).slice(0, 6);
        g.forEach(f => {
          const b = a + rand(-0.35, 0.35), d = rand(380, 470);
          f.x = h.x + Math.cos(b) * d; f.gy = h.gy + Math.sin(b) * d * 0.75; f.wait = 0.001; f.out = true;
        });
        if (g.length) w.emit("incoming", a);
      },
      update(w, dt) {
        chase(w, dt, { r: 40, free: true });
        for (const f of w.foes) {
          const inView = f.x > 20 && f.x < 520 && f.gy > 20 && f.gy < 340;
          if (live(f) && f.out && inView) { f.out = false; w.emit("inView", f); }
        }
        if ((w.atk -= dt) > 0) return;
        w.atk = 0.2;
        const f = nearest(w, 1)[0];
        if (f && dist(f, w.hero.x, w.hero.gy) < 60) { burst(w, f.x, f.gy, 3, "255,255,255"); die(w, f, 99); }
      },
      drawHud(w, ctx) {
        const h = w.hero;
        for (const f of w.foes) {
          if (!live(f) || !f.out) continue;
          const a = Math.atan2(f.gy - h.gy, f.x - h.x), d = Math.hypot(f.x - h.x, f.gy - h.gy);
          const p = { x: cl(h.x + Math.cos(a) * 400, 30, 510), y: cl(h.gy + Math.sin(a) * 400, 48, 312), a, d, s: 7, col: "248,113,113" };
          w.emit("pip", p);
          w.emit("drawPip", ctx, p);
        }
      },
      steps: [
        {
          id: "pips", name: { en: "Edge Pips", ko: "가장자리 표시" }, param: "1 per enemy",
          cap: { en: "Pin a *marker* to the edge for each one.", ko: "적마다 화면 끝에 *표시*를 붙여요." },
          drawPip(w, ctx, p) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
            ctx.fillStyle = `rgb(${p.col})`; ctx.beginPath(); ctx.moveTo(p.s, 0); ctx.lineTo(-p.s, -p.s * 0.8); ctx.lineTo(-p.s, p.s * 0.8); ctx.fill();
            ctx.restore();
          },
        },
        {
          id: "near", name: { en: "Closer = Bigger", ko: "가까울수록 크게" }, param: "7 → 16px",
          cap: { en: "Closer enemies get *bigger, hotter* markers.", ko: "가까울수록 표시가 *크고 뜨겁게*." },
          pip(w, p) { const k = cl(1 - (p.d - 260) / 220, 0, 1); p.s = 7 + 9 * k; p.col = k > 0.6 ? "254,226,226" : "248,113,113"; },
        },
        {
          id: "pulse", name: { en: "Pulse", ko: "두근두근" }, param: "±20% · 10Hz",
          cap: { en: "Markers *pulse*. Motion catches the eye.", ko: "표시가 *두근두근*. 움직여야 눈에 띄어요." },
          pip(w, p) { p.s *= 1 + 0.2 * Math.sin(w.time * 20); },
        },
        {
          id: "glow", name: { en: "Edge Glow", ko: "가장자리 빛" }, param: "red glow 40px",
          cap: { en: "*Glow* the edge where they'll break in.", ko: "들이닥칠 *가장자리*가 붉게 빛나요." },
          drawPip(w, ctx, p) { ctx.globalCompositeOperation = "lighter"; glow(ctx, p.x, p.y, 40, "239,68,68", 0.25); ctx.globalCompositeOperation = "source-over"; },
        },
        {
          id: "arrive", name: { en: "Arrival Pop", ko: "등장 표시" }, param: "ring on entry",
          cap: { en: "When they *cross the edge*, mark it.", ko: "화면 *안으로 들어올 때* 한 번 더 표시." },
          inView(w, f) { f.flash = 1; w.spawn({ type: "ring", x: f.x, y: f.gy, size: 8, size1: 40, life: 0.3, w: 4, color: "248,113,113" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "2 beeps per group",
          cap: { en: "Two short *beeps* when a group appears.", ko: "무리가 나타나면 짧게 *삑삑*." },
          incoming(w) { w.play(() => { tn({ type: "square", f: 880, dur: 0.06, vol: 0.1 }); tn({ type: "square", f: 880, dur: 0.06, vol: 0.1, delay: 0.12 }); }); },
        },
      ],
    },

    /* 25 ─ 생존 시간 이정표 */
    {
      id: "horde-milestone", cat: "horde", view: "top",
      title: { en: "Celebrate a *survival milestone*", ko: "버틴 시간을 *축하하기*" },
      intro: { en: "Five minutes survived. The clock *shrugs*.", ko: "5분을 버텼는데 시계는 *무심해요*." },
      interval: 3.0, stepDur: 4.2,
      drawFloor: arena,
      setup(w) {
        mob(w, 26, { hp: 1, sp: 36 });
        w.clock = { s: 4 * 60 + 57, sc: 1, y: 52, col: "#ffffff" }; w.atk = 0;
      },
      fire(w) {
        const c = w.clock, m = Math.floor(c.s / 60) + 1;
        c.s = m * 60;
        w.emit("milestone", c, m);
      },
      update(w, dt) {
        chase(w, dt, { r: 40 });
        w.clock.s += dt;
        if ((w.atk -= dt) > 0) return;
        w.atk = 0.3;
        const f = nearest(w, 1)[0];
        if (f && dist(f, w.hero.x, w.hero.gy) < 70) { burst(w, f.x, f.gy, 3, "255,255,255"); die(w, f, rand(0, 0.6)); }
      },
      drawHud(w, ctx) {
        const c = w.clock, s = Math.floor(c.s), t = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
        ctx.save(); ctx.translate(270, c.y); ctx.scale(c.sc, c.sc);
        txt(ctx, t, 0, 0, 22, c.col);
        ctx.restore();
      },
      steps: [
        {
          id: "pop", name: { en: "Center Stage", ko: "가운데로 크게" }, param: "×2.6 · hold 0.5s",
          cap: { en: "Bring the clock to *center stage*, huge.", ko: "시계를 *한가운데로*, 아주 크게." },
          milestone(w, c) {
            c.sc = 2.8; c.y = 120;
            w.after(0.6, () => w.tween(c, { sc: 1, y: 52 }, 0.5, "inout"));
          },
        },
        {
          id: "gold", name: { en: "Gold", ko: "금빛" }, param: "1.6s",
          cap: { en: "Turn it *gold* for a moment.", ko: "잠깐 *금빛*으로 바꿔요." },
          milestone(w, c) { c.col = "#fde047"; w.after(1.6, () => { c.col = "#ffffff"; }); },
        },
        {
          id: "rays", name: { en: "Rays + Confetti", ko: "후광 + 꽃가루" }, param: "rays · 24 bits",
          cap: { en: "*Rays* behind it, *confetti* falling.", ko: "뒤로 *후광*, 위에선 *꽃가루*." },
          milestone(w) {
            w.spawn({ type: "rays", x: 270, y: 120, size: 150, life: 1.2, n: 14, vr: 1, color: "253,224,71", hold: true });
            for (let i = 0; i < 24; i++) w.spawn({ type: "chunk", x: 270 + rand(-60, 60), y: 120, vx: rand(-320, 320), vy: rand(-420, -120), g: 700, vr: rand(-12, 12), life: 1.6, size: 4, color: pick(["253,224,71", "198,244,50", "244,114,182", "125,211,252"]) });
          },
        },
        {
          id: "banner", name: { en: "Banner", ko: "자막 띠" }, param: "1.6s",
          cap: { en: "Say it out loud: *survived*.", ko: "대놓고 말해요: *버텼다!*" },
          milestone(w, c, m) {
            w.spawn({ type: "text", text: m + " MINUTES SURVIVED", x: 270, y: 250, life: 1.6, size: 24, color: "#ffffff", hold: true });
          },
        },
        {
          id: "flash", name: { en: "Flash + Push", ko: "번쩍 + 밀쳐내기" }, param: "gold .4 · push 400",
          cap: { en: "A *gold flash* clears a breath of space.", ko: "*금빛* 번쩍, 숨 돌릴 틈을 만들어요." },
          milestone(w) {
            const h = w.hero; w.flash("253,224,71", 0.4);
            for (const f of w.foes) if (live(f)) push(f, ang(f, h.x, h.gy), 400);
            w.spawn({ type: "ring", x: h.x, y: h.gy, size: 20, size1: 200, life: 0.5, w: 10, color: "253,224,71" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "fanfare",
          cap: { en: "A short *fanfare*. You earned it.", ko: "짧은 *빰빠밤*. 버틴 보상이에요." },
          milestone(w) { w.sfx.fanfare(); w.sfx.chime(0); },
        },
      ],
    },

    /* 26 ─ 무리끼리 부드럽게 밀어내기 */
    {
      id: "horde-crowd", cat: "horde", view: "top",
      title: { en: "Make a crowd *push back*", ko: "적 무리가 *서로 밀치게*" },
      intro: { en: "Forty goblins. One *green blob*.", ko: "고블린 마흔 마리가 *초록 덩어리* 하나." },
      interval: 1.6, stepDur: 3.8,
      drawFloor: arena,
      setup(w) { mob(w, 40, { hp: 1, sp: 50 }); },
      fire(w) {
        const h = w.hero, a = rand(0, TAU);
        const to = { x: cl(h.x + Math.cos(a) * 110, 90, 450), gy: cl(h.gy + Math.sin(a) * 80, 80, 290) };
        const dir = Math.atan2(to.gy - h.gy, to.x - h.x);
        h.rot = dir;
        w.emit("dash", h, dir);
        w.tween(h, to, 0.18, "out");
      },
      update(w, dt) {
        const o = { sep: 0, r: 2 };
        w.emit("crowd", o);
        chase(w, dt, o);
        w.emit("crowdDone", dt);
      },
      steps: [
        {
          id: "separate", name: { en: "Separation", ko: "서로 떨어지기" }, param: "radius 24px",
          cap: { en: "Each enemy *pushes its neighbors* a little.", ko: "적끼리 *살짝씩* 밀어내요." },
          crowd(w, o) { o.sep = 24; },
        },
        {
          id: "block", name: { en: "Hero Body", ko: "주인공 몸통" }, param: "stop at 40px",
          cap: { en: "They stop *at* the hero, not inside.", ko: "주인공 *안으로* 말고 *앞에서* 멈춰요." },
          crowd(w, o) { o.r = 40; },
        },
        {
          id: "wobble", name: { en: "Waddle", ko: "뒤뚱뒤뚱" }, param: "±0.3 rad",
          cap: { en: "A little *waddle*. A crowd, not a texture.", ko: "*뒤뚱뒤뚱*. 무늬 말고 무리처럼." },
          crowdDone(w) { for (const f of w.foes) f.rot += Math.sin(w.time * 12 + f.sp) * 0.3; },
        },
        {
          id: "shove", name: { en: "Shove Through", ko: "밀치고 지나가기" }, param: "push 360 · squash",
          cap: { en: "Dashing *shoves* the crowd aside.", ko: "돌진하면 무리가 *옆으로 밀려나요*." },
          dash(w, h, dir) {
            for (const f of w.foes) {
              if (!live(f) || dist(f, h.x, h.gy) > 140) continue;
              const side = Math.sin(ang(f, h.x, h.gy) - dir) > 0 ? 1 : -1;
              w.after(dist(f, h.x, h.gy) / 900, () => { push(f, dir + side * 1.3, 360); f.sx = 1.3; f.sy = 0.75; });
            }
          },
        },
        {
          id: "dust", name: { en: "Dust", ko: "먼지" }, param: "6 puffs",
          cap: { en: "Kick up *dust* where they're shoved.", ko: "밀린 자리에 *먼지*가 풀썩." },
          dash(w, h, dir) {
            for (let i = 0; i < 6; i++) w.spawn({ type: "smoke", x: h.x + Math.cos(dir) * i * 18, y: h.gy + Math.sin(dir) * i * 18, vx: rand(-80, 80), vy: rand(-80, 80), drag: 3, size: 6, size1: 20, life: 0.6, color: "200,195,185" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "dash + scuffle",
          cap: { en: "A *whoosh* and a *scuffle*.", ko: "*휙* 하고 *우당탕*." },
          dash(w) { w.sfx.dash(); w.sfx.rattle(); },
        },
      ],
    },

    /* 27 ─ 마지막 한 마리 슬로모션 */
    {
      id: "horde-last", cat: "horde", view: "top",
      title: { en: "Slow down for the *last one*", ko: "마지막 한 마리는 *느리게*" },
      intro: { en: "Wave over. Nobody *noticed*.", ko: "웨이브가 끝났는데 *아무도 몰라요*." },
      interval: 2.8, stepDur: 4.4,
      drawFloor: arena,
      setup(w) { mob(w, 8, { hp: 1, sp: 30 }); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, fs = nearest(w, 8);
        fs.forEach((f, i) => w.after(i * 0.07, () => {
          h.rot = Math.atan2(f.gy - h.gy, f.x - h.x);
          w.spawn({ type: "crack", x: h.x, y: h.gy, pts: [[0, 0], [f.x - h.x, f.gy - h.gy]], w: 2, life: 0.08, color: "255,240,200" });
          if (i === fs.length - 1) w.emit("last", f, h);
          die(w, f, 99);
        }));
        w.after(1.9, () => { w.foes.forEach((f, i) => { f.wait = 0.001 + i * 0.05; }); w.busy = false; });
      },
      update(w, dt) { chase(w, dt, { r: 50 }); },
      steps: [
        {
          id: "slowmo", name: { en: "Slow-mo", ko: "슬로모션" }, param: "0.15× · 1s",
          cap: { en: "The last kill plays in *slow motion*.", ko: "마지막 한 방은 *슬로모션*으로." },
          last(w) { w.slowmo(0.15, 1.0); },
        },
        {
          id: "cam", name: { en: "Camera Lean", ko: "카메라 다가가기" }, param: "zoom .15 · lean 40%",
          cap: { en: "*Lean in* toward the final target.", ko: "마지막 적 쪽으로 *다가가요*." },
          last(w, f) {
            w.zoomPunch(0.18); w.cam.tx = (f.x - 270) * 0.4; w.cam.ty = (f.gy - 180) * 0.4;
            w.after(0.5, () => { w.cam.tx = 0; w.cam.ty = 0; });
          },
        },
        {
          id: "freeze", name: { en: "Freeze Frame", ko: "정지 화면" }, param: "stop 120ms + star",
          cap: { en: "*Freeze* on contact. One big *star*.", ko: "닿는 순간 *정지*. 커다란 *별*." },
          last(w, f) {
            w.hitstop(0.12);
            w.spawn({ type: "star", x: f.x, y: f.gy, size: 70, life: 0.3, color: "255,255,255" });
            w.spawn({ type: "ring", x: f.x, y: f.gy, size: 10, size1: 110, life: 0.5, w: 10, color: "255,240,200" });
          },
        },
        {
          id: "launch", name: { en: "Spin Away", ko: "빙글빙글 날아감" }, param: "slide 160px · spin",
          cap: { en: "Don't just delete it. *Spin it away*.", ko: "그냥 지우지 말고 *빙글빙글 날려요*." },
          last(w, f, h) {
            const a = ang(f, h.x, h.gy); f.keep = true; f.flash = 2;
            w.tween(f, { x: f.x + Math.cos(a) * 160, gy: f.gy + Math.sin(a) * 160, rot: f.rot + 12, alpha: 0 }, 0.5, "out");
          },
        },
        {
          id: "banner", name: { en: "Wave Clear", ko: "웨이브 클리어" }, param: "hold 1.4s",
          cap: { en: "Then say it: *WAVE CLEAR*.", ko: "그리고 크게: *웨이브 클리어*." },
          last(w) {
            w.after(0.25, () => {
              w.spawn({ type: "text", text: "WAVE CLEAR", x: 270, y: 90, life: 1.4, size: 40, color: "#c6f432", hold: true });
              w.flash("198,244,50", 0.25);
            });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crit · fanfare",
          cap: { en: "A heavy *crit*, then a bright *fanfare*.", ko: "묵직한 *퍽*, 이어서 밝은 *빰빠밤*." },
          last(w) { w.sfx.crit(); w.after(0.25, () => w.sfx.fanfare()); },
        },
      ],
    },

    /* 28 ─ 무쌍 콤보 1000 (옆에서) */
    {
      id: "horde-musou", cat: "horde", view: "side",
      title: { en: "Count a *1000-hit* combo right", ko: "*1000 콤보*를 제대로 세기" },
      intro: { en: "347 hits… in a *footnote* font.", ko: "347 콤보인데 *각주*처럼 보여요." },
      interval: 0.32, stepDur: 3.8,
      setup(w) {
        w.foes = [];
        for (let i = 0; i < 12; i++) {
          const L = i < 6, f = w.actor("foe", { home: L ? -60 : 600, h: 72, hp: 3, flip: L });
          f.side = L ? -1 : 1; f.x = 270 + f.side * (64 + (i % 6) * 34); w.foes.push(f);
        }
        w.hero = w.actor("hero", { home: 270, h: 116 });
        w.combo = { n: 0, shown: 0, sc: 1, size: 16, col: "#ffffff" }; w.dir = 1;
      },
      fire(w) {
        const h = w.hero, c = w.combo;
        w.dir = -w.dir; h.flip = w.dir < 0; h.ox += w.dir * 10;
        w.emit("swing", h, w.dir);
        let hits = 0;
        for (const f of w.foes) {
          if (!f.alive || f.flying || f.side !== w.dir || Math.abs(f.x - h.x) > 180) continue;
          f.hp -= 1; hits++;
          w.emit("hit", f, w.dir);
          if (f.hp <= 0) w.kill(f);
        }
        if (!hits) return;
        const before = c.n;
        c.n += hits * 9;
        w.emit("combo", c);
        if (Math.floor(c.n / 100) > Math.floor(before / 100)) w.emit("hundred", c, Math.floor(c.n / 100) * 100);
        if (c.n >= 1000) w.after(1.2, () => { c.n = 0; c.shown = 0; });
      },
      update(w, dt) {
        const c = w.combo;
        c.sc += (1 - c.sc) * Math.min(1, dt * 10);
        if (!w.on("roll")) c.shown = c.n;
        for (const s of [-1, 1]) {
          const fs = w.foes.filter(f => f.side === s && f.alive && !f.flying).sort((a, b) => s * (a.x - b.x));
          let lim = 270 + s * 58;
          for (const f of fs) { f.x = s < 0 ? Math.min(lim, f.x + dt * 90) : Math.max(lim, f.x - dt * 90); lim = f.x + s * 32; }
        }
      },
      drawHud(w, ctx) {
        const c = w.combo;
        ctx.save(); ctx.translate(440, 76); ctx.scale(c.sc, c.sc);
        txt(ctx, String(Math.round(c.shown)), 0, 0, c.size, c.col);
        txt(ctx, "HITS", 0, c.size * 0.75, Math.max(11, c.size * 0.32), "rgba(255,255,255,0.8)");
        ctx.restore();
      },
      steps: [
        {
          id: "slash", name: { en: "Wide Slash", ko: "넓은 베기" }, param: "arc 90px",
          cap: { en: "Every swing draws a *wide arc*.", ko: "휘두를 때마다 *넓은 궤적*." },
          swing(w, h, d) {
            w.spawn({ type: "arc", x: h.x + d * 30, y: G - 64, size: 90, life: 0.16, a0: d > 0 ? -1.6 : Math.PI - 1.0, a1: d > 0 ? 1.0 : Math.PI + 1.6, color: "255,255,255" });
          },
        },
        {
          id: "hit", name: { en: "Mass Hit", ko: "한꺼번에 맞기" }, param: "flash + push 30",
          cap: { en: "*Everyone* in the arc flashes and staggers.", ko: "궤적 안의 *모두가* 번쩍, 휘청." },
          hit(w, f, d) { f.flash = 1; f.ox += d * 30; sparks(w, f.x - d * 20, G - 50, 2, "255,240,200", [120, 300]); },
          kill(w, f) { w.fly(f, f.side * rand(300, 500), rand(-700, -450), f.side * 10); },
        },
        {
          id: "big", name: { en: "Big Counter", ko: "큰 숫자" }, param: "40px · pop 1.35",
          cap: { en: "Make the number *big* and *pop* every hit.", ko: "숫자를 *크게*, 때릴 때마다 *톡*." },
          combo(w, c) { c.size = 40; c.sc = 1.35; },
        },
        {
          id: "roll", name: { en: "Rolling Digits", ko: "굴러가는 숫자" }, param: "lerp 10/s",
          cap: { en: "Digits *roll up*. It feels like a meter.", ko: "숫자가 *주르륵* 올라가요. 게이지처럼." },
          update(w, dt) { const c = w.combo; c.shown += (c.n - c.shown) * Math.min(1, dt * 10); },
        },
        {
          id: "tiers", name: { en: "Color Tiers", ko: "단계별 색" }, param: "per 100",
          cap: { en: "Every *100* changes the color.", ko: "*100*마다 색이 바뀌어요." },
          combo(w, c) { c.col = ["#ffffff", "#fde047", "#fb923c", "#f43f5e", "#e879f9", "#c6f432"][Math.min(5, Math.floor(c.n / 200))]; },
        },
        {
          id: "hundred", name: { en: "Every 100", ko: "100마다 한 방" }, param: "ring + text + shake",
          cap: { en: "Every *100*, a ring, a shout, a *shake*.", ko: "*100*마다 고리, 외침, *흔들*." },
          hundred(w, c, m) {
            w.spawn({ type: "ring", x: 440, y: 76, size: 20, size1: 110, life: 0.4, w: 10, color: "255,255,255" });
            w.spawn({ type: "text", text: m >= 1000 ? "1000!!" : m + "!", x: 270, y: 120, vy: -30, life: 0.9, size: m >= 1000 ? 54 : 36, color: c.col });
            w.shake(m >= 1000 ? 0.7 : 0.25);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slash · chime / 100",
          cap: { en: "Quick *slashes*. A *chime* every 100.", ko: "빠른 *챙챙*. 100마다 *띵*." },
          swing(w) { w.sfx.slashHit(); },
          hundred(w, c, m) { if (m >= 1000) w.sfx.fanfare(); else w.sfx.chime(m / 100); },
        },
      ],
    },

    /* 29 ─ 한 줄을 꿰뚫는 빔 (옆에서) */
    {
      id: "horde-beam", cat: "horde", view: "side",
      title: { en: "Make a beam *pierce the line*", ko: "빔이 한 줄을 *꿰뚫게*" },
      intro: { en: "A thin line. Seven goblins *blink out*.", ko: "가는 선 하나. 일곱 마리가 *쓱* 사라져요." },
      interval: 1.4, stepDur: 3.8,
      setup(w) {
        w.foes = [];
        for (let i = 0; i < 7; i++) { const f = w.actor("foe", { home: 580, h: 84, hp: 4 }); f.x = 200 + i * 48; f.hp = 2 + 2 * (i % 2); w.foes.push(f); }
        w.hero = w.actor("hero", { home: 70, h: 120 });
        w.beam = null; w.delay = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true; w.delay = 0;
        const h = w.hero;
        const go = () => {
          const b = { t: 0, life: 0.45, x0: h.x + 44, y: G - 70, w: 3 };
          w.beam = b;
          w.emit("beam", b);
          w.foes.filter(f => f.alive && !f.flying && f.x < 540).sort((a, c) => a.x - c.x).forEach((f, i) => w.after((f.x - b.x0) * w.delay, () => {
            if (!f.alive) return;
            f.hp -= 2; w.emit("pierce", f, i, b);
            if (f.hp <= 0) w.kill(f);
          }));
          w.after(0.5, () => { w.busy = false; });
        };
        if (w.on("charge")) { w.emit("charge", h); w.after(0.35, go); } else go();
      },
      update(w, dt) {
        const b = w.beam; if (b && (b.t += dt) > b.life) w.beam = null;
        const fs = w.foes.filter(f => f.alive && !f.flying).sort((a, c) => a.x - c.x);
        let min = 190;
        for (const f of fs) { f.x = Math.max(min, f.x - dt * 110); min = f.x + 46; }
      },
      drawFront(w, ctx) {
        const b = w.beam; if (!b) return;
        const k = 1 - b.t / b.life;
        w.emit("drawBeam", ctx, b, k);
        ctx.fillStyle = `rgba(255,255,255,${k})`; ctx.fillRect(b.x0, b.y - b.w / 2 * k, 560, b.w * k);
      },
      steps: [
        {
          id: "charge", name: { en: "Charge", ko: "모으기" }, param: "350ms",
          cap: { en: "*Gather light* at the hand first.", ko: "먼저 손끝에 *빛을 모아요*." },
          charge(w, h) {
            const x = h.x + 44, y = G - 70;
            for (let i = 0; i < 14; i++) { const a = rand(0, TAU), d = rand(40, 80); w.spawn({ type: "spark", seek: true, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, tx: x, ty: y, life: 0.3, size: 2.5, color: "165,243,252" }); }
            w.spawn({ type: "glow", x, y, size: 6, size1: 40, life: 0.35, color: "103,232,249" });
          },
        },
        {
          id: "thick", name: { en: "Fat Beam", ko: "굵은 빔" }, param: "26px · flicker",
          cap: { en: "*Thick*, with a *white core* and a colored glow.", ko: "*굵게*. 가운데는 *하얗게*, 바깥은 색으로." },
          beam(w, b) { b.w = 14; },
          drawBeam(w, ctx, b, k) {
            const r = (26 + rand(-3, 3)) * k, g = ctx.createLinearGradient(0, b.y - r, 0, b.y + r);
            g.addColorStop(0, "rgba(34,211,238,0)"); g.addColorStop(0.5, "rgba(103,232,249,0.9)"); g.addColorStop(1, "rgba(34,211,238,0)");
            ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(b.x0, b.y - r, 560, r * 2);
            ctx.globalCompositeOperation = "source-over";
          },
        },
        {
          id: "order", name: { en: "Pierce in Order", ko: "앞에서부터 차례로" }, param: "2000 px/s",
          cap: { en: "Hit *front to back*. You *see* it go through.", ko: "*앞에서 뒤로* 차례로. 뚫고 가는 게 *보여요*." },
          beam(w) { w.delay = 1 / 2000; },
        },
        {
          id: "spray", name: { en: "Exit Spray", ko: "뒤로 튀는 불꽃" }, param: "8 sparks out back",
          cap: { en: "Sparks *burst out the back* of each body.", ko: "몸마다 *뒤쪽으로* 불꽃이 터져요." },
          pierce(w, f, i, b) {
            f.flash = 1.4; f.vib = 6;
            sparks(w, f.x + 20, b.y, 8, "165,243,252", [200, 600], -0.5, 0.5);
          },
          kill(w, f) { w.fly(f, rand(260, 420), rand(-520, -320), 8); },
        },
        {
          id: "recoil", name: { en: "Recoil", ko: "반동" }, param: "hero −26px · .35",
          cap: { en: "The caster gets *pushed back* by it.", ko: "쏜 사람도 *뒤로 밀려요*." },
          beam(w) { w.hero.ox -= 26; w.shake(0.35, -1); },
        },
        {
          id: "scorch", name: { en: "Scorch Line", ko: "그을린 자국" }, param: "floor glow 2.5s",
          cap: { en: "Leave a *scorched line* on the floor.", ko: "바닥에 *그을린 줄*을 남겨요." },
          beam(w, b) {
            for (let x = b.x0 + 20; x < 540; x += 36) w.spawn({ type: "ellipse", under: true, x: x + rand(-8, 8), y: G + 3, size: rand(24, 34), life: 2.5, color: "34,211,238", alpha: 0.45, hold: true, add: true });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge · zzzap",
          cap: { en: "A rising *whine*, then a buzzing *ZZZAP*.", ko: "올라가는 *위잉*, 이어서 *지이잉*." },
          charge(w) { w.sfx.charge(); },
          beam(w) { w.play(() => { tn({ type: "sawtooth", f: 160, f2: 90, dur: 0.45, vol: 0.18 }); nz({ type: "bandpass", f: 2400, f2: 900, q: 1, dur: 0.4, vol: 0.3 }); }); },
        },
      ],
    },

    /* 30 ─ 가장자리에서 몰려오는 웨이브 */
    {
      id: "horde-wave-spawn", cat: "horde", view: "top",
      title: { en: "Make a new wave *arrive*", ko: "새 웨이브가 *들이닥치게*" },
      intro: { en: "Twenty-four goblins. *Poof*, there.", ko: "고블린 스물넷이 *뿅* 하고 생겨요." },
      interval: 2.8, stepDur: 4.2,
      drawFloor: arena,
      setup(w) {
        mob(w, 48, { hp: 1, sp: 40 });
        w.foes.forEach((f, i) => { if (i >= 18) { f.wait = 99; f.alpha = 0; f.delay = 99; } });
        w.wave = 3;
      },
      fire(w) {
        const h = w.hero;
        for (const f of w.foes) if (live(f)) { burst(w, f.x, f.gy, 2, "255,255,255"); die(w, f, 99); }
        w.wave++;
        const sp = { tele: 0, ripple: 0 };
        w.emit("wave", w.wave, sp);
        const g = w.foes.filter(f => f.alive && f.wait > 1).slice(0, 24), a0 = rand(0, TAU);
        g.forEach((f, i) => {
          const a = a0 + i / g.length * TAU;
          f.x = cl(h.x + Math.cos(a) * 250, 30, 510); f.gy = cl(h.gy + Math.sin(a) * 165, 50, 326);
          f.wait = 0.001 + sp.tele + i * sp.ripple;
          w.emit("mark", f, f.wait);
        });
      },
      update(w, dt) { chase(w, dt, { r: 40 }); },
      steps: [
        {
          id: "tele", name: { en: "Spawn Marks", ko: "등장 예고" }, param: "red ring · 0.45s",
          cap: { en: "Mark *where* they'll appear, a beat early.", ko: "나타날 *자리*를 한 박자 먼저 보여줘요." },
          wave(w, n, sp) { sp.tele = 0.45; },
          mark(w, f, t) {
            w.spawn({ type: "ring", x: f.x, y: f.gy, size: 16, life: t + 0.05, w: 4, color: "239,68,68", hold: true });
            w.spawn({ type: "glow", x: f.x, y: f.gy, size: 22, life: t + 0.05, color: "239,68,68", hold: true });
          },
        },
        {
          id: "ripple", name: { en: "Ripple Around", ko: "한 바퀴 돌며" }, param: "25ms apart",
          cap: { en: "Spawn them *around the ring*, one after another.", ko: "둘레를 *한 바퀴 돌며* 차례로 나와요." },
          wave(w, n, sp) { sp.ripple = 0.025; },
        },
        {
          id: "rise", name: { en: "Burst In", ko: "튀어나오기" }, param: "ring + 3 puffs",
          cap: { en: "Each one *bursts* out of the ground.", ko: "하나하나 땅에서 *펑* 튀어나와요." },
          spawn(w, f) {
            f.sx = f.sy = 1.6; f.flash = 1;
            w.spawn({ type: "ring", x: f.x, y: f.gy, size: 6, size1: 34, life: 0.3, w: 5, color: "254,202,202" });
            for (let i = 0; i < 3; i++) w.spawn({ type: "smoke", x: f.x, y: f.gy, vx: rand(-60, 60), vy: rand(-60, 60), drag: 3, size: 5, size1: 14, life: 0.45, color: "160,150,140" });
          },
        },
        {
          id: "rush", name: { en: "Rush In", ko: "몰려들기" }, param: "lunge 300",
          cap: { en: "They *lunge* inward the moment they land.", ko: "나오자마자 안쪽으로 *확* 달려들어요." },
          spawn(w, f) { push(f, Math.atan2(w.hero.gy - f.gy, w.hero.x - f.x), 300); },
        },
        {
          id: "banner", name: { en: "Wave Number", ko: "웨이브 번호" }, param: "hold 1.2s",
          cap: { en: "Name the wave. *WAVE 7*.", ko: "몇 번째인지 크게. *WAVE 7*." },
          wave(w, n) {
            w.spawn({ type: "text", text: "WAVE " + n, x: 270, y: 70, life: 1.3, size: 38, color: "#f87171", hold: true });
            w.vignette(0.5);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "horn · pops ≤ 30/s",
          cap: { en: "A low *horn*, then a ripple of *pops*.", ko: "낮은 *뿌우*, 이어서 *뽁뽁뽁*." },
          wave(w) { w.play(() => tn({ type: "sawtooth", f: 98, f2: 92, dur: 0.6, vol: 0.14 })); },
          spawn(w) { if (once(w, "sp", 0.03)) w.sfx.pop(); },
        },
      ],
    },
  );
})();

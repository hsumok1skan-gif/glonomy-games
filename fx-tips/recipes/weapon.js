"use strict";
/* weapon — 무기별 손맛 레시피 25편 */
(() => {
  /* ───── 파일 전용 도우미 ───── */
  // 주인공 손 위치, 회전된 지점 계산
  const grip = w => { const h = w.hero; return { x: h.x + h.ox + h.w * 0.36, y: G - h.h * 0.52 * h.sy }; };
  const loc = (o, rot, lx, ly) => { const c = Math.cos(rot), s = Math.sin(rot); return { x: o.x + lx * c - ly * s, y: o.y + lx * s + ly * c }; };
  const poly = (ctx, pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p[0], p[1])); ctx.closePath(); ctx.fill(); };
  const box = (ctx, x, y, W, H, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, W, H); };
  const springTo0 = (o, dt, k = 14) => { o.kick -= o.kick * Math.min(1, dt * k); o.rot -= o.rot * Math.min(1, dt * k * 0.8); };
  // 쓰러뜨림: 히트스톱 동안엔 보이게 두고, 조금 뒤 숨김 → wait초 뒤 부활
  const down = (w, f, wait = 1) => {
    if (!f.alive) return;
    f.alive = false;
    w.emit("kill", f);
    w.after(0.01, () => { if (!f.flying && !f.keep) f.alpha = 0; });
    w.after(wait, () => w.respawn(f));
  };
  // 데미지 주고 "hit" 이벤트 → (at, foe, ...)
  const hit = (w, f, d, at, ...more) => {
    if (!f || !f.alive) return false;
    f.hp -= d;
    w.emit("hit", at, f, ...more);
    if (f.hp <= 0) down(w, f);
    return true;
  };
  const line = (ctx, pts, col, lw) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p[0], p[1])); ctx.stroke();
  };
  // 지그재그 번개 경로
  const zig = (x0, y0, x1, y1, n, amp) => {
    const pts = [[x0, y0]], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    for (let i = 1; i < n; i++) { const t = i / n, o = rand(-amp, amp); pts.push([x0 + dx * t - dy / L * o, y0 + dy * t + dx / L * o]); }
    pts.push([x1, y1]);
    return pts;
  };
  const smokeAt = (w, x, y, n, col = "170,170,180", sp = 120, life = 1) => {
    for (let i = 0; i < n; i++) w.spawn({ type: "smoke", x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-sp, sp), vy: rand(-sp, sp * 0.3), drag: 2.5, size: rand(6, 10), size1: rand(20, 32), life: rand(life * 0.7, life * 1.2), color: col });
  };

  /* ───── 무기 그림 ───── */
  function drawRifle(ctx, g, r) {
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(r.rot); ctx.translate(-r.kick, 0);
    poly(ctx, [[-40, -6], [0, -8], [0, 4], [-12, 7], [-40, 13]], "#6b4f3a");
    box(ctx, -2, -9, 50, 12, "#2a2f3a");
    box(ctx, 46, -5, 80, 5, "#4b5563");
    box(ctx, 6, -19, 36, 8, "#171a21"); box(ctx, 18, -12, 6, 4, "#171a21");
    box(ctx, 40, -18, 3, 6, "#7dd3fc");
    box(ctx, -2, 3, 8, 14, "#1f2430");
    ctx.restore();
  }
  function drawMinigun(ctx, g, s) {
    ctx.save(); ctx.translate(g.x, g.y);
    box(ctx, -4, 8, 12, 18, "#171a21");
    const bars = [0, 1, 2].map(k => s.ang + k * TAU / 3).sort((a, b) => Math.cos(a) - Math.cos(b));
    for (const a of bars) {
      const lit = (Math.cos(a) + 1) / 2, base = [70 + 90 * lit, 76 + 90 * lit, 88 + 90 * lit];
      ctx.fillStyle = s.glow > 0 ? mixc([255, 110 + 120 * s.glow, 60 + 100 * s.glow * s.glow], base, s.glow) : mixc(base, base, 1);
      ctx.fillRect(28, Math.sin(a) * 6 - 2.5, 86, 5);
    }
    box(ctx, -16, -14, 46, 26, "#2a2f3a"); box(ctx, -16, -14, 46, 5, "#3a414f");
    box(ctx, 30, -10, 6, 20, "#3a414f"); box(ctx, 104, -10, 5, 20, "#3a414f");
    if (s.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 90, 0, 46, "255,80,30", s.glow * 0.7); ctx.globalCompositeOperation = "source-over"; }
    ctx.restore();
  }
  function drawLaser(ctx, L, t) {
    if (!L) return;
    const n = Math.max(2, Math.round((L.x1 - L.x0) / 18)), pts = [];
    for (let i = 0; i <= n; i++) { const k = i / n; pts.push([L.x0 + (L.x1 - L.x0) * k, L.y0 + (L.y1 - L.y0) * k + (i && i < n ? Math.sin(t * 70 + i * 1.7) * L.jit : 0)]); }
    ctx.globalCompositeOperation = "lighter";
    if (L.glow) line(ctx, pts, "rgba(255,40,70,0.28)", L.glow);
    line(ctx, pts, "rgba(255,60,80,0.95)", L.glow ? L.w * 1.8 : L.w);
    if (L.glow) line(ctx, pts, "rgba(255,245,245,1)", L.w * 0.7);
    ctx.globalCompositeOperation = "source-over";
  }
  function drawTube(ctx, t, kick) {
    ctx.save(); ctx.translate(t.x - kick, t.y);
    box(ctx, -46, -8, 104, 16, "#4d5a35"); box(ctx, -46, -8, 104, 4, "#68784a");
    box(ctx, -52, -10, 8, 20, "#2f3722"); box(ctx, 54, -10, 6, 20, "#2f3722");
    box(ctx, 8, 6, 8, 14, "#1f2430"); box(ctx, 18, -16, 14, 8, "#171a21");
    ctx.restore();
  }
  function drawRocket(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y);
    if (p.acc) { ctx.globalCompositeOperation = "lighter"; glow(ctx, -26, 0, 18 + Math.random() * 8, "255,170,60", 1); glow(ctx, -24, 0, 8, "255,255,220", 1); ctx.globalCompositeOperation = "source-over"; }
    box(ctx, -22, -5, 28, 10, "#cbd5e1");
    poly(ctx, [[6, -5], [16, 0], [6, 5]], "#ef4444");
    poly(ctx, [[-22, -5], [-28, -10], [-16, -5]], "#64748b"); poly(ctx, [[-22, 5], [-28, 10], [-16, 5]], "#64748b");
    ctx.restore();
  }
  function drawTorch(ctx, w) {
    const h = w.hero, g = grip(w);
    rr(ctx, h.x + h.ox - 62, G - 126, 24, 54, 10, "#b91c1c");
    box(ctx, h.x + h.ox - 58, G - 120, 4, 42, "rgba(255,255,255,0.25)");
    line(ctx, [[h.x + h.ox - 46, G - 76], [g.x - 20, G - 50], [g.x, g.y + 6]], "#1f2430", 4);
    ctx.save(); ctx.translate(g.x, g.y);
    box(ctx, -6, -6, 50, 11, "#3a414f"); box(ctx, 44, -4, 30, 7, "#64748b"); box(ctx, 0, 4, 9, 14, "#1f2430");
    ctx.restore();
  }

  RECIPES.push(
    /* ─────────────── 1. 저격총 ─────────────── */
    {
      id: "weapon-sniper", cat: "weapon", view: "side",
      title: { en: "Make a sniper shot *land*", ko: "저격 한 방을 *묵직하게*" },
      intro: { en: "One perfect shot. Felt like a *pea*.", ko: "완벽한 한 발인데 *콩알* 같아요." },
      interval: 1.7, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 80 }); w.foe = w.actor("foe", { home: 470 }); w.rf = { kick: 0, rot: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const shot = () => {
          const m = loc(grip(w), w.rf.rot, 126 - w.rf.kick, -3), f = w.foe;
          const b = { x: m.x, y: m.y, vx: 2600, vy: 0, r: 3, color: "#e5e7eb", hitX: f.x - 24 };
          b.onHit = () => hit(w, f, 100, { x: b.x, y: b.y });
          w.emit("fire", m, b);
          w.shoot(b);
          w.after(0.5, () => { w.emit("bolt", loc(grip(w), w.rf.rot, 22, -10)); w.busy = false; });
        };
        if (w.on("glint")) { w.emit("glint", loc(grip(w), w.rf.rot, 42, -15)); w.after(0.45, shot); } else shot();
      },
      update(w, dt) { springTo0(w.rf, dt, 9); },
      drawFront(w, ctx) { drawRifle(ctx, grip(w), w.rf); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "glint", name: { en: "Scope Glint", ko: "조준경 반짝" }, param: "450ms tell",
          cap: { en: "*Glint* first. A big shot needs a *warning*.", ko: "먼저 *반짝*. 큰 한 방엔 *예고*가 필요해요." },
          glint(w, p) {
            w.spawn({ type: "star", x: p.x, y: p.y, size: 34, size1: 10, life: 0.45, color: "255,255,255" });
            w.spawn({ type: "rays", x: p.x, y: p.y, n: 4, size: 70, life: 0.45, vr: 4, color: "186,230,253" });
            w.hero.sx = 1.04; w.hero.sy = 0.96;
          },
        },
        {
          id: "streak", name: { en: "Vapor Line", ko: "공기 자국" }, param: "full path · 500ms",
          cap: { en: "Draw the *whole path* at once. Let it hang.", ko: "총알 길을 *한 번에* 긋고 잠깐 *남겨요*." },
          fire(w, m, b) {
            b.len = 160; b.lw = 3;
            const half = (b.hitX - m.x) / 2;
            w.spawn({ type: "slash", x: m.x + half, y: m.y, ang: 0, len: half, size: 4, life: 0.5, color: "255,236,200" });
          },
        },
        {
          id: "recoil", name: { en: "Heavy Recoil", ko: "큰 반동" }, param: "kick 24px · −24°",
          cap: { en: "Big gun, *big kick*. Body and camera too.", ko: "큰 총은 *크게* 튀어요. 몸도, 화면도." },
          fire(w) { w.rf.kick = 24; w.rf.rot = -0.42; w.hero.ox -= 12; w.shake(0.22, -1); },
        },
        {
          id: "bullet", name: { en: "Bullet Time", ko: "총알 시간" }, param: "×0.12 · cam follows",
          cap: { en: "*Slow down* and follow the bullet. Make them *wait*.", ko: "*느리게* 총알을 따라가요. 일부러 *기다리게*." },
          fire(w) { w.slowmo(0.12, 0.7); },
          update(w) { const b = w.shots[0]; w.cam.tx = b ? (b.x - 270) * 0.5 : 0; },
        },
        {
          id: "freeze", name: { en: "Kill Freeze", ko: "처치 순간 정지" }, param: "stop 300ms · zoom 12%",
          cap: { en: "On the kill, *freeze*. Zoom in a hair.", ko: "쓰러뜨리는 순간 *정지*. 살짝 *확대*." },
          kill(w, f) { w.hitstop(0.3); w.zoomPunch(0.12); w.flash("255,255,255", 0.35); f.flash = 1.5; },
        },
        {
          id: "launch", name: { en: "Body Launch", ko: "몸이 날아감" }, param: "vx 560 · spin 9",
          cap: { en: "After the freeze, *throw* the body back.", ko: "멈춘 다음, 몸을 *뒤로 날려요*." },
          kill(w, f) {
            w.fly(f, 560, -420, 9);
            for (let i = 0; i < 14; i++) w.spawn({ type: "smoke", x: f.x - 30, y: G - 100, vx: rand(80, 420), vy: rand(-140, 60), drag: 3, size: rand(4, 8), size1: rand(14, 22), life: rand(0.5, 0.9), color: "190,40,60" });
          },
        },
        {
          id: "bolt", name: { en: "Bolt Cycle", ko: "노리쇠 장전" }, param: "kick back + shell",
          cap: { en: "Rack the bolt. *Spit the shell* out.", ko: "노리쇠를 *철컥*, 탄피를 *툭* 뱉어요." },
          bolt(w, p) {
            w.rf.kick = -10; w.rf.rot = 0.14;
            w.spawn({ type: "shell", x: p.x, y: p.y, vx: rand(-140, -60), vy: -360, g: 1400, vr: -24, ground: true, bounce: 0.3, life: 4, size: 11, color: "250,204,21", hold: true });
            w.sfx.pump();
          },
        },
        {
          id: "sound", name: { en: "Crack + Echo", ko: "탕 + 메아리" }, param: "echo +250ms",
          cap: { en: "A sharp *crack*, then a *far echo*.", ko: "날카로운 *탕*, 뒤에 *멀리 울림*." },
          fire(w) { w.sfx.gun(0.75); w.play(() => nz({ dur: 0.9, f: 600, f2: 90, vol: 0.3, delay: 0.25 })); },
          hit(w) { w.sfx.hit(0.8); },
        },
      ],
    },

    /* ─────────────── 2. 미니건 ─────────────── */
    {
      id: "weapon-minigun", cat: "weapon", view: "side",
      title: { en: "Make a minigun *roar*", ko: "미니건이 *으르렁*거리게" },
      intro: { en: "A stream of dots. No *build-up*.", ko: "점만 줄줄 나가요. *쌓이는 맛*이 없어요." },
      interval: 0.3, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 100 }); w.foe = w.actor("foe", { home: 440 });
        w.mg = { hold: 0, spin: 0, ang: 0, heat: 0, glow: 0, over: 0, t: 0, n: 0 };
      },
      fire(w) { w.mg.hold = 0.5; },
      update(w, dt) {
        const g = w.mg;
        g.hold -= dt; g.over -= dt; g.t -= dt; g.glow = 0;
        if (g.hold <= 0 || g.over > 0) { g.spin = Math.max(0, g.spin - dt * 1.2); g.heat = Math.max(0, g.heat - dt * (g.over > 0 ? 0.8 : 0.25)); return; }
        if (w.on("spin") && g.spin < 1) { g.spin = Math.min(1, g.spin + dt * 2.2); w.emit("spinning", g); return; }
        if (g.t > 0) return;
        g.t = 0.065; g.n++; g.heat = Math.min(1, g.heat + 0.03);
        const m = loc(grip(w), 0, 114, rand(-3, 3)), f = w.foe;
        const b = { x: m.x, y: m.y, vx: 1900, vy: rand(-50, 50), r: 2.5, color: "#e5e7eb", hitX: f.x - 40 };
        b.onHit = () => hit(w, f, 2, { x: b.x, y: b.y });
        w.emit("fire", m, b, g);
        w.shoot(b);
        if (g.heat >= 1) w.emit("overheat", g);
      },
      drawFront(w, ctx) { drawMinigun(ctx, grip(w), w.mg); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "spin", name: { en: "Spin-up", ko: "예열 회전" }, param: "0 → full in 0.45s",
          cap: { en: "*Spin the barrels up* before the first bullet.", ko: "첫 발 전에 총열이 *위잉* 돌아가요." },
          spinning(w) { w.hero.ox = rand(-1.5, 1.5); },
          update(w, dt) { w.mg.ang += dt * w.mg.spin * 40; },
        },
        {
          id: "muzzle", name: { en: "Flicker Flash", ko: "깜빡이는 불꽃" }, param: "random size",
          cap: { en: "Random flash sizes. Never the *same twice*.", ko: "불꽃 크기를 *매번 다르게*." },
          fire(w, m) {
            w.spawn({ type: "glow", x: m.x + 8, y: m.y, size: rand(24, 50), life: 0.05, color: "255,200,110" });
            w.spawn({ type: "star", x: m.x + 10, y: m.y, size: rand(14, 30), life: 0.04, color: "255,245,220" });
          },
        },
        {
          id: "tracer", name: { en: "Every 3rd Tracer", ko: "세 발에 한 발 예광탄" }, param: "1 in 3",
          cap: { en: "Only *every third* bullet glows. Rhythm, not a laser.", ko: "*세 발에 한 발*만 빛나게. 레이저처럼 안 보여요." },
          fire(w, m, b, g) { if (g.n % 3 === 0) { b.len = 70; b.lw = 3.5; } },
        },
        {
          id: "chip", name: { en: "Chip Damage", ko: "갉아먹는 타격" }, param: "vib 3 · 3 sparks",
          cap: { en: "Tiny hits, *nonstop*. The target never stops *shaking*.", ko: "작은 타격이 *쉬지 않고*. 적이 계속 *떨려요*." },
          hit(w, at, f) { f.vib = 3; f.flash = 0.5; f.ox += 3; sparks(w, at.x, at.y, 3, "255,230,160", [120, 380], Math.PI * 0.7, Math.PI * 1.3); },
        },
        {
          id: "brass", name: { en: "Brass Waterfall", ko: "탄피 폭포" }, param: "1 shell / shot",
          cap: { en: "Shells *pour* out and *pile up*.", ko: "탄피가 *쏟아지고*, 바닥에 *쌓여요*." },
          fire(w, m) { w.spawn({ type: "shell", x: m.x - 80, y: m.y + 6, vx: rand(-120, -20), vy: rand(-220, -80), g: 1500, vr: rand(-30, 30), ground: true, bounce: 0.3, life: 3, size: 7, color: "250,204,21", hold: true }); },
        },
        {
          id: "heat", name: { en: "Heat Glow", ko: "달아오르는 총열" }, param: "grey → red → white",
          cap: { en: "Barrels glow *red*, then *white*. Heat you can see.", ko: "총열이 *빨갛게*, 더 하면 *하얗게*." },
          update(w) {
            const g = w.mg; g.glow = g.heat;
            if (g.heat > 0.5 && Math.random() < 0.3) { const p = loc(grip(w), 0, rand(60, 110), -6); w.spawn({ type: "smoke", x: p.x, y: p.y, vy: -60, size: 4, size1: 12, life: 0.6, color: "200,200,210" }); }
          },
        },
        {
          id: "vent", name: { en: "Overheat Vent", ko: "과열 배출" }, param: "lock 1.4s · steam",
          cap: { en: "Too hot? *Force a stop.* Blow out steam.", ko: "너무 뜨거우면 *강제로 멈춰요*. 김이 *푸슉*." },
          overheat(w, g) {
            g.over = 1.4; w.hero.ox -= 6;
            const p = loc(grip(w), 0, 80, -8);
            for (let i = 0; i < 16; i++) w.spawn({ type: "smoke", x: p.x + rand(-30, 30), y: p.y, vx: rand(-60, 60), vy: rand(-260, -80), drag: 2, size: rand(6, 10), size1: rand(22, 34), life: rand(0.7, 1.1), color: "235,235,245" });
            w.spawn({ type: "text", text: "OVERHEAT", x: p.x, y: p.y - 70, vy: -30, life: 1.2, size: 22, color: "#fca5a5" });
          },
        },
        {
          id: "sound", name: { en: "Whine + Brrt", ko: "위잉 + 드르륵" }, param: "rising whine",
          cap: { en: "A *rising whine*, then a *brrrt*, then a *hiss*.", ko: "*위잉* 올라가고, *드르륵*, 마지막엔 *치익*." },
          spinning(w, g) { w.play(() => tn({ type: "sawtooth", f: 90 + g.spin * 360, dur: 0.05, vol: 0.05 })); },
          fire(w) { w.sfx.smg(rand(0.75, 0.85)); },
          overheat(w) { w.play(() => nz({ dur: 0.9, type: "highpass", f: 3200, f2: 1400, vol: 0.3 })); },
        },
      ],
    },

    /* ─────────────── 3. 레이저 빔 ─────────────── */
    {
      id: "weapon-laser", cat: "weapon", view: "side",
      title: { en: "Make a laser beam *burn*", ko: "레이저가 *지지는* 느낌" },
      intro: { en: "A red thread. Is it *doing anything?*", ko: "빨간 실 한 가닥. *효과가 있긴* 해요?" },
      interval: 0.3, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 430 }); w.gun = { kick: 0, rot: 0 }; w.lz = { hold: 0, t: 0, L: null }; },
      fire(w) { w.lz.hold = 0.5; },
      update(w, dt) {
        const z = w.lz, f = w.foe;
        gunSpring(w, dt);
        z.hold -= dt; z.t -= dt; z.L = null;
        if (z.hold <= 0) return;
        const m = muzzle(w), end = f.alive ? f.x - 30 : 600;
        z.L = { x0: m.x, y0: m.y, x1: end, y1: m.y, w: 1.5, glow: 0, jit: 0 };
        w.emit("beam", z.L);
        if (z.t <= 0) { z.t = 0.08; hit(w, f, 2, { x: end, y: m.y }); }
      },
      drawFront(w, ctx) { drawGun(w, ctx); drawLaser(ctx, w.lz.L, w.time); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "core", name: { en: "Hot Core + Halo", ko: "하얀 심 + 번짐" }, param: "core 4px · halo 26px",
          cap: { en: "*White core*, colored halo. That reads as *hot*.", ko: "가운데는 *하얗게*, 바깥은 붉게. 그래야 *뜨거워* 보여요." },
          beam(w, L) { L.w = 5; L.glow = 26; },
        },
        {
          id: "flicker", name: { en: "Flicker", ko: "일렁임" }, param: "width ±30% · wave 2.5",
          cap: { en: "A steady line looks *dead*. Make it *flicker*.", ko: "가만히 있으면 *죽은 선*. *일렁이게* 해요." },
          beam(w, L) { L.w *= rand(0.7, 1.3); L.jit = 2.5; },
        },
        {
          id: "burn", name: { en: "Burn Point", ko: "닿는 점" }, param: "glow + spray",
          cap: { en: "Where it touches: a *hot spot* and a *spray*.", ko: "닿는 곳에 *뜨거운 점*과 *불티*." },
          beam(w, L) {
            w.spawn({ type: "glow", x: L.x1, y: L.y1, size: rand(28, 40), life: 0.05, color: "255,120,90" });
            w.spawn({ type: "spark", x: L.x1, y: L.y1, vx: rand(-420, -120), vy: rand(-300, 200), g: 900, drag: 2, size: 2, life: rand(0.2, 0.4), color: "255,220,150" });
          },
        },
        {
          id: "emitter", name: { en: "Emitter Shudder", ko: "총구 떨림" }, param: "kick 1–3px",
          cap: { en: "The gun *shudders* while it holds the beam.", ko: "쏘는 동안 총이 *덜덜* 떨려요." },
          beam(w, L) {
            w.gun.kick = rand(1, 3);
            w.spawn({ type: "glow", x: L.x0, y: L.y0, size: rand(20, 28), life: 0.05, color: "255,90,110" });
          },
        },
        {
          id: "sizzle", name: { en: "Sizzle", ko: "지글지글" }, param: "tint + smoke",
          cap: { en: "The target *reddens* and *smokes*.", ko: "맞는 쪽이 *붉어지고* *연기*가 나요." },
          hit(w, at, f) {
            f.tint = 0.6; f.vib = 2;
            w.spawn({ type: "smoke", x: at.x + rand(0, 20), y: at.y, vx: rand(-20, 20), vy: rand(-110, -60), size: 4, size1: 16, life: 0.8, color: "90,90,100" });
          },
        },
        {
          id: "light", name: { en: "Light Spill", ko: "빛이 번짐" }, param: "floor glow",
          cap: { en: "Let the beam *light up the floor*.", ko: "빔이 *바닥까지* 밝혀요." },
          beam(w, L) {
            w.spawn({ type: "ellipse", under: true, x: (L.x0 + L.x1) / 2, y: G, size: (L.x1 - L.x0) * 0.6, life: 0.05, color: "255,60,80", alpha: 0.45, add: true });
            w.spawn({ type: "glow", x: (L.x0 + L.x1) / 2, y: L.y0, size: 140, life: 0.05, color: "255,40,60", alpha: 0.18 });
          },
        },
        {
          id: "sound", name: { en: "Hum + Sizzle", ko: "웅 + 지직" }, param: "saw 160Hz",
          cap: { en: "A low *hum* that never stops, *sizzle* on top.", ko: "끊기지 않는 *웅*, 위에 *지직*." },
          hit(w) { w.play(() => { tn({ type: "sawtooth", f: rand(150, 165), dur: 0.1, vol: 0.08 }); nz({ dur: 0.08, type: "bandpass", f: 3200, q: 2, vol: 0.14 }); }); },
        },
      ],
    },

    /* ─────────────── 4. 로켓 런처 ─────────────── */
    {
      id: "weapon-rocket", cat: "weapon", view: "side",
      title: { en: "Make a rocket launcher *thunder*", ko: "로켓포를 *우르릉*하게" },
      intro: { en: "It's a rocket. It flies like a *pencil*.", ko: "로켓인데 *연필*처럼 날아가요." },
      interval: 1.5, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 450 }); w.tube = { kick: 0 }; },
      fire(w) {
        const h = w.hero, t = { x: h.x + h.ox, y: G - 104 }, f = w.foe;
        const m = { x: t.x + 60 - w.tube.kick, y: t.y }, back = { x: t.x - 54, y: t.y };
        const r = { x: m.x, y: m.y, vx: 900, vy: 0, draw: drawRocket, hitX: f.x - 50 };
        r.onHit = () => { const at = { x: r.x + 10, y: r.y }; w.emit("blast", at); hit(w, f, 50, at); };
        w.emit("fire", m, r, back);
        w.shoot(r);
      },
      update(w, dt) {
        w.tube.kick -= w.tube.kick * Math.min(1, dt * 8);
        for (const r of w.shots) if (r.acc) r.vx = Math.min(1500, r.vx + r.acc * dt);
      },
      drawFront(w, ctx) { const h = w.hero; drawTube(ctx, { x: h.x + h.ox, y: G - 104 }, w.tube.kick); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "backblast", name: { en: "Backblast", ko: "후폭풍" }, param: "10 puffs behind",
          cap: { en: "Fire comes out the *back* too. That's what sells it.", ko: "*뒤로도* 불이 뿜어져요. 그게 로켓이에요." },
          fire(w, m, r, b) {
            w.tube.kick = 14; w.hero.ox -= 8;
            w.spawn({ type: "glow", x: b.x - 10, y: b.y, size: 70, size1: 20, life: 0.15, color: "255,190,100" });
            for (let i = 0; i < 10; i++) w.spawn({ type: "smoke", x: b.x, y: b.y, vx: rand(-460, -140), vy: rand(-120, 80), drag: 3, size: rand(6, 10), size1: rand(24, 36), life: rand(0.6, 1.1), color: "200,200,205" });
          },
        },
        {
          id: "boost", name: { en: "Slow Start → Boost", ko: "느린 출발 → 가속" }, param: "160 → 1500 px/s",
          cap: { en: "Leave the tube *slow*, then *kick in*.", ko: "*천천히* 나와서, *확* 가속해요." },
          fire(w, m, r) { r.vx = 160; r.acc = 3200; },
        },
        {
          id: "trail", name: { en: "Smoke Trail", ko: "연기 꼬리" }, param: "linger 1.2s",
          cap: { en: "A *thick smoke trail* that hangs in the air.", ko: "*굵은 연기*가 공중에 *남아요*." },
          update(w) {
            for (const r of w.shots) w.spawn({ type: "smoke", x: r.x - 24, y: r.y + rand(-2, 2), vx: rand(-30, 30), vy: rand(-30, -5), drag: 1, size: 5, size1: rand(14, 22), life: 1.2, color: "170,170,180" });
          },
        },
        {
          id: "fireball", name: { en: "Fireball", ko: "불덩이" }, param: "glow 130 + ring",
          cap: { en: "Impact = a *fireball*, not a pop.", ko: "맞으면 *톡* 말고 *불덩이*." },
          blast(w, at) {
            w.spawn({ type: "glow", x: at.x, y: at.y, size: 130, size1: 50, life: 0.35, color: "255,170,60" });
            w.spawn({ type: "ring", x: at.x, y: at.y, size: 12, size1: 150, life: 0.35, w: 12, color: "255,230,190" });
            for (let i = 0; i < 18; i++) w.spawn({ type: "glow", x: at.x, y: at.y, vx: rand(-300, 300), vy: rand(-360, 140), drag: 3.5, size: rand(20, 32), size1: 4, life: rand(0.35, 0.6), color: i % 3 ? "255,130,40" : "255,230,140" });
            smokeAt(w, at.x, at.y - 20, 10, "70,70,80", 90, 1.4);
          },
        },
        {
          id: "punch", name: { en: "Shake + Flash", ko: "흔들림 + 번쩍" }, param: "trauma .6 · stop 80ms",
          cap: { en: "*Freeze*, *flash*, *shake*. All three, at once.", ko: "*멈칫*, *번쩍*, *흔들*. 셋을 동시에." },
          blast(w) { w.hitstop(0.08); w.shake(0.6, 1); w.flash("255,210,150", 0.4); w.zoomPunch(0.06); },
        },
        {
          id: "debris", name: { en: "Debris + Scorch", ko: "파편 + 그을음" }, param: "12 chunks · decal 5s",
          cap: { en: "Rocks fly, a *scorch* stays, the target *launches*.", ko: "돌이 튀고, *그을음*이 남고, 적은 *날아가요*." },
          blast(w, at) {
            for (let i = 0; i < 12; i++) w.spawn({ type: "chunk", x: at.x, y: G - 10, vx: rand(-380, 380), vy: rand(-700, -250), g: 1600, ground: true, bounce: 0.35, vr: rand(-20, 20), life: rand(1.6, 2.4), size: rand(4, 8), color: pick(["120,113,108", "87,83,78", "168,162,158"]), hold: true });
            w.spawn({ type: "ellipse", under: true, x: at.x, y: G + 2, size: 80, life: 5, color: "15,10,8", alpha: 0.65, hold: true, add: false });
          },
          kill(w, f) { w.fly(f, 380, -900, 12); },
        },
        {
          id: "sound", name: { en: "Whoosh + Boom", ko: "슈욱 + 쾅" }, param: "launch / boom",
          cap: { en: "A *whoosh* that rises, then a deep *boom*.", ko: "올라가는 *슈욱*, 그리고 깊은 *쾅*." },
          fire(w) { w.sfx.shotgun(); w.sfx.boost(); },
          blast(w) { w.sfx.boom(); },
        },
      ],
    },

    /* ─────────────── 5. 화염방사기 ─────────────── */
    {
      id: "weapon-flamethrower", cat: "weapon", view: "side",
      title: { en: "Make a flamethrower *roar*", ko: "화염방사기가 *활활*" },
      intro: { en: "Orange dots. That's not *fire*.", ko: "주황 점들. 이건 *불*이 아니에요." },
      interval: 0.3, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 380 }); w.fl = { hold: 0, t: 0, tick: 0 }; },
      fire(w) { w.fl.hold = 0.5; },
      update(w, dt) {
        const s = w.fl, f = w.foe;
        s.hold -= dt; s.t -= dt; s.tick -= dt;
        if (s.hold <= 0) return;
        const m = loc(grip(w), 0, 76, 0);
        if (s.t <= 0) {
          s.t = 0.02;
          const p = { type: "circle", x: m.x, y: m.y, vx: rand(480, 560), vy: rand(-25, 25), size: 5, life: 0.55, color: "255,150,60" };
          w.emit("flame", p, m);
          w.spawn(p);
        }
        if (s.tick <= 0) { s.tick = 0.12; hit(w, f, 3, { x: f.x - 40, y: m.y + rand(-30, 10) }); }
      },
      drawFront(w, ctx) { drawTorch(ctx, w); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "billow", name: { en: "Grow + Rise", ko: "커지며 솟기" }, param: "5 → 36px · drag 2.2",
          cap: { en: "Flames *swell*, *slow down*, and *rise*.", ko: "불은 *커지고*, *느려지고*, *위로* 솟아요." },
          flame(w, p) { p.type = "glow"; p.size1 = 36; p.drag = 2.2; p.g = -240; p.vy *= 3; },
        },
        {
          id: "core", name: { en: "White-hot Nozzle", ko: "하얀 불꽃 시작점" }, param: "core 14px",
          cap: { en: "*Hottest* at the nozzle. White first, then orange.", ko: "총구 쪽이 *제일 뜨거워요*. 하얀색 → 주황." },
          flame(w, p, m) { w.spawn({ type: "glow", x: m.x + 8, y: m.y, vx: p.vx * 0.5, drag: 5, size: 14, size1: 3, life: 0.14, color: "255,245,200" }); },
        },
        {
          id: "smoke", name: { en: "Smoke Tail", ko: "검은 연기" }, param: "35% · 1.1s",
          cap: { en: "Fire *ends in smoke*. Dark puffs at the tip.", ko: "불 끝은 *연기*로. 끝자락에 검은 연기." },
          flame(w, p) { if (Math.random() < 0.35) w.spawn({ type: "smoke", x: p.x + 50, y: p.y - 10, vx: p.vx * 0.4, vy: rand(-90, -40), drag: 1.5, size: 6, size1: 26, life: 1.1, color: "60,55,55" }); },
        },
        {
          id: "ignite", name: { en: "Set Ablaze", ko: "불붙음" }, param: "burn 1.2s · embers",
          cap: { en: "The target *catches fire*. Embers fly off.", ko: "맞은 쪽에 *불이 붙어요*. 불티가 *훨훨*." },
          hit(w, at, f) {
            f.burn = 1.2; f.vib = 2;
            w.spawn({ type: "glow", x: f.x + rand(-40, 40), y: G - rand(20, 110), vy: rand(-140, -60), size: rand(6, 12), size1: 0, life: 0.6, color: "255,170,60" });
          },
          update(w, dt) { const f = w.foe; f.burn = Math.max(0, f.burn - dt); },
        },
        {
          id: "floor", name: { en: "Fire on the Floor", ko: "바닥에 남는 불" }, param: "6% · 1.4s",
          cap: { en: "Leave *small fires* on the ground where it passed.", ko: "지나간 바닥에 *작은 불*이 남아요." },
          flame(w, p, m) { if (Math.random() < 0.06) w.spawn({ type: "glow", x: m.x + rand(60, 200), y: G - 8, vy: -20, size: rand(10, 16), size1: rand(22, 30), life: rand(1, 1.6), hold: true, color: "255,120,40" }); },
        },
        {
          id: "light", name: { en: "Warm Light", ko: "주변이 환해짐" }, param: "floor + air glow",
          cap: { en: "The whole scene *glows orange*.", ko: "주변 전체가 *주황빛*으로 물들어요." },
          update(w) {
            if (w.fl.hold <= 0) return;
            w.spawn({ type: "ellipse", under: true, x: 260, y: G, size: rand(170, 200), life: 0.05, color: "255,130,40", alpha: 0.5, add: true });
            w.spawn({ type: "glow", x: 260, y: G - 70, size: rand(150, 170), life: 0.05, color: "255,110,30", alpha: 0.22 });
          },
        },
        {
          id: "sound", name: { en: "Roar", ko: "화르륵" }, param: "noise 700→300Hz",
          cap: { en: "A rough, *rolling roar*. No clean tones.", ko: "거칠게 *화르르륵*. 맑은 소리는 빼요." },
          hit(w) { w.play(() => { nz({ dur: 0.18, f: 800, f2: 300, vol: 0.4 }); nz({ dur: 0.1, type: "bandpass", f: 2400, q: 1, vol: 0.12 }); }); },
        },
      ],
    },

    /* ─────────────── 6. 레일건 ─────────────── */
    {
      id: "weapon-railgun", cat: "weapon", view: "side",
      title: { en: "Make a railgun *charge* and *pierce*", ko: "레일건 *모았다가 관통*" },
      intro: { en: "Click. Two enemies gone. *Did I do that?*", ko: "딸깍. 둘 다 사라짐. *내가 한 거야?*" },
      interval: 1.7, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 80 });
        w.foes = [w.actor("foe", { home: 330 }), w.actor("foe", { home: 470 })];
        w.rg = { kick: 0, rot: 0, charge: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const shoot = () => {
          const m = loc(grip(w), w.rg.rot, 124 - w.rg.kick, -1);
          w.rg.charge = 0;
          w.spawn({ type: "slash", x: (m.x + 600) / 2, y: m.y, ang: 0, len: (600 - m.x) / 2, size: 2, life: 0.08, color: "200,240,255" });
          w.emit("fire", m);
          for (const f of w.foes) hit(w, f, 100, { x: f.x - 20, y: m.y });
          w.after(0.4, () => { w.busy = false; });
        };
        if (w.on("charge")) { w.emit("charge", w.rg); w.after(0.7, shoot); } else shoot();
      },
      update(w, dt) { springTo0(w.rg, dt, 6); },
      drawFront(w, ctx) { drawRail(ctx, grip(w), w.rg); },
      drawHud(w, ctx) { w.foes.forEach(f => drawBar(ctx, f)); },
      steps: [
        {
          id: "charge", name: { en: "Coil Charge", ko: "코일 충전" }, param: "5 coils · 700ms",
          cap: { en: "Light the coils *one by one*. The wait is the hype.", ko: "코일이 *하나씩* 켜져요. 기다림이 곧 기대감." },
          charge(w, g) { w.tween(g, { charge: 1 }, 0.65, "in"); w.hero.sx = 1.05; w.hero.sy = 0.95; },
        },
        {
          id: "arcs", name: { en: "Crackling Arcs", ko: "지직거리는 전기" }, param: "more as it fills",
          cap: { en: "*Sparks jump* between the rails. More as it fills.", ko: "레일 사이로 *전기가 튀어요*. 찰수록 더 많이." },
          update(w) {
            const g = w.rg; if (g.charge < 0.1 || Math.random() > g.charge) return;
            const a = loc(grip(w), g.rot, rand(20, 120), -8), pts = zig(0, 0, rand(-6, 6), 16, 4, 5);
            w.spawn({ type: "crack", x: a.x, y: a.y, pts, w: 1.6, life: 0.06, color: "165,243,252", add: true });
          },
        },
        {
          id: "beam", name: { en: "Fat Beam", ko: "굵은 빔" }, param: "18px → 0 · 350ms",
          cap: { en: "A *thick* beam that *thins out*. Not a thread.", ko: "실 말고 *굵은 빔*. 그리고 *가늘어지며* 사라져요." },
          fire(w, m) {
            const half = (600 - m.x) / 2;
            w.spawn({ type: "slash", x: m.x + half, y: m.y, ang: 0, len: half, size: 20, life: 0.35, color: "56,189,248" });
            w.spawn({ type: "slash", x: m.x + half, y: m.y, ang: 0, len: half, size: 7, life: 0.3, color: "255,255,255" });
            w.spawn({ type: "glow", x: m.x, y: m.y, size: 60, size1: 10, life: 0.2, color: "186,230,253" });
          },
        },
        {
          id: "helix", name: { en: "Spiral Trail", ko: "나선 꼬리" }, param: "48 dots · sine",
          cap: { en: "A *spiral* wraps the beam and lingers.", ko: "빔을 감는 *나선*이 남아요." },
          fire(w, m) {
            for (let i = 0; i < 48; i++) w.spawn({ type: "glow", x: m.x + i * 9, y: m.y + Math.sin(i * 0.8) * 12, vy: Math.cos(i * 0.8) * 20, size: 6, size1: 1, life: 0.5 + i * 0.008, color: "125,211,252" });
          },
        },
        {
          id: "pierce", name: { en: "Exit Burst", ko: "뚫고 나감" }, param: "spray out the back",
          cap: { en: "Spray out the *back* of each target. It went *through*.", ko: "적 *등 뒤로* 튀어나와요. *뚫고* 지나간 거예요." },
          hit(w, at, f) {
            f.flash = 1.4;
            sparks(w, f.x + 30, at.y, 12, "165,243,252", [300, 800], -0.35, 0.35);
            w.spawn({ type: "ring", x: f.x, y: at.y, size: 6, size1: 50, life: 0.25, w: 6, color: "186,230,253" });
          },
          kill(w, f) { w.fly(f, rand(240, 380), -380, 7); },
        },
        {
          id: "recoil", name: { en: "Slide Back", ko: "뒤로 밀림" }, param: "hero −30px · flash",
          cap: { en: "The shooter *slides back*. Screen goes *blue-white*.", ko: "쏜 사람이 *쭉 밀려요*. 화면은 *파랗게* 번쩍." },
          fire(w) {
            w.rg.kick = 30; w.rg.rot = -0.3; w.hero.ox -= 30; w.hero.k = 4;
            dust(w, w.hero.x + 10, G, 6, -1);
            w.shake(0.5, -1); w.flash("200,240,255", 0.5);
          },
        },
        {
          id: "sound", name: { en: "Whine + Zap", ko: "위이잉 + 쩡" }, param: "300→1800Hz",
          cap: { en: "A *rising whine* while charging, then a sharp *zap*.", ko: "모을 땐 *위이잉*, 쏠 땐 *쩡*." },
          charge(w) { w.play(() => { tn({ f: 300, f2: 1800, dur: 0.7, vol: 0.12 }); nz({ dur: 0.7, type: "bandpass", f: 500, f2: 4000, q: 6, vol: 0.1 }); }); },
          fire(w) { w.sfx.burst(); w.play(() => nz({ dur: 0.45, type: "highpass", f: 4200, f2: 1500, vol: 0.4 })); },
        },
      ],
    },

    /* ─────────────── 7. 부메랑 ─────────────── */
    {
      id: "weapon-boomerang", cat: "weapon", view: "top",
      title: { en: "Make a boomerang *come back*", ko: "부메랑이 *돌아오는* 맛" },
      intro: { en: "Out, back. Like a *yo-yo*.", ko: "나갔다 들어옴. *요요* 같아요." },
      interval: 1.5, stepDur: 3.8,
      drawFloor(w, ctx) { arena(ctx); },
      setup(w) {
        w.hero = w.actor("heroTop", { home: 100, gy: 180 });
        w.foes = [[275, 85], [455, 180], [275, 275]].map(([x, y]) => w.actor("foeTop", { home: x, gy: y }));
        w.bm = { t: -1, x: 0, y: 0, rot: 0, r: 0, hits: [] };
        boomerangSprite();
      },
      fire(w) {
        const b = w.bm;
        if (b.t >= 0) return;
        Object.assign(b, { t: 0, r: 0, hits: [], turn: 0 });
        w.emit("throw", b);
      },
      update(w, dt) {
        const b = w.bm, h = w.hero;
        if (b.t < 0) return;
        b.t += dt / 1.1;
        const a = Math.min(1, b.t) * TAU;
        b.x = h.x + 175 * (1 - Math.cos(a)) + 24; b.y = h.gy - b.r * Math.sin(a);
        w.emit("fly", b);
        for (const f of w.foes) {
          if (!f.alive || b.hits.includes(f) || Math.hypot(b.x - f.x - f.ox, b.y - f.gy - f.oy) > 34) continue;
          b.hits.push(f);
          hit(w, f, 15, { x: b.x, y: b.y }, b);
        }
        if (b.t >= 1) { b.t = -1; w.emit("catch", { x: h.x + 24, y: h.gy }); }
      },
      drawFront(w, ctx) {
        const b = w.bm, h = w.hero, img = SPR["weapon-boomerang"].c;
        const x = b.t >= 0 ? b.x : h.x + h.ox + 24, y = b.t >= 0 ? b.y : h.gy + h.oy + 14;
        ctx.save(); ctx.translate(x, y); ctx.rotate(b.t >= 0 ? b.rot : 0.6); ctx.drawImage(img, -26, -26, 52, 52); ctx.restore();
      },
      drawHud(w, ctx) { w.foes.forEach(f => drawBar(ctx, f)); },
      steps: [
        {
          id: "spin", name: { en: "Spin", ko: "회전" }, param: "24 rad/s",
          cap: { en: "A flat sliding stick is *dead*. Make it *spin*.", ko: "미끄러지는 막대는 *죽어 보여요*. *돌려요*." },
          update(w, dt) { if (w.bm.t >= 0) w.bm.rot += dt * 24; },
        },
        {
          id: "curve", name: { en: "Curved Path", ko: "휘는 궤도" }, param: "ellipse r 100",
          cap: { en: "Out on one side, *back on the other*. A loop, not a line.", ko: "한쪽으로 나가 *반대쪽으로* 돌아와요." },
          throw(w, b) { b.r = 100; },
        },
        {
          id: "trail", name: { en: "Swirl Trail", ko: "회오리 꼬리" }, param: "arc smear + glow",
          cap: { en: "Leave a *swirl* behind so you read the *loop*.", ko: "*회오리* 자국을 남겨서 *궤도*가 보이게." },
          fly(w, b) {
            w.spawn({ type: "arc", x: b.x, y: b.y, size: 24, a0: b.rot, a1: b.rot + 2.2, life: 0.1, color: "255,255,255" });
            w.spawn({ type: "glow", x: b.x, y: b.y, size: 12, size1: 2, life: 0.45, color: "253,224,71" });
          },
        },
        {
          id: "hit", name: { en: "Hit, Don't Stop", ko: "맞혀도 안 멈춤" }, param: "stop 40ms · push",
          cap: { en: "Tiny *stop*, *push*, and it *keeps flying*.", ko: "*살짝 멈칫*, *밀고*, 그대로 *계속* 날아가요." },
          hit(w, at, f) {
            w.hitstop(0.04); f.flash = 1;
            const a = Math.atan2(f.gy - w.hero.gy, f.x - w.hero.x); f.ox += Math.cos(a) * 14; f.oy += Math.sin(a) * 14;
            sparks(w, at.x, at.y, 8, "255,230,160", [120, 360]);
          },
        },
        {
          id: "catch", name: { en: "Catch Pop", ko: "잡는 순간" }, param: "squash + ring",
          cap: { en: "Make the *catch* a moment. Squash, ring, done.", ko: "*받는 순간*도 챙겨요. 꾹, 고리, 끝." },
          catch(w, p) {
            w.hero.sx = 1.25; w.hero.sy = 1.25;
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 8, size1: 46, life: 0.25, w: 5, color: "253,224,71" });
            w.spawn({ type: "star", x: p.x, y: p.y, size: 26, life: 0.15, color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Whup Whup", ko: "휙휙" }, param: "1 swish / turn",
          cap: { en: "One *whup* per turn. You *hear* it spin.", ko: "한 바퀴에 *휙* 한 번. 도는 게 *들려요*." },
          fly(w, b) { const n = Math.floor(b.rot / TAU); if (n !== b.turn) { b.turn = n; w.sfx.swish(); } },
          hit(w) { w.sfx.thunk(); },
          catch(w) { w.sfx.clickDown(); },
        },
      ],
    },

    /* ─────────────── 8. 채찍 ─────────────── */
    {
      id: "weapon-whip", cat: "weapon", view: "side",
      title: { en: "Make a whip *CRACK*", ko: "채찍이 *짝!* 하게" },
      intro: { en: "A stick that swings. Where's the *crack?*", ko: "막대가 휘둘러질 뿐. *짝* 소리는요?" },
      interval: 1.2, stepDur: 3.4,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 385 }); w.wp = { t: -1, lag: 0, tip: null, done: false }; },
      fire(w) {
        const s = w.wp;
        if (s.t >= 0) return;
        Object.assign(s, { t: 0, lag: 0, done: false });
        w.emit("swing", s);
      },
      update(w, dt) {
        const s = w.wp;
        s.pts = whipPts(w, s);
        s.tip = s.pts[s.pts.length - 1];
        if (s.t < 0) return;
        s.t += dt / 0.3;
        if (!s.done && s.t - 13 * s.lag >= 1) {
          s.done = true;
          const f = w.foe, p = { x: s.tip[0], y: s.tip[1] };
          w.emit("crack", p);
          if (p.x > f.x - f.w / 2 - 12) hit(w, f, 20, p);
          w.after(0.3, () => { s.t = -1; });
        }
      },
      drawFront(w, ctx) {
        const g = grip(w), pts = w.wp.pts; if (!pts) return;
        for (let i = 1; i < pts.length; i++) line(ctx, [pts[i - 1], pts[i]], "#8a5a34", 5.5 - i * 0.32);
        ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(-0.5); box(ctx, -18, -4, 24, 8, "#3b2a1e"); ctx.restore();
      },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "wave", name: { en: "Rolling Wave", ko: "물결처럼 펴짐" }, param: "lag 45ms / segment",
          cap: { en: "Each segment *follows late*. The whip *unrolls*.", ko: "마디가 *조금씩 늦게* 따라와요. 채찍이 *풀려요*." },
          swing(w, s) { s.lag = 0.045; },
        },
        {
          id: "crack", name: { en: "Tip Crack", ko: "끝에서 짝" }, param: "star + ring",
          cap: { en: "The *tip* breaks the sound barrier. Pop it *there*.", ko: "*끝*에서 소리가 터져요. 거기서 *팍*." },
          crack(w, p) {
            w.spawn({ type: "star", x: p.x, y: p.y, size: 46, life: 0.12, color: "255,255,255" });
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 6, size1: 56, life: 0.22, w: 6, color: "255,240,200" });
            w.spawn({ type: "rays", x: p.x, y: p.y, n: 8, size: 60, life: 0.15, color: "255,250,230" });
          },
        },
        {
          id: "trail", name: { en: "Tip Trail", ko: "끝 궤적" }, param: "glow streak",
          cap: { en: "Trace only the *tip*. That's where the speed is.", ko: "*끝부분*만 궤적을. 속도는 거기 있어요." },
          update(w) { const s = w.wp; if (s.t >= 0 && !s.done) w.spawn({ type: "glow", x: s.tip[0], y: s.tip[1], size: 10, size1: 2, life: 0.22, color: "255,220,170" }); },
        },
        {
          id: "stop", name: { en: "Snap Stop", ko: "찰나 정지" }, param: "60ms",
          cap: { en: "A *tiny* freeze on the crack. Snappy, not heavy.", ko: "짝 하는 순간 *아주 짧게* 멈춰요. 무겁지 않게." },
          crack(w) { w.hitstop(0.06); w.kick(6, 0); },
        },
        {
          id: "sting", name: { en: "Sting", ko: "따끔" }, param: "red flash · jolt",
          cap: { en: "The target *jolts* and goes *red*. It *stings*.", ko: "맞은 쪽이 *움찔*, *빨개져요*. *따끔*하게." },
          hit(w, at, f) {
            f.tint = 1; f.vib = 5; f.ox += 14; f.sy = 1.12; f.sx = 0.9;
            w.spawn({ type: "text", text: "SNAP!", x: at.x + 10, y: at.y - 40, vy: -120, life: 0.6, size: 26, color: "#fde047" });
          },
        },
        {
          id: "sound", name: { en: "Swish + Crack", ko: "휙 + 짝" }, param: "highpass 5kHz",
          cap: { en: "A soft *swish*, then a *very short, very sharp* crack.", ko: "부드러운 *휙*, 그리고 *아주 짧고 날카로운* 짝." },
          swing(w) { w.sfx.swish(); },
          crack(w) { w.play(() => { nz({ dur: 0.04, type: "highpass", f: 5000, vol: 0.6 }); tn({ type: "square", f: 1800, f2: 600, dur: 0.03, vol: 0.15 }); }); },
        },
      ],
    },

    /* ─────────────── 9. 창 찌르기 ─────────────── */
    {
      id: "weapon-spear", cat: "weapon", view: "side",
      title: { en: "Make a spear thrust *reach*", ko: "창 찌르기에 *사거리* 느낌" },
      intro: { en: "Long weapon. Feels *short*.", ko: "긴 무기인데 *짧게* 느껴져요." },
      interval: 1.15, stepDur: 3.4,
      setup(w) { w.hero = w.actor("hero", { home: 100 }); w.foe = w.actor("foe", { home: 430 }); w.sp = { ext: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const s = w.sp;
        const thrust = () => {
          w.emit("go", s);
          w.tween(s, { ext: 96 }, 0.07, "in", () => {
            const tip = spearTip(w), f = w.foe;
            w.emit("thrust", tip);
            if (tip.x > f.x + f.ox - f.w / 2 + 6) hit(w, f, 20, tip);
            w.after(0.18, () => w.tween(s, { ext: 0 }, 0.25, "inout", () => { w.busy = false; }));
          });
        };
        if (w.on("windup")) { w.emit("windup", s); w.after(0.2, thrust); } else thrust();
      },
      drawFront(w, ctx) {
        const g = grip(w), x = g.x + w.sp.ext;
        line(ctx, [[x - 70, g.y + 4], [x + 118, g.y - 2]], "#a16207", 5);
        poly(ctx, [[x + 116, g.y - 8], [x + 146, g.y - 3], [x + 116, g.y + 3]], "#e5e7eb");
        box(ctx, x + 110, g.y - 7, 6, 10, "#64748b");
      },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "windup", name: { en: "Draw Back", ko: "뒤로 빼기" }, param: "−26px · 200ms",
          cap: { en: "Pull the spear *back* first. Then it *shoots*.", ko: "먼저 *뒤로 쭉*. 그래야 *쏘아져요*." },
          windup(w, s) { w.tween(s, { ext: -26 }, 0.18, "out"); w.hero.sx = 1.08; w.hero.sy = 0.93; },
        },
        {
          id: "lunge", name: { en: "Step In", ko: "한 발 내딛기" }, param: "body +26px",
          cap: { en: "The *body* goes with it. Arms alone feel weak.", ko: "*몸*도 같이 나가요. 팔만 뻗으면 약해 보여요." },
          go(w) { w.hero.ox = 26; w.hero.sx = 0.92; w.hero.sy = 1.06; },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "6 streaks",
          cap: { en: "Straight *streaks* along the shaft. Pure speed.", ko: "창대를 따라 *곧은 줄*. 속도만 보여줘요." },
          thrust(w, tip) { for (let i = 0; i < 6; i++) w.spawn({ type: "slash", x: tip.x - rand(40, 150), y: tip.y + rand(-16, 16), ang: 0, len: rand(20, 40), size: 2, life: 0.16, color: "255,255,255" }); },
        },
        {
          id: "glint", name: { en: "Tip Flash", ko: "창끝 번쩍" }, param: "star at tip",
          cap: { en: "Flash the *tip*. Show exactly *where* it reaches.", ko: "*창끝*을 번쩍. *어디까지* 닿는지 보여줘요." },
          thrust(w, tip) {
            w.spawn({ type: "star", x: tip.x, y: tip.y, size: 30, life: 0.12, color: "255,255,255" });
            w.spawn({ type: "glow", x: tip.x, y: tip.y, size: 40, size1: 8, life: 0.15, color: "255,240,200" });
          },
        },
        {
          id: "pierce", name: { en: "Pierce Through", ko: "뚫고 나감" }, param: "exit spray + push",
          cap: { en: "Spray out the *back*. Push along the *line*.", ko: "*등 뒤로* 튀어나오고, *찌른 방향*으로 밀려요." },
          hit(w, at, f) {
            f.flash = 1; f.ox += 34; f.k = 4; f.sx = 0.88; f.sy = 1.08;
            sparks(w, f.x + 40, at.y, 10, "255,220,170", [300, 700], -0.25, 0.25);
          },
          kill(w, f) { w.fly(f, 600, -260, 6); },
        },
        {
          id: "sweet", name: { en: "Sweet Spot", ko: "끝에 맞으면 강하게" }, param: "tip hit ×2",
          cap: { en: "Reward the *max range* hit. Tip = *double*.", ko: "*최대 사거리*에서 맞히면 *두 배*." },
          hit(w, at, f) {
            f.hp -= 20; w.hitstop(0.07);
            w.spawn({ type: "text", text: "TIP ×2", x: at.x - 30, y: at.y - 24, vy: -140, life: 0.7, size: 26, color: "#fde047" });
          },
        },
        {
          id: "sound", name: { en: "Swish + Stab", ko: "슉 + 푹" }, param: "dash / slashHit",
          cap: { en: "A fast *swish*, then a short *stab*.", ko: "빠른 *슉*, 짧은 *푹*." },
          thrust(w) { w.sfx.dash(); },
          hit(w) { w.sfx.slashHit(); },
        },
      ],
    },

    /* ─────────────── 10. 쌍단검 연타 ─────────────── */
    {
      id: "weapon-daggers", cat: "weapon", view: "side",
      title: { en: "Make a dagger flurry *rip*", ko: "단검 연타를 *다다닥*" },
      intro: { en: "Five hits. Felt like *one*.", ko: "다섯 번 쳤는데 *한 번* 같아요." },
      interval: 1.2, stepDur: 3.4,
      setup(w) { w.hero = w.actor("hero", { home: 240 }); w.foe = w.actor("foe", { home: 380 }); w.dg = [0, 0]; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        for (let i = 0; i < 5; i++) w.after(i * 0.08, () => {
          w.dg[i % 2] = 26; w.hero.ox = 6;
          const at = { x: f.x - 45 + rand(-6, 6), y: G - 70 - (i % 2) * 18 + rand(-6, 6) };
          w.emit("stab", i, at);
          hit(w, f, 6, at, i);
        });
        w.after(0.48, () => {
          const at = { x: f.x - 40, y: G - 76 };
          w.emit("finish", at);
          hit(w, f, 10, at, 5);
          w.busy = false;
        });
      },
      update(w, dt) {
        w.dg = w.dg.map(v => v - v * Math.min(1, dt * 14));
        const c = w.cnt; if (c) { c.t -= dt; c.pop = Math.max(0, c.pop - dt * 6); if (c.t <= 0) w.cnt = null; }
      },
      drawFront(w, ctx) {
        const h = w.hero;
        w.dg.forEach((e, k) => {
          const x = h.x + h.ox + 28 + e, y = G - 66 - k * 18;
          box(ctx, x - 8, y - 2, 10, 5, "#3b2a1e");
          poly(ctx, [[x + 2, y - 4], [x + 30, y], [x + 2, y + 4]], k ? "#cbd5e1" : "#e5e7eb");
        });
      },
      drawHud(w, ctx) {
        drawBar(ctx, w.foe);
        const c = w.cnt; if (!c) return;
        ctx.save(); ctx.translate(290, 72); ctx.scale(1 + c.pop * 0.5, 1 + c.pop * 0.5);
        label(ctx, `${c.n} HIT`, 0, 0, 22 + c.n * 3, c.n > 5 ? "#fde047" : "#ffffff");
        ctx.restore();
      },
      steps: [
        {
          id: "slashes", name: { en: "Criss-cross Slashes", ko: "엇갈리는 베기" }, param: "±40° alternating",
          cap: { en: "Alternate the angle. Left, right, *left, right*.", ko: "각도를 번갈아. 왼쪽, 오른쪽, *왼쪽, 오른쪽*." },
          stab(w, i, at) { w.spawn({ type: "slash", x: at.x, y: at.y, ang: i % 2 ? -0.7 : 0.7, len: 36, size: 5, life: 0.14, color: "255,255,255" }); },
        },
        {
          id: "micro", name: { en: "Micro Hit Stop", ko: "아주 짧은 멈칫" }, param: "30ms × 5",
          cap: { en: "*30ms* per hit. Short enough to keep the *rhythm*.", ko: "한 대에 *0.03초*. 짧아야 *리듬*이 살아요." },
          hit(w, at, f) { w.hitstop(0.03); f.vib = 4; f.flash = 0.7; },
        },
        {
          id: "build", name: { en: "Building Shake", ko: "점점 세게" }, param: "trauma .04 → .16",
          cap: { en: "Each hit shakes *a bit more*. It *builds*.", ko: "칠수록 *조금씩 더* 흔들려요. *쌓여요*." },
          stab(w, i) { w.shake(0.04 + i * 0.03); },
        },
        {
          id: "count", name: { en: "Hit Counter", ko: "타수 숫자" }, param: "1 → 6 HIT",
          cap: { en: "*Count* the hits. The number *grows*.", ko: "몇 대인지 *세어 줘요*. 숫자가 *커져요*." },
          hit(w, at, f, i) { w.cnt = { n: i + 1, pop: 1, t: 0.8 }; },
        },
        {
          id: "finish", name: { en: "Finisher", ko: "마무리 한 방" }, param: "X slash · stop 120ms",
          cap: { en: "End with *one big X*. Longer freeze, bigger push.", ko: "마지막은 *큰 X*. 더 멈추고, 더 밀어요." },
          finish(w, at) {
            w.spawn({ type: "slash", x: at.x, y: at.y, ang: 0.8, len: 60, size: 8, life: 0.22, color: "255,255,255" });
            w.spawn({ type: "slash", x: at.x, y: at.y, ang: -0.8, len: 60, size: 8, life: 0.22, color: "253,224,71" });
            w.hitstop(0.12); w.foe.ox += 50; w.foe.k = 4; w.shake(0.3, 1);
          },
          kill(w, f) { w.fly(f, 420, -600, 10); },
        },
        {
          id: "sound", name: { en: "Rising Pitch", ko: "올라가는 음" }, param: "+2 semitones / hit",
          cap: { en: "Each hit a little *higher*. The ear feels the *combo*.", ko: "칠 때마다 음이 *조금씩 높게*. 귀로 *연타*를 느껴요." },
          stab(w, i) { w.play(() => { nz({ dur: 0.06, type: "bandpass", f: 3000 * Math.pow(2, i / 6), q: 2, vol: 0.4 }); tn({ f: 300 * Math.pow(2, i / 6), f2: 120, dur: 0.06, vol: 0.3 }); }); },
          finish(w) { w.sfx.crit(); },
        },
      ],
    },

    /* ─────────────── 11. 대검 ─────────────── */
    {
      id: "weapon-greatsword", cat: "weapon", view: "side",
      title: { en: "Make a greatsword *weigh a ton*", ko: "대검에 *무게* 싣기" },
      intro: { en: "Huge sword. Swings like a *ruler*.", ko: "거대한 칼인데 *자*처럼 휘둘러요." },
      interval: 1.7, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.foe = w.actor("foe", { home: 330 }); w.gs = { rot: -1.2 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const s = w.gs;
        const swing = () => w.tween(s, { rot: 0.45 }, 0.08, "in", () => {
          const p = swordPivot(w), at = { x: p.x + 120, y: p.y + 60 };
          w.emit("swing", p);
          hit(w, w.foe, 34, at);
          const back = () => w.tween(s, { rot: -1.2 }, 0.32, "inout", () => { w.busy = false; });
          if (w.on("follow")) { w.emit("follow", s); w.after(0.5, back); } else back();
        });
        if (w.on("windup")) { w.emit("windup", s); w.after(0.36, swing); } else swing();
      },
      drawFront(w, ctx) { drawGreatsword(ctx, swordPivot(w), w.gs.rot); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "windup", name: { en: "Slow Raise", ko: "천천히 들기" }, param: "350ms · lean back",
          cap: { en: "Raise it *slowly*, lean back. Weight is *time*.", ko: "*천천히* 들고 몸을 젖혀요. 무게는 *시간*이에요." },
          windup(w, s) { w.tween(s, { rot: -2.7 }, 0.34, "out"); w.tween(w.hero, { ox: -14 }, 0.3, "out"); w.hero.sx = 0.92; w.hero.sy = 1.06; },
        },
        {
          id: "smear", name: { en: "Wide Smear", ko: "넓은 잔상" }, param: "arc r 150",
          cap: { en: "One *huge crescent*. The whole arc, in one frame.", ko: "*커다란 초승달* 하나. 휘두른 길 전체를 한 장에." },
          swing(w, p) {
            w.spawn({ type: "arc", x: p.x, y: p.y, size: 140, life: 0.2, a0: -2.3, a1: 0.5, color: "255,255,255" });
            w.spawn({ type: "arc", x: p.x, y: p.y, size: 120, life: 0.16, a0: -2.1, a1: 0.4, color: "147,197,253" });
          },
        },
        {
          id: "stop", name: { en: "Heavy Hit Stop", ko: "묵직한 멈춤" }, param: "140ms · vib 8",
          cap: { en: "Stop *long*. The blade is *stuck* in the moment.", ko: "*길게* 멈춰요. 칼이 그 순간에 *박혀 있어요*." },
          hit(w, at, f) { w.hitstop(0.14); f.vib = 8; f.flash = 1.2; },
        },
        {
          id: "cleave", name: { en: "Cleave Line", ko: "베인 선" }, param: "diagonal slash",
          cap: { en: "Draw the *cut* across the body. Big and diagonal.", ko: "몸을 가로지르는 *베인 선*. 크게, 비스듬히." },
          hit(w, at) {
            w.spawn({ type: "slash", x: at.x + 20, y: at.y - 20, ang: 0.9, len: 80, size: 10, life: 0.25, color: "255,255,255" });
            sparks(w, at.x + 20, at.y - 20, 14, "255,230,180", [200, 600], -0.6, 1.2);
          },
        },
        {
          id: "follow", name: { en: "Follow-through", ko: "끝까지 휘두름" }, param: "bites ground · 0.5s",
          cap: { en: "Don't snap back. Let it *bite the ground*.", ko: "바로 돌아오지 말고 *땅에 박히게*." },
          follow(w, s) {
            w.tween(s, { rot: 0.8 }, 0.1, "out");
            w.after(0.1, () => { const t = swordTip(w); dust(w, t.x, G, 8); w.shake(0.2); w.spawn({ type: "crack", under: true, x: t.x, y: G + 1, pts: [[-24, 0], [-8, 2], [6, -1], [26, 1]], w: 2.5, life: 3, color: "0,0,0", hold: true, add: false }); });
          },
        },
        {
          id: "launch", name: { en: "Big Launch", ko: "크게 날림" }, param: "push 60 · fly",
          cap: { en: "The target *flies*. Heavy weapon, heavy result.", ko: "맞은 쪽이 *날아가요*. 무거운 만큼 결과도 크게." },
          hit(w, at, f) { f.ox += 60; f.k = 3; f.sx = 0.8; f.sy = 1.15; },
          kill(w, f) { w.fly(f, 520, -720, 11); },
        },
        {
          id: "camera", name: { en: "Zoom + Drop", ko: "확대 + 아래로" }, param: "zoom 8% · kick 10px",
          cap: { en: "Zoom in and *drop* the camera with the blade.", ko: "칼이 떨어질 때 화면도 *함께 툭*." },
          swing(w) { w.zoomPunch(0.08); w.shake(0.4); w.kick(8, 10); },
        },
        {
          id: "sound", name: { en: "Whoom + Crunch", ko: "웅 + 콰직" }, param: "low swish / crit",
          cap: { en: "A *low whoom*, not a whistle. Then a *crunch*.", ko: "휘파람 말고 *낮은 웅*. 그리고 *콰직*." },
          windup(w) { w.sfx.creak(); },
          swing(w) { w.play(() => nz({ dur: 0.2, type: "bandpass", f: 300, f2: 900, q: 1.5, vol: 0.5 })); },
          hit(w) { w.sfx.crit(); },
        },
      ],
    },

    /* ─────────────── 12. 방패 밀치기 ─────────────── */
    {
      id: "weapon-shield", cat: "weapon", view: "side",
      title: { en: "Make a shield bash *stun*", ko: "방패 밀치기로 *기절*" },
      intro: { en: "Bumped into it. *Sorry?*", ko: "살짝 부딪쳤어요. *죄송?*" },
      interval: 1.5, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 380 }); w.foe.dizzy = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        const dash = () => {
          w.emit("dash", h);
          w.tween(h, { x: f.x - 120 }, 0.11, "in", () => {
            const at = { x: h.x + 62, y: G - 75 };
            w.emit("bash", at);
            hit(w, f, 25, at);
            f.ox += 6;
            w.after(0.2, () => w.tween(h, { x: h.home }, 0.35, "inout", () => { w.busy = false; }));
          });
        };
        if (w.on("brace")) { w.emit("brace", h); w.after(0.18, dash); } else dash();
      },
      update(w, dt) { const f = w.foe; f.dizzy = Math.max(0, f.dizzy - dt); },
      drawFront(w, ctx) {
        const h = w.hero, x = h.x + h.ox + 46, y = G - 128;
        rr(ctx, x, y, 22, 92, 9, "#64748b"); rr(ctx, x + 4, y + 5, 14, 82, 6, "#94a3b8");
        box(ctx, x + 8, y + 36, 6, 20, "#fde047");
      },
      drawHud(w, ctx) {
        const f = w.foe; drawBar(ctx, f);
        if (f.dizzy > 0 && f.alive) for (let i = 0; i < 3; i++) {
          const a = w.time * 6 + i * TAU / 3;
          ctx.save(); ctx.globalAlpha = Math.min(1, f.dizzy * 2); ctx.fillStyle = "#fde047";
          starPath(ctx, f.x + f.ox + Math.cos(a) * 34, G - 150 + Math.sin(a) * 9, 9); ctx.fill(); ctx.restore();
        }
      },
      steps: [
        {
          id: "brace", name: { en: "Brace", ko: "웅크리기" }, param: "180ms crouch",
          cap: { en: "*Crouch* behind the shield before you charge.", ko: "돌진 전에 방패 뒤로 *웅크려요*." },
          brace(w, h) { h.sx = 1.12; h.sy = 0.86; w.tween(h, { x: h.home - 20 }, 0.16, "out"); },
        },
        {
          id: "lines", name: { en: "Rush Lines", ko: "돌진 선" }, param: "8 streaks",
          cap: { en: "Streaks behind you. It's a *charge*, not a step.", ko: "뒤로 *줄*이 남아요. 걷기 말고 *돌진*." },
          dash(w, h) { for (let i = 0; i < 8; i++) w.after(i * 0.012, () => w.spawn({ type: "slash", x: h.x - rand(20, 70), y: G - rand(20, 130), ang: 0, len: rand(24, 44), size: 2.5, life: 0.2, color: "255,255,255" })); },
        },
        {
          id: "impact", name: { en: "Flat Impact", ko: "넓적한 충격" }, param: "crescents + stop 100ms",
          cap: { en: "A *flat* hit: wide crescents, a solid *stop*.", ko: "*넓적한* 충격. 큰 반달 두 개, *딱* 멈춤." },
          bash(w, at) {
            w.hitstop(0.1);
            w.spawn({ type: "arc", x: at.x - 30, y: at.y, size: 60, a0: -1.1, a1: 1.1, life: 0.2, color: "255,255,255" });
            w.spawn({ type: "arc", x: at.x - 10, y: at.y, size: 84, a0: -0.9, a1: 0.9, life: 0.25, color: "186,230,253" });
            w.spawn({ type: "star", x: at.x, y: at.y, size: 50, life: 0.12, color: "255,255,255" });
          },
        },
        {
          id: "dizzy", name: { en: "Dizzy Stars", ko: "빙글빙글 별" }, param: "stun 1.2s",
          cap: { en: "Stars *circle the head*. Stun, explained in 1 second.", ko: "머리 위로 *별이 빙글*. 기절이 한눈에." },
          hit(w, at, f) { f.dizzy = 1.2; },
          update(w) { const f = w.foe; f.rot = f.dizzy > 0 ? Math.sin(w.time * 10) * 0.12 * Math.min(1, f.dizzy) : 0; },
        },
        {
          id: "skid", name: { en: "Shove + Skid", ko: "밀려 미끄러짐" }, param: "push 90 · dust",
          cap: { en: "Shove it *far*. Feet *skid* and kick up dust.", ko: "*멀리* 밀어요. 발이 *끌리며* 먼지가 나요." },
          hit(w, at, f) {
            f.ox += 90; f.k = 2.6; f.flash = 1;
            for (let i = 0; i < 10; i++) w.after(i * 0.03, () => dust(w, f.x + f.ox - 20, G, 1, -1));
          },
          kill(w, f) { w.fly(f, 520, -500, 8); },
        },
        {
          id: "shake", name: { en: "Shake", ko: "흔들림" }, param: "trauma .35 → right",
          cap: { en: "Shake *in the push direction*.", ko: "*민 방향*으로 화면을 흔들어요." },
          bash(w) { w.shake(0.35, 1); },
        },
        {
          id: "sound", name: { en: "Clang + Thud", ko: "깡 + 쿵" }, param: "metal 620Hz",
          cap: { en: "Metal *clang* on top of a body *thud*.", ko: "몸이 *쿵*, 그 위에 쇠 *깡*." },
          dash(w) { w.sfx.dash(); },
          bash(w) { w.sfx.thud(); w.play(() => { tn({ type: "triangle", f: 620, f2: 560, dur: 0.35, vol: 0.2 }); tn({ type: "triangle", f: 1490, dur: 0.2, vol: 0.08 }); }); },
        },
      ],
    },

    /* ─────────────── 13. 석궁 고정 ─────────────── */
    {
      id: "weapon-crossbow", cat: "weapon", view: "side",
      title: { en: "Pin them to the *wall*", ko: "석궁으로 *벽에 꽂기*" },
      intro: { en: "Hit. Gone. *Where'd it go?*", ko: "맞았다. 사라졌다. *어디 갔지?*" },
      interval: 1.6, stepDur: 3.8,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(-80, G, 700, 120);
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
        for (let i = 0; i < 6; i++) box(ctx, 498, 40 + i * 41, 60, 39, i % 2 ? "#5b4636" : "#6b5240");
        box(ctx, 498, 40, 4, G - 40, "#3b2a1e");
      },
      setup(w) { w.hero = w.actor("hero", { home: 100 }); w.foe = w.actor("foe", { home: 380 }); w.xb = { kick: 0, rot: 0, flex: 0, wob: 0 }; },
      fire(w) {
        const m = loc(grip(w), w.xb.rot, 92 - w.xb.kick, -6), f = w.foe;
        const b = { x: m.x, y: m.y, vx: 1100, vy: -60, g: 300, draw: drawBolt };
        b.test = p => p.x >= 498 || (f.alive && p.x >= f.x + f.ox - 40);
        b.onHit = p => { if (p.x < 498) hit(w, f, 100, { x: p.x, y: p.y }); };
        w.emit("fire", m, b);
        w.shoot(b);
      },
      update(w, dt) { const x = w.xb; springTo0(x, dt, 10); x.flex -= x.flex * Math.min(1, dt * 12); x.wob *= Math.pow(0.03, dt); },
      drawFront(w, ctx) {
        drawCrossbow(ctx, grip(w), w.xb);
        const f = w.foe;
        if (f.keep && !f.alive) drawBolt(ctx, { x: 504, y: G - 82, vx: 1, vy: 0, rot: Math.sin(w.time * 50) * w.xb.wob });
      },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "snap", name: { en: "String Snap", ko: "시위 튕김" }, param: "limbs flex · kick 10",
          cap: { en: "The limbs *snap forward*, the stock *kicks*.", ko: "활대가 *앞으로 탁*, 개머리가 *툭*." },
          fire(w, m) { w.xb.flex = 1; w.xb.kick = 10; w.xb.rot = -0.12; w.spawn({ type: "glow", x: m.x, y: m.y, size: 26, life: 0.08, color: "255,255,255" }); },
        },
        {
          id: "flat", name: { en: "Flat & Fast", ko: "곧고 빠르게" }, param: "2600px/s · no drop",
          cap: { en: "A bolt goes *dead straight*. Way faster than an arrow.", ko: "볼트는 *일자로*. 화살보다 훨씬 빨라요." },
          fire(w, m, b) {
            b.vx = 2600; b.vy = 0; b.g = 0;
            w.spawn({ type: "slash", x: m.x + 140, y: m.y, ang: 0, len: 140, size: 2, life: 0.2, color: "255,255,255" });
          },
        },
        {
          id: "stop", name: { en: "Hit Stop", ko: "멈칫" }, param: "100ms · white",
          cap: { en: "Freeze on contact. Give the hit a *beat*.", ko: "닿는 순간 멈춰요. 한 *박자* 줘요." },
          hit(w, at, f) { w.hitstop(0.1); f.flash = 1.4; f.vib = 5; },
        },
        {
          id: "pin", name: { en: "Pin to Wall", ko: "벽에 꽂힘" }, param: "carry 120ms · stay",
          cap: { en: "The bolt *carries them* and *nails them* to the wall.", ko: "볼트가 적을 *끌고 가서* 벽에 *꽂아요*." },
          kill(w, f) { f.keep = true; f.rot = -0.12; w.tween(f, { x: 470 }, 0.12, "out"); },
        },
        {
          id: "wall", name: { en: "Wall Impact", ko: "벽 충격" }, param: "dust + cracks",
          cap: { en: "The *wall* reacts: dust, cracks, a shake.", ko: "*벽*도 반응해요. 먼지, 금, 흔들림." },
          kill(w) {
            w.after(0.12, () => {
              w.shake(0.3, 1);
              for (let i = 0; i < 8; i++) w.spawn({ type: "smoke", x: 500, y: G - rand(40, 130), vx: rand(-160, -40), vy: rand(-60, 30), drag: 3, size: 6, size1: rand(16, 24), life: rand(0.5, 0.8), color: "190,170,150" });
              w.spawn({ type: "crack", x: 504, y: G - 82, pts: [[0, 0], [14, -18], [10, -34]], w: 2, life: 1.2, color: "20,12,8", hold: true, add: false });
            });
          },
        },
        {
          id: "quiver", name: { en: "Bolt Quiver", ko: "볼트 떨림" }, param: "wobble decay",
          cap: { en: "The stuck bolt *quivers*, then settles.", ko: "꽂힌 볼트가 *부르르* 떨다 멈춰요." },
          kill(w) { w.xb.wob = 0.3; },
        },
        {
          id: "sound", name: { en: "Clack + Thunk", ko: "탁 + 쾅" }, param: "twang / thunk ×2",
          cap: { en: "A dry *clack*, a body *thunk*, a wall *THUNK*.", ko: "마른 *탁*, 몸에 *퍽*, 벽에 *쾅*." },
          fire(w) { w.sfx.twang(); w.sfx.clickDown(); },
          hit(w) { w.sfx.thunk(); },
          kill(w) { w.play(() => { tn({ f: 120, f2: 50, dur: 0.2, vol: 0.7, delay: 0.12 }); nz({ dur: 0.1, type: "bandpass", f: 900, q: 1.5, vol: 0.5, delay: 0.12 }); }); },
        },
      ],
    },

    /* ─────────────── 14. 투척 단검 부채꼴 ─────────────── */
    {
      id: "weapon-knives", cat: "weapon", view: "top",
      title: { en: "Fan out *throwing knives*", ko: "투척 단검을 *부채꼴로*" },
      intro: { en: "Five knives. Looks like *one*.", ko: "다섯 개 던졌는데 *하나*로 보여요." },
      interval: 1.1, stepDur: 3.6,
      drawFloor(w, ctx) { arena(ctx); },
      setup(w) {
        w.hero = w.actor("heroTop", { home: 90, gy: 180 });
        w.foes = [92, 180, 268].map(y => w.actor("foeTop", { home: 410, gy: y }));
        w.stuck = [];
        knifeSprite();
      },
      fire(w) {
        const h = w.hero, ks = [0, 1, 2, 3, 4].map(() => ({ a: 0, delay: 0, vr: 0, x: h.x + 30, y: h.gy, box: [22, 22, 518, 338], draw: drawKnife }));
        w.emit("throw", ks);
        ks.forEach(k => {
          k.vx = Math.cos(k.a) * 1100; k.vy = Math.sin(k.a) * 1100; k.rot = k.a;
          k.test = p => w.foes.some(f => { if (f.alive && Math.hypot(p.x - f.x - f.ox, p.y - f.gy - f.oy) < 28) { p.target = f; return true; } return false; });
          k.onHit = p => hit(w, p.target, 15, { x: p.x, y: p.y }, p);
          k.onOut = p => w.emit("wall", p);
          w.after(k.delay, () => w.shoot(k));
        });
      },
      update(w, dt) { w.stuck = w.stuck.filter(s => (s.life -= dt) > 0); },
      drawBack(w, ctx) { for (const s of w.stuck) drawKnife(ctx, { x: s.x, y: s.y, rot: s.a, alpha: Math.min(1, s.life) }); },
      drawHud(w, ctx) { w.foes.forEach(f => drawBar(ctx, f)); },
      steps: [
        {
          id: "fan", name: { en: "Fan Spread", ko: "부채꼴" }, param: "5 × 16°",
          cap: { en: "Spread them in a *fan*. Now you *see* five.", ko: "*부채꼴*로 펼쳐요. 이제 다섯 개가 *보여요*." },
          throw(w, ks) { ks.forEach((k, i) => { k.a = (i - 2) * 0.28; }); },
        },
        {
          id: "ripple", name: { en: "Ripple Release", ko: "차르륵 순서대로" }, param: "40ms apart",
          cap: { en: "Release them *one after another*. Chk-chk-chk.", ko: "한 번에 말고 *차르륵* 순서대로." },
          throw(w, ks) { ks.forEach((k, i) => { k.delay = i * 0.04; }); },
        },
        {
          id: "spin", name: { en: "Spin", ko: "회전" }, param: "30 rad/s",
          cap: { en: "Spinning blades read as *thrown*, not shot.", ko: "*빙글빙글* 돌아야 던진 칼 같아요." },
          throw(w, ks) { ks.forEach(k => { k.vr = 30; }); },
        },
        {
          id: "trail", name: { en: "Glint Trail", ko: "번뜩이는 꼬리" }, param: "steel glow",
          cap: { en: "A cold *steel glint* follows each blade.", ko: "칼마다 차가운 *쇳빛 꼬리*." },
          throw(w, ks) { ks.forEach(k => { k.trail = "203,213,225"; }); },
        },
        {
          id: "stick", name: { en: "They Stick", ko: "꽂혀서 남음" }, param: "stay 3s",
          cap: { en: "Missed knives *stick in the wall*. Proof you threw.", ko: "빗나간 칼은 *벽에 꽂혀* 남아요." },
          wall(w, p) {
            w.stuck.push({ x: Math.max(26, Math.min(514, p.x)), y: Math.max(40, Math.min(334, p.y)), a: Math.atan2(p.vy, p.vx), life: 3 });
            sparks(w, p.x, p.y, 4, "255,240,200", [80, 240]);
          },
        },
        {
          id: "hit", name: { en: "Flinch", ko: "움찔" }, param: "push along knife",
          cap: { en: "Push each target *along the knife's path*.", ko: "칼이 *날아온 방향*으로 밀려요." },
          hit(w, at, f, p) {
            f.flash = 1; f.ox += Math.cos(p.a) * 14; f.oy += Math.sin(p.a) * 14;
            w.spawn({ type: "star", x: at.x, y: at.y, size: 24, life: 0.1, color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Shff-shff-shff", ko: "슉슉슉" }, param: "1 swish / knife",
          cap: { en: "One *swish per knife*, a little higher each.", ko: "칼마다 *슉* 한 번, 조금씩 높게." },
          throw(w, ks) { ks.forEach((k, i) => w.play(() => nz({ dur: 0.07, type: "bandpass", f: 2200 + i * 300, f2: 4500, q: 2, vol: 0.25, delay: k.delay }))); },
          hit(w) { w.sfx.thunk(); },
          wall(w) { w.sfx.tock(); },
        },
      ],
    },

    /* ─────────────── 15. 수류탄 쿠킹 ─────────────── */
    {
      id: "weapon-grenade", cat: "weapon", view: "side",
      title: { en: "Cook a grenade, *feel the timer*", ko: "수류탄 *타이머*를 느끼게" },
      intro: { en: "It lands. Sits. *Then* explodes. Huh?", ko: "떨어지고, 가만히… *그러다* 펑. 엥?" },
      interval: 2.6, stepDur: 4.2,
      setup(w) { w.hero = w.actor("hero", { home: 100 }); w.foe = w.actor("foe", { home: 420 }); w.gr = { phase: "idle", t: 0, T: 2, x: 0, y: 0, vx: 0, vy: 0, rot: 0, ui: 0, zone: 0, led: 0 }; },
      fire(w) {
        const g = w.gr;
        if (g.phase !== "idle") return;
        Object.assign(g, { phase: "hand", t: g.T, rot: 0 });
        const toss = () => { const p = handPt(w); Object.assign(g, { phase: "air", x: p.x, y: p.y, vx: 260, vy: -520 }); w.emit("toss", g); w.hero.sx = 0.9; w.hero.sy = 1.08; };
        if (w.on("cook")) { w.emit("cook", g); w.after(0.7, toss); } else toss();
      },
      update(w, dt) {
        const g = w.gr;
        g.ui = 0; g.zone = 0; g.led = Math.max(0, g.led - dt * 5);
        if (g.phase === "idle") return;
        g.t -= dt;
        if (g.phase === "hand") { const p = handPt(w); g.x = p.x; g.y = p.y; }
        else {
          g.vy += 1500 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vx * dt * 0.05;
          if (g.y >= G - 10) { g.y = G - 10; const vy = g.vy, vx = g.vx; g.vy = 0; g.vx = 0; g.phase = "ground"; if (vy > 40) w.emit("land", g, vy, vx); }
          if (g.phase === "ground") g.vx *= 1 - Math.min(1, dt * 2.5);
        }
        if (g.t <= 0) {
          const at = { x: g.x, y: G - 20 }, f = w.foe;
          g.phase = "idle";
          w.spawn({ type: "circle", x: at.x, y: at.y - 10, size: 24, size1: 46, life: 0.2, color: "251,146,60" });
          w.emit("boom", at);
          if (Math.abs(f.x - at.x) < 130) hit(w, f, 50, at);
        }
      },
      drawFront(w, ctx) { drawGrenade(ctx, w.gr); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "cook", name: { en: "Cook in Hand", ko: "손에 들고 익히기" }, param: "pin · hold 700ms",
          cap: { en: "Pull the pin, *hold it*. The fuse is already *burning*.", ko: "핀 뽑고 *들고 있어요*. 타이머는 이미 *가는 중*." },
          cook(w, g) {
            const p = handPt(w);
            w.spawn({ type: "chunk", x: p.x, y: p.y - 12, vx: -120, vy: -320, g: 1400, vr: 20, ground: true, bounce: 0.4, life: 2, size: 4, color: "203,213,225", hold: true });
            w.hero.sx = 1.05; w.hero.sy = 0.95;
          },
        },
        {
          id: "ring", name: { en: "Timer Ring", ko: "타이머 고리" }, param: "ring + number",
          cap: { en: "Show the fuse as a *shrinking ring*.", ko: "남은 시간을 *줄어드는 고리*로." },
          update(w) { const g = w.gr; if (g.phase !== "idle") g.ui = g.t / g.T; },
        },
        {
          id: "blink", name: { en: "Faster Blinks", ko: "빨라지는 깜빡임" }, param: "450ms → 80ms",
          cap: { en: "Blink *faster and faster*. Panic, without words.", ko: "*점점 빠르게* 깜빡여요. 말 없이 다급하게." },
          update(w, dt) {
            const g = w.gr; if (g.phase === "idle") return;
            g.blinkT = (g.blinkT || 0) - dt;
            if (g.blinkT <= 0) { g.blinkT = 0.08 + g.t * 0.18; g.led = 1; w.emit("beep", g); }
          },
        },
        {
          id: "bounce", name: { en: "Bounce + Roll", ko: "통통 + 데굴" }, param: "bounce .45 · roll",
          cap: { en: "It *bounces* and *rolls*. Physics you can trust.", ko: "*통통* 튀고 *데굴데굴*. 믿을 수 있는 물리." },
          land(w, g, vy, vx) { if (vy > 160) { g.phase = "air"; g.vy = -vy * 0.45; g.vx = vx * 0.7; } else g.vx = vx * 0.6; },
        },
        {
          id: "zone", name: { en: "Danger Zone", ko: "위험 범위" }, param: "red ring r 130",
          cap: { en: "Paint the *blast radius* on the floor. It *fills up*.", ko: "바닥에 *폭발 범위*를 그려요. 점점 *진해져요*." },
          update(w) { const g = w.gr; if (g.phase === "air" || g.phase === "ground") g.zone = 1 - g.t / g.T; },
        },
        {
          id: "blast", name: { en: "Payoff Blast", ko: "기다린 만큼 펑" }, param: "fireball + shake .7",
          cap: { en: "You *waited* for it. Make it *worth it*.", ko: "*기다렸으니* 확실하게 *터뜨려요*." },
          boom(w, at) {
            w.flash("255,240,210", 0.6); w.shake(0.7); w.hitstop(0.06);
            w.spawn({ type: "glow", x: at.x, y: at.y - 20, size: 140, size1: 40, life: 0.35, color: "255,170,60" });
            w.spawn({ type: "ring", x: at.x, y: G, flat: true, size: 10, size1: 160, life: 0.4, w: 8, color: "255,220,170" });
            smokeAt(w, at.x, at.y - 30, 12, "80,80,90", 110, 1.4);
          },
          kill(w, f) { w.fly(f, 360, -820, 10); },
        },
        {
          id: "sound", name: { en: "Beep… Beep-Beep-BOOM", ko: "삑… 삑삑삑 쾅" }, param: "beeps speed up",
          cap: { en: "Beeps *speed up*. Then the *boom*.", ko: "삑 소리가 *빨라지다가*, *쾅*." },
          cook(w) { w.sfx.clickUp(); },
          beep(w) { w.play(() => tn({ type: "square", f: 1760, dur: 0.05, vol: 0.12 })); },
          boom(w) { w.sfx.boom(); },
        },
      ],
    },

    /* ─────────────── 16. 지뢰 ─────────────── */
    {
      id: "weapon-landmine", cat: "weapon", view: "side",
      title: { en: "Make a landmine *click* first", ko: "지뢰는 *딸깍*부터" },
      intro: { en: "Step. Boom. *No suspense at all.*", ko: "밟자마자 펑. *긴장감이 없어요*." },
      interval: 2.5, stepDur: 4.2,
      setup(w) { w.hero = w.actor("hero", { home: 80 }); w.foe = w.actor("foe", { home: 480 }); w.mine = { x: 300, lift: 0, press: 0, led: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, m = w.mine;
        const blow = () => {
          const at = { x: m.x, y: G - 10 - m.lift };
          m.lift = 0; m.press = 0; m.gone = true;
          w.spawn({ type: "circle", x: at.x, y: at.y - 10, size: 22, size1: 44, life: 0.2, color: "251,146,60" });
          w.emit("boom", at);
          hit(w, f, 100, at);
          w.after(1.0, () => { m.gone = false; w.busy = false; });
        };
        w.tween(f, { x: m.x + 22 }, 0.7, "lin", () => {
          m.press = 1;
          if (w.on("click")) { w.emit("click", m, f); w.after(0.5, blow); } else blow();
        });
      },
      drawFront(w, ctx) { if (!w.mine.gone) drawMine(ctx, w.mine); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "led", name: { en: "Armed Blink", ko: "작동 중 깜빡임" }, param: "red LED · 0.8s",
          cap: { en: "A slow *red blink* says *armed*. Before anything happens.", ko: "느린 *빨간 깜빡임*. 일 나기 전부터 *위험*해 보여요." },
          update(w) { w.mine.led = Math.sin(w.time * 8) > 0.6 ? 1 : 0; },
        },
        {
          id: "click", name: { en: "Click… Uh-oh", ko: "딸깍… 어?" }, param: "500ms beat · \"!\"",
          cap: { en: "*Click*, then a beat. Let the victim *realize* it.", ko: "*딸깍*, 그리고 잠깐. 밟은 쪽이 *눈치채게*." },
          click(w, m, f) {
            f.sy = 1.12; f.sx = 0.92;
            w.spawn({ type: "text", text: "!", x: f.x, y: G - 192, vy: -20, life: 0.5, size: 44, color: "#f87171" });
            w.slowmo(0.35, 0.5);
          },
        },
        {
          id: "pop", name: { en: "Pop-up", ko: "튀어 오름" }, param: "+60px · 400ms",
          cap: { en: "The mine *jumps up* first. The blast hits *higher*.", ko: "지뢰가 *먼저 튀어 올라요*. 터지는 높이가 *올라가요*." },
          click(w, m) { w.tween(m, { lift: 60 }, 0.4, "out"); dust(w, m.x, G, 6); },
        },
        {
          id: "column", name: { en: "Fire Column", ko: "불기둥" }, param: "beam 320px",
          cap: { en: "A mine blasts *up*, not out. Make a *column*.", ko: "지뢰는 옆이 아니라 *위로* 터져요. *기둥*처럼." },
          boom(w, at) {
            w.spawn({ type: "beam", x: at.x, y: G, size: 46, h: 320, life: 0.3, color: "255,180,80" });
            w.spawn({ type: "glow", x: at.x, y: at.y, size: 110, size1: 30, life: 0.3, color: "255,160,60" });
            for (let i = 0; i < 16; i++) w.spawn({ type: "glow", x: at.x + rand(-20, 20), y: at.y, vx: rand(-80, 80), vy: rand(-700, -300), drag: 3, size: rand(16, 28), size1: 2, life: rand(0.4, 0.7), color: i % 3 ? "255,130,40" : "255,230,150" });
          },
        },
        {
          id: "launch", name: { en: "Sky Launch", ko: "하늘로 발사" }, param: "vy −1300 · spin 14",
          cap: { en: "Send the victim *straight up*, spinning.", ko: "밟은 쪽을 *하늘 높이*, 빙글빙글." },
          kill(w, f) { w.fly(f, rand(-60, 60), -1300, 14); w.shake(0.6); },
        },
        {
          id: "crater", name: { en: "Crater + Debris", ko: "구덩이 + 파편" }, param: "decal 4s · 14 chunks",
          cap: { en: "Leave a *crater*. Dirt rains *back down*.", ko: "*구덩이*가 남고, 흙이 *다시 떨어져요*." },
          boom(w, at) {
            w.spawn({ type: "ellipse", under: true, x: at.x, y: G + 2, size: 70, life: 4, color: "10,8,6", alpha: 0.75, hold: true, add: false });
            w.spawn({ type: "ring", x: at.x, y: G, flat: true, size: 10, size1: 130, life: 0.4, w: 8, color: "220,200,170" });
            for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: at.x, y: G - 8, vx: rand(-260, 260), vy: rand(-900, -400), g: 1600, ground: true, bounce: 0.3, vr: rand(-20, 20), life: rand(1.6, 2.4), size: rand(4, 7), color: pick(["120,90,60", "90,70,50", "150,120,90"]), hold: true });
          },
        },
        {
          id: "sound", name: { en: "Click · Beep · BOOM", ko: "딸깍 · 삑 · 쾅" }, param: "silence before boom",
          cap: { en: "A tiny *click*, a beat of *silence*, then *BOOM*.", ko: "작은 *딸깍*, 잠깐 *정적*, 그리고 *쾅*." },
          click(w) { w.sfx.clickDown(); w.play(() => tn({ type: "square", f: 1500, dur: 0.06, vol: 0.1, delay: 0.1 })); },
          boom(w) { w.sfx.boom(); },
        },
      ],
    },

    /* ─────────────── 17. 연쇄 번개 ─────────────── */
    {
      id: "weapon-chain-lightning", cat: "weapon", view: "side",
      title: { en: "Make chain lightning *jump*", ko: "연쇄 번개가 *튀어 다니게*" },
      intro: { en: "Four hits at once. Looks like *lines*.", ko: "넷이 한 번에 맞음. 그냥 *선* 같아요." },
      interval: 1.3, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("hero", { home: 90 });
        w.foes = [250, 330, 410, 490].map(x => w.actor("foe", { home: x, h: 100 }));
        w.bolts = [];
      },
      fire(w) {
        const p = paw(w), nodes = [{ x: p.x, y: p.y, delay: 0 }];
        for (const f of w.foes) if (f.alive) nodes.push({ x: f.x - 6, y: G - 55, f, delay: 0 });
        w.emit("cast", nodes);
        for (let i = 1; i < nodes.length; i++) w.after(nodes[i].delay, () => {
          const a = nodes[i - 1], b = nodes[i], L = { a, b, life: 0.14, jag: 0, core: false, forks: 0 };
          w.emit("link", L);
          w.bolts.push(L);
          hit(w, b.f, 34 - i * 6, { x: b.x, y: b.y });
        });
      },
      update(w, dt) { w.bolts = w.bolts.filter(L => (L.life -= dt) > 0); },
      drawFront(w, ctx) { for (const L of w.bolts) drawBolt2(ctx, L); },
      drawHud(w, ctx) { w.foes.forEach(f => drawBar(ctx, f)); },
      steps: [
        {
          id: "jag", name: { en: "Jagged Path", ko: "지그재그" }, param: "8 kinks · new each frame",
          cap: { en: "Lightning is *never straight*. Re-jag it *every frame*.", ko: "번개는 *절대 곧지 않아요*. *매 프레임* 새로 꺾어요." },
          link(w, L) { L.jag = 14; },
        },
        {
          id: "hop", name: { en: "Hop Delay", ko: "건너뛰는 시간" }, param: "80ms / jump",
          cap: { en: "Make it *travel*. One target, *then* the next.", ko: "한 번에 말고 *옮겨 가게*. 하나, *그다음* 하나." },
          cast(w, nodes) { nodes.forEach((n, i) => { n.delay = i * 0.08; }); },
        },
        {
          id: "core", name: { en: "Glow + Core", ko: "번짐 + 하얀 심" }, param: "halo 14px · core 2px",
          cap: { en: "Blue *halo*, *white* core. Now it's electric.", ko: "파란 *번짐*에 *하얀* 심. 이제 전기 같아요." },
          link(w, L) { L.core = true; },
        },
        {
          id: "forks", name: { en: "Side Forks", ko: "잔가지" }, param: "2 forks / link",
          cap: { en: "Little *forks* branch off. Real bolts *split*.", ko: "작은 *잔가지*가 갈라져요. 진짜 번개처럼." },
          link(w, L) { L.forks = 2; },
        },
        {
          id: "shock", name: { en: "Shock Flicker", ko: "감전 깜빡임" }, param: "0.5s strobe",
          cap: { en: "Targets *strobe* white. You *see* the current.", ko: "맞은 쪽이 *번쩍번쩍*. 전류가 *보여요*." },
          hit(w, at, f) { f.zap = 0.5; sparks(w, at.x, at.y, 8, "165,243,252", [150, 450]); },
          update(w, dt) { for (const f of w.foes) if (f.zap > 0) { f.zap -= dt; f.flash = Math.floor(f.zap * 30) % 2; f.vib = 2; } },
        },
        {
          id: "flash", name: { en: "Sky Flash", ko: "하늘이 번쩍" }, param: "blue flash .35",
          cap: { en: "The whole screen *flashes blue* on the cast.", ko: "쏘는 순간 화면 전체가 *파랗게* 번쩍." },
          cast(w) { w.flash("165,243,252", 0.35); w.shake(0.15); },
        },
        {
          id: "sound", name: { en: "Crackle Chain", ko: "지지직 연쇄" }, param: "1 zap / hop",
          cap: { en: "One *zap per hop*. You *hear* it travel.", ko: "건너뛸 때마다 *지직*. 옮겨 가는 게 *들려요*." },
          link(w) { w.play(() => { nz({ dur: 0.09, type: "highpass", f: 2600, vol: 0.4 }); tn({ type: "sawtooth", f: rand(90, 130), dur: 0.08, vol: 0.12 }); }); },
        },
      ],
    },

    /* ─────────────── 18. 얼음 파편 ─────────────── */
    {
      id: "weapon-ice-shard", cat: "weapon", view: "side",
      title: { en: "Make ice *freeze* them", ko: "얼음으로 *꽁꽁* 얼리기" },
      intro: { en: "A blue dot. Is it *cold?*", ko: "파란 점 하나. *차가운* 건가요?" },
      interval: 0.95, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 100 }); w.foe = w.actor("foe", { home: 400 }); w.foe.ice = 0; },
      fire(w) {
        const p = paw(w), f = w.foe;
        const b = { x: p.x + 8, y: p.y, vx: 900, vy: 0, r: 4, color: "#7dd3fc" };
        b.test = q => f.alive && q.x >= f.x + f.ox - 40;
        b.onHit = q => hit(w, f, 25, { x: q.x, y: q.y });
        w.emit("fire", p, b);
        w.shoot(b);
      },
      update(w, dt) {
        const f = w.foe;
        f.ice = Math.max(0, f.ice - dt);
        if (f.alive && !f.flying && f.ice <= 0) f.x = f.home + Math.sin(w.time * 2.6) * 40;
      },
      drawFront(w, ctx) {
        const f = w.foe; if (f.ice <= 0 || !f.alive) return;
        const x = f.x + f.ox, a = Math.min(1, f.ice * 3);
        ctx.save(); ctx.globalAlpha = 0.55 * a; ctx.drawImage(f.s.cyan, x - f.w / 2, G - f.h, f.w, f.h); ctx.restore();
        ctx.save(); ctx.globalAlpha = a;
        rr(ctx, x - 62, G - 150, 124, 150, 10, "rgba(165,243,252,0.22)");
        ctx.strokeStyle = "rgba(224,250,255,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(x - 62, G - 150, 124, 150);
        line(ctx, [[x - 50, G - 140], [x - 20, G - 140]], "rgba(255,255,255,0.8)", 3);
        line(ctx, [[x - 54, G - 128], [x - 54, G - 60]], "rgba(255,255,255,0.6)", 3);
        ctx.restore();
      },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "shard", name: { en: "Crystal Shard", ko: "결정 조각" }, param: "faceted diamond",
          cap: { en: "Give it a *sharp crystal* shape, not a ball.", ko: "공 말고 *뾰족한 결정* 모양으로." },
          fire(w, p, b) { b.draw = drawShard; },
        },
        {
          id: "frost", name: { en: "Frost Trail", ko: "서리 꼬리" }, param: "mist + flakes",
          cap: { en: "Leave *frost mist* and falling *flakes*.", ko: "*서리 안개*와 떨어지는 *눈송이*를 남겨요." },
          fire(w, p, b) { b.trail = "186,230,253"; },
          update(w) { for (const b of w.shots) if (Math.random() < 0.5) w.spawn({ type: "star", x: b.x - 20, y: b.y + rand(-6, 6), vx: -40, vy: 40, g: 80, size: 5, life: 0.7, color: "240,250,255" }); },
        },
        {
          id: "shatter", name: { en: "Shard Shatter", ko: "부서지는 조각" }, param: "10 ice chunks",
          cap: { en: "On impact the shard *shatters* into chunks.", ko: "맞으면 조각이 *와장창* 부서져요." },
          hit(w, at) {
            for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: at.x, y: at.y, vx: rand(-320, 60), vy: rand(-320, 120), g: 1200, ground: true, bounce: 0.3, vr: rand(-20, 20), life: rand(0.6, 1), size: rand(3, 6), color: pick(["186,230,253", "224,242,254", "125,211,252"]) });
            w.spawn({ type: "ring", x: at.x, y: at.y, size: 6, size1: 46, life: 0.2, w: 4, color: "224,242,254" });
          },
        },
        {
          id: "freeze", name: { en: "Freeze Solid", ko: "꽁꽁 얼음" }, param: "stop 1.6s · ice block",
          cap: { en: "Freeze it *mid-step*. An *ice block* says it all.", ko: "걷다가 *그대로 멈춰요*. *얼음 덩어리*로 끝." },
          hit(w, at, f) { f.ice = 1.6; f.flash = 1; },
        },
        {
          id: "patch", name: { en: "Frost Patch", ko: "얼어붙은 바닥" }, param: "decal 2.5s",
          cap: { en: "Cold *spreads to the floor*.", ko: "냉기가 *바닥까지* 번져요." },
          hit(w, at, f) { w.spawn({ type: "ellipse", under: true, x: f.x, y: G + 1, size: 50, size1: 90, life: 2.5, color: "186,230,253", alpha: 0.55, hold: true, add: true }); },
        },
        {
          id: "brittle", name: { en: "Brittle Break", ko: "얼어서 산산조각" }, param: "frozen kill → shards",
          cap: { en: "Kill it frozen and it *shatters*. Big payoff.", ko: "언 채로 쓰러뜨리면 *산산조각*. 큰 보상." },
          kill(w, f) {
            w.hitstop(0.1); w.shake(0.35); w.flash("224,242,254", 0.3);
            for (let i = 0; i < 26; i++) w.spawn({ type: "chunk", x: f.x + rand(-40, 40), y: G - rand(10, 130), vx: rand(-300, 300), vy: rand(-600, -100), g: 1500, ground: true, bounce: 0.3, vr: rand(-25, 25), life: rand(1.2, 2), size: rand(5, 11), color: pick(["186,230,253", "224,242,254", "125,211,252", "150,205,95"]), hold: true });
          },
        },
        {
          id: "sound", name: { en: "Chime + Crack", ko: "띵 + 쩍" }, param: "glassy highs",
          cap: { en: "A glassy *chime* on hit, a *crack* when it breaks.", ko: "맞을 땐 유리 같은 *띵*, 깨질 땐 *쩍*." },
          fire(w) { w.sfx.magic(); },
          hit(w) { w.sfx.chime(rand(0, 4)); w.sfx.tick(); },
          kill(w) { w.play(() => { nz({ dur: 0.35, type: "highpass", f: 3500, f2: 1800, vol: 0.5 }); tn({ type: "triangle", f: 2600, f2: 1900, dur: 0.3, vol: 0.12 }); }); },
        },
      ],
    },

    /* ─────────────── 19. 유도 미사일 ─────────────── */
    {
      id: "weapon-homing", cat: "weapon", view: "top",
      title: { en: "Make homing missiles *swarm*", ko: "유도 미사일을 *떼로*" },
      intro: { en: "Six missiles. Six *straight lines*.", ko: "미사일 여섯 발. 직선 *여섯 줄*." },
      interval: 1.7, stepDur: 4.0,
      drawFloor(w, ctx) { arena(ctx); },
      setup(w) {
        w.hero = w.actor("heroTop", { home: 80, gy: 180 });
        w.foes = [[420, 95], [470, 185], [420, 275]].map(([x, y]) => w.actor("foeTop", { home: x, gy: y }));
        w.ms = [];
      },
      fire(w) {
        const h = w.hero, live = w.foes.filter(f => f.alive);
        if (!live.length) return;
        const ms = [0, 1, 2, 3, 4, 5].map(i => {
          const t = live[i % live.length];
          return { x: h.x + 26, y: h.gy, t, a: Math.atan2(t.gy - h.gy, t.x - h.x - 26), sp: 420, turn: 99, delay: 0 };
        });
        w.emit("launch", ms);
        w.ms.push(...ms);
      },
      update(w, dt) {
        for (const m of w.ms) {
          if (m.delay > 0) { m.delay -= dt; continue; }
          const tx = m.t.x + m.t.ox, ty = m.t.gy + m.t.oy;
          let d = Math.atan2(ty - m.y, tx - m.x) - m.a;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          m.a += Math.max(-m.turn * dt, Math.min(m.turn * dt, d));
          m.sp = Math.min(560, m.sp + 700 * dt);
          m.x += Math.cos(m.a) * m.sp * dt; m.y += Math.sin(m.a) * m.sp * dt;
          w.emit("fly", m);
          if (Math.hypot(tx - m.x, ty - m.y) < 18) { m.dead = true; const at = { x: m.x, y: m.y }; w.emit("boom", at); hit(w, m.t, 10, at); }
          if (m.x < 16 || m.x > 524 || m.y < 16 || m.y > 344) m.dead = true;
        }
        w.ms = w.ms.filter(m => !m.dead);
      },
      drawFront(w, ctx) { for (const m of w.ms) if (m.delay <= 0) drawMissile(ctx, m); },
      drawHud(w, ctx) { w.foes.forEach(f => drawBar(ctx, f)); },
      steps: [
        {
          id: "lock", name: { en: "Target Lock", ko: "목표 고정" }, param: "reticle 400ms",
          cap: { en: "*Lock on* first. Rings snap onto each target.", ko: "먼저 *조준*. 고리가 목표에 *착*." },
          launch(w, ms) {
            for (const f of new Set(ms.map(m => m.t))) {
              w.spawn({ type: "ring", x: f.x, y: f.gy, size: 56, size1: 24, life: 0.45, w: 3, color: "248,113,113", hold: true });
              w.spawn({ type: "star", x: f.x, y: f.gy, size: 18, life: 0.2, color: "255,255,255" });
            }
          },
        },
        {
          id: "swarm", name: { en: "Pop Out, Then Steer", ko: "옆으로 튀었다 꺾기" }, param: "±70–120° · turn 4.5",
          cap: { en: "Launch *sideways*, then *curve* in. That's a swarm.", ko: "*옆으로* 튀어나와 *휘어* 들어가요. 그게 떼." },
          launch(w, ms) { ms.forEach((m, i) => { m.a += (i % 2 ? -1 : 1) * rand(1.2, 2.1); m.turn = 4.5; m.sp = 120; }); },
        },
        {
          id: "ripple", name: { en: "Ripple Launch", ko: "순서대로 발사" }, param: "60ms apart",
          cap: { en: "Fire them *one by one*. Ta-ta-ta-ta.", ko: "*하나씩* 차례로. 타타타타." },
          launch(w, ms) { ms.forEach((m, i) => { m.delay = i * 0.06; }); },
        },
        {
          id: "trail", name: { en: "Smoke Trails", ko: "연기 꼬리" }, param: "0.7s trails",
          cap: { en: "Trails show *the curve*. That's the fun part.", ko: "꼬리가 *휘는 길*을 보여줘요. 그게 재미." },
          fly(w, m) { w.spawn({ type: "smoke", x: m.x - Math.cos(m.a) * 8, y: m.y - Math.sin(m.a) * 8, size: 3, size1: 9, life: 0.7, color: "200,200,210" }); },
        },
        {
          id: "blast", name: { en: "Mini Blasts", ko: "작은 폭발" }, param: "glow 46 + ring",
          cap: { en: "Each missile gets its *own little boom*.", ko: "미사일마다 *작은 펑*을 하나씩." },
          boom(w, at) {
            w.spawn({ type: "glow", x: at.x, y: at.y, size: 46, size1: 12, life: 0.25, color: "255,170,70" });
            w.spawn({ type: "ring", x: at.x, y: at.y, size: 6, size1: 40, life: 0.25, w: 5, color: "255,230,180" });
            sparks(w, at.x, at.y, 6, "255,210,140", [100, 300]);
          },
        },
        {
          id: "shake", name: { en: "Stacked Shakes", ko: "쌓이는 흔들림" }, param: "trauma .12 × hits",
          cap: { en: "Small shakes that *stack* as they land.", ko: "작은 흔들림이 맞을수록 *쌓여요*." },
          boom(w) { w.shake(0.12); },
          hit(w, at, f) { f.flash = 1; },
        },
        {
          id: "sound", name: { en: "Fwip-fwip + Pops", ko: "퓽퓽 + 펑펑" }, param: "1 per missile",
          cap: { en: "A *fwip* per launch, a *pop* per hit.", ko: "나갈 때마다 *퓽*, 맞을 때마다 *펑*." },
          launch(w, ms) { ms.forEach((m, i) => w.play(() => nz({ dur: 0.1, type: "bandpass", f: 900 + i * 120, f2: 2600, q: 2, vol: 0.25, delay: m.delay }))); },
          boom(w) { w.sfx.pop(); },
        },
      ],
    },

    /* ─────────────── 20. 플라스마 구체 ─────────────── */
    {
      id: "weapon-plasma", cat: "weapon", view: "side",
      title: { en: "Make a slow orb feel *dangerous*", ko: "느린 구체를 *위협적으로*" },
      intro: { en: "Slow and big. Just *a purple ball*.", ko: "느리고 커요. 그냥 *보라색 공*." },
      interval: 2.2, stepDur: 4.2,
      setup(w) { w.hero = w.actor("hero", { home: 90 }); w.foe = w.actor("foe", { home: 430 }); w.orb = null; },
      fire(w) {
        if (w.orb) return;
        const p = paw(w);
        w.orb = { x: p.x + 24, y: p.y - 10, vx: 170, r: 22, wob: 0, t: 0 };
        w.emit("launch", w.orb);
      },
      update(w, dt) {
        const o = w.orb, f = w.foe;
        if (!o || o.popping) return;
        o.x += o.vx * dt; o.t += dt;
        w.emit("orb", o, dt);
        if (o.x < f.x + f.ox - 70) return;
        const blow = () => { w.orb = null; const at = { x: o.x, y: o.y }; w.emit("boom", at); hit(w, f, 50, at); };
        o.popping = true;
        if (w.on("implode")) { w.emit("implode", o); w.after(0.16, blow); } else blow();
      },
      drawFront(w, ctx) { if (w.orb) drawOrb(ctx, w.orb, w.time); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "wobble", name: { en: "Living Surface", ko: "꿈틀대는 표면" }, param: "radius ±5 · 12Hz",
          cap: { en: "The edge *boils*. It's unstable, it's *alive*.", ko: "가장자리가 *부글부글*. 불안정하게 *살아 있어요*." },
          launch(w, o) { o.wob = 5; },
        },
        {
          id: "arcs", name: { en: "Crackling Tendrils", ko: "튀는 전기 촉수" }, param: "random arcs",
          cap: { en: "*Tendrils* crackle off the surface.", ko: "표면에서 *전기 촉수*가 튀어요." },
          orb(w, o) {
            if (Math.random() > 0.5) return;
            const a = rand(0, TAU), pts = zig(0, 0, Math.cos(a) * (o.r + 30), Math.sin(a) * (o.r + 30), 4, 6);
            w.spawn({ type: "crack", x: o.x, y: o.y, pts, w: 2, life: 0.07, color: "233,213,255", add: true });
          },
        },
        {
          id: "pull", name: { en: "Gravity Pull", ko: "빨아들이는 힘" }, param: "sparks in · tug target",
          cap: { en: "It *pulls things in*. Even the target *leans*.", ko: "주변을 *빨아들여요*. 적도 *끌려와요*." },
          orb(w, o) {
            const a = rand(0, TAU), d = rand(70, 110);
            w.spawn({ type: "spark", seek: true, x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d, tx: o.x + o.vx * 0.3, ty: o.y, life: 0.3, size: 2, color: "216,180,254" });
            const f = w.foe; if (f.x - o.x < 200) f.ox -= 0.8;
          },
        },
        {
          id: "light", name: { en: "Lights the Room", ko: "주변을 밝힘" }, param: "floor + air glow",
          cap: { en: "Something this strong *lights up* the scene.", ko: "이만큼 강하면 주변이 *환해져요*." },
          orb(w, o) {
            w.spawn({ type: "ellipse", under: true, x: o.x, y: G, size: 120, life: 0.05, color: "168,85,247", alpha: 0.6, add: true });
            w.spawn({ type: "glow", x: o.x, y: o.y, size: 150, life: 0.05, color: "168,85,247", alpha: 0.25 });
          },
        },
        {
          id: "implode", name: { en: "Implode → Explode", ko: "쪼그라들었다 펑" }, param: "shrink 160ms",
          cap: { en: "*Shrink* for a moment first. Then *release*.", ko: "터지기 전에 *확 쪼그라들어요*. 그리고 *펑*." },
          implode(w, o) {
            w.tween(o, { r: 5 }, 0.15, "in");
            for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; w.spawn({ type: "spark", seek: true, x: o.x + Math.cos(a) * 90, y: o.y + Math.sin(a) * 90, tx: o.x, ty: o.y, life: 0.15, size: 2.5, color: "255,255,255" }); }
          },
        },
        {
          id: "blast", name: { en: "Huge Blast", ko: "거대한 폭발" }, param: "ring 190 · stop 100ms",
          cap: { en: "Slow weapon, *huge payoff*. Go big.", ko: "느린 무기는 *크게 터져야* 해요." },
          boom(w, at) {
            w.hitstop(0.1); w.shake(0.6); w.flash("216,180,254", 0.45);
            w.spawn({ type: "ring", x: at.x, y: at.y, size: 14, size1: 160, life: 0.45, w: 16, color: "216,180,254" });
            w.spawn({ type: "glow", x: at.x, y: at.y, size: 160, size1: 40, life: 0.4, color: "168,85,247" });
            w.spawn({ type: "rays", x: at.x, y: at.y, n: 12, size: 200, life: 0.35, vr: 2, color: "233,213,255" });
          },
          kill(w, f) { w.fly(f, 520, -620, 9); },
        },
        {
          id: "sound", name: { en: "Hum → Boom", ko: "웅웅 → 쾅" }, param: "low throb",
          cap: { en: "A *low throb* while it crawls. Silence. *BOOM*.", ko: "다가오는 동안 *낮게 웅웅*. 정적. *쾅*." },
          launch(w) { w.sfx.charge(); },
          orb(w, o) { if (Math.floor(o.t * 5) !== Math.floor((o.t - 1 / 60) * 5)) w.play(() => tn({ type: "sawtooth", f: 55, dur: 0.18, vol: 0.12 })); },
          boom(w) { w.sfx.boom(); w.sfx.burst(); },
        },
      ],
    },

    /* ─────────────── 21. 새총 ─────────────── */
    {
      id: "weapon-slingshot", cat: "weapon", view: "side",
      title: { en: "Make a slingshot *stretch*", ko: "새총을 *쭈욱* 당기게" },
      intro: { en: "Pebble out. *Plink.* That's all?", ko: "돌멩이 휙. *톡*. 끝?" },
      interval: 1.4, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 400 }); w.ss = { pull: 0, snap: 0, dots: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const s = w.ss;
        const release = () => {
          const p = forkPt(w), f = w.foe;
          const b = { x: p.x, y: p.y, vx: 700, vy: -250, g: 900, r: 5, color: "#a8a29e", rot: 0 };
          b.test = q => f.alive && q.x >= f.x + f.ox - 34;
          b.onHit = q => hit(w, f, 20, { x: q.x, y: q.y });
          s.pull = 0;
          w.emit("release", s, b);
          w.shoot(b);
          w.after(0.3, () => { w.busy = false; });
        };
        if (w.on("pull")) { w.emit("pull", s); w.after(0.55, release); } else release();
      },
      update(w, dt) { const s = w.ss; s.snap = Math.max(0, s.snap - dt * 2.5); s.dots = 0; },
      drawFront(w, ctx) { drawSling(ctx, w); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "pull", name: { en: "Stretch", ko: "쭈욱 당기기" }, param: "550ms · band 44px",
          cap: { en: "*Stretch* the band first. Tension = power.", ko: "먼저 고무줄을 *쭈욱*. 당긴 만큼 힘이에요." },
          pull(w, s) { w.tween(s, { pull: 1 }, 0.5, "out"); w.hero.sx = 1.04; w.hero.sy = 0.96; w.hero.ox = -6; },
        },
        {
          id: "dots", name: { en: "Aim Dots", ko: "궤적 점선" }, param: "8 dots · same physics",
          cap: { en: "While pulling, show *where it'll land*.", ko: "당기는 동안 *어디로 갈지* 점으로 보여줘요." },
          update(w) { w.ss.dots = w.ss.pull; },
        },
        {
          id: "snap", name: { en: "Band Snap", ko: "고무줄 출렁" }, param: "overshoot ±18px",
          cap: { en: "The band *snaps past* the fork and *wobbles*.", ko: "고무줄이 *앞으로 튕겼다가* *출렁*여요." },
          release(w, s) { s.snap = 1; w.hero.ox -= 4; },
        },
        {
          id: "spin", name: { en: "Tumbling Stone", ko: "구르는 돌" }, param: "rock shape · spin 20",
          cap: { en: "A lumpy *rock* that *tumbles*. Not a perfect dot.", ko: "울퉁불퉁 *돌멩이*가 *빙글*. 동그라미 말고요." },
          release(w, s, b) { b.vr = 20; b.draw = drawStone; },
        },
        {
          id: "bonk", name: { en: "Bonk!", ko: "딱콩!" }, param: "squash · bounce off",
          cap: { en: "Head *squashes*, stone *bounces off*. Comedy!", ko: "머리가 *찌그러지고* 돌은 *튕겨 나가요*." },
          hit(w, at, f) {
            f.sy = 0.78; f.sx = 1.16; f.flash = 1;
            w.spawn({ type: "star", x: at.x, y: at.y, size: 30, life: 0.12, color: "255,255,255" });
            w.spawn({ type: "text", text: "BONK!", x: at.x - 10, y: at.y - 40, vy: -100, life: 0.7, size: 28, color: "#fde047" });
            w.spawn({ type: "chunk", x: at.x, y: at.y, vx: -220, vy: -420, g: 1400, ground: true, bounce: 0.45, vr: 15, life: 1.6, size: 6, color: "168,162,158", hold: true });
          },
        },
        {
          id: "sound", name: { en: "Stretch · Thwap · Bonk", ko: "끼익 · 퉁 · 딱" }, param: "rubber + wood",
          cap: { en: "A rubbery *stretch*, a *thwap*, a hollow *bonk*.", ko: "고무 *끼익*, *퉁*, 텅 빈 *딱*." },
          pull(w) { w.play(() => tn({ type: "sawtooth", f: 120, f2: 260, dur: 0.5, vol: 0.05 })); },
          release(w) { w.play(() => { tn({ type: "triangle", f: 180, f2: 90, dur: 0.12, vol: 0.3 }); nz({ dur: 0.06, type: "bandpass", f: 1200, q: 1, vol: 0.3 }); }); },
          hit(w) { w.sfx.tock(); w.sfx.pop(); },
        },
      ],
    },

    /* ─────────────── 22. 차크람 ─────────────── */
    {
      id: "weapon-chakram", cat: "weapon", view: "top",
      title: { en: "Make a chakram *ricochet*", ko: "차크람이 *튕겨 다니게*" },
      intro: { en: "Hits one. Flies off. *Bye.*", ko: "하나 맞히고 날아감. *안녕.*" },
      interval: 1.8, stepDur: 4.0,
      drawFloor(w, ctx) { arena(ctx); },
      setup(w) {
        w.hero = w.actor("heroTop", { home: 80, gy: 190 });
        w.foes = [[290, 100], [450, 130], [310, 280], [460, 270]].map(([x, y]) => w.actor("foeTop", { home: x, gy: y }));
        w.ck = { on: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, n: 0, max: 1, hitList: [], home: false };
      },
      fire(w) {
        const c = w.ck, h = w.hero;
        if (c.on) return;
        const t = nearest(w, h.x, h.gy, []);
        if (!t) return;
        Object.assign(c, { on: true, x: h.x + 26, y: h.gy, n: 0, max: 1, hitList: [], home: false, vr: 0, rot: 0 });
        aimAt(c, t.x, t.gy, 700);
        w.emit("throw", c);
      },
      update(w, dt) {
        const c = w.ck, h = w.hero;
        if (!c.on) return;
        c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
        w.emit("fly", c);
        if (c.home) {
          aimAt(c, h.x, h.gy, 760);
          if (Math.hypot(h.x - c.x, h.gy - c.y) < 24) { c.on = false; w.emit("catch", { x: h.x, y: h.gy }); }
          return;
        }
        for (const f of w.foes) {
          if (!f.alive || c.hitList.includes(f) || Math.hypot(c.x - f.x - f.ox, c.y - f.gy - f.oy) > 28) continue;
          c.hitList.push(f); c.n++;
          hit(w, f, 12, { x: c.x, y: c.y }, c);
          const next = c.n < c.max && nearest(w, c.x, c.y, c.hitList);
          if (next) aimAt(c, next.x, next.gy, 700); else w.emit("last", c);
          break;
        }
        if (c.x < 18 || c.x > 522 || c.y < 18 || c.y > 342) c.on = false;
      },
      drawFront(w, ctx) {
        const c = w.ck, h = w.hero;
        drawChakram(ctx, c.on ? c.x : h.x + h.ox + 22, c.on ? c.y : h.gy + h.oy + 18, c.on ? c.rot : 0);
      },
      drawHud(w, ctx) { w.foes.forEach(f => drawBar(ctx, f)); },
      steps: [
        {
          id: "spin", name: { en: "Spinning Blades", ko: "회전하는 날" }, param: "26 rad/s",
          cap: { en: "A blade disc must *spin*. Fast.", ko: "칼날 원반은 *빠르게 돌아야* 해요." },
          throw(w, c) { c.vr = 26; },
        },
        {
          id: "ricochet", name: { en: "Ricochet", ko: "튕겨서 다음 적" }, param: "4 targets",
          cap: { en: "Each hit *bounces* to the *next nearest* enemy.", ko: "맞을 때마다 *가장 가까운 다음 적*으로 튕겨요." },
          throw(w, c) { c.max = 4; },
        },
        {
          id: "snap", name: { en: "Snap + Sparks", ko: "멈칫 + 불꽃" }, param: "stop 50ms",
          cap: { en: "A tiny *freeze* and *sparks* at every bounce.", ko: "튕길 때마다 *살짝 멈칫*, *불꽃 팍*." },
          hit(w, at, f) {
            w.hitstop(0.05); f.flash = 1;
            sparks(w, at.x, at.y, 10, "255,230,160", [150, 420]);
            w.spawn({ type: "ring", x: at.x, y: at.y, size: 6, size1: 40, life: 0.2, w: 5, color: "255,255,255" });
          },
        },
        {
          id: "count", name: { en: "Bounce Counter", ko: "튕긴 횟수" }, param: "×1 → ×4",
          cap: { en: "Show *×2, ×3, ×4*. Each one *bigger*.", ko: "*×2, ×3, ×4*. 갈수록 *크게*." },
          hit(w, at, f, c) { w.spawn({ type: "text", text: `×${c.n}`, x: at.x + 26, y: at.y - 26, vy: -50, life: 0.7, size: 18 + c.n * 5, color: c.n > 2 ? "#fde047" : "#ffffff" }); },
        },
        {
          id: "trail", name: { en: "Ribbon Trail", ko: "리본 꼬리" }, param: "glow 0.4s",
          cap: { en: "A glowing *ribbon* draws the zig-zag path.", ko: "빛나는 *리본*이 지그재그 길을 그려요." },
          fly(w, c) { w.spawn({ type: "glow", x: c.x, y: c.y, size: 12, size1: 3, life: 0.4, color: "192,132,252" }); },
        },
        {
          id: "return", name: { en: "Return to Hand", ko: "손으로 복귀" }, param: "home after last",
          cap: { en: "After the last bounce it *comes home*. *Catch!*", ko: "마지막에 *손으로 돌아와요*. *착!*" },
          last(w, c) { c.home = true; },
          catch(w, p) {
            w.hero.sx = 1.25; w.hero.sy = 1.25;
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 8, size1: 50, life: 0.25, w: 5, color: "192,132,252" });
          },
        },
        {
          id: "sound", name: { en: "Rising Pings", ko: "올라가는 팅" }, param: "+2 semis / bounce",
          cap: { en: "Every bounce pings *higher*. Ting-ting-TING!", ko: "튕길수록 *높게*. 팅, 팅, *팅!*" },
          throw(w) { w.sfx.swish(); },
          hit(w, at, f, c) { w.sfx.blip(c.n * 3); w.sfx.tick(); },
          catch(w) { w.sfx.clickDown(); },
        },
      ],
    },

    /* ─────────────── 23. 랜스 돌격 ─────────────── */
    {
      id: "weapon-lance", cat: "weapon", view: "side",
      title: { en: "Make a lance charge *unstoppable*", ko: "랜스 돌격을 *멈출 수 없게*" },
      intro: { en: "A charge? It's a *stroll*.", ko: "돌격이요? *산책* 같아요." },
      interval: 1.9, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 50 }); w.foe = w.actor("foe", { home: 470 }); w.lc = { moving: false }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe, c = { ease: "lin", dur: 0.75 };
        w.emit("charge", c);
        w.lc.moving = true;
        w.tween(h, { x: f.x - 222 }, c.dur, c.ease, () => {
          const tip = { x: lanceTip(w), y: G - 72 };
          w.lc.moving = false; h.rot = 0;
          w.emit("impact", tip);
          hit(w, f, 50, tip);
          w.after(0.35, () => w.tween(h, { x: h.home }, 0.5, "inout", () => { w.busy = false; }));
        });
      },
      drawFront(w, ctx) { drawLance(ctx, w); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "accel", name: { en: "Build Speed", ko: "점점 빨라짐" }, param: "ease-in · 420ms",
          cap: { en: "Start *slow*, end *fast*. That's a charge.", ko: "*천천히* 출발해 *빠르게* 꽂혀요. 그게 돌격." },
          charge(w, c) { c.ease = "in"; c.dur = 0.42; },
        },
        {
          id: "lean", name: { en: "Lean In", ko: "앞으로 숙이기" }, param: "tilt 9°",
          cap: { en: "*Lean* into the run. The body says *fast*.", ko: "몸을 *앞으로 숙여요*. 자세가 *속도*를 말해요." },
          charge(w) { w.tween(w.hero, { rot: 0.16 }, 0.2, "out"); },
        },
        {
          id: "dust", name: { en: "Dust Kick", ko: "흙먼지" }, param: "60% / frame",
          cap: { en: "Kick up *dust* behind the feet.", ko: "발 뒤로 *흙먼지*가 일어요." },
          update(w) { if (w.lc.moving && Math.random() < 0.6) dust(w, w.hero.x - 20, G, 1, -1); },
        },
        {
          id: "lines", name: { en: "Air Cone", ko: "공기 가르기" }, param: "streaks + bow wave",
          cap: { en: "Streaks fly past, *air piles up* at the tip.", ko: "줄이 스치고, 창끝에 *공기가 밀려요*." },
          update(w) {
            if (!w.lc.moving) return;
            w.spawn({ type: "slash", x: w.hero.x + rand(-40, 120), y: G - rand(20, 140), ang: 0, len: rand(20, 40), size: 2, life: 0.15, color: "255,255,255" });
            w.spawn({ type: "arc", x: lanceTip(w) - 16, y: G - 72, size: 22, a0: -1.2, a1: 1.2, life: 0.06, color: "224,242,254" });
          },
        },
        {
          id: "impact", name: { en: "Impact Stop", ko: "충돌 멈춤" }, param: "stop 120ms · star 80",
          cap: { en: "All that speed, then a *dead stop*. Big *star*.", ko: "그 속도에서 *딱* 멈춰요. 큰 *섬광*." },
          impact(w, tip) {
            w.hitstop(0.12); w.flash("255,255,255", 0.3);
            w.spawn({ type: "star", x: tip.x, y: tip.y, size: 80, life: 0.15, color: "255,255,255" });
            w.spawn({ type: "ring", x: tip.x, y: tip.y, size: 10, size1: 90, life: 0.3, w: 8, color: "255,240,200" });
          },
        },
        {
          id: "launch", name: { en: "Send Flying", ko: "날려 버리기" }, param: "push 80 · fly 800",
          cap: { en: "The target *flies*. Momentum *transfers*.", ko: "맞은 쪽이 *날아가요*. 속도가 *그대로 전해져요*." },
          hit(w, at, f) { f.ox += 80; f.k = 3; f.flash = 1; },
          kill(w, f) { w.fly(f, 800, -500, 12); },
        },
        {
          id: "camera", name: { en: "Camera Rides Along", ko: "카메라도 함께" }, param: "follow 50%",
          cap: { en: "The camera *rides with you*, then *slams* on impact.", ko: "카메라가 *같이 달리다* 충돌에서 *쾅*." },
          update(w) { const h = w.hero; w.cam.tx = (h.x - h.home) * 0.5; },
          impact(w) { w.shake(0.5, 1); w.zoomPunch(0.08); },
        },
        {
          id: "sound", name: { en: "Thunder Feet + Crash", ko: "두두두 + 쾅" }, param: "steps speed up",
          cap: { en: "Footsteps *speed up*, then a *crash*.", ko: "발소리가 *빨라지다가* *쾅*." },
          charge(w, c) { [0, 0.4, 0.66, 0.84, 0.95].forEach(k => w.play(() => tn({ f: 110, f2: 50, dur: 0.08, vol: 0.4, delay: k * c.dur }))); },
          impact(w) { w.sfx.slam(); w.sfx.crit(); },
        },
      ],
    },

    /* ─────────────── 24. 도끼 던지기 ─────────────── */
    {
      id: "weapon-axe-throw", cat: "weapon", view: "side",
      title: { en: "Make a thrown axe *spin and stick*", ko: "던진 도끼가 *돌다 꽂히게*" },
      intro: { en: "An axe *slides* through the air. Then vanishes.", ko: "도끼가 *미끄러지듯* 날아가다 사라져요." },
      interval: 1.3, stepDur: 3.6,
      setup(w) {
        if (!ACTOR["weapon-post"]) { postSprite(); ACTOR["weapon-post"] = { spr: "weapon-post", h: 170, home: 430 }; }
        w.hero = w.actor("hero", { home: 110 }); w.post = w.actor("weapon-post"); w.stuck = [];
      },
      fire(w) {
        const h = w.hero, t = w.post;
        const b = { x: h.x + h.ox + 46, y: G - 112, vx: 640, vy: 0, g: 0, vr: 0, rot: -0.3, draw: drawAxe };
        b.test = p => p.x >= t.x - 26;
        b.onHit = p => w.emit("hit", { x: p.x, y: p.y }, t, p);
        w.emit("throw", b);
        w.shoot(b);
        h.sx = 0.92; h.sy = 1.06;
      },
      update(w, dt) {
        for (const s of w.stuck) { s.wob *= Math.pow(0.04, dt); s.life -= dt; }
        w.stuck = w.stuck.filter(s => s.life > 0);
      },
      drawFront(w, ctx) { for (const s of w.stuck) drawAxe(ctx, { x: s.x, y: s.y, rot: s.rot + Math.sin(w.time * 40) * s.wob }); },
      steps: [
        {
          id: "spin", name: { en: "Spin", ko: "회전" }, param: "16 rad/s",
          cap: { en: "Thrown axes *tumble*. Head over handle.", ko: "던진 도끼는 *빙글빙글*. 머리와 손잡이가 번갈아." },
          throw(w, b) { b.vr = 16; },
        },
        {
          id: "arc", name: { en: "Arc", ko: "포물선" }, param: "g 1100",
          cap: { en: "Heavy things *arc*. Toss it *up* a little.", ko: "무거운 건 *포물선*. 살짝 *위로* 던져요." },
          throw(w, b) { b.vy = -300; b.g = 1100; },
        },
        {
          id: "smear", name: { en: "Spin Smear", ko: "회전 잔상" }, param: "crescent / frame",
          cap: { en: "A *crescent smear* behind the blade. Reads as *fast*.", ko: "날 뒤로 *반달 잔상*. *빠르게* 보여요." },
          update(w) { for (const b of w.shots) if (b.draw === drawAxe) w.spawn({ type: "arc", x: b.x, y: b.y, size: 24, a0: b.rot - 1.8, a1: b.rot - 0.2, life: 0.1, color: "226,232,240" }); },
        },
        {
          id: "stick", name: { en: "Thunk & Stick", ko: "탁 꽂힘" }, param: "stay 3s · wobble",
          cap: { en: "It *bites in* and stays, *wobbling*.", ko: "*콱* 박혀서 남고, *부르르* 떨려요." },
          hit(w, at) { w.stuck.push({ x: at.x, y: at.y, rot: -0.55, wob: 0.25, life: 3 }); if (w.stuck.length > 4) w.stuck.shift(); },
        },
        {
          id: "chips", name: { en: "Wood Chips", ko: "나무 부스러기" }, param: "8 chips · push",
          cap: { en: "*Chips fly*, the post *rocks back*.", ko: "*부스러기*가 튀고, 기둥이 *흔들려요*." },
          hit(w, at, t) {
            t.ox += 8; t.sx = 0.92; t.flash = 0.6;
            for (let i = 0; i < 8; i++) w.spawn({ type: "chunk", x: at.x, y: at.y, vx: rand(-260, -40), vy: rand(-320, -60), g: 1300, ground: true, bounce: 0.3, vr: rand(-20, 20), life: rand(0.8, 1.4), size: rand(3, 5), color: pick(["217,170,110", "180,130,80"]) });
          },
        },
        {
          id: "stop", name: { en: "Hit Stop + Shake", ko: "멈칫 + 흔들림" }, param: "80ms · trauma .25",
          cap: { en: "*Freeze* on the thunk. A short, *heavy* shake.", ko: "꽂히는 순간 *멈칫*. 짧고 *묵직하게*." },
          hit(w) { w.hitstop(0.08); w.shake(0.25, 1); },
        },
        {
          id: "sound", name: { en: "Whum-whum-THUNK", ko: "휭휭 + 콱" }, param: "1 whum / turn",
          cap: { en: "A *whum* per turn, then a deep *THUNK*.", ko: "한 바퀴에 *휭*, 마지막에 깊은 *콱*." },
          update(w) { for (const b of w.shots) if (b.draw === drawAxe) { const n = Math.floor(b.rot / TAU); if (n !== b.turn) { b.turn = n; w.sfx.swish(); } } },
          hit(w) { w.sfx.thunk(); w.sfx.thud(); },
        },
      ],
    },

    /* ─────────────── 25. 발도술 ─────────────── */
    {
      id: "weapon-katana", cat: "weapon", view: "side",
      title: { en: "Make a quick-draw *cut late*", ko: "발도술은 *늦게 베여야*" },
      intro: { en: "Dash, hit, done. *Where's the cool?*", ko: "지나가며 베고 끝. *멋*은 어디 갔죠?" },
      interval: 2.2, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 90 }); w.foe = w.actor("foe", { home: 320 }); w.kt = { out: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe, x0 = h.x + 40;
        w.tween(h, { x: f.x + 130 }, 0.08, "in", () => {
          h.flip = true;
          const c = { x0, x1: h.x - 40, y: G - 78 }, at = { x: f.x, y: c.y };
          w.emit("cut", c);
          const finish = () => hit(w, f, 100, at);
          if (w.on("delay")) w.after(0.55, () => { w.emit("sheathe", c); finish(); }); else finish();
          w.after(1.3, () => { h.flip = false; w.tween(h, { x: h.home }, 0.4, "inout", () => { w.busy = false; }); });
        });
      },
      drawFront(w, ctx) { drawSheath(ctx, w.hero); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "ghosts", name: { en: "Afterimages", ko: "잔상" }, param: "5 ghosts · 300ms",
          cap: { en: "Leave *afterimages* along the dash.", ko: "지나간 자리에 *잔상*을 남겨요." },
          cut(w, c) {
            const h = w.hero;
            for (let i = 0; i < 5; i++) w.spawn({ type: "ghost", img: SPR.hero.white, x: c.x0 - 40 + (c.x1 - c.x0 + 40) * i / 5, y: G, w: h.w, h: h.h, alpha0: 0.2 + i * 0.1, life: 0.35, add: true });
          },
        },
        {
          id: "line", name: { en: "One Clean Line", ko: "깔끔한 한 줄" }, param: "2px · hangs 500ms",
          cap: { en: "Just *one thin line*, hanging in the air.", ko: "공중에 걸린 *가는 한 줄*. 그거면 돼요." },
          cut(w, c) {
            const L = (c.x1 - c.x0) / 2;
            w.spawn({ type: "slash", x: c.x0 + L, y: c.y, ang: -0.06, len: L + 30, size: 3, life: 0.6, hold: true, color: "255,255,255" });
          },
        },
        {
          id: "delay", name: { en: "Delayed Reaction", ko: "한 박자 늦게" }, param: "react +550ms",
          cap: { en: "Cut now, *react later*. The sheath *click* sets it off.", ko: "지금 베고 *나중에 터져요*. 칼집 *딸깍*이 신호." },
          sheathe(w) {
            const h = w.hero; h.sy = 0.94; h.sx = 1.05;
            w.spawn({ type: "star", x: h.x - 20, y: G - 70, size: 16, life: 0.12, color: "255,255,255" });
          },
        },
        {
          id: "flash", name: { en: "Flash on Click", ko: "딸깍에 번쩍" }, param: "white .7 · stop 100ms",
          cap: { en: "On the click: *white flash*, *freeze*.", ko: "딸깍 하는 순간 *하얗게 번쩍*, *정지*." },
          sheathe(w) { w.flash("255,255,255", 0.7); w.hitstop(0.1); },
        },
        {
          id: "split", name: { en: "Split in Two", ko: "두 동강" }, param: "halves slide apart",
          cap: { en: "The top half *slides off*. No doubt left.", ko: "윗부분이 *스르륵 미끄러져요*. 의심의 여지 없이." },
          kill(w, f) {
            halfSprites();
            w.spawn({ type: "ghost", img: SPR["weapon-foe-top"].c, x: f.x, y: G, w: f.w, h: f.h, alpha0: 1, hold: true, vx: -150, vy: -60, g: 700, life: 1 });
            w.spawn({ type: "ghost", img: SPR["weapon-foe-bot"].c, x: f.x, y: G, w: f.w, h: f.h, alpha0: 1, hold: true, life: 1 });
            w.spawn({ type: "slash", x: f.x, y: G - 76, ang: -0.06, len: 80, size: 5, life: 0.3, color: "255,255,255" });
          },
        },
        {
          id: "wake", name: { en: "Wind Wake", ko: "뒤따르는 바람" }, param: "dust + leaves",
          cap: { en: "Wind *follows* the dash. Dust and *leaves* swirl.", ko: "지나간 뒤로 *바람*이 따라와요. 먼지, *잎사귀*." },
          cut(w, c) {
            for (let i = 0; i < 10; i++) w.spawn({ type: "smoke", x: c.x0 + rand(0, c.x1 - c.x0), y: G - rand(0, 10), vx: rand(120, 260), vy: rand(-40, -10), drag: 2, size: 5, size1: rand(14, 20), life: rand(0.5, 0.8), color: "200,200,210" });
            for (let i = 0; i < 6; i++) w.spawn({ type: "chunk", x: c.x0 + rand(0, c.x1 - c.x0), y: G - rand(10, 120), vx: rand(80, 220), vy: rand(-80, 20), g: 120, drag: 1, vr: rand(-8, 8), life: rand(0.8, 1.2), size: 4, color: "190,242,100" });
          },
        },
        {
          id: "sound", name: { en: "Shing · · · Click", ko: "슝 · · · 딸깍" }, param: "silence in between",
          cap: { en: "A *shing*, silence, a tiny *click*, then the hit.", ko: "*슝*, 정적, 작은 *딸깍*, 그리고 베임." },
          cut(w) { w.sfx.slash(); w.sfx.dash(); },
          sheathe(w) { w.sfx.clickUp(); w.sfx.clickDown(); },
          hit(w) { w.sfx.crit(); },
        },
      ],
    },
  );

  function drawRail(ctx, g, s) {
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(s.rot); ctx.translate(-s.kick, 0);
    box(ctx, -32, -9, 46, 18, "#2a2f3a"); box(ctx, -4, 7, 10, 14, "#1f2430");
    box(ctx, 10, -11, 116, 4, "#94a3b8"); box(ctx, 10, 6, 116, 4, "#94a3b8");
    for (let i = 0; i < 5; i++) {
      const on = s.charge * 5 > i + 0.2;
      box(ctx, 22 + i * 20, -14, 8, 26, on ? "#7dd3fc" : "#334155");
      if (on) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 26 + i * 20, -1, 22, "56,189,248", 0.7); ctx.globalCompositeOperation = "source-over"; }
    }
    ctx.restore();
  }
  function arena(ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(14, 14, 512, 332);
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 3; ctx.strokeRect(14, 14, 512, 332);
  }
  function boomerangSprite() {
    sprite("weapon-boomerang", 80, 80, x => {
      x.lineCap = "round"; x.lineJoin = "round";
      x.strokeStyle = "#7c4a1e"; x.lineWidth = 16; x.beginPath(); x.moveTo(12, 66); x.quadraticCurveTo(22, 20, 40, 14); x.quadraticCurveTo(58, 20, 68, 66); x.stroke();
      x.strokeStyle = "#d97706"; x.lineWidth = 10; x.beginPath(); x.moveTo(12, 66); x.quadraticCurveTo(22, 20, 40, 14); x.quadraticCurveTo(58, 20, 68, 66); x.stroke();
      x.strokeStyle = "#fde68a"; x.lineWidth = 3; x.beginPath(); x.moveTo(16, 60); x.quadraticCurveTo(24, 24, 40, 18); x.stroke();
    });
  }
  // 채찍 마디: 손에서 시작, 마디마다 lag만큼 늦게 같은 궤도를 따라감
  function whipPts(w, s) {
    const g = grip(w), pts = [[g.x, g.y]], t = s.t < 0 ? 0 : s.t;
    let x = g.x, y = g.y;
    for (let i = 0; i < 14; i++) {
      const u = Math.max(0, Math.min(1, t - i * s.lag)), a = 1.9 + 4.45 * E.inout(u) + (s.t < 0 ? i * 0.03 : 0);
      x += Math.cos(a) * 13; y = Math.min(G - 2, y + Math.sin(a) * 13);
      pts.push([x, y]);
    }
    return pts;
  }
  const spearTip = w => { const g = grip(w); return { x: g.x + w.sp.ext + 146, y: g.y - 3 }; };
  const swordPivot = w => { const h = w.hero; return { x: h.x + h.ox + 22, y: G - 96 }; };
  const swordTip = w => loc(swordPivot(w), w.gs.rot, 150, 0);
  function drawGreatsword(ctx, p, rot) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot);
    box(ctx, -26, -4, 26, 8, "#3b2a1e"); box(ctx, -2, -15, 7, 30, "#a16207");
    poly(ctx, [[5, -9], [136, -6], [154, 0], [136, 6], [5, 9]], "#cbd5e1");
    poly(ctx, [[5, -9], [136, -6], [154, 0], [5, 0]], "#e2e8f0");
    line(ctx, [[10, 0], [130, 0]], "rgba(71,85,105,0.6)", 2);
    ctx.restore();
  }
  function drawCrossbow(ctx, g, s) {
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(s.rot); ctx.translate(-s.kick, 0);
    poly(ctx, [[-36, -4], [0, -8], [0, 4], [-36, 10]], "#6b4f3a");
    box(ctx, -2, -9, 88, 7, "#5b4636"); box(ctx, -2, 2, 9, 12, "#1f2430");
    const f = s.flex * 12;
    ctx.strokeStyle = "#475569"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(72 + f, -38); ctx.quadraticCurveTo(88 + f * 0.4, -6, 72 + f, 26); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.5;
    const sx = s.flex > 0.05 ? 74 : 40;
    ctx.beginPath(); ctx.moveTo(72 + f, -38); ctx.lineTo(sx, -6); ctx.lineTo(72 + f, 26); ctx.stroke();
    ctx.restore();
  }
  function drawBolt(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx) + (p.rot || 0));
    box(ctx, -36, -1.5, 40, 3, "#d6d3d1");
    poly(ctx, [[4, -4], [14, 0], [4, 4]], "#94a3b8");
    poly(ctx, [[-36, 0], [-42, -6], [-28, 0], [-42, 6]], "#ef4444");
    ctx.restore();
  }
  function knifeSprite() {
    sprite("weapon-knife", 60, 20, x => {
      x.fillStyle = "#3b2a1e"; x.fillRect(2, 7, 18, 6);
      x.fillStyle = "#94a3b8"; x.fillRect(18, 4, 4, 12);
      x.fillStyle = "#e2e8f0"; x.beginPath(); x.moveTo(22, 5); x.lineTo(58, 10); x.lineTo(22, 15); x.closePath(); x.fill();
      x.fillStyle = "#ffffff"; x.fillRect(24, 6, 26, 2);
    });
  }
  function drawKnife(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.alpha ?? 1;
    ctx.drawImage(SPR["weapon-knife"].c, -30, -10, 60, 20); ctx.restore();
  }
  const handPt = w => { const h = w.hero; return { x: h.x + h.ox + 38, y: G - 112 }; };
  function drawGrenade(ctx, g) {
    if (g.phase === "idle") return;
    if (g.zone > 0) {
      ctx.save(); ctx.translate(g.x, G); ctx.scale(1, 0.22);
      ctx.fillStyle = `rgba(239,68,68,${0.1 + g.zone * 0.25})`; ctx.beginPath(); ctx.arc(0, 0, 130, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(248,113,113,${0.4 + g.zone * 0.6})`; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    }
    const img = SPR.grenade.c, s = 30;
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.drawImage(img, -s / 2, -s * 0.6, s, s * img.height / img.width); ctx.restore();
    if (g.led > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, g.x, g.y - 6, 22, "255,60,60", g.led); ctx.globalCompositeOperation = "source-over"; }
    if (g.ui > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(g.x, g.y - 44, 17, 0, TAU); ctx.stroke();
      ctx.strokeStyle = g.ui < 0.35 ? "#f87171" : "#fde047"; ctx.beginPath(); ctx.arc(g.x, g.y - 44, 17, -Math.PI / 2, -Math.PI / 2 + TAU * g.ui); ctx.stroke();
      label(ctx, Math.max(0, g.t).toFixed(1), g.x, g.y - 44, 11, "#fff", "center", "'JetBrains Mono', monospace", 700);
    }
  }
  function drawMine(ctx, m) {
    const y = G - m.lift, sq = 1 - m.press * 0.3;
    ctx.save(); ctx.translate(m.x, y);
    rr(ctx, -26, -10 * sq, 52, 10 * sq, 4, "#4d5a35"); rr(ctx, -16, -16 * sq, 32, 7 * sq, 3, "#68784a");
    box(ctx, -3, -19 * sq, 6, 4, "#1f2430");
    if (m.led) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, -18 * sq, 18, "255,40,40", 1); ctx.globalCompositeOperation = "source-over"; }
    ctx.restore();
  }
  function drawBolt2(ctx, L) {
    const pts = L.jag ? zig(L.a.x, L.a.y, L.b.x, L.b.y, 8, L.jag) : [[L.a.x, L.a.y], [L.b.x, L.b.y]];
    ctx.globalCompositeOperation = "lighter";
    if (L.core) line(ctx, pts, "rgba(56,189,248,0.45)", 14);
    line(ctx, pts, L.core ? "rgba(255,255,255,1)" : "rgba(147,197,253,0.9)", L.core ? 2.5 : 2);
    for (let i = 0; i < L.forks; i++) {
      const p = pick(pts.slice(1, -1)) || pts[0];
      const f = zig(p[0], p[1], p[0] + rand(-30, 30), p[1] + rand(-50, 50), 3, 6);
      line(ctx, f, "rgba(186,230,253,0.9)", 1.5);
    }
    ctx.globalCompositeOperation = "source-over";
  }
  function drawShard(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y);
    poly(ctx, [[-26, 0], [0, -7], [14, 0], [0, 7]], "#7dd3fc");
    poly(ctx, [[-26, 0], [0, -7], [14, 0]], "#e0f2fe");
    ctx.globalCompositeOperation = "lighter"; glow(ctx, 4, 0, 16, "125,211,252", 0.7); ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
  function drawMissile(ctx, m) {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a);
    ctx.globalCompositeOperation = "lighter"; glow(ctx, -10, 0, 10, "255,170,70", 1); ctx.globalCompositeOperation = "source-over";
    box(ctx, -8, -3, 14, 6, "#e2e8f0"); poly(ctx, [[6, -3], [11, 0], [6, 3]], "#ef4444");
    ctx.restore();
  }
  function drawOrb(ctx, o, t) {
    const n = 18, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, r = o.r + Math.sin(t * 12 + i * 2.1) * o.wob * Math.min(1, o.r / 20); pts.push([o.x + Math.cos(a) * r, o.y + Math.sin(a) * r]); }
    poly(ctx, pts, "#7e22ce");
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, o.x, o.y, o.r * 1.8, "192,132,252", 0.8);
    glow(ctx, o.x - o.r * 0.2, o.y - o.r * 0.2, o.r * 0.7, "255,255,255", 0.7);
    ctx.globalCompositeOperation = "source-over";
  }
  const forkPt = w => { const g = grip(w); return { x: g.x + 22, y: g.y - 26 }; };
  function drawSling(ctx, w) {
    const g = grip(w), s = w.ss, f = forkPt(w);
    const back = s.pull * 44 - s.snap * Math.sin(w.time * 50) * 18;
    line(ctx, [[g.x, g.y + 8], [g.x + 14, g.y - 10], [f.x - 6, f.y - 14]], "#7c4a1e", 5);
    line(ctx, [[g.x + 14, g.y - 10], [f.x + 8, f.y - 12]], "#7c4a1e", 5);
    line(ctx, [[f.x - 6, f.y - 14], [f.x - back, f.y], [f.x + 8, f.y - 12]], "#ef4444", 2.5);
    if (s.pull > 0.05) { ctx.fillStyle = "#a8a29e"; ctx.beginPath(); ctx.arc(f.x - back, f.y, 5, 0, TAU); ctx.fill(); }
    if (s.dots > 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.7 * s.dots})`;
      for (let i = 1; i <= 8; i++) { const t = i * 0.045; ctx.beginPath(); ctx.arc(f.x + 700 * t, f.y - 250 * t + 450 * t * t, 3, 0, TAU); ctx.fill(); }
    }
  }
  function drawStone(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    poly(ctx, [[-6, -3], [-1, -7], [6, -4], [7, 3], [1, 7], [-6, 4]], "#a8a29e");
    poly(ctx, [[-6, -3], [-1, -7], [6, -4], [0, 0]], "#d6d3d1");
    ctx.restore();
  }
  const aimAt = (c, x, y, sp) => { const a = Math.atan2(y - c.y, x - c.x); c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp; };
  const nearest = (w, x, y, skip) => w.foes.filter(f => f.alive && !skip.includes(f)).sort((a, b) => Math.hypot(a.x - x, a.gy - y) - Math.hypot(b.x - x, b.gy - y))[0];
  function drawChakram(ctx, x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); poly(ctx, [[10, -4], [22, 0], [10, 4]], "#e2e8f0"); }
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "#f5f3ff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 12, 3.6, 5.2); ctx.stroke();
    ctx.restore();
  }
  const lanceTip = w => w.hero.x + w.hero.ox + 172;
  function drawLance(ctx, w) {
    const h = w.hero, x = h.x + h.ox + 36, y = G - 72;
    poly(ctx, [[x + 8, y - 5], [x + 136, y - 1], [x + 136, y + 1], [x + 8, y + 5]], "#cbd5e1");
    poly(ctx, [[x + 8, y - 5], [x + 136, y - 1], [x + 8, y]], "#f1f5f9");
    poly(ctx, [[x - 4, y - 16], [x + 14, y - 3], [x + 14, y + 3], [x - 4, y + 16]], "#a16207");
    box(ctx, x - 40, y - 3, 40, 6, "#7c4a1e");
  }
  function postSprite() {
    polySprite("weapon-post", () => [blk(0, 0, 0, 46, 150, 46, 0.94), blk(0, 150, 0, 44, 8, 44, 0.9)], 90, 200, -0.5, 0.25, [222, 170, 112], [70, 44, 24]);
  }
  function drawAxe(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    box(ctx, -26, -3, 44, 6, "#8a5a34");
    poly(ctx, [[10, -6], [26, -16], [30, 0], [26, 16], [10, 6]], "#94a3b8");
    poly(ctx, [[26, -16], [30, 0], [26, 16], [24, 0]], "#f1f5f9");
    ctx.restore();
  }
  function drawSheath(ctx, h) {
    const d = h.flip ? -1 : 1, x = h.x + h.ox, y = G - 70;
    line(ctx, [[x - d * 34, y + 16], [x + d * 26, y - 2]], "#1e1b2e", 7);
    line(ctx, [[x + d * 26, y - 2], [x + d * 48, y - 9]], "#b91c1c", 5);
    box(ctx, x + d * 24 - 2, y - 7, 4, 10, "#fbbf24");
  }
  function halfSprites() {
    const src = SPR.foe.c, W = src.width, H = src.height;
    const cut = (key, top) => sprite(key, W, H, x => {
      x.beginPath();
      if (top) { x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W, H * 0.42); x.lineTo(0, H * 0.5); }
      else { x.moveTo(0, H * 0.5); x.lineTo(W, H * 0.42); x.lineTo(W, H); x.lineTo(0, H); }
      x.closePath(); x.clip(); x.drawImage(src, 0, 0);
    });
    cut("weapon-foe-top", true); cut("weapon-foe-bot", false);
  }
})();

"use strict";
/* duel — 1대1·보스전 레시피 25편 */
(() => {
  /* ───── 파일 전용 도우미 ───── */
  const F = -1;
  const GREEN = [[125, 185, 85], [22, 42, 18]], CRIMSON = [[240, 110, 92], [70, 14, 20]];
  // 큰 고블린 족장: 굵은 다리, 큰 배, 어깨 갑옷, 금관
  const bossModel = () => {
    const tint = (p, l, d) => Object.assign(p, { light: l, dark: d });
    const gold = p => tint(p, [255, 214, 90], [110, 70, 10]);
    const iron = p => tint(p, [176, 168, 160], [40, 36, 34]);
    const ear = s => pyr([[F * 6, 150, s * 36], [F * 34, 150, s * 36], [F * 34, 174, s * 36], [F * 6, 174, s * 36]], [F * -12, 194, s * 100]);
    const spike = z => gold(pyr([[F * 20, 176, z - 8], [F * 40, 176, z - 8], [F * 40, 176, z + 8], [F * 20, 176, z + 8]], [F * 30, 206, z]));
    return [
      blk(0, 0, -24, 36, 52, 32, 0.9), blk(0, 0, 24, 36, 52, 32, 0.9),
      blk(0, 50, 0, 84, 72, 86, 0.92, F * 14, 0),
      iron(blk(F * 4, 56, 0, 90, 12, 92, 1, F * 2, 0)),
      blk(F * 16, 46, -62, 26, 82, 26, 0.85, F * 10, 0), blk(F * 16, 46, 62, 26, 82, 26, 0.85, F * 10, 0),
      iron(blk(F * 12, 112, -58, 44, 20, 44, 0.7)), iron(blk(F * 12, 112, 58, 44, 20, 44, 0.7)),
      blk(F * 26, 118, 0, 74, 58, 70, 0.8, F * 4, 0),
      gold(blk(F * 30, 170, 0, 62, 8, 58)),
      ear(1), ear(-1),
      pyr([[F * 60, 132, -11], [F * 60, 132, 11], [F * 60, 156, 11], [F * 60, 156, -11]], [F * 96, 136, 0]),
      spike(-22), spike(0), spike(22),
    ];
  };
  const art = () => {
    polySprite("duel-boss", bossModel, 260, 260, 0.62, 0.3, ...GREEN);
    polySprite("duel-boss2", bossModel, 260, 260, 0.62, 0.3, ...CRIMSON);
    polySprite("duel-bossTop", bossModel, 200, 200, 0, Math.PI / 2 - 0.001, ...GREEN);
    polySprite("duel-mirror", humanModel, 170, 260, -0.72, 0.3, [140, 196, 255], [16, 34, 84]);
    if (!ACTOR["duel-boss"]) {
      ACTOR["duel-boss"] = { spr: "duel-boss", h: 210, home: 410, hp: 1000 };
      ACTOR["duel-bossTop"] = { spr: "duel-bossTop", h: 120, home: 420, top: true, hp: 1000 };
      ACTOR["duel-mirror"] = { spr: "duel-mirror", h: 140, home: 420 };
    }
  };
  const BLACK = {};
  const black = key => BLACK[key] || (BLACK[key] = tinted(SPR[key].c, "#05060a"));
  // 연출 처음부터 다시: 남은 타이머·트윈·카메라를 비움
  const restart = w => { w.timers.length = 0; w.tweens.length = 0; w.slowT = 0; w.ts = 1; w.stopT = 0; w.cam.tx = w.cam.ty = 0; w.camZ = 0; if (w.blade) w.blade.a = -1.1; };
  const camHold = w => { if (w.camZ) w.zoom = Math.max(w.zoom, w.camZ); };
  const handH = a => ({ x: a.x + a.ox + a.w * 0.4, y: a.gy + a.oy - a.h * 0.55 });
  const handF = a => ({ x: a.x + a.ox - a.w * 0.3, y: a.gy + a.oy - a.h * 0.36 });
  const bossHand = b => ({ x: b.x + b.ox - b.w * 0.2, y: b.gy + b.oy - b.h * 0.3 });
  const chest = b => ({ x: b.x + b.ox - b.w * 0.18, y: b.gy + b.oy - b.h * 0.55 });
  const say = (w, text, x, y, size, color = "#fff", life = 1, vy = -20) => w.spawn({ type: "text", text, x, y, vy, life, size, color });
  const ghost = (w, a, img = a.s.cyan, life = 0.3, al = 0.5) => w.spawn({ type: "ghost", img, x: a.x + a.ox, y: a.gy + a.oy, w: a.w, h: a.h, sx: a.flip ? -1 : 1, life, alpha0: al });
  function boom(w, x, y, s = 1, col = "255,170,60") {
    w.spawn({ type: "glow", x, y, size: 70 * s, size1: 20 * s, life: 0.3, color: col });
    w.spawn({ type: "star", x, y, size: 44 * s, life: 0.12, color: "255,255,240" });
    w.spawn({ type: "ring", x, y, size: 10, size1: 80 * s, life: 0.35, w: 9, color: col });
    sparks(w, x, y, Math.round(12 * s), "255,220,150", [150, 520 * s]);
    for (let i = 0; i < 4; i++) w.spawn({ type: "smoke", x: x + rand(-14, 14) * s, y: y + rand(-14, 14) * s, vx: rand(-60, 60), vy: rand(-90, -20), drag: 2, size: 10 * s, size1: 26 * s, life: rand(0.5, 0.8), color: "90,84,80" });
  }
  function crack(w, x, y, n = 5, life = 1.6) {
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1, pts = [[0, 0]];
      let px = 0, py = 0;
      for (let k = 0; k < 4; k++) { px += dir * rand(14, 30); py += rand(-3, 5); pts.push([px, py]); }
      w.spawn({ type: "crack", x, y: y + rand(-3, 3), pts, w: 3, life, hold: true, color: "20,16,14", under: true, add: false });
    }
  }
  function drawSword(ctx, x, y, ang, len = 74, col = "#e5e7eb") {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = "#7c4a1e"; ctx.fillRect(-14, -3, 16, 6);
    ctx.fillStyle = "#d4a017"; ctx.fillRect(0, -9, 5, 18);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(5, -4); ctx.lineTo(len - 12, -4); ctx.lineTo(len, 0); ctx.lineTo(len - 12, 4); ctx.lineTo(5, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(7, -4, len - 20, 1.6);
    ctx.restore();
  }
  function drawClub(ctx, x, y, rot, L = 118) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = "#6b3f1d"; ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-6, -L, 12, L + 14, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3f3a36"; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = i % 2 ? 22 : 33; ctx.lineTo(Math.cos(a) * r * 0.85, -L + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8a8178"; ctx.beginPath(); ctx.ellipse(-4, -L - 6, 13, 18, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const clubTip = (p, rot, L = 118) => ({ x: p.x + Math.sin(rot) * L, y: p.y - Math.cos(rot) * L });
  // 배우 위에 같은 변형으로 다른 그림을 겹쳐 그림
  function drawOver(ctx, a, img, alpha) {
    if (alpha <= 0 || a.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, alpha) * a.alpha;
    ctx.translate(a.x + a.ox, a.gy + a.oy);
    if (a.rot) { ctx.translate(0, -a.h / 2); ctx.rotate(a.rot); ctx.translate(0, a.h / 2); }
    ctx.scale(a.sx * (a.flip ? -1 : 1), a.sy);
    ctx.drawImage(img, -a.w / 2, -a.h, a.w, a.h);
    ctx.restore();
  }
  // 화면 위쪽 보스 체력바
  function topBar(ctx, b, o = {}) {
    const X = o.x ?? 100, W = o.w ?? 340, Y = (o.y ?? 60) + (b.barShake > 0 ? rand(-3, 3) : 0), H = o.h ?? 14, v = o.v ?? Math.max(0, b.hp) / b.maxHp;
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(X - 4, Y - 4, W + 8, H + 8, 6); ctx.fill();
    if (o.under) { ctx.fillStyle = o.under; ctx.fillRect(X, Y, W, H); }
    if (o.lag) { ctx.fillStyle = "#facc15"; ctx.fillRect(X, Y, W * Math.max(0, b.hpLag) / b.maxHp, H); }
    ctx.fillStyle = o.col || "#ef4444"; ctx.fillRect(X, Y, W * Math.max(0, Math.min(1, v)), H);
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(X, Y, W * Math.max(0, Math.min(1, v)), 4);
    if (o.name) label(ctx, o.name, X, Y - 13, 13, "rgba(255,255,255,0.9)", "left", "'JetBrains Mono', monospace", 700);
  }
  function heroBar(ctx, a, x, y, lag) {
    const W = 150, H = 10;
    ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, W + 6, H + 6, 5); ctx.fill();
    if (lag) { ctx.fillStyle = "#facc15"; ctx.fillRect(x, y, W * Math.max(0, a.hpLag) / a.maxHp, H); }
    ctx.fillStyle = "#4ade80"; ctx.fillRect(x, y, W * Math.max(0, a.hp) / a.maxHp, H);
    label(ctx, "YOU", x, y - 11, 11, "rgba(255,255,255,0.8)", "left", "'JetBrains Mono', monospace", 700);
  }
  // 주인공의 맨 칼: 기본 상태에서도 '베었다'가 보이게
  const blade = w => w.blade || (w.blade = { a: -1.1 });
  // 주인공이 픽셀 동작 그림이면 칼을 따로 그리지 않고, 칼 각도의 움직임을 준비·베기 자세로 바꿈
  function heroSword(w, ctx) {
    const h = w.hero; if (h.alpha <= 0) return;
    if (poseSet(h)) { const b = blade(w), v = b.a - (b._prev ?? b.a); b._prev = b.a; if (v > 0.12) { h.forcePose = "slash"; h.forceFrames = 16; } else if (b.a < -1.5 && !(h.forceFrames > 0)) { h.forcePose = "windup"; h.forceFrames = 2; } return; }
    const p = handH(h); drawSword(ctx, p.x, p.y, blade(w).a, 72);
  }
  function swing(w) {
    const s = blade(w); s.a = -2.0;
    w.tween(s, { a: 0.7 }, 0.12, "in", () => w.after(0.22, () => w.tween(s, { a: -1.1 }, 0.3, "out")));
  }
  const growl = w => w.play(() => { nz({ dur: 0.9, type: "lowpass", f: 500, f2: 140, q: 3, vol: 0.55 }); tn({ type: "sawtooth", f: 90, f2: 55, dur: 0.9, vol: 0.12 }); tn({ type: "square", f: 64, f2: 48, dur: 0.8, vol: 0.08 }); });
  const clang = w => w.play(() => { tn({ type: "triangle", f: 2100, f2: 1900, dur: 0.5, vol: 0.18 }); tn({ type: "triangle", f: 3150, dur: 0.3, vol: 0.08 }); nz({ dur: 0.08, type: "highpass", f: 3000, vol: 0.4 }); });

  RECIPES.push(
    /* 1 ─ 보스 등장 */
    {
      id: "duel-entrance", cat: "duel", view: "side", polished: true, hookDur: 2.6,
      title: { en: "Give the boss a real *entrance*", ko: "보스 *등장*을 제대로" },
      intro: { en: "A big guy shows up. *Who?*", ko: "큰 놈이 나왔어요. *누구지?*" },
      interval: 2.6, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 110 }); w.boss = w.actor("duel-boss", { home: 400 }); w.dim = 0; w.card = null; },
      fire(w) {
        restart(w);
        const b = w.boss; b.oy = -300; w.dim = 0; w.card = null; w.hero.ox = 0;
        w.emit("start", b);
        w.tween(b, { oy: 0 }, 0.36, "in", () => {
          w.emit("land", b);
          w.after(0.08, () => w.emit("roar", b));
          w.after(0.14, () => w.emit("title", b));
        });
      },
      update(w, dt) { camHold(w); if (w.card) w.card.t += dt; },
      drawBack(w, ctx) {
        if (w.dim <= 0) return;
        const b = w.boss, cx = b.x + b.ox, g = ctx.createRadialGradient(cx, G - 100, 40, cx, G - 100, 240);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${0.72 * w.dim})`);
        ctx.fillStyle = g; ctx.fillRect(-120, -120, 780, 600);
        const cone = ctx.createLinearGradient(0, -20, 0, G);
        cone.addColorStop(0, "rgba(255,240,200,0)"); cone.addColorStop(1, `rgba(255,240,200,${0.16 * w.dim})`);
        ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(cx - 30, -20); ctx.lineTo(cx + 30, -20); ctx.lineTo(cx + 130, G); ctx.lineTo(cx - 130, G); ctx.closePath(); ctx.fill();
      },
      drawHud(w, ctx) {
        const c = w.card; if (!c) return;
        const k = E.out(Math.min(1, c.t / 0.3)), x = 76 + w.cam.x - (1 - k) * 260;
        ctx.globalAlpha = Math.min(1, c.t / 0.15);
        ctx.fillStyle = "#c6f432"; ctx.fillRect(x, 136, 230 * k, 4);
        label(ctx, "— BOSS —", x, 70, 14, "#c6f432", "left", "'JetBrains Mono', monospace", 700);
        ctx.save(); ctx.font = "900 34px Pretendard, sans-serif"; ctx.lineWidth = 7; ctx.strokeStyle = "rgba(8,10,16,0.9)"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.strokeText("ENEMY", x, 96); ctx.strokeText("WARLORD", x, 122);
        ctx.fillStyle = "#fff"; ctx.fillText("ENEMY", x, 96); ctx.fillText("WARLORD", x, 122); ctx.restore();
        label(ctx, "Lord of the Deep Pit", x, 154, 13, "rgba(255,255,255,0.65)", "left");
        ctx.globalAlpha = 1;
      },
      steps: [
        {
          id: "dim", name: { en: "Lights Down", ko: "조명 낮추기" }, param: "dim 72% + spotlight",
          cap: { en: "Dim the room. Put a *spotlight* on the boss.", ko: "주변은 *어둡게*, 보스에게만 *조명*." },
          start(w) { w.dim = 1; },
        },
        {
          id: "land", name: { en: "Heavy Landing", ko: "묵직한 착지" }, param: "trauma .6 · cracks",
          cap: { en: "It *lands*. The floor *cracks*, the screen shakes.", ko: "*쿵* 떨어지면 바닥이 *쩍* 갈라져요." },
          land(w, b) {
            w.shake(0.6);
            w.spawn({ type: "ring", x: b.x, y: G, size: 20, size1: 200, life: 0.45, w: 8, flat: true, color: "255,230,190" });
            crack(w, b.x, G, 6); dust(w, b.x - 60, G, 10, -1); dust(w, b.x + 60, G, 10, 1);
          },
        },
        {
          id: "camera", name: { en: "Camera Push", ko: "카메라 밀기" }, param: "lead 60px · zoom 12%",
          cap: { en: "Push the *camera* toward the boss. Make room for it.", ko: "*카메라*를 보스 쪽으로 밀어요." },
          start(w) { w.cam.tx = 50; w.cam.ty = -14; w.camZ = 0.12; },
          land(w) { w.zoomPunch(0.2); },
        },
        {
          id: "roar", name: { en: "Roar", ko: "포효" }, param: "3 rings · push 40px",
          cap: { en: "A *roar* you can see. Rings blow the hero *back*.", ko: "*포효*가 눈에 보여요. 주인공이 *밀려나요*." },
          roar(w, b) {
            const m = { x: b.x - 70, y: G - 150 };
            for (let i = 0; i < 3; i++) w.after(i * 0.1, () => w.spawn({ type: "ring", x: m.x, y: m.y, size: 20, size1: 200, life: 0.5, w: 7, color: "255,255,255" }));
            b.forcePose = "attack"; b.forceUntil = w.time + 0.7; w.hero.ox -= 40; w.shake(0.3);
          },
        },
        {
          id: "title", name: { en: "Name Card", ko: "이름표" }, param: "slide 300ms",
          cap: { en: "*Name it.* A title card makes it a *boss*.", ko: "*이름*을 붙이면 그때부터 *보스*예요." },
          title(w) { w.card = { t: 0 }; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slam + growl",
          cap: { en: "A deep *slam*, then a long *growl*.", ko: "*쿵* 하고, 길게 *그르릉*." },
          land(w) { if (w.on("land")) w.sfx.slam(); else w.sfx.land(); },
          roar(w) { if (w.on("roar")) growl(w); },
        },
      ],
    },

    /* 2 ─ 보스 체력바 등장 */
    {
      id: "duel-hpintro", cat: "duel", view: "side",
      title: { en: "Make the boss bar *fill in*", ko: "보스 체력바를 *채우며* 등장" },
      intro: { en: "The bar just… *is there*.", ko: "체력바가 그냥… *떠 있어요*." },
      interval: 2.2, stepDur: 3.8,
      setup(w) { art(); w.hero = w.actor("hero", { home: 110 }); w.boss = w.actor("duel-boss", { home: 400 }); w.bar = { v: 0, seg: 0, flash: 0, nameT: 9, bump: 0 }; },
      fire(w) {
        restart(w);
        const bar = w.bar; bar.v = 0; bar.seg = 0; bar.flash = 0; bar.nameT = 9;
        w.emit("show", bar);
        if (!w.on("fill")) { bar.v = 1; w.emit("full", bar); }
      },
      update(w, dt) {
        const bar = w.bar;
        bar.flash = Math.max(0, bar.flash - dt * 2.5); bar.bump = Math.max(0, bar.bump - dt * 5); bar.nameT += dt;
        while (bar.seg < 4 && bar.v >= (bar.seg + 1) / 5) { bar.seg++; w.emit("tick", bar.seg, 100 + 340 * bar.seg / 5); }
      },
      drawHud(w, ctx) {
        const bar = w.bar, X = 100, W = 340, Y = 60, H = 16;
        ctx.save(); ctx.translate(270, Y + 8); ctx.scale(1 + bar.bump * 0.03, 1 + bar.bump * 0.12); ctx.translate(-270, -Y - 8);
        topBar(ctx, w.boss, { v: bar.v, h: H });
        if (w.on("ticks")) for (let i = 1; i < 5; i++) { ctx.fillStyle = bar.v >= i / 5 ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.12)"; ctx.fillRect(X + W * i / 5 - 1.5, Y, 3, H); }
        if (w.on("edge") && bar.v > 0 && bar.v < 1) { const ex = X + W * bar.v; glow(ctx, ex, Y + H / 2, 26, "255,230,200", 0.9); ctx.fillStyle = "#fff"; ctx.fillRect(ex - 3, Y - 3, 4, H + 6); }
        if (bar.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${bar.flash})`; ctx.fillRect(X, Y, W, H); }
        ctx.restore();
        const name = "DARK WARLORD", n = w.on("name") ? Math.min(name.length, Math.floor(bar.nameT * 30)) : name.length;
        label(ctx, name.slice(0, n), X, Y - 14, 15, "#fff", "left", "'JetBrains Mono', monospace", 800);
        if (w.on("name") && n < name.length) { ctx.fillStyle = "#c6f432"; ctx.fillRect(X + n * 9.1, Y - 22, 8, 15); }
      },
      steps: [
        {
          id: "fill", name: { en: "Fill Up", ko: "차오르기" }, param: "0→100% · 900ms",
          cap: { en: "Don't pop it in. *Fill it up* — show how much there is.", ko: "툭 띄우지 말고 *차오르게*. 양이 보여요." },
          show(w, bar) { w.tween(bar, { v: 1 }, 0.9, "inout", () => w.emit("full", bar)); },
        },
        {
          id: "edge", name: { en: "Leading Edge", ko: "밝은 끝" }, param: "glow + sparks",
          cap: { en: "A *hot edge* leads the fill and drops sparks.", ko: "차오르는 *끝이 반짝*, 불씨를 흘려요." },
          update(w) {
            const v = w.bar.v; if (v <= 0 || v >= 1) return;
            w.spawn({ type: "spark", x: 100 + 340 * v, y: 68, vx: rand(-260, -60), vy: rand(-140, 140), drag: 4, life: 0.25, size: 2, color: "255,220,160" });
          },
        },
        {
          id: "ticks", name: { en: "Segment Ticks", ko: "칸 나누기" }, param: "5 segments",
          cap: { en: "Split it into *chunks*. Each one *ticks* as it fills.", ko: "*칸*으로 나누고, 찰 때마다 *톡*." },
          tick(w, i, x) { w.bar.bump = 1; w.spawn({ type: "star", x, y: 68, size: 16, life: 0.16, color: "255,255,255" }); },
        },
        {
          id: "name", name: { en: "Typed Name", ko: "이름 타자" }, param: "30 chars/s",
          cap: { en: "Type the *name* in. Letter by letter.", ko: "*이름*은 한 글자씩 *타닥타닥*." },
          show(w, bar) { bar.nameT = 0; },
        },
        {
          id: "flash", name: { en: "Full Flash", ko: "가득 차면 번쩍" }, param: "white bar · trauma .25",
          cap: { en: "Full? *Flash it white* and nudge the screen.", ko: "가득 차면 *하얗게* 번쩍, 화면도 *쿵*." },
          full(w, bar) { bar.flash = 1; w.shake(0.25); w.boss.flash = 1; sparks(w, 440, 68, 14, "255,240,200", [150, 420]); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising ticks + thud",
          cap: { en: "Ticks *climb in pitch*, then a heavy *thud*.", ko: "*띡띡띡* 올라가다 마지막에 *쿵*." },
          tick(w, i) { w.sfx.blip(i * 3); },
          full(w) { w.sfx.thud(); },
        },
      ],
    },

    /* 3 ─ 페이즈 전환 */
    {
      id: "duel-phase", cat: "duel", view: "side",
      title: { en: "Make phase 2 an *event*", ko: "2페이즈를 *사건*으로" },
      intro: { en: "Half HP. It changed color. *Okay?*", ko: "체력 절반. 색이 바뀌었네. *그래서?*" },
      interval: 2.4, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 120 }); w.boss = w.actor("duel-boss", { home: 400 }); w.ph = 0; w.bubble = 0; },
      fire(w) {
        restart(w);
        const b = w.boss, h = w.hero;
        b.hp = 640; b.oy = 0; w.ph = 0; w.bubble = 0;
        w.tween(h, { x: 270 }, 0.2, "in", () => {
          swing(w); b.hp = 500; b.ox += 18; w.emit("phase", b);
          if (!w.on("morph")) w.ph = 1;
          w.after(0.12, () => w.tween(h, { x: h.home }, 0.25, "inout"));
        });
      },
      update(w, dt) { w.bubble = Math.max(0, w.bubble - dt); },
      drawFront(w, ctx) {
        const b = w.boss;
        drawOver(ctx, b, SPR["duel-boss2"].c, w.ph); heroSword(w, ctx);
        if (w.bubble > 0) {
          const c = chest(b), r = 130 + Math.sin(w.time * 20) * 3, a = Math.min(1, w.bubble * 3);
          ctx.globalCompositeOperation = "lighter"; glow(ctx, c.x + 10, c.y, r, "251,113,133", 0.25 * a);
          ctx.strokeStyle = `rgba(255,200,210,${0.7 * a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x + 10, c.y, r * 0.8, 0, TAU); ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
      },
      drawHud(w, ctx) {
        topBar(ctx, w.boss, { name: "DARK WARLORD", col: w.ph > 0.5 ? "#f43f5e" : "#ef4444" });
        ctx.fillStyle = "#fff"; ctx.fillRect(268, 54, 3, 26);
      },
      steps: [
        {
          id: "freeze", name: { en: "Freeze Frame", ko: "정지 화면" }, param: "stop 250ms",
          cap: { en: "*Stop everything* on the hit that crosses 50%.", ko: "50%를 넘기는 한 방에 *모두 정지*." },
          phase(w, b) { w.hitstop(0.25); b.flash = 0.55; },
        },
        {
          id: "lift", name: { en: "Lift & Shield", ko: "떠오르며 무적" }, param: "rise 40px · 1.2s",
          cap: { en: "It *rises* in a bubble. No damage now — *watch*.", ko: "보호막 속에서 *떠올라요*. 지금은 *구경*." },
          phase(w, b) {
            w.bubble = 1.2;
            w.tween(b, { oy: -40 }, 0.4, "out");
            w.after(1.1, () => w.tween(b, { oy: 0 }, 0.12, "in", () => w.shake(0.4)));
          },
        },
        {
          id: "morph", name: { en: "Color Morph", ko: "서서히 변신" }, param: "blend 900ms · rings",
          cap: { en: "*Blend* into the new form. Pulse rings outward.", ko: "새 모습으로 *스르륵*. 고리가 *퍼져요*." },
          phase(w, b) {
            w.tween(w, { ph: 1 }, 0.9, "in");
            const c = chest(b);
            for (let i = 0; i < 4; i++) w.after(0.15 + i * 0.2, () => w.spawn({ type: "ring", x: c.x, y: c.y - 30, size: 30, size1: 190, life: 0.5, w: 8, color: "251,113,133" }));
          },
        },
        {
          id: "debris", name: { en: "Floating Rocks", ko: "떠오르는 돌" }, param: "14 rocks",
          cap: { en: "The ground *cracks* and rocks *float up*.", ko: "바닥이 *쩍*, 돌멩이가 *둥둥*." },
          phase(w, b) {
            crack(w, b.x, G, 6, 2);
            for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: b.x + rand(-150, 150), y: G - 2, vx: rand(-10, 10), vy: rand(-120, -50), vr: rand(-3, 3), life: rand(1, 1.4), size: rand(4, 9), color: "120,110,100" });
          },
        },
        {
          id: "banner", name: { en: "Phase Banner", ko: "페이즈 글자" }, param: "PHASE 2",
          cap: { en: "*Say it.* Big words: PHASE 2.", ko: "*말해 줘요*. 큼직하게 PHASE 2." },
          phase(w) { w.after(0.3, () => { say(w, "PHASE 2", 150, 150, 44, "#fb7185", 1.3, -8); w.flash("244,63,94", 0.25); }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hit + rising hum",
          cap: { en: "Cut to *silence*, then a *rising* hum and a slam.", ko: "*뚝* 끊겼다가, *웅~* 차오르고 *쿵*." },
          phase(w) { w.sfx.crit(); w.after(0.3, () => w.sfx.charge()); w.after(1.2, () => w.sfx.slam()); },
        },
      ],
    },

    /* 4 ─ 분노 */
    {
      id: "duel-enrage", cat: "duel", view: "side",
      title: { en: "Show the boss is *enraged*", ko: "보스가 *분노*한 게 보이게" },
      intro: { en: "Enraged. Says the *log*.", ko: "분노했대요. *로그*에만요." },
      interval: 2.0, stepDur: 3.8,
      setup(w) { art(); w.hero = w.actor("hero", { home: 110 }); w.boss = w.actor("duel-boss", { home: 410 }); w.rage = 0; },
      fire(w) {
        restart(w);
        const b = w.boss, h = w.hero;
        Object.assign(b, { x: b.home, h: 210, w: 210, tint: 0 }); w.rage = 0; h.ox = 0;
        b.sx = 1.15; b.sy = 0.85;
        w.after(0.12, () => { w.rage = 1; w.emit("rage", b); say(w, "ENRAGED", b.x, 50, 15, "#9ca3af", 0.8, 0); });
        w.after(0.45, () => {
          w.emit("lunge", b);
          w.tween(b, { x: 250 }, 0.22, "in", () => {
            h.ox -= 55; h.tint = 1; w.emit("hit", b);
            w.tween(b, { x: b.home }, 0.35, "inout");
          });
        });
      },
      update(w) { if (!w.rage) w.boss.tint = 0; },
      steps: [
        {
          id: "tint", name: { en: "Red Pulse", ko: "붉은 맥박" }, param: "tint .45±.25 · 14Hz",
          cap: { en: "Pulse the boss *red*. Like it's *boiling*.", ko: "보스가 *붉게* 맥박 쳐요. *끓는* 것처럼." },
          update(w) { if (w.rage) w.boss.tint = 0.45 + 0.25 * Math.sin(w.time * 14); },
        },
        {
          id: "steam", name: { en: "Steam", ko: "김 뿜기" }, param: "30 puffs/s",
          cap: { en: "*Steam* off the head. Anger you can see.", ko: "머리에서 *김*이 펄펄. 화가 보여요." },
          update(w, dt) {
            const b = w.boss; if (!w.rage || Math.random() > dt * 30) return;
            w.spawn({ type: "smoke", x: b.x - 30 + rand(-30, 30), y: b.gy - b.h + 20, vx: rand(-40, 40), vy: rand(-140, -80), size: 6, size1: 22, life: 0.6, color: "255,190,170" });
          },
        },
        {
          id: "grow", name: { en: "Bulk Up", ko: "덩치 키우기" }, param: "scale 1.15 · back",
          cap: { en: "Make it *bigger*. Instantly reads as dangerous.", ko: "*덩치*를 키워요. 바로 위험해 보여요." },
          rage(w, b) { w.tween(b, { h: 242, w: 242 }, 0.3, "back"); },
        },
        {
          id: "speed", name: { en: "Afterimages", ko: "잔상" }, param: "ghost every 30ms",
          cap: { en: "Attacks get *faster*. Leave *afterimages*.", ko: "공격이 *빨라져요*. *잔상*을 남겨요." },
          lunge(w, b) { for (let i = 0; i < 6; i++) w.after(i * 0.03, () => ghost(w, b, b.s.red, 0.35, 0.45)); },
        },
        {
          id: "vignette", name: { en: "Red Edges", ko: "붉은 화면 끝" }, param: "vignette .45",
          cap: { en: "Bleed *red* into the screen edges. Tension stays.", ko: "화면 끝이 *붉게* 물들어요. 긴장이 남아요." },
          rage(w) { w.flash("220,38,38", 0.3); },
          update(w) { if (w.rage) w.vignette(0.45 + 0.15 * Math.sin(w.time * 7)); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "growl + hurt",
          cap: { en: "A low *growl* starts it. Hits get *meaner*.", ko: "낮은 *그르릉*으로 시작. 맞는 소리도 *세게*." },
          rage(w) { growl(w); },
          hit(w) { w.sfx.hurt(); w.sfx.thud(); },
        },
      ],
    },

    /* 5 ─ 예고된 내려찍기 + 회피 */
    {
      id: "duel-slam", cat: "duel", view: "side",
      title: { en: "Telegraph the boss *slam*", ko: "보스 내려찍기를 *예고*하기" },
      intro: { en: "Slam. No warning. *Unfair.*", ko: "쾅. 예고도 없이. *억울해요*." },
      interval: 2.0, stepDur: 3.8,
      setup(w) { art(); w.hero = w.actor("hero", { home: 210 }); w.boss = w.actor("duel-boss", { home: 430 }); w.club = { rot: 0.2 }; w.zone = null; },
      fire(w) {
        restart(w);
        const h = w.hero; h.x = h.home; h.rot = 0; w.club.rot = 0.2; w.zone = null;
        const z = { x: 220, t: 0, dur: 0.6 };
        const slam = () => {
          w.emit("dodge", h);
          w.tween(h, { x: 80 }, 0.22, "out");
          w.tween(w.club, { rot: -2.0 }, 0.18, "in", () => {
            w.zone = null; w.emit("slam", { x: 222, y: G });
            w.after(0.5, () => w.tween(w.club, { rot: 0.2 }, 0.4, "inout"));
            w.after(0.7, () => w.tween(h, { x: h.home }, 0.4, "inout"));
          });
        };
        if (w.on("telegraph")) { w.emit("warn", z); w.after(z.dur, slam); } else slam();
      },
      update(w, dt) { if (w.zone) w.zone.t += dt; },
      drawBack(w, ctx) {
        const z = w.zone; if (!z) return;
        const k = Math.min(1, z.t / z.dur), blink = 0.55 + 0.45 * Math.sin(z.t * 30);
        ctx.save(); ctx.translate(z.x, G); ctx.scale(1, 0.24);
        ctx.fillStyle = `rgba(239,68,68,${0.18 + 0.12 * blink})`; ctx.beginPath(); ctx.arc(0, 0, 95, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(239,68,68,0.45)"; ctx.beginPath(); ctx.arc(0, 0, 95 * k, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,120,120,0.9)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 95, 0, TAU); ctx.stroke();
        ctx.restore();
      },
      drawFront(w, ctx) { drawClub(ctx, ...Object.values(bossHand(w.boss)), w.club.rot); },
      steps: [
        {
          id: "telegraph", name: { en: "Danger Zone", ko: "위험 구역" }, param: "600ms fill",
          cap: { en: "Paint the *hit zone* first. It *fills up* = time left.", ko: "맞을 *자리*를 먼저. *차오르는* 만큼 남은 시간." },
          warn(w, z) { w.zone = z; },
        },
        {
          id: "windup", name: { en: "Big Wind-up", ko: "크게 들어올리기" }, param: "raise 450ms + glint",
          cap: { en: "Raise it *slowly* and *high*. A glint says “now”.", ko: "*천천히, 높이*. 반짝이면 *곧*이에요." },
          warn(w) {
            const b = w.boss;
            w.tween(w.club, { rot: 0.75 }, 0.45, "out"); w.tween(b, { ox: 16 }, 0.45, "out");
            w.after(0.4, () => { const p = clubTip(bossHand(b), 0.75); w.spawn({ type: "star", x: p.x, y: p.y, size: 30, life: 0.2, color: "255,255,255" }); });
          },
        },
        {
          id: "dodge", name: { en: "Dodge Roll", ko: "구르기 회피" }, param: "spin + i-frames",
          cap: { en: "*Roll* out with a spin and a *blink*.", ko: "*데굴* 굴러 피하고 *깜빡*." },
          dodge(w, h) {
            h.blink = 0.4; h.sx = 1.2; h.sy = 0.75;
            w.tween(h, { rot: -TAU }, 0.24, "out", () => { h.rot = 0; });
            for (let i = 0; i < 4; i++) w.after(i * 0.04, () => ghost(w, h, h.s.white, 0.25, 0.35));
          },
        },
        {
          id: "impact", name: { en: "Impact", ko: "충격" }, param: "trauma .7 · ring 180",
          cap: { en: "*Crack* the floor. Throw rocks. Shake *hard*.", ko: "바닥이 *쩍*, 돌이 *튀고*, 화면이 *쾅*." },
          slam(w, p) {
            w.shake(0.7); w.zoomPunch(0.06);
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 20, size1: 180, life: 0.45, w: 10, flat: true, color: "255,200,150" });
            crack(w, p.x, p.y, 6); dust(w, p.x, p.y, 14);
            for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: p.x, y: p.y - 6, vx: rand(-300, 300), vy: rand(-520, -220), g: 1400, vr: rand(-12, 12), ground: true, bounce: 0.3, life: 1.2, hold: true, size: rand(4, 8), color: "120,110,100" });
          },
        },
        {
          id: "close", name: { en: "Close Call", ko: "아슬아슬" }, param: "stop 60ms · text",
          cap: { en: "Reward the dodge: a beat of *freeze* and “DODGE!”", ko: "피했으면 칭찬: *멈칫* + “DODGE!”" },
          slam(w) { w.hitstop(0.06); say(w, "DODGE!", 150, 110, 30, "#c6f432", 0.9, -30); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "creak → slam",
          cap: { en: "A *creak* while it rises, a huge *slam* down.", ko: "들 때 *끼익*, 찍을 때 *쾅*." },
          warn(w) { w.sfx.creak(); w.sfx.charge(); },
          dodge(w) { w.sfx.dash(); },
          slam(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 6 ─ 칼날 맞대기 */
    {
      id: "duel-clash", cat: "duel", view: "side",
      title: { en: "Make a blade lock *struggle*", ko: "칼날 맞대기를 *힘겨루기*로" },
      intro: { en: "Blades touch. *Boing.* Over.", ko: "칼이 닿고… *팅*. 끝." },
      interval: 2.1, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 100 }); w.foe = w.actor("foe", { home: 440 }); w.lock = null; },
      fire(w) {
        restart(w);
        const h = w.hero, f = w.foe;
        h.x = h.home; f.x = f.home; h.ox = f.ox = 0; w.lock = null;
        w.tween(h, { x: 222 }, 0.26, "in"); w.tween(f, { x: 330 }, 0.26, "in", () => {
          w.lock = { x: 272, y: G - 112, push: 0 };
          w.emit("lock", w.lock);
          w.after(w.on("struggle") ? 1.1 : 0.12, () => {
            const p = w.lock; w.lock = null;
            w.emit("break", p);
            w.tween(h, { x: h.home }, 0.4, "out"); w.tween(f, { x: f.home }, 0.4, "out");
          });
        });
      },
      update(w) {
        camHold(w);
        const L = w.lock, h = w.hero, f = w.foe;
        if (L) { h.ox = L.push; f.ox = L.push; }
      },
      drawFront(w, ctx) {
        const h = w.hero, f = w.foe, L = w.lock;
        const hp = handH(h), fp = handF(f);
        const cx = L ? L.x + L.push : null, cy = L ? L.y : null;
        const ha = L ? Math.atan2(cy - hp.y, cx - hp.x) : -0.9, fa = L ? Math.atan2(cy - fp.y, cx - fp.x) : Math.PI + 0.9;
        drawSword(ctx, hp.x, hp.y, ha, 80);
        drawSword(ctx, fp.x, fp.y, fa, 80, "#cbd5e1");
      },
      steps: [
        {
          id: "flash", name: { en: "Clash Flash", ko: "부딪힘 섬광" }, param: "stop 80ms · star",
          cap: { en: "Blades meet: *freeze* and a big *star*.", ko: "칼이 닿는 순간 *멈칫*, 큰 *별빛*." },
          lock(w, p) {
            w.hitstop(0.08);
            w.spawn({ type: "star", x: p.x, y: p.y, size: 70, life: 0.14, color: "255,255,255" });
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 90, size1: 20, life: 0.2, color: "255,230,170" });
          },
        },
        {
          id: "struggle", name: { en: "Push Struggle", ko: "밀고 당기기" }, param: "sway ±16px · 1.1s",
          cap: { en: "Hold the lock. Let it *sway* — who's winning?", ko: "맞댄 채 *버텨요*. 누가 이기나 *출렁출렁*." },
          update(w) {
            const L = w.lock; if (!L) return;
            L.push = Math.sin(w.time * 8) * 16 + Math.sin(w.time * 19) * 4;
            w.hero.vib = 2; w.foe.vib = 2;
          },
        },
        {
          id: "sparks", name: { en: "Grinding Sparks", ko: "갈리는 불꽃" }, param: "~40 sparks/s",
          cap: { en: "Metal *grinds*. Sparks spray from the contact.", ko: "쇠가 *갈려요*. 닿은 곳에서 *불꽃*." },
          update(w, dt) {
            const L = w.lock; if (!L || Math.random() > dt * 40) return;
            sparks(w, L.x + L.push, L.y, 2, "255,210,120", [200, 500], -2.6, -0.5);
          },
        },
        {
          id: "zoom", name: { en: "Close-up", ko: "클로즈업" }, param: "zoom 18%",
          cap: { en: "Zoom in on the *blades*. Make it personal.", ko: "*칼날* 쪽으로 확 다가가요." },
          lock(w, p) { w.camZ = 0.18; w.cam.ty = p.y - 180; },
          break(w) { w.camZ = 0; w.cam.ty = 0; },
        },
        {
          id: "release", name: { en: "Break Apart", ko: "튕겨 나가기" }, param: "ring + skid dust",
          cap: { en: "Break with a *shockwave*. Both *skid* back.", ko: "*파앙* 터지며 둘 다 *쭉* 밀려나요." },
          break(w, p) {
            w.shake(0.35);
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 120, life: 0.35, w: 8, color: "255,240,200" });
            dust(w, w.hero.x, G, 8, 1); dust(w, w.foe.x, G, 8, -1);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clang + scrape",
          cap: { en: "A ringing *clang*, a *scrape* while they push.", ko: "*쨍!* 하고, 밀 때 *끼기긱*." },
          lock(w) { clang(w); for (let i = 0; i < 5; i++) w.after(0.15 + i * 0.18, () => w.sfx.scrape()); },
          break(w) { w.sfx.slashHit(); },
        },
      ],
    },

    /* 7 ─ 마지막 일격 연출 */
    {
      id: "duel-finalblow", cat: "duel", view: "side",
      title: { en: "Make the final blow *cinematic*", ko: "마지막 일격을 *영화처럼*" },
      intro: { en: "Last hit. Boss *blinks out*.", ko: "마지막 한 방. 보스가 *뿅* 사라져요." },
      interval: 2.6, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 100 }); w.boss = w.actor("duel-boss", { home: 380, hp: 1000 }); w.lb = 0; w.sil = 0; },
      fire(w) {
        restart(w);
        const h = w.hero, b = w.boss;
        Object.assign(b, { alpha: 1, rot: 0, oy: 0, flash: 0 }); b.hp = 60; h.x = h.home; w.lb = 0; w.sil = 0;
        w.emit("start");
        w.after(0.12, () => { swing(w); w.tween(h, { x: 500 }, 0.24, "in", () => { h.sx = 1.3; h.sy = 0.8; }); });
        w.after(0.26, () => {
          b.hp = 0; w.emit("blow", { x: b.x - 10, y: G - 110 }, b);
          if (!w.on("collapse")) w.after(0.3, () => { b.alpha = 0; });
        });
        w.after(1.9, () => w.tween(h, { x: h.home }, 0.4, "inout"));
      },
      update(w, dt) { w.sil = Math.max(0, w.sil - dt / Math.max(0.05, w.ts)); },
      drawFront(w, ctx) { heroSword(w, ctx); },
      drawHud(w, ctx) {
        if (w.sil > 0) {
          ctx.fillStyle = "#f5f5f0"; ctx.fillRect(-100, -100, 740, 560);
          for (const a of [w.hero, w.boss]) if (a.alpha > 0) ctx.drawImage(black(a.s === SPR.hero ? "hero" : "duel-boss"), a.x + a.ox - a.w / 2, a.gy + a.oy - a.h, a.w, a.h);
        }
        if (w.lb > 0) { ctx.fillStyle = "#000"; ctx.fillRect(-100, -100, 740, 100 + 44 * w.lb); ctx.fillRect(-100, 360 - 44 * w.lb, 740, 200); }
        topBar(ctx, w.boss, { name: "DARK WARLORD", y: 66 });
      },
      steps: [
        {
          id: "slowmo", name: { en: "Slow Motion", ko: "슬로모션" }, param: "time ×0.15 · 1.2s",
          cap: { en: "On the killing blow, *slow time down*.", ko: "끝내는 한 방에서 *시간을 늦춰요*." },
          blow(w) { w.slowmo(0.15, 1.2); },
        },
        {
          id: "letterbox", name: { en: "Letterbox", ko: "영화 띠" }, param: "bars 44px",
          cap: { en: "Black *cinema bars* slide in. Now it's a *scene*.", ko: "검은 *영화 띠*가 들어오면 *장면*이 돼요." },
          start(w) { w.tween(w, { lb: 1 }, 0.25, "out"); },
        },
        {
          id: "impact", name: { en: "Impact Frame", ko: "임팩트 프레임" }, param: "2 frames · inverted",
          cap: { en: "Two frames of *black on white*. Pure impact.", ko: "*흰 바탕에 검은 실루엣*, 딱 두 프레임." },
          blow(w) { w.sil = 0.09; },
        },
        {
          id: "slash", name: { en: "Delayed Slash", ko: "늦게 그어지는 칼자국" }, param: "line 520px",
          cap: { en: "The cut *appears after* the swing. Then it splits.", ko: "베고 나서야 *칼자국*이 *쫙* 그어져요." },
          blow(w, p) {
            w.after(0.06, () => {
              w.spawn({ type: "slash", x: p.x, y: p.y, ang: -0.22, len: 260, size: 16, life: 0.9, color: "255,255,255" });
              w.spawn({ type: "slash", x: p.x, y: p.y, ang: -0.22, len: 230, size: 34, life: 0.6, color: "198,244,50" });
            });
          },
        },
        {
          id: "collapse", name: { en: "Collapse", ko: "무너지기" }, param: "beat 300ms · topple",
          cap: { en: "A *beat* of standing still. Then it *topples*.", ko: "*잠깐* 버티다가… *쿵* 쓰러져요." },
          blow(w, p, b) {
            b.flash = 1.5;
            w.after(0.3, () => w.tween(b, { rot: 1.35, oy: 30 }, 0.4, "in", () => {
              w.shake(0.5); dust(w, b.x + 80, G, 16); w.tween(b, { alpha: 0 }, 0.6, "lin");
            }));
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "cut silence → boom",
          cap: { en: "*Cut* all sound on the slash, then one deep *boom*.", ko: "벨 때 소리를 *뚝*, 그다음 묵직한 *쿵*." },
          blow(w) { w.sfx.slash(); w.after(0.3, () => w.sfx.boom()); },
        },
      ],
    },

    /* 8 ─ 그로기(빈틈) */
    {
      id: "duel-stagger", cat: "duel", view: "side",
      title: { en: "Show the boss *stagger window*", ko: "보스 *그로기* 빈틈 보여 주기" },
      intro: { en: "Three hits and… *something* happened?", ko: "세 대 때렸더니… *뭔가* 됐나?" },
      interval: 0.75, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 130 }); w.boss = w.actor("duel-boss", { home: 410 }); w.post = { v: 0, flash: 0 }; w.down = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, b = w.boss;
        w.tween(h, { x: 270 }, 0.17, "in", () => {
          const down = w.down > 0, d = down ? 120 : 30, at = { x: b.x - 70, y: G - 120 };
          b.hp -= d; if (b.hp <= 0) b.hp = b.maxHp;
          b.ox += 16; swing(w);
          w.emit("hit", at, d, down);
          if (!down && (w.post.v += 34) >= 100) { w.post.v = 100; w.down = 2.4; w.emit("break", b); }
          w.after(0.08, () => w.tween(h, { x: h.home }, 0.22, "inout", () => { w.busy = false; }));
        });
      },
      update(w, dt) {
        lagBar(w.boss, dt);
        w.post.flash = Math.max(0, w.post.flash - dt * 4);
        if (w.down > 0 && (w.down -= dt) <= 0) { w.post.v = 0; w.emit("recover", w.boss); }
      },
      drawFront(w, ctx) { heroSword(w, ctx); },
      drawHud(w, ctx) {
        topBar(ctx, w.boss, { name: "DARK WARLORD", lag: true });
        if (w.on("gauge")) {
          const p = w.post, X = 170, Y = 86, W = 200, full = w.down > 0;
          ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(X - 3, Y - 3, W + 6, 12);
          ctx.fillStyle = full ? (Math.floor(w.time * 10) % 2 ? "#fff" : "#fde047") : "#fb923c";
          const half = W / 2 * Math.min(1, p.v / 100); ctx.fillRect(X + W / 2 - half, Y, half * 2, 6);
          if (p.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${p.flash})`; ctx.fillRect(X, Y, W, 6); }
        }
        if (w.on("window") && w.down > 0) {
          const k = w.down / 2.4;
          ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w.boss.x - 30, 140, 22, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
        }
      },
      steps: [
        {
          id: "gauge", name: { en: "Posture Gauge", ko: "자세 게이지" }, param: "+34 per hit",
          cap: { en: "Show a *gauge* filling. Players see the break coming.", ko: "*게이지*가 차오르면 무너질 때가 보여요." },
          hit(w) { w.post.flash = 1; },
        },
        {
          id: "kneel", name: { en: "Kneel Down", ko: "무릎 꿇기" }, param: "squash .8 · 2.4s",
          cap: { en: "The boss *drops to a knee*. Big, obvious, open.", ko: "보스가 *털썩* 주저앉아요. 누가 봐도 빈틈." },
          break(w, b) { w.tween(b, { h: 172, w: 236, rot: -0.12 }, 0.18, "back"); w.shake(0.35); dust(w, b.x, G, 12); },
          recover(w, b) { w.tween(b, { h: 210, w: 210, rot: 0 }, 0.3, "out"); },
        },
        {
          id: "stars", name: { en: "Dizzy Stars", ko: "어지러운 별" }, param: "3 orbiting stars",
          cap: { en: "*Stars* circle its head. Universal for “stunned”.", ko: "머리 위에 *빙글빙글 별*. 기절의 공용어." },
          update(w) {
            const b = w.boss; if (w.down <= 0) return;
            for (let i = 0; i < 3; i++) { const a = w.time * 6 + i * TAU / 3; w.spawn({ type: "star", x: b.x - 30 + Math.cos(a) * 46, y: b.gy - b.h - 8 + Math.sin(a) * 12, size: 9, life: 0.12, color: "253,224,71" }); }
          },
        },
        {
          id: "window", name: { en: "Chance Timer", ko: "기회 타이머" }, param: "2.4s ring",
          cap: { en: "Shout *CHANCE!* and show how long the window lasts.", ko: "*CHANCE!* 외치고, 남은 시간을 *원*으로." },
          break(w, b) { say(w, "CHANCE!", b.x - 30, 110, 34, "#c6f432", 1.2, -10); w.flash("255,255,255", 0.3); },
        },
        {
          id: "punish", name: { en: "Punish Hits", ko: "응징 타격" }, param: "×4 dmg · stop 90ms",
          cap: { en: "Hits in the window *hit harder* — and *look* harder.", ko: "빈틈에 때리면 *더 세게*, 더 *요란하게*." },
          hit(w, at, d, down) {
            w.boss.flash = 1;
            w.spawn({ type: "text", text: String(d), x: at.x - 40, y: at.y + 10, vy: -200, g: 700, life: 0.9, size: down ? 50 : 24, color: down ? "#fde047" : "#fff" });
            if (down) { w.hitstop(0.09); w.shake(0.3); w.spawn({ type: "star", x: at.x, y: at.y, size: 60, life: 0.12, color: "255,255,255" }); }
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thud / crit / shatter",
          cap: { en: "The break gets its own *crash*. Punish hits *crit*.", ko: "무너질 땐 전용 *와장창*. 응징은 *치명타 음*." },
          enter(w) { w.post.v = 68; },
          hit(w, at, d, down) { if (down) w.sfx.crit(); else w.sfx.thud(); },
          break(w) { w.sfx.boom(); w.sfx.chime(5); },
        },
      ],
    },

    /* 9 ─ 약점 타격 */
    {
      id: "duel-weakpoint", cat: "duel", view: "side",
      title: { en: "Make weak-point hits *obvious*", ko: "약점 타격을 *확실하게*" },
      intro: { en: "Shoot here, shoot there. *Same thing?*", ko: "여기 쏘나 저기 쏘나. *똑같아요?*" },
      interval: 0.7, stepDur: 3.8,
      setup(w) { art(); w.hero = w.actor("hero", { home: 100 }); w.boss = w.actor("duel-boss", { home: 420 }); w.gun = { kick: 0, rot: 0 }; w.n = 0; w.core = { crack: 0 }; },
      fire(w) {
        const m = muzzle(w), b = w.boss, weak = ++w.n % 2 === 0;
        const t = weak ? { x: b.x - 52, y: G - 104 } : { x: b.x - 18, y: G - 172 };
        const k = 1600 / Math.hypot(t.x - m.x, t.y - m.y);
        w.gun.kick = 10; w.sfx.gun();
        w.shoot({ x: m.x, y: m.y, vx: (t.x - m.x) * k, vy: (t.y - m.y) * k, r: 3.5, len: 46, color: "#fff", hitX: t.x, onHit: () => {
          if (weak) { b.hp -= 120; w.emit("weak", t, 120); } else { b.hp -= 5; w.emit("body", t, 5); }
          if (b.hp <= 0) b.hp = b.maxHp;
        } });
      },
      update(w, dt) { gunSpring(w, dt); lagBar(w.boss, dt); },
      drawFront(w, ctx) {
        drawGun(w, ctx);
        const b = w.boss, x = b.x + b.ox - 52, y = G - 104, pulse = w.on("marker") ? 0.6 + 0.4 * Math.sin(w.time * 8) : 0;
        if (pulse) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, 36 + pulse * 10, "56,189,248", 0.8); ctx.globalCompositeOperation = "source-over"; }
        ctx.fillStyle = pulse ? "#7dd3fc" : "#5b6b78"; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - 10, y); ctx.closePath(); ctx.fill();
        if (w.core.crack > 0) { ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, y - 8); ctx.lineTo(x + 2, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); }
        if (pulse) {
          ctx.strokeStyle = `rgba(56,189,248,${0.5 + pulse * 0.5})`; ctx.lineWidth = 2; const r = 26 + pulse * 4;
          for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + w.time; ctx.beginPath(); ctx.arc(x, y, r, a, a + 0.9); ctx.stroke(); }
        }
      },
      drawHud(w, ctx) { topBar(ctx, w.boss, { name: "DARK WARLORD", lag: true }); },
      steps: [
        {
          id: "marker", name: { en: "Glowing Core", ko: "빛나는 약점" }, param: "pulse 8Hz + reticle",
          cap: { en: "Make the weak spot *glow* and *pulse*. Aim here!", ko: "약점이 *빛나고* *두근두근*. 여길 노려요!" },
          weak(w) { w.core.crack = 1; },
        },
        {
          id: "deflect", name: { en: "Deflect", ko: "튕겨 나감" }, param: "grey sparks · RESIST",
          cap: { en: "Armor hits *bounce off*: grey sparks, a *tink*.", ko: "갑옷은 *팅* 튕겨요. 회색 불꽃만." },
          body(w, p) {
            sparks(w, p.x, p.y, 6, "180,180,190", [150, 350], Math.PI * 0.8, Math.PI * 1.4);
            say(w, "RESIST", p.x + 20, p.y - 30, 15, "#9ca3af", 0.6, -40);
          },
        },
        {
          id: "burst", name: { en: "Weak Burst", ko: "약점 폭발" }, param: "ring + 18 sparks",
          cap: { en: "Weak hits *explode* in the core's color. “WEAK!”", ko: "약점은 같은 색으로 *펑*. “WEAK!”" },
          weak(w, p) {
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 90, life: 0.35, w: 10, color: "125,211,252" });
            w.spawn({ type: "star", x: p.x, y: p.y, size: 60, life: 0.14, color: "255,255,255" });
            sparks(w, p.x, p.y, 18, "186,230,253", [200, 600]);
            say(w, "WEAK!", p.x - 110, p.y - 40, 34, "#38bdf8", 0.8, -30);
          },
        },
        {
          id: "recoil", name: { en: "Big Flinch", ko: "크게 휘청" }, param: "stop 100ms · push 30",
          cap: { en: "The boss *reels*. Freeze, flash, push it back.", ko: "보스가 *휘청*. 멈칫, 번쩍, 뒤로 *쭉*." },
          weak(w) { const b = w.boss; w.hitstop(0.1); b.flash = 1.2; b.ox += 30; b.vib = 8; w.shake(0.3, 1); },
        },
        {
          id: "numbers", name: { en: "Number Contrast", ko: "숫자 대비" }, param: "5 small vs 120 big",
          cap: { en: "*Tiny grey 5*. *Huge 120*. The lesson is instant.", ko: "*작은 회색 5*, *커다란 120*. 바로 배워요." },
          body(w, p, d) { w.spawn({ type: "text", text: String(d), x: p.x, y: p.y - 10, vy: -120, life: 0.5, size: 16, color: "#9ca3af" }); },
          weak(w, p, d) { w.spawn({ type: "text", text: String(d), x: p.x + 20, y: p.y - 20, vx: 60, vy: -300, g: 800, life: 0.9, size: 48, color: "#fde047" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tink / crit",
          cap: { en: "Armor goes *tink*. The core goes *crunch*.", ko: "갑옷은 *팅*, 약점은 *콰직*." },
          body(w) { w.play(() => tn({ type: "triangle", f: 2400, f2: 2100, dur: 0.12, vol: 0.15 })); },
          weak(w) { w.sfx.crit(); },
        },
      ],
    },

    /* 10 ─ 보스 사망 연쇄 폭발 */
    {
      id: "duel-deathchain", cat: "duel", view: "side",
      title: { en: "Blow the boss up in a *chain*", ko: "보스를 *연쇄 폭발*로 보내기" },
      intro: { en: "Ten minutes of fighting. *Poof.*", ko: "10분 싸웠는데. *뿅*." },
      interval: 2.6, stepDur: 4.2,
      setup(w) {
        art(); w.hero = w.actor("hero", { home: 100 }); w.boss = w.actor("duel-boss", { home: 400 });
        w.finish = b => { b.alpha = 0; w.emit("final", b); w.after(1.5, () => { b.alpha = 1; b.sx = b.sy = 0.3; }); };
      },
      fire(w) {
        restart(w);
        const b = w.boss;
        Object.assign(b, { alpha: 1, flash: 0, vib: 0, ox: 0 });
        w.emit("die", b);
        if (!w.on("chain")) w.finish(b);
      },
      drawHud(w, ctx) { topBar(ctx, w.boss, { name: "DARK WARLORD", v: 0 }); },
      steps: [
        {
          id: "chain", name: { en: "Chain Pops", ko: "연쇄 폭발" }, param: "8 pops · 120ms apart",
          cap: { en: "Don't just vanish. *Pop, pop, pop* across the body.", ko: "그냥 사라지지 말고 *펑, 펑, 펑*." },
          die(w, b) {
            for (let i = 0; i < 8; i++) w.after(i * 0.12, () => {
              const p = { x: b.x + rand(-70, 60), y: G - rand(30, 190) };
              boom(w, p.x, p.y, 0.6); w.emit("pop", p, i);
            });
            w.after(1.0, () => w.finish(b));
          },
        },
        {
          id: "blink", name: { en: "Flicker", ko: "깜빡깜빡" }, param: "flash + tremble",
          cap: { en: "Each pop *flashes* the body and makes it *tremble*.", ko: "터질 때마다 몸이 *번쩍*, *부들부들*." },
          pop(w) { w.boss.flash = 1; w.boss.vib = 5; },
        },
        {
          id: "shake", name: { en: "Rising Shake", ko: "점점 센 흔들림" }, param: "trauma .1 → .45",
          cap: { en: "Shake *a bit more* each pop. It's building.", ko: "터질수록 *조금씩 더* 흔들어요. 쌓여 가요." },
          pop(w, p, i) { w.shake(0.1 + i * 0.05); },
        },
        {
          id: "final", name: { en: "Final Blast", ko: "마지막 대폭발" }, param: "white flash · rays",
          cap: { en: "End on one *huge* blast. White screen, *rays*.", ko: "마지막은 *엄청 크게*. 하얀 화면, *빛줄기*." },
          final(w, b) {
            const c = chest(b);
            boom(w, c.x, c.y, 2.4); w.flash("255,255,255", 0.45); w.shake(0.8);
            w.spawn({ type: "rays", x: c.x, y: c.y, size: 320, n: 14, vr: 1.2, life: 1.2, under: true, color: "255,220,150" });
          },
        },
        {
          id: "debris", name: { en: "Debris", ko: "파편" }, param: "20 chunks · bounce",
          cap: { en: "Pieces *fly and bounce*. Some armor, some crown.", ko: "조각들이 *튀고 굴러요*. 갑옷, 왕관까지." },
          final(w, b) {
            for (let i = 0; i < 20; i++) w.spawn({ type: "chunk", x: b.x + rand(-40, 40), y: G - rand(60, 160), vx: rand(-420, 420), vy: rand(-700, -250), g: 1400, vr: rand(-14, 14), ground: true, bounce: 0.35, life: 2, hold: true, size: rand(5, 11), color: pick(["90,140,60", "150,140,130", "250,204,21"]) });
          },
        },
        {
          id: "slowmo", name: { en: "Slow Finale", ko: "느린 마무리" }, param: "time ×0.25 · 900ms",
          cap: { en: "*Slow down* the final blast. Let them *enjoy* it.", ko: "마지막 폭발은 *천천히*. 실컷 *즐기게*." },
          final(w) { w.slowmo(0.25, 0.9); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pops → boom",
          cap: { en: "Little *pops* climbing up, then one *BOOM*.", ko: "작게 *펑펑펑* 올라가다 *쾅!*" },
          pop(w, p, i) { w.play(() => { tn({ f: 160 + i * 25, f2: 50, dur: 0.15, vol: 0.4 }); nz({ dur: 0.15, f: 1600, f2: 300, vol: 0.3 }); }); },
          final(w) { w.sfx.boom(); },
        },
      ],
    },

    /* 11 ─ 결투 퀵드로 */
    {
      id: "duel-quickdraw", cat: "duel", view: "side",
      title: { en: "Build tension before the *bang*", ko: "*탕!* 전까지 긴장 쌓기" },
      intro: { en: "Draw. Bang. *No drama.*", ko: "뽑고, 쏘고. *긴장감 제로*." },
      interval: 2.6, stepDur: 4.2,
      setup(w) { art(); w.hero = w.actor("hero", { home: 90 }); w.foe = w.actor("foe", { home: 455 }); w.gun = { kick: 0, rot: 0.9 }; w.lb = 0; },
      fire(w) {
        restart(w);
        const f = w.foe; w.respawn(f); f.sx = f.sy = 1; w.gun.rot = 0.9; w.lb = 0;
        w.emit("start");
        w.after(0.6, () => w.emit("signal"));
        w.after(0.72, () => {
          w.gun.rot = 0; w.gun.kick = 16;
          const m = muzzle(w); w.emit("bang", m, f);
          w.spawn({ type: "slash", x: 270, y: m.y, ang: 0, len: 190, size: 3, life: 0.12, color: "255,240,200" });
          w.after(w.on("beat") ? 0.4 : 0, () => { f.flash = 1; w.fly(f, 260, -380, 6); w.emit("drop", f); });
        });
      },
      update(w, dt) { camHold(w); const g = w.gun; g.kick -= g.kick * Math.min(1, dt * 16); },
      drawFront(w, ctx) {
        drawGun(w, ctx);
        const f = w.foe; if (f.flying || !f.alive) return;
        const p = handF(f);
        ctx.fillStyle = "#334155"; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(w.gun.rot > 0.5 ? -0.9 : 0); ctx.fillRect(-30, -5, 30, 9); ctx.fillRect(-6, 0, 7, 14); ctx.restore();
      },
      drawHud(w, ctx) {
        if (w.lb > 0) { ctx.fillStyle = "#000"; ctx.fillRect(-100, -100, 740, 100 + 50 * w.lb); ctx.fillRect(-100, 360 - 50 * w.lb, 740, 200); }
      },
      steps: [
        {
          id: "frame", name: { en: "Letterbox Push-in", ko: "영화 띠 + 줌인" }, param: "bars 50px · zoom 10%",
          cap: { en: "*Bars* close in and the camera *creeps* forward.", ko: "*영화 띠*가 조이고 카메라가 *슬금슬금*." },
          start(w) { w.tween(w, { lb: 1 }, 0.4, "out"); w.tween(w, { camZ: 0.1 }, 0.6, "in"); },
        },
        {
          id: "wind", name: { en: "Drifting Dust", ko: "흩날리는 먼지" }, param: "streaks 25/s",
          cap: { en: "*Wind* and dust drifting by. Silence you can *see*.", ko: "*바람*에 먼지가 쓸려요. *보이는* 정적." },
          update(w, dt) { if (Math.random() < dt * 25) w.spawn({ type: "spark", x: rand(-20, 300), y: rand(150, G), vx: rand(260, 420), vy: rand(-10, 10), life: rand(0.6, 1.1), size: 2.6, color: "200,190,170" }); },
        },
        {
          id: "signal", name: { en: "The Signal", ko: "신호" }, param: "“!” 0.6s in",
          cap: { en: "A big *“!”* — the moment you're allowed to shoot.", ko: "큼직한 *“!”*. 이제 쏴도 된다는 신호." },
          signal(w) { say(w, "!", 270, 120, 80, "#facc15", 0.5, 0); w.spawn({ type: "rays", x: 270, y: 120, size: 90, n: 10, vr: 3, life: 0.4, color: "253,224,71" }); },
        },
        {
          id: "flash", name: { en: "Bang Flash", ko: "탕 섬광" }, param: "white .6 · stop 120ms",
          cap: { en: "The shot *whites out* the screen and *freezes*.", ko: "*탕!* 화면이 하얘지고 *멈칫*." },
          bang(w, m) { w.flash("255,255,255", 0.6); w.hitstop(0.12); w.spawn({ type: "star", x: m.x + 14, y: m.y, size: 60, life: 0.12, color: "255,245,220" }); },
        },
        {
          id: "beat", name: { en: "Delayed Drop", ko: "늦게 쓰러지기" }, param: "beat 400ms",
          cap: { en: "Wait *a beat*. The loser *falls late*.", ko: "*한 박자* 쉬었다가 상대가 *털썩*." },
          drop(w, f) { w.shake(0.3); w.spawn({ type: "ellipse", x: f.x, y: G, size: 40, life: 1.5, color: "120,20,20", under: true }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "heartbeat → gunshot",
          cap: { en: "*Heartbeats* in the quiet, then a *crack*.", ko: "고요 속 *쿵쿵* 심장 소리, 그리고 *탕*." },
          start(w) { for (let i = 0; i < 3; i++) w.after(i * 0.22, () => w.play(() => { tn({ f: 60, f2: 40, dur: 0.12, vol: 0.6 }); tn({ f: 55, f2: 38, dur: 0.1, vol: 0.4, delay: 0.1 }); })); },
          bang(w) { w.sfx.gun(); },
        },
      ],
    },

    /* 12 ─ 3, 2, 1, FIGHT */
    {
      id: "duel-countdown", cat: "duel", view: "ui",
      title: { en: "Make the countdown *hype*", ko: "카운트다운을 *두근두근*하게" },
      intro: { en: "3… 2… 1… *fight.* Yawn.", ko: "3… 2… 1… *시작*. 하품." },
      interval: 2.6, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.foe = w.actor("foe", { home: 420 }); w.cd = { txt: "", i: 0, pop: 0, ring: 0, col: "#fff", t: 0 }; },
      fire(w) {
        restart(w);
        const c = w.cd, h = w.hero, f = w.foe; h.x = h.home; f.x = f.home;
        ["3", "2", "1", "FIGHT!"].forEach((txt, i) => w.after(i * 0.5, () => { Object.assign(c, { txt, i, t: 0, col: "#fff" }); w.emit("beat", c, i); }));
        w.after(2.3, () => { c.txt = ""; });
      },
      update(w, dt) { const c = w.cd; c.t += dt; c.pop = Math.max(0, c.pop - dt * 5); c.ring = Math.max(0, c.ring - dt * 2); },
      drawHud(w, ctx) {
        const c = w.cd; if (!c.txt) return;
        const big = c.i === 3, sc = 1 + c.pop * c.pop * 1.6;
        if (c.ring > 0 && !big) { ctx.strokeStyle = c.col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(270, 140, 52, -Math.PI / 2, -Math.PI / 2 + TAU * c.ring); ctx.stroke(); }
        ctx.save(); ctx.translate(270, 140); ctx.scale(sc, sc);
        ctx.font = `900 ${big ? 64 : 56}px Pretendard, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 9; ctx.strokeStyle = "rgba(8,10,16,0.9)"; ctx.strokeText(c.txt, 0, 2); ctx.fillStyle = c.col; ctx.fillText(c.txt, 0, 2);
        ctx.restore();
      },
      steps: [
        {
          id: "pop", name: { en: "Slam In", ko: "쾅 박히기" }, param: "scale 2.6 → 1",
          cap: { en: "Numbers *slam in* from huge. Every beat hits.", ko: "숫자가 크게 *쾅* 박혀요. 박자마다 *쿵*." },
          beat(w, c) { c.pop = 1; w.spawn({ type: "glow", x: 270, y: 140, size: 110, size1: 40, life: 0.45, color: "255,255,255" }); },
        },
        {
          id: "ring", name: { en: "Draining Ring", ko: "줄어드는 원" }, param: "500ms per beat",
          cap: { en: "A *ring drains* around it. You feel the rhythm.", ko: "숫자 둘레 *원이 줄어요*. 박자가 느껴져요." },
          beat(w, c) { c.ring = 1; },
        },
        {
          id: "color", name: { en: "Heat Up", ko: "점점 뜨겁게" }, param: "blue → orange → lime",
          cap: { en: "Colors *heat up* each beat. FIGHT gets the accent.", ko: "박자마다 색이 *달아올라요*. FIGHT는 강조색." },
          beat(w, c, i) { c.col = ["#38bdf8", "#facc15", "#fb923c", "#c6f432"][i]; },
        },
        {
          id: "ready", name: { en: "Fighters React", ko: "선수 반응" }, param: "hop + lunge",
          cap: { en: "Fighters *bounce* on each beat, *lunge* on FIGHT.", ko: "박자마다 *들썩*, FIGHT에 *튀어나가요*." },
          beat(w, c, i) {
            for (const a of [w.hero, w.foe]) { a.sx = 1.15; a.sy = 0.85; }
            if (i === 3) { w.tween(w.hero, { x: 200 }, 0.15, "out"); w.tween(w.foe, { x: 340 }, 0.15, "out"); }
          },
        },
        {
          id: "burst", name: { en: "FIGHT Burst", ko: "FIGHT 폭발" }, param: "flash · rays · shake",
          cap: { en: "FIGHT *explodes*: flash, rays, a hard shake.", ko: "FIGHT에서 *빵*: 번쩍, 빛줄기, 흔들림." },
          beat(w, c, i) {
            if (i < 3) return;
            w.flash("198,244,50", 0.35); w.shake(0.5);
            w.spawn({ type: "rays", x: 270, y: 140, size: 260, n: 16, vr: 1.5, life: 1, color: "198,244,50" });
            w.spawn({ type: "slash", x: 270, y: 170, ang: -0.1, len: 220, size: 10, life: 0.4, color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "3 beeps + gong",
          cap: { en: "Three *beeps*, then a big *gong* on FIGHT.", ko: "*삑, 삑, 삑*, 그리고 *징~*." },
          beat(w, c, i) { if (i < 3) w.play(() => tn({ type: "square", f: 660, dur: 0.12, vol: 0.12 })); else { w.sfx.fanfare(); w.sfx.slam(); } },
        },
      ],
    },

    /* 13 ─ 라운드 승리 */
    {
      id: "duel-roundwin", cat: "duel", view: "side",
      title: { en: "Make a round win *land*", ko: "라운드 승리를 *꽂히게*" },
      intro: { en: "Round over. *Next.*", ko: "라운드 끝. *다음*." },
      interval: 2.4, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.foe = w.actor("foe", { home: 400 }); w.pip = { lit: false, pop: 0 }; w.spot = 0; },
      fire(w) {
        restart(w);
        const h = w.hero, f = w.foe;
        w.respawn(f); f.sx = f.sy = 1; h.x = h.home; h.oy = 0; w.pip.lit = false; w.spot = 0; w.ban = null;
        w.tween(h, { x: 300 }, 0.2, "in", () => {
          swing(w); f.flash = 1; w.pip.lit = true;
          w.emit("ko", f, { x: f.x - 40, y: G - 80 });
          if (!f.flying) f.alpha = 0;
          if (!w.on("ko")) say(w, "win", 270, 96, 16, "#9ca3af", 1.4, 0);
          w.after(0.15, () => w.tween(h, { x: 250 }, 0.3, "out"));
        });
      },
      update(w, dt) { camHold(w); w.pip.pop = Math.max(0, w.pip.pop - dt * 3); if (w.ban) w.ban.t += dt; },
      drawFront(w, ctx) { heroSword(w, ctx); },
      drawBack(w, ctx) {
        if (w.spot <= 0) return;
        const x = w.hero.x, g = ctx.createLinearGradient(0, 0, 0, G);
        g.addColorStop(0, "rgba(255,250,220,0)"); g.addColorStop(1, `rgba(255,250,220,${0.22 * w.spot})`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 20, -40); ctx.lineTo(x + 20, -40); ctx.lineTo(x + 90, G); ctx.lineTo(x - 90, G); ctx.closePath(); ctx.fill();
      },
      drawHud(w, ctx) {
        const P = w.pip;
        [[160, true], [190, P.lit], [350, true], [380, false]].forEach(([x, on], i) => {
          const s = i === 1 ? 1 + P.pop * 0.8 : 1;
          ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.arc(x, 56, 11 * s, 0, TAU); ctx.fill();
          ctx.fillStyle = on ? (i < 2 ? "#c6f432" : "#ef4444") : "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.arc(x, 56, 7 * s, 0, TAU); ctx.fill();
        });
        if (w.ban) {
          const k = E.out(Math.min(1, w.ban.t / 0.25)), x = 270 + (1 - k) * 560;
          ctx.fillStyle = "#c6f432"; ctx.beginPath(); ctx.moveTo(x - 300, 188); ctx.lineTo(x + 320, 188); ctx.lineTo(x + 300, 232); ctx.lineTo(x - 320, 232); ctx.closePath(); ctx.fill();
          label(ctx, "YOU WIN", x, 211, 34, "#0b0c0f", "center", "Pretendard, sans-serif", 900);
        }
        label(ctx, "ROUND 2", 270, 56, 13, "rgba(255,255,255,0.75)", "center", "'JetBrains Mono', monospace", 700);
      },
      steps: [
        {
          id: "ko", name: { en: "K.O. Slam", ko: "K.O. 쾅" }, param: "stop 150ms · 64px",
          cap: { en: "*Freeze* and slam a huge *K.O.* on screen.", ko: "*멈칫* 하고 큼직한 *K.O.*를 쾅." },
          ko(w, f, p) { w.hitstop(0.15); w.flash("255,255,255", 0.5); say(w, "K.O.", 270, 140, 64, "#ef4444", 1.2, 0); },
        },
        {
          id: "launch", name: { en: "Slow Launch", ko: "느리게 날아가기" }, param: "time ×0.3 · spin",
          cap: { en: "Send the loser *flying* — in *slow motion*.", ko: "진 쪽을 *날려요*. *슬로모션*으로." },
          ko(w, f) { w.fly(f, 420, -560, 9); w.slowmo(0.3, 0.9); },
        },
        {
          id: "pip", name: { en: "Round Pip Pop", ko: "승점 불 켜기" }, param: "scale 1.8 + ring",
          cap: { en: "The round *pip* lights with a *pop*. Progress you see.", ko: "승점 칸이 *톡* 켜져요. 진행이 보여요." },
          ko(w) { w.pip.pop = 1; w.spawn({ type: "ring", x: 190, y: 56, size: 8, size1: 40, life: 0.5, w: 5, color: "198,244,50" }); },
        },
        {
          id: "pose", name: { en: "Victory Pose", ko: "승리 포즈" }, param: "hop + spotlight",
          cap: { en: "Winner *hops* into a *spotlight*. Let them gloat.", ko: "이긴 쪽이 *폴짝*, *조명*까지. 실컷 뽐내게." },
          ko(w) {
            w.tween(w, { spot: 1 }, 0.3, "out"); w.camZ = 0.1; w.cam.tx = -20;
            w.after(0.35, () => { const h = w.hero; h.sx = 0.8; h.sy = 1.25; w.tween(h, { oy: -50 }, 0.16, "out", () => w.tween(h, { oy: 0 }, 0.18, "in")); });
          },
        },
        {
          id: "banner", name: { en: "Win Banner", ko: "승리 띠" }, param: "slide-in stripe",
          cap: { en: "A *banner* sweeps across: YOU WIN.", ko: "화면을 가로지르는 *띠*: YOU WIN." },
          ko(w) { w.after(0.25, () => { w.ban = { t: 0 }; }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crit + fanfare",
          cap: { en: "A crushing *hit*, a short *fanfare*.", ko: "묵직한 *퍽*, 짧은 *팡파레*." },
          ko(w) { w.sfx.crit(); w.after(0.3, () => w.sfx.fanfare()); },
        },
      ],
    },

    /* 14 ─ 퍼펙트 승리 */
    {
      id: "duel-perfect", cat: "duel", view: "side",
      title: { en: "Celebrate a *perfect* win", ko: "*퍼펙트* 승리를 축하하기" },
      intro: { en: "No damage taken. *Nobody noticed.*", ko: "한 대도 안 맞았는데. *아무도 몰라요*." },
      interval: 2.6, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 150 }); w.hero.maxHp = w.hero.hp = 100;
        w.foe = w.actor("foe", { home: 400 }); w.pf = null;
      },
      fire(w) {
        restart(w);
        const h = w.hero, f = w.foe; w.respawn(f); f.sx = f.sy = 1; h.x = h.home; w.pf = null;
        w.tween(h, { x: 300 }, 0.2, "in", () => {
          swing(w); w.fly(f, 380, -500, 8);
          w.pf = { t: 0, drop: false, gold: -1, score: 0, shown: 0 };
          w.emit("win", w.pf);
          w.after(0.1, () => w.tween(h, { x: h.home }, 0.3, "inout"));
        });
      },
      update(w, dt) {
        const p = w.pf; if (!p) return;
        p.t += dt; if (p.gold >= 0) p.gold += dt;
        p.shown += (p.score - p.shown) * Math.min(1, dt * 5);
      },
      drawFront(w, ctx) { heroSword(w, ctx); },
      drawHud(w, ctx) {
        const p = w.pf, h = w.hero;
        const gold = p && p.gold >= 0, X = 40, Y = 306, W = 150;
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(X - 3, Y - 3, W + 6, 16);
        ctx.fillStyle = gold ? "#facc15" : "#4ade80"; ctx.fillRect(X, Y, W, 10);
        if (gold) { const sx = X + ((p.gold * 260) % 300) - 60; ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, 10); ctx.clip(); ctx.beginPath(); ctx.moveTo(sx, Y + 10); ctx.lineTo(sx + 14, Y); ctx.lineTo(sx + 30, Y); ctx.lineTo(sx + 16, Y + 10); ctx.fill(); ctx.restore(); }
        label(ctx, gold ? "HP 100%" : "YOU", X, Y - 11, 11, gold ? "#fde047" : "rgba(255,255,255,0.8)", "left", "'JetBrains Mono', monospace", 700);
        if (!p) return;
        const word = "PERFECT";
        ctx.save(); ctx.font = `900 ${p.drop ? 54 : 22}px Pretendard, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const lw = p.drop ? 40 : 15;
        for (let i = 0; i < word.length; i++) {
          const k = p.drop ? Math.max(0, Math.min(1, (p.t - i * 0.06) / 0.25)) : 1, x = 270 + (i - 3) * lw, y = 150 - (1 - E.back(k)) * 120;
          if (k <= 0) continue;
          ctx.globalAlpha = Math.min(1, k * 2); ctx.lineWidth = 8; ctx.strokeStyle = "rgba(8,10,16,0.9)";
          ctx.strokeText(word[i], x, y); ctx.fillStyle = p.drop ? "#fde047" : "#e5e7eb"; ctx.fillText(word[i], x, y);
        }
        ctx.restore();
        if (p.score) label(ctx, "+" + Math.round(p.shown).toLocaleString("en-US"), 270, 202, 24, "#fff");
      },
      steps: [
        {
          id: "letters", name: { en: "Letter Drop", ko: "글자 떨어뜨리기" }, param: "60ms stagger · back",
          cap: { en: "Letters *drop in one by one* and bounce.", ko: "글자가 *하나씩* 떨어져 *통*." },
          win(w, p) { p.drop = true; },
        },
        {
          id: "gold", name: { en: "Golden HP Bar", ko: "황금 체력바" }, param: "gold + shine sweep",
          cap: { en: "The untouched HP bar turns *gold* and *shines*.", ko: "한 칸도 안 깎인 체력바가 *금색*으로 *반짝*." },
          win(w, p) { p.gold = 0; },
        },
        {
          id: "rays", name: { en: "Golden Rays", ko: "황금 빛줄기" }, param: "16 rays · 1.5s",
          cap: { en: "Slow golden *rays* behind the words.", ko: "글자 뒤로 천천히 도는 *금빛 줄기*." },
          win(w) { w.spawn({ type: "rays", x: 270, y: 150, size: 300, n: 16, vr: 0.8, life: 1.8, hold: true, color: "250,204,21" }); },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "50 pieces",
          cap: { en: "*Confetti* rains down. It's a party.", ko: "*꽃가루*가 펑. 이건 잔치예요." },
          win(w) {
            for (let i = 0; i < 50; i++) w.spawn({ type: "chunk", x: rand(60, 480), y: rand(-60, 20), vx: rand(-60, 60), vy: rand(40, 160), g: 260, drag: 1.2, vr: rand(-10, 10), life: rand(1.6, 2.4), hold: true, size: rand(3, 6), color: pick(["198,244,50", "253,224,71", "56,189,248", "244,114,182"]) });
          },
        },
        {
          id: "bonus", name: { en: "Bonus Count", ko: "보너스 점수" }, param: "+10,000 roll",
          cap: { en: "A *bonus* that *counts up*. Perfect = paid.", ko: "*보너스*가 *드르륵* 올라가요. 퍼펙트는 보상." },
          win(w, p) { w.after(0.4, () => { p.score = 10000; }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "chimes + fanfare",
          cap: { en: "A *chime* per letter, then the *fanfare*.", ko: "글자마다 *띵*, 마지막에 *팡파레*." },
          win(w) { for (let i = 0; i < 7; i++) w.after(i * 0.06, () => w.sfx.chime(i * 2)); w.after(0.5, () => w.sfx.fanfare()); },
        },
      ],
    },

    /* 15 ─ 보스 휩쓰는 레이저 */
    {
      id: "duel-laser", cat: "duel", view: "side",
      title: { en: "Make the boss laser *sweep*", ko: "보스 레이저가 *쓸고* 가게" },
      intro: { en: "A thin red line. *Scary?*", ko: "가느다란 빨간 선. *무서워요?*" },
      interval: 2.2, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 160 }); w.boss = w.actor("duel-boss", { home: 440 }); w.las = { on: false, gx: 330, fat: 0 }; w.jumped = false; },
      fire(w) {
        restart(w);
        const L = w.las, c = chest(w.boss); Object.assign(L, { on: false, gx: 330, fat: 0 }); w.jumped = false; w.hero.oy = 0;
        const sweep = () => {
          L.on = true; w.emit("sweep", L);
          w.tween(L, { gx: 10 }, 0.8, "inout", () => { L.on = false; });
        };
        if (w.on("charge")) { w.emit("charge", c); w.after(0.5, sweep); } else sweep();
      },
      update(w) {
        camHold(w);
        const L = w.las, h = w.hero;
        if (L.on && !w.jumped && L.gx < h.x + 70) {
          w.jumped = true; w.emit("jump", h);
          w.tween(h, { oy: -100 }, 0.2, "out", () => w.tween(h, { oy: 0 }, 0.2, "in", () => w.emit("land", h)));
        }
      },
      drawFront(w, ctx) {
        const L = w.las; if (!L.on) return;
        const c = chest(w.boss);
        ctx.lineCap = "round";
        if (L.fat) {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = "rgba(244,63,94,0.35)"; ctx.lineWidth = 34 + Math.sin(w.time * 60) * 4; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(L.gx, G); ctx.stroke();
          ctx.strokeStyle = "rgba(251,113,133,0.9)"; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(L.gx, G); ctx.stroke();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(L.gx, G); ctx.stroke();
          glow(ctx, c.x, c.y, 50, "251,113,133", 1); glow(ctx, L.gx, G, 60, "255,200,200", 0.9);
          ctx.globalCompositeOperation = "source-over";
        } else { ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(L.gx, G); ctx.stroke(); }
      },
      steps: [
        {
          id: "charge", name: { en: "Charge & Aim", ko: "충전과 조준" }, param: "500ms · sight line",
          cap: { en: "Suck in light, flash a thin *aim line*. Then fire.", ko: "빛을 모으고 *조준선*을 깜빡. 그다음 발사." },
          charge(w, c) {
            for (let i = 0; i < 18; i++) w.after(i * 0.025, () => { const a = rand(0, TAU); w.spawn({ type: "spark", seek: true, x: c.x + Math.cos(a) * 80, y: c.y + Math.sin(a) * 80, tx: c.x, ty: c.y, life: 0.25, size: 2.5, color: "251,113,133" }); });
            w.spawn({ type: "glow", x: c.x, y: c.y, size: 8, size1: 46, life: 0.5, color: "244,63,94" });
            w.spawn({ type: "slash", x: (c.x + 330) / 2, y: (c.y + G) / 2, ang: Math.atan2(G - c.y, 330 - c.x), len: 80, size: 2, life: 0.5, color: "255,120,120" });
          },
        },
        {
          id: "beam", name: { en: "Fat Beam", ko: "굵은 광선" }, param: "34px glow · white core",
          cap: { en: "Make it *fat*: white core, hot glow, *flicker*.", ko: "*굵게*: 하얀 심지, 붉은 빛, *지글지글*." },
          sweep(w, L) { L.fat = 1; },
        },
        {
          id: "scorch", name: { en: "Scorch Trail", ko: "그을린 자국" }, param: "decal + sparks",
          cap: { en: "Leave a *burn mark* where it sweeps. Sparks fly.", ko: "쓸고 간 자리에 *탄 자국*. 불꽃이 *튀어요*." },
          update(w) {
            const L = w.las; if (!L.on) return;
            w.spawn({ type: "ellipse", x: L.gx, y: G + 2, size: 26, life: 1.4, hold: true, under: true, add: false, color: "20,8,8" });
            sparks(w, L.gx, G - 2, 2, "255,180,140", [150, 420], -2.8, -0.3);
          },
        },
        {
          id: "jump", name: { en: "Hop Over", ko: "뛰어넘기" }, param: "stretch + dust",
          cap: { en: "The hero *stretches* up, *squashes* down. Dust.", ko: "*쭉* 늘어나며 뛰고, *꾹* 눌리며 착지." },
          jump(w, h) { h.sx = 0.8; h.sy = 1.25; dust(w, h.x, G, 6); },
          land(w, h) { h.sx = 1.25; h.sy = 0.8; dust(w, h.x, G, 6); },
        },
        {
          id: "rumble", name: { en: "Rumble", ko: "웅웅 진동" }, param: "trauma .3 hold",
          cap: { en: "*Rumble* the screen the whole time it fires.", ko: "쏘는 동안 화면이 계속 *웅웅*." },
          update(w) { if (w.las.on) { w.trauma = Math.max(w.trauma, 0.3); w.flash("244,63,94", 0.08); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "charge + buzz",
          cap: { en: "Rising *whine*, then a fat *buzz*.", ko: "*위잉~* 차오르고, 굵게 *지이잉*." },
          charge(w) { w.sfx.charge(); },
          sweep(w) { w.play(() => { tn({ type: "sawtooth", f: 110, f2: 90, dur: 0.85, vol: 0.12 }); nz({ dur: 0.85, type: "bandpass", f: 900, f2: 500, q: 2, vol: 0.3 }); }); },
        },
      ],
    },

    /* 16 ─ 졸개 소환 (위에서 보기) */
    {
      id: "duel-summon", cat: "duel", view: "top",
      title: { en: "Make boss summons *dramatic*", ko: "보스 *소환*을 극적으로" },
      intro: { en: "Three enemies. *Just appeared.*", ko: "적 셋이 *그냥 생겼어요*." },
      interval: 2.3, stepDur: 4.0,
      setup(w) {
        art();
        w.hero = w.actor("heroTop", { home: 90, gy: 180 }); w.boss = w.actor("duel-bossTop", { home: 440, gy: 180 });
        w.mins = [[300, 96], [250, 180], [300, 264]].map(([x, y]) => Object.assign(w.actor("foeTop", { home: x, gy: y }), { alpha: 0 }));
        w.circles = [];
      },
      fire(w) {
        restart(w);
        w.circles = [];
        for (const m of w.mins) Object.assign(m, { alpha: 0, rot: 0, sx: 1, sy: 1 });
        w.emit("cast", w.boss, w.mins);
        w.mins.forEach((m, i) => w.after((w.on("circle") ? 0.35 : 0.05) + i * 0.08, () => { m.alpha = 1; w.emit("spawn", m); }));
        w.after(1.95, () => w.mins.forEach(m => w.tween(m, { alpha: 0 }, 0.25)));
      },
      update(w, dt) { for (const c of w.circles) c.t += dt; },
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.ellipse(270, 180, 250, 150, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2; ctx.stroke();
      },
      drawBack(w, ctx) {
        for (const c of w.circles) {
          const k = Math.min(1, c.t / 0.3), a = Math.max(0, Math.min(1, 2.2 - c.t));
          if (a <= 0) continue;
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.t * 2.5); ctx.globalAlpha = a;
          ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, 44 * k, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, 32 * k, 0, TAU); ctx.stroke();
          ctx.beginPath(); for (let i = 0; i <= 5; i++) { const q = i * TAU * 2 / 5; ctx[i ? "lineTo" : "moveTo"](Math.cos(q) * 32 * k, Math.sin(q) * 32 * k); } ctx.stroke();
          ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, 0, 50 * k, "192,132,252", 0.5);
          ctx.restore();
        }
      },
      steps: [
        {
          id: "circle", name: { en: "Summon Circles", ko: "소환진" }, param: "350ms before spawn",
          cap: { en: "Draw *circles* first. Players see *where* they'll come.", ko: "*소환진*부터. *어디서* 나올지 보여요." },
          cast(w, b, mins) { w.circles = mins.map(m => ({ x: m.x, y: m.gy, t: 0 })); },
        },
        {
          id: "cast", name: { en: "Casting Links", ko: "마력 연결" }, param: "sparks boss → circles",
          cap: { en: "Link the boss to each circle. *Cause → effect.*", ko: "보스와 소환진을 *이어요*. 원인 → 결과." },
          cast(w, b, mins) {
            b.sx = b.sy = 1.2; w.spawn({ type: "glow", x: b.x, y: b.gy, size: 80, size1: 20, life: 0.5, color: "192,132,252" });
            for (const m of mins) for (let i = 0; i < 6; i++) w.after(i * 0.05, () => w.spawn({ type: "spark", seek: true, x: b.x, y: b.gy, tx: m.x, ty: m.gy, life: 0.35, size: 3, color: "216,180,254" }));
          },
        },
        {
          id: "rise", name: { en: "Spin Up", ko: "돌며 솟기" }, param: "scale 0→1 · spin",
          cap: { en: "Don't pop. *Spin and grow* out of the circle.", ko: "툭 말고, *돌면서 커지며* 나와요." },
          spawn(w, m) { m.sx = m.sy = 0.1; m.rot = -4; w.tween(m, { rot: 0 }, 0.4, "out"); },
        },
        {
          id: "pillar", name: { en: "Light Burst", ko: "빛 터짐" }, param: "ring + glow",
          cap: { en: "Each arrival *bursts* with light.", ko: "나올 때마다 빛이 *팍*." },
          spawn(w, m) {
            w.spawn({ type: "ring", x: m.x, y: m.gy, size: 10, size1: 70, life: 0.4, w: 8, color: "216,180,254" });
            w.spawn({ type: "glow", x: m.x, y: m.gy, size: 80, size1: 10, life: 0.4, color: "192,132,252" });
          },
        },
        {
          id: "debris", name: { en: "Debris Ring", ko: "튀는 파편" }, param: "10 chunks · floor",
          cap: { en: "Floor *chips fly* outward. It came from *below*.", ko: "바닥 조각이 *사방으로*. *아래*에서 왔어요." },
          spawn(w, m) {
            for (let i = 0; i < 10; i++) { const a = rand(0, TAU), s = rand(120, 260); w.spawn({ type: "chunk", x: m.x, y: m.gy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, floor: 4, vr: rand(-8, 8), life: 0.9, size: rand(3, 6), color: "130,120,110" }); }
            w.shake(0.15);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "magic + pops",
          cap: { en: "A *chant* hum, then a *pop* per minion.", ko: "*우웅* 주문 소리, 하나씩 *퐁*." },
          cast(w) { w.sfx.charge(); },
          spawn(w) { w.sfx.pop(); w.sfx.magic(); },
        },
      ],
    },

    /* 17 ─ 보스 보호막 깨기 */
    {
      id: "duel-shield", cat: "duel", view: "side",
      title: { en: "Make shield breaks *shatter*", ko: "보호막이 *와장창* 깨지게" },
      intro: { en: "Hit, hit, hit… shield *gone*.", ko: "때리고, 때리고… 보호막 *없어짐*." },
      interval: 0.7, stepDur: 4.0,
      setup(w) {
        art(); w.hero = w.actor("hero", { home: 120 }); w.boss = w.actor("duel-boss", { home: 410 });
        w.sh = { hp: 4, up: 1, flash: 0, cracks: [] };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, S = w.sh;
        w.tween(h, { x: 230 }, 0.17, "in", () => {
          const p = { x: 290 + rand(-6, 6), y: G - 110 + rand(-40, 40) }; swing(w); w.boss.ox += 6;
          if (S.up > 0.5) {
            S.hp--; w.emit("hit", p, 4 - S.hp);
            if (S.hp <= 0) { S.up = 0; w.emit("break", w.boss, p); w.after(2.2, () => { S.hp = 4; S.cracks = []; S.up = 1; }); }
          } else { w.boss.flash = 1; w.boss.ox += 10; }
          w.after(0.08, () => w.tween(h, { x: h.home }, 0.22, "inout", () => { w.busy = false; }));
        });
      },
      update(w, dt) { w.sh.flash = Math.max(0, w.sh.flash - dt * 4); },
      drawFront(w, ctx) {
        heroSword(w, ctx);
        const S = w.sh, b = w.boss, cx = b.x - 10, cy = G - 104;
        if (S.up <= 0) return;
        ctx.save(); ctx.translate(cx, cy);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `rgba(103,232,249,${0.1 + S.flash * 0.25})`; ctx.beginPath(); ctx.ellipse(0, 0, 118, 128, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(165,243,252,${0.6 + S.flash * 0.4})`; ctx.lineWidth = 3; ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(240,253,255,0.95)"; ctx.lineWidth = 3.2;
        for (const c of S.cracks) { ctx.beginPath(); c.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x, y)); ctx.stroke(); }
        ctx.restore();
        for (let i = 0; i < 4; i++) { ctx.fillStyle = i < S.hp ? "#67e8f9" : "rgba(255,255,255,0.15)"; ctx.fillRect(cx - 44 + i * 23, G + 14, 18, 7); }
      },
      steps: [
        {
          id: "ripple", name: { en: "Hit Ripple", ko: "맞은 자리 물결" }, param: "ring + glow",
          cap: { en: "A *ripple* where you hit. The shield *reacts*.", ko: "때린 자리에 *물결*. 보호막이 *반응*해요." },
          hit(w, p) {
            w.sh.flash = 1;
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 6, size1: 80, life: 0.5, w: 8, color: "165,243,252" });
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 60, size1: 10, life: 0.4, color: "103,232,249" });
          },
        },
        {
          id: "cracks", name: { en: "Growing Cracks", ko: "늘어나는 금" }, param: "+1 crack per hit",
          cap: { en: "Each hit adds a *crack*. You see it *wearing down*.", ko: "때릴 때마다 *금*이 늘어요. *닳는 게* 보여요." },
          hit(w, p, n) {
            const pts = [[p.x - w.boss.x + 10, p.y - G + 110]];
            for (let i = 0; i < 5 + n * 2; i++) { const [x, y] = pts[pts.length - 1]; pts.push([Math.min(100, x + rand(-6, 34)), Math.max(-100, Math.min(100, y + rand(-36, 36)))]); }
            w.sh.cracks.push(pts);
          },
        },
        {
          id: "shatter", name: { en: "Shatter", ko: "산산조각" }, param: "28 shards",
          cap: { en: "On break: *shards* fly everywhere and fall.", ko: "깨질 땐 *파편*이 사방으로 *와르르*." },
          break(w, b) {
            for (let i = 0; i < 28; i++) { const a = rand(0, TAU); w.spawn({ type: "chunk", x: b.x - 10 + Math.cos(a) * 120, y: G - 110 + Math.sin(a) * 130, vx: Math.cos(a) * rand(150, 420), vy: Math.sin(a) * rand(150, 420) - 200, g: 1200, vr: rand(-14, 14), ground: true, bounce: 0.3, life: 1.8, size: rand(5, 10), color: "165,243,252" }); }
          },
        },
        {
          id: "flash", name: { en: "Break Flash", ko: "깨지는 섬광" }, param: "stop 120ms · flash",
          cap: { en: "*Freeze* and flash cyan on the breaking hit.", ko: "깨지는 한 방에 *멈칫*, 하늘색 *번쩍*." },
          break(w) { w.hitstop(0.12); w.flash("165,243,252", 0.3); w.shake(0.45); },
        },
        {
          id: "stun", name: { en: "Boss Exposed", ko: "보스 노출" }, param: "push 40 · BREAK!",
          cap: { en: "The boss *reels*, “BREAK!” — now it's *open*.", ko: "보스가 *휘청*, “BREAK!”. 이제 *뚫렸어요*." },
          break(w, b) { b.ox += 40; b.flash = 0.8; b.vib = 6; say(w, "BREAK!", 300, 120, 38, "#67e8f9", 1, -20); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "glass tink → crash",
          cap: { en: "Glassy *tinks* climb up, then a *crash*.", ko: "*팅, 팅* 올라가다 *와장창*." },
          enter(w) { w.sh.hp = 1; },
          hit(w, p, n) { w.sfx.chime(n * 3); },
          break(w) { w.play(() => { nz({ dur: 0.5, type: "highpass", f: 3000, f2: 1200, vol: 0.5 }); for (let i = 0; i < 6; i++) tn({ type: "triangle", f: rand(2000, 4000), dur: 0.15, vol: 0.08, delay: i * 0.04 }); }); w.sfx.thud(); },
        },
      ],
    },

    /* 18 ─ 분노 타이머 경고 */
    {
      id: "duel-timer", cat: "duel", view: "side",
      title: { en: "Make the enrage timer *scary*", ko: "분노 타이머를 *무섭게*" },
      intro: { en: "A clock in the corner. *Who's looking?*", ko: "구석의 시계. *누가 봐요?*" },
      interval: 0.5, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 120 }); w.boss = w.actor("duel-boss", { home: 410 }); w.tm = { s: 12, pulse: 0, scroll: 0 }; },
      fire(w) {
        const T = w.tm;
        if (--T.s < 0) { T.s = 12; Object.assign(w.boss, { h: 210, w: 210, tint: 0 }); return; }
        w.emit("tick", T.s);
        if (T.s === 0) w.emit("zero", w.boss);
      },
      update(w, dt) { w.tm.pulse = Math.max(0, w.tm.pulse - dt * 4); },
      drawHud(w, ctx) {
        const T = w.tm, hot = w.on("red") && T.s <= 10, sc = 1 + T.pulse * 0.5;
        if (w.on("banner") && T.s <= 5) {
          ctx.save(); ctx.beginPath(); ctx.rect(-40, 92, 620, 30); ctx.clip();
          ctx.fillStyle = "rgba(250,204,21,0.9)"; ctx.fillRect(-40, 92, 620, 30);
          ctx.fillStyle = "#111"; for (let x = -80 + (T.scroll % 40); x < 600; x += 40) { ctx.beginPath(); ctx.moveTo(x, 122); ctx.lineTo(x + 20, 92); ctx.lineTo(x + 34, 92); ctx.lineTo(x + 14, 122); ctx.fill(); }
          ctx.fillStyle = "#111"; ctx.fillRect(170, 96, 200, 22);
          label(ctx, T.s > 0 ? `ENRAGE IN ${T.s}` : "ENRAGED", 270, 108, 15, "#facc15", "center", "'JetBrains Mono', monospace", 800);
          ctx.restore();
        }
        ctx.save(); ctx.translate(270, 62); ctx.scale(sc, sc);
        ctx.font = "800 26px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 6; ctx.strokeStyle = "rgba(8,10,16,0.9)";
        const t = `0:${String(T.s).padStart(2, "0")}`;
        ctx.strokeText(t, 0, 0); ctx.fillStyle = hot ? "#ef4444" : "#e5e7eb"; ctx.fillText(t, 0, 0);
        ctx.restore();
      },
      steps: [
        {
          id: "pulse", name: { en: "Tick Pulse", ko: "초마다 쿵" }, param: "scale 1.5 · last 10s",
          cap: { en: "In the last 10 seconds, the timer *thumps* each tick.", ko: "마지막 10초엔 숫자가 초마다 *쿵*." },
          tick(w, s) { if (s <= 10) w.tm.pulse = 1; },
        },
        {
          id: "red", name: { en: "Red Alert", ko: "빨간 경고" }, param: "red text · vignette",
          cap: { en: "Turn it *red*. Under 5, the screen edges glow too.", ko: "숫자가 *빨갛게*. 5초 아래면 화면 끝도." },
          enter(w) { w.tm.s = 9; },
          tick(w, s) { if (s <= 5) w.vignette(0.5); },
        },
        {
          id: "banner", name: { en: "Hazard Strip", ko: "경고 띠" }, param: "scrolling 80px/s",
          cap: { en: "A *hazard strip* scrolls across. Impossible to miss.", ko: "*경고 띠*가 흘러가요. 못 볼 수가 없어요." },
          update(w, dt) { w.tm.scroll += dt * 80; },
        },
        {
          id: "boss", name: { en: "Boss Heats Up", ko: "달아오르는 보스" }, param: "tint + tremble",
          cap: { en: "The boss *heats up* and *trembles* as time runs out.", ko: "시간이 줄수록 보스가 *달아오르고* *부들부들*." },
          update(w) { const k = Math.max(0, 1 - w.tm.s / 10); w.boss.tint = k * 0.7; w.boss.vib = k * 3; },
        },
        {
          id: "zero", name: { en: "Zero Burst", ko: "0초 폭발" }, param: "flash · grow 1.2",
          cap: { en: "At zero: *explode* into rage. Promise kept.", ko: "0초엔 *폭발*. 경고한 대로예요." },
          zero(w, b) {
            w.flash("239,68,68", 0.6); w.shake(0.6);
            w.spawn({ type: "rays", x: b.x - 20, y: G - 120, size: 280, n: 14, vr: 2, life: 1, color: "239,68,68" });
            w.tween(b, { h: 250, w: 250 }, 0.3, "back");
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ticks rise · alarm",
          cap: { en: "Ticks get *higher* near zero. Then an *alarm*.", ko: "0에 가까울수록 *째깍*이 높아져요. 그리고 *경보*." },
          enter(w) { w.tm.s = 6; },
          tick(w, s) { w.play(() => tn({ type: "square", f: 500 + (10 - s) * 70, dur: 0.06, vol: 0.12 })); },
          zero(w) { w.play(() => { for (let i = 0; i < 3; i++) tn({ type: "sawtooth", f: 880, f2: 440, dur: 0.18, vol: 0.12, delay: i * 0.2 }); }); w.sfx.boom(); },
        },
      ],
    },

    /* 19 ─ 피니셔 줌 */
    {
      id: "duel-finisher", cat: "duel", view: "side",
      title: { en: "Zoom in on the *finisher*", ko: "피니셔에 *줌인*" },
      intro: { en: "Big uppercut. Seen from *way back*.", ko: "어퍼컷 한 방. 그런데 *멀리서* 봐요." },
      interval: 2.3, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 110 }); w.boss = w.actor("duel-boss", { home: 400 }); w.fl = 0; },
      fire(w) {
        restart(w);
        const h = w.hero, b = w.boss;
        Object.assign(b, { oy: 0, rot: 0, ox: 0 }); h.x = h.home; h.oy = 0; w.fl = 0;
        w.tween(h, { x: 290 }, 0.22, "in", () => {
          const p = { x: 318, y: G - 140 };
          h.sx = 0.8; h.sy = 1.25; w.tween(h, { oy: -40 }, 0.12, "out", () => w.tween(h, { oy: 0 }, 0.2, "in"));
          b.flash = 0.5; w.emit("smash", p, b);
          if (!w.on("launch")) b.ox += 30;
          w.after(1.3, () => w.tween(h, { x: h.home }, 0.4, "inout"));
        });
      },
      update(w, dt) { camHold(w); w.fl = Math.max(0, w.fl - dt / Math.max(0.05, w.ts)); },
      drawHud(w, ctx) {
        if (w.fl <= 0) return;
        const cx = w.cam.x + 270, cy = w.cam.y + 180;
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.8, w.fl * 2)})`;
        for (let i = 0; i < 48; i++) {
          const a = i / 48 * TAU + Math.sin(i * 7.3) * 0.05, r0 = 120 + (i * 37 % 60), r1 = 420;
          ctx.lineWidth = 1 + (i * 13 % 4);
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
        }
      },
      steps: [
        {
          id: "zoom", name: { en: "Snap Zoom", ko: "확 당기는 줌" }, param: "zoom 28% · 1.1s",
          cap: { en: "Snap the camera *right onto* the impact.", ko: "카메라를 충돌 지점으로 *확* 당겨요." },
          smash(w, p) {
            w.cam.tx = p.x - 270; w.cam.ty = p.y - 180; w.camZ = 0.28;
            w.after(1.1, () => { w.cam.tx = w.cam.ty = 0; w.camZ = 0; });
          },
        },
        {
          id: "freeze", name: { en: "Hold the Frame", ko: "정지 화면" }, param: "stop 300ms",
          cap: { en: "*Hold* the frame. Let the zoom land while frozen.", ko: "화면을 *붙잡아요*. 멈춘 사이 줌이 꽂혀요." },
          smash(w) { w.hitstop(0.3); },
        },
        {
          id: "lines", name: { en: "Focus Lines", ko: "집중선" }, param: "48 radial lines",
          cap: { en: "Comic-style *focus lines* point at the hit.", ko: "만화 같은 *집중선*이 한 점을 가리켜요." },
          smash(w) { w.fl = 1.1; },
        },
        {
          id: "shock", name: { en: "Shockwave", ko: "충격파" }, param: "ring + rays",
          cap: { en: "A *shockwave* and *rays* burst from the fist.", ko: "주먹에서 *충격파*와 *빛줄기*가 터져요." },
          smash(w, p) {
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 130, life: 0.4, w: 12, color: "255,240,200" });
            w.spawn({ type: "rays", x: p.x, y: p.y, size: 160, n: 12, vr: 3, life: 0.5, under: true, color: "255,230,150" });
            w.spawn({ type: "star", x: p.x, y: p.y, size: 50, life: 0.1, color: "255,255,255" });
          },
        },
        {
          id: "launch", name: { en: "Launch", ko: "띄우기" }, param: "up 110px · tilt",
          cap: { en: "Pop the boss *off the ground*. Heavy + airborne = power.", ko: "보스를 *붕* 띄워요. 무거운 게 뜨면 = 힘." },
          smash(w, p, b) {
            w.shake(0.6);
            w.tween(b, { oy: -110, rot: 0.3 }, 0.45, "out", () => w.tween(b, { oy: 0, rot: 0 }, 0.3, "in", () => { w.shake(0.5); dust(w, b.x, G, 14); }));
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crit + boom",
          cap: { en: "A crunchy *crit*, a long *boom* tail.", ko: "*빡!* 하고, 길게 *쿠웅*." },
          smash(w) { w.sfx.crit(); w.sfx.boom(); },
        },
      ],
    },

    /* 20 ─ 슬로모션 완벽 회피 */
    {
      id: "duel-slowdodge", cat: "duel", view: "side",
      title: { en: "Slow time on a *perfect dodge*", ko: "완벽 회피에 *시간 느리게*" },
      intro: { en: "Dodged at the last frame. *Felt like nothing.*", ko: "마지막 순간 피했는데. *아무 느낌 없죠*." },
      interval: 2.4, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 230 }); w.boss = w.actor("duel-boss", { home: 440 }); w.club = { rot: 0.3 }; w.cool = 0; },
      fire(w) {
        restart(w);
        const h = w.hero, b = w.boss; h.x = h.home; w.club.rot = 0.3; w.cool = 0; b.ox = 0;
        w.tween(w.club, { rot: 0.9 }, 0.3, "out", () => w.tween(w.club, { rot: -1.7 }, 0.2, "in", () => w.tween(w.club, { rot: 0.3 }, 0.5, "inout")));
        w.after(0.4, () => { w.emit("dodge", h); w.tween(h, { x: 130 }, 0.18, "out"); });
        w.after(0.95, () => w.tween(h, { x: 300 }, 0.16, "in", () => {
          const p = { x: 330, y: G - 110 }; b.flash = 1; b.ox += 14;
          w.emit("counter", p);
          w.after(0.3, () => w.tween(h, { x: h.home }, 0.3, "inout"));
        }));
      },
      update(w, dt) { w.cool = Math.max(0, w.cool - dt * 0.9); },
      drawFront(w, ctx) { drawClub(ctx, ...Object.values(bossHand(w.boss)), w.club.rot, 150); },
      drawHud(w, ctx) {
        if (w.cool <= 0) return;
        ctx.fillStyle = `rgba(40,90,200,${0.22 * w.cool})`; ctx.fillRect(-100, -100, 740, 560);
        const g = ctx.createRadialGradient(270, 180, 120, 270, 180, 360);
        g.addColorStop(0, "rgba(5,10,30,0)"); g.addColorStop(1, `rgba(5,10,30,${0.75 * w.cool})`);
        ctx.fillStyle = g; ctx.fillRect(-100, -100, 740, 560);
      },
      steps: [
        {
          id: "slow", name: { en: "Time Slow", ko: "시간 느리게" }, param: "time ×0.2 · 1.2s",
          cap: { en: "Dodge on the last frame? *Slow time down.*", ko: "마지막 순간 피했다면? *시간을 늦춰요*." },
          dodge(w) { w.slowmo(0.2, 1.2); },
        },
        {
          id: "tint", name: { en: "Cold Tint", ko: "차가운 색" }, param: "blue 22% · dark edges",
          cap: { en: "Tint the world *cold blue*. Darken the edges.", ko: "세상을 *차가운 파랑*으로. 가장자리는 어둡게." },
          dodge(w) { w.cool = 1; },
        },
        {
          id: "ghosts", name: { en: "Afterimages", ko: "잔상" }, param: "6 ghosts",
          cap: { en: "Leave *afterimages* along the dodge path.", ko: "피한 길을 따라 *잔상*을 남겨요." },
          dodge(w, h) { for (let i = 0; i < 6; i++) w.after(i * 0.03, () => ghost(w, h, h.s.cyan, 0.7, 0.55)); },
        },
        {
          id: "ripple", name: { en: "Time Ripple", ko: "시간 물결" }, param: "2 rings · slow",
          cap: { en: "A slow *ripple* spreads out. Time itself bends.", ko: "느린 *물결*이 퍼져요. 시간이 휘는 느낌." },
          dodge(w, h) {
            for (let i = 0; i < 2; i++) w.after(i * 0.08, () => w.spawn({ type: "ring", x: h.x, y: G - 70, size: 20, size1: 260, life: 0.5, w: 5, color: "125,211,252" }));
          },
        },
        {
          id: "text", name: { en: "Callout", ko: "칭찬 글자" }, param: "JUST DODGE!",
          cap: { en: "Name the skill: *JUST DODGE!*", ko: "해낸 걸 불러 줘요: *JUST DODGE!*" },
          dodge(w, h) { say(w, "JUST DODGE!", 200, 100, 32, "#7dd3fc", 0.5, -20); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch-down whoosh",
          cap: { en: "A *whoosh* that *drops in pitch* — and a heartbeat.", ko: "음이 *쭉 떨어지는* 휙, 그리고 심장 *쿵*." },
          dodge(w) { w.play(() => { tn({ f: 900, f2: 120, dur: 0.7, vol: 0.2 }); nz({ dur: 0.6, type: "bandpass", f: 2400, f2: 300, q: 2, vol: 0.3 }); tn({ f: 60, f2: 40, dur: 0.15, vol: 0.6, delay: 0.25 }); }); },
          counter(w) { w.sfx.crit(); },
        },
      ],
    },

    /* 21 ─ 광선 힘겨루기 */
    {
      id: "duel-beam", cat: "duel", view: "side",
      title: { en: "Turn a beam clash into *tug-of-war*", ko: "광선 대결을 *줄다리기*로" },
      intro: { en: "Two lines touch. Which one's *winning*?", ko: "선 두 개가 닿아 있어요. *누가 이겨요?*" },
      interval: 0.35, stepDur: 4.0,
      setup(w) { art(); w.hero = w.actor("hero", { home: 90 }); w.boss = w.actor("duel-boss", { home: 450 }); w.bs = { x: 250, fat: 0, kick: 0, bump: 0 }; },
      fire(w) {
        const s = w.bs; s.x += 30;
        w.emit("push", s);
        if (s.x >= 375) { w.emit("win", { x: s.x, y: G - 100 }, w.boss); s.x = 250; }
      },
      update(w, dt) {
        const s = w.bs;
        s.x = Math.max(150, s.x - 45 * dt);
        s.kick = Math.max(0, s.kick - dt * 5); s.bump = Math.max(0, s.bump - dt * 4);
      },
      drawFront(w, ctx) {
        const s = w.bs, hp = paw(w), c = chest(w.boss), y = G - 100, wob = Math.sin(w.time * 50) * 2;
        const beam = (x0, y0, col, core) => {
          ctx.lineCap = "round";
          if (s.fat) {
            ctx.globalCompositeOperation = "lighter";
            ctx.strokeStyle = `rgba(${col},0.35)`; ctx.lineWidth = 30 + s.kick * 16 + wob; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(s.x, y); ctx.stroke();
            ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 13 + s.kick * 6; ctx.stroke();
            ctx.strokeStyle = core; ctx.lineWidth = 5; ctx.stroke();
            ctx.globalCompositeOperation = "source-over";
          } else { ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(s.x, y); ctx.stroke(); }
        };
        beam(hp.x, hp.y, "198,244,50", "#fff");
        beam(c.x, c.y, "244,63,94", "#fff");
        if (w.on("clash")) { ctx.globalCompositeOperation = "lighter"; glow(ctx, s.x, y, 60 + s.kick * 30 + wob * 3, "255,240,200", 1); glow(ctx, s.x, y, 22, "255,255,255", 1); ctx.globalCompositeOperation = "source-over"; }
      },
      drawHud(w, ctx) {
        if (!w.on("meter")) return;
        const s = w.bs, X = 120, W = 300, Y = 56, k = (s.x - 150) / 225;
        ctx.save(); ctx.translate(270, Y + 6); ctx.scale(1 + s.bump * 0.06, 1 + s.bump * 0.3); ctx.translate(-270, -Y - 6);
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(X - 4, Y - 4, W + 8, 20);
        ctx.fillStyle = "#c6f432"; ctx.fillRect(X, Y, W * k, 12);
        ctx.fillStyle = "#f43f5e"; ctx.fillRect(X + W * k, Y, W * (1 - k), 12);
        ctx.fillStyle = "#fff"; ctx.fillRect(X + W * k - 2, Y - 6, 4, 24);
        ctx.restore();
        label(ctx, "MASH!", 270, 92, 18, s.bump > 0.5 ? "#c6f432" : "#fff");
      },
      steps: [
        {
          id: "fat", name: { en: "Fat Beams", ko: "굵은 광선" }, param: "30px glow · white core",
          cap: { en: "Two *fat beams*, each in its owner's color.", ko: "주인 색깔 그대로 *굵은 광선* 두 줄기." },
          push(w, s) { s.fat = 1; },
        },
        {
          id: "clash", name: { en: "Clash Point", ko: "맞닿는 점" }, param: "glow ball + sparks",
          cap: { en: "A *blazing ball* where they meet, spitting sparks.", ko: "맞닿은 곳에 *이글이글* 빛 덩어리, 불꽃이 *튀어요*." },
          update(w) { const s = w.bs; sparks(w, s.x, G - 100, 2, "255,230,170", [200, 500]); },
        },
        {
          id: "surge", name: { en: "Push Surge", ko: "밀어붙이기" }, param: "pulse + ring per tap",
          cap: { en: "Every tap *surges*: beams pulse, a ring pops.", ko: "누를 때마다 광선이 *울컥*, 고리가 *팡*." },
          push(w, s) { s.kick = 1; w.hero.ox -= 4; w.spawn({ type: "ring", x: s.x, y: G - 100, size: 20, size1: 70, life: 0.25, w: 5, color: "198,244,50" }); },
        },
        {
          id: "meter", name: { en: "Tug Meter", ko: "줄다리기 게이지" }, param: "split bar · bump",
          cap: { en: "A *split meter* shows who's ahead. MASH!", ko: "*반반 게이지*로 누가 앞서는지. 연타!" },
          push(w, s) { s.bump = 1; },
        },
        {
          id: "win", name: { en: "Overpower", ko: "밀어내기 성공" }, param: "boom · flash · stop",
          cap: { en: "Break through: *explode* on the boss. Huge payoff.", ko: "뚫어 내면 보스 앞에서 *쾅*. 큰 보상." },
          enter(w) { w.bs.x = 340; },
          win(w, p, b) { boom(w, p.x + 20, p.y, 2); w.flash("255,255,255", 0.6); w.hitstop(0.12); w.shake(0.6); b.flash = 1.5; b.ox += 40; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "zap + boom",
          cap: { en: "A *zap* per tap, a *boom* when it breaks.", ko: "누를 때마다 *지직*, 뚫으면 *쾅*." },
          push(w) { w.play(() => { tn({ type: "sawtooth", f: 180, f2: 260, dur: 0.12, vol: 0.1 }); nz({ dur: 0.1, type: "bandpass", f: 1800, q: 2, vol: 0.2 }); }); },
          win(w) { w.sfx.boom(); },
        },
      ],
    },

    /* 22 ─ 미러 매치 VS 화면 */
    {
      id: "duel-vs", cat: "duel", view: "ui",
      title: { en: "Make the VS screen *clash*", ko: "VS 화면이 *맞부딪히게*" },
      intro: { en: "Two pictures. A small *vs*.", ko: "그림 두 장. 작은 *vs*." },
      interval: 2.2, stepDur: 3.8,
      setup(w) {
        art();
        w.hero = w.actor("hero", { home: 140, h: 160 }); w.rival = w.actor("duel-mirror", { home: 400, h: 160, flip: true });
        w.vs = { l: 1, pop: 0, names: 1, on: false };
      },
      fire(w) {
        restart(w);
        const v = w.vs; Object.assign(v, { l: 1, pop: 0, names: 1, on: false });
        w.emit("start", v);
        w.after(0.35, () => { v.on = true; w.emit("vs", v); });
      },
      update(w, dt) { w.vs.pop = Math.max(0, w.vs.pop - dt * 4); },
      drawFloor(w, ctx) {
        const v = w.vs, s = (1 - v.l) * 330;
        ctx.fillStyle = "#1e2433"; ctx.beginPath(); ctx.moveTo(-60 - s, 20); ctx.lineTo(300 - s, 20); ctx.lineTo(240 - s, 340); ctx.lineTo(-60 - s, 340); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#15254a"; ctx.beginPath(); ctx.moveTo(300 + s, 20); ctx.lineTo(600 + s, 20); ctx.lineTo(600 + s, 340); ctx.lineTo(240 + s, 340); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(-60, G, 660, 2);
      },
      drawHud(w, ctx) {
        const v = w.vs;
        if (v.on) {
          const big = w.on("slam"), sz = big ? 84 * (1 + v.pop * 0.8) : 24;
          ctx.save(); ctx.translate(270, 160); ctx.rotate(big ? -0.12 : 0);
          ctx.font = `900 ${sz}px Pretendard, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineWidth = big ? 12 : 4; ctx.strokeStyle = "#0b0c0f"; ctx.strokeText("VS", 0, 0);
          ctx.fillStyle = big ? "#c6f432" : "#e5e7eb"; ctx.fillText("VS", 0, 0); ctx.restore();
        }
        const k = E.out(v.names);
        ctx.globalAlpha = Math.min(1, v.names * 2);
        rr(ctx, 40 - (1 - k) * 200, 292, 150, 30, 6, "#f5f5f0"); label(ctx, "PLAYER 1", 115 - (1 - k) * 200, 307, 15, "#0b0c0f", "center", "'JetBrains Mono', monospace", 800);
        rr(ctx, 350 + (1 - k) * 200, 292, 150, 30, 6, "#60a5fa"); label(ctx, "SHADOW", 425 + (1 - k) * 200, 307, 15, "#0b0c0f", "center", "'JetBrains Mono', monospace", 800);
        ctx.globalAlpha = 1;
      },
      steps: [
        {
          id: "slide", name: { en: "Panel Slide", ko: "패널 밀어 넣기" }, param: "300ms from sides",
          cap: { en: "Panels *slam in from both sides*. Two worlds collide.", ko: "양쪽에서 패널이 *쾅* 들어와요. 두 세계의 충돌." },
          start(w, v) { v.l = 0; w.tween(v, { l: 1 }, 0.3, "out"); w.hero.ox = -320; w.rival.ox = 320; },
        },
        {
          id: "slam", name: { en: "VS Slam", ko: "VS 쾅" }, param: "84px · tilt · shake",
          cap: { en: "*VS* slams in huge and tilted. Shake on impact.", ko: "*VS*가 크게, 비스듬히 *쾅*. 화면도 흔들려요." },
          vs(w, v) { v.pop = 1; w.shake(0.5); },
        },
        {
          id: "bolt", name: { en: "Lightning Split", ko: "번개 가르기" }, param: "zigzag + flash",
          cap: { en: "A *lightning bolt* splits the screen in two.", ko: "*번개*가 화면을 반으로 *쩍*." },
          vs(w) {
            const pts = []; for (let i = 0; i <= 8; i++) pts.push([(i % 2 ? 14 : -14) - i * 7.5, i * 42]);
            w.spawn({ type: "crack", x: 300, y: 10, pts, w: 5, life: 0.5, color: "255,255,255", add: true });
            w.flash("255,255,255", 0.5);
          },
        },
        {
          id: "names", name: { en: "Name Plates", ko: "이름표" }, param: "slide 250ms",
          cap: { en: "*Name plates* slide in under each fighter.", ko: "각자 아래로 *이름표*가 스윽." },
          vs(w, v) { v.names = 0; w.tween(v, { names: 1 }, 0.25, "out"); },
        },
        {
          id: "glitch", name: { en: "Mirror Glitch", ko: "거울 지직" }, param: "offset ghosts",
          cap: { en: "The *mirror* copy *glitches*. Something's off.", ko: "*거울* 속 상대가 *지직지직*. 뭔가 이상해요." },
          update(w) { if (Math.random() < 0.35) { const g = ghost(w, w.rival, w.rival.s.cyan, 0.1, 0.6); g.x += rand(-16, 16); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + thunder",
          cap: { en: "Two *whooshes*, then *thunder* on VS.", ko: "*휙휙* 두 번, VS에서 *콰르릉*." },
          start(w) { w.sfx.dash(); w.after(0.08, () => w.sfx.dash()); },
          vs(w) { w.sfx.slam(); w.sfx.burst(); },
        },
      ],
    },

    /* 23 ─ 보스 잡기 · 던지기 */
    {
      id: "duel-grab", cat: "duel", view: "side",
      title: { en: "Make a boss grab *hurt*", ko: "보스 잡기를 *아프게*" },
      intro: { en: "Picked up. Put down. *Gentle.*", ko: "들었다가 내려놓네요. *상냥하게*." },
      interval: 2.6, stepDur: 4.0,
      setup(w) {
        art(); w.hero = w.actor("hero", { home: 250 }); w.boss = w.actor("duel-boss", { home: 430 });
        Object.assign(w.hero, { maxHp: 100, hp: 100, hpLag: 100 });
      },
      fire(w) {
        restart(w);
        const h = w.hero, b = w.boss;
        Object.assign(h, { x: h.home, oy: 0, rot: 0, hp: 100, hpLag: 100 });
        const grab = () => {
          w.tween(h, { x: 335, oy: -90 }, 0.2, "out", () => {
            w.emit("grab", h);
            for (let i = 0; i < 3; i++) w.after(0.12 + i * 0.16, () => { h.hp -= 8; w.emit("squeeze", h, i); });
            w.after(0.6, () => {
              w.emit("throw", h);
              w.tween(h, { x: 70 }, 0.45, "out");
              w.tween(h, { oy: -170 }, 0.2, "out", () => w.tween(h, { oy: 0 }, 0.25, "in", () => { h.hp -= 16; w.emit("land", h); }));
            });
          });
        };
        if (w.on("warn")) { w.emit("warn", b); w.after(0.45, grab); } else grab();
        w.after(2.0, () => w.tween(h, { x: h.home }, 0.4, "inout"));
      },
      update(w) { if (!w.on("hp")) w.hero.hpLag = w.hero.hp; },
      drawHud(w, ctx) { heroBar(ctx, w.hero, 40, 66, w.on("hp")); },
      steps: [
        {
          id: "warn", name: { en: "Grab Tell", ko: "잡기 예고" }, param: "red flash · 450ms",
          cap: { en: "Flash the boss *red* and lean back. *Unblockable!*", ko: "보스가 *빨갛게* 번쩍, 몸을 젖혀요. *못 막아요!*" },
          warn(w, b) {
            b.tint = 1; w.tween(b, { ox: 18 }, 0.35, "out");
            say(w, "!", b.x - 40, b.gy - b.h - 20, 54, "#ef4444", 0.5, 0);
          },
        },
        {
          id: "squeeze", name: { en: "Squeeze", ko: "꽉 쥐기" }, param: "3 ticks · tremble",
          cap: { en: "Each *squeeze* flashes red and crushes the hero.", ko: "*꽉* 쥘 때마다 빨갛게, *찌그러지게*." },
          squeeze(w, h) { h.tint = 1; h.sx = 0.75; h.sy = 1.12; h.vib = 5; w.shake(0.15); sparks(w, h.x, G - 150, 5, "255,120,120", [120, 300]); },
        },
        {
          id: "throw", name: { en: "Spin Throw", ko: "돌려 던지기" }, param: "1.5 spins · trail",
          cap: { en: "Throw it *spinning*, with a *trail* behind.", ko: "*빙글빙글* 던지고, 뒤로 *꼬리*." },
          throw(w, h) {
            w.tween(h, { rot: -TAU * 1.5 }, 0.45, "lin", () => { h.rot = 0; });
            for (let i = 0; i < 8; i++) w.after(i * 0.05, () => ghost(w, h, h.s.white, 0.25, 0.35));
          },
        },
        {
          id: "impact", name: { en: "Crash Landing", ko: "처박히기" }, param: "trauma .5 · dust",
          cap: { en: "*Crash* into the floor. Squash, dust, shake.", ko: "바닥에 *쿵* 처박혀요. 찌그러지고, 먼지." },
          land(w, h) {
            w.shake(0.5, -1); h.sx = 1.4; h.sy = 0.65; dust(w, h.x, G, 14);
            w.spawn({ type: "ring", x: h.x, y: G, size: 10, size1: 110, life: 0.4, w: 6, flat: true, color: "255,230,200" });
          },
        },
        {
          id: "hp", name: { en: "Chunky HP Loss", ko: "뭉텅 깎이는 체력" }, param: "lag 400ms · shake",
          cap: { en: "Show the *chunk* lost. Yellow lingers, bar shakes.", ko: "*뭉텅* 깎인 게 보이게. 노랑이 남고 바가 흔들려요." },
          squeeze(w, h) { h.lagWait = 0.4; h.barShake = 0.2; },
          land(w, h) { h.lagWait = 0.4; h.barShake = 0.3; w.vignette(0.6); },
          update(w, dt) { lagBar(w.hero, dt); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crunch ×3 + slam",
          cap: { en: "Crunchy *squeezes*, a *whoosh*, a heavy *slam*.", ko: "*우드득*, *휙*, 그리고 *쿵*." },
          squeeze(w) { w.sfx.hurt(); },
          throw(w) { w.sfx.dash(); },
          land(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 24 ─ 패링 후 반격 */
    {
      id: "duel-parry", cat: "duel", view: "side",
      title: { en: "Make a parry *pay off*", ko: "패링이 *보상받게*" },
      intro: { en: "Parried! …So what?", ko: "막았다! …그래서요?" },
      interval: 1.9, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 190 }); w.foe = w.actor("foe", { home: 440 }); w.ha = -0.9; w.fa = -2.0; },
      fire(w) {
        restart(w);
        const h = w.hero, f = w.foe;
        Object.assign(f, { x: f.home, rot: 0, ox: 0 }); h.x = h.home; w.ha = -0.9; w.fa = -2.0;
        w.tween(w, { fa: -1.2 }, 0.2, "out");
        w.after(0.22, () => w.tween(f, { x: 330 }, 0.18, "in", () => {
          w.fa = -2.9; w.ha = -1.5;
          const p = { x: 285, y: G - 105 };
          w.emit("parry", p, f);
          w.tween(f, { x: 380 }, 0.3, "out");
          if (w.on("riposte")) w.after(0.3, () => w.tween(h, { x: 300 }, 0.08, "in", () => {
            w.ha = 0.4; f.flash = 1.2;
            w.emit("riposte", { x: f.x - 50, y: G - 80 }, f);
          }));
        }));
        w.after(1.3, () => { w.tween(h, { x: h.home }, 0.3, "inout"); w.tween(f, { x: f.home, rot: 0 }, 0.4, "inout"); w.tween(w, { ha: -0.9, fa: -2.0 }, 0.3); });
      },
      drawFront(w, ctx) {
        const hp = handH(w.hero), fp = handF(w.foe);
        drawSword(ctx, hp.x, hp.y, w.ha, 80);
        drawSword(ctx, fp.x, fp.y, w.fa, 80, "#cbd5e1");
      },
      steps: [
        {
          id: "flash", name: { en: "Parry Flash", ko: "패링 섬광" }, param: "stop 100ms · star",
          cap: { en: "*Freeze* and flash a bright *star* on the blades.", ko: "칼이 닿는 곳에 *멈칫*, 밝은 *별빛*." },
          parry(w, p) { w.hitstop(0.1); w.spawn({ type: "star", x: p.x, y: p.y, size: 80, life: 0.18, color: "255,255,255" }); w.spawn({ type: "glow", x: p.x, y: p.y, size: 90, size1: 20, life: 0.25, color: "125,211,252" }); },
        },
        {
          id: "shield", name: { en: "Parry Arc", ko: "막기 호" }, param: "arc + PARRY",
          cap: { en: "A blue *arc* and the word *PARRY*. Skill seen.", ko: "파란 *호*와 *PARRY* 글자. 실력이 보여요." },
          parry(w, p) {
            w.spawn({ type: "arc", x: p.x - 30, y: p.y, size: 60, life: 0.35, a0: -1.2, a1: 1.2, color: "125,211,252" });
            say(w, "PARRY", p.x - 30, p.y - 80, 30, "#7dd3fc", 0.9, -30);
          },
        },
        {
          id: "stagger", name: { en: "Off Balance", ko: "균형 무너짐" }, param: "tilt .35 · stars",
          cap: { en: "The attacker *wobbles back*. Stars spin overhead.", ko: "공격한 쪽이 *휘청* 뒤로. 머리 위 *별*." },
          parry(w, p, f) {
            w.tween(f, { rot: 0.35 }, 0.15, "out", () => w.tween(f, { rot: 0 }, 0.6, "inout"));
            for (let i = 0; i < 3; i++) w.spawn({ type: "star", x: f.x + 20 + Math.cos(i * 2.1) * 30, y: G - f.h - 12, vx: Math.cos(i * 2.1) * -40, vy: -20, size: 10, life: 0.8, color: "253,224,71" });
          },
        },
        {
          id: "riposte", name: { en: "Riposte", ko: "반격" }, param: "auto counter +300ms",
          cap: { en: "A *free counterattack* right after. That's the reward.", ko: "곧바로 *공짜 반격*. 이게 보상이에요." },
          riposte(w, p) {
            w.spawn({ type: "slash", x: p.x, y: p.y, ang: -0.7, len: 70, size: 10, life: 0.25, color: "255,255,255" });
            w.after(0.05, () => w.spawn({ type: "slash", x: p.x, y: p.y, ang: 0.7, len: 70, size: 10, life: 0.25, color: "255,255,255" }));
          },
        },
        {
          id: "crit", name: { en: "Critical Counter", ko: "치명 반격" }, param: "zoom · 88 dmg",
          cap: { en: "The counter *crits*: zoom, shake, a *big* number.", ko: "반격은 *치명타*: 줌, 흔들림, *큰* 숫자." },
          riposte(w, p, f) {
            w.hitstop(0.08); w.zoomPunch(0.1); w.shake(0.4, 1); f.ox += 40;
            w.spawn({ type: "text", text: "88!", x: p.x, y: p.y - 50, vy: -260, g: 700, life: 1, size: 48, color: "#fde047" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ring + crit",
          cap: { en: "A bright *ting* on parry, a *crit* on the counter.", ko: "막을 때 맑은 *쨍*, 반격에 *빡*." },
          parry(w) { clang(w); },
          riposte(w) { w.sfx.crit(); },
        },
      ],
    },

    /* 25 ─ 두 번째 체력바 공개 */
    {
      id: "duel-secondbar", cat: "duel", view: "side",
      title: { en: "Reveal the boss's *second bar*", ko: "보스의 *두 번째 체력바* 공개" },
      intro: { en: "HP zero. Oh, it's full again. *Huh.*", ko: "체력 0. 어, 다시 꽉 찼네. *음?*" },
      interval: 2.8, stepDur: 4.2,
      setup(w) { art(); w.hero = w.actor("hero", { home: 120 }); w.boss = w.actor("duel-boss", { home: 410 }); w.B = { v: 0.12, col: "#ef4444", badge: 0, under: null }; },
      fire(w) {
        restart(w);
        const h = w.hero, b = w.boss, B = w.B;
        Object.assign(B, { v: 0.12, col: "#ef4444", badge: 0, under: null }); Object.assign(b, { h: 210, w: 210, tint: 0 }); h.x = h.home;
        w.tween(h, { x: 280 }, 0.2, "in", () => {
          swing(w); B.v = 0; b.flash = 1; b.ox += 16; w.emit("die", b);
          w.after(0.1, () => w.tween(h, { x: h.home }, 0.3, "inout"));
          w.after(w.on("fakeout") ? 0.7 : 0.05, () => { B.v = 1; Object.assign(b, { h: 210, w: 210 }); w.emit("revive", b, B); });
        });
      },
      drawHud(w, ctx) {
        const B = w.B;
        topBar(ctx, w.boss, { name: "DARK WARLORD", v: B.v, col: B.col, under: B.under, y: 64 });
        if (B.badge > 0) {
          const s = 1 + Math.max(0, B.badge - 0.7) * 2;
          ctx.save(); ctx.translate(452, 71); ctx.scale(s, s); rr(ctx, -16, -13, 32, 26, 6, "#a855f7");
          label(ctx, "×2", 0, 1, 15, "#fff", "center", "'JetBrains Mono', monospace", 800); ctx.restore();
        }
      },
      update(w, dt) { w.B.badge = Math.max(w.B.badge > 0 ? 0.7 : 0, w.B.badge - dt * 2); },
      drawFront(w, ctx) { heroSword(w, ctx); },
      steps: [
        {
          id: "fakeout", name: { en: "Fake Death", ko: "죽은 척" }, param: "700ms of silence",
          cap: { en: "Let it *die* first. A beat of *silence*. Then…", ko: "일단 *쓰러뜨려요*. *정적* 한 박자. 그리고…" },
          die(w, b) { w.tween(b, { h: 160, w: 240 }, 0.25, "out"); w.flash("0,0,0", 0.5); },
        },
        {
          id: "layer", name: { en: "New Bar Color", ko: "새 색깔 바" }, param: "purple · ×2 badge",
          cap: { en: "The new bar gets a *new color* and a *×2* badge.", ko: "새 바는 *다른 색*, 옆에 *×2* 표시." },
          revive(w, b, B) { B.col = "#a855f7"; B.under = "#3b0764"; B.badge = 1.2; },
        },
        {
          id: "fill", name: { en: "Refill", ko: "다시 차오르기" }, param: "0→100% · 800ms",
          cap: { en: "*Refill* it slowly. Let the dread *build*.", ko: "*천천히* 다시 차올라요. 절망이 *쌓여요*." },
          revive(w, b, B) { B.v = 0; w.tween(B, { v: 1 }, 0.8, "inout"); },
        },
        {
          id: "rise", name: { en: "Power Rise", ko: "다시 일어서기" }, param: "grow · pillar",
          cap: { en: "The boss *rises bigger*, in a *pillar* of light.", ko: "보스가 *더 크게* 일어서요. *빛기둥*과 함께." },
          revive(w, b) {
            w.tween(b, { h: 236, w: 236 }, 0.35, "back"); b.tint = 0;
            w.spawn({ type: "beam", x: b.x, y: G, size: 90, h: 420, life: 1, color: "168,85,247" });
            for (let i = 0; i < 3; i++) w.after(i * 0.12, () => w.spawn({ type: "ring", x: b.x - 20, y: G - 120, size: 30, size1: 200, life: 0.5, w: 7, color: "192,132,252" }));
            w.shake(0.5);
          },
        },
        {
          id: "text", name: { en: "Taunt Line", ko: "도발 대사" }, param: "NOT OVER YET",
          cap: { en: "One line seals it: *NOT OVER YET*.", ko: "대사 한 줄로 쐐기: *NOT OVER YET*." },
          revive(w) { w.after(0.2, () => say(w, "NOT OVER YET", 190, 130, 30, "#d8b4fe", 1.6, -6)); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "silence → rising roar",
          cap: { en: "*Silence*, then a deep *rising* roar.", ko: "*정적*, 그다음 낮게 *차오르는* 포효." },
          die(w) { w.sfx.thud(); },
          revive(w) { w.sfx.charge(); growl(w); },
        },
      ],
    },
  );
})();

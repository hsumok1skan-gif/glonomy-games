"use strict";
/* action — 액션 / 소울라이크 레시피 25편 */
(() => {
  /* ───── 파일 전용 도우미 ───── */
  const SWL = 96;
  const dirOf = a => (a.flip ? -1 : 1);
  // 손 위치 (칼자루)
  const hand = a => ({ x: a.x + a.ox + dirOf(a) * a.w * 0.26, y: a.gy + a.oy - a.h * 0.52 * a.sy });
  // rot: 0 = 앞쪽, 음수 = 위로. 바라보는 방향에 맞춰 월드 각도로 바꿈
  const angOf = (a, rot) => (dirOf(a) > 0 ? rot : Math.PI - rot);
  const tipOf = (a, s, L = SWL) => { const p = hand(a), g = angOf(a, s.rot); return { x: p.x + Math.cos(g) * L, y: p.y + Math.sin(g) * L }; };
  function blade(ctx, x, y, ang, L, col = "#e5e7eb", glowA = 0, glowC = "255,200,90", alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = alpha;
    if (glowA > 0) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i <= 4; i++) glow(ctx, 12 + (L - 12) * i / 4, 0, 16 + glowA * 26, glowC, 0.35 * glowA);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.fillStyle = "#6b4423"; ctx.fillRect(-16, -3.5, 18, 7);
    ctx.fillStyle = "#3f3f46"; ctx.fillRect(0, -11, 6, 22);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(L - 14, -5); ctx.lineTo(L, 0); ctx.lineTo(L - 14, 5); ctx.lineTo(6, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillRect(8, -5, L - 24, 2);
    ctx.restore();
  }
  const drawSword = (ctx, a, s, L = SWL) => { if (a.alpha <= 0) return; const p = hand(a); blade(ctx, p.x, p.y, angOf(a, s.rot), L, s.col, s.glowA || 0, s.glowC, a.alpha); };
  // 로우폴리 적: 붉은 기사, 보라색 보스
  function ensureArt() {
    if (!ACTOR["action-knight"]) {
      polySprite("action-knight", () => humanModel().concat([blk(0, 204, 0, 12, 22, 44, 0.6)]), 170, 280, -0.72, 0.3, [222, 104, 98], [52, 18, 30]);
      ACTOR["action-knight"] = { spr: "action-knight", h: 150, home: 390, hp: 100, flip: true };
    }
    if (!ACTOR["action-boss"]) {
      const horn = s => pyr([[-8, 190, s * 14], [8, 190, s * 14], [8, 196, s * 24], [-8, 196, s * 24]], [6, 236, s * 46]);
      polySprite("action-boss", () => [
        blk(0, 0, -18, 36, 80, 30, 0.9), blk(0, 0, 18, 36, 80, 30, 0.9),
        blk(0, 78, 0, 54, 82, 84, 1.25),
        blk(-2, 104, -60, 28, 60, 28, 0.85, -3, 0), blk(4, 126, 62, 28, 36, 28, 0.9, 8, 0), blk(30, 112, 62, 50, 22, 22),
        blk(0, 158, 0, 24, 10, 26), blk(4, 166, 0, 52, 46, 48, 0.8, 2, 0), horn(1), horn(-1),
      ], 200, 270, -0.72, 0.3, [176, 140, 224], [34, 22, 58]);
      ACTOR["action-boss"] = { spr: "action-boss", h: 200, home: 420, hp: 100, flip: true };
    }
  }
  const pop = (w, text, x, y, size = 30, color = "#fff", life = 0.9) => w.spawn({ type: "text", text, x, y, vy: -60, life, size, color });
  const meter = (ctx, x, y, W, H, v, col, lag, lagCol = "#facc15") => {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, W + 6, H + 6, 5); ctx.fill();
    if (lag != null) { ctx.fillStyle = lagCol; ctx.fillRect(x, y, W * Math.max(0, Math.min(1, lag)), H); }
    ctx.fillStyle = col; ctx.fillRect(x, y, W * Math.max(0, Math.min(1, v)), H);
  };
  const veil = (ctx, col, a) => { if (a > 0) { ctx.fillStyle = `rgba(${col},${a})`; ctx.fillRect(-100, -100, 740, 560); } };
  const clang = (w, p = 1) => w.play(() => { tn({ type: "triangle", f: 1900 * p, f2: 1700 * p, dur: 0.45, vol: 0.2 }); tn({ type: "triangle", f: 2870 * p, dur: 0.3, vol: 0.1 }); nz({ dur: 0.08, type: "highpass", f: 3500, vol: 0.4 }); });

  RECIPES.push(
    /* 1 ─ 패링 */
    {
      id: "action-parry", cat: "action", view: "side",
      title: { en: "Make a parry feel *earned*", ko: "패링이 *짜릿하게*" },
      intro: { en: "Perfect timing. Looked like a *normal block*.", ko: "완벽한 타이밍인데 *그냥 막기* 같아요." },
      interval: 1.4, stepDur: 3.6,
      setup(w) {
        ensureArt();
        w.hero = w.actor("hero", { home: 170 }); w.sw = { rot: -0.2 };
        w.foe = w.actor("action-knight", { home: 390 }); w.ks = { rot: -1.4 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const k = w.foe, at = { x: 268, y: G - 112 };
        w.emit("windup", at);
        w.tween(w.ks, { rot: -2.3 }, 0.24, "out", () => {
          w.tween(w.sw, { rot: -1.25 }, 0.08, "out");
          w.tween(k, { x: 330 }, 0.1, "in");
          w.tween(w.ks, { rot: -0.45 }, 0.1, "in", () => {
            k.ox += 8;
            w.emit("parry", at);
            w.after(0.25, () => {
              w.tween(k, { x: k.home, rot: 0 }, 0.3, "inout", () => { w.busy = false; });
              w.tween(w.ks, { rot: -1.4 }, 0.3, "inout"); w.tween(w.sw, { rot: -0.2 }, 0.3, "inout");
            });
          });
        });
      },
      drawFront(w, ctx) { drawSword(ctx, w.foe, w.ks, 104); drawSword(ctx, w.hero, w.sw); },
      steps: [
        {
          id: "ring", name: { en: "Timing Ring", ko: "타이밍 고리" }, param: "shrinks to 0 in 340ms",
          cap: { en: "A ring *closes in* on the perfect frame.", ko: "고리가 *딱 맞는 순간*에 닫혀요." },
          windup(w, at) { w.spawn({ type: "ring", x: at.x, y: at.y, size: 80, size1: 6, life: 0.34, w: 5, color: "198,244,50", hold: true }); },
        },
        {
          id: "sparks", name: { en: "Clash Sparks", ko: "부딪힌 불꽃" }, param: "star + 22 sparks",
          cap: { en: "Steel on steel: a *star* and a *spray* of sparks.", ko: "쇠와 쇠가 *챙*. 별 섬광과 불꽃." },
          parry(w, at) {
            w.spawn({ type: "star", x: at.x, y: at.y, size: 70, life: 0.16, color: "255,250,220" });
            w.spawn({ type: "glow", x: at.x, y: at.y, size: 80, size1: 16, life: 0.22, color: "255,210,110" });
            sparks(w, at.x, at.y, 22, "255,220,130", [250, 750]);
          },
        },
        {
          id: "freeze", name: { en: "Freeze Both", ko: "둘 다 멈칫" }, param: "stop 120ms",
          cap: { en: "Freeze *both* blades. Let the moment land.", ko: "*두 칼*을 같이 멈춰요. 순간이 박혀요." },
          parry(w) { w.hitstop(0.12); w.foe.flash = 1; w.hero.flash = 0.6; },
        },
        {
          id: "recoil", name: { en: "Enemy Recoil", ko: "적이 튕겨남" }, param: "+70px · lean back",
          cap: { en: "*Throw* the enemy off balance, blade flung *high*.", ko: "적은 *휘청*, 칼은 *위로* 튕겨요." },
          parry(w) { const k = w.foe; k.ox += 70; k.k = 3; k.rot = 0.22; w.ks.rot = -2.8; },
        },
        {
          id: "flash", name: { en: "Screen Flash", ko: "화면 번쩍" }, param: "white .45 + label",
          cap: { en: "Flash the *screen*. Say it: *PARRY*.", ko: "*화면*이 번쩍, 글자로 *패링*." },
          parry(w, at) { w.flash("255,255,255", 0.45); w.spawn({ type: "text", text: "PARRY", x: at.x, y: at.y - 60, vy: -15, life: 1.3, size: 34, color: "#c6f432", hold: true }); },
        },
        {
          id: "shake", name: { en: "Sharp Shake", ko: "짧은 흔들림" }, param: "trauma .3 → right",
          cap: { en: "A *short*, sharp shake toward the enemy.", ko: "적 쪽으로 *짧고 날카롭게*." },
          parry(w) { w.shake(0.3, 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "bright clang",
          cap: { en: "A *bright clang* that rings out.", ko: "길게 울리는 *챙~*." },
          parry(w) { clang(w); },
        },
      ],
    },

    /* 2 ─ 완벽한 회피 슬로모션 */
    {
      id: "action-perfect-dodge", cat: "action", view: "side",
      title: { en: "Reward a *last-second* dodge", ko: "*아슬아슬* 회피에 보상을" },
      intro: { en: "A frame-perfect dodge. Nobody *noticed*.", ko: "프레임 단위로 피했는데 *아무도 몰라요*." },
      interval: 2.1, stepDur: 3.8,
      setup(w) {
        ensureArt();
        w.hero = w.actor("hero", { home: 230 }); w.foe = w.actor("action-boss", { home: 420 });
        w.bs = { rot: -1.2, col: "#c4b5fd" }; w.tintA = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, b = w.foe;
        w.tween(w.bs, { rot: -2.4 }, 0.2, "out", () => {
          w.emit("dodge", { x: h.x, y: G - 70 });
          w.tween(h, { x: 105 }, 0.22, "out");
          w.tween(b, { x: 360 }, 0.16, "in");
          w.tween(w.bs, { rot: 0.9 }, 0.16, "in", () => w.after(0.25, () => {
            w.tween(b, { x: b.home }, 0.3, "inout"); w.tween(w.bs, { rot: -1.2 }, 0.3, "inout");
            w.tween(h, { x: h.home }, 0.3, "inout", () => { w.busy = false; });
          }));
        });
      },
      update(w, dt) { w.tintA = Math.max(0, w.tintA - dt * 0.9); },
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(-80, G, 700, 120);
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
        veil(ctx, "30,58,138", w.tintA * 0.45);
      },
      drawFront(w, ctx) { drawSword(ctx, w.foe, w.bs, 150); },
      steps: [
        {
          id: "slowmo", name: { en: "Slow-mo", ko: "슬로모션" }, param: "×0.2 · 0.9s",
          cap: { en: "Dodge at the last second? *Slow the world down.*", ko: "마지막 순간에 피하면 *세상이 느려져요*." },
          dodge(w) { w.slowmo(0.2, 0.9); },
        },
        {
          id: "tint", name: { en: "Cold Tint", ko: "차가운 색" }, param: "blue .45 behind",
          cap: { en: "Tint the world *cold blue*. Time feels different.", ko: "배경을 *파랗게*. 시간이 달라진 느낌." },
          dodge(w) { w.tintA = 1; },
        },
        {
          id: "ghost", name: { en: "Afterimage", ko: "잔상" }, param: "ghost holds 0.8s",
          cap: { en: "Leave a *ghost* where the blow should've landed.", ko: "맞았어야 할 자리에 *잔상*을 남겨요." },
          dodge(w) { const h = w.hero; w.spawn({ type: "ghost", img: h.s.cyan, x: h.x, y: G, w: h.w, h: h.h, life: 0.8, alpha0: 0.6, hold: true, add: false }); },
        },
        {
          id: "ripple", name: { en: "Time Ripple", ko: "시간 파문" }, param: "ring r 10 → 170",
          cap: { en: "A *ripple* spreads out from you.", ko: "내 몸에서 *파문*이 퍼져요." },
          dodge(w, p) { w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 170, life: 0.5, w: 6, color: "147,197,253" }); },
        },
        {
          id: "label", name: { en: "Label", ko: "글자" }, param: "PERFECT",
          cap: { en: "*Tell* the player. They earned it.", ko: "*말해 줘요*. 잘한 거니까." },
          dodge(w, p) { pop(w, "PERFECT", p.x, p.y - 90, 30, "#93c5fd", 1.2); },
        },
        {
          id: "zoom", name: { en: "Zoom Punch", ko: "줌 펀치" }, param: "+9%",
          cap: { en: "Push the camera *in* a little.", ko: "카메라를 살짝 *당겨요*." },
          dodge(w) { w.zoomPunch(0.09); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + low chime",
          cap: { en: "A *whoosh*, then a deep, slowed *chime*.", ko: "*휙*, 그리고 낮게 늘어진 *띵~*." },
          dodge(w) { w.sfx.dash(); w.sfx.chime(-14); },
        },
      ],
    },

    /* 3 ─ 리포스트 / 처형 */
    {
      id: "action-riposte", cat: "action", view: "side",
      title: { en: "Make an execution *brutal*", ko: "처형 일격을 *잔혹하게*" },
      intro: { en: "Opening! …and it's a *normal stab*.", ko: "빈틈! …인데 *평범한 찌르기*." },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        ensureArt();
        w.hero = w.actor("hero", { home: 130 }); w.sw = { rot: 0.3 };
        w.foe = w.actor("action-knight", { home: 380, hp: 200 }); w.mark = 0; w.dim = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, k = w.foe;
        w.tween(w.sw, { rot: 0 }, 0.08);
        w.tween(h, { x: 285 }, 0.12, "in", () => {
          const at = { x: 345, y: G - 80 };
          if (k.alive) { k.hp -= 60; k.ox += 6; w.emit("stab", at); if (k.hp <= 0) w.kill(k); }
          w.after(0.35, () => w.tween(h, { x: h.home }, 0.35, "inout", () => { w.busy = false; }));
          w.after(0.3, () => w.tween(w.sw, { rot: 0.3 }, 0.3));
        });
      },
      update(w, dt) {
        const k = w.foe;
        if (k.alive && !k.flying) { k.rot = -0.28; k.sy = Math.min(k.sy, 0.9); }
        w.dim = Math.max(0, w.dim - dt * 1.5);
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
        veil(ctx, "0,0,0", w.dim * 0.6);
      },
      drawFront(w, ctx) {
        drawSword(ctx, w.hero, w.sw);
        const k = w.foe;
        if (w.mark > 0 && k.alive) {
          const y = k.gy - k.h - 52, s = 12 + Math.sin(w.time * 10) * 2;
          ctx.globalCompositeOperation = "lighter"; glow(ctx, k.x, y, 34, "248,113,113", 0.7); ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#fee2e2"; ctx.beginPath(); ctx.moveTo(k.x, y - s); ctx.lineTo(k.x + s, y); ctx.lineTo(k.x, y + s); ctx.lineTo(k.x - s, y); ctx.closePath(); ctx.fill();
        }
      },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "mark", name: { en: "Opening Marker", ko: "빈틈 표시" }, param: "pulsing diamond",
          cap: { en: "Show the opening: a *pulsing mark* on the enemy.", ko: "빈틈이 보이게 *깜빡이는 표시*." },
          update(w) { w.mark = 1; },
        },
        {
          id: "pause", name: { en: "Long Freeze", ko: "긴 멈춤" }, param: "stop 250ms",
          cap: { en: "Hold the stab for a *quarter second*. Savor it.", ko: "찌른 채로 *0.25초*. 음미하게." },
          stab(w) { w.hitstop(0.25); w.foe.flash = 1.2; w.foe.vib = 6; },
        },
        {
          id: "pierce", name: { en: "Pierce Line", ko: "꿰뚫는 선" }, param: "slash 180px",
          cap: { en: "Draw the blade going *all the way through*.", ko: "칼날이 *끝까지 뚫고* 나가게 그려요." },
          stab(w, at) {
            w.spawn({ type: "slash", x: at.x + 30, y: at.y, ang: 0, len: 90, size: 9, life: 0.35, color: "255,255,255" });
            w.spawn({ type: "star", x: at.x + 80, y: at.y, size: 40, life: 0.2, color: "255,240,240" });
          },
        },
        {
          id: "spray", name: { en: "Crimson Spray", ko: "붉은 분출" }, param: "26 sparks forward",
          cap: { en: "Spray *crimson* out the far side.", ko: "반대편으로 *붉게* 뿜어져요." },
          stab(w, at) {
            sparks(w, at.x + 60, at.y, 26, "239,68,68", [200, 700], -0.6, 0.6);
            w.spawn({ type: "glow", x: at.x + 40, y: at.y, size: 80, size1: 20, life: 0.3, color: "220,38,38" });
          },
        },
        {
          id: "dim", name: { en: "Spotlight", ko: "주변 어둡게" }, param: "bg black .6",
          cap: { en: "*Darken* everything else. Only this matters.", ko: "나머지는 *어둡게*. 지금은 이것만." },
          stab(w) { w.dim = 1; },
        },
        {
          id: "number", name: { en: "Crit Number", ko: "치명타 숫자" }, param: "46px · gold",
          cap: { en: "A *huge* gold number. It's a crit, show it.", ko: "*큼직한* 금색 숫자. 치명타니까." },
          stab(w, at) { w.spawn({ type: "text", text: "480!", x: at.x + 10, y: at.y - 80, vy: -240, g: 600, life: 1, size: 46, color: "#fde047" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crit thud + ring",
          cap: { en: "A heavy *thunk* with a ringing tail.", ko: "묵직한 *푹*, 뒤에 울림." },
          stab(w) { w.sfx.crit(); },
        },
      ],
    },

    /* 4 ─ 스태미나 바 */
    {
      id: "action-stamina", cat: "action", view: "side",
      title: { en: "Make stamina *readable*", ko: "스태미나가 *눈에 들어오게*" },
      intro: { en: "Why can't I swing? *No idea.*", ko: "왜 안 휘둘러지지? *모르겠어요*." },
      interval: 0.42, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 190 }); w.sw = { rot: 0.4 };
        w.foe = w.actor("foe", { home: 380 }); w.foe.maxHp = 0;
        w.st = { v: 100, lag: 100, wait: 0, shake: 0, deny: 0, low: false };
      },
      fire(w) {
        const s = w.st;
        if (s.v < 25) { w.emit("deny", s); return; }
        s.v -= 25; s.wait = 0.55;
        w.emit("spend", s);
        w.sw.rot = -1.6; w.tween(w.sw, { rot: 0.6 }, 0.1, "in", () => { w.foe.ox += 8; w.foe.flash = 0.6; w.tween(w.sw, { rot: 0.4 }, 0.15); });
      },
      update(w, dt) {
        const s = w.st;
        s.wait -= dt; if (s.wait <= 0) s.v = Math.min(100, s.v + 40 * dt);
        if (!w.on("lag")) s.lag = s.v;
        s.shake = Math.max(0, s.shake - dt); s.deny = Math.max(0, s.deny - dt);
      },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      drawHud(w, ctx) {
        const s = w.st, x = 40 + (s.shake > 0 ? rand(-4, 4) : 0), y = 56;
        meter(ctx, x, y, 240, 14, s.v / 100, s.col || "#4ade80", s.lag / 100);
        if (s.deny > 0) { ctx.fillStyle = `rgba(239,68,68,${s.deny * 2})`; ctx.fillRect(x, y, 240, 14); }
        if (s.tip && s.wait <= 0 && s.v < 100) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x + 240 * s.v / 100, y + 7, 18, "190,255,200", 0.9); ctx.globalCompositeOperation = "source-over"; }
        label(ctx, "STAMINA", x, y - 12, 11, "rgba(255,255,255,0.6)", "left", "'JetBrains Mono', monospace", 700);
      },
      steps: [
        {
          id: "lag", name: { en: "Chip Lag", ko: "깎인 자리 남기기" }, param: "yellow, 0.3s delay",
          cap: { en: "Leave the spent chunk *yellow* for a moment.", ko: "쓴 만큼 *노랗게* 잠깐 남겨요." },
          update(w, dt) { const s = w.st; if (s.lag < s.v) s.lag = s.v; else if (s.wait < 0.25) s.lag += (s.v - s.lag) * Math.min(1, dt * 4); },
        },
        {
          id: "color", name: { en: "Color by Level", ko: "양에 따라 색" }, param: "green → orange → red",
          cap: { en: "Running low? The bar *turns red*.", ko: "얼마 안 남으면 바가 *빨개져요*." },
          update(w) { const v = w.st.v; w.st.col = v > 50 ? "#4ade80" : v > 25 ? "#fb923c" : "#ef4444"; },
        },
        {
          id: "deny", name: { en: "Denied Feedback", ko: "안 될 때 알려주기" }, param: "shake + red flash",
          cap: { en: "Not enough? *Shake* the bar and flash it *red*.", ko: "부족하면 바가 *덜컹*, *빨갛게* 번쩍." },
          deny(w, s) { s.shake = 0.25; s.deny = 0.4; pop(w, "✕", 300, 62, 26, "#ef4444", 0.4); },
        },
        {
          id: "flinch", name: { en: "Failed Swing", ko: "헛손질" }, param: "half swing −20%",
          cap: { en: "The body *tries* and fails. A weak half-swing.", ko: "몸이 *해 보려다* 실패. 힘없는 반 동작." },
          deny(w) { w.sw.rot = -0.3; w.tween(w.sw, { rot: 0.5 }, 0.25, "out"); w.hero.sy = 0.92; w.hero.ox -= 6; },
        },
        {
          id: "tired", name: { en: "Out of Breath", ko: "헐떡임" }, param: "sweat drops < 25",
          cap: { en: "Low stamina shows *on the body*. Sweat, slump.", ko: "지친 게 *몸에도* 보여요. 땀, 처진 어깨." },
          update(w, dt) {
            const h = w.hero;
            if (w.st.v >= 25) return;
            h.sy = Math.min(h.sy, 0.95);
            if (Math.random() < dt * 8) w.spawn({ type: "circle", x: h.x + rand(-10, 20), y: G - h.h + 10, vx: rand(-60, 60), vy: -120, g: 600, life: 0.5, size: 3, color: "147,197,253" });
          },
        },
        {
          id: "tip", name: { en: "Refill Glow", ko: "차오르는 빛" }, param: "glow at bar edge",
          cap: { en: "A *glow* rides the edge while it refills.", ko: "차오르는 동안 끝에 *빛*이 붙어요." },
          update(w) { w.st.tip = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish / dull buzz",
          cap: { en: "A *swish* when it works, a dull *buzz* when it doesn't.", ko: "되면 *쉭*, 안 되면 둔한 *부웅*." },
          spend(w) { w.sfx.slash(); },
          deny(w) { w.play(() => tn({ type: "square", f: 110, f2: 90, dur: 0.15, vol: 0.18 })); },
        },
      ],
    },

    /* 5 ─ 모아 베기 */
    {
      id: "action-charged-heavy", cat: "action", view: "side",
      title: { en: "Show the *charge* on a heavy attack", ko: "강공격 *모으는 맛*" },
      intro: { en: "Holding the button… is it *doing anything?*", ko: "버튼 누르는 중… *모이고 있는 거야?*" },
      interval: 2.2, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 140 }); w.sw = { rot: 0.4, glowA: 0, glowC: "255,190,80" };
        w.foe = w.actor("foe", { home: 410 }); w.ch = { on: false, t: 0, tier: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, ch = w.ch;
        w.tween(w.sw, { rot: -2.3 }, 0.15, "out");
        Object.assign(ch, { on: true, t: 0, tier: 0 });
        [1, 2, 3].forEach(n => w.after(n * 0.25, () => { ch.tier = n; w.emit("tier", n, tipOf(h, w.sw)); }));
        w.after(0.8, () => {
          ch.on = false;
          w.tween(h, { x: 300 }, 0.08, "in");
          w.tween(w.sw, { rot: 0.9 }, 0.08, "in", () => {
            const f = w.foe, at = { x: f.x - 40, y: G - 70 };
            if (f.alive) { f.hp -= 30 * ch.tier; f.ox += 10; w.emit("hit", at, ch.tier); if (f.hp <= 0) w.kill(f); }
            w.after(0.2, () => { w.tween(h, { x: h.home }, 0.25, "inout", () => { w.busy = false; }); w.tween(w.sw, { rot: 0.4 }, 0.25); });
          });
        });
      },
      update(w, dt) { if (w.ch.on) w.ch.t += dt; w.sw.glowA = Math.max(0, w.sw.glowA - dt * 3); },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "glow", name: { en: "Blade Glow", ko: "칼날 빛" }, param: "grows with time",
          cap: { en: "The blade *glows brighter* the longer you hold.", ko: "오래 누를수록 칼날이 *더 밝게*." },
          update(w) { if (w.ch.on) w.sw.glowA = Math.min(1, w.ch.t); },
        },
        {
          id: "tiers", name: { en: "Tier Pings", ko: "단계 신호" }, param: "3 tiers · ring",
          cap: { en: "Mark each *level* with a ring and a flash.", ko: "*단계*마다 고리와 번쩍." },
          tier(w, n, p) {
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 8, size1: 40 + n * 22, life: 0.3, w: 6, color: ["", "253,224,71", "251,146,60", "248,113,113"][n] });
            w.hero.flash = 0.7; pop(w, "Lv" + n, p.x - 40, p.y - 10 - n * 16, 18, "#fde047", 0.28);
          },
        },
        {
          id: "suck", name: { en: "Gather", ko: "빨아들이기" }, param: "sparks seek tip",
          cap: { en: "Pull *sparks in* toward the blade.", ko: "칼끝으로 *불씨가 빨려 와요*." },
          update(w, dt) {
            if (!w.ch.on || Math.random() > dt * 40) return;
            const p = tipOf(w.hero, w.sw), a = rand(0, TAU), d = rand(50, 90);
            w.spawn({ type: "spark", seek: true, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, tx: p.x, ty: p.y, life: 0.25, size: 2.5, color: "255,210,120" });
          },
        },
        {
          id: "tremble", name: { en: "Tremble", ko: "부들부들" }, param: "vib 1 → 4px",
          cap: { en: "The body *trembles* with power.", ko: "힘이 차서 몸이 *부들부들*." },
          update(w) { if (w.ch.on) w.hero.vib = Math.max(w.hero.vib, 1 + w.ch.t * 3); },
        },
        {
          id: "release", name: { en: "Scaled Impact", ko: "단계만큼 세게" }, param: "stop 60ms × tier",
          cap: { en: "Higher tier, *longer freeze*, *bigger arc*.", ko: "단계가 높을수록 *더 오래 멈추고*, *더 크게*." },
          hit(w, at, n) {
            w.hitstop(0.06 * n); w.foe.flash = 1.2;
            w.spawn({ type: "arc", x: at.x - 40, y: at.y - 20, size: 70 + n * 18, life: 0.2, a0: -1.8, a1: 1.2, color: "255,220,140" });
          },
          kill(w, f) { w.fly(f, 640, -700, 12); },
        },
        {
          id: "shake", name: { en: "Shake", ko: "흔들림" }, param: "trauma .2 × tier",
          cap: { en: "Shake grows with the *charge level*.", ko: "흔들림도 *단계*만큼." },
          hit(w, at, n) { w.shake(0.2 * n, 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising chime / crit",
          cap: { en: "Each tier chimes *higher*. Release with a *crack*.", ko: "단계마다 *한 음씩 높게*. 놓을 때 *쾅*." },
          tier(w, n) { w.sfx.chime(n * 4); },
          hit(w) { w.sfx.crit(); },
        },
      ],
    },

    /* 6 ─ 1-2-3 콤보 */
    {
      id: "action-combo-chain", cat: "action", view: "side",
      title: { en: "Make a combo *build up*", ko: "콤보가 *쌓이는 맛*" },
      intro: { en: "Hit, hit, hit. All *exactly the same*.", ko: "퍽, 퍽, 퍽. *다 똑같아요*." },
      interval: 0.5, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("hero", { home: 170 }); w.sw = { rot: 0.4 };
        w.foe = w.actor("foe", { home: 370, hp: 999 }); w.foe.maxHp = 0;
        w.ci = 0; w.cnt = { n: 0, bump: 0 };
      },
      fire(w) {
        const n = w.ci = (w.ci % 3) + 1, from = [-1.7, 0.8, -0.1][n - 1], to = [0.8, -1.7, 0][n - 1];
        w.sw.rot = from;
        w.emit("swing", n);
        w.tween(w.sw, { rot: to }, 0.08, "in", () => {
          const f = w.foe; f.ox += 6;
          w.emit("hit", { x: f.x - 50, y: G - 80 }, n);
          w.tween(w.sw, { rot: 0.4 }, 0.2);
        });
      },
      update(w, dt) { w.cnt.bump = Math.max(0, w.cnt.bump - dt * 5); },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      drawHud(w, ctx) {
        const c = w.cnt; if (!c.n) return;
        ctx.save(); ctx.translate(430, 80); ctx.scale(1 + c.bump * 0.5, 1 + c.bump * 0.5);
        label(ctx, String(c.n), 0, 0, 44, c.n === 3 ? "#fde047" : "#fff");
        label(ctx, "HIT", 0, 30, 14, "rgba(255,255,255,0.7)", "center", "'JetBrains Mono', monospace", 700);
        ctx.restore();
      },
      steps: [
        {
          id: "arcs", name: { en: "Distinct Arcs", ko: "다른 궤적" }, param: "down / up / thrust",
          cap: { en: "Each hit gets its *own shape*: down, up, thrust.", ko: "타마다 *모양이 달라요*. 내려, 올려, 찔러." },
          hit(w, at, n) {
            if (n === 3) w.spawn({ type: "slash", x: at.x, y: at.y, ang: 0, len: 80, size: 12, life: 0.4, color: "255,255,255" });
            else w.spawn({ type: "arc", x: at.x - 30, y: at.y, size: 64, life: 0.4, a0: n === 1 ? -1.8 : -0.9, a1: n === 1 ? 0.9 : 1.6, color: "255,255,255" });
          },
        },
        {
          id: "step", name: { en: "Step In", ko: "앞으로 한 걸음" }, param: "+22px per hit",
          cap: { en: "*Step forward* on every hit. You're pushing in.", ko: "칠 때마다 *한 걸음 앞으로*. 밀고 들어가요." },
          swing(w, n) { w.hero.ox += 10 + n * 6; },
        },
        {
          id: "counter", name: { en: "Hit Counter", ko: "타수 표시" }, param: "bump ×1.5",
          cap: { en: "*Count the hits* and bump the number.", ko: "*몇 타째인지* 세고, 숫자를 *톡*." },
          hit(w, at, n) { w.cnt.n = n; w.cnt.bump = 1; },
        },
        {
          id: "escalate", name: { en: "Escalating Stop", ko: "점점 길게 멈춤" }, param: "40 / 60 / 140ms",
          cap: { en: "Freeze *longer* each hit. The last one *lands*.", ko: "갈수록 *더 오래* 멈춰요. 마지막이 *박혀요*." },
          hit(w, at, n) { w.hitstop([0.04, 0.06, 0.14][n - 1]); w.foe.flash = 1; w.foe.vib = 3 * n; },
        },
        {
          id: "finisher", name: { en: "Finisher Blast", ko: "마무리 한 방" }, param: "3rd: flash + push 90",
          cap: { en: "Hit 3 is *special*: flash, zoom, send it *flying back*.", ko: "3타는 *특별하게*. 번쩍, 줌, *멀리* 밀기." },
          hit(w, at, n) {
            if (n < 3) return;
            w.flash("255,255,255", 0.35); w.zoomPunch(0.08); w.shake(0.4, 1);
            const f = w.foe; f.ox += 90; f.k = 3; f.sx = 0.8; f.sy = 1.15;
            sparks(w, at.x, at.y, 18, "255,230,160", [300, 800], -0.7, 0.7);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "+3 semitones per hit",
          cap: { en: "Pitch goes *up* with each hit.", ko: "칠수록 *음이 올라가요*." },
          hit(w, at, n) { w.play(() => { nz({ dur: 0.09, type: "bandpass", f: 3000 + n * 800, f2: 900, q: 1.6, vol: 0.45 }); tn({ f: 160 * Math.pow(2, n * 3 / 12), f2: 50, dur: 0.12, vol: 0.5 }); }); },
        },
      ],
    },

    /* 7 ─ 띄우기 */
    {
      id: "action-launcher", cat: "action", view: "side",
      title: { en: "Make a launcher send them *sky-high*", ko: "띄우기 공격을 *하늘 높이*" },
      intro: { en: "Launched? It just *hopped*.", ko: "띄운 거야? *깡충* 뛴 것 같아요." },
      interval: 1.7, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 190 }); w.sw = { rot: 0.7 };
        w.foe = w.actor("foe", { home: 330 }); w.foe.maxHp = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, h = w.hero;
        w.tween(w.sw, { rot: -1.9 }, 0.1, "in", () => {
          const at = { x: f.x - 30, y: G - 60 };
          f.flash = 0.8;
          w.emit("launch", at);
          const top = w.on("hang") ? -190 : -60, up = w.on("hang") ? 0.32 : 0.16, hang = w.on("hang") ? 0.45 : 0;
          w.tween(f, { oy: top }, up, "out", () => w.after(hang, () => w.tween(f, { oy: 0 }, 0.22, "in", () => {
            w.emit("land", f);
            w.after(0.3, () => { w.busy = false; });
          })));
          w.after(0.4, () => w.tween(w.sw, { rot: 0.7 }, 0.3));
        });
        w.after(1.25, () => w.tween(h, { oy: 0 }, 0.2, "in"));
      },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      steps: [
        {
          id: "arc", name: { en: "Rising Arc", ko: "올려 베기 궤적" }, param: "arc + vertical slash",
          cap: { en: "Draw the swing going *up*. Direction = intent.", ko: "궤적이 *위로* 향하게. 방향이 곧 의도." },
          launch(w, at) {
            w.spawn({ type: "arc", x: at.x - 40, y: at.y - 10, size: 70, life: 0.3, a0: 0.9, a1: -1.6, color: "255,255,255" });
            w.spawn({ type: "slash", x: at.x + 10, y: at.y - 70, ang: -Math.PI / 2, len: 80, size: 8, life: 0.3, color: "255,240,200" });
          },
        },
        {
          id: "hang", name: { en: "Hang Time", ko: "공중에 머물기" }, param: "190px · hang 450ms",
          cap: { en: "Launch *high* and let it *hang*. Room to juggle.", ko: "*높이* 띄우고 *잠깐 떠 있게*. 이어 칠 틈." },
          launch(w) { w.foe.rot = 0.6; },
          land(w, f) { f.rot = 0; },
        },
        {
          id: "streak", name: { en: "Rise Streaks", ko: "상승 속도선" }, param: "lines while rising",
          cap: { en: "*Speed lines* shoot down past it as it rises.", ko: "올라가는 동안 *속도선*이 아래로." },
          launch(w, at) {
            for (let i = 0; i < 12; i++) w.after(i * 0.025, () => w.spawn({ type: "spark", x: w.foe.x + rand(-40, 40), y: G + w.foe.oy - rand(0, 100), vx: 0, vy: 900, life: 0.16, size: 2.4, color: "255,255,255" }));
          },
        },
        {
          id: "dust", name: { en: "Ground Burst", ko: "바닥 폭발" }, param: "ring + dust",
          cap: { en: "The *ground bursts* where it left.", ko: "떠난 자리에 *먼지가 펑*." },
          launch(w) { const f = w.foe; w.spawn({ type: "ring", flat: true, x: f.x, y: G, size: 10, size1: 90, life: 0.35, w: 6, color: "255,255,255" }); dust(w, f.x, G, 10); },
          land(w, f) { dust(w, f.x, G, 6); },
        },
        {
          id: "chase", name: { en: "Jump After", ko: "따라 뛰기" }, param: "hero −120px",
          cap: { en: "The hero *jumps after it*. The fight goes airborne.", ko: "주인공도 *따라 뛰어요*. 싸움이 공중으로." },
          launch(w) { const h = w.hero; h.sx = 0.8; h.sy = 1.25; w.after(0.08, () => w.tween(h, { oy: -120 }, 0.3, "out")); },
        },
        {
          id: "follow", name: { en: "Camera Follow", ko: "카메라 따라가기" }, param: "cam.y = 35% of height",
          cap: { en: "Tilt the camera *up* with it.", ko: "카메라도 *같이 올라가요*." },
          update(w) { w.cam.ty = w.foe.oy * 0.35; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising whoosh",
          cap: { en: "A *rising whoosh*. Pitch goes up with it.", ko: "*올라가는* 휘익. 음도 같이 올라가요." },
          launch(w) { w.sfx.hit(); w.play(() => nz({ dur: 0.35, type: "bandpass", f: 500, f2: 3500, q: 2, vol: 0.4 })); },
          land(w) { w.sfx.land(); },
        },
      ],
    },

    /* 8 ─ 내려찍기 */
    {
      id: "action-plunge", cat: "action", view: "side",
      title: { en: "Make a plunging attack *crash*", ko: "내려찍기를 *쿠웅*" },
      intro: { en: "Fell from the sky. Landed like a *feather*.", ko: "하늘에서 떨어졌는데 *깃털*처럼 내려앉아요." },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 270 }); w.sw = { rot: Math.PI / 2 };
        w.foes = [150, 400].map(x => { const f = w.actor("foe", { home: x, h: 90 }); f.maxHp = 0; return f; });
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero;
        w.tween(h, { oy: -230 }, 0.18, "out", () => w.after(w.on("hang") ? 0.1 : 0, () => {
          w.emit("dive", h);
          w.tween(h, { oy: 0 }, 0.12, "in", () => {
            w.emit("impact", { x: h.x, y: G });
            w.after(0.5, () => { w.busy = false; });
          });
        }));
      },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      steps: [
        {
          id: "hang", name: { en: "Apex Pause", ko: "꼭대기 멈춤" }, param: "100ms + tuck",
          cap: { en: "*Pause* at the top. Then drop like a rock.", ko: "꼭대기에서 *멈칫*. 그리고 돌처럼 뚝." },
          dive(w, h) { h.sx = 1.2; h.sy = 0.8; h.flash = 0.6; },
        },
        {
          id: "stretch", name: { en: "Fall Stretch", ko: "떨어지며 늘어남" }, param: "1.3 × 0.75 + lines",
          cap: { en: "*Stretch* on the way down, lines streaking *up*.", ko: "떨어질 때 *길쭉하게*, 선은 *위로*." },
          dive(w, h) {
            h.sx = 0.75; h.sy = 1.3;
            for (let i = 0; i < 8; i++) w.after(i * 0.015, () => w.spawn({ type: "spark", x: h.x + rand(-30, 30), y: G + h.oy - rand(0, 120), vx: 0, vy: -900, life: 0.18, size: 2.4, color: "255,255,255" }));
          },
        },
        {
          id: "flash", name: { en: "Impact Flash", ko: "충돌 섬광" }, param: "star + light pillar",
          cap: { en: "A *star* and a *pillar of light* on contact.", ko: "닿는 순간 *별 섬광*과 *빛 기둥*." },
          impact(w, at) {
            w.spawn({ type: "star", x: at.x + 30, y: at.y - 10, size: 80, life: 0.25, color: "255,255,255" });
            w.spawn({ type: "beam", x: at.x + 30, y: at.y, size: 40, h: 320, life: 0.35, color: "255,240,200" });
          },
        },
        {
          id: "wave", name: { en: "Shockwave", ko: "충격파" }, param: "ring 220 · bounce foes",
          cap: { en: "A wave rolls out and *bounces* nearby enemies.", ko: "충격파가 퍼지며 주변 적이 *들썩*." },
          impact(w, at) {
            w.spawn({ type: "ring", flat: true, x: at.x + 30, y: G, size: 10, size1: 220, life: 0.45, w: 10, color: "255,240,210" });
            for (const f of w.foes) { f.flash = 1; f.sx = 1.2; f.sy = 0.8; w.tween(f, { oy: -45 }, 0.14, "out", () => w.tween(f, { oy: 0 }, 0.2, "in")); }
          },
        },
        {
          id: "crater", name: { en: "Crater", ko: "패인 자국" }, param: "decal 5s + cracks",
          cap: { en: "Leave a *crater*. Make the ground remember.", ko: "*움푹 팬 자국*을 남겨요." },
          impact(w, at) {
            w.spawn({ type: "ellipse", under: true, x: at.x + 30, y: G + 2, size: 70, life: 5, color: "0,0,0", alpha: 0.7, hold: true, add: false });
            for (const d of [-1, 1]) w.spawn({ type: "crack", under: true, x: at.x + 30, y: G + 1, pts: [[0, 0], [d * 30, 3], [d * 55, -2], [d * 85, 4]], w: 2.5, life: 5, color: "0,0,0", hold: true, add: false });
            for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: at.x + 30, y: G - 4, vx: rand(-350, 350), vy: rand(-700, -300), g: 1700, ground: true, bounce: 0.3, vr: rand(-20, 20), life: rand(1.2, 2), size: rand(4, 8), color: "130,124,118", hold: true });
          },
        },
        {
          id: "shake", name: { en: "Downward Kick", ko: "아래로 쿵" }, param: "kick 16px + stop 80ms",
          cap: { en: "Kick the screen *down*. Freeze a beat.", ko: "화면을 *아래로* 쿵, 잠깐 멈춤." },
          impact(w) { w.kick(0, 16); w.shake(0.5); w.hitstop(0.08); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whistle → slam",
          cap: { en: "A falling *whistle*, then a *slam*.", ko: "떨어지는 *휘이*, 그리고 *쾅*." },
          dive(w) { w.play(() => tn({ f: 1400, f2: 500, dur: 0.14, vol: 0.12 })); },
          impact(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 9 ─ 락온 */
    {
      id: "action-lockon", cat: "action", view: "top",
      title: { en: "Make lock-on *snap*", ko: "락온이 *착* 붙게" },
      intro: { en: "Which one am I *locked onto?*", ko: "지금 *누구를* 잡은 거죠?" },
      interval: 0.9, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("heroTop", { home: 150, gy: 190 });
        w.foes = [[380, 90], [440, 200], [350, 290]].map(([x, y]) => w.actor("foeTop", { home: x, gy: y }));
        w.ti = 0; w.ret = { x: 380, y: 90, sc: 1, spin: 0, show: false };
      },
      fire(w) {
        w.ti = (w.ti + 1) % 3;
        const t = w.foes[w.ti];
        w.emit("lock", t, w.ret);
      },
      update(w, dt) {
        const t = w.foes[w.ti], r = w.ret, h = w.hero;
        if (!w.on("glide")) { r.x = t.x; r.y = t.gy; }
        r.sc += (1 - r.sc) * Math.min(1, dt * 14); r.spin += dt * 2;
        h.rot = Math.atan2(r.y - h.gy, r.x - h.x);
        w.foes.forEach((f, i) => { f.oy = Math.sin(w.time * 2 + i * 2) * 6; });
      },
      drawFloor(w, ctx) { ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; ctx.strokeRect(14, 40, 512, 290); },
      drawFront(w, ctx) {
        const r = w.ret, t = w.foes[w.ti], y = r.y + t.oy;
        if (r.tether) {
          ctx.setLineDash([8, 8]); ctx.lineDashOffset = -w.time * 40; ctx.strokeStyle = "rgba(198,244,50,0.6)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(w.hero.x, w.hero.gy); ctx.lineTo(r.x, y); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, y, 6, 0, TAU); ctx.stroke();
        if (r.brackets) {
          const s = 44 * r.sc, L = 14;
          ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 4;
          for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
            ctx.beginPath(); ctx.moveTo(r.x + dx * s, y + dy * (s - L)); ctx.lineTo(r.x + dx * s, y + dy * s); ctx.lineTo(r.x + dx * (s - L), y + dy * s); ctx.stroke();
          }
        }
        if (r.ring) {
          ctx.save(); ctx.translate(r.x, y); ctx.rotate(r.spin); ctx.setLineDash([10, 9]);
          ctx.strokeStyle = "rgba(198,244,50,0.75)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 58 * r.sc, 0, TAU); ctx.stroke();
          ctx.restore(); ctx.setLineDash([]);
        }
      },
      steps: [
        {
          id: "brackets", name: { en: "Snap Brackets", ko: "조여드는 괄호" }, param: "scale 2 → 1",
          cap: { en: "Brackets start *big* and *clamp in*.", ko: "괄호가 *크게* 나타나서 *착* 조여요." },
          lock(w, t, r) { r.brackets = true; r.sc = 2; },
        },
        {
          id: "glide", name: { en: "Glide Over", ko: "미끄러지듯 이동" }, param: "lerp 12/s",
          cap: { en: "Don't teleport. *Glide* to the next target.", ko: "순간이동 말고 *스르륵* 넘어가요." },
          update(w, dt) { const r = w.ret, t = w.foes[w.ti], k = Math.min(1, dt * 12); r.x += (t.x - r.x) * k; r.y += (t.gy - r.y) * k; },
        },
        {
          id: "ring", name: { en: "Spinning Ring", ko: "도는 고리" }, param: "dashed · 2 rad/s",
          cap: { en: "A slow *spinning ring*. It feels *alive*.", ko: "천천히 *도는 고리*. 살아 있는 느낌." },
          lock(w, t, r) { r.ring = true; },
        },
        {
          id: "tether", name: { en: "Tether Line", ko: "연결선" }, param: "dashed, flowing",
          cap: { en: "A *flowing line* from you to the target.", ko: "나와 표적을 *흐르는 선*으로 이어요." },
          lock(w, t, r) { r.tether = true; },
        },
        {
          id: "dim", name: { en: "Dim the Rest", ko: "나머지는 흐리게" }, param: "others α .35",
          cap: { en: "*Fade* everyone else. One target, one focus.", ko: "나머지는 *흐리게*. 하나만 보게." },
          update(w) { w.foes.forEach((f, i) => { f.alpha = i === w.ti ? 1 : 0.35; }); },
          lock(w, t) { t.flash = 0.8; },
        },
        {
          id: "cam", name: { en: "Frame Both", ko: "둘 다 화면에" }, param: "cam → midpoint 40%",
          cap: { en: "Shift the camera to *frame you both*.", ko: "카메라가 *둘 사이*로 옮겨 가요." },
          update(w) { const r = w.ret, h = w.hero; w.cam.tx = ((h.x + r.x) / 2 - 270) * 0.4; w.cam.ty = ((h.gy + r.y) / 2 - 180) * 0.4; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "click + tock",
          cap: { en: "A crisp *click* on each lock.", ko: "잡을 때마다 또렷한 *딸깍*." },
          lock(w) { w.sfx.clickDown(); w.sfx.tock(); },
        },
      ],
    },

    /* 10 ─ 백스탭 */
    {
      id: "action-backstab", cat: "action", view: "side",
      title: { en: "Make a backstab feel *sneaky*", ko: "등 찌르기를 *은밀하게*" },
      intro: { en: "Snuck up behind it. Felt like a *regular hit*.", ko: "뒤로 몰래 갔는데 *그냥 공격* 같아요." },
      interval: 1.8, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 110 }); w.sw = { rot: 0.5 };
        w.foe = w.actor("foe", { home: 370, flip: true }); w.foe.maxHp = 0;
        w.sneak = false; w.spot = false;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        w.sneak = true;
        w.tween(h, { x: 268 }, 0.24, "inout", () => {
          w.sneak = false;
          w.sw.rot = 0.05;
          const at = { x: f.x - 40, y: G - 70 };
          f.ox -= 6;
          w.emit("stab", at, f);
          f.alpha = 0;
          w.emit("down", f);
          w.after(1.0, () => w.respawn(f));
          w.after(0.6, () => { w.tween(h, { x: h.home }, 0.4, "inout", () => { w.busy = false; }); w.tween(w.sw, { rot: 0.5 }, 0.3); });
        });
      },
      drawBack(w, ctx) {
        const f = w.foe;
        if (!w.spot || !f.alive || f.alpha < 1) return;
        const a = 0.55 + 0.35 * Math.sin(w.time * 8);
        ctx.globalCompositeOperation = "lighter"; glow(ctx, f.x - 40, G - 75, 46, "250,204,21", a); ctx.globalCompositeOperation = "source-over";
      },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      steps: [
        {
          id: "spot", name: { en: "Weak Spot Glow", ko: "약점 빛" }, param: "pulsing back glow",
          cap: { en: "Make the *back* glow. Show where to strike.", ko: "*등*을 빛나게. 어디를 노릴지 보여줘요." },
          update(w) { w.spot = true; },
        },
        {
          id: "sneak", name: { en: "Crouch", ko: "몸 낮추기" }, param: "sy .82 · dim",
          cap: { en: "*Crouch* and go dim while sneaking.", ko: "다가갈 땐 *낮고 어둡게*." },
          update(w) { const h = w.hero; h.sy = w.sneak ? Math.min(h.sy, 0.82) : h.sy; h.alpha = w.sneak ? 0.55 : 1; },
        },
        {
          id: "freeze", name: { en: "Long Freeze", ko: "긴 멈춤" }, param: "stop 220ms",
          cap: { en: "Freeze on the stab. *Let it sink in.*", ko: "찌른 순간 멈춰요. *깊이 박히게*." },
          stab(w, at, f) { w.hitstop(0.22); f.flash = 1.2; f.vib = 6; },
        },
        {
          id: "lift", name: { en: "Lift & Spray", ko: "들어 올리기" }, param: "foe −30px + sparks",
          cap: { en: "The stab *lifts* the enemy. Sparks burst out the front.", ko: "찌르면 적이 *들려요*. 앞으로 불꽃." },
          stab(w, at, f) { f.oy = -30; f.sx = 0.85; f.sy = 1.15; sparks(w, at.x + 50, at.y, 18, "251,113,133", [200, 600], -0.5, 0.5); },
        },
        {
          id: "crumple", name: { en: "Crumple", ko: "푹 쓰러짐" }, param: "tip over 350ms",
          cap: { en: "Don't vanish. *Tip over* and fall.", ko: "사라지지 말고 *푹 쓰러져요*." },
          down(w, f) { f.alpha = 1; w.tween(f, { rot: 1.4, oy: 0 }, 0.35, "in", () => dust(w, f.x + 50, G, 6)); w.after(0.75, () => w.tween(f, { alpha: 0 }, 0.2)); },
        },
        {
          id: "label", name: { en: "Bonus Label", ko: "보너스 글자" }, param: "BACKSTAB ×3",
          cap: { en: "Name it and show the *bonus*.", ko: "이름 붙이고 *보너스*를 보여줘요." },
          stab(w, at) { pop(w, "BACKSTAB", at.x, at.y - 100, 28, "#facc15", 1.1); pop(w, "×3", at.x, at.y - 68, 24, "#fff", 1.1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "wet thunk + thud",
          cap: { en: "A quiet *shk*, then a body *thud*.", ko: "조용한 *슥*, 쓰러지는 *털썩*." },
          stab(w) { w.sfx.slashHit(); },
          down(w) { w.sfx.thud(); },
        },
      ],
    },

    /* 11 ─ 위험 공격 예고 */
    {
      id: "action-telegraph", cat: "action", view: "side",
      title: { en: "Warn before an *unblockable*", ko: "막을 수 없는 공격은 *미리 경고*" },
      intro: { en: "Unblockable! …nobody *told me*.", ko: "막기 불가! …*말을 해줘야죠*." },
      interval: 2.0, stepDur: 4.0,
      setup(w) {
        ensureArt();
        w.hero = w.actor("hero", { home: 120 });
        w.foe = w.actor("action-boss", { home: 420 }); w.bs = { rot: -1.0, col: "#c4b5fd" };
        w.warn = 0; w.zone = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const b = w.foe;
        w.tween(w.bs, { rot: -2.5 }, 0.3, "out");
        w.tween(b, { ox: 22 }, 0.3, "out");
        w.after(0.12, () => w.emit("warn", tipOf(b, w.bs, 150)));
        w.after(0.7, () => {
          w.warn = 0;
          w.tween(w.bs, { rot: 1.0 }, 0.1, "in", () => {
            w.emit("slam", { x: 280, y: G });
            dust(w, 280, G, 6);
            w.after(0.3, () => { w.tween(w.bs, { rot: -1.0 }, 0.35, "inout", () => { w.busy = false; }); });
          });
        });
      },
      update(w, dt) { w.warn = Math.max(0, w.warn - dt); w.zone = Math.max(0, w.zone - dt); },
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
        if (w.zone > 0) {
          const a = 0.25 + 0.2 * Math.sin(w.time * 22);
          ctx.fillStyle = `rgba(239,68,68,${a})`; ctx.beginPath(); ctx.ellipse(285, G + 4, 105, 18, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(248,113,113,0.9)"; ctx.lineWidth = 2; ctx.stroke();
        }
      },
      drawFront(w, ctx) {
        drawSword(ctx, w.foe, w.bs, 150);
        if (w.warn > 0 && w.sym) {
          const b = w.foe, x = b.x - 90, y = b.gy - b.h + 10, s = 24 + Math.sin(w.time * 20) * 3;
          ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, 50, "239,68,68", 0.8); ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
          label(ctx, "!", x, y + 2, 30, "#fff");
        }
      },
      steps: [
        {
          id: "glint", name: { en: "Weapon Glint", ko: "칼끝 번뜩임" }, param: "red star 400ms",
          cap: { en: "A *red glint* on the weapon. Danger's coming.", ko: "칼끝에 *붉은 번뜩임*. 위험 신호." },
          warn(w, p) {
            w.spawn({ type: "star", x: p.x, y: p.y, size: 60, life: 0.45, color: "255,90,90" });
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 70, size1: 20, life: 0.45, color: "239,68,68" });
          },
        },
        {
          id: "pulse", name: { en: "Body Pulse", ko: "몸이 붉게 맥동" }, param: "red tint 20Hz",
          cap: { en: "The boss *pulses red* while winding up.", ko: "기를 모으는 동안 *붉게 깜빡*." },
          update(w) { if (w.warn > 0) w.foe.tint = 0.4 + 0.4 * Math.sin(w.time * 20); },
        },
        {
          id: "sym", name: { en: "Danger Symbol", ko: "경고 표시" }, param: "red ◆ !",
          cap: { en: "Pop a *symbol* above its head. Readable at a glance.", ko: "머리 위에 *경고 표시*. 한눈에 보여요." },
          warn(w) { w.sym = true; w.warn = 0.58; },
        },
        {
          id: "zone", name: { en: "Danger Zone", ko: "위험 구역" }, param: "floor area 210px",
          cap: { en: "Paint *where* it will land on the floor.", ko: "*어디에* 떨어질지 바닥에 칠해요." },
          warn(w) { w.zone = 0.62; },
        },
        {
          id: "vignette", name: { en: "Red Edges", ko: "붉은 테두리" }, param: "vignette .55",
          cap: { en: "Tint the *edges*. You feel it in your gut.", ko: "*가장자리*를 붉게. 몸이 먼저 느껴요." },
          warn(w) { w.vignette(0.55); },
        },
        {
          id: "impact", name: { en: "Payoff", ko: "보상 한 방" }, param: "shake .6 + ring",
          cap: { en: "Then *make it land* like a threat.", ko: "그리고 *진짜 위협*처럼 내리쳐요." },
          slam(w, at) { w.shake(0.6); w.kick(0, 12); w.spawn({ type: "ring", flat: true, x: at.x, y: G, size: 10, size1: 160, life: 0.4, w: 9, color: "248,113,113" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "high ting → slam",
          cap: { en: "A *sharp ting* to warn, a *slam* to punish.", ko: "날카로운 *팅*으로 경고, *쾅*으로 응징." },
          warn(w) { w.play(() => { tn({ type: "triangle", f: 2200, dur: 0.5, vol: 0.18 }); tn({ type: "triangle", f: 3300, dur: 0.3, vol: 0.08 }); }); },
          slam(w) { w.sfx.slam(); },
        },
      ],
    },

    /* 12 ─ 체간(자세) 붕괴 */
    {
      id: "action-posture", cat: "action", view: "side",
      title: { en: "Make a posture break *shatter*", ko: "자세 무너뜨리기를 *와장창*" },
      intro: { en: "The gauge filled. *Then what?*", ko: "게이지가 다 찼는데… *그래서?*" },
      interval: 0.6, stepDur: 4.0,
      setup(w) {
        ensureArt();
        w.hero = w.actor("hero", { home: 200 }); w.sw = { rot: 0.4 };
        w.foe = w.actor("action-knight", { home: 380 }); w.foe.maxHp = 0;
        w.ps = { v: 0, shown: 0, broken: 0 };
      },
      fire(w) {
        const p = w.ps, k = w.foe;
        if (p.broken > 0) return;
        w.sw.rot = -1.6;
        w.tween(w.sw, { rot: 0.6 }, 0.08, "in", () => {
          const at = { x: k.x - 40, y: G - 90 };
          k.ox += 5; p.v = Math.min(100, p.v + 25);
          w.emit("hit", at);
          if (p.v >= 100) { p.broken = 1.4; w.emit("break", { x: k.x, y: k.gy - k.h - 24 }, k); }
          w.tween(w.sw, { rot: 0.4 }, 0.15);
        });
      },
      update(w, dt) {
        const p = w.ps;
        if (p.broken > 0) { p.broken -= dt; if (p.broken <= 0) { p.v = 0; w.foe.rot = 0; w.foe.oy = 0; } }
        p.shown += (p.v - p.shown) * Math.min(1, dt * 14);
      },
      drawHud(w, ctx) {
        const p = w.ps, k = w.foe, W = 150, x = k.x - W / 2, y = k.gy - k.h - 24;
        if (p.broken > 0 && w.on("shatter")) return;
        const v = p.shown / 100;
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - 3, y - 3, W + 6, 14);
        const col = p.heat ? (v > 0.75 ? "239,68,68" : v > 0.45 ? "251,146,60" : "250,204,21") : "230,230,230";
        if (p.center) { ctx.fillStyle = `rgb(${col})`; ctx.fillRect(x + W / 2 * (1 - v), y, W * v, 8); }
        else { ctx.fillStyle = `rgb(${col})`; ctx.fillRect(x, y, W * v, 8); }
        if (p.glow && v > 0.7) { ctx.globalCompositeOperation = "lighter"; glow(ctx, k.x, y + 4, 70 + Math.sin(w.time * 16) * 10, col, 0.5); ctx.globalCompositeOperation = "source-over"; }
      },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      steps: [
        {
          id: "center", name: { en: "Fill From Center", ko: "가운데서 채우기" }, param: "both ways + heat color",
          cap: { en: "Fill from the *middle out* and *heat up* the color.", ko: "*가운데서 양쪽*으로, 색은 *달아오르게*." },
          hit(w) { w.ps.center = true; w.ps.heat = true; },
        },
        {
          id: "glow", name: { en: "Danger Glow", ko: "임박 빛" }, param: "pulse > 70%",
          cap: { en: "Almost full? The gauge *throbs*.", ko: "거의 다 찼으면 게이지가 *쿵쿵*." },
          hit(w) { w.ps.glow = true; },
        },
        {
          id: "shatter", name: { en: "Gauge Shatters", ko: "게이지가 깨짐" }, param: "16 shards",
          cap: { en: "On break, the gauge *shatters* into pieces.", ko: "무너지는 순간 게이지가 *산산조각*." },
          break(w, p) {
            w.spawn({ type: "star", x: p.x, y: p.y, size: 70, life: 0.25, color: "255,230,150" });
            for (let i = 0; i < 16; i++) w.spawn({ type: "chunk", x: p.x + rand(-70, 70), y: p.y, vx: rand(-300, 300), vy: rand(-450, -100), g: 1400, vr: rand(-20, 20), life: rand(0.6, 1), size: rand(4, 7), color: pick(["250,204,21", "239,68,68", "251,146,60"]) });
          },
        },
        {
          id: "kneel", name: { en: "Kneel", ko: "무릎 꿇기" }, param: "sink 18px · lean",
          cap: { en: "The enemy *drops to a knee*. Open for a finisher.", ko: "적이 *무릎을 꿇어요*. 마무리 기회." },
          break(w, p, k) { k.flash = 1.2; w.tween(k, { rot: -0.35, oy: 18 }, 0.2, "out"); },
        },
        {
          id: "slowmo", name: { en: "Slow-mo + Flash", ko: "슬로 + 번쩍" }, param: "×0.3 · 400ms",
          cap: { en: "Slow down and flash. *This* is the moment.", ko: "느려지고 번쩍. *지금*이 그 순간." },
          break(w) { w.slowmo(0.3, 0.4); w.flash("255,240,200", 0.4); w.shake(0.35); },
        },
        {
          id: "label", name: { en: "Label", ko: "글자" }, param: "BROKEN",
          cap: { en: "Spell it out: *BROKEN*.", ko: "글자로 확실히: *무너짐*." },
          break(w, p) { w.spawn({ type: "text", text: "BROKEN", x: p.x, y: p.y + 10, vy: -15, life: 1.2, size: 32, color: "#facc15" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick → crash",
          cap: { en: "Small *ticks* on hits, a *crash* on break.", ko: "칠 때는 *틱*, 깨질 때는 *와장창*." },
          hit(w) { w.sfx.tick(); w.sfx.thunk(); },
          break(w) { w.sfx.burst(); clang(w, 0.7); },
        },
      ],
    },

    /* 13 ─ 회복 물약 */
    {
      id: "action-flask", cat: "action", view: "side",
      title: { en: "Make healing feel *restorative*", ko: "회복이 *살아나는* 느낌" },
      intro: { en: "HP went up. *That's all?*", ko: "체력이 올랐네요. *그게 다?*" },
      interval: 1.8, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 250, hp: 100 }); w.hero.hp = w.hero.hpLag = 25;
        w.fl = { n: 5, up: 0, show: false, bump: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, fl = w.fl;
        if (h.hp >= 95) { h.hp = h.hpLag = 25; }
        if (fl.n <= 0) fl.n = 5;
        const drink = () => {
          const to = Math.min(100, h.hp + 40);
          fl.n--; w.emit("drink", h, to);
          if (!w.on("fill")) h.hp = to;
          w.after(0.6, () => { fl.show = false; w.busy = false; });
        };
        if (w.on("anim")) { w.emit("raise", fl); w.after(0.3, drink); } else drink();
      },
      update(w, dt) {
        const h = w.hero; w.fl.bump = Math.max(0, w.fl.bump - dt * 4);
        if (h.hpLag > h.hp) h.hpLag = h.hp;
      },
      drawFront(w, ctx) {
        const fl = w.fl; if (!fl.show) return;
        const p = hand(w.hero), k = fl.up;
        ctx.save(); ctx.translate(p.x - 6 * k, p.y - 52 * k); ctx.rotate(-2.2 * k);
        ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.roundRect(-9, -12, 18, 22, 6); ctx.fill();
        ctx.fillStyle = "#e5e7eb"; ctx.fillRect(-4, -20, 8, 9);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(-6, -9, 4, 12);
        ctx.restore();
      },
      drawHud(w, ctx) {
        const h = w.hero, x = h.x - 95, y = h.gy - h.h - 34;
        meter(ctx, x, y, 190, 13, h.hp / 100, "#ef4444", h.hpLag2 != null ? h.hpLag2 / 100 : null, "#bbf7d0");
        const fl = w.fl, s = 1 + fl.bump * 0.6;
        ctx.save(); ctx.translate(70, 300); ctx.scale(s, s);
        if (fl.icon) { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.roundRect(-10, -14, 20, 24, 7); ctx.fill(); ctx.fillStyle = "#e5e7eb"; ctx.fillRect(-4, -22, 8, 9); }
        label(ctx, "×" + fl.n, 16, 0, 22, fl.bump > 0.2 ? "#fde047" : "#fff", "left");
        ctx.restore();
      },
      steps: [
        {
          id: "anim", name: { en: "Drink Motion", ko: "마시는 동작" }, param: "300ms raise",
          cap: { en: "*Show* the drink. Raise it, tip it back.", ko: "마시는 걸 *보여줘요*. 들고, 기울이고." },
          raise(w, fl) { fl.show = true; fl.up = 0; w.tween(fl, { up: 1 }, 0.28, "out"); w.hero.sy = 1.05; },
        },
        {
          id: "fill", name: { en: "Fill Up", ko: "차오르는 바" }, param: "preview + 600ms fill",
          cap: { en: "Show the *target* first, then *fill* into it.", ko: "채울 만큼 *먼저 보여주고*, *스르륵* 채워요." },
          drink(w, h, to) { h.hpLag2 = to; w.tween(h, { hp: to }, 0.6, "out", () => { h.hpLag2 = null; }); },
        },
        {
          id: "glow", name: { en: "Warm Glow", ko: "따뜻한 빛" }, param: "gold glow + ring",
          cap: { en: "Wrap the body in a *warm gold glow*.", ko: "몸을 *따뜻한 금빛*으로 감싸요." },
          drink(w, h) {
            w.spawn({ type: "glow", x: h.x, y: G - 70, size: 40, size1: 110, life: 0.7, color: "250,204,21" });
            w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 20, size1: 90, life: 0.6, w: 5, color: "253,230,138" });
            h.flash = 0.6;
          },
        },
        {
          id: "motes", name: { en: "Rising Motes", ko: "올라가는 빛가루" }, param: "18 motes · 0.9s",
          cap: { en: "Little lights *float up*. Healing goes *up*.", ko: "작은 빛이 *위로* 올라가요. 회복은 위로." },
          drink(w, h) { for (let i = 0; i < 18; i++) w.after(i * 0.03, () => w.spawn({ type: "glow", x: h.x + rand(-45, 45), y: G - rand(0, 40), vy: rand(-160, -90), size: rand(5, 9), size1: 0, life: rand(0.6, 0.9), color: pick(["134,239,172", "253,224,71"]) })); },
        },
        {
          id: "number", name: { en: "Heal Number", ko: "회복 숫자" }, param: "+40 green",
          cap: { en: "A *green* number floats up.", ko: "*초록* 숫자가 떠올라요." },
          drink(w, h, to) { pop(w, "+" + Math.round(to - h.hp), h.x + 60, G - 120, 30, "#4ade80", 1); },
        },
        {
          id: "count", name: { en: "Count Bump", ko: "남은 개수 톡" }, param: "icon + bump",
          cap: { en: "Bump the *flask count*. Every sip is precious.", ko: "남은 *개수*를 톡. 한 모금이 소중해요." },
          drink(w) { w.fl.icon = true; w.fl.bump = 1; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "gulp ×2 + chime",
          cap: { en: "Two *gulps*, then a soft *chime*.", ko: "*꿀꺽 꿀꺽*, 그리고 맑은 *띵*." },
          drink(w) { w.play(() => { tn({ f: 180, f2: 90, dur: 0.07, vol: 0.4 }); tn({ f: 170, f2: 80, dur: 0.07, vol: 0.4, delay: 0.12 }); }); w.sfx.chime(5); },
        },
      ],
    },

    /* 14 ─ 무적 구르기 */
    {
      id: "action-roll", cat: "action", view: "side",
      title: { en: "Show the *i-frames* in a roll", ko: "구르기의 *무적 시간* 보여주기" },
      intro: { en: "It went through me. *Did I get hit?*", ko: "뚫고 지나갔는데… *맞은 거야?*" },
      interval: 1.5, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 150 }); w.rl = { on: false, t: 0, inv: false, passed: false }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, R = w.rl;
        const b = { x: 540, y: G - 70, vx: -820, vy: 0, r: 11, color: "#f87171" };
        b.test = p => { if (!R.passed && R.inv && Math.abs(p.x - h.x) < 30) { R.passed = true; w.emit("pass", p); } return false; };
        w.shoot(b);
        w.after(0.12, () => {
          Object.assign(R, { on: true, t: 0, passed: false });
          w.emit("roll", h);
          w.tween(h, { x: 300 }, 0.38, "out", () => {
            R.on = false; R.inv = false; h.rot = 0;
            w.emit("end", h);
            w.after(0.25, () => w.tween(h, { x: h.home }, 0.3, "inout", () => { w.busy = false; }));
          });
        });
      },
      update(w, dt) { const R = w.rl; if (R.on) { R.t += dt; R.inv = R.t > 0.04 && R.t < 0.3; } },
      drawHud(w, ctx) {
        if (!w.rl.bar) return;
        const x0 = 170, y = 310, n = 12, R = w.rl, cur = R.on ? Math.floor(R.t / 0.38 * n) : -1;
        for (let i = 0; i < n; i++) {
          const inv = i >= 1 && i <= 9;
          ctx.fillStyle = i === cur ? "#fff" : inv ? "rgba(198,244,50,0.75)" : "rgba(255,255,255,0.18)";
          ctx.fillRect(x0 + i * 17, y, 14, 10);
        }
        label(ctx, "I-FRAMES", x0 - 10, y + 5, 10, "rgba(198,244,50,0.9)", "right", "'JetBrains Mono', monospace", 700);
      },
      steps: [
        {
          id: "spin", name: { en: "Tuck & Spin", ko: "몸 말아 돌기" }, param: "360° · sy .7",
          cap: { en: "Tuck in and *spin*. It's a roll, not a slide.", ko: "몸을 말고 *한 바퀴*. 미끄러지는 게 아니에요." },
          roll(w, h) { h.sy = 0.7; h.sx = 1.2; w.tween(h, { rot: TAU }, 0.36, "out"); },
        },
        {
          id: "tint", name: { en: "Invulnerable Tint", ko: "무적 색" }, param: "cyan while inv",
          cap: { en: "Tint the body *cyan* while you can't be hit.", ko: "무적인 동안 몸을 *하늘색*으로." },
          update(w) {
            const h = w.hero;
            if (w.rl.inv) w.spawn({ type: "ghost", img: h.s.cyan, x: h.x, y: G, w: h.w, h: h.h, sx: h.sx, sy: h.sy, life: 0.12, alpha0: 0.7, add: false });
          },
        },
        {
          id: "bar", name: { en: "Frame Strip", ko: "프레임 띠" }, param: "frames 1–9 of 12",
          cap: { en: "Debug view: *which frames* are safe.", ko: "디버그로 *몇 프레임이* 안전한지." },
          roll(w) { w.rl.bar = true; },
        },
        {
          id: "pass", name: { en: "Pass-through Cue", ko: "통과 표시" }, param: "DODGE + split sparks",
          cap: { en: "When it passes through, *say so*.", ko: "뚫고 지나가면 *알려줘요*." },
          pass(w, p) {
            w.spawn({ type: "text", text: "DODGE", x: p.x, y: p.y - 80, vy: -20, life: 1.6, size: 28, color: "#a5f3fc" });
            sparks(w, p.x, p.y, 10, "165,243,252", [150, 400], 2.4, 3.9);
          },
        },
        {
          id: "dust", name: { en: "Dust", ko: "먼지" }, param: "start + end puffs",
          cap: { en: "*Dust* where you push off and where you stop.", ko: "*출발*과 *멈춤*에 먼지." },
          roll(w, h) { dust(w, h.x, G, 6, -1); },
          end(w, h) { dust(w, h.x + 20, G, 6, 1); },
        },
        {
          id: "recover", name: { en: "Recovery Pop", ko: "일어서기" }, param: "stretch 1.2",
          cap: { en: "*Pop up* at the end. Back in control.", ko: "끝에서 *쏙* 일어서요. 다시 조작 가능." },
          end(w, h) { h.sx = 0.85; h.sy = 1.2; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tumble + fwip",
          cap: { en: "A cloth *tumble*, and a *fwip* as it misses.", ko: "구르는 *부스럭*, 빗나가는 *휙*." },
          roll(w) { w.play(() => nz({ dur: 0.3, type: "bandpass", f: 500, f2: 250, q: 1, vol: 0.3 })); },
          pass(w) { w.sfx.swish(); },
        },
      ],
    },

    /* 15 ─ 달리기 먼지 */
    {
      id: "action-sprint", cat: "action", view: "side",
      title: { en: "Make sprinting feel *fast*", ko: "전력 질주가 *빠르게*" },
      intro: { en: "Sprinting. Looks like *sliding on ice*.", ko: "달리는 중인데 *얼음 위를 미끄러져요*." },
      interval: 1.7, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 40, h: 120 }); w.run = false; w.ph = 0; w.hero.alpha = 0; },
      fire(w) {
        const h = w.hero;
        h.x = 40; h.alpha = 1; w.run = true; w.ph = 0;
        w.emit("start", h);
      },
      update(w, dt) {
        const h = w.hero;
        h.oy = 0; h.rot = 0;
        if (!w.run) return;
        h.x += 360 * dt;
        const prev = w.ph; w.ph += dt * 13;
        if (Math.floor(prev / Math.PI) !== Math.floor(w.ph / Math.PI)) w.emit("step", h.x - 10);
        if (h.x > 580) { w.run = false; h.alpha = 0; }
        w.emit("running", h, dt);
      },
      steps: [
        {
          id: "bob", name: { en: "Bounce", ko: "통통 튀기" }, param: "10px per stride",
          cap: { en: "*Bounce* with each stride. Feet hit the ground.", ko: "걸음마다 *통통*. 발이 땅을 밟아요." },
          running(w, h) { h.oy = -Math.abs(Math.sin(w.ph)) * 10; },
          step(w) { w.hero.sx = 1.08; w.hero.sy = 0.92; },
        },
        {
          id: "lean", name: { en: "Lean In", ko: "앞으로 기울기" }, param: "rot 0.2",
          cap: { en: "*Lean forward*. Sprinting means falling forward.", ko: "*앞으로 기울여요*. 달리기는 앞으로 넘어지는 것." },
          running(w, h) { h.rot = 0.2; },
        },
        {
          id: "kick", name: { en: "Foot Puffs", ko: "발밑 먼지" }, param: "3 puffs / step",
          cap: { en: "A *puff* kicks back on every step.", ko: "걸음마다 뒤로 *먼지 한 줌*." },
          step(w, x) { dust(w, x - 10, G, 3, -1); },
        },
        {
          id: "trail", name: { en: "Dust Trail", ko: "먼지 꼬리" }, param: "low cloud · 1.2s",
          cap: { en: "Leave a *low cloud* hanging behind you.", ko: "뒤로 *낮은 먼지 구름*이 남아요." },
          running(w, h, dt) { if (Math.random() < dt * 30) w.spawn({ type: "smoke", x: h.x - 30, y: G - rand(0, 14), vx: rand(-40, 10), vy: rand(-15, 0), drag: 1, size: rand(8, 12), size1: rand(22, 32), life: rand(0.9, 1.3), color: "180,170,155" }); },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "2 / frame",
          cap: { en: "Thin *lines* streak past the body.", ko: "몸 옆으로 가는 *선*이 스쳐요." },
          running(w, h) { for (let i = 0; i < 2; i++) w.spawn({ type: "spark", x: h.x + rand(-20, 60), y: G - rand(10, 120), vx: -1300, vy: 0, life: 0.1, size: 1.6, color: "255,255,255" }); },
        },
        {
          id: "start", name: { en: "Launch Kick", ko: "출발 박차기" }, param: "ring + 8 puffs",
          cap: { en: "*Burst* off the line on the first step.", ko: "첫 발에 *팡* 박차고 나가요." },
          start(w, h) { w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 8, size1: 70, life: 0.3, w: 5, color: "255,255,255" }); dust(w, h.x, G, 8, -1); h.sx = 0.8; h.sy = 1.2; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "footstep ±8% pitch",
          cap: { en: "Quick *footsteps*. Vary the pitch a little.", ko: "빠른 *발소리*. 음높이를 조금씩 다르게." },
          step(w) { w.play(() => { nz({ dur: 0.05, f: rand(600, 760), vol: 0.35 }); tn({ f: rand(110, 130), f2: 60, dur: 0.05, vol: 0.3 }); }); },
        },
      ],
    },

    /* 16 ─ 무기 궤적 */
    {
      id: "action-weapon-trail", cat: "action", view: "side",
      title: { en: "Give a sword swing a *trail*", ko: "칼 휘두르기에 *궤적* 그리기" },
      intro: { en: "The blade moved. Your eye *missed it*.", ko: "칼이 움직였는데 *눈이 못 따라가요*." },
      interval: 1.2, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 220 }); w.sw = { rot: -1.9 }; w.tr = []; w.dir = 1; w.swinging = false; w.fr = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const swing = i => {
          const to = w.dir > 0 ? 1.1 : -1.9;
          w.dir = -w.dir; w.swinging = true; w.tr = [];
          w.emit("swing");
          w.tween(w.sw, { rot: to }, 0.15, "inout", () => {
            w.swinging = false;
            if (i < 3) w.after(0.22, () => swing(i + 1)); else w.busy = false;
          });
        };
        swing(1);
      },
      update(w, dt) {
        for (const s of w.tr) s.age += dt;
        w.tr = w.tr.filter(s => s.age < (w.trLife || 0.4));
        if (!w.swinging) return;
        w.fr++;
        if (w.on("smooth") || w.fr % 3 === 0) w.emit("sample", w.sw.rot);
      },
      drawBack(w, ctx) {
        const T = w.tr, h = w.hero, p = hand(h), life = w.trLife || 0.4;
        for (let i = 1; i < T.length; i++) {
          const a = T[i - 1], b = T[i], k = 1 - b.age / life;
          if (k <= 0) continue;
          const r0 = w.taper ? SWL * (0.3 + 0.55 * (1 - k)) : SWL * 0.3;
          const quad = (rIn, rOut, fill) => {
            const ga = angOf(h, a.rot), gb = angOf(h, b.rot);
            ctx.fillStyle = fill; ctx.beginPath();
            ctx.moveTo(p.x + Math.cos(ga) * rIn, p.y + Math.sin(ga) * rIn); ctx.lineTo(p.x + Math.cos(ga) * rOut, p.y + Math.sin(ga) * rOut);
            ctx.lineTo(p.x + Math.cos(gb) * rOut, p.y + Math.sin(gb) * rOut); ctx.lineTo(p.x + Math.cos(gb) * rIn, p.y + Math.sin(gb) * rIn);
            ctx.closePath(); ctx.fill();
          };
          if (w.color) { quad(r0, SWL * 1.12, `rgba(56,189,248,${0.55 * k})`); quad(Math.max(r0, SWL * 0.7), SWL * 1.02, `rgba(255,255,255,${0.9 * k})`); }
          else quad(r0, SWL, `rgba(200,200,210,${0.5 * k})`);
        }
      },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      steps: [
        {
          id: "ribbon", name: { en: "Ribbon", ko: "리본 궤적" }, param: "sample every 3rd frame",
          cap: { en: "Fill the space the blade *swept through*.", ko: "칼이 *지나간 자리*를 채워요." },
          sample(w, rot) { w.tr.push({ rot, age: 0 }); },
        },
        {
          id: "smooth", name: { en: "Smooth Curve", ko: "부드러운 곡선" }, param: "every frame + 4 sub",
          cap: { en: "Sample *every frame* and fill in between. No corners.", ko: "*매 프레임* 찍고 사이를 메워요. 각이 사라져요." },
          sample(w, rot) {
            const T = w.tr; T.pop();
            const a = T.length ? T[T.length - 1].rot : rot;
            for (let i = 1; i <= 4; i++) T.push({ rot: a + (rot - a) * i / 4, age: 0 });
          },
        },
        {
          id: "color", name: { en: "Hot Core", ko: "밝은 중심" }, param: "white core + blue edge",
          cap: { en: "*White* at the edge of the blade, *color* outside.", ko: "칼날 끝은 *하얗게*, 바깥은 *색*으로." },
          swing(w) { w.color = true; },
        },
        {
          id: "taper", name: { en: "Taper", ko: "꼬리 가늘게" }, param: "thin as it ages",
          cap: { en: "The tail gets *thinner* as it fades. Like a comet.", ko: "꼬리는 사라지며 *가늘어져요*. 혜성처럼." },
          swing(w) { w.taper = true; w.trLife = 0.45; },
        },
        {
          id: "sparkle", name: { en: "Tip Sparks", ko: "칼끝 불꽃" }, param: "2 / frame",
          cap: { en: "Shed tiny *sparks* off the tip.", ko: "칼끝에서 작은 *불꽃*이 떨어져요." },
          sample(w) { const t = tipOf(w.hero, w.sw); for (let i = 0; i < 2; i++) w.spawn({ type: "spark", x: t.x, y: t.y, vx: rand(-200, 200), vy: rand(-200, 100), g: 600, drag: 3, life: rand(0.2, 0.4), size: 2, color: "186,230,253" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "airy swish",
          cap: { en: "An *airy swish* that matches the arc.", ko: "궤적에 맞춘 *휘익*." },
          swing(w) { w.sfx.slash(); },
        },
      ],
    },

    /* 17 ─ 가드 브레이크 */
    {
      id: "action-guard-break", cat: "action", view: "side",
      title: { en: "Make a guard break *hurt*", ko: "가드가 깨질 때 *아프게*" },
      intro: { en: "Shield's gone? I *didn't notice*.", ko: "방패가 깨졌다고? *몰랐어요*." },
      interval: 1.0, stepDur: 4.0,
      setup(w) {
        ensureArt();
        w.hero = w.actor("hero", { home: 180 });
        w.foe = w.actor("action-knight", { home: 390 }); w.ks = { rot: -1.4 };
        w.gd = { v: 100, lag: 100, stun: 0, gone: false };
      },
      fire(w) {
        const g = w.gd, k = w.foe;
        if (w.busy || g.stun > 0) return;
        w.busy = true;
        w.tween(w.ks, { rot: -2.4 }, 0.15, "out", () => {
          w.tween(k, { x: 300 }, 0.08, "in");
          w.tween(w.ks, { rot: -0.2 }, 0.08, "in", () => {
            const at = { x: w.hero.x + 52, y: G - 88 };
            g.v -= 34;
            if (g.v > 0) { w.hero.ox -= 4; w.emit("block", at); }
            else { g.stun = 1.3; w.emit("break", at); }
            w.after(0.25, () => { w.tween(k, { x: k.home }, 0.3, "inout", () => { w.busy = false; }); w.tween(w.ks, { rot: -1.4 }, 0.3); });
          });
        });
      },
      update(w, dt) {
        const g = w.gd;
        g.lag += (g.v - g.lag) * Math.min(1, dt * 3);
        if (g.stun > 0) { g.stun -= dt; if (g.stun <= 0) { g.v = g.lag = 100; g.gone = false; w.hero.rot = 0; } }
      },
      drawFront(w, ctx) {
        drawSword(ctx, w.foe, w.ks, 104);
        const g = w.gd, h = w.hero;
        if (!g.gone) {
          const x = h.x + h.ox + 44, y = G - 128;
          ctx.fillStyle = "#64748b"; ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.roundRect(x, y, 22, 86, 8); ctx.fill(); ctx.stroke();
          if (g.cracks) {
            ctx.strokeStyle = "rgba(15,23,42,0.9)"; ctx.lineWidth = 2; ctx.beginPath();
            const n = Math.round((100 - Math.max(0, g.v)) / 34);
            for (let i = 0; i < n; i++) { const yy = y + 18 + i * 22; ctx.moveTo(x + 2, yy); ctx.lineTo(x + 12, yy + 8); ctx.lineTo(x + 8, yy + 16); ctx.lineTo(x + 20, yy + 22); }
            ctx.stroke();
          }
        }
        if (g.stars && g.stun > 0) for (let i = 0; i < 3; i++) {
          const a = w.time * 6 + i * TAU / 3;
          label(ctx, "★", h.x + Math.cos(a) * 30, G - h.h - 10 + Math.sin(a) * 8, 16, "#fde047");
        }
      },
      drawHud(w, ctx) {
        const g = w.gd, h = w.hero;
        if (g.meter && !g.gone) meter(ctx, h.x - 40, G - h.h - 30, 80, 8, g.v / 100, "#38bdf8", g.lag / 100, "#f8fafc");
      },
      steps: [
        {
          id: "sparks", name: { en: "Block Sparks", ko: "막을 때 불꽃" }, param: "star + 10 sparks",
          cap: { en: "Each block *sparks* and *pushes* you back.", ko: "막을 때마다 *불꽃*, 몸이 *밀려요*." },
          block(w, at) {
            w.spawn({ type: "star", x: at.x, y: at.y, size: 40, life: 0.3, color: "255,240,200" });
            for (let i = 0; i < 10; i++) w.spawn({ type: "spark", x: at.x, y: at.y, vx: rand(-500, 100), vy: rand(-400, 100), g: 900, drag: 2, life: rand(0.4, 0.7), size: 2.4, color: "255,220,150" });
            w.hero.ox -= 24; w.hero.k = 4;
          },
        },
        {
          id: "meter", name: { en: "Guard Meter", ko: "가드 게이지" }, param: "blue + white lag",
          cap: { en: "Show how much guard is *left*.", ko: "가드가 얼마나 *남았는지* 보여줘요." },
          block(w) { w.gd.meter = true; },
        },
        {
          id: "cracks", name: { en: "Cracks", ko: "금 가기" }, param: "+1 crack per block",
          cap: { en: "The shield *cracks* a bit more each block.", ko: "막을수록 방패에 *금이 늘어요*." },
          block(w) { w.gd.cracks = true; },
        },
        {
          id: "shatter", name: { en: "Shatter", ko: "부서짐" }, param: "12 shards + flash",
          cap: { en: "On break the shield *shatters*. Gone.", ko: "깨지는 순간 방패가 *산산조각*." },
          break(w, at) {
            w.gd.gone = true; w.flash("255,255,255", 0.5);
            w.spawn({ type: "star", x: at.x, y: at.y, size: 80, life: 0.2, color: "255,255,255" });
            for (let i = 0; i < 12; i++) w.spawn({ type: "chunk", x: at.x, y: at.y + rand(-30, 30), vx: rand(-450, 150), vy: rand(-550, -150), g: 1600, ground: true, bounce: 0.3, vr: rand(-20, 20), life: rand(1, 1.6), size: rand(5, 9), color: pick(["100,116,139", "203,213,225"]), hold: true });
          },
        },
        {
          id: "stagger", name: { en: "Stagger + Stop", ko: "휘청 + 멈칫" }, param: "stop 150ms · −50px",
          cap: { en: "Freeze, then *stagger* back off balance.", ko: "멈칫, 그리고 *휘청* 뒤로." },
          break(w) { w.hitstop(0.15); w.shake(0.45, -1); const h = w.hero; h.ox -= 50; h.k = 3; h.rot = -0.25; h.tint = 1; },
        },
        {
          id: "stars", name: { en: "Dizzy Stars", ko: "어질어질 별" }, param: "3 stars orbit",
          cap: { en: "*Stars* circle the head. You're open.", ko: "머리 위로 *별*이 빙빙. 무방비 상태." },
          break(w) { w.gd.stars = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thunk → crash",
          cap: { en: "Dull *thunks* on block, a *crash* on break.", ko: "막을 땐 *텅*, 깨질 땐 *와장창*." },
          block(w) { w.sfx.thunk(); },
          break(w) { w.sfx.burst(); clang(w, 0.6); },
        },
      ],
    },

    /* 18 ─ 분노 모드 */
    {
      id: "action-rage", cat: "action", view: "side",
      title: { en: "Make rage mode feel *dangerous*", ko: "분노 모드가 *위험해 보이게*" },
      intro: { en: "Rage mode ON. Looks *exactly the same*.", ko: "분노 모드 켰는데 *똑같아요*." },
      interval: 2.6, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 250 }); w.rg = { t: 0, max: 2.0 };
        w.H0 = { h: w.hero.h, w: w.hero.w };
      },
      fire(w) {
        const h = w.hero;
        w.rg.t = w.rg.max; h.sx = 1.15; h.sy = 0.85;
        w.emit("rage", h);
      },
      update(w, dt) {
        const r = w.rg, h = w.hero;
        r.t = Math.max(0, r.t - dt);
        h.burn = 0; h.h = w.H0.h; h.w = w.H0.w;
        if (r.t > 0) w.emit("raging", h, dt);
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
        if (w.rg.floor && w.rg.t > 0) veil(ctx, "127,29,29", Math.min(1, w.rg.t * 2) * 0.35);
      },
      drawHud(w, ctx) {
        const r = w.rg; if (r.t <= 0) return;
        label(ctx, "RAGE", 40, 50, 12, "rgba(255,255,255,0.7)", "left", "'JetBrains Mono', monospace", 700);
        meter(ctx, 40, 60, 200, 10, r.t / r.max, r.gauge ? "#ef4444" : "#a1a1aa");
      },
      steps: [
        {
          id: "burst", name: { en: "Activation Burst", ko: "발동 폭발" }, param: "ring 200 + flash",
          cap: { en: "Turning it on is an *event*. Blast a ring.", ko: "켜는 순간이 *이벤트*. 고리가 퍼져요." },
          rage(w, h) {
            w.flash("239,68,68", 0.45); w.shake(0.4);
            w.spawn({ type: "ring", x: h.x, y: G - 70, size: 20, size1: 200, life: 0.45, w: 12, color: "248,113,113" });
            dust(w, h.x, G, 12);
          },
        },
        {
          id: "body", name: { en: "Bigger & Hot", ko: "더 크게, 뜨겁게" }, param: "×1.12 · orange tint",
          cap: { en: "The body gets *bigger* and *glows hot*.", ko: "몸이 *커지고* *달아올라요*." },
          raging(w, h) { h.burn = 1; h.h = w.H0.h * 1.12; h.w = w.H0.w * 1.12; },
        },
        {
          id: "aura", name: { en: "Flame Aura", ko: "불꽃 오라" }, param: "flicker glows",
          cap: { en: "A *flickering aura* licks up around the body.", ko: "몸 주위로 *일렁이는 불꽃*." },
          raging(w, h, dt) { if (Math.random() < dt * 50) w.spawn({ type: "glow", x: h.x + rand(-45, 45), y: G - rand(10, 140), vy: rand(-180, -100), size: rand(14, 22), size1: 2, life: rand(0.25, 0.4), color: pick(["239,68,68", "251,146,60"]) }); },
        },
        {
          id: "embers", name: { en: "Embers", ko: "불티" }, param: "sparks rising",
          cap: { en: "*Embers* drift up and away.", ko: "*불티*가 위로 날려요." },
          raging(w, h, dt) { if (Math.random() < dt * 20) w.spawn({ type: "spark", x: h.x + rand(-60, 60), y: G - rand(0, 40), vx: rand(-40, 40), vy: rand(-260, -140), life: rand(0.6, 1), size: 2, color: "253,186,116" }); },
        },
        {
          id: "floor", name: { en: "World Tint", ko: "세상도 붉게" }, param: "bg red .35 + edges",
          cap: { en: "Tint the *world* too. Everything feels the heat.", ko: "*배경*도 붉게. 모두가 열기를 느껴요." },
          rage(w) { w.rg.floor = true; },
          raging(w) { w.vignette(0.35); },
        },
        {
          id: "gauge", name: { en: "Draining Gauge", ko: "줄어드는 게이지" }, param: "red, 2.0s",
          cap: { en: "Show the clock *draining*. Use it or lose it.", ko: "남은 시간이 *줄어드는 게* 보여요." },
          rage(w) { w.rg.gauge = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "growl + boom",
          cap: { en: "A low *growl* under a *boom*.", ko: "낮은 *으르렁* 위에 *쾅*." },
          rage(w) { w.sfx.boom(); w.play(() => tn({ type: "sawtooth", f: 70, f2: 55, dur: 0.6, vol: 0.12 })); },
        },
      ],
    },

    /* 19 ─ 마무리 카메라 */
    {
      id: "action-finisher-cam", cat: "action", view: "side",
      title: { en: "Frame the *final blow*", ko: "마지막 일격을 *영화처럼*" },
      intro: { en: "The boss is dead. The camera *didn't care*.", ko: "보스가 죽었는데 카메라는 *무덤덤*." },
      interval: 2.0, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 120 }); w.sw = { rot: 0.3 };
        w.foe = w.actor("foe", { home: 360, hp: 30 }); w.fin = 0; w.ifr = 0; w.bars = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, f = w.foe;
        f.hp = 30;
        w.sw.rot = -1.4;
        w.tween(w.sw, { rot: 1.0 }, 0.12, "in");
        w.tween(h, { x: 470 }, 0.14, "in", () => {
          const at = { x: f.x, y: G - 70 };
          if (f.alive) { f.hp = 0; w.emit("finish", at, f); w.kill(f); }
          w.after(0.5, () => { h.flip = true; w.tween(h, { x: h.home }, 0.4, "inout", () => { h.flip = false; w.sw.rot = 0.3; w.busy = false; }); });
        });
      },
      update(w, dt) { w.fin = Math.max(0, w.fin - dt); w.bars += ((w.fin > 0 ? 1 : 0) - w.bars) * Math.min(1, dt * 10); },
      drawFront(w, ctx) { drawSword(ctx, w.hero, w.sw); },
      drawHud(w, ctx) {
        if (w.bars > 0.01) {
          const wy = sy => (sy - 180) / (1 + w.zoom) + 180 + w.cam.y;
          ctx.fillStyle = "#000"; ctx.fillRect(-200, wy(-60), 940, wy(46 * w.bars) - wy(-60)); ctx.fillRect(-200, wy(360 - 46 * w.bars), 940, 200);
        }
        if (w.ifr > 0) {
          w.ifr--;
          ctx.fillStyle = "#000"; ctx.fillRect(-100, -100, 740, 560);
          for (const a of [w.hero, w.foe]) { ctx.save(); ctx.translate(a.x + a.ox, a.gy + a.oy); ctx.scale(a.flip ? -1 : 1, 1); ctx.drawImage(a.s.white, -a.w / 2, -a.h, a.w, a.h); ctx.restore(); }
        }
        drawBar(ctx, w.foe);
      },
      steps: [
        {
          id: "slowmo", name: { en: "Slow-mo", ko: "슬로모션" }, param: "×0.15 · 0.7s",
          cap: { en: "Slow the final blow *way down*.", ko: "마지막 일격은 *한껏 느리게*." },
          finish(w) { w.slowmo(0.15, 0.7); },
        },
        {
          id: "zoom", name: { en: "Push In", ko: "확 당기기" }, param: "zoom +30% on target",
          cap: { en: "*Push the camera in* on the target and hold.", ko: "카메라를 표적에 *확 당겨서* 붙잡아요." },
          finish(w) { w.fin = 0.7; },
          update(w) { if (w.fin > 0) { w.zoom = 0.3; w.cam.tx = (w.foe.x - 270) * 0.8; w.cam.ty = -20; } else { w.cam.tx = 0; w.cam.ty = 0; } },
        },
        {
          id: "impact", name: { en: "Impact Frames", ko: "임팩트 프레임" }, param: "3 frames inverted",
          cap: { en: "Cut to *black and white* for 3 frames.", ko: "*3프레임*만 흑백으로 반전." },
          finish(w) { w.ifr = 3; },
        },
        {
          id: "bars", name: { en: "Letterbox", ko: "영화 띠" }, param: "46px bars",
          cap: { en: "Slide in *cinema bars*. It's a cutscene now.", ko: "*위아래 검은 띠*. 이제 컷신이에요." },
          finish(w) { w.fin = Math.max(w.fin, 0.7); w.bars = 0.01; },
        },
        {
          id: "rays", name: { en: "Focus Lines", ko: "집중선" }, param: "24 rays",
          cap: { en: "Comic *focus lines* point at the hit.", ko: "만화 *집중선*이 한 점을 가리켜요." },
          finish(w, at) { w.spawn({ type: "rays", x: at.x, y: at.y, n: 24, size: 360, life: 0.7, vr: 0.4, color: "255,255,255" }); },
        },
        {
          id: "send", name: { en: "Send Off", ko: "날려 보내기" }, param: "fly + spark burst",
          cap: { en: "Send it *flying*, spinning, in slow motion.", ko: "빙글빙글 *날아가게*, 느리게." },
          finish(w, at, f) { w.fly(f, 420, -720, 10); f.flash = 1.5; sparks(w, at.x, at.y, 24, "255,230,160", [300, 800]); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crit + low boom",
          cap: { en: "A sharp *crit* sinking into a low *boom*.", ko: "날카로운 *챙*이 낮은 *쿵*으로." },
          finish(w) { w.sfx.crit(); w.sfx.boom(); },
        },
      ],
    },

    /* 20 ─ 적 경직 */
    {
      id: "action-stagger", cat: "action", view: "side",
      title: { en: "Make an interrupt *stagger*", ko: "공격을 끊으면 *휘청*하게" },
      intro: { en: "I hit it mid-swing. It just… *stopped*.", ko: "기 모을 때 쳤는데 그냥… *멈췄어요*." },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        ensureArt();
        w.hero = w.actor("hero", { home: 150 }); w.sw = { rot: 0.4 };
        w.foe = w.actor("action-knight", { home: 390 }); w.ks = { rot: -1.4, glowC: "248,113,113", glowA: 0 };
        w.wob = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const k = w.foe, h = w.hero;
        w.wind = true;
        w.after(0.2, () => {
          w.sw.rot = -1.6;
          w.tween(h, { x: 270 }, 0.1, "in");
          w.tween(w.sw, { rot: 0.7 }, 0.1, "in", () => {
            const at = { x: k.x - 45, y: G - 95 };
            w.wind = false; w.ks.glowA = 0; k.ox += 6;
            w.emit("hit", at, k);
            w.after(0.6, () => {
              w.tween(h, { x: h.home }, 0.35, "inout", () => { w.busy = false; });
              w.tween(w.sw, { rot: 0.4 }, 0.3); w.tween(w.ks, { rot: -1.4 }, 0.3); w.tween(k, { x: k.home }, 0.3);
            });
          });
        });
      },
      update(w, dt) {
        const k = w.foe, s = w.ks;
        if (w.wind) { s.rot += (-2.4 - s.rot) * Math.min(1, dt * 8); s.glowA = Math.min(1, s.glowA + dt * 4); }
        if (w.wob > 0) { w.wob += dt; k.rot = 0.35 * Math.sin(w.wob * 24) * Math.exp(-w.wob * 4.5); if (w.wob > 1) { w.wob = 0; k.rot = 0; } }
      },
      drawFront(w, ctx) { drawSword(ctx, w.foe, w.ks, 104); drawSword(ctx, w.hero, w.sw); },
      steps: [
        {
          id: "flinch", name: { en: "Flinch Pose", ko: "움찔 자세" }, param: "lean back + flash",
          cap: { en: "Snap the body *backward*. It got *hit*.", ko: "몸이 *뒤로* 확 젖혀져요. *맞았으니까*." },
          hit(w, at, k) { k.flash = 1; k.rot = 0.35; k.sx = 0.88; k.sy = 1.08; w.ks.rot = -2.9; },
        },
        {
          id: "cancel", name: { en: "Broken Charge", ko: "깨지는 기" }, param: "14 red shards",
          cap: { en: "The charge *shatters* off the blade. Interrupted.", ko: "칼에 모인 기가 *깨져 흩어져요*." },
          hit(w, at, k) {
            const p = tipOf(k, w.ks, 104);
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 70, size1: 10, life: 0.3, color: "248,113,113" });
            for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: p.x + rand(-30, 30), y: p.y + rand(-30, 30), vx: rand(-250, 250), vy: rand(-350, 50), g: 1200, vr: rand(-20, 20), life: rand(0.6, 1), size: rand(3, 6), color: "248,113,113" });
          },
        },
        {
          id: "wobble", name: { en: "Wobble", ko: "휘청휘청" }, param: "decaying sway 1s",
          cap: { en: "Let it *sway* and settle. Balance is lost.", ko: "*흔들흔들*하다 잦아들어요. 중심을 잃었어요." },
          hit(w) { w.wob = 0.001; },
        },
        {
          id: "stumble", name: { en: "Stumble Back", ko: "뒷걸음" }, param: "+45px · dust",
          cap: { en: "A few *steps back*, dust at the heels.", ko: "*뒤로 몇 걸음*, 발뒤꿈치에 먼지." },
          hit(w, at, k) { w.tween(k, { x: k.home + 45 }, 0.3, "out"); dust(w, k.x + 20, G, 6, 1); },
        },
        {
          id: "stop", name: { en: "Hit Stop", ko: "멈칫" }, param: "stop 90ms",
          cap: { en: "A short *freeze* sells the interrupt.", ko: "짧은 *멈칫*이 끊긴 느낌을 줘요." },
          hit(w) { w.hitstop(0.09); w.shake(0.25, 1); },
        },
        {
          id: "label", name: { en: "Label", ko: "글자" }, param: "STAGGER",
          cap: { en: "Tell the player they *broke the attack*.", ko: "공격을 *끊었다고* 알려줘요." },
          hit(w, at) { w.spawn({ type: "text", text: "STAGGER", x: at.x + 40, y: at.y - 80, vy: -20, life: 1.4, size: 28, color: "#fca5a5", hold: true }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hit + glass crack",
          cap: { en: "A solid *hit* with a *crack* on top.", ko: "묵직한 *퍽* 위에 *쨍*." },
          hit(w) { w.sfx.hit(); w.play(() => nz({ dur: 0.2, type: "highpass", f: 3000, f2: 6000, vol: 0.3 })); },
        },
      ],
    },

    /* 21 ─ 방향별 피격 반응 */
    {
      id: "action-hit-dir", cat: "action", view: "top",
      title: { en: "React to *where* the hit came from", ko: "맞은 *방향*대로 반응하게" },
      intro: { en: "Hit from any side. Same *flash* every time.", ko: "어느 쪽에서 맞든 *똑같이* 번쩍." },
      interval: 0.8, stepDur: 3.6,
      setup(w) {
        w.foe = w.actor("foeTop", { home: 300, gy: 185, hp: 0 });
        w.hero = w.actor("heroTop", { home: 180, gy: 185 });
        w.ai = 0; w.angs = [Math.PI, -Math.PI / 2, 0.3, Math.PI / 2 + 0.5, -2.4];
      },
      fire(w) {
        const f = w.foe, h = w.hero, a = w.angs[w.ai++ % w.angs.length], d = a + Math.PI;
        h.x = h.home = f.x + Math.cos(a) * 120; h.gy = f.gy + Math.sin(a) * 120; h.rot = d;
        h.ox = Math.cos(d) * 30; h.oy = Math.sin(d) * 30;
        f.flash = 0.6;
        w.emit("hit", { x: f.x + Math.cos(a) * 28, y: f.gy + Math.sin(a) * 28, d }, f);
      },
      drawFloor(w, ctx) { ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; ctx.strokeRect(14, 40, 512, 290); },
      steps: [
        {
          id: "push", name: { en: "Push Along Hit", ko: "맞은 방향으로 밀림" }, param: "28px along dir",
          cap: { en: "Push it the way the *hit was going*.", ko: "때린 *방향 그대로* 밀려나요." },
          hit(w, h, f) { f.ox += Math.cos(h.d) * 28; f.oy += Math.sin(h.d) * 28; f.k = 6; },
        },
        {
          id: "turn", name: { en: "Turn to Attacker", ko: "돌아보기" }, param: "face hit source",
          cap: { en: "The enemy *turns* toward whoever hit it.", ko: "맞은 쪽으로 *홱* 돌아봐요." },
          hit(w, h, f) { f.rot = h.d; },
        },
        {
          id: "spray", name: { en: "Exit Spray", ko: "반대쪽으로 튐" }, param: "12 sparks · ±35°",
          cap: { en: "Sparks fly out the *far side*, along the hit.", ko: "불꽃은 *반대편*으로, 맞은 방향 따라." },
          hit(w, h) { sparks(w, h.x, h.y, 12, "255,220,150", [250, 650], h.d - 0.6, h.d + 0.6); },
        },
        {
          id: "arc", name: { en: "Side Indicator", ko: "맞은 쪽 표시" }, param: "red arc 0.8s",
          cap: { en: "Light up the *side* that took the hit.", ko: "맞은 *쪽*에 붉은 표시." },
          hit(w, h, f) { const a = h.d + Math.PI; w.spawn({ type: "arc", x: f.x, y: f.gy, size: 48, life: 0.8, a0: a - 0.6, a1: a + 0.6, color: "248,113,113", hold: true }); },
        },
        {
          id: "skid", name: { en: "Skid Marks", ko: "끌린 자국" }, param: "2 marks · 3s",
          cap: { en: "*Skid marks* on the floor show the push.", ko: "바닥의 *끌린 자국*이 밀린 걸 보여줘요." },
          hit(w, h, f) {
            const c = Math.cos(h.d), s = Math.sin(h.d);
            for (const o of [-9, 9]) w.spawn({ type: "crack", under: true, x: f.x - s * o, y: f.gy + c * o, pts: [[0, 0], [c * 34, s * 34]], w: 3, life: 3, color: "255,255,255", alpha: 0.25, hold: true, add: false });
          },
        },
        {
          id: "kick", name: { en: "Directional Kick", ko: "방향 반동" }, param: "6px along dir",
          cap: { en: "The camera *kicks* the same direction.", ko: "화면도 *같은 방향*으로 툭." },
          hit(w, h) { w.kick(Math.cos(h.d) * 6, Math.sin(h.d) * 6); w.hitstop(0.05); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hit ±10% pitch",
          cap: { en: "A *punchy hit*, pitch varied each time.", ko: "*퍽*, 칠 때마다 음높이를 살짝 다르게." },
          hit(w) { w.sfx.hit(rand(0.9, 1.1)); },
        },
      ],
    },

    /* 22 ─ 벽꽝 */
    {
      id: "action-wall-splat", cat: "action", view: "side",
      title: { en: "Make a wall hit *splat*", ko: "벽에 *철퍼덕* 박히게" },
      intro: { en: "Knocked into a wall. It just *stopped*.", ko: "벽까지 날렸는데 그냥 *멈췄어요*." },
      interval: 1.8, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 140 }); w.foe = w.actor("foe", { home: 250 }); w.foe.maxHp = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, h = w.hero, fast = w.on("fly");
        h.ox += 30; f.flash = 0.6;
        w.emit("launch", f);
        w.tween(f, { x: 418 }, fast ? 0.16 : 0.45, fast ? "in" : "out", () => {
          w.emit("wall", { x: 470, y: G - 75 }, f);
          w.after(0.9, () => w.tween(f, { x: f.home, rot: 0, oy: 0 }, 0.35, "inout", () => { w.busy = false; }));
        });
      },
      drawBack(w, ctx) {
        ctx.fillStyle = "#3f3f46"; ctx.fillRect(470, 30, 120, G - 30);
        ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2;
        for (let y = 30, r = 0; y < G; y += 28, r++) { ctx.beginPath(); ctx.moveTo(470, y); ctx.lineTo(590, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(500 + (r % 2) * 30, y); ctx.lineTo(500 + (r % 2) * 30, y + 28); ctx.stroke(); }
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(470, 30, 4, G - 30);
      },
      steps: [
        {
          id: "fly", name: { en: "Fast & Spinning", ko: "빠르게 빙글" }, param: "160ms · spin",
          cap: { en: "Fly *fast*, accelerating into the wall.", ko: "벽까지 *가속하며* 날아가요." },
          launch(w, f) { f.sx = 1.3; f.sy = 0.75; w.tween(f, { rot: 0.7 }, 0.16, "in"); },
        },
        {
          id: "flat", name: { en: "Splat & Slide", ko: "납작 → 주르륵" }, param: "sx .55 · hold 300ms",
          cap: { en: "*Flatten* against the wall, hold, then *slide down*.", ko: "벽에 *납작*, 잠깐 붙었다가 *주르륵*." },
          wall(w, at, f) {
            f.sx = 0.55; f.sy = 1.2; f.rot = 0; f.ox = 20; f.k = 0;
            w.after(0.3, () => { f.k = 10; w.tween(f, { oy: 6, rot: -0.5 }, 0.4, "in"); });
          },
          update(w) { const f = w.foe; if (f.k === 0) { f.sx = Math.min(f.sx, 0.6); } },
        },
        {
          id: "crack", name: { en: "Wall Cracks", ko: "벽 금" }, param: "6 cracks · 3s",
          cap: { en: "The wall *cracks*. Force went somewhere.", ko: "벽에 *금*이 가요. 힘이 어딘가로 갔으니까." },
          wall(w, at) {
            for (let i = 0; i < 6; i++) {
              const a = i / 6 * TAU + rand(-0.3, 0.3), pts = [[0, 0]];
              let r = 0; for (let j = 0; j < 3; j++) { r += rand(12, 22); pts.push([Math.cos(a + rand(-0.4, 0.4)) * r * 0.5, Math.sin(a + rand(-0.4, 0.4)) * r]); }
              w.spawn({ type: "crack", x: at.x + 4, y: at.y, pts, w: 2.5, life: 3, color: "10,10,12", hold: true, add: false });
            }
          },
        },
        {
          id: "debris", name: { en: "Debris", ko: "부스러기" }, param: "10 chunks + dust",
          cap: { en: "Chunks and *dust* burst off the wall.", ko: "벽에서 *돌 조각*과 먼지가 튀어요." },
          wall(w, at) {
            for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: at.x, y: at.y + rand(-40, 40), vx: rand(-320, -60), vy: rand(-400, -50), g: 1500, ground: true, bounce: 0.3, vr: rand(-20, 20), life: rand(1.2, 1.8), size: rand(4, 8), color: pick(["82,82,91", "113,113,122"]), hold: true });
            for (let i = 0; i < 8; i++) w.spawn({ type: "smoke", x: at.x - rand(0, 20), y: at.y + rand(-50, 50), vx: rand(-120, -30), vy: rand(-30, 30), drag: 2, size: 10, size1: 28, life: rand(0.6, 1), color: "160,160,170" });
          },
        },
        {
          id: "stop", name: { en: "Stop + Shake", ko: "멈칫 + 흔들림" }, param: "stop 140ms · →",
          cap: { en: "Freeze on impact, *shake toward* the wall.", ko: "부딪힌 순간 멈칫, *벽 쪽으로* 흔들려요." },
          wall(w, at, f) { w.hitstop(0.14); w.shake(0.5, 1); f.flash = 1.2; },
        },
        {
          id: "bonus", name: { en: "Bonus Label", ko: "보너스 글자" }, param: "WALL SPLAT +50%",
          cap: { en: "Reward it: *bonus damage*, said out loud.", ko: "보상해요. *추가 데미지*를 크게." },
          wall(w, at) {
            w.spawn({ type: "text", text: "WALL SPLAT", x: at.x - 130, y: at.y - 110, vy: -15, life: 1.4, size: 28, color: "#fde047", hold: true });
            w.spawn({ type: "text", text: "+50%", x: at.x - 130, y: at.y - 78, vy: -15, life: 1.4, size: 22, color: "#fff", hold: true });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slam + crumble",
          cap: { en: "A body *slam*, then a little *crumble*.", ko: "*쾅*, 그리고 *우르르*." },
          launch(w) { w.sfx.hit(); },
          wall(w) { w.sfx.slam(); w.sfx.rattle(); },
        },
      ],
    },

    /* 23 ─ 슬라이딩 */
    {
      id: "action-slide", cat: "action", view: "side",
      title: { en: "Make a slide feel *close*", ko: "슬라이딩을 *아슬아슬하게*" },
      intro: { en: "Slid under it. Felt like *nothing happened*.", ko: "밑으로 빠져나갔는데 *아무 일도* 없어요." },
      interval: 1.8, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 60 }); w.sl = { on: false, near: false }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, S = w.sl;
        h.x = 60; h.alpha = 1; h.rot = 0; h.oy = 0; S.near = false;
        w.tween(h, { x: 140 }, 0.18, "in", () => {
          S.on = true;
          w.emit("start", h);
          w.tween(h, { x: 440 }, 0.6, "out", () => {
            S.on = false; h.rot = 0;
            w.emit("end", h);
            w.after(0.35, () => w.tween(h, { alpha: 0 }, 0.2, "lin", () => { w.busy = false; }));
          });
        });
      },
      update(w, dt) {
        const h = w.hero, S = w.sl;
        if (!S.on) return;
        h.sx = 1.35; h.sy = 0.45;
        if (!S.near && h.x > 270) { S.near = true; w.emit("under", h); }
        w.emit("sliding", h, dt);
      },
      drawFront(w, ctx) {
        ctx.fillStyle = "#52525b"; ctx.fillRect(285, 30, 60, G - 100);
        ctx.fillStyle = "#a1a1aa"; ctx.fillRect(285, G - 76, 60, 6);
        if (w.sl.glint > 0) { ctx.fillStyle = `rgba(255,255,255,${w.sl.glint})`; ctx.fillRect(285, G - 76, 60, 6); w.sl.glint -= 0.03; }
      },
      steps: [
        {
          id: "lean", name: { en: "Lean Back", ko: "뒤로 젖히기" }, param: "rot −0.35",
          cap: { en: "Lean *back*, feet first. It's a slide.", ko: "*뒤로 젖히고* 발부터. 그게 슬라이딩." },
          sliding(w, h) { h.rot = -0.35; },
        },
        {
          id: "sparks", name: { en: "Scrape Sparks", ko: "긁히는 불꽃" }, param: "3 / frame at feet",
          cap: { en: "*Sparks* scrape off the floor at the feet.", ko: "발밑에서 *불꽃*이 긁혀 튀어요." },
          sliding(w, h) { for (let i = 0; i < 3; i++) w.spawn({ type: "spark", x: h.x + 40, y: G - 2, vx: rand(-500, -150), vy: rand(-220, -40), g: 900, life: rand(0.15, 0.3), size: 2, color: "255,200,120" }); },
        },
        {
          id: "dust", name: { en: "Dust Wake", ko: "먼지 꼬리" }, param: "cloud behind",
          cap: { en: "A *dust wake* fans out behind you.", ko: "뒤로 *먼지 꼬리*가 퍼져요." },
          sliding(w, h, dt) { if (Math.random() < dt * 40) w.spawn({ type: "smoke", x: h.x - 30, y: G - rand(0, 10), vx: rand(-80, 0), vy: rand(-40, -5), drag: 2, size: 8, size1: rand(20, 30), life: rand(0.5, 0.8), color: "190,180,165" }); },
        },
        {
          id: "near", name: { en: "Near Miss", ko: "아슬아슬" }, param: "×0.35 · 300ms",
          cap: { en: "Right under it? *Slow down* and say *CLOSE*.", ko: "바로 밑에서 *느려지고*, *아슬!*" },
          under(w, h) {
            w.slowmo(0.35, 0.3); w.sl.glint = 1;
            w.spawn({ type: "text", text: "CLOSE!", x: 315, y: G - 110, vy: -10, life: 1.3, size: 26, color: "#c6f432", hold: true });
          },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "2 / frame",
          cap: { en: "Low *speed lines* hug the floor.", ko: "바닥에 붙은 *속도선*." },
          sliding(w, h) { for (let i = 0; i < 2; i++) w.spawn({ type: "spark", x: h.x + rand(0, 80), y: G - rand(6, 60), vx: -1300, vy: 0, life: 0.1, size: 1.6, color: "255,255,255" }); },
        },
        {
          id: "pop", name: { en: "Pop Up", ko: "벌떡" }, param: "hop 30px + stretch",
          cap: { en: "*Pop up* at the end, ready to go.", ko: "끝에서 *벌떡* 일어나요." },
          end(w, h) { h.sx = 0.8; h.sy = 1.25; w.tween(h, { oy: -30 }, 0.12, "out", () => w.tween(h, { oy: 0 }, 0.14, "in")); dust(w, h.x, G, 5); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "long scrape",
          cap: { en: "A long, gritty *scrape*.", ko: "길고 거친 *스르륵*." },
          start(w) { w.play(() => nz({ dur: 0.55, type: "bandpass", f: 1800, f2: 600, q: 0.8, vol: 0.3 })); },
          under(w) { w.sfx.swish(); },
        },
      ],
    },

    /* 24 ─ 갈고리 당기기 */
    {
      id: "action-grapple", cat: "action", view: "side",
      title: { en: "Make a grapple *yank*", ko: "갈고리로 *확* 끌어오기" },
      intro: { en: "Hooked it. It *floated* over.", ko: "걸었는데 *둥둥* 떠서 와요." },
      interval: 1.8, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 110 }); w.sw = { rot: 0.4 };
        w.foe = w.actor("foe", { home: 440 }); w.foe.maxHp = 0;
        w.rope = { on: false, x: 0, y: 0, taut: false, snap: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const r = w.rope, f = w.foe, h = w.hero, p = hand(h);
        Object.assign(r, { on: true, x: p.x, y: p.y, taut: false, latched: false });
        w.emit("throw", r);
        w.tween(r, { x: f.x - 40, y: G - 80 }, 0.18, "out", () => {
          r.latched = true;
          w.emit("latch", r, f);
          const pull = () => {
            r.taut = true;
            w.emit("pull", f);
            w.tween(f, { x: 250 }, 0.3, w.on("yank") ? "in" : "lin", () => {
              r.on = false;
              w.emit("catch", { x: f.x - 50, y: G - 80 }, f);
              w.after(0.5, () => w.tween(f, { x: f.home, rot: 0 }, 0.35, "inout", () => { w.busy = false; }));
            });
          };
          if (w.on("tension")) { w.emit("tense", r); w.after(0.12, pull); } else pull();
        });
      },
      update(w) { const r = w.rope, f = w.foe; if (r.on && r.latched) { r.x = f.x + f.ox - 40; r.y = G - 80; } },
      drawFront(w, ctx) {
        drawSword(ctx, w.hero, w.sw);
        const r = w.rope; if (!r.on) return;
        const p = hand(w.hero), n = 24;
        ctx.strokeStyle = r.snap > 0 ? "#fff" : "#d6b98c"; ctx.lineWidth = r.snap > 0 ? 4 : 2.5; ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const t = i / n, wav = r.wiggle && !r.taut ? Math.sin(t * 14 - w.time * 40) * 10 * Math.sin(t * Math.PI) : 0;
          const x = p.x + (r.x - p.x) * t, y = p.y + (r.y - p.y) * t + wav;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke(); r.snap = Math.max(0, r.snap - 0.08);
        ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.moveTo(r.x + 10, r.y); ctx.lineTo(r.x - 4, r.y - 8); ctx.lineTo(r.x - 4, r.y + 8); ctx.closePath(); ctx.fill();
      },
      steps: [
        {
          id: "wiggle", name: { en: "Rope Wiggle", ko: "출렁이는 줄" }, param: "slack wave → taut",
          cap: { en: "Slack rope *wiggles*. Tight rope is *straight*.", ko: "느슨한 줄은 *출렁*, 당기면 *팽팽*." },
          throw(w, r) { r.wiggle = true; },
        },
        {
          id: "latch", name: { en: "Latch Hit", ko: "걸리는 순간" }, param: "spark + flash",
          cap: { en: "A *spark* and a flash when it bites.", ko: "걸리는 순간 *불꽃*과 번쩍." },
          latch(w, r, f) { f.flash = 1; w.spawn({ type: "star", x: r.x, y: r.y, size: 36, life: 0.2, color: "255,240,200" }); sparks(w, r.x, r.y, 8, "255,220,150", [150, 400]); },
        },
        {
          id: "tension", name: { en: "Tension Beat", ko: "팽팽한 한 박자" }, param: "120ms + lean back",
          cap: { en: "A beat of *tension*. The hero leans back to pull.", ko: "*팽팽한* 한 박자. 몸을 젖혀 당겨요." },
          tense(w, r) { r.taut = true; r.snap = 1; const h = w.hero; h.ox -= 14; h.sx = 1.1; h.sy = 0.9; },
        },
        {
          id: "yank", name: { en: "Yank", ko: "확 끌려옴" }, param: "ease-in + stretch",
          cap: { en: "*Accelerate* toward you, body stretched, dust flying.", ko: "*가속하며* 끌려와요. 몸은 늘어나고, 먼지." },
          pull(w, f) { f.rot = -0.4; f.sx = 1.25; f.sy = 0.85; for (let i = 0; i < 6; i++) w.after(i * 0.05, () => dust(w, f.x + 30, G, 2, 1)); },
        },
        {
          id: "catch", name: { en: "Catch Strike", ko: "끌어와서 베기" }, param: "slash + stop 100ms",
          cap: { en: "Pull it *right into* a slash.", ko: "끌어온 *그대로* 베어요." },
          catch(w, at, f) {
            w.sw.rot = -1.6; w.tween(w.sw, { rot: 0.7 }, 0.08, "in", () => w.tween(w.sw, { rot: 0.4 }, 0.2));
            w.hitstop(0.1); f.flash = 1.2; f.ox += 40; w.shake(0.3, 1);
            w.spawn({ type: "arc", x: at.x - 20, y: at.y, size: 66, life: 0.35, a0: -1.8, a1: 1.0, color: "255,255,255" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "zip / clank / whoosh",
          cap: { en: "*Zip* out, *clank* in, *whoosh* back.", ko: "*쉭* 나가고, *철컥* 걸리고, *휙* 당겨요." },
          throw(w) { w.play(() => nz({ dur: 0.18, type: "bandpass", f: 1200, f2: 4000, q: 2, vol: 0.3 })); },
          latch(w) { w.sfx.clickDown(); w.sfx.thunk(); },
          pull(w) { w.sfx.dash(); },
          catch(w) { w.sfx.slashHit(); },
        },
      ],
    },

    /* 25 ─ 패배 화면 */
    {
      id: "action-defeat", cat: "action", view: "side",
      title: { en: "Make defeat feel *heavy*", ko: "패배 화면을 *묵직하게*" },
      intro: { en: "Died. A *text box* popped up.", ko: "죽었어요. *글자*가 툭 떴어요." },
      interval: 3.0, stepDur: 4.2,
      setup(w) {
        ensureArt();
        w.hero = w.actor("hero", { home: 220 });
        w.foe = w.actor("action-boss", { home: 420 }); w.bs = { rot: -1.0, col: "#c4b5fd" };
        w.ds = { on: false, t: 0, dark: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, D = w.ds;
        Object.assign(h, { rot: 0, oy: 0, alpha: 1 }); D.on = false; D.t = 0;
        w.tween(w.bs, { rot: -2.4 }, 0.15, "out", () => w.tween(w.bs, { rot: 0.6 }, 0.1, "in", () => {
          h.flash = 1;
          w.emit("dead", h);
          if (!w.on("collapse")) { h.rot = 1.5; h.oy = 25; }
          D.on = true;
          w.after(0.4, () => w.tween(w.bs, { rot: -1.0 }, 0.4, "inout"));
          w.after(1.6, () => { w.busy = false; });
        }));
      },
      update(w, dt) { const D = w.ds; if (D.on) D.t += dt / w.ts; },
      drawFront(w, ctx) { drawSword(ctx, w.foe, w.bs, 150); },
      drawHud(w, ctx) {
        const D = w.ds; if (!D.on) return;
        if (D.fade) veil(ctx, "0,0,0", Math.min(0.72, D.t * 1.1));
        const a = D.slowText ? Math.min(1, D.t / 0.6) : 1;
        if (D.band) {
          const g = ctx.createLinearGradient(0, 130, 0, 220);
          g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, `rgba(0,0,0,${0.75 * a})`); g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g; ctx.fillRect(-100, 130, 740, 90);
        }
        ctx.save(); ctx.globalAlpha = a; ctx.translate(270, 176);
        const s = D.slowText ? 1 + Math.min(1.5, D.t) * 0.05 : 1; ctx.scale(s, s);
        if (D.red) {
          ctx.letterSpacing = (4 + Math.min(1.5, D.t) * 4) + "px";
          ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, 0, 150, "153,27,27", 0.5 * a); ctx.globalCompositeOperation = "source-over";
          label(ctx, "YOU FELL", 0, 0, 48, "#dc2626", "center", "Georgia, 'Times New Roman', serif", 600);
        } else label(ctx, "YOU FELL", 0, 0, 40, "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "slow", name: { en: "Killing Blow Slow-mo", ko: "마지막 한 방 슬로" }, param: "stop 120ms + ×0.25",
          cap: { en: "Freeze, then *slow* the final blow.", ko: "멈칫, 그리고 마지막 한 방을 *느리게*." },
          dead(w) { w.hitstop(0.12); w.slowmo(0.25, 0.8); w.shake(0.3, -1); },
        },
        {
          id: "collapse", name: { en: "Collapse", ko: "무너지기" }, param: "kneel → fall 0.7s",
          cap: { en: "Don't snap to the floor. *Kneel*, then *fall*.", ko: "바로 눕지 말고 *무릎 꿇고*, *쓰러져요*." },
          dead(w, h) { w.tween(h, { rot: 0.35, oy: 14 }, 0.25, "out", () => w.tween(h, { rot: 1.5, oy: 30 }, 0.45, "in", () => dust(w, h.x + 50, G, 8))); },
        },
        {
          id: "fade", name: { en: "Fade to Dark", ko: "어두워지기" }, param: "black → .72",
          cap: { en: "The world *fades to dark*. It's over.", ko: "세상이 *어두워져요*. 끝났어요." },
          dead(w) { w.ds.fade = true; },
        },
        {
          id: "slowText", name: { en: "Slow Reveal", ko: "천천히 떠오름" }, param: "fade 0.6s · grow 5%",
          cap: { en: "Text *fades in slowly* and keeps growing.", ko: "글자가 *천천히* 떠오르고 조금씩 커져요." },
          dead(w) { w.ds.slowText = true; },
        },
        {
          id: "band", name: { en: "Dark Band", ko: "검은 띠" }, param: "gradient band",
          cap: { en: "A soft *dark band* behind the words.", ko: "글자 뒤에 부드러운 *검은 띠*." },
          dead(w) { w.ds.band = true; },
        },
        {
          id: "red", name: { en: "Blood-red Serif", ko: "핏빛 세리프" }, param: "serif · spacing 4→10px",
          cap: { en: "*Deep red* serif, letters *drifting apart*.", ko: "*핏빛* 세리프, 글자 사이가 *벌어져요*." },
          dead(w) { w.ds.red = true; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "low drone + bell",
          cap: { en: "A *low drone* and a distant *bell*.", ko: "낮은 *웅~* 소리와 먼 *종소리*." },
          dead(w) { w.sfx.thud(); w.play(() => { tn({ type: "sawtooth", f: 55, f2: 45, dur: 2, vol: 0.08 }); tn({ type: "triangle", f: 220, dur: 2, vol: 0.12, delay: 0.5 }); tn({ f: 660, dur: 1.5, vol: 0.05, delay: 0.5 }); }); },
        },
      ],
    },
  );
})();

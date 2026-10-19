"use strict";
/* rpg — RPG 연출 30편 */
(() => {
  /* ───── 파일 전용 도우미 ───── */
  const FONT = 'Pretendard, "Apple SD Gothic Neo", sans-serif';
  // 외곽선 있는 글자
  const T = (ctx, s, x, y, size, col = "#fff", align = "center", weight = 800) => {
    ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.lineWidth = Math.max(2, size * 0.18); ctx.strokeStyle = "rgba(10,12,20,0.92)";
    ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
  };
  const panel = (ctx, x, y, w, h, r = 10, fill = "#1c2029", stroke = "rgba(255,255,255,0.14)", lw = 1.5) => {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  const pie = (ctx, x, y, r, frac, col) => {
    if (frac <= 0) return;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, frac)); ctx.closePath(); ctx.fill();
  };
  const star5 = (ctx, x, y, r, r2 = r * 0.45) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r2 : r; ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  };
  const tri = (ctx, x, y, s, up, col) => {
    ctx.fillStyle = col; ctx.beginPath();
    if (up) { ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.7); ctx.lineTo(x - s, y + s * 0.7); }
    else { ctx.moveTo(x, y + s); ctx.lineTo(x + s, y - s * 0.7); ctx.lineTo(x - s, y - s * 0.7); }
    ctx.closePath(); ctx.fill();
  };
  // 벡터 아이콘 (s = 반지름 정도)
  function icon(ctx, kind, x, y, s, col = "#fff") {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = col; ctx.strokeStyle = "rgba(10,12,20,0.55)"; ctx.lineWidth = Math.max(1.2, s * 0.08); ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    if (kind === "sword") {
      ctx.rotate(Math.PI / 4);
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.16, -s * 0.72); ctx.lineTo(s * 0.16, s * 0.3); ctx.lineTo(-s * 0.16, s * 0.3); ctx.lineTo(-s * 0.16, -s * 0.72); ctx.closePath();
      ctx.rect(-s * 0.45, s * 0.3, s * 0.9, s * 0.16); ctx.rect(-s * 0.09, s * 0.46, s * 0.18, s * 0.42);
    } else if (kind === "fire") {
      ctx.moveTo(0, -s * 0.95); ctx.bezierCurveTo(s * 0.5, -s * 0.4, s * 0.8, s * 0.1, s * 0.58, s * 0.55);
      ctx.bezierCurveTo(s * 0.38, s * 0.95, -s * 0.38, s * 0.95, -s * 0.58, s * 0.55);
      ctx.bezierCurveTo(-s * 0.8, s * 0.1, -s * 0.3, -s * 0.2, 0, -s * 0.95);
    } else if (kind === "shield") {
      ctx.moveTo(0, -s * 0.85); ctx.lineTo(s * 0.72, -s * 0.58); ctx.lineTo(s * 0.62, s * 0.2);
      ctx.quadraticCurveTo(s * 0.42, s * 0.7, 0, s * 0.92); ctx.quadraticCurveTo(-s * 0.42, s * 0.7, -s * 0.62, s * 0.2); ctx.lineTo(-s * 0.72, -s * 0.58); ctx.closePath();
    } else if (kind === "bolt") {
      [[0.2, -0.95], [-0.5, 0.12], [-0.05, 0.12], [-0.22, 0.95], [0.5, -0.15], [0.06, -0.15]].forEach(([a, b], i) => ctx[i ? "lineTo" : "moveTo"](a * s, b * s)); ctx.closePath();
    } else if (kind === "drop") {
      ctx.moveTo(0, -s * 0.9); ctx.bezierCurveTo(s * 0.3, -s * 0.4, s * 0.65, 0, s * 0.65, s * 0.3);
      ctx.arc(0, s * 0.3, s * 0.65, 0, Math.PI); ctx.bezierCurveTo(-s * 0.65, 0, -s * 0.3, -s * 0.4, 0, -s * 0.9);
    } else if (kind === "heart") {
      ctx.moveTo(0, s * 0.85); ctx.bezierCurveTo(-s * 0.95, s * 0.2, -s * 0.8, -s * 0.75, 0, -s * 0.35);
      ctx.bezierCurveTo(s * 0.8, -s * 0.75, s * 0.95, s * 0.2, 0, s * 0.85);
    } else if (kind === "star") {
      star5(ctx, 0, 0, s * 0.95);
    } else if (kind === "boot") {
      ctx.moveTo(-s * 0.4, -s * 0.85); ctx.lineTo(s * 0.15, -s * 0.85); ctx.lineTo(s * 0.15, s * 0.15); ctx.lineTo(s * 0.85, s * 0.35);
      ctx.lineTo(s * 0.85, s * 0.8); ctx.lineTo(-s * 0.45, s * 0.8); ctx.closePath();
    } else if (kind === "snow") {
      ctx.restore(); ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.lineWidth = s * 0.2; ctx.lineCap = "round"; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3, c = Math.cos(a) * s * 0.9, d = Math.sin(a) * s * 0.9; ctx.moveTo(-c, -d); ctx.lineTo(c, d); }
      ctx.stroke(); ctx.restore(); return;
    } else if (kind === "swirl") {
      ctx.restore(); ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.lineWidth = s * 0.2; ctx.lineCap = "round"; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 1.6, r = s * 0.9 * t; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
      ctx.stroke(); ctx.restore(); return;
    } else if (kind === "moon") {
      ctx.arc(0, 0, s * 0.85, 0.6, TAU - 0.6 + 0.0001); ctx.arc(s * 0.45, -s * 0.2, s * 0.62, TAU - 0.9, 0.9 + 0.3, true); ctx.closePath();
    } else if (kind === "potion") {
      ctx.rect(-s * 0.2, -s * 0.95, s * 0.4, s * 0.4); ctx.moveTo(s * 0.2, -s * 0.55); ctx.arc(0, s * 0.2, s * 0.7, -1.27, Math.PI + 1.27);
    } else if (kind === "coin") {
      ctx.arc(0, 0, s * 0.85, 0, TAU);
    }
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // 아이콘 칸 (색 배경 + 아이콘)
  function slotIcon(ctx, kind, x, y, s, col, bg = "#262b36") {
    panel(ctx, x - s, y - s, s * 2, s * 2, s * 0.28, bg, "rgba(255,255,255,0.22)", 2);
    icon(ctx, kind, x, y, s * 0.68, col);
  }
  // 배우 위에 색 덧칠 (drawActor와 같은 변환)
  function overlay(ctx, a, c, alpha) {
    if (alpha <= 0 || a.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, alpha) * a.alpha;
    ctx.translate(a.x + a.ox, a.gy + a.oy);
    if (a.rot) { ctx.translate(0, -a.h / 2); ctx.rotate(a.rot); ctx.translate(0, a.h / 2); }
    ctx.scale(a.sx * (a.flip ? -1 : 1), a.sy);
    ctx.drawImage(c, -a.w / 2, -a.h, a.w, a.h); ctx.restore();
  }
  // 색을 입힌 배우 그림 (한 번만 만듦)
  const tintSpr = (src, col) => sprite(`rpg-${src}-${col}`, SPR[src].c.width, SPR[src].c.height, x => {
    x.drawImage(SPR[src].c, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = col; x.fillRect(0, 0, SPR[src].c.width, SPR[src].c.height);
  });
  // 작은 체력바 (색 지정)
  function hpBar(ctx, a, col = "#ef4444", lag = false, lagCol = "#facc15", bw = 84) {
    if (!a.maxHp) return;
    const bh = 9; let x = a.x - bw / 2, y = a.gy - a.h - 24;
    if (a.barShake > 0) { x += rand(-3, 3); y += rand(-2, 2); }
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, bw + 6, bh + 6, 6); ctx.fill();
    if (lag) { ctx.fillStyle = lagCol; ctx.fillRect(x, y, bw * Math.max(0, Math.min(1, a.hpLag / a.maxHp)), bh); }
    ctx.fillStyle = col; ctx.fillRect(x, y, bw * Math.max(0, Math.min(1, a.hp / a.maxHp)), bh);
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x, y, bw * Math.max(0, Math.min(1, a.hp / a.maxHp)), 3);
  }
  // 바닥 마법진 (납작하게)
  function magicCircle(ctx, x, y, r, rot, a, col, flat = 0.3) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, flat); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.stroke();
    ctx.rotate(rot);
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 3; i++) { const q = i * TAU / 3 + k * Math.PI; ctx[i ? "lineTo" : "moveTo"](Math.cos(q) * r * 0.8, Math.sin(q) * r * 0.8); }
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(${col},${a})`;
    for (let i = 0; i < 16; i++) { const q = i * TAU / 16; ctx.save(); ctx.rotate(q); ctx.fillRect(r * 0.84, -3, r * 0.1, 6); ctx.restore(); }
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }
  // 칼 그림
  const swordSpr = () => sprite("rpg-sword", 80, 200, x => {
    x.fillStyle = lg(x, 20, 0, 60, 0, [[0, "#f8fafc"], [0.5, "#cbd5e1"], [1, "#64748b"]]);
    x.beginPath(); x.moveTo(40, 4); x.lineTo(54, 26); x.lineTo(54, 132); x.lineTo(26, 132); x.lineTo(26, 26); x.closePath(); x.fill();
    x.strokeStyle = "rgba(255,255,255,0.8)"; x.lineWidth = 2; x.beginPath(); x.moveTo(40, 10); x.lineTo(40, 128); x.stroke();
    x.fillStyle = "#facc15"; x.beginPath(); x.roundRect(6, 132, 68, 14, 6); x.fill();
    x.fillStyle = "#7c2d12"; x.fillRect(33, 146, 14, 36);
    x.fillStyle = "#facc15"; x.beginPath(); x.arc(40, 188, 9, 0, TAU); x.fill();
  });
  const potionSpr = () => sprite("rpg-potion", 90, 120, x => {
    x.fillStyle = "#a16207"; x.beginPath(); x.roundRect(33, 4, 24, 18, 4); x.fill();
    x.fillStyle = "rgba(226,232,240,0.9)"; x.fillRect(36, 20, 18, 22);
    x.fillStyle = rg(x, 45, 76, 4, 42, [[0, "#fda4af"], [0.5, "#e11d48"], [1, "#881337"]], 34, 62);
    x.beginPath(); x.arc(45, 76, 38, 0, TAU); x.fill();
    x.strokeStyle = "rgba(255,255,255,0.7)"; x.lineWidth = 3; x.beginPath(); x.arc(45, 76, 38, 0, TAU); x.stroke();
    x.fillStyle = "rgba(255,255,255,0.7)"; x.beginPath(); x.ellipse(30, 62, 9, 5, -0.7, 0, TAU); x.fill();
  });
  const drawImg = (ctx, c, x, y, w, rot = 0, sx = 1, sy = 1, alpha = 1) => {
    const h = w * c.height / c.width;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy); ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore();
  };
  const burst = (w, x, y, n, col, sp = [150, 480], size = 2.6) => {
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(sp[0], sp[1]); w.spawn({ type: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 5, life: rand(0.2, 0.45), size, color: col }); }
  };
  const ELEM = { fire: "251,146,60", ice: "103,232,249", poison: "192,132,252", holy: "253,224,71", heal: "74,222,128" };

  RECIPES.push(
    /* 1. 시전 마법진 */
    {
      id: "rpg-cast-circle", cat: "rpg", view: "side",
      title: { en: "Make spellcasting *build up*", ko: "주문 시전에 *뜸* 들이기" },
      intro: { en: "Hero stands still. A dot flies. *Spell?*", ko: "가만히 서 있다가 점 하나. *이게 주문?*" },
      interval: 1.5, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 130, h: 125 }); w.foe = w.actor("foe", { home: 420, h: 140, hp: 200 });
        w.C = { a: 0, s: 1, rot: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const C = w.C;
        w.emit("cast", C);
        w.after(0.7, () => {
          const p = paw(w), f = w.foe;
          const o = { x: p.x + 6, y: p.y, vx: 950, vy: 0, orb: true, hitX: f.x - 40 };
          o.onHit = () => {
            f.hp = Math.max(0, f.hp - 40); f.flash = 0.8; f.ox += 14;
            w.emit("hit", { x: o.x, y: o.y });
            if (f.hp <= 0) w.after(0.5, () => { f.hp = f.maxHp; });
          };
          w.emit("release", C, p, o);
          w.shoot(o);
          w.after(0.35, () => { w.busy = false; });
        });
      },
      update(w, dt) { w.C.rot += dt * 1.5; },
      drawBack(w, ctx) { w.emit("back", ctx); },
      drawHud(w, ctx) { hpBar(ctx, w.foe); },
      steps: [
        {
          id: "circle", name: { en: "Magic Circle", ko: "바닥 마법진" }, param: "r 80 · back ease",
          cap: { en: "Draw a *circle* under the caster first.", ko: "시전자 발밑에 *마법진*부터 깔아요." },
          cast(w, C) { C.a = 1; C.s = 0; w.tween(C, { s: 1 }, 0.35, "back"); },
          release(w, C) { w.tween(C, { a: 0 }, 0.4, "in"); },
          back(w, ctx) { const C = w.C; magicCircle(ctx, w.hero.x, G, 85 * C.s, C.rot, C.a, "167,139,250"); },
        },
        {
          id: "spin", name: { en: "Spin Up", ko: "점점 빨리 회전" }, param: "rot ×6 while casting",
          cap: { en: "Spin it *faster* as the cast builds.", ko: "모일수록 마법진이 *빨리* 돌아요." },
          update(w, dt) { if (w.C.a > 0.5) w.C.rot += dt * 7; },
        },
        {
          id: "glyphs", name: { en: "Rising Glyphs", ko: "떠오르는 문양" }, param: "embers from rim",
          cap: { en: "Light *rises* off the rim. The air is charging.", ko: "테두리에서 빛이 *피어올라요*." },
          update(w) {
            const C = w.C; if (C.a < 0.5) return;
            const q = rand(0, TAU);
            w.spawn({ type: "glow", x: w.hero.x + Math.cos(q) * 80, y: G + Math.sin(q) * 24, vy: rand(-150, -70), size: rand(6, 11), size1: 0, life: 0.6, color: "196,181,253" });
          },
        },
        {
          id: "pillar", name: { en: "Light Column", ko: "빛기둥" }, param: "beam 60px",
          cap: { en: "A soft *column* wraps the caster.", ko: "시전자를 감싸는 *빛기둥*." },
          cast(w) { w.spawn({ type: "beam", x: w.hero.x, y: G, size: 55, h: 260, life: 0.75, color: "167,139,250" }); },
        },
        {
          id: "sigil", name: { en: "Hand Sigil", ko: "손끝 문양" }, param: "upright ring + rays",
          cap: { en: "On release, a *sigil* flares at the hand.", ko: "쏘는 순간 손끝에 *문양*이 번쩍." },
          release(w, C, p) {
            w.spawn({ type: "ring", x: p.x + 14, y: p.y, size: 46, size1: 30, life: 0.35, w: 6, color: "233,213,255" });
            w.spawn({ type: "rays", x: p.x + 14, y: p.y, size: 90, n: 8, vr: 4, life: 0.35, color: "196,181,253" });
            w.hero.ox -= 10;
          },
        },
        {
          id: "impact", name: { en: "Impact Burst", ko: "맞는 순간 터짐" }, param: "ring + 16 sparks",
          cap: { en: "Pay it off: *ring*, *sparks*, a short *shake*.", ko: "끝은 확실하게. *고리*, *불꽃*, 짧은 *흔들림*." },
          hit(w, h) {
            w.spawn({ type: "ring", x: h.x, y: h.y, size: 10, size1: 110, life: 0.4, w: 12, color: "196,181,253" });
            w.spawn({ type: "glow", under: true, x: h.x, y: h.y, size: 120, size1: 60, life: 0.9, color: "167,139,250" });
            burst(w, h.x, h.y, 26, "233,213,255", [200, 620], 3.2); w.shake(0.3, 1); w.foe.ox += 22;
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hum → whoosh → boom",
          cap: { en: "A rising *hum*, a *whoosh*, a *boom*.", ko: "올라가는 *웅*, 나가는 *휙*, 맞으면 *팡*." },
          cast(w) { w.sfx.charge(); },
          release(w) { w.sfx.magic(); },
          hit(w) { w.sfx.burst(); },
        },
      ],
    },

    /* 2. 쿨타임 */
    {
      id: "rpg-cooldown", cat: "rpg", view: "ui",
      title: { en: "Make cooldowns *readable*", ko: "쿨타임이 *한눈에* 보이게" },
      intro: { en: "Grey icon. Ready *when*?", ko: "회색 아이콘. *언제* 다시 써요?" },
      interval: 0.6, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        const K = [["sword", "#fca5a5", 1.6], ["fire", "#fdba74", 2.6], ["shield", "#93c5fd", 3.2], ["bolt", "#fde047", 2.0]];
        w.S = K.map(([k, col, max], i) => ({ k, col, max, cd: 0, x: 135 + i * 90, y: 200, sc: 1, flash: 0, shake: 0 }));
        w.cnt = 0;
      },
      fire(w) {
        const s = w.S[w.cnt++ % 4];
        if (s.cd > 0) { w.emit("deny", s); return; }
        s.cd = s.max;
        w.emit("use", s);
      },
      update(w, dt) {
        for (const s of w.S) {
          if (s.cd > 0) { s.cd -= dt; if (s.cd <= 0) { s.cd = 0; w.emit("ready", s); } }
          s.sc += (1 - s.sc) * Math.min(1, dt * 12); s.flash = Math.max(0, s.flash - dt * 3); s.shake = Math.max(0, s.shake - dt);
        }
      },
      drawFront(w, ctx) {
        panel(ctx, 70, 140, 400, 120, 18, "rgba(28,32,41,0.9)");
        for (const s of w.S) {
          ctx.save(); ctx.translate(s.x + (s.shake > 0 ? Math.sin(s.shake * 90) * 6 : 0), s.y); ctx.scale(s.sc, s.sc);
          slotIcon(ctx, s.k, 0, 0, 36, s.col);
          if (s.cd > 0 && !w.on("sweep")) panel(ctx, -36, -36, 72, 72, 10, "rgba(8,10,14,0.72)", null);
          w.emit("slot", ctx, s);
          if (s.flash > 0) panel(ctx, -36, -36, 72, 72, 10, `rgba(255,255,255,${s.flash * 0.9})`, null);
          ctx.restore();
        }
      },
      steps: [
        {
          id: "sweep", name: { en: "Clock Sweep", ko: "시계 방향 쓸기" }, param: "pie = time left",
          cap: { en: "Show the time left as a *clock sweep*.", ko: "남은 시간을 *시계처럼* 쓸어요." },
          slot(w, ctx, s) {
            if (s.cd <= 0) return;
            ctx.save(); ctx.beginPath(); ctx.roundRect(-36, -36, 72, 72, 10); ctx.clip();
            pie(ctx, 0, 0, 60, s.cd / s.max, "rgba(8,10,14,0.72)"); ctx.restore();
          },
        },
        {
          id: "edge", name: { en: "Bright Edge", ko: "밝은 경계선" }, param: "2px line",
          cap: { en: "A *bright edge* on the sweep shows it moving.", ko: "경계에 *밝은 선*. 움직이는 게 보여요." },
          slot(w, ctx, s) {
            if (s.cd <= 0) return;
            const a = -Math.PI / 2 + TAU * (s.cd / s.max);
            ctx.save(); ctx.beginPath(); ctx.roundRect(-36, -36, 72, 72, 10); ctx.clip();
            ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60); ctx.stroke(); ctx.restore();
          },
        },
        {
          id: "seconds", name: { en: "Seconds Left", ko: "남은 초" }, param: "1 decimal",
          cap: { en: "Big *seconds* in the middle. No guessing.", ko: "가운데 *남은 초*. 감으로 셀 필요 없어요." },
          slot(w, ctx, s) { if (s.cd > 0) T(ctx, s.cd.toFixed(1), 0, 2, 22, "#fff"); },
        },
        {
          id: "ready", name: { en: "Ready Flash", ko: "준비 완료 번쩍" }, param: "white + ring",
          cap: { en: "When it's back, *flash* so the eye catches it.", ko: "다 차면 *번쩍*. 눈이 바로 가요." },
          ready(w, s) {
            s.flash = 1; s.sc = 1.25;
            w.spawn({ type: "ring", x: s.x, y: s.y, size: 40, size1: 80, life: 0.45, w: 7, color: "198,244,50" });
            w.spawn({ type: "star", x: s.x + 22, y: s.y - 22, size: 18, life: 0.4, color: "255,255,255" });
          },
        },
        {
          id: "press", name: { en: "Press Squash", ko: "누름 반응" }, param: "scale 0.8",
          cap: { en: "Using a skill *squashes* the icon.", ko: "쓰는 순간 아이콘이 *꾹*." },
          use(w, s) { s.sc = 0.8; burst(w, s.x, s.y, 14, "255,255,255", [160, 380], 3); w.spawn({ type: "ring", x: s.x, y: s.y, size: 30, size1: 60, life: 0.3, w: 5, color: "255,255,255" }); },
        },
        {
          id: "deny", name: { en: "Not Ready", ko: "아직 안 돼요" }, param: "shake 300ms",
          cap: { en: "Too early? *Shake* it. Don't just ignore the tap.", ko: "너무 일찍 누르면 *도리도리*. 무시하지 마요." },
          deny(w, s) { s.shake = 0.3; w.spawn({ type: "text", text: "NOT READY", x: s.x, y: s.y - 60, vy: -30, life: 0.6, size: 14, color: "#f87171" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "use / ding / bonk",
          cap: { en: "*Ding* when ready. A dull *bonk* when not.", ko: "다 차면 *띵*, 아직이면 둔탁한 *툭*." },
          use(w) { w.sfx.swish(); },
          ready(w) { w.sfx.chime(5); },
          deny(w) { w.sfx.tock(); },
        },
      ],
    },

    /* 3. 마나 소모 */
    {
      id: "rpg-mana", cat: "rpg", view: "side",
      title: { en: "Make mana *cost* something", ko: "마나가 *닳는 게* 보이게" },
      intro: { en: "The blue bar moved. *Did it?*", ko: "파란 바가… *줄었나?*" },
      interval: 0.9, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 130, h: 125 }); w.foe = w.actor("foe", { home: 420, h: 140 });
        w.mp = { v: 100, lag: 100, wait: 0, cost: 30, shake: 0, red: 0 };
      },
      fire(w) {
        const m = w.mp;
        if (m.v < m.cost) { w.emit("fail", m); return; }
        m.v -= m.cost;
        const p = paw(w);
        w.emit("spend", m, p);
        w.shoot({ x: p.x + 6, y: p.y, vx: 900, vy: 0, orb: true, core: true, hitX: w.foe.x - 40, onHit: () => { w.foe.flash = 1; w.foe.ox += 12; } });
      },
      update(w, dt) {
        const m = w.mp;
        m.v = Math.min(100, m.v + dt * 9); m.shake = Math.max(0, m.shake - dt); m.red = Math.max(0, m.red - dt * 1.2);
        if (!w.on("lag")) m.lag = m.v;
        if (m.lag < m.v) m.lag = m.v;
      },
      drawHud(w, ctx) {
        const m = w.mp, X = 60 + (m.shake > 0 ? rand(-4, 4) : 0), Y = 306, W = 300, H = 16;
        T(ctx, "MP", X - 10, Y + 8, 15, "#93c5fd", "right");
        panel(ctx, X - 3, Y - 3, W + 6, H + 6, 6, "rgba(0,0,0,0.65)", null);
        ctx.fillStyle = "#e0f2fe"; ctx.fillRect(X, Y, W * m.lag / 100, H);
        ctx.fillStyle = "#3b82f6"; ctx.fillRect(X, Y, W * m.v / 100, H);
        ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(X, Y, W * m.v / 100, 4);
        w.emit("bar", ctx, X, Y, W, H);
        if (m.red > 0) { ctx.fillStyle = `rgba(239,68,68,${m.red * 0.8})`; ctx.fillRect(X, Y, W, H); }
        T(ctx, `${Math.floor(m.v)} / 100`, X + W + 12, Y + 8, 14, "#cbd5e1", "left", 700);
      },
      steps: [
        {
          id: "preview", name: { en: "Cost Preview", ko: "쓸 만큼 미리 보기" }, param: "blink last 30",
          cap: { en: "*Blink* the part the next spell will eat.", ko: "다음 주문이 먹을 만큼 *깜빡여요*." },
          bar(w, ctx, X, Y, W, H) {
            const m = w.mp, x0 = W * Math.max(0, m.v - m.cost) / 100;
            ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.25 * Math.sin(w.time * 10)})`;
            ctx.fillRect(X + x0, Y, W * m.v / 100 - x0, H);
          },
        },
        {
          id: "lag", name: { en: "Drain Lag", ko: "뒤따라 빠짐" }, param: "wait 300ms",
          cap: { en: "Leave a *pale chunk* that drains after.", ko: "*빠진 조각*이 남았다가 뒤따라 줄어요." },
          spend(w, m) { m.wait = 0.3; },
          update(w, dt) { const m = w.mp; if (m.wait > 0) m.wait -= dt; else m.lag += (m.v - m.lag) * Math.min(1, dt * 4); },
        },
        {
          id: "flow", name: { en: "Mana Flows Out", ko: "마나가 빠져나감" }, param: "6 orbs bar → hand",
          cap: { en: "Blue orbs *fly from the bar* into the hand.", ko: "바에서 파란 구슬이 *손으로* 날아가요." },
          spend(w, m, p) {
            for (let i = 0; i < 6; i++) w.spawn({ type: "glow", seek: true, x: 60 + 3 * (m.v + i * 5), y: 314, tx: p.x, ty: p.y, life: 0.3 + i * 0.03, size: 12, color: "96,165,250" });
            w.spawn({ type: "glow", x: p.x, y: p.y, size: 50, size1: 16, life: 1.1, color: "96,165,250" });
          },
        },
        {
          id: "number", name: { en: "Cost Number", ko: "소모량 숫자" }, param: "-30 at bar",
          cap: { en: "Say the price: *-30* pops off the bar.", ko: "가격을 말해줘요. 바에서 *-30*." },
          spend(w, m) { w.spawn({ type: "text", text: "-" + m.cost, x: 60 + 3 * m.v + 40, y: 290, vy: -40, life: 1.4, size: 26, color: "#93c5fd" }); },
        },
        {
          id: "fail", name: { en: "Out of Mana", ko: "마나 부족" }, param: "shake + red",
          cap: { en: "Not enough? *Shake* the bar red. *Say why*.", ko: "모자라면 바를 *빨갛게 흔들고*, *이유*를 말해요." },
          fail(w, m) {
            m.shake = 0.8; m.red = 1; w.hero.ox -= 8;
            w.spawn({ type: "text", text: "NOT ENOUGH MP", x: w.hero.x + 10, y: 110, vy: -20, life: 1.4, size: 22, color: "#f87171" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "cast / buzz",
          cap: { en: "Cast *whoosh*. A flat *buzz* when it fails.", ko: "쓰면 *휙*, 모자라면 밋밋한 *삐*." },
          spend(w) { w.sfx.magic(); },
          fail(w) { w.play(() => tn({ type: "square", f: 140, dur: 0.18, vol: 0.18 })); },
        },
      ],
    },

    /* 4. 버프 아이콘 */
    {
      id: "rpg-buff-stack", cat: "rpg", view: "side",
      title: { en: "Make buffs *stack up* visibly", ko: "버프가 *쌓이는* 게 보이게" },
      intro: { en: "Icons appear. Which one is *new*?", ko: "아이콘이 생겼는데, *뭐가* 새로 붙었죠?" },
      interval: 0.85, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("hero", { home: 270, h: 130 });
        w.B = []; w.cnt = 0;
        w.K = [["sword", "#f87171", "248,113,113"], ["shield", "#60a5fa", "96,165,250"], ["bolt", "#facc15", "250,204,21"]];
      },
      fire(w) {
        const k = [0, 1, 0, 2, 0, 1, 2][w.cnt++ % 7];
        let b = w.B.find(q => q.k === k);
        if (b) { b.n = Math.min(5, b.n + 1); b.t = 4.5; w.emit("stack", b); return; }
        b = { k, n: 1, t: 4.5, sc: 1, oy: 0, bump: 0 };
        w.B.push(b);
        w.emit("add", b);
      },
      update(w, dt) {
        for (const b of w.B) { b.t -= dt; b.bump = Math.max(0, b.bump - dt * 4); }
        w.B = w.B.filter(b => b.t > 0);
      },
      drawBack(w, ctx) { w.emit("back", ctx); },
      drawHud(w, ctx) {
        w.B.forEach((b, i) => {
          const [kind, col] = w.K[b.k], x = 270 - (w.B.length - 1) * 34 + i * 68, y = 92 + b.oy;
          b.x = x; b.y = y;
          ctx.save(); ctx.translate(x, y); ctx.scale(b.sc * (1 + b.bump * 0.3), b.sc * (1 + b.bump * 0.3));
          w.emit("icon", ctx, b);
          slotIcon(ctx, kind, 0, 0, 27, col);
          if (b.n > 1) T(ctx, "x" + b.n, 22, 22, 18, "#fff");
          ctx.restore();
        });
      },
      steps: [
        {
          id: "pop", name: { en: "Pop In", ko: "톡 튀어나옴" }, param: "0 → 1 · back",
          cap: { en: "New icons *pop* in. Nothing just appears.", ko: "새 아이콘은 *톡* 튀어나와요." },
          add(w, b) { b.sc = 0; w.tween(b, { sc: 1 }, 0.3, "back"); },
        },
        {
          id: "fly", name: { en: "Fly From Hero", ko: "몸에서 날아오름" }, param: "+110px → slot",
          cap: { en: "The icon *rises from the body* into its slot.", ko: "아이콘이 *몸에서 떠올라* 자리로 가요." },
          add(w, b) { b.oy = 110; w.tween(b, { oy: 0 }, 0.35, "out"); },
        },
        {
          id: "aura", name: { en: "Body Aura", ko: "몸에 두르는 빛" }, param: "buff color glow",
          cap: { en: "The hero *glows* in the buff's color.", ko: "주인공이 버프 *색으로* 빛나요." },
          add(w, b) { w.auraC = w.K[b.k][2]; w.aura = 1; },
          stack(w, b) { w.auraC = w.K[b.k][2]; w.aura = 1; },
          back(w, ctx) {
            if (!w.aura) return;
            w.aura = Math.max(0, w.aura - 0.012);
            ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, G - 65, 110, w.auraC, 0.55 * w.aura + 0.15); ctx.globalCompositeOperation = "source-over";
          },
        },
        {
          id: "arrows", name: { en: "Up Arrows", ko: "올라가는 화살표" }, param: "6 ▲ rising",
          cap: { en: "*Up arrows* float off the body. Stronger!", ko: "몸에서 *▲*가 떠올라요. 세졌다!" },
          add(w, b) { for (let i = 0; i < 6; i++) w.spawn({ type: "text", text: "▲", x: 270 + rand(-50, 50), y: G - rand(20, 110), vy: rand(-140, -80), life: 0.7, size: rand(14, 22), color: w.K[b.k][1] }); },
          stack(w, b) { for (let i = 0; i < 4; i++) w.spawn({ type: "text", text: "▲", x: 270 + rand(-50, 50), y: G - rand(20, 110), vy: rand(-140, -80), life: 0.7, size: rand(14, 22), color: w.K[b.k][1] }); },
        },
        {
          id: "bump", name: { en: "Stack Bump", ko: "중첩 톡" }, param: "scale 1.3 + x2",
          cap: { en: "Same buff again? *Bump* it and show *x2*.", ko: "같은 버프면 *톡* 튀고 *x2*를 보여줘요." },
          stack(w, b) { b.bump = 1; w.spawn({ type: "text", text: "x" + b.n, x: b.x + 22, y: b.y - 34, vy: -60, life: 0.6, size: 22, color: "#c6f432" }); },
        },
        {
          id: "timer", name: { en: "Timer Ring", ko: "남은 시간 테" }, param: "ring + blink < 1.2s",
          cap: { en: "A *ring* runs out. It *blinks* before it ends.", ko: "*테두리*가 줄고, 끝나기 전엔 *깜빡*." },
          icon(w, ctx, b) {
            if (b.t < 1.2 && Math.floor(b.t * 8) % 2) ctx.globalAlpha = 0.35;
            ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 3;
            ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 35, -Math.PI / 2, -Math.PI / 2 + TAU * b.t / 4.5); ctx.stroke();
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising chime",
          cap: { en: "Each stack rings *a little higher*.", ko: "겹칠수록 *한 음씩* 높게 *띠링*." },
          add(w) { w.sfx.chime(0); },
          stack(w, b) { w.sfx.chime(b.n * 2); },
        },
      ],
    },

    /* 5. 독 */
    {
      id: "rpg-poison", cat: "rpg", view: "side",
      title: { en: "Make poison *look sick*", ko: "독이 *독하게* 보이게" },
      intro: { en: "HP keeps dropping. *Why?*", ko: "체력이 계속 줄어요. *왜요?*" },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 110, h: 120 }); w.foe = w.actor("foe", { home: 400, h: 150, hp: 120 });
        w.foe.psn = 0; w.foe.pT = 0; w.foe.pt = 0; w.barCol = "#ef4444";
      },
      fire(w) {
        const p = paw(w), f = w.foe;
        w.shoot({ x: p.x, y: p.y, vx: 700, vy: -300, g: 900, r: 7, color: "#a855f7", hitX: f.x - 30, onHit: () => { f.psn = 4; f.pT = 0.3; w.emit("apply", f); } });
      },
      update(w, dt) {
        const f = w.foe; f.pt = Math.max(0, f.pt - dt * 2);
        if (f.psn <= 0) return;
        f.pT -= dt;
        if (f.pT <= 0) {
          f.pT = 0.38; f.psn--; f.hp -= 7;
          w.emit("tick", f, 7);
          if (f.hp <= 0) { f.hp = f.maxHp; f.hpLag = f.maxHp; }
        }
      },
      drawFront(w, ctx) { w.emit("fx", ctx); },
      drawHud(w, ctx) { hpBar(ctx, w.foe, w.foe.psn > 0 ? w.barCol : "#ef4444"); w.emit("hud", ctx); },
      steps: [
        {
          id: "tint", name: { en: "Sick Tint", ko: "몸 색이 변함" }, param: "purple pulse",
          cap: { en: "Tint the body *purple* and let it *pulse*.", ko: "몸을 *보라색*으로, *울렁울렁*." },
          tick(w, f) { f.pt = 1; },
          fx(w, ctx) { const f = w.foe; if (f.psn > 0 || f.pt > 0) overlay(ctx, f, tintSpr("foe", "#a855f7").c, 0.3 + 0.35 * f.pt); },
        },
        {
          id: "bubbles", name: { en: "Bubbles", ko: "보글보글 거품" }, param: "rise + pop",
          cap: { en: "*Bubbles* rise off the body while it lasts.", ko: "독이 도는 동안 *보글보글*." },
          update(w) {
            const f = w.foe; if (f.psn <= 0 || Math.random() > 0.45) return;
            w.spawn({ type: "ring", add: false, x: f.x + rand(-45, 45), y: G - rand(20, 120), vy: rand(-90, -40), size: rand(4, 9), life: rand(0.5, 0.9), w: 3, color: "216,180,254" });
          },
        },
        {
          id: "numbers", name: { en: "Tick Numbers", ko: "틱 숫자" }, param: "purple · small",
          cap: { en: "Every tick shows a *small purple* number.", ko: "틱마다 *작은 보라색* 숫자." },
          tick(w, f, d) { w.spawn({ type: "text", text: String(d), x: f.x + rand(-40, 40), y: G - 120, vy: -70, life: 0.7, size: 28, color: "#d8b4fe" }); },
        },
        {
          id: "flinch", name: { en: "Tick Flinch", ko: "틱마다 움찔" }, param: "squash .9 · vib 4",
          cap: { en: "A tiny *flinch* on each tick. It hurts.", ko: "틱마다 살짝 *움찔*. 아파 보여요." },
          tick(w, f) { f.sx = 1.08; f.sy = 0.92; f.vib = 4; },
        },
        {
          id: "bar", name: { en: "Bar Turns Purple", ko: "체력바도 보라색" }, param: "while poisoned",
          cap: { en: "The *HP bar* turns purple too.", ko: "*체력바*까지 보라색으로." },
          apply(w) { w.barCol = "#a855f7"; },
        },
        {
          id: "badge", name: { en: "Status Badge", ko: "상태 아이콘" }, param: "drop icon + count",
          cap: { en: "A *badge* with ticks left, right by the bar.", ko: "체력바 옆에 *남은 횟수* 배지." },
          hud(w, ctx) { const f = w.foe; if (f.psn <= 0) return; slotIcon(ctx, "drop", f.x + 62, f.gy - f.h - 20, 13, "#c084fc"); T(ctx, String(f.psn), f.x + 76, f.gy - f.h - 6, 13, "#fff"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "splash / blub",
          cap: { en: "A wet *splat*, then soft *blubs* per tick.", ko: "철퍽 묻고, 틱마다 *뽀글*." },
          apply(w) { w.play(() => nz({ type: "bandpass", f: 900, f2: 300, q: 2, dur: 0.18, vol: 0.4 })); },
          tick(w) { w.play(() => tn({ f: rand(300, 420), f2: 700, dur: 0.07, vol: 0.2 })); },
        },
      ],
    },

    /* 6. 상태이상 아이콘 */
    {
      id: "rpg-status", cat: "rpg", view: "side",
      title: { en: "Make status effects *pop*", ko: "상태이상이 *딱* 보이게" },
      intro: { en: "Tiny grey word. *Stunned?*", ko: "작은 회색 글씨. *기절한 거예요?*" },
      interval: 1.4, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 110, h: 120 }); w.foe = w.actor("foe", { home: 400, h: 150 });
        w.S = [
          { name: "STUN", icon: "swirl", col: "#facc15", rgb: "250,204,21" },
          { name: "FREEZE", icon: "snow", col: "#67e8f9", rgb: "103,232,249" },
          { name: "SLEEP", icon: "moon", col: "#a5b4fc", rgb: "165,180,252" },
        ];
        w.st = null; w.cnt = 0; w.badge = { sc: 1 };
      },
      fire(w) {
        const p = paw(w), f = w.foe, s = w.S[w.cnt++ % 3];
        w.shoot({ x: p.x, y: p.y, vx: 900, vy: 0, r: 6, color: s.col, hitX: f.x - 40, onHit: () => { w.st = s; f.rot = 0; f.ox += 12; w.emit("apply", s, f); } });
      },
      update(w) { if (!w.on("body")) w.foe.rot = 0; },
      drawFront(w, ctx) { if (w.st) w.emit("fx", ctx, w.st); },
      drawHud(w, ctx) {
        const s = w.st, f = w.foe;
        if (!s) return;
        if (!w.on("badge")) { label(ctx, s.name.toLowerCase(), f.x, f.gy - f.h - 22, 15, "#9ca3af", "center", FONT, 600); return; }
        ctx.save(); ctx.translate(f.x, f.gy - f.h - 34); ctx.scale(w.badge.sc, w.badge.sc);
        ctx.fillStyle = "rgba(10,12,20,0.85)"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
        ctx.strokeStyle = s.col; ctx.lineWidth = 3; ctx.stroke();
        icon(ctx, s.icon, 0, 0, 14, s.col); ctx.restore();
      },
      steps: [
        {
          id: "badge", name: { en: "Icon Badge", ko: "아이콘 배지" }, param: "pop 0 → 1.0 back",
          cap: { en: "Swap the word for a *big icon* that *pops* in.", ko: "글씨 대신 *큰 아이콘*이 *톡*." },
          apply(w) { w.badge.sc = 0; w.tween(w.badge, { sc: 1 }, 0.32, "back"); },
        },
        {
          id: "ring", name: { en: "Color Burst", ko: "상태 색 터짐" }, param: "ring + glow",
          cap: { en: "Burst in the *status color*. Color = meaning.", ko: "*상태 색*으로 터져요. 색이 곧 뜻." },
          apply(w, s, f) {
            w.spawn({ type: "ring", x: f.x, y: G - 75, size: 20, size1: 130, life: 0.45, w: 10, color: s.rgb });
            w.spawn({ type: "glow", under: true, x: f.x, y: G - 75, size: 140, size1: 60, life: 0.7, color: s.rgb });
            burst(w, f.x, G - 75, 14, s.rgb, [200, 480], 3);
          },
        },
        {
          id: "callout", name: { en: "Callout", ko: "큰 글자" }, param: "34px · rise",
          cap: { en: "Shout it once: a *big word* rises and fades.", ko: "한 번은 크게: *큰 글자*가 떠올라요." },
          apply(w, s, f) { w.spawn({ type: "text", text: s.name + "!", x: f.x - 40, y: G - 228, vy: -20, life: 1, size: 34, color: s.col }); },
        },
        {
          id: "body", name: { en: "Body Reacts", ko: "몸이 반응" }, param: "tilt / ice / droop",
          cap: { en: "The body *changes*: tilts, freezes, slumps.", ko: "몸이 *달라져요*. 비틀, 꽁꽁, 축." },
          apply(w, s, f) { f.vib = 6; if (s.name === "STUN") f.rot = 0.12; if (s.name === "SLEEP") f.rot = -0.08; },
          fx(w, ctx, s) {
            const f = w.foe;
            if (s.name === "FREEZE") overlay(ctx, f, f.s.cyan, 0.55);
            if (s.name === "STUN") f.rot = Math.sin(w.time * 5) * 0.08;
          },
        },
        {
          id: "loop", name: { en: "Idle Loop", ko: "계속 도는 표시" }, param: "stars / Zzz / frost",
          cap: { en: "Keep a *loop* going: stars, *Zzz*, frost.", ko: "*계속 돌아요*. 별, *Zzz*, 서리." },
          fx(w, ctx, s) {
            const f = w.foe, cy = G - 150;
            if (s.name === "STUN") for (let i = 0; i < 3; i++) { const a = w.time * 5 + i * TAU / 3; ctx.fillStyle = s.col; star5(ctx, f.x + Math.cos(a) * 42, cy + Math.sin(a) * 12, 9); ctx.fill(); }
            if (s.name === "SLEEP") for (let i = 0; i < 3; i++) { const t = (w.time * 0.8 + i / 3) % 1; T(ctx, "Z", f.x + 30 + t * 40, cy - t * 50, 14 + t * 14, s.col); }
            if (s.name === "FREEZE") for (let i = 0; i < 4; i++) icon(ctx, "snow", f.x - 50 + i * 33, G - 40 - ((w.time * 40 + i * 37) % 110), 7, s.col);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "one per status",
          cap: { en: "Each status gets *its own* sound.", ko: "상태마다 *다른* 소리." },
          apply(w, s) {
            if (s.name === "STUN") w.sfx.ping();
            if (s.name === "FREEZE") w.play(() => nz({ type: "highpass", f: 5000, dur: 0.3, vol: 0.3 }));
            if (s.name === "SLEEP") w.play(() => tn({ type: "triangle", f: 600, f2: 300, dur: 0.5, vol: 0.18 }));
          },
        },
      ],
    },

    /* 7. 회복 숫자 */
    {
      id: "rpg-heal", cat: "rpg", view: "side",
      title: { en: "Make heals *feel good*", ko: "회복이 *기분 좋게*" },
      intro: { en: "White number, bouncing. Hit or *heal*?", ko: "흰 숫자가 튀어요. 맞은 거예요, *나은* 거예요?" },
      interval: 1.0, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("hero", { home: 270, h: 130 });
        const h = w.hero; h.maxHp = 100; h.hp = 30; h.shown = 30; h.glow = 0; w.cnt = 0;
      },
      fire(w) {
        const h = w.hero, big = ++w.cnt % 3 === 0, a = big ? 48 : 24;
        if (h.hp >= h.maxHp) { h.hp = 30; h.shown = 30; }
        h.hp = Math.min(h.maxHp, h.hp + a);
        const n = { text: String(a), x: 270 + rand(-20, 20), y: G - 196, vx: rand(-40, 40), vy: -320, g: 900, life: 1.2, size: big ? 40 : 30, color: "#ffffff" };
        w.emit("heal", h, n, big);
        w.spawn(Object.assign({ type: "text" }, n));
      },
      update(w, dt) { const h = w.hero; h.glow = Math.max(0, h.glow - dt * 1.2); if (!w.on("bar")) h.shown = h.hp; },
      drawFront(w, ctx) { const h = w.hero; if (h.glow > 0) overlay(ctx, h, tintSpr("hero", "#4ade80").c, h.glow * 0.55); },
      drawHud(w, ctx) {
        const h = w.hero, X = 200, Y = 128, W = 140;
        panel(ctx, X - 3, Y - 3, W + 6, 16, 6, "rgba(0,0,0,0.65)", null);
        ctx.fillStyle = "#4ade80"; ctx.fillRect(X, Y, W * h.hp / h.maxHp, 10);
        ctx.fillStyle = "#ef4444"; ctx.fillRect(X, Y, W * h.shown / h.maxHp, 10);
      },
      steps: [
        {
          id: "green", name: { en: "Green + Plus", ko: "초록색 + 기호" }, param: "#4ade80 · \"+\"",
          cap: { en: "Heals are *green* and start with *+*.", ko: "회복은 *초록색*, 앞에 *+*." },
          heal(w, h, n) { n.text = "+" + n.text; n.color = "#4ade80"; },
        },
        {
          id: "float", name: { en: "Float Up Gently", ko: "천천히 떠오름" }, param: "vy -60 · no gravity",
          cap: { en: "Damage *drops*. Heals *float up* slowly.", ko: "피해는 *떨어지고*, 회복은 *둥실* 떠올라요." },
          heal(w, h, n) { n.vx = 0; n.vy = -60; n.g = 0; n.life = 1.5; },
        },
        {
          id: "bar", name: { en: "Green Lead Bar", ko: "초록 선행 바" }, param: "green now · red eases",
          cap: { en: "*Green* shows the gain first, red *catches up*.", ko: "*초록*이 먼저 차고, 빨강이 *따라와요*." },
          update(w, dt) { const h = w.hero; h.shown += (h.hp - h.shown) * Math.min(1, dt * 2.2); },
        },
        {
          id: "plus", name: { en: "Plus Sparkles", ko: "+ 반짝이" }, param: "8 \"+\" rising",
          cap: { en: "Little *+ signs* drift up around the body.", ko: "몸 주위로 작은 *+*가 피어올라요." },
          heal(w) { for (let i = 0; i < 8; i++) w.spawn({ type: "text", text: "+", x: 270 + rand(-60, 60), y: G - rand(10, 120), vy: rand(-90, -50), life: rand(0.9, 1.4), size: rand(14, 24), color: "#86efac" }); },
        },
        {
          id: "glow", name: { en: "Soft Glow", ko: "부드러운 빛" }, param: "green tint · no flash",
          cap: { en: "Glow *softly green*. No white flash. That's for hits.", ko: "*초록빛*으로 은은하게. 하얀 번쩍임은 맞을 때만." },
          heal(w, h) { h.glow = 1; w.spawn({ type: "ring", flat: true, x: 270, y: G, size: 30, size1: 110, life: 0.9, w: 6, color: "74,222,128" }); },
        },
        {
          id: "big", name: { en: "Big Heal Bloom", ko: "큰 회복은 활짝" }, param: "every 3rd · ×2",
          cap: { en: "Big heals *bloom*: bigger number, a beam.", ko: "큰 회복은 *활짝*. 숫자도 크게, 빛기둥까지." },
          heal(w, h, n, big) {
            if (!big) return;
            n.size = 52;
            w.spawn({ type: "beam", x: 270, y: G, size: 50, h: 300, life: 1, color: "74,222,128" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "soft rising chime",
          cap: { en: "Soft *rising* chimes. Never a thud.", ko: "부드럽게 *올라가는* 띠링. 쿵 소리는 금지." },
          heal(w, h, n, big) { w.sfx.chime(0); w.after(0.08, () => w.sfx.chime(big ? 7 : 4)); },
        },
      ],
    },

    /* 8. 부활 */
    {
      id: "rpg-revive", cat: "rpg", view: "side",
      title: { en: "Make revives feel *holy*", ko: "부활을 *성스럽게*" },
      intro: { en: "Dead. Then *pop*, standing. Huh?", ko: "쓰러져 있다가 *뿅*, 서 있어요." },
      interval: 2.6, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 270, h: 130 });
        const h = w.hero; h.maxHp = 100; h.shown = 0; w.down = 1; h.hp = 0;
        w.lie = () => { h.rot = -Math.PI / 2; h.oy = h.h / 2 - h.w / 2; h.hp = 0; h.shown = 0; w.down = 1; };
        w.lie();
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero;
        w.emit("revive", h);
        const stand = () => { h.rot = 0; h.oy = 0; h.hp = h.maxHp; w.down = 0; w.emit("stand", h); };
        if (w.on("rise")) w.after(0.25, () => w.tween(h, { rot: 0, oy: -26 }, 0.45, "out", () => { stand(); h.oy = -26; w.tween(h, { oy: 0 }, 0.2, "in"); }));
        else stand();
        w.after(2.1, () => { w.lie(); w.busy = false; });
      },
      update(w, dt) { const h = w.hero; if (!w.on("bar")) h.shown = h.hp; },
      drawFront(w, ctx) { if (w.down) overlay(ctx, w.hero, tintSpr("hero", "#1e293b").c, 0.55); },
      drawHud(w, ctx) {
        const h = w.hero, X = 205, Y = 100, W = 130;
        panel(ctx, X - 3, Y - 3, W + 6, 16, 6, "rgba(0,0,0,0.65)", null);
        ctx.fillStyle = "#ef4444"; ctx.fillRect(X, Y, W * h.shown / h.maxHp, 10);
        if (w.down) T(ctx, "KO", 270, 80, 16, "#94a3b8");
      },
      steps: [
        {
          id: "light", name: { en: "Light From Above", ko: "위에서 내리는 빛" }, param: "beam 1.2s",
          cap: { en: "A *beam* comes down first. Something is coming.", ko: "먼저 *빛*이 내려와요. 뭔가 온다는 신호." },
          revive(w) {
            w.spawn({ type: "beam", under: true, x: 270, y: G, size: 70, h: 360, life: 1.4, color: "253,230,138" });
            w.spawn({ type: "glow", under: true, x: 270, y: G - 30, size: 150, size1: 90, life: 1.3, color: "253,230,138" });
          },
        },
        {
          id: "soul", name: { en: "Soul Returns", ko: "영혼이 돌아옴" }, param: "3 wisps spiral in",
          cap: { en: "Wisps *spiral down* into the body.", ko: "빛 조각이 *빙글빙글* 몸으로 들어가요." },
          revive(w) {
            for (let i = 0; i < 3; i++) {
              const a = i * TAU / 3;
              w.spawn({ type: "glow", seek: true, x: 270 + Math.cos(a) * 110, y: 60 + Math.sin(a) * 30, tx: 270, ty: G - 40, life: 0.5 + i * 0.08, size: 18, color: "255,255,255" });
            }
          },
        },
        {
          id: "rise", name: { en: "Slow Rise", ko: "천천히 일어남" }, param: "450ms + float",
          cap: { en: "*Rise slowly*, hover a beat, then land.", ko: "*천천히* 일어나서, 살짝 떴다가 착지." },
          stand(w, h) { dust(w, h.x, G, 6); },
        },
        {
          id: "feathers", name: { en: "Feathers", ko: "깃털" }, param: "10 · slow drift",
          cap: { en: "*Feathers* drift down. Slow is holy.", ko: "*깃털*이 살랑살랑. 느려야 성스러워요." },
          revive(w) { for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: 270 + rand(-110, 110), y: rand(40, 120), vx: rand(-30, 30), vy: rand(20, 60), vr: rand(-3, 3), drag: 0.5, life: 2, size: rand(4, 7), color: "255,255,255", hold: true }); },
        },
        {
          id: "bar", name: { en: "HP Refills", ko: "체력이 차오름" }, param: "0 → 100 · 600ms",
          cap: { en: "HP *fills up* from zero. Watch it come back.", ko: "체력이 0부터 *차올라요*. 살아나는 게 보여요." },
          update(w, dt) { const h = w.hero; h.shown += (h.hp - h.shown) * Math.min(1, dt * 4); },
        },
        {
          id: "flash", name: { en: "Stand-up Flash", ko: "일어서며 번쩍" }, param: "ring + REVIVE",
          cap: { en: "On your feet: *flash*, a *ring*, a word.", ko: "일어서면 *번쩍*, *고리*, 글자 한 마디." },
          stand(w, h) {
            h.flash = 1.2;
            w.spawn({ type: "ring", x: 270, y: G - 65, size: 20, size1: 150, life: 0.6, w: 8, color: "253,230,138" });
            w.spawn({ type: "text", text: "REVIVE", x: 270, y: 60, vy: -10, life: 1.3, size: 34, color: "#fde68a" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "choir-ish swell",
          cap: { en: "A *swelling* tone, then a bright *ding*.", ko: "*웅~* 차오르다가 맑은 *띵*." },
          revive(w) { w.play(() => { tn({ type: "triangle", f: 330, f2: 660, dur: 0.7, vol: 0.12 }); tn({ f: 495, f2: 990, dur: 0.7, vol: 0.08 }); }); },
          stand(w) { w.sfx.chime(7); },
        },
      ],
    },

    /* 9. 포션 사용 */
    {
      id: "rpg-potion", cat: "rpg", view: "side",
      title: { en: "Make potions feel *drunk*", ko: "포션을 *마신* 느낌으로" },
      intro: { en: "Tap. Number goes up. *Gulp?*", ko: "누르면 숫자만 올라요. *꿀꺽*은요?" },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        potionSpr();
        w.hero = w.actor("hero", { home: 230, h: 130 });
        const h = w.hero; h.maxHp = 100; h.hp = 35; h.shown = 35;
        w.Q = { n: 5, sc: 1, bump: 0 }; w.bottle = null;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, Q = w.Q;
        Q.n = Q.n > 1 ? Q.n - 1 : 5;
        w.emit("use", Q);
        const drink = () => { h.hp = h.maxHp; w.emit("drink", h); };
        if (w.on("toss")) w.after(0.4, drink); else drink();
        w.after(1.2, () => { h.hp = 35; h.shown = 35; w.busy = false; });
      },
      update(w, dt) {
        const Q = w.Q; Q.sc += (1 - Q.sc) * Math.min(1, dt * 10); Q.bump = Math.max(0, Q.bump - dt * 3);
        if (!w.on("fill")) w.hero.shown = w.hero.hp;
        const b = w.bottle; if (b) { b.t += dt; if (b.t > b.dur) w.bottle = null; }
      },
      drawFront(w, ctx) {
        const b = w.bottle; if (!b) return;
        const k = Math.min(1, b.t / b.dur);
        if (b.kind === "fly") { const e = E.out(k); drawImg(ctx, SPR["rpg-potion"].c, b.x0 + (b.x1 - b.x0) * e, b.y0 + (b.y1 - b.y0) * e - Math.sin(k * Math.PI) * 90, 34, k * 8); }
        else drawImg(ctx, SPR["rpg-potion"].c, w.hero.x + 30, G - 118, 30, -0.4 - k * 1.6);
      },
      drawHud(w, ctx) {
        const h = w.hero, Q = w.Q, X = 165, Y = 104, W = 130;
        panel(ctx, X - 3, Y - 3, W + 6, 16, 6, "rgba(0,0,0,0.65)", null);
        ctx.fillStyle = "#fff"; ctx.fillRect(X, Y, W * h.hp / h.maxHp, 10);
        ctx.fillStyle = "#ef4444"; ctx.fillRect(X, Y, W * h.shown / h.maxHp, 10);
        ctx.save(); ctx.translate(460, 92); ctx.scale(Q.sc, Q.sc);
        panel(ctx, -30, -30, 60, 60, 12, "#262b36", "rgba(255,255,255,0.25)", 2);
        drawImg(ctx, SPR["rpg-potion"].c, 0, -2, 34);
        T(ctx, "x" + Q.n, 18, 20, 16 * (1 + Q.bump * 0.5), Q.bump > 0.2 ? "#fca5a5" : "#fff");
        ctx.restore();
      },
      steps: [
        {
          id: "press", name: { en: "Slot Press", ko: "슬롯 눌림" }, param: "0.8 · count bump",
          cap: { en: "The slot *squashes*, the count *ticks down*.", ko: "슬롯이 *꾹*, 개수가 *톡* 줄어요." },
          use(w, Q) { Q.sc = 0.8; Q.bump = 1; },
        },
        {
          id: "toss", name: { en: "Bottle Flies", ko: "병이 날아옴" }, param: "arc 400ms",
          cap: { en: "The bottle *flies* from the slot to the hand.", ko: "병이 슬롯에서 *손으로* 날아와요." },
          use(w) { w.bottle = { kind: "fly", t: 0, dur: 0.4, x0: 460, y0: 92, x1: w.hero.x + 30, y1: G - 110 }; },
        },
        {
          id: "gulp", name: { en: "Gulp", ko: "꿀꺽" }, param: "tilt + 2 squashes",
          cap: { en: "Tip the bottle, *gulp gulp*. The body bobs.", ko: "병을 기울이고 *꿀꺽꿀꺽*. 몸도 들썩." },
          drink(w, h) {
            w.bottle = { kind: "tilt", t: 0, dur: 0.45 };
            h.sx = 0.92; h.sy = 1.08; w.after(0.2, () => { h.sx = 0.92; h.sy = 1.08; });
          },
        },
        {
          id: "spiral", name: { en: "Liquid Spiral", ko: "붉은 소용돌이" }, param: "14 orbs · spiral up",
          cap: { en: "Red light *spirals up* the body.", ko: "붉은 빛이 몸을 *감고 올라가요*." },
          drink(w, h) {
            for (let i = 0; i < 14; i++) w.after(i * 0.04, () => {
              const a = i * 0.9;
              w.spawn({ type: "glow", x: h.x + Math.cos(a) * 50, y: G - 10 - i * 9, vx: -Math.sin(a) * 60, vy: -40, size: 14, size1: 3, life: 0.9, color: "251,113,133" });
            });
          },
        },
        {
          id: "fill", name: { en: "Smooth Refill", ko: "부드럽게 차오름" }, param: "white lead · ease",
          cap: { en: "A *white lead* jumps, red *glides* after it.", ko: "*흰 선*이 먼저, 빨강이 *스르륵* 따라와요." },
          update(w, dt) { const h = w.hero; h.shown += (h.hp - h.shown) * Math.min(1, dt * 3); },
        },
        {
          id: "toss2", name: { en: "Toss the Empty", ko: "빈 병 던지기" }, param: "spin · bounce",
          cap: { en: "Toss the *empty bottle*. Let it *clink* and roll.", ko: "*빈 병*은 휙. *딸그락* 굴러가요." },
          drink(w, h) { w.after(0.45, () => w.spawn({ type: "ghost", img: SPR["rpg-potion"].c, w: 26, h: 35, top: true, alpha0: 0.9, add: false, x: h.x + 30, y: G - 110, vx: 220, vy: -380, g: 1400, ground: true, bounce: 0.4, gy: G - 16, life: 1.1, hold: true })); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pop · gulp · clink",
          cap: { en: "Cork *pop*, two *gulps*, a glass *clink*.", ko: "*뽁*, *꿀꺽꿀꺽*, *쨍그랑*." },
          use(w) { w.sfx.pop(); },
          drink(w) { w.play(() => { tn({ f: 220, f2: 120, dur: 0.09, vol: 0.4 }); tn({ f: 200, f2: 110, dur: 0.09, vol: 0.4, delay: 0.2 }); tn({ type: "triangle", f: 2600, dur: 0.15, vol: 0.12, delay: 0.55 }); }); },
        },
      ],
    },

    /* 10. 장비 비교 */
    {
      id: "rpg-equip", cat: "rpg", view: "ui",
      title: { en: "Make gear swaps *comparable*", ko: "장비 교체를 *비교되게*" },
      intro: { en: "Numbers changed. *Better or worse?*", ko: "숫자는 바뀌었는데… *좋아진 거예요?*" },
      interval: 1.5, stepDur: 3.8,
      drawFloor() {},
      setup(w) {
        w.I = [
          { name: "Iron Sword", col: "#cbd5e1", st: [42, 10, 12, 5] },
          { name: "Flame Blade", col: "#fb923c", st: [58, 6, 12, 9] },
          { name: "Guard Saber", col: "#60a5fa", st: [49, 18, 8, 5] },
        ];
        w.k = 0; w.prev = w.I[0];
        w.rows = ["ATK", "DEF", "SPD", "CRIT"].map((n, i) => ({ n, v: w.I[0].st[i], shown: w.I[0].st[i], d: 0, hl: 0 }));
        w.slot = { oy: 0, old: null, oldY: 0, a: 0 }; w.pow = { v: 0, shown: 0, sc: 1 };
        w.pow.v = w.pow.shown = w.I[0].st.reduce((s, v) => s + v * 10, 0);
      },
      fire(w) {
        const old = w.I[w.k % 3], it = w.I[++w.k % 3];
        w.rows.forEach((r, i) => { r.d = it.st[i] - old.st[i]; r.v = it.st[i]; });
        w.pow.v = it.st.reduce((s, v) => s + v * 10, 0);
        w.emit("equip", it, old);
      },
      update(w, dt) {
        for (const r of w.rows) { r.hl = Math.max(0, r.hl - dt * 1.2); if (!w.on("roll")) r.shown = r.v; }
        const P = w.pow; P.sc += (1 - P.sc) * Math.min(1, dt * 8); if (!w.on("power")) P.shown = P.v;
      },
      drawFront(w, ctx) {
        const it = w.I[w.k % 3], S = w.slot;
        panel(ctx, 50, 70, 180, 220, 16, "#1c2029");
        T(ctx, "WEAPON", 140, 92, 13, "#94a3b8", "center", 700);
        ctx.save(); ctx.beginPath(); ctx.rect(56, 104, 168, 150); ctx.clip();
        if (S.old) icon(ctx, "sword", 140, 178 + S.oldY, 46, S.old.col);
        icon(ctx, "sword", 140, 178 + S.oy, 46, it.col);
        ctx.restore();
        T(ctx, it.name, 140, 268, 17, it.col);
        panel(ctx, 250, 70, 240, 220, 16, "#1c2029");
        T(ctx, "POWER " + Math.round(w.pow.shown), 370 - 20, 96, 20 * w.pow.sc, "#c6f432");
        w.rows.forEach((r, i) => {
          const y = 140 + i * 40;
          if (r.hl > 0) panel(ctx, 260, y - 16, 220, 32, 8, `rgba(${r.d > 0 ? "74,222,128" : "248,113,113"},${r.hl * 0.35})`, null);
          T(ctx, r.n, 276, y, 16, "#94a3b8", "left", 700);
          T(ctx, String(Math.round(r.shown)), 380, y, 20, "#fff", "right");
          w.emit("row", ctx, r, y);
        });
      },
      steps: [
        {
          id: "arrows", name: { en: "Diff Arrows", ko: "증감 화살표" }, param: "▲ green · ▼ red",
          cap: { en: "*Green up*, *red down*. Read it in a glance.", ko: "*초록 위*, *빨강 아래*. 한눈에 읽혀요." },
          row(w, ctx, r, y) { if (r.d) tri(ctx, 400, y, 8, r.d > 0, r.d > 0 ? "#4ade80" : "#f87171"); },
        },
        {
          id: "delta", name: { en: "Delta Numbers", ko: "차이 숫자" }, param: "+16 / -4",
          cap: { en: "Show *how much*: +16, -4.", ko: "*얼마나* 바뀌었는지: +16, -4." },
          row(w, ctx, r, y) { if (r.d) T(ctx, (r.d > 0 ? "+" : "") + r.d, 418, y, 16, r.d > 0 ? "#4ade80" : "#f87171", "left"); },
        },
        {
          id: "roll", name: { en: "Rolling Values", ko: "굴러가는 숫자" }, param: "lerp ×5",
          cap: { en: "Values *roll* to the new number.", ko: "숫자가 새 값으로 *굴러가요*." },
          update(w, dt) { for (const r of w.rows) r.shown += (r.v - r.shown) * Math.min(1, dt * 5); },
        },
        {
          id: "flashrow", name: { en: "Row Highlight", ko: "줄 강조" }, param: "fade 800ms",
          cap: { en: "Changed rows *light up* in their color.", ko: "바뀐 줄이 제 색으로 *번쩍*." },
          equip(w) { for (const r of w.rows) if (r.d) r.hl = 1; },
        },
        {
          id: "swap", name: { en: "Item Swap", ko: "장비 교체 동작" }, param: "out ↓ · in ↓ bounce",
          cap: { en: "Old gear *drops out*, new gear *drops in*.", ko: "헌 장비는 *쑥 빠지고*, 새 장비가 *쿵*." },
          equip(w, it, old) {
            const S = w.slot; S.old = old; S.oldY = 0; S.oy = -170;
            w.tween(S, { oldY: 170 }, 0.25, "in", () => { S.old = null; });
            w.tween(S, { oy: 0 }, 0.4, "back");
          },
        },
        {
          id: "power", name: { en: "Power Total", ko: "전투력 합계" }, param: "roll + bump",
          cap: { en: "Sum it up in *one number* that bumps.", ko: "*숫자 하나*로 정리해요. 톡 튀면서." },
          equip(w, it, old) { w.pow.sc = 1.35; },
          update(w, dt) { const P = w.pow; P.shown += (P.v - P.shown) * Math.min(1, dt * 5); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clank · up/down tone",
          cap: { en: "Metal *clank*. Then a tone: *up* or *down*.", ko: "*철컥*, 그다음 *올라가는* 음 또는 *내려가는* 음." },
          equip(w, it, old) {
            w.sfx.thunk();
            const up = it.st.reduce((a, b) => a + b) >= old.st.reduce((a, b) => a + b);
            w.play(() => tn({ type: "triangle", f: up ? 660 : 520, f2: up ? 990 : 330, dur: 0.2, vol: 0.18, delay: 0.1 }));
          },
        },
      ],
    },

    /* 11. 강화 성공 */
    {
      id: "rpg-enhance-ok", cat: "rpg", view: "ui",
      title: { en: "Make upgrades feel *lucky*", ko: "강화 성공을 *짜릿하게*" },
      intro: { en: "+7 became +8. *Yay?*", ko: "+7이 +8이 됐어요. *와…?*" },
      interval: 1.7, stepDur: 4.0,
      drawFloor() {},
      setup(w) { swordSpr(); w.E = { lv: 7, sc: 1, shake: 0, glow: 0 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const E2 = w.E;
        const done = () => { E2.lv = E2.lv >= 12 ? 7 : E2.lv + 1; w.emit("success", E2); };
        if (w.on("charge")) { w.emit("charge", E2); w.after(0.5, done); } else done();
        w.after(1.25, () => { w.busy = false; });
      },
      update(w, dt) { const E2 = w.E; E2.sc += (1 - E2.sc) * Math.min(1, dt * 8); E2.shake = Math.max(0, E2.shake - dt); E2.glow = Math.max(0, E2.glow - dt * 0.6); },
      drawFront(w, ctx) {
        const E2 = w.E, sx = E2.shake > 0 ? rand(-3, 3) : 0;
        panel(ctx, 150, 250, 240, 30, 10, "#262b36");
        w.emit("aura", ctx, E2);
        drawImg(ctx, SPR["rpg-sword"].c, 270 + sx, 160, 56, 0.5);
        ctx.save(); ctx.translate(270, 300); ctx.scale(E2.sc, E2.sc); T(ctx, "+" + E2.lv, 0, 0, 30, "#fde047"); ctx.restore();
      },
      steps: [
        {
          id: "charge", name: { en: "Charge-up", ko: "두근두근 충전" }, param: "500ms · tremble",
          cap: { en: "Hold the result *half a second*. Let them sweat.", ko: "결과 전에 *0.5초* 뜸. 두근두근." },
          charge(w, E2) {
            E2.shake = 0.5;
            for (let i = 0; i < 14; i++) w.after(i * 0.03, () => { const a = rand(0, TAU); w.spawn({ type: "spark", seek: true, x: 270 + Math.cos(a) * 130, y: 160 + Math.sin(a) * 100, tx: 270, ty: 160, life: 0.3, size: 2.5, color: "253,224,71" }); });
            w.spawn({ type: "glow", x: 270, y: 160, size: 20, size1: 110, life: 0.5, color: "253,224,71" });
          },
        },
        {
          id: "strike", name: { en: "Strike Flash", ko: "깡! 번쩍" }, param: "white + star",
          cap: { en: "The result lands with a *white flash*.", ko: "결과는 *하얀 번쩍*과 함께." },
          success(w) { w.flash("255,255,255", 0.35); w.spawn({ type: "star", x: 270, y: 160, size: 90, life: 0.3, color: "255,255,255" }); },
        },
        {
          id: "level", name: { en: "Level Pop", ko: "숫자 팡" }, param: "scale 1.8 → 1",
          cap: { en: "The new *+8* pops *huge*, then settles.", ko: "새 *+8*이 *크게* 튀었다 자리 잡아요." },
          success(w, E2) { E2.sc = 2; },
        },
        {
          id: "rays", name: { en: "Gold Rays", ko: "금빛 광선" }, param: "14 rays · 1.4s",
          cap: { en: "Spin *gold rays* behind the item.", ko: "아이템 뒤로 *금빛 광선*이 돌아요." },
          success(w) { w.spawn({ type: "rays", x: 270, y: 160, size: 230, n: 14, vr: 1.2, life: 1.4, color: "253,224,71", under: true }); },
        },
        {
          id: "banner", name: { en: "SUCCESS Banner", ko: "성공 글자" }, param: "42px · lime",
          cap: { en: "Say it big: *SUCCESS*.", ko: "크게 말해줘요: *SUCCESS*." },
          success(w) { w.spawn({ type: "text", text: "SUCCESS", x: 270, y: 62, vy: -6, life: 1.4, size: 42, color: "#c6f432" }); },
        },
        {
          id: "aura", name: { en: "Tier Aura", ko: "단계별 오라" }, param: "blue → purple → gold",
          cap: { en: "Higher level, *stronger aura* color.", ko: "높을수록 오라 *색이 진화*해요." },
          success(w, E2) { E2.glow = 1; burst(w, 270, 160, 20, "253,224,71", [200, 520]); },
          aura(w, ctx, E2) {
            const c = E2.lv >= 11 ? "250,204,21" : E2.lv >= 9 ? "192,132,252" : "96,165,250";
            ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, 160, 90 + 40 * E2.glow, c, 0.5 + 0.4 * E2.glow); ctx.globalCompositeOperation = "source-over";
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hum → clang → fanfare",
          cap: { en: "Rising *hum*, a *clang*, a tiny *fanfare*.", ko: "*웅*, *깡*, 짧은 *빰빠밤*." },
          charge(w) { w.sfx.charge(); },
          success(w) { w.play(() => tn({ type: "triangle", f: 1800, f2: 1500, dur: 0.3, vol: 0.2 })); w.sfx.fanfare(); },
        },
      ],
    },

    /* 12. 강화 실패 */
    {
      id: "rpg-enhance-fail", cat: "rpg", view: "ui",
      title: { en: "Make failures *sting*", ko: "강화 실패는 *쓰리게*" },
      intro: { en: "+8 became +7. *Shrug.*", ko: "+8이 +7로. *아무 느낌 없죠?*" },
      interval: 1.8, stepDur: 4.0,
      drawFloor() {},
      setup(w) { swordSpr(); w.E = { lv: 9, sc: 1, shake: 0, grey: 0, oy: 0, ban: null }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const E2 = w.E;
        const done = () => { E2.lv = E2.lv <= 5 ? 9 : E2.lv - 1; w.emit("fail", E2); };
        if (w.on("charge")) { w.emit("charge", E2); w.after(0.5, done); } else done();
        w.after(1.35, () => { w.busy = false; });
      },
      update(w, dt) {
        const E2 = w.E; E2.shake = Math.max(0, E2.shake - dt); E2.grey = Math.max(0, E2.grey - dt * 0.6);
        const b = E2.ban; if (b) { b.vy += 500 * dt; b.y = Math.min(b.y + b.vy * dt, 64); b.rot += b.vr * dt; b.t -= dt; if (b.t <= 0) E2.ban = null; }
      },
      drawFront(w, ctx) {
        const E2 = w.E, sx = E2.shake > 0 ? rand(-3, 3) : 0;
        panel(ctx, 150, 250, 240, 30, 10, "#262b36");
        drawImg(ctx, SPR["rpg-sword"].c, 270 + sx, 160 + E2.oy, 56, 0.5);
        if (E2.grey > 0) drawImg(ctx, tintSpr("rpg-sword", "#3f3f46").c, 270 + sx, 160 + E2.oy, 56, 0.5, 1, 1, Math.min(1, E2.grey) * 0.8);
        w.emit("over", ctx, E2);
        T(ctx, "+" + E2.lv, 270, 300, 30, "#fde047");
      },
      steps: [
        {
          id: "charge", name: { en: "Same Suspense", ko: "똑같은 두근두근" }, param: "500ms · same as win",
          cap: { en: "Build up *exactly like a success*. Hope first.", ko: "성공할 때와 *똑같이* 뜸. 기대가 먼저예요." },
          charge(w, E2) {
            E2.shake = 0.5;
            for (let i = 0; i < 14; i++) w.after(i * 0.03, () => { const a = rand(0, TAU); w.spawn({ type: "spark", seek: true, x: 270 + Math.cos(a) * 130, y: 160 + Math.sin(a) * 100, tx: 270, ty: 160, life: 0.3, size: 2.5, color: "253,224,71" }); });
            w.spawn({ type: "glow", x: 270, y: 160, size: 20, size1: 110, life: 0.5, color: "253,224,71" });
          },
        },
        {
          id: "crack", name: { en: "Crack", ko: "금 가기" }, param: "3 cracks · hold 1.2s",
          cap: { en: "*Crack* lines run across the item.", ko: "아이템에 *쩍* 금이 가요." },
          fail(w) {
            for (let i = 0; i < 3; i++) {
              const pts = [[0, 0]]; let x = 0, y = 0;
              for (let k = 0; k < 5; k++) { x += rand(-14, 14); y += rand(10, 20) * (i === 1 ? -1 : 1); pts.push([x, y]); }
              w.spawn({ type: "crack", x: 270 + rand(-10, 10), y: 160, pts, w: 3, life: 1.3, hold: true, color: "255,255,255", add: false });
            }
          },
        },
        {
          id: "grey", name: { en: "Drained Color", ko: "색이 빠짐" }, param: "grey + sink 14px",
          cap: { en: "Color *drains* and the item *sinks* a little.", ko: "색이 *빠지고*, 아이템이 *축* 처져요." },
          fail(w, E2) { E2.grey = 1.4; E2.oy = 14; w.tween(E2, { oy: 0 }, 1.2, "inout"); w.flash("0,0,0", 0.45); },
        },
        {
          id: "drop", name: { en: "Level Falls", ko: "숫자가 떨어짐" }, param: "old +8 falls red",
          cap: { en: "The old *+8 falls* off in red.", ko: "예전 *+8이 툭* 떨어져요. 빨갛게." },
          fail(w, E2) { w.spawn({ type: "text", text: "+" + (E2.lv + 1), x: 300, y: 296, vx: 110, vy: -160, g: 700, life: 1.2, size: 30, color: "#f87171" }); },
        },
        {
          id: "banner", name: { en: "FAILED Droops", ko: "FAILED가 축 처짐" }, param: "fall + tilt",
          cap: { en: "*FAILED* doesn't pop. It *slumps*.", ko: "*FAILED*는 튀지 않아요. *축 처져요*." },
          fail(w, E2) { E2.ban = { y: 20, vy: 0, rot: 0, vr: 0.25, t: 1.5 }; },
          over(w, ctx, E2) {
            const b = E2.ban; if (!b) return;
            ctx.save(); ctx.globalAlpha = Math.min(1, b.t * 2); ctx.translate(270, b.y); ctx.rotate(b.rot); T(ctx, "FAILED", 0, 0, 40, "#f87171"); ctx.restore();
          },
        },
        {
          id: "smoke", name: { en: "Smoke Puff", ko: "연기 피식" }, param: "8 grey puffs",
          cap: { en: "A sad little *puff of smoke*.", ko: "*피식*, 연기 한 줌." },
          fail(w) { for (let i = 0; i < 10; i++) w.spawn({ type: "smoke", x: 270 + rand(-50, 50), y: 200 + rand(-60, 40), vx: rand(-90, 90), vy: rand(-50, -15), drag: 1, size: rand(6, 10), size1: rand(18, 26), life: rand(1, 1.5), color: "90,90,100", add: false }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack + falling tone",
          cap: { en: "A *crack*, then a *falling* tone.", ko: "*쩍*, 그리고 *내려가는* 음." },
          charge(w) { w.sfx.charge(); },
          fail(w) { w.play(() => { nz({ type: "highpass", f: 2500, dur: 0.12, vol: 0.5 }); tn({ type: "square", f: 330, f2: 110, dur: 0.6, vol: 0.12, delay: 0.1 }); }); },
        },
      ],
    },

    /* 13. 가챠 등급 공개 */
    {
      id: "rpg-gacha", cat: "rpg", view: "ui",
      title: { en: "Make gacha reveals *tense*", ko: "뽑기 공개를 *두근두근*" },
      intro: { en: "Rare or common, *same moment*.", ko: "레어든 꽝이든 *똑같이* 나와요." },
      interval: 2.1, stepDur: 4.2,
      drawFloor() {},
      setup(w) {
        w.RAR = [{ n: "R", col: "#60a5fa", rgb: "96,165,250" }, { n: "SR", col: "#c084fc", rgb: "192,132,252" }, { n: "SSR", col: "#facc15", rgb: "250,204,21" }];
        w.P = { r: 2, face: false, sx: 1, stars: 0, shake: 0, glow: 0 }; w.cnt = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const P = w.P;
        P.r = [2, 0, 1, 2][w.cnt++ % 4]; P.face = false; P.stars = 0; P.glow = 0;
        w.emit("pull", P);
        const delay = (w.on("flip") ? 0.2 : 0.3) + (w.on("tease") ? 0.2 * P.r : 0);
        w.after(delay, () => { P.face = true; P.stars = P.r + 1; w.emit("reveal", P, w.RAR[P.r]); });
        w.after(1.9, () => { w.busy = false; });
      },
      update(w, dt) { const P = w.P; P.shake = Math.max(0, P.shake - dt); },
      drawFront(w, ctx) {
        const P = w.P, R2 = w.RAR[P.r], x = 270 + (P.shake > 0 ? rand(-1, 1) * 4 * P.r : 0), y = 170;
        w.emit("behind", ctx, P, R2);
        ctx.save(); ctx.translate(x, y); ctx.scale(P.sx, 1);
        if (!P.face) {
          panel(ctx, -62, -88, 124, 176, 12, "#312e81", "rgba(255,255,255,0.4)", 3);
          ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
          for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 22 - 40, -80); ctx.lineTo(i * 22 + 40, 80); ctx.stroke(); }
          T(ctx, "?", 0, 0, 56, "rgba(255,255,255,0.6)");
        } else {
          panel(ctx, -62, -88, 124, 176, 12, "#1e1b2e", R2.col, 4);
          icon(ctx, P.r === 2 ? "star" : P.r === 1 ? "sword" : "shield", 0, -14, 38, R2.col);
          T(ctx, R2.n, 0, 44, 26, R2.col);
          for (let i = 0; i < P.stars; i++) { ctx.fillStyle = "#fde047"; star5(ctx, (i - (P.r) / 2) * 22, 70, 9); ctx.fill(); }
        }
        ctx.restore();
      },
      steps: [
        {
          id: "flip", name: { en: "Card Flip", ko: "카드 뒤집기" }, param: "200ms · back ease",
          cap: { en: "Show the *back* first, then *flip* it.", ko: "*뒷면*부터 보여주고 *휙* 뒤집어요." },
          pull(w, P) { P.sx = 1; w.tween(P, { sx: 0.05 }, 0.2, "in"); },
          reveal(w, P) { P.sx = 0.05; w.tween(P, { sx: 1 }, 0.25, "back"); },
        },
        {
          id: "tease", name: { en: "Tease the Tier", ko: "등급 예고" }, param: "+0.2s per tier",
          cap: { en: "Rarer card? *Shake longer* and glow its color *first*.", ko: "높은 등급일수록 *오래 떨고*, 색을 *먼저* 흘려요." },
          pull(w, P) { P.shake = 0.2 * P.r + 0.2; P.glow = P.r ? 0.5 : 0; },
          behind(w, ctx, P, R2) { if (!P.face && P.glow) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, 170, 130, R2.rgb, 0.6); ctx.globalCompositeOperation = "source-over"; } },
        },
        {
          id: "glow", name: { en: "Rarity Glow", ko: "등급 색 후광" }, param: "glow r 150",
          cap: { en: "Behind the card, a *halo in its tier color*.", ko: "카드 뒤에 *등급 색* 후광." },
          behind(w, ctx, P, R2) { if (P.face) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, 170, 150, R2.rgb, 0.4 + 0.25 * P.r); ctx.globalCompositeOperation = "source-over"; } },
        },
        {
          id: "burst", name: { en: "Tiered Burst", ko: "등급별 터짐" }, param: "R ring · SSR rays+beam",
          cap: { en: "Bigger tier, *bigger burst*. SSR gets *everything*.", ko: "등급이 높을수록 *크게*. SSR은 *전부*." },
          reveal(w, P, R2) {
            w.spawn({ type: "ring", x: 270, y: 170, size: 60, size1: 120 + 60 * P.r, life: 0.6, w: 8, color: R2.rgb });
            if (P.r >= 1) burst(w, 270, 170, 12 + 12 * P.r, R2.rgb, [200, 600]);
            if (P.r === 2) { w.spawn({ type: "rays", x: 270, y: 170, size: 260, n: 16, vr: 1, life: 1.6, color: R2.rgb, under: true }); w.spawn({ type: "beam", x: 270, y: 360, size: 80, h: 420, life: 1.2, color: R2.rgb, under: true }); }
          },
        },
        {
          id: "stars", name: { en: "Star Stamp", ko: "별 하나씩 쾅" }, param: "120ms apart",
          cap: { en: "Stars *stamp in one by one*. Count along.", ko: "별이 *하나씩* 쾅쾅. 같이 세게 돼요." },
          reveal(w, P) {
            P.stars = 0;
            for (let i = 0; i <= P.r; i++) w.after(0.25 + i * 0.14, () => { P.stars = i + 1; w.spawn({ type: "star", x: 270 + (i - P.r / 2) * 22, y: 240, size: 22, life: 0.3, color: "253,224,71" }); w.sfx.blip(3 + i * 3); });
          },
        },
        {
          id: "flash", name: { en: "SSR Flash", ko: "최고 등급 번쩍" }, param: "flash + shake",
          cap: { en: "Only the top tier *flashes the screen*.", ko: "*최고 등급*만 화면이 번쩍." },
          reveal(w, P, R2) { if (P.r === 2) { w.flash("255,255,255", 0.2); w.shake(0.4); w.spawn({ type: "text", text: "SSR!!", x: 270, y: 54, vy: -8, life: 1.4, size: 40, color: R2.col }); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch by tier",
          cap: { en: "Higher tier, *higher* and *longer* sound.", ko: "등급이 높을수록 *높고 길게*." },
          reveal(w, P) { w.sfx.chime(P.r * 5); if (P.r === 2) w.sfx.fanfare(); },
        },
      ],
    },

    /* 14. 레어 드롭 빛기둥 */
    {
      id: "rpg-drop", cat: "rpg", view: "side",
      title: { en: "Make rare drops *shine*", ko: "레어 드롭은 *빛나게*" },
      intro: { en: "Something dropped. *Junk or gold?*", ko: "뭔가 떨어졌는데, *쓰레기예요 보물이에요?*" },
      interval: 1.9, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 100, h: 120 }); w.foe = w.actor("foe", { home: 440, h: 140 });
        w.TIER = [{ n: "Old Dagger", col: "#cbd5e1", rgb: "203,213,225" }, { n: "Rare Gem", col: "#60a5fa", rgb: "96,165,250" }, { n: "Legend Blade", col: "#fb923c", rgb: "251,146,60" }];
        w.L = null; w.cnt = 0;
      },
      fire(w) {
        const f = w.foe; if (!f.alive) return;
        f.flash = 1; w.kill(f);
        const L = { x: 300, y: G - 16, vx: 0, vy: 0, t: 0, r: [1, 2, 0][w.cnt++ % 3], sq: 1 };
        w.L = L;
        w.emit("drop", L, w.TIER[L.r]);
      },
      update(w, dt) {
        const L = w.L; if (!L) return;
        L.t += dt; L.sq += (1 - L.sq) * Math.min(1, dt * 10);
        if (L.vy || L.y < G - 16) { L.vy += 1800 * dt; L.y += L.vy * dt; L.x += L.vx * dt; if (L.y > G - 16) { L.y = G - 16; L.vy = Math.abs(L.vy) > 250 ? -L.vy * 0.35 : 0; L.sq = 0.7; } }
        if (L.t > 1.8) w.L = null;
      },
      drawBack(w, ctx) { if (w.L) w.emit("back", ctx, w.L, w.TIER[w.L.r]); },
      drawFront(w, ctx) {
        const L = w.L; if (!L) return;
        const R2 = w.TIER[L.r];
        ctx.save(); ctx.translate(L.x, L.y); ctx.scale(1 / L.sq * 0.8 + 0.2, L.sq);
        icon(ctx, L.r === 1 ? "drop" : "sword", 0, 0, 16, R2.col); ctx.restore();
        w.emit("front", ctx, L, R2);
      },
      steps: [
        {
          id: "pop", name: { en: "Pop & Bounce", ko: "튀어 올랐다 통통" }, param: "vy -600 · bounce .4",
          cap: { en: "Loot *pops up* and *bounces*. Eyes follow it.", ko: "아이템이 *튀어 올라* *통통*. 눈이 따라가요." },
          drop(w, L) { L.x = w.foe.x - 20; L.y = G - 90; L.vx = -230; L.vy = -480; },
        },
        {
          id: "beam", name: { en: "Light Beam", ko: "빛기둥" }, param: "tier color · 300px",
          cap: { en: "A *beam* in the tier color. Visible from afar.", ko: "*등급 색* 빛기둥. 멀리서도 보여요." },
          back(w, ctx, L, R2) {
            if (L.r === 0 || L.vy) return;
            const a = Math.min(1, L.t * 3) * (0.7 + 0.2 * Math.sin(w.time * 6)), g = ctx.createLinearGradient(0, L.y - 300, 0, L.y);
            g.addColorStop(0, `rgba(${R2.rgb},0)`); g.addColorStop(1, `rgba(${R2.rgb},${a})`);
            ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(L.x - 10 - 6 * L.r, L.y - 300, 20 + 12 * L.r, 300); ctx.globalCompositeOperation = "source-over";
          },
        },
        {
          id: "ring", name: { en: "Ground Pulse", ko: "바닥 고리" }, param: "flat ring loop",
          cap: { en: "A *ring pulses* on the ground under it.", ko: "아래 바닥에서 *고리가 퍼져요*." },
          back(w, ctx, L, R2) {
            if (L.vy) return;
            const k = (w.time * 1.5) % 1;
            ctx.strokeStyle = `rgba(${R2.rgb},${1 - k})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(L.x, G, 14 + k * 50, (14 + k * 50) * 0.25, 0, 0, TAU); ctx.stroke();
          },
        },
        {
          id: "twinkle", name: { en: "Twinkles", ko: "반짝반짝" }, param: "stars around",
          cap: { en: "Little *twinkles* around it. It's precious.", ko: "주변에 *반짝이*. 귀한 거예요." },
          update(w) { const L = w.L; if (L && L.r && Math.random() < 0.25) w.spawn({ type: "star", x: L.x + rand(-30, 30), y: L.y - rand(0, 70), size: rand(6, 12), life: 0.5, color: w.TIER[L.r].rgb }); },
        },
        {
          id: "name", name: { en: "Name Plate", ko: "이름표" }, param: "tier color text",
          cap: { en: "Write the *name* in its tier color.", ko: "*이름*을 등급 색으로 써줘요." },
          front(w, ctx, L, R2) { T(ctx, R2.n, L.x, L.y - 40, 17, R2.col); },
        },
        {
          id: "legend", name: { en: "Legendary Moment", ko: "전설 등장 순간" }, param: "stop 120ms · flash",
          cap: { en: "Top tier? *Freeze*, *flash*, shake. Make it a moment.", ko: "최고 등급이면 *멈칫*, *번쩍*, 흔들. 순간을 만들어요." },
          drop(w, L, R2) { if (L.r === 2) { w.hitstop(0.12); w.flash(R2.rgb, 0.45); w.shake(0.35); w.spawn({ type: "rays", x: L.x, y: G - 60, size: 180, n: 12, vr: 1.5, life: 1.2, color: R2.rgb }); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tink / chime / choir",
          cap: { en: "Junk *tinks*. Legends *sing*.", ko: "잡템은 *틱*, 전설은 *노래해요*." },
          drop(w, L) { if (L.r === 0) w.sfx.tick(); else if (L.r === 1) w.sfx.chime(4); else { w.sfx.chime(0); w.sfx.fanfare(); } },
        },
      ],
    },

    /* 15. 퀘스트 완료 */
    {
      id: "rpg-quest", cat: "rpg", view: "ui",
      title: { en: "Make quest completes *celebrate*", ko: "퀘스트 완료를 *축하하게*" },
      intro: { en: "4/5 → 5/5. *Done… I guess?*", ko: "4/5 → 5/5. *끝난 건가?*" },
      interval: 2.2, stepDur: 4.0,
      drawFloor() {},
      setup(w) { w.Q = { p: 4, bump: 0, chk: 0, ban: 0, shine: -1 }; w.gold = { v: 320, sc: 1 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const Q = w.Q; Q.p = 5;
        w.emit("complete", Q);
        w.after(1.9, () => { Q.p = 4; Q.chk = 0; Q.ban = 0; w.busy = false; });
      },
      update(w, dt) { const Q = w.Q; Q.bump = Math.max(0, Q.bump - dt * 3); w.gold.sc += (1 - w.gold.sc) * Math.min(1, dt * 8); if (Q.shine >= 0) Q.shine = Q.shine < 1.2 ? Q.shine + dt * 1.6 : -1; if (Q.ban > 0) Q.ban += dt; },
      drawFront(w, ctx) {
        const Q = w.Q, done = Q.p >= 5;
        panel(ctx, 120, 120, 300, 110, 14, done && !w.on("check") ? "#1f2a1f" : "#1c2029");
        if (Q.shine >= 0) {
          ctx.save(); ctx.beginPath(); ctx.roundRect(120, 120, 300, 110, 14); ctx.clip();
          const x = 80 + Q.shine * 380, g = ctx.createLinearGradient(x - 50, 0, x + 50, 0);
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g; ctx.fillRect(x - 50, 120, 100, 110); ctx.restore();
        }
        T(ctx, "QUEST", 140, 142, 12, "#94a3b8", "left", 700);
        T(ctx, "Slay the Enemies", 140, 168, 20, "#fff", "left");
        panel(ctx, 140, 192, 22, 22, 5, Q.chk > 0 ? "#22c55e" : "#262b36", "rgba(255,255,255,0.35)", 2);
        w.emit("box", ctx, Q);
        T(ctx, "Enemies defeated", 172, 203, 15, "#cbd5e1", "left", 600);
        ctx.save(); ctx.translate(390, 203); ctx.scale(1 + Q.bump * 0.6, 1 + Q.bump * 0.6);
        T(ctx, `${Q.p}/5`, 0, 0, 18, done ? "#c6f432" : "#fff", "right"); ctx.restore();
        if (done && !w.on("banner")) T(ctx, "Complete", 400, 142, 13, "#94a3b8", "right", 600);
        ctx.save(); ctx.translate(80, 300); ctx.scale(w.gold.sc, w.gold.sc); icon(ctx, "coin", 0, 0, 13, "#facc15"); T(ctx, String(w.gold.v), 18, 0, 17, "#fde047", "left"); ctx.restore();
        if (Q.ban > 0) {
          const s = 1 + 1.5 * Math.max(0, 1 - Q.ban * 4);
          ctx.save(); ctx.translate(270, 70); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, Q.ban * 6);
          panel(ctx, -150, -24, 300, 48, 10, "#c6f432", null);
          ctx.font = `900 26px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#111"; ctx.fillText("QUEST COMPLETE", 0, 2);
          ctx.restore();
        }
      },
      steps: [
        {
          id: "bump", name: { en: "Counter Bump", ko: "숫자 톡" }, param: "scale 1.6 · lime",
          cap: { en: "The last *5/5* bumps and turns *lime*.", ko: "마지막 *5/5*가 톡 튀고 *연두색*으로." },
          complete(w, Q) { Q.bump = 1; },
        },
        {
          id: "check", name: { en: "Check Mark", ko: "체크 표시" }, param: "draw 250ms",
          cap: { en: "Draw the *check mark* stroke by stroke.", ko: "*체크*를 한 획씩 그려요." },
          complete(w, Q) { Q.chk = 0.01; w.tween(Q, { chk: 1 }, 0.25, "out"); },
          box(w, ctx, Q) {
            if (Q.chk <= 0) return;
            const p = [[145, 203], [150, 209], [158, 197]], k = Q.chk * 2;
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
            const a = Math.min(1, k); ctx.lineTo(p[0][0] + (p[1][0] - p[0][0]) * a, p[0][1] + (p[1][1] - p[0][1]) * a);
            if (k > 1) ctx.lineTo(p[1][0] + (p[2][0] - p[1][0]) * (k - 1), p[1][1] + (p[2][1] - p[1][1]) * (k - 1));
            ctx.stroke();
          },
        },
        {
          id: "banner", name: { en: "Banner Slam", ko: "배너 쾅" }, param: "2.5× → 1 · 250ms",
          cap: { en: "A *banner slams* down from huge to normal.", ko: "*배너*가 크게 떨어져 *쾅* 자리 잡아요." },
          complete(w, Q) { Q.ban = 0.001; w.after(0.25, () => w.shake(0.3)); },
        },
        {
          id: "shine", name: { en: "Panel Shine", ko: "패널 반짝 스윕" }, param: "sweep 700ms",
          cap: { en: "A *shine* sweeps across the quest panel.", ko: "퀘스트 칸에 *빛이 쓱* 지나가요." },
          complete(w, Q) { Q.shine = 0; },
        },
        {
          id: "reward", name: { en: "Rewards Fly", ko: "보상이 날아감" }, param: "8 coins → wallet",
          cap: { en: "Rewards *fly into* your wallet. Then it bumps.", ko: "보상이 *지갑으로* 날아가고, 지갑이 톡." },
          complete(w) {
            for (let i = 0; i < 8; i++) w.after(0.2 + i * 0.05, () => w.spawn({ type: "glow", seek: true, x: 270 + rand(-80, 80), y: 175 + rand(-30, 30), tx: 80, ty: 300, life: 0.4, size: 12, color: "250,204,21" }));
            w.after(0.65, () => { w.gold.v += 150; w.gold.sc = 1.5; w.spawn({ type: "text", text: "+150", x: 110, y: 276, vy: -30, life: 1, size: 18, color: "#fde047" }); });
          },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "30 pieces",
          cap: { en: "Throw *confetti*. You earned it.", ko: "*꽃가루* 뿌려요. 그럴 자격 있어요." },
          complete(w) { for (let i = 0; i < 30; i++) w.spawn({ type: "chunk", x: 270 + rand(-60, 60), y: 70, vx: rand(-320, 320), vy: rand(-420, -120), g: 600, drag: 1.5, vr: rand(-12, 12), life: rand(1.2, 1.8), size: rand(4, 7), color: pick(["198,244,50", "250,204,21", "96,165,250", "244,114,182"]), hold: true }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick + fanfare",
          cap: { en: "A *tick* for the check, then a *fanfare*.", ko: "체크에 *틱*, 이어서 *빰빠밤*." },
          complete(w) { w.sfx.tick(); w.after(0.15, () => w.sfx.fanfare()); },
        },
      ],
    },

    /* 16. 대사 타자기 */
    {
      id: "rpg-dialogue", cat: "rpg", view: "ui",
      title: { en: "Make dialogue *speak*", ko: "대사가 *말하듯* 나오게" },
      intro: { en: "A wall of text, all at once. *Skip.*", ko: "글이 한 번에 와르르. *안 읽혀요.*" },
      interval: 2.6, stepDur: 4.2,
      drawFloor() {},
      setup(w) {
        w.LINES = ["Wait... did you hear *that*?", "The enemies are *coming*. Run!", "Take this sword. It's *yours* now."];
        w.D = { i: -1, chars: [], shown: 0, last: 0, hold: 0, sc: 1 };
        w.next = () => {
          const D = w.D; D.i = (D.i + 1) % w.LINES.length;
          let em = false; D.chars = [];
          for (const ch of w.LINES[D.i]) { if (ch === "*") { em = !em; continue; } D.chars.push({ ch, em }); }
          D.shown = 0; D.last = 0;
        };
        w.next(); w.D.shown = 99;
      },
      fire(w) {
        w.next();
        w.emit("line", w.D);
        if (!w.on("type")) w.D.shown = w.D.chars.length;
      },
      update(w, dt) {
        const D = w.D; D.sc += (1 - D.sc) * Math.min(1, dt * 10);
        const n = Math.min(D.chars.length, Math.floor(D.shown));
        if (n > D.last) { D.last = n; w.emit("char", D, D.chars[n - 1]); }
      },
      drawFront(w, ctx) {
        const D = w.D;
        ctx.save(); ctx.translate(270, 250); ctx.scale(D.sc, D.sc); ctx.translate(-270, -250);
        panel(ctx, 40, 190, 460, 120, 14, "rgba(20,22,30,0.95)", "rgba(255,255,255,0.3)", 2);
        panel(ctx, 56, 172, 96, 32, 8, "#c6f432", null);
        ctx.font = `800 16px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#111"; ctx.fillText("ELDER", 104, 189);
        ctx.font = `700 22px ${FONT}`; ctx.textAlign = "left";
        let x = 66;
        const n = Math.min(D.chars.length, D.shown);
        for (let i = 0; i < n; i++) {
          const c = D.chars[i], o = { x, y: 240, s: 1, col: "#f1f5f9", age: D.shown - i };
          w.emit("glyph", o, c);
          ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.s, o.s); ctx.fillStyle = o.col; ctx.fillText(c.ch, 0, 0); ctx.restore();
          x += ctx.measureText(c.ch).width;
        }
        if (D.shown >= D.chars.length) w.emit("done", ctx, D);
        ctx.restore();
      },
      steps: [
        {
          id: "type", name: { en: "Typewriter", ko: "한 글자씩" }, param: "30 chars/s",
          cap: { en: "Reveal *one letter at a time*. Like speech.", ko: "*한 글자씩* 나와요. 말하는 속도로." },
          update(w, dt) { const D = w.D; if (D.hold > 0) D.hold -= dt; else D.shown = Math.min(D.chars.length, D.shown + dt * 30); },
        },
        {
          id: "pause", name: { en: "Punctuation Pause", ko: "문장부호에서 쉼" }, param: ". , ! ? → 250ms",
          cap: { en: "*Pause* at commas and dots. That's breathing.", ko: "쉼표, 마침표에서 *잠깐 쉬어요*. 숨 쉬듯." },
          char(w, D, c) { if (".,!?".includes(c.ch)) D.hold = 0.25; },
        },
        {
          id: "pop", name: { en: "Letter Pop", ko: "글자 톡" }, param: "1.6× → 1 · 3 chars",
          cap: { en: "Each new letter *pops* in, then settles.", ko: "새 글자는 *톡* 커졌다 제자리." },
          glyph(w, o) { if (o.age < 3) { o.s = 1 + (3 - o.age) * 0.2; o.y -= (3 - o.age) * 2; } },
        },
        {
          id: "emph", name: { en: "Emphasis Word", ko: "강조 단어" }, param: "color + wobble",
          cap: { en: "Key words get *color* and a little *wobble*.", ko: "중요한 말은 *색*을 입히고 *흔들흔들*." },
          glyph(w, o, c) { if (c.em) { o.col = "#fb923c"; o.y += Math.sin(w.time * 18 + o.x * 0.3) * 2.5; } },
        },
        {
          id: "box", name: { en: "Box Pop", ko: "대화창 톡" }, param: "scale 0.92 → 1",
          cap: { en: "A new line *nudges* the box. Something's said.", ko: "새 대사마다 창이 *톡*. 말이 시작돼요." },
          line(w, D) { D.sc = 0.92; },
        },
        {
          id: "arrow", name: { en: "Next Arrow", ko: "다음 화살표" }, param: "bob 6px",
          cap: { en: "When done, a *bobbing arrow* says \"tap\".", ko: "다 나오면 *까딱이는 화살표*. \"눌러요\"." },
          done(w, ctx) { tri(ctx, 474, 288 + Math.sin(w.time * 8) * 4, 8, false, "#c6f432"); },
        },
        {
          id: "sound", name: { en: "Voice Blips", ko: "말소리 삑삑" }, param: "blip / char · ±pitch",
          cap: { en: "A *blip* per letter, random pitch. Instant *voice*.", ko: "글자마다 *삑*, 음높이 살짝 다르게. 목소리가 돼요." },
          char(w, D, c) { if (c.ch !== " ") w.play(() => tn({ type: "square", f: rand(380, 460), dur: 0.035, vol: 0.08 })); },
        },
      ],
    },

    /* 17. 상점 구매 */
    {
      id: "rpg-shop", cat: "rpg", view: "ui",
      title: { en: "Make buying *satisfying*", ko: "구매를 *뿌듯하게*" },
      intro: { en: "Bought it. Gold changed… *somewhere*.", ko: "샀어요. 골드가… *어딘가* 줄었네요." },
      interval: 1.5, stepDur: 3.8,
      drawFloor() {},
      setup(w) {
        potionSpr();
        w.S = { gold: 1250, shown: 1250, gsc: 1, bsc: 1, bag: 3, bagsc: 1, red: 0 };
      },
      fire(w) {
        const S = w.S;
        if (S.gold < 120) { S.gold = S.shown = 1250; S.bag = 3; }
        S.gold -= 120; S.bag++; S.bsc = 0.95;
        w.emit("buy", S);
      },
      update(w, dt) {
        const S = w.S, k = Math.min(1, dt * 10);
        S.gsc += (1 - S.gsc) * k; S.bsc += (1 - S.bsc) * k; S.bagsc += (1 - S.bagsc) * k; S.red = Math.max(0, S.red - dt * 1.5);
        if (!w.on("roll")) S.shown = S.gold;
      },
      drawFront(w, ctx) {
        const S = w.S;
        ctx.save(); ctx.translate(70, 64); ctx.scale(S.gsc, S.gsc);
        panel(ctx, -24, -20, 150, 40, 20, "#1c2029");
        icon(ctx, "coin", -4, 0, 13, "#facc15");
        T(ctx, Math.round(S.shown).toLocaleString("en-US"), 16, 0, 20, S.red > 0 ? "#f87171" : "#fde047", "left");
        ctx.restore();
        panel(ctx, 190, 80, 160, 190, 16, "#1c2029");
        drawImg(ctx, SPR["rpg-potion"].c, 270, 140, 64);
        T(ctx, "Red Potion", 270, 196, 16, "#fff");
        ctx.save(); ctx.translate(270, 238); ctx.scale(S.bsc, 2 - S.bsc);
        panel(ctx, -56, -18, 112, 36, 10, "#c6f432", null);
        ctx.font = `900 17px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#111"; ctx.fillText("BUY  120", 0, 1);
        ctx.restore();
        ctx.save(); ctx.translate(440, 220); ctx.scale(S.bagsc, 2 - S.bagsc);
        panel(ctx, -32, -30, 64, 60, 18, "#7c4a1e", "rgba(0,0,0,0.3)", 2);
        panel(ctx, -18, -40, 36, 14, 6, "#92582a", null);
        ctx.restore();
        panel(ctx, 456, 182, 30, 22, 11, "#ef4444", null); T(ctx, String(S.bag), 471, 193, 14, "#fff");
      },
      steps: [
        {
          id: "press", name: { en: "Button Press", ko: "버튼 꾹" }, param: "squash .85",
          cap: { en: "The button *squashes* under your finger.", ko: "버튼이 손가락 아래서 *꾹*." },
          buy(w, S) { S.bsc = 0.85; },
        },
        {
          id: "coins", name: { en: "Coins Pay Out", ko: "동전이 건너감" }, param: "6 coins wallet → item",
          cap: { en: "Coins *fly out of your wallet* to the item.", ko: "동전이 *지갑에서 상품으로* 날아가요." },
          buy(w) { for (let i = 0; i < 6; i++) w.after(i * 0.04, () => w.spawn({ type: "glow", seek: true, x: 70, y: 64, tx: 270 + rand(-20, 20), ty: 140, life: 0.35, size: 11, color: "250,204,21" })); },
        },
        {
          id: "roll", name: { en: "Gold Rolls Down", ko: "골드가 굴러 줄어듦" }, param: "red · -120",
          cap: { en: "Gold *rolls down* in red. *-120* drops off.", ko: "골드가 *빨갛게* 굴러 줄고, *-120*이 떨어져요." },
          buy(w, S) { S.gsc = 1.25; S.red = 1; w.spawn({ type: "text", text: "-120", x: 150, y: 96, vy: 30, life: 1.2, size: 20, color: "#f87171" }); },
          update(w, dt) { const S = w.S; S.shown += (S.gold - S.shown) * Math.min(1, dt * 5); },
        },
        {
          id: "fly", name: { en: "Item to Bag", ko: "가방으로 쏙" }, param: "arc 450ms · spin",
          cap: { en: "The item *arcs into your bag*.", ko: "상품이 포물선을 그리며 *가방으로 쏙*." },
          buy(w) {
            const c = SPR["rpg-potion"].c;
            w.shoot({ x: 270, y: 140, vx: 280, vy: -340, g: 1500, vr: 8, test: p => p.x > 440, draw: (ctx, p) => drawImg(ctx, c, p.x, p.y, 34, p.rot), onHit: () => w.emit("land", w.S) });
          },
        },
        {
          id: "bag", name: { en: "Bag Gulp", ko: "가방 꿀꺽" }, param: "squash + badge",
          cap: { en: "The bag *gulps* it, the badge *+1*.", ko: "가방이 *꿀꺽*, 배지는 *+1*." },
          land(w, S) { S.bagsc = 1.3; w.spawn({ type: "text", text: "+1", x: 470, y: 160, vy: -50, life: 0.9, size: 22, color: "#c6f432" }); },
        },
        {
          id: "stamp", name: { en: "Purchased Stamp", ko: "구매 도장" }, param: "1.6× → 1",
          cap: { en: "Stamp *PURCHASED* on the card. Clear and done.", ko: "카드 위에 *구매 완료* 도장. 깔끔하게 끝." },
          buy(w) { w.spawn({ type: "text", text: "PURCHASED", x: 270, y: 64, life: 1.2, hold: true, size: 28, color: "#c6f432" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "coins + bag thud",
          cap: { en: "*Ka-ching*, then a soft *thump* in the bag.", ko: "*짤랑*, 그리고 가방에 *툭*." },
          buy(w) { [0, 0.05, 0.1].forEach(d => w.play(() => tn({ type: "triangle", f: 1800 + d * 3000, dur: 0.08, vol: 0.15, delay: d }))); },
          land(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 18. 인벤토리 */
    {
      id: "rpg-inventory", cat: "rpg", view: "ui",
      title: { en: "Make new items *land* in the bag", ko: "새 아이템이 *쏙* 들어오게" },
      intro: { en: "Something's in slot 7. *Did you notice?*", ko: "7번 칸에 뭔가 생겼어요. *보셨어요?*" },
      interval: 0.75, stepDur: 3.6,
      drawFloor() {},
      setup(w) {
        w.KIND = [["sword", "#cbd5e1"], ["shield", "#93c5fd"], ["potion", "#fb7185"], ["star", "#fde047"], ["drop", "#86efac"]];
        w.RCOL = ["148,163,184", "96,165,250", "192,132,252"];
        w.cells = []; for (let i = 0; i < 18; i++) w.cells.push({ it: null, sc: 1, x: 132 + (i % 6) * 56, y: 130 + Math.floor(i / 6) * 56 });
        for (let i = 0; i < 4; i++) w.cells[i].it = { k: i, r: i % 3, oy: 0, t: 9 };
        w.bag = { sc: 1 };
      },
      fire(w) {
        let c = w.cells.find(q => !q.it);
        if (!c) { w.cells.forEach((q, i) => { q.it = i < 4 ? { k: i, r: i % 3, oy: 0, t: 9 } : null; }); c = w.cells[4]; }
        const it = { k: (Math.random() * 5) | 0, r: pick([0, 0, 1, 1, 2]), oy: 0, t: 0 };
        c.it = it;
        w.emit("add", it, c, w.cells.indexOf(c));
      },
      update(w, dt) { for (const c of w.cells) { c.sc += (1 - c.sc) * Math.min(1, dt * 10); if (c.it) c.it.t += dt; } w.bag.sc += (1 - w.bag.sc) * Math.min(1, dt * 8); },
      drawFront(w, ctx) {
        const n = w.cells.filter(c => c.it).length;
        ctx.save(); ctx.translate(110, 76); ctx.scale(w.bag.sc, w.bag.sc); T(ctx, `BAG ${n}/18`, 0, 0, 18, "#fff", "left"); ctx.restore();
        w.cells.forEach((c, i) => {
          const x = 132 + (i % 6) * 56, y = 130 + Math.floor(i / 6) * 56;
          c.x = x; c.y = y;
          ctx.save(); ctx.translate(x, y); ctx.scale(1 / c.sc * 0.5 + 0.5, c.sc);
          panel(ctx, -24, -24, 48, 48, 8, "#232733", "rgba(255,255,255,0.1)");
          if (c.it) {
            w.emit("cell", ctx, c.it);
            const [k, col] = w.KIND[c.it.k];
            ctx.save(); ctx.beginPath(); ctx.rect(-26, -400, 52, 426); ctx.clip(); icon(ctx, k, 0, c.it.oy, 15, col); ctx.restore();
            w.emit("badge", ctx, c.it);
          }
          ctx.restore();
        });
      },
      steps: [
        {
          id: "drop", name: { en: "Drop In", ko: "위에서 툭" }, param: "from -90px · back",
          cap: { en: "Items *drop in* from above and settle.", ko: "아이템이 위에서 *툭* 떨어져 자리 잡아요." },
          add(w, it) { it.oy = -90; w.tween(it, { oy: 0 }, 0.3, "back"); },
        },
        {
          id: "squash", name: { en: "Slot Squash", ko: "칸이 찌그러짐" }, param: "0.75 on land",
          cap: { en: "The slot *squashes* when it lands.", ko: "떨어지는 순간 칸이 *찌그러져요*." },
          add(w, it, c) { w.after(0.2, () => { c.sc = 0.75; }); },
        },
        {
          id: "rarity", name: { en: "Rarity Frame", ko: "등급 테두리" }, param: "grey / blue / purple",
          cap: { en: "Frame each item in its *rarity color*.", ko: "아이템마다 *등급 색* 테두리." },
          cell(w, ctx, it) {
            const c = w.RCOL[it.r];
            panel(ctx, -24, -24, 48, 48, 8, `rgba(${c},0.18)`, `rgb(${c})`, 2.5);
            if (it.r === 2) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, 0, 34, c, 0.35 + 0.15 * Math.sin(w.time * 5)); ctx.globalCompositeOperation = "source-over"; }
          },
        },
        {
          id: "new", name: { en: "NEW Badge", ko: "NEW 배지" }, param: "until 3s",
          cap: { en: "A *NEW* tag says \"this one, just now\".", ko: "*NEW* 표시가 \"방금 들어온 거\"라고 알려줘요." },
          badge(w, ctx, it) { if (it.t < 3) { panel(ctx, -2, -34, 36, 17, 6, "#c6f432", null); ctx.font = `900 12px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#111"; ctx.fillText("NEW", 16, -25); } },
        },
        {
          id: "sparkle", name: { en: "Landing Sparkle", ko: "착지 반짝" }, param: "star + ring",
          cap: { en: "A *sparkle* where it lands.", ko: "들어온 자리에 *반짝*." },
          add(w, it, c) { w.after(0.2, () => { w.spawn({ type: "star", x: c.x, y: c.y, size: 30, life: 0.35, color: "255,255,255" }); w.spawn({ type: "ring", x: c.x, y: c.y, size: 20, size1: 46, life: 0.35, w: 4, color: w.RCOL[it.r] }); }); },
        },
        {
          id: "count", name: { en: "Count Bump", ko: "개수 톡" }, param: "scale 1.3",
          cap: { en: "The *bag count* bumps too.", ko: "*가방 개수*도 같이 톡." },
          add(w) { w.after(0.2, () => { w.bag.sc = 1.3; }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch by rarity",
          cap: { en: "A soft *tock*. Rarer items ring *higher*.", ko: "부드러운 *톡*. 귀할수록 *높게* 울려요." },
          add(w, it) { w.after(0.2, () => { w.sfx.tock(); if (it.r) w.sfx.chime(it.r * 4); }); },
        },
      ],
    },

    /* 19. 턴 순서 바 */
    {
      id: "rpg-turn-order", cat: "rpg", view: "side",
      title: { en: "Make turn order *readable*", ko: "턴 순서가 *읽히게*" },
      intro: { en: "Icons shuffle. *Whose turn is it?*", ko: "아이콘이 바뀌었는데, *누구 차례예요?*" },
      interval: 1.1, stepDur: 3.8,
      setup(w) {
        w.U = [
          { a: w.actor("hero", { home: 100, h: 115 }), spr: "hero", col: "#e5e7eb", ally: true },
          { a: w.actor("hero", { home: 190, h: 105 }), spr: "hero", col: "#60a5fa", ally: true, blue: true },
          { a: w.actor("foe", { home: 380, h: 120 }), spr: "foe", col: "#86efac" },
          { a: w.actor("foe", { home: 470, h: 100 }), spr: "foe", col: "#86efac" },
        ];
        w.Qu = [0, 2, 1, 3];
        w.U.forEach((u, i) => { u.px = 150 + w.Qu.indexOf(i) * 80; u.oy = 0; u.sc = 1; });
      },
      fire(w) {
        const q = w.Qu; q.push(q.shift());
        w.emit("turn", w.U[q[0]], w.U[q[q.length - 1]]);
      },
      update(w, dt) {
        w.U.forEach((u, i) => {
          const tx = 150 + w.Qu.indexOf(i) * 80;
          if (!w.on("slide")) u.px = tx;
          u.sc += ((w.on("current") && w.Qu[0] === i ? 1.35 : 1) - u.sc) * Math.min(1, dt * 10);
        });
      },
      drawBack(w, ctx) { w.emit("back", ctx, w.U[w.Qu[0]]); },
      drawFront(w, ctx) { const u = w.U[1]; overlay(ctx, u.a, tintSpr("hero", "#3b82f6").c, 0.55); },
      drawHud(w, ctx) {
        panel(ctx, 100, 44, 340, 52, 26, "rgba(20,22,30,0.85)");
        const order = [...w.U].sort((a, b) => b.sc - a.sc);
        for (const u of order.reverse()) {
          const r = 20 * u.sc, y = 70 + u.oy;
          ctx.save(); ctx.translate(u.px, y);
          ctx.fillStyle = u.ally ? "#1e3a5f" : "#3f1d1d"; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
          ctx.save(); ctx.clip(); const c = (u.blue ? tintSpr("hero", "#60a5fa") : SPR[u.spr]).c; ctx.drawImage(c, -r * 0.9, -r * 0.8, r * 1.8, r * 1.8 * c.height / c.width); ctx.restore();
          ctx.strokeStyle = u.col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
          w.emit("chip", ctx, u, r);
          ctx.restore();
        }
      },
      steps: [
        {
          id: "slide", name: { en: "Slide Along", ko: "미끄러지듯 이동" }, param: "lerp ×8",
          cap: { en: "Portraits *slide* to their new spot. No teleporting.", ko: "초상화가 새 자리로 *스르륵*. 순간이동 금지." },
          update(w, dt) { w.U.forEach((u, i) => { u.px += (150 + w.Qu.indexOf(i) * 80 - u.px) * Math.min(1, dt * 8); }); },
        },
        {
          id: "current", name: { en: "Current Is Big", ko: "지금 차례는 크게" }, param: "1.35× + lime ring",
          cap: { en: "Whoever acts now is *bigger* with a *lime ring*.", ko: "지금 차례는 *크게*, *연두 테두리*." },
          chip(w, ctx, u, r) { if (u === w.U[w.Qu[0]]) { ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, TAU); ctx.stroke(); } },
        },
        {
          id: "loop", name: { en: "Loop to Back", ko: "뒤로 돌아감" }, param: "hop up · drop in",
          cap: { en: "The one who acted *hops* over to the back.", ko: "끝난 쪽은 *폴짝* 넘어서 맨 뒤로." },
          turn(w, cur, last) { last.oy = -34; w.tween(last, { oy: 0 }, 0.45, "back"); },
        },
        {
          id: "marker", name: { en: "Unit Marker", ko: "발밑 표시" }, param: "ring + arrow",
          cap: { en: "Mark the *unit in the scene* too. Ring and arrow.", ko: "*장면 속 캐릭터*에도 표시. 고리와 화살표." },
          back(w, ctx, u) {
            const a = u.a, k = (w.time * 1.4) % 1;
            ctx.strokeStyle = `rgba(198,244,50,${0.9 - k * 0.6})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(a.x, G, 40 + k * 14, 10 + k * 4, 0, 0, TAU); ctx.stroke();
            tri(ctx, a.x, G - a.h - 22 + Math.sin(w.time * 7) * 5, 9, false, "#c6f432");
          },
        },
        {
          id: "hop", name: { en: "Ready Hop", ko: "준비 폴짝" }, param: "-22px · squash",
          cap: { en: "The unit *hops*: \"my turn!\"", ko: "캐릭터가 *폴짝*. \"내 차례!\"" },
          turn(w, cur) { const a = cur.a; a.sx = 0.85; a.sy = 1.15; w.tween(a, { oy: -22 }, 0.12, "out", () => w.tween(a, { oy: 0 }, 0.16, "in")); },
        },
        {
          id: "banner", name: { en: "Turn Banner", ko: "차례 알림" }, param: "ally lime · foe red",
          cap: { en: "Say whose side: *YOUR TURN* or *ENEMY TURN*.", ko: "어느 편인지 말해요. *내 차례*, *적 차례*." },
          turn(w, cur) { w.spawn({ type: "text", text: cur.ally ? "YOUR TURN" : "ENEMY TURN", x: 270, y: 122, vy: -6, life: 1.1, size: 30, color: cur.ally ? "#c6f432" : "#f87171" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "high ally · low foe",
          cap: { en: "Bright tick for allies. Low *tock* for enemies.", ko: "아군은 맑게 *틱*, 적은 낮게 *톡*." },
          turn(w, cur) { if (cur.ally) w.sfx.chime(2); else w.sfx.tock(); },
        },
      ],
    },

    /* 20. 치명타 컷인 */
    {
      id: "rpg-cutin", cat: "rpg", view: "side",
      title: { en: "Make crits *cinematic*", ko: "치명타를 *영화처럼*" },
      intro: { en: "A big number. *That was the crit?*", ko: "숫자만 커요. *이게 치명타?*" },
      interval: 2.2, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 120, h: 125 }); w.foe = w.actor("foe", { home: 420, h: 150, hp: 400 });
        w.CI = { t: -1, dim: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const strike = () => {
          const f = w.foe; f.hp = Math.max(0, f.hp - 180); f.flash = 1; f.ox += 16;
          w.spawn({ type: "slash", x: f.x - 20, y: G - 75, ang: -0.5, len: 60, size: 4, life: 0.2, color: "255,255,255" });
          w.emit("strike", { x: f.x - 20, y: G - 75 });
          w.spawn({ type: "text", text: "180", x: f.x - 70, y: G - 205, vy: -40, life: 1.2, size: 40, color: "#fff" });
          if (f.hp <= 0) w.after(0.6, () => { f.hp = f.maxHp; });
          w.after(0.3, () => { w.busy = false; });
        };
        if (w.on("pause")) { w.emit("cutin", w.CI); w.after(1.0, strike); } else strike();
      },
      update(w, dt) { const C = w.CI; if (C.t >= 0) { C.t += dt; if (C.t > 1.0) C.t = -1; } C.dim = Math.max(0, C.dim - dt * 2); },
      drawHud(w, ctx) {
        hpBar(ctx, w.foe);
        const C = w.CI;
        if (C.dim > 0 || C.t >= 0) { ctx.fillStyle = `rgba(5,6,10,${C.t >= 0 ? 0.6 : C.dim * 0.6})`; ctx.fillRect(-50, -50, 640, 460); }
        if (C.t >= 0) w.emit("band", ctx, C.t);
      },
      steps: [
        {
          id: "pause", name: { en: "Pause + Dim", ko: "멈추고 어둡게" }, param: "1.0s · dark .6",
          cap: { en: "*Stop* the battle and *dim* everything.", ko: "전투를 *멈추고* 화면을 *어둡게*." },
          cutin(w, C) { C.t = 0; C.dim = 1; },
        },
        {
          id: "band", name: { en: "Cut-in Band", ko: "가로 띠" }, param: "slant · slide 150ms",
          cap: { en: "A *slanted band* slides across the screen.", ko: "*비스듬한 띠*가 화면을 가로질러요." },
          band(w, ctx, t) {
            const k = E.out(Math.min(1, t / 0.15)), out = t > 0.85 ? E.in((t - 0.85) / 0.15) : 0;
            ctx.save(); ctx.translate((1 - k) * -600 + out * 600, 0);
            ctx.fillStyle = "#c6f432"; ctx.beginPath(); ctx.moveTo(-60, 110); ctx.lineTo(620, 70); ctx.lineTo(620, 82); ctx.lineTo(-60, 122); ctx.fill();
            ctx.fillStyle = "#14161d"; ctx.beginPath(); ctx.moveTo(-60, 122); ctx.lineTo(620, 82); ctx.lineTo(620, 222); ctx.lineTo(-60, 262); ctx.fill();
            ctx.fillStyle = "#c6f432"; ctx.beginPath(); ctx.moveTo(-60, 262); ctx.lineTo(620, 222); ctx.lineTo(620, 234); ctx.lineTo(-60, 274); ctx.fill();
            w.emit("inband", ctx, t);
            ctx.restore();
          },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "16 streaks",
          cap: { en: "*Speed lines* rush through the band.", ko: "띠 안에 *속도선*이 쏟아져요." },
          inband(w, ctx, t) {
            ctx.save(); ctx.beginPath(); ctx.moveTo(-60, 122); ctx.lineTo(620, 82); ctx.lineTo(620, 222); ctx.lineTo(-60, 262); ctx.clip();
            ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
            for (let i = 0; i < 16; i++) { const y = 90 + ((i * 37) % 170), x = ((i * 131 - t * 2400) % 700 + 700) % 700 - 80; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90, y - 5); ctx.stroke(); }
            ctx.restore();
          },
        },
        {
          id: "silhouette", name: { en: "Silhouette", ko: "실루엣" }, param: "260px · drift →",
          cap: { en: "A huge *silhouette* drifts slowly inside.", ko: "커다란 *실루엣*이 천천히 지나가요." },
          inband(w, ctx, t) {
            const c = SPR.hero.c, h = 300, ww = h * c.width / c.height, x = 120 + t * 60;
            ctx.save(); ctx.beginPath(); ctx.moveTo(-60, 122); ctx.lineTo(620, 82); ctx.lineTo(620, 222); ctx.lineTo(-60, 262); ctx.clip();
            ctx.drawImage(tintSpr("hero", "#c6f432").c, x - ww / 2 - 6, 70, ww, h);
            ctx.drawImage(tintSpr("hero", "#05060a").c, x - ww / 2, 70, ww, h);
            ctx.restore();
          },
        },
        {
          id: "name", name: { en: "Skill Name", ko: "기술 이름" }, param: "slides ←",
          cap: { en: "The *skill name* slides the other way.", ko: "*기술 이름*은 반대로 미끄러져요." },
          inband(w, ctx, t) { ctx.save(); ctx.translate(430 - t * 50, 150); ctx.rotate(-0.06); T(ctx, "CRITICAL", 0, 0, 44, "#fff"); T(ctx, "STRIKE", 30, 44, 30, "#c6f432"); ctx.restore(); },
        },
        {
          id: "release", name: { en: "Release Hit", ko: "풀리는 순간 한 방" }, param: "flash · shake .6",
          cap: { en: "Then *release*: flash, slash, big shake.", ko: "그리고 *팡*. 번쩍, 베기, 크게 흔들기." },
          strike(w, at) {
            w.flash("255,255,255", 0.5); w.shake(0.6, 1); w.hitstop(0.08); w.foe.ox += 40;
            w.spawn({ type: "slash", x: at.x, y: at.y, ang: -0.5, len: 120, size: 14, life: 0.3, color: "255,255,255" });
            w.spawn({ type: "slash", x: at.x, y: at.y, ang: 0.6, len: 100, size: 10, life: 0.3, color: "198,244,50" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swoosh · silence · crit",
          cap: { en: "*Swoosh* in, a beat of quiet, then *CRASH*.", ko: "*쉭* 들어오고, 잠깐 조용, 그리고 *쾅*." },
          cutin(w) { w.sfx.dash(); },
          strike(w) { w.sfx.crit(); },
        },
      ],
    },

    /* 21. 약점 */
    {
      id: "rpg-weak", cat: "rpg", view: "side",
      title: { en: "Make weak spots *scream*", ko: "약점 공격은 *크게 외치게*" },
      intro: { en: "Weak hit or normal hit? *Same look.*", ko: "약점이든 아니든 *똑같아 보여요*." },
      interval: 1.25, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 120, h: 125 }); w.foe = w.actor("foe", { home: 420, h: 150, hp: 300 });
        w.cnt = 0; w.WK = { t: -1 };
      },
      fire(w) {
        const p = paw(w), f = w.foe, weak = w.cnt++ % 3 !== 2;
        const col = weak ? "251,146,60" : "103,232,249";
        w.shoot({ x: p.x, y: p.y, vx: 950, vy: 0, r: 9, color: weak ? "#fb923c" : "#67e8f9", trail: col, hitX: f.x - 40, onHit: o => {
          const d = weak ? 72 : 24, n = { text: String(d), x: f.x + 50, y: G - 165, vy: -320, g: 900, life: 1.2, size: 30, color: "#fff" };
          f.hp = Math.max(0, f.hp - d); f.flash = 0.8; f.ox += 8;
          w.emit("hit", { x: o.x, y: o.y }, weak, n);
          w.spawn(Object.assign({ type: "text" }, n));
          if (f.hp <= 0) w.after(0.5, () => { f.hp = f.maxHp; });
        } });
      },
      update(w, dt) { const K = w.WK; if (K.t >= 0) { K.t += dt; if (K.t > 1.1) K.t = -1; } },
      drawHud(w, ctx) { hpBar(ctx, w.foe); w.emit("hud", ctx, w.WK); },
      steps: [
        {
          id: "label", name: { en: "WEAK! Label", ko: "WEAK! 글자" }, param: "tilt · 2× → 1",
          cap: { en: "Stamp *WEAK!* tilted, *huge*, then settle.", ko: "*WEAK!*를 비스듬히, *크게* 찍어요." },
          hit(w, h, weak) { if (weak) w.WK.t = 0; },
          hud(w, ctx, K) {
            if (K.t < 0) return;
            const s = 1 + Math.max(0, 1 - K.t * 6) * 1.2;
            ctx.save(); ctx.globalAlpha = Math.min(1, (1.1 - K.t) * 4); ctx.translate(250, 78); ctx.rotate(-0.16); ctx.scale(s, s);
            T(ctx, "WEAK!", 0, 0, 46, "#fb923c"); ctx.restore();
          },
        },
        {
          id: "number", name: { en: "Hotter Number", ko: "더 뜨거운 숫자" }, param: "orange · 48px",
          cap: { en: "Weak-hit numbers are *bigger* and *orange*.", ko: "약점 숫자는 *더 크고* *주황색*." },
          hit(w, h, weak, n) { if (weak) { n.size = 48; n.color = "#fdba74"; } },
        },
        {
          id: "badge", name: { en: "Element Badge", ko: "속성 배지" }, param: "flame over head",
          cap: { en: "Flash the *element icon* that it's weak to.", ko: "약한 *속성 아이콘*을 띄워요." },
          hud(w, ctx, K) { if (K.t >= 0 && K.t < 0.9) { const f = w.foe; panel(ctx, f.x - 18, f.gy - f.h - 74, 36, 36, 18, "rgba(10,12,20,0.85)", "#fb923c", 3); icon(ctx, "fire", f.x, f.gy - f.h - 56, 13, "#fb923c"); } },
        },
        {
          id: "stagger", name: { en: "Stagger", ko: "크게 휘청" }, param: "push 60 · tilt",
          cap: { en: "The target *staggers* harder. It *really* hurt.", ko: "더 크게 *휘청*. *진짜* 아픈 거예요." },
          hit(w, h, weak) { const f = w.foe; if (weak) { f.ox += 60; f.vib = 8; f.rot = 0.15; w.tween(f, { rot: 0 }, 0.4, "out"); } else f.ox += 10; },
        },
        {
          id: "burst", name: { en: "Element Burst", ko: "속성 폭발" }, param: "flames / shards",
          cap: { en: "Burst in the *element's* look: flames, ice.", ko: "*속성* 모양으로 터져요. 불꽃, 얼음." },
          hit(w, h, weak) {
            if (weak) for (let i = 0; i < 16; i++) w.spawn({ type: "glow", x: h.x, y: h.y, vx: rand(-260, 260), vy: rand(-360, 60), drag: 3, size: rand(14, 24), size1: 2, life: rand(0.4, 0.8), color: i % 2 ? "251,146,60" : "253,224,71" });
            else for (let i = 0; i < 8; i++) w.spawn({ type: "chunk", x: h.x, y: h.y, vx: rand(-200, 200), vy: rand(-300, 0), g: 900, vr: rand(-10, 10), life: 0.6, size: 6, color: "165,243,252" });
          },
        },
        {
          id: "stop", name: { en: "Weak Hit Stop", ko: "약점 멈칫" }, param: "stop 120ms · weak only",
          cap: { en: "Only weak hits *freeze*. The difference is felt.", ko: "약점일 때만 *멈칫*. 차이가 손에 느껴져요." },
          hit(w, h, weak) { if (weak) { w.hitstop(0.12); w.shake(0.3, 1); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crit vs plain",
          cap: { en: "Weak hits get a *crunchier* sound.", ko: "약점은 더 *아작* 소리." },
          hit(w, h, weak) { if (weak) w.sfx.crit(); else w.sfx.hit(); },
        },
      ],
    },

    /* 22. 회피 */
    {
      id: "rpg-miss", cat: "rpg", view: "side",
      title: { en: "Make dodges *obvious*", ko: "회피가 *확실히* 보이게" },
      intro: { en: "It swung. Nothing happened. *Bug?*", ko: "휘둘렀는데 아무 일 없음. *버그?*" },
      interval: 1.6, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 160, h: 125 }); w.foe = w.actor("foe", { home: 430, h: 140 }); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, h = w.hero;
        w.tween(f, { x: h.x + 95 }, 0.2, "in", () => {
          w.emit("miss", h, { x: h.x + 30, y: G - 70 });
          w.after(0.15, () => w.tween(f, { x: f.home }, 0.3, "inout", () => { w.busy = false; }));
        });
      },
      steps: [
        {
          id: "step", name: { en: "Sidestep", ko: "뒤로 피하기" }, param: "-70px · spring 5",
          cap: { en: "The target *hops back*. You see it avoid.", ko: "맞는 쪽이 *뒤로 쏙*. 피한 게 보여요." },
          miss(w, h) { h.ox = -70; h.k = 5; h.sx = 1.15; h.sy = 0.9; },
        },
        {
          id: "ghost", name: { en: "Afterimage", ko: "잔상" }, param: "cyan ghost 400ms",
          cap: { en: "Leave an *afterimage* where it stood.", ko: "서 있던 자리에 *잔상*을 남겨요." },
          miss(w, h) { w.spawn({ type: "ghost", img: h.s.cyan, x: h.x, y: G, w: h.w, h: h.h, alpha0: 0.6, life: 1.4, hold: true }); },
        },
        {
          id: "whiff", name: { en: "Whiff Arc", ko: "헛스윙 궤적" }, param: "grey arc",
          cap: { en: "Draw the swing *through empty air*.", ko: "*허공*을 가르는 궤적." },
          miss(w, h, at) { w.spawn({ type: "arc", x: at.x + 34, y: at.y, size: 50, life: 0.3, a0: 1.8, a1: 4.3, color: "148,163,184" }); },
        },
        {
          id: "text", name: { en: "MISS Text", ko: "MISS 글자" }, param: "grey · drift sideways",
          cap: { en: "Grey *MISS* that drifts *sideways*, not up.", ko: "회색 *MISS*가 위 말고 *옆으로* 흘러가요." },
          miss(w, h) { w.spawn({ type: "text", text: "MISS", x: h.x + 10, y: G - 160, vx: -60, vy: -10, life: 1.6, size: 30, color: "#cbd5e1" }); },
        },
        {
          id: "slow", name: { en: "Slow-mo Dodge", ko: "슬로모션 회피" }, param: "0.3× · 300ms",
          cap: { en: "Slow time *just for the dodge*. Looks skillful.", ko: "피하는 순간만 *느리게*. 멋져 보여요." },
          miss(w) { w.slowmo(0.3, 0.3); },
        },
        {
          id: "wind", name: { en: "Wind Puff", ko: "바람 자국" }, param: "dust + 4 lines",
          cap: { en: "A *puff* at the feet, *wind lines* behind.", ko: "발밑에 *먼지*, 뒤로 *바람 줄*." },
          miss(w, h) { dust(w, h.x, G, 6, -1); for (let i = 0; i < 4; i++) w.spawn({ type: "spark", x: h.x + 30, y: G - 30 - i * 25, vx: -500, vy: 0, drag: 6, life: 0.3, size: 2, color: "255,255,255" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish · whoosh",
          cap: { en: "Two *swishes*: the swing and the dodge.", ko: "휘두르는 *휙*, 피하는 *슉*." },
          miss(w) { w.sfx.slash(); w.after(0.05, () => w.sfx.swish()); },
        },
      ],
    },

    /* 23. 방어 */
    {
      id: "rpg-guard", cat: "rpg", view: "side",
      title: { en: "Make guarding feel *solid*", ko: "방어를 *단단하게*" },
      intro: { en: "Smaller number. *Did I block?*", ko: "숫자가 작네요. *막은 거예요?*" },
      interval: 1.4, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 150, h: 125 }); w.foe = w.actor("foe", { home: 430, h: 140 });
        const h = w.hero; h.maxHp = h.hp = 100; w.sh = { a: 0, hit: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe, h = w.hero;
        w.tween(f, { x: h.x + 105 }, 0.18, "in", () => {
          const at = { x: h.x + 50, y: G - 70 }, n = { text: "6", x: h.x, y: G - 165, vy: -260, g: 800, life: 1.1, size: 26, color: "#fff" };
          h.hp = h.hp > 20 ? h.hp - 6 : 100;
          w.emit("block", h, at, n);
          w.spawn(Object.assign({ type: "text" }, n));
          w.after(0.2, () => w.tween(f, { x: f.home }, 0.35, "inout", () => { w.busy = false; }));
        });
      },
      update(w, dt) { w.sh.hit = Math.max(0, w.sh.hit - dt * 2.5); },
      drawFront(w, ctx) { w.emit("front", ctx, w.sh); },
      drawHud(w, ctx) { hpBar(ctx, w.hero); },
      steps: [
        {
          id: "shield", name: { en: "Shield Up", ko: "방패 막" }, param: "arc · brightens on hit",
          cap: { en: "Show the *guard* itself: a glowing *shield arc*.", ko: "*방어*를 보여줘요. 빛나는 *방패 막*." },
          block(w, h, at) { w.sh.hit = 1; },
          front(w, ctx, S) {
            const h = w.hero, x = h.x + h.ox + 52, y = G - 70, a = 0.35 + 0.6 * S.hit;
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            ctx.strokeStyle = `rgba(125,211,252,${a})`; ctx.lineWidth = 5 + 4 * S.hit;
            ctx.beginPath(); ctx.ellipse(x - 30, y, 34, 78, 0, -1.2, 1.2); ctx.stroke();
            ctx.fillStyle = `rgba(56,189,248,${a * 0.25})`; ctx.beginPath(); ctx.ellipse(x - 30, y, 34, 78, 0, -1.2, 1.2); ctx.fill();
            ctx.restore();
          },
        },
        {
          id: "sparks", name: { en: "Deflect Sparks", ko: "튕겨나가는 불꽃" }, param: "14 sparks → back",
          cap: { en: "Sparks fly *back toward the attacker*.", ko: "불꽃이 *공격한 쪽으로* 튕겨요." },
          block(w, h, at) { sparks(w, at.x, at.y, 14, "186,230,253", [250, 650], -0.9, 0.9); w.spawn({ type: "star", x: at.x, y: at.y, size: 50, life: 0.15, color: "255,255,255" }); },
        },
        {
          id: "label", name: { en: "GUARD Label", ko: "GUARD 표시" }, param: "blue number + tag",
          cap: { en: "Blue *GUARD* tag, a *small blue* number.", ko: "파란 *GUARD* 표시, 숫자는 *작고 파랗게*." },
          block(w, h, at, n) { n.color = "#7dd3fc"; n.size = 22; n.x = h.x + 60; w.spawn({ type: "text", text: "GUARD", x: h.x - 20, y: G - 205, vy: -20, life: 1.2, size: 28, color: "#38bdf8" }); },
        },
        {
          id: "slide", name: { en: "Guard Slide", ko: "버티며 밀림" }, param: "-24px · dust",
          cap: { en: "Slide back *a little* with feet planted. *Dust*.", ko: "버티면서 *살짝* 밀려요. 발밑에 *먼지*." },
          block(w, h) { h.ox -= 24; h.k = 6; dust(w, h.x + 20, G, 7, 1); },
        },
        {
          id: "repel", name: { en: "Repel Attacker", ko: "공격자가 튕김" }, param: "foe +30 · flash",
          cap: { en: "The *attacker* bounces off. You won that exchange.", ko: "*때린 쪽*이 튕겨 나가요. 이번 판은 내 승." },
          block(w) { const f = w.foe; f.ox += 34; f.sx = 0.85; f.sy = 1.12; f.vib = 5; },
        },
        {
          id: "stop", name: { en: "Short Stop", ko: "짧은 멈칫" }, param: "stop 60ms · shake .15",
          cap: { en: "A *short* stop. Shorter than a real hit.", ko: "*짧게* 멈칫. 진짜 맞을 때보다 짧게." },
          block(w) { w.hitstop(0.06); w.shake(0.15, -1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "metal clang",
          cap: { en: "A ringing *clang*. Never a fleshy thud.", ko: "울리는 *깡*. 살 맞는 *퍽* 소리는 금지." },
          block(w) { w.play(() => { tn({ type: "triangle", f: 1250, f2: 1180, dur: 0.35, vol: 0.2 }); tn({ type: "triangle", f: 1870, dur: 0.25, vol: 0.1 }); nz({ type: "highpass", f: 3000, dur: 0.05, vol: 0.35 }); }); },
        },
      ],
    },

    /* 24. 소환 */
    {
      id: "rpg-summon", cat: "rpg", view: "side",
      title: { en: "Make summons *arrive*", ko: "소환수가 *등장하게*" },
      intro: { en: "Poof. A golem is just… *there*.", ko: "뿅. 골렘이 그냥… *있어요*." },
      interval: 1.9, stepDur: 4.2,
      setup(w) {
        polySprite("rpg-golem", () => [
          blk(0, 0, -26, 40, 70, 36, 0.9), blk(0, 0, 26, 40, 70, 36, 0.9),
          blk(0, 66, 0, 84, 96, 104, 1.15), blk(6, 156, 0, 46, 38, 44, 0.85),
          blk(4, 50, -76, 34, 112, 34, 1.1), blk(4, 50, 76, 34, 112, 34, 1.1),
        ], 240, 240, -0.55, 0.3, [147, 197, 253], [23, 37, 84]);
        if (!ACTOR["rpg-golem"]) ACTOR["rpg-golem"] = { spr: "rpg-golem", h: 190, home: 360 };
        w.hero = w.actor("hero", { home: 110, h: 120 });
        w.gol = w.actor("rpg-golem"); w.gol.alpha = 0;
        w.C = { a: 0, rot: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const g = w.gol;
        w.emit("summon", g);
        w.after(w.on("circle") ? 0.35 : 0, () => { g.alpha = 1; w.emit("emerge", g); });
        w.after(1.45, () => { g.alpha = 0; w.C.a = 0; w.busy = false; });
      },
      update(w, dt) { w.C.rot += dt * 2; },
      drawBack(w, ctx) { magicCircle(ctx, 360, G, 120, w.C.rot, w.C.a, "96,165,250", 0.26); },
      steps: [
        {
          id: "circle", name: { en: "Summon Circle", ko: "소환진" }, param: "r 120 · 350ms lead",
          cap: { en: "Draw the *circle* first. The ground announces it.", ko: "*소환진*부터. 땅이 먼저 알려줘요." },
          summon(w) { w.C.a = 0; w.tween(w.C, { a: 1 }, 0.3, "out"); },
        },
        {
          id: "rise", name: { en: "Rise From Below", ko: "땅에서 솟아오름" }, param: "scaleY 0 → 1 back",
          cap: { en: "It *rises out of the ground*, not from nowhere.", ko: "허공 말고 *땅에서 솟아요*." },
          emerge(w, g) { g.sy = 0.05; g.sx = 0.8; w.tween(g, { sy: 1, sx: 1 }, 0.45, "back"); },
        },
        {
          id: "pillar", name: { en: "Light Pillar", ko: "빛기둥" }, param: "beam 120px",
          cap: { en: "A *pillar* of light marks the spot.", ko: "*빛기둥*이 자리를 표시해요." },
          emerge(w) { w.spawn({ type: "beam", x: 360, y: G, size: 120, h: 400, life: 0.9, color: "96,165,250" }); },
        },
        {
          id: "smoke", name: { en: "Smoke Ring", ko: "연기 고리" }, param: "16 puffs outward",
          cap: { en: "A *ring of smoke* bursts from its feet.", ko: "발밑에서 *연기*가 둥글게 터져요." },
          emerge(w) { for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; w.spawn({ type: "smoke", x: 360 + Math.cos(a) * 30, y: G - 6 + Math.sin(a) * 8, vx: Math.cos(a) * 260, vy: Math.sin(a) * 50 - 20, drag: 3, size: 12, size1: 30, life: 1.0, color: "148,163,184" }); } },
        },
        {
          id: "slam", name: { en: "Landing Slam", ko: "쿵 착지" }, param: "shake .5 · ring",
          cap: { en: "When fully out: *slam*. It has *weight*.", ko: "다 나오면 *쿵*. *무게*가 느껴져요." },
          emerge(w) { w.after(0.4, () => { w.shake(0.5); w.kick(0, 12); w.spawn({ type: "ring", flat: true, x: 360, y: G, size: 40, size1: 200, life: 0.5, w: 8, color: "191,219,254" }); dust(w, 360, G, 10); }); },
        },
        {
          id: "roar", name: { en: "Roar Waves", ko: "포효 파동" }, param: "3 rings from head",
          cap: { en: "Three *roar rings* from its head. Presence!", ko: "머리에서 *파동* 세 번. 존재감!" },
          emerge(w) { for (let i = 0; i < 3; i++) w.after(0.5 + i * 0.12, () => w.spawn({ type: "ring", x: 368, y: G - 160, size: 20, size1: 140, life: 0.5, w: 6, color: "255,255,255" })); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hum · rumble · boom",
          cap: { en: "*Hum*, a deep *rumble*, then *BOOM*.", ko: "*웅*, 낮은 *우르르*, 그리고 *쿵*." },
          summon(w) { w.sfx.charge(); },
          emerge(w) { w.sfx.boost(); w.after(0.4, () => w.sfx.slam()); },
        },
      ],
    },

    /* 25. 궁극기 */
    {
      id: "rpg-ultimate", cat: "rpg", view: "side",
      title: { en: "Make ultimates feel *ultimate*", ko: "궁극기는 *궁극기답게*" },
      intro: { en: "Ultimate skill. Big number. *That's all?*", ko: "궁극기. 숫자만 큼. *이게 다?*" },
      interval: 2.3, stepDur: 4.4,
      setup(w) {
        w.hero = w.actor("hero", { home: 110, h: 125 }); w.foe = w.actor("foe", { home: 400, h: 175, hp: 900 });
        w.U = { dim: 0, beam: -1, charging: false };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const blast = () => {
          const f = w.foe; f.hp = Math.max(0, f.hp - 300); f.flash = 1; f.ox += 20; w.U.charging = false;
          w.spawn({ type: "slash", x: (w.hero.x + f.x) / 2, y: G - 80, ang: 0, len: (f.x - w.hero.x) / 2 - 30, size: 4, life: 0.25, color: "255,255,255" });
          w.emit("blast", w.U, f);
          if (!w.on("multi")) w.spawn({ type: "text", text: "300", x: f.x - 110, y: G - 160, vy: -40, life: 1.2, size: 44, color: "#fff" });
          if (f.hp <= 0) w.after(0.8, () => { f.hp = f.maxHp; });
          w.after(0.4, () => { w.busy = false; });
        };
        if (w.on("charge")) { w.U.charging = true; w.emit("charge", w.U); w.after(0.8, blast); } else blast();
      },
      update(w, dt) {
        const U = w.U; U.dim = U.charging ? Math.min(1, U.dim + dt * 4) : Math.max(0, U.dim - dt * 1.5);
        if (U.beam >= 0) { U.beam += dt; if (U.beam > 0.6) U.beam = -1; }
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(-80, G, 700, 120);
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
        if (w.U.dim > 0) { ctx.fillStyle = `rgba(4,5,9,${w.U.dim * 0.75})`; ctx.fillRect(-100, -100, 740, 560); }
      },
      drawBack(w, ctx) { w.emit("back", ctx, w.U); },
      drawFront(w, ctx) { w.emit("front", ctx, w.U); },
      drawHud(w, ctx) { drawBigBar(ctx, w.foe); w.emit("hud", ctx, w.U); },
      steps: [
        {
          id: "charge", name: { en: "Darken + Aura", ko: "어둡게 + 기운" }, param: "0.8s · dark .75",
          cap: { en: "The world *goes dark*. Only the hero *burns*.", ko: "세상은 *어두워지고*, 주인공만 *타올라요*." },
          charge(w) {
            const h = w.hero;
            for (let i = 0; i < 28; i++) w.after(i * 0.028, () => w.spawn({ type: "glow", x: h.x + rand(-40, 40), y: G - rand(0, 40), vy: rand(-260, -140), size: rand(12, 22), size1: 0, life: 0.6, color: i % 3 ? "198,244,50" : "255,255,255" }));
          },
          back(w, ctx, U) { if (U.charging) { ctx.globalCompositeOperation = "lighter"; glow(ctx, w.hero.x, G - 60, 120, "198,244,50", 0.5 * U.dim); ctx.globalCompositeOperation = "source-over"; } },
        },
        {
          id: "cam", name: { en: "Camera Push", ko: "카메라 밀기" }, param: "lead -90px → back",
          cap: { en: "*Push the camera* onto the hero while charging.", ko: "모으는 동안 *카메라*가 주인공에게 다가가요." },
          charge(w) { w.cam.tx = -90; w.zoom = 0.12; },
          blast(w) { w.cam.tx = 0; },
          update(w) { if (w.U.charging) w.zoom = Math.max(w.zoom, 0.1); },
        },
        {
          id: "name", name: { en: "Skill Name", ko: "기술 이름" }, param: "slide in · 40px",
          cap: { en: "Shout the *skill name* across the screen.", ko: "*기술 이름*을 화면에 크게 외쳐요." },
          charge(w) { w.spawn({ type: "text", text: "NOVA BREAKER", x: 250, y: 120, vx: -20, life: 1.3, size: 40, color: "#c6f432" }); },
        },
        {
          id: "beam", name: { en: "Giant Beam", ko: "거대한 빔" }, param: "h 90 · 600ms",
          cap: { en: "A beam *wider than the enemy*. Overkill is the point.", ko: "적보다 *굵은 빔*. 과하게가 정답." },
          blast(w, U) { U.beam = 0; },
          front(w, ctx, U) {
            if (U.beam < 0) return;
            const k = U.beam / 0.6, hh = 90 * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85 * 0.9), y = G - 80, x0 = w.hero.x + 40;
            const g = ctx.createLinearGradient(0, y - hh / 2, 0, y + hh / 2);
            g.addColorStop(0, "rgba(198,244,50,0)"); g.addColorStop(0.3, "rgba(198,244,50,0.9)"); g.addColorStop(0.5, "rgba(255,255,255,1)"); g.addColorStop(0.7, "rgba(198,244,50,0.9)"); g.addColorStop(1, "rgba(198,244,50,0)");
            ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x0, y - hh / 2, 700, hh);
            glow(ctx, x0, y, hh * 1.2, "198,244,50", 0.9); ctx.globalCompositeOperation = "source-over";
          },
        },
        {
          id: "multi", name: { en: "Multi-hit", ko: "연타 숫자" }, param: "5 × 60 · 70ms",
          cap: { en: "Split it into *rapid hits*. Five numbers, one blast.", ko: "*여러 번* 나눠 때려요. 숫자 다섯 개." },
          blast(w, U, f) {
            for (let i = 0; i < 5; i++) w.after(i * 0.07, () => { f.vib = 8; f.flash = 0.8; w.spawn({ type: "text", text: "60", x: f.x - 90 + i * 12, y: G - 70 - i * 24, vy: -40, life: 1, size: 30 + i * 3, color: i === 4 ? "#c6f432" : "#fff" }); });
          },
        },
        {
          id: "impact", name: { en: "White-out + Quake", ko: "하얗게 + 지진" }, param: "flash .9 · trauma .8",
          cap: { en: "Blow out to *white*, then *quake*.", ko: "화면을 *하얗게* 날리고, 크게 *흔들어요*." },
          blast(w) { w.flash("255,255,255", 0.7); w.shake(0.8, 1); burst(w, w.foe.x - 30, G - 80, 30, "236,252,203", [300, 900], 3); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rise · boom · tail",
          cap: { en: "Long *rise*, then a *boom* with a tail.", ko: "길게 *차오르고*, 꼬리 긴 *쿠웅*." },
          charge(w) { w.sfx.boost(); },
          blast(w) { w.sfx.boom(); w.sfx.burst(); },
        },
      ],
    },

    /* 26. 파티 교체 */
    {
      id: "rpg-party-swap", cat: "rpg", view: "side",
      title: { en: "Make party swaps *snappy*", ko: "파티 교체를 *착착*" },
      intro: { en: "Different person. *When did that happen?*", ko: "사람이 바뀌었어요. *언제요?*" },
      interval: 1.5, stepDur: 3.8,
      setup(w) {
        polySprite("rpg-knight", humanModel, 170, 260, -0.72, 0.3, [147, 197, 253], [30, 58, 138]);
        if (!ACTOR["rpg-knight"]) ACTOR["rpg-knight"] = { spr: "rpg-knight", h: 140, home: 150 };
        w.M = [
          { a: w.actor("hero", { home: 150, h: 130 }), name: "HERO", col: "#e5e7eb", rgb: "229,231,235", lift: 1 },
          { a: w.actor("rpg-knight"), name: "KNIGHT", col: "#60a5fa", rgb: "96,165,250", lift: 0 },
        ];
        w.M[1].a.alpha = 0;
        w.foe = w.actor("foe", { home: 440, h: 140 });
        w.cur = 0;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const out = w.M[w.cur], inn = w.M[w.cur = 1 - w.cur];
        const enter = () => { out.a.alpha = 0; inn.a.alpha = 1; inn.a.x = inn.a.home; w.emit("join", inn); };
        w.emit("swap", out, inn);
        if (w.on("exit")) w.tween(out.a, { x: -90 }, 0.16, "in", enter); else enter();
        w.after(0.7, () => { w.busy = false; });
      },
      drawHud(w, ctx) { w.emit("hud", ctx); },
      steps: [
        {
          id: "exit", name: { en: "Exit Dash", ko: "퇴장 대시" }, param: "→ -90px · 160ms",
          cap: { en: "The old member *dashes out*. Clear exit.", ko: "나가는 쪽은 *휙* 퇴장. 확실하게." },
          swap(w, out) { out.a.sx = 1.25; out.a.sy = 0.85; dust(w, out.a.x, G, 5, 1); },
        },
        {
          id: "enter", name: { en: "Slide In", ko: "미끄러지며 등장" }, param: "from -90 · 220ms",
          cap: { en: "The new one *slides in* and *skids* to a stop.", ko: "새 멤버는 *쭉* 미끄러져 들어와 *끼익*." },
          join(w, m) { const a = m.a; a.x = -90; w.tween(a, { x: a.home }, 0.22, "out", () => { dust(w, a.x + 30, G, 7, -1); }); },
        },
        {
          id: "flash", name: { en: "Color Flash", ko: "멤버 색 번쩍" }, param: "ring + glow",
          cap: { en: "Flash the *member's color*. Who it is, instantly.", ko: "*멤버 색*으로 번쩍. 누군지 바로 알아요." },
          join(w, m) {
            w.after(0.22, () => { m.a.flash = 1; w.spawn({ type: "ring", x: m.a.home, y: G - 65, size: 20, size1: 120, life: 0.45, w: 8, color: m.rgb }); w.spawn({ type: "glow", under: true, x: m.a.home, y: G - 65, size: 130, size1: 50, life: 0.7, color: m.rgb }); });
          },
        },
        {
          id: "pose", name: { en: "Entry Pose", ko: "등장 포즈" }, param: "hop · squash",
          cap: { en: "A little *hop* on arrival. Ready to fight.", ko: "도착하면 *폴짝*. 싸울 준비 완료." },
          join(w, m) { const a = m.a; w.after(0.24, () => { a.sx = 0.85; a.sy = 1.18; w.tween(a, { oy: -26 }, 0.12, "out", () => w.tween(a, { oy: 0 }, 0.14, "in", () => { a.sx = 1.2; a.sy = 0.82; })); }); },
        },
        {
          id: "card", name: { en: "Portrait Cards", ko: "초상 카드" }, param: "active lifts 14px",
          cap: { en: "The HUD card *lifts* to match who's out.", ko: "화면 아래 카드도 *쓱* 올라와요." },
          swap(w, out, inn) { w.tween(out, { lift: 0 }, 0.2, "out"); w.tween(inn, { lift: 1 }, 0.3, "back"); },
          hud(w, ctx) {
            w.M.forEach((m, i) => {
              const x = 60 + i * 76, y = 300 - m.lift * 14;
              panel(ctx, x - 32, y - 26, 64, 52, 10, m.lift > 0.5 ? "#2a3140" : "#181b22", m.lift > 0.5 ? m.col : "rgba(255,255,255,0.15)", 2.5);
              const c = SPR[i ? "rpg-knight" : "hero"].c; ctx.globalAlpha = 0.4 + 0.6 * m.lift; ctx.drawImage(c, x - 14, y - 22, 28, 28 * c.height / c.width); ctx.globalAlpha = 1;
            });
          },
        },
        {
          id: "tag", name: { en: "Name Tag", ko: "이름표" }, param: "pop over head",
          cap: { en: "Pop the *name* above their head.", ko: "머리 위에 *이름*이 톡." },
          join(w, m) { w.after(0.2, () => w.spawn({ type: "text", text: m.name, x: m.a.home, y: G - 170, vy: -20, life: 1.1, size: 26, color: m.col })); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh · stomp",
          cap: { en: "*Whoosh* out, *stomp* in.", ko: "나갈 때 *휙*, 들어올 때 *탁*." },
          swap(w) { w.sfx.dash(); },
          join(w) { w.after(0.24, () => w.sfx.land()); },
        },
      ],
    },

    /* 27. 승리 결산 */
    {
      id: "rpg-victory", cat: "rpg", view: "ui",
      title: { en: "Make victory screens *pay out*", ko: "승리 화면은 *정산하는 맛*" },
      intro: { en: "Everything at once. *Read it yourself.*", ko: "한꺼번에 툭. *알아서 읽으세요.*" },
      interval: 2.4, stepDur: 4.4,
      drawFloor() {},
      setup(w) {
        w.V = { ban: 1, rows: [{ n: "EXP", v: 240, col: "#7dd3fc" }, { n: "GOLD", v: 135, col: "#fde047" }], xp: 0.8, items: 3, stars: 3 };
        w.show = () => { const V = w.V; V.t = 0; V.ban = 1; V.xp = 0.8; V.items = 3; V.stars = 3; V.rows.forEach(r => { r.shown = r.v; r.dx = 0; }); };
        w.show();
      },
      fire(w) { w.show(); w.emit("show", w.V); },
      update(w, dt) { w.V.t += dt; },
      drawFront(w, ctx) {
        const V = w.V;
        panel(ctx, 110, 108, 320, 200, 16, "rgba(24,27,36,0.95)");
        if (V.t < 0.25 && !w.on("banner")) return;
        ctx.save(); ctx.translate(270, 66); ctx.scale(V.ban, V.ban); T(ctx, "VICTORY", 0, 0, 44, "#c6f432"); ctx.restore();
        V.rows.forEach((r, i) => {
          const y = 140 + i * 36;
          ctx.save(); ctx.translate(r.dx, 0); ctx.globalAlpha = Math.max(0, 1 - r.dx / 200);
          T(ctx, r.n, 136, y, 16, "#94a3b8", "left", 700); T(ctx, "+" + Math.round(r.shown), 404, y, 22, r.col, "right");
          ctx.restore();
        });
        panel(ctx, 136, 207, 268, 10, 5, "#0b0d12", null);
        ctx.fillStyle = "#38bdf8"; ctx.fillRect(136, 207, 268 * Math.min(1, V.xp), 10);
        for (let i = 0; i < V.items; i++) { const s = V["is" + i] == null ? 1 : V["is" + i]; ctx.save(); ctx.translate(166 + i * 52, 254); ctx.scale(s, s); slotIcon(ctx, ["sword", "potion", "star"][i], 0, 0, 20, ["#cbd5e1", "#fb7185", "#fde047"][i]); ctx.restore(); }
        for (let i = 0; i < V.stars; i++) { const s = V["ss" + i] == null ? 1 : V["ss" + i]; ctx.save(); ctx.translate(334 + i * 30, 254); ctx.scale(s, s); ctx.fillStyle = "#fde047"; star5(ctx, 0, 0, 12); ctx.fill(); ctx.restore(); }
      },
      steps: [
        {
          id: "banner", name: { en: "Banner Slam", ko: "VICTORY 쾅" }, param: "3× → 1 · 200ms",
          cap: { en: "*VICTORY* slams down from huge.", ko: "*VICTORY*가 크게 떨어져 *쾅*." },
          show(w, V) { V.ban = 3; w.tween(V, { ban: 1 }, 0.2, "in", () => w.shake(0.3)); },
        },
        {
          id: "stagger", name: { en: "Row Stagger", ko: "한 줄씩 등장" }, param: "slide · 150ms apart",
          cap: { en: "Rows slide in *one by one*. Each gets a beat.", ko: "결과가 *한 줄씩* 들어와요. 하나하나 주목." },
          show(w, V) { V.rows.forEach((r, i) => { r.dx = 200; w.after(0.2 + i * 0.15, () => w.tween(r, { dx: 0 }, 0.2, "out")); }); },
        },
        {
          id: "count", name: { en: "Count Up", ko: "숫자 올라감" }, param: "0 → value · 600ms",
          cap: { en: "Numbers *count up* from zero. Feel it pile.", ko: "숫자가 0부터 *쌓여 올라가요*." },
          show(w, V) { V.rows.forEach((r, i) => { r.shown = 0; w.after(0.25 + i * 0.15, () => w.tween(r, { shown: r.v }, 0.6, "out")); }); },
        },
        {
          id: "xp", name: { en: "EXP Bar Fill", ko: "경험치 바 차오름" }, param: "20% → 80%",
          cap: { en: "The EXP bar *fills* while you watch.", ko: "보는 앞에서 경험치 바가 *차올라요*." },
          show(w, V) { V.xp = 0.2; w.after(0.4, () => w.tween(V, { xp: 0.8 }, 0.6, "out")); },
        },
        {
          id: "items", name: { en: "Item Pops", ko: "아이템 톡톡" }, param: "120ms apart · back",
          cap: { en: "Loot icons *pop in* one after another.", ko: "전리품이 *톡, 톡, 톡*." },
          show(w, V) { for (let i = 0; i < 3; i++) { V["is" + i] = 0; w.after(0.5 + i * 0.12, () => w.tween(V, { ["is" + i]: 1 }, 0.25, "back")); } },
        },
        {
          id: "stars", name: { en: "Star Stamps", ko: "별 도장" }, param: "2× → 1 · 150ms apart",
          cap: { en: "Rating stars *stamp* in last. The grand finish.", ko: "별점은 마지막에 *쾅쾅쾅*. 피날레." },
          show(w, V) { for (let i = 0; i < 3; i++) { V["ss" + i] = 0; w.after(0.7 + i * 0.15, () => { V["ss" + i] = 2.2; w.tween(V, { ["ss" + i]: 1 }, 0.15, "in"); w.after(0.15, () => w.spawn({ type: "star", x: 334 + i * 30, y: 254, size: 26, life: 0.3, color: "253,224,71" })); }); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "ticks + fanfare",
          cap: { en: "Ticking *tally*, then a *fanfare*.", ko: "*타다닥* 세고, *빰빠밤*." },
          show(w) { w.sfx.fanfare(); for (let i = 0; i < 10; i++) w.after(0.25 + i * 0.06, () => w.sfx.tick()); },
        },
      ],
    },

    /* 28. 골드 카운터 */
    {
      id: "rpg-gold", cat: "rpg", view: "ui",
      title: { en: "Make gold counters *roll*", ko: "골드 숫자를 *굴러가게*" },
      intro: { en: "Number swapped. *How much did I get?*", ko: "숫자만 바뀌었어요. *얼마 들어왔죠?*" },
      interval: 1.4, stepDur: 3.8,
      drawFloor() {},
      setup(w) { w.Gd = { v: 12480, shown: 12480, sc: 1, glow: 0, spin: 0, last: 12480 }; },
      fire(w) {
        const Gd = w.Gd, add = pick([150, 320, 880, 240]);
        if (Gd.v > 90000) Gd.v = Gd.shown = Gd.last = 12480;
        Gd.v += add;
        w.emit("gain", Gd, add);
      },
      update(w, dt) {
        const Gd = w.Gd; Gd.sc += (1 - Gd.sc) * Math.min(1, dt * 8); Gd.glow = Math.max(0, Gd.glow - dt * 1.2);
        if (!w.on("count")) Gd.shown = Gd.v;
        const n = Math.floor(Gd.shown); if (n !== Gd.last) { w.emit("tick", Gd, n); Gd.last = n; }
      },
      drawFront(w, ctx) {
        const Gd = w.Gd;
        w.emit("behind", ctx, Gd);
        ctx.save(); ctx.translate(270, 150); ctx.scale(Gd.sc, Gd.sc);
        panel(ctx, -150, -40, 300, 80, 40, "#1c2029", "rgba(250,204,21,0.4)", 2);
        ctx.save(); ctx.translate(-108, 0); ctx.scale(Math.cos(Gd.spin) || 0.05, 1); icon(ctx, "coin", 0, 0, 24, "#facc15"); ctx.restore();
        if (!w.on("odo")) T(ctx, Math.floor(Gd.shown).toLocaleString("en-US"), 120, 2, 40, "#fde047", "right");
        w.emit("digits", ctx, Gd);
        ctx.restore();
      },
      steps: [
        {
          id: "count", name: { en: "Count Up", ko: "올라가며 세기" }, param: "lerp ×4",
          cap: { en: "Don't swap the number. *Count up* to it.", ko: "숫자를 바꾸지 말고, *세면서* 올라가요." },
          update(w, dt) { const Gd = w.Gd; Gd.shown += (Gd.v - Gd.shown) * Math.min(1, dt * 4); if (Gd.v - Gd.shown < 0.5) Gd.shown = Gd.v; },
        },
        {
          id: "odo", name: { en: "Odometer Digits", ko: "다이얼 숫자" }, param: "per-digit scroll",
          cap: { en: "Each digit *scrolls* like an *odometer*.", ko: "자리마다 *다이얼처럼* 굴러가요." },
          digits(w, ctx, Gd) {
            const s = Gd.shown, str = Math.floor(Gd.v).toLocaleString("en-US");
            ctx.save(); ctx.beginPath(); ctx.rect(-80, -28, 210, 56); ctx.clip();
            let x = 120, p = 0;
            for (let i = str.length - 1; i >= 0; i--) {
              if (str[i] === ",") { T(ctx, ",", x - 6, 2, 40, "#fde047"); x -= 12; continue; }
              const v = (s / Math.pow(10, p)) % 10, d = Math.floor(v), f = p === 0 ? v - d : Math.max(0, (v - d - 0.9) * 10);
              T(ctx, String(d), x - 13, 2 - f * 46, 40, "#fde047"); T(ctx, String((d + 1) % 10), x - 13, 48 - f * 46, 40, "#fde047");
              x -= 26; p++;
            }
            ctx.restore();
          },
        },
        {
          id: "delta", name: { en: "Delta Tag", ko: "더해지는 금액" }, param: "+880 → merges in",
          cap: { en: "Show the *+880* first, then let it *merge in*.", ko: "*+880*을 먼저 보여주고 *쏙* 합쳐요." },
          gain(w, Gd, add) {
            const t = w.spawn({ type: "text", text: "+" + add.toLocaleString("en-US"), x: 330, y: 230, life: 1.1, size: 30, color: "#c6f432", hold: true });
            w.tween(t, { y: 200 }, 0.3, "back", () => w.tween(t, { y: 155, x: 300 }, 0.6, "in"));
          },
        },
        {
          id: "coins", name: { en: "Coin Shower", ko: "동전 빨려 들어감" }, param: "12 coins → icon",
          cap: { en: "Coins *rain into* the counter's icon.", ko: "동전이 아이콘으로 *쏟아져 들어가요*." },
          gain(w) { for (let i = 0; i < 12; i++) w.after(i * 0.04, () => w.spawn({ type: "glow", seek: true, x: rand(80, 460), y: rand(260, 320), tx: 162, ty: 150, life: 0.45, size: 13, color: "250,204,21" })); },
        },
        {
          id: "spin", name: { en: "Coin Spin + Bump", ko: "동전 회전 + 톡" }, param: "spin while rolling",
          cap: { en: "The coin *spins* and the counter *bumps*.", ko: "동전은 *빙글*, 카운터는 *톡*." },
          gain(w, Gd) { Gd.sc = 1.15; Gd.glow = 1; },
          update(w, dt) { const Gd = w.Gd; if (Gd.v - Gd.shown > 1) Gd.spin += dt * 14; else Gd.spin = 0; },
        },
        {
          id: "glow", name: { en: "Gold Glow", ko: "금빛 후광" }, param: "glow behind · 1s",
          cap: { en: "A *gold glow* swells behind while it rolls.", ko: "구르는 동안 뒤로 *금빛*이 번져요." },
          behind(w, ctx, Gd) { if (Gd.glow > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, 270, 150, 220, "250,204,21", Gd.glow * 0.45); ctx.globalCompositeOperation = "source-over"; } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick per change",
          cap: { en: "A *tick* for every change. It *sounds* like money.", ko: "바뀔 때마다 *틱틱틱*. 돈 소리가 나요." },
          tick(w) { if (Math.random() < 0.5) w.play(() => tn({ type: "triangle", f: rand(2200, 2600), dur: 0.03, vol: 0.08 })); },
          gain(w) { w.sfx.chime(4); },
        },
      ],
    },

    /* 29. 스킬 트리 */
    {
      id: "rpg-skill-tree", cat: "rpg", view: "ui",
      title: { en: "Make skill unlocks *flow*", ko: "스킬 해금이 *흐르게*" },
      intro: { en: "A circle turned green. *Unlocked?*", ko: "동그라미가 초록이 됐어요. *열린 거예요?*" },
      interval: 0.95, stepDur: 3.8,
      drawFloor() {},
      setup(w) {
        const P = [[270, 288, -1], [190, 222, 0], [350, 222, 0], [140, 150, 1], [240, 150, 1], [300, 150, 2], [400, 150, 2], [270, 78, 4]];
        w.N = P.map(([x, y, p]) => ({ x, y, p, lit: p < 0, t: p < 0 ? 1 : 0, sc: 1, pulse: 0 }));
        w.ord = [1, 2, 3, 4, 5, 6, 7]; w.oi = 0; w.sp = { v: 7, sc: 1 };
      },
      fire(w) {
        if (w.oi >= w.ord.length) { w.N.forEach(n => { if (n.p >= 0) { n.lit = false; n.t = 0; } }); w.oi = 0; w.sp.v = 7; }
        const n = w.N[w.ord[w.oi++]]; w.sp.v--;
        w.emit("unlock", n);
        const light = () => { n.lit = true; w.emit("lit", n); };
        if (w.on("flow")) w.after(0.3, light); else { n.t = 1; light(); }
      },
      update(w, dt) { for (const n of w.N) n.sc += (1 - n.sc) * Math.min(1, dt * 9); w.sp.sc += (1 - w.sp.sc) * Math.min(1, dt * 8); },
      drawFront(w, ctx) {
        for (const n of w.N) {
          if (n.p < 0) continue;
          const a = w.N[n.p];
          ctx.strokeStyle = "#2a2f3a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(n.x, n.y); ctx.stroke();
          if (n.t > 0) { ctx.strokeStyle = "#c6f432"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (n.x - a.x) * n.t, a.y + (n.y - a.y) * n.t); ctx.stroke(); }
        }
        for (const n of w.N) {
          ctx.save(); ctx.translate(n.x, n.y); ctx.scale(n.sc, n.sc);
          w.emit("node", ctx, n);
          ctx.fillStyle = n.lit ? "#c6f432" : "#262b36"; ctx.strokeStyle = n.lit ? "#ecfccb" : "rgba(255,255,255,0.2)"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.stroke();
          icon(ctx, ["star", "sword", "shield", "fire", "bolt", "heart", "drop", "star"][w.N.indexOf(n)], 0, 0, 12, n.lit ? "#1a2e05" : "#4b5563");
          w.emit("lock", ctx, n);
          ctx.restore();
        }
        ctx.save(); ctx.translate(470, 64); ctx.scale(w.sp.sc, w.sp.sc); T(ctx, "SP " + w.sp.v, 0, 0, 20, "#c6f432", "right"); ctx.restore();
      },
      steps: [
        {
          id: "flow", name: { en: "Energy Flow", ko: "에너지가 흘러감" }, param: "edge fill 300ms",
          cap: { en: "Power *flows along the line* before it lights.", ko: "불 켜지기 전에 *선을 따라* 힘이 흘러가요." },
          unlock(w, n) { n.t = 0; w.tween(n, { t: 1 }, 0.3, "in"); },
        },
        {
          id: "pop", name: { en: "Node Pop", ko: "노드 톡" }, param: "1.5× → 1",
          cap: { en: "The node *pops* when the power arrives.", ko: "힘이 도착하면 노드가 *톡*." },
          lit(w, n) { n.sc = 1.5; },
        },
        {
          id: "burst", name: { en: "Ring Burst", ko: "고리 터짐" }, param: "ring + 10 sparks",
          cap: { en: "A *ring* and *sparks* burst out.", ko: "*고리*와 *불꽃*이 퍼져요." },
          lit(w, n) { w.spawn({ type: "ring", x: n.x, y: n.y, size: 22, size1: 70, life: 0.45, w: 6, color: "198,244,50" }); burst(w, n.x, n.y, 10, "217,249,157", [120, 360]); },
        },
        {
          id: "lock", name: { en: "Lock Shatters", ko: "자물쇠 깨짐" }, param: "padlock · 6 shards",
          cap: { en: "Locked nodes show a *padlock*. It *shatters*.", ko: "잠긴 노드엔 *자물쇠*. 열리면 *와장창*." },
          lock(w, ctx, n) {
            if (n.lit) return;
            panel(ctx, 6, 2, 18, 14, 3, "#94a3b8", null);
            ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(15, 2, 5, Math.PI, 0); ctx.stroke();
          },
          lit(w, n) { for (let i = 0; i < 6; i++) w.spawn({ type: "chunk", x: n.x + 15, y: n.y + 8, vx: rand(-160, 160), vy: rand(-300, -100), g: 1200, vr: rand(-15, 15), life: 0.7, size: 4, color: "148,163,184" }); },
        },
        {
          id: "next", name: { en: "Next Pulse", ko: "다음 후보 깜빡" }, param: "available nodes pulse",
          cap: { en: "Now-available nodes *pulse*. \"Pick me next.\"", ko: "이제 열 수 있는 노드가 *두근두근*. \"다음은 나.\"" },
          node(w, ctx, n) {
            if (n.lit || !w.N[n.p].lit) return;
            const k = (w.time * 1.5) % 1;
            ctx.strokeStyle = `rgba(198,244,50,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 24 + k * 14, 0, TAU); ctx.stroke();
          },
        },
        {
          id: "sp", name: { en: "Point Cost", ko: "포인트 차감" }, param: "-1 SP · bump",
          cap: { en: "The *SP* counter bumps and drops a *-1*.", ko: "*SP*가 톡 튀고 *-1*이 떨어져요." },
          unlock(w) { w.sp.sc = 1.4; w.spawn({ type: "text", text: "-1", x: 470, y: 90, vy: 50, life: 0.9, size: 20, color: "#f87171" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "zip · pop · chime",
          cap: { en: "A rising *zip*, then a crisp *pop*.", ko: "올라가는 *지잉*, 그리고 *톡*." },
          unlock(w) { w.play(() => tn({ type: "sawtooth", f: 300, f2: 1200, dur: 0.3, vol: 0.06 })); },
          lit(w) { w.sfx.pop(); w.sfx.chime(5); },
        },
      ],
    },

    /* 30. 인카운터 전환 */
    {
      id: "rpg-encounter", cat: "rpg", view: "side",
      title: { en: "Make encounters *break in*", ko: "전투 진입을 *와장창*" },
      intro: { en: "Walking… *cut*. Battle. No warning.", ko: "걷다가 *뚝*. 전투. 예고도 없이." },
      interval: 2.4, stepDur: 4.4,
      setup(w) {
        w.hero = w.actor("hero", { home: 240, h: 120 }); w.foe = w.actor("foe", { home: 420, h: 140 }); w.foe.alpha = 0;
        w.X = { mode: "field", flick: 0, swirl: -1 }; w.shards = [];
        w.toField = () => { w.X.mode = "field"; w.foe.alpha = 0; w.hero.x = w.hero.home = 240; };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const go = () => { w.X.mode = "battle"; w.foe.alpha = 1; w.hero.x = w.hero.home = 120; w.hero.oy = 0; w.emit("go", w.X); };
        w.emit("alert", w.X);
        w.after((w.on("alert") ? 0.35 : 0) + (w.on("flicker") ? 0.25 : 0), go);
        w.after(1.9, () => { w.toField(); w.busy = false; });
      },
      update(w, dt) {
        const h = w.hero;
        if (w.X.mode === "field" && !w.busy) h.oy = -Math.abs(Math.sin(w.time * 8)) * 6;
        w.X.flick = Math.max(0, w.X.flick - dt);
        if (w.X.swirl >= 0) { w.X.swirl += dt; if (w.X.swirl > 0.6) w.X.swirl = -1; }
        for (const s of w.shards) { s.vy += 1400 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; s.t -= dt; }
        w.shards = w.shards.filter(s => s.t > 0);
      },
      drawFloor(w, ctx) {
        if (w.X.mode === "field") {
          ctx.fillStyle = "#14532d"; ctx.fillRect(-80, G, 700, 120);
          ctx.fillStyle = "#166534"; for (let i = 0; i < 14; i++) ctx.fillRect(((i * 61 - w.time * 60) % 700 + 700) % 700 - 80, G + 10 + (i % 3) * 16, 26, 4);
          for (let i = 0; i < 5; i++) { const x = ((i * 150 - w.time * 30) % 750 + 750) % 750 - 100; ctx.fillStyle = "#1f3d2a"; ctx.beginPath(); ctx.arc(x, G - 50, 40, 0, TAU); ctx.fill(); ctx.fillStyle = "#3f2a1d"; ctx.fillRect(x - 6, G - 20, 12, 20); }
        } else {
          ctx.fillStyle = "#1a1220"; ctx.fillRect(-80, G, 700, 120);
          ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
          ctx.fillStyle = "rgba(239,68,68,0.08)"; ctx.fillRect(-80, -80, 700, G + 80);
        }
      },
      drawHud(w, ctx) {
        for (const s of w.shards) {
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.r);
          ctx.beginPath(); s.pts.forEach(([a, b], i) => ctx[i ? "lineTo" : "moveTo"](a, b)); ctx.closePath();
          const g = ctx.createLinearGradient(0, -s.oy, 0, 360 - s.oy); g.addColorStop(0, "#121318"); g.addColorStop((G - 2) / 360, "#121318"); g.addColorStop(G / 360, "#14532d"); g.addColorStop(1, "#14532d");
          ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        }
        w.emit("hud", ctx, w.X);
      },
      steps: [
        {
          id: "alert", name: { en: "! Alert", ko: "느낌표!" }, param: "350ms · hop",
          cap: { en: "A *!* pops over the hero. A beat of *warning*.", ko: "머리 위에 *!*. 잠깐 *예고*해요." },
          alert(w) {
            const h = w.hero; h.oy = 0; h.sx = 0.85; h.sy = 1.2;
            w.spawn({ type: "text", text: "!", x: h.x + 10, y: G - h.h - 30, life: 0.5, size: 46, color: "#f87171", hold: true });
          },
        },
        {
          id: "flicker", name: { en: "Flash Flicker", ko: "깜빡깜빡" }, param: "3 flashes · 250ms",
          cap: { en: "The screen *flickers* white. Danger!", ko: "화면이 하얗게 *깜빡깜빡*. 위험!" },
          alert(w) { for (let i = 0; i < 3; i++) w.after(0.35 + i * 0.08, () => w.flash("255,255,255", 0.4)); },
        },
        {
          id: "swirl", name: { en: "Vortex", ko: "소용돌이" }, param: "12 arms · spin",
          cap: { en: "A *vortex* spins in and swallows the field.", ko: "*소용돌이*가 돌며 들판을 삼켜요." },
          alert(w) { w.after(0.3, () => { w.X.swirl = 0; }); },
          hud(w, ctx, X) {
            if (X.swirl < 0) return;
            const k = X.swirl / 0.6, a = Math.sin(k * Math.PI) * 0.85;
            ctx.save(); ctx.translate(270, 180); ctx.rotate(k * 5); ctx.fillStyle = `rgba(5,6,10,${a})`;
            for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(160, -60, 340, 10); ctx.lineTo(340, 40); ctx.quadraticCurveTo(160, -20, 0, 0); ctx.fill(); }
            ctx.restore();
          },
        },
        {
          id: "shatter", name: { en: "Screen Shatter", ko: "화면 와장창" }, param: "24 shards · fall",
          cap: { en: "The field *shatters*. Battle is *behind* the glass.", ko: "들판이 *와장창*. 뒤에 *전투*가 있었어요." },
          go(w) {
            for (let gx = 0; gx < 6; gx++) for (let gy = 0; gy < 4; gy++) {
              const x0 = 20 + gx * 84, y0 = gy * 90, cx = x0 + 42, cy = y0 + 45, j = () => rand(-14, 14);
              const pts = [[x0 + j() - cx, y0 + j() - cy], [x0 + 84 + j() - cx, y0 + j() - cy], [x0 + 84 + j() - cx, y0 + 90 + j() - cy], [x0 + j() - cx, y0 + 90 + j() - cy]];
              w.shards.push({ x: cx, y: cy, oy: cy, pts, vx: (cx - 270) * rand(1, 3), vy: rand(-300, 0), r: 0, vr: rand(-4, 4), t: 1.1 });
            }
          },
        },
        {
          id: "slide", name: { en: "Battle Slide-in", ko: "적 등장 슬라이드" }, param: "foe +200 → home",
          cap: { en: "The enemy *slides in* with weight.", ko: "적이 *쿵* 하고 미끄러져 들어와요." },
          go(w) { const f = w.foe; f.x = 640; w.tween(f, { x: f.home }, 0.35, "out", () => { f.sx = 1.2; f.sy = 0.85; dust(w, f.x - 30, G, 8, 1); w.shake(0.3); }); },
        },
        {
          id: "banner", name: { en: "Encounter Banner", ko: "조우 알림" }, param: "ENCOUNTER! · red",
          cap: { en: "Red *ENCOUNTER!* tells you: fight now.", ko: "빨간 *ENCOUNTER!*. 지금 싸워요." },
          go(w) { w.spawn({ type: "text", text: "ENCOUNTER!", x: 270, y: 80, vy: -10, life: 1.3, size: 40, color: "#f87171" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "sting · crash",
          cap: { en: "A sharp *sting*, then glass *CRASH*.", ko: "날카로운 *띠링!*, 그리고 *와장창*." },
          alert(w) { w.play(() => { tn({ type: "square", f: 880, dur: 0.12, vol: 0.12 }); tn({ type: "square", f: 1320, dur: 0.18, vol: 0.12, delay: 0.1 }); }); },
          go(w) { w.play(() => { nz({ type: "highpass", f: 3000, dur: 0.5, vol: 0.5 }); nz({ dur: 0.4, f: 1500, f2: 200, vol: 0.4 }); }); w.sfx.thud(); },
        },
      ],
    },
  );
})();

"use strict";
/* 한 장면만 크게 보여 주는 전투 쇼케이스: 치명타, 보스 등장, 방어막 파괴, 패링, 궁극기, 콤보, 약점, 소환, 마지막 일격 */
(() => {
  /* ───── 공통 도우미 ───── */
  const part = (p, light, dark) => Object.assign(p, { light, dark });
  // 한 번 실행(fire)마다 세대 번호를 올려서, 이전 실행의 예약 작업은 무시
  const seq = w => {
    const g = (w.gen = (w.gen || 0) + 1);
    return (t, fn) => w.after(t, () => { if (w.gen === g) fn(); });
  };
  // 화면 전체 배경 + 받침대
  function stage(ctx, cx, cy, inner, outer, r = 340) {
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(-80, -80, 700, 520);
  }
  function plinth(ctx, x, y, rx, ry, fill, stroke) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = stroke.replace(/[\d.]+\)$/, "0.18)"); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.7, ry * 0.7, 0, 0, TAU); ctx.stroke();
  }
  // 번개 한 줄기 (방향 a, 마디 n, 마디 길이 d)
  function bolt(w, x, y, a, n, d, col, wd = 3, life = 0.3) {
    const pts = [[0, 0]];
    for (let k = 1; k <= n; k++) pts.push([Math.cos(a) * k * d + rand(-d / 2, d / 2), Math.sin(a) * k * d + rand(-d / 2, d / 2)]);
    w.spawn({ type: "crack", x, y, pts, w: wd, life, add: true, color: col });
  }
  function starBurst(w, x, y, n, cols, sp = [180, 420]) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(sp[0], sp[1]);
      w.spawn({ type: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.6, g: 240, size: rand(5, 10), life: rand(0.7, 1.2), color: pick(cols) });
    }
  }
  // 굵은 그라데이션 숫자/글자 (큰 데미지 숫자, 이름표)
  function bigText(ctx, text, x, y, size, stops, stroke = "#14060a", rot = 0, sc = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.font = `900 ${size}px Pretendard, "Apple SD Gothic Neo", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.lineWidth = size * 0.2; ctx.strokeStyle = stroke; ctx.strokeText(text, 0, 0);
    const g = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g; ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  /* ───── 보스 모델 (로우폴리, 얼굴 없음) ───── */
  const bossArt = () => polySprite("spot-combat-boss2", () => {
    const armor = [[214, 78, 64], [44, 8, 16]], skin = [[150, 205, 95], [32, 56, 26]], bone = [[248, 238, 214], [96, 84, 64]], iron = [[150, 150, 170], [30, 30, 42]];
    const horn = s => pyr([[s * 12, 262, -9], [s * 28, 262, -9], [s * 28, 270, 9], [s * 12, 270, 9]], [s * 56, 326, 0]);
    const spike = s => pyr([[s * 62, 236, -14], [s * 88, 236, -14], [s * 88, 236, 14], [s * 62, 236, 14]], [s * 84, 276, 0]);
    return [
      part(blk(-26, 0, 0, 32, 34, 40, 1), ...iron), part(blk(26, 0, 0, 32, 34, 40, 1), ...iron),
      part(blk(-26, 32, 0, 28, 70, 32, 0.9), ...skin), part(blk(26, 32, 0, 28, 70, 32, 0.9), ...skin),
      part(blk(0, 98, 0, 96, 30, 52, 1), ...armor),
      part(blk(0, 126, 0, 100, 102, 60, 1.2), ...armor),
      part(blk(0, 150, 10, 42, 58, 50, 0.8), ...bone),
      part(blk(-82, 116, 0, 30, 110, 30, 1.1), ...skin), part(blk(82, 116, 0, 30, 110, 30, 1.1), ...skin),
      part(blk(-82, 82, 0, 42, 40, 40, 1.05), ...iron), part(blk(82, 82, 0, 42, 40, 40, 1.05), ...iron),
      part(blk(-76, 210, 0, 54, 30, 64, 0.75), ...bone), part(blk(76, 210, 0, 54, 30, 64, 0.75), ...bone),
      part(spike(-1), ...bone), part(spike(1), ...bone),
      part(blk(0, 226, 0, 48, 46, 46, 0.85), ...skin),
      part(horn(-1), ...bone), part(horn(1), ...bone),
    ];
  }, 270, 330, 0.32, 0.2);

  RECIPES.push(
    /* ───────── 1. 치명타 큰 숫자 ───────── */
    {
      id: "spot-combat-crit", cat: "combat", view: "3d", polished: true,
      title: { en: "Make critical hits feel *massive*", ko: "치명타를 *묵직하게*" },
      intro: { en: "A critical hit. Same *tiny* number.", ko: "치명타인데 숫자가 *쥐꼬리*만 해요." },
      interval: 2.6, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 165, h: 136 });
        w.foe = w.actor("foe", { home: 372, h: 150 });
        w.dmg = null;
      },
      fire(w) {
        const h = w.hero, f = w.foe, later = seq(w);
        w.dmg = null; w.respawn(f); f.sx = f.sy = 1;
        if (h.k0 == null) h.k0 = h.k;
        h.k = h.k0; w.tween(h, { ox: -24 }, 0.26, "out");
        later(0.28, () => w.tween(h, { ox: 104 }, 0.13, "in", () => {
          h.k = 4; // 찌른 자세를 잠깐 유지
          const d = (w.dmg = { v: "4,812", x: 376, y: 132, t: 0, scale: 1, big: false, sh: 0 });
          f.ox = 22; f.hp = 40;
          w.emit("crit", f, d);
        }));
      },
      update(w, dt) { if (w.dmg) { w.dmg.t += dt; w.dmg.sh = Math.max(0, w.dmg.sh - dt * 30); } },
      drawFloor(w, ctx) {
        stage(ctx, 300, 170, "#52200c", "#0f0604");
        plinth(ctx, 270, G + 8, 236, 40, "#1f0d07", "rgba(255,150,80,0.45)");
      },
      drawHud(w, ctx) {
        const d = w.dmg; if (!d || d.t > 1.7) return;
        const a = Math.min(1, (1.7 - d.t) * 3), y = d.y - 26 * E.out(Math.min(1, d.t / 1.2));
        ctx.save(); ctx.globalAlpha = a;
        if (!d.big) label(ctx, d.v, d.x, y, 14, "#ffffff");
        else bigText(ctx, d.v, d.x + rand(-d.sh, d.sh), y + rand(-d.sh, d.sh), 66, ["#fffbe0", "#ffc531", "#ff3d1c"], "#1a0500", -0.1, d.scale);
        ctx.restore();
      },
      steps: [
        {
          id: "stop", name: { en: "Crit Freeze", ko: "치명타 멈춤" }, param: "stop 120ms · knock",
          cap: { en: "*Freeze* on contact. Flash it *white*, knock it back.", ko: "닿는 순간 *멈칫*, *하얗게* 번쩍, 뒤로 *퍽*." },
          crit(w, f) {
            w.hitstop(0.12);
            f.flash = 1; f.vib = 7; f.ox = 30;
          },
        },
        {
          id: "number", name: { en: "Giant Number", ko: "거대한 숫자" }, param: "66px · ×2.2 → ×1",
          cap: { en: "Make the number *huge*. Slam it down from *2×*.", ko: "숫자를 *크게*, *두 배*에서 쾅 줄여요." },
          crit(w, f, d) {
            d.big = true; d.scale = 2.2; d.sh = 9;
            w.tween(d, { scale: 1 }, 0.32, "back");
          },
        },
        {
          id: "slash", name: { en: "X Slash", ko: "X자 베기" }, param: "2 slashes · 24 sparks",
          cap: { en: "Cross two *slashes*. Spray *sparks*.", ko: "*X자*로 베고, *불꽃*을 튀겨요." },
          crit(w, f) {
            const x = f.x - 10, y = f.gy - 72;
            w.spawn({ type: "slash", x, y, ang: -0.75, len: 90, size: 12, life: 0.28, color: "255,240,200" });
            w.spawn({ type: "slash", x, y, ang: 0.75, len: 90, size: 12, life: 0.28, color: "255,120,60" });
            sparks(w, x, y, 24, "255,190,90", [300, 800]);
          },
        },
        {
          id: "stamp", name: { en: "Crit Stamp", ko: "치명타 도장" }, param: "rays 16 · stars 14",
          cap: { en: "Stamp *CRITICAL!* Fan *rays* behind it.", ko: "*CRITICAL!* 도장 꽝, 뒤로 *빛줄기*." },
          crit(w, f, d) {
            w.spawn({ type: "text", x: 262, y: 54, text: "CRITICAL!", size: 30, color: "#ffe14a", life: 1.6 });
            w.spawn({ type: "rays", under: true, x: d.x, y: d.y, n: 16, size: 40, size1: 230, vr: 1, life: 1.5, hold: true, color: "255,150,60" });
            starBurst(w, d.x, d.y, 14, ["255,220,90", "255,255,255", "255,120,60"]);
          },
        },
        {
          id: "punch", name: { en: "Screen Punch", ko: "화면 강타" }, param: "trauma .6 · zoom .1",
          cap: { en: "*Shake*, *zoom*, and burn the edges.", ko: "화면이 *흔들리고*, *확* 다가오고, 가장자리가 *타요*." },
          crit(w) {
            w.shake(0.6, 1); w.zoomPunch(0.1);
            w.flash("255,150,70", 0.23); w.vignette(0.6);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crit + metal ring",
          cap: { en: "Heavy *crunch* and a ringing *clang*.", ko: "묵직한 *콰직*, 길게 남는 *챙~*." },
          crit(w) {
            w.sfx.crit();
            w.play(() => tn({ type: "triangle", f: 1900, f2: 1700, dur: 0.6, vol: 0.12 }));
          },
        },
      ],
    },

    /* ───────── 2. 보스 등장 타이틀 ───────── */
    {
      id: "spot-combat-boss-intro", cat: "duel", view: "3d", polished: true,
      title: { en: "Make boss intros feel *epic*", ko: "보스 등장을 *웅장하게*" },
      intro: { en: "The boss shows up. Like a *pop-up*.", ko: "보스가 *팝업창*처럼 그냥 떠요." },
      interval: 3.4, stepDur: 4.2,
      // 보스: 적 픽셀 그림을 크게(움직이는 동작 그대로). 바닥선 아래는 잘라서 솟아오르게
      setup(w) {
        w.boss = { x: 270, rise: 0, vis: false, sy: 1, flash: 0, vib: 0, litT: -9 };
        w.foe = w.actor("foe", { home: 280, h: 230 }); w.foe.alpha = 0;
        w.title = null; w.bars = 0;
      },
      fire(w) {
        const b = w.boss, later = seq(w), f = w.foe;
        Object.assign(b, { rise: 0, vis: false, sy: 1, flash: 0, vib: 0, litT: -9 });
        w.respawn(f); Object.assign(f, { alpha: 0, sx: 1, sy: 1, oy: 0, clipY: null, forcePose: null });
        w.title = null; w.bars = 0;
        w.emit("intro", b);
        later(w.on("rise") ? 1.0 : 0.25, () => {
          b.vis = true;
          w.emit("arrive", b);
          later(0.15, () => { w.title = { s: 1, t: 0 }; w.emit("banner", w.title); });
        });
        later(3.0, () => { b.vis = false; w.title = null; w.bars = 0; f.alpha = 0; });
      },
      update(w, dt) {
        const b = w.boss, f = w.foe;
        b.vib = Math.max(0, b.vib - dt * 20);
        if (b.vis) { f.alpha = 1; f.oy = b.rise * (f.h + 8); f.clipY = b.rise > 0.001 ? G + 4 : null; if (b.vib > 0) { f.vib = b.vib; f.vibAxis = "x"; } }
        if (w.title) w.title.t += dt;
      },
      drawFloor(w, ctx) {
        stage(ctx, 270, 170, "#4a0c1c", "#0d0306");
        plinth(ctx, 270, G + 6, 220, 38, "#1c0609", "rgba(255,90,110,0.45)");
      },
      drawBack(w, ctx) {
        const b = w.boss, lt = w.time - b.litT;
        if (!b.vis || lt < 0 || lt > 2.6) return;
        // 무대 조명: 칸 단위 붉은 빛기둥 3개가 위에서 꽂히고, 뒤로 붉은 오라
        const a = Math.min(1, lt * 5) * (lt > 2.1 ? 1 - (lt - 2.1) / 0.5 : 1);
        ctx.globalAlpha = Math.max(0, a) * 0.85; pxAura(ctx, b.x, G - 140, w.time * 0.4, 4, [[60, 8, 18], [120, 20, 36], [200, 50, 70], [255, 140, 140]], 34);
        for (const [dx, wd] of [[-120, 18], [0, 46], [120, 18]]) for (let y = -60; y < G; y += 8) {
          const f = (y + 60) / (G + 60), ww = Math.round(wd * (0.6 + 0.8 * f) / 2) * 2;
          ctx.globalAlpha = Math.max(0, a) * (0.18 + 0.18 * f); ctx.fillStyle = "#ff4a5e"; ctx.fillRect(b.x + dx - ww / 2, y, ww, 8);
          ctx.globalAlpha = Math.max(0, a) * (0.25 + 0.2 * f); ctx.fillStyle = "#ffb0b8"; ctx.fillRect(b.x + dx - ww / 6, y, Math.max(2, Math.round(ww / 3)), 8);
        }
        ctx.globalAlpha = 1;
      },
      drawHud(w, ctx) {
        if (w.bars > 0) {
          ctx.fillStyle = "#000"; const bh = 44 * w.bars;
          ctx.fillRect(-80, -80, 700, 80 + bh); ctx.fillRect(-80, 360 - bh, 700, 200);
        }
        const T = w.title; if (!T) return;
        if (!w.on("slam")) { label(ctx, "DARK WARLORD", 270, 304, 14, "#ffffff"); return; }
        const a = Math.min(1, T.t * 6);
        ctx.save(); ctx.globalAlpha = a;
        ctx.save(); ctx.translate(270, 300); ctx.scale(T.s, T.s); ctx.transform(1, 0, -0.25, 1, 0, 0);
        rr(ctx, -170, -22, 340, 44, 4, "rgba(150,14,30,0.92)"); ctx.restore();
        bigText(ctx, "DARK WARLORD", 270, 299, 34, ["#ffffff", "#ffd2d2", "#ff6a6a"], "#2a0008", 0, T.s);
        if (T.t > 0.3) label(ctx, "— LORD OF THE PIT —", 270, 330, 11, `rgba(255,190,190,${Math.min(1, (T.t - 0.3) * 4)})`);
        ctx.restore();
      },
      steps: [
        {
          id: "bars", name: { en: "Letterbox", ko: "레터박스" }, param: "bars 44px · 0.5s",
          cap: { en: "Slide in *black bars*. Now it's a *cutscene*.", ko: "*검은 띠*가 내려오면 *컷신*이 돼요." },
          intro(w) { w.tween(w, { bars: 1 }, 0.5, "out"); },
        },
        {
          id: "rise", name: { en: "Rise Up", ko: "솟아오르기" }, param: "1.0s · rumble .3",
          cap: { en: "Let it *rise* from the floor. *Rumble* the ground.", ko: "바닥에서 *스윽* 솟고, 땅이 *우르르*." },
          intro(w, b) {
            b.vis = true; b.rise = 1; b.vib = 3;
            w.tween(b, { rise: 0 }, 1.0, "out");
            for (let i = 0; i < 10; i++) w.after(i * 0.09, () => { for (let k = 0; k < 2; k++) { const sz = rand(2.5, 5), rot = rand(0, 6); w.spawn({ x: b.x + rand(-80, 80), y: G - 4, vx: rand(-160, 160), vy: rand(-380, -160), g: 1300, ground: true, bounce: 0.3, vr: rand(-12, 12), life: 0.9, draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#6a6560", "#2a2622") }); } });
            w.shake(0.3);
            for (let i = 0; i < 8; i++) w.after(i * 0.1, () => dust(w, b.x + rand(-90, 90), G, 3, 0, "120,60,70"));
          },
        },
        {
          id: "slam", name: { en: "Name Slam", ko: "이름 꽝" }, param: "×3 → ×1 · stop 80ms",
          cap: { en: "*Slam* the name in. A *red banner* behind it.", ko: "이름이 *쾅* 박히고, 뒤에 *붉은 띠*." },
          banner(w, T) {
            T.s = 3;
            w.tween(T, { s: 1 }, 0.2, "in", () => { w.hitstop(0.08); w.shake(0.4); });
          },
        },
        {
          id: "roar", name: { en: "Roar Wave", ko: "포효 파동" }, param: "rings 3 · squash .8",
          cap: { en: "*Roar*. Rings blast out, it *flexes*.", ko: "*크아앙!* 고리가 퍼지고 몸이 *움찔*." },
          arrive(w, b) {
            const f = w.foe; f.forcePose = "attack"; f.forceUntil = w.time + 0.7; f.flash = 0.5;
            for (let i = 0; i < 3; i++) w.after(i * 0.12, () => w.spawn({ type: "ring", x: b.x - 30, y: G - 170, size: 30, size1: 260, life: 0.5, w: 10, color: "255,110,110" }));
            for (let i = 0; i < 14; i++) { const a = Math.PI + rand(-0.8, 0.8); w.spawn({ type: "spark", x: b.x - 40, y: G - 175, vx: Math.cos(a) * rand(500, 900), vy: Math.sin(a) * rand(500, 900), drag: 3, life: rand(0.25, 0.4), size: 3, color: "255,170,170" }); }
            w.spawn({ type: "ring", flat: true, x: b.x, y: G + 4, size: 40, size1: 300, life: 0.7, w: 12, color: "255,160,140" });
            w.shake(0.6); w.flash("255,40,60", 0.16);
          },
        },
        {
          id: "light", name: { en: "Stage Lights", ko: "무대 조명" }, param: "beams 3 · rays 12",
          cap: { en: "*Spotlights* and *rays* behind it. Embers rise.", ko: "*조명*이 꽂히고, 뒤로 *빛줄기*, *불티*." },
          arrive(w, b) {
            b.litT = w.time;
            for (let i = 0; i < 26; i++) w.spawn({ type: "glow", x: b.x + rand(-200, 200), y: G + rand(-10, 10), vy: rand(-140, -50), size: rand(3, 6), life: rand(1.4, 2.4), color: "255,150,90" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rumble + roar + slam",
          cap: { en: "Low *rumble*, a *roar*, a heavy *slam*.", ko: "낮은 *웅웅*, *포효*, 묵직한 *쾅*." },
          // 솟아오를 때만 땅울림, 포효 연출이 있을 때만 포효, 이름이 꽝 박힐 때만 쾅
          intro(w) { if (w.on("rise")) w.play(() => { nz({ dur: 1.0, f: 260, f2: 120, vol: 0.55, att: 0.2, hold: 0.6 }); tn({ type: "sine", f: 42, f2: 34, dur: 1.0, vol: 0.45, att: 0.2, hold: 0.6 }); }); },
          arrive(w) { if (w.on("roar")) w.play(() => { tn({ type: "sawtooth", f: 74, f2: 50, dur: 0.9, vol: 0.2, lp: 650, att: 0.05, hold: 0.4 }); tn({ type: "sawtooth", f: 111, f2: 76, dur: 0.9, vol: 0.13, lp: 850, det: 15, att: 0.05, hold: 0.4 }); nz({ dur: 0.9, type: "bandpass", f: 450, f2: 260, q: 1.2, vol: 0.45, att: 0.05, hold: 0.4, rv: 0.35 }); }); else w.sfx.land(); },
          banner(w) { if (w.on("slam")) w.after(0.2, () => w.sfx.slam()); },
        },
      ],
    },

    /* ───────── 3. 방어막 파괴 ───────── */
    {
      id: "spot-combat-shield-break", cat: "combat", view: "3d", melee: true, polished: true,
      title: { en: "Make shield breaks feel *satisfying*", ko: "방어막 깨기를 *시원하게*" },
      intro: { en: "The shield breaks. It just *disappears*.", ko: "방어막이 깨졌는데 그냥 *사라져요*." },
      interval: 2.6, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 120, h: 132 });
        w.foe = w.actor("foe", { home: 350, h: 138 });
        w.sh = { cx: 345, cy: 196, r: 100, a: 1, hit: 0, crack: 0, wob: 0, cracks: [] };
        w.stun = 0;
      },
      fire(w) {
        const h = w.hero, f = w.foe, s = w.sh, later = seq(w);
        Object.assign(s, { a: 1, hit: 0, crack: 0, wob: 0 });
        w.respawn(f); f.sx = f.sy = 1; w.stun = 0;
        if (h.k0 == null) h.k0 = h.k;
        h.k = h.k0;
        s.cracks = Array.from({ length: 8 }, (_, i) => {
          const pts = [[-s.r + 4, rand(-10, 10)]], a0 = -1.1 + i * 0.3;
          for (let k = 1; k < 7; k++) { const p = pts[k - 1]; pts.push([p[0] + Math.cos(a0) * 26 + rand(-6, 10), p[1] + Math.sin(a0) * 26 + rand(-10, 10)]); }
          return pts;
        });
        w.tween(h, { ox: -26 }, 0.34, "out");
        later(0.36, () => w.tween(h, { ox: 88 }, 0.16, "in", () => {
          const x = s.cx - s.r + 4, y = s.cy;
          h.k = 4;
          w.emit("strike", s, x, y);
          later(w.on("crack") ? 0.5 : 0.04, () => {
            if (w.on("shatter")) s.a = 0; else w.tween(s, { a: 0 }, 0.25, "in");
            f.ox = 24; w.emit("break", s, x, y);
            later(1.7, () => { s.crack = 0; w.tween(s, { a: 1 }, 0.3, "out"); });
          });
        }));
      },
      update(w, dt) {
        const s = w.sh;
        s.hit = Math.max(0, s.hit - dt * 2.5); s.wob = Math.max(0, s.wob - dt * 2.2);
        w.stun = Math.max(0, w.stun - dt);
      },
      drawFloor(w, ctx) {
        stage(ctx, 330, 190, "#0d4048", "#03100f");
        plinth(ctx, 300, G + 8, 240, 40, "#06191b", "rgba(90,240,230,0.4)");
      },
      drawFront(w, ctx) {
        const s = w.sh, f = w.foe;
        if (w.stun > 0) for (let i = 0; i < 3; i++) {
          const a = w.time * 6 + i * TAU / 3;
          ctx.fillStyle = "#ffe14a"; starPath(ctx, f.x + Math.cos(a) * 36, f.gy - 150 + Math.sin(a) * 9, 8); ctx.fill();
        }
        if (s.a <= 0) return;
        const flick = (s.crack > 0 && Math.random() < s.crack * 0.35 ? 0.4 : 1) * s.a, wb = Math.sin(w.time * 50) * s.wob * 0.05;
        ctx.save(); ctx.translate(s.cx, s.cy); ctx.scale(1 - wb, 1 + wb); ctx.globalAlpha = flick;
        const g = ctx.createRadialGradient(-30, -40, 10, 0, 0, s.r);
        g.addColorStop(0, "rgba(160,255,250,0.10)"); g.addColorStop(0.8, "rgba(80,220,230,0.22)"); g.addColorStop(1, "rgba(160,255,255,0.45)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, TAU); ctx.fill();
        ctx.save(); ctx.clip();
        // 육각 격자: 맞은 쪽 칸이 더 밝게
        const R = 15, hx = R * 1.5, hy = R * Math.sqrt(3);
        for (let i = -8; i <= 8; i++) for (let j = -5; j <= 5; j++) {
          const x = i * hx, y = j * hy + (i & 1 ? hy / 2 : 0), d = Math.hypot(x + s.r, y);
          const lit = 0.18 + s.hit * Math.max(0, 1 - d / 160) * 0.8;
          ctx.strokeStyle = `rgba(150,255,250,${lit})`; ctx.lineWidth = 1.4;
          ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; ctx[k ? "lineTo" : "moveTo"](x + Math.cos(a) * R, y + Math.sin(a) * R); } ctx.closePath(); ctx.stroke();
        }
        if (s.crack > 0) {
          ctx.strokeStyle = "rgba(235,255,255,0.95)"; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
          for (const pts of s.cracks) {
            const n = Math.max(1, Math.round(pts.length * s.crack));
            ctx.beginPath(); for (let k = 0; k < n; k++) ctx[k ? "lineTo" : "moveTo"](pts[k][0], pts[k][1]); ctx.stroke();
          }
        }
        ctx.restore();
        ctx.strokeStyle = "rgba(170,255,255,0.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, TAU); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(-42, -56, 26, 10, -0.7, 0, TAU); ctx.fill();
        ctx.restore();
      },
      steps: [
        {
          id: "ripple", name: { en: "Impact Ripple", ko: "충격 물결" }, param: "rings 2 · hex glow",
          cap: { en: "Hits *ripple* across the hex cells. It *wobbles*.", ko: "맞은 자리부터 칸이 *번쩍*, 막이 *출렁*." },
          strike(w, s, x, y) {
            s.hit = 1; s.wob = 1;
            w.spawn({ x: x - 30, y: y + 4, life: 0.16, draw: (ctx, p, k) => pxCrescent(ctx, p.x, p.y, 62, -2.1, 0.85, 12, k, "190,245,255") });
            w.spawn({ x, y, life: 0.1, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 30, k, "200,255,255") });
            w.spawn({ type: "ring", x, y, size: 8, size1: 90, life: 0.35, w: 8, color: "150,255,250" });
            w.spawn({ type: "glow", x, y, size: 50, size1: 10, life: 0.4, color: "120,255,240" });
          },
        },
        {
          id: "crack", name: { en: "Crack Spread", ko: "금 번지기" }, param: "8 cracks · 0.45s",
          cap: { en: "*Cracks* race across. Hold the break a beat.", ko: "*쩌적* 금이 번지고, 한 박자 *버텨요*." },
          strike(w, s, x, y) {
            w.tween(s, { crack: 1 }, 0.45, "in");
            sparks(w, x, y, 10, "220,255,255", [150, 350], -1, 1);
          },
        },
        {
          id: "shatter", name: { en: "Glass Shatter", ko: "유리 산산조각" }, param: "shards 40 · bounce",
          cap: { en: "Burst into *glass shards* that *clink* on the floor.", ko: "*유리 조각*으로 터져서 바닥에 *챙챙*." },
          break(w, s) {
            for (let i = 0; i < 40; i++) {
              const a = rand(0, TAU), r = rand(0.4, 1) * s.r, sp = rand(160, 520);
              w.spawn({ type: "chunk", x: s.cx + Math.cos(a) * r, y: s.cy + Math.sin(a) * r, vx: Math.cos(a) * sp + 120, vy: Math.sin(a) * sp - 160, g: 1300, vr: rand(-16, 16),
                ground: true, gy: G + 14, bounce: 0.4, size: rand(5, 12), life: rand(1.4, 2.1), hold: true, color: pick(["200,255,255", "120,230,240", "255,255,255"]) });
            }
          },
        },
        {
          id: "freeze", name: { en: "Break Freeze", ko: "깨짐 멈춤" }, param: "stop 140ms · flash",
          cap: { en: "*Freeze* the frame. *Flash* icy white.", ko: "깨지는 순간 *멈칫*, 화면이 *하얗게*." },
          break(w) {
            w.hitstop(0.14); w.zoomPunch(0.09);
            w.shake(0.55, 1); w.flash("200,255,255", 0.25);
          },
        },
        {
          id: "stagger", name: { en: "Stagger", ko: "비틀거림" }, param: "knock 50 · stun 1.6s",
          cap: { en: "Knock it *back*. Spin *stun stars*. Call *BREAK!*", ko: "*휘청* 밀리고, 머리 위로 *별*, *BREAK!*" },
          break(w, s) {
            w.foe.ox = 50; w.foe.tint = 0.8; w.stun = 1.6;
            w.spawn({ type: "text", x: s.cx, y: 66, text: "BREAK!", size: 34, color: "#8ffcff", life: 1.5 });
            w.spawn({ type: "ring", flat: true, x: s.cx, y: G + 8, size: 30, size1: 260, life: 0.6, w: 10, color: "150,255,250" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clang + crackle + shatter",
          cap: { en: "A ringing *clang*, *cracks* racing, then *glass* bursting.", ko: "*쨍* 막히고, *쩌적* 금 가고, *와장창*." },
          // 칼이 막에 막힘: 베는 소리 + 막이 울리는 "징"
          strike(w) {
            w.sfx.slashHit();
            w.play(() => { sMetal(520, 0.6, 0.1, 0, 0.4); tn({ type: "sine", f: 440, f2: 380, dur: 0.5, vol: 0.12, rv: 0.4 }); });
            if (w.on("crack")) w.play(() => SFX.crackle());
          },
          break(w) {
            if (w.on("shatter")) w.play(() => SFX.glass());
            if (w.on("freeze") || w.on("stagger")) w.sfx.thud(); else if (!w.on("shatter")) w.sfx.tock();
          },
        },
      ],
    },

    /* ───────── 4. 완벽한 패링 ───────── */
    {
      id: "spot-combat-parry", cat: "duel", view: "3d",
      title: { en: "Make perfect parries feel *godlike*", ko: "완벽한 패링을 *짜릿하게*" },
      intro: { en: "Perfect timing. It feels like a *bump*.", ko: "타이밍은 완벽한데 그냥 *툭* 막혀요." },
      interval: 2.8, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 196, h: 134 });
        w.foe = w.actor("foe", { home: 344, h: 142 });
        w.freeze = 0;
        w.bl = { fa: -2.6, ha: -1.25 };
      },
      fire(w) {
        const h = w.hero, f = w.foe, b = w.bl, later = seq(w);
        w.respawn(f); f.sx = f.sy = 1; f.k = 10; w.freeze = 0;
        Object.assign(b, { fa: -2.6, ha: -1.25 });
        // 고블린이 칼을 치켜들고 → 내려침, 영웅은 칼을 세워 막음
        w.tween(f, { ox: 26 }, 0.4, "out");
        w.tween(b, { fa: -0.9 }, 0.4, "out");
        w.tween(b, { ha: -0.95 }, 0.3, "out");
        w.spawn({ type: "glow", x: f.x - 20, y: f.gy - 100, size: 26, size1: 6, life: 0.4, color: "255,80,80" });
        later(0.44, () => {
          w.tween(b, { fa: -2.75 }, 0.13, "in");
          w.tween(f, { ox: -62 }, 0.13, "in", () => {
            const x = h.x + 44, y = G - 92;
            f.ox = -40; h.ox = -8; b.fa = -2.2; b.ha = -1.2;
            w.tween(b, { fa: -2.6, ha: -0.95 }, 0.35, "out");
            if (!w.on("perfect")) w.spawn({ type: "text", x, y: y - 44, text: "parry", size: 16, color: "#cbd5e1", life: 0.9 });
            w.emit("parry", h, f, x, y);
          });
        });
      },
      drawFront(w, ctx) {
        const h = w.hero, f = w.foe, b = w.bl;
        const blade = (x, y, a, len, col) => {
          ctx.lineCap = "round"; ctx.strokeStyle = "#2a2f3a"; ctx.lineWidth = 9;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
          ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.stroke();
          ctx.strokeStyle = "#6b4426"; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 12, y - Math.sin(a) * 12); ctx.lineTo(x, y); ctx.stroke();
        };
        if (f.alive !== false) blade(f.x + f.ox - 24, G - 92, b.fa, 70, "#c9ced8");
        blade(h.x + h.ox + 16, G - 58, b.ha, 76, "#eef2fa");
      },
      update(w, dt) { if (w.freeze > 0) w.freeze = Math.max(0, w.freeze - dt * 1.6); },
      drawFloor(w, ctx) {
        stage(ctx, 270, 170, "#1f3352", "#05080f");
        plinth(ctx, 270, G + 8, 230, 38, "#0a1222", "rgba(140,180,255,0.45)");
      },
      drawHud(w, ctx) {
        if (w.freeze <= 0) return;
        ctx.save();
        ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = `rgba(128,128,128,${w.freeze})`; ctx.fillRect(-80, -80, 700, 520);
        ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = `rgba(60,110,200,${0.25 * w.freeze})`; ctx.fillRect(-80, -80, 700, 520);
        ctx.restore();
      },
      steps: [
        {
          id: "clash", name: { en: "Clash Sparks", ko: "충돌 불꽃" }, param: "30 sparks · arc",
          cap: { en: "Blades *clash*. A fan of *sparks* bursts out.", ko: "칼날이 *챙!* 부딪히고 *불꽃*이 쫙." },
          parry(w, h, f, x, y) {
            sparks(w, x, y, 30, "255,220,140", [300, 900], -2.4, 0.6);
            w.spawn({ type: "arc", x: x - 30, y, size: 46, a0: -1.3, a1: 1.1, life: 0.22, color: "220,235,255" });
            w.spawn({ type: "glow", x, y, size: 44, size1: 8, life: 0.3, color: "255,230,170" });
          },
        },
        {
          id: "freeze", name: { en: "Time Freeze", ko: "시간 정지" }, param: "stop 300ms · desat",
          cap: { en: "*Stop time*. Drain the color for a beat.", ko: "시간이 *멈추고*, 색이 *쭉* 빠져요." },
          parry(w) {
            w.hitstop(0.3); w.freeze = 1;
            w.zoomPunch(0.08);
          },
        },
        {
          id: "recoil", name: { en: "Shock Recoil", ko: "튕겨 내기" }, param: "rings 2 · knock 70",
          cap: { en: "Blow the attacker *back*. A *ring* bursts out.", ko: "공격한 쪽이 *팅* 밀리고, *고리*가 퍼져요." },
          parry(w, h, f, x, y) {
            f.ox = 70; f.k = 5; f.vib = 6;
            w.spawn({ type: "ring", x, y, size: 10, size1: 130, life: 0.4, w: 9, color: "190,215,255" });
            w.spawn({ type: "ring", flat: true, x, y: G + 6, size: 20, size1: 220, life: 0.5, w: 10, color: "190,215,255" });
            dust(w, f.x, G, 8, 1, "140,160,200");
          },
        },
        {
          id: "counter", name: { en: "Counter Flash", ko: "반격 섬광" }, param: "dash 130 · 4 ghosts",
          cap: { en: "Then *counter*: dash through, cut it *white*.", ko: "바로 *반격*! 스쳐 지나가며 *번쩍* 베요." },
          parry(w, h, f) {
            w.after(0.1, () => {
              for (let i = 0; i < 4; i++) w.spawn({ type: "ghost", img: SPR.hero.cyan, x: h.x + i * 32, y: G, w: h.w, h: h.h, alpha0: 0.55 - i * 0.1, life: 0.4 });
              h.ox = 130; f.flash = 1; f.tint = 1; f.ox = 100;
              w.spawn({ type: "slash", x: f.x + 30, y: G - 80, ang: -0.25, len: 140, size: 14, life: 0.3, color: "255,255,255" });
              w.flash("230,240,255", 0.25); w.shake(0.5, 1);
            });
          },
        },
        {
          id: "perfect", name: { en: "Perfect Stamp", ko: "퍼펙트 도장" }, param: "rays 14 · stars 12",
          cap: { en: "Crown it: *PERFECT!* in gold, with *rays*.", ko: "금빛 *PERFECT!*, 뒤로 *빛줄기*." },
          parry(w, h, f, x, y) {
            w.spawn({ type: "text", x: 270, y: 62, text: "PERFECT!", size: 34, color: "#ffd84a", life: 1.8 });
            w.spawn({ type: "rays", under: true, x, y, n: 14, size: 40, size1: 240, vr: 1.2, life: 1.6, hold: true, color: "255,210,110" });
            starBurst(w, x, y, 12, ["255,220,90", "255,255,255", "170,200,255"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "clang + whoosh",
          cap: { en: "A bright *clang*, then a *whoosh* and a slash.", ko: "맑은 *챙~*, 이어서 *휙* 베는 소리." },
          parry(w) {
            w.play(() => { tn({ type: "triangle", f: 2300, f2: 2100, dur: 0.7, vol: 0.16 }); tn({ type: "triangle", f: 3450, dur: 0.4, vol: 0.06 }); });
            w.sfx.ping();
            w.after(0.1, () => { w.sfx.dash(); w.sfx.slashHit(); });
          },
        },
      ],
    },

    /* ───────── 5. 궁극기 충전과 발사 ───────── */
    {
      id: "spot-combat-ultimate", cat: "combat", view: "3d", polished: true,
      title: { en: "Make ultimates feel *ultimate*", ko: "궁극기를 *궁극기답게*" },
      intro: { en: "The ultimate. A *laser pointer*.", ko: "궁극기인데 *레이저 포인터* 같아요." },
      interval: 3.4, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 118, h: 132 });
        w.foe = w.actor("foe", { home: 400, h: 140 });
        w.beam = null; w.aura = 0; w.dim = 0; w.charging = false;
      },
      fire(w) {
        const h = w.hero, f = w.foe, later = seq(w);
        w.respawn(f); f.sx = f.sy = 1;
        w.beam = null; w.aura = 0; w.dim = 0; w.charging = true;
        w.emit("charge", h);
        later(w.on("aura") ? 0.9 : 0.3, () => {
          const p = paw(w);
          const bm = (w.beam = { x0: p.x + 4, x1: f.x - 30, y: p.y, t: 0, life: 1.25, big: false, grow: 1 });
          w.charging = false; f.ox = 30; f.flash = 0.6; f.hp = 30;
          w.emit("release", h, f, bm);
          later(bm.life, () => w.tween(w, { aura: 0, dim: 0 }, 0.4, "out"));
        });
      },
      update(w, dt) {
        if (w.beam) w.beam.t += dt;
        if (w.charging && w.aura > 0) w.hero.vib = w.aura * 4;
      },
      drawFloor(w, ctx) {
        stage(ctx, 270, 160, "#36145e", "#07040f");
        plinth(ctx, 270, G + 8, 240, 38, "#120822", "rgba(200,150,255,0.4)");
      },
      drawBack(w, ctx) {
        if (w.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${w.dim})`; ctx.fillRect(-80, -80, 700, 520); }
        if (w.aura > 0) {
          const h = w.hero, x = h.x + h.ox, a = w.aura;
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          ctx.globalCompositeOperation = "source-over";
          pxGlow(ctx, x, G - 66, 70 * a, "255,170,60", 0.55 * a);
          // 불꽃 마름모가 발밑에서 솟아오름
          for (let i = 0; i < 9; i++) {
            const ph = w.time * 7 + i * 1.7, fx = Math.round(x + Math.sin(ph) * 34), fh = (90 + 50 * Math.sin(ph * 1.3)) * a, fy = Math.round(G - 30 - fh * 0.7), r = Math.round(12 * a);
            ctx.fillStyle = i % 2 ? "#ffd27a" : "#b88aff"; ctx.beginPath(); ctx.moveTo(fx, fy - r * 1.8); ctx.lineTo(fx + r, fy); ctx.lineTo(fx, fy + r); ctx.lineTo(fx - r, fy); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#fff4cc"; ctx.fillRect(fx - 2, fy - 2, 4, 4);
          }
          ctx.strokeStyle = `rgba(255,220,140,${0.8 * a})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(x, G + 2, 60 * a, 12 * a, 0, 0, TAU); ctx.stroke();
          ctx.restore();
        }
      },
      drawFront(w, ctx) {
        const b = w.beam; if (!b || b.t > b.life) return;
        const k = b.t / b.life, fade = 1 - Math.pow(k, 4), len = b.x1 - b.x0;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        if (!b.big) { ctx.strokeStyle = `rgba(255,230,120,${fade})`; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(b.x0, b.y); ctx.lineTo(b.x1, b.y); ctx.stroke(); }
        else {
          // 픽셀 광선: 단색 띠 4겹 + 가장자리 톱니 + 양 끝 빛덩이
          const W = (30 + Math.sin(w.time * 70) * 5) * fade * b.grow;
          ctx.globalCompositeOperation = "source-over";
          [[W * 1.5, "#3a1670"], [W * 1.15, "#9a4cff"], [W * 0.78, "#ffb640"], [W * 0.42, "#fff4cc"]].forEach(([wd, c], i) => {
            ctx.fillStyle = c; ctx.fillRect(b.x0, b.y - wd, len, wd * 2);
            if (i < 2) for (let x = b.x0; x < b.x1; x += 12) { const j = ((x * 7 + Math.floor(w.time * 30) * 13) % 9) - 4; ctx.fillRect(x, b.y - wd - 4 + j * 0.5, 6, 4); ctx.fillRect(x + 6, b.y + wd - j * 0.5, 6, 4); }
          });
          pxGlow(ctx, b.x0, b.y, W * 1.6, "255,220,140", 1);
          pxGlow(ctx, b.x1, b.y, W * 2.1, "255,200,120", 1);
        }
        ctx.restore();
      },
      steps: [
        {
          id: "aura", name: { en: "Power Aura", ko: "힘의 오라" }, param: "0.9s · 30 orbs in",
          cap: { en: "Charge up: *flames* rise, energy *sucks in*.", ko: "*화르륵* 기운이 솟고, 빛이 *빨려 들어요*." },
          charge(w, h) {
            w.tween(w, { aura: 1 }, 0.85, "in");
            for (let i = 0; i < 30; i++) w.after(i * 0.026, () => {
              const a = rand(0, TAU), d = rand(120, 190);
              w.spawn({ type: "spark", seek: true, x: h.x + Math.cos(a) * d, y: G - 70 + Math.sin(a) * d, tx: h.x, ty: G - 70, life: 0.35, size: 3, color: pick(["255,210,110", "200,150,255"]) });
            });
          },
        },
        {
          id: "dim", name: { en: "Screen Dim", ko: "화면 어둡게" }, param: "black 75% · 0.5s",
          cap: { en: "*Darken* the world. Only the fighters *glow*.", ko: "세상이 *어두워지고*, 둘만 *빛나요*." },
          charge(w) { w.tween(w, { dim: 0.75 }, 0.5, "out"); },
        },
        {
          id: "mega", name: { en: "Mega Beam", ko: "거대 광선" }, param: "3 layers · ±5px pulse",
          cap: { en: "A *fat* beam: white core, gold, violet *halo*.", ko: "하얀 심, 금빛, 보랏빛 *테두리*의 *굵은* 광선." },
          release(w, h, f, bm) {
            bm.big = true; bm.grow = 0;
            w.tween(bm, { grow: 1 }, 0.1, "out");
          },
        },
        {
          id: "blast", name: { en: "Impact Blast", ko: "착탄 폭발" }, param: "sparks/frame · ring",
          cap: { en: "Where it lands, *sparks* gush and the floor *rings*.", ko: "맞는 곳에서 *불꽃*이 뿜고, 바닥에 *고리*." },
          release(w, h, f, bm) {
            w.spawn({ type: "ring", flat: true, x: bm.x1, y: G + 6, size: 20, size1: 240, life: 0.7, w: 12, color: "255,200,120" });
            w.spawn({ x: bm.x1, y: bm.y, life: 0.18, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 54, k, "255,236,180") });
            // 광선이 끝나갈 때: 적이 뒤로 날아가 쓰러짐
            w.after(bm.life * 0.8, () => {
              if (!f.alive) return;
              w.hitstop(0.1); w.fly(f, 30, -520, 0, true); f.hp = 0; w.kill(f); w.shake(0.5, 1);
              w.spawn({ x: f.x - 10, y: f.gy - 70, life: 0.2, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 70, k, "255,240,200") });
              for (let i = 0; i < 16; i++) { const sz = rand(2.5, 5.5), rot = rand(0, 6), a = rand(-2.6, 0.4), v = rand(260, 640);
                w.spawn({ x: f.x - 10, y: f.gy - 70, vx: Math.cos(a) * v * 0.8 + 160, vy: Math.sin(a) * v, g: 1200, ground: true, bounce: 0.3, life: rand(0.8, 1.2), vr: rand(-14, 14), draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#f06a45", "#5b1d17") }); }
              w.sfx.slam();
            });
          },
          land(w, f) {
            w.shake(0.25, 0);
            for (let i = 0; i < 10; i++) { const dir = i % 2 ? 1 : -1; w.spawn({ type: "smoke", x: f.x + rand(-30, 30), y: G - 4, vx: dir * rand(60, 160), vy: rand(-40, -10), drag: 3, life: rand(0.4, 0.7), size: rand(8, 14), size1: rand(14, 22), color: "90,70,110" }); }
            w.sfx.land();
          },
          update(w) {
            const b = w.beam; if (!b || b.t > b.life) return;
            sparks(w, b.x1, b.y, 3, "255,220,130", [250, 650], -1.3, 1.3);
            w.foe.vib = 5; w.foe.tint = 0.7;
          },
        },
        {
          id: "kick", name: { en: "Camera Kick", ko: "카메라 반동" }, param: "flash .6 · rumble .4",
          cap: { en: "*Flash* on release. *Rumble* while it fires.", ko: "쏘는 순간 *번쩍*, 쏘는 내내 *덜덜*." },
          release(w, h) {
            w.flash("255,230,170", 0.25); w.zoomPunch(0.12);
            h.ox = -26; w.kick(-14, 0);
          },
          update(w) {
            const b = w.beam;
            if (b && b.t < b.life) w.trauma = Math.max(w.trauma, 0.4);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rise + boom + roar",
          cap: { en: "A rising *whine*, a *boom*, a roaring *blast*.", ko: "*위이잉* 차오르고, *쾅*, *우와앙*." },
          // 모으기: 오라가 있으면 길게 차오르는 웅~, 없으면 짧은 쉭
          charge(w) {
            if (w.on("aura")) w.play(() => { tn({ type: "sawtooth", f: 70, f2: 560, dur: 0.9, vol: 0.12, lp: 400, lp2: 3200, att: 0.6 }); tn({ type: "sine", f: 140, f2: 1120, dur: 0.9, vol: 0.1, att: 0.6 }); nz({ dur: 0.9, type: "bandpass", f: 500, f2: 6000, q: 2.5, vol: 0.14, att: 0.6 }); });
            else w.sfx.swish();
          },
          release(w) {
            if (w.on("mega")) w.play(() => { sSnap(0.9, 0, 2200); sBody(90, 0.5, 1); SFX.beam(1.2); });
            else w.play(() => tn({ type: "sawtooth", f: 1760, dur: 0.6, vol: 0.035, lp: 3500, att: 0.01 })); // 가는 레이저: 찌이~
            if (w.on("blast")) w.play(() => { nz({ dur: 1, f: 1400, f2: 120, vol: 0.5, rv: 0.4 }); for (let i = 0; i < 10; i++) sSnap(0.12, 0.05 + i * 0.1, 2500 + Math.random() * 2000); });
          },
        },
      ],
    },

    /* ───────── 6. 콤보 마무리 ───────── */
    {
      id: "spot-combat-combo", cat: "fighting", view: "3d",
      title: { en: "Make combo finishers feel *explosive*", ko: "콤보 마무리를 *화끈하게*" },
      intro: { en: "Six hits. The finisher? A *tap*.", ko: "여섯 대 때렸는데 마무리가 *톡*." },
      interval: 2.8, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 206, h: 134 });
        w.foe = w.actor("foe", { home: 330, h: 140 });
        w.cnt = { n: 0, s: 1, sh: 0, gold: 0, t: 9 };
      },
      fire(w) {
        const h = w.hero, f = w.foe, c = w.cnt, later = seq(w);
        w.respawn(f); f.sx = f.sy = 1;
        Object.assign(c, { n: 0, s: 1, sh: 0, gold: 0, t: 0 });
        for (let i = 0; i < 5; i++) later(0.1 + i * 0.16, () => {
          c.n++; c.t = 0; h.ox = i % 2 ? 30 : 40; f.ox = 12;
          w.emit("hit", f, c.n, c);
        });
        later(1.0, () => {
          c.n++; c.t = 0; h.ox = 56; f.ox = 30;
          w.emit("finish", f, c);
          later(1.4, () => { if (f.flying) w.respawn(f); });
        });
      },
      update(w, dt) { const c = w.cnt; c.t += dt; c.s += (1 - c.s) * Math.min(1, dt * 12); c.sh = Math.max(0, c.sh - dt * 30); },
      drawFloor(w, ctx) {
        stage(ctx, 270, 180, "#5a3608", "#100902");
        plinth(ctx, 270, G + 8, 230, 38, "#1e1204", "rgba(255,200,90,0.45)");
      },
      drawHud(w, ctx) {
        const c = w.cnt; if (!c.n || c.t > 1.8) return;
        const a = Math.min(1, (1.8 - c.t) * 3);
        ctx.save(); ctx.globalAlpha = a;
        if (!w.on("counter")) label(ctx, `${c.n} HITS`, 432, 100, 18, "#ffffff");
        else {
          const heat = Math.min(1, c.n / 6), x = 432 + rand(-c.sh, c.sh), y = 100 + rand(-c.sh, c.sh);
          const top = c.gold ? "#fffbe0" : "#ffffff", mid = c.gold ? "#ffd23a" : mixc([255, 230, 90], [255, 70, 40], 1 - heat);
          bigText(ctx, String(c.n), x, y, 62, [top, mid, c.gold ? "#d07a00" : "#b31a10"], "#1a0800", -0.12, c.s);
          bigText(ctx, "HITS", x + 4, y + 42, 18, ["#ffffff", "#ffcf6a"], "#1a0800", -0.12, 1);
        }
        ctx.restore();
      },
      steps: [
        {
          id: "spark", name: { en: "Hit Sparks", ko: "타격 불꽃" }, param: "flash · 8 sparks/hit",
          cap: { en: "Every hit *flashes* and throws *sparks*.", ko: "때릴 때마다 *번쩍*, *불꽃*이 튀어요." },
          hit(w, f) {
            f.flash = 1; f.vib = 4;
            sparks(w, f.x - 40, G - 80 + rand(-20, 20), 8, "255,220,140", [200, 500], -1.2, 1.2);
          },
          finish(w, f) { f.flash = 1; },
        },
        {
          id: "counter", name: { en: "Combo Counter", ko: "콤보 숫자" }, param: "pop ×1.6 · heats up",
          cap: { en: "A big *counter* pops and gets *hotter* each hit.", ko: "큰 *숫자*가 톡톡, 칠수록 *뜨거워져요*." },
          hit(w, f, n, c) { c.s = 1.6 + n * 0.08; c.sh = 5; },
          finish(w, f, c) { c.s = 1.9; c.sh = 10; },
        },
        {
          id: "launch", name: { en: "Launcher", ko: "띄우기" }, param: "stop 150ms · fly",
          cap: { en: "The last hit *freezes*, then *launches* it.", ko: "마지막 한 방은 *멈칫* 후 *하늘로* 뻥." },
          finish(w, f) {
            w.hitstop(0.15);
            w.fly(f, 170, -600, 7);
            w.spawn({ type: "arc", x: f.x - 30, y: G - 70, size: 70, a0: 0.6, a1: -1.6, life: 0.3, color: "255,230,160" });
          },
        },
        {
          id: "escalate", name: { en: "Escalation", ko: "점점 세게" }, param: "shake n×.07 · zoom",
          cap: { en: "Each hit *shakes harder*. The last one *booms*.", ko: "칠수록 *더 크게* 흔들고, 마지막은 *쾅*." },
          hit(w, f, n) { w.shake(0.07 * n); w.zoomPunch(0.012 * n); },
          finish(w) { w.shake(0.7, 1); w.zoomPunch(0.14); w.flash("255,210,140", 0.25); },
        },
        {
          id: "finale", name: { en: "Finish Stamp", ko: "피니시 도장" }, param: "rays 16 · gold",
          cap: { en: "Stamp *FINISH!* The counter turns *gold*.", ko: "*FINISH!* 도장, 숫자는 *금빛*으로." },
          finish(w, f, c) {
            c.gold = 1;
            w.spawn({ type: "text", x: 250, y: 62, text: "FINISH!", size: 36, color: "#ffd84a", life: 1.7 });
            w.spawn({ type: "rays", under: true, x: f.x, y: G - 80, n: 16, size: 40, size1: 260, vr: 1, life: 1.4, hold: true, color: "255,180,80" });
            starBurst(w, f.x, G - 80, 14, ["255,220,90", "255,255,255", "255,140,60"]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch +2 per hit",
          cap: { en: "Each hit rings *higher*. The finisher *booms*.", ko: "칠수록 소리가 *올라가고*, 마무리는 *쾅*." },
          hit(w, f, n) { w.sfx.hit(1 + n * 0.08); w.sfx.blip(n * 2); },
          finish(w) { w.sfx.crit(); w.sfx.boom(); },
        },
      ],
    },

    /* ───────── 7. 약점 / 헤드샷 ───────── */
    {
      id: "spot-combat-weakpoint", cat: "combat", view: "3d", polished: true,
      title: { en: "Make weak-point hits feel *precise*", ko: "약점 명중을 *정확하게*" },
      intro: { en: "Weak point hit. Felt like the *knee*.", ko: "약점을 맞혔는데 *무릎* 맞은 느낌이에요." },
      interval: 2.6, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 118 });
        w.foe = w.actor("foe", { home: 384, h: 196 });
        w.gun = { kick: 0, rot: 0 };
        w.mk = { s: 1, lock: 0, on: false };
        w.wp = { x: 384 - 22, y: G - 196 * 0.73 };
        const m = muzzle(w); w.aim = Math.atan2(w.wp.y - m.y, w.wp.x - m.x);
      },
      fire(w) {
        const f = w.foe, m = w.mk, later = seq(w);
        w.respawn(f); f.sx = f.sy = 1; f.rot = 0;
        Object.assign(m, { s: 1, lock: 0, on: true });
        w.emit("aim", m);
        later(w.on("marker") ? 0.55 : 0.4, () => {
          const p = muzzle(w), tx = w.wp.x, ty = w.wp.y, sp = 1100, d = Math.hypot(tx - p.x, ty - p.y);
          w.gun.kick = 12; w.gun.rec = 0.12; w.sfx.gun(); w.spawn({ x: p.x + 2, y: p.y, life: 0.08, draw: (ctx, q, k) => pxMuzzle(ctx, q.x, q.y, 22, k, Math.atan2(ty - p.y, tx - p.x)) });
          w.shoot({ x: p.x, y: p.y, vx: (tx - p.x) / d * sp, vy: (ty - p.y) / d * sp, len: 46, lw: 4, hitX: tx, onHit: () => {
            f.ox = 18; f.hp -= 30; m.on = false;
            if (!w.on("bonus")) w.spawn({ type: "text", x: tx, y: ty - 34, text: "×2", size: 20, color: "#ffffff", life: 1.4 });
            w.emit("hit", f, tx, ty);
          } });
        });
      },
      update(w, dt) {
        const g = w.gun; g.kick -= g.kick * Math.min(1, dt * 16); g.rec = (g.rec || 0) * Math.max(0, 1 - dt * 12);
        g.rot = w.aim - g.rec;
      },
      drawFloor(w, ctx) {
        stage(ctx, 300, 160, "#33431a", "#070a03");
        plinth(ctx, 290, G + 8, 240, 38, "#10160a", "rgba(200,240,120,0.4)");
      },
      drawFront(w, ctx) {
        drawGun(w, ctx);
        const f = w.foe;
        const wx = w.wp.x + f.ox, wy = w.wp.y;
        glow(ctx, wx, wy, 16, "255,80,60", 0.5);
        ctx.fillStyle = "#ff5a3a"; ctx.strokeStyle = "#3a0a04"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(wx, wy - 9); ctx.lineTo(wx + 7, wy); ctx.lineTo(wx, wy + 9); ctx.lineTo(wx - 7, wy); ctx.closePath(); ctx.fill(); ctx.stroke();
        const m = w.mk; if (!w.on("marker") || !m.on) return;
        const { x, y } = w.wp, r = 22 * m.s, col = m.lock ? "255,225,70" : "255,70,70";
        ctx.save(); ctx.translate(x, y); ctx.rotate(w.time * (m.lock ? 1 : 4));
        ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.arc(0, 0, r, -0.5, 0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r + 4, 0); ctx.lineTo(r + 12, 0); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = `rgba(${col},1)`; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
      },
      steps: [
        {
          id: "marker", name: { en: "Lock-On Marker", ko: "조준 표시" }, param: "×2.4 → ×1 · 0.4s",
          cap: { en: "Mark the *weak spot*. Shrink in, *lock* yellow.", ko: "*약점*에 표시가 조여들고 *노랗게* 고정." },
          aim(w, m) {
            m.s = 2.4;
            w.tween(m, { s: 1 }, 0.4, "out", () => { m.lock = 1; });
          },
        },
        {
          id: "ping", name: { en: "Precision Ping", ko: "정밀 타격음" }, param: "stop 60ms · 4 rays",
          cap: { en: "A tiny *freeze*, a sharp *ring*, a *cross* of light.", ko: "살짝 *멈칫*, 날카로운 *고리*, *십자* 빛." },
          hit(w, f, x, y) {
            w.hitstop(0.06);
            w.spawn({ type: "ring", x, y, size: 4, size1: 46, life: 0.25, w: 3, color: "255,255,255" });
            w.spawn({ x, y, life: 0.1, draw: (ctx, q, k) => pxImpact(ctx, q.x, q.y, 26, k, "255,250,210") });
            for (let i = 0; i < 4; i++) w.spawn({ type: "spark", x, y, vx: Math.cos(i * TAU / 4) * 900, vy: Math.sin(i * TAU / 4) * 900, drag: 12, size: 3, life: 0.2, color: "255,250,200" });
          },
        },
        {
          id: "snap", name: { en: "Head Snap", ko: "고개 젖힘" }, param: "tilt .2 · 10 chips",
          cap: { en: "The head *snaps* back. *Chips* fly off.", ko: "고개가 *휙* 젖혀지고 *파편*이 튀어요." },
          hit(w, f, x, y) {
            f.flash = 0.6; f.ox = 26; f.rot = 0.2;
            w.tween(f, { rot: 0 }, 0.5, "out");
            for (let i = 0; i < 12; i++) { const sz = rand(2.5, 5), rot = rand(0, 6), c = pick([["#f06a45", "#5b1d17"], ["#e2553a", "#3a120e"]]); w.spawn({ x, y, vx: rand(80, 420), vy: rand(-420, -80), g: 1300, vr: rand(-12, 12), ground: true, bounce: 0.4, life: 1.2, hold: true, draw: (ctx, q) => pxChip(ctx, q.x, q.y, sz, rot + q.rot, c[0], c[1]) }); }
          },
        },
        {
          id: "bonus", name: { en: "Bonus Text", ko: "보너스 글자" }, param: "×3 · +360",
          cap: { en: "Shout *WEAK POINT!* Show the *×3* bonus.", ko: "*WEAK POINT!* 외치고 *×3* 보너스." },
          hit(w, f, x, y) {
            w.spawn({ type: "text", x: 262, y: 54, text: "WEAK POINT!", size: 30, color: "#ffe14a", life: 1.6 });
            w.spawn({ type: "text", x: x - 80, y: y + 6, text: "×3", size: 42, color: "#ff5a3c", life: 1.4 });
            w.spawn({ type: "text", x: x + 56, y: y - 46, text: "+360", size: 22, color: "#ffffff", life: 1.4 });
          },
        },
        {
          id: "focus", name: { en: "Focus Slowmo", ko: "집중 슬로" }, param: "×0.25 · 0.6s · zoom",
          cap: { en: "*Slow* time and lean the camera *in*.", ko: "시간이 *느려지고*, 카메라가 *쑥* 다가가요." },
          hit(w, f, x, y) {
            w.slowmo(0.25, 0.6); w.zoomPunch(0.14);
            w.cam.tx = (x - 270) * 0.3; w.cam.ty = (y - 180) * 0.3;
            w.after(0.35, () => { w.cam.tx = 0; w.cam.ty = 0; });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "beep + heavy crit",
          cap: { en: "Lock-on *beeps*, then a heavy *crunch*.", ko: "조준은 *삑삑*, 명중은 묵직한 *콰앙*." },
          // 조준 표시가 있을 때만 삑삑, 명중음은 효과 크기에 맞춰
          aim(w) { if (w.on("marker")) [0, 0.13, 0.26].forEach((d, i) => w.play(() => tn({ type: "square", f: 1200 + i * 200, dur: 0.05, vol: 0.06, delay: d, lp: 4000 }))); },
          // 약점 치명타: 무겁게 "콰앙" (효과가 있을 때만, 없으면 평범한 맞는 소리)
          hit(w) { if (w.on("ping") || w.on("snap")) w.sfx.critBig(); else w.sfx.hit(); },
        },
      ],
    },

    /* ───────── 8. 소환진에서 적 등장 ───────── */
    {
      id: "spot-combat-portal", cat: "combat", view: "3d", polished: true,
      title: { en: "Make enemy spawns feel *ominous*", ko: "적 등장을 *불길하게*" },
      intro: { en: "An enemy spawns. It just *blinks* in.", ko: "적이 나오는데 그냥 *뿅* 하고 생겨요." },
      interval: 3.4, stepDur: 4.2,
      setup(w) {
        w.foe = w.actor("foe", { home: 270, h: 150 });
        w.foe.alpha = 0; w.circ = 0; w.riseT = 0;
      },
      fire(w) {
        const f = w.foe, later = seq(w);
        w.respawn(f); Object.assign(f, { alpha: 0, sx: 1, sy: 1, oy: 0, clipY: null, forcePose: null });
        w.circ = 0; w.riseT = 0;
        w.emit("summon", f);
        later(w.on("circle") ? 0.75 : 0.25, () => {
          f.alpha = 1;
          w.emit("emerge", f);
          if (w.on("rise")) {
            // 바닥선 아래는 잘라서, 소환진 속에서 천천히 솟아오르게
            f.oy = f.h + 6; f.clipY = G + 4; w.riseT = 1;
            w.tween(f, { oy: 0 }, 1.0, "out", () => { f.clipY = null; w.riseT = 0; w.emit("arrive", f); });
          } else w.emit("arrive", f);
        });
        later(2.9, () => { w.tween(f, { alpha: 0 }, 0.3); w.tween(w, { circ: 0 }, 0.3); });
      },
      update(w, dt) {
        const f = w.foe;
        if (w.riseT > 0) { f.vib = 1.6; f.vibAxis = "x"; }
      },
      drawFloor(w, ctx) {
        stage(ctx, 270, 150, "#3a0a36", "#0a0209");
        plinth(ctx, 270, G + 8, 230, 38, "#160414", "rgba(255,120,230,0.3)");
        const c = w.circ;
        ctx.strokeStyle = "rgba(255,140,230,0.35)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(270, G + 6, 90, 18, 0, 0, TAU); ctx.stroke();
        if (c <= 0) return;
        // 소환진: 굵은 바깥 고리 + 안쪽 고리 + 도는 별 + 바깥 룬 점
        ctx.save(); ctx.translate(270, G + 6); ctx.scale(1, 0.21);
        ctx.strokeStyle = "#5a0a50"; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, 118 * c, 0, TAU * c); ctx.stroke();
        ctx.strokeStyle = "#ff5ad6"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 118 * c, 0, TAU * c); ctx.stroke();
        ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 86 * c, 0, TAU); ctx.stroke();
        ctx.rotate(w.time * 1.2);
        ctx.strokeStyle = "#ffb8f2"; ctx.lineWidth = 5;
        for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = k * Math.PI / 3 + i * TAU / 3; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * 86 * c, Math.sin(a) * 86 * c); } ctx.stroke(); }
        for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.fillStyle = i % 2 ? "#ffb8f2" : "#ff5ad6"; ctx.fillRect(Math.cos(a) * 102 * c - 6, Math.sin(a) * 102 * c - 6, 12, 12); }
        ctx.restore();
        pxGlow(ctx, 270, G, 60 * c, "255,60,200", 0.3 * c);
      },
      drawBack(w, ctx) {
        // 솟아오르는 동안 소환진 안쪽이 검붉게 뚫린 구멍처럼 보임
        if (w.riseT > 0) {
          ctx.fillStyle = "#8a2aa0"; ctx.beginPath(); ctx.ellipse(270, G + 4, 74, 14, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "#08000a"; ctx.beginPath(); ctx.ellipse(270, G + 5, 66, 11, 0, 0, TAU); ctx.fill();
        }
      },
      steps: [
        {
          id: "circle", name: { en: "Summon Circle", ko: "소환진" }, param: "0.7s draw-in · spin",
          cap: { en: "Draw a glowing *summoning circle* first.", ko: "먼저 바닥에 *소환진*이 그려져요." },
          summon(w) { w.tween(w, { circ: 1 }, 0.65, "out"); },
        },
        {
          id: "rise", name: { en: "Rise From Below", ko: "땅에서 솟아오름" }, param: "1.0s · tremble",
          cap: { en: "It *rises* out of the circle, slow and *shaking*.", ko: "소환진 속에서 *천천히*, *덜덜* 떨며 솟아올라요." },
          emerge(w) {
            for (let i = 0; i < 10; i++) w.after(i * 0.09, () => { w.shake(0.12); for (let k = 0; k < 2; k++) w.spawn({ type: "smoke", x: 270 + rand(-60, 60), y: G - 2, vx: rand(-60, 60), vy: rand(-50, -15), drag: 2, life: rand(0.5, 0.8), size: rand(8, 12), size1: rand(16, 24), color: "70,40,80" }); });
          },
        },
        {
          id: "flames", name: { en: "Dark Flames", ko: "검은 불길" }, param: "1.2s · tongues",
          cap: { en: "Black-violet *flames* lick up around it.", ko: "검보랏빛 *불길*이 몸을 타고 *넘실*." },
          emerge(w) {
            for (let i = 0; i < 36; i++) w.after(i * 0.035, () => {
              const x = 270 + rand(-66, 66), sz = rand(10, 18), col = pick([["#2a0a2e", "#8a2aa0"], ["#4a0a4a", "#ff5ad6"], ["#1a0420", "#b84ad8"]]);
              w.spawn({ x, y: G - 2, vx: rand(-20, 20), vy: rand(-260, -160), drag: 1.5, life: rand(0.45, 0.7), draw: (ctx, p, k) => {
                const s = sz * (1 - k * 0.7), X = Math.round(p.x), Y = Math.round(p.y);
                ctx.fillStyle = col[0]; ctx.beginPath(); ctx.moveTo(X, Y - s * 2.2); ctx.lineTo(X + s, Y); ctx.lineTo(X, Y + s * 0.8); ctx.lineTo(X - s, Y); ctx.closePath(); ctx.fill();
                ctx.fillStyle = col[1]; ctx.beginPath(); ctx.moveTo(X, Y - s * 1.3); ctx.lineTo(X + s * 0.5, Y); ctx.lineTo(X, Y + s * 0.4); ctx.lineTo(X - s * 0.5, Y); ctx.closePath(); ctx.fill();
              } });
            });
          },
        },
        {
          id: "roar", name: { en: "Roar", ko: "포효" }, param: "attack pose · shockwave",
          cap: { en: "Fully out, it *roars*. The air *shakes*.", ko: "다 나오면 *포효*. 공기가 *쩌렁* 울려요." },
          arrive(w, f) {
            f.forcePose = "attack"; f.forceUntil = w.time + 0.55;
            w.shake(0.5); w.zoomPunch(0.08);
            w.spawn({ type: "ring", flat: true, x: 270, y: G + 4, size: 30, size1: 280, life: 0.6, w: 10, color: "255,120,230" });
            // 입에서 뻗는 포효 줄기
            for (let i = 0; i < 12; i++) { const a = Math.PI + rand(-0.7, 0.7); w.spawn({ type: "spark", x: f.x - 30, y: G - f.h * 0.72, vx: Math.cos(a) * rand(500, 900), vy: Math.sin(a) * rand(500, 900), drag: 3, life: rand(0.25, 0.4), size: 3, color: "255,170,240" }); }
            for (let i = 0; i < 14; i++) { const d = i % 2 ? 1 : -1; w.spawn({ type: "smoke", x: 270 + d * rand(20, 60), y: G - 4, vx: d * rand(140, 320), vy: rand(-40, -10), drag: 2.5, life: rand(0.5, 0.8), size: rand(8, 12), size1: rand(18, 26), color: "90,60,100" }); }
          },
        },
        {
          id: "eyes", name: { en: "Eye Glint", ko: "눈빛 번쩍" }, param: "red glint · 0.3s",
          cap: { en: "Last, the eyes *glint* red.", ko: "마지막에 눈이 *빨갛게* 번쩍." },
          arrive(w, f) {
            w.after(0.12, () => w.spawn({ x: f.x - 22, y: G - f.h * 0.8, life: 0.4, draw: (ctx, p, k) => { const s = 18 * (1 - k * 0.6); pxPlus(ctx, p.x, p.y, s, "#ff2a2a"); pxPlus(ctx, p.x, p.y, s * 0.5, "#ffe0e0"); } }));
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hum + rumble + roar",
          cap: { en: "A low *hum*, a ground *rumble*, then a *roar*.", ko: "낮은 *웅~*, 땅이 *우르르*, 그리고 *크아앙*." },
          summon(w) { if (w.on("circle")) w.play(() => { tn({ type: "sawtooth", f: 55, f2: 110, dur: 0.75, vol: 0.1, lp: 300, lp2: 900, att: 0.4 }); tn({ type: "sine", f: 110, f2: 220, dur: 0.75, vol: 0.08, att: 0.4, rv: 0.4 }); }); },
          emerge(w) { if (w.on("rise")) w.play(() => { nz({ dur: 1.0, f: 260, f2: 140, vol: 0.5, att: 0.2, hold: 0.6 }); tn({ type: "sine", f: 45, f2: 38, dur: 1.0, vol: 0.4, att: 0.2, hold: 0.6 }); }); },
          // 포효: 낮은 톱니 두 겹 + 거친 잡음 (포효 연출이 있을 때만)
          arrive(w) {
            if (w.on("roar")) w.play(() => { tn({ type: "sawtooth", f: 82, f2: 58, dur: 0.75, vol: 0.18, lp: 700, att: 0.05, hold: 0.3 }); tn({ type: "sawtooth", f: 123, f2: 86, dur: 0.75, vol: 0.12, lp: 900, det: 15, att: 0.05, hold: 0.3 }); nz({ dur: 0.75, type: "bandpass", f: 500, f2: 300, q: 1.2, vol: 0.4, att: 0.05, hold: 0.3, rv: 0.3 }); });
            else w.sfx.land();
          },
        },
      ],
    },

    /* ───────── 9. 마지막 일격 슬로모션 ───────── */
    {
      id: "spot-combat-final-kill", cat: "duel", view: "3d",
      title: { en: "Make the final kill feel *cinematic*", ko: "마지막 일격을 *영화처럼*" },
      intro: { en: "The final boss falls. Like *any* grunt.", ko: "최종 보스가 *아무* 적처럼 쓰러져요." },
      interval: 3.4, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 170, h: 136 });
        w.foe = w.actor("foe", { home: 360, h: 146 });
        w.focus = 0; w.mono = 0; w.impact = 0; w.cut = null; w.ko = null; w.hit = { x: 330, y: G - 80 };
      },
      fire(w) {
        const h = w.hero, f = w.foe, later = seq(w);
        w.respawn(f); f.sx = f.sy = 1;
        w.focus = 0; w.mono = 0; w.impact = 0; w.cut = null; w.ko = null;
        w.tween(h, { ox: -20 }, 0.18, "out");
        later(0.2, () => w.tween(h, { ox: 110 }, 0.09, "in", () => {
          const x = f.x - 30, y = G - 80;
          w.hit = { x, y };
          f.flash = 1; w.fly(f, 360, -460, 5);
          w.emit("kill", f, x, y);
          later(2.2, () => w.respawn(f));
        }));
      },
      update(w, dt) {
        if (w.focus > 0) { w.zoom = Math.max(w.zoom, 0.32 * w.focus); w.cam.tx = (w.hit.x - 270) * w.focus * 0.7; w.cam.ty = (w.hit.y - 180) * w.focus * 0.5; }
        else { w.cam.tx = 0; w.cam.ty = 0; }
        if (w.ko) w.ko.t += dt;
      },
      drawFloor(w, ctx) {
        stage(ctx, 270, 170, "#2c3340", "#07080b");
        plinth(ctx, 270, G + 8, 236, 38, "#0e1015", "rgba(220,225,240,0.35)");
      },
      drawHud(w, ctx) {
        if (w.mono > 0) {
          ctx.save(); ctx.globalCompositeOperation = "saturation";
          ctx.fillStyle = `rgba(128,128,128,${w.mono})`; ctx.fillRect(-200, -200, 940, 760); ctx.restore();
        }
        const c = w.cut;
        if (c && c.a > 0) {
          ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(255,40,50,${c.a})`; ctx.lineCap = "round";
          ctx.lineWidth = 10 * c.a; ctx.beginPath(); ctx.moveTo(c.x - 170, c.y + 50); ctx.lineTo(c.x + 170, c.y - 50); ctx.stroke(); ctx.restore();
        }
        if (w.ko && w.ko.t < 2.4) {
          // 카메라 줌과 상관없이 화면에 고정
          ctx.save(); ctx.translate(270 + w.cam.x, 180 + w.cam.y); ctx.scale(1 / (1 + w.zoom), 1 / (1 + w.zoom)); ctx.translate(-270, -180);
          ctx.globalAlpha = Math.min(1, (2.4 - w.ko.t) * 3);
          bigText(ctx, "FINAL BLOW", 270, 62, 38, ["#ffffff", "#ffb3b3", "#e01828"], "#14000a", -0.04, Math.max(1, 2.2 - w.ko.t * 8));
          ctx.restore();
        }
        if (w.impact > 0) {
          w.impact--;
          const h = w.hero, f = w.foe;
          ctx.fillStyle = "#000"; ctx.fillRect(-200, -200, 940, 760);
          ctx.drawImage(SPR.hero.white, h.x + h.ox - h.w / 2, G - h.h, h.w, h.h);
          ctx.save(); ctx.translate(f.x + f.ox, G + f.oy - f.h / 2); ctx.rotate(f.rot); ctx.drawImage(SPR.foe.white, -f.w / 2, -f.h / 2, f.w, f.h); ctx.restore();
        }
      },
      steps: [
        {
          id: "zoom", name: { en: "Camera Zoom", ko: "카메라 줌" }, param: "zoom +32% · 1.4s",
          cap: { en: "*Zoom in* on the killing blow and hold.", ko: "결정타에 카메라가 *쑥* 다가가 머물러요." },
          kill(w) {
            w.focus = 1;
            w.tween(w, { focus: 0 }, 1.4, "in");
          },
        },
        {
          id: "slowmo", name: { en: "Slow Motion", ko: "슬로모션" }, param: "×0.12 · 1.6s",
          cap: { en: "Drop to *slow motion*. Let it fall *slowly*.", ko: "*슬로모션*, *천천히* 쓰러지게 둬요." },
          kill(w) { w.slowmo(0.12, 1.6); },
        },
        {
          id: "impact", name: { en: "Impact Frame", ko: "임팩트 프레임" }, param: "6 frames · inverted",
          cap: { en: "Flash a black-and-white *impact frame*.", ko: "*흑백 반전* 한 컷이 *번쩍*." },
          kill(w) { w.hitstop(0.1); w.impact = 6; },
        },
        {
          id: "ring", name: { en: "Drama Ring", ko: "극적인 고리" }, param: "desat · red cut",
          cap: { en: "Drain the *color*. Big *rings*, one *red* cut.", ko: "색이 *빠지고*, 큰 *고리*, *붉은* 베기 자국." },
          kill(w, f, x, y) {
            w.mono = 1; w.tween(w, { mono: 0 }, 1.6, "in");
            w.cut = { x, y, a: 1 }; w.tween(w.cut, { a: 0 }, 1.2, "in");
            w.spawn({ type: "ring", x, y, size: 20, size1: 220, life: 0.8, w: 7, color: "255,230,230" });
            w.spawn({ type: "ring", x, y, size: 10, size1: 140, life: 0.6, w: 4, color: "255,70,90" });
          },
        },
        {
          id: "ko", name: { en: "Final Text", ko: "마무리 글자" }, param: "×2.2 → ×1 · red",
          cap: { en: "Slam *FINAL BLOW* in blood red.", ko: "핏빛 *FINAL BLOW*가 *쾅*." },
          kill(w, f, x, y) {
            w.ko = { t: 0 };
            for (let i = 0; i < 14; i++) w.spawn({ type: "spark", x, y, vx: rand(60, 520), vy: rand(-380, 120), drag: 1.5, size: 3, life: rand(0.8, 1.4), color: "255,60,60" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slash + low boom",
          cap: { en: "A sharp *slash*, then a deep, slow *boom*.", ko: "날카로운 *슥*, 이어서 낮고 긴 *쿠웅*." },
          kill(w) {
            w.sfx.slashHit();
            w.play(() => { tn({ f: 60, f2: 24, dur: 1.6, vol: 0.8 }); nz({ f: 400, f2: 60, dur: 1.4, vol: 0.5 }); });
          },
        },
      ],
    },
  );
})();

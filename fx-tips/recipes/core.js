"use strict";
/* 기본 레시피 20편 */
RECIPES.push(
  {
    id: "gun", cat: "weapon", view: "side", polished: true, hookDur: 2.7,
    title: { en: "Make gunshots *punchy*", ko: "총 쏘는 *손맛* 살리기" },
    intro: { en: "Feels like a *toy*.", ko: "장난감 총 같죠?" },
    interval: 0.5, stepDur: 3.2,
    setup(w) { w.hero = w.actor("hero", { home: 165 }); w.foe = w.actor("foe", { home: 375 }); w.gun = { kick: 0, rot: 0 }; },
    fire(w) {
      const m = muzzle(w);
      const b = { x: m.x, y: m.y, vx: 1150, vy: 0, r: 5, color: "#e2e8f0", hitX: w.foe.x - 55 };
      b.onHit = () => {
        const r = w.foe; if (!r.alive) return;
        r.hp -= 20; if (!w.on("hit")) r.ox += 8;
        w.emit("hit", { x: b.x, y: b.y });
        if (r.hp <= 0) w.kill(r);
      };
      w.emit("fire", m, b);
      w.shoot(b);
    },
    update(w, dt) { const g = w.gun; g.kick -= g.kick * Math.min(1, dt * 16); g.rot -= g.rot * Math.min(1, dt * 12); },
    drawFront(w, ctx) { drawGun(w, ctx); },
    drawHud(w, ctx) { drawBar(ctx, w.foe); },
    steps: [
      {
        id: "muzzle", name: { en: "Muzzle Flash", ko: "총구 불꽃" },
        cap: { en: "Flash the barrel on the *same frame* you fire.", ko: "쏘는 *그 프레임*에 바로 번쩍." },
        fire(w, m) {
          // 3갈래 불꽃(0.07초) + 총구 앞 짧은 불티
          w.spawn({ x: m.x + 2, y: m.y, life: 0.09, draw: (ctx, p, k) => pxMuzzle(ctx, p.x, p.y, 24, k) });
          for (let i = 0; i < 4; i++) w.spawn({ type: "spark", x: m.x + 4, y: m.y, vx: rand(500, 900), vy: rand(-140, 140), drag: 8, life: rand(0.05, 0.1), size: 2, color: "255,214,120" });
        },
      },
      {
        id: "recoil", name: { en: "Recoil", ko: "반동" },
        cap: { en: "Kick the gun *back hard*, ease it home *slowly*.", ko: "총을 *확* 뒤로, *천천히* 제자리로." },
        fire(w) { w.gun.kick = 16; w.gun.rot = -0.35; w.hero.ox -= 5; },
      },
      {
        id: "shell", name: { en: "Shell Casing", ko: "탄피" },
        cap: { en: "Spin a casing out. *Let it stay* on the floor.", ko: "탄피를 돌려 날리고, 바닥에 *남겨요*." },
        fire(w, m) {
          w.spawn({ type: "shell", x: m.x - 34, y: m.y - 4, vx: rand(-150, -60), vy: rand(-360, -260), g: 1400, vr: rand(-30, -15),
            ground: true, bounce: 0.35, life: 4, size: 11, color: "250,204,21", hold: true });
          // 탄피가 튀어나오는 순간 반짝
          w.spawn({ type: "star", x: m.x - 34, y: m.y - 8, size: 7, life: 0.08, color: "255,240,180" });
        },
      },
      {
        id: "tracer", name: { en: "Tracer", ko: "총알 꼬리" },
        cap: { en: "A tiny dot is invisible. *Give it a tail.*", ko: "점은 안 보여요. *꼬리*를 달아요." },
        fire(w, m, b) { b.len = 46; },
      },
      {
        id: "hit", name: { en: "Hit Reaction", ko: "맞는 반응" },
        cap: { en: "Flash *white*, chip the armor, knock it *back*.", ko: "*하얗게* 번쩍, 갑옷이 *튀고*, *밀려나게*." },
        hit(w, h) {
          const r = w.foe;
          r.flash = 0.95; r.sx = 0.86; r.sy = 1.1; r.ox += 14;
          w.spawn({ x: h.x, y: h.y, life: 0.09, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 22, k) });
          // 맞은 자리에서 적 갑옷 조각이 튐 (적 색)
          for (let i = 0; i < 6; i++) { const sz = rand(2, 4), rot = rand(0, 6);
            w.spawn({ x: h.x, y: h.y, vx: rand(80, 320), vy: rand(-380, -120), g: 1300, drag: 0.6, ground: true, bounce: 0.3, life: rand(0.6, 0.9), vr: rand(-16, 16), draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#e2553a", "#5b1d17") }); }
          for (let i = 0; i < 7; i++) w.spawn({ type: "spark", x: h.x, y: h.y, vx: rand(-520, -140), vy: rand(-260, 260), drag: 6, life: rand(0.1, 0.22), size: 2.5, color: "255,220,140" });
        },
      },
      {
        id: "shake", name: { en: "Screen Kick", ko: "화면 반동" },
        cap: { en: "Nudge the *camera* with every shot.", ko: "쏠 때마다 *화면*도 같이 밀려요." },
        fire(w) { w.shake(0.2, -1); },
        hit(w) { w.shake(0.14); },
      },
      {
        id: "sound", name: { en: "Layered Sound", ko: "겹친 소리" },
        cap: { en: "*Crack* + *thump*. Shift the pitch a little *every shot*.", ko: "*탕* + *쿵*. 쏠 때마다 음높이를 *살짝* 다르게." },
        fire(w) { w.sfx.gun(rand(0.92, 1.08)); },
        hit(w) { w.sfx.hit(rand(0.9, 1.1)); },
      },
      {
        id: "kill", name: { en: "The Last Bullet", ko: "마지막 한 발" },
        cap: { en: "*Freeze* for a beat, then send it *flying*.", ko: "잠깐 *멈췄다가*, 멀리 *날려* 버려요." },
        enter(w) { w.foe.hp = 40; },
        kill(w, r) {
          w.hitstop(0.14); w.fly(r, 40, -500, 0, true); r.flash = 0.6; r.tint = 0.5; w.shake(0.4, 1);
          const x = r.x - 30, y = G - 60;
          w.spawn({ x, y, life: 0.16, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 46, k, "255,240,200") });
          w.spawn({ type: "ring", x, y, size: 8, size1: 70, life: 0.28, w: 6, color: "255,200,120" });
          for (let i = 0; i < 14; i++) { const sz = rand(2.5, 5.5), rot = rand(0, 6), a = rand(-2.6, 0.4), v = rand(260, 620);
            w.spawn({ x, y, vx: Math.cos(a) * v * 0.8 + 120, vy: Math.sin(a) * v, g: 1200, drag: 0.4, ground: true, bounce: 0.3, life: rand(0.8, 1.2), vr: rand(-14, 14), draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#f06a45", "#5b1d17") }); }
          for (let i = 0; i < 16; i++) { const a = rand(0, TAU), s = rand(200, 620); w.spawn({ type: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 4, life: rand(0.2, 0.42), size: 3, color: "255,214,140" }); }
          w.sfx.ping();
        },
        // 바닥에 떨어지는 순간: 먼지 + 짧은 흔들림
        land(w, r) {
          w.shake(0.22, 0);
          for (let i = 0; i < 10; i++) { const dir = i % 2 ? 1 : -1; w.spawn({ type: "smoke", x: r.x + rand(-30, 30), y: G - 4, vx: dir * rand(60, 160), vy: rand(-40, -10), drag: 3, life: rand(0.4, 0.7), size: rand(8, 14), size1: rand(14, 22), color: "90,96,118" }); }
          for (let i = 0; i < 5; i++) { const sz = rand(2, 3.5), rot = rand(0, 6); w.spawn({ x: r.x + rand(-20, 20), y: G - 6, vx: rand(-160, 160), vy: rand(-320, -160), g: 1300, ground: true, bounce: 0.3, life: rand(0.7, 1), vr: rand(-12, 12), draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#e2553a", "#5b1d17") }); }
          w.sfx.land && w.sfx.land();
        },
      },
    ],
  },

  {
    id: "magic", cat: "weapon", view: "side",
    title: { en: "Make spells feel *magical*", ko: "마법에 *한 방* 넣기" },
    intro: { en: "Just a *glowing dot*.", ko: "그냥 *점* 하나 날아가요." },
    interval: 1.05, stepDur: 3.4,
    setup(w) { w.hero = w.actor("hero"); w.foe = w.actor("foe"); },
    fire(w) {
      const launch = () => {
        const p = paw(w);
        const o = { x: p.x + 6, y: p.y, vx: 820, vy: 0, orb: true, hitX: w.foe.x - 40 };
        o.onHit = () => {
          const r = w.foe; if (!r.alive) return;
          const crit = Math.random() < 0.25, d = crit ? 48 : 24;
          r.hp -= d; if (!w.on("hitstop")) r.ox += 8;
          w.emit("hit", { x: o.x, y: o.y }, d, crit);
          if (r.hp <= 0) w.kill(r);
        };
        w.emit("launch", o);
        if (!o.core) o.draw = (ctx, p) => { ctx.fillStyle = "#8b7fd6"; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, TAU); ctx.fill(); };
        w.shoot(o);
      };
      if (w.on("charge")) { w.emit("charge", paw(w)); w.after(0.36, launch); } else launch();
    },
    drawHud(w, ctx) { drawBar(ctx, w.foe); },
    steps: [
      {
        id: "charge", name: { en: "Charge-up", ko: "모으기" },
        cap: { en: "*Pull light in* before you cast.", ko: "쏘기 전에 빛을 *빨아들여요*." },
        charge(w, p) {
          for (let i = 0; i < 16; i++) w.after(i * 0.018, () => {
            const a = rand(0, TAU), d = rand(55, 90);
            w.spawn({ type: "spark", seek: true, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, tx: p.x, ty: p.y, life: 0.22, size: 2.5, color: "196,181,253" });
          });
          w.spawn({ type: "glow", x: p.x, y: p.y, size: 6, size1: 34, life: 0.36, color: "167,139,250" });
          w.hero.sx = 1.06; w.hero.sy = 0.94;
          w.sfx.charge();
        },
      },
      {
        id: "core", name: { en: "Hot Core", ko: "밝은 중심" },
        cap: { en: "*White-hot* center, colored glow around it.", ko: "가운데는 *하얗게*, 바깥은 색으로." },
        launch(w, o) { o.core = true; },
      },
      {
        id: "trail", name: { en: "Trail", ko: "꼬리" },
        cap: { en: "Leave *sparks behind* as it flies.", ko: "날아가며 *불씨*를 흘려요." },
        launch(w, o) { o.trail = "196,181,253"; },
      },
      {
        id: "burst", name: { en: "Burst", ko: "터짐" },
        cap: { en: "On impact: a *ring* and a *spray*.", ko: "맞는 순간 *고리*와 *불꽃*." },
        hit(w, h) {
          w.spawn({ type: "ring", x: h.x, y: h.y, size: 8, size1: 82, life: 0.35, w: 10, color: "196,181,253" });
          w.spawn({ type: "glow", x: h.x, y: h.y, size: 72, size1: 20, life: 0.25, color: "167,139,250" });
          w.spawn({ type: "star", x: h.x, y: h.y, size: 46, life: 0.1, color: "255,255,255" });
          for (let i = 0; i < 18; i++) { const a = rand(0, TAU), s = rand(150, 520); w.spawn({ type: "spark", x: h.x, y: h.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 5, life: rand(0.18, 0.4), size: 2.4, color: "233,213,255" }); }
        },
        kill(w, r) {
          for (let i = 0; i < 26; i++) w.spawn({ type: "glow", x: r.x + rand(-80, 80), y: G - rand(10, 90), vx: rand(-40, 40), vy: rand(-160, -40), size: rand(8, 16), size1: 0, life: rand(0.4, 0.8), color: "196,181,253" });
        },
      },
      {
        id: "hitstop", name: { en: "Hit Stop", ko: "멈칫" },
        cap: { en: "Freeze *70ms*. The brain reads it as *heavy*.", ko: "*0.07초* 멈추면 *묵직하게* 느껴져요." },
        hit(w) { w.hitstop(0.07); const r = w.foe; r.flash = 1; r.sx = 0.8; r.sy = 1.16; r.ox += 16; },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" },
        cap: { en: "A *whoosh* out, a *boom* in.", ko: "나갈 때 *휙*, 맞을 때 *팡*." },
        launch(w) { w.sfx.magic(); },
        hit(w) { w.sfx.burst(); },
      },
      {
        id: "burn", name: { en: "Aftermath", ko: "여운" },
        cap: { en: "*Set it on fire.* Let the hit keep going.", ko: "*불을 붙여서* 여운을 남겨요." },
        hit(w) { w.foe.burn = 2.2; },
        update(w, dt) {
          const r = w.foe;
          if (r.burn <= 0 || !r.alive) return;
          r.burn -= dt; r.burnT = (r.burnT || 0) - dt;
          if (Math.random() < dt * 30) w.spawn({ type: "glow", x: r.x + rand(-60, 60), y: G - rand(10, 80), vx: rand(-20, 20), vy: rand(-120, -60), size: rand(10, 18), size1: 2, life: rand(0.35, 0.6), color: "255,140,40" });
          if (r.burnT <= 0) { r.burnT = 0.45; r.hp -= 4; w.emit("tick", r, 4); if (r.hp <= 0) w.kill(r); }
        },
      },
      {
        id: "numbers", name: { en: "Damage Numbers", ko: "데미지 숫자" },
        cap: { en: "*Pop*, *bounce*, fade. Crits get *bigger*.", ko: "*톡* 튀고 사라지게. 치명타는 *더 크게*." },
        hit(w, h, d, crit) {
          w.spawn({ type: "text", text: crit ? d + "!" : String(d), x: h.x + rand(-10, 10), y: h.y - 36, vx: rand(-40, 40), vy: -280, g: 760, life: 0.9, size: crit ? 46 : 30, color: crit ? "#fde047" : "#ffffff" });
        },
        tick(w, r, d) {
          w.spawn({ type: "text", text: String(d), x: r.x + rand(-30, 30), y: G - 95, vy: -120, life: 0.6, size: 20, color: "#fb923c" });
        },
      },
    ],
  },

  {
    id: "melee", cat: "combat", view: "side", polished: true, hookDur: 3.4, hookFires: [0.2, 1.05],
    title: { en: "Make melee hits *heavy*", ko: "근접 공격 *묵직하게*" },
    intro: { en: "It touched. *That's it.*", ko: "닿긴 했는데… *끝?*" },
    interval: 1.0, stepDur: 3.4,
    setup(w) { w.hero = w.actor("hero", { home: 150 }); w.foe = w.actor("foe", { home: 365, hp: 50 }); },
    fire(w) {
      if (w.busy) return;
      w.busy = true;
      const c = w.hero;
      const strike = () => {
        const r = w.foe, at = { x: r.x - 34, y: G - 70 };
        w.emit("swing", at);
        if (r.alive) {
          r.hp -= 25;
          if (!w.on("knock")) r.ox += 14;
          w.emit("hit", at);
          if (r.hp <= 0) w.kill(r);
        }
        w.after(0.16, () => w.tween(c, { x: c.home }, 0.26, "inout", () => { w.busy = false; }));
      };
      const dash = () => w.tween(c, { x: w.foe.x - 92 }, 0.09, "in", strike);
      if (w.on("windup")) { w.emit("windup"); w.after(0.16, dash); } else dash();
    },
    drawHud(w, ctx) { drawBar(ctx, w.foe); },
    steps: [
      {
        id: "windup", name: { en: "Wind-up", ko: "예비 동작" },
        cap: { en: "*Pull back* before you swing.", ko: "치기 전에 *살짝 뒤로*." },
        windup(w) { const c = w.hero; w.tween(c, { x: c.home - 26 }, 0.14, "out"); },
      },
      {
        id: "arc", name: { en: "Slash Wave", ko: "참격파" },
        cap: { en: "Don't just swing. *Throw the slash* as a wave.", ko: "그냥 휘두르지 말고, *베기를 날려요*." },
        swing(w, at) {
          // 칼끝 궤적 + 앞으로 날아가는 거대한 초승달 참격파
          w.spawn({ x: at.x - 34, y: at.y + 6, life: 0.16, draw: (ctx, p, k) => pxCrescent(ctx, p.x, p.y, 62, -2.1, 0.85, 12, k, "190,245,255") });
          w.spawn({ x: at.x - 40, y: at.y - 4, vx: 620, life: 0.42, draw: (ctx, p, k) => pxWave(ctx, p.x, p.y, 66 + k * 26, 27, k) });
          for (let i = 0; i < 16; i++) { const a = rand(-1.2, 1.2); w.spawn({ type: "spark", x: at.x - 40 + Math.cos(a) * 60, y: at.y - 4 + Math.sin(a) * 60, vx: rand(250, 700), vy: Math.sin(a) * rand(60, 220), drag: 4, life: rand(0.18, 0.36), size: rand(2, 3.4), color: pick(["160,235,255", "255,255,255", "90,170,255"]) }); }
          w.shake(0.14, 1);
        },
        hit(w, at) {
          // 몸을 사선으로 가르는 하얀 선 + 선을 따라 튀는 불티
          const ang = -0.9;
          w.spawn({ x: at.x + 30, y: at.y - 6, life: 0.32, draw: (ctx, p, k) => pxCutLine(ctx, p.x, p.y, 120, ang, k) });
          for (let i = 0; i < 10; i++) { const t = rand(-55, 55); w.spawn({ type: "spark", x: at.x + 30 + Math.cos(ang) * t, y: at.y - 6 + Math.sin(ang) * t, vx: rand(-80, 260), vy: rand(-260, 120), drag: 5, life: rand(0.2, 0.4), size: 2.5, color: "200,245,255" }); }
        },
      },
      {
        id: "hitstop", name: { en: "Hit Stop", ko: "멈칫" },
        cap: { en: "On contact, *both freeze*. The target *trembles*, fading out.", ko: "닿는 순간 *둘 다 멈칫*. 맞은 쪽은 *떨리다* 잦아들어요." },
        hit(w) { w.hitstop(0.09); w.foe.vib = 6; },
      },
      {
        id: "flash", name: { en: "Impact Flash", ko: "충돌 섬광" },
        cap: { en: "A *white flash* and a *spark star* where it hits.", ko: "맞은 자리에 *하얀 번쩍임*과 *불꽃 별*." },
        hit(w, at) {
          w.foe.flash = 0.95;
          w.spawn({ x: at.x + 6, y: at.y, life: 0.12, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 34, k, "235,250,255") });
          for (let i = 0; i < 6; i++) { const sz = rand(2, 4), rot = rand(0, 6); w.spawn({ x: at.x + 8, y: at.y, vx: rand(60, 300), vy: rand(-380, -140), g: 1300, drag: 0.6, ground: true, bounce: 0.3, life: rand(0.6, 0.9), vr: rand(-16, 16), draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#e2553a", "#5b1d17") }); }
        },
      },
      {
        id: "knock", name: { en: "Knockback", ko: "밀려남" },
        cap: { en: "Push it *far*. Kick up *dust* where it slides.", ko: "*멀리* 밀고, 미끄러진 자리에 *먼지*." },
        hit(w) {
          const r = w.foe; if (!r.alive) return; r.ox += 60; r.k = 3.2;
          for (let i = 0; i < 7; i++) w.spawn({ type: "smoke", x: r.x - rand(0, 50), y: G - 4, vx: rand(40, 160), vy: rand(-50, -10), drag: 3, size: rand(6, 10), size1: rand(14, 22), life: rand(0.4, 0.7), color: "90,96,118" });
        },
        kill(w, r) { r.ox = 0; w.fly(r, 25, -460, 0, true); r.tint = 0.5; },
        land(w, r) {
          w.shake(0.2, 0);
          for (let i = 0; i < 10; i++) { const dir = i % 2 ? 1 : -1; w.spawn({ type: "smoke", x: r.x + rand(-30, 30), y: G - 4, vx: dir * rand(60, 160), vy: rand(-40, -10), drag: 3, life: rand(0.4, 0.7), size: rand(8, 14), size1: rand(14, 22), color: "90,96,118" }); }
        },
      },
      {
        id: "shake", name: { en: "Shake", ko: "흔들림" },
        cap: { en: "Shake *hard*, settle *fast*.", ko: "*세게* 흔들고 *빨리* 멈춰요." },
        hit(w) { w.shake(0.4, 1); },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" },
        cap: { en: "A *swish* on the swing, a *thud* on the hit.", ko: "휘두를 때 *쉭*, 맞을 때 *퍽*." },
        swing(w) { w.sfx.slash(); },
        hit(w) { w.sfx.thud(); },
        land(w) { w.sfx.land(); },
      },
    ],
  },

  {
    id: "pickup", cat: "ui", view: "side",
    title: { en: "Make pickups *satisfying*", ko: "줍는 *맛* 살리기" },
    intro: { en: "It just… *disappears*.", ko: "그냥… *사라져요*." },
    interval: 2.1, stepDur: 3.6,
    setup(w) {
      w.hero = w.actor("hero"); w.crate = w.actor("crate");
      w.items = []; w.hud = { score: 0, shown: 0, bump: 0, x: 48, y: 62 }; w.combo = 0; w.comboT = 0;
    },
    fire(w) {
      const cr = w.crate; cr.sx = 1.15; cr.sy = 0.85;
      for (let i = 0; i < 6; i++) {
        const it = { img: ["coin", "gem", "heart"][i % 3], x: rand(220, 320), y: G - 14, vx: 0, vy: 0, rot: rand(-0.4, 0.4), vr: 0, air: false, sq: 1, sc: 1, seek: false, dead: false };
        w.emit("drop", it);
        w.items.push(it);
        w.after(0.6 + i * 0.09, () => {
          if (it.dead) return;
          w.emit("collect", it);
          if (!it.seek) arrive(w, it);
        });
      }
    },
    update(w, dt) {
      for (const it of w.items) {
        if (it.air) {
          it.vy += 1500 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
          if (it.y >= G - 14) { it.y = G - 14; if (Math.abs(it.vy) > 140) { it.vy *= -0.4; it.vx *= 0.6; it.sq = 0.6; } else { it.air = false; it.vy = 0; } }
        }
        it.sq += (1 - it.sq) * Math.min(1, dt * 12);
      }
      w.items = w.items.filter(it => !it.dead);
      w.comboT -= dt; if (w.comboT <= 0) w.combo = 0;
      w.hud.bump = Math.max(0, w.hud.bump - dt * 6);
      if (!w.on("roll")) w.hud.shown = w.hud.score;
    },
    drawFront(w, ctx) {
      for (const it of w.items) {
        const c = SPR[it.img].c, s = 40 * it.sc, h = s * c.height / c.width;
        ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot); ctx.scale(1 / it.sq * 0.9 + 0.1, it.sq);
        ctx.drawImage(c, -s / 2, -h / 2, s, h); ctx.restore();
      }
    },
    drawHud(w, ctx) {
      const h = w.hud, c = SPR.coin.c, sc = 1 + h.bump * 0.45;
      ctx.save(); ctx.translate(h.x, h.y); ctx.scale(sc, sc);
      ctx.drawImage(c, -20, -20 * c.height / c.width, 40, 40 * c.height / c.width);
      ctx.font = '800 32px Pretendard, "Apple SD Gothic Neo", sans-serif'; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.lineWidth = 6; ctx.strokeStyle = "rgba(10,12,20,0.9)"; ctx.lineJoin = "round";
      const t = String(Math.round(h.shown));
      ctx.strokeText(t, 28, 2); ctx.fillStyle = h.bump > 0.2 ? "#fde047" : "#fff"; ctx.fillText(t, 28, 2);
      ctx.restore();
    },
    steps: [
      {
        id: "pop", name: { en: "Pop Out", ko: "튀어나오기" },
        cap: { en: "Don't just place it. *Pop it out* with a bounce.", ko: "그냥 놓지 말고 *통통* 튀어나오게." },
        drop(w, it) {
          const cr = w.crate;
          it.x = cr.x + rand(-20, 20); it.y = G - cr.h;
          it.vx = rand(-330, -90); it.vy = rand(-620, -420); it.vr = rand(-10, 10); it.air = true;
        },
      },
      {
        id: "magnet", name: { en: "Magnet", ko: "빨려 들어오기" },
        cap: { en: "Pull it in, *slow then fast*.", ko: "*천천히 → 확*, 가속하며 빨려 와요." },
        collect(w, it) { it.seek = true; it.t = 0; it.x0 = it.x; it.y0 = it.y; },
        update(w, dt) {
          const h = w.hud;
          for (const it of w.items) {
            if (!it.seek || it.dead) continue;
            it.t += dt * 1.6;
            const k = E.in(Math.min(1, it.t)), q = 1 - k;
            const cx = it.x0, cy = it.y0 - 170;
            it.x = q * q * it.x0 + 2 * q * k * cx + k * k * h.x;
            it.y = q * q * it.y0 + 2 * q * k * cy + k * k * h.y;
            it.sc = 1 - 0.4 * k; it.rot += dt * 8;
            if (it.t >= 1) arrive(w, it);
          }
        },
      },
      {
        id: "bump", name: { en: "Counter Bump", ko: "숫자 칸 튀기" },
        cap: { en: "*Bump the counter* every time something lands.", ko: "들어올 때마다 *숫자 칸이 톡*." },
        arrive(w) { w.hud.bump = 1; },
      },
      {
        id: "sparkle", name: { en: "Sparkle", ko: "반짝임" },
        cap: { en: "A tiny *sparkle* where it leaves and where it lands.", ko: "떠날 때, 도착할 때 *반짝*." },
        collect(w, it) { w.spawn({ type: "star", x: it.x, y: it.y, size: 18, life: 0.18, color: "255,255,255" }); },
        arrive(w) {
          const h = w.hud;
          w.spawn({ type: "star", x: h.x, y: h.y, size: 34, life: 0.2, color: "253,224,71" });
          for (let i = 0; i < 6; i++) { const a = rand(0, TAU), s = rand(80, 220); w.spawn({ type: "spark", x: h.x, y: h.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 5, life: 0.25, size: 2, color: "253,224,71" }); }
        },
      },
      {
        id: "sound", name: { en: "Rising Pitch", ko: "올라가는 음" },
        cap: { en: "Each pickup plays *a little higher*.", ko: "주울수록 음이 *한 칸씩* 올라가요." },
        arrive(w) { w.sfx.blip(w.combo); },
      },
      {
        id: "roll", name: { en: "Rolling Numbers", ko: "굴러가는 숫자" },
        cap: { en: "Numbers should *count up*, not jump.", ko: "숫자는 점프 말고 *굴러가게*." },
        update(w, dt) { const h = w.hud; h.shown += (h.score - h.shown) * Math.min(1, dt * 6); },
      },
    ],
  },

  {
    id: "hurt", cat: "combat", view: "side",
    title: { en: "Make getting hit *readable*", ko: "맞았을 때 *확실하게*" },
    intro: { en: "Wait… did I just *get hit?*", ko: "방금… *맞은 거야?*" },
    interval: 1.25, stepDur: 3.4,
    setup(w) {
      w.hero = w.actor("hero"); w.hero.home = w.hero.x = 150; w.hero.maxHp = w.hero.hp = w.hero.hpLag = 100;
      w.foe = w.actor("foe"); w.foe.maxHp = 0; w.gun = { kick: 0, rot: 0 };
    },
    fire(w) {
      if (w.busy) return;
      w.busy = true;
      const r = w.foe, c = w.hero;
      w.tween(r, { x: c.x + c.w / 2 + r.w / 2 + 2 }, 0.13, "in", () => {
        c.hp -= 17; if (!w.on("knock")) c.ox -= 8;
        w.emit("hurt", c);
        if (c.hp <= 0) w.after(0.5, () => w.tween(c, { hp: 100 }, 0.5, "out"));
        w.tween(r, { x: r.home }, 0.35, "inout", () => { w.busy = false; });
      });
    },
    update(w) { if (!w.on("bar")) w.hero.hpLag = w.hero.hp; },
    drawFront(w, ctx) { drawGun(w, ctx); },
    drawHud(w, ctx) { drawBar(ctx, w.hero, w.on("bar")); },
    steps: [
      {
        id: "flash", name: { en: "Red Flash", ko: "붉은 번쩍임" },
        cap: { en: "Flash the hero *red* for a split second.", ko: "주인공을 *빨갛게* 아주 잠깐." },
        hurt(w, c) { c.tint = 1; },
      },
      {
        id: "knock", name: { en: "Flinch", ko: "움찔" },
        cap: { en: "Push the hero *back*. Squash a little.", ko: "*뒤로* 밀리고, 살짝 찌그러져요." },
        hurt(w, c) { c.ox -= 34; c.sx = 0.84; c.sy = 1.1; },
      },
      {
        id: "bar", name: { en: "Two-layer HP Bar", ko: "두 겹 체력바" },
        cap: { en: "*Red* drops now, *yellow* follows. You *see* the loss.", ko: "*빨강*은 바로, *노랑*은 천천히. 깎인 만큼 *보여요*." },
        hurt(w, c) { c.lagWait = 0.35; c.barShake = 0.3; },
        update(w, dt) {
          const c = w.hero;
          if (c.hpLag < c.hp) c.hpLag = c.hp;
          if (c.lagWait > 0) c.lagWait -= dt; else c.hpLag += (c.hp - c.hpLag) * Math.min(1, dt * 3.5);
        },
      },
      {
        id: "vignette", name: { en: "Red Vignette", ko: "붉은 테두리" },
        cap: { en: "Tint the *screen edges*. Players feel it even mid-chaos.", ko: "*화면 가장자리*를 붉게. 정신없어도 느껴져요." },
        hurt(w) { w.vignette(0.7); },
      },
      {
        id: "iframes", name: { en: "I-frames Blink", ko: "무적 깜빡임" },
        cap: { en: "*Blink* = invincible. Players get it *instantly*.", ko: "*깜빡이는 동안 무적*. 설명 없이도 알아요." },
        hurt(w, c) { c.blink = 0.9; },
      },
      {
        id: "shake", name: { en: "Shake + Stop", ko: "흔들림 + 멈칫" },
        cap: { en: "A short *shake* and a tiny *freeze*.", ko: "짧게 *흔들고*, 아주 잠깐 *멈칫*." },
        hurt(w) { w.shake(0.35, -1); w.hitstop(0.06); },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" },
        cap: { en: "A short, *ugly* sound. Getting hit shouldn't sound nice.", ko: "짧고 *거친* 소리. 맞는 소리가 예쁘면 안 돼요." },
        hurt(w) { w.sfx.hurt(); },
      },
    ],
  },

  {
    id: "boom", cat: "combat", view: "side",
    title: { en: "Make explosions *BIG*", ko: "폭발을 *크게*" },
    intro: { en: "That was… an *explosion?*", ko: "이게… *폭발*이라고?" },
    interval: 1.9, stepDur: 3.8,
    setup(w) { w.hero = w.actor("hero"); w.hero.home = w.hero.x = 100; w.foe = w.actor("foe"); },
    fire(w) {
      const c = w.hero; c.sx = 0.9; c.sy = 1.08;
      const x0 = c.x + 40, y0 = G - 90, tx = w.foe.x - 20, T = 0.62, g = 1300;
      const pr = { img: "grenade", w: 34, x: x0, y: y0, vx: (tx - x0) / T, vy: (G - 14 - y0 - 0.5 * g * T * T) / T, g, vr: 12, hitY: G - 14 };
      pr.onHit = () => {
        const e = { x: pr.x, y: G - 10 };
        if (!w.on("fire")) w.spawn({ type: "circle", x: e.x, y: e.y - 20, size: 24, size1: 46, life: 0.2, color: "251,146,60", add: false });
        w.emit("boom", e);
        const r = w.foe;
        if (r.alive) { r.hp -= 55; if (r.hp <= 0) w.kill(r); }
      };
      w.emit("fire");
      w.shoot(pr);
    },
    drawHud(w, ctx) { drawBar(ctx, w.foe); },
    steps: [
      {
        id: "flash", name: { en: "White Frame", ko: "하얀 한 프레임" },
        cap: { en: "Start with *one white frame*.", ko: "첫 프레임은 *하얗게*." },
        boom(w) { w.flash("255,250,235", 0.7); },
      },
      {
        id: "ring", name: { en: "Shockwave", ko: "충격파" },
        cap: { en: "A *ring* that pushes everything *away*.", ko: "주변을 *밀어내는* 고리." },
        boom(w, e) {
          w.spawn({ type: "ring", x: e.x, y: e.y - 30, size: 10, size1: 200, life: 0.42, w: 14, color: "255,236,200" });
          w.spawn({ type: "ring", x: e.x, y: e.y, size: 10, size1: 150, life: 0.35, w: 6, color: "255,200,120", flat: true });
          const r = w.foe; if (r.alive) { r.flash = 1; r.ox += 40; r.sx = 0.8; r.sy = 1.2; }
        },
        kill(w, r) { w.fly(r, 380, -760, 9); },
      },
      {
        id: "fire", name: { en: "Fire → Smoke", ko: "불 → 연기" },
        cap: { en: "Fire *fades into smoke*. Smoke *lingers*.", ko: "불은 *연기로* 바뀌고, 연기는 *오래* 남아요." },
        boom(w, e) {
          w.spawn({ type: "glow", x: e.x, y: e.y - 40, size: 110, size1: 40, life: 0.32, color: "255,170,60" });
          for (let i = 0; i < 16; i++) w.spawn({ type: "glow", x: e.x + rand(-20, 20), y: e.y - rand(10, 40), vx: rand(-240, 240), vy: rand(-340, -60), drag: 3.5, size: rand(22, 34), size1: 4, life: rand(0.35, 0.6), color: i % 3 ? "255,140,40" : "255,220,120" });
          w.after(0.12, () => {
            for (let i = 0; i < 12; i++) w.spawn({ type: "smoke", x: e.x + rand(-50, 50), y: e.y - rand(20, 80), vx: rand(-60, 60), vy: rand(-70, -25), drag: 1, size: rand(14, 22), size1: rand(40, 60), life: rand(1.1, 1.8), color: "70,70,82" });
          });
        },
      },
      {
        id: "debris", name: { en: "Debris", ko: "파편" },
        cap: { en: "Throw *chunks*. Let them *bounce* and settle.", ko: "*파편*을 날리고, *통통* 튀다 멈추게." },
        boom(w, e) {
          for (let i = 0; i < 16; i++) w.spawn({ type: "chunk", x: e.x, y: e.y - 14, vx: rand(-420, 420), vy: rand(-720, -260), g: 1600, ground: true, bounce: 0.35, vr: rand(-20, 20), life: rand(1.8, 2.6), size: rand(5, 10), color: pick(["120,82,50", "92,64,40", "160,120,70"]), hold: true });
          for (let i = 0; i < 12; i++) { const a = rand(-Math.PI, 0), s = rand(300, 800); w.spawn({ type: "spark", x: e.x, y: e.y - 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 4, life: rand(0.2, 0.4), size: 2.5, color: "255,210,140" }); }
        },
      },
      {
        id: "shake", name: { en: "Big Shake", ko: "큰 흔들림" },
        cap: { en: "Go big. *Explosions are allowed to shake.*", ko: "크게. *폭발은 흔들어도 돼요*." },
        boom(w) { w.shake(0.9); },
      },
      {
        id: "slowmo", name: { en: "Slow-mo", ko: "슬로모션" },
        cap: { en: "*Slow time* for half a second, then snap back.", ko: "*0.5초* 느리게, 그리고 확 원래대로." },
        boom(w) { w.slowmo(0.2, 0.5); },
      },
      {
        id: "scorch", name: { en: "Scorch Mark", ko: "그을음" },
        cap: { en: "Leave a *scorch mark*. The world remembers.", ko: "*그을린 자국*을 남겨요. 흔적이 남아야 해요." },
        boom(w, e) { w.spawn({ type: "ellipse", under: true, x: e.x, y: G + 2, size: 85, life: 6, color: "15,10,8", alpha: 0.65, hold: true, add: false }); },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" },
        cap: { en: "Low *boom* + a sharp *crack* on top.", ko: "낮은 *쿵* 위에 날카로운 *팍*." },
        fire(w) { w.sfx.toss(); },
        boom(w) { w.sfx.boom(); },
      },
    ],
  },

  {
    id: "shotgun", cat: "weapon", view: "side",
    title: { en: "Give a shotgun *kick*", ko: "샷건에 *반동* 넣기" },
    intro: { en: "Seven pellets. Zero *weight*.", ko: "탄이 일곱 발인데 *무게*가 없어요." },
    interval: 1.0, stepDur: 3.3,
    setup(w) { w.hero = w.actor("hero"); w.foe = w.actor("foe", { home: 400 }); w.gun = { kick: 0, rot: 0 }; },
    fire(w) {
      const m = muzzle(w), pellets = [];
      for (let i = 0; i < 7; i++) {
        const b = { x: m.x, y: m.y, vx: 1100, vy: (i - 3) * 12, r: 4, color: "#e2e8f0" };
        b.test = p => { const f = w.foe; return f.alive && p.x >= f.x - f.w / 2 - 6 && Math.abs(p.y - (f.gy - f.h / 2)) < f.h / 2; };
        b.onHit = () => { const f = w.foe; if (!f.alive) return; f.hp -= 6; if (!w.on("hit")) f.ox += 3; w.emit("hit", { x: b.x, y: b.y }); if (f.hp <= 0) w.kill(f); };
        pellets.push(b);
      }
      w.emit("fire", m, pellets);
      pellets.forEach(b => w.shoot(b));
      w.after(0.38, () => w.emit("pump"));
    },
    update(w, dt) { gunSpring(w, dt); },
    drawFront(w, ctx) { drawGun(w, ctx); },
    drawHud(w, ctx) { drawBar(ctx, w.foe); },
    steps: [
      {
        id: "spread", name: { en: "Wide Spread", ko: "부채꼴 퍼짐" }, param: "7 pellets · ±12°",
        cap: { en: "Fan the pellets out. A *cone*, not a line.", ko: "한 줄 말고 *부채꼴*로 퍼지게." },
        fire(w, m, ps) {
          ps.forEach((b, i) => {
            const a = (i / (ps.length - 1) - 0.5) * 0.42 + rand(-0.04, 0.04), sp = rand(1300, 1600);
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.len = 34; b.lw = 2.5;
          });
        },
      },
      {
        id: "kick", name: { en: "Body Recoil", ko: "몸까지 밀림" }, param: "hero −22px",
        cap: { en: "Big gun? Push the *whole body* back.", ko: "큰 총이면 *몸 전체*가 밀려야 해요." },
        fire(w) { w.gun.kick = 26; w.gun.rot = -0.6; w.hero.ox -= 22; w.hero.sx = 0.9; w.hero.sy = 1.06; },
      },
      {
        id: "smoke", name: { en: "Muzzle Blast", ko: "총구 폭발" }, param: "flash + 6 puffs",
        cap: { en: "A *big flash*, then smoke that *lingers*.", ko: "*크게* 번쩍, 연기는 *남게*." },
        fire(w, m) {
          w.spawn({ type: "glow", x: m.x + 16, y: m.y, size: 80, size1: 20, life: 0.09, color: "255,200,110" });
          w.spawn({ type: "star", x: m.x + 20, y: m.y, size: 52, life: 0.06, color: "255,245,220" });
          for (let i = 0; i < 6; i++) w.spawn({ type: "smoke", x: m.x + rand(0, 20), y: m.y + rand(-6, 6), vx: rand(60, 220), vy: rand(-50, -10), drag: 2.5, size: rand(5, 9), size1: rand(18, 28), life: rand(0.6, 1), color: "190,190,200" });
        },
      },
      {
        id: "punch", name: { en: "One Hard Punch", ko: "한 번 세게" }, param: "8px · 100ms",
        cap: { en: "Not a rumble. *One hard punch*, then done.", ko: "계속 떨지 말고 *한 번 세게*." },
        fire(w) { w.shake(0.3); w.kick(-14, 0); },
      },
      {
        id: "hit", name: { en: "Pellet Pile-up", ko: "맞은 만큼 밀림" }, param: "+10px / pellet",
        cap: { en: "Every pellet *adds* knockback. Point blank = *flying*.", ko: "맞은 알마다 *더* 밀려요. 가까우면 *날아가요*." },
        hit(w, h) {
          const f = w.foe; f.flash = 1; f.ox += 10; f.k = 5; f.sx = 0.85; f.sy = 1.12;
          sparks(w, h.x, h.y, 3, "255,230,160", [100, 400], Math.PI * 0.7, Math.PI * 1.3);
        },
        kill(w, f) { w.fly(f, 700, -420, 16); },
      },
      {
        id: "pump", name: { en: "Pump Reload", ko: "펌프 장전" }, param: "reverse kick + shell",
        cap: { en: "After the shot, kick the gun *the other way*. That's the pump.", ko: "쏜 뒤 총을 *반대로* 툭. 그게 장전감이에요." },
        pump(w) {
          w.gun.kick = -12; w.gun.rot = 0.18;
          const m = muzzle(w);
          w.spawn({ type: "shell", x: m.x - 44, y: m.y, vx: rand(-160, -80), vy: -380, g: 1400, vr: -25, ground: true, bounce: 0.3, life: 4, size: 11, color: "220,38,38", hold: true });
          w.sfx.pump();
        },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "boom / ka-chk",
        cap: { en: "A fat *boom*, then a crisp *ka-chk*.", ko: "묵직한 *쾅*, 뒤에 경쾌한 *철컥*." },
        fire(w) { w.sfx.shotgun(); },
      },
    ],
  },

  {
    id: "twinstick", cat: "weapon", view: "top",
    title: { en: "Top-down guns that *feel alive*", ko: "탑다운 총에 *생기* 넣기" },
    intro: { en: "Bullets go in. Nothing *happens*.", ko: "맞는데 *아무 일*도 없어요." },
    interval: 0.1, stepDur: 3.3,
    drawFloor(w, ctx) {
      ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(14, 14, 512, 332);
      ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 3; ctx.strokeRect(14, 14, 512, 332);
    },
    setup(w) {
      w.hero = w.actor("heroTop", { home: 130, gy: 180 });
      w.foes = [0, 1, 2].map(i => w.actor("foeTop", { home: 470 - i * 25, gy: 75 + i * 105 }));
      w.aim = 0;
    },
    fire(w) {
      const h = w.hero;
      const t = w.foes.filter(f => f.alive).sort((a, b) => Math.hypot(a.x - h.x, a.gy - h.gy) - Math.hypot(b.x - h.x, b.gy - h.gy))[0];
      if (t) w.aim = Math.atan2(t.gy + t.oy - h.gy, t.x + t.ox - h.x);
      h.rot = w.aim;
      const m = { x: h.x + h.ox + Math.cos(w.aim) * 36, y: h.gy + h.oy + Math.sin(w.aim) * 36, a: w.aim };
      const b = { x: m.x, y: m.y, a: w.aim, sp: 1000, r: 4.5, color: "#f1f5f9", box: [16, 16, 524, 344] };
      w.emit("fire", m, b);
      b.vx = Math.cos(b.a) * b.sp; b.vy = Math.sin(b.a) * b.sp;
      b.test = p => w.foes.some(f => {
        if (f.alive && Math.hypot(p.x - f.x - f.ox, p.y - f.gy - f.oy) < f.w / 2) { p.target = f; return true; }
        return false;
      });
      b.onHit = p => { const f = p.target; f.hp -= 5; if (!w.on("knock")) f.ox += 2; w.emit("hit", p, f); if (f.hp <= 0) w.kill(f); };
      b.onOut = p => w.emit("wall", p);
      w.shoot(b);
    },
    update(w, dt) { for (const f of w.foes) if (f.alive) f.x = Math.max(250, f.x - dt * 26); },
    steps: [
      {
        id: "spread", name: { en: "Random Spread", ko: "살짝 흩뿌리기" }, param: "±4°",
        cap: { en: "Perfect aim looks *robotic*. Add a little spread.", ko: "너무 정확하면 *기계* 같아요. 살짝 흩뿌려요." },
        fire(w, m, b) { b.a += rand(-0.07, 0.07); },
      },
      {
        id: "muzzle", name: { en: "Circle-first Flash", ko: "첫 프레임은 원" }, param: "1 frame circle",
        cap: { en: "Draw the bullet as a *big circle* for one frame. Then stretch it.", ko: "첫 한 프레임은 *큰 원*, 그다음 길쭉하게." },
        fire(w, m, b) {
          w.spawn({ type: "circle", x: m.x, y: m.y, size: 13, life: 0.035, color: "255,240,200", add: true });
          w.spawn({ type: "glow", x: m.x, y: m.y, size: 34, size1: 8, life: 0.06, color: "255,200,110" });
          b.len = 24;
        },
      },
      {
        id: "lead", name: { en: "Camera Lead", ko: "카메라가 앞을 봄" }, param: "30px toward aim",
        cap: { en: "Slide the camera *toward where you aim*. Show what matters.", ko: "카메라를 *조준하는 쪽*으로 살짝. 중요한 걸 보여줘요." },
        update(w) { w.cam.tx = Math.cos(w.aim) * 30; w.cam.ty = Math.sin(w.aim) * 30; },
      },
      {
        id: "kick", name: { en: "Camera Kick", ko: "화면 반동" }, param: "4px back / shot",
        cap: { en: "Every shot *nudges* the camera backward.", ko: "쏠 때마다 화면이 뒤로 *톡*." },
        fire(w, m) { w.kick(-Math.cos(m.a) * 4, -Math.sin(m.a) * 4); w.hero.ox -= Math.cos(m.a) * 3; w.hero.oy -= Math.sin(m.a) * 3; },
      },
      {
        id: "shells", name: { en: "Shells Stay", ko: "탄피가 쌓임" }, param: "persist 6s",
        cap: { en: "Casings *stay on the floor*. The fight leaves a trace.", ko: "탄피가 *바닥에 남아요*. 싸운 흔적이 돼요." },
        fire(w, m) {
          const a = m.a + Math.PI / 2 + rand(-0.3, 0.3);
          w.spawn({ type: "shell", under: true, x: m.x - Math.cos(m.a) * 18, y: m.y - Math.sin(m.a) * 18, vx: Math.cos(a) * rand(90, 170), vy: Math.sin(a) * rand(90, 170), vr: rand(-20, 20), floor: 5, life: 6, size: 7, color: "250,204,21", hold: true });
        },
      },
      {
        id: "knock", name: { en: "Push Along Bullet", ko: "총알 방향으로 밀림" }, param: "+6px / hit",
        cap: { en: "Push enemies *the way the bullet was going*.", ko: "총알이 *날아가던 방향*으로 밀어요." },
        hit(w, p, f) { f.ox += Math.cos(p.a) * 6; f.oy += Math.sin(p.a) * 6; f.flash = 1; },
      },
      {
        id: "decals", name: { en: "Impact Marks", ko: "맞은 자국" }, param: "sparks + decals",
        cap: { en: "Sparks off *walls*, marks on the *floor*.", ko: "*벽*엔 불꽃, *바닥*엔 자국." },
        hit(w, p) {
          sparks(w, p.x, p.y, 3, "255,220,170", [80, 260], p.a + Math.PI - 0.8, p.a + Math.PI + 0.8);
          w.spawn({ type: "ellipse", under: true, round: true, x: p.x + rand(-8, 8), y: p.y + rand(-8, 8), size: rand(6, 11), life: 5, color: "236,72,153", alpha: 0.5, hold: true, add: false });
        },
        wall(w, p) {
          sparks(w, p.x, p.y, 4, "255,230,180", [100, 300], p.a + Math.PI - 0.9, p.a + Math.PI + 0.9);
          w.spawn({ type: "ellipse", under: true, round: true, x: p.x, y: p.y, size: 5, life: 4, color: "0,0,0", alpha: 0.7, hold: true, add: false });
        },
        kill(w, f) {
          w.spawn({ type: "ellipse", under: true, round: true, x: f.x + f.ox, y: f.gy + f.oy, size: 34, life: 6, color: "190,24,93", alpha: 0.55, hold: true, add: false });
          sparks(w, f.x + f.ox, f.gy + f.oy, 14, "251,113,133", [150, 420]);
        },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch ±10%",
        cap: { en: "Fast guns need *short* sounds. Vary the pitch or it *drones*.", ko: "연사는 *짧은* 소리로. 음높이를 바꿔야 *안 지겨워요*." },
        fire(w) { w.sfx.smg(rand(0.9, 1.1)); },
        hit(w) { w.sfx.tick(); },
      },
    ],
  },

  {
    id: "bow", cat: "weapon", view: "side",
    title: { en: "Make a bow feel *tense*", ko: "활에 *긴장감* 넣기" },
    intro: { en: "Click. Arrow. *Meh.*", ko: "누르면 화살. *끝.*" },
    interval: 1.4, stepDur: 3.6,
    setup(w) { w.hero = w.actor("hero"); w.foe = w.actor("foe", { home: 440 }); w.bow = { pull: 0, snap: 0 }; w.stuck = []; },
    fire(w) {
      const release = () => {
        const b = bowPt(w), o = { x: b.x + 10, y: b.y, vx: 1100, vy: 0, g: 0, draw: drawArrow };
        o.test = p => { const f = w.foe; return f.alive && p.x >= f.x - f.w / 2 + 14 && p.y > f.gy - f.h; };
        o.onHit = p => { const f = w.foe; if (!f.alive) return; f.hp -= 34; if (!w.on("hit")) f.ox += 8; w.emit("hit", p); if (f.hp <= 0) w.kill(f); };
        w.emit("release", o);
        w.bow.pull = 0;
        w.shoot(o);
      };
      if (w.on("pull")) { w.emit("pull"); w.after(0.55, release); } else release();
    },
    update(w, dt) {
      w.bow.snap -= w.bow.snap * Math.min(1, dt * 14);
      for (const s of w.stuck) s.wob *= Math.pow(0.02, dt);
      if (!w.foe.alive) w.stuck = [];
    },
    drawFront(w, ctx) {
      drawBow(w, ctx);
      const f = w.foe;
      for (const s of w.stuck) drawArrowAt(ctx, f.x + f.ox + s.dx, f.gy + f.oy + s.dy, s.rot + Math.sin(w.time * 45) * s.wob, f.alpha);
    },
    drawHud(w, ctx) { drawBar(ctx, w.foe); },
    steps: [
      {
        id: "pull", name: { en: "Draw Tension", ko: "당기는 시간" }, param: "550ms",
        cap: { en: "Let the player *feel the pull* before the shot.", ko: "쏘기 전에 *당기는 맛*을 줘요." },
        pull(w) { w.tween(w.bow, { pull: 1 }, 0.5, "out"); w.hero.sx = 1.04; w.hero.sy = 0.96; w.sfx.creak(); },
      },
      {
        id: "tremble", name: { en: "Full-draw Tremble", ko: "끝까지 당기면 떨림" }, param: "±1.5px",
        cap: { en: "At full draw, *tremble* a little. Strength has a limit.", ko: "끝까지 당기면 *살짝 떨려요*. 힘을 쓰는 중이니까." },
        update(w) { if (w.bow.pull > 0.85) w.hero.ox = rand(-1.5, 1.5); },
      },
      {
        id: "snap", name: { en: "String Snap", ko: "줄 튕김" }, param: "−14px overshoot",
        cap: { en: "The string *snaps past* center, then settles.", ko: "줄이 *앞으로 튕겼다가* 제자리로." },
        release(w) { w.bow.snap = -14; w.hero.ox -= 4; const b = bowPt(w); w.spawn({ type: "spark", x: b.x, y: b.y, vx: 600, vy: 0, life: 0.08, size: 2, color: "255,255,255" }); },
      },
      {
        id: "arc", name: { en: "Gravity Arc", ko: "포물선" }, param: "g 900 · nose follows",
        cap: { en: "Arrows *arc*, and the tip *follows the curve*.", ko: "화살은 *포물선*으로, 촉은 *곡선을 따라* 숙여요." },
        release(w, o) { o.g = 900; o.vy = -330; o.align = true; },
      },
      {
        id: "trail", name: { en: "Wind Trail", ko: "바람 꼬리" }, param: "thin streak",
        cap: { en: "A thin *streak* shows speed without clutter.", ko: "가는 *줄* 하나로 속도를 보여줘요." },
        update(w) {
          for (const p of w.shots) if (p.draw === drawArrow) {
            const a = p.align ? Math.atan2(p.vy, p.vx) : 0;
            w.spawn({ type: "spark", x: p.x - Math.cos(a) * 50, y: p.y - Math.sin(a) * 50, vx: -p.vx * 0.05, vy: -p.vy * 0.05, life: 0.18, size: 1.4, color: "255,255,255" });
          }
        },
      },
      {
        id: "stick", name: { en: "Arrow Sticks", ko: "꽂혀서 흔들림" }, param: "wobble decay",
        cap: { en: "The arrow *stays stuck* and *wobbles*. Proof it hit.", ko: "화살이 *꽂힌 채* *흔들려요*. 맞았다는 증거." },
        hit(w, p) { const f = w.foe; w.stuck.push({ dx: p.x - f.x - f.ox + 6, dy: p.y - f.gy - f.oy, rot: p.align ? Math.atan2(p.vy, p.vx) : 0, wob: 0.28 }); },
      },
      {
        id: "hit", name: { en: "Thunk Reaction", ko: "퍽 반응" }, param: "flash · feathers",
        cap: { en: "Flash, *flinch*, and a puff of *feathers*.", ko: "번쩍, *움찔*, 깃털이 *퐁*." },
        hit(w, p) {
          const f = w.foe; f.flash = 1; f.ox += 12; f.sx = 0.86; f.sy = 1.1;
          for (let i = 0; i < 5; i++) w.spawn({ type: "chunk", x: p.x, y: p.y, vx: rand(-160, 40), vy: rand(-220, -60), g: 300, drag: 3, vr: rand(-12, 12), life: rand(0.5, 0.9), size: 4, color: "251,113,133" });
        },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "creak / twang / thunk",
        cap: { en: "*Creak* on draw, *twang* on release, *thunk* on hit.", ko: "당길 때 *끼익*, 놓을 때 *팅*, 맞을 때 *퍽*." },
        release(w) { w.sfx.twang(); },
        hit(w) { w.sfx.thunk(); },
      },
    ],
  },

  {
    id: "hammer", cat: "combat", view: "side",
    title: { en: "Make a hammer *HEAVY*", ko: "망치를 *무겁게*" },
    intro: { en: "It's a hammer. It feels like a *pillow*.", ko: "망치인데 *베개* 같아요." },
    interval: 1.7, stepDur: 3.6,
    setup(w) { w.hero = w.actor("hero", { home: 170 }); w.foe = w.actor("foe", { home: 390 }); w.ham = { rot: -0.5 }; },
    fire(w) {
      if (w.busy) return;
      w.busy = true;
      const swing = () => w.tween(w.ham, { rot: 2.19 }, 0.07, "in", () => {
        const at = { x: hammerPivot(w).x + 97, y: G };
        w.emit("slam", at);
        const f = w.foe;
        if (f.alive) { f.hp -= 34; if (!w.on("wave")) f.ox += 10; w.emit("hit", at); if (f.hp <= 0) w.kill(f); }
        w.after(0.28, () => w.tween(w.ham, { rot: -0.5 }, 0.35, "inout", () => { w.busy = false; }));
      });
      if (w.on("antic")) { w.emit("antic"); w.after(0.3, swing); } else swing();
    },
    drawFront(w, ctx) { drawHammer(w, ctx); },
    drawHud(w, ctx) { drawBar(ctx, w.foe); },
    steps: [
      {
        id: "antic", name: { en: "Long Wind-up", ko: "길게 들어 올리기" }, param: "260ms back",
        cap: { en: "Heavy = *slow up*, *fast down*.", ko: "무거우면 *천천히 올리고*, *빠르게 내려요*." },
        antic(w) { w.tween(w.ham, { rot: -1.4 }, 0.26, "out"); w.hero.sx = 1.1; w.hero.sy = 0.88; },
      },
      {
        id: "smear", name: { en: "Smear Frame", ko: "잔상 한 장" }, param: "140ms arc",
        cap: { en: "One *smeared* frame sells the speed.", ko: "*뭉개진* 한 장이 속도를 말해줘요." },
        slam(w) { const p = hammerPivot(w); w.spawn({ type: "arc", under: true, x: p.x, y: p.y, size: 128, life: 0.14, a0: -2.2, a1: 0.65, alpha: 0.75, color: "255,255,255" }); },
      },
      {
        id: "stop", name: { en: "Heavy Hit Stop", ko: "묵직한 멈춤" }, param: "150ms + target shake",
        cap: { en: "Freeze *longer* for heavy hits. The target *trembles*, fading out.", ko: "무거울수록 *오래* 멈춰요. 맞은 쪽은 *떨리다가* 잦아들어요." },
        hit(w) { w.hitstop(0.15); const f = w.foe; f.vib = 9; f.vibAxis = "x"; f.flash = 1; },
      },
      {
        id: "wave", name: { en: "Ground Shockwave", ko: "땅 충격파" }, param: "ring + dust + cracks",
        cap: { en: "The *ground* reacts: a ring, dust, and *cracks*.", ko: "*땅*이 반응해요. 고리, 먼지, *금*." },
        slam(w, at) {
          w.spawn({ type: "ring", flat: true, x: at.x, y: G, size: 10, size1: 170, life: 0.4, w: 8, color: "255,240,210" });
          for (let i = 0; i < 12; i++) { const d = i % 2 ? 1 : -1; w.spawn({ type: "smoke", x: at.x, y: G - 6, vx: d * rand(120, 320), vy: rand(-40, -5), drag: 2.5, size: rand(6, 10), size1: rand(20, 30), life: rand(0.5, 0.8), color: "200,195,185" }); }
          const pts = [[0, 0]]; let x = 0; for (let i = 0; i < 5; i++) { x += rand(10, 22) * (i % 2 ? 1 : -1) * 2; pts.push([x, rand(-2, 3)]); }
          w.spawn({ type: "crack", under: true, x: at.x, y: G + 1, pts, w: 2.5, life: 4, color: "0,0,0", hold: true, add: false });
        },
        hit(w) { const f = w.foe; f.ox += 30; f.sx = 0.82; f.sy = 1.15; },
        kill(w, f) { w.fly(f, 260, -900, 8); },
      },
      {
        id: "zoom", name: { en: "Zoom Punch", ko: "줌 펀치" }, param: "+7% → back",
        cap: { en: "Punch the camera *in* for an instant.", ko: "카메라를 순간 *확 당겨요*." },
        slam(w) { w.zoomPunch(0.07); },
      },
      {
        id: "shake", name: { en: "Vertical Shake", ko: "세로 흔들림" }, param: "kick 14px down",
        cap: { en: "Hits from above shake the screen *up and down*.", ko: "위에서 내리치면 화면도 *위아래로*." },
        slam(w) { w.shake(0.45); w.kick(0, 14); },
      },
      {
        id: "rocks", name: { en: "Flying Rocks", ko: "튀는 돌" }, param: "10 chunks",
        cap: { en: "Throw some *rocks*. Let gravity do the rest.", ko: "*돌 조각*을 튀기고, 나머진 중력에 맡겨요." },
        slam(w, at) { for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: at.x + rand(-10, 10), y: G - 4, vx: rand(-300, 300), vy: rand(-650, -300), g: 1700, ground: true, bounce: 0.35, vr: rand(-20, 20), life: rand(1.4, 2.2), size: rand(4, 8), color: pick(["120,113,108", "87,83,78", "168,162,158"]), hold: true }); },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "low boom + crack",
        cap: { en: "Low *boom*, a sharp *crack*, then a short *rumble*.", ko: "낮은 *쿵*, 날카로운 *빡*, 짧은 *울림*." },
        slam(w) { w.sfx.slam(); },
      },
    ],
  },

  {
    id: "death", cat: "combat", view: "side",
    title: { en: "Make enemies die *satisfyingly*", ko: "적이 *시원하게* 죽게" },
    intro: { en: "Dead? It just *blinked out*.", ko: "죽은 건가? 그냥 *사라졌어요*." },
    interval: 1.25, stepDur: 3.4,
    setup(w) { w.hero = w.actor("hero"); w.foe = w.actor("foe", { home: 400, hp: 1 }); w.gun = { kick: 0, rot: 0 }; },
    fire(w) {
      const m = muzzle(w); w.gun.kick = 10;
      w.spawn({ type: "glow", x: m.x + 8, y: m.y, size: 30, size1: 6, life: 0.06, color: "255,210,120" });
      w.shoot({ x: m.x, y: m.y, vx: 1700, vy: 0, len: 50, hitX: w.foe.x - 60, onHit: () => { const f = w.foe; if (f.alive) { f.hp = 0; w.kill(f); } } });
    },
    update(w, dt) { gunSpring(w, dt); },
    drawFront(w, ctx) { drawGun(w, ctx); },
    steps: [
      {
        id: "flash", name: { en: "White Frame", ko: "하얀 한 프레임" }, param: "1–2 frames",
        cap: { en: "The last frame alive is *pure white*.", ko: "살아 있는 마지막 프레임은 *새하얗게*." },
        kill(w, f) { f.flash = 1.5; f.keep = true; w.after(0.05, () => { if (!w.on("pop")) { f.alpha = 0; f.keep = false; } }); },
      },
      {
        id: "freeze", name: { en: "Freeze + Tremble", ko: "멈칫 + 떨림" }, param: "100ms",
        cap: { en: "Freeze on the kill. The body *trembles*.", ko: "처치 순간 멈추고, 몸이 *부르르*." },
        kill(w, f) { w.hitstop(0.1); f.vib = 8; },
      },
      {
        id: "pop", name: { en: "Pop", ko: "부풀었다 터짐" }, param: "1.3× → gone",
        cap: { en: "Swell *bigger* for a beat, then *pop*.", ko: "한순간 *부풀었다가* *팡*." },
        kill(w, f) { f.keep = true; f.alpha = 1; f.sx = 1.3; f.sy = 1.3; w.after(0.07, () => { f.alpha = 0; f.keep = false; }); },
      },
      {
        id: "burst", name: { en: "Burst Into Pieces", ko: "조각으로 흩어짐" }, param: "14 chunks",
        cap: { en: "Break into *pieces* the same color as the enemy.", ko: "적과 *같은 색* 조각으로 흩어져요." },
        kill(w, f) {
          w.spawn({ type: "glow", x: f.x, y: f.gy - f.h / 2, size: 90, size1: 20, life: 0.2, color: "251,113,133" });
          for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: f.x + rand(-40, 40), y: f.gy - rand(10, f.h), vx: rand(-320, 420), vy: rand(-620, -200), g: 1600, ground: true, bounce: 0.3, vr: rand(-20, 20), life: rand(0.8, 1.2), size: rand(5, 10), color: pick(["251,113,133", "244,63,94", "15,23,42"]), hold: true });
        },
      },
      {
        id: "ring", name: { en: "Shock Ring", ko: "충격 고리" }, param: "r 110 · 300ms",
        cap: { en: "A quick *ring* marks the exact spot.", ko: "짧은 *고리*가 그 자리를 찍어줘요." },
        kill(w, f) { w.spawn({ type: "ring", x: f.x, y: f.gy - f.h / 2, size: 10, size1: 110, life: 0.3, w: 9, color: "255,240,240" }); },
      },
      {
        id: "remains", name: { en: "Leave a Mark", ko: "흔적 남기기" }, param: "decal 6s",
        cap: { en: "Leave a *stain*. The world should remember.", ko: "*얼룩*을 남겨요. 세상이 기억하게." },
        kill(w, f) { w.spawn({ type: "ellipse", under: true, x: f.x, y: G + 2, size: 90, life: 6, color: "159,18,57", alpha: 0.55, hold: true, add: false }); },
      },
      {
        id: "loot", name: { en: "Loot Pop", ko: "보상 튀어나옴" }, param: "3 coins · bounce",
        cap: { en: "Reward *pops out* and bounces. Death = *payday*.", ko: "보상이 *튀어나와* 통통. 처치 = *월급날*." },
        kill(w, f) {
          for (let i = 0; i < 3; i++) w.spawn({ type: "ghost", img: SPR.coin.c, top: true, w: 24, h: 24, alpha0: 1, add: false, x: f.x, y: f.gy - f.h / 2, vx: rand(-200, 120), vy: rand(-620, -420), g: 1500, gy: G - 10, ground: true, bounce: 0.5, life: 2.2, hold: true });
        },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "pop + squish",
        cap: { en: "A bright *pop* on top of a wet *squish*.", ko: "말랑한 *뿌직* 위에 경쾌한 *팡*." },
        kill(w) { w.sfx.pop(); },
      },
    ],
  },

  {
    id: "jump", cat: "move", view: "side", polished: true, hookDur: 2.6,
    title: { en: "Make jumping feel *fair*", ko: "점프가 *억울하지 않게*" },
    intro: { en: "Pressed jump. Fell anyway. *Rage.*", ko: "분명 눌렀는데 떨어졌다. *억울.*" },
    interval: 2.8, stepDur: 3.4,
    // 발판 두 개 + 가운데 낭떠러지 (화면 안에 다 들어오게)
    plats: [[104, 244], [320, 452]],
    drawFloor(w, ctx) {
      const P = w.R.plats;
      // 낭떠러지: 바닥 아래로 갈수록 어두워지는 계단
      for (let i = 0; i < 6; i++) { ctx.fillStyle = ["#121624", "#0e111c", "#0b0d16", "#080a11", "#06070c", "#040508"][i]; ctx.fillRect(P[0][1], G + i * 16 - 2, P[1][0] - P[0][1], 18); }
      for (const [a, b] of P) {
        // 돌 블록 발판: 윗면 밝은 줄, 벽돌 줄눈, 아래 어두운 그림자
        ctx.fillStyle = "#2a2f42"; ctx.fillRect(a, G, b - a, 96);
        ctx.fillStyle = "#3d4560"; ctx.fillRect(a, G, b - a, 8);
        ctx.fillStyle = "#6a7596"; ctx.fillRect(a, G, b - a, 3);
        ctx.fillStyle = "#1a1e2c";
        for (let y = G + 8, r = 0; y < G + 96; y += 16, r++) { ctx.fillRect(a, y, b - a, 2); for (let x = a + (r % 2 ? 14 : 0); x < b; x += 28) ctx.fillRect(x, y, 2, 16); }
        ctx.fillStyle = "#4b5577"; ctx.fillRect(a, G, 3, 96); ctx.fillStyle = "#151926"; ctx.fillRect(b - 3, G, 3, 96);
      }
      if (w.on("coyote")) {
        ctx.fillStyle = "rgba(198,244,50,0.22)"; ctx.fillRect(P[0][1], G - 64, 20, 64);
        ctx.fillStyle = "rgba(198,244,50,0.9)"; ctx.fillRect(P[0][1], G - 64, 20, 2);
        ctx.font = "700 11px Galmuri11, Galmuri, monospace"; ctx.fillStyle = "#c6f432"; ctx.textAlign = "center";
        ctx.fillText("GRACE", P[0][1] + 10, G - 72);
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (const t of w.trail) ctx.fillRect(Math.round(t[0]) - 2, Math.round(t[1]) - 2, 4, 4);
    },
    setup(w) { w.hero = w.actor("hero", { h: 92, home: 126 }); w.J = { state: "idle" }; w.trail = []; w.cam.y = w.cam.ty = 46; },
    fire(w) {
      const h = w.hero; h.alpha = 1; h.x = 126; h.oy = 0; w.trail = [];
      w.J = { state: "run", vx: 210, vy: 0, air: false, lastGround: w.time, grace: 0, bufWin: 0, gMul: 1, pressed: false, jumped: false, bufPressed: false, buf: -9, done: false };
    },
    update(w, dt) {
      const h = w.hero, J = w.J, P = w.R.plats;
      if (J.state !== "run") return;
      h.x += J.vx * dt;
      const over = (h.x >= P[0][0] && h.x <= P[0][1]) || (h.x >= P[1][0] && h.x <= P[1][1]);
      if (!J.air) { if (over) J.lastGround = w.time; else { J.air = true; J.vy = 0; } }
      const jump = v => { J.air = true; J.vy = v; J.jumped = true; w.emit("jump", h); };
      if (!J.pressed && h.x >= P[0][1] + 10) {
        J.pressed = true;
        w.spawn({ type: "text", text: "JUMP", x: h.x, y: G + 34, life: 0.7, size: 14, color: "#c6f432" });
        if (!J.air || w.time - J.lastGround <= J.grace) jump(-700);
      }
      if (J.air) {
        const prev = h.oy;
        J.vy += 2200 * J.gMul * dt; h.oy += J.vy * dt;
        if (J.jumped) w.trail.push([h.x, G + h.oy - h.h / 2]);
        if (J.jumped && !J.bufPressed && J.vy > 0 && h.oy > -70 && h.x > P[1][0]) {
          J.bufPressed = true; J.buf = w.time;
          w.spawn({ type: "text", text: "JUMP", x: h.x, y: G + 34, life: 0.7, size: 14, color: "#c6f432" });
        }
        if (prev < 0 && h.oy >= 0 && over) {
          h.oy = 0; const v = J.vy; J.air = false; J.vy = 0; J.vx = 0;
          w.emit("land", h, v);
          if (w.time - J.buf <= J.bufWin) { J.buf = -9; jump(-560); }
          else if (!J.done) { J.done = true; w.after(0.7, () => { w.tween(h, { alpha: 0 }, 0.25); J.state = "idle"; }); }
        }
        if (h.oy > 320) { J.state = "idle"; h.alpha = 0; }
      }
    },
    steps: [
      {
        id: "coyote", name: { en: "Coyote Time", ko: "코요테 타임" }, param: "100ms grace",
        cap: { en: "Let players jump a moment *after* leaving the ledge.", ko: "발판을 *벗어난 직후*에도 잠깐은 점프되게." },
        update(w) { w.J.grace = 0.1; },
      },
      {
        id: "buffer", name: { en: "Jump Buffer", ko: "점프 선입력" }, param: "150ms",
        cap: { en: "Pressed a bit *early*? Jump on the *landing frame*.", ko: "*조금 일찍* 눌러도 *착지하는 순간* 점프." },
        update(w) { w.J.bufWin = 0.15; },
      },
      {
        id: "squash", name: { en: "Squash & Stretch", ko: "늘었다 줄었다" }, param: "1.3 / 0.7",
        cap: { en: "*Stretch* on takeoff, *squash* on landing.", ko: "뛸 때 *늘어나고*, 내릴 때 *찌그러져요*." },
        jump(w, h) { h.sx = 0.75; h.sy = 1.3; },
        land(w, h) { h.sx = 1.3; h.sy = 0.7; },
      },
      {
        id: "apex", name: { en: "Apex Hang", ko: "꼭대기에서 머묾" }, param: "½ gravity at peak",
        cap: { en: "Halve gravity *near the peak*. More time to aim the landing.", ko: "*꼭대기 근처*에선 중력 절반. 착지 지점을 고를 시간." },
        update(w) { const J = w.J; J.gMul = J.air && Math.abs(J.vy) < 160 ? 0.5 : 1; },
      },
      {
        id: "dust", name: { en: "Dust Puffs", ko: "먼지" }, param: "takeoff + landing",
        cap: { en: "A puff of *dust* on takeoff and on landing.", ko: "뛸 때, 내릴 때 *먼지* 한 줌." },
        jump(w, h) { dust(w, h.x, G, 5, 0, "120,128,150"); },
        land(w, h) { dust(w, h.x, G, 9, 0, "120,128,150"); },
      },
      {
        id: "land", name: { en: "Landing Weight", ko: "착지 무게" }, param: "kick ∝ fall speed",
        cap: { en: "Land *harder* from higher. The camera *dips* with you.", ko: "*높이* 떨어질수록 세게. 화면도 같이 *꿀렁*." },
        land(w, h, v) { w.kick(0, v / 200); w.shake(Math.min(0.3, v / 4000), 0); w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 10, size1: 70, life: 0.28, w: 5, color: "220,230,255" });
          for (let i = 0; i < 5; i++) { const sz = rand(1.5, 3), rot = rand(0, 6); w.spawn({ x: h.x + rand(-14, 14), y: G - 3, vx: rand(-200, 200), vy: rand(-280, -120), g: 1300, ground: true, bounce: 0.3, life: rand(0.5, 0.8), vr: rand(-12, 12), draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, "#6a7596", "#2a2f42") }); } },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "boing / tup",
        cap: { en: "A rising *boing* up, a soft *tup* down.", ko: "올라갈 땐 *뾱*, 내릴 땐 *툭*." },
        jump(w) { w.sfx.jump(); },
        land(w) { w.sfx.land(); },
      },
    ],
  },

  {
    id: "dash", cat: "move", view: "side",
    title: { en: "Make a dash feel *fast*", ko: "대시가 *빨라* 보이게" },
    intro: { en: "It moved. Did it feel *fast*?", ko: "움직이긴 했는데 *빨라* 보여요?" },
    interval: 1.55, stepDur: 3.3,
    setup(w) { w.hero = w.actor("hero", { h: 110, home: 100 }); },
    fire(w) {
      if (w.busy) return;
      w.busy = true;
      const h = w.hero;
      w.emit("start", h);
      h.dashing = true;
      w.tween(h, { x: 430 }, 0.16, "out", () => {
        h.dashing = false; w.emit("end", h);
        w.after(0.45, () => w.tween(h, { x: h.home }, 0.5, "inout", () => { w.busy = false; }));
      });
    },
    update(w, dt) { if (w.hero.dashing) w.emit("dashing", w.hero, dt); },
    steps: [
      {
        id: "freeze", name: { en: "Start Freeze", ko: "출발 전 정지" }, param: "60ms",
        cap: { en: "Freeze for a *split second* before the dash. Contrast = speed.", ko: "출발 직전 *아주 잠깐* 멈춰요. 대비가 곧 속도." },
        start(w, h) { w.hitstop(0.06); h.flash = 0.8; },
      },
      {
        id: "stretch", name: { en: "Stretch", ko: "늘어남" }, param: "1.5 × 0.7",
        cap: { en: "*Stretch* along the direction of motion.", ko: "움직이는 *방향으로 늘려요*." },
        start(w, h) { h.sx = 1.5; h.sy = 0.7; },
        dashing(w, h) { h.sx = Math.max(h.sx, 1.35); h.sy = Math.min(h.sy, 0.78); },
      },
      {
        id: "ghosts", name: { en: "Afterimages", ko: "잔상" }, param: "every frame · 250ms",
        cap: { en: "Leave *afterimages* behind. The eye reads the path.", ko: "*잔상*을 남겨요. 눈이 경로를 읽어요." },
        dashing(w, h) { w.spawn({ type: "ghost", img: h.s.cyan, x: h.x + h.ox, y: h.gy + h.oy, w: h.w, h: h.h, sx: h.sx, sy: h.sy, life: 0.25, alpha0: 0.55, add: false }); },
      },
      {
        id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "3 / frame",
        cap: { en: "Thin *speed lines* rushing past.", ko: "가는 *속도선*이 스쳐 지나가요." },
        dashing(w, h) { for (let i = 0; i < 3; i++) w.spawn({ type: "spark", x: h.x + rand(-20, 80), y: h.gy - rand(8, h.h), vx: -rand(900, 1500), vy: 0, life: 0.12, size: 2, color: "255,255,255" }); },
      },
      {
        id: "burst", name: { en: "Launch Burst", ko: "출발 폭발" }, param: "ring + dust",
        cap: { en: "Kick off with a *burst* at the start point.", ko: "출발점에서 *팡* 하고 튀어 나가요." },
        start(w, h) { w.spawn({ type: "ring", flat: true, x: h.x, y: G, size: 8, size1: 70, life: 0.25, w: 5, color: "255,255,255" }); dust(w, h.x, G, 6, -1); },
      },
      {
        id: "kick", name: { en: "Directional Kick", ko: "방향 반동" }, param: "10px forward",
        cap: { en: "The camera *lurches* the way you go.", ko: "화면이 가는 *방향으로 쏠려요*." },
        start(w) { w.kick(10, 0); w.shake(0.08); },
      },
      {
        id: "skid", name: { en: "Skid Stop", ko: "미끄러지며 멈춤" }, param: "dust spray + lean",
        cap: { en: "Don't just stop. *Skid* and spray dust.", ko: "그냥 서지 말고 *끼익* 미끄러지며 먼지." },
        end(w, h) { h.sx = 0.82; h.sy = 1.15; dust(w, h.x + 40, G, 8, 1); },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh / skrr",
        cap: { en: "A rising *whoosh*, then a short *skrr*.", ko: "올라가는 *휙*, 짧은 *끼익*." },
        start(w) { w.sfx.dash(); },
        end(w) { w.sfx.skid(); },
      },
    ],
  },

  {
    id: "speed", cat: "move", view: "3d",
    title: { en: "Sell *speed* in 3D", ko: "3D에서 *속도감* 내기" },
    intro: { en: "Speed doubled. Screen looks *the same*.", ko: "속도는 두 배. 화면은 *그대로*." },
    interval: 2.4, stepDur: 3.6,
    setup(w) { w.S = { speed: 1, vis: 1, boostT: 0, fov: 1, fovT: 1, dist: 0, tunnel: 0, streak: false, poles: [...Array(10)].map((_, i) => ({ z: 1.5 + i * 4, side: i % 2 ? 1 : -1 })) }; },
    fire(w) { w.S.boostT = 1.3; w.emit("boost", w.S); },
    update(w, dt) {
      const S = w.S;
      S.boostT = Math.max(0, S.boostT - dt);
      S.speed += ((S.boostT > 0 ? 2.6 : 1) - S.speed) * Math.min(1, dt * 4);
      const v = 14 * S.vis; S.vis = 1;
      S.dist += v * dt;
      for (const p of S.poles) { p.z -= v * dt; if (p.z < 0.6) p.z += 40; }
      S.fov += (S.fovT - S.fov) * Math.min(1, dt * 5); S.fovT = 1;
      S.streak = false;
    },
    drawFloor(w, ctx) {
      const S = w.S, hy = 120, f = 230 * S.fov, ch = 1.25;
      const P = (x, z) => ({ x: 270 + x * f / z, y: hy + ch * f / z });
      const sky = ctx.createLinearGradient(0, -40, 0, hy); sky.addColorStop(0, "#0d1020"); sky.addColorStop(1, "#1e2238");
      ctx.fillStyle = sky; ctx.fillRect(-60, -60, 660, hy + 60);
      ctx.fillStyle = "#15161b"; ctx.fillRect(-60, hy, 660, 400);
      const a = P(-2.4, 0.5), b = P(2.4, 0.5), c = P(2.4, 60), d = P(-2.4, 60);
      ctx.fillStyle = "#24262e"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (let k = 0; k < 14; k++) {
        const z0 = 0.8 + ((k * 3 - S.dist) % 42 + 42) % 42, z1 = z0 + 1.3;
        const p0 = P(-0.07, z0), p1 = P(0.07, z0), p2 = P(0.07, z1), p3 = P(-0.07, z1);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath(); ctx.fill();
      }
      for (const p of [...S.poles].sort((a, b) => b.z - a.z)) {
        const base = P(p.side * 3.2, p.z), top = P(p.side * 3.2, p.z), hgt = 2.4 * f / p.z;
        const wd = Math.max(1.5, 0.18 * f / p.z);
        if (S.streak) {
          const back = P(p.side * 3.2, p.z + 2.5);
          ctx.fillStyle = "rgba(198,244,50,0.18)"; ctx.beginPath(); ctx.moveTo(back.x, back.y - 2.4 * f / (p.z + 2.5)); ctx.lineTo(top.x, top.y - hgt); ctx.lineTo(base.x, base.y); ctx.lineTo(back.x, back.y); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "#c6f432"; ctx.fillRect(base.x - wd / 2, base.y - hgt, wd, hgt);
      }
      // 차
      const sq = 1 + (S.speed - 1) * 0.04;
      ctx.save(); ctx.translate(270, 312); ctx.scale(sq, 1 / sq);
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(0, 14, 70, 10, 0, 0, TAU); ctx.fill();
      rr(ctx, -64, -34, 128, 46, 14, "#d5dbe6", null);
      rr(ctx, -40, -54, 80, 26, 10, "#0b0e14", null); ctx.fillStyle = "#c6f432"; ctx.fillRect(-26, -44, 52, 5);
      ctx.fillStyle = S.boostT > 0 ? "#ef4444" : "#7f1d1d"; ctx.fillRect(-56, -16, 22, 9); ctx.fillRect(34, -16, 22, 9);
      ctx.restore();
      ctx.font = "700 14px 'JetBrains Mono', monospace"; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.textAlign = "left";
      ctx.fillText(`${Math.round(S.speed * 120)} KM/H`, 26, 60);
    },
    drawHud(w, ctx) {
      const S = w.S;
      if (S.tunnel > 0.01) {
        const g = ctx.createRadialGradient(270, 180, 90, 270, 180, 330);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${S.tunnel * 0.85})`);
        ctx.fillStyle = g; ctx.fillRect(-40, -40, 620, 440);
      }
    },
    steps: [
      {
        id: "stripes", name: { en: "Ground Rushes By", ko: "땅이 빨리 지나감" }, param: "scroll × speed",
        cap: { en: "The ground must *move faster*, not just the number.", ko: "숫자 말고 *땅이 빨라져야* 해요." },
        update(w) { w.S.vis = w.S.speed; },
      },
      {
        id: "fov", name: { en: "FOV Kick", ko: "시야각 확장" }, param: "+25% wide",
        cap: { en: "Widen the *field of view* on boost. The world stretches.", ko: "부스트 땐 *시야각을 넓혀요*. 세상이 쭉 늘어나요." },
        update(w) { if (w.S.boostT > 0) w.S.fovT = 0.75; },
      },
      {
        id: "lines", name: { en: "Speed Lines", ko: "방사형 속도선" }, param: "from vanishing point",
        cap: { en: "Lines *bursting out* from the vanishing point.", ko: "소실점에서 *뻗어 나오는* 선." },
        update(w) {
          if (w.S.boostT <= 0) return;
          for (let i = 0; i < 2; i++) { const a = rand(0, TAU), r = rand(60, 120); w.spawn({ type: "spark", x: 270 + Math.cos(a) * r, y: 120 + Math.sin(a) * r * 0.6, vx: Math.cos(a) * 900, vy: Math.sin(a) * 540, life: 0.3, size: 1.6, color: "255,255,255" }); }
        },
      },
      {
        id: "shake", name: { en: "Rumble", ko: "진동" }, param: "constant low",
        cap: { en: "A *constant low rumble* while boosting.", ko: "부스트 동안 *낮게 계속* 떨려요." },
        update(w) { if (w.S.boostT > 0) w.trauma = Math.max(w.trauma, 0.22); },
      },
      {
        id: "streaks", name: { en: "Motion Streaks", ko: "잔상 줄" }, param: "poles smear",
        cap: { en: "Nearby objects *smear* into streaks.", ko: "가까운 물체가 *길게 번져요*." },
        update(w) { w.S.streak = w.S.boostT > 0; },
      },
      {
        id: "tunnel", name: { en: "Tunnel Vision", ko: "터널 시야" }, param: "dark edges .85",
        cap: { en: "Darken the edges. *Focus* pulls to the center.", ko: "가장자리를 어둡게. 시선이 *가운데로* 몰려요." },
        update(w, dt) { const S = w.S; S.tunnel += ((S.boostT > 0 ? 1 : 0) - S.tunnel) * Math.min(1, dt * 4); },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising roar",
        cap: { en: "A *rising roar* sells the push.", ko: "*올라가는 굉음*이 밀어주는 느낌을 줘요." },
        boost(w) { w.sfx.boost(); },
      },
    ],
  },

  {
    id: "rpg", cat: "rpg", view: "side",
    title: { en: "Make RPG hits *land*", ko: "RPG 공격이 *꽂히게*" },
    intro: { en: "Attack. A bar gets shorter. *That's it.*", ko: "공격. 바가 줄어든다. *끝.*" },
    interval: 1.45, stepDur: 3.6,
    setup(w) { w.hero = w.actor("hero", { home: 110, h: 120 }); w.foe = w.actor("foe", { home: 410, h: 170, hp: 300 }); w.turn = 0; },
    fire(w) {
      if (w.busy) return;
      w.busy = true; w.turn++;
      const crit = w.turn % 3 === 0;
      const hit = () => {
        const f = w.foe, d = crit ? 96 : 40;
        f.hp = Math.max(0, f.hp - d);
        w.emit("hit", { x: f.x - 20, y: f.gy - f.h / 2 }, d, crit);
        if (f.hp <= 0) w.after(0.7, () => { f.hp = f.maxHp; f.hpLag = f.maxHp; });
      };
      if (w.on("step")) w.emit("step", hit);
      else { const h = w.hero; h.x = h.home + 60; hit(); w.foe.ox += 10; w.after(0.4, () => { h.x = h.home; w.busy = false; }); }
    },
    update(w) { if (!w.on("bar")) w.foe.hpLag = w.foe.hp; },
    drawHud(w, ctx) { drawBigBar(ctx, w.foe, w.on("bar")); },
    steps: [
      {
        id: "step", name: { en: "Step In", ko: "다가가서 때리기" }, param: "lunge 180px",
        cap: { en: "*Move* to attack. Distance makes the hit *readable*.", ko: "*다가가서* 때려요. 거리가 있어야 *읽혀요*." },
        step(w, hit) { const h = w.hero; w.tween(h, { x: 290 }, 0.17, "in", () => { hit(); w.after(0.15, () => w.tween(h, { x: h.home }, 0.3, "inout", () => { w.busy = false; })); }); },
      },
      {
        id: "slash", name: { en: "Slash Marks", ko: "베기 자국" }, param: "2 crossing streaks",
        cap: { en: "Two *crossing streaks* right on the target.", ko: "대상 위에 *엇갈린 두 줄*." },
        hit(w, at) {
          w.spawn({ type: "slash", x: at.x + 20, y: at.y, ang: -0.7, len: 70, size: 9, life: 0.22, color: "255,255,255" });
          w.after(0.05, () => w.spawn({ type: "slash", x: at.x + 20, y: at.y, ang: 0.7, len: 70, size: 9, life: 0.22, color: "255,255,255" }));
        },
      },
      {
        id: "number", name: { en: "Big Damage Number", ko: "큼직한 숫자" }, param: "pop + bounce",
        cap: { en: "Numbers *pop big*, then *bounce* and fade.", ko: "숫자는 *크게 튀고*, *통통* 사라지게." },
        hit(w, at, d, crit) { w.spawn({ type: "text", text: String(d), x: at.x + rand(-10, 10), y: at.y - 40, vx: rand(-30, 30), vy: -320, g: 900, life: 1, size: crit ? 64 : 42, color: crit ? "#fde047" : "#ffffff" }); },
      },
      {
        id: "shake", name: { en: "Target Shake", ko: "대상 떨림" }, param: "10px · fades 300ms",
        cap: { en: "Shake *the target*, not the screen. Big, then smaller.", ko: "화면 말고 *맞은 쪽*을 흔들어요. 크게 시작해서 작게." },
        hit(w) { const f = w.foe; f.vib = 10; f.vibFade = 33; f.flash = 1; },
      },
      {
        id: "bar", name: { en: "HP Drain", ko: "체력 깎이는 모습" }, param: "lag 400ms",
        cap: { en: "Red drops now, yellow *drains after*. You see the chunk.", ko: "빨강은 바로, 노랑은 *뒤따라*. 깎인 덩어리가 보여요." },
        hit(w) { w.foe.lagWait = 0.4; w.foe.barShake = 0.25; },
        update(w, dt) { lagBar(w.foe, dt); },
      },
      {
        id: "crit", name: { en: "Critical!", ko: "치명타!" }, param: "every 3rd hit",
        cap: { en: "Crits get *everything*: flash, zoom, shake, *words*.", ko: "치명타엔 *전부*: 번쩍, 줌, 흔들림, *글자*까지." },
        hit(w, at, d, crit) {
          if (!crit) return;
          w.flash("255,255,255", 0.55); w.zoomPunch(0.08); w.shake(0.35);
          w.spawn({ type: "text", text: "CRITICAL", x: 270, y: 60, vy: -20, life: 0.9, size: 46, color: "#c6f432" });
          w.spawn({ type: "rays", x: at.x + 20, y: at.y, size: 160, n: 12, vr: 2, life: 0.5, color: "255,240,180" });
        },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "slash / crit",
        cap: { en: "Crits get their *own sound*. Never reuse the normal one.", ko: "치명타는 *전용 소리*. 일반 타격음 재활용 금지." },
        hit(w, at, d, crit) { if (crit) w.sfx.crit(); else w.sfx.slashHit(); },
      },
    ],
  },

  {
    id: "levelup", cat: "rpg", view: "side",
    title: { en: "Make level-ups feel *earned*", ko: "레벨업을 *보상*답게" },
    intro: { en: "Level up. Did you even *notice*?", ko: "레벨업. *눈치*나 챘을까요?" },
    interval: 1.05, stepDur: 3.8,
    setup(w) { w.hero = w.actor("hero", { home: 270, h: 120 }); w.xp = { v: 60, shown: 60, lv: 4, flash: 0, over: false }; },
    fire(w) { w.emit("gain", 50); if (!w.on("orbs")) addXp(w, 50); },
    update(w, dt) {
      const x = w.xp;
      if (x.lv0 !== x.lv) { if (x.lv0 && !w.on("text")) w.hero.oy = -30; x.lv0 = x.lv; } if (!w.on("fill")) { x.shown = x.v; x.over = false; } x.flash = Math.max(0, x.flash - dt * 3); },
    drawHud(w, ctx) {
      const x = w.xp, X = 80, Y = 322, W = 380, H = 12;
      ctx.font = "800 18px 'JetBrains Mono', monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#c6f432";
      ctx.fillText("LV " + x.lv, X - 60, Y + 13);
      ctx.font = "700 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(X - 3, Y - 3, W + 6, H + 6, 5); ctx.fill();
      ctx.fillStyle = "#38bdf8"; ctx.fillRect(X, Y, W * Math.max(0, x.shown) / 100, H);
      if (w.on("fill")) { ctx.fillStyle = "#fff"; ctx.fillRect(X + W * Math.max(0, x.shown) / 100 - 3, Y, 3, H); }
      if (x.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${x.flash})`; ctx.fillRect(X, Y, W, H); }
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textAlign = "right"; ctx.fillText(`EXP ${Math.round(x.v)}/100`, X + W, Y - 8);
    },
    steps: [
      {
        id: "orbs", name: { en: "EXP Orbs", ko: "경험치 구슬" }, param: "5 orbs → bar",
        cap: { en: "EXP *flies into* the bar. You see where it came from.", ko: "경험치가 바로 *날아 들어가요*. 출처가 보여요." },
        gain(w, n) {
          for (let i = 0; i < 5; i++) w.after(i * 0.06, () => {
            w.spawn({ type: "glow", seek: true, x: 470 + rand(-20, 20), y: 140 + rand(-30, 30), tx: 80 + 380 * Math.min(1, w.xp.v / 100), ty: 328, life: 0.45, size: 12, color: "125,211,252" });
            w.after(0.45, () => { addXp(w, n / 5); w.sfx.blip(4 + i); });
          });
        },
      },
      {
        id: "fill", name: { en: "Smooth Fill", ko: "부드럽게 차오름" }, param: "ease + leading edge",
        cap: { en: "The bar *glides*, with a bright *leading edge*.", ko: "바가 *스르륵* 차고, 끝이 *반짝여요*." },
        update(w, dt) {
          const x = w.xp, goal = x.over ? 100 : x.v;
          x.shown += (goal - x.shown) * Math.min(1, dt * 7);
          if (x.over && x.shown > 99) { x.shown = 0; x.over = false; }
        },
      },
      {
        id: "overflow", name: { en: "Overflow Flash", ko: "꽉 차면 번쩍" }, param: "white bar + sparks",
        cap: { en: "When it fills, the bar *flashes white*.", ko: "꽉 차는 순간 바가 *하얗게* 번쩍." },
        levelup(w, x) { x.flash = 1; sparks(w, 460, 328, 14, "125,211,252", [120, 380]); },
      },
      {
        id: "text", name: { en: "LEVEL UP Pop", ko: "LEVEL UP 글자" }, param: "overshoot scale",
        cap: { en: "Big words, *overshoot*, settle. And the hero *jumps*.", ko: "큰 글자가 *튀어나와* 자리 잡고, 주인공도 *폴짝*." },
        levelup(w, x) {
          w.spawn({ type: "text", text: "LEVEL UP", x: 270, y: 80, vy: -16, life: 1.4, size: 52, color: "#c6f432" });
          w.spawn({ type: "text", text: "LV " + x.lv, x: 270, y: 122, vy: -10, life: 1.4, size: 24, color: "#ffffff" });
          w.hero.sx = 0.8; w.hero.sy = 1.25; w.tween(w.hero, { oy: -40 }, 0.15, "out", () => w.tween(w.hero, { oy: 0 }, 0.2, "in"));
        },
      },
      {
        id: "pillar", name: { en: "Light Pillar", ko: "빛기둥" }, param: "beam + rays",
        cap: { en: "A *pillar of light* and spinning *rays*.", ko: "*빛기둥*과 돌아가는 *광선*." },
        levelup(w) {
          w.spawn({ type: "beam", x: 270, y: G, size: 60, h: 420, life: 1, color: "198,244,50" });
          w.spawn({ type: "rays", under: true, x: 270, y: G - 60, size: 170, n: 14, vr: 1.5, life: 1.2, color: "198,244,50" });
        },
      },
      {
        id: "stats", name: { en: "Stat Roll", ko: "능력치 상승" }, param: "staggered 180ms",
        cap: { en: "Stats *roll in one by one*. Each gain gets its moment.", ko: "능력치가 *하나씩* 떠요. 각각 주목받게." },
        levelup(w) {
          ["+3 STR", "+2 DEX", "+12 HP"].forEach((t, i) => w.after(0.3 + i * 0.18, () => w.spawn({ type: "text", text: t, x: 400, y: 150 + i * 34, vx: 0, vy: -12, life: 1.1, size: 22, color: "#fde047" })));
        },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising blips + fanfare",
        cap: { en: "Rising *blips*, then a short *fanfare*.", ko: "올라가는 *띠링*, 그리고 짧은 *팡파레*." },
        levelup(w) { w.sfx.fanfare(); },
      },
    ],
  },

  {
    id: "match3", cat: "puzzle", view: "top",
    title: { en: "Make matches feel *juicy*", ko: "매치3를 *쫀득하게*" },
    intro: { en: "Swap. Gone. Refill. *Zero joy.*", ko: "바꾸고, 사라지고, 채워짐. *재미 0.*" },
    interval: 1.15, stepDur: 3.5,
    drawFloor(w, ctx) {
      ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.beginPath(); ctx.roundRect(M3.x0 - 8, M3.y0 - 8, M3.cols * M3.cell + 16, M3.rows * M3.cell + 16, 12); ctx.fill();
      for (let r = 0; r < M3.rows; r++) for (let c = 0; c < M3.cols; c++) if ((r + c) % 2) { ctx.fillStyle = "rgba(255,255,255,0.035)"; ctx.fillRect(M3.x0 + c * M3.cell, M3.y0 + r * M3.cell, M3.cell, M3.cell); }
    },
    setup(w) { m3Board(w); w.score = 0; w.shown = 0; w.bump = 0; w.combo = 0; w.lastClear = -9; },
    fire(w) {
      if (w.busy) return;
      w.busy = true;
      const B = w.board, c = w.mc, a = B[0][c + 2], b = B[1][c + 2];
      B[0][c + 2] = b; B[1][c + 2] = a;
      const pa = m3pos(1, c + 2), pb = m3pos(0, c + 2);
      a.tx = pa.x; a.ty = pa.y; b.tx = pb.x; b.ty = pb.y;
      w.swapT = 0.2;
      w.emit("swap", a, b);
      if (!w.on("swap")) { a.x = a.tx; a.y = a.ty; b.x = b.tx; b.y = b.ty; }
      w.after(w.swapT, () => {
        const gems = [B[0][c], B[0][c + 1], B[0][c + 2]];
        w.combo = w.time - w.lastClear < 2.5 ? Math.min(8, w.combo + 1) : 1; w.lastClear = w.time;
        w.score += 30 * w.combo; w.clearT = 0.35;
        w.emit("clear", gems, w.combo);
        if (!w.on("pop")) gems.forEach(g => { g.sc = 0; });
        w.after(w.clearT, () => {
          const X = B[1][c + 2].c;
          for (let i = 0; i < 3; i++) {
            const p = m3pos(0, c + i);
            const g = { c: i < 2 ? X : (X + 1 + ((Math.random() * 4) | 0)) % 5, x: p.x, y: p.y, ty: p.y, sc: 1, sq: 1, vy: 0, falling: false };
            B[0][c + i] = g;
            w.emit("refill", g, i);
          }
          w.after(0.25, () => { w.busy = false; });
        });
      });
    },
    update(w, dt) {
      for (const row of w.board) for (const g of row) g.sq += (1 - g.sq) * Math.min(1, dt * 12);
      w.bump = Math.max(0, w.bump - dt * 5);
      if (!w.on("score")) w.shown = w.score; else w.shown += (w.score - w.shown) * Math.min(1, dt * 6);
    },
    drawFront(w, ctx) {
      for (const row of w.board) for (const g of row) if (g.sc > 0.02) {
        ctx.save(); ctx.translate(g.x, g.y); ctx.scale(g.sc * (2 - g.sq), g.sc * g.sq); drawGem(ctx, g.c, 0, 0, 19); ctx.restore();
      }
    },
    drawHud(w, ctx) {
      const sc = 1 + w.bump * 0.3;
      ctx.save(); ctx.translate(24, 74); ctx.scale(sc, sc);
      ctx.font = "700 12px 'JetBrains Mono', monospace"; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textAlign = "left"; ctx.fillText("SCORE", 0, 0);
      ctx.font = "800 22px Pretendard, sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(String(Math.round(w.shown)), 0, 22);
      ctx.restore();
    },
    steps: [
      {
        id: "swap", name: { en: "Eased Swap", ko: "부드러운 교체" }, param: "160ms · overshoot",
        cap: { en: "Slide the gems, with a tiny *overshoot*.", ko: "보석이 *미끄러지듯*, 살짝 *지나쳤다* 제자리." },
        swap(w, a, b) { w.swapT = 0.16; w.tween(a, { x: a.tx, y: a.ty }, 0.16, "back"); w.tween(b, { x: b.tx, y: b.ty }, 0.16, "back"); },
      },
      {
        id: "pop", name: { en: "Pop Before Clear", ko: "터지기 전 부풂" }, param: "1.35× → 0",
        cap: { en: "Swell *first*, then vanish. Anticipation again.", ko: "*먼저 부풀고* 사라져요. 여기도 예비 동작." },
        clear(w, gems) { w.clearT = 0.2; gems.forEach(g => w.tween(g, { sc: 1.35 }, 0.08, "out", () => w.tween(g, { sc: 0 }, 0.1, "in"))); },
      },
      {
        id: "burst", name: { en: "Color Burst", ko: "같은 색 파편" }, param: "8 sparks / gem",
        cap: { en: "Burst in the *gem's own color*.", ko: "*보석 색 그대로* 파편이 튀어요." },
        clear(w, gems) { gems.forEach(g => w.after(w.clearT * 0.4, () => { sparks(w, g.x, g.y, 8, GEM_COL[g.c], [120, 360]); w.spawn({ type: "star", x: g.x, y: g.y, size: 26, life: 0.12, color: "255,255,255" }); })); },
      },
      {
        id: "fall", name: { en: "Fall + Bounce", ko: "떨어지며 통통" }, param: "g 2400 · bounce .25",
        cap: { en: "New gems *fall in* and *bounce*. Never just appear.", ko: "새 보석은 *떨어져서* *통통*. 그냥 나타나면 안 돼요." },
        refill(w, g, i) { g.y = g.ty - 160 - i * 30; g.vy = 0; g.falling = true; },
        update(w, dt) {
          for (const row of w.board) for (const g of row) if (g.falling) {
            g.vy += 2400 * dt; g.y += g.vy * dt;
            if (g.y >= g.ty) { g.y = g.ty; if (g.vy > 300) { g.vy *= -0.25; g.sq = 0.72; } else { g.vy = 0; g.falling = false; } }
          }
        },
      },
      {
        id: "score", name: { en: "Score Flies Up", ko: "점수가 날아감" }, param: "+30 → counter",
        cap: { en: "The points *fly to the score*. Then it *counts up*.", ko: "점수가 *점수판으로 날아가고*, 숫자가 *올라가요*." },
        clear(w, gems, combo) {
          const g = gems[1];
          w.spawn({ type: "text", text: "+" + 30 * combo, x: g.x, y: g.y, vy: -60, life: 0.5, size: 26, color: "#ffffff" });
          w.spawn({ type: "glow", seek: true, x: g.x, y: g.y, tx: 44, ty: 86, life: 0.5, size: 12, color: "253,224,71" });
          w.after(0.5, () => { w.bump = 1; });
        },
      },
      {
        id: "combo", name: { en: "Combo Build-up", ko: "콤보 쌓기" }, param: "shake ↑ per combo",
        cap: { en: "Each combo is *bigger*: more shake, bigger words.", ko: "콤보마다 *커져요*. 흔들림도, 글자도." },
        clear(w, gems, combo) {
          if (combo < 2) return;
          w.shake(Math.min(0.5, 0.06 * combo));
          w.spawn({ type: "text", text: "COMBO ×" + combo, x: 270, y: 340, vy: -10, life: 0.8, size: 20 + combo * 3, color: "#c6f432" });
        },
      },
      {
        id: "sound", name: { en: "Rising Pitch", ko: "올라가는 음" }, param: "+2 semitones / combo",
        cap: { en: "Each combo plays *higher*. The ear counts for you.", ko: "콤보마다 음이 *올라가요*. 귀가 대신 세줘요." },
        swap(w) { w.sfx.swish(); },
        clear(w, gems, combo) { w.sfx.blip(combo * 2 + 2); },
      },
    ],
  },

  {
    id: "push", cat: "puzzle", view: "iso",
    title: { en: "Make block pushing *satisfying*", ko: "블록 밀기를 *손맛 있게*" },
    intro: { en: "Push. Teleport. *Huh?*", ko: "밀었더니 순간이동. *응?*" },
    interval: 0.95, stepDur: 3.6,
    drawFloor(w, ctx) {
      const P = w.P;
      for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 6; gx++) {
        const a = isoPt(gx, gy), b = isoPt(gx + 1, gy), c = isoPt(gx + 1, gy + 1), d = isoPt(gx, gy + 1);
        const goal = gx === 4 && gy === 1;
        ctx.fillStyle = goal ? `rgba(198,244,50,${0.12 + P.glow * 0.5})` : (gx + gy) % 2 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = goal ? "rgba(198,244,50,0.8)" : "rgba(255,255,255,0.08)"; ctx.lineWidth = goal ? 2 : 1; ctx.stroke();
      }
    },
    setup(w) { w.P = { hx: 0, cx: 1, gy: 1, hsx: 1, hsy: 1, csx: 1, csy: 1, glow: 0, done: false, ease: null, a: 1 }; },
    fire(w) {
      if (w.busy) return;
      const P = w.P;
      if (P.cx >= 4) { Object.assign(P, { hx: 0, cx: 1, done: false, glow: 0, a: 0 }); w.tween(P, { a: 1 }, 0.25); return; }
      w.busy = true;
      const go = () => {
        P.ease = null; P.moveT = 0;
        w.emit("move", P);
        if (P.ease) { P.moveT = 0.18; w.tween(P, { cx: P.cx + 1 }, 0.18, P.ease); w.tween(P, { hx: P.hx + 1 }, 0.18, "out"); }
        else { P.cx += 1; P.hx += 1; }
        w.after(P.moveT, () => { w.emit("stop", P); if (Math.round(P.cx) === 4) { P.done = true; w.emit("goal", P); } w.busy = false; });
      };
      if (w.on("lean")) { w.emit("lean", P); w.after(0.1, go); } else go();
    },
    update(w, dt) {
      const P = w.P, k = Math.min(1, dt * 12);
      P.hsx += (1 - P.hsx) * k; P.hsy += (1 - P.hsy) * k; P.csx += (1 - P.csx) * k; P.csy += (1 - P.csy) * k;
      P.glow = Math.max(0, P.glow - dt * 0.8);
    },
    drawFront(w, ctx) {
      const P = w.P; ctx.save(); ctx.globalAlpha = P.a;
      const crateCol = P.done && w.on("goal") ? ["#bef264", "#65a30d", "#4d7c0f"] : ["#fbbf24", "#d97706", "#b45309"];
      drawCube(ctx, P.hx, P.gy, 44, ["#7dd3fc", "#0284c7", "#0369a1"], P.hsx, P.hsy);
      drawCube(ctx, P.cx, P.gy, 52, crateCol, P.csx, P.csy);
      ctx.restore();
    },
    steps: [
      {
        id: "ease", name: { en: "Eased Slide", ko: "부드럽게 밀림" }, param: "180ms ease-out",
        cap: { en: "Don't teleport. *Slide*, fast then slow.", ko: "순간이동 말고 *미끄러지듯*, 빠르다가 느리게." },
        move(w, P) { P.ease = P.ease || "out"; },
      },
      {
        id: "lean", name: { en: "Push Lean", ko: "미는 자세" }, param: "squash into block",
        cap: { en: "The pusher *squashes into* the block first.", ko: "미는 쪽이 먼저 블록에 *짓눌려요*." },
        lean(w, P) { P.hsx = 0.85; P.hsy = 1.12; },
      },
      {
        id: "over", name: { en: "Overshoot", ko: "살짝 지나침" }, param: "ease-out-back",
        cap: { en: "Slide a hair *too far*, then *settle*. Weight!", ko: "*살짝 더* 갔다가 *제자리*. 이게 무게감." },
        move(w, P) { P.ease = "back"; },
      },
      {
        id: "dust", name: { en: "Floor Dust", ko: "바닥 먼지" }, param: "puffs at base",
        cap: { en: "Kick up *dust* where it scrapes the floor.", ko: "바닥을 긁는 자리에 *먼지*." },
        move(w, P) { const b = isoPt(P.cx + 0.5, P.gy + 0.5); for (let i = 0; i < 6; i++) w.spawn({ type: "smoke", x: b.x - rand(10, 30), y: b.y + rand(-6, 8), vx: rand(-90, -20), vy: rand(-40, -5), drag: 3, size: rand(4, 7), size1: rand(12, 18), life: rand(0.35, 0.55), color: "210,205,195" }); },
      },
      {
        id: "bump", name: { en: "Impact Bump", ko: "멈출 때 쿵" }, param: "squash + 0.08 shake",
        cap: { en: "When it stops, a small *squash* and *thud*.", ko: "멈출 때 살짝 *찌그러지며* *쿵*." },
        stop(w, P) { P.csx = 1.12; P.csy = 0.84; w.shake(0.08); },
      },
      {
        id: "goal", name: { en: "Goal Glow", ko: "정답 반응" }, param: "glow + ring + color",
        cap: { en: "On the goal: it *glows*, *rings*, and *changes color*.", ko: "정답 칸에선 *빛나고*, *고리*가 퍼지고, *색이 바뀌어요*." },
        goal(w, P) {
          P.glow = 1; const b = isoPt(4.5, P.gy + 0.5);
          w.spawn({ type: "ring", flat: true, x: b.x, y: b.y, size: 20, size1: 110, life: 0.5, w: 6, color: "198,244,50" });
          w.spawn({ type: "text", text: "✓", x: b.x, y: b.y - 90, vy: -30, life: 0.9, size: 34, color: "#c6f432" });
        },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "scrape / tock / chime",
        cap: { en: "*Scrape* while moving, *tock* on stop, *chime* on success.", ko: "밀 때 *스윽*, 멈출 때 *톡*, 성공하면 *띵*." },
        move(w) { w.sfx.scrape(); },
        stop(w) { w.sfx.tock(); },
        goal(w) { w.sfx.chime(4); },
      },
    ],
  },

  {
    id: "button", cat: "ui", view: "ui",
    title: { en: "Make buttons *pressable*", ko: "버튼을 *누르고 싶게*" },
    intro: { en: "It changes color. *Did it work?*", ko: "색만 바뀌어요. *눌린 거 맞아요?*" },
    interval: 0.85, stepDur: 3.2,
    drawFloor() {},
    setup(w) { w.B = { press: 0, sx: 1, sy: 1, count: 0, bump: 0, lit: 0 }; },
    fire(w) { const B = w.B; B.lit = 1; w.emit("down", B); w.after(0.09, () => { B.count++; w.emit("up", B); }); },
    update(w, dt) {
      const B = w.B, k = Math.min(1, dt * 14);
      B.lit = Math.max(0, B.lit - dt * 4); B.sx += (1 - B.sx) * k; B.sy += (1 - B.sy) * k; B.bump = Math.max(0, B.bump - dt * 5);
      if (!w.on("depth")) B.press = B.lit > 0.6 ? 6 : 0;
    },
    drawFront(w, ctx) {
      const B = w.B, x = 270, y = 230;
      ctx.save(); ctx.translate(x, y); ctx.scale(B.sx, B.sy);
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(0, 26, 104 - B.press * 1.5, 30, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#2a2f3a"; ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 14, 100, 34, 0, 0, TAU); ctx.fill(); ctx.stroke();
      const top = -24 + B.press, col = B.lit > 0 ? `rgb(${248},${113 + 80 * B.lit},${113 + 80 * B.lit})` : "#f87171";
      ctx.fillStyle = "#b91c1c"; ctx.beginPath(); ctx.ellipse(0, 10, 72, 24, 0, 0, Math.PI); ctx.lineTo(-72, top); ctx.ellipse(0, top, 72, 24, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, top, 72, 24, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(-24, top - 6, 22, 7, -0.2, 0, TAU); ctx.fill();
      ctx.restore();
    },
    drawHud(w, ctx) {
      const B = w.B, sc = 1 + B.bump * 0.4;
      ctx.save(); ctx.translate(270, 80); ctx.scale(sc, sc);
      ctx.font = "800 44px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = B.bump > 0.3 ? "#c6f432" : "#fff"; ctx.fillText(String(B.count), 0, 0);
      ctx.restore();
    },
    steps: [
      {
        id: "depth", name: { en: "Press Depth", ko: "눌리는 깊이" }, param: "12px + shadow",
        cap: { en: "Physically *sink* the button. The shadow shrinks.", ko: "버튼이 실제로 *눌려 들어가요*. 그림자도 줄고." },
        down(w, B) { w.tween(B, { press: 18 }, 0.06, "out"); },
        up(w, B) { w.tween(B, { press: 0 }, 0.24, "back"); },
      },
      {
        id: "squash", name: { en: "Squash & Overshoot", ko: "눌림과 반동" }, param: "1.12 / 0.88",
        cap: { en: "*Squash* on press, *overshoot* on release.", ko: "누르면 *찌그러지고*, 떼면 *튕겨요*." },
        down(w, B) { B.sx = 1.12; B.sy = 0.88; },
        up(w, B) { B.sx = 0.94; B.sy = 1.08; },
      },
      {
        id: "ripple", name: { en: "Ripple", ko: "물결" }, param: "ring 100 → 190",
        cap: { en: "A *ripple* spreads from the button.", ko: "버튼에서 *물결*이 퍼져요." },
        up(w) { w.spawn({ type: "ring", flat: true, x: 270, y: 244, size: 100, size1: 200, life: 0.4, w: 5, color: "248,113,113" }); },
      },
      {
        id: "sparkle", name: { en: "Sparkles", ko: "반짝이" }, param: "6 stars",
        cap: { en: "A few *sparkles* say \"yes, that counted\".", ko: "*반짝이* 몇 개가 \"됐어요\"라고 말해줘요." },
        up(w) { for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + rand(-1.3, 1.3), r = rand(90, 130); w.spawn({ type: "star", x: 270 + Math.cos(a) * r, y: 210 + Math.sin(a) * r * 0.7, size: rand(10, 18), life: 0.35, color: "255,255,255" }); } },
      },
      {
        id: "counter", name: { en: "Counter Bump", ko: "숫자 톡" }, param: "scale 1.4",
        cap: { en: "Whatever changed, make it *bump*.", ko: "바뀐 숫자는 *톡* 튀게." },
        up(w, B) { B.bump = 1; },
      },
      {
        id: "sound", name: { en: "Two-part Click", ko: "두 번 딸깍" }, param: "down low · up high",
        cap: { en: "Low *click* down, high *click* up. Like a real switch.", ko: "누를 때 낮게 *딸*, 뗄 때 높게 *깍*. 진짜 스위치처럼." },
        down(w) { w.sfx.clickDown(); },
        up(w) { w.sfx.clickUp(); },
      },
    ],
  },

  {
    id: "chest", cat: "ui", view: "side",
    title: { en: "Make chests feel *epic*", ko: "상자 열기를 *두근거리게*" },
    intro: { en: "Opened. Item. *Okay?*", ko: "열렸다. 아이템. *그래서?*" },
    interval: 2.6, stepDur: 3.8,
    setup(w) { w.C = { lid: 0, wig: 0, wigT: 0, sx: 1, sy: 1, item: 0, open: false }; },
    fire(w) {
      if (w.busy) return;
      w.busy = true;
      const C = w.C;
      const open = () => {
        C.open = true;
        w.emit("open", C);
        if (!w.on("lid")) C.lid = -1.9;
        if (!w.on("item")) C.item = 1;
        w.after(1.8, () => { C.open = false; C.lid = 0; C.item = 0; w.busy = false; });
      };
      if (w.on("wiggle")) { w.emit("wiggle", C); w.after(0.45, open); } else open();
    },
    update(w, dt) { const C = w.C, k = Math.min(1, dt * 12); C.sx += (1 - C.sx) * k; C.sy += (1 - C.sy) * k; },
    drawFront(w, ctx) {
      const C = w.C, x = 270, y = G;
      if (C.item > 0) {
        const iy = y - 70 - C.item * 110, s = 30 + C.item * 26;
        if (w.on("rarity")) { ctx.globalCompositeOperation = "lighter"; glow(ctx, x, iy, s * 1.6, "168,85,247", 0.8); ctx.globalCompositeOperation = "source-over"; }
        ctx.save(); ctx.translate(x, iy); ctx.rotate(Math.sin(w.time * 3) * 0.15); const g = SPR.gem.c; ctx.drawImage(g, -s / 2, -s / 2 * g.height / g.width, s, s * g.height / g.width); ctx.restore();
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(C.wig); ctx.scale(C.sx, C.sy);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, 2, 80, 10, 0, 0, TAU); ctx.fill();
      rr(ctx, -70, -70, 140, 70, 10, "#92400e", null);
      ctx.fillStyle = "#facc15"; ctx.fillRect(-70, -44, 140, 8); ctx.fillRect(-8, -50, 16, 22);
      ctx.save(); ctx.translate(-70, -70); ctx.rotate(C.lid);
      rr(ctx, 0, -40, 140, 40, 12, "#b45309", null); ctx.fillStyle = "#facc15"; ctx.fillRect(0, -14, 140, 8);
      ctx.restore();
      ctx.restore();
    },
    steps: [
      {
        id: "wiggle", name: { en: "Anticipation Wiggle", ko: "열기 전 들썩" }, param: "450ms · rising",
        cap: { en: "Make it *wiggle* first. The wait is the fun.", ko: "열기 전에 *들썩들썩*. 기다림이 재미예요." },
        wiggle(w, C) { C.wigT = 0.45; w.sfx.rattle(); },
        update(w, dt) { const C = w.C; if (C.wigT > 0) { C.wigT -= dt; C.wig = Math.sin(w.time * 60) * 0.1 * (1 - C.wigT / 0.45); } else C.wig = 0; },
      },
      {
        id: "lid", name: { en: "Lid Burst", ko: "뚜껑 팡" }, param: "fly + bounce back",
        cap: { en: "The lid *bursts* open, swings past, and *bounces back*.", ko: "뚜껑이 *팡* 열리고, 넘어갔다 *튕겨 돌아와요*." },
        open(w, C) { C.lid = 0; C.sx = 1.15; C.sy = 0.85; w.tween(C, { lid: -2.4 }, 0.12, "out", () => w.tween(C, { lid: -1.9 }, 0.25, "back")); },
      },
      {
        id: "rays", name: { en: "Light Rays", ko: "빛줄기" }, param: "12 rays · spin",
        cap: { en: "*Light rays* spill out of the box.", ko: "상자 안에서 *빛*이 쏟아져요." },
        open(w) { w.spawn({ type: "rays", under: true, x: 270, y: G - 80, size: 190, n: 12, vr: 0.9, life: 1.6, color: "253,224,71" }); w.spawn({ type: "glow", under: true, x: 270, y: G - 70, size: 120, size1: 60, life: 0.8, color: "253,224,71" }); },
      },
      {
        id: "coins", name: { en: "Coin Fountain", ko: "동전 분수" }, param: "10 coins · bounce",
        cap: { en: "Coins *fountain* out and *bounce* around.", ko: "동전이 *분수처럼* 튀어나와 *통통*." },
        open(w) { for (let i = 0; i < 10; i++) w.spawn({ type: "ghost", img: SPR.coin.c, top: true, w: 22, h: 22, alpha0: 1, add: false, x: 270 + rand(-30, 30), y: G - 80, vx: rand(-260, 260), vy: rand(-760, -480), g: 1500, gy: G - 9, ground: true, bounce: 0.5, life: 1.7, hold: true }); },
      },
      {
        id: "item", name: { en: "Item Reveal", ko: "아이템 등장" }, param: "rise 500ms",
        cap: { en: "The item *rises* slowly. Let them look at it.", ko: "아이템은 *천천히* 떠올라요. 감상할 시간." },
        open(w, C) { C.item = 0.01; w.tween(C, { item: 1 }, 0.5, "out"); },
      },
      {
        id: "rarity", name: { en: "Rarity Flash", ko: "등급 색 번쩍" }, param: "purple = epic",
        cap: { en: "Flash the *rarity color*. Purple means *epic*.", ko: "*등급 색*으로 번쩍. 보라는 *에픽*." },
        open(w) { w.flash("168,85,247", 0.45); w.spawn({ type: "ring", x: 270, y: G - 120, size: 20, size1: 200, life: 0.5, w: 8, color: "192,132,252" }); },
      },
      {
        id: "sound", name: { en: "Sound", ko: "소리" }, param: "rattle / burst / chime",
        cap: { en: "*Rattle*, *burst*, then a sparkling *chime*.", ko: "*달그락*, *팡*, 반짝이는 *띠링*." },
        open(w) { w.sfx.burst(); w.after(0.15, () => w.sfx.chime(7)); },
      },
    ],
  },
);
const PARAMS = {
  gun: { muzzle: "1F · 70ms", recoil: "16px · ease-out", shell: "g 1400 · bounce .35", tracer: "len 70px", hit: "flash · squash .78", shake: "trauma .12", sound: "pitch ±8%", kill: "stop 160ms" },
  magic: { charge: "360ms", core: "white + glow", trail: "embers / frame", burst: "ring + 18 sparks", hitstop: "stop 70ms", sound: "whoosh / boom", burn: "DoT 0.45s", numbers: "crit ×2" },
  melee: { windup: "-28px · 130ms", arc: "160ms smear", hitstop: "stop 90ms + tremble", flash: "white + star", knock: "80px · spring 3.2", shake: "trauma .40", sound: "swish / thud" },
  pickup: { pop: "arc + bounce", magnet: "ease-in curve", bump: "scale 1.45", sparkle: "out + in", sound: "+1 semitone", roll: "lerp ×6" },
  hurt: { flash: "red 400ms", knock: "-34px · squash", bar: "lag 350ms", vignette: "edge .70", iframes: "blink 900ms", shake: "trauma .35 · 60ms", sound: "short / harsh" },
  boom: { flash: "1 white frame", ring: "r 200 · 420ms", fire: "fire → smoke", debris: "16 chunks", shake: "trauma .90", slowmo: "0.20× · 500ms", scorch: "decal 6s", sound: "low + crack" },
};
const CORE_ORDER = ["gun", "shotgun", "twinstick", "bow", "magic", "melee", "hammer", "hurt", "death", "boom", "jump", "dash", "speed", "rpg", "levelup", "match3", "push", "button", "pickup", "chest"];
RECIPES.forEach(R => { if (CORE_ORDER.includes(R.id)) R.ord = CORE_ORDER.indexOf(R.id); R.steps.forEach(st => { st.param = st.param || (PARAMS[R.id] || {})[st.id] || ""; }); });

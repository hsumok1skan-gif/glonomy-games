"use strict";
/* 한 대상만 크게 보여 주는 쇼케이스 레시피: 전설 아이템 공개, 적 처치 폭발 */
(() => {
  /* ───── 공통 그림 ───── */
  const part = (p, light, dark) => Object.assign(p, { light, dark });
  const swordArt = () => polySprite("spot-sword", () => {
    const steel = [[236, 246, 255], [52, 70, 110]], gold = [[255, 214, 110], [120, 58, 10]], gem = [[255, 120, 150], [110, 10, 40]];
    return [
      part(blk(0, 70, 0, 30, 150, 10, 0.7), ...steel),
      part(pyr([[-8, 220, -3], [8, 220, -3], [8, 220, 3], [-8, 220, 3]], [0, 262, 0]), ...steel),
      part(blk(0, 58, 0, 96, 14, 16, 0.8), ...gold),
      part(pyr([[-48, 58, -8], [-34, 58, -8], [-34, 72, 8], [-48, 72, 8]], [-70, 86, 0]), ...gold),
      part(pyr([[34, 58, -8], [48, 58, -8], [48, 72, 8], [34, 72, 8]], [70, 86, 0]), ...gold),
      part(blk(0, 14, 0, 14, 44, 14, 0.9), [140, 90, 60], [40, 20, 14]),
      part(blk(0, 0, 0, 22, 14, 22, 0.6), ...gold),
      part(blk(0, 60, -8, 14, 14, 4, 0.7), ...gem),
    ];
  }, 120, 200, 0.35, 0.18);

  // 카드 한 장 (cx, cy 중심, 각도 ang: 0 = 뒷면, π = 앞면)
  function drawCard(w, ctx, c) {
    const W = 112, H = 156, s = Math.cos(c.ang), front = s < 0, sx = Math.abs(s) * c.scale;
    ctx.save();
    ctx.translate(c.x + (c.vib ? rand(-c.vib, c.vib) : 0), c.y + c.lift + (c.vib ? rand(-c.vib, c.vib) * 0.6 : 0));
    ctx.rotate(c.rot);
    // 원근: 카드 옆면 두께와 기울기
    if (c.persp) {
      const sk = Math.sin(c.ang) * 0.28, edge = Math.sin(c.ang) * 9;
      ctx.fillStyle = "#3be0d0";
      ctx.beginPath(); ctx.moveTo(W / 2 * sx, -H / 2 + sk * 40); ctx.lineTo(W / 2 * sx + edge, -H / 2 + sk * 40 + 4); ctx.lineTo(W / 2 * sx + edge, H / 2 - sk * 40 - 4); ctx.lineTo(W / 2 * sx, H / 2 - sk * 40); ctx.fill();
      ctx.transform(sx, sk * (front ? -1 : 1) * 0.25, 0, c.scale, 0, 0);
    } else ctx.scale(sx, c.scale);
    ctx.lineJoin = "round";
    if (!front) {
      rr(ctx, -W / 2, -H / 2, W, H, 12, "#1d2240");
      ctx.strokeStyle = c.gold ? "#f5b733" : "#8a90a8"; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = c.gold ? "rgba(245,183,51,.7)" : "rgba(160,168,190,.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(32, 0); ctx.lineTo(0, 48); ctx.lineTo(-32, 0); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = c.gold ? "#f59e0b" : "#596079"; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(12, 0); ctx.lineTo(0, 18); ctx.lineTo(-12, 0); ctx.fill();
    } else {
      const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2); g.addColorStop(0, "#3b1d6e"); g.addColorStop(1, "#140b2c");
      rr(ctx, -W / 2, -H / 2, W, H, 12, g);
      ctx.strokeStyle = "#f5b733"; ctx.lineWidth = 6; ctx.stroke();
      // 홀로 광택: 무지개 띠가 대각선으로 지나감
      if (c.foil > 0) {
        ctx.save(); ctx.clip();
        const t = (w.time * 1.4) % 2 - 0.5, hg = ctx.createLinearGradient(-W + t * W * 2, -H, t * W * 2, H);
        ["255,80,80", "255,220,80", "80,255,160", "80,180,255", "200,90,255"].forEach((col, i) => hg.addColorStop(0.3 + i * 0.08, `rgba(${col},${0.42 * c.foil})`));
        hg.addColorStop(0, "rgba(0,0,0,0)"); hg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hg; ctx.fillRect(-W / 2, -H / 2, W, H);
        ctx.restore();
      }
      const art = swordArt().c, pop = c.pop;
      // 칼이 액자 밖으로 튀어나옴(pop): 위로 커지고, 테두리 밖까지 그림
      const aw = 76 * (1 + pop * 0.22), ah = 124 * (1 + pop * 0.22);
      if (!pop) { ctx.save(); ctx.beginPath(); ctx.roundRect(-W / 2 + 4, -H / 2 + 4, W - 8, H - 8, 9); ctx.clip(); }
      ctx.drawImage(art, -aw / 2, 46 - ah - pop * 14, aw, ah);
      if (!pop) ctx.restore();
      rr(ctx, -40, H / 2 - 30, 80, 18, 4, "#f5b733");
      label(ctx, "LEGEND", 0, H / 2 - 21, 10, "#2a1600");
    }
    ctx.restore();
  }

  const goblinWhite = () => SPR.foe.white;

  RECIPES.push(
    /* ───────── 전설 아이템 공개 ───────── */
    {
      id: "spot-loot-reveal", cat: "ui", view: "3d",
      title: { en: "Turn a rare drop into a *show*", ko: "희귀 카드 공개를 *무대*처럼" },
      intro: { en: "Top-tier pull. Flipped like a *receipt*.", ko: "최고 등급인데 *영수증*처럼 넘어가요." },
      interval: 3.1, stepDur: 4.0,
      setup(w) {
        w.card = { x: 270, y: 182, lift: 0, ang: 0, scale: 1, rot: 0, vib: 0, foil: 0, pop: 0, gold: false, persp: false };
      },
      fire(w) {
        const c = w.card;
        Object.assign(c, { ang: 0, lift: 0, scale: 1, rot: 0, vib: 0, foil: 0, pop: 0, gold: false, persp: w.on("whip") });
        const flip = () => {
          w.tween(c, { ang: Math.PI }, w.on("whip") ? 0.2 : 0.5, w.on("whip") ? "out" : "lin", () => w.emit("reveal", c));
          w.emit("flip", c);
        };
        if (w.on("float")) { w.emit("charge", c); w.after(0.8, flip); } else w.after(0.15, flip);
      },
      drawFloor(w, ctx) {
        const g = ctx.createRadialGradient(270, 150, 10, 270, 150, 340);
        g.addColorStop(0, "#2a1a4e"); g.addColorStop(1, "#0b0916");
        ctx.fillStyle = g; ctx.fillRect(-80, -80, 700, 520);
        ctx.strokeStyle = "rgba(160,130,255,0.28)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(270, 280, 120, 24, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(270, 280, 86, 16, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(270, 280, 50 - w.card.lift * 0.4, 9, 0, 0, TAU); ctx.fill();
      },
      drawFront(w, ctx) { drawCard(w, ctx, w.card); },
      steps: [
        {
          id: "float", name: { en: "Hover & Hum", ko: "떠올라 웅웅" }, param: "lift 30 · orbs 24",
          cap: { en: "Lift it, let it *tremble*, draw light *inward*.", ko: "*스르륵* 떠서 *달달* 떨고, 빛이 *모여요*." },
          charge(w, c) {
            c.gold = true;
            w.tween(c, { lift: -30, vib: 4 }, 0.75, "in");
            for (let i = 0; i < 24; i++) w.after(i * 0.028, () => {
              const a = rand(0, TAU), d = rand(110, 170);
              w.spawn({ type: "spark", seek: true, x: c.x + Math.cos(a) * d, y: c.y - 30 + Math.sin(a) * d, tx: c.x, ty: c.y - 30, life: 0.32, size: 3, color: pick(["255,190,80", "190,140,255"]) });
            });
            w.spawn({ type: "glow", under: true, x: c.x, y: c.y - 30, size: 20, size1: 120, life: 0.8, color: "245,170,60" });
          },
        },
        {
          id: "whip", name: { en: "Snap Turn", ko: "홱 돌리기" }, param: "0.2s · freeze 90ms",
          cap: { en: "Turn it *fast* with depth. *Pause*. Spring back.", ko: "두께 있게 *홱* 돌고, *딱* 멈췄다 *톡*." },
          reveal(w, c) {
            w.hitstop(0.09);
            c.vib = 0; c.lift = -30; c.scale = 1.3;
            w.tween(c, { scale: 1 }, 0.45, "back");
          },
        },
        {
          id: "shock", name: { en: "Gold Pulse", ko: "금빛 파동" }, param: "rings 3 · bolts 6",
          cap: { en: "Rings race over the floor. *Gold bolts* crackle.", ko: "바닥에 *고리*가 번지고 *금빛 전기*가 튀어요." },
          reveal(w, c) {
            for (let i = 0; i < 3; i++) w.spawn({ type: "ring", flat: true, x: c.x, y: 280, size: 20, size1: 260 + i * 60, life: 0.6 + i * 0.15, w: 10, color: i ? "80,230,220" : "255,210,90" });
            for (let i = 0; i < 6; i++) {
              const a = -Math.PI / 2 + rand(-1.4, 1.4), pts = [[0, 0]];
              for (let k = 1; k < 7; k++) pts.push([Math.cos(a) * k * 22 + rand(-12, 12), Math.sin(a) * k * 22 + rand(-12, 12)]);
              w.spawn({ type: "crack", x: c.x, y: c.y - 30, pts, w: 3.5, life: 0.35, add: true, color: pick(["255,220,90", "90,240,255"]) });
            }
            w.shake(0.5); w.flash("255,220,150", 0.5);
          },
        },
        {
          id: "foil", name: { en: "Rainbow Gleam", ko: "무지개 윤기" }, param: "rays 14 · sheen",
          cap: { en: "A *rainbow* glides by. Beams turn. The blade *leaps out*.", ko: "*무지갯빛*이 쓱, 칼이 *툭* 튀어나와요." },
          reveal(w, c) {
            c.foil = 1; c.pop = 1;
            w.spawn({ type: "rays", under: true, x: c.x, y: c.y - 30, n: 14, size: 60, size1: 240, vr: 0.8, life: 2.2, hold: true, color: "255,200,90" });
            w.spawn({ type: "glow", under: true, x: c.x, y: c.y - 30, size: 70, size1: 130, life: 2, hold: true, color: "170,90,255" });
          },
        },
        {
          id: "rarity", name: { en: "Tier Callout", ko: "등급 외치기" }, param: "stars 16 · text",
          cap: { en: "Name the *tier* out loud. Toss *stars*.", ko: "*등급*을 크게 띄우고 *별*을 흩뿌려요." },
          reveal(w, c) {
            w.spawn({ type: "text", x: c.x, y: 52, text: "★ LEGENDARY ★", size: 24, color: "#ffcf4a", life: 2.2 });
            for (let i = 0; i < 16; i++) {
              const a = rand(0, TAU), s = rand(180, 420);
              w.spawn({ type: "star", x: c.x, y: c.y - 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.5, g: 260, size: rand(6, 11), life: rand(0.8, 1.4), color: pick(["255,220,90", "255,255,255", "190,140,255"]) });
            }
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rise + chord + boom",
          cap: { en: "A rising *hum*, a *crash*, a bright *chord*.", ko: "*웅~* 차오르다 *콰광*, 밝은 *화음*." },
          charge(w) { w.play(() => tn({ type: "sawtooth", f: 110, f2: 660, dur: 0.8, vol: 0.12 })); },
          reveal(w) { w.sfx.boom(); w.sfx.fanfare(); },
        },
      ],
    },

    /* ───────── 적 처치 폭발 ───────── */
    {
      id: "spot-death-pop", cat: "combat", view: "3d", polished: true, hookDur: 3.2,
      title: { en: "Give every kill a *bang*", ko: "처치하는 순간 *펑* 터뜨리기" },
      intro: { en: "One cut and it just *blinks out*.", ko: "한 번 베면 그냥 *뿅* 없어져요." },
      interval: 2.6, stepDur: 3.8,
      setup(w) {
        w.foe = w.actor("foe", { home: 270, h: 185, gy: G - 6 });
        w.swell = 0;
      },
      fire(w) {
        const f = w.foe; if (!f.alive) return;
        const cx = f.x, cy = f.gy - 70;
        // 대각선 베기 자국 (RAW부터 있음)
        w.spawn({ x: cx, y: cy, life: 0.22, draw: (ctx, p, k) => pxCrescent(ctx, p.x - 30, p.y + 40, 95, -1.75, -0.2, 9, k, "255,240,220") });
        f.ox = 6; f.flash = 0.5;
        const pop = () => {
          f.alive = false; f.alpha = 0;
          w.spawn({ type: "smoke", x: cx, y: cy, size: 16, size1: 30, life: 0.35, color: "70,40,40" });
          w.emit("pop", cx, cy);
          w.after(1.1, () => { w.respawn(f); w.swell = 0; });
        };
        if (w.on("swell")) { w.emit("swell", f, cx, cy); w.tween(w, { swell: 1 }, 0.6, "in", pop); } else w.after(0.22, pop);
      },
      update(w) {
        const f = w.foe;
        if (f.alive && w.swell > 0) { f.sx = 1 + w.swell * 0.26; f.sy = 1 + w.swell * 0.18; f.burn = w.swell * 1.6; f.vib = w.swell * 4; f.vibAxis = "x"; if (w.swell > 0.86) f.flash = 0.7; }
      },
      drawFloor(w, ctx) {
        const g = ctx.createRadialGradient(270, 200, 10, 270, 200, 330);
        g.addColorStop(0, "#2a1013"); g.addColorStop(1, "#0b0607");
        ctx.fillStyle = g; ctx.fillRect(-80, -80, 700, 520);
        ctx.fillStyle = "#170a0c"; ctx.beginPath(); ctx.ellipse(270, G + 8, 230, 48, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,120,90,0.35)"; ctx.lineWidth = 2; ctx.stroke();
      },
      steps: [
        {
          id: "swell", name: { en: "Bloat", ko: "빵빵 부풀기" }, param: "0.6s · ×1.22",
          cap: { en: "Puff it up, *about to burst*. Seams *glow*.", ko: "곧 터질 듯 *부풀고*, 틈새가 *달아올라요*." },
          swell(w, f, x, y) {
            // 갑옷 틈에서 주황 균열이 번지고, 불티가 새어 나옴
            for (let i = 0; i < 8; i++) w.after(i * 0.06, () => {
              const a = rand(0, TAU), pts = [[0, 0]];
              for (let k = 1; k < 5; k++) pts.push([Math.cos(a) * k * 9 + rand(-4, 4), Math.sin(a) * k * 9 + rand(-4, 4)]);
              w.spawn({ type: "crack", x: x + rand(-22, 22), y: y + rand(-30, 30), pts, w: 4, life: 0.62 - i * 0.06, add: true, color: "255,170,60" });
              for (let j = 0; j < 2; j++) w.spawn({ type: "spark", x: x + rand(-30, 30), y: y + rand(-35, 25), vx: rand(-40, 40), vy: rand(-160, -60), drag: 2, life: rand(0.3, 0.5), size: 2, color: "255,170,60" });
            });
          },
        },
        {
          id: "stop", name: { en: "Kill Freeze", ko: "처치 정지" }, param: "stop 130ms · flash",
          cap: { en: "*Hold* the final frame. Flash it *bright*.", ko: "마지막 순간 *딱* 멈추고 *번쩍*." },
          pop(w, x, y) {
            w.hitstop(0.13); w.zoomPunch(0.08); w.shake(0.5);
            w.spawn({ x, y, life: 0.2, draw: (ctx, p, k) => pxImpact(ctx, p.x, p.y, 70, k, "255,220,170") });
          },
        },
        {
          id: "shatter", name: { en: "Shard Spray", ko: "파편 흩뿌리기" }, param: "shards 26 · bounce",
          cap: { en: "Break it into *chunks* that clatter and settle.", ko: "*파편*으로 터져 바닥에 *달그락*." },
          pop(w, x, y) {
            const cols = [["#e2553a", "#5b1d17"], ["#f06a45", "#7a2418"], ["#9a3a2a", "#3a1410"], ["#ffb347", "#a8421a"]];
            for (let i = 0; i < 26; i++) {
              const a = rand(-Math.PI, 0), sp = rand(220, 600), sz = rand(4, 10), rot = rand(0, 6), c = pick(cols);
              w.spawn({ x: x + rand(-20, 20), y: y + rand(-24, 24), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 1500, vr: rand(-14, 14),
                ground: true, gy: G + 14, bounce: 0.4, life: rand(1.6, 2.3), hold: true, draw: (ctx, p) => pxChip(ctx, p.x, p.y, sz, rot + p.rot, c[0], c[1]) });
            }
          },
        },
        {
          id: "wave", name: { en: "Dust Ring", ko: "먼지 고리" }, param: "ring 240 · dust 12",
          cap: { en: "A *ring* rolls across the floor. *Dust* billows.", ko: "바닥에 *고리*가 번지고 *흙먼지*가 피어요." },
          pop(w, x, y) {
            w.spawn({ type: "ring", flat: true, x, y: G + 6, size: 20, size1: 240, life: 0.55, w: 12, color: "255,170,110" });
            for (let i = 0; i < 12; i++) w.spawn({ type: "smoke", x: x + rand(-40, 40), y: G + 4, vx: rand(-260, 260), vy: rand(-60, -10), drag: 3, size: rand(10, 18), size1: 30, life: rand(0.6, 1), color: "64,36,44" });
          },
        },
        {
          id: "soul", name: { en: "Ember Fountain", ko: "불씨 분수" }, param: "embers 22 · scorch 2s",
          cap: { en: "Embers *gush* upward. A *burn mark* stays.", ko: "*불씨*가 솟구치고 *그을음*이 남아요." },
          pop(w, x, y) {
            w.spawn({ type: "ellipse", under: true, add: false, x, y: G + 8, size: 110, life: 2.4, hold: true, color: "0,0,0" });
            w.spawn({ type: "ring", flat: true, x, y: G + 8, size: 64, life: 2.4, hold: true, w: 5, color: "255,140,60" });
            for (let i = 0; i < 22; i++) w.spawn({ type: "star", x: x + rand(-25, 25), y, vx: rand(-170, 170), vy: rand(-640, -320), g: 520, drag: 0.6, size: rand(4, 7), life: rand(1, 1.6), color: pick(["255,190,80", "255,130,50", "255,240,190"]) });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hiss + crunch + boom",
          cap: { en: "A *hiss* builds, a *crunch*, a low *boom*.", ko: "*쉬익* 차오르다 *와작*, *쿵*." },
          swell(w) { w.play(() => nz({ type: "bandpass", f: 600, f2: 4000, q: 3, dur: 0.6, vol: 0.2 })); },
          pop(w) { w.sfx.crit(); w.sfx.boom(); },
        },
      ],
    },
  );
})();

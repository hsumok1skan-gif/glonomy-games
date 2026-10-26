"use strict";
/* racing — 레이싱 · 스포츠 레시피 25편 */
(() => {
  /* ───── 로우폴리 차 ───── */
  const CAR_COL = {
    w: [[246, 244, 240], [70, 70, 80]],
    r: [[240, 96, 84], [70, 20, 24]],
    b: [[96, 160, 240], [20, 36, 80]],
    y: [[250, 204, 21], [90, 60, 10]],
  };
  const paint = (p, light, dark) => Object.assign(p, { light, dark });
  function carModel() {
    const wheel = (x, z) => paint(blk(x, 0, z, 26, 22, 10), [64, 64, 72], [8, 8, 12]);
    const tail = z => paint(blk(-61, 15, z, 2, 6, 14), [255, 90, 90], [140, 16, 16]);
    return [
      blk(0, 7, 0, 122, 20, 60, 0.96),
      paint(blk(-8, 27, 0, 60, 17, 50, 0.7, -4, 0), [70, 80, 100], [10, 12, 20]),
      blk(-56, 31, 0, 8, 6, 60),
      wheel(38, 30), wheel(38, -30), wheel(-38, 30), wheel(-38, -30),
      tail(20), tail(-20),
    ];
  }
  const carSide = c => polySprite(`racing-cs-${c}`, carModel, 240, 100, 0, 0.16, ...CAR_COL[c]);
  const carTop = c => polySprite(`racing-ct-${c}`, carModel, 200, 110, 0, Math.PI / 2 - 0.001, ...CAR_COL[c]);
  function carRear(c, yaw = 0) {
    const i = Math.max(0, Math.min(8, Math.round(4 + yaw / 0.12)));
    return polySprite(`racing-cr-${c}-${i}`, carModel, 260, 130, Math.PI / 2 + (i - 4) * 0.12, 0.2, ...CAR_COL[c]).c;
  }
  function useActor(key, spr, h, home) { if (!ACTOR[key]) ACTOR[key] = { spr, h, home }; }

  /* ───── 그리기 도우미 ───── */
  function drawImg(ctx, img, x, y, w, rot = 0, sx = 1, sy = 1, mid = false, alpha = 1) {
    const h = w * img.height / img.width;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
    ctx.drawImage(img, -w / 2, mid ? -h / 2 : -h, w, h); ctx.restore();
  }
  function quad(ctx, a, b, c, d, col) {
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
  }
  function pop(w, text, x, y, size, color, life = 1.1) {
    return w.spawn({ type: "text", text, x, y, vy: -24, size, color, life });
  }
  const CONF = ["198,244,50", "250,204,21", "56,189,248", "244,63,94", "255,255,255", "192,132,252"];
  function confetti(w, n, x0 = 20, x1 = 520, y = -10) {
    for (let i = 0; i < n; i++) w.spawn({ type: "chunk", x: rand(x0, x1), y: y + rand(-30, 0), vx: rand(-60, 60), vy: rand(40, 220), g: 260, drag: 1.2, vr: rand(-12, 12), life: rand(1.6, 2.6), size: rand(3, 6), color: pick(CONF), hold: true });
  }
  function firework(w, x, y, col) {
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, v = rand(160, 260); w.spawn({ type: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 160, drag: 1.6, life: rand(0.7, 1.1), size: 2.6, color: col }); }
    w.spawn({ type: "glow", x, y, size: 60, size1: 10, life: 0.4, color: col });
  }

  /* ───── 3D 도로 (뒤에서 본 시점) ───── */
  const HY = 128;
  function road3d(ctx, S, ground = "#191c17") {
    const f = 240 * (S.fov || 1), ch = 1.3, cam = S.camX || 0, cv = S.curve || 0;
    const P = (x, z, h = 0) => ({ x: 270 + (x - cam) * f / z + cv * z * 3.4, y: HY + (ch - h) * f / z });
    const sky = ctx.createLinearGradient(0, -40, 0, HY);
    sky.addColorStop(0, "#0b0e1c"); sky.addColorStop(1, "#272b46");
    ctx.fillStyle = sky; ctx.fillRect(-80, -60, 700, HY + 60);
    ctx.fillStyle = "#161a28"; ctx.beginPath(); ctx.moveTo(-80, HY);
    for (let x = -80; x <= 620; x += 20) ctx.lineTo(x, HY - 16 - 12 * Math.sin(x * 0.021 - cv * 0.6) - 7 * Math.sin(x * 0.053 + 1));
    ctx.lineTo(620, HY); ctx.fill();
    ctx.fillStyle = ground; ctx.fillRect(-80, HY, 700, 400);
    const L = 1.6, base = Math.floor(S.dist / L);
    for (let k = 28; k >= 0; k--) {
      let z0 = 0.5 + k * L - (S.dist % L); const z1 = z0 + L;
      if (z1 < 0.5) continue; z0 = Math.max(0.5, z0);
      const odd = (k + base) % 2;
      const q = (x0, x1, col) => quad(ctx, P(x0, z0), P(x1, z0), P(x1, z1), P(x0, z1), col);
      if (odd) q(-60, 60, "rgba(255,255,255,0.025)");
      q(-2.4, 2.4, odd ? "#2a2c34" : "#25272e");
      q(-2.8, -2.4, odd ? "#e5e7eb" : "#dc2626"); q(2.4, 2.8, odd ? "#e5e7eb" : "#dc2626");
      if (odd) q(-0.07, 0.07, "rgba(255,255,255,0.8)");
    }
    return P;
  }
  // 내 차 (뒤에서 본 모습)
  function drawMe(ctx, S, c = "w") {
    const x = 270 + (S.px || 0), y = 338 + (S.py || 0), lift = Math.max(0.35, 1 + Math.min(0, S.py || 0) / 260);
    ctx.fillStyle = `rgba(0,0,0,${0.45 * lift})`; ctx.beginPath(); ctx.ellipse(x, Math.max(y, 338) - 2, 88 * (S.sx || 1) * lift, 9 * lift, 0, 0, TAU); ctx.fill();
    drawImg(ctx, carRear(c, S.ang || 0), x, y, 200, S.roll || 0, S.sx || 1, S.sy || 1);
  }
  const rearWheels = S => [-1, 1].map(s => ({ x: 270 + (S.px || 0) + s * 40 + (S.ang || 0) * 60, y: 334 + (S.py || 0) }));
  function hudSpeed(ctx, kmh) {
    ctx.font = "700 14px 'JetBrains Mono', monospace"; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(kmh)} KM/H`, 26, 56);
  }
  function edgeGlow(ctx, col, a) {
    if (a <= 0.01) return;
    const g = ctx.createRadialGradient(270, 180, 110, 270, 180, 340);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${Math.min(0.85, a)})`);
    ctx.fillStyle = g; ctx.fillRect(-40, -40, 620, 440);
  }

  /* ───── 옆에서 본 도로 ───── */
  function sideRoad(ctx, dist, gy = G) {
    ctx.fillStyle = "#171a26"; ctx.beginPath(); ctx.moveTo(-80, gy);
    for (let x = -80; x <= 620; x += 20) { const u = x + dist * 0.12; ctx.lineTo(x, gy - 70 - 26 * Math.sin(u * 0.012) - 12 * Math.sin(u * 0.037)); }
    ctx.lineTo(620, gy); ctx.fill();
    for (let k = 0; k < 7; k++) {
      const x = ((k * 120 - dist * 0.5) % 840 + 840) % 840 - 120;
      ctx.fillStyle = "#2a2e3c"; ctx.fillRect(x, gy - 64, 6, 64); ctx.fillRect(x - 10, gy - 66, 26, 5);
    }
    ctx.fillStyle = "#1d1f26"; ctx.fillRect(-80, gy, 700, 140);
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-80, gy - 1, 700, 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let x = -((dist) % 90) - 80; x < 620; x += 90) ctx.fillRect(x, gy + 24, 44, 4);
  }


  /* ───── 공 ───── */
  function ballSpr(kind) {
    return sprite(`racing-ball-${kind}`, 96, 96, (x, W) => {
      const r = 44, c = 48;
      const base = { soccer: ["#ffffff", "#9ca3af"], bball: ["#fb923c", "#9a3412"], golf: ["#ffffff", "#cbd5e1"], bowl: ["#7c3aed", "#2e1065"], base: ["#ffffff", "#d1d5db"], tennis: ["#d9f99d", "#65a30d"] }[kind];
      x.fillStyle = rg(x, c, c, 2, r, [[0, base[0]], [1, base[1]]], c - 14, c - 16); x.beginPath(); x.arc(c, c, r, 0, TAU); x.fill();
      x.save(); x.beginPath(); x.arc(c, c, r, 0, TAU); x.clip();
      if (kind === "soccer") {
        x.fillStyle = "#111827";
        const pent = (px, py, s) => { x.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; x.lineTo(px + Math.cos(a) * s, py + Math.sin(a) * s); } x.closePath(); x.fill(); };
        pent(c, c, 13); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + Math.PI / 2; pent(c + Math.cos(a) * 40, c + Math.sin(a) * 40, 11); }
      } else if (kind === "bball") {
        x.strokeStyle = "#431407"; x.lineWidth = 3.5;
        x.beginPath(); x.moveTo(c - r, c); x.lineTo(c + r, c); x.moveTo(c, c - r); x.lineTo(c, c + r); x.stroke();
        x.beginPath(); x.arc(c - 46, c, 34, -1.1, 1.1); x.stroke(); x.beginPath(); x.arc(c + 46, c, 34, Math.PI - 1.1, Math.PI + 1.1); x.stroke();
      } else if (kind === "golf") {
        x.fillStyle = "rgba(100,116,139,0.35)";
        for (let i = 0; i < 26; i++) { const a = i * 2.4, d = Math.sqrt(i / 26) * 38; x.beginPath(); x.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 3, 0, TAU); x.fill(); }
      } else if (kind === "bowl") {
        x.fillStyle = "#0b0614"; for (const [dx, dy] of [[-8, -14], [8, -14], [0, 2]]) { x.beginPath(); x.arc(c + dx, c + dy, 6, 0, TAU); x.fill(); }
      } else if (kind === "base") {
        x.strokeStyle = "#dc2626"; x.lineWidth = 3; x.setLineDash([4, 5]);
        x.beginPath(); x.arc(c - 58, c, 40, -0.9, 0.9); x.stroke(); x.beginPath(); x.arc(c + 58, c, 40, Math.PI - 0.9, Math.PI + 0.9); x.stroke();
      } else if (kind === "tennis") {
        x.strokeStyle = "#fff"; x.lineWidth = 5;
        x.beginPath(); x.arc(c - 54, c, 40, -0.9, 0.9); x.stroke(); x.beginPath(); x.arc(c + 54, c, 40, Math.PI - 0.9, Math.PI + 0.9); x.stroke();
      }
      x.restore();
      x.fillStyle = "rgba(255,255,255,0.55)"; x.beginPath(); x.ellipse(c - 14, c - 18, 10, 6, -0.6, 0, TAU); x.fill();
    }).c;
  }
  function drawBall(ctx, kind, b, r) {
    const d = Math.atan2(b.vy || 0, b.vx || 0);
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.rotate(d); ctx.scale(b.sx || 1, b.sy || 1); ctx.rotate(-d + (b.rot || 0));
    ctx.drawImage(ballSpr(kind), -r, -r, r * 2, r * 2); ctx.restore();
  }

  RECIPES.push(
    /* 1 ─ 드리프트 불꽃 */
    {
      id: "racing-drift", cat: "racing", view: "3d", polished: true,
      title: { en: "Make drifts *sizzle*", ko: "드리프트를 *지글지글*하게" },
      intro: { en: "The car turns. *That's it.*", ko: "차가 꺾여요. *그게 끝*이에요." },
      interval: 1.7, stepDur: 3.8,
      setup(w) { w.S = { dist: 0, curve: 0, ang: 0, angT: 0, px: 0, drift: 0, dir: 1, charge: 0, spark: "255,220,140" }; },
      fire(w) {
        const S = w.S;
        S.dir = -S.dir; S.drift = 1.2; S.charge = 0;
        w.emit("start", S);
      },
      update(w, dt) {
        const S = w.S;
        S.dist += 15 * dt;
        S.curve += ((S.drift > 0 ? S.dir * 1.3 : 0) - S.curve) * Math.min(1, dt * 3);
        S.ang += (S.angT - S.ang) * Math.min(1, dt * 8);
        S.angT = S.drift > 0 ? -S.dir * 0.18 : 0;
        S.px = S.ang * 40;
        if (S.drift > 0) { S.drift -= dt; S.charge += dt; if (S.drift <= 0) w.emit("release", S); }
      },
      drawFloor(w, ctx) { road3d(ctx, w.S); drawMe(ctx, w.S); },
      steps: [
        {
          id: "angle", name: { en: "Commit to the Angle", ko: "과감한 각도" }, param: "yaw 6° → 25°",
          cap: { en: "A drift is a *sideways* car. Swing the tail *out*.", ko: "드리프트는 *옆으로* 가는 차. 꼬리를 *확* 빼요." },
          update(w) { if (w.S.drift > 0) w.S.angT = -w.S.dir * 0.44; },
        },
        {
          id: "sparks", name: { en: "Tire Sparks", ko: "바퀴 불꽃" }, param: "2 / frame · g 900",
          cap: { en: "Spray *sparks* off the rear tires.", ko: "뒷바퀴에서 *불꽃*을 뿌려요." },
          update(w) {
            const S = w.S; if (S.drift <= 0) return;
            for (const p of rearWheels(S)) w.spawn({ type: "spark", x: p.x, y: p.y, vx: -S.dir * rand(80, 380), vy: rand(-280, -60), g: 900, drag: 2, life: rand(0.2, 0.4), size: 2.6, color: S.spark });
          },
        },
        {
          id: "smoke", name: { en: "Tire Smoke", ko: "타이어 연기" }, param: "1 puff / frame",
          cap: { en: "Smoke *billows* behind. The road feels *hot*.", ko: "뒤로 연기가 *뭉게뭉게*. 노면이 *뜨거워* 보여요." },
          update(w) {
            const S = w.S; if (S.drift <= 0) return;
            if (Math.random() < 0.5) return;
            const p = pick(rearWheels(S));
            w.spawn({ type: "smoke", x: p.x, y: p.y - 8, vx: S.dir * rand(-40, -200), vy: rand(-70, -20), drag: 1.5, size: 8, size1: rand(28, 40), life: rand(0.5, 0.8), color: "170,172,182" });
          },
        },
        {
          id: "charge", name: { en: "Charge Colors", ko: "색이 바뀌는 충전" }, param: "blue → orange → pink",
          cap: { en: "Hold longer, sparks *change color*. Players read it.", ko: "오래 버틸수록 불꽃 *색이 바뀌어요*." },
          update(w) {
            const S = w.S;
            S.spark = S.charge < 0.4 ? "110,180,255" : S.charge < 0.8 ? "255,160,60" : "255,100,220";
            if (S.drift > 0) for (const p of rearWheels(S)) w.spawn({ type: "glow", x: p.x, y: p.y - 4, size: 13, size1: 5, life: 0.08, color: S.spark });
          },
        },
        {
          id: "camera", name: { en: "Camera Swing", ko: "카메라 쏠림" }, param: "26px · lags 160ms",
          cap: { en: "Let the camera *lag* behind the slide.", ko: "카메라가 미끄러짐을 *한 박자 늦게* 따라가요." },
          update(w) { w.cam.tx = w.S.drift > 0 ? -w.S.dir * 26 : 0; },
        },
        {
          id: "release", name: { en: "Release Boost", ko: "놓는 순간 부스트" }, param: "flash + punch",
          cap: { en: "Let go at full charge. *Pay it off* with a burst.", ko: "꽉 채우고 놓으면 *팡* 하고 보상해요." },
          release(w, S) {
            w.flash("255,120,220", 0.35); w.zoomPunch(0.07); w.kick(0, -12);
            for (const p of rearWheels(S)) w.spawn({ type: "ring", x: p.x, y: p.y, size: 8, size1: 80, flat: true, life: 0.35, w: 6, color: S.spark });
            pop(w, "BOOST!", 270, 150, 40, "#f9a8d4");
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "screech / whoosh",
          cap: { en: "A *screech* on entry, a *whoosh* on release.", ko: "들어갈 때 *끼익*, 놓을 때 *슝*." },
          start(w) { w.sfx.skid(); w.after(0.25, () => w.sfx.skid()); },
          release(w) { if (w.on("release")) w.sfx.boost(); else w.sfx.dash(); },
        },
      ],
    },

    /* 2 ─ 부스트 발판 */
    {
      id: "racing-boost-pad", cat: "racing", view: "3d", polished: true,
      title: { en: "Make boost pads *kick*", ko: "부스트 발판에 *한 방* 넣기" },
      intro: { en: "Drove over it. Did it *work*?", ko: "밟긴 했는데… *된 건가요*?" },
      interval: 1.5, stepDur: 3.6,
      setup(w) { w.S = { dist: 0, speed: 1, pads: [], boostT: 0, sx: 1, sy: 1, py: 0, edge: 0, glow: 0 }; },
      fire(w) { w.S.pads.push({ z: 6.5, lit: 0, hit: false }); },
      update(w, dt) {
        const S = w.S;
        S.boostT = Math.max(0, S.boostT - dt);
        S.speed += ((S.boostT > 0 ? 2 : 1) - S.speed) * Math.min(1, dt * 4);
        const v = 14 * S.speed; S.dist += v * dt;
        for (const p of S.pads) {
          p.z -= v * dt; p.lit = Math.max(0, p.lit - dt * 2.5);
          if (!p.hit && p.z < 1.1) { p.hit = true; S.boostT = 1.1; w.emit("boost", p); }
        }
        S.pads = S.pads.filter(p => p.z > -2);
        S.sx += (1 - S.sx) * Math.min(1, dt * 9); S.sy += (1 - S.sy) * Math.min(1, dt * 9); S.py -= S.py * Math.min(1, dt * 8);
        S.edge = Math.max(0, S.edge - dt * 1.4); S.glow = 0;
      },
      drawFloor(w, ctx) {
        const S = w.S, P = road3d(ctx, S);
        for (const p of S.pads) {
          const z0 = Math.max(0.55, p.z), z1 = p.z + 1.8; if (z1 <= 0.6) continue;
          const a = 0.35 + S.glow * 0.35 + p.lit * 0.6;
          quad(ctx, P(-1, z0), P(1, z0), P(1, z1), P(-1, z1), `rgba(56,189,248,${Math.min(0.95, a)})`);
          ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, 0.25 + S.glow * 0.5 + p.lit)})`; ctx.lineWidth = 3;
          for (const o of [0.3, 1.0]) {
            const zz = p.z + o; if (zz < 0.55) continue;
            const l = P(-0.7, zz), m = P(0, zz + 0.5), r = P(0.7, zz);
            ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(m.x, m.y); ctx.lineTo(r.x, r.y); ctx.stroke();
          }
        }
        drawMe(ctx, S);
        hudSpeed(ctx, S.speed * 140);
      },
      drawHud(w, ctx) { edgeGlow(ctx, "56,189,248", w.S.edge); },
      steps: [
        {
          id: "glow", name: { en: "Pulsing Pad", ko: "숨 쉬는 발판" }, param: "sin 10Hz",
          cap: { en: "Make the pad *pulse* so you see it coming.", ko: "발판이 *두근두근*. 멀리서도 보여요." },
          update(w) { w.S.glow = 0.5 + 0.5 * Math.sin(w.time * 10); },
        },
        {
          id: "lit", name: { en: "Pad Flash", ko: "밟으면 번쩍" }, param: "white 400ms",
          cap: { en: "Flash the pad *white* the moment you touch it.", ko: "닿는 순간 발판이 *하얗게* 번쩍." },
          boost(w, p) { p.lit = 1; },
        },
        {
          id: "lurch", name: { en: "Car Lurch", ko: "차가 움찔" }, param: "squash 1.2 · dip 10px",
          cap: { en: "The car *squats* and lunges, like it got kicked.", ko: "누가 뒤에서 찬 듯 *주저앉았다* 튀어 나가요." },
          boost(w) { w.S.sx = 1.18; w.S.sy = 0.8; w.S.py = 10; },
        },
        {
          id: "wake", name: { en: "Energy Wake", ko: "에너지 물결" }, param: "flat ring + 14 streaks",
          cap: { en: "A *ring* and streaks burst from under the car.", ko: "차 밑에서 *고리*와 빛줄기가 퍼져요." },
          boost(w) {
            w.spawn({ type: "ring", x: 270, y: 326, size: 20, size1: 210, flat: true, life: 0.45, w: 9, color: "120,220,255" });
            sparks(w, 270, 320, 14, "150,230,255", [300, 800], Math.PI * 0.95, Math.PI * 2.05);
          },
        },
        {
          id: "edge", name: { en: "Edge Glow", ko: "가장자리 빛" }, param: "cyan .7 · 700ms",
          cap: { en: "Tint the screen edges. The *whole view* feels it.", ko: "화면 가장자리까지 *파랗게* 물들여요." },
          boost(w) { w.S.edge = 0.75; },
        },
        {
          id: "text", name: { en: "Speed Pop", ko: "속도 숫자 팝" }, param: "+60 KM/H",
          cap: { en: "Show the *gain* as a number. Tiny, but it counts.", ko: "얼마나 빨라졌는지 *숫자*로 톡." },
          boost(w) { pop(w, "+60 KM/H", 270, 170, 30, "#7dd3fc"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "zap + roar",
          cap: { en: "A bright *zap* on contact, then the *roar*.", ko: "닿을 때 *찌잉*, 그다음 *부우웅*." },
          boost(w) { if (w.on("glow") || w.on("lit")) w.play(() => tn({ type: "sawtooth", f: 1200, f2: 2400, dur: 0.12, vol: 0.05, lp: 5000 })); if (w.on("lurch") || w.on("wake")) w.sfx.boost(); else w.sfx.dash(); },
        },
      ],
    },

    /* 3 ─ 니트로 불꽃 */
    {
      id: "racing-nitro", cat: "racing", view: "side", polished: true,
      title: { en: "Make nitro *roar*", ko: "니트로를 *으르렁*거리게" },
      intro: { en: "Nitro on. It just goes a bit *faster*.", ko: "니트로 켰는데 *조금* 빨라질 뿐." },
      interval: 2.2, stepDur: 3.6,
      setup(w) {
        carSide("w"); useActor("racing-carS-w", "racing-cs-w", 76, 240);
        w.car = w.actor("racing-carS-w");
        w.S = { dist: 0, speed: 1, nitro: 0, tilt: 0, tiltT: 0, push: 0, pushT: 0, gT: 0 };
      },
      fire(w) { w.S.nitro = 1.7; w.emit("nitro", w.S); },
      update(w, dt) {
        const S = w.S, c = w.car;
        S.nitro = Math.max(0, S.nitro - dt);
        S.speed += ((S.nitro > 0 ? 2.4 : 1) - S.speed) * Math.min(1, dt * 3);
        S.dist += 420 * S.speed * dt;
        S.tilt += (S.tiltT - S.tilt) * Math.min(1, dt * 7); S.tiltT = 0;
        if (S.nitro > 0 && !S.pushT) S.pushT = 34;
        S.push += (S.pushT - S.push) * Math.min(1, dt * 4); S.pushT = 0;
        c.rot = S.tilt; c.x = c.home + S.push;
      },
      drawFloor(w, ctx) { sideRoad(ctx, w.S.dist); },
      steps: [
        {
          id: "flames", name: { en: "Exhaust Flames", ko: "배기 불꽃" }, param: "3 flames / frame",
          cap: { en: "Blast *flames* out the back the whole time.", ko: "켜져 있는 내내 뒤로 *불*을 뿜어요." },
          update(w) {
            if (w.S.nitro <= 0) return;
            const c = w.car, x = c.x + c.ox - c.w * 0.41, y = G - 20 + c.rot * 60;
            for (let i = 0; i < 3; i++) w.spawn({ type: "glow", x, y: y + rand(-4, 4), vx: rand(-700, -420), vy: rand(-40, 40), drag: 3, size: rand(14, 22), size1: 2, life: rand(0.14, 0.26), color: pick(["255,170,60", "255,110,40", "255,220,120"]) });
          },
        },
        {
          id: "core", name: { en: "Blue-hot Core", ko: "파란 심지" }, param: "white-blue nozzle",
          cap: { en: "A *blue-white core* makes it read as hotter.", ko: "가운데 *파란 심지*. 훨씬 뜨거워 보여요." },
          update(w) {
            if (w.S.nitro <= 0) return;
            const c = w.car, x = c.x + c.ox - c.w * 0.41, y = G - 20 + c.rot * 60;
            w.spawn({ type: "glow", x: x - 6, y, size: 11, size1: 4, life: 0.05, color: "200,235,255" });
            w.spawn({ type: "spark", x, y, vx: rand(-900, -600), vy: rand(-20, 20), life: 0.12, size: 3, color: "120,190,255" });
          },
        },
        {
          id: "wheelie", name: { en: "Nose Lift", ko: "앞이 들림" }, param: "−4° · +40px",
          cap: { en: "The nose *lifts* and the car *surges* forward.", ko: "앞머리가 *번쩍* 들리고 *쭉* 나가요." },
          update(w) { if (w.S.nitro > 0) { w.S.tiltT = -0.07; w.S.pushT = 46; } },
        },
        {
          id: "ghosts", name: { en: "Afterimages", ko: "잔상" }, param: "every 50ms · 300ms",
          cap: { en: "Leave *cyan copies* behind. Speed you can see.", ko: "뒤로 *파란 잔상*을 남겨요." },
          update(w, dt) {
            const S = w.S, c = w.car; if (S.nitro <= 0) return;
            S.gT -= dt; if (S.gT > 0) return; S.gT = 0.05;
            w.spawn({ type: "ghost", img: c.s.cyan, x: c.x, y: G, w: c.w, h: c.h, vx: -620, life: 0.25, alpha0: 0.3, under: true });
          },
        },
        {
          id: "lines", name: { en: "Speed Lines", ko: "속도선" }, param: "2 / frame",
          cap: { en: "Thin *streaks* rip across the whole screen.", ko: "화면 전체에 *가는 줄*이 휙휙." },
          update(w) {
            if (w.S.nitro <= 0) return;
            for (let i = 0; i < 2; i++) w.spawn({ type: "spark", x: rand(560, 620), y: rand(40, 300), vx: -2400, vy: 0, life: 0.3, size: 1.4, color: "255,255,255" });
          },
        },
        {
          id: "shake", name: { en: "Rumble", ko: "진동" }, param: "trauma .25 hold",
          cap: { en: "Keep a *low rumble* going while it burns.", ko: "타는 동안 *낮게 계속* 떨려요." },
          update(w) { if (w.S.nitro > 0) w.trauma = Math.max(w.trauma, 0.25); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pop + roar",
          cap: { en: "A *pop* to ignite, then a long *roar*.", ko: "*펑* 하고 붙고, 길게 *부와앙*." },
          nitro(w) { if (w.on("flames")) w.play(() => { sSnap(0.5, 0, 2500); sBody(160, 0.12, 0.6); nz({ dur: 0.18, f: 1800, f2: 400, vol: 0.4 }); }); if (w.on("core") || w.on("lines")) w.sfx.boost(); else w.sfx.dash(); },
        },
      ],
    },

    /* 4 ─ 충돌 */
    {
      id: "racing-crunch", cat: "racing", view: "side",
      title: { en: "Make crashes *crunch*", ko: "충돌에 *우지끈* 넣기" },
      intro: { en: "Two cars touch. Like *bumper stickers*.", ko: "부딪혔는데 *스티커*끼리 닿은 느낌." },
      interval: 1.6, stepDur: 3.6,
      setup(w) {
        carSide("w"); carSide("r");
        useActor("racing-carS-w", "racing-cs-w", 76, 240); useActor("racing-carS-r", "racing-cs-r", 76, 360);
        w.me = w.actor("racing-carS-w", { home: 100 }); w.foe = w.actor("racing-carS-r", { home: 380 });
        w.S = { t: 9, hit: true };
      },
      fire(w) { w.S = { t: 0, hit: false }; w.me.x = w.me.home; },
      update(w, dt) {
        const S = w.S, me = w.me, f = w.foe; if (!S) return;
        S.t += dt;
        if (!S.hit) {
          me.x = me.home + (f.x - me.w * 0.81 + 4 - me.home) * E.in(Math.min(1, S.t / 0.24));
          if (S.t >= 0.24) { S.hit = true; f.ox += 40; w.emit("crash", { x: me.x + me.w * 0.4, y: G - 30 }); }
        } else if (S.t > 1.1) me.x += (me.home - me.x) * Math.min(1, dt * 5);
        for (const a of [me, f]) a.rot -= a.rot * Math.min(1, dt * 4);
      },
      steps: [
        {
          id: "stop", name: { en: "Hit Stop", ko: "멈칫" }, param: "110ms",
          cap: { en: "Freeze on contact. The brain needs a *beat*.", ko: "닿는 순간 *멈칫*. 뇌가 알아챌 틈이에요." },
          crash(w) { w.hitstop(0.11); },
        },
        {
          id: "crumple", name: { en: "Crumple", ko: "찌그러짐" }, param: "squash .8 + flash",
          cap: { en: "Both bodies *squash* and flash white.", ko: "두 차가 *찌그러지고* 하얗게 번쩍." },
          crash(w) { w.me.sx = 0.8; w.me.sy = 1.1; w.foe.sx = 0.82; w.me.flash = 1; w.foe.flash = 1; },
        },
        {
          id: "sparks", name: { en: "Metal Sparks", ko: "쇳소리 불꽃" }, param: "22 sparks",
          cap: { en: "Metal on metal: a fan of *hot sparks*.", ko: "쇠끼리 긁혀 *불꽃*이 확." },
          crash(w, h) { sparks(w, h.x, h.y, 22, "255,210,120", [250, 750], -Math.PI * 0.95, -Math.PI * 0.05); },
        },
        {
          id: "debris", name: { en: "Glass + Parts", ko: "유리 · 부품 파편" }, param: "12 chunks · bounce",
          cap: { en: "Throw *glass and parts* that bounce on the road.", ko: "*유리와 부품*이 튀어서 바닥에 통통." },
          crash(w, h) {
            for (let i = 0; i < 12; i++) w.spawn({ type: "chunk", x: h.x, y: h.y, vx: rand(-200, 300), vy: rand(-520, -160), g: 1500, vr: rand(-20, 20), ground: true, bounce: 0.4, life: 1.6, size: rand(3, 7), color: pick(["160,220,255", "120,130,150", "240,96,84"]), hold: true });
          },
        },
        {
          id: "knock", name: { en: "Real Knockback", ko: "제대로 밀려남" }, param: "+90px · spin 9°",
          cap: { en: "Shove the other car *far*, and *tilt* it.", ko: "상대 차를 *멀리* 밀고 *기우뚱*." },
          crash(w) { w.foe.ox += 90; w.foe.k = 2; w.foe.rot = 0.16; w.me.ox -= 24; w.me.rot = -0.08; },
        },
        {
          id: "shake", name: { en: "Shake + Zoom", ko: "흔들림 + 줌" }, param: "trauma .5 · +5%",
          cap: { en: "A *hard shake* and a quick zoom-in.", ko: "*세게 흔들고* 살짝 확대." },
          crash(w) { w.shake(0.5, 1); w.zoomPunch(0.06); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thud + glass",
          cap: { en: "A deep *crunch* plus high *glass tinkle*.", ko: "묵직한 *쾅* 위에 *쨍그랑*." },
          crash(w) { w.sfx.crit(); w.play(() => { nz({ type: "highpass", f: 5000, dur: 0.35, vol: 0.3, delay: 0.05 }); tn({ type: "triangle", f: 2600, f2: 2200, dur: 0.2, vol: 0.08, delay: 0.08 }); }); },
        },
      ],
    },

    /* 5 ─ 결승선 */
    {
      id: "racing-finish", cat: "racing", view: "3d",
      title: { en: "Make the finish line *matter*", ko: "결승선을 *기억에 남게*" },
      intro: { en: "Race over. Feels like *any other second*.", ko: "끝났는데 *평소랑 똑같아요*." },
      interval: 2.2, stepDur: 4.0,
      setup(w) { w.S = { dist: 0, line: null }; },
      fire(w) { if (!w.S.line) w.S.line = { z: 5 }; },
      update(w, dt) {
        const S = w.S; S.dist += 14 * dt;
        if (S.line) { S.line.z -= 14 * dt; if (S.line.z < 1.0) { S.line = null; w.emit("finish"); } }
      },
      drawFloor(w, ctx) {
        const S = w.S, P = road3d(ctx, S);
        if (S.line) {
          const z = S.line.z;
          for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) {
            const x0 = -2.4 + i * 0.4, z0 = z + j * 0.4;
            quad(ctx, P(x0, z0), P(x0 + 0.4, z0), P(x0 + 0.4, z0 + 0.4), P(x0, z0 + 0.4), (i + j) % 2 ? "#f8fafc" : "#111");
          }
          for (const s of [-1, 1]) { const b = P(s * 2.9, z), t = P(s * 2.9, z, 3.2); ctx.fillStyle = "#94a3b8"; ctx.fillRect(b.x - 3, t.y, 6, b.y - t.y); }
          const a = P(-2.9, z, 3.2), b = P(2.9, z, 2.5);
          const n = 14, cw = (b.x - a.x) / n, chh = (b.y - a.y) / 2;
          for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? "#f8fafc" : "#111"; ctx.fillRect(a.x + i * cw, a.y + j * chh, cw + 0.5, chh + 0.5); }
        }
        drawMe(ctx, S);
      },
      steps: [
        {
          id: "slow", name: { en: "Slow-mo Cross", ko: "슬로모션 통과" }, param: "0.25× · 900ms",
          cap: { en: "*Slow time* right as you cross.", ko: "넘는 순간 *시간을 늦춰요*." },
          finish(w) { w.slowmo(0.25, 0.9); },
        },
        {
          id: "flash", name: { en: "Photo Flash", ko: "사진 플래시" }, param: "white .8",
          cap: { en: "A white *camera flash*. The moment is captured.", ko: "*찰칵* 하얀 플래시. 순간이 박제돼요." },
          finish(w) { w.flash("255,255,255", 0.45); },
        },
        {
          id: "text", name: { en: "FINISH Slam", ko: "FINISH 글자" }, param: "64px · 1.6s",
          cap: { en: "Slam a *big word* in. Don't be shy.", ko: "*큼직한 글자*로 쾅. 부끄러워 말고요." },
          finish(w) { w.spawn({ type: "text", text: "FINISH", x: 270, y: 150, size: 66, color: "#fff", life: 1.6 }); },
        },
        {
          id: "rays", name: { en: "Light Rays", ko: "빛줄기" }, param: "14 rays · spin",
          cap: { en: "*Rays* spin behind the word.", ko: "글자 뒤로 *빛줄기*가 빙글." },
          finish(w) { w.spawn({ type: "rays", x: 270, y: 150, size: 280, n: 14, vr: 0.8, life: 1.6, hold: true, color: "250,204,21" }); },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "50 pieces",
          cap: { en: "Rain *confetti* from the top of the screen.", ko: "위에서 *꽃가루*가 와르르." },
          finish(w) { confetti(w, 50); },
        },
        {
          id: "rank", name: { en: "Rank Badge", ko: "순위 배지" }, param: "1ST · gold",
          cap: { en: "Tell them *where* they finished. In gold.", ko: "몇 등인지 *금색*으로 알려줘요." },
          finish(w) { w.after(0.3, () => w.spawn({ type: "text", text: "1ST", x: 270, y: 212, size: 44, color: "#facc15", life: 1.3 })); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "fanfare",
          cap: { en: "A short *fanfare*. Earned.", ko: "짧은 *빰빠밤*. 받을 자격 있어요." },
          finish(w) { w.sfx.fanfare(); w.sfx.burst(); },
        },
      ],
    },

    /* 6 ─ 랩 타임 */
    {
      id: "racing-lap-split", cat: "racing", view: "ui",
      title: { en: "Make lap times *readable*", ko: "랩 타임을 *한눈에*" },
      intro: { en: "Lap done. The timer just *resets*.", ko: "한 바퀴 돌았는데 시계만 *0으로*." },
      interval: 2.1, stepDur: 4.0,
      setup(w) {
        w.S = { t: 0, best: 43.2, laps: [{ t: 43.6, best: false }, { t: 43.2, best: true }], hold: 0, deltaT: 0, pf: 0, slide: 0, glow: 0, last: null };
      },
      fire(w) {
        const S = w.S, faster = Math.random() < 0.7;
        const t = +(S.best + (faster ? -rand(0.12, 0.5) : rand(0.1, 0.4))).toFixed(3);
        const l = { t, d: t - S.best, best: t < S.best };
        if (l.best) S.best = t;
        S.laps.unshift(l); S.laps.length = Math.min(S.laps.length, 3);
        S.last = l; S.t = 0;
        w.emit("lap", l);
      },
      update(w, dt) {
        const S = w.S; S.t += dt;
        for (const k of ["hold", "deltaT", "pf", "glow"]) S[k] = Math.max(0, S[k] - dt);
        S.slide = Math.max(0, S.slide - dt * 3);
      },
      drawFloor(w, ctx) {
        const S = w.S, fmt = t => `0:${t.toFixed(3).padStart(6, "0")}`;
        // 미니맵
        rr(ctx, 26, 56, 196, 250, 16, "rgba(255,255,255,0.04)");
        ctx.strokeStyle = "#3b3f4c"; ctx.lineWidth = 16; ctx.beginPath(); ctx.ellipse(124, 182, 70, 100, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#e5e7eb"; ctx.fillRect(186, 176, 16, 6);
        const a = S.t / 2.1 * TAU, dx = 124 + Math.cos(a) * 70, dy = 182 + Math.sin(a) * 100;
        ctx.fillStyle = "#c6f432"; ctx.beginPath(); ctx.arc(dx, dy, 7, 0, TAU); ctx.fill();
        // 타이머 판
        const l = S.last, good = l && l.d < 0;
        rr(ctx, 244, 56, 270, 108, 16, S.pf > 0 ? `rgba(${good ? "34,197,94" : "239,68,68"},${0.12 + S.pf * 0.45})` : "rgba(255,255,255,0.05)");
        label(ctx, "LAP TIME", 262, 76, 12, "rgba(255,255,255,0.5)", "left", "'JetBrains Mono', monospace", 700);
        const shown = S.hold > 0 && l ? l.t : 40 + S.t;
        label(ctx, fmt(shown), 379, 112, 38, S.hold > 0 && Math.floor(S.hold * 8) % 2 ? "#c6f432" : "#fff", "center", "'JetBrains Mono', monospace", 800);
        if (S.deltaT > 0 && l) {
          const k = Math.min(1, (1.6 - S.deltaT) * 8), s = 1 + (1 - k) * 0.6;
          ctx.save(); ctx.translate(379, 146); ctx.scale(s, s);
          label(ctx, `${l.d < 0 ? "−" : "+"}${Math.abs(l.d).toFixed(3)}`, 0, 0, 20, good ? "#4ade80" : "#f87171", "center", "'JetBrains Mono', monospace", 800);
          ctx.restore();
        }
        // 기록 목록
        S.laps.forEach((r, i) => {
          const y = 186 + i * 40, x = 244 + (i === 0 ? S.slide * 280 : 0), purple = r.t === S.best && w.on("best");
          rr(ctx, x, y, 270, 32, 10, purple ? `rgba(168,85,247,${0.35 + S.glow * 0.4})` : "rgba(255,255,255,0.05)");
          label(ctx, `LAP ${3 - i}`, x + 16, y + 16, 13, "rgba(255,255,255,0.6)", "left", "'JetBrains Mono', monospace", 700);
          label(ctx, fmt(r.t), x + 254, y + 16, 15, purple ? "#e9d5ff" : "#fff", "right", "'JetBrains Mono', monospace", 800);
          if (purple) label(ctx, "BEST", x + 120, y + 16, 12, "#f0abfc", "center", "'JetBrains Mono', monospace", 800);
        });
      },
      steps: [
        {
          id: "hold", name: { en: "Hold the Time", ko: "기록 붙잡기" }, param: "freeze 1.2s · blink",
          cap: { en: "Freeze the lap time and *blink* it. Don't reset yet.", ko: "바로 0으로 말고, 기록을 *멈춰서 깜빡*." },
          lap(w) { w.S.hold = 1.2; },
        },
        {
          id: "delta", name: { en: "Split Delta", ko: "차이 표시" }, param: "±0.000 · pop",
          cap: { en: "Show *how much* faster or slower. That's the story.", ko: "*얼마나* 빨랐는지가 진짜 이야기예요." },
          lap(w) { w.S.deltaT = 1.6; },
        },
        {
          id: "color", name: { en: "Green / Red", ko: "초록 · 빨강" }, param: "panel flash 1s",
          cap: { en: "Flash the panel *green* if faster, *red* if not.", ko: "빠르면 *초록*, 느리면 *빨강*으로 번쩍." },
          lap(w) { w.S.pf = 1; },
        },
        {
          id: "slide", name: { en: "Row Slides In", ko: "줄이 밀려 들어옴" }, param: "330ms ease-out",
          cap: { en: "Slide the new row *in*. Eyes follow motion.", ko: "새 줄이 *쓱* 들어와요. 눈이 따라가요." },
          lap(w) { w.S.slide = 1; },
        },
        {
          id: "best", name: { en: "Best Lap Purple", ko: "최고 기록 보라색" }, param: "purple + stars",
          cap: { en: "Personal best? Paint it *purple* and sparkle.", ko: "최고 기록이면 *보라색*에 반짝이." },
          lap(w, l) {
            if (!l.best) return;
            w.S.glow = 1.2;
            for (let i = 0; i < 6; i++) w.spawn({ type: "star", x: rand(260, 500), y: rand(180, 220), vy: -40, size: rand(6, 10), life: 0.8, color: "240,171,252" });
          },
        },
        {
          id: "pulse", name: { en: "Line Pulse", ko: "출발선 고리" }, param: "ring on map",
          cap: { en: "Pulse a *ring* on the map where you crossed.", ko: "지도 위 지나간 자리에 *고리*가 퍼져요." },
          lap(w) { w.spawn({ type: "ring", x: 194, y: 182, size: 6, size1: 46, life: 0.5, w: 5, color: "198,244,50" }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "chime · +7 if best",
          cap: { en: "A *chime*. Higher pitch for a new best.", ko: "*띵*. 최고 기록이면 더 높게." },
          lap(w, l) { w.sfx.chime(l.best ? 7 : 0); },
        },
      ],
    },

    /* 7 ─ 순위 변동 */
    {
      id: "racing-position", cat: "racing", view: "3d",
      title: { en: "Make P3 → P2 *feel earned*", ko: "3위 → 2위를 *뿌듯하게*" },
      intro: { en: "You passed someone. The number *just changed*.", ko: "추월했는데 숫자만 *슬쩍* 바뀌어요." },
      interval: 1.8, stepDur: 3.8,
      setup(w) {
        w.S = { dist: 0, rz: 3.4, rzT: 3.4, passing: false, back: 0, pos: 3, rows: [0, 2, 1], ry: [0, 2, 1], flip: 0, punch: 0, hi: 0 };
      },
      fire(w) {
        const S = w.S; if (S.passing) return;
        S.passing = true;
      },
      update(w, dt) {
        const S = w.S; S.dist += 14 * dt;
        if (S.passing) {
          S.rz -= 5 * dt;
          if (S.rz < 1.25) { S.passing = false; S.back = 1.2; S.pos = 2; S.rows = [0, 1, 2]; w.emit("pass", S); }
        } else if (S.back > 0) {
          S.back -= dt;
          if (S.back <= 0) { S.rz = 7; S.pos = 3; S.rows = [0, 2, 1]; }
        } else S.rz += (3.4 - S.rz) * Math.min(1, dt * 3);
        for (let i = 0; i < 3; i++) S.ry[i] += (S.rows.indexOf(i) - S.ry[i]) * (S.ease ? Math.min(1, dt * 8) : 1);
        S.ease = false;
        S.flip = Math.max(0, S.flip - dt * 3); S.punch = Math.max(0, S.punch - dt * 3); S.hi = Math.max(0, S.hi - dt);
      },
      drawFloor(w, ctx) {
        const S = w.S, P = road3d(ctx, S);
        if (S.rz > 1.25 && S.back <= 0) { const p = P(1.1, S.rz); drawImg(ctx, carRear("r"), p.x, p.y, 200 / S.rz); }
        drawMe(ctx, S);
      },
      drawHud(w, ctx) {
        const S = w.S;
        // 순위 배지
        const sy = S.flip > 0 ? Math.abs(Math.cos((1 - S.flip) * Math.PI)) : 1, sc = 1 + S.punch * 0.6;
        ctx.save(); ctx.translate(450, 92); ctx.scale(sc, sc * sy);
        rr(ctx, -48, -34, 96, 68, 14, S.punch > 0.5 ? "#fff" : "rgba(10,12,18,0.8)");
        const n = S.flip > 0.5 ? 3 : S.pos;
        label(ctx, `P${n}`, 0, 2, 44, S.punch > 0.5 ? "#0b0c0f" : "#fff", "center", "'JetBrains Mono', monospace", 800);
        ctx.restore();
        // 순위표
        const names = ["BLUE", "YOU", "RED"], cols = ["#60a5fa", "#c6f432", "#f87171"];
        rr(ctx, 22, 48, 150, 108, 12, "rgba(10,12,18,0.7)");
        for (let i = 0; i < 3; i++) {
          const y = 66 + S.ry[i] * 32, me = i === 1;
          if (me && S.hi > 0) rr(ctx, 28, y - 13, 138, 26, 7, `rgba(198,244,50,${S.hi * 0.5})`);
          label(ctx, `${Math.round(S.ry[i]) + 1}`, 42, y, 14, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
          label(ctx, names[i], 62, y, 15, cols[i], "left", "'JetBrains Mono', monospace", 800);
        }
      },
      steps: [
        {
          id: "flip", name: { en: "Badge Flip", ko: "배지 뒤집기" }, param: "flip 330ms",
          cap: { en: "*Flip* the badge over. Old number out, new in.", ko: "배지를 *휙 뒤집어서* 새 숫자로." },
          pass(w) { w.S.flip = 1; },
        },
        {
          id: "punch", name: { en: "Number Punch", ko: "숫자 펀치" }, param: "1.6× + white",
          cap: { en: "Then *punch* it big and white for a frame.", ko: "그다음 *크게 하얗게* 한 번 쾅." },
          pass(w) { w.after(0.17, () => (w.S.punch = 1)); },
        },
        {
          id: "board", name: { en: "Rows Swap", ko: "순위표 교체" }, param: "ease 120ms",
          cap: { en: "Let rows *slide past* each other, not teleport.", ko: "순위표 줄이 *미끄러지며* 자리를 바꿔요." },
          update(w) { w.S.ease = true; },
        },
        {
          id: "hi", name: { en: "Row Highlight", ko: "내 줄 강조" }, param: "lime 1s",
          cap: { en: "Light up *your* row so you find yourself.", ko: "*내 줄*에 불을 켜서 바로 찾게." },
          pass(w) { w.S.hi = 1; },
        },
        {
          id: "arrow", name: { en: "Up Arrow", ko: "올라가는 화살표" }, param: "▲ green rise",
          cap: { en: "A green *▲ floats up*. Direction, instantly.", ko: "초록 *▲가 솟아올라요*. 방향이 바로 보여요." },
          pass(w) { w.spawn({ type: "text", text: "▲ +1", x: 450, y: 150, vy: -60, size: 24, color: "#4ade80", life: 1 }); },
        },
        {
          id: "burst", name: { en: "Spark Burst", ko: "불꽃 터짐" }, param: "ring + 14 sparks",
          cap: { en: "Burst *sparks* off the badge.", ko: "배지에서 *불꽃*이 팡." },
          pass(w) {
            w.after(0.17, () => { sparks(w, 450, 92, 14, "198,244,50", [200, 500]); w.spawn({ type: "ring", x: 450, y: 92, size: 30, size1: 90, life: 0.35, w: 6, color: "198,244,50" }); });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh + 2 blips",
          cap: { en: "A *whoosh* past, then a rising *blip-blip*.", ko: "*휙* 지나가고, 올라가는 *띠링*." },
          pass(w) { w.sfx.dash(); w.after(0.15, () => w.sfx.blip(5)); w.after(0.25, () => w.sfx.blip(9)); },
        },
      ],
    },

    /* 8 ─ 슬립스트림 */
    {
      id: "racing-slipstream", cat: "racing", view: "3d",
      title: { en: "Make drafting *visible*", ko: "슬립스트림을 *눈에 보이게*" },
      intro: { en: "You're in the draft. *Are* you, though?", ko: "바람막이 안에 있대요. *정말요*?" },
      interval: 2.3, stepDur: 4.0,
      setup(w) { w.S = { dist: 0, lz: 3.4, lzT: 3.4, draft: 0, on: false, px: 0, pxT: 0, tint: 0, meter: false, out: 0 }; },
      fire(w) {
        const S = w.S;
        Object.assign(S, { on: true, draft: 0, out: 0, lz: 3.4, px: 0 }); w.emit("start", S);
      },
      update(w, dt) {
        const S = w.S; S.dist += 14 * dt;
        if (S.on) { S.draft += dt; if (S.draft >= 1.1) { S.on = false; S.out = 0.9; w.emit("sling", S); } }
        if (S.out > 0) {
          S.out -= dt; S.pxT = -120; S.lzT = 0.6;
          if (S.out <= 0) { S.lz = 3.4; S.px = 0; S.draft = 0; }
        }
        S.lz += (S.lzT - S.lz) * Math.min(1, dt * (S.out > 0 ? 3 : 2)); S.lzT = 3.4;
        S.px += (S.pxT - S.px) * Math.min(1, dt * 6); S.pxT = 0;
        S.tint += ((S.on ? S.draft : 0) - S.tint) * Math.min(1, dt * 4);
      },
      drawFloor(w, ctx) {
        const S = w.S, P = road3d(ctx, S);
        if (S.lz > 0.9) { const p = P(0.3, S.lz); drawImg(ctx, carRear("b"), p.x, p.y, 200 / S.lz); }
        drawMe(ctx, S);
        if (S.meter) {
          const k = Math.min(1, S.draft / 1.1), full = k >= 1 || S.out > 0;
          ctx.lineCap = "round"; ctx.lineWidth = 10;
          ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.arc(270, 80, 34, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
          ctx.strokeStyle = full ? "#c6f432" : "#7dd3fc"; ctx.beginPath(); ctx.arc(270, 80, 34, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * (full ? 1 : k))); ctx.stroke();
          label(ctx, "DRAFT", 270, 82, 11, "rgba(255,255,255,0.8)", "center", "'JetBrains Mono', monospace", 800);
        }
        S.meter = false;
      },
      drawHud(w, ctx) { edgeGlow(ctx, "125,211,252", w.S.tintOn ? w.S.tint * 0.6 : 0); w.S.tintOn = false; },
      steps: [
        {
          id: "lines", name: { en: "Wake Lines", ko: "바람 줄기" }, param: "3 / frame from car",
          cap: { en: "Draw the *air* peeling off the car ahead.", ko: "앞차에서 갈라지는 *바람*을 그려요." },
          update(w) {
            const S = w.S; if (!S.on) return;
            const s = 240 / S.lz;
            for (let i = 0; i < 3; i++) {
              const side = pick([-1, 1]), x = 270 + 0.3 * s + side * s * 0.4, y = 128 + 1.3 * s - rand(10, s * 0.5);
              w.spawn({ type: "spark", x, y, vx: (x - 270) * 5, vy: (y - 128) * 4, life: 0.35, size: 1.8, color: "200,235,255" });
            }
          },
        },
        {
          id: "meter", name: { en: "Draft Meter", ko: "드래프트 게이지" }, param: "arc 1.1s fill",
          cap: { en: "A *meter* shows the charge. No guessing.", ko: "*게이지*로 얼마나 찼는지 보여요." },
          update(w) { w.S.meter = true; },
        },
        {
          id: "creep", name: { en: "Tuck In", ko: "바짝 붙기" }, param: "z 3.4 → 2.5",
          cap: { en: "Slowly *creep closer*. You're being pulled.", ko: "천천히 *빨려 들어가듯* 붙어요." },
          update(w) { if (w.S.on) w.S.lzT = 2.5; },
        },
        {
          id: "tint", name: { en: "Cool Edges", ko: "푸른 가장자리" }, param: "blue .6 · builds",
          cap: { en: "Edges turn *blue* as the draft builds.", ko: "찰수록 가장자리가 *파랗게*." },
          update(w) { w.S.tintOn = true; },
        },
        {
          id: "buffet", name: { en: "Buffeting", ko: "흔들리는 바람" }, param: "trauma .15 · jitter",
          cap: { en: "Turbulent air *jostles* the car a little.", ko: "난기류에 차가 *들썩들썩*." },
          update(w) { if (w.S.on) { w.trauma = Math.max(w.trauma, 0.15); w.S.px += rand(-2, 2); } },
        },
        {
          id: "sling", name: { en: "Slingshot", ko: "새총처럼 튀기" }, param: "zoom 8% · flash",
          cap: { en: "Pull out and *slingshot*. Cash in the charge.", ko: "옆으로 빠지며 *새총처럼 쏙*." },
          sling(w) {
            w.zoomPunch(0.08); w.flash("150,220,255", 0.22); w.kick(0, 10);
            sparks(w, 200, 300, 16, "200,235,255", [400, 900], Math.PI * 0.6, Math.PI * 1.4);
            pop(w, "SLINGSHOT", 270, 180, 34, "#bae6fd");
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising hiss + whoosh",
          cap: { en: "A *rising hiss* while tucked in, then *whoosh*.", ko: "붙어 있는 동안 *쉬이익*, 빠질 때 *휙*." },
          start(w) { w.play(() => nz({ type: "bandpass", f: 400, f2: 2400, q: 2, dur: 1.1, vol: 0.18 })); },
          sling(w) { w.sfx.dash(); w.sfx.boost(); },
        },
      ],
    },

    /* 9 ─ 점프대 체공 */
    {
      id: "racing-jump", cat: "racing", view: "side",
      title: { en: "Make airtime feel *long*", ko: "점프 체공을 *길게* 느끼게" },
      intro: { en: "Off the ramp, back down. *Blink* and you miss it.", ko: "떴다가 착지. *눈 깜빡*하면 끝나요." },
      interval: 2.1, stepDur: 4.0,
      setup(w) {
        carSide("w"); useActor("racing-carS-w", "racing-cs-w", 76, 240);
        w.car = w.actor("racing-carS-w", { home: 40 });
        w.S = { ph: "idle", vx: 0, vy: 0, g: 1, air: 0, shadow: false };
      },
      fire(w) {
        const S = w.S;
        Object.assign(S, { ph: "drive", vx: 640, vy: 0, air: 0, id: (S.id || 0) + 1 }); w.car.x = 40; w.car.oy = 0; w.car.rot = 0; w.car.alpha = 1;
      },
      update(w, dt) {
        const S = w.S, c = w.car;
        if (S.ph === "drive") {
          c.x += S.vx * dt;
          c.oy = c.x > 150 ? -(Math.min(c.x, 250) - 150) * 0.44 : 0;
          if (c.x >= 250) { S.ph = "air"; S.vx = 300; S.vy = -560; w.emit("launch", S); }
        } else if (S.ph === "air") {
          S.vy += 1500 * S.g * dt; S.g = 1; S.air += dt;
          c.x += S.vx * dt; c.oy += S.vy * dt;
          if (c.oy >= 0) { c.oy = 0; S.ph = "roll"; w.emit("land", S); const id = S.id; w.after(0.6, () => { if (S.id === id) w.tween(c, { alpha: 0 }, 0.2, "lin", () => { if (S.id !== id) return; S.ph = "idle"; c.x = 40; c.rot = 0; c.alpha = 1; }); }); }
        } else if (S.ph === "roll") c.x += 120 * dt;
        c.rot -= c.rot * Math.min(1, dt * (S.ph === "air" ? 0 : 10));
      },
      drawFloor(w, ctx) {
        sideRoad(ctx, 0);
        ctx.fillStyle = "#3b3f4c"; ctx.beginPath(); ctx.moveTo(140, G); ctx.lineTo(252, G - 48); ctx.lineTo(258, G - 48); ctx.lineTo(258, G); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.moveTo(140, G); ctx.lineTo(252, G - 48); ctx.lineTo(252, G - 43); ctx.lineTo(150, G); ctx.closePath(); ctx.fill();
        const c = w.car;
        if (w.S.shadow && c.alpha > 0) {
          const k = Math.max(0.3, 1 + c.oy / 300);
          ctx.fillStyle = `rgba(0,0,0,${0.5 * k})`; ctx.beginPath(); ctx.ellipse(c.x, G + 2, c.w * 0.45 * k, 7 * k, 0, 0, TAU); ctx.fill();
        }
      },
      steps: [
        {
          id: "tilt", name: { en: "Nose Follows Arc", ko: "앞머리가 궤적을 따라감" }, param: "rot = atan(vy/vx)·.6",
          cap: { en: "Point the nose *along the arc*. Up, then down.", ko: "앞머리가 *궤적을 따라* 들렸다 숙여요." },
          update(w) {
            const S = w.S, c = w.car;
            if (S.ph === "drive" && c.x > 150) c.rot = -0.42;
            if (S.ph === "air") c.rot = Math.atan2(S.vy, S.vx) * 0.6;
          },
        },
        {
          id: "hang", name: { en: "Apex Hang", ko: "꼭대기에서 머묾" }, param: "g × .35 near peak",
          cap: { en: "Ease gravity near the *top*. Let them enjoy it.", ko: "*꼭대기*에선 중력을 줄여 잠깐 떠 있게." },
          update(w) { const S = w.S; if (S.ph === "air" && Math.abs(S.vy) < 260) S.g = 0.35; },
        },
        {
          id: "cam", name: { en: "Camera Follow", ko: "카메라 따라가기" }, param: "35% of height",
          cap: { en: "Let the camera *rise* with the car.", ko: "카메라도 차를 따라 *같이 올라가요*." },
          update(w) { const c = w.car; w.cam.ty = c.oy * 0.35; w.cam.tx = (c.x - 270) * 0.2; },
        },
        {
          id: "shadow", name: { en: "Shrinking Shadow", ko: "작아지는 그림자" }, param: "scale ∝ height",
          cap: { en: "Keep the *shadow* on the ground. It shows height.", ko: "*그림자*는 바닥에. 높이가 한눈에 보여요." },
          update(w) { w.S.shadow = true; w.car.noShadow = true; },
        },
        {
          id: "land", name: { en: "Touchdown", ko: "착지 반동" }, param: "squash .75 + dust",
          cap: { en: "*Squash* and puff dust on touchdown.", ko: "착지하면 *눌리고* 먼지가 퍽." },
          land(w) { const c = w.car; c.sy = 0.75; c.sx = 1.12; dust(w, c.x - 40, G, 6, -1); dust(w, c.x + 40, G, 6, 1); w.shake(0.2); },
        },
        {
          id: "score", name: { en: "Airtime Score", ko: "체공 점수" }, param: "AIR 0.8s",
          cap: { en: "Reward the hang time with a *number*.", ko: "떠 있던 시간을 *숫자*로 보상해요." },
          land(w, S) { pop(w, `AIR ${S.air.toFixed(1)}s`, w.car.x, G - 120, 26, "#c6f432"); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh / thud",
          cap: { en: "Engine *cuts out* in the air, *thud* on landing.", ko: "공중에선 *조용히*, 착지에 *쿵*." },
          launch(w) { w.sfx.jump(); w.sfx.swish(); },
          land(w) { w.sfx.thud(); },
        },
      ],
    },

    /* 10 ─ 거친 착지 */
    {
      id: "racing-hard-landing", cat: "racing", view: "3d",
      title: { en: "Land jumps with *weight*", ko: "착지에 *무게* 싣기" },
      intro: { en: "Big drop. Lands like a *feather*.", ko: "높이 떨어졌는데 *깃털*처럼 내려와요." },
      interval: 1.5, stepDur: 3.6,
      setup(w) { w.S = { dist: 0, py: 0, vy: 0, air: false, k: 0, kv: 0, sx: 1, sy: 1, hops: 0 }; },
      fire(w) { const S = w.S; S.air = true; S.vy = -560; S.hops = 0; },
      update(w, dt) {
        const S = w.S; S.dist += 15 * dt;
        if (S.air) {
          S.vy += 1500 * dt; S.py += S.vy * dt;
          if (S.py >= 0) { S.py = 0; S.air = false; w.emit("land", S); S.hops++; }
        }
        S.kv += (-S.k * 420 - S.kv * 9) * dt; S.k += S.kv * dt;
        S.sy = 1 - S.k; S.sx = 1 + S.k * 0.5;
      },
      drawFloor(w, ctx) { road3d(ctx, w.S); drawMe(ctx, w.S); },
      steps: [
        {
          id: "squash", name: { en: "Suspension Squash", ko: "서스펜션 눌림" }, param: "spring k 420",
          cap: { en: "The body *sinks* on the springs, then rebounds.", ko: "차체가 스프링에 *푹* 눌렸다 튀어요." },
          land(w, S) { S.kv = S.hops ? 2.5 : 6; },
        },
        {
          id: "sparks", name: { en: "Chassis Scrape", ko: "바닥 긁힘" }, param: "24 sparks · flat fan",
          cap: { en: "The underside *scrapes* the road. Sparks fan out.", ko: "바닥이 *긁히며* 불꽃이 부채꼴로." },
          land(w, S) {
            if (S.hops > 0) return;
            for (let i = 0; i < 24; i++) { const s = pick([-1, 1]); w.spawn({ type: "spark", x: 270 + rand(-50, 50), y: 334, vx: s * rand(250, 700), vy: rand(-160, 20), g: 600, drag: 2, life: rand(0.25, 0.5), size: 2.6, color: "255,200,110" }); }
          },
        },
        {
          id: "dust", name: { en: "Dust Burst", ko: "먼지 폭발" }, param: "10 puffs · sideways",
          cap: { en: "Dust *bursts sideways* from the wheels.", ko: "바퀴 옆으로 먼지가 *확* 퍼져요." },
          land(w, S) { const n = S.hops ? 3 : 8; dust(w, 200, 336, n, -1, "190,180,160"); dust(w, 340, 336, n, 1, "190,180,160"); },
        },
        {
          id: "kick", name: { en: "Camera Slam", ko: "화면 쿵" }, param: "18px down · .35",
          cap: { en: "Slam the camera *down* with it.", ko: "화면도 같이 *아래로 쿵*." },
          land(w, S) { const k = S.hops ? 0.4 : 1; w.kick(0, 18 * k); w.shake(0.35 * k); },
        },
        {
          id: "ring", name: { en: "Shock Ring", ko: "충격 고리" }, param: "flat ring r 200",
          cap: { en: "A flat *shock ring* spreads across the asphalt.", ko: "노면 위로 납작한 *충격파*가 퍼져요." },
          land(w, S) { if (!S.hops) w.spawn({ type: "ring", x: 270, y: 336, size: 30, size1: 220, flat: true, life: 0.4, w: 10, color: "255,255,255" }); },
        },
        {
          id: "hop", name: { en: "Second Bounce", ko: "한 번 더 통" }, param: "hop 25%",
          cap: { en: "A small *second hop*. Real things bounce.", ko: "작게 *한 번 더 통*. 진짜 물건은 튀어요." },
          land(w, S) { if (S.hops === 0) w.after(0.02, () => { S.air = true; S.vy = -150; }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slam + scrape",
          cap: { en: "A low *slam* with a metal *scrape* on top.", ko: "낮은 *쿵* 위에 쇠 *긁는 소리*." },
          land(w, S) { if (S.hops) w.sfx.land(); else { w.sfx.slam(); w.sfx.scrape(); } },
        },
      ],
    },

    /* 11 ─ 비포장 흙먼지 */
    {
      id: "racing-offroad", cat: "racing", view: "top",
      title: { en: "Make dirt feel *dirty*", ko: "흙길을 *흙길답게*" },
      intro: { en: "Rally car on dirt. Looks like *ice*.", ko: "흙길 랠리인데 *빙판* 같아요." },
      interval: 1.4, stepDur: 3.6,
      setup(w) {
        carTop("y");
        w.S = { a: 0, speed: 1, gas: 0, tT: 0, wob: 0, x: 445, y: 186, h: Math.PI / 2 + 0.3, rocks: [...Array(14)].map(() => ({ x: rand(30, 510), y: rand(40, 330), r: rand(4, 10) })) };
        w.S.rx = w.S.x - Math.cos(w.S.h) * 34; w.S.ry = w.S.y - Math.sin(w.S.h) * 34;
      },
      fire(w) { w.S.gas = 0.8; w.emit("gas", w.S); },
      update(w, dt) {
        const S = w.S;
        S.gas = Math.max(0, S.gas - dt);
        S.speed += ((S.gas > 0 ? 2 : 1) - S.speed) * Math.min(1, dt * 3);
        S.a += 1.4 * S.speed * dt;
        S.x = 270 + Math.cos(S.a) * 175; S.y = 186 + Math.sin(S.a) * 96;
        S.h = Math.atan2(Math.cos(S.a) * 96, -Math.sin(S.a) * 175) + 0.3;
        S.rx = S.x - Math.cos(S.h) * 34; S.ry = S.y - Math.sin(S.h) * 34;
        S.wob *= Math.max(0, 1 - dt * 6);
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#3a2d20"; ctx.fillRect(-60, -60, 660, 480);
        ctx.fillStyle = "#4a3a29"; ctx.beginPath(); ctx.ellipse(270, 186, 215, 130, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#3a2d20"; ctx.beginPath(); ctx.ellipse(270, 186, 130, 56, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2f4a22"; ctx.beginPath(); ctx.ellipse(270, 186, 110, 40, 0, 0, TAU); ctx.fill();
        for (const r of w.S.rocks) { ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.fill(); }
      },
      drawFront(w, ctx) { const S = w.S; drawImg(ctx, SPR["racing-ct-y"].c, S.x, S.y, 92, S.h + S.wob, 1, 1, true); },
      steps: [
        {
          id: "dust", name: { en: "Dust Trail", ko: "흙먼지 꼬리" }, param: "∝ speed",
          cap: { en: "A *dust trail* that grows with speed.", ko: "속도만큼 커지는 *흙먼지 꼬리*." },
          update(w) {
            const S = w.S;
            if (Math.random() < 0.3 * S.speed) w.spawn({ type: "smoke", x: S.rx, y: S.ry, vx: rand(-30, 30), vy: rand(-30, 30), drag: 1, size: 6, size1: 17 * S.speed, life: 0.8, color: "118,90,60" });
          },
        },
        {
          id: "tracks", name: { en: "Tire Tracks", ko: "바퀴 자국" }, param: "decal · 3s",
          cap: { en: "Leave *tracks* in the dirt. The ground remembers.", ko: "흙에 *자국*을 남겨요. 땅이 기억해요." },
          update(w) {
            const S = w.S, nx = -Math.sin(S.h) * 15, ny = Math.cos(S.h) * 15;
            for (const s of [-1, 1]) w.spawn({ type: "circle", x: S.rx + nx * s, y: S.ry + ny * s, size: 3.5, life: 2.2, hold: true, under: true, color: "38,28,18" });
          },
        },
        {
          id: "rocks", name: { en: "Flying Pebbles", ko: "튀는 자갈" }, param: "floor friction 4",
          cap: { en: "Spit *pebbles* out the back. They skid and stop.", ko: "뒤로 *자갈*이 튀고 미끄러져 멈춰요." },
          update(w) {
            const S = w.S; if (Math.random() > 0.3 * S.speed) return;
            const a = S.h + Math.PI + rand(-0.5, 0.5), v = rand(150, 320) * S.speed;
            w.spawn({ type: "chunk", x: S.rx, y: S.ry, vx: Math.cos(a) * v, vy: Math.sin(a) * v, floor: 4, vr: rand(-10, 10), life: 1, size: rand(2, 4), color: "120,96,70", hold: true });
          },
        },
        {
          id: "wobble", name: { en: "Body Wobble", ko: "차체 출렁임" }, param: "±5° random bumps",
          cap: { en: "Random *bumps* jostle the car's angle.", ko: "울퉁불퉁 *덜컹덜컹* 각도가 흔들려요." },
          update(w) { if (Math.random() < 0.08) w.S.wob = rand(-0.1, 0.1); },
        },
        {
          id: "roost", name: { en: "Throttle Roost", ko: "가속 흙 폭발" }, param: "18 clods · cone",
          cap: { en: "Floor it and the wheels *throw dirt* in a cone.", ko: "밟으면 바퀴가 흙을 *촤악* 뿌려요." },
          gas(w, S) {
            for (let i = 0; i < 18; i++) { const a = S.h + Math.PI + rand(-0.6, 0.6), v = rand(250, 600); w.spawn({ type: "chunk", x: S.rx, y: S.ry, vx: Math.cos(a) * v, vy: Math.sin(a) * v, floor: 3, vr: rand(-12, 12), life: 1.2, size: rand(3, 6), color: pick(["120,90,60", "150,116,80"]), hold: true }); }
            w.spawn({ type: "smoke", x: S.rx, y: S.ry, size: 16, size1: 40, life: 0.7, color: "140,108,74" });
          },
        },
        {
          id: "rumble", name: { en: "Camera Rumble", ko: "화면 진동" }, param: "trauma .18 on gas",
          cap: { en: "A *gritty rumble* while the throttle's down.", ko: "밟는 동안 *거칠게* 덜덜." },
          update(w) { if (w.S.gas > 0) w.trauma = Math.max(w.trauma, 0.18); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "gravel crunch",
          cap: { en: "A *gravel crunch* on throttle.", ko: "밟으면 *자갈 소리* 와르르." },
          gas(w) { w.sfx.rattle(); w.play(() => nz({ type: "lowpass", f: 900, f2: 300, dur: 0.6, vol: 0.4 })); },
        },
      ],
    },

    /* 12 ─ 번아웃 타이어 연기 */
    {
      id: "racing-burnout", cat: "racing", view: "side",
      title: { en: "Make burnouts *smoke*", ko: "번아웃에 *연기* 피우기" },
      intro: { en: "Wheels spinning. You'd *never* know.", ko: "바퀴가 헛도는데 *전혀* 모르겠어요." },
      interval: 1.8, stepDur: 4.0,
      setup(w) {
        carSide("w"); useActor("racing-carS-w", "racing-cs-w", 76, 240);
        w.car = w.actor("racing-carS-w", { home: 300 });
        w.S = { burn: 0, t: 0, blur: false, spin: 0 };
      },
      fire(w) { const S = w.S; S.burn = 1.2; S.t = 0; w.emit("start", S); },
      update(w, dt) {
        const S = w.S;
        if (S.burn > 0) { S.burn -= dt; S.t += dt; if (S.burn <= 0) w.emit("launch", S); }
        S.spin += dt * 40;
      },
      drawFloor(w, ctx) { sideRoad(ctx, 0); },
      drawFront(w, ctx) {
        const S = w.S, c = w.car; if (!S.blur || S.burn <= 0) return;
        const x = c.x + c.ox - c.w * 0.25, y = G - 13;
        ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) { const a = S.spin + i * 2.1; ctx.beginPath(); ctx.arc(x, y, 10, a, a + 1.2); ctx.stroke(); }
      },
      steps: [
        {
          id: "smoke", name: { en: "Smoke Pile", ko: "연기 쌓기" }, param: "grows · drifts back",
          cap: { en: "Smoke *piles up* and rolls backward.", ko: "연기가 *쌓이면서* 뒤로 굴러가요." },
          update(w) {
            const S = w.S, c = w.car; if (S.burn <= 0) return;
            w.spawn({ type: "smoke", x: c.x + c.ox - c.w * 0.25, y: G - 8, vx: rand(-220, -60), vy: rand(-80, -20), drag: 1.2, size: 7, size1: rand(16, 26) * (0.6 + S.t), life: rand(0.7, 1.1), color: "92,94,104" });
          },
        },
        {
          id: "blur", name: { en: "Wheel Blur", ko: "바퀴 블러" }, param: "3 arcs · 40 rad/s",
          cap: { en: "Draw *spin arcs* on the tire. Show it's turning.", ko: "타이어에 *회전 줄*을 그려 도는 걸 보여요." },
          update(w) { w.S.blur = true; },
        },
        {
          id: "shudder", name: { en: "Body Shudder", ko: "차체 떨림" }, param: "vib 2px · y",
          cap: { en: "The body *shudders* against the brakes.", ko: "브레이크에 버티며 차체가 *부르르*." },
          update(w) { if (w.S.burn > 0) { w.car.vib = 2; w.car.vibAxis = "y"; } },
        },
        {
          id: "bits", name: { en: "Rubber Bits", ko: "고무 조각" }, param: "40% / frame",
          cap: { en: "Fling *black rubber bits* behind.", ko: "뒤로 *검은 고무 조각*이 튀어요." },
          update(w) {
            const c = w.car; if (w.S.burn <= 0 || Math.random() > 0.4) return;
            w.spawn({ type: "chunk", x: c.x + c.ox - c.w * 0.25, y: G - 4, vx: rand(-420, -150), vy: rand(-260, -80), g: 1400, vr: rand(-20, 20), ground: true, bounce: 0.3, life: 1, size: rand(2, 3.5), color: "20,20,24", hold: true });
          },
        },
        {
          id: "heat", name: { en: "Glowing Tire", ko: "달아오른 타이어" }, param: "orange ∝ time",
          cap: { en: "The tire *glows hot* the longer it spins.", ko: "오래 돌수록 타이어가 *벌겋게*." },
          update(w) {
            const S = w.S, c = w.car; if (S.burn <= 0) return;
            w.spawn({ type: "glow", x: c.x + c.ox - c.w * 0.25, y: G - 4, size: 8 + S.t * 12, life: 0.06, color: "255,120,40", alpha: Math.min(1, S.t) });
          },
        },
        {
          id: "launch", name: { en: "Launch Snap", ko: "튀어 나가기" }, param: "+80px · zoom 6%",
          cap: { en: "Release! The car *snaps forward* out of the cloud.", ko: "놓는 순간 연기 속에서 *튀어 나가요*." },
          launch(w) { const c = w.car; c.ox += 80; c.k = 2.5; w.zoomPunch(0.06); dust(w, c.x - c.w * 0.3, G, 8, -1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "screech loop + roar",
          cap: { en: "A long *screech*, then a *roar* on launch.", ko: "길게 *끼이익*, 출발에 *부앙*." },
          start(w) { for (let i = 0; i < 5; i++) w.after(i * 0.22, () => w.sfx.skid()); },
          launch(w) { w.sfx.boost(); },
        },
      ],
    },

    /* 13 ─ 출발 카운트다운 */
    {
      id: "racing-countdown", cat: "racing", view: "3d",
      title: { en: "Make countdowns *tense*", ko: "카운트다운을 *긴장감* 있게" },
      intro: { en: "3, 2, 1, go. Reads like a *spreadsheet*.", ko: "3, 2, 1, 출발. *엑셀 표* 같아요." },
      interval: 3.2, stepDur: 4.2,
      setup(w) { w.S = { dist: 0, speed: 0, n: 0, beatT: 0, go: 0, lamps: 0, dim: 0, py: 0, run: false }; },
      fire(w) {
        const S = w.S; if (S.run) return;
        Object.assign(S, { run: true, speed: 0, go: 0, lamps: 0, dist: 0 });
        [3, 2, 1].forEach((n, i) => w.after(i * 0.6, () => { S.n = n; S.beatT = 0; S.lamps = 4 - n; w.emit("beat", n); }));
        w.after(1.8, () => { S.n = 0; S.go = 1; S.beatT = 0; S.lamps = 4; w.emit("go", S); });
        w.after(2.9, () => { S.run = false; S.go = 0; S.lamps = 0; });
      },
      update(w, dt) {
        const S = w.S; S.beatT += dt;
        S.speed += ((S.go > 0 ? 1 : 0) - S.speed) * Math.min(1, dt * 2.5);
        S.dist += 18 * S.speed * dt;
        S.py -= S.py * Math.min(1, dt * 14);
        S.dim += ((S.run && S.go === 0 ? 1 : 0) * (S.dimOn ? 1 : 0) - S.dim) * Math.min(1, dt * 6); S.dimOn = false;
      },
      drawFloor(w, ctx) {
        const S = w.S, P = road3d(ctx, S);
        for (const [x, z, c] of [[-1.2, 2.6, "b"], [1.2, 3.2, "r"]]) { const p = P(x, z + S.dist * 0.4); if (z + S.dist * 0.4 < 12) drawImg(ctx, carRear(c), p.x, p.y, 200 / (z + S.dist * 0.4)); }
        drawMe(ctx, S);
      },
      drawHud(w, ctx) {
        const S = w.S, punch = S.punch; S.punch = false;
        if (S.dim > 0.01) { ctx.fillStyle = `rgba(0,0,0,${S.dim * 0.45})`; ctx.fillRect(-40, -40, 620, 440); }
        if (S.lampsOn) {
          rr(ctx, 186, 44, 168, 40, 12, "rgba(8,9,12,0.9)");
          for (let i = 0; i < 4; i++) {
            const lit = i < S.lamps, col = S.lamps >= 4 ? "74,222,128" : "239,68,68";
            if (lit) glow(ctx, 210 + i * 40, 64, 26, col, 0.6);
            ctx.fillStyle = lit ? `rgb(${col})` : "#262a33"; ctx.beginPath(); ctx.arc(210 + i * 40, 64, 12, 0, TAU); ctx.fill();
          }
        }
        S.lampsOn = false;
        if (!S.run) return;
        const txt = S.n ? String(S.n) : S.go ? "GO!" : "";
        if (!txt || S.beatT > 0.55 && S.n) return;
        const k = Math.min(1, S.beatT / 0.25), sc = punch ? 2.2 - 1.2 * E.back(k) : 1;
        ctx.save(); ctx.translate(270, 150); ctx.scale(sc, sc);
        ctx.lineWidth = 8; ctx.strokeStyle = "rgba(10,12,20,0.9)"; ctx.font = "900 64px Pretendard, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeText(txt, 0, 0); label(ctx, txt, 0, 0, 64, S.go ? "#4ade80" : "#fff", "center", "Pretendard, sans-serif", 900);
        ctx.restore();
      },
      steps: [
        {
          id: "punch", name: { en: "Number Punch", ko: "숫자 펀치" }, param: "2.2× → 1 · back",
          cap: { en: "Each number *slams in* big, then settles.", ko: "숫자마다 *크게 쾅* 박히고 자리 잡아요." },
          update(w) { w.S.punch = true; },
        },
        {
          id: "lamps", name: { en: "Start Lights", ko: "출발 신호등" }, param: "4 lamps · red → green",
          cap: { en: "Light *lamps* one by one. Then all *green*.", ko: "불이 *하나씩* 켜지다 전부 *초록*." },
          update(w) { w.S.lampsOn = true; },
        },
        {
          id: "dim", name: { en: "Focus Dim", ko: "주변 어둡게" }, param: "dark .45 until GO",
          cap: { en: "Dim the world while counting. *Hold your breath.*", ko: "세는 동안 어둡게. *숨 참는* 시간이에요." },
          update(w) { w.S.dimOn = true; },
        },
        {
          id: "rev", name: { en: "Engine Rev", ko: "엔진 공회전" }, param: "hop 6px · puff",
          cap: { en: "The car *revs* on every beat.", ko: "박자마다 차가 *부릉* 들썩여요." },
          beat(w, n) { w.S.py = -6; w.spawn({ type: "smoke", x: rand(240, 300), y: 320, vy: -40, size: 8, size1: 30, life: 0.6, color: "180,180,190" }); },
        },
        {
          id: "ring", name: { en: "Beat Ring", ko: "박자 고리" }, param: "ring r 40 → 120",
          cap: { en: "A *ring* pulses out on each beat.", ko: "박자마다 *고리*가 퍼져요." },
          beat(w) { w.spawn({ type: "ring", x: 270, y: 150, size: 40, size1: 120, life: 0.4, w: 6, color: "255,255,255" }); },
        },
        {
          id: "go", name: { en: "GO Burst", ko: "출발 폭발" }, param: "green flash · sparks",
          cap: { en: "On GO: green *flash*, sparks, everybody *launches*.", ko: "GO! 초록 *번쩍*, 불꽃, 모두 *출발*." },
          go(w) {
            w.flash("74,222,128", 0.4); w.zoomPunch(0.08); w.kick(0, 10);
            sparks(w, 270, 150, 24, "134,239,172", [300, 700]);
            w.spawn({ type: "ring", x: 270, y: 150, size: 50, size1: 240, life: 0.45, w: 10, color: "134,239,172" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "low ×3 · high ×1",
          cap: { en: "Three *low beeps*, one *high*. Everyone knows it.", ko: "*낮게 세 번*, *높게 한 번*. 다 아는 소리." },
          beat(w) { w.play(() => tn({ type: "square", f: 440, dur: 0.18, vol: 0.18 })); },
          go(w) { w.play(() => tn({ type: "square", f: 880, dur: 0.45, vol: 0.2 })); w.sfx.boost(); },
        },
      ],
    },

    /* 14 ─ 추월 */
    {
      id: "racing-overtake", cat: "racing", view: "top",
      title: { en: "Make overtakes *thrilling*", ko: "추월을 *짜릿하게*" },
      intro: { en: "You pass. It's like *changing lanes*.", ko: "추월했는데 *차선 변경* 같아요." },
      interval: 2.4, stepDur: 4.0,
      setup(w) {
        carTop("w"); carTop("r");
        useActor("racing-carT-w", "racing-ct-w", 46, 110); useActor("racing-carT-r", "racing-ct-r", 46, 320);
        ACTOR["racing-carT-w"].top = true; ACTOR["racing-carT-r"].top = true;
        w.me = w.actor("racing-carT-w", { home: 110, gy: 228 }); w.foe = w.actor("racing-carT-r", { home: 320, gy: 228 });
        w.S = { dist: 0, ph: "idle", t: 0, side: false, lean: false };
      },
      fire(w) {
        const S = w.S; if (S.ph === "pass") return;
        if (S.ph === "after") { w.foe.x = 320; w.me.x = 110; w.me.gy = 228; }
        S.ph = "pass"; S.t = 0; S.side = false;
      },
      update(w, dt) {
        const S = w.S, me = w.me, f = w.foe;
        S.dist += 500 * dt; S.t += dt;
        const y0 = me.gy;
        if (S.ph === "pass") {
          me.gy += ((S.t < 0.75 ? 140 : 228) - me.gy) * Math.min(1, dt * 7);
          me.x += (S.t < 0.95 ? 420 : 0) * dt;
          if (!S.side && me.x > f.x - 30) { S.side = true; w.emit("side", S); }
          if (me.x > f.x + 110 && S.ph === "pass") { S.ph = "after"; S.t = 0; w.emit("pass", S); }
        } else if (S.ph === "after") {
          me.gy += (228 - me.gy) * Math.min(1, dt * 7);
          f.x -= 260 * dt; me.x += (110 - me.x) * Math.min(1, dt * 1.2);
          if (S.t > 1.1) { S.ph = "idle"; f.x = 620; }
        } else {
          f.x += (320 - f.x) * Math.min(1, dt * 2.5); me.x += (110 - me.x) * Math.min(1, dt * 2);
        }
        me.rot = S.lean ? (me.gy - y0) / dt * 0.0016 : 0; S.lean = false;
        f.rot -= f.rot * Math.min(1, dt * 5);
      },
      drawFloor(w, ctx) {
        const d = w.S.dist;
        ctx.fillStyle = "#1c2a1a"; ctx.fillRect(-60, -60, 660, 480);
        ctx.fillStyle = "#2a2c34"; ctx.fillRect(-60, 92, 660, 182);
        ctx.fillStyle = "#e5e7eb"; ctx.fillRect(-60, 92, 660, 4); ctx.fillRect(-60, 270, 660, 4);
        for (let x = -((d) % 80) - 60; x < 620; x += 80) ctx.fillRect(x, 182, 40, 4);
        ctx.fillStyle = "#dc2626";
        for (let x = -((d) % 40) - 60; x < 620; x += 40) { ctx.fillRect(x, 84, 20, 8); ctx.fillRect(x, 274, 20, 8); }
      },
      steps: [
        {
          id: "lean", name: { en: "Lean Into It", ko: "기울며 차선 변경" }, param: "rot ∝ lateral speed",
          cap: { en: "Angle the car *into* the lane change.", ko: "차선을 바꿀 때 차를 *그쪽으로 틀어요*." },
          update(w) { w.S.lean = true; },
        },
        {
          id: "slow", name: { en: "Side-by-side Slow-mo", ko: "나란히 슬로모션" }, param: "0.35× · 500ms",
          cap: { en: "Slow down when you're *door to door*.", ko: "*문짝끼리 나란할 때* 시간을 늦춰요." },
          side(w) { w.slowmo(0.35, 0.5); },
        },
        {
          id: "streaks", name: { en: "Near-miss Streaks", ko: "아슬아슬 바람줄" }, param: "air between cars",
          cap: { en: "Air *streaks* squeeze between the two cars.", ko: "두 차 사이로 *바람줄*이 쭉쭉." },
          update(w) {
            const S = w.S; if (S.ph !== "pass") return;
            for (let i = 0; i < 2; i++) w.spawn({ type: "spark", x: w.me.x + rand(-20, 60), y: (w.me.gy + w.foe.gy) / 2 + rand(-12, 12), vx: -1600, vy: 0, life: 0.18, size: 1.6, color: "255,255,255" });
          },
        },
        {
          id: "rival", name: { en: "Rival Wobble", ko: "상대 휘청" }, param: "rot ±10° · vib",
          cap: { en: "The rival *wobbles* in your wake.", ko: "상대 차가 내 바람에 *휘청*." },
          pass(w) { w.foe.rot = 0.2; w.foe.vib = 4; },
        },
        {
          id: "lead", name: { en: "Camera Lead", ko: "카메라가 앞을 봄" }, param: "30% ahead",
          cap: { en: "The camera *leans ahead* during the move.", ko: "추월하는 동안 카메라가 *앞쪽을* 봐요." },
          update(w) { w.cam.tx = w.S.ph === "pass" ? (w.me.x - 110) * 0.3 : 0; },
        },
        {
          id: "text", name: { en: "OVERTAKE Pop", ko: "추월 글자" }, param: "+100 · lime",
          cap: { en: "Name the move: *OVERTAKE +100*.", ko: "*OVERTAKE +100*. 이름을 붙여줘요." },
          pass(w) { const x = Math.min(420, w.me.x); pop(w, "OVERTAKE", x, w.me.gy - 54, 30, "#c6f432", 1.2); pop(w, "+100", x, w.me.gy - 24, 20, "#fff", 1.2); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "doppler whoosh + blip",
          cap: { en: "A *doppler whoosh* past, then a *ding*.", ko: "*휘이잉* 지나가고, *딩*." },
          side(w) { w.play(() => nz({ type: "bandpass", f: 2400, f2: 500, q: 2, dur: 0.5, vol: 0.35 })); },
          pass(w) { w.sfx.chime(4); },
        },
      ],
    },

    /* 15 ─ 전복 */
    {
      id: "racing-crash-tumble", cat: "racing", view: "side",
      title: { en: "Make crashes *tumble*", ko: "사고를 *데굴데굴* 구르게" },
      intro: { en: "Full speed into a wall. It just *stops*.", ko: "전속력으로 벽에 박았는데 그냥 *멈춰요*." },
      interval: 2.8, stepDur: 4.2,
      setup(w) {
        carSide("w"); useActor("racing-carS-w", "racing-cs-w", 76, 240);
        w.car = w.actor("racing-carS-w", { home: 200 });
        w.S = { ph: "idle", vx: 0, vy: 0, spin: 0 };
      },
      fire(w) {
        const S = w.S, c = w.car;
        S.ph = "drive"; S.id = (S.id || 0) + 1; c.x = 200; c.oy = 0; c.rot = 0; c.alpha = 1;
      },
      update(w, dt) {
        const S = w.S, c = w.car;
        if (S.ph === "drive") {
          c.x += 800 * dt;
          if (c.x + c.w * 0.4 >= 466) { c.x = 466 - c.w * 0.4; S.ph = "hit"; S.vx = 0; S.vy = 0; S.spin = 0; c.ox = -18; c.rot = -0.06; w.emit("crash", { x: 466, y: G - 34 }); const id = S.id; w.after(1.5, () => { if (S.id === id) w.tween(c, { alpha: 0 }, 0.25, "lin", () => { if (S.id !== id) return; S.ph = "idle"; c.x = 200; c.oy = 0; c.rot = 0; c.alpha = 1; }); }); }
        } else if (S.ph === "hit") {
          S.vy += 1500 * dt; c.x += S.vx * dt; c.oy += S.vy * dt; c.rot += S.spin * dt;
          if (c.oy > 0) {
            c.oy = 0;
            if (Math.abs(S.vy) > 220) { S.vy *= -0.45; S.vx *= 0.7; S.spin *= 0.6; w.emit("bounce", { x: c.x, y: G }); }
            else { S.vy = 0; S.vx *= 0.9; S.spin = 0; c.rot += (Math.round(c.rot / Math.PI) * Math.PI - c.rot) * Math.min(1, dt * 10); }
          }
        }
      },
      drawFloor(w, ctx) { sideRoad(ctx, 0); },
      drawBack(w, ctx) {
        rr(ctx, 466, G - 74, 40, 74, 4, "#9ca3af");
        ctx.fillStyle = "#dc2626"; for (let i = 0; i < 3; i++) ctx.fillRect(466, G - 66 + i * 22, 40, 9);
      },
      steps: [
        {
          id: "stop", name: { en: "Impact Freeze", ko: "충돌 정지" }, param: "120ms",
          cap: { en: "Freeze on impact. *Let it sink in.*", ko: "부딪히는 순간 정지. *실감할 틈*을 줘요." },
          crash(w) { w.hitstop(0.12); w.car.flash = 1; },
        },
        {
          id: "tumble", name: { en: "Physics Tumble", ko: "물리 구르기" }, param: "spin −11 · bounce .45",
          cap: { en: "Don't stop dead. *Flip* it backward and bounce.", ko: "멈추지 말고 뒤로 *뒤집혀* 튀게." },
          crash(w) { Object.assign(w.S, { vx: -180, vy: -640, spin: -11 }); },
        },
        {
          id: "sparks", name: { en: "Wall Sparks", ko: "벽 불꽃" }, param: "26 sparks + flash",
          cap: { en: "A burst of *sparks* off the barrier.", ko: "방호벽에서 *불꽃*이 확." },
          crash(w, h) { sparks(w, h.x, h.y, 26, "255,210,120", [250, 800], Math.PI * 0.5, Math.PI * 1.5); w.spawn({ type: "glow", x: h.x, y: h.y, size: 90, size1: 20, life: 0.2, color: "255,230,180" }); },
        },
        {
          id: "parts", name: { en: "Parts Fly Off", ko: "부품이 날아감" }, param: "wheel + 10 bits",
          cap: { en: "A *wheel* and panels break loose.", ko: "*바퀴*와 차체 조각이 떨어져 나가요." },
          crash(w, h) {
            w.spawn({ type: "circle", x: h.x - 20, y: h.y, vx: -260, vy: -700, g: 1500, ground: true, bounce: 0.5, life: 2, size: 11, color: "30,30,36", hold: true });
            for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: h.x, y: h.y, vx: rand(-500, -50), vy: rand(-700, -200), g: 1500, vr: rand(-20, 20), ground: true, bounce: 0.4, life: 1.8, size: rand(4, 9), color: pick(["246,244,240", "150,150,160", "160,220,255"]), hold: true });
          },
        },
        {
          id: "dust", name: { en: "Dust Every Bounce", ko: "구를 때마다 먼지" }, param: "6 puffs / bounce",
          cap: { en: "Every *bounce* kicks up dust.", ko: "*튈 때마다* 먼지가 퍽퍽." },
          bounce(w, b) { dust(w, b.x, G, 6, 0); w.shake(0.2); },
        },
        {
          id: "slow", name: { en: "Slow-mo", ko: "슬로모션" }, param: "0.3× · 800ms",
          cap: { en: "*Slow-mo* through the first flip.", ko: "첫 회전은 *슬로모션*으로." },
          crash(w) { w.slowmo(0.3, 0.8); },
        },
        {
          id: "shake", name: { en: "Big Shake", ko: "큰 흔들림" }, param: "trauma .6",
          cap: { en: "*Shake hard* toward the wall.", ko: "벽 쪽으로 *세게 흔들어요*." },
          crash(w) { w.shake(0.6, 1); w.zoomPunch(0.06); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crash + thunks",
          cap: { en: "One big *crash*, then *thunks* on each bounce.", ko: "큰 *쾅*, 튈 때마다 *쿵쿵*." },
          crash(w) { w.sfx.boom(); w.sfx.crit(); },
          bounce(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 16 ─ 축구 슛 */
    {
      id: "sports-soccer-kick", cat: "racing", view: "side",
      title: { en: "Make kicks feel *powerful*", ko: "슛에 *힘* 싣기" },
      intro: { en: "The ball just *leaves*. No foot behind it.", ko: "공이 그냥 *날아가요*. 발 힘이 없어요." },
      interval: 1.5, stepDur: 3.6,
      setup(w) {
        w.hero = w.actor("hero", { home: 140, h: 130 });
        w.S = { ball: { x: 205, y: G - 14, vx: 0, vy: 0, rot: 0, sx: 1, sy: 1 }, fly: false, id: 0, delay: 0 };
      },
      fire(w) {
        const S = w.S, b = S.ball, id = ++S.id;
        Object.assign(b, { x: 205, y: G - 14, vx: 0, vy: 0, sx: 1, sy: 1 }); S.fly = false; S.delay = 0;
        w.emit("load", S);
        const kick = () => {
          if (S.id !== id) return;
          b.vx = 640; b.vy = -320; S.fly = true; w.hero.ox += 34; w.hero.rot = 0.22;
          w.emit("kick", { x: b.x - 6, y: b.y });
        };
        if (S.delay > 0) w.after(S.delay, kick); else kick();
      },
      update(w, dt) {
        const S = w.S, b = S.ball, h = w.hero;
        h.rot -= h.rot * Math.min(1, dt * 7);
        if (S.fly) {
          b.vy += 520 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vx * dt * 0.03;
          if (b.x > 500 && b.vx > 0) { b.vx *= -0.15; w.emit("net", b); }
          if (b.y > G - 14) { b.y = G - 14; b.vy *= -0.4; b.vx *= 0.7; }
        }
        b.sx += (1 - b.sx) * Math.min(1, dt * 10); b.sy += (1 - b.sy) * Math.min(1, dt * 10);
        S.net = Math.max(0, (S.net || 0) - dt * 2);
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1b3a22"; ctx.fillRect(-80, G, 900, 120);
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(-80, G - 1, 900, 2);
        const n = w.S.net || 0;
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5;
        for (let i = 0; i <= 8; i++) { const y = G - 130 + i * 16.25; ctx.beginPath(); ctx.moveTo(470, y); ctx.quadraticCurveTo(512 + n * 18, y, 520 + n * 10, y + 4); ctx.stroke(); }
        ctx.fillStyle = "#e5e7eb"; ctx.fillRect(466, G - 134, 8, 134); ctx.fillRect(466, G - 134, 60, 6);
      },
      drawFront(w, ctx) {
        const b = w.S.ball;
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(b.x, G + 2, 14, 4, 0, 0, TAU); ctx.fill();
        drawBall(ctx, "soccer", b, 14);
      },
      steps: [
        {
          id: "windup", name: { en: "Wind-up", ko: "예비 동작" }, param: "lean back 160ms",
          cap: { en: "*Lean back* before the kick. Load the spring.", ko: "차기 전에 *뒤로 젖혀요*. 힘을 모아요." },
          load(w, S) { w.hero.rot = -0.16; w.hero.ox -= 16; S.delay = 0.16; },
        },
        {
          id: "squash", name: { en: "Ball Squash", ko: "공 찌그러짐" }, param: "1.5 × 0.65",
          cap: { en: "The ball *squashes* flat against the foot.", ko: "발에 맞는 순간 공이 *납작*." },
          kick(w) { w.S.ball.sx = 1.5; w.S.ball.sy = 0.65; },
        },
        {
          id: "stop", name: { en: "Contact Freeze", ko: "맞는 순간 멈칫" }, param: "70ms",
          cap: { en: "Freeze *70ms* at contact. Feel the foot.", ko: "닿는 순간 *0.07초* 멈춰요." },
          kick(w) { w.hitstop(0.07); },
        },
        {
          id: "star", name: { en: "Impact Star", ko: "충격 별" }, param: "star + ring",
          cap: { en: "A white *star* and ring mark the strike.", ko: "하얀 *별*과 고리로 타격 지점을 찍어요." },
          kick(w, p) {
            w.spawn({ type: "star", x: p.x, y: p.y, size: 34, life: 0.14, color: "255,255,255" });
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 60, life: 0.25, w: 6, color: "255,255,255" });
          },
        },
        {
          id: "trail", name: { en: "Ball Trail", ko: "공 꼬리" }, param: "streak 2 / frame",
          cap: { en: "A *trail* shows how fast it's going.", ko: "*꼬리*가 속도를 보여줘요." },
          update(w) {
            const S = w.S, b = S.ball; if (!S.fly) return;
            w.spawn({ type: "glow", x: b.x, y: b.y, size: 16, size1: 3, life: 0.6, color: "198,244,50" });
            w.spawn({ type: "spark", x: b.x, y: b.y + rand(-8, 8), vx: -b.vx * 0.3, vy: -b.vy * 0.3, life: 0.3, size: 2, color: "255,255,255" });
          },
        },
        {
          id: "net", name: { en: "Net Ripple", ko: "그물 출렁" }, param: "bulge 18px",
          cap: { en: "The net *bulges*. The shot lands somewhere.", ko: "그물이 *출렁*. 슛이 어딘가에 닿아요." },
          net(w) { w.S.net = 1; },
        },
        {
          id: "shake", name: { en: "Kick Punch", ko: "킥 펀치" }, param: "trauma .2 · +4%",
          cap: { en: "A tiny *shake* and zoom on contact.", ko: "맞을 때 살짝 *흔들고 줌*." },
          kick(w) { w.shake(0.2, 1); w.zoomPunch(0.04); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "thump + whoosh",
          cap: { en: "A leathery *thump*, then a *whoosh*.", ko: "가죽 *퍽*, 그리고 *휙*." },
          kick(w) { w.sfx.thunk(); w.sfx.swish(); },
        },
      ],
    },

    /* 17 ─ 골 그물 */
    {
      id: "sports-goal-net", cat: "racing", view: "side",
      title: { en: "Make the net *catch* the ball", ko: "그물이 공을 *받아내게*" },
      intro: { en: "Goal! The net is a *painting*.", ko: "골인! 그런데 그물이 *그림* 같아요." },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        const d = [], v = [];
        for (let r = 0; r < 9; r++) { d.push(Array(9).fill(0)); v.push(Array(9).fill(0)); }
        w.S = { d, v, ripple: false, ball: { x: -40, y: G - 60, vx: 0, vy: 0, rot: 0, sx: 1, sy: 1 }, ph: "idle", hr: 4, rattle: 0 };
      },
      fire(w) {
        const S = w.S;
        Object.assign(S.ball, { x: 30, y: G - 50, vx: 1000, vy: -120, sx: 1, sy: 1 }); S.ph = "fly";
      },
      update(w, dt) {
        const S = w.S, b = S.ball, d = S.d, v = S.v, h = dt / 4;
        for (let it = 0; it < 4; it++) {
          for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
            let a = -d[r][c] * 160 - v[r][c] * 5;
            if (S.ripple) a += 500 * ((d[r - 1] ? d[r - 1][c] : 0) + (d[r + 1] ? d[r + 1][c] : 0) + (d[r][c - 1] || 0) + (d[r][c + 1] || 0) - 4 * d[r][c]);
            v[r][c] += a * h;
          }
          for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { d[r][c] += v[r][c] * h; if (c === 0 || r === 0) d[r][c] = 0; }
        }
        S.ripple = false; S.rattle = Math.max(0, S.rattle - dt * 2);
        if (S.ph === "fly") {
          b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 300 * dt; b.rot += 14 * dt;
          if (b.x >= 452) { S.ph = "net"; S.hr = Math.max(1, Math.min(7, Math.round((b.y - (G - 150)) / 18.75))); w.emit("net", { x: b.x, y: b.y, r: S.hr }); }
        } else if (S.ph === "net") {
          b.x = 452 + Math.max(0, d[S.hr][8]); b.vy += 900 * dt; b.y = Math.min(G - 14, b.y + b.vy * dt * 0.4);
          if (d[S.hr][8] < 2 && b.y >= G - 14) S.ph = "rest";
        }
        b.sx += (1 - b.sx) * Math.min(1, dt * 8); b.sy += (1 - b.sy) * Math.min(1, dt * 8);
      },
      drawFloor(w, ctx) {
        const S = w.S, d = S.d, px = (r, c) => 340 + c * 16 + d[r][c] * (c / 8), py = r => G - 150 + r * 18.75;
        ctx.fillStyle = "#1b3a22"; ctx.fillRect(-80, G, 700, 120);
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(-80, G - 1, 700, 2);
        ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.4;
        for (let r = 0; r < 9; r++) { ctx.beginPath(); for (let c = 0; c < 9; c++) ctx[c ? "lineTo" : "moveTo"](px(r, c), py(r)); ctx.stroke(); }
        for (let c = 1; c < 9; c++) { ctx.beginPath(); for (let r = 0; r < 9; r++) ctx[r ? "lineTo" : "moveTo"](px(r, c), py(r)); ctx.lineTo(px(8, c), G); ctx.stroke(); }
        const sh = Math.sin(w.time * 60) * S.rattle * 4;
        ctx.fillStyle = "#f1f5f9"; ctx.fillRect(334 + sh, G - 156, 10, 156); ctx.fillRect(334 + sh, G - 156, 150, 8);
      },
      drawFront(w, ctx) { const b = w.S.ball; if (b.x > -20) drawBall(ctx, "soccer", b, 15); },
      steps: [
        {
          id: "bulge", name: { en: "Net Bulge", ko: "그물 불룩" }, param: "push 900 · falloff",
          cap: { en: "The net *bulges* out where the ball hits.", ko: "공 맞은 자리가 *불룩* 튀어나와요." },
          net(w, h) {
            const S = w.S;
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) S.v[r][c] += 1500 * Math.exp(-((r - h.r) ** 2 + (c - 8) ** 2) / 6);
          },
        },
        {
          id: "ripple", name: { en: "Ripple Spread", ko: "물결 번짐" }, param: "neighbor springs 500",
          cap: { en: "Let the push *ripple* across the whole mesh.", ko: "그 힘이 그물 전체로 *출렁출렁* 번져요." },
          update(w) { w.S.ripple = true; },
        },
        {
          id: "squash", name: { en: "Ball Squash", ko: "공 찌그러짐" }, param: "0.6 × 1.4",
          cap: { en: "The ball *flattens* into the net.", ko: "공이 그물에 *납작* 박혀요." },
          net(w, h) {
            w.S.ball.sx = 0.6; w.S.ball.sy = 1.4;
            w.spawn({ type: "ring", x: h.x, y: h.y, size: 12, size1: 80, life: 0.35, w: 6, color: "255,255,255" });
          },
        },
        {
          id: "slow", name: { en: "Slow-mo Catch", ko: "슬로모션" }, param: "0.3× · 600ms",
          cap: { en: "*Slow down* the moment the net catches it.", ko: "그물이 받는 순간 *느리게*." },
          net(w) { w.slowmo(0.3, 0.6); },
        },
        {
          id: "rattle", name: { en: "Frame Rattle", ko: "골대 떨림" }, param: "±4px · 500ms",
          cap: { en: "The *goal frame* rattles from the force.", ko: "충격에 *골대*까지 덜덜." },
          net(w) {
            w.S.rattle = 1;
            for (let i = 0; i < 12; i++) w.spawn({ type: "chunk", x: rand(340, 480), y: G - 152, vx: rand(-60, 60), vy: rand(-80, 40), g: 700, vr: rand(-10, 10), size: rand(2, 3.5), life: 0.8, color: "226,232,240" });
          },
        },
        {
          id: "shake", name: { en: "Screen Kick", ko: "화면 반동" }, param: "trauma .3 → right",
          cap: { en: "Kick the screen *toward* the goal.", ko: "화면을 *골대 쪽으로* 툭." },
          net(w) { w.shake(0.3, 1); w.zoomPunch(0.05); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish + thump",
          cap: { en: "A soft *swish* of net, a dull *thump*.", ko: "그물 *쉭*, 둔한 *퍽*." },
          net(w) { w.sfx.thunk(); w.play(() => nz({ type: "bandpass", f: 3000, f2: 1200, q: 1, dur: 0.35, vol: 0.3 })); },
        },
      ],
    },

    /* 18 ─ 농구 클린슛 */
    {
      id: "sports-basketball", cat: "racing", view: "side",
      title: { en: "Make swishes *satisfying*", ko: "클린슛을 *시원하게*" },
      intro: { en: "Nothing but net. Nothing *happens*.", ko: "림도 안 건드린 슛. 아무 *반응이 없어요*." },
      interval: 1.8, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 80, h: 120 });
        w.S = { ball: { x: -50, y: 0, vx: 0, vy: 0, rot: 0 }, ph: "idle", net: 0, nv: 0, rim: 0, near: false, swing: 0 };
      },
      fire(w) {
        const S = w.S;
        Object.assign(S.ball, { x: 112, y: G - 120, vx: 335, vy: -470 }); S.ph = "fly"; S.near = false;
        w.hero.sy = 1.12; w.hero.sx = 0.9;
      },
      update(w, dt) {
        const S = w.S, b = S.ball;
        if (S.ph !== "idle") {
          b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += 6 * dt;
          if (S.ph === "fly" && !S.near && b.vy > 0 && b.x > 360) { S.near = true; w.emit("near", S); }
          if (S.ph === "fly" && b.vy > 0 && b.y >= 132) { S.ph = "down"; b.vx = 30; w.emit("swish", { x: 440, y: 140 }); }
          if (b.y > G - 15) { b.y = G - 15; b.vy *= -0.5; }
        }
        S.nv += (-S.net * 220 - S.nv * 7) * dt; S.net += S.nv * dt;
        S.rim = Math.max(0, S.rim - dt * 2.5);
      },
      drawBack(w, ctx) {
        const S = w.S;
        ctx.fillStyle = "#cbd5e1"; ctx.fillRect(494, 40, 8, 240);
        rr(ctx, 480, 70, 14, 90, 3, "#e2e8f0");
        if (S.rim > 0) glow(ctx, 440, 132, 60, "251,146,60", S.rim);
        const st = 1 + S.net * 0.8, sw = S.net * 6;
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1.6;
        for (let i = 0; i <= 4; i++) {
          const x0 = 410 + i * 15, x1 = 424 + i * 8 + sw;
          ctx.beginPath(); ctx.moveTo(x0, 132); ctx.lineTo(x1, 132 + 38 * st); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x0, 132); ctx.lineTo(424 + (4 - i) * 8 + sw, 132 + 38 * st); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(424 + sw, 132 + 38 * st); ctx.lineTo(456 + sw, 132 + 38 * st); ctx.stroke();
      },
      drawFront(w, ctx) {
        const S = w.S;
        if (S.ph !== "idle") drawBall(ctx, "bball", S.ball, 15);
        ctx.strokeStyle = "#f97316"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(406, 132); ctx.lineTo(480, 132); ctx.stroke();
      },
      steps: [
        {
          id: "arc", name: { en: "Arc Trail", ko: "포물선 자취" }, param: "dots · 800ms",
          cap: { en: "Leave a *dotted arc*. Show the shot's shape.", ko: "*점선 포물선*으로 슛 모양을 남겨요." },
          update(w) { const S = w.S; if (S.ph === "fly" && w.frames % 2) w.spawn({ type: "glow", x: S.ball.x, y: S.ball.y, size: 7, life: 0.8, hold: true, color: "251,191,36" }); },
        },
        {
          id: "net", name: { en: "Net Whip", ko: "그물 휘날림" }, param: "stretch .8 · spring",
          cap: { en: "The net *stretches* and whips back.", ko: "그물이 *쭉 늘어났다* 튕겨 올라가요." },
          swish(w) { w.S.nv = 7; },
        },
        {
          id: "rim", name: { en: "Rim Glow", ko: "림 빛" }, param: "orange glow 400ms",
          cap: { en: "The rim *lights up* as the ball drops in.", ko: "공이 들어가는 순간 림이 *환하게*." },
          swish(w, p) { w.S.rim = 1; w.spawn({ type: "ring", x: p.x, y: p.y - 6, size: 20, size1: 70, flat: true, life: 0.4, w: 5, color: "253,186,116" }); },
        },
        {
          id: "slow", name: { en: "Slow at the Rim", ko: "림 앞 슬로모션" }, param: "0.35× · 500ms",
          cap: { en: "*Slow time* just before it drops. Suspense.", ko: "들어가기 직전 *느리게*. 두근두근." },
          near(w) { w.slowmo(0.35, 0.5); },
        },
        {
          id: "sparkle", name: { en: "Swish Sparkles", ko: "반짝 가루" }, param: "8 stars",
          cap: { en: "Sparkles *rain* out of the net.", ko: "그물 아래로 반짝이가 *톡톡*." },
          swish(w, p) { for (let i = 0; i < 8; i++) w.spawn({ type: "star", x: p.x + rand(-20, 20), y: p.y + 30, vx: rand(-120, 120), vy: rand(-60, 140), g: 200, life: 0.9, size: rand(5, 9), color: "255,236,170" }); },
        },
        {
          id: "text", name: { en: "+3 Pop", ko: "+3 점수" }, param: "36px · rise",
          cap: { en: "Pop the *points* right at the hoop.", ko: "림 바로 위에 *점수*를 톡." },
          swish(w) { pop(w, "+3", 440, 90, 38, "#fbbf24", 1.2); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish",
          cap: { en: "The *swish*. Breathy, short, perfect.", ko: "*촥*. 짧고 시원하게." },
          swish(w) { w.play(() => nz({ type: "highpass", f: 2400, f2: 5000, dur: 0.22, vol: 0.4 })); w.sfx.chime(5); },
        },
      ],
    },

    /* 19 ─ 골프 파워 게이지 */
    {
      id: "sports-golf-power", cat: "racing", view: "side",
      title: { en: "Make power meters *juicy*", ko: "파워 게이지에 *맛* 내기" },
      intro: { en: "A grey bar fills up. Then a ball moves.", ko: "회색 막대가 차고, 공이 움직여요. *끝*." },
      interval: 1.7, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 130, h: 130 });
        w.S = { ph: "idle", p: 0, a: 1.57, ball: { x: 172, y: G - 6, vx: 0, vy: 0 }, lock: 0, zone: false, grad: false };
      },
      fire(w) {
        const S = w.S;
        Object.assign(S, { ph: "fill", p: 0, a: 1.57, lock: 0, target: rand(0.88, 0.93) });
        Object.assign(S.ball, { x: 172, y: G - 6, vx: 0, vy: 0 }); S.fly = false;
      },
      update(w, dt) {
        const S = w.S, b = S.ball;
        if (S.ph === "fill") {
          S.p = Math.min(S.target, S.p + dt * 2.1); S.a = 1.57 + 2.4 * S.p;
          if (S.p >= S.target) { S.ph = "swing"; w.emit("lock", S); }
        } else if (S.ph === "swing") {
          const a0 = S.a; S.a -= dt * 26;
          if (a0 > 1.57 && S.a <= 1.57) { b.vx = 900 * S.p; b.vy = -520 * S.p; S.fly = true; w.emit("hit", { x: b.x, y: b.y }); }
          if (S.a < -0.9) { S.a = -0.9; S.ph = "done"; }
        }
        if (S.fly) { b.vy += 300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; }
        S.lock = Math.max(0, S.lock - dt * 2);
      },
      drawFront(w, ctx) {
        const S = w.S, px = 140, py = G - 96, L = 96;
        ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(S.a) * L, py + Math.sin(S.a) * L); ctx.stroke();
        ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.arc(px + Math.cos(S.a) * L, py + Math.sin(S.a) * L, 6, 0, TAU); ctx.fill();
        if (S.ball.x < 600) drawBall(ctx, "golf", S.ball, 6);
      },
      drawHud(w, ctx) {
        const S = w.S, x = 240, y = 66, W = 270, H = 20;
        rr(ctx, x - 4, y - 4, W + 8, H + 8, 8, "rgba(0,0,0,0.6)");
        if (S.zone) { const pu = 0.5 + 0.5 * Math.sin(w.time * 12); rr(ctx, x + W * 0.86, y - 2, W * 0.09, H + 4, 4, `rgba(198,244,50,${0.35 + pu * 0.4})`); }
        if (S.grad) {
          const g = ctx.createLinearGradient(x, 0, x + W, 0); g.addColorStop(0, "#22c55e"); g.addColorStop(0.6, "#facc15"); g.addColorStop(1, "#ef4444");
          ctx.fillStyle = g; ctx.fillRect(x, y, W * S.p, H);
          if (S.ph === "fill") glow(ctx, x + W * S.p, y + H / 2, 22, "255,255,255", 0.8);
        } else { ctx.fillStyle = "#64748b"; ctx.fillRect(x, y, W * S.p, H); }
        if (S.lock > 0) { ctx.fillStyle = `rgba(255,255,255,${S.lock})`; ctx.fillRect(x, y, W * S.p, H); }
        ctx.fillStyle = "#fff"; ctx.fillRect(x + W * S.p - 2, y - 6, 4, H + 12);
        label(ctx, "POWER", x, y + 38, 12, "rgba(255,255,255,0.6)", "left", "'JetBrains Mono', monospace", 700);
        label(ctx, `${Math.round(S.p * 100)}%`, x + W, y + 38, 13, "#fff", "right", "'JetBrains Mono', monospace", 800);
        S.zone = false; S.grad = false;
      },
      steps: [
        {
          id: "grad", name: { en: "Heat Gradient", ko: "온도 그라데이션" }, param: "green → red + edge",
          cap: { en: "Fill with *heat colors* and a glowing edge.", ko: "*초록→빨강*으로 차오르고 끝이 빛나요." },
          update(w) { w.S.grad = true; },
        },
        {
          id: "zone", name: { en: "Sweet Spot", ko: "최적 구간" }, param: "86–95% · pulse",
          cap: { en: "Mark the *sweet spot* so they know where to stop.", ko: "*멈출 자리*를 미리 보여줘요." },
          update(w) { w.S.zone = true; },
        },
        {
          id: "lock", name: { en: "Lock Flash", ko: "고정 번쩍" }, param: "white 500ms",
          cap: { en: "Flash the bar *white* when it locks.", ko: "멈추는 순간 막대가 *하얗게* 번쩍." },
          lock(w) { w.S.lock = 1; sparks(w, 240 + 270 * w.S.p, 76, 10, "255,255,255", [120, 300]); },
        },
        {
          id: "text", name: { en: "PERFECT!", ko: "PERFECT!" }, param: "lime · 1.2s",
          cap: { en: "Name the result: *PERFECT!*", ko: "결과에 이름을: *PERFECT!*" },
          lock(w) { pop(w, "PERFECT!", 375, 132, 30, "#c6f432", 1.0); },
        },
        {
          id: "smear", name: { en: "Swing Smear", ko: "스윙 잔상" }, param: "arc 180°",
          cap: { en: "A *smear arc* traces the club head.", ko: "클럽 헤드 궤적에 *잔상 호*를 그려요." },
          lock(w) { w.spawn({ type: "arc", x: 140, y: G - 96, size: 96, a0: -0.9, a1: 3.4, life: 0.3, color: "226,232,240" }); },
        },
        {
          id: "launch", name: { en: "Launch Burst", ko: "발사 폭발" }, param: "star + trail",
          cap: { en: "A *star* at contact, a *trail* behind the ball.", ko: "맞는 곳에 *별*, 공 뒤엔 *꼬리*." },
          hit(w, p) { w.spawn({ type: "star", x: p.x, y: p.y, size: 30, life: 0.2, color: "255,255,255" }); w.hitstop(0.06); },
          update(w) {
            const b = w.S.ball; if (!w.S.fly) return;
            w.spawn({ type: "glow", x: b.x, y: b.y, size: 10, size1: 2, life: 0.5, color: "198,244,50" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising tone + click",
          cap: { en: "A *rising tone* while filling, a crisp *tick* on hit.", ko: "차오르며 *음이 올라가고*, 맞을 때 *딱*." },
          lock(w) { w.sfx.blip(10); },
          hit(w) { w.sfx.ping(); },
        },
      ],
    },

    /* 20 ─ 볼링 스트라이크 */
    {
      id: "sports-bowling", cat: "racing", view: "3d",
      title: { en: "Make strikes *explode*", ko: "스트라이크를 *팡* 터지게" },
      intro: { en: "Strike. The pins just *vanish*.", ko: "스트라이크인데 핀이 *사라질* 뿐." },
      interval: 1.8, stepDur: 4.0,
      setup(w) {
        sprite("racing-pin", 40, 110, x => {
          x.fillStyle = lg(x, 4, 0, 36, 0, [[0, "#ffffff"], [1, "#cbd5e1"]]);
          x.beginPath(); x.moveTo(20, 4); x.bezierCurveTo(30, 4, 30, 26, 25, 36); x.bezierCurveTo(40, 58, 38, 96, 30, 106); x.lineTo(10, 106); x.bezierCurveTo(2, 96, 0, 58, 15, 36); x.bezierCurveTo(10, 26, 10, 4, 20, 4); x.fill();
          x.fillStyle = "#dc2626"; x.fillRect(12, 28, 16, 4); x.fillRect(12, 35, 16, 4);
        });
        w.S = { ball: { z: 2, x: 0, on: false }, pins: [], phys: false };
        w.R.rack(w);
      },
      rack(w) {
        const P = [];
        [[0], [-0.5, 0.5], [-1, 0, 1], [-1.5, -0.5, 0.5, 1.5]].forEach((row, r) => row.forEach(c => P.push({ x: c * 0.14, z: 4.5 + r * 0.25, h: 0, vx: 0, vh: 0, vz: 0, rot: 0, vr: 0, alpha: 1, down: false })));
        w.S.pins = P;
      },
      fire(w) { w.R.rack(w); Object.assign(w.S.ball, { z: 1.25, on: true }); },
      update(w, dt) {
        const S = w.S, b = S.ball;
        if (b.on) {
          b.z += 9 * dt;
          if (b.z >= 4.4) {
            b.on = false;
            for (const p of S.pins) Object.assign(p, { down: true, vx: p.x * 9 + rand(-0.6, 0.6), vh: rand(1.5, 3.5), vz: rand(0.5, 2.5), vr: rand(-14, 14) });
            w.emit("strike", S);
          }
        }
        for (const p of S.pins) {
          if (!p.down) continue;
          if (S.phys) { p.vh -= 6 * dt; p.x += p.vx * dt; p.h += p.vh * dt; p.z += p.vz * dt; p.rot += p.vr * dt; if (p.h < 0) { p.h = 0; p.vh *= -0.3; p.vx *= 0.6; p.vz *= 0.6; } }
          else { p.rot += ((p.vr > 0 ? 1.5 : -1.5) - p.rot) * Math.min(1, dt * 12); p.alpha = Math.max(0, p.alpha - dt * 1.5); }
        }
      },
      drawFloor(w, ctx) {
        const S = w.S, f = 520, hy = 90, ch = 0.7, P = (x, z, h = 0) => ({ x: 270 + x * f / z, y: hy + (ch - h) * f / z });
        ctx.fillStyle = "#0e1016"; ctx.fillRect(-60, -60, 660, 480);
        quad(ctx, P(-0.75, 1), P(0.75, 1), P(0.75, 6), P(-0.75, 6), "#3b2a1a");
        quad(ctx, P(-0.62, 1), P(0.62, 1), P(0.62, 6), P(-0.62, 6), "#c08a4f");
        for (let i = -4; i <= 4; i++) { const a = P(i * 0.13, 1), c = P(i * 0.13, 6); ctx.strokeStyle = "rgba(90,50,20,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
        quad(ctx, P(-0.75, 6), P(0.75, 6), P(0.75, 6, 1.1), P(-0.75, 6, 1.1), "#16181f");
        const items = S.pins.map(p => ({ z: p.z, p })); if (S.ball.on) items.push({ z: S.ball.z, b: S.ball });
        items.sort((a, b) => b.z - a.z);
        for (const it of items) {
          if (it.b) { const q = P(0, it.z, 0.11); const r = 0.11 * f / it.z; ctx.drawImage(ballSpr("bowl"), q.x - r, q.y - r, r * 2, r * 2); continue; }
          const p = it.p; if (p.alpha <= 0) continue;
          const q = P(p.x, p.z, p.h), hh = 0.38 * f / p.z;
          drawImg(ctx, SPR["racing-pin"].c, q.x, q.y, hh * 0.36, p.rot, 1, 1, false, p.alpha);
        }
      },
      steps: [
        {
          id: "scatter", name: { en: "Pin Scatter", ko: "핀이 튀어 오름" }, param: "physics · spin",
          cap: { en: "Pins don't vanish. They *fly* and *spin*.", ko: "핀은 사라지지 않아요. *날아가고 돌아요*." },
          update(w) { w.S.phys = true; },
        },
        {
          id: "stop", name: { en: "Impact Hitstop", ko: "충돌 멈칫" }, param: "90ms",
          cap: { en: "Freeze *90ms* on impact. Let it land.", ko: "부딪히는 순간 *0.09초* 멈춰요." },
          strike(w) { w.hitstop(0.09); },
        },
        {
          id: "flash", name: { en: "Impact Flash", ko: "충돌 섬광" }, param: "glow + star",
          cap: { en: "A white *flash* where ball meets pins.", ko: "공과 핀이 만나는 곳에 *번쩍*." },
          strike(w) { w.spawn({ type: "glow", x: 270, y: 160, size: 110, size1: 20, life: 0.3, color: "255,240,210" }); w.spawn({ type: "star", x: 270, y: 160, size: 40, life: 0.18, color: "255,255,255" }); },
        },
        {
          id: "zoom", name: { en: "Zoom Punch", ko: "줌 펀치" }, param: "+10% → back",
          cap: { en: "*Punch in* on the pins for a beat.", ko: "핀 쪽으로 *확 당겼다* 돌아와요." },
          strike(w) { w.zoomPunch(0.1); w.shake(0.25); },
        },
        {
          id: "chips", name: { en: "Splinters", ko: "나무 파편" }, param: "14 chips",
          cap: { en: "Tiny *splinters* add crunch.", ko: "작은 *파편*이 바삭함을 더해요." },
          strike(w) { for (let i = 0; i < 14; i++) w.spawn({ type: "chunk", x: 270, y: 160, vx: rand(-360, 360), vy: rand(-420, -60), g: 1000, vr: rand(-20, 20), life: 0.9, size: rand(2, 4), color: pick(["255,255,255", "220,38,38", "230,200,160"]) }); },
        },
        {
          id: "text", name: { en: "STRIKE!", ko: "STRIKE!" }, param: "rays + 56px",
          cap: { en: "Celebrate with a *word* and spinning rays.", ko: "*글자*와 도는 빛줄기로 축하해요." },
          strike(w) {
            w.spawn({ type: "rays", x: 270, y: 72, size: 150, n: 12, vr: 1, life: 1.4, hold: true, color: "250,204,21" });
            w.spawn({ type: "text", text: "STRIKE!", x: 270, y: 72, size: 52, color: "#facc15", life: 1.4 });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "boom + clatter",
          cap: { en: "A low *boom*, then wooden *clatter*.", ko: "낮은 *쿵*, 이어서 *와르르*." },
          strike(w) { w.sfx.thud(); w.sfx.rattle(); w.play(() => { for (let i = 0; i < 6; i++) tn({ f: rand(500, 900), f2: 300, dur: 0.06, vol: 0.15, delay: 0.05 + i * 0.05 }); }); },
        },
      ],
    },

    /* 21 ─ 야구 홈런 */
    {
      id: "sports-home-run", cat: "racing", view: "side",
      title: { en: "Make home runs *legendary*", ko: "홈런을 *전설*처럼" },
      intro: { en: "Out of the park. Feels like a *foul tip*.", ko: "장외 홈런인데 *파울* 느낌이에요." },
      interval: 1.8, stepDur: 4.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 140, h: 130 });
        w.S = { ph: "idle", a: -2.3, ball: { x: 600, y: G - 72, vx: 0, vy: 0, rot: 0 }, follow: false };
      },
      fire(w) {
        const S = w.S;
        Object.assign(S, { ph: "pitch", a: -2.3 }); Object.assign(S.ball, { x: 560, y: G - 74, vx: -720, vy: 0 });
        w.cam.tx = 0; w.cam.ty = 0;
      },
      update(w, dt) {
        const S = w.S, b = S.ball;
        if (S.ph !== "idle") { b.x += b.vx * dt; b.y += b.vy * dt; b.rot += 10 * dt; }
        if (S.ph === "pitch" && b.x < 318) S.ph = "swing";
        if (S.ph === "swing") {
          const a0 = S.a; S.a += 20 * dt;
          if (a0 < 0 && S.a >= 0) { S.ph = "hit"; b.vx = 760; b.vy = -780; w.emit("hit", { x: b.x, y: b.y }); }
        }
        if (S.ph === "hit") { b.vy += 420 * dt; S.a = Math.min(1.3, S.a + 20 * dt); }
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1d3b1f"; ctx.fillRect(-80, G, 900, 160);
        ctx.fillStyle = "#6b4a2b"; ctx.beginPath(); ctx.ellipse(170, G + 14, 120, 14, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillRect(-80, G - 1, 900, 2);
        ctx.fillStyle = "#14161d"; ctx.fillRect(-80, 60, 900, 120);
        for (let x = -60; x < 820; x += 18) { ctx.fillStyle = "#232734"; ctx.beginPath(); ctx.arc(x + (x % 36 ? 0 : 9), 150 + ((x / 18) % 3) * 10, 7, 0, TAU); ctx.fill(); }
      },
      drawFront(w, ctx) {
        const S = w.S, h = w.hero, px = h.x + h.ox + 22, py = G - 74;
        ctx.save(); ctx.translate(px, py); ctx.rotate(S.a);
        ctx.fillStyle = "#c08a4f"; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(78, -6); ctx.lineTo(82, 0); ctx.lineTo(78, 6); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (S.ph !== "idle") drawBall(ctx, "base", S.ball, 8);
      },
      steps: [
        {
          id: "smear", name: { en: "Bat Smear", ko: "배트 잔상" }, param: "arc 140°",
          cap: { en: "Draw the *swing path*. Fast things blur.", ko: "*스윙 궤적*을 그려요. 빠른 건 번져요." },
          hit(w) { const h = w.hero; w.spawn({ type: "arc", x: h.x + h.ox + 22, y: G - 74, size: 80, a0: -1.6, a1: 0.9, life: 0.25, color: "255,236,200" }); },
        },
        {
          id: "stop", name: { en: "Crack Hitstop", ko: "딱! 멈춤" }, param: "120ms",
          cap: { en: "Freeze *120ms* on the crack. Sweet spot.", ko: "*딱* 소리에 0.12초 멈춰요." },
          hit(w) { w.hitstop(0.12); },
        },
        {
          id: "burst", name: { en: "Contact Burst", ko: "타격 폭발" }, param: "rays + ring",
          cap: { en: "A burst of *rays* off the sweet spot.", ko: "정타 지점에서 *빛줄기*가 팡." },
          hit(w, p) {
            w.spawn({ type: "rays", x: p.x, y: p.y, size: 120, n: 10, vr: 2, life: 0.35, color: "255,240,200" });
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 10, size1: 80, life: 0.3, w: 7, color: "255,255,255" });
          },
        },
        {
          id: "trail", name: { en: "Rocket Trail", ko: "로켓 꼬리" }, param: "glow 600ms",
          cap: { en: "The ball leaves a *rocket trail*.", ko: "공 뒤에 *로켓 꼬리*가 남아요." },
          update(w) { const S = w.S, b = S.ball; if (S.ph === "hit") w.spawn({ type: "glow", x: b.x, y: b.y, size: 16, size1: 3, life: 0.6, color: "255,190,90" }); },
        },
        {
          id: "cam", name: { en: "Camera Chase", ko: "카메라 추적" }, param: "follow up · 50%",
          cap: { en: "The camera *chases* it into the sky.", ko: "카메라가 하늘까지 *쫓아가요*." },
          update(w) { const b = w.S.ball; if (w.S.ph === "hit") { w.cam.tx = Math.min(170, (b.x - 240) * 0.5); w.cam.ty = Math.max(-150, (b.y - 200) * 0.5); } },
        },
        {
          id: "text", name: { en: "HOME RUN + Fireworks", ko: "홈런 글자 + 불꽃놀이" }, param: "after 350ms",
          cap: { en: "Call it out: *HOME RUN*, with fireworks.", ko: "*HOME RUN!* 불꽃놀이와 함께." },
          hit(w) {
            w.after(0.35, () => {
              w.spawn({ type: "text", text: "HOME RUN!", x: 270 + w.cam.x, y: 130 + w.cam.y, size: 50, color: "#facc15", life: 1.5 });
              firework(w, 150 + w.cam.x, 80 + w.cam.y, "244,63,94"); firework(w, 400 + w.cam.x, 70 + w.cam.y, "56,189,248");
            });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack + crowd",
          cap: { en: "A sharp *crack*, then the *crowd* rises.", ko: "날카로운 *딱*, 이어서 *함성*." },
          hit(w) { w.sfx.crit(); w.play(() => nz({ type: "bandpass", f: 900, f2: 1500, q: 0.6, dur: 1.4, vol: 0.3, delay: 0.15 })); },
        },
      ],
    },

    /* 22 ─ 테니스 스매시 */
    {
      id: "sports-tennis-smash", cat: "racing", view: "side",
      title: { en: "Make smashes *slam*", ko: "스매시를 *꽂히게*" },
      intro: { en: "Big smash. Lands like a *lob*.", ko: "스매시인데 *로브*처럼 떨어져요." },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 170, h: 120 });
        w.S = { ph: "idle", a: -2.0, ball: { x: -50, y: 0, vx: 0, vy: 0, rot: 0, sx: 1, sy: 1 }, id: 0 };
      },
      fire(w) {
        const S = w.S, h = w.hero, id = ++S.id;
        Object.assign(S, { ph: "fall", a: -2.0 }); Object.assign(S.ball, { x: 232, y: -30, vx: 0, vy: 380, sx: 1, sy: 1 });
        h.oy = 0; w.emit("jump", h);
        w.tween(h, { oy: -70 }, 0.28, "out", () => {
          if (S.id !== id) return;
          S.ph = "smash"; Object.assign(S.ball, { vx: 620, vy: 720 });
          w.emit("smash", { x: S.ball.x, y: S.ball.y });
          w.tween(h, { oy: 0 }, 0.3, "in");
        });
      },
      update(w, dt) {
        const S = w.S, b = S.ball;
        if (S.ph === "idle") return;
        b.x += b.vx * dt; b.y += b.vy * dt; b.rot += 12 * dt;
        if (S.ph === "smash") { S.a = Math.min(1.1, S.a + 24 * dt); if (b.y >= G - 7) { b.y = G - 7; S.ph = "out"; b.vy = -b.vy * 0.3; b.vx *= 0.8; w.emit("bounce", { x: b.x, y: G }); } }
        if (S.ph === "out") b.vy += 1000 * dt;
        b.sx += (1 - b.sx) * Math.min(1, dt * 8); b.sy += (1 - b.sy) * Math.min(1, dt * 8);
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#1e3a5f"; ctx.fillRect(-80, G, 900, 120);
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(-80, G - 1, 900, 3);
        ctx.fillStyle = "#cbd5e1"; ctx.fillRect(298, G - 50, 5, 50);
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
        for (let y = G - 46; y < G; y += 7) { ctx.beginPath(); ctx.moveTo(296, y); ctx.lineTo(305, y); ctx.stroke(); }
        ctx.fillStyle = "#f8fafc"; ctx.fillRect(292, G - 52, 17, 4);
      },
      drawFront(w, ctx) {
        const S = w.S, h = w.hero, px = h.x + h.ox + 12, py = G - 104 + h.oy;
        ctx.save(); ctx.translate(px, py); ctx.rotate(S.a);
        ctx.strokeStyle = "#334155"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, 0); ctx.stroke();
        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(52, 0, 18, 13, 0, 0, TAU); ctx.stroke();
        ctx.restore();
        if (S.ph !== "idle") drawBall(ctx, "tennis", S.ball, 8);
      },
      steps: [
        {
          id: "crouch", name: { en: "Crouch & Stretch", ko: "웅크렸다 뻗기" }, param: "0.8 → 1.2",
          cap: { en: "*Crouch*, then *stretch* into the jump.", ko: "*웅크렸다가* 쭉 *뻗으며* 점프." },
          jump(w, h) { h.sy = 0.78; h.sx = 1.15; w.after(0.07, () => { h.sy = 1.22; h.sx = 0.88; }); },
        },
        {
          id: "arc", name: { en: "Racket Arc", ko: "라켓 궤적" }, param: "arc 170°",
          cap: { en: "A bright *arc* where the racket swings.", ko: "라켓이 지나간 자리에 *빛나는 호*." },
          smash(w) { const h = w.hero; w.spawn({ type: "arc", x: h.x + h.ox + 12, y: G - 104 + h.oy, size: 54, a0: -2.2, a1: 1.1, life: 0.22, color: "217,249,157" }); },
        },
        {
          id: "stop", name: { en: "Hit Stop", ko: "멈칫" }, param: "80ms",
          cap: { en: "Hang in the air for *80ms* at contact.", ko: "맞는 순간 공중에서 *0.08초* 멈춰요." },
          smash(w) { w.hitstop(0.08); },
        },
        {
          id: "streak", name: { en: "Stretch + Streak", ko: "늘어남 + 줄" }, param: "2.2 × 0.6 · tail",
          cap: { en: "The ball *stretches* into a streak.", ko: "공이 *쭉 늘어나* 줄이 돼요." },
          smash(w) { w.S.ball.sx = 2.2; w.S.ball.sy = 0.6; },
          update(w) { const b = w.S.ball; if (w.S.ph === "smash") w.spawn({ type: "spark", x: b.x, y: b.y, vx: b.vx * 0.2, vy: b.vy * 0.2, life: 0.25, size: 4, color: "217,249,157" }); },
        },
        {
          id: "mark", name: { en: "Court Impact", ko: "코트 충격" }, param: "ring + dust + shake",
          cap: { en: "Hit the court with a *ring*, dust and a *shake*.", ko: "코트에 *고리*, 먼지, 그리고 *흔들림*." },
          bounce(w, p) {
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 8, size1: 90, flat: true, life: 0.4, w: 8, color: "255,255,255" });
            w.spawn({ type: "ellipse", x: p.x, y: p.y + 1, size: 34, life: 2.5, hold: true, color: "217,249,157" });
            dust(w, p.x, p.y, 6, 1, "200,220,255"); w.shake(0.3); w.kick(0, 8);
          },
        },
        {
          id: "bounce", name: { en: "Big Bounce", ko: "높게 튀기" }, param: "rebound × 3",
          cap: { en: "Bounce *high* and away. Unreturnable.", ko: "*높이* 튀어 나가요. 받을 수 없게." },
          bounce(w) { w.S.ball.vy *= 3; w.S.ball.vx *= 0.5; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pock + slam",
          cap: { en: "A hard *pock*, then a *slam* on the court.", ko: "단단한 *팍*, 코트에 *쾅*." },
          smash(w) { w.sfx.hit(1.4); w.sfx.swish(); },
          bounce(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 23 ─ 타이밍 게이지 */
    {
      id: "sports-timing-meter", cat: "racing", view: "ui",
      title: { en: "Make perfect timing *feel* perfect", ko: "완벽한 타이밍을 *완벽하게*" },
      intro: { en: "You nailed it. The game *shrugs*.", ko: "딱 맞췄는데 게임은 *시큰둥*." },
      interval: 1.1, stepDur: 3.8,
      setup(w) { w.S = { u: 0.5, ph: 0, hold: 0, want: null, last: null, show: 0, combo: 0, bump: 0, zone: false, k: 0 }; },
      fire(w) {
        const S = w.S, offs = [0.01, 0.07, 0.02, 0.16, 0.03, 0.32];
        S.want = 0.5 + offs[S.k++ % offs.length] * pick([-1, 1]); S.prev = S.u - S.want;
      },
      update(w, dt) {
        const S = w.S;
        if (S.hold > 0) S.hold -= dt; else { S.ph += dt * TAU / 1.2; S.u = 0.5 + 0.48 * Math.sin(S.ph); }
        if (S.want != null && S.hold <= 0) {
          const d = S.u - S.want;
          if (d * S.prev <= 0) {
            const e = Math.abs(S.u - 0.5), J = e < 0.04 ? ["PERFECT", "198,244,50"] : e < 0.1 ? ["GREAT", "56,189,248"] : e < 0.2 ? ["GOOD", "250,204,21"] : ["MISS", "239,68,68"];
            S.want = null; S.combo = J[0] === "MISS" ? 0 : S.combo + 1; S.last = { g: J[0], col: J[1], x: 70 + 400 * S.u, y: 186 }; S.show = 1.4;
            w.emit("judge", S.last);
          } else S.prev = d;
        }
        S.show = Math.max(0, S.show - dt); S.bump = Math.max(0, S.bump - dt * 4);
      },
      drawFloor(w, ctx) {
        const S = w.S, x = 70, W = 400, y = 172, H = 28, cx = x + W / 2;
        rr(ctx, x - 6, y - 6, W + 12, H + 12, 12, "rgba(255,255,255,0.06)");
        if (S.zone) {
          const pu = 0.5 + 0.5 * Math.sin(w.time * 8);
          ctx.fillStyle = "rgba(250,204,21,0.35)"; ctx.fillRect(cx - W * 0.2, y, W * 0.4, H);
          ctx.fillStyle = "rgba(56,189,248,0.5)"; ctx.fillRect(cx - W * 0.1, y, W * 0.2, H);
          glow(ctx, cx, y + H / 2, 40, "198,244,50", 0.3 + pu * 0.4);
          ctx.fillStyle = "#c6f432"; ctx.fillRect(cx - W * 0.04, y, W * 0.08, H);
        } else { ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(cx - W * 0.2, y, W * 0.4, H); }
        const nx = x + W * S.u, hot = S.hold > 0;
        ctx.fillStyle = hot ? "#fff" : "#e5e7eb"; ctx.fillRect(nx - 2.5, y - 14, 5, H + 28);
        ctx.beginPath(); ctx.moveTo(nx - 9, y - 22); ctx.lineTo(nx + 9, y - 22); ctx.lineTo(nx, y - 12); ctx.closePath(); ctx.fill();
        if (S.show > 0 && S.last && !S.big) label(ctx, S.last.g.toLowerCase(), 270, 120, 16, "rgba(255,255,255,0.6)");
        if (S.show > 0 && S.last && S.big) {
          const j = S.last, k = Math.min(1, (1.4 - S.show) / 0.15), sc = 1.6 - 0.6 * E.back(k), sz = j.g === "PERFECT" ? 50 : 36;
          ctx.save(); ctx.translate(270, 112); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, S.show * 3);
          ctx.lineWidth = 7; ctx.strokeStyle = "rgba(10,12,20,0.9)"; ctx.font = `800 ${sz}px Pretendard, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.strokeText(j.g, 0, 0); label(ctx, j.g, 0, 0, sz, `rgb(${j.col})`); ctx.restore();
        }
        if (S.comboOn && S.combo > 1) {
          const s = 1 + S.bump * 0.5;
          ctx.save(); ctx.translate(270, 262); ctx.scale(s, s); label(ctx, `${S.combo} COMBO`, 0, 0, 22, "#fff", "center", "'JetBrains Mono', monospace", 800); ctx.restore();
        }
        S.zone = false; S.big = false; S.comboOn = false;
      },
      steps: [
        {
          id: "zone", name: { en: "Tiered Zone", ko: "단계별 구간" }, param: "good · great · perfect",
          cap: { en: "Show *tiers* and pulse the perfect slice.", ko: "*단계*를 나누고 정중앙을 두근두근." },
          update(w) { w.S.zone = true; },
        },
        {
          id: "freeze", name: { en: "Needle Freeze", ko: "바늘 멈춤" }, param: "hold 350ms",
          cap: { en: "*Freeze* the needle where you pressed.", ko: "누른 자리에서 바늘을 *딱 멈춰요*." },
          judge(w) { w.S.hold = 0.35; },
        },
        {
          id: "grade", name: { en: "Graded Words", ko: "등급 글자" }, param: "color by grade",
          cap: { en: "Big *colored words*. Each grade looks different.", ko: "등급마다 다른 *색깔 글자*로 크게." },
          update(w) { w.S.big = true; },
        },
        {
          id: "burst", name: { en: "Needle Burst", ko: "바늘 폭발" }, param: "ring + 16 sparks",
          cap: { en: "Burst *sparks* right at the needle.", ko: "바늘 끝에서 *불꽃*이 팡." },
          judge(w, j) {
            if (j.g === "MISS") return;
            sparks(w, j.x, j.y, 16, j.col, [150, 450]);
            w.spawn({ type: "ring", x: j.x, y: j.y, size: 14, size1: 70, life: 0.35, w: 6, color: j.col });
          },
        },
        {
          id: "combo", name: { en: "Combo Counter", ko: "콤보 숫자" }, param: "bump 1.5×",
          cap: { en: "Count the streak. *Bump* it every hit.", ko: "연속 성공을 세고, 맞출 때마다 *톡*." },
          update(w) { w.S.comboOn = true; },
          judge(w) { w.S.bump = 1; },
        },
        {
          id: "shake", name: { en: "Punch / Wobble", ko: "펀치 / 흔들" }, param: "zoom on perfect",
          cap: { en: "*Zoom* on perfect. *Wobble* on a miss.", ko: "퍼펙트엔 *줌*, 실패엔 *도리도리*." },
          judge(w, j) { if (j.g === "PERFECT") w.zoomPunch(0.06); if (j.g === "MISS") w.kick(-16, 0); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch by grade",
          cap: { en: "Higher *pitch* for better grades.", ko: "잘할수록 *음이 높아요*." },
          judge(w, j) { if (j.g === "MISS") w.sfx.hurt(); else w.sfx.chime({ PERFECT: 12, GREAT: 7, GOOD: 0 }[j.g]); },
        },
      ],
    },

    /* 24 ─ 골 세리머니 */
    {
      id: "sports-celebration", cat: "racing", view: "side",
      title: { en: "Make goals feel like *goals*", ko: "골을 *골답게* 축하하기" },
      intro: { en: "Scored. The number changed. *That's it?*", ko: "골! 숫자만 바뀌었어요. *끝?*" },
      interval: 2.2, stepDur: 4.2,
      setup(w) {
        w.hero = w.actor("hero", { home: 270, h: 120 });
        w.S = { home: 0, roll: 0, board: 0, cheer: 0, heads: [...Array(26)].map((_, i) => ({ x: 14 + i * 20, row: i % 2, col: pick(["#334155", "#3f3f46", "#475569", "#52525b", "#1e3a5f"]) })) };
      },
      fire(w) { const S = w.S; S.home = (S.home + 1) % 10; S.roll = 0; w.emit("goal", S); },
      update(w, dt) { const S = w.S; S.board = Math.max(0, S.board - dt * 2); S.cheer = Math.max(0, S.cheer - dt); S.roll = Math.min(1, S.roll + dt * 5); },
      drawFloor(w, ctx) {
        const S = w.S;
        ctx.fillStyle = "#13151c"; ctx.fillRect(-80, 120, 700, 110);
        for (const h of S.heads) {
          const up = S.cheer > 0 ? Math.max(0, Math.sin(w.time * 12 - h.x * 0.03)) * 14 * Math.min(1, S.cheer) : 0, y = 168 + h.row * 22 - up;
          ctx.fillStyle = h.col; ctx.beginPath(); ctx.arc(h.x + h.row * 10, y, 9, 0, TAU); ctx.fill();
          ctx.fillRect(h.x + h.row * 10 - 11, y + 8, 22, 30);
        }
        ctx.fillStyle = "#1b3a22"; ctx.fillRect(-80, 230, 700, 140);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(-80, G - 1, 700, 2);
      },
      drawHud(w, ctx) {
        const S = w.S;
        rr(ctx, 186, 44, 168, 48, 10, S.board > 0 ? `rgba(198,244,50,${0.25 + S.board * 0.5})` : "rgba(8,9,12,0.85)");
        label(ctx, "HOME", 216, 68, 12, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
        label(ctx, "AWAY", 324, 68, 12, "rgba(255,255,255,0.6)", "center", "'JetBrains Mono', monospace", 700);
        label(ctx, ":", 270, 66, 24, "#fff", "center", "'JetBrains Mono', monospace", 800);
        label(ctx, "1", 296, 68, 26, "#fff", "center", "'JetBrains Mono', monospace", 800);
        ctx.save(); ctx.beginPath(); ctx.rect(234, 48, 30, 40); ctx.clip();
        if (S.rollOn && S.roll < 1) {
          const k = E.out(S.roll);
          label(ctx, String((S.home + 9) % 10), 250, 68 - k * 30, 26, "#fff", "center", "'JetBrains Mono', monospace", 800);
          label(ctx, String(S.home), 250, 98 - k * 30, 26, "#c6f432", "center", "'JetBrains Mono', monospace", 800);
        } else label(ctx, String(S.home), 250, 68, 26, "#fff", "center", "'JetBrains Mono', monospace", 800);
        ctx.restore(); S.rollOn = false;
      },
      steps: [
        {
          id: "roll", name: { en: "Score Roll", ko: "점수 굴리기" }, param: "slide 200ms + flash",
          cap: { en: "*Roll* the digit and flash the board.", ko: "숫자가 *굴러 올라가고* 전광판이 번쩍." },
          update(w) { w.S.rollOn = true; },
          goal(w) { w.S.board = 1; },
        },
        {
          id: "jump", name: { en: "Victory Jump", ko: "환호 점프" }, param: "squash · 90px",
          cap: { en: "The player *leaps*. Bodies sell joy.", ko: "선수가 *펄쩍*. 몸이 기쁨을 보여줘요." },
          goal(w) {
            const h = w.hero; h.sy = 0.75; h.sx = 1.2;
            w.tween(h, { oy: -90 }, 0.3, "out", () => w.tween(h, { oy: 0 }, 0.28, "in", () => { h.sy = 0.8; h.sx = 1.15; }));
          },
        },
        {
          id: "crowd", name: { en: "Crowd Wave", ko: "관중 파도" }, param: "bounce 2s",
          cap: { en: "The *crowd* jumps up in a wave.", ko: "*관중*이 파도처럼 들썩여요." },
          goal(w) { w.S.cheer = 2; },
        },
        {
          id: "flashes", name: { en: "Camera Flashes", ko: "카메라 플래시" }, param: "random · 2s",
          cap: { en: "Little *camera flashes* pop in the stands.", ko: "관중석에서 *플래시*가 반짝반짝." },
          update(w) {
            if (w.S.cheer <= 0 || Math.random() > 0.35) return;
            w.spawn({ type: "star", x: rand(20, 520), y: rand(150, 205), size: rand(6, 11), life: 0.18, color: "255,255,255" });
          },
        },
        {
          id: "text", name: { en: "GOAL! Slam", ko: "GOAL! 글자" }, param: "70px + rays",
          cap: { en: "*GOAL!* in giant letters with rays.", ko: "거대한 *GOAL!* 글자와 빛줄기." },
          goal(w) {
            w.spawn({ type: "rays", x: 270, y: 140, size: 190, n: 12, vr: 0.8, life: 1.6, hold: true, color: "198,244,50", alpha: 0.6 });
            w.spawn({ type: "text", text: "GOAL!", x: 270, y: 140, size: 72, color: "#c6f432", life: 1.6 });
          },
        },
        {
          id: "confetti", name: { en: "Confetti", ko: "꽃가루" }, param: "60 pieces",
          cap: { en: "Throw *confetti*. It's a party.", ko: "*꽃가루* 뿌려요. 잔치예요." },
          goal(w) { confetti(w, 60); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "fanfare + roar",
          cap: { en: "A *fanfare* over a swelling *roar*.", ko: "커지는 *함성* 위에 *빰빠밤*." },
          goal(w) { w.sfx.fanfare(); w.play(() => nz({ type: "bandpass", f: 700, f2: 1400, q: 0.5, dur: 1.8, vol: 0.35 })); },
        },
      ],
    },

    /* 25 ─ 스키 트릭 착지 */
    {
      id: "sports-ski-trick", cat: "racing", view: "side",
      title: { en: "Make trick landings *stick*", ko: "트릭 착지를 *딱* 꽂히게" },
      intro: { en: "Big air. Lands like a *cardboard cutout*.", ko: "크게 떴는데 *종이 인형*처럼 내려와요." },
      interval: 1.8, stepDur: 4.0,
      setup(w) { w.S = { ph: "idle", x: -60, y: 0, vx: 0, vy: 0, rot: 0.29, spin: 0, g: 1, sq: 1 }; },
      fire(w) { Object.assign(w.S, { ph: "ride", x: 110, vx: 260, vy: 0, spin: 0, rot: 0.29, sq: 1 }); },
      update(w, dt) {
        const S = w.S, gy = x => 150 + x * 0.3 - (x > 150 && x < 200 ? (x - 150) * 0.28 : 0);
        if (S.ph === "ride" || S.ph === "slide") {
          S.x += S.vx * dt; S.y = gy(S.x);
          S.rot = S.x > 150 && S.x < 200 && S.ph === "ride" ? 0.0 : 0.29;
          if (S.ph === "ride" && S.x >= 200) { S.ph = "air"; S.vy = -460; S.y = gy(199.9); w.emit("launch", S); }
        } else if (S.ph === "air") {
          S.vy += 1500 * S.g * dt; S.g = 1; S.x += S.vx * dt; S.y += S.vy * dt;
          if (S.y >= gy(S.x)) { S.y = gy(S.x); S.ph = "slide"; S.vx = 300; S.spin = 0; w.emit("land", S); }
        }
        S.sq += (1 - S.sq) * Math.min(1, dt * 10);
      },
      drawFloor(w, ctx) {
        ctx.fillStyle = "#e8eef7"; ctx.beginPath(); ctx.moveTo(-80, 150 - 24); ctx.lineTo(150, 195); ctx.lineTo(200, 196); ctx.lineTo(200, 210); ctx.lineTo(620, 336); ctx.lineTo(620, 420); ctx.lineTo(-80, 420); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#b8c4d6"; ctx.beginPath(); ctx.moveTo(150, 195); ctx.lineTo(200, 196); ctx.lineTo(200, 210); ctx.closePath(); ctx.fill();
        for (const [x, s] of [[60, 1], [330, 0.8], [470, 1.1]]) { const y = 150 + x * 0.3; ctx.fillStyle = "#1f3b2c"; ctx.beginPath(); ctx.moveTo(x, y - 60 * s); ctx.lineTo(x + 16 * s, y); ctx.lineTo(x - 16 * s, y); ctx.closePath(); ctx.fill(); }
      },
      drawFront(w, ctx) {
        const S = w.S; if (S.ph === "idle") return;
        ctx.save(); ctx.translate(S.x, S.y - 30); ctx.rotate(S.rot + S.spin); ctx.scale(1 / Math.sqrt(S.sq), S.sq);
        ctx.drawImage(SPR.hero.c, -20, -32, 42, 64);
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-28, 32); ctx.lineTo(30, 32); ctx.stroke();
        ctx.restore();
      },
      steps: [
        {
          id: "spin", name: { en: "Full Rotation", ko: "한 바퀴 회전" }, param: "360° in air",
          cap: { en: "A *full spin* in the air. That's the trick.", ko: "공중에서 *한 바퀴*. 이게 트릭이죠." },
          update(w, dt) { const S = w.S; if (S.ph === "air") S.spin = Math.max(-TAU, S.spin - dt * TAU / 0.66); },
        },
        {
          id: "trail", name: { en: "Snow Trail", ko: "눈 꼬리" }, param: "spray on ground",
          cap: { en: "Kick up a *snow trail* behind the skis.", ko: "스키 뒤로 *눈보라*가 흩날려요." },
          update(w) {
            const S = w.S; if (S.ph !== "ride" && S.ph !== "slide") return;
            w.spawn({ type: "smoke", x: S.x - 20, y: S.y, vx: rand(-120, -30), vy: rand(-90, -20), drag: 2, size: 4, size1: 14, life: 0.5, color: "255,255,255" });
          },
        },
        {
          id: "hang", name: { en: "Apex Hang", ko: "꼭대기 체공" }, param: "g × .4 near top",
          cap: { en: "Linger at the *top* so the spin reads.", ko: "*꼭대기*에서 잠깐 떠서 회전이 보이게." },
          update(w) { const S = w.S; if (S.ph === "air" && Math.abs(S.vy) < 220) S.g = 0.4; },
        },
        {
          id: "spray", name: { en: "Landing Spray", ko: "착지 눈보라" }, param: "14 puffs + chunks",
          cap: { en: "A big *spray of snow* on landing.", ko: "착지하면 *눈보라*가 촤악." },
          land(w, S) {
            for (let i = 0; i < 14; i++) w.spawn({ type: "smoke", x: S.x + rand(-20, 20), y: S.y, vx: rand(-60, 260), vy: rand(-260, -60), g: 400, drag: 2, size: 6, size1: rand(16, 28), life: rand(0.5, 0.9), color: "240,246,255" });
            for (let i = 0; i < 8; i++) w.spawn({ type: "chunk", x: S.x, y: S.y, vx: rand(0, 300), vy: rand(-320, -120), g: 900, vr: rand(-10, 10), life: 0.7, size: rand(2, 4), color: "255,255,255" });
          },
        },
        {
          id: "squash", name: { en: "Landing Squash", ko: "착지 눌림" }, param: "0.65 · shake .25",
          cap: { en: "*Squash* the rider and bump the camera.", ko: "몸이 *꾹* 눌리고 화면이 쿵." },
          land(w, S) { S.sq = 0.65; w.shake(0.25); w.kick(0, 8); },
        },
        {
          id: "text", name: { en: "Trick Name", ko: "기술 이름" }, param: "+500 · lime",
          cap: { en: "*Name the trick* and pay out points.", ko: "*기술 이름*과 점수를 보여줘요." },
          land(w, S) { const x = Math.min(430, S.x); pop(w, "360 SPIN", x, S.y - 100, 28, "#c6f432", 1.3); pop(w, "+500", x, S.y - 72, 20, "#fff", 1.3); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "whoosh / crunch",
          cap: { en: "A *whoosh* off the lip, a snowy *crunch* down.", ko: "도약에 *휙*, 착지에 *사각*." },
          launch(w) { w.sfx.jump(); w.sfx.swish(); },
          land(w) { w.sfx.land(); w.play(() => nz({ type: "highpass", f: 1800, dur: 0.25, vol: 0.4 })); },
        },
      ],
    },
  );
})();

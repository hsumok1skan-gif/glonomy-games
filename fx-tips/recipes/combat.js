"use strict";
/* combat — 전투 공통 레시피 20편 */
(() => {
  /* ───── 파일 전용 도우미 ───── */
  const TC = {};
  const tintImg = (a, col) => TC[a.key + col] || (TC[a.key + col] = tinted(a.s.c, col));
  // 배우 위에 색 덧칠 (drawActor와 같은 변환)
  const overlay = (ctx, a, col, al) => {
    if (a.alpha <= 0 || al <= 0) return;
    const top = a.top ? -a.h / 2 : -a.h;
    ctx.save(); ctx.globalAlpha = Math.min(1, al) * a.alpha;
    ctx.translate(a.x + a.ox, a.gy + a.oy);
    if (a.top) ctx.rotate(a.rot);
    else if (a.rot) { ctx.translate(0, -a.h / 2); ctx.rotate(a.rot); ctx.translate(0, a.h / 2); }
    ctx.scale(a.sx * (a.flip ? -1 : 1), a.sy);
    ctx.drawImage(tintImg(a, col), -a.w / 2, top, a.w, a.h);
    ctx.restore();
  };
  const drawOvers = (w, ctx) => { for (const a of w.actors) if (a.over) overlay(ctx, a, a.over.col, a.over.a); };
  const popText = (w, text, x, y, size, color, o = {}) =>
    w.spawn(Object.assign({ type: "text", text, x, y, vy: -240, g: 600, life: 1.3, size, color }, o));
  const bar = (ctx, a, col, y0) => {
    if (!a.maxHp || !a.alive || a.alpha <= 0) return;
    const bw = 74, bh = 9;
    let x = a.x - bw / 2, y = y0 != null ? y0 : a.gy - a.h - 22;
    if (a.barShake > 0) { x += rand(-3, 3); y += rand(-2, 2); }
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, bw + 6, bh + 6, 6); ctx.fill();
    ctx.fillStyle = col || "#ef4444"; ctx.fillRect(x, y, bw * Math.max(0, a.hp) / a.maxHp, bh);
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x, y, bw * Math.max(0, a.hp) / a.maxHp, 3);
  };
  // 주인공의 칼
  const drawBlade = (w, ctx) => {
    const c = w.hero, b = w.blade; if (!b || c.alpha <= 0) return;
    const x = c.x + c.ox + c.w * 0.4, y = G - c.h * 0.55 * c.sy;
    ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot);
    ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(84, -4); ctx.lineTo(98, 0); ctx.lineTo(84, 4); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#94a3b8"; ctx.fillRect(12, 0.5, 74, 2.5);
    ctx.fillStyle = "#57534e"; ctx.fillRect(-10, -3, 20, 6);
    ctx.fillStyle = "#a8a29e"; ctx.fillRect(8, -11, 5, 22);
    ctx.restore();
  };
  // 주인공이 적 앞으로 돌진 → 칼 휘두름 → onHit(at) → 복귀
  const lunge = (w, onHit, o = {}) => {
    const c = w.hero, f = w.foe, x = o.x != null ? o.x : f.x - f.w / 2 - 36;
    if (w.blade) { w.blade.rot = -1.7; w.tween(w.blade, { rot: 0.5 }, o.t || 0.08, "in"); }
    w.tween(c, { x }, o.t || 0.08, "in", () => {
      onHit({ x: x + 54, y: G - 72 });
      const stay = o.stay, to = stay ? x - 40 : c.home;
      w.after(0.1, () => w.tween(c, { x: to }, stay ? 0.1 : 0.24, "inout", () => {
        if (w.blade && !stay) w.tween(w.blade, { rot: -1 }, 0.15);
        if (o.done) o.done();
      }));
    });
  };
  const LIE = 28;
  const gainHp = (w, n) => { const c = w.hero; c.hp = Math.min(c.maxHp, c.hp + n); w.emit("gain", c, n); }; // 누운 몸을 바닥에 붙이는 높이 보정
  const ringOf = (n, r, ry, f) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; f(Math.cos(a) * r, Math.sin(a) * (ry || r), a); } };

  // 투사체 그림
  const drawFireball = (ctx, p) => {
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, p.x, p.y, 40, "255,110,20", 1); glow(ctx, p.x, p.y, 18, "255,220,140", 1);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff7e0"; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
  };
  const drawShard = (ctx, p) => {
    ctx.globalCompositeOperation = "lighter"; glow(ctx, p.x, p.y, 26, "125,211,252", 0.9); ctx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = "#e0f2fe"; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-6, -8); ctx.lineTo(-18, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7dd3fc"; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-6, 8); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  const drawVial = (ctx, p) => {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
    ctx.globalCompositeOperation = "lighter"; glow(ctx, 0, 2, 26, "132,204,22", 0.7); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#d9f99d"; ctx.fillRect(-4, -16, 8, 8);
    ctx.fillStyle = "#65a30d"; ctx.beginPath(); ctx.arc(0, 2, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = "#bef264"; ctx.beginPath(); ctx.arc(-3, -1, 4, 0, TAU); ctx.fill();
    ctx.restore();
  };
  const bolt = (ctx, x0, y0, x1, y1, n, amp) => {
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(x0 + (x1 - x0) * t + rand(-amp, amp) * 0.4, y0 + (y1 - y0) * t + rand(-amp, amp)); }
    ctx.lineTo(x1, y1); ctx.stroke();
  };

  RECIPES.push(
    /* 1. 치명타 */
    {
      id: "combat-crit", cat: "combat", view: "side", polished: true,
      title: { en: "Make crits feel *different*", ko: "치명타는 *다르게*" },
      intro: { en: "Normal hit, then a crit. Can you *tell*?", ko: "일반타, 그다음 치명타. *구분*되나요?" },
      interval: 1.3, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 130 }); w.foe = w.actor("foe", { home: 400, hp: 400 }); w.blade = { rot: -1 }; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const strike = crit => at => {
          const f = w.foe, d = crit ? 96 : 24;
          f.hp -= d; if (f.hp <= 0) f.hp = f.maxHp;
          if (!(crit && w.on("big"))) popText(w, String(d), at.x + (crit ? 30 : 0), at.y - 40, 26, "#ffffff");
          w.emit("hit", at, d, crit);
        };
        lunge(w, strike(false), { stay: true });
        w.after(0.2, () => lunge(w, strike(true), { done: () => { w.busy = false; } }));
      },
      drawFront(w, ctx) { drawBlade(w, ctx); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "big", name: { en: "Big Crit Number", ko: "큰 치명타 숫자" }, param: "50px · yellow · !",
          cap: { en: "A crit gets a *bigger*, *hotter* number.", ko: "치명타 숫자는 *크고* *노랗게*." },
          hit(w, at, d, crit) {
            if (crit) popText(w, d + "!", at.x + 90, at.y - 10, 52, "#fde047", { vy: -280, vx: 40, life: 1.5 });
          },
        },
        {
          id: "flash", name: { en: "Crit Flash", ko: "치명타 섬광" }, param: "star + screen .35",
          cap: { en: "Normal hits *blink*. Crits *light the screen*.", ko: "일반타는 *깜빡*, 치명타는 *화면 전체*가 번쩍." },
          hit(w, at, d, crit) {
            w.foe.flash = 1;
            if (!crit) return;
            w.flash("255,236,170", 0.22);
            w.spawn({ type: "star", x: at.x + 20, y: at.y, size: 90, life: 0.14, color: "255,250,220" });
            w.spawn({ type: "rays", under: true, x: at.x + 20, y: at.y, size: 160, life: 0.35, n: 12, vr: 3, color: "253,224,71" });
          },
        },
        {
          id: "stop", name: { en: "Hit Stop Ratio", ko: "멈칫 비율" }, param: "30ms vs 120ms",
          cap: { en: "Normal: a *tiny* stop. Crit: *four times* longer.", ko: "일반타는 *살짝*, 치명타는 *네 배* 멈춰요." },
          hit(w, at, d, crit) { w.hitstop(crit ? 0.12 : 0.03); w.foe.vib = crit ? 9 : 3; },
        },
        {
          id: "slash", name: { en: "X Slash", ko: "X자 베기" }, param: "2 slashes",
          cap: { en: "A crit leaves an *X* on the target.", ko: "치명타는 *X자* 자국을 남겨요." },
          hit(w, at, d, crit) {
            if (!crit) return;
            for (const a of [0.75, -0.75]) w.spawn({ type: "slash", x: at.x + 40, y: at.y, ang: a, len: 80, size: 13, life: 0.32, color: "255,255,255" });
          },
        },
        {
          id: "knock", name: { en: "Knockback ×6", ko: "밀림 6배" }, param: "12px vs 70px",
          cap: { en: "Crits push the target *much* farther.", ko: "치명타는 *훨씬* 멀리 밀어요." },
          hit(w, at, d, crit) { const f = w.foe; f.ox += crit ? 70 : 12; f.sx = crit ? 0.75 : 0.92; f.sy = crit ? 1.2 : 1.05; },
        },
        {
          id: "camera", name: { en: "Zoom + Shake", ko: "줌 + 흔들림" }, param: "zoom 10% · trauma .5",
          cap: { en: "Only crits get to *move the camera*.", ko: "*카메라*는 치명타 때만 움직여요." },
          hit(w, at, d, crit) { if (crit) { w.zoomPunch(0.1); w.shake(0.5, 1); } },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tick vs crunch",
          cap: { en: "A light *tick* vs a heavy *crunch* with a ring.", ko: "가벼운 *톡*, 무거운 *콰직*." },
          hit(w, at, d, crit) { if (crit) { w.sfx.slashHit(); if (w.on("flash") || w.on("stop")) w.sfx.critBig(); } else w.sfx.hit(1.2); },
        },
      ],
    },

    /* 2. 화염 피해 · gameplay-first upgrade: complete attack → ignite → damage-over-time */
    {
      id: "combat-fire", cat: "combat", view: "side",
      title: { en: "Make fire damage *feel real*", ko: "불이 붙고 *화상*까지" },
      intro: { en: "First: the hit. Then: fire sticks, *burns* and drains HP.", ko: "공격만 하던 장면에 *점화 → 화상 → 연출*을 더해요." },
      interval: 3.55, stepDur: 5.0,
      setup(w) {
        w.hero = w.actor("hero", { home: 115 });
        w.foe = w.actor("foe", { home: 413, hp: 200 });
        w.burnT = 0; w.burnAge = 0; w.tickT = 0;
        w.flamePulse = 0; w.emberPulse = 0; w.heatStatus = 0; w.castT = 0;
        w.busy = false; w.barShown = w.foe.hp; w.barLag = w.foe.hp; w.barPulse = 0;
      },
      fire(w) {
        if(w.busy) return;
        w.busy = true;
        const c=w.hero, f=w.foe;
        // RAW already shows a believable attack movement before HP changes.
        // The projectile and hit are the exact same gameplay event on every layer.
        c.rot = -0.16; c.ox -= 15; c.sx = .89; c.sy = 1.05;
        w.emit("charge", {x:c.x+38,y:c.gy-c.h*.58});
        w.tween(c,{rot:0},.42,"out");
        w.after(.22,()=>{
          const p=paw(w);
          const o={
            x:p.x+8, y:p.y-2, vx:620,vy:0, r:6,
            color:"#fb923c", hitX:f.x-f.w*.34
          };
          o.onHit = shot=>{
            // First damage happens on actual contact, never at button press.
            f.hp = Math.max(0, f.hp-12);
            f.ox+=12;f.vib=3.8;f.sx=.91;f.sy=1.06;f.flash=.32;
            const hit={x:shot.x,y:shot.y};
            w.emit("hit",hit);
            if(w.on("cinema")) w.barPulse=.92;
            if(w.on("flame")){
              // Fire is attached to the enemy for the whole burn duration.
              w.burnT=2.35;w.burnAge=0;w.tickT=.42;
              w.flamePulse=0;
              w.emit("ignite",hit);
            }
          };
          w.emit("cast",o);
          w.shoot(o);
        });
        w.after(.85,()=>{w.busy=false;});
      },
      update(w,dt) {
        const f=w.foe;
        if(w.on("cinema")){
          // HP first flashes on contact, then visibly drains with an amber delayed trail.
          w.barShown+=(f.hp-w.barShown)*Math.min(1,dt*5.2);
          w.barLag+=(f.hp-w.barLag)*Math.min(1,dt*1.65);
          w.barPulse=Math.max(0,w.barPulse-dt*2.1);
        }
        f.burn=Math.max(0,f.burn-dt);
        // Reset only after a complete cycle, so no unexplained HP jump mid-burn.
        if(f.hp<=0&&w.burnT<=0) f.hp=f.maxHp;
        if(w.burnT<=0)return;
        w.burnT=Math.max(0,w.burnT-dt);
        w.burnAge+=dt;
        if(w.on("flame")){
          f.burn=.13;
          // Visible flames climb the silhouette, not a floating ring.
          w.flamePulse+=dt;
          while(w.flamePulse>=.065){
            w.flamePulse-=.065;
            const x=f.x+f.ox+rand(-f.w*.27,f.w*.25);
            const y=f.gy+f.oy-rand(f.h*.20,f.h*.83);
            w.spawn({type:"glow",x,y,vx:rand(-13,15),vy:rand(-85,-42),
              size:rand(11,20),size1:1,life:rand(.19,.34),
              color:pick(["255,118,33","255,168,46","255,221,96"])});
          }
        }
        if(w.on("flame")){
          w.tickT-=dt;
          while(w.tickT<=0 && w.burnT>0){
            w.tickT+=.42;
            const damage=6;
            f.hp=Math.max(0,f.hp-damage);
            if(w.on("cinema"))w.barPulse=.68;
            w.emit("tick",f,damage);
          }
        }
        if(w.on("flame")){
          w.heatStatus=Math.min(1,w.heatStatus+dt*5);
          w.emberPulse+=dt;
          while(w.emberPulse>=.16){
            w.emberPulse-=.16;
            w.spawn({type:"smoke",x:f.x+rand(-22,22),y:f.gy-f.h*.88,
              vx:rand(-18,22),vy:rand(-59,-24),size:9,size1:28,
              life:rand(.43,.64),color:"46,34,32"});
            w.spawn({type:"spark",x:f.x+rand(-f.w*.3,f.w*.3),y:f.gy-rand(32,95),
              vx:rand(-55,55),vy:rand(-118,-60),drag:2.5,
              size:1.8,life:.4,color:"255,193,79"});
          }
        }
      },
      drawFront(w,ctx) {
        if(!w.on("flame")||w.burnT<=0)return;
        const f=w.foe,age=w.burnAge,fade=Math.min(1,w.burnT/.32);
        // Five body-following flames: shaped yellow cores + orange silhouettes.
        ctx.save();
        ctx.translate(f.x+f.ox,f.gy+f.oy);
        ctx.globalCompositeOperation="lighter";
        const h=f.h,wi=f.w;
        const positions=[[-.27,.26],[.17,.36],[-.16,.56],[.24,.68],[0,.44]];
        for(let i=0;i<positions.length;i++){
          const [u,v]=positions[i], px=u*wi+Math.sin(age*8+i*1.4)*4;
          const py=-h*v,fh=(24+(i%3)*10)*(0.87+.13*Math.sin(age*10+i));
          const fw=12+(i%3)*3;
          const g=ctx.createLinearGradient(px,py,px,py-fh);
          g.addColorStop(0,"rgba(255,88,17,"+(.78*fade)+")");
          g.addColorStop(.62,"rgba(255,170,34,"+(.58*fade)+")");
          g.addColorStop(1,"rgba(255,237,132,0)");
          ctx.fillStyle=g;
          ctx.beginPath();ctx.moveTo(px-fw,py);
          ctx.bezierCurveTo(px-fw*.72,py-fh*.41,px+fw*.32,py-fh*.63,px+Math.sin(age*11+i)*4,py-fh);
          ctx.bezierCurveTo(px+fw*.72,py-fh*.53,px+fw,py-fh*.20,px+fw,py);
          ctx.closePath();ctx.fill();
        }
        ctx.restore();
      },
      drawHud(w,ctx){
        const f=w.foe;
        if(w.on("cinema")){
          const bw=110,bh=11,x=f.x-bw/2,y=f.gy-f.h-23;
          const hp=Math.max(0,Math.min(1,w.barShown/f.maxHp));
          const lag=Math.max(0,Math.min(1,w.barLag/f.maxHp));
          ctx.save();
          ctx.fillStyle="#080d16";ctx.beginPath();
          ctx.roundRect(x-5,y-5,bw+10,bh+10,6);ctx.fill();
          ctx.fillStyle="#efb14d";ctx.fillRect(x,y,bw*lag,bh);
          const grad=ctx.createLinearGradient(x,y,x,y+bh);
          grad.addColorStop(0,w.barPulse>.1?"#fff2a3":"#ff6468");
          grad.addColorStop(.4,w.barPulse>.1?"#ffb15d":"#e43349");
          grad.addColorStop(1,"#96213c");
          ctx.fillStyle=grad;ctx.fillRect(x,y,bw*hp,bh);
          ctx.fillStyle="rgba(255,255,255,.35)";ctx.fillRect(x,y,bw*hp,2);
          if(w.barPulse>.02){
            ctx.globalAlpha=Math.min(1,w.barPulse);
            ctx.shadowColor="#ffbd5c";ctx.shadowBlur=20;
            ctx.strokeStyle="#ffe29a";ctx.lineWidth=2.2;
            ctx.strokeRect(x,y,bw*hp,bh);
            ctx.shadowBlur=0;
          }
          ctx.globalAlpha=1;ctx.strokeStyle="rgba(239,166,100,.33)";
          ctx.strokeRect(x-.5,y-.5,bw+1,bh+1);
          ctx.restore();
        }else drawBar(ctx,f);
        if(w.on("flame")&&w.burnT>0){
          ctx.save();ctx.font="800 13px Pretendard, sans-serif";
          ctx.textAlign="center";ctx.textBaseline="middle";
          ctx.shadowColor="rgba(255,85,14,.65)";ctx.shadowBlur=10;
          ctx.fillStyle="#ffb56e";
          ctx.fillText("🔥 화상",f.x+f.ox,f.gy-f.h-44);
          ctx.restore();
        }
      },
      steps:[
        {
          id:"flame",
          name:{en:"Fire + Burning Damage",ko:"화염 공격 · 점화와 지속 피해"},
          param:"fire projectile + attached flames + burn DOT",
          cap:{en:"The attack now *ignites the target*. Fire clings to the body, with visible damage ticks.",
               ko:"불꽃이 날아가 *적 몸에 붙고*, 화상 숫자와 체력이 함께 줄어들어요."},
          cast(w,o){
            o.draw=(ctx,p)=>{
              ctx.save();ctx.globalCompositeOperation="lighter";
              glow(ctx,p.x-9,p.y,33,"255,105,20",.73);
              const flicker=3+Math.sin(p.age*41)*2;
              ctx.fillStyle="rgba(252,124,25,.78)";
              ctx.beginPath();
              ctx.moveTo(p.x+11,p.y);
              ctx.bezierCurveTo(p.x-9,p.y-15,p.x-25,p.y-11-flicker,p.x-37,p.y+flicker);
              ctx.bezierCurveTo(p.x-21,p.y+17,p.x-4,p.y+15,p.x+11,p.y);
              ctx.fill();
              ctx.fillStyle="#fff3bd";ctx.beginPath();
              ctx.ellipse(p.x+2,p.y,8,5,0,0,TAU);ctx.fill();
              ctx.restore();
            };
            o.trail="255,123,36";
          },
          ignite(w,hit){
            w.foe.flash=.64;
            w.spawn({type:"glow",x:hit.x,y:hit.y,size:68,size1:4,
              life:.26,color:"255,121,32"});
            for(let i=0;i<11;i++){
              const a=rand(-Math.PI,0),v=rand(110,300);
              w.spawn({type:"spark",x:hit.x,y:hit.y,
                vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,
                drag:4,size:rand(1.5,3.0),life:rand(.19,.37),
                color:"255,181,71"});
            }
          },
          tick(w,f,damage){
            popText(w,"−"+damage,f.x+rand(-17,17),f.gy-f.h*.84,
              25,"#ffbf72",{vy:-110,g:80,life:.65});
            f.flash=.17;f.vib=2.5;f.sy=.97;
          },
        },
        {
          id:"cinema",
          name:{en:"Final Game Feel",ko:"최종 · 강력한 타격감과 체력 연출"},
          param:"charge → fire → impact → lagged HP → crackle",
          cap:{en:"A charged strike, bright impact, lingering flames, crackling audio and a *glowing health bar that drains visibly*.",
               ko:"기 모으기부터 발사·폭발·화상·소리까지 연결되고, *체력바가 빛난 뒤 눈에 보이게 감소*해요."},
          charge(w,p){
            w.spawn({type:"glow",x:p.x,y:p.y,size:44,size1:9,
              life:.25,color:"255,145,47"});
            for(let i=0;i<6;i++){
              const a=i*TAU/6,v=rand(35,85);
              w.spawn({type:"spark",x:p.x+Math.cos(a)*28,y:p.y+Math.sin(a)*22,
                vx:-Math.cos(a)*v,vy:-Math.sin(a)*v,
                size:1.5,life:.24,color:"255,218,134"});
            }
          },
          cast(w,o){
            w.hero.ox-=8;w.hero.rot=-.13;
            w.spawn({type:"glow",x:o.x,y:o.y,size:35,size1:8,
              life:.15,color:"255,205,100"});
            w.sfx.burst();
          },
          ignite(w,hit){
            w.shake(.32,1);w.zoomPunch(.055);w.hitstop(.07);
            w.flash("255,151,57",.15);
            w.foe.ox+=17;w.foe.vib=8;w.foe.barShake=.16;
            for(let i=0;i<11;i++){
              const x=hit.x+rand(-11,11),y=hit.y+rand(-11,11);
              w.spawn({type:"glow",x,y,size:rand(14,32),size1:1,
                vx:rand(-130,130),vy:rand(-190,-45),life:.33,
                color:pick(["255,128,41","255,200,80","255,235,143"])});
            }
            w.sfx.crit();
          },
          tick(w,f){
            f.ox+=3.5;
            w.play(()=>nz({type:"bandpass",f:2600,q:1.5,dur:.06,vol:.30}));
          },
        },
      ],
    },

    /* 3. 얼음 */
    {
      id: "combat-ice", cat: "combat", view: "side",
      title: { en: "Make frost *slow you down*", ko: "얼음은 *느려지게*" },
      intro: { en: "Ice hit. Still *jogging* happily.", ko: "얼음 맞았는데 *쌩쌩* 걸어와요." },
      interval: 1.4, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 100 }); w.foe = w.actor("foe", { home: 470, hp: 200 }); w.chill = 0; w.walk = 0; w.printT = 0; },
      fire(w) {
        const p = paw(w), f = w.foe;
        const o = { x: p.x, y: p.y, vx: 800, vy: 0, r: 8, color: "#bae6fd" };
        o.test = s => s.x >= f.x - 45;
        o.onHit = s => { f.hp -= 8; if (f.hp <= 0) f.hp = f.maxHp; f.x = Math.min(470, f.x + 26); w.chill = 1.3; w.emit("hit", { x: s.x, y: s.y }); };
        w.emit("cast", o);
        w.shoot(o);
      },
      update(w, dt) {
        const f = w.foe, k = w.chill > 0 && w.on("slow") ? 0.2 : 1;
        w.chill -= dt;
        f.x = Math.max(300, f.x - 45 * k * dt);
        w.walk += dt * 13 * k;
        f.oy = -Math.abs(Math.sin(w.walk)) * 9;
        f.over = null;
      },
      drawFront(w, ctx) { drawOvers(w, ctx); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "shard", name: { en: "Ice Shard", ko: "얼음 조각" }, param: "shard + 10 chips",
          cap: { en: "A sharp *shard* that *shatters* on impact.", ko: "뾰족한 *얼음*이 맞으면 *와장창*." },
          cast(w, o) { o.draw = drawShard; o.trail = "165,243,252"; },
          hit(w, h) {
            for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: h.x, y: h.y, vx: rand(-300, 60), vy: rand(-380, 60), g: 1300, ground: true, bounce: 0.3, vr: rand(-20, 20), life: rand(0.6, 1), size: rand(3, 6), color: pick(["224,242,254", "125,211,252"]), hold: true });
          },
        },
        {
          id: "slow", name: { en: "Actually Slow", ko: "진짜로 느리게" }, param: "speed ×0.2",
          cap: { en: "Slow the *walk* and the *bob*. Then say it.", ko: "걸음도 *몸짓*도 느리게. 그리고 *글자*로." },
          hit(w, h) { popText(w, "SLOW", h.x + 30, h.y - 70, 24, "#7dd3fc", { vy: -90, g: 60, life: 1 }); },
        },
        {
          id: "frost", name: { en: "Frost Tint", ko: "얼어붙은 색" }, param: "cyan overlay .55",
          cap: { en: "Paint the body *icy blue* while it's slowed.", ko: "느린 동안 몸을 *얼음색*으로." },
          update(w) { if (w.chill > 0) w.foe.over = { col: "#7dd3fc", a: 0.55 }; },
        },
        {
          id: "prints", name: { en: "Frost Footprints", ko: "서리 발자국" }, param: "decal / 200ms",
          cap: { en: "Leave *frost* on the floor with every step.", ko: "걸을 때마다 바닥에 *서리*가 남아요." },
          update(w, dt) {
            w.printT -= dt;
            if (w.chill <= 0 || w.printT > 0) return;
            w.printT = 0.2;
            w.spawn({ type: "ellipse", under: true, x: w.foe.x + rand(-20, 20), y: G + 2, size: 46, life: 2.5, color: "186,230,253", alpha: 0.6, hold: true, add: false });
          },
        },
        {
          id: "mist", name: { en: "Cold Mist", ko: "냉기" }, param: "falling mist",
          cap: { en: "Cold air *sinks*. Let the mist fall.", ko: "찬 공기는 *아래로*. 냉기가 흘러내려요." },
          update(w) {
            if (w.chill <= 0) return;
            const f = w.foe;
            if (Math.random() < 0.5) w.spawn({ type: "smoke", x: f.x + rand(-50, 40), y: G - rand(40, 110), vx: rand(-20, 20), vy: rand(30, 70), size: rand(4, 6), size1: rand(10, 16), life: rand(0.5, 0.8), color: "160,215,245" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "glass ting",
          cap: { en: "A thin, glassy *ting*.", ko: "얇은 유리 소리, *팅*." },
          hit(w) { w.play(() => { tn({ type: "triangle", f: 2600, f2: 2100, dur: 0.3, vol: 0.2 }); nz({ type: "highpass", f: 5000, dur: 0.12, vol: 0.3 }); }); },
        },
      ],
    },

    /* 4. 독 */
    {
      id: "combat-poison", cat: "combat", view: "side",
      title: { en: "Make poison look *toxic*", ko: "독은 *독하게*" },
      intro: { en: "HP drops. *Why?* Nobody knows.", ko: "체력이 줄어요. *왜*인지 몰라요." },
      interval: 1.9, stepDur: 3.8,
      setup(w) { w.hero=w.actor("hero",{home:110});w.foe=w.actor("foe",{home:410,hp:160});
        w.pois=0;w.tickT=0;w.poisonPulse=0;w.toxicMistT=0;w.toxicBar=160;w.toxicLag=160;w.poisonAge=0; },
      fire(w) {
        const c = w.hero, f = w.foe, x0 = c.x + 40, y0 = G - 100, tx = f.x - 30, T = 0.3, g = 1400;
        const o = { x: x0, y: y0, vx: (tx - x0) / T, vy: (G - 70 - y0 - 0.5 * g * T * T) / T, g, r: 10, color: "#84cc16", vr: 14, hitX: tx };
        o.onHit=()=>{
          // Physical splash: only after projectile impact can the poison spread.
          f.hp=Math.max(0,f.hp-5);f.ox+=11;f.vib=4;f.flash=.45;
          w.pois=1.8;w.poisonAge=0;w.tickT=.28;w.toxicMistT=0;w.poisonPulse=.95;
          w.emit("splash",{x:o.x,y:o.y});
        };
        c.sx = 0.9; c.sy = 1.08;
        w.emit("toss", o);
        w.shoot(o);
      },
      update(w, dt) {
        const f=w.foe;
        if(w.on("bar")){
          w.toxicBar+=(f.hp-w.toxicBar)*Math.min(1,dt*5.4);
          w.toxicLag+=(f.hp-w.toxicLag)*Math.min(1,dt*1.55);
          w.poisonPulse=Math.max(0,w.poisonPulse-dt*1.9);
        }
        if(f.hp<=0 && w.pois<=0)f.hp=f.maxHp;
        if(w.pois<=0){f.barCol=null;f.over=null;return;}
        w.pois=Math.max(0,w.pois-dt);w.tickT-=dt;w.poisonAge+=dt;w.toxicMistT-=dt;
        if(w.on("bar")&&w.toxicMistT<=0){
          w.toxicMistT=.105;
          w.spawn({type:"smoke",x:f.x+rand(-f.w*.27,f.w*.27),
            y:f.gy-rand(f.h*.44,f.h*.86),vx:rand(-24,24),vy:rand(-100,-57),
            size:8,size1:18,life:.42,color:"109,190,45"});
          w.spawn({type:"spark",x:f.x+rand(-f.w*.24,f.w*.24),
            y:f.gy-rand(f.h*.28,f.h*.8),vx:rand(-35,35),vy:rand(-80,-35),
            size:1.8,life:.24,color:"194,249,93"});
        }
        if(w.tickT<=0&&w.pois>0){
          w.tickT=.29;f.hp=Math.max(0,f.hp-3);w.poisonPulse=.7;
          f.vib=2.4;f.flash=.14;w.emit("tick",f);
        }
      },
      drawFront(w,ctx){
        drawOvers(w,ctx);
        if(!w.on("bar")||w.pois<=0)return;
        const f=w.foe;
        ctx.save();ctx.translate(f.x+f.ox,f.gy+f.oy);
        ctx.globalCompositeOperation="lighter";
        const shade=Math.min(1,w.pois/.35);
        for(let i=0;i<5;i++){
          const theta=i*2.43+w.time*1.5;
          const x=Math.sin(theta)*f.w*.29,y=-f.h*(.28+i*.135)+Math.sin(w.time*4+i)*3;
          const r=5+2*Math.sin(w.time*7+i);
          glow(ctx,x,y,r*2,"126,243,66",shade*.24);
          ctx.strokeStyle="rgba(177,251,87,"+(shade*.58)+")";
          ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(x,y,r,Math.PI*.16,Math.PI*1.8);ctx.stroke();
        }
        ctx.restore();
      },
      drawHud(w,ctx){
        const f=w.foe;
        if(!w.on("bar")){bar(ctx,f,f.barCol);return;}
        const x=f.x-53,y=f.gy-f.h-24,bw=106,h=10;
        const hp=Math.max(0,Math.min(1,w.toxicBar/f.maxHp));
        const lag=Math.max(hp,Math.min(1,w.toxicLag/f.maxHp));
        ctx.save();ctx.fillStyle="rgba(5,13,9,.88)";
        ctx.beginPath();ctx.roundRect(x-5,y-5,bw+10,h+10,6);ctx.fill();
        ctx.fillStyle="rgba(234,235,103,.53)";ctx.fillRect(x,y,bw*lag,h);
        const gr=ctx.createLinearGradient(x,y,x,y+h);
        gr.addColorStop(0,"#d8fb83");gr.addColorStop(.65,"#7ddd45");gr.addColorStop(1,"#3c9738");
        ctx.fillStyle=gr;ctx.fillRect(x,y,bw*hp,h);
        ctx.strokeStyle="rgba(220,255,154,"+(w.poisonPulse*.85)+")";ctx.lineWidth=2;
        if(w.poisonPulse>.05)ctx.strokeRect(x,y,bw*hp,h);
        if(w.pois>0){
          ctx.fillStyle="#c3f287";ctx.font="800 12px sans-serif";
          ctx.textAlign="center";ctx.shadowColor="#88d94d";ctx.shadowBlur=8;
          ctx.fillText("POISON",f.x,y-14);
        }
        ctx.restore();
      },
      steps: [
        {
          id: "splash", name: { en: "Splash + Puddle", ko: "튀는 독과 웅덩이" }, param: "14 drops · puddle",
          cap: { en: "The vial *bursts*. A *puddle* stays.", ko: "병이 *팍* 깨지고, *웅덩이*가 남아요." },
          toss(w, o) { o.draw = drawVial; },
          splash(w, s) {
            for (let i = 0; i < 14; i++) w.spawn({ type: "circle", x: s.x, y: s.y, vx: rand(-260, 200), vy: rand(-420, -80), g: 1300, ground: true, bounce: 0.1, life: rand(0.5, 0.8), size: rand(3, 6), color: "132,204,22" });
            w.spawn({ type: "ellipse", under: true, x: w.foe.x - 10, y: G + 2, size: 90, life: 2, color: "101,163,13", alpha: 0.7, hold: true, add: false });
          },
        },
        {
          id: "tint", name: { en: "Sick Green", ko: "초록빛 중독" }, param: "pulse .3–.6",
          cap: { en: "Tint the body *green*. Let it *pulse*.", ko: "몸을 *초록*으로, *울렁울렁*." },
          update(w) { if (w.pois > 0) w.foe.over = { col: "#84cc16", a: 0.45 + 0.15 * Math.sin(w.time * 14) }; },
        },
        {
          id: "bubbles", name: { en: "Bubbles", ko: "부글부글 거품" }, param: "rise + pop",
          cap: { en: "*Bubbles* rise off the body and *pop*.", ko: "몸에서 *거품*이 올라와 *톡* 터져요." },
          update(w) {
            const f = w.foe;
            if (w.pois <= 0 || Math.random() < 0.55) return;
            w.spawn({ type: "ring", x: f.x + rand(-45, 35), y: G - rand(20, 100), vy: rand(-90, -50), size: rand(3, 5), size1: rand(8, 12), w: 3, life: rand(0.4, 0.7), color: "190,242,100" });
          },
        },
        {
          id: "numbers", name: { en: "Green Numbers", ko: "초록 숫자" }, param: "small · every tick",
          cap: { en: "Poison numbers are *green* and *small*.", ko: "독 숫자는 *초록색*, *작게*." },
          tick(w, f) { popText(w, "3", f.x + rand(-36, 36), G - 115, 20, "#a3e635", { vy: -130, g: 120, life: 0.6 }); },
        },
        {
          id: "bar", name: { en: "Green HP Bar", ko: "초록 체력바" }, param: "bar color swap",
          cap: { en: "The HP bar turns *green*. You know why it drops.", ko: "체력바가 *초록*으로. 왜 주는지 알아요." },
          tick(w, f) { f.barCol = "#84cc16"; f.barShake = 0.08; },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "glass + bloops",
          cap: { en: "Glass *crack*, then low *bloops*.", ko: "*쨍* 깨지고, 낮게 *보글*." },
          splash(w) { w.sfx.pop(); },
          tick(w) { w.play(() => tn({ f: rand(180, 260), f2: 420, dur: 0.07, vol: 0.2 })); },
        },
      ],
    },

    /* 5. 감전 */
    {
      id: "combat-shock", cat: "combat", view: "side",
      title: { en: "Make a zap feel *electric*", ko: "감전은 *찌릿하게*" },
      intro: { en: "Lightning? Looks like a *laser pointer*.", ko: "번개라는데… *레이저 포인터* 같아요." },
      interval: 1.6, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.foe = w.actor("foe", { home: 410, hp: 300 }); w.zap = null; w.stun = 0; },
      fire(w) {
        const p = paw(w), f = w.foe;
        w.zap = { x0: p.x, y0: p.y, x1: f.x - 20, y1: G - 80, t: 0.3 };
        f.hp -= 15; f.ox += 8; if (f.hp <= 0) f.hp = f.maxHp;
        w.stun = 1.3;
        w.emit("zap", w.zap, f);
      },
      update(w, dt) {
        const f = w.foe;
        w.stun -= dt; f.over = null;
        if (w.zap && (w.zap.t -= dt) <= 0) w.zap = null;
      },
      drawFront(w, ctx) {
        drawOvers(w, ctx);
        const z = w.zap; if (!z) return;
        if (!z.jag) { ctx.strokeStyle = "#a5f3fc"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(z.x0, z.y0); ctx.lineTo(z.x1, z.y1); ctx.stroke(); return; }
        if (Math.random() < 0.25) return;
        ctx.lineJoin = "round"; ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(34,211,238,0.35)"; ctx.lineWidth = 14; bolt(ctx, z.x0, z.y0, z.x1, z.y1, 9, 26);
        ctx.strokeStyle = "rgba(165,243,252,0.9)"; ctx.lineWidth = 5; bolt(ctx, z.x0, z.y0, z.x1, z.y1, 9, 26);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; bolt(ctx, z.x0, z.y0, z.x1, z.y1, 12, 18);
        ctx.globalCompositeOperation = "source-over";
      },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "bolt", name: { en: "Jagged Bolt", ko: "지그재그 번개" }, param: "redraw every frame",
          cap: { en: "Zigzag it and *redraw every frame*. It flickers.", ko: "꺾어 그리고 *매 프레임 새로*. 그래야 지직거려요." },
          zap(w, z) { z.jag = true; z.t = 0.5; },
        },
        {
          id: "jitter", name: { en: "Stun Jitter", ko: "부들부들 경직" }, param: "6px random · 1.3s",
          cap: { en: "Shake the body in *random* directions. Stunned.", ko: "몸을 *아무 방향*으로 덜덜. 경직이에요." },
          update(w) {
            const f = w.foe;
            if (w.stun <= 0) return;
            f.vib = 6; f.vibAxis = Math.random() < 0.5 ? "x" : "y";
          },
        },
        {
          id: "strobe", name: { en: "Strobe", ko: "점멸" }, param: "white ↔ cyan 15Hz",
          cap: { en: "Flash *white* and *cyan* back and forth.", ko: "*하양*과 *하늘색*을 번갈아 번쩍." },
          update(w) {
            const f = w.foe, odd = Math.floor(w.time * 30) % 2;
            if (w.stun <= 0) return;
            if (odd) f.flash = 1; else f.over = { col: "#22d3ee", a: 0.8 };
          },
        },
        {
          id: "crawl", name: { en: "Crawling Sparks", ko: "몸 위의 스파크" }, param: "mini arcs",
          cap: { en: "Little *arcs crawl* over the body.", ko: "작은 *전기*가 몸 위를 기어다녀요." },
          update(w) {
            const f = w.foe;
            if (w.stun <= 0) return;
            for (let k = 0; k < 2; k++) {
              const x = f.x + rand(-45, 40), y = G - rand(15, 120), pts = [[0, 0]];
              for (let i = 0; i < 4; i++) pts.push([rand(-22, 22), rand(-22, 22)]);
              w.spawn({ type: "crack", x, y, pts, w: 3, life: 0.1, color: "165,243,252", add: true });
            }
          },
        },
        {
          id: "flash", name: { en: "Blue Flash", ko: "푸른 번쩍임" }, param: "screen .4 + star",
          cap: { en: "Light the *whole screen* blue for a frame.", ko: "한 프레임 *화면 전체*를 푸르게." },
          zap(w, z) {
            w.flash("190,240,255", 0.4);
            w.spawn({ type: "star", x: z.x1, y: z.y1, size: 70, life: 0.15, color: "224,250,255" });
            sparks(w, z.x1, z.y1, 12, "165,243,252", [200, 500]);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crack + buzz",
          cap: { en: "A sharp *crack*, then a *buzz* while stunned.", ko: "날카로운 *빠직*, 그리고 *지지직*." },
          zap(w) {
            w.play(() => {
              nz({ type: "highpass", f: 3000, dur: 0.08, vol: 0.5 });
              tn({ type: "sawtooth", f: 95, f2: 80, dur: 0.7, vol: 0.12 });
              nz({ type: "bandpass", f: 2400, f2: 1200, q: 3, dur: 0.7, vol: 0.18 });
            });
          },
        },
      ],
    },

    /* 6. 보호막 파괴 */
    {
      id: "combat-shield", cat: "combat", view: "side",
      title: { en: "Make a shield *SHATTER*", ko: "보호막이 *와장창* 깨지게" },
      intro: { en: "The shield is gone. *When* did that happen?", ko: "보호막이… *언제* 없어졌죠?" },
      interval: 1.8, stepDur: 3.8,
      setup(w) {
        w.hero = w.actor("hero", { home: 100 }); w.gun = { kick: 0, rot: 0 };
        w.foe = w.actor("foe", { home: 420, hp: 100 });
        w.sh = { hp: 3, a: 1, fl: 0, cracks: [] };
      },
      fire(w) {
        const s = w.sh, f = w.foe;
        if (s.hp <= 0) { s.hp = 3; s.cracks = []; w.tween(s, { a: 1 }, 0.15); }
        for (let i = 0; i < 3; i++) w.after(0.25 + i * 0.1, () => {
          const m = muzzle(w); w.gun.kick = 10;
          w.shoot({ x: m.x, y: m.y, vx: 1900, vy: 0, r: 3, color: "#e2e8f0", len: 40, hitX: f.x - 86, onHit: p => {
            if (s.hp <= 0) { f.hp -= 15; f.flash = 1; if (f.hp <= 0) f.hp = f.maxHp; return; }
            s.hp--;
            w.emit("block", p, s);
            if (s.hp === 0) {
              s.a = 0; w.emit("break", p, s);
            }
          } });
        });
      },
      update(w, dt) { gunSpring(w, dt); w.sh.fl = Math.max(0, w.sh.fl - dt * 6); },
      drawFront(w, ctx) {
        drawGun(w, ctx);
        const s = w.sh, f = w.foe, cx = f.x + f.ox - 5, cy = G - 72;
        if (s.a <= 0) return;
        ctx.save(); ctx.globalAlpha = s.a;
        ctx.fillStyle = `rgba(56,189,248,${0.14 + s.fl * 0.4})`; ctx.strokeStyle = `rgba(125,211,252,${0.8 + s.fl * 0.2})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(cx, cy, 80, 90, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
        for (const c of s.cracks) { ctx.beginPath(); c.forEach((q, i) => ctx[i ? "lineTo" : "moveTo"](cx + q[0], cy + q[1])); ctx.stroke(); }
        ctx.restore();
      },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "ripple", name: { en: "Impact Ripple", ko: "맞은 자리 물결" }, param: "ring + shield flash",
          cap: { en: "Show *where* the shield took the hit.", ko: "보호막 *어디에* 맞았는지 보여줘요." },
          block(w, p, s) {
            s.fl = 1;
            w.spawn({ type: "ring", x: p.x, y: p.y, size: 6, size1: 46, life: 0.25, w: 5, color: "165,243,252" });
            sparks(w, p.x, p.y, 5, "186,230,253", [120, 320], Math.PI * 0.6, Math.PI * 1.4);
          },
        },
        {
          id: "crack", name: { en: "Cracks", ko: "금 가기" }, param: "+1 crack / hit",
          cap: { en: "Each hit adds a *crack*. You see it *weaken*.", ko: "맞을 때마다 *금*이 늘어요. 약해지는 게 보여요." },
          block(w, p, s) {
            const pts = [[-78, p.y - (G - 72)]];
            for (let i = 0; i < 5; i++) { const q = pts[i]; pts.push([q[0] + rand(14, 30), q[1] + rand(-26, 26)]); }
            s.cracks.push(pts);
          },
        },
        {
          id: "shatter", name: { en: "Shatter", ko: "산산조각" }, param: "28 shards",
          cap: { en: "Don't fade it out. *Break it into shards*.", ko: "스르륵 말고 *조각조각* 부숴요." },
          break(w, p, s) {
            const f = w.foe, cx = f.x - 5, cy = G - 72;
            ringOf(28, 80, 90, (dx, dy, a) => w.spawn({ type: "chunk", x: cx + dx, y: cy + dy, vx: Math.cos(a) * rand(150, 380) + 80, vy: Math.sin(a) * rand(150, 380) - 160, g: 1200, ground: true, bounce: 0.3, vr: rand(-25, 25), life: rand(1.2, 1.7), size: rand(5, 9), color: pick(["186,230,253", "125,211,252", "224,242,254"]), add: true, hold: true }));
          },
        },
        {
          id: "stop", name: { en: "Freeze + Flash", ko: "멈칫 + 번쩍" }, param: "120ms · screen .35",
          cap: { en: "Breaking is a *big deal*. Freeze and flash.", ko: "깨지는 건 *큰일*이에요. 멈추고 번쩍." },
          break(w) { w.hitstop(0.12); w.flash("190,235,255", 0.35); w.shake(0.4, 1); },
        },
        {
          id: "text", name: { en: "BREAK Callout", ko: "BREAK 문구" }, param: "40px · exposed flash",
          cap: { en: "Say it: *BREAK!* The target is *exposed*.", ko: "*BREAK!* 이제 *맨몸*이라는 신호." },
          break(w, p) {
            popText(w, "BREAK!", p.x + 50, p.y - 70, 40, "#e0f2fe", { vy: -80, g: 60, life: 1.6 });
            w.foe.flash = 1.4; w.foe.ox += 24;
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "tink ×2 + shatter",
          cap: { en: "Hollow *tinks*, then a glassy *crash*.", ko: "빈 소리 *팅팅*, 그리고 *와장창*." },
          block(w) { w.play(() => tn({ type: "triangle", f: 1500, f2: 1300, dur: 0.15, vol: 0.2 })); },
          break(w) { w.play(() => { nz({ type: "highpass", f: 3500, dur: 0.5, vol: 0.5 }); tn({ type: "triangle", f: 2200, f2: 900, dur: 0.4, vol: 0.18 }); tn({ f: 120, f2: 50, dur: 0.25, vol: 0.5 }); }); },
        },
      ],
    },

    /* 7. 막기 */
    {
      id: "combat-block", cat: "combat", view: "side",
      title: { en: "Make a block go *CLANG*", ko: "막을 때 *쨍!* 소리 나게" },
      intro: { en: "Blocked? Or just *ignored*?", ko: "막은 거예요? 아니면 *씹힌* 거예요?" },
      interval: 1.1, stepDur: 3.4,
      setup(w) {
        w.hero = w.actor("hero", { home: 120 }); w.blade = { rot: -1 };
        w.foe = w.actor("foe", { home: 410 }); w.guard = { fl: 0 };
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        lunge(w, () => { if (!w.on("recoil")) w.hero.ox -= 14; w.emit("block", { x: f.x + f.ox - 62, y: G - 76 }); }, { x: f.x - 180, done: () => { w.busy = false; } });
      },
      update(w, dt) { w.guard.fl = Math.max(0, w.guard.fl - dt * 5); },
      drawFront(w, ctx) {
        drawBlade(w, ctx);
        const f = w.foe, x = f.x + f.ox - 50, y = G - 112, g = w.guard;
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = "#64748b"; ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(12, 70); ctx.lineTo(0, 92); ctx.lineTo(-12, 70); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#94a3b8"; ctx.fillRect(-12, 0, 6, 70);
        if (g.fl > 0) { ctx.fillStyle = `rgba(255,255,255,${g.fl})`; ctx.fill(); }
        ctx.restore();
      },
      steps: [
        {
          id: "sparks", name: { en: "Metal Sparks", ko: "쇠 불꽃" }, param: "20 sparks · back cone",
          cap: { en: "Metal on metal = *sparks*, spraying *back at you*.", ko: "쇠와 쇠가 부딪히면 *불꽃*. *내 쪽*으로 튀어요." },
          block(w, at) {
            for (let i = 0; i < 20; i++) {
              const a = rand(Math.PI * 0.75, Math.PI * 1.45), v = rand(250, 700);
              w.spawn({ type: "spark", x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1400, drag: 2, ground: true, bounce: 0.4, life: rand(0.4, 0.8), size: 2.4, color: "255,214,120" });
            }
            w.spawn({ type: "star", x: at.x, y: at.y, size: 46, life: 0.1, color: "255,250,230" });
          },
        },
        {
          id: "stop", name: { en: "Both Freeze", ko: "둘 다 멈칫" }, param: "70ms · vib 4px",
          cap: { en: "Freeze both sides. They *trembled* from the impact.", ko: "양쪽 다 멈춰요. 충격에 *부르르*." },
          block(w) { w.hitstop(0.07); w.hero.vib = 4; w.foe.vib = 4; },
        },
        {
          id: "recoil", name: { en: "Bounce Off", ko: "튕겨 나감" }, param: "hero −50px · blade up",
          cap: { en: "The attacker *bounces off*. The blade flies *up*.", ko: "때린 쪽이 *튕겨 나가고*, 칼이 *위로*." },
          block(w) { w.hero.ox -= 50; w.blade.rot = -2.4; w.foe.ox += 12; },
        },
        {
          id: "flash", name: { en: "Shield Flash", ko: "방패 번쩍" }, param: "white + ring",
          cap: { en: "Flash the *shield*, not the body. Nothing got through.", ko: "몸 말고 *방패*가 번쩍. 뚫린 게 없어요." },
          block(w, at) { w.guard.fl = 1; w.spawn({ type: "ring", x: at.x, y: at.y, size: 8, size1: 60, life: 0.2, w: 6, color: "226,232,240" }); },
        },
        {
          id: "text", name: { en: "BLOCK Label", ko: "BLOCK 표시" }, param: "steel grey · no dmg",
          cap: { en: "Show *BLOCK*, not a number. *Zero* damage.", ko: "숫자 대신 *BLOCK*. 피해는 *0*." },
          block(w, at) { popText(w, "BLOCK", at.x, at.y - 60, 28, "#cbd5e1", { vy: -120, g: 160 }); },
        },
        {
          id: "shake", name: { en: "Small Shake", ko: "작은 흔들림" }, param: "trauma .2",
          cap: { en: "A *small* shake. Nobody got hurt.", ko: "*살짝*만 흔들어요. 다친 사람은 없으니까." },
          block(w) { w.shake(0.2, -1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "inharmonic clang",
          cap: { en: "Two *clashing* tones = metal. *CLANG*.", ko: "안 어울리는 두 음 = 쇠. *쨍!*" },
          block(w) {
            w.play(() => {
              tn({ type: "triangle", f: 1870, dur: 0.45, vol: 0.2 }); tn({ type: "triangle", f: 2730, dur: 0.35, vol: 0.12 });
              nz({ type: "highpass", f: 4000, dur: 0.06, vol: 0.4 });
            });
          },
        },
      ],
    },

    /* 8. 회피 MISS */
    {
      id: "combat-dodge", cat: "combat", view: "side",
      title: { en: "Make a dodge *read*", ko: "피한 게 *보이게*" },
      intro: { en: "No damage. Bug? *Dodge?*", ko: "피해가 없어요. 버그? *회피?*" },
      interval: 1.4, stepDur: 3.6,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.blade = { rot: -1 }; w.foe = w.actor("foe", { home: 360 }); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        w.emit("dodge", f);
        w.tween(f, { x: f.home + 110 }, 0.12, "out");
        lunge(w, at => w.emit("whiff", at), { x: f.home - 106 });
        w.after(0.8, () => w.tween(f, { x: f.home }, 0.3, "inout", () => { w.busy = false; }));
      },
      drawFront(w, ctx) { drawBlade(w, ctx); },
      steps: [
        {
          id: "hop", name: { en: "Hop Back", ko: "뒤로 폴짝" }, param: "arc 46px",
          cap: { en: "Don't slide. *Hop* back with a squash.", ko: "미끄러지지 말고 *폴짝* 뛰어요." },
          dodge(w, f) {
            w.tween(f, { oy: -46 }, 0.12, "out", () => w.tween(f, { oy: 0 }, 0.12, "in"));
            f.sx = 0.82; f.sy = 1.18;
          },
        },
        {
          id: "ghost", name: { en: "Afterimages", ko: "잔상" }, param: "3 ghosts · 30ms",
          cap: { en: "Leave *afterimages* where it used to be.", ko: "있던 자리에 *잔상*을 남겨요." },
          dodge(w, f) {
            for (let i = 0; i < 3; i++) w.after(i * 0.035, () => w.spawn({ type: "ghost", img: SPR.foe.cyan, w: f.w, h: f.h, x: f.x, y: f.gy + f.oy, alpha0: 0.5 - i * 0.12, life: 1.1, add: false }));
          },
        },
        {
          id: "whiff", name: { en: "Whiff", ko: "헛스윙" }, param: "grey arc · stumble",
          cap: { en: "The swing cuts *air*. The attacker *stumbles*.", ko: "칼이 *허공*을 가르고, 몸이 *휘청*." },
          whiff(w, at) {
            w.spawn({ type: "arc", x: at.x - 20, y: at.y, size: 70, life: 0.2, a0: -1.9, a1: 1.1, color: "148,163,184" });
            w.hero.ox += 26; w.hero.sx = 1.1; w.hero.sy = 0.9;
          },
        },
        {
          id: "miss", name: { en: "MISS Text", ko: "MISS 글자" }, param: "grey · floats up",
          cap: { en: "Write *MISS* in grey. No guessing.", ko: "회색으로 *MISS*. 헷갈릴 일 없어요." },
          whiff(w, at) { popText(w, "MISS", at.x + 30, at.y - 60, 34, "#94a3b8", { vy: -70, g: 30, life: 1.6 }); },
        },
        {
          id: "slowmo", name: { en: "Near-miss Slow-mo", ko: "아슬아슬 슬로" }, param: "×0.3 · 400ms",
          cap: { en: "Slow down the *close call* for a beat.", ko: "*아슬아슬한* 순간을 살짝 느리게." },
          dodge(w) { w.slowmo(0.3, 0.4); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "swish + dash",
          cap: { en: "An *empty swish*. No impact sound at all.", ko: "*휙* 하고 빈 소리. 맞는 소리는 없어요." },
          dodge(w) { w.sfx.dash(); },
          whiff(w) { w.sfx.slash(); },
        },
      ],
    },

    /* 9. 회복 */
    {
      id: "combat-heal", cat: "combat", view: "side",
      title: { en: "Make healing feel *good*", ko: "회복은 *기분 좋게*" },
      intro: { en: "HP went up. That's *all* you get.", ko: "체력이 올랐어요. *그게* 다예요." },
      interval: 1.5, stepDur: 3.8,
      setup(w) { const c = w.hero = w.actor("hero", { home: 270 }); c.maxHp = 100; c.hp = c.shown = 40; },
      fire(w) {
        const c = w.hero;
        c.hp = Math.min(100, c.hp + 50); c.oy = -16;
        w.emit("heal", c, 50);
      },
      update(w, dt) {
        const c = w.hero;
        c.hp = Math.max(20, c.hp - 30 * dt);
        if (!w.on("roll")) c.shown = c.hp;
        if (c.over) c.over.a -= dt * 1.5;
      },
      drawFront(w, ctx) { drawOvers(w, ctx); },
      drawHud(w, ctx) {
        const c = w.hero, bw = 130, x = c.x - bw / 2, y = G - c.h - 30;
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, bw + 6, 16, 6); ctx.fill();
        ctx.fillStyle = "#bbf7d0"; ctx.fillRect(x, y, bw * c.hp / 100, 10);
        ctx.fillStyle = "#22c55e"; ctx.fillRect(x, y, bw * Math.min(c.hp, c.shown) / 100, 10);
      },
      steps: [
        {
          id: "roll", name: { en: "Filling Bar", ko: "차오르는 체력바" }, param: "preview + fill 4/s",
          cap: { en: "Show the *target* first, then *fill up* to it.", ko: "*목표*를 먼저 보여주고, *차오르게*." },
          update(w, dt) { const c = w.hero; c.shown += (c.hp - c.shown) * Math.min(1, dt * 4); },
        },
        {
          id: "glow", name: { en: "Green Glow", ko: "초록 빛" }, param: "overlay .7 → 0",
          cap: { en: "The body *glows green*, then fades.", ko: "몸이 *초록빛*으로 빛나다 사그라져요." },
          heal(w, c) {
            c.over = { col: "#86efac", a: 0.8 };
            w.spawn({ type: "glow", x: c.x, y: G - 70, size: 120, size1: 60, life: 0.6, color: "74,222,128" });
          },
        },
        {
          id: "plus", name: { en: "Rising Pluses", ko: "올라가는 +" }, param: "12 × '+'",
          cap: { en: "Little *+ signs* float up off the body.", ko: "몸에서 작은 *+*가 둥실둥실." },
          heal(w, c) {
            for (let i = 0; i < 12; i++) w.after(i * 0.04, () => popText(w, "+", c.x + rand(-55, 55), G - rand(10, 100), rand(16, 26), "#86efac", { vy: rand(-140, -80), g: 0, life: 0.8 }));
          },
        },
        {
          id: "number", name: { en: "Heal Number", ko: "회복 숫자" }, param: "+50 · green",
          cap: { en: "A *green* number with a *plus*. Never white.", ko: "*초록* 숫자에 *+*. 흰색이면 피해로 보여요." },
          heal(w, c, n) { popText(w, "+" + n, c.x + 70, G - 120, 34, "#4ade80", { vy: -160, g: 160 }); },
        },
        {
          id: "beam", name: { en: "Light Column", ko: "빛기둥" }, param: "beam + floor ring",
          cap: { en: "A *column of light* from above, a *ring* on the floor.", ko: "위에서 *빛기둥*, 바닥엔 *고리*." },
          heal(w, c) {
            w.spawn({ type: "beam", x: c.x, y: G, size: 60, life: 0.6, h: 400, color: "187,247,208" });
            w.spawn({ type: "ring", flat: true, x: c.x, y: G, size: 20, size1: 110, life: 0.6, w: 6, color: "134,239,172" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "3-note chime",
          cap: { en: "A rising *three-note* chime. Soft, bright.", ko: "*도-미-솔* 올라가는 맑은 소리." },
          heal(w) { [0, 4, 7].forEach((n, i) => w.after(i * 0.07, () => w.sfx.chime(n))); },
        },
      ],
    },

    /* 10. 버프 */
    {
      id: "combat-buff", cat: "combat", view: "side",
      title: { en: "Make a buff *look* powerful", ko: "버프는 *세 보이게*" },
      intro: { en: "Attack +50%. Looks *exactly* the same.", ko: "공격력 +50%. 겉모습은 *똑같아요*." },
      interval: 1.6, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 270 }); w.buff = 0; },
      fire(w) { w.buff = 1.3; w.hero.oy = -20; w.emit("buff", w.hero); },
      update(w, dt) { w.buff -= dt; w.hero.over = null; },
      drawFront(w, ctx) {
        drawOvers(w, ctx);
        const c = w.hero; if (w.buff <= 0 || w.on("icon")) return;
        ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.moveTo(c.x, G - c.h - 46); ctx.lineTo(c.x + 14, G - c.h - 26); ctx.lineTo(c.x - 14, G - c.h - 26); ctx.fill();
      },
      steps: [
        {
          id: "burst", name: { en: "Power Burst", ko: "기 폭발" }, param: "ring + rays",
          cap: { en: "Start with a *burst*: crouch, then *rise*.", ko: "시작은 *폭발*로. 웅크렸다가 *솟구쳐요*." },
          buff(w, c) {
            c.sx = 1.2; c.sy = 0.8;
            w.spawn({ type: "ring", x: c.x, y: G - 70, size: 20, size1: 150, life: 0.4, w: 10, color: "253,224,71" });
            w.spawn({ type: "rays", under: true, x: c.x, y: G - 70, size: 170, life: 0.45, n: 14, vr: 2, color: "253,224,71" });
            w.flash("255,230,140", 0.15);
          },
        },
        {
          id: "aura", name: { en: "Flame Aura", ko: "불꽃 오라" }, param: "2 flames/frame",
          cap: { en: "Golden *flames* lick up the whole time.", ko: "버프 동안 *금빛 불꽃*이 일렁여요." },
          update(w) {
            const c = w.hero;
            if (w.buff <= 0) return;
            for (let i = 0; i < 2; i++) w.spawn({ type: "glow", x: c.x + rand(-55, 55), y: G - rand(0, 150), vy: rand(-220, -120), size: rand(12, 22), size1: 2, life: rand(0.3, 0.5), color: pick(["250,204,21", "253,224,71", "251,146,60"]) });
          },
        },
        {
          id: "grow", name: { en: "Grow 12%", ko: "12% 커지기" }, param: "scale 1.12",
          cap: { en: "Make the hero a bit *bigger*. Power is size.", ko: "살짝 *커지게*. 힘은 크기로 보여요." },
          update(w) { if (w.buff > 0) { w.hero.sx = 1.12; w.hero.sy = 1.12; } },
        },
        {
          id: "tint", name: { en: "Golden Tint", ko: "금빛 몸" }, param: "pulse .3–.45",
          cap: { en: "Tint the body *gold*. Make it *pulse*.", ko: "몸을 *금빛*으로, *두근두근*." },
          update(w) { if (w.buff > 0) w.hero.over = { col: "#fde047", a: 0.3 + 0.15 * Math.sin(w.time * 16) }; },
        },
        {
          id: "streaks", name: { en: "Rising Streaks", ko: "솟는 빛줄기" }, param: "vy −700",
          cap: { en: "Fast *streaks* shooting *upward*.", ko: "빠른 *빛줄기*가 *위로* 쭉쭉." },
          update(w) {
            const c = w.hero;
            if (w.buff <= 0 || Math.random() < 0.5) return;
            w.spawn({ type: "spark", x: c.x + rand(-70, 70), y: G - rand(0, 40), vy: -rand(500, 800), life: 0.3, size: 2.5, color: "255,240,170" });
          },
        },
        {
          id: "icon", name: { en: "Stat Callout", ko: "능력치 표시" }, param: "ATK ▲",
          cap: { en: "Tell them *what* went up: *ATK ▲*.", ko: "*뭐가* 올랐는지 말해줘요. *ATK ▲*." },
          buff(w, c) { popText(w, "ATK ▲", c.x, G - c.h - 40, 30, "#fde047", { vy: -60, g: 0, life: 1.2 }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising roar",
          cap: { en: "A *rising* roar. Up = stronger.", ko: "*올라가는* 소리. 위로 = 강해짐." },
          buff(w) { w.sfx.boost(); },
        },
      ],
    },

    /* 11. 디버프 */
    {
      id: "combat-debuff", cat: "combat", view: "side",
      title: { en: "Make a debuff feel *heavy*", ko: "디버프는 *축 처지게*" },
      intro: { en: "Weakened, they say. Looks *totally fine*.", ko: "약해졌대요. *멀쩡해* 보여요." },
      interval: 1.6, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 410 }); w.curse = 0; },
      fire(w) {
        const p = paw(w), f = w.foe;
        const o = { x: p.x, y: p.y, vx: 800, vy: 0, r: 9, color: "#a855f7", hitX: f.x - 40 };
        o.onHit = () => { f.ox += 8; w.curse = 1.4; w.emit("curse", { x: o.x, y: o.y }, f); };
        w.shoot(o);
      },
      update(w, dt) { const f = w.foe; w.curse -= dt; f.over = null; f.rot = 0; },
      drawFront(w, ctx) {
        drawOvers(w, ctx);
        const f = w.foe; if (w.curse <= 0 || w.on("icon")) return;
        ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.moveTo(f.x, G - f.h - 22); ctx.lineTo(f.x + 14, G - f.h - 42); ctx.lineTo(f.x - 14, G - f.h - 42); ctx.fill();
      },
      steps: [
        {
          id: "smog", name: { en: "Falling Smog", ko: "내려앉는 기운" }, param: "16 puffs · fall",
          cap: { en: "Dark smog *falls on* the target. Buffs rise, debuffs *sink*.", ko: "검은 기운이 *내려앉아요*. 버프는 위로, 디버프는 *아래로*." },
          curse(w, h, f) {
            for (let i = 0; i < 16; i++) w.spawn({ type: "smoke", x: f.x + rand(-60, 50), y: G - rand(150, 200), vx: rand(-20, 20), vy: rand(120, 220), drag: 1.5, size: rand(8, 12), size1: rand(20, 30), life: rand(0.6, 0.9), color: "76,29,149" });
          },
        },
        {
          id: "tint", name: { en: "Sickly Purple", ko: "보랏빛 몸" }, param: "overlay .5",
          cap: { en: "Tint the body a *sickly purple*.", ko: "몸을 *칙칙한 보라*로." },
          update(w) { if (w.curse > 0) w.foe.over = { col: "#7c3aed", a: 0.5 }; },
        },
        {
          id: "droop", name: { en: "Droop", ko: "축 처짐" }, param: "squash .86 · lean",
          cap: { en: "*Squash* and *lean*. The body looks tired.", ko: "*납작*하게, *구부정*하게. 지쳐 보여요." },
          update(w) { const f = w.foe; if (w.curse > 0) { f.sy = 0.86; f.sx = 1.06; f.rot = -0.12; } },
        },
        {
          id: "arrows", name: { en: "Sinking Arrows", ko: "가라앉는 화살표" }, param: "▼ drift down",
          cap: { en: "Little *▼ arrows* drift *down* the body.", ko: "작은 *▼*가 몸을 타고 *내려가요*." },
          update(w) {
            const f = w.foe;
            if (w.curse <= 0 || Math.random() < 0.85) return;
            popText(w, "▼", f.x + rand(-50, 40), G - rand(90, 140), 18, "#c084fc", { vy: 70, g: 0, life: 0.8 });
          },
        },
        {
          id: "icon", name: { en: "Stat Callout", ko: "능력치 표시" }, param: "ATK ▼",
          cap: { en: "Say *what* dropped: *ATK ▼*.", ko: "*뭐가* 떨어졌는지: *ATK ▼*." },
          curse(w, h, f) { popText(w, "ATK ▼", f.x, G - f.h - 34, 28, "#c084fc", { vy: 40, g: 0, life: 1.3 }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "falling drone",
          cap: { en: "A *falling*, sour drone.", ko: "*내려가는* 우울한 소리." },
          curse(w) { w.play(() => { tn({ type: "sawtooth", f: 330, f2: 110, dur: 0.6, vol: 0.1 }); tn({ type: "sawtooth", f: 349, f2: 116, dur: 0.6, vol: 0.08 }); }); },
        },
      ],
    },

    /* 12. 기절 별 */
    {
      id: "combat-stun", cat: "combat", view: "side",
      title: { en: "Show a stun with *spinning stars*", ko: "기절은 *빙글빙글 별*로" },
      intro: { en: "Stunned for a second. Just *standing* there.", ko: "1초 기절인데 그냥 *서 있어요*." },
      interval: 1.7, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.blade = { rot: -1 }; w.foe = w.actor("foe", { home: 400, hp: 300 }); w.stun = 0; w.idle = 0; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        lunge(w, at => { f.hp -= 10; if (f.hp <= 0) f.hp = f.maxHp; f.ox += 10; w.stun = 1.2; w.emit("hit", at, f); }, { done: () => { w.busy = false; } });
      },
      update(w, dt) {
        const f = w.foe;
        w.stun -= dt; f.rot = 0;
        if (w.stun <= 0) { w.idle += dt; f.sy = 1 + Math.sin(w.idle * 5) * 0.03; }
        if (w.timer) w.timer.t -= dt;
      },
      drawFront(w, ctx) {
        drawBlade(w, ctx);
        const f = w.foe, s = w.stars;
        if (!s || w.stun <= 0) return;
        const cx = f.x + f.ox - 14, cy = G - f.h - 6;
        ctx.strokeStyle = "rgba(253,224,71,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 46, 12, 0, 0, TAU); ctx.stroke();
        for (let i = 0; i < s.n; i++) {
          const a = w.time * s.spin + i * TAU / s.n, x = cx + Math.cos(a) * 46, y = cy + Math.sin(a) * 12, k = 0.75 + 0.25 * Math.sin(a);
          ctx.fillStyle = "#fde047"; starPath(ctx, x, y, 13 * k); ctx.fill();
        }
      },
      drawHud(w, ctx) {
        const f = w.foe, t = w.timer;
        drawBar(ctx, f);
        if (!t || t.t <= 0) return;
        const x = f.x - 37, y = f.gy - f.h - 6;
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - 2, y - 2, 78, 8);
        ctx.fillStyle = "#fde047"; ctx.fillRect(x, y, 74 * t.t / t.max, 4);
      },
      steps: [
        {
          id: "bonk", name: { en: "Head Bonk", ko: "머리 콩" }, param: "squash .7 + star",
          cap: { en: "*Squash* the body flat on the bonk.", ko: "*콩* 맞는 순간 몸이 *납작*." },
          hit(w, at, f) {
            f.sy = 0.7; f.sx = 1.25; f.flash = 1;
            w.spawn({ type: "star", x: f.x - 20, y: G - f.h + 10, size: 54, life: 0.15, color: "255,255,255" });
          },
        },
        {
          id: "stars", name: { en: "Orbiting Stars", ko: "도는 별" }, param: "3 stars · 7 rad/s",
          cap: { en: "*Stars* circle the head. Everyone knows it.", ko: "머리 위로 *별*이 빙글빙글. 누구나 알아요." },
          hit(w) { w.stars = { n: 3, spin: 7 }; },
        },
        {
          id: "wobble", name: { en: "Dizzy Sway", ko: "비틀비틀" }, param: "±0.12 rad",
          cap: { en: "*Sway* side to side. The idle breathing *stops*.", ko: "좌우로 *비틀*. 숨 쉬던 움직임은 *멈춰요*." },
          update(w) { if (w.stun > 0) w.foe.rot = Math.sin(w.time * 9) * 0.12; },
        },
        {
          id: "timer", name: { en: "Stun Timer", ko: "기절 타이머" }, param: "yellow bar 1.2s",
          cap: { en: "A *timer bar* shows *how long* it lasts.", ko: "*얼마나* 남았는지 *타이머*로." },
          hit(w) { w.timer = { t: 1.2, max: 1.2 }; },
        },
        {
          id: "stop", name: { en: "Hit Stop", ko: "멈칫" }, param: "80ms",
          cap: { en: "A short *freeze* sells the bonk.", ko: "짧게 *멈칫*하면 콩이 묵직해요." },
          hit(w) { w.hitstop(0.08); w.shake(0.2); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "bonk + twinkle",
          cap: { en: "A hollow *bonk*, then a *twinkle* loop.", ko: "*콩!* 그리고 *띠링띠링*." },
          hit(w) {
            w.sfx.thunk();
            for (let i = 0; i < 4; i++) w.after(0.15 + i * 0.18, () => w.sfx.chime(i % 2 ? 7 : 12));
          },
        },
      ],
    },

    /* 13. 넘어짐과 일어남 */
    {
      id: "combat-knockdown", cat: "combat", view: "side",
      title: { en: "Knock them *down*. Let them *get up*.", ko: "*쓰러지고*, *일어나게*" },
      intro: { en: "Down. Up. Like flipping a *switch*.", ko: "누웠다, 섰다. *스위치* 켜듯." },
      interval: 2.2, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.blade = { rot: -1 }; w.foe = w.actor("foe", { home: 360, hp: 300 }); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        lunge(w, at => {
          f.hp -= 20; if (f.hp <= 0) f.hp = f.maxHp;
          w.emit("hit", at, f);
          if (w.on("fall")) w.emit("fall", f);
          else { f.rot = 1.57; f.x = f.home + 80; f.oy = LIE; w.emit("land", f); }
          w.after(1.1, () => {
            w.busy = false;
            if (w.on("getup")) w.emit("getup", f);
            else { f.rot = 0; f.oy = 0; f.x = f.home; }
          });
        });
      },
      drawFront(w, ctx) { drawBlade(w, ctx); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "fall", name: { en: "Arc Fall", ko: "포물선 낙하" }, param: "up 50px · 300ms",
          cap: { en: "Lift a little, then *fall* in an arc.", ko: "살짝 *떴다가*, 포물선으로 *쿵*." },
          fall(w, f) {
            w.tween(f, { rot: 1.57, x: f.home + 80 }, 0.3, "lin", () => w.emit("land", f));
            w.tween(f, { oy: -50 }, 0.13, "out", () => w.tween(f, { oy: LIE }, 0.17, "in"));
          },
        },
        {
          id: "stop", name: { en: "Impact Stop", ko: "타격 멈칫" }, param: "100ms · flash",
          cap: { en: "*Freeze* on the hit, before the fall.", ko: "쓰러지기 전, 맞는 순간 *멈칫*." },
          hit(w, at, f) { w.hitstop(0.1); f.flash = 1; w.spawn({ type: "star", x: at.x + 10, y: at.y, size: 60, life: 0.12, color: "255,255,255" }); },
        },
        {
          id: "bounce", name: { en: "Ground Bounce", ko: "바닥 튕김" }, param: "14px · dust ×12",
          cap: { en: "The body *bounces* once and kicks up *dust*.", ko: "바닥에서 *한 번 튕기고*, *먼지*가 퍽." },
          land(w, f) {
            w.tween(f, { oy: LIE - 16 }, 0.08, "out", () => w.tween(f, { oy: LIE }, 0.1, "in"));
            dust(w, f.x, G, 12);
          },
        },
        {
          id: "shake", name: { en: "Landing Shake", ko: "착지 흔들림" }, param: "kick 10px down",
          cap: { en: "The *floor* takes the hit. Shake *down*.", ko: "*바닥*이 맞은 거예요. *아래로* 흔들어요." },
          land(w) { w.shake(0.3); w.kick(0, 10); },
        },
        {
          id: "getup", name: { en: "Get-up", ko: "일어나기" }, param: "squash → back ease",
          cap: { en: "*Push off* the floor, overshoot, *blink* while safe.", ko: "바닥을 *밀고* 벌떡, 무적 동안 *깜빡*." },
          getup(w, f) {
            f.sx = 1.25; f.sy = 0.8; f.blink = 0.7;
            w.tween(f, { rot: 0, oy: 0, x: f.home }, 0.3, "back");
            dust(w, f.x, G, 6);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "hit + body thud",
          cap: { en: "Hit *crack*, then a body *thud* on landing.", ko: "맞을 때 *퍽*, 떨어질 때 *쿵*." },
          hit(w) { w.sfx.hit(); },
          land(w) { w.sfx.thud(); },
          getup(w) { w.sfx.jump(); },
        },
      ],
    },

    /* 14. 래그돌 */
    {
      id: "combat-ragdoll", cat: "combat", view: "side",
      title: { en: "Launch bodies like *ragdolls*", ko: "*헝겊 인형*처럼 날려 보내기" },
      intro: { en: "Huge hit. It just *slides* away.", ko: "세게 쳤는데 *스르륵* 밀려나요." },
      interval: 2.2, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 70 }); w.blade = { rot: -1 }; w.foe = w.actor("foe", { home: 230 }); w.rag = null; },
      fire(w) {
        const f = w.foe;
        if (w.rag) { w.rag = null; Object.assign(f, { x: f.home, oy: 0, rot: 0, alpha: 1 }); }
        lunge(w, at => { const r = w.rag = { vx: 520, vy: 0, vr: 0, t: 0 }; w.emit("launch", r, at); });
      },
      update(w, dt) {
        const f = w.foe, r = w.rag;
        if (!r) return;
        r.t += dt; r.vy += 1700 * dt;
        f.x += r.vx * dt; f.oy += r.vy * dt; f.rot += r.vr * dt;
        if (f.x > 480) { f.x = 480; r.vx *= -0.3; }
        if (f.oy >= 0 && r.vy > 0) {
          f.oy = 0;
          if (r.vy > 300) w.emit("bounce", r, f);
          if (r.vy > 0) { r.vy = 0; r.vx *= Math.pow(0.02, dt); r.vr *= Math.pow(0.02, dt); }
        }
        if (r.t > 1.8) { w.rag = null; Object.assign(f, { x: f.home, oy: 0, rot: 0, alpha: 0 }); w.tween(f, { alpha: 1 }, 0.2, "out"); }
      },
      drawFront(w, ctx) { drawBlade(w, ctx); },
      steps: [
        {
          id: "stop", name: { en: "Launch Impact", ko: "발사 순간 타격" }, param: "120ms · star · shake",
          cap: { en: "*Freeze*, flash, shake. Then let it fly.", ko: "*멈칫*, 번쩍, 흔들. 그다음 날려요." },
          launch(w, r, at) {
            w.hitstop(0.12); w.shake(0.4, 1); w.foe.flash = 1;
            w.spawn({ type: "star", x: at.x + 10, y: at.y, size: 80, life: 0.15, color: "255,255,255" });
          },
        },
        {
          id: "arc", name: { en: "Launch Up", ko: "위로 띄우기" }, param: "vy −700",
          cap: { en: "Send it *up*, not along the floor.", ko: "바닥으로 밀지 말고 *위로* 띄워요." },
          launch(w, r) { r.vx = 330; r.vy = -700; },
        },
        {
          id: "spin", name: { en: "Tumble", ko: "빙글빙글" }, param: "12 rad/s",
          cap: { en: "Bodies in the air *tumble*.", ko: "공중에 뜬 몸은 *빙글빙글*." },
          launch(w, r) { r.vr = 12; },
        },
        {
          id: "bounce", name: { en: "Bounce", ko: "튕기기" }, param: "×0.45 · dust",
          cap: { en: "Hit the floor and *bounce*. Lose energy each time.", ko: "바닥에 닿으면 *튕겨요*. 튈 때마다 약하게." },
          bounce(w, r, f) {
            r.vy *= -0.45; r.vr *= -0.6;
            f.sx = 1.25; f.sy = 0.8;
            dust(w, f.x, G, 8);
          },
        },
        {
          id: "trail", name: { en: "Motion Trail", ko: "궤적 꼬리" }, param: "glow / frame",
          cap: { en: "Leave a *streak* so the eye can follow.", ko: "*꼬리*를 남겨야 눈이 따라가요." },
          update(w) {
            const f = w.foe;
            if (!w.rag || f.oy > -5) return;
            w.spawn({ type: "glow", under: true, x: f.x - 10, y: G - f.h / 2 + f.oy, size: 30, size1: 4, life: 0.4, color: "190,242,100" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crunch + thumps",
          cap: { en: "A *crunch* to launch, a *thump* per bounce.", ko: "날릴 때 *콰직*, 튈 때마다 *쿵*." },
          launch(w) { w.sfx.crit(); },
          bounce(w) { w.sfx.thunk(); },
        },
      ],
    },

    /* 15. 연타 */
    {
      id: "combat-flurry", cat: "combat", view: "side",
      title: { en: "Make a flurry *stack up*", ko: "연타 숫자는 *쌓이게*" },
      intro: { en: "Seven hits. You can read *one* number.", ko: "일곱 대 때렸는데 숫자는 *하나*만 보여요." },
      interval: 1.4, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.blade = { rot: -1 }; w.foe = w.actor("foe", { home: 400, hp: 500 }); w.tot = null; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const c = w.hero, f = w.foe, at = { x: f.x - 52, y: G - 72 };
        w.tween(c, { x: f.x - 106 }, 0.08, "in", () => {
          for (let i = 0; i < 7; i++) w.after(i * 0.055, () => {
            w.blade.rot = i % 2 ? -1.4 : 0.6;
            f.hp -= 24; if (f.hp <= 0) f.hp = f.maxHp;
            const n = popText(w, "24", at.x + 20, at.y - 30, 24, "#ffffff", { vy: -10, g: 0, life: 1.5 });
            w.emit("hit", at, i, n);
            if (i === 6) w.emit("last", at);
          });
          w.after(0.5, () => w.tween(c, { x: c.home }, 0.25, "inout", () => { w.blade.rot = -1; w.busy = false; }));
        });
      },
      update(w, dt) { if (w.tot) w.tot.t -= dt; },
      drawFront(w, ctx) { drawBlade(w, ctx); },
      drawHud(w, ctx) {
        drawBar(ctx, w.foe);
        const t = w.tot;
        if (!t || t.t <= 0) return;
        ctx.save(); ctx.globalAlpha = Math.min(1, t.t * 3);
        label(ctx, t.n + " HITS", 40, 72, 34, "#fde047", "left");
        label(ctx, "TOTAL " + t.d, 42, 104, 18, "#ffffff", "left");
        ctx.restore();
      },
      steps: [
        {
          id: "stack", name: { en: "Stack Upward", ko: "위로 쌓기" }, param: "−17px · zigzag",
          cap: { en: "Each new number sits *above* the last. *Zigzag* them.", ko: "새 숫자는 *위로* 쌓고, *지그재그*로." },
          hit(w, at, i, n) { n.y -= i * 17; n.x += i % 2 ? 26 : -26; },
        },
        {
          id: "heat", name: { en: "Heat Up", ko: "점점 뜨겁게" }, param: "+4px · white → orange",
          cap: { en: "Later hits get *bigger* and *hotter*.", ko: "뒤로 갈수록 *크고* *뜨겁게*." },
          hit(w, at, i, n) { n.size = 20 + i * 4; n.color = ["#fff", "#fff", "#fef08a", "#fde047", "#facc15", "#fb923c", "#f97316"][i]; },
        },
        {
          id: "total", name: { en: "Running Total", ko: "누적 합계" }, param: "HITS + sum",
          cap: { en: "Count it up: *7 HITS*, and the *total*.", ko: "*7 HITS*, 그리고 *합계*를 세어줘요." },
          hit(w, at, i) { w.tot = { n: i + 1, d: (i + 1) * 24, t: 1.8 }; },
        },
        {
          id: "slashes", name: { en: "Criss-cross Slashes", ko: "엇갈린 베기" }, param: "1 slash / hit",
          cap: { en: "A quick *slash mark* for every single hit.", ko: "한 대마다 *베기 자국* 하나씩." },
          hit(w, at, i) { w.spawn({ type: "slash", x: at.x + 30, y: at.y + rand(-20, 20), ang: i % 2 ? 0.6 : -0.6, len: 46, size: 7, life: 0.18, color: "255,255,255" }); w.foe.flash = 0.7; },
        },
        {
          id: "push", name: { en: "Push Along", ko: "조금씩 밀림" }, param: "+8px / hit",
          cap: { en: "Every hit pushes a *little more*.", ko: "맞을 때마다 *조금씩 더* 밀려요." },
          hit(w) { const f = w.foe; f.ox += 8; f.k = 2; },
        },
        {
          id: "finisher", name: { en: "Finisher", ko: "마무리 한 방" }, param: "120ms · shake .4",
          cap: { en: "The *last hit* lands harder. End on a beat.", ko: "*마지막 한 대*는 더 세게. 박자로 끝내요." },
          last(w, at) {
            w.hitstop(0.12); w.shake(0.4, 1); w.foe.ox += 40;
            w.spawn({ type: "star", x: at.x + 30, y: at.y, size: 80, life: 0.15, color: "255,240,200" });
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "pitch +1 / hit",
          cap: { en: "Raise the pitch *every hit*. It builds.", ko: "칠 때마다 음을 *한 칸씩*. 쌓이는 느낌." },
          hit(w, at, i) { w.sfx.blip(i + 1); w.sfx.tick(); },
          last(w) { w.sfx.crit(); },
        },
      ],
    },

    /* 16. 흡혈 */
    {
      id: "combat-lifesteal", cat: "combat", view: "side",
      title: { en: "Make lifesteal *visible*", ko: "흡혈은 *눈에 보이게*" },
      intro: { en: "My HP went up. From *where?*", ko: "체력이 늘었어요. *어디서?*" },
      interval: 1.6, stepDur: 3.8,
      setup(w) {
        const c = w.hero = w.actor("hero", { home: 120 }); c.maxHp = 100; c.hp = 40; w.blade = { rot: -1 };
        w.foe = w.actor("foe", { home: 400, hp: 300 }); w.orbs = [];
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        lunge(w, at => {
          f.hp -= 30; if (f.hp <= 0) f.hp = f.maxHp; f.flash = 0.8;
          w.emit("hit", at);
          if (!w.on("orbs")) gainHp(w, 24);
        }, { done: () => { w.busy = false; } });
      },
      update(w, dt) {
        const c = w.hero;
        c.hp = Math.max(30, c.hp - 12 * dt);
        if (c.over) c.over.a -= dt * 3;
        for (const o of w.orbs) {
          o.t += dt / o.dur;
          if (o.t < 0) continue;
          const k = E.in(Math.min(1, o.t)), q = 1 - k, tx = c.x + c.ox + 10, ty = G - 80;
          const mx = (o.x0 + tx) / 2 + o.cx, my = (o.y0 + ty) / 2 + o.cy;
          o.x = q * q * o.x0 + 2 * q * k * mx + k * k * tx; o.y = q * q * o.y0 + 2 * q * k * my + k * k * ty;
          if (o.trail) w.spawn({ type: "glow", x: o.x, y: o.y, size: 10, size1: 0, life: 0.25, color: o.trail });
          if (o.t >= 1) { o.dead = true; gainHp(w, o.n); }
        }
        w.orbs = w.orbs.filter(o => !o.dead);
      },
      drawFront(w, ctx) {
        drawBlade(w, ctx); drawOvers(w, ctx);
        for (const o of w.orbs) {
          if (o.t < 0) continue;
          if (o.glow) { ctx.globalCompositeOperation = "lighter"; glow(ctx, o.x, o.y, 20, "248,113,113", 1); ctx.globalCompositeOperation = "source-over"; }
          ctx.fillStyle = o.glow ? "#fff1f2" : "#ef4444"; ctx.beginPath(); ctx.arc(o.x, o.y, 5, 0, TAU); ctx.fill();
        }
      },
      drawHud(w, ctx) { bar(ctx, w.foe); bar(ctx, w.hero, "#22c55e"); },
      steps: [
        {
          id: "orbs", name: { en: "Blood Orbs", ko: "생명 구슬" }, param: "6 orbs · 0.7s",
          cap: { en: "Pull *orbs* out of the enemy. Heal when they *arrive*.", ko: "적에게서 *구슬*을 뽑아요. *도착*해야 회복." },
          hit(w, at) {
            for (let i = 0; i < 6; i++) w.orbs.push({ x0: at.x + 30, y0: at.y + rand(-20, 20), x: 0, y: 0, t: -i * 0.1, dur: 0.7, cx: 0, cy: 0, n: 4 });
          },
        },
        {
          id: "curve", name: { en: "Curved Paths", ko: "휘어지는 길" }, param: "random bezier",
          cap: { en: "Straight lines look *robotic*. *Curve* each one.", ko: "직선은 *기계* 같아요. 하나하나 *휘어지게*." },
          hit(w) { for (const o of w.orbs) { o.cx = rand(-60, 60); o.cy = rand(-170, -60); } },
        },
        {
          id: "glow", name: { en: "Glow + Trail", ko: "빛과 꼬리" }, param: "red glow · trail",
          cap: { en: "A glowing *core* and a red *trail*.", ko: "빛나는 *구슬*에 붉은 *꼬리*." },
          hit(w) { for (const o of w.orbs) { o.glow = true; o.trail = "248,113,113"; } },
        },
        {
          id: "absorb", name: { en: "Absorb Pulse", ko: "흡수 반응" }, param: "red glow + bump",
          cap: { en: "Each orb that lands makes the hero *pulse*.", ko: "구슬이 닿을 때마다 몸이 *두근*." },
          gain(w, c) {
            c.over = { col: "#f87171", a: 0.6 }; c.sx = 1.06; c.sy = 0.95;
            w.spawn({ type: "ring", x: c.x + 10, y: G - 80, size: 8, size1: 40, life: 0.25, w: 4, color: "252,165,165" });
          },
        },
        {
          id: "numbers", name: { en: "Heal Ticks", ko: "회복 숫자" }, param: "+4 green",
          cap: { en: "Small *green +4s* on the hero, one per orb.", ko: "구슬 하나에 *초록 +4* 하나." },
          gain(w, c, n) { popText(w, "+" + n, c.x + rand(-30, 30), G - 160, 20, "#4ade80", { vy: -120, g: 100, life: 0.8 }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "slash + soft pops",
          cap: { en: "A *slash*, then soft *pops* as orbs land.", ko: "*베고*, 구슬이 닿을 때마다 *뽁*." },
          hit(w) { w.sfx.slashHit(); },
          gain(w) { w.sfx.blip(5); },
        },
      ],
    },

    /* 17. 오버킬 */
    {
      id: "combat-overkill", cat: "combat", view: "side",
      title: { en: "Make overkill *look* like overkill", ko: "오버킬은 *과하게*" },
      intro: { en: "260 damage on 20 HP. Same as a *tap*.", ko: "체력 20에 260 데미지. 툭 친 거랑 *같아요*." },
      interval: 1.6, stepDur: 3.8,
      setup(w) { w.hero = w.actor("hero", { home: 120 }); w.blade = { rot: -1 }; w.foe = w.actor("foe", { home: 400, hp: 20 }); },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        if (!f.alive) w.respawn(f);
        lunge(w, at => {
          const over = 260 - f.hp;
          f.hp -= 260;
          popText(w, "260", at.x + 20, at.y - 40, 26, "#ffffff");
          w.emit("hit", at, over, f);
          w.kill(f);
        }, { done: () => { w.busy = false; } });
      },
      drawFront(w, ctx) { drawBlade(w, ctx); },
      drawHud(w, ctx) { drawBar(ctx, w.foe); },
      steps: [
        {
          id: "callout", name: { en: "Excess Callout", ko: "넘친 데미지 표시" }, param: "OVERKILL +240",
          cap: { en: "Show the *excess*: *OVERKILL +240*.", ko: "넘친 만큼 보여줘요: *OVERKILL +240*." },
          hit(w, at, over) {
            popText(w, "OVERKILL", at.x - 10, at.y - 90, 36, "#f97316", { vy: -15, g: 0, life: 1.6 });
            popText(w, "+" + over, at.x - 10, at.y - 56, 26, "#fca5a5", { vy: -15, g: 0, life: 1.6 });
          },
        },
        {
          id: "stop", name: { en: "Long Freeze", ko: "긴 멈춤" }, param: "200ms + zoom 12%",
          cap: { en: "Freeze *longer* than any normal kill.", ko: "보통 처치보다 *더 길게* 멈춰요." },
          hit(w) { w.hitstop(0.2); w.zoomPunch(0.12); w.flash("255,255,255", 0.3); },
        },
        {
          id: "slash", name: { en: "Screen-wide Slash", ko: "화면 가르기" }, param: "len 300",
          cap: { en: "The slash *keeps going* past the target.", ko: "베기가 적을 *뚫고 지나가요*." },
          hit(w, at) {
            w.spawn({ type: "slash", x: at.x + 60, y: at.y - 10, ang: -0.35, len: 300, size: 20, life: 0.4, color: "255,255,255" });
            w.spawn({ type: "slash", x: at.x + 60, y: at.y - 10, ang: -0.35, len: 280, size: 34, life: 0.3, color: "249,115,22" });
          },
        },
        {
          id: "gib", name: { en: "Burst Apart", ko: "산산조각" }, param: "36 chunks · far",
          cap: { en: "Too much damage? The body *bursts apart*.", ko: "데미지가 넘치면 몸이 *터져 흩어져요*." },
          kill(w, f) {
            for (let i = 0; i < 36; i++) w.spawn({ type: "chunk", x: f.x + rand(-40, 40), y: G - rand(20, 120), vx: rand(-200, 800), vy: rand(-800, -200), g: 1600, ground: true, bounce: 0.35, vr: rand(-30, 30), life: rand(1.5, 2.2), size: rand(5, 12), color: pick(["132,204,22", "77,124,15", "190,242,100"]), hold: true });
            w.spawn({ type: "ellipse", under: true, x: f.x + 30, y: G + 2, size: 120, life: 3, color: "63,98,18", alpha: 0.7, hold: true, add: false });
          },
        },
        {
          id: "bar", name: { en: "Bar Shatters", ko: "체력바 깨짐" }, param: "bar → 10 shards",
          cap: { en: "Even the *HP bar* breaks.", ko: "*체력바*까지 깨져요." },
          kill(w, f) {
            for (let i = 0; i < 10; i++) w.spawn({ type: "chunk", x: f.x - 37 + i * 8, y: G - f.h - 18, vx: rand(-150, 300), vy: rand(-400, -100), g: 1400, vr: rand(-20, 20), life: rand(0.8, 1.2), size: 5, color: i < 3 ? "239,68,68" : "60,60,70", hold: true });
          },
        },
        {
          id: "shake", name: { en: "Huge Shake", ko: "크게 흔들림" }, param: "trauma .8",
          cap: { en: "Way more shake than it *needs*. That's the point.", ko: "*필요 이상*으로 흔들어요. 그게 포인트." },
          hit(w) { w.shake(0.8, 1); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "crunch + boom",
          cap: { en: "A *crunch* with a *boom* under it.", ko: "*콰직* 밑에 *쾅*." },
          hit(w) { w.sfx.crit(); w.sfx.boom(); },
        },
      ],
    },

    /* 18. 마지막 처치 슬로모션 */
    {
      id: "combat-lastkill", cat: "combat", view: "side",
      title: { en: "Slow down the *final kill*", ko: "마지막 한 방은 *슬로모션*" },
      intro: { en: "Last enemy down. Felt like *any* other.", ko: "마지막 적인데 *평소*랑 똑같아요." },
      interval: 2.4, stepDur: 4.2,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.gun = { kick: 0, rot: 0 }; w.foe = w.actor("foe", { home: 400, hp: 1 }); w.lb = 0; },
      fire(w) {
        const f = w.foe, m = muzzle(w);
        if (!f.alive) w.respawn(f);
        w.gun.kick = 12;
        w.emit("fire", m);
        w.shoot({ x: m.x, y: m.y, vx: 1700, vy: 0, len: 50, hitX: f.x - 60, onHit: () => { if (f.alive) { f.hp = 0; w.kill(f); } } });
      },
      update(w, dt) {
        gunSpring(w, dt);
        w.lb = Math.max(0, w.lb - dt * 1.5);
        if (w.ts >= 1) { w.cam.tx = 0; w.cam.ty = 0; }
      },
      drawFront(w, ctx) { drawGun(w, ctx); },
      drawHud(w, ctx) {
        label(ctx, "ENEMIES LEFT  " + (w.foe.alive ? 1 : 0), 270, 52, 14, "rgba(255,255,255,0.7)");
        if (w.lb <= 0) return;
        const h = 46 * Math.min(1, w.lb * 2);
        ctx.fillStyle = "#000"; ctx.fillRect(-100, -100, 740, 100 + h); ctx.fillRect(-100, 360 - h, 740, 200);
      },
      steps: [
        {
          id: "slow", name: { en: "Slow Motion", ko: "슬로모션" }, param: "×0.15 · 1.0s",
          cap: { en: "On the *last* kill only, slow time *way* down.", ko: "*마지막* 처치에서만 시간을 *확* 늦춰요." },
          kill(w) { w.slowmo(0.15, 1.0); },
        },
        {
          id: "fly", name: { en: "Body Flies", ko: "몸이 날아감" }, param: "launch + spin",
          cap: { en: "Don't delete it. Let the body *sail* in slow-mo.", ko: "지우지 말고, 느리게 *날아가게*." },
          kill(w, f) { w.fly(f, 300, -520, 5); f.flash = 1.5; },
        },
        {
          id: "zoom", name: { en: "Camera Push", ko: "카메라 다가가기" }, param: "zoom 18% · pan",
          cap: { en: "*Push the camera in* on the target.", ko: "카메라가 적에게 *쑥 다가가요*." },
          kill(w) { w.cam.tx = 90; w.cam.ty = -30; },
          update(w) { if (w.ts < 1) w.zoom = Math.max(w.zoom, 0.18); },
        },
        {
          id: "bars", name: { en: "Letterbox", ko: "영화 띠" }, param: "46px bars",
          cap: { en: "Black *cinema bars*. Now it's a *scene*.", ko: "위아래 *검은 띠*. 이제 *영화*예요." },
          kill(w) { w.lb = 1; },
        },
        {
          id: "flash", name: { en: "Kill Flash", ko: "처치 섬광" }, param: "screen .35 + ring",
          cap: { en: "One *white frame* and a *ring* to mark it.", ko: "*하얀 한 프레임*과 *고리* 하나." },
          kill(w, f) {
            w.flash("255,255,255", 0.35);
            w.spawn({ type: "ring", x: f.x - 20, y: G - 70, size: 10, size1: 140, life: 0.25, w: 10, color: "255,255,255" });
          },
        },
        {
          id: "text", name: { en: "CLEAR Banner", ko: "CLEAR 문구" }, param: "56px · lime",
          cap: { en: "Name the moment: *CLEAR*.", ko: "순간에 이름을 붙여요: *CLEAR*." },
          kill(w) { popText(w, "CLEAR", 300, 110, 56, "#c6f432", { vy: 0, g: 0, life: 0.5 }); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "shot + deep boom",
          cap: { en: "A *deep, long* boom. Like time stretched.", ko: "*낮고 길게* 쿵. 시간이 늘어난 것처럼." },
          fire(w) { w.sfx.gun(); },
          kill(w) { w.play(() => { tn({ f: 70, f2: 28, dur: 1.4, vol: 0.8 }); nz({ f: 700, f2: 60, dur: 1.5, vol: 0.5 }); }); },
        },
      ],
    },

    /* 19. 적 등장 예고 */
    {
      id: "combat-spawn", cat: "combat", view: "side",
      title: { en: "Warn *before* an enemy spawns", ko: "적이 나오기 *전에* 알려주기" },
      intro: { en: "*Pop.* An enemy. No warning at all.", ko: "*뿅.* 적이 나왔어요. 예고도 없이." },
      interval: 1.9, stepDur: 4.0,
      setup(w) { w.hero = w.actor("hero", { home: 110 }); w.foe = w.actor("foe", { home: 400 }); w.foe.alpha = 0; w.portal = null; },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const f = w.foe;
        f.alpha = 0;
        const appear = () => { f.alpha = 1; w.busy = false; w.emit("spawn", f); };
        if (w.on("mark")) { w.emit("mark", f); w.after(0.5, appear); } else w.after(0.45, appear);
      },
      update(w, dt) { const p = w.portal; if (p && (p.t -= dt) <= 0) w.portal = null; },
      drawBack(w, ctx) {
        const p = w.portal; if (!p) return;
        const f = w.foe, k = Math.min(1, (p.max - p.t) / 0.25, p.t / 0.25), cx = f.x, cy = G - 75;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k, 1);
        ctx.globalCompositeOperation = "lighter";
        glow(ctx, 0, 0, 100, "147,51,234", 0.6);
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = `rgba(${i % 2 ? "216,180,254" : "168,85,247"},0.9)`; ctx.lineWidth = 5 - i;
          ctx.beginPath(); ctx.ellipse(0, 0, 52 - i * 9, 90 - i * 14, 0, w.time * (5 + i) + i, w.time * (5 + i) + i + 4); ctx.stroke();
        }
        ctx.restore();
      },
      steps: [
        {
          id: "mark", name: { en: "Ground Marker", ko: "바닥 표시" }, param: "500ms lead",
          cap: { en: "Mark the spot *half a second* early. A ring *closes in*.", ko: "*0.5초* 먼저 자리를 찍어요. 고리가 *좁혀져요*." },
          mark(w, f) {
            w.spawn({ type: "ring", flat: true, x: f.x, y: G, size: 120, size1: 40, life: 0.5, w: 5, color: "216,180,254" });
            w.spawn({ type: "ellipse", under: true, x: f.x, y: G + 2, size: 80, life: 1.5, color: "147,51,234", alpha: 0.8, hold: true, add: false });
          },
        },
        {
          id: "portal", name: { en: "Portal", ko: "포털" }, param: "swirl 1.5s",
          cap: { en: "A *swirling portal* opens where it will step out.", ko: "나올 자리에 *소용돌이 포털*." },
          mark(w) { w.portal = { t: 1.5, max: 1.5 }; },
        },
        {
          id: "rise", name: { en: "Squash In", ko: "쭉 솟아오르기" }, param: "sy 0 → 1",
          cap: { en: "Don't pop in. *Stretch up* out of nothing.", ko: "뿅 말고, 바닥에서 *쭉* 솟아올라요." },
          spawn(w, f) { f.sy = 0; f.sx = 1.6; },
        },
        {
          id: "burst", name: { en: "Arrival Burst", ko: "도착 폭발" }, param: "flash + ring + sparks",
          cap: { en: "*Flash* and a *ring* the moment it arrives.", ko: "도착하는 순간 *번쩍*, *고리*." },
          spawn(w, f) {
            f.flash = 1.3;
            w.spawn({ type: "ring", x: f.x, y: G - 70, size: 10, size1: 120, life: 0.35, w: 9, color: "233,213,255" });
            sparks(w, f.x, G - 70, 16, "216,180,254", [200, 500]);
          },
        },
        {
          id: "dust", name: { en: "Dust + Shake", ko: "먼지 + 흔들림" }, param: "14 puffs · .3",
          cap: { en: "It *lands*. Dust kicks up, the screen *shakes*.", ko: "*쿵* 내려서요. 먼지가 일고 화면이 *흔들려요*." },
          spawn(w, f) { dust(w, f.x, G, 14); w.shake(0.3); },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising hum → pop",
          cap: { en: "A *rising hum*, then a *pop* on arrival.", ko: "*우웅* 올라가다가 *팡*." },
          mark(w) { w.sfx.charge(); },
          spawn(w) { w.sfx.burst(); },
        },
      ],
    },

    /* 20. 공격 예고 (위험 구역) */
    {
      id: "combat-telegraph", cat: "combat", view: "top",
      title: { en: "Telegraph attacks with a *danger zone*", ko: "공격 전에 *위험 구역* 보여주기" },
      intro: { en: "Hit by *nothing*, from *nowhere*.", ko: "*아무것도* 없었는데 맞았어요." },
      interval: 1.8, stepDur: 4.0,
      drawFloor(w, ctx) {
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(14, 14, 512, 332);
        ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 3; ctx.strokeRect(14, 14, 512, 332);
        const z = w.zone; if (!z || !z.show) return;
        const k = Math.min(1, z.t / z.dur), pu = z.pulse ? 0.5 + 0.5 * Math.sin(z.t * 30) : 0;
        ctx.fillStyle = `rgba(${z.col},0.16)`; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
        if (z.fill) { ctx.fillStyle = `rgba(${z.col},0.38)`; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = `rgba(${z.col},${0.6 + pu * 0.4})`; ctx.lineWidth = 3 + pu * 4; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
        if (z.pulse) label(ctx, "!", z.x, z.y - z.r - 22, 34, `rgba(${z.col},1)`);
      },
      setup(w) {
        w.hero = w.actor("heroTop", { home: 230, gy: 180 });
        w.boss = w.actor("foeTop", { home: 440, gy: 180, h: 120 });
        w.hero.rot = 0; w.boss.rot = Math.PI; w.zone = null;
      },
      fire(w) {
        if (w.busy) return;
        w.busy = true;
        const h = w.hero, b = w.boss, z = w.zone = { x: h.x, y: h.gy, r: 80, t: 0, dur: 0.7, col: "239,68,68" };
        w.emit("warn", z, b);
        w.after(z.dur, () => w.tween(b, { x: z.x + 70 }, 0.07, "in", () => {
          w.emit("strike", z, b);
          if (Math.hypot(h.x - z.x, h.gy - z.y) < z.r) { h.tint = 1; h.ox -= 20; popText(w, "-30", h.x, h.gy - 50, 26, "#f87171"); }
          w.zone = null;
          w.after(0.3, () => {
            w.tween(b, { x: b.home }, 0.3, "inout");
            w.tween(h, { gy: 180 }, 0.3, "inout", () => { w.busy = false; });
          });
        }));
      },
      update(w, dt) { if (w.zone) w.zone.t += dt; },
      steps: [
        {
          id: "zone", name: { en: "Danger Zone", ko: "위험 구역" }, param: "r 80 · 700ms lead",
          cap: { en: "Paint *where* it will hit, *before* it hits.", ko: "맞기 *전에*, *어디*를 칠지 바닥에 그려요." },
          warn(w, z) { z.show = true; },
        },
        {
          id: "fill", name: { en: "Fill = Timer", ko: "차오르는 = 타이머" }, param: "radius 0 → r",
          cap: { en: "Fill it from the center. *Full* means *now*.", ko: "가운데서 채워요. *꽉 차면* *그때* 와요." },
          warn(w, z) { z.fill = true; },
        },
        {
          id: "pulse", name: { en: "Pulse + Alert", ko: "깜빡임 + 느낌표" }, param: "edge 5Hz · !",
          cap: { en: "*Pulse* the edge and add a *!* so nobody misses it.", ko: "테두리가 *깜빡*, *!*까지. 못 볼 수가 없어요." },
          warn(w, z) { z.pulse = true; },
        },
        {
          id: "windup", name: { en: "Boss Wind-up", ko: "보스 준비 동작" }, param: "pull back + red",
          cap: { en: "The boss *pulls back* and glows *red*.", ko: "보스가 *뒤로 젖히고* *붉게* 달아올라요." },
          warn(w, z, b) { w.tween(b, { x: b.home + 30 }, z.dur * 0.9, "out"); b.tint = 1.8; },
        },
        {
          id: "dodge", name: { en: "Readable = Dodgeable", ko: "보이면 피해요" }, param: "dash out at −150ms",
          cap: { en: "Now the player *can dodge*. That's the whole point.", ko: "이제 *피할 수* 있어요. 이게 핵심이에요." },
          warn(w, z) {
            w.after(z.dur - 0.18, () => { w.tween(w.hero, { gy: 300 }, 0.14, "out"); dust(w, w.hero.x, w.hero.gy, 6); });
          },
        },
        {
          id: "impact", name: { en: "Impact", ko: "내려찍기" }, param: "flash zone · cracks",
          cap: { en: "The zone *flashes white*, the floor *cracks*.", ko: "구역이 *하얗게* 번쩍, 바닥이 *쩍*." },
          strike(w, z) {
            w.spawn({ type: "circle", x: z.x, y: z.y, size: z.r, life: 0.15, color: "255,255,255", add: true, under: true });
            w.spawn({ type: "ring", x: z.x, y: z.y, size: z.r, size1: z.r + 40, life: 0.3, w: 8, color: "254,202,202" });
            for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, pts = [[0, 0]]; for (let j = 1; j < 4; j++) pts.push([Math.cos(a) * j * 22 + rand(-8, 8), Math.sin(a) * j * 22 + rand(-8, 8)]); w.spawn({ type: "crack", under: true, x: z.x, y: z.y, pts, w: 3, life: 1.5, color: "0,0,0", hold: true, add: false }); }
            w.shake(0.5);
          },
        },
        {
          id: "sound", name: { en: "Sound", ko: "소리" }, param: "rising beep → slam",
          cap: { en: "Warning *beeps* that speed up, then a *slam*.", ko: "점점 빨라지는 *삐삐*, 그리고 *쾅*." },
          warn(w, z) { [0, 0.3, 0.5, 0.62].forEach(t => w.after(t, () => w.sfx.blip(8))); },
          strike(w) { w.sfx.slam(); },
        },
      ],
    },
  );
})();

/* FX LAB 539 · procedural art director v1
   All 18 categories. No assets, no individual draw loops, no UI dependencies.
   Runs only on the final effect layer; RAW and tutorial steps remain unchanged. */
(function () {
  "use strict";
  const MAP = {
    weapon:["#6fdafa","105,226,255","range","impact"],
    combat:["#ffba86","255,178,119","arena","impact"],
    duel:["#ffad9c","255,157,143","arena","impact"],
    fighting:["#ffaf79","255,173,116","arena","impact"],
    shooter:["#7fcaff","122,199,255","range","impact"],
    horde:["#ff9a85","255,149,120","siege","impact"],
    action:["#ffc085","255,185,111","arena","impact"],
    move:["#a1d4ff","150,202,255","platform","motion"],
    rpg:["#d7aeff","208,157,250","shrine","reward"],
    puzzle:["#76eadf","104,228,213","puzzle","puzzle"],
    casual:["#9bffcf","139,243,197","puzzle","reward"],
    ui:["#b0f3ca","151,229,193","interface","interface"],
    sim:["#e6c88c","226,184,120","interface","interface"],
    strategy:["#9be3c1","133,224,179","map","strategy"],
    army:["#9dddaf","137,205,146","map","strategy"],
    racing:["#83c5ff","110,188,248","track","motion"],
    survival:["#ffba90","243,170,124","survival","alert"],
    env:["#c8d9a5","184,202,150","landscape","motion"]
  };
  const cues = /^(fire|shot|shoot|hit|kill|blast|boom|impact|strike|swing|cut|slash|combo|punch|slam|cast|charge|launch|release|dash|jump|land|drop|arrive|step|roll|turn|finish|boost|win|gain|open|reveal|claim|merge|match|clear|done|unlock|press|pop|tap|select|save|show|check|upgrade|heal|warn|block|throw|break|spawn|go|move|ready|spin|flip|grab|pull|lock|catch|refill|beat|pass|score|complete|success)$/;
  const warmup = /^(charge|windup|ready|aim|grab|pull|focus|cast|prepare)$/;
  const offensive = /^(fire|shot|shoot|hit|kill|blast|boom|impact|strike|swing|cut|slash|combo|punch|slam|launch|release|throw|break)$/;
  const mobility = /^(dash|jump|land|roll|turn|finish|boost|go|move|fly|arrive|step|flip)$/;
  const reward = /^(done|unlock|gain|win|claim|clear|match|merge|open|reveal|score|pop|save|upgrade|complete|success)$/;
  const fits = (val) => Number.isFinite(val);
  const clamp = (v, a=0, b=1) => Math.max(a,Math.min(b,v));
  function idSeed(id) { let h=2166136261;for(let i=0;i<id.length;i++){h^=id.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0; }
  function visible(w){return !w.bare && w.n === w.R.steps.length && w.n > 0;}
  function profile(cat){return MAP[cat]||MAP.env;}
  // A restrained, per-category silhouette behind the foreground. This is a
  // flat scenic layer, NOT a new game simulation and does not redraw sprites.
  function stage(ctx,v,cat,id,t){
    const p=profile(cat), [x,y,width,height]=v, seed=idSeed(id), type=p[2];
    const mx=x+width*.52,ground=y+height*.84;
    ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();
    const line=p[1];ctx.lineWidth=1.4;
    if(type==="range"||type==="siege"||type==="arena"){
      const n=type==="siege"?7:5;
      for(let i=0;i<n;i++){
        const xx=x+width*(i+.35)/n,hh=height*(.22+(seed+i*53)%7*.038);
        ctx.fillStyle="rgba(4,10,18,.42)";ctx.fillRect(xx,ground-hh,width*.09,hh);
        ctx.strokeStyle="rgba("+line+",.13)";
        ctx.strokeRect(xx,ground-hh,width*.09,hh);
        if(i%2===0){
          ctx.fillStyle="rgba("+line+",.10)";ctx.fillRect(xx+width*.02,ground-hh*.72,width*.05,2);
        }
      }
      const beam=ctx.createLinearGradient(x,0,x+width,0);beam.addColorStop(0,"rgba("+line+",0)");beam.addColorStop(.5,"rgba("+line+",.12)");beam.addColorStop(1,"rgba("+line+",0)");
      ctx.fillStyle=beam;ctx.fillRect(x,ground-2,width,3);
    } else if(type==="shrine"){
      ctx.fillStyle="rgba(130,103,188,.12)";
      ctx.beginPath();ctx.moveTo(mx,ground-height*.72);ctx.lineTo(mx+width*.19,ground);ctx.lineTo(mx-width*.19,ground);ctx.closePath();ctx.fill();
      for(let i=-2;i<=2;i++){
        const xx=mx+i*width*.15;
        ctx.strokeStyle="rgba("+line+",.17)";ctx.beginPath();ctx.moveTo(xx,ground);ctx.lineTo(mx+i*width*.08,ground-height*.35);ctx.stroke();
      }
      ctx.strokeStyle="rgba("+line+",.20)";ctx.beginPath();ctx.ellipse(mx,ground,width*.31,height*.065,0,0,Math.PI*2);ctx.stroke();
    } else if(type==="map"||type==="puzzle"||type==="interface"){
      const n=type==="puzzle"?5:7,h=type==="interface"?height*.63:height*.55;
      for(let i=0;i<n;i++)for(let j=0;j<3;j++){
        if((i+j+seed)%4!==0)continue;
        const xx=x+width*(i+.65)/(n+1), yy=y+height*.20+j*h/3;
        ctx.fillStyle="rgba("+line+",.035)";
        ctx.fillRect(xx,yy,width/(n+1)*.72,h/3*.6);
        ctx.strokeStyle="rgba("+line+",.07)";
        ctx.strokeRect(xx,yy,width/(n+1)*.72,h/3*.6);
      }
      if(type==="map"){ctx.strokeStyle="rgba("+line+",.16)";
        ctx.beginPath();ctx.moveTo(x+width*.16,y+height*.66);ctx.lineTo(x+width*.32,y+height*.42);ctx.lineTo(x+width*.63,y+height*.56);ctx.lineTo(x+width*.79,y+height*.29);ctx.stroke();}
    } else if(type==="track"||type==="platform"){
      ctx.strokeStyle="rgba("+line+",.15)";
      for(let i=0;i<5;i++){const dy=i*height*.115;ctx.beginPath();ctx.moveTo(mx-width*.08*i,ground-dy);
        ctx.lineTo(mx+width*.08*i,ground-dy);ctx.stroke();}
      if(type==="track"){
        ctx.beginPath();ctx.moveTo(mx-width*.09,ground-height*.49);ctx.lineTo(x+width*.03,ground);ctx.moveTo(mx+width*.09,ground-height*.49);ctx.lineTo(x+width*.97,ground);ctx.stroke();}
    } else if(type==="survival"){
      for(let i=0;i<7;i++){
        const xx=x+width*(i+.3)/7,hy=height*(.11+((i+seed)%4)*.045);
        ctx.fillStyle="rgba(9,13,13,.45)";ctx.beginPath();ctx.moveTo(xx,ground);
        ctx.lineTo(xx+width*.06,ground-hy);ctx.lineTo(xx+width*.12,ground);ctx.fill();
      }
      ctx.fillStyle="rgba(248,112,79,.07)";ctx.fillRect(x,y+height*.12,width,2);
    } else {
      const n=6;for(let i=0;i<n;i++){
        const xx=x+width*i/(n-1);
        ctx.strokeStyle="rgba("+line+",.1)";ctx.beginPath();ctx.moveTo(xx,ground-height*.15);ctx.lineTo(xx-width*.07,ground);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function moment(w,ev,args){
    if(!visible(w)||!cues.test(ev))return;
    const cat=w.R.cat,p=profile(cat);
    const warm=warmup.test(ev),attack=offensive.test(ev),move=mobility.test(ev),win=reward.test(ev);
    // A named category set instead of one identical generic ring on all FX.
    // The recipe itself still owns its distinct effects and sound.
    const actor=w.actors.find(a=>a.key==="hero"&&!a.top);
    if(actor && (warm||attack||move)){
      w.studioRig={phase:warm?"director-ready":attack?"director-hit":"director-move",at:w.time};
    }
    if(w.directorAt!=null && w.time-w.directorAt<(warm?.35:attack?.21:.42))return;
    w.directorAt=w.time;
    const src=args.find(a=>a&&typeof a==="object"&&fits(a.x)&&fits(a.y));
    const other=w.actors.find(a=>a.key==="foe"&&!a.top);
    let x=src?src.x: attack&&other?other.x:actor?actor.x+52:270;
    let y=src?src.y: attack&&other?(other.gy-other.h*.62):actor?(actor.gy-actor.h*.55):185;
    x=clamp(x,28,515);y=clamp(y,25,335);
    const strength=warm?.55:attack?1:win?.90:move?.68:.5;
    const family=p[3],rgb=p[1],seed=idSeed(w.R.id);
    w.directorMoment={at:w.time,x,y,kind:family,ev,rgb,seed,strength};
    if(!warm){
      const count=family==="impact"?9:family==="reward"?7:family==="puzzle"?6:4;
      const budget=Math.min(count,Math.max(0,520-w.parts.length));
      for(let i=0;i<budget;i++){
        const a=(i+.5)*Math.PI*2/budget+Math.random()*.25,v=(110+Math.random()*230)*strength;
        w.spawn({type:family==="reward"&&i%3===0?"star":"spark",x,y,
          vx:Math.cos(a)*v,vy:Math.sin(a)*v,
          life:.16+Math.random()*.25,drag:4.8,size:1.25+Math.random()*1.7,color:rgb});
      }
    }
    if(attack&&actor && /^(weapon|combat|fighting|duel|shooter|action|horde)$/.test(cat)){
      actor.ox-=2.5; // miniature braced recoil; existing recipe physics is retained
    }
  }
  function overlay(ctx,w){
    if(!visible(w)||!w.directorMoment)return;
    const m=w.directorMoment,age=w.time-m.at;
    if(age<0||age>.6)return;
    let k=1-age/.6,scale=m.strength,seed=m.seed;
    ctx.save();ctx.globalCompositeOperation="lighter";ctx.lineCap="round";
    const x=m.x,y=m.y,color=m.rgb;
    const col=a=>"rgba("+color+","+a+")";
    if(m.kind==="impact"){
      // Angular wedge and split debris trails instead of a plain round blast.
      ctx.translate(x,y);ctx.rotate(((seed%11)-5)*.085);
      for(let i=0;i<3;i++){
        const dx=(i-1)*.43,h=15+70*scale*(1-k);
        ctx.beginPath();ctx.moveTo(-15,-10);ctx.quadraticCurveTo(45*scale,h*dx,90*scale*k,-18+dx*40);
        ctx.strokeStyle=col(.58*k);ctx.lineWidth=(11-i*3)*k;ctx.stroke();
      }
      ctx.beginPath();ctx.moveTo(-34*scale*k,-19);ctx.lineTo(85*scale*k,3);ctx.lineTo(-9,22*scale*k);
      ctx.strokeStyle=col(.31*k);ctx.lineWidth=2;ctx.stroke();
    } else if(m.kind==="motion"){
      const width=170*scale*k;
      for(let i=0;i<4;i++){
        const yy=y+(i-1.5)*11,dir=(seed%2===0?1:-1);
        ctx.strokeStyle=col((.26+i*.12)*k);ctx.lineWidth=(i%2?3:1.5)*k;
        ctx.beginPath();ctx.moveTo(x-dir*width,yy-5);ctx.quadraticCurveTo(x-dir*width*.4,yy-19,x+dir*width*.26,yy);ctx.stroke();
      }
    } else if(m.kind==="reward"||m.kind==="puzzle"){
      // Faceted prisms and satisfying success sparks.
      const count=m.kind==="puzzle"?5:7;
      for(let i=0;i<count;i++){
        const a=(i+.2)*Math.PI*2/count+(seed%29)*.03,r=(18+i*5+age*56)*scale;
        const xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r*.66;
        ctx.translate(xx,yy);ctx.rotate(a);
        ctx.strokeStyle=col(.55*k);ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(0,-9*k);ctx.lineTo(5*k,0);ctx.lineTo(0,12*k);ctx.lineTo(-4*k,0);ctx.closePath();ctx.stroke();
        ctx.rotate(-a);ctx.translate(-xx,-yy);
      }
    } else if(m.kind==="interface"||m.kind==="strategy"){
      const s=(19+age*78)*scale;
      ctx.strokeStyle=col(.55*k);ctx.lineWidth=2*k;
      for(const [dx,dy,sx,sy] of [[-1,-1,1,1],[1,-1,-1,1],[-1,1,1,-1],[1,1,-1,-1]]){
        const xx=x+dx*s,yy=y+dy*s;
        ctx.beginPath();ctx.moveTo(xx+sx*11,yy);ctx.lineTo(xx,yy);ctx.lineTo(xx,yy+sy*11);ctx.stroke();
      }
    } else {
      const n=6;for(let i=0;i<n;i++){
        const a=i*Math.PI*2/n,reach=(12+age*95)*scale;
        ctx.strokeStyle=col(.43*k);ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x+Math.cos(a)*reach*.3,y+Math.sin(a)*reach*.3);
        ctx.lineTo(x+Math.cos(a)*reach,y+Math.sin(a)*reach);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function pose(w,base){
    if(!w.studioRig||!w.studioRig.phase.startsWith("director-"))return null;
    const t=Math.max(0,w.time-w.studioRig.at),phase=w.studioRig.phase;
    const animate=phase==="director-ready"?clamp(t/.20):1-clamp(Math.max(0,t-.07)/.4);
    const target=phase==="director-ready"?
      {fe:[20,9],fh:[28,6],be:[12,11],bh:[20,9]}:
      phase==="director-hit"?
      {fe:[25,6],fh:[32,3],be:[17,10],bh:[25,8]}:
      {fe:[25,18],fh:[33,14],be:[9,12],bh:[15,7]};
    return Object.fromEntries(Object.keys(base).map(key=>[key,base[key].map((v,i)=>v+(target[key][i]-v)*animate)]));
  }
  window.FXDirector=Object.freeze({stage,moment,overlay,pose,categoryCount:Object.keys(MAP).length,version:"20261019.539"});
})();

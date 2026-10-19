/* FX Lab cinematic art director v2
   539 recipes, 18 genre families, individual seed variants.
   Generated entirely in Canvas2D. No external files, WebGL, or per-frame
   sprite recreation. Artwork builds once per recipe then uses a small LRU. */
(function(){
"use strict";
const GENRES={
 weapon:{tone:[89,208,240],scene:"forge",feel:"projectile"},
 shooter:{tone:[104,199,244],scene:"forge",feel:"projectile"},
 combat:{tone:[255,157,113],scene:"arena",feel:"impact"},
 duel:{tone:[243,123,108],scene:"arena",feel:"impact"},
 fighting:{tone:[255,160,110],scene:"arena",feel:"impact"},
 horde:{tone:[236,139,106],scene:"arena",feel:"impact"},
 action:{tone:[242,164,113],scene:"arena",feel:"impact"},
 move:{tone:[111,184,243],scene:"platform",feel:"motion"},
 rpg:{tone:[186,144,242],scene:"sanctum",feel:"arcane"},
 puzzle:{tone:[111,231,206],scene:"puzzle",feel:"puzzle"},
 casual:{tone:[145,239,186],scene:"puzzle",feel:"reward"},
 ui:{tone:[121,221,198],scene:"interface",feel:"interface"},
 sim:{tone:[234,194,114],scene:"interface",feel:"reward"},
 strategy:{tone:[140,210,165],scene:"tactical",feel:"strategy"},
 army:{tone:[146,205,155],scene:"tactical",feel:"strategy"},
 racing:{tone:[118,187,248],scene:"race",feel:"motion"},
 survival:{tone:[231,155,103],scene:"wasteland",feel:"alert"},
 env:{tone:[170,200,151],scene:"wasteland",feel:"motion"}
};
const SIGNIFICANT=new Set("hit land charge launch drop done fire shot break boom arrive show move cast grab pop turn throw swing spawn jump lock step gain go reveal unlock strike block catch windup pull press slam win beat clear fly finish dash wall impact flip add warn stop pass aim bolt crack spend star spin pick merge hop refill dodge heal snap fill place end hurt die kill beam blast shoot combo punch release start summon take claim tap select save check upgrade roll boost open focus attack explode success complete slash cut collide close strike damage defend jumpback castend".split(" "));
const CHARGE=new Set("windup charge ready aim grab pull focus cast prepare start lock target".split(" "));
const HIT=new Set("fire shot shoot hit kill blast boom impact strike swing cut slash combo punch slam launch release throw break damage beam bolt crack explode".split(" "));
const MOVE=new Set("dash jump land roll turn finish boost go move fly arrive step flip dodge sprint hop slide".split(" "));
const GOOD=new Set("done unlock gain win claim clear match merge open reveal score pop save upgrade complete success levelup reward pick fill snap".split(" "));
const C = (x,l=0,h=1)=>Math.max(l,Math.min(h,x));
const rgb=a=>a.join(",");
const rgba=(a,v)=>"rgba("+rgb(a)+","+v+")";
const hx=(seed)=> {let n=seed>>>0;return ()=>((n=(Math.imul(1664525,n)+1013904223)>>>0)/4294967296);};
function seedOf(s){let n=2166136261;for(let i=0;i<s.length;i++){n=Math.imul(n^s.charCodeAt(i),16777619);}return n>>>0;}
const blend=(a,b,t)=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));
const HEX={};
const bgCache=new Map(),CACHE_LIMIT=9;
function poly(g,pts,fill,stroke,width=1){
 g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
 for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);
 g.closePath();
 if(fill){g.fillStyle=fill;g.fill();}
 if(stroke){g.lineWidth=width;g.strokeStyle=stroke;g.stroke();}
}
function line(g,points,color,width=1){
 g.strokeStyle=color;g.lineWidth=width;g.lineCap="round";g.lineJoin="round";
 g.beginPath();g.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.stroke();
}
function haze(g,x,y,r,colour,alpha){
 const grad=g.createRadialGradient(x,y,0,x,y,r);
 grad.addColorStop(0,rgba(colour,alpha));
 grad.addColorStop(.35,rgba(colour,alpha*.34));
 grad.addColorStop(1,rgba(colour,0));
 g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
}
function facet(g,x,y,w,h,base,lit,dark){
 poly(g,[[x,y],[x+w*.83,y-h*.16],[x+w,y+h*.77],[x+w*.16,y+h]],base);
 poly(g,[[x,y],[x+w*.83,y-h*.16],[x+w*.75,y+h*.41],[x+w*.12,y+h*.55]],lit);
 poly(g,[[x+w*.75,y+h*.41],[x+w,y+h*.77],[x+w*.16,y+h],[x+w*.12,y+h*.55]],dark);
}
function drawScenery(g,rec,W,H){
 const name=rec.id||"fx",cat=rec.cat||"env",def=GENRES[cat]||GENRES.env;
 const rand=hx(seedOf(name)),tone=def.tone,scene=def.scene,variant=seedOf(name)%5;
 let base=g.createLinearGradient(0,0,0,H);
 const top=blend([6,12,20],tone,.07),mid=blend([10,17,25],tone,.13);
 base.addColorStop(0,"rgb("+rgb(top)+")");base.addColorStop(.57,"rgb("+rgb(mid)+")");base.addColorStop(1,"#080d16");
 g.fillStyle=base;g.fillRect(0,0,W,H);
 haze(g,W*(.32+.26*rand()),H*.39,Math.min(W,H)*.79,tone,.15);
 const horizon=H*.71;
 // A deep silhouette layer: asymmetric faceted spaces rather than rectangular boxes.
 if(scene==="forge"||scene==="arena"){
   for(let i=0;i<7;i++){
     const x=i*W/6-W*.1+(rand()-.5)*W*.045;
     const depth=H*(.25+rand()*.34),rw=W*(.09+rand()*.085);
     poly(g,[[x,horizon],[x+rw*.13,horizon-depth],[x+rw*.72,horizon-depth*1.15],[x+rw,horizon]],"rgba(3,9,17,.49)");
     if(i%2===variant%2){
       poly(g,[[x+rw*.18,horizon-depth*.93],[x+rw*.73,horizon-depth*1.07],[x+rw*.69,horizon-depth*.94],[x+rw*.19,horizon-depth*.81]],rgba(tone,.055));
     }
   }
   // Decorative backwall carvings with perspective and a purposeful fight floor.
   for(let i=0;i<4;i++){
     let xx=W*(.09+i*.26),yy=horizon-H*.23;
     poly(g,[[xx,yy],[xx+W*.025,yy-H*.055],[xx+W*.12,yy-H*.042],[xx+W*.14,yy]],rgba(tone,.085));
   }
   poly(g,[[0,horizon],[W,horizon],[W,H],[0,H]],"#0d151d");
   poly(g,[[0,horizon],[W,horizon],[W,H*.77],[0,H*.77]],"rgba(255,255,255,.025)");
   line(g,[[0,horizon],[W,horizon]],rgba(tone,.26),2.5);
   for(let i=0;i<4;i++){
     let z=i/4+.12,yy=horizon+(H-horizon)*z*z;
     line(g,[[0,yy],[W,yy]],rgba(tone,(1-z)*.08),1.2);
   }
   if(scene==="forge"){
     const arch=W*(.2+.1*variant);
     poly(g,[[arch,horizon],[arch+W*.04,horizon-H*.46],[arch+W*.065,horizon-H*.46],[arch+W*.12,horizon]],"rgba(30,68,83,.23)");
     haze(g,arch+W*.12,horizon-H*.38,H*.18,tone,.12);
   }
 } else if(scene==="sanctum"){
   const px=W*.55,py=H*.47;
   haze(g,px,py,H*.43,tone,.17);
   for(let i=0;i<5;i++){
     const xx=W*(.08+i*.22),h=H*(.36+.14*rand());
     poly(g,[[xx,horizon],[xx+W*.018,horizon-h],[xx+W*.065,horizon-h*.98],[xx+W*.097,horizon]],"rgba(10,13,28,.62)");
     poly(g,[[xx+W*.02,horizon-h],[xx+W*.06,horizon-h],[xx+W*.054,horizon-h*.82],[xx+W*.025,horizon-h*.82]],rgba(tone,.09));
   }
   poly(g,[[W*.25,horizon],[W*.77,horizon],[W*.89,H],[W*.1,H]],"#131428");
   poly(g,[[W*.31,horizon],[W*.70,horizon],[W*.76,horizon+H*.09],[W*.24,horizon+H*.09]],"rgba(162,119,215,.16)");
   for(let i=0;i<9;i++){
     const x=W*(.13+rand()*.74),y=H*(.13+rand()*.58);
     poly(g,[[x,y-4],[x+2.2,y],[x,y+4],[x-2.2,y]],rgba(tone,.11+rand()*.16));
   }
 } else if(scene==="puzzle"||scene==="interface"){
   const frame=W*.1,pad=scene==="puzzle"?W*.075:W*.12;
   g.fillStyle="rgba(6,17,23,.4)";
   g.fillRect(frame,H*.15,W-frame*2,H*.69);
   const cols=scene==="puzzle"?8:5,rows=scene==="puzzle"?4:3;
   const gap=W*.007,ww=(W-2*pad)/cols,hh=H*.49/rows;
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
     if(scene==="interface"&&((x*7+y*5+variant)%3===0))continue;
     const X=pad+x*ww,Y=H*.29+y*hh;
     let shade=(x+y+variant)%6,alpha=scene==="puzzle"?.048:.032;
     facet(g,X+gap,Y+gap,ww-gap*2,hh-gap*2,rgba(tone,alpha+shade*.003),rgba(tone,alpha*.75),rgba([6,17,25],.21));
   }
   for(let i=0;i<4;i++){
     let xx=W*(.15+i*.19);
     poly(g,[[xx,H*.21],[xx+W*.09,H*.21],[xx+W*.075,H*.226],[xx+W*.006,H*.226]],rgba(tone,.1));
   }
 } else if(scene==="tactical"){
   // Stylized tabletop/map, subdued so the real recipe retains priority.
   poly(g,[[W*.08,H*.28],[W*.87,H*.19],[W*.96,H*.79],[W*.13,H*.89]],"#14251f");
   poly(g,[[W*.08,H*.28],[W*.87,H*.19],[W*.84,H*.26],[W*.14,H*.37]],rgba(tone,.15));
   for(let j=0;j<6;j++){
     const yy=H*(.3+j*.094),off=j*W*.012;
     line(g,[[W*.1+off,yy],[W*.88+off,yy-H*.025]],rgba(tone,.06),1.1);
   }
   poly(g,[[W*.38,H*.53],[W*.52,H*.42],[W*.59,H*.52],[W*.47,H*.65]],rgba(tone,.12));
   poly(g,[[W*.15,H*.74],[W*.23,H*.66],[W*.32,H*.68],[W*.25,H*.79]],"rgba(4,16,14,.64)");
 } else if(scene==="race"||scene==="platform"){
   const road=scene==="race";
   const vp=[W*(.47+rand()*.08),H*.47];
   haze(g,vp[0],vp[1],H*.32,tone,.11);
   poly(g,[[vp[0]-W*.10,vp[1]],[vp[0]+W*.10,vp[1]],[W*1.08,H],[W*-.1,H]],"#121d2b");
   poly(g,[[vp[0]-W*.12,vp[1]],[vp[0]-W*.1,vp[1]],[W*.04,H],[W*.015,H]],rgba(tone,.29));
   poly(g,[[vp[0]+W*.1,vp[1]],[vp[0]+W*.12,vp[1]],[W*.985,H],[W*.965,H]],rgba(tone,.26));
   if(road){
     for(let i=0;i<6;i++){const z=(i+1)/7;
       const yy=vp[1]+(H-vp[1])*z*z;
       const wid=2+z*7;
       poly(g,[[vp[0]-wid,yy],[vp[0]+wid,yy],[vp[0]+wid*1.4,yy+H*.022*z],[vp[0]-wid*1.4,yy+H*.022*z]],"rgba(232,237,241,.22)");
     }
   }
   for(let i=0;i<5;i++) {
     let xx=W*(i+.4)/5,hh=H*(.17+rand()*.17);
     poly(g,[[xx,vp[1]],[xx+W*.07,vp[1]-hh],[xx+W*.12,vp[1]]],"rgba(5,17,30,.39)");
   }
 } else {
   // Hand-cut landscape silhouettes and fog layers.
   for(let z=0;z<3;z++){
     let pts=[[0,H*.76]],ww=W/8;
     for(let i=0;i<=8;i++)pts.push([ww*i,H*(.40+z*.13+rand()*.22)]);
     pts.push([W,H],[0,H]);
     poly(g,pts,z===0?"rgba(11,29,35,.55)":z===1?"rgba(11,23,29,.69)":"rgba(9,17,21,.85)");
   }
   haze(g,W*.65,H*.39,H*.43,tone,.11);
   for(let i=0;i<7;i++){
     let x=(i+.25)*W/7,y=H*(.58+rand()*.25);
     poly(g,[[x-4,y+22],[x,y-22],[x+4,y+22]],rgba(tone,.075));
   }
 }
 // Carefully mixed filmic vignette, rim tint, illuminated upper right corner.
 let vg=g.createRadialGradient(W*.51,H*.50,H*.12,W*.51,H*.50,W*.73);
 vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(.59,"rgba(0,0,0,.02)");vg.addColorStop(1,"rgba(0,0,0,.64)");
 g.fillStyle=vg;g.fillRect(0,0,W,H);
 let light=g.createLinearGradient(W*.77,0,W*.16,H);
 light.addColorStop(0,rgba(tone,.09));light.addColorStop(.44,"rgba(0,0,0,0)");light.addColorStop(1,"rgba(0,0,0,0)");
 g.fillStyle=light;g.fillRect(0,0,W,H);
}
function cacheArt(rec){
 const key=rec.id;
 let canvas=bgCache.get(key);
 if(canvas){bgCache.delete(key);bgCache.set(key,canvas);return canvas;}
 canvas=document.createElement("canvas");canvas.width=720;canvas.height=405;
 drawScenery(canvas.getContext("2d"),rec,720,405);
 bgCache.set(key,canvas);
 if(bgCache.size>CACHE_LIMIT)bgCache.delete(bgCache.keys().next().value);
 return canvas;
}
function stage(ctx,box,cat,id){
 // The compositor's World.draw knows the recipe; a pair of fields is enough
 // for the cached background to react to category and individual recipe.
 const rec={id,cat};const art=cacheArt(rec);
 ctx.drawImage(art,box[0],box[1],box[2],box[3]);
}
function semantic(rec){
 const id=rec.id.toLowerCase(),cat=rec.cat;
 if(/slash|katana|sword|blade|whip|dagger|parry|riposte|axe|lance|melee|punch|kick|quickdraw|cut|throw/.test(id))return "slash";
 if(/laser|beam|rail|plasma|shot|bullet|sniper|rifle|gun|rocket|tracer|crossbow|missile|bolt|cannon/.test(id))return "beam";
 if(/spell|mana|cast|ench|potion|portal|summon|arcane|fire|frost|ice|lightning|storm|magic|aura|heal|buff/.test(id))return "magic";
 if(/dash|jump|run|sprint|slide|glide|drift|nitro|boost|land|recoil|grapple|roll/.test(id))return "motion";
 if(/puzzle|stack|merge|tile|word|line-clear|snap|bubble|match|level-star|chain-combo|gacha/.test(id))return "tiles";
 if(/loot|reward|levelup|coin|income|score|quest|win|treasure|gold|jackpot|achieve|drop|stars|milestone/.test(id))return "reward";
 if(/ui-|menu|button|toggle|slider|tooltip|modal|toast|loading|notification|notify|success|error|badge/.test(id))return "ui";
 if(/army|strategy|formation|order|select|target|map|ping|range|fog/.test(id))return "map";
 if(/survival|night|dark|jumpscare|warn|danger|death|heartbeat|storm/.test(id))return "survive";
 return (GENRES[cat]||GENRES.env).feel;
}
const GENERIC_EVENTS=new Set("tick update frame draw particle bounce drift trail shake pulse loop idle repeat music sound".split(" "));
function moment(w,event,args){
 if(w.bare||w.n<=0||w.n!==w.R.steps.length)return;
 if(GENERIC_EVENTS.has(event))return;
 if(!SIGNIFICANT.has(event) && !/^(hit|kill|shoot|fire|win|lose|cast|attack|land|step|tap|score)/.test(event))return;
 const t=w.time;
 const isCharge=CHARGE.has(event),isHit=HIT.has(event),isMove=MOVE.has(event),isGood=GOOD.has(event);
 const genre=GENRES[w.R.cat]||GENRES.env;
 // Never add generic explosions to clean UI, menu, or slow environmental FX.
 const family=semantic(w.R);
 const cd=(family==="ui"||family==="tiles"||family==="map")?.18:.26;
 if(w.fxDirectorStamp!==undefined && t-w.fxDirectorStamp<cd)return;
 w.fxDirectorStamp=t;
 const actor=w.actors.find(a=>a.key==="hero"&&!a.top);
 const foe=w.actors.find(a=>a.key==="foe"&&!a.top);
 const arg=(args||[]).find(a=>a&&typeof a==="object"&&Number.isFinite(a.x)&&Number.isFinite(a.y));
 const focal=arg||(isHit&&foe?foe:actor);
 const x=C(focal?focal.x:270,25,520);
 const y=C(focal?(Number.isFinite(focal.y)&&arg?focal.y:(focal.gy||344)-(focal.h||76)*.58):180,24,330);
 const strength=isCharge?.43:isHit?1:isGood?.91:isMove?.70:.60;
 if(actor&&(isCharge||isHit||isMove)){
  // Preserve bespoke poses of the three spotlight examples.
  if(!["weapon-railgun","weapon-katana","magic"].includes(w.R.id)){
   w.studioRig={phase:isCharge?"director-ready":isHit?"director-hit":"director-move",at:t};
  }
 }
 const tone=genre.tone,id=w.R.id,seed=seedOf(id);
 w.directorMoment={time:t,x,y,tone,seed,family,event,strength};
 const count=(family==="ui"||family==="map")?2:(family==="tiles"||family==="reward")?6:8;
 const left=Math.max(0,320-w.parts.length),n=Math.min(count,left);
 if(!isCharge&&n>0){
  const rand=hx(seed^((t*1000)|0));
  for(let i=0;i<n;i++){
   const a=(i+rand()*.38)*Math.PI*2/n,vel=(90+rand()*230)*strength;
   w.spawn({type:(family==="reward"&&i%3===0)?"star":"spark",
    x,y,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel,
    drag:5,life:.15+rand()*.21,size:1+rand()*1.6,color:rgb(tone)});
  }
 }
}
function fan(g,x,y,tone,a,seed,length=116) {
 // A layered, curved blade with tapered tip. The sharp inner edge catches light;
 // a single action reads clearly without generic concentric rings.
 const rot=((seed%21)-10)*.045;
 g.save();g.translate(x,y);g.rotate(rot);
 for(let pass=0;pass<3;pass++){
  const s=length*(pass===0?1.25:pass===1?1:.81);
  g.beginPath();
  g.moveTo(-s*.45,s*.28);
  g.bezierCurveTo(-s*.14,-s*.75,s*.43,-s*.69,s*.9,-s*.24);
  g.bezierCurveTo(s*.58,-s*.31,s*.11,-s*.31,-s*.45,s*.28);
  g.closePath();
  g.fillStyle=pass===0?rgba(tone,.11*a):pass===1?rgba(tone,.44*a):"rgba(246,255,249,"+(.73*a)+")";
  g.fill();
 }
 g.restore();
}
function bolt(g,x,y,tone,a,s=140){
 g.save();g.translate(x,y);
 const v=s;
 const points=[[-v*.66,-8],[-v*.13,-15],[v*.37,-11],[v*.7,0],[v*.31,5],[-v*.17,8]];
 poly(g,points,rgba(tone,.16*a));
 poly(g,[[-v*.49,-3],[-v*.06,-6],[v*.37,-4],[v*.62,0],[v*.32,2],[-v*.1,3]],rgba(tone,.64*a));
 poly(g,[[-v*.2,-1],[v*.4,-1],[v*.52,0],[v*.24,1]],"rgba(250,254,255,"+(.84*a)+")");
 g.restore();
}
function glyph(g,x,y,r,tone,a,seed){
 // Faceted arcane seal: asymmetrical engraved runes, not an empty circle.
 g.save();g.translate(x,y);g.rotate(seed%13*.20);
 for(let i=0;i<8;i++){
  const rad=i*Math.PI/4;g.save();g.rotate(rad);
  poly(g,[[r*.76,-4],[r*.89,0],[r*.74,4],[r*.69,0]],rgba(tone,a*.6));
  if(i%2===0){
   line(g,[[r*.54,-5],[r*.65,0],[r*.54,5]],rgba(tone,a*.5),1.3);
  }
  g.restore();
 }
 const dots=6;for(let i=0;i<dots;i++){
  const theta=i*Math.PI*2/dots+(seed%7)*.1;
  poly(g,[[Math.cos(theta)*r*.45,Math.sin(theta)*r*.45-4],
    [Math.cos(theta)*r*.45+4,Math.sin(theta)*r*.45],
    [Math.cos(theta)*r*.45,Math.sin(theta)*r*.45+4],
    [Math.cos(theta)*r*.45-4,Math.sin(theta)*r*.45]],
    rgba(tone,.18*a));
 }
 g.restore();
}
function shatter(g,x,y,tone,alpha,seed,t,mode){
 const rand=hx(seed);
 const n=mode==="tiles"?8:11;
 for(let i=0;i<n;i++){
  const angle=i*Math.PI*2/n+(rand()-.5)*.55;
  const r=(11+rand()*32+t*(45+rand()*85));
  const px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.78;
  const d=(4+rand()*9)*(1-t*.72);
  const col=blend(tone,[245,249,246],rand()*.48);
  poly(g,[[px,py-d],[px+d*.72,py],[px,py+d*.90],[px-d*.67,py]],
   rgba(col,.44*alpha),rgba([237,249,241],.20*alpha),.7);
  if(i%4===0){line(g,[[px-d*.17,py-d*.4],[px+d*.24,py+d*.11]],rgba([255,255,255],.32*alpha),1);}
 }
}
function trail(g,x,y,tone,alpha,seed,t){
 g.save();g.translate(x,y);g.rotate(((seed%7)-3)*.12);
 for(let i=0;i<4;i++){
  const yy=(i-1.5)*12,far=(175+i*22)*(1-t*.52);
  g.beginPath();g.moveTo(-far,yy);
  g.bezierCurveTo(-far*.57,yy-14,-far*.16,yy-6,29,yy);
  g.strokeStyle=rgba(tone,(.10+.13*i)*alpha);g.lineWidth=i%2===0?2.8:1.4;g.stroke();
 }
 g.restore();
}
function UIAccent(g,m,alpha,t) {
 const {x,y,tone}=m,ss=20+52*t;
 // Tight corners signify focus rather than a giant magical ring.
 g.lineWidth=2*alpha;g.strokeStyle=rgba(tone,.63*alpha);
 for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
  const X=x+u*ss,Y=y+v*ss;
  line(g,[[X-u*11,Y],[X,Y],[X,Y-v*11]],rgba(tone,.65*alpha),1.9*alpha);
 }
}
function overlay(g,w){
 if(w.bare||w.n!==w.R.steps.length||!w.directorMoment)return;
 const m=w.directorMoment,t=w.time-m.time;
 if(t<0||t>.72)return;
 const a=Math.pow(1-C(t/.72),1.3)*m.strength;
 if(a<.015)return;
 const tone=m.tone,x=m.x,y=m.y,fam=m.family;
 g.save();g.globalCompositeOperation="lighter";g.lineJoin="round";
 if(fam==="slash"||fam==="impact"){
  haze(g,x+8,y,82+40*t,tone,.23*a);
  fan(g,x,y,tone,a,m.seed,fam==="slash"?132:99);
  shatter(g,x,y,tone,a,m.seed,t,"impact");
 }else if(fam==="beam"||fam==="projectile"){
  haze(g,x,y,68+15*t,tone,.26*a);
  bolt(g,x,y,tone,a,153);
  shatter(g,x+23,y,tone,a*.72,m.seed,t,"impact");
 }else if(fam==="magic"||fam==="arcane"){
  haze(g,x,y,98+54*t,tone,.35*a);
  glyph(g,x,y,44+49*t,tone,a,m.seed);
  shatter(g,x,y,tone,a*.55,m.seed,t,"magic");
 }else if(fam==="motion"){
  trail(g,x,y,tone,a,m.seed,t);
  shatter(g,x-18,y+13,tone,a*.38,m.seed,t,"motion");
 }else if(fam==="puzzle"||fam==="tiles"){
  shatter(g,x,y,tone,a,m.seed,t,"tiles");
  UIAccent(g,m,a*.58,t*.7);
 }else if(fam==="reward"){
  haze(g,x,y,66+38*t,tone,.19*a);
  shatter(g,x,y,tone,a,m.seed,t,"reward");
 }else if(fam==="interface"||fam==="ui"||fam==="strategy"||fam==="map"){
  UIAccent(g,m,a,t);
 }else if(fam==="alert"||fam==="survive"){
  const rand=hx(m.seed);
  g.globalCompositeOperation="source-over";
  for(let i=0;i<4;i++){
   const xx=x+(i-1.5)*21,yy=y-(i%2)*9+t*33;
   poly(g,[[xx-4,yy],[xx,yy-18],[xx+5,yy]],rgba(tone,.23*a));
  }
  if(rand()>.75)haze(g,x,y,100,tone,.08*a);
 }else{
  trail(g,x,y,tone,a,m.seed,t);
 }
 g.restore();
}
function pose(w,base){
 const anim=w.studioRig;
 if(!anim||!anim.phase.startsWith("director-"))return null;
 const elapsed=Math.max(0,w.time-anim.at),phase=anim.phase;
 const strength=phase==="director-ready"?C(elapsed/.20):Math.pow(1-C(Math.max(0,elapsed-.09)/.42),2);
 const target=phase==="director-ready"?
  {fe:[20,9],fh:[28,6],be:[12,11],bh:[20,9]}:
  phase==="director-hit"?
  {fe:[25,6],fh:[33,3],be:[17,10],bh:[25,8]}:
  {fe:[25,18],fh:[33,14],be:[9,12],bh:[15,7]};
 return Object.fromEntries(Object.keys(base).map(key=>[key,base[key].map((v,i)=>v+(target[key][i]-v)*strength)]));
}
window.FXDirector=Object.freeze({
 stage,moment,overlay,pose,
 categoryCount:Object.keys(GENRES).length,
 artworkCacheLimit:CACHE_LIMIT,
 version:"20261019.cinematic.v2"
});
})();

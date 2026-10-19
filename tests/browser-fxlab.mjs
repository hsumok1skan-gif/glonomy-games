import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const origin="http://127.0.0.1:8765";
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
const errors=[];
fs.mkdirSync("browser-artifacts",{recursive:true});
async function check(viewport,mobile,label) {
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  const page=await context.newPage();
  page.on("pageerror",error=>errors.push(label+": "+error.message));
  await page.goto(origin+"/fx-tips/index.html",{waitUntil:"domcontentloaded",timeout:45000});
  await page.waitForFunction(()=>window.__fx?.RECIPES?.length===539,{timeout:35000});
  await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(()=>window.__fx.RECIPES.length),539);
  if(label==="desktop"){
    assert.equal(await page.locator("#pcCanvas").isVisible(),true);
    assert.equal(await page.locator("#pcShowcase").isVisible(),true);
    const sz=await page.locator("#pcCanvas").evaluate(x=>({width:x.width,height:x.height}));
    assert.ok(sz.width>600&&sz.height>300,JSON.stringify(sz));
    for(const [id,delay] of [["weapon-railgun",765],["weapon-katana",170],["magic",570]]) {
      await page.locator('[data-hero-fx="'+id+'"]').click();
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(()=>window.__fx.RECIPES[window.__fx.app.ri].id),id);
      await page.evaluate(()=>{window.__fx.app.auto=false;window.__fx.fireAll();});
      await page.waitForTimeout(delay);
      const rig=await page.evaluate(()=>{
        const w=window.__fx.app.worlds[0], c=document.querySelector("#pcCanvas");
        return {id:w.R.id,phase:w.studioRig?.phase,logical:c.fxLogicalWidth,
          bloomWidth:typeof BLOOM!=="undefined" ? BLOOM.c?.width : null,
          expectedBloomWidth:Math.round(c.width/4)};
      });
      assert.equal(rig.id,id);
      assert.equal(rig.logical,960,"PC bloom must render at 960 logical width");
      assert.ok(rig.phase,"Character arm rig should respond to the selected FX action: "+id);
      assert.ok(Math.abs(rig.bloomWidth-rig.expectedBloomWidth)<3,
        "No duplicate small upper-left bloom: "+JSON.stringify(rig));
      await page.locator("#pcTheater").screenshot({path:"browser-artifacts/showcase-"+id+".png"});
    }
    // Validate one full effect from each distinct genre with live canvas drawing.
    // Check the whole library is populated before selecting representatives.
    const covered = await page.evaluate(() => {
      const fx=window.__fx, genres=[...new Set(fx.RECIPES.map(r=>r.cat))], results=[];
      const canvas=document.querySelector("#pcCanvas");
      for(const cat of genres){
        const i=fx.RECIPES.findIndex(r=>r.cat===cat);
        fx.selectRecipe(i);fx.setN(fx.RECIPES[i].steps.length);
        try {
          fx.fireAll();
          const w=fx.app.worlds[0];
          w.update(.016);
          const original=w.view;
          w.view={x:80,y:0,s:1.2,r:[0,0,960,540]};
          const ctx=canvas.getContext("2d");ctx.setTransform(1,0,0,1,0,0);
          w.draw(ctx);
          w.view=original;
          results.push({cat,ok:true,n:w.n});
        } catch(e){results.push({cat,ok:false,error:String(e)});}
      }
      return {n:fx.RECIPES.length, director:window.FXDirector?.categoryCount, results};
    });
    assert.equal(covered.n,539,"539 FX retained");
    assert.equal(covered.director,18,"18 visual genres active");
    assert.equal(covered.results.length,18,"Each visual genre tested");
    assert.ok(covered.results.every(x=>x.ok),"Genre preview errors: "+JSON.stringify(covered.results.filter(x=>!x.ok)));
    // Every recipe must set up, fire, and advance without throwing, including
    // rare gameplay/UI events. We draw a representative from each category above.
    const full=await page.evaluate(()=>{
      const fx=window.__fx, fail=[];
      for(let i=0;i<fx.RECIPES.length;i++){
        const R=fx.RECIPES[i];
        try{
          const w=new World(R,R.steps.length,{x:0,y:0,s:1,r:[0,0,540,360]},true,false);
          R.fire(w);
          w.update(.016);
          if (w.parts.length>700) throw new Error("exceeded particle cap");
        }catch(e){fail.push({i,id:R.id,error:String(e)});}
      }
      return {count:fx.RECIPES.length,fail:fail.slice(0,30),failCount:fail.length};
    });
    assert.equal(full.count,539);
    assert.equal(full.failCount,0,"539 FX activation errors: "+JSON.stringify(full.fail));
    // Commercial game-feel regressions for three independently authored FX:
    // damage follows arrival, contacts linger, and kill feedback has a payoff.
    const combatUpgrade=await page.evaluate(()=>{
      const v={};const get=id=>window.__fx.RECIPES.find(r=>r.id===id);
      const sim=(id,n,times,shots=1)=>{
        const R=get(id),w=new World(R,n,{x:0,y:0,s:1,r:[0,0,540,360]},true,false);
        R.fire(w);
        const out=[];let time=0,scheduled=1;
        for(const until of times){
          while(time<until-.00001){
            w.update(Math.min(.016,until-time));time=Math.min(until,time+.016);
            if(id==="shooter-killconfirm"&&scheduled<shots&&time>=scheduled*.45){
              R.fire(w);scheduled++;
            }
          }
          out.push({time,hp:w.foe?.hp??w.gobs?.[0]?.hp,ignited:w.fl?.ignited??0,
            scorch:w.lz?.scorch??0,impact:w.impactGlow??0,
            hpView:w.fl?.hpView??w.lz?.hpView??w.hpView??0,
            hpLag:w.fl?.hpLag??w.lz?.hpLag??w.hpLag??0,
            kills:w.skulls||0,alive:w.gobs?.[0]?.alive});
        }
        return out;
      };
      for(const id of ["weapon-flamethrower","weapon-laser","shooter-killconfirm"]){
        const R=get(id);v[id]={steps:R?.steps?.length};
      }
      v.flameRaw=sim("weapon-flamethrower",0,[.10,.39,.7]);
      v.flameFull=sim("weapon-flamethrower",v["weapon-flamethrower"].steps,[.10,.39,.7]);
      v.laser=sim("weapon-laser",v["weapon-laser"].steps,[.03,.25,.49]);
      v.shooter=sim("shooter-killconfirm",v["shooter-killconfirm"].steps,[.1,.55,1.0,1.32],3);
      return v;
    });
    assert.equal(combatUpgrade.flameRaw[0].hp,240,"Flame should not damage before stream arrives");
    assert.equal(combatUpgrade.flameFull[0].hp,240,"Upgraded stream cannot cause phantom early damage");
    assert.ok(combatUpgrade.flameRaw[1].hp<240,"Plain stream must actually land");
    assert.equal(combatUpgrade.flameRaw[1].ignited,0,"RAW should not carry burning status");
    assert.ok(combatUpgrade.flameFull[1].ignited>0,"Full stream visibly ignites target on arrival");
    assert.ok(combatUpgrade.flameFull[2].hp<combatUpgrade.flameRaw[2].hp,"Burn must add real delayed DOT");
    assert.ok(combatUpgrade.laser[1].hp<260,"Laser must deal actual damage on contact");
    assert.ok(combatUpgrade.laser[1].scorch>0,"Laser must visibly scorch contact surface");
    assert.ok(combatUpgrade.shooter.at(-1).hp<=0,"Three hit sequence kills target");
    assert.ok(combatUpgrade.shooter.at(-1).kills>=1,"Final kill renders an actual kill marker");
    await page.evaluate(()=>{
      const cv=document.createElement("canvas");cv.id="genre-qa";cv.width=960;cv.height=540;
      cv.fxLogicalWidth=960;
      Object.assign(cv.style,{position:"fixed",left:"0",top:"0",width:"960px",height:"540px",zIndex:"99999"});
      document.body.appendChild(cv);
    });
    for(const [id,at] of [["weapon-flamethrower",.42],["weapon-laser",.31],["shooter-killconfirm",1.32]]){
      await page.evaluate(({id,at})=>{
        const R=window.__fx.RECIPES.find(r=>r.id===id),w=new World(R,R.steps.length,{x:80,y:0,s:1.2,r:[0,0,960,540]},true,false);
        R.fire(w);
        let t=0,fired=1;
        while(t<at){
          const dt=Math.min(.016,at-t);w.update(dt);t+=dt;
          if(id==="shooter-killconfirm"&&fired<3&&t>=fired*.45){R.fire(w);fired++;}
        }
        const cv=document.querySelector("#genre-qa"),ctx=cv.getContext("2d");
        ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,960,540);w.draw(ctx);
      },{id,at});
      await page.locator("#genre-qa").screenshot({path:"browser-artifacts/game-feel-"+id+".png"});
    }
    await page.locator("#genre-qa").evaluate(x=>x.remove());
    // Compare one authentic base attack against two genuinely transformative
    // passes: attached flames+DOT and the full cinematic HP-bar experience.
    const burnQa=await page.evaluate(()=>{
      const R=window.__fx.RECIPES.find(x=>x.id==="combat-fire"),rows=[];
      if(!R)return {error:"missing combat-fire"};
      for(let n=0;n<=R.steps.length;n++){
        const w=new World(R,n,{x:82,y:-4,s:1.57,r:[0,0,960,540]},true,false);
        R.fire(w);w.update(.10);
        const early={hp:w.foe.hp,shots:w.shots.length};
        for(let i=0;i<92;i++)w.update(.016);
        rows.push({n,early,hp:w.foe.hp,burn:w.burnT,
          charred:w.on("flame"),cinema:w.on("cinema"),
          shown:w.barShown,lag:w.barLag});
      }
      return {rows,steps:R.steps.length};
    });
    assert.equal(burnQa.steps,2,"Only two impactful upgrade stages, not five micro-steps");
    assert.equal(burnQa.rows.length,3,"Base attack + fire upgrade + final");
    for(const row of burnQa.rows){
      assert.equal(row.early.hp,200,"Hit damage may only occur after contact");
      assert.ok(row.hp<200,"Base attack must land and damage HP");
    }
    assert.equal(burnQa.rows[0].burn,0,"Base is a normal attack with no unexplained burning");
    assert.ok(burnQa.rows[1].burn>0,"Upgrade applies visible persistent fire");
    assert.ok(burnQa.rows[1].hp<burnQa.rows[0].hp,"Fire upgrade adds actual DOT damage");
    assert.ok(burnQa.rows[2].cinema,"Final adds complete timing, sound and UI feedback");
    assert.ok(burnQa.rows[2].lag>burnQa.rows[2].hp,"Final health-bar lag shows recently lost HP");
    await page.evaluate(()=>{
      const canvas=document.createElement("canvas");
      canvas.id="burn-qa-canvas";canvas.width=960;canvas.height=540;
      Object.assign(canvas.style,{position:"fixed",top:"8px",left:"8px",
        width:"960px",height:"540px",zIndex:"99999",pointerEvents:"none"});
      canvas.fxLogicalWidth=960;document.body.appendChild(canvas);
    });
    for(let n=0;n<=2;n++){
      for(const [phase,time] of [["charge",.12],["impact",.69],["burn",1.43]]){
        await page.evaluate(({stage,time})=>{
          const R=window.__fx.RECIPES.find(r=>r.id==="combat-fire");
          const w=new World(R,stage,{x:82,y:-4,s:1.57,r:[0,0,960,540]},true,false);
          R.fire(w);
          const frames=Math.round(time/.016);
          for(let i=0;i<frames;i++)w.update(.016);
          const cv=document.querySelector("#burn-qa-canvas"),ctx=cv.getContext("2d");
          ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,960,540);w.draw(ctx);
        },{stage:n,time});
        await page.locator("#burn-qa-canvas").screenshot({path:"browser-artifacts/combat-fire-"+n+"-"+phase+".png"});
      }
    }
    await page.locator("#burn-qa-canvas").evaluate(x=>x.remove());

    await page.screenshot({path:"browser-artifacts/director-18-genres.png",fullPage:true});
    const sampleExport=await page.evaluate(async()=>{
      const r=window.__fx.RECIPES.find(r=>r.id==="weapon-railgun");
      const html=await window.__fx.standaloneHTML(r);
      return {bytes:html.length,hasDirector:html.includes("window.FXDirector=Object.freeze"),
        hasEngine:html.includes("class World"),hasRecipe:html.includes("weapon-railgun")};
    });
    assert.ok(sampleExport.bytes>80000 && sampleExport.hasDirector &&
      sampleExport.hasEngine && sampleExport.hasRecipe,
      "Downloaded standalone HTML must contain the full cinematic renderer");
    await page.locator("#pcFinal").click();
    await page.locator("#pcCompare").click();
    assert.equal(await page.locator("#pcTheater").evaluate(x=>x.classList.contains("split-view")),true);
    await page.locator("#pcCompare").click();
    await page.locator("#pcRecord").click();
    assert.equal(await page.locator("body").evaluate(x=>x.classList.contains("recmode")),true);
    assert.equal(await page.locator("#pcShowcase").isVisible(),false);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    await page.screenshot({path:"browser-artifacts/desktop-fxlab.png",fullPage:true});
    assert.equal(await page.locator("#creatorModeToggle").isVisible(),true);
    assert.equal(await page.locator("#scriptCard").isVisible(),false,"Creator-only posts should be hidden by default");
    await page.locator("#creatorModeToggle").click();
    assert.equal(await page.locator("#scriptCard").isVisible(),true,"Creator panel should open on demand");
    await page.locator("#creatorModeToggle").click();
    assert.equal(await page.locator("#scriptCard").isVisible(),false);
    assert.ok((await page.locator("#relatedFx button").count())>=2,"Contextual similar effects visible");
    await page.locator("#relatedFx button").first().click();
    assert.equal(await page.locator("#pcCanvas").isVisible(),true);

    // Inspiration catalog: every recipe exposes actual authored design ideas,
    // while the Reel selects only the meaningful changes instead of 7+ microsteps.
    const discovery=await page.evaluate(()=>{
      const fx=window.__fx,fail=[];
      for(const r of fx.RECIPES){
        const segs=fx.buildSegs(r);
        const upgrades=segs.filter(x=>x.k==="step");
        const final=segs.find(x=>x.k==="hook");
        if(upgrades.length>2 || !final || final.n!==r.steps.length)
          fail.push({id:r.id,upgrades:upgrades.length});
      }
      return {count:fx.RECIPES.length,failed:fail.slice(0,10),
        fireHook:fx.buildSegs(fx.RECIPES.find(r=>r.id==="combat-fire"))[0].dur,
        ideas:document.querySelectorAll("#fxDiscoveryIdeas .fx-discovery-item").length};
    });
    assert.equal(discovery.count,539);
    assert.deepEqual(discovery.failed,[],"All 539 Reels must use cinematic progression");
    assert.ok(discovery.fireHook>=3.2,"Final fire reveal must show actual damage-over-time");
    assert.ok(discovery.ideas>=1 && discovery.ideas<=3,"Relevant authored FX tricks visible to visitors");
    await page.locator("#discoverAll").click();
    await page.locator("#search").fill("마법");
    await page.waitForTimeout(300);
  } else {
    assert.equal(await page.locator("#pcShowcase").isVisible(),false);
    assert.equal(await page.locator("#stage").isVisible(),true);
    await page.screenshot({path:"browser-artifacts/mobile-fxlab.png",fullPage:true});
  }
  await context.close();
}
try{
  await check({width:1680,height:960},false,"desktop");
  await check({width:390,height:844},true,"mobile");
  assert.deepEqual(errors,[]);
  console.log("Browser PASS: desktop wide Canvas, 3 showcases, split, rec, search, mobile.");
}catch(e){
  console.error("BROWSER FAILED",e,errors);process.exitCode=1;
}finally{await browser.close();}

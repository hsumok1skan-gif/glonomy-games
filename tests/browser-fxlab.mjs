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
    await page.screenshot({path:"browser-artifacts/director-18-genres.png",fullPage:true});
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

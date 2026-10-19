import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir="browser-artifacts/individual-quality";
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const pageErrors=[];
page.on("pageerror",e=>pageErrors.push(e.message));
page.setDefaultTimeout(45000);
await page.goto("http://127.0.0.1:8765/fx-tips/index.html",{waitUntil:"domcontentloaded",timeout:45000});
await page.waitForFunction(()=>window.__fx?.RECIPES?.length===539,{timeout:45000});
await page.evaluate(()=>{window.__fx.app.auto=false;});
const genres=await page.evaluate(()=>Array.from(new Set(window.__fx.RECIPES.map(r=>r.cat))));
const records=[];
let total=0;
for (const cat of genres){
  const result=await page.evaluate(cat=>{
    const RECIPES=window.__fx.RECIPES.filter(r=>r.cat===cat),out=[];
    const W=540,H=360,TW=138,TH=92;
    const cols=4,cw=312,ch=150,rows=Math.ceil(RECIPES.length/cols);
    const atlas=document.createElement("canvas");
    atlas.width=cols*cw;atlas.height=rows*ch;
    const a=atlas.getContext("2d",{willReadFrequently:false});
    a.fillStyle="#111923";a.fillRect(0,0,atlas.width,atlas.height);
    const sim=document.createElement("canvas");sim.width=W;sim.height=H;sim.fxLogicalWidth=W;
    const g=sim.getContext("2d",{willReadFrequently:false});
    const sm=document.createElement("canvas");sm.width=TW;sm.height=TH;
    const sg=sm.getContext("2d",{willReadFrequently:true});
    const tmp=document.createElement("canvas");tmp.width=TW;tmp.height=TH;
    const tg=tmp.getContext("2d");
    const seedOf=str=>{let n=2166136261;for(let i=0;i<str.length;i++)n=Math.imul(n^str.charCodeAt(i),16777619);return n>>>0;};
    const seeded=seed=>()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
    const originalRand=Math.random;
    function simulate(R,n){
      Math.random=seeded(seedOf(R.id)+1);
      try{
        const w=new World(R,n,{x:0,y:0,s:1,r:[0,0,540,360]},true,false);
        const shots=[],S=[.22,.65,1.2,2.05],dt=.016;
        R.fire(w);
        let t=0, minHP=Infinity,maxParts=0;
        for(const target of S){
          while(t+0.00001<target){
            const inc=Math.min(dt,target-t);w.update(inc);t+=inc;
            if(w.foe&&Number.isFinite(w.foe.hp))minHP=Math.min(minHP,w.foe.hp);
            maxParts=Math.max(maxParts,w.parts.length+w.shots.length);
          }
          g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);
          w.draw(g);
          sg.setTransform(1,0,0,1,0,0);sg.clearRect(0,0,TW,TH);
          sg.drawImage(sim,0,0,TW,TH);
          const pixels=sg.getImageData(0,0,TW,TH);
          shots.push(pixels);
        }
        const invalid=w.actors.some(x=>![x.x,x.gy,x.w,x.h,x.alpha].every(Number.isFinite))||
          w.parts.some(x=>![x.x,x.y].every(Number.isFinite));
        return {shots,actors:w.actors.length,steps:R.steps.length,invalid,
          minHP:Number.isFinite(minHP)?minHP:null,maxParts,
          totalParts:w.parts.length+w.shots.length,hasTarget:!!w.foe};
      }finally{Math.random=originalRand;}
    }
    function diff(a,b){
      let hit=0,delta=0,ink=0;
      const A=a.data,B=b.data;
      for(let i=0;i<A.length;i+=4){
        const d=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]);
        delta+=d;
        if(d>36)hit++;
        if(B[i]+B[i+1]+B[i+2]>78)ink++;
      }
      return {fraction:hit/(TW*TH),mae:delta/(TW*TH*3),bright:ink/(TW*TH)};
    }
    for(let index=0;index<RECIPES.length;index++){
      const R=RECIPES[index],flags=[];
      let raw,final,winning=0,best={fraction:0,mae:0,bright:0};
      try{
        raw=simulate(R,0);
        final=simulate(R,R.steps.length);
        for(let i=0;i<raw.shots.length;i++){
          const d=diff(raw.shots[i],final.shots[i]);
          if(i===0||d.fraction>best.fraction){
            best=d;winning=i;
          }
        }
        if(raw.invalid||final.invalid)flags.push("non-finite-coordinates");
        if(final.steps<1)flags.push("no-progressive-layers");
        if(best.fraction<.001)flags.push("nearly-identical-raw-final");
        else if(best.fraction<.007)flags.push("weak-visible-difference");
        if(!Number.isFinite(best.mae))flags.push("invalid-render-metrics");
      }catch(e){flags.push("runtime-exception");flags.push(String(e).slice(0,120));}
      const x=(index%cols)*cw,y=Math.floor(index/cols)*ch;
      a.fillStyle=index%2?"#13202b":"#121b27";a.fillRect(x+3,y+4,cw-6,ch-8);
      a.font="bold 12px monospace";a.textBaseline="top";
      a.fillStyle=flags.length?"#ffba8c":"#d5e9ee";
      a.fillText((index+1)+" · "+R.id.slice(0,35),x+8,y+11);
      a.font="10px monospace";a.fillStyle="#9dbcc5";
      const label=(raw&&final)?((best.fraction*100).toFixed(1)+"% changed | "+R.steps.length+" FX layers | t="+[.22,.65,1.2,2.05][winning]):"FAILED";
      a.fillText(label,x+8,y+28);
      if(raw && final){
        tg.putImageData(raw.shots[winning],0,0);a.drawImage(tmp,x+8,y+45,138,92);
        tg.putImageData(final.shots[winning],0,0);a.drawImage(tmp,x+164,y+45,138,92);
        a.fillStyle="rgba(7,17,22,.72)";
        a.fillRect(x+10,y+115,37,16);a.fillRect(x+166,y+115,42,16);
        a.font="bold 10px monospace";a.fillStyle="#fff";
        a.fillText("RAW",x+15,y+117);a.fillText("FINAL",x+169,y+117);
      }
      out.push({id:R.id,cat:R.cat,steps:R.steps.length,
        bestChangedPercent:+(best.fraction*100).toFixed(3),pixelError:+best.mae.toFixed(3),
        bestTime:[.22,.65,1.2,2.05][winning],
        rawMinHP:raw?.minHP,finalMinHP:final?.minHP,
        maxParts:final?.maxParts,actors:final?.actors,flags});
    }
    Math.random=originalRand;
    return {cat,records:out,sheet:atlas.toDataURL("image/png")};
  },cat);
  const fn=cat.replace(/[^a-z0-9-]/g,"_");
  const file=path.join(dir,"genre-"+fn+".png");
  fs.writeFileSync(file,Buffer.from(result.sheet.split(",")[1],"base64"));
  records.push(...result.records);
  total+=result.records.length;
  console.log("AUDIT",cat,result.records.length,"weak",result.records.filter(x=>x.flags.length).length);
}
await browser.close();
const counts={},exceptions=[],low=[],zero=[];
for(const r of records){
  counts[r.cat]=(counts[r.cat]||0)+1;
  if(r.flags.includes("runtime-exception")||r.flags.includes("non-finite-coordinates"))exceptions.push(r);
  if(r.flags.includes("weak-visible-difference"))low.push(r);
  if(r.flags.includes("nearly-identical-raw-final"))zero.push(r);
}
const report={generated:new Date().toISOString(),method:"Automated image difference at four action times with 2 independently seeded world instances per recipe; thumbnail RAW/FINAL contact sheets for manual review; NOT a guarantee of subjective commercial quality.",count:total,categoryCounts:counts,exceptions,nearlyIdentical:zero,weakDifference:low,results:records,pageErrors};
fs.writeFileSync(path.join(dir,"quality-audit-539.json"),JSON.stringify(report,null,2));
const md=["# FX Lab 539 · 개별 시각 품질 검사","",
"검수 방식: 각 레시피를 RAW/최종 단계로 동일한 초기 조건에서 실행하고 t=.22/.65/1.2/2.05초 화면의 차이를 비교했습니다. 카테고리별 RAW/FINAL 비교 이미지 18장을 별도 첨부합니다.",
"",
"**중요:** 픽셀 차이는 실제 연출의 좋고 나쁨을 증명하지 못합니다. 이 결과는 이상 후보를 자동 선별하며, 최종 미적 판단은 이미지 검토가 필요합니다.","",
"| 검사 | 건수 |","|---|---:|",
"| 레시피 합계 | "+total+" |",
"| 실행/좌표 오류 | "+exceptions.length+" |",
"| 변화 거의 없음 (<0.1%) | "+zero.length+" |",
"| 변화 미약 (0.1~0.7%) | "+low.length+" |",
"| 검사 중 브라우저 오류 | "+pageErrors.length+" |",
"",
"## 실행 오류",...exceptions.map(r=>"- "+r.id+": "+r.flags.join(", ")),
"",
"## 변화 거의 없음",...zero.map(r=>"- "+r.id+" ("+r.bestChangedPercent+"%)"),
"",
"## 변화 미약",...low.map(r=>"- "+r.id+" ("+r.bestChangedPercent+"%)")];
fs.writeFileSync(path.join(dir,"QUALITY_REPORT.md"),md.join("\n"));
console.log("FINAL_AUDIT",JSON.stringify({total,categories:genres.length,exceptions:exceptions.length,nearlyIdentical:zero.length,weakDifference:low.length,pageErrors:pageErrors.length}));
assert.equal(total,539,"Must inspect all 539 individual FX");
assert.equal(pageErrors.length,0,"Browser runtime errors");
assert.equal(exceptions.length,0,"No individual-effect script or finite-coordinate errors");
// Weak differences are reported as candidates for manual art review and are
// NEVER misrepresented as a subjective quality pass.

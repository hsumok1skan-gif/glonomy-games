import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const files = ["core","weapon","combat","duel","horde","army","fighting","shooter","action","move","rpg","strategy","sim","puzzle","racing","survival","casual","ui","env","spotlight","spot-reward","spot-combat","spot-power","spot-casual"];
const read = p => fs.readFileSync(p,"utf8");
const html = read("fx-tips/index.html");
const home = read("index.html");
const guide = read("fx-tips/code.html");
const engine = read("fx-tips/engine.js");
const exportJs = read("fx-tips/export.js");
for (const file of ["fx-tips/engine.js","fx-tips/export.js",...files.map(x=>"fx-tips/recipes/"+x+".js")]) {
  new vm.Script(read(file), {filename:file});
}
for (const path of ["fx-tips/index.html","fx-tips/code.html","index.html"]) {
  const htmlText = read(path);
  const inline = [...htmlText.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
  inline.forEach((source,i) => new vm.Script(source,{filename:path+" inline #"+(i+1)}));
  console.log("syntax",path,inline.length,"inline scripts");
}
const ids = files.flatMap(file => [...read("fx-tips/recipes/"+file+".js").matchAll(/\bid:\s*["']([^"']+)["']\s*,\s*cat:\s*["']/g)].map(m=>m[1]));
assert.equal(ids.length,539,"Exactly 539 top-level recipes");
assert.equal(new Set(ids).size,539,"Unique IDs");
const m=html.match(/const PACKS = (\[[^\n]*\]);/);
assert.ok(m,"FX MIX declared");
const packs=JSON.parse(m[1]);
assert.equal(packs.length,11,"11 original FX MIX plans");
const packIds=packs.flatMap(p=>p.ids);
assert.ok(packIds.every(id=>ids.includes(id)),"All bundled IDs exist");
assert.equal(new Set(packIds).size,packIds.length,"An original effect appears in one bundle only");
assert.equal(ids.length-packIds.length+packs.length,512,"512 reels including all 539 effects");
assert.ok(engine.includes("studioBackdrop(ctx, v.r"),"Cinematic stage");
assert.ok(engine.includes('get sfx() { return this.muted || app.mute || this.bare ? NOSFX : SFX; }'),"Sounds active from RAW");
assert.ok(html.includes("const soundBase = (r.base || [])"),"Sound source included in code copy");
assert.ok(html.includes('segs.push({ k: "hook"'),"Hook-first reels");
assert.ok(html.includes('id="finalBtn"'),"Final effect preview");
assert.ok(html.includes('id="copyTTS"'),"AI voice-over script");
assert.ok(home.includes('class="item fx-feature"'),"Homepage has FX Lab showcase");
assert.ok(guide.includes("20261019q3") && html.includes("20261019q3") && exportJs.includes("20261019q3"),"Cache version synchronized");
assert.equal((home.match(/data-cat="sns"/g)||[]).length,1,"No duplicate FX Lab links");
console.log("PASS: 539 unique FX | 11 bundles | 512 reels | site and studio assets present");

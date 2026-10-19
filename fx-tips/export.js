"use strict";
/* 받아 간 사람이 그대로 열어 쓰는 실행 파일 만들기 (사이트와 코드 안내 페이지가 같이 씀) */
window.FXExport = (() => {
  const V = "20261019q3";
  const plain = s => String(s).replace(/\*/g, "");
  const close = "<" + "/script>", open = "<" + "script>", cm = t => "<" + "!-- " + t + " --" + ">";

  const arr = c => `[${c.join(", ")}]`;
  const config = (r, o = {}) => {
    const st = o.style || "dust", col = Object.assign({ hero: [240, 236, 224], foe: [255, 112, 92], gun: [214, 218, 222] }, o.colors || {}), im = o.images || {};
    const line = (k, file, note) => im[k] ? `  ${k}: ${JSON.stringify(im[k])},` : `  // ${k}: "${file}",${" ".repeat(Math.max(1, 22 - k.length - file.length))}// ${note}`;
    return `/* ============================================================
   ★ EDIT HERE — the only part you need to change ★
   ============================================================ */

// 1) Look of the built-in characters
FX.style = "${st}";${" ".repeat(Math.max(1, 18 - st.length))}// "dust" (grainy dots) | "smooth" (shaded) | "flat" (solid silhouette)
FX.colors.hero = ${arr(col.hero)};   // player color  [r, g, b]
FX.colors.foe  = ${arr(col.foe)};    // enemy color
FX.colors.gun  = ${arr(col.gun)};   // gun color

// 2) Use your own art instead (uncomment a line and put the file next to this .html)
//    - transparent PNG, any size (the aspect ratio is kept)
//    - feet / bottom of the character touch the bottom edge of the image
FX.images = {
${line("hero", "my-hero.png", "player, facing RIGHT")}
${line("foe", "my-enemy.png", "enemy, facing LEFT")}
${line("gun", "my-gun.png", "pointing RIGHT, grip at the bottom-left")}
${line("heroTop", "my-hero-top.png", "player seen from above (top-down effects only)")}
${line("foeTop", "my-enemy-top.png", "enemy seen from above")}
};

// 3) Scene settings
const START_LAYERS = ${r.steps.length};       // how many effect layers are ON when the page opens (0 = raw)
const BACKGROUND   = "#0b0c09";
const AUTO_FIRE    = true;      // repeat the action every ${r.interval}s (tap the scene to fire manually)
`;
  };

  const runner = r => `
window.app = { mute: false };
const R = RECIPES.find(r => r.id === ${JSON.stringify(r.id)});
const cv = document.getElementById("c"), ctx = cv.getContext("2d"), ui = document.getElementById("ui");
const VIEW = { x: 0, y: 0, s: 1, r: [0, 0, 540, 360] };
let n = START_LAYERS, w, t = 0, last = 0;
function reset() { w = new World(R, n, VIEW); const s = R.steps[n - 1]; if (s && s.enter) s.enter(w); t = R.interval - 0.35; buttons(); }
function buttons() {
  ui.innerHTML = [0].concat(R.steps.map((s, i) => i + 1)).map(k => '<button class="' + (k === n ? "on" : "") + '" data-n="' + k + '">' + (k ? k + " " + R.steps[k - 1].name.en : "RAW") + "</button>").join("");
}
ui.onclick = e => { const b = e.target.closest("button"); if (b) { n = +b.dataset.n; reset(); } };
cv.onpointerdown = () => { audioInit(); R.fire(w); };
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; frameNo++;
  const dpr = Math.min(devicePixelRatio || 1, 2.5), W = cv.clientWidth;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr * 2 / 3); }
  if (AUTO_FIRE) { t += dt; if (t >= R.interval) { t = 0; R.fire(w); } }
  w.update(dt);
  const k = cv.width / 540; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.fillStyle = BACKGROUND; ctx.fillRect(0, 0, 540, 360);
  w.draw(ctx); requestAnimationFrame(loop);
}
document.addEventListener("pointerdown", audioInit, { capture: true });
makeSprites().then(() => { reset(); requestAnimationFrame(t0 => { last = t0; loop(t0); }); });
`;

  async function standaloneHTML(r, base = "", o = {}) {
    const [eng, rec] = await Promise.all([
      fetch(`${base}engine.js?v=${V}`).then(x => x.text()),
      fetch(`${base}recipes/${r._file}.js?v=${V}`).then(x => x.text()),
    ]);
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${plain(r.title.en)} — FX Lab</title>
<style>html,body{margin:0;background:#0b0c09;color:#ece9de;font:14px system-ui,sans-serif}canvas{display:block;width:min(100vw,900px);margin:0 auto;aspect-ratio:3/2;touch-action:manipulation}#ui{text-align:center;padding:12px}button{margin:3px;padding:8px 12px;border-radius:8px;border:1px solid #333;background:#1b1e16;color:#ece9de;font:inherit}button.on{background:#c8f03c;color:#141708;border-color:#c8f03c}p{text-align:center;color:#8d9081}</style>
</head><body>
<canvas id="c"></canvas><div id="ui"></div>
<p>${plain(r.title.en)} · tap the scene to fire · pick a layer above · guide: glonomy.com/fx-tips/code.html#${r.id}</p>
${cm("1) engine: World, particles, actors, sounds (no need to edit)")}
${open}
${eng}
${close}
${cm(`2) effect recipes — this file holds "${r.id}" and its neighbours. Search for id: "${r.id}" to tweak numbers.`)}
${open}
${rec}
${close}
${cm("3) your settings + runner")}
${open}
${config(r, o)}${runner(r)}
${close}
</body></html>`;
  }
  async function download(r, base, done, o) {
    const html = await standaloneHTML(r, base, o), blob = new Blob([html], { type: "text/html" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `fx-${r.id}.html`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (done) done();
  }
  return { V, standaloneHTML, download, config };
})();

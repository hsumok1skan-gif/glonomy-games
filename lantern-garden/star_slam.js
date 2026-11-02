// Make three stars slam in — 별 3개를 쾅쾅쾅 박기
// 기본 동작 (효과 없음)
setup(w) {
  w.st = [[188, 166, 34, -0.22], [270, 150, 46, 0], [352, 166, 34, 0.22]].map(([x, y, r, rot]) => ({ x, y, r, rot, on: 0, a: 1, sc: 1 }));
  w.score = { shown: 0 };
}

function (w, ...x) { const st = w.rigState || (w.rigState = {}); st.fire = w.time; return f.call(this, w, ...x); }

// RAW부터 활성화되는 효과음
// STEP 1 · Sound (소리)
// 별마다 한 음씩 높아져요.
land(w, s, i) {
  if (w.on("slam")) w.play(() => { sBody(160, 0.12, 0.7); sSnap(0.3, 0, 2400); });
  w.sfx.chime(i * 4);
  if (i === 2 && w.on("finale")) w.sfx.fanfare();
}

// STEP 1 · Slam In (쾅 박히기)
// 크게 떨어져서 칸에 쾅, 하나씩.
star(w, s, i) {
  s.sc = 3; s.a = 0;
  w.tween(s, { sc: 1, a: 1 }, 0.18, "in", () => w.emit("land", s, i));
}

// STEP 2 · Impact Shake (충격 흔들림)
// 별이 늘수록 더 세게 흔들어요.
land(w, s, i) {
  w.shake(0.2 + i * 0.15);
  w.hitstop(0.04 + i * 0.03);
  w.kick(0, 6 + i * 4);
}

// STEP 3 · Star Burst (별 터짐)
// 박힐 때마다 고리와 불꽃.
land(w, s, i) {
  w.spawn({ type: "ring", x: s.x, y: s.y, size: s.r, size1: s.r * 2.6, life: 0.35, w: 8, color: "255,220,120" });
  for (let k = 0; k < 8 + i * 6; k++) {
    const a = rand(0, TAU), v = rand(160, 420);
    w.spawn({ type: "spark", x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 4, size: 3, life: 0.4, color: pick(["255,230,120", "255,160,60"]) });
  }
}

// STEP 4 · Third-Star Finale (세 번째 별 피날레)
// 마지막 별에 가장 큰 한 방.
land(w, s, i) {
  if (i < 2) return;
  w.flash("255,230,170", 0.25); w.zoomPunch(0.1);
  w.spawn({ type: "rays", under: true, x: s.x, y: s.y, n: 16, size: 50, size1: 280, vr: 0.7, life: 2, hold: true, color: "255,200,90" });
  w.spawn({ type: "text", x: 270, y: 316, text: "PERFECT!", size: 32, color: "#ffd75a", life: 1.8 });
  stars(w, s.x, s.y, 18, ["255,230,120", "255,255,255", "255,170,80"]);
}

// STEP 5 · Score Count (점수 올리기)
// 점수는 0부터 촤르륵 올려요.
land(w, s, i) {
  if (i < 2) return;
  w.tween(w.score, { shown: 12480 }, 0.9, "out");
}
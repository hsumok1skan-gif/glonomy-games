/* Popcorn Drop — Web Audio 효과음 (첫 터치 뒤에만 켠다) */
(function () {
  'use strict';
  let ctx = null;
  const last = {};
  const GAP = { tick: 0.05, drop: 0.06, pop: 0.035, catch: 0.05, tok: 0.04, land: 0.05 };

  // 이름: [[주파수, 길이(초), 모양, 세기, 끝 주파수], ...] 를 차례로 낸다
  const SOUNDS = {
    click: [[660, 0.05, 'square', 0.05]],
    start: [[440, 0.08, 'triangle', 0.12], [660, 0.1, 'triangle', 0.12], [880, 0.14, 'triangle', 0.1]],
    drop: [[520, 0.05, 'sine', 0.06, 300]],
    tick: [[1400, 0.025, 'triangle', 0.035]],
    tok: [[1500, 0.04, 'square', 0.07, 2200]],
    quad: [[1200, 0.05, 'square', 0.08, 1800], [1800, 0.07, 'square', 0.08, 2600]],
    gold: [[1200, 0.06, 'square', 0.06], [1600, 0.08, 'square', 0.06]],
    rat: [[900, 0.05, 'sawtooth', 0.05, 1500], [700, 0.08, 'sawtooth', 0.05, 400]],
    land: [[180, 0.05, 'sine', 0.08, 120]],
    fire: [[200, 0.16, 'sawtooth', 0.08, 90]],
    fireoff: [[300, 0.08, 'triangle', 0.06, 150]],
    pop: [[700, 0.03, 'square', 0.06, 200]],
    mega: [[90, 0.3, 'sawtooth', 0.2, 40], [600, 0.06, 'square', 0.1, 200], [900, 0.06, 'square', 0.1, 300], [1300, 0.12, 'square', 0.1, 400]],
    burn: [[150, 0.3, 'sawtooth', 0.1, 70], [120, 0.3, 'sawtooth', 0.08, 60]],
    overflow: [[160, 0.12, 'sawtooth', 0.08, 80]],
    catch: [[1000, 0.03, 'sine', 0.05, 1300]],
    fill: [[660, 0.07, 'triangle', 0.12], [990, 0.12, 'triangle', 0.12]],
    combo: [[660, 0.06, 'triangle', 0.12], [880, 0.06, 'triangle', 0.12], [1320, 0.16, 'triangle', 0.12]],
    buy: [[880, 0.06, 'square', 0.06], [1100, 0.08, 'square', 0.06]],
    place: [[300, 0.06, 'square', 0.1], [600, 0.08, 'triangle', 0.1]],
    block: [[140, 0.1, 'square', 0.08]],
    win: [[523, 0.12, 'triangle', 0.12], [659, 0.12, 'triangle', 0.12], [784, 0.12, 'triangle', 0.12], [1046, 0.3, 'triangle', 0.12]],
    fail: [[392, 0.16, 'sawtooth', 0.1], [311, 0.16, 'sawtooth', 0.1], [233, 0.34, 'sawtooth', 0.1]],
    ach: [[784, 0.08, 'sine', 0.12], [1175, 0.2, 'sine', 0.12]]
  };

  function unlock() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch (e) { ctx = null; }
  }

  function play(name) {
    if (!ctx || !window.Game || !window.Game.Store.data.settings.sound) return;
    const seq = SOUNDS[name];
    if (!seq) return;
    if (GAP[name]) {
      const now = ctx.currentTime;
      if (now - (last[name] || 0) < GAP[name]) return;
      last[name] = now;
    }
    try {
      let t = ctx.currentTime;
      for (const [f, len, type, vol, f2] of seq) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + len);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + len + 0.02);
        t += len * 0.85;
      }
    } catch (e) { /* 소리를 못 내도 게임은 돈다 */ }
  }

  function buzz(ms) {
    if (!window.Game || !window.Game.Store.data.settings.vibe) return;
    try { if (navigator.vibrate) navigator.vibrate(ms || 15); } catch (e) { /* 진동 없음 */ }
  }

  window.Sfx = { unlock, play, buzz, SOUNDS };
})();

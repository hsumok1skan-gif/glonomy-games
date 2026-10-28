// Pocket Bazaar — Web Audio 효과음 (첫 터치 뒤에만 켠다)
var Sfx = (function () {
  var ctx = null;
  var unlocked = false;

  function on() { return Store.meta.settings.sound; }
  function unlock() {
    if (unlocked) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      unlocked = true;
    } catch (e) { ctx = null; }
  }
  function tone(freq, dur, type, vol, delay, slide) {
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, delay, hp) {
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp || 800;
    var g = ctx.createGain();
    g.gain.value = vol || 0.1;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t);
  }

  var SOUNDS = {
    tap: function () { tone(660, 0.05, 'triangle', 0.08); },
    pick: function () { tone(520, 0.06, 'triangle', 0.1); tone(780, 0.06, 'triangle', 0.08, 0.04); },
    place: function () { noise(0.05, 0.08, 0, 1500); tone(330, 0.08, 'sine', 0.12); },
    open: function () { tone(523, 0.1, 'triangle', 0.12); tone(659, 0.1, 'triangle', 0.12, 0.08); tone(784, 0.16, 'triangle', 0.12, 0.16); },
    customer: function () { tone(880, 0.07, 'sine', 0.08); tone(1175, 0.1, 'sine', 0.07, 0.06); },
    coin: function () { tone(1320, 0.06, 'square', 0.05); tone(1760, 0.12, 'square', 0.05, 0.05); },
    bigcoin: function () { [1046, 1318, 1568, 2093].forEach(function (f, i) { tone(f, 0.12, 'square', 0.05, i * 0.05); }); },
    leave: function () { tone(392, 0.16, 'sine', 0.1, 0, 262); },
    sad: function () { tone(330, 0.12, 'triangle', 0.1); tone(262, 0.2, 'triangle', 0.1, 0.1); },
    spoil: function () { noise(0.2, 0.08, 0, 300); tone(180, 0.2, 'sawtooth', 0.05, 0, 90); },
    rent: function () { tone(440, 0.08, 'square', 0.05); tone(440, 0.08, 'square', 0.05, 0.1); tone(660, 0.14, 'square', 0.05, 0.2); },
    charm: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.14, 'sine', 0.08, i * 0.06); }); },
    buy: function () { tone(988, 0.06, 'triangle', 0.1); tone(1319, 0.1, 'triangle', 0.1, 0.05); },
    nobuy: function () { tone(160, 0.14, 'square', 0.06); },
    shuffle: function () { noise(0.12, 0.06, 0, 2500); noise(0.1, 0.05, 0.08, 2500); },
    win: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.12, i * 0.11); }); },
    fail: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.26, 'triangle', 0.11, i * 0.14); }); },
    ach: function () { tone(1568, 0.1, 'sine', 0.08); tone(2093, 0.18, 'sine', 0.08, 0.08); },
    start: function () { tone(392, 0.08, 'triangle', 0.12); tone(523, 0.08, 'triangle', 0.12, 0.07); tone(784, 0.14, 'triangle', 0.12, 0.14); },
    block: function () { tone(220, 0.08, 'square', 0.06); }
  };

  function play(name) {
    if (!on()) return;
    unlock();
    if (!ctx) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) { /* 소리 없이 계속 */ }
    var f = SOUNDS[name];
    if (f) { try { f(); } catch (e) { /* 소리 없이 계속 */ } }
  }
  function buzz(ms) {
    if (!Store.meta.settings.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(ms || 20); } catch (e) { /* 진동 없음 */ }
  }
  return { play: play, unlock: unlock, buzz: buzz, names: Object.keys(SOUNDS) };
})();

/* Tide Haul — Web Audio 로 그 자리에서 만드는 효과음. 첫 터치 뒤에만 켠다 */
'use strict';

var Sfx = (function () {
  var ctx = null, unlocked = false;

  function on() { var m = Store.get(); return m && m.settings.sound && !Store.isTemp(); }
  function unlock() {
    if (unlocked) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      unlocked = true;
    } catch (e) { ctx = null; }
  }
  function tone(freq, dur, type, vol, slide, delay) {
    if (!ctx || !on()) return;
    try {
      var t = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* 무시 */ }
  }
  function noise(dur, vol, hp) {
    if (!ctx || !on()) return;
    try {
      var n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp || 600;
      s.buffer = buf; g.gain.value = vol || 0.08;
      s.connect(f); f.connect(g); g.connect(ctx.destination);
      s.start();
    } catch (e) { /* 무시 */ }
  }

  var SOUNDS = {
    tap: function () { tone(520, 0.05, 'triangle', 0.06); },
    step: function () { tone(180, 0.06, 'sine', 0.05, 0.7); },
    heavy: function () { tone(110, 0.12, 'sine', 0.08, 0.6); },
    bump: function () { tone(90, 0.1, 'square', 0.05, 0.8); },
    pick: function () { tone(660, 0.07, 'triangle', 0.1); tone(990, 0.09, 'triangle', 0.08, 1, 0.06); },
    drop: function () { tone(300, 0.15, 'sine', 0.08, 0.5); },
    dig: function () { noise(0.12, 0.06, 900); },
    vent: function () { for (var i = 0; i < 4; i++) tone(400 + i * 140, 0.08, 'sine', 0.06, 1.4, i * 0.05); },
    sting: function () { tone(820, 0.12, 'sawtooth', 0.07, 0.4); noise(0.08, 0.05, 2000); },
    lose: function () { tone(440, 0.2, 'square', 0.06, 0.5); },
    block: function () { tone(1400, 0.05, 'triangle', 0.07); tone(700, 0.12, 'triangle', 0.06, 1.2, 0.04); },
    gift: function () { tone(523, 0.1, 'sine', 0.08); tone(784, 0.16, 'sine', 0.08, 1, 0.08); },
    ink: function () { tone(160, 0.3, 'sine', 0.08, 0.5); },
    surface: function () { noise(0.25, 0.07, 400); tone(392, 0.12, 'triangle', 0.08, 1.5, 0.1); },
    sell: function () { for (var i = 0; i < 3; i++) tone(880 + i * 220, 0.06, 'triangle', 0.07, 1, i * 0.06); },
    emergency: function () { tone(660, 0.18, 'square', 0.07); tone(440, 0.25, 'square', 0.07, 1, 0.18); },
    buy: function () { tone(700, 0.06, 'triangle', 0.08); tone(1050, 0.1, 'triangle', 0.08, 1, 0.05); },
    quota: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.12, 'triangle', 0.08, 1, i * 0.08); }); },
    fail: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.22, 'sine', 0.09, 0.9, i * 0.16); }); },
    win: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.09, 1, i * 0.1); }); },
    charm: function () { tone(988, 0.12, 'sine', 0.08); tone(1318, 0.2, 'sine', 0.07, 1, 0.08); },
    warn: function () { tone(1200, 0.06, 'square', 0.04); tone(1200, 0.06, 'square', 0.04, 1, 0.12); },
    current: function () { noise(0.2, 0.05, 300); },
    start: function () { tone(330, 0.1, 'triangle', 0.08); tone(494, 0.14, 'triangle', 0.08, 1, 0.09); }
  };
  function play(name) { if (SOUNDS[name]) SOUNDS[name](); }
  function vibrate(ms) {
    var m = Store.get();
    if (!m || !m.settings.vibrate || Store.isTemp()) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 무시 */ }
  }
  return { unlock: unlock, play: play, vibrate: vibrate, count: Object.keys(SOUNDS).length };
})();

'use strict';
/* Kettle Spirits — Web Audio 효과음. 첫 터치 뒤에만 켠다 */
var Sfx = (function () {
  var ctx = null, master = null, on = true, vol = 0.6, muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* 무시 */ } } return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = vol;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type, gain, slideTo, delay) {
    if (!ctx || !on || muted) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, gain, freq, delay) {
    if (!ctx || !on || muted) return;
    var t = ctx.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200;
    var g = ctx.createGain(); g.gain.value = gain || 0.2;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  var SOUNDS = {
    click:    function () { tone(660, 0.06, 'triangle', 0.12); },
    pick:     function () { tone(520, 0.07, 'sine', 0.16, 780); },
    brew:     function () { tone(523, 0.12, 'triangle', 0.18); tone(659, 0.12, 'triangle', 0.16, 0, 0.07); tone(784, 0.2, 'triangle', 0.16, 0, 0.14); noise(0.25, 0.06, 2400, 0.05); },
    calm:     function () { tone(880, 0.1, 'sine', 0.12, 1320); },
    calmed:   function () { tone(784, 0.16, 'sine', 0.16); tone(988, 0.16, 'sine', 0.14, 0, 0.1); tone(1319, 0.3, 'sine', 0.12, 0, 0.2); },
    hurt:     function () { tone(180, 0.18, 'sawtooth', 0.16, 90); noise(0.12, 0.12, 400); },
    shield:   function () { tone(392, 0.14, 'square', 0.08, 523); },
    heal:     function () { tone(587, 0.14, 'sine', 0.12, 880); tone(740, 0.18, 'sine', 0.1, 0, 0.08); },
    overflow: function () { noise(0.35, 0.22, 700); tone(220, 0.3, 'sawtooth', 0.12, 110); },
    junk:     function () { noise(0.14, 0.12, 3000); },
    lock:     function () { tone(300, 0.08, 'square', 0.1); tone(240, 0.1, 'square', 0.1, 0, 0.06); },
    skill:    function () { tone(392, 0.12, 'triangle', 0.16); tone(587, 0.14, 'triangle', 0.16, 0, 0.08); tone(784, 0.3, 'triangle', 0.18, 1175, 0.16); },
    tool:     function () { tone(740, 0.08, 'triangle', 0.12, 494); noise(0.1, 0.06, 1800, 0.04); },
    reward:   function () { tone(659, 0.1, 'triangle', 0.14); tone(880, 0.18, 'triangle', 0.14, 0, 0.08); },
    coin:     function () { tone(1046, 0.06, 'square', 0.08); tone(1568, 0.1, 'square', 0.07, 0, 0.05); },
    act:      function () { tone(260, 0.1, 'triangle', 0.12, 200); },
    win:      function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.16, 0, i * 0.12); }); },
    lose:     function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.3, 'sine', 0.14, 0, i * 0.16); }); }
  };

  function play(name) {
    if (!ctx || !on || muted) return;
    var fn = SOUNDS[name];
    if (fn) { try { fn(); } catch (e) { /* 소리 실패는 게임을 멈추지 않는다 */ } }
  }

  function setOn(v) { on = !!v; }
  function setVolume(level) {
    vol = [0.3, 0.6, 0.9][level] || 0.6;
    if (master) master.gain.value = vol;
  }
  function setMuted(v) { muted = !!v; }

  return { init: init, play: play, setOn: setOn, setVolume: setVolume, setMuted: setMuted, names: Object.keys(SOUNDS) };
})();

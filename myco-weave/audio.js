/* Myco Weave — Web Audio 효과음 (첫 터치 뒤에만) */
window.Sfx = (function () {
  var ctx = null;
  var unlocked = false;

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch (e) { ctx = null; }
  }

  function vol() {
    var s = window.Store ? window.Store.settings() : { sound: true, volume: 2 };
    if (!s.sound) return 0;
    return [0, 0.06, 0.12, 0.2][s.volume] || 0.12;
  }

  // 음 하나: 주파수, 길이, 파형, 끝 주파수, 늦춤
  function tone(f, dur, type, f2, delay) {
    if (!ctx) return;
    var v = vol();
    if (v <= 0) return;
    try {
      var t = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* 소리 실패는 무시 */ }
  }

  function noise(dur, delay, hp) {
    if (!ctx) return;
    var v = vol();
    if (v <= 0) return;
    try {
      var t = ctx.currentTime + (delay || 0);
      var len = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var filt = ctx.createBiquadFilter();
      filt.type = 'highpass'; filt.frequency.value = hp || 800;
      var g = ctx.createGain();
      g.gain.value = v * 0.8;
      src.connect(filt); filt.connect(g); g.connect(ctx.destination);
      src.start(t);
    } catch (e) { /* 무시 */ }
  }

  var sounds = {
    click:   function () { tone(520, 0.05, 'triangle'); },
    start:   function () { tone(392, 0.1, 'triangle'); tone(523, 0.1, 'triangle', null, 0.08); tone(659, 0.16, 'triangle', null, 0.16); },
    grow:    function () { tone(300, 0.12, 'sine', 520); },
    partner: function () { tone(392, 0.12, 'sine'); tone(587, 0.18, 'triangle', null, 0.07); tone(784, 0.1, 'sine', null, 0.14); },
    fruit:   function () { tone(660, 0.08, 'triangle'); tone(880, 0.12, 'triangle', null, 0.06); },
    thick:   function () { tone(180, 0.12, 'square', 140); },
    digest:  function () { noise(0.15, 0, 400); tone(240, 0.15, 'sawtooth', 120); },
    spore:   function () { tone(1046, 0.06, 'sine'); tone(1318, 0.08, 'sine', null, 0.04); },
    bite:    function () { noise(0.12, 0, 1200); tone(160, 0.1, 'square', 90); },
    heart:   function () { tone(110, 0.3, 'sawtooth', 60); noise(0.2, 0, 300); },
    wither:  function () { tone(400, 0.25, 'sine', 180); },
    kill:    function () { tone(700, 0.06, 'square', 350); noise(0.06, 0.03, 2000); },
    bounce:  function () { tone(240, 0.06, 'triangle', 480); },
    steal:   function () { tone(600, 0.15, 'triangle', 300); },
    event:   function () { tone(440, 0.1, 'sine'); tone(554, 0.12, 'sine', null, 0.1); },
    skill:   function () { tone(330, 0.1, 'triangle', 660); tone(880, 0.15, 'sine', null, 0.1); },
    day:     function () { tone(262, 0.12, 'sine'); tone(330, 0.16, 'sine', null, 0.1); },
    win:     function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.18, 'triangle', null, i * 0.1); }); },
    lose:    function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.22, 'sine', null, i * 0.14); }); },
    reward:  function () { tone(784, 0.1, 'triangle'); tone(988, 0.14, 'triangle', null, 0.08); },
    deny:    function () { tone(150, 0.1, 'square'); }
  };

  function play(name) {
    if (!unlocked || !ctx) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) { /* 무시 */ }
    var f = sounds[name];
    if (f) f();
  }

  function vibrate(ms) {
    var s = window.Store ? window.Store.settings() : null;
    if (!s || !s.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 무시 */ }
  }

  return { unlock: unlock, play: play, vibrate: vibrate, names: Object.keys(sounds) };
})();

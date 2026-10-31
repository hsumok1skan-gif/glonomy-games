// Ember Watch — 효과음 (Web Audio 로 그 자리에서 만든다. 소리 파일 없음, 첫 터치 뒤에만 켠다)
(function () {
  'use strict';
  const EW = window.EW = window.EW || {};
  let ac = null, master = null;

  EW.audioInit = function () {
    if (ac) { if (ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* 무시 */ } } return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.connect(ac.destination);
      EW.audioVolume();
    } catch (e) { ac = null; }
  };

  EW.audioVolume = function () {
    if (!master || !EW.S) return;
    const v = [0, 0.12, 0.25, 0.4][EW.S.settings.vol] || 0.25;
    master.gain.value = v;
  };

  function tone(freq, dur, type, vol, slideTo, delay) {
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, hp, delay) {
    const t0 = ac.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    // 소리용 잡음은 게임 규칙과 상관없으므로 간단한 식으로 만든다
    let s = 12345;
    for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x7fffffff * 2 - 1) * (1 - i / len); }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 800;
    const g = ac.createGain();
    g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  const SFX = {
    click: function () { tone(660, 0.06, 'triangle', 0.25); },
    start: function () { tone(330, 0.12, 'triangle', 0.35); tone(495, 0.16, 'triangle', 0.35, 0, 0.1); },
    pick: function () { tone(520, 0.07, 'square', 0.12, 780); },
    feedFire: function () { noise(0.35, 0.35, 300); tone(160, 0.3, 'sawtooth', 0.12, 90); },
    feedLamp: function () { tone(880, 0.12, 'sine', 0.25, 1320); tone(1320, 0.15, 'sine', 0.15, 0, 0.06); },
    hit: function () { tone(240, 0.05, 'square', 0.08, 180); },
    kill: function () { noise(0.12, 0.2, 1500); tone(420, 0.1, 'triangle', 0.2, 900); },
    hurt: function () { tone(140, 0.2, 'sawtooth', 0.3, 70); },
    eat: function () { tone(520, 0.08, 'triangle', 0.2, 700); tone(660, 0.1, 'triangle', 0.18, 0, 0.08); },
    fireHit: function () { noise(0.25, 0.25, 400); tone(150, 0.25, 'square', 0.12, 70); },
    chop: function () { noise(0.08, 0.3, 1200); tone(180, 0.12, 'square', 0.15, 120, 0.02); },
    build: function () { tone(260, 0.08, 'square', 0.2); tone(390, 0.08, 'square', 0.2, 0, 0.09); tone(520, 0.14, 'triangle', 0.22, 0, 0.18); },
    break: function () { noise(0.18, 0.3, 900); tone(220, 0.15, 'sawtooth', 0.12, 110); },
    trap: function () { tone(900, 0.05, 'square', 0.2, 300); noise(0.1, 0.2, 2000); },
    out: function () { tone(300, 0.4, 'sine', 0.15, 90); },
    day: function () { [392, 494, 587].forEach(function (f, i) { tone(f, 0.3, 'sine', 0.2, 0, i * 0.08); }); },
    warn: function () { tone(440, 0.12, 'square', 0.2); tone(440, 0.12, 'square', 0.2, 0, 0.2); },
    dawn: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.4, 'sine', 0.22, 0, i * 0.09); }); },
    night: function () { tone(220, 0.5, 'triangle', 0.18, 196); },
    card: function () { tone(784, 0.1, 'triangle', 0.3); tone(1175, 0.18, 'triangle', 0.25, 0, 0.08); },
    relic: function () { [659, 880, 1319].forEach(function (f, i) { tone(f, 0.3, 'sine', 0.22, 0, i * 0.07); }); },
    boss: function () { tone(90, 0.8, 'sawtooth', 0.3, 60); noise(0.6, 0.15, 200); },
    burst: function () { noise(0.3, 0.3, 600); tone(300, 0.25, 'sawtooth', 0.15, 600); },
    spark: function () { tone(1600, 0.05, 'square', 0.06, 2400); },
    revive: function () { [392, 523, 659].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.3, 0, i * 0.08); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.35, 'triangle', 0.25, 0, i * 0.16); }); },
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.35, 'triangle', 0.25, 0, i * 0.1); }); },
    buy: function () { tone(988, 0.08, 'square', 0.15); tone(1319, 0.12, 'square', 0.15, 0, 0.07); }
  };
  EW.SFX_NAMES = Object.keys(SFX);

  EW.sfx = function (name) {
    if (!ac || !EW.S || !EW.S.settings.sound || EW.testMode) return;
    const f = SFX[name];
    if (!f) return;
    try { f(); } catch (e) { /* 소리가 안 나도 게임은 돈다 */ }
  };

  EW.vibrate = function (ms) {
    if (!EW.S || !EW.S.settings.vib || EW.testMode) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 무시 */ }
  };
})();

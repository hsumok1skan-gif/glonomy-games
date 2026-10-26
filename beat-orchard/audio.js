/* Beat Orchard — 효과음 (Web Audio, 첫 터치 뒤에만 켠다) */
(function () {
  'use strict';
  var ctx = null;
  var master = null;
  var lastPlay = {};

  var SFX = {
    shoot: { type: 'triangle', f: 660, f2: 880, d: 0.06, v: 0.06 },
    hit: { type: 'square', f: 220, f2: 160, d: 0.05, v: 0.05 },
    kill: { type: 'sine', f: 520, f2: 260, d: 0.16, v: 0.16 },
    seed: { type: 'sine', f: 880, f2: 1320, d: 0.1, v: 0.12 },
    plant: { type: 'triangle', f: 330, f2: 660, d: 0.14, v: 0.2 },
    hurt: { type: 'sawtooth', f: 180, f2: 90, d: 0.12, v: 0.1 },
    fence: { type: 'square', f: 120, f2: 60, d: 0.22, v: 0.18 },
    skill: { type: 'triangle', f: 440, f2: 1100, d: 0.25, v: 0.2 },
    wave: { type: 'sine', f: 392, f2: 523, d: 0.3, v: 0.2 },
    clear: { type: 'sine', f: 523, f2: 784, d: 0.35, v: 0.22 },
    pick: { type: 'triangle', f: 600, f2: 900, d: 0.12, v: 0.18 },
    boss: { type: 'sawtooth', f: 90, f2: 70, d: 0.6, v: 0.2 },
    win: { type: 'sine', f: 523, f2: 1046, d: 0.7, v: 0.25 },
    lose: { type: 'triangle', f: 300, f2: 100, d: 0.8, v: 0.22 },
    click: { type: 'sine', f: 700, f2: 700, d: 0.04, v: 0.08 },
    buy: { type: 'sine', f: 660, f2: 990, d: 0.2, v: 0.2 },
    block: { type: 'square', f: 900, f2: 700, d: 0.05, v: 0.06 },
    empty: { type: 'sine', f: 200, f2: 180, d: 0.1, v: 0.1 },
    // 밤바람 박자와 판정
    beat: { type: 'sine', f: 1200, f2: 900, d: 0.03, v: 0.035 },
    perfect: { type: 'triangle', f: 988, f2: 1480, d: 0.12, v: 0.2 },
    good: { type: 'triangle', f: 740, f2: 988, d: 0.09, v: 0.14 },
    miss: { type: 'square', f: 160, f2: 110, d: 0.12, v: 0.08 },
    // 콤보 장면: 정원사가 열매를 쏨 / 정령이 돌아감
    gift: { type: 'triangle', f: 660, f2: 1760, d: 0.22, v: 0.2 },
    home: { type: 'sine', f: 784, f2: 2093, d: 0.45, v: 0.26 },
    // 중요한 버튼 (시작·고르기·되돌릴 수 없는 것)
    press: { type: 'triangle', f: 520, f2: 1040, d: 0.1, v: 0.16 }
  };

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* 무시 */ } }
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.55;
      musicBus.connect(master);
      noiseBuf = makeNoise();
    } catch (e) { ctx = null; master = null; musicBus = null; noiseBuf = null; }
  }

  // ---------- 밤바람 배경 음악 (오실레이터로 박마다 만든다) ----------
  // 한 마디 = 4박. 첫 박(강박)은 베이스+북, 나머지 세 박은 화음+하이햇.
  // 마디마다 화음이 하나씩 바뀌고(4화음 진행), 진행은 지역마다, 마지막 물결은 우두머리 진행.
  // 물결이 오를수록 겹이 늘어난다: 1~3 기본, 4~ 엇박 하이햇·분산화음, 7~ 깔린 화음, 10 톱니 베이스.
  var musicBus = null;
  var noiseBuf = null;
  var musicNodes = [];
  var MAJ = [0, 4, 7];
  var MIN = [0, 3, 7];
  // [근음 MIDI, 화음] × 4 마디
  var PROGRESSIONS = [
    [[48, MAJ], [55, MAJ], [57, MIN], [53, MAJ]], // 달빛 언덕: C G Am F
    [[57, MIN], [53, MAJ], [48, MAJ], [55, MAJ]], // Am F C G
    [[50, MIN], [46, MAJ], [53, MAJ], [48, MAJ]], // Dm B♭ F C
    [[52, MIN], [48, MAJ], [55, MAJ], [50, MAJ]], // Em C G D
    [[53, MIN], [49, MAJ], [56, MAJ], [51, MAJ]]  // Fm D♭ A♭ E♭
  ];
  var BOSS_PROG = [[57, MIN], [53, MAJ], [50, MIN], [52, MAJ]]; // Am F Dm E
  var LAST_WAVE = 10;

  function makeNoise() {
    var len = Math.floor(ctx.sampleRate * 0.25);
    var b = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = b.getChannelData(0);
    // 게임의 Math.random 순서를 건드리지 않게 따로 만든 잡음
    var x = 12345;
    for (var i = 0; i < len; i++) { x = (Math.imul(x, 1103515245) + 12345) | 0; d[i] = ((x >>> 8) & 0xffff) / 32768 - 1; }
    return b;
  }
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function keep(node, until) {
    musicNodes.push({ n: node, until: until });
    if (musicNodes.length > 80) {
      var now = ctx.currentTime;
      musicNodes = musicNodes.filter(function (x) { return x.until > now; });
    }
  }
  // 오실레이터 하나: 주파수 f, 시작 t, 길이 d, 크기 v (가벼운 공격·지수 감쇠)
  function tone(type, f, t, d, v, f2, filterHz) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(0.012, d * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    var out = o;
    if (filterHz) {
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = filterHz;
      o.connect(lp);
      out = lp;
    }
    out.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + d + 0.03);
    keep(o, t + d + 0.03);
  }
  function hat(t, v, d) {
    if (!noiseBuf) return;
    var s = ctx.createBufferSource();
    var hp = ctx.createBiquadFilter();
    var g = ctx.createGain();
    s.buffer = noiseBuf;
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(hp);
    hp.connect(g);
    g.connect(musicBus);
    s.start(t);
    s.stop(t + d + 0.02);
    keep(s, t + d + 0.02);
  }

  // beatIdx 번째 박을 지금(ctx.currentTime)부터 lead 초 뒤에 예약한다.
  // period = 실제 한 박 길이(초), wave = 물결 번호(1~10), region = 지역 번호
  function musicBeat(beatIdx, period, wave, region, lead) {
    var s = window.Store ? window.Store.settings : null;
    if (!ctx || !musicBus || !s || !s.music || ctx.state !== 'running') return false;
    try {
      master.gain.value = s.volume;
      var t = ctx.currentTime + Math.max(0, Math.min(2, +lead || 0));
      var p = Math.max(0.2, +period || 0.8);
      var w = Math.max(1, wave | 0);
      var prog = w >= LAST_WAVE ? BOSS_PROG : PROGRESSIONS[((region | 0) % PROGRESSIONS.length + PROGRESSIONS.length) % PROGRESSIONS.length];
      var bar = Math.floor(beatIdx / 4);
      var pos = ((beatIdx % 4) + 4) % 4;
      var ch = prog[((bar % 4) + 4) % 4];
      var root = ch[0] % 12;
      var i;
      if (pos === 0) {
        // 강박: 낮은 베이스 + 북 (마지막 물결은 톱니 베이스)
        tone('sine', 150, t, 0.14, 0.32, 45);
        if (w >= LAST_WAVE) tone('sawtooth', midiHz(36 + root), t, p * 0.95, 0.13, 0, 520);
        else tone('triangle', midiHz(36 + root), t, p * 0.9, 0.24);
        // 7번째 물결부터: 마디 내내 깔리는 화음
        if (w >= 7) {
          for (i = 0; i < 3; i++) tone('sine', midiHz(60 + root + ch[1][i]), t, p * 3.9, 0.028);
        }
      } else {
        // 약박: 짧은 화음 + 하이햇 (3박째는 조금 세게)
        var cv = pos === 2 ? 0.05 : 0.035;
        for (i = 0; i < 3; i++) tone('triangle', midiHz(60 + root + ch[1][i]), t, Math.min(0.22, p * 0.35), cv);
        hat(t, pos === 2 ? 0.07 : 0.05, 0.045);
      }
      // 4번째 물결부터: 엇박 하이햇과 위쪽 분산화음
      if (w >= 4) {
        hat(t + p / 2, 0.035, 0.03);
        tone('sine', midiHz(72 + root + ch[1][(beatIdx % 3 + 3) % 3]), t + p / 2, Math.min(0.18, p * 0.3), 0.04);
      }
      return true;
    } catch (e) { return false; }
  }
  // 멈춤·고르기·판 끝: 예약된 음을 모두 끊는다
  function musicStop() {
    if (!ctx) { musicNodes = []; return; }
    for (var i = 0; i < musicNodes.length; i++) {
      try { musicNodes[i].n.stop(0); } catch (e) { /* 이미 끝남 */ }
    }
    musicNodes = [];
  }

  function play(name) {
    var s = window.Store ? window.Store.settings : null;
    if (!ctx || !master || !s || !s.sound) return;
    var p = SFX[name];
    if (!p) return;
    var now = ctx.currentTime;
    if (lastPlay[name] && now - lastPlay[name] < 0.04) return;
    lastPlay[name] = now;
    try {
      master.gain.value = s.volume;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = p.type;
      o.frequency.setValueAtTime(p.f, now);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, p.f2), now + p.d);
      g.gain.setValueAtTime(p.v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + p.d);
      o.connect(g);
      g.connect(master);
      o.start(now);
      o.stop(now + p.d + 0.02);
    } catch (e) { /* 소리 실패는 무시 */ }
  }

  function vibrate(ms) {
    var s = window.Store ? window.Store.settings : null;
    if (!s || !s.vibrate) return;
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* 무시 */ } }
  }

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  // 중요한 버튼을 누를 때: 짧은 소리 + 짧은 진동 (둘 다 설정을 따른다)
  function important() {
    play('press');
    vibrate(15);
  }

  window.Sound = {
    play: play, vibrate: vibrate, unlock: unlock, important: important, names: Object.keys(SFX),
    musicBeat: musicBeat, musicStop: musicStop, progressions: PROGRESSIONS.length + 1
  };
})();

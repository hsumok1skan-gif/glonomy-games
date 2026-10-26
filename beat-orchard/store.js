/* Beat Orchard — 저장 (localStorage, 없어도 돈다) */
(function () {
  'use strict';
  var KEY = 'mistOrchard.v1';
  var RUN_KEY = 'mistOrchard.run.v1';

  // lang: 화면 언어 'ko' | 'en' (H-24). 처음에는 한국어, 옵션에서 바꾼다. 예전 저장에는 없어 merge 가 'ko' 로 채운다
  function defaultSettings() {
    return { lang: 'ko', sound: true, volume: 0.7, vibrate: true, reduceMotion: false, shake: true, dmgNums: true, speed: 1, textSize: 'mid',
      beatSound: true, beatWide: false, music: true };
  }
  function regionCount() { return window.GD ? window.GD.REGIONS.length : 5; }
  function diffCount() { return window.GD && window.GD.DIFFICULTIES ? window.GD.DIFFICULTIES.length : 3; }
  // 지역 × 난이도 표
  function grid(v) {
    var g = [];
    for (var i = 0; i < regionCount(); i++) {
      var row = [];
      for (var j = 0; j < diffCount(); j++) row.push(v);
      g.push(row);
    }
    return g;
  }
  function fixGrid(g, v) {
    var out = grid(v);
    if (!Array.isArray(g)) return out;
    for (var i = 0; i < out.length; i++) {
      if (!Array.isArray(g[i])) continue;
      for (var j = 0; j < out[i].length; j++) if (typeof g[i][j] === typeof v) out[i][j] = g[i][j];
    }
    return out;
  }
  function defaultMeta() {
    return {
      silver: 0,
      unlocked: ['hedge', 'frog', 'squirrel'],
      shop: [],
      cleared: [false, false, false, false, false],
      bestWave: [0, 0, 0, 0, 0],
      bestTime: [0, 0, 0, 0, 0],
      diffBest: grid(0),
      diffTime: grid(0),
      diffCleared: grid(false),
      codex: { enemy: [], boss: [], upgrade: [], relic: [] },
      achv: [],
      stats: { runs: 0, wins: 0, losses: 0, kills: 0, bossKills: 0, planted: 0, wavesCleared: 0, perfectWins: 0,
        skillUses: 0, silverTotal: 0, upgradesPicked: 0, maxLaneSeeds: 0, playTime: 0, bestCombo: 0, perfects: 0 },
      lastSquad: null,
      lastRegion: 0,
      lastDiff: 0,
      tutorialDone: false,
      daily: { date: '', played: false, done: false, win: false, waves: 0, kills: 0, time: 0 },
      dailyLog: [],
      // 광고 자리의 '하루 n번' 횟수 (H-26, ads.js Ads.SLOTS). date 가 오늘이 아니면 ads.js 가 0 으로 되돌린다
      adDay: { date: '', revive: 0, double: 0, refill: 0, silver: 0, result: 0 },
      // 전면 광고 빈도 (H-32, ads.js '전면 빈도'): 끝난 판 수(튜토리얼 판 빼고)와 마지막 전면 뒤 끝난 판 수
      adRunCount: 0,
      adSinceAd: 0
    };
  }
  // 예전 저장(난이도 없음)을 보통 난이도 기록으로 옮기고, 깨진 값을 기본값으로 되돌린다
  function normalizeMeta(m) {
    m.diffBest = fixGrid(m.diffBest, 0);
    m.diffTime = fixGrid(m.diffTime, 0);
    m.diffCleared = fixGrid(m.diffCleared, false);
    for (var i = 0; i < regionCount(); i++) {
      if ((m.bestWave[i] || 0) > m.diffBest[i][0]) m.diffBest[i][0] = m.bestWave[i];
      if (m.cleared[i]) m.diffCleared[i][0] = true;
      if (m.bestTime[i] && !m.diffTime[i][0]) m.diffTime[i][0] = m.bestTime[i];
    }
    if (typeof m.lastDiff !== 'number' || m.lastDiff < 0 || m.lastDiff >= diffCount()) m.lastDiff = 0;
    m.dailyLog = m.dailyLog.filter(function (x) { return x && typeof x.date === 'string'; }).slice(-14);
    return m;
  }

  function safeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function safeDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* 저장소 없음 */ } }

  function merge(def, obj) {
    if (!obj || typeof obj !== 'object') return def;
    for (var k in def) {
      if (!Object.prototype.hasOwnProperty.call(def, k) || obj[k] === undefined || obj[k] === null) continue;
      if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) def[k] = merge(def[k], obj[k]);
      else if (Array.isArray(def[k]) && !Array.isArray(obj[k])) continue;
      else if (typeof def[k] !== typeof obj[k] && def[k] !== null) continue;
      else def[k] = obj[k];
    }
    return def;
  }

  var Store = {
    settings: defaultSettings(),
    meta: defaultMeta(),
    load: function () {
      var raw = safeGet(KEY);
      if (!raw) return;
      try {
        var d = JSON.parse(raw);
        this.settings = merge(defaultSettings(), d.settings);
        this.meta = normalizeMeta(merge(defaultMeta(), d.meta));
      } catch (e) {
        this.settings = defaultSettings();
        this.meta = defaultMeta();
      }
    },
    save: function () { safeSet(KEY, JSON.stringify({ settings: this.settings, meta: this.meta })); },
    // 기록만 지우고 설정은 남긴다
    wipe: function () {
      this.meta = defaultMeta();
      safeDel(RUN_KEY);
      this.save();
    },
    // 균형 시험용: 처음 하는 사람처럼 기본 설정·빈 기록으로 (저장소는 건드리지 않는다)
    fresh: function () {
      this.settings = defaultSettings();
      this.meta = defaultMeta();
    },
    saveRun: function (snap) { safeSet(RUN_KEY, JSON.stringify(snap)); },
    loadRun: function () {
      var raw = safeGet(RUN_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    clearRun: function () { safeDel(RUN_KEY); },
    seen: function (kind, id) {
      var a = this.meta.codex[kind];
      if (a && a.indexOf(id) < 0) a.push(id);
    }
  };

  window.Store = Store;
})();

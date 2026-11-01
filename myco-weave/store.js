/* Myco Weave — 저장 (localStorage, 없어도 돈다) */
window.Store = (function () {
  var KEY = 'mycoweave.v1';
  var RUN_KEY = 'mycoweave.run.v1';
  var mem = null;

  function blank() {
    return {
      settings: { sound: true, volume: 2, vibrate: true, shake: true, reduce: false, floats: true, big: false, tutorial: true },
      best: { score: 0, stage: 0, spores: 0 },
      totals: { runs: 0, wins: 0, spores: 0, kills: 0, grown: 0, mush: 0, forests: 0, playSec: 0 },
      history: [],
      daily: { date: '', done: false, score: 0, stage: 0, won: false },
      ach: {},
      seen: { tree: {}, threat: {}, mush: {}, trait: {}, event: {}, strain: { white: 1 } }
    };
  }

  function read(key) {
    try { var s = window.localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function write(key, v) {
    try { window.localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function remove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* 저장소 없음 */ }
  }

  function data() {
    if (mem) return mem;
    var d = read(KEY);
    var b = blank();
    if (!d || typeof d !== 'object') { mem = b; return mem; }
    // 빠진 칸 채우기
    ['settings', 'best', 'totals', 'seen', 'daily'].forEach(function (k) {
      if (!d[k] || typeof d[k] !== 'object') d[k] = b[k];
      Object.keys(b[k]).forEach(function (kk) { if (d[k][kk] === undefined) d[k][kk] = b[k][kk]; });
    });
    if (!Array.isArray(d.history)) d.history = [];
    if (!d.ach || typeof d.ach !== 'object') d.ach = {};
    mem = d;
    return mem;
  }

  function save() { write(KEY, data()); }

  function markSeen(group, id) {
    var d = data();
    if (!d.seen[group]) d.seen[group] = {};
    if (!d.seen[group][id]) { d.seen[group][id] = 1; save(); return true; }
    return false;
  }

  function recordRun(r) {
    var d = data();
    d.totals.runs++;
    if (r.won) d.totals.wins++;
    d.totals.spores += r.spores;
    d.totals.kills += r.kills;
    d.totals.grown += r.grown;
    d.totals.mush += r.mush;
    d.totals.forests += r.cleared;
    d.totals.playSec += Math.round(r.time || 0);
    var newBest = r.score > d.best.score;
    if (newBest) d.best.score = r.score;
    if (r.stage > d.best.stage) d.best.stage = r.stage;
    if (r.spores > d.best.spores) d.best.spores = r.spores;
    d.history.unshift({
      date: new Date().toISOString().slice(0, 10), strain: r.strain, diff: r.diff, stage: r.stage,
      cleared: r.cleared, spores: r.spores, score: r.score, won: r.won, daily: r.daily || ''
    });
    if (r.daily && d.daily.date === r.daily) {
      d.daily.done = true; d.daily.score = r.score; d.daily.stage = r.stage; d.daily.won = r.won;
    }
    if (d.history.length > 20) d.history.length = 20;
    var fresh = [];
    window.DATA.ACHIEVEMENTS.forEach(function (a) {
      var ok = false;
      try { ok = !!a.check(r); } catch (e) { ok = false; }
      if (ok && !d.ach[a.id]) { d.ach[a.id] = new Date().toISOString().slice(0, 10); fresh.push(a); }
    });
    save();
    return { newBest: newBest, fresh: fresh };
  }

  // 오늘의 도전: 그날 판을 시작하면 바로 적어 둔다 (그만두고 다시 시작해도 하루 한 번)
  function dailyPlayed(date) { return data().daily.date === date; }
  function startDaily(date) {
    var d = data();
    if (d.daily.date === date) return false;
    d.daily = { date: date, done: false, score: 0, stage: 0, won: false };
    save();
    return true;
  }

  function wipe() {
    mem = blank();
    save();
    remove(RUN_KEY);
  }

  return {
    data: data,
    save: save,
    settings: function () { return data().settings; },
    setSetting: function (k, v) { data().settings[k] = v; save(); },
    markSeen: markSeen,
    recordRun: recordRun,
    daily: function () { return data().daily; },
    dailyPlayed: dailyPlayed,
    startDaily: startDaily,
    wipe: wipe,
    saveRun: function (obj) { return write(RUN_KEY, obj); },
    loadRun: function () { return read(RUN_KEY); },
    clearRun: function () { remove(RUN_KEY); }
  };
})();

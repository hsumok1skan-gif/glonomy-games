/* Beat Orchard — 오늘의 도전(날짜로 정한 같은 판)과 결과 공유 문구 */
(function () {
  'use strict';
  var GD = window.GD;
  var Store = window.Store;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // 날짜 글자를 32비트 수로 (FNV-1a)
  function hashText(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  // 정원사 고르기에만 쓰는 작은 난수 (판 안의 난수는 game.js 가 씨로 이어 간다)
  function makeRng(seed) {
    var x = seed || 1;
    return function () {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + '분 ' + pad(s) + '초';
  }

  // 그날의 판: 지역·난이도·정원사 셋(앞줄 하나 이상, 뒷줄 하나 이상)·씨
  function info(date) {
    date = date || today();
    var seed = hashText('mist-orchard/' + date);
    var r = makeRng(seed);
    var region = seed % GD.REGIONS.length;
    var diff = (seed >>> 8) % 2; // 보통 또는 어려움
    var fronts = GD.GARDENERS.filter(function (g) { return g.role === 'front'; });
    var backs = GD.GARDENERS.filter(function (g) { return g.role !== 'front'; });
    var squad = [];
    if (fronts.length) squad.push(fronts[Math.floor(r() * fronts.length)].id);
    if (backs.length) squad.push(backs[Math.floor(r() * backs.length)].id);
    var guard = 0;
    while (squad.length < 3 && guard < 50) {
      guard++;
      var g = GD.GARDENERS[Math.floor(r() * GD.GARDENERS.length)];
      if (squad.indexOf(g.id) < 0) squad.push(g.id);
    }
    return { date: date, seed: seed | 0, region: region, diff: diff, squad: squad };
  }
  function canPlay() {
    var d = Store.meta.daily;
    return !(d && d.date === today() && d.played);
  }
  // 시작할 때 바로 표시해 같은 날 두 번 하지 못하게 한다
  function markStarted() {
    var d = Store.meta.daily;
    var t = today();
    d.date = t; d.played = true; d.done = false; d.win = false; d.waves = 0; d.kills = 0; d.time = 0;
    Store.save();
    return t;
  }
  function todayResult() {
    var d = Store.meta.daily;
    return d && d.date === today() && d.played ? d : null;
  }
  function squadNames(ids) {
    return ids.map(function (id) {
      for (var i = 0; i < GD.GARDENERS.length; i++) if (GD.GARDENERS[i].id === id) return GD.GARDENERS[i].emoji + ' ' + GD.GARDENERS[i].name;
      return '';
    }).filter(Boolean);
  }

  // 결과 공유 문구. 물결 막대는 지킨 물결 = 🌳, 남은 물결 = ·
  function shareText(res) {
    var reg = GD.REGIONS[res.region];
    var df = GD.DIFFICULTIES[res.diff] || GD.DIFFICULTIES[0];
    var barTxt = '';
    for (var i = 0; i < GD.WAVES; i++) barTxt += i < res.waves ? '🌳' : '·';
    var lines = [
      'Beat Orchard — ' + (res.daily ? '오늘의 도전 ' + res.daily : '방어 기록'),
      reg.name + ' · ' + df.name + ' · ' + (res.win ? '방어 성공!' : '방어 실패'),
      '웨이브 ' + res.waves + '/' + GD.WAVES + ' ' + barTxt,
      '물리친 안개 ' + res.kills + '마리' + (res.bossKills ? ' (우두머리 ' + res.bossKills + ')' : '') + ' · 심은 씨앗 ' + res.planted + '알',
      '플레이 시간 ' + fmtTime(res.time) + (res.perfect ? ' · 울타리 무피해' : '')
    ];
    return lines.join('\n');
  }
  // 복사가 되면 done(true). 막히면 글 상자에 보여 주고 done(false)
  function copyText(text, box, done) {
    var settled = false;
    function fallback() {
      if (settled) return;
      settled = true;
      if (box) {
        box.value = text;
        box.classList.remove('hidden');
        try { box.focus(); box.select(); } catch (e) { /* 고르기 실패는 무시 */ }
      }
      done(false);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          if (settled) return;
          settled = true;
          if (box) box.classList.add('hidden');
          done(true);
        }, fallback);
        // 권한 창 등으로 답이 없으면 글 상자로
        setTimeout(fallback, 1500);
        return;
      }
    } catch (e) { /* 아래로 */ }
    fallback();
  }

  window.Daily = {
    today: today,
    info: info,
    canPlay: canPlay,
    markStarted: markStarted,
    todayResult: todayResult,
    squadNames: squadNames,
    shareText: shareText,
    copyText: copyText,
    fmtTime: fmtTime
  };
})();

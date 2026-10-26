/* Pace Mark — 계산 (화면과 저장을 모른다) */
(function () {
  'use strict';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  // 정오로 만들어 서머타임·자정 경계에서 날짜가 밀리지 않게 한다
  function fromKey(k) { var p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); }
  function validKey(k) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(k))) return false;
    return toKey(fromKey(k)) === k;
  }
  // new Date(y, m, d + n) 가 월말·윤년을 넘겨 준다
  function addDays(k, n) { var d = fromKey(k); return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12)); }
  function today() { return toKey(new Date()); }
  function weekStart(k) { var d = fromKey(k); var w = (d.getDay() + 6) % 7; return addDays(k, -w); }
  function dayLabel(k) {
    var d = fromKey(k);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + '일월화수목금토'.charAt(d.getDay()) + ')';
  }

  // 초 → "1:02:05" 또는 "1:05"
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
  }
  function fmtShort(sec) {
    sec = Math.round(Math.abs(sec));
    if (sec < 60) return sec + '초';
    var m = Math.floor(sec / 60), s = sec % 60;
    return s ? m + '분 ' + s + '초' : m + '분';
  }
  function fmtDelta(sec) {
    var r = Math.round(sec);
    if (r === 0) return '계획대로';
    return r > 0 ? fmtShort(r) + ' 늦음' : fmtShort(r) + ' 여유';
  }

  function totalCount(tpl) {
    var n = 0;
    (tpl.sections || []).forEach(function (s) { n += s.count; });
    return n;
  }

  /* 계획: 쓸 수 있는 시간 = (제한 시간 − 마킹 여유). 과목마다 배정 분이 모두 있고 합이 넘치지 않으면 그대로,
     아니면 문항 수 비율로 나눈다. targets[i] = (i+1)번째 문항을 끝내야 하는 시각(초, 시작부터) */
  function plan(tpl) {
    var total = tpl.total * 60;
    var usable = Math.max(60, (tpl.total - tpl.reserve) * 60);
    var N = totalCount(tpl);
    var manual = tpl.sections.length > 0 && tpl.sections.every(function (s) { return s.min > 0; });
    var sumMin = 0;
    tpl.sections.forEach(function (s) { sumMin += s.min > 0 ? s.min : 0; });
    if (manual && sumMin * 60 > usable) manual = false;
    var secs = [], targets = [], t = 0, q = 0;
    tpl.sections.forEach(function (s) {
      var time = manual ? s.min * 60 : (N ? usable * s.count / N : 0);
      var per = s.count ? time / s.count : 0;
      for (var k = 0; k < s.count; k++) targets.push(t + per * (k + 1));
      secs.push({ name: s.name, count: s.count, startQ: q, endQ: q + s.count, time: time, per: per, startT: t, endT: t + time });
      t += time;
      q += s.count;
    });
    return { N: N, total: total, usable: usable, reserve: tpl.reserve * 60, manual: manual, secs: secs, targets: targets, slack: usable - t };
  }

  function secOf(p, qi) {
    for (var i = 0; i < p.secs.length; i++) if (qi < p.secs[i].endQ) return i;
    return Math.max(0, p.secs.length - 1);
  }

  /* 지금 페이스(초). 양수 = 늦음, 음수 = 여유.
     마지막으로 끝낸 문항이 목표보다 얼마나 늦었는지와, 지금 푸는 문항이 이미 목표를 넘겼는지 중 큰 쪽 */
  function liveDelta(p, laps, elapsed) {
    var done = laps.length;
    var last = done > 0 ? laps[done - 1].at / 1000 - p.targets[done - 1] : -Infinity;
    if (done >= p.N) return last === -Infinity ? 0 : last;
    return Math.max(last, elapsed - p.targets[done]);
  }

  // 지금 시각까지 끝냈어야 할 문항 수
  function expectedDone(p, elapsed) {
    var n = 0;
    while (n < p.N && p.targets[n] <= elapsed + 0.0001) n++;
    return n;
  }

  /* 한 회 정리: 과목마다 계획·실제·문항당 평균·정답 */
  function summary(session) {
    var p = plan(session);
    var secs = p.secs.map(function (s) {
      return { name: s.name, count: s.count, plan: s.time, per: s.per, used: 0, done: 0, skipped: 0, o: 0, x: 0, g: 0, flags: 0 };
    });
    (session.laps || []).forEach(function (l) {
      var s = secs[l.sec];
      if (!s) return;
      s.used += l.t / 1000;
      if (l.skip) s.skipped++; else s.done++;
      if (l.flag) s.flags++;
    });
    var grade = session.grade || [];
    var o = 0, x = 0, g = 0, graded = 0;
    for (var i = 0; i < p.N; i++) {
      var v = grade[i];
      var s2 = secs[secOf(p, i)];
      if (v === 'o') { o++; s2.o++; } else if (v === 'x') { x++; s2.x++; } else if (v === 'g') { g++; s2.g++; }
      if (v === 'o' || v === 'x' || v === 'g') graded++;
    }
    secs.forEach(function (s) {
      s.avg = s.done ? s.used / s.done : 0;
      s.diff = s.used - s.plan;
      s.acc = (s.o + s.x + s.g) ? Math.round((s.o + s.g) / s.count * 100) : null;
    });
    var done = 0, flags = 0;
    (session.laps || []).forEach(function (l) { if (!l.skip) done++; if (l.flag) flags++; });
    var elapsed = (session.elapsed || 0) / 1000;
    var lastDelta = session.laps && session.laps.length ? session.laps[session.laps.length - 1].at / 1000 - p.targets[session.laps.length - 1] : 0;
    return {
      plan: p, secs: secs, N: p.N, done: done, flags: flags, elapsed: elapsed, lastDelta: lastDelta,
      o: o, x: x, g: g, graded: graded,
      acc: graded ? Math.round((o + g) / p.N * 100) : null,
      sure: graded ? Math.round(o / p.N * 100) : null
    };
  }

  // 오래 걸린 문항 n개 (넘긴 문항 빼고)
  function slowest(session, n) {
    var p = plan(session);
    return (session.laps || []).filter(function (l) { return !l.skip; })
      .map(function (l) { return { q: l.q, sec: l.sec, t: l.t / 1000, ratio: p.secs[l.sec] && p.secs[l.sec].per ? (l.t / 1000) / p.secs[l.sec].per : 0, flag: !!l.flag }; })
      .sort(function (a, b) { return b.t - a.t || a.q - b.q; })
      .slice(0, n);
  }

  /* 다음 회 제안 규칙: 맞는 규칙 이름과 과목 이름을 돌려준다 */
  function adviceRules(session, prev) {
    var sm = summary(session), p = sm.plan, out = [];
    var unfinished = sm.done + countSkips(session) < p.N || sm.done < p.N && session.ended === 'time';
    if (unfinished) out.push({ rule: 'unfinished' });
    var worst = null;
    sm.secs.forEach(function (s) {
      if (s.done && s.plan > 0 && s.used > s.plan * 1.2 && (!worst || s.used / s.plan > worst.r)) worst = { name: s.name, r: s.used / s.plan };
    });
    if (worst) out.push({ rule: 'secOver', sec: worst.name });
    var lastS = sm.secs[sm.secs.length - 1];
    if (sm.secs.length > 1 && lastS && lastS.done >= Math.min(5, lastS.count) && lastS.per > 0 && lastS.avg < lastS.per * 0.7) out.push({ rule: 'rushEnd', sec: lastS.name });
    if (sm.flags >= 5) out.push({ rule: 'manyFlags' });
    if (sm.graded && sm.g / p.N >= 0.1) out.push({ rule: 'guessy' });
    var sl = slowest(session, 5);
    if (sl.length && sl[0].ratio >= 3) out.push({ rule: 'stuck' });
    if (sm.graded) {
      var wrong = 0;
      sl.forEach(function (it) { if ((session.grade || [])[it.q - 1] === 'x') wrong++; });
      if (wrong >= 3) out.push({ rule: 'slowWrong' });
    }
    if (!unfinished && sm.done === p.N && sm.lastDelta <= -p.usable * 0.05) out.push({ rule: 'fast' });
    if (prev && prev.laps && prev.laps.length && !unfinished) {
      var pe = (prev.elapsed || 0) / 1000;
      if (pe - sm.elapsed >= 30) out.push({ rule: 'improved' });
      else if (sm.elapsed - pe >= 30) out.push({ rule: 'slower' });
    }
    if (sm.acc !== null && sm.acc >= 90) out.push({ rule: 'accurate' });
    if (sm.acc !== null && sm.acc < 60) out.push({ rule: 'lowAcc' });
    return out;
  }
  function countSkips(session) {
    var n = 0;
    (session.laps || []).forEach(function (l) { if (l.skip) n++; });
    return n;
  }

  // 규칙 → 제안 글 (회차 번호로 두 가지 중 하나)
  function advice(session, prev, strategies, seq) {
    return adviceRules(session, prev).map(function (r, i) {
      var list = strategies.filter(function (s) { return s.rule === r.rule; });
      var pick = list[((seq || 0) + i) % list.length] || list[0];
      var name = r.sec || '';
      return { rule: r.rule, title: fillSec(pick.title, name), text: fillSec(pick.text, name) };
    });
  }
  function fillSec(text, name) {
    return text.replace(/\{sec(이|을|은|과)?\}/g, function (_, j) { return j ? name + josa(name, j) : name; });
  }

  // 받침에 맞는 조사: josa('국어', '이') → '가', josa('한국사', '을') → '를', josa('독해 (7부)', '은') → '는'
  var JOSA = { '이': ['이', '가'], '을': ['을', '를'], '은': ['은', '는'], '과': ['과', '와'] };
  var DIGIT_BATCHIM = [true, true, false, true, false, false, true, true, true, false]; // 영 일 이 삼 사 오 육 칠 팔 구
  function josa(name, j) {
    var pair = JOSA[j] || [j, j];
    var s = String(name || '').replace(/[\s)\]」』·.,]+$/, '');
    var ch = s.charAt(s.length - 1);
    var c = ch.charCodeAt(0);
    var has;
    if (c >= 0xAC00 && c <= 0xD7A3) has = (c - 0xAC00) % 28 !== 0;
    else if (ch >= '0' && ch <= '9') has = DIGIT_BATCHIM[+ch];
    else has = false;
    return has ? pair[0] : pair[1];
  }

  // 오늘까지(오늘 안 풀었으면 어제까지) 이어서 푼 날 수
  function streak(sessions, todayK) {
    var days = {};
    sessions.forEach(function (s) { days[s.date] = true; });
    var k = days[todayK] ? todayK : addDays(todayK, -1);
    var n = 0;
    while (days[k]) { n++; k = addDays(k, -1); }
    return n;
  }

  // "3, 7, 12-14" → [3,7,12,13,14] (1~N 밖이면 오류)
  function parseNums(text, N) {
    var out = [], bad = [];
    String(text).split(/[,\s]+/).forEach(function (part) {
      if (!part) return;
      var m = /^(\d+)(?:-(\d+))?$/.exec(part);
      if (!m) { bad.push(part); return; }
      var a = +m[1], b = m[2] ? +m[2] : a;
      if (a > b) { var t = a; a = b; b = t; }
      if (a < 1 || b > N || b - a > 300) { bad.push(part); return; }
      for (var i = a; i <= b; i++) if (out.indexOf(i) < 0) out.push(i);
    });
    return { nums: out.sort(function (x, y) { return x - y; }), bad: bad };
  }

  /* 틀 검사: 고칠 점 목록(빈 배열이면 통과) */
  function checkTemplate(t) {
    var errs = [];
    if (!t.name || !String(t.name).trim()) errs.push({ f: 'name', m: '틀 이름을 적어 주세요.' });
    else if (String(t.name).length > 30) errs.push({ f: 'name', m: '틀 이름은 30자까지예요.' });
    if (!(t.total >= 5 && t.total <= 300)) errs.push({ f: 'total', m: '제한 시간은 5~300분이에요.' });
    if (!(t.reserve >= 0 && t.reserve <= 30)) errs.push({ f: 'reserve', m: '마킹 여유는 0~30분이에요.' });
    else if (t.total >= 5 && t.reserve >= t.total) errs.push({ f: 'reserve', m: '마킹 여유가 제한 시간보다 짧아야 해요.' });
    if (!t.sections || !t.sections.length) errs.push({ f: 'rows', m: '과목을 하나 넘게 넣어 주세요.' });
    else if (t.sections.length > 12) errs.push({ f: 'rows', m: '과목은 12개까지예요.' });
    var n = 0, sumMin = 0, someMin = false, allMin = true;
    (t.sections || []).forEach(function (s, i) {
      if (!s.name || !String(s.name).trim()) errs.push({ f: 'row', i: i, m: (i + 1) + '번째 과목 이름이 비었어요.' });
      else if (String(s.name).length > 20) errs.push({ f: 'row', i: i, m: (i + 1) + '번째 과목 이름은 20자까지예요.' });
      if (!(s.count >= 1 && s.count <= 200 && Math.floor(s.count) === s.count)) errs.push({ f: 'row', i: i, m: (i + 1) + '번째 과목 문항 수는 1~200이에요.' });
      if (!(s.min >= 0 && s.min <= 300)) errs.push({ f: 'row', i: i, m: (i + 1) + '번째 과목 배정 분은 0~300이에요.' });
      if (s.min > 0) someMin = true; else allMin = false;
      n += s.count || 0;
      sumMin += s.min > 0 ? s.min : 0;
    });
    if (n > 300) errs.push({ f: 'rows', m: '전체 문항은 300개까지예요. 지금 ' + n + '개예요.' });
    if (someMin && !allMin) errs.push({ f: 'rows', m: '배정 분은 모든 과목에 넣거나 모두 비워 두세요.' });
    if (allMin && someMin && sumMin > t.total - t.reserve) errs.push({ f: 'rows', m: '배정 분 합(' + sumMin + '분)이 쓸 수 있는 시간(' + (t.total - t.reserve) + '분)보다 많아요.' });
    return errs;
  }

  /* 계산 점검 — 기획서 `계산 예시` 와 같은 값 */
  function selfTest() {
    var out = [];
    function eq(name, got, want) { out.push({ name: name, ok: got === want, got: got, want: want }); }
    var g9 = { total: 100, reserve: 5, sections: [{ name: 'a', count: 20, min: 0 }, { name: 'b', count: 20, min: 0 }, { name: 'c', count: 20, min: 0 }, { name: 'd', count: 20, min: 0 }, { name: 'e', count: 20, min: 0 }] };
    var p1 = plan(g9);
    eq('9급 100분·마킹 5분·100문항 → 문항당 초', Math.round(p1.secs[0].per), 57);
    eq('9급 40번 끝낼 목표 시각', fmt(p1.targets[39]), '38:00');
    var p2 = plan({ total: 80, reserve: 10, sections: [{ name: 'h', count: 50, min: 0 }] });
    eq('한국사 80분·마킹 10분·50문항 → 25번 목표', fmt(p2.targets[24]), '35:00');
    var p3 = plan({ total: 100, reserve: 5, sections: [{ name: 'a', count: 100, min: 0 }] });
    var laps = [{ at: 60000 }, { at: 110000 }, { at: 180000 }];
    eq('문항 60·50·70초 (목표 57초) → 페이스', Math.round(liveDelta(p3, laps, 180)), 9);
    eq('페이스 9초 → 화면 글', fmtDelta(9), '9초 늦음');
    var p4 = plan({ total: 75, reserve: 0, sections: [{ name: '5', count: 30, min: 11 }, { name: '6', count: 16, min: 9 }, { name: '7', count: 54, min: 55 }] });
    eq('읽기 11·9·55분 → 독해 첫 문항 목표(초)', Math.round(p4.targets[46]), 1261);
    eq('3,725초 → 시:분:초', fmt(3725), '1:02:05');
    var sm = summary({ total: 10, reserve: 0, sections: [{ name: 'a', count: 3, min: 0 }], laps: [{ q: 1, sec: 0, t: 30000, at: 30000 }, { q: 2, sec: 0, t: 40000, at: 70000 }, { q: 3, sec: 0, t: 50000, at: 120000 }], elapsed: 120000, grade: ['o', 'x', 'g'] });
    eq('문항 30·40·50초 → 과목 평균 초', Math.round(sm.secs[0].avg), 40);
    var gr = []; for (var i = 0; i < 10; i++) gr.push(i < 7 ? 'o' : i < 8 ? 'g' : 'x');
    var sm2 = summary({ total: 20, reserve: 0, sections: [{ name: 'a', count: 10, min: 0 }], laps: [], elapsed: 0, grade: gr });
    eq('맞음 7·찍어서 맞음 1·틀림 2 → 정답률', sm2.acc, 80);
    eq('같은 경우 확실히 맞음', sm2.sure, 70);
    eq('2026-02-30은 없는 날', validKey('2026-02-30'), false);
    eq('2028-02-28 다음 날 (윤년)', addDays('2028-02-28', 1), '2028-02-29');
    eq('2026-12-31 다음 날', addDays('2026-12-31', 1), '2027-01-01');
    eq('10-24·25·26에 풀고 오늘 10-26 → 연속', streak([{ date: '2026-10-24' }, { date: '2026-10-25' }, { date: '2026-10-26' }], '2026-10-26'), 3);
    eq('"3, 7, 12-14" 읽기', parseNums('3, 7, 12-14', 20).nums.join(','), '3,7,12,13,14');
    eq('과목 이름 뒤 조사 (국어가·한국사를·헌법이·독해 (7부)는)', josa('국어', '이') + josa('한국사', '을') + josa('헌법', '이') + josa('독해 (7부)', '은'), '가를이는');
    return out;
  }

  window.Logic = {
    pad: pad, toKey: toKey, fromKey: fromKey, validKey: validKey, addDays: addDays, today: today, weekStart: weekStart, dayLabel: dayLabel,
    fmt: fmt, fmtShort: fmtShort, fmtDelta: fmtDelta, totalCount: totalCount, plan: plan, secOf: secOf,
    liveDelta: liveDelta, expectedDone: expectedDone, summary: summary, slowest: slowest,
    adviceRules: adviceRules, advice: advice, josa: josa, streak: streak, parseNums: parseNums, checkTemplate: checkTemplate, selfTest: selfTest
  };
})();

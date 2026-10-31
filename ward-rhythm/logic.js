/* Ward Rhythm — 계산 (근무 시각·잘 시간·위험·약속 판정·달 요약)
   날짜는 'YYYY-MM-DD' 글자, 시각은 기기 현지 시각의 ms 로 계산한다. */
var Logic = (function () {
  var DAY = 86400000, HOUR = 3600000, MIN = 60000;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  /* new Date(y, m, d + n) 가 월말·윤년·연말을 넘겨 준다 */
  function addDays(s, n) { var d = parse(s); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
  function today() { return ymd(new Date()); }
  function hm(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fmtHM(min) { min = ((Math.round(min) % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function at(date, hmStr) { var d = parse(date); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, hm(hmStr)).getTime(); }
  function clock(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dateOf(ms) { return ymd(new Date(ms)); }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / DAY); }
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parse(s)) === s; }
  function validHM(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s)); }
  function dow(s) { return parse(s).getDay(); }
  function monthDays(y, m) { return new Date(y, m, 0).getDate(); }
  function monthKey(y, m) { return y + '-' + pad(m); }
  function dur(mins) {
    mins = Math.max(0, Math.round(mins));
    var h = Math.floor(mins / 60), m = mins % 60;
    if (!h) return m + '분';
    return h + '시간' + (m ? ' ' + m + '분' : '');
  }
  function overlap(a1, a2, b1, b2) { return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1)); }
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  function md(s) { var d = parse(s); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + DOW[d.getDay()] + ')'; }

  function typeById(st, id) {
    for (var i = 0; i < st.shifts.length; i++) if (st.shifts[i].id === id) return st.shifts[i];
    return null;
  }
  function shiftOf(st, date) { var id = st.roster[date]; return id ? typeById(st, id) : null; }
  /* 근무 하나의 시작·끝 ms. 끝이 시작보다 이르면 다음 날로 넘긴다(자정 넘김) */
  function span(st, date) {
    var t = shiftOf(st, date);
    if (!t || !t.work) return null;
    var s = at(date, t.start), e = at(date, t.end);
    if (e <= s) e = at(addDays(date, 1), t.end);
    return { date: date, t: t, s: s, e: e };
  }
  function hours(sp) { return (sp.e - sp.s) / HOUR; }

  /* 그날 아침(또는 그날 근무 전)에 끝나는 큰 잠 + 나이트 전 낮잠 */
  function sleepFor(st, date) {
    var set = st.set, need = set.needSleep * 60 * MIN;
    var sp = span(st, date), p1 = span(st, addDays(date, -1)), p2 = span(st, addDays(date, -2));
    var lastEnd = null;
    [p2, p1].forEach(function (p) { if (p && (lastEnd === null || p.e > lastEnd)) lastEnd = p.e; });
    var wakeLimit = sp ? sp.s - (set.prep + set.commute) * MIN : Infinity;
    var bed, wake, kind;
    var dayStart = at(date, '00:00');
    if (p1 && p1.e > dayStart && p1.e < at(date, '14:00')) {
      /* 지난밤 근무(나이트)가 오늘 아침 끝남 → 낮잠이 큰 잠 */
      kind = 'day';
      bed = p1.e + (set.commute + 30) * MIN;
      wake = Math.min(bed + need, wakeLimit);
    } else {
      kind = 'main';
      wake = Math.min(at(date, set.offWake), wakeLimit);
      bed = wake - need;
      if (lastEnd !== null && bed < lastEnd + (set.commute + 30) * MIN) bed = lastEnd + (set.commute + 30) * MIN;
    }
    var mins = Math.max(0, (wake - bed) / MIN);
    var nap = null;
    if (sp && sp.t.id === 'N' && kind === 'main') {
      var ne = sp.s - (set.prep + set.commute) * MIN;
      nap = { s: ne - 120 * MIN, e: ne };
    }
    return { date: date, kind: kind, bed: bed, wake: wake, mins: mins, need: set.needSleep * 60, short: mins < set.needSleep * 60 - 30, nap: nap };
  }

  /* 위험 찾기 — from~to 사이 날에 걸린 것만 돌려준다 (앞 7일은 이어짐 계산용) */
  function risks(st, from, to) {
    var set = st.set, out = [];
    var prev = null, nightRun = 0, streak = 0, pendingNightEnd = null;
    for (var d = addDays(from, -7); d <= to; d = addDays(d, 1)) {
      var sp = span(st, d), inR = d >= from, pushedRest = false;
      if (sp) {
        streak++;
        if (prev) {
          var rest = (sp.s - prev.e) / HOUR;
          if (rest < 0) { if (inR) out.push({ date: d, type: 'overlap', hours: rest }); pushedRest = true; }
          else if (rest < set.minRest) { if (inR) out.push({ date: d, type: 'quick', hours: rest }); pushedRest = true; }
        }
        if (sp.t.id === 'N') {
          nightRun++;
          if (nightRun === set.maxNights + 1 && inR) out.push({ date: d, type: 'nights', count: nightRun });
          pendingNightEnd = sp.e;
        } else {
          if (pendingNightEnd !== null && !pushedRest) {
            var gap = (sp.s - pendingNightEnd) / HOUR;
            if (gap < 48 && inR) out.push({ date: d, type: 'recover', hours: gap });
          }
          pendingNightEnd = null;
          nightRun = 0;
        }
        if (streak === set.maxStreak + 1 && inR) out.push({ date: d, type: 'streak', count: streak });
        prev = sp;
      } else {
        streak = 0;
        nightRun = 0;
      }
      if (inR && (sp || shiftOf(st, addDays(d, -1)))) {
        var sl = sleepFor(st, d);
        if (sl.short && (sp || span(st, addDays(d, -1)))) out.push({ date: d, type: 'short', mins: sl.mins });
      }
    }
    return out;
  }
  function risksByDate(list) {
    var m = {};
    list.forEach(function (r) { (m[r.date] = m[r.date] || []).push(r); });
    return m;
  }
  function riskInfo(id) {
    for (var i = 0; i < DATA.RISKS.length; i++) if (DATA.RISKS[i].id === id) return DATA.RISKS[i];
    return DATA.RISKS[0];
  }
  function riskText(r) {
    if (r.type === 'overlap') return '앞 근무와 ' + dur(-r.hours * 60) + ' 겹쳐요';
    if (r.type === 'quick') return '근무 사이 ' + dur(r.hours * 60) + '만 쉬어요';
    if (r.type === 'nights') return '나이트 ' + r.count + '번째 연속';
    if (r.type === 'recover') return '나이트 끝나고 ' + dur(r.hours * 60) + ' 만에 근무';
    if (r.type === 'streak') return r.count + '일째 연속 근무';
    if (r.type === 'short') return '잘 수 있는 시간 ' + dur(r.mins);
    return '';
  }

  /* 약속 판정 — 근무(통근 포함)와 겹치면 무리, 잘 시간을 90분 넘게 깎으면 무리, 조금 깎거나 낮잠을 깎으면 빠듯 */
  function planCheck(st, date, startHM, durMin) {
    var set = st.set;
    var ps = at(date, startHM) - set.travel * MIN;
    var pe = at(date, startHM) + (durMin + set.travel) * MIN;
    for (var i = -1; i <= 1; i++) {
      var sp = span(st, addDays(date, i));
      if (!sp) continue;
      var ov = overlap(ps, pe, sp.s - set.commute * MIN, sp.e + set.commute * MIN);
      if (ov > 0) return { level: 'bad', lost: 0, why: sp.t.name + ' 근무(' + clock(sp.s) + '~' + clock(sp.e) + ')와 오가는 시간까지 ' + dur(ov / MIN) + ' 겹쳐요' };
    }
    var lost = 0, napLost = 0;
    [date, addDays(date, 1)].forEach(function (d) {
      var sl = sleepFor(st, d);
      if (sl.mins > 0) lost += overlap(ps, pe, sl.bed, sl.wake) / MIN;
      if (sl.nap) napLost += overlap(ps, pe, sl.nap.s, sl.nap.e) / MIN;
    });
    if (lost > 90) return { level: 'bad', lost: lost, why: '잘 시간이 ' + dur(lost) + ' 줄어요' };
    if (lost > 0) return { level: 'tight', lost: lost, why: '잘 시간이 ' + dur(lost) + ' 줄어요' };
    if (napLost > 0) return { level: 'tight', lost: 0, why: '나이트 전 낮잠을 ' + dur(napLost) + ' 못 자요' };
    var after = span(st, addDays(date, -1));
    var why = '근무·잘 시간과 겹치지 않아요';
    if (after && after.t.id === 'N') why = '나이트 끝난 날이지만 잘 시간과 겹치지 않아요';
    return { level: 'ok', lost: 0, why: why };
  }
  var LEVEL_NAME = { ok: '괜찮음', tight: '빠듯', bad: '무리' };

  /* 다음 쉬는 날 */
  function nextOff(st, from) {
    for (var i = 0; i < 62; i++) {
      var d = addDays(from, i), t = shiftOf(st, d);
      if (t && !t.work) return { date: d, days: i };
    }
    return null;
  }
  /* 그 시각에 일하는 중인 근무 */
  function workingAt(st, ms) {
    var d = dateOf(ms);
    for (var i = -1; i <= 0; i++) {
      var sp = span(st, addDays(d, i));
      if (sp && ms >= sp.s && ms < sp.e) return sp;
    }
    return null;
  }
  /* 다음 근무 시작 */
  function nextWork(st, ms) {
    var d = dateOf(ms);
    for (var i = -1; i < 40; i++) {
      var sp = span(st, addDays(d, i));
      if (sp && sp.s > ms) return sp;
    }
    return null;
  }

  /* 밤(22~06시)에 걸친 시간 */
  function nightHours(sp) {
    var t = 0;
    for (var i = -1; i <= 1; i++) {
      var d = addDays(sp.date, i);
      t += overlap(sp.s, sp.e, at(d, '22:00'), at(addDays(d, 1), '06:00'));
    }
    return t / HOUR;
  }

  /* 잠 기록 하나의 길이(분) — 일어난 시각이 누운 시각보다 이르면 자정을 넘긴 것 */
  function sleepMins(bed, wake) {
    var b = hm(bed), w = hm(wake);
    if (w <= b) w += 1440;
    return w - b;
  }

  /* 달 요약 */
  function monthStats(st, y, m) {
    var n = monthDays(y, m), first = monthKey(y, m) + '-01', last = monthKey(y, m) + '-' + pad(n);
    var counts = {}, hoursSum = 0, nightSum = 0, weekendOff = 0, weekendDays = 0, filled = 0, longest = 0, run = 0;
    var chipCount = {};
    for (var i = 0; i < n; i++) {
      var d = addDays(first, i), t = shiftOf(st, d), w = dow(d);
      if (w === 0 || w === 6) weekendDays++;
      if (t) {
        filled++;
        counts[t.id] = (counts[t.id] || 0) + 1;
        if (t.work) {
          var sp = span(st, d);
          hoursSum += hours(sp);
          nightSum += nightHours(sp);
          run++;
          if (run > longest) longest = run;
        } else {
          run = 0;
          if (w === 0 || w === 6) weekendOff++;
        }
      } else run = 0;
      var note = st.notes[d];
      if (note && note.chips) note.chips.forEach(function (c) { chipCount[c] = (chipCount[c] || 0) + 1; });
    }
    var rs = risks(st, first, last), riskCount = {};
    rs.forEach(function (r) { riskCount[r.type] = (riskCount[r.type] || 0) + 1; });
    var sl = st.sleeps.filter(function (s) { return s.date >= first && s.date <= last; });
    var total = 0, debt = 0, need = st.set.needSleep * 60, qSum = 0, qN = 0;
    sl.forEach(function (s) {
      var mm = sleepMins(s.bed, s.wake);
      total += mm;
      debt += Math.max(0, need - mm);
      if (s.q) { qSum += s.q; qN++; }
    });
    return {
      first: first, last: last, days: n, filled: filled, counts: counts, hours: hoursSum, night: nightSum,
      weekendOff: weekendOff, weekendDays: weekendDays, longest: longest, risks: rs, riskCount: riskCount,
      sleepN: sl.length, sleepAvg: sl.length ? total / sl.length : 0, debt: debt, qAvg: qN ? qSum / qN : 0, chips: chipCount
    };
  }

  /* 쉬는 날 글 */
  function shareText(st, y, m) {
    var n = monthDays(y, m), first = monthKey(y, m) + '-01';
    var offs = [], evenings = [], weekends = [];
    for (var i = 0; i < n; i++) {
      var d = addDays(first, i), t = shiftOf(st, d);
      if (t && !t.work) {
        offs.push(md(d));
        if (dow(d) === 0 || dow(d) === 6) weekends.push(md(d));
      }
      if (t && planCheck(st, d, '19:00', 120).level === 'ok') evenings.push(md(d));
    }
    var lines = [y + '년 ' + m + '월 내 근무'];
    lines.push('쉬는 날: ' + (offs.length ? offs.join(', ') : '아직 없음'));
    lines.push('주말에 쉬는 날: ' + (weekends.length ? weekends.join(', ') : '없음'));
    lines.push('저녁 7시 약속 괜찮은 날: ' + (evenings.length ? evenings.join(', ') : '없음'));
    lines.push('(근무가 바뀌면 다시 알려 줄게요)');
    return lines.join('\n');
  }

  function checkNum(v, min, max, name) {
    if (v === '' || v === null || v === undefined) return name + '을(를) 넣어 주세요';
    var n = Number(v);
    if (!isFinite(n)) return name + '은(는) 숫자로 넣어 주세요';
    if (n < min || n > max) return name + '은(는) ' + min + '~' + max + ' 사이로 넣어 주세요';
    return '';
  }
  function checkText(v, max, name, need) {
    v = String(v || '').trim();
    if (need && !v) return name + '을(를) 넣어 주세요';
    if (v.length > max) return name + '은(는) ' + max + '자까지예요 (지금 ' + v.length + '자)';
    return '';
  }

  function countContent() {
    return DATA.SHIFT_TYPES.length + DATA.PATTERNS.length + DATA.PLAN_KINDS.length + DATA.RISKS.length +
      DATA.SLEEP_Q.length + DATA.SLEEP_CHIPS.length + DATA.DAY_CHIPS.length + DATA.STEPS.length + DATA.TIPS.length;
  }

  /* 자체 점검 — 기획서 `계산 예시` 와 같은 값인지 */
  function selfTest() {
    function mk(roster) {
      return { shifts: JSON.parse(JSON.stringify(DATA.SHIFT_TYPES)), roster: roster, notes: {}, plans: [], sleeps: [], set: JSON.parse(JSON.stringify(DATA.DEFAULT_SET)) };
    }
    var out = [];
    function eq(name, got, want) { out.push({ name: name, ok: String(got) === String(want), got: got, want: want }); }
    /* 예시 1: 나이트 22:30~07:30 은 다음 날 아침에 끝나고 9시간 */
    var a = mk({ '2026-10-31': 'N' }), sa = span(a, '2026-10-31');
    eq('예시1 나이트 끝 날짜', dateOf(sa.e), '2026-11-01');
    eq('예시1 나이트 끝 시각', clock(sa.e), '07:30');
    eq('예시1 나이트 길이(시간)', hours(sa), 9);
    /* 예시 2: 이브닝(14:30~23:00) 뒤 데이(07:00) → 8시간, 퀵리턴 */
    var b = mk({ '2026-11-01': 'E', '2026-11-02': 'D' });
    var rb = risks(b, '2026-11-01', '2026-11-02').filter(function (r) { return r.type === 'quick'; });
    eq('예시2 퀵리턴 날짜', rb.length ? rb[0].date : '-', '2026-11-02');
    eq('예시2 쉬는 시간', rb.length ? rb[0].hours : '-', 8);
    /* 예시 3: 데이 07:00, 준비 60분·통근 40분, 잠 7시간 → 05:20 기상, 전날 22:20 취침 */
    var c = mk({ '2026-11-02': 'OFF', '2026-11-03': 'D' }), sc = sleepFor(c, '2026-11-03');
    eq('예시3 일어날 시각', clock(sc.wake), '05:20');
    eq('예시3 누울 시각', clock(sc.bed), '22:20');
    eq('예시3 누울 날짜', dateOf(sc.bed), '2026-11-02');
    /* 예시 4: 같은 근무표에서 11-02 약속 판정 (오가는 시간 30분) */
    eq('예시4 19:00 2시간', planCheck(c, '2026-11-02', '19:00', 120).level, 'ok');
    var p2 = planCheck(c, '2026-11-02', '21:00', 120);
    eq('예시4 21:00 2시간', p2.level + ' ' + p2.lost, 'tight 70');
    eq('예시4 22:00 2시간', planCheck(c, '2026-11-02', '22:00', 120).level, 'bad');
    /* 예시 5: 나이트 넷 연속(한도 3) → 넷째 날 연속 나이트 */
    var e = mk({ '2026-11-10': 'N', '2026-11-11': 'N', '2026-11-12': 'N', '2026-11-13': 'N' });
    var re = risks(e, '2026-11-10', '2026-11-13').filter(function (r) { return r.type === 'nights'; });
    eq('예시5 연속 나이트 날짜', re.length ? re[0].date : '-', '2026-11-13');
    /* 예시 6: 나이트 뒤 낮잠 — 07:30 끝, 통근 40분 + 30분 → 08:40 눕기, 15:40 일어남 */
    var f = mk({ '2026-11-10': 'N', '2026-11-11': 'OFF' }), sf = sleepFor(f, '2026-11-11');
    eq('예시6 나이트 뒤 잠 종류', sf.kind, 'day');
    eq('예시6 나이트 뒤 누울 시각', clock(sf.bed), '08:40');
    eq('예시6 나이트 뒤 일어날 시각', clock(sf.wake), '15:40');
    /* 예시 7: 잠 기록 23:40 → 06:10 은 6시간 30분 */
    eq('예시7 잠 길이(분)', sleepMins('23:40', '06:10'), 390);
    /* 예시 8: 나이트(22:30~07:30)의 밤 시간(22~06시) = 7.5시간 */
    eq('예시8 밤 시간', nightHours(sa), 7.5);
    /* 날짜: 월말·윤년·연말·2월 30일 */
    eq('월말 넘김', addDays('2026-10-31', 1), '2026-11-01');
    eq('윤년 2월 29일', addDays('2028-02-28', 1), '2028-02-29');
    eq('평년 3월 1일', addDays('2026-02-28', 1), '2026-03-01');
    eq('연말 넘김', addDays('2026-12-31', 1), '2027-01-01');
    eq('2월 30일 거름', validDate('2026-02-30'), false);
    eq('2028년 2월 날 수', monthDays(2028, 2), 29);
    eq('기본 내용 수', countContent() >= 150, true);
    return out;
  }

  return {
    pad: pad, ymd: ymd, parse: parse, addDays: addDays, today: today, hm: hm, fmtHM: fmtHM, at: at, clock: clock,
    dateOf: dateOf, diffDays: diffDays, validDate: validDate, validHM: validHM, dow: dow, monthDays: monthDays,
    monthKey: monthKey, dur: dur, md: md, DOW: DOW, typeById: typeById, shiftOf: shiftOf, span: span, hours: hours,
    sleepFor: sleepFor, risks: risks, risksByDate: risksByDate, riskInfo: riskInfo, riskText: riskText,
    planCheck: planCheck, LEVEL_NAME: LEVEL_NAME, nextOff: nextOff, workingAt: workingAt, nextWork: nextWork,
    nightHours: nightHours, sleepMins: sleepMins, monthStats: monthStats, shareText: shareText,
    checkNum: checkNum, checkText: checkText, countContent: countContent, selfTest: selfTest
  };
})();

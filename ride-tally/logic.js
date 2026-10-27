/* Ride Tally 계산 — 날짜, 운행 정산(공제·기름값·고정비), 시간당 실수입, 요일×시간대 지도, 정비, 요약, 한 줄 평, 점검 */
(function () {
  'use strict';

  var HOUR = 3600000;
  var DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

  // ---------- 날짜 (기기 현지 날짜) ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toKey(d) {
    if (typeof d === 'number') d = new Date(d);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function fromKey(k) {
    var p = String(k).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0); // 정오 기준이라 서머타임·자정 경계에 흔들리지 않음
  }
  function validKey(k) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(k))) return false;
    var d = fromKey(k);
    return toKey(d) === k;
  }
  function addDays(k, n) {
    var d = fromKey(k);
    return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12));
  }
  function weekdayIdx(t) { // 월=0 … 일=6
    var d = typeof t === 'string' ? fromKey(t) : new Date(t);
    return (d.getDay() + 6) % 7;
  }
  function weekStart(k) { return addDays(k, -weekdayIdx(k)); }
  function monthStart(k) { return k.slice(0, 8) + '01'; }
  function monthEnd(k) {
    var d = fromKey(monthStart(k));
    return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
  }
  function dayLabel(k) {
    var d = fromKey(k);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' (' + DAY_NAMES[weekdayIdx(k)] + ')';
  }

  // ---------- 숫자·시간 글 ----------
  function won(n) {
    n = Math.round(n || 0);
    var s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (n < 0 ? '−' : '') + s + '원';
  }
  function num(n) { return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtDur(ms) {
    var m = Math.max(0, Math.round(ms / 60000));
    var h = Math.floor(m / 60);
    m = m % 60;
    if (h === 0) return m + '분';
    return h + '시간 ' + pad(m) + '분';
  }
  function fmtClock(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    return h + ':' + pad(m) + ':' + pad(s % 60);
  }
  function hhmm(t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  // 받침에 맞는 조사 ('을'/'를', '이'/'가', '은'/'는', '과'/'와')
  function josa(word, j) {
    var s = String(word).replace(/[\s)\]]+$/, '');
    var c = s.charCodeAt(s.length - 1);
    var has;
    if (c >= 0xAC00 && c <= 0xD7A3) has = (c - 0xAC00) % 28 !== 0;
    else if (/[0-9]$/.test(s)) has = '013678'.indexOf(s.slice(-1)) >= 0;
    else has = false;
    var pairs = { '을': ['을', '를'], '이': ['이', '가'], '은': ['은', '는'], '과': ['과', '와'] };
    var p = pairs[j] || [j, j];
    return word + (has ? p[0] : p[1]);
  }

  // ---------- 운행 시간 ----------
  function breakOverlap(breaks, a, b, now) {
    var sum = 0;
    (breaks || []).forEach(function (br) {
      var s = br.s, e = br.e == null ? (now || Date.now()) : br.e;
      var lo = Math.max(a, s), hi = Math.min(b, e);
      if (hi > lo) sum += hi - lo;
    });
    return sum;
  }
  function workMs(startMs, endMs, breaks) {
    if (!(endMs > startMs)) return 0;
    return Math.max(0, endMs - startMs - breakOverlap(breaks, startMs, endMs, endMs));
  }
  function breakMs(startMs, endMs, breaks) { return breakOverlap(breaks, startMs, endMs, endMs); }

  // ---------- 비용 ----------
  function fixedMonthly(fixed) {
    return (fixed || []).reduce(function (a, f) { return a + (+f.monthly || 0); }, 0);
  }
  // 고정비 시간당 몫 = 월 고정비 ÷ (한 달 일하는 날 × 하루 일하는 시간)
  function fixedPerHour(settings, fixed) {
    var days = Math.max(1, +settings.workDays || 25);
    var hours = Math.max(1, +settings.dayHours || 8);
    return fixedMonthly(fixed) / (days * hours);
  }
  function fuelCost(km, settings) {
    km = Math.max(0, +km || 0);
    if (settings.costMode === 'perKm') return km * (+settings.perKm || 0);
    var kpl = +settings.kmPerL || 0;
    if (kpl <= 0) return 0;
    return km / kpl * (+settings.fuelPrice || 0);
  }
  function platformOf(ctx, pid) {
    var list = ctx.platforms || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === pid) return list[i];
    return { id: pid, name: '지운 곳', cut: 0, perCall: 0, color: 5 };
  }
  function callCut(c, ctx) {
    var p = platformOf(ctx, c.pid);
    return c.amt * (+p.cut || 0) / 100 + (+p.perCall || 0);
  }

  // 한 운행의 정산. sh = {startMs, endMs, breaks, km, calls}
  function calcShift(sh, ctx) {
    var calls = sh.calls || [];
    var gross = 0, cut = 0;
    calls.forEach(function (c) { gross += c.amt; cut += callCut(c, ctx); });
    var ms = workMs(sh.startMs, sh.endMs, sh.breaks);
    var hours = ms / HOUR;
    var fuel = fuelCost(sh.km, ctx.settings);
    var fixed = fixedPerHour(ctx.settings, ctx.fixed) * hours;
    var net = gross - cut - fuel - fixed;
    return {
      gross: gross, cut: cut, fuel: fuel, fixed: fixed, net: net,
      ms: ms, hours: hours, calls: calls.length,
      perHour: hours > 0 ? net / hours : 0,
      brk: breakMs(sh.startMs, sh.endMs, sh.breaks)
    };
  }

  // 지난 운행의 평균 시간당 주행 거리 (운행 중 기름값 어림에 쓴다)
  function avgKmPerHour(shifts) {
    var km = 0, h = 0;
    (shifts || []).forEach(function (s) {
      if (s.km > 0) { km += s.km; h += workMs(s.startMs, s.endMs, s.breaks) / HOUR; }
    });
    return h > 0.5 ? km / h : 18;
  }

  // 운행 중 — 기름값은 지금까지 시간 × 평균 시간당 거리로 어림
  function liveRide(ride, now, ctx, kmPerHour) {
    var sh = { startMs: ride.startMs, endMs: now, breaks: ride.breaks, calls: ride.calls, km: 0 };
    var r = calcShift(sh, ctx);
    var estKm = r.hours * kmPerHour;
    var fuel = fuelCost(estKm, ctx.settings);
    r.fuel = fuel;
    r.estKm = estKm;
    r.net = r.gross - r.cut - fuel - r.fixed;
    r.perHour = r.hours > 0 ? r.net / r.hours : 0;
    r.onBreak = (ride.breaks || []).some(function (b) { return b.e == null; });
    return r;
  }

  // 목표까지 남은 금액과, 이 시간당 실수입이면 몇 분 더 타야 하는지
  function goalLeft(goal, net, perHour) {
    var left = Math.max(0, goal - net);
    var minutes = left <= 0 ? 0 : (perHour > 0 ? Math.round(left / perHour * 60) : null);
    return { left: left, minutes: minutes, ratio: goal > 0 ? Math.max(0, Math.min(1, net / goal)) : 0 };
  }

  // ---------- 요일×시간대 지도 ----------
  // 각 운행의 실수입을 콜 금액 비율로(콜이 없으면 시간 비율로) 칸에 나눠 담고, 일한 시간도 칸마다 센다.
  function heat(shifts, ctx) {
    var cells = [];
    for (var d = 0; d < 7; d++) { cells.push([]); for (var h = 0; h < 24; h++) cells[d].push({ hours: 0, net: 0, gross: 0, calls: 0 }); }
    (shifts || []).forEach(function (sh) {
      var r = calcShift(sh, ctx);
      if (r.ms <= 0) return;
      // 일한 시간 칸마다
      var t = sh.startMs, segs = [];
      while (t < sh.endMs) {
        var nx = new Date(t); nx.setMinutes(60, 0, 0);
        var e = Math.min(nx.getTime(), sh.endMs);
        var w = (e - t) - breakOverlap(sh.breaks, t, e, sh.endMs);
        if (w > 0) {
          var dt = new Date(t);
          segs.push({ d: (dt.getDay() + 6) % 7, h: dt.getHours(), w: w });
        }
        t = e;
      }
      segs.forEach(function (s) { cells[s.d][s.h].hours += s.w / HOUR; });
      if (r.gross > 0) {
        var k = r.net / r.gross;
        (sh.calls || []).forEach(function (c) {
          var cd = new Date(c.at);
          var cell = cells[(cd.getDay() + 6) % 7][cd.getHours()];
          cell.net += c.amt * k; cell.gross += c.amt; cell.calls++;
        });
      } else {
        segs.forEach(function (s) { cells[s.d][s.h].net += r.net * (s.w / r.ms); });
      }
    });
    return cells;
  }
  function cellPerHour(c) { return c.hours >= 0.05 ? c.net / c.hours : null; }
  // 칸 색 단계 0(기록 없음)·−1(손해)·1~5
  function heatLevel(v, max) {
    if (v == null) return 0;
    if (v < 0) return -1;
    if (max <= 0) return 1;
    return Math.max(1, Math.min(5, Math.ceil(v / max * 5)));
  }

  // ---------- 정비 ----------
  function maintStatus(item, rec, odo, today) {
    var interval = rec && rec.km != null ? rec.km : item.km;
    var days = rec && rec.days != null ? rec.days : item.days;
    var out = { interval: interval, days: days, ratio: 0, due: false, known: false, text: '' };
    if (interval > 0) {
      if (!rec || rec.lastKm == null || !(odo > 0)) { out.text = '한 번 했어요를 누르면 세기 시작해요'; return out; }
      var used = Math.max(0, odo - rec.lastKm);
      out.known = true; out.used = used; out.left = interval - used;
      out.ratio = Math.min(1.5, used / interval);
      out.due = used >= interval * 0.9;
      out.text = out.left > 0 ? num(used) + 'km 탐 · ' + num(out.left) + 'km 남음' : num(-out.left) + 'km 넘김';
      return out;
    }
    if (days > 0) {
      if (!rec || !rec.lastDate || !validKey(rec.lastDate)) { out.text = '한 번 했어요를 누르면 세기 시작해요'; return out; }
      var passed = Math.round((fromKey(today) - fromKey(rec.lastDate)) / 86400000);
      out.known = true; out.used = passed; out.left = days - passed;
      out.ratio = Math.min(1.5, passed / days);
      out.due = passed >= days * 0.9;
      out.text = out.left > 0 ? passed + '일 지남 · ' + out.left + '일 남음' : (-out.left) + '일 넘김';
    }
    return out;
  }

  // ---------- 요약 ----------
  function inRange(k, a, b) { return (!a || k >= a) && (!b || k <= b); }
  function summarize(shifts, ctx, from, to) {
    var t = { gross: 0, cut: 0, fuel: 0, fixed: 0, net: 0, hours: 0, calls: 0, km: 0, shifts: 0, days: {}, byP: {}, best: null };
    (shifts || []).forEach(function (sh) {
      if (!inRange(sh.date, from, to)) return;
      var r = calcShift(sh, ctx);
      t.gross += r.gross; t.cut += r.cut; t.fuel += r.fuel; t.fixed += r.fixed; t.net += r.net;
      t.hours += r.hours; t.calls += r.calls; t.km += +sh.km || 0; t.shifts++;
      var dd = t.days[sh.date] || (t.days[sh.date] = { net: 0, hours: 0, gross: 0 });
      dd.net += r.net; dd.hours += r.hours; dd.gross += r.gross;
      (sh.calls || []).forEach(function (c) {
        var b = t.byP[c.pid] || (t.byP[c.pid] = { gross: 0, calls: 0, cut: 0 });
        b.gross += c.amt; b.calls++; b.cut += callCut(c, ctx);
      });
      if (r.hours >= 0.25 && (!t.best || r.perHour > t.best.perHour)) t.best = { id: sh.id, perHour: r.perHour, date: sh.date };
    });
    t.perHour = t.hours > 0 ? t.net / t.hours : 0;
    return t;
  }
  function sumExpenses(expenses, from, to) {
    var by = {}, total = 0;
    (expenses || []).forEach(function (e) {
      if (!inRange(e.date, from, to)) return;
      by[e.cat] = (by[e.cat] || 0) + e.amt; total += e.amt;
    });
    return { by: by, total: total };
  }
  // 연비 맞추기: 한 달 실제 기름 지출과 운행 기록으로 어림한 기름값 비교
  function fuelCheck(expenses, shifts, ctx, monthKey) {
    var a = monthStart(monthKey), b = monthEnd(monthKey);
    var actual = sumExpenses(expenses, a, b).by.fuel || 0;
    var est = 0, km = 0;
    (shifts || []).forEach(function (s) { if (inRange(s.date, a, b)) { est += fuelCost(s.km, ctx.settings); km += +s.km || 0; } });
    var out = { actual: actual, est: est, km: km, suggestKmPerL: null, gap: actual - est };
    if (actual > 0 && km > 0 && ctx.settings.costMode !== 'perKm' && ctx.settings.fuelPrice > 0) {
      out.suggestKmPerL = Math.round(km / (actual / ctx.settings.fuelPrice) * 10) / 10;
    }
    return out;
  }

  // 지난 운행 평균 시간당 실수입 (이번 운행 빼고)
  function avgPerHour(shifts, ctx, exceptId) {
    var net = 0, h = 0;
    (shifts || []).forEach(function (s) {
      if (s.id === exceptId) return;
      var r = calcShift(s, ctx); net += r.net; h += r.hours;
    });
    return h > 0.5 ? net / h : null;
  }

  // 자주 받는 금액 (콜 찍기 칩)
  function topAmounts(shifts, ride, n) {
    var cnt = {};
    var add = function (c) { cnt[c.amt] = (cnt[c.amt] || 0) + 1; };
    (shifts || []).slice(-30).forEach(function (s) { (s.calls || []).forEach(add); });
    if (ride) (ride.calls || []).forEach(add);
    var list = Object.keys(cnt).map(function (k) { return { amt: +k, n: cnt[k] }; });
    list.sort(function (a, b) { return b.n - a.n || a.amt - b.amt; });
    var out = list.slice(0, n).map(function (x) { return x.amt; });
    var base = [3000, 3500, 4000, 4500, 5000, 6000];
    for (var i = 0; out.length < n && i < base.length; i++) if (out.indexOf(base[i]) < 0) out.push(base[i]);
    return out.sort(function (a, b) { return a - b; });
  }

  // ---------- 한 줄 평 ----------
  function commentRules(r, sh, ctx, shifts, goal, dayNet) {
    var rules = [];
    var avg = avgPerHour(shifts, ctx, sh.id);
    var others = (shifts || []).filter(function (s) { return s.id !== sh.id; });
    if (goal > 0 && dayNet >= goal) rules.push('goalHit');
    else if (goal > 0 && dayNet >= goal * 0.8) rules.push('goalNear');
    if (!others.length) rules.push('first');
    else {
      var best = others.every(function (s) { var x = calcShift(s, ctx); return x.hours < 0.25 || x.perHour < r.perHour; });
      if (best && r.hours >= 0.25) rules.push('best');
      else if (avg != null && r.perHour > avg * 1.1) rules.push('aboveAvg');
      else if (avg != null && r.perHour < avg * 0.9) rules.push('belowAvg');
    }
    if (r.brk > 45 * 60000) rules.push('longBreak');
    var tags = {};
    (sh.calls || []).forEach(function (c) { (c.tags || []).forEach(function (t) { tags[t] = 1; }); });
    if (tags.rain || tags.snow) rules.push('rain');
    var endH = new Date(sh.endMs).getHours();
    if (tags.night || endH >= 23 || endH < 5) rules.push('night');
    var cph = r.hours > 0 ? r.calls / r.hours : 0;
    if (r.hours >= 1 && cph < 1.2) rules.push('fewCalls');
    if (cph >= 3) rules.push('manyCalls');
    if (r.hours < 1) rules.push('short');
    if (r.hours >= 6) rules.push('long');
    if (r.gross > 0 && r.fuel / r.gross > 0.12) rules.push('highFuel');
    if (r.hours >= 0.5 && r.perHour < 5000) rules.push('lowPer');
    if (weekdayIdx(sh.date) >= 5) rules.push('weekend');
    return { rules: rules, avg: avg };
  }
  function comment(r, sh, ctx, shifts, goal, dayNet, comments) {
    var cr = commentRules(r, sh, ctx, shifts, goal, dayNet);
    var seed = (sh.startMs || 0) / 60000 | 0;
    var vars = {
      per: won(r.perHour), goal: won(goal), left: won(Math.max(0, goal - dayNet)),
      diff: cr.avg == null ? '' : won(Math.abs(r.perHour - cr.avg)),
      calls: (r.hours > 0 ? Math.round(r.calls / r.hours * 10) / 10 : 0),
      fuelPct: r.gross > 0 ? Math.round(r.fuel / r.gross * 100) : 0
    };
    return cr.rules.slice(0, 3).map(function (rule, i) {
      var pool = comments.filter(function (c) { return c.rule === rule; });
      if (!pool.length) return null;
      var t = pool[(seed + i) % pool.length].text;
      return { rule: rule, text: t.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) };
    }).filter(Boolean);
  }

  // ---------- 입력 검사 ----------
  function checkAmount(v) {
    if (v === '' || v == null || isNaN(+v)) return '금액을 넣어 주세요';
    v = +v;
    if (v <= 0) return '0원보다 커야 해요';
    if (v > 300000) return '한 건에 30만 원까지 넣을 수 있어요';
    if (Math.round(v) !== v) return '원 단위로 넣어 주세요';
    return '';
  }
  function checkKm(v, max) {
    if (v === '' || v == null) return '';
    if (isNaN(+v) || +v < 0) return '0 이상 숫자로 넣어 주세요';
    if (+v > (max || 1000)) return '한 번 운행에 ' + num(max || 1000) + 'km까지 넣을 수 있어요';
    return '';
  }
  function checkName(v, maxLen) {
    v = String(v || '').trim();
    if (!v) return '이름을 넣어 주세요';
    if (v.length > maxLen) return maxLen + '자까지 넣을 수 있어요';
    return '';
  }
  function checkRange(v, lo, hi, label) {
    if (v === '' || v == null || isNaN(+v)) return josa(label, '을') + ' 숫자로 넣어 주세요';
    if (+v < lo || +v > hi) return josa(label, '은') + ' ' + num(lo) + '~' + num(hi) + ' 사이로 넣어 주세요';
    return '';
  }

  var _id = 0;
  function uid(p) { _id++; return (p || 'x') + Date.now().toString(36) + _id.toString(36); }

  // ---------- 자체 점검 (기획서 계산 예시) ----------
  function selfTest() {
    var out = [];
    function eq(name, got, want) { out.push({ name: name, ok: got === want, got: got, want: want }); }
    var settings = { costMode: 'fuel', kmPerL: 40, fuelPrice: 1700, workDays: 25, dayHours: 8 };
    var ctx = { settings: settings, fixed: [{ monthly: 300000 }], platforms: [{ id: 'a', cut: 3.3, perCall: 0 }] };
    var s0 = new Date(2026, 9, 27, 10, 0).getTime();
    var calls = [];
    for (var i = 0; i < 10; i++) calls.push({ at: s0 + (i + 1) * 20 * 60000, amt: 4000, pid: 'a' });
    var sh = { startMs: s0, endMs: s0 + 4 * HOUR, breaks: [], km: 60, calls: calls, date: '2026-10-27' };
    var r = calcShift(sh, ctx);
    eq('공제 3.3% (콜 10건 4만 원)', Math.round(r.cut), 1320);
    eq('기름값 60km · 40km/L · 1,700원', Math.round(r.fuel), 2550);
    eq('고정비 시간당 몫 (월 30만 · 25일 · 8시간)', Math.round(fixedPerHour(settings, ctx.fixed)), 1500);
    eq('4시간 운행 실수입', Math.round(r.net), 30130);
    eq('시간당 실수입', Math.round(r.perHour), 7533);
    var g = goalLeft(150000, r.net, r.perHour);
    eq('목표 15만 원까지 남은 시간 (분)', g.minutes, 955);
    var shB = { startMs: s0, endMs: s0 + 4 * HOUR, breaks: [{ s: s0 + HOUR, e: s0 + HOUR + 30 * 60000 }], km: 0, calls: [] };
    eq('쉰 30분 빼고 일한 시간', fmtDur(workMs(shB.startMs, shB.endMs, shB.breaks)), '3시간 30분');
    var t18 = new Date(2026, 9, 27, 18, 0).getTime();
    var shH = { startMs: t18, endMs: t18 + 2 * HOUR, breaks: [], km: 0, calls: [{ at: t18 + 70 * 60000, amt: 10000, pid: 'z' }, { at: t18 + 100 * 60000, amt: 10000, pid: 'z' }] };
    var ctx0 = { settings: { costMode: 'perKm', perKm: 0, workDays: 25, dayHours: 8 }, fixed: [], platforms: [] };
    var cells = heat([shH], ctx0);
    eq('지도 화요일 18시 칸 시간당', cellPerHour(cells[1][18]), 0);
    eq('지도 화요일 19시 칸 시간당', cellPerHour(cells[1][19]), 20000);
    eq('2026-10-27 요일', DAY_NAMES[weekdayIdx('2026-10-27')], '화');
    var ms = maintStatus({ key: 'oil', km: 3000, days: 0 }, { lastKm: 12400 }, 15100, '2026-10-27');
    eq('엔진오일 12,400km에 갈고 지금 15,100km', ms.text, '2,700km 탐 · 300km 남음');
    eq('2026-02-30 은 없는 날', validKey('2026-02-30'), false);
    eq('2028-02-28 다음 날 (윤년)', addDays('2028-02-28', 1), '2028-02-29');
    eq('2026-12-31 다음 날', addDays('2026-12-31', 1), '2027-01-01');
    var n22 = new Date(2026, 9, 27, 22, 0).getTime();
    eq('밤 10시~새벽 2시 운행 (자정 넘김)', fmtDur(workMs(n22, n22 + 4 * HOUR, [])), '4시간 00분');
    eq('건당 공제 500원 + 2% (콜 1만 원)', Math.round(callCut({ amt: 10000, pid: 'b' }, { platforms: [{ id: 'b', cut: 2, perCall: 500 }] })), 700);
    eq('조사 (엔진오일을·브레이크를)', josa('엔진오일', '을') + josa('브레이크', '을'), '엔진오일을브레이크를');
    eq('기본 내용 개수', D().VEHICLES.length + D().PLATFORMS.length + D().EXPENSE_CATS.length + D().MAINT.length + D().TAGS.length + D().TIPS.length + D().COMMENTS.length + D().HELP_STEPS.length, 157);
    return out;
  }
  function D() { return window.RT_DATA || { VEHICLES: [], PLATFORMS: [], EXPENSE_CATS: [], MAINT: [], TAGS: [], TIPS: [], COMMENTS: [], HELP_STEPS: [] }; }

  window.Logic = {
    HOUR: HOUR, DAY_NAMES: DAY_NAMES,
    pad: pad, toKey: toKey, fromKey: fromKey, validKey: validKey, addDays: addDays, weekdayIdx: weekdayIdx,
    weekStart: weekStart, monthStart: monthStart, monthEnd: monthEnd, dayLabel: dayLabel,
    won: won, num: num, fmtDur: fmtDur, fmtClock: fmtClock, hhmm: hhmm, josa: josa,
    workMs: workMs, breakMs: breakMs, fixedMonthly: fixedMonthly, fixedPerHour: fixedPerHour, fuelCost: fuelCost,
    platformOf: platformOf, callCut: callCut, calcShift: calcShift, avgKmPerHour: avgKmPerHour, liveRide: liveRide,
    goalLeft: goalLeft, heat: heat, cellPerHour: cellPerHour, heatLevel: heatLevel, maintStatus: maintStatus,
    summarize: summarize, sumExpenses: sumExpenses, fuelCheck: fuelCheck, avgPerHour: avgPerHour, topAmounts: topAmounts,
    commentRules: commentRules, comment: comment,
    checkAmount: checkAmount, checkKm: checkKm, checkName: checkName, checkRange: checkRange,
    uid: uid, selfTest: selfTest
  };
})();

// 한끼 계산기 — 날짜·챌린지·집밥 한 끼 평균 계산 (화면과 상관없는 함수만 둔다)
// H-16: 재료 단가·수율·메뉴 원가 계산은 뺐다.
var Calc = (function () {
  'use strict';

  // 날짜: 기기 현지 날짜(YYYY-MM-DD)로 센다
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parts(s) { var p = String(s).split('-'); return [+p[0], +p[1], +p[2]]; }
  // 윤년·월말: 다음 달 0일 = 이 달 마지막 날
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
  function isDay(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    var p = parts(s);
    return p[1] >= 1 && p[1] <= 12 && p[2] >= 1 && p[2] <= daysInMonth(p[0], p[1]);
  }
  // UTC 로 세어 서머타임 같은 시각 차이에 흔들리지 않는다
  function daysBetween(a, b) {
    var x = parts(a), y = parts(b);
    return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
  }
  function addDays(s, n) {
    var p = parts(s);
    return today(new Date(p[0], p[1] - 1, p[2] + n));
  }
  // n달 뒤 같은 날(그 달이 짧으면 마지막 날)
  function addMonthsDay(s, n) {
    var p = parts(s);
    var first = new Date(p[0], p[1] - 1 + n, 1);
    var y = first.getFullYear(), m = first.getMonth() + 1;
    return today(new Date(y, m - 1, Math.min(p[2], daysInMonth(y, m))));
  }
  function shortDay(s) { var p = parts(s); return p[1] + '월 ' + p[2] + '일'; }

  // ---------- 식비 챌린지 ----------
  // 시작일에서 n달 뒤의 전날이 마지막 날. 31일에 시작했는데 그 달이 짧으면 그 달 마지막 날로 맞춘다.
  function challengeEnd(start, months) { return addDays(addMonthsDay(start, months), -1); }
  function periodDays(start, end) { return daysBetween(start, end) + 1; }
  // 지금까지 날 수만큼 고르게 썼다면 쓴 돈
  function expectedSpend(budget, start, end, day) {
    var total = periodDays(start, end);
    var passed = Math.max(0, Math.min(total, daysBetween(start, day) + 1));
    return Math.round(budget * passed / total);
  }
  // 남은 돈을 오늘을 포함한 남은 날로 나눈 하루 쓸 수 있는 돈(원 아래 버림)
  function perDayLeft(budget, spent, start, end, day) {
    var total = periodDays(start, end);
    var passed = Math.max(0, Math.min(total, daysBetween(start, day)));
    var daysLeft = total - passed;
    var left = budget - spent;
    if (daysLeft <= 0 || left <= 0) return 0;
    return Math.floor(left / daysLeft);
  }
  // 챌린지 하나의 지금 상태. pace: good 여유 · mid 조금 빠름 · bad 넘음
  function challengeState(budget, spent, start, end, day) {
    var total = periodDays(start, end);
    var passedDays = Math.max(0, Math.min(total, daysBetween(start, day) + 1));
    var expected = expectedSpend(budget, start, end, day);
    var pace = spent > budget ? 'bad' : spent > expected ? 'mid' : 'good';
    return {
      total: total, passed: passedDays, daysLeft: Math.max(0, total - Math.max(0, daysBetween(start, day))),
      left: budget - spent, perDay: perDayLeft(budget, spent, start, end, day), expected: expected,
      ahead: Math.max(0, spent - expected),
      usedPct: budget > 0 ? spent / budget * 100 : 0, timePct: passedDays / total * 100, pace: pace,
      ended: daysBetween(end, day) > 0, upcoming: daysBetween(start, day) < 0
    };
  }
  function inPeriod(day, start, end) { return day >= start && day <= end; }

  // ---------- 집밥 한 끼 평균 (H-16 '잘 먹겠습니다') ----------
  // 한 끼 평균 = 장보기 합계 ÷ 집밥 횟수 (원 아래 반올림). 집밥이 0번이면 null
  function mealAvg(shopTotal, meals) {
    return meals > 0 ? Math.round(shopTotal / meals) : null;
  }
  // 배달·외식 한 번 평균. 기록이 없으면 null
  function outAvg(outTotal, outCount) {
    return outCount > 0 ? Math.round(outTotal / outCount) : null;
  }
  // 집밥이 한 끼에 싼 돈과 아낀 돈 = (배달·외식 평균 − 한 끼 평균) × 집밥 횟수. 견줄 수 없으면 null
  function mealSaving(shopTotal, meals, outTotal, outCount) {
    var a = mealAvg(shopTotal, meals), o = outAvg(outTotal, outCount);
    if (a == null || o == null) return null;
    return { perMeal: o - a, saved: (o - a) * meals, mealAvg: a, outAvg: o };
  }

  // 계산 예시 — 기획서 `계산 예시` 와 같은 값이다. 화면에는 보이지 않고 판정·점검 때 selfTest() 로 본다.
  var EXAMPLES = [
    { name: '한 달 챌린지 2026-11-01 시작 → 마지막 날', want: 20261130,
      run: function () { return +challengeEnd('2026-11-01', 1).replace(/-/g, ''); } },
    { name: '한 달 챌린지 2028-01-31 시작 → 마지막 날 (윤년 2월)', want: 20280228,
      run: function () { return +challengeEnd('2028-01-31', 1).replace(/-/g, ''); } },
    { name: '두 달 챌린지 2026-11-01 시작 → 날 수', want: 61,
      run: function () { return periodDays('2026-11-01', challengeEnd('2026-11-01', 2)); } },
    { name: '10만원 · 30일 중 12일째 · 45,000원 씀 → 하루 쓸 수 있는 돈', want: 2894,
      run: function () { return perDayLeft(100000, 45000, '2026-11-01', '2026-11-30', '2026-11-12'); } },
    { name: '30만원 · 61일 중 30일째 → 고르게 썼다면 쓴 돈', want: 147541,
      run: function () { return expectedSpend(300000, '2026-11-01', '2026-12-31', '2026-11-30'); } },
    { name: '장보기 42,200원 · 집밥 9번 → 한 끼 평균', want: 4689,
      run: function () { return mealAvg(42200, 9); } },
    { name: '배달·외식 3번 34,000원 · 장보기 42,200원 · 집밥 9번 → 한 끼에 싼 돈', want: 6644,
      run: function () { return mealSaving(42200, 9, 34000, 3).perMeal; } },
    { name: '같은 값 → 아낀 돈 (6,644 × 9)', want: 59796,
      run: function () { return mealSaving(42200, 9, 34000, 3).saved; } },
    { name: '2028년 2월의 날 수 (윤년)', want: 29,
      run: function () { return daysInMonth(2028, 2); } },
    { name: '2027-01-31 에서 2027-03-01 까지 날 수', want: 29,
      run: function () { return daysBetween('2027-01-31', '2027-03-01'); } },
    { name: '2026-12-31 다음 날의 달', want: 202701,
      run: function () { var d = addDays('2026-12-31', 1); return +(d.slice(0, 4) + d.slice(5, 7)); } }
  ];
  function selfTest() {
    return EXAMPLES.map(function (e) {
      var got;
      try { got = e.run(); } catch (err) { got = NaN; }
      return { name: e.name, want: e.want, got: got, ok: typeof got === 'number' && Math.abs(got - e.want) < 1e-6 };
    });
  }

  return {
    today: today, daysInMonth: daysInMonth, isDay: isDay, daysBetween: daysBetween, addDays: addDays,
    addMonthsDay: addMonthsDay, shortDay: shortDay,
    challengeEnd: challengeEnd, periodDays: periodDays, expectedSpend: expectedSpend, perDayLeft: perDayLeft,
    challengeState: challengeState, inPeriod: inPeriod,
    mealAvg: mealAvg, outAvg: outAvg, mealSaving: mealSaving, selfTest: selfTest
  };
})();

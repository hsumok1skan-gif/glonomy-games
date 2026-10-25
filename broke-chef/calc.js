// 한끼 계산기 — 단위·한 끼 값·날짜·챌린지 계산 (화면과 상관없는 함수만 둔다)
var Calc = (function () {
  'use strict';

  var UNITS = {
    g: { dim: 'w', f: 1 },
    kg: { dim: 'w', f: 1000 },
    ml: { dim: 'v', f: 1 },
    L: { dim: 'v', f: 1000 },
    '개': { dim: 'c', f: 1 }
  };
  var UNIT_KEYS = ['g', 'kg', 'ml', 'L', '개'];

  function dimOf(u) { return UNITS[u] ? UNITS[u].dim : null; }
  function isUnit(u) { return !!UNITS[u]; }
  // 같은 종류(무게·부피·개수)의 단위만
  function unitsFor(u) {
    var d = dimOf(u);
    if (!d) return UNIT_KEYS.slice();
    return UNIT_KEYS.filter(function (k) { return UNITS[k].dim === d; });
  }
  // 메뉴 한 줄의 기본 단위: kg 로 산 것은 g, L 로 산 것은 ml 로 적는다
  function lineUnitFor(buyUnit) {
    if (buyUnit === 'kg') return 'g';
    if (buyUnit === 'L') return 'ml';
    return isUnit(buyUnit) ? buyUnit : 'g';
  }
  function toBase(qty, u) { return UNITS[u] ? qty * UNITS[u].f : NaN; }

  function hasPrice(ing) {
    return !!ing && typeof ing.price === 'number' && ing.price > 0 && ing.buyQty > 0 && isUnit(ing.buyUnit);
  }
  // 기본 단위(g·ml·개) 하나의 값
  function unitPrice(ing) {
    if (!hasPrice(ing)) return null;
    return ing.price / toBase(ing.buyQty, ing.buyUnit);
  }
  function unitPriceOf(price, qty, unit) {
    if (!(price > 0) || !(qty > 0) || !isUnit(unit)) return null;
    return price / toBase(qty, unit);
  }

  // 메뉴 한 줄의 원가. 손질 뒤 남는 비율(수율)만큼 더 사야 하므로 나눈다.
  function lineCost(line, ing) {
    if (!ing) return { cost: 0, missing: true };
    if (dimOf(line.unit) !== dimOf(ing.buyUnit)) return { cost: 0, missing: true, badUnit: true };
    var up = unitPrice(ing);
    if (up == null) return { cost: 0, missing: true };
    var y = ing.yieldPct > 0 && ing.yieldPct <= 100 ? ing.yieldPct : 100;
    return { cost: up * toBase(line.qty, line.unit) / (y / 100), missing: false };
  }

  // findIng(id) 로 재료를 찾는다. 미리보기 때는 바뀐 재료를 돌려주는 함수를 넘긴다.
  function menuCost(menu, findIng) {
    var total = 0, missing = 0, parts = [];
    (menu.lines || []).forEach(function (l) {
      var ing = findIng(l.ingId);
      var r = lineCost(l, ing);
      if (r.missing) missing++;
      total += r.cost;
      parts.push({ line: l, ing: ing, cost: r.cost, missing: r.missing });
    });
    var extra = menu.extra > 0 ? menu.extra : 0;
    total += extra;
    return { cost: total, extra: extra, missing: missing, parts: parts };
  }

  // 집밥 한 끼 값이 사 먹는 값의 몇 % 인지
  function costRate(cost, outPrice) {
    return outPrice > 0 ? cost / outPrice * 100 : null;
  }
  // 사 먹지 않고 해 먹어서 아낀 돈
  function savedOf(cost, outPrice) {
    return outPrice > 0 ? outPrice - cost : null;
  }
  function level(rate, s) {
    if (rate == null) return 'none';
    if (rate >= s.warn) return 'bad';
    if (rate > s.target) return 'mid';
    return 'good';
  }
  function changePct(oldUp, newUp) {
    if (!(oldUp > 0) || newUp == null) return null;
    return (newUp - oldUp) / oldUp * 100;
  }

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
  function monthOf(s) { return String(s).slice(0, 7); }
  function addMonths(key, n) {
    var p = key.split('-');
    var d = new Date(+p[0], +p[1] - 1 + n, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }
  function monthLabel(key) { var p = key.split('-'); return p[0] + '년 ' + (+p[1]) + '월'; }
  function shortDay(s) { var p = parts(s); return p[1] + '월 ' + p[2] + '일'; }

  // ---------- 식비 챌린지 ----------
  // 시작일에서 n달 뒤의 전날이 마지막 날. 31일에 시작했는데 그 달이 짧으면 그 달 마지막 날로 맞춘다.
  function challengeEnd(start, months) {
    var p = parts(start);
    var first = new Date(p[0], p[1] - 1 + months, 1);
    var y = first.getFullYear(), m = first.getMonth() + 1;
    var d = Math.min(p[2], daysInMonth(y, m));
    return addDays(today(new Date(y, m - 1, d)), -1);
  }
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
  // 챌린지 하나의 지금 상태
  function challengeState(budget, spent, start, end, day) {
    var total = periodDays(start, end);
    var passedDays = Math.max(0, Math.min(total, daysBetween(start, day) + 1));
    var expected = expectedSpend(budget, start, end, day);
    var pace = spent > budget ? 'bad' : spent > expected ? 'mid' : 'good';
    return {
      total: total, passed: passedDays, daysLeft: Math.max(0, total - Math.max(0, daysBetween(start, day))),
      left: budget - spent, perDay: perDayLeft(budget, spent, start, end, day), expected: expected,
      usedPct: budget > 0 ? spent / budget * 100 : 0, timePct: passedDays / total * 100, pace: pace,
      ended: daysBetween(end, day) > 0, upcoming: daysBetween(start, day) < 0
    };
  }
  function inPeriod(day, start, end) { return day >= start && day <= end; }

  // 계산 예시 — 기획서 `계산 예시` 와 같은 값이어야 한다. 설정 화면 `계산 점검` 에 결과가 나온다.
  var EXAMPLES = [
    { name: '밀가루 1kg 2,000원에서 200g 쓰기', want: 400,
      run: function () { return lineCost({ qty: 200, unit: 'g' }, { price: 2000, buyQty: 1, buyUnit: 'kg', yieldPct: 100 }).cost; } },
    { name: '한 끼 값 3,000원 · 사 먹으면 10,000원 → 사 먹는 값의 %', want: 30,
      run: function () { return costRate(3000, 10000); } },
    { name: '사 먹으면 8,000원 · 집밥 2,100원 → 아낀 돈', want: 5900,
      run: function () { return savedOf(2100, 8000); } },
    { name: '양파 1kg 3,000원 · 수율 80% · 손질 뒤 100g', want: 375,
      run: function () { return lineCost({ qty: 100, unit: 'g' }, { price: 3000, buyQty: 1, buyUnit: 'kg', yieldPct: 80 }).cost; } },
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
    { name: '계란 30개 9,000원에서 2개', want: 600,
      run: function () { return lineCost({ qty: 2, unit: '개' }, { price: 9000, buyQty: 30, buyUnit: '개', yieldPct: 100 }).cost; } },
    { name: '우유 1L 2,700원에서 200ml', want: 540,
      run: function () { return lineCost({ qty: 200, unit: 'ml' }, { price: 2700, buyQty: 1, buyUnit: 'L', yieldPct: 100 }).cost; } },
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
    UNIT_KEYS: UNIT_KEYS, dimOf: dimOf, isUnit: isUnit, unitsFor: unitsFor, lineUnitFor: lineUnitFor, toBase: toBase,
    hasPrice: hasPrice, unitPrice: unitPrice, unitPriceOf: unitPriceOf, lineCost: lineCost, menuCost: menuCost,
    costRate: costRate, savedOf: savedOf, level: level, changePct: changePct,
    today: today, daysInMonth: daysInMonth, isDay: isDay, daysBetween: daysBetween, addDays: addDays,
    monthOf: monthOf, addMonths: addMonths, monthLabel: monthLabel, shortDay: shortDay,
    challengeEnd: challengeEnd, periodDays: periodDays, expectedSpend: expectedSpend, perDayLeft: perDayLeft,
    challengeState: challengeState, inPeriod: inPeriod, selfTest: selfTest
  };
})();

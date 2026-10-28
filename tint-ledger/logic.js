/* Tint Ledger — 계산 (화면과 상관없는 순수 함수) */
window.Logic = (function () {
  var D = window.TL_DATA;
  var DAY = 86400000;
  var MONTH_DAYS = 30.4; // 한 달 평균 날수 (365/12 ≈ 30.4)

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function round1(x) { return Math.round(x * 10) / 10; }
  function round5(x) { return Math.max(5, Math.round(x / 5) * 5); }

  // ---- 날짜 (기기 현지 날짜) ----
  function toKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function validKey(k) {
    if (typeof k !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
    var p = k.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2], 12);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }
  // 정오 기준으로 만들어 서머타임·자정 경계에 흔들리지 않게 한다
  function fromKey(k) {
    var p = k.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2], 12);
  }
  // new Date(y, m, d + n) 이 월말·윤년을 넘겨 준다
  function addDays(k, n) {
    var d = fromKey(k);
    return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12));
  }
  function daysBetween(a, b) { return Math.round((fromKey(b) - fromKey(a)) / DAY); }
  function weekStart(k) {
    var d = fromKey(k);
    var wd = (d.getDay() + 6) % 7; // 월요일 시작
    return addDays(k, -wd);
  }
  function monthStart(k) { return k.slice(0, 8) + '01'; }
  function monthEnd(k) {
    var d = fromKey(k);
    return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
  }
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function prettyDate(k) {
    if (!validKey(k)) return '-';
    var d = fromKey(k);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WD[d.getDay()] + ')';
  }
  function shortDate(k) {
    if (!validKey(k)) return '-';
    var d = fromKey(k);
    return (d.getMonth() + 1) + '.' + d.getDate();
  }

  // ---- 배합 계산 ----
  // total: 섞은 약 전체 g, ratio: 염모제 1 에 대한 산화제 몫(1.5 면 1:1.5), lines: [{part}]
  function mix(total, ratio, lines) {
    total = Number(total) || 0;
    ratio = Number(ratio);
    if (!(ratio >= 0)) ratio = 0;
    var parts = 0;
    (lines || []).forEach(function (l) { parts += Math.max(0, Number(l.part) || 0); });
    var colorG = total / (1 + ratio);
    var out = [];
    var acc = 0;
    var colorSum = 0;
    (lines || []).forEach(function (l, i) {
      var p = Math.max(0, Number(l.part) || 0);
      var g = parts > 0 ? round1(colorG * p / parts) : 0;
      colorSum = round1(colorSum + g);
      acc = round1(acc + g);
      out.push({ i: i, shade: l.shade, part: p, g: g, cum: acc });
    });
    var devG = round1(total - colorSum);
    if (ratio === 0) devG = 0;
    var cumDev = round1(acc + devG);
    return { total: round1(colorSum + devG), colorG: colorSum, devG: devG, lines: out, cumDev: cumDev, parts: parts };
  }
  // 지난 배합을 새 양으로: 몫은 그대로, 전체 g 만 바꾼다
  function rescale(svc, newTotal) {
    var r = mix(newTotal, svc.ratio, svc.lines);
    r.k = svc.total > 0 ? round1(newTotal / svc.total * 100) / 100 : 1;
    return r;
  }
  // 바를 양 어림: 어림 g × 숱 → 5g 단위
  function recommend(presetG, densityK) { return round5((Number(presetG) || 0) * (Number(densityK) || 1)); }

  // 약값: 줄마다 선반 제품의 g당 값, 없으면 기본 g당 값
  function perGram(prod, fallback) {
    if (prod && prod.packG > 0 && prod.price >= 0) return prod.price / prod.packG;
    return Number(fallback) || 0;
  }
  function cost(m, lines, devProductId, products, settings) {
    var byId = {};
    (products || []).forEach(function (p) { byId[p.id] = p; });
    var won = 0;
    m.lines.forEach(function (ml, i) {
      var src = lines[i] || {};
      won += ml.g * perGram(byId[src.productId], settings.colorWon);
    });
    won += m.devG * perGram(byId[devProductId], settings.devWon);
    return Math.round(won);
  }
  // 남긴 약
  function waste(total, left, won) {
    total = Number(total) || 0;
    left = Math.max(0, Math.min(total, Number(left) || 0));
    if (total <= 0) return { pct: 0, won: 0 };
    return { pct: round1(left / total * 100), won: Math.round((won || 0) * left / total) };
  }
  // 다음 방문 권장일: 다시 바를 뿌리 길이 ÷ 한 달 자람 × 30.4일
  function nextVisit(dateKey, growthCm, rootCm) {
    var g = Number(growthCm) || 0, r = Number(rootCm) || 0;
    if (g <= 0 || r <= 0 || !validKey(dateKey)) return null;
    var days = Math.round(r / g * MONTH_DAYS);
    return { days: days, key: addDays(dateKey, days) };
  }
  // 패치 테스트: 48시간 뒤부터
  var PATCH_MS = 48 * 3600000;
  function patchState(patchAt, now) {
    if (!patchAt) return { has: false, ready: false, leftMs: 0 };
    var left = patchAt + PATCH_MS - now;
    return { has: true, ready: left <= 0, leftMs: Math.max(0, left), old: now - patchAt > 180 * DAY };
  }
  function fmtLeft(ms) {
    var m = Math.ceil(ms / 60000);
    var h = Math.floor(m / 60);
    m = m % 60;
    return h > 0 ? h + '시간 ' + m + '분' : m + '분';
  }
  function fmtClock(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(s / 60);
    s = s % 60;
    return pad(m) + ':' + pad(s);
  }
  function won(n) { return (Math.round(Number(n) || 0)).toLocaleString('ko-KR') + '원'; }
  function gram(n) {
    n = round1(Number(n) || 0);
    return (n % 1 === 0 ? String(n) : n.toFixed(1)) + 'g';
  }
  function ratioText(r) { return '1 : ' + (round1(r) % 1 === 0 ? round1(r) : round1(r).toFixed(1)); }

  // 색 번호 풀이: "7.3", "7/43", "6.01" → 단계와 톤
  function shadeInfo(text) {
    var s = String(text || '').trim();
    var m = /^(\d{1,2})\s*[.\/,]\s*(\d{1,2})$/.exec(s) || /^(\d{1,2})$/.exec(s);
    if (!m) return { known: false, text: s, desc: '번호 풀이 없음 — 적은 이름 그대로 쓴다' };
    var lv = Number(m[1]);
    var tones = m[2] ? m[2].split('') : ['0'];
    var L = D.LEVELS[lv - 1];
    if (!L) return { known: false, text: s, desc: '1~10 단계 밖 번호' };
    var tn = tones.map(function (t) { return D.TONES[Number(t)]; }).filter(Boolean);
    var name = L.name + (tn.length ? ' · ' + tn.map(function (t) { return t.name; }).join('+') : '');
    return { known: true, text: s, level: lv, tones: tones, name: name, desc: L.desc + (tn.length ? ' ' + tn[0].desc : '') };
  }
  // 색 번호의 화면 견본 색 (흉내 낸 색 — 실제 발색과 다르다)
  var TONE_HUE = { '0': null, '1': 210, '2': 280, '3': 45, '4': 22, '5': 340, '6': 2, '7': 120, '8': 28, '9': 300 };
  function swatch(text) {
    var info = shadeInfo(text);
    if (!info.known) return 'var(--swatch-unknown)';
    var light = 8 + info.level * 7.6; // 1단계 15% ~ 10단계 84%
    var hue = TONE_HUE[info.tones[0]];
    if (hue == null) return 'hsl(30, 22%, ' + light.toFixed(0) + '%)';
    return 'hsl(' + hue + ', ' + (info.tones[0] === '1' || info.tones[0] === '7' ? 18 : 42) + '%, ' + light.toFixed(0) + '%)';
  }

  // ---- 입력 검사 ----
  function checkName(v, max) {
    v = String(v || '').trim();
    if (!v) return '비어 있어요. 한 글자 이상 적어 주세요.';
    if (v.length > (max || 20)) return (max || 20) + '자 안쪽으로 적어 주세요.';
    return '';
  }
  function checkNum(v, min, max, label) {
    if (v === '' || v == null) return label + ' 칸이 비어 있어요.';
    var n = Number(v);
    if (!isFinite(n)) return label + '은(는) 숫자로 적어 주세요.';
    if (n < min || n > max) return label + '은(는) ' + min + '~' + max + ' 사이로 적어 주세요.';
    return '';
  }
  function checkPhone(v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (!/^[0-9\- ]{4,15}$/.test(v)) return '전화번호는 숫자와 - 만 15자 안쪽으로 적어 주세요.';
    return '';
  }

  // ---- 요약 ----
  function stats(services, from, to) {
    var list = services.filter(function (s) { return s.date >= from && s.date <= to; });
    var r = { count: list.length, mixed: 0, left: 0, leftKnown: 0, cost: 0, wasteWon: 0, scoreSum: 0, scoreN: 0, shades: {}, kinds: {}, days: {}, clients: {} };
    list.forEach(function (s) {
      r.mixed += s.total || 0;
      r.cost += s.cost || 0;
      if (s.left != null) {
        r.left += s.left; r.leftKnown += s.total || 0;
        r.wasteWon += waste(s.total, s.left, s.cost).won;
      }
      if (s.score) { r.scoreSum += s.score; r.scoreN++; }
      (s.lines || []).forEach(function (l) {
        var key = String(l.shade || '').trim() || '?';
        r.shades[key] = round1((r.shades[key] || 0) + (l.g || 0));
      });
      r.kinds[s.kind] = (r.kinds[s.kind] || 0) + 1;
      r.days[s.date] = (r.days[s.date] || 0) + 1;
      r.clients[s.clientId] = true;
    });
    r.mixed = round1(r.mixed);
    r.left = round1(r.left);
    r.wastePct = r.leftKnown > 0 ? round1(r.left / r.leftKnown * 100) : 0;
    r.avgScore = r.scoreN ? round1(r.scoreSum / r.scoreN) : 0;
    r.clientN = Object.keys(r.clients).length;
    r.topShades = Object.keys(r.shades).map(function (k) { return { shade: k, g: r.shades[k] }; })
      .sort(function (a, b) { return b.g - a.g; }).slice(0, 5);
    return r;
  }
  // 손님 방문 간격(일) 평균
  function visitGap(services) {
    var dates = services.map(function (s) { return s.date; }).filter(validKey).sort();
    var uniq = dates.filter(function (d, i) { return dates.indexOf(d) === i; });
    if (uniq.length < 2) return 0;
    var sum = 0;
    for (var i = 1; i < uniq.length; i++) sum += daysBetween(uniq[i - 1], uniq[i]);
    return Math.round(sum / (uniq.length - 1));
  }
  function countContent() {
    return D.LEVELS.length + D.TONES.length + D.KINDS.length + D.HAIR_TAGS.length + D.AMOUNTS.length +
      D.DENSITY.length + D.TEMPLATES.length + D.TIPS.length + D.NOTE_CHIPS.length + D.SCORES.length + D.STEPS.length;
  }

  // ---- 자체 점검: 기획서 `계산 예시` 와 같은 값인지 ----
  function selfTest() {
    var out = [];
    function eq(name, got, expect) { out.push({ name: name, got: got, expect: expect, ok: String(got) === String(expect) }); }
    // 예시 1: 90g, 1:1.5, 7.0 2몫 + 7.3 1몫 → 7.0 24g, 7.3 12g, 산화제 54g, 누적 24·36·90
    var m1 = mix(90, 1.5, [{ shade: '7.0', part: 2 }, { shade: '7.3', part: 1 }]);
    eq('예시1 7.0 g', m1.lines[0].g, 24);
    eq('예시1 7.3 g', m1.lines[1].g, 12);
    eq('예시1 산화제 g', m1.devG, 54);
    eq('예시1 누적', m1.lines[0].cum + '/' + m1.lines[1].cum + '/' + m1.cumDev, '24/36/90');
    // 예시 2: 지난 배합 80g(6.0 3몫 + 6.1 1몫, 1:1) 을 120g 으로 → 6.0 45g, 6.1 15g, 산화제 60g
    var m2 = rescale({ total: 80, ratio: 1, lines: [{ shade: '6.0', part: 3 }, { shade: '6.1', part: 1 }] }, 120);
    eq('예시2 6.0 g', m2.lines[0].g, 45);
    eq('예시2 6.1 g', m2.lines[1].g, 15);
    eq('예시2 산화제 g', m2.devG, 60);
    eq('예시2 배율', m2.k, 1.5);
    // 예시 3: 염모제 80g 9,600원(120원/g), 산화제 1,000g 8,000원(8원/g), 예시1 배합 → 4,752원
    var prods = [{ id: 'c', packG: 80, price: 9600 }, { id: 'd', packG: 1000, price: 8000 }];
    eq('예시3 약값', cost(m1, [{ productId: 'c' }, { productId: 'c' }], 'd', prods, { colorWon: 0, devWon: 0 }), 4752);
    // 예시 4: 10-28 시술, 한 달 1.2cm, 뿌리 1.5cm → 38일 뒤 12-05
    var nv = nextVisit('2026-10-28', 1.2, 1.5);
    eq('예시4 날수', nv.days, 38);
    eq('예시4 날짜', nv.key, '2026-12-05');
    // 예시 5: 90g 섞어 15g 남김, 약값 4,752원 → 16.7%, 792원
    var w = waste(90, 15, 4752);
    eq('예시5 남긴 비율', w.pct, 16.7);
    eq('예시5 남긴 값', w.won, 792);
    // 예시 6: 패치 테스트 10-26 10:00 → 10-27 15:00 에는 19시간 남음
    var pa = new Date(2026, 9, 26, 10, 0).getTime();
    var ps = patchState(pa, new Date(2026, 9, 27, 15, 0).getTime());
    eq('예시6 남은 시간', fmtLeft(ps.leftMs), '19시간 0분');
    eq('예시6 48시간 뒤 가능', patchState(pa, new Date(2026, 9, 28, 10, 0).getTime()).ready, true);
    // 날짜: 월말·윤년·연말
    eq('월말 넘김', addDays('2026-01-31', 1), '2026-02-01');
    eq('윤년 2월 29일', addDays('2028-02-28', 1), '2028-02-29');
    eq('없는 날 거름', validKey('2026-02-30'), false);
    eq('연말 넘김', addDays('2026-12-31', 1), '2027-01-01');
    eq('주 시작(월)', weekStart('2026-10-28'), '2026-10-26');
    // 바를 양 어림: 단발 100g × 숱 많음 1.25 → 125g
    eq('바를 양 어림', recommend(100, 1.25), 125);
    eq('색 번호 풀이', shadeInfo('7/43').name, '금갈색 · 코퍼+골드');
    eq('기본 내용 수', countContent() >= 150, true);
    return out;
  }

  return {
    pad: pad, round1: round1, toKey: toKey, validKey: validKey, fromKey: fromKey, addDays: addDays,
    daysBetween: daysBetween, weekStart: weekStart, monthStart: monthStart, monthEnd: monthEnd,
    prettyDate: prettyDate, shortDate: shortDate, mix: mix, rescale: rescale, recommend: recommend,
    cost: cost, waste: waste, nextVisit: nextVisit, patchState: patchState, fmtLeft: fmtLeft,
    fmtClock: fmtClock, won: won, gram: gram, ratioText: ratioText, shadeInfo: shadeInfo, swatch: swatch,
    checkName: checkName, checkNum: checkNum, checkPhone: checkPhone, stats: stats, visitGap: visitGap,
    countContent: countContent, selfTest: selfTest, PATCH_MS: PATCH_MS
  };
})();

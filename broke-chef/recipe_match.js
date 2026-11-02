// 한끼 계산기 — 레시피 재료 정보 글 나누기 · 냉장고 음식 이름과 맞추기 (H-46, 화면과 상관없는 함수만 둔다)
// 표는 ingredient_alias.js(window.INGREDIENT_ALIAS). 레시피 글은 바꾸지 않고 이름만 뽑는다.
var IngMatch = (function () {
  'use strict';

  var TABLE = window.INGREDIENT_ALIAS || { groups: [], pantry: [] };
  // 재료 정보 글의 칸 이름(재료 이름이 아니다)
  var SECTION = ['주재료', '부재료', '속재료', '재료', '양념장', '양념', '소스', '드레싱', '고명', '육수', '반죽', '토핑', '곁들임', '밑간', '튀김옷'];
  // 양 대신 쓰는 말 — 이름 끝에서 뗀다
  var AMOUNT_TAIL = /\s*(약간|적당량|적당히|조금씩|조금|소량|넉넉히|한\s?줌|한\s?꼬집|많이|기호에\s?따라)$/;
  // 냉장고 음식 이름 앞뒤의 손질·보관 말 — 떼고 다시 찾는다 (예: '얼린 대파' → '대파')
  var HEAD_WORD = /^(얼린|냉동|깐|다진|삶은|자른|슬라이스|통조림|손질한|손질|데친|볶은|채\s?썬|송송\s?썬|썬|저민|익힌|남은)\s+/;
  var TAIL_WORD = /\s*(남은\s?것|자른\s?것|뜯은\s?것|조금)$/;

  function compact(s) { return String(s || '').replace(/\s+/g, ''); }

  // 이름 → 묶음 대표 이름
  var INDEX = {};
  TABLE.groups.forEach(function (g) {
    INDEX[compact(g.key)] = g.key;
    g.names.forEach(function (n) { INDEX[compact(n)] = g.key; });
  });
  var PANTRY = {};
  (TABLE.pantry || []).forEach(function (n) { PANTRY[compact(n)] = true; });

  function stripWords(name) {
    var s = String(name || '').trim(), before;
    do { before = s; s = s.replace(HEAD_WORD, '').replace(TAIL_WORD, '').trim(); } while (s !== before);
    return s;
  }

  // 묶음 대표 이름. 표에 없으면 손질 말을 뗀 이름 그대로 (다른 이름과 같은지만 본다)
  function keyOf(name) {
    var c = compact(name);
    if (INDEX[c]) return INDEX[c];
    var s = stripWords(name);
    if (INDEX[compact(s)]) return INDEX[compact(s)];
    // '돼지고기 앞다리살' 처럼 띄어 쓴 낱말 하나가 표에 있으면 그 묶음 (낱말 통째로만 본다 — '고추장' 은 '고추' 가 아니다)
    var words = s.split(/\s+/);
    for (var i = 0; i < words.length; i++) if (INDEX[words[i]]) return INDEX[words[i]];
    return compact(s);
  }
  function isPantry(name) { return !!(PANTRY[compact(name)] || PANTRY[compact(stripWords(name))]); }

  // 괄호 밖의 쉼표·줄바꿈으로 자른다 ('두부 100g(1/3모, 부침용)' 은 한 덩이)
  function cut(line) {
    var out = [], buf = '', depth = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '(' || ch === '（' || ch === '[') depth++;
      else if ((ch === ')' || ch === '）' || ch === ']') && depth > 0) depth--;
      if (depth === 0 && (ch === ',' || ch === '，' || ch === '、' || ch === '·')) { out.push(buf); buf = ''; }
      else buf += ch;
    }
    out.push(buf);
    return out;
  }

  function cleanPart(t) {
    var s = String(t).replace(/[(（][^)）]*[)）]?/g, ' ').replace(/\[[^\]]*\]?/g, ' ');
    s = s.replace(/^[\s●•○■□▶\-*]+/, '').trim();
    // 칸 이름이 앞에 붙은 것 ('재료 연두부 75g') 은 뗀다
    var again = true;
    while (again) {
      again = false;
      for (var i = 0; i < SECTION.length; i++) {
        var w = SECTION[i];
        if (s.indexOf(w + ' ') === 0) { s = s.slice(w.length).trim(); again = true; }
      }
    }
    // 숫자(양)가 나오는 곳부터 뒤는 양이다
    s = s.replace(/[0-9０-９½⅓⅔¼¾].*$/, '').trim();
    s = s.replace(AMOUNT_TAIL, '').trim();
    return s;
  }

  // 레시피 '재료 정보' 글 → 재료 이름 목록 (겹치지 않게, 나온 순서대로)
  function splitParts(text, dishName) {
    var lines = String(text || '').replace(/\r/g, '').split('\n')
      .map(function (l) { return l.replace(/^[\s●•○■□▶\-*]+/, '').replace(/^[^:：,()]{1,12}[:：]\s*/, '').trim(); })
      .filter(function (l) { return l; });
    var seen = {}, out = [];
    lines.forEach(function (line, li) {
      // 첫 줄이 숫자·쉼표 없는 한 낱말이면 요리 이름 줄이다 (예: '새우두부계란찜')
      if (li === 0 && lines.length > 1 && !/[0-9,，]/.test(line)) return;
      cut(line).forEach(function (t) {
        var n = cleanPart(t);
        if (!n || n.length > 20) return;
        if (SECTION.indexOf(n) >= 0) return;
        if (dishName && compact(n) === compact(dishName)) return;
        var c = compact(n);
        if (seen[c]) return;
        seen[c] = true;
        out.push(n);
      });
    });
    return out;
  }

  // 재료 이름 목록 × 냉장고 음식 → 재료마다 { name, key, state: 'have'|'need'|'pantry', items, similar }
  // similar: 이름은 다르지만 같은 묶음으로 맞춘 것 (예: 레시피 '대파' ↔ 냉장고 '쪽파')
  function matchFridge(parts, fridgeItems) {
    var byKey = {};
    (fridgeItems || []).forEach(function (x) {
      if (!x || !x.name) return;
      var k = keyOf(x.name);
      (byKey[k] = byKey[k] || []).push(x);
    });
    var rows = (parts || []).map(function (name) {
      if (isPantry(name)) return { name: name, key: compact(name), state: 'pantry', items: [], similar: false };
      var k = keyOf(name), items = byKey[k] || [];
      if (!items.length) return { name: name, key: k, state: 'need', items: [], similar: false };
      var exact = items.some(function (x) { return compact(stripWords(x.name)) === compact(stripWords(name)); });
      return { name: name, key: k, state: 'have', items: items, similar: !exact };
    });
    var count = function (st) { return rows.filter(function (r) { return r.state === st; }).length; };
    return {
      rows: rows, have: count('have'), need: count('need'), pantry: count('pantry'),
      needNames: rows.filter(function (r) { return r.state === 'need'; }).map(function (r) { return r.name; })
    };
  }

  // 점검 예시 — 화면에는 보이지 않고 판정·점검 때 selfTest() 로 본다 (calc.js 와 같은 방식)
  var MFDS_LIKE = '새우두부계란찜\n●주재료 : 연두부 75g(3/4모), 칵테일새우 20g(5마리), 달걀 30g(1/2개)\n●양념 : 저염간장 3g(2/3작은술), 다진 대파 5g(1작은술), 소금 약간';
  var EXAMPLES = [
    { name: '재료 정보 글 → 재료 이름 (요리 이름 줄·칸 이름·양을 뺀다)', want: '연두부|칵테일새우|달걀|저염간장|다진 대파|소금',
      run: function () { return splitParts(MFDS_LIKE).join('|'); } },
    { name: '괄호 안 쉼표는 자르지 않는다', want: '두부|양파',
      run: function () { return splitParts('재료 두부 100g(1/3모, 부침용), 양파 1/4개').join('|'); } },
    { name: '대파·파·쪽파·얼린 대파는 한 묶음', want: '파|파|파|파',
      run: function () { return ['대파', '파', '쪽파', '얼린 대파'].map(keyOf).join('|'); } },
    { name: '달걀 = 계란, 쇠고기 = 소고기', want: '계란|계란|소고기|소고기',
      run: function () { return ['달걀', '계란', '쇠고기', '다진 소고기'].map(keyOf).join('|'); } },
    { name: '고추장은 고추가 아니고, 파프리카는 파가 아니다', want: '고추장|파프리카',
      run: function () { return keyOf('고추장') + '|' + keyOf('파프리카'); } },
    { name: '띄어 쓴 낱말로 묶음 찾기', want: '돼지고기',
      run: function () { return keyOf('돼지고기 목살 부위'); } },
    { name: '냉장고 쪽파·계란 → 대파·달걀은 있음(비슷한 이름), 양파는 살 것, 소금은 늘 있는 양념', want: 'have=2 need=1 pantry=1 similar=2 살 것=양파',
      run: function () {
        var m = matchFridge(['대파', '달걀', '양파', '소금'], [{ name: '쪽파' }, { name: '계란' }]);
        return 'have=' + m.have + ' need=' + m.need + ' pantry=' + m.pantry +
          ' similar=' + m.rows.filter(function (r) { return r.similar; }).length + ' 살 것=' + m.needNames.join(',');
      } }
  ];
  function selfTest() {
    return EXAMPLES.map(function (e) {
      var got;
      try { got = e.run(); } catch (err) { got = 'error: ' + err.message; }
      return { name: e.name, want: e.want, got: got, ok: got === e.want };
    });
  }

  return { splitParts: splitParts, keyOf: keyOf, isPantry: isPantry, matchFridge: matchFridge, selfTest: selfTest };
})();

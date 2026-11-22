// 한끼 계산기 — 요리하기 (2026-11-22)
// 레시피: 식품의약품안전처 '조리식품의 레시피 DB'(식품안전나라 COOKRCP01). data/recipes.json 을 처음 열 때 한 번 불러온다.
// AI 가 레시피 글을 새로 쓰거나 고쳐 쓰지 않는다(받을 때 번호·끝 글자 찌꺼기만 지운다 — 레시피받기.js).
// 흐름: 요리하기 → 냉장고 재료로 만들 수 있는 요리 목록(임박 재료 / 지금 바로 / 1~2개만 사면) → 레시피 → 다 만들었어요 → 잘 먹겠습니다
var Cook = (function () {
  'use strict';
  var URL_DATA = './data/recipes.json';             // 식약처 조리식품의 레시피 DB (get-recipes.js)
  var URL_MAFRA = './data/recipes_mafra.json';      // 농림수산식품교육문화정보원 레시피 (get-recipes-mafra.js) — 없어도 된다
  // 2026-11-22 (사람이 고른 A안): 흔한 양념은 '살 것'으로 세지 않는다. 레시피의 양념장·소스·고명 줄도 양념으로 본다
  var SEASON = ['간장', '진간장', '국간장', '저염간장', '양조간장', '조선간장', '고추장', '된장', '쌈장', '참기름', '들기름', '고춧가루', '다진마늘', '마늘', '후추', '후춧가루',
    '식초', '맛술', '미림', '올리고당', '물엿', '요리당', '조청', '매실청', '굴소스', '케첩', '마요네즈', '참깨', '통깨', '깨', '깨소금', '소금', '설탕', '식용유', '물', '청주', '생강', '다진생강',
    '전분', '녹말가루', '감자전분', '밀가루', '부침가루', '튀김가루', '빵가루', '멸치액젓', '액젓', '새우젓', '다시마', '육수', '멸치육수', '다시마물', '레몬즙', '버터'];
  var SEASON_IDX = {};
  SEASON.forEach(function (s) { SEASON_IDX[s] = true; });
  function isSeason(n) {
    var c = String(n || '').replace(/\s+/g, '');
    if (SEASON_IDX[c]) return true;
    // '저염 진간장', '다진 마늘' 처럼 끝이 양념 이름이면 양념
    return SEASON.some(function (s) { return s.length >= 2 && c.length > s.length && c.slice(-s.length) === s && /^(저염|진|국|다진|통|볶은|흰|검은|굵은|고운)/.test(c); });
  }
  var SAUCE_LINE = /^[\s●•○■□▶·\-*]*(\[[^\]]*\])?\s*(양념장|양념|소스|드레싱|고명|곁들임|토핑|밑간|육수|조림장|무침양념|초간장|겨자소스)\s*[:：]?/;
  // 식약처 '재료 정보' 글 → 주재료 이름 / 양념 이름. 양념장·소스 줄은 양념으로 넘긴다
  function splitMfds(parts, dish) {
    var main = [], sauce = [];
    String(parts || '').replace(/\r/g, '').split('\n').forEach(function (line) {
      if (!line.trim()) return;
      var toSauce = SAUCE_LINE.test(line);
      IngMatch.splitParts(line, dish).forEach(function (n) {
        if (toSauce || isSeason(n)) { if (sauce.indexOf(n) < 0) sauce.push(n); }
        else if (main.indexOf(n) < 0) main.push(n);
      });
    });
    return { main: main, sauce: sauce };
  }
  var state = 'idle', list = null, loadP = null;   // idle · loading · ready · none

  function getJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) { return Array.isArray(j) ? j : (j && j.recipes) || []; }, function () { return []; });
  }
  function fromMfds(x, i) {
    var sp = splitMfds(String(x.parts), String(x.name));
    return { id: String(x.id || i), src: 'mfds', name: String(x.name), kind: x.kind || '', way: x.way || '', parts: String(x.parts),
      steps: Array.isArray(x.steps) ? x.steps : [], img: x.img || '', kcal: x.kcal || '', na: x.na || '', tip: x.tip || '',
      names: sp.main, sauce: sp.sauce };
  }
  // 농식품 레시피: 재료마다 주재료·부재료·양념 구분이 있다. 양념(과 흔한 양념 이름)은 '살 것'으로 세지 않는다
  function fromMafra(x) {
    var main = [], sauce = [], lines = {};
    (x.ings || []).forEach(function (g) {
      var n = String(g.n || '').trim();
      if (!n) return;
      if (g.ty === '양념' || isSeason(n)) { if (sauce.indexOf(n) < 0) sauce.push(n); } else if (main.indexOf(n) < 0) main.push(n);
      (lines[g.ty || '재료'] = lines[g.ty || '재료'] || []).push(n + (g.amt ? ' ' + g.amt : ''));
    });
    var parts = Object.keys(lines).map(function (k) { return '●' + k + ' : ' + lines[k].join(', '); }).join('\n');
    return { id: String(x.id), src: 'mafra', name: String(x.name), kind: x.kind || '', way: x.nation || '', parts: parts,
      steps: (x.steps || []).map(function (s) { return { t: s.t + (s.tip ? ' (' + s.tip + ')' : ''), img: s.img || '' }; }),
      img: x.img || '', kcal: String(x.kcal || '').replace(/kcal$/i, ''), na: '', tip: x.summary || '', time: x.time || '', level: x.level || '', qnt: x.qnt || '',
      names: main, sauce: sauce };
  }
  function load() {
    if (loadP) return loadP;
    state = 'loading';
    loadP = Promise.all([getJson(URL_DATA), getJson(URL_MAFRA)]).then(function (two) {
      var a = two[0].filter(function (x) { return x && x.name && x.parts; }).map(fromMfds);
      var b = two[1].filter(function (x) { return x && x.name && x.ings; }).map(fromMafra);
      list = b.concat(a).filter(function (r) { return r.names.length; });   // 농식품(가정 요리)을 먼저
      state = list.length ? 'ready' : 'none';
      if (!list.length) loadP = null;
      return list;
    });
    return loadP;
  }
  function byId(id) {
    if (!list) return null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // 레시피 하나 × 냉장고 → 맞춘 결과와, 그 가운데 유통기한 사흘 안 음식
  function matchOne(r, items) {
    var m = IngMatch.matchFridge(r.names, items), soon = [], used = [], seen = {};
    m.rows.forEach(function (row) {
      if (row.state !== 'have') return;
      row.items.forEach(function (x) {
        if (seen[x.id]) return;
        seen[x.id] = true;
        used.push(x);
        var e = expInfo(x.exp);
        if (e && e.d <= 3) soon.push(x);
      });
    });
    m.soon = soon; m.used = used;
    return m;
  }
  // 묶음 셋: 임박 재료를 쓰는 요리(맨 위) / 지금 바로 만들 수 있는 요리 / 1~2개만 사면 되는 요리
  function groups(items) {
    var soon = [], now = [], buy = [];
    if (!list) return { soon: soon, now: now, buy: buy };
    list.forEach(function (r) {
      var m = matchOne(r, items);
      if (!m.have || m.need > 2) return;
      var o = { r: r, m: m };
      if (m.soon.length) soon.push(o);
      else if (!m.need) now.push(o);
      else buy.push(o);
    });
    var rank = function (a, b) { return a.m.need - b.m.need || b.m.have - a.m.have || a.r.name.localeCompare(b.r.name, 'ko'); };
    soon.sort(function (a, b) { return b.m.soon.length - a.m.soon.length || rank(a, b); });
    now.sort(rank); buy.sort(rank);
    return { soon: soon, now: now, buy: buy };
  }

  // 사진: 주소로 불러온다(앱에 내려받지 않음). https 로 먼저, 안 되면 원래 주소, 그래도 안 되면 요리 종류 그림
  // 사진이 없거나 안 뜨면 요리 종류 그림(assets/ic, 사람 그림)
  function dishIc(kind) { return IC['dish_' + kind] || IC['dish_기타']; }
  function imgHtml(url, kind, cls) {
    var fb = dishIc(kind);
    if (!url) return '<img class="' + cls + ' no-img" src="' + fb + '" alt="" aria-hidden="true">';
    var https = String(url).replace(/^http:\/\//i, 'https://');
    return '<img class="' + cls + '" src="' + esc(https) + '" data-orig="' + esc(url) + '" data-fb="' + fb + '" alt="" loading="lazy" decoding="async" onerror="Cook.imgFail(this)">';
  }
  function imgFail(el) {
    var orig = el.getAttribute('data-orig');
    if (orig && /^http:/i.test(orig) && !el._triedOrig) { el._triedOrig = true; el.src = orig; return; }
    el.onerror = null;
    el.classList.add('no-img');
    el.src = el.getAttribute('data-fb') || IC['dish_기타'];
  }

  // ---------- 목록 화면 ----------
  function row(o) {
    var r = o.r, m = o.m;
    var sub = '<span class="ck-have">있음 ' + m.have + '</span>' +
      (m.need ? '<span class="ck-need">🛒 ' + esc(m.needNames.join(', ')) + '</span>' : '');
    var soon = m.soon.length ? '<span class="ck-soon">' + m.soon.slice(0, 2).map(function (x) {
      var e = expInfo(x.exp); return esc(x.name) + ' ' + (e ? e.text : '');
    }).join(' · ') + '</span>' : '';
    return '<button type="button" class="ck-row" data-act="recipe-open" data-id="' + esc(r.id) + '">' +
      imgHtml(r.img, r.kind, 'ck-thumb') +
      '<span class="ck-main"><b class="ck-name">' + esc(r.name) + '</b>' +
        '<small class="ck-kind">' + esc([r.kind, r.way].filter(Boolean).join(' · ')) + '</small>' +
        '<span class="ck-sub">' + soon + sub + '</span></span></button>';
  }
  function section(title, arr) {
    if (!arr.length) return '';
    return '<h3 class="ck-sec">' + title + ' <small>' + arr.length + '</small></h3>' + arr.map(row).join('');
  }
  function render() {
    var box = $('cook-body');
    if (!box) return;
    var items = App.state.fridge.items;
    if (state === 'idle') { load().then(function () { if (App.screen === 'cook') render(); }); }
    if (state === 'idle' || state === 'loading') {
      box.innerHTML = '<div class="card pg-card ck-empty">' + emptyBox('<span class="emoji-art">🍳</span>', '레시피를 불러오는 중이에요', []) + '</div>';
      return;
    }
    if (state === 'none') {
      box.innerHTML = '<div class="card pg-card ck-empty">' + emptyBox('<span class="emoji-art">📖</span>', '레시피를 불러오는 중이에요', []) + '</div>';
      return;
    }
    if (!items.length) {
      box.innerHTML = '<div class="card pg-card ck-empty">' + emptyBox(ART.fridgeEmpty, '냉장고가 비어 있어요', [
        { act: 'snap-food', label: '📷 찍어서 넣기', cls: 'primary' }, { act: 'cook-add', label: '음식 넣기' }]) + '</div>';
      return;
    }
    var old = box.querySelector('.ck-list'), keepTop = old ? old.scrollTop : 0;
    var g = groups(items);
    var html = section(ic('alarm', '⏰') + ' 임박 재료로', g.soon) + section(ic('check', '✅') + ' 지금 바로', g.now) + section(ic('spend_장보기', '🛒') + ' 1~2개만 사면', g.buy);
    box.innerHTML = html
      ? '<div class="card ck-card"><div class="ck-list" tabindex="0" role="list" aria-label="만들 수 있는 요리">' + html + '</div></div>'
      : '<div class="card pg-card ck-empty">' + emptyBox('<span class="emoji-art">🥲</span>', '지금 냉장고로 만들 요리가 없어요', [
          { act: 'snap-food', label: '📷 찍어서 넣기', cls: 'primary' }]) + '</div>';
    var nl = box.querySelector('.ck-list');
    if (nl && keepTop) nl.scrollTop = keepTop;   // 레시피 창을 닫고 다시 그려도 보던 자리 그대로
  }

  // ---------- 레시피 창 ----------
  // 알레르기 유발물질: 식품 등의 표시기준(식약처 고시) 별지 알레르기 유발물질 표시 대상. 재료 이름으로만 찾는다
  var ALLERGY = [
    ['알류', ['계란', '달걀', '메추리알', '난황', '난백', '지단']], ['우유', ['우유', '치즈', '버터', '요거트', '요구르트', '생크림', '연유', '분유']],
    ['메밀', ['메밀']], ['땅콩', ['땅콩']], ['대두', ['대두', '두부', '두유', '유부', '콩', '간장', '된장', '청국장']],
    ['밀', ['밀가루', '부침가루', '튀김가루', '빵', '국수', '소면', '우동', '라면', '파스타', '스파게티', '만두피', '간장']],
    ['고등어', ['고등어']], ['게', ['게', '꽃게', '대게', '게살', '게맛살', '크래미']], ['새우', ['새우']],
    ['돼지고기', ['돼지', '삼겹', '목살', '베이컨', '햄', '소시지']], ['복숭아', ['복숭아']], ['토마토', ['토마토', '케첩']],
    ['호두', ['호두']], ['닭고기', ['닭']], ['쇠고기', ['소고기', '쇠고기', '우둔', '양지', '차돌']], ['오징어', ['오징어']],
    ['조개류', ['조개', '굴', '전복', '홍합', '바지락', '꼬막', '가리비']], ['잣', ['잣']]
  ];
  function hit(name, kw) {
    var n = String(name).replace(/\s+/g, '');
    return kw.length <= 1 ? n.indexOf(kw) === 0 : n.indexOf(kw) >= 0;
  }
  function allergens(names) {
    return ALLERGY.filter(function (a) { return names.some(function (n) { return a[1].some(function (k) { return hit(n, k); }); }); })
      .map(function (a) { return a[0]; });
  }
  function cautions(names) {
    var out = [], al = allergens(names);
    if (al.length) out.push('알레르기 유발 재료: ' + al.join('·'));
    if (names.some(function (n) { return hit(n, '꿀'); })) out.push('꿀은 1살 미만 아기에게 먹이지 않아요');
    if (names.some(function (n) { return ['닭', '돼지', '다진고기', '다진 고기', '삼겹', '목살'].some(function (k) { return hit(n, k); }); })) out.push('고기는 속까지 충분히 익혀요');
    return out;
  }
  function renderRecipe(id, done) {
    var r = byId(id);
    if (!r) return false;
    var m = matchOne(r, App.state.fridge.items);
    $('h-recipe').textContent = r.name;
    var chips = m.rows.filter(function (x) { return x.state !== 'pantry'; }).map(function (x) {
      var cls = x.state === 'have' ? 'have' : x.state === 'need' ? 'need' : 'pantry';
      var tip = x.state === 'have' ? x.items.map(function (i) { var e = expInfo(i.exp); return i.name + (e ? ' ' + e.text : ''); }).join(', ') : '';
      return '<li class="rc-ing ' + cls + '"><span class="rc-mark" aria-hidden="true">' + (cls === 'have' ? ic('check', '✓') : cls === 'need' ? ic('spend_장보기', '🛒') : ic('salt', '🧂')) + '</span>' +
        '<b>' + esc(x.name) + '</b>' + (tip ? '<small>' + esc(tip) + '</small>' : cls === 'need' ? '<small>살 것</small>' : '<small>양념</small>') + '</li>';
    }).join('');
    var meta = [r.kind, r.way, r.time ? '⏱ ' + r.time : '', r.level, r.qnt, r.kcal ? (r.src === 'mafra' ? '' : '1인분 ') + r.kcal + 'kcal' : '', r.na ? '나트륨 ' + r.na + 'mg' : ''].filter(Boolean).join(' · ');
    chips += (r.sauce || []).map(function (n) {
      return '<li class="rc-ing pantry"><span class="rc-mark" aria-hidden="true">' + ic('salt', '🧂') + '</span><b>' + esc(n) + '</b><small>양념</small></li>';
    }).join('');
    var warn = cautions(r.names.concat(r.sauce || []));
    var steps = r.steps.map(function (s) {
      return '<li class="rc-step">' + (s.img ? imgHtml(s.img, r.kind, 'rc-step-img') : '') + '<p>' + esc(s.t) + '</p></li>';
    }).join('');
    $('recipe-body').innerHTML =
      '<div class="rc-hero">' + imgHtml(r.img, r.kind, 'rc-img') + '</div>' +
      (meta ? '<p class="rc-meta">' + esc(meta) + '</p>' : '') +
      '<h3 class="rc-h">재료 <small>있음 ' + m.have + ' · 살 것 ' + m.need + '</small></h3>' +
      '<ul class="rc-ings">' + chips + '</ul>' +
      '<p class="rc-parts">' + esc(r.parts).replace(/\n/g, '<br>') + '</p>' +
      (warn.length ? '<ul class="rc-warn">' + warn.map(function (w) { return '<li>' + ic('warn', '⚠️') + ' ' + esc(w) + '</li>'; }).join('') + '</ul>' : '') +
      '<h3 class="rc-h">만드는 법 <small>' + r.steps.length + '단계</small></h3>' +
      '<ol class="rc-steps">' + steps + '</ol>' +
      (r.tip ? '<p class="rc-tip"><b>' + (r.src === 'mafra' ? '소개' : '저감 조리법') + '</b> ' + esc(r.tip) + '</p>' : '') +
      '<p class="rc-src">출처: ' + (r.src === 'mafra' ? '농림수산식품교육문화정보원 레시피 정보(농림축산식품 공공데이터포털)' : '식품의약품안전처 조리식품의 레시피 DB') + '</p>';
    $('recipe-foot').innerHTML = done
      ? '<button type="button" class="big meal-btn wide" data-act="recipe-eat">🍚 잘 먹겠습니다</button>'
      : '<button type="button" class="big primary wide" data-act="recipe-done">다 만들었어요</button>';
    return m;
  }

  // 점검 예시 (레시피 데이터 없이 맞추기·묶기만 본다)
  function selfTest() {
    var keep = list;
    list = [
      { id: 'a', name: '두부조림', kind: '반찬', parts: '두부 1모, 대파 10g, 간장 1큰술', steps: [] },
      { id: 'b', name: '계란말이', kind: '반찬', parts: '달걀 3개, 소금 약간', steps: [] },
      { id: 'c', name: '양파볶음', kind: '반찬', parts: '양파 1개, 당근 20g, 피망 10g, 버섯 30g', steps: [] }
    ].map(function (x) { var sp = splitMfds(x.parts, x.name); x.names = sp.main; x.sauce = sp.sauce; return x; });
    var today = Calc.today();
    var g = groups([{ id: 'k1', name: '두부', exp: Calc.addDays(today, 1) }, { id: 'k2', name: '쪽파', exp: '' }, { id: 'k3', name: '계란', exp: '' }]);
    list = keep;
    return [
      { name: '임박 두부를 쓰는 두부조림이 맨 위 묶음', ok: g.soon.length === 1 && g.soon[0].r.id === 'a' },
      { name: '계란말이(달걀=계란, 소금=양념)는 지금 바로', ok: g.now.length === 1 && g.now[0].r.id === 'b' },
      { name: '있는 재료가 하나도 없으면 목록에 없음', ok: g.buy.length === 0 },
      { name: '알레르기: 두부조림 → 대두·밀', ok: allergens(['두부', '대파', '간장']).join('·') === '대두·밀' }
    ];
  }

  return { load: load, render: render, renderRecipe: renderRecipe, byId: byId, matchOne: matchOne, groups: groups,
    imgFail: imgFail, allergens: allergens, selfTest: selfTest, state: function () { return state; } };
})();

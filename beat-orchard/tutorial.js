/* Beat Orchard — 첫 판 튜토리얼 (짚어 주는 안내)
   전투 화면을 엷게 덮고(#tut-layer), 지금 알려 줄 요소 둘레만 밝게 뚫은 뒤(#tut-hole) 그 옆 말풍선 카드(#tut-card)로 뜻을 알려 준다.
   learn = 읽고 `다음` 으로 넘어가는 알아보기, do = 그 동작을 직접 해야 넘어가는 해 보기 (game.js 가 onAction 으로 알려 줌) */
(function () {
  'use strict';
  var Store = window.Store;
  var Sound = window.Sound;

  // 짚는 곳: target = 화면 요소(선택자 또는 함수), spot = 판 위 점(Game.tutPoint), area = 판 위 네모(Game.tutArea), 셋 다 없으면 화면 가운데 카드
  // 글은 모두 이 표 한 곳에 둔다. en = 영어 설정일 때의 글 (H-24, 언어는 i18n.js)
  var STEPS = [
    { kind: 'learn', title: '과수원에 어서 오세요',
      text: '밤마다 안개 정령이 과수원으로 몰려와요. 리듬에 맞춰 나무를 돌보고 정원사와 함께 과수원을 지켜 주세요.',
      keys: '안내가 끝날 때까지 정령은 나오지 않아요',
      en: { title: 'Welcome to the Orchard',
        text: 'Every night, fog spirits drift into the orchard. Tend the trees to the rhythm and protect the orchard with your gardeners.',
        keys: 'No spirits will come until the tutorial is over' } },
    { kind: 'learn', title: '세 줄 과수원', target: '#field-wrap',
      text: '판은 가로 세 줄이에요. 정령은 오른쪽 숲에서 나와 왼쪽 울타리 쪽으로 다가와요. 줄마다 왼쪽 끝에 열매나무가 한 그루씩 있어요.',
      en: { title: 'Three-Lane Orchard',
        text: 'The field has three lanes. Spirits come out of the forest on the right and head for the fence on the left. Each lane has a fruit tree at its left end.' } },
    { kind: 'learn', title: '울타리 막대', target: '#hud-fence',
      text: '판 위 가운데 막대가 울타리 체력이에요. 정령이 울타리에 닿으면 줄고, 다 닳으면 게임이 끝나요. 막대가 푸르면 보호막이 대신 막아 주는 중이에요.',
      en: { title: 'Fence Bar',
        text: 'The bar at the top center is the fence\'s HP. It drops when spirits reach the fence, and the game ends when it runs out. A blue bar means a shield is taking the hits for you.' } },
    { kind: 'learn', title: '나무와 박자 고리', spot: 'tree',
      text: '나무는 다가오는 정령에게 열매를 던져요. 나무 둘레의 고리가 점점 작아지다가 나무에 닿는 순간이 바로 박자예요.',
      en: { title: 'Trees and the Beat Ring',
        text: 'Trees throw fruit at approaching spirits. The ring around a tree shrinks, and the moment it touches the tree is the beat.' } },
    { kind: 'do', need: 'water', title: '박자 맞춰 누르기', spot: 'tree', finger: true,
      text: '고리가 나무에 닿을 때 손가락이 가리키는 나무를 눌러 보세요. 「완벽!」이나 「좋아!」가 뜨면 그 줄 나무가 더 빨리 던져요.',
      keys: '키보드: A · S · D (1·2·3번 줄)',
      en: { title: 'Tap on the Beat',
        text: 'When the ring touches the tree, tap the tree the finger points to. On a "Perfect!" or "Good!", that lane\'s tree throws faster.',
        keys: 'Keyboard: A · S · D (lanes 1·2·3)' } },
    { kind: 'learn', title: '가진 열매', target: '#hud-seeds',
      text: '이 숫자는 지금 가진 열매 수예요. 정령을 물리치면 열매가 생기고, 열매가 0이면 심기 버튼이 흐려져요.',
      en: { title: 'Fruit in Hand',
        text: 'This number is how much fruit you have. Defeating spirits earns fruit, and at 0 the plant buttons dim.' } },
    { kind: 'do', need: 'plant', title: '열매 심기', target: '.plant[data-lane="1"]',
      text: '반짝이는 심기 버튼을 눌러 2번 줄 나무에 열매를 심어 보세요. 심을수록 그 줄 나무가 던지는 열매가 세고 빨라져요. 연습용 열매 2알을 드렸어요.',
      keys: '키보드: 1 · 2 · 3',
      en: { title: 'Plant Fruit',
        text: 'Press the glowing plant button to plant fruit under the lane 2 tree. The more you plant, the harder and faster that tree throws. Here are 2 practice fruit.',
        keys: 'Keyboard: 1 · 2 · 3' } },
    { kind: 'learn', title: '정원사 자리', area: 'slots',
      text: '나무 오른쪽 두 칸이 정원사 자리예요. 앞 칸(전열) 정원사는 정령을 몸으로 막고, 뒤 칸(후열) 정원사는 뒤에서 공격하거나 동료를 도와요.',
      en: { title: 'Gardener Slots',
        text: 'The two slots right of the tree are for gardeners. A front-row gardener blocks spirits in person, and a back-row gardener attacks or helps from behind.' } },
    { kind: 'do', need: 'move', title: '정원사 옮기기', spot: 'unit', finger: true,
      text: '손가락이 가리키는 정원사를 누른 다음, 가리키는 빈칸을 누르면 그 자리로 옮겨요. 다른 정원사를 누르면 서로 자리를 바꿔요.',
      keys: '키보드: 방향키로 칸 고르기 · 스페이스로 집기·놓기',
      en: { title: 'Move a Gardener',
        text: 'Tap the gardener the finger points to, then tap the empty slot it points to. Tapping another gardener swaps their places.',
        keys: 'Keyboard: arrow keys to choose a slot · Space to pick up and drop' } },
    { kind: 'learn', title: '웨이브 미리보기', target: '#wave-preview',
      text: '판 왼쪽 위 작은 표시는 지금 몇 번째 웨이브인지와 이번에 나올 정령의 기호·이름·수예요. 판 위 정령 옆 작은 기호가 이 목록의 기호와 같아요. (비행)은 정원사를 넘어 날아오고, 붉은 칸은 우두머리예요.',
      en: { title: 'Wave Preview',
        text: 'The small tag at the top left of the field shows the current wave and the symbol, name and count of the spirits in it. The small symbol next to each spirit on the field matches this list. (flying) spirits fly over gardeners, and the red entry is the boss.' } },
    { kind: 'learn', title: '콤보', area: 'combo',
      text: '「완벽!」으로 맞히면 판 오른쪽 위에 콤보가 쌓이고, 콤보가 높을수록 열매가 세져요. 5콤보마다 정원사가 정령에게 열매를 쏴서 숲으로 돌려보내요. 「좋아!」나 놓침이 나오면 콤보가 끊겨요.',
      en: { title: 'Combo',
        text: 'Each "Perfect!" adds to the combo at the top right, and a higher combo means stronger fruit. Every 5 combo, a gardener shoots fruit at a spirit and sends it back to the forest. A "Good!" or a miss breaks the combo.' } },
    { kind: 'learn', title: '기술 버튼', target: '#skill-bar',
      text: '정원사마다 기술이 하나씩 있어요. 금빛 테두리 버튼은 지금 쓸 수 있고, 쓰고 나면 어두운 막이 다 걷힐 때까지(쿨타임) 기다려야 해요.',
      en: { title: 'Skill Buttons',
        text: 'Each gardener has one skill. A button with a gold border is ready now. After using it, wait until the dark cover clears (cooldown).' } },
    { kind: 'do', need: 'skill', title: '기술 쓰기', target: readySkill,
      text: '반짝이는 기술 버튼을 눌러 써 보세요. 박자에 맞춰 쓰면 효과가 더 세져요.',
      keys: '키보드: Q · W · E',
      en: { title: 'Use a Skill',
        text: 'Press the glowing skill button to use it. Skills used on the beat are even stronger.',
        keys: 'Keyboard: Q · W · E' } }
  ];
  var DONE = {
    title: '준비 끝!',
    text: '이제 안개 정령이 몰려와요. 웨이브 10개를 막아 과수원을 지켜 주세요. 튜토리얼은 옵션에서 다시 볼 수 있어요.',
    keys: '일시정지: 오른쪽 위 ❚❚ 버튼 (키보드 P · Esc)',
    en: { title: 'All Set!',
      text: 'Here come the fog spirits. Hold off 10 waves to protect the orchard. You can replay the tutorial in Options.',
      keys: 'Pause: ❚❚ button at the top right (keyboard P · Esc)' }
  };
  var TXT = {
    learn: '알아보기', act: '해 보기', next: '다음 ▶', start: '시작하기', skip: '건너뛰기',
    doHint: '직접 해 보면 다음으로 넘어가요', done: '튜토리얼 완료'
  };
  var TXT_EN = {
    learn: 'Learn', act: 'Try it', next: 'Next ▶', start: 'Let\'s go', skip: 'Skip',
    doHint: 'Do it yourself to continue', done: 'Tutorial complete'
  };
  function isEn() { return !!(window.I18N && window.I18N.lang() === 'en'); }
  // 단계 글 하나 (영어 설정이고 영어가 있으면 영어)
  function say(s, field) { return isEn() && s.en && s.en[field] ? s.en[field] : (s[field] || ''); }
  function txt(field) { return isEn() ? TXT_EN[field] : TXT[field]; }

  var step = -1; // -1 = 안 보임, STEPS.length = 끝 인사
  var timer = 0;

  function el(id) { return document.getElementById(id); }
  function setHold(on) { if (window.Game && window.Game.setHold) window.Game.setHold(on); }
  // 쓸 수 있는 첫 기술 버튼 (없으면 첫 버튼 — 쿨타임이 끝나면 짚는 곳이 그리로 옮겨 간다)
  function readySkill() { return document.querySelector('#skill-bar button.ready') || el('skill-0'); }
  function cur() { return step >= 0 && step < STEPS.length ? STEPS[step] : null; }

  // 짚을 곳을 전투 화면(#scr-battle) 안의 좌표 {x, y, w, h, round} 로 바꾼다. 없거나 안 보이면 null
  function holeRect(s, base) {
    if (!s) return null;
    var G = window.Game;
    if (s.spot || s.area) {
      var wrap = el('field-wrap');
      if (!wrap || !G) return null;
      var f = wrap.getBoundingClientRect();
      if (f.width <= 0 || f.height <= 0) return null;
      if (s.spot) {
        var p = G.tutPoint ? G.tutPoint(s.spot) : null;
        if (!p) return null;
        var d = Math.max(56, Math.min(84, f.height / 3 * 0.8));
        return { x: f.left - base.left + f.width * p.x / 100 - d / 2, y: f.top - base.top + f.height * p.y / 100 - d / 2, w: d, h: d, round: true };
      }
      var a = G.tutArea ? G.tutArea(s.area) : null;
      if (!a) return null;
      return { x: f.left - base.left + f.width * a.x0 / 100, y: f.top - base.top + f.height * a.y0 / 100,
        w: f.width * (a.x1 - a.x0) / 100, h: f.height * (a.y1 - a.y0) / 100 };
    }
    if (!s.target) return null;
    var t = typeof s.target === 'function' ? s.target() : document.querySelector(s.target);
    if (!t) return null;
    var r = t.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    var pad = 5;
    return { x: r.left - base.left - pad, y: r.top - base.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
  }

  // 카드는 짚은 곳을 가리지 않는 쪽(오른쪽 → 왼쪽 → 아래 → 위)에, 화면 안으로 붙인다
  function placeCard(card, h, W, H) {
    var cw = card.offsetWidth, ch = card.offsetHeight, gap = 12, m = 8, x, y;
    if (!h) { x = (W - cw) / 2; y = (H - ch) / 2; }
    else if (W - (h.x + h.w) - gap >= cw + m) { x = h.x + h.w + gap; y = h.y + h.h / 2 - ch / 2; }
    else if (h.x - gap >= cw + m) { x = h.x - gap - cw; y = h.y + h.h / 2 - ch / 2; }
    else if (H - (h.y + h.h) - gap >= ch + m) { y = h.y + h.h + gap; x = h.x + h.w / 2 - cw / 2; }
    else if (h.y - gap >= ch + m) { y = h.y - gap - ch; x = h.x + h.w / 2 - cw / 2; }
    else { x = W - cw - m; y = H - ch - m; } // 짚은 곳이 너무 크면(판 전체) 오른쪽 아래 구석
    x = Math.max(m, Math.min(W - cw - m, x));
    y = Math.max(m, Math.min(H - ch - m, y));
    card.style.left = Math.round(x) + 'px';
    card.style.top = Math.round(y) + 'px';
  }

  // 덮는 층·뚫린 곳·카드 자리를 맞춘다. 기술 막대가 다시 그려지거나 화면 크기가 바뀌므로 안내 중에는 짧게 되풀이한다
  function layout() {
    clearTimeout(timer);
    var layer = el('tut-layer'), hole = el('tut-hole'), card = el('tut-card'), scr = el('scr-battle');
    if (!layer || !hole || !card || !scr || step < 0) return;
    var s = cur();
    // 해 보기 단계에서 연습용 열매를 미리 다 써 버렸으면 심기는 해 본 것으로 친다 (막혀 멈추지 않게)
    if (s && s.need === 'plant' && window.Game && window.Game.hud) {
      var hud = window.Game.hud();
      if (hud && hud.pouch <= 0) { Tutorial.onAction('plant'); return; }
    }
    var base = scr.getBoundingClientRect();
    var h = holeRect(s, base);
    layer.classList.toggle('dim', !h);
    hole.classList.toggle('hidden', !h);
    if (h) {
      hole.style.left = Math.round(h.x) + 'px';
      hole.style.top = Math.round(h.y) + 'px';
      hole.style.width = Math.round(h.w) + 'px';
      hole.style.height = Math.round(h.h) + 'px';
      hole.classList.toggle('round', !!h.round);
      hole.classList.toggle('finger', !!(s && s.finger));
    }
    placeCard(card, h, base.width, base.height);
    timer = setTimeout(layout, 250);
  }

  function render() {
    var layer = el('tut-layer'), card = el('tut-card');
    if (!layer || !card) return;
    if (step < 0) {
      clearTimeout(timer);
      layer.classList.add('hidden');
      card.classList.add('hidden');
      return;
    }
    var done = step >= STEPS.length;
    var s = done ? DONE : STEPS[step];
    var doing = !done && s.kind === 'do';
    layer.classList.remove('hidden');
    card.classList.remove('hidden');
    // 알아보기·끝 인사는 판을 눌러도 아무 일 없게 막고, 해 보기는 짚은 곳을 직접 누를 수 있게 통과시킨다
    layer.classList.toggle('pass', doing);
    card.classList.toggle('doing', doing);
    el('tut-kind').textContent = done ? txt('done') : (doing ? txt('act') : txt('learn'));
    el('tut-step').textContent = say(s, 'title');
    el('tut-count').textContent = done ? '' : (step + 1) + ' / ' + STEPS.length;
    el('tut-text').textContent = say(s, 'text');
    var keys = el('tut-keys');
    var k = say(s, 'keys');
    keys.textContent = doing ? (k ? k + ' · ' : '') + txt('doHint') : k;
    keys.classList.toggle('hidden', !keys.textContent);
    var dots = '';
    for (var i = 0; i < STEPS.length; i++) dots += '<i class="' + (i < step || done ? 'on' : (i === step ? 'now' : '')) + '"></i>';
    el('tut-dots').innerHTML = dots;
    var next = el('btn-tut-next');
    next.classList.toggle('hidden', doing);
    next.textContent = done ? txt('start') : txt('next');
    // 건너뛰기 / Skip 은 모든 카드(알아보기·해 보기·끝 인사)에 있다. 끝 인사에서는 시작하기와 같이 닫는다
    // (영어 설정이면 위 줄이 Skip 이 되고 아래 영어 줄 .me 는 CSS 가 숨긴다)
    var skip = el('btn-tut-skip');
    skip.classList.remove('hidden');
    el('tut-skip-k').textContent = txt('skip');
    layout();
  }

  // 마지막 해 보기까지 하면 다 본 것으로 저장한다. 정령은 끝 인사를 닫을 때(close) 나오기 시작한다
  function finish() {
    Store.meta.tutorialDone = true;
    Store.save();
  }
  function close() {
    clearTimeout(timer);
    step = -1;
    setHold(false);
    render();
  }
  // 알아보기·끝 인사의 `다음`
  function next() {
    if (step < 0) return;
    if (step >= STEPS.length) { close(); return; }
    if (STEPS[step].kind === 'do') return;
    step++;
    Sound.play('click');
    if (step >= STEPS.length) finish();
    render();
  }

  var Tutorial = {
    needed: function () { return !Store.meta.tutorialDone; },
    active: function () { return step >= 0 && step < STEPS.length; },
    // 새 판을 시작할 때 부른다. 안내가 필요하면 true
    start: function () {
      step = Tutorial.needed() ? 0 : -1;
      render();
      return step === 0;
    },
    onAction: function (kind) {
      var s = cur();
      if (!s || s.kind !== 'do' || s.need !== kind) return;
      step++;
      Sound.play('pick');
      if (step >= STEPS.length) finish();
      render();
    },
    next: next,
    skip: function () {
      finish();
      close();
    },
    // 판이 끝나거나 나갈 때. 다 보지 않았으면 다음 판에 다시 나온다
    stop: function () { close(); },
    // 옵션에서 언어를 바꾼 뒤 떠 있는 카드를 새 언어로 다시 그린다
    refresh: function () { if (step >= 0) render(); },
    reset: function () {
      Store.meta.tutorialDone = false;
      Store.save();
    },
    steps: STEPS.length
  };

  // 알아보기 단계에서는 엔터로 넘기고, 판 조작 키는 받지 않는다(일시정지 P·Esc 는 그대로 통과)
  document.addEventListener('keydown', function (e) {
    if (step < 0) return;
    var s = cur();
    if (s && s.kind === 'do') return;
    var scr = el('scr-battle');
    if (!scr || !scr.classList.contains('active')) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') return;
    var pick = el('ov-pick'), pause = el('ov-pause');
    if ((pick && !pick.classList.contains('hidden')) || (pause && !pause.classList.contains('hidden'))) return;
    if (e.key === 'Enter') next();
    e.preventDefault();
    e.stopPropagation();
  }, true);
  window.addEventListener('resize', function () { if (step >= 0) layout(); });

  window.Tutorial = Tutorial;
})();

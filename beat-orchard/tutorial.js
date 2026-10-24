/* Beat Orchard — 첫 판 안내 (심기 → 박자 물 주기 → 옮기기 → 기술, 한 단계씩) */
(function () {
  'use strict';
  var Store = window.Store;
  var Sound = window.Sound;

  // need: game.js 가 onAction 으로 알려 주는 동작 이름
  // target: 빛 테두리(tut-focus)를 붙일 요소. spot 이 있으면 판 위 그 자리(Game.tutPoint)로 #tut-spot 을 옮긴다
  var STEPS = [
    { need: 'plant', title: '씨앗 심기', target: '.plant[data-lane="1"]',
      text: '반짝이는 「2번 줄 심기」 버튼을 눌러 씨앗을 심어 보세요(키보드 1·2·3). 연습용 씨앗 2알을 드렸어요. 안내가 끝날 때까지 안개는 움직이지 않아요.' },
    { need: 'water', title: '박자 맞춰 물 주기', target: '#tut-spot', spot: 'tree',
      text: '나무를 둘러싼 고리가 점점 작아져요. 고리가 나무에 닿는 순간 손가락이 가리키는 나무를 누르세요(키보드 A·S·D). 타이밍이 맞으면 「완벽!」이 뜨고, 그 줄 열매가 빨라지며 콤보가 쌓여요.' },
    { need: 'move', title: '정원사 옮기기', target: '#tut-spot', spot: 'unit',
      text: '손가락이 가리키는 정원사를 누르고, 이어서 가리키는 빈칸을 누르면 그 자리로 옮겨요. 다른 정원사를 누르면 서로 자리를 바꿔요. (키보드: 방향키로 칸 선택, 스페이스로 집기·놓기)' },
    { need: 'skill', title: '기술 쓰기', target: '#skill-0',
      text: '반짝이는 기술 버튼을 눌러 정원사의 기술을 써 보세요(키보드 Q·W·E). 한 번 쓰면 쿨타임이 끝날 때까지 다시 쓸 수 없어요.' }
  ];
  var DONE_TEXT = '준비 끝! 이제 안개가 몰려와요. 웨이브 10개를 막아 내고 과수원을 지켜 주세요. 안내는 설정에서 다시 볼 수 있어요.';

  var step = -1; // -1 = 안 보임, STEPS.length = 끝 인사
  var hideTimer = 0;
  var focusTimer = 0;
  var focused = null;

  function el(id) { return document.getElementById(id); }
  function setHold(on) { if (window.Game && window.Game.setHold) window.Game.setHold(on); }
  // 지금 단계의 target 에 tut-focus 를 붙이고 지난 것은 뗀다. 기술 막대가 다시 그려지거나
  // 정원사를 고르면 자리가 바뀌므로 안내 중에는 짧게 되풀이한다
  function focus() {
    var s = Tutorial.active() ? STEPS[step] : null;
    var t = s ? document.querySelector(s.target) : null;
    if (focused && focused !== t) focused.classList.remove('tut-focus');
    focused = t;
    var spot = el('tut-spot');
    var p = s && s.spot && window.Game && window.Game.tutPoint ? window.Game.tutPoint(s.spot) : null;
    if (spot) {
      spot.classList.toggle('hidden', !p);
      if (p) { spot.style.left = p.x + '%'; spot.style.top = p.y + '%'; }
    }
    if (t) t.classList.add('tut-focus');
    clearTimeout(focusTimer);
    if (s) focusTimer = setTimeout(focus, 250);
  }
  function render() {
    var box = el('tut-box');
    if (!box) return;
    renderBox(box);
    focus();
    // 안내 상자 높이가 바뀌면 판 높이를 다시 맞춰 기술 버튼이 화면 안에 남게 한다
    if (window.Game && window.Game.resize) window.Game.resize();
  }
  function renderBox(box) {
    if (step < 0) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    var done = step >= STEPS.length;
    el('tut-step').textContent = done ? '튜토리얼 완료' : '튜토리얼 ' + (step + 1) + '/' + STEPS.length + ' · ' + STEPS[step].title;
    el('tut-text').textContent = done ? DONE_TEXT : STEPS[step].text;
    el('btn-tut-skip').classList.toggle('hidden', done);
    var dots = el('tut-dots');
    if (dots) {
      var s = '';
      for (var i = 0; i < STEPS.length; i++) s += i < step ? '●' : (i === step ? '◉' : '○');
      dots.textContent = s;
    }
  }
  function finish() {
    Store.meta.tutorialDone = true;
    Store.save();
    setHold(false);
  }

  var Tutorial = {
    needed: function () { return !Store.meta.tutorialDone; },
    active: function () { return step >= 0 && step < STEPS.length; },
    // 새 판을 시작할 때 부른다. 안내가 필요하면 true
    start: function () {
      clearTimeout(hideTimer);
      step = Tutorial.needed() ? 0 : -1;
      render();
      return step === 0;
    },
    onAction: function (kind) {
      if (!Tutorial.active() || STEPS[step].need !== kind) return;
      step++;
      Sound.play('pick');
      if (step >= STEPS.length) {
        finish();
        render();
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { step = -1; render(); }, 3500);
      } else {
        render();
      }
    },
    skip: function () {
      finish();
      clearTimeout(hideTimer);
      step = -1;
      render();
    },
    // 판이 끝나거나 나갈 때. 다 보지 않았으면 다음 판에 다시 나온다
    stop: function () {
      clearTimeout(hideTimer);
      setHold(false);
      step = -1;
      render();
    },
    reset: function () {
      Store.meta.tutorialDone = false;
      Store.save();
    },
    steps: STEPS.length
  };

  window.Tutorial = Tutorial;
})();

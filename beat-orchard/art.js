/* Beat Orchard — 사람이 그린 그림 (assets/) 불러오기와 잘라 쓰기
   그림이 아직 안 불렸거나 못 불렀으면 null 을 돌려주고, 부르는 쪽은 원래 도형·이모지로 그린다. */
(function () {
  'use strict';
  var GD = window.GD;
  // 이미지프롬프트.md 의 차례: 1 아이콘, 2 스토어 대표 그림, 3 과수원 배경, 4 우두머리 5종, 5 안개 24종, 6 정원사 12명
  var FILES = {
    icon: 'assets/오렌지_정원사_1.png',
    key: 'assets/오렌지_정원사_2.png',
    field: 'assets/오렌지_정원사_3.png',
    boss: 'assets/오렌지_정원사_4.png',
    enemy: 'assets/오렌지_정원사_5.png',
    gardener: 'assets/오렌지_정원사_6.png'
  };
  // 모아 그린 그림의 칸 나누기 (열 × 줄). 차례는 data.js 배열 차례와 같다
  var SHEETS = {
    gardener: { cols: 4, rows: 3, list: GD.GARDENERS },
    enemy: { cols: 6, rows: 4, list: GD.ENEMIES },
    boss: { cols: 5, rows: 1, list: GD.BOSSES }
  };
  var imgs = {};
  var listeners = [];
  Object.keys(FILES).forEach(function (k) {
    if (k === 'icon' || k === 'key') return; // 화면 HTML·CSS 에서 바로 부른다
    var im = new Image();
    im.onload = function () { listeners.forEach(function (fn) { try { fn(k); } catch (e) { /* 그리기만 다시 */ } }); };
    im.onerror = function () { im.failed = true; };
    im.src = FILES[k];
    imgs[k] = im;
  });

  function ready(k) {
    var im = imgs[k];
    return !!(im && !im.failed && im.complete && im.naturalWidth > 0);
  }
  function indexOf(kind, id) {
    var list = SHEETS[kind].list;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }
  // Canvas drawImage 용 잘라 낼 칸: { img, sx, sy, sw, sh }
  function cell(kind, id) {
    if (!ready(kind)) return null;
    var sh = SHEETS[kind];
    var i = indexOf(kind, id);
    if (i < 0) return null;
    var im = imgs[kind];
    var cw = im.naturalWidth / sh.cols;
    var ch = im.naturalHeight / sh.rows;
    var c = { img: im, sx: (i % sh.cols) * cw, sy: Math.floor(i / sh.cols) * ch, sw: cw, sh: ch };
    if (kind === 'boss') { c.sy = ch * 0.14; c.sh = ch * 0.76; } // 우두머리 칸은 세로로 길어 몸통 부분만
    return c;
  }
  // 화면 목록용 그림 조각 (CSS background). 칸마다 background-position 으로 잘라 보인다
  function html(kind, id, extra) {
    var sh = SHEETS[kind];
    var i = indexOf(kind, id);
    if (i < 0) return '';
    var col = i % sh.cols;
    var row = Math.floor(i / sh.cols);
    var px = sh.cols > 1 ? col / (sh.cols - 1) * 100 : 0;
    var py = sh.rows > 1 ? row / (sh.rows - 1) * 100 : 50;
    var size = kind === 'boss' ? (sh.cols * 100) + '% auto' : (sh.cols * 100) + '% ' + (sh.rows * 100) + '%';
    return '<span class="spr spr-' + kind + (extra ? ' ' + extra : '') + '" aria-hidden="true" style="background-image:url(\'' + FILES[kind] +
      '\');background-size:' + size + ';background-position:' + px.toFixed(3) + '% ' + py.toFixed(3) + '%"></span>';
  }

  window.Art = {
    files: FILES,
    ready: ready,
    image: function (k) { return ready(k) ? imgs[k] : null; },
    cell: cell,
    html: html,
    onLoad: function (fn) { listeners.push(fn); }
  };
})();

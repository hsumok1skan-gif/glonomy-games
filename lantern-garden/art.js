// 사람 그림 바꿔 끼우기 (H-16). 이름은 이미지프롬프트.md 의 파일 이름에서 확장자만 뺀 것이다(같은 철자, 장 순서).
// 그림이 오기 전까지 모든 자리는 style.css·index.html·game.js·clear_fx.js 의 CSS·SVG·Canvas 가 그린다. 코드에는 그림 파일 경로가 없다(G-15).
// 그림이 들어와 `사람 그림 적용` 차례가 되면 그 그림마다 두 가지만 한다:
//   1) 아래 ART_READY 에 이름(예: 'map_zone_3')을 적는다 → <html> 에 `art-map_zone_3` 클래스가 붙는다.
//   2) style.css 끝 `사람 그림 바꿔 끼우기` 의 :root 에 `--art-map_zone_3: url(그림 경로);` 한 줄을 적는다.
// 그러면 같은 이름 규칙이 그 자리의 CSS·SVG 를 숨기고 그 변수의 그림을 깐다. ART_READY 에 없는 이름은 아무것도 바꾸지 않는다.
(function () {
  'use strict';

  // 이미지프롬프트.md 에 적은 그림 37장 (장 번호 순서)
  var ART_NAMES = [
    'icon',                                                      // 1 앱 아이콘: <head> #favicon, 시작 화면 .title-icon
    'lamp',                                                      // 2 등불: .lamp
    'lamp_bad',                                                  // 3 규칙에 걸린 등불: .cell.bad .lamp
    'xmark',                                                     // 4 칸 ×: svg.xmark (X_SVG)
    'bg',                                                        // 5 배경: #app
    'cell_flowers',                                              // 6 꽃밭 칸 무늬: #board .cell
    'map_zone_0', 'map_zone_1', 'map_zone_2', 'map_zone_3',
    'map_zone_4', 'map_zone_5', 'map_zone_6', 'map_zone_7',      // 7 지도 구역: .zone-0 ~ .zone-7
    'map_lamp_lit', 'map_lamp_now', 'map_lamp_locked',           // 8 지도 등불: .node.lit/.now/.locked
    'star_on', 'star_off',                                       // 9 별: .star.on/.off, 완료 창 캔버스(clear_fx.js)
    'btn_undo', 'btn_x', 'btn_hint',                             // 10 버튼 아이콘: #undoBtn/#xBtn/#hintBtn svg
    'clear_glow',                                                // 11 완료 장면: .clear-glow.on
    'finger',                                                    // 12 손가락: .finger
    'daily_badge',                                               // 13 오늘의 정원: .daily-mark
    'start_scene',                                               // 14 시작 화면: #startScreen
    'cb_0', 'cb_1', 'cb_2', 'cb_3', 'cb_4', 'cb_5',
    'cb_6', 'cb_7', 'cb_8', 'cb_9', 'cb_10'                      // 15 꽃밭 무늬: #board .p0 ~ .p10 (늘 옅게, 색약 모드는 진하게)
  ];

  // 들어온 그림 (사람그림.md 를 보고 적는다). 지금은 없다.
  var ART_READY = [];

  var root = document.documentElement;
  var ready = [];
  for (var i = 0; i < ART_READY.length; i++) {
    var f = ART_READY[i];
    if (ART_NAMES.indexOf(f) < 0 || ready.indexOf(f) >= 0) continue;
    ready.push(f);
    root.classList.add('art-' + f);
  }

  // style.css :root 의 `--art-이름` 에 적힌 그림 주소 (없으면 null). 캔버스·아이콘처럼 CSS 로 못 까는 자리가 쓴다.
  function artUrl(name) {
    if (ready.indexOf(name) < 0) return null;
    var v = '';
    try { v = getComputedStyle(root).getPropertyValue('--art-' + name); } catch (e) { v = ''; }
    var m = /url\(\s*(['"]?)(.*?)\1\s*\)/.exec(v || '');
    return m && m[2] ? m[2] : null;
  }

  window.addEventListener('DOMContentLoaded', function () {
    var u = artUrl('icon');
    var link = document.getElementById('favicon');
    if (u && link) link.setAttribute('href', u);
  });

  window.ART = {
    names: ART_NAMES.slice(),
    ready: ready.slice(),
    has: function (name) { return ready.indexOf(name) >= 0; },
    url: artUrl
  };
})();

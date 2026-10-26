/* Beat Orchard — 화면 이동과 메뉴 */
(function () {
  'use strict';
  var GD = window.GD;
  var Store = window.Store;
  var Sound = window.Sound;
  var Game = window.Game;
  var Tutorial = window.Tutorial;
  var Daily = window.Daily;
  var DIFFS = GD.DIFFICULTIES;
  var I18N = window.I18N;
  var T = I18N.T; // 화면 글은 모두 T('한국어 원문') 으로 — 영어는 i18n.js (H-24)

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return T('{m}분 {s}초', { m: m, s: (s < 10 ? '0' : '') + s });
  }
  function findById(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  var current = 'scr-title';
  var returnTo = null;
  var backTo = null; // 'codex' · 'settings': 뒤로 가면 돌아갈 메뉴 화면
  var squadSel = [];
  var regionSel = 0;
  var diffSel = 0;
  var codexTab = 'gardener';
  var shopTab = 'gardener';
  var quitArmed = false;
  var lastResult = null;
  var lastCombo = 0; // 콤보가 끊기는 순간을 알려고 (onFx)
  var pickCount = 0;
  var toastTimer = 0;
  var langApplied = false;

  // ---------- 공통 ----------
  var navBusy = false;
  var navTimer = 0;
  var NAV_MS = 240;
  function calmUi() {
    if (Store.settings.reduceMotion) return true;
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  // CSS 애니메이션을 처음부터 다시 건다
  function replay(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  // 모든 화면·겹침 화면 전환은 여기를 거친다: 0.24초 흐려지며 밀려 들어오기(CSS .enter),
  // 그동안 버튼 누르기를 막는다(두 번 누르기 방지). 움직임 줄이기면 바로 바뀐다
  function view(id, on) {
    var el = $(id);
    if (!el) return;
    var isOverlay = el.classList.contains('overlay');
    if (isOverlay) {
      var wasHidden = el.classList.contains('hidden');
      el.classList.toggle('hidden', !on);
      if (!on || !wasHidden) return;
    } else {
      var list = document.querySelectorAll('.screen');
      for (var i = 0; i < list.length; i++) { list[i].classList.remove('active'); list[i].classList.remove('enter'); }
      el.classList.add('active');
      current = id;
      document.body.classList.toggle('on-title', id === 'scr-title');
      window.scrollTo(0, 0);
      if (window.Sky) window.Sky.screen(id);
      if (id === 'scr-battle') Game.resize();
    }
    if (calmUi()) { navBusy = false; return; }
    replay(el, 'enter');
    navBusy = true;
    clearTimeout(navTimer);
    navTimer = setTimeout(function () { navBusy = false; el.classList.remove('enter'); }, NAV_MS);
  }
  function show(id) { view(id, true); }
  function overlay(id, on) { view(id, on); }
  // 다른 파일의 겹침 화면(ads.js 대신 광고 창 #ov-ad)도 같은 전환을 거치게 밖에 내놓는다
  window.UI = window.UI || {};
  window.UI.view = view;
  // HUD 손맛 (열매 배지·울타리 막대): kind 'gain' 초록 번쩍+통통 / 'hurt' 빨강 번쩍+흔들림
  function bumpHud(id, kind) {
    var b = $(id);
    if (!b) return;
    replay(b, kind === 'hurt' ? 'fx-hurt' : 'fx-gain');
  }
  function onFx(kind, n, j) {
    if (kind === 'seed') bumpHud('hud-seeds', 'gain');
    else if (kind === 'plant') bumpHud('hud-seeds', 'gain');
    else if (kind === 'fence') { bumpHud('hud-fence', 'hurt'); replay($('field-wrap'), 'fx-hurt-edge'); }
    // 콤보는 판 오른쪽 위 알약(game.js render)이 보여 주고, 끊기면 판 가장자리가 번쩍인다
    // (콤보는 완벽!일 때만 오르고, 좋아!·놓침이면 끊긴다 — game.js beatResult)
    else if (kind === 'combo') {
      if (n === 0 && lastCombo >= 3) replay($('field-wrap'), 'fx-hurt-edge');
      lastCombo = n;
    }
  }
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2600);
  }
  function applySettings() {
    var root = document.documentElement;
    var s = Store.settings;
    // 언어: 바뀌었을 때만 콘텐츠 이름·설명과 index.html 글을 다시 끼운다 (첫 실행은 늘 한 번)
    if (s.lang !== I18N.lang() || !langApplied) {
      I18N.set(s.lang); langApplied = true;
      if (window.Ads && Ads.refresh) Ads.refresh(); // 화면에 있는 광고 버튼 글도 새 언어로 (H-27)
    }
    root.classList.toggle('text-small', s.textSize === 'small');
    root.classList.toggle('text-big', s.textSize === 'big');
    root.classList.toggle('reduce-motion', !!s.reduceMotion);
    if (window.Sky) window.Sky.refresh(); // 움직임 줄이기를 바꾸면 밤하늘도 멈추거나 다시 움직인다
  }
  function goBack() {
    Sound.play('click');
    if (returnTo === 'battle') {
      returnTo = null;
      show('scr-battle');
      // 옵션에서 언어를 바꿨을 수 있으니 판 둘레 글을 지금 언어로 다시 채운다 (판은 그대로)
      renderPauseInfo();
      renderWavePreview();
      updateHud();
      Tutorial.refresh();
      overlay('ov-pause', true);
      return;
    }
    if (current === 'scr-squad') { openRegion(); return; }
    // 도감 바로가기·옵션의 게임 방법에서 들어온 화면은 그 화면으로 돌아간다 (H-17)
    var to = backTo;
    backTo = null;
    if (to === 'codex' && current !== 'scr-codex') { openCodex(); return; }
    if (to === 'settings' && current !== 'scr-settings') { openSettings(); return; }
    openTitle();
  }

  // ---------- 시작 ----------
  function openTitle() {
    returnTo = null;
    backTo = null;
    var snap = Store.loadRun();
    var ok = snap && Game.snapshotValid(snap);
    if (snap && !ok) Store.clearRun();
    // 이어하기는 메뉴 4개의 자리·차례를 지키려고 숨기지 않고, 저장된 판이 없으면 흐리게 둔다 (H-17)
    var cont = $('btn-continue');
    cont.disabled = !ok;
    // 홈에는 스테이지·스토리 문구를 두지 않는다: 이어하기 안내에도 지역 이름·웨이브를 넣지 않는다 (H-18)
    cont.title = ok ? T('저장된 게임을 이어서 해요') : T('이어서 할 게임이 없어요');
    cont.setAttribute('aria-label', T('이어하기 ({t})', { t: cont.title }));
    show('scr-title');
  }

  // ---------- 지역 ----------
  function regionOpen(i) { return i === 0 || !!Store.meta.cleared[i - 1]; }
  // 난이도마다 "보통 ✔ 10/10" 처럼 한 줄
  function diffRecordText(i) {
    var M = Store.meta;
    return DIFFS.map(function (d, k) {
      var t = M.diffTime[i][k];
      return d.name + ' ' + (M.diffCleared[i][k] ? '✔ ' : '') + M.diffBest[i][k] + '/' + GD.WAVES + (t ? ' (' + fmtTime(t) + ')' : '');
    }).join(' · ');
  }
  function renderDiffTabs() {
    var box = $('diff-list');
    box.innerHTML = '';
    DIFFS.forEach(function (d, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = d.name;
      b.setAttribute('aria-pressed', k === diffSel ? 'true' : 'false');
      b.addEventListener('click', function () {
        diffSel = k;
        Store.meta.lastDiff = k;
        Store.save();
        Sound.play('click');
        openRegion();
      });
      box.appendChild(b);
    });
    var cur = DIFFS[diffSel];
    $('diff-desc').textContent = T('{name} — {desc} (안개 체력 ×{hp}, 안개 수 ×{count}, 은열매 ×{silver})',
      { name: cur.name, desc: cur.desc, hp: cur.hp, count: cur.count, silver: cur.silver });
  }
  function openRegion() {
    renderDiffTabs();
    var box = $('region-list');
    box.innerHTML = '';
    GD.REGIONS.forEach(function (reg, i) {
      var b = document.createElement('button');
      b.type = 'button';
      var open = regionOpen(i);
      var cleared = !!Store.meta.diffCleared[i][diffSel];
      b.className = cleared ? 'cleared' : '';
      b.style.setProperty('--rc', open ? reg.color : '#3a3a4a');
      b.innerHTML = '<span class="rnum" aria-hidden="true">' + (cleared ? '✔' : (open ? (i + 1) : '🔒')) + '</span>' +
        '<span class="rtxt"><span class="name">' + (cleared ? '✔ ' : '') + (i + 1) + '. ' + esc(reg.name) + '</span>' +
        '<span class="pdesc">' + esc(open ? reg.desc : T('앞 과수원을 되찾으면 열려요')) + '</span>' +
        (open ? '<small>' + esc(diffRecordText(i)) + '</small>' : '') + '</span>' +
        (open ? '<span class="rgo" aria-hidden="true">›</span>' : '');
      b.disabled = !open;
      b.addEventListener('click', function () { regionSel = i; Sound.important(); openSquad(); });
      box.appendChild(b);
    });
    show('scr-region');
  }

  // ---------- 편성 ----------
  function openSquad() {
    var M = Store.meta;
    if (!squadSel.length) {
      var last = Array.isArray(M.lastSquad) ? M.lastSquad.filter(function (id) { return M.unlocked.indexOf(id) >= 0; }) : [];
      squadSel = last.length ? last.slice(0, 3) : M.unlocked.slice(0, 3);
    }
    squadSel = squadSel.filter(function (id) { return M.unlocked.indexOf(id) >= 0; });
    renderSquad();
    show('scr-squad');
  }
  function renderSquad() {
    var M = Store.meta;
    var box = $('squad-list');
    box.innerHTML = '';
    GD.GARDENERS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      var have = M.unlocked.indexOf(g.id) >= 0;
      var on = squadSel.indexOf(g.id) >= 0;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.disabled = !have;
      b.innerHTML = '<span class="av' + (g.role === 'front' ? '' : ' back') + '" aria-hidden="true">' + (have ? (Art.html('gardener', g.id) || g.emoji) : '🔒') + '</span>' +
        '<span class="gtxt"><span class="gname">' + esc(g.name) + '</span>' +
        '<span class="role">' + (g.role === 'front' ? T('전열 · 근접') : T('후열 · 원거리')) + ' · ' + esc(g.skill.name) + '</span>' +
        (have ? '' : '<span class="role">' + T('작업실에서 영입할 수 있어요') + '</span>') + '</span>';
      b.addEventListener('click', function () {
        var k = squadSel.indexOf(g.id);
        if (k >= 0) squadSel.splice(k, 1);
        else if (squadSel.length < 3) squadSel.push(g.id);
        else { toast(T('정원사는 세 명까지 데려갈 수 있어요')); return; }
        Sound.play('click');
        renderSquad();
      });
      box.appendChild(b);
    });
    $('squad-count').textContent = squadSel.length + '/3';
    $('btn-go').disabled = squadSel.length === 0;
    // 위쪽 세 자리: 고른 정원사 얼굴
    var slots = $('squad-slots');
    slots.innerHTML = '';
    for (var k = 0; k < 3; k++) {
      var gd = squadSel[k] ? findById(GD.GARDENERS, squadSel[k]) : null;
      var s = document.createElement('span');
      s.className = 'sslot' + (gd ? ' on' : '');
      if (gd) s.innerHTML = Art.html('gardener', gd.id) || gd.emoji;
      else s.textContent = '+';
      slots.appendChild(s);
    }
  }

  // ---------- 전투 ----------
  function buildSkillBar(units) {
    var bar = $('skill-bar');
    bar.innerHTML = '';
    units.forEach(function (u, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'skill-' + i;
      b.setAttribute('aria-label', T('{name} 기술 {skill}', { name: u.name, skill: u.skill }));
      b.innerHTML = '<span class="sk-em" aria-hidden="true">' + (Art.html('gardener', u.id) || u.emoji) + '</span><span class="sk-name"></span><span class="sk-state"></span>';
      b.addEventListener('click', function () { Game.useSkill(i); });
      bar.appendChild(b);
    });
    updateSkillText(units);
    Game.resize(); // 기술 막대 높이가 생겼으니 판 높이를 다시 맞춘다
  }
  // 기술 버튼: 이름(키), 남은 시간, 다시 쓰기까지 어두운 막이 아래로 걷힌다(--cd)
  function updateSkillText(units) {
    units.forEach(function (u, i) {
      var b = $('skill-' + i);
      if (!b) return;
      var key = ['Q', 'W', 'E'][i] || '';
      var name = u.skill + ' (' + key + ')';
      var st = u.down ? T('쓰러짐') : (u.cd > 0 ? T('{n}초', { n: Math.ceil(u.cd) }) : T('사용 가능!'));
      var label = T('{name} 기술 {skill}', { name: u.name, skill: u.skill });
      if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label);
      var nEl = b.querySelector('.sk-name');
      var sEl = b.querySelector('.sk-state');
      if (nEl && nEl.textContent !== name) nEl.textContent = name;
      if (sEl && sEl.textContent !== st) sEl.textContent = st;
      var frac = u.down ? 1 : (u.cdMax > 0 ? Math.max(0, Math.min(1, u.cd / u.cdMax)) : 0);
      b.style.setProperty('--cd', frac.toFixed(3));
      var ready = !u.down && u.cd <= 0;
      b.disabled = !ready;
      b.classList.toggle('ready', ready);
    });
  }
  function updateHud() {
    var h = Game.hud();
    if (!h) return;
    // 울타리: 판 위 가는 막대 하나 (숫자는 일시정지 창에), 보호막이 있으면 막대가 푸르게
    var ff = h.fenceMax > 0 ? h.fence / h.fenceMax : 0;
    var pct = Math.round(Math.max(0, Math.min(1, ff)) * 100);
    var gauge = $('hud-fence');
    $('hud-fence-bar').style.width = pct + '%';
    gauge.classList.toggle('low', ff < 0.35);
    gauge.classList.toggle('shield', h.shield > 0);
    gauge.setAttribute('aria-valuenow', pct);
    gauge.title = T('울타리 {n}', { n: h.fence }) + (h.shield > 0 ? T(' + 보호막 {n}', { n: h.shield }) : '');
    var pouch = $('hud-seeds');
    if (pouch.textContent !== String(h.pouch)) pouch.textContent = h.pouch;
    pouch.classList.toggle('empty', h.pouch <= 0);
    // 열매가 없으면 심기 버튼을 누를 수 없다 (흐리게)
    var plants = document.querySelectorAll('.plant');
    for (var p = 0; p < plants.length; p++) plants[p].disabled = h.pouch <= 0;
    var bar = $('skill-bar');
    if (bar.children.length !== h.units.length) buildSkillBar(h.units);
    else updateSkillText(h.units);
  }
  // 물결 미리보기: "○ 안개솜 ×5 · ✦ 반딧안개 ×2 (날기)"
  // compact = 전투 화면 판 안 알약: 머리를 "웨이브 n/10" 으로 줄인다
  function previewHtml(p, compact) {
    if (!p || !p.list.length) return '';
    var head = compact ? T('웨이브 {n}', { n: p.wave + '/' + GD.WAVES })
      : T(p.upcoming ? '다음 웨이브 ({w}/{max})' : '이번 웨이브 ({w}/{max})', { w: p.wave, max: GD.WAVES });
    var items = p.list.map(function (x) {
      return '<span class="wp-item' + (x.boss ? ' boss' : '') + '"><b aria-hidden="true">' + esc(x.sym) + '</b> ' + esc(x.name) +
        ' ×' + x.n + (x.fly ? T(' (비행)') : '') + (x.boss ? T(' (우두머리)') : '') + '</span>';
    });
    return '<span class="wp-head">' + head + '</span> ' + items.join(' ');
  }
  function renderWavePreview() {
    var box = $('wave-preview');
    var p = Game.wavePreview();
    box.innerHTML = previewHtml(p, true);
    box.classList.toggle('hidden', !p || !p.list.length);
    // 판 안에 겹친 알약이라 판 크기는 바뀌지 않는다 (Game.resize 필요 없음)
  }
  function resetBattleUi() {
    overlay('ov-pick', false);
    overlay('ov-pause', false);
    overlay('ov-revive', false);
    pickCount = 0;
    lastCombo = 0;
    $('skill-bar').innerHTML = '';
    $('wave-preview').innerHTML = '';
  }
  function startBattle() {
    if (!squadSel.length) return;
    Store.meta.lastRegion = regionSel;
    Store.meta.lastSquad = squadSel.slice();
    Store.meta.lastDiff = diffSel;
    Store.save();
    resetBattleUi();
    show('scr-battle');
    var tut = Tutorial.start();
    Game.begin(regionSel, squadSel.slice(), { diff: diffSel, tutorial: tut });
    updateHud();
    renderWavePreview();
  }
  // 시작 버튼이 고르는 값: 지난번 과수원·난이도·정원사(열린 과수원·가진 정원사만), 처음이면 첫 과수원·보통·처음 정원사 셋
  function quickPick() {
    var M = Store.meta;
    var reg = M.lastRegion | 0;
    regionSel = reg >= 0 && reg < GD.REGIONS.length && regionOpen(reg) ? reg : 0;
    diffSel = M.lastDiff | 0;
    if (diffSel < 0 || diffSel >= DIFFS.length) diffSel = 0;
    var last = Array.isArray(M.lastSquad) ? M.lastSquad.filter(function (id) { return M.unlocked.indexOf(id) >= 0; }) : [];
    squadSel = (last.length ? last : M.unlocked).slice(0, 3);
  }
  function startDaily() {
    if (!Daily.canPlay()) { toast(T('오늘의 도전은 이미 끝났어요. 내일 다시 도전해 주세요')); openDaily(); return; }
    var d = Daily.info();
    Daily.markStarted();
    resetBattleUi();
    show('scr-battle');
    var tut = Tutorial.start();
    Game.begin(d.region, d.squad.slice(), { diff: d.diff, daily: d.date, seeded: true, seed: d.seed, tutorial: tut });
    updateHud();
    renderWavePreview();
  }
  function continueBattle() {
    var snap = Store.loadRun();
    if (!snap || !Game.snapshotValid(snap)) { Store.clearRun(); openTitle(); toast(T('이어서 할 게임이 없어요')); return; }
    if (!snap.daily) {
      regionSel = snap.region;
      squadSel = snap.squad.slice();
      diffSel = snap.diff | 0;
    }
    resetBattleUi();
    Tutorial.stop();
    show('scr-battle');
    if (!Game.resumeSaved(snap)) { openTitle(); toast(T('저장된 게임을 불러오지 못했어요')); return; }
    updateHud();
    renderWavePreview();
  }
  function pauseGame() {
    if (!Game.pause()) return;
    quitArmed = false;
    $('quit-msg').classList.add('hidden');
    renderPauseInfo();
    overlay('ov-pause', true);
  }
  function renderPauseInfo() {
    var h = Game.hud();
    $('pause-info').textContent = h ? (h.daily ? T('오늘의 도전 · ') : '') +
      T('{region} · {diff} · 웨이브 {w}/{max} · 울타리 {fence}', { region: h.region, diff: h.diff, w: h.wave, max: h.waves, fence: h.fence }) : '';
  }
  function resumeGame() {
    overlay('ov-pause', false);
    Game.resume();
  }
  function showPick(kind, ids, wave) {
    pickCount = ids.length;
    $('pick-title').textContent = kind === 'relic' ? T('보물 선택') : T('강화 선택');
    var left = GD.WAVES - wave;
    $('pick-sub').textContent = T('웨이브 {w} 방어 성공! ', { w: wave }) + (left > 0 ? T('과수원을 되찾기까지 {n}웨이브 남았어요. ', { n: left }) : '') +
      T('하나를 골라 주세요. (키보드 1~{n})', { n: ids.length });
    var box = $('pick-list');
    box.innerHTML = '';
    ids.forEach(function (id, i) {
      var d = Game.pickInfo(id);
      if (!d) return;
      var b = document.createElement('button');
      b.type = 'button';
      var rk = kind === 'relic' ? 3 : Math.max(1, Math.min(3, d.rare | 0));
      b.className = 'rare' + rk;
      var stars = d.rare ? '<span class="stars" aria-label="' + esc(T('등급 {n}', { n: d.rare })) + '">' + '★★★'.slice(0, d.rare) + '</span>' : '';
      if (d.beat) b.className += ' beat';
      var tag = d.beat ? '<span class="beat-tag">' + T('♪ 박자') + '</span>' : '';
      b.innerHTML = '<span class="pk-num" aria-hidden="true">' + (i + 1) + '</span><span class="pk-txt"><b>' + esc(d.name) + '</b>' + stars + tag +
        '<span class="pdesc">' + esc(d.desc) + '</span></span>';
      b.addEventListener('click', function () { Sound.important(); choosePick(i); });
      box.appendChild(b);
    });
    // 열매 충전 (보상형 자리 refill, H-29): 끝까지 보면 가진 열매 +3, 고르기는 그대로 이어서
    adSlot('pick-ad', 'refill', function (rw) {
      if (!Game.addPouch(rw.pouch)) return;
      updateHud();
      toast(T('열매 +{n}! 다음 웨이브에서 심어 보세요', { n: rw.pouch }));
    }, true);
    $('pick-preview').innerHTML = previewHtml(Game.wavePreview());
    overlay('ov-pause', false);
    overlay('ov-pick', true);
    updateHud();
  }
  function choosePick(i) {
    if (Game.state() !== 'picking') return;
    if (Game.choose(i)) {
      pickCount = 0;
      overlay('ov-pick', false);
      updateHud();
      renderWavePreview();
    }
  }

  // ---------- 보상형 광고 자리 (H-29) ----------
  // 상자 box 를 비우고 그 자리의 광고 버튼(ads.js Ads.button)을 하나 넣는다.
  // 횟수를 다 쓴 자리는 상자를 숨긴다. keep 이면 꺼진 버튼('다 썼어요')으로 남긴다 (충전 자리)
  function adSlot(boxId, id, onReward, keep) {
    var box = $(boxId);
    if (!box) return null;
    box.innerHTML = '';
    var A = window.Ads;
    var s = A && A.slot ? A.slot(id) : null;
    var open = !!s && (keep || A.left(id) !== 0);
    var b = open ? A.button(id, function (rw) { Sound.play('buy'); onReward(rw || s.reward); }) : null;
    if (b) box.appendChild(b);
    box.classList.toggle('hidden', !b);
    return b;
  }
  // 울타리가 무너졌을 때 (game.js goDown → onDown): 광고 보고 이어하기 또는 결과 보기
  function showRevive(info) {
    overlay('ov-pause', false);
    overlay('ov-pick', false);
    $('revive-sub').textContent = T('웨이브 {w}/{max}에서 울타리가 무너졌어요. 광고를 끝까지 보면 울타리 50%와 잠깐의 보호막으로 이번 웨이브를 이어서 할 수 있어요.', { w: info.wave, max: info.waves });
    var b = adSlot('revive-ad', 'revive', function () {
      overlay('ov-revive', false);
      if (Game.revive()) { updateHud(); renderWavePreview(); }
    });
    if (!b) { Game.giveUp(); return; } // 낼 수 없으면 지금까지처럼 바로 결과로
    overlay('ov-revive', true);
  }

  // ---------- 결과 ----------
  // 판 끝 → 결과 화면 (H-31, game.js endRun → onEnd): 결과 화면을 열기 전에 화면 전체를 덮는 전면 광고(자리 result)를 띄우고,
  // 닫히면 결과를 연다. 거절(3판에 한 번 차례가 아님 H-32·튜토리얼 판·보상형을 본 판·다른 광고 중)이면 Ads.interstitial 이 바로 cb 를 불러 곧장 결과로 간다
  function endToResult(res) {
    overlay('ov-pick', false);
    overlay('ov-pause', false);
    overlay('ov-revive', false);
    var A = window.Ads;
    if (!A || !A.interstitial) { showResult(res); return; }
    A.interstitial('result', function () { showResult(res); });
  }
  function showResult(res) {
    lastResult = res;
    overlay('ov-pick', false);
    overlay('ov-pause', false);
    overlay('ov-revive', false);
    returnTo = null;
    Tutorial.stop();
    var reg = GD.REGIONS[res.region];
    var df = DIFFS[res.diff] || DIFFS[0];
    $('res-title').textContent = res.win ? T('「{name}」 탈환 성공!', { name: reg.name }) : T('울타리가 무너졌어요');
    // 별: 지키면 1, 울타리가 절반 넘게 남으면 2, 한 번도 안 다치면 3
    var stars = !res.win ? 0 : (res.perfect ? 3 : ((res.fenceLeft || 0) >= 0.5 ? 2 : 1));
    var medal = $('res-medal');
    medal.textContent = res.win ? (stars === 3 ? '🏆' : '🌳') : '🌫️';
    medal.className = 'res-medal' + (res.win ? '' : ' lose');
    var sh = '';
    for (var si = 0; si < 3; si++) sh += '<span class="' + (si < stars ? 'on' : '') + '">★</span>';
    $('res-stars').innerHTML = res.win ? sh : '<small class="hint">' + esc(T('웨이브 {w}/{max}까지 버텼어요. 다른 강화를 골라 다시 도전해 보세요!', { w: res.waves, max: GD.WAVES })) + '</small>';
    $('res-stars').setAttribute('aria-label', res.win ? T('별 {n}개', { n: stars }) : '');
    function tile(label, value, wide) { return '<div class="rs' + (wide ? ' wide' : '') + '"><small>' + esc(label) + '</small><b>' + value + '</b></div>'; }
    var body = $('res-body');
    body.className = 'result-box ' + (res.win ? 'win' : 'lose');
    body.innerHTML =
      '<div class="rs-top">' + (res.daily ? esc(T('오늘의 도전 {d} · ', { d: res.daily })) : '') + esc(reg.name) + ' · ' + esc(T('난이도 {name}', { name: df.name })) + '</div>' +
      '<div class="rs-grid">' +
      tile(T('막아 낸 웨이브'), res.waves + '/' + GD.WAVES) +
      tile(T('물리친 안개'), res.kills + (res.bossKills ? esc(T(' (우두머리 {n})', { n: res.bossKills })) : '')) +
      tile(T('심은 열매'), res.planted) +
      tile(T('플레이 시간'), esc(fmtTime(res.time))) +
      tile(T('박자 판정'), esc(T('완벽 {a} · 좋아 {b} · 놓침 {c}', { a: res.perfects | 0, b: res.goods | 0, c: res.misses | 0 })), true) +
      tile(T('최대 콤보'), res.bestCombo | 0) +
      tile(T('돌려보낸 정령'), res.homeSent | 0) +
      tile(T('받은 은열매'), '<span id="res-silver">🌰 ' + res.silver + '</span>') +
      '</div>' +
      (res.perfect ? '<div class="rs-top rs-note">' + esc(T('울타리 무피해 클리어!')) + '</div>' : '') +
      '<span class="res-gain' + (res.win ? '' : ' lose') + '" aria-hidden="true">' + esc(T('+은열매 {n}', { n: res.silver })) + '</span>';
    // 결과 손맛: 이기면 금빛·지면 빨강 번쩍(fx-win/fx-lose), 진 판은 흔들림, 상자가 커지며 들어오고 은열매 숫자가 떠오른다
    replay(body, res.win ? 'fx-win' : 'fx-lose');
    // 클리어 보상 2배 (보상형 자리 double, H-29): 이긴 판만. 끝까지 보면 이번 판 은열매만큼 한 번 더 받는다
    var base = res.silver;
    if (res.win && base > 0) {
      adSlot('res-ad', 'double', function () {
        var M = Store.meta;
        M.silver += base;
        M.stats.silverTotal += base;
        res.silver = base * 2;
        var got = Game.checkAchievements();
        Store.save();
        var el = $('res-silver');
        if (el) { el.textContent = '🌰 ' + res.silver; replay(el.parentNode.parentNode, 'fx-gain'); }
        toast(T('은열매 {n}개를 더 받았어요', { n: base }) + (got.length ? T(' · 업적 달성: {list}', { list: got.join(', ') }) : ''));
      });
    } else adSlot('res-ad', '', null);
    if (res.daily) {
      $('res-best').textContent = T('오늘의 도전 최고 기록: 웨이브 {w}/{max} · 다음 도전은 내일 열려요', { w: res.bestWave, max: GD.WAVES });
    } else {
      $('res-best').textContent = (res.newBest ? T('최고 기록 경신! ') : '') + T('이 과수원({diff}) 최고 기록: 웨이브 {w}/{max}', { diff: df.name, w: res.bestWave, max: GD.WAVES }) +
        (res.bestTime ? T(' · 최단 클리어 {t}', { t: fmtTime(res.bestTime) }) : '');
    }
    $('res-achv').textContent = res.achievements.length ? T('업적 달성: {list}', { list: res.achievements.join(', ') }) : '';
    $('btn-again').textContent = res.daily ? T('오늘의 도전 보기') : T('다시 하기');
    $('share-box').classList.add('hidden');
    $('share-box').value = '';
    $('share-msg').classList.add('hidden');
    show('scr-result');
  }
  function shareResult() {
    if (!lastResult) return;
    var text = Daily.shareText(lastResult);
    Daily.copyText(text, $('share-box'), function (ok) {
      $('share-msg').classList.toggle('hidden', ok);
      if (ok) toast(T('결과를 복사했어요'));
      Sound.play('click');
    });
  }

  // ---------- 오늘의 도전 ----------
  function openDaily() {
    var d = Daily.info();
    var reg = GD.REGIONS[d.region];
    var df = DIFFS[d.diff] || DIFFS[0];
    $('daily-date').textContent = d.date;
    $('daily-info').innerHTML =
      esc(T('지역: {name} — {desc}', { name: reg.name, desc: reg.desc })) + '<br>' +
      esc(T('난이도: {name}', { name: df.name })) + '<br>' +
      esc(T('정원사: {list}', { list: Daily.squadNames(d.squad).join(', ') })) + '<br>' +
      esc(T('웨이브 10개 · 오늘은 모든 사람에게 같은 순서로 안개가 나와요'));
    var done = Daily.todayResult();
    var can = Daily.canPlay();
    var status;
    if (can) status = T('아직 도전하지 않았어요. 하루에 한 번만 도전할 수 있어요.');
    else if (done && done.done) status = T('오늘 결과: {r} · 웨이브 {w}/{max} · 물리친 안개 {k} · {t}', { r: done.win ? T('방어 성공') : T('방어 실패'), w: done.waves, max: GD.WAVES, k: done.kills, t: fmtTime(done.time) });
    else status = T('오늘의 도전이 진행 중이에요. 시작 화면의 이어하기를 눌러 계속하세요.');
    $('daily-status').textContent = status;
    var go = $('btn-daily-go');
    go.disabled = !can;
    go.textContent = can ? T('도전 시작') : T('내일 다시 도전할 수 있어요');
    var box = $('daily-log');
    box.innerHTML = '';
    var log = Store.meta.dailyLog.slice().reverse();
    if (!log.length) {
      var empty = document.createElement('div');
      empty.className = 'row locked';
      empty.innerHTML = '<div class="desc">' + esc(T('아직 기록이 없어요')) + '</div>';
      box.appendChild(empty);
    }
    log.forEach(function (x) {
      var row = document.createElement('div');
      row.className = 'row' + (x.win ? ' done' : '');
      var rg = GD.REGIONS[x.region] ? GD.REGIONS[x.region].name : '';
      var dn = DIFFS[x.diff] ? DIFFS[x.diff].name : '';
      row.innerHTML = '<div class="name">' + esc(x.date) + (x.win ? ' ✔' : '') + '</div><div class="desc">' + esc(rg + ' · ' + dn) +
        esc(T(' · 웨이브 {w}/{max} · 물리친 안개 {k} · {t}', { w: x.waves | 0, max: GD.WAVES, k: x.kills | 0, t: fmtTime(x.time) })) + '</div>';
      box.appendChild(row);
    });
    show('scr-daily');
  }

  // ---------- 도감 ----------
  function openCodex() {
    backTo = null;
    $('btn-daily').textContent = Daily.canPlay() ? T('📅 오늘의 도전') : T('📅 오늘의 도전 (완료)');
    renderCodex();
    show('scr-codex');
  }
  function renderCodex() {
    var M = Store.meta;
    var list;
    var seen;
    if (codexTab === 'gardener') { list = GD.GARDENERS; seen = M.unlocked; }
    else if (codexTab === 'enemy') { list = GD.ENEMIES; seen = M.codex.enemy; }
    else if (codexTab === 'boss') { list = GD.BOSSES; seen = M.codex.boss; }
    else if (codexTab === 'upgrade') { list = GD.UPGRADES; seen = M.codex.upgrade; }
    else { list = GD.RELICS; seen = M.codex.relic; }
    var tabs = $('codex-tabs').querySelectorAll('button');
    for (var t = 0; t < tabs.length; t++) tabs[t].setAttribute('aria-pressed', tabs[t].getAttribute('data-tab') === codexTab ? 'true' : 'false');
    var box = $('codex-list');
    box.innerHTML = '';
    var n = 0;
    list.forEach(function (d) {
      var known = seen.indexOf(d.id) >= 0;
      if (known) n++;
      var row = document.createElement('div');
      row.className = 'row' + (known ? '' : ' locked');
      var icon = d.emoji || d.sym || '';
      var extra = '';
      if (known && codexTab === 'gardener') extra = T(' · {role} · 기술 「{name}」 {desc}', { role: d.role === 'front' ? T('전열') : T('후열'), name: d.skill.name, desc: d.skill.desc });
      if (known && (codexTab === 'enemy' || codexTab === 'boss')) extra = T(' · 체력 {n}', { n: d.hp }) + (d.armor ? T(' · 방어력 {n}', { n: d.armor }) : '') + (d.fly ? T(' · 비행') : '');
      var art = known && codexTab !== 'upgrade' && codexTab !== 'relic' ? Art.html(codexTab, d.id) : '';
      row.innerHTML = '<span class="ico" aria-hidden="true">' + (known ? (art || esc(icon || '✦')) : '?') + '</span>' +
        '<div class="txt"><div class="name">' + (known ? esc(d.name) + (d.beat ? ' <span class="beat-tag">' + T('♪ 박자') + '</span>' : '') : '???') + '</div>' +
        '<div class="desc">' + (known ? esc(d.desc + extra) : esc(T('아직 발견하지 못했어요'))) + '</div></div>';
      box.appendChild(row);
    });
    $('codex-count').textContent = n + '/' + list.length;
  }

  // ---------- 업적 ----------
  function openAchv() {
    var M = Store.meta;
    var box = $('achv-list');
    box.innerHTML = '';
    GD.ACHIEVEMENTS.forEach(function (a) {
      var done = M.achv.indexOf(a.id) >= 0;
      var row = document.createElement('div');
      row.className = 'row' + (done ? ' done' : ' locked');
      row.innerHTML = '<span class="ico" aria-hidden="true">' + (done ? '🏆' : '🔒') + '</span>' +
        '<div class="txt"><div class="name">' + (done ? '✔ ' : '○ ') + esc(a.name) + '</div><div class="desc">' + esc(a.desc) + '</div></div>';
      box.appendChild(row);
    });
    $('achv-count').textContent = M.achv.length + '/' + GD.ACHIEVEMENTS.length;
    $('achv-bar').style.width = Math.round(M.achv.length / GD.ACHIEVEMENTS.length * 100) + '%';
    show('scr-achv');
  }

  // ---------- 기록 ----------
  function openStats() {
    var M = Store.meta;
    var st = M.stats;
    var rows = [
      ['플레이 횟수', st.runs], ['승리', st.wins], ['패배', st.losses],
      ['물리친 안개', st.kills], ['물리친 우두머리', st.bossKills], ['심은 열매', st.planted],
      ['막아 낸 웨이브', st.wavesCleared], ['평균 웨이브', st.runs ? (st.wavesCleared / st.runs).toFixed(1) : '0'],
      ['기술 사용 횟수', st.skillUses], ['고른 강화', st.upgradesPicked], ['한 줄 최다 열매', st.maxLaneSeeds],
      ['모은 은열매', st.silverTotal], ['무피해 승리', st.perfectWins], ['총 플레이 시간', fmtTime(st.playTime)],
      ['최대 콤보', st.bestCombo | 0], ['완벽! 판정 횟수', st.perfects | 0]
    ];
    var box = $('stats-list');
    box.innerHTML = '';
    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<div class="name">' + esc(T(r[0])) + '</div><div class="desc">' + esc(r[1]) + '</div>';
      box.appendChild(row);
    });
    GD.REGIONS.forEach(function (reg, i) {
      var row = document.createElement('div');
      row.className = 'row wide' + (M.cleared[i] ? ' done' : '');
      row.innerHTML = '<div class="name">' + esc(reg.name) + '</div><div class="desc">' + esc(diffRecordText(i)) + '</div>';
      box.appendChild(row);
    });
    var dl = M.dailyLog;
    var dWins = dl.filter(function (x) { return x.win; }).length;
    var dRow = document.createElement('div');
    dRow.className = 'row wide';
    dRow.innerHTML = '<div class="name">' + esc(T('오늘의 도전')) + '</div><div class="desc">' + esc(T('최근 {n}번 도전 · 성공 {w}번', { n: dl.length, w: dWins })) + '</div>';
    box.appendChild(dRow);
    show('scr-stats');
  }

  // ---------- 작업실 ----------
  function openShop() { renderShop(); show('scr-shop'); }
  function renderShop() {
    var M = Store.meta;
    $('shop-silver').textContent = T('은열매 {n}', { n: M.silver });
    // 재화 충전 (보상형 자리 silver, H-29): 하루 3번, 끝까지 보면 은열매 +30
    adSlot('shop-ad', 'silver', function (rw) {
      M.silver += rw.silver;
      M.stats.silverTotal += rw.silver;
      var got = Game.checkAchievements();
      Store.save();
      toast(T('은열매 +{n}!', { n: rw.silver }) + (got.length ? T(' · 업적 달성: {list}', { list: got.join(', ') }) : ''));
      renderShop();
    }, true);
    var tabs = $('shop-tabs').querySelectorAll('button');
    for (var t = 0; t < tabs.length; t++) tabs[t].setAttribute('aria-pressed', tabs[t].getAttribute('data-tab') === shopTab ? 'true' : 'false');
    var box = $('shop-list');
    box.innerHTML = '';
    var items = shopTab === 'gardener' ? GD.GARDENERS : GD.WORKSHOP;
    items.forEach(function (d) {
      var owned = shopTab === 'gardener' ? M.unlocked.indexOf(d.id) >= 0 : M.shop.indexOf(d.id) >= 0;
      var b = document.createElement('button');
      b.type = 'button';
      var label = shopTab === 'gardener' ? T('{name} ({role})', { name: d.name, role: d.role === 'front' ? T('전열') : T('후열') }) : d.name;
      var desc = shopTab === 'gardener' ? d.desc + T(' 기술 「{name}」 {desc}', { name: d.skill.name, desc: d.skill.desc }) : d.desc;
      b.innerHTML = '<span class="ico" aria-hidden="true">' + (shopTab === 'gardener' ? (Art.html('gardener', d.id) || d.emoji) : '🔧') + '</span>' +
        '<span class="txt"><b>' + esc(label) + '</b><span class="pdesc">' + esc(desc) + '</span></span>' +
        '<span class="price' + (owned ? ' owned' : '') + '">' + (owned ? (shopTab === 'gardener' ? T('✔ 영입함') : T('✔ 구매함')) : '🌰 ' + d.cost) + '</span>';
      b.disabled = owned || M.silver < d.cost;
      b.addEventListener('click', function () {
        if (owned || M.silver < d.cost) return;
        Sound.important();
        M.silver -= d.cost;
        if (shopTab === 'gardener') M.unlocked.push(d.id); else M.shop.push(d.id);
        var got = Game.checkAchievements();
        Store.save();
        Sound.play('buy');
        toast(T(shopTab === 'gardener' ? '{name} 영입 완료!' : '{name} 구매 완료!', { name: d.name }) + (got.length ? T(' · 업적 달성: {list}', { list: got.join(', ') }) : ''));
        renderShop();
      });
      box.appendChild(b);
    });
  }

  // ---------- 설정 ----------
  // 글은 [한국어, 영어] 짝 (같은 '작게' 도 음량은 Low, 글자는 Small 처럼 자리마다 영어가 달라서).
  // 언어 줄은 어느 언어에서도 찾을 수 있게 두 말로 쓰고, 값은 그 언어 자기 이름으로 둔다 (H-24)
  var ON_OFF = [['켜짐', 'On'], ['꺼짐', 'Off']];
  var SETTING_GROUPS = [
    { head: ['언어', 'Language'], rows: [
      { key: 'lang', label: ['언어 / Language', 'Language / 언어'], values: ['ko', 'en'], names: [['한국어', '한국어'], ['English', 'English']] }
    ] },
    { head: ['소리', 'Sound'], rows: [
      { key: 'sound', label: ['효과음', 'Sound effects'], values: [true, false], names: ON_OFF },
      { key: 'music', label: ['배경 음악', 'Music'], values: [true, false], names: ON_OFF },
      { key: 'volume', label: ['음량', 'Volume'], values: [0.3, 0.5, 0.7, 1], names: [['작게', 'Low'], ['조금 작게', 'Medium-low'], ['보통', 'Medium'], ['크게', 'High']] },
      { key: 'beatSound', label: ['박자 소리', 'Beat sound'], values: [true, false], names: ON_OFF },
      { key: 'vibrate', label: ['진동', 'Vibration'], values: [true, false], names: ON_OFF }
    ] },
    { head: ['화면·플레이', 'Display & Play'], rows: [
      { key: 'shake', label: ['화면 흔들림', 'Screen shake'], values: [true, false], names: ON_OFF },
      { key: 'reduceMotion', label: ['움직임 줄이기', 'Reduce motion'], values: [false, true], names: [ON_OFF[1], ON_OFF[0]] },
      { key: 'dmgNums', label: ['피해 숫자', 'Damage numbers'], values: [true, false], names: [['표시', 'Show'], ['숨김', 'Hide']] },
      { key: 'textSize', label: ['글자 크기', 'Text size'], values: ['small', 'mid', 'big'], names: [['작게', 'Small'], ['보통', 'Medium'], ['크게', 'Large']] },
      { key: 'speed', label: ['게임 속도', 'Game speed'], values: [1, 1.5, 2], names: [['보통', 'Normal'], ['1.5배', '1.5×'], ['2배', '2×']] },
      { key: 'beatWide', label: ['박자 판정', 'Beat timing window'], values: [false, true], names: [['보통', 'Normal'], ['넉넉하게', 'Wide']] }
    ] }
  ];
  function L(pair) { return I18N.pick(pair[0], pair[1]); }
  function openSettings() {
    $('wipe-confirm').classList.add('hidden');
    renderSettings();
    show('scr-settings');
  }
  function renderSettings() {
    var box = $('settings-list');
    box.innerHTML = '';
    SETTING_GROUPS.forEach(function (grp) {
      var h = document.createElement('h3');
      h.className = 'set-head';
      h.textContent = L(grp.head);
      box.appendChild(h);
      grp.rows.forEach(function (row) {
        var b = document.createElement('button');
        b.type = 'button';
        var idx = row.values.indexOf(Store.settings[row.key]);
        if (idx < 0) idx = 0;
        var label = L(row.label);
        var val = L(row.names[idx]);
        b.innerHTML = '<span>' + esc(label) + '</span><span class="val"' + (row.key === 'lang' ? ' lang="' + row.values[idx] + '"' : '') + '>' + esc(val) + '</span>';
        b.setAttribute('aria-label', label + ': ' + val);
        b.addEventListener('click', function () {
          var next = (row.values.indexOf(Store.settings[row.key]) + 1) % row.values.length;
          Store.settings[row.key] = row.values[next];
          Store.save();
          applySettings();
          Sound.play('click');
          renderSettings();
        });
        box.appendChild(b);
      });
    });
  }

  // ---------- 연결 ----------
  function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
  function init() {
    Store.load();
    applySettings();
    diffSel = Store.meta.lastDiff | 0;
    Game.init($('field'), {
      onHud: updateHud,
      onPick: showPick,
      onEnd: endToResult,
      onDown: showRevive,
      onWave: renderWavePreview,
      onFx: onFx,
      onAction: function (kind) { Tutorial.onAction(kind); }
    });

    // 전환 중에는 버튼 누르기를 막는다 (두 번 누르기 방지)
    document.addEventListener('click', function (e) {
      if (!navBusy) return;
      var t = e.target && e.target.closest ? e.target.closest('button') : null;
      if (t) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    // 누르는 동안 표시 (:active 가 잘 안 보이는 터치 기기용)
    function pressOff() {
      var list = document.querySelectorAll('button.pressed');
      for (var k = 0; k < list.length; k++) list[k].classList.remove('pressed');
    }
    document.addEventListener('pointerdown', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('button') : null;
      if (t && !t.disabled) t.classList.add('pressed');
    }, { passive: true });
    document.addEventListener('pointerup', pressOff, { passive: true });
    document.addEventListener('pointercancel', pressOff, { passive: true });

    // 시작은 지역·편성 화면을 거치지 않고 바로 판에 들어간다 (H-19). 과수원·정원사는 결과 화면 `바꾸기` 에서 고른다
    on('btn-start', function () {
      Sound.important();
      quickPick();
      startBattle();
    });
    on('btn-change', function () { Sound.play('click'); Tutorial.stop(); Game.leave(); openRegion(); });
    on('btn-daily', function () { Sound.play('click'); openDaily(); backTo = 'codex'; });
    on('btn-daily-go', function () { Sound.important(); startDaily(); });
    on('btn-share', shareResult);
    on('btn-tut-skip', function () { Sound.play('click'); Tutorial.skip(); });
    on('btn-tut-next', function () { Tutorial.next(); });
    on('btn-tutorial', function () {
      Sound.play('click');
      Tutorial.reset();
      toast(T('다음 게임을 시작할 때 튜토리얼이 다시 나와요'));
    });
    on('btn-continue', function () { Sound.important(); continueBattle(); });
    // 게임 방법은 옵션 화면, 업적·기록·작업실·오늘의 도전은 도감 화면 바로가기에서 연다 (H-17)
    on('btn-help', function () { Sound.play('click'); show('scr-help'); if (returnTo !== 'battle') backTo = 'settings'; });
    on('btn-shop', function () { Sound.play('click'); openShop(); backTo = 'codex'; });
    on('btn-codex', function () { Sound.play('click'); openCodex(); });
    on('btn-achv', function () { Sound.play('click'); openAchv(); backTo = 'codex'; });
    on('btn-stats', function () { Sound.play('click'); openStats(); backTo = 'codex'; });
    on('btn-settings', function () { Sound.play('click'); openSettings(); });
    on('btn-go', function () { Sound.important(); startBattle(); });
    on('btn-pause', function () { Sound.play('click'); pauseGame(); });
    on('btn-resume', function () { Sound.play('click'); resumeGame(); });
    on('btn-pause-help', function () { overlay('ov-pause', false); returnTo = 'battle'; show('scr-help'); });
    on('btn-pause-settings', function () { overlay('ov-pause', false); returnTo = 'battle'; openSettings(); });
    on('btn-quit', function () {
      Sound.important();
      if (!quitArmed) { quitArmed = true; $('quit-msg').classList.remove('hidden'); return; }
      quitArmed = false;
      overlay('ov-pause', false);
      Game.quit();
    });
    on('btn-again', function () {
      Sound.important();
      if (lastResult && lastResult.daily) { Game.leave(); openDaily(); return; }
      if (lastResult) { regionSel = lastResult.region; squadSel = lastResult.squad.slice(); diffSel = lastResult.diff | 0; }
      startBattle();
    });
    on('btn-revive-giveup', function () { Sound.play('click'); overlay('ov-revive', false); Game.giveUp(); });
    on('btn-home', function () { Sound.play('click'); Tutorial.stop(); Game.leave(); openTitle(); });
    on('btn-wipe', function () { $('wipe-confirm').classList.remove('hidden'); });
    on('btn-wipe-no', function () { $('wipe-confirm').classList.add('hidden'); });
    on('btn-wipe-yes', function () {
      Sound.important();
      Store.wipe();
      squadSel = [];
      $('wipe-confirm').classList.add('hidden');
      toast(T('모든 기록을 지웠어요'));
      renderSettings();
    });

    var backs = document.querySelectorAll('[data-back]');
    for (var i = 0; i < backs.length; i++) backs[i].addEventListener('click', goBack);

    var plants = document.querySelectorAll('.plant');
    for (var p = 0; p < plants.length; p++) {
      (function (btn) {
        btn.addEventListener('click', function () { Game.plant(parseInt(btn.getAttribute('data-lane'), 10)); });
      })(plants[p]);
    }
    var ctabs = $('codex-tabs').querySelectorAll('button');
    for (var c = 0; c < ctabs.length; c++) {
      ctabs[c].addEventListener('click', function () { codexTab = this.getAttribute('data-tab'); Sound.play('click'); renderCodex(); });
    }
    var stabs = $('shop-tabs').querySelectorAll('button');
    for (var s = 0; s < stabs.length; s++) {
      stabs[s].addEventListener('click', function () { shopTab = this.getAttribute('data-tab'); Sound.play('click'); renderShop(); });
    }

    document.addEventListener('keydown', function (e) {
      // 전환 중에는 판 조작 말고는 받지 않는다
      // 광고 창이 떠 있는 동안은 뒤 화면 키를 받지 않는다 (버튼으로만 닫힘)
      if (window.Ads && Ads.busy && Ads.busy()) { e.preventDefault(); return; }
      var playing = current === 'scr-battle' && $('ov-pick').classList.contains('hidden') && $('ov-pause').classList.contains('hidden');
      if (navBusy && !playing) { e.preventDefault(); return; }
      if (current === 'scr-battle') {
        // 이어하기 창: 고르는 것은 버튼으로만 (광고는 사람이 직접 누를 때만, H-28)
        if (!$('ov-revive').classList.contains('hidden')) return;
        if (!$('ov-pick').classList.contains('hidden')) {
          var n = parseInt(e.key, 10);
          if (n >= 1 && n <= pickCount) { choosePick(n - 1); e.preventDefault(); }
          return;
        }
        if (!$('ov-pause').classList.contains('hidden')) {
          if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { resumeGame(); e.preventDefault(); }
          return;
        }
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { pauseGame(); e.preventDefault(); return; }
        if (Game.handleKey(e.key)) e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        var back = document.querySelector('.screen.active [data-back]');
        if (back) back.click();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && Game.state() === 'running') pauseGame();
    });

    // 세로로 들면 '가로로 돌려 주세요' 안내(CSS)가 게임을 가린다. 전투 중이면 멈추고,
    // 가로로 돌리면 안내 때문에 멈춘 판만 바로 이어 간다 (사람이 직접 멈춘 판은 그대로 둔다)
    var portraitPaused = false;
    function isPortrait() {
      try { if (window.matchMedia) return window.matchMedia('(orientation: portrait)').matches; } catch (e) { /* 아래로 */ }
      return window.innerHeight > window.innerWidth;
    }
    function onOrient() {
      if (isPortrait()) {
        if (current === 'scr-battle' && Game.state() === 'running') { pauseGame(); portraitPaused = true; }
        return;
      }
      if (!portraitPaused) return;
      portraitPaused = false;
      if (current === 'scr-battle' && Game.state() === 'paused' && !$('ov-pause').classList.contains('hidden')) resumeGame();
      else Game.resize();
    }
    window.addEventListener('resize', onOrient);
    window.addEventListener('orientationchange', function () { setTimeout(onOrient, 120); });

    // 가로 고정 (H-07): 휴대폰에서 처음 터치하면 전체 화면으로 바꾸고 화면 방향을 가로로 잠근다.
    // 브라우저가 잠금을 막으면(아이폰 사파리 등) 위의 세로 안내가 그대로 대신한다.
    // 홈 화면에 올린 앱(standalone·fullscreen)은 전체 화면 없이 바로 잠근다. 앱 포장 때는 바깥 설정이 가로로 고정한다.
    var lockTried = false;
    function standalone() {
      try {
        if (window.matchMedia && (window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches)) return true;
      } catch (e) { /* 아래로 */ }
      return !!navigator.standalone;
    }
    function lockOrientation() {
      try {
        var so = screen.orientation;
        if (!so || typeof so.lock !== 'function') return;
        var p = so.lock('landscape');
        if (p && typeof p.catch === 'function') p.catch(function () { /* 잠그지 못하면 세로 안내로 */ });
      } catch (e) { /* 잠그지 못하면 세로 안내로 */ }
    }
    function lockLandscape() {
      if (standalone() || document.fullscreenElement || document.webkitFullscreenElement) { lockOrientation(); return; }
      var el = document.documentElement;
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) { lockOrientation(); return; }
      try {
        var p = req.call(el, { navigationUI: 'hide' });
        if (p && typeof p.then === 'function') p.then(lockOrientation, function () { /* 전체 화면을 막으면 세로 안내로 */ });
        else lockOrientation();
      } catch (e) { /* 전체 화면을 막으면 세로 안내로 */ }
    }
    document.addEventListener('pointerdown', function (e) {
      if (lockTried || e.pointerType !== 'touch') return;
      lockTried = true;
      lockLandscape();
    }, { passive: true });

    openTitle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

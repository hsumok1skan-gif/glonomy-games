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

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + '분 ' + (s < 10 ? '0' : '') + s + '초';
  }
  function findById(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  var current = 'scr-title';
  var returnTo = null;
  var squadSel = [];
  var regionSel = 0;
  var diffSel = 0;
  var codexTab = 'gardener';
  var shopTab = 'gardener';
  var quitArmed = false;
  var lastResult = null;
  var pickCount = 0;
  var toastTimer = 0;

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
  // HUD 칸 손맛: kind 'gain' 초록 번쩍+통통 / 'hurt' 빨강 번쩍+흔들림
  function bumpHud(id, kind) {
    var b = $(id);
    if (!b || !b.parentNode) return;
    replay(b.parentNode, kind === 'hurt' ? 'fx-hurt' : 'fx-gain');
  }
  function onFx(kind, n, j) {
    if (kind === 'seed') bumpHud('hud-seeds', 'gain');
    else if (kind === 'plant') bumpHud('hud-seeds', 'gain');
    else if (kind === 'fence') { bumpHud('hud-fence', 'hurt'); replay($('field-wrap'), 'fx-hurt-edge'); }
    else if (kind === 'combo') {
      $('hud-combo').textContent = n;
      if (j > 0) bumpHud('hud-combo', 'gain');
      else if (j === 0) bumpHud('hud-combo', 'hurt');
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
      overlay('ov-pause', true);
      return;
    }
    if (current === 'scr-squad') { openRegion(); return; }
    openTitle();
  }

  // ---------- 시작 ----------
  function openTitle() {
    returnTo = null;
    var snap = Store.loadRun();
    var ok = snap && Game.snapshotValid(snap);
    if (snap && !ok) Store.clearRun();
    $('btn-continue').classList.toggle('hidden', !ok);
    if (ok) {
      var tag = snap.daily ? '오늘의 도전' : GD.REGIONS[snap.region].name + ' · ' + (DIFFS[snap.diff | 0] || DIFFS[0]).name;
      $('btn-continue').textContent = '이어하기 (' + tag + ' · 웨이브 ' + (snap.wave + 1) + ')';
    }
    var M = Store.meta;
    var clearedN = M.cleared.filter(Boolean).length;
    $('title-silver').textContent = '은씨앗 ' + M.silver + ' · 되찾은 과수원 ' + clearedN + '/' + GD.REGIONS.length + ' · 업적 ' + M.achv.length + '/' + GD.ACHIEVEMENTS.length;
    $('title-silver-n').textContent = M.silver;
    $('title-achv-n').textContent = M.achv.length + '/' + GD.ACHIEVEMENTS.length;
    renderGoal();
    $('btn-daily').textContent = Daily.canPlay() ? '📅 오늘의 도전' : '📅 오늘의 도전 (완료)';
    show('scr-title');
  }
  // 시작 화면 목표 카드: 다음에 되찾을 과수원과 다섯 과수원 지도
  function nextGoalRegion() {
    for (var i = 0; i < GD.REGIONS.length; i++) if (!Store.meta.cleared[i]) return i;
    return -1;
  }
  function renderGoal() {
    var M = Store.meta;
    var next = nextGoalRegion();
    var title = $('title-goal');
    var desc = $('title-goal-desc');
    if (next < 0) {
      title.textContent = '다섯 과수원을 모두 되찾았어요!';
      desc.textContent = '이번에는 어려움이나 악몽 난이도로 더 짙은 안개에 맞서 보세요. 은씨앗을 더 많이 받을 수 있어요.';
    } else {
      var reg = GD.REGIONS[next];
      var best = M.diffBest[next][0] | 0;
      title.textContent = (next + 1) + '번째 과수원 「' + reg.name + '」 되찾기';
      desc.textContent = (next === 0 ? '밤안개가 다섯 과수원을 집어삼켰어요. ' : '') +
        '웨이브 10개를 막아 내면 이 과수원을 되찾고, 다음 과수원이 열려요.' +
        (best > 0 ? ' 최고 기록: 웨이브 ' + best + '/' + GD.WAVES : '');
    }
    var map = $('title-map');
    map.innerHTML = '';
    GD.REGIONS.forEach(function (reg, i) {
      var node = document.createElement('div');
      var done = !!M.cleared[i];
      node.className = 'map-node' + (done ? ' done' : (i === next ? ' next' : ''));
      node.innerHTML = '<span class="map-dot">' + (done ? '✔' : (i === next ? (i + 1) : '🔒')) + '</span><small>' + esc(reg.name) + '</small>';
      map.appendChild(node);
    });
    var span = GD.REGIONS.length - 1;
    var doneTo = next < 0 ? span : next;
    map.style.setProperty('--done', Math.round(doneTo / span * 100) + '%');
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
    $('diff-desc').textContent = cur.name + ' — ' + cur.desc + ' (안개 체력 ×' + cur.hp + ', 안개 수 ×' + cur.count + ', 은씨앗 ×' + cur.silver + ')';
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
        '<span class="pdesc">' + esc(open ? reg.desc : '앞 과수원을 되찾으면 열려요') + '</span>' +
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
        '<span class="role">' + (g.role === 'front' ? '전열 · 근접' : '후열 · 원거리') + ' · ' + esc(g.skill.name) + '</span>' +
        (have ? '' : '<span class="role">작업실에서 영입할 수 있어요</span>') + '</span>';
      b.addEventListener('click', function () {
        var k = squadSel.indexOf(g.id);
        if (k >= 0) squadSel.splice(k, 1);
        else if (squadSel.length < 3) squadSel.push(g.id);
        else { toast('정원사는 세 명까지 데려갈 수 있어요'); return; }
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
      b.setAttribute('aria-label', u.name + ' 기술 ' + u.skill);
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
      var st = u.down ? '쓰러짐' : (u.cd > 0 ? Math.ceil(u.cd) + '초' : '사용 가능!');
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
    $('hud-fence').textContent = h.fence + (h.shield > 0 ? '+' + h.shield : '');
    var ff = h.fenceMax > 0 ? h.fence / h.fenceMax : 0;
    $('hud-fence-bar').style.width = Math.round(Math.max(0, Math.min(1, ff)) * 100) + '%';
    $('hud-fence').parentNode.classList.toggle('low', ff < 0.35);
    $('hud-wave').textContent = h.wave + '/' + h.waves;
    $('hud-wave-bar').style.width = Math.round(Math.max(0, Math.min(1, h.wave / h.waves)) * 100) + '%';
    $('hud-seeds').textContent = h.pouch;
    $('hud-combo').textContent = h.combo;
    // 씨앗이 없으면 심기 버튼을 누를 수 없다 (흐리게)
    var plants = document.querySelectorAll('.plant');
    for (var p = 0; p < plants.length; p++) plants[p].disabled = h.pouch <= 0;
    var bar = $('skill-bar');
    if (bar.children.length !== h.units.length) buildSkillBar(h.units);
    else updateSkillText(h.units);
  }
  // 물결 미리보기: "○ 안개솜 ×5 · ✦ 반딧안개 ×2 (날기)"
  function previewHtml(p) {
    if (!p || !p.list.length) return '';
    var head = p.upcoming ? '다음 웨이브 (' + p.wave + '/' + GD.WAVES + ')' : '이번 웨이브 (' + p.wave + '/' + GD.WAVES + ')';
    var items = p.list.map(function (x) {
      return '<span class="wp-item' + (x.boss ? ' boss' : '') + '"><b aria-hidden="true">' + esc(x.sym) + '</b> ' + esc(x.name) +
        ' ×' + x.n + (x.fly ? ' (비행)' : '') + (x.boss ? ' (우두머리)' : '') + '</span>';
    });
    return '<span class="wp-head">' + head + '</span> ' + items.join(' ');
  }
  function renderWavePreview() {
    var box = $('wave-preview');
    var p = Game.wavePreview();
    box.innerHTML = previewHtml(p);
    box.classList.toggle('hidden', !p || !p.list.length);
    Game.resize(); // 미리보기 줄 수가 바뀌면 판 높이를 다시 맞춘다
  }
  function resetBattleUi() {
    overlay('ov-pick', false);
    overlay('ov-pause', false);
    pickCount = 0;
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
  function startDaily() {
    if (!Daily.canPlay()) { toast('오늘의 도전은 이미 끝났어요. 내일 다시 도전해 주세요'); openDaily(); return; }
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
    if (!snap || !Game.snapshotValid(snap)) { Store.clearRun(); openTitle(); toast('이어서 할 게임이 없어요'); return; }
    if (!snap.daily) {
      regionSel = snap.region;
      squadSel = snap.squad.slice();
      diffSel = snap.diff | 0;
    }
    resetBattleUi();
    Tutorial.stop();
    show('scr-battle');
    if (!Game.resumeSaved(snap)) { openTitle(); toast('저장된 게임을 불러오지 못했어요'); return; }
    updateHud();
    renderWavePreview();
  }
  function pauseGame() {
    if (!Game.pause()) return;
    quitArmed = false;
    $('quit-msg').classList.add('hidden');
    var h = Game.hud();
    $('pause-info').textContent = h ? (h.daily ? '오늘의 도전 · ' : '') + h.region + ' · ' + h.diff + ' · 웨이브 ' + h.wave + '/' + h.waves + ' · 울타리 ' + h.fence : '';
    overlay('ov-pause', true);
  }
  function resumeGame() {
    overlay('ov-pause', false);
    Game.resume();
  }
  function showPick(kind, ids, wave) {
    pickCount = ids.length;
    $('pick-title').textContent = kind === 'relic' ? '보물 선택' : '강화 선택';
    var left = GD.WAVES - wave;
    $('pick-sub').textContent = '웨이브 ' + wave + ' 방어 성공! ' + (left > 0 ? '과수원을 되찾기까지 ' + left + '웨이브 남았어요. ' : '') + '하나를 골라 주세요. (키보드 1~' + ids.length + ')';
    var box = $('pick-list');
    box.innerHTML = '';
    ids.forEach(function (id, i) {
      var d = Game.pickInfo(id);
      if (!d) return;
      var b = document.createElement('button');
      b.type = 'button';
      var rk = kind === 'relic' ? 3 : Math.max(1, Math.min(3, d.rare | 0));
      b.className = 'rare' + rk;
      var stars = d.rare ? '<span class="stars" aria-label="등급 ' + d.rare + '">' + '★★★'.slice(0, d.rare) + '</span>' : '';
      if (d.beat) b.className += ' beat';
      var tag = d.beat ? '<span class="beat-tag">♪ 박자</span>' : '';
      b.innerHTML = '<span class="pk-num" aria-hidden="true">' + (i + 1) + '</span><span class="pk-txt"><b>' + esc(d.name) + '</b>' + stars + tag +
        '<span class="pdesc">' + esc(d.desc) + '</span></span>';
      b.addEventListener('click', function () { Sound.important(); choosePick(i); });
      box.appendChild(b);
    });
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

  // ---------- 결과 ----------
  function showResult(res) {
    lastResult = res;
    overlay('ov-pick', false);
    overlay('ov-pause', false);
    returnTo = null;
    Tutorial.stop();
    var reg = GD.REGIONS[res.region];
    var df = DIFFS[res.diff] || DIFFS[0];
    $('res-title').textContent = res.win ? '「' + reg.name + '」 탈환 성공!' : '울타리가 무너졌어요';
    // 별: 지키면 1, 울타리가 절반 넘게 남으면 2, 한 번도 안 다치면 3
    var stars = !res.win ? 0 : (res.perfect ? 3 : ((res.fenceLeft || 0) >= 0.5 ? 2 : 1));
    var medal = $('res-medal');
    medal.textContent = res.win ? (stars === 3 ? '🏆' : '🌳') : '🌫️';
    medal.className = 'res-medal' + (res.win ? '' : ' lose');
    var sh = '';
    for (var si = 0; si < 3; si++) sh += '<span class="' + (si < stars ? 'on' : '') + '">★</span>';
    $('res-stars').innerHTML = res.win ? sh : '<small class="hint">웨이브 ' + res.waves + '/' + GD.WAVES + '까지 버텼어요. 다른 강화를 골라 다시 도전해 보세요!</small>';
    $('res-stars').setAttribute('aria-label', res.win ? '별 ' + stars + '개' : '');
    function tile(label, value, wide) { return '<div class="rs' + (wide ? ' wide' : '') + '"><small>' + esc(label) + '</small><b>' + value + '</b></div>'; }
    var body = $('res-body');
    body.className = 'result-box ' + (res.win ? 'win' : 'lose');
    body.innerHTML =
      '<div class="rs-top">' + (res.daily ? '오늘의 도전 ' + esc(res.daily) + ' · ' : '') + esc(reg.name) + ' · 난이도 ' + esc(df.name) + '</div>' +
      '<div class="rs-grid">' +
      tile('막아 낸 웨이브', res.waves + '/' + GD.WAVES) +
      tile('물리친 안개', res.kills + (res.bossKills ? ' (우두머리 ' + res.bossKills + ')' : '')) +
      tile('심은 씨앗', res.planted) +
      tile('플레이 시간', esc(fmtTime(res.time))) +
      tile('박자 판정', '완벽 ' + (res.perfects | 0) + ' · 좋아 ' + (res.goods | 0) + ' · 놓침 ' + (res.misses | 0), true) +
      tile('최대 콤보', res.bestCombo | 0) +
      tile('받은 은씨앗', '🌰 ' + res.silver) +
      '</div>' +
      (res.perfect ? '<div class="rs-top rs-note">울타리 무피해 클리어!</div>' : '') +
      '<span class="res-gain' + (res.win ? '' : ' lose') + '" aria-hidden="true">+은씨앗 ' + res.silver + '</span>';
    // 결과 손맛: 이기면 금빛·지면 빨강 번쩍(fx-win/fx-lose), 진 판은 흔들림, 상자가 커지며 들어오고 은씨앗 숫자가 떠오른다
    replay(body, res.win ? 'fx-win' : 'fx-lose');
    if (res.daily) {
      $('res-best').textContent = '오늘의 도전 최고 기록: 웨이브 ' + res.bestWave + '/' + GD.WAVES + ' · 다음 도전은 내일 열려요';
    } else {
      $('res-best').textContent = (res.newBest ? '최고 기록 경신! ' : '') + '이 과수원(' + df.name + ') 최고 기록: 웨이브 ' + res.bestWave + '/' + GD.WAVES +
        (res.bestTime ? ' · 최단 클리어 ' + fmtTime(res.bestTime) : '');
    }
    $('res-achv').textContent = res.achievements.length ? '업적 달성: ' + res.achievements.join(', ') : '';
    $('btn-again').textContent = res.daily ? '오늘의 도전 보기' : '다시 하기';
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
      if (ok) toast('결과를 복사했어요');
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
      '지역: ' + esc(reg.name) + ' — ' + esc(reg.desc) + '<br>' +
      '난이도: ' + esc(df.name) + '<br>' +
      '정원사: ' + esc(Daily.squadNames(d.squad).join(', ')) + '<br>' +
      '웨이브 10개 · 오늘은 모든 사람에게 같은 순서로 안개가 나와요';
    var done = Daily.todayResult();
    var can = Daily.canPlay();
    var status;
    if (can) status = '아직 도전하지 않았어요. 하루에 한 번만 도전할 수 있어요.';
    else if (done && done.done) status = '오늘 결과: ' + (done.win ? '방어 성공' : '방어 실패') + ' · 웨이브 ' + done.waves + '/' + GD.WAVES + ' · 물리친 안개 ' + done.kills + ' · ' + fmtTime(done.time);
    else status = '오늘의 도전이 진행 중이에요. 시작 화면의 이어하기를 눌러 계속하세요.';
    $('daily-status').textContent = status;
    var go = $('btn-daily-go');
    go.disabled = !can;
    go.textContent = can ? '도전 시작' : '내일 다시 도전할 수 있어요';
    var box = $('daily-log');
    box.innerHTML = '';
    var log = Store.meta.dailyLog.slice().reverse();
    if (!log.length) {
      var empty = document.createElement('div');
      empty.className = 'row locked';
      empty.innerHTML = '<div class="desc">아직 기록이 없어요</div>';
      box.appendChild(empty);
    }
    log.forEach(function (x) {
      var row = document.createElement('div');
      row.className = 'row' + (x.win ? ' done' : '');
      var rg = GD.REGIONS[x.region] ? GD.REGIONS[x.region].name : '';
      var dn = DIFFS[x.diff] ? DIFFS[x.diff].name : '';
      row.innerHTML = '<div class="name">' + esc(x.date) + (x.win ? ' ✔' : '') + '</div><div class="desc">' + esc(rg + ' · ' + dn) +
        ' · 웨이브 ' + (x.waves | 0) + '/' + GD.WAVES + ' · 물리친 안개 ' + (x.kills | 0) + ' · ' + fmtTime(x.time) + '</div>';
      box.appendChild(row);
    });
    show('scr-daily');
  }

  // ---------- 도감 ----------
  function openCodex() { renderCodex(); show('scr-codex'); }
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
      if (known && codexTab === 'gardener') extra = ' · ' + (d.role === 'front' ? '전열' : '후열') + ' · 기술 「' + d.skill.name + '」 ' + d.skill.desc;
      if (known && (codexTab === 'enemy' || codexTab === 'boss')) extra = ' · 체력 ' + d.hp + (d.armor ? ' · 방어력 ' + d.armor : '') + (d.fly ? ' · 비행' : '');
      var art = known && codexTab !== 'upgrade' && codexTab !== 'relic' ? Art.html(codexTab, d.id) : '';
      row.innerHTML = '<span class="ico" aria-hidden="true">' + (known ? (art || esc(icon || '✦')) : '?') + '</span>' +
        '<div class="txt"><div class="name">' + (known ? esc(d.name) + (d.beat ? ' <span class="beat-tag">♪ 박자</span>' : '') : '???') + '</div>' +
        '<div class="desc">' + (known ? esc(d.desc + extra) : '아직 발견하지 못했어요') + '</div></div>';
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
      ['물리친 안개', st.kills], ['물리친 우두머리', st.bossKills], ['심은 씨앗', st.planted],
      ['막아 낸 웨이브', st.wavesCleared], ['평균 웨이브', st.runs ? (st.wavesCleared / st.runs).toFixed(1) : '0'],
      ['기술 사용 횟수', st.skillUses], ['고른 강화', st.upgradesPicked], ['한 줄 최다 씨앗', st.maxLaneSeeds],
      ['모은 은씨앗', st.silverTotal], ['무피해 승리', st.perfectWins], ['총 플레이 시간', fmtTime(st.playTime)],
      ['최대 콤보', st.bestCombo | 0], ['완벽! 판정 횟수', st.perfects | 0]
    ];
    var box = $('stats-list');
    box.innerHTML = '';
    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<div class="name">' + esc(r[0]) + '</div><div class="desc">' + esc(r[1]) + '</div>';
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
    dRow.innerHTML = '<div class="name">오늘의 도전</div><div class="desc">최근 ' + dl.length + '번 도전 · 성공 ' + dWins + '번</div>';
    box.appendChild(dRow);
    show('scr-stats');
  }

  // ---------- 작업실 ----------
  function openShop() { renderShop(); show('scr-shop'); }
  function renderShop() {
    var M = Store.meta;
    $('shop-silver').textContent = '은씨앗 ' + M.silver;
    var tabs = $('shop-tabs').querySelectorAll('button');
    for (var t = 0; t < tabs.length; t++) tabs[t].setAttribute('aria-pressed', tabs[t].getAttribute('data-tab') === shopTab ? 'true' : 'false');
    var box = $('shop-list');
    box.innerHTML = '';
    var items = shopTab === 'gardener' ? GD.GARDENERS : GD.WORKSHOP;
    items.forEach(function (d) {
      var owned = shopTab === 'gardener' ? M.unlocked.indexOf(d.id) >= 0 : M.shop.indexOf(d.id) >= 0;
      var b = document.createElement('button');
      b.type = 'button';
      var label = shopTab === 'gardener' ? d.name + ' (' + (d.role === 'front' ? '전열' : '후열') + ')' : d.name;
      var desc = shopTab === 'gardener' ? d.desc + ' 기술 「' + d.skill.name + '」 ' + d.skill.desc : d.desc;
      b.innerHTML = '<span class="ico" aria-hidden="true">' + (shopTab === 'gardener' ? (Art.html('gardener', d.id) || d.emoji) : '🔧') + '</span>' +
        '<span class="txt"><b>' + esc(label) + '</b><span class="pdesc">' + esc(desc) + '</span></span>' +
        '<span class="price' + (owned ? ' owned' : '') + '">' + (owned ? (shopTab === 'gardener' ? '✔ 영입함' : '✔ 구매함') : '🌰 ' + d.cost) + '</span>';
      b.disabled = owned || M.silver < d.cost;
      b.addEventListener('click', function () {
        if (owned || M.silver < d.cost) return;
        Sound.important();
        M.silver -= d.cost;
        if (shopTab === 'gardener') M.unlocked.push(d.id); else M.shop.push(d.id);
        var got = Game.checkAchievements();
        Store.save();
        Sound.play('buy');
        toast((shopTab === 'gardener' ? d.name + ' 영입 완료!' : d.name + ' 구매 완료!') + (got.length ? ' · 업적 달성: ' + got.join(', ') : ''));
        renderShop();
      });
      box.appendChild(b);
    });
  }

  // ---------- 설정 ----------
  var SETTING_ROWS = [
    { key: 'sound', label: '효과음', values: [true, false], names: ['켜짐', '꺼짐'] },
    { key: 'music', label: '배경 음악', values: [true, false], names: ['켜짐', '꺼짐'] },
    { key: 'volume', label: '음량', values: [0.3, 0.5, 0.7, 1], names: ['작게', '조금 작게', '보통', '크게'] },
    { key: 'vibrate', label: '진동', values: [true, false], names: ['켜짐', '꺼짐'] },
    { key: 'shake', label: '화면 흔들림', values: [true, false], names: ['켜짐', '꺼짐'] },
    { key: 'reduceMotion', label: '움직임 줄이기', values: [false, true], names: ['꺼짐', '켜짐'] },
    { key: 'dmgNums', label: '피해 숫자', values: [true, false], names: ['표시', '숨김'] },
    { key: 'speed', label: '게임 속도', values: [1, 1.5, 2], names: ['보통', '1.5배', '2배'] },
    { key: 'textSize', label: '글자 크기', values: ['small', 'mid', 'big'], names: ['작게', '보통', '크게'] },
    { key: 'beatSound', label: '박자 소리', values: [true, false], names: ['켜짐', '꺼짐'] },
    { key: 'beatWide', label: '박자 판정', values: [false, true], names: ['보통', '넉넉하게'] }
  ];
  function openSettings() {
    $('wipe-confirm').classList.add('hidden');
    renderSettings();
    show('scr-settings');
  }
  function renderSettings() {
    var box = $('settings-list');
    box.innerHTML = '';
    SETTING_ROWS.forEach(function (row) {
      var b = document.createElement('button');
      b.type = 'button';
      var idx = row.values.indexOf(Store.settings[row.key]);
      if (idx < 0) idx = 0;
      b.innerHTML = '<span>' + esc(row.label) + '</span><span class="val">' + esc(row.names[idx]) + '</span>';
      b.setAttribute('aria-label', row.label + ': ' + row.names[idx]);
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
      onEnd: showResult,
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

    on('btn-start', function () {
      Sound.important();
      // 처음 하는 사람은 지역·편성 화면 없이 첫 지역·보통·처음 정원사 셋으로 바로 판에 들어간다
      if (Store.meta.stats.runs === 0 && Tutorial.needed()) {
        regionSel = 0;
        diffSel = 0;
        squadSel = Store.meta.unlocked.slice(0, 3);
        startBattle();
        return;
      }
      openRegion();
    });
    on('btn-daily', function () { Sound.play('click'); openDaily(); });
    on('btn-daily-go', function () { Sound.important(); startDaily(); });
    on('btn-share', shareResult);
    on('btn-tut-skip', function () { Sound.play('click'); Tutorial.skip(); });
    on('btn-tutorial', function () {
      Sound.play('click');
      Tutorial.reset();
      toast('다음 게임을 시작할 때 튜토리얼이 다시 나와요');
    });
    on('btn-continue', function () { Sound.important(); continueBattle(); });
    on('btn-help', function () { Sound.play('click'); show('scr-help'); });
    on('btn-shop', function () { Sound.play('click'); openShop(); });
    on('btn-codex', function () { Sound.play('click'); openCodex(); });
    on('btn-achv', function () { Sound.play('click'); openAchv(); });
    on('btn-stats', function () { Sound.play('click'); openStats(); });
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
    on('btn-home', function () { Sound.play('click'); Tutorial.stop(); Game.leave(); openTitle(); });
    on('btn-wipe', function () { $('wipe-confirm').classList.remove('hidden'); });
    on('btn-wipe-no', function () { $('wipe-confirm').classList.add('hidden'); });
    on('btn-wipe-yes', function () {
      Sound.important();
      Store.wipe();
      squadSel = [];
      $('wipe-confirm').classList.add('hidden');
      toast('모든 기록을 지웠어요');
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
      var playing = current === 'scr-battle' && $('ov-pick').classList.contains('hidden') && $('ov-pause').classList.contains('hidden');
      if (navBusy && !playing) { e.preventDefault(); return; }
      if (current === 'scr-battle') {
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

    openTitle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

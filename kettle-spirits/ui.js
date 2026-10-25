'use strict';
/* Kettle Spirits — 화면·입력·손맛. 규칙은 game.js 의 Game 함수만 부른다 */
var UI = (function () {
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var M = null;              // Store.meta()
  var cur = 'scr-title';
  var stack = [];
  var busy = false;          // 화면 전환 중 (두 번 누르기 막기)
  var inputLock = false;     // 싸움 끝 연출 중
  var testing = false;
  var timers = [];
  var cursor = 0;
  var selPot = 'white';
  var codexTab = 'spirit';
  var wipeArmed = false, quitArmed = false;
  var tutStep = -1;
  var lastTap = 0;
  var clock = null;

  var RUN_SCREENS = ['scr-battle', 'scr-map', 'scr-rest', 'scr-shop', 'scr-event', 'scr-result'];
  var KEYS = ['q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'];
  var INTENT = {
    hit: { sym: '💢', name: '화풀이' }, drain: { sym: '🌀', name: '꿰뚫는 화풀이' }, guard: { sym: '🛡', name: '막이' },
    rage: { sym: '😤', name: '화 돋우기' }, sulk: { sym: '💧', name: '화 되찾기' }, lock: { sym: '🔒', name: '선반 잠그기' },
    clutter: { sym: '🍂', name: '낙엽 넣기' }
  };
  var NODE = {
    battle: { sym: '🍵', name: '정령 손님', desc: '성난 정령을 달랩니다. 비법 하나를 얻습니다.' },
    elite: { sym: '🔥', name: '잔뜩 성난 정령', desc: '힘들지만 찻잔 하나를 고를 수 있습니다.' },
    boss: { sym: '👑', name: '계절의 우두머리', desc: '' },
    rest: { sym: '🛋', name: '쉼터', desc: '평온을 되찾거나 잎을 다듬습니다.' },
    shop: { sym: '🏮', name: '장터', desc: '엽전으로 잎과 찻잔을 삽니다.' },
    event: { sym: '❔', name: '길에서 만난 일', desc: '무슨 일이 생길지 모릅니다.' }
  };

  /* ---------- 공통 ---------- */

  function later(fn, ms) {
    var id = setTimeout(function () {
      var i = timers.indexOf(id);
      if (i >= 0) timers.splice(i, 1);
      if (!testing) fn();
    }, ms);
    timers.push(id);
    return id;
  }
  function S(id) { return M.settings[id]; }
  function reduce() { return !!S('reduce'); }
  function speed(ms) { return S('fast') ? Math.round(ms * 0.5) : ms; }
  function isOpen(id) { var el = document.getElementById(id); return !!(el && el.classList.contains('open')); }
  function vibrate(ms) {
    if (!S('vibrate')) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 진동이 없는 기기 */ }
  }
  function toast(text) {
    var t = $('#toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toast.id);
    toast.id = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }
  function leafDesc(L, value) { return L.desc.replace(/\{v\}/g, value); }
  function fmtTime(sec) { sec = Math.round(sec || 0); var m = Math.floor(sec / 60), s = sec % 60; return m + '분 ' + (s < 10 ? '0' : '') + s + '초'; }

  /* ---------- 화면 전환: 모든 화면·겹침 화면이 이 함수를 거친다 ---------- */

  function swap(el, on) {
    if (!el) return;
    var cls = el.classList.contains('overlay') ? 'open' : 'active';
    if (on) {
      el.classList.remove('leaving');
      el.classList.add(cls);
    } else if (el.classList.contains(cls)) {
      el.classList.remove(cls);
      if (cls === 'active' && !reduce()) {
        el.classList.add('leaving');
        setTimeout(function () { el.classList.remove('leaving'); }, 260);
      }
    }
    if (!reduce()) {
      busy = true;
      clearTimeout(swap.id);
      swap.id = setTimeout(function () { busy = false; }, 240);
    }
  }

  function show(id, opts) {
    opts = opts || {};
    if (busy && !opts.force) return false;
    var nw = document.getElementById(id);
    if (!nw) return false;
    if (id === cur) { renderScreen(id); return true; }
    if (opts.stack) stack.push(cur);
    renderScreen(id);
    swap(document.getElementById(cur), false);
    swap(nw, true);
    cur = id;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    return true;
  }

  function openOv(id) {
    renderScreen(id);
    swap(document.getElementById(id), true);
  }
  function closeOv(id) { swap(document.getElementById(id), false); }

  function phaseScreen() {
    var R = Game.run();
    if (!R) return 'scr-title';
    switch (R.phase) {
      case 'battle': case 'reward': return 'scr-battle';
      case 'map': return 'scr-map';
      case 'rest': return 'scr-rest';
      case 'shop': return 'scr-shop';
      case 'event': return 'scr-event';
      case 'over': return 'scr-result';
    }
    return 'scr-title';
  }

  function goPhase() {
    var R = Game.run();
    stack = [];
    show(phaseScreen(), { force: true });
    if (R && R.phase === 'reward') openOv('ov-reward'); else closeOv('ov-reward');
    if (R && R.phase === 'battle') {
      if (!M.tutDone && tutStep < 0) startTut(); else if (tutStep >= 0) showTut();
    } else {
      $$('.tut-focus').forEach(function (el) { el.classList.remove('tut-focus'); });
      $('#ov-tut').classList.add('hidden');
    }
  }

  function back() {
    var to = stack.pop() || 'scr-title';
    if (RUN_SCREENS.indexOf(to) >= 0) { goPhase(); return; }
    show(to, { force: true });
  }

  function renderScreen(id) {
    switch (id) {
      case 'scr-title': renderTitle(); break;
      case 'scr-help': renderHelp(); break;
      case 'scr-settings': renderSettings(); break;
      case 'scr-pot': renderPots(); break;
      case 'scr-map': renderMap(); break;
      case 'scr-battle': renderBattle(); break;
      case 'scr-rest': renderRest(); break;
      case 'scr-shop': renderShop(); break;
      case 'scr-event': renderEvent(); break;
      case 'scr-result': renderResult(); break;
      case 'scr-codex': renderCodex(); break;
      case 'scr-achv': renderAchv(); break;
      case 'scr-stats': renderStats(); break;
      case 'scr-upgrade': renderUpgrade(); break;
      case 'ov-reward': renderReward(); break;
      case 'ov-bag': renderBag(); break;
      case 'ov-pause': $('#quit-note').classList.add('hidden'); quitArmed = false; break;
    }
  }

  /* ---------- 시작·방법·설정 ---------- */

  function renderTitle() {
    var has = !!(M.run && !M.run.over);
    $('#btn-continue').classList.toggle('hidden', !has);
    $('#title-ginkgo').textContent = M.ginkgo;
    var b = M.stats.bestStage;
    $('#title-best').textContent = b > Game.STAGE_MAX ? '사계절 완주' : (b ? b + '단계' : '-');
    renderDailyButton();
  }

  function stageText(won, stage) {
    return won ? '사계절 완주' : DATA.SEASONS[Game.seasonOf(stage)].name + ' ' + stage + '단계';
  }

  function renderDailyButton() {
    var d = Game.dailyInfo();
    var btn = $('#btn-daily');
    var label = '오늘의 도전', sub = d.twist.name;
    if (d.inProgress) label = '오늘의 도전 이어하기';
    else if (d.played) {
      label = '오늘의 도전 ✓';
      sub = d.result ? stageText(d.result.won, d.result.stage) + ' · 내일 새 판' : '내일 새 판이 열립니다';
    }
    $('#daily-label').textContent = label;
    $('#daily-sub').textContent = sub;
    btn.classList.toggle('played', d.played && !d.inProgress);
    btn.setAttribute('aria-label', label + ' — ' + d.date + ' 바람: ' + d.twist.name + ' (' + d.twist.desc + ')');
  }

  function tileHTML(k, extra, label, attrs) {
    var L = Game.LEAF[k];
    return '<button class="tile k-' + k + (extra ? ' ' + extra : '') + '" ' + (attrs || '') + ' aria-label="' + esc(L.name + (label ? ' ' + label : '')) + '">' +
      '<span>' + L.sym + '</span><span class="tl">' + esc(L.name.charAt(0)) + '</span></button>';
  }

  function renderHelp() {
    var html = DATA.LEAVES.map(function (L) {
      return '<div class="leaf-row">' + tileHTML(L.id, '', '', 'disabled') + '<div><b>' + esc(L.name) + '</b>' + (L.base ? '' : ' <span class="note">(찻집 개량으로 열기)</span>') +
        '<br>' + esc(leafDesc(L, L.v)) + '</div></div>';
    }).join('');
    html += '<div class="leaf-row">' + tileHTML('junk', '', '', 'disabled') + '<div><b>낙엽</b><br>' + esc(DATA.JUNK.desc) + '</div></div>';
    $('#help-leaves').innerHTML = html;
  }

  function renderSettings() {
    $('#settings-list').innerHTML = DATA.SETTINGS.map(function (s) {
      var v = S(s.id);
      var label = s.type === 'bool' ? (v ? '켬' : '끔') : s.opts[v];
      return '<div class="set-row"><span>' + esc(s.name) + '</span><button class="btn small' + (s.type === 'bool' && v ? ' primary' : '') + '" data-act="set:' + s.id + '">' + label + '</button></div>';
    }).join('');
    $('#wipe-confirm').classList.add('hidden');
    wipeArmed = false;
  }

  function applySettings() {
    document.body.classList.toggle('reduce', !!S('reduce'));
    document.body.classList.toggle('big', !!S('big'));
    Sfx.setOn(!!S('sound'));
    Sfx.setVolume(S('volume'));
  }

  function toggleSetting(id) {
    var s = DATA.SETTINGS.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    if (s.type === 'bool') M.settings[id] = !S(id);
    else M.settings[id] = (S(id) + 1) % s.opts.length;
    applySettings();
    if (!Store.save()) toast('설정을 저장하지 못했습니다. 이번에만 적용됩니다.');
    renderSettings();
  }

  /* ---------- 주전자·길 ---------- */

  function renderPots() {
    if (!M.pots[selPot]) selPot = 'white';
    $('#pot-list').innerHTML = DATA.POTS.map(function (p) {
      var open = !!M.pots[p.id];
      return '<button class="btn pot-card' + (p.id === selPot ? ' sel' : '') + '" data-act="pot:' + p.id + '"' + (open ? '' : ' disabled') + '>' +
        '<span class="pot-sym">' + (open ? p.sym : '🔒') + '</span><span class="pot-name">' + esc(p.name) + '</span>' +
        '<span class="pot-info">' + esc(open ? p.desc : '찻집 개량에서 은행잎 ' + p.cost + '로 엽니다.') + '</span></button>';
    }).join('');
    var sp = Game.POT[selPot];
    $('#pot-desc').textContent = sp.name + ' — 찻잔 기술 「' + sp.skillName + '」: ' + sp.skillDesc;
  }

  function renderMap() {
    var R = Game.run();
    if (!R) return;
    var dots = '';
    for (var i = 1; i <= Game.STAGE_MAX; i++) {
      var cls = i < R.stage ? 'done' : (i === R.stage ? 'now' : '');
      if (i % 3 === 0) cls += ' boss';
      dots += '<span class="map-dot ' + cls + '">' + (i % 3 === 0 ? '👑' : i) + '</span>';
      if (i < Game.STAGE_MAX) dots += (i % 3 === 0 ? '<span class="map-gap"></span><span class="map-gap"></span>' : '<span class="map-gap"></span>');
    }
    $('#map-path').innerHTML = dots;
    var s = DATA.SEASONS[Game.seasonOf(R.stage)];
    var tw = Game.twist();
    $('#map-title').textContent = (R.daily ? '오늘의 도전 · ' : '') + s.name + ' · ' + R.stage + '단계';
    $('#map-sub').textContent = (tw ? '바람: ' + tw.name + ' — ' : s.sub + ' — ') + '다음으로 갈 곳을 고르세요.';
    $('#map-hp').textContent = '평온 ' + R.hp + '/' + R.maxHp;
    $('#map-coins').textContent = '엽전 ' + R.coins;
    $('#node-list').innerHTML = R.nodeOpts.map(function (k, j) {
      var n = NODE[k];
      var desc = k === 'boss' ? DATA.BOSSES[Game.seasonOf(R.stage)].name + '이(가) 기다립니다.' : n.desc;
      return '<button class="btn node-card" data-act="node:' + j + '"><span class="node-sym">' + n.sym + '</span><span class="node-name">' + esc(n.name) + '</span>' +
        '<span class="node-desc">' + esc(desc) + '</span><span class="note">' + (j + 1) + '</span></button>';
    }).join('');
  }

  /* ---------- 싸움 ---------- */

  function spiritHTML(sp, i, isFront, season) {
    var it = sp.done ? null : Game.intentOf(sp);
    var pct = Math.round(100 * sp.hp / sp.maxHp);
    var val = '';
    if (it) {
      if (it.k === 'rage' || it.k === 'sulk' || it.k === 'guard') val = '+' + it.v;
      else if (it.k === 'lock') val = it.v + '칸';
      else if (it.k === 'clutter') val = it.v + '장';
      else val = String(it.v);
    }
    return '<div class="spirit season-' + (season || 0) + (isFront ? ' front' : '') + (sp.boss ? ' boss' : '') + (sp.done ? ' done' : '') + '" data-idx="' + i + '">' +
      (sp.guard > 0 && !sp.done ? '<span class="guard">🛡 ' + sp.guard + '</span>' : '') +
      (it ? '<span class="intent" title="' + INTENT[it.k].name + '">' + INTENT[it.k].sym + ' ' + val + ' <span class="cd' + (it.cd <= 1 ? ' soon' : '') + '">' + it.cd + '</span></span>' : '') +
      '<div class="face">' + (sp.done ? '😌' : sp.face) + '</div>' +
      '<div class="sname">' + esc(sp.name) + '</div>' +
      '<div class="sbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="shp">' + (sp.done ? '달래짐' : '화 ' + sp.hp + '/' + sp.maxHp + (it ? ' · ' + INTENT[it.k].name : '')) + '</div></div>';
  }

  function renderBattle(bOverride) {
    var R = Game.run();
    if (!R) return;
    var b = bOverride || R.battle;
    if (!b) return;
    var pct = Math.max(0, Math.round(100 * R.hp / R.maxHp));
    var fill = $('#hp-fill');
    fill.style.width = pct + '%';
    fill.classList.toggle('low', pct < 35);
    $('#hp-text').textContent = R.hp + '/' + R.maxHp;
    $('#shield-badge').textContent = '🛡 ' + b.shield;
    $('#hud-coins').textContent = '엽전 ' + R.coins;
    var s = DATA.SEASONS[Game.seasonOf(R.stage)];
    var kindName = b.kind === 'boss' ? '우두머리' : (b.kind === 'elite' ? '잔뜩 성난 정령' : '정령 손님');
    $('#hud-stage').textContent = s.name + ' · ' + R.stage + '/' + Game.STAGE_MAX + ' · ' + kindName;

    var frontIdx = -1;
    for (var f = 0; f < b.spirits.length; f++) if (!b.spirits[f].done) { frontIdx = f; break; }
    var si = Game.seasonOf(R.stage);
    $('#spirits').innerHTML = b.spirits.map(function (sp, i) { return spiritHTML(sp, i, i === frontIdx, si); }).join('');

    /* 다음에 우릴 잎: 주전자에 같은 잎이 2장 든 선반 칸은 .match-ready 로 빛난다 */
    var inTray = {};
    b.tray.forEach(function (x) { if (x !== 'junk') inTray[x] = (inTray[x] || 0) + 1; });
    var sh = '';
    for (var i = 0; i < Game.SHELF; i++) {
      var k = b.shelf[i];
      var locked = b.locks[i] > 0;
      var extra = (locked ? 'locked' : '') + (i === cursor ? ' cursor' : '') + (!locked && inTray[k] === 2 ? ' match-ready' : '');
      sh += tileHTML(k, extra, '(' + KEYS[i].toUpperCase() + ')' + (locked ? ' 잠김' : ''), 'data-act="pick:' + i + '"' + (locked ? ' disabled' : ''));
    }
    $('#shelf').innerHTML = sh;
    tutFocusShelf();

    var size = Game.traySize();
    var tr = '';
    for (var t = 0; t < size; t++) {
      var tk = b.tray[t];
      var warn = b.tray.length >= size - 1 && !tk;
      tr += '<div class="slot' + (warn ? ' warn' : '') + '">' + (tk ? tileHTML(tk, '', '', 'disabled tabindex="-1"') : '') + '</div>';
    }
    var trayEl = $('#tray');
    trayEl.style.setProperty('--n', size);
    trayEl.innerHTML = tr;
    trayEl.classList.toggle('full-warn', b.tray.length >= size - 1);

    var pot = Game.POT[R.pot];
    var ready = b.charge >= 100 && !R.over && R.battle === b;
    var sk = $('#btn-skill');
    sk.disabled = !ready;
    sk.classList.toggle('ready', ready);
    $('#skill-fill').style.height = b.charge + '%';
    $('#skill-name').textContent = pot.skillName + (ready ? ' (K)' : ' ' + b.charge + '%');
    DATA.TOOLS.forEach(function (t) {
      var n = (R.tools && R.tools[t.id]) || 0;
      var btn = $('#btn-tool-' + t.id), num = $('#tool-n-' + t.id);
      btn.disabled = R.battle !== b || !Game.canTool(t.id);
      btn.title = t.name + ' (' + t.key + ') — ' + t.desc;
      btn.setAttribute('aria-label', t.name + ' ' + n + '개');
      num.textContent = n;
      num.classList.toggle('zero', n <= 0);
    });
    renderHint(b);
  }

  function renderHint(b) {
    var line = $('#hint-line');
    if (!S('hints') || !b) { line.textContent = ''; return; }
    var k = b.shelf[cursor];
    if (!k) { line.textContent = ''; return; }
    var L = Game.LEAF[k];
    var extra = b.steam > 0 ? ' · 김 ' + b.steam + '수 남음' : (b.doubleNext ? ' · 다음 우림 두 배' : '');
    line.textContent = L.name + ': ' + leafDesc(L, Game.leafVal(k)) + extra;
  }

  /* ---------- 손맛: 번쩍임·흔들림·튀는 숫자·짧은 애니메이션 ---------- */

  function rectOf(el) {
    var r = el.getBoundingClientRect(), a = $('#app').getBoundingClientRect();
    return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width, h: r.height };
  }
  function floatText(x, y, text, cls, big) {
    var d = document.createElement('div');
    d.className = 'float ' + cls + (big ? ' big' : '');
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    $('#fx').appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 900);
  }
  function floatAt(el, text, cls, big) {
    if (typeof el === 'string') el = $(el);
    if (!el) return;
    var p = rectOf(el);
    floatText(p.x, p.y - p.h / 2, text, cls, big);
  }
  function restart(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }
  function flash(el) { restart(typeof el === 'string' ? $(el) : el, 'flash', 180); }
  function flashRed(el) { restart(typeof el === 'string' ? $(el) : el, 'flash-red', 220); }
  function pop(el) { if (!reduce()) restart(typeof el === 'string' ? $(el) : el, 'pop', 320); }
  function shake(el, amount) {
    if (typeof el === 'string') el = $(el);
    if (!el || !S('shake') || reduce()) return;
    var cls = amount >= 8 ? 'shake-l' : (amount >= 4 ? 'shake-m' : 'shake-s');
    restart(el, cls, 380);
  }
  function burst(el, colorVar) {
    if (typeof el === 'string') el = $(el);
    if (!el || reduce()) return;
    var p = rectOf(el);
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('div');
      var ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      var dist = 30 + Math.random() * 30;
      s.className = 'spark';
      s.style.left = p.x + 'px';
      s.style.top = p.y + 'px';
      s.style.background = 'var(' + colorVar + ')';
      s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
      s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
      $('#fx').appendChild(s);
      (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 500); })(s);
    }
  }
  function spiritEl(idx) { return $('#spirits').children[idx] || null; }

  function flyTile(slot, kind) {
    var from = $('#shelf').children[slot], to = $('#tray');
    if (!from || !to || reduce()) { pop('#tray'); return; }
    var a = rectOf(from), b = rectOf(to);
    var d = document.createElement('div');
    d.className = 'flier tile k-' + kind;
    d.textContent = Game.LEAF[kind].sym;
    d.style.width = a.w + 'px'; d.style.height = a.h + 'px';
    d.style.left = (a.x - a.w / 2) + 'px'; d.style.top = (a.y - a.h / 2) + 'px';
    $('#fx').appendChild(d);
    requestAnimationFrame(function () {
      d.style.transform = 'translate(' + Math.round(b.x - a.x) + 'px,' + Math.round(b.y - a.y) + 'px) scale(.6)';
      d.style.opacity = '0.2';
    });
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 260);
  }

  /* 셋 모임: 우리기 전 3칸 자리에 조각을 두고 가운데 칸으로 모으며 줄인다 */
  function mergeTiles(slots, kind) {
    var tray = $('#tray');
    if (!slots || slots.length < 3 || !tray || reduce()) return;
    var mid = tray.children[slots[1]];
    if (!mid) return;
    var c = rectOf(mid);
    slots.forEach(function (si) {
      var el = tray.children[si];
      if (!el) return;
      var a = rectOf(el);
      var d = document.createElement('div');
      d.className = 'merge tile k-' + kind;
      d.textContent = Game.LEAF[kind].sym;
      d.style.width = a.w + 'px'; d.style.height = a.h + 'px';
      d.style.fontSize = Math.round(a.h * 0.45) + 'px';
      d.style.left = (a.x - a.w / 2) + 'px'; d.style.top = (a.y - a.h / 2) + 'px';
      d.style.setProperty('--dx', Math.round(c.x - a.x) + 'px');
      d.style.setProperty('--dy', Math.round(c.y - a.y) + 'px');
      $('#fx').appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 340);
    });
  }

  /* 다시 채운 선반 칸이 위에서 떨어지며 커진다 */
  function enterTile(slot) {
    var t = $('#shelf').children[slot];
    if (t && !reduce()) restart(t, 'enter', 260);
  }

  function feedback(evs) {
    var actDelay = 0;
    evs.forEach(function (e) {
      switch (e.t) {
        case 'pick': flyTile(e.slot, e.kind); enterTile(e.slot); Sfx.play('pick'); break;
        case 'brew':
          Sfx.play('brew');
          mergeTiles(e.slots, e.kind);
          flash('#tray'); shake('#tray', 2); burst('#tray', '--leaf-' + e.kind); pop('#tray');
          floatAt('#tray', Game.LEAF[e.kind].name + '차!' + (e.mult > 1 ? ' ×2' : '') + (e.chain >= 2 ? ' 이어 ' + e.chain : ''), 'gold', e.mult > 1 || e.chain >= 3);
          vibrate(15);
          break;
        case 'calm':
          var se = spiritEl(e.idx);
          if (se) {
            flash(se); shake(se, Math.min(10, e.amt / 2)); pop(se.querySelector('.face'));
            if (e.amt > 0) floatAt(se, '-' + e.amt, 'calm', e.amt >= 12);
            if (e.absorbed > 0) floatAt(se, '🛡-' + e.absorbed, 'shield');
          }
          Sfx.play('calm');
          break;
        case 'calmed':
          var ce = spiritEl(e.idx);
          if (ce) { restart(ce, 'calmed-anim', 520); burst(ce, '--mint'); floatAt(ce, '달래짐!', 'heal', true); }
          Sfx.play('calmed'); vibrate(30);
          break;
        case 'hurt':
          if (e.dmg > 0) {
            flashRed('#scr-battle'); shake('#scr-battle', e.dmg); pop('#hp-text');
            floatAt('#hp-text', '-' + e.dmg, 'hurt', e.dmg >= 8);
            Sfx.play('hurt'); vibrate(e.dmg >= 8 ? 80 : 40);
          }
          if (e.blocked > 0) { floatAt('#shield-badge', '🛡-' + e.blocked, 'shield'); flash('#shield-badge'); }
          break;
        case 'heal': if (e.amt > 0) { floatAt('#hp-text', '+' + e.amt, 'heal'); flash('#hp-text'); pop('#hp-text'); Sfx.play('heal'); } break;
        case 'shield': floatAt('#shield-badge', '🛡+' + e.amt, 'shield'); flash('#shield-badge'); pop('#shield-badge'); Sfx.play('shield'); break;
        case 'overflow':
          flashRed('#tray'); shake('#scr-battle', 10); burst('#tray', '--danger');
          floatAt('#tray', '넘쳤다!', 'hurt', true);
          Sfx.play('overflow'); vibrate(120);
          break;
        case 'junk': flash('#tray'); shake('#tray', 3); floatAt('#tray', '🍂 +' + e.n, 'info'); Sfx.play('junk'); break;
        case 'junkClear': floatAt('#tray', '낙엽 치움', 'info'); burst('#tray', '--leaf-junk'); break;
        case 'lock': e.slots.forEach(function (i) { var t = $('#shelf').children[i]; if (t) { flash(t); shake(t, 3); } }); Sfx.play('lock'); break;
        case 'act':
          (function (ev, delay) {
            later(function () {
              var el = spiritEl(ev.idx);
              if (el) { pop(el.querySelector('.intent') || el); flash(el); }
              Sfx.play('act');
            }, delay);
          })(e, actDelay);
          actDelay += speed(120);
          break;
        case 'delay': var de = spiritEl(e.idx); if (de) floatAt(de, '+' + e.n + '수', 'info'); break;
        case 'charge': floatAt('#btn-skill', '+' + e.amt, 'gold'); break;
        case 'tool':
          var tb = $('#btn-tool-' + e.kind);
          pop(tb); burst(tb, '--accent'); Sfx.play('tool'); vibrate(12);
          if (e.kind === 'undo') { enterTile(e.slot); floatAt('#tray', '되돌렸다', 'info'); }
          else if (e.kind === 'shuffle') { e.slots.forEach(enterTile); flash('#shelf'); floatAt('#shelf', '선반을 섞었다', 'info'); }
          else { flash('#tray'); floatAt('#tray', (e.leaf ? Game.LEAF[e.leaf].sym + ' ' : '') + '덜어냈다', 'info'); }
          break;
        case 'steam': floatAt('#tray', '김이 오른다', 'info'); break;
        case 'double': floatAt('#tray', '다음 우림 두 배', 'info'); break;
        case 'wild': floatAt('#tray', '⭐ → ' + Game.LEAF[e.kind].name, 'info'); break;
        case 'repeat': floatAt('#tray', '한 번 더!', 'gold', true); break;
        case 'sweep': floatAt('#tray', '낙엽 ' + e.n + '장 치움', 'info'); break;
        case 'skill':
          flash('#scr-battle'); burst('#btn-skill', '--accent'); pop('#btn-skill');
          floatAt('#btn-skill', e.name + '!', 'gold', true); Sfx.play('skill'); vibrate(40);
          break;
        case 'battleWon':
          later(function () { floatText(window.innerWidth / 2, window.innerHeight / 3, '달래기 성공! 엽전 +' + e.coins, 'gold', true); Sfx.play('coin'); }, 200);
          break;
        case 'relic': toast('찻잔을 얻었습니다: ' + Game.RELIC[e.id].name); Sfx.play('reward'); break;
        case 'reward': case 'rest': case 'buy': Sfx.play('reward'); break;
        case 'eventDone': toast(e.note); Sfx.play('reward'); break;
        case 'skip': Sfx.play('coin'); break;
        case 'runEnd': Sfx.play(e.won ? 'win' : 'lose'); vibrate(e.won ? 60 : 150); break;
      }
    });
  }

  /* 화면 버튼이 부르는 행동. 시험 훅과 같은 Game 함수를 쓴다 */
  function doAct(fn) {
    if (inputLock || testing || busy) return false;
    var R = Game.run();
    if (!R) return false;
    var before = R.phase, bref = R.battle;
    if (!fn()) return false;
    var evs = Game.drain();
    Game.persist();
    R = Game.run();
    if (before === 'battle') {
      renderBattle(R.battle || bref);
      feedback(evs);
      if (R.phase !== 'battle') {
        inputLock = true;
        later(function () { inputLock = false; goPhase(); }, R.over ? speed(1100) : speed(800));
      } else if (tutStep >= 0) {
        tutAfterPick(evs);
      }
      return true;
    }
    feedback(evs);
    if (R.phase !== before) goPhase(); else renderScreen(cur);
    return true;
  }

  /* ---------- 보상·쉼터·장터·길 ---------- */

  function optHTML(o, j) {
    if (o.type === 'relic') {
      var r = Game.RELIC[o.id];
      return '<button class="btn opt relic" data-act="reward:' + j + '"><span class="o-sym">' + r.sym + '</span><span class="o-name">' + esc(r.name) + '</span><span class="o-desc">' + esc(r.desc) + '</span><span class="note">' + (j + 1) + '</span></button>';
    }
    var p = Game.RECIPE[o.id];
    var sym = p.leaf ? Game.LEAF[p.leaf].sym : (p.stat === 'maxHp' ? '🍙' : p.stat === 'heal' ? '😴' : p.stat === 'coins' ? '🪙' : '🔥');
    var tag = p.kind === 'up' ? '잎 다듬기' : p.kind === 'add' ? '잎 들이기' : p.kind === 'cut' ? '잎 덜기' : '살림';
    return '<button class="btn opt" data-act="reward:' + j + '"><span class="o-sym">' + sym + '</span><span class="o-name">' + esc(p.name) + '</span><span class="o-desc">' + esc(p.desc) + '</span><span class="note">' + tag + ' · ' + (j + 1) + '</span></button>';
  }

  function renderReward() {
    var R = Game.run();
    if (!R || !R.reward) return;
    var k = R.reward.kind;
    $('#reward-title').textContent = k === 'boss' ? '우두머리가 마음을 열었습니다' : (k === 'elite' ? '잔뜩 성났던 정령이 찻잔을 건넵니다' : '정령이 고마워합니다');
    $('#reward-sub').textContent = '하나를 고르세요. (평온 ' + R.hp + '/' + R.maxHp + ' · 엽전 ' + R.coins + ')';
    $('#reward-list').innerHTML = R.reward.opts.map(optHTML).join('');
    $('#btn-reroll').classList.toggle('hidden', !(R.rerolls > 0));
    $('#btn-reroll').textContent = '다시 뽑기 (' + R.rerolls + ')';
  }

  function renderRest() {
    var R = Game.run();
    if (!R || !R.rest) return;
    $('#rest-hp').textContent = '평온 ' + R.hp + '/' + R.maxHp;
    $('#rest-list').innerHTML = R.rest.opts.map(function (o, j) {
      if (o.k === 'heal') return '<button class="btn opt" data-act="rest:' + j + '"><span class="o-sym">🛋</span><span class="o-name">푹 쉬기</span><span class="o-desc">평온 +' + o.v + '</span><span class="note">' + (j + 1) + '</span></button>';
      var L = Game.LEAF[o.leaf];
      return '<button class="btn opt" data-act="rest:' + j + '"><span class="o-sym">' + L.sym + '</span><span class="o-name">' + esc(L.name) + ' 다듬기</span><span class="o-desc">' + esc(L.name) + ' 효과 ' + Game.leafVal(o.leaf) + ' → ' + (Game.leafVal(o.leaf) + L.up) + '</span><span class="note">' + (j + 1) + '</span></button>';
    }).join('');
  }

  function shopLabel(it) {
    if (it.type === 'add') { var L = Game.LEAF[it.leaf]; return { sym: L.sym, name: L.name + ' ' + it.n + '장 들이기', desc: leafDesc(L, Game.leafVal(it.leaf)) }; }
    if (it.type === 'cut') { var C = Game.LEAF[it.leaf]; return { sym: '✂', name: C.name + ' 3장 덜기', desc: '주머니에서 ' + C.name + ' 3장을 뺍니다. 남은 잎이 더 자주 모입니다.' }; }
    if (it.type === 'relic') { var r = Game.RELIC[it.id]; return { sym: r.sym, name: r.name, desc: r.desc }; }
    if (it.type === 'tool') {
      var T = Game.TOOL[it.tool], have = (Game.run().tools || {})[it.tool] || 0;
      return { sym: T.sym, name: '도우미: ' + T.name + ' ' + it.n + '개', desc: T.desc + ' (가진 것 ' + have + '개)' };
    }
    return { sym: '🍡', name: '따끈한 경단', desc: '평온 +' + it.v };
  }

  function renderShop() {
    var R = Game.run();
    if (!R || !R.shop) return;
    $('#shop-coins').textContent = '엽전 ' + R.coins;
    $('#shop-list').innerHTML = R.shop.items.map(function (it, j) {
      var l = shopLabel(it);
      var can = !it.sold && R.coins >= it.price;
      return '<button class="btn opt shop-item' + (it.sold ? ' sold' : '') + '" data-act="buy:' + j + '"' + (can ? '' : ' disabled') + '><span class="o-sym">' + l.sym + '</span>' +
        '<span class="o-name">' + esc(l.name) + '</span><span class="o-desc">' + esc(l.desc) + '</span><span class="price">' + (it.sold ? '팔림' : '엽전 ' + it.price) + ' · ' + (j + 1) + '</span></button>';
    }).join('');
  }

  function renderEvent() {
    var R = Game.run();
    if (!R || !R.event) return;
    var e = Game.EVENT[R.event.id];
    $('#event-title').textContent = e.title;
    $('#event-text').textContent = e.text;
    $('#event-hp').textContent = '평온 ' + R.hp + '/' + R.maxHp + ' · 엽전 ' + R.coins;
    $('#event-list').innerHTML = e.choices.map(function (c, j) {
      var can = Game.canChoose(c);
      return '<button class="btn opt" data-act="ev:' + j + '"' + (can ? '' : ' disabled') + '><span class="o-name">' + esc(c.label) + '</span><span class="o-desc">' + esc(c.note) + '</span>' +
        (can ? '' : '<span class="note">엽전이 모자랍니다</span>') + '<span class="note">' + (j + 1) + '</span></button>';
    }).join('');
  }

  function renderBag() {
    var R = Game.run();
    if (!R) return;
    var total = Game.deckTotal();
    $('#bag-list').innerHTML = Object.keys(R.deck).map(function (k) {
      var L = Game.LEAF[k];
      var lv = R.leafLv[k] || 0;
      return '<div class="leaf-row">' + tileHTML(k, '', '', 'disabled') + '<div><b>' + esc(L.name) + ' ' + R.deck[k] + '장</b> <span class="note">(' + Math.round(100 * R.deck[k] / total) + '%' + (lv ? ' · 다듬기 ' + lv : '') + ')</span><br>' +
        esc(leafDesc(L, Game.leafVal(k))) + '</div></div>';
    }).join('');
    $('#bag-relics').innerHTML = R.relics.length
      ? R.relics.map(function (id) { var r = Game.RELIC[id]; return '<span class="badge" title="' + esc(r.desc) + '">' + r.sym + ' ' + esc(r.name) + '</span>'; }).join('')
      : '<span class="note">아직 찻잔이 없습니다.</span>';
  }

  /* ---------- 결과·도감·업적·기록·개량 ---------- */

  function renderResult() {
    var R = Game.run();
    if (!R) return;
    var t = $('#result-title');
    t.textContent = R.won ? '사계절 찻집을 지켰습니다' : '찻집 문을 닫았습니다';
    t.classList.toggle('lose', !R.won);
    var s = DATA.SEASONS[Game.seasonOf(R.stage)];
    var best = M.stats.bestStage;
    var cards = [
      ['도달', R.won ? '사계절 완주' : s.name + ' ' + R.stage + '단계'],
      ['달랜 정령', R.st.calmed],
      ['우린 차', R.st.brews],
      ['넘침', R.st.overflows + '번'],
      ['걸린 시간', fmtTime(R.time)],
      ['받은 은행잎', '+' + R.ginkgo],
      ['최고 기록', best > Game.STAGE_MAX ? '사계절 완주' : best + '단계'],
      ['모은 찻잔', R.relics.length + '개'],
      ['이긴 판', M.stats.wins + ' / ' + M.stats.runs]
    ];
    $('#result-list').innerHTML = cards.map(function (c) { return '<div class="card"><span>' + c[0] + '</span><strong>' + esc(c[1]) + '</strong></div>'; }).join('');
    $('#result-achv').innerHTML = (R.newAchv || []).map(function (id) {
      var a = DATA.ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
      return a ? '<span class="badge coin">🏅 새 업적: ' + esc(a.name) + '</span>' : '';
    }).join('');
    var tw = Game.twist();
    var dl = $('#result-daily');
    dl.classList.toggle('hidden', !R.daily);
    if (R.daily) dl.textContent = '오늘의 도전 ' + R.dailyDate + (tw ? ' · 바람: ' + tw.name : '') + ' · 연속 ' + M.stats.dailyStreak + '일';
    $('#btn-again').textContent = R.daily ? '보통 판 하기' : '다시 하기';
    $('#share-box').classList.add('hidden');
  }

  /* ---------- 결과 공유 문구 ---------- */

  /* 12단계를 계절마다 셋씩: 지난 단계 🍵, 멈춘 단계 💥, 못 간 단계 ▫ */
  function progressLine(R) {
    var out = [];
    for (var s = 0; s < 4; s++) {
      var g = '';
      for (var i = s * 3 + 1; i <= s * 3 + 3; i++) {
        if (i < R.stage || R.won) g += '🍵';
        else if (i === R.stage) g += '💥';
        else g += '▫';
      }
      out.push(DATA.SEASONS[s].name.charAt(0) + g);
    }
    return out.join(' ') + (R.won ? ' 🏆' : '');
  }

  function shareText() {
    var R = Game.run();
    if (!R) return '';
    var tw = Game.twist();
    var lines = ['Kettle Spirits' + (R.daily ? ' · 오늘의 도전 ' + R.dailyDate : '')];
    if (tw) lines.push('바람: ' + tw.name);
    lines.push(progressLine(R));
    lines.push((R.won ? '사계절 찻집을 지켰습니다' : stageText(false, R.stage) + '에서 문을 닫았습니다') + ' · ' + fmtTime(R.time));
    lines.push('달랜 정령 ' + R.st.calmed + ' · 우린 차 ' + R.st.brews + ' · 넘침 ' + R.st.overflows + ' · 가장 긴 이어 우림 ' + R.st.bestChain);
    lines.push(Game.POT[R.pot].name + ' · 찻잔 ' + R.relics.length + '개' + (R.daily ? ' · 연속 ' + M.stats.dailyStreak + '일' : ''));
    return lines.join('\n');
  }

  /* 복사: 클립보드 → 글 상자 선택 복사 → 둘 다 막히면 글 상자를 띄워 직접 복사하게 한다 */
  function showShareBox(text, copied) {
    var box = $('#share-box');
    box.value = text;
    box.classList.remove('hidden');
    try { box.focus(); box.select(); box.setSelectionRange(0, text.length); } catch (e) { /* 선택을 못 해도 글은 보인다 */ }
    toast(copied ? '결과 문구를 복사했습니다.' : '복사가 막혀 글 상자에 띄웠습니다. 길게 눌러 복사하세요.');
  }
  function copyByBox(text) {
    var box = $('#share-box'), ok = false;
    box.value = text;
    box.classList.remove('hidden');
    try {
      box.focus();
      box.select();
      ok = !!(document.execCommand && document.execCommand('copy'));
    } catch (e) { ok = false; }
    showShareBox(text, ok);
  }
  function copyShare() {
    var text = shareText();
    if (!text) return;
    var done = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () {
          if (done) return;
          done = true;
          $('#share-box').value = text;
          $('#share-box').classList.add('hidden');
          toast('결과 문구를 복사했습니다.');
          Sfx.play('coin');
        }, function () { if (!done) { done = true; copyByBox(text); } });
        return;
      }
    } catch (e) { /* 클립보드가 막힌 브라우저 */ }
    done = true;
    copyByBox(text);
  }

  function patternText(def) {
    return def.pattern.map(function (p) { return INTENT[p[0]].sym + p[1]; }).join(' → ');
  }

  function renderCodex() {
    $$('#codex-tabs .tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === codexTab); b.setAttribute('data-act', 'tab:' + b.getAttribute('data-tab')); });
    var st = M.stats, html = '';
    if (codexTab === 'spirit') {
      html = DATA.SPIRITS.concat(DATA.BOSSES).map(function (d) {
        var seen = d.id.charAt(0) === 'b' ? !!st.bossCalmed[d.id] : !!st.spiritSeen[d.id];
        return '<div class="cx' + (seen ? ' got' : ' locked') + '"><span class="cx-sym">' + (seen ? d.face : '？') + '</span><div><div class="cx-name">' + (seen ? esc(d.name) : '아직 못 만남') + '</div>' +
          '<div class="cx-desc">' + DATA.SEASONS[d.season].name + (seen ? ' · 화 ' + d.hp + ' · ' + patternText(d) : '') + '</div></div></div>';
      }).join('');
    } else if (codexTab === 'leaf') {
      html = DATA.LEAVES.map(function (L) {
        var open = L.base || M.unlocked['u_' + L.id];
        return '<div class="cx' + (open ? ' got' : ' locked') + '"><span class="cx-sym">' + L.sym + '</span><div><div class="cx-name">' + esc(L.name) + (open ? '' : ' (잠김)') + '</div><div class="cx-desc">' + esc(leafDesc(L, L.v)) + '</div></div></div>';
      }).join('');
    } else if (codexTab === 'relic') {
      html = DATA.RELICS.map(function (r) {
        var got = !!st.relicSeen[r.id];
        return '<div class="cx' + (got ? ' got' : ' locked') + '"><span class="cx-sym">' + (got ? r.sym : '？') + '</span><div><div class="cx-name">' + (got ? esc(r.name) : '아직 못 얻음') + '</div><div class="cx-desc">' + (got ? esc(r.desc) : '') + '</div></div></div>';
      }).join('');
    } else {
      html = DATA.POTS.map(function (p) {
        var open = !!M.pots[p.id];
        return '<div class="cx' + (open ? ' got' : ' locked') + '"><span class="cx-sym">' + p.sym + '</span><div><div class="cx-name">' + esc(p.name) + '</div><div class="cx-desc">' + esc(p.desc + ' 기술 「' + p.skillName + '」 ' + p.skillDesc) + '</div></div></div>';
      }).join('');
    }
    $('#codex-list').innerHTML = html;
  }

  function renderAchv() {
    var got = 0;
    $('#achv-list').innerHTML = DATA.ACHIEVEMENTS.map(function (a) {
      var ok = !!M.achv[a.id];
      if (ok) got++;
      return '<div class="cx' + (ok ? ' got' : ' locked') + '"><span class="cx-sym">' + (ok ? '🏅' : '🔒') + '</span><div><div class="cx-name">' + esc(a.name) + '</div><div class="cx-desc">' + esc(a.desc) + '</div></div></div>';
    }).join('');
    $('#achv-count').textContent = got + '/' + DATA.ACHIEVEMENTS.length;
  }

  function renderStats() {
    var s = M.stats;
    var rows = [
      ['시작한 판', s.runs], ['이긴 판', s.wins], ['이긴 비율', s.runs ? Math.round(100 * s.wins / s.runs) + '%' : '-'],
      ['최고 단계', s.bestStage > Game.STAGE_MAX ? '사계절 완주' : (s.bestStage || '-')],
      ['가장 빨리 이긴 판', s.bestWinTime ? fmtTime(s.bestWinTime) : '-'],
      ['우린 차', s.brews], ['달랜 정령', s.calmed], ['넘친 주전자', s.overflows], ['쓴 찻잔 기술', s.skills],
      ['치운 낙엽 묶음', s.junkCleared], ['길에서 만난 일', s.events], ['가장 긴 이어 우림', s.bestChain],
      ['한 번에 가장 크게 달램', s.bestCalm], ['한 판 최고 엽전', s.bestCoins], ['모은 은행잎', s.totalGinkgo],
      ['함께한 시간', fmtTime(s.totalTime)], ['만난 정령', Object.keys(s.spiritSeen).length + '/24'], ['모은 찻잔', Object.keys(s.relicSeen).length + '/24'],
      ['오늘의 도전 한 날', s.dailyRuns], ['도전에서 지킨 날', s.dailyWins], ['도전 이어 한 날', s.dailyStreak + '일'],
      ['도전 가장 길게 이은 날', s.dailyBestStreak + '일'],
      ['도전 최고 단계', s.dailyBestStage > Game.STAGE_MAX ? '사계절 완주' : (s.dailyBestStage || '-')]
    ];
    /* 최근 오늘의 도전 7일 */
    (M.dailyLog || []).slice(0, 7).forEach(function (d) {
      var tw = DATA.DAILY.filter(function (x) { return x.id === d.twist; })[0];
      rows.push([d.date + (tw ? ' ' + tw.name : ''), stageText(d.won, d.stage) + ' · 달램 ' + d.calmed + ' · ' + fmtTime(d.time)]);
    });
    $('#stats-list').innerHTML = rows.map(function (r) { return '<div class="stat"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
  }

  function renderUpgrade() {
    $('#upgrade-ginkgo').textContent = '은행잎 ' + M.ginkgo;
    $('#upgrade-list').innerHTML = DATA.UPGRADES.map(function (u) {
      var have = !!M.unlocked[u.id];
      var needOk = !u.need || M.unlocked[u.need];
      var can = !have && needOk && M.ginkgo >= u.cost;
      var sym = u.kind === 'leaf' ? Game.LEAF[u.leaf].sym : (u.kind === 'pot' ? Game.POT[u.pot].sym : '🏠');
      var btn = have ? '<span class="badge hp-b">있음</span>' : '<button class="btn small' + (can ? ' primary' : '') + '" data-act="upg:' + u.id + '"' + (can ? '' : ' disabled') + '>🍂 ' + u.cost + '</button>';
      return '<div class="cx' + (have ? ' got' : '') + '"><span class="cx-sym">' + sym + '</span><div><div class="cx-name">' + esc(u.name) + '</div><div class="cx-desc">' + esc(u.desc) + (needOk ? '' : ' (앞 개량 먼저)') + '</div></div>' + btn + '</div>';
    }).join('');
  }

  /* ---------- 첫 판 안내 ---------- */

  function startTut() {
    if (testing || M.tutDone) return;
    tutStep = 0;
    showTut();
  }
  function showTut() {
    $$('.tut-focus').forEach(function (el) { el.classList.remove('tut-focus'); });
    if (tutStep < 0 || tutStep >= DATA.TUTORIAL.length) { $('#ov-tut').classList.add('hidden'); tutStep = -1; return; }
    var st = DATA.TUTORIAL[tutStep];
    $('#tut-text').textContent = (tutStep + 1) + '/' + DATA.TUTORIAL.length + ' · ' + st.text;
    $('#ov-tut').classList.remove('hidden');
    if (st.slot != null) { tutFocusShelf(); return; }
    var t = st.target && $(st.target);
    if (t) t.classList.add('tut-focus');
  }
  /* slot 단계는 선반의 그 칸 하나만 짚는다. 그 칸에 짜인 잎이 남아 있을 때만(다시 그려도 붙는다) */
  function tutFocusShelf() {
    if (tutStep < 0 || tutStep >= DATA.TUTORIAL.length) return;
    var st = DATA.TUTORIAL[tutStep], R = Game.run();
    if (st.slot == null || !R || !R.battle || R.phase !== 'battle') return;
    var b = R.battle;
    if (b.locks[st.slot] > 0 || b.shelf[st.slot] !== DATA.TUTORIAL_SHELF[st.slot]) return;
    var t = $('#shelf').children[st.slot];
    if (t) t.classList.add('tut-focus');
  }
  function endTut() {
    tutStep = -1;
    M.tutDone = true;
    Store.save();
    showTut();
  }
  function tutNext() {
    tutStep++;
    if (tutStep >= DATA.TUTORIAL.length) endTut(); else showTut();
  }
  function tutAfterPick(evs) {
    if (tutStep === 0 && evs.some(function (e) { return e.t === 'pick'; })) tutNext();
    else if (tutStep === 1 && evs.some(function (e) { return e.t === 'brew'; })) tutNext();
  }

  /* ---------- 버튼 ---------- */

  function startRun() {
    M.lastPot = selPot;
    Game.newRun({ pot: selPot });
    Game.drain();
    Game.persist();
    goPhase();
  }

  /* 오늘의 도전: 하던 판이 있으면 이어서, 이미 했으면 알리기만, 아니면 날짜 시드로 새 판 */
  function startDailyRun() {
    var d = Game.dailyInfo();
    if (d.inProgress) {
      if (Game.resume(M.run)) { goPhase(); return; }
    }
    if (d.played) {
      toast(d.result ? '오늘 도전은 끝났습니다 (' + stageText(d.result.won, d.result.stage) + '). 내일 새 판이 열립니다.' : '오늘 도전은 이미 시작했습니다. 내일 새 판이 열립니다.');
      renderDailyButton();
      return;
    }
    if (!Game.startDaily()) return;
    Game.drain();
    Game.persist();
    toast('오늘의 바람: ' + d.twist.name + ' — ' + d.twist.desc);
    goPhase();
  }

  function autoPause() {
    if (testing) return;
    if (cur === 'scr-battle' && Game.run() && !Game.run().over && !isOpen('ov-pause')) openOv('ov-pause');
  }

  var HANDLERS = {
    'btn-start': function () { show('scr-pot', { stack: true }); },
    'btn-continue': function () { if (Game.resume(M.run)) goPhase(); else { M.run = null; Store.save(); renderTitle(); } },
    'btn-help': function () { show('scr-help', { stack: true }); },
    'btn-settings': function () { show('scr-settings', { stack: true }); },
    'btn-codex': function () { show('scr-codex', { stack: true }); },
    'btn-achv': function () { show('scr-achv', { stack: true }); },
    'btn-stats': function () { show('scr-stats', { stack: true }); },
    'btn-upgrade': function () { show('scr-upgrade', { stack: true }); },
    'btn-go': function () { if (M.pots[selPot]) startRun(); },
    'btn-daily': function () { startDailyRun(); },
    'btn-share': function () { copyShare(); },
    'btn-again': function () { if (!M.pots[selPot]) selPot = 'white'; selPot = M.lastPot && M.pots[M.lastPot] ? M.lastPot : selPot; startRun(); },
    'btn-home': function () { stack = []; show('scr-title', { force: true }); },
    'btn-wipe': function () { wipeArmed = true; $('#wipe-confirm').classList.remove('hidden'); },
    'btn-wipe-yes': function () {
      if (!wipeArmed) return;
      M = Store.wipe();
      applySettings();
      wipeArmed = false;
      toast('기록을 모두 지웠습니다.');
      renderSettings();
    },
    'btn-wipe-no': function () { wipeArmed = false; $('#wipe-confirm').classList.add('hidden'); },
    'btn-pause': function () { openOv('ov-pause'); },
    'btn-map-menu': function () { openOv('ov-pause'); },
    'btn-resume': function () { closeOv('ov-pause'); },
    'btn-pause-help': function () { closeOv('ov-pause'); show('scr-help', { stack: true, force: true }); },
    'btn-pause-settings': function () { closeOv('ov-pause'); show('scr-settings', { stack: true, force: true }); },
    'btn-quit': function () {
      if (!quitArmed) { quitArmed = true; $('#quit-note').classList.remove('hidden'); return; }
      quitArmed = false;
      closeOv('ov-pause');
      Game.abandon();
      feedback(Game.drain());
      Game.persist();
      goPhase();
    },
    'btn-bag': function () { openOv('ov-bag'); },
    'btn-bag-close': function () { closeOv('ov-bag'); },
    'btn-skill': function () { doAct(function () { return Game.useSkill(); }); },
    'btn-skip': function () { doAct(function () { return Game.skipReward(); }); },
    'btn-reroll': function () { doAct(function () { return Game.rerollReward(); }); },
    'btn-leave': function () { doAct(function () { return Game.shopLeave(); }); },
    'btn-tut-next': function () { tutNext(); },
    'btn-tut-skip': function () { endTut(); }
  };

  function actRoute(a) {
    var p = a.split(':'), v = p[1], n = parseInt(v, 10);
    switch (p[0]) {
      case 'pick': cursor = n; return doAct(function () { return Game.pick(n); });
      case 'tool': return doAct(function () { return Game.useTool(v); });
      case 'node': return doAct(function () { return Game.chooseNode(n); });
      case 'reward': return doAct(function () { return Game.chooseReward(n); });
      case 'rest': return doAct(function () { return Game.restChoose(n); });
      case 'buy': return doAct(function () { return Game.shopBuy(n); });
      case 'ev': return doAct(function () { return Game.eventChoose(n); });
      case 'pot': selPot = v; renderPots(); return true;
      case 'tab': codexTab = v; renderCodex(); return true;
      case 'set': toggleSetting(v); return true;
      case 'upg':
        if (Game.buyUpgrade(v)) { Sfx.play('reward'); toast('찻집을 고쳤습니다.'); } else toast('은행잎이 모자랍니다.');
        renderUpgrade();
        return true;
    }
    return false;
  }

  function route(el) {
    if (testing) return;
    var important = el.classList.contains('primary') || el.classList.contains('danger');
    Sfx.play('click');
    if (important) vibrate(12);
    if (el.classList.contains('btn-back')) { back(); return; }
    var a = el.getAttribute('data-act');
    if (a) { actRoute(a); return; }
    var h = HANDLERS[el.id];
    if (h) h(el);
    /* 싸움 중에는 포커스를 남기지 않아 Space·Enter 가 선반 담기로만 쓰이게 한다 */
    if (cur === 'scr-battle' && document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function onTap(e) {
    var el = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!el || el.disabled) return;
    if (e.type === 'click') {
      if (performance.now() - lastTap < 600) return;
    } else {
      if (e.button > 0) return;
      lastTap = performance.now();
    }
    Sfx.init();
    route(el);
  }

  /* ---------- 키보드 ---------- */

  function numKey(k) { var n = parseInt(k, 10); return isNaN(n) ? -1 : n - 1; }

  function onKey(e) {
    if (testing) return;
    Sfx.init();
    var k = e.key, low = k.length === 1 ? k.toLowerCase() : k;
    var n = numKey(k);
    if (isOpen('ov-pause')) { if (k === 'Escape') closeOv('ov-pause'); return; }
    if (isOpen('ov-bag')) { if (k === 'Escape' || low === 'b' || k === 'Enter') { e.preventDefault(); closeOv('ov-bag'); } return; }
    if (isOpen('ov-reward')) {
      if (n >= 0 && n < 3) doAct(function () { return Game.chooseReward(n); });
      else if (low === 's') doAct(function () { return Game.skipReward(); });
      return;
    }
    if (cur === 'scr-battle') { battleKey(e, k, low); return; }
    if (cur === 'scr-map') {
      if (n >= 0) doAct(function () { return Game.chooseNode(n); });
      else if (k === 'Escape') openOv('ov-pause');
      return;
    }
    if (cur === 'scr-rest' && n >= 0) { doAct(function () { return Game.restChoose(n); }); return; }
    if (cur === 'scr-event' && n >= 0) { doAct(function () { return Game.eventChoose(n); }); return; }
    if (cur === 'scr-shop') {
      if (n >= 0) doAct(function () { return Game.shopBuy(n); });
      else if (k === 'Escape' || low === 'l') doAct(function () { return Game.shopLeave(); });
      return;
    }
    if (k === 'Escape' && ['scr-help', 'scr-settings', 'scr-codex', 'scr-achv', 'scr-stats', 'scr-upgrade', 'scr-pot'].indexOf(cur) >= 0) back();
  }

  function battleKey(e, k, low) {
    var R = Game.run();
    if (!R || !R.battle) return;
    var moved = false;
    if (k === 'ArrowLeft') { cursor = (cursor + 11) % 12; moved = true; }
    else if (k === 'ArrowRight') { cursor = (cursor + 1) % 12; moved = true; }
    else if (k === 'ArrowUp') { cursor = (cursor + 8) % 12; moved = true; }
    else if (k === 'ArrowDown') { cursor = (cursor + 4) % 12; moved = true; }
    if (moved) { e.preventDefault(); renderBattle(); return; }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      var c = cursor;
      doAct(function () { return Game.pick(c); });
      return;
    }
    var idx = KEYS.indexOf(low);
    if (idx >= 0) { cursor = idx; doAct(function () { return Game.pick(idx); }); return; }
    if (low === 'k') { doAct(function () { return Game.useSkill(); }); return; }
    var tool = DATA.TOOLS.filter(function (t) { return t.key === k; })[0];
    if (tool) { doAct(function () { return Game.useTool(tool.id); }); return; }
    if (low === 'b') { openOv('ov-bag'); return; }
    if (k === 'Escape') openOv('ov-pause');
  }

  /* ---------- 시간·시작 ---------- */

  function tick() {
    if (testing) return;
    var R = Game.run();
    if (!R || R.over || R.test || document.hidden || isOpen('ov-pause')) return;
    if (RUN_SCREENS.indexOf(cur) < 0 || cur === 'scr-result') return;
    Game.addTime(1);
  }

  function enterTest() {
    testing = true;
    timers.forEach(clearTimeout);
    timers = [];
    if (clock) { clearInterval(clock); clock = null; }
    $('#ov-tut').classList.add('hidden');
    inputLock = false;
  }

  function init() {
    M = Store.load();
    applySettings();
    document.addEventListener('pointerup', onTap);
    document.addEventListener('click', onTap);
    document.addEventListener('pointerdown', function () { Sfx.init(); }, { passive: true });
    document.addEventListener('touchstart', function () {}, { passive: true });
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) autoPause();
      Sfx.setMuted(document.hidden);
    });
    window.addEventListener('resize', function () { if (!testing) renderScreen(cur); });
    document.addEventListener('contextmenu', function (e) { if (!(e.target && e.target.id === 'share-box')) e.preventDefault(); });
    renderTitle();
    document.getElementById('scr-title').classList.add('active');
    cur = 'scr-title';
    clock = setInterval(tick, 1000);
  }

  init();

  return { enterTest: enterTest, show: show, goPhase: goPhase };
})();

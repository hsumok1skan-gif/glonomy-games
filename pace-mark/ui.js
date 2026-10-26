/* Pace Mark — 화면 그리기 (상태는 App 이 가진다) */
(function () {
  'use strict';
  var D = window.PM_DATA, L = window.Logic;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function reduced() {
    return document.documentElement.classList.contains('reduce') ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* 모든 화면·시트·겹침 창의 전환은 이 함수를 거친다: 흐려지며 10px 밀기(시트는 40px 올라오기) 0.22초 */
  function swap(el, on) {
    if (!el) return;
    var tok = (el._tok || 0) + 1;
    el._tok = tok;
    el.classList.remove('layer-in', 'layer-out');
    if (on) {
      el.hidden = false;
      if (reduced()) return;
      void el.offsetWidth;
      el.classList.add('layer-in');
      return;
    }
    if (el.hidden) return;
    if (reduced()) { el.hidden = true; return; }
    el.classList.add('layer-out');
    var fin = function () {
      if (el._tok !== tok) return;
      el.classList.remove('layer-out');
      el.hidden = true;
    };
    el.addEventListener('animationend', fin, { once: true });
    setTimeout(fin, 320);
  }

  var SCREENS = ['home', 'exams', 'log', 'more', 'help', 'run', 'grade', 'result'];
  var TABS = { home: 'home', exams: 'exams', log: 'log', more: 'more' };
  function show(name) {
    SCREENS.forEach(function (n) {
      var el = $('screen-' + n);
      if (n !== name && el && !el.hidden) { el._tok = (el._tok || 0) + 1; el.classList.remove('layer-in', 'layer-out'); el.hidden = true; }
    });
    swap($('screen-' + name), true);
    Object.keys(TABS).forEach(function (t) {
      var b = $('tab-' + t);
      if (b) { if (t === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
    });
    document.body.classList.toggle('running', name === 'run');
    window.scrollTo(0, 0);
  }

  var stack = [];
  function openLayer(id) {
    var el = $(id);
    if (!el) return;
    if (stack.indexOf(id) < 0) stack.push(id);
    swap(el, true);
    var f = el.querySelector('[autofocus], input:not([readonly]), textarea:not([readonly]), .btn.primary');
    if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }
  function closeLayer(id) {
    var i = stack.indexOf(id);
    if (i >= 0) stack.splice(i, 1);
    swap($(id), false);
  }
  function topLayer() { return stack.length ? stack[stack.length - 1] : null; }

  var toastTimer = null;
  function toast(msg, undoLabel) {
    var t = $('toast');
    t.innerHTML = '<span class="ok-mark" aria-hidden="true">✓</span><span>' + esc(msg) + '</span>' +
      (undoLabel ? '<button type="button" data-act="undo">' + esc(undoLabel) + '</button>' : '');
    t.hidden = false;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, undoLabel ? 6000 : 2600);
  }
  function hideToast() { clearTimeout(toastTimer); $('toast').hidden = true; }

  // 잘못된 입력: 입력란을 흔들고 바로 아래에 이유
  function fieldErr(id, msg) {
    var el = $(id), e = $(id + '-err');
    if (el) {
      el.classList.remove('bad');
      void el.offsetWidth;
      el.classList.add('bad');
      el.setAttribute('aria-invalid', 'true');
      if (e) el.setAttribute('aria-describedby', id + '-err');
    }
    if (e) e.textContent = msg;
  }
  function markBad(el) { if (!el) return; el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); }
  function clearErr(root) {
    var r = typeof root === 'string' ? $(root) : root;
    if (!r) return;
    Array.prototype.forEach.call(r.querySelectorAll('.bad'), function (el) { el.classList.remove('bad'); el.removeAttribute('aria-invalid'); });
    Array.prototype.forEach.call(r.querySelectorAll('.err'), function (el) { el.textContent = ''; });
  }
  function flash(el) { if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  function emptyArt() {
    return '<svg viewBox="0 0 160 96" aria-hidden="true"><rect x="8" y="10" width="92" height="76" rx="10" class="art-paper"/>' +
      '<path d="M22 30h52M22 44h60M22 58h44M22 72h56" class="art-line"/><circle cx="118" cy="52" r="30" class="art-clock"/>' +
      '<path d="M118 52V34M118 52l12 8" class="art-hand"/></svg>';
  }
  function emptyBox(text, btns) {
    return '<div class="card empty">' + emptyArt() + '<p>' + esc(text) + '</p><div class="row wrap" style="justify-content:center">' + btns + '</div></div>';
  }

  function miniEmpty(text, btn) {
    return '<div class="empty">' + emptyArt() + '<p>' + esc(text) + '</p>' + btn + '</div>';
  }

  function tplMeta(t) {
    var p = L.plan(t);
    var per = p.N ? Math.round(p.usable / p.N) : 0;
    return p.N + '문항 · ' + t.total + '분 · 마킹 ' + t.reserve + '분 · 문항당 약 ' + per + '초';
  }
  function secLine(t) { return t.sections.map(function (s) { return esc(s.name) + ' ' + s.count; }).join(' · '); }
  function gradeOf(s, q) { return (s.grade || [])[q - 1] || ''; }
  function gradeText(v) { return v === 'o' ? '맞음' : v === 'x' ? '틀림' : v === 'g' ? '찍어서 맞음' : '채점 안 함'; }
  function deltaClass(d) { return Math.abs(d) < 1 ? 'even' : d > 0 ? 'behind' : 'ahead'; }

  /* ---------- 홈 ---------- */
  function renderHome(A) {
    var S = A.S, h = '', todayK = L.today();
    if (S.run) {
      var rp = L.plan(S.run), el = A.runElapsed() / 1000;
      h += '<div class="card resume"><h3>풀던 회차가 있어요</h3><p class="small-t">' + esc(S.run.name) + ' · ' + S.run.laps.length + ' / ' + rp.N +
        '문항 · 남은 시간 ' + L.fmt(rp.total - el) + (S.run.pausedAt ? ' · 멈춤' : '') + '</p>' +
        '<div class="row wrap" style="margin-top:10px"><button type="button" class="btn ghost" data-act="run-discard">그만두기</button>' +
        '<button type="button" class="btn primary grow" data-act="run-open">이어 풀기</button></div></div>';
    }
    var todayN = S.sessions.filter(function (s) { return s.date === todayK; }).length;
    var ws = L.weekStart(todayK), weekN = S.sessions.filter(function (s) { return s.date >= ws && s.date <= todayK; }).length;
    var last = A.findTpl(S.lastTpl) || D.PRESETS[0];
    h += '<div class="card hero"><div class="tiny">' + esc(L.dayLabel(todayK)) + '</div>' +
      '<h2>' + (todayN ? '오늘 ' + todayN + '회 풀었어요' : '오늘은 아직 한 회도 안 풀었어요') + '</h2>' +
      '<div class="stat3"><div><b>' + todayN + '</b><span>오늘</span></div><div><b>' + L.streak(S.sessions, todayK) + '일</b><span>연속</span></div><div><b>' + weekN + '</b><span>이번 주</span></div></div>' +
      '<p class="small-t muted">바로 시작: ' + esc(last.name) + '</p>' +
      '<div class="row wrap" style="margin-top:10px"><button type="button" class="btn ghost" data-act="go" data-to="exams" style="color:inherit;border-color:currentColor">다른 틀</button>' +
      '<button type="button" class="btn primary grow" data-act="open-plan" data-id="' + esc(last.id) + '">시작 준비</button></div></div>';

    if (!S.sessions.length) {
      h += emptyBox('아직 기록이 없어요. 시험 틀을 고르고 한 회를 풀어 보세요. 문항마다 큰 버튼만 누르면 돼요.',
        '<button type="button" class="btn ghost" data-act="sample-add">예시로 둘러보기</button><button type="button" class="btn primary" data-act="go" data-to="exams">시험 틀 고르기</button>');
    } else {
      var s = A.sortedSessions()[0], sm = L.summary(s), adv = A.adviceFor(s);
      h += '<div class="sec-title">지난 회차</div><div class="card"><div class="spread"><h3>' + esc(s.name) + '</h3><span class="tiny">' + esc(L.dayLabel(s.date)) + '</span></div>' +
        '<div class="stat-grid"><div class="stat"><b>' + L.fmt(sm.elapsed) + '</b><span>걸린 시간 (계획 ' + L.fmt(sm.plan.usable) + ')</span></div>' +
        '<div class="stat"><b>' + sm.done + ' / ' + sm.N + '</b><span>끝낸 문항</span></div>' +
        '<div class="stat"><b>' + (sm.acc === null ? '-' : sm.acc + '%') + '</b><span>정답률</span></div>' +
        '<div class="stat"><b class="' + (sm.lastDelta > 0 ? 'plus' : 'minus') + '">' + esc(L.fmtDelta(sm.lastDelta)) + '</b><span>마지막 페이스</span></div></div>' +
        (adv.length ? '<div class="advice" style="margin-top:10px"><b>다음 회: ' + esc(adv[0].title) + '</b><span>' + esc(adv[0].text) + '</span></div>' : '') +
        '<button type="button" class="btn block" style="margin-top:8px" data-act="open-session" data-id="' + esc(s.id) + '">결과 다시 보기</button></div>';
      var recent = A.recentTemplates(3);
      if (recent.length) {
        h += '<div class="sec-title">최근 쓴 틀</div><div class="quick">' + recent.map(function (t) {
          return '<button type="button" class="btn" data-act="open-plan" data-id="' + esc(t.id) + '"><span>' + esc(t.name) + '</span><span class="tiny">' + L.totalCount(t) + '문항 · ' + t.total + '분</span></button>';
        }).join('') + '</div>';
      }
    }
    var di = Math.floor(L.fromKey(todayK).getTime() / 86400000) % D.TIPS.length;
    h += '<div class="sec-title">오늘의 요령</div><div class="card tip"><p class="small-t">' + esc(D.TIPS[(di + D.TIPS.length) % D.TIPS.length]) + '</p></div>';
    $('home-root').innerHTML = h;
  }

  /* ---------- 시험 틀 ---------- */
  function renderExams(A) {
    var h = '<div class="spread" style="margin:4px 0 10px"><h2>시험 틀</h2><button type="button" class="btn primary small" data-act="tpl-new">+ 새 틀</button></div>';
    h += '<label class="field"><span>찾기</span><input id="exam-q" type="search" maxlength="30" placeholder="예: 9급, 수능, 기사" value="' + esc(A.ui.examQ) + '"></label>';
    h += '<div class="chips" role="group" aria-label="갈래">' + D.CATS.map(function (c) {
      return '<button type="button" class="chip" data-act="cat" data-c="' + esc(c) + '" aria-pressed="' + (A.ui.cat === c) + '">' + esc(c) + '</button>';
    }).join('') + '</div><div id="exams-list"></div>';
    h += '<p class="fine">기본 틀은 ' + esc(D.BASIS) + '. 다르면 내 틀로 복사해 고쳐 쓰세요.</p>';
    $('exams-root').innerHTML = h;
    renderExamList(A);
  }
  function renderExamList(A) {
    var q = (A.ui.examQ || '').trim().toLowerCase(), cat = A.ui.cat;
    var list = A.allTemplates().filter(function (t) {
      var c = t.custom ? '내 틀' : t.cat;
      if (cat !== '전체' && c !== cat) return false;
      if (q && (t.name + ' ' + t.sections.map(function (s) { return s.name; }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var h = '';
    if (!list.length) {
      h = cat === '내 틀' && !q
        ? emptyBox('아직 만든 틀이 없어요. 학원 모의고사나 한 과목만 푸는 틀을 직접 만들어 보세요.', '<button type="button" class="btn primary" data-act="tpl-new">새 틀 만들기</button>')
        : emptyBox('찾는 틀이 없어요. 다른 낱말로 찾거나 새 틀을 만드세요.', '<button type="button" class="btn ghost" data-act="exam-reset">모두 보기</button><button type="button" class="btn primary" data-act="tpl-new">새 틀 만들기</button>');
    }
    list.forEach(function (t) {
      h += '<div class="card tpl-card"><div><span class="badge' + (t.custom ? ' mine' : '') + '">' + esc(t.custom ? '내 틀' : t.cat) + '</span></div>' +
        '<h3 style="margin-top:6px">' + esc(t.name) + '</h3><div class="meta">' + esc(tplMeta(t)) + '</div><div class="secs">' + secLine(t) + '</div>' +
        '<div class="row wrap">' + (t.custom
          ? '<button type="button" class="btn ghost small" data-act="tpl-edit" data-id="' + esc(t.id) + '">고치기</button><button type="button" class="btn ghost small" data-act="tpl-del" data-id="' + esc(t.id) + '">지우기</button>'
          : '<button type="button" class="btn ghost small" data-act="tpl-copy" data-id="' + esc(t.id) + '">내 틀로 복사</button>') +
        '<button type="button" class="btn primary grow" data-act="open-plan" data-id="' + esc(t.id) + '">시작 준비</button></div></div>';
    });
    $('exams-list').innerHTML = h;
  }

  /* ---------- 시작 준비 시트 ---------- */
  function renderPlan(A) {
    var d = A.ui.draft;
    if (!d) return;
    var p = L.plan(d), h = '';
    h += '<p><b>' + esc(d.name) + '</b></p><p class="small-t muted">' + esc(tplMeta(d)) + '</p>';
    h += '<div class="set-row"><span class="small-t">마킹·검토 여유</span><div class="stepper">' +
      '<button type="button" class="icon-btn" data-act="plan-reserve" data-d="-1" aria-label="여유 1분 줄이기"' + (d.reserve <= 0 ? ' disabled' : '') + '>−</button><b>' + d.reserve + '분</b>' +
      '<button type="button" class="icon-btn" data-act="plan-reserve" data-d="1" aria-label="여유 1분 늘리기"' + (d.reserve >= Math.min(30, d.total - 1) ? ' disabled' : '') + '>＋</button></div></div>';
    h += '<table class="plan-table"><thead><tr><th>푸는 순서</th><th class="num">문항</th><th class="num">배정</th><th class="num">문항당</th><th></th></tr></thead><tbody>';
    p.secs.forEach(function (s, i) {
      h += '<tr><td>' + (i + 1) + '. ' + esc(s.name) + '</td><td class="num">' + s.count + '</td><td class="num">' + L.fmt(s.time) + '</td><td class="num">' + Math.round(s.per) + '초</td>' +
        '<td><div class="move"><button type="button" class="icon-btn" data-act="plan-move" data-i="' + i + '" data-d="-1" aria-label="' + esc(s.name) + ' 앞으로"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="icon-btn" data-act="plan-move" data-i="' + i + '" data-d="1" aria-label="' + esc(s.name) + ' 뒤로"' + (i === p.secs.length - 1 ? ' disabled' : '') + '>↓</button></div></td></tr>';
    });
    h += '</tbody></table>';
    h += '<p class="hint">' + (p.manual ? '과목마다 정한 배정 분대로 나눴어요.' : '쓸 수 있는 ' + L.fmt(p.usable) + L.josa(L.fmt(p.usable), '을') + ' 문항 수대로 나눴어요.') +
      (p.slack > 1 ? ' 남는 ' + L.fmtShort(p.slack) + L.josa(L.fmtShort(p.slack), '은') + ' 마지막 여유로 둬요.' : '') + ' 순서를 바꾸면 이번 회에만 적용돼요.</p>';
    if (!d.custom) h += '<p class="fine">' + esc(D.BASIS) + '</p>';
    h += '<div class="row wrap"><button type="button" class="btn ghost" data-act="plan-save">이 순서로 내 틀 저장</button>' +
      '<button type="button" class="btn primary grow" data-act="plan-start">시작</button></div>';
    $('plan-root').innerHTML = h;
  }

  /* ---------- 내 틀 시트 ---------- */
  function tplRow(s, i) {
    return '<div class="tpl-row" data-i="' + i + '">' +
      '<input class="r-name" list="subject-list" maxlength="30" value="' + esc(s.name) + '" aria-label="' + (i + 1) + '번째 과목 이름" placeholder="과목">' +
      '<input class="r-count" type="number" inputmode="numeric" min="1" max="200" value="' + (s.count || '') + '" aria-label="' + (i + 1) + '번째 과목 문항 수">' +
      '<input class="r-min" type="number" inputmode="numeric" min="0" max="300" value="' + (s.min > 0 ? s.min : '') + '" placeholder="자동" aria-label="' + (i + 1) + '번째 과목 배정 분">' +
      '<button type="button" class="icon-btn" data-act="tpl-row-del" data-i="' + i + '" aria-label="' + (i + 1) + '번째 과목 빼기">✕</button></div>';
  }
  function renderTplRows(rows) {
    $('tpl-rows').innerHTML = rows.map(tplRow).join('');
  }
  function fillTplForm(t, isNew) {
    $('tpl-title').textContent = isNew ? '새 틀 만들기' : '내 틀 고치기';
    $('tpl-name').value = t.name;
    $('tpl-total').value = t.total;
    $('tpl-reserve').value = t.reserve;
    renderTplRows(t.sections);
    $('subject-list').innerHTML = D.SUBJECT_NAMES.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('');
    clearErr('form-tpl');
  }

  /* ---------- 풀이 화면 (매 0.25초) ---------- */
  function runTick(A) {
    var R = A.S.run;
    if (!R) return;
    var p = A.runPlan(), el = A.runElapsed() / 1000, done = R.laps.length;
    var cur = Math.min(done, p.N - 1), si = done >= p.N ? p.secs.length - 1 : L.secOf(p, cur), sec = p.secs[si];
    var lastAt = done ? R.laps[done - 1].at / 1000 : 0;
    var delta = L.liveDelta(p, R.laps, el);
    $('run-title').textContent = R.name;
    $('run-sec').textContent = sec ? sec.name : '';
    var left = p.total - el;
    $('run-left').textContent = (left < 0 ? '-' : '') + L.fmt(Math.abs(left));
    var pace = $('run-pace');
    pace.textContent = done >= p.N ? '다 풀었어요 · ' + L.fmtDelta(delta) : L.fmtDelta(delta);
    pace.className = 'run-pace ' + deltaClass(delta);
    $('run-q').textContent = Math.min(done + 1, p.N) + ' / ' + p.N;
    $('run-qtime').textContent = L.fmt(el - lastAt);
    $('run-target').textContent = sec ? Math.round(sec.per) + '초' : '-';
    $('run-bar-fill').style.width = (p.N ? done / p.N * 100 : 0) + '%';
    $('run-bar-mark').style.left = Math.min(100, (p.N ? L.expectedDone(p, el) / p.N * 100 : 0)) + '%';
    var segs = $('run-secs');
    if (segs.childElementCount !== p.secs.length) {
      segs.innerHTML = p.secs.map(function (s) { return '<div class="seg"><i><em></em></i><span>' + esc(s.name) + '</span></div>'; }).join('');
    }
    p.secs.forEach(function (s, i) {
      var seg = segs.children[i];
      if (!seg) return;
      var n = Math.max(0, Math.min(s.count, done - s.startQ));
      seg.querySelector('em').style.width = (n / s.count * 100) + '%';
      seg.classList.toggle('now', i === si && done < p.N);
    });
    $('btn-lap').disabled = done >= p.N;
    $('btn-flag').disabled = done >= p.N;
    $('btn-undo-lap').disabled = done === 0;
    $('btn-skip-sec').disabled = done >= p.N;
    $('lap-sub').textContent = done >= p.N ? '끝내기를 눌러 채점하세요' : '한 문항 풀 때마다 누르기 · 스페이스';
    var al = $('run-alert'), msg = '';
    if (left <= 0) msg = '시간이 끝났어요';
    else if (el >= p.usable) msg = '마킹·검토 시간이에요 (' + L.fmt(left) + ' 남음)';
    else if (A.S.settings.warnMin > 0 && left <= A.S.settings.warnMin * 60) msg = '남은 시간 ' + A.S.settings.warnMin + '분 아래예요';
    if (msg) { al.textContent = msg; al.hidden = false; } else al.hidden = true;
  }
  function lapPop(behind) {
    var b = $('btn-lap');
    b.classList.remove('pop', 'pop-behind');
    void b.offsetWidth;
    b.classList.add(behind ? 'pop-behind' : 'pop');
  }

  /* ---------- 채점 ---------- */
  function gqButton(s, q, lap, flagged) {
    var v = gradeOf(s, q), skip = !lap || lap.skip;
    return '<button type="button" class="gq ' + v + (skip ? ' skip' : '') + '" data-act="g-cycle" data-q="' + q + '" aria-label="' + q + '번 ' + gradeText(v) + '">' +
      (flagged ? '<span class="star" aria-hidden="true">★</span>' : '') + q + '<small>' + (skip ? '못 품' : L.fmt(lap.t / 1000)) + '</small></button>';
  }
  function gradeCountText(s) {
    var sm = L.summary(s);
    return '맞음 ' + sm.o + ' · 찍어서 맞음 ' + sm.g + ' · 틀림 ' + sm.x + ' · 남은 ' + (sm.N - sm.graded);
  }
  function renderGrade(A, s) {
    var p = L.plan(s), lapBy = {};
    s.laps.forEach(function (l) { lapBy[l.q] = l; });
    var h = '<div class="spread" style="margin:12px 0 6px"><h2>채점</h2><span class="tiny">' + esc(s.name) + '</span></div>' +
      '<p class="hint">번호를 누를 때마다 맞음 → 틀림 → 찍어서 맞음 → 비움 순서로 바뀌어요. ★는 별표 남긴 문항이에요.</p>' +
      '<div class="legend"><span><i class="o"></i>맞음</span><span><i class="x"></i>틀림</span><span><i class="g"></i>찍어서 맞음</span><span><i></i>채점 안 함</span></div>' +
      '<div class="card"><div class="row wrap"><button type="button" class="btn ghost small" data-act="g-all">남은 문항 모두 맞음</button><button type="button" class="btn ghost small" data-act="g-clear">모두 비우기</button></div>' +
      '<form id="form-wrong" autocomplete="off" novalidate style="margin-top:10px"><label class="field"><span>틀린 번호 한꺼번에 넣기</span>' +
      '<div class="row"><input id="wrong-nums" maxlength="300" placeholder="예: 3, 7, 12-14" class="grow"><button type="submit" class="btn">틀림으로</button></div>' +
      '<span class="err" id="wrong-nums-err"></span></label></form>' +
      '<p class="small-t" id="grade-count" aria-live="polite">' + esc(gradeCountText(s)) + '</p></div>';
    p.secs.forEach(function (sec) {
      h += '<div class="grade-sec"><div class="sec-title">' + esc(sec.name) + ' (' + (sec.startQ + 1) + '~' + sec.endQ + '번)</div><div class="gq-grid">';
      for (var q = sec.startQ + 1; q <= sec.endQ; q++) h += gqButton(s, q, lapBy[q], lapBy[q] && lapBy[q].flag);
      h += '</div></div>';
    });
    h += '<div class="row wrap" style="margin-top:12px"><button type="button" class="btn ghost" data-act="g-skip">채점 없이 결과 보기</button>' +
      '<button type="button" class="btn primary grow" data-act="g-save">채점 저장</button></div>';
    $('grade-root').innerHTML = h;
  }
  function updateGq(A, s, q) {
    var b = document.querySelector('.gq[data-q="' + q + '"]');
    var lap = null;
    s.laps.forEach(function (l) { if (l.q === q) lap = l; });
    if (b) {
      var tmp = document.createElement('div');
      tmp.innerHTML = gqButton(s, q, lap, lap && lap.flag);
      var nb = tmp.firstChild;
      b.parentNode.replaceChild(nb, b);
      nb.focus();
    }
    var c = $('grade-count');
    if (c) c.textContent = gradeCountText(s);
  }

  /* ---------- 결과 ---------- */
  // 오래 걸린 문항: 접힌 상태에서는 고른 이유 하나만 보인다
  function reasonPicked(r) {
    var lab = '';
    D.REASONS.forEach(function (x) { if (x.id === r) lab = x.label; });
    return lab ? '<span class="chip reason-now on">' + esc(lab) + '</span>' : '<span class="tiny muted reason-now">이유 없음</span>';
  }
  function renderResult(A, s) {
    var sm = L.summary(s), p = sm.plan, prev = A.prevOf(s), adv = A.adviceFor(s), h = '';
    h += '<div class="spread" style="margin:12px 0 6px"><h2>결과</h2><span class="tiny">' + esc(L.dayLabel(s.date)) + '</span></div>';
    h += '<div class="card" id="res-head"><h3>' + esc(s.name) + (s.sample ? ' <span class="badge mine">예시</span>' : '') + '</h3>' +
      '<div class="stat-grid"><div class="stat"><b>' + L.fmt(sm.elapsed) + '</b><span>걸린 시간 (제한 ' + L.fmt(p.total) + ')</span></div>' +
      '<div class="stat"><b>' + sm.done + ' / ' + sm.N + '</b><span>끝낸 문항' + (s.ended === 'time' ? ' · 시간 끝' : '') + '</span></div>' +
      '<div class="stat"><b>' + (sm.acc === null ? '-' : sm.acc + '%') + '</b><span>' + (sm.acc === null ? '채점 안 함' : '정답률 (확실히 ' + sm.sure + '%)') + '</span></div>' +
      '<div class="stat"><b class="' + (sm.lastDelta > 0 ? 'plus' : 'minus') + '">' + esc(L.fmtDelta(sm.lastDelta)) + '</b><span>마지막 문항 페이스</span></div></div></div>';

    var maxT = 1;
    sm.secs.forEach(function (x) { maxT = Math.max(maxT, x.used, x.plan); });
    h += '<div class="sec-title">과목별 시간</div><div class="card"><div class="bars">';
    sm.secs.forEach(function (x) {
      h += '<div class="bar-row"><div class="spread"><b>' + esc(x.name) + '</b><span class="' + (x.diff > 0 ? 'plus' : 'minus') + '">' + L.fmt(x.used) + ' / ' + L.fmt(x.plan) + '</span></div>' +
        '<div class="bar"><i class="' + (x.used > x.plan ? 'over' : '') + '" style="width:' + (x.used / maxT * 100).toFixed(1) + '%"></i><b style="left:' + (x.plan / maxT * 100).toFixed(1) + '%"></b></div>' +
        '<div class="tiny">문항당 ' + Math.round(x.avg) + '초 (목표 ' + Math.round(x.per) + '초) · ' + x.done + '/' + x.count + '문항' +
        (x.flags ? ' · ★' + x.flags : '') + (x.acc === null ? '' : ' · 정답률 ' + x.acc + '%') + '</div></div>';
    });
    h += '</div><p class="fine">막대 안 세로 줄이 계획 시간이에요. 빨간 막대는 계획을 넘긴 과목이에요.</p></div>';

    h += '<div class="sec-title">다음 회에 해 볼 것</div><div class="card">';
    if (adv.length) adv.forEach(function (a) { h += '<div class="advice"><b>' + esc(a.title) + '</b><span>' + esc(a.text) + '</span></div>'; });
    else h += '<p class="small-t">눈에 띄게 고칠 곳이 없어요. 같은 속도로 다른 회차를 풀어 보세요.</p>';
    if (sm.acc === null) h += '<p class="fine">채점하면 정답률에 맞춘 제안도 나와요.</p>';
    h += '</div>';

    var sl = L.slowest(s, 5);
    h += '<div class="sec-title">오래 걸린 문항</div><div class="card">';
    if (!sl.length) h += miniEmpty('끝낸 문항이 없어 오래 걸린 문항을 고를 수 없어요. 같은 틀로 다시 풀어 보세요.',
      '<button type="button" class="btn primary" data-act="again" data-id="' + esc(s.id) + '">같은 틀로 다시</button>');
    sl.forEach(function (it) {
      var r = (s.reasons || {})[it.q] || '';
      h += '<div class="slow-item"><div class="spread"><b>' + it.q + '번 · ' + esc(p.secs[it.sec] ? p.secs[it.sec].name : '') + (it.flag ? ' ★' : '') + '</b>' +
        '<span class="plus">' + L.fmt(it.t) + ' (목표의 ' + it.ratio.toFixed(1) + '배)</span></div><div class="tiny">' + gradeText(gradeOf(s, it.q)) + '</div>' +
        '<div class="reason-pick">' + reasonPicked(r) +
        '<button type="button" class="btn ghost small" data-act="reason-open" data-q="' + it.q + '" aria-expanded="false" aria-controls="reason-' + it.q + '">' + (r ? '이유 바꾸기' : '이유 붙이기') + '</button></div>' +
        '<div class="reason-chips" id="reason-' + it.q + '" role="group" aria-label="' + it.q + '번 오래 걸린 이유" hidden>' + D.REASONS.map(function (rs) {
          return '<button type="button" class="chip" data-act="reason" data-q="' + it.q + '" data-r="' + rs.id + '" aria-pressed="' + (r === rs.id) + '">' + esc(rs.label) + '</button>';
        }).join('') + '</div></div>';
    });
    h += '</div>';

    if (prev) {
      var ps = L.summary(prev), dT = sm.elapsed - ps.elapsed;
      h += '<div class="sec-title">지난 회 (' + esc(L.dayLabel(prev.date)) + ')와 비교</div><div class="card"><p class="small-t">걸린 시간 <b class="' + (dT > 0 ? 'plus' : 'minus') + '">' +
        (Math.abs(dT) < 1 ? '같음' : L.fmtShort(dT) + (dT > 0 ? ' 늘었어요' : ' 줄었어요')) + '</b>' +
        (sm.acc !== null && ps.acc !== null ? ' · 정답률 ' + ps.acc + '% → ' + sm.acc + '%' : '') + '</p><table class="plan-table"><thead><tr><th>과목</th><th class="num">지난 회</th><th class="num">이번</th><th class="num">문항당 차이</th></tr></thead><tbody>';
      sm.secs.forEach(function (x) {
        var px = null;
        ps.secs.forEach(function (y) { if (y.name === x.name) px = y; });
        if (!px) return;
        var dd = x.avg - px.avg;
        h += '<tr><td>' + esc(x.name) + '</td><td class="num">' + L.fmt(px.used) + '</td><td class="num">' + L.fmt(x.used) + '</td><td class="num ' + (dd > 0 ? 'plus' : 'minus') + '">' + (dd > 0 ? '+' : dd < 0 ? '−' : '') + Math.abs(Math.round(dd)) + '초</td></tr>';
      });
      h += '</tbody></table></div>';
    }

    h += '<div class="sec-title">메모</div><div class="card"><form id="form-memo" autocomplete="off" novalidate><label class="field"><span>이 회차 메모 (200자까지)</span>' +
      '<textarea id="memo-text" rows="3" maxlength="400" placeholder="예: 독서 지문 3개째에서 집중이 흐려짐">' + esc(s.memo || '') + '</textarea><span class="err" id="memo-text-err"></span></label>' +
      '<button type="submit" class="btn">메모 저장</button></form></div>';

    h += '<div class="row wrap no-print" style="margin-top:8px"><button type="button" class="btn ghost" data-act="open-grade" data-id="' + esc(s.id) + '">채점 고치기</button>' +
      '<button type="button" class="btn ghost" data-act="sess-del" data-id="' + esc(s.id) + '">이 기록 지우기</button>' +
      '<button type="button" class="btn ghost" data-act="go" data-to="log">기록으로</button>' +
      '<button type="button" class="btn primary grow" data-act="again" data-id="' + esc(s.id) + '">같은 틀로 다시</button></div>';
    $('result-root').innerHTML = h;
  }

  /* ---------- 기록 ---------- */
  function renderLog(A) {
    var S = A.S, h = '<div class="spread" style="margin:4px 0 10px"><h2>기록</h2><button type="button" class="btn ghost small" data-act="print">인쇄</button></div>';
    if (!S.sessions.length) {
      $('log-root').innerHTML = h + emptyBox('아직 쌓인 기록이 없어요. 한 회를 풀면 과목별 속도와 정답률이 여기에 쌓여요.',
        '<button type="button" class="btn ghost" data-act="sample-add">예시로 둘러보기</button><button type="button" class="btn primary" data-act="go" data-to="exams">시험 틀 고르기</button>');
      return;
    }
    var names = [];
    S.sessions.forEach(function (s) { if (names.indexOf(s.name) < 0) names.push(s.name); });
    if (A.ui.logName !== '전체' && names.indexOf(A.ui.logName) < 0) A.ui.logName = '전체';
    h += '<div class="chips" role="group" aria-label="틀로 거르기">' + ['전체'].concat(names).map(function (n) {
      return '<button type="button" class="chip" data-act="log-filter" data-n="' + esc(n) + '" aria-pressed="' + (A.ui.logName === n) + '">' + esc(n) + '</button>';
    }).join('') + '</div>';
    h += '<div class="chips" role="group" aria-label="정렬">' + [['new', '최신순'], ['fast', '빠른순'], ['acc', '정답률순']].map(function (o) {
      return '<button type="button" class="chip" data-act="log-sort" data-s="' + o[0] + '" aria-pressed="' + (A.ui.logSort === o[0]) + '">' + o[1] + '</button>';
    }).join('') + '</div>';
    var list = A.sortedSessions(A.ui.logSort).filter(function (s) { return A.ui.logName === '전체' || s.name === A.ui.logName; });
    var sums = list.map(function (s) { return { s: s, sm: L.summary(s) }; });
    var accs = sums.filter(function (x) { return x.sm.acc !== null; });
    var avgAcc = accs.length ? Math.round(accs.reduce(function (a, x) { return a + x.sm.acc; }, 0) / accs.length) : null;
    var avgT = sums.length ? sums.reduce(function (a, x) { return a + x.sm.elapsed; }, 0) / sums.length : 0;
    h += '<div class="card"><div class="stat-grid"><div class="stat"><b>' + list.length + '회</b><span>푼 회차</span></div>' +
      '<div class="stat"><b>' + L.streak(S.sessions, L.today()) + '일</b><span>연속으로 푼 날</span></div>' +
      '<div class="stat"><b>' + (avgAcc === null ? '-' : avgAcc + '%') + '</b><span>평균 정답률</span></div>' +
      '<div class="stat"><b>' + L.fmt(avgT) + '</b><span>평균 걸린 시간</span></div></div></div>';

    var todayK = L.today(), ws = L.weekStart(todayK), days = {};
    S.sessions.forEach(function (s) { days[s.date] = (days[s.date] || 0) + 1; });
    h += '<div class="sec-title">이번 주</div><div class="card"><div class="week-dots">';
    for (var i = 0; i < 7; i++) {
      var k = L.addDays(ws, i);
      h += '<div><i class="' + (days[k] ? 'on' : '') + (k === todayK ? ' today' : '') + '"></i>' + '월화수목금토일'.charAt(i) + (days[k] ? ' ' + days[k] : '') + '</div>';
    }
    h += '</div></div>';

    var chrono = list.slice().sort(function (a, b) { return a.startedAt - b.startedAt; }).slice(-10);
    if (chrono.length) {
      var mx = 1;
      chrono.forEach(function (s) { mx = Math.max(mx, (s.elapsed || 0) / 1000, L.plan(s).usable); });
      h += '<div class="sec-title">최근 ' + chrono.length + '회 걸린 시간</div><div class="card"><div class="spark">' + chrono.map(function (s) {
        var e = (s.elapsed || 0) / 1000, over = e > L.plan(s).usable;
        return '<i class="' + (over ? 'over' : '') + '" style="height:' + Math.max(4, e / mx * 100).toFixed(1) + '%" title="' + esc(L.fmt(e)) + '"></i>';
      }).join('') + '</div><div class="spark-labels">' + chrono.map(function (s) {
        var d = L.fromKey(s.date);
        return '<span>' + (d.getMonth() + 1) + '/' + d.getDate() + '</span>';
      }).join('') + '</div><p class="fine">빨간 막대는 마킹 여유를 빼고 쓸 수 있는 시간을 넘긴 회차예요.</p></div>';
    }

    if (A.ui.logName !== '전체' && sums.length) {
      var bySec = {};
      sums.slice().sort(function (a, b) { return a.s.startedAt - b.s.startedAt; }).forEach(function (x) {
        x.sm.secs.forEach(function (y) {
          if (!y.done) return;
          var b = bySec[y.name] || (bySec[y.name] = { per: y.per, vals: [] });
          b.vals.push(y.avg);
        });
      });
      h += '<div class="sec-title">과목별 문항당 초 (오래된 회 → 최근 회)</div><div class="card"><table class="plan-table"><thead><tr><th>과목</th><th class="num">목표</th><th class="num">처음</th><th class="num">최근</th><th class="num">평균</th></tr></thead><tbody>';
      Object.keys(bySec).forEach(function (n) {
        var b = bySec[n], avg = b.vals.reduce(function (a, v) { return a + v; }, 0) / b.vals.length, lastV = b.vals[b.vals.length - 1];
        h += '<tr><td>' + esc(n) + '</td><td class="num">' + Math.round(b.per) + '</td><td class="num">' + Math.round(b.vals[0]) + '</td><td class="num ' + (lastV > b.per ? 'plus' : 'minus') + '">' + Math.round(lastV) + '</td><td class="num">' + Math.round(avg) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }

    var rc = {};
    list.forEach(function (s) { Object.keys(s.reasons || {}).forEach(function (q) { var r = s.reasons[q]; rc[r] = (rc[r] || 0) + 1; }); });
    var top = Object.keys(rc).sort(function (a, b) { return rc[b] - rc[a]; }).slice(0, 5);
    h += '<div class="sec-title">자주 붙인 이유</div><div class="card">';
    if (!top.length) h += miniEmpty('결과 화면의 오래 걸린 문항에 이유를 붙이면 여기에 모여요.',
      '<button type="button" class="btn" data-act="open-session" data-id="' + esc(list[0].id) + '">최근 결과에서 이유 붙이기</button>');
    top.forEach(function (r) {
      var lab = r;
      D.REASONS.forEach(function (x) { if (x.id === r) lab = x.label; });
      h += '<div class="spread small-t" style="padding:4px 0"><span>' + esc(lab) + '</span><b>' + rc[r] + '번</b></div>';
    });
    h += '</div>';

    h += '<div class="sec-title">회차 (' + list.length + ')</div>';
    sums.forEach(function (x) {
      var s = x.s;
      h += '<button type="button" class="sess-row" data-act="open-session" data-id="' + esc(s.id) + '"><span class="t">' + esc(s.name) + (s.sample ? ' · 예시' : '') + '</span>' +
        '<span class="r">' + L.fmt(x.sm.elapsed) + '</span><span class="d">' + esc(L.dayLabel(s.date)) + ' · ' + x.sm.done + '/' + x.sm.N + '문항' + (s.memo ? ' · 메모' : '') + '</span>' +
        '<span class="d" style="text-align:right">' + (x.sm.acc === null ? '채점 안 함' : '정답률 ' + x.sm.acc + '%') + '</span></button>';
    });
    $('log-root').innerHTML = h;
  }

  /* ---------- 더보기 ---------- */
  function sw(key, on, label) {
    return '<div class="set-row"><span>' + esc(label) + '</span><button type="button" class="btn small switch" data-act="set" data-k="' + key + '" aria-pressed="' + !!on + '">' + (on ? '켬' : '끔') + '</button></div>';
  }
  function renderMore(A) {
    var st = A.S.settings, h = '<h2 style="margin:4px 0 10px">더보기</h2>';
    h += '<div class="card"><h3>보기</h3><div class="set-row"><span>글자 크기</span><div class="row">' + [1, 2, 3].map(function (n) {
      return '<button type="button" class="chip" data-act="set-fs" data-v="' + n + '" aria-pressed="' + (st.fs === n) + '">' + ['보통', '크게', '더 크게'][n - 1] + '</button>';
    }).join('') + '</div></div>' + sw('dark', st.dark, '어두운 화면') + sw('reduce', st.reduce, '움직임 줄이기') + '</div>';
    h += '<div class="card"><h3>풀이 중 알림</h3>' + sw('vibrate', st.vibrate, '진동 (지원하는 기기만)') + sw('sound', st.sound, '짧은 소리') +
      '<div class="set-row"><span>남은 시간 경고</span><div class="row wrap">' + [0, 5, 10, 15].map(function (n) {
        return '<button type="button" class="chip" data-act="set-warn" data-v="' + n + '" aria-pressed="' + (st.warnMin === n) + '">' + (n ? n + '분' : '끔') + '</button>';
      }).join('') + '</div></div><p class="fine">마킹·검토 시간이 시작될 때와 남은 시간 경고 때 한 번씩 알려요.</p></div>';
    var sampleN = A.S.sessions.filter(function (s) { return s.sample; }).length;
    h += '<div class="card"><h3>데이터</h3><p class="small-t muted">기록은 이 기기 브라우저에만 저장돼요. 어디로도 보내지 않아요. 기기를 바꾸기 전에 내보내기로 옮겨 두세요.</p>' +
      '<div class="row wrap" style="margin-top:10px"><button type="button" class="btn" data-act="open-backup">내보내기·가져오기</button>' +
      (sampleN ? '<button type="button" class="btn ghost" data-act="sample-remove">예시 기록 빼기 (' + sampleN + ')</button>' : '<button type="button" class="btn ghost" data-act="sample-add">예시 기록 넣기</button>') +
      '<button type="button" class="btn ghost" data-act="print">기록 인쇄</button>' +
      '<button type="button" class="btn danger" data-act="clear-all">전체 지우기</button></div>' +
      '<p class="fine">저장된 것: 내 틀 ' + A.S.templates.length + '개, 회차 ' + A.S.sessions.length + '개</p></div>';
    h += '<div class="card"><h3>계산 점검</h3><p class="small-t muted">페이스·정답률 계산이 기획서 예시와 같은지 확인해요.</p><button type="button" class="btn" style="margin-top:8px" data-act="self-test">계산 점검 하기</button><div id="test-out"></div></div>';
    h += '<div class="card"><h3>정보</h3><p class="small-t">Pace Mark 1.0 · 서버·로그인·광고 없음</p><p class="small-t muted">기본 시험 틀은 ' + esc(D.BASIS) + '. 응시하는 시험의 문항 수·시간이 다르면 내 틀로 고쳐 쓰세요.</p></div>';
    $('more-root').innerHTML = h;
  }
  function renderTests(list) {
    var ok = list.filter(function (t) { return t.ok; }).length;
    $('test-out').innerHTML = '<p class="small-t" style="margin:8px 0"><b>' + ok + ' / ' + list.length + ' 맞음</b></p>' + list.map(function (t) {
      return '<div class="test-row' + (t.ok ? '' : ' bad-t') + '">' + (t.ok ? '✓ ' : '✗ ') + esc(t.name) + ' → ' + esc(String(t.got)) + (t.ok ? '' : ' (기대 ' + esc(String(t.want)) + ')') + '</div>';
    }).join('');
  }

  /* ---------- 방법 ---------- */
  function renderHelp() {
    var h = '<h2 style="margin:4px 0 10px">방법</h2>';
    h += '<div class="card"><h3>쓰는 순서</h3><ol class="steps">' +
      '<li><b>시험 틀</b>에서 풀 시험을 고르고 <b>시작 준비</b>를 눌러요. 과목 순서와 마킹 여유를 이번 회에만 바꿀 수 있어요.</li>' +
      '<li><b>시작</b>을 누르고 시험지를 풀어요. 한 문항을 끝낼 때마다 큰 <b>다음 문항</b> 버튼(키보드는 스페이스)을 눌러요.</li>' +
      '<li>위 띠가 <b>여유</b>(초록)인지 <b>늦음</b>(빨강)인지 보여 줘요. 노란 세로 줄은 지금 시각에 끝냈어야 할 문항이에요.</li>' +
      '<li>막힌 문항은 <b>★ 별표 남기고 넘김</b>, 잘못 눌렀으면 <b>한 문항 되돌리기</b>, 과목을 통째로 넘기려면 <b>이 과목 넘기기</b>.</li>' +
      '<li>다 풀면 <b>끝내기</b> → 채점(맞음·틀림·찍어서 맞음) → 결과에서 과목별 시간과 오래 걸린 문항을 봐요.</li>' +
      '<li>오래 걸린 문항에 이유를 붙여 두면 <b>기록</b>에 자주 붙인 이유가 모여요.</li></ol></div>';
    h += '<div class="card"><h3>개인정보</h3><p class="small-t">기록은 이 기기 브라우저에만 저장돼요. 서버로 보내지 않고, 로그인도 없어요. 브라우저 데이터를 지우면 기록도 지워지니 더보기 → 내보내기로 옮겨 두세요.</p></div>';
    h += '<div class="card"><h3>시험 구성 안내</h3><p class="small-t">기본 틀 15개는 ' + esc(D.BASIS) + '. 시험마다 해마다 바뀔 수 있어요. 다르면 <b>내 틀로 복사</b>해 문항 수·시간을 고쳐 쓰세요.</p></div>';
    h += '<div class="card"><h3>요령 ' + D.TIPS.length + '가지</h3><ol class="steps">' + D.TIPS.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>';
    h += '<button type="button" class="btn block" data-act="go" data-to="home">홈으로</button>';
    $('help-root').innerHTML = h;
  }

  window.UI = {
    $: $, esc: esc, swap: swap, show: show, openLayer: openLayer, closeLayer: closeLayer, topLayer: topLayer,
    toast: toast, hideToast: hideToast, fieldErr: fieldErr, markBad: markBad, clearErr: clearErr, flash: flash,
    renderHome: renderHome, renderExams: renderExams, renderExamList: renderExamList, renderPlan: renderPlan,
    renderTplRows: renderTplRows, fillTplForm: fillTplForm, runTick: runTick, lapPop: lapPop,
    renderGrade: renderGrade, updateGq: updateGq, renderResult: renderResult, renderLog: renderLog,
    renderMore: renderMore, renderTests: renderTests, renderHelp: renderHelp, reasonPicked: reasonPicked
  };
})();

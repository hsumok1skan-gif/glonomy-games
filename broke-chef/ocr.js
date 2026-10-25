// 한끼 계산기 — 사진 글자 읽기 (H-08) · 유통기한 날짜 찾기 (H-09)
// 실행기가 넣은 코드\vendor\tesseract\ 만 쓴다. 사진 기능을 처음 쓸 때만 불러오고,
// CDN·외부 주소로 요청하지 않으며 사진은 기기 밖으로 나가지 않는다.
'use strict';

var Ocr = (function () {
  var SCRIPT = './vendor/tesseract/tesseract.min.js';
  var STAGES = {
    'loading tesseract core': '글자 읽기 엔진 불러오는 중',
    'initializing tesseract': '엔진 준비 중',
    'loading language traineddata': '한국어·영어 글자 자료 불러오는 중',
    'initializing api': '글자 읽기 준비 중',
    'recognizing text': '사진에서 글자 읽는 중'
  };
  var scriptP = null, workerP = null, listeners = [];

  // file:// 로 열면 브라우저가 일꾼(Worker)과 파일 읽기를 막는다
  function available() { return location.protocol !== 'file:'; }
  function loaded() { return !!workerP; }

  function emit(label, pct, done) {
    listeners.forEach(function (fn) { try { fn(label, pct, done); } catch (e) { /* 표시가 실패해도 읽기는 계속 */ } });
  }
  function onProgress(fn) { listeners.push(fn); }

  function logger(m) {
    if (!m || !m.status) return;
    var p = typeof m.progress === 'number' ? m.progress : 0;
    emit(STAGES[m.status] || '준비 중', Math.max(0, Math.min(100, Math.round(p * 100))), false);
  }

  // 처음 쓸 때만 <script> 를 붙인다 (index.html 에 미리 넣지 않는다)
  function loadScript() {
    if (window.Tesseract) return Promise.resolve();
    if (scriptP) return scriptP;
    scriptP = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = function () { window.Tesseract ? resolve() : reject(new Error('no Tesseract')); };
      s.onerror = function () { s.remove(); reject(new Error('script')); };
      document.head.appendChild(s);
    });
    scriptP.catch(function () { scriptP = null; });
    return scriptP;
  }

  function load() {
    if (!available()) return Promise.reject(new Error('file'));
    if (workerP) return workerP;
    emit('글자 읽기 엔진 불러오는 중', 0, false);
    workerP = loadScript().then(function () {
      return Tesseract.createWorker('kor+eng', 1, {
        workerPath: './vendor/tesseract/worker.min.js',
        corePath: './vendor/tesseract/core',
        langPath: './vendor/tesseract/lang',
        gzip: false,
        logger: logger
      });
    }).then(function (worker) {
      // 쪽 나누기 모드 11(흩어진 글): 상품 띠처럼 한 줄·흩어진 날짜를 덜 조각낸다
      return worker.setParameters({ tessedit_pageseg_mode: '11' }).then(function () {
        emit('글자 읽기 준비 끝', 100, true);
        return worker;
      });
    });
    workerP.catch(function () { workerP = null; emit('', 0, true); });
    return workerP;
  }

  // 사진(dataURL·canvas·img)에서 글자를 읽어 돌려준다
  function read(src) {
    return load().then(function (worker) {
      return worker.recognize(src);
    }).then(function (r) {
      emit('글자 읽기 끝', 100, true);
      return (r && r.data && r.data.text) || '';
    });
  }

  // 작은 사진은 글자가 읽히게 키운다 (긴 쪽 1000px 아래면 최대 2배). 못 하면 그대로
  function prep(src) {
    return new Promise(function (resolve) {
      if (typeof src !== 'string') { resolve(src); return; }
      var img = new Image();
      img.onerror = function () { resolve(src); };
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight, long = Math.max(w, h);
          if (!long || long >= 1000) { resolve(src); return; }
          var k = Math.min(2, 1400 / long);
          var c = document.createElement('canvas');
          c.width = Math.round(w * k);
          c.height = Math.round(h * k);
          var g = c.getContext('2d');
          g.fillStyle = '#fff';
          g.fillRect(0, 0, c.width, c.height);
          g.imageSmoothingQuality = 'high';
          g.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        } catch (e) { resolve(src); }
      };
      img.src = src;
    });
  }

  // ---------- 유통기한 날짜 찾기 (H-09) ----------
  // 2026.11.03 · 26.11.03 · 2026-11-03 · 2026/11/03 · 2026년 11월 3일 · 11.03(올해) · '까지' 앞 날짜.
  // 띄어쓰기·점 빠짐(2026 11 03, 2026.1103, 20261103)도 받는다. 점검 예시는 SAMPLES.
  var KEY_BEFORE = /(유통|소비|기한|까지|exp|best|use\s*by|bb)[^\d]{0,8}$/i;
  var KEY_MAKE = /(제조|생산|포장|packed|mfd?)[^\d]{0,8}$/i;
  var UNIT_AFTER = /^\s*(ml|l|g|kg|mg|cm|mm|%|원|개|매|입|봉|kcal)/i;

  function fixDigits(text) {
    var t = String(text || '').replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    t = t.replace(/[．。｡]/g, '.').replace(/[－‐‑–—]/g, '-').replace(/／/g, '/');
    // 숫자 옆의 O·o 는 0, I·l·| 은 1 로 (글자 인식이 자주 헷갈린다)
    for (var i = 0; i < 2; i++) {
      t = t.replace(/(\d)([OoIl|])|([OoIl|])(\d)/g, function (m, a, b, c, d) {
        if (a) return a + (/[Oo]/.test(b) ? '0' : '1');
        return (/[Oo]/.test(c) ? '0' : '1') + d;
      });
    }
    return t;
  }
  function realDay(y, m, d) {
    return m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // [정규식, 종류, 기본 점수] — 긴 꼴부터 찾고, 이미 찾은 자리와 겹치면 건너뛴다
  var FORMS = [
    [/(^|\D)(20\d{2})(\s*(?:[.\-\/년]\s*)?)(\d{1,2})(\s*(?:[.\-\/월]\s*)?)(\d{1,2})(?:\s*일)?(?!\d)/g, 'full', 30],
    [/(^|\D)(\d{2})(\s*(?:[.\-\/년]\s*)?)(\d{1,2})(\s*(?:[.\-\/월]\s*)?)(\d{1,2})(?:\s*일)?(?!\d)/g, 'short', 20],
    [/(^|\D)()()(\d{1,2})(\s*(?:[.\-\/월]\s*)?)(\d{1,2})(?:\s*일)?(?!\d|\.\d)/g, 'md', 10]
  ];

  function findDate(text, todayStr) {
    var t = fixDigits(text);
    var now = todayStr || (window.Calc ? Calc.today() : new Date().toISOString().slice(0, 10));
    var thisYear = +now.slice(0, 4);
    var spans = [], best = null;
    FORMS.forEach(function (f) {
      var re = f[0], m;
      re.lastIndex = 0;
      while ((m = re.exec(t))) {
        var start = m.index + m[1].length, end = m.index + m[0].length;
        re.lastIndex = start + 1;
        if (spans.some(function (s) { return start < s[1] && end > s[0]; })) continue;
        var seps = (m[3] + m[5]).replace(/\s/g, ''), spaced = /\s/.test(m[3] + m[5]);
        var before = t.slice(Math.max(0, start - 14), start), after = t.slice(end, end + 8);
        var until = /^[\s.]*까/.test(after), key = until || KEY_BEFORE.test(before);
        // 구분 없이 붙은 숫자(261103·1103)나 띄어쓰기만 있는 짧은 꼴은 '유통기한'·'까지' 옆일 때만 날짜로 본다
        if (f[1] !== 'full' && !seps && !key) continue;
        if (f[1] === 'md' && UNIT_AFTER.test(after)) continue;
        var y = f[1] === 'full' ? +m[2] : f[1] === 'short' ? 2000 + +m[2] : thisYear;
        var mo = +m[4], d = +m[6];
        if (!realDay(y, mo, d) || y < thisYear - 3 || y > thisYear + 10) continue;
        spans.push([start, end]);
        var score = f[2] + (until ? 100 : 0) + (key ? 50 : 0) - (KEY_MAKE.test(before) ? 40 : 0) - (spaced && !seps ? 5 : 0);
        var date = y + '-' + pad(mo) + '-' + pad(d);
        // 점수가 같으면 늦은 날짜(제조일보다 유통기한이 뒤다)
        if (!best || score > best.score || (score === best.score && date > best.date)) best = { score: score, date: date };
      }
    });
    return best ? best.date : null;
  }

  // 점검 예시 (오늘 2026-10-25 기준): [읽은 글, 기대 날짜]
  var SAMPLES = [
    ['유통기한 2026.11.03 까지', '2026-11-03'],
    ['유통기한\n2026.11.03\n까지', '2026-11-03'],
    ['26.11.03까지', '2026-11-03'],
    ['2026-11-03', '2026-11-03'],
    ['2026/11/03', '2026-11-03'],
    ['11.03 까지', '2026-11-03'],
    ['유통기한 2026 11 03', '2026-11-03'],
    ['유통기한 2026.1103까지', '2026-11-03'],
    ['소비기한 20261103', '2026-11-03'],
    ['2O26.11.O3 까지', '2026-11-03'],
    ['2026년 11월 3일까지', '2026-11-03'],
    ['제조일 2026.10.20 유통기한 2026.11.03', '2026-11-03'],
    ['우유 1.5L 3,500원', null],
    ['2026.13.40', null]
  ];
  function selfTest() {
    return SAMPLES.map(function (s) {
      var got = findDate(s[0], '2026-10-25');
      return { text: s[0], want: s[1], got: got, ok: got === s[1] };
    });
  }

  // 사진 → { text, date } (앱의 사진 흐름과 시험 훅 window.__ocrTest 가 같이 쓴다)
  function scan(src) {
    return prep(src).then(function (big) {
      return read(big).then(function (text) {
        var date = findDate(text);
        if (date || big === src) return { text: text, date: date };
        // 키운 사진에서 못 찾으면 원래 사진으로 한 번 더
        return read(src).then(function (t2) {
          var d2 = findDate(t2);
          return d2 ? { text: t2, date: d2 } : { text: text, date: null };
        }, function () { return { text: text, date: null }; });
      });
    });
  }

  function stop() {
    if (!workerP) return Promise.resolve();
    var p = workerP;
    workerP = null;
    return p.then(function (w) { return w.terminate(); }, function () { /* 이미 실패 */ });
  }

  return {
    available: available, loaded: loaded, load: load, read: read, scan: scan, stop: stop, onProgress: onProgress,
    findDate: findDate, selfTest: selfTest
  };
})();

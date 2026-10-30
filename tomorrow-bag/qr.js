/* 내일 가방 — QR코드 그리기 (바이트 방식, 오류 정정 M, 1~40판). 바깥 도구 없이 이 파일만으로 만든다 */
var QR = (function () {
  // 판(버전)마다 묶음 하나의 오류 정정 글자 수와 묶음 수 — 오류 정정 M
  var ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  var ECL_M = 0; // 형식 정보에서 M 의 두 비트

  function utf8(s) {
    var out = [];
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xD800 && c < 0xDC00 && i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xDC00 && d < 0xE000) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  // 판 하나에 데이터를 넣을 수 있는 칸 수 (찾기·맞춤·타이밍·형식·판 정보 칸을 뺀 것)
  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver) { return Math.floor(rawModules(ver) / 8) - ECC[ver] * BLOCKS[ver]; }

  // ---- 리드-솔로몬 (GF(256), 0x11D) ----
  function gmul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function rsDivisor(deg) {
    var r = [];
    for (var i = 0; i < deg - 1; i++) r.push(0);
    r.push(1);
    var root = 1;
    for (i = 0; i < deg; i++) {
      for (var j = 0; j < r.length; j++) {
        r[j] = gmul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = gmul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      for (var i = 0; i < div.length; i++) r[i] ^= gmul(div[i], f);
    });
    return r;
  }

  // 데이터 글자를 묶음으로 나눠 오류 정정을 붙이고 엇갈려 늘어놓는다
  function addEcc(data, ver) {
    var nb = BLOCKS[ver], el = ECC[ver];
    var raw = Math.floor(rawModules(ver) / 8);
    var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var div = rsDivisor(el), blocks = [], k = 0;
    for (var i = 0; i < nb; i++) {
      var dat = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var out = [];
    for (i = 0; i < blocks[0].length; i++) {
      for (var j = 0; j < blocks.length; j++) {
        if (i !== shortLen - el || j >= nShort) out.push(blocks[j][i]);
      }
    }
    return out;
  }

  function alignPos(ver) {
    if (ver === 1) return [];
    var na = Math.floor(ver / 7) + 2;
    var step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
    var r = [6];
    for (var pos = ver * 4 + 17 - 7; r.length < na; pos -= step) r.splice(1, 0, pos);
    return r;
  }

  function bit(x, i) { return ((x >>> i) & 1) !== 0; }

  function make(text) {
    var bytes = utf8(text), ver;
    for (ver = 1; ver <= 40; ver++) {
      if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= dataCodewords(ver) * 8) break;
    }
    if (ver > 40) return null;
    var cap = dataCodewords(ver) * 8, bits = [];
    function put(v, n) { for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); }
    put(4, 4);                                  // 바이트 방식
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, cap - bits.length));     // 끝 표시
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var cw = [];
    for (var i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      cw.push(v);
    }
    var all = addEcc(cw, ver);

    var n = ver * 4 + 17, M = [], F = [];
    for (i = 0; i < n; i++) { M.push([]); F.push([]); for (j = 0; j < n; j++) { M[i].push(false); F[i].push(false); } }
    function setF(x, y, dark) { M[y][x] = dark; F[y][x] = true; }

    // 타이밍 줄
    for (i = 0; i < n; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    // 찾기 무늬 셋
    [[3, 3], [n - 4, 3], [3, n - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0] + dx, yy = c[1] + dy;
        if (xx >= 0 && xx < n && yy >= 0 && yy < n) setF(xx, yy, d !== 2 && d !== 4);
      }
    });
    // 맞춤 무늬
    var ap = alignPos(ver), last = ap.length - 1;
    for (i = 0; i < ap.length; i++) for (j = 0; j < ap.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) {
        setF(ap[i] + dx2, ap[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
      }
    }
    function drawFormat(mask) {
      var data = (ECL_M << 3) | mask, rem = data;
      for (var k = 0; k < 10; k++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var b = ((data << 10) | rem) ^ 0x5412;
      for (k = 0; k <= 5; k++) setF(8, k, bit(b, k));
      setF(8, 7, bit(b, 6)); setF(8, 8, bit(b, 7)); setF(7, 8, bit(b, 8));
      for (k = 9; k < 15; k++) setF(14 - k, 8, bit(b, k));
      for (k = 0; k < 8; k++) setF(n - 1 - k, 8, bit(b, k));
      for (k = 8; k < 15; k++) setF(8, n - 15 + k, bit(b, k));
      setF(8, n - 8, true);
    }
    drawFormat(0); // 자리만 잡아 둔다
    if (ver >= 7) {
      var rem = ver;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = (ver << 12) | rem;
      for (i = 0; i < 18; i++) {
        var a = n - 11 + i % 3, b2 = Math.floor(i / 3), dk = bit(vb, i);
        setF(a, b2, dk); setF(b2, a, dk);
      }
    }
    // 데이터 칸: 오른쪽 아래부터 두 줄씩 지그재그
    var bi = 0;
    for (var right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < n; vert++) for (j = 0; j < 2; j++) {
        var x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert;
        if (!F[y][x] && bi < all.length * 8) { M[y][x] = bit(all[bi >>> 3], 7 - (bi & 7)); bi++; }
      }
    }
    // 가림 무늬 8개 가운데 벌점이 가장 낮은 것
    function applyMask(m) {
      for (var yy = 0; yy < n; yy++) for (var xx = 0; xx < n; xx++) {
        if (F[yy][xx]) continue;
        var inv;
        switch (m) {
          case 0: inv = (xx + yy) % 2 === 0; break;
          case 1: inv = yy % 2 === 0; break;
          case 2: inv = xx % 3 === 0; break;
          case 3: inv = (xx + yy) % 3 === 0; break;
          case 4: inv = (Math.floor(xx / 3) + Math.floor(yy / 2)) % 2 === 0; break;
          case 5: inv = xx * yy % 2 + xx * yy % 3 === 0; break;
          case 6: inv = (xx * yy % 2 + xx * yy % 3) % 2 === 0; break;
          default: inv = ((xx + yy) % 2 + xx * yy % 3) % 2 === 0;
        }
        if (inv) M[yy][xx] = !M[yy][xx];
      }
    }
    var best = 0, bestP = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      var p = penalty(M, n);
      if (p < bestP) { bestP = p; best = m; }
      applyMask(m);
    }
    applyMask(best); drawFormat(best);
    return { version: ver, size: n, mask: best, modules: M };
  }

  function penalty(M, n) {
    var p = 0, x, y, k, dark = 0;
    for (var dir = 0; dir < 2; dir++) {
      for (y = 0; y < n; y++) {
        var line = [];
        for (x = 0; x < n; x++) line.push(dir ? M[x][y] : M[y][x]);
        var run = 1;
        for (x = 1; x <= n; x++) {
          if (x < n && line[x] === line[x - 1]) run++;
          else { if (run >= 5) p += run - 2; run = 1; }
        }
        // 찾기 무늬처럼 보이는 1:1:3:1:1 (한쪽에 밝은 칸 넷)
        for (x = 0; x + 7 <= n; x++) {
          if (line[x] && !line[x + 1] && line[x + 2] && line[x + 3] && line[x + 4] && !line[x + 5] && line[x + 6]) {
            var before = true, after = true;
            for (k = 1; k <= 4; k++) {
              if (x - k >= 0 && line[x - k]) before = false;
              if (x + 6 + k < n && line[x + 6 + k]) after = false;
            }
            if (before || after) p += 40;
          }
        }
      }
    }
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      if (M[y][x]) dark++;
      if (y < n - 1 && x < n - 1) {
        var c = M[y][x];
        if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3;
      }
    }
    var t = n * n;
    p += Math.max(0, Math.ceil(Math.abs(dark * 20 - t * 10) / t) - 1) * 10;
    return p;
  }

  // SVG 글. 둘레에 밝은 칸 4줄을 둔다. 색은 어두운 화면에서도 바뀌지 않는 --qr-ink·--qr-paper
  function svg(text, label) {
    var q = make(text);
    if (!q) return null;
    var n = q.size, s = n + 8, d = '';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      if (q.modules[y][x]) d += 'M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z';
    }
    return '<svg class="qr" viewBox="0 0 ' + s + ' ' + s + '" role="img" aria-label="' + String(label || 'QR코드').replace(/[&<>"']/g, '') + '" shape-rendering="crispEdges">' +
      '<rect width="' + s + '" height="' + s + '" fill="var(--qr-paper)"/><path d="' + d + '" fill="var(--qr-ink)"/></svg>';
  }

  return { make: make, svg: svg, utf8: utf8, dataCodewords: dataCodewords, rsDivisor: rsDivisor, rsRemainder: rsRemainder };
})();

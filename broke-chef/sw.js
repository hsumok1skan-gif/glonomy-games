// 한끼 계산기 — 오프라인 서비스워커
// 앱 화면 파일은 '먼저 인터넷, 안 되면 저장본'으로(고친 판이 바로 반영된다),
// 글자 읽기 엔진(vendor/, 17MB)은 처음 쓸 때 한 번 받아 두고 그 뒤로는 저장본을 쓴다.
// 화면 파일을 고치면 VERSION 만 올리면 된다.
var VERSION = 'hankki-v7';
var CORE = 'core-' + VERSION, VENDOR = 'vendor-v7.0.0';
var FILES = ["./", "index.html", "style.css", "manifest.json", "favicon.ico", "app.js", "calc.js", "cook.js", "data.js", "ingredient_alias.js", "notify.js", "ocr.js", "recipe_match.js", "store.js", "ui.js", "assets/한끼_계산기_2.webp", "assets/한끼_계산기_3.webp", "assets/한끼_계산기_4.webp", "assets/한끼_계산기_5.webp", "assets/한끼_계산기_6.webp", "assets/fridge_inside.webp", "assets/ic/ic00.webp", "assets/ic/ic01.webp", "assets/ic/ic02.webp", "assets/ic/ic03.webp", "assets/ic/ic04.webp", "assets/ic/ic05.webp", "assets/ic/ic06.webp", "assets/ic/ic07.webp", "assets/ic/ic08.webp", "assets/ic/ic09.webp", "assets/ic/ic10.webp", "assets/ic/ic11.webp", "assets/ic/ic12.webp", "assets/ic/ic13.webp", "assets/ic/ic14.webp", "assets/ic/ic15.webp", "assets/ic/ic16.webp", "assets/ic/ic17.webp", "assets/ic/ic18.webp", "assets/ic/ic19.webp", "assets/ic/ic20.webp", "assets/ic/ic21.webp", "assets/ic/ic22.webp", "assets/ic/ic23.webp", "assets/ic/ic24.webp", "assets/ic/ic25.webp", "assets/ic/ic26.webp", "assets/ic/ic27.webp", "assets/ic/ic28.webp", "assets/ic/ic29.webp", "assets/ic/ic30.webp", "assets/ic/ic31.webp", "assets/ic/ic32.webp", "assets/ic/ic33.webp", "assets/ic/ic34.webp", "assets/ic/ic35.webp", "assets/ic/ic36.webp", "assets/ic/ic37.webp", "assets/ic/ic38.webp", "assets/ic/ic39.webp", "assets/ic/ic40.webp", "assets/ic/ic41.webp", "assets/ic/ic42.webp", "assets/ic/ic43.webp", "assets/ic/ic44.webp", "assets/ic/ic45.webp", "assets/ic/ic46.webp", "assets/ic/ic47.webp", "assets/ic/ic48.webp", "assets/ic/ic49.webp", "assets/ic/ic50.webp", "assets/ic/ic51.webp", "assets/ic/ic52.webp", "assets/ic/ic53.webp", "assets/ic/ic54.webp", "assets/ic/ic55.webp", "assets/ic/ic56.webp", "assets/ic/ic57.webp", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon.svg", "icons/maskable-192.png", "icons/maskable-512.png", "vendor/capacitor/capacitor.js"];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CORE && k !== VENDOR; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/vendor/tesseract/') >= 0) {            // 큰 엔진 파일: 저장본 먼저
    e.respondWith(caches.open(VENDOR).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {             // 앱 파일: 인터넷 먼저
    if (res.ok) { var copy = res.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
    });
  }));
});

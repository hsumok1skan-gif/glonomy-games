// 한끼 계산기 — 오프라인 서비스워커
// 앱 화면 파일은 '먼저 인터넷, 안 되면 저장본'으로(고친 판이 바로 반영된다),
// 글자 읽기 엔진(vendor/, 17MB)은 처음 쓸 때 한 번 받아 두고 그 뒤로는 저장본을 쓴다.
// 화면 파일을 고치면 VERSION 만 올리면 된다.
var VERSION = 'hankki-v9';
var CORE = 'core-' + VERSION, VENDOR = 'vendor-v7.0.0';
var FILES = ["./", "index.html", "style.css", "manifest.json", "favicon.ico", "app.js", "calc.js", "cook.js", "data.js", "ingredient_alias.js", "notify.js", "ocr.js", "recipe_match.js", "store.js", "ui.js", "assets/한끼_계산기_2.webp", "assets/한끼_계산기_3.webp", "assets/한끼_계산기_4.webp", "assets/한끼_계산기_5.webp", "assets/한끼_계산기_6.webp", "assets/fridge_inside.webp", "assets/ic/ic00.webp", "assets/ic/ic01.webp", "assets/ic/ic02.webp", "assets/ic/ic03.webp", "assets/ic/ic04.webp", "assets/ic/ic05.webp", "assets/ic/ic06.webp", "assets/ic/ic07.webp", "assets/ic/ic08.webp", "assets/ic/ic09.webp", "assets/ic/ic10.webp", "assets/ic/ic11.webp", "assets/ic/ic12.webp", "assets/ic/ic13.webp", "assets/ic/ic14.webp", "assets/ic/ic15.webp", "assets/ic/ic16.webp", "assets/ic/ic17.webp", "assets/ic/ic18.webp", "assets/ic/ic19.webp", "assets/ic/ic20.webp", "assets/ic/ic21.webp", "assets/ic/ic22.webp", "assets/ic/ic23.webp", "assets/ic/ic24.webp", "assets/ic/ic25.webp", "assets/ic/ic26.webp", "assets/ic/ic27.webp", "assets/ic/ic28.webp", "assets/ic/ic29.webp", "assets/ic/ic30.webp", "assets/ic/ic31.webp", "assets/ic/ic32.webp", "assets/ic/ic33.webp", "assets/ic/ic34.webp", "assets/ic/ic35.webp", "assets/ic/ic36.webp", "assets/ic/ic37.webp", "assets/ic/ic38.webp", "assets/ic/ic39.webp", "assets/ic/ic40.webp", "assets/ic/ic41.webp", "assets/ic/ic42.webp", "assets/ic/ic43.webp", "assets/ic/ic44.webp", "assets/ic/ic45.webp", "assets/ic/ic46.webp", "assets/ic/ic47.webp", "assets/ic/ic48.webp", "assets/ic/ic49.webp", "assets/ic/ic50.webp", "assets/ic/ic51.webp", "assets/ic/ic52.webp", "assets/ic/ic53.webp", "assets/ic/ic54.webp", "assets/ic/ic55.webp", "assets/ic/ic56.webp", "assets/ic/ic57.webp", "assets/ic/ic58.webp", "assets/ic/ic59.webp", "assets/ic/ic60.webp", "assets/ic/ic61.webp", "assets/ic/ic62.webp", "assets/ic/ic63.webp", "assets/ic/ic64.webp", "assets/ic/ic65.webp", "assets/ic/ic66.webp", "assets/ic/ic67.webp", "assets/ic/ic68.webp", "assets/ic/ic69.webp", "assets/ic/ic70.webp", "assets/ic/ic71.webp", "assets/ic/ic72.webp", "assets/ic/ic73.webp", "assets/ic/ic74.webp", "assets/ic/ic75.webp", "assets/ic/ic76.webp", "assets/ic/ic77.webp", "assets/ic/ic78.webp", "assets/ic/ic79.webp", "assets/ic/ic80.webp", "assets/ic/ic81.webp", "assets/ic/ic82.webp", "assets/ic/ic83.webp", "assets/ic/ic84.webp", "assets/ic/ic85.webp", "assets/ic/ic86.webp", "assets/ic/ic87.webp", "assets/ic/ic88.webp", "assets/ic/ic89.webp", "assets/ic/ic90.webp", "assets/ic/ic91.webp", "assets/ic/ic92.webp", "assets/ic/ic93.webp", "assets/ic/ic94.webp", "assets/ic/ic95.webp", "assets/ic/ic96.webp", "assets/ic/ic97.webp", "assets/ic/ic98.webp", "assets/ic/ic99.webp", "assets/ic/ic100.webp", "assets/ic/ic101.webp", "assets/ic/ic102.webp", "assets/ic/ic103.webp", "assets/ic/ic104.webp", "assets/ic/ic105.webp", "assets/ic/ic106.webp", "assets/ic/ic107.webp", "assets/ic/ic108.webp", "assets/ic/ic109.webp", "assets/ic/ic110.webp", "assets/ic/ic111.webp", "assets/ic/ic112.webp", "assets/ic/ic113.webp", "assets/ic/ic114.webp", "assets/ic/ic115.webp", "assets/ic/ic116.webp", "assets/ic/ic117.webp", "assets/ic/ic118.webp", "assets/ic/ic119.webp", "assets/ic/ic120.webp", "assets/ic/ic121.webp", "assets/ic/ic122.webp", "assets/ic/ic123.webp", "assets/ic/ic124.webp", "assets/ic/ic125.webp", "assets/ic/ic126.webp", "assets/ic/ic127.webp", "assets/ic/ic128.webp", "assets/ic/ic129.webp", "assets/ic/ic130.webp", "assets/ic/ic131.webp", "assets/ic/ic132.webp", "assets/ic/ic133.webp", "assets/ic/ic134.webp", "assets/ic/ic135.webp", "assets/ic/ic136.webp", "assets/ic/ic137.webp", "assets/ic/ic138.webp", "assets/ic/ic139.webp", "assets/ic/ic140.webp", "assets/ic/ic141.webp", "assets/ic/ic142.webp", "assets/ic/ic143.webp", "assets/ic/ic144.webp", "assets/ic/ic145.webp", "assets/ic/ic146.webp", "assets/ic/ic147.webp", "assets/ic/ic148.webp", "assets/ic/ic149.webp", "assets/ic/ic150.webp", "assets/ic/ic151.webp", "assets/ic/ic152.webp", "assets/ic/ic153.webp", "assets/ic/ic154.webp", "assets/ic/ic155.webp", "assets/ic/ic156.webp", "assets/ic/ic157.webp", "assets/ic/ic158.webp", "assets/ic/ic159.webp", "assets/ic/ic160.webp", "assets/ic/ic161.webp", "assets/ic/ic162.webp", "assets/ic/ic163.webp", "assets/ic/ic164.webp", "assets/ic/ic165.webp", "assets/ic/ic166.webp", "assets/ic/ic167.webp", "assets/ic/ic168.webp", "assets/ic/ic169.webp", "assets/ic/ic170.webp", "assets/ic/ic171.webp", "assets/ic/ic172.webp", "assets/ic/ic173.webp", "assets/ic/ic174.webp", "assets/ic/ic175.webp", "assets/ic/ic176.webp", "assets/ic/ic177.webp", "assets/ic/ic178.webp", "assets/ic/ic179.webp", "assets/ic/ic180.webp", "assets/ic/ic181.webp", "assets/ic/ic182.webp", "assets/ic/ic183.webp", "assets/ic/ic184.webp", "assets/ic/ic185.webp", "assets/ic/ic186.webp", "assets/ic/ic187.webp", "assets/ic/ic188.webp", "assets/ic/ic189.webp", "assets/ic/ic190.webp", "assets/ic/ic191.webp", "assets/ic/ic192.webp", "assets/ic/ic193.webp", "assets/ic/ic194.webp", "assets/ic/ic195.webp", "assets/ic/ic196.webp", "assets/ic/ic197.webp", "assets/ic/ic198.webp", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon.svg", "icons/maskable-192.png", "icons/maskable-512.png", "vendor/capacitor/capacitor.js"];

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

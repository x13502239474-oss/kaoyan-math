/* Service Worker：离线可用 + 更新即时
   策略：同源 GET 走「网络优先」，成功即写入缓存；断网时回退缓存。
   这样改了源码刷新就能生效，同时 PWA 安装后离线依旧能学习。 */
var CACHE = 'kaoyan-math-v2';
var CORE = [
  './', './index.html', './manifest.webmanifest',
  './css/tokens.css', './css/base.css', './css/components.css', './css/views.css',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './js/core/utils.js', './js/core/math.js', './js/core/storage.js',
  './js/core/state.js', './js/core/grading.js', './js/core/router.js',
  './js/data/taxonomy.js', './js/data/courses.js', './js/data/formulas.js',
  './js/data/questions.js', './js/data/answers.js',
  './js/views/_common.js', './js/views/home.js', './js/views/courses.js',
  './js/views/formulas.js', './js/views/practice.js', './js/views/review.js',
  './js/views/wrong.js', './js/views/exam.js', './js/views/stats.js',
  './js/views/settings.js', './js/views/more.js', './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

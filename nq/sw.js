/* NQ K-line trainer PWA offline cache (isolated nqkt-* namespace; safe alongside gold-trainer) */
var APP = 'nqkt-app-1.1-hub-link';
var DATA = 'nqkt-data-a5a198d161';
var SHELL = [
  './',
  'index.html',
  'app.js',
  'kz.js',
  'lib/lightweight-charts.standalone.production.js',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'data/nq/index.js'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(APP).then(function (c) { return c.addAll(SHELL); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(
      ks.filter(function (k) { return k.indexOf('nqkt-') === 0 && k !== APP && k !== DATA; })
        .map(function (k) { return caches.delete(k); })
    );
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) {
  if (e.data === 'skip') self.skipWaiting();
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.indexOf('/api/') >= 0) return;
  var isData = /\/data\/nq\/y_\d{4}\.js$/.test(url.pathname);
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(isData ? DATA : APP).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return req.mode === 'navigate' ? caches.match('index.html') : Response.error();
    });
  }));
});

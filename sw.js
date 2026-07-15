const CACHE = 'orbit-hr-v490-final-ready-static';
const ASSETS = [
  './','./index.html','./styles.css','./app.js','./manifest.json',
  './orbit-mark-ui.png','./orbit-logo-ui.png','./icon-192.png','./icon-512.png','./privacy.html','./terms.html'
];
function isApiOrSensitive(url){
  const u = new URL(url);
  if (u.origin !== location.origin) return true;
  if (u.pathname.startsWith('/api/')) return true;
  if (u.pathname.includes('/server_data/')) return true;
  return /(?:initial_state\.json|server\.py|start_server\.py|\.sqlite3|server_secret\.key|backup)/i.test(u.pathname);
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && key.startsWith('orbit-hr-')).map(key => caches.delete(key))))
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).pathname.startsWith('/api/')) return;
  if (isApiOrSensitive(event.request.url)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
    return response;
  }).catch(() => caches.match('./index.html'))));
});

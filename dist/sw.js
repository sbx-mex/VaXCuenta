/* VERSION is replaced by the build; each project path owns its own cache. */
const VERSION = '7054f38e2e12c58d';
const BASE = new URL('./', self.registration.scope);
const PREFIX = `vaxcuenta-${BASE.pathname}-`;
const CACHE = PREFIX + VERSION;
const SHELL = ['./','./index.html','./styles.css','./app.mjs','./model.mjs','./export.mjs','./pwa.mjs',
  './manifest.webmanifest','./assets/icon.svg','./assets/campaign-frame.png','./assets/icon-192.png',
  './assets/icon-512.png','./assets/icon-maskable-512.png','./assets/apple-touch-icon.png','./data/dashboard.json'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new URL(path, BASE).href))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const isData = url.pathname === new URL('data/dashboard.json',BASE).pathname;
  if (isData || event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(event.request);
        if (!response.ok) throw new Error('Network response unavailable');
        await cache.put(isData ? new URL('data/dashboard.json',BASE).href : event.request,response.clone());
        return response;
      } catch {
        const saved = await cache.match(isData ? new URL('data/dashboard.json',BASE).href : event.request) || (!isData && await cache.match(new URL('index.html',BASE).href));
        if (!saved) return new Response('VaXCuenta no tiene un corte descargado. Vuelve a abrir el enlace con conexión.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
        if (!isData) return saved;
        const headers = new Headers(saved.headers); headers.set('X-VaXCuenta-Offline','true');
        return new Response(await saved.blob(),{status:200,headers});
      }
    })());
  } else {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const saved = await cache.match(event.request);
      if (saved) return saved;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request,response.clone());
      return response;
    }));
  }
});

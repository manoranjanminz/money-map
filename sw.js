/* Money Map service worker: works offline, and receives statements shared from other apps (Android). */
const VERSION = 'mm-v4';
const SHARE = 'mm-share';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png'];
// libraries the app loads on demand (Excel + PDF readers) and fonts: cached the first time they're used
const RUNTIME_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== SHARE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // 1) "Share → Money Map" from Gmail, Files, WhatsApp… (Android): keep the files, then open the app
  if(req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/share')){
    e.respondWith((async () => {
      try{
        const form = await req.formData();
        const files = form.getAll('statements').filter(f => f && typeof f === 'object' && f.size);
        const cache = await caches.open(SHARE);
        await Promise.all(files.map((f, i) => cache.put(`./shared/${Date.now()}-${i}`,
          new Response(f, {headers: {'x-name': encodeURIComponent(f.name || `statement-${i}`), 'content-type': f.type || 'application/octet-stream'}}))));
      }catch(err){}
      return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if(req.method !== 'GET') return;
  // 2) the app page itself: try the network first so updates arrive, fall back to the saved copy offline
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // 3) everything else (icons, libraries, fonts): saved copy first, network to fill gaps
  if(url.origin === location.origin || RUNTIME_HOSTS.includes(url.hostname)){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if(res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});

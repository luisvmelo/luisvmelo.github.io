const CACHE = 'agenda-v9';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
  './js/dados.js', './js/ui.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

/* `cache: 'reload'` obriga a buscar da rede. Sem isso o navegador entrega o
   arquivo do cache HTTP dele (o GitHub Pages manda max-age=600) e o service
   worker grava uma versão velha no cache novo — e passa a servir isso para
   sempre, porque a estratégia aqui é cache-first. */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async url => {
      try{
        const res = await fetch(new Request(url, {cache:'reload'}));
        if(res.ok) await c.put(url, res);
      }catch(err){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// cache-first para os assets, network-first para o resto
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

// abrir o app ao tocar na notificação
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});

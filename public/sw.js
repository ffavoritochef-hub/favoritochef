// Service worker mínimo: torna o app instalável (PWA) sem cachear páginas,
// para que cada deploy apareça imediatamente.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title><body style="font-family:sans-serif;text-align:center;padding:48px 16px;color:#0F172A"><h1>Sem conexão</h1><p>Verifique sua internet e tente novamente.</p><button onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:10px;background:#2563EB;color:#fff;font-size:16px">Tentar de novo</button></body>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    )
  );
});

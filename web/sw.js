/* GPlanSiS|Drawings — service worker do PWA (escopo /).
   Guarda só o "app shell" estático. /api/* e tudo que não for GET passam direto para a rede, sem cache.
   HTML: rede primeiro, cache como reserva offline. JS/CSS/ícones/vendor: cache primeiro (cache versionado).
   VERSION é trocada pelo deploy/publicar.sh a cada publicação; o activate apaga os caches antigos. */
'use strict';
const VERSION = '__V__';
const CACHE = 'drawings-shell-' + VERSION;
const v = u => u + '?v=' + VERSION;
const SHELL = ['/', v('/cad.css'), v('/plataforma.css'), v('/celular.css'), v('/tema.js'), v('/cad.js'), v('/cadimport.js'),
  v('/cadexport.js'), v('/plataforma.js'), v('/pwa.js'), '/icon.svg', '/manifest.webmanifest',
  '/icones/icon-192.png', '/icones/icon-512.png', '/icones/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('drawings-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;                       // nunca intercepta POST/PUT/PATCH/DELETE
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;        // fontes e afins: navegador cuida
  if (u.pathname === '/api' || u.pathname.startsWith('/api/')) return;   // API nunca passa pelo SW
  if (u.pathname === '/sw.js') return;
  if (r.mode === 'navigate') { e.respondWith(paginaHtml(r)); return; }
  e.respondWith(estatico(r));
});

// HTML: rede primeiro; guarda a última versão boa em "/" para abrir sem internet
async function paginaHtml(r) {
  const c = await caches.open(CACHE);
  try {
    const resp = await fetch(r);
    if (resp.ok && (resp.headers.get('content-type') || '').includes('text/html')) c.put('/', resp.clone());
    return resp;
  } catch (_) {
    return (await c.match('/')) || new Response('<!doctype html><meta charset="utf-8"><title>GPlanSiS|Drawings</title><p style="font:16px system-ui;padding:24px">Sem conexão. Abra o GPlanSiS|Drawings de novo quando a internet voltar.</p>',
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
}

// estáticos: cache primeiro; o que vier da rede com sucesso entra no cache desta versão
async function estatico(r) {
  const c = await caches.open(CACHE);
  const hit = await c.match(r);
  if (hit) return hit;
  const resp = await fetch(r);
  if (resp.ok && resp.type === 'basic') c.put(r, resp.clone());
  return resp;
}

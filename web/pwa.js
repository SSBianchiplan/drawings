/* GPlanSiS|Drawings — PWA e ajustes de celular (sem script inline, por causa da CSP).
   1) registra o service worker (/sw.js, escopo /);
   2) celular: tocar de novo na aba já selecionada recolhe/abre a faixa de ferramentas (mais área de desenho). */
'use strict';
(() => {
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(e => console.warn('Service worker não registrado:', e.message));
    });
  }
  const K = 'gpd:ribbonMin';
  const aplica = min => {
    document.body.classList.toggle('rib-min', min);
    try { localStorage.setItem(K, min ? '1' : '0'); } catch (_) {}
    window.dispatchEvent(new Event('resize'));   // o CAD redimensiona o canvas
  };
  try { if (localStorage.getItem(K) === '1') document.body.classList.add('rib-min'); } catch (_) {}
  // fase de captura: lê o estado da aba antes do cad.js redesenhar a faixa
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#tabs .tab');
    if (!t) return;
    if (t.getAttribute('aria-selected') === 'true') aplica(!document.body.classList.contains('rib-min'));
    else if (document.body.classList.contains('rib-min')) aplica(false);
  }, true);
})();

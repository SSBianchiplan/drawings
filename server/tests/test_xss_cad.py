"""XSS por campos do documento (achado M7): um desenho (.json aberto, compartilhado ou vindo do
servidor) com texto no lugar de números/cores não pode injetar marcação no painel de
propriedades, na lista de camadas, na prévia da plotagem nem no SVG exportado.

Abre o cad.js de verdade num Chrome sem interface (sem CSP, para testar o escape em si).
Pula se não houver Chrome/Chromium (defina CHROME=/caminho/do/binario).
"""
from __future__ import annotations

import functools
import http.server
import os
import re
import shutil
import subprocess
import threading
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parent.parent.parent / "web"
CANDIDATOS = [os.environ.get("CHROME", ""), "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]
CHROME = next((c for c in CANDIDATOS if c and os.access(c, os.X_OK)), None)

ATAQUE = r"""
<script>
addEventListener('load',()=>setTimeout(()=>{try{
  window.__pwned=0;
  const X='"><img src=x onerror="window.__pwned++">';
  loadDoc({name:'t',ltscale:X,thickness:X,textH:X,dim:{scale:X,txt:X,dec:X,dli:X,arrow:'tick'},wall:{t:X,ins:X,h:X},
    layers:[{name:'0',color:'#000" onmouseover="window.__pwned++',lt:'CONTINUOUS',lw:0.25,on:true,frozen:false,locked:false}],
    ents:[{id:1,type:'image',src:'x" onload="window.__pwned++',p:{x:X,y:0},w:10,h:10,alpha:X,layer:'0',color:'BL',lt:'BL',lw:-1,lts:X,th:X,el:X},
          {id:2,type:'line',a:{x:0,y:0},b:{x:100,y:0},layer:'0',color:'#f00"/><img src=x onerror="window.__pwned++">',lt:'BL',lw:-1}],
    vps:[{x:X,y:10,w:100,h:50,cx:0,cy:0,sc:X,title:X,off:X}],nextId:3});
  const h=document.createElement('div');h.id='alvo';document.body.appendChild(h);
  SEL.clear();renderProps();h.insertAdjacentHTML('beforeend',document.querySelector('#propsBody').innerHTML);
  SEL.add(1);renderProps();h.insertAdjacentHTML('beforeend',document.querySelector('#propsBody').innerHTML);
  renderLayers();h.insertAdjacentHTML('beforeend',document.querySelector('#layersList').innerHTML);
  h.insertAdjacentHTML('beforeend',plotSVG()+modelSVG());
  try{dlgSettings();h.insertAdjacentHTML('beforeend',document.querySelector('#mdlB').innerHTML)}catch(e){}
  setTimeout(()=>{const n=h.querySelectorAll('[onerror],[onload],[onmouseover],script').length;
    document.title='RES pwned='+window.__pwned+' on='+n},800);
}catch(e){document.title='ERR '+e.message}},1500));
</script>
"""


@pytest.mark.skipif(CHROME is None, reason="Chrome/Chromium não encontrado")
def test_campos_do_documento_nao_injetam_html(tmp_path):
    site = tmp_path / "site"
    shutil.copytree(WEB, site)
    idx = (site / "index.html").read_text().replace("__V__", "t")
    idx = idx.replace('<script src="/pwa.js?v=t"></script>', "")
    (site / "harness.html").write_text(idx.replace("</body>", ATAQUE + "</body>"))
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(site))
    handler.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={tmp_path / 'perfil'}",
                            "--virtual-time-budget=6000", "--dump-dom", f"http://127.0.0.1:{srv.server_address[1]}/harness.html"],
                           capture_output=True, text=True, timeout=120)
    finally:
        srv.shutdown()
    m = re.search(r"<title>([^<]*)</title>", r.stdout)
    assert m, r.stdout[:500]
    assert m.group(1) == "RES pwned=0 on=0", m.group(1)

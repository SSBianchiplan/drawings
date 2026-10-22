/* GPlanSiS|Drawings — exportação DXF AutoCAD 2018 e DWG (beta).
   O navegador monta um modelo intermediário com a geometria exata do CAD (paredes, cotas e chamadas
   já resolvidas pelas mesmas funções que desenham a tela); o servidor escreve o arquivo com ezdxf.
   Blocos, hachuras, polilinhas e textos multilinha saem nativos — não explodidos como no DXF R12. */
'use strict';
{
const cor=c=>c==='BL'||c==null?'BL':c==='BB'?'BB':typeof c==='string'&&c.startsWith('L:')?'BL':c;
const base=e=>({layer:e.layer||'0',color:cor(e.color),lt:e.lt&&e.lt!=='BL'?e.lt:'BL',lw:typeof e.lw==='number'&&e.lw>0?e.lw:-1});
const xy=p=>[+p.x.toFixed(6),+p.y.toFixed(6)];
let simplificados={};

function texto(t,b){return{t:'text',p:xy(t.p),h:t.h,s:String(t.s??''),rot:(t.rot||0)*R2D,al:t.al||'l',vb:t.vb||'b',...b}}
function grupoCota(e){const G=e.type==='dim'?dimGeom(e):leaderGeom(e),b=base(e),out=[];
  G.L.concat(G.K||[]).forEach(([a,c])=>out.push({t:'line',a:xy(a),b:xy(c),...b}));
  (G.AR||[]).forEach(a=>out.push({t:'arc',c:xy(a.c),r:a.r,a0:a.a0*R2D,a1:a.a1*R2D,...b}));
  (G.A||[]).forEach(a=>{const d=nrm(a.dir),n=perp(d),q=sub(a.p,mul(d,a.s));out.push({t:'solid',pts:[a.p,add(q,mul(n,a.s*.18)),sub(q,mul(n,a.s*.18))].map(xy),...b})});
  (G.T||[]).forEach(t=>out.push(texto(t,b)));return{t:'grupo',ents:out}}
function conv(e){const b=base(e);
  switch(e.type){
    case 'line':return{t:'line',a:xy(e.a),b:xy(e.b),...b};
    case 'pline':return e.pts.length>1?{t:'pline',pts:e.pts.map(xy),closed:!!e.closed,...b}:null;
    case 'circle':return{t:'circle',c:xy(e.c),r:e.r,...b};
    case 'arc':return{t:'arc',c:xy(e.c),r:e.r,a0:normA(e.a0)*R2D,a1:normA(e.a1)*R2D,...b};
    case 'ellipse':return{t:'ellipse',c:xy(e.c),rx:e.rx,ry:e.ry,rot:(e.rot||0)*R2D,...b};
    case 'spline':return{t:'pline',pts:splinePts(e.pts,e.closed,10).map(xy),closed:false,...b};
    case 'point':return{t:'point',p:xy(e.p),...b};
    case 'text':return texto(e,b);
    case 'attdef':return{t:'attdef',tag:e.tag,def:String(e.def??''),prompt:e.prompt||e.tag,p:xy(e.p),h:e.h,rot:(e.rot||0)*R2D,al:e.al||'l',vb:e.vb||'b',...b};
    case 'xline':return{t:e.ray?'ray':'xline',p:xy(e.p),d:xy(nrm(e.d)),...b};
    case 'hatch':return{t:'hatch',loops:e.loops.map(l=>l.map(xy)),pat:e.pat||'SOLID',sc:e.sc||1,ang:e.ang||0,...b};
    case 'insert':return doc.blocks[e.name]?{t:'insert',name:e.name,p:xy(e.p),sx:e.sx??1,sy:e.sy??e.sx??1,rot:(e.rot||0)*R2D,attrs:e.attrs||{},...b}:null;
    case 'wall':{const w=wallPolys(e);return{t:'grupo',ents:w.core.concat(w.ins).map(p=>({t:'pline',pts:p.map(xy),closed:true,...b}))}}
    case 'dim':case 'leader':return grupoCota(e);
    default:{// tipos especiais (tubulação, GD&T, imagem…): a geometria de linhas/arcos que o CAD conhece
      const pr=primsC(e);simplificados[e.type]=(simplificados[e.type]||0)+1;if(!pr.length)return null;
      return{t:'grupo',ents:pr.map(q=>q.t==='c'?{t:'circle',c:xy(q.c),r:q.r,...b}:q.t==='a'?{t:'arc',c:xy(q.c),r:q.r,a0:q.a0*R2D,a1:q.a1*R2D,...b}:{t:'line',a:xy(q.a),b:xy(q.b),...b})}}}}
const lista=ents=>ents.map(conv).filter(Boolean);

function modelo(){simplificados={};const usados=new Set(),fila=doc.ents.filter(visible).filter(e=>e.type==='insert').map(e=>e.name);
  while(fila.length){const n=fila.pop();if(usados.has(n)||!doc.blocks[n])continue;usados.add(n);(doc.blocks[n].ents||[]).forEach(x=>{if(x.type==='insert')fila.push(x.name)})}
  const blocks={};for(const n of usados){const B=doc.blocks[n];blocks[n]={base:xy(B.base||P(0,0)),ents:lista(B.ents||[])}}
  return{nome:doc.name,ltscale:doc.ltscale||1,
    layers:doc.layers.map(L=>({name:L.name,color:typeof L.color==='number'?L.color:7,lt:L.lt||'CONTINUOUS',lw:L.lw||0.25,on:L.on!==false,frozen:!!L.frozen,locked:!!L.locked})),
    blocks,ents:lista(doc.ents.filter(visible)),simplificados}}

async function exportar(formato){const m=modelo();toast(formato==='dwg'?'Gerando DWG…':'Gerando DXF…',20000);
  const r=await fetch('/api/cad/exportar?formato='+formato,{method:'POST',headers:{'x-drawings':'1','content-type':'application/json'},body:JSON.stringify(m),credentials:'same-origin'});
  if(!r.ok){let t=`Erro ${r.status}`;try{t=(await r.json()).detail||t}catch(_){}throw new Error(t)}
  const nome=(doc.name||'desenho').replace(/[^\w\-]+/g,'_')+'.'+formato;await download(nome,await r.blob(),formato==='dwg'?'application/acad':'application/dxf');
  const s=Object.entries(m.simplificados);toast(`${nome} gerado`+(s.length?` · simplificados em linhas: ${s.map(([t,n])=>`${t} ${n}`).join(', ')}`:''),s.length?6000:2500)}

// acrescenta as opções novas no diálogo Exportar
dlgExport=(o=>function(){o();const L=$('#mdlB .flist');if(!L)return;
  L.insertAdjacentHTML('afterbegin',`<div><span><b>DXF AutoCAD 2018</b> — recomendado: blocos, hachuras, polilinhas, textos multilinha e camadas nativos</span><button class="tb primary" data-xn="dxf">Baixar</button></div>
    <div><span><b>DWG</b> AutoCAD 2000 <span class="pl-badge sel">beta</span> — gerado pelo LibreDWG; confira no seu CAD antes de enviar a terceiros</span><button class="tb" data-xn="dwg">Baixar</button></div>`);
  const r12=[...L.children].find(d=>d.querySelector('[data-ex="dxf"]'));if(r12)r12.querySelector('span').innerHTML='<b>DXF R12</b> — compatibilidade máxima com programas antigos (tudo explodido em linhas) — ZIP';
  L.addEventListener('click',async ev=>{const b=ev.target.closest('[data-xn]');if(!b)return;b.disabled=true;try{await exportar(b.dataset.xn)}catch(err){toast('Não foi possível exportar: '+err.message,5000)}finally{b.disabled=false}})})(dlgExport);

window.cadExport={modelo,exportar};
}

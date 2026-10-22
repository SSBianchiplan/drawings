/* GPlanSiS|Drawings — leitura de arquivos CAD (DXF de qualquer versão ASCII; DWG convertido no servidor).
   Converte para as entidades do CAD (cad.js). O que o CAD não tem nativamente vira geometria fiel:
   arcos de polilinha (bulge), B-splines/NURBS, elipses parciais e arestas de hachura viram pontos densos.
   Exposto em window.cadImport; a plataforma liga permissões, arrastar-e-soltar e a biblioteca. */
'use strict';
{
/* ---------------- texto: codificação e códigos de controle ---------------- */
const CP={ANSI_1252:'windows-1252',ANSI_1250:'windows-1250',ANSI_1251:'windows-1251',ANSI_1253:'windows-1253',ANSI_1254:'windows-1254',
  ANSI_1255:'windows-1255',ANSI_1256:'windows-1256',ANSI_1257:'windows-1257',ANSI_874:'windows-874',ANSI_932:'shift_jis',ANSI_936:'gbk',ANSI_949:'euc-kr',ANSI_950:'big5'};
function decodifica(buf){const u8=new Uint8Array(buf);
  const ini=new TextDecoder('latin1').decode(u8.subarray(0,22));
  if(ini.startsWith('AutoCAD Binary DXF'))throw new Error('DXF binário não é suportado — salve o arquivo como DXF ASCII');
  try{return new TextDecoder('utf-8',{fatal:true}).decode(u8).replace(/^﻿/,'')}
  catch(_){const cab=new TextDecoder('latin1').decode(u8.subarray(0,60000));const m=/\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*(\S+)/i.exec(cab);
    const cp=(m&&CP[m[1].toUpperCase()])||'windows-1252';try{return new TextDecoder(cp).decode(u8)}catch(_){return new TextDecoder('windows-1252').decode(u8)}}}
const uni=s=>s.replace(/\\U\+([0-9A-Fa-f]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
const pct=s=>s.replace(/%%[cC]/g,'Ø').replace(/%%[dD]/g,'°').replace(/%%[pP]/g,'±').replace(/%%[uUoOkK]/g,'').replace(/%%%/g,'%').replace(/%%(\d{3})/g,(_,n)=>String.fromCharCode(+n));
function limpaMText(s){s=uni(s);let o='',i=0;
  while(i<s.length){const c=s[i];
    if(c==='\\'){const n=s[i+1];
      if(n==='P'||n==='X'){o+='\n';i+=2;continue}if(n==='~'){o+=' ';i+=2;continue}
      if(n==='\\'||n==='{'||n==='}'){o+=n;i+=2;continue}
      if('LlOoKk'.includes(n)){i+=2;continue}
      if(n==='S'){const j=s.indexOf(';',i);const t=s.slice(i+2,j<0?s.length:j);o+=t.replace(/[\^#]/,'/');i=j<0?s.length:j+1;continue}
      if('ACcFfHQTWp'.includes(n)){const j=s.indexOf(';',i);i=j<0?s.length:j+1;continue}
      o+=n||'';i+=2;continue}
    if(c==='{'||c==='}'){i++;continue}o+=c;i++}
  return pct(o)}

/* ---------------- geometria auxiliar ---------------- */
const UNID={0:['sem unidade',1],1:['polegada',25.4],2:['pé',304.8],3:['milha',1609344],4:['milímetro',1],5:['centímetro',10],6:['metro',1000],7:['quilômetro',1e6],
  8:['micropolegada',2.54e-5],9:['mil',0.0254],10:['jarda',914.4],11:['ângstrom',1e-7],12:['nanômetro',1e-6],13:['mícron',1e-3],14:['decímetro',100]};
function arcoBulge(a,b,bu,out){const th=4*Math.atan(bu),dx=b.x-a.x,dy=b.y-a.y,c=Math.hypot(dx,dy);
  if(c<1e-9||Math.abs(bu)<1e-9){out.push(b);return}
  const r=c/(2*Math.sin(th/2)),h=r*Math.cos(th/2),mx=(a.x+b.x)/2,my=(a.y+b.y)/2,cx=mx-h*dy/c,cy=my+h*dx/c;
  const R=Math.hypot(a.x-cx,a.y-cy),a0=Math.atan2(a.y-cy,a.x-cx),n=Math.max(2,Math.ceil(Math.abs(th)/(Math.PI/36)));
  for(let i=1;i<n;i++){const t=a0+th*i/n;out.push(P(cx+R*Math.cos(t),cy+R*Math.sin(t)))}out.push(b)}
function arcoPts(c,r,a0,a1,ccw,out){let sw=ccw?a1-a0:a0-a1;while(sw<=1e-9)sw+=2*Math.PI;if(sw>2*Math.PI)sw-=2*Math.PI;
  const n=Math.max(2,Math.ceil(sw/(Math.PI/36)));for(let i=0;i<=n;i++){const t=a0+(ccw?1:-1)*sw*i/n;out.push(P(c.x+r*Math.cos(t),c.y+r*Math.sin(t)))}}
function elipsePts(c,ax,razao,t0,t1,norm,out){const mn=norm<0?P(ax.y*razao,-ax.x*razao):P(-ax.y*razao,ax.x*razao);
  let sw=t1-t0;while(sw<=1e-9)sw+=2*Math.PI;const n=Math.max(8,Math.ceil(sw/(Math.PI/36)));
  for(let i=0;i<=n;i++){const t=t0+sw*i/n,ct=Math.cos(t),st=Math.sin(t);out.push(P(c.x+ax.x*ct+mn.x*st,c.y+ax.y*ct+mn.y*st))}}
function nurbs(ctrl,pesos,nos,p,amostras){const n=ctrl.length;if(n<2)return ctrl.slice();
  if(!nos||nos.length!==n+p+1||p<1)return ctrl.slice();
  const w=pesos&&pesos.length===n?pesos:ctrl.map(()=>1),u0=nos[p],u1=nos[n],out=[];
  for(let s=0;s<=amostras;s++){const t=Math.min(u0+(u1-u0)*s/amostras,u1-1e-12*(u1-u0||1));let k=p;while(k<n-1&&t>=nos[k+1])k++;
    const d=[];for(let j=0;j<=p;j++){const q=ctrl[k-p+j],wt=w[k-p+j];d.push([q.x*wt,q.y*wt,wt])}
    for(let r=1;r<=p;r++)for(let j=p;j>=r;j--){const i=k-p+j,den=nos[i+p-r+1]-nos[i],a=den?(t-nos[i])/den:0;for(let q=0;q<3;q++)d[j][q]=(1-a)*d[j-1][q]+a*d[j][q]}
    out.push(P(d[p][0]/d[p][2],d[p][1]/d[p][2]))}
  return out}
// curva suave pelos pontos de ajuste (Catmull-Rom centrípeta) quando o arquivo não traz pontos de controle
function pelosPontos(f){if(f.length<3)return f.slice();const out=[f[0]];
  for(let i=0;i<f.length-1;i++){const p0=f[Math.max(0,i-1)],p1=f[i],p2=f[i+1],p3=f[Math.min(f.length-1,i+2)];
    const t=(a,b)=>Math.sqrt(Math.hypot(b.x-a.x,b.y-a.y))||1e-6,t1=t(p0,p1),t2=t1+t(p1,p2),t3=t2+t(p2,p3);
    for(let k=1;k<=12;k++){const u=t1+(t2-t1)*k/12,L=(a,b,ta,tb)=>{const w=(tb-ta)||1e-6;return P(a.x*(tb-u)/w+b.x*(u-ta)/w,a.y*(tb-u)/w+b.y*(u-ta)/w)};
      const A1=L(p0,p1,0,t1),A2=L(p1,p2,t1,t2),A3=L(p2,p3,t2,t3),B1=L(A1,A2,0,t2),B2=L(A2,A3,t1,t3);out.push(L(B1,B2,t1,t2))}}
  return out}
const semRepetir=pts=>pts.filter((q,i)=>!i||Math.hypot(q.x-pts[i-1].x,q.y-pts[i-1].y)>1e-9);

/* ---------------- leitor DXF ---------------- */
function lerDXF(texto,opc={}){
  const L=texto.split(/\r?\n/),G=[];for(let i=0;i+1<L.length;i+=2){const c=parseInt(L[i],10);if(isNaN(c))continue;G.push([c,c===1||c===3?L[i+1]:L[i+1].trim()])}
  // cabeçalho: versão, unidades
  const cab={};for(let i=0;i<G.length;i++){if(G[i][0]===2&&G[i][1]==='ENTITIES')break;if(G[i][0]===9&&G[i+1])cab[G[i][1]]=G[i+1][1]}
  const insunits=+(cab.$INSUNITS||0),unid=opc.unidade!=null?+opc.unidade:insunits,k=(UNID[unid]||UNID[0])[1];
  const d=newDoc('Importado');d.layers=[];const blocos={},fora={},tipos={};let ign=0;
  const conta=(t,ok)=>{if(ok)tipos[t]=(tipos[t]||0)+1;else{fora[t]=(fora[t]||0)+1;ign++}};
  const camada=(nm,cor,lt,fl,lw)=>{if(d.layers.some(l=>l.name===nm))return;const ltu=String(lt||'CONTINUOUS').toUpperCase();
    d.layers.push({name:nm,color:Math.abs(+cor||7)||7,lt:LTYPES.hasOwnProperty(ltu)?ltu:'CONTINUOUS',lw:lw>0?lw/100:0.25,on:(+cor||1)>0,frozen:!!(fl&1),locked:!!(fl&4)})};
  // registros: [tipo, pares]
  const R=[];let sec=null;
  for(let i=0;i<G.length;){const[c,v]=G[i];
    if(c===0&&v==='SECTION'){sec=G[i+1]&&G[i+1][1];i+=2;continue}if(c===0&&v==='ENDSEC'){sec=null;i++;continue}
    if(c===0&&(sec==='TABLES'||sec==='BLOCKS'||sec==='ENTITIES')){const g=[];let j=i+1;while(j<G.length&&G[j][0]!==0){g.push(G[j]);j++}R.push({sec,t:v,g});i=j;continue}i++}
  const um=(r,c,def)=>{for(const[cc,v]of r.g)if(cc===c)return v;return def};
  const n_=(r,c,def=0)=>{const v=um(r,c);return v===undefined?def:+v};
  const todos=(r,c)=>r.g.filter(x=>x[0]===c).map(x=>x[1]);
  const S=v=>v*k;
  for(const r of R)if(r.sec==='TABLES'&&r.t==='LAYER')camada(String(um(r,2,'0')),n_(r,62,7),um(r,6),n_(r,70),n_(r,370,-3));
  function base(r){const layer=String(um(r,8,'0'));camada(layer,7);const cor=n_(r,62,256);let lt=String(um(r,6,'BYLAYER')).toUpperCase();
    if(lt==='BYLAYER'||lt==='BYBLOCK'||!LTYPES.hasOwnProperty(lt))lt='BL';const lw=n_(r,370,-1);
    return{layer,color:cor===256?'BL':cor===0?'BB':Math.abs(cor),lt,lw:lw>0?lw/100:-1}}
  const vira=r=>n_(r,230,1)<0;  // extrusão (0,0,-1): espelha X do sistema do objeto (OCS)
  const pOCS=(r,c)=>{const x=S(n_(r,c)),y=S(n_(r,c+10));return vira(r)?P(-x,y):P(x,y)};
  const pW=(r,c)=>P(S(n_(r,c)),S(n_(r,c+10)));
  const pl=(pts,fechada,b)=>{pts=semRepetir(pts);if(fechada&&pts.length>2&&Math.hypot(pts[0].x-pts.at(-1).x,pts[0].y-pts.at(-1).y)<1e-9)pts.pop();return pts.length>1?{type:'pline',pts,closed:!!fechada,...b}:null};
  function vertices(lista,fechada,flip){const out=[];if(!lista.length)return out;out.push(lista[0].p);
    const m=fechada?lista.length:lista.length-1;for(let i=0;i<m;i++){const a=lista[i],b=lista[(i+1)%lista.length];arcoBulge(a.p,b.p,flip?-a.b:a.b,out)}
    if(fechada)out.pop();return out}
  function textoEnt(r,b,s){const h72=n_(r,72),v73=n_(r,73),usa11=(h72||v73)&&um(r,11)!==undefined;
    const al=h72===1||h72===4?'c':h72===2?'r':'l',vb=h72===4?'m':v73===2?'m':v73===3?'t':'b';let rot=n_(r,50)*D2R,p=usa11?pOCS(r,11):pOCS(r,10);
    if(vira(r))rot=Math.PI-rot;return{type:'text',p,h:S(n_(r,40,2.5)),s:pct(uni(s)),rot,al,vb,...b}}
  function hachura(r,b){const g=r.g;let i=0;const loops=[];const nx=()=>g[i++];
    while(i<g.length&&g[i][0]!==91)i++;if(i>=g.length)return null;const np=+g[i][1];i++;
    for(let p=0;p<np&&i<g.length;p++){while(i<g.length&&g[i][0]!==92)i++;const fl=+nx()[1];const pts=[];
      if(fl&2){let bul=false,fech=true,nv=0;while(i<g.length&&g[i][0]!==10){const[c,v]=nx();if(c===72)bul=+v===1;if(c===73)fech=+v===1;if(c===93)nv=+v}
        const vs=[];for(let q=0;q<nv&&i<g.length;q++){const x=+nx()[1],y=+nx()[1];let bb=0;if(bul&&g[i]&&g[i][0]===42)bb=+nx()[1];vs.push({p:P(S(x),S(y)),b:bb})}
        pts.push(...vertices(vs,true,false))}
      else{while(i<g.length&&g[i][0]!==93)i++;const ne=+nx()[1];
        for(let e=0;e<ne&&i<g.length;e++){while(i<g.length&&g[i][0]!==72)i++;const tp=+nx()[1];const f={};const fs={};
          const pega=lista=>{for(const c of lista){if(g[i]&&g[i][0]===c)f[c]=+nx()[1]}};
          if(tp===1){pega([10,20,11,21]);pts.push(P(S(f[10]),S(f[20])),P(S(f[11]),S(f[21])))}
          else if(tp===2){pega([10,20,40,50,51,73]);const ccw=f[73]!==0,a0=(ccw?f[50]:-f[50])*D2R,a1=(ccw?f[51]:-f[51])*D2R;arcoPts(P(S(f[10]),S(f[20])),S(f[40]),a0,a1,ccw,pts)}
          else if(tp===3){pega([10,20,11,21,40,50,51,73]);const ccw=f[73]!==0;const t0=(ccw?f[50]:-f[51])*D2R,t1=(ccw?f[51]:-f[50])*D2R;const tmp=[];
            elipsePts(P(S(f[10]),S(f[20])),P(S(f[11]),S(f[21])),f[40],t0,t1,1,tmp);pts.push(...(ccw?tmp:tmp.reverse()))}
          else if(tp===4){pega([94,73,74,95,96]);const nos=[],cs=[],ws=[],fit=[];
            for(let q=0;q<(f[95]||0)&&g[i]&&g[i][0]===40;q++)nos.push(+nx()[1]);
            for(let q=0;q<(f[96]||0)&&g[i]&&g[i][0]===10;q++){const x=+nx()[1],y=+nx()[1];cs.push(P(S(x),S(y)));if(g[i]&&g[i][0]===42)ws.push(+nx()[1])}
            // 97 aqui pode ser "pontos de ajuste" (seguido de 11 ou de outro 97) ou já o "nº de objetos de contorno" do caminho
            if(g[i]&&g[i][0]===97&&g[i+1]&&(g[i+1][0]===11||g[i+1][0]===97||g[i+1][0]===12)){const nf=+nx()[1];
              for(let q=0;q<nf&&g[i]&&g[i][0]===11;q++){const x=+nx()[1],y=+nx()[1];fit.push(P(S(x),S(y)))}while(g[i]&&[12,22,13,23].includes(g[i][0]))i++}
            pts.push(...(cs.length>1?nurbs(cs,f[73]===1?ws:null,nos,f[94]||3,Math.max(24,cs.length*8)):pelosPontos(fit)))}}}
      while(i<g.length&&g[i][0]===97){const nb=+nx()[1];for(let q=0;q<nb&&g[i]&&g[i][0]===330;q++)i++}
      const lp=semRepetir(pts);if(lp.length>2)loops.push(lp)}
    if(!loops.length)return null;const nome=String(um(r,2,'')).toUpperCase(),solido=n_(r,70)===1;
    const pat=solido?'SOLID':PATTERNS[nome]?nome:'ANSI31';return{type:'hatch',loops,pat,sc:Math.max(n_(r,41,1),1e-6)*(pat==='SOLID'?1:k),ang:n_(r,52),...b}}
  function conv(r,emBloco){const t=r.t,b=base(r);
    switch(t){
      case 'LINE':return{type:'line',a:pW(r,10),b:pW(r,11),...b};
      case 'POINT':return{type:'point',p:pW(r,10),...b};
      case 'CIRCLE':return{type:'circle',c:pOCS(r,10),r:S(n_(r,40)),...b};
      case 'ARC':{let a0=n_(r,50)*D2R,a1=n_(r,51)*D2R;if(vira(r))[a0,a1]=[Math.PI-a1,Math.PI-a0];return{type:'arc',c:pOCS(r,10),r:S(n_(r,40)),a0,a1,...b}}
      case 'ELLIPSE':{const c=pW(r,10),ax=pW(r,11),ra=n_(r,40,1),t0=n_(r,41),t1=n_(r,42,2*Math.PI),inteira=Math.abs(t0)<1e-6&&Math.abs(t1-2*Math.PI)<1e-6;
        if(inteira&&!vira(r))return{type:'ellipse',c,rx:len(ax),ry:len(ax)*ra,rot:Math.atan2(ax.y,ax.x),...b};
        const pts=[];elipsePts(c,ax,ra,t0,t1,n_(r,230,1),pts);return pl(pts,inteira,b)}
      case 'LWPOLYLINE':{const vs=[];for(const[c,v]of r.g){if(c===10)vs.push({p:P(S(+v),0),b:0});else if(c===20&&vs.length)vs.at(-1).p.y=S(+v);else if(c===42&&vs.length)vs.at(-1).b=+v}
        if(vira(r))vs.forEach(v=>v.p.x=-v.p.x);const fech=(n_(r,70)&1)===1;return pl(vs.some(v=>v.b)?vertices(vs,fech,vira(r)):vs.map(v=>v.p),fech,b)}
      case 'SPLINE':{const cs=[],fit=[];for(const[c,v]of r.g){if(c===10)cs.push(P(S(+v),0));else if(c===20&&cs.length)cs.at(-1).y=S(+v);else if(c===11)fit.push(P(S(+v),0));else if(c===21&&fit.length)fit.at(-1).y=S(+v)}
        const fl=n_(r,70),pts=cs.length>1?nurbs(cs,fl&4?todos(r,41).map(Number):null,todos(r,40).map(Number),n_(r,71,3),Math.min(600,Math.max(32,cs.length*10))):pelosPontos(fit);return pl(pts,false,b)}
      case 'TEXT':case 'ATTRIB':{if(t==='ATTRIB'&&(n_(r,70)&1))return null;const s=String(um(r,1,''));if(!pct(uni(s)).trim())return null;return textoEnt(r,b,s)}
      case 'MTEXT':{const ap=n_(r,71,1),al=[1,4,7].includes(ap)?'l':[2,5,8].includes(ap)?'c':'r',vb=ap<=3?'t':ap<=6?'m':'b';
        const s=todos(r,3).join('')+String(um(r,1,''));if(!limpaMText(s).trim())return null;let rot=n_(r,50)*D2R;if(um(r,11)!==undefined)rot=Math.atan2(n_(r,21),n_(r,11));
        return{type:'text',p:pW(r,10),h:S(n_(r,40,2.5)),s:limpaMText(s),rot,al,vb,...b}}
      case 'SOLID':case 'TRACE':{const q=[pOCS(r,10),pOCS(r,11),pOCS(r,13),pOCS(r,12)];return{type:'hatch',loops:[semRepetir(q)],pat:'SOLID',sc:1,ang:0,...b}}
      case '3DFACE':return pl([pW(r,10),pW(r,11),pW(r,12),pW(r,13)],true,b);
      case 'LEADER':{const vs=[];for(const[c,v]of r.g){if(c===10)vs.push(P(S(+v),0));else if(c===20&&vs.length)vs.at(-1).y=S(+v)}return pl(vs,false,b)}
      case 'MLINE':{const vs=[];for(const[c,v]of r.g){if(c===11)vs.push(P(S(+v),0));else if(c===21&&vs.length)vs.at(-1).y=S(+v)}return pl(vs,(n_(r,71)&2)===2,b)}
      case 'XLINE':case 'RAY':{const p=pW(r,10),dx=n_(r,11),dy=n_(r,21),l=Math.hypot(dx,dy)||1;return{type:'xline',p,d:P(dx/l,dy/l),...b}}
      case 'HATCH':return hachura(r,b);
      case 'INSERT':case 'DIMENSION':{const nm=String(um(r,2,'')).toUpperCase();if(!nm)return null;
        if(t==='DIMENSION')return{type:'insert',name:nm,p:P(0,0),sx:1,sy:1,rot:0,...b};
        let p=pOCS(r,10),sx=n_(r,41,1),sy=n_(r,42,1),rot=n_(r,50)*D2R;if(vira(r)){sx=-sx;rot=Math.PI-rot}
        const nc=Math.max(1,n_(r,70,1)),nl=Math.max(1,n_(r,71,1));if(nc*nl===1)return{type:'insert',name:nm,p,sx,sy,rot,...b};
        const dc=S(n_(r,44)),dl=S(n_(r,45)),cs=Math.cos(rot),sn=Math.sin(rot),out=[];
        for(let a=0;a<nl;a++)for(let c=0;c<nc;c++){const ox=c*dc,oy=a*dl;out.push({type:'insert',name:nm,p:P(p.x+ox*cs-oy*sn,p.y+ox*sn+oy*cs),sx,sy,rot,...b})}return out}
      default:return undefined}}
  // percorre BLOCKS e ENTITIES
  let blk=null,pularBloco=false,i=0;const out=[];
  while(i<R.length){const r=R[i];
    if(r.sec==='BLOCKS'&&r.t==='BLOCK'){const nm=String(um(r,2,'')).toUpperCase();pularBloco=/^\*(MODEL|PAPER)_SPACE/.test(nm)||!!(n_(r,70)&4);
      blk=pularBloco?null:{name:nm,label:String(um(r,2,'')),kind:'user',base:P(S(n_(r,10)),S(n_(r,20))),ents:[]};i++;continue}
    if(r.sec==='BLOCKS'&&r.t==='ENDBLK'){if(blk&&blk.name)blocos[blk.name]=blk;blk=null;pularBloco=false;i++;continue}
    if(r.sec==='TABLES'){i++;continue}
    if(r.sec==='BLOCKS'&&pularBloco){i++;continue}
    if(r.sec==='ENTITIES'&&n_(r,67)===1){i++;while(R[i]&&['VERTEX','SEQEND','ATTRIB'].includes(R[i].t))i++;conta('espaço de papel',false);continue}
    const dest=r.sec==='BLOCKS'?blk&&blk.ents:out;if(!dest){i++;continue}
    if(r.t==='POLYLINE'){const fl=n_(r,70);i++;const fx=vira(r)&&!(fl&8),vs=[];while(R[i]&&R[i].t==='VERTEX'){const v=R[i];const vf=n_(v,70);if(!(vf&16)&&!(vf&128&&!(vf&64))){const q=pW(v,10);vs.push({p:fx?P(-q.x,q.y):q,b:n_(v,42)})}i++}
      if(R[i]&&R[i].t==='SEQEND')i++;
      if(fl&(16|64)){conta('POLYLINE (malha 3D)',false);continue}
      const b=base(r),fech=(fl&1)===1,flip=fx,e=pl(vs.some(v=>v.b)?vertices(vs,fech,flip):vs.map(v=>v.p),fech,b);
      if(e){dest.push(e);conta('POLYLINE',true)}continue}
    if(r.t==='ATTDEF'){i++;continue}  // modelos de atributo dentro de blocos não aparecem no desenho
    let e;try{e=conv(r,!!blk)}catch(err){e=null;console.warn('DXF: falha em',r.t,err)}
    if(e===undefined){conta(r.t,false);i++;continue}
    const lista=e?[].concat(e):[];for(const x of lista){if(blk&&x.layer==='0'&&x.color==='BL')x.color='BB';dest.push(x)}if(lista.length)conta(r.t,true);  // null = objeto vazio/degenerado: some sem alarde
    i++;if(r.t==='INSERT'&&n_(r,66)===1){while(R[i]&&R[i].t==='ATTRIB'){const a=conv(R[i]);if(a){dest.push(a);conta('ATTRIB',true)}i++}if(R[i]&&R[i].t==='SEQEND')i++}}
  if(!d.layers.some(l=>l.name==='0'))d.layers.unshift({name:'0',color:7,lt:'CONTINUOUS',lw:0.25,on:true,frozen:false,locked:false});
  for(const s of STD_LAYERS)if(!d.layers.some(l=>l.name===s[0]))d.layers.push({name:s[0],color:s[1],lt:s[2],lw:s[3],on:true,frozen:false,locked:false});
  d.blocks=Object.assign(builtinBlocks(),blocos);
  const semBloco=out.filter(e=>e.type==='insert'&&!d.blocks[e.name]).length;
  d.ents=out.filter(e=>e.type!=='insert'||d.blocks[e.name]);d.ents.forEach(e=>{e.id=d.nextId++});
  return{doc:d,info:{versao:cab.$ACADVER||'?',insunits,unidade:unid,escala:k,tipos,fora,ignorados:ign,semBloco,blocos:Object.keys(blocos).length,camadas:d.layers.length}}}

const VERSOES={AC1009:'R12',AC1012:'R13',AC1014:'R14',AC1015:'2000',AC1018:'2004',AC1021:'2007',AC1024:'2010',AC1027:'2013',AC1032:'2018'};
const nomeVersao=v=>VERSOES[v]?`AutoCAD ${VERSOES[v]}`:v;

/* ---------------- arquivo → texto DXF ---------------- */
async function lerArquivo(f){const ext=(f.name.match(/\.([^.]+)$/)||[])[1]?.toLowerCase();const buf=await f.arrayBuffer();
  if(ext==='json'||ext==='gpd')return{json:JSON.parse(new TextDecoder().decode(buf))};
  const cab=new TextDecoder('latin1').decode(new Uint8Array(buf,0,Math.min(6,buf.byteLength)));
  if(ext==='dwg'||cab.startsWith('AC10')){
    const r=await fetch('/api/cad/dwg2dxf',{method:'POST',headers:{'x-drawings':'1','content-type':'application/octet-stream','x-arquivo':encodeURIComponent(f.name)},body:buf,credentials:'same-origin'});
    if(!r.ok){let m=`Erro ${r.status}`;try{m=(await r.json()).detail||m}catch(_){}throw new Error(m)}
    return{texto:decodifica(await r.arrayBuffer()),origem:'DWG '+nomeVersao(r.headers.get('x-dwg-versao')||cab)}}
  return{texto:decodifica(buf),origem:'DXF'}}
const nomeBase=f=>f.name.replace(/\.[^.]+$/,'');

/* ---------------- inserir no desenho atual ---------------- */
function mescla(d){withUndo(()=>{
  for(const l of d.layers)if(!doc.layers.some(x=>x.name===l.name))doc.layers.push(l);
  const ren={},bi=builtinBlocks();
  for(const[nm,b]of Object.entries(d.blocks)){if(bi[nm])continue;let novo=nm,n=1;while(doc.blocks[novo])novo=`${nm}_IMP${n++}`;ren[nm]=novo;doc.blocks[novo]=Object.assign(b,{name:novo})}
  const fix=e=>{if(e.type==='insert'&&ren[e.name])e.name=ren[e.name]};
  for(const b of Object.values(d.blocks))(b.ents||[]).forEach(fix);
  for(const e of d.ents){fix(e);e.id=doc.nextId++;doc.ents.push(e)}});
  renderBlocks();refreshPanels();if(typeof renderLayerSel==='function')renderLayerSel();zoomExt()}

/* ---------------- diálogo de importação ---------------- */
function resumo(info){const T=Object.entries(info.tipos).sort((a,b)=>b[1]-a[1]),F=Object.entries(info.fora).sort((a,b)=>b[1]-a[1]);
  return `<div class="small" style="line-height:1.6">${T.map(([t,n])=>`${esc(t)} <b>${n}</b>`).join(' · ')||'nenhum objeto'}</div>
  ${F.length?`<p class="small" style="margin:6px 0 0">Não importados: ${F.map(([t,n])=>`${esc(t)} ${n}`).join(' · ')}</p>`:''}
  ${info.semBloco?`<p class="small" style="margin:6px 0 0">${info.semBloco} inserção(ões) de bloco sem definição no arquivo.</p>`:''}`}
async function dialogo(f,{podeInserir,aoAbrir}){
  let a;toast('Lendo '+f.name+'…',8000);
  try{a=await lerArquivo(f)}catch(e){toast('Não foi possível ler: '+e.message,5000);return}
  if(a.json){aoAbrir(a.json,nomeBase(f));return}
  let r;try{r=lerDXF(a.texto)}catch(e){console.error(e);toast('Arquivo não reconhecido: '+e.message,5000);return}
  const inf=r.info,uSel=inf.insunits||4,temAtual=doc.ents.length>0;
  modal('Importar '+esc(f.name),`<div class="field"><label>Origem</label><input readonly value="${esc(a.origem)} · ${esc(nomeVersao(inf.versao))}"></div>
    <div class="field"><label>Unidade</label><select id="ciU">${Object.entries(UNID).filter(([n])=>[1,2,4,5,6,14].includes(+n)).map(([n,[nm]])=>`<option value="${n}"${+n===uSel?' selected':''}>${nm}${+n===inf.insunits?' (do arquivo)':''}</option>`).join('')}</select></div>
    ${inf.insunits?'':'<p class="small" style="margin:2px 0 6px">O arquivo não informa a unidade; confira antes de importar (o GPlanSiS|Drawings trabalha em milímetros).</p>'}
    <div class="field"><label>Destino</label><select id="ciM"><option value="novo">Abrir como desenho novo</option>${podeInserir&&temAtual?'<option value="inserir">Inserir no desenho atual</option>':''}</select></div>
    <div class="ph">Conteúdo · ${inf.camadas} camadas · ${inf.blocos} blocos</div>${resumo(inf)}`,
    [{label:'Cancelar',fn:()=>{}},{label:'Importar',primary:true,fn:()=>{
      const u=+$('#ciU').value,m=$('#ciM').value;const rr=u===r.info.unidade?r:lerDXF(a.texto,{unidade:u});rr.doc.name=nomeBase(f);
      setTimeout(()=>{if(m==='inserir'){mescla(rr.doc);toast(`${rr.doc.ents.length} objeto(s) inseridos de ${f.name}`)}else aoAbrir(rr.doc,nomeBase(f));
        log(`${a.origem} importado: ${f.name} — ${rr.doc.ents.length} objeto(s), ${rr.info.camadas} camada(s), ${rr.info.blocos} bloco(s)${rr.info.ignorados?`, ${rr.info.ignorados} não suportado(s)`:''}`)},40)}}]);
  $('#mdlB').onclick=null}

/* ---------------- importação em lote para a biblioteca ---------------- */
async function paraDoc(f){const a=await lerArquivo(f);if(a.json){const d=Object.assign(newDoc(),a.json);return{doc:d,info:null}}
  const r=lerDXF(a.texto,{unidade:undefined});r.doc.name=nomeBase(f);r.origem=a.origem;return r}

window.cadImport={lerDXF,lerArquivo,dialogo,paraDoc,mescla,decodifica,EXT:['.dwg','.dxf','.json','.gpd']};
dxfIn=t=>lerDXF(t).doc;  // o leitor antigo do CAD passa a usar este
}

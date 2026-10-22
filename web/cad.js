'use strict';
/* ============ utilidades e geometria ============ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const TAU=Math.PI*2, D2R=Math.PI/180, R2D=180/Math.PI, EPS=1e-9;
const P=(x,y)=>({x,y});
const add=(a,b)=>P(a.x+b.x,a.y+b.y), sub=(a,b)=>P(a.x-b.x,a.y-b.y), mul=(a,k)=>P(a.x*k,a.y*k);
const dot=(a,b)=>a.x*b.x+a.y*b.y, crs=(a,b)=>a.x*b.y-a.y*b.x;
const len=a=>Math.hypot(a.x,a.y), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const nrm=a=>{const l=Math.hypot(a.x,a.y)||1;return P(a.x/l,a.y/l)};
const perp=a=>P(-a.y,a.x);
const lerp=(a,b,t)=>P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
const mid=(a,b)=>lerp(a,b,.5);
const ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const pol=(c,r,t)=>P(c.x+r*Math.cos(t),c.y+r*Math.sin(t));
const normA=t=>{t%=TAU;return t<0?t+TAU:t};
const angIn=(t,a0,a1)=>normA(t-a0)<=normA(a1-a0)+1e-7;
const clone=o=>JSON.parse(JSON.stringify(o));
const fmt=(v,d=0)=>{if(!isFinite(v))return '—';const s=(Math.round(v*10**d)/10**d).toFixed(d);return s.replace('.',',').replace(/^-0(,0+)?$/,'0$1')};
const fmtN=(v,d=2)=>Number(v.toFixed(d)).toString();
const fmtA=a=>fmt(a/1e6,2)+' m²';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// campos numéricos do documento vão para HTML/SVG sempre como número (um .json ou desenho compartilhado pode trazer texto no lugar)
const num0=v=>{v=+v;return Number.isFinite(v)?v:0};
// cor vinda do documento: só #rgb/#rrggbb(aa); qualquer outra coisa vira a cor padrão
const safeCol=c=>typeof c==='string'&&/^#[0-9a-fA-F]{3,8}$/.test(c)?c:null;
/* afim: x'=a x + c y + e ; y'= b x + d y + f */
const MI={a:1,b:0,c:0,d:1,e:0,f:0};
const Map_=(M,p)=>P(M.a*p.x+M.c*p.y+M.e,M.b*p.x+M.d*p.y+M.f);
const Mlin=(M,p)=>P(M.a*p.x+M.c*p.y,M.b*p.x+M.d*p.y);
const Mmul=(A,B)=>({a:A.a*B.a+A.c*B.b,b:A.b*B.a+A.d*B.b,c:A.a*B.c+A.c*B.d,d:A.b*B.c+A.d*B.d,e:A.a*B.e+A.c*B.f+A.e,f:A.b*B.e+A.d*B.f+A.f});
const Mtr=(dx,dy)=>({a:1,b:0,c:0,d:1,e:dx,f:dy});
const Mrot=(t,c={x:0,y:0})=>{const co=Math.cos(t),s=Math.sin(t);return{a:co,b:s,c:-s,d:co,e:c.x-co*c.x+s*c.y,f:c.y-s*c.x-co*c.y}};
const Msc=(k,c={x:0,y:0},ky=k)=>({a:k,b:0,c:0,d:ky,e:c.x*(1-k),f:c.y*(1-ky)});
const Mmir=(p,q)=>{const t=ang(p,q)*2,co=Math.cos(t),s=Math.sin(t);return Mmul(Mtr(p.x,p.y),Mmul({a:co,b:s,c:s,d:-co,e:0,f:0},Mtr(-p.x,-p.y)))};
const Minv=M=>{const det=M.a*M.d-M.b*M.c;const a=M.d/det,b=-M.b/det,c=-M.c/det,d=M.a/det;return{a,b,c,d,e:-(a*M.e+c*M.f),f:-(b*M.e+d*M.f)}};
function Mins(e){const B=(doc.blocks[e.name]||{base:P(0,0)}).base;return Mmul(Mtr(e.p.x,e.p.y),Mmul(Mrot(e.rot||0),Mmul(Msc(e.sx||1,P(0,0),e.sy||1),Mtr(-B.x,-B.y))))}

/* interseções */
function llInt(a,b,c,d){const r=sub(b,a),s=sub(d,c),den=crs(r,s);if(Math.abs(den)<1e-12)return null;const t=crs(sub(c,a),s)/den,u=crs(sub(c,a),r)/den;return{t,u,p:add(a,mul(r,t))}}
function lcInt(a,b,c,r){const d=sub(b,a),f=sub(a,c),A=dot(d,d),B=2*dot(f,d),C=dot(f,f)-r*r;let disc=B*B-4*A*C;if(disc<0||A<1e-12)return[];disc=Math.sqrt(disc);const o=[];for(const t of disc<1e-9?[-B/(2*A)]:[(-B-disc)/(2*A),(-B+disc)/(2*A)])o.push({t,p:add(a,mul(d,t))});return o}
function ccInt(c1,r1,c2,r2){const d=dist(c1,c2);if(d<1e-9||d>r1+r2+1e-9||d<Math.abs(r1-r2)-1e-9)return[];const a=(r1*r1-r2*r2+d*d)/(2*d),h=Math.sqrt(Math.max(0,r1*r1-a*a)),m=add(c1,mul(sub(c2,c1),a/d)),pv=perp(nrm(sub(c2,c1)));return h<1e-9?[m]:[add(m,mul(pv,h)),sub(m,mul(pv,h))]}
const onPrim=(q,p)=>q.t==='s'?true:q.t==='c'?true:angIn(Math.atan2(p.y-q.c.y,p.x-q.c.x),q.a0,q.a1);
function primInt(A,B){ // pontos de interseção limitados
  const o=[];
  if(A.t==='s'&&B.t==='s'){const r=llInt(A.a,A.b,B.a,B.b);if(r&&r.t>=-1e-9&&r.t<=1+1e-9&&r.u>=-1e-9&&r.u<=1+1e-9)o.push(r.p);return o}
  if(A.t==='s'||B.t==='s'){const S=A.t==='s'?A:B,C=A.t==='s'?B:A;for(const h of lcInt(S.a,S.b,C.c,C.r))if(h.t>=-1e-9&&h.t<=1+1e-9&&onPrim(C,h.p))o.push(h.p);return o}
  for(const p of ccInt(A.c,A.r,B.c,B.r))if(onPrim(A,p)&&onPrim(B,p))o.push(p);return o}
function closestOnPrim(q,p){
  if(q.t==='s'){const d=sub(q.b,q.a),L=dot(d,d);let t=L<1e-12?0:dot(sub(p,q.a),d)/L;t=Math.max(0,Math.min(1,t));return add(q.a,mul(d,t))}
  const t=Math.atan2(p.y-q.c.y,p.x-q.c.x);if(q.t==='c'||angIn(t,q.a0,q.a1))return pol(q.c,q.r,t);
  const e0=pol(q.c,q.r,q.a0),e1=pol(q.c,q.r,q.a1);return dist(p,e0)<dist(p,e1)?e0:e1}
function bboxPts(pts){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of pts){if(p.x<x0)x0=p.x;if(p.y<y0)y0=p.y;if(p.x>x1)x1=p.x;if(p.y>y1)y1=p.y}return{x0,y0,x1,y1}}
function polyArea(pts){let s=0;for(let i=0,n=pts.length;i<n;i++){const a=pts[i],b=pts[(i+1)%n];s+=a.x*b.y-b.x*a.y}return s/2}
function polyPerim(pts,closed=true){let s=0;for(let i=0;i<pts.length-(closed?0:1);i++)s+=dist(pts[i],pts[(i+1)%pts.length]);return s}
function polyCentroid(pts){let A=0,cx=0,cy=0;for(let i=0,n=pts.length;i<n;i++){const a=pts[i],b=pts[(i+1)%n],k=a.x*b.y-b.x*a.y;A+=k;cx+=(a.x+b.x)*k;cy+=(a.y+b.y)*k}if(Math.abs(A)<1e-9)return pts[0];return P(cx/(3*A),cy/(3*A))}
function inPoly(p,pts){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)c=!c}return c}
function circ3(a,b,c){const d=2*(a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y));if(Math.abs(d)<1e-9)return null;const a2=a.x*a.x+a.y*a.y,b2=b.x*b.x+b.y*b.y,c2=c.x*c.x+c.y*c.y;const ce=P((a2*(b.y-c.y)+b2*(c.y-a.y)+c2*(a.y-b.y))/d,(a2*(c.x-b.x)+b2*(a.x-c.x)+c2*(b.x-a.x))/d);return{c:ce,r:dist(ce,a)}}
function splinePts(pts,closed=false,seg=12){ // Catmull-Rom uniforme pelos pontos
  if(pts.length<3)return pts.slice();const o=[],n=pts.length,g=i=>closed?pts[(i+n)%n]:pts[Math.max(0,Math.min(n-1,i))];
  const last=closed?n:n-1;
  for(let i=0;i<last;i++){const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2);
    for(let k=0;k<seg;k++){const t=k/seg,t2=t*t,t3=t2*t;const f=(a,b,c,d)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
      o.push(P(f(p0.x,p1.x,p2.x,p3.x),f(p0.y,p1.y,p2.y,p3.y)))}}
  o.push(closed?pts[0]:pts[n-1]);return o}
function ellPts(e,n=72){const o=[],co=Math.cos(e.rot||0),s=Math.sin(e.rot||0);for(let i=0;i<=n;i++){const t=i/n*TAU,x=e.rx*Math.cos(t),y=e.ry*Math.sin(t);o.push(P(e.c.x+x*co-y*s,e.c.y+x*s+y*co))}return o}
function arcPts(c,r,a0,a1,stepDeg=6){let sw=normA(a1-a0);if(sw<1e-9)sw=TAU;const n=Math.max(2,Math.ceil(sw*R2D/stepDeg)),o=[];for(let i=0;i<=n;i++)o.push(pol(c,r,a0+sw*i/n));return o}

/* ============ documento ============ */
const ACI={1:'#ff2b2b',2:'#ffe600',3:'#29d34f',4:'#18d6e6',5:'#2f6dff',6:'#ff3df2',7:'fg',8:'#8a8f93',9:'#c3c6c8',30:'#ff8a1e',40:'#ffbe1e',140:'#6fb6ff',150:'#3d8bff',220:'#ff5ca8',250:'#555a5e'};
const ACI_L={2:'#b99a00',3:'#169a37',4:'#0e98a6',9:'#8f9599',40:'#c98a00'};
const LTYPES={CONTINUOUS:null,DASHED:[6,-3],HIDDEN:[3,-1.5],CENTER:[12,-2,2,-2],PHANTOM:[12,-2,2,-2,2,-2],DOT:[0.4,-2],DASHDOT:[6,-2,0.4,-2]};
const LWS=[0,0.09,0.13,0.18,0.25,0.35,0.5,0.7,1.0];
const PATTERNS={
  SOLID:{n:'Sólido'},
  ANSI31:{n:'ANSI31 (aço/alvenaria)',f:[{a:45,s:3.175}]},
  ANSI37:{n:'ANSI37 (cruzado)',f:[{a:45,s:3.175},{a:135,s:3.175}]},
  ANSI32:{n:'ANSI32 (aço)',f:[{a:45,s:9.525},{a:45,s:9.525,o:3.175}]},
  'AR-CONC':{n:'AR-CONC (concreto)',dots:true},
  GRID:{n:'GRID (piso)',f:[{a:0,s:10},{a:90,s:10}]},
  BRICK:{n:'BRICK (tijolo)',f:[{a:0,s:6.35}],brick:true},
  INSUL:{n:'INSUL (isolamento)',f:[{a:60,s:2},{a:120,s:2}]},
  LINE:{n:'LINE (linhas)',f:[{a:0,s:3.175}]}
};
const STD_LAYERS=[
  ['0',7,'CONTINUOUS',0.25],['S-GRID',1,'CENTER',0.13],['S-COLS',8,'CONTINUOUS',0.5],['A-WALL',7,'CONTINUOUS',0.5],
  ['A-INSL',9,'CONTINUOUS',0.18],['A-DOOR',40,'CONTINUOUS',0.25],['A-GLAZ',4,'CONTINUOUS',0.25],['A-HATCH',8,'CONTINUOUS',0.09],
  ['A-FURN',140,'CONTINUOUS',0.18],['A-DIMS',3,'CONTINUOUS',0.18],['A-ANNO',7,'CONTINUOUS',0.25],['A-AREA',30,'CONTINUOUS',0.18],['A-SHEET',8,'CONTINUOUS',0.35]];
let doc, undoS=[], redoS=[];
const ST={grid:true,snap:false,ortho:false,polar:true,osnap:true,otrack:true,dyn:true,lwt:true,
  snapX:100,gridX:1000,polarInc:45,
  os:{end:true,mid:true,cen:true,qua:true,int:true,per:true,nea:false,nod:true,ins:true,tan:false}};
function newDoc(name='Sem título'){
  const d={name,ver:1,ents:[],layers:STD_LAYERS.map(([n,c,lt,lw])=>({name:n,color:c,lt,lw,on:true,frozen:false,locked:false})),
    clayer:'0',blocks:{},nextId:1,ltscale:20,thickness:0,textH:250,
    dim:{scale:50,txt:2.5,asz:2,exo:1.5,exe:1.5,gap:1,dec:0,arrow:'tick',dli:7},
    hatch:{pat:'ANSI31',sc:20,ang:0},cons:[],vps:[],pn:0,wall:{t:300,ins:0,h:2800},filletR:0,chamA:100,chamB:100,offD:100,lastDim:null};
  d.blocks=builtinBlocks();return d}
const layerOf=n=>doc.layers.find(l=>l.name===n)||doc.layers[0];
function entById(id){return doc.ents.find(e=>e.id===id)}
function addEnt(e,opts={}){e.id=doc.nextId++;if(!e.layer)e.layer=doc.clayer;if(e.color==null)e.color='BL';if(!e.lt)e.lt='BL';if(e.lw==null)e.lw=-1;
  if(e.th==null&&doc.thickness&&['line','pline','circle','arc','ellipse','spline'].includes(e.type))e.th=doc.thickness;
  doc.ents.push(e);dirty();return e}
function delEnt(e){const i=doc.ents.indexOf(e);if(i>=0)doc.ents.splice(i,1);SEL.delete(e.id);dirty()}
let _dirty=0;function dirty(){_dirty++;_openCache=null;_regionCache=null;requestDraw()}
const editable=e=>{const L=layerOf(e.layer);return L.on&&!L.frozen&&!L.locked};
const visible=e=>{const L=layerOf(e.layer);return L.on&&!L.frozen};

/* ============ blocos padrão (mm) ============ */
function R_(x0,y0,x1,y1,extra={}){return Object.assign({type:'pline',pts:[P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)],closed:true,layer:'0',color:'BB',lt:'BL',lw:-1},extra)}
function L_(a,b,c,d,extra={}){return Object.assign({type:'line',a:P(a,b),b:P(c,d),layer:'0',color:'BB',lt:'BL',lw:-1},extra)}
function C_(x,y,r,extra={}){return Object.assign({type:'circle',c:P(x,y),r,layer:'0',color:'BB',lt:'BL',lw:-1},extra)}
function A_(x,y,r,a0,a1,extra={}){return Object.assign({type:'arc',c:P(x,y),r,a0:a0*D2R,a1:a1*D2R,layer:'0',color:'BB',lt:'BL',lw:-1},extra)}
function E_(x,y,rx,ry,extra={}){return Object.assign({type:'ellipse',c:P(x,y),rx,ry,rot:0,layer:'0',color:'BB',lt:'BL',lw:-1},extra)}
function builtinBlocks(){
  const B={};const mk=(name,label,kind,ents,o={})=>B[name]=Object.assign({name,label,kind,base:P(0,0),ents,builtin:true},o);
  mk('DOOR','Porta (1000)','door',[L_(-500,0,-500,1000,{lw:0.35,th:2100,c3:'#a87c52'}),A_(-500,0,1000,0,90,{lt:'HIDDEN'}),L_(-500,0,-500,-60),L_(500,0,500,-60)],{w:1000});
  mk('DOOR2','Porta dupla (1600)','door',[L_(-800,0,-800,800,{lw:0.35,th:2100,c3:'#a87c52'}),L_(800,0,800,800,{lw:0.35,th:2100,c3:'#a87c52'}),A_(-800,0,800,0,90,{lt:'HIDDEN'}),A_(800,0,800,90,180,{lt:'HIDDEN'})],{w:1600});
  mk('WINDOW','Janela (1000)','window',[L_(-500,-150,-500,150),L_(500,-150,500,150),L_(-500,-25,500,-25),L_(-500,25,500,25),L_(-500,0,500,0,{lw:0.09})],{w:1000});
  mk('BED-D','Cama casal 1600×2000','furn',[R_(-800,-1000,800,1000,{th:500,c3:'#e4ddd2'}),R_(-720,620,-60,920,{}),R_(60,620,720,920,{}),L_(-800,450,800,450)],{h:500});
  mk('BED-S','Cama solteiro 900×1900','furn',[R_(-450,-950,450,950,{th:500,c3:'#e4ddd2'}),R_(-370,560,370,860),L_(-450,400,450,400)],{h:500});
  mk('SOFA','Sofá 3 lugares 2200','furn',[R_(-1100,-450,1100,450,{th:420,c3:'#7e8b97'}),R_(-1100,-450,1100,-200,{th:800,c3:'#6f7c88'}),R_(-1100,-200,-900,450,{th:620,c3:'#6f7c88'}),R_(900,-200,1100,450,{th:620,c3:'#6f7c88'}),L_(-300,-200,-300,450),L_(300,-200,300,450)],{h:800});
  const ch=(x,y,r)=>[R_(x-220,y-220,x+220,y+220,{th:450,c3:'#8e6a48'})].map(e=>e);
  mk('TABLE4','Mesa 4 lugares','furn',[R_(-600,-400,600,400,{th:750,c3:'#b48a60'}),...ch(-300,-620),...ch(300,-620),...ch(-300,620),...ch(300,620)],{h:750});
  mk('TABLER','Mesa redonda Ø1000','furn',[C_(0,0,500,{th:750,c3:'#b48a60'}),...[0,90,180,270].flatMap(a=>{const p=pol(P(0,0),720,a*D2R);return[C_(p.x,p.y,220,{th:450,c3:'#8e6a48'})]})],{h:750});
  mk('WC','Bacia sanitária','furn',[R_(-190,150,190,350,{th:780,c3:'#f4f4f2'}),E_(0,-80,180,240,{th:400,c3:'#f4f4f2'}),L_(-190,150,190,150)],{h:400});
  mk('SINK','Lavatório','furn',[R_(-250,-200,250,200,{th:850,c3:'#f4f4f2'}),E_(0,-20,170,120),C_(0,140,20)],{h:850});
  mk('SHOWER','Box chuveiro 900','furn',[R_(-450,-450,450,450,{th:40,c3:'#dfe6ea'}),L_(-450,-450,450,450,{lw:0.09}),L_(-450,450,450,-450,{lw:0.09}),C_(0,0,40)],{h:40});
  mk('KITCHEN','Bancada cozinha 3000','furn',[R_(-1500,-300,1500,300,{th:900,c3:'#d6d0c6'}),R_(-700,-220,-100,220),C_(-400,0,30),C_(500,-120,90),C_(800,-120,90),C_(500,120,70),C_(800,120,70)],{h:900});
  mk('FRIDGE','Geladeira 700','furn',[R_(-350,-350,350,350,{th:1800,c3:'#e8eaec'}),L_(-350,-250,350,-250),L_(250,-250,250,-330)],{h:1800});
  mk('WARDROBE','Guarda-roupa 1800','furn',[R_(-900,-300,900,300,{th:2200,c3:'#c9a57e'}),L_(0,-300,0,300),L_(-900,0,900,0,{lt:'HIDDEN'})],{h:2200});
  mk('DESK','Escrivaninha 1200','furn',[R_(-600,-300,600,300,{th:750,c3:'#c9a57e'}),R_(-220,-560,220,-140,{th:450,c3:'#5d6872'})],{h:750});
  mk('WASHER','Lava e seca 600','furn',[R_(-300,-300,300,300,{th:850,c3:'#eef0f2'}),C_(0,-20,200),C_(0,-20,140)],{h:850});
  mk('TANK','Tanque','furn',[R_(-300,-250,300,250,{th:850,c3:'#eef0f2'}),R_(-240,-190,240,190),C_(0,0,25)],{h:850});
  mk('TV','Rack com TV','furn',[R_(-900,-200,900,200,{th:500,c3:'#b48a60'}),R_(-700,-40,700,40,{th:1200,el:500,c3:'#2c3135'})],{h:500});
  mk('NORTH','Norte','anno',[C_(0,0,500),{type:'pline',pts:[P(0,480),P(220,-300),P(0,-120),P(-220,-300)],closed:true,layer:'0',color:'BB',lt:'BL',lw:-1},{type:'text',p:P(0,620),h:250,s:'N',rot:0,al:'c',vb:'b',layer:'0',color:'BB',lt:'BL',lw:-1}],{});
  return B}
/* ============ semântica de entidades ============ */
const S=(a,b)=>({t:'s',a,b});
const _pc=new WeakMap();
function primsC(e){const c=_pc.get(e);if(c&&c.v===_dirty)return c.p;const p=prims(e);_pc.set(e,{v:_dirty,p});return p}
function plSegs(pts,closed){const o=[];for(let i=0;i<pts.length-1;i++)o.push(S(pts[i],pts[i+1]));if(closed&&pts.length>2)o.push(S(pts[pts.length-1],pts[0]));return o}
function childEnts(e){ // entidades do bloco transformadas para o mundo (cache)
  const c=_pc.get(e);if(c&&c.v===_dirty&&c.ch)return c.ch;
  const B=doc.blocks[e.name];if(!B)return[];const M=Mins(e);
  const ch=B.ents.map(x=>{const y=clone(x);xformEnt(y,M);if(y.type==='attdef'){y.type='text';y.s=String((e.attrs&&e.attrs[x.tag]!=null)?e.attrs[x.tag]:x.def);}if(y.color==='BB')y.color=e.color==='BL'?'L:'+e.layer:e.color;if(y.layer==='0')y.layer=e.layer;return y});
  const rec=_pc.get(e)||{};_pc.set(e,{v:_dirty,p:rec.v===_dirty?rec.p:undefined,ch});return ch}
function prims(e){
  switch(e.type){
    case 'line':return[S(e.a,e.b)];
    case 'pline':return plSegs(e.pts,e.closed);
    case 'circle':return[{t:'c',c:e.c,r:e.r}];
    case 'arc':return[{t:'a',c:e.c,r:e.r,a0:e.a0,a1:e.a1}];
    case 'ellipse':return plSegs(ellPts(e,48),false);
    case 'spline':return plSegs(splinePts(e.pts,e.closed,8),false);
    case 'xline':{const d=nrm(e.d);return[S(e.ray?e.p:sub(e.p,mul(d,1e6)),add(e.p,mul(d,1e6)))]}
    case 'leader':return plSegs(e.pts,false);
    case 'wall':{const f=wallFaces(e);return f}
    case 'insert':return childEnts(e).flatMap(c=>c.type==='text'?[]:primsC(c));
    default:return[]}}
function snapPts(e){
  const o=[],A=(p,k)=>o.push({p,k});
  switch(e.type){
    case 'line':A(e.a,'end');A(e.b,'end');A(mid(e.a,e.b),'mid');break;
    case 'pline':e.pts.forEach(p=>A(p,'end'));plSegs(e.pts,e.closed).forEach(s=>A(mid(s.a,s.b),'mid'));if(e.closed&&e.pts.length>2)A(polyCentroid(e.pts),'cen');break;
    case 'circle':A(e.c,'cen');for(let i=0;i<4;i++)A(pol(e.c,e.r,i*Math.PI/2),'qua');break;
    case 'arc':A(pol(e.c,e.r,e.a0),'end');A(pol(e.c,e.r,e.a1),'end');A(pol(e.c,e.r,e.a0+normA(e.a1-e.a0)/2),'mid');A(e.c,'cen');
      for(let i=0;i<4;i++){const t=i*Math.PI/2;if(angIn(t,e.a0,e.a1))A(pol(e.c,e.r,t),'qua')}break;
    case 'ellipse':{A(e.c,'cen');const co=Math.cos(e.rot||0),s=Math.sin(e.rot||0);[[e.rx,0],[-e.rx,0],[0,e.ry],[0,-e.ry]].forEach(([x,y])=>A(P(e.c.x+x*co-y*s,e.c.y+x*s+y*co),'qua'));break}
    case 'spline':e.pts.forEach((p,i)=>A(p,i===0||i===e.pts.length-1?'end':'nod'));break;
    case 'point':A(e.p,'nod');break;
    case 'text':case 'attdef':case 'fcf':case 'image':A(e.p,'ins');break;
    case 'datum':A(e.p,'nod');A(e.q,'ins');break;
    case 'xline':A(e.p,'nod');break;
    case 'leader':A(e.pts[0],'end');A(e.pts[e.pts.length-1],'end');break;
    case 'insert':A(e.p,'ins');childEnts(e).forEach(c=>{if(c.type!=='text')snapPts(c).forEach(s=>{if(s.k!=='nod')o.push(s)})});break;
    case 'wall':A(e.a,'end');A(e.b,'end');A(mid(e.a,e.b),'mid');wallFaces(e).forEach(s=>{A(s.a,'end');A(s.b,'end')});break;
    case 'dim':['p1','p2','pos','c'].forEach(k=>e[k]&&A(e[k],'nod'));break;
    case 'hatch':break}
  return o}

/* paredes: vãos de portas/janelas e junções */
let _openCache=null;
function buildOpenCache(){
  _openCache={op:new Map(),ext:new Map()};
  const walls=doc.ents.filter(e=>e.type==='wall'),ins=doc.ents.filter(e=>e.type==='insert'&&doc.blocks[e.name]&&/door|window/.test(doc.blocks[e.name].kind)&&visible(e));
  for(const w of walls){const L=dist(w.a,w.b);if(L<1)continue;const u=nrm(sub(w.b,w.a)),n=perp(u),arr=[];
    for(const i of ins){const B=doc.blocks[i.name],t=dot(sub(i.p,w.a),u),d=Math.abs(dot(sub(i.p,w.a),n)),wd=(B.w||1000)*Math.abs(i.sx||1);
      const bx=P(Math.cos(i.rot||0),Math.sin(i.rot||0));if(Math.abs(dot(bx,u))<0.9)continue;
      if(d<=w.t/2+5&&t>-1&&t<L+1)arr.push({s:Math.max(0,t-wd/2),e:Math.min(L,t+wd/2),kind:B.kind,id:i.id})}
    arr.sort((a,b)=>a.s-b.s);_openCache.op.set(w.id,arr);
    let ea=0,eb=0,ia=0,ib=0;
    for(const o of walls){if(o===w)continue;const u2=nrm(sub(o.b,o.a));if(Math.abs(crs(u,u2))<0.05)continue;
      for(const q of[o.a,o.b]){if(dist(w.a,q)<2){ea=Math.max(ea,o.t/2);ia=Math.max(ia,o.t/2+(o.ins||0))}if(dist(w.b,q)<2){eb=Math.max(eb,o.t/2);ib=Math.max(ib,o.t/2+(o.ins||0))}}}
    _openCache.ext.set(w.id,{ea,eb,ia,ib})}}
const wallOpen=w=>{if(!_openCache)buildOpenCache();return _openCache.op.get(w.id)||[]};
const wallExt=w=>{if(!_openCache)buildOpenCache();return _openCache.ext.get(w.id)||{ea:0,eb:0,ia:0,ib:0}};
function wallFrame(w){const L=dist(w.a,w.b),u=nrm(sub(w.b,w.a)),n=perp(u);return{L,u,n,at:(t,k)=>add(add(w.a,mul(u,t)),mul(n,k))}}
function wallFaces(w){const{L,at}=wallFrame(w),X=wallExt(w),h=w.t/2;const s0=-X.ea,s1=L+X.eb;
  return[S(at(s0,-h),at(s1,-h)),S(at(s0,h),at(s1,h)),S(at(s0,-h),at(s0,h)),S(at(s1,-h),at(s1,h))]}
function solidRanges(L,ops,x0,x1){const o=[];let s=x0;for(const op of ops){if(op.s>s+0.5)o.push([s,op.s]);s=Math.max(s,op.e)}if(x1>s+0.5)o.push([s,x1]);return o}
function wallPolys(w){const{L,at}=wallFrame(w),X=wallExt(w),h=w.t/2,I=w.ins||0,ops=wallOpen(w);
  const core=solidRanges(L,ops,-X.ea,L+X.eb).map(([a,b])=>[at(a,-h),at(b,-h),at(b,h),at(a,h)]);
  const ins=I>0?solidRanges(L,ops,-X.ia,L+X.ib).map(([a,b])=>[at(a,h),at(b,h),at(b,h+I),at(a,h+I)]):[];
  return{core,ins,ops}}

/* texto */
const _mc=document.createElement('canvas').getContext('2d');
function textW(s,h){_mc.font='100px '+getComputedStyle(document.body).getPropertyValue('--font');return _mc.measureText(s).width/100*h}
function textLayout(e){const lines=String(e.s).split('\n'),n=lines.length,H=e.h*(1+(n-1)*1.5),w=Math.max(...lines.map(l=>textW(l,e.h)));
  const fb=e.vb==='m'?H/2-e.h:e.vb==='t'?-e.h:(n-1)*1.5*e.h;return{lines,fb,w,H}}
function textBox(e){const{fb,w,H}=textLayout(e);const x0=e.al==='c'?-w/2:e.al==='r'?-w:0,top=fb+e.h;
  const M=Mmul(Mtr(e.p.x,e.p.y),Mrot(e.rot||0));return[P(x0,top-H),P(x0+w,top-H),P(x0+w,top),P(x0,top)].map(p=>Map_(M,p))}

/* cotas */
function dimGeom(e){
  const D=doc.dim,k=e.dsc||D.scale,txtH=D.txt*k,asz=D.asz*k,exo=D.exo*k,exe=D.exe*k,gap=D.gap*k;
  const G={L:[],K:[],A:[],AR:[],T:[]};
  const val=(v,pre='')=>{let s=pre+fmt(v,D.dec);if(e.txt)s=e.txt.replace('<>',s);if(e.tolp||e.tolm){s+=e.tolp===e.tolm&&e.tolp?' ±'+e.tolp:` +${e.tolp||0}/−${e.tolm||0}`}return s};
  const rd=t=>{t=normA(t);return t>Math.PI/2+1e-6&&t<=3*Math.PI/2+1e-6?t-Math.PI:t};
  const tick=(p,du)=>{const w=P((du.x-du.y)*Math.SQRT1_2,(du.x+du.y)*Math.SQRT1_2);G.K.push([sub(p,mul(w,asz/2)),add(p,mul(w,asz/2))])};
  const term=(p,dir)=>{if(D.arrow==='tick')tick(p,nrm(dir));else if(D.arrow==='dot')G.A.push({p,dir,dot:true,s:asz});else G.A.push({p,dir,s:asz})};
  const txt=(m,th,s)=>{const tr=rd(th),up=perp(P(Math.cos(tr),Math.sin(tr)));G.T.push({p:add(m,mul(up,gap)),rot:tr,s,h:txtH,al:'c',vb:'b'})};
  if(e.kind==='lin'||e.kind==='ali'){
    const th=e.kind==='ali'?ang(e.p1,e.p2):(e.rot||0),u=P(Math.cos(th),Math.sin(th)),n=perp(u);
    const d1=add(e.p1,mul(n,dot(sub(e.pos,e.p1),n))),d2=add(e.p2,mul(n,dot(sub(e.pos,e.p2),n)));
    for(const[p,d]of[[e.p1,d1],[e.p2,d2]]){const v=sub(d,p),l=len(v);if(l>exo){const vn=mul(v,1/l);G.L.push([add(p,mul(vn,exo)),add(d,mul(vn,exe))])}}
    const meas=Math.abs(dot(sub(e.p2,e.p1),u)),du=dist(d1,d2)>1e-6?nrm(sub(d2,d1)):u;
    if(D.arrow==='tick'){G.L.push([sub(d1,mul(du,exe)),add(d2,mul(du,exe))]);tick(d1,du);tick(d2,du)}
    else{G.L.push([d1,d2]);term(d1,mul(du,-1));term(d2,du)}
    txt(mid(d1,d2),th,val(meas));G.meas=meas}
  else if(e.kind==='rad'||e.kind==='dia'){
    const p1=pol(e.c,e.r,e.a),p0=e.kind==='dia'?pol(e.c,e.r,e.a+Math.PI):e.c;
    G.L.push([p0,p1]);const du=nrm(sub(p1,p0));
    const A2=dd=>G.A.push({p:dd.p,dir:dd.dir,s:asz,dot:D.arrow==='dot'});A2({p:p1,dir:du});if(e.kind==='dia')A2({p:p0,dir:mul(du,-1)});
    txt(mid(e.kind==='dia'?p0:e.c,p1),e.a,val(e.kind==='dia'?2*e.r:e.r,e.kind==='dia'?'Ø':'R'));G.meas=e.kind==='dia'?2*e.r:e.r}
  else if(e.kind==='ang'){
    const R=dist(e.v,e.pos);let a1=ang(e.v,e.p1),a2=ang(e.v,e.p2);const ap=ang(e.v,e.pos);
    if(!angIn(ap,a1,a2)){const t=a1;a1=a2;a2=t}
    G.AR.push({c:e.v,r:R,a0:a1,a1:a2});
    for(const[p,a]of[[e.p1,ang(e.v,e.p1)],[e.p2,ang(e.v,e.p2)]]){const dp=dist(e.v,p);if(dp<R-exo)G.L.push([pol(e.v,dp+exo,a),pol(e.v,R+exe,a)])}
    const s1=pol(e.v,R,a1),s2=pol(e.v,R,a2);
    G.A.push({p:s1,dir:perp(nrm(sub(s1,e.v))),s:asz,flip:true},{p:s2,dir:perp(nrm(sub(s2,e.v))),s:asz});
    G.A[G.A.length-2].dir=mul(G.A[G.A.length-2].dir,-1);
    const am=a1+normA(a2-a1)/2,deg=normA(a2-a1)*R2D;
    const tp=pol(e.v,R+gap,am);G.T.push({p:tp,rot:rd(am-Math.PI/2),s:(e.txt?e.txt.replace('<>',fmt(deg,1)):fmt(deg,1))+'°',h:txtH,al:'c',vb:'b'});G.meas=deg}
  return G}
function leaderGeom(e){const D=doc.dim,k=D.scale,G={L:[],A:[],T:[]};const p=e.pts;for(let i=0;i<p.length-1;i++)G.L.push([p[i],p[i+1]]);
  if(p.length>1)G.A.push({p:p[0],dir:nrm(sub(p[0],p[1])),s:D.asz*k});
  const last=p[p.length-1],prev=p[p.length-2]||last,right=last.x>=prev.x;const h=e.h||D.txt*k;
  G.T.push({p:add(last,P(right?h*.6:-h*.6,-h/2)),rot:0,s:e.s||'',h,al:right?'l':'r',vb:'b'});return G}

/* bbox, distância e transformação */
function bboxEnt(e){
  if(EXT[e.type])return EXT[e.type].bbox(e);
  switch(e.type){
    case 'circle':return{x0:e.c.x-e.r,y0:e.c.y-e.r,x1:e.c.x+e.r,y1:e.c.y+e.r};
    case 'arc':return bboxPts(arcPts(e.c,e.r,e.a0,e.a1,10));
    case 'text':return bboxPts(textBox(e));
    case 'point':return{x0:e.p.x,y0:e.p.y,x1:e.p.x,y1:e.p.y};
    case 'xline':return{x0:e.p.x,y0:e.p.y,x1:e.p.x,y1:e.p.y};
    case 'hatch':return bboxPts(e.loops.flat());
    case 'dim':case 'leader':{const G=e.type==='dim'?dimGeom(e):leaderGeom(e);const pts=G.L.flat().concat(G.T.flatMap(t=>bboxPts([t.p]).x0!=null?[t.p]:[]));(G.AR||[]).forEach(a=>pts.push(...arcPts(a.c,a.r,a.a0,a.a1,15)));return bboxPts(pts)}
    case 'insert':{const ch=childEnts(e);if(!ch.length)return{x0:e.p.x,y0:e.p.y,x1:e.p.x,y1:e.p.y};const bs=ch.map(bboxEnt);return{x0:Math.min(...bs.map(b=>b.x0)),y0:Math.min(...bs.map(b=>b.y0)),x1:Math.max(...bs.map(b=>b.x1)),y1:Math.max(...bs.map(b=>b.y1))}}
    default:{const pts=[];for(const q of primsC(e)){if(q.t==='s')pts.push(q.a,q.b);else pts.push(...(q.t==='c'?arcPts(q.c,q.r,0,TAU,30):arcPts(q.c,q.r,q.a0,q.a1,15)))}
      if(e.type==='wall'&&e.ins)wallPolys(e).ins.forEach(p=>pts.push(...p));return pts.length?bboxPts(pts):{x0:0,y0:0,x1:0,y1:0}}}}
function entDist(e,p){
  if(EXT[e.type])return EXT[e.type].dist(e,p);
  if(e.type==='text'){const b=textBox(e);return inPoly(p,b)?0:Math.min(...plSegs(b,true).map(s=>dist(p,closestOnPrim(s,p))))}
  if(e.type==='point')return dist(p,e.p);
  if(e.type==='hatch'){let ins=false;for(const l of e.loops)if(inPoly(p,l))ins=!ins;let d=Infinity;for(const l of e.loops)for(const s of plSegs(l,true))d=Math.min(d,dist(p,closestOnPrim(s,p)));return ins?Math.min(d,TOLW*0.7):d}
  if(e.type==='dim'||e.type==='leader'){const G=e.type==='dim'?dimGeom(e):leaderGeom(e);let d=Infinity;for(const[a,b]of G.L)d=Math.min(d,dist(p,closestOnPrim(S(a,b),p)));
    for(const a of G.AR||[])d=Math.min(d,dist(p,closestOnPrim({t:'a',...a},p)));for(const t of G.T){const b=textBox({...t,type:'text'});if(inPoly(p,b))d=0}return d}
  if(e.type==='wall'){const{L,at}=wallFrame(e),h=e.t/2+(e.ins||0)*0;if(inPoly(p,[at(0,-h),at(L,-h),at(L,h),at(0,h)]))return 0}
  if(e.type==='insert'){let d=Infinity;for(const c of childEnts(e))d=Math.min(d,entDist(c,p));return d}
  let d=Infinity;for(const q of primsC(e))d=Math.min(d,dist(p,closestOnPrim(q,p)));return d}
function xformEnt(e,M){
  const T=p=>Map_(M,p),det=M.a*M.d-M.b*M.c,k=Math.sqrt(Math.abs(det)),r0=Math.atan2(M.b,M.a),flip=det<0;
  const rotA=t=>{const v=Mlin(M,P(Math.cos(t),Math.sin(t)));return Math.atan2(v.y,v.x)};
  if(EXT[e.type]&&EXT[e.type].xf){EXT[e.type].xf(e,M);return e}
  switch(e.type){
    case 'datum':e.p=T(e.p);e.q=T(e.q);e.h*=k;break;
    case 'line':e.a=T(e.a);e.b=T(e.b);break;
    case 'wall':e.a=T(e.a);e.b=T(e.b);e.t*=k;if(e.ins)e.ins*=k;if(flip){const t=e.a;e.a=e.b;e.b=t}break;
    case 'pline':case 'spline':case 'leader':e.pts=e.pts.map(T);break;
    case 'hatch':e.loops=e.loops.map(l=>l.map(T));e.ang=(e.ang||0)+r0*R2D;break;
    case 'circle':e.c=T(e.c);e.r*=k;break;
    case 'arc':{const p0=T(pol(e.c,e.r,e.a0)),p1=T(pol(e.c,e.r,e.a1));e.c=T(e.c);e.r*=k;e.a0=ang(e.c,p0);e.a1=ang(e.c,p1);if(flip){const t=e.a0;e.a0=e.a1;e.a1=t}break}
    case 'ellipse':{const ax=T(pol(e.c,e.rx,e.rot||0));e.c=T(e.c);e.rx=dist(e.c,ax);e.rot=ang(e.c,ax);e.ry*=k;break}
    case 'point':e.p=T(e.p);break;
    case 'text':case 'attdef':case 'fcf':{e.p=T(e.p);e.h*=k;let r=rotA(e.rot||0);if(flip){r=normA(r);if(r>Math.PI/2&&r<3*Math.PI/2)r-=Math.PI}e.rot=r;break}
    case 'xline':e.p=T(e.p);e.d=nrm(Mlin(M,e.d));break;
    case 'insert':e.p=T(e.p);if(flip){e.rot=r0-(e.rot||0);e.sx=(e.sx||1)*k;e.sy=-(e.sy||1)*k}else{e.rot=(e.rot||0)+r0;e.sx=(e.sx||1)*k;e.sy=(e.sy||1)*k}break;
    case 'dim':{['p1','p2','pos','v'].forEach(q=>{if(e[q])e[q]=T(e[q])});if(e.kind==='lin')e.rot=rotA(e.rot||0);
      if(e.kind==='rad'||e.kind==='dia'){const pp=T(pol(e.c,e.r,e.a));e.c=T(e.c);e.r*=k;e.a=ang(e.c,pp)}
      if(e.kind==='ang'&&flip){const t=e.p1;e.p1=e.p2;e.p2=t}if(e.dsc)e.dsc*=1;break}}
  return e}
function gripsOf(e){
  switch(e.type){
    case 'line':return[e.a,e.b,mid(e.a,e.b)];case 'wall':return[e.a,e.b,mid(e.a,e.b)];
    case 'pline':case 'spline':case 'leader':return e.pts.slice();
    case 'circle':return[e.c,...[0,1,2,3].map(i=>pol(e.c,e.r,i*Math.PI/2))];
    case 'arc':return[e.c,pol(e.c,e.r,e.a0),pol(e.c,e.r,e.a1),pol(e.c,e.r,e.a0+normA(e.a1-e.a0)/2)];
    case 'ellipse':return[e.c,pol(e.c,e.rx,e.rot||0),pol(e.c,e.ry,(e.rot||0)+Math.PI/2)];
    case 'text':case 'point':case 'insert':case 'attdef':case 'fcf':case 'image':return[e.p];case 'xline':return[e.p];case 'datum':return[e.p,e.q];
    case 'dim':return e.kind==='rad'||e.kind==='dia'?[e.c,pol(e.c,e.r,e.a)]:e.kind==='ang'?[e.v,e.p1,e.p2,e.pos]:[e.p1,e.p2,e.pos];
    case 'hatch':return[];default:return[]}}
function setGrip(e,i,q){
  switch(e.type){
    case 'line':case 'wall':if(i===0)e.a=q;else if(i===1)e.b=q;else{const d=sub(q,mid(e.a,e.b));e.a=add(e.a,d);e.b=add(e.b,d)}break;
    case 'pline':case 'spline':case 'leader':e.pts[i]=q;break;
    case 'circle':if(i===0)e.c=q;else e.r=dist(e.c,q);break;
    case 'arc':if(i===0)e.c=q;else if(i===1)e.a0=ang(e.c,q);else if(i===2)e.a1=ang(e.c,q);else e.r=dist(e.c,q);break;
    case 'ellipse':if(i===0)e.c=q;else if(i===1){e.rx=dist(e.c,q);e.rot=ang(e.c,q)}else e.ry=dist(e.c,q);break;
    case 'text':case 'point':case 'insert':case 'xline':case 'attdef':case 'fcf':case 'image':e.p=q;break;case 'datum':if(i)e.q=q;else e.p=q;break;
    case 'dim':if(e.kind==='rad'||e.kind==='dia'){if(i===0)e.c=q;else e.a=ang(e.c,q)}else if(e.kind==='ang'){['v','p1','p2','pos'].forEach((k,j)=>{if(j===i)e[k]=q})}else{['p1','p2','pos'].forEach((k,j)=>{if(j===i)e[k]=q})}break}
  dirty()}
/* ============ vista e desenho ============ */
const cv=$('#cv');let ctx=cv.getContext('2d');const _ctxSwap=c=>{ctx=c};
const V={s:0.05,ox:0,oy:0,w:0,h:0,dpr:1};
let TOLW=10,COL={};
const w2s=p=>P(p.x*V.s+V.ox,-p.y*V.s+V.oy), s2w=p=>P((p.x-V.ox)/V.s,-(p.y-V.oy)/V.s);
function readCols(){const cs=getComputedStyle(document.documentElement);['model','model-fg','gridc','gridm','sel','win','cross','crossl','snap','track','accent','danger','muted','text','panel'].forEach(k=>COL[k]=cs.getPropertyValue('--'+k).trim());COL.dark=isDark()}
function isDark(){const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches}
function resize(){const r=cv.getBoundingClientRect();V.dpr=Math.min(2,window.devicePixelRatio||1);const cx=(V.w/2-V.ox)/V.s,cy=(V.oy-V.h/2)/V.s;
  V.w=r.width;V.h=r.height;cv.width=Math.round(r.width*V.dpr);cv.height=Math.round(r.height*V.dpr);if(V._init){V.ox=V.w/2-cx*V.s;V.oy=V.h/2+cy*V.s}V._init=true;requestDraw()}
function zoomAt(sp,f){const w=s2w(sp);V.s=Math.max(1e-5,Math.min(50,V.s*f));V.ox=sp.x-w.x*V.s;V.oy=sp.y+w.y*V.s;requestDraw()}
function zoomBox(b,pad=0.08){if(!isFinite(b.x0)){V.s=0.05;V.ox=V.w/2;V.oy=V.h/2;requestDraw();return}const w=Math.max(b.x1-b.x0,1),h=Math.max(b.y1-b.y0,1);
  V.s=Math.min(V.w*(1-2*pad)/w,V.h*(1-2*pad)/h);V.ox=V.w/2-(b.x0+b.x1)/2*V.s;V.oy=V.h/2+(b.y0+b.y1)/2*V.s;requestDraw()}
const _bb=new WeakMap();function bbC(e){const c=_bb.get(e);if(c&&c.v===_dirty)return c.b;const b=bboxEnt(e);_bb.set(e,{v:_dirty,b});return b}
function extents(list=doc.ents.filter(visible)){let b={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};for(const e of list){if(e.type==='xline')continue;const q=bbC(e);b={x0:Math.min(b.x0,q.x0),y0:Math.min(b.y0,q.y0),x1:Math.max(b.x1,q.x1),y1:Math.max(b.y1,q.y1)}}return b}
function zoomExt(){zoomBox(extents())}
let _rq=0;function requestDraw(){if(!_rq)_rq=requestAnimationFrame(()=>{_rq=0;render()})}
function colOf(c,layerName){
  if(c==='BL'||c==null){const L=layerOf(layerName);return aci(L.color)}
  if(typeof c==='string'&&c.startsWith('L:'))return aci(layerOf(c.slice(2)).color);
  if(c==='BB')return aci(7);return aci(c)}
function aci(c){if(typeof c==='string'&&c[0]==='#')return safeCol(c)||COL['model-fg'];if(c===7||c==='7')return COL['model-fg'];if(!COL.dark&&ACI_L[c])return ACI_L[c];return ACI[c]||COL['model-fg']}
function ltOf(e){return e.lt==='BL'||!e.lt?layerOf(e.layer).lt:e.lt}
function lwOf(e){return e.lw==null||e.lw<0?layerOf(e.layer).lw:e.lw}
function stroke(e,ov){ // configura contexto
  ctx.strokeStyle=ctx.fillStyle=ov&&ov.c||colOf(e.color,e.layer);
  const lw=ST.lwt?Math.max(1,lwOf(e)*3.4):1;ctx.lineWidth=((ov&&ov.w)||lw)/V.s;
  const pat=ov&&ov.dash?ov.dash.map(x=>x/V.s):(()=>{const lt=LTYPES[ltOf(e)];if(!lt)return[];const sc=doc.ltscale*(e.lts||1),d=lt.map(x=>Math.max(Math.abs(x)*sc,0.5/V.s));return d.reduce((a,b)=>a+b,0)*V.s<8?[]:d})();
  ctx.setLineDash(pat)}
function pathPts(pts,closed){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(closed)ctx.closePath()}
function drawText(t,col){if(t.h*V.s<2.2){return}ctx.save();ctx.translate(t.p.x,t.p.y);ctx.rotate(t.rot||0);ctx.scale(1,-1);
  ctx.fillStyle=col;ctx.font=`${t.h}px ${getComputedStyle(document.body).getPropertyValue('--font')}`;ctx.textAlign=t.al==='c'?'center':t.al==='r'?'right':'left';ctx.textBaseline='alphabetic';
  const L=textLayout(t);L.lines.forEach((ln,i)=>ctx.fillText(ln,0,-(L.fb-i*1.5*t.h)));ctx.restore()}
function drawArrow(a,col){const s=a.s,d=nrm(a.dir),n=perp(d);ctx.fillStyle=col;if(a.dot){ctx.beginPath();ctx.arc(a.p.x,a.p.y,s*.3,0,TAU);ctx.fill();return}
  const b=sub(a.p,mul(d,s));ctx.beginPath();ctx.moveTo(a.p.x,a.p.y);ctx.lineTo(b.x+n.x*s*.18,b.y+n.y*s*.18);ctx.lineTo(b.x-n.x*s*.18,b.y-n.y*s*.18);ctx.closePath();ctx.fill()}
function drawGeomG(G,e,ov){stroke(e,ov);const col=ctx.strokeStyle;ctx.beginPath();for(const[a,b]of G.L){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
  for(const[a,b]of G.K||[]){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}ctx.stroke();
  if(G.K&&G.K.length){ctx.save();ctx.lineWidth=ctx.lineWidth*2.2;ctx.beginPath();for(const[a,b]of G.K){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}ctx.stroke();ctx.restore()}
  for(const a of G.AR||[]){ctx.beginPath();ctx.arc(a.c.x,a.c.y,a.r,a.a0,a.a1,false);ctx.stroke()}
  ctx.setLineDash([]);for(const a of G.A)drawArrow(a,col);for(const t of G.T)drawText(t,col)}
function hatchPaint(loops,pat,sc,angD,col){
  ctx.save();ctx.beginPath();for(const l of loops){l.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()}ctx.clip('evenodd');
  const P_=PATTERNS[pat]||PATTERNS.ANSI31;ctx.fillStyle=ctx.strokeStyle=col;ctx.setLineDash([]);
  if(pat==='SOLID'){ctx.globalAlpha*=0.55;ctx.fill('evenodd');ctx.restore();return}
  const a=(angD||0)*D2R,co=Math.cos(-a),si=Math.sin(-a);const all=loops.flat().map(p=>P(p.x*co-p.y*si,p.x*si+p.y*co));const b=bboxPts(all);
  ctx.rotate(a);ctx.lineWidth=Math.max(0.6,1)/V.s;ctx.globalAlpha*=0.75;
  if(P_.dots){const st=4*sc;let n=0;ctx.beginPath();for(let x=Math.floor(b.x0/st)*st;x<b.x1;x+=st)for(let y=Math.floor(b.y0/st)*st;y<b.y1;y+=st){if(++n>6000)break;const h=Math.sin(x*12.9898+y*78.233)*43758.5453,f=h-Math.floor(h);const px=x+f*st,py=y+((h*7)%1+1)%1*st;ctx.moveTo(px+sc*.35,py);ctx.arc(px,py,sc*.35,0,TAU);if(f>.6){ctx.moveTo(px+st*.3,py+st*.2);ctx.lineTo(px+st*.3+sc*1.2,py+st*.2);ctx.lineTo(px+st*.3+sc*.6,py+st*.2+sc*1)}}ctx.stroke();ctx.restore();return}
  ctx.beginPath();let n=0,drawn=0;
  for(const f of P_.f){const sp=f.s*sc,fa=f.a*D2R,d=P(Math.cos(fa),Math.sin(fa)),nn=perp(d);
    const cs=[P(b.x0,b.y0),P(b.x1,b.y0),P(b.x1,b.y1),P(b.x0,b.y1)],pr=cs.map(c=>dot(c,nn)),pd=cs.map(c=>dot(c,d));const lo=Math.min(...pr),hi=Math.max(...pr),dl=Math.min(...pd)-1,dh=Math.max(...pd)+1;
    if((hi-lo)/sp>3000||sp*V.s<1.5)continue;drawn++;const off=(f.o||0)*sc;
    for(let k=Math.floor((lo-off)/sp);k*sp+off<=hi;k++){const o=k*sp+off,p0=add(mul(nn,o),mul(d,dl)),p1=add(mul(nn,o),mul(d,dh));
      if(P_.brick&&f.a===0){ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);const bw=sp*2,sh=(k%2)*sp;for(let x=Math.floor((dl-sh)/bw)*bw+sh;x<dh;x+=bw){const q=add(mul(nn,o),mul(d,x));ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+nn.x*sp,q.y+nn.y*sp)}}
      else{ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y)}if(++n>8000)break}}
  if(!drawn){ctx.globalAlpha*=0.3;ctx.fillRect(b.x0-1e5,b.y0-1e5,b.x1-b.x0+2e5,b.y1-b.y0+2e5)}else ctx.stroke();ctx.restore()}
function drawEnt(e,ov){
  switch(e.type){
    case 'line':stroke(e,ov);ctx.beginPath();ctx.moveTo(e.a.x,e.a.y);ctx.lineTo(e.b.x,e.b.y);ctx.stroke();break;
    case 'pline':stroke(e,ov);pathPts(e.pts,e.closed);ctx.stroke();break;
    case 'circle':stroke(e,ov);ctx.beginPath();ctx.arc(e.c.x,e.c.y,e.r,0,TAU);ctx.stroke();break;
    case 'arc':stroke(e,ov);ctx.beginPath();ctx.arc(e.c.x,e.c.y,e.r,e.a0,e.a1,false);ctx.stroke();break;
    case 'ellipse':stroke(e,ov);ctx.beginPath();ctx.ellipse(e.c.x,e.c.y,e.rx,e.ry,e.rot||0,0,TAU);ctx.stroke();break;
    case 'spline':stroke(e,ov);pathPts(splinePts(e.pts,e.closed,12),false);ctx.stroke();break;
    case 'xline':{stroke(e,ov);const q=primsC(e)[0];ctx.beginPath();ctx.moveTo(q.a.x,q.a.y);ctx.lineTo(q.b.x,q.b.y);ctx.stroke();break}
    case 'point':{stroke(e,ov);const r=4/V.s;ctx.beginPath();ctx.moveTo(e.p.x-r,e.p.y);ctx.lineTo(e.p.x+r,e.p.y);ctx.moveTo(e.p.x,e.p.y-r);ctx.lineTo(e.p.x,e.p.y+r);ctx.stroke();ctx.beginPath();ctx.arc(e.p.x,e.p.y,r*.6,0,TAU);ctx.stroke();break}
    case 'text':stroke(e,ov);drawText(e,ctx.fillStyle);if(e.h*V.s<2.2){const b=textBox(e);ctx.globalAlpha*=.35;pathPts(b,true);ctx.fill();ctx.globalAlpha=1}break;
    case 'hatch':{stroke(e,ov);hatchPaint(e.loops,ov?'ANSI31':e.pat,ov?Math.max(e.sc,12/V.s/3.175):e.sc,e.ang,ctx.strokeStyle);if(ov){pathPts(e.loops[0],true);ctx.stroke()}break}
    case 'dim':drawGeomG(dimGeom(e),e,ov);break;
    case 'leader':drawGeomG(leaderGeom(e),e,ov);break;
    case 'insert':for(const c of childEnts(e))drawEnt(c,ov);break;
    case 'wall':drawWalls([e],ov);break;
    default:if(EXT[e.type])EXT[e.type].draw(e,ov)}}
function drawWalls(ws,ov){
  const items=ws.map(w=>({w,g:wallPolys(w)}));
  for(const{w,g}of items){stroke(w,ov);if(!ov)ctx.lineWidth=Math.max(ctx.lineWidth,1.6/V.s);ctx.setLineDash([]);for(const p of g.core.concat(g.ins)){pathPts(p,true);ctx.stroke()}}
  if(ov)return;
  for(const{w,g}of items){const col=colOf(w.color,w.layer);
    for(const p of g.core){ctx.fillStyle=COL.model;pathPts(p,true);ctx.fill();if(w.t>=150)hatchPaint([p],'ANSI31',Math.max(8,w.t/12),0,col);else{ctx.save();ctx.globalAlpha=.22;ctx.fillStyle=col;ctx.fill();ctx.restore()}}
    for(const p of g.ins){ctx.fillStyle=COL.model;pathPts(p,true);ctx.fill();hatchPaint([p],'INSUL',Math.max(10,(w.ins||100)/4),0,aci(9))}}}
function drawGrid(){if(!ST.grid)return;let g=ST.gridX;while(g*V.s<8)g*=5;while(g*V.s>160)g/=5;const tl=s2w(P(0,0)),br=s2w(P(V.w,V.h));
  ctx.lineWidth=1;const x0=Math.floor(tl.x/g)*g,y0=Math.floor(br.y/g)*g;
  for(const major of[false,true]){ctx.strokeStyle=major?COL.gridm:COL.gridc;ctx.beginPath();
    for(let x=x0;x<=br.x;x+=g){const isM=Math.abs(Math.round(x/(g*5))*(g*5)-x)<g/10;if(isM!==major)continue;const sx=Math.round(x*V.s+V.ox)+.5;ctx.moveTo(sx,0);ctx.lineTo(sx,V.h)}
    for(let y=y0;y<=tl.y;y+=g){const isM=Math.abs(Math.round(y/(g*5))*(g*5)-y)<g/10;if(isM!==major)continue;const sy=Math.round(-y*V.s+V.oy)+.5;ctx.moveTo(0,sy);ctx.lineTo(V.w,sy)}ctx.stroke()}
  const o=w2s(P(0,0));ctx.strokeStyle=COL.crossl;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+30,o.y);ctx.stroke();ctx.strokeStyle=COL.danger;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x,o.y-30);ctx.stroke();ctx.globalAlpha=1}
function render(){if(!doc)return;  // quadro pedido antes de plataforma.js criar o desenho

  readColsOnce();
  ctx.setTransform(V.dpr,0,0,V.dpr,0,0);ctx.fillStyle=COL.model;ctx.fillRect(0,0,V.w,V.h);drawGrid();
  ctx.setTransform(V.dpr*V.s,0,0,-V.dpr*V.s,V.dpr*V.ox,V.dpr*V.oy);ctx.lineCap='round';ctx.lineJoin='round';
  const tl=s2w(P(0,0)),br=s2w(P(V.w,V.h)),vb={x0:tl.x,y0:br.y,x1:br.x,y1:tl.y};
  const vis=doc.ents.filter(e=>{if(!visible(e))return false;if(e.type==='xline')return true;const b=bbC(e);return!(b.x1<vb.x0||b.x0>vb.x1||b.y1<vb.y0||b.y0>vb.y1)});
  for(const e of vis)if(e.type==='hatch')drawEnt(e);
  drawWalls(vis.filter(e=>e.type==='wall'));
  for(const e of vis)if(e.type!=='hatch'&&e.type!=='wall')drawEnt(e);
  const selC=COL.sel;
  for(const id of SEL){const e=entById(id);if(e&&visible(e))drawEnt(e,{c:selC,dash:[7,4],w:2})}
  if(UI.hover&&!SEL.has(UI.hover.id))drawEnt(UI.hover,{c:selC,w:2.5});
  for(const g of UI.ghost||[])drawEnt(g,{c:COL.accent,dash:[5,4],w:1.4});
  ctx.setTransform(V.dpr,0,0,V.dpr,0,0);ctx.setLineDash([]);
  // grips
  if(!CMD.gen||CMD.req&&CMD.req.kind==='sel'){let n=0;for(const id of SEL){const e=entById(id);if(!e||!editable(e))continue;for(const[i,g]of gripsOf(e).entries()){if(++n>800)break;const s=w2s(g),hot=UI.grip&&UI.grip.e===e&&UI.grip.i===i;ctx.fillStyle=hot?COL.danger:selC;ctx.strokeStyle=COL.model;ctx.fillRect(s.x-4.5,s.y-4.5,9,9);ctx.strokeRect(s.x-4.5,s.y-4.5,9,9)}}}
  try{drawConsOverlay()}catch(_){}
  try{if(window.cadOverlay)window.cadOverlay(ctx,w2s)}catch(_){}
  // janela de seleção
  if(UI.box){const a=UI.box.a,b=UI.box.b,cr=b.x<a.x;ctx.fillStyle=cr?COL.cross:COL.win;ctx.strokeStyle=cr?COL.crossl:selC;ctx.setLineDash(cr?[6,4]:[]);ctx.fillRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));ctx.strokeRect(Math.min(a.x,b.x)+.5,Math.min(a.y,b.y)+.5,Math.abs(b.x-a.x),Math.abs(b.y-a.y));ctx.setLineDash([])}
  // rastreamento
  for(const t of UI.tracks||[]){const a=w2s(t.a),b=w2s(t.b),d=nrm(sub(b,a));ctx.strokeStyle=COL.track;ctx.setLineDash([3,4]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x-d.x*4000,a.y-d.y*4000);ctx.lineTo(a.x+d.x*4000,a.y+d.y*4000);ctx.stroke();ctx.setLineDash([])}
  for(const q of UI.acq||[]){const s=w2s(q);ctx.strokeStyle=COL.track;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x-4,s.y);ctx.lineTo(s.x+4,s.y);ctx.moveTo(s.x,s.y-4);ctx.lineTo(s.x,s.y+4);ctx.stroke()}
  // marcador de osnap
  if(UI.snap&&UI.snap.k){drawSnapMark(w2s(UI.snap.p),UI.snap.k)}
  // cursor
  if(UI.cur&&UI.inside){const c=UI.touchPt&&UI.curS?UI.curS:w2s(UI.pt||UI.cur);ctx.strokeStyle=COL['model-fg'];ctx.globalAlpha=.85;ctx.lineWidth=1;const A=UI.pointMode?26:16;
    ctx.beginPath();ctx.moveTo(c.x-A,c.y+.5);ctx.lineTo(c.x+A,c.y+.5);ctx.moveTo(c.x+.5,c.y-A);ctx.lineTo(c.x+.5,c.y+A);ctx.stroke();
    if(!UI.pointMode)ctx.strokeRect(c.x-4.5,c.y-4.5,9,9);
    if(UI.touchPt){ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(UI.touchPt.x,UI.touchPt.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.setLineDash([])}ctx.globalAlpha=1}}
let _colsV=-1;function readColsOnce(){if(_colsV!==_themeV){readCols();_colsV=_themeV}}let _themeV=0;
const SNAPNAME={end:'Extremidade',mid:'Ponto médio',cen:'Centro',qua:'Quadrante',int:'Interseção',per:'Perpendicular',nea:'Mais próximo',nod:'Nó',ins:'Inserção',tan:'Tangente',grid:'Grade',polar:'Polar',track:'Rastreamento'};
function drawSnapMark(s,k){ctx.strokeStyle=COL.snap;ctx.lineWidth=2;ctx.beginPath();const r=6;
  if(k==='end')ctx.rect(s.x-r,s.y-r,2*r,2*r);else if(k==='mid'){ctx.moveTo(s.x,s.y-r-1);ctx.lineTo(s.x+r+1,s.y+r);ctx.lineTo(s.x-r-1,s.y+r);ctx.closePath()}
  else if(k==='cen')ctx.arc(s.x,s.y,r+1,0,TAU);else if(k==='qua'){ctx.moveTo(s.x,s.y-r-2);ctx.lineTo(s.x+r+2,s.y);ctx.lineTo(s.x,s.y+r+2);ctx.lineTo(s.x-r-2,s.y);ctx.closePath()}
  else if(k==='int'){ctx.moveTo(s.x-r,s.y-r);ctx.lineTo(s.x+r,s.y+r);ctx.moveTo(s.x+r,s.y-r);ctx.lineTo(s.x-r,s.y+r)}
  else if(k==='per'){ctx.moveTo(s.x-r,s.y-r);ctx.lineTo(s.x-r,s.y+r);ctx.lineTo(s.x+r,s.y+r);ctx.moveTo(s.x-r,s.y);ctx.lineTo(s.x,s.y);ctx.lineTo(s.x,s.y+r)}
  else if(k==='nea'){ctx.moveTo(s.x-r,s.y-r);ctx.lineTo(s.x+r,s.y-r);ctx.lineTo(s.x-r,s.y+r);ctx.lineTo(s.x+r,s.y+r);ctx.closePath()}
  else if(k==='nod'){ctx.arc(s.x,s.y,r,0,TAU);ctx.moveTo(s.x-r,s.y-r);ctx.lineTo(s.x+r,s.y+r);ctx.moveTo(s.x+r,s.y-r);ctx.lineTo(s.x-r,s.y+r)}
  else if(k==='ins'){ctx.rect(s.x-r,s.y-r,r*1.2,r*1.2);ctx.rect(s.x-r*.2,s.y-r*.2,r*1.2,r*1.2)}
  else if(k==='grid'||k==='polar'||k==='track'){ctx.lineWidth=1.2;ctx.moveTo(s.x-4,s.y-4);ctx.lineTo(s.x+4,s.y+4);ctx.moveTo(s.x+4,s.y-4);ctx.lineTo(s.x-4,s.y+4)}
  ctx.stroke()}
/* ============ estado da interface ============ */
const SEL=new Set();
const UI={cur:null,pt:null,snap:null,ghost:null,box:null,hover:null,tracks:[],acq:[],inside:false,pointMode:false,pan:false,touchPt:null};
let lastPt=P(0,0);
const CMD={gen:null,req:null,name:'',last:'',before:null,script:[],stimer:0,sdelay:30,onScriptEnd:null,prevSel:[],lastCreated:null};
const hist=$('#hist');
function log(s,cls){const d=document.createElement('div');if(cls)d.className=cls;d.textContent=s;hist.appendChild(d);while(hist.children.length>200)hist.firstChild.remove();hist.scrollTop=hist.scrollHeight}
const logE=s=>log(s,'e'),logR=s=>log(s,'r');
function toast(s,ms=2200){const t=$('#toast');t.textContent=s;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',ms)}

/* ============ snap ============ */
function nearEnts(p,r){const o=[];for(const e of doc.ents){if(!visible(e))continue;if(e.type==='xline'){if(entDist(e,p)<r)o.push(e);continue}const b=bbC(e);if(p.x<b.x0-r||p.x>b.x1+r||p.y<b.y0-r||p.y>b.y1+r)continue;o.push(e)}return o}
function osnapAt(p,base){
  const ap=12/V.s,O=ST.os,ents=nearEnts(p,ap).filter(e=>e.type!=='hatch').slice(0,60);let best=null;
  const consider=(q,k,pri=1)=>{const d=dist(q,p)*pri;if(d<=ap&&(!best||d<best.d))best={p:q,k,d}};
  for(const e of ents){for(const s of snapPts(e))if(O[s.k])consider(s.p,s.k)}
  const pr=[];for(const e of ents){if(e.type==='dim'||e.type==='text'||e.type==='point')continue;for(const q of primsC(e)){if(q.t==='s'){if(Math.min(dist(p,closestOnPrim(q,p)))<=ap)pr.push(q)}else if(Math.abs(dist(p,q.c)-q.r)<=ap)pr.push(q)}}
  if(O.int&&pr.length<120)for(let i=0;i<pr.length;i++)for(let j=i+1;j<pr.length;j++)for(const q of primInt(pr[i],pr[j]))consider(q,'int');
  if(O.per&&base)for(const q of pr){let f;if(q.t==='s'){const d=sub(q.b,q.a),L=dot(d,d);if(L<1e-9)continue;const t=dot(sub(base,q.a),d)/L;if(t<-1e-9||t>1+1e-9)continue;f=add(q.a,mul(d,t))}else{if(dist(base,q.c)<1e-6)continue;f=pol(q.c,q.r,ang(q.c,base));if(q.t==='a'&&!onPrim(q,f))continue}if(dist(f,base)>1e-6)consider(f,'per',1.05)}
  if(O.tan&&base)for(const q of pr){if(q.t==='s')continue;const dd=dist(base,q.c);if(dd<=q.r)continue;const a=Math.acos(q.r/dd),b0=ang(q.c,base);for(const t of[b0+a,b0-a]){const f=pol(q.c,q.r,t);if(q.t==='c'||onPrim(q,f))consider(f,'tan',1.05)}}
  if(!best&&O.nea)for(const q of pr){const c=closestOnPrim(q,p);consider(c,'nea')}
  return best}
function acquireTick(sn){const now=performance.now();if(!ST.otrack||!sn||sn.k==='nea'||sn.k==='polar'||sn.k==='track'){UI._acqP=null;return}
  if(UI._acqP&&dist(UI._acqP.p,sn.p)<1e-6){if(now-UI._acqP.t>450&&!UI._acqP.done){UI._acqP.done=true;const i=UI.acq.findIndex(q=>dist(q,sn.p)<1e-6);if(i>=0)UI.acq.splice(i,1);else{UI.acq.push(sn.p);if(UI.acq.length>4)UI.acq.shift()}}}else UI._acqP={p:sn.p,t:now}}
function computePoint(raw,req){
  const base=req&&req.base;UI.tracks=[];const ap=10/V.s;
  if(ST.osnap&&!(UI.shift&&false)){const sn=osnapAt(raw,base);acquireTick(sn);if(sn)return sn}
  // rastreamento a partir de pontos adquiridos
  if(ST.otrack&&UI.acq.length){const cand=[];for(const q of UI.acq)for(const a of[0,90,...(ST.polar?[ST.polarInc,180-ST.polarInc]:[])]){const d=P(Math.cos(a*D2R),Math.sin(a*D2R)),t=dot(sub(raw,q),d),f=add(q,mul(d,t));if(dist(f,raw)<ap)cand.push({q,d,f,dd:dist(f,raw)})}
    if(base&&ST.polar){const a=Math.round(ang(base,raw)*R2D/ST.polarInc)*ST.polarInc*D2R,d=P(Math.cos(a),Math.sin(a)),t=dot(sub(raw,base),d),f=add(base,mul(d,t));if(dist(f,raw)<ap&&t>0)cand.push({q:base,d,f,dd:dist(f,raw)})}
    cand.sort((x,y)=>x.dd-y.dd);
    if(cand.length>=2){for(let j=1;j<cand.length;j++){if(Math.abs(crs(cand[0].d,cand[j].d))<0.1)continue;const r=llInt(cand[0].q,add(cand[0].q,cand[0].d),cand[j].q,add(cand[j].q,cand[j].d));if(r&&dist(r.p,raw)<ap*1.5){UI.tracks=[{a:cand[0].q,b:r.p},{a:cand[j].q,b:r.p}];return{p:r.p,k:'track'}}}}
    if(cand.length&&cand[0].q!==base){UI.tracks=[{a:cand[0].q,b:cand[0].f}];return{p:cand[0].f,k:'track'}}}
  let p=raw;const ortho=ST.ortho!==!!UI.shift;
  if(base&&ortho){const d=sub(raw,base);p=Math.abs(d.x)>=Math.abs(d.y)?P(raw.x,base.y):P(base.x,raw.y);if(ST.snap)p=snapGridRel(p,base);return{p,k:null,orth:true}}
  if(base&&ST.polar){const a=ang(base,raw),k=Math.round(a*R2D/ST.polarInc)*ST.polarInc*D2R,d=P(Math.cos(k),Math.sin(k)),t=dot(sub(raw,base),d),f=add(base,mul(d,t));
    if(t>0&&dist(f,raw)<ap){UI.tracks=[{a:base,b:f}];let q=f;if(ST.snap){const st=ST.snapX;q=add(base,mul(d,Math.round(t/st)*st))}return{p:q,k:'polar',pang:k}}}
  if(ST.snap)return{p:P(Math.round(raw.x/ST.snapX)*ST.snapX,Math.round(raw.y/ST.snapX)*ST.snapX),k:'grid'};
  return{p:raw,k:null}}
function snapGridRel(p,b){const s=ST.snapX;return P(b.x+Math.round((p.x-b.x)/s)*s,b.y+Math.round((p.y-b.y)/s)*s)}

/* ============ registro de comandos ============ */
const CMDS={},ALIAS={};
function defCmd(name,o,fn){CMDS[name]=Object.assign({name,fn,mod:true,desc:'',al:[]},o);for(const a of CMDS[name].al)ALIAS[a]=name}
const resolveCmd=n=>CMDS[n]||CMDS[ALIAS[n]];
const pt=(prompt,o={})=>Object.assign({kind:'point',prompt},o);
const dst=(prompt,o={})=>Object.assign({kind:'dist',prompt},o);
const num=(prompt,o={})=>Object.assign({kind:'num',prompt},o);
const angq=(prompt,o={})=>Object.assign({kind:'angle',prompt},o);
const txtq=(prompt,o={})=>Object.assign({kind:'text',prompt},o);
const kwq=(prompt,opts,o={})=>Object.assign({kind:'kw',prompt,opts},o);
const selq=(prompt='Selecione objetos',o={})=>Object.assign({kind:'sel',prompt},o);
const pickq=(prompt,o={})=>Object.assign({kind:'pick',prompt},o);
function snapshotStr(){return JSON.stringify({ents:doc.ents,layers:doc.layers,blocks:doc.blocks,clayer:doc.clayer,nextId:doc.nextId,cons:doc.cons||[],vps:doc.vps||[],pn:doc.pn||0})}
function restoreSnap(s){const o=JSON.parse(s);Object.assign(doc,o);SEL.clear();dirty();refreshPanels()}
function undo(){if(CMD.gen)cancelCmd();if(!undoS.length){log('Nada para desfazer');return}redoS.push(snapshotStr());restoreSnap(undoS.pop());log('Desfeito');autosave()}
function redo(){if(!redoS.length){log('Nada para refazer');return}undoS.push(snapshotStr());restoreSnap(redoS.pop());log('Refeito');autosave()}
function startCmd(name){
  name=String(name).trim().toUpperCase();if(!name)return;
  const parts=name.split(/\s+/);const def=resolveCmd(parts[0].replace(/^[_.']+/,''));
  if(!def){logE(`Comando desconhecido: “${parts[0]}”. Digite AJUDA para a lista.`);return}
  if(parts.length>1)CMD.script.unshift(...parts.slice(1));
  if(def.instant){if(CMD.gen&&!def.transparent)cancelCmd(true);log('Comando: '+def.name);def.fn();if(CMD.script.length&&!CMD.gen)scheduleScript();return}
  if(CMD.gen)cancelCmd(true);
  CMD.name=def.name;if(!def.norepeat)CMD.last=def.name;CMD.before=def.mod?snapshotStr():null;CMD.gen=def.fn();log('Comando: '+def.name);UI.box=null;step(undefined)}
function step(v){
  let r;try{r=CMD.gen.next(v)}catch(err){console.error(err);logE('Erro: '+err.message);endCmd();return}
  if(r.done){endCmd();return}
  const req=r.value;CMD.req=req;
  if(req.kind==='sel'&&SEL.size&&!req.noPre&&!CMD._inSel){const ids=[...SEL].filter(id=>{const e=entById(id);return e&&editable(e)});SEL.clear();CMD.prevSel=ids;logR(ids.length+' objeto(s) pré-selecionado(s)');return step(ids.map(entById))}
  if(req.kind==='sel'){CMD._inSel=true;CMD._selAcc=new Set()}
  UI.pointMode=['point','dist','angle'].includes(req.kind);
  showPrompt(req);updatePreview();requestDraw();if(CMD.script.length)scheduleScript()}
function feed(v){
  const req=CMD.req;if(!req)return;
  if(v===null&&req.def!==undefined)v=req.def;
  if(req.kind==='sel'&&v===null){const arr=[...CMD._selAcc].map(entById).filter(Boolean);CMD._inSel=false;CMD.prevSel=arr.map(e=>e.id);SEL.clear();logR(arr.length+' encontrado(s)');return step(arr)}
  if(v&&typeof v==='object'&&'x'in v)lastPt=v;
  if(req.kind==='sel'){CMD._inSel=false}
  step(v)}
function endCmd(){
  if(CMD.before!=null&&doc.cons&&doc.cons.length&&typeof solveCons==='function')solveCons(true);
  if(CMD.before!=null){const now=snapshotStr();if(now!==CMD.before){undoS.push(CMD.before);if(undoS.length>80)undoS.shift();redoS=[];autosave()}}
  CMD.gen=null;CMD.req=null;CMD.before=null;CMD._inSel=false;UI.ghost=null;UI.pointMode=false;UI.tracks=[];UI.grip=null;
  if(CMD._selAcc){CMD._selAcc=null}showPrompt(null);refreshPanels();requestDraw();if(CMD.script.length)scheduleScript();else if(CMD.onScriptEnd&&!CMD.stimer){const f=CMD.onScriptEnd;CMD.onScriptEnd=null;f()}}
function cancelCmd(silent){if(CMD.gen){try{CMD.gen.return()}catch(e){}if(!silent)log('*Cancelado*');if(CMD._inSel)SEL.clear();endCmd()}}
function stopScript(){CMD.script=[];clearTimeout(CMD.stimer);CMD.stimer=0;CMD.onScriptEnd=null;$('#stepsP').classList.remove('open')}

/* ============ entrada digitada ============ */
const deacc=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function optKey(o){if(o.includes(':'))return o.split(':')[1].toUpperCase();const m=o.match(/[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]/);return deacc((m?m[0]:o[0]).toUpperCase())}
const optLabel=o=>o.includes(':')?o.split(':')[0]+' ('+o.split(':')[1]+')':o;
function parseTyped(s,req){
  const raw=s;s=s.trim();
  if(req.kind==='text')return raw.replace(/^\s+/,'');
  if(s==='')return null;
  const U=deacc(s.toUpperCase());
  if(req.opts){for(const o of req.opts){const ku=deacc(o.split(':')[0].toUpperCase());if(U===ku||U===optKey(o)||(U.length>1&&ku.startsWith(U)))return optKey(o)}}
  if(req.kind==='kw'){logE('Opção inválida');return undefined}
  if(req.kind==='sel'){
    if(/^(ALL|TODOS|TUDO)$/.test(U))return{sel:'all'};if(/^(L|U|ULT|ÚLTIMO|ULTIMO|LAST)$/.test(U))return{sel:'last'};if(/^(P|PREV|ANTERIOR)$/.test(U))return{sel:'prev'};
    if(/^(W|J|JANELA|WINDOW)$/.test(U))return{sel:'W'};if(/^(C|CROSSING|CRUZADA)$/.test(U))return{sel:'C'}}
  const base=req.base||lastPt;
  let m;
  if((m=s.match(/^@\s*(-?[\d.]+)\s*<\s*(-?[\d.]+)$/)))return pol(base,+m[1],+m[2]*D2R);
  if((m=s.match(/^@\s*(-?[\d.]+)\s*[,;]\s*(-?[\d.]+)$/)))return add(base,P(+m[1],+m[2]));
  if((m=s.match(/^(-?[\d.]+)\s*<\s*(-?[\d.]+)$/)))return pol(P(0,0),+m[1],+m[2]*D2R);
  if((m=s.match(/^(-?[\d.]+)\s*[,;]\s*(-?[\d.]+)$/)))return P(+m[1],+m[2]);
  if(/^-?[\d.]+$/.test(s)){const n=+s;
    if(req.kind==='point'||req.kind==='pick'){if(req.base||req.allowDD){const cur=UI.pt||UI.cur;if(!cur||dist(cur,base)<1e-9)return add(base,P(n,0));const d=(UI.snap&&UI.snap.pang!=null)?P(Math.cos(UI.snap.pang),Math.sin(UI.snap.pang)):nrm(sub(cur,base));return add(base,mul(d,n))}logE('Informe um ponto (x,y) ou clique na tela');return undefined}
    return n}
  logE(`Entrada inválida: “${s}”`);return undefined}
function submitLine(s){
  if(typeof s==='string'&&s.startsWith('#')){scriptDirective(s);return}
  if(!CMD.gen){if(!s.trim()){if(CMD.last)startCmd(CMD.last);return}startCmd(s);return}
  const req=CMD.req;let v=parseTyped(s,req);if(v===undefined)return;
  if(req.kind!=='text'&&s.trim())log((req.prompt||'')+': '+s.trim());
  if(req.kind==='sel'&&v&&v.sel){selKeyword(v.sel);return}
  if(req.kind==='sel'&&v&&typeof v==='object'&&'x'in v){if(CMD._selWin){selWinPt(v);return}const e=pickAt(v,null,Math.max(TOLW,30));if(e){CMD._selAcc.add(e.id);SEL.add(e.id);logR(CMD._selAcc.size+' selecionado(s)');requestDraw()}else logE('Nada nesse ponto');return}
  if(req.kind==='pick'&&v&&typeof v==='object'&&'x'in v){const e=pickAt(v,req.filter,Math.max(TOLW,30));if(!e){logE('Nenhum objeto nesse ponto');return}feed({e,p:v});return}
  if(req.kind==='dist'&&v&&typeof v==='object'&&'x'in v){feed(dist(req.base||lastPt,v)/(req.div||1));return}
  if(req.kind==='angle'&&v&&typeof v==='object'&&'x'in v){feed(ang(req.base,v)*R2D);return}
  if((req.kind==='num'||req.kind==='dist'||req.kind==='angle')&&v&&typeof v==='object'){logE('Informe um número');return}
  feed(v)}
function selKeyword(k){const acc=CMD._selAcc;
  if(k==='all'){doc.ents.filter(e=>editable(e)).forEach(e=>{acc.add(e.id);SEL.add(e.id)})}
  else if(k==='last'){const e=doc.ents[doc.ents.length-1];if(e){acc.add(e.id);SEL.add(e.id)}}
  else if(k==='prev'){CMD.prevSel.forEach(id=>{if(entById(id)){acc.add(id);SEL.add(id)}})}
  else{CMD._selWin=k;CMD._winPts=[];log(k==='W'?'Janela: primeiro canto':'Cruzada: primeiro canto');requestDraw();return}
  logR(acc.size+' selecionado(s)');requestDraw()}
function selWinPt(p){CMD._winPts.push(p);if(CMD._winPts.length<2){log('Canto oposto');return}const[a,b]=CMD._winPts;const list=boxSelect(a,b,CMD._selWin==='C');CMD._selWin=null;list.forEach(e=>{CMD._selAcc.add(e.id);SEL.add(e.id)});logR(CMD._selAcc.size+' selecionado(s)');requestDraw()}
function scriptDirective(s){const[k,v]=s.slice(1).split(':');
  if(k==='PHASE'){setPhase(v)}else if(k==='ZOOM'){zoomExt()}else if(k==='DONE'){setPhase(null)}else if(k==='LOG'){logR(v)}else if(k==='CALL'&&window[v])window[v]()}
function scheduleScript(){if(CMD.stimer)return;let d=CMD.sdelay;const nx=CMD.script[0];if(typeof nx==='string'&&nx.startsWith('#WAIT:'))d=+nx.slice(6);
  CMD.stimer=setTimeout(()=>{CMD.stimer=0;if(!CMD.script.length){endScriptCheck();return}const line=CMD.script.shift();if(typeof line==='string'&&line.startsWith('#WAIT:')){scheduleScript();return}
    if(!CMD.gen&&typeof line==='string'&&!line.startsWith('#'))log('» '+line);submitLine(line);if(CMD.script.length&&!CMD.stimer)scheduleScript();else if(!CMD.script.length)endScriptCheck()},d)}
function endScriptCheck(){if(!CMD.script.length&&!CMD.gen&&CMD.onScriptEnd){const f=CMD.onScriptEnd;CMD.onScriptEnd=null;f()}}
function runScript(lines,delay=30,onEnd){stopScript();CMD.sdelay=delay;CMD.onScriptEnd=onEnd||null;CMD.script=lines.slice();if(CMD.gen)cancelCmd(true);scheduleScript()}

/* ============ prompt ============ */
function showPrompt(req){const pr=$('#prompt'),op=$('#opts');op.innerHTML='';
  if(!req){pr.textContent='Comando:';$('#cmd').placeholder='Digite um comando (L, PL, C, TR…) ou coordenada';return}
  let t=req.prompt||'';if(req.def!==undefined&&req.def!==null&&req.kind!=='kw')t+=` <${typeof req.def==='number'?fmtN(req.def):req.def}>`;
  pr.textContent=CMD.name+' · '+t+':';
  for(const o of req.opts||[]){const b=document.createElement('button');b.textContent=optLabel(o);b.onclick=()=>{submitLine(optKey(o))};op.appendChild(b)}
  if(req.kind==='sel'){for(const[o,k]of[['Todos','all'],['Último','last'],['Anterior','prev']]){const b=document.createElement('button');b.textContent=o;b.onclick=()=>selKeyword(k);op.appendChild(b)}
    const b=document.createElement('button');b.textContent='Concluir ↵';b.onclick=()=>feed(null);op.appendChild(b)}
  else if(req.kind!=='kw'&&req.kind!=='text'){const b=document.createElement('button');b.textContent='↵';b.title='Enter';b.onclick=()=>submitLine('');op.appendChild(b)}
  $('#cmd').placeholder=req.kind==='text'?'Digite o texto e Enter':'Valor, coordenada (x,y · @dx,dy · @d<ângulo) ou opção'}
function updatePreview(){const req=CMD.req;UI.ghost=null;if(!req||!req.preview)return;const p=UI.pt||UI.cur;if(!p)return;try{UI.ghost=req.preview(p)||null}catch(e){UI.ghost=null}}

/* ============ seleção ============ */
function pickAt(p,filter,tolW){const tol=tolW||TOLW;let best=null,bd=Infinity;
  for(const e of doc.ents){if(!editable(e))continue;if(filter&&!filter(e))continue;if(e.type!=='xline'){const b=bbC(e);if(p.x<b.x0-tol||p.x>b.x1+tol||p.y<b.y0-tol||p.y>b.y1+tol)continue}
    const d=entDist(e,p);if(d<=tol&&d<bd){bd=d;best=e}}return best}
function boxSelect(a,b,crossing){const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y),o=[];
  const R=[P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)],edges=plSegs(R,true);
  for(const e of doc.ents){if(!editable(e)||e.type==='xline')continue;const bb=bbC(e);const inside=bb.x0>=x0&&bb.x1<=x1&&bb.y0>=y0&&bb.y1<=y1;
    if(inside){o.push(e);continue}if(!crossing)continue;if(bb.x1<x0||bb.x0>x1||bb.y1<y0||bb.y0>y1)continue;
    let hit=false;const ps=e.type==='insert'?childEnts(e).flatMap(c=>primsC(c)):e.type==='hatch'?e.loops.flatMap(l=>plSegs(l,true)):e.type==='text'||e.type==='dim'||e.type==='leader'?null:primsC(e);
    if(!ps){hit=true}else{for(const q of ps){if(q.t==='s'&&(inBox(q.a)||inBox(q.b))){hit=true;break}for(const ed of edges)if(primInt(q,ed).length){hit=true;break}if(hit)break;if(q.t!=='s'&&inBox(closestOnPrim(q,P((x0+x1)/2,(y0+y1)/2)))){hit=true;break}}}
    if(hit)o.push(e)}
  function inBox(p){return p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1}return o}
/* ============ comandos de desenho ============ */
const G_=(o)=>Object.assign({layer:doc.clayer,color:'BL',lt:'BL',lw:-1},o);
const mk=o=>{const e=addEnt(G_(o));CMD.lastCreated=e;return e};
defCmd('LINE',{al:['L','LINHA'],desc:'Linhas'},function*(){
  let p0=yield pt('Primeiro ponto');if(!p0)return;const first=p0,made=[];
  for(;;){const opts=made.length>=2?['Fechar','Desfazer']:made.length?['Desfazer']:[];
    const p=yield pt('Próximo ponto',{base:p0,opts,preview:q=>[G_({type:'line',a:p0,b:q})]});
    if(p==null)return;if(p==='F'){mk({type:'line',a:p0,b:first});return}
    if(p==='D'){const e=made.pop();if(e){delEnt(e);p0=e.a}continue}
    made.push(mk({type:'line',a:p0,b:p}));p0=p}});
defCmd('PLINE',{al:['PL','POLILINHA'],desc:'Polilinha'},function*(){
  const p0=yield pt('Ponto inicial');if(!p0)return;const pts=[p0];
  for(;;){const last=pts[pts.length-1];const p=yield pt('Próximo ponto',{base:last,opts:pts.length>=3?['Fechar','Desfazer']:['Desfazer'],preview:q=>[G_({type:'pline',pts:[...pts,q],closed:false})]});
    if(p==null){if(pts.length>1)mk({type:'pline',pts,closed:false});return}
    if(p==='F'){if(pts.length>=3)mk({type:'pline',pts,closed:true});return}
    if(p==='D'){if(pts.length>1)pts.pop();continue}pts.push(p)}});
defCmd('RECTANG',{al:['REC','RET','RETANGULO','RETÂNGULO'],desc:'Retângulo'},function*(){
  const a=yield pt('Primeiro canto');if(!a)return;
  let b=yield pt('Canto oposto',{opts:['Dimensões','Área'],preview:q=>[G_({type:'pline',pts:[a,P(q.x,a.y),q,P(a.x,q.y)],closed:true})]});
  if(b==='D'||b==='Á'||b==='A'){let w,h;if(b==='D'){w=yield dst('Comprimento',{base:a,def:1000});h=yield dst('Largura',{base:a,def:1000})}else{const ar=yield num('Área (m²)',{def:10});w=yield dst('Comprimento',{base:a,def:4000});h=ar*1e6/w}
    const q=yield pt('Quadrante (clique no lado desejado)',{preview:q=>{const sx=q.x>=a.x?1:-1,sy=q.y>=a.y?1:-1;const c=P(a.x+sx*w,a.y+sy*h);return[G_({type:'pline',pts:[a,P(c.x,a.y),c,P(a.x,c.y)],closed:true})]}});
    const sx=q&&q.x<a.x?-1:1,sy=q&&q.y<a.y?-1:1;b=P(a.x+sx*w,a.y+sy*h)}
  if(!b||typeof b!=='object')return;mk({type:'pline',pts:[a,P(b.x,a.y),b,P(a.x,b.y)],closed:true})});
defCmd('CIRCLE',{al:['C','CIRCULO','CÍRCULO'],desc:'Círculo'},function*(){
  let c=yield pt('Centro',{opts:['3P','2P']});if(!c)return;
  if(c==='3'||c==='2'){const n=c==='3'?3:2,ps=[];for(let i=0;i<n;i++){const q=yield pt(`Ponto ${i+1} do círculo`,{base:ps[i-1],preview:q=>{if(n===2&&ps.length===1)return[G_({type:'circle',c:mid(ps[0],q),r:dist(ps[0],q)/2})];if(n===3&&ps.length===2){const k=circ3(ps[0],ps[1],q);return k?[G_({type:'circle',c:k.c,r:k.r})]:[]}return[]}});if(!q)return;ps.push(q)}
    if(n===2){mk({type:'circle',c:mid(ps[0],ps[1]),r:dist(ps[0],ps[1])/2});return}const k=circ3(...ps);if(!k){logE('Pontos colineares');return}mk({type:'circle',c:k.c,r:k.r});return}
  let r=yield dst('Raio',{base:c,opts:['Diâmetro'],def:CMD._lastR||500,preview:q=>[G_({type:'circle',c,r:dist(c,q)})]});
  if(r==='D'){r=(yield dst('Diâmetro',{base:c,def:1000,preview:q=>[G_({type:'circle',c,r:dist(c,q)/2})]}))/2}
  if(!(r>0))return;CMD._lastR=r;mk({type:'circle',c,r})});
defCmd('ARC',{al:['A','ARCO'],desc:'Arco'},function*(){
  let a=yield pt('Ponto inicial',{opts:['Centro']});if(!a)return;
  if(a==='C'){const c=yield pt('Centro');if(!c)return;const s=yield pt('Ponto inicial',{base:c});if(!s)return;
    const e=yield pt('Ponto final (anti-horário)',{base:c,preview:q=>[G_({type:'arc',c,r:dist(c,s),a0:ang(c,s),a1:ang(c,q)})]});if(!e)return;mk({type:'arc',c,r:dist(c,s),a0:ang(c,s),a1:ang(c,e)});return}
  const b=yield pt('Segundo ponto',{base:a});if(!b)return;
  const mkA=(q)=>{const k=circ3(a,b,q);if(!k)return null;const ccw=crs(sub(b,a),sub(q,a))>0;return{type:'arc',c:k.c,r:k.r,a0:ccw?ang(k.c,a):ang(k.c,q),a1:ccw?ang(k.c,q):ang(k.c,a)}};
  const c=yield pt('Ponto final',{base:b,preview:q=>{const x=mkA(q);return x?[G_(x)]:[]}});if(!c)return;const x=mkA(c);if(x)mk(x)});
defCmd('ELLIPSE',{al:['EL','ELIPSE'],desc:'Elipse'},function*(){
  const c=yield pt('Centro');if(!c)return;const a=yield pt('Extremidade do eixo',{base:c,preview:q=>[G_({type:'ellipse',c,rx:dist(c,q),ry:dist(c,q)/2,rot:ang(c,q)})]});if(!a)return;
  const ry=yield dst('Distância do outro semieixo',{base:c,preview:q=>[G_({type:'ellipse',c,rx:dist(c,a),ry:dist(c,q),rot:ang(c,a)})]});if(!(ry>0))return;mk({type:'ellipse',c,rx:dist(c,a),ry,rot:ang(c,a)})});
defCmd('POLYGON',{al:['POL','POLIGONO','POLÍGONO'],desc:'Polígono regular'},function*(){
  const n=Math.round(yield num('Número de lados',{def:CMD._polyN||6}));if(!(n>=3&&n<=1024)){logE('Use de 3 a 1024 lados');return}CMD._polyN=n;
  const c=yield pt('Centro');if(!c)return;const k=(yield kwq('Inscrito ou circunscrito',['Inscrito','Circunscrito'],{def:'I'}))||'I';
  const make=q=>{const r=dist(c,q),a=ang(c,q),R=k==='C'?r/Math.cos(Math.PI/n):r,a0=k==='C'?a+Math.PI/n:a;return{type:'pline',closed:true,pts:[...Array(n)].map((_,i)=>pol(c,R,a0+i*TAU/n))}};
  const q=yield pt('Raio (ponto)',{base:c,preview:q=>[G_(make(q))]});if(!q||typeof q!=='object')return;mk(make(q))});
defCmd('POINT',{al:['PO','PONTO'],desc:'Ponto'},function*(){for(;;){const p=yield pt('Ponto');if(!p)return;mk({type:'point',p})}});
defCmd('SPLINE',{al:['SPL'],desc:'Spline por pontos'},function*(){
  const p0=yield pt('Primeiro ponto');if(!p0)return;const pts=[p0];
  for(;;){const p=yield pt('Próximo ponto (Enter conclui)',{base:pts[pts.length-1],opts:pts.length>=3?['Fechar']:[],preview:q=>[G_({type:'spline',pts:[...pts,q]})]});
    if(p==null){if(pts.length>1)mk({type:'spline',pts});return}if(p==='F'){mk({type:'spline',pts,closed:true});return}pts.push(p)}});
defCmd('XLINE',{al:['XL','LINHACONSTRUCAO'],desc:'Linha de construção infinita'},function*(){
  const p=yield pt('Ponto',{opts:['Horizontal','Vertical']});if(!p)return;
  if(p==='H'||p==='V'){for(;;){const q=yield pt('Ponto de passagem',{preview:q=>[G_({type:'xline',p:q,d:p==='H'?P(1,0):P(0,1)})]});if(!q)return;mk({type:'xline',p:q,d:p==='H'?P(1,0):P(0,1)})}}
  for(;;){const q=yield pt('Ponto de passagem',{base:p,preview:q=>dist(p,q)>1e-6?[G_({type:'xline',p,d:nrm(sub(q,p))})]:[]});if(!q)return;if(dist(p,q)>1e-6)mk({type:'xline',p,d:nrm(sub(q,p))})}});
defCmd('RAY',{al:['RAIO'],desc:'Semirreta'},function*(){const p=yield pt('Ponto inicial');if(!p)return;for(;;){const q=yield pt('Ponto de passagem',{base:p,preview:q=>dist(p,q)>1e-6?[G_({type:'xline',ray:true,p,d:nrm(sub(q,p))})]:[]});if(!q)return;mk({type:'xline',ray:true,p,d:nrm(sub(q,p))})}});
const JUST={L:['l','b'],C:['c','b'],R:['r','b'],ML:['l','m'],MC:['c','m'],MR:['r','m'],TL:['l','t'],TC:['c','t'],TR:['r','t'],BL:['l','b'],BC:['c','b'],BR:['r','b'],M:['c','m']};
function* textCmd(multi){
  let al='l',vb='b';let p=yield pt('Ponto inicial do texto',{opts:['Justificar']});if(!p)return;
  if(p==='J'){const j=String((yield txtq('Justificação [L/C/R/ML/MC/MR/TL/TC/TR]',{def:'MC'}))||'MC').toUpperCase().trim();[al,vb]=JUST[j]||['c','m'];p=yield pt('Ponto de inserção');if(!p)return}
  const h=yield dst('Altura',{base:p,def:doc.textH});if(!(h>0))return;doc.textH=h;
  const r=yield angq('Ângulo de rotação',{base:p,def:0});
  const s=yield txtq(multi?'Texto (use | para quebrar linha)':'Texto');if(!s)return;
  mk({type:'text',p,h,rot:(r||0)*D2R,s:multi?s.replace(/\|/g,'\n'):s,al,vb})}
defCmd('TEXT',{al:['DT','DTEXT','TEXTO'],desc:'Texto de linha única'},function*(){yield* textCmd(false)});
defCmd('MTEXT',{al:['MT','T'],desc:'Texto multilinha'},function*(){yield* textCmd(true)});
defCmd('TEXTEDIT',{al:['ED','DDEDIT'],desc:'Editar texto'},function*(){
  for(;;){const r=yield pickq('Selecione texto ou cota',{filter:e=>e.type==='text'||e.type==='dim'||e.type==='leader'});if(!r)return;const e=r.e;
    const cur=e.type==='dim'?(e.txt||'<>'):e.type==='leader'?e.s:e.s.replace(/\n/g,'|');const s=yield txtq('Novo texto'+(e.type==='dim'?' (<> = medida)':''),{def:cur});if(s==null)continue;
    if(e.type==='dim')e.txt=s==='<>'?'':s;else if(e.type==='leader')e.s=s;else e.s=s.replace(/\|/g,'\n');dirty()}});
defCmd('WALL',{al:['W','PAREDE'],desc:'Parede com espessura (gera 3D)'},function*(){
  const W=doc.wall;let p0;
  for(;;){p0=yield pt(`Início da parede (e=${W.t}, iso=${W.ins}, h=${W.h})`,{opts:['Espessura','Isolamento','Altura']});
    if(p0==='E'){const v=yield dst('Espessura do núcleo',{def:W.t});if(v>0)W.t=v;continue}
    if(p0==='I'){const v=yield num('Isolamento externo (lado esquerdo do traçado)',{def:W.ins});if(v>=0)W.ins=v;continue}
    if(p0==='A'){const v=yield num('Altura',{def:W.h});if(v>0)W.h=v;continue}break}
  if(!p0)return;const first=p0,made=[];
  for(;;){const p=yield pt('Próximo ponto',{base:p0,opts:made.length>=2?['Fechar','Desfazer']:['Desfazer'],preview:q=>[G_({type:'wall',a:p0,b:q,t:W.t,ins:W.ins,h:W.h})]});
    if(p==null)return;if(p==='F'){made.push(mk({type:'wall',a:p0,b:first,t:W.t,ins:W.ins,h:W.h}));return}
    if(p==='D'){const e=made.pop();if(e){delEnt(e);p0=e.a}continue}if(dist(p,p0)<1)continue;
    made.push(mk({type:'wall',a:p0,b:p,t:W.t,ins:W.ins,h:W.h}));p0=p}});
defCmd('HATCH',{al:['H','BH','HACHURA'],desc:'Hachura por ponto interno ou objeto'},function*(){
  const H=doc.hatch;
  for(;;){const r=yield pt(`Ponto interno (padrão ${H.pat}, escala ${H.sc}, ângulo ${H.ang}°)`,{opts:['Padrão','Escala','Ângulo','Selecionar objeto']});
    if(r==null)return;
    if(r==='P'){const v=String((yield txtq('Padrão ['+Object.keys(PATTERNS).join('/')+']',{def:H.pat}))||'').toUpperCase().trim();if(PATTERNS[v])H.pat=v;else logE('Padrão inexistente');continue}
    if(r==='E'){const v=yield num('Escala',{def:H.sc});if(v>0)H.sc=v;continue}
    if(r==='Â'||r==='A'){const v=yield num('Ângulo',{def:H.ang});if(isFinite(v))H.ang=v;continue}
    if(r==='S'){for(;;){const k=yield pickq('Objeto fechado (polilinha, círculo, elipse, spline)',{filter:e=>(e.type==='pline'||e.type==='spline')&&e.closed||e.type==='circle'||e.type==='ellipse'});if(!k)break;
        const loop=k.e.type==='circle'?arcPts(k.e.c,k.e.r,0,TAU,5).slice(0,-1):k.e.type==='ellipse'?ellPts(k.e,72).slice(0,-1):k.e.type==='spline'?splinePts(k.e.pts,true,10):k.e.pts.slice();
        mk({type:'hatch',loops:[loop],pat:H.pat,sc:H.sc,ang:H.ang});logR('Área: '+fmtA(Math.abs(polyArea(loop))))}continue}
    const reg=findRegion(r);if(!reg){logE('Contorno fechado não encontrado em volta do ponto');continue}
    mk({type:'hatch',loops:[reg],pat:H.pat,sc:H.sc,ang:H.ang});logR('Área hachurada: '+fmtA(Math.abs(polyArea(reg))))}});

/* ============ região fechada (detecção de contorno) ============ */
let _regionCache=null;
function boundarySegs(){const segs=[];
  for(const e of doc.ents){if(!visible(e))continue;
    if(['dim','text','hatch','insert','point','leader'].includes(e.type))continue;
    if(ltOf(e)==='CENTER'||/GRID|EIXO|AXIS/i.test(e.layer))continue;
    if(e.type==='wall'){wallFaces(e).forEach(s=>segs.push(s));continue}
    if(e.type==='xline'){const q=primsC(e)[0];segs.push(q);continue}
    for(const q of primsC(e)){if(q.t==='s')segs.push(q);else{const pts=q.t==='c'?arcPts(q.c,q.r,0,TAU,6):arcPts(q.c,q.r,q.a0,q.a1,6);for(let i=0;i<pts.length-1;i++)segs.push(S(pts[i],pts[i+1]))}}}
  return segs}
function buildFaces(){
  const segs=boundarySegs().filter(s=>dist(s.a,s.b)>0.01);if(segs.length>6000)return[];
  const cuts=segs.map(s=>[0,1]);const bb=segs.map(s=>bboxPts([s.a,s.b]));
  for(let i=0;i<segs.length;i++)for(let j=i+1;j<segs.length;j++){const A=bb[i],B=bb[j];if(A.x1<B.x0-0.01||B.x1<A.x0-0.01||A.y1<B.y0-0.01||B.y1<A.y0-0.01)continue;
    const r=llInt(segs[i].a,segs[i].b,segs[j].a,segs[j].b);if(r){if(r.t>-1e-7&&r.t<1+1e-7&&r.u>-1e-7&&r.u<1+1e-7){cuts[i].push(r.t);cuts[j].push(r.u)}}
    else{ // colineares sobrepostos
      const d=sub(segs[i].b,segs[i].a),L=dot(d,d);if(Math.abs(crs(d,sub(segs[j].a,segs[i].a)))/Math.sqrt(L)>0.01)continue;
      for(const p of[segs[j].a,segs[j].b]){const t=dot(sub(p,segs[i].a),d)/L;if(t>0&&t<1)cuts[i].push(t)}
      const d2=sub(segs[j].b,segs[j].a),L2=dot(d2,d2);for(const p of[segs[i].a,segs[i].b]){const t=dot(sub(p,segs[j].a),d2)/L2;if(t>0&&t<1)cuts[j].push(t)}}}
  const key=p=>Math.round(p.x*10)+','+Math.round(p.y*10);const V_=new Map(),E=new Set();
  const vid=p=>{const k=key(p);if(!V_.has(k))V_.set(k,{p,k,adj:[]});return V_.get(k)};
  segs.forEach((s,i)=>{const ts=[...new Set(cuts[i].map(t=>Math.max(0,Math.min(1,t))))].sort((a,b)=>a-b);for(let k=0;k<ts.length-1;k++){if(ts[k+1]-ts[k]<1e-9)continue;const a=vid(lerp(s.a,s.b,ts[k])),b=vid(lerp(s.a,s.b,ts[k+1]));if(a===b)continue;const ek=a.k<b.k?a.k+'|'+b.k:b.k+'|'+a.k;if(E.has(ek))continue;E.add(ek);a.adj.push(b);b.adj.push(a)}});
  // poda de pontas soltas
  let changed=true;while(changed){changed=false;for(const v of V_.values()){if(v.adj.length===1){const o=v.adj[0];o.adj=o.adj.filter(x=>x!==v);v.adj=[];changed=true}}}
  for(const v of V_.values())v.adj.sort((a,b)=>Math.atan2(a.p.y-v.p.y,a.p.x-v.p.x)-Math.atan2(b.p.y-v.p.y,b.p.x-v.p.x));
  const used=new Set(),faces=[];
  for(const v of V_.values())for(const w of v.adj){const hk=v.k+'>'+w.k;if(used.has(hk))continue;const poly=[];let a=v,b=w,guard=0;
    while(guard++<20000){used.add(a.k+'>'+b.k);poly.push(a.p);const L=b.adj,i=L.indexOf(a);const nx=L[(i-1+L.length)%L.length];a=b;b=nx;if(a===v&&b===w)break}
    if(poly.length>=3){const ar=polyArea(poly);if(ar>1)faces.push({poly,ar,bb:bboxPts(poly)})}}
  return faces}
function findRegion(p){if(!_regionCache)_regionCache=buildFaces();let best=null;for(const f of _regionCache){const b=f.bb;if(p.x<b.x0||p.x>b.x1||p.y<b.y0||p.y>b.y1)continue;if(inPoly(p,f.poly)&&(!best||f.ar<best.ar))best=f}
  return best?simplifyPoly(best.poly):null}
function simplifyPoly(pts){const o=[];for(let i=0;i<pts.length;i++){const a=pts[(i-1+pts.length)%pts.length],b=pts[i],c=pts[(i+1)%pts.length];if(Math.abs(crs(sub(b,a),sub(c,b)))>1e-6*dist(a,b)*dist(b,c)+1e-9)o.push(b)}return o.length>=3?o:pts}
/* ============ comandos de modificação ============ */
const ghostOf=(ents,M)=>ents.slice(0,300).map(e=>xformEnt(clone(e),M));
function* getSel(prompt){const s=yield selq(prompt);return(s||[]).filter(e=>e&&editable(e))}
defCmd('ERASE',{al:['E','APAGAR'],desc:'Apagar'},function*(){const s=yield* getSel('Selecione objetos a apagar');s.forEach(delEnt);logR(s.length+' apagado(s)')});
defCmd('MOVE',{al:['M','MOVER'],desc:'Mover'},function*(){const s=yield* getSel();if(!s.length)return;
  const b=yield pt('Ponto base',{opts:['Deslocamento']});if(!b)return;if(b==='D'){const d=yield pt('Deslocamento (x,y)',{def:P(0,0)});if(!d)return;s.forEach(e=>xformEnt(e,Mtr(d.x,d.y)));dirty();return}
  const c=yield pt('Segundo ponto',{base:b,preview:q=>ghostOf(s,Mtr(q.x-b.x,q.y-b.y))});if(!c)return;s.forEach(e=>xformEnt(e,Mtr(c.x-b.x,c.y-b.y)));dirty()});
defCmd('COPY',{al:['CO','CP','COPIAR'],desc:'Copiar'},function*(){const s=yield* getSel();if(!s.length)return;
  const b=yield pt('Ponto base');if(!b)return;
  for(;;){const c=yield pt('Segundo ponto (Enter encerra)',{base:b,opts:['Matriz'],preview:q=>ghostOf(s,Mtr(q.x-b.x,q.y-b.y))});if(!c)return;
    if(c==='M'){const n=Math.round(yield num('Número de itens',{def:3}));const q=yield pt('Segundo ponto',{base:b,preview:q=>{let o=[];for(let i=1;i<n;i++)o=o.concat(ghostOf(s,Mtr((q.x-b.x)*i,(q.y-b.y)*i)));return o}});if(!q)return;for(let i=1;i<n;i++)s.forEach(e=>addEnt(xformEnt(clone(e),Mtr((q.x-b.x)*i,(q.y-b.y)*i))));return}
    s.forEach(e=>addEnt(xformEnt(clone(e),Mtr(c.x-b.x,c.y-b.y))))}});
defCmd('ROTATE',{al:['RO','ROTACIONAR','GIRAR'],desc:'Rotacionar'},function*(){const s=yield* getSel();if(!s.length)return;
  const b=yield pt('Ponto base');if(!b)return;let copy=false,a;
  for(;;){a=yield angq('Ângulo de rotação',{base:b,opts:['Copiar','Referência'],def:CMD._lastRot||0,preview:q=>ghostOf(s,Mrot(ang(b,q),b))});
    if(a==='C'){copy=true;log('Rotacionando uma cópia');continue}
    if(a==='R'){const r0=yield angq('Ângulo de referência',{base:b,def:0});const r1=yield angq('Novo ângulo',{base:b,preview:q=>ghostOf(s,Mrot(ang(b,q)-r0*D2R,b))});a=r1-r0}break}
  if(a==null)return;CMD._lastRot=a;const M=Mrot(a*D2R,b);s.forEach(e=>copy?addEnt(xformEnt(clone(e),M)):xformEnt(e,M));dirty()});
defCmd('SCALE',{al:['SC','ESCALA'],desc:'Escalar'},function*(){const s=yield* getSel();if(!s.length)return;
  const b=yield pt('Ponto base');if(!b)return;let copy=false,f;
  for(;;){f=yield dst('Fator de escala (clique: 1 m = 1×)',{base:b,div:1000,opts:['Copiar','Referência'],def:1,preview:q=>{const k=dist(b,q)/1000;return k>1e-6?ghostOf(s,Msc(k,b)):[]}});
    if(f==='C'){copy=true;continue}if(f==='R'){const r=yield dst('Comprimento de referência',{base:b,def:1000});const n=yield dst('Novo comprimento',{base:b,def:r});f=n/r}break}
  if(typeof f==='number'&&!isFinite(f))return;
  if(!(f>0))return;
  const pv=CMD.req;if(f!==undefined&&typeof f==='number'&&f>0){} // fator digitado ou distância
  const k=f;const M=Msc(k,b);s.forEach(e=>copy?addEnt(xformEnt(clone(e),M)):xformEnt(e,M));dirty()});
defCmd('MIRROR',{al:['MI','ESPELHAR'],desc:'Espelhar'},function*(){const s=yield* getSel();if(!s.length)return;
  const a=yield pt('Primeiro ponto do eixo');if(!a)return;const b=yield pt('Segundo ponto do eixo',{base:a,preview:q=>dist(a,q)>1e-6?ghostOf(s,Mmir(a,q)):[]});if(!b)return;
  const k=yield kwq('Apagar os objetos de origem?',['Sim','Não'],{def:'N'});const M=Mmir(a,b);s.forEach(e=>k==='S'?xformEnt(e,M):addEnt(xformEnt(clone(e),M)));dirty()});
function offsetEnt(e,d,side){
  if(e.type==='line'){const n=perp(nrm(sub(e.b,e.a))),sg=Math.sign(dot(sub(side,e.a),n))||1,v=mul(n,d*sg);return{...clone(e),id:undefined,a:add(e.a,v),b:add(e.b,v)}}
  if(e.type==='circle'||e.type==='arc'){const out=dist(side,e.c)>e.r,r=e.r+(out?d:-d);if(r<=0)return null;return{...clone(e),id:undefined,r}}
  if(e.type==='pline'){const segs=plSegs(e.pts,e.closed);let bi=0,bd=Infinity;segs.forEach((s,i)=>{const dd=dist(side,closestOnPrim(s,side));if(dd<bd){bd=dd;bi=i}});
    const s0=segs[bi],sg=Math.sign(crs(sub(s0.b,s0.a),sub(side,s0.a)))||1;
    const off=segs.map(s=>{const v=mul(perp(nrm(sub(s.b,s.a))),d*sg);return[add(s.a,v),add(s.b,v)]});const n=off.length,pts=[];
    for(let i=0;i<n;i++){if(!e.closed&&i===0){pts.push(off[0][0])}
      const nx=e.closed?(i+1)%n:i+1;if(nx<n&&(e.closed||i<n-1)){const r=llInt(off[i][0],off[i][1],off[nx][0],off[nx][1]);pts.push(r?r.p:off[i][1])}else pts.push(off[i][1])}
    if(e.closed){const last=pts.pop();pts.unshift(last)}return{...clone(e),id:undefined,pts}}
  if(e.type==='ellipse'){const out=!inPoly(side,ellPts(e,48));return{...clone(e),id:undefined,rx:e.rx+(out?d:-d),ry:e.ry+(out?d:-d)}}
  return null}
defCmd('OFFSET',{al:['O','DESLOCAR','EQUIDISTANTE'],desc:'Equidistante (offset)'},function*(){
  let d=yield dst('Distância',{opts:['Através'],def:doc.offD});let through=false;if(d==='A'){through=true}else{if(!(d>0))return;doc.offD=d}
  for(;;){const r=yield pickq('Objeto para deslocar (Enter encerra)',{filter:e=>['line','circle','arc','pline','ellipse'].includes(e.type)});if(!r)return;
    const sp=yield pt(through?'Ponto de passagem':'Lado para deslocar',{preview:q=>{const dd=through?entDist(r.e,q):d;const o=offsetEnt(r.e,dd,q);return o?[o]:[]}});if(!sp)return;
    const o=offsetEnt(r.e,through?entDist(r.e,sp):d,sp);if(o){delete o.id;addEnt(o)}}});
/* aparar / estender */
function cutsOn(target,edges){const out=[];const tp=primsC(target);const pool=edges||doc.ents.filter(visible);
  for(const e of pool){if(e===target||e.type==='hatch'||e.type==='text')continue;const ps=e.type==='dim'?[]:primsC(e);for(const q of ps)for(const a of tp)for(const p of primInt(a,q))out.push(p)}return out}
function plParam(pts,closed,p){const segs=plSegs(pts,closed);let best=0,bd=Infinity;segs.forEach((s,i)=>{const d=sub(s.b,s.a),L=dot(d,d),t=L?Math.max(0,Math.min(1,dot(sub(p,s.a),d)/L)):0,q=add(s.a,mul(d,t)),dd=dist(q,p);if(dd<bd){bd=dd;best=i+t}});return best}
function plAt(pts,closed,s){const segs=plSegs(pts,closed);const i=Math.min(segs.length-1,Math.floor(s));return lerp(segs[i].a,segs[i].b,s-i)}
function plSub(pts,closed,s0,s1){const n=plSegs(pts,closed).length,o=[plAt(pts,closed,s0)];let i=Math.floor(s0)+1;const all=closed?[...pts,pts[0]]:pts;
  if(s1>=s0){for(;i<=s1;i++)if(i<s1)o.push(all[i]);o.push(plAt(pts,closed,s1))}else{for(;i<=n;i++)o.push(all[i%pts.length]);for(i=1;i<=s1;i++)if(i<s1)o.push(all[i]);o.push(plAt(pts,closed,s1))}
  return o.filter((p,k)=>k===0||dist(p,o[k-1])>1e-6)}
function trimAt(e,p,edges){const X=cutsOn(e,edges);
  if(e.type==='line'||e.type==='xline'&&false){const d=sub(e.b,e.a),L=dot(d,d),tp=dot(sub(p,e.a),d)/L;const ts=X.map(q=>dot(sub(q,e.a),d)/L).filter(t=>t>1e-7&&t<1-1e-7);
    const lo=Math.max(-Infinity,...ts.filter(t=>t<tp)),hi=Math.min(Infinity,...ts.filter(t=>t>tp));
    if(!isFinite(lo)&&!isFinite(hi)){delEnt(e);return}const a=e.a,b=e.b;
    if(isFinite(lo)&&isFinite(hi)){e.b=lerp(a,b,lo);addEnt({...clone(e),id:undefined,a:lerp(a,b,hi),b})}else if(isFinite(lo))e.b=lerp(a,b,lo);else e.a=lerp(a,b,hi);dirty();return}
  if(e.type==='arc'||e.type==='circle'){const tp=Math.atan2(p.y-e.c.y,p.x-e.c.x);
    if(e.type==='circle'){const as=[...new Set(X.map(q=>normA(Math.atan2(q.y-e.c.y,q.x-e.c.x))))].sort((a,b)=>a-b);if(as.length<2){delEnt(e);return}
      const rel=as.map(a=>normA(a-tp));const lo=as[rel.indexOf(Math.max(...rel))],hi=as[rel.indexOf(Math.min(...rel))];
      e.type='arc';e.a0=hi;e.a1=lo;delete e.r0;dirty();return}
    const sw=normA(e.a1-e.a0),tpr=normA(tp-e.a0);const ts=X.map(q=>normA(Math.atan2(q.y-e.c.y,q.x-e.c.x)-e.a0)).filter(t=>t>1e-7&&t<sw-1e-7);
    const lo=Math.max(-Infinity,...ts.filter(t=>t<tpr)),hi=Math.min(Infinity,...ts.filter(t=>t>tpr));if(!isFinite(lo)&&!isFinite(hi)){delEnt(e);return}const a0=e.a0,a1=e.a1;
    if(isFinite(lo)&&isFinite(hi)){e.a1=a0+lo;addEnt({...clone(e),id:undefined,a0:a0+hi,a1})}else if(isFinite(lo))e.a1=a0+lo;else e.a0=a0+hi;dirty();return}
  if(e.type==='pline'){const n=plSegs(e.pts,e.closed).length,tp=plParam(e.pts,e.closed,p);const ts=X.map(q=>plParam(e.pts,e.closed,q)).filter(t=>t>1e-7&&t<n-1e-7&&Math.abs(t-tp)>1e-9);
    let lo=Math.max(-Infinity,...ts.filter(t=>t<tp)),hi=Math.min(Infinity,...ts.filter(t=>t>tp));
    if(e.closed){if(!ts.length){delEnt(e);return}if(!isFinite(lo))lo=Math.max(...ts);if(!isFinite(hi))hi=Math.min(...ts);const pts=plSub(e.pts,true,hi,lo);e.pts=pts;e.closed=false;dirty();return}
    if(!isFinite(lo)&&!isFinite(hi)){delEnt(e);return}const orig=e.pts.slice();
    if(isFinite(lo)&&isFinite(hi)){e.pts=plSub(orig,false,0,lo);addEnt({...clone(e),id:undefined,pts:plSub(orig,false,hi,n)})}else if(isFinite(lo))e.pts=plSub(orig,false,0,lo);else e.pts=plSub(orig,false,hi,n);dirty();return}}
defCmd('TRIM',{al:['TR','APARAR'],desc:'Aparar'},function*(){
  const ed=yield selq('Arestas de corte (Enter = todos os objetos)',{noPre:true});const edges=ed&&ed.length?ed:null;
  for(;;){const r=yield pickq('Objeto a aparar (Enter encerra)',{filter:e=>['line','arc','circle','pline'].includes(e.type)});if(!r)return;trimAt(r.e,r.p,edges)}});
function extendEnt(e,p,bounds){const pool=bounds||doc.ents.filter(visible);
  let A,B,setEnd;if(e.type==='line'){const nearB=dist(p,e.b)<dist(p,e.a);A=nearB?e.a:e.b;B=nearB?e.b:e.a;setEnd=q=>{if(nearB)e.b=q;else e.a=q}}
  else if(e.type==='pline'&&!e.closed){const n=e.pts.length,nearEnd=dist(p,e.pts[n-1])<dist(p,e.pts[0]);A=nearEnd?e.pts[n-2]:e.pts[1];B=nearEnd?e.pts[n-1]:e.pts[0];setEnd=q=>{if(nearEnd)e.pts[n-1]=q;else e.pts[0]=q}}
  else return false;
  let best=Infinity;for(const o of pool){if(o===e||o.type==='hatch'||o.type==='text'||o.type==='dim')continue;for(const q of primsC(o)){
    if(q.t==='s'){const r=llInt(A,B,q.a,q.b);if(r&&r.t>1+1e-7&&r.u>=-1e-7&&r.u<=1+1e-7&&r.t<best)best=r.t}
    else for(const h of lcInt(A,B,q.c,q.r))if(h.t>1+1e-7&&onPrim(q,h.p)&&h.t<best)best=h.t}}
  if(!isFinite(best))return false;setEnd(lerp(A,B,best));dirty();return true}
defCmd('EXTEND',{al:['EX','ESTENDER'],desc:'Estender'},function*(){
  const bd=yield selq('Arestas limite (Enter = todos os objetos)',{noPre:true});const bounds=bd&&bd.length?bd:null;
  for(;;){const r=yield pickq('Objeto a estender (clique perto da ponta)',{filter:e=>e.type==='line'||e.type==='pline'&&!e.closed});if(!r)return;if(!extendEnt(r.e,r.p,bounds))logE('Nenhum limite à frente')}});
function cornerFix(L1,q1,L2,q2){const X=llInt(L1.a,L1.b,L2.a,L2.b);if(!X)return null;const x=X.p;
  const keep=(L,q)=>{const u=nrm(sub(L.b,L.a)),sq=Math.sign(dot(sub(q,x),u))||1;const da=dot(sub(L.a,x),u)*sq,db=dot(sub(L.b,x),u)*sq;return da>=db?L.a:L.b};
  const K1=keep(L1,q1),K2=keep(L2,q2);return{x,K1,K2,d1:nrm(sub(K1,x)),d2:nrm(sub(K2,x))}}
defCmd('FILLET',{al:['F','CONCORDAR','FILETE'],desc:'Concordância'},function*(){
  for(;;){const r1=yield pickq(`Primeira linha (raio ${doc.filletR})`,{opts:['Raio'],filter:e=>e.type==='line'});if(r1==null)return;
    if(r1==='R'){const v=yield dst('Raio',{def:doc.filletR});if(v>=0)doc.filletR=v;continue}
    const r2=yield pickq('Segunda linha',{filter:e=>e.type==='line'&&e!==r1.e});if(!r2)return;
    const c=cornerFix(r1.e,r1.p,r2.e,r2.p);if(!c){logE('Linhas paralelas');continue}const r=doc.filletR;
    if(r<=0){if(dist(r1.e.a,c.K1)<1e-9){r1.e.b=c.x}else r1.e.a=c.x;if(dist(r2.e.a,c.K2)<1e-9)r2.e.b=c.x;else r2.e.a=c.x;r1.e.a=c.K1;r1.e.b=c.x;r2.e.a=c.K2;r2.e.b=c.x;dirty();return}
    const phi=Math.acos(Math.max(-1,Math.min(1,dot(c.d1,c.d2))))/2;if(phi<1e-6){logE('Ângulo inválido');continue}
    const td=r/Math.tan(phi),T1=add(c.x,mul(c.d1,td)),T2=add(c.x,mul(c.d2,td)),C=add(c.x,mul(nrm(add(c.d1,c.d2)),r/Math.sin(phi)));
    r1.e.a=c.K1;r1.e.b=T1;r2.e.a=c.K2;r2.e.b=T2;const cc=crs(sub(T1,C),sub(T2,C))>0;
    addEnt({type:'arc',c:C,r,a0:cc?ang(C,T1):ang(C,T2),a1:cc?ang(C,T2):ang(C,T1),layer:r1.e.layer,color:r1.e.color,lt:r1.e.lt,lw:r1.e.lw});dirty();return}});
defCmd('CHAMFER',{al:['CHA','CHANFRO'],desc:'Chanfro'},function*(){
  for(;;){const r1=yield pickq(`Primeira linha (d1=${doc.chamA}, d2=${doc.chamB})`,{opts:['Distâncias'],filter:e=>e.type==='line'});if(r1==null)return;
    if(r1==='D'){doc.chamA=yield dst('Primeira distância',{def:doc.chamA});doc.chamB=yield dst('Segunda distância',{def:doc.chamA});continue}
    const r2=yield pickq('Segunda linha',{filter:e=>e.type==='line'&&e!==r1.e});if(!r2)return;const c=cornerFix(r1.e,r1.p,r2.e,r2.p);if(!c){logE('Linhas paralelas');continue}
    const T1=add(c.x,mul(c.d1,doc.chamA)),T2=add(c.x,mul(c.d2,doc.chamB));r1.e.a=c.K1;r1.e.b=T1;r2.e.a=c.K2;r2.e.b=T2;
    if(doc.chamA+doc.chamB>0)addEnt({type:'line',a:T1,b:T2,layer:r1.e.layer,color:r1.e.color,lt:r1.e.lt,lw:r1.e.lw});dirty();return}});
defCmd('ARRAY',{al:['AR','MATRIZ','ARRAYRECT','ARRAYPOLAR'],desc:'Matriz retangular ou polar'},function*(){const s=yield* getSel();if(!s.length)return;
  const k=yield kwq('Tipo de matriz',['Retangular','Polar'],{def:'R'});
  if(k==='P'){const c=yield pt('Centro da matriz');if(!c)return;const n=Math.round(yield num('Número de itens',{def:6}));const fa=yield num('Ângulo a preencher (+ anti-horário)',{def:360});
    const st=Math.abs(fa)>=360?fa/n:fa/(n-1);for(let i=1;i<n;i++){const M=Mrot(st*i*D2R,c);s.forEach(e=>addEnt(xformEnt(clone(e),M)))}dirty();return}
  const rows=Math.round(yield num('Linhas',{def:3})),cols=Math.round(yield num('Colunas',{def:3}));const dy=rows>1?yield num('Distância entre linhas',{def:1000}):0,dx=cols>1?yield num('Distância entre colunas',{def:1000}):0;
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){if(!i&&!j)continue;s.forEach(e=>addEnt(xformEnt(clone(e),Mtr(j*dx,i*dy))))}dirty()});
defCmd('STRETCH',{al:['S','ESTICAR'],desc:'Esticar (janela cruzada)'},function*(){
  const a=yield pt('Janela cruzada: primeiro canto');if(!a)return;const b=yield pt('Canto oposto',{preview:q=>[G_({type:'pline',pts:[a,P(q.x,a.y),q,P(a.x,q.y)],closed:true,lt:'DASHED'})]});if(!b)return;
  const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y),inB=p=>p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1;
  const ents=boxSelect(P(x1,y1),P(x0,y0),true);if(!ents.length){logE('Nada na janela');return}
  logR(ents.length+' objeto(s)');const bp=yield pt('Ponto base');if(!bp)return;
  const apply=(list,d)=>list.map(e=>{const o=list===ents?e:e;const mv=p=>inB(p)?add(p,d):p;
    switch(o.type){case 'line':case 'wall':o.a=mv(o.a);o.b=mv(o.b);break;case 'pline':case 'spline':case 'leader':o.pts=o.pts.map(mv);break;
      case 'hatch':o.loops=o.loops.map(l=>l.map(mv));break;case 'dim':['p1','p2','pos','v','c'].forEach(k=>{if(o[k])o[k]=mv(o[k])});break;
      default:{const g=gripsOf(o)[0];if(g&&inB(g))xformEnt(o,Mtr(d.x,d.y))}}return o});
  const sp=yield pt('Segundo ponto',{base:bp,preview:q=>apply(ents.slice(0,200).map(clone),sub(q,bp))});if(!sp)return;apply(ents,sub(sp,bp));dirty()});
function explodeEnt(e){
  const base={layer:e.layer,color:e.color,lt:e.lt,lw:e.lw};
  if(e.type==='pline')return plSegs(e.pts,e.closed).map(s=>({type:'line',a:s.a,b:s.b,...base}));
  if(e.type==='insert')return childEnts(e).map(c=>{const o=clone(c);if(typeof o.color==='string'&&o.color.startsWith('L:'))o.color='BL';delete o.id;return o});
  if(e.type==='dim'||e.type==='leader'){const G=e.type==='dim'?dimGeom(e):leaderGeom(e);return[...G.L.map(([a,b])=>({type:'line',a,b,...base})),...(G.K||[]).map(([a,b])=>({type:'line',a,b,...base})),...(G.AR||[]).map(a=>({type:'arc',...a,...base})),...G.T.map(t=>({type:'text',...t,...base}))]}
  if(e.type==='wall'){const g=wallPolys(e);return[...g.core,...g.ins].map(p=>({type:'pline',pts:p,closed:true,...base}))}
  if(e.type==='hatch')return e.loops.map(l=>({type:'pline',pts:l,closed:true,...base}));
  if(e.type==='spline')return[{type:'pline',pts:splinePts(e.pts,e.closed,10),closed:false,...base}];
  return null}
defCmd('EXPLODE',{al:['X','EXPLODIR'],desc:'Explodir'},function*(){const s=yield* getSel();let n=0;for(const e of s){const parts=explodeEnt(e);if(!parts)continue;delEnt(e);parts.forEach(p=>{addEnt(p);n++})}logR(n+' objeto(s) resultante(s)')});
defCmd('JOIN',{al:['J','UNIR'],desc:'Unir em polilinha'},function*(){const s=(yield* getSel()).filter(e=>e.type==='line'||e.type==='pline'&&!e.closed);if(s.length<2){logE('Selecione 2 ou mais linhas/polilinhas abertas');return}
  let chains=s.map(e=>({pts:e.type==='line'?[e.a,e.b]:e.pts.slice(),src:e}));const tol=1;let merged=true;
  while(merged){merged=false;outer:for(let i=0;i<chains.length;i++)for(let j=0;j<chains.length;j++){if(i===j)continue;const A=chains[i].pts,B=chains[j].pts;
    let nw=null;if(dist(A[A.length-1],B[0])<tol)nw=A.concat(B.slice(1));else if(dist(A[A.length-1],B[B.length-1])<tol)nw=A.concat(B.slice(0,-1).reverse());else if(dist(A[0],B[B.length-1])<tol)nw=B.concat(A.slice(1));else if(dist(A[0],B[0])<tol)nw=B.slice().reverse().concat(A.slice(1));
    if(nw){chains[i]={pts:nw,src:chains[i].src};chains.splice(j,1);merged=true;break outer}}}
  const base=s[0];s.forEach(delEnt);for(const c of chains){let closed=false;if(c.pts.length>3&&dist(c.pts[0],c.pts[c.pts.length-1])<tol){c.pts.pop();closed=true}addEnt({type:'pline',pts:c.pts,closed,layer:base.layer,color:base.color,lt:base.lt,lw:base.lw})}logR(chains.length+' polilinha(s)')});
defCmd('BREAK',{al:['BR','QUEBRAR'],desc:'Quebrar'},function*(){
  const r=yield pickq('Objeto a quebrar',{filter:e=>['line','arc','circle','pline'].includes(e.type)});if(!r)return;const e=r.e;
  let p1=closestOnPrim(primsC(e).reduce((b,q)=>dist(r.p,closestOnPrim(q,r.p))<dist(r.p,closestOnPrim(b,r.p))?q:b),r.p);
  let p2=yield pt('Segundo ponto de quebra',{opts:['Primeiro ponto']});if(p2==='P'){p1=yield pt('Primeiro ponto');p2=yield pt('Segundo ponto',{base:p1})}if(!p2||!p1)return;
  if(e.type==='line'){const d=sub(e.b,e.a),L=dot(d,d);let t1=dot(sub(p1,e.a),d)/L,t2=dot(sub(p2,e.a),d)/L;if(t1>t2)[t1,t2]=[t2,t1];const a=e.a,b=e.b;
    if(t1<=0&&t2>=1){delEnt(e);return}if(t1<=0){e.a=lerp(a,b,t2)}else if(t2>=1){e.b=lerp(a,b,t1)}else{e.b=lerp(a,b,t1);addEnt({...clone(e),id:undefined,a:lerp(a,b,t2),b})}dirty();return}
  if(e.type==='circle'){e.type='arc';e.a0=ang(e.c,p2);e.a1=ang(e.c,p1);if(dist(p1,p2)<1e-6)e.a1=e.a0+TAU-1e-4;dirty();return}
  if(e.type==='arc'){const sw=normA(e.a1-e.a0);let t1=normA(ang(e.c,p1)-e.a0),t2=normA(ang(e.c,p2)-e.a0);if(t1>t2)[t1,t2]=[t2,t1];const a0=e.a0,a1=e.a1;t2=Math.min(t2,sw);
    if(t1>1e-6){e.a1=a0+t1;if(t2<sw-1e-6)addEnt({...clone(e),id:undefined,a0:a0+t2,a1})}else e.a0=a0+t2;dirty();return}
  if(e.type==='pline'){const n=plSegs(e.pts,e.closed).length;let s1=plParam(e.pts,e.closed,p1),s2=plParam(e.pts,e.closed,p2);if(s1>s2)[s1,s2]=[s2,s1];const o=e.pts.slice();
    if(e.closed){e.pts=plSub(o,true,s2,s1);e.closed=false}else{e.pts=plSub(o,false,0,s1);if(s2<n-1e-6)addEnt({...clone(e),id:undefined,pts:plSub(o,false,s2,n)})}dirty()}});
defCmd('BREAKATPOINT',{al:['BRP'],desc:'Quebrar no ponto'},function*(){const r=yield pickq('Objeto');if(!r)return;const p=yield pt('Ponto de quebra');if(!p)return;
  const e=r.e;if(e.type==='line'){const b=e.b;const q=closestOnPrim(S(e.a,e.b),p);e.b=q;addEnt({...clone(e),id:undefined,a:q,b});dirty()}else logE('Disponível para linhas')});
defCmd('MATCHPROP',{al:['MA','PINCEL'],desc:'Copiar propriedades'},function*(){const r=yield pickq('Objeto de origem');if(!r)return;const src=r.e;
  for(;;){const t=yield pickq('Objeto de destino (Enter encerra)');if(!t)return;Object.assign(t.e,{layer:src.layer,color:src.color,lt:src.lt,lw:src.lw});if(src.th!=null)t.e.th=src.th;if(t.e.type==='hatch'&&src.type==='hatch')Object.assign(t.e,{pat:src.pat,sc:src.sc,ang:src.ang});if(t.e.type==='text'&&src.type==='text')t.e.h=src.h;dirty()}});
defCmd('GRIPEDIT',{al:[],desc:'Edição por grip',norepeat:true},function*(){const{e,i}=UI.gripReq;UI.grip={e,i};const g=gripsOf(e)[i];
  const q=yield pt('Ponto de destino do grip',{base:g,opts:['Copiar','Mover tudo'],preview:q=>{const c=clone(e);c.id=undefined;setGrip(c,i,q);return[c]}});
  if(q==='M'){const q2=yield pt('Destino',{base:g,preview:q=>ghostOf([e],Mtr(q.x-g.x,q.y-g.y))});if(q2)xformEnt(e,Mtr(q2.x-g.x,q2.y-g.y));dirty();return}
  if(q==='C'){const q2=yield pt('Destino da cópia',{base:g});if(q2){const c=clone(e);delete c.id;setGrip(c,i,q2);addEnt(c)}return}
  if(q)setGrip(e,i,q)});
/* ============ cotas e anotação ============ */
const DIMG=o=>Object.assign({type:'dim',layer:doc.clayer,color:'BL',lt:'BL',lw:-1},o);
function linRot(p1,p2,pos){const x0=Math.min(p1.x,p2.x),x1=Math.max(p1.x,p2.x),y0=Math.min(p1.y,p2.y),y1=Math.max(p1.y,p2.y);
  const inX=pos.x>x0&&pos.x<x1,inY=pos.y>y0&&pos.y<y1;if(inX&&!inY)return 0;if(inY&&!inX)return Math.PI/2;return Math.abs(p2.x-p1.x)>=Math.abs(p2.y-p1.y)?0:Math.PI/2}
function* dimLin(aligned){
  let p1=yield pt('Origem da 1ª linha de chamada (Enter = selecionar objeto)');let p2;
  if(!p1){const r=yield pickq('Selecione linha, arco ou círculo',{filter:e=>['line','pline','circle','arc','wall'].includes(e.type)});if(!r)return;const e=r.e;
    if(e.type==='circle'||e.type==='arc'){p1=pol(e.c,e.r,Math.PI);p2=pol(e.c,e.r,0)}else{const q=primsC(e).reduce((b,q)=>dist(r.p,closestOnPrim(q,r.p))<dist(r.p,closestOnPrim(b,r.p))?q:b);p1=q.a;p2=q.b}}
  else{p2=yield pt('Origem da 2ª linha de chamada',{base:p1});if(!p2)return}
  let mode=aligned?'A':null,txt='';
  for(;;){const pos=yield pt('Posição da linha de cota',{opts:aligned?['Texto']:['Texto','Horizontal','Vertical','Rotacionada'],preview:q=>[DIMG({kind:aligned?'ali':'lin',p1,p2,pos:q,rot:mode==='H'?0:mode==='V'?Math.PI/2:mode==='R'?CMD._dimRot:linRot(p1,p2,q),txt})]});
    if(pos==null)return;if(pos==='T'){txt=yield txtq('Texto da cota (<> = medida)',{def:'<>'});if(txt==='<>')txt='';continue}
    if(pos==='H'||pos==='V'){mode=pos;continue}if(pos==='R'){CMD._dimRot=(yield angq('Ângulo da linha de cota',{def:0}))*D2R;mode='R';continue}
    const e=mk({type:'dim',kind:aligned?'ali':'lin',p1,p2,pos,rot:mode==='H'?0:mode==='V'?Math.PI/2:mode==='R'?CMD._dimRot:linRot(p1,p2,pos),txt});doc.lastDim=e.id;logR('Cota = '+fmt(dimGeom(e).meas,doc.dim.dec));return}}
defCmd('DIMLINEAR',{al:['DLI','DIMLIN','COTA'],desc:'Cota linear'},function*(){yield* dimLin(false)});
defCmd('DIMALIGNED',{al:['DAL','DIMALI'],desc:'Cota alinhada'},function*(){yield* dimLin(true)});
function* dimRD(kind){const r=yield pickq('Selecione arco ou círculo',{filter:e=>e.type==='circle'||e.type==='arc'});if(!r)return;const e=r.e;
  const pos=yield pt('Posição',{preview:q=>[DIMG({kind,c:e.c,r:e.r,a:ang(e.c,q)})]});if(!pos)return;const d=mk({type:'dim',kind,c:e.c,r:e.r,a:ang(e.c,pos)});logR((kind==='dia'?'Diâmetro = ':'Raio = ')+fmt(dimGeom(d).meas,doc.dim.dec))}
defCmd('DIMRADIUS',{al:['DRA','DIMRAD'],desc:'Cota de raio'},function*(){yield* dimRD('rad')});
defCmd('DIMDIAMETER',{al:['DDI','DIMDIA'],desc:'Cota de diâmetro'},function*(){yield* dimRD('dia')});
defCmd('DIMANGULAR',{al:['DAN','DIMANG'],desc:'Cota angular'},function*(){
  const r1=yield pickq('Primeira linha (ou arco)',{filter:e=>e.type==='line'||e.type==='arc'});if(!r1)return;let v,p1,p2;
  if(r1.e.type==='arc'){v=r1.e.c;p1=pol(v,r1.e.r,r1.e.a0);p2=pol(v,r1.e.r,r1.e.a1)}
  else{const r2=yield pickq('Segunda linha',{filter:e=>e.type==='line'&&e!==r1.e});if(!r2)return;const X=llInt(r1.e.a,r1.e.b,r2.e.a,r2.e.b);if(!X){logE('Linhas paralelas');return}v=X.p;
    const far=(L,q)=>{const u=sub(q,v);return dot(sub(L.a,v),u)>dot(sub(L.b,v),u)?L.a:L.b};p1=far(r1.e,r1.p);p2=far(r2.e,r2.p);if(dist(p1,v)<1e-6||dist(p2,v)<1e-6){p1=r1.p;p2=r2.p}}
  const pos=yield pt('Posição do arco de cota',{preview:q=>[DIMG({kind:'ang',v,p1,p2,pos:q})]});if(!pos)return;const d=mk({type:'dim',kind:'ang',v,p1,p2,pos});logR('Ângulo = '+fmt(dimGeom(d).meas,2)+'°')});
function* dimChain(base){const last=entById(doc.lastDim);if(!last||last.type!=='dim'||!(last.kind==='lin'||last.kind==='ali')){logE('Crie antes uma cota linear (DLI)');return}
  let prev=last;for(;;){const p2=yield pt('Origem da próxima linha de chamada (Enter encerra)',{preview:q=>[DIMG(nextDim(prev,q,base,last))]});if(!p2)return;const e=mk(nextDim(prev,p2,base,last));e.layer=prev.layer;doc.lastDim=e.id;prev=e;logR('Cota = '+fmt(dimGeom(e).meas,doc.dim.dec))}}
function nextDim(prev,p2,base,first){const th=prev.kind==='ali'?ang(prev.p1,prev.p2):(prev.rot||0),n=perp(P(Math.cos(th),Math.sin(th)));
  if(!base)return{type:'dim',kind:prev.kind==='ali'?'ali':'lin',p1:prev.p2,p2,pos:prev.pos,rot:th};
  const side=Math.sign(dot(sub(prev.pos,prev.p1),n))||1,off=doc.dim.dli*doc.dim.scale*side;return{type:'dim',kind:'lin',p1:first.p1,p2,pos:add(prev.pos,mul(n,off)),rot:th}}
defCmd('DIMCONTINUE',{al:['DCO','DIMCONT'],desc:'Cota contínua'},function*(){yield* dimChain(false)});
defCmd('DIMBASELINE',{al:['DBA','DIMBASE'],desc:'Cota de linha de base'},function*(){yield* dimChain(true)});
defCmd('LEADER',{al:['LE','QLEADER','MLEADER','MLD','CHAMADA'],desc:'Chamada com seta'},function*(){
  const p0=yield pt('Ponta da seta');if(!p0)return;const pts=[p0];
  for(;;){const p=yield pt('Próximo ponto (Enter para o texto)',{base:pts[pts.length-1],preview:q=>[G_({type:'leader',pts:[...pts,q],s:''})]});if(!p)break;pts.push(p)}
  if(pts.length<2)return;const s=yield txtq('Texto da chamada');mk({type:'leader',pts,s:s||''})});

/* ============ consulta ============ */
defCmd('DIST',{al:['DI','DISTANCIA','DISTÂNCIA','MEASUREGEOM','MEA'],desc:'Distância entre pontos',mod:false},function*(){const a=yield pt('Primeiro ponto');if(!a)return;const b=yield pt('Segundo ponto',{base:a,preview:q=>[G_({type:'line',a,b:q})]});if(!b)return;
  logR(`Distância = ${fmt(dist(a,b),2)}  ·  ΔX = ${fmt(b.x-a.x,2)}  ΔY = ${fmt(b.y-a.y,2)}  ·  ângulo = ${fmt(normA(ang(a,b))*R2D,2)}°`)});
defCmd('ID',{al:['IDPOINT'],desc:'Coordenadas de um ponto',mod:false},function*(){const p=yield pt('Ponto');if(p)logR(`X = ${fmt(p.x,2)}  Y = ${fmt(p.y,2)}`)});
defCmd('AREA',{al:['AA'],desc:'Área e perímetro',mod:false},function*(){
  const p0=yield pt('Primeiro canto',{opts:['Objeto','Interno']});if(!p0)return;
  if(p0==='O'){const r=yield pickq('Objeto fechado',{filter:e=>(e.type==='pline'&&e.closed)||e.type==='circle'||e.type==='ellipse'||e.type==='hatch'||e.type==='spline'&&e.closed});if(!r)return;const e=r.e;
    let A,Pm;if(e.type==='circle'){A=Math.PI*e.r*e.r;Pm=TAU*e.r}else{const pts=e.type==='hatch'?e.loops[0]:e.type==='ellipse'?ellPts(e,96):e.type==='spline'?splinePts(e.pts,true,12):e.pts;A=Math.abs(polyArea(pts));Pm=polyPerim(pts)}
    logR(`Área = ${fmtA(A)} (${fmt(A,0)} mm²)  ·  Perímetro = ${fmt(Pm/1000,3)} m`);return}
  if(p0==='I'){for(;;){const q=yield pt('Ponto interno (Enter encerra)');if(!q)return;const reg=findRegion(q);if(!reg){logE('Contorno não encontrado');continue}UI.ghost=[G_({type:'pline',pts:reg,closed:true})];logR(`Área = ${fmtA(Math.abs(polyArea(reg)))}  ·  Perímetro = ${fmt(polyPerim(reg)/1000,3)} m`)}}
  const pts=[p0];for(;;){const p=yield pt('Próximo canto (Enter calcula)',{base:pts[pts.length-1],preview:q=>[G_({type:'pline',pts:[...pts,q],closed:true})]});if(!p)break;pts.push(p)}
  if(pts.length<3)return;logR(`Área = ${fmtA(Math.abs(polyArea(pts)))}  ·  Perímetro = ${fmt(polyPerim(pts)/1000,3)} m`)});
defCmd('ROOMTAG',{al:['AMBIENTE','RT','ROOM'],desc:'Nome e área do ambiente por ponto interno'},function*(){
  const nm=yield txtq('Nome do ambiente',{def:CMD._room||'SALA'});if(!nm)return;CMD._room=nm;
  const q=yield pt('Ponto interno do ambiente (o texto fica aqui)');if(!q)return;const reg=findRegion(q);if(!reg){logE('Ambiente não fechado: confira paredes e divisórias');return}
  const A=Math.abs(polyArea(reg));mk({type:'text',p:q,h:doc.textH*0.72,rot:0,s:nm+'\n'+fmtA(A),al:'c',vb:'m'});logR(`${nm}: ${fmtA(A)}`)});
defCmd('LIST',{al:['LI','LISTAR'],desc:'Listar propriedades',mod:false},function*(){const s=yield selq();for(const e of s||[]){logR(describe(e))}});
function describe(e){const t={line:'Linha',pline:'Polilinha',circle:'Círculo',arc:'Arco',ellipse:'Elipse',spline:'Spline',text:'Texto',point:'Ponto',xline:'Linha de construção',hatch:'Hachura',dim:'Cota',leader:'Chamada',insert:'Bloco',wall:'Parede'}[e.type];
  let s=`${t} · camada ${e.layer}`;
  if(e.type==='line')s+=` · comp. ${fmt(dist(e.a,e.b),2)} · ângulo ${fmt(normA(ang(e.a,e.b))*R2D,2)}°`;
  if(e.type==='pline'){s+=` · ${e.pts.length} vértices · comp. ${fmt(polyPerim(e.pts,e.closed),2)}`;if(e.closed)s+=` · área ${fmtA(Math.abs(polyArea(e.pts)))}`}
  if(e.type==='circle')s+=` · raio ${fmt(e.r,2)} · área ${fmtA(Math.PI*e.r*e.r)}`;
  if(e.type==='arc')s+=` · raio ${fmt(e.r,2)} · ângulo ${fmt(normA(e.a1-e.a0)*R2D,2)}°`;
  if(e.type==='wall')s+=` · comp. ${fmt(dist(e.a,e.b),0)} · espessura ${fmt(e.t,0)} · altura ${fmt(e.h||doc.wall.h,0)}`;
  if(e.type==='insert')s+=` · ${e.name} · rot ${fmt((e.rot||0)*R2D,1)}°`;
  if(e.type==='hatch')s+=` · ${e.pat} · área ${fmtA(e.loops.reduce((a,l)=>a+Math.abs(polyArea(l)),0))}`;
  if(e.type==='text')s+=` · “${e.s.replace(/\n/g,' / ')}”`;
  if(e.th)s+=` · espessura 3D ${e.th}`;return s}

/* ============ camadas ============ */
function ensureLayer(n,color=7){let L=doc.layers.find(l=>l.name.toUpperCase()===n.toUpperCase());if(!L){L={name:n,color,lt:'CONTINUOUS',lw:0.25,on:true,frozen:false,locked:false};doc.layers.push(L)}return L}
defCmd('CLAYER',{al:['CAMADA'],desc:'Definir camada atual'},function*(){const n=yield txtq('Nome da camada atual',{def:doc.clayer});if(!n)return;const L=ensureLayer(n.trim());L.on=true;L.frozen=false;doc.clayer=L.name;refreshPanels()});
defCmd('-LAYER',{al:['-LA'],desc:'Camadas pela linha de comando'},function*(){
  for(;;){const k=yield kwq('Opção',['Nova','Definir','Cor','Tipo','Peso','Ligar','Desligar:O','Congelar:F','Descongelar:H','Travar:K','Liberar:U']);if(!k)return;
    const nm=String((yield txtq('Nome(s) da camada (vírgula separa)'))||'').trim();if(!nm)continue;const names=nm.split(',').map(s=>s.trim()).filter(Boolean);
    let val;if(k==='C')val=yield num('Cor (índice 1–255)',{def:7});if(k==='T')val=String((yield txtq('Tipo de linha',{def:'CONTINUOUS'}))||'CONTINUOUS').toUpperCase().trim();if(k==='P')val=yield num('Peso (mm)',{def:0.25});
    for(const n of names){const L=ensureLayer(n);
      if(k==='D'){L.on=true;L.frozen=false;doc.clayer=L.name}else if(k==='C')L.color=val;else if(k==='T'){if(LTYPES.hasOwnProperty(val))L.lt=val;else logE('Tipo de linha inexistente')}
      else if(k==='P')L.lw=val;else if(k==='L')L.on=true;else if(k==='O'&&L.name!==doc.clayer)L.on=false;else if(k==='F'&&L.name!==doc.clayer)L.frozen=true;else if(k==='H')L.frozen=false;else if(k==='K')L.locked=true;else if(k==='U')L.locked=false}
    refreshPanels();dirty()}});
defCmd('LAYISO',{al:['ISOLAR'],desc:'Isolar camadas dos objetos'},function*(){const s=yield* getSel('Objetos nas camadas a isolar');if(!s.length)return;const keep=new Set(s.map(e=>e.layer));
  doc._iso=doc.layers.map(l=>[l.name,l.on]);doc.layers.forEach(l=>{if(!keep.has(l.name))l.on=false});if(!keep.has(doc.clayer))doc.clayer=[...keep][0];logR('Camadas isoladas: '+[...keep].join(', '));refreshPanels()});
defCmd('LAYUNISO',{al:['DESISOLAR'],desc:'Desfazer isolamento'},function*(){if(!doc._iso){logE('Nada isolado');return}doc._iso.forEach(([n,on])=>{const L=doc.layers.find(l=>l.name===n);if(L)L.on=on});doc._iso=null;refreshPanels();dirty()});
defCmd('LAYOFF',{al:['DESLIGARCAMADA'],desc:'Desligar camada do objeto'},function*(){for(;;){const r=yield pickq('Objeto na camada a desligar');if(!r)return;const L=layerOf(r.e.layer);if(L.name===doc.clayer){logE('Camada atual não pode ser desligada');continue}L.on=false;logR('Camada '+L.name+' desligada');refreshPanels();dirty()}});
defCmd('LAYFRZ',{al:['CONGELARCAMADA'],desc:'Congelar camada do objeto'},function*(){for(;;){const r=yield pickq('Objeto na camada a congelar');if(!r)return;const L=layerOf(r.e.layer);if(L.name===doc.clayer){logE('Camada atual não pode ser congelada');continue}L.frozen=true;refreshPanels();dirty()}});
defCmd('LAYLCK',{al:['TRAVARCAMADA'],desc:'Travar camada do objeto'},function*(){const r=yield pickq('Objeto na camada a travar');if(!r)return;layerOf(r.e.layer).locked=true;refreshPanels();dirty()});
defCmd('LAYON',{al:['LIGARCAMADAS'],desc:'Ligar todas as camadas',instant:true},()=>{doc.layers.forEach(l=>{l.on=true;l.frozen=false});refreshPanels();dirty()});
defCmd('LAYULK',{al:['LIBERARCAMADAS'],desc:'Destravar todas as camadas',instant:true},()=>{doc.layers.forEach(l=>l.locked=false);refreshPanels();dirty()});
defCmd('LAYCUR',{al:['PARACAMADAATUAL'],desc:'Mover objetos para a camada atual'},function*(){const s=yield* getSel();s.forEach(e=>e.layer=doc.clayer);dirty()});
defCmd('LAYMCUR',{al:['TORNARATUAL'],desc:'Camada do objeto vira atual'},function*(){const r=yield pickq('Objeto');if(!r)return;doc.clayer=r.e.layer;refreshPanels()});

/* ============ blocos ============ */
defCmd('BLOCK',{al:['B','BLOCO'],desc:'Criar bloco'},function*(){
  const nm=String((yield txtq('Nome do bloco'))||'').trim().toUpperCase();if(!nm)return;if(doc.blocks[nm]&&doc.blocks[nm].builtin){logE('Nome reservado da biblioteca');return}
  const bp=yield pt('Ponto base');if(!bp)return;const s=yield* getSel('Objetos do bloco');if(!s.length)return;
  const kind=(yield kwq('Comportamento',['Mobiliário:M','Porta:P','Janela:J','Genérico:G'],{def:'G'}))||'G';let w;if(kind==='P'||kind==='J')w=yield num('Largura do vão (mm)',{def:900});
  let h;if(kind==='M')h=yield num('Altura para o 3D (mm)',{def:750});
  const ents=s.map(e=>{const c=xformEnt(clone(e),Mtr(-bp.x,-bp.y));delete c.id;if(c.layer===doc.clayer||true)c.layer='0';c.color=c.color==='BL'?'BB':c.color;if(h&&['pline','circle','ellipse'].includes(c.type)&&(c.closed||c.type!=='pline'))c.th=c.th||h;return c});
  doc.blocks[nm]={name:nm,label:nm,kind:{M:'furn',P:'door',J:'window',G:'user'}[kind],base:P(0,0),ents,w};s.forEach(delEnt);mk({type:'insert',name:nm,p:bp,sx:1,sy:1,rot:0});logR('Bloco '+nm+' criado com '+ents.length+' objeto(s)');renderBlocks()});
defCmd('INSERT',{al:['I','INSERIR'],desc:'Inserir bloco'},function*(){
  let nm=String((yield txtq('Nome do bloco ('+Object.keys(doc.blocks).slice(0,8).join(', ')+'…)',{def:CMD._blk||'DOOR'}))||'').trim().toUpperCase();if(!doc.blocks[nm]){logE('Bloco inexistente: '+nm);return}CMD._blk=nm;
  let rot=0,sx=1,sy=1;
  for(;;){const p=yield pt('Ponto de inserção',{opts:['Escala','Rotação'],preview:q=>[G_({type:'insert',name:nm,p:q,sx,sy,rot})]});
    if(p==='E'){sx=yield num('Escala',{def:1});sy=sx;continue}if(p==='R'){rot=(yield angq('Rotação',{def:0}))*D2R;continue}if(!p||typeof p!=='object')return;
    if(sx===1&&sy===1&&rot===0){const kx=yield num('Fator de escala X',{def:1});const ky=yield num('Fator de escala Y',{def:kx});const r=yield angq('Rotação',{base:p,def:0,preview:q=>[G_({type:'insert',name:nm,p,sx:kx,sy:ky,rot:ang(p,q)})]});sx=kx;sy=ky;rot=(r||0)*D2R}
    const ins=mk({type:'insert',name:nm,p,sx,sy,rot});const ad=doc.blocks[nm].ents.filter(c=>c.type==='attdef');if(ad.length){ins.attrs={};for(const a of ad){const dv=attrDefault(a);const v=yield txtq(a.prompt,{def:dv});ins.attrs[a.tag]=v==null||v===''?dv:v}dirty()}return}});
defCmd('PURGE',{al:['PU','LIMPAR'],desc:'Remover camadas e blocos sem uso',instant:true},()=>{const used=new Set(doc.ents.map(e=>e.layer));const before=doc.layers.length;
  doc.layers=doc.layers.filter(l=>used.has(l.name)||l.name==='0'||l.name===doc.clayer||STD_LAYERS.some(s=>s[0]===l.name));
  const ub=new Set(doc.ents.filter(e=>e.type==='insert').map(e=>e.name));let nb=0;for(const k in doc.blocks)if(!doc.blocks[k].builtin&&!ub.has(k)){delete doc.blocks[k];nb++}
  logR(`${before-doc.layers.length} camada(s) e ${nb} bloco(s) removidos`);refreshPanels();renderBlocks()});

/* ============ ajustes e vista ============ */
const toggle=k=>{ST[k]=!ST[k];if(k==='ortho'&&ST.ortho)ST.polar=false;if(k==='polar'&&ST.polar)ST.ortho=false;syncStatus();log(`${k.toUpperCase()} ${ST[k]?'ligado':'desligado'}`);saveSettings();requestDraw()};
defCmd('ORTHO',{al:['ORTO'],instant:true,transparent:true,desc:'Modo orto (F8)'},()=>toggle('ortho'));
defCmd('POLAR',{al:[],instant:true,transparent:true,desc:'Rastreamento polar (F10)'},()=>toggle('polar'));
defCmd('GRID',{al:['GRADE'],desc:'Grade',mod:false},function*(){const v=yield num('Espaçamento da grade ou [Ligar/Desligar]',{opts:['Ligar','Desligar'],def:ST.gridX});if(v==='L')ST.grid=true;else if(v==='D')ST.grid=false;else if(v>0){ST.gridX=v;ST.grid=true}syncStatus();saveSettings()});
defCmd('SNAP',{al:['SN'],desc:'Snap à grade',mod:false},function*(){const v=yield num('Passo do snap ou [Ligar/Desligar]',{opts:['Ligar','Desligar'],def:ST.snapX});if(v==='L')ST.snap=true;else if(v==='D')ST.snap=false;else if(v>0){ST.snapX=v;ST.snap=true}syncStatus();saveSettings()});
defCmd('LTSCALE',{al:['LTS'],desc:'Escala de tipo de linha'},function*(){const v=yield num('Escala global de tipo de linha',{def:doc.ltscale});if(v>0){doc.ltscale=v;dirty()}});
defCmd('DIMSCALE',{al:['DIMSC'],desc:'Escala das cotas'},function*(){const v=yield num('Escala das cotas (ex.: 50 para 1:50)',{def:doc.dim.scale});if(v>0){doc.dim.scale=v;dirty()}});
defCmd('TEXTSIZE',{al:['ALTURATEXTO'],desc:'Altura padrão de texto'},function*(){const v=yield num('Altura padrão',{def:doc.textH});if(v>0)doc.textH=v});
defCmd('THICKNESS',{al:['TH','ESPESSURA3D'],desc:'Espessura 3D padrão'},function*(){const v=yield num('Espessura 3D para novos objetos',{def:doc.thickness});if(v>=0)doc.thickness=v});
defCmd('ZOOM',{al:['Z'],desc:'Zoom',mod:false,norepeat:false},function*(){
  const r=yield pt('Canto da janela ou [Extensão/Todos/Anterior] ou fator (ex.: 2)',{opts:['Extensão','Anterior'],allowDD:false});
  if(r==='E'||r==='T'){zoomExt();return}if(r==='A'){if(V._prev){Object.assign(V,V._prev);requestDraw()}return}if(!r)return;
  const b=yield pt('Canto oposto',{preview:q=>[G_({type:'pline',pts:[r,P(q.x,r.y),q,P(r.x,q.y)],closed:true})]});if(!b)return;V._prev={s:V.s,ox:V.ox,oy:V.oy};zoomBox({x0:Math.min(r.x,b.x),y0:Math.min(r.y,b.y),x1:Math.max(r.x,b.x),y1:Math.max(r.y,b.y)},0.02)});
defCmd('ZE',{al:[],instant:true,transparent:true,desc:'Zoom extensão'},()=>zoomExt());
defCmd('PAN',{al:['P'],instant:true,transparent:true,desc:'Pan com a mão'},()=>setPan(!UI.pan));
defCmd('REGEN',{al:['RE','REDRAW','R'],instant:true,transparent:true,desc:'Regenerar'},()=>{dirty();_themeV++});
defCmd('UNDO',{al:['U','DESFAZER'],instant:true,desc:'Desfazer (Ctrl+Z)'},()=>undo());
defCmd('REDO',{al:['REFAZER'],instant:true,desc:'Refazer (Ctrl+Y)'},()=>redo());
defCmd('SELECTALL',{al:['AI_SELALL','SELECIONARTUDO'],instant:true,desc:'Selecionar tudo (Ctrl+A)'},()=>{doc.ents.filter(editable).forEach(e=>SEL.add(e.id));refreshPanels();requestDraw()});
defCmd('SELECTSIMILAR',{al:['SIMILAR'],instant:true,desc:'Selecionar semelhantes (tipo + camada)'},()=>{const base=[...SEL].map(entById).filter(Boolean);if(!base.length){logE('Selecione um objeto antes');return}
  const keys=new Set(base.map(e=>e.type+'|'+e.layer+'|'+(e.name||'')));doc.ents.filter(e=>editable(e)&&keys.has(e.type+'|'+e.layer+'|'+(e.name||''))).forEach(e=>SEL.add(e.id));logR(SEL.size+' selecionado(s)');refreshPanels();requestDraw()});
let CLIP=null;
defCmd('COPYCLIP',{al:['CTRLC'],instant:true,desc:'Copiar para a área interna (Ctrl+C)'},()=>{const s=[...SEL].map(entById).filter(Boolean);if(!s.length){logE('Nada selecionado');return}const b=extents(s);CLIP={ents:clone(s),base:P(b.x0,b.y0)};logR(s.length+' objeto(s) copiado(s)')});
defCmd('PASTECLIP',{al:['CTRLV','COLAR'],desc:'Colar (Ctrl+V)'},function*(){if(!CLIP){logE('Área de transferência vazia');return}const b=CLIP.base;
  const p=yield pt('Ponto de inserção',{preview:q=>ghostOf(CLIP.ents,Mtr(q.x-b.x,q.y-b.y))});if(!p)return;CLIP.ents.forEach(e=>{const c=xformEnt(clone(e),Mtr(p.x-b.x,p.y-b.y));delete c.id;addEnt(c)})});
defCmd('PROPERTIES',{al:['PR','CH','PROPRIEDADES','PROPS'],instant:true,transparent:true,desc:'Painel de propriedades'},()=>openDrawer('propsP'));
defCmd('LAYER',{al:['LA','CAMADAS'],instant:true,transparent:true,desc:'Gerenciador de camadas'},()=>openDrawer('layersP'));
defCmd('BLOCKS',{al:['BLOCOS','TP','TOOLPALETTES','BIBLIOTECA'],instant:true,transparent:true,desc:'Biblioteca de blocos'},()=>openDrawer('blocksP'));
defCmd('DSETTINGS',{al:['DS','OS','OSNAP','SE','RASTREAMENTO'],instant:true,transparent:true,desc:'Configurações de desenho e snaps'},()=>dlgSettings());
defCmd('DIMSTYLE',{al:['D','DST','ESTILOCOTA'],instant:true,desc:'Estilo de cota'},()=>dlgSettings('dim'));
defCmd('HELP',{al:['AJUDA','?','COMANDOS'],instant:true,transparent:true,desc:'Lista de comandos'},()=>dlgHelp());
defCmd('NEW',{al:['NOVO'],instant:true,desc:'Novo desenho'},()=>{const go=()=>{undoS=[];redoS=[];doc=newDoc();SEL.clear();dirty();refreshPanels();renderBlocks();zoomBox({x0:-2000,y0:-2000,x1:14000,y1:10000});autosave();log('Desenho novo')};doc.ents.length?askConfirm('Começar um desenho novo? O atual só fica guardado se você usou Salvar.',go,'Novo desenho'):go()});
defCmd('SAVE',{al:['QSAVE','SALVAR','CTRLS'],instant:true,desc:'Salvar no navegador'},()=>saveFile());
defCmd('SAVEAS',{al:['SALVARCOMO'],instant:true,desc:'Salvar como'},()=>askText('Salvar como',doc.name,n=>{if(n&&n.trim()){doc.name=n.trim();$('#fname').textContent=doc.name;saveFile()}}));
defCmd('OPEN',{al:['ABRIR'],instant:true,desc:'Abrir desenho salvo'},()=>dlgOpen());
defCmd('EXPORT',{al:['EXPORTAR','DXFOUT','SVGOUT','PNGOUT'],instant:true,desc:'Exportar DXF / SVG / PNG / JSON'},()=>dlgExport());
defCmd('IMPORT',{al:['IMPORTAR','DXFIN'],instant:true,desc:'Importar DXF ou JSON'},()=>$('#fileIn').click());
defCmd('PLOT',{al:['PRINT','PLOTAR','IMPRIMIR'],instant:true,desc:'Plotar folha em escala'},()=>dlgPlot());
defCmd('3D',{al:['VIEW3D','3DORBIT','3DO','CONSTRUIR','BUILD3D'],instant:true,desc:'Construir e ver em 3D'},()=>open3D());
defCmd('SCRIPT',{al:['SCR'],instant:true,desc:'Executar script de comandos'},()=>dlgScript());
defCmd('DEMO',{al:['DEMONSTRACAO','APARTAMENTO'],instant:true,desc:'Desenhar apartamento de 92 m²'},()=>runDemo());
defCmd('IA',{al:['AI','ASSISTENTE'],instant:true,desc:'Assistente de desenho por IA'},()=>dlgAI());
defCmd('COUNT',{al:['CONTAR'],instant:true,desc:'Contar blocos'},()=>{const c={};doc.ents.filter(e=>e.type==='insert').forEach(e=>c[e.name]=(c[e.name]||0)+1);const k=Object.keys(c);if(!k.length){logR('Nenhum bloco inserido');return}k.forEach(n=>logR(`${n}: ${c[n]}`))});
/* ============ interface: ribbon ============ */
const IC={
 line:'<path d="M4 20L20 4"/><circle cx="4" cy="20" r="1.6"/><circle cx="20" cy="4" r="1.6"/>',
 pline:'<path d="M3 19l5-9 6 5 7-11"/>',rect:'<rect x="4" y="6" width="16" height="12"/>',circle:'<circle cx="12" cy="12" r="8"/><path d="M12 12h8"/>',
 arc:'<path d="M4 18A10 10 0 0 1 20 10"/>',ellipse:'<ellipse cx="12" cy="12" rx="9" ry="5.5"/>',polygon:'<path d="M12 3l8 6-3 10H7L4 9z"/>',
 spline:'<path d="M3 17c4-10 7 4 10-4s5-6 8-5"/>',point:'<path d="M12 7v10M7 12h10"/><circle cx="12" cy="12" r="2.5"/>',xline:'<path d="M2 20L22 4" stroke-dasharray="3 2"/>',
 wall:'<path d="M3 8h18M3 13h18M3 8v5M21 8v5"/><path d="M6 8l-3 5M10 8l-4 5M14 8l-4 5M18 8l-4 5M21 9l-3 4"/>',hatch:'<rect x="4" y="4" width="16" height="16"/><path d="M4 12l8-8M4 20L20 4M12 20l8-8"/>',
 text:'<path d="M5 6h14M12 6v13"/>',mtext:'<path d="M4 6h10M9 6v8M4 17h16M4 20h11"/>',
 move:'<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M21 12l-3-3M21 12l-3 3"/>',copy:'<rect x="8" y="8" width="12" height="12"/><path d="M4 16V4h12"/>',
 rotate:'<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',scale:'<rect x="3" y="11" width="10" height="10"/><path d="M13 11l8-8M15 3h6v6"/>',
 mirror:'<path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9 6L3 18h6zM15 6l6 12h-6z"/>',offset:'<path d="M4 18L18 4M8 21L21 8"/>',
 trim:'<path d="M4 4l16 16M20 4L4 20"/><path d="M14 4l6 0" />',extend:'<path d="M3 12h12M15 12l3 0" /><path d="M20 4v16"/><path d="M12 9l3 3-3 3"/>',
 fillet:'<path d="M4 20V12a8 8 0 0 1 8-8h8"/>',chamfer:'<path d="M4 20V10l6-6h10"/>',array:'<rect x="3" y="3" width="5" height="5"/><rect x="10" y="3" width="5" height="5"/><rect x="17" y="3" width="4" height="5"/><rect x="3" y="10" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/><rect x="3" y="17" width="5" height="4"/>',
 stretch:'<path d="M3 6h8v12H3M11 12h10M18 9l3 3-3 3"/>',erase:'<path d="M5 19h14M7 15l8-10 5 5-7 9H8z"/>',explode:'<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>',
 join:'<path d="M3 17l6-8M15 9l6 8"/><path d="M9 9h6"/>',brk:'<path d="M3 12h7M14 12h7M10 8l4 8"/>',match:'<path d="M14 3l7 7-9 9H5v-7z"/><path d="M5 19l-2 2"/>',
 undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
 dimlin:'<path d="M4 6v12M20 6v12M4 14h16"/><path d="M6 12l-2 4M22 12l-2 4"/>',dimali:'<path d="M4 18L18 4M8 22L22 8"/><path d="M6 20l-2-2M20 6l2 2"/>',dimrad:'<circle cx="12" cy="12" r="8"/><path d="M12 12l6-6"/><text x="5" y="20" font-size="7" fill="currentColor" stroke="none">R</text>',
 dimdia:'<circle cx="12" cy="12" r="8"/><path d="M6 18L18 6"/>',dimang:'<path d="M4 20L20 20M4 20L16 6"/><path d="M14 20a10 10 0 0 0-3-7"/>',dimcont:'<path d="M3 6v12M12 6v12M21 6v12M3 14h18"/>',dimbase:'<path d="M3 4v16M12 10v10M21 6v14M3 16h9M3 12h18"/>',
 leader:'<path d="M4 20l7-8h9"/><path d="M4 20l1-4 3 2z" fill="currentColor"/>',room:'<rect x="3" y="4" width="18" height="16"/><path d="M8 11h8M9 14h6"/>',edit:'<path d="M4 20h4L20 8l-4-4L4 16z"/>',dimstyle:'<path d="M4 8h16M4 8v8M20 8v8"/><circle cx="12" cy="15" r="3"/>',
 layers:'<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>',iso:'<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5" stroke-dasharray="2 2"/>',uniso:'<path d="M12 4l9 5-9 5-9-5z" stroke-dasharray="2 2"/><path d="M3 14l9 5 9-5"/>',
 off:'<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><path d="M4 20L20 4"/>',freeze:'<path d="M12 2v20M3 7l18 10M21 7L3 17"/>',lock:'<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 on:'<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="3"/>',tocur:'<path d="M12 4l9 5-9 5-9-5z"/><path d="M12 15v6M9 18l3 3 3-3"/>',makecur:'<path d="M12 4l9 5-9 5-9-5z"/><path d="M8 9l3 3 5-6"/>',
 lib:'<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><path d="M17 13v8M13 17h8"/>',block:'<rect x="4" y="4" width="16" height="16" stroke-dasharray="3 2"/><path d="M8 16l4-8 4 8z"/>',
 insert:'<rect x="9" y="3" width="12" height="12"/><path d="M3 21l9-9M3 15v6h6"/>',count:'<path d="M5 7h4M5 12h4M5 17h4M13 7h6M13 12h6M13 17h6"/>',purge:'<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
 dist:'<path d="M3 17L21 7"/><path d="M3 13v8M21 3v8"/>',area:'<path d="M4 18l4-12 8 2 4 10z"/><path d="M8 14h6" />',id:'<circle cx="12" cy="12" r="3"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h0M4 12h0M4 18h0"/>',
 props:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',similar:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><path d="M10 10l4 4"/>',
 zext:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',zwin:'<rect x="4" y="4" width="11" height="11" stroke-dasharray="2 2"/><path d="M15 15l6 6"/>',pan:'<path d="M12 3v18M3 12h18"/>',
 cube:'<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',plot:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8"/><path d="M7 14h10v7H7z"/>',
 exp:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v4h16v-4"/>',imp:'<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v4h16v-4"/>',script:'<path d="M8 4h11v16H8z"/><path d="M4 8h4M4 12h4M11 9h5M11 13h5"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h0"/>',
 save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',open:'<path d="M3 7h6l2 2h10v11H3z"/>',newd:'<path d="M6 3h9l4 4v14H6z"/><path d="M12 10v6M9 13h6"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
 ortho:'<path d="M5 19V5M5 19h14"/>',door:'<path d="M5 20V4M5 4a16 16 0 0 1 16 16"/><path d="M3 20h18"/>'
};
const RIB=[
 ['Desenhar',[['Linha','LINE','line'],['Polilinha','PLINE','pline'],['Retângulo','RECTANG','rect'],['Círculo','CIRCLE','circle'],['Arco','ARC','arc'],['Elipse','ELLIPSE','ellipse'],['Polígono','POLYGON','polygon'],['Spline','SPLINE','spline'],['Ponto','POINT','point'],['Construção','XLINE','xline'],'|',['Parede','WALL','wall'],['Hachura','HATCH','hatch'],['Texto','TEXT','text'],['Texto ML','MTEXT','mtext']]],
 ['Modificar',[['Mover','MOVE','move'],['Copiar','COPY','copy'],['Girar','ROTATE','rotate'],['Escala','SCALE','scale'],['Espelhar','MIRROR','mirror'],['Offset','OFFSET','offset'],['Aparar','TRIM','trim'],['Estender','EXTEND','extend'],['Concordar','FILLET','fillet'],['Chanfro','CHAMFER','chamfer'],['Matriz','ARRAY','array'],['Esticar','STRETCH','stretch'],'|',['Apagar','ERASE','erase'],['Explodir','EXPLODE','explode'],['Unir','JOIN','join'],['Quebrar','BREAK','brk'],['Pincel','MATCHPROP','match'],'|',['Desfazer','UNDO','undo'],['Refazer','REDO','redo']]],
 ['Anotar',[['Linear','DIMLINEAR','dimlin'],['Alinhada','DIMALIGNED','dimali'],['Raio','DIMRADIUS','dimrad'],['Diâmetro','DIMDIAMETER','dimdia'],['Angular','DIMANGULAR','dimang'],['Contínua','DIMCONTINUE','dimcont'],['Base','DIMBASELINE','dimbase'],['Chamada','LEADER','leader'],'|',['Ambiente','ROOMTAG','room'],['Editar texto','TEXTEDIT','edit'],['Estilo cota','DIMSTYLE','dimstyle']]],
 ['Camadas',[['Camadas','LAYER','layers'],['Isolar','LAYISO','iso'],['Desisolar','LAYUNISO','uniso'],['Desligar','LAYOFF','off'],['Congelar','LAYFRZ','freeze'],['Travar','LAYLCK','lock'],['Ligar todas','LAYON','on'],['P/ atual','LAYCUR','tocur'],['Tornar atual','LAYMCUR','makecur']]],
 ['Blocos',[['Biblioteca','BLOCKS','lib'],['Criar','BLOCK','block'],['Inserir','INSERT','insert'],['Porta','INSERT DOOR','door'],['Contar','COUNT','count'],['Limpar','PURGE','purge']]],
 ['Consulta',[['Distância','DIST','dist'],['Área','AREA','area'],['Ponto','ID','id'],['Listar','LIST','list'],['Propriedades','PROPERTIES','props'],['Semelhantes','SELECTSIMILAR','similar']]],
 ['Vista e saída',[['Extensão','ZE','zext'],['Janela','ZOOM','zwin'],['Pan','PAN','pan'],['3D','3D','cube'],['Plotar','PLOT','plot'],'|',['Novo','NEW','newd'],['Abrir','OPEN','open'],['Salvar','SAVE','save'],['Exportar','EXPORT','exp'],['Importar','IMPORT','imp'],['Script','SCRIPT','script'],['Ajustes','DSETTINGS','settings'],['Ajuda','HELP','help']]]];
let curTab=0;
function renderRibbon(){const t=$('#tabs');t.innerHTML='';RIB.forEach(([n],i)=>{const b=document.createElement('button');b.className='tab';b.role='tab';b.textContent=n;b.setAttribute('aria-selected',i===curTab);b.onclick=()=>{curTab=i;renderRibbon()};t.appendChild(b)});
  const T=$('#tools');T.innerHTML='';for(const it of RIB[curTab][1]){if(it==='|'){const s=document.createElement('div');s.className='sep';T.appendChild(s);continue}
    const[l,c,ic]=it;const b=document.createElement('button');b.className='tool';b.title=`${l} (${c}${CMDS[c.split(' ')[0]]&&CMDS[c.split(' ')[0]].al[0]?' · '+CMDS[c.split(' ')[0]].al[0]:''})`;b.dataset.cmd=c;b.innerHTML=`<svg viewBox="0 0 24 24">${IC[ic]||''}</svg><span>${l}</span>`;T.appendChild(b)}
  markActiveTool()}
function markActiveTool(){$$('.tool').forEach(b=>b.classList.toggle('on',!!CMD.gen&&b.dataset.cmd.split(' ')[0]===CMD.name))}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cmd]');if(!b)return;e.preventDefault();const c=b.dataset.cmd;if(c.startsWith('INSERT ')){CMD.script.unshift(c.slice(7));startCmd('INSERT');return}startCmd(c);if(matchMedia('(pointer:fine)').matches)$('#cmd').focus()});

/* ============ status ============ */
function syncStatus(){$$('.st[data-tg]').forEach(b=>b.classList.toggle('on',!!ST[b.dataset.tg]));$('#panBtn').style.background=UI.pan?'var(--accent-soft)':''}
$$('.st[data-tg]').forEach(b=>b.onclick=()=>toggle(b.dataset.tg));
function setPan(v){UI.pan=v;cv.classList.toggle('pan',v);syncStatus();log(v?'Pan ativo (Esc sai)':'Pan desligado')}

/* ============ painéis ============ */
function openDrawer(id){const el=$('#'+id);const was=el.classList.contains('open');if(innerWidth<760)$$('.drawer.open').forEach(d=>{if(d.id!=='stepsP')d.classList.remove('open')});el.classList.toggle('open',!was||id==='propsP'&&!was);if(id==='layersP')renderLayers();if(id==='propsP')renderProps();if(id==='blocksP')renderBlocks()}
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.remove('open'));
function refreshPanels(){renderLayerSel();if($('#layersP').classList.contains('open'))renderLayers();if($('#propsP').classList.contains('open'))renderProps();markActiveTool()}
function aciOptions(sel,withBL){let h=withBL?`<option value="BL"${sel==='BL'?' selected':''}>PorCamada</option>`:'';for(const k of Object.keys(ACI))h+=`<option value="${k}"${String(sel)===k?' selected':''}>${{1:'1 Vermelho',2:'2 Amarelo',3:'3 Verde',4:'4 Ciano',5:'5 Azul',6:'6 Magenta',7:'7 Branco/Preto',8:'8 Cinza',9:'9 Cinza claro',30:'30 Laranja',40:'40 Âmbar',140:'140 Azul claro',150:'150 Azul',220:'220 Rosa',250:'250 Grafite'}[k]}</option>`;return h}
function ltOptions(sel,withBL){return(withBL?`<option value="BL"${sel==='BL'?' selected':''}>PorCamada</option>`:'')+Object.keys(LTYPES).map(k=>`<option${k===sel?' selected':''}>${k}</option>`).join('')}
function lwOptions(sel,withBL){return(withBL?`<option value="-1"${sel<0?' selected':''}>PorCamada</option>`:'')+LWS.map(v=>`<option value="${v}"${v===sel?' selected':''}>${v.toFixed(2)} mm</option>`).join('')}
function renderLayerSel(){const s=$('#clayerSel');s.innerHTML=doc.layers.map(l=>`<option${l.name===doc.clayer?' selected':''}>${esc(l.name)}</option>`).join('')}
$('#clayerSel').onchange=e=>{doc.clayer=e.target.value;const L=layerOf(doc.clayer);L.on=true;L.frozen=false;refreshPanels();requestDraw();autosave()};
function withUndo(fn){const b=snapshotStr();fn();if(doc.cons&&doc.cons.length)solveCons(true);const a=snapshotStr();if(a!==b){undoS.push(b);redoS=[];autosave()}dirty();refreshPanels()}
function renderLayers(){const box=$('#layersList');const cnt={};doc.ents.forEach(e=>cnt[e.layer]=(cnt[e.layer]||0)+1);
  box.innerHTML='<div class="small" style="margin-bottom:4px">Toque no círculo para tornar atual. Olho liga/desliga, floco congela, cadeado trava.</div>'+doc.layers.map((l,i)=>`
  <div class="lrow${l.name===doc.clayer?' cur':''}"><input type="radio" name="cl" ${l.name===doc.clayer?'checked':''} data-i="${i}" data-a="cur" aria-label="Tornar ${esc(l.name)} atual">
  <input class="nm" value="${esc(l.name)}" data-i="${i}" data-a="ren" ${l.name==='0'?'readonly':''} title="${cnt[l.name]||0} objeto(s)">
  <button class="ib${l.on?'':' off'}" data-i="${i}" data-a="on" title="Ligada"><svg viewBox="0 0 24 24">${IC.on}</svg></button>
  <button class="ib${l.frozen?'':' off'}" data-i="${i}" data-a="frz" title="Congelada"><svg viewBox="0 0 24 24">${IC.freeze}</svg></button>
  <button class="ib${l.locked?'':' off'}" data-i="${i}" data-a="lck" title="Travada"><svg viewBox="0 0 24 24">${IC.lock}</svg></button>
  <button class="ib" data-i="${i}" data-a="del" title="Excluir camada vazia" ${cnt[l.name]||l.name==='0'||l.name===doc.clayer?'disabled style="opacity:.25"':''}>×</button></div>
  <div class="lsub"><select data-i="${i}" data-a="col" aria-label="Cor" style="border-left:10px solid ${esc(aci(l.color))}">${aciOptions(l.color)}</select><select data-i="${i}" data-a="lt" aria-label="Tipo de linha">${ltOptions(l.lt)}</select><select data-i="${i}" data-a="lw" aria-label="Espessura">${lwOptions(l.lw)}</select><span class="small" style="align-self:center">${cnt[l.name]||0} obj.</span></div>`).join('')}
$('#layersList').addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(!t||t.tagName==='SELECT'||t.classList.contains('nm'))return;const L=doc.layers[+t.dataset.i];const a=t.dataset.a;
  withUndo(()=>{if(a==='cur'){doc.clayer=L.name;L.on=true;L.frozen=false}if(a==='on'&&L.name!==doc.clayer)L.on=!L.on;if(a==='frz'&&L.name!==doc.clayer)L.frozen=!L.frozen;if(a==='lck')L.locked=!L.locked;if(a==='del')doc.layers.splice(+t.dataset.i,1)})});
$('#layersList').addEventListener('change',e=>{const t=e.target;const L=doc.layers[+t.dataset.i];if(!L)return;const a=t.dataset.a;
  withUndo(()=>{if(a==='col')L.color=+t.value;if(a==='lt')L.lt=t.value;if(a==='lw')L.lw=+t.value;if(a==='ren'){const nn=t.value.trim();if(nn&&!doc.layers.some(x=>x!==L&&x.name===nn)){doc.ents.forEach(x=>{if(x.layer===L.name)x.layer=nn});if(doc.clayer===L.name)doc.clayer=nn;L.name=nn}}})});
$('#lnew').onclick=()=>{withUndo(()=>{let i=1;while(doc.layers.some(l=>l.name==='Camada'+i))i++;doc.layers.push({name:'Camada'+i,color:7,lt:'CONTINUOUS',lw:0.25,on:true,frozen:false,locked:false})});renderLayers()};
function renderProps(){const box=$('#propsBody');const s=[...SEL].map(entById).filter(Boolean);
  if(!s.length){box.innerHTML=`<div class="small">Nada selecionado. Toque num objeto ou arraste uma janela.</div><div class="ph">Desenho</div>
   <div class="field"><label>Objetos</label><input readonly value="${doc.ents.length}"></div><div class="field"><label>Camada atual</label><input readonly value="${esc(doc.clayer)}"></div>
   <div class="field"><label>Escala de linha</label><input type="number" data-g="ltscale" value="${num0(doc.ltscale)}"></div><div class="field"><label>Espessura 3D</label><input type="number" data-g="thickness" value="${num0(doc.thickness)}"></div>
   <div class="field"><label>Altura de texto</label><input type="number" data-g="textH" value="${num0(doc.textH)}"></div>`;return}
  const e=s[0],multi=s.length>1,same=k=>s.every(x=>JSON.stringify(x[k])===JSON.stringify(e[k]));
  const T={line:'Linha',pline:'Polilinha',circle:'Círculo',arc:'Arco',ellipse:'Elipse',spline:'Spline',text:'Texto',point:'Ponto',xline:'Construção',hatch:'Hachura',dim:'Cota',leader:'Chamada',insert:'Bloco',wall:'Parede'};
  let h=`<div class="ph">${multi?s.length+' objetos':esc(T[e.type]||e.type)}</div>
  <div class="field"><label>Camada</label><select data-p="layer">${doc.layers.map(l=>`<option${same('layer')&&l.name===e.layer?' selected':''}>${esc(l.name)}</option>`).join('')}${same('layer')?'':'<option selected disabled>*vários*</option>'}</select></div>
  <div class="field"><label>Cor</label><select data-p="color">${aciOptions(same('color')?e.color:'',true)}</select></div>
  <div class="field"><label>Tipo de linha</label><select data-p="lt">${ltOptions(same('lt')?e.lt:'',true)}</select></div>
  <div class="field"><label>Espessura linha</label><select data-p="lw">${lwOptions(same('lw')?e.lw:-2,true)}</select></div>
  <div class="field"><label>Escala do tipo</label><input type="number" step="0.1" data-p="lts" value="${num0(e.lts||1)}"></div>
  <div class="field"><label>Espessura 3D</label><input type="number" data-p="th" value="${same('th')?num0(e.th||0):''}"></div>
  <div class="field"><label>Elevação</label><input type="number" data-p="el" value="${same('el')?num0(e.el||0):''}"></div>`;
  if(!multi){const F=(l,k,v,ro,step='any')=>`<div class="field"><label>${l}</label><input ${ro?'readonly':''} type="${typeof v==='number'?'number':'text'}" step="${step}" data-g2="${k}" value="${esc(typeof v==='number'?+v.toFixed(3):v)}"></div>`;
    h+='<div class="ph">Geometria</div>';
    if(e.type==='line'||e.type==='wall'){h+=F('Início X','a.x',e.a.x)+F('Início Y','a.y',e.a.y)+F('Fim X','b.x',e.b.x)+F('Fim Y','b.y',e.b.y)+F('Comprimento','',dist(e.a,e.b),true)+F('Ângulo','',normA(ang(e.a,e.b))*R2D,true)}
    if(e.type==='wall')h+=F('Espessura','t',e.t)+F('Isolamento','ins',e.ins||0)+F('Altura','h',e.h||doc.wall.h);
    if(e.type==='circle'||e.type==='arc'){h+=F('Centro X','c.x',e.c.x)+F('Centro Y','c.y',e.c.y)+F('Raio','r',e.r);if(e.type==='circle')h+=F('Área (m²)','',Math.PI*e.r*e.r/1e6,true)+F('Perímetro','',TAU*e.r,true);else h+=F('Ângulo inicial','a0d',e.a0*R2D)+F('Ângulo final','a1d',e.a1*R2D)}
    if(e.type==='ellipse')h+=F('Centro X','c.x',e.c.x)+F('Centro Y','c.y',e.c.y)+F('Semieixo maior','rx',e.rx)+F('Semieixo menor','ry',e.ry);
    if(e.type==='pline'){h+=`<div class="field"><label>Fechada</label><select data-g2="closed"><option value="1"${e.closed?' selected':''}>Sim</option><option value="0"${e.closed?'':' selected'}>Não</option></select></div>`+F('Vértices','',e.pts.length,true)+F('Comprimento','',polyPerim(e.pts,e.closed),true);if(e.closed)h+=F('Área (m²)','',Math.abs(polyArea(e.pts))/1e6,true)}
    if(e.type==='text'){h+=`<div class="field"><label>Conteúdo</label><textarea data-g2="s" rows="2">${esc(e.s)}</textarea></div>`+F('Altura','h',e.h)+F('Rotação','rotd',(e.rot||0)*R2D)+F('X','p.x',e.p.x)+F('Y','p.y',e.p.y)+`<div class="field"><label>Alinhamento</label><select data-g2="al">${[['l','Esquerda'],['c','Centro'],['r','Direita']].map(([v,n])=>`<option value="${v}"${e.al===v?' selected':''}>${n}</option>`).join('')}</select></div>`}
    if(e.type==='insert'){h+=F('Bloco','',e.name,true)+F('X','p.x',e.p.x)+F('Y','p.y',e.p.y)+F('Rotação','rotd',(e.rot||0)*R2D)+F('Escala X','sx',e.sx||1)+F('Escala Y','sy',e.sy||1)}
    if(e.type==='hatch'){h+=`<div class="field"><label>Padrão</label><select data-g2="pat">${Object.keys(PATTERNS).map(k=>`<option${k===e.pat?' selected':''}>${k}</option>`).join('')}</select></div>`+F('Escala','sc',e.sc)+F('Ângulo','ang',e.ang||0)+F('Área (m²)','',e.loops.reduce((a,l)=>a+Math.abs(polyArea(l)),0)/1e6,true)}
    if(e.type==='dim'){h+=F('Medida','',dimGeom(e).meas,true)+`<div class="field"><label>Texto</label><input type="text" data-g2="txt" value="${esc(e.txt||'')}" placeholder="<> = medida"></div>`+F('Tolerância +','tolp',+e.tolp||0)+F('Tolerância −','tolm',+e.tolm||0)}
    if(e.type==='insert'){const ad=(doc.blocks[e.name]||{ents:[]}).ents.filter(c=>c.type==='attdef');if(ad.length){h+='<div class="ph">Atributos</div>'+ad.map(a=>`<div class="field"><label>${esc(a.tag)}</label><input type="text" data-attr="${esc(a.tag)}" value="${esc((e.attrs||{})[a.tag]??a.def)}"></div>`).join('')}}
    if(e.type==='fcf')h+=`<div class="field"><label>Tolerância</label><input type="text" data-g2="tol" value="${esc(e.tol)}"></div>`+F('Altura','h',e.h);
    if(e.type==='image')h+=F('Largura','w',e.w)+F('Altura','h',e.h)+F('Opacidade (0–1)','alpha',e.alpha??1);
    if(e.type==='leader')h+=`<div class="field"><label>Texto</label><input type="text" data-g2="s" value="${esc(e.s||'')}"></div>`;
    if(e.type==='point')h+=F('X','p.x',e.p.x)+F('Y','p.y',e.p.y)}
  box.innerHTML=h}
$('#propsBody').addEventListener('change',ev=>{const t=ev.target,s=[...SEL].map(entById).filter(Boolean);
  if(t.dataset.g){withUndo(()=>{doc[t.dataset.g]=+t.value});return}
  if(t.dataset.p){const k=t.dataset.p;let v=t.value;if(k==='lw'||k==='th'||k==='el'||k==='lts')v=+v;if(k==='color'&&v!=='BL')v=+v;withUndo(()=>s.forEach(e=>{if(k==='th'&&!v)delete e.th;else e[k]=v}));return}
  if(t.dataset.attr&&s.length===1){const e=s[0];withUndo(()=>{e.attrs={...(e.attrs||{}),[t.dataset.attr]:t.value}});return}
  if(t.dataset.g2&&s.length===1){const e=s[0],k=t.dataset.g2;let v=t.type==='number'?+t.value:t.value;
    withUndo(()=>{if(k.includes('.')){const[a,b]=k.split('.');e[a]={...e[a],[b]:v}}else if(k==='a0d')e.a0=v*D2R;else if(k==='a1d')e.a1=v*D2R;else if(k==='rotd')e.rot=v*D2R;else if(k==='closed')e.closed=v==='1';else e[k]=v})}});
/* thumbnails de blocos */
function renderBlocks(){const box=$('#blkList');if(!box)return;box.innerHTML='';readColsOnce();
  for(const[k,B]of Object.entries(doc.blocks)){const b=document.createElement('button');b.innerHTML=`<canvas width="200" height="140"></canvas><span>${esc(B.label||k)}</span>`;b.onclick=()=>{CMD.script.unshift(k);startCmd('INSERT');if(innerWidth<760)$('#blocksP').classList.remove('open')};box.appendChild(b);
    const c=b.querySelector('canvas'),x=c.getContext('2d');const fake={type:'insert',name:k,p:P(0,0),sx:1,sy:1,rot:0,layer:'0',color:'BL',lt:'BL',lw:-1};const bb=bboxEnt(fake);const s=Math.min(180/Math.max(1,bb.x1-bb.x0),120/Math.max(1,bb.y1-bb.y0));
    const sv={...V};V.s=s;V.ox=100-(bb.x0+bb.x1)/2*s;V.oy=70+(bb.y0+bb.y1)/2*s;const oc=ctx;window.__c=x;
    x.setTransform(s,0,0,-s,V.ox,V.oy);x.lineCap='round';drawWith(x,()=>{for(const ch of childEnts(fake))drawEnt(ch,{c:COL['model-fg'],w:1.2,dash:[]})});Object.assign(V,sv)}}
function drawWith(c2,fn){const saved=ctx;_ctxSwap(c2);try{fn()}finally{_ctxSwap(saved)}}
/* ============ entrada: ponteiro, toque, teclado ============ */
const ptrs=new Map();let drag=null,pinch=null,clickWin=null;
const spos=e=>{const r=cv.getBoundingClientRect();return P(e.clientX-r.left,e.clientY-r.top)};
function updCursor(sp,touchOff){
  UI.inside=true;let s=sp;if(touchOff&&UI.pointMode){s=P(sp.x,sp.y-70);UI.touchPt=sp}else UI.touchPt=null;
  TOLW=(matchMedia('(pointer:coarse)').matches?14:7)/V.s;const raw=s2w(s);UI.cur=raw;
  const req=CMD.req;const wantsPt=req&&['point','dist','angle'].includes(req.kind);
  if(wantsPt){const r=computePoint(raw,req);UI.pt=r.p;UI.snap=r;UI.hover=null}else{UI.pt=raw;UI.snap=null;UI.tracks=[];
    UI.hover=(!req||req.kind==='sel'||req.kind==='pick')&&!drag?pickAt(raw,req&&req.filter):null}
  UI.curS=w2s(UI.pt);updatePreview();updDyn(UI.curS);
  $('#coords').textContent=`${fmt(UI.pt.x,1)}, ${fmt(UI.pt.y,1)}`;requestDraw()}
function updDyn(s){const d=$('#dyn');const req=CMD.req;if(!ST.dyn||!UI.inside||!s){d.style.display='none';return}
  let h='';if(req){const tv=$('#cmd').value;h=esc(req.prompt||'');if(req.base&&UI.pt&&['point','dist','angle'].includes(req.kind)){const L=dist(req.base,UI.pt),A=normA(ang(req.base,UI.pt))*R2D;h+=` <i>${fmt(L,0)} &lt; ${fmt(A,1)}°</i>`}
    if(UI.snap&&UI.snap.k)h+=` · ${SNAPNAME[UI.snap.k]||''}`;if(tv)h+=` » ${esc(tv)}`}
  else if(UI.hover)h=esc(describe(UI.hover).split(' · ').slice(0,2).join(' · '));
  if(!h){d.style.display='none';return}d.innerHTML=h;d.style.display='block';const w=d.offsetWidth;d.style.left=Math.min(V.w-w-4,s.x+18)+'px';d.style.top=Math.max(2,s.y+20)+'px'}
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);const sp=spos(e);ptrs.set(e.pointerId,sp);
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch={d:dist(a,b),c:mid(a,b),s:V.s,ox:V.ox,oy:V.oy,w:s2w(mid(a,b))};drag=null;UI.box=null;return}
  if(e.button===2){e.preventDefault();return}
  if(e.button===1||UI.pan||UI.space){drag={t:'pan',s:sp,ox:V.ox,oy:V.oy};cv.style.cursor='grabbing';return}
  drag={t:'pend',s:sp,time:performance.now(),touch:e.pointerType!=='mouse',shift:e.shiftKey};UI.shift=e.shiftKey;updCursor(sp,drag.touch)});
cv.addEventListener('pointermove',e=>{const sp=spos(e);if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,sp);
  if(pinch&&ptrs.size>=2){const[a,b]=[...ptrs.values()];const k=dist(a,b)/pinch.d,c=mid(a,b);V.s=Math.max(1e-5,Math.min(50,pinch.s*k));V.ox=c.x-pinch.w.x*V.s;V.oy=c.y+pinch.w.y*V.s;requestDraw();return}
  if(drag&&drag.t==='pan'){V.ox=drag.ox+sp.x-drag.s.x;V.oy=drag.oy+sp.y-drag.s.y;requestDraw();return}
  if(drag&&drag.t==='pend'&&dist(sp,drag.s)>7){const req=CMD.req;const canBox=!req||req.kind==='sel';if(canBox&&!(drag.touch&&UI.pointMode)){drag.t='box';UI.box={a:drag.s,b:sp}}else drag.t='move'}
  if(drag&&drag.t==='box'){UI.box.b=sp;requestDraw();return}
  if(e.pointerType==='touch'&&!drag)return;
  updCursor(sp,drag&&drag.touch)});
cv.addEventListener('pointerup',e=>{const sp=spos(e);ptrs.delete(e.pointerId);
  if(pinch){if(ptrs.size<2)pinch=null;drag=null;return}
  if(e.button===2){submitLine('');return}
  if(!drag)return;const d=drag;drag=null;cv.style.cursor='';
  if(d.t==='pan')return;
  if(d.t==='box'){const a=s2w(d.s),b=s2w(sp),cr=sp.x<d.s.x;UI.box=null;finishBox(a,b,cr,d.shift);return}
  // toque rápido sem arrastar: ponto sob o dedo
  if(d.touch&&d.t==='pend'&&UI.pointMode){updCursor(sp,false)}
  if(d.touch&&d.t==='move'&&UI.pointMode){updCursor(sp,true)}
  clickAt(d.touch&&d.t==='move'?UI.curS:sp,e.shiftKey||d.shift);if(d.touch){UI.touchPt=null;requestDraw()}});
cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);drag=null;pinch=null;UI.box=null});
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){UI.inside=false;$('#dyn').style.display='none';requestDraw()}});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{e.preventDefault();const f=Math.pow(1.0015,-e.deltaY*(e.deltaMode===1?30:1));zoomAt(spos(e),f);updCursor(spos(e))},{passive:false});
cv.addEventListener('dblclick',e=>{const sp=spos(e),w=s2w(sp);if(CMD.gen)return;const hit=pickAt(w);if(hit&&(hit.type==='text'||hit.type==='dim'||hit.type==='leader')){SEL.clear();CMD.script.unshift(`${w.x},${w.y}`);startCmd('TEXTEDIT');return}if(hit){SEL.clear();SEL.add(hit.id);openDrawer('propsP')}else zoomExt()});
function finishBox(a,b,cr,shift){const list=boxSelect(a,b,cr);const req=CMD.req;
  if(req&&req.kind==='sel'){list.forEach(e=>{if(shift){CMD._selAcc.delete(e.id);SEL.delete(e.id)}else{CMD._selAcc.add(e.id);SEL.add(e.id)}});logR(CMD._selAcc.size+' selecionado(s)')}
  else if(!req){list.forEach(e=>shift?SEL.delete(e.id):SEL.add(e.id))}
  refreshPanels();requestDraw()}
function clickAt(sp,shift){const req=CMD.req;const w=s2w(sp);
  if(clickWin&&(!req||req.kind==='sel')){const a=clickWin;clickWin=null;UI.box=null;finishBox(s2w(a),w,sp.x<a.x,shift);return}
  if(req){
    if(['point','dist','angle'].includes(req.kind)){const p=UI.pt||w;if(req.kind==='dist'){feed(dist(req.base||lastPt,p)/(req.div||1));return}if(req.kind==='angle'){feed(ang(req.base,p)*R2D);return}lastPt=p;feed(p);return}
    if(req.kind==='pick'){const e=pickAt(w,req.filter);if(!e){logE('Nenhum objeto válido aqui');return}feed({e,p:w});return}
    if(req.kind==='sel'){if(CMD._selWin){selWinPt(w);return}const e=pickAt(w);if(e){if(shift){CMD._selAcc.delete(e.id);SEL.delete(e.id)}else{CMD._selAcc.add(e.id);SEL.add(e.id)}logR(CMD._selAcc.size+' selecionado(s)');requestDraw()}else if(!matchMedia('(pointer:coarse)').matches){clickWin=sp;UI.box={a:sp,b:sp}}return}
    return}
  // ocioso: grips
  for(const id of SEL){const e=entById(id);if(!e||!editable(e))continue;const gs=gripsOf(e);for(let i=0;i<gs.length;i++){if(dist(w2s(gs[i]),sp)<(matchMedia('(pointer:coarse)').matches?14:8)){UI.gripReq={e,i};startCmd('GRIPEDIT');return}}}
  const e=pickAt(w);
  if(e){if(shift&&SEL.has(e.id))SEL.delete(e.id);else SEL.add(e.id)}
  else if(matchMedia('(pointer:coarse)').matches){SEL.clear()}else{clickWin=sp;UI.box={a:sp,b:sp}}
  refreshPanels();requestDraw()}
cv.addEventListener('pointermove',e=>{if(clickWin&&e.pointerType==='mouse'){UI.box={a:clickWin,b:spos(e)};requestDraw()}});
/* teclado */
const cmdIn=$('#cmd');let cmdHist=[],cmdHi=-1,acIdx=-1;
function cmdList(){const o=[];for(const[k,c]of Object.entries(CMDS))if(k!=='GRIPEDIT')o.push({k,al:c.al,d:c.desc});return o}
function showAC(){const v=cmdIn.value.trim().toUpperCase();const ac=$('#ac');if(CMD.gen||!v||/[\d,@<]/.test(v[0])){ac.style.display='none';return}
  const L=cmdList().filter(c=>c.k.startsWith(v)||c.al.some(a=>a.startsWith(v))).sort((a,b)=>(a.al.includes(v)?-1:0)-(b.al.includes(v)?-1:0)||a.k.length-b.k.length).slice(0,9);
  if(!L.length){ac.style.display='none';return}acIdx=Math.min(acIdx,L.length-1);ac.innerHTML=L.map((c,i)=>`<div class="${i===acIdx?'on':''}" data-k="${c.k}"><b>${c.k}</b><small>${c.al.slice(0,2).join(', ')} · ${esc(c.d)}</small></div>`).join('');ac.style.display='block'}
$('#ac').addEventListener('pointerdown',e=>{const d=e.target.closest('[data-k]');if(d){e.preventDefault();cmdIn.value='';$('#ac').style.display='none';startCmd(d.dataset.k)}});
cmdIn.addEventListener('input',()=>{acIdx=-1;showAC();updDyn(UI.curS)});
cmdIn.addEventListener('keydown',e=>{const ac=$('#ac');const open=ac.style.display==='block';
  if(open&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();const n=ac.children.length;acIdx=(acIdx+(e.key==='ArrowDown'?1:-1)+n)%n;showAC();return}
  if(e.key==='Tab'&&open){e.preventDefault();acIdx=Math.max(0,acIdx);const k=ac.children[acIdx].dataset.k;cmdIn.value=k;ac.style.display='none';return}
  const textMode=CMD.req&&CMD.req.kind==='text';
  if(e.key==='Enter'||(e.key===' '&&!textMode&&!CMD.script.length)){e.preventDefault();let v=cmdIn.value;if(open&&acIdx>=0)v=ac.children[acIdx].dataset.k;cmdIn.value='';ac.style.display='none';if(v.trim()&&!CMD.gen){cmdHist.push(v);cmdHi=cmdHist.length}submitLine(v);return}
  if(e.key==='Escape'){e.preventDefault();cmdIn.value='';ac.style.display='none';escape();return}
  if(e.key==='ArrowUp'&&!open&&!CMD.gen){e.preventDefault();if(cmdHi>0){cmdHi--;cmdIn.value=cmdHist[cmdHi]}return}
  if(e.key==='ArrowDown'&&!open&&!CMD.gen){e.preventDefault();if(cmdHi<cmdHist.length-1){cmdHi++;cmdIn.value=cmdHist[cmdHi]}else{cmdHi=cmdHist.length;cmdIn.value=''}return}});
function escape(){if(CMD.script.length||CMD.stimer){stopScript();log('Script interrompido')}clickWin=null;UI.box=null;if(CMD.gen)cancelCmd();else{SEL.clear();UI.acq=[]}if(UI.pan)setPan(false);refreshPanels();requestDraw()}
document.addEventListener('keydown',e=>{UI.shift=e.shiftKey;
  const tg=e.target,inField=tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT');
  if($('#mdl').classList.contains('open')||$('#v3d').classList.contains('open')){if(e.key==='Escape'){closeModal();close3D()}return}
  const fk={F3:'osnap',F7:'grid',F8:'ortho',F9:'snap',F10:'polar',F11:'otrack',F12:'dyn'};if(fk[e.key]){e.preventDefault();toggle(fk[e.key]);return}
  if(inField&&tg!==cmdIn)return;
  const c=e.ctrlKey||e.metaKey;
  if(c&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return}if(c&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return}
  if(c&&e.key.toLowerCase()==='a'&&tg!==cmdIn){e.preventDefault();startCmd('SELECTALL');return}if(c&&e.key.toLowerCase()==='s'){e.preventDefault();saveFile();return}
  if(c&&e.key.toLowerCase()==='c'&&tg!==cmdIn){startCmd('COPYCLIP');return}if(c&&e.key.toLowerCase()==='v'&&tg!==cmdIn){startCmd('PASTECLIP');return}
  if(tg===cmdIn)return;
  if(e.key==='Escape'){escape();return}
  if(e.key==='Delete'&&SEL.size&&!CMD.gen){startCmd('ERASE');return}
  if(e.key==='Enter'||e.key===' '){if(e.key===' '&&!CMD.gen&&false){}e.preventDefault();submitLine('');return}
  if(e.key.length===1&&!c&&!e.altKey){cmdIn.focus()}});
document.addEventListener('keyup',e=>{UI.shift=e.shiftKey;if(e.key===' ')UI.space=false});
$('#viewbtns').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='zin')zoomAt(P(V.w/2,V.h/2),1.4);if(a==='zout')zoomAt(P(V.w/2,V.h/2),1/1.4);if(a==='pan')setPan(!UI.pan);if(a==='layers')openDrawer('layersP');if(a==='props')openDrawer('propsP');
  if(a==='theme'){const r=document.documentElement;r.dataset.theme=isDark()?'light':'dark';try{localStorage.setItem('gpd:theme',r.dataset.theme)}catch(_){}_themeV++;renderBlocks();requestDraw();if(window._3d)_3d.retheme()}});
window.addEventListener('resize',()=>{resize()});if(window.visualViewport)visualViewport.addEventListener('resize',()=>resize());
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{_themeV++;requestDraw()});
/* ============ modais ============ */
function modal(title,body,btns){$('#mdlT').innerHTML=`${title}<button class="x" aria-label="Fechar" data-xmodal>×</button>`;$('#mdlT [data-xmodal]').onclick=closeModal;$('#mdlB').innerHTML=body;const f=$('#mdlF');f.innerHTML='';
  for(const b of btns||[]){const el=document.createElement('button');el.className='tb'+(b.primary?' primary':'');el.textContent=b.label;el.onclick=()=>{if(b.fn()!==false&&!b.keep)closeModal()};f.appendChild(el)}$('#mdl').classList.add('open')}
function closeModal(){$('#mdl').classList.remove('open')}
function askConfirm(msg,yes,label='Continuar'){modal('Confirmar',`<p style="margin:0">${esc(msg)}</p>`,[{label:'Cancelar',fn:()=>{}},{label,primary:true,fn:()=>{setTimeout(yes,40)}}])}
function askText(title,def,cb){modal(title,`<input id="askIn" value="${esc(def||'')}" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--panel2)">`,[{label:'Cancelar',fn:()=>{}},{label:'OK',primary:true,fn:()=>{const v=$('#askIn').value;setTimeout(()=>cb(v),40)}}]);setTimeout(()=>{const i=$('#askIn');if(i){i.focus();i.select();i.onkeydown=e=>{if(e.key==='Enter'){const v=i.value;closeModal();setTimeout(()=>cb(v),40)}}}},60)}
$('#mdl').addEventListener('pointerdown',e=>{if(e.target.id==='mdl')closeModal()});
function dlgSettings(focus){const O=ST.os,D=doc.dim,W=doc.wall;
  const ck=(k,l)=>`<label class="chk"><input type="checkbox" data-os="${k}" ${O[k]?'checked':''}> ${l}</label>`;
  modal('Configurações de desenho',`<div class="cols2"><div><div class="ph">Snap ao objeto (F3)</div>${ck('end','Extremidade')}${ck('mid','Ponto médio')}${ck('cen','Centro')}${ck('qua','Quadrante')}${ck('int','Interseção')}${ck('per','Perpendicular')}${ck('tan','Tangente')}${ck('nea','Mais próximo')}${ck('nod','Nó')}${ck('ins','Inserção')}</div>
  <div><div class="ph">Rastreamento e grade</div>
  <div class="field"><label>Incremento polar</label><select id="s_pol">${[5,10,15,22.5,30,45,90].map(v=>`<option${v===ST.polarInc?' selected':''}>${v}</option>`).join('')}</select></div>
  <div class="field"><label>Passo do snap</label><input id="s_snap" type="number" value="${num0(ST.snapX)}"></div><div class="field"><label>Grade</label><input id="s_grid" type="number" value="${num0(ST.gridX)}"></div>
  <div class="field"><label>Escala de linha</label><input id="s_lts" type="number" value="${num0(doc.ltscale)}"></div>
  <div class="ph" ${focus==='dim'?'id="fdim"':''}>Estilo de cota</div>
  <div class="field"><label>Escala (1:n)</label><input id="d_sc" type="number" value="${num0(D.scale)}"></div><div class="field"><label>Texto (mm papel)</label><input id="d_tx" type="number" step="0.1" value="${num0(D.txt)}"></div>
  <div class="field"><label>Terminação</label><select id="d_ar">${[['tick','Traço oblíquo'],['arrow','Seta'],['dot','Ponto']].map(([v,n])=>`<option value="${v}"${D.arrow===v?' selected':''}>${n}</option>`).join('')}</select></div>
  <div class="field"><label>Casas decimais</label><input id="d_dec" type="number" min="0" max="4" value="${num0(D.dec)}"></div><div class="field"><label>Espaço base (mm)</label><input id="d_dli" type="number" value="${num0(D.dli)}"></div>
  <div class="ph">Parede padrão</div><div class="field"><label>Espessura</label><input id="w_t" type="number" value="${num0(W.t)}"></div><div class="field"><label>Isolamento</label><input id="w_i" type="number" value="${num0(W.ins)}"></div><div class="field"><label>Altura</label><input id="w_h" type="number" value="${num0(W.h)}"></div></div></div>
  <p class="small">Unidade de trabalho: milímetro. Coordenadas: x,y absoluto · @dx,dy relativo · @dist&lt;ângulo polar · número sozinho = distância direta na direção do cursor.</p>`,
  [{label:'Cancelar',fn:()=>{}},{label:'Aplicar',primary:true,fn:()=>{$$('[data-os]').forEach(c=>ST.os[c.dataset.os]=c.checked);ST.polarInc=+$('#s_pol').value;ST.snapX=+$('#s_snap').value||100;ST.gridX=+$('#s_grid').value||1000;
    withUndo(()=>{doc.ltscale=+$('#s_lts').value||1;Object.assign(D,{scale:+$('#d_sc').value||50,txt:+$('#d_tx').value||2.5,arrow:$('#d_ar').value,dec:+$('#d_dec').value||0,dli:+$('#d_dli').value||7});Object.assign(W,{t:+$('#w_t').value||300,ins:+$('#w_i').value||0,h:+$('#w_h').value||2800})});saveSettings();syncStatus()}}]);
  if(focus==='dim')setTimeout(()=>{const f=$('#fdim');f&&f.scrollIntoView()},50)}
function dlgHelp(){const groups={};for(const[k,c]of Object.entries(CMDS)){if(k==='GRIPEDIT')continue;groups[k]=c}
  modal('Comandos',`<p class="small">Digite o nome ou o atalho e Enter. Enter vazio repete o último comando; Esc cancela; clique direito = Enter. F3 osnap · F7 grade · F8 orto · F9 snap · F10 polar · F11 rastreamento · F12 entrada dinâmica. Duplo clique no vazio = zoom extensão.</p>
  <div class="helpgrid">${Object.entries(groups).sort().map(([k,c])=>`<div><b>${k}</b><i>${esc(c.al.slice(0,3).join(', '))} · ${esc(c.desc)}</i></div>`).join('')}</div>`,[{label:'Fechar',fn:()=>{}}])}

/* ============ arquivos ============ */
const LS={get:k=>{try{return localStorage.getItem(k)}catch(_){return null}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch(_){return false}}};
let _as=0;function autosave(){clearTimeout(_as);_as=setTimeout(()=>LS.set('gpd:auto',JSON.stringify(doc)),400)}
function saveSettings(){LS.set('gpd:settings',JSON.stringify(ST))}
function saveFile(){const all=JSON.parse(LS.get('gpd:files')||'{}');all[doc.name]={d:new Date().toISOString(),json:JSON.stringify(doc)};if(LS.set('gpd:files',JSON.stringify(all))){toast(`“${doc.name}” salvo neste navegador`);log('Salvo: '+doc.name)}else toast('Não foi possível salvar: armazenamento indisponível ou cheio. Use Exportar.')}
function loadDoc(d){doc=Object.assign(newDoc(),d);doc.blocks=Object.assign(builtinBlocks(),d.blocks||{});for(const k in builtinBlocks())doc.blocks[k]=builtinBlocks()[k];undoS=[];redoS=[];SEL.clear();$('#fname').textContent=doc.name;dirty();refreshPanels();renderBlocks();zoomExt();autosave()}
function dlgOpen(){const all=JSON.parse(LS.get('gpd:files')||'{}');const names=Object.keys(all).sort((a,b)=>all[b].d.localeCompare(all[a].d));
  modal('Abrir desenho',names.length?`<div class="flist">${names.map(n=>`<div><span>${esc(n)}<br><small class="small">${new Date(all[n].d).toLocaleString('pt-BR')}</small></span><button class="tb" data-open="${esc(n)}">Abrir</button><button class="tb" data-delf="${esc(n)}">Excluir</button></div>`).join('')}</div>`:'<p>Nenhum desenho salvo neste navegador ainda. Use Salvar (Ctrl+S) ou importe um DXF.</p>',
  [{label:'Importar DXF/JSON…',fn:()=>$('#fileIn').click()},{label:'Fechar',fn:()=>{}}]);
  $('#mdlB').onclick=e=>{const o=e.target.dataset.open,d=e.target.dataset.delf;if(o){loadDoc(JSON.parse(all[o].json));closeModal();toast('Aberto: '+o)}if(d)askConfirm('Excluir “'+d+'” deste navegador?',()=>{delete all[d];LS.set('gpd:files',JSON.stringify(all));dlgOpen()},'Excluir')}}
$('#fname').onclick=()=>startCmd('SAVEAS');
$('#menuBtn').onclick=()=>modal('Arquivo',`<div class="flist">
  ${[['NEW','Novo desenho'],['OPEN','Abrir salvo no navegador'],['SAVE','Salvar (Ctrl+S)'],['SAVEAS','Salvar como…'],['IMPORT','Importar DXF ou JSON'],['EXPORT','Exportar DXF, SVG, PNG ou JSON'],['PLOT','Plotar folha em escala'],['DEMOS','Demonstrações (6 projetos completos)'],['SCRIPT','Executar script'],['DSETTINGS','Configurações'],['HELP','Lista de comandos']].map(([c,n])=>`<div><span>${n}</span><button class="tb" data-mc="${c}">${c}</button></div>`).join('')}</div>`,[{label:'Fechar',fn:()=>{}}]);
document.addEventListener('click',e=>{const b=e.target.closest('[data-mc]');if(b){closeModal();startCmd(b.dataset.mc)}});
async function download(name,data,mime){
  try{if(window.claude&&claude.use){const dl=await claude.use('downloads');if(dl){try{await dl.save({filename:name,data:typeof data==='string'?data:data});toast('Arquivo enviado: '+name);return true}catch(err){if(err&&err.code==='declined'){toast('Download cancelado');return false}if(err&&err.code==='rejected_extension'){toast('Formato não permitido aqui');return false}}}}}catch(_){}
  try{const blob=data instanceof Blob?data:new Blob([data],{type:mime||'application/octet-stream'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);return true}catch(err){toast('Não foi possível baixar o arquivo');return false}}
function loadScript(src){const G={three:'THREE',jszip:'JSZip','polygon-clipping':'polygonClipping',jspdf:'jspdf'};for(const k in G)if(src.includes(k)&&window[G[k]])return Promise.resolve();return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`)){const t=setInterval(()=>{if(window.__ld&&window.__ld[src]){clearInterval(t);res()}},50);return}const s=document.createElement('script');s.src=src;s.onload=()=>{(window.__ld=window.__ld||{})[src]=1;res()};s.onerror=()=>rej(new Error('Falha ao carregar '+src));document.head.appendChild(s)})}
const JSZIP='/vendor/jszip.min.js',THREEJS='/vendor/three.min.js';

/* hachura → segmentos recortados */
function clipLineLoops(p,d,loops){const ts=[];for(const l of loops)for(let i=0;i<l.length;i++){const a=l[i],b=l[(i+1)%l.length];const r=llInt(p,add(p,d),a,b);if(r&&r.u>=0&&r.u<1)ts.push(r.t)}ts.sort((x,y)=>x-y);const o=[];for(let i=0;i+1<ts.length;i+=2)o.push([add(p,mul(d,ts[i])),add(p,mul(d,ts[i+1]))]);return o}
function hatchSegs(loops,pat,sc,angD){const P_=PATTERNS[pat];if(!P_||!P_.f)return[];const o=[];const all=loops.flat(),b=bboxPts(all),diag=Math.hypot(b.x1-b.x0,b.y1-b.y0),c=P((b.x0+b.x1)/2,(b.y0+b.y1)/2);
  for(const f of P_.f){const a=(f.a+(angD||0))*D2R,d=P(Math.cos(a),Math.sin(a)),n=perp(d),sp=f.s*sc;if(diag/sp>2500)continue;const off=(f.o||0)*sc;
    for(let k=Math.floor((-diag/2-off)/sp);k*sp+off<=diag/2;k++){const p=add(add(c,mul(n,k*sp+off)),mul(d,-diag));o.push(...clipLineLoops(p,mul(d,1),loops).map(s=>s))}}
  return o}

/* ============ SVG ============ */
function svgColor(e,mono){return mono?'#000':(()=>{const c=colOf(e.color,e.layer);return c===COL['model-fg']?'#000':c})()}
function entsSVG(list,k,mono){ // k = mm de papel por mm de mundo
  const out=[],lw=e=>Math.max(0.13,(lwOf(e)||0.25))/k,f=n=>+n.toFixed(2);
  const dash=e=>{const lt=LTYPES[ltOf(e)];return lt?` stroke-dasharray="${lt.map(x=>f(Math.max(Math.abs(x)*doc.ltscale*(e.lts||1),0.3/k))).join(' ')}"`:''};
  const st=e=>`stroke="${svgColor(e,mono)}" stroke-width="${f(lw(e))}"${dash(e)} fill="none"`;
  const txt=(t,col)=>{const L=textLayout(t);return`<text transform="translate(${f(t.p.x)} ${f(t.p.y)}) rotate(${f((t.rot||0)*R2D)}) scale(1 -1)" font-family="IBM Plex Sans, Arial, sans-serif" font-size="${f(t.h)}" fill="${col}" text-anchor="${t.al==='c'?'middle':t.al==='r'?'end':'start'}">${L.lines.map((ln,i)=>`<tspan x="0" y="${f(-(L.fb-i*1.5*t.h))}">${esc(ln)}</tspan>`).join('')}</text>`};
  const pth=(pts,cl)=>'M'+pts.map(p=>f(p.x)+' '+f(p.y)).join('L')+(cl?'Z':'');
  const G=(g,e)=>{const col=svgColor(e,mono);let s=`<path d="${g.L.map(([a,b])=>pth([a,b])).join('')}" ${st(e)}/>`;if(g.K&&g.K.length)s+=`<path d="${g.K.map(([a,b])=>pth([a,b])).join('')}" stroke="${col}" stroke-width="${f(lw(e)*2.2)}"/>`;
    for(const a of g.AR||[]){const p0=pol(a.c,a.r,a.a0),p1=pol(a.c,a.r,a.a1),lg=normA(a.a1-a.a0)>Math.PI?1:0;s+=`<path d="M${f(p0.x)} ${f(p0.y)}A${f(a.r)} ${f(a.r)} 0 ${lg} 1 ${f(p1.x)} ${f(p1.y)}" ${st(e)}/>`}
    for(const a of g.A){const d=nrm(a.dir),n=perp(d),b=sub(a.p,mul(d,a.s));s+=a.dot?`<circle cx="${f(a.p.x)}" cy="${f(a.p.y)}" r="${f(a.s*.3)}" fill="${col}"/>`:`<path d="${pth([a.p,add(b,mul(n,a.s*.18)),sub(b,mul(n,a.s*.18))],true)}" fill="${col}"/>`}
    for(const t of g.T)s+=txt(t,col);return s};
  const walls=list.filter(e=>e.type==='wall');
  for(const e of list.filter(e=>e.type==='hatch')){const col=svgColor(e,mono);if(e.pat==='SOLID')out.push(`<path d="${e.loops.map(l=>pth(l,true)).join('')}" fill="${col}" fill-opacity="${mono?.35:.55}" fill-rule="evenodd"/>`);else out.push(`<path d="${hatchSegs(e.loops,e.pat,e.sc,e.ang).map(s=>pth(s)).join('')}" stroke="${col}" stroke-width="${f(0.09/k)}"/>`)}
  if(walls.length){const ps=walls.map(w=>({w,g:wallPolys(w)}));for(const{w,g}of ps)for(const p of g.core.concat(g.ins))out.push(`<path d="${pth(p,true)}" stroke="${svgColor(w,mono)}" stroke-width="${f(Math.max(0.5,lwOf(w))/k)}" fill="none" stroke-linejoin="miter"/>`);
    for(const{w,g}of ps){for(const p of g.core){out.push(`<path d="${pth(p,true)}" fill="#fff"/>`);out.push(`<path d="${hatchSegs([p],'ANSI31',Math.max(8,w.t/12),0).map(s=>pth(s)).join('')}" stroke="${mono?'#777':'#888'}" stroke-width="${f(0.09/k)}"/>`)}
      for(const p of g.ins){out.push(`<path d="${pth(p,true)}" fill="#fff"/>`);out.push(`<path d="${hatchSegs([p],'INSUL',Math.max(10,(w.ins||100)/4),0).map(s=>pth(s)).join('')}" stroke="#999" stroke-width="${f(0.09/k)}"/>`)}}}
  const one=e=>{switch(e.type){
    case 'line':return`<path d="${pth([e.a,e.b])}" ${st(e)}/>`;case 'pline':return`<path d="${pth(e.pts,e.closed)}" ${st(e)}/>`;
    case 'circle':return`<circle cx="${f(e.c.x)}" cy="${f(e.c.y)}" r="${f(e.r)}" ${st(e)}/>`;
    case 'arc':{const p0=pol(e.c,e.r,e.a0),p1=pol(e.c,e.r,e.a1),lg=normA(e.a1-e.a0)>Math.PI?1:0;return`<path d="M${f(p0.x)} ${f(p0.y)}A${f(e.r)} ${f(e.r)} 0 ${lg} 1 ${f(p1.x)} ${f(p1.y)}" ${st(e)}/>`}
    case 'ellipse':return`<ellipse cx="${f(e.c.x)}" cy="${f(e.c.y)}" rx="${f(e.rx)}" ry="${f(e.ry)}" transform="rotate(${f((e.rot||0)*R2D)} ${f(e.c.x)} ${f(e.c.y)})" ${st(e)}/>`;
    case 'spline':return`<path d="${pth(splinePts(e.pts,e.closed,12),false)}" ${st(e)}/>`;
    case 'text':return txt(e,svgColor(e,mono));case 'dim':return G(dimGeom(e),e);case 'leader':return G(leaderGeom(e),e);
    case 'insert':return childEnts(e).map(one).join('');case 'fcf':return G(fcfGeom(e),e);case 'datum':{const g=datumGeom(e);return G(g,e)+`<path d="${pth(g.tri,true)}" fill="${svgColor(e,mono)}"/>`}case 'image':return EXT.image.svg(e);case 'point':return`<circle cx="${f(e.p.x)}" cy="${f(e.p.y)}" r="${f(0.5/k)}" fill="${svgColor(e,mono)}"/>`;default:return''}};
  for(const e of list)if(e.type!=='hatch'&&e.type!=='wall'&&e.type!=='xline')out.push(one(e));
  return out.join('\n')}
function modelSVG(){const list=doc.ents.filter(visible),b=extents(list);const pad=Math.max(b.x1-b.x0,b.y1-b.y0)*0.03+200;
  const x0=b.x0-pad,y0=b.y0-pad,w=b.x1-b.x0+2*pad,h=b.y1-b.y0+2*pad;
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${-(y0+h)} ${w} ${h}" width="${(w/1000*20).toFixed(0)}mm" height="${(h/1000*20).toFixed(0)}mm"><rect x="${x0}" y="${-(y0+h)}" width="${w}" height="${h}" fill="#fff"/><g transform="scale(1 -1)" stroke-linecap="round" stroke-linejoin="round">${entsSVG(list,1/50,false)}</g></svg>`}
async function svgToPNG(svg,wpx,hpx){const img=new Image();const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=url});
  const c=document.createElement('canvas');c.width=wpx;c.height=hpx;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,wpx,hpx);x.drawImage(img,0,0,wpx,hpx);URL.revokeObjectURL(url);return await new Promise(r=>c.toBlob(r,'image/png'))}

/* ============ DXF ============ */
function dxfOut(){const o=[];const g=(c,v)=>o.push(String(c),String(v));const aciN=c=>typeof c==='number'?c:7;
  g(0,'SECTION');g(2,'HEADER');g(9,'$ACADVER');g(1,'AC1009');g(9,'$LTSCALE');g(40,doc.ltscale);g(9,'$INSUNITS');g(70,4);g(0,'ENDSEC');
  g(0,'SECTION');g(2,'TABLES');g(0,'TABLE');g(2,'LTYPE');g(70,Object.keys(LTYPES).length);
  for(const[k,v]of Object.entries(LTYPES)){g(0,'LTYPE');g(2,k);g(70,0);g(3,k);g(72,65);g(73,v?v.length:0);g(40,v?v.reduce((a,b)=>a+Math.abs(b),0):0);for(const x of v||[])g(49,x)}g(0,'ENDTAB');
  g(0,'TABLE');g(2,'LAYER');g(70,doc.layers.length);for(const L of doc.layers){g(0,'LAYER');g(2,L.name);g(70,(L.frozen?1:0)|(L.locked?4:0));g(62,(L.on?1:-1)*aciN(L.color));g(6,L.lt)}g(0,'ENDTAB');g(0,'ENDSEC');
  g(0,'SECTION');g(2,'ENTITIES');
  const common=e=>{g(8,e.layer);if(e.color!=='BL'&&typeof e.color==='number')g(62,e.color);if(e.lt&&e.lt!=='BL')g(6,e.lt);if(e.th)g(39,e.th)};
  const T=(t,e)=>{g(0,'TEXT');common(e);g(10,t.p.x);g(20,t.p.y);g(30,0);g(40,t.h);g(1,String(t.s).replace(/\n/g,' '));g(50,(t.rot||0)*R2D);const h=t.al==='c'?1:t.al==='r'?2:0,v=t.vb==='m'?2:t.vb==='t'?3:0;if(h||v){g(72,h);g(73,v);g(11,t.p.x);g(21,t.p.y);g(31,0)}};
  const PL=(pts,cl,e)=>{g(0,'POLYLINE');common(e);g(66,1);g(10,0);g(20,0);g(30,0);g(70,cl?1:0);for(const p of pts){g(0,'VERTEX');g(8,e.layer);g(10,p.x);g(20,p.y);g(30,0)}g(0,'SEQEND');g(8,e.layer)};
  const LN=(a,b,e)=>{g(0,'LINE');common(e);g(10,a.x);g(20,a.y);g(30,0);g(11,b.x);g(21,b.y);g(31,0)};
  const one=e=>{switch(e.type){
    case 'line':LN(e.a,e.b,e);break;case 'pline':PL(e.pts,e.closed,e);break;
    case 'circle':g(0,'CIRCLE');common(e);g(10,e.c.x);g(20,e.c.y);g(30,0);g(40,e.r);break;
    case 'arc':g(0,'ARC');common(e);g(10,e.c.x);g(20,e.c.y);g(30,0);g(40,e.r);g(50,normA(e.a0)*R2D);g(51,normA(e.a1)*R2D);break;
    case 'ellipse':PL(ellPts(e,72).slice(0,-1),true,e);break;case 'spline':PL(splinePts(e.pts,e.closed,10),false,e);break;
    case 'point':g(0,'POINT');common(e);g(10,e.p.x);g(20,e.p.y);g(30,0);break;case 'text':T(e,e);break;
    case 'xline':{const q=primsC(e)[0];LN(q.a,q.b,e);break}
    case 'hatch':for(const l of e.loops)PL(l,true,e);if(e.pat!=='SOLID')for(const[a,b]of hatchSegs(e.loops,e.pat,e.sc,e.ang))LN(a,b,e);break;
    case 'wall':{const w=wallPolys(e);for(const p of w.core.concat(w.ins))PL(p,true,{...e,th:e.h||doc.wall.h});break}
    case 'insert':childEnts(e).forEach(c=>one({...c,color:typeof c.color==='string'?'BL':c.color}));break;
    case 'dim':case 'leader':{const G_=e.type==='dim'?dimGeom(e):leaderGeom(e);G_.L.concat(G_.K||[]).forEach(([a,b])=>LN(a,b,e));(G_.AR||[]).forEach(a=>one({...e,type:'arc',...a}));
      G_.A.forEach(a=>{const d=nrm(a.dir),n=perp(d),b=sub(a.p,mul(d,a.s));g(0,'SOLID');common(e);const q=[a.p,add(b,mul(n,a.s*.18)),sub(b,mul(n,a.s*.18)),sub(b,mul(n,a.s*.18))];q.forEach((p,i)=>{g(10+i,p.x);g(20+i,p.y);g(30+i,0)})});G_.T.forEach(t=>T(t,e));break}}};
  doc.ents.filter(visible).forEach(one);g(0,'ENDSEC');g(0,'EOF');return o.join('\r\n')}
function dxfIn(text){const L=text.split(/\r?\n/);const pairs=[];for(let i=0;i+1<L.length;i+=2)pairs.push([+L[i].trim(),L[i+1].trim()]);
  const d=newDoc('Importado');d.layers=[];const out=[],blocks={};let i=0,sec=null,cur=null,curBlk=null;let n=0;
  const lay=(nm,c,lt)=>{if(!d.layers.some(l=>l.name===nm))d.layers.push({name:nm,color:Math.abs(c||7)||7,lt:LTYPES.hasOwnProperty(lt)?lt:'CONTINUOUS',lw:0.25,on:(c||1)>0,frozen:false,locked:false})};
  const cleanM=s=>s.replace(/\\P/g,'\n').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'').replace(/\\~/g,' ');
  function readEnt(){const t=pairs[i][1];const o={t,f:{},v:[]};i++;while(i<pairs.length&&pairs[i][0]!==0){const[c,v]=pairs[i];if(t==='LWPOLYLINE'&&c===10)o.v.push({x:+v});else if(t==='LWPOLYLINE'&&c===20&&o.v.length)o.v[o.v.length-1].y=+v;else{if(o.f[c]!==undefined&&!Array.isArray(o.f[c]))o.f[c]=[o.f[c]];if(Array.isArray(o.f[c]))o.f[c].push(v);else o.f[c]=v}i++}return o}
  const num_=(o,c,def=0)=>{const v=o.f[c];return v===undefined?def:+(Array.isArray(v)?v[0]:v)};
  function conv(o){const layer=o.f[8]||'0';lay(layer,7,'CONTINUOUS');const color=o.f[62]!==undefined?+o.f[62]:'BL';const base={layer,color:color===256?'BL':color===0?'BB':color,lt:o.f[6]&&o.f[6]!=='BYLAYER'?String(o.f[6]).toUpperCase():'BL',lw:-1};
    if(base.lt!=='BL'&&!LTYPES.hasOwnProperty(base.lt))base.lt='BL';
    const P2=(c)=>P(num_(o,c),num_(o,c+10));
    switch(o.t){case 'LINE':return{type:'line',a:P2(10),b:P2(11),...base};case 'CIRCLE':return{type:'circle',c:P2(10),r:num_(o,40),...base};
      case 'ARC':return{type:'arc',c:P2(10),r:num_(o,40),a0:num_(o,50)*D2R,a1:num_(o,51)*D2R,...base};case 'POINT':return{type:'point',p:P2(10),...base};
      case 'LWPOLYLINE':return o.v.length>1?{type:'pline',pts:o.v.map(p=>P(p.x,p.y||0)),closed:(num_(o,70)&1)===1,...base}:null;
      case 'TEXT':{const h72=num_(o,72),v73=num_(o,73);const al=h72===1||h72===4?'c':h72===2?'r':'l',vb=v73===2?'m':v73===3?'t':'b';return{type:'text',p:(h72||v73)&&o.f[11]!==undefined?P2(11):P2(10),h:num_(o,40,250),s:String(o.f[1]||''),rot:num_(o,50)*D2R,al,vb,...base}}
      case 'MTEXT':{const ap=num_(o,71,1);const al=[1,4,7].includes(ap)?'l':[2,5,8].includes(ap)?'c':'r',vb=ap<=3?'t':ap<=6?'m':'b';const s=[].concat(o.f[3]||[]).join('')+(o.f[1]||'');return{type:'text',p:P2(10),h:num_(o,40,250),s:cleanM(s),rot:num_(o,50)*D2R,al,vb,...base}}
      case 'ELLIPSE':{const c=P2(10),ax=P2(11),r=num_(o,40,1);return{type:'ellipse',c,rx:len(ax),ry:len(ax)*r,rot:Math.atan2(ax.y,ax.x),...base}}
      case 'INSERT':case 'DIMENSION':{const nm=String(o.f[2]||'');if(!nm)return null;return{type:'insert',name:nm.toUpperCase(),p:o.t==='DIMENSION'?P(0,0):P2(10),sx:num_(o,41,1),sy:num_(o,42,1),rot:num_(o,50)*D2R,...base}}
      default:return null}}
  while(i<pairs.length){const[c,v]=pairs[i];
    if(c===0&&v==='SECTION'){sec=pairs[i+1][1];i+=2;continue}if(c===0&&v==='ENDSEC'){sec=null;i++;continue}
    if(sec==='TABLES'&&c===0&&v==='LAYER'){const o=readEnt();lay(String(o.f[2]),+(o.f[62]||7),String(o.f[6]||'CONTINUOUS').toUpperCase());continue}
    if(sec==='BLOCKS'&&c===0&&v==='BLOCK'){const o=readEnt();curBlk={name:String(o.f[2]||'').toUpperCase(),label:String(o.f[2]),kind:'user',base:P(num_(o,10),num_(o,20)),ents:[]};continue}
    if(sec==='BLOCKS'&&c===0&&v==='ENDBLK'){if(curBlk&&curBlk.name)blocks[curBlk.name]=curBlk;curBlk=null;readEnt();continue}
    if((sec==='ENTITIES'||sec==='BLOCKS')&&c===0){
      if(v==='POLYLINE'){const o=readEnt();const pts=[];while(i<pairs.length&&pairs[i][1]==='VERTEX'){const vx=readEnt();pts.push(P(num_(vx,10),num_(vx,20)))}if(pairs[i]&&pairs[i][1]==='SEQEND')readEnt();
        const layer=o.f[8]||'0';lay(layer);const e={type:'pline',pts,closed:(num_(o,70)&1)===1,layer,color:o.f[62]!==undefined?+o.f[62]:'BL',lt:'BL',lw:-1};if(pts.length>1)(curBlk?curBlk.ents:out).push(e);continue}
      const o=readEnt();const e=conv(o);if(e){n++;if(curBlk){if(e.layer==='0'&&e.color==='BL')e.color='BB';curBlk.ents.push(e)}else out.push(e)}continue}
    i++}
  if(!d.layers.some(l=>l.name==='0'))d.layers.unshift({name:'0',color:7,lt:'CONTINUOUS',lw:0.25,on:true,frozen:false,locked:false});
  for(const s of STD_LAYERS)if(!d.layers.some(l=>l.name===s[0]))d.layers.push({name:s[0],color:s[1],lt:s[2],lw:s[3],on:true,frozen:false,locked:false});
  d.blocks=Object.assign(builtinBlocks(),blocks);out.forEach(e=>{e.id=d.nextId++});d.ents=out.filter(e=>e.type!=='insert'||d.blocks[e.name]);return d}
$('#fileIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;const t=await f.text();e.target.value='';
  try{if(/^\s*\{/.test(t)){const d=JSON.parse(t);loadDoc(d);toast('Desenho aberto: '+f.name)}else{const d=dxfIn(t);d.name=f.name.replace(/\.[^.]+$/,'');loadDoc(d);toast(`DXF importado: ${d.ents.length} objeto(s)`);log(`DXF importado: ${d.ents.length} objeto(s), ${d.layers.length} camada(s), ${Object.keys(d.blocks).length} bloco(s)`)}}catch(err){console.error(err);toast('Arquivo não reconhecido: '+err.message)}};
function dlgExport(){modal('Exportar',`<div class="flist">
  <div><span><b>DXF</b> (R12, compatível com AutoCAD, BricsCAD, LibreCAD, QCAD) — compactado em ZIP</span><button class="tb" data-ex="dxf">Baixar</button></div>
  <div><span><b>SVG</b> vetorial do modelo inteiro</span><button class="tb" data-ex="svg">Baixar</button></div>
  <div><span><b>PNG</b> da vista atual</span><button class="tb" data-ex="png">Baixar</button></div>
  <div><span><b>IFC4</b> BIM (paredes com vãos, portas, janelas, pilares, mobiliário e ambientes) — ZIP</span><button class="tb" data-ex="ifc">Baixar</button></div>
  <div><span><b>JSON</b> GPlanSiS|Drawings (reabre com tudo: camadas, blocos, paredes)</span><button class="tb" data-ex="json">Baixar</button></div></div>
  <p class="small">Para PDF em escala, use Plotar.</p>`,[{label:'Fechar',fn:()=>{}}]);
  $('#mdlB').onclick=async ev=>{const k=ev.target.dataset.ex;if(!k)return;const base=(doc.name||'desenho').replace(/[^\w\-]+/g,'_');
    if(k==='ifc'){closeModal();startCmd('IFCEXPORT');return}
    if(k==='json')download(base+'.json',JSON.stringify(doc),'application/json');
    if(k==='svg')download(base+'.svg',modelSVG(),'image/svg+xml');
    if(k==='png'){cv.toBlob(b=>download(base+'.png',b,'image/png'),'image/png')}
    if(k==='dxf'){const dx=dxfOut();try{await loadScript(JSZIP);const z=new JSZip();z.file(base+'.dxf',dx);const blob=await z.generateAsync({type:'blob'});download(base+'_dxf.zip',blob,'application/zip')}catch(err){download(base+'.dxf.txt',dx,'text/plain');toast('ZIP indisponível: baixando como .txt (renomeie para .dxf)')}}}}
/* ============ plotagem ============ */
const PAPERS={A4:[297,210],A3:[420,297],A2:[594,420],A1:[841,594],A0:[1189,841]};
let PLT={paper:'A3',orient:'L',scale:'50',area:'ext',mono:true,proj:'Apartamento 2B',title:'Planta baixa',client:'',author:'',sheet:'A-101'};
function plotGeom(){const[pw0,ph0]=PAPERS[PLT.paper];const W=PLT.orient==='L'?pw0:ph0,H=PLT.orient==='L'?ph0:pw0,m=10,tbh=PLT.paper==='A4'?28:36;
  const list=doc.ents.filter(visible);const b=PLT.area==='view'?(()=>{const a=s2w(P(0,0)),c=s2w(P(V.w,V.h));return{x0:a.x,y0:c.y,x1:c.x,y1:a.y}})():extents(list);
  const ax0=m+5,ay0=m+5,aw=W-2*m-10,ah=H-2*m-10-tbh;const k=PLT.scale==='fit'?Math.min(aw/Math.max(1,b.x1-b.x0),ah/Math.max(1,b.y1-b.y0)):1/(+PLT.scale);
  return{W,H,k,cx:(b.x0+b.x1)/2,cy:(b.y0+b.y1)/2,px:ax0+aw/2,py:ay0+ah/2,vps:!!(doc.vps&&doc.vps.length),papel:PLT.paper,orient:PLT.orient,escala:PLT.scale}}
async function pdfVetorial(){const g=plotGeom();await loadScript('/vendor/jspdf.umd.min.js');await loadScript('/vendor/svg2pdf.umd.min.js');
  const box=document.createElement('div');box.style.cssText='position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden';box.innerHTML=plotSVG();document.body.appendChild(box);
  try{const pdf=new window.jspdf.jsPDF({orientation:g.W>g.H?'landscape':'portrait',unit:'mm',format:[g.W,g.H],compress:true});
    pdf.setProperties({title:PLT.title||doc.name,subject:PLT.proj||'',author:PLT.author||'',creator:'GPlanSiS|Drawings'});
    await pdf.svg(box.querySelector('svg'),{x:0,y:0,width:g.W,height:g.H});return pdf.output('blob')}finally{box.remove()}}
function plotSVG(){const[pw0,ph0]=PAPERS[PLT.paper];const W=PLT.orient==='L'?pw0:ph0,H=PLT.orient==='L'?ph0:pw0,m=10,tbw=Math.min(180,W-2*m),tbh=PLT.paper==='A4'?28:36;
  const list=doc.ents.filter(visible);const b=PLT.area==='view'?(()=>{const a=s2w(P(0,0)),c=s2w(P(V.w,V.h));return{x0:a.x,y0:c.y,x1:c.x,y1:a.y}})():extents(list);
  const ax0=m+5,ay0=m+5,aw=W-2*m-10,ah=H-2*m-10-tbh;let k;if(PLT.scale==='fit')k=Math.min(aw/Math.max(1,b.x1-b.x0),ah/Math.max(1,b.y1-b.y0));else k=1/(+PLT.scale);
  const cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,px=ax0+aw/2,py=ay0+ah/2;const sl=doc.vps&&doc.vps.length?'Indicada':PLT.scale==='fit'?'1:'+fmt(1/k,0):'1:'+PLT.scale;
  const tx=W-m-tbw,ty=H-m-tbh,f=n=>+n.toFixed(2),col=[0,0.36,0.62,0.82,1].map(t=>tx+t*tbw);
  const T=(x,y,s,sz=2.5,w=400,c='#000')=>`<text x="${f(x)}" y="${f(y)}" font-size="${sz}" font-weight="${w}" fill="${c}" font-family="IBM Plex Sans, Arial, sans-serif">${esc(s)}</text>`;
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">
<rect width="${W}" height="${H}" fill="#fff"/><defs><clipPath id="vp"><rect x="${m}" y="${m}" width="${W-2*m}" height="${H-2*m-tbh}"/></clipPath></defs>
${doc.vps&&doc.vps.length?vpSVG(m,tbh,W,H):`<g clip-path="url(#vp)"><g transform="translate(${f(px)} ${f(py)}) scale(${k} ${-k}) translate(${-cx} ${-cy})" stroke-linecap="round" stroke-linejoin="round">${entsSVG(list,k,PLT.mono)}</g></g>`}
<rect x="${m}" y="${m}" width="${W-2*m}" height="${H-2*m}" fill="none" stroke="#000" stroke-width="0.5"/>
<rect x="${tx}" y="${ty}" width="${tbw}" height="${tbh}" fill="#fff" stroke="#000" stroke-width="0.5"/>
<path d="M${col[1]} ${ty}V${ty+tbh}M${col[2]} ${ty}V${ty+tbh}M${col[3]} ${ty}V${ty+tbh}M${col[1]} ${ty+tbh/2}H${tx+tbw}" stroke="#000" stroke-width="0.25"/>
${T(tx+3,ty+6,'GPlanSiS|Drawings',3.2,600)}${T(tx+3,ty+11,PLT.proj,2.4)}${T(tx+3,ty+tbh-8,PLT.client?('Cliente: '+PLT.client):'',2)}${T(tx+3,ty+tbh-3.5,PLT.author?('Desenho: '+PLT.author):'',2)}
${T(col[1]+2,ty+4,'Título',1.8,400,'#555')}${T(col[1]+2,ty+tbh/2-3,PLT.title,2.8,600)}${T(col[2]+2,ty+4,'Escala',1.8,400,'#555')}${T(col[2]+2,ty+tbh/2-3,sl,3.2,600)}
${T(col[3]+2,ty+4,'Folha',1.8,400,'#555')}${T(col[3]+2,ty+tbh/2-3,PLT.sheet,3.2,600)}${T(col[1]+2,ty+tbh/2+4,'Data',1.8,400,'#555')}${T(col[1]+2,ty+tbh-4,new Date().toLocaleDateString('pt-BR'),2.4)}
${T(col[2]+2,ty+tbh/2+4,'Formato',1.8,400,'#555')}${T(col[2]+2,ty+tbh-4,PLT.paper+(PLT.orient==='L'?' paisagem':' retrato'),2.4)}${PLT.docCode?T(col[3]+2,ty+tbh/2+4,'Documento · Rev.',1.8,400,'#555')+T(col[3]+2,ty+tbh-4,PLT.docCode+' · '+(PLT.docRev||''),2.1,600):T(col[3]+2,ty+tbh/2+4,'Unidade',1.8,400,'#555')+T(col[3]+2,ty+tbh-4,'mm',2.4)}
</svg>`}
function dlgPlot(){if(PLT.projDoc!==doc.name){PLT.proj=doc.name;PLT.projDoc=doc.name}const sel=(id,opts,v)=>`<select id="${id}">${opts.map(([a,b])=>`<option value="${a}"${String(v)===String(a)?' selected':''}>${b}</option>`).join('')}</select>`;
  modal('Plotar folha',`<div class="cols2"><div>
  <div class="field"><label>Papel</label>${sel('pl_p',Object.keys(PAPERS).map(k=>[k,k]),PLT.paper)}</div><div class="field"><label>Orientação</label>${sel('pl_o',[['L','Paisagem'],['P','Retrato']],PLT.orient)}</div>
  <div class="field"><label>Escala</label>${sel('pl_s',[['20','1:20'],['25','1:25'],['50','1:50'],['75','1:75'],['100','1:100'],['200','1:200'],['500','1:500'],['fit','Ajustar à folha']],PLT.scale)}</div>
  <div class="field"><label>Área</label>${sel('pl_a',[['ext','Extensão do desenho'],['view','Vista atual']],PLT.area)}</div>
  <label class="chk"><input type="checkbox" id="pl_m" ${PLT.mono?'checked':''}> Monocromático (monochrome.ctb)</label></div><div>
  <div class="field"><label>Projeto</label><input id="pl_pr" value="${esc(PLT.proj)}"></div><div class="field"><label>Título</label><input id="pl_t" value="${esc(PLT.title)}"></div>
  <div class="field"><label>Cliente</label><input id="pl_c" value="${esc(PLT.client)}"></div><div class="field"><label>Desenhista</label><input id="pl_au" value="${esc(PLT.author)}"></div><div class="field"><label>Folha</label><input id="pl_sh" value="${esc(PLT.sheet)}"></div></div></div>
  <div class="ph">Viewports da folha</div><div id="vpBox"></div>
  <div id="plotPrev" style="margin-top:8px"></div><p class="small" id="pl_info"></p>`,
  [{label:'SVG vetorial',keep:true,fn:()=>download(`${PLT.sheet}_${PLT.paper}.svg`,plotSVG(),'image/svg+xml')},
   {label:'PNG 200 dpi',keep:true,fn:async()=>{const[a,b]=PAPERS[PLT.paper];const W=PLT.orient==='L'?a:b,H=PLT.orient==='L'?b:a;const k=200/25.4;download(`${PLT.sheet}_${PLT.paper}.png`,await svgToPNG(plotSVG(),Math.round(W*k),Math.round(H*k)),'image/png')}},
   {label:'PDF vetorial',primary:true,keep:true,fn:async()=>{const[a,b]=PAPERS[PLT.paper];const W=PLT.orient==='L'?a:b,H=PLT.orient==='L'?b:a,nome=`${PLT.sheet}_${PLT.paper}.pdf`;
      try{await loadScript('/vendor/jspdf.umd.min.js');await loadScript('/vendor/svg2pdf.umd.min.js');toast('Gerando PDF vetorial…',8000);
        // vetorial: linhas, arcos e textos continuam vetores (nítido em qualquer zoom, texto pesquisável)
        download(nome,await pdfVetorial(),'application/pdf')}
      catch(err){console.warn('PDF vetorial falhou; gerando em imagem',err);
        try{const k=220/25.4;const png=await svgToPNG(plotSVG(),Math.round(W*k),Math.round(H*k));const url=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(png)});
          const pdf=new window.jspdf.jsPDF({orientation:W>H?'landscape':'portrait',unit:'mm',format:[W,H]});pdf.addImage(url,'PNG',0,0,W,H);download(nome,pdf.output('blob'),'application/pdf');toast('PDF gerado em imagem (o vetorial falhou: '+err.message+')',5000)}
        catch(e2){toast('PDF indisponível: '+e2.message)}}}},
   {label:'Fechar',fn:()=>{}}]);
  const upd=()=>{Object.assign(PLT,{paper:$('#pl_p').value,orient:$('#pl_o').value,scale:$('#pl_s').value,area:$('#pl_a').value,mono:$('#pl_m').checked,proj:$('#pl_pr').value,title:$('#pl_t').value,client:$('#pl_c').value,author:$('#pl_au').value,sheet:$('#pl_sh').value});
    $('#plotPrev').innerHTML=plotSVG();const b=extents();const[pw,ph]=PAPERS[PLT.paper];if(PLT.scale!=='fit'){const need=Math.max((b.x1-b.x0)/+PLT.scale,(b.y1-b.y0)/+PLT.scale);$('#pl_info').textContent=`Desenho ocupa ${fmt((b.x1-b.x0)/+PLT.scale,0)} × ${fmt((b.y1-b.y0)/+PLT.scale,0)} mm na folha (${PLT.paper}: ${pw} × ${ph} mm).`}else $('#pl_info').textContent=''};
  $('#mdlB').oninput=e=>{if(!e.target.closest('#vpBox'))upd()};$('#mdlB').onchange=e=>{if(!e.target.closest('#vpBox'))upd()};renderVP();upd()}

/* ============ script e IA ============ */
function dlgScript(prefill){modal('Script de comandos',`<p class="small">Uma entrada por linha, exatamente como você digitaria. Linha vazia = Enter. Exemplo: LINE, 0,0, 3000,0, (vazia).</p><textarea class="code" id="scr">${esc(prefill||'CLAYER\nA-WALL\nWALL\n0,0\n5000,0\n5000,4000\n0,4000\nF\nROOMTAG\nSALA\n2500,2000\nZE')}</textarea>`,
  [{label:'Fechar',fn:()=>{}},{label:'Executar',primary:true,fn:()=>{const lines=$('#scr').value.replace(/\r/g,'').split('\n');while(lines.length&&lines[lines.length-1]==='')lines.pop();runScript(lines,25,()=>{log('Script concluído');toast('Script concluído')})}}])}
let _ai=null;
async function dlgAI(){modal('Assistente de desenho',`<p class="small">Descreva o que quer desenhar. A IA propõe um script de comandos; você revisa e decide se executa.</p>
  <textarea class="code" id="aiq" style="min-height:90px" placeholder="Ex.: um estúdio de 6 × 5 m com banheiro de 2 × 2,4 m no canto, porta de entrada de 0,9 m e uma janela de 1,5 m na parede sul">${esc(_ai||'')}</textarea>
  <div id="aiOut" style="margin-top:8px"></div>`,[{label:'Fechar',fn:()=>{}},{label:'Gerar proposta',primary:true,keep:true,fn:()=>{aiGenerate()}}])}
async function aiGenerate(){const q=$('#aiq').value.trim();if(!q){toast('Descreva o desenho primeiro');return}_ai=q;const out=$('#aiOut');out.innerHTML='<p class="small">Gerando proposta…</p>';
  let sample=null;try{sample=window.claude&&claude.use?await claude.use('sample'):null}catch(_){}
  if(!sample){out.innerHTML='<p class="small">O Assistente IA não está habilitado para você neste servidor (falta a permissão “IA” ou a chave da Anthropic no servidor). Fale com o administrador, ou escreva o script à mão em Script.</p>';return}
  const b=extents();const sys=`Você gera scripts para o GPlanSiS|Drawings, um CAD 2D estilo AutoCAD. Unidade: milímetro, Y para cima.
Cada item do array "linhas" é UMA entrada digitada; "" equivale a Enter. Coordenadas "x,y" absolutas ou "@dx,dy" relativas ao último ponto.
Comandos e sequências:
- CLAYER, nome  (camadas: ${doc.layers.map(l=>l.name).join(', ')})
- LINE, p1, p2, …, ""   | PLINE, p1, p2, …, "F" (fecha) ou ""
- RECTANG, canto1, canto2 | CIRCLE, centro, raio | ARC, p1, p2, p3
- WALL, "E", espessura, "I", isolamento (0 = sem), "A", altura, p1, p2, …, "F" fecha ou "" encerra. Paredes de borda: espessura 150–300; divisórias 100. Desenhe paredes pelo eixo.
- INSERT, nome, ponto, escalaX, escalaY ("" = igual X), rotação em graus. Blocos: DOOR (vão 1000, use escala 0.7–0.9; o ponto fica no eixo da parede, no centro do vão; rotação 0 = parede horizontal, folha abre para +Y; 180 abre para -Y; 90 em parede vertical abre para -X; 270 abre para +X), WINDOW (largura 1000 × escalaX, centro no eixo da parede, rotação 0 horizontal / 90 vertical), BED-D 1600×2000, BED-S 900×1900, SOFA 2200×900, TABLE4 1200×800 com cadeiras, WC, SINK, SHOWER 900, KITCHEN 3000×600, FRIDGE 700, WARDROBE 1800×600, DESK 1200×600, WASHER, TANK, TV, NORTH. Blocos são centrados no ponto.
- TEXT, "J", "MC", ponto, altura, rotação, texto
- ROOMTAG, nome, ponto interno do ambiente fechado (escreve nome e área)
- DIMLINEAR, p1, p2, posição da linha de cota | DIMCONTINUE, próximo ponto, …, ""
- HATCH, "P", padrão (ANSI31, SOLID, AR-CONC, GRID, BRICK), ponto interno, ""
- MOVE/COPY/ERASE: seleção com "W", canto1, canto2, "" (janela), depois ponto base e destino(s); COPY termina com "".
- ZE (zoom extensão) no fim.
Desenho atual: ${doc.ents.length} objeto(s)${doc.ents.length?`, extensão de (${fmt(b.x0,0)},${fmt(b.y0,0)}) a (${fmt(b.x1,0)},${fmt(b.y1,0)})`:''}. Não sobreponha o que já existe.
Responda SOMENTE JSON: {"resumo":"frase curta em português","linhas":["..."]}. No máximo 400 linhas.`;
  try{const r=await sample.json([{role:'user',content:sys+'\n\nPedido: '+q}],{modelTier:'complex'});if(!r||!Array.isArray(r.linhas))throw new Error('resposta sem linhas');
    out.innerHTML=`<p><b>Proposta:</b> ${esc(r.resumo||'')}</p><textarea class="code" id="aiScr">${esc(r.linhas.map(String).join('\n'))}</textarea><div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end"><button class="tb" id="aiRun" style="font-weight:600">Executar no desenho</button></div><p class="small">Revise antes: o script roda como se você digitasse. Ctrl+Z desfaz comando a comando.</p>`;
    $('#aiRun').onclick=()=>{const lines=$('#aiScr').value.replace(/\r/g,'').split('\n');closeModal();runScript(lines,25,()=>{zoomExt();toast('Proposta da IA aplicada')})}}
  catch(err){out.innerHTML=`<p class="small">Não foi possível gerar: ${esc(err.message||err.code||'erro')}. Tente reformular o pedido.</p>`}}
/* ============ RECURSOS AVANÇADOS ============ */
const EXT={};
const PCLIP='/vendor/polygon-clipping.umd.min.js';

/* ---------- 1. restrições paramétricas ---------- */
if(!ST.cons)ST.cons=true;
const CNAME={H:'Horizontal',V:'Vertical',PAR:'Paralela',PERP:'Perpendicular',COI:'Coincidente',FIX:'Fixo',EQ:'Igual',DL:'Comprimento',DH:'Dist. horizontal',DV:'Dist. vertical',DR:'Raio',DD:'Distância'};
const CGLYPH={H:'H',V:'V',PAR:'∥',PERP:'⊥',COI:'●',FIX:'⚓',EQ:'='};
const lineLike=e=>e&&(e.type==='line'||e.type==='wall');
const circLike=e=>e&&(e.type==='circle'||e.type==='arc');
function nearKey(e,p){if(circLike(e))return'c';return dist(p,e.a)<=dist(p,e.b)?'a':'b'}
function evalExpr(s,vals){const t=String(s).replace(/,/g,'.').replace(/[A-Za-z_]\w*/g,m=>{if(!(m in vals))throw new Error('parâmetro desconhecido: '+m);return'('+vals[m]+')'});
  if(!/^[\d+\-*/().\s eE]*$/.test(t))throw new Error('expressão inválida');const v=Function('"use strict";return ('+t+')')();if(!isFinite(v))throw new Error('resultado inválido');return v}
function evalParams(){const cs=(doc.cons||[]).filter(c=>c.name);const vals={};for(let pass=0;pass<cs.length+1;pass++){let ok=true;for(const c of cs){try{c.v=evalExpr(c.expr,vals);vals[c.name]=c.v;c.err=null}catch(err){ok=false;c.err=err.message}}if(ok)break}return vals}
function solveCons(quiet){
  if(!doc.cons||!doc.cons.length)return true;
  doc.cons=doc.cons.filter(c=>c.ids.every(id=>{const e=entById(id);return e&&(lineLike(e)||circLike(e))}));if(!doc.cons.length)return true;
  evalParams();
  const x=[],vars=[],vmap=new Map();
  const vi=(id,k)=>{const key=id+':'+k;if(vmap.has(key))return vmap.get(key);const e=entById(id),i=x.length;if(k==='r'){x.push(e.r);vars.push([e,k])}else{x.push(e[k].x,e[k].y);vars.push([e,k])}vmap.set(key,i);return i};
  const Pt=(id,k)=>{const i=vi(id,k);return()=>P(x[i],x[i+1])},Rv=id=>{const i=vi(id,'r');return()=>x[i]};
  const Ln=id=>{const a=Pt(id,'a'),b=Pt(id,'b');return()=>sub(b(),a())};
  const R=[];
  for(const c of doc.cons){const[i1,i2]=c.ids;const e1=entById(i1),e2=i2!=null?entById(i2):null;
    switch(c.t){
      case 'H':{const a=Pt(i1,'a'),b=Pt(i1,'b');R.push(()=>b().y-a().y);break}
      case 'V':{const a=Pt(i1,'a'),b=Pt(i1,'b');R.push(()=>b().x-a().x);break}
      case 'PAR':{const d1=Ln(i1),d2=Ln(i2);R.push(()=>{const u=d1(),v=d2();return crs(u,v)/(len(u)*len(v)||1)*1000});break}
      case 'PERP':{const d1=Ln(i1),d2=Ln(i2);R.push(()=>{const u=d1(),v=d2();return dot(u,v)/(len(u)*len(v)||1)*1000});break}
      case 'COI':{const p=Pt(i1,c.k[0]),q=Pt(i2,c.k[1]);R.push(()=>p().x-q().x,()=>p().y-q().y);break}
      case 'FIX':{const p=Pt(i1,c.k[0]);R.push(()=>p().x-c.at.x,()=>p().y-c.at.y);break}
      case 'EQ':{if(lineLike(e1)){const d1=Ln(i1),d2=Ln(i2);R.push(()=>len(d1())-len(d2()))}else{const r1=Rv(i1),r2=Rv(i2);R.push(()=>r1()-r2())}break}
      case 'DL':{const d=Ln(i1);R.push(()=>len(d())-c.v);break}
      case 'DH':{const d=Ln(i1);R.push(()=>Math.abs(d().x)-c.v);break}
      case 'DV':{const d=Ln(i1);R.push(()=>Math.abs(d().y)-c.v);break}
      case 'DR':{const r=Rv(i1);R.push(()=>r()-(c.dia?c.v/2:c.v));break}
      case 'DD':{const p=Pt(i1,c.k[0]),q=Pt(i2,c.k[1]);R.push(()=>dist(p(),q())-c.v);break}}}
  const n=x.length,m=R.length,x0=x.slice();const F=()=>R.map(f=>f());const E=f=>f.reduce((s,v)=>s+v*v,0);
  let f=F(),err=E(f),lam=1e-3;const w=1e-8;
  for(let it=0;it<80&&err>1e-12;it++){
    const J=[];for(let j=0;j<n;j++){const h=1e-6*Math.max(1,Math.abs(x[j]));const o=x[j];x[j]=o+h;const fj=F();x[j]=o;J.push(fj.map((v,i)=>(v-f[i])/h))}
    const A=[...Array(n)].map(()=>new Float64Array(n)),g=new Float64Array(n);
    for(let a=0;a<n;a++){for(let i=0;i<m;i++)g[a]+=J[a][i]*f[i];g[a]+=w*(x[a]-x0[a]);for(let b=a;b<n;b++){let s=0;for(let i=0;i<m;i++)s+=J[a][i]*J[b][i];A[a][b]=A[b][a]=s}}
    let improved=false;
    for(let tries=0;tries<12;tries++){const M=A.map((r,i)=>{const q=Float64Array.from(r);q[i]+=lam*(r[i]||1)+w;return q});const d=gauss(M,Array.from(g,v=>-v));if(!d)break;
      const xs=x.slice();for(let j=0;j<n;j++)x[j]+=d[j];const f2=F(),e2=E(f2);if(e2<err){f=f2;err=e2;lam=Math.max(1e-12,lam/4);improved=true;break}for(let j=0;j<n;j++)x[j]=xs[j];lam*=6}
    if(!improved)break}
  const ok=err<1e-6;
  if(ok){for(let i=0;i<vars.length;i++){}for(const[key,i]of vmap){const[id,k]=key.split(':');const e=entById(+id);if(k==='r')e.r=x[i];else e[k]=P(x[i],x[i+1])}_dirty++;_openCache=null;_regionCache=null}
  else if(!quiet)logE('Restrições conflitantes ou impossíveis: a geometria não foi alterada. Revise em PARÂMETROS.');
  return ok}
function gauss(A,b){const n=b.length;for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;if(Math.abs(A[p][c])<1e-14)continue;[A[c],A[p]]=[A[p],A[c]];[b[c],b[p]]=[b[p],b[c]];
  for(let r=0;r<n;r++){if(r===c)continue;const k=A[r][c]/A[c][c];if(!k)continue;for(let q=c;q<n;q++)A[r][q]-=k*A[c][q];b[r]-=k*b[c]}}
  return b.map((v,i)=>Math.abs(A[i][i])<1e-14?0:v/A[i][i])}
function addCons(c){doc.cons=doc.cons||[];doc.cons.push(c);if(!solveCons()){doc.cons.pop();logE('Essa restrição conflita com as existentes e foi descartada.');return false}dirty();logR(`Restrição: ${CNAME[c.t]}${c.name?` ${c.name} = ${c.expr}`:''}`);return true}
function nextPName(){doc.pn=(doc.pn||0)+1;return'd'+doc.pn}
const fL={filter:lineLike},fC={filter:circLike},fLC={filter:e=>lineLike(e)||circLike(e)};
function geomCmd(name,al,t,desc,two){defCmd(name,{al,desc},function*(){for(;;){const r1=yield pickq((two?'Primeira linha':'Linha')+` (${CNAME[t]})`,fL);if(!r1)return;
  if(two){const r2=yield pickq('Segunda linha',{filter:e=>lineLike(e)&&e!==r1.e});if(!r2)return;addCons({t,ids:[r1.e.id,r2.e.id]})}else addCons({t,ids:[r1.e.id]})}})}
geomCmd('GCHORIZONTAL',['GCH','RHORIZONTAL'],'H','Restrição horizontal');geomCmd('GCVERTICAL',['GCV','RVERTICAL'],'V','Restrição vertical');
geomCmd('GCPARALLEL',['GCPA','RPARALELA'],'PAR','Restrição de paralelismo',true);geomCmd('GCPERPENDICULAR',['GCPE','RPERP'],'PERP','Restrição perpendicular',true);
defCmd('GCCOINCIDENT',{al:['GCC','RCOINCIDENTE'],desc:'Pontos coincidentes'},function*(){for(;;){const r1=yield pickq('Clique perto do 1º ponto (extremidade ou centro)',fLC);if(!r1)return;const r2=yield pickq('Clique perto do 2º ponto',{filter:e=>(lineLike(e)||circLike(e))&&e!==r1.e});if(!r2)return;addCons({t:'COI',ids:[r1.e.id,r2.e.id],k:[nearKey(r1.e,r1.p),nearKey(r2.e,r2.p)]})}});
defCmd('GCFIX',{al:['GCF','RFIXO'],desc:'Fixar ponto'},function*(){for(;;){const r=yield pickq('Clique perto do ponto a fixar',fLC);if(!r)return;const k=nearKey(r.e,r.p);addCons({t:'FIX',ids:[r.e.id],k:[k],at:clone(r.e[k])})}});
defCmd('GCEQUAL',{al:['GCE','RIGUAL'],desc:'Comprimentos ou raios iguais'},function*(){const r1=yield pickq('Primeiro objeto',fLC);if(!r1)return;for(;;){const r2=yield pickq('Objeto igual ao primeiro (Enter encerra)',{filter:e=>e!==r1.e&&(lineLike(r1.e)?lineLike(e):circLike(e))});if(!r2)return;addCons({t:'EQ',ids:[r1.e.id,r2.e.id]})}});
function* dimCons(t){const filt=t==='DR'?fC:fL;for(;;){const r=yield pickq(t==='DR'?'Círculo ou arco':'Linha ou parede',filt);if(!r)return;const e=r.e;
  const cur=t==='DR'?e.r:t==='DH'?Math.abs(e.b.x-e.a.x):t==='DV'?Math.abs(e.b.y-e.a.y):dist(e.a,e.b);const nm=nextPName();
  const ex=yield txtq(`Valor ou expressão de ${nm} (pode usar d1, d2…)`,{def:fmtN(cur,2)});if(ex==null)return;addCons({t,ids:[e.id],name:nm,expr:String(ex||cur).trim()})}}
defCmd('DCLINEAR',{al:['DCL','DCALIGNED','DCA','RCOMPRIMENTO'],desc:'Cota paramétrica de comprimento'},function*(){yield* dimCons('DL')});
defCmd('DCHORIZONTAL',{al:['DCH'],desc:'Cota paramétrica horizontal'},function*(){yield* dimCons('DH')});
defCmd('DCVERTICAL',{al:['DCV'],desc:'Cota paramétrica vertical'},function*(){yield* dimCons('DV')});
defCmd('DCRADIUS',{al:['DCR','RRAIO'],desc:'Raio paramétrico'},function*(){yield* dimCons('DR')});
defCmd('AUTOCONSTRAIN',{al:['AUTORESTRINGIR','AUTOC'],desc:'Aplicar restrições automaticamente'},function*(){const s=(yield* getSel('Linhas e paredes a restringir')).filter(lineLike);let n=0;const has=(t,a,b)=>(doc.cons||[]).some(c=>c.t===t&&c.ids[0]===a&&(b==null||c.ids[1]===b));
  for(const e of s){const a=normA(ang(e.a,e.b))*R2D%180;if((a<1||a>179)&&!has('H',e.id)){doc.cons=doc.cons||[];doc.cons.push({t:'H',ids:[e.id]});n++}else if(Math.abs(a-90)<1&&!has('V',e.id)){doc.cons=doc.cons||[];doc.cons.push({t:'V',ids:[e.id]});n++}}
  for(let i=0;i<s.length;i++)for(let j=i+1;j<s.length;j++)for(const ka of['a','b'])for(const kb of['a','b'])if(dist(s[i][ka],s[j][kb])<1){doc.cons.push({t:'COI',ids:[s[i].id,s[j].id],k:[ka,kb]});n++}
  if(solveCons())logR(n+' restrição(ões) aplicadas');else{logE('Falhou: restrições removidas');doc.cons=doc.cons.slice(0,doc.cons.length-n)}dirty()});
defCmd('DELCONSTRAINT',{al:['DELCON','REMOVERRESTRICOES'],desc:'Remover restrições dos objetos'},function*(){const s=yield* getSel();const ids=new Set(s.map(e=>e.id));const b=(doc.cons||[]).length;doc.cons=(doc.cons||[]).filter(c=>!c.ids.some(i=>ids.has(i)));logR((b-doc.cons.length)+' restrição(ões) removida(s)');dirty()});
defCmd('CONSTRAINTBAR',{al:['CBAR','MOSTRARRESTRICOES'],instant:true,transparent:true,desc:'Mostrar/ocultar restrições'},()=>{ST.cons=!ST.cons;saveSettings();requestDraw()});
defCmd('PARAMETERS',{al:['PARAM','PARAMETROS','PARÂMETROS'],instant:true,desc:'Gerenciador de parâmetros'},()=>dlgParams());
function dlgParams(){const cs=doc.cons||[];evalParams();
  modal('Gerenciador de parâmetros',cs.length?`<p class="small">Mude um valor ou escreva uma expressão (ex.: <b>d1/2</b>, <b>d2+300</b>). A geometria recalcula ao aplicar.</p><div class="flist">${cs.map((c,i)=>`<div><span><b>${c.name||CGLYPH[c.t]||''}</b> ${CNAME[c.t]} <small class="small">· objeto ${c.ids.join(', ')}</small>${c.err?`<br><small style="color:var(--danger)">${esc(c.err)}</small>`:''}</span>${c.name?`<input data-pi="${i}" value="${esc(c.expr)}" style="width:110px;padding:4px;border:1px solid var(--line);border-radius:4px;background:var(--panel2)"><small class="small" style="min-width:60px">= ${fmt(c.v,2)}</small>`:''}<button class="tb" data-pdel="${i}">×</button></div>`).join('')}</div>`
   :'<p>Nenhuma restrição ainda. Use a aba Paramétrico: restrições geométricas (horizontal, paralela, coincidente…) e cotas paramétricas (comprimento, raio).</p>',
   [{label:'Fechar',fn:()=>{}},{label:'Aplicar',primary:true,fn:()=>{withUndo(()=>{$$('[data-pi]').forEach(inp=>{cs[+inp.dataset.pi].expr=inp.value.trim()});solveCons()})}}]);
  $('#mdlB').onclick=e=>{const d=e.target.dataset.pdel;if(d!=null){withUndo(()=>{cs.splice(+d,1)});dlgParams()}}}
function drawConsOverlay(){if(!ST.cons||!doc.cons||!doc.cons.length)return;ctx.font='11px '+getComputedStyle(document.body).getPropertyValue('--mono');ctx.textBaseline='middle';ctx.textAlign='center';
  const cnt=new Map();for(const c of doc.cons){const e=entById(c.ids[0]);if(!e||!visible(e))continue;let p,lab;
    if(c.t==='COI'){const q=w2s(e[c.k[0]]);ctx.fillStyle=COL.accent;ctx.beginPath();ctx.arc(q.x,q.y,3.5,0,TAU);ctx.fill();continue}
    if(c.t==='FIX'){p=w2s(e[c.k[0]]);lab='⚓'}else if(lineLike(e)){p=w2s(mid(e.a,e.b));lab=c.name?`${c.name}=${fmt(c.v,0)}`:CGLYPH[c.t]}else{p=w2s(pol(e.c,e.r,Math.PI/4));lab=c.name?`${c.name}=R${fmt(c.dia?c.v/2:c.v,0)}`:CGLYPH[c.t]}
    const k=e.id+'';const i=cnt.get(k)||0;cnt.set(k,i+1);const w=ctx.measureText(lab).width+8;const x=p.x+(i%3)*(w+2)-0,y=p.y-14-Math.floor(i/3)*16;
    ctx.fillStyle=c.name?COL.accent:COL.panel;ctx.globalAlpha=.92;ctx.fillRect(x-w/2,y-7,w,14);ctx.globalAlpha=1;ctx.strokeStyle=COL.accent;ctx.lineWidth=1;ctx.strokeRect(x-w/2+.5,y-6.5,w-1,13);ctx.fillStyle=c.name?COL.panel:COL.accent;ctx.fillText(lab,x,y+.5)}}

/* ---------- 2. booleanas ---------- */
function toRing(e){let pts;if(e.type==='circle')pts=arcPts(e.c,e.r,0,TAU,3).slice(0,-1);else if(e.type==='ellipse')pts=ellPts(e,96).slice(0,-1);else if(e.type==='spline'&&e.closed)pts=splinePts(e.pts,true,10);else if(e.type==='pline'&&e.closed)pts=e.pts;else if(e.type==='hatch')pts=e.loops[0];else return null;
  const r=pts.map(p=>[Math.round(p.x*1000)/1000,Math.round(p.y*1000)/1000]);r.push(r[0]);return[r]}
const closedF=e=>(e.type==='pline'&&e.closed)||e.type==='circle'||e.type==='ellipse'||(e.type==='spline'&&e.closed);
function* boolCmd(op){
  try{yield* []}catch(_){}
  const A=(yield* getSel(op==='difference'?'Contornos base (de onde subtrair)':'Contornos fechados')).filter(closedF);if(!A.length){logE('Selecione polilinhas fechadas, círculos ou elipses');return}
  let B=[];if(op==='difference'||op==='xor'){B=(yield selq(op==='difference'?'Contornos a subtrair':'Segundo grupo',{noPre:true})).filter(e=>closedF(e)&&!A.includes(e));if(!B.length){logE('Nada para operar');return}}
  else if(A.length<2){logE('Selecione pelo menos dois contornos');return}
  try{await0(loadScript(PCLIP))}catch(_){}
  if(!window.polygonClipping){logE('Biblioteca de booleanas carregando… tente de novo em instantes');loadScript(PCLIP).catch(()=>{});return}
  const PCx=window.polygonClipping;let res;const gA=A.map(toRing),gB=B.map(toRing);
  if(op==='union')res=PCx.union(...gA);else if(op==='intersection')res=PCx.intersection(...gA);else if(op==='difference')res=PCx.difference(PCx.union(...gA),...gB);else res=PCx.xor(PCx.union(...gA),PCx.union(...gB));
  const base=A[0];[...A,...B].forEach(delEnt);let n=0,area=0;
  for(const poly of res)for(const ring of poly){const pts=ring.slice(0,-1).map(([x,y])=>P(x,y));if(pts.length<3)continue;area+=polyArea(pts);addEnt({type:'pline',pts:simplifyPoly(pts),closed:true,layer:base.layer,color:base.color,lt:base.lt,lw:base.lw,th:base.th});n++}
  logR(`${n} contorno(s) resultante(s) · área líquida ${fmtA(Math.abs(area))}`)}
function await0(){} // carregamento é disparado antes; ver preload abaixo
defCmd('UNION',{al:['UNI','UNIAO','UNIÃO'],desc:'União de contornos'},function*(){yield* boolCmd('union')});
defCmd('SUBTRACT',{al:['SU','SUBTRAIR'],desc:'Subtração de contornos'},function*(){yield* boolCmd('difference')});
defCmd('INTERSECT',{al:['IN','INTERSECAO','INTERSEÇÃO'],desc:'Interseção de contornos'},function*(){yield* boolCmd('intersection')});
defCmd('XOR',{al:['EXCLUSAO'],desc:'Ou exclusivo de contornos'},function*(){yield* boolCmd('xor')});
setTimeout(()=>loadScript(PCLIP).catch(()=>{}),1500);

/* ---------- 3. atributos de bloco ---------- */
EXT.attdef={draw(e,ov){stroke(e,ov);drawText({...e,s:'{'+e.tag+'}'},ctx.fillStyle)},bbox:e=>bboxPts(textBox({...e,s:'{'+e.tag+'}'})),dist:(e,p)=>inPoly(p,textBox({...e,s:'{'+e.tag+'}'}))?0:1e9,
  svg:()=>''};
defCmd('ATTDEF',{al:['ATT','ATRIBUTO'],desc:'Definir atributo de bloco'},function*(){const tag=String((yield txtq('Etiqueta (sem espaços, ex.: TAG)'))||'').trim().toUpperCase().replace(/\s+/g,'_');if(!tag)return;
  const pr=(yield txtq('Pergunta ao inserir',{def:tag}))||tag;const dv=(yield txtq('Valor padrão',{def:''}))||'';const p=yield pt('Ponto do texto');if(!p)return;const h=yield dst('Altura',{base:p,def:doc.textH});
  mk({type:'attdef',tag,prompt:pr,def:dv,p,h,rot:0,al:'c',vb:'m'})});
defCmd('ATTEDIT',{al:['ATE','EDITARATRIBUTOS'],desc:'Editar atributos de um bloco'},function*(){const r=yield pickq('Bloco com atributos',{filter:e=>e.type==='insert'&&(doc.blocks[e.name]||{ents:[]}).ents.some(c=>c.type==='attdef')});if(!r)return;const e=r.e;e.attrs=e.attrs||{};
  for(const a of doc.blocks[e.name].ents.filter(c=>c.type==='attdef')){const v=yield txtq(a.prompt,{def:e.attrs[a.tag]??a.def});if(v!=null)e.attrs[a.tag]=v}dirty()});
defCmd('ATTEXT',{al:['DATAEXTRACTION','EXTRAIRDADOS'],instant:true,desc:'Extrair atributos para CSV'},()=>{const rows=[['bloco','x','y','camada']];const tags=new Set();doc.ents.filter(e=>e.type==='insert').forEach(e=>Object.keys(e.attrs||{}).forEach(t=>tags.add(t)));const T=[...tags];rows[0].push(...T);
  doc.ents.filter(e=>e.type==='insert').forEach(e=>rows.push([e.name,fmtN(e.p.x),fmtN(e.p.y),e.layer,...T.map(t=>(e.attrs||{})[t]??'')]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');download((doc.name||'desenho')+'_blocos.csv','\ufeff'+csv,'text/csv');logR((rows.length-1)+' bloco(s) extraídos')});

/* ---------- 4. GD&T ---------- */
const GDT={P:['⌖','Posição'],F:['⏥','Planeza'],R:['⏤','Retitude'],C:['○','Circularidade'],Y:['⌭','Cilindricidade'],L:['⌒','Perfil de linha'],S:['⌓','Perfil de superfície'],A:['∠','Angularidade'],E:['⊥','Perpendicularidade'],A2:['∥','Paralelismo'],O:['◎','Concentricidade'],I:['⌯','Simetria'],B:['↗','Batimento'],T:['⌰','Batimento total']};
function fcfCells(e){const c=[GDT[e.sym]?GDT[e.sym][0]:e.sym,e.tol,...(e.dat||[]).filter(Boolean)];return c}
function fcfGeom(e){const h=e.h,H=h*2,cells=fcfCells(e);let x=0;const boxes=[];for(const[i,s]of cells.entries()){const w=Math.max(H,textW(s,h)+h*1.2);boxes.push({x,w,s});x+=w}
  const M=Mmul(Mtr(e.p.x,e.p.y),Mrot(e.rot||0));const T=p=>Map_(M,p);
  const L=[];L.push([T(P(0,0)),T(P(x,0))],[T(P(0,H)),T(P(x,H))]);for(const b of boxes)L.push([T(P(b.x,0)),T(P(b.x,H))]);L.push([T(P(x,0)),T(P(x,H))]);
  return{L,A:[],K:[],T:boxes.map(b=>({p:T(P(b.x+b.w/2,H/2)),rot:e.rot||0,s:b.s,h,al:'c',vb:'m'})),W:x,H}}
EXT.fcf={draw(e,ov){drawGeomG(fcfGeom(e),e,ov)},bbox:e=>bboxPts(fcfGeom(e).L.flat()),dist(e,p){const g=fcfGeom(e);const b=bboxPts(g.L.flat());return p.x>=b.x0&&p.x<=b.x1&&p.y>=b.y0&&p.y<=b.y1?0:1e9}};
function datumGeom(e){const h=e.h,u=nrm(sub(e.q,e.p)),n=perp(u),tri=[add(e.p,mul(n,h*0.6)),sub(e.p,mul(n,h*0.6)),add(e.p,mul(u,h*1.0))];const c=e.q,s=h*1.2;
  return{L:[[tri[2],sub(c,P(0,s))]].concat(plSegs([P(c.x-s,c.y-s),P(c.x+s,c.y-s),P(c.x+s,c.y+s),P(c.x-s,c.y+s)],true).map(q=>[q.a,q.b])),tri,T:[{p:c,rot:0,s:e.s,h,al:'c',vb:'m'}],A:[]}}
EXT.datum={draw(e,ov){const g=datumGeom(e);drawGeomG(g,e,ov);ctx.beginPath();pathPts(g.tri,true);ctx.fill()},bbox:e=>{const g=datumGeom(e);return bboxPts(g.L.flat().concat(g.tri))},dist(e,p){const b=EXT.datum.bbox(e);return p.x>=b.x0&&p.x<=b.x1&&p.y>=b.y0&&p.y<=b.y1?0:1e9}};
defCmd('TOLERANCE',{al:['TOL','GDT','TOLERANCIA'],desc:'Quadro de controle GD&T'},function*(){
  const keys=Object.keys(GDT);const k=yield kwq('Característica',keys.map(k=>GDT[k][1]+':'+k));if(!k)return;
  const tol=(yield txtq('Tolerância (ex.: Ø0,05 Ⓜ)',{def:'0,1'}))||'0,1';const d=String((yield txtq('Referências (datums), ex.: A|B|C',{def:''}))||'');
  const p=yield pt('Posição do quadro',{preview:q=>[G_({type:'fcf',p:q,h:doc.dim.txt*doc.dim.scale,sym:k,tol,dat:d.split('|').map(s=>s.trim()),rot:0})]});if(!p)return;
  mk({type:'fcf',p,h:doc.dim.txt*doc.dim.scale,sym:k,tol,dat:d.split('|').map(s=>s.trim()).filter(Boolean),rot:0})});
defCmd('DATUM',{al:['DATUMREF','REFERENCIA'],desc:'Símbolo de referência (datum)'},function*(){const p=yield pt('Ponto na feição');if(!p)return;const q=yield pt('Posição da letra',{base:p,preview:q=>[G_({type:'datum',p,q,s:'A',h:doc.dim.txt*doc.dim.scale})]});if(!q)return;
  const s=String((yield txtq('Letra',{def:'A'}))||'A').toUpperCase();mk({type:'datum',p,q,s,h:doc.dim.txt*doc.dim.scale})});

/* ---------- 5. imagens e vetorização ---------- */
const IMGC=new Map();function imgOf(src){let i=IMGC.get(src);if(!i){i=new Image();i.onload=()=>requestDraw();i.src=src;IMGC.set(src,i)}return i}
EXT.image={draw(e,ov){const im=imgOf(e.src);if(!ov&&im.complete&&im.naturalWidth){ctx.save();ctx.globalAlpha=e.alpha??1;ctx.translate(e.p.x,e.p.y+e.h);ctx.rotate(0);ctx.scale(1,-1);ctx.drawImage(im,0,0,e.w,e.h);ctx.restore()}
  stroke(e,ov);if(ov||!im.complete){ctx.beginPath();ctx.rect(e.p.x,e.p.y,e.w,e.h);ctx.stroke()}},bbox:e=>{imgOf(e.src);return{x0:e.p.x,y0:e.p.y,x1:e.p.x+e.w,y1:e.p.y+e.h}},
  dist(e,p){return p.x>=e.p.x&&p.x<=e.p.x+e.w&&p.y>=e.p.y&&p.y<=e.p.y+e.h?TOLW*0.8:1e9},xf(e,M){const a=Map_(M,e.p),b=Map_(M,P(e.p.x+e.w,e.p.y+e.h));e.p=P(Math.min(a.x,b.x),Math.min(a.y,b.y));e.w=Math.abs(b.x-a.x);e.h=Math.abs(b.y-a.y)},
  svg:e=>{const x=num0(e.p.x),y=num0(e.p.y),w=num0(e.w),h=num0(e.h);const src=/^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(String(e.src))?e.src:'';
    return src?`<image href="${esc(src)}" x="${x}" y="${y}" width="${w}" height="${h}" transform="translate(0 ${2*y+h}) scale(1 -1)" opacity="${num0(e.alpha??1)}"/>`:''}};
const imgIn=document.createElement('input');imgIn.type='file';imgIn.accept='image/*';imgIn.hidden=true;document.body.appendChild(imgIn);
defCmd('IMAGEATTACH',{al:['IAT','IMAGEM','IMAGE'],instant:true,desc:'Anexar imagem (foto, croqui, planta escaneada)'},()=>imgIn.click());
imgIn.onchange=async ev=>{const f=ev.target.files[0];ev.target.value='';if(!f)return;const src=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f)});
  const im=new Image();await new Promise(r=>{im.onload=r;im.src=src});let s=src;const mx=2000;if(Math.max(im.width,im.height)>mx){const k=mx/Math.max(im.width,im.height),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);s=c.toDataURL('image/jpeg',0.85)}
  window._pendImg={src:s,ar:im.height/im.width};startCmd('_IMGPLACE')};
defCmd('_IMGPLACE',{al:[],desc:'Posicionar imagem',norepeat:true},function*(){const I=window._pendImg;if(!I)return;const p=yield pt('Canto inferior esquerdo da imagem');if(!p)return;
  const w=yield dst('Largura real (mm) ou clique no canto oposto',{base:p,def:10000,preview:q=>{const w=Math.abs(q.x-p.x)||1;return[G_({type:'pline',pts:[p,P(p.x+w,p.y),P(p.x+w,p.y+w*I.ar),P(p.x,p.y+w*I.ar)],closed:true})]}});if(!(w>0))return;
  mk({type:'image',p,w,h:w*I.ar,src:I.src,alpha:0.85});window._pendImg=null;logR('Imagem anexada. Use ESCALA com Referência para calibrar por uma medida conhecida, ou VETORIZAR para gerar linhas.')});
function traceImage(e,thr,inv){const im=imgOf(e.src);if(!im.naturalWidth)return null;const k=Math.min(1,700/Math.max(im.naturalWidth,im.naturalHeight));const W=Math.max(2,Math.round(im.naturalWidth*k)),H=Math.max(2,Math.round(im.naturalHeight*k));
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(im,0,0,W,H);const d=x.getImageData(0,0,W,H).data;
  const B=(i,j)=>{if(i<0||j<0||i>=W||j>=H)return 0;const o=(j*W+i)*4;const g=0.299*d[o]+0.587*d[o+1]+0.114*d[o+2];return(inv?g>thr:g<thr)?1:0};
  const segs=[];const mid_=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  for(let j=-1;j<H;j++)for(let i=-1;i<W;i++){const tl=B(i,j),tr=B(i+1,j),br=B(i+1,j+1),bl=B(i,j+1),cs=tl*8+tr*4+br*2+bl;if(cs===0||cs===15)continue;
    const T=[i+.5,j],R=[i+1,j+.5],Bo=[i+.5,j+1],L=[i,j+.5];const add2=(a,b)=>segs.push([a,b]);
    switch(cs){case 1:case 14:add2(L,Bo);break;case 2:case 13:add2(Bo,R);break;case 3:case 12:add2(L,R);break;case 4:case 11:add2(T,R);break;case 6:case 9:add2(T,Bo);break;case 7:case 8:add2(L,T);break;case 5:add2(L,T);add2(Bo,R);break;case 10:add2(T,R);add2(L,Bo);break}}
  const key=p=>p[0]*2+','+p[1]*2;const adj=new Map();segs.forEach((s,i)=>{for(const p of s){const k2=key(p);if(!adj.has(k2))adj.set(k2,[]);adj.get(k2).push(i)}});
  const used=new Uint8Array(segs.length),chains=[];
  for(let s=0;s<segs.length;s++){if(used[s])continue;used[s]=1;const ch=[segs[s][0],segs[s][1]];
    for(const dir of[1,0]){let cur=dir?ch[ch.length-1]:ch[0];for(;;){const nx=(adj.get(key(cur))||[]).find(t=>!used[t]);if(nx==null)break;used[nx]=1;const sg=segs[nx];const o=key(sg[0])===key(cur)?sg[1]:sg[0];if(dir)ch.push(o);else ch.unshift(o);cur=o}}
    if(ch.length>=6)chains.push(ch)}
  const sx=e.w/W,sy=e.h/H;const out=[];for(const ch of chains){const pts=dp(ch.map(([a,b])=>P(e.p.x+a*sx,e.p.y+e.h-b*sy)),Math.max(sx,sy)*1.0);const closed=dist(pts[0],pts[pts.length-1])<Math.max(sx,sy)*1.5;if(closed)pts.pop();if(pts.length>=2)out.push({pts,closed:closed&&pts.length>=3})}
  return out}
function dp(pts,eps){if(pts.length<3)return pts;let dmax=0,ix=0;const a=pts[0],b=pts[pts.length-1];for(let i=1;i<pts.length-1;i++){const d=dist(pts[i],closestOnPrim(S(a,b),pts[i]));if(d>dmax){dmax=d;ix=i}}
  if(dmax>eps){const l=dp(pts.slice(0,ix+1),eps),r=dp(pts.slice(ix),eps);return l.slice(0,-1).concat(r)}return[a,b]}
defCmd('IMAGETRACE',{al:['VETORIZAR','TRACE','VECTORIZE'],desc:'Vetorizar imagem em polilinhas'},function*(){const r=yield pickq('Selecione a imagem',{filter:e=>e.type==='image'});if(!r)return;
  const thr=yield num('Limiar de escuro (0–255)',{def:128});const inv=(yield kwq('O traço é escuro sobre fundo claro?',['Sim','Não'],{def:'S'}))==='N';
  const res=traceImage(r.e,thr,inv);if(!res){logE('Imagem ainda carregando, tente de novo');return}if(!res.length){logE('Nada detectado: ajuste o limiar');return}res.forEach(o=>addEnt({type:'pline',pts:o.pts,closed:o.closed}));logR(res.length+' polilinha(s) vetorizada(s) na camada '+doc.clayer)});

/* ---------- 6. folhas com viewports ---------- */
function vpSVG(m,tbh,W,H){const out=[];const list=doc.ents.filter(visible);
  (doc.vps||[]).forEach((v0,i)=>{const v={...v0};for(const q of ['x','y','w','h','cx','cy','sc'])v[q]=num0(v0[q]);if(!v.sc)v.sc=1;const off=new Set(String(v.off||'').split(',').map(s=>s.trim()).filter(Boolean)),k=1/v.sc;
    out.push(`<defs><clipPath id="vpc${i}"><rect x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}"/></clipPath></defs><g clip-path="url(#vpc${i})"><g transform="translate(${v.x+v.w/2} ${v.y+v.h/2}) scale(${k} ${-k}) translate(${-v.cx} ${-v.cy})" stroke-linecap="round" stroke-linejoin="round">${entsSVG(list.filter(e=>!off.has(e.layer)),k,PLT.mono)}</g></g>`);
    if(v.frame!==false)out.push(`<rect x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}" fill="none" stroke="#000" stroke-width="0.18"/>`);
    out.push(`<text x="${v.x}" y="${v.y+v.h+4}" font-size="2.6" font-weight="600" font-family="IBM Plex Sans, Arial">${esc(v.title||('Vista '+(i+1)))}</text><text x="${v.x}" y="${v.y+v.h+7.2}" font-size="2" font-family="IBM Plex Sans, Arial">Escala 1:${v.sc}</text>`)});
  return out.join('')}
function renderVP(){const box=$('#vpBox');if(!box)return;const V_=doc.vps||[];
  box.innerHTML=(V_.length?`<div class="small">Coordenadas na folha em mm a partir do canto superior esquerdo. Camadas ocultas separadas por vírgula.</div>`:`<div class="small">Sem viewports: a folha usa uma única vista do desenho. Adicione viewports para montar várias vistas em escalas diferentes (planta 1:50 + detalhe 1:20…).</div>`)+
  V_.map((v,i)=>`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:6px 0;border-bottom:1px solid var(--line)">
   <input data-vp="${i}" data-k="title" value="${esc(v.title||'')}" placeholder="Título" style="grid-column:span 2">${['sc','x','y','w','h','cx','cy'].map(k=>`<label class="small">${{sc:'1:',x:'x',y:'y',w:'larg.',h:'alt.',cx:'centro X',cy:'centro Y'}[k]}<input data-vp="${i}" data-k="${k}" type="number" value="${+num0(v[k]).toFixed(1)}" style="width:100%"></label>`).join('')}
   <input data-vp="${i}" data-k="off" value="${esc(v.off||'')}" placeholder="Camadas ocultas" style="grid-column:span 3"><button class="tb" data-vpdel="${i}">Remover</button></div>`).join('')+
  `<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><button class="tb" id="vpAdd">+ Viewport (marcar área no modelo)</button><button class="tb" id="vpAuto">Uma vista ajustada</button></div>`;
  box.querySelectorAll('input').forEach(inp=>inp.style.cssText+=';padding:4px;border:1px solid var(--line);border-radius:4px;background:var(--panel2);font-size:12px');
  box.oninput=e=>{const t=e.target;if(t.dataset.vp==null)return;const v=doc.vps[+t.dataset.vp];v[t.dataset.k]=t.type==='number'?+t.value:t.value;$('#plotPrev').innerHTML=plotSVG();autosave()};
  box.onclick=e=>{if(e.target.dataset.vpdel!=null){withUndo(()=>doc.vps.splice(+e.target.dataset.vpdel,1));renderVP();$('#plotPrev').innerHTML=plotSVG()}
    if(e.target.id==='vpAdd'){closeModal();startCmd('MVIEW')}if(e.target.id==='vpAuto'){withUndo(()=>{doc.vps=[]});renderVP();$('#plotPrev').innerHTML=plotSVG()}}}
defCmd('MVIEW',{al:['MV','VIEWPORT','VPORTS'],desc:'Criar viewport na folha'},function*(){const a=yield pt('Área no modelo: primeiro canto');if(!a)return;const b=yield pt('Canto oposto',{preview:q=>[G_({type:'pline',pts:[a,P(q.x,a.y),q,P(a.x,q.y)],closed:true,lt:'DASHED'})]});if(!b)return;
  const sc=yield num('Escala 1:n',{def:50});if(!(sc>0))return;const t=(yield txtq('Título da vista',{def:'Vista '+((doc.vps||[]).length+1)}))||'';
  const[pw0,ph0]=PAPERS[PLT.paper];const W=PLT.orient==='L'?pw0:ph0;const w=Math.abs(b.x-a.x)/sc,h=Math.abs(b.y-a.y)/sc;doc.vps=doc.vps||[];
  const last=doc.vps[doc.vps.length-1];let x=last?last.x+last.w+8:16,y=last?last.y:16;if(x+w>W-12){x=16;y=last?Math.max(...doc.vps.map(v=>v.y+v.h))+12:16}
  doc.vps.push({title:t,sc,x,y,w,h,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,off:''});logR(`Viewport ${t} criado em 1:${sc} (${fmt(w,0)} × ${fmt(h,0)} mm na folha)`);setTimeout(()=>dlgPlot(),50)});

/* ---------- 7. IFC4 ---------- */
function ifcOut(){const L=[];let n=0;const E=s=>{n++;L.push(`#${n}=${s};`);return'#'+n};
  const G64='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';const gid=()=>{let s=G64[Math.floor(Math.random()*4)];for(let i=1;i<22;i++)s+=G64[Math.floor(Math.random()*64)];return`'${s}'`};
  const S_=s=>"'"+String(s).replace(/'/g,"''").replace(/[^\x20-\x7e]/g,c=>'\\X2\\'+c.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0')+'\\X0\\')+"'";
  const f=v=>(Math.round(v*1000)/1000).toFixed(3);
  const O=E('IFCCARTESIANPOINT((0.,0.,0.))'),Z=E('IFCDIRECTION((0.,0.,1.))'),X=E('IFCDIRECTION((1.,0.,0.))'),AX=E(`IFCAXIS2PLACEMENT3D(${O},${Z},${X})`);
  const CTX=E(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${AX},$)`),BODY=E(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${CTX},$,.MODEL_VIEW.,$)`);
  const U=[E('IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)'),E('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)'),E('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)'),E('IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)')];
  const UA=E(`IFCUNITASSIGNMENT((${U.join(',')}))`);const PRJ=E(`IFCPROJECT(${gid()},$,${S_(doc.name||'Projeto')},$,$,$,$,(${CTX}),${UA})`);
  const SPL=E(`IFCLOCALPLACEMENT($,${AX})`),SITE=E(`IFCSITE(${gid()},$,'Terreno',$,$,${SPL},$,$,.ELEMENT.,$,$,$,$,$)`);
  const BPL=E(`IFCLOCALPLACEMENT(${SPL},${AX})`),BLD=E(`IFCBUILDING(${gid()},$,${S_('Edifício')},$,$,${BPL},$,$,.ELEMENT.,$,$,$)`);
  const STPL=E(`IFCLOCALPLACEMENT(${BPL},${AX})`),ST_=E(`IFCBUILDINGSTOREY(${gid()},$,'Pavimento tipo',$,$,${STPL},$,$,.ELEMENT.,0.)`);
  E(`IFCRELAGGREGATES(${gid()},$,$,$,${PRJ},(${SITE}))`);E(`IFCRELAGGREGATES(${gid()},$,$,$,${SITE},(${BLD}))`);E(`IFCRELAGGREGATES(${gid()},$,$,$,${BLD},(${ST_}))`);
  const place=(rel,x,y,z,a)=>{const p=E(`IFCCARTESIANPOINT((${f(x)},${f(y)},${f(z)}))`),d=E(`IFCDIRECTION((${f(Math.cos(a))},${f(Math.sin(a))},0.))`);return E(`IFCLOCALPLACEMENT(${rel},${E(`IFCAXIS2PLACEMENT3D(${p},${Z},${d})`)})`)};
  const solid=(pts,depth,z0=0)=>{const cp=pts.map(p=>E(`IFCCARTESIANPOINT((${f(p.x)},${f(p.y)}))`));const pl=E(`IFCPOLYLINE((${cp.join(',')},${cp[0]}))`);const pr=E(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${pl})`);
    const pos=E(`IFCAXIS2PLACEMENT3D(${E(`IFCCARTESIANPOINT((0.,0.,${f(z0)}))`)},$,$)`);return E(`IFCEXTRUDEDAREASOLID(${pr},${pos},${Z},${f(depth)})`)};
  const shape=sols=>E(`IFCPRODUCTDEFINITIONSHAPE($,$,(${E(`IFCSHAPEREPRESENTATION(${BODY},'Body','SweptSolid',(${sols.join(',')}))`)}))`);
  const rect=(x0,y0,x1,y1)=>[P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)];
  const elems=[],spaces=[];const ents=doc.ents.filter(visible);let cnt={wall:0,door:0,win:0,col:0,furn:0,space:0};
  for(const w of ents.filter(e=>e.type==='wall')){const{L:Ln,u}=wallFrame(w),Xe=wallExt(w),h=w.h||doc.wall.h,t=w.t,I=w.ins||0,a=Math.atan2(u.y,u.x);
    const WP=place(STPL,w.a.x,w.a.y,0,a);const W=E(`IFCWALL(${gid()},$,'Parede ${++cnt.wall}',$,$,${WP},${shape([solid(rect(-Xe.ea,-t/2,Ln+Xe.eb,t/2+I),h)])},$,.STANDARD.)`);elems.push(W);
    for(const op of wallOpen(w)){const isW=/window/.test(op.kind),z0=isW?900:0,hh=(isW?2100:2100)-z0,len_=op.e-op.s;const OP=place(WP,op.s,0,z0,0);
      const O_=E(`IFCOPENINGELEMENT(${gid()},$,'Vão',$,$,${OP},${shape([solid(rect(0,-t/2-20,len_,t/2+I+20),hh)])},$,.OPENING.)`);E(`IFCRELVOIDSELEMENT(${gid()},$,$,$,${W},${O_})`);
      const FP=place(OP,0,0,0,0);const geo=shape([solid(rect(0,-25,len_,25),hh)]);
      const D=isW?E(`IFCWINDOW(${gid()},$,'Janela ${++cnt.win}',$,$,${FP},${geo},$,${f(hh)},${f(len_)},.WINDOW.,.SINGLE_PANEL.,$)`):E(`IFCDOOR(${gid()},$,'Porta ${++cnt.door}',$,$,${FP},${geo},$,${f(hh)},${f(len_)},.DOOR.,.SINGLE_SWING_LEFT.,$)`);
      E(`IFCRELFILLSELEMENT(${gid()},$,$,$,${O_},${D})`);elems.push(D)}}
  for(const e of ents){if(e.type==='pline'&&e.closed&&e.th){const isCol=/COL/i.test(e.layer);const E2=E(`${isCol?'IFCCOLUMN':'IFCBUILDINGELEMENTPROXY'}(${gid()},$,'${isCol?'Pilar':'Elemento'} ${isCol?++cnt.col:''}',$,$,${place(STPL,0,0,e.el||0,0)},${shape([solid(e.pts,e.th)])},$,${isCol?'.COLUMN.':'.ELEMENT.'})`);elems.push(E2)}
    if(e.type==='insert'&&doc.blocks[e.name]&&doc.blocks[e.name].kind==='furn'){const sols=childEnts(e).filter(c=>c.th&&((c.type==='pline'&&c.closed)||c.type==='circle'||c.type==='ellipse')).map(c=>solid(c.type==='circle'?arcPts(c.c,c.r,0,TAU,15).slice(0,-1):c.type==='ellipse'?ellPts(c,24).slice(0,-1):c.pts,c.th,c.el||0));
      if(sols.length)elems.push(E(`IFCFURNISHINGELEMENT(${gid()},$,${S_(doc.blocks[e.name].label||e.name)},$,$,${place(STPL,0,0,0,0)},${shape(sols)},$)`))}
    if(e.type==='text'&&/m²/.test(e.s)){const reg=findRegion(e.p);if(reg){const nm=e.s.split('\n')[0];spaces.push(E(`IFCSPACE(${gid()},$,${S_(nm)},$,$,${place(STPL,0,0,0,0)},${shape([solid(reg,doc.wall.h)])},${S_(nm)},.ELEMENT.,.INTERNAL.,$)`));cnt.space++}}}
  if(elems.length)E(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${gid()},$,$,$,(${elems.join(',')}),${ST_})`);if(spaces.length)E(`IFCRELAGGREGATES(${gid()},$,$,$,${ST_},(${spaces.join(',')}))`);
  const head=`ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');\nFILE_NAME(${S_((doc.name||'modelo')+'.ifc')},'${new Date().toISOString().slice(0,19)}',(''),(''),'GPlanSiS|Drawings','GPlanSiS|Drawings','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n`;
  return{text:head+L.join('\n')+'\nENDSEC;\nEND-ISO-10303-21;\n',cnt}}
defCmd('IFCEXPORT',{al:['IFC','EXPORTIFC','BIM'],instant:true,desc:'Exportar modelo BIM IFC4'},async()=>{const{text,cnt}=ifcOut();const base=(doc.name||'modelo').replace(/[^\w\-]+/g,'_');
  log(`IFC4: ${cnt.wall} paredes, ${cnt.door} portas, ${cnt.win} janelas, ${cnt.col} pilares, ${cnt.space} ambientes`);
  try{await loadScript(JSZIP);const z=new JSZip();z.file(base+'.ifc',text);download(base+'_ifc.zip',await z.generateAsync({type:'blob'}),'application/zip')}catch(_){download(base+'.ifc.txt',text,'text/plain')}});

/* ---------- ribbon ---------- */
Object.assign(IC,{cons:'<path d="M4 18L20 6"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="6" r="2"/><path d="M9 6h4M11 4v4"/>',horiz:'<path d="M3 12h18"/><text x="9" y="9" font-size="8" fill="currentColor" stroke="none">H</text>',vert:'<path d="M12 3v18"/><text x="14" y="10" font-size="8" fill="currentColor" stroke="none">V</text>',
 par:'<path d="M5 19L15 5M10 19L20 5"/>',perpi:'<path d="M5 19h14M12 19V5"/>',coin:'<path d="M3 18l9-6 9 6"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>',fix:'<path d="M12 3v14M7 12a5 5 0 0 0 10 0M5 8h14"/>',eq:'<path d="M5 9h14M5 15h14"/>',
 dcl:'<path d="M4 18L18 4"/><path d="M6 20l14-14" stroke-dasharray="2 2"/><text x="2" y="9" font-size="7" fill="currentColor" stroke="none">d1</text>',dcr:'<circle cx="12" cy="12" r="8"/><path d="M12 12l6-6"/><text x="4" y="22" font-size="7" fill="currentColor" stroke="none">r</text>',
 auto:'<path d="M4 20V4h16"/><path d="M8 16l3-6 3 3 4-7" />',params:'<path d="M4 6h16M4 12h16M4 18h16"/><text x="5" y="10" font-size="6" fill="currentColor" stroke="none">fx</text>',delc:'<path d="M4 18L20 6"/><path d="M6 6l12 12"/>',
 uni:'<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',subt:'<circle cx="9" cy="12" r="6"/><path d="M15 6a6 6 0 0 1 0 12" stroke-dasharray="2 2"/>',inter:'<circle cx="9" cy="12" r="6" stroke-dasharray="2 2"/><circle cx="15" cy="12" r="6" stroke-dasharray="2 2"/><path d="M12 7a6 6 0 0 1 0 10a6 6 0 0 1 0-10z" fill="currentColor"/>',
 att:'<rect x="4" y="5" width="16" height="14"/><path d="M8 10h8M8 14h5"/><text x="14" y="17" font-size="6" fill="currentColor" stroke="none">{}</text>',csv:'<path d="M5 3h10l4 4v14H5z"/><path d="M8 12h8M8 16h8"/>',
 gdt:'<rect x="2" y="8" width="20" height="8"/><path d="M8 8v8M14 8v8"/><circle cx="5" cy="12" r="1.8"/>',datum:'<rect x="8" y="3" width="8" height="8"/><path d="M12 11v6M8 21h8l-4-4z"/>',
 img:'<rect x="3" y="4" width="18" height="16"/><circle cx="9" cy="10" r="2"/><path d="M3 18l6-5 4 3 3-2 5 4"/>',tracei:'<rect x="3" y="4" width="18" height="16" stroke-dasharray="2 2"/><path d="M6 16l4-7 3 4 2-3 3 6"/>',
 vp:'<rect x="2" y="4" width="20" height="16"/><rect x="5" y="7" width="8" height="6"/><rect x="15" y="7" width="4" height="10"/>',ifc:'<path d="M12 2l9 5v10l-9 5-9-5V7z"/><text x="6.5" y="15" font-size="6.5" fill="currentColor" stroke="none">IFC</text>'});
RIB.splice(3,0,['Paramétrico',[['Horizontal','GCHORIZONTAL','horiz'],['Vertical','GCVERTICAL','vert'],['Paralela','GCPARALLEL','par'],['Perpendic.','GCPERPENDICULAR','perpi'],['Coincidente','GCCOINCIDENT','coin'],['Fixar','GCFIX','fix'],['Igual','GCEQUAL','eq'],'|',['Compr. d','DCLINEAR','dcl'],['Horiz. d','DCHORIZONTAL','dimlin'],['Vert. d','DCVERTICAL','dimcont'],['Raio d','DCRADIUS','dcr'],'|',['Automático','AUTOCONSTRAIN','auto'],['Parâmetros','PARAMETERS','params'],['Mostrar','CONSTRAINTBAR','cons'],['Remover','DELCONSTRAINT','delc']]]);
RIB.splice(4,0,['Avançado',[['União','UNION','uni'],['Subtrair','SUBTRACT','subt'],['Interseção','INTERSECT','inter'],['XOR','XOR','inter'],'|',['Atributo','ATTDEF','att'],['Editar atrib.','ATTEDIT','edit'],['Extrair CSV','ATTEXT','csv'],'|',['GD&T','TOLERANCE','gdt'],['Datum','DATUM','datum'],'|',['Imagem','IMAGEATTACH','img'],['Vetorizar','IMAGETRACE','tracei'],'|',['Viewport','MVIEW','vp'],['Folha','PLOT','plot'],['IFC (BIM)','IFCEXPORT','ifc']]]);
/* ============ MÓDULOS INDUSTRIAIS ============ */
STD_LAYERS.push(['P-PROC',7,'CONTINUOUS',0.5],['P-SIG',3,'DASHED',0.18],['P-PNEU',3,'PHANTOM',0.18],['P-EQPT',4,'CONTINUOUS',0.35],['P-INST',3,'CONTINUOUS',0.25],
 ['E-WIRE',7,'CONTINUOUS',0.25],['E-SYMB',7,'CONTINUOUS',0.35],['E-TEXT',2,'CONTINUOUS',0.18],['M-PART',7,'CONTINUOUS',0.5],['M-CENT',1,'CENTER',0.13],['M-HIDN',8,'HIDDEN',0.18],['M-ANNO',3,'CONTINUOUS',0.18],
 ['S-STEEL',8,'CONTINUOUS',0.35],['I-PIPE',150,'CONTINUOUS',0.35],['I-TRAY',30,'CONTINUOUS',0.25],['I-EQPT',140,'CONTINUOUS',0.35]);
const U5=50; // 1 mm de papel em 1:50
const sc_=(arr)=>arr.map(([x,y])=>P(x*U5,y*U5));
const PL=(pts,closed=true,ex={})=>Object.assign({type:'pline',pts:sc_(pts),closed,layer:'0',color:'BB',lt:'BL',lw:-1},ex);
const LN=(x1,y1,x2,y2,ex={})=>Object.assign({type:'line',a:P(x1*U5,y1*U5),b:P(x2*U5,y2*U5),layer:'0',color:'BB',lt:'BL',lw:-1},ex);
const CI=(x,y,r,ex={})=>Object.assign({type:'circle',c:P(x*U5,y*U5),r:r*U5,layer:'0',color:'BB',lt:'BL',lw:-1},ex);
const AR=(x,y,r,a0,a1,ex={})=>Object.assign({type:'arc',c:P(x*U5,y*U5),r:r*U5,a0:a0*D2R,a1:a1*D2R,layer:'0',color:'BB',lt:'BL',lw:-1},ex);
const SOL=(pts)=>({type:'hatch',loops:[sc_(pts)],pat:'SOLID',sc:1,ang:0,layer:'0',color:'BB',lt:'BL',lw:-1});
const AT=(tag,prompt,def,x,y,h=2.5,al='c',vb='m',auto=null)=>({type:'attdef',tag,prompt,def,auto,p:P(x*U5,y*U5),h:h*U5,rot:0,al,vb,layer:'0',color:'BB',lt:'BL',lw:-1});
const TX=(s,x,y,h=2.5,al='c',vb='m')=>({type:'text',s,p:P(x*U5,y*U5),h:h*U5,rot:0,al,vb,layer:'0',color:'BB',lt:'BL',lw:-1});
function indBlocks(){const B={};const mk2=(name,label,cat,kind,ents,o={})=>B[name]=Object.assign({name,label,cat,kind,base:P(0,0),ents,builtin:true},o);
  const bow=[PL([[-6,-3],[0,0],[-6,3]]),PL([[6,-3],[0,0],[6,3]])];const tagB=(pre,y=-6)=>AT('TAG','TAG','',0,y,2.5,'c','m',pre);
  // P&ID — válvulas (fluxo em X)
  mk2('V-GATE','Válvula gaveta','P&ID','valve',[...bow,tagB('HV-')]);
  mk2('V-GLOBE','Válvula globo','P&ID','valve',[...bow,CI(0,0,1.1),SOL([[-1,0],[0,1],[1,0],[0,-1]]),tagB('HV-')]);
  mk2('V-BALL','Válvula esfera','P&ID','valve',[...bow,CI(0,0,2),tagB('HV-')]);
  mk2('V-CHECK','Válvula de retenção','P&ID','valve',[...bow,SOL([[6,-3],[0,0],[6,3]]),LN(-6,-4,6,4),tagB('CV-')]);
  mk2('V-BFLY','Válvula borboleta','P&ID','valve',[LN(-4,-3.5,-4,3.5),LN(4,-3.5,4,3.5),LN(-4,0,4,0),CI(0,0,1),LN(-2.6,-2.6,2.6,2.6),tagB('HV-')]);
  mk2('V-CONTROL','Válvula de controle','P&ID','valve',[...bow,LN(0,0,0,6),AR(0,6,3.2,0,180),LN(-3.2,6,3.2,6),AT('TAG','TAG da válvula','',0,-6,2.5,'c','m','FV-')]);
  mk2('V-PSV','Válvula de segurança (PSV)','P&ID','valve',[PL([[-3,-7],[3,-7],[0,0]]),PL([[7,-3],[7,3],[0,0]]),PL([[0,0],[0,2],[-1.5,3],[1.5,4.5],[-1.5,6],[1.5,7.5],[0,8.5],[0,10]],false),AT('TAG','TAG da PSV','',4,-8,2.5,'l','m','PSV-')]);
  mk2('V-3WAY','Válvula 3 vias','P&ID','valve',[...bow,PL([[-3,-6],[3,-6],[0,0]]),tagB('HV-')]);
  mk2('REDUCER','Redução concêntrica','P&ID','fitting',[PL([[-3,-3],[3,-1.6],[3,1.6],[-3,3]])]);
  mk2('FLANGE','Par de flanges','P&ID','fitting',[LN(-0.8,-3,-0.8,3),LN(0.8,-3,0.8,3)]);
  mk2('BLIND','Raquete (figura 8)','P&ID','fitting',[CI(0,2.2,2),LN(0,0.2,0,-2),CI(0,-4,2),SOL(arcPts(P(0,2.2),2,0,TAU,30).map(p=>[p.x,p.y]))]);
  // P&ID — equipamentos
  mk2('PUMP-C','Bomba centrífuga','P&ID','equip',[CI(0,0,6),LN(0,6,9,6),LN(9,6,9,3.5),PL([[-4.2,-4.2],[-6.5,-8.5],[6.5,-8.5],[4.2,-4.2]],false),AT('TAG','TAG da bomba','',0,-11,2.8,'c','m','P-')]);
  mk2('PUMP-PD','Bomba de deslocamento','P&ID','equip',[CI(0,0,6),CI(0,0,2.5),PL([[-4.2,-4.2],[-6.5,-8.5],[6.5,-8.5],[4.2,-4.2]],false),AT('TAG','TAG da bomba','',0,-11,2.8,'c','m','P-')]);
  mk2('COMPRESSOR','Compressor','P&ID','equip',[CI(0,0,6),LN(-5,3.3,5,1.8),LN(-5,-3.3,5,-1.8),AT('TAG','TAG','',0,-9,2.8,'c','m','K-')]);
  mk2('VESSEL-V','Vaso / tanque vertical','P&ID','equip',[LN(-8,-12,-8,12),LN(8,-12,8,12),{type:'ellipse',c:P(0,12*U5),rx:8*U5,ry:3*U5,rot:0,layer:'0',color:'BB',lt:'BL',lw:-1},{type:'ellipse',c:P(0,-12*U5),rx:8*U5,ry:3*U5,rot:0,layer:'0',color:'BB',lt:'BL',lw:-1},AT('TAG','TAG do tanque','',0,0,3,'c','m','TQ-')]);
  mk2('VESSEL-H','Vaso horizontal','P&ID','equip',[LN(-14,-6,14,-6),LN(-14,6,14,6),AR(-14,0,6,90,270),AR(14,0,6,-90,90),PL([[-9,-6],[-10,-9],[-8,-9]]),PL([[9,-6],[8,-9],[10,-9]]),AT('TAG','TAG do vaso','',0,0,3,'c','m','V-')]);
  mk2('HX','Trocador casco-tubo','P&ID','equip',[CI(0,0,6),PL([[-8,0],[-4,0],[-2,3],[0,-3],[2,3],[4,0],[8,0]],false),AT('TAG','TAG','',0,-9,2.8,'c','m','E-')]);
  mk2('FILTER','Filtro','P&ID','equip',[PL([[-4,-6],[4,-6],[4,6],[-4,6]]),LN(-4,-6,4,6,{lt:'DASHED'}),AT('TAG','TAG','',0,-8.5,2.5,'c','m','F-')]);
  mk2('AGITATOR','Agitador','P&ID','equip',[LN(0,8,0,-4),LN(-3,-4,3,-4),LN(-3,-4,-3,-2),LN(3,-4,3,-6),CI(0,10,2)]);
  mk2('OPC','Conector fora de folha','P&ID','anno',[PL([[-6,-2.5],[3,-2.5],[6,0],[3,2.5],[-6,2.5]]),AT('REF','Destino (folha/linha)','',-1.5,0,2,'c','m')]);
  // P&ID — instrumentos ISA 5.1
  const fn=()=>AT('FUNC','Letras de função (ex.: FT, PIC)','FT',0,1.4,2.6),lp=()=>AT('LOOP','Malha (número)','',0,-2.2,2.4,'c','m','#');
  mk2('INST-FIELD','Instrumento de campo','P&ID','inst',[CI(0,0,5.5),fn(),lp()]);
  mk2('INST-DCS','Instrumento no SDCD/DCS','P&ID','inst',[CI(0,0,5.5),PL([[-5.5,-5.5],[5.5,-5.5],[5.5,5.5],[-5.5,5.5]]),fn(),lp()]);
  mk2('INST-PLC','Função no CLP','P&ID','inst',[PL([[0,-5.5],[5.5,0],[0,5.5],[-5.5,0]]),PL([[-5.5,-5.5],[5.5,-5.5],[5.5,5.5],[-5.5,5.5]]),fn(),lp()]);
  mk2('INST-PANEL','Instrumento em painel','P&ID','inst',[CI(0,0,5.5),LN(-5.5,0,5.5,0),fn(),lp()]);
  // Elétrico IEC 60617 (vertical, bornes em y=±10)
  const term=()=>[LN(0,10,0,4),LN(0,-10,0,-4)];const etag=(pre)=>AT('TAG','Identificação (ex.: -K1)','',5,0,2.5,'l','m',pre);
  mk2('E-NO','Contato NA','Elétrico','elec',[...term(),LN(0,-4,-3,4.6),etag('-K')]);
  mk2('E-NC','Contato NF','Elétrico','elec',[...term(),LN(0,-4,3,4.6),LN(0,4,3.6,4),etag('-K')]);
  mk2('E-COIL','Bobina de contator','Elétrico','elec',[LN(0,10,0,2.5),LN(0,-10,0,-2.5),PL([[-4,-2.5],[4,-2.5],[4,2.5],[-4,2.5]]),etag('-K')]);
  mk2('E-BREAKER','Disjuntor','Elétrico','elec',[...term(),LN(0,-4,-3,4.6),LN(-0.9,3.1,0.9,4.9),LN(-0.9,4.9,0.9,3.1),etag('-Q')]);
  mk2('E-FUSE','Fusível','Elétrico','elec',[LN(0,10,0,-10),PL([[-1.6,-5],[1.6,-5],[1.6,5],[-1.6,5]]),etag('-F')]);
  mk2('E-THERMAL','Relé térmico','Elétrico','elec',[LN(0,10,0,3),LN(0,-10,0,-3),PL([[-4,-3],[4,-3],[4,3],[-4,3]]),PL([[-2,-1.5],[-2,1.5],[2,1.5],[2,-1.5]],false),etag('-F')]);
  mk2('E-PB-NO','Botão impulso NA','Elétrico','elec',[...term(),LN(0,-4,-3,4.6),LN(-1.5,0.3,-7,0.3,{lt:'DASHED'}),LN(-7,-1.5,-7,2),etag('-S')]);
  mk2('E-PB-NC','Botão impulso NF','Elétrico','elec',[...term(),LN(0,-4,3,4.6),LN(0,4,3.6,4),LN(1.5,0.3,-6,0.3,{lt:'DASHED'}),LN(-6,-1.5,-6,2),etag('-S')]);
  mk2('E-MOTOR3','Motor trifásico','Elétrico','elec',[LN(0,10,0,6),CI(0,0,6),TX('M',0,1.5,3.5),TX('3~',0,-2.5,2.6),etag('-M')]);
  mk2('E-LAMP','Sinaleiro','Elétrico','elec',[LN(0,10,0,3),LN(0,-10,0,-3),CI(0,0,3),LN(-2.1,-2.1,2.1,2.1),LN(-2.1,2.1,2.1,-2.1),etag('-H')]);
  mk2('E-TERM','Borne','Elétrico','elec',[CI(0,0,1.1),AT('TAG','Borne (ex.: X1:1)','X1:1',2,0,2,'l','m')]);
  mk2('E-TRAFO','Transformador','Elétrico','elec',[LN(0,10,0,7),LN(0,-10,0,-7),CI(0,3,4),CI(0,-3,4),etag('-T')]);
  mk2('E-GND','Terra','Elétrico','elec',[LN(0,4,0,0),LN(-3,0,3,0),LN(-2,-1.2,2,-1.2),LN(-1,-2.4,1,-2.4)]);
  mk2('E-PLC-DI','Entrada digital CLP','Elétrico','elec',[LN(0,10,0,3),PL([[-4,-3],[4,-3],[4,3],[-4,3]]),TX('DI',0,0,2.2),AT('TAG','Endereço (ex.: %I0.0)','%I0.0',5,0,2.2,'l','m')]);
  mk2('E-PLC-DO','Saída digital CLP','Elétrico','elec',[LN(0,-10,0,-3),PL([[-4,-3],[4,-3],[4,3],[-4,3]]),TX('DO',0,0,2.2),AT('TAG','Endereço (ex.: %Q0.0)','%Q0.0',5,0,2.2,'l','m')]);
  // Planta industrial 3D (mm reais)
  const R3=(x0,y0,x1,y1,th,c3,el)=>Object.assign({type:'pline',pts:[P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)],closed:true,layer:'0',color:'BB',lt:'BL',lw:-1,th,c3},el?{el}:{});
  const C3=(x,y,r,th,c3,el)=>Object.assign({type:'circle',c:P(x,y),r,layer:'0',color:'BB',lt:'BL',lw:-1,th,c3},el?{el}:{});
  const tg3=(pre,y=0)=>({...AT('TAG','TAG','',0,0,4,'c','m',pre),p:P(0,y),h:200});
  mk2('PL-PUMP','Bomba com motor (skid)','Planta','equip3',[R3(-700,-300,700,300,200,'#5b6770'),C3(-350,0,230,900,'#2f6db5',200),R3(50,-200,650,200,700,'#3d7fc4',200),tg3('P-',-500)]);
  mk2('PL-CCM','Painel CCM 800','Planta','equip3',[R3(-400,-300,400,300,2200,'#c9ccd0'),LN(0,-6,0,6),tg3('CCM-',-500)]);
  mk2('PL-COMP','Compressor de ar (skid)','Planta','equip3',[R3(-900,-500,900,500,1500,'#d8dbe0'),tg3('K-',-700)]);
  mk2('PL-HX','Trocador de placas','Planta','equip3',[R3(-300,-500,300,500,1800,'#9aa6b0'),tg3('E-',-700)]);
  mk2('PL-RACK','Porta-palete (módulo 2700)','Planta','equip3',[R3(-1350,-550,-1270,550,4500,'#e07b24'),R3(1270,-550,1350,550,4500,'#e07b24'),R3(-1350,-550,1350,-500,4500,'#2e5ea8'),R3(-1350,500,1350,550,4500,'#2e5ea8')]);
  return B}
const _bbOrig=builtinBlocks;builtinBlocks=function(){return Object.assign(_bbOrig(),indBlocks())};
function nextTag(pre){if(!pre)return'';const re=new RegExp('^'+pre.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')+'(\\d+)$');let mx=pre==='#'?100:0;
  for(const e of doc.ents){for(const v of Object.values(e.attrs||{}))if(pre==='#'?/^\d+$/.test(v):re.test(v)){const n=pre==='#'?+v:+String(v).match(re)[1];if(n>mx)mx=n}if(e.ltag){const m=String(e.ltag).match(/(\d{3,})/);if(pre==='#'&&m)mx=Math.max(mx,+m[1])}}
  return pre==='#'?String(mx+1):pre+(mx+1)}
function attrDefault(a){return a.auto?nextTag(a.auto):a.def}

/* ---------- P&ID: linhas de processo e instrumentos ---------- */
function arrowTri(p,d,s){const n=perp(d),b=sub(p,mul(d,s));return[p,add(b,mul(n,s*0.38)),sub(b,mul(n,s*0.38))]}
defCmd('PROCESSLINE',{al:['PLINHA','LINHAPROCESSO','PIPEPID'],desc:'Linha de P&ID com setas de fluxo e identificação'},function*(){
  const k=(yield kwq('Tipo de linha',['Processo','Sinal elétrico:S','Pneumático:N','Capilar:C','Software/dados:D'],{def:'P'}))||'P';
  const lay={P:'P-PROC',S:'P-SIG',N:'P-PNEU',C:'P-SIG',D:'P-SIG'}[k];const lt={P:'BL',S:'DASHED',N:'PHANTOM',C:'DOT',D:'DASHDOT'}[k];
  const o=ST.ortho;ST.ortho=true;syncStatus();
  try{const p0=yield pt('Origem da linha');if(!p0)return;const pts=[p0];
    for(;;){const p=yield pt('Próximo ponto (Enter conclui)',{base:pts[pts.length-1],opts:['Desfazer'],preview:q=>[G_({type:'pline',pts:[...pts,q],closed:false,layer:lay,lt})]});if(p==null)break;if(p==='D'){if(pts.length>1)pts.pop();continue}pts.push(p)}
    if(pts.length<2)return;const e=addEnt({type:'pline',pts,closed:false,layer:lay,lt});
    if(k==='P'){const n=nextTag('#');const def=`2"-P-${n.padStart(4,'0')}-A1`;const tag=(yield txtq('Identificação da linha (diâmetro-fluido-número-spec)',{def}))||def;e.ltag=tag;
      const a=U5*2.6;for(const s of plSegs(pts,false)){const L=dist(s.a,s.b);if(L<a*4)continue;addEnt({type:'hatch',loops:[arrowTri(mid(s.a,s.b),nrm(sub(s.b,s.a)),a)],pat:'SOLID',sc:1,ang:0,layer:lay})}
      let best=plSegs(pts,false).reduce((b,s)=>dist(s.a,s.b)>dist(b.a,b.b)?s:b);let th=ang(best.a,best.b);if(th>Math.PI/2+1e-6||th<-Math.PI/2)th+=Math.PI;
      const m=mid(best.a,best.b),up=perp(P(Math.cos(th),Math.sin(th)));addEnt({type:'text',p:add(lerp(best.a,best.b,0.3),mul(up,U5*1.6)),h:U5*2.2,rot:th,s:tag,al:'c',vb:'b',layer:'P-PROC'})}
    logR('Linha criada'+(e.ltag?': '+e.ltag:''))}finally{ST.ortho=o;syncStatus()}});
defCmd('INSTRUMENT',{al:['INST','INSTRUMENTO'],desc:'Balão de instrumento ISA 5.1'},function*(){
  const loc=(yield kwq('Localização',['Campo:C','SDCD/DCS:D','CLP:P','Painel local:L'],{def:'C'}))||'C';const name={C:'INST-FIELD',D:'INST-DCS',P:'INST-PLC',L:'INST-PANEL'}[loc];
  const f=String((yield txtq('Letras de função ISA (ex.: FT, PIT, LIC, TE)',{def:CMD._instF||'FT'}))||'FT').toUpperCase().trim();CMD._instF=f;
  const lp=String((yield txtq('Número da malha',{def:CMD._loop||nextTag('#')}))||'').trim();CMD._loop=lp;
  const p=yield pt('Posição do balão',{preview:q=>[G_({type:'insert',name,p:q,sx:1,sy:1,rot:0,attrs:{FUNC:f,LOOP:lp}})]});if(!p)return;
  mk({type:'insert',name,p,sx:1,sy:1,rot:0,attrs:{FUNC:f,LOOP:lp},layer:'P-INST'});
  const ln=yield pt('Ponto de conexão ao processo (Enter = sem linha)',{base:p});if(ln&&typeof ln==='object'){const d=nrm(sub(ln,p));addEnt({type:'line',a:add(p,mul(d,5.5*U5)),b:ln,layer:'P-INST'})}
  logR(`Instrumento ${f}-${lp}`)});

/* ---------- Elétrico: diagrama, fios ---------- */
defCmd('LADDER',{al:['DIAGRAMA','ESQUEMA'],desc:'Folha de esquema de comando (trilhos e caminhos numerados)'},function*(){
  const p=yield pt('Canto inferior esquerdo');if(!p)return;const n=Math.round(yield num('Número de caminhos (colunas)',{def:8}));const w=yield num('Passo entre caminhos',{def:25*U5});const h=yield num('Altura entre trilhos',{def:60*U5});
  const L1=(yield txtq('Nome do trilho superior',{def:'L+ 24 Vcc'}))||'L+';const L2=(yield txtq('Nome do trilho inferior',{def:'M 0 V'}))||'M';const W=(n+1)*w;
  addEnt({type:'line',a:P(p.x,p.y+h),b:P(p.x+W,p.y+h),layer:'E-WIRE',lw:0.35});addEnt({type:'line',a:P(p.x,p.y),b:P(p.x+W,p.y),layer:'E-WIRE',lw:0.35});
  addEnt({type:'text',p:P(p.x-U5,p.y+h),h:U5*2.5,rot:0,s:L1,al:'r',vb:'m',layer:'E-TEXT'});addEnt({type:'text',p:P(p.x-U5,p.y),h:U5*2.5,rot:0,s:L2,al:'r',vb:'m',layer:'E-TEXT'});
  for(let i=1;i<=n;i++){const x=p.x+i*w;addEnt({type:'text',p:P(x,p.y+h+U5*4),h:U5*2.5,rot:0,s:String(i),al:'c',vb:'m',layer:'E-TEXT'});addEnt({type:'line',a:P(x,p.y+h),b:P(x,p.y),layer:'E-WIRE',lt:'DOT',color:8})}
  const bx=[P(p.x-U5*12,p.y-U5*8),P(p.x+W+U5*4,p.y-U5*8),P(p.x+W+U5*4,p.y+h+U5*8),P(p.x-U5*12,p.y+h+U5*8)];addEnt({type:'pline',pts:bx,closed:true,layer:'E-TEXT',color:8});
  logR(`Esquema com ${n} caminhos criado. Insira símbolos centrados no caminho (bornes ficam a ±10 mm).`)});
defCmd('WIRE',{al:['FIO','CONDUTOR'],desc:'Fio ortogonal com numeração automática'},function*(){
  const o=ST.ortho;ST.ortho=true;syncStatus();
  try{for(;;){const p0=yield pt('Início do fio (Enter encerra)');if(!p0)return;const pts=[p0];
    for(;;){const p=yield pt('Próximo ponto (Enter conclui o fio)',{base:pts[pts.length-1],preview:q=>[G_({type:'pline',pts:[...pts,q],closed:false,layer:'E-WIRE'})]});if(!p)break;pts.push(p)}
    if(pts.length<2)continue;doc.wireN=(doc.wireN||0)+1;const no=String(doc.wireN);const e=addEnt({type:'pline',pts,closed:false,layer:'E-WIRE'});e.wno=no;
    const s=plSegs(pts,false).reduce((b,s)=>dist(s.a,s.b)>dist(b.a,b.b)?s:b);const vert=Math.abs(s.a.x-s.b.x)<1;const m=mid(s.a,s.b);
    addEnt({type:'text',p:add(m,vert?P(U5*1.2,0):P(0,U5*1.2)),h:U5*2,rot:vert?Math.PI/2:0,s:no,al:'c',vb:'b',layer:'E-TEXT'});
    for(const q of[pts[0],pts[pts.length-1]])for(const w of doc.ents){if(w===e||w.layer!=='E-WIRE'||(w.type!=='pline'&&w.type!=='line'))continue;const segs=w.type==='line'?[S(w.a,w.b)]:plSegs(w.pts,false);
      for(const sg of segs){const c=closestOnPrim(sg,q);if(dist(c,q)<1&&dist(q,sg.a)>1&&dist(q,sg.b)>1){addEnt({type:'hatch',loops:[arcPts(q,U5*0.8,0,TAU,30).slice(0,-1)],pat:'SOLID',sc:1,ang:0,layer:'E-WIRE'});break}}}
    logR('Fio '+no)}}finally{ST.ortho=o;syncStatus()}});

/* ---------- Mecânico: geradores normalizados ---------- */
const BOLTS={M3:[3,.5,5.5,2],M4:[4,.7,7,2.8],M5:[5,.8,8,3.5],M6:[6,1,10,4],M8:[8,1.25,13,5.3],M10:[10,1.5,16,6.4],M12:[12,1.75,18,7.5],M16:[16,2,24,10],M20:[20,2.5,30,12.5],M24:[24,3,36,15],M30:[30,3.5,46,18.7]};
defCmd('BOLT',{al:['PARAFUSO','ISO4017'],desc:'Parafuso sextavado ISO 4014/4017'},function*(){
  const sz=String((yield txtq('Tamanho ['+Object.keys(BOLTS).join('/')+']',{def:'M10'}))||'M10').toUpperCase().trim();const T=BOLTS[sz];if(!T){logE('Tamanho fora da tabela');return}const[d,pp,s,k]=T;
  const L=yield num('Comprimento da haste (mm)',{def:d*4});const v=(yield kwq('Vista',['Lateral','Topo'],{def:'L'}))||'L';const p=yield pt('Ponto de inserção (centro da cabeça)');if(!p)return;
  const r=(yield angq('Rotação',{base:p,def:0}))*D2R||0;const M=Mmul(Mtr(p.x,p.y),Mrot(r));const T_=q=>Map_(M,q);const add2=(e)=>addEnt(Object.assign(e,{layer:e.layer||'M-PART'}));
  const lpl=(pts,cl=true,ex={})=>add2({type:'pline',pts:pts.map(([x,y])=>T_(P(x,y))),closed:cl,...ex});const lln=(x1,y1,x2,y2,ex={})=>add2({type:'line',a:T_(P(x1,y1)),b:T_(P(x2,y2)),...ex});
  if(v==='T'){const R=s/Math.sqrt(3);lpl([...Array(6)].map((_,i)=>[R*Math.cos(i*Math.PI/3),R*Math.sin(i*Math.PI/3)]));add2({type:'circle',c:T_(P(0,0)),r:s*0.48});lln(-s*0.7,0,s*0.7,0,{layer:'M-CENT'});lln(0,-s*0.7,0,s*0.7,{layer:'M-CENT'})}
  else{const e=s/Math.cos(Math.PI/6),b=L<=125?2*d+6:2*d+12,d3=d-1.2268*pp;
    lpl([[-e/2,0],[e/2,0],[e/2,k],[-e/2,k]]);lln(-e/4,0,-e/4,k);lln(e/4,0,e/4,k);
    lpl([[-d/2,0],[d/2,0],[d/2,-L+d*0.08],[d/2-d*0.08,-L],[-d/2+d*0.08,-L],[-d/2,-L+d*0.08]]);
    const bt=Math.min(b,L);lln(-d3/2,-L+d*0.08,-d3/2,-L+bt,{lw:0.18});lln(d3/2,-L+d*0.08,d3/2,-L+bt,{lw:0.18});lln(-d/2,-L+bt,d/2,-L+bt);
    lln(0,k+d*0.4,0,-L-d*0.4,{layer:'M-CENT'})}
  add2({type:'text',p:T_(P(s*0.9,k+s*0.2)),h:Math.max(1.8,d*0.28),rot:r,s:`ISO 4017 ${sz}×${fmt(L,0)}`,al:'l',vb:'b',layer:'M-ANNO'});logR(`Parafuso ${sz}×${fmt(L,0)} · passo ${pp} · chave ${s}`)});
const BEAR={6000:[10,26,8],6001:[12,28,8],6002:[15,32,9],6003:[17,35,10],6004:[20,42,12],6005:[25,47,12],6006:[30,55,13],6200:[10,30,9],6201:[12,32,10],6202:[15,35,11],6203:[17,40,12],6204:[20,47,14],6205:[25,52,15],6206:[30,62,16],6207:[35,72,17],6208:[40,80,18],6210:[50,90,20],6305:[25,62,17],6310:[50,110,27]};
defCmd('BEARING',{al:['ROLAMENTO'],desc:'Rolamento rígido de esferas (série 60/62/63)'},function*(){
  const c=String((yield txtq('Código ['+Object.keys(BEAR).join('/')+']',{def:'6205'}))||'6205').trim();const T=BEAR[c];if(!T){logE('Código fora da tabela');return}const[d,D,B]=T;
  const v=(yield kwq('Vista',['Frontal','Corte'],{def:'C'}))||'C';const p=yield pt('Centro');if(!p)return;const pm=(d+D)/2,bl=(D-d)*0.3;const A=(x,y)=>P(p.x+x,p.y+y);
  if(v==='F'){addEnt({type:'circle',c:p,r:D/2,layer:'M-PART'});addEnt({type:'circle',c:p,r:d/2,layer:'M-PART'});addEnt({type:'circle',c:p,r:pm/2,layer:'M-CENT'});
    const nb=Math.max(7,Math.floor(Math.PI*pm/(bl*1.6)));for(let i=0;i<nb;i++)addEnt({type:'circle',c:pol(p,pm/2,i*TAU/nb),r:bl/2,layer:'M-PART'});
    addEnt({type:'circle',c:p,r:pm/2+bl*0.35,layer:'M-HIDN'});addEnt({type:'circle',c:p,r:pm/2-bl*0.35,layer:'M-HIDN'})}
  else{for(const sg of[1,-1]){const yo=sg*D/2,yi=sg*d/2,ym=sg*pm/2;const outer=[A(-B/2,yo),A(B/2,yo),A(B/2,ym+sg*bl*0.36),A(-B/2,ym+sg*bl*0.36)],inner=[A(-B/2,yi),A(B/2,yi),A(B/2,ym-sg*bl*0.36),A(-B/2,ym-sg*bl*0.36)];
      for(const q of[outer,inner]){addEnt({type:'pline',pts:q,closed:true,layer:'M-PART'});addEnt({type:'hatch',loops:[q],pat:'ANSI31',sc:Math.max(0.3,B/30),ang:sg>0?0:90,layer:'M-PART'})}
      addEnt({type:'circle',c:A(0,ym),r:bl/2,layer:'M-PART'})}addEnt({type:'line',a:A(-B*0.8,0),b:A(B*0.8,0),layer:'M-CENT'})}
  addEnt({type:'text',p:A(D*0.6,D*0.55),h:Math.max(2,D*0.06),rot:0,s:`${c}  d${d} × D${D} × B${B}`,al:'l',vb:'b',layer:'M-ANNO'});logR(`Rolamento ${c}: d=${d}, D=${D}, B=${B}`)});
const PROF={IPE:{100:[100,55,4.1,5.7,7],120:[120,64,4.4,6.3,7],140:[140,73,4.7,6.9,7],160:[160,82,5,7.4,9],180:[180,91,5.3,8,9],200:[200,100,5.6,8.5,12],220:[220,110,5.9,9.2,12],240:[240,120,6.2,9.8,15],270:[270,135,6.6,10.2,15],300:[300,150,7.1,10.7,15],360:[360,170,8,12.7,18],400:[400,180,8.6,13.5,21]},
  HEA:{100:[96,100,5,8,12],120:[114,120,5,8,12],140:[133,140,5.5,8.5,12],160:[152,160,6,9,15],180:[171,180,6,9.5,15],200:[190,200,6.5,10,18],220:[210,220,7,11,18],240:[230,240,7.5,12,21],260:[250,260,7.5,12.5,24],300:[290,300,8.5,14,27]},
  W:{150:[152,152,5.8,6.6,6],200:[203,133,5.8,7.8,8],250:[257,146,6.1,9.1,8],310:[310,165,5.8,9.7,10]},
  UPN:{80:[80,45,6,8,8],100:[100,50,6,8.5,8.5],120:[120,55,7,9,9],140:[140,60,7,10,10],160:[160,65,7.5,10.5,10.5],200:[200,75,8.5,11.5,11.5]},
  L:{'50X5':[50,5,7],'65X6':[65,6,9],'75X8':[75,8,9],'100X10':[100,10,12]},RHS:{'100X100X5':[100,100,5],'150X100X6':[150,100,6],'200X200X8':[200,200,8]},CHS:{'114X4':[114.3,4],'168X6':[168.3,6],'219X8':[219.1,8]}};
function filletPoly(V){const o=[];const n=V.length;for(let i=0;i<n;i++){const[v,r]=[V[i][0],V[i][1]||0];if(!r){o.push(v);continue}const a=V[(i-1+n)%n][0],b=V[(i+1)%n][0];const d1=nrm(sub(a,v)),d2=nrm(sub(b,v));const phi=Math.acos(Math.max(-1,Math.min(1,dot(d1,d2))))/2;if(phi<1e-3){o.push(v);continue}
  const td=r/Math.tan(phi),T1=add(v,mul(d1,td)),T2=add(v,mul(d2,td)),C=add(v,mul(nrm(add(d1,d2)),r/Math.sin(phi)));let a1=ang(C,T1),a2=ang(C,T2),sw=a2-a1;while(sw>Math.PI)sw-=TAU;while(sw<-Math.PI)sw+=TAU;for(let k=0;k<=6;k++)o.push(pol(C,r,a1+sw*k/6))}return o}
function profLoops(t,sz){const D=PROF[t]&&PROF[t][sz];if(!D)return null;const Q=(x,y,r=0)=>[P(x,y),r];
  if(t==='IPE'||t==='HEA'||t==='W'){const[h,b,tw,tf,r]=D;return[filletPoly([Q(-b/2,-h/2),Q(b/2,-h/2),Q(b/2,-h/2+tf),Q(tw/2,-h/2+tf,r),Q(tw/2,h/2-tf,r),Q(b/2,h/2-tf),Q(b/2,h/2),Q(-b/2,h/2),Q(-b/2,h/2-tf),Q(-tw/2,h/2-tf,r),Q(-tw/2,-h/2+tf,r),Q(-b/2,-h/2+tf)])]}
  if(t==='UPN'){const[h,b,tw,tf,r]=D;return[filletPoly([Q(-b/2,-h/2),Q(b/2,-h/2),Q(b/2,-h/2+tf),Q(-b/2+tw,-h/2+tf,r),Q(-b/2+tw,h/2-tf,r),Q(b/2,h/2-tf),Q(b/2,h/2),Q(-b/2,h/2)])]}
  if(t==='L'){const[b,tt,r]=D;return[filletPoly([Q(0,0),Q(b,0),Q(b,tt),Q(tt,tt,r),Q(tt,b),Q(0,b)])]}
  if(t==='RHS'){const[h,b,tt]=D;const R=tt*2,ri=tt;return[filletPoly([Q(-b/2,-h/2,R),Q(b/2,-h/2,R),Q(b/2,h/2,R),Q(-b/2,h/2,R)]),filletPoly([Q(-b/2+tt,-h/2+tt,ri),Q(b/2-tt,-h/2+tt,ri),Q(b/2-tt,h/2-tt,ri),Q(-b/2+tt,h/2-tt,ri)])]}
  if(t==='CHS'){const[dd,tt]=D;return[arcPts(P(0,0),dd/2,0,TAU,6).slice(0,-1),arcPts(P(0,0),dd/2-tt,0,TAU,6).slice(0,-1)]}}
defCmd('PROFILE',{al:['PERFIL','STEEL','ACO'],desc:'Perfil de aço (IPE, HEA, W, UPN, L, RHS, CHS)'},function*(){
  const t=String((yield txtq('Família [IPE/HEA/W/UPN/L/RHS/CHS]',{def:CMD._pt||'HEA'}))||'HEA').toUpperCase().trim();if(!PROF[t]){logE('Família inexistente');return}CMD._pt=t;
  const sz=String((yield txtq('Tamanho ['+Object.keys(PROF[t]).join('/')+']',{def:CMD._ps&&PROF[t][CMD._ps]?CMD._ps:Object.keys(PROF[t])[3]||Object.keys(PROF[t])[0]}))||'').toUpperCase().trim();const loops=profLoops(t,sz);if(!loops){logE('Tamanho fora da tabela');return}CMD._ps=sz;
  const A=Math.abs(polyArea(loops[0]))-(loops[1]?Math.abs(polyArea(loops[1])):0),kgm=A*0.00785;const name=`${t} ${sz}`;
  const v=(yield kwq('Representação',['Seção (pilar)','Elevação/planta (viga)'],{def:'S'}))||'S';
  if(v==='S'){const L=yield num('Comprimento do pilar (mm) para 3D e lista',{def:CMD._pl||3000});CMD._pl=L;
    for(;;){const p=yield pt('Ponto de inserção (centro; Enter encerra)',{opts:['Rotação'],preview:q=>loops.map(l=>G_({type:'pline',pts:l.map(z=>add(z,q)),closed:true}))});if(!p)return;if(p==='R'){CMD._prot=(yield angq('Rotação',{def:0}))*D2R;continue}
      const M=Mmul(Mtr(p.x,p.y),Mrot(CMD._prot||0));const ls=loops.map(l=>l.map(z=>Map_(M,z)));const e=addEnt({type:'pline',pts:ls[0],closed:true,layer:'S-STEEL',th:L,c3:'#8f9aa3'});e.prof={name,L,kgm};
      if(ls[1])addEnt({type:'pline',pts:ls[1],closed:true,layer:'S-STEEL'});addEnt({type:'hatch',loops:ls,pat:'SOLID',sc:1,ang:0,layer:'S-STEEL'});logR(`${name} · ${fmt(kgm,1)} kg/m · ${fmt(kgm*L/1000,1)} kg`)}}
  const b=t==='L'?PROF.L[sz][0]:t==='CHS'?PROF.CHS[sz][0]:t==='RHS'?PROF.RHS[sz][1]:PROF[t][sz][1];
  const hh=t==='L'?PROF.L[sz][0]:t==='CHS'?PROF.CHS[sz][0]:t==='RHS'?PROF.RHS[sz][0]:PROF[t][sz][0];const top=yield num('Elevação do topo da viga para o 3D (0 = só 2D)',{def:CMD._pel??4500});CMD._pel=top;
  for(;;){const a=yield pt('Início da viga (Enter encerra)');if(!a)return;const c=yield pt('Fim da viga',{base:a,preview:q=>{const u=nrm(sub(q,a)),n=mul(perp(u),b/2);return[G_({type:'pline',pts:[add(a,n),add(q,n),sub(q,n),sub(a,n)],closed:true})]}});if(!c)return;
    const u=nrm(sub(c,a)),n=mul(perp(u),b/2),L=dist(a,c);const e=addEnt(Object.assign({type:'pline',pts:[add(a,n),add(c,n),sub(c,n),sub(a,n)],closed:true,layer:'S-STEEL'},top>0?{th:hh,el:top-hh,c3:'#8f9aa3'}:{}));e.prof={name,L,kgm};
    addEnt({type:'line',a,b:c,layer:'M-CENT'});let th=ang(a,c);if(th>Math.PI/2||th<-Math.PI/2)th+=Math.PI;addEnt({type:'text',p:add(mid(a,c),mul(perp(P(Math.cos(th),Math.sin(th))),b/2+60)),h:Math.max(60,b*0.35),rot:th,s:`${name} L=${fmt(L,0)}`,al:'c',vb:'b',layer:'M-ANNO'});logR(`${name} L=${fmt(L,0)} · ${fmt(kgm*L/1000,1)} kg`)}});
defCmd('GEAR',{al:['ENGRENAGEM'],desc:'Engrenagem cilíndrica de dentes retos (evolvente 20°)'},function*(){
  const m=yield num('Módulo (mm)',{def:3});const z=Math.round(yield num('Número de dentes',{def:24}));if(!(m>0&&z>=8&&z<=300)){logE('Use módulo > 0 e 8 a 300 dentes');return}const bore=yield num('Diâmetro do furo',{def:Math.round(m*z*0.25)});const c=yield pt('Centro');if(!c)return;
  const r=m*z/2,al=20*D2R,rb=r*Math.cos(al),ra=r+m,rf=r-1.25*m,inv=Math.tan(al)-al,half=Math.PI/(2*z);const tmax=Math.sqrt((ra/rb)**2-1);const fl=[];
  for(let i=0;i<=10;i++){const t=tmax*i/10,x=rb*(Math.cos(t)+t*Math.sin(t)),y=rb*(Math.sin(t)-t*Math.cos(t));fl.push([Math.hypot(x,y),Math.atan2(y,x)])}
  const pts=[];for(let k=0;k<z;k++){const a0=k*TAU/z;const R_=fl.map(([rr,th])=>pol(c,rr,a0-(half+inv-th))),L_=fl.map(([rr,th])=>pol(c,rr,a0+(half+inv-th))).reverse();
    pts.push(pol(c,rf,a0-(half+inv)));pts.push(...R_);pts.push(...L_);pts.push(pol(c,rf,a0+(half+inv)));const nx=(k+1)*TAU/z-(half+inv),cur=a0+(half+inv);for(let s=1;s<4;s++)pts.push(pol(c,rf,cur+(nx-cur)*s/4))}
  addEnt({type:'pline',pts,closed:true,layer:'M-PART'});if(bore>0)addEnt({type:'circle',c,r:bore/2,layer:'M-PART'});addEnt({type:'circle',c,r,layer:'M-CENT'});
  addEnt({type:'text',p:P(c.x+ra*1.05,c.y+ra*0.7),h:Math.max(2.5,m*1.2),rot:0,s:`m=${m} z=${z}\nØp=${fmt(2*r,2)} Øe=${fmt(2*ra,2)}`,al:'l',vb:'b',layer:'M-ANNO'});logR(`Engrenagem m${m} z${z}: Ø primitivo ${fmt(2*r,2)}, Ø externo ${fmt(2*ra,2)}, Ø pé ${fmt(2*rf,2)}`)});
defCmd('WELD',{al:['SOLDA','WELDSYMBOL'],desc:'Símbolo de solda (AWS/ISO 2553)'},function*(){const a=doc.dim.scale;
  const k=(yield kwq('Tipo',['Filete','Topo em V:V','Topo reto:R','Tampão:T'],{def:'F'}))||'F';const s=(yield txtq('Dimensão (ex.: a5, 6)',{def:'a5'}))||'';const all=(yield kwq('Todo o contorno?',['Sim','Não'],{def:'N'}))==='S';
  const p0=yield pt('Ponta da seta (na junta)');if(!p0)return;const p1=yield pt('Joelho da linha de referência',{base:p0});if(!p1)return;const dir=p1.x>=p0.x?1:-1,L=16*a;const p2=P(p1.x+dir*L,p1.y),mx=p1.x+dir*L*0.45;
  addEnt({type:'line',a:p0,b:p1,layer:'M-ANNO'});addEnt({type:'line',a:p1,b:p2,layer:'M-ANNO'});addEnt({type:'hatch',loops:[arrowTri(p0,nrm(sub(p0,p1)),2.5*a)],pat:'SOLID',sc:1,ang:0,layer:'M-ANNO'});
  const h=3*a;if(k==='F')addEnt({type:'pline',pts:[P(mx,p1.y),P(mx,p1.y-h),P(mx+h,p1.y)],closed:true,layer:'M-ANNO'});if(k==='V')addEnt({type:'pline',pts:[P(mx-h*.6,p1.y-h),P(mx,p1.y),P(mx+h*.6,p1.y-h)],closed:false,layer:'M-ANNO'});
  if(k==='R'){addEnt({type:'line',a:P(mx-h*.3,p1.y),b:P(mx-h*.3,p1.y-h),layer:'M-ANNO'});addEnt({type:'line',a:P(mx+h*.3,p1.y),b:P(mx+h*.3,p1.y-h),layer:'M-ANNO'})}if(k==='T')addEnt({type:'pline',pts:[P(mx-h*.6,p1.y),P(mx-h*.6,p1.y-h*.8),P(mx+h*.6,p1.y-h*.8),P(mx+h*.6,p1.y)],closed:false,layer:'M-ANNO'});
  if(s)addEnt({type:'text',p:P(mx-a*1.2,p1.y-h*0.5),h:2.5*a,rot:0,s,al:'r',vb:'m',layer:'M-ANNO'});if(all)addEnt({type:'circle',c:p1,r:1.6*a,layer:'M-ANNO'})});
defCmd('SURFACE',{al:['RUGOSIDADE','ACABAMENTO'],desc:'Símbolo de rugosidade (ISO 1302)'},function*(){const a=doc.dim.scale;const ra=(yield txtq('Rugosidade',{def:'Ra 1,6'}))||'Ra 1,6';const rem=(yield kwq('Remoção de material',['Obrigatória:O','Proibida:P','Indiferente:I'],{def:'O'}))||'O';
  const p=yield pt('Ponto na superfície');if(!p)return;const h=5*a,b=P(p.x-h*0.58,p.y+h),t=P(p.x+h*1.16,p.y+h*2);addEnt({type:'pline',pts:[b,p,t],closed:false,layer:'M-ANNO'});
  if(rem==='O')addEnt({type:'line',a:b,b:P(p.x+h*0.58,p.y+h),layer:'M-ANNO'});if(rem==='P')addEnt({type:'circle',c:P(p.x,p.y+h*0.62),r:h*0.32,layer:'M-ANNO'});addEnt({type:'line',a:t,b:P(t.x+h*1.6,t.y),layer:'M-ANNO'});
  addEnt({type:'text',p:P(t.x+h*0.1,t.y+a*0.8),h:2.5*a,rot:0,s:ra,al:'l',vb:'b',layer:'M-ANNO'})});

/* ---------- Planta 3D: tubulação, eletrocalha, tanques, transportadores ---------- */
EXT.pipe={geom(e){const r=e.od/2,segs=plSegs(e.pts,false),L=[],C=[];for(const s of segs){const n=mul(perp(nrm(sub(s.b,s.a))),r);L.push([add(s.a,n),add(s.b,n)],[sub(s.a,n),sub(s.b,n)]);C.push([s.a,s.b])}return{L,C}},
  draw(e,ov){const g=EXT.pipe.geom(e);stroke(e,ov);ctx.beginPath();for(const[a,b]of g.L){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}ctx.stroke();if(!ov){ctx.save();ctx.setLineDash([12/V.s,3/V.s,2/V.s,3/V.s]);ctx.lineWidth=1/V.s;ctx.beginPath();for(const[a,b]of g.C){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}ctx.stroke();ctx.restore()}
    if(e.shape!=='tray')for(const q of e.pts.slice(1,-1)){ctx.beginPath();ctx.arc(q.x,q.y,e.od/2,0,TAU);ctx.stroke()}
    if(e.tag&&!ov){const s=plSegs(e.pts,false)[0];let th=ang(s.a,s.b);if(th>Math.PI/2||th<-Math.PI/2)th+=Math.PI;drawText({p:add(mid(s.a,s.b),mul(perp(P(Math.cos(th),Math.sin(th))),e.od/2+60)),h:Math.max(80,e.od*0.4),rot:th,s:e.tag+' · EL '+fmt(e.el,0),al:'c',vb:'b'},ctx.fillStyle)}},
  bbox(e){const b=bboxPts(e.pts);const r=e.od/2;return{x0:b.x0-r,y0:b.y0-r,x1:b.x1+r,y1:b.y1+r}},
  dist(e,p){let d=Infinity;for(const s of plSegs(e.pts,false))d=Math.min(d,dist(p,closestOnPrim(s,p)));return Math.max(0,d-e.od/2)},
  xf(e,M){e.pts=e.pts.map(p=>Map_(M,p))},
  svg(e){const g=EXT.pipe.geom(e);return`<path d="${g.L.map(([a,b])=>`M${num0(a.x)} ${num0(a.y)}L${num0(b.x)} ${num0(b.y)}`).join('')}" stroke="#000" stroke-width="${num0(Math.max(2,e.od/60))}" fill="none"/>`},
  three(e,{gF,mat}){const T=window.THREE,M=v=>v/1000;const col=e.shape==='tray'?'#c4a24a':(e.c3||'#7c8a96');const m=mat(col,{metalness:.3,roughness:.5});
    for(const s of plSegs(e.pts,false)){const L=dist(s.a,s.b);if(L<1)continue;const c=mid(s.a,s.b);
      if(e.shape==='tray'){const g=new T.BoxGeometry(M(L),M(e.h||100),M(e.od));const ms=new T.Mesh(g,m);ms.position.set(M(c.x),M(e.el),-M(c.y));ms.rotation.y=ang(s.a,s.b);ms.castShadow=true;gF.add(ms);continue}
      const g=new T.CylinderGeometry(M(e.od/2),M(e.od/2),M(L),18);const ms=new T.Mesh(g,m);ms.position.set(M(c.x),M(e.el),-M(c.y));const d=new T.Vector3(M(s.b.x-s.a.x),0,-M(s.b.y-s.a.y)).normalize();ms.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d);ms.castShadow=true;gF.add(ms)}
    if(e.shape!=='tray')for(const q of e.pts.slice(1,-1)){const sp=new T.Mesh(new T.SphereGeometry(M(e.od/2)*1.02,16,12),m);sp.position.set(M(q.x),M(e.el),-M(q.y));gF.add(sp)}
    if(e.drop){for(const q of[e.pts[0],e.pts[e.pts.length-1]]){const g=new T.CylinderGeometry(M(e.od/2),M(e.od/2),M(e.el),18);const ms=new T.Mesh(g,m);ms.position.set(M(q.x),M(e.el/2),-M(q.y));gF.add(ms)}}}};
const DN={15:21.3,20:26.7,25:33.4,32:42.2,40:48.3,50:60.3,65:73,80:88.9,100:114.3,125:141.3,150:168.3,200:219.1,250:273,300:323.9};
defCmd('PIPE3D',{al:['TUBO','TUBULACAO','PIPE'],desc:'Tubulação com diâmetro e elevação (gera 3D)'},function*(){
  const dn=Math.round(yield num('Diâmetro nominal DN ['+Object.keys(DN).join('/')+']',{def:CMD._dn||100}));if(!DN[dn]){logE('DN fora da tabela');return}CMD._dn=dn;const el=yield num('Elevação do eixo (mm)',{def:CMD._el||3500});CMD._el=el;
  const tag=(yield txtq('Identificação',{def:`DN${dn}-${nextTag('#')}`}))||'';const drop=(yield kwq('Descer às pontas até o piso?',['Sim','Não'],{def:'N'}))==='S';
  const o=ST.ortho;ST.ortho=true;syncStatus();try{const p0=yield pt('Início do traçado');if(!p0)return;const pts=[p0];
    for(;;){const p=yield pt('Próximo ponto (Enter conclui)',{base:pts[pts.length-1],opts:['Desfazer'],preview:q=>[G_({type:'pipe',pts:[...pts,q],od:DN[dn],el,layer:'I-PIPE'})]});if(p==null)break;if(p==='D'){if(pts.length>1)pts.pop();continue}pts.push(p)}
    if(pts.length<2)return;const e=mk({type:'pipe',pts,od:DN[dn],dn,el,tag,drop,layer:'I-PIPE'});logR(`${tag}: ${fmt(polyPerim(pts,false)/1000,2)} m de tubo, ${pts.length-2} curva(s)`)}finally{ST.ortho=o;syncStatus()}});
defCmd('CABLETRAY',{al:['ELETROCALHA','TRAY'],desc:'Eletrocalha com largura e elevação (gera 3D)'},function*(){
  const w=yield num('Largura (mm)',{def:300});const h=yield num('Altura da aba (mm)',{def:100});const el=yield num('Elevação (mm)',{def:4200});const tag=(yield txtq('Identificação',{def:'EC-'+nextTag('#')}))||'';
  const o=ST.ortho;ST.ortho=true;syncStatus();try{const p0=yield pt('Início');if(!p0)return;const pts=[p0];
    for(;;){const p=yield pt('Próximo ponto (Enter conclui)',{base:pts[pts.length-1],preview:q=>[G_({type:'pipe',shape:'tray',pts:[...pts,q],od:w,h,el,layer:'I-TRAY'})]});if(!p)break;pts.push(p)}
    if(pts.length>1){mk({type:'pipe',shape:'tray',pts,od:w,h,el,tag,layer:'I-TRAY'});logR(`${tag}: ${fmt(polyPerim(pts,false)/1000,2)} m`)}}finally{ST.ortho=o;syncStatus()}});
defCmd('TANK',{al:['TANQUE','SILO'],desc:'Tanque vertical cilíndrico (gera 3D)'},function*(){const D=yield num('Diâmetro (mm)',{def:3000});const H=yield num('Altura (mm)',{def:6000});const tag=(yield txtq('TAG',{def:nextTag('TQ-')}))||'';
  const p=yield pt('Centro',{preview:q=>[G_({type:'circle',c:q,r:D/2})]});if(!p)return;const e=mk({type:'circle',c:p,r:D/2,th:H,layer:'I-EQPT',c3:'#d9dde1'});e.etag=tag;e.eqd={tipo:'Tanque',desc:`Ø${D} × ${H}`};
  addEnt({type:'circle',c:p,r:D/2-60,layer:'I-EQPT'});addEnt({type:'line',a:P(p.x-D*0.6,p.y),b:P(p.x+D*0.6,p.y),layer:'M-CENT'});addEnt({type:'line',a:P(p.x,p.y-D*0.6),b:P(p.x,p.y+D*0.6),layer:'M-CENT'});
  addEnt({type:'text',p,h:Math.max(150,D*0.08),rot:0,s:tag+'\n'+fmt(Math.PI*D*D/4*H/1e9,1)+' m³',al:'c',vb:'m',layer:'I-EQPT'});logR(`${tag}: ${fmt(Math.PI*D*D/4*H/1e9,2)} m³`)});
defCmd('CONVEYOR',{al:['TRANSPORTADOR','ESTEIRA'],desc:'Transportador de correia (gera 3D)'},function*(){const w=yield num('Largura da correia (mm)',{def:800});const h=yield num('Altura da correia (mm)',{def:900});const tag=(yield txtq('TAG',{def:nextTag('TC-')}))||'';
  const a=yield pt('Cabeceira (início)');if(!a)return;const b=yield pt('Retorno (fim)',{base:a,preview:q=>{const n=mul(perp(nrm(sub(q,a))),w/2+60);return[G_({type:'pline',pts:[add(a,n),add(q,n),sub(q,n),sub(a,n)],closed:true})]}});if(!b)return;
  const u=nrm(sub(b,a)),n=mul(perp(u),w/2),nf=mul(perp(u),w/2+60),L=dist(a,b);
  const e=mk({type:'pline',pts:[add(a,n),add(b,n),sub(b,n),sub(a,n)],closed:true,layer:'I-EQPT',th:80,el:h-80,c3:'#2b2f33'});e.etag=tag;e.eqd={tipo:'Transportador',desc:`L ${fmt(L,0)} × ${w}`};
  addEnt({type:'pline',pts:[add(a,nf),add(b,nf),add(b,mul(perp(u),w/2)),add(a,mul(perp(u),w/2))],closed:true,layer:'I-EQPT',th:h,c3:'#e0a020'});addEnt({type:'pline',pts:[sub(a,nf),sub(b,nf),sub(b,mul(perp(u),w/2)),sub(a,mul(perp(u),w/2))],closed:true,layer:'I-EQPT',th:h,c3:'#e0a020'});
  for(const q of[a,b])addEnt({type:'circle',c:q,r:w*0.25,layer:'I-EQPT'});const nr=Math.max(2,Math.floor(L/1200));for(let i=1;i<nr;i++){const q=lerp(a,b,i/nr);addEnt({type:'line',a:add(q,n),b:sub(q,n),layer:'I-EQPT',lt:'HIDDEN'})}
  let th=ang(a,b);if(th>Math.PI/2||th<-Math.PI/2)th+=Math.PI;addEnt({type:'text',p:add(mid(a,b),mul(perp(P(Math.cos(th),Math.sin(th))),w/2+200)),h:180,rot:th,s:`${tag} · ${fmt(L/1000,1)} m`,al:'c',vb:'b',layer:'I-EQPT'})});

/* ---------- Listas industriais ---------- */
function indLists(){const L={eq:[],inst:[],lines:[],wires:[],steel:[],bom:{}};
  for(const e of doc.ents){
    if(e.type==='insert'){const B=doc.blocks[e.name];if(!B)continue;L.bom[e.name]=(L.bom[e.name]||0)+1;const A=e.attrs||{};
      if(B.kind==='inst')L.inst.push([`${A.FUNC||''}-${A.LOOP||''}`,A.FUNC||'',A.LOOP||'',B.label,e.layer]);
      else if(B.kind==='equip'||B.kind==='equip3'||B.kind==='valve')L.eq.push([A.TAG||'(sem TAG)',B.label,B.cat||'',fmtN(e.p.x,0)+'; '+fmtN(e.p.y,0)])
      else if(B.kind==='elec'&&A.TAG)L.eq.push([A.TAG,B.label,'Elétrico','']);}
    if(e.etag&&e.eqd)L.eq.push([e.etag,e.eqd.tipo+' '+e.eqd.desc,'Planta',fmtN(bboxEnt(e).x0,0)]);
    if(e.ltag)L.lines.push([e.ltag,fmt(polyPerim(e.pts,false)/1000,2),e.layer]);if(e.type==='pipe')L.lines.push([e.tag||'—',fmt(polyPerim(e.pts,false)/1000,2),e.shape==='tray'?`Eletrocalha ${e.od}×${e.h}`:`DN${e.dn} · EL ${e.el}`]);
    if(e.wno)L.wires.push([e.wno,fmt(polyPerim(e.pts,false)/1000*doc.dim.scale/50,2),String(e.pts.length-1)+' trecho(s)']);
    if(e.prof)L.steel.push([e.prof.name,fmt(e.prof.L,0),fmt(e.prof.kgm,2),fmt(e.prof.kgm*e.prof.L/1000,1)])}
  return L}
defCmd('INDLISTS',{al:['LISTAS','LISTASINDUSTRIAIS','BOM'],instant:true,desc:'Listas: equipamentos, instrumentos, linhas, fios, aço e materiais'},()=>dlgLists());
function dlgLists(tab='eq'){const L=indLists();const T={eq:['Equipamentos',['TAG','Descrição','Disciplina','Posição'],L.eq],inst:['Instrumentos',['TAG','Função','Malha','Tipo','Camada'],L.inst],lines:['Linhas e tubos',['Identificação','Comprimento (m)','Classe / dados'],L.lines],
   wires:['Fios',['Número','Comprimento no esquema','Trechos'],L.wires],steel:['Aço estrutural',['Perfil','Comprimento (mm)','kg/m','Massa (kg)'],L.steel],bom:['Materiais (blocos)',['Bloco','Descrição','Quantidade'],Object.entries(L.bom).map(([k,n])=>[k,(doc.blocks[k]||{}).label||k,String(n)])]};
  const[t,h,rows]=T[tab];let foot='';if(tab==='steel'&&rows.length)foot=`<p><b>Total: ${fmt(L.steel.reduce((s,r)=>s+parseFloat(r[3].replace(',','.')),0),1)} kg</b></p>`;
  modal('Listas industriais',`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${Object.entries(T).map(([k,v])=>`<button class="tb${k===tab?' primary':''}" data-lt="${k}">${v[0]} (${v[2].length})</button>`).join('')}</div>
   ${rows.length?`<div style="overflow:auto"><table style="border-collapse:collapse;width:100%;font-size:12px">${'<tr>'+h.map(c=>`<th style="text-align:left;border-bottom:1px solid var(--line);padding:4px">${c}</th>`).join('')+'</tr>'}${rows.map(r=>'<tr>'+r.map(c=>`<td style="border-bottom:1px solid var(--line);padding:4px">${esc(c)}</td>`).join('')+'</tr>').join('')}</table></div>${foot}`:'<p class="small">Nada desta categoria no desenho ainda.</p>'}`,
   [{label:'Baixar CSV',keep:true,fn:()=>download(`${(doc.name||'desenho').replace(/\W+/g,'_')}_${tab}.csv`,'\ufeff'+[h,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n'),'text/csv')},{label:'Fechar',fn:()=>{}}]);
  $('#mdlB').onclick=e=>{const k=e.target.dataset.lt;if(k)dlgLists(k)}}

/* ---------- Biblioteca com categorias ---------- */
let _blkCat='Todos';
function renderBlocks(){const box=$('#blkList');if(!box)return;readColsOnce();const cats=['Todos',...new Set(Object.values(doc.blocks).map(B=>B.cat||'Arquitetura'))];
  box.innerHTML=`<div style="grid-column:1/-1;display:flex;gap:4px;flex-wrap:wrap">${cats.map(c=>`<button class="tb${c===_blkCat?' primary':''}" data-bc="${esc(c)}" style="min-height:26px;padding:2px 8px;flex-direction:row">${esc(c)}</button>`).join('')}</div>`;
  box.querySelectorAll('[data-bc]').forEach(b=>b.onclick=()=>{_blkCat=b.dataset.bc;renderBlocks()});
  for(const[k,B]of Object.entries(doc.blocks)){if(_blkCat!=='Todos'&&(B.cat||'Arquitetura')!==_blkCat)continue;const b=document.createElement('button');b.innerHTML=`<canvas width="200" height="140"></canvas><span>${esc(B.label||k)}</span>`;
    b.onclick=()=>{CMD.script.unshift(k);startCmd('INSERT');if(innerWidth<760)$('#blocksP').classList.remove('open')};box.appendChild(b);
    const c=b.querySelector('canvas'),x=c.getContext('2d');const fake={type:'insert',name:k,p:P(0,0),sx:1,sy:1,rot:0,layer:'0',color:'BL',lt:'BL',lw:-1,attrs:{}};const bb=bboxEnt(fake);const s=Math.min(180/Math.max(1,bb.x1-bb.x0),120/Math.max(1,bb.y1-bb.y0));
    const sv={...V};V.s=s;V.ox=100-(bb.x0+bb.x1)/2*s;V.oy=70+(bb.y0+bb.y1)/2*s;x.setTransform(s,0,0,-s,V.ox,V.oy);x.lineCap='round';drawWith(x,()=>{for(const ch of childEnts(fake))drawEnt(ch,{c:COL['model-fg'],w:1.2,dash:[]})});Object.assign(V,sv)}}

/* ---------- demonstração industrial ---------- */
function indDemoScript(){const L=[],A=(...a)=>L.push(...a);const ins=(n,p,r,...att)=>A('INSERT',n,p,'1','',String(r),...att);
  A('#PHASE:0','CLAYER','P-EQPT');ins('VESSEL-V','0,0',0,'TQ-101');ins('PUMP-C','4000,-1400',0,'P-101');ins('HX','11000,-1100',0,'E-101');
  A('PROCESSLINE','P','0,-750','0,-1400','3400,-1400','','2"-P-0101-A1');A('PROCESSLINE','P','4450,-1100','4450,-200','6500,-200','6500,-1100','10700,-1100','','2"-P-0102-A1');
  A('CLAYER','P-EQPT');ins('V-CONTROL','8000,-1100',0,'FV-101');ins('V-GATE','2000,-1400',0,'HV-101');ins('V-CHECK','5600,-200',0,'CV-101');
  A('#PHASE:1','INSTRUMENT','D','LIC','101','1200,1500','400,700','INSTRUMENT','C','FT','102','6500,1300','6500,-1100','INSTRUMENT','D','FIC','102','8000,2600','');
  A('PROCESSLINE','S','6800,1300','8000,1300','8000,2300','','PROCESSLINE','S','8000,2300','8000,200','');
  A('#PHASE:2','CLAYER','E-SYMB','LADDER','16000,-3000','5','1250','3000','L+ 24 Vcc','M 0 V');
  ins('E-PB-NC','17250,-500',0,'-S0');ins('E-PB-NO','17250,-1500',0,'-S1');ins('E-COIL','17250,-2500',0,'-K1');ins('E-NO','18500,-1500',0,'-K1');ins('E-LAMP','19750,-1500',0,'-H1');
  A('WIRE','17250,0','17250,-200','','','WIRE','18500,0','18500,-700','','');
  A('#PHASE:3','CLAYER','S-STEEL','PROFILE','HEA','200','S','4500','0,-9000','6000,-9000','','PROFILE','IPE','200','E','4500','0,-9000','6000,-9000','');
  A('CLAYER','I-EQPT','TANK','3000','5000','TQ-101','-4000,-10000','PIPE3D','100','3500','DN100-P-0101','S','-2400,-10000','-2400,-12500','3000,-12500','','CABLETRAY','300','100','4300','EC-01','0,-8000','6000,-8000','',
    'CONVEYOR','800','900','TC-01','9000,-9000','20000,-9000');ins('PL-PUMP','3000,-11500',0,'P-101');ins('PL-CCM','7500,-11500',0,'CCM-01');
  A('#ZOOM','#PHASE:4');return L}
function runIndDemo(ok){if(!ok&&doc.ents.length){askConfirm('A demonstração industrial começa um desenho novo. Salve antes se quiser guardar o atual.',()=>runIndDemo(true),'Começar demonstração');return}stopScript();cancelCmd(true);undoS=[];redoS=[];doc=newDoc('Planta industrial');$('#fname').textContent=doc.name;SEL.clear();dirty();refreshPanels();renderBlocks();
  zoomBox({x0:-6000,y0:-14000,x1:22000,y1:4000});STEPS_IND();setPhase(0);runScript(indDemoScript().map(l=>l==='17250,-500+'?'17250,-500':l),innerWidth<700?18:24,()=>{autosave();toast('Demonstração industrial pronta. Abrindo o 3D da planta…');setTimeout(()=>{setPhase(null);STEPS_RESET();open3D()},700)})}
let _stepsBak=null;function STEPS_IND(){_stepsBak=STEPS.slice();STEPS.splice(0,STEPS.length,'P&ID: tanque, bomba, trocador e válvulas','Instrumentos e malha de controle ISA 5.1','Esquema elétrico IEC: partida com selo','Perfis, tanque, tubulação, eletrocalha e esteira','3D da planta')}
function STEPS_RESET(){if(_stepsBak)STEPS.splice(0,STEPS.length,..._stepsBak)}
defCmd('DEMOIND',{al:['DEMOINDUSTRIAL'],instant:true,desc:'Demonstração industrial (P&ID, elétrico, aço, planta 3D)'},()=>runIndDemo());

/* ---------- ribbon ---------- */
Object.assign(IC,{valve:'<path d="M3 7v10l9-5zM21 7v10l-9-5z"/>',cvalve:'<path d="M3 11v9l9-4.5zM21 11v9l-9-4.5z"/><path d="M12 15.5V8M8 8a4 4 0 0 1 8 0z"/>',pump:'<circle cx="11" cy="12" r="7"/><path d="M11 5h9v4"/><path d="M6 17l-2 4h14l-2-4"/>',
 vessel:'<path d="M6 6v12M18 6v12"/><ellipse cx="12" cy="6" rx="6" ry="2.5"/><ellipse cx="12" cy="18" rx="6" ry="2.5"/>',bubble:'<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>',procl:'<path d="M3 17h7V7h11"/><path d="M14 4l4 3-4 3z" fill="currentColor"/>',
 ladder:'<path d="M3 5h18M3 19h18M8 5v14M16 5v14" /><path d="M7 11h2M15 11h2"/>',wire:'<path d="M4 4v8h16v8"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/>',contact:'<path d="M12 3v6M12 15v6M12 15l-4-6"/>',coil:'<rect x="7" y="8" width="10" height="8"/><path d="M12 3v5M12 16v5"/>',motor:'<circle cx="12" cy="12" r="8"/><text x="8" y="15" font-size="8" fill="currentColor" stroke="none">M</text>',
 bolt:'<path d="M8 3h8v4H8zM10 7h4v14h-4z"/><path d="M10 11h4M10 14h4M10 17h4"/>',bearing:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="5.5" r="1.5"/><circle cx="18.5" cy="12" r="1.5"/><circle cx="12" cy="18.5" r="1.5"/><circle cx="5.5" cy="12" r="1.5"/>',
 iprof:'<path d="M5 4h14v3h-5v10h5v3H5v-3h5V7H5z"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/><circle cx="12" cy="12" r="7"/>',weld:'<path d="M3 20l6-8h12"/><path d="M13 12v-4l4 4"/>',surf:'<path d="M5 12l3 6 6-14h6"/>',
 pipe:'<path d="M3 9h12a4 4 0 0 1 4 4v8M3 15h12a-2 2 0 0 0 0 0"/><path d="M3 15h10a2 2 0 0 1 2 2v4"/>',tray:'<path d="M3 9v6h18V9"/><path d="M7 12h0M12 12h0M17 12h0"/>',tank:'<ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v14M19 5v14"/><path d="M5 19a7 2.5 0 0 0 14 0"/>',conv:'<circle cx="5" cy="14" r="3"/><circle cx="19" cy="14" r="3"/><path d="M5 11h14M5 17h14"/>',
 lists:'<rect x="4" y="3" width="16" height="18"/><path d="M8 8h8M8 12h8M8 16h5"/>',demoi:'<path d="M3 21V10l5 3V10l5 3V10l5 3V4h3v17z"/>'});
RIB.splice(5,0,['Industrial',[['Linha P&ID','PROCESSLINE','procl'],['Válvula','INSERT V-GATE','valve'],['Vál. controle','INSERT V-CONTROL','cvalve'],['Bomba','INSERT PUMP-C','pump'],['Tanque P&ID','INSERT VESSEL-V','vessel'],['Instrumento','INSTRUMENT','bubble'],'|',
  ['Esquema','LADDER','ladder'],['Fio','WIRE','wire'],['Contato NA','INSERT E-NO','contact'],['Bobina','INSERT E-COIL','coil'],['Motor','INSERT E-MOTOR3','motor'],'|',
  ['Parafuso','BOLT','bolt'],['Rolamento','BEARING','bearing'],['Perfil aço','PROFILE','iprof'],['Engrenagem','GEAR','gear'],['Solda','WELD','weld'],['Rugosidade','SURFACE','surf'],'|',
  ['Tubulação','PIPE3D','pipe'],['Eletrocalha','CABLETRAY','tray'],['Tanque 3D','TANK','tank'],['Esteira','CONVEYOR','conv'],['Biblioteca','BLOCKS','lib'],'|',['Listas','INDLISTS','lists'],['Demo indústria','DEMOIND','demoi']]]);
/* ============ demonstrações adicionais ============ */
function runDemoX(o,ok){if(!ok&&doc.ents.length){askConfirm(`A demonstração “${o.title}” começa um desenho novo. Salve antes se quiser guardar o atual.`,()=>runDemoX(o,true),'Começar demonstração');return}
  stopScript();cancelCmd(true);closeModal();close3D&&close3D();undoS=[];redoS=[];doc=newDoc(o.title);$('#fname').textContent=doc.name;SEL.clear();dirty();refreshPanels();renderBlocks();
  zoomBox(o.box,0.04);const bak=STEPS.slice();STEPS.splice(0,STEPS.length,...o.steps);setPhase(0);log('Demonstração: '+o.title);
  runScript(o.script(),innerWidth<700?16:22,()=>{autosave();setTimeout(()=>{setPhase(null);STEPS.splice(0,STEPS.length,...bak);toast(o.done||'Demonstração concluída');o.end&&o.end()},600)})}
window.demoParamBump=()=>{const c=(doc.cons||[]).find(c=>c.name==='d1');if(!c)return;withUndo(()=>{c.expr='260';solveCons()});logR('d1 alterado de 200 para 260 → d2 = d1*0,6 recalculado para 156; a chapa se redesenhou sozinha');requestDraw()};
window.demoShowParams=()=>dlgParams();
const DEMOS={
 mech:{title:'Eixo de transmissão',icon:'gear',desc:'Eixo escalonado, rolamentos 6205 em corte, engrenagem evolvente, parafusos ISO, cotas, GD&T, rugosidade, solda e folha A3 com 2 viewports.',
  box:{x0:-60,y0:-130,x1:400,y1:90},steps:['Perfil do eixo e linha de centro','Rolamentos, engrenagem e parafusos','Cotas com diâmetros e tolerância','GD&T, rugosidade e solda','Folha A3 com viewports'],
  done:'Folha montada: vista do eixo e da engrenagem em 1:1',end:()=>dlgPlot(),
  script(){const L=[],A=(...a)=>L.push(...a);
   A('#PHASE:0','DIMSCALE','1.5','CLAYER','M-PART','PLINE','0,-15','60,-15','60,-12.5','140,-12.5','140,-10','180,-10','180,10','140,10','140,12.5','60,12.5','60,15','0,15','F',
     'LINE','60,-12.5','60,12.5','','LINE','140,-10','140,10','','RECTANG','90,-4','120,4','CLAYER','M-CENT','LINE','-12,0','192,0','');
   A('#PHASE:1','BEARING','6205','C','75,0','BEARING','6205','C','125,0','GEAR','2','30','20','320,0','BOLT','M8','30','L','230,-75','0','BOLT','M8','30','T','280,-75','0');
   A('#PHASE:2','CLAYER','A-DIMS','DIMLINEAR','0,-15','60,-12.5','30,-48','DIMCONTINUE','140,-10','180,-10','','DIMLINEAR','0,-15','180,-10','90,-62',
     'DIMLINEAR','20,-15','20,15','T','Ø<> h6','-28,0','DIMLINEAR','100,-12.5','100,12.5','T','Ø<> k6','100,40');
   A('#PHASE:3','CLAYER','M-ANNO','DATUM','30,-15','30,-36','A','TOLERANCE','O','Ø0,02','A','150,30','SURFACE','Ra 0,8','O','100,12.5',
     'CLAYER','M-PART','RECTANG','220,30','300,36','RECTANG','220,36','226,80','WELD','F','a4','S','226,40','250,62',
     'CLAYER','M-ANNO','TEXT','J','MC','90,-100','6','0','EIXO DE TRANSMISSÃO · AÇO SAE 1045 · RECOZIDO');
   A('#PHASE:4','MVIEW','-45,-110','205,60','1','Eixo – vista lateral','MVIEW','275,-50','370,50','1','Engrenagem m2 z30','#ZOOM');return L}},
 param:{title:'Chapa paramétrica',icon:'params',desc:'Restrições geométricas e cotas paramétricas com expressão (d2 = d1·0,6), alteração do parâmetro, booleanas (união e furos), bloco com atributos.',
  box:{x0:-60,y0:-90,x1:340,y1:220},steps:['Contorno e restrições automáticas','Cotas paramétricas d1 e d2 = d1·0,6','Mudar d1: geometria recalcula','União da aba e subtração dos furos','Etiqueta com atributos e cotas'],
  done:'Chapa pronta: geometria guiada por parâmetros e furos por booleana',
  script(){const L=[],A=(...a)=>L.push(...a);
   A('#PHASE:0','DIMSCALE','1','CLAYER','M-PART','LINE','0,0','200,0','200,120','0,120','F','AUTOCONSTRAIN','ALL','','GCFIX','1,0','');
   A('#PHASE:1','DCHORIZONTAL','100,0','200','','DCVERTICAL','200,60','d1*0.6','','#CALL:demoShowParams','#WAIT:1800','#CALL:closeModal');
   A('#PHASE:2','#CALL:demoParamBump','#WAIT:1200');
   A('#PHASE:3','JOIN','ALL','','RECTANG','100,150','160,190','UNION','130,0','130,190','',
     'CIRCLE','20,20','6','CIRCLE','240,20','6','CIRCLE','240,136','6','CIRCLE','20,136','6','RECTANG','110,60','150,96','SUBTRACT','130,0','','W','-10,-10','300,220','');
   A('#PHASE:4','CLAYER','M-ANNO','ATTDEF','PECA','Código da peça','CH-001','0,-50','6','ATTDEF','MAT','Material','ASTM A36','0,-60','4','RECTANG','-40,-68','40,-40',
     'BLOCK','ETIQUETA','-40,-68','W','-45,-70','45,-35','','G','INSERT','ETIQUETA','220,-60','1','','0','CH-002','AISI 304',
     'CLAYER','A-DIMS','DIMLINEAR','0,0','260,0','130,-22','DIMLINEAR','260,0','260,156','285,78','LEADER','24,24','60,48','','4× Ø12 PASSANTE','#ZOOM');return L}},
 elec:{title:'Partida estrela-triângulo',icon:'ladder',desc:'Esquema de comando IEC com 7 caminhos, selo, temporizador, intertravamento, sinaleiros, bornes e cartões de E/S do CLP, fios numerados e lista de componentes.',
  box:{x0:-1500,y0:-4800,x1:10500,y1:6300},steps:['Trilhos e caminhos numerados','Comando: emergência, liga, desliga e selo','Estrela, triângulo e temporizador com intertravamento','Sinaleiros, bornes e E/S do CLP','Fios numerados e lista de componentes'],
  done:'Esquema completo. Veja a lista de componentes gerada a partir das TAGs',end:()=>dlgLists('eq'),
  script(){const L=[],A=(...a)=>L.push(...a);const ins=(n,p,...att)=>A('INSERT',n,p,'1','','0',...att);const Y=[4300,3100,1900,700];
   const cols=[[['E-NC','-F1'],['E-PB-NC','-S0'],['E-PB-NO','-S1'],['E-COIL','-K1']],[null,null,['E-NO','-K1'],null],[['E-NO','-K1'],['E-NC','-K4'],['E-NC','-K3'],['E-COIL','-K2']],
     [['E-NO','-K1'],['E-NO','-K4'],['E-NC','-K2'],['E-COIL','-K3']],[['E-NO','-K1'],null,null,['E-COIL','-K4']],[['E-NO','-K2'],null,null,['E-LAMP','-H1']],[['E-NO','-K3'],null,null,['E-LAMP','-H2']]];
   A('#PHASE:0','CLAYER','E-SYMB','LADDER','0,0','7','1250','5000','L1 220 Vca','N');
   cols.forEach((c,i)=>{if(i===2)A('#PHASE:2');if(i===5)A('#PHASE:3');if(i===0)A('#PHASE:1');const x=1250*(i+1);c.forEach((s,j)=>{if(s)ins(s[0],`${x},${Y[j]}`,s[1])})});
   A('#PHASE:4','CLAYER','E-WIRE','WIRE');
   cols.forEach((c,i)=>{const x=1250*(i+1);if(i===1){A('1250,2500','2500,2500','2500,2400','','2500,1400','2500,1300','1250,1300','');return}let top=5000;c.forEach((s,j)=>{if(s){A(`${x},${top}`,`${x},${Y[j]+500}`,'');top=Y[j]-500}});A(`${x},${top}`,`${x},0`,'')});A('');
   A('CLAYER','E-SYMB');for(let i=1;i<=4;i++)ins('E-TERM',`${1250*i},-700`,'X1:'+i);
   ['%I0.0','%I0.1','%I0.2','%I0.3'].forEach((t,i)=>ins('E-PLC-DI',`${1250*(i+1)},-2000`,t));['%Q0.0','%Q0.1','%Q0.2','%Q0.3'].forEach((t,i)=>ins('E-PLC-DO',`${1250*(i+1)},-3600`,t));
   A('CLAYER','E-TEXT','TEXT','J','MC','4400,-4500','250','0','PARTIDA ESTRELA-TRIÂNGULO · COMANDO 220 Vca · CLP S7-1200','#ZOOM');return L}},
 hall:{title:'Galpão com pipe rack',icon:'cube',desc:'Galpão de 18 × 16 m com paredes, portão e janelas, pilares HEA 300 e vigas IPE 300, pipe rack com 3 linhas e eletrocalha, tanques, bombas, compressor, CCM, porta-paletes e esteira, tudo em 3D.',
  box:{x0:-3000,y0:-3000,x1:25000,y1:19000},steps:['Grade e paredes do galpão','Estrutura metálica: pilares e vigas','Pipe rack, tubulação e eletrocalha','Equipamentos e armazenagem','Construir em 3D'],
  done:'Galpão pronto. Abrindo o modelo 3D…',end:()=>open3D(),
  script(){const L=[],A=(...a)=>L.push(...a);const ins=(n,p,r,...att)=>A('INSERT',n,p,'1','',String(r),...att);
   A('#PHASE:0','CLAYER','S-GRID');[0,6000,12000,18000].forEach(x=>A('LINE',`${x},-1500`,`${x},17500`,''));[0,8000,16000].forEach(y=>A('LINE',`-1500,${y}`,`19500,${y}`,''));
   A('CLAYER','A-WALL','WALL','E','200','I','0','A','6000','0,0','0,16000','18000,16000','18000,0','F','CLAYER','A-DOOR');A('INSERT','DOOR2','9000,0','2','','0');
   A('CLAYER','A-GLAZ');[3000,9000,15000].forEach(x=>A('INSERT','WINDOW',`${x},16000`,'2.4','1','0'));[4000,12000].forEach(y=>A('INSERT','WINDOW',`0,${y}`,'2.4','1','90'));
   A('#PHASE:1','CLAYER','S-STEEL','PROFILE','HEA','300','S','6000');[0,6000,12000,18000].forEach(x=>[0,16000].forEach(y=>A(`${x},${y}`)));A('');
   A('PROFILE','IPE','300','E','6000');[0,6000,12000,18000].forEach(x=>A(`${x},0`,`${x},16000`));A('');
   A('#PHASE:2','PROFILE','HEA','160','S','4500');[3000,9000,15000].forEach(x=>[6000,9000].forEach(y=>A(`${x},${y}`)));A('');
   A('PROFILE','IPE','160','E','4500');[3000,9000,15000].forEach(x=>A(`${x},6000`,`${x},9000`));A('');
   A('PIPE3D','150','4650','DN150-AG-001','N','1000,6700','17000,6700','','PIPE3D','100','4650','DN100-VA-002','N','1000,7400','17000,7400','',
     'PIPE3D','80','4650','DN80-AR-003','S','1500,8200','16500,8200','16500,12500','','CABLETRAY','400','100','5300','EC-01','1000,8700','17000,8700','');
   A('#PHASE:3','TANK','2500','5000','TQ-201','21500,4000','TANK','2500','5000','TQ-202','21500,9000');
   ins('PL-PUMP','2500,3000',0,'P-201');ins('PL-PUMP','5000,3000',0,'P-202');ins('PL-COMP','14500,3000',0,'K-201');ins('PL-HX','11000,3000',0,'E-201');ins('PL-CCM','16800,14800',0,'CCM-01');
   [2500,5300,8100].forEach(x=>ins('PL-RACK',`${x},14500`,0));A('CONVEYOR','800','900','TC-201','1500,11500','12000,11500');
   A('CLAYER','A-ANNO','TEXT','J','MC','9000,-2400','400','0','GALPÃO DE PRODUÇÃO · 18 × 16 m · PÉ-DIREITO 6 m','#ZOOM','#PHASE:4');return L}}};
function dlgDemos(){const items=[['apto','Apartamento 92 m²','Grade, pilares, paredes com isolamento, portas, janelas, mobiliário, cotas, áreas e paredes subindo em 3D.','room',()=>runDemo()],
   ['ind','Planta industrial','P&ID com malha de controle, partida com selo, pórtico de aço, tanque, tubulação, eletrocalha e esteira em 3D.','demoi',()=>runIndDemo()],
   ...Object.entries(DEMOS).map(([k,d])=>[k,d.title,d.desc,d.icon,()=>runDemoX(d)])];
  modal('Demonstrações',`<p class="small">Cada demonstração desenha do zero, comando a comando, como um desenhista faria. Esc interrompe; Ctrl+Z desfaz passo a passo.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">${items.map(([k,t,d,ic])=>`<button class="tb" data-demo="${k}" style="flex-direction:column;align-items:flex-start;text-align:left;padding:10px;white-space:normal;gap:4px"><span style="display:flex;gap:8px;align-items:center;font-weight:600"><svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.5">${IC[ic]||''}</svg>${t}</span><span class="small">${d}</span></button>`).join('')}</div>`,[{label:'Fechar',fn:()=>{}}]);
  $('#mdlB').onclick=e=>{const b=e.target.closest('[data-demo]');if(!b)return;const it=items.find(i=>i[0]===b.dataset.demo);closeModal();setTimeout(it[4],60)}}
defCmd('DEMOS',{al:['DEMONSTRACOES'],instant:true,desc:'Escolher demonstração'},()=>dlgDemos());
defCmd('DEMOMECH',{al:['DEMOMECANICA'],instant:true,desc:'Demonstração: eixo de transmissão'},()=>runDemoX(DEMOS.mech));
defCmd('DEMOPARAM',{al:['DEMOPARAMETRICA'],instant:true,desc:'Demonstração: chapa paramétrica'},()=>runDemoX(DEMOS.param));
defCmd('DEMOELEC',{al:['DEMOELETRICA'],instant:true,desc:'Demonstração: partida estrela-triângulo'},()=>runDemoX(DEMOS.elec));
defCmd('DEMOHALL',{al:['DEMOGALPAO'],instant:true,desc:'Demonstração: galpão com pipe rack'},()=>runDemoX(DEMOS.hall));
/* ============ 3D (three.js r128) ============ */
const _3d=window._3d={r:null,ceil:false};
async function open3D(){$('#v3d').classList.add('open');const msg=$('#v3dmsg');msg.textContent='Carregando motor 3D…';
  try{await loadScript(THREEJS)}catch(e){msg.textContent='Não foi possível carregar o 3D. Verifique a conexão.';return}
  try{if(!_3d.r)init3D()}catch(e){msg.textContent='WebGL indisponível neste dispositivo.';return}
  msg.textContent='';build3D();view3D('iso');rise3D()}
function close3D(){$('#v3d').classList.remove('open');cancelAnimationFrame(_3d.raf);_3d.raf=0}
function init3D(){const c=$('#c3d');const r=new THREE.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});if(!r.getContext())throw new Error('sem webgl');
  r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.outputEncoding=THREE.sRGBEncoding;_3d.r=r;
  const sc=new THREE.Scene();_3d.scene=sc;_3d.cam=new THREE.PerspectiveCamera(42,1,0.05,3000);_3d.tgt=new THREE.Vector3();_3d.sph={r:20,th:-0.7,ph:0.95};
  sc.add(new THREE.HemisphereLight(0xffffff,0x8a8378,0.72));const d=new THREE.DirectionalLight(0xffffff,0.75);d.castShadow=true;d.shadow.mapSize.set(2048,2048);d.shadow.bias=-0.0004;sc.add(d);sc.add(d.target);_3d.sun=d;
  _3d.retheme=()=>{if(!_3d.scene)return;readColsOnce();_3d.scene.background=new THREE.Color(COL.model);req3D()};_3d.retheme();
  c.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#v3dmsg').textContent='O contexto 3D foi perdido. Feche e abra o 3D de novo.'});
  const P3=new Map();let pin=null;
  c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);P3.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button,sh:e.shiftKey});if(P3.size===2){const[a,b]=[...P3.values()];pin={d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}}});
  c.addEventListener('pointermove',e=>{const p=P3.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;
    if(P3.size>=2&&pin){p.x=e.clientX;p.y=e.clientY;const[a,b]=[...P3.values()];const d=Math.hypot(a.x-b.x,a.y-b.y),cc={x:(a.x+b.x)/2,y:(a.y+b.y)/2};_3d.sph.r=Math.max(1,Math.min(400,_3d.sph.r*pin.d/d));pan3D(cc.x-pin.c.x,cc.y-pin.c.y);pin={d,c:cc};req3D();return}
    p.x=e.clientX;p.y=e.clientY;if(p.b===2||p.b===1||p.sh)pan3D(dx,dy);else{_3d.sph.th-=dx*0.008;_3d.sph.ph=Math.max(0.03,Math.min(1.53,_3d.sph.ph-dy*0.008))}req3D()});
  const up=e=>{P3.delete(e.pointerId);if(P3.size<2)pin=null};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);c.addEventListener('contextmenu',e=>e.preventDefault());
  c.addEventListener('wheel',e=>{e.preventDefault();_3d.sph.r=Math.max(1,Math.min(400,_3d.sph.r*Math.pow(1.0012,e.deltaY)));req3D()},{passive:false});
  new ResizeObserver(()=>size3D()).observe(c);
  $('#v3d header').addEventListener('click',e=>{const v=e.target.closest('[data-v]');if(!v)return;const k=v.dataset.v;if(k==='close')close3D();else if(k==='rise')rise3D();else if(k==='png'){_3d.r.render(_3d.scene,_3d.cam);_3d.r.domElement.toBlob(b=>download((doc.name||'modelo')+'_3d.png',b,'image/png'))}
    else if(k==='ceil'){_3d.ceil=!_3d.ceil;$('#ceilBtn').textContent='Laje: '+(_3d.ceil?'sim':'não');if(_3d.slab)_3d.slab.visible=_3d.ceil;req3D()}else view3D(k)})}
function pan3D(dx,dy){const cam=_3d.cam,s=_3d.sph.r*0.0016;const right=new THREE.Vector3().setFromMatrixColumn(cam.matrix,0),upv=new THREE.Vector3().setFromMatrixColumn(cam.matrix,1);_3d.tgt.addScaledVector(right,-dx*s).addScaledVector(upv,dy*s)}
function size3D(){const c=$('#c3d');const w=c.clientWidth,h=c.clientHeight;if(!w||!h||!_3d.r)return;_3d.r.setSize(w,h,false);_3d.cam.aspect=w/h;_3d.cam.updateProjectionMatrix();req3D()}
function req3D(){if(_3d.raf)return;_3d.raf=requestAnimationFrame(t=>{_3d.raf=0;frame3D(t)})}
function frame3D(t){const S=_3d.sph,cam=_3d.cam;cam.position.set(_3d.tgt.x+S.r*Math.sin(S.ph)*Math.sin(S.th),_3d.tgt.y+S.r*Math.cos(S.ph),_3d.tgt.z+S.r*Math.sin(S.ph)*Math.cos(S.th));cam.lookAt(_3d.tgt);
  if(_3d.anim){const k=Math.min(1,(t-_3d.anim.t0)/1500),ease=x=>1-Math.pow(1-Math.max(0,Math.min(1,x)),3);_3d.gW.scale.y=Math.max(0.001,ease(k*1.25));_3d.gF.scale.y=Math.max(0.001,ease(k*1.6-0.6));if(k>=1)_3d.anim=null;else req3D()}
  _3d.r.render(_3d.scene,cam)}
function rise3D(){if(!_3d.gW)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){_3d.gW.scale.y=1;_3d.gF.scale.y=1;req3D();return}_3d.anim={t0:performance.now()};_3d.gW.scale.y=0.001;_3d.gF.scale.y=0.001;req3D()}
function view3D(k){const b=_3d.bb||{cx:0,cz:0,sz:10};_3d.tgt.set(b.cx,0.9,b.cz);const r=b.sz*1.35+2;
  if(k==='iso')Object.assign(_3d.sph,{r,th:-0.65,ph:0.92});if(k==='top')Object.assign(_3d.sph,{r:r*1.05,th:0,ph:0.03});if(k==='front')Object.assign(_3d.sph,{r,th:0,ph:1.38});req3D()}
function lighten(hex,t){const c=new THREE.Color(hex);return c.lerp(new THREE.Color(0xffffff),t)}
function build3D(){const sc=_3d.scene;for(const g of[_3d.gW,_3d.gF,_3d.gL,_3d.gB])if(g){sc.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  const gW=new THREE.Group(),gF=new THREE.Group(),gL=new THREE.Group(),gB=new THREE.Group();_3d.gW=gW;_3d.gF=gF;_3d.gL=gL;_3d.gB=gB;sc.add(gW,gF,gL,gB);
  const M=m=>m/1000,mats={};const mat=(hex,o={})=>{const k=hex+JSON.stringify(o);if(!mats[k])mats[k]=new THREE.MeshStandardMaterial(Object.assign({color:hex,roughness:.88,metalness:0},o));return mats[k]};
  const wallM=mat('#ebe7e0'),insM=mat('#c7d0d6'),glassM=new THREE.MeshStandardMaterial({color:0x9fcbe6,transparent:true,opacity:.38,roughness:.1,metalness:.1}),frameM=mat('#5d6266');
  const box=(L,H,T,c,y0,a,m,g)=>{if(L<=0.5||H<=0.5||T<=0.1)return;const ms=new THREE.Mesh(new THREE.BoxGeometry(M(L),M(H),M(T)),m);ms.position.set(M(c.x),M(y0+H/2),-M(c.y));ms.rotation.y=a;ms.castShadow=ms.receiveShadow=true;g.add(ms)};
  const ents=doc.ents.filter(e=>visible(e)&&!/^(P|E)-/.test(e.layer));let n=0;
  for(const w of ents.filter(e=>e.type==='wall')){const{L,u,n:nn,at}=wallFrame(w),X=wallExt(w),h=w.h||doc.wall.h,t=w.t,I=w.ins||0,a=Math.atan2(u.y,u.x),ops=wallOpen(w);
    const solid=(x0,x1,off,th,m)=>{for(const[s0,s1]of solidRanges(L,ops,x0,x1))box(s1-s0,h,th,at((s0+s1)/2,off),0,a,m,gW)};
    solid(-X.ea,L+X.eb,0,t,wallM);if(I>0)solid(-X.ia,L+X.ib,t/2+I/2,I,insM);
    for(const op of ops){const len=op.e-op.s,c0=at((op.s+op.e)/2,0),ci=at((op.s+op.e)/2,t/2+I/2);
      const head=Math.min(2100,h-1);box(len,h-head,t,c0,head,a,wallM,gW);if(I>0)box(len,h-head,I,ci,head,a,insM,gW);
      if(/window/.test(op.kind)){const sill=Math.min(900,head-200);box(len,sill,t,c0,0,a,wallM,gW);if(I>0)box(len,sill,I,ci,0,a,insM,gW);box(len,head-sill,25,c0,sill,a,glassM,gW);box(len,40,t,c0,sill-40,a,frameM,gW)}}n++}
  const extrude=(e,M2)=>{const th=e.th,el=e.el||0;if(!th)return;const col=e.c3?new THREE.Color(e.c3):lighten(colOf(e.color,e.layer)===COL['model-fg']?'#9aa3aa':colOf(e.color,e.layer),.45);const m=mat('#'+col.getHexString());
    if(e.type==='circle'){const ms=new THREE.Mesh(new THREE.CylinderGeometry(M(e.r),M(e.r),M(th),32),m);ms.position.set(M(e.c.x),M(el+th/2),-M(e.c.y));ms.castShadow=ms.receiveShadow=true;gF.add(ms);return}
    if(e.type==='line'){box(dist(e.a,e.b),th,35,mid(e.a,e.b),el,ang(e.a,e.b),e.c3?m:mat('#b98b5a'),gF);return}
    let pts=null;if(e.type==='pline'&&e.closed)pts=e.pts;if(e.type==='ellipse')pts=ellPts(e,48).slice(0,-1);if(e.type==='spline'&&e.closed)pts=splinePts(e.pts,true,8);
    if(e.type==='pline'&&!e.closed){for(const s of plSegs(e.pts,false))box(dist(s.a,s.b),th,30,mid(s.a,s.b),el,ang(s.a,s.b),m,gF);return}
    if(!pts||pts.length<3)return;const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(M(p.x),M(p.y))));const g=new THREE.ExtrudeGeometry(sh,{depth:M(th),bevelEnabled:false});const ms=new THREE.Mesh(g,m);ms.rotation.x=-Math.PI/2;ms.position.y=M(el);ms.castShadow=ms.receiveShadow=true;gF.add(ms)};
  const segs=[],cols=[];const pushL=(a,b,c)=>{segs.push(M(a.x),0.004,-M(a.y),M(b.x),0.004,-M(b.y));const k=new THREE.Color(c===COL['model-fg']?'#3b4247':c);cols.push(k.r,k.g,k.b,k.r,k.g,k.b)};
  const flat=(e)=>{const c=colOf(e.color,e.layer);for(const q of primsC(e)){if(q.t==='s')pushL(q.a,q.b,c);else{const pp=q.t==='c'?arcPts(q.c,q.r,0,TAU,10):arcPts(q.c,q.r,q.a0,q.a1,10);for(let i=0;i<pp.length-1;i++)pushL(pp[i],pp[i+1],c)}}};
  for(const e of ents){if(e.type==='wall'||e.type==='dim'||e.type==='text'||e.type==='hatch'||e.type==='leader'||e.type==='xline'||e.type==='attdef'||e.type==='fcf'||e.type==='datum'||e.type==='image')continue;
    if(e.type==='insert'){for(const c of childEnts(e)){if(c.th)extrude(c);else if(c.type!=='text')flat(c)}continue}
    if(EXT[e.type]&&EXT[e.type].three){EXT[e.type].three(e,{gF,mat});continue}
    if(e.th)extrude(e);else flat(e)}
  if(segs.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(segs,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));gL.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.75})))}
  const bw=extents(ents.filter(e=>e.type==='wall'||e.th||e.type==='pipe').length?ents.filter(e=>e.type==='wall'||e.th||e.type==='pipe'||(e.type==='insert'&&childEnts(e).some(c=>c.th))):ents);const ok=isFinite(bw.x0);
  const b=ok?bw:{x0:-5000,y0:-5000,x1:5000,y1:5000};const cx=M((b.x0+b.x1)/2),cz=-M((b.y0+b.y1)/2),sx=M(b.x1-b.x0),sz=M(b.y1-b.y0);_3d.bb={cx,cz,sz:Math.max(sx,sz,3)};
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(sx+6,sz+6),mat(COL.dark?'#3a3f43':'#dcd8d0'));fl.rotation.x=-Math.PI/2;fl.position.set(cx,-0.002,cz);fl.receiveShadow=true;gB.add(fl);
  const hmax=Math.max(ents.some(e=>e.type==='wall')?0:0,...ents.filter(e=>e.type==='wall').map(w=>w.h||0));
  const slab=new THREE.Mesh(new THREE.BoxGeometry(sx+0.2,0.15,sz+0.2),mat('#d9d5ce'));slab.position.set(cx,M(hmax)+0.075,cz);slab.castShadow=true;slab.visible=_3d.ceil;gB.add(slab);_3d.slab=slab;
  const S=_3d.sun,R=Math.max(sx,sz)*0.8+4;S.position.set(cx+R*0.6,R*1.2,cz+R*0.9);S.target.position.set(cx,0,cz);Object.assign(S.shadow.camera,{left:-R,right:R,top:R,bottom:-R,near:0.5,far:R*4});S.shadow.camera.updateProjectionMatrix();
  size3D();if(!n&&!ents.some(e=>e.th||e.type==='pipe'))toast('Sem paredes ou espessura 3D: use PAREDE (W) ou defina “Espessura 3D” nas propriedades.',4200)}

/* ============ demonstração: apartamento 92 m² ============ */
const STEPS=['Grade de eixos 4,2 · 3,6 · 4,2 m','Pilares 400 × 400 mm','Paredes externas 300 + 150 isolamento','Divisórias 100 mm','Portas e janelas','Mobiliário em escala real','Cotas','Ambientes e áreas','Construir em 3D'];
function setPhase(v){const P_=$('#stepsP');if(v==null){P_.classList.remove('open');return}P_.classList.add('open');const i=+v;$('#stepsList').innerHTML=STEPS.map((s,j)=>`<li class="${j<i?'done':j===i?'now':''}">${s}</li>`).join('')}
function demoScript(){const L=[],A=(...a)=>L.push(...a);const X=[0,4200,7800,12000],Y=[0,3800,7700];
  A('#PHASE:0','CLAYER','S-GRID');X.forEach(x=>A('LINE',`${x},-1200`,`${x},9200`,''));Y.forEach(y=>A('LINE',`-1200,${y}`,`13200,${y}`,''));
  X.forEach((x,i)=>A('CIRCLE',`${x},9650`,'450','TEXT','J','MC',`${x},9650`,'320','0',String(i+1)));Y.forEach((y,i)=>A('CIRCLE',`13650,${y}`,'450','TEXT','J','MC',`13650,${y}`,'320','0','ABC'[i]));
  A('#WAIT:450','#PHASE:1','CLAYER','S-COLS','THICKNESS','2800','RECTANG','-200,-200','200,200','THICKNESS','0','HATCH','P','SOLID','S','200,0','','');
  A('COPY','W','-260,-260','260,260','','0,0');X.forEach(x=>Y.forEach(y=>{if(x||y)A(`${x},${y}`)}));A('');
  A('#WAIT:450','#PHASE:2','CLAYER','A-WALL','WALL','E','300','I','150','A','2800','0,0','0,7700','12000,7700','12000,0','F');
  A('#WAIT:450','#PHASE:3','WALL','E','100','I','0','4200,0','4200,7700','','WALL','0,3800','4200,3800','','WALL','4200,5400','7800,5400','','WALL','4200,2000','7800,2000','','WALL','7800,5400','7800,7700','','WALL','7800,0','7800,2000','');
  const ins=(n,p,sx,sy,r)=>A('INSERT',n,p,String(sx),sy==null?'':String(sy),String(r));
  A('#WAIT:450','#PHASE:4','CLAYER','A-DOOR');ins('DOOR','12000,1300',0.9,null,90);ins('DOOR','4200,4700',0.8,null,90);ins('DOOR','4200,2900',0.8,null,90);ins('DOOR','5000,5400',0.7,null,0);ins('DOOR','5000,2000',0.7,null,180);
  A('CLAYER','A-GLAZ');ins('WINDOW','2100,7700',1.5,1,0);ins('WINDOW','2100,0',1.5,1,0);ins('WINDOW','9900,0',2.4,1,0);ins('WINDOW','9600,7700',1.2,1,0);ins('WINDOW','6000,7700',0.6,1,0);ins('WINDOW','12000,5000',1.8,1,90);
  A('#WAIT:450','#PHASE:5','CLAYER','A-FURN');[['BED-D','2100,6300',0],['WARDROBE','1300,4150',0],['BED-S','750,2650',0],['DESK','2600,500',180],['WC','4700,7150',0],['SINK','5600,7300',0],['SHOWER','7250,6000',0],['WASHER','7350,550',0],['TANK','6500,450',0],['SOFA','9900,700',0],['TV','9900,2900',0],['TABLE4','9900,4700',0],['KITCHEN','9600,7250',0],['FRIDGE','11450,7200',0]].forEach(([n,p,r])=>ins(n,p,1,null,r));
  A('#WAIT:450','#PHASE:6','CLAYER','A-DIMS','DIMLINEAR','0,0','4200,0','2100,-2000','DIMCONTINUE','7800,0','12000,0','','DIMLINEAR','0,0','12000,0','6000,-2900','DIMLINEAR','0,0','0,3800','-2000,1900','DIMCONTINUE','0,7700','','DIMLINEAR','0,0','0,7700','-2900,3850');
  A('#WAIT:450','#PHASE:7','CLAYER','A-AREA','-LAYER','T','A-AREA','HIDDEN','','LINE','7800,2000','7800,5400','','TEXTSIZE','250');[['QUARTO 1','2100,4900'],['QUARTO 2','2700,2200'],['BANHO','6000,6650'],['LAVANDERIA','6000,1150'],['CIRCULAÇÃO','6000,3700'],['ESTAR E COZINHA','9900,1900']].forEach(([n,p])=>A('ROOMTAG',n,p));
  A('CLAYER','A-ANNO','TEXT','J','MC','6000,-4100','320','0','APARTAMENTO 2B · ÁREA BRUTA 92,4 m² · PLANTA 1:50');ins('NORTH','14200,-2800',1,null,0);
  A('CLAYER','0','#ZOOM','#WAIT:600','#PHASE:8');return L}
function runDemo(ok){if(!ok&&doc.ents.length){askConfirm('A demonstração começa um desenho novo. Salve antes se quiser guardar o atual.',()=>runDemo(true),'Começar demonstração');return}
  stopScript();cancelCmd(true);undoS=[];redoS=[];doc=newDoc('Apartamento 2B');$('#fname').textContent=doc.name;SEL.clear();dirty();refreshPanels();renderBlocks();
  zoomBox({x0:-3600,y0:-4700,x1:15000,y1:10300},0.03);log('Demonstração: apartamento de 92 m² na ordem de um desenhista');setPhase(0);
  runScript(demoScript(),innerWidth<700?16:22,()=>{autosave();toast('Planta pronta. Erguendo as paredes a 2,8 m…');setTimeout(()=>{setPhase(null);open3D()},700)})}

/* ============ inicialização ============ */
function cadInit(){
  try{const t=LS.get('gpd:theme');if(t)document.documentElement.dataset.theme=t}catch(_){}
  try{const s=JSON.parse(LS.get('gpd:settings')||'null');if(s){Object.assign(ST,s);ST.os=Object.assign({end:true,mid:true,cen:true,qua:true,int:true,per:true,nea:false,nod:true,ins:true,tan:false},s.os||{})}}catch(_){}
  let restored=false;try{const a=LS.get('gpd:auto');if(a){const d=JSON.parse(a);doc=Object.assign(newDoc(),d);doc.blocks=Object.assign(builtinBlocks(),d.blocks||{});const bi=builtinBlocks();for(const k in bi)doc.blocks[k]=bi[k];restored=true}}catch(_){}
  if(!doc)doc=newDoc();$('#fname').textContent=doc.name;
  renderRibbon();syncStatus();renderLayerSel();readCols();resize();
  if(restored&&doc.ents.length)zoomExt();else zoomBox({x0:-2000,y0:-2000,x1:14000,y1:10000});
  log('GPlanSiS|Drawings pronto. Unidade: mm. Digite um comando (L, PL, C, W, TR…) ou AJUDA.');
  if(!restored||!doc.ents.length){log('Dica: toque em Demonstração para ver um apartamento de 92 m² ser desenhado e erguido em 3D.');setTimeout(()=>toast('Toque em Demonstração para ver o apartamento de 92 m² ser desenhado'),700)}
  else log(`Desenho “${doc.name}” restaurado (${doc.ents.length} objetos).`);
  requestDraw()}

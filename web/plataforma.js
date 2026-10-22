/* GPlanSiS|Drawings — camada de plataforma sobre o CAD (cad.js).
   Acesso por login, desenhos guardados no servidor (versões, lixeira, compartilhamento),
   permissões por usuário e modo Configurações com avatar.
   O CAD continua o mesmo; aqui só se trocam os pontos de arquivo e se acrescenta a conta.
   Vínculo com o servidor: o objeto `doc` aberto do servidor fica em S.docRef. NOVO,
   demonstrações e importação substituem `doc`, então nunca gravam por cima de um desenho salvo. */
'use strict';
{ // escopo próprio: nada daqui colide com os nomes globais do CAD

const S={me:null,cur:{id:null,versao:0,nivel:'DONO'},docRef:null,sujo:false,salvando:false,carregando:false,iniciado:false,
  aba:'meus',lista:[],q:'',cfgAba:'perfil',dir:null,auto:null};

/* ---------------- utilidades ---------------- */
async function api(method,path,body){
  const h={'x-drawings':'1'};if(body!==undefined)h['content-type']='application/json';
  let r;try{r=await fetch(path,{method,headers:h,body:body!==undefined?JSON.stringify(body):undefined,credentials:'same-origin'})}
  catch(_){const e=new Error('Sem conexão com o servidor');e.status=0;throw e}
  let j=null;try{j=await r.json()}catch(_){}
  if(!r.ok){const d=j&&j.detail;const e=new Error(typeof d==='string'?d:Array.isArray(d)?d.map(x=>x.msg).join('; '):`Erro ${r.status}`);e.status=r.status;e.body=j;
    if(r.status===401&&!/^\/api\/auth\/(login|me)$/.test(path))sessaoExpirada();throw e}
  return j}
const can=p=>!!(S.me&&S.me.permissoesEfetivas.includes(p));
const isAdmin=()=>!!(S.me&&S.me.papel==='ADMIN');
const iniciais=n=>String(n||'?').replace(/@.*/,'').split(/[\s._-]+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('')||'?';
function av(u,cls=''){return `<span class="pl-av ${cls}" aria-hidden="true">${u&&u.temAvatar?`<img alt="" src="/api/avatar/${u.id}?v=${u.avatarVer}">`:esc(iniciais(u&&(u.nome||u.login)))}</span>`}
function quando(iso){if(!iso)return '—';const d=new Date(iso),s=(Date.now()-d)/1000;
  if(s<60)return 'agora';if(s<3600)return `há ${Math.floor(s/60)} min`;if(s<86400)return `há ${Math.floor(s/3600)} h`;if(s<7*86400)return `há ${Math.floor(s/86400)} d`;
  return d.toLocaleDateString('pt-BR')}
const dataHora=iso=>iso?new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const tamanho=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(0)+' KB':(b/1048576).toFixed(1).replace('.',',')+' MB';
const papelNome=p=>(S.me&&S.me.papelRotulo&&S.me.papelRotulo[p])||p;
const NIVEL={DONO:'dono',EDITAR:'edição',LER:'leitura'};
function navegador(ua){ua=ua||'';const b=/Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'Navegador';
  const o=/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Mac OS X/.test(ua)?'macOS':/Windows/.test(ua)?'Windows':/Linux/.test(ua)?'Linux':'';return o?`${b} · ${o}`:b}
const IC={
  folder:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14a6.5 6.5 0 013.5 6"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  out:'<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  sun:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 000 16z" fill="currentColor"/>',
  draw:'<path d="M3 21l3.5-1 11-11-2.5-2.5-11 11zM14 5l2.5 2.5"/>',
  spark:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>'};
const ico=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
function dlg(title,html,btns){modal(esc(title),html,btns);$('#mdlB').onclick=null}

if(!doc)doc=newDoc();  // antes do login a tela pode redimensionar; cadInit troca pelo desenho restaurado

/* ---------------- armazenamento local por usuário ---------------- */
{const g=LS.get,s=LS.set,NS=['gpd:auto','gpd:settings','gpd:files','gpd:cur'];const k=x=>NS.includes(x)&&S.me?`${x}:${S.me.id}`:x;LS.get=x=>g(k(x));LS.set=(x,v)=>s(k(x),v)}
const gravaLocal=()=>{if(S.me&&doc)LS.set('gpd:auto',JSON.stringify(doc))};
const guardaCur=()=>LS.set('gpd:cur',JSON.stringify({...S.cur,sujo:S.sujo,ligado:!!S.cur.id&&doc===S.docRef}));

/* ---------------- preferências ---------------- */
let _pt=0;
// respostas do servidor trazem as preferências do banco; as locais podem estar a caminho (envio adiado)
const setMe=me=>{S.me=Object.assign(me,{prefs:S.me?S.me.prefs:me.prefs});return S.me};
function salvaPrefs(p){S.me.prefs=Object.assign({},S.me.prefs,p);clearTimeout(_pt);_pt=setTimeout(()=>api('PATCH','/api/perfil',{prefs:S.me.prefs}).catch(()=>{}),600)}
function aplicaTema(t){const r=document.documentElement;
  if(t==='claro'||t==='escuro'){r.dataset.theme=t==='claro'?'light':'dark';try{localStorage.setItem('gpd:theme',r.dataset.theme)}catch(_){}}
  else{delete r.dataset.theme;try{localStorage.removeItem('gpd:theme')}catch(_){}}
  if(S.iniciado){_themeV++;renderBlocks();requestDraw();if(window._3d)_3d.retheme()}}

/* ---------------- portão de acesso ---------------- */
function gate(modo,msg){const g=$('#plGate');g.hidden=false;$('#plGateLoad').hidden=modo!=='load';$('#plLogin').hidden=modo!=='login';$('#plTroca').hidden=modo!=='troca';
  if(modo==='login'){$('#plLgErr').textContent=msg||'';setTimeout(()=>($('#plLgUser').value?$('#plLgPass'):$('#plLgUser')).focus(),50)}
  if(modo==='troca'){$('#plTrErr').textContent=msg||'';$('#plGateSub').textContent=`Olá, ${S.me.nome.split(' ')[0]}.`;setTimeout(()=>$('#plTrAtual').focus(),50)}
  if(modo==='load'&&msg){$('#plGateLoad').innerHTML=msg}}
$('#plLogin').addEventListener('submit',async e=>{e.preventDefault();const b=$('#plLgBtn');b.disabled=true;b.textContent='Entrando…';
  try{const me=await api('POST','/api/auth/login',{login:$('#plLgUser').value,senha:$('#plLgPass').value});$('#plLgPass').value='';entrou(me)}
  catch(err){$('#plLgErr').textContent=err.message}finally{b.disabled=false;b.textContent='Entrar'}});
$('#plTroca').addEventListener('submit',async e=>{e.preventDefault();const n=$('#plTrNova').value;
  if(n!==$('#plTrNova2').value){$('#plTrErr').textContent='As duas senhas novas não conferem';return}
  try{const me=await api('POST','/api/auth/senha',{atual:$('#plTrAtual').value,nova:n});$('#plTroca').reset();entrou(me);toast('Senha definida. Bem-vindo!')}
  catch(err){$('#plTrErr').textContent=err.message}});
$('#plTrSair').onclick=()=>sair(true);
function sessaoExpirada(){if(!$('#plGate').hidden)return;gate('login','Sua sessão expirou. Entre novamente — o desenho aberto continua guardado neste navegador.')}

function entrou(me){
  if(S.me&&S.me.id!==me.id&&S.iniciado){location.reload();return}
  if(S.me&&S.me.id===me.id)setMe(me);else S.me=me;
  if(me.trocarSenha){gate('troca');return}
  $('#plGate').hidden=true;$('#plGateSub').textContent='CAD 2D estilo AutoCAD com construção em 3D';
  pintaConta();aplicaPermissoes();
  if(!S.iniciado){
    aplicaTema(me.prefs.tema);
    if(me.prefs.cad&&!LS.get('gpd:settings'))LS.set('gpd:settings',JSON.stringify(me.prefs.cad));
    cadInit();S.iniciado=true;posInicio()}
  agendaAuto()}

async function boot(){gate('load');
  // entrada vinda do GPlanSiS|Docs: ?sso=<código assinado> vira sessão aqui, sem pedir senha
  const sso=new URLSearchParams(location.search).get('sso');
  if(sso){history.replaceState(null,'',location.pathname+location.hash);
    try{const me=await api('POST','/api/auth/sso',{token:sso});if(me.para&&/^#d\d+$/.test(me.para))history.replaceState(null,'',location.pathname+me.para);entrou(me);return}
    catch(e){gate('login','Entrada pelo GPlanSiS|Docs: '+e.message);return}}
  try{entrou(await api('GET','/api/auth/me'))}
  catch(e){if(e.status===401)gate('login');
    else{gate('load',`<p class="pl-err">Servidor indisponível (${esc(e.message)}).</p><button class="tb" id="plRetry">Tentar de novo</button>`);$('#plRetry').onclick=boot}}}

async function abrePorEndereco(){const m=/^#d(\d+)$/.exec(location.hash);if(!m||!S.iniciado)return;
  history.replaceState(null,'',location.pathname);const id=+m[1];if(ligado()&&S.cur.id===id)return;
  const go=()=>abrir(id).catch(()=>{});if(S.sujo&&doc.ents.length&&can('desenhar'))askConfirm(`“${doc.name}” tem alterações não salvas. Abrir o desenho vindo do Docs?`,go,'Abrir');else go()}
window.addEventListener('hashchange',abrePorEndereco);
async function posInicio(){
  let c=null;try{c=JSON.parse(LS.get('gpd:cur')||'null')}catch(_){}
  if(c&&c.id&&c.ligado){S.cur={id:c.id,versao:c.versao,nivel:c.nivel};S.docRef=doc;S.sujo=!!c.sujo}
  // aparelho novo (nada local): reabre o último desenho do servidor
  else if(!doc.ents.length&&S.me.prefs.abrirUltimo!==false&&S.me.prefs.ultimoId){await abrir(S.me.prefs.ultimoId,{quieto:true}).catch(()=>{})}
  // vinculado e sem alterações locais: confere se há versão mais nova no servidor
  if(S.cur.id&&doc===S.docRef&&!S.sujo){
    try{const r=await api('GET',`/api/desenhos/${S.cur.id}`);
      const nova=r.desenho.versao>S.cur.versao;carrega(r);
      if(nova)toast(`Atualizado para a versão ${r.desenho.versao} (salva por ${r.desenho.atualizadoPor||'outro usuário'})`)}
    catch(e){if(e.status===404||e.status===403){S.cur={id:null,versao:0,nivel:'DONO'};S.docRef=null;S.sujo=true}}}
  status();abrePorEndereco()}

/* ---------------- conta na barra superior ---------------- */
function pintaConta(){const u=S.me;$('#plTopAv').outerHTML=av(u).replace('class="pl-av ','id="plTopAv" class="pl-av ');$('#plUserBtn').title=`${u.nome} — conta e configurações`}
$('#plUserBtn').onclick=e=>{e.stopPropagation();const m=$('#plMenu');if(!m.hidden){m.hidden=true;return}const u=S.me;
  m.innerHTML=`<div class="pl-menu-who">${av(u,'md')}<div><b>${esc(u.nome)}</b><small>${esc(u.login)}</small><small>${esc(papelNome(u.papel))}${u.master?' · master':''}</small></div></div>
  <button data-m="docs">${ico('folder')}Meus desenhos</button>
  <button data-m="perfil">${ico('user')}Perfil e avatar</button>
  <button data-m="cfg">${ico('gear')}Configurações</button>
  ${can('usuarios')?`<button data-m="usuarios">${ico('users')}Usuários e permissões</button>`:''}
  <button data-m="tema">${ico('sun')}Alternar tema claro/escuro</button><hr>
  <button data-m="sair">${ico('out')}Sair</button>`;m.hidden=false};
$('#plMenu').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;$('#plMenu').hidden=true;const a=b.dataset.m;
  if(a==='docs')abreDocs();if(a==='perfil')abreCfg('perfil');if(a==='cfg')abreCfg('prefs');if(a==='usuarios')abreCfg('usuarios');if(a==='sair')sair();
  if(a==='tema'){const t=isDark()?'claro':'escuro';aplicaTema(t);salvaPrefs({tema:t})}};
document.addEventListener('pointerdown',e=>{const m=$('#plMenu');if(!m.hidden&&!m.contains(e.target)&&!e.target.closest('#plUserBtn'))m.hidden=true});
$('#viewbtns').addEventListener('click',e=>{if(e.target.closest('[data-act="theme"]'))salvaPrefs({tema:document.documentElement.dataset.theme==='dark'?'escuro':'claro'})});
async function sair(semPerguntar){const go=async()=>{try{await api('POST','/api/auth/logout',{})}catch(_){}location.reload()};
  if(!semPerguntar&&S.sujo&&doc.ents.length)askConfirm('Há alterações não salvas no servidor. Elas continuam guardadas só neste navegador. Sair mesmo assim?',go,'Sair');else go()}

/* ---------------- estado do desenho ---------------- */
const ligado=()=>!!S.cur.id&&doc===S.docRef;
function status(txt,cls){const el=$('#plStatus');if(!el)return;
  if(txt){el.textContent=txt;el.className='pl-status '+(cls||'');return}
  if(!can('desenhar')){el.textContent='somente leitura';el.className='pl-status ro';return}
  if(!ligado()){el.textContent=doc&&doc.ents.length?'não salvo no servidor':'novo';el.className='pl-status'+(doc&&doc.ents.length?' sujo':'');return}
  if(S.cur.nivel==='LER'){el.textContent=`v${S.cur.versao} · leitura`;el.className='pl-status ro';return}
  el.textContent=S.sujo?`v${S.cur.versao} · alterado`:`v${S.cur.versao} · salvo`;el.className='pl-status'+(S.sujo?' sujo':'');vigiaDocs()}
function vigiaDocs(){const id=S.me&&S.me.docs&&ligado()?S.cur.id:null;if(id!==DX.id){DX.id=id;DX.v=null;DX.assin='';if(typeof pintaChip==='function')pintaChip();if(id)syncDocs(true)}}
autosave=(o=>function(){o();if(S.carregando)return;S.sujo=true;guardaCur();status()})(autosave);
saveSettings=(o=>function(){o();if(S.me)salvaPrefs({cad:ST})})(saveSettings);
// abrir/importar arquivo fora do servidor desvincula o desenho
loadDoc=(o=>function(d){o(d);if(!S.carregando){S.docRef=null;S.sujo=true;guardaCur();status()}})(loadDoc);
window.addEventListener('pagehide',()=>{if(S.iniciado){gravaLocal();guardaCur()}});
window.addEventListener('beforeunload',e=>{if(S.me&&S.sujo&&doc&&doc.ents.length&&can('desenhar')){e.preventDefault();e.returnValue=''}});

function miniatura(){try{const cv=$('#cv');if(!cv.width)return null;const W=320,H=200,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  g.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--model')||'#fff';g.fillRect(0,0,W,H);
  const s=Math.max(W/cv.width,H/cv.height),w=cv.width*s,h=cv.height*s;g.drawImage(cv,(W-w)/2,(H-h)/2,w,h);
  let u=c.toDataURL('image/webp',.72);if(!u.startsWith('data:image/webp'))u=c.toDataURL('image/jpeg',.75);return u.length<190000?u:null}catch(_){return null}}

function carrega(r){S.carregando=true;try{loadDoc(r.doc);doc.name=r.desenho.nome;$('#fname').textContent=doc.name}finally{S.carregando=false}
  S.docRef=doc;S.cur={id:r.desenho.id,versao:r.desenho.versao,nivel:r.desenho.nivel};S.sujo=false;guardaCur();status()}
async function abrir(id,o={}){status('abrindo…');
  try{const r=await api('GET',`/api/desenhos/${id}`);carrega(r);salvaPrefs({ultimoId:id});
    // importado em lote não tem miniatura: gera agora, com a vista já desenhada
    if(!r.desenho.miniatura&&r.desenho.nivel!=='LER'&&can('desenhar'))setTimeout(()=>{const m=miniatura();if(m)api('PATCH',`/api/desenhos/${id}`,{miniatura:m}).catch(()=>{})},700);
    if(!o.quieto)toast(`Aberto: ${r.desenho.nome}${r.desenho.nivel==='LER'?' (somente leitura)':''}`);log(`Desenho “${r.desenho.nome}” aberto do servidor (v${r.desenho.versao}).`)}
  catch(e){status();if(!o.quieto)toast('Não foi possível abrir: '+e.message);throw e}}

saveFile=async function(o={}){
  if(!S.me)return;
  if(!can('desenhar')){toast('Seu perfil não permite salvar desenhos no servidor');return}
  if(S.salvando)return;
  if(ligado()&&S.cur.nivel==='LER'){askConfirm('Você só tem acesso de leitura a este desenho. Salvar uma cópia sua?',()=>{S.docRef=null;doc.name=doc.name+' (cópia)';$('#fname').textContent=doc.name;saveFile()},'Salvar cópia');return}
  S.salvando=true;status('salvando…');
  try{const mini=miniatura();let r;
    if(ligado())r=await api('PUT',`/api/desenhos/${S.cur.id}`,{versaoBase:S.cur.versao,nome:doc.name,doc,miniatura:mini,forcar:!!o.forcar});
    else{r=await api('POST','/api/desenhos',{nome:doc.name,doc,miniatura:mini});S.docRef=doc}
    S.cur={id:r.desenho.id,versao:r.desenho.versao,nivel:r.desenho.nivel};S.sujo=false;gravaLocal();guardaCur();salvaPrefs({ultimoId:S.cur.id});$('#fname').textContent=doc.name;
    if(!o.auto){toast(`“${doc.name}” salvo no servidor · versão ${S.cur.versao}`);log('Salvo no servidor: '+doc.name+' (v'+S.cur.versao+')')}
    if(!$('#plDocs').hidden)carregaDocs()}
  catch(e){
    if(e.status===409&&e.body){const b=e.body;S.salvando=false;status();
      dlg('Conflito de versão',`<p style="margin-top:0">${esc(b.atualizadoPor||'Outro usuário')} salvou a versão ${b.versao} deste desenho ${quando(b.atualizadoEm)}, depois que você o abriu (v${S.cur.versao}).</p>
      <p class="small">Salvar como cópia guarda o seu trabalho sem tocar no dele. Sobrescrever cria a versão ${b.versao+1} com o seu desenho; a dele continua no histórico de versões.</p>`,
      [{label:'Cancelar',fn:()=>{}},{label:'Sobrescrever',fn:()=>{setTimeout(()=>saveFile({forcar:true}),40)}},{label:'Salvar como cópia',primary:true,fn:()=>{S.docRef=null;doc.name=doc.name+' (minha versão)';$('#fname').textContent=doc.name;setTimeout(saveFile,40)}}]);return}
    toast('Não foi possível salvar: '+e.message,4000)}
  finally{S.salvando=false;status()}};
dlgOpen=()=>abreDocs();
function agendaAuto(){clearInterval(S.auto);const m=+(S.me.prefs.autoMin||0);if(!m)return;
  S.auto=setInterval(()=>{if(S.sujo&&ligado()&&S.cur.nivel!=='LER'&&can('desenhar')&&!S.salvando&&!CMD.gen)saveFile({auto:true})},m*60000)}

$('#fname').onclick=()=>askText('Renomear desenho',doc.name,async n=>{n=(n||'').trim();if(!n)return;doc.name=n;$('#fname').textContent=n;
  if(ligado()&&S.cur.nivel!=='LER'&&can('desenhar')){try{await api('PATCH',`/api/desenhos/${S.cur.id}`,{nome:n});toast('Renomeado')}catch(e){toast('Não foi possível renomear: '+e.message)}}
  else{autosave()}});

/* ---------------- comandos e permissões ---------------- */
defCmd('SAVEAS',{al:['SALVARCOMO'],instant:true,desc:'Salvar como novo desenho no servidor'},()=>{if(!can('desenhar')){toast('Seu perfil não permite salvar desenhos');return}
  askText('Salvar como novo desenho',doc.name,n=>{if(n&&n.trim()){S.docRef=null;doc.name=n.trim();$('#fname').textContent=doc.name;saveFile()}})});
defCmd('SAVE',{al:['QSAVE','SALVAR','CTRLS'],instant:true,desc:'Salvar no servidor'},()=>saveFile());
defCmd('OPEN',{al:['ABRIR','DESENHOS'],instant:true,desc:'Abrir desenho do servidor'},()=>abreDocs());
defCmd('VERSOES',{al:['VERSIONS','HISTORICO'],instant:true,desc:'Versões do desenho atual'},()=>{if(!ligado()){toast('Salve o desenho no servidor primeiro');return}dlgVersoes(S.cur.id,doc.name)});
defCmd('COMPARTILHAR',{al:['SHARE','PARTILHAR'],instant:true,desc:'Compartilhar o desenho atual'},()=>{if(!ligado()){toast('Salve o desenho no servidor primeiro');return}dlgCompartilhar(S.cur.id,doc.name)});
defCmd('CONFIG',{al:['CONTA','PERFIL','CONFIGURACOES','OPTIONS','OP'],instant:true,desc:'Configurações da conta, avatar e usuários'},()=>abreCfg('perfil'));
defCmd('SAIR',{al:['LOGOUT','QUIT'],instant:true,desc:'Encerrar a sessão'},()=>sair());
const GATE={EXPORT:'exportar',IMPORT:'importar',PLOT:'plotar',IA:'ia'};
CMDS.IA.fn=(o=>function(){if(S.me&&!S.me.ia){dlg('Assistente IA',`<p style="margin-top:0">O Assistente IA ainda não está ligado neste servidor.</p>${can('usuarios')?'<p class="small">Como administrador, você pode colar a chave da Anthropic em Configurações › Assistente IA.</p>':'<p class="small">Peça a um administrador para configurá-lo.</p>'}`,[{label:'Fechar',fn:()=>{}},...(can('usuarios')?[{label:'Configurar agora',primary:true,fn:()=>abreCfg('ia')}]:[])]);return}return o.apply(this,arguments)})(CMDS.IA.fn);
for(const[c,p]of Object.entries(GATE)){const o=CMDS[c].fn;CMDS[c].fn=function(){if(!can(p)){toast(`Seu perfil não tem a permissão: ${S.me.perms[p]}`);return}return o.apply(this,arguments)}}
function aplicaPermissoes(){
  $('#plDocsLink').hidden=!(S.me&&S.me.docs);agendaDocs();
  for(const[c,p]of Object.entries(GATE))$$(`#topbtns [data-cmd="${c}"]`).forEach(b=>b.hidden=!can(p));
  status()}
window.claude={use:async n=>n==='sample'&&S.me&&S.me.ia&&can('ia')?{json:async m=>api('POST','/api/ia/json',{prompt:m.map(x=>typeof x.content==='string'?x.content:'').join('\n\n')})}:null};

$('#menuBtn').onclick=()=>{const it=[['NEW','Novo desenho'],['OPEN','Abrir desenho do servidor'],can('desenhar')&&['SAVE','Salvar no servidor (Ctrl+S)'],can('desenhar')&&['SAVEAS','Salvar como novo…'],
  ['VERSOES','Versões deste desenho'],S.me.docs&&can('desenhar')&&['ENVIARDOCS','Enviar ao GPlanSiS|Docs (PDF + DXF + nativo)'],can('compartilhar')&&['COMPARTILHAR','Compartilhar este desenho'],can('importar')&&['IMPORT','Importar DXF ou JSON'],can('exportar')&&['EXPORT','Exportar DXF, SVG, PNG, JSON ou IFC'],
  can('plotar')&&['PLOT','Plotar folha em escala'],['DEMOS','Demonstrações (6 projetos completos)'],['SCRIPT','Executar script'],['DSETTINGS','Configurações de desenho'],['CONFIG','Conta, avatar e usuários'],['HELP','Lista de comandos']].filter(Boolean);
  modal('Arquivo',`<div class="flist">${it.map(([c,n])=>`<div><span>${n}</span><button class="tb" data-mc="${c}">${c}</button></div>`).join('')}</div>`,[{label:'Fechar',fn:()=>{}}]);$('#mdlB').onclick=null};
$('#plDocsBtn').onclick=()=>abreDocs();
document.addEventListener('click',e=>{const b=e.target.closest('[data-pl-close]');if(b){$('#'+b.dataset.plClose).hidden=true;if(b.dataset.plClose==='plCfg')pintaConta()}});
// com o portão ou um painel aberto, o teclado não chega à linha de comando do CAD
window.addEventListener('keydown',e=>{if(e.key==='Escape'||$('#mdl').classList.contains('open'))return;
  if(!$('#plGate').hidden||!$('#plCfg').hidden||!$('#plDocs').hidden)e.stopPropagation()},true);
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('#mdl').classList.contains('open'))return;
  for(const id of['plMenu','plCfg','plDocs'])if(!$('#'+id).hidden){$('#'+id).hidden=true;e.stopImmediatePropagation();return}},true);

/* ---------------- arquivos CAD: importar, arrastar e soltar, lote ---------------- */
function abreImportado(d,nome){const go=()=>{const x=Object.assign({},d);x.name=x.name||nome;loadDoc(x);doc.name=x.name;$('#fname').textContent=doc.name;zoomExt();toast(`${doc.name}: ${doc.ents.length} objeto(s) — salve (Ctrl+S) para guardar no servidor`,4000)};
  if(S.sujo&&doc.ents.length&&can('desenhar'))askConfirm(`“${doc.name}” tem alterações não salvas no servidor. Abrir o arquivo importado no lugar dele?`,go,'Abrir importado');else go()}
function importaUm(f){if(!can('importar')){toast('Seu perfil não tem a permissão: '+S.me.perms.importar);return}
  cadImport.dialogo(f,{podeInserir:true,aoAbrir:abreImportado})}
$('#fileIn').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)importaUm(f)};
async function importaLote(fs){if(!can('importar')||!can('desenhar')){toast('Importar para a biblioteca exige as permissões Importar e Criar desenhos');return}
  fs=fs.filter(f=>/\.(dwg|dxf|json|gpd)$/i.test(f.name));if(!fs.length){toast('Nenhum arquivo DWG, DXF ou JSON');return}
  const ok=[],falhas=[],UN={1:'polegada',2:'pé',5:'cm',6:'m',14:'dm'};
  for(const[n,f]of fs.entries()){toast(`Importando ${n+1}/${fs.length}: ${f.name}…`,60000);
    try{const r=await cadImport.paraDoc(f);const nome=(r.doc.name&&r.doc.name!=='Sem título'?r.doc.name:f.name.replace(/\.[^.]+$/,'')).slice(0,160);
      await api('POST','/api/desenhos',{nome,doc:r.doc,miniatura:null});ok.push(`${nome} — ${r.doc.ents.length} objeto(s)${r.info&&UN[r.info.unidade]?` · convertido de ${UN[r.info.unidade]} para mm`:''}`)}
    catch(e){falhas.push(`${f.name}: ${e.message}`)}}
  toast(`${ok.length} de ${fs.length} importado(s)`);S.aba='meus';if(!$('#plDocs').hidden){pintaAbas();carregaDocs()}
  dlg('Importação concluída',`${ok.length?`<div class="ph">Na biblioteca (${ok.length})</div><div class="small" style="line-height:1.7">${ok.map(esc).join('<br>')}</div>`:''}
    ${falhas.length?`<div class="ph" style="color:var(--danger)">Com problema (${falhas.length})</div><div class="small" style="line-height:1.7">${falhas.map(esc).join('<br>')}</div>`:''}
    <p class="small">Arquivos sem unidade declarada entram em milímetros. Para escolher a unidade, importe um por vez pelo menu Arquivo › Importar.</p>`,[{label:'Fechar',fn:()=>{}}])}
$('#plDocsImp').onclick=()=>$('#plImpIn').click();
$('#plImpIn').onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)importaLote(fs)};
{let n=0;const temArq=e=>e.dataTransfer&&[...e.dataTransfer.types].includes('Files');
  window.addEventListener('dragenter',e=>{if(!temArq(e)||!S.iniciado||!$('#plGate').hidden)return;n++;$('#plDrop').hidden=false});
  window.addEventListener('dragleave',e=>{if(!temArq(e))return;if(--n<=0){n=0;$('#plDrop').hidden=true}});
  window.addEventListener('dragover',e=>{if(temArq(e))e.preventDefault()});
  window.addEventListener('drop',e=>{if(!temArq(e))return;e.preventDefault();n=0;$('#plDrop').hidden=true;if(!S.iniciado||!$('#plGate').hidden)return;
    const fs=[...e.dataTransfer.files];if(!fs.length)return;if(fs.length>1||!$('#plDocs').hidden)importaLote(fs);else importaUm(fs[0])})}

/* ---------------- integração GPlanSiS|Docs ---------------- */
const DX={id:null,v:null,overlay:true,timer:null,assin:''};
const ST_DOCS={EM_ELABORACAO:['Em elaboração',''],EM_VERIFICACAO:['Em verificação','warn'],APROVADA_INTERNA:['Aprovada internamente','info'],EMITIDA:['Emitida','info'],
  APROVADA:['Aprovada (A)','ok'],APROVADA_COM_COMENTARIOS:['Aprovada c/ comentários (B)','warn'],REPROVADA:['Reprovada','bad'],SUPERADA:['Superada',''],CANCELADA:['Cancelada','bad']};
const FIN={PI:'Para informação',PA:'Para aprovação',PC:'Para construção',CE:'Conforme construído',CA:'Cancelamento'};
const stDocs=s=>ST_DOCS[s]||[s||'—',''];
function abrirNoDocs(para){// a aba abre já no clique (senão o navegador bloqueia), o endereço chega depois
  const w=window.open('about:blank','_blank');
  api('POST','/api/docs/sso',{para:para||''}).then(r=>{if(w)w.location.href=r.url;else location.href=r.url}).catch(e=>{if(w)w.close();toast(e.message,5000)})}
$('#plDocsLink').onclick=()=>abrirNoDocs('/drawings');
function pintaChip(){const el=$('#plDocsChip'),v=DX.v;if(!el)return;el.hidden=!(S.me&&S.me.docs&&v&&ligado());if(el.hidden)return;
  const[st,tom]=stDocs(v.revisao.status);
  el.innerHTML=`<span class="dot ${tom}"></span><b>${esc(v.codigo||'')}</b> · Rev. ${esc(v.revisao.label||'—')} · ${esc(st)}${v.comentariosAbertos?` · ${v.comentariosAbertos} coment.`:''}`;
  el.title=`GPlanSiS|Docs — ${v.titulo||''}. Clique para ver revisões e comentários.`;
  if(v.codigo){PLT.docCode=v.codigo;PLT.docRev=v.revisao.label||''}}
$('#plDocsChip').onclick=()=>dlgDocs();
async function syncDocs(forcar){if(!S.me||!S.me.docs||!ligado()){DX.v=null;pintaChip();return}
  const id=S.cur.id;
  try{const r=await api('GET',`/api/docs/vinculo/${id}${forcar?'?atualizar=1':''}`);if(S.cur.id!==id)return;
    const v=r.vinculo,ant=DX.v;DX.v=v;if(!v){delete PLT.docCode;delete PLT.docRev}
    const assin=v?`${v.revisao.id}|${v.revisao.status}|${v.comentarios.map(c=>c.id+c.status).join(',')}`:'';
    if(ant&&v&&DX.assin&&assin!==DX.assin){// aviso do que mudou no Docs
      if(ant.revisao.status!==v.revisao.status||ant.revisao.label!==v.revisao.label)toast(`Docs: ${v.codigo} rev. ${v.revisao.label} — ${stDocs(v.revisao.status)[0]}`,5000);
      else if(v.comentariosAbertos>ant.comentariosAbertos)toast(`Docs: ${v.comentariosAbertos-ant.comentariosAbertos} comentário(s) novo(s) em ${v.codigo}`,5000)}
    DX.assin=assin;pintaChip();requestDraw()}
  catch(e){if(forcar)toast('Docs: '+e.message,4000)}}
function agendaDocs(){clearInterval(DX.timer);if(S.me&&S.me.docs)DX.timer=setInterval(()=>{if(!document.hidden)syncDocs(false)},20000)}
// nuvens de revisão: retângulo do comentário (normalizado na página do PDF) → milímetros de papel → modelo → tela
function comentarioNoModelo(c,p){if(c.x==null||!p||p.vps||(c.page&&c.page!==1))return null;
  const m=(X,Y)=>P(p.cx+(X-p.px)/p.k,p.cy-(Y-p.py)/p.k);return{a:m(c.x*p.W,c.y*p.H),b:m((c.x+c.w)*p.W,(c.y+c.h)*p.H)}}
window.cadOverlay=(g,w2s)=>{const v=DX.v;if(!DX.overlay||!v||!v.plot||!ligado())return;
  v.comentarios.forEach((c,i)=>{const r=comentarioNoModelo(c,v.plot);if(!r)return;const a=w2s(r.a),b=w2s(r.b);
    const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);if(x1-x0<4||y1-y0<4)return;
    const aberto=c.status==='ABERTO',cor=aberto?'#e5484d':'#3e9b4f',R=Math.max(5,Math.min(14,(x1-x0)/8,(y1-y0)/8));
    g.save();g.strokeStyle=cor;g.lineWidth=1.6;g.globalAlpha=aberto?.95:.5;g.beginPath();
    const borda=(xa,ya,xb,yb)=>{const L=Math.hypot(xb-xa,yb-ya),n=Math.max(1,Math.round(L/(2*R))),dx=(xb-xa)/n,dy=(yb-ya)/n,ang=Math.atan2(dy,dx);
      for(let k=0;k<n;k++){const cx=xa+dx*(k+.5),cy=ya+dy*(k+.5);g.moveTo(cx-dx/2,cy-dy/2);g.arc(cx,cy,Math.hypot(dx,dy)/2,ang+Math.PI,ang+2*Math.PI)}};
    borda(x0,y0,x1,y0);borda(x1,y0,x1,y1);borda(x1,y1,x0,y1);borda(x0,y1,x0,y0);g.stroke();
    g.globalAlpha=1;g.fillStyle=cor;g.beginPath();g.arc(x0,y0,9,0,2*Math.PI);g.fill();g.fillStyle='#fff';g.font='600 10px IBM Plex Mono, monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(String(i+1),x0,y0+.5);g.restore()})};

function dlgDocs(){const v=DX.v;if(!v)return;const[st]=stDocs(v.revisao.status);
  dlg('GPlanSiS|Docs — '+v.codigo,`<div class="field"><label>Documento</label><input readonly value="${esc(v.codigo)} · ${esc(v.titulo||'')}"></div>
    <div class="field"><label>Projeto</label><input readonly value="${esc(v.projeto.codigo||'')}${v.projeto.nome?' · '+esc(v.projeto.nome):''}"></div>
    <div class="field"><label>Revisão</label><input readonly value="${esc(v.revisao.label||'')} · ${esc(st)}${v.revisao.finalidade?' · '+esc(FIN[v.revisao.finalidade]||v.revisao.finalidade):''}${v.revisao.retornoCliente?' · retorno do cliente '+esc(v.revisao.retornoCliente):''}"></div>
    <p class="small">Enviado ${v.enviadoEm?quando(v.enviadoEm):'—'}${v.enviadoPor?' por '+esc(v.enviadoPor):''}${v.versaoEnviada?` · versão ${v.versaoEnviada} do desenho`:''}${S.cur.versao>v.versaoEnviada?' <span class="pl-badge ac">há alterações não enviadas</span>':''}</p>
    <div class="ph">Comentários (${v.comentarios.length}${v.comentariosAbertos?`, ${v.comentariosAbertos} aberto(s)`:''})</div>
    <label class="chk"><input type="checkbox" id="dxOv" ${DX.overlay?'checked':''}> Mostrar os comentários como nuvens de revisão no desenho</label>
    ${v.comentarios.length?v.comentarios.map((c,i)=>`<div class="pl-com${c.status==='ABERTO'?'':' res'}"><span class="n">${i+1}</span><div><b>${esc(c.author||'')}</b> <span class="small">· ${esc(c.category)} · rev. ${esc(c.revision_label||'')} · ${quando(c.created_at)}</span>
      <p>${esc(c.body)}</p>${c.resolution?`<p class="small">Resolução: ${esc(c.resolution)}</p>`:''}</div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="pl-badge ${c.status==='ABERTO'?'dg':'ok'}">${c.status==='ABERTO'?'aberto':c.status==='RESOLVIDO'?'resolvido':'n/a'}</span>${comentarioNoModelo(c,v.plot)?`<button class="tb" data-loc="${i}" style="min-height:24px;padding:2px 8px">Localizar</button>`:''}</div></div>`).join(''):'<p class="small">Nenhum comentário.</p>'}
    <div class="ph">Revisões</div><div class="pl-scroll"><table class="pl-tbl"><thead><tr><th>Rev.</th><th>Situação</th><th>Finalidade</th><th>Descrição</th><th>Data</th></tr></thead><tbody>
    ${v.revisoes.slice().reverse().map(r=>`<tr><td class="mono">${esc(r.label)}</td><td>${esc(stDocs(r.status)[0])}</td><td>${esc(FIN[r.purpose]||r.purpose||'—')}</td><td class="small">${esc(r.description||'')}</td><td class="mono">${dataHora(r.issued_at||r.created_at)}</td></tr>`).join('')}</tbody></table></div>`,
    [{label:'Atualizar',keep:true,fn:async()=>{await syncDocs(true);closeModal();dlgDocs()}},{label:'Abrir no Docs',keep:true,fn:()=>abrirNoDocs('/documentos/'+v.docId)},
     ...(can('desenhar')?[{label:'Enviar nova versão',fn:()=>setTimeout(dlgEnviarDocs,40)}]:[]),{label:'Fechar',primary:true,fn:()=>{}}]);
  $('#dxOv').onchange=e=>{DX.overlay=e.target.checked;requestDraw()};
  $('#mdlB').onclick=e=>{const b=e.target.closest('[data-loc]');if(!b)return;const r=comentarioNoModelo(v.comentarios[+b.dataset.loc],v.plot);closeModal();
    const w=Math.abs(r.b.x-r.a.x),h=Math.abs(r.b.y-r.a.y);zoomBox({x0:Math.min(r.a.x,r.b.x)-w,y0:Math.min(r.a.y,r.b.y)-h,x1:Math.max(r.a.x,r.b.x)+w,y1:Math.max(r.a.y,r.b.y)+h});DX.overlay=true;requestDraw()}}

const blobB64=b=>new Promise((ok,ko)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(',')[1]);fr.onerror=()=>ko(new Error('Falha ao ler o PDF'));fr.readAsDataURL(b)});
const SUGERE_DISC=[[/^S-/,'EST'],[/^M-/,'MEC'],[/^E-/,'ELE'],[/^I-PIPE|^P-PROC|^P-/,'TUB'],[/^I-TRAY/,'ELE'],[/^A-/,'ARQ']];
function disciplinaSugerida(){const n={};for(const e of doc.ents){const s=SUGERE_DISC.find(([re])=>re.test(e.layer||''));if(s)n[s[1]]=(n[s[1]]||0)+1}return Object.entries(n).sort((a,b)=>b[1]-a[1])[0]?.[0]||'GER'}
async function dlgEnviarDocs(){
  if(!S.me.docs){toast('A integração com o GPlanSiS|Docs não está configurada no servidor');return}
  if(!can('desenhar')){toast('Seu perfil não permite enviar desenhos');return}
  if(!ligado()||S.sujo){askConfirm(ligado()?'Há alterações não salvas. Salvar agora e enviar esta versão ao Docs?':'O desenho precisa estar salvo no servidor antes de ir para o Docs. Salvar agora?',
    async()=>{await saveFile();if(ligado()&&!S.sujo)dlgEnviarDocs()},'Salvar e continuar');return}
  await syncDocs(true);const v=DX.v;let op=null;
  if(!v){try{op=await api('GET','/api/docs/opcoes')}catch(e){toast(e.message,5000);return}
    if(!op.projetos.length){dlg('Enviar ao GPlanSiS|Docs','<p style="margin-top:0">Você não é Autor, Controlador nem Administrador de nenhum projeto no Docs.</p><p class="small">Peça a um controlador do projeto para incluir você na equipe.</p>',[{label:'Fechar',fn:()=>{}}]);return}}
  const sug=disciplinaSugerida(),[stA]=v?stDocs(v.revisao.status):[''];
  const acao=v?(v.revisao.status==='EM_ELABORACAO'?`Os arquivos da revisão <b>${esc(v.revisao.label)}</b> (em elaboração) serão substituídos por esta versão.`:`A revisão ${esc(v.revisao.label)} está “${esc(stA)}”: o Docs abrirá a <b>próxima revisão</b> com esta versão.`):'O Docs vai criar um documento do tipo Desenho, numerado pela máscara do projeto, na revisão inicial.';
  dlg('Enviar ao GPlanSiS|Docs',`<p class="small" style="margin-top:0">${acao} Vão juntos: PDF vetorial da folha (com código e revisão no carimbo), DXF AutoCAD 2018 e o arquivo nativo do Drawings.</p>
    ${v?`<div class="field"><label>Documento</label><input readonly value="${esc(v.codigo)} · ${esc(v.titulo||'')}"></div>
      ${v.revisao.status!=='EM_ELABORACAO'?'<div class="field"><label>O que mudou</label><input id="dxDesc" maxlength="300" placeholder="Descrição da nova revisão (ex.: atende comentários 1 a 3)"></div>':''}`
     :`<div class="field"><label>Projeto</label><select id="dxProj">${op.projetos.map(p=>`<option value="${p.id}">${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Disciplina</label><select id="dxDisc"></select></div>
      <div class="field"><label>Tipo</label><select id="dxTipo">${op.tipos.map(t=>`<option value="${esc(t.code)}"${t.code==='DE'?' selected':''}>${esc(t.code)} · ${esc(t.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Título</label><input id="dxTit" maxlength="200" value="${esc(PLT.title&&PLT.title!=='Planta baixa'?PLT.title:doc.name)}"></div>`}
    <div class="field"><label>Folha</label><input readonly value="${esc(PLT.paper)} ${PLT.orient==='L'?'paisagem':'retrato'} · ${PLT.scale==='fit'?'ajustada':'1:'+esc(PLT.scale)} · folha ${esc(PLT.sheet)}"></div>
    <p class="small" style="margin:0 0 6px 102px"><button class="tb" id="dxPlot" style="min-height:24px;padding:2px 8px">Ajustar papel, escala e carimbo…</button></p>
    <label class="chk"><input type="checkbox" id="dxFluxo"> Enviar para verificação no Docs</label><div id="dxFluxoBox" hidden></div>
    <div id="dxProg" class="pl-teste" hidden></div><div class="pl-err" id="dxErr"></div>`,
    [{label:'Cancelar',fn:()=>{}},{label:'Enviar ao Docs',primary:true,keep:true,fn:()=>enviaDocs(v,op)}]);
  $('#dxPlot').onclick=()=>{closeModal();setTimeout(()=>{dlgPlot();toast('Ajuste a folha e feche; depois use Enviar ao Docs de novo',4000)},40)};
  const projetoAtual=()=>v?v.projeto.id:$('#dxProj').value;
  const pintaDisc=()=>{if(v)return;const pid=$('#dxProj').value,hab=op.disciplinasProjeto.filter(x=>x.project_id===pid).map(x=>x.code);
    const L=op.disciplinas.filter(d=>!hab.length||hab.includes(d.code));$('#dxDisc').innerHTML=L.map(d=>`<option value="${esc(d.code)}"${d.code===sug?' selected':''}>${esc(d.code)} · ${esc(d.name)}</option>`).join('')};
  if(!v){pintaDisc();$('#dxProj').onchange=()=>{pintaDisc();if($('#dxFluxo').checked)pintaFluxo()}}
  let fluxos=op?op.fluxos:null;
  const pintaFluxo=async()=>{const box=$('#dxFluxoBox');box.hidden=false;box.innerHTML='<p class="small">Carregando a equipe do projeto…</p>';
    try{if(!fluxos)fluxos=(await api('GET','/api/docs/opcoes')).fluxos;const pid=projetoAtual();const T=fluxos.filter(t=>!t.project_id||t.project_id===pid);
      const mem=await api('GET',`/api/docs/projetos/${pid}/membros`);
      const pode=(papel,req)=>papel==='ADMIN'||papel===req||(req==='REVISOR'&&papel==='CONTROLADOR');
      const desenha=t=>`<div class="field"><label>Fluxo</label><select id="dxTpl">${T.map(x=>`<option value="${esc(x.id)}"${x.id===t.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
        <div class="pl-steps">${t.steps.map(s=>{const ok=mem.filter(m=>pode(m.role,s.role_required)&&m.email.toLowerCase()!==S.me.login).sort((x,y)=>(y.role===s.role_required)-(x.role===s.role_required));  // quem tem o perfil exato vem primeiro
          return `<div class="field"><label>${+s.step_order}. ${esc(s.name)}</label><select data-step="${+s.step_order}">${ok.length?ok.map(m=>`<option value="${esc(m.id)}">${esc(m.name)} · ${esc(m.role)}</option>`).join(''):'<option value="">ninguém com perfil '+esc(s.role_required)+' no projeto</option>'}</select></div>`}).join('')}</div>
        <p class="small">Prazo e regras seguem o fluxo do Docs; quem envia não pode aprovar a própria revisão.</p>`;
      if(!T.length){box.innerHTML='<p class="small">Nenhum fluxo de verificação disponível para este projeto no Docs.</p>';return}
      box.innerHTML=desenha(T[0]);box.onchange=e=>{if(e.target.id==='dxTpl'){box.innerHTML=desenha(T.find(x=>x.id===e.target.value));}}}
    catch(e){box.innerHTML=`<p class="pl-err">${esc(e.message)}</p>`}};
  $('#dxFluxo').onchange=e=>{if(e.target.checked)pintaFluxo();else $('#dxFluxoBox').hidden=true}}
async function enviaDocs(v,op){const prog=$('#dxProg'),err=$('#dxErr'),btn=[...$$('#mdlF button')].find(b=>b.textContent==='Enviar ao Docs');
  const passo=t=>{prog.hidden=false;prog.textContent=t};err.textContent='';
  let fluxo=null;if($('#dxFluxo').checked){const t=$('#dxTpl');if(!t){err.textContent='Escolha o fluxo de verificação';return}
    const as={};for(const s of $$('#dxFluxoBox [data-step]')){if(!s.value){err.textContent='Falta responsável numa etapa do fluxo';return}as[s.dataset.step]=s.value}fluxo={template_id:t.value,assignees:as}}
  if(btn)btn.disabled=true;
  try{passo('Preparando o documento no Docs…');
    const p=await api('POST',`/api/docs/preparar/${S.cur.id}`,v?{descricao:($('#dxDesc')||{}).value||null}:{projetoId:$('#dxProj').value,disciplina:$('#dxDisc').value,tipo:$('#dxTipo').value,titulo:$('#dxTit').value.trim()});
    PLT.docCode=p.codigo;PLT.docRev=p.revisaoLabel;if(!v&&$('#dxTit'))PLT.title=$('#dxTit').value.trim();
    passo(`${p.codigo} · rev. ${p.revisaoLabel}: gerando o PDF vetorial da folha…`);
    const pdf=await blobB64(await pdfVetorial());const g=plotGeom();
    passo(`${p.codigo} · rev. ${p.revisaoLabel}: enviando PDF, DXF e arquivo nativo…`);
    const r=await api('POST',`/api/docs/enviar/${S.cur.id}`,{revisaoId:p.revisaoId,pdf,modelo:cadExport.modelo(),formato:`${g.papel}`,escala:g.escala==='fit'?'ajustada':'1:'+g.escala,folha:PLT.sheet,plot:g,fluxo});
    DX.v=r.vinculo;DX.assin='';pintaChip();closeModal();requestDraw();
    toast(`Enviado ao Docs: ${p.codigo} rev. ${p.revisaoLabel}${fluxo?' — em verificação':''}`,5000);log(`Enviado ao GPlanSiS|Docs: ${p.codigo} rev. ${p.revisaoLabel} (${p.acao==='criado'?'documento criado':p.acao==='nova_revisao'?'nova revisão':'arquivos da revisão substituídos'}).`)}
  catch(e){err.textContent=e.message;prog.hidden=true;syncDocs(true)}finally{if(btn)btn.disabled=false}}
defCmd('ENVIARDOCS',{al:['DOCS','ENVIAR','EMITIR'],instant:true,desc:'Enviar a folha ao GPlanSiS|Docs'},()=>dlgEnviarDocs());

/* ---------------- navegador de desenhos ---------------- */
function abreDocs(aba){if(aba)S.aba=aba;$('#plDocs').hidden=false;$('#plMenu').hidden=true;pintaAbas();carregaDocs();if(innerWidth>760)setTimeout(()=>$('#plDocsQ').focus(),50)}
function pintaAbas(){const ab=[['meus','Meus'],['compartilhados','Compartilhados comigo'],isAdmin()&&['todos','Todos'],(can('excluir')||isAdmin())&&['lixeira','Lixeira']].filter(Boolean);
  $('#plDocsTabs').innerHTML=ab.map(([k,n])=>`<button role="tab" data-aba="${k}" aria-selected="${S.aba===k}">${n}</button>`).join('');
  $('#plDocsNew').hidden=!can('desenhar');$('#plDocsImp').hidden=!(can('desenhar')&&can('importar'))}
$('#plDocsTabs').onclick=e=>{const b=e.target.closest('[data-aba]');if(!b)return;S.aba=b.dataset.aba;pintaAbas();carregaDocs()};
$('#plDocsQ').oninput=e=>{S.q=e.target.value.trim().toLowerCase();pintaDocs()};
$('#plDocsNew').onclick=()=>{$('#plDocs').hidden=true;startCmd('NEW')};
async function carregaDocs(){const g=$('#plDocsGrid');if(!S.lista.length)g.innerHTML='<div class="pl-empty">Carregando…</div>';
  try{S.lista=(await api('GET','/api/desenhos?escopo='+S.aba)).desenhos;pintaDocs()}catch(e){g.innerHTML=`<div class="pl-empty"><b>Não foi possível listar</b>${esc(e.message)}</div>`}}
function pintaDocs(){const g=$('#plDocsGrid'),L=S.lista.filter(d=>!S.q||d.nome.toLowerCase().includes(S.q));
  if(!L.length){const vaz={meus:['Nenhum desenho salvo ainda','Desenhe e use Salvar (Ctrl+S): o desenho fica no servidor e abre em qualquer aparelho.'],compartilhados:['Nada compartilhado com você','Quando alguém compartilhar um desenho, ele aparece aqui.'],todos:['Nenhum desenho no servidor',''],lixeira:['Lixeira vazia','Desenhos excluídos ficam aqui por 30 dias.']}[S.aba];
    g.innerHTML=`<div class="pl-empty"><b>${S.q?'Nada encontrado':vaz[0]}</b>${S.q?'Tente outro nome.':vaz[1]}</div>`;return}
  const lix=S.aba==='lixeira';
  g.innerHTML=L.map(d=>{const meu=d.donoId===S.me.id,ed=d.nivel!=='LER',atual=ligado()&&S.cur.id===d.id;
    const a=lix?[can('excluir')&&`<button class="tb" data-a="restaurar">Restaurar</button>`,`<button class="tb" data-a="apagar">Excluir de vez</button>`]
      :[`<button class="tb primary" data-a="abrir">${atual?'Aberto':'Abrir'}</button>`,ed&&can('desenhar')&&`<button class="tb" data-a="renomear">Renomear</button>`,
        can('desenhar')&&`<button class="tb" data-a="duplicar">Duplicar</button>`,`<button class="tb" data-a="versoes">Versões</button>`,
        d.nivel==='DONO'&&can('compartilhar')&&`<button class="tb" data-a="compartilhar">Compartilhar</button>`,d.nivel==='DONO'&&can('excluir')&&`<button class="tb" data-a="excluir">Excluir</button>`];
    return `<article class="pl-card${atual?' atual':''}" data-id="${d.id}">
      <button class="pl-thumb" data-a="${lix?'':'abrir'}" aria-label="Abrir ${esc(d.nome)}">${d.miniatura?`<img alt="" src="${esc(d.miniatura)}" loading="lazy">`:ico('draw')}</button>
      <div class="pl-card-b"><div class="pl-card-t"><b title="${esc(d.nome)}">${esc(d.nome)}</b>${d.nivel!=='DONO'?`<span class="pl-badge ${d.nivel==='EDITAR'?'ac':'sel'}">${NIVEL[d.nivel]}</span>`:''}${meu&&(d.equipe||d.compartilhados)?'<span class="pl-badge ok">compartilhado</span>':''}</div>
      ${d.docs?`<div class="pl-card-m"><span class="pl-badge ${stDocs(d.docs.status)[1]==='ok'?'ok':stDocs(d.docs.status)[1]==='bad'?'dg':'sel'}" title="GPlanSiS|Docs">${esc(d.docs.codigo||'')} · rev. ${esc(d.docs.rev||'')}</span><span>${esc(stDocs(d.docs.status)[0])}${d.docs.abertos?` · ${d.docs.abertos} coment.`:''}</span></div>`:''}
      <div class="pl-card-m">${!meu&&d.dono?av(d.dono,'sm')+`<span>${esc(d.dono.nome||'')}</span> · `:''}<span>v${d.versao} · ${d.objetos} obj · ${tamanho(d.bytes)}</span></div>
      <div class="pl-card-m"><span>${lix?'excluído '+quando(d.excluidoEm):'alterado '+quando(d.atualizadoEm)+(d.atualizadoPor&&d.atualizadoPor!==S.me.login?' por '+esc(d.atualizadoPor):'')}</span></div>
      <div class="pl-card-a">${a.filter(Boolean).join('')}</div></div></article>`}).join('')}
$('#plDocsGrid').onclick=async e=>{const b=e.target.closest('[data-a]');if(!b||!b.dataset.a)return;const id=+b.closest('[data-id]').dataset.id,d=S.lista.find(x=>x.id===id),a=b.dataset.a;
  if(a==='abrir'){if(ligado()&&S.cur.id===id&&!S.sujo){$('#plDocs').hidden=true;return}
    const go=async()=>{try{await abrir(id);$('#plDocs').hidden=true}catch(_){}};
    if(S.sujo&&doc.ents.length&&can('desenhar'))askConfirm(`“${doc.name}” tem alterações não salvas no servidor. Abrir outro desenho descarta essas alterações.`,go,'Descartar e abrir');else go()}
  if(a==='renomear')askText('Renomear desenho',d.nome,async n=>{n=(n||'').trim();if(!n)return;try{await api('PATCH',`/api/desenhos/${id}`,{nome:n});if(ligado()&&S.cur.id===id){doc.name=n;$('#fname').textContent=n}carregaDocs()}catch(err){toast(err.message)}});
  if(a==='duplicar'){try{const r=await api('POST',`/api/desenhos/${id}/duplicar`,{});toast('Cópia criada: '+r.desenho.nome);S.aba='meus';pintaAbas();carregaDocs()}catch(err){toast(err.message)}}
  if(a==='versoes')dlgVersoes(id,d.nome);
  if(a==='compartilhar')dlgCompartilhar(id,d.nome);
  if(a==='excluir')askConfirm(`Mover “${d.nome}” para a lixeira? Ele pode ser restaurado por 30 dias.`,async()=>{try{await api('DELETE',`/api/desenhos/${id}`);if(S.cur.id===id){S.cur={id:null,versao:0,nivel:'DONO'};S.docRef=null;S.sujo=true;guardaCur();status()}toast('Movido para a lixeira');carregaDocs()}catch(err){toast(err.message)}},'Mover para a lixeira');
  if(a==='restaurar'){try{await api('POST',`/api/desenhos/${id}/restaurar`,{});toast('Restaurado');carregaDocs()}catch(err){toast(err.message)}}
  if(a==='apagar')askConfirm(`Excluir “${d.nome}” definitivamente, com todas as versões? Não há como desfazer.`,async()=>{try{await api('DELETE',`/api/desenhos/${id}?definitivo=true`);toast('Excluído definitivamente');carregaDocs()}catch(err){toast(err.message)}},'Excluir de vez')};

async function dlgVersoes(id,nome){let v;try{v=(await api('GET',`/api/desenhos/${id}/versoes`)).versoes}catch(e){toast(e.message);return}
  dlg('Versões — '+nome,`<p class="small" style="margin-top:0">As últimas 40 versões ficam guardadas. Carregar uma versão antiga a traz para a tela; ao salvar, ela vira a versão mais nova (nada se perde).</p>
  <div class="flist">${v.map((x,i)=>`<div><span><b>v${x.versao}</b>${i===0?' <span class="pl-badge ok">atual</span>':''} · ${esc(x.nome)}<br><small class="small">${dataHora(x.salvoEm)} · ${esc(x.salvoPor||'')} · ${x.objetos} obj · ${tamanho(x.bytes)}</small></span>${i?`<button class="tb" data-v="${x.versao}">Carregar</button>`:''}</div>`).join('')}</div>`,[{label:'Fechar',fn:()=>{}}]);
  $('#mdlB').onclick=async e=>{const b=e.target.closest('[data-v]');if(!b)return;const n=+b.dataset.v;
    const go=async()=>{try{if(!(ligado()&&S.cur.id===id))await abrir(id,{quieto:true});const r=await api('GET',`/api/desenhos/${id}/versoes/${n}`);
      S.carregando=true;try{loadDoc(r.doc);doc.name=r.nome;$('#fname').textContent=r.nome}finally{S.carregando=false}
      S.docRef=doc;S.sujo=true;guardaCur();status();closeModal();$('#plDocs').hidden=true;toast(`Versão ${n} carregada. Salve para torná-la a versão atual.`,4000)}catch(err){toast(err.message)}};
    if(S.sujo&&doc.ents.length&&!(ligado()&&S.cur.id===id&&!S.sujo))askConfirm('Descartar as alterações não salvas do desenho atual?',go,'Descartar');else go()}}

async function dlgCompartilhar(id,nome){let c,dir;try{[c,dir]=await Promise.all([api('GET',`/api/desenhos/${id}/compartilhamento`),api('GET','/api/diretorio')])}catch(e){toast(e.message);return}
  const niv=Object.fromEntries(c.usuarios.map(u=>[u.id,u.nivel]));const outros=dir.usuarios.filter(u=>u.id!==S.me.id);
  const sel=(v,attr)=>`<select class="pl-sel" ${attr}><option value="">sem acesso</option><option value="LER"${v==='LER'?' selected':''}>pode ver</option><option value="EDITAR"${v==='EDITAR'?' selected':''}>pode editar</option></select>`;
  dlg('Compartilhar — '+nome,`<div class="pl-share-row"><div class="pl-who">${av({nome:'Equipe'},'md')}<div><b>Toda a equipe</b><small>Todos os usuários ativos</small></div></div>${sel(c.equipe,'id="plShEq"')}</div>
    ${outros.length?outros.map(u=>`<div class="pl-share-row"><div class="pl-who">${av(u,'md')}<div><b>${esc(u.nome)}</b><small>${esc(u.login)} · ${esc(papelNome(u.papel))}</small></div></div>${sel(niv[u.id],`data-u="${u.id}"`)}</div>`).join(''):'<p class="small">Ainda não há outros usuários cadastrados.</p>'}
    <p class="small">Quem tem perfil Consulta ou Revisor vê, mas não grava, mesmo com “pode editar”.</p>`,
    [{label:'Cancelar',fn:()=>{}},{label:'Salvar compartilhamento',primary:true,keep:true,fn:async()=>{
      const us=$$('#mdlB [data-u]').filter(s=>s.value).map(s=>({id:+s.dataset.u,nivel:s.value}));
      try{await api('PUT',`/api/desenhos/${id}/compartilhamento`,{equipe:$('#plShEq').value||null,usuarios:us});closeModal();toast('Compartilhamento salvo');if(!$('#plDocs').hidden)carregaDocs()}catch(e){toast(e.message)}}}])}

/* ---------------- Assistente IA: desenhar, revisar, extrair listas ---------------- */
const IA={modo:'desenhar',pedidos:{},anexo:null,ctrl:null};
const n0=v=>Math.abs(v)>=100?Math.round(v):+(+v).toFixed(1);
const pxy=p=>p?`(${n0(p.x)},${n0(p.y)})`:'?';
function linhaEnt(e){const id=`#${e.id} `,ly=e.layer||'0';
  switch(e.type){
    case 'line':return `${id}LINHA ${ly} ${pxy(e.a)}-${pxy(e.b)}`;
    case 'pline':return `${id}POLI ${ly}${e.closed?' fechada':''} n=${e.pts.length} ${e.pts.slice(0,14).map(pxy).join(' ')}${e.pts.length>14?' …':''}`;
    case 'circle':return `${id}CÍRCULO ${ly} c=${pxy(e.c)} r=${n0(e.r)}`;
    case 'arc':return `${id}ARCO ${ly} c=${pxy(e.c)} r=${n0(e.r)} ${n0(e.a0*R2D)}°→${n0(e.a1*R2D)}°`;
    case 'ellipse':return `${id}ELIPSE ${ly} c=${pxy(e.c)} ${n0(e.rx)}×${n0(e.ry)}`;
    case 'text':return `${id}TEXTO ${ly} ${pxy(e.p)} h=${n0(e.h)} "${String(e.s).replace(/\n/g,' ⏎ ').slice(0,160)}"`;
    case 'insert':{const B=doc.blocks[e.name];const at=e.attrs&&Object.keys(e.attrs).length?' '+Object.entries(e.attrs).map(([k,v])=>`${k}=${v}`).join(' '):'';
      return `${id}BLOCO ${ly} ${e.name}${B&&B.label&&B.label!==e.name?` (${B.label})`:''} em ${pxy(e.p)} rot=${n0((e.rot||0)*R2D)}° esc=${n0(e.sx??1)}${at}`}
    case 'wall':return `${id}PAREDE ${ly} ${pxy(e.a)}-${pxy(e.b)} esp=${e.t}${e.ins?` isol=${e.ins}`:''} alt=${e.h||doc.wall.h}`;
    case 'dim':return `${id}COTA ${ly} ${['p1','p2','pos','c'].filter(k=>e[k]).map(k=>k+'='+pxy(e[k])).join(' ')}${e.p1&&e.p2?` medida≈${n0(Math.hypot(e.p2.x-e.p1.x,e.p2.y-e.p1.y))}`:''}${e.txt?` texto="${e.txt}"`:''}`;
    case 'hatch':return `${id}HACHURA ${ly} ${e.pat} ${e.loops.length} contorno(s) em torno de ${pxy(e.loops[0]&&e.loops[0][0])}`;
    case 'leader':return `${id}CHAMADA ${ly} ${pxy(e.pts[0])} "${String(e.s||e.text||'').slice(0,80)}"`;
    default:{const o={};for(const[k,v]of Object.entries(e)){if(['id','layer','color','lt','lw','type'].includes(k))continue;
        if(v&&typeof v==='object'&&'x' in v)o[k]=pxy(v);else if(typeof v==='number')o[k]=n0(v);else if(typeof v==='string'&&v.length<60)o[k]=v}
      return `${id}${e.type.toUpperCase()} ${ly} ${Object.entries(o).slice(0,8).map(([k,v])=>`${k}=${v}`).join(' ')}`}}}
function contextoDesenho(soSel){
  const todos=doc.ents.filter(visible),ents=soSel&&SEL.size?todos.filter(e=>SEL.has(e.id)):todos,L=[];
  L.push(`Desenho "${doc.name}" · unidade mm · escala de cota 1:${doc.dim.scale} · ${todos.length} objeto(s) visíveis${soSel&&SEL.size?` · listando só os ${ents.length} SELECIONADOS`:''}.`);
  if(todos.length){const b=extents(todos);L.push(`Extensão total: x ${n0(b.x0)} a ${n0(b.x1)}, y ${n0(b.y0)} a ${n0(b.y1)} (${n0(b.x1-b.x0)} × ${n0(b.y1-b.y0)} mm).`)}
  const porTipo={},porCam={};for(const e of ents){porTipo[e.type]=(porTipo[e.type]||0)+1;porCam[e.layer]=(porCam[e.layer]||0)+1}
  if(ents.length)L.push('Por tipo: '+Object.entries(porTipo).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${t} ${n}`).join(', '));
  L.push('Camadas (nome, cor ACI, objetos): '+doc.layers.map(l=>`${l.name}${l.on?'':'[desligada]'}(${l.color}${porCam[l.name]?', '+porCam[l.name]:''})`).join('; '));
  L.push(`Camada atual: ${doc.clayer}.`);
  const usos={};for(const e of todos)if(e.type==='insert')usos[e.name]=(usos[e.name]||0)+1;
  L.push('Catálogo de blocos (nome — descrição — atributos na ordem pedida pelo INSERT — usos no desenho):');
  for(const[n,B]of Object.entries(doc.blocks).slice(0,250)){if(n.startsWith('*'))continue;const ad=(B.ents||[]).filter(x=>x.type==='attdef').map(a=>a.tag);
    L.push(`  ${n}${B.label&&B.label!==n?' — '+B.label:''}${ad.length?' — atributos: '+ad.join(', '):''}${usos[n]?' — usado '+usos[n]+'×':''}`)}
  // listas calculadas pelo próprio CAD (exatas): equipamentos, instrumentos, linhas, fios, aço e blocos
  try{const IL=indLists(),Q=[['eq','Equipamentos','TAG | Descrição | Disciplina | Posição'],['inst','Instrumentos','TAG | Função | Malha | Tipo | Camada'],['lines','Linhas e tubos','Identificação | Comprimento (m) | Classe / dados'],
      ['wires','Fios','Número | Comprimento no esquema | Trechos'],['steel','Aço estrutural','Perfil | Comprimento (mm) | kg/m | Massa (kg)']];
    const tem=Q.some(([k])=>(IL[k]||[]).length)||Object.keys(IL.bom||{}).length;
    if(tem){L.push('Listas calculadas pelo CAD a partir dos objetos (fonte exata — prefira estes dados ao extrair):');
      for(const[k,t,h]of Q){const R=IL[k]||[];if(!R.length)continue;L.push(`  [${t}] ${h}`);R.slice(0,400).forEach(r=>L.push('    '+r.map(v=>String(v??'')).join(' | ')));if(R.length>400)L.push(`    … +${R.length-400}`)}
      const bom=Object.entries(IL.bom||{});if(bom.length){L.push('  [Blocos inseridos] Bloco | Descrição | Quantidade');bom.forEach(([n,q])=>L.push(`    ${n} | ${(doc.blocks[n]||{}).label||n} | ${q}`))}}}
  catch(err){console.warn('indLists',err)}
  // objetos: primeiro o que carrega informação (textos, blocos, cotas, paredes, especiais), depois geometria
  const peso=e=>({text:0,insert:0,dim:1,leader:1,wall:1,hatch:3,line:4,pline:3,circle:3,arc:4,ellipse:4}[e.type]??2);
  const ord=ents.slice().sort((a,b)=>peso(a)-peso(b));let tam=L.join('\n').length,n=0;L.push('Objetos:');
  for(const e of ord){const s=linhaEnt(e);if(tam+s.length>280000||n>=4000)break;L.push(s);tam+=s.length+1;n++}
  if(n<ord.length)L.push(`… e mais ${ord.length-n} objeto(s) de geometria simples não listados (use a extensão e as camadas).`);
  return L.join('\n')}

async function streamIA(corpo,aoEvento,sinal){
  const r=await fetch('/api/ia/assistente',{method:'POST',headers:{'x-drawings':'1','content-type':'application/json'},body:JSON.stringify(corpo),credentials:'same-origin',signal:sinal});
  if(!r.ok){let m=`Erro ${r.status}`;try{const j=await r.json();m=typeof j.detail==='string'?j.detail:m}catch(_){}if(r.status===401)sessaoExpirada();throw new Error(m)}
  const rd=r.body.getReader(),dec=new TextDecoder();let buf='';
  for(;;){const{value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
    while((i=buf.indexOf('\n\n'))>=0){const bl=buf.slice(0,i);buf=buf.slice(i+2);let ev='message',data='';
      for(const l of bl.split('\n')){if(l.startsWith('event: '))ev=l.slice(7);else if(l.startsWith('data: '))data+=l.slice(6)}
      if(data)aoEvento(ev,JSON.parse(data))}}}

async function preparaAnexo(f){if(f.size>12*1024*1024)throw new Error('Anexo grande demais (máx. 12 MB)');
  if(f.type==='application/pdf'){const b=new Uint8Array(await f.arrayBuffer());let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode(...b.subarray(i,i+32768));return{nome:f.name,tipo:f.type,dados:btoa(s)}}
  if(!/^image\//.test(f.type))throw new Error('Use imagem (PNG, JPEG, WebP) ou PDF');
  const img=await new Promise((ok,ko)=>{const i=new Image(),u=URL.createObjectURL(f);i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>ko(new Error('Imagem ilegível'));i.src=u});
  const k=Math.min(1,2000/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);
  return{nome:f.name,tipo:'image/jpeg',dados:c.toDataURL('image/jpeg',.86).split(',')[1]}}

const DICAS={desenhar:'Descreva o que desenhar. Ex.: “pórtico com 3 pilares HEA 300 a cada 6 m, vigas IPE 300 e cotas” ou “fluxograma P&ID de um tanque com bomba e malha de nível”. Anexe um croqui para ele seguir.',
  revisar:'Peça uma revisão do desenho aberto. Ex.: “revise para emissão: cotas faltando, textos sobrepostos, TAGs repetidas” — ou “complete as cotas que faltam” para receber também o script de correção.',
  extrair:'Peça listas tiradas do desenho. Ex.: “lista de materiais por perfil com comprimentos”, “lista de instrumentos”, “lista de cabos e régua de bornes”.'};
const PH={desenhar:'O que desenhar?',revisar:'O que revisar? (deixe em branco para uma revisão geral)',extrair:'Que listas extrair?'};
dlgAI=function(){
  const nSel=SEL.size,nObj=doc.ents.filter(visible).length;
  modal('Assistente IA',`<div class="pl-seg" id="iaModo" role="tablist" style="width:max-content;max-width:100%;margin-bottom:8px">${[['desenhar','Desenhar'],['revisar','Revisar desenho'],['extrair','Extrair listas']].map(([k,n])=>`<button data-m="${k}" aria-selected="${IA.modo===k}">${n}</button>`).join('')}</div>
    <p class="small" id="iaDica" style="margin:0 0 6px"></p>
    <textarea class="code" id="iaPed" style="min-height:96px"></textarea>
    <div class="pl-actions" style="margin-top:6px;align-items:center">
      <label class="chk"><input type="checkbox" id="iaCtx" ${nObj?'checked':''} ${nObj?'':'disabled'}> Enviar o desenho atual (${nObj} objeto${nObj===1?'':'s'})</label>
      ${nSel?`<label class="chk"><input type="checkbox" id="iaSel"> Só a seleção (${nSel})</label>`:''}
      <button class="tb" id="iaAnx" type="button">Anexar croqui, foto ou PDF</button><span class="small" id="iaAnxN"></span>
    </div><div id="iaOut" style="margin-top:10px"></div>`,
    [{label:'Fechar',fn:()=>{if(IA.ctrl)IA.ctrl.abort()}},{label:'Gerar',primary:true,keep:true,fn:()=>gerarIA()}]);
  $('#mdlB').onclick=null;
  const pinta=()=>{$$('#iaModo button').forEach(b=>b.setAttribute('aria-selected',b.dataset.m===IA.modo));$('#iaDica').textContent=DICAS[IA.modo];$('#iaPed').placeholder=PH[IA.modo];$('#iaPed').value=IA.pedidos[IA.modo]||'';
    if(IA.modo!=='desenhar'&&$('#iaCtx')&&!$('#iaCtx').disabled)$('#iaCtx').checked=true};
  $('#iaModo').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;IA.pedidos[IA.modo]=$('#iaPed').value;IA.modo=b.dataset.m;pinta()};
  $('#iaAnx').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='image/png,image/jpeg,image/webp,application/pdf';
    i.onchange=async()=>{const f=i.files[0];if(!f)return;try{IA.anexo=await preparaAnexo(f);$('#iaAnxN').innerHTML=`${esc(f.name)} <button class="tb" id="iaAnxX" style="min-height:22px;padding:1px 6px">remover</button>`;$('#iaAnxX').onclick=()=>{IA.anexo=null;$('#iaAnxN').textContent=''}}catch(e){toast(e.message)}};i.click()};
  if(IA.anexo)$('#iaAnxN').textContent=IA.anexo.nome;
  pinta();setTimeout(()=>$('#iaPed').focus(),60)};

async function gerarIA(){const ped=$('#iaPed').value.trim()||(IA.modo==='revisar'?'Revisão geral para emissão.':'');
  if(ped.length<2){toast('Descreva o pedido primeiro');return}IA.pedidos[IA.modo]=ped;
  if(IA.modo!=='desenhar'&&!($('#iaCtx')&&$('#iaCtx').checked)&&!IA.anexo){toast('Para revisar ou extrair, envie o desenho atual ou um anexo');return}
  const out=$('#iaOut'),ini=Date.now(),btn=[...$$('#mdlF button')].find(b=>b.textContent==='Gerar');if(btn)btn.disabled=true;
  out.innerHTML=`<div class="pl-teste" id="iaProg">Preparando…</div><div class="pl-actions"><button class="tb" id="iaCancel">Cancelar</button></div>`;
  IA.ctrl=new AbortController();$('#iaCancel').onclick=()=>IA.ctrl.abort();
  const ctx=$('#iaCtx')&&$('#iaCtx').checked?contextoDesenho(!!($('#iaSel')&&$('#iaSel').checked)):'(o usuário optou por não enviar o desenho atual)';
  const prog=t=>{const el=$('#iaProg');if(el)el.textContent=t};
  try{let final=null;
    await streamIA({modo:IA.modo,pedido:ped,contexto:ctx,anexo:IA.anexo},(ev,d)=>{
      if(ev==='etapa')prog(`Analisando${IA.anexo?' o anexo e':''} o pedido com ${d.modelo}…`);
      if(ev==='pulso')prog(d.gerando||d.chars?`Escrevendo a resposta… ${d.s} s${d.linhas?` · ~${d.linhas} entradas`:''}`:`Analisando… ${d.s} s (projetos maiores levam de 1 a 3 minutos)`);
      if(ev==='erro')throw new Error(d.detail);if(ev==='final')final=d},IA.ctrl.signal);
    if(!final)throw new Error('A conexão terminou sem resposta — tente de novo');mostraIA(final)}
  catch(e){if(!$('#iaOut'))return;out.innerHTML=e.name==='AbortError'?'<p class="small">Cancelado.</p>':`<p class="pl-err">Não foi possível: ${esc(e.message)}</p>`}
  finally{IA.ctrl=null;if(btn)btn.disabled=false}}

function csv(t){const q=v=>/[;"\n]/.test(v)?`"${String(v).replace(/"/g,'""')}"`:String(v);return '﻿'+[t.colunas,...t.linhas].map(l=>l.map(q).join(';')).join('\r\n')}
function tabelaScript(t){// desenha a tabela à direita do desenho, com textos na escala das cotas
  const sc=doc.dim.scale||50,h=2.5*sc,lh=h*2,pad=h*.6,b=doc.ents.length?extents():{x1:0,y1:0},x0=Math.round(b.x1+15*sc),y0=Math.round(b.y1);
  const cols=t.colunas.map((c,i)=>Math.max(String(c).length,...t.linhas.map(l=>String(l[i]??'').length))*h*.75+2*pad);
  const W=cols.reduce((a,b)=>a+b,0),nl=t.linhas.length+1,H=lh*(nl+1),L=['CLAYER',doc.layers.some(l=>l.name==='A-ANNO')?'A-ANNO':doc.clayer];
  const r=v=>Math.round(v);L.push('RECTANG',`${x0},${y0}`,`${r(x0+W)},${r(y0-H)}`);
  for(let i=1;i<=nl;i++)L.push('LINE',`${x0},${r(y0-lh*i)}`,`${r(x0+W)},${r(y0-lh*i)}`,'');
  let x=x0;for(const w of cols.slice(0,-1)){x+=w;L.push('LINE',`${r(x)},${r(y0-lh)}`,`${r(x)},${r(y0-H)}`,'')}
  L.push('TEXT','J','ML',`${r(x0+pad)},${r(y0-lh/2)}`,String(r(h*1.2)),'0',t.titulo);
  [t.colunas,...t.linhas].forEach((lin,j)=>{let cx=x0;lin.forEach((v,i)=>{if(String(v??'').trim())L.push('TEXT','J','ML',`${r(cx+pad)},${r(y0-lh*(j+1)-lh/2)}`,String(r(h)),'0',String(v).replace(/\n/g,' '));cx+=cols[i]})});
  L.push('ZE');return L}
function mostraIA(r){const out=$('#iaOut');if(!out)return;const G={alta:'dg',media:'ac',baixa:''};
  out.innerHTML=`<p style="margin:0 0 6px"><b>${esc(r.resumo||'')}</b> <span class="small">${esc(r._modelo||'')} · ${+r._s||0} s</span></p>
    ${r.achados.length?`<div class="ph">Achados (${r.achados.length})</div><div class="flist">${r.achados.map(a=>`<div><span><span class="pl-badge ${G[a.gravidade]}">${esc(a.gravidade)}</span> ${esc(a.item)}<br><small class="small">${esc(a.onde)}</small></span></div>`).join('')}</div>`:''}
    ${r.tabelas.map((t,i)=>`<div class="ph">${esc(t.titulo)} <span class="small">(${t.linhas.length} linha${t.linhas.length===1?'':'s'})</span></div>
      <div class="pl-scroll" style="max-height:260px"><table class="pl-tbl"><thead><tr>${t.colunas.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.linhas.map(l=>`<tr>${l.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="pl-actions" style="margin-top:6px">${can('exportar')?`<button class="tb" data-csv="${i}">Baixar CSV</button>`:''}<button class="tb" data-tab="${i}">Inserir no desenho</button></div>`).join('')}
    ${r.linhas.length?`<div class="ph">Script (${r.linhas.length} entradas) — revise antes de executar</div><textarea class="code" id="iaScr" style="min-height:140px">${esc(r.linhas.map(String).join('\n'))}</textarea>
      <div class="pl-actions" style="margin-top:6px"><button class="tb primary" id="iaRun">Executar no desenho</button><span class="small">Roda como se você digitasse; Ctrl+Z desfaz comando a comando.</span></div>`:''}
    ${r.observacoes.length?`<div class="ph">Observações e premissas</div><ul class="small" style="margin:0;padding-left:18px;line-height:1.6">${r.observacoes.map(o=>`<li>${esc(o)}</li>`).join('')}</ul>`:''}`;
  out.onclick=e=>{const c=e.target.closest('[data-csv]'),t=e.target.closest('[data-tab]');
    if(c){const tb=r.tabelas[+c.dataset.csv];download(tb.titulo.replace(/[^\w\-]+/g,'_').slice(0,60)+'.csv',csv(tb),'text/csv;charset=utf-8')}
    if(t){const L=tabelaScript(r.tabelas[+t.dataset.tab]);closeModal();runScript(L,8,()=>toast('Tabela inserida'))}};
  if($('#iaRun'))$('#iaRun').onclick=()=>{const L=$('#iaScr').value.replace(/\r/g,'').split('\n');closeModal();runScript(L,25,()=>{zoomExt();toast('Proposta da IA aplicada')})}}

/* ---------------- configurações ---------------- */
const ABAS=[['perfil','Perfil e avatar','user'],['seguranca','Senha e sessões','lock'],['prefs','Preferências','sliders'],
  ['usuarios','Usuários e permissões','users','usuarios'],['ia','Assistente IA','spark','usuarios'],['auditoria','Registro de acessos','list','auditoria'],['sobre','Sobre','info']];
function abreCfg(aba){if(aba)S.cfgAba=aba;$('#plMenu').hidden=true;$('#plCfg').hidden=false;
  $('#plCfgWho').textContent=`${S.me.nome} · ${papelNome(S.me.papel)}${S.me.master?' (master)':''}`;
  $('#plCfgNav').innerHTML=ABAS.filter(a=>!a[3]||can(a[3])).map(([k,n,i])=>`<button role="tab" data-c="${k}" aria-selected="${S.cfgAba===k}">${ico(i)}${n}</button>`).join('');
  ({perfil:cfgPerfil,seguranca:cfgSeg,prefs:cfgPrefs,usuarios:cfgUsuarios,ia:cfgIA,auditoria:cfgAud,sobre:cfgSobre})[S.cfgAba]();$('#plCfgBody').scrollTop=0}
$('#plCfgNav').onclick=e=>{const b=e.target.closest('[data-c]');if(b)abreCfg(b.dataset.c)};
const corpo=h=>{$('#plCfgBody').innerHTML=h};

function cfgPerfil(){const u=S.me,P=u.perms;
  corpo(`<h2>Perfil e avatar</h2><p class="small">Seu nome e sua foto aparecem no menu da conta, nos desenhos compartilhados e no registro de acessos.</p>
  <div class="pl-box"><div class="pl-prof">${av(u,'lg')}<div class="pl-prof-t"><b>${esc(u.nome)}</b><span class="small">${esc(u.login)}</span>
    <div class="pl-actions"><button class="tb primary" id="plAvUp">${u.temAvatar?'Trocar foto':'Enviar foto'}</button>${u.temAvatar?'<button class="tb" id="plAvDel">Remover foto</button>':''}</div>
    <p class="small" style="margin:6px 0 0">PNG, JPEG ou WebP. Você enquadra a foto antes de salvar.</p></div></div></div>
  <div class="pl-box"><div class="pl-row"><span>Nome</span><input class="pl-in" id="plPfNome" value="${esc(u.nome)}" maxlength="120"></div>
    <div class="pl-row"><span>Cargo / função</span><input class="pl-in" id="plPfCargo" value="${esc(u.cargo||'')}" maxlength="120" placeholder="Ex.: Projetista mecânico"></div>
    <div class="pl-row"><span>E-mail (login)</span><input class="pl-in" value="${esc(u.login)}" readonly></div>
    <div class="pl-actions"><button class="tb primary" id="plPfSave">Salvar perfil</button><span class="pl-ok" id="plPfOk"></span></div></div>
  <div class="pl-box"><div class="pl-row"><span>Papel</span><div><span class="pl-badge ac">${esc(papelNome(u.papel))}</span>${u.master?' <span class="pl-badge dg">administrador master</span>':''}</div></div>
    <div class="pl-row" style="align-items:start"><span>Suas permissões</span><div class="pl-chips">${Object.entries(P).map(([k,n])=>`<span class="pl-chip${u.permissoesEfetivas.includes(k)?'':' off'}">${esc(n)}</span>`).join('')}</div></div>
    <p class="small">Papel e permissões são definidos por um administrador.</p></div>`);
  $('#plAvUp').onclick=()=>{const i=$('#plAvatarIn');i.dataset.uid='';i.click()};
  if($('#plAvDel'))$('#plAvDel').onclick=async()=>{try{setMe(await api('DELETE','/api/perfil/avatar'));pintaConta();cfgPerfil()}catch(e){toast(e.message)}};
  $('#plPfSave').onclick=async()=>{try{setMe(await api('PATCH','/api/perfil',{nome:$('#plPfNome').value.trim(),cargo:$('#plPfCargo').value}));pintaConta();$('#plPfOk').textContent='Perfil salvo';$('#plCfgWho').textContent=`${S.me.nome} · ${papelNome(S.me.papel)}`}catch(e){toast(e.message)}}}

/* avatar: enquadrar (arrastar + zoom) e reduzir a 256×256 no próprio navegador */
$('#plAvatarIn').onchange=e=>{const f=e.target.files[0],uid=e.target.dataset.uid;e.target.value='';if(!f)return;
  if(!/^image\/(png|jpeg|webp)$/.test(f.type)){toast('Use uma imagem PNG, JPEG ou WebP');return}
  const img=new Image(),url=URL.createObjectURL(f);img.onload=()=>enquadra(img,uid,()=>URL.revokeObjectURL(url));img.onerror=()=>{toast('Não foi possível ler a imagem');URL.revokeObjectURL(url)};img.src=url};
function enquadra(img,uid,fim){const T=240;let z=1,ox=0,oy=0;const base=T/Math.min(img.width,img.height);
  dlg('Enquadrar foto',`<div style="display:flex;flex-direction:column;align-items:center;gap:10px"><canvas id="plCrop" width="${T}" height="${T}" style="border-radius:50%;touch-action:none;cursor:grab;background:var(--panel2);width:${T}px;height:${T}px"></canvas>
    <label class="small" style="display:flex;gap:8px;align-items:center;width:${T}px">Zoom<input id="plCropZ" type="range" min="1" max="4" step="0.01" value="1" style="flex:1;accent-color:var(--accent)"></label><p class="small" style="margin:0">Arraste a foto para enquadrar o rosto.</p></div>`,
    [{label:'Cancelar',fn:()=>fim()},{label:'Salvar foto',primary:true,keep:true,fn:async()=>{
      const o=document.createElement('canvas');o.width=o.height=256;desenha(o.getContext('2d'),256);
      let d=o.toDataURL('image/webp',.86);if(!d.startsWith('data:image/webp'))d=o.toDataURL('image/jpeg',.88);
      try{if(uid){await api('PUT',`/api/usuarios/${uid}/avatar`,{dataUrl:d});cfgUsuarios()}else{setMe(await api('PUT','/api/perfil/avatar',{dataUrl:d}));pintaConta();cfgPerfil()}closeModal();toast('Foto atualizada');fim()}catch(e){toast(e.message)}}}]);
  const cv=$('#plCrop'),g=cv.getContext('2d');
  const lim=()=>{const s=base*z,w=img.width*s,h=img.height*s;ox=Math.min(0,Math.max(T-w,ox));oy=Math.min(0,Math.max(T-h,oy))};
  function desenha(ctx,N){const k=N/T,s=base*z*k;ctx.clearRect(0,0,N,N);ctx.drawImage(img,ox*k,oy*k,img.width*s,img.height*s)}
  const centra=()=>{const s=base*z;ox=(T-img.width*s)/2;oy=(T-img.height*s)/2};centra();desenha(g,T);
  $('#plCropZ').oninput=e=>{const cx=T/2-ox,cy=T/2-oy,z0=z;z=+e.target.value;ox=T/2-cx*z/z0;oy=T/2-cy*z/z0;lim();desenha(g,T)};
  let p=null;cv.onpointerdown=e=>{p={x:e.clientX,y:e.clientY,ox,oy};cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing'};
  cv.onpointermove=e=>{if(!p)return;ox=p.ox+e.clientX-p.x;oy=p.oy+e.clientY-p.y;lim();desenha(g,T)};
  cv.onpointerup=cv.onpointercancel=()=>{p=null;cv.style.cursor='grab'}}

async function cfgSeg(){corpo(`<h2>Senha e sessões</h2><p class="small">Ao trocar a senha, as outras sessões abertas são encerradas.</p>
  <div class="pl-box"><form id="plSgF" autocomplete="on"><input type="email" autocomplete="username" value="${esc(S.me.login)}" hidden>
    <div class="pl-row"><span>Senha atual</span><input class="pl-in" type="password" id="plSgA" autocomplete="current-password" required></div>
    <div class="pl-row"><span>Nova senha</span><input class="pl-in" type="password" id="plSgN" autocomplete="new-password" required minlength="10"></div>
    <div class="pl-row"><span>Repita a nova</span><input class="pl-in" type="password" id="plSgN2" autocomplete="new-password" required minlength="10"></div>
    <p class="small">Mínimo de 10 caracteres, com maiúsculas, minúsculas e ao menos um número.</p>
    <div class="pl-actions"><button class="tb primary" type="submit">Trocar senha</button><span class="pl-err" id="plSgE"></span><span class="pl-ok" id="plSgOk"></span></div></form></div>
  <h3>Sessões ativas</h3><div id="plSgS" class="pl-scroll"><p class="small" style="padding:10px">Carregando…</p></div>
  <div class="pl-actions"><button class="tb" id="plSgX">Encerrar as outras sessões</button></div>`);
  $('#plSgF').onsubmit=async e=>{e.preventDefault();$('#plSgE').textContent='';$('#plSgOk').textContent='';if($('#plSgN').value!==$('#plSgN2').value){$('#plSgE').textContent='As senhas novas não conferem';return}
    try{setMe(await api('POST','/api/auth/senha',{atual:$('#plSgA').value,nova:$('#plSgN').value}));e.target.reset();$('#plSgOk').textContent='Senha alterada';sessoes()}catch(err){$('#plSgE').textContent=err.message}};
  $('#plSgX').onclick=async()=>{try{const r=await api('DELETE','/api/auth/sessoes');toast(`${r.encerradas} sessão(ões) encerrada(s)`);sessoes()}catch(e){toast(e.message)}};
  sessoes()}
async function sessoes(){try{const s=(await api('GET','/api/auth/sessoes')).sessoes;
  $('#plSgS').innerHTML=`<table class="pl-tbl"><thead><tr><th>Aparelho</th><th>IP</th><th class="pl-hide-sm">Entrou</th><th>Último uso</th></tr></thead><tbody>${s.map(x=>`<tr><td>${esc(navegador(x.ua))}${x.atual?' <span class="pl-badge ok">esta</span>':''}</td><td class="mono">${esc(x.ip||'')}</td><td class="pl-hide-sm">${dataHora(x.criadoEm)}</td><td>${quando(x.ultimoUso)}</td></tr>`).join('')}</tbody></table>`}catch(e){$('#plSgS').innerHTML=`<p class="pl-err" style="padding:10px">${esc(e.message)}</p>`}}

function cfgPrefs(){const p=S.me.prefs,tema=p.tema||'sistema',am=+(p.autoMin||0);
  corpo(`<h2>Preferências</h2><p class="small">Ficam na sua conta e acompanham você em qualquer aparelho.</p>
  <div class="pl-box"><div class="pl-row"><span>Tema</span><div class="pl-seg" id="plPrT" style="width:max-content">${[['sistema','Do sistema'],['claro','Claro'],['escuro','Escuro']].map(([k,n])=>`<button data-t="${k}" aria-selected="${tema===k}">${n}</button>`).join('')}</div></div>
    <div class="pl-row"><span>Ao entrar</span><label class="chk"><input type="checkbox" id="plPrU" ${p.abrirUltimo!==false?'checked':''}> Reabrir o último desenho em aparelho novo</label></div>
    <div class="pl-row"><span>Salvar sozinho</span><select class="pl-in" id="plPrA" style="max-width:260px">${[[0,'Desligado (só Ctrl+S)'],[1,'A cada 1 minuto'],[2,'A cada 2 minutos'],[5,'A cada 5 minutos'],[10,'A cada 10 minutos']].map(([v,n])=>`<option value="${v}"${am===v?' selected':''}>${n}</option>`).join('')}</select></div>
    <p class="small">O salvamento automático grava uma nova versão no servidor quando há alterações num desenho já salvo e você não está no meio de um comando.</p></div>
  <div class="pl-box"><div class="pl-row"><span>Desenho</span><div><button class="tb" id="plPrD">Snaps, grade, cotas e paredes…</button></div></div>
    <p class="small">As configurações de desenho também são guardadas na sua conta.</p></div>`);
  $('#plPrT').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;aplicaTema(b.dataset.t);salvaPrefs({tema:b.dataset.t});$$('#plPrT button').forEach(x=>x.setAttribute('aria-selected',x===b))};
  $('#plPrU').onchange=e=>salvaPrefs({abrirUltimo:e.target.checked});
  $('#plPrA').onchange=e=>{salvaPrefs({autoMin:+e.target.value});agendaAuto();toast(+e.target.value?'Salvamento automático ligado':'Salvamento automático desligado')};
  $('#plPrD').onclick=()=>{$('#plCfg').hidden=true;dlgSettings()}}

async function cfgUsuarios(){corpo(`<h2>Usuários e permissões</h2><p class="small">O papel define as permissões padrão; você pode ajustar permissão por permissão em cada usuário. O administrador master não pode ser rebaixado nem desativado.</p>
  <div class="pl-actions" style="margin:0 0 12px"><button class="tb primary" id="plUsNew">Novo usuário</button><input class="pl-search" id="plUsQ" type="search" placeholder="Buscar nome ou e-mail"></div>
  <div class="pl-scroll" id="plUsT"><p class="small" style="padding:10px">Carregando…</p></div>
  <h3>Papéis</h3><div class="pl-scroll"><table class="pl-tbl"><thead><tr><th>Permissão</th>${Object.keys(S.me.papeis).map(p=>`<th>${esc(papelNome(p))}</th>`).join('')}</tr></thead><tbody>
  ${Object.entries(S.me.perms).map(([k,n])=>`<tr><td>${esc(n)}</td>${Object.values(S.me.papeis).map(l=>`<td>${l.includes(k)?'●':'<span class="small">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
  $('#plUsNew').onclick=()=>dlgUsuario(null);
  let us=[];try{us=(await api('GET','/api/usuarios')).usuarios}catch(e){$('#plUsT').innerHTML=`<p class="pl-err" style="padding:10px">${esc(e.message)}</p>`;return}
  const pinta=()=>{const q=($('#plUsQ').value||'').toLowerCase(),L=us.filter(u=>!q||u.nome.toLowerCase().includes(q)||u.login.includes(q));
    $('#plUsT').innerHTML=`<table class="pl-tbl"><thead><tr><th>Usuário</th><th>Papel</th><th>Situação</th><th class="pl-hide-sm">Desenhos</th><th class="pl-hide-sm">Último acesso</th></tr></thead><tbody>${L.map(u=>{
      const bl=u.bloqueadoAte&&new Date(u.bloqueadoAte)>new Date();
      return `<tr class="cl" data-u="${u.id}"><td><div class="pl-who">${av(u,'md')}<div><b>${esc(u.nome)}${u.id===S.me.id?' <span class="small">(você)</span>':''}</b><small>${esc(u.login)}${u.cargo?' · '+esc(u.cargo):''}</small></div></div></td>
      <td><span class="pl-badge ${u.papel==='ADMIN'?'ac':''}">${esc(papelNome(u.papel))}</span>${u.master?' <span class="pl-badge dg">master</span>':''}${u.permissoes?' <span class="pl-badge sel" title="Permissões ajustadas">personalizado</span>':''}</td>
      <td>${!u.ativo?'<span class="pl-badge">inativo</span>':bl?'<span class="pl-badge dg">bloqueado</span>':u.trocarSenha?'<span class="pl-badge sel">aguardando 1º acesso</span>':'<span class="pl-badge ok">ativo</span>'}</td>
      <td class="pl-hide-sm mono">${u.desenhos}</td><td class="pl-hide-sm">${quando(u.ultimoLogin)}</td></tr>`}).join('')}</tbody></table>`};
  pinta();$('#plUsQ').oninput=pinta;$('#plUsT').onclick=e=>{const r=e.target.closest('[data-u]');if(r)dlgUsuario(us.find(u=>u.id===+r.dataset.u))}}

function dlgUsuario(u){const novo=!u,P=S.me.perms,PD=S.me.papeis,m=u&&u.master;
  const efetivas=u?u.permissoesEfetivas:PD.PROJETISTA;
  dlg(novo?'Novo usuário':'Usuário — '+u.nome,`${novo?'':`<div class="pl-who" style="margin-bottom:10px">${av(u,'lg')}<div><b>${esc(u.nome)}</b><small>${esc(u.login)}</small><small>criado ${dataHora(u.criadoEm)} · ${u.sessoes} sessão(ões) ativa(s)</small><div class="pl-actions" style="margin-top:6px"><button class="tb" id="plUAv">Trocar foto</button></div></div></div>`}
    <div class="field"><label>E-mail</label><input id="plUL" type="email" value="${esc(u?u.login:'')}" ${novo?'':'readonly'} placeholder="nome@empresa.com.br"></div>
    <div class="field"><label>Nome</label><input id="plUN" value="${esc(u?u.nome:'')}" maxlength="120"></div>
    <div class="field"><label>Cargo</label><input id="plUC" value="${esc(u&&u.cargo||'')}" maxlength="120"></div>
    <div class="field"><label>Papel</label><select id="plUP" ${m?'disabled':''}>${Object.keys(PD).map(p=>`<option value="${p}"${(u?u.papel:'PROJETISTA')===p?' selected':''}>${esc(papelNome(p))}</option>`).join('')}</select></div>
    ${novo?'':`<div class="field"><label>Situação</label><label class="chk"><input type="checkbox" id="plUA" ${u.ativo?'checked':''} ${m||u.id===S.me.id?'disabled':''}> Ativo (pode entrar)</label></div>`}
    <div class="ph">Permissões</div>
    <label class="chk"><input type="checkbox" id="plUPad" ${!u||!u.permissoes?'checked':''} ${m?'disabled':''}> Usar as permissões padrão do papel</label>
    <div class="pl-perm" id="plUPerm">${Object.entries(P).map(([k,n])=>`<label><input type="checkbox" data-p="${k}" ${efetivas.includes(k)?'checked':''}> ${esc(n)}</label>`).join('')}</div>
    <div class="pl-err" id="plUE" style="margin-top:8px"></div>`,
    [...(novo?[]:[{label:'Redefinir senha',keep:true,fn:()=>{askConfirm(`Gerar uma senha temporária para ${u.nome}? As sessões dele(a) serão encerradas.`,async()=>{try{const r=await api('POST',`/api/usuarios/${u.id}/senha`,{});mostraSenha(u.login,r.senhaTemporaria)}catch(e){toast(e.message)}},'Gerar senha')}},
      ...(u.bloqueadoAte&&new Date(u.bloqueadoAte)>new Date()?[{label:'Desbloquear',keep:true,fn:async()=>{try{await api('POST',`/api/usuarios/${u.id}/desbloquear`,{});toast('Desbloqueado');closeModal();cfgUsuarios()}catch(e){toast(e.message)}}}]:[]),
      ...(u.sessoes&&u.id!==S.me.id?[{label:'Encerrar sessões',keep:true,fn:async()=>{try{const r=await api('POST',`/api/usuarios/${u.id}/sessoes/encerrar`,{});toast(`${r.encerradas} sessão(ões) encerrada(s)`);closeModal();cfgUsuarios()}catch(e){toast(e.message)}}}]:[])]),
     {label:'Cancelar',fn:()=>{}},{label:novo?'Criar usuário':'Salvar',primary:true,keep:true,fn:async()=>{
      const pad=$('#plUPad').checked,perms=$$('#plUPerm [data-p]').filter(c=>c.checked).map(c=>c.dataset.p);
      const b={nome:$('#plUN').value.trim(),cargo:$('#plUC').value.trim(),papel:$('#plUP').value};
      try{if(novo){const r=await api('POST','/api/usuarios',{...b,login:$('#plUL').value.trim(),permissoes:pad?null:perms});mostraSenha(r.usuario.login,r.senhaTemporaria,true)}
        else{const me=u.id===S.me.id;await api('PATCH',`/api/usuarios/${u.id}`,{...b,ativo:$('#plUA').checked,usarPadrao:pad,permissoes:pad?null:perms});closeModal();toast('Usuário salvo');
          if(me){setMe(await api('GET','/api/auth/me'));pintaConta();aplicaPermissoes()}cfgUsuarios()}}
      catch(e){$('#plUE').textContent=e.message}}}]);
  const syncPad=()=>{const pad=$('#plUPad').checked;$$('#plUPerm input').forEach(c=>{c.disabled=pad||m;if(pad)c.checked=PD[$('#plUP').value].includes(c.dataset.p)})};
  $('#plUPad').onchange=syncPad;$('#plUP').onchange=syncPad;syncPad();
  if($('#plUAv'))$('#plUAv').onclick=()=>{closeModal();const i=$('#plAvatarIn');i.dataset.uid=u.id;i.click()}}
function mostraSenha(login,senha,novo){dlg(novo?'Usuário criado':'Senha temporária',`<p style="margin-top:0">Envie ao usuário por um canal seguro. Ela vale para um único acesso: no primeiro login, ele(a) define a própria senha.</p>
  <div class="field"><label>Endereço</label><input readonly value="${esc(location.origin)}"></div><div class="field"><label>E-mail</label><input readonly value="${esc(login)}"></div>
  <div class="ph">Senha temporária</div><div class="pl-secret">${esc(senha)}</div><p class="small">Esta senha não será mostrada de novo.</p>`,
  [{label:'Copiar acesso',keep:true,fn:()=>{navigator.clipboard&&navigator.clipboard.writeText(`GPlanSiS|Drawings\n${location.origin}\nE-mail: ${login}\nSenha temporária: ${senha}`).then(()=>toast('Copiado'),()=>toast('Não foi possível copiar'))}},{label:'Concluir',primary:true,fn:()=>{if(S.cfgAba==='usuarios')cfgUsuarios()}}])}

async function cfgIA(){corpo(`<h2>Assistente IA</h2><p class="small">O assistente transforma uma descrição (“estúdio de 6 × 5 m com banheiro…”) num script de comandos que o usuário revisa antes de executar. Ele usa a API da Anthropic com a chave da sua organização — crie uma em console.anthropic.com › API Keys.</p>
  <div class="pl-box" id="plIaSt"><p class="small">Carregando…</p></div>
  <div class="pl-box"><form id="plIaF" autocomplete="off">
    <div class="pl-row"><span>Chave da API</span><input class="pl-in pl-key" id="plIaK" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-api03-…"></div>
    <div class="pl-row"><span>Modelo</span><select class="pl-in" id="plIaM"></select></div>
    <div class="pl-row"><span>Situação</span><label class="chk"><input type="checkbox" id="plIaA"> Assistente ligado para quem tem a permissão “Usar o Assistente IA”</label></div>
    <p class="small">A chave fica cifrada no banco do servidor e nunca volta para o navegador — aqui aparecem só os 4 últimos caracteres. Deixe o campo em branco para manter a chave atual.</p>
    <div class="pl-actions"><button class="tb primary" type="submit">Salvar</button><button class="tb" type="button" id="plIaT">Testar conexão</button><button class="tb" type="button" id="plIaX" hidden>Remover chave</button><span class="pl-err" id="plIaE"></span></div>
    <div class="pl-teste" id="plIaR"></div></form></div>
  <div class="pl-box" id="plIaCota"><p class="small">Carregando o uso do mês…</p></div>`);
  cotaIA();
  let c;try{c=await api('GET','/api/admin/ia')}catch(e){$('#plIaSt').innerHTML=`<p class="pl-err">${esc(e.message)}</p>`;return}
  const pinta=c=>{$('#plIaSt').innerHTML=`<div class="pl-row"><span>Situação</span><div>${c.pronta?'<span class="pl-badge ok">ligado</span>':c.configurada?'<span class="pl-badge">desligado</span>':'<span class="pl-badge dg">sem chave</span>'}</div></div>
    <div class="pl-row"><span>Chave</span><div class="pl-key">${c.final?'sk-ant-…'+esc(c.final):'—'} <span class="small">${c.origem==='painel'?'(definida neste painel)':c.origem==='env'?'(do arquivo .env do servidor)':''}</span></div></div>
    <div class="pl-row"><span>Modelo</span><div class="pl-key">${esc(c.modelo)}</div></div>
    ${c.atualizadoEm?`<div class="pl-row"><span>Alterado</span><div class="small">${dataHora(c.atualizadoEm)} por ${esc(c.atualizadoPor||'')}</div></div>`:''}
    ${c.cifragem?'':'<p class="pl-err">O servidor está sem DRAWINGS_SEGREDO no .env: não é possível guardar uma chave por aqui.</p>'}`;
    const ids=new Set(c.modelos.map(m=>m.id));$('#plIaM').innerHTML=c.modelos.map(m=>`<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join('')+(ids.has(c.modelo)?'':`<option value="${esc(c.modelo)}">${esc(c.modelo)}</option>`);
    $('#plIaM').value=c.modelo;$('#plIaA').checked=c.ativo;$('#plIaX').hidden=c.origem!=='painel'};
  pinta(c);
  $('#plIaT').onclick=async()=>{const b=$('#plIaT');b.disabled=true;$('#plIaR').textContent='Testando…';$('#plIaE').textContent='';
    try{const r=await api('POST','/api/admin/ia/testar',{chave:$('#plIaK').value.trim()||null,modelo:$('#plIaM').value});
      if(r.modelos&&r.modelos.length){const atual=$('#plIaM').value,tem=new Set([...$('#plIaM').options].map(o=>o.value));for(const m of r.modelos)if(!tem.has(m))$('#plIaM').insertAdjacentHTML('beforeend',`<option value="${esc(m)}">${esc(m)}</option>`);$('#plIaM').value=atual}
      $('#plIaR').innerHTML=r.ok?`<span class="pl-ok">Conexão funcionando.</span> ${esc(r.modelo)} respondeu “${esc(r.resposta)}” em ${(r.ms/1000).toFixed(1).replace('.',',')} s. A chave enxerga ${r.modelos.length} modelo(s).`:`<span class="pl-err">${esc(r.erro)}</span>`}
    catch(e){$('#plIaR').innerHTML=`<span class="pl-err">${esc(e.message)}</span>`}finally{b.disabled=false}};
  $('#plIaF').onsubmit=async e=>{e.preventDefault();$('#plIaE').textContent='';
    try{const c2=await api('PUT','/api/admin/ia',{chave:$('#plIaK').value.trim()||null,modelo:$('#plIaM').value,ativo:$('#plIaA').checked});$('#plIaK').value='';pinta(c2);
      setMe(await api('GET','/api/auth/me'));toast(c2.pronta?'Assistente IA ligado':'Configuração salva — assistente desligado')}catch(err){$('#plIaE').textContent=err.message}};
  $('#plIaX').onclick=()=>askConfirm('Remover a chave da Anthropic guardada neste painel? O assistente para de funcionar (a não ser que haja chave no .env do servidor).',async()=>{
    try{pinta(await api('DELETE','/api/admin/ia/chave'));setMe(await api('GET','/api/auth/me'));toast('Chave removida')}catch(e){toast(e.message)}},'Remover chave')}

async function cotaIA(){const box=$('#plIaCota');let d;try{d=await api('GET','/api/admin/ia/uso')}catch(e){box.innerHTML=`<p class="pl-err">${esc(e.message)}</p>`;return}
  const us=n=>'US$ '+Number(n).toFixed(2).replace('.',',');
  box.innerHTML=`<h3>Cota mensal de IA</h3><p class="small">Cada chamada é contabilizada pelos tokens reais. Ao atingir a cota do mês, a pessoa recebe um aviso e o assistente para até o mês virar ou a cota ser ampliada. Campo da pessoa em branco = cota padrão.</p>
    <form id="plCotaF" class="pl-row"><span>Cota padrão (US$/mês)</span><div><input class="pl-in" id="plCotaP" type="number" min="0" max="10000" step="0.5" value="${d.cotaPadraoUsd}" style="max-width:9em"> <button class="tb" type="submit">Salvar</button></div></form>
    <div class="pl-scroll"><table class="pl-tbl"><thead><tr><th>Pessoa</th><th>Chamadas</th><th>Gasto no mês</th><th>Cota própria (US$)</th></tr></thead><tbody>${d.usuarios.map(x=>`<tr><td>${esc(x.nome)}<div class="small">${esc(x.login)}</div></td><td>${x.chamadas}</td><td>${us(x.gastoUsd)} de ${us(x.cotaUsd)}</td>
      <td><input class="pl-in" data-cota="${x.id}" type="number" min="0" max="10000" step="0.5" placeholder="padrão" value="${x.cotaPropria?x.cotaUsd:''}" style="max-width:8em"></td></tr>`).join('')}</tbody></table></div>`;
  $('#plCotaF').onsubmit=async e=>{e.preventDefault();try{await api('PUT','/api/admin/ia/cota',{cotaUsd:Number($('#plCotaP').value)});toast('Cota padrão salva');cotaIA()}catch(err){toast(err.message)}};
  box.querySelectorAll('[data-cota]').forEach(i=>i.onchange=async()=>{const v=i.value.trim();try{await api('PUT','/api/admin/ia/cota/'+i.dataset.cota,{cotaUsd:v===''?null:Number(v)});toast('Cota atualizada');cotaIA()}catch(err){toast(err.message)}})}

const EVT={LOGIN:'Entrou',LOGOUT:'Saiu',LOGIN_FALHA:'Senha errada',LOGIN_BLOQUEADO:'Bloqueado',SENHA_ALTERADA:'Trocou a senha',SENHA_REDEFINIDA:'Senha redefinida',USUARIO_CRIADO:'Usuário criado',USUARIO_ALTERADO:'Usuário alterado',
  USUARIO_DESBLOQUEADO:'Desbloqueio',SESSOES_ENCERRADAS:'Sessões encerradas',PERFIL_ALTERADO:'Perfil alterado',DESENHO_CRIADO:'Desenho criado',DESENHO_SOBRESCRITO:'Desenho sobrescrito',DESENHO_DUPLICADO:'Desenho duplicado',
  DESENHO_NA_LIXEIRA:'Para a lixeira',DESENHO_RESTAURADO:'Restaurado',DESENHO_EXCLUIDO_DEFINITIVO:'Excluído de vez',DESENHO_COMPARTILHADO:'Compartilhado',IA:'Assistente IA',ADMIN_CLI:'Admin pela linha de comando',IA_CONFIGURADA:'IA configurada',IA_COTA:'Cota de IA alterada',IA_CHAVE_REMOVIDA:'Chave da IA removida',DWG_CONVERTIDO:'DWG convertido'};
async function cfgAud(ev){corpo(`<h2>Registro de acessos</h2><p class="small">Entradas, falhas de senha, mudanças de usuários e operações em desenhos. Os 300 eventos mais recentes.</p>
  <div class="pl-actions" style="margin:0 0 12px"><select class="pl-in" id="plAuE" style="max-width:260px"><option value="">Todos os eventos</option>${Object.entries(EVT).map(([k,n])=>`<option value="${k}"${ev===k?' selected':''}>${n}</option>`).join('')}</select><button class="tb" id="plAuR">Atualizar</button></div>
  <div class="pl-scroll" id="plAuT"><p class="small" style="padding:10px">Carregando…</p></div>`);
  $('#plAuE').onchange=e=>cfgAud(e.target.value);$('#plAuR').onclick=()=>cfgAud($('#plAuE').value);
  try{const r=(await api('GET','/api/auditoria?limite=300'+(ev?'&evento='+encodeURIComponent(ev):''))).eventos;
    $('#plAuT').innerHTML=r.length?`<table class="pl-tbl"><thead><tr><th>Quando</th><th>Usuário</th><th>Evento</th><th class="pl-hide-sm">IP</th><th>Detalhe</th></tr></thead><tbody>${r.map(x=>`<tr><td class="mono" style="white-space:nowrap">${dataHora(x.ts)}</td><td>${esc(x.login||'—')}</td><td><span class="pl-badge ${/FALHA|BLOQ|DEFINITIVO/.test(x.evento)?'dg':''}">${esc(EVT[x.evento]||x.evento)}</span></td><td class="pl-hide-sm mono">${esc(x.ip||'')}</td><td class="small">${esc(x.detalhe||'')}</td></tr>`).join('')}</tbody></table>`:'<p class="small" style="padding:10px">Nenhum evento.</p>'}
  catch(e){$('#plAuT').innerHTML=`<p class="pl-err" style="padding:10px">${esc(e.message)}</p>`}}

async function cfgSobre(){let s=null;try{s=await api('GET','/api/saude')}catch(_){}
  corpo(`<h2>Sobre</h2><div class="pl-box"><div class="pl-brand" style="font-size:17px"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="6" fill="var(--accent)"/><path d="M8 22V10h7a5 5 0 010 10h-3M18 22l6-12" stroke="var(--accent-ink)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><div><b>GPlanSiS</b><span>|Drawings</span></div></div>
    <p class="small">CAD 2D estilo AutoCAD com construção em 3D. Desenho e edição, cotas, paramétrico, booleanas, P&amp;ID ISA 5.1, elétrico IEC 60617, geradores mecânicos, plotagem e exportação DXF/SVG/PNG/PDF/IFC4.</p>
    <div class="pl-row"><span>Servidor</span><div>${s&&s.ok?'<span class="pl-badge ok">em operação</span>':'<span class="pl-badge dg">sem resposta</span>'}</div></div>
    <div class="pl-row"><span>Assistente IA</span><div>${s&&s.ia?'<span class="pl-badge ok">ligado</span>':'<span class="pl-badge">desligado ou sem chave</span>'}${can('usuarios')?' <button class="tb" id="plSbIA" style="min-height:24px;padding:2px 8px">Configurar</button>':''}</div></div>
    <div class="pl-row"><span>Leitura de DWG</span><div>${s&&s.dwg?'<span class="pl-badge ok">ativa (LibreDWG)</span>':'<span class="pl-badge">conversor indisponível</span>'} <span class="small">DXF de qualquer versão é lido no navegador.</span></div></div>
    <div class="pl-row"><span>Armazenamento</span><div class="small">Desenhos no servidor (40 versões por desenho, lixeira de 30 dias). Uma cópia de trabalho fica neste navegador para não perder nada se a conexão cair.</div></div>
    <div class="pl-row"><span>Bibliotecas</span><div class="small">three.js (MIT), JSZip (MIT), polygon-clipping (MIT), jsPDF (MIT); no servidor, LibreDWG (GPLv3) para converter DWG</div></div></div>`);
  if($('#plSbIA'))$('#plSbIA').onclick=()=>abreCfg('ia')}

boot();
}

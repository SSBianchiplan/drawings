# GPlanSiS|Drawings

CAD 2D estilo AutoCAD com construção em 3D, num único arquivo HTML. Funciona no navegador do computador, tablet ou celular, sem instalação.

## Arquivos

| Arquivo | Uso |
|---|---|
| `GPlanSiS-Drawings-offline.html` (1,4 MB) | Funciona **sem internet**. three.js, JSZip, polygon-clipping e jsPDF estão embutidos. Recomendado. |
| `GPlanSiS-Drawings-online.html` (0,3 MB) | Mais leve; carrega as bibliotecas por CDN (cdnjs / jsDelivr) na primeira vez que o 3D, ZIP, booleanas ou PDF são usados. |

Para abrir: dê dois cliques no arquivo ou arraste-o para o Chrome, Edge, Safari ou Firefox. Para publicar na intranet, sirva o arquivo em qualquer servidor web estático (nginx, IIS, Traefik); não há backend.

## Demonstrações (botão ▶)

1. **Apartamento 92 m²**: grade, pilares, paredes com isolamento, portas, janelas, mobiliário, cotas, áreas e 3D.
2. **Planta industrial**: P&ID com malha de controle, partida com selo, pórtico de aço, tanque, tubulação, eletrocalha e esteira em 3D.
3. **Eixo de transmissão**: rolamentos 6205, engrenagem, parafusos ISO, cotas, GD&T, rugosidade, solda e folha A3 com viewports.
4. **Chapa paramétrica**: restrições, d2 = d1·0,6, alteração de parâmetro, booleanas e bloco com atributos.
5. **Partida estrela-triângulo**: esquema IEC, intertravamento, temporizador, bornes, E/S de CLP, fios numerados e lista de componentes.
6. **Galpão com pipe rack**: paredes, estrutura HEA/IPE, três linhas de tubo, eletrocalha, equipamentos e 3D.

Esc interrompe a demonstração; Ctrl+Z desfaz passo a passo.

## Uso rápido

- Linha de comando aceita os atalhos do AutoCAD (`L`, `PL`, `C`, `TR`, `O`, `F`, `M`, `CO`, `DLI`…). Digite `AJUDA` para a lista completa.
- Coordenadas: `x,y` absoluto · `@dx,dy` relativo · `@dist<ângulo` polar · número sozinho = distância na direção do cursor.
- Teclas: F3 osnap · F7 grade · F8 orto · F9 snap · F10 polar · F11 rastreamento · F12 entrada dinâmica · Enter vazio repete o último comando.
- Celular: arraste com um dedo para selecionar ou mover a mira (ela fica acima do dedo); dois dedos fazem zoom e pan.
- Unidade de trabalho: milímetro. Símbolos de P&ID e elétrico estão dimensionados para folha 1:50.

## Módulos

- **Desenho e edição**: linha, polilinha, retângulo, círculo, arco, elipse, polígono, spline, construção, parede, hachura com detecção de contorno, texto; mover, copiar, girar, escala, espelhar, offset, aparar, estender, concordar, chanfro, matriz, esticar, explodir, unir, quebrar, pincel, alças (grips).
- **Anotação e consulta**: cotas linear, alinhada, raio, diâmetro, angular, contínua e de base, chamada, ambientes com área, distância, área, listagem.
- **Paramétrico**: restrições horizontal, vertical, paralela, perpendicular, coincidente, fixa, igual; cotas paramétricas com expressões; gerenciador de parâmetros.
- **Avançado**: booleanas (união, subtração, interseção, XOR), atributos de bloco com extração CSV, GD&T e datums, tolerâncias de cota, imagem com vetorização, folhas com viewports, exportação IFC4.
- **Industrial**: P&ID ISA 5.1, elétrico IEC 60617, geradores mecânicos (parafusos ISO 4017, rolamentos 60/62/63, perfis IPE/HEA/W/UPN/L/RHS/CHS, engrenagens evolventes, solda, rugosidade), tubulação DN15–DN300, eletrocalha, tanques, esteiras e equipamentos em 3D; listas de equipamentos, instrumentos, linhas, fios, aço e materiais.

## Arquivos e saída

- **Salvar**: guarda no armazenamento do navegador (por aparelho). Para levar a outro computador, use Exportar → JSON e depois Importar.
- **Exportar**: DXF R12 (em ZIP), SVG, PNG, JSON e IFC4 (em ZIP).
- **Importar**: DXF (linhas, arcos, círculos, polilinhas, textos, elipses, blocos) e JSON do próprio sistema.
- **Plotar**: A4 a A0, escala ou ajuste, monocromático, carimbo, viewports; saída em SVG vetorial, PNG 200 dpi ou PDF (imagem de alta resolução).

## Limitações conhecidas

- DXF somente no formato R12; DWG não é lido nem gravado.
- PDF da plotagem é raster; para vetor, use o SVG.
- Restrições paramétricas valem para linhas, paredes, círculos e arcos (não para vértices de polilinha).
- Tubulação 3D em trechos horizontais numa mesma elevação, com descida opcional nas pontas.
- O assistente de IA (✦) funciona apenas quando o arquivo é aberto pelo link publicado no Claude.
- Imagens anexadas ficam dentro do desenho e podem esgotar o armazenamento do navegador; nesse caso, exporte em JSON.

Licenças das bibliotecas embutidas: three.js (MIT), JSZip (MIT/GPLv3, usado sob MIT), polygon-clipping (MIT), jsPDF (MIT).

---

## Versão servidor — https://drawings.gplansis.com

O mesmo CAD, com login, desenhos guardados no servidor e permissões por usuário.

| Pasta | Conteúdo |
|---|---|
| `web/` | `index.html` + `cad.js`/`cad.css` (o CAD, extraído do arquivo online) + `plataforma.js`/`plataforma.css` (login, desenhos, configurações) + `vendor/` (three.js r128, JSZip 3.10.1, jsPDF 2.5.1, polygon-clipping 0.15.7 servidos pelo próprio domínio) |
| `server/` | API FastAPI + PostgreSQL (`app.py`, `schema.sql`) |
| `deploy/` | `publicar.sh` (rodar no Mac), `instalar.remoto.sh`, unidade systemd e bloco Caddy |

- **Publicar**: `DRAWINGS_HOST=<servidor> DRAWINGS_MASTER=<e-mail> bash deploy/publicar.sh` (servidor → `/opt/drawings`, serviço `drawings`, porta 127.0.0.1:8930, banco `drawings`, Caddy `/etc/caddy/drawings.caddy`). Mantém os 5 últimos backups do pacote.
- **Administrador master**: o e-mail definido em `DRAWINGS_MASTER` (não pode ser rebaixado, desativado nem perder permissões). Nova senha temporária, se precisar: `cd /opt/drawings/server && sudo -u drawings /opt/drawings/.venv/bin/python app.py criar-admin admin@exemplo.com --nome "Administrador"`.
- **Papéis**: Administrador, Projetista, Revisor, Consulta — com ajuste permissão por permissão (desenhar, excluir, compartilhar, importar, exportar, plotar, IA, auditoria, usuários).
- **Desenhos**: Ctrl+S salva no servidor; 40 versões por desenho; conflito de versão quando duas pessoas editam; lixeira de 30 dias; compartilhamento com a equipe ou por usuário (ver / editar).
- **Configurações** (menu do avatar): perfil com foto (enquadrar e salvar), senha e sessões, preferências (tema, salvamento automático, reabrir o último desenho), usuários e permissões, registro de acessos.
- **Arquivos CAD**: DWG (convertido no servidor pelo LibreDWG 0.14 em `/opt/libredwg`) e DXF de qualquer versão ASCII (lido no navegador por `web/cadimport.js`). Arcos de polilinha, splines/NURBS, elipses parciais, hachuras (inclusive arestas curvas), sólidos, matrizes de blocos, atributos, cotas, extrusão invertida, acentos (UTF-8 e páginas de código ANSI) e unidades ($INSUNITS → mm). Entradas: Arquivo › Importar (abrir como novo ou inserir no atual), arrastar e soltar na tela, ou Desenhos › Importar CAD (vários arquivos direto para a biblioteca). Não lê: sólidos 3D/ACIS, malhas, imagens raster, OLE e MLEADER; DXF binário.
- **Exportação**: DXF AutoCAD 2018 (gerado no servidor com ezdxf a partir de `web/cadexport.js`: blocos, hachuras, polilinhas, MTEXT e camadas nativos; cotas e paredes como blocos anônimos), DWG AutoCAD 2000 em beta (LibreDWG `dxf2dwg`) e DXF R12 para compatibilidade máxima. Tipos especiais (tubulação, GD&T) saem simplificados em linhas e arcos.
- **PDF vetorial** na plotagem (`vendor/svg2pdf.umd.min.js` + jsPDF): linhas e textos continuam vetores; se a conversão falhar, sai em imagem com aviso.
- **Assistente IA (modos)**: Desenhar, Revisar desenho e Extrair listas, com o desenho atual (ou só a seleção) e as listas exatas do CAD (`indLists`) como contexto, anexo de croqui/foto/PDF, saída estruturada (`server/assistente.py`) e progresso em streaming (`/api/ia/assistente`, SSE; o Caddy não comprime essa rota). Tabelas viram CSV ou são desenhadas na folha.
- **Assistente IA**: um administrador cola a chave da Anthropic em Configurações › Assistente IA (testa a conexão, escolhe o modelo, liga/desliga). A chave fica cifrada no banco com `DRAWINGS_SEGREDO` (gerado no `.env` pela instalação) e nunca volta ao navegador. `ANTHROPIC_API_KEY` no `.env` continua valendo como reserva. Modelo padrão: `claude-opus-5-5`, com fallback automático do servidor em caso de recusa.
- Exportar/plotar são bloqueados na interface conforme a permissão; como o desenho é aberto no navegador, isso não impede quem tem leitura de copiar o conteúdo por outros meios.

## Aplicativo instalável (PWA) e celular

- **Instalar**: no Chrome/Edge do computador, ícone "Instalar" na barra de endereço; no Android, menu ⋮ › Instalar app; no iPhone (Safari), Compartilhar › Adicionar à Tela de Início. Abre em janela própria, com o ícone do Drawings.
- **Arquivos**: `web/manifest.webmanifest` (nome, cores `#15181b`, `start_url`/`scope` `/`), `web/icones/` (192, 512, 512 maskable e apple-touch 180, gerados do `icon.svg`), `web/sw.js` (service worker), `web/pwa.js` (registra o SW; sem script inline, por causa da CSP) e `web/celular.css` (ajustes de tela pequena).
- **Service worker**: guarda só o app shell. HTML pela rede primeiro (cópia em cache para abrir sem internet; sem rede o app abre e avisa "Servidor indisponível"); JS/CSS/ícones/vendor cache primeiro. `/api/*` e qualquer requisição que não seja GET nunca passam pelo SW. `VERSION` = carimbo do `publicar.sh` (o mesmo `?v=` do `index.html`); a cada publicação o cache novo substitui o antigo no `activate`.
- **Caddy**: `drawings.caddy` define `Content-Type: application/manifest+json` para o manifesto (o Caddy não conhece `.webmanifest`).
- **Celular**: em pé, a barra superior rola na horizontal (avatar sempre visível); deitado, rótulos somem, ferramentas viram só ícones e linha de comando e barra de estado ficam lado a lado. Tocar de novo na aba atual da faixa recolhe/abre as ferramentas. Alvos de toque ≥ 40 px, campos com 16 px (sem zoom no iPhone), safe-area para entalhe. Dois dedos: zoom e pan (já existia).

## Integração com o GPlanSiS|Docs

- **Botões**: "Docs" na barra superior do Drawings abre o Docs já logado (área *Drawings*); no Docs, "Drawings" no topo e "No Drawings" em cada folha abrem o Drawings já logado, no desenho certo (`#d<id>`). Entrada única por código assinado (HMAC, 2 min, uso único); o usuário precisa existir com o mesmo e-mail nos dois sistemas.
- **Enviar ao Docs** (Arquivo › Enviar ao GPlanSiS|Docs, comando `ENVIARDOCS`): 1º envio cria o documento tipo Desenho no projeto escolhido (numerado pela máscara do Docs); depois, reenvia na revisão aberta (substitui só os arquivos que o Drawings mandou) ou abre a próxima revisão. Vão PDF vetorial (com código e revisão no carimbo), DXF 2018 e o JSON nativo; opcionalmente já inicia o fluxo de verificação com os responsáveis.
- **Volta do Docs**: o Docs grava eventos (gatilhos em `revision` e `revision_comment`, tabela `integracao_evento`) e o worker entrega a cada 10 s em `POST /api/integracao/docs/evento`, assinado. O Drawings mostra o selo (código · revisão · situação · comentários), o painel de revisões e os comentários como nuvens de revisão sobre o desenho.
- **Área separada no Docs**: menu *Drawings* lista só os documentos com `metadata.origem = 'drawings'` (tag `drawings`).
- **Configuração**: o mesmo segredo em `/opt/drawings/.env` (`DRAWINGS_DOCS_SEGREDO`) e `/opt/gplansis-docs/.env` (`INTEGRACAO_DRAWINGS_SEGREDO`). As chamadas do Drawings ao Docs usam `x-integracao` + `x-em-nome-de` (e-mail): valem os papéis do usuário no projeto do Docs e a auditoria registra a pessoa.

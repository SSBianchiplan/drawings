# Como contribuir com o GPlanSiS|Drawings

Obrigado pelo interesse! Este guia mostra como propor mudanças sem atrito.

## Antes de começar

- Procure nas [issues](https://github.com/SSBianchiplan/drawings/issues) se o assunto já existe.
- Para mudanças grandes (novo módulo, mudança no formato do desenho, nova rota da API), abra uma issue **antes** do código e descreva a ideia.
- Falhas de segurança **não** vão em issue pública: veja [SECURITY.md](SECURITY.md).
- Ao participar você concorda com o [Código de Conduta](CODE_OF_CONDUCT.md).
- A licença do projeto ainda está **a definir pela GPlanSiS**. Ao enviar um pull request, você concorda que a sua contribuição poderá ser distribuída sob a licença que vier a ser adotada.

## Ambiente de desenvolvimento

Siga [Como rodar localmente](README.md#como-rodar-localmente). Em resumo:

```bash
python3 -m venv .venv && .venv/bin/pip install -r server/requirements.txt
export DRAWINGS_DSN="postgresql://postgres@127.0.0.1:5432/drawings" DRAWINGS_COOKIE_SEGURO=0 DRAWINGS_MASTER=admin@exemplo.com
cd server && ../.venv/bin/python app.py criar-admin admin@exemplo.com
../.venv/bin/uvicorn dev_local:app --port 8930 --reload
```

O front não tem etapa de build: edite os arquivos em `web/` e recarregue a página (Ctrl+Shift+R; o service worker guarda o app shell — em caso de dúvida, use uma janela anônima).

## Onde fica cada coisa

| Quero mexer em… | Arquivo |
|---|---|
| Comandos, ferramentas, cotas, industrial, 3D, plotagem | `web/cad.js` (comandos registrados com `defCmd`) |
| Leitura de DXF | `web/cadimport.js` |
| Exportação DXF (lado do navegador) | `web/cadexport.js` → `server/exporta.py` (ezdxf) |
| Login, biblioteca de desenhos, configurações, IA, Docs | `web/plataforma.js` / `web/plataforma.css` |
| Tela pequena | `web/celular.css` |
| API, permissões, auditoria | `server/app.py` |
| Banco | `server/schema.sql` (idempotente: `create … if not exists`, `alter … add column if not exists`) |
| Assistente IA | `server/assistente.py` |

## Regras do código

- **Português do Brasil** na interface, nas mensagens e nos comentários.
- **Unidade em milímetro**; símbolos P&ID e elétricos dimensionados para folha 1:50.
- **Sem dependências novas sem conversa**. Bibliotecas de front vão em `web/vendor/`, servidas pelo próprio domínio (a CSP proíbe CDN e script inline).
- **Servidor é a autoridade**: toda rota que muda dados checa a permissão do usuário, passa pelo filtro CSRF (cabeçalho `x-drawings: 1`) e registra na auditoria quando faz sentido.
- **Esquema compatível**: `schema.sql` roda a cada partida; mudanças precisam ser idempotentes e não podem apagar dados.
- **Nada de segredos** no código. Configuração por variável de ambiente (documente em `.env.example` e no README).
- Mudanças pequenas e focadas: um assunto por pull request.

## Verificações antes do pull request

```bash
node --check web/cad.js && node --check web/plataforma.js && node --check web/sw.js && node --check web/pwa.js
python3 -c "import ast; ast.parse(open('server/app.py').read())"
python3 -c "import json; json.load(open('web/manifest.webmanifest'))"
```

E no navegador:

1. Rode as seis demonstrações (▶ Demonstrações) até o fim.
2. Salve, reabra e veja as versões de um desenho.
3. Se mexeu em importação/exportação, exporte um DXF e reabra-o.
4. Se mexeu na interface, teste no tema claro e escuro e em largura de celular.

## Pull request

1. Faça um fork e crie um ramo a partir de `main` (`correcao/…`, `recurso/…`, `docs/…`).
2. Commits com mensagens claras em português.
3. Preencha o modelo de pull request e anexe capturas se houver mudança visual.
4. Não inclua desenhos de clientes, e-mails pessoais ou dados reais em código, testes ou capturas.

## Boas primeiras contribuições

Veja a seção [Contribua](README.md#contribua) do README e as issues marcadas como `boa primeira issue`.

Dúvidas: abra uma issue do tipo *Pergunta* ou escreva para contato@gplansis.com.

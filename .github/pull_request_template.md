## O que muda

<!-- Descreva a mudança em poucas linhas. -->

Fecha #

## Tipo

- [ ] Correção de bug
- [ ] Novo comando / ferramenta
- [ ] Importação / exportação (DXF, DWG, SVG, PDF, IFC)
- [ ] Melhoria de interface / acessibilidade / celular
- [ ] Documentação
- [ ] Infraestrutura / implantação

## Como testei

<!-- Demonstração usada, navegador, tema claro/escuro, celular, arquivo DXF de teste etc. -->

## Checklist

- [ ] `node --check` passa em `web/cad.js`, `web/plataforma.js`, `web/sw.js` e `web/pwa.js`
- [ ] Testei no navegador com `server/dev_local.py` (e em largura de celular, se mexi na interface)
- [ ] As seis demonstrações continuam rodando até o fim
- [ ] Rotas novas na API checam permissão, exigem o cabeçalho `x-drawings` e registram auditoria
- [ ] Nada de script inline nem CDN no `web/` (a CSP é `script-src 'self'`)
- [ ] Sem segredos, e-mails pessoais, desenhos de clientes ou dados reais no código ou nas capturas
- [ ] Atualizei o README / `docs/guia.md` quando necessário

## Capturas de tela (se houver mudança visual)

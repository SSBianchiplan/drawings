# Política de segurança

## Versões com suporte

| Versão | Suporte |
|---|---|
| A que está em https://drawings.gplansis.com (ramo `main`) | Sim |
| Cópias antigas do arquivo único (`standalone/`) | Somente a mais recente |

## Como relatar uma vulnerabilidade

**Não abra issue pública para falhas de segurança.**

Escreva para **contato@gplansis.com** com o assunto `[SEGURANÇA] GPlanSiS|Drawings` e inclua:

- descrição da falha e do impacto;
- passos para reproduzir (ou prova de conceito);
- navegador e ambiente onde foi observada;
- se quiser, como prefere ser creditado.

Se preferir, use também o recurso *Report a vulnerability* (aviso privado) do GitHub neste repositório.

Responderemos confirmando o recebimento assim que possível, combinaremos o prazo de correção e avisaremos quando a correção estiver publicada. Pedimos que a divulgação pública espere a correção.

## Escopo

- O código deste repositório (servidor `server/`, front-end `web/`, arquivo único `standalone/`, scripts de implantação `deploy/`).
- Pontos de atenção especial: autenticação e sessões, permissões por desenho, envio de arquivos DWG/DXF (conversão no servidor), proxy do assistente IA e integração assinada com o GPlanSiS|Docs.
- A instância em https://drawings.gplansis.com: teste apenas com a sua própria conta, sem acessar desenhos de terceiros, sem negação de serviço e sem engenharia social.

## Boas práticas para quem instala

- Use HTTPS e mantenha `DRAWINGS_COOKIE_SEGURO=1`.
- Mantenha o bloco Caddy com a CSP e os cabeçalhos de `deploy/drawings.caddy`.
- Guarde o `.env` com permissão restrita (`640`, dono root, grupo do serviço) e o `DRAWINGS_SEGREDO` junto com os backups do banco — sem ele, a chave da IA guardada pelo painel precisa ser recolada.
- Rode a API como usuário sem privilégios e só no loopback (`127.0.0.1`), como em `deploy/drawings.service`.
- Mantenha o LibreDWG atualizado: ele processa arquivos enviados pelos usuários.
- Troque a senha temporária do administrador no primeiro acesso (o sistema exige).

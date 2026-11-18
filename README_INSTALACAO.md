# Alfa Group - Preparacao Cloudflare Workers

A branch `cloudflare-preview` e apenas para testes. A branch `main` continua com o site do GitHub Pages.

## Ficheiros
- `public/index.html`: copia fiel do HTML de `site-alfagroup (1).zip`, incluindo fontes, chines e formulario
- `public/favicon.svg`: icone original
- `public/apple-touch-icon.png`: icone original
- `src/index.js`: endpoint de formulario em `/contact` e `/contact.php`, sem PHP
- `wrangler.jsonc`: configuracao Worker + Static Assets e Email Service
- `tests/worker-test.mjs`: testes locais do endpoint

O `public/favicon.ico` esta incluido no pacote ZIP de implementacao, mas ainda nao foi enviado como ficheiro independente ao GitHub. O HTML tem icones SVG e PNG incorporados, que funcionam sem este ficheiro.

## Configuracao na Cloudflare
1. Confirmar que o dominio `alfagroup.pt` esta ativo na conta Cloudflare.
2. Em Workers & Pages, criar um Worker com integracao ao GitHub, selecionando `nunopardal-design/alfagroup-website` e a branch `cloudflare-preview`. O comando para publicar e `npx wrangler deploy`.
3. Validar o suporte Cloudflare Email Service em Compute > Email Service > Email Sending; associar o dominio para envio, sem substituir o MX do dominio principal.
4. Criar os segredos `TO_EMAIL` e `FROM_EMAIL` nas definicoes privadas do Worker; nunca colocar os valores no HTML nem no GitHub. O remetente tem de pertencer a `@alfagroup.pt`.
5. Validar o binding `EMAIL` e os limites de envio, testar o formulario num dominio temporario `*.workers.dev`.
6. Confirmar a chegada da mensagem ao destinatario e ao spam; sucesso JSON nao comprova entrega.
7. Testar acesso real a partir de Shenzhen.
8. So depois associar o dominio final e rever os registos A/CNAME antigos; preservar MX, SPF, DKIM, DMARC e outros servicos.

Nao publicar `contact.php`: GitHub Pages e Cloudflare Workers nao executam PHP.
Nao ativar Email Routing para o dominio principal sem validar impacto no MX existente.

## Seguranca e privacidade
O formulario e enviado apenas para o mesmo dominio. O endpoint verifica origem, tamanho, formato, campos, honeypot, intervalo de tempo e taxa de pedidos. Mensagens e destinatarios nao sao escritos em logs da aplicacao.

## Documentacao
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/

# Zellu Worker

Backend Cloudflare Workers do Zellu. Ele gerencia a assinatura recorrente do Zellu Premium, valida o login Firebase, recebe webhooks do Mercado Pago e mantém as notificações push.

## Infraestrutura criada

- Worker: `https://zellu-worker.encontretecnologia2.workers.dev`
- D1: `zellu-payments`
- KV: `SUBSCRIPTIONS` e `REMINDERS`
- Preço atual: `R$ 29,90/mês`, em `wrangler.jsonc`

## Finalizar a integração do Mercado Pago

1. Entre em **Mercado Pago Developers > Suas integrações** e crie uma aplicação para pagamentos on-line.
2. Ative as credenciais de produção e copie o **Access Token**.
3. No terminal desta pasta, execute:

   ```bash
   npx wrangler secret put MP_ACCESS_TOKEN
   ```

   Cole o token somente no prompt do Wrangler. Ele não deve entrar em `.env`, Git, print ou conversa.

4. Nas notificações/webhooks da aplicação, cadastre:

   ```text
   https://zellu-worker.encontretecnologia2.workers.dev/payments/webhook
   ```

5. Selecione eventos de **assinaturas/preapproval**, copie a assinatura secreta do webhook e execute:

   ```bash
   npx wrangler secret put MP_WEBHOOK_SECRET
   ```

6. Confirme `APP_URL` em `wrangler.jsonc`. Essa é a URL pública do app para a qual o checkout retorna.
7. Publique novamente:

   ```bash
   npm run deploy
   ```

## Notificações push

Gere as chaves:

```bash
npm run vapid
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

Copie a chave pública para `VITE_VAPID_PUBLIC_KEY` no `.env` do frontend. A chave privada fica apenas no Worker.

## Banco e validação

```bash
npm install
npm run types
npm run db:migrate:remote
npm run deploy:check
npm run deploy
```

## Endpoints

| Método | Rota | Função |
|---|---|---|
| POST | `/payments/checkout` | Cria ou reutiliza o checkout mensal |
| POST | `/payments/ebooks/checkout` | Cria checkout único do pacote de e-books |
| GET | `/payments/ebooks/status` | Retorna se o pacote de e-books já foi comprado |
| GET | `/payments/subscription` | Retorna o plano confirmado no D1 |
| POST | `/payments/cancel` | Cancela a recorrência |
| POST | `/payments/webhook` | Confirma mudanças enviadas pelo Mercado Pago |
| GET | `/vapid-public-key` | Retorna a chave pública de push |
| POST/DELETE | `/subscribe` | Gerencia a inscrição push |
| POST | `/reminder` | Sincroniza um lembrete |
| DELETE | `/reminder/:id` | Remove um lembrete sincronizado |

## Segurança

- O frontend nunca recebe o Access Token do Mercado Pago.
- O Premium só é ativado depois do webhook assinado e da consulta à API do Mercado Pago.
- O Firebase ID Token identifica o usuário nas rotas privadas.
- O D1 é a fonte de verdade da assinatura; a URL de retorno não libera o plano sozinha.
- Eventos de webhook são idempotentes e não são processados duas vezes.

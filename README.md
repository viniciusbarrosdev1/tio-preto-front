# Tio Preto - protótipo do front

Protótipo clicável da Barbearia Tio Preto (React + TypeScript + Vite + Tailwind). Todo o dado é mock e fica no `localStorage` do navegador. Não há back.

## Rodar

```bash
npm install
npm run dev
```

Outros comandos: `npm run build`, `npm run lint`.

## O que tem

- **Cliente:** cardápio (`#/`), pedido de horário com consentimento LGPD (`#/agendar`), acompanhamento, cancelamento e remarcação pelo link (`#/pedido/:token`).
- **Dono** (`#/admin`, usuário `tio`, senha `preto123`): pedidos (aprovar, recusar, propor outro horário), agenda por dia com bloqueio de horário e cadastro manual, cardápio (criar, editar, ocultar, remover, foto), horário padrão, exceções e aviso do dia, clientes com faltas e bloqueio de número. Botões de WhatsApp com mensagem pronta.

## Contrato

`contrato/openapi.yaml` é a fonte única do contrato da API (v0). `contrato/fixtures/*.json` alimentam o mock. `src/lib/api.ts` imita o contrato: mesmos estados do pedido, mesmos códigos de erro, mesma regra de horário livre.

Apostas a validar com o Tio Preto:

- Pedido pendente não segura o horário. Aprovar um segundo pedido no mesmo horário dá `SLOT_UNAVAILABLE`.
- O prazo de cancelamento é lido na hora do acesso ao link.
- Ao remarcar, o horário antigo continua confirmado até o dono aprovar o novo.

## Limites do protótipo

- Os dados vivem só neste navegador. "Resetar dados" no painel volta ao início.
- Login e proteção de rota são simulados. O real fica no back.
- O logo é um wordmark provisório, até chegar o arquivo do cliente.

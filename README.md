# Tio Preto - protótipo do front

Protótipo clicável da Barbearia Tio Preto (React + TypeScript + Vite + Tailwind + Motion).
Todo o dado é mock e fica no `localStorage` do navegador. Não há back.

## Rodar

```bash
npm install
npm run dev
```

Outros comandos: `npm run build`, `npm run lint`.

## O que tem

**Cliente**

- Cardápio (`#/`): serviços e produtos separados, foto por item (toca na foto, vai para a próxima),
  aviso do dia e a linha "agenda aberta para as próximas N semanas".
- Agendar horário (`#/agendar`): escolhe **um** item por tipo (um cabelo, barba, uma sobrancelha),
  vê a duração e o total, escolhe dia e horário, preenche nome e WhatsApp com máscara, lê a regra
  de falta e aceita o uso dos dados (LGPD).
- Seu pedido (`#/pedido/:token`): acompanha, cancela ou remarca, vê as mensagens que foram para o
  WhatsApp e é instruído a tirar um print da página. Se errou o número, tem link para falar no
  WhatsApp com mensagem pronta.
- Número bloqueado não consegue pedir pelo site: cai numa tela que manda falar no WhatsApp,
  com a mensagem já escrita.

**Dono** (`#/admin`, usuário `tio`, senha `preto123`)

- **Pedidos:** aprovar, recusar, propor outro horário, aprovar remarcação. Cada ação dispara a
  mensagem no WhatsApp do cliente pela API; o painel mostra o que foi enviado.
- **Agenda:** dia a dia (30 dias para trás e as semanas abertas para frente), reagendar,
  marcar **atendido** ou **faltou** (só depois da hora), cancelar, bloquear horário, cadastrar
  cliente na mão e um **histórico de 30 dias**.
- **Cardápio:** serviços e produtos em abas separadas (produto não ocupa horário), preço com
  máscara, tipo de serviço, duração e várias fotos por item.
- **Horários:** semanas de agenda aberta, horário padrão com várias faixas, exceção por dia
  (editável, com várias faixas ou fechado), aviso do dia e as regras (prazo de aviso, tamanho do
  horário, teto do atendimento).
- **Clientes:** "horários para ajustar", faltas, bloqueio de número e o botão **Ver** com todo o
  histórico do cliente.

**Mensagens:** quem avisa o cliente é a **API do WhatsApp**, sozinha, a cada mudança do pedido.
O Tio Preto só entra na mão em exceção — número errado, cliente bloqueado, horário derrubado por
mudança de agenda —, e para isso cada tela tem um link discreto com a mensagem pronta.

## Regras de negócio no protótipo

- Um pedido junta vários serviços, **no máximo um por tipo**: um cabelo (cabelo, wold money ou
  visagista), uma barba, uma sobrancelha (navalha ou cera).
- Duração: serviço mais curto que um horário (sobrancelha, 15 min) **encaixa** junto de outro
  serviço sem somar tempo e, sozinho, ocupa um horário inteiro. Os outros somam, o total
  arredonda para cima no tamanho do horário e respeita o teto do atendimento.
  Hoje: cabelo + sobrancelha = 30 min · cabelo + barba + sobrancelha = 1 h · sobrancelha = 30 min ·
  wold money ou visagista, com ou sem barba = 1 h.
- Pedido pendente **não** segura o horário. Confirmado e atendido seguram.
- Prazo de aviso (3 h, mexe no painel): abaixo dele o site avisa que o valor do agendamento é cobrado.
- A agenda abre pela variável de semanas, não por aviso escrito à mão.
- O aviso do dia vale só para o dia em que foi salvo e sai do ar sozinho depois da meia-noite.
- Mudar horário padrão ou exceção de um dia com gente marcada **cancela** esses horários e joga
  para "horários para ajustar", na aba Clientes, onde o dono avisa, reagenda ou resolve.

## Contrato

`contrato/openapi.yaml` é a fonte única do contrato da API (v0). `contrato/fixtures/*.json`
alimentam o mock. `src/lib/api.ts` imita o contrato: mesmos estados do pedido, mesmos códigos de
erro, mesma regra de horário livre e a mesma conta de duração.

`contrato/questionamentos.md` guarda tudo que o protótipo apostou sem confirmação do cliente —
é a pauta da reunião com o Tio Preto.

## Limites do protótipo

- Os dados vivem só neste navegador. "Resetar" no painel volta ao início.
- As mensagens de WhatsApp não saem de verdade: o protótipo registra o texto que a API mandaria,
  na tela do pedido e no painel.
- Login e proteção de rota são simulados. O real fica no back.
- O logo é um wordmark provisório, até chegar o arquivo do cliente.
- Os dois produtos do cardápio são exemplos, para o cliente ver o formato.

# Questionamentos para a reunião com o Tio Preto

Tudo que o protótipo **apostou** sem confirmação dele. Cada item traz o que está no ar agora e
o que muda se a resposta for outra. Levar esta lista para a reunião e marcar o que ficar fechado.

> Regra que a gente combinou: o que não saiu da boca do cliente entra aqui, não vira texto no site.
> (Foi o caso da "toalha quente" na barba, que já saiu do cardápio.)

## 1. Nome e descrição dos serviços

- [ ] **"Wold Money" é isso mesmo?** Nossa aposta é que seja *Old Money* (cabelo grande trabalhado
      na tesoura). Está no ar escrito **Cabelo Wold Money**, como ele passou, com a descrição
      "cabelo grande trabalhado na tesoura". Confirmar nome e descrição — e se muda, muda só o texto.
- [ ] **Barba inclui bigode e acabamento?** Hoje está só "Barba alinhada na navalha".
      Se englobar bigode, a descrição vira "barba e bigode".
- [ ] **Barba tem toalha quente?** Saiu do site por não ter sido confirmado. Se tiver, volta.
- [ ] **Corte Visagista a partir de R$ 250** é o valor certo? O site diz que o valor final é
      combinado no atendimento.
- [ ] **Sobrancelha: navalha e cera são serviços separados mesmo?** Está assim, e o cliente só
      consegue escolher um dos dois (ninguém faz os dois juntos).
- [ ] **Faltou algum serviço no cardápio?** (pezinho, pigmentação, luzes, selagem, infantil...)

## 2. Produtos

- [ ] **Quais produtos ele vende?** O cardápio já tem a aba Produtos separada dos Serviços
      (produto não ocupa horário). Os dois que estão lá — pomada e óleo — são **exemplos**
      para ele ver o formato. Ele cadastra os dele no painel.
- [ ] **Preço de produto também aparece para o cliente?** Hoje aparece, junto do cardápio.

## 3. Fotos

- [ ] **Ele manda as fotos de cada serviço/produto?** O campo já existe: dá para subir várias
      fotos por item e o cliente toca na foto para ver a próxima.
- [ ] **Tem logo em arquivo?** O logo do site ainda é provisório (letra, não imagem).

## 4. Duração e encaixe (a aposta mais arriscada)

Está no ar, e ele consegue mudar tudo isso no painel:

| Serviço | Tempo no site | Ocupa na agenda |
| --- | --- | --- |
| Cabelo | 30 min | 30 min |
| Barba | 30 min | 30 min |
| Sobrancelha (navalha ou cera) | 15 min | 30 min sozinha, **encaixa de graça** junto de outro serviço |
| Cabelo Wold Money | 1 h | 1 h |
| Corte Visagista | 1 h | 1 h |

Combinações: cabelo + sobrancelha = 30 min · cabelo + barba (+ sobrancelha) = 1 h ·
wold money ou visagista, com ou sem barba = 1 h · teto de 1 h por atendimento.

- [ ] **Esses tempos batem com a realidade dele?**
- [ ] **O teto de 1 h por atendimento faz sentido**, ou tem combinação que passa disso?
- [ ] **A grade de 30 em 30 min está boa?** Dá para mudar para 20, 40, 60.
- [ ] **Sobrancelha sozinha:** faz sentido ocupar um horário inteiro de 30 min?

## 5. Agenda aberta

- [ ] **4 semanas abertas está bom?** Virou variável no painel: ele muda e a agenda abre/fecha junto.
      O site mostra "agenda aberta para as próximas N semanas" a partir dela — não é mais aviso escrito à mão.
- [ ] **Horário padrão 09:00–12:00 e 13:00–19:00 está certo?** Dá para ter mais de uma faixa no dia.
- [ ] **Atende sábado? Domingo? Feriado?** Hoje todo dia é dia de trabalho, menos as exceções que ele cadastra.
- [ ] **Último horário:** com a faixa até 19:00, o último horário de 1 h é 18:00 e o de 30 min é 18:30,
      porque o atendimento tem que terminar dentro da faixa. É assim que ele quer?

## 6. Falta, cancelamento e cobrança

- [ ] **Prazo de aviso: 3 horas.** Menos que isso, o site avisa que **o valor do agendamento é cobrado**.
      O número é dele, muda no painel.
- [ ] **Como ele cobra na prática?** O sistema só avisa; a cobrança é por fora (Pix, na próxima visita...).
- [ ] **Cobra o valor cheio ou uma parte?**
- [ ] **Quantas faltas até bloquear o número?** Hoje o bloqueio é manual, decisão dele.
- [ ] **Cliente bloqueado:** o site não aceita o pedido e manda ele falar no WhatsApp com mensagem pronta
      ("tentei agendar tal dia e hora, porém ocorreu um erro"). Ele decide: marca manual, desbloqueia ou cobra.

## 7. WhatsApp

**Fechado:** quem manda as mensagens é a **API do WhatsApp**, sozinha, a cada mudança do pedido
(recebido, confirmado, recusado, outro horário proposto, remarcado, cancelado). O Tio Preto **só
entra em exceção**: número errado, cliente bloqueado, horário derrubado por mudança de agenda.
No painel ele vê o que já foi enviado e um link discreto de "falar no WhatsApp" para esses casos.

- [ ] **Qual número vai ser o oficial da API?** Está `+55 44 99860-3404`. Se for o número pessoal
      dele, atenção: o número que entra na API oficial não roda no WhatsApp comum do celular.
- [ ] **Conta Business + templates aprovados:** mensagem iniciada pela barbearia precisa de modelo
      aprovado pela Meta. Levar os textos do protótipo para aprovar junto.
- [ ] **Custo por mensagem** entra no orçamento de quem? (cada conversa iniciada é cobrada)
- [ ] **O texto das mensagens está do jeito dele?** Hoje: "recebemos seu pedido… em breve
      retornaremos com a confirmação" e "horário confirmado: serviço, dia e hora".
- [ ] **Lembrete na véspera** entra nesse pacote? (custa mensagem a mais)
- [ ] **Quem responde quando o cliente responde a mensagem?** A API avisa, mas quem conversa é ele.

## 8. Mudança de horário com cliente já marcado

Aposta no ar: quando ele muda o horário de um dia que já tem gente marcada, esses horários são
**cancelados automaticamente** e vão para a aba Clientes, em "Horários para ajustar", com o aviso
*"horário cancelado automaticamente por mudança de horário no painel; entre em contato para ajustar"*.
Lá ele avisa no WhatsApp (mensagem pronta), reagenda ou marca como resolvido.

- [ ] **É assim que ele quer?** A alternativa é o sistema travar a mudança enquanto tiver gente marcada.
- [ ] **O cliente recebe mensagem automática nesse caso?**

## 9. Painel e rotina

- [ ] **Histórico de 30 dias basta?** É o que está guardado hoje (atendidos, faltas, cancelados).
- [ ] **O botão "Atendido" ele vai usar?** Libera depois da hora marcada, para ele fechar o dia.
- [ ] **Login:** hoje é `tio` / `preto123` só no protótipo. Definir usuário e senha de verdade.
- [ ] **Mais alguém mexe no painel** (esposa, outro barbeiro)?

## 10. Fora do escopo do protótipo (confirmar se entra)

- [ ] Pagamento ou sinal pelo site.
- [ ] Fila de espera quando o dia lota.
- [ ] Cliente escolher barbeiro (hoje o sistema assume só ele atendendo).
- [ ] Lembrete automático na véspera do horário.

## 11. Tom de voz dos textos

- [ ] **O site fala como a barbearia, em "nós"** — "vamos olhar seu pedido", "confirmamos seu
      pedido", "fale com a gente no WhatsApp". Saiu o "o Tio Preto" em terceira pessoa, que
      soava como se outra pessoa tivesse escrito o site. Confirmar se ele gosta desse tom ou se
      prefere falar na primeira pessoa dele ("eu confirmo", "me chama no WhatsApp").
- [ ] **Mensagens prontas do painel começam com "aqui é da Barbearia Tio Preto"**. Se ele
      preferir "aqui é o Tio Preto", muda só o texto.

# Continuidade do projeto — leia antes de começar

Documento de handoff. Se você é uma IA assumindo este projeto, leia este
arquivo e o `07-Escopo-Planilha.md` antes de alterar qualquer coisa.

## 🔵 Próxima sessão começa por aqui — desenho de navegação em guias

**Commit e backup feitos em 12-08-2026 de propósito**, antes de começar
esta frente nova (commit `22fccf9`, zip
`backup-2026-08-12.zip` na raiz do projeto, ~5,2 MB, código-fonte
sem `node_modules`/`.next`/`dist`/`.git`) — ponto seguro pra voltar
se a mudança abaixo não der certo.

**Pedido do usuário**: reestruturar a navegação do sistema pra abrir
telas em **guias dentro da página** (igual navegador/VS Code), até
**6 guias abertas ao mesmo tempo**, trocando entre elas sem perder o
que tava preenchido. Isso é uma mudança de arquitetura grande — mexe
em como toda tela do sistema abre hoje (hoje é navegação normal do
Next.js, cada rota troca o conteúdo inteiro). **Ainda não foi
implementado nada** — o usuário pediu pra **primeiro montar o
desenho numa sessão nova**, sem mexer em código ainda.

Ideias que o usuário trouxe pra essa conversa de desenho (ainda não
detalhadas, perguntar mais quando retomar):
- No menu de navegação, dois "apps" separados: **SISTEMA ERP** (o que
  já existe) e um **app de "OS"** (provavelmente Ordem de Serviço —
  não foi detalhado, perguntar o que o usuário tem em mente antes de
  desenhar).
- Queria usar como referência visual o portal Infor CloudSuite
  (`mingle-portal.inforcloudsuite.com`) — **não consegui acessar**
  (mandou e-mail/senha de login, e entrar com senha em formulário de
  terceiro é ação que não faço, regra de segurança, não depende de
  autorização). Se ainda quiser essa referência, precisa entrar ele
  mesmo e mandar prints/descrição, ou eu pesquiso material público
  sobre a interface do Infor sem precisar de login.

Perguntas que valem ser feitas antes de desenhar (meu levantamento,
não decidido ainda): o que acontece ao tentar abrir a 7ª guia
(bloqueia ou fecha a mais antiga sozinha); as guias sobrevivem a um
F5 no navegador ou reseta; toda tela do sistema vira guia ou só
alguns módulos (telas de impressão/etiqueta, por exemplo, hoje abrem
fora do `AppShell` de propósito — ficam de fora do esquema de guias?).

---

Atualizado em: 12-08-2026 (**Controle de Ponto evoluído pra calcular
horas normais/extras/compensadas de verdade, comparando contra o
Horário de trabalho do colaborador — com ajuste manual auditado e
tela de Acompanhamento de horas nova. Ver seção logo abaixo, é a
frente mais importante desta sessão**; **"Ponto - Manual" (autoatendimento
— colaborador lança o próprio dia) criada, com vínculo novo
Colaborador↔Usuário**; Benefícios virou submenu próprio, separado de
"Setores, horários e EPI"; sessão anterior:
Frontend do módulo de Produção atualizado pro fluxo de 3 etapas e
tela de Acompanhamento criada; tela de gestão de Exames médicos
criada (RH); ajuste de layout no cadastro de Colaborador; módulo
LABOR iniciado — Controle de Ponto — batidas manual/API/leitor,
código de crachá do colaborador, aprovação por dia, faltas e abonos
—; avisos automáticos por e-mail/WhatsApp em Pedido de Compra,
Orçamento, Pedido de Venda, exame ocupacional e aniversário; som do
login corrigido pra tocar uma vez)

## Controle de Ponto — cálculo de horas normais/extras/compensadas (12-08-2026)

Pedido do usuário (com imagem de referência da planilha antiga —
colunas Início/Intervalo/Fim Intervalo/Fim/Extras/Comp): o Controle
de Ponto passou a **calcular de verdade** as horas do dia, comparando
as batidas reais contra o **Horário de trabalho** cadastrado do
colaborador (antes só somava pares de batidas, sem noção de jornada
esperada). Levou várias rodadas de perguntas pra fechar o desenho —
resumo das decisões tomadas com o usuário:

1. **Só as 4 primeiras batidas do dia entram no cálculo** (Início/
   Início Intervalo/Fim Intervalo/Saída, nessa ordem cronológica) —
   decisão explícita do usuário depois de eu mostrar que o exemplo da
   planilha antiga não usava uma 5ª/6ª batida separada pra hora
   extra: a extra é **sempre calculada** comparando a 4ª batida
   (Saída real) contra o horário de saída cadastrado, nunca uma
   batida própria. **"Início Extra"/"Final Extra" como colunas
   separadas foram descartados** (pedido explícito: "desconsiderar as
   colunas de início e final de extra") — o resultado é só uma coluna
   "Extras" com a duração.
2. **Hora extra, por enquanto, só é calculada e mostrada** (não
   separa em "horas extras" vs "banco de horas" ainda) — quando a
   Folha de Pagamento for feita, aí sim entra uma configuração pra
   decidir o destino. Registrado como decisão consciente, não
   esquecimento.
3. **Horário de trabalho ganhou faixas por dia da semana**: um mesmo
   horário (ex.: "Comercial") pode ter mais de uma faixa (ex.: SEG a
   SEX um horário, SÁBADO outro sem intervalo — confirmado pelo
   usuário com esse exemplo específico). **Se a batida cair num dia
   da semana sem nenhuma faixa cadastrada** (ex.: bateu ponto num
   sábado e não existe faixa de sábado), **todo o tempo trabalhado
   naquele dia vira hora extra** (pedido explícito do usuário).

### O que foi feito

- **Schema novo**: enum `Weekday` (SEGUNDA..DOMINGO); model
  `WorkScheduleShift` (`workScheduleId`, `dayFrom`/`dayTo`,
  `startTime`/`breakStart`/`breakEnd`/`endTime` em `"HH:MM"`,
  `lunchBreakMinutes` — fallback usado no cálculo quando
  início/fim do intervalo não são informados, só a duração); model
  `TimeEntryAdjustment` (auditoria do ajuste manual — antes/depois
  dos 4 horários, justificativa, quem ajustou, quando).
  `TimeEntrySource` ganhou o valor `AJUSTE`. Migration
  `20260811233352_add_work_schedule_shifts_and_time_entry_adjustments`.
- **Cálculo novo** (`Backend/src/modules/time-tracking/utils/time-entry.util.ts`,
  função `calculateDay`): pra cada dia, acha a faixa (`WorkScheduleShift`)
  que cobre o dia da semana da batida.
  - Faixa **com** intervalo cadastrado (`breakStart`/`breakEnd`) → 4
    batidas esperadas, horas normais = (Intervalo Início − Início) +
    (Saída − Intervalo Fim).
  - Faixa **sem** intervalo cadastrado (só Início/Saída, como o
    Sábado do exemplo) → 2 batidas esperadas, horas normais = (Saída
    − Início) − `lunchBreakMinutes` (se preenchido).
  - **Sem faixa pro dia da semana** → todas as batidas do dia somadas
    (pareamento sequencial, mesma lógica antiga) e **tudo vira
    extra** (`expectedMinutes = 0`).
  - `extraMinutes = max(0, trabalhado − esperado)`, `compensatedMinutes
    = max(0, esperado − trabalhado)` (déficit — saiu mais cedo, ou dia
    sem nenhuma batida mas com jornada esperada).
  - **Testado contra o exemplo exato da planilha do usuário**: Início
    08:15/Intervalo 12:00–13:12/Fim 18:50, horário cadastrado até
    18:00 → deu **Extras 00:50:00**, batendo com a imagem.
- **Bug real encontrado e corrigido durante a implementação**: o
  ajuste manual convertia o horário digitado (ex.: "07:30") direto
  pra UTC sem compensar o fuso do Brasil — ia gravar 3h adiantado.
  Corrigido com `brazilTimeToUtcDate` (Brasil não tem horário de
  verão desde 2019, sempre UTC-3). Testado de verdade: ajustei a
  saída pra "17:30" e o banco gravou `20:30:00.000Z` (= 17:30 BR),
  confirmado por API antes de mexer na tela.
- **Ajuste manual** (`PATCH /time-entries/adjust`, permissão
  `time-entry.update` já existente — não criou permissão nova, o
  catálogo já tinha "Alterar/Excluir Batida de Ponto"): botão
  "Ajustar horários" na tela de Ponto abre uma subtela com os 4
  horários (editáveis, pré-preenchidos com o que já foi batido) +
  **justificativa obrigatória**. Salvar registra um
  `TimeEntryAdjustment` (antes/depois + justificativa + quem + quando)
  e **substitui as batidas do dia inteiras** (apaga e recria, fonte
  `AJUSTE`) — só permitido se o dia ainda não foi aprovado (mesma
  regra de sempre). Coluna nova **"Ajustada"** na listagem (Sim/Não);
  clicar em "Sim" abre um modal de consulta mostrando o antes/depois
  registrado.
- **Horários de trabalho ganhou subtela de faixas** — CRUD novo
  aninhado `work-schedules/:id/shifts` (reaproveita a permissão
  `work-schedule.update`, sem permissão nova), com **validação de
  sobreposição** (não deixa cadastrar duas faixas cobrindo o mesmo
  dia da semana). Frontend: o card "Horários de trabalho" dentro de
  `/erp/rh/cadastros` deixou de ser o painel genérico
  (`SimpleCrudPanel`) e virou link pra uma tela própria
  `/erp/rh/cadastros/horarios` — lista os horários (nome/descrição,
  CRUD igual antes) e cada um tem um botão "Configurar horários" que
  abre a subtela com a tabela de faixas (De/Até dia da semana +
  Início/Intervalo Início/Intervalo Fim/Saída/Intervalo em minutos).
- **Tela de Ponto redesenhada** (`/erp/rh/ponto`): a coluna única
  "Batidas" (lista de chips) virou 4 colunas fixas (Início/Int.
  início/Int. fim/Saída) + coluna "Extras" (só a duração) + coluna
  "Ajustada". Link novo "Acompanhamento de horas" no topo.
- **Tela nova "Acompanhamento de horas"**
  (`/erp/rh/ponto/acompanhamento`, menu habilitado, mesma permissão
  `time-entry.view`): filtro por colaborador + mês (seletor nativo),
  junta os dias trabalhados (`GET /time-entries/day-summary`) com
  **Faltas e abonos aprovados do período** (`GET /absence-records`,
  que ganhou filtro `from`/`to` novo) — pedido explícito do usuário
  ("integrar a falta e abono"). Cards de indicador: **Total de horas
  positivas**, **Total de horas compensadas**, **Saldo geral**
  (positivas − compensadas, verde/vermelho). Exportar CSV e
  **Imprimir folha** (layout de assinatura — nome da empresa,
  colaborador, mês, tabela, duas linhas de assinatura no rodapé —
  só habilitado com um colaborador selecionado, não dá pra imprimir
  "todos" numa folha só). **Limitação conhecida, registrada de
  propósito**: falta/abono sem nenhuma batida no dia aparece listada
  (pra visibilidade) mas **não entra no cálculo de "horas
  compensadas"** ainda — só os dias com batida incompleta/precoce
  entram nesse total. Quantificar puxando a jornada esperada de um
  dia 100% sem batida ficou de fora desta rodada por tempo, mas o
  dado (Falta injustificada aprovada, sem batida) já aparece visível
  na lista pro usuário decidir manualmente por enquanto.
- **Testado de verdade, ponta a ponta, via API + tela**: cadastrei a
  faixa SEG-SEX real do horário "Comercial" (07:30–12:00 |
  13:12–17:30, batendo com a descrição livre que já existia) e uma
  faixa de SÁBADO sem intervalo só pra testar (removida depois);
  validei a sobreposição bloqueando faixa duplicada; bati 4 pontos
  de teste reproduzindo o exemplo da planilha (extras = 50 min
  batendo exato); ajustei a saída via API confirmando fuso corrigido,
  auditoria gravada e `hasAdjustment` virando `true`; conferi na tela
  que os 4 horários, "Extras", "Ajustada" (com o modal de consulta
  abrindo o antes/depois certo) e o modal de "Ajustar" (pré-
  preenchido com os horários certos) renderizam certo; aprovei e
  reabri o dia pela tela; conferi a tela de Acompanhamento com os
  indicadores batendo (positivas/compensadas/saldo). **Dados de teste
  revertidos** depois (batidas de teste excluídas, faixa de sábado de
  teste excluída — a faixa SEG-SEX real ficou, é dado de verdade).
- **Pendências conhecidas**: banco de horas (destino extra/compensar)
  ainda não tem UI de configuração — combinado que fica pra quando a
  Folha de Pagamento avançar; falta/abono sem nenhuma batida não
  quantifica horas compensadas ainda (só aparece listada); não testei
  o botão "Exportar CSV"/"Imprimir folha" clicando de verdade na tela
  (só o cálculo e os dados — o download/impressão em si reaproveita
  utilitário já usado em outros relatórios do sistema, `exportCsv` e
  `window.print()`, sem lógica nova arriscada).

## "Ponto - Manual" (autoatendimento) + vínculo Colaborador↔Usuário (12-08-2026)

Pedido do usuário, na sequência do Controle de Ponto: uma tela pro
próprio colaborador lançar o dia inteiro quando esquece de bater
ponto — mesmo layout de campos do "Ajustar horários", mas com **data
editável** e **os 4 horários obrigatórios** (não deixa salvar
faltando algum, diferente do ajuste que aceita campo vazio).

**Decisão em aberto, avisada mas não resolvida**: o usuário queria um
"Superusuário" (definido no cadastro de usuário) que pudesse lançar
**e aprovar** ponto de qualquer colaborador, não só o próprio — ele
ainda está pensando em como fazer isso e disse que dá retorno depois.
**Por enquanto o lançamento manual só aceita o próprio colaborador
logado, sempre** — o endpoint nem aceita `employeeId` no corpo, só
resolve pelo usuário autenticado, de propósito (sem brecha nenhuma
pra lançar em nome de outro até essa decisão ser tomada). Quando o
usuário voltar com a definição de "Superusuário", é só adicionar um
parâmetro opcional de colaborador nesse mesmo endpoint, checando a
permissão nova.

**Achado importante no caminho**: não existe hoje nenhuma tela de
"Cadastro de Usuários" no sistema — só a API (`/api/users`,
`Backend/src/modules/identity/users/`), sem UI nenhuma, sem tela de
atribuir papel/role na criação, botão "Criar conta" do login é só
enfeite (sem `onClick`). O usuário confirmou que isso é um módulo
maior, pendente, "com várias configurações, de como logar, empresa
vinculada e muitas outras" — **decisão explícita: não construir esse
módulo completo agora**, só o mínimo pra destravar o Ponto - Manual
(ver abaixo). Fica registrado como próximo item grande quando o
usuário voltar com a definição do Superusuário.

### O que foi feito

- **Vínculo novo `Employee.userId`** (`@unique`, opcional, FK pra
  `User`) — resolve de vez a pendência antiga do aviso de aniversário
  do usuário logado (que só funcionava batendo e-mail, e o e-mail do
  Alessandro no Colaborador é diferente do e-mail de login — **essa
  pendência específica não foi religada ainda**, só o campo/vínculo
  em si foi criado; ligar o aviso de aniversário a esse campo novo é
  trabalho futuro rápido, não feito nesta sessão). Migration
  `20260812195225_add_employee_user_link_and_self_report_source`
  (mesma migration também adicionou `TimeEntrySource.AUTOLANCAMENTO`).
- **Campo "Usuário do sistema"** no cadastro de Colaborador (aba
  Contratuais, logo abaixo de Status) — `<select>` simples listando
  `GET /users` (novo `frontend/src/services/user.service.ts`, só
  leitura, não é a tela de Usuários). Opcional, "Nenhum (sem login
  vinculado)" por padrão.
- **`GET /employees/me`** (novo, `EmployeesController`) — retorna o
  colaborador vinculado ao usuário logado, **sem exigir a permissão
  `employee.view`** (só autenticação — de propósito, pra qualquer
  colaborador com login conseguir usar o Ponto - Manual mesmo sem
  permissão de RH). 404 com mensagem amigável se não tiver vínculo
  ainda ("peça pro RH vincular no seu cadastro").
- **`POST /time-entries/self-report`** (permissão `time-entry.create`,
  já existente): resolve o colaborador SEMPRE pelo usuário logado
  (`Employee.userId`), nunca por um `employeeId` do corpo da
  requisição. Regras: bloqueia se o dia já foi aprovado; **bloqueia
  se já existir qualquer batida naquele dia** (evita sobrescrever
  batida real — usuário precisa falar com o RH pra corrigir, não dá
  pra "completar" um dia parcial por aqui). Cria as 4 batidas com
  `source: AUTOLANCAMENTO`.
- **Tela `/erp/ponto-manual`** ("Ponto - Manual", menu novo dentro do
  dropdown do avatar — `systemMenuItems`, junto de Licenciamento/
  Configurações/Personalização/WhatsApp, permissão `time-entry.create`,
  módulo `LABOR`): mostra o nome do colaborador vinculado, campo Data
  + 4 horários (todos obrigatórios, valida no front antes de mandar
  pro back), mensagem de sucesso confirmando que entrou pendente de
  aprovação. Sem vínculo ainda, mostra a mensagem de erro do
  `/employees/me` no lugar do formulário (não deixa tentar lançar).
- **Tela de Ponto ganhou indicador "Lançamento manual"** — texto
  pequeno abaixo do badge de Status, quando todas as batidas do dia
  vieram do autolançamento (campo novo `selfReported` no
  `DaySummary`, mesmo padrão do `hasAdjustment`).
- **Testado de verdade, ponta a ponta**: vinculei o usuário do
  Alessandro ao colaborador dele (antes: `/employees/me` dava 404
  com a mensagem certa) → abri `/erp/ponto-manual`, tentei salvar
  vazio (bloqueou, mensagem certa) → lancei um dia de teste completo
  → mensagem de sucesso → conferi na tela de Ponto: horários batendo,
  8h48 calculado certo, badge "Lançamento manual" aparecendo →
  tentei lançar o mesmo dia de novo por API (bloqueou, "já existem
  batidas") → conferi o campo novo no cadastro de Colaborador
  mostrando o usuário vinculado selecionado. Dados de teste (as 4
  batidas do dia de teste) excluídos depois — **o vínculo
  Colaborador↔Usuário do Alessandro ficou** (é dado real correto, não
  lixo de teste).
- **Pendências conhecidas**: decisão do "Superusuário" (quem pode
  lançar/aprovar de outros) em aberto, usuário vai voltar com a
  definição; tela completa de "Cadastro de Usuários" não foi feita
  (decisão explícita, escopo maior, fica pra quando for pedida);
  aviso de aniversário do usuário logado ainda não foi religado pro
  `Employee.userId` novo (continua batendo só por e-mail, pendência
  antiga que virou "resolvível agora" mas não foi mexida).

## RH — tela de gestão de Exames médicos criada

Pendência antiga resolvida: só existia o relatório de exames
(`/erp/rh/exames/relatorio`, leitura), e registrar um exame exigia
abrir o cadastro completo do colaborador (aba Saúde). Item de menu
"Exames médicos" (`/erp/rh/exames`) que estava desabilitado
("Em breve") agora tem tela própria.

- **`frontend/src/app/erp/rh/exames/page.tsx`** (novo): lista todos
  os colaboradores com Função/Setor/Próximo exame/Situação (mesmo
  cálculo do relatório: Sem exame/Atrasado/A vencer em 30 dias/No
  prazo, com badge colorido), filtros de busca/setor/situação. Botão
  "Registrar exame" por linha abre um modal só com a data do exame
  (não precisa mais abrir o cadastro completo) + histórico de exames
  do colaborador com botão Remover — mesma lógica já usada na aba
  Saúde do cadastro de Colaborador (`employeeExamService`, endpoints
  `POST/GET/DELETE /employee-exams` já existiam, não criou nada novo
  no backend). Link para o relatório fica no topo da tela.
- **Menu habilitado** em `Sidebar/menu.ts` (`module: "HR"`,
  `permission: "employee.view"`, mesma permissão do relatório —
  registrar/remover exame já é protegido por `employee.update` dentro
  da tela, igual ao cadastro de Colaborador).
- **Testado de verdade pela tela**: registrei um exame novo pro
  Alessandro (colaborador de teste) → apareceu no histórico e a
  "Situação" da lista principal atualizou junto (calculado a partir
  do `nextExamDate`, denormalizado no `Employee`) → removi o mesmo
  registro de teste → voltou exatamente ao estado anterior (exame de
  07/08/2026 → próximo 07/08/2027, "No prazo"), sem deixar dado de
  teste para trás.

## Cadastro de Colaborador — ajuste de layout (aba Contratuais)

Pedido do usuário: os campos Função, Status, Código para bater ponto,
Salário base, Forma de pagamento, Data de admissão, Vence experiência
e Data de demissão estavam largos demais (ocupando a célula inteira
do grid), o que empurrava algum campo pra fora de ordem ou pra outra
linha. Pedido também explícito: Código para bater ponto antes de
Status.

- `frontend/src/app/erp/rh/colaboradores/page.tsx`, aba Contratuais:
  **Função** perdeu o `lg:col-span-2` (ocupava 2 colunas, agora ocupa
  1 igual aos demais campos da aba). Os outros 7 campos citados
  ganharam `mx-auto w-40` (ou `w-44` no caso de Forma de pagamento,
  rótulos mais longos) no `<div>` que já era a própria célula do
  grid — encolhe o campo e centraliza ele dentro da coluna, sem
  precisar mexer no grid em si (`sm:grid-cols-2 lg:grid-cols-4`,
  inalterado). **Código para bater ponto** foi movido pra antes de
  **Status** na ordem do formulário (mesma linha, na sequência
  pedida).
- **Testado**: medi via JS a posição/largura renderizada de cada
  campo — todos os 7 caem exatamente centralizados dentro da própria
  coluna do grid (célula ~232px, campo ~160-176px, sobra igual dos
  dois lados). Ordem Código → Status conferida na tela. `npx tsc
  --noEmit` sem erros.

## Módulo de Produção — etapas — frontend concluído nesta sessão

A pendência crítica registrada no início desta sessão (tela de
Ordens de produção desatualizada em relação ao backend novo de 3
etapas) **foi resolvida**:

- **`frontend/src/services/production.service.ts` reescrito**: enum
  `ProductionOrderStatus` novo (`AGUARDANDO_PRODUCAO`/`EM_PRODUCAO`/
  `FINALIZADA`/`CANCELADA`), `ProductionOrder` ganhou `orderDate`/
  `productionDays`/`completionObservation`,
  `ProductionOrderPayload` troca `expectedDate?` por
  `productionDays` (obrigatório), `ProductionSettings` ganhou
  `defaultProductionDays`, `start()` novo, `complete()` agora manda
  `{ completedAt, observation? }` no corpo.
- **`frontend/src/app/erp/producao/ordens/page.tsx` reescrito**:
  formulário trocou "Previsão de entrega" manual por "Dias de
  produção" (número); ao editar uma ordem já existente, mostra "Data
  de produção" e "Previsão" só leitura (calculadas no backend, não
  editáveis). Tabela ganhou colunas Data de produção/Dias/Previsão e
  um **semáforo** (bolinha colorida antes do número): cinza
  Aguardando, amarelo (`--warning`) Em produção, verde Finalizada,
  vermelho Cancelada **e vermelho também se a previsão já passou e a
  ordem ainda não finalizou** (atrasada). Ações por etapa: **Iniciar
  produção** (Aguardando → Em produção), **Concluir produção** (Em
  produção → abre modal pedindo data de término + observação →
  Finalizada), Cancelar (Aguardando/Em produção), **Estornar**
  (Finalizada → volta Em produção), Editar (só Aguardando) — mesmo
  padrão Editar/Cancelar/Estornar de sempre.
- **Tela de Acompanhamento criada**
  (`frontend/src/app/erp/producao/acompanhamento/page.tsx`, item de
  menu habilitado em `Sidebar/menu.ts`, módulo `PRODUCTION` +
  permissão `production-order.view` — nenhuma permissão nova). Mesmo
  padrão dos outros relatórios (filtro → tabela → Exportar CSV →
  Imprimir, sem `AppShell`, página própria): filtros por produto/
  etapa/origem, colunas número, produto, depósito, origem, abertura,
  dias, previsão, etapa, **"Previsão x hoje"** (dias restantes ou "N
  dia(s) de atraso", calculado no frontend a partir de
  `expectedDate`, vazio se já finalizada/cancelada), finalizado em,
  observação de conclusão. Não criou endpoint novo — reaproveita
  `GET /production-orders`.
- **Testado de verdade, ponta a ponta, pela tela** (não só por API):
  criei uma ordem manual (Camisa alepejo, 15 un., 5 dias de produção)
  → previsão calculada certa (abertura 11/08 + 5 dias = 16/08) →
  Iniciar produção (virou "Em produção") → Concluir produção (modal,
  informei data de término 13/08, diferente de hoje, + observação →
  virou "Finalizada") → conferi na tela de Acompanhamento que os
  dados batem (previsão x hoje veio vazio por já estar finalizada,
  observação de conclusão apareceu certa) → voltei pra Ordens,
  Estornar (voltou pra "Em produção") → Cancelar (virou "Cancelada",
  sem ações — terminal). Semáforo conferido via cor computada
  (vermelho na ordem cancelada). `npx tsc --noEmit` do frontend sem
  erros.
- **Não fiz**: nenhuma mudança no backend (já estava pronto e
  testado da parte anterior desta sessão). Dados de teste ficaram
  como "Cancelada" (não voltam saldo, não teve efeito líquido no
  estoque — completou e depois estornou antes de cancelar).

**⚠️ Nada commitado ainda desta sessão (11-08-2026)** — o último
commit continua sendo `aa41b10` (10-08-2026, "duas sessões acumuladas
finalmente commitadas"). Ainda **não foi dado push** desse commit
para o remoto — perguntar ao usuário antes de empurrar.

**Resumo desta sessão (11-08-2026):** WhatsApp e e-mail já estavam
funcionando (sessão anterior) — pedido foi estender pra mais eventos.

- **Pedido de Compra gerado** → avisa o fornecedor por e-mail/WhatsApp
  pedindo pra informar o número do pedido na observação da nota
  fiscal (rastreamento no recebimento). Vale tanto pro pedido criado
  manualmente (`PurchaseOrderService.create`) quanto pro gerado
  automaticamente ao escolher vencedor de cotação
  (`QuotationService.chooseWinner` — a mensagem de "você foi
  selecionado" ganhou o número do PC junto, uma mensagem só).
- **Orçamento gerado** (`QuoteService.create`) → envia o orçamento ao
  cliente por e-mail/WhatsApp, com o valor.
- **Pedido de Venda gerado** (`SalesOrderService.create`) → envia o
  pedido ao cliente por e-mail/WhatsApp, com o valor.
- Nos três casos: dispara automaticamente ao **criar** o documento
  (não é um botão separado), best-effort (nunca trava a criação),
  reaproveitando `EmailNotificationsService`/`WhatsappNotificationsService`
  já existentes. Repositories (`purchase-order`/`quote`/`sales-order`)
  tiveram o tipo de retorno do `create()` destravado (removida a
  anotação `Promise<X>` explícita) pra incluir `partner` de verdade no
  tipo — sem isso o TypeScript não deixava acessar `order.partner`.
- **Aviso de exame ocupacional** — campo novo **"Avisar exame com
  quantos dias"** (`Employee.examReminderDays`, default 7, migration
  `20260811120425_add_employee_exam_reminder_days`) na aba Saúde,
  ao lado de "Próximo exame pendente". O campo antigo "Dias de aviso"
  (que na verdade só marca "Afastado", nada a ver com exame — bug de
  nomenclatura de sessão anterior) foi rotulado **"Dias de aviso
  (afastamento)"** pra não confundir os dois, mas **não teve o
  comportamento alterado**.
- **Módulo novo `Backend/src/modules/scheduled-notifications/`** —
  `ScheduledNotificationsService`, cron diário às 8h
  (`America/Sao_Paulo`, pacote novo `@nestjs/schedule`,
  `ScheduleModule.forRoot()` no `app.module.ts`) que roda pra
  **todas as empresas do sistema** (não é escopado por companyId,
  não nasce de requisição):
  - Exame: avisa X dias antes (`examReminderDays` de cada
    colaborador), **e também sempre** 3 dias antes e no próprio dia
    ("Você tem exame hoje"), best-effort, e-mail + WhatsApp.
  - Aniversário: manda parabéns pro(s) aniversariante(s) do dia.
  - **Endpoint de disparo manual** `POST /scheduled-notifications/run`
    (permissão nova `scheduled-notifications.manage`, seed.ts, grupo
    `SCHEDULED_NOTIFICATIONS`) — roda os dois avisos na hora, sem
    esperar 8h. Fica disponível pra sempre (não é só de teste), útil
    pra forçar uma checagem manual.
  - **Testado de verdade**: rodei o disparo manual com os dados reais
    (sem falso positivo — 0 aniversariante e 0 exame vencendo hoje) e
    depois simulando `nextExamDate` = hoje num colaborador (revertido
    depois do teste) — as duas vezes sem erro no log.
- **Som do login corrigido** (`frontend/src/components/auth/LoginPage.tsx`)
  — tocava em loop depois de ativado o som. Removido `loop` do
  `<video>`; toca uma vez (ao abrir, ou ao clicar na imagem — que
  agora reinicia do zero com som) e para sozinho no fim, sem repetir.
- **`.claude/launch.json` criado** (não existia) — dois servidores
  (`backend`/`frontend`) pra abrir com o preview do Claude Code sem
  precisar de terminal manual. Backend e frontend tinham caído
  (nenhum processo Node rodando) no meio desta sessão — sintoma já
  visto antes, ver aviso mais abaixo sobre quedas do backend.

**Módulo de Produção iniciado** (`Backend/src/modules/production/`)
— add-on licenciável novo (`PRODUCTION`, mesmo padrão de
`BRANDING`/`HR`, habilitado na empresa seed ALEPEJO pra teste), menu
"Produção" (já existia como placeholder desabilitado — "Ordens de
produção" e "Configurações" habilitados agora, "Acompanhamento"
segue desabilitado, fora do escopo pedido). **Genérico, não
específico de confecção** — a planilha original tinha OS de produção
sob encomenda pra marcas terceiras (ver `07-Escopo-Planilha.md` seção
4), mas o pedido desta sessão foi outra coisa: reposição de estoque
próprio, então o modelo é novo, não uma migração da planilha.

- **Ordem de produção** (`ProductionOrder`, `/erp/producao/ordens`,
  numeração `OP-000001`): produto + depósito + quantidade (um produto
  por ordem, sem lista de itens — mais simples que Compras/Vendas de
  propósito, sem BOM/ficha técnica nesta rodada). 3 status: Rascunho
  → Concluída (gera **entrada de estoque**, custo médio ponderado) ou
  Cancelada. Concluída pode ser **Estornada** (volta pra Rascunho,
  desfaz a entrada — trava se o saldo produzido já foi usado/vendido
  depois). Editar/Cancelar só em Rascunho — mesmo padrão
  Editar/Cancelar/Estornar de sempre.
- **Nasce manual ou sozinha em 2 gatilhos** (best-effort, nunca travam
  quem chama, e só agem se a empresa tiver o módulo `PRODUCTION`
  licenciado — `LicenseService.hasModule`):
  1. **Pedido de venda pedindo mais do que o saldo disponível** no
     depósito escolhido → `SalesOrderService.create` chama
     `ProductionOrdersService.autoGenerateForSalesOrderItem` por item,
     gera a ordem pela diferença (origem "Pedido de venda", vinculada
     ao pedido).
  2. **Saldo de um produto chegando ao mínimo cadastrado**
     (`Product.minimumStock`, somando todos os depósitos) → chamado
     depois de qualquer baixa real de estoque: `SaleService.approve`
     (aprovação de venda) e `StockMovementService.create` (saída/
     ajuste manual). Origem "Estoque mínimo".
  - **Não duplica**: se já existe uma ordem em aberto (rascunho) pro
    mesmo produto, os gatilhos não geram outra — simplificação
    deliberada (não soma/ajusta a existente).
- **Configurações** (`ProductionSettings`, um registro por empresa,
  `/erp/producao/configuracoes`): **lote mínimo** por ordem gerada
  sozinha (nunca gera menos que isso, evita ordem de 1 unidade —
  `Product.minProductionBatch` pode sobrepor por produto, campo já
  existe no schema mas **ainda sem campo na tela de cadastro de
  Produto** — pendência conhecida, dá pra setar via API/Prisma Studio
  por enquanto) e 2 liga/desliga (gerar por pedido de venda / gerar
  por estoque mínimo, cada um independente).
- **Custo da entrada de estoque = custo médio atual do produto**
  (não `Product.cost`) — ajuste feito a pedido do usuário no meio da
  sessão ("a produção deve movimentar estoque pelo preço médio").
  Produzir não é uma compra com nota/preço; entrar pelo próprio custo
  médio mantém o custo médio do estoque estável (só cai no
  `Product.cost` cadastrado quando não existe nenhum saldo/custo
  médio anterior pro produto+depósito, ou seja, primeira produção
  daquele item).
- **Testado de verdade, ponta a ponta**: ordem manual → concluir
  (estoque 49→64, custo médio ficou igual, 4,7786→4,7786) → estornar
  (voltou 64→49, status voltou pra Rascunho); gatilho de pedido de
  venda (pedido de 60 un. com saldo de 49 → gerou ordem de 11 un.
  sozinha); gatilho de estoque mínimo (saída manual levando o saldo a
  9, mínimo cadastrado 10 → gerou ordem de 1 un. sozinha); dedupe
  (não gerou uma segunda ordem enquanto a primeira estava aberta).
  Dados de teste revertidos depois (ordens canceladas, estoque
  restaurado a 49, pedido de venda de teste cancelado).
- **Pendência conhecida**: `ProductionOrdersService.undoComplete` não
  reverte o custo médio ao estornar (só a quantidade) — como a
  entrada agora é sempre pelo próprio custo médio (ver acima), isso
  raramente importa na prática (completar normalmente **não muda** o
  custo médio), mas fica registrado.

**Módulo LABOR iniciado — Controle de Ponto**
(`Backend/src/modules/time-tracking/`) — pedido do usuário: "dentro
de RH submenu controle de ponto e controle de horas [...] com
aprovação das horas registradas, api para relógio ponto ou leitura de
código de barras ou QRCode [...] justificativas de faltas. E
abonos." O usuário também pediu **Folha de Pagamento** (holerite,
INSS/IR/FGTS) no mesmo pedido, mas por decisão conjunta (perguntei,
ele escolheu) **isso ficou pra uma sessão separada** — folha mexe com
dinheiro de verdade do colaborador, merece pesquisar as tabelas
atuais com calma antes de desenhar o cálculo, não é o tipo de coisa
pra apressar. **Decisão tomada com o usuário**: os dois (Ponto e
Folha, quando vier) vão dividir **uma licença só**, código `LABOR`
(ele considerou, cotou separar em duas licenças, mas preferiu uma só
— "Labor").

- **Licenciamento**: add-on novo `LABOR` (mesmo padrão
  `BRANDING`/`HR`/`PRODUCTION`, habilitado na empresa seed ALEPEJO
  pra teste). Itens ficam **dentro do menu "Recursos Humanos"**
  (grupo continua com `module: "HR"` — decisão deliberada: Ponto
  trabalha em cima de `Employee`, então faz sentido precisar do HR
  habilitado também; não criei um grupo de menu novo separado pra
  isso).
- **Batida de ponto** (`TimeEntry`) — registro bruto (colaborador +
  horário + origem: Manual/API/Código de barras/QR Code). O dia
  trabalhado é **calculado juntando as batidas em pares
  entrada/saída** (`calculateWorkedMinutes`), não gravado — bate
  sobrando no fim (esqueceu de bater saída) é ignorado no total.
- **Aprovação por dia** (`TimeSheetApproval`, um registro por
  colaborador+data): sem aprovação, o dia fica "Pendente" — só existe
  registro aqui quando alguém aprova. Aprovar tira um retrato
  (`workedMinutes`) do total calculado na hora. **Dia aprovado
  trava**: não dá pra registrar nova batida nem excluir batida
  existente daquele dia até **Reabrir** (volta pra Pendente, sem
  registro de aprovação).
- **API para dispositivo externo** (relógio de ponto físico, leitor
  de QR/código de barras) — `POST /time-clock/punch`, autenticado por
  **chave de API por empresa** (header `X-Api-Key`), não por login.
  Só o **hash** (bcrypt, reaproveitando `PasswordService` já
  existente) fica gravado — o valor puro só aparece uma vez, na hora
  de gerar (`/erp/rh/ponto/chave-api`), copiar e guardar; se perder,
  só gerando de novo. `employeeId` é o próprio id do colaborador
  (cuid) — não criei um campo novo de "matrícula/crachá", o
  QR/código de barras do colaborador simplesmente codifica esse id.
  Tela de leitor (`/erp/rh/ponto`, campo "Leitor de código de
  barras/QR Code") usa o mesmo padrão de leitor-como-teclado já
  usado no Recebimento de compras (input com foco automático, Enter
  dispara).
- **Faltas e abonos** (`AbsenceRecord`, `/erp/rh/faltas`): tipo
  (Falta justificada/Falta injustificada/Abono) + motivo, com
  aprovação (Pendente → Aprovado/Rejeitado → dá pra Reabrir).
  Editar/Excluir só enquanto Pendente.
- **Bug real corrigido durante o teste**: o filtro "Até" da folha de
  ponto (`GET /time-entries/day-summary?to=AAAA-MM-DD`) tratava a
  data como meia-noite UTC — qualquer batida feita à tarde/noite no
  fuso do Brasil (UTC-3) ficava **fora** do filtro "até hoje" (batida
  das 15h ficava depois de "hoje 00:00 UTC"). Corrigido em
  `TimeTrackingService.getDaySummaries` somando 1 dia menos 1ms ao
  `to` antes de filtrar.
- **Testado de verdade, ponta a ponta**: batida manual + batida via
  leitor (simulado com fetch direto, já que o teclado sintético da
  ferramenta de automação não disparou o evento Enter de verdade —
  validei a lógica de ponta a ponta do mesmo jeito, o problema era só
  da ferramenta de teste, não do código) → folha de ponto agregando
  certo (0h03 entre duas batidas de 3 min de diferença) → aprovar
  (trava batida nova e exclusão) → reabrir (destrava). Chave de API:
  gerar, bater ponto **sem cookie de login nenhum** (só a chave) →
  201, chave errada → 401. Faltas/abonos: criar, aprovar, reabrir,
  excluir.
- **Pendências conhecidas**: sem tela de indicadores/relatório de
  ponto ainda (só a folha bruta); sem geração de QR/etiqueta
  imprimível por colaborador pro crachá (hoje precisa saber o id
  cuid do colaborador de outro jeito pra codificar num QR — dá pra
  reaproveitar o padrão de etiqueta já usado em CTPS/EPI quando for
  pedido); "Controle de horas" (banco de horas, jornada esperada por
  colaborador/horário, comparação com o que foi trabalhado) não foi
  feito — só ponto bruto + total do dia, sem comparar contra jornada.
- **Próximo (quando o usuário pedir)**: Folha de Pagamento —
  pesquisar tabelas atuais de INSS/IRRF/FGTS antes de desenhar
  qualquer cálculo (nada disso foi pesquisado ainda nesta sessão).
- **Ajustes feitos depois, ainda na mesma sessão** (pedido do
  usuário, mensagens separadas):
  - `Employee.badgeCode` (código/crachá pra bater ponto, opcional,
    único por empresa) — migration
    `20260811193901_add_employee_badge_code`. Campo novo no cadastro
    de Colaborador, aba Contratuais, logo abaixo de Status ("Código
    para bater ponto"). O registro de ponto (`TimeTrackingService.
    createEntry`, tanto a rota autenticada quanto a API pública de
    dispositivo) agora aceita **id do colaborador OU badgeCode** no
    mesmo campo `employeeId` — resolve pelos dois via `OR` na busca,
    sem precisar de um DTO/rota separada.
  - Campo do leitor de código de barras/QR na tela de Ponto
    (`/erp/rh/ponto`) ficou **bem menor** (`h-9 w-40` em vez de
    `h-11 w-full`) — pedido explícito ("não ocupar tanto espaço na
    tela"). De quebra, removida uma chamada de API redundante
    (`employeeService.getById` antes de bater o ponto) — agora usa
    só a resposta do próprio `POST /time-entries`, que já devolve o
    nome do colaborador.
  - **Testado por API direta** (não pela tela, sessão já estava
    encerrando): `PATCH /employees/:id` com `badgeCode` grava certo,
    `POST /time-entries` com `employeeId: "0042"` (o badge, não o
    cuid) resolveu pro colaborador certo.

## Módulo de Produção — etapas (backend e frontend prontos, testados ponta a ponta)

Pedido do usuário (com imagem da aba `CONT_PRODUCAO` da planilha
original de referência — layout de fábrica de costura, mas os campos
pedidos foram generalizados, sem campos específicos de confecção tipo
OS/Marca/Piloto, mantendo a decisão já tomada antes de módulo
genérico):

1. **Dias de produção** (campo novo, ex.: 10 dias).
2. **Data de produção** = sempre a data de abertura da ordem (hoje),
   não editável.
3. **Previsão** = data de produção + dias de produção, **calculada no
   backend**, nunca aceita direto do formulário.
4. **3 etapas em sequência**: Aguardando produção → Em produção →
   Finalizada (+ Cancelada, terminal, a partir das duas primeiras).
5. **Semáforo visual** na linha da lista pra bater o olho e saber a
   etapa.
6. **Botão de mudança de etapa** (Iniciar produção, separado de
   Concluir).
7. **Concluir abre uma subtela/modal** pedindo **data de término** +
   **observação** (esses dois, "informar a data do término e
   observação").

### O que já está pronto (backend, compila limpo, testado por API)

- **Enum renomeado**: `ProductionOrderStatus` agora é
  `AGUARDANDO_PRODUCAO | EM_PRODUCAO | FINALIZADA | CANCELADA` (antes
  era `DRAFT | COMPLETED | CANCELLED`). Migration
  `20260811192942_production_order_stages` — como só existiam 3
  ordens de teste (todas já canceladas) e nenhum dado real, a
  migração foi feita **apagando as ordens de teste** antes de rodar
  (não teve dado real pra migrar/perder).
- **Campos novos em `ProductionOrder`**: `orderDate` (data de
  abertura, obrigatório, gravado sozinho = hoje na criação),
  `productionDays` (obrigatório, vem do formulário),
  `completionObservation` (observação específica da conclusão,
  separada da `observation` geral da ordem). `expectedDate` continua
  existindo mas **virou sempre calculado** (orderDate +
  productionDays) — o DTO de criação **não aceita mais** esse campo
  direto.
- **`ProductionSettings.defaultProductionDays`** (padrão 7) — usado
  quando uma ordem nasce sozinha pelos gatilhos automáticos (eles não
  têm como saber quanto tempo aquele produto leva pra produzir).
- **Fluxo de etapas no `ProductionOrdersService`**:
  - `create`: sempre nasce em `AGUARDANDO_PRODUCAO`, calcula
    orderDate/expectedDate sozinho.
  - `start` (**endpoint novo** `PATCH /production-orders/:id/start`):
    só de `AGUARDANDO_PRODUCAO` → `EM_PRODUCAO`.
  - `update`: só em `AGUARDANDO_PRODUCAO` (era "rascunho"/DRAFT
    antes). Mudar `productionDays` recalcula `expectedDate` sozinho a
    partir do mesmo `orderDate`.
  - `cancel`: de `AGUARDANDO_PRODUCAO` **ou** `EM_PRODUCAO`.
  - `complete` (**mudou de assinatura**: agora é
    `PATCH /production-orders/:id/complete` com **body**
    `{ completedAt, observation? }`, antes não pedia nada no corpo):
    só de `EM_PRODUCAO` → `FINALIZADA`. Continua gerando a entrada de
    estoque pelo custo médio (comportamento da sessão anterior,
    mantido).
  - `undoComplete` (Estornar): `FINALIZADA` → volta pra
    `EM_PRODUCAO` (não pra Aguardando — já tinha começado a
    produção).
  - Gatilhos automáticos (`autoGenerateForSalesOrderItem`/
    `autoGenerateForLowStock`): passaram a preencher
    orderDate/productionDays (usando o padrão da empresa)/
    expectedDate também. `findOpenByProduct` (usado pra não duplicar
    geração automática) agora considera aberto = `AGUARDANDO_PRODUCAO`
    **ou** `EM_PRODUCAO` (antes só DRAFT).
- **DTOs**: `CreateProductionOrderDto` trocou `expectedDate?` por
  `productionDays` (obrigatório). `UpdateProductionOrderDto` idem
  (parcial). DTO novo `CompleteProductionOrderDto`
  (`completedAt` obrigatório, `observation?`).
  `UpsertProductionSettingsDto` ganhou `defaultProductionDays?`.

### Frontend — feito nesta sessão

`production.service.ts`, `/erp/producao/ordens` e
`/erp/producao/acompanhamento` reescritos/criados, item de menu
Acompanhamento habilitado. Testado ponta a ponta pela tela (não só
por API) — ver resumo no topo do documento. Nenhuma pendência
conhecida neste fluxo.

**WhatsApp (Baileys) implementado** — item 1 da fila anterior,
completando o aviso automático ao fornecedor vencedor de cotação
(e-mail + WhatsApp agora, os dois best-effort).
- `@whiskeysockets/baileys` (pacote ESM puro — o Backend compila para
  CommonJS, então o import é **dinâmico** dentro do serviço,
  `await import(...)`; um import estático daria `ERR_REQUIRE_ESM` em
  runtime) + `qrcode` (gera o QR como data URL pro frontend) + `pino`
  (logger exigido pelo Baileys). Serviço novo
  `Backend/src/modules/notifications/services/whatsapp-notifications.service.ts`,
  mesmo padrão do `EmailNotificationsService`: **sessão única, global
  ao sistema** (não é por empresa), `send()` nunca lança.
- Sessão salva em `Backend/whatsapp-auth/` (gitignored — tem
  credenciais). No boot, só reconecta sozinho se já existir sessão
  pareada (`creds.json` no disco); pareamento novo só começa quando o
  usuário clica "Conectar" na tela.
- Tela nova `/erp/configuracoes/whatsapp` (menu do usuário → avatar,
  junto de Licenciamento/Personalização): status da conexão
  (Desconectado/Conectando/Aguardando QR/Conectado, com polling a cada
  3s enquanto não conectado) + QR code pra escanear + botão
  Desconectar (apaga a sessão pareada). Permissões novas
  `whatsapp.view`/`whatsapp.manage` (seed.ts, grupo `WHATSAPP` — rodar
  `npx ts-node prisma/seed.ts` de novo se algum outro perfil além do
  Administrador precisar delas).
- Endpoints: `GET /notifications/whatsapp/status`,
  `POST /notifications/whatsapp/connect`,
  `POST /notifications/whatsapp/logout`,
  `POST /notifications/whatsapp/test` (`{ phone, message? }` →
  `{ sent, error? }`, motivo real da falha quando não envia).
- **Campo "Enviar mensagem de teste"** na própria tela
  (`WhatsappNotificationsService.sendVerbose`), pra diagnosticar sem
  precisar mexer numa cotação de verdade.
- **Achado real de teste**: primeiros testes (mandando pro próprio
  número pareado, depois pra outro número) pareciam não chegar mesmo
  com `sent: true` (sem erro, número confirmado existente no WhatsApp
  via `sock.onWhatsApp` — checagem adicionada em `sendVerbose` antes
  de enviar). Hipótese na hora: sessão recém-pareada fica "sombreada"
  pelo WhatsApp por um tempo (comportamento conhecido contra
  automação não-oficial). **Confirmado depois**: era só demora mesmo
  — esperando um pouco com a sessão conectada, as mensagens passaram
  a chegar normalmente, **inclusive mandando pro próprio número
  pareado** (não é regra que autoenvio nunca notifique, como cheguei
  a supor antes — funcionou aqui). Se voltar a falhar num número novo
  pareado, vale testar de novo depois de um tempo antes de assumir
  bloqueio definitivo.
- **Testado de verdade** nesta sessão: cliquei Conectar, QR real
  apareceu na tela (conexão de verdade com os servidores do
  WhatsApp), cliquei Desconectar, sessão limpa do disco. **Não foi
  pareado com um número real** — só validado que o fluxo técnico
  funciona ponta a ponta. Usuário ainda precisa escanear o QR com um
  número de teste/secundário pra ativar de verdade (risco de bloqueio
  do número pela Meta por não ser API oficial, já aceito antes).
- `QuotationService.chooseWinner` agora dispara e-mail **e** WhatsApp
  pro fornecedor vencedor (campo `BusinessPartner.mobile`), os dois em
  paralelo, best-effort, nenhum trava o outro nem a resposta da rota.
- Não fica ligado por padrão sozinho no boot enquanto não for pareado
  pela primeira vez — evita ficar segurando uma conexão com o WhatsApp
  à toa se ninguém for usar a função.

**Resumo da sessão anterior (10-08-2026, antes do commit):**

- **Backend caiu várias vezes durante a sessão** (morto sem querer ao
  reiniciar pra aplicar migration, ou sozinho por algum motivo não
  identificado). Se `alessandro.lourenco@alepejo.com.br` não conseguir
  logar ("usuário ou senha inválidos" sem motivo aparente), a causa
  mais comum é essa — checar `netstat -ano | grep ":3001"` antes de
  qualquer outra investigação, subir com `npm run start:dev` na pasta
  `Backend` se estiver fechado.
- **Card Colaboradores (Visão geral)** ganhou dados reais: Ativos, Em
  experiência, Aniversariantes do mês (agora com **listagem** de quem
  faz aniversário, não só o número — pedido explícito do usuário), e
  **Exames a vencer foi movido pro final** da lista (pedido do
  usuário). Saudação de aniversário: se hoje for aniversário da
  *pessoa logada*, aparece "🎉 Desejando um feliz aniversário pra
  você!" embaixo do "Boa tarde, Nome" — **mas isso só funciona se
  `Employee.email` bater com `User.email`**, ver pendência nova mais
  abaixo (usuário ainda não decidiu como resolver).
- **Cadastro de Colaborador**:
  - Aba Contratuais: Estágio de experiência virou 3 caixas de seleção
    compactas (30/60/90 dias) em vez dos botões grandes de antes.
    Salário base/Tipo de salário/Forma de pagamento ficaram alinhados
    numa linha só, e as 4 datas (admissão/vence experiência/previsão
    de término/demissão) na linha seguinte.
  - Aba nova **"Dados bancários"**: banco, agência, conta, tipo de
    conta (`BankAccountType`: corrente/poupança), tipo de chave Pix
    (`PixKeyType`), chave Pix — pra ter o necessário pra pagar
    salário. Migration `add_employee_bank_data`.
  - Aba Saúde ganhou **Afastamento** (início/dias/fim — fim sempre
    calculado no backend, início preenchido marca "Afastado" sozinho)
    e **Férias** (mesmo padrão: início/dias/fim calculado, marca "Em
    férias" sozinho). Migration `add_employee_leave_vacation`.
    **Nenhuma lógica de bloqueio de login foi implementada** — usuário
    pediu só os campos e o cálculo por enquanto, confirmou
    explicitamente "mais nada irá ser feito agora de bloqueio".
  - Aba Contato: bug real corrigido na busca de CEP — quando o CEP não
    existia ou a consulta falhava, a tela ficava muda (sem preencher
    nada e sem avisar nada). Agora mostra "CEP não encontrado." (ou a
    mensagem real do erro) embaixo do campo.
  - Aba Benefícios: campo de % do Vale Transporte (e qualquer
    benefício `PERCENTAGE`) ficou pequeno de verdade (72px, via
    `style` inline — mesmo bug de `w-full` vencer classe de largura já
    documentado antes) e o valor calculado (%×salário) ficou em
    destaque ao lado.
- **Menu "Dashboard" ganhou Gráficos** — duas páginas novas usando
  `recharts` (biblioteca já estava instalada, nunca tinha sido usada):
  `/erp/rh/graficos-colaboradores` (barra horizontal por função, rosca
  por setor, barra por sexo) e `/erp/financeiro/graficos-fluxo-caixa`
  (barras de receita/despesa por mês + linha "Realizado vs. Orçado"
  com seletor de ano), replicando os gráficos das abas
  `DASHBOARD_CAD`/`DASHBOARD_FLUXO` da planilha original (inspecionada
  diretamente do XML do `.xlsm` pra extrair título/tipo/dados de cada
  gráfico).
- **Produto ganhou o campo REF** (referência do fabricante) que
  faltava desde sempre — resolvido como parte do relatório de
  produtos precisar dele. Migration `add_product_reference`.
- **Módulo de Relatórios completo** — menu próprio "Relatórios"
  (último item do menu), 13 relatórios, todos no mesmo padrão: filtros
  antes de gerar → prévia em tela → **Exportar CSV** → **Imprimir**
  (paisagem, `@media print`). Utilitário novo
  `frontend/src/lib/exportCsv.ts` (BOM UTF-8 pra acentuação abrir
  certo no Excel). Lista completa: Produtos (coluna Custo médio no
  lugar de Tipo, pedido do usuário), Funções, Parceiros (um relatório
  só pra Clientes/Fornecedores, com filtro de papel — mesma unificação
  de sempre), Compras, Recebimentos, Pedidos de Compra, **Cotações**
  (mostra **todas as propostas** de cada cotação, não só a vencedora —
  ordenadas por valor, vencedora destacada em verde com 🏆, pra dar
  pra validar se a escolha foi a melhor — pedido explícito do
  usuário), Pedidos de Venda, Orçamentos, Contas a Receber/Pagar (1
  página só, com botão pra trocar entre os dois), Exames (situação
  calculada a partir do próximo exame: sem exame/atrasado/a vencer em
  30 dias/no prazo — não existe uma tela de gestão de exames de verdade
  ainda, só o relatório), Aniversariantes (impressão com seletor de
  mês). Ficaram de fora (usuário não pediu): Estoque, Movimentações.
- **E-mail de vencedor de cotação implementado de verdade** —
  `NotificationsModule` novo (`Backend/src/modules/notifications`),
  `EmailNotificationsService` com `nodemailer`, best-effort (nunca
  lança, nunca trava `QuotationService.chooseWinner` — dispara com
  `void` sem `await` bloqueante). Credenciais SMTP já no `.env` do
  Backend (`smtp.gmail.com:587`, senha de app do Gmail — **testada de
  verdade** com um script `transporter.verify()` antes de salvar, as
  duas senhas que o usuário mandou funcionaram, ficou com a primeira).
  WhatsApp (Baileys) continua pendente, ver "Próximo na fila".
- **Bug real corrigido no Fluxo de Caixa**: uma baixa antecipada ou
  atrasada de um título aparecia no mês do **vencimento**, não no mês
  em que o pagamento/recebimento **de fato aconteceu** — usuário
  testou pagando hoje um título vencendo em setembro e viu tudo cair
  em setembro mesmo assim. Corrigido em
  `FinancialEntriesService.getCashFlow`: "Total" continua pelo
  vencimento (visão de compromisso/agenda), mas "Recebido"/"Pago"
  agora segue a `paymentDate` de verdade. A busca
  (`findForCashFlow`) também mudou, pra pegar por vencimento OU data
  de pagamento dentro do ano (uma baixa antecipada perto da virada do
  ano podia cair fora da busca antiga).
- **Menu do sistema reorganizado** (pedido explícito do usuário):
  "Visão geral" saiu de dentro do grupo "Dashboard" e virou o
  primeiro item isolado do menu (não mais um grupo). Ordem final:
  Visão geral → Cadastros → Compras → Comercial → Estoque →
  Financeiro → Recursos Humanos → Produção → Dashboard (agora só com
  os Gráficos) → Relatórios (por último).

**Resumo rápido da sessão anterior (09-08-2026):** várias frentes,
todas no mesmo dia.

**Máscara de moeda brasileira em todo campo de valor.** Componente novo
`frontend/src/components/ui/CurrencyInput.tsx` — máscara "centavos
primeiro" (digita da direita pra esquerda, tipo app de banco), sempre
entrega `number` via `onChange` (nunca mais string pra fazer parse com
`.replace(",", ".")`). Aplicado em **todo** campo de dinheiro do sistema:
Produtos (custo/preço venda), RH (salário em Colaboradores e Funções),
Estoque (custo médio, custo unitário na movimentação), Vendas/Pedidos de
Venda/Orçamentos (preço unitário do item, desconto, frete, outras
despesas), Compras/Pedidos de Compra/Cotações (preço unitário, preço de
oferta), Financeiro (valor do título, valor pago na baixa, orçado
receita/despesas). De quebra, corrigiu o bug de CSS já sinalizado em
`compras/cotacoes/page.tsx` (input de preço da oferta esticando) — o
componente separa `className` (visual, vai no `<input>`) de
`wrapperClassName` (layout/grid, vai no `<div>` que envolve o campo:
nunca misturar as duas, uma classe de grid no `<input>` não tem efeito
porque quem é o item do grid é o wrapper). Em todo arquivo tocado, o
antigo `toInputDecimal()` (duplicado em 6 arquivos) foi removido — não
faz mais sentido com estado numérico.

**Fluxo de caixa ganhou Meta** (receita **e** despesas — a receita foi
feita primeiro, o usuário pediu pra completar com despesas). Linhas
"Meta receita"/"Meta despesas" (vêm do Orçamento) + "% da meta" logo
abaixo de cada uma. Cor do "% da meta" é invertida entre receita e
despesa: em receita, bater 100%+ é bom (verde); em despesa, passar de
100% do orçado é ruim (vermelho) — `Row.invertPercentTone` no
`fluxo-caixa/page.tsx`. Aproveitou pra separar visualmente Receitas de
Despesas na tabela (faixa colorida de cabeçalho por seção, pedido do
usuário pra ficar "mais visível").

**Compras e Vendas ganharam Editar e Cancelar de rascunho** (regra de
projeto passou a valer para todo o sistema: todo processo/documento tem
que ter Editar, Cancelar e Estornar — só é aceitável faltar algum
desses quando existe amarração real com outro processo, ex.: documento
já virou outro documento final, já tem pagamento/recebimento lançado.
Pedido explícito do usuário, abrangente, não só para esta tela). Backend:
`PATCH /purchases/:id` e `PATCH /sales/:id` (guardado a `status: DRAFT`
via `PurchaseService.update`/`SaleService.update`, reaproveitando os DTOs
`UpdatePurchaseDto`/`UpdateSaleDto` que já existiam órfãos no código —
ninguém tinha ligado eles a nada). Permissões novas `purchase.update`/
`sale.update` (seed.ts). **Bug real corrigido em Vendas**: `SaleStatus.CANCELLED`
nunca era setado em lugar nenhum do código — uma venda em rascunho não
tinha como ser cancelada, só existia "desfazer aprovação"
(`/sales/:id/cancel`, exigia `APPROVED`) mal-chamada de "cancelar" no
código. Renomeado: `/sales/:id/cancel` agora é o cancelamento de
verdade (só `DRAFT`, `SaleService.cancel`), e o comportamento antigo
virou `/sales/:id/undo-approval` (`SaleService.undoApproval`) — mesmo
efeito de antes (devolve estoque, volta pra rascunho), só o nome certo.
Frontend: botão "Editar" (lápis) e "Cancelar" novos nas duas listagens,
visíveis só quando `status === "DRAFT"`; o botão antigo "Desfazer
aprovação" em Vendas (ícone de desfazer, visível só em `APPROVED`)
continua igual, só passou a chamar `saleService.undoApproval()` em vez
do `cancel()` renomeado. Editar reaproveita o mesmo modal de
criação em modo edição (`editingId` state), igual ao padrão que já
existia em Pedidos de Compra/Venda e Orçamentos.

**Nota registrada, não implementada:** usuário pediu pra avaliar
prontidão multi-empresa do SaaS — diagnóstico e o que falta está na
seção "Próximo na fila" item 4, mais abaixo. Decisão já tomada (1 login,
várias empresas, tabela N:N nova) — só falta implementar quando o
usuário pedir, não perguntar de novo qual modelo usar.

**Cadastro de Colaborador — automações (pedido em duas rodadas: 9 itens
iniciais, depois 4 correções de teste real).** Testar em
`/erp/rh/colaboradores`, editar um colaborador existente e percorrer as
abas Contratuais/Saúde/Benefícios/EPI.

- **Estágio de experiência**: 3 caixas clicáveis (30/60/90 dias, não é
  mais `<select>` — usuário pediu "caixas de seleção" de verdade) na
  aba Contratuais. Empresa pode escolher qualquer estágio já na
  contratação. O vencimento ("Vence experiência") é **sempre calculado
  no backend** (`EmployeesService.applyBusinessRules`, admissão +
  estágio) — nunca fica em branco, mesmo que o front não mande nada.
  Reconciliação automática continua rodando a cada leitura
  (`findAll`/`findOne` → `reconcileExperience`): avança 30→60→90
  sozinho conforme o prazo vence, e após 90 dias passa `status` pra
  `ATIVO` (efetivado) sozinho. Interpretação: "efetivado" = status
  `ATIVO` (não existe um enum novo pra isso, o enum `EmployeeStatus`
  não mudou).
- **Saúde e Benefícios agora são abas separadas** (eram uma aba só).
  Horário de trabalho mostra a descrição com os horários reais abaixo
  do select (não só o nome do horário).
- **Exame ocupacional virou histórico de verdade** — model novo
  `EmployeeExam` (`examDate`, `nextExamDate`, `status`
  `NO_PRAZO`/`ATRASADO`), tabela `employee_exams`. Os campos antigos
  `Employee.examDate`/`examCompleted` **foram removidos** (migration
  `20260809205349_add_employee_exams_and_benefit_percentage` preserva
  o que existia como um registro de histórico antes de dropar as
  colunas). `Employee.nextExamDate` continua existindo — é
  denormalizado, sempre igual ao `nextExamDate` do último
  `EmployeeExam` registrado (ou `null` se nunca teve exame, aí a
  referência implícita é a data de admissão). Fluxo na aba Saúde: campo
  "Data do exame" + botão "Registrar" (só aparece depois de salvar o
  cadastro — precisa de `employeeId`), grava um `EmployeeExam` novo via
  `POST /employee-exams`, calcula `status` comparando com o
  `nextExamDate` anterior (ou a admissão, se for o primeiro exame) e
  `nextExamDate` novo = data do exame + 1 ano em dia útil
  (`toNextBusinessDay`). Tabela de histórico abaixo, com botão de
  remover por linha (`DELETE /employee-exams/:id`, recalcula o
  `nextExamDate` do colaborador pro do exame anterior, ou `null` se
  não sobrar nenhum). Módulo novo `Backend/src/modules/employee-exams/`
  (mesmo padrão do `ppe-deliveries`), reaproveita as permissões
  `employee.view`/`employee.update` (não criou permissão nova).
- **Benefícios dinâmicos** — catálogo próprio (model `Benefit`, join
  `EmployeeBenefit`), manutenção em `/erp/rh/cadastros` (painel
  "Benefícios" reaproveitando `SimpleCrudPanel`, que ganhou suporte a
  campo `type: "select"` — antes só tinha texto livre). Cada benefício
  tem `calculationType`: `FIXED` (valor em R$ digitado direto) ou
  `PERCENTAGE` (% sobre o salário do colaborador — usado pelo Vale
  Transporte por padrão no seed). Na aba Benefícios do colaborador, um
  benefício `PERCENTAGE` mostra campo de % + o valor calculado ao lado
  (nunca grava o valor em R$ pro percentual, sempre recalcula a partir
  do salário atual pra nunca ficar desatualizado). Seed cria 3
  benefícios padrão por empresa: Vale Transporte (`PERCENTAGE`), Vale
  Refeição e Vale Alimentação (`FIXED`).
- **Automações menores**: preencher "Dias de aviso" marca "Afastado"
  sozinho; preencher "Data de demissão" marca status "Demitido"
  sozinho (os dois na aba Contratuais/Saúde, via `setForm` direto no
  `onChange`, sem viagem ao backend).
- **EPI ganhou campos de tamanho** (calçado/camisa/calça,
  `shoeSize`/`shirtSize`/`pantsSize` em `Employee`) logo abaixo do
  armário (que também foi movido pra essa aba, no topo, com separador
  antes da lista de EPIs exigidos pela função).
- Migrations desta rodada: `20260809200804_add_employee_benefits_automation`
  (campos novos + `Benefit`/`EmployeeBenefit`, preserva
  `transportVoucher=true` antigo como benefício "Vale Transporte")
  e `20260809205349_add_employee_exams_and_benefit_percentage`
  (`EmployeeExam`, `Benefit.calculationType`,
  `EmployeeBenefit.percentage`, remove `examDate`/`examCompleted`).

**Frente anterior desta sessão** (RH Sprint 4 + Financeiro Orçamento):

RH Sprint 4 (última do RH) implementada —
`GET /employees/reports/birthdays?month=` e
`GET /employees/reports/indicators` (agregação feita em memória no
`EmployeesService`, a partir de `EmployeesRepository.findActiveForReports`,
sem novo módulo). Frontend: `/erp/rh/aniversariantes` (seletor de mês),
`/erp/rh/etiquetas-ctps` (busca colaborador → gera etiqueta imprimível fora
do `AppShell`, com salário por extenso via novo util
`frontend/src/lib/currencyToWords.ts`) e `/erp/rh/indicadores` (cards +
tabelas: por função com média salarial, por setor, por status, por sexo).
Todas as 3 rotas reaproveitam a permissão `employee.view` (nenhuma
permissão nova). Menu (`Sidebar/menu.ts`) ganhou os 2 itens novos e o
"Aniversariantes" (que já existia como placeholder `disabled: true`) foi
habilitado. **Módulo RH está 100% completo agora** (Sprints 1-4).

Financeiro — **Orçamento** (`/erp/financeiro/orcamento`, item de menu que
já existia como placeholder `disabled: true`, agora habilitado): novo
módulo Nest `budgets` (model `Budget`: `companyId`+`year`+`month`+`type`
único, `type` é o enum novo `BudgetType` RECEITA/DESPESA, migration
`20260809193904_add_budget`). Só o **orçado** é gravado
(`PUT /budgets`, upsert); o **realizado** nunca é gravado — vem de
`GET /budgets?year=`, que reaproveita
`FinancialEntriesService.getCashFlow()` (mesmo cálculo do Fluxo de Caixa,
`settled` por mês/tipo) em vez de duplicar a lógica de agregação. Permissões
novas `budget.view`/`budget.manage` (seed.ts, grupo `BUDGET` — rodar
`npx ts-node prisma/seed.ts` de novo se algum outro perfil além do
Administrador precisar delas). Tela é uma tabela estilo Fluxo de Caixa
(linhas=métricas, colunas=meses+Total): "Receita orçada" e "Despesas
orçadas" são **editáveis inline** (clique no valor, edita, sai do campo
salva) — único lugar do sistema com edição direto na célula da tabela, os
demais fluxos usam modal. Linhas de realizado/% da meta/Lucro-Perda são só
leitura. Fórmulas replicadas da aba `BUDGET` da planilha original:
% da meta = (realizado − orçado) ÷ orçado; Lucro/Perda = receita
realizada − despesas pagas (por mês e no total do ano).

**⚠️ Atenção ao assumir a sessão:** **nada foi commitado ainda** —
o último commit continua sendo `997412c` (09-08-2026), e desde então
já são **duas sessões inteiras** de trabalho acumulado (09-08 e
10-08) sem nenhum commit (não foi pedido em nenhuma das duas). Rode
`git status` e `git log` antes de qualquer operação destrutiva
(`checkout`, `reset`, `clean`) e considere sugerir ao usuário que faça
um commit em algum ponto seguro — o volume acumulado já é grande o
bastante pra um `git reset --hard` acidental doer bastante.

---

## Perfil do usuário

Alessandro **não é programador**. Ele é o dono do produto e o testador.

- Não explique o que o código faz nem como foi implementado
- Diga apenas **o que testar** e **quais comandos rodar**
- Uma sprint por vez, validada antes de seguir
- Respostas curtas e diretas

---

## Ambiente

```
D:\projeto\SaaS\AlePejoERP\alepejo-erp-cloud\
├── Backend\    NestJS + Prisma + PostgreSQL (porta 3001)
├── frontend\   Next.js 16 + React 19 + Tailwind 4 (porta 3000)
└── docs\       documentação
```

Banco: PostgreSQL em `localhost:5433`, base `alepejo`.
Shell: PowerShell no Windows.

Comandos:
```powershell
# Backend
cd Backend
npm run start:dev
npx tsc --noEmit
npx prisma migrate dev
npx ts-node prisma/seed.ts

# Frontend
cd frontend
npm run dev
npx tsc --noEmit
```

Login do seed: `alessandro.lourenco@alepejo.com.br` / `Lore@251378`

---

## Decisões de arquitetura já tomadas (não reverter)

**Autenticação por cookie httpOnly.** Tokens não ficam em localStorage.
O frontend não lê o token; usa `GET /auth/me` para saber quem está logado.
Axios com `withCredentials: true` e renovação automática com fila.

**Guards globais no backend** (`app.module.ts`, via `APP_GUARD`), nesta ordem:
JwtAuthGuard → LicenseGuard → PermissionsGuard. Rotas públicas usam `@Public()`.
Não registrar guards em `main.ts` (causava execução dupla).

**companyId sempre do JWT**, nunca do body ou da URL. Use `@CurrentUser('companyId')`.
Todo repository filtra por companyId.

**IDs são cuid, não UUID.** Nunca usar `@IsUUID()` nos DTOs — usar `@IsString()`.

**Mensagens de validação traduzidas globalmente** no `exceptionFactory` do
`main.ts`, por tipo de regra. Não repetir `message:` em cada DTO.

**Cadastro único de parceiros (BusinessPartner)** com papéis:
CUSTOMER, SUPPLIER, CARRIER, SALES_REP. Substituiu Client e Supplier.
Venda exige papel CUSTOMER; compra exige SUPPLIER.

**Telas de listagem usam `ListPageLayout`**
(`frontend/src/components/layout/ListPageLayout.tsx`): cabeçalho (título,
ações, busca, filtros) fixo, e os resultados num painel com rolagem
própria. O `<thead>` da tabela leva `sticky top-0 z-10` para o cabeçalho
das colunas acompanhar. Não usar `sticky` direto sobre um container que
já tem `overflow-auto` + `rounded-*` — o navegador deixa o conteúdo
vazar por cima.

**Cores por tokens CSS** em `frontend/src/app/globals.css`.
Nunca usar classes fixas do Tailwind (`bg-white`, `text-zinc-500`) — elas
não acompanham o tema. Paleta: preto + cinza + branco + azul (o dourado
foi removido em 07/08/2026 a pedido do usuário). Tema escuro pela classe
`.dark` (next-themes).

**Licenciamento por módulo.** Controllers usam `@Module('CODIGO')`.
Códigos: BPS, PRODUCTS, INVENTORY, PURCHASE, SALES, FINANCE, BRANDING.
Menu do frontend filtra por licença + permissão via hook `useMenu`.
BRANDING é add-on: fica de fora do loop que inclui todo módulo no plano
padrão (`Backend/prisma/seed.ts`, array `ADDON_MODULE_CODES`) — uma
empresa só tem acesso se for habilitado individualmente
(`CompanyModule`). A empresa seed (ALEPEJO) já vem com ele habilitado
para dar pra testar.

**Uploads (logo, avatar) usam nome com timestamp.** Nunca usar nome
fixo por tipo (`light.png`) — o navegador cacheia por URL, então trocar
o conteúdo sem trocar o nome faz a imagem antiga continuar aparecendo.
Padrão adotado: `{tipo}-{Date.now()}.{ext}`, com limpeza do arquivo
anterior no mesmo diretório (ver `removeOldLogoFiles` em
`company-branding.service.ts` e `removeOldAvatarFiles` em
`profile.service.ts`).

**Cookie de login sem prazo fixo (cookie de sessão).** A pedido do
usuário, por segurança: fechar o navegador desloga. `alepejo_at`/
`alepejo_rt` são setados sem `maxAge`/`Expires`
(`cookie.constants.ts`) — o navegador apaga ao fechar de verdade (não
só a aba; alguns navegadores com "continuar de onde parei" ativado não
respeitam isso, é limitação do navegador, não do app). A validade do
token em si continua vindo de `JWT_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN`
no `.env` (1h/7d, hoje realmente lidos via
`auth/constants/token.constants.ts` — antes eram ignorados).

**Numeração sequencial de documentos.** `DocumentSequence`
(`companyId` + `type` → `lastNumber`) incrementado atomicamente via
`upsert` com `increment` dentro da mesma transação que cria o
documento (`DocumentSequenceService.next`, em
`core/document-sequence/`). Usado por Orçamento (`QUOTE`), Pedido de
Venda (`SALES_ORDER`), Cotação (`QUOTATION`) e Pedido de Compra
(`PURCHASE_ORDER`). Número é `Int` cru no banco; o prefixo
(`ORC-`/`PV-`/`COT-`/`PC-` + 6 dígitos) é só formatação no frontend.

**Documentos de origem travam ao virar documento final.** Orçamento e
Pedido de Venda ficam `DRAFT` (editável) até uma Venda nascer a partir
deles (`Sale.quoteId`/`Sale.salesOrderId`, ambos `@unique`) — aí viram
`CONVERTED` e não editam mais. Mesmo padrão para Cotação → Pedido de
Compra → Compra. Nunca dois documentos finais a partir do mesmo
original (garantido pelo `@unique` na FK).

**Estoque: saldo disponível ≠ saldo total.** `Inventory` tem
`quantity` (físico) e `blockedQuantity`/`reservedQuantity`/
`quarantineQuantity`/`damagedQuantity` (retenções, model `StockHold`,
histórico de bloqueio/liberação nas Movimentações). Disponível =
`quantity` menos as 4 retenções (`calculateAvailableQuantity` em
`core/utils/inventory.util.ts`). Vendas valida contra o disponível, não
o total.

**Vencimento nunca cai em fim de semana.** `calculateDueDate` em
`core/utils/business-day.util.ts` soma os dias e empurra pro próximo
dia útil se cair em sábado/domingo. Usado em Compras, Vendas e no
recebimento (recalcula a partir da data de emissão da nota, não da
data de lançamento).

**Datas sempre pt-BR (dia-mês-ano), nunca formato americano.** Todo
`toLocaleDateString`/`toLocaleString` do frontend já passa `"pt-BR"`
explícito — manter esse padrão em telas novas. Cuidado ao reaproveitar
uma data que já veio do backend (ISO completo, `2026-08-08T00:00:00Z`)
em algo que espera só `AAAA-MM-DD` (ex.: `calculateDueDatePreview`) —
sempre `.slice(0, 10)` antes, senão `new Date(...).toISOString()`
quebra com "Invalid time value".

**Modais e telas de formulário em layout paisagem.** A pedido do
usuário: largos e baixos, não estreitos e altos. Preferir `max-w-4xl`
pra cima com grids de 3-4 colunas (`sm:grid-cols-2 lg:grid-cols-4` por
ex.) em vez de `max-w-xl`/`max-w-2xl` com 1-2 colunas. Vale para telas
novas e ao revisitar as existentes.

---

## Situação atual

### Pronto e validado
- Identidade, RBAC, licenciamento
- Parceiros (clientes/fornecedores unificados, com máscaras e busca CNPJ/CEP)
- Produtos + categorias, marcas, unidades (exclusão bloqueada se em uso)
- Menu agrupado por módulo com submenus
- Dashboard com contagens reais
- Estoque: saldo, entrada/saída/ajuste, depósitos, movimentações
  (`/erp/estoque`) — inclui custo médio ponderado. Retenções de saldo:
  bloqueado/reservado/quarentena/avariado (botão de cadeado na
  listagem), cada retenção gera linha em Movimentações (bloqueio e
  liberação, com motivo). Coluna "Disponível" e "Bloqueado/retido" na
  listagem.
- Compras: lançamento (com Dias a vencer/Vencimento calculado/Forma de
  pagamento, e busca por código de barras nos itens), aprovação,
  recebimento, estornar recebimento (bloqueado se já tiver pagamento no
  financeiro), cancelamento (`/erp/compras`). Pode nascer de um Pedido
  de Compra ("Criar a partir de").
  - **Recebimento** abre um modal: Nº da nota fiscal, chave de acesso
    (NF-e), data de emissão, tipo de documento (auto-sugere Nota Fiscal
    se vier chave), e Dias a vencer/Vencimento/Forma de pagamento
    (pré-preenchidos do lançamento, editáveis com o que estiver na nota
    de verdade). Tudo isso já sai certo no título de Contas a pagar —
    não precisa editar lá depois. Ver `PurchaseService.receive()`.
- Vendas: lançamento (idem: prazo/vencimento/forma de pagamento e
  código de barras), aprovação (dá baixa no estoque, bloqueia se saldo
  **disponível** insuficiente), desfazer aprovação (bloqueado se já
  tiver recebimento no financeiro) (`/erp/vendas`). Ao cadastrar com
  saldo insuficiente, avisa e pergunta se quer registrar mesmo assim
  (fica em rascunho — só a aprovação trava de verdade). Pode nascer de
  um Orçamento ou Pedido de Venda ("Criar a partir de").
- **Orçamento** (`/erp/vendas/orcamentos`, numeração `ORC-000001`) e
  **Pedido de Venda** (`/erp/vendas/pedidos`, `PV-000001`): cadastro,
  edição enquanto rascunho, cancelamento. Uma Venda pode puxar os dados
  de qualquer um dos dois (vira `CONVERTED`, trava).
- **Cotação** (`/erp/compras/cotacoes`, `COT-000001`): cadastra os
  itens a cotar (sem preço), adiciona até 3 propostas de fornecedores
  diferentes (preço por item, prazo, forma de pagamento) e escolhe a
  vencedora — isso já **gera o Pedido de Compra automaticamente** com
  os dados do fornecedor escolhido (`QuotationService.chooseWinner`).
- **Pedido de Compra** (`/erp/compras/pedidos`, `PC-000001`): cadastro,
  edição enquanto rascunho, cancelamento; pode nascer do zero ou de uma
  cotação decidida. Uma Compra pode puxar os dados de um pedido
  ("Criar a partir de").
- Busca com sugestão por digitação (`SearchSelect`,
  `frontend/src/components/ui/SearchSelect.tsx`) para cliente/fornecedor e
  produto em Compras e Vendas
- Paleta de cores: preto + cinza + branco + azul (dourado removido em
  07/08/2026 a pedido do usuário)
- Financeiro — Sprint 1: Plano de contas (`/erp/financeiro/plano-contas`),
  módulo licenciável `FINANCE`. Importadas as 78 contas da aba
  CAD_DESPESAS da planilha original como ponto de partida (só estrutura,
  sem valores). Modelo já suporta hierarquia (`parentId`) para o futuro,
  mas a tela ainda não expõe isso.
- Classificação do plano de contas virou cadastro próprio
  (`ChartOfAccountClassification`), com busca e opção de criar uma nova
  direto no formulário da conta (componente `SearchSelect` ganhou suporte
  a `onCreate`). Código da conta tem máscara `00.00.00`.
- Financeiro — Sprint 2: Contas a pagar (`/erp/financeiro/pagar`) e a
  receber (`/erp/financeiro/receber`), model único `FinancialEntry` com
  `type: RECEIVABLE | PAYABLE`. Nascem automaticamente ao **receber uma
  compra** (a pagar) e ao **aprovar uma venda** (a receber) — ver
  `PurchaseService.receive()` e `SaleService.approve()`. Suportam baixa
  (pagamento/recebimento), estorno de baixa e cancelamento. Tela
  compartilhada em `frontend/src/components/financial/FinancialEntriesScreen.tsx`.
- Financeiro — Sprint 3: Fluxo de caixa (`/erp/financeiro/fluxo-caixa`),
  calculado a partir de Contas a Pagar/Receber (não é lançado direto).
  Endpoint `GET /financial-entries/cash-flow?year=`, agrega por mês:
  total, recebido/pago (settled), a receber/a pagar (open), atrasado
  (overdue). Tela com cores (verde=recebido/pago, azul=a receber,
  laranja=a pagar, vermelho=atrasado) e negrito em todas as linhas.
  "Pago" (despesas) mudou de laranja pra verde em 08-08-2026 a pedido
  do usuário — antes usava a mesma cor de "A pagar" e confundia.
  Dashboard (`frontend/src/app/page.tsx`) ganhou 2 cards reais: "A
  pagar/receber" (pendente do mês) e "Fluxo de caixa" (realizado no ano
  até o mês atual).
- **Financeiro — Orçamento** (`/erp/financeiro/orcamento`): comparativo
  orçado x realizado por mês, ver resumo da sessão no topo do documento
  pra detalhes (módulo `budgets`, permissões `budget.view`/
  `budget.manage`, edição inline na tabela).
- **Módulo BRANDING (Personalização)** — add-on pago, dá acesso a
  `/erp/configuracoes/personalizacao` (menu Sistema → Personalização,
  ícone de monitor). Dentro dela:
  - Seção "Da empresa" (só com o módulo licenciado): logo clara/escura,
    nome do sistema (substitui "AlePejo ERP Cloud" em todo canto —
    fonte encolhe sozinha pra caber, nunca corta palavra no meio, máx.
    40 caracteres), botão de tema claro/escuro (fica oculto sem essa
    chave — ver `ThemeProvider`/`TopBar`/`Brand`), e layout do menu
    (Vertical ou Horizontal — ver `HorizontalNav.tsx`, alternativa à
    `Sidebar.tsx`, escolhida em `AppShell.tsx`). Cada item tem chave
    própria (liga/desliga independente): desligado usa o padrão AlePejo
    naquele item mesmo com arquivo/nome já salvo.
  - Seção "Minha conta" (sempre visível, não depende do módulo): foto
    de perfil por usuário (não por empresa), com o mesmo esquema de
    liga/desliga + upload. Aparece no lugar das iniciais no avatar do
    topo. Backend: `Backend/src/modules/identity/profile/`.
  - **Tela de login NÃO usa nada disso** — a pedido do usuário, fica
    sempre fixa (vídeo AlePejo padrão, nome "AlePejo"). Não reintroduzir
    branding público ali sem confirmar de novo.
- **Menu do usuário** (`frontend/src/components/layout/UserMenu/`): o
  grupo "Sistema" (Licenciamento, Configurações, Personalização) saiu
  da navegação principal e virou dropdown no avatar do `TopBar`, junto
  com "Sair". Lista fica em `systemMenuItems` (`Sidebar/menu.ts`),
  reaproveitada pelo dropdown — não duplicar os itens lá.

- **Movimentação de estoque ganhou coluna própria "Documento"**
  (`StockMovement.documentNumber`, migration
  `20260808214332_add_stock_movement_document_number`), separada da
  "Observação" — aparece em `/erp/estoque/movimentacoes`.
  - Entrada/Saída manual: modal trocou o campo livre "Observação" por
    "Tipo de documento" (enum `FinancialDocumentType`) + "Número do
    documento", compostos em texto (ex.: "Boleto nº 77700") e
    gravados em `documentNumber` (`observation` fica vazio). Ajuste
    continua só com observação livre.
  - Compra (recebimento/estorno) e Venda (aprovação/cancelamento)
    passaram a gravar o **número formatado do documento**
    (`C000000006`/`V000000007`) em `documentNumber` — antes usavam o
    ID interno (cuid) cru. Busca (`search`) na listagem de
    movimentações também passou a bater em `documentNumber`, não só
    em `observation`.
  - `observation` do recebimento de Compra (`ENTRY`) e da aprovação
    de Venda (`EXIT`) agora é composta como
    "Entrada/Saída + tipo do documento + número da nota" (usa os
    dados fiscais informados no recebimento/aprovação — chave de
    acesso, nº da nota, tipo), ex.: "Entrada Nota fiscal 121212" /
    "Saída Nota fiscal 121131313". Sem dados fiscais informados, cai
    só em "Entrada"/"Saída". Estorno de compra e cancelamento de
    venda continuam com texto fixo ("Estorno do recebimento da
    compra"/"Cancelamento da venda") — não pedido, não mexido.
- **Forma de pagamento ganhou "Boleto"** (enum `PaymentMethod`,
  migration `20260808214703_add_boleto_payment_method`) — aparece em
  todos os selects de forma de pagamento (Compras, Vendas,
  Financeiro).
- **Aprovação de Venda ganhou o mesmo processo do recebimento de
  Compra.** Aprovar uma venda (`/erp/vendas`, botão "Aprovar") agora
  abre um modal com os dados fiscais da nota fiscal de venda: Nº da
  nota, chave de acesso (auto-sugere Nota Fiscal se vier chave, igual
  compras), data de emissão, tipo de documento, e
  Dias a vencer/Vencimento (calculado)/Forma de pagamento — pré-
  preenchidos do lançamento, editáveis com o que estiver na nota de
  verdade. Gera automaticamente o título em Contas a receber já com
  tudo certo (`SaleService.approve()`, `ApproveSaleDto`, mesmo padrão
  do `PurchaseService.receive()`). `Sale` ganhou os campos
  `invoiceKey`/`invoiceIssueDate` (schema, migration
  `20260808212133_add_sale_invoice_key_date`) — `invoiceNumber` já
  existia. Endpoint `PATCH /sales/:id/approve` agora aceita body
  (antes não aceitava nada).
- **Numeração sequencial de Compra e Venda.** Além dos documentos de
  origem (ORC/PV/COT/PC), agora Compra (`Purchase`) e Venda (`Sale`)
  também têm número sequencial próprio por empresa (`DocumentSequence`,
  tipos `PURCHASE`/`SALE`), gerado na criação. Formato sem hífen, a
  pedido do usuário: `C` + 9 dígitos para compra (`C000000001`), `V` +
  9 dígitos para venda (`V000000001`) — funções `formatPurchaseNumber`/
  `formatSaleNumber` em `purchase.service.ts`/`sale.service.ts`
  (frontend). Coluna "Número" nas listagens de Compras, Vendas e
  Recebimento, e nos modais de detalhe/recebimento. Campo de busca
  (`search`) nas 3 telas: aceita o número (ex.: "4" ou "C000000004")
  ou nome do fornecedor/cliente — filtro no backend
  (`PurchaseFilterDto`/`SaleFilterDto`, repositórios fazem `OR` entre
  `partner.tradeName`/`legalName` contains e `number` exato).
  Migration `20260808190000_add_purchase_sale_number` fez o backfill
  dos registros já existentes (numerados por ordem de criação) e
  ajustou o contador do `DocumentSequence` para continuar dali.
- **Coluna "Quantidade"** na listagem de Compras (soma das
  quantidades dos itens) — Vendas já tinha o equivalente
  ("Qtd. vendida").
- **Recebimento de compras** ganhou tela própria
  (`/erp/compras/recebimento`, menu Compras → Recebimentos),
  separada da listagem de Compras. Mostra pendentes (`APPROVED`) e
  recebidas (`RECEIVED`), com o mesmo modal de dados fiscais de
  antes, agora com uma conferência de itens por código de barras
  (visual, não altera as quantidades da compra). Estornar
  recebimento e cancelar (quando aprovada, ainda não recebida)
  também estão aqui. A tela `/erp/compras` manteve o botão "Receber"
  como atalho (`?open=<id>` abre o modal já pronto na tela de
  Recebimento) mas perdeu o botão "Estornar recebimento", que agora
  só existe na tela de Recebimento.
  - Conferência por código de barras tem semáforo por item: cinza
    (nada lido) → amarelo (leitura parcial) → verde com check
    (bateu a quantidade pedida). Cores via tokens `--warning`/
    `--success`/`--border`.
  - Campo "Multiplicador" ao lado do código de barras (padrão 1):
    cada leitura soma esse valor em vez de sempre +1 — usado para
    caixa fechada (ex.: 12 un. por caixa). Trava no total pedido do
    item, nunca ultrapassa.
  - Modal de recebimento virou layout empilhado (não mais 2 colunas
    lado a lado): código de barras em cima em largura cheia, depois
    nota fiscal, depois dados financeiros — todos com a mesma
    largura, sem bloco centralizado à parte.
  - **Bug real corrigido**: o campo "Qtd." do multiplicador
    (`w-20` colado em `fieldClass`, que já embute `w-full`) perdia a
    disputa de CSS pro `w-full` (Tailwind resolve por ordem no
    stylesheet gerado, não pela ordem no atributo `class`) — o campo
    de multiplicador ficava gigante e o de código de barras
    espremido a ~50px, quase invisível. Corrigido trocando a classe
    de largura por `style={{ width: "5rem" }}` (inline sempre vence
    classe). **Mesmo padrão de bug encontrado em
    `compras/cotacoes/page.tsx` (input de preço da proposta, `w-40`)
    — ainda não corrigido lá, ver task sinalizada.**

- **Módulo RH — Sprint 1 (Funções/Cargos).** Add-on licenciável
  (código `HR`, igual padrão do `BRANDING` — a empresa seed já tem
  habilitado). Menu "Recursos Humanos" com "Funções e cargos",
  "Setores, horários e EPI" e agora "Colaboradores" ativos;
  "Ficha de EPI"/"Exames"/"Aniversariantes" continuam desabilitados
  (sprints seguintes).
  - **Tabela CBO** (`CboOccupation`, model global sem `companyId`,
    só leitura) — 2.445 ocupações oficiais (CBO 2002), importadas de
    um dataset público (`datasets-br/cbo`
    no GitHub, lista canônica código+título) salvo em
    `Backend/prisma/data/cbo.csv` e semeado no `seed.ts`
    (`prisma.cboOccupation.createMany`). Endpoint `GET /cbo?search=`
    alimenta um `SearchSelect` no campo CBO de Função — ao escolher,
    o backend resolve e grava `cboTitle` (título oficial) a partir
    do `cboCode`, o frontend nunca envia o título.
  - **Cadastros auxiliares novos** (`Sector`/Setor,
    `WorkSchedule`/Horário, `PpeType`/Tipo de EPI) — mesmo padrão
    dos cadastros de produto (soft delete + restore, bloqueia
    exclusão se em uso por alguma Função). Tela única
    `/erp/rh/cadastros` reaproveitando o componente genérico
    `SimpleCrudPanel` (o mesmo de Categorias/Marcas/Unidades em
    Produtos).
  - **Função** (`JobFunction`, `/erp/rh/funcoes`): nome, descrição,
    CBO (código + título resolvido), Setor, Horário, salário base,
    tipo de salário (enum `SalaryType`: Mensalista/Horista/
    Diarista/Comissionado/Outro), "exige EPI" (checkbox que revela
    checklist multi-seleção dos Tipos de EPI cadastrados —
    relação N:N implícita do Prisma `JobFunction.ppeTypes`).
  - **Dados reais migrados da planilha** `CAD_FUNCAO` (aba da
    "Controle Dedicar V1.0"), semeados pro seed da empresa ALEPEJO:
    5 setores, 1 horário ("Comercial (Seg a Sex)" —
    SEG A SEX: 07:30-12:00 | 13:12-17:30), 5 tipos de EPI, 11
    funções completas (com CBO real cruzado contra a tabela
    oficial). **Colaboradores NÃO serão migrados da planilha**
    quando esse sprint chegar — dados pessoais/sensíveis, só a
    estrutura do cadastro.
  - Migrations: `20260809024747_add_hr_sector_jobfunction_cbo`,
    `20260809025115_add_hr_work_schedule_ppe_type`.

- **Módulo RH — Sprint 2 (Colaboradores).** `/erp/rh/colaboradores`
  — cadastro completo (model `Employee`, migration
  `20260809171753_add_hr_employee`), formulário em **7 abas** dentro
  do mesmo modal (não um formulário único), a pedido do usuário:
  Pessoais, Documentos, Contato, Contratuais, Saúde e benefícios,
  EPI, Dependentes.
  - **Pessoais**: nome, pai/mãe, nascimento, sexo, naturalidade
    (cidade/UF), estado civil, escolaridade (enums `Gender`/
    `MaritalStatus`/`EducationLevel`).
  - **Documentos**: CPF (máscara + único por empresa —
    `@@unique([companyId, cpf])`, aceita múltiplos nulos), RG, CTPS,
    série, PIS.
  - **Contato**: CEP com autopreenchimento via ViaCEP
    (`lookupService.cep`, mesmo padrão do cadastro de Parceiros —
    chamada direta do browser pro ViaCEP, sem passar pelo backend),
    logradouro/número/bairro/cidade/UF, telefone/celular (máscara),
    e-mail.
  - **Contratuais**: Função (`SearchSelect` em `JobFunction`, ao
    escolher pré-preenche salário/tipo/horário da função como
    sugestão — só se o campo ainda estiver vazio, não sobrescreve o
    que o usuário já digitou), Horário, Status (enum
    `EmployeeStatus`: Experiência/Ativo/Afastado/Demitido), salário,
    tipo de salário, forma de pagamento (reaproveita o enum
    `PaymentMethod` já usado em Compras/Vendas/Financeiro, agora com
    Boleto), datas (admissão, vence experiência, previsão de
    término, demissão).
  - **Saúde e benefícios**: data do exame/próximo exame/dias de
    aviso/exame concluído/afastado + vale transporte/chave e número
    do armário + observações.
  - **EPI**: não é cadastro — mostra em tempo real (busca a Função
    escolhida na aba Contratuais) quais EPIs ela exige, só leitura.
    A ficha de entrega de verdade (assinatura, data, quantidade)
    fica pro sprint de EPI.
  - **Dependentes**: tabela filha (`EmployeeDependent`), sem limite
    fixo de 5 como na planilha original — nome, nascimento,
    parentesco (enum `DependentRelationship`). No update, a lista
    inteira é substituída (`deleteMany` + `create` numa única
    chamada) — mais simples que diffar quem mudou, e a lista nunca é
    grande.
  - **Não foram migrados dados de colaboradores da planilha** — só a
    estrutura, a pedido do usuário (dados pessoais/sensíveis).

- **Módulo RH — Sprint 3 (Ficha de EPI).** `/erp/rh/epi` —
  registro de entrega de EPI por colaborador + geração da ficha
  assinada, replicando o layout exato da aba `FICHA_EPI` da
  planilha original (model `PpeDelivery`, migration
  `20260809180257_add_hr_ppe_delivery`).
  - Tela de gestão: busca o colaborador (`SearchSelect`), lista as
    entregas (Data/EPI/CA/Qtde), "Nova entrega" (tipo de EPI, CA —
    Certificado de Aprovação, que fica na entrega e não no cadastro
    do tipo porque varia por lote/fabricante —, quantidade, data) e
    exclusão. Sem edição — só criar/excluir (ficha física assinada
    não devia ser "editada" depois).
  - **Ficha impressa**: `/erp/rh/epi/ficha/[employeeId]`, página
    própria fora do `AppShell` (sem sidebar/topbar), com botão
    Imprimir (`window.print()`). Reproduz o texto legal da planilha
    (declaração conforme Portaria 3214/78, NR-6, item 6.7) com o
    **nome da empresa dinâmico** (`companyService.getMine()` →
    `/companies/me`, novo `frontend/src/services/company.service.ts`
    — antes não existia um service pra esse endpoint, só o de
    branding) no lugar do "CONFECÇÕES DEDICAR" fixo da planilha
    original (múltiplas empresas usam o mesmo sistema). Tabela
    Data/Especificação/CA/Qtde/Assinatura com as entregas reais +
    3 linhas em branco pra anotar à mão.
  - **Ajuste correlato**: o rodapé de marca fixo
    (`BrandFooter.tsx`, aparece em toda tela — "AlePejo ERP Cloud")
    ganhou `print:hidden`, senão vazava pro papel em qualquer
    impressão do sistema, não só na ficha de EPI.

- **Módulo RH — Sprint 4 (Relatórios, última do módulo).** Fecha o
  módulo RH.
  - **Aniversariantes** (`/erp/rh/aniversariantes`): seletor de mês
    (setas, padrão mês atual), lista colaboradores ativos com
    aniversário no mês, ordenada por dia. Endpoint
    `GET /employees/reports/birthdays?month=`.
  - **Etiquetas CTPS** (`/erp/rh/etiquetas-ctps`): busca o
    colaborador (`SearchSelect`) e gera uma etiqueta imprimível
    (página própria fora do `AppShell`, mesmo padrão da ficha de
    EPI) com nome da empresa/CNPJ, função, setor, data de admissão,
    horário de trabalho, CTPS/série, PIS e salário — numeral e por
    extenso. Não replica o layout exato da aba `REL_ETIQ_CTPS` da
    planilha original (era um gerador de anotação avulsa via
    fórmulas/VBA quebradiças, só 1 colaborador por vez, sem grade de
    62 colunas de verdade) — decisão tomada por conta própria,
    priorizando os campos que uma anotação de CTPS realmente precisa.
    Número por extenso: util novo `frontend/src/lib/currencyToWords.ts`
    (conversor BRL → português, sem dependência externa).
  - **Indicadores** (`/erp/rh/indicadores`): cards (total de
    colaboradores ativos, média salarial geral) + tabelas por
    função (com média salarial da função), por setor, por status,
    por sexo. Endpoint `GET /employees/reports/indicators`.
  - As 3 rotas reaproveitam a permissão `employee.view` (nenhuma
    permissão nova criada). Agregação feita em memória no
    `EmployeesService` (`getBirthdays`/`getIndicators`), a partir de
    `EmployeesRepository.findActiveForReports` — sem novo módulo
    Nest, os endpoints ficam em `EmployeesController` sob
    `/employees/reports/*` (declarados **antes** da rota `:id` no
    controller, senão o Nest tentaria casar "reports" como um id).

### Próximo na fila
1. ~~Avisar o fornecedor vencedor da cotação por e-mail~~ — **feito em
   10-08-2026**, ver resumo da sessão no topo do documento.
   ~~WhatsApp~~ — **feito em 10-08-2026** (Baileys), ver resumo da
   sessão no topo. **Falta só o usuário parear de verdade** com um
   número de teste/secundário em `/erp/configuracoes/whatsapp` (clicar
   Conectar, escanear o QR) — o código já está testado e funcionando.
2. ~~Relatórios mais completos~~ — **feito em 10-08-2026**, 13
   relatórios dentro do menu "Relatórios", ver resumo da sessão no
   topo. Ainda dá pra adicionar (usuário não pediu ainda): Estoque,
   Movimentações (ficaram de fora da lista que ele pediu — só
   perguntar se ele quiser).
3. ~~Produção — fluxo de 3 etapas~~ — **feito em 11-08-2026**
   (backend e frontend, incluindo tela de Acompanhamento), ver
   "Módulo de Produção — etapas" no topo do documento. Fora do
   pedido desta rodada, ainda em aberto: ficha técnica/BOM (consumo
   de matéria-prima), campo de lote mínimo por produto na tela de
   cadastro de Produtos (o campo já existe no banco, só falta a
   tela).
3.1. ~~Controle de Ponto (módulo LABOR)~~ — **iniciado em
   11-08-2026**: batidas (manual/API/leitor), aprovação por dia,
   faltas/abonos, ver resumo da sessão no topo. **Falta**: banco de
   horas/jornada esperada (só tem total bruto do dia hoje), relatório/
   indicadores de ponto, geração de QR/etiqueta de crachá por
   colaborador.
3.2. **Folha de Pagamento (mesmo módulo LABOR) — não iniciada,
   decisão explícita do usuário de deixar pra uma sessão separada**
   (11-08-2026, ver resumo da sessão no topo). Holerite, cálculo com
   INSS/IRRF/FGTS e o que mais precisar. **Nada foi pesquisado
   ainda** — o primeiro passo de quando for retomado é pesquisar na
   web as tabelas/percentuais atuais (não existem na planilha
   original, é tema totalmente novo pro sistema). Retomar com calma,
   é a área de maior risco (dinheiro real do colaborador) de todo o
   sistema até agora.
4. **Multi-empresa — decisão tomada, implementação adiada de propósito**
   (09-08-2026). Diagnóstico: o **isolamento de dados já é sólido** —
   todo repository filtra por `companyId` vindo do JWT, empresas
   diferentes já não se veem. A lacuna real é em identidade/login:
   `User.companyId` é fixo (1 usuário = 1 empresa) e `User.email` é
   `@unique` **global**.
   - Cogitou-se só trocar pra `@@unique([companyId, email])`, mas o
     usuário identificou o problema certo: **como não há domínio por
     empresa** (login é uma tela única de e-mail+senha, sem subdomínio
     nem seletor), o sistema não teria como saber sozinho qual empresa
     escolher se o mesmo e-mail existisse em mais de uma — precisaria
     pedir empresa na tela de login ou mostrar uma lista de contas
     batendo.
   - **Modelo escolhido: 1 login, várias empresas** (mesmo padrão
     Slack/Notion) — `User.email` continua único no sistema todo (não
     muda), mas um usuário passa a poder ter vínculo com mais de uma
     empresa via tabela nova N:N (`UserCompany` ou nome parecido) +
     seletor de empresa ativa dentro do sistema (não no login). Evita
     o problema de identificação por completo.
   - **Adiado de propósito** — usuário pediu pra ficar só registrado
     aqui, focar primeiro nos ajustes de RH Colaboradores (ver abaixo).
     Quando for retomado: não implementar o modelo alternativo
     (e-mail único por empresa + seletor no login), a decisão já foi
     tomada.

---

## Pendências conhecidas

- Produto não tem o campo REF (referência do fabricante) que existe na planilha.
- Cadastros auxiliares (categorias, marcas, unidades) não passam pelo
  LicenseGuard, só por permissão.
- Aviso do Prisma sobre `package.json#prisma` estar depreciado (migrar para
  `prisma.config.ts` antes do Prisma 7).
- `Company.brandingLoginVideoEnabled` existe no banco mas não é mais usado
  em lugar nenhum do código (o toggle de vídeo no login foi removido a
  pedido do usuário — tela de login não depende de personalização). Pode
  ser removido numa migration futura; não é urgente.
- `/erp/licenciamento` está no menu (agora dentro do dropdown do avatar)
  mas a página ainda não existe no frontend — dá 404. Endpoints de
  backend já existem (`identity/license`), só falta a tela.
- `HorizontalNav` (menu horizontal) não tem tratamento específico para
  mobile — em telas estreitas os itens quebram linha (`flex-wrap`), não
  foi pedido nada além disso ainda.
- ~~Não existe infraestrutura de e-mail~~ — **feito em 10-08-2026**
  (`NotificationsModule`/`EmailNotificationsService`, nodemailer, SMTP
  Gmail já configurado e testado). WhatsApp (Baileys) continua
  pendente, ver "Próximo na fila" item 1.
- **Aviso de aniversário do usuário logado** (Visão geral, mensagem
  "Desejando um feliz aniversário") só funciona se `Employee.email`
  bater exatamente com `User.email` (login) — são cadastros
  independentes. No cadastro atual do Alessandro os e-mails são
  diferentes (`ale.lourenco.net@gmail.com` no Colaborador vs
  `alessandro.lourenco@alepejo.com.br` no login), então a mensagem não
  aparece pra ele hoje. Testado forçando os e-mails iguais e funciona
  certo. **Perguntei ao usuário se quer igualar os e-mails ou linkar
  por outro campo (ex.: `Employee.userId`) — ele não respondeu ainda,
  ficou testando outras coisas.** Retomar essa pergunta antes de
  mexer nisso.
- Cotação/Pedido de Compra/Orçamento/Pedido de Venda não têm tela de
  edição de item avulsa nem duplicação — só editar tudo de novo
  enquanto DRAFT.
- Depois de escolher o vencedor de uma cotação, não dá pra trocar de
  ideia (não existe "desfazer decisão") — é definitivo, só cancelar o
  Pedido de Compra gerado se precisar refazer.
- ~~Bug de CSS em `compras/cotacoes/page.tsx` (input de preço da
  proposta esticando)~~ — corrigido junto da máscara de moeda (ver
  resumo da sessão 09-08-2026 no topo do documento): o novo
  `CurrencyInput` separa classe visual (`className`, vai no `<input>`)
  de classe de layout (`wrapperClassName`, vai no `<div>` que envolve o
  campo), então não tem mais o conflito de `w-full` vs `w-40` que
  existia antes.
- Ficha de EPI (`/erp/rh/epi`) não tem edição de entrega, só
  criar/excluir (decisão deliberada — ficha assinada não devia ser
  "editada" depois, só corrigida excluindo e recriando).

---

## Origem do escopo

A planilha `Controle Dedicar V1.0 - original(1).xlsm` na raiz é a referência
funcional. Ela foi feita para uma confecção, mas **o produto é um SaaS para
qualquer empresa**: o núcleo (parceiros, produtos, estoque, compras, vendas,
financeiro) é genérico, e Produção e RH ficam como módulos licenciáveis
opcionais.

O mapeamento aba-a-aba está em `07-Escopo-Planilha.md`.

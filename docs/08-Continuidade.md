# Continuidade do projeto — leia antes de começar

Documento de handoff. Se você é uma IA assumindo este projeto, leia este
arquivo e o `07-Escopo-Planilha.md` antes de alterar qualquer coisa.

Atualizado em: 10-08-2026 (módulo de **Relatórios completo** — 13
relatórios com filtro/exportar/imprimir —, e-mail de vencedor de
cotação implementado de verdade, bug real corrigido no Fluxo de Caixa,
Dados bancários e Afastamento/Férias no cadastro de Colaborador, menu
reorganizado)

**Resumo desta sessão (10-08-2026):**

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
   **WhatsApp continua pendente**: confirmado usar **Baileys**
   (biblioteca não-oficial, grátis, pareia via QR code com um número de
   WhatsApp normal — usuário aceitou o risco de bloqueio do número pela
   Meta por não ser API oficial; recomendar número de teste/secundário,
   não o principal da empresa). Precisa: instalar
   `@whiskeysockets/baileys`, criar um serviço que mantém a sessão
   pareada (estado de auth persistido em disco), expor alguma forma de
   mostrar o QR code pro usuário escanear na primeira vez (dá pra usar
   a ferramenta de Artifact pra renderizar o QR como imagem).
   Destinatário = campo `mobile` do `BusinessPartner` vencedor. Mesmo
   padrão do e-mail: usar `EmailNotificationsService` como referência
   pra criar um `WhatsAppNotificationsService` dentro do
   `NotificationsModule` já existente (`Backend/src/modules/notifications`),
   best-effort, nunca travar `QuotationService.chooseWinner`.
2. ~~Relatórios mais completos~~ — **feito em 10-08-2026**, 13
   relatórios dentro do menu "Relatórios", ver resumo da sessão no
   topo. Ainda dá pra adicionar (usuário não pediu ainda): Estoque,
   Movimentações (ficaram de fora da lista que ele pediu — só
   perguntar se ele quiser).
3. Produção (módulo opcional licenciável, específico de confecção —
   ver `07-Escopo-Planilha.md` seção 4).
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

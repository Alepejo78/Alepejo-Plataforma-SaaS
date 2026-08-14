# Continuidade do projeto — leia antes de começar

Documento de handoff. Se você é uma IA assumindo este projeto, leia este
arquivo e o `07-Escopo-Planilha.md` antes de alterar qualquer coisa.

## 🔵 Endereço da empresa + relatórios com permissão própria (14-08-2026, sessão seguinte à do "Interprise") — LER ANTES DE CONTINUAR

Continuação da lista de pendências (itens 2 e 3 do backlog registrado
na sessão anterior, ver seção "Cadastro de empresa com CPF..." logo
abaixo). Os dois servidores dev (frontend `:3000` e backend `:3001`)
caíram no meio da sessão e precisaram ser religados; depois disso,
**tanto "endereço da empresa" quanto "relatórios com permissão" foram
testados pela tela e confirmados funcionando ponta a ponta** (ver
detalhe no item 8/2 abaixo, incluindo um achado importante sobre como
permissão é agregada entre empresas do mesmo grupo).

### Item 2 do backlog — Endereço da empresa (CONCLUÍDO E TESTADO)

- **`Company` ganhou os mesmos 6 campos de endereço que `Employee` já
  tinha** (migration `20260814140924_company_address`): `zipCode`,
  `street`, `number`, `district`, `city`, `state`. `CreateCompanyDto`/
  `UpdateCompanyDto` atualizados; `Prisma.CompanyCreateInput`/
  `UpdateInput` já cobrem sozinhos (repository é pass-through, não
  precisou mudar).
- **Componente novo `AddressFields`** (dentro do próprio
  `frontend/src/app/erp/configuracoes/page.tsx`, reaproveitado por
  `MyCompanySection` e `EditCompanyModal`) — busca automática por CEP
  no ViaCEP (`lookupService.cep`, já existia, usado antes só no
  cadastro de Parceiro) com foco automático no campo "Número" depois
  de achar (mesmo padrão copiado de `PartnerForm.tsx`).
- **Tabela "Empresas do grupo"** ganhou colunas E-mail e Telefone
  (pedido explícito do usuário).
- **Testado de verdade pela tela**: CEP inválido mostrou "CEP não
  encontrado" corretamente; CEP real (Avenida Paulista, SP) preencheu
  Rua/Bairro/Cidade/UF automaticamente e o foco pulou pro campo
  Número; tabela "Empresas do grupo" mostrando e-mail/telefone reais
  das duas empresas do grupo ALEPEJO.
- **Frontend `company.service.ts`**: `Company`/`CompanyUpdatePayload`
  ganharam os 6 campos novos.

### Item 8/2 do backlog — Relatórios com permissão própria (CONCLUÍDO E TESTADO)

Achado importante ao investigar: **relatórios não têm endpoint próprio
no backend** — cada tela de relatório chama a mesma API já usada pela
tela normal (ex.: relatório de Produtos chama a mesma `GET /products`
que a lista usa). Isso significa que a permissão nova de "Relatório"
só controla a CAMADA de UI (menu + tela do relatório), não é uma
proteção de dado adicional — o dado continua protegido pela permissão
`.view` de sempre. Isso é **consistente de propósito com o resto do
sistema**: o componente `Can` (`frontend/src/components/auth/Can.tsx`)
já documenta isso explicitamente ("ajusta interface... não é pra
proteger dados: autorização real é do backend") — não criei 13
endpoints de relatório novos no backend porque seria desproporcional
ao que já existe.

**Decisão de granularidade** (não perguntei antes, mas é bem
fundamentada — ver raciocínio completo se precisar reabrir): em vez de
13 permissões novas (uma por item de relatório no menu), criei **6,
uma por PermissionGroup que tem pelo menos um relatório** —
`product.report`, `partner.report`, `purchase.report` (cobre
Compras/Recebimentos/Pedidos de compra/Cotações — os 4 já são do mesmo
grupo PURCHASE), `sale.report` (Pedidos de venda/Orçamentos, grupo
SALES), `financial-entry.report` (Contas a receber/pagar, grupo
FINANCIAL_ENTRY — aliás essas duas JÁ compartilhavam a mesma permissão
`.view` antes, não é novidade compartilhar), `employee.report`
(Funções/Exames/Aniversariantes, grupo HR). Isso bate com o desenho da
matriz (1 linha por grupo — não dava pra mostrar 4 toggles distintos
de "Compras" na mesma linha sem redesenhar a tela inteira) e segue o
precedente que o próprio catálogo já tinha antes desta sessão.

- **`Backend/prisma/seed.ts`**: as 6 permissões novas adicionadas nos
  grupos certos (PRODUCT/PARTNER/PURCHASE/SALES/FINANCIAL_ENTRY/HR) —
  vale pra banco novo/recriado do zero.
- **`Backend/prisma/scripts/add-report-permissions.ts`** (novo, rodado
  uma vez nesta sessão contra o banco atual): insere as 6 permissões
  (upsert, idempotente) e concede cada uma pra todo Role com
  `code: 'ADMIN'` — sem isso, toda empresa já existente perderia
  acesso aos relatórios até alguém entrar na matriz e marcar na mão
  (Administrador é descrito como "acesso total ao sistema", ganhar
  permissão nova automaticamente é o comportamento esperado). **Já
  rodado com sucesso**: 6 permissões criadas, 2 perfis Administrador
  encontrados (grupo ALEPEJO), 12 vínculos garantidos. Idempotente,
  pode rodar de novo sem duplicar se precisar (`npx ts-node
  prisma/scripts/add-report-permissions.ts` dentro de `Backend/`).
- **Matriz de permissões**: `GENERIC_COLUMNS` (`permissoes/page.tsx`)
  ganhou `{ key: "report", label: "Relatório" }` — funciona sozinho
  porque os 6 códigos novos terminam em `.report`, mesmo mecanismo de
  sufixo que já resolve Consultar/Cadastrar/Editar/Excluir, não
  precisou de coluna especial tipo `BUSINESS_COLUMNS`.
- **`menu.ts`**: os 13 itens dentro do grupo "Relatórios" trocaram o
  `permission:` da permissão de dado (`product.view`,
  `purchase-order.view` etc.) pro código `.report` correspondente.
- **`ReportAccessGuard`** novo
  (`frontend/src/components/reports/ReportAccessGuard.tsx`) — mostra
  "Sem permissão" em vez do relatório se `can(permission)` for falso.
  Aplicado nas 12 páginas de relatório (13 itens de menu, mas
  Contas a Receber/Pagar são a mesma página com querystring
  diferente): cada `export default function XyzPage()` foi renomeado
  pra `XyzPageInner` (sem export) e um novo `export default` embrulha
  com `<ReportAccessGuard permission="...">`. Página de Financeiro
  (`financeiro/contas/relatorio/page.tsx`) tinha um `<Suspense>`
  interno (por causa de `useSearchParams`) — o guard ficou por FORA do
  Suspense, estrutura conferida manualmente, sem quebrar.
- **`npx tsc --noEmit` limpo** (Backend e frontend) depois de todas as
  mudanças. `eslint` nos 12 arquivos de relatório + matriz só acusou o
  padrão pré-existente de `void load()` dentro de `useEffect` (mesmo
  erro já visto em dezenas de outros arquivos neste projeto, não é
  regressão).
- **✅ Testado pela tela e confirmado**: coluna "Relatório" aparece na
  matriz; desmarcar `product.report` no perfil Administrador certo e
  recarregar a tela `/erp/produtos/relatorio` mostra "Sem permissão /
  Você não tem permissão para ver este relatório." (não só esconde do
  menu — bloqueia a tela de verdade); marcar de novo restaura o
  relatório. Confirmado via rede: `DELETE .../role-permissions/:id →
  200` ao desmarcar, `POST .../role-permissions → 201` ao marcar.

- **⚠️ Achado importante durante o teste — permissão é agregada entre
  TODAS as empresas do usuário, não só a empresa ativa no momento**:
  `AuthService.buildPermissions()`
  (`Backend/src/modules/identity/auth/services/auth.service.ts`, ~linha
  98) faz `user.roles.flatMap(...)` sobre TODOS os `UserRole` do
  usuário, sem filtrar pela empresa atualmente selecionada (login
  cruzado). Ou seja: se um usuário tem papel de Administrador só na
  empresa raiz do grupo, revogar uma permissão no perfil de uma empresa
  filha **não afeta nada** — o perfil que importa é sempre o vinculado
  ao `UserRole` real do usuário, não necessariamente o perfil visível
  "enquanto logado" numa empresa via troca de empresa. Isso já existia
  antes desta sessão (não é regressão), mas não estava documentado.
  **Implicação pra qualquer teste futuro de permissão**: antes de
  revogar/conceder pra testar, confirme em qual perfil o `UserRole` do
  usuário de teste está de fato vinculado (não assuma que é o perfil da
  empresa mostrada no topo da tela).

### Pendência conhecida desta frente

- Item 3 do backlog (Orçamento ganhar aprovação → gerar Pedido de
  Venda automático, opção "gerar por pedido" em Vendas) **ainda não
  começado** — precisa de mais detalhe do usuário sobre como o fluxo
  deve funcionar antes de desenhar/implementar (registrado como
  pendência já na sessão anterior, ver backlog abaixo).

## 🔵 "Interprise": cadastros de grupo compartilhados entre empresas (14-08-2026) — LER ANTES DE CONTINUAR

Implementação do item 1 do backlog anotado na sessão anterior (ver seção
logo abaixo, "Cadastro de empresa com CPF..."). Usuário confirmou de
manhã: **todos** os cadastros de apoio abaixo viram registro único
compartilhado por todas as empresas do mesmo grupo (mesmo cliente,
`Company.rootCompanyId`) — inclusive Depósito, que na mensagem anterior
tinha sido citado como exceção ("analisando melhor poderá ficar sim em
registro único" — contradição com o que ficou registrado ontem,
sinalizada ao usuário e resolvida a favor da mensagem de hoje).

**Plano completo desenhado e aprovado antes de codar** — arquivo salvo
em `C:\Users\alelo\.claude\plans\unified-shimmying-wadler.md` (fora do
repo, só nesta máquina) tem todo o raciocínio técnico. Resumo do que
foi construído e testado, fase por fase:

### Fase 0 — mecanismo central (sem isso, nada mais funciona)

`JwtStrategy.validate()` (`Backend/.../auth/strategies/jwt.strategy.ts`)
já buscava `user.company` inteiro a cada request, só não expunha
`rootCompanyId` no `AuthenticatedUser` retornado — só faltava copiar o
campo. Agora `AuthenticatedUser.rootCompanyId` existe sempre (raiz do
grupo, nunca null), recalculado a cada request como o `companyId` já
era (nunca vai pro JWT assinado, evita ficar stale). Com isso,
`@CurrentUser('rootCompanyId')` já funciona sozinho em qualquer
controller — o decorator já indexava dinamicamente por chave.

### Fase 1+2 — os 12 cadastros "simples" viram grupo

**Achado que simplificou tudo**: em nenhum desses módulos o
`companyId` era resolvido dentro do repository — sempre chegava como
parâmetro do controller. Então a mudança inteira virou **trocar
`@CurrentUser('companyId')` por `@CurrentUser('rootCompanyId')`** nos
5 endpoints de cada controller, mantendo o nome da variável local
`companyId` — **zero mudança em service/repository**, e os
`@@unique([companyId, code])`/`@@unique([companyId, name])` do schema
continuam corretos sem migration nenhuma (só existe 1 `companyId` — o
da raiz — criando registros nessas tabelas por grupo agora).

Módulos migrados (piloto primeiro: Depósitos, testado sozinho antes de
replicar pros outros 11): `warehouse`, `chart-of-account-classifications`,
`sectors`, `ppe-types`, `product-categories`, `brands`,
`units-of-measure`, `chart-of-accounts`, `work-schedules` (+
`work-schedule-shifts`, caso especial — não tem `@@unique` próprio, só
espelha o `companyId` que o horário pai já tiver), `business-partners`,
`job-functions`, `products` (caso especial, ver abaixo).

**Script de consolidação de dados existentes**:
`Backend/prisma/scripts/consolidate-group-catalogs.ts` (rodar com
`npm run migrate:group-catalogs -- --dry-run` primeiro, sempre — só
gera log, não grava nada). Nunca apaga nem mescla: repontar pra raiz
quando não bate `@@unique`, ou repontar E sufixar o valor
(`"(duplicado - revisar)"`) quando já existe uma linha da raiz com o
mesmo código/nome, deixando pra revisão humana depois. Log fica em
`Backend/prisma/scripts/output/*.json` (gitignored, tem dado real de
cliente). **Testado nesta sessão, dry-run em todas as 11 tabelas**:
0 linhas pra reconciliar (o grupo ALEPEJO/Alessandro Lourenco não tinha
cadastro duplicado entre as duas empresas ainda) — o mecanismo em si
foi confirmado funcionando (testei criando uma empresa de teste por
CPF e conferindo o `Depósitos` compartilhado entre as duas empresas
reais do grupo, ver "Testado de verdade" abaixo).

### Fase 3 — Produtos (caso especial)

`Product.cost`/`Product.currentStock` eram digitados manualmente no
cadastro e **não eram sincronizados com `Inventory`** (achado real ao
investigar — só `Inventory.quantity`/`averageCost`, atualizados via
`StockMovement`, são a fonte de verdade de saldo/custo, e isso já é
por empresa E por depósito, `@@unique([companyId, productId,
warehouseId])`). Com Produto virando cadastro único do grupo, esses
dois campos deixaram de fazer sentido no cadastro:
- **`cost`**: tirado do formulário/DTO de criar/editar, ganhou
  `@default(0)` no schema (migration
  `20260814123555_product_cost_default_zero`) — antes era obrigatório
  sem default, quebraria o create sem o campo.
- **`currentStock`**: tirado do formulário/DTO (já tinha
  `@default(0)`, sem migration).
- **`salePrice`/`minimumStock`**: continuam no cadastro,
  compartilhados pelo grupo (preço de tabela único por SKU, estoque
  mínimo sugerido único — decisão consciente, não lacuna).
- **Coluna "Custo" sumiu da listagem de Produtos** (mostraria sempre
  R$ 0,00, enganoso). Nota no formulário: "Custo e saldo em estoque
  ficam em Estoque (são por depósito, não do cadastro do produto)" —
  a tela `/erp/estoque` já existe e já mostra isso de verdade, não
  precisou endpoint novo.

### Fase 4 — Colaboradores (caso à parte, não vira registro único)

Diferente dos outros 12: colaborador **continua vinculado a UMA
empresa específica** (`companyId` de verdade, questão trabalhista/CNPJ
no Brasil) — o que muda é a TELA, que passa a listar/gerenciar
colaboradores de **todas** as empresas do grupo num lugar só, com
opção de escolher em qual empresa cadastrar.

- **`Employee.photo`** campo novo (migration
  `20260814124416_employee_photo`) — não existia nenhum campo de foto
  antes, confirmado.
- **`EmployeePhotoService`** novo (`Backend/src/modules/employees/
  services/employee-photo.service.ts`), copiado do padrão já pronto de
  `ProfileService` (avatar do usuário) — Multer + diskStorage, filtro
  de mimetype PNG/JPEG/WEBP, limite 2MB. Diferença: a pasta é por
  `employeeId` (vem do param de rota `:id`), não de `req.user`, porque
  quem faz upload é o RH mexendo no cadastro de outra pessoa. Endpoint
  `POST employees/:id/photo`, confere que o colaborador pertence ao
  grupo antes de gravar (se não pertencer, apaga o arquivo que o
  multer já tinha salvo em disco e retorna 404).
- **`GET /employees/group`** novo — mesmo filtro de `GET /employees`,
  troca `companyId` exato por `company: { OR: [{id: rootCompanyId},
  {rootCompanyId}] } }` (JOIN, sem query extra pra enumerar empresas
  do grupo). Registrado ANTES de `GET /employees/:id` na ordem das
  rotas (senão o Nest trataria "group" como um `:id`).
  `CreateEmployeeDto` ganhou `companyId?: string` opcional — ausente
  usa a empresa da sessão (igual antes), presente confere que pertence
  ao mesmo grupo antes de aceitar (`EmployeesService.resolveTargetCompany`).
- **Reaproveitei a tela existente `/erp/rh/colaboradores`** (2831
  linhas, formulário gigante) em vez de duplicar um arquivo novo —
  decisão pragmática tomada ao ver o tamanho real do arquivo. A lista
  agora chama `GET /employees/group` (mostra todas as empresas do
  grupo, com o nome da empresa como subtítulo de cada linha). O
  formulário ganhou, no topo da aba "Pessoais": foto (upload +
  preview, só habilitado editando — "salve primeiro" pra novos,
  mesmo padrão já usado pra exames) e seletor de "Empresa" (só
  aparece quando o grupo tem mais de 1 empresa).
- **Item do menu RH "Colaboradores" foi removido** (apontava pra essa
  mesma URL) — existe só uma vez agora, dentro do novo grupo
  "Colaboradores" da seção Interprise, apontando pra mesma
  `/erp/rh/colaboradores`. Evita duplicar entrada de menu pra mesma
  tela.

### Sidebar: seção Interprise/Empresa

- `Sidebar.types.ts`: `section?: "interprise" | "empresa"` novo em
  `MenuItem`/`MenuGroup` (default implícito "empresa", nada quebra sem
  marcar).
- `menu.ts`: grupo "Cadastros" (Parceiros/Produtos) e o novo grupo
  "Colaboradores" (→ `/erp/rh/colaboradores`) marcados
  `section: "interprise"`.
- `Sidebar.tsx`: `nav` virou dois blocos (rótulo "INTERPRISE" em cima,
  divisor, rótulo "EMPRESA" embaixo) — só a Sidebar VERTICAL, não o
  `HorizontalNav` (layout ribbon, ativado em Personalização com módulo
  BRANDING). **Pendência conhecida**: `HorizontalNav.tsx` continua
  mostrando tudo numa faixa só, sem a separação Interprise/Empresa —
  não é bug de segurança (o dado compartilhado funciona igual, é só
  questão visual/organização do menu), mas fica faltando se algum
  cliente usar layout horizontal e quiser essa mesma separação lá.
  Não resolvido nesta sessão — fica pra quando pedido.
- Os 6 cadastros de apoio que já viviam em `/os/configuracoes/*`
  (Categorias/Marcas/Unidades, Plano de Contas, Depósitos,
  Classificações) **não precisaram de mudança de menu** — já vivem no
  app OS, que segundo o próprio usuário também é escopo "registro
  único" ("tudo que for feito em interprise e em OS, vira registro
  único"), só a REGRA DE DADO (Fase 1+2 acima) precisava mudar, a
  navegação já estava no lugar certo.

### Testado de verdade, ponta a ponta, pela tela

Login como Alessandro (empresa raiz ALEPEJO) e como a empresa filha do
mesmo grupo ("Alessandro Lourenco") — **Depósito "AL01" cadastrado na
raiz aparece igual pras duas empresas** (prova de compartilhamento
real, sem precisar rodar o script de consolidação porque já não havia
duplicata). Sidebar mostrando "INTERPRISE" (Cadastros, Colaboradores)
e "EMPRESA" (resto) corretamente separados com divisor. Tela de
Colaboradores: lista mostrando o colaborador com "AlePejo" como
subtítulo, formulário de edição mostrando "Sem foto"/"Enviar foto" e o
seletor "Empresa" com as duas opções do grupo. Produto: criei um
produto de teste sem informar custo (campo nem existe mais no form),
`POST /products` retornou `201 Created` — confirma que o
`@default(0)` do schema resolveu a obrigatoriedade antiga — **produto
de teste removido depois**. `npx tsc --noEmit` limpo (Backend e
frontend) em todas as fases.

### Nota técnica: `prisma generate` travou no Windows

Nas duas migrations desta sessão (`product_cost_default_zero`,
`employee_photo`), o `prisma migrate dev` aplicou a migration no banco
com sucesso ("Your database is now in sync with your schema") mas
falhou ao regenerar o Prisma Client nativo
(`EPERM: operation not permitted` tentando trocar o
`query_engine-windows.dll.node`) — **causa conhecida**: algum processo
backend (nodemon/ts-node em watch mode) está com o `.dll` antigo
carregado em memória, e o Windows não deixa substituir arquivo em uso
(mesmo sintoma já registrado antes neste doc, sessão de 12-08). Não
bloqueou nada: os tipos TypeScript (`.d.ts`) são gerados à parte do
binário nativo e atualizaram normalmente (`tsc` ficou limpo
confirmando `cost`/`photo` reconhecidos certos). Se algo parecer usar
schema desatualizado numa sessão futura, `taskkill` no processo órfão
de backend + `npx prisma generate` de novo resolve (mesma receita já
usada antes).

### Pendências conhecidas desta frente

- `HorizontalNav` sem a separação Interprise/Empresa (ver acima).
- Script de consolidação nunca testado com duplicata de verdade (dry
  -run sempre deu 0 linhas nesta sessão) — a lógica de sufixo/log
  existe mas não foi validada com um caso real de conflito. Testar se
  algum cliente futuro tiver cadastro duplicado entre filiais antes de
  confiar cegamente.
- Coluna "Custo" sumiu da tela de Produtos sem substituto direto ali
  mesmo (só a explicação "vai pra Estoque") — se o usuário sentir
  falta de ver custo rápido na listagem, dá pra pensar num link
  "Ver estoque" por produto depois.

## 🔵 Cadastro de empresa com CPF, código interno de grupo, matriz de permissões em APP/ERP (13-08-2026, mesma sessão maratona) — LER ANTES DE CONTINUAR

Sessão foi interrompida pelo usuário indo dormir, com uma lista grande
de pedidos novos só **anotados, não construídos ainda** (ver seção
"Backlog anotado pelo usuário" logo abaixo) — não comece nada daquela
lista sem confirmar o entendimento com o usuário primeiro, principalmente
o item 1 (Enterprise x Empresa), que muda modelo de dados.

### O que foi feito e testado nesta parte

- **Cadastro de empresa aceita CPF, não só CNPJ** — `signup`
  (`/cadastro-empresa`, cliente novo) e `additional` (empresa adicional
  do grupo, agora dentro da tela **Empresa**, ver abaixo) ganharam
  seletor "Tipo de documento" (CNPJ/CPF), reaproveitando `maskDocument`
  que já existia (usado em Parceiros). Backend
  (`CompanyOnboardingService`) valida 11 ou 14 dígitos, rejeita o resto.
- **Empresa adicional por CPF exige confirmação manual**: CNPJ continua
  validando a raiz (8 primeiros dígitos) automaticamente contra a
  empresa que já tem a licença; CPF não tem essa raiz, então o
  formulário mostra uma caixa "Esta é uma empresa do mesmo grupo" —
  obrigatória, `CompanyAdditionalDto.isGroupCompany`, validada nos dois
  lados.
- **Código interno de grupo** (o `Company.code` já existente, não é
  campo novo): cliente novo (raiz) ganha o próximo número livre a
  partir de 1000 (`nextRootGroupCode`, olha só raízes com código
  numérico ≥ 1000, ignora códigos manuais tipo "ALEPEJO"); empresa
  adicional ganha `{códigoDaRaiz}_{sequência}` (`nextGroupCode`, conta
  quantas já existem no grupo e soma 1) — ex.: raiz "ALEPEJO", próxima
  adicional fica "ALEPEJO_2". **Testado de verdade**: criei empresa de
  teste por CPF vinculada ao grupo ALEPEJO pela tela, conferi no banco
  o código saindo `ALEPEJO_2`, removi os dados de teste depois (usuário
  admin da empresa de teste + a empresa em si).
- **Tela "Empresa" (`/erp/configuracoes`, card do app OS) deixou de
  ser vazia** — pedido do usuário, decidido junto com ele entre 3
  opções: formulário com os dados da própria empresa (Razão
  social/Nome fantasia editáveis, CNPJ/CPF fixo, E-mail/Telefone) +
  botão "Cadastrar empresa" + tabela "Empresas do grupo", **que saíram
  de Licenciamento** (Licenciamento ficou só com Plano/Módulos). Coluna
  da tabela que era "CNPJ" virou "Documento" (mostra CPF ou CNPJ
  conforme o tamanho). `companyService.updateMine()` novo
  (`PATCH /companies/me`, endpoint já existia, só faltava o método no
  frontend).
- **Matriz de permissões (Perfis → Configurar permissões) separada em
  duas seções**: "APP — Administração e integrações" (Sistema, Empresa,
  Usuários, Perfis, Licenciamento, Personalização de Marca, WhatsApp,
  E-mail, Avisos Automáticos, Permissões/Vínculos de plataforma, e os
  cadastros de apoio que já tinham saído do menu ERP pra OS →
  Configurações: Categorias, Marcas, Unidades, Depósitos, Plano de
  Contas, Classificações) e "ERP — Operação do dia a dia" (o resto:
  Parceiros, Produtos, Estoque, Compras, Vendas, Financeiro, RH,
  Produção, CRM). **É só visual, mapa fica em
  `GROUP_SCOPE` dentro da própria página** (`.../perfis/[id]/permissoes/page.tsx`)
  — grupo de permissão novo que não estiver no mapa cai em "ERP" por
  padrão, então nunca fica invisível, só mal classificado até alguém
  adicionar a entrada. **Testado de verdade pela tela** (login,
  Perfis → Administrador → Configurar permissões, conferi as duas
  seções e a ordem alfabética dentro de cada uma).
- **Achado ao auditar o catálogo pro pedido "acrescentar tudo de novo
  que foi criado"**: comparando `seed.ts` com o banco, **não falta
  nada** (31 grupos do seed todos presentes) — mas o banco tem **2
  grupos a mais que não existem mais no seed.ts**: `CLIENT` ("Clientes",
  8 permissões) e `SUPPLIER` ("Fornecedores", 4 permissões), claramente
  substituídos em algum momento pelo grupo unificado `PARTNER`
  ("Parceiros (Clientes/Fornecedores)") mas nunca removidos do banco
  (seed só faz upsert, nunca delete). Aparecem na matriz como linhas
  extras/redundantes em ERP. **Não mexi** — apagar grupo de permissão é
  destrutivo (cascade em `RolePermission`) e eu não sabia se algum
  perfil real depende delas; fica pra confirmar com o usuário antes de
  limpar.

### Backlog anotado pelo usuário (13-08-2026, fim da sessão) — nada disso foi construído ainda

O usuário listou os itens abaixo antes de dormir, pedindo pra ficarem
registrados. **Não comecei nenhum** — o item 1 sozinho é uma mudança de
modelo de dados grande o bastante pra merecer confirmação de escopo
antes de mexer (ver dúvidas que registrei junto de cada item).

1. **Separar "Interprise" (nível grupo/todas as empresas logadas) de
   "Empresa" (nível empresa única)** — ideia do usuário: Parceiros,
   Produtos e Cadastro de Colaboradores passariam a ser geridos no
   nível "Interprise" (cadastro único, visível/compartilhado entre
   todas as empresas do grupo?), não mais por empresa isolada.
   Colaborador ganharia campo pra marcar a qual empresa pertence +
   opção de inserir/atualizar foto. Sugestão de menu do próprio
   usuário: sidebar com dois blocos separados por um divisor —
   **Interprise** (Cadastro → Parceiros, Cadastro → Produtos,
   Colaboradores → Cadastro de colaboradores) e **Empresa** (menus que
   já existem hoje, sem mudança). Visão geral continua sendo a home.
   **Item 5 (mensagem separada, mesma sessão)**: de todos os cadastros
   que virariam "Interprise", **Depósito é a exceção — continua em
   nível de Empresa**, não vai para o Interprise.
   ⚠️ **Não construído — dúvida grande a esclarecer antes de mexer**:
   hoje `BusinessPartner`, `Product` e `Employee` têm `companyId`
   obrigatório (dado isolado por empresa, é a base de todo o
   multi-tenant do sistema). "Nível Interprise" significa (a) um
   cadastro FÍSICO único, mesmo registro visível/editável em todas as
   empresas do grupo (mudaria o modelo de dados — `companyId` viraria
   opcional ou o dado moveria pra pertencer ao `rootCompanyId`), ou (b)
   cada empresa continua com seu próprio dado, só a
   NAVEGAÇÃO/sidebar muda de lugar (Parceiros/Produtos/Colaboradores
   saem do menu "Empresa" e entram num menu "Interprise", mas o dado
   isolado por empresa continua do jeito que é hoje, só o rótulo/menu
   muda)? São implementações muito diferentes (uma mexe em schema e
   nas regras de isolamento entre empresas, a outra é só UI) — confirmar
   com o usuário antes de tocar em código.
2. **Cadastro de empresa**: adicionar campos de endereço (CEP com
   buscador automático — provavelmente ViaCEP ou similar —, foco
   automático no campo "Número" depois de buscar o CEP, Cidade,
   Estado). Schema `Company` hoje não tem nenhum campo de endereço
   (confirmado lendo `schema.prisma` — só tem os campos de contato:
   email/phone/mobile/website). Vai precisar de migration. **Tabela
   "Empresas do grupo"** (na tela Empresa, ver acima): mostrar também
   E-mail e Telefone nas colunas (hoje só mostra Empresa/Documento/
   Situação).
3. **Orçamento (Vendas) ganhar fluxo de aprovação que gera Pedido de
   Venda automaticamente** ao aprovar — e, na tela de Vendas, opção de
   "gerar por pedido" (não detalhado ainda o que muda ali exatamente,
   perguntar mais quando retomar).
4. Pedido de permissão de leitura de arquivo: usar sempre "permitir
   sempre" quando pedir acesso pra ler algo — repassado, mas devo
   deixar registrado que **eu não controlo o modo de permissão da
   sessão** (isso é configuração do ambiente/CLI do usuário, não algo
   que eu troco a partir do chat); só posso seguir pedindo quando a
   ferramenta exigir aprovação.
5. Ver item 1 acima (Depósito fica de fora do "Interprise").
6. Pedido: se bater limite de uso, continuar sozinho assim que liberar,
   sem pedir confirmação de novo — **fora do meu controle**, é o
   produto/plataforma que gerencia limite de uso, eu não tenho como
   programar isso.
7. Pedido: se a janela de contexto acabar, abrir um chat novo e
   continuar sozinho — **não é algo que eu consigo fazer**: não tenho
   como abrir uma conversa nova por conta própria. O que já existe (e
   funciona diferente disso) é compressão automática do histórico
   dentro da MESMA conversa quando ela fica muito longa — a conversa
   em si não fecha nem precisa ser recomeçada à mão.
8. **Relatórios precisam de permissão própria na matriz** — "tudo tem
   que estar em permissões". Conferido: hoje os itens dentro do grupo
   de menu "Relatórios" (`menu.ts`, ex.: Relatório de Produtos,
   Relatório de Funções, e vários outros por módulo) **reaproveitam a
   mesma permissão `.view` do módulo base** (ex.: o relatório de
   Produtos usa `product.view`, a mesma que já libera a tela normal de
   Produtos) — não existe hoje um código de permissão próprio pra
   "pode ver o relatório de X" separado de "pode ver X". Pra atender o
   pedido, precisa: (a) permission code novo por relatório (ou um
   sufixo genérico tipo `.report.view` reaproveitando o mesmo grupo),
   (b) seed com os códigos novos, (c) trocar o `permission:` de cada
   item de relatório em `menu.ts` pro código novo, (d) refletir na
   matriz (`permissoes/page.tsx`) — como são MUITOS relatórios
   espalhados por vários módulos, vale mapear a lista completa antes
   de começar (não levantei a lista completa ainda, só confirmei o
   padrão atual com Produtos/Funções).

### Pendência conhecida (achado nesta sessão, não resolvida)

- Grupos de permissão órfãos `CLIENT`/`SUPPLIER` no banco (ver acima)
  — candidatos a limpeza, não removidos por segurança.

Dois ajustes pedidos em sequência, logo depois do overlay→inline/push
(seção abaixo): (1) tirar logo/nome da empresa de dentro do menu — fica
só uma vez, no início da barra única do topo, antes do seletor de apps;
(2) o layout horizontal (`sidebarLayout: "horizontal"`, módulo BRANDING)
tinha ficado fora desse esquema — sempre visível, fixo, com logo próprio
duplicado — corrigido pra seguir exatamente o mesmo padrão
esconder/expandir por hambúrguer que o menu vertical ganhou.

- **`AppTabsBar.tsx`**: ganhou `<Brand />` + separador vertical antes do
  `AppLauncher`/guias de app — `LOGO+empresa | separador | apps e
  demais`. Header trocou `h-16` fixo por `min-h-16` (o nome da empresa
  pode quebrar em 2 linhas, `logoWidth` é configurável por empresa).
- **`Brand.tsx`**: perdeu o prop `collapsed` (só existia pro uso antigo
  dentro da Sidebar/cabeçalho recolhido, que não existe mais) — sempre
  mostra logo + nome completo agora, único lugar onde é usado.
- **`SidebarHeader.tsx` apagado** — só existia pra mostrar `Brand`
  dentro da Sidebar; sem ele, não sobrava nada de útil no componente.
  A identidade da empresa dentro da Sidebar aberta continua aparecendo
  no rodapé (nome do usuário + `company.tradeName`, já existia).
- **`HorizontalNav.tsx`**: perdeu a coluna do `Brand` (com a borda
  separadora) — sobrou só a `<nav>` com os itens de menu.
- **`AppShell.tsx` (ramo horizontal)**: reestruturado pra espelhar o
  ramo vertical — `AppTabsBar` → `TabsBar` (agora recebendo
  `isMenuOpen`/`onOpenMenu`, antes não tinha hambúrguer nenhum) →
  `{isMenuOpen && <HorizontalNav />}` empilhado logo abaixo, empurrando
  o `main` pra baixo quando aberto (mesma ideia do push lateral do
  ramo vertical, só que empurrando por cima em vez de pelo lado — faz
  sentido pra uma barra horizontal). Antes o `HorizontalNav` ficava
  sempre visível, numa faixa própria ACIMA do `AppTabsBar` — por isso o
  usuário descreveu como "ficou fora do navegador e guia sistema erp".
  Estado aberto/fechado é o mesmo `useSidebar()` (guardado no
  `TabsProvider`, sobrevive à navegação, zera no logout — [[sidebar
  overlay-inline]] mesma base).
- **Testado de verdade pela tela**: a empresa de teste (Alessandro/
  AlePejo) está com `sidebarLayout: "horizontal"` no momento (mudou de
  vertical pra horizontal em algum ponto desta sessão maratona,
  provavelmente por outra sessão mexendo em Personalização em
  paralelo) — deu pra confirmar o ramo horizontal ao vivo:
  clique no hambúrguer da `TabsBar` → `<nav>` apareceu logo abaixo dela
  (bottom em y=293) empurrando o `main` pra baixo (top em y=306, sem
  sobreposição) → clique de novo → `<nav>` sumiu por inteiro, `main`
  voltou a subir (top em y=192). Barra do topo com `LOGO+"AlePejo
  ERP Cloud"` seguida do separador e do resto confirmada via árvore de
  acessibilidade. `npx tsc --noEmit` limpo; `eslint` nos arquivos
  tocados só acusou 2 erros pré-existentes (padrão
  `setState` dentro de `useEffect` em `Brand.tsx`/`Sidebar.tsx`, já
  existiam antes desta sessão, fora do escopo daqui). **Não cheguei a
  testar o ramo vertical de novo depois desta rodada** (a empresa de
  teste está em horizontal agora) — vale conferir os dois ramos juntos
  numa próxima sessão se possível.

## 🔵 Sidebar do ERP: overlay virou inline/push (13-08-2026, sessão nova)

Correção pedida pelo usuário sobre o comportamento registrado na seção
logo abaixo ("Guias/abas — versão simples"): o overlay com fundo
escurecido cobrindo a tela **não era o que o usuário queria** — pediu
que a Sidebar, ao expandir pelo ícone de menu da `TabsBar`, **empurre o
conteúdo** (redimensiona a área de `main` dentro do próprio guia) em
vez de flutuar por cima. Modo ícone-somente (toggle interno da Sidebar,
`w-72`/`w-[72px]`) continua existindo do jeito que já era. Clicar de
novo no ícone de menu da `TabsBar` fecha a Sidebar por inteiro
(largura zero, `main` volta a ocupar tudo) — o botão virou toggle de
verdade (ícone alterna `Menu`/`X`), antes só abria.

- **`AppShell.tsx`** (ramo não-horizontal): removido o par
  `<div className="fixed inset-0">` + backdrop `bg-black/40`. A
  Sidebar (quando `isMenuOpen`) e o `<main>` agora são irmãos dentro de
  um `<div className="flex flex-1 gap-3 overflow-hidden">`, logo
  abaixo da `TabsBar` — `main` tem `flex-1`, então encolhe/cresce
  sozinho conforme a Sidebar aparece/some.
- **`Sidebar.styles.ts`**: `root` perdeu `fixed inset-y-0 left-0 z-40`,
  `h-dvh` e `md:static md:translate-x-0` (resquício do padrão
  fixo-no-desktop/overlay-no-mobile antigo) — agora é só
  `flex h-full shrink-0 flex-col` mais os cantos/borda/fundo de
  sempre, porque vive dentro do `flex` do `AppShell`, não mais
  posicionada sozinha na tela.
- **`TabsBar.tsx`**: ganhou prop `isMenuOpen` — o botão do ícone de
  menu alterna `Menu`/`X` e `aria-label` "Abrir menu"/"Fechar menu"
  conforme o estado, refletindo que agora é toggle (`onOpenMenu` no
  `AppShell` virou `setMenuOpen((v) => !v)`, antes só `setMenuOpen(true)`).
- **Testado de verdade pela tela** (`npx tsc --noEmit` limpo antes):
  logado, cliquei no ícone de menu → Sidebar expandiu ao lado do
  conteúdo (confirmado via `getBoundingClientRect`: `aside` em
  `position: static`, x=12 largura 288, `main` começando em x=312 —
  sem sobreposição, sem overlay) → cliquei "Recolher menu" (interno da
  Sidebar) → virou ícone-somente (largura 72px) → cliquei de novo no
  ícone de menu da `TabsBar` → Sidebar sumiu por inteiro, `main`
  voltou a ocupar a largura toda (1256px). Ramo horizontal
  (`HorizontalNav`, só empresas com módulo BRANDING +
  `sidebarLayout: "horizontal"`) não foi tocado — nunca teve Sidebar
  overlay, não tinha esse problema.

## 🔵 Guias/abas — versão simples (13-08-2026, mesma sessão da reorganização em OS)

Última frente da maratona de navegação. Pedido do usuário: "continuar
agora com as guias" — os dois apps (guias de 1º nível) e, dentro do
ERP/OS, guias de 2º nível de verdade (até 6, ajustável depois).

**Decisão tomada com o usuário antes de construir**: existem duas versões
possíveis. A **completa** preserva o formulário/tela ao trocar de guia
(exige manter todas as guias "vivas" ao mesmo tempo — reescrever a base de
~50 páginas do ERP, risco alto, é por isso que essa frente foi adiada duas
vezes antes). A **simples** entrega guias de verdade (até 6, sobrevivem a
F5, reaproveitam guia já aberta) mas trocar de guia recarrega a tela por
trás — se algo não foi salvo antes de trocar, perde, igual já é hoje.
**Construída a versão simples** — os componentes dela (provider, barras,
persistência) são a base direta pra evoluir pra completa depois, nada foi
jogado fora.

### O que foi feito

- **`TabsProvider`** (`frontend/src/providers/TabsProvider.tsx`, novo,
  montado no layout raiz ao lado do `AuthProvider`) — 2 listas
  independentes de guias (`erp`/`os`), persistidas em `sessionStorage`
  (sobrevive a F5, some ao fechar a aba do navegador). Cada app tem 1 guia
  fixa não-fechável ("Visão geral" pro ERP, "OS" pro OS).
  `usePathname()` interno mantém a guia ativa em sincronia com a URL real.
  Limite de 6 guias por app (`MAX_TABS`, fácil de mudar).
- **`frontend/src/lib/osRoutes.ts`**: `isOsPath()` decide se uma URL
  pertence ao app OS (inclui as 16 URLs que continuam com prefixo
  `/erp/...` mas já são telas de OS, ver seção acima) — corrige de quebra
  um bug pequeno que já existia no seletor de app anterior (confundia
  essas URLs como "Sistema ERP"). `OS_PATH_TITLES` mapeia cada URL de OS
  pro título da guia.
- **`AppTabsBar`** (substitui o antigo `AppSwitcher` dropdown) — guias de
  1º nível de verdade (Sistema ERP | OS), lado a lado, estilo aba de
  navegador, numa faixa própria acima do `TopBar`.
- **`TabsBar`** (novo, `frontend/src/components/layout/TabsBar/`) — guias
  de 2º nível do app atual, botão × por guia (exceto a fixa), ícone de
  menu que abre a Sidebar em overlay (só no ERP — OS navega só por
  cards). Mostra aviso quando o limite de 6 é atingido.
- **Sidebar do ERP virou overlay sempre** (`AppShell.tsx`) — igual ao
  print do Infor usado de referência: antes ficava fixa no desktop e só
  virava overlay no mobile; agora é sempre acionada pelo ícone de menu
  dentro da `TabsBar`, fecha sozinha depois de escolher um item. Conteúdo
  do menu (`menu.ts`) não mudou.
- **Clique num item de menu (Sidebar, `HorizontalNav`) ou card de OS
  (`OsCardLink`) passa a "avisar antes de navegar"**: clique normal
  intercepta o `<Link>`, checa o limite de 6, registra/reaproveita a guia
  e só então navega; **Ctrl/Cmd/clique-do-meio continua abrindo numa aba
  nova de verdade do navegador**, sem interceptar (bônus, não pedido, mas
  natural de preservar).
- **`TopBar` simplificado**: perdeu o botão de abrir menu mobile (mudou
  de lugar, ver `TabsBar`) e o parâmetro `companyName`/toggle antigos —
  só recebe `workspaceLabel`/`userName` agora.
- **Testado de verdade, ponta a ponta pela tela**: abri 6 guias do ERP
  (Visão geral fixa + 5) → tentei a 7ª → bloqueou, aviso apareceu
  (confirmado sem race condition, o aviso some sozinho depois de ~4s) →
  fechei uma guia (não-ativa, não navegou) → **F5**: as guias
  sobreviveram, lidas de volta do `sessionStorage` → cliquei no mesmo
  item de menu duas vezes → reaproveitou a guia, não duplicou → troquei
  pro app OS pelo `AppTabsBar` → entrei em Segurança → Usuários
  (`/erp/configuracoes/usuarios`) → confirmei que essa guia foi pra lista
  de **OS**, sem tocar na lista do ERP (prova que o `isOsPath` novo
  funciona) → voltei pro Sistema ERP → as 5 guias do ERP continuavam
  exatamente como estavam.

### Ajustes de visual/comportamento pedidos logo depois (mesma sessão, olhando a tela ao vivo)

Depois do primeiro build acima, o usuário testou ao vivo e pediu vários
ajustes seguidos. **`TopBar.tsx` foi removido** (não existe mais como
componente/arquivo) — o que ele mostrava (tema/empresa/avatar) foi
fundido dentro da própria `AppTabsBar`, num painel só. `TopBar.styles.ts`
sobrou só com os tokens que o `CompanySwitcher` ainda usa.

- **`AppLauncher`** (novo, `frontend/src/components/layout/TopBar/AppLauncher.tsx`)
  — ícone (`LayoutGrid`) no início da `AppTabsBar`, abre um overlay com
  "Sistema ERP"/"OS" pra abrir. É o ponto de entrada pra reabrir um app
  que foi fechado.
- **Guias de app (Sistema ERP/OS) agora fecham** (`TabsProvider` ganhou
  `openApps: AppKey[]`, persistido em `sessionStorage`
  (`alepejo:apps`), + `openApp`/`closeApp`) — não deixa fechar a única
  guia de app aberta. Fechar uma guia de app **não apaga** as guias de
  2º nível daquele app (ficam guardadas, aparecem de novo se reabrir o
  app na mesma sessão). Reabrir/trocar pra um app leva pra onde a pessoa
  parou nele (`activeHref`), não sempre pra home.
- **`AppTabsBar` virou o painel único do topo**: ícone de apps + guias de
  app (estilo pill, não mais "aba de navegador destacada" — o branco
  "avulso" que incomodava) + tema/empresa/avatar à direita, tudo no mesmo
  `rounded-3xl` — `workspaceLabel` (nome da tela) **não aparece mais em
  lugar nenhum**, ficaria redundante com o nome já mostrado na guia de
  2º nível ativa.
- **Sidebar do ERP: fica ESCONDIDA por padrão, ícone de menu (dentro da
  `TabsBar`, à esquerda das guias de 2º nível) expande e mostra por cima
  da tela (overlay com fundo escurecido), fecha sozinha ao escolher um
  item.** Isso foi um vaivém dentro da sessão: cheguei a reverter pra
  "sempre fixa no desktop" (interpretando um pedido anterior do usuário
  ao contrário), o usuário corrigiu ao vivo ("pode ficar igual fez da
  última vez... ocultando, o clicar ela expande") — **o comportamento
  final e correto é o overlay/hambúrguer**, não o fixo. Se algum dia
  isso for mexido de novo, essa é a direção certa, não a fixa.
- **Confirmado junto com o usuário**: a Sidebar só existe dentro do
  `AppShell` (app ERP) — o `OsShell` nunca renderiza Sidebar nenhuma, é
  só cards. Trocar pra guia OS naturalmente esconde a Sidebar por
  construção, sem precisar de lógica extra.

**⚠️ Não testado por mim ponta a ponta depois da última correção** (a
sessão foi interrompida por limite de contexto logo depois de restaurar o
padrão overlay/hambúrguer) — `npx tsc --noEmit` do frontend ficou limpo, e
o código restaurado é exatamente o que já tinha sido testado e funcionado
antes nesta mesma sessão (só reaplicado), mas vale conferir de novo pela
tela na próxima sessão antes de seguir pra qualquer coisa nova:
1. Sidebar escondida por padrão, ícone de menu na `TabsBar` mostra ela
   por cima da tela, fecha sozinha ao clicar um item.
2. `AppLauncher` (ícone de grade no início da barra) abre a lista
   Sistema ERP/OS.
3. Fechar a guia "OS" (ou "Sistema ERP") funciona e não deixa fechar a
   última restante.
4. Visual do painel único do topo (sem mais o branco "avulso" da guia
   ativa).

### Pendências conhecidas

- **Versão completa (preservar formulário ao trocar de guia)** — não
  construída, exige reescrever a base de ~50 páginas do ERP (extrair
  conteúdo de rota + registry de import dinâmico + manter tudo montado ao
  mesmo tempo). Fica pra quando o usuário pedir.
- **Título da guia mostrar nome do registro** (ex.: nome do colaborador
  em edição, não só "Colaboradores") — não construído, precisa de um hook
  por página.
- **FAVORITOS/FERRAMENTAS** da barra de guias (vistos nos prints do Infor
  usados de referência) — não construídos.
- **Subtelas continuam fora do esquema de guias** (decisão já tomada
  antes) — abrem por navegação normal, sem virar guia nem mudar a guia
  ativa mostrada na barra. Efeito colateral assumido: a barra de guias
  pode mostrar a guia "pai" destacada enquanto o conteúdo na tela já é o
  da subtela (ex.: um relatório) — visual, sem afetar dado nenhum.

## 🔵 App "OS" — reorganização do menu do avatar (13-08-2026)

Retomada da frente "Desenho de navegação em guias" (ver seção mais abaixo,
mesmo nome) — só a parte de **reorganizar em app OS**, não o mecanismo de
guias/abas em si (isso continua adiado, é a parte tecnicamente mais
arriscada). Pedido do usuário: "acho que o próximo passo é ir pra alteração
de navegador, porque vai precisar agora" — o menu do avatar estava virando
um cesto de tudo depois das últimas sessões (empresas do grupo, login
cruzado).

**Decisões fechadas com o usuário antes de construir**: (1) fazer só a
reorganização em OS nesta sessão, guias ficam pra depois; (2) trocar entre
os apps ERP/OS por um **alternador sempre visível no topo** (mesmo padrão
do seletor de empresa), não escolha na tela de login; (3) aba de E-mail
(hoje junto com WhatsApp em "Notificações") continua junto, a tela toda foi
pro card "APIs"; (4) card "Empresa" só mudou de lugar — a tela
`/erp/configuracoes` já era (e continua sendo) um placeholder vazio, não
foi construída agora.

### O que foi feito

- **`OsShell`** (`frontend/src/components/layout/OsShell/OsShell.tsx`) —
  moldura nova pro app OS, espelha o ramo "horizontal" do `AppShell.tsx`
  (TopBar + conteúdo) só que **sem** Sidebar/HorizontalNav — navegação
  dentro de OS é por cards, não por menu lateral. Mesmos props
  (`children`/`workspaceLabel`) que `AppShell`, substituto direto.
- **`AppSwitcher`**
  (`frontend/src/components/layout/TopBar/AppSwitcher.tsx`, ao lado do
  `CompanySwitcher` no `TopBar.tsx`) — deriva o app atual do
  `usePathname()` (`/os/**` = OS, resto = Sistema ERP), sem estado novo,
  sem backend.
- **Nenhuma URL de tela existente mudou** — só a moldura ao redor delas
  (`AppShell` → `OsShell`) nestas 16 rotas, que passaram a viver "dentro"
  de OS: `/erp/configuracoes/usuarios`, `/erp/configuracoes/perfis` (+
  `[id]/permissoes`), `/erp/licenciamento`, `/erp/configuracoes` (Empresa),
  `/erp/configuracoes/personalizacao`, `/erp/configuracoes/notificacoes`,
  `/erp/rh/ponto/chave-api`, `/erp/produtos/cadastros`,
  `/erp/estoque/depositos`, `/erp/financeiro/plano-contas`,
  `/erp/financeiro/classificacoes`, `/erp/rh/funcoes`, `/erp/rh/cadastros`
  (+ `/horarios`), `/erp/producao/configuracoes`.
- **Telas novas em `/os/**`** (hub em cards, `OsCardLink` reaproveitando o
  estilo dos atalhos da Visão geral): `/os` (7 cards: Portal/Segurança/
  APIs/Empresa/Configurações/Personalização/Licenciamento, cada um só
  aparece com a permissão equivalente da tela de destino — zero permissão
  nova), `/os/portal` (placeholder "Em breve"), `/os/seguranca` (Usuários +
  Perfis), `/os/apis` (WhatsApp+E-mail + Chave de API do ponto),
  `/os/configuracoes` (5 cards por módulo) + `/os/configuracoes/cadastro`,
  `/estoque`, `/financeiro`, `/rh`, `/producao` (cada um lista os itens que
  saíram do menu principal, apontando pras URLs de sempre).
- **`menu.ts`**: **7 itens "menu de apoio" saíram do menu principal do
  ERP** (Categorias e marcas, Plano de contas, Depósitos, Classificações,
  Funções e cargos, Setores/horários/EPI, Chave de API do ponto) — só
  existem mais dentro de OS → Configurações. `systemMenuItems` (avatar)
  encolheu de 7 pra **2 itens**: Personalização (único duplicado, continua
  no avatar E em OS) e Ponto-Manual (só avatar, uso pessoal do dia a dia).
  Usuários/Perfis/Licenciamento/Configurações/Notificações saíram do
  avatar — só existem dentro de OS agora.
- **Testado de verdade, ponta a ponta pela tela**: logado como Alessandro
  → alternador mostrou "Sistema ERP" → troquei pra OS → os 7 cards
  apareceram (todas as permissões dele) → entrei em Segurança → Usuários
  (mesma tela de sempre, sidebar do ERP **sumiu**) → voltei, testei APIs e
  Configurações → Financeiro (2 links certos) → voltei pro ERP, expandi os
  grupos Cadastros/Estoque/Financeiro/RH/Produção e confirmei que os 7
  itens relocados **não aparecem mais** ali, só os que ficaram → conferi o
  menu do avatar com só Personalização + Ponto-Manual → alternador
  voltando de qualquer tela de OS pra `/` (Sistema ERP) funcionando.

### Pendências conhecidas

- **Mecanismo de guias/abas continua não implementado** — cada tela ainda
  é uma navegação de página inteira normal (sem persistir Sidebar/TopBar
  entre rotas, sem múltiplas guias abertas). Fica pra uma sessão futura,
  ver desenho completo na seção "Desenho de navegação em guias" mais
  abaixo (agora só faltando essa parte).
- Card "Empresa" (`/erp/configuracoes`) continua vazio ("Nada por aqui
  ainda") — decisão consciente desta sessão, construir os campos reais
  fica pra quando for pedido.
- Card "Portal" sem conteúdo definido (mesma pendência já registrada no
  desenho original).

## 🔵 Login cruzado entre empresas do grupo + base de multi-empresa (13-08-2026)

Pedido do usuário: primeiro de uma lista de 5 pendências priorizadas
(login cruzado, relatório consolidado por grupo, multi-empresa "1
login/N empresas", navegação em guias, banco de horas/folha).
Investigação mostrou que **login cruzado e a decisão já registrada de
multi-empresa ("1 login, várias empresas", modelo Slack/Notion) são a
mesma peça de arquitetura** — este sprint entrega as duas de uma vez,
escopado a empresas do mesmo grupo (`rootCompanyId`), que é o caso de
uso real hoje.

Descoberta que simplificou a implementação: `JwtStrategy.validate()`
já re-consulta `User.companyId` do banco a cada request (não confia no
claim do JWT) — então "trocar de empresa" só precisa validar o
vínculo, atualizar `User.companyId` e reemitir os tokens; nenhum
guard/repository do resto do sistema precisou mudar.

### O que foi feito

- **Model novo `UserCompany`** (migration
  `20260813142309_add_user_company_links`, com backfill: todo usuário
  existente ganhou o vínculo com a empresa que já era a dele) — lista
  de empresas que um login pode acessar. `User.companyId` continua
  existindo e representando a empresa ATIVA da sessão, só que agora é
  trocável.
- **`AuthService.switchCompany`** + `POST /auth/switch-company`
  (autenticado, sem permissão especial — o vínculo já é o controle de
  acesso): valida `UserCompany`, checa empresa ativa, atualiza
  `User.companyId`, reemite os tokens (mesmo fluxo do login).
  **Bug real corrigido no caminho**: `AuthService.refresh()` buscava o
  usuário sem `include` de empresa/perfis antes de chamar
  `issueTokens()`, que precisa desses dados — refatorado num método
  privado só (`findUserWithAuthContext`) reaproveitado por login,
  refresh e troca de empresa.
- **`GET /companies/my-companies`**: lista as empresas que o login
  atual pode acessar — alimenta o seletor.
- **Seletor de empresa** no `TopBar` (`CompanySwitcher.tsx`): se o
  usuário só tem 1 empresa, mostra o indicador estático de sempre
  (sem chamada extra); com mais de uma, vira dropdown. Trocar dá
  reload completo da página (mais simples/seguro que invalidar cache
  tela por tela).
- **`CompanyOnboardingService.createAdditional`**: quem cadastra uma
  empresa adicional do grupo **já ganha acesso a ela** automaticamente
  (perfil Administrador lá) — fecha a pendência antiga registrada
  neste doc. Se o "E-mail do administrador" informado no formulário
  for o mesmo de quem está cadastrando, não cria mais um usuário
  duplicado (só usa o vínculo); se for diferente, continua criando o
  login separado de sempre.
- **Testado de verdade, ponta a ponta**: cadastrei empresa adicional
  com e-mail de administrador igual ao meu → confirmei no banco 1 só
  usuário (sem duplicar) com `UserCompany`/`UserRole` nas duas
  empresas → seletor no topo apareceu com as duas → troquei e
  `/auth/me` confirmou o `companyId` mudando → voltei pra empresa
  original → testei rejeição (403) tentando trocar pra uma empresa
  sem vínculo via chamada direta. **Dados de teste revertidos**
  (empresa de teste excluída do banco).

### Vínculo de empresa movido pro Cadastro de Usuário (mesma sessão, pedido logo em seguida)

Primeira versão do vínculo (modal "Vincular usuário" dentro de
`/erp/licenciamento`, por e-mail + perfil escolhido na hora) foi
**substituída** a pedido do usuário: "o vínculo da empresa acho
melhor ficar no cadastro de usuários. Lista todas as empresas
cadastradas com caixa de seleção pra marcar a empresa que terá
acesso, opção de marcar todas." Os endpoints antigos
(`GET /companies/group/:id/roles`, `POST /companies/group/:id/link-user`)
foram **removidos**, não só descontinuados — sem uso órfão no código.

- **Tela "Usuários" (`/erp/configuracoes/usuarios`), formulário de
  criar/editar**: seção nova "Empresas com acesso (login cruzado)"
  (gated por `company.update`, só aparece se o grupo tiver mais de uma
  empresa) — checkbox por empresa do grupo + "Marcar todas"/"Desmarcar
  todas". A empresa dona do cadastro aparece sempre marcada e
  desabilitada (não dá pra tirar o próprio acesso por ali).
- **`UsersService.setCompanies`** (novo, privado, chamado por
  `create`/`update` quando `companyIds` vem no payload): concede a
  Role "Administrador" (`code: 'ADMIN'`) da empresa recém-marcada
  automaticamente — **só se o usuário ainda não tiver nenhuma role
  lá** (não sobrescreve um vínculo mais específico já existente).
  Desmarcar só remove o acesso (`UserCompany`) — não mexe nas roles já
  concedidas naquela empresa. `CreateUserDto`/`UpdateUserDto` ganharam
  `companyIds?: string[]`; `GET /users` passou a incluir as empresas
  vinculadas (`companies: { companyId }[]`) pra pré-marcar os
  checkboxes ao editar.
- **Testado de verdade pela tela**: criei usuário de teste marcando a
  empresa "Alessandro Lourenco" do grupo → conferi no banco `Role
  Administrador` concedida automaticamente lá → editei o mesmo
  usuário, desmarquei a empresa, salvei → conferi que o vínculo
  (`UserCompany`) sumiu. **Dados de teste revertidos** (usuário de
  teste excluído).

### Pendências conhecidas

- A Role concedida automaticamente ao marcar uma empresa é sempre
  "Administrador" (`code: ADMIN`) — não dá pra escolher um perfil mais
  restrito pra essa empresa extra direto pela tela (só editando depois
  em Perfis/matriz de permissões, ou tirando a role manualmente).
- Vínculo só alcança **empresas do mesmo grupo** de quem está
  cadastrando — dar acesso a uma empresa fora do grupo ainda exigiria
  mexer direto no banco (fora do escopo pedido até aqui).
- Relatório consolidado por grupo (DRE/balanço somando `rootCompanyId`,
  pedido do usuário, próximo da lista de 5) ainda não construído — a
  estrutura de dados já suporta.
- Navegação em guias (ERP/OS) e banco de horas/folha de pagamento
  seguem como sprints separados, sem dependência deste.

## 🔵 Cadastro de Empresas — onboarding de cliente novo + empresa adicional (12-08-2026, mesma sessão)

Última frente desta sessão maratona. Pedido do usuário na sequência
do WhatsApp por empresa: precisa de um jeito de cadastrar empresa.
Esclarecido em duas rodadas de pergunta que são **dois fluxos**,
ambos pedidos: **cliente novo** se cadastra sozinho (autoatendimento,
primeira empresa dele) e **cliente já licenciado** cadastra **outra
empresa própria** de dentro do sistema — essa segunda só é permitida
se o CNPJ novo tiver a **mesma raiz (8 primeiros dígitos)** do CNPJ
da empresa que já tem a licença ("pra não se perder em multi
empresas" — a licença fica sempre ancorada na empresa que iniciou).

Investigação prévia importante: o endpoint que já existia
(`POST /companies`, público) só inseria a linha crua da empresa — sem
plano, sem perfil, sem usuário. Só existe **um plano no sistema**
("ENTERPRISE", nome herdado do seed, mas na prática é o plano-base:
os módulos add-on — BRANDING/HR/PRODUCTION/LABOR — são vendidos à
parte via `CompanyModule`, igual já era pra ALEPEJO).

### O que foi feito

- **`Company.rootCompanyId`** (migration
  `20260813022333_add_company_root_company_group`, auto-relação):
  `null` = a empresa é raiz (todo cadastro de cliente novo nasce
  raiz); preenchido = aponta **direto** pra raiz de verdade, nunca
  encadeado (uma filial nunca aponta pra outra filial).
- **`CompanyOnboardingService`** novo
  (`Backend/src/modules/identity/company/services/company-onboarding.service.ts`)
  — orquestra o que antes só existia espalhado, reaproveitando tudo
  que já tinha pronto: `CompanyRepository.create`,
  `LicenseService.assignPlan`/`enableModule` (módulo de licenciamento
  já existia, só nunca tinha sido chamado num fluxo de cadastro),
  `UsersService.create` + `UsersService.requestPasswordReset` (a
  peça de convite por e-mail construída pro Cadastro de Usuário desta
  mesma sessão — reaproveitada aqui sem mudar nada). A Role
  "Administrador" com **todas as permissions do catálogo** é criada
  em tempo de execução, mesma lógica que só existia hardcoded em
  `prisma/seed.ts:816-836` pra ALEPEJO.
  - `signup(dto)`: cliente novo — nasce raiz, plano ENTERPRISE mas
    **sem nenhum add-on habilitado** (mesma regra de sempre: add-on
    só depois de vendido/habilitado à parte). O e-mail informado no
    cadastro vira o login do primeiro usuário (Administrador) —
    fecha com a visão registrada antes ("e-mail da compra vira
    Superusuário").
  - `createAdditional(companyId, dto)`: resolve a raiz de quem está
    pedindo (`rootCompanyId ?? própria empresa`), valida raiz de
    CNPJ (só dígitos, 8 primeiros) contra a raiz — `BadRequestException`
    clara se não bater. **Copia o plano e os módulos habilitados da
    raiz** pra empresa nova (mesma licença, sem comprar de novo).
- **Endpoints novos**: `POST /companies/signup` (`@Public()`) e
  `POST /companies/additional` (`@Permissions('company.create')`,
  permissão que já existia no catálogo — sem seed novo).
- **Tela pública `/cadastro-empresa`**: Razão social/Nome
  fantasia/CNPJ (com máscara)/E-mail/Telefone/Nome do administrador
  → sucesso mostra que o e-mail vai receber o link de definir senha.
  **Botão "Criar conta" do login, que era só enfeite desde uma
  sessão antiga (pendência registrada há tempo neste doc), agora
  leva pra essa tela** — pendência fechada de quebra.
- **Botão "Cadastrar empresa" em `/erp/licenciamento`** (gated por
  `company.create`): modal com os mesmos campos + E-mail do
  administrador (aqui pode ser diferente de quem está cadastrando,
  já que é o login da empresa nova). Mensagem de sucesso avisa
  explicitamente que **o usuário atual não ganha acesso automático**
  à empresa nova (ver pendência abaixo).

### Testado de verdade, ponta a ponta, pela tela

**Fluxo 1 (cliente novo)**: cadastrei "Empresa Teste Signup LTDA"
(CNPJ de teste) → conferi no banco: plano ENTERPRISE, 0 módulos
add-on, 1 Role com 184 permissions, 1 usuário `PENDING_ACTIVATION` →
setei o token de reset direto no banco (sem SMTP real neste
ambiente, mesmo truque de sempre) → `/definir-senha` funcionando →
**login de verdade com o usuário novo**: menu mostrou só os módulos
base (Cadastros/Compras/Comercial/Estoque/Financeiro/Dashboard/
Relatórios), **sem** Recursos Humanos/Produção (confirma que os
add-ons realmente não vieram de graça) → conferi também que "Criar
conta" no login leva pra `/cadastro-empresa` de verdade.

**Fluxo 2 (empresa adicional)**: logado como Alessandro (ALEPEJO) →
"Cadastrar empresa" com CNPJ de raiz **diferente** → bloqueado com a
mensagem certa → mesmo formulário com CNPJ de raiz **igual** à da
ALEPEJO (`00000000` + finais diferentes) → sucesso → conferi no
banco: `rootCompanyId` apontando pra ALEPEJO, mesmo plano
ENTERPRISE, **os 4 mesmos add-ons herdados** (BRANDING/HR/PRODUCTION/
LABOR, sem precisar habilitar de novo), Role própria com 184
permissions, usuário próprio `PENDING_ACTIVATION`.

**Dados de teste revertidos**: as duas empresas de teste (e seus
usuários) excluídas do banco depois de confirmado tudo.

### Tela "Empresas do grupo" — pergunta do usuário logo depois de terminar

O usuário perguntou, com razão: depois de cadastrar, onde vê/edita/
inativa as empresas? Não existia nada — só o cadastro em si.
Completado na mesma sessão:

- **Dois bugs reais encontrados e corrigidos**: `UpdateCompanyDto`
  tinha o **mesmo bug já corrigido em `UpdateUserDto`** nesta sessão
  — campos redeclarados só pra documentação do Swagger, sem
  decorator de validação, faziam `PATCH /companies/me` (e o endpoint
  novo abaixo) rejeitar com "campo não é permitido". Corrigido do
  mesmo jeito, em todos os 7 campos. E: **`Company.active` nunca era
  checado em lugar nenhum** — desativar uma empresa não tinha efeito
  real nenhum até agora (achado ao investigar o que "inativar"
  deveria fazer de verdade).
- **`Company.active` agora bloqueia login de verdade**: checado em
  `AuthService.validateUser` (login) **e** em `JwtStrategy.validate`
  (roda em toda request autenticada — desativar uma empresa derruba
  sessões já abertas na hora, não só impede logins novos).
- **`GET /companies/group`** (permissão `company.view`) — lista raiz
  + filiais (mesma `rootCompanyId`). **`PATCH /companies/group/:id`**
  (permissão `company.update`) — edita/ativa/desativa uma empresa do
  grupo, validando que ela pertence ao mesmo grupo de quem está
  pedindo (`ForbiddenException` senão — protege contra editar empresa
  de outro cliente).
- **Seção "Empresas do grupo" em `/erp/licenciamento`**: tabela com
  Razão social (marca "Raiz" na que não tem `rootCompanyId`),
  CNPJ, Situação, botões Editar (modal) e Ativar/Desativar (com
  confirmação "tem certeza?"). Só aparece quando há mais de uma
  empresa no grupo — cliente com uma empresa só não vê a seção.
- **Testado de verdade**: descobri no caminho que **o usuário já
  tinha testado o cadastro de empresa adicional sozinho antes de eu
  chegar nessa parte** (empresa "Alessandro Lourenco" com login real,
  senha já definida) — não mexi nela. Criei uma empresa de teste
  separada, desativei pela tela → **login com a conta dela bloqueado
  de verdade (401, "Empresa inativa")** → reativei → login voltou a
  funcionar. Dados de teste (só os meus, não os do usuário) revertidos
  depois.

### Pendência conhecida (registrada de propósito, não resolvida)

- ~~Login cruzado entre empresas do mesmo grupo não existe~~ —
  **feito em 13-08-2026** (`UserCompany` + seletor de empresa no
  `TopBar` + tela "Vincular usuário"), ver seção no topo do
  documento.
- **Relatório consolidado por grupo** (pedido do usuário, ainda não
  construído): DRE/balanço somando todas as empresas da mesma raiz
  (`rootCompanyId`), com detalhamento por empresa — despesas,
  receitas, compras, vendas. A estrutura de dados já suporta (é só
  agrupar/filtrar por `rootCompanyId` nos relatórios de Contas a
  Pagar/Receber, Compras e Vendas que já existem), mas o relatório em
  si fica pra uma próxima sessão.
- **`Company.code`** pra empresa adicional usa raiz do CNPJ + 4
  dígitos de timestamp (evita colisão sem precisar pedir um código
  manual no formulário) — funcional, mas não é um código "bonito"
  como os cadastrados manualmente (ex.: `ALEPEJO`). Se precisar de
  um código mais legível, dá pra trocar por um campo no formulário.

## 🔵 Ajustes na Segurança + Notificações com SMTP por empresa (12-08-2026, mesma sessão)

Depois de entregar o Cadastro de Usuário/Perfis (seção logo abaixo),
o usuário pediu mais 3 coisas na sequência, todas feitas e testadas:

1. **Matriz de permissões — linha "Contas a Pagar/Receber" ganhou
   "Estornar documentos"**: o sistema já tinha um estorno de baixa de
   título (`reopen`), só que usando a mesma permissão de "Baixar
   Títulos" (`financial-entry.settle`) — a célula passou a reaproveitar
   essa permissão (usuário confirmou, sem criar código novo). Ajuste
   em `frontend/src/app/erp/configuracoes/perfis/[id]/permissoes/page.tsx`
   (`REVERSE_EQUIVALENT_CODES`).
2. **Confirmação em toda ação de "Estornar" do sistema** (pedido:
   "tem certeza que deseja estornar? Sim/Não"): adicionado
   `window.confirm` antes de chamar a API nos 3 botões literalmente
   chamados "Estornar" que já existiam — Produção (`Estornar
   conclusão`, `producao/ordens/page.tsx`), Financeiro (`Estornar
   baixa`, `FinancialEntriesScreen.tsx`), Recebimento de compras
   (`Estornar recebimento`, `compras/recebimento/page.tsx`).
   **Deliberadamente não mexi** nos botões "Reabrir"/"Desfazer
   aprovação" de Ponto/Faltas/Vendas (terminologia diferente no
   sistema — "Reabrir" ≠ "Estornar" — não perguntei se o usuário
   queria isso também, fica pendente se ele quiser expandir).
3. **"Marcar tudo" por linha na matriz de permissões**: checkbox novo
   na frente de cada linha (`getRowPermissionIds`) que marca/desmarca
   de uma vez só todas as células reais daquela linha. Fix necessário
   junto: `toggle()` agora só concede o que falta e só revoga o que
   já existe (antes, marcar um grupo parcialmente concedido dava erro
   "já vinculada" tentando conceder de novo uma permissão que uma das
   células já tinha).

### Configuração de E-mail por empresa (SMTP) — pedido novo, feito nesta sessão

Pedido do usuário: hoje o envio de e-mail (cotação, redefinição de
senha etc.) só funciona com SMTP fixo no `.env` do servidor — ele
quer que **cada empresa configure o e-mail que quiser** direto pela
tela, numa página nova em Configurações **com abas** (pensando em
"futuramente ter mais coisas"), reaproveitando esse layout de abas
pra também abrigar o WhatsApp (que tinha tela própria).

- **`Company` ganhou campos de SMTP** (migration
  `20260813011657_add_company_smtp_settings`): `smtpHost`,
  `smtpPort`, `smtpUser`, `smtpPasswordEncrypted`, `smtpFromEmail`,
  `smtpFromName`, `smtpEnabled`.
- **`EncryptionService` novo** (`Backend/src/core/security/
  encryption.service.ts`, AES-256-GCM, chave derivada de
  `ENCRYPTION_KEY` ou `JWT_SECRET` via SHA-256) — diferente do
  `PasswordService` (hash, não-reversível): a senha de SMTP precisa
  voltar ao valor original pra autenticar no servidor, então não dá
  pra só hashear.
- **`EmailNotificationsService` reescrito**: `send()`/`sendVerbose()`
  agora recebem `companyId` e resolvem a config em cascata — SMTP
  próprio da empresa (`smtpEnabled` + host configurado) senão cai no
  `.env` global, mantendo funcionando quem não configurou nada ainda.
  **Todos os 7 lugares que chamavam `send()`** foram atualizados pra
  passar o `companyId` (Pedido de Compra, Pedido de Venda, Orçamento,
  Cotação, avisos de exame/aniversário — 2 chamadas —, e o
  `requestPasswordReset` do Cadastro de Usuário desta mesma sessão).
- **Endpoints novos** (`Backend/src/modules/notifications/controllers/
  email-settings.controller.ts`): `GET/PUT /notifications/email/settings`
  (senha nunca volta pro frontend — só um `hasPassword: boolean`;
  campo vazio no PUT mantém a senha salva, só troca se vier
  preenchido) e `POST /notifications/email/test` (usa `sendVerbose`,
  devolve o motivo real do erro). Permissões novas `email.view`/
  `email.manage` (seed, grupo `EMAIL`).
- **Tela nova `/erp/configuracoes/notificacoes`** com **abas**
  ("Configuração E-mail" / "Configuração WhatsApp", desenhada pra
  caber mais abas no futuro). O conteúdo do WhatsApp foi **movido**
  da tela própria antiga (`/erp/configuracoes/whatsapp`, **apagada**)
  pra um componente (`frontend/src/components/settings/
  WhatsappSettingsTab.tsx`) dentro dessa página nova — WhatsApp
  continua sessão única global do sistema (não por empresa, diferente
  do e-mail), só mudou de endereço. Componente novo
  `EmailSettingsTab.tsx`: Servidor/Porta/Usuário/Senha/E-mail do
  remetente/Nome do remetente/Habilitado + botão de teste. **Campos
  de remetente vêm pré-preenchidos com o e-mail e nome já cadastrados
  da empresa** (pedido explícito do usuário — "mesmos dados de envio
  pra cotação" —, `companyService.getMine()`), editável livremente.
  Menu do avatar: item "WhatsApp" virou **"Notificações"**, mesmo
  lugar, aponta pra essa página nova.
- **Testado de verdade pela tela**: configurei host/usuário de teste,
  salvei, recarreguei a página e confirmou que persistiu; aba
  WhatsApp confirmada intacta (sessão já pareada continuou
  "Conectado" normalmente depois da mudança de tela). **Dados de
  teste revertidos** (host/usuário de teste limpos, `enabled: false`)
  — **não tinha credencial SMTP real disponível nesta sessão pra
  testar o envio de verdade**, só o fluxo de salvar/carregar/
  criptografar. Usuário ainda precisa configurar um SMTP real (ex.:
  Gmail com senha de app) e testar o envio de fato quando quiser usar
  pra valer.
- **WhatsApp virou sessão por empresa** (mesma sessão, pedido logo
  em seguida do usuário: "quando o cliente comprar, esses dados vão
  todos vazio pra eles preencherem, o mesmo será pro WhatsApp"): até
  aqui era **uma sessão só, global pro sistema inteiro** — se uma
  empresa pareasse um número, todas as outras veriam o mesmo
  conectado. `WhatsappNotificationsService` reescrito: em vez de um
  `sock`/`status`/`qr` único, agora é um `Map<companyId, sessão>`,
  cada empresa com sua própria pasta de credenciais
  (`whatsapp-auth/<companyId>/`, antes era `whatsapp-auth/` direto).
  `onModuleInit` varre as subpastas e reconecta cada empresa que já
  tinha sessão pareada. Controller e os 6 lugares que chamavam
  `send()`/`sendVerbose()` (Pedido de Compra/Venda, Orçamento,
  Cotação, avisos de exame/aniversário) passaram a mandar o
  `companyId`. **Migração da sessão já pareada da ALEPEJO**: os
  ~5.100 arquivos que estavam soltos em `whatsapp-auth/` foram
  movidos pra `whatsapp-auth/<companyId da ALEPEJO>/` — testado
  reiniciando o backend e conferindo log `WhatsApp conectado (empresa
  ...)` e a tela mostrando "Conectado" igual antes, sessão não se
  perdeu.
- **Pendência conhecida**: o item de menu "Notificações" usa
  `permission: "email.view"` como gate único — um perfil com só
  `whatsapp.view` (sem `email.view`) não vê o item no menu, mesmo
  podendo usar a aba WhatsApp se acessasse a URL direto. Não é falha
  de segurança (cada aba já checa sua própria permissão nos dados),
  só uma limitação de UX a resolver se algum perfil precisar dessa
  combinação específica.

## 🔵 Cadastro de Usuário e Perfis de Acesso — implementado e testado (12-08-2026)

Resultado da frente "Segurança primeiro" (ver decisão logo abaixo):
**cadastro de usuário + perfis com matriz de permissões** construído
do zero e testado ponta a ponta pela tela. Resolve a pendência antiga
mais citada neste doc ("não existe nenhuma UI de cadastro de
usuário"). Descoberta importante: **o RBAC completo já existia no
backend** (`User`/`Role`/`Permission`/`RolePermission`/`UserRole`,
CRUD pronto em `Backend/src/modules/identity/`) — o trabalho foi
telas novas + extensões pontuais, não construir do zero.

**Onde entrar**: menu do avatar → **Usuários** (`/erp/configuracoes/
usuarios`) e **Perfis de acesso** (`/erp/configuracoes/perfis`).
Ainda são telas soltas no menu do avatar — quando a navegação em
guias/OS existir (frente adiada, ver seção logo abaixo), é só
reencaixar o link, sem refazer a tela.

### O que foi feito

- **Migration** (`20260812234825_add_user_profile_fields_and_password_reset`):
  `User` ganhou `department`, `manager` (só informativo), `alias`,
  `passwordResetTokenHash`, `passwordResetTokenExpiresAt`.
- **Ações de usuário**: Ativar/Desativar (reaproveita `PATCH
  /users/:id` com `{active}`, já existia); **Bloquear Conta/
  Desbloquear** (endpoints novos, mexem no mesmo `lockedUntil` que o
  login já respeitava de verdade — confirmado testando login de
  usuário bloqueado retornando 401); **Copiar** (sem endpoint novo —
  só abre o formulário de criação pré-preenchido com
  Departamento/Gerente/Alias/Perfil do usuário copiado, e-mail em
  branco).
- **Vínculo usuário↔perfil**: `CreateUserDto`/`UpdateUserDto`
  ganharam `roleId` opcional; `UsersService` sincroniza o vínculo
  `UserRole` (seleção única na UI, mesmo o modelo suportando N:N).
- **Fluxo de redefinição de senha por e-mail** (não existia nada
  disso antes — nenhum forgot-password/convite em todo o sistema):
  botão "Alterar Senha" dispara `POST /users/:id/reset-password-email`
  (gera token aleatório, hash salvo, e-mail best-effort via
  `EmailNotificationsService`, mesmo padrão já usado em Pedido de
  Compra/Orçamento); link leva pra `/definir-senha` (página pública
  nova, fora do `AppShell`) que consome `POST /auth/set-password`
  (`@Public()`, mesmo padrão do login). Usuário novo nasce com senha
  aleatória descartável — o acesso real sempre passa por esse fluxo,
  não existe campo de senha no formulário de cadastro. **Essa base
  já serve pronta** pra quando a visão futura de Licenciamento
  ("convite por e-mail pra definir senha") for retomada.
- **Tela "Perfis de acesso"**: CRUD simples de `Role` (nome/código/
  descrição/ativo) + link "Configurar permissões" por linha.
- **Tela "Configurar perfil" (matriz de permissões)**: uma linha por
  módulo real do sistema (por `PermissionGroup`, que já batia quase
  1:1 com os grupos do menu), colunas cadastrar/editar/excluir/
  consultar + Aprovador Compras/Aprovador vendas/Entrada e saída
  Estoque/Concluir produção/Ajustes de estoque/Ajuste Horas/Estornar
  documentos — cada célula só fica clicável onde existe permission
  code real por trás (senão mostra "—"). **Duas permissões novas**
  criadas no catálogo pra fechar colunas que não tinham permissão
  correspondente: `purchase.reverse` ("Estornar Compras"),
  `sale.reverse` ("Estornar Vendas"); e `system.admin`
  ("Administração Geral") — essa última não virou coluna da matriz
  (não tem módulo natural), ficou como checkbox único separado perto
  do nome do perfil. **Sem endpoint novo pra grant/revoke** — reusa
  `POST`/`DELETE /identity/role-permissions` já existentes, um
  clique = uma chamada, otimista com reversão em erro.
- **"Estornar documentos" também na linha "Contas a Pagar/Receber"**:
  o sistema já tinha um estorno de baixa de título (`reopen`), só que
  usando a mesma permissão de "Baixar Títulos"
  (`financial-entry.settle`) — a célula agora reaproveita essa
  permissão existente (usuário confirmou, sem criar código novo),
  em vez de ficar com "—" como nas outras linhas sem estorno.
- **Coluna "Visível" do mockup**: por decisão do usuário, é a mesma
  coisa que "consultar" (view) — não virou coluna própria.
- **Toggles de nível alto do mockup** (APPs/ERP ALEPEJO/OS/
  Configurações/personalizações/licenciamento) **ficaram de fora**
  desta rodada — não existe ainda o esqueleto de guias/OS pra eles
  controlarem de verdade. Pendência consciente.

### Dois bugs reais encontrados e corrigidos no caminho (pré-existentes, não da sessão de desenho)

- **`RoleFilterDto`** (`Backend/src/modules/identity/roles/dto/role-filter.dto.ts`):
  `page`/`limit` eram `number` com `@IsNumberString()` e valor padrão
  numérico (`= 1`) — o padrão nunca batia com o próprio validador
  (esperava string, recebia number), então **qualquer chamada a `GET
  /identity/roles` sem `?page=`/`?limit=` explícito na URL quebrava**
  (400 "page é inválido"). Corrigido trocando o tipo/default pra
  string (`'1'`/`'20'`), consistente com o decorator. Endpoint nunca
  tinha sido exercitado por nenhuma tela até agora.
- **`UpdateUserDto`** (`Backend/src/modules/identity/users/dto/update-user.dto.ts`):
  o campo `active?: boolean` (redeclarado só pra doc do Swagger) não
  tinha nenhum decorator de `class-validator` — o
  `ValidationPipe({whitelist, forbidNonWhitelisted})` global rejeitava
  **qualquer** `PATCH /users/:id`, mesmo sem "active" no corpo
  enviado (a declaração de campo nu na classe já bastava pra
  `class-validator` tratá-lo como propriedade "desconhecida"/proibida
  na instância transformada). Travava editar qualquer usuário — bug
  crítico pra esta feature, corrigido com `@IsOptional() @IsBoolean()`.

### Testado de verdade, ponta a ponta, pela tela (não só por API)

Criei usuário de teste com perfil Administrador → editei o perfil pra
um perfil novo restrito (só `partner.view` concedido) → **login como
esse usuário mostrou só Cadastros/Relatórios no menu**, dashboard
zerado, e tentar abrir `/erp/produtos` deu **403 de verdade do
backend** ("Você não possui permissão"), não só escondido do menu →
Alterar Senha (token debugado direto no banco pra não depender de
SMTP local, `/definir-senha` funcionando, login com a senha nova
funcionando) → Bloquear Conta (login retornou 401 "bloqueada") →
Desbloquear (login voltaria a funcionar) → Desativar (status virou
Inativo) → Copiar (abriu form pré-preenchido certo, conferido via
JS) → Perfis: criar, editar nome, matriz marcando/desmarcando
persistindo depois de F5. **Dados de teste revertidos** (usuário e
perfil de teste excluídos via API depois — sem botão de excluir
usuário na tela ainda, só soft-delete por API, ver pendência abaixo).

### Pendências conhecidas

- **Sem botão "Excluir" na tela de Usuários** — o backend já suporta
  (`DELETE /users/:id`, soft delete), só não foi colocado na UI
  (não estava no mockup do usuário, que só tinha Ativar/Desativar/
  Bloquear pro ciclo de vida).
- **Role "Administrador" não tem `isSystem: true`** no seed — o campo
  existe no schema exatamente pra evitar exclusão acidental do
  perfil admin, mas o seed nunca setou. Com a tela nova de Perfis,
  **dá pra excluir o Administrador pela UI hoje** (proteção só
  esconde o botão quando `isSystem` é true). Vale considerar setar
  `isSystem: true` nele no seed quando for mexer nessa área de novo.
- **`system.admin` ("Administração Geral")** existe como permissão e
  tem checkbox na tela, mas **nenhum guard do sistema ainda checa
  essa permissão** pra dar bypass total — é só o vínculo, sem efeito
  prático ainda.
- **"Definição concluída"** calculada de `!mustChangePassword` — o
  usuário admin seed (`alessandro.lourenco@alepejo.com.br`) aparece
  como "Não" porque o seed nunca setou esse campo pra ele
  (`mustChangePassword` default `true` no schema); não afeta o login
  dele, só a leitura dessa coluna específica na lista.
- Durante a sessão, matei um processo de backend órfão (PID antigo,
  travando o `.dll` do Prisma Client no `prisma generate`) — se algo
  parecer ter caído no meio da sessão anterior a esta, é isso.

## 🔵 Ordem de implementação combinada (12-08-2026): Segurança primeiro

**Decisão final desta sessão de desenho**: construir primeiro **OS →
Segurança** (cadastro de usuário + perfis/permissões, ver mockups
detalhados na seção "OS → Segurança — mockups do cadastro de
usuário/perfis" mais abaixo) como **tela normal do sistema atual**
(fora do esquema de guias, que ainda não existe) — resolve uma
lacuna real (hoje não existe nenhuma UI de cadastro de usuário) e é
praticamente autocontido. A reestruturação de navegação em guias
(ERP/OS, guias, overlay do menu) **fica pra depois**, por ser a
mudança mais arriscada (mexe em como toda tela abre hoje) e não
bloqueia o Segurança. Quando o esqueleto de guias existir depois,
Segurança só precisa ser reencaixado no menu como card de OS, não
reconstruído.

## 🔵 Desenho de navegação em guias (detalhado nesta sessão, build fica pra depois — ver ordem de implementação acima)

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

### Respostas do usuário (12-08-2026, mesma sessão que abriu a frente)

1. **Dois apps na navegação**: **SISTEMA ERP** e **OS** (Ordens de
   Serviço). A OS não é só ordem de serviço em si — o usuário pensa
   nela também como o lugar pra **configurações de sistema e criação
   de usuários, API, tudo que for de configuração** (ou seja, o
   módulo grande e pendente de "Cadastro de Usuários"/administração,
   registrado em pendências antigas mais abaixo neste doc, entraria
   dentro do app OS, não dentro do ERP). Ainda não perguntei se
   "entrar" no app é uma escolha na tela de login (uma vez por sessão)
   ou um alternador que fica disponível o tempo todo dentro do
   sistema — perguntar antes de desenhar a navegação em si.
2. **Limite de 6 guias**: ao tentar abrir a 7ª, **bloqueia** — mostra
   mensagem de erro de acesso, não fecha a mais antiga sozinha.
3. **F5 no navegador**: as guias **sobrevivem e são atualizadas**
   (recarregam). Se alguma guia estava com **algo em edição**, o F5
   **sai da edição** e volta pra tela principal daquela guia — mesmo
   se havia subtelas abertas dentro dela.
4. **Escopo das guias**: só os **módulos** (telas principais do menu)
   viram guia. **Subtelas, tela de impressão e etiqueta continuam
   como são hoje** (fora do esquema de guias, padrão atual mantido).
5. **Referência visual**: usuário vai mandar **prints de tela** do
   Infor CloudSuite (não vai passar login) — aguardando.

### Prints do Infor CloudSuite recebidos e mapeados pro Alepejo ERP (12-08-2026)

Usuário mandou 4 prints da estrutura real do Infor CloudSuite. Leitura
dos prints e como mapeia pro nosso sistema, confirmado nas mensagens
do usuário:

- **Ícone de menu (grid) no canto superior esquerdo**: abre a sidebar
  de navegação **por cima de tudo na tela** (overlay), com busca no
  topo e a árvore de módulos/telas — é o menu lateral que já existe
  hoje, muda o comportamento (overlay em vez de fixo), não o
  conteúdo.
- **Guias de primeiro nível ("apps")**: no Infor, "CloudSuite WMS" e
  "OS" ficam lado a lado no topo. No Alepejo: **"Sistema ERP Alepejo"**
  (equivalente ao CloudSuite WMS) e **"OS"**. São dois apps
  separados, cada um com sua própria área de guias de tela dentro.
- **Guia "OS"**: ao abrir, mostra uma tela inicial em cards. O usuário
  quer 3 cards: **Portal**, **Segurança** (vai ser o **cadastro de
  usuários e perfis de acesso** — "criar novo usuário" e "criar
  perfis de acesso" ficam dentro dela; **resolve a pendência antiga
  de "Cadastro de Usuários"** registrada mais abaixo neste doc — ela
  mora dentro de OS, não dentro do ERP) e **APIs**.
- **Dentro do app "Sistema ERP Alepejo"**: o menu lateral continua
  exatamente como é hoje (sidebar com os módulos/telas). O que muda:
  **cada item de menu clicado abre numa guia de segundo nível** (nova
  aba ao lado de "Página inicial", ex.: "Ordem de compra"), em vez de
  trocar o conteúdo da página inteira como acontece hoje.
- **Barra de guias de segundo nível tem dois controles**:
  **FAVORITOS** (salvar telas específicas pra ficarem de acesso
  rápido ali, sem precisar navegar pelo menu lateral de novo) e
  **FERRAMENTAS** (fecha todas as guias abertas e dá refresh na guia
  atual).

**Aviso do usuário**: as telas dos prints (Ordem de compra, Portal,
Segurança, APIs etc.) são **só exemplos de estrutura/comportamento**,
não uma lista literal do que construir — o que vale copiar é o
padrão de guias em dois níveis, overlay do menu, Favoritos/Ferramentas.

**Confirmado**: o limite de 6 guias é **por app** — Sistema ERP
Alepejo com até 6 guias próprias e OS com até 6 guias próprias,
independentes um do outro.

### Mais decisões do usuário (mesma sessão, continuando o detalhamento)

- **Guia duplicada**: clicar num item do menu pra uma tela que já está
  aberta numa guia **reaproveita a guia existente** (traz pra frente),
  não abre outra.
- **Overlay do menu**: ao escolher um item, o overlay **fecha
  sozinho** (igual o padrão do Infor no print).
- **Título da guia**: mostra o **nome do registro quando disponível**
  (ex.: editando um colaborador, a guia mostra o nome dele, não só
  "Colaboradores") — ajuda a diferenciar guias iguais abertas com
  registros diferentes.
- **Itens de hoje do menu do avatar** (Licenciamento, Configurações,
  Personalização, WhatsApp, Ponto-Manual):
  - **Ponto-Manual**: fica só no avatar (uso pessoal do dia a dia).
  - **Personalização**: fica no avatar **e também** vai pra dentro de
    OS (duplicado, disponível nos dois lugares).
  - **Licenciamento, Configurações, WhatsApp**: por eliminação, vão
    pra dentro de OS (não foram citados como "ficam no avatar").

### Decisão grande: "menus de apoio" de todos os módulos migram pra OS → Configurações

Pedido do usuário: dentro de OS, card **"Configurações"** vira o lugar
central pra **todos os menus de apoio/cadastros de configuração que
hoje ficam espalhados dentro de cada módulo do ERP** ("tudo que for
configuração"). Estrutura: Card Configurações → dentro dele, um card
por módulo (nome do menu original) → dentro desse, os submenus/telas
de configuração daquele módulo. Exemplos dados pelo usuário:
- Configurações → **Cadastro** → Categorias e Marcas.
- Configurações → **Estoque** → Cadastro de Depósitos.
- Configurações → **Financeiro** → Plano de contas.
- "e assim por diante" — vale pra todo cadastro de apoio/configuração
  de qualquer módulo (RH, Compras, Vendas, Produção, LABOR etc.), não
  só os 3 exemplos citados.

**Fechado, com base na lista real de**
`frontend/src/components/layout/Sidebar/menu.ts` (levantada e
proposta item a item, usuário confirmou/ajustou): só estes submenus
de apoio **saem do menu principal do ERP** e passam a existir **só**
dentro de OS → Configurações → [card do módulo] — todo o resto do
menu (incluindo Orçamento e Benefícios, que eu tinha achado
ambíguos) **fica no ERP**:

- Cadastros → **Categorias e marcas** (`produtos-auxiliares`)
- Financeiro → **Plano de contas** (`plano-contas`)
- Estoque → **Depósitos** (`depositos`)
- Financeiro → **Classificações** (`classificacoes`)
- RH → **Funções e cargos** (`funcoes`)
- RH → **Setores, horários e EPI** (`rh-cadastros`)
- Produção → **Configurações** (`producao-configuracoes`)

**Personalização** continua sendo o único item duplicado (fica no
avatar e também em OS).

**Fechado (respostas do usuário)**:
- A tela "Configurações" que já existe hoje no avatar
  (`/erp/configuracoes`, dados da empresa, item `configuracoes` em
  `systemMenuItems`) vira um **card separado chamado "Empresa"**
  dentro de OS — não fica dentro do card-contêiner "Configurações"
  que reúne os 7 itens de apoio acima.
- **RH → Chave de API (relógio de ponto)** (`ponto-chave-api`) **e
  WhatsApp** (`whatsapp`, hoje no avatar): os dois vão pra **OS →
  card "APIs"** (não pro card "Configurações").

### Estrutura de cards de OS fechada até aqui

- **Portal** (card do Infor, sem conteúdo definido ainda pro
  Alepejo).
- **Segurança** → criar usuário, criar perfis de acesso (resolve a
  pendência antiga de "Cadastro de Usuários").
- **APIs** → Chave de API do relógio de ponto, WhatsApp, e **regra
  geral**: qualquer outra integração/API que o sistema ganhar no
  futuro entra dentro desse mesmo card, não espalha em outro lugar.
- **Empresa** → a tela de Configurações/dados da empresa que já
  existe hoje (`/erp/configuracoes`).
- **Configurações** (card-contêiner) → um card por módulo, cada um
  com os submenus de apoio daquele módulo: Cadastro (Categorias e
  marcas), Estoque (Depósitos), Financeiro (Plano de contas,
  Classificações), RH (Funções e cargos, Setores/horários e EPI),
  Produção (Configurações).
- **Personalização** → **card próprio** em OS, além de continuar no
  avatar (único item duplicado nos dois lugares).
- **Licenciamento** → **card próprio** em OS.

### Cards de OS — lista fechada

Portal, Segurança, APIs, Empresa, Configurações (contêiner por
módulo), Personalização, Licenciamento.

### OS → Segurança — mockups do cadastro de usuário/perfis (12-08-2026)

Usuário mandou 4 prints (planilha, não tela real) detalhando como
quer o card **Segurança** dentro de OS. Isso é o desenho da pendência
antiga registrada acima neste doc ("não existe hoje nenhuma tela de
Cadastro de Usuários", só API sem UI). 3 telas + 1 lista de exemplo:

**Tela 1 — Lista de usuários**
- Botão **"Novo usuário"**.
- Menu **"Ação"** (aplicado ao(s) usuário(s) marcado(s) via
  checkbox): Ativar, Desativar, **Copiar** (clona um usuário
  existente com todas as permissões dele, pra criar um novo já
  configurado igual), **Alterar Senha** (dispara e-mail pro usuário
  definir uma senha nova), Bloquear Conta, Desbloquear.
- Colunas da tabela: checkbox de seleção, um ícone de ação por linha
  (**não perguntei ainda o que faz** — atalho de editar? entrar
  como/impersonar?), Definição concluída (ícone de check — onboarding
  do usuário completo ou não), Nome completo, Endereço de e-mail, ID
  federada (login SSO/federado — provavelmente campo pra usar
  futuramente, sem integração hoje), Último logon, Status, Email
  verificado, Senha expirada, Conta bloqueada.

**Tela 2 — Cadastro de usuário** (novo/editar)
- Botão Salvar.
- Campos: Nome, Empresa, Email, Departamento, **Nome do Usuário
  Login** (mesmo valor do e-mail, **não editável depois de criado**),
  Gerente (**não perguntei ainda se é só informativo ou se alimenta
  algum fluxo de aprovação**), Alias do Usuário, **Perfil de
  segurança** (dropdown — populado pelos perfis cadastrados na Tela
  3, pedido explícito do usuário: "conforme for cadastrando os
  perfis, ter uma opção de lista de perfis pra escolha dentro do
  cadastro de usuário").

**Tela 3 — Configurar perfil** (perfis de acesso/permissões)
- Campo Nome do Perfil.
- Checkboxes de nível alto (acesso grosso, antes de entrar no
  detalhe): **APPs, ERP ALEPEJO, OS, Configurações, personalizações,
  licenciamento** — liga/desliga o acesso a cada app/card de nível
  superior pra esse perfil.
- Campo de Filtros (2 caixas) pra achar linha rápido na tabela grande
  de baixo.
- **Tabela grande de permissões**, uma linha por módulo+menu — pedido
  explícito: **"listar todos os módulos e submenus com as caixas
  para seleção"**, ou seja, todo item real de `menu.ts` (Cadastro/
  parceiros, Cadastro/produtos, Compras/compras, Compras/cotações
  etc.) vira uma linha. Colunas de permissão por linha: **cadastrar,
  editar, excluir, consultar, Visível** (genéricas, CRUD + visível no
  menu) **+ colunas de ação de negócio específica**: Estornar
  documentos, Aprovador Compras, Aprovador vendas, Entrada e saída
  Estoque, Concluir produção, Ajustes de estoque, Ajuste Horas,
  Configurações gerais, Administração geral (nem toda coluna faz
  sentido pra toda linha — ex.: "Aprovador Compras" só é relevante
  pras linhas de Compras — o mockup mostra a coluna pra toda linha
  mesmo assim, deixando em branco o que não se aplica).

**Lista de exemplo de perfis** (não é fixa, é só exemplo de nomes que
o usuário já pensou, perfis são criados livremente pela Tela 3):
SuperUsuarios, Supervisores, Administrador, Usuarios, Operação.

**Nota técnica minha, registrada pra quando isso virar implementação**
(não é decisão do usuário, é observação de arquitetura): o sistema
**já tem hoje** um RBAC funcionando por trás de cada tela (strings
tipo `"product.view"`, `"employee.update"` etc., grupos de permissão
no `seed.ts`, é assim que o menu decide o que mostrar). A matriz nova
do mockup (cadastrar/editar/excluir/consultar/visível + colunas de
ação de negócio) vai precisar **mapear pra esse sistema de permissões
que já existe**, não é uma reformulação do zero — isso é trabalho de
levantamento técnico pra fazer quando essa tela for construída de
verdade (bater cada checkbox da matriz contra a lista real de
permissions do backend), não precisa ser resolvido nesta fase de
desenho.

**Respondido pelo usuário**:
- Ícone de ação da Tela 1: não é uma ação própria — é o **gatilho do
  menu "Ação"** (Ativar/Desativar/Copiar/Alterar Senha/Bloquear
  Conta/Desbloquear), que só fica habilitado depois de marcar o
  checkbox de uma linha.
- Campo "Gerente" da Tela 2: **só informativo**, não aciona fluxo
  nenhum.
- **Todas as aprovações do sistema ficam dentro do perfil** (Tela 3,
  colunas tipo "Aprovador Compras"/"Aprovador vendas" e qualquer outra
  que existir) — não existe uma tela separada de configurar quem
  aprova o quê, é tudo controlado pela matriz de permissões do
  perfil.

### Visão do fluxo de compra/licenciamento → usuário Superusuário (12-08-2026)

Usuário trouxe uma visão nova, ligando o cadastro de usuário/perfis
(seção acima) ao **licenciamento**: quando o cliente **comprar o
ERP** e escolher os módulos contratados, o **e-mail usado no cadastro
da compra** deve ser **liberado automaticamente como usuário com o
perfil Superusuário** (acesso total, primeiro usuário da empresa
nova) — sem precisar de um administrador manualmente criando esse
primeiro usuário. Conforme o cliente **for comprando mais módulos**
depois (upsell), esses módulos vão **sendo ativados dentro dos
perfis** (presumivelmente liberando as linhas/colunas correspondentes
na matriz de permissão automaticamente, já que o módulo virou
disponível pra empresa).

**Isso conecta com uma pendência antiga registrada mais abaixo neste
doc** ("Ponto - Manual" / decisão em aberto sobre "Superusuário" — o
usuário tinha avisado que ainda estava pensando como resolver quem
pode lançar/aprovar ponto de qualquer colaborador, não só o próprio).
O perfil "SuperUsuarios" do mockup de perfis (seção acima) parece ser
essa mesma peça se encaixando.

Hoje **não existe um fluxo de compra/checkout self-service** no
sistema (só a tela de Licenciamento, que trata módulo habilitado por
empresa já existente, sem jornada de "cliente novo compra sozinho").
**Decisão do usuário: fica pra depois** ("ainda temos que pensar como
fazer essa parte de licenciamento, fica pra frente") — não é escopo
desta sessão de navegação, fica só a visão registrada acima pra
retomar quando for a vez desse fluxo ser desenhado.

**Pontos adicionais que o usuário já quer que constem no desenho
futuro de Licenciamento** (ainda não é pra construir agora, só
registro pra não perder quando essa frente for retomada):
- **Cadastro de empresas** entra dentro do card Licenciamento (em
  OS) — hoje a empresa (tenant) não tem uma tela de auto-cadastro,
  isso passaria a existir ali.
- **Configurar licença com limite de usuários** — por empresa, um
  teto de quantos usuários aquela licença permite criar.
- **Cadastrar o usuário inicial da empresa e amarrar esse usuário à
  empresa** — no provisionamento de uma empresa nova, já nasce um
  usuário vinculado a ela (encaixa com a visão anterior do e-mail da
  compra virando Superusuário).
- **Convite por e-mail pra definir senha**: ao invés de já mandar uma
  senha, o sistema envia o login por e-mail e a pessoa **finaliza o
  próprio cadastro definindo a senha** no primeiro acesso.
- **URL do sistema com a empresa no caminho**: o link de login deve
  levar o nome/identificador da empresa direto na URL, ex.:
  `www.alepejo.com.br/empresa/login` — assim toda vez que alguém
  acessa o sistema, a empresa já vem resolvida pelo próprio link, sem
  precisar escolher/digitar em outro lugar. **Implicação técnica
  grande pra quando for construir**: hoje o login não é
  multi-tenant por URL (não sei ainda como a resolução de empresa
  funciona no login atual — investigar antes de desenhar o
  roteamento).

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
4. ~~Multi-empresa — decisão tomada, implementação adiada de
   propósito~~ — **arquitetura implementada em 13-08-2026**
   (`UserCompany`, exatamente o modelo "1 login, várias empresas"
   descrito abaixo), ver seção "Login cruzado entre empresas do
   grupo" no topo do documento. Escopado por enquanto a empresas do
   mesmo grupo (`rootCompanyId`) — vincular um usuário a uma empresa
   **fora** do grupo dele ainda não tem tela (só seria possível hoje
   mexendo direto no banco), mas o mecanismo em si (tabela, troca de
   sessão, seletor) já serve pra isso se for pedido.
   Diagnóstico original (09-08-2026): o **isolamento de dados já é
   sólido** —
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

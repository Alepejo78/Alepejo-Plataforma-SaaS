# Continuidade do projeto — leia antes de começar

Documento de handoff. Se você é uma IA assumindo este projeto, leia este
arquivo e o `07-Escopo-Planilha.md` antes de alterar qualquer coisa.

Atualizado em: 07/08/2026

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

**Cores por tokens CSS** em `frontend/src/app/globals.css`.
Nunca usar classes fixas do Tailwind (`bg-white`, `text-zinc-500`) — elas
não acompanham o tema. Paleta: preto + dourado. Tema escuro pela classe
`.dark` (next-themes).

**Licenciamento por módulo.** Controllers usam `@Module('CODIGO')`.
Códigos: BPS, PRODUCTS, INVENTORY, PURCHASE, SALES.
Menu do frontend filtra por licença + permissão via hook `useMenu`.

---

## Situação atual

### Pronto e validado
- Identidade, RBAC, licenciamento
- Parceiros (clientes/fornecedores unificados, com máscaras e busca CNPJ/CEP)
- Produtos + categorias, marcas, unidades
- Menu agrupado por módulo com submenus
- Dashboard com contagens reais

### Feito, aguardando teste (última sprint)
- Estoque: saldo, entrada/saída/ajuste (`/erp/estoque`)
- Depósitos (`/erp/estoque/depositos`)
- Movimentações (`/erp/estoque/movimentacoes`)

**Testar:** cadastrar depósito → incluir produto no estoque → fazer entrada,
saída e ajuste → conferir histórico em Movimentações. Verificar se saldo
abaixo do mínimo aparece em vermelho, e se saída maior que o saldo é
recusada.

### Próximo na fila
1. Compras (backend pronto, falta tela)
2. Vendas (backend pronto, tela incompleta)
3. Financeiro (nada feito — ver `07-Escopo-Planilha.md`)

---

## Pendências conhecidas

- Pasta `frontend/src/components/clientes/` e `app/erp/clientes/` são resto do
  cadastro antigo, substituído por Parceiros. Podem ser removidas.
- `TenantProvider.tsx` não é usado por ninguém.
- Existe um `node_modules` e um `package.json` na raiz do projeto que parecem
  ter sido criados por engano (só 4 dependências de frontend).
- Produto não tem o campo REF (referência do fabricante) que existe na planilha.
- Cadastros auxiliares (categorias, marcas, unidades) não passam pelo
  LicenseGuard, só por permissão.
- Aviso do Prisma sobre `package.json#prisma` estar depreciado (migrar para
  `prisma.config.ts` antes do Prisma 7).

---

## Origem do escopo

A planilha `Controle Dedicar V1.0 - original(1).xlsm` na raiz é a referência
funcional. Ela foi feita para uma confecção, mas **o produto é um SaaS para
qualquer empresa**: o núcleo (parceiros, produtos, estoque, compras, vendas,
financeiro) é genérico, e Produção e RH ficam como módulos licenciáveis
opcionais.

O mapeamento aba-a-aba está em `07-Escopo-Planilha.md`.

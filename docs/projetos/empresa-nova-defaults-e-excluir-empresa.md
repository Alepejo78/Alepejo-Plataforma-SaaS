# Plano: Cadastros padrão da empresa nova + Excluir empresa (dono da plataforma)

> Criado em 31-08-2026 · Status: **Aguardando aprovação do dono**

## Objetivo

Fazer com que toda empresa nova já nasça utilizável: plano de contas padrão (42 contas / 6 classificações), unidade de medida "UN - Unidade" e o tipo de despesa do próprio ERP já cadastrados — em vez de nascer com tudo vazio como hoje. E dar ao dono da plataforma uma forma segura de excluir empresas de teste em produção, hoje inexistente, sem risco de apagar cliente pagante.

Valor: quem assina hoje entra num sistema em branco e não consegue lançar nada no Financeiro sem antes montar o plano de contas na mão; e cada teste de pagamento em produção queima um CNPJ no banco, que não dá para reaproveitar.

## O que JÁ ESTÁ PRONTO (não refazer)

**Número da fatura do Asaas nos documentos — CONCLUÍDO em 31-08-2026** (commit `4eef6bc`, em produção). `BillingCharge.invoiceNumber` é preenchido em todos os pontos que falam com o Asaas (webhook, listagem, assinatura, troca de plano) e vira o "Nº do documento" do título gerado no Financeiro do cliente (`syncFinancialEntry`). Este plano não reabre o item — ele só entra na conferência final do QA (tarefa #12).

## Escopo

**Incluído — Frente A (cadastros padrão de empresa nova)**
- Plano de contas padrão (lista exata que você passou) criado automaticamente para toda empresa nova.
- Unidade de medida `UN - Unidade` criada automaticamente.
- Conta `01.01.01 · Sistemas · Despesas com sistema ERP` como parte desse padrão, alinhando o nome com o que o código já cria hoje sob demanda.
- Acerto (backfill) das empresas que já existem.

**Incluído — Frente B (excluir empresa, restrito ao dono)**
- Ação de excluir empresa na área "Clientes e faturamento".
- Trava obrigatória: só exclui empresa sem nenhuma movimentação.
- Nova permissão na matriz de Perfis de acesso.
- Limpeza dos clientes de teste em produção.

**Fora do escopo nesta versão**
- Tela para o cliente gerenciar o plano de contas em massa (edição conta a conta já existe).
- Plano de contas de receita (a lista passada é toda de despesa).
- Restaurar empresa excluída ("lixeira").
- Módulo fiscal (decisão de 23-08-2026).
- Os dois itens em aberto abaixo, até você responder.

## Duas dúvidas que precisam de resposta antes (não decidi por você)

**1. "Criar produto serviço - código 0001 - Compra sistema ERP"** — duas leituras possíveis, com esforços muito diferentes:
- (a) É mais um cadastro padrão da empresa nova: item de catálogo tipo Serviço, código `0001`, descrição "Compra sistema ERP", só para ela já ter algo pronto. Trabalho pequeno, entra junto com a Frente A.
- (b) É peça do faturamento da AlePejo: hoje a mensalidade vira só um título avulso a pagar; nessa leitura você quer que cada mensalidade paga gere uma **Venda formal** (documento com item, quantidade e valor) usando esse produto como item. Trabalho grande — mexe no fluxo de cobrança, numeração de documento e contabilidade.

👉 É (a) ou (b)?

**2. "Acrescentar fatura."** — pode ser (a) só reforço do número da fatura, que já está pronto, ou (b) um pedido novo: botão para ver/baixar a fatura. Registrando o que já existe: o Asaas devolve um link de fatura e o sistema já o guarda em `BillingCharge.invoiceUrl` — falta só exibir esse link em algum lugar (tela de cobranças e/ou no título do Financeiro).

👉 Era só o número (já feito) ou quer o botão "Ver fatura"?

**3. (menor) Erros de digitação na lista** — a lista tem "Adminstrativo" (falta o "i"), "Cartao de Crédito" e "13 salário". O plano de contas atual da AlePejo tem exatamente os mesmos erros, então hoje está consistente. 👉 Mantenho igualzinho ao que você mandou, ou corrijo a grafia nas contas novas?

## Como funciona hoje (levantado no código)

- Empresa nova nasce em `CompanyOnboardingService.signup()` — `Backend\src\modules\identity\company\services\company-onboarding.service.ts`. Ele cria empresa → licença → perfil Administrador → primeiro usuário → e-mail de senha. **Não cria nenhum cadastro operacional.**
- Empresa adicional do mesmo grupo nasce em `createAdditional()`, mesmo arquivo — também vazia.
- Existe uma **terceira porta**: `POST /companies` (pública, sem autenticação, chama `CompanyService.create`), que cria uma empresa "crua", sem plano, sem perfil e sem usuário. Precisa ser avaliada (ver Riscos).
- `Backend\prisma\seed.ts` popula plano de contas e unidades **só da AlePejo** e roda uma vez por banco — não serve para empresa nova. É a fonte de confusão a evitar: aquela lista é a contabilidade real da AlePejo ("Adm - Internet", Certificados, Domínio), não a lista nova.
- A conta `01.01.01` do cliente hoje é criada **sob demanda**, na primeira mensalidade, por `ensureSystemExpenseAccount` (`Backend\src\modules\billing\services\billing.service.ts`, linhas 260-306), com classificação e descrição **"Despesas com Sistema"** — diferente do que você pediu agora.
- **Excluir empresa não existe.** `CompanyService.remove()` / `CompanyRepository.softDelete()` estão no código, mas nenhum controller os chama (confirmado em `company.controller.ts`) — código morto. Pendência já registrada em `docs\08-Continuidade.md` (30-08-2026).

## Achados críticos da investigação (afetam decisões)

1. **Marcar como excluída não libera o CNPJ.** `Company.document`, `slug` e `code` são únicos no banco inteiro. As buscas do sistema ignoram empresas excluídas (`deletedAt: null` no repositório), mas o banco não: recadastrar o mesmo CNPJ depois de uma exclusão lógica quebra por duplicidade. **Se o objetivo é refazer o teste com o mesmo CNPJ, a exclusão precisa ser física — ou precisa liberar documento/slug/código na hora de excluir.** É a decisão mais importante da Frente B.
2. **Empresa excluída ainda consegue logar.** `AuthService.validateUser` confere se o *usuário* foi excluído, mas não se a *empresa* dele foi. `switchCompany` e empresa padrão conferem. Buraco a fechar se ficarmos com exclusão lógica.
3. **Assinatura no Asaas continua viva.** Excluir a empresa aqui não cancela a recorrência lá. Já existe `AsaasService.deleteSubscription` — precisa ser chamada na exclusão.
4. **Empresas existentes** têm a `01.01.01` com o nome antigo ("Despesas com Sistema"). Sem script de acerto, ficamos com dois nomes para a mesma coisa.
5. **Exclusão física apaga em cascata** dezenas de tabelas ligadas à empresa — por isso a trava de "sem movimentação" é obrigatória. **NÃO VERIFICADO:** confirmado que várias relações apagam em cascata, não conferidas todas; se alguma não estiver, a exclusão falha no meio. Item para analista-bd/dba.

## Lista de contas padrão (referência para implementação)

Todas do tipo **DESPESA** (o enum `ChartOfAccountType` só tem RECEITA/DESPESA). 6 classificações, 42 contas.

| Classificação | Códigos | Qtde |
|---|---|---|
| Sistemas | 01.01.01 | 1 |
| ADM Escritorio | 01.02.01 | 1 |
| ADM Limpeza | 01.03.01 | 1 |
| Adminstrativo | 01.04.01 a 01.04.13 | 13 |
| Funcionários | 02.01.01 a 02.01.16 | 16 |
| Bancos/Taxas | 03.01.01 a 03.01.10 | 10 |

```
01.01.01  Sistemas          Despesas com sistema ERP
01.02.01  ADM Escritorio    Material de Escritório
01.03.01  ADM Limpeza       Material de Limpeza
01.04.01  Adminstrativo     Aluguel
01.04.02  Adminstrativo     Ativo Imobilizado
01.04.03  Adminstrativo     Comissão
01.04.04  Adminstrativo     Correios
01.04.05  Adminstrativo     DAS
01.04.06  Adminstrativo     Despesa Água
01.04.07  Adminstrativo     Despesas Telefone
01.04.08  Adminstrativo     Energia Elétrica
01.04.09  Adminstrativo     IPTU
01.04.10  Adminstrativo     Outras Despesas
01.04.11  Adminstrativo     Registro
01.04.12  Adminstrativo     Honorários
01.04.13  Adminstrativo     Reembolso/Devolução
02.01.01  Funcionários      Exames médicos
02.01.02  Funcionários      Laudos
02.01.03  Funcionários      Pro labore
02.01.04  Funcionários      Reclamatória Trabalhista
02.01.05  Funcionários      Reembolso Despesas
02.01.06  Funcionários      Vale Transporte
02.01.07  Funcionários      13 salário
02.01.08  Funcionários      Adiantamento Salarial
02.01.09  Funcionários      Alimentação
02.01.10  Funcionários      Extras
02.01.11  Funcionários      Férias
02.01.12  Funcionários      FGTS
02.01.13  Funcionários      Horas Extras
02.01.14  Funcionários      INSS
02.01.15  Funcionários      Rescisão
02.01.16  Funcionários      Salários
03.01.01  Bancos/Taxas      Boleto
03.01.02  Bancos/Taxas      Cartao de Crédito
03.01.03  Bancos/Taxas      Cheque BB
03.01.04  Bancos/Taxas      Contrato
03.01.05  Bancos/Taxas      Empréstimo
03.01.06  Bancos/Taxas      GRRF
03.01.07  Bancos/Taxas      ISS
03.01.08  Bancos/Taxas      Juros
03.01.09  Bancos/Taxas      Renegociação
03.01.10  Bancos/Taxas      Tarifas/Taxas bancárias
```

Unidade padrão: `UN` · `Unidade` · ativa.

Observação: essa numeração é diferente da usada hoje pela AlePejo (lá Bancos/Taxas é 02.01.xx e Funcionários é 04.01.xx). Normal — cada empresa tem o seu plano. **O plano de contas da AlePejo não será alterado.**

## Plano de execução

| # | Tarefa | Agente responsável | Complexidade | Depende de |
|---|---|---|---|---|
| **Frente A — Cadastros padrão da empresa nova** ||||
| 1 | Especificação: onde exatamente o padrão é aplicado (`signup`, `createAdditional`, e o que fazer com o `POST /companies` público), o que acontece se falhar no meio do cadastro, e como alinhar a `01.01.01` já criada pelo faturamento | projetista | Média | — |
| 2 | Conferir a lista contra as regras do banco (tamanhos de campo, chaves únicas por empresa, tipo DESPESA) e escrever o script de acerto das empresas existentes | analista-bd | Baixa | #1 |
| 3 | Revisar o script para rodar em produção (ordem, transação, o que fazer se a empresa já editou a conta na mão) | dba | Baixa | #2 |
| 4 | Implementar o serviço de cadastros padrão e ligá-lo ao cadastro de empresa nova; unificar a `01.01.01` com o faturamento (uma fonte só de verdade) | desenvolvedor-backend | Média | #1, #3 |
| **Frente B — Excluir empresa (dono da plataforma)** ||||
| 5 | Especificação da exclusão: critério exato de "sem movimentação", exclusão física × lógica (Achado 1), cancelamento no Asaas, auditoria de quem excluiu | projetista | Alta | — |
| 6 | Mapear todas as tabelas a checar/apagar e confirmar que a cascata funciona sem travar em nenhuma | analista-bd | Média | #5 |
| 7 | Revisão do impacto em produção: perda de dados, ordem de exclusão, backup prévio | dba | Média | #6 |
| 8 | Desenhar a ação e o modal de confirmação em "Clientes e faturamento" (layout paisagem, mostrando por que a empresa pode ou não ser excluída) | designer | Baixa | #5 |
| 9 | Implementar a rota restrita ao dono (mesma trava de e-mail já usada em `platform.license.manage`), com checagem de movimentação e cancelamento da assinatura no Asaas | desenvolvedor-backend | Alta | #5, #7 |
| 10 | Criar a nova permissão no catálogo e garantir que apareça na matriz de Perfis de acesso | desenvolvedor-backend | Baixa | #9 |
| 11 | Botão + modal na tela de Clientes e faturamento, com o mesmo bloqueio no frontend | desenvolvedor-frontend | Média | #8, #9 |
| **Fechamento** ||||
| 12 | Revisão e testes das duas frentes (empresa nova nasce completa; exclusão bloqueada com movimentação e liberada sem; número da fatura continua chegando no título) | tester-qa | Média | #4, #11 |
| 13 | Deploy, script de acerto em produção (só depois do deploy do Railway confirmar) e exclusão dos clientes de teste | devops | Média | #12 |
| 14 | Atualizar `docs\08-Continuidade.md` (fechar a pendência "Excluir empresa") e a matriz de Perfis de acesso | projetista | Baixa | #13 |

Sugestão prática: as frentes são independentes. Para resultado rápido, solte a Frente A primeiro (tarefas 1-4, menor risco) e a Frente B em seguida — sem esperar as respostas das duas dúvidas.

## Riscos identificados

| Risco | Gravidade | Mitigação |
|---|---|---|
| Exclusão apagar dados de cliente pagante por engano | **Alta** | Trava de "sem movimentação" checada no servidor (não só na tela), confirmação digitando o CNPJ, restrição ao e-mail do dono, backup antes de rodar em produção |
| Exclusão lógica não liberar o CNPJ e o próximo teste quebrar igual | Alta | Decidir na tarefa #5 antes de programar; se for lógica, liberar documento/slug/código na exclusão |
| Empresa excluída continuar logando | Média | Fechar a checagem no login (Achado 2), coberto pelo QA |
| Assinatura órfã cobrando no Asaas após a exclusão | Média | Cancelar a assinatura dentro da própria exclusão e conferir no painel do Asaas |
| Cadastro de empresa nova falhar no meio e deixar empresa incompleta | Baixa | Criar os padrões em bloco único; comportamento definido na tarefa #1 |
| Empresas existentes ficarem com o nome antigo na `01.01.01` | Média | Script de acerto (#2, #3, #13) |
| Rodar o script antes do deploy terminar (erro já conhecido do Railway) | Média | Só rodar depois do deploy concluído / linha "Applying migration" |
| Rota pública `POST /companies` criar empresa sem plano, sem usuário e sem os padrões | Média | Avaliar na tarefa #1: fechar a rota ou fazê-la passar pelo caminho normal de cadastro |

## Dependências externas

- **Asaas (produção)**: acesso ao painel para conferir/cancelar assinaturas dos clientes de teste excluídos.
- **Railway**: deploy do backend concluído antes do script de acerto.
- **Backup do banco de produção** antes da primeira exclusão real — é a operação mais destrutiva do sistema hoje.
- **Sua confirmação** de quais empresas em produção são teste e podem ser apagadas (lista de CNPJs).

## Critérios de pronto

**Frente A**
1. Cadastrar empresa nova (com e sem compra) e ela já aparecer com as 42 contas nas 6 classificações e com a unidade "UN - Unidade".
2. Empresa adicional do mesmo grupo também nasce com os padrões.
3. A `01.01.01` sai como **Sistemas / Despesas com sistema ERP**, e a mensalidade do ERP continua caindo nessa conta automaticamente.
4. Cadastrar duas empresas seguidas não gera erro de duplicidade nem deixa empresa pela metade.
5. Empresas antigas acertadas pelo script, sem perder nada que o cliente já tinha cadastrado.
6. O plano de contas da AlePejo continua exatamente como está.

**Frente B**
7. Só o login do dono enxerga e usa a exclusão — qualquer outro usuário, mesmo administrador de cliente, recebe acesso negado na tela **e** no servidor.
8. Empresa com qualquer movimentação (venda, compra, título financeiro, folha, estoque…) não é excluída, e a tela diz o que está impedindo.
9. Empresa de teste sem movimentação é excluída, some das listagens, o login dela para de funcionar e a assinatura no Asaas é cancelada.
10. Depois de excluída, o mesmo CNPJ pode ser cadastrado de novo.
11. A nova permissão aparece na matriz de Perfis de acesso.
12. Os clientes de teste em produção foram removidos.

## Próximo passo

Aguardando aprovação e as respostas das duas dúvidas. Aprovado, o primeiro agente acionado é o **projetista**, com este contexto:

> "Especificar duas frentes no AlePejo ERP Cloud. **(A) Cadastros padrão de empresa nova:** definir onde plugar a criação automática do plano de contas padrão (42 contas / 6 classificações, lista neste plano) e da unidade `UN - Unidade` dentro de `CompanyOnboardingService` (`signup` e `createAdditional`), decidir o tratamento da rota pública `POST /companies`, garantir que o cadastro não fique pela metade se falhar, e unificar a conta `01.01.01` com o `ensureSystemExpenseAccount` de `Backend\src\modules\billing\services\billing.service.ts` (hoje 'Despesas com Sistema'; passa a ser classificação 'Sistemas' e descrição 'Despesas com sistema ERP'), incluindo o acerto das empresas existentes. Não alterar o plano de contas da AlePejo em `Backend\prisma\seed.ts`. **(B) Excluir empresa:** especificar a feature restrita ao dono da plataforma (mesmo padrão de `PLATFORM_OWNER_ONLY_PERMISSIONS` em `Backend\src\modules\identity\auth\guards\permissions.guard.ts` e `frontend\src\providers\AuthProvider.tsx`), só para empresa sem movimentação, resolvendo obrigatoriamente: (1) exclusão física × lógica, considerando que `Company.document`/`slug`/`code` são únicos e a exclusão lógica não libera o CNPJ; (2) o buraco do login, que não checa se a empresa foi excluída; (3) o cancelamento da assinatura via `AsaasService.deleteSubscription`; (4) auditoria de quem excluiu. Ponto de entrada na tela existente `frontend\src\app\erp\licenciamento\clientes\page.tsx`. Fechar a pendência de 30-08-2026 em `docs\08-Continuidade.md`."

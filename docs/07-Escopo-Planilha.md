# Escopo derivado da planilha "Controle Dedicar V1.0"

Documento de referência: mapeia cada aba da planilha original para os módulos
do AlePejo ERP Cloud, indicando o que já existe e o que falta.

Fonte: `Controle Dedicar V1.0 - original(1).xlsm` (33 abas)
Atualizado em: 07/08/2026

> **Observação importante:** a planilha é de uma confecção (produção de peças
> de vestuário para marcas como ANIMALE). Vários conceitos são específicos
> desse ramo — OS de produção, piloto, ficha de EPI. Ao construir para SaaS
> multi-empresa, esses módulos precisam ser genéricos o bastante para servir
> outras empresas, ou ficarem como módulo opcional licenciável.

---

## 1. Situação atual

### Pronto (backend + tela)
| Módulo | Abas da planilha | Situação |
|---|---|---|
| Parceiros (clientes/fornecedores) | CAD_CLIENTE, CAD_FORNECEDOR | Completo, unificado |
| Produtos | CAD_PRODUTO | Completo |
| Categorias / Marcas / Unidades | (não existiam) | Completo |
| Identidade e permissões | usuario, MANUTENCAO_USUARIO | Completo |
| Licenciamento | (não existia) | Completo |

### Backend pronto, falta tela
| Módulo | Abas | Falta |
|---|---|---|
| Estoque | (não existia na planilha) | Tela de saldo e movimentação |
| Depósitos | (não existia) | Tela |
| Compras | FLUXO_PAGAR (parcial) | Tela de lançamento |
| Vendas | FLUXO_RECEBER (parcial) | Tela de lançamento completa |

### Não iniciado
| Módulo | Abas | Tamanho |
|---|---|---|
| Financeiro | FLUXO_CAIXA, FLUXO_RECEBER, FLUXO_PAGAR, CAD_DESPESAS, BUDGET, Apoio_Fluxo | Grande |
| RH | CAD_COLABORADOR, CAD_FUNCAO, FICHA_EPI, ANIVERSARIO, REL_ETIQ_CTPS, Apoio_RH | Muito grande |
| Produção | PRODUCAO, CONT_PRODUCAO, REL_ACOMPANHAMENTO | Médio |
| Relatórios | REL_* (7 abas) | Médio |
| Dashboards | DASHBOARD1, DASHBOARD_CAD, DASHBOARD_FLUXO | Médio |

---

## 2. Financeiro

O módulo mais valioso depois do núcleo comercial. A planilha já tem a
estrutura pronta.

### 2.1 Plano de contas (aba CAD_DESPESAS — 80 registros)

Estrutura contábil hierárquica em três níveis:

```
Conta contábil   Classificação        Descrição
01.01.01         Adm - Internet       Certificados
01.01.02         Adm - Internet       Domínio e-mails
01.02.01         ADM Escritório       Material de escritório
```

Modelo sugerido: `ChartOfAccount`
- `code` (01.01.01) — único por empresa
- `classification` (agrupador: "Adm - Internet")
- `description`
- `type` (RECEITA / DESPESA)
- `parentId` (auto-relacionamento para hierarquia)

### 2.2 Contas a receber (aba FLUXO_RECEBER)

Campos: Data, Prazo (dias), Data de Vencimento, Nota Fiscal, Status Nota
(AUTORIZADA/CANCELADA), CNPJ/CPF, Cliente, Valor, Status recebimento.

Regras observadas:
- Vencimento = Data + Prazo (calculado)
- "Prazo" negativo na planilha indica cálculo quebrado — no sistema, calcular
  sempre a partir da data de emissão
- Status da nota é separado do status do recebimento

### 2.3 Contas a pagar (aba FLUXO_PAGAR)

Mesma estrutura, mais: Tipo de Pagamento (BOLETO, CUPOM FISCAL, NOTA FISCAL,
RECIBO) e vínculo com fornecedor.

Uma nota pode agrupar vários documentos ("10,11,12" numa linha só) — no
sistema, isso vira lançamentos separados ou um campo de referência livre.

### 2.4 Fluxo de caixa (abas FLUXO_CAIXA + Apoio_Fluxo)

Visão mensal consolidada, 12 colunas (jan-dez) x linhas:
- Total receita / Recebido / A receber / Atrasado
- Meta receita / % da meta
- Total despesas / Pago / A pagar / Atrasado

Isso é **relatório**, não cadastro: deve ser calculado a partir de
receber/pagar, não digitado.

### 2.5 Orçamento (aba BUDGET)

Por mês: Valor Mensal orçado, Orçado Ano, Valor Realizado, Orçado Despesas,
Despesas Pagas. Permite comparativo orçado x realizado.

Modelo: `Budget` (ano, mês, tipo RECEITA/DESPESA, valorOrcado) — o realizado
vem por consulta, não é gravado.

---

## 3. RH — o módulo mais pesado

### 3.1 Colaboradores (aba CAD_COLABORADOR — 68 campos!)

Agrupamento sugerido para a tela (abas/seções, não um formulário único):

**Pessoais:** Nome, Nome do Pai, Nome da Mãe, Data Nascimento, Sexo, Local
Nascimento, UF, Estado Civil, Escolaridade

**Documentos:** CPF, RG, CTPS, Série, PIS

**Contato:** Endereço, Bairro, Cidade, Estado, CEP, Telefone Fixo, Celular,
E-mail

**Contratuais:** Função, Setor, Salário, Tipo Salário, Forma Pagamento,
Horário Trabalho, Início Contrato, Experiência, Previsão Término, Vence
Experiência, Término Contrato, Data Admissão, Data Demissão, Status

**Saúde ocupacional:** Data Exame, Exame Concluído, Dias para Periódico,
Próximo Exame, Dias Aviso, Status Exame, Afastado

**Benefícios:** Vale Transporte, EPI, Chave Armário, Nº Armário

**Dependentes:** até 5 beneficiários (Nome, Data Nascimento, Grau) — no
sistema isso vira uma **tabela filha**, sem limite fixo de 5

Campos calculados que NÃO devem ser gravados: Idade, DIA, MÊS aniversário,
Vlr Extenso, Dias para Periódico, Status Experiência.

### 3.2 Funções/cargos (aba CAD_FUNCAO)

CBO, Função, Descrição, Setor, Salário da Função, Tipo Salário, Horário,
Uso EPI (sim/não), e até 4 EPIs vinculados.

Os 4 campos de EPI (EPI, EPI2, EPI3, EPI4) devem virar tabela filha.

### 3.3 EPI (aba FICHA_EPI)

Ficha de entrega de equipamento por colaborador, com assinatura. Precisa de:
cadastro de EPIs, entrega (colaborador, EPI, data, quantidade, CA), e
geração da ficha para impressão.

### 3.4 Relatórios de RH

- ANIVERSARIO: aniversariantes do mês
- REL_ETIQ_CTPS: etiquetas para carteira de trabalho (62 colunas — layout de
  impressão)
- Apoio_RH: indicadores (colaboradores por função, por setor, média salarial,
  distribuição por sexo, status)

---

## 4. Produção (específico de confecção)

### 4.1 Ordem de produção (aba CONT_PRODUCAO)

Campos: Data, Produto, REF, Marca, **OS**, Quantidade, Piloto (OK/PENDENTE),
Dias Produção, Entrega Combinada, Entregue, Dias para Entrega, Status Entrega
(NO PRAZO / EM ATRASO / SEM DT COMBINADA), Finalizado.

Fluxo: recebe OS da marca → produz → entrega. É produção **sob encomenda para
terceiros**, não para estoque próprio.

### 4.2 Acompanhamento (aba REL_ACOMPANHAMENTO — 3.566 linhas)

Histórico detalhado da produção. Provavelmente apontamento por etapa.

### 4.3 Impacto no cadastro de produto

A planilha tem o campo **REF** (referência do fabricante, ex: 52133491),
distinto do código interno e do código de barras. **Falta no sistema atual.**

---

## 5. Lacunas identificadas no sistema atual

| # | Lacuna | Onde | Prioridade |
|---|---|---|---|
| 1 | Campo REF (referência do fabricante) no produto | CAD_PRODUTO | Baixa |
| 2 | Setor (usado em RH e produção) | CAD_FUNCAO | Junto com RH |
| 3 | Dashboard com dados reais (hoje são números fixos) | DASHBOARD* | Média |
| 4 | Telas de Estoque, Depósitos, Compras | — | **Alta** |
| 5 | Tela de Vendas completa | — | **Alta** |

---

## 6. Ordem de construção recomendada

Critério: fechar primeiro o ciclo operacional que já tem backend pronto,
depois o que gera mais valor.

**Etapa 1 — Fechar o núcleo (backend pronto, falta tela)**
1. Depósitos
2. Estoque (saldo + movimentação)
3. Compras (entrada de mercadoria)
4. Vendas (saída)

Ao final: ciclo completo comprar → estocar → vender, com saldo real.

**Etapa 2 — Financeiro**
5. Plano de contas
6. Contas a pagar / a receber
7. Fluxo de caixa (relatório)
8. Orçamento

Contas a pagar/receber devem nascer automaticamente de compras/vendas.

**Etapa 3 — Visão gerencial**
9. Dashboard com dados reais
10. Relatórios

**Etapa 4 — Módulos opcionais (licenciáveis)**
11. RH (grande — dividir em colaboradores → funções → EPI → relatórios)
12. Produção (específico de confecção)

---

## 7. Decisões pendentes

1. **Produção e RH são genéricos ou só para a Dedicar?** Como o produto é SaaS
   multi-empresa, o módulo de produção sob encomenda serve confecções, mas não
   um comércio. Sugestão: deixar como módulos licenciáveis separados.

2. **Financeiro deve gerar título automático a partir de venda/compra?**
   Recomendado sim — evita digitar duas vezes.

3. **Plano de contas fixo ou editável pela empresa?** Recomendado editável,
   com um plano padrão sugerido no cadastro da empresa.

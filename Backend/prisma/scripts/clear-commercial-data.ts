import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SÓ PARA USO LOCAL — apaga todos os lançamentos comercial/financeiro/
 * estoque (Compras, Vendas, Cotações, Pedidos de compra/venda,
 * Orçamentos, Ordens de produção, títulos financeiros não-RH, e todo
 * o estoque — Inventory/StockMovement/StockHold em cascata) pra testar
 * do zero, sem mexer em cadastros (produto, parceiro, depósito, plano
 * de contas, usuário, empresa) nem em RH (folha, ponto, férias, 13º).
 *
 * Ordem respeita as FKs sem onDelete: Cascade entre os documentos
 * (Purchase→PurchaseOrder, Sale→SalesOrder/Quote,
 * PurchaseOrder→Quotation/QuotationOffer,
 * SalesOrder/Sale→Quote, ProductionOrder→SalesOrder).
 */
async function main() {
  console.log('Apagando títulos financeiros (exceto RH/billing)...');

  const entries = await prisma.financialEntry.deleteMany({
    where: {
      payrollItemId: null,
      thirteenthSalaryItemId: null,
      vacationGrantId: null,
      billingChargeId: null,
    },
  });

  console.log(`  ${entries.count} título(s) apagado(s).`);

  console.log('Apagando estoque (inventário, movimentações e retenções em cascata)...');

  const inventories = await prisma.inventory.deleteMany({});

  console.log(`  ${inventories.count} registro(s) de inventário apagado(s).`);

  console.log('Apagando ordens de produção...');

  const productionOrders = await prisma.productionOrder.deleteMany({});

  console.log(`  ${productionOrders.count} ordem(ns) de produção apagada(s).`);

  console.log('Apagando compras...');

  const purchases = await prisma.purchase.deleteMany({});

  console.log(`  ${purchases.count} compra(s) apagada(s).`);

  console.log('Apagando vendas...');

  const sales = await prisma.sale.deleteMany({});

  console.log(`  ${sales.count} venda(s) apagada(s).`);

  console.log('Apagando pedidos de compra...');

  const purchaseOrders = await prisma.purchaseOrder.deleteMany({});

  console.log(`  ${purchaseOrders.count} pedido(s) de compra apagado(s).`);

  console.log('Apagando pedidos de venda...');

  const salesOrders = await prisma.salesOrder.deleteMany({});

  console.log(`  ${salesOrders.count} pedido(s) de venda apagado(s).`);

  console.log('Apagando orçamentos...');

  const quotes = await prisma.quote.deleteMany({});

  console.log(`  ${quotes.count} orçamento(s) apagado(s).`);

  console.log('Apagando cotações...');

  const quotations = await prisma.quotation.deleteMany({});

  console.log(`  ${quotations.count} cotação(ões) apagada(s).`);

  console.log('Zerando numeração dos documentos apagados...');

  const resetTypes = [
    'PURCHASE',
    'SALE',
    'QUOTATION',
    'PURCHASE_ORDER',
    'QUOTE',
    'SALES_ORDER',
    'PRODUCTION_ORDER',
  ];

  const sequences = await prisma.documentSequence.updateMany({
    where: { type: { in: resetTypes } },
    data: { lastNumber: 0 },
  });

  console.log(`  ${sequences.count} sequência(s) zerada(s).`);

  console.log('\nPronto — cadastros (produto, parceiro, depósito, plano de contas, usuário, empresa) e RH ficaram intactos.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

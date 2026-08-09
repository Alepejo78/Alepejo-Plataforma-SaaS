/**
 * Saldo disponível para venda: saldo físico menos tudo que está
 * bloqueado, reservado, em quarentena ou avariado.
 */
export function calculateAvailableQuantity(inventory: {
  quantity: unknown;
  blockedQuantity: unknown;
  reservedQuantity: unknown;
  quarantineQuantity: unknown;
  damagedQuantity: unknown;
}): number {
  return (
    Number(inventory.quantity) -
    Number(inventory.blockedQuantity) -
    Number(inventory.reservedQuantity) -
    Number(inventory.quarantineQuantity) -
    Number(inventory.damagedQuantity)
  );
}

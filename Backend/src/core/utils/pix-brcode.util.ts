/**
 * Gera o payload "Pix Copia e Cola" / BR Code (padrão EMV do Bacen)
 * pra uma chave PIX estática da própria empresa — sem depender de
 * gateway nenhum. Formato TLV com checksum CRC16 no final; qualquer
 * banco/carteira lê isso direto (colando o texto ou lendo o QR Code
 * gerado a partir dele).
 */

function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');

  return `${id}${length}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Só ASCII imprimível, sem acento — exigido pelos campos de nome/cidade do BR Code. */
function sanitizeAscii(value: string, maxLength: number): string {
  // NFD separa a base do acento (ex.: "á" -> "a" + acento); o replace
  // seguinte descarta qualquer coisa fora do ASCII imprimível,
  // inclusive esse acento já separado.
  const normalized = value
    .normalize('NFD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();

  return normalized.slice(0, maxLength) || 'NA';
}

export interface PixBRCodeInput {
  key: string;
  merchantName: string;
  merchantCity: string;
  /** Valor fixo da cobrança — omitido gera um QR sem valor pré-definido. */
  amount?: number;
  /** Identificador da cobrança (até 25 caracteres) — vira "***" se não informado. */
  txid?: string;
}

export function buildPixBRCode({
  key,
  merchantName,
  merchantCity,
  amount,
  txid,
}: PixBRCodeInput): string {
  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
  const additionalData = tlv('05', sanitizeAscii(txid || '***', 25));

  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (amount ? tlv('54', amount.toFixed(2)) : '') +
    tlv('58', 'BR') +
    tlv('59', sanitizeAscii(merchantName, 25)) +
    tlv('60', sanitizeAscii(merchantCity, 15)) +
    tlv('62', additionalData);

  const payloadWithCrcPlaceholder = `${body}6304`;

  return payloadWithCrcPlaceholder + crc16(payloadWithCrcPlaceholder);
}

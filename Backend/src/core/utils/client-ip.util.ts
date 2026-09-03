import type { Request } from 'express';

/**
 * IP de quem fez a requisição. Olha primeiro o cabeçalho que o proxy
 * da hospedagem (Railway) adiciona — sem isso, `req.socket.
 * remoteAddress` mostraria sempre o IP do proxy, igual pra todo
 * mundo, e nunca daria pra distinguir visitantes.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  if (forwardedIp) {
    return forwardedIp.split(',')[0].trim();
  }

  return req.socket.remoteAddress ?? req.ip ?? 'unknown';
}

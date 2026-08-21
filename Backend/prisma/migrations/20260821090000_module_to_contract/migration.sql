-- Correção pontual dos dados que já existem.
--
-- Até agora TODO módulo habilitado nascia com `licensed = true`, então
-- não dava pra distinguir o que foi contratado do que o cliente apenas
-- marcou depois na tela de Licenciamento. Daqui pra frente quem marca
-- o módulo sozinho entra com `licensed = false` ("A contratar") e só
-- vira contratado quando o pagamento é confirmado.
--
-- Para as empresas que ainda NÃO têm assinatura paga, o que foi
-- habilitado bem depois do início do plano é justamente esse caso:
-- escolha posterior, sem nenhuma compra por trás. Os 5 minutos de
-- folga cobrem o próprio cadastro, que habilita os módulos do plano
-- contratado logo após criar a empresa.
--
-- Empresa com plano ACTIVE fica intocada: lá tudo que está habilitado
-- foi de fato pago.

UPDATE "company_modules" cm
SET "licensed" = false
FROM "company_plans" cp, "modules" m
WHERE cp."companyId" = cm."companyId"
  AND m."id" = cm."moduleId"
  AND cp."status" <> 'ACTIVE'
  AND cm."enabled" = true
  AND cm."createdAt" > cp."startDate" + INTERVAL '5 minutes'
  AND m."code" NOT IN ('BPS', 'PRODUCTS', 'INVENTORY', 'SALES', 'PURCHASE');

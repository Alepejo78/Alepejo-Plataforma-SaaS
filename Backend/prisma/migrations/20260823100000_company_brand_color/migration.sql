-- Cor de destaque escolhida pela empresa (módulo BRANDING). Guarda só a
-- cor principal em hexadecimal; as variações (hover, fundo suave, cor do
-- texto sobre ela) são calculadas na tela a partir dela, pra o cliente
-- não ter que escolher cinco cores e acertar o contraste sozinho.

ALTER TABLE "public"."companies"
  ADD COLUMN "brandColor" VARCHAR(9),
  ADD COLUMN "brandingColorEnabled" BOOLEAN NOT NULL DEFAULT false;

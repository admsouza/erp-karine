-- CreateTable
CREATE TABLE "ResourceAccountSuggestion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ResourceAccountKind" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAccountSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAccountSuggestion_name_key" ON "ResourceAccountSuggestion"("name");

-- Seed: as identificações que hoje são fixas no frontend passam a ser cadastro.
-- (espécie, bancos e maquinetas usados pela clínica na primeira publicação)
INSERT INTO "ResourceAccountSuggestion" ("id","name","kind","active","createdAt","updatedAt") VALUES
  (gen_random_uuid(), 'Dinheiro (gaveta)', 'CASH', true, now(), now()),
  (gen_random_uuid(), 'Banco do Brasil', 'BANK', true, now(), now()),
  (gen_random_uuid(), 'Caixa Econômica', 'BANK', true, now(), now()),
  (gen_random_uuid(), 'Itaú', 'BANK', true, now(), now()),
  (gen_random_uuid(), 'Nubank', 'BANK', true, now(), now()),
  (gen_random_uuid(), 'Santander', 'BANK', true, now(), now()),
  (gen_random_uuid(), 'Mercado Pago', 'BANK', true, now(), now()),
  (gen_random_uuid(), 'Maquineta principal', 'CARD', true, now(), now()),
  (gen_random_uuid(), 'Maquineta 2', 'CARD', true, now(), now())
ON CONFLICT ("name") DO NOTHING;

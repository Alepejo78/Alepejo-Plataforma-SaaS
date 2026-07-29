CREATE TYPE "SupplierStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'BLOCKED'
);

CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    "corporateName" VARCHAR(200) NOT NULL,
    "tradeName" VARCHAR(200),

    "document" VARCHAR(20) NOT NULL,

    "stateRegistration" VARCHAR(30),
    "municipalRegistration" VARCHAR(30),

    "email" VARCHAR(150),
    "phone" VARCHAR(30),
    "mobile" VARCHAR(30),

    "contactName" VARCHAR(150),

    "zipCode" VARCHAR(15),
    "street" VARCHAR(150),
    "number" VARCHAR(20),
    "complement" VARCHAR(100),
    "district" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(2),

    "website" VARCHAR(200),

    "notes" TEXT,

    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',

    "active" BOOLEAN NOT NULL DEFAULT true,

    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "suppliers_companyId_fkey"
        FOREIGN KEY ("companyId")
        REFERENCES "companies"("id")
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX "suppliers_companyId_document_key"
ON "suppliers"("companyId","document");

CREATE INDEX "suppliers_companyId_idx"
ON "suppliers"("companyId");

CREATE INDEX "suppliers_document_idx"
ON "suppliers"("document");

CREATE INDEX "suppliers_corporateName_idx"
ON "suppliers"("corporateName");

CREATE INDEX "suppliers_tradeName_idx"
ON "suppliers"("tradeName");

CREATE INDEX "suppliers_status_idx"
ON "suppliers"("status");
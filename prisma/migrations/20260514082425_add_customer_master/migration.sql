-- CreateTable
CREATE TABLE "m_customer" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(32),
    "postal_code" VARCHAR(8),
    "address" TEXT,
    "tel" VARCHAR(32),
    "fax" VARCHAR(32),
    "email" VARCHAR(255),
    "contact_person" VARCHAR(100),
    "industry" VARCHAR(100),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m_customer_code_key" ON "m_customer"("code");

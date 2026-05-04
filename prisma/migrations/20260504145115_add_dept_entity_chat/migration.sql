-- AlterTable
ALTER TABLE "m_user" ADD COLUMN     "department_id" INTEGER;

-- CreateTable
CREATE TABLE "m_department" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(32),
    "parent_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_entity" (
    "id" SERIAL NOT NULL,
    "entity_type" VARCHAR(32) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(64),
    "category" VARCHAR(64),
    "description" TEXT,
    "metadata" JSONB,
    "source_doc" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_chat_message" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(64) NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls" JSONB,
    "user_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m_department_code_key" ON "m_department"("code");

-- CreateIndex
CREATE INDEX "m_entity_entity_type_idx" ON "m_entity"("entity_type");

-- CreateIndex
CREATE INDEX "m_entity_name_idx" ON "m_entity"("name");

-- CreateIndex
CREATE INDEX "t_chat_message_session_id_idx" ON "t_chat_message"("session_id");

-- CreateIndex
CREATE INDEX "t_chat_message_user_id_idx" ON "t_chat_message"("user_id");

-- AddForeignKey
ALTER TABLE "m_user" ADD CONSTRAINT "m_user_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "m_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_department" ADD CONSTRAINT "m_department_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "m_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

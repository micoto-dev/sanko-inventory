-- CreateTable
CREATE TABLE "t_knowledge_doc" (
    "id" SERIAL NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(32) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "t_knowledge_doc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_knowledge_chunk" (
    "id" SERIAL NOT NULL,
    "doc_id" INTEGER NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_knowledge_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "t_knowledge_chunk_doc_id_idx" ON "t_knowledge_chunk"("doc_id");

-- AddForeignKey
ALTER TABLE "t_knowledge_chunk" ADD CONSTRAINT "t_knowledge_chunk_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "t_knowledge_doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

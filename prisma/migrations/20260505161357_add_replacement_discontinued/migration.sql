-- AlterTable
ALTER TABLE "m_part" ADD COLUMN     "is_discontinued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replacement_id" VARCHAR(20);

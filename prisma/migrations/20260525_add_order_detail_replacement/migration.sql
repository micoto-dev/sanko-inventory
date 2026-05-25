-- AlterTable: 発注明細に振替元リンクを追加（メーカー欠品時の別会社振替発注のトレース用）
ALTER TABLE "t_order_detail" ADD COLUMN "replaces_detail_id" INTEGER;

-- AddForeignKey: 振替元明細への参照（元が削除されたら自動でNULL化）
ALTER TABLE "t_order_detail"
  ADD CONSTRAINT "t_order_detail_replaces_detail_id_fkey"
  FOREIGN KEY ("replaces_detail_id") REFERENCES "t_order_detail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: 逆引き（元明細から振替先一覧を取得）を高速化
CREATE INDEX "t_order_detail_replaces_detail_id_idx" ON "t_order_detail"("replaces_detail_id");

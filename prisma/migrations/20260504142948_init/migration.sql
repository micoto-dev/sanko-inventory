-- CreateTable
CREATE TABLE "m_user" (
    "id" SERIAL NOT NULL,
    "login_id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "department" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "m_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_part" (
    "id" VARCHAR(20) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "spec" TEXT,
    "category" VARCHAR(255),
    "maker" VARCHAR(100),
    "maker_code" VARCHAR(100),
    "supplier_id" INTEGER,
    "unit" VARCHAR(20) NOT NULL DEFAULT '個',
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "lead_time_days" INTEGER NOT NULL DEFAULT 14,
    "reorder_point" INTEGER NOT NULL DEFAULT 0,
    "safety_stock" INTEGER NOT NULL DEFAULT 0,
    "max_stock" INTEGER NOT NULL DEFAULT 0,
    "default_loc_id" VARCHAR(32),
    "shortage_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "m_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_supplier" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "postal_code" VARCHAR(8),
    "address" TEXT,
    "tel" VARCHAR(32),
    "fax" VARCHAR(32),
    "email" VARCHAR(255),
    "contact_person" VARCHAR(100),
    "payment_terms" VARCHAR(255),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "m_supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_location" (
    "id" VARCHAR(32) NOT NULL,
    "warehouse" VARCHAR(64) NOT NULL,
    "shelf" VARCHAR(8) NOT NULL,
    "col" VARCHAR(8) NOT NULL,
    "row" VARCHAR(8) NOT NULL,
    "side" VARCHAR(4),
    "name" VARCHAR(100) NOT NULL,
    "max_qty" INTEGER NOT NULL DEFAULT 0,
    "loc_type" VARCHAR(32) NOT NULL DEFAULT '通常棚',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "m_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_product" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "voltage" VARCHAR(64),
    "dimensions" VARCHAR(64),
    "drawing_no" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "m_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_bom" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "part_id" VARCHAR(20) NOT NULL,
    "qty" DECIMAL(10,3) NOT NULL,
    "position" VARCHAR(64),
    "note" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_stock" (
    "id" SERIAL NOT NULL,
    "part_id" VARCHAR(20) NOT NULL,
    "location_id" VARCHAR(32) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "on_order" INTEGER NOT NULL DEFAULT 0,
    "last_inout_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_order" (
    "id" SERIAL NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "order_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desired_date" DATE,
    "approved_at" TIMESTAMPTZ,
    "approved_by" INTEGER,
    "delivery_addr" TEXT,
    "payment_terms" VARCHAR(255),
    "notes" TEXT,
    "total_qty" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_order_detail" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "line_no" INTEGER NOT NULL,
    "part_id" VARCHAR(20) NOT NULL,
    "qty" INTEGER NOT NULL,
    "received_qty" INTEGER NOT NULL DEFAULT 0,
    "unit_price" INTEGER NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "t_order_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_receive" (
    "id" SERIAL NOT NULL,
    "receive_no" VARCHAR(32) NOT NULL,
    "order_id" INTEGER,
    "order_detail_id" INTEGER,
    "part_id" VARCHAR(20) NOT NULL,
    "location_id" VARCHAR(32) NOT NULL,
    "qty" INTEGER NOT NULL,
    "result" VARCHAR(16) NOT NULL DEFAULT 'ok',
    "reject_reason" TEXT,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by" INTEGER NOT NULL,

    CONSTRAINT "t_receive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_prod_order" (
    "id" SERIAL NOT NULL,
    "prod_no" VARCHAR(32) NOT NULL,
    "product_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'allocated',
    "start_date" DATE,
    "due_date" DATE,
    "customer" VARCHAR(255),
    "completed_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_prod_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_prod_order_bom_snapshot" (
    "id" SERIAL NOT NULL,
    "prod_order_id" INTEGER NOT NULL,
    "part_id" VARCHAR(20) NOT NULL,
    "required_qty" DECIMAL(10,3) NOT NULL,
    "total_qty" DECIMAL(10,3) NOT NULL,
    "picked_qty" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "position" VARCHAR(64),
    "unit_price_at_issue" INTEGER NOT NULL,

    CONSTRAINT "t_prod_order_bom_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_issue" (
    "id" SERIAL NOT NULL,
    "issue_no" VARCHAR(32) NOT NULL,
    "prod_order_id" INTEGER,
    "part_id" VARCHAR(20) NOT NULL,
    "location_id" VARCHAR(32) NOT NULL,
    "qty" INTEGER NOT NULL,
    "issue_type" VARCHAR(32) NOT NULL DEFAULT 'production',
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "t_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_stocktake" (
    "id" SERIAL NOT NULL,
    "stocktake_no" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'open',
    "warehouse" VARCHAR(64),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "approved_at" TIMESTAMPTZ,
    "approved_by" INTEGER,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_stocktake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_stocktake_detail" (
    "id" SERIAL NOT NULL,
    "stocktake_id" INTEGER NOT NULL,
    "part_id" VARCHAR(20) NOT NULL,
    "location_id" VARCHAR(32) NOT NULL,
    "book_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER,
    "diff_qty" INTEGER,
    "reason" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "counted_at" TIMESTAMPTZ,
    "counted_by" INTEGER,

    CONSTRAINT "t_stocktake_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_log" (
    "id" SERIAL NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" VARCHAR(32) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "target_type" VARCHAR(32),
    "target_id" VARCHAR(64),
    "description" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "user_id" INTEGER,
    "user_name" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "t_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_ocr_history" (
    "id" SERIAL NOT NULL,
    "ocr_type" VARCHAR(32) NOT NULL,
    "blob_url" TEXT NOT NULL,
    "raw_text" TEXT,
    "parsed_json" JSONB,
    "confidence" DECIMAL(5,2),
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "target_id" VARCHAR(64),
    "vendor_request_id" TEXT,
    "cost_jpy" DECIMAL(10,4),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_ocr_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_attachment" (
    "id" SERIAL NOT NULL,
    "target_type" VARCHAR(32) NOT NULL,
    "target_id" VARCHAR(64) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "blob_url" TEXT NOT NULL,
    "mime_type" VARCHAR(100),
    "size_bytes" BIGINT,
    "uploaded_by" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "t_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m_user_login_id_key" ON "m_user"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_user_email_key" ON "m_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "m_part_code_key" ON "m_part"("code");

-- CreateIndex
CREATE UNIQUE INDEX "m_supplier_code_key" ON "m_supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "m_product_code_key" ON "m_product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "m_bom_product_id_part_id_key" ON "m_bom"("product_id", "part_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_stock_part_id_location_id_key" ON "t_stock"("part_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_order_order_no_key" ON "t_order"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "t_order_detail_order_id_line_no_key" ON "t_order_detail"("order_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "t_receive_receive_no_key" ON "t_receive"("receive_no");

-- CreateIndex
CREATE UNIQUE INDEX "t_prod_order_prod_no_key" ON "t_prod_order"("prod_no");

-- CreateIndex
CREATE UNIQUE INDEX "t_prod_order_bom_snapshot_prod_order_id_part_id_key" ON "t_prod_order_bom_snapshot"("prod_order_id", "part_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_issue_issue_no_key" ON "t_issue"("issue_no");

-- CreateIndex
CREATE UNIQUE INDEX "t_stocktake_stocktake_no_key" ON "t_stocktake"("stocktake_no");

-- CreateIndex
CREATE UNIQUE INDEX "t_stocktake_detail_stocktake_id_part_id_location_id_key" ON "t_stocktake_detail"("stocktake_id", "part_id", "location_id");

-- CreateIndex
CREATE INDEX "t_log_ts_idx" ON "t_log"("ts" DESC);

-- CreateIndex
CREATE INDEX "t_log_category_idx" ON "t_log"("category");

-- CreateIndex
CREATE INDEX "t_log_target_type_target_id_idx" ON "t_log"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "t_log_user_id_idx" ON "t_log"("user_id");

-- AddForeignKey
ALTER TABLE "m_part" ADD CONSTRAINT "m_part_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "m_supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_part" ADD CONSTRAINT "m_part_default_loc_id_fkey" FOREIGN KEY ("default_loc_id") REFERENCES "m_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_product" ADD CONSTRAINT "m_product_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "m_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_bom" ADD CONSTRAINT "m_bom_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "m_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_bom" ADD CONSTRAINT "m_bom_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "m_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_stock" ADD CONSTRAINT "t_stock_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "m_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_stock" ADD CONSTRAINT "t_stock_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "m_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_order" ADD CONSTRAINT "t_order_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "m_supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_order" ADD CONSTRAINT "t_order_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "m_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_order" ADD CONSTRAINT "t_order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "m_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_order_detail" ADD CONSTRAINT "t_order_detail_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "t_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_order_detail" ADD CONSTRAINT "t_order_detail_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "m_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_receive" ADD CONSTRAINT "t_receive_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "t_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_receive" ADD CONSTRAINT "t_receive_order_detail_id_fkey" FOREIGN KEY ("order_detail_id") REFERENCES "t_order_detail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_receive" ADD CONSTRAINT "t_receive_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "m_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_receive" ADD CONSTRAINT "t_receive_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "m_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_receive" ADD CONSTRAINT "t_receive_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "m_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_prod_order" ADD CONSTRAINT "t_prod_order_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "m_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_prod_order" ADD CONSTRAINT "t_prod_order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "m_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_prod_order_bom_snapshot" ADD CONSTRAINT "t_prod_order_bom_snapshot_prod_order_id_fkey" FOREIGN KEY ("prod_order_id") REFERENCES "t_prod_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_prod_order_bom_snapshot" ADD CONSTRAINT "t_prod_order_bom_snapshot_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "m_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_issue" ADD CONSTRAINT "t_issue_prod_order_id_fkey" FOREIGN KEY ("prod_order_id") REFERENCES "t_prod_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_issue" ADD CONSTRAINT "t_issue_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "m_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_issue" ADD CONSTRAINT "t_issue_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "m_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_issue" ADD CONSTRAINT "t_issue_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "m_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_stocktake" ADD CONSTRAINT "t_stocktake_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "m_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_stocktake" ADD CONSTRAINT "t_stocktake_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "m_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_stocktake_detail" ADD CONSTRAINT "t_stocktake_detail_stocktake_id_fkey" FOREIGN KEY ("stocktake_id") REFERENCES "t_stocktake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_stocktake_detail" ADD CONSTRAINT "t_stocktake_detail_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "m_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_stocktake_detail" ADD CONSTRAINT "t_stocktake_detail_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "m_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_stocktake_detail" ADD CONSTRAINT "t_stocktake_detail_counted_by_fkey" FOREIGN KEY ("counted_by") REFERENCES "m_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_log" ADD CONSTRAINT "t_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "m_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_ocr_history" ADD CONSTRAINT "t_ocr_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "m_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_attachment" ADD CONSTRAINT "t_attachment_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "m_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

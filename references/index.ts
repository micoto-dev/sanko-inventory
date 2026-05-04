// ─── Auth ────────────────────────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  role: 'admin' | 'manager' | 'accountant' | 'user';
  tenant_id: string;
  is_active: boolean;
  departments: DepartmentSummary[];
  stock_permissions?: string[];
}

// ─── Tenant ───────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  settings: Record<string, unknown>;
}

// ─── Department ───────────────────────────────────────────────────────────────

export interface DepartmentSummary {
  id: string;
  name: string;
}

export interface Department extends DepartmentSummary {
  parent_id: string | null;
  user_count: number;
  children: Department[];
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  document_count: number;
  children: Category[];
}

export interface CategorySummary {
  id: string;
  name: string;
  confidence?: number;
  classification_status?: 'auto' | 'completed' | 'low_confidence' | 'manual';
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  usage_count: number;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export type DocumentStatus = 'processing' | 'completed' | 'partial' | 'failed';
export type Visibility = 'public' | 'department' | 'admin_only';

export interface DocumentSummary {
  id: string;
  filename: string;
  file_type: 'xlsx' | 'xls' | 'pdf' | 'csv';
  file_size: number;
  status: DocumentStatus;
  visibility: Visibility;
  classification_status?: 'auto' | 'completed' | 'low_confidence' | 'manual';
  categories: CategorySummary[];
  tags: Tag[];
  uploader_email: string;
  uploader_name?: string;
  created_at: string;
  processing_completed_at?: string;
  entity_count?: number;
  current_step?: number;
  total_steps?: number;
}

export interface DocumentDetail extends DocumentSummary {
  s3_key: string;
  sha256_hash: string;
  auto_summary?: string;
  extracted_entities: ExtractedEntity[];
  similar_documents: SimilarDocument[];
  chunk_count?: number;
  page_count?: number;
  processing_started_at?: string;
}

export interface SimilarDocument {
  id: string;
  filename: string;
  similarity_score: number;
}

// ─── Chunk ────────────────────────────────────────────────────────────────────

export interface Chunk {
  id: string;
  chunk_index: number;
  content_preview: string;
  sheet_name?: string;
  page_number?: number;
}

// ─── Entity ───────────────────────────────────────────────────────────────────

export type EntityType =
  | 'COMPANY_NAME'
  | 'CREDIT_LIMIT'
  | 'PAYMENT_TERMS'
  | 'CONTRACT_DATE'
  | 'CONTRACT_AMOUNT'
  | 'PERSON_NAME'
  | 'CONTACT_PERSON'
  | 'PRODUCT_NAME'
  | 'OTHER';

export interface ExtractedEntity {
  id: string;
  entity_type: EntityType;
  entity_value: string;
  normalized_value?: string;
  is_matched_master: boolean;
}

export interface EntityMaster {
  id: string;
  entity_type: EntityType;
  canonical_value: string;
  aliases: string[];
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  created_at: string;
}

export interface Source {
  document_id: string;
  filename: string;
  snippet?: string;  // alias for content_preview (backward compat)
  content_preview?: string;
  page_number?: number;
  sheet_name?: string;
  score?: number;
}

export interface Conversation {
  id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  tenant_id?: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  ip_address?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  detail?: Record<string, unknown>;
  details?: Record<string, unknown>;
  created_at: string;
}

// ─── User (management) ────────────────────────────────────────────────────────

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'accountant' | 'user';
  is_active: boolean;
  departments: DepartmentSummary[];
  primary_department_id?: string;
  stock_permissions: string[];
  created_at: string;
  updated_at: string;
}

// ─── Company / CRM ────────────────────────────────────────────────────────────

export interface CompanyContact {
  id: string;
  company_id: string;
  name: string;
  department?: string;
  phone?: string;
  email?: string;
}

export interface MonthlyRevenue {
  id: string;
  year: number;
  month: number;
  amount: number;
}

export interface RevenueByClient {
  id: string;
  client_name: string;
  percentage: number;
  color: string;
  display_order: number;
}

export interface CompanyTransaction {
  id: string;
  transaction_date: string;
  amount: number;
  status: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  abbreviation?: string;
  invoice_no?: string;
  credit_limit?: number;
  payment_terms?: string;
  address?: string;
  postcode?: string;
  phone?: string;
  fax?: string;
  credit_rating?: string;
  representative?: string;
  employee_count?: number;
  total_revenue?: number;
  is_self: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyDetail extends Company {
  contacts: CompanyContact[];
  monthly_revenues: MonthlyRevenue[];
  revenue_by_clients: RevenueByClient[];
  transactions: CompanyTransaction[];
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export type StockStatus = 'ok' | 'low' | 'out';

export interface InventoryPart {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  category?: string;
  inv_category?: string;
  unit: string;
  stock: number;
  min_stock: number;
  max_stock: number;
  location?: string;
  unit_price: number;
  supplier?: string;
  last_in_at?: string;
  last_out_at?: string;
  status: StockStatus;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  part_id: string;
  type: 'in' | 'out';
  quantity: number;
  supplier?: string;
  note?: string;
  performed_by?: string;
  performed_dept?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  part_code?: string;
  part_name?: string;
  performer_name?: string;
  confirmer_name?: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  part_id?: string;
  part_code: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  order_date: string;
  supplier: string;
  status: string;
  total_amount: number;
  ordered_by?: string;
  orderer_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

export interface InventoryStats {
  total_parts: number;
  total_stock_value: number;
  out_of_stock_count: number;
  low_stock_count: number;
  pending_orders_count: number;
}

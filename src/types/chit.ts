/**
 * MITRA NIDHI CHITI PRO - TypeScript Types
 * All entities include company_id, created_by, created_at, updated_at
 */

// ===================== Chit Group =====================
export interface ChitGroup {
  id: string;
  company_id: string;
  group_name: string;
  description: string;
  chit_value: number; // Total value of chit (e.g., 100,000)
  member_count: number; // Number of members
  monthly_installment: number; // Amount each member pays monthly
  duration_months: number; // Total duration
  foreman_id: string; // Group leader/manager
  status: "active" | "closed" | "paused"; // Group status
  start_date: string; // ISO date
  end_date: string | null;
  running_chit_migration: boolean; // Support for migration to next chit
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Member =====================
export interface Member {
  id: string;
  company_id: string;
  group_id: string;
  name: string;
  email: string;
  phone: string;
  aadhaar: string; // Masked: e.g., "****-****-1234"
  mobile_masked: string; // Masked: e.g., "****-****-9876"
  address: string;
  bank_account: string;
  ifsc_code: string;
  status: "active" | "inactive" | "suspended";
  member_number: number; // Position in group (1, 2, 3...)
  draw_order: number; // Order to receive chit amount
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Collection =====================
export interface Collection {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string;
  collection_month: string; // "2024-06"
  installment_amount: number;
  paid_amount: number;
  payment_date: string;
  payment_method: "cash" | "cheque" | "bank_transfer" | "upi";
  receipt_number: string;
  is_partial: boolean;
  pending_amount: number;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Auction =====================
export interface Auction {
  id: string;
  company_id: string;
  group_id: string;
  auction_month: number; // Which month (1, 2, 3...)
  auction_date: string;
  base_amount: number; // Base bid amount
  status: "scheduled" | "active" | "completed" | "cancelled";
  winner_id: string | null;
  winning_bid_amount: number;
  participants: string[]; // Array of member IDs
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Bid =====================
export interface Bid {
  id: string;
  company_id: string;
  auction_id: string;
  member_id: string;
  bid_amount: number;
  bid_time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Payout =====================
export interface Payout {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string;
  payout_month: number;
  payout_date: string;
  chit_amount: number;
  foreman_commission: number;
  previous_pending_amount: number;
  total_payout_amount: number;
  status: "pending" | "approved" | "paid" | "partial";
  payment_method: "bank_transfer" | "cheque" | "cash";
  bank_reference: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Dividend =====================
export interface Dividend {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string;
  dividend_month: number;
  dividend_amount: number;
  calculation_basis: "profit_sharing" | "interest_accrual" | "custom";
  dividend_date: string;
  status: "calculated" | "approved" | "paid";
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Receipt =====================
export interface Receipt {
  id: string;
  company_id: string;
  group_id: string;
  collection_id: string;
  member_id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  can_print_pdf: boolean;
  can_print_whatsapp: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Report =====================
export interface Report {
  id: string;
  company_id: string;
  group_id: string;
  report_type: "collection_status" | "member_status" | "financial_summary" | "auction_history" | "dividend_report";
  report_name: string;
  filters: {
    start_date?: string;
    end_date?: string;
    member_id?: string;
    status?: string;
  };
  data: any; // Report data varies by type
  generated_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Document =====================
export interface Document {
  id: string;
  company_id: string;
  group_id: string;
  document_type: "agreement" | "rules" | "receipt" | "certificate" | "other";
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Notification Settings =====================
export interface NotificationSettings {
  id: string;
  company_id: string;
  group_id: string;
  whatsapp_enabled: boolean;
  whatsapp_number: string;
  sms_enabled: boolean;
  sms_number: string;
  email_enabled: boolean;
  email_address: string;
  notify_collection: boolean;
  notify_auction: boolean;
  notify_payout: boolean;
  notify_dividend: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Module Settings =====================
export interface ChitSettings {
  id: string;
  company_id: string;
  default_foreman_commission_percentage: number;
  enable_running_chit: boolean;
  enable_auctions: boolean;
  enable_partial_payments: boolean;
  require_member_kyc: boolean;
  auto_generate_receipts: boolean;
  receipt_format: "detailed" | "simple";
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===================== Dashboard Stats =====================
export interface ChitDashboardStats {
  total_groups: number;
  active_groups: number;
  total_members: number;
  total_value_managed: number;
  monthly_collections: number;
  pending_collections: number;
  total_payouts_processed: number;
}

// ===================== Form DTOs =====================
export interface CreateChitGroupForm {
  group_name: string;
  description: string;
  chit_value: number;
  member_count: number;
  monthly_installment: number;
  duration_months: number;
  foreman_id: string;
}

export interface CreateMemberForm {
  name: string;
  email: string;
  phone: string;
  aadhaar: string;
  address: string;
  bank_account: string;
  ifsc_code: string;
  member_number: number;
}

export interface RecordCollectionForm {
  member_id: string;
  collection_month: string;
  paid_amount: number;
  payment_method: "cash" | "cheque" | "bank_transfer" | "upi";
  payment_date: string;
  notes: string;
}

export interface CreateAuctionForm {
  auction_month: number;
  auction_date: string;
  base_amount: number;
}

export interface PlaceBidForm {
  auction_id: string;
  member_id: string;
  bid_amount: number;
}

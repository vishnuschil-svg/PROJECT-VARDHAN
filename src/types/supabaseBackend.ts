/**
 * Supabase Backend Types for MITRA NIDHI CHITI PRO
 * Production-ready TypeScript interfaces matching database schema
 */

// ============================================================================
// CHIT GROUP TYPES
// ============================================================================
export interface ChitGroup {
  id: string;
  company_id: string;
  group_name: string;
  description: string | null;
  chit_value: number;
  member_count: number;
  monthly_installment: number;
  duration_months: number;
  foreman_id: string | null;
  status: 'active' | 'closed' | 'paused';
  start_date: string;
  end_date: string | null;
  running_chit_migration: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChitGroupInput {
  group_name: string;
  description?: string;
  chit_value: number;
  member_count: number;
  monthly_installment: number;
  duration_months: number;
  foreman_id?: string;
  running_chit_migration?: boolean;
}

// ============================================================================
// MEMBER TYPES
// ============================================================================
export interface ChitMember {
  id: string;
  company_id: string;
  group_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  aadhaar_masked: string | null;
  mobile_masked: string | null;
  address: string | null;
  bank_account: string | null;
  ifsc_code: string | null;
  status: 'active' | 'inactive' | 'suspended';
  member_number: number;
  draw_order: number | null;
  is_foreman: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMemberInput {
  group_id: string;
  name: string;
  email?: string;
  phone?: string;
  aadhaar_masked?: string;
  mobile_masked?: string;
  address?: string;
  bank_account?: string;
  ifsc_code?: string;
  member_number: number;
  draw_order?: number;
}

// ============================================================================
// MEMBER ACCOUNT TYPES
// ============================================================================
export interface ChitMemberAccount {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string;
  total_installment_due: number;
  total_paid: number;
  pending_amount: number;
  chit_payout_received: number;
  dividend_amount: number;
  last_payment_date: string | null;
  auction_bids_count: number;
  auction_won: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COLLECTION TYPES
// ============================================================================
export interface ChitCollection {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string;
  collection_month: string;
  receipt_number: string | null;
  total_installment: number;
  total_paid: number;
  pending_amount: number;
  is_partial: boolean;
  status: 'pending' | 'partial' | 'completed';
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChitCollectionItem {
  id: string;
  company_id: string;
  collection_id: string;
  payment_amount: number;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi';
  payment_date: string;
  payment_reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RecordCollectionInput {
  group_id: string;
  member_id: string;
  collection_month: string;
  payment_amount: number;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi';
  payment_date: string;
  payment_reference?: string;
  notes?: string;
}

// ============================================================================
// AUCTION TYPES
// ============================================================================
export interface ChitAuction {
  id: string;
  company_id: string;
  group_id: string;
  auction_month: number;
  auction_date: string;
  base_amount: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  winner_id: string | null;
  winning_bid_amount: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChitAuctionBid {
  id: string;
  company_id: string;
  auction_id: string;
  member_id: string;
  bid_amount: number;
  bid_rank: number | null;
  bid_time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlaceBidInput {
  auction_id: string;
  member_id: string;
  bid_amount: number;
}

// ============================================================================
// PAYOUT TYPES
// ============================================================================
export interface ChitPayout {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string;
  auction_id: string | null;
  payout_month: number | null;
  chit_amount: number;
  foreman_commission: number;
  previous_pending: number;
  total_payout_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'partial';
  payment_method: string | null;
  bank_reference: string | null;
  payout_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePayoutInput {
  group_id: string;
  member_id: string;
  auction_id?: string;
  chit_amount: number;
  foreman_commission?: number;
}

// ============================================================================
// DIVIDEND TYPES
// ============================================================================
export interface ChitDividend {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string;
  dividend_month: number | null;
  dividend_amount: number;
  calculation_basis: string;
  dividend_date: string | null;
  status: 'calculated' | 'approved' | 'paid';
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// RECEIPT TYPES
// ============================================================================
export interface ChitReceipt {
  id: string;
  company_id: string;
  group_id: string;
  collection_item_id: string;
  member_id: string;
  receipt_number: string;
  receipt_year: number;
  receipt_sequence: number;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  pdf_url: string | null;
  can_print_pdf: boolean;
  can_print_whatsapp: boolean;
  whatsapp_sent_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptNumberSequence {
  year: number;
  sequence: number;
  company_id: string;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================
export interface ChitDocument {
  id: string;
  company_id: string;
  group_id: string;
  document_type: 'agreement' | 'rules' | 'receipt' | 'certificate' | 'member_list' | 'other';
  file_name: string;
  file_path: string | null;
  file_size: number | null;
  document_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// NOTIFICATION SETTINGS TYPES
// ============================================================================
export interface ChitNotificationSettings {
  id: string;
  company_id: string;
  group_id: string;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  sms_enabled: boolean;
  sms_number: string | null;
  email_enabled: boolean;
  email_address: string | null;
  notify_collection: boolean;
  notify_auction: boolean;
  notify_payout: boolean;
  notify_dividend: boolean;
  notify_overdue: boolean;
  overdue_days: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationSettingsInput {
  group_id: string;
  whatsapp_enabled?: boolean;
  whatsapp_number?: string;
  sms_enabled?: boolean;
  sms_number?: string;
  email_enabled?: boolean;
  email_address?: string;
  notify_collection?: boolean;
  notify_auction?: boolean;
  notify_payout?: boolean;
  notify_dividend?: boolean;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================
export interface ChitSettings {
  id: string;
  company_id: string;
  foreman_commission_percentage: number;
  enable_running_chit: boolean;
  enable_auctions: boolean;
  enable_partial_payments: boolean;
  require_member_kyc: boolean;
  auto_generate_receipts: boolean;
  receipt_format: 'detailed' | 'simple';
  financial_year_start_month: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================
export interface ChitAuditLog {
  id: string;
  company_id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// DASHBOARD STATS TYPES
// ============================================================================
export interface ChitDashboardStats {
  total_groups: number;
  active_groups: number;
  total_members: number;
  total_value_managed: number;
  monthly_collections: number;
  pending_collections: number;
  total_payouts_processed: number;
  pending_payouts: number;
  total_dividends_paid: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  error: string | null;
  success: boolean;
}

// ============================================================================
// FILTER TYPES
// ============================================================================
export interface ChitGroupFilters {
  status?: 'active' | 'closed' | 'paused';
  created_after?: string;
  created_before?: string;
  search?: string;
}

export interface CollectionFilters {
  status?: 'pending' | 'partial' | 'completed';
  member_id?: string;
  collection_month?: string;
  is_partial?: boolean;
}

export interface ReceiptFilters {
  receipt_year?: number;
  member_id?: string;
  payment_method?: string;
}

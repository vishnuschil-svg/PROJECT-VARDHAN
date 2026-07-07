/**
 * Row Level Security (RLS) Policies for MITRA NIDHI CHITI PRO
 * 
 * Security Model:
 * - Platform Admin: Full access to all records
 * - Company Admin: Access to company records only
 * - Company Staff: Access to company records only
 * - No cross-company access
 */

-- Enable RLS on all tables
ALTER TABLE chit_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_member_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Check user role
-- ============================================================================
CREATE OR REPLACE FUNCTION is_platform_admin(user_id UUID)
RETURNS BOOLEAN AS $$
SELECT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = $1 AND role = 'platform_admin'
);
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID)
RETURNS UUID AS $$
SELECT company_id FROM user_profiles
WHERE user_id = $1
LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- CHIT GROUPS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all chit groups" ON chit_groups
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company chit groups" ON chit_groups
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can insert chit groups" ON chit_groups
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update own chit groups" ON chit_groups
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can delete own chit groups" ON chit_groups
  FOR DELETE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT MEMBERS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all chit members" ON chit_members
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company members" ON chit_members
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can insert members" ON chit_members
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update own members" ON chit_members
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can delete own members" ON chit_members
  FOR DELETE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT MEMBER ACCOUNTS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all member accounts" ON chit_member_accounts
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company member accounts" ON chit_member_accounts
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage own member accounts" ON chit_member_accounts
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update own member accounts" ON chit_member_accounts
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT COLLECTIONS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all collections" ON chit_collections
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company collections" ON chit_collections
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can insert collections" ON chit_collections
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update collections" ON chit_collections
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT COLLECTION ITEMS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all collection items" ON chit_collection_items
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company collection items" ON chit_collection_items
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can insert collection items" ON chit_collection_items
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update collection items" ON chit_collection_items
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT AUCTIONS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all auctions" ON chit_auctions
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company auctions" ON chit_auctions
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can insert auctions" ON chit_auctions
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update auctions" ON chit_auctions
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT AUCTION BIDS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all bids" ON chit_auction_bids
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company bids" ON chit_auction_bids
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company users can place bids" ON chit_auction_bids
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT PAYOUTS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all payouts" ON chit_payouts
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company payouts" ON chit_payouts
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can insert payouts" ON chit_payouts
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update payouts" ON chit_payouts
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT DIVIDENDS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all dividends" ON chit_dividends
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company dividends" ON chit_dividends
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage dividends" ON chit_dividends
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT RECEIPTS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all receipts" ON chit_receipts
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company receipts" ON chit_receipts
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can insert receipts" ON chit_receipts
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update receipts" ON chit_receipts
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT DOCUMENTS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all documents" ON chit_documents
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company documents" ON chit_documents
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage documents" ON chit_documents
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT NOTIFICATIONS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all notification settings" ON chit_notifications
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can access own company settings" ON chit_notifications
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage notification settings" ON chit_notifications
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update notification settings" ON chit_notifications
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- CHIT SETTINGS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all settings" ON chit_settings
  FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company users can view settings" ON chit_settings
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage settings" ON chit_settings
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update settings" ON chit_settings
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- AUDIT LOGS RLS POLICIES
-- ============================================================================
CREATE POLICY "Platform admin can access all audit logs" ON chit_audit_logs
  FOR SELECT USING (is_platform_admin(auth.uid()));

CREATE POLICY "Company admins can access own company audit logs" ON chit_audit_logs
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

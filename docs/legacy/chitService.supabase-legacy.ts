/**
 * Supabase Service Layer for MITRA NIDHI CHITI PRO
 * Main service orchestrator
 */

import { supabase } from '../lib/supabase';
import {
  ChitGroup,
  ChitMember,
  ChitCollection,
  ChitAuction,
  ChitPayout,
  ChitReceipt,
  ChitDashboardStats,
  ApiResponse,
  ApiListResponse,
  CreateChitGroupInput,
  CreateMemberInput,
  RecordCollectionInput,
  PlaceBidInput,
  CreatePayoutInput,
} from '../types/supabaseBackend';

// ============================================================================
// CHIT GROUPS SERVICE
// ============================================================================
export const chitGroupsService = {
  // Fetch all groups for company
  async getGroups(companyId: string, filters?: any): Promise<ApiListResponse<ChitGroup>> {
    try {
      let query = supabase
        .from('chit_groups')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.ilike('group_name', `%${filters.search}%`);
      }

      const { data, count, error } = await query
        .range((filters?.page || 0) * (filters?.page_size || 10), ((filters?.page || 0) + 1) * (filters?.page_size || 10) - 1);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: filters?.page || 0,
        page_size: filters?.page_size || 10,
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching groups:', error);
      return { data: [], total: 0, page: 0, page_size: 10, success: false, error: (error as any).message };
    }
  },

  // Fetch single group
  async getGroup(groupId: string): Promise<ApiResponse<ChitGroup>> {
    try {
      const { data, error } = await supabase
        .from('chit_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;

      return { data, success: true, error: null };
    } catch (error) {
      console.error('Error fetching group:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },

  // Create new group
  async createGroup(companyId: string, userId: string, input: CreateChitGroupInput): Promise<ApiResponse<ChitGroup>> {
    try {
      const { data, error } = await supabase
        .from('chit_groups')
        .insert([
          {
            company_id: companyId,
            created_by: userId,
            ...input,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { data, success: true, error: null };
    } catch (error) {
      console.error('Error creating group:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },

  // Update group
  async updateGroup(groupId: string, updates: Partial<ChitGroup>): Promise<ApiResponse<ChitGroup>> {
    try {
      const { data, error } = await supabase
        .from('chit_groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;

      return { data, success: true, error: null };
    } catch (error) {
      console.error('Error updating group:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },

  // Get dashboard stats
  async getDashboardStats(companyId: string): Promise<ApiResponse<ChitDashboardStats>> {
    try {
      // Fetch multiple aggregates in parallel
      const [groupsRes, membersRes, collectionRes, payoutRes] = await Promise.all([
        supabase
          .from('chit_groups')
          .select('id, chit_value, status')
          .eq('company_id', companyId),
        supabase
          .from('chit_members')
          .select('id')
          .eq('company_id', companyId),
        supabase
          .from('chit_collections')
          .select('total_paid, status')
          .eq('company_id', companyId),
        supabase
          .from('chit_payouts')
          .select('total_payout_amount, status')
          .eq('company_id', companyId),
      ]);

      const groups = groupsRes.data || [];
      const members = membersRes.data || [];
      const collections = collectionRes.data || [];
      const payouts = payoutRes.data || [];

      const stats: ChitDashboardStats = {
        total_groups: groups.length,
        active_groups: groups.filter(g => g.status === 'active').length,
        total_members: members.length,
        total_value_managed: groups.reduce((sum: number, g: any) => sum + (g.chit_value || 0), 0),
        monthly_collections: collections.reduce((sum: number, c: any) => sum + (c.total_paid || 0), 0),
        pending_collections: collections
          .filter(c => c.status !== 'completed')
          .reduce((sum: number, c: any) => sum + (c.total_paid || 0), 0),
        total_payouts_processed: payouts.reduce((sum: number, p: any) => sum + (p.total_payout_amount || 0), 0),
        pending_payouts: payouts
          .filter(p => p.status !== 'paid')
          .reduce((sum: number, p: any) => sum + (p.total_payout_amount || 0), 0),
        total_dividends_paid: 0, // TODO: Calculate from dividends table
      };

      return { data: stats, success: true, error: null };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },
};

// ============================================================================
// CHIT MEMBERS SERVICE
// ============================================================================
export const chitMembersService = {
  // Fetch all members for group
  async getMembers(groupId: string, filters?: any): Promise<ApiListResponse<ChitMember>> {
    try {
      let query = supabase
        .from('chit_members')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, count, error } = await query
        .range((filters?.page || 0) * 10, ((filters?.page || 0) + 1) * 10 - 1);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: filters?.page || 0,
        page_size: 10,
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching members:', error);
      return { data: [], total: 0, page: 0, page_size: 10, success: false, error: (error as any).message };
    }
  },

  // Fetch single member
  async getMember(memberId: string): Promise<ApiResponse<ChitMember>> {
    try {
      const { data, error } = await supabase
        .from('chit_members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;

      return { data, success: true, error: null };
    } catch (error) {
      console.error('Error fetching member:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },

  // Create new member
  async createMember(companyId: string, userId: string, input: CreateMemberInput): Promise<ApiResponse<ChitMember>> {
    try {
      const { data, error } = await supabase
        .from('chit_members')
        .insert([
          {
            company_id: companyId,
            created_by: userId,
            status: 'active',
            ...input,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Create member account
      const memberAccount = {
        company_id: companyId,
        group_id: input.group_id,
        member_id: data.id,
        created_by: userId,
      };

      await supabase.from('chit_member_accounts').insert([memberAccount]);

      return { data, success: true, error: null };
    } catch (error) {
      console.error('Error creating member:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },

  // Update member
  async updateMember(memberId: string, updates: Partial<ChitMember>): Promise<ApiResponse<ChitMember>> {
    try {
      const { data, error } = await supabase
        .from('chit_members')
        .update(updates)
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;

      return { data, success: true, error: null };
    } catch (error) {
      console.error('Error updating member:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },
};

// ============================================================================
// CHIT COLLECTIONS SERVICE
// ============================================================================
export const chitCollectionsService = {
  // Fetch collections
  async getCollections(groupId: string, filters?: any): Promise<ApiListResponse<ChitCollection>> {
    try {
      let query = supabase
        .from('chit_collections')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: 0,
        page_size: count || 10,
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching collections:', error);
      return { data: [], total: 0, page: 0, page_size: 10, success: false, error: (error as any).message };
    }
  },

  // Record payment
  async recordCollection(companyId: string, userId: string, input: RecordCollectionInput): Promise<ApiResponse<ChitCollection>> {
    try {
      // Find or create collection record
      const { data: existing } = await supabase
        .from('chit_collections')
        .select('*')
        .eq('group_id', input.group_id)
        .eq('member_id', input.member_id)
        .eq('collection_month', input.collection_month)
        .single();

      let collectionId: string;

      if (existing) {
        collectionId = existing.id;
      } else {
        const { data: newCollection, error: createError } = await supabase
          .from('chit_collections')
          .insert([
            {
              company_id: companyId,
              group_id: input.group_id,
              member_id: input.member_id,
              collection_month: input.collection_month,
              total_installment: 10000, // TODO: Get from group
              total_paid: 0,
              created_by: userId,
              status: 'pending',
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        collectionId = newCollection.id;
      }

      // Add collection item
      const { data: _item, error: itemError } = await supabase
        .from('chit_collection_items')
        .insert([
          {
            company_id: companyId,
            collection_id: collectionId,
            payment_amount: input.payment_amount,
            payment_method: input.payment_method,
            payment_date: input.payment_date,
            payment_reference: input.payment_reference,
            notes: input.notes,
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // Update collection total
      const { data: collection, error: updateError } = await supabase
        .from('chit_collections')
        .select('total_installment')
        .eq('id', collectionId)
        .single();

      if (updateError) throw updateError;

      const newTotalPaid = (existing?.total_paid || 0) + input.payment_amount;
      const status = newTotalPaid >= collection.total_installment ? 'completed' : 'partial';

      const { data: updated, error: finalError } = await supabase
        .from('chit_collections')
        .update({
          total_paid: newTotalPaid,
          pending_amount: Math.max(0, collection.total_installment - newTotalPaid),
          is_partial: status === 'partial',
          status,
        })
        .eq('id', collectionId)
        .select()
        .single();

      if (finalError) throw finalError;

      return { data: updated, success: true, error: null };
    } catch (error) {
      console.error('Error recording collection:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },

  // Get pending collections
  async getPendingCollections(groupId: string): Promise<ApiListResponse<ChitCollection>> {
    try {
      const { data, count, error } = await supabase
        .from('chit_collections')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId)
        .neq('status', 'completed');

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: 0,
        page_size: count || 10,
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching pending collections:', error);
      return { data: [], total: 0, page: 0, page_size: 10, success: false, error: (error as any).message };
    }
  },
};

// ============================================================================
// CHIT AUCTIONS SERVICE
// ============================================================================
export const chitAuctionsService = {
  // Fetch auctions
  async getAuctions(groupId: string): Promise<ApiListResponse<ChitAuction>> {
    try {
      const { data, count, error } = await supabase
        .from('chit_auctions')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId)
        .order('auction_date', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: 0,
        page_size: count || 10,
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching auctions:', error);
      return { data: [], total: 0, page: 0, page_size: 10, success: false, error: (error as any).message };
    }
  },

  // Place bid
  async placeBid(companyId: string, userId: string, input: PlaceBidInput): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('chit_auction_bids')
        .insert([
          {
            company_id: companyId,
            auction_id: input.auction_id,
            member_id: input.member_id,
            bid_amount: input.bid_amount,
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { data, success: true, error: null };
    } catch (error) {
      console.error('Error placing bid:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },
};

// ============================================================================
// CHIT PAYOUTS SERVICE
// ============================================================================
export const chitPayoutsService = {
  // Fetch payouts
  async getPayouts(groupId: string): Promise<ApiListResponse<ChitPayout>> {
    try {
      const { data, count, error } = await supabase
        .from('chit_payouts')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: 0,
        page_size: count || 10,
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching payouts:', error);
      return { data: [], total: 0, page: 0, page_size: 10, success: false, error: (error as any).message };
    }
  },

  // Create payout
  async createPayout(companyId: string, userId: string, input: CreatePayoutInput): Promise<ApiResponse<ChitPayout>> {
    try {
      const { data, error } = await supabase
        .from('chit_payouts')
        .insert([
          {
            company_id: companyId,
            group_id: input.group_id,
            member_id: input.member_id,
            auction_id: input.auction_id,
            chit_amount: input.chit_amount,
            foreman_commission: input.foreman_commission || 0,
            total_payout_amount: input.chit_amount - (input.foreman_commission || 0),
            status: 'pending',
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { data, success: true, error: null };
    } catch (error) {
      console.error('Error creating payout:', error);
      return { data: null, success: false, error: (error as any).message };
    }
  },
};

// ============================================================================
// CHIT RECEIPTS SERVICE
// ============================================================================
export const chitReceiptsService = {
  // Generate receipt number
  async generateReceiptNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from('chit_receipts')
      .select('receipt_sequence')
      .eq('company_id', companyId)
      .eq('receipt_year', year)
      .order('receipt_sequence', { ascending: false })
      .limit(1);

    if (error) throw error;

    const nextSequence = ((data?.[0]?.receipt_sequence) || 0) + 1;
    return `CH${year.toString().slice(-2)}${String(nextSequence).padStart(6, '0')}`;
  },

  // Fetch receipts
  async getReceipts(groupId: string): Promise<ApiListResponse<ChitReceipt>> {
    try {
      const { data, count, error } = await supabase
        .from('chit_receipts')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: 0,
        page_size: count || 10,
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching receipts:', error);
      return { data: [], total: 0, page: 0, page_size: 10, success: false, error: (error as any).message };
    }
  },
};

import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";

export const GroupsRepository = new SupabaseRepository({
  tableName: "chit_groups",
  searchableFields: ["chit_name", "chit_code", "status"],
  normalizeInput: (group) => ({
    ...group,
    chit_name: group.chit_name || group.name,
    chit_value: Number(group.chit_value || group.chitValue || 0),
    monthly_amount: Number(group.monthly_amount || group.monthlyAmount || 0),
    total_members: Number(group.total_members || group.totalMembers || 0),
    total_months: Number(group.total_months || group.totalMonths || 0),
  }),
});

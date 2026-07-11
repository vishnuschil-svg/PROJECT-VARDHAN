import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";

export const MembersRepository = new SupabaseRepository({
  tableName: "chit_members",
  searchableFields: [
    "member_name",
    "member_number",
    "mobile_number",
    "whatsapp_number",
    "email",
    "status",
  ],
  normalizeInput: (member) => ({
    ...member,
    group_id: member.group_id || member.chit_group_id || member.groupId,
    member_name: member.member_name || member.name,
    mobile_number: member.mobile_number || member.mobile,
  }),
});

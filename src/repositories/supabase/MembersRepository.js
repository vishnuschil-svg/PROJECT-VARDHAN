import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionMember,
  toProductionMember,
} from "../../services/productionChitPersistence.js";

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
  normalizeInput: (member) => toProductionMember(member),
  normalizeOutput: (member) => fromProductionMember(member),
});

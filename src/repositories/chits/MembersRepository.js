import { LocalStorageRepository } from "./LocalStorageRepository";

export const MembersRepository = new LocalStorageRepository({
  storageKey: "vardhan.chit.members.v1",
  entityName: "member",
  searchableFields: [
    "member_name",
    "member_number",
    "mobile_number",
    "whatsapp_number",
    "email",
    "status",
  ],
});

import { Users, UserPlus, Eye, Pencil, Trash2 } from "lucide-react";

export default function IconTest() {
  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        padding: "20px",
        alignItems: "center",
      }}
    >
      <Users size={24} />
      <UserPlus size={24} />
      <Eye size={24} />
      <Pencil size={24} />
      <Trash2 size={24} />
    </div>
  );
}

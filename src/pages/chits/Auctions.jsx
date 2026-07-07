import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { mockAuctions } from "../../config/chitMockData";
import "./Auctions.css";

function Auctions() {
  const columns = [
    { key: "auction_month", label: "Month", width: "100px" },
    { key: "auction_date", label: "Date", width: "120px", render: (val) => new Date(val).toLocaleDateString() },
    { key: "base_amount", label: "Base Amount", width: "130px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "winning_bid_amount", label: "Winning Bid", width: "130px", render: (val) => val ? `₹${val.toLocaleString()}` : "-" },
    { key: "status", label: "Status", width: "110px", render: (val) => <Badge label={val} variant={val === "completed" ? "success" : val === "active" ? "primary" : "error"} size="small" /> },
  ];

  const actions = [
    { icon: "👁️", label: "View", onClick: () => {}, variant: "default" },
    { icon: "🎯", label: "Bid", onClick: () => {}, variant: "primary" },
    { icon: "✏️", label: "Edit", onClick: () => {}, variant: "default" },
  ];

  return (
    <ChitLayout
      title="Auctions"
      subtitle="Chit auctions and bidding management"
      actions={<Button variant="primary" icon="➕">Create Auction</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={mockAuctions} actions={actions} />
      </div>
    </ChitLayout>
  );
}

export default Auctions;

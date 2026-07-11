import Table from "../common/Table";
import { formatReportValue, toReportTitle } from "../../reports/ReportFormatter";

function ReportTable({ report }) {
  const columns = (report?.columns || []).map((column) => ({
    key: column,
    label: toReportTitle(column),
    width: column.length > 16 ? "190px" : "140px",
    render: (value) => formatReportValue(column, value),
  }));

  return <Table columns={columns} data={report?.rows || []} />;
}

export default ReportTable;

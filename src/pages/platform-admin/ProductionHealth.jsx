import { useEffect, useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Button from "../../components/common/Button";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { fetchEnterpriseHealth } from "../../services/productionHealthService";
import "./ProductionHealth.css";

function ProductionHealth() {
  const workspace = useWorkspace();
  const workspaceId = workspace?.activeWorkspace?.id || workspace?.activeWorkspace?.workspace_id;
  const [state, setState] = useState({ loading: true, result: null, error: "" });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try { setState({ loading: false, result: await fetchEnterpriseHealth(workspaceId), error: "" }); }
    catch (error) { setState({ loading: false, result: null, error: error.message }); }
  }

  useEffect(() => { refresh(); }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AdminLayout title="Production Health" subtitle="Live deployment dependencies and service readiness" actions={<Button onClick={refresh} disabled={state.loading}>Refresh</Button>}>
      {state.loading && <p>Checking production services…</p>}
      {state.error && <div className="health-error" role="alert">{state.error}</div>}
      {state.result && (
        <>
          <div className={`health-summary ${state.result.status}`}>Overall status: {state.result.status}</div>
          <div className="health-grid">
            <HealthCard label="Database" ready={state.result.database} />
            {Object.entries(state.result.configuration || {}).map(([name, ready]) => <HealthCard key={name} label={name} ready={ready} />)}
          </div>
          <p className="health-timestamp">Last server check: {new Date(state.result.timestamp).toLocaleString()}</p>
        </>
      )}
    </AdminLayout>
  );
}

function HealthCard({ label, ready }) {
  return <div className="health-card"><span>{label}</span><strong className={ready ? "ready" : "missing"}>{ready ? "Ready" : "Not configured"}</strong></div>;
}

export default ProductionHealth;

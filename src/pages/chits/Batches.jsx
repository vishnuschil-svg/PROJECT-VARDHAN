import { useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Badge from "../../components/common/Badge";
import BatchForm from "../../components/batches/BatchForm";
import BatchSummaryCard from "../../components/batches/BatchSummaryCard";
import { useAuth } from "../../hooks/useAuth";
import { listTenantGroups } from "../../services/chitDataService";
import { archiveBatch, getBatchSummary, listBatches, saveBatch } from "../../services/batchService";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import { listExpenses } from "../../services/expenseService";
import "./Batches.css";

const EMPTY_BATCH = {
  name: "",
  code: "",
  description: "",
  status: "ACTIVE",
  startDate: "",
  endDate: "",
  groupIds: [],
};

function Batches() {
  const { activeTenantContext, profile } = useAuth();
  const groups = useMemo(() => listTenantGroups(activeTenantContext), [activeTenantContext]);
  const collections = useTenantCollections(activeTenantContext);
  const expenses = useMemo(() => listExpenses(activeTenantContext), [activeTenantContext]);
  const [version, setVersion] = useState(0);
  const batches = useMemo(() => listBatches(activeTenantContext), [activeTenantContext, version]);
  const [draft, setDraft] = useState(EMPTY_BATCH);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const openCreate = () => {
    setDraft({ ...EMPTY_BATCH, code: `BATCH-${batches.length + 1}` });
    setError("");
    setIsOpen(true);
  };
  const openEdit = (batch) => {
    setDraft(batch);
    setError("");
    setIsOpen(true);
  };
  const save = () => {
    if (!draft.name?.trim()) {
      setError("Batch name is required.");
      return;
    }
    saveBatch({ ...draft, createdBy: profile?.full_name || "local-owner" }, activeTenantContext);
    setVersion((current) => current + 1);
    setMessage("Batch saved.");
    setIsOpen(false);
  };
  const archive = (batch) => {
    archiveBatch(batch.id, activeTenantContext);
    setVersion((current) => current + 1);
    setMessage("Batch archived.");
  };

  return (
    <ChitLayout
      title="Chit Batches"
      subtitle="Organizer-level batches without branch hierarchy"
      actions={<Button variant="primary" onClick={openCreate}>Create Batch</Button>}
    >
      <div className="batches-page">
        {message && <div className="batch-success">{message}</div>}
        {!batches.length && (
          <div className="batch-empty">
            <h3>No batches yet</h3>
            <p>Create Batch A, Batch B or any organizer-defined grouping.</p>
            <Button variant="primary" onClick={openCreate}>Create First Batch</Button>
          </div>
        )}
        <div className="batch-grid">
          {batches.map((batch) => (
            <div className="batch-card-wrap" key={batch.id}>
              <BatchSummaryCard batch={batch} summary={getBatchSummary({ batch, groups, collections, expenses })} />
              <div className="batch-actions">
                <Badge label={batch.status} variant={batch.status === "ACTIVE" ? "success" : "warning"} size="small" />
                <button type="button" onClick={() => openEdit(batch)}>Edit</button>
                <button type="button" onClick={() => archive(batch)}>Archive</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal
        isOpen={isOpen}
        title={draft.id ? "Edit Batch" : "Create Batch"}
        size="large"
        onClose={() => setIsOpen(false)}
        footer={<><Button onClick={() => setIsOpen(false)}>Cancel</Button><Button variant="primary" onClick={save}>Save Batch</Button></>}
      >
        {error && <div className="batch-error">{error}</div>}
        <BatchForm value={draft} groups={groups} onChange={setDraft} />
      </Modal>
    </ChitLayout>
  );
}

export default Batches;

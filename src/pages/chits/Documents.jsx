import ChitLayout from "../../components/chit/ChitLayout";
import "./Documents.css";

function Documents() {
  const documents = [
    { id: 1, name: "Chit Agreement.pdf", type: "agreement", size: "2.4 MB", date: "2024-01-15" },
    { id: 2, name: "Group Rules.pdf", type: "rules", size: "1.8 MB", date: "2024-01-01" },
    { id: 3, name: "Member Certificate.pdf", type: "certificate", size: "512 KB", date: "2024-02-01" },
  ];

  return (
    <ChitLayout
      title="Documents"
      subtitle="Chit group documents and agreements"
    >
      <div className="documents-list">
        {documents.map((doc) => (
          <div key={doc.id} className="document-item">
            <div className="doc-icon">📄</div>
            <div className="doc-info">
              <h3>{doc.name}</h3>
              <p>{doc.size} • {new Date(doc.date).toLocaleDateString()}</p>
            </div>
            <div className="doc-actions">
              <button className="doc-btn">👁️ View</button>
              <button className="doc-btn">⬇️ Download</button>
            </div>
          </div>
        ))}
      </div>
    </ChitLayout>
  );
}

export default Documents;

function TemplateLibrary({ templates = [], onUseTemplate }) {
  return (
    <div className="chit-studio-card">
      <h3>Template Library</h3>
      {!templates.length && <p className="chit-studio-muted">No confirmed organizer templates yet.</p>}
      <div className="chit-studio-template-list">
        {templates.map((template) => (
          <button type="button" onClick={() => onUseTemplate(template)} key={template.id}>
            <strong>{template.name}</strong>
            <span>{template.category} - v{template.version}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TemplateLibrary;

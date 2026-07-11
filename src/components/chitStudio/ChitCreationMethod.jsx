function ChitCreationMethod({ modes = [], selectedMode, onSelect }) {
  return (
    <div className="chit-studio-method-grid">
      {modes.map((mode) => (
        <button
          type="button"
          className={selectedMode === mode.id ? "active" : ""}
          onClick={() => onSelect(mode.id)}
          key={mode.id}
        >
          <strong>{mode.title}</strong>
          <span>{mode.description}</span>
        </button>
      ))}
    </div>
  );
}

export default ChitCreationMethod;

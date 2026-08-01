import { AlertTriangle, Play, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function PracticeMode({ feature, onStartPractice, onResetPractice, isPracticeActive = false }) {
  const [showWarning, setShowWarning] = useState(false);

  const handleStart = () => {
    setShowWarning(true);
  };

  const confirmStart = () => {
    setShowWarning(false);
    onStartPractice?.();
  };

  return (
    <div className="academy-practice-mode">
      <header>
        <Play size={18} />
        <h4>Practice Mode</h4>
      </header>
      <div className="academy-practice-content">
        {isPracticeActive ? (
          <div className="academy-practice-active">
            <div className="academy-practice-badge">
              <Play size={16} />
              <span>Practice Active</span>
            </div>
            <p>
              You are in practice mode. All actions here use isolated practice data and will not affect your real business records.
            </p>
            <button onClick={onResetPractice} className="academy-reset-button">
              <RotateCcw size={16} />
              Reset Practice Data
            </button>
          </div>
        ) : (
          <div className="academy-practice-inactive">
            <p>
              Practice mode lets you try {feature} workflows with isolated data. No changes to your real business records.
            </p>
            <button onClick={handleStart} className="academy-start-button">
              <Play size={16} />
              Start Practice
            </button>
          </div>
        )}
      </div>

      {showWarning && (
        <div className="academy-practice-warning">
          <AlertTriangle size={20} />
          <div>
            <h4>Practice Mode Confirmation</h4>
            <p>
              Practice mode uses isolated data. Your real business records will not be affected. You can reset practice data at any time.
            </p>
          </div>
          <div className="academy-warning-actions">
            <button onClick={() => setShowWarning(false)} className="academy-cancel-button">
              Cancel
            </button>
            <button onClick={confirmStart} className="academy-confirm-button">
              <Play size={16} />
              Start Practice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

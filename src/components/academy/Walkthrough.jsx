import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, List, RotateCcw, SkipForward, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Walkthrough({
  steps = [],
  completedSteps = [],
  onStepComplete,
  onClose
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInteractive, setIsInteractive] = useState(false);

  const normalizedSteps = steps.map((step, index) => {
    if (typeof step === "string") {
      return { id: `wt-step-${index}`, text: step, target: null };
    }
    return {
      id: step.id || `wt-step-${index}`,
      text: step.text || step,
      target: step.target || null,
    };
  });

  const currentStep = normalizedSteps[currentIndex];
  const isStepCompleted = (stepIndex) => {
    return completedSteps.includes(stepIndex) || completedSteps.includes(normalizedSteps[stepIndex].id);
  };

  const handleNext = useCallback(() => {
    if (currentIndex < normalizedSteps.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, normalizedSteps.length]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    setCurrentIndex(normalizedSteps.length - 1);
  }, [normalizedSteps.length]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const handleStepComplete = useCallback(() => {
    onStepComplete?.(currentIndex, currentStep);
    if (currentIndex < normalizedSteps.length - 1) {
      handleNext();
    }
  }, [currentIndex, currentStep, normalizedSteps.length, onStepComplete, handleNext]);

  const handleNavigateToTarget = useCallback(() => {
    if (currentStep.target) {
      navigate(currentStep.target);
    }
  }, [currentStep.target, navigate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isInteractive) return;

      switch (e.key) {
        case "ArrowRight":
          handleNext();
          break;
        case "ArrowLeft":
          handleBack();
          break;
        case "Escape":
          onClose?.();
          break;
        case "Enter":
          handleStepComplete();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInteractive, handleNext, handleBack, onClose, handleStepComplete]);

  if (!normalizedSteps.length) return null;

  if (isInteractive) {
    return (
      <div className="academy-walkthrough-interactive" role="dialog" aria-modal="true">
        <div className="academy-walkthrough-overlay" onClick={onClose} />
        <div className="academy-walkthrough-modal">
          <div className="academy-walkthrough-modal-header">
            <h4>Step {currentIndex + 1} of {normalizedSteps.length}</h4>
            <button onClick={onClose} className="academy-walkthrough-close" aria-label="Close walkthrough">
              <X size={18} />
            </button>
          </div>

          <div className="academy-walkthrough-modal-content">
            <div className="academy-walkthrough-step-indicator">
              {normalizedSteps.map((_, index) => (
                <div
                  key={index}
                  className={`academy-walkthrough-dot ${index === currentIndex ? "is-active" : ""} ${isStepCompleted(index) ? "is-completed" : ""}`}
                />
              ))}
            </div>

            <div className="academy-walkthrough-step-text">
              <p>{currentStep.text}</p>
              {currentStep.target && (
                <button onClick={handleNavigateToTarget} className="academy-walkthrough-target-link">
                  Navigate to {currentStep.target}
                </button>
              )}
            </div>
          </div>

          <div className="academy-walkthrough-modal-footer">
            <button onClick={handleBack} disabled={currentIndex === 0} className="academy-walkthrough-nav-btn">
              <ArrowLeft size={16} /> Back
            </button>

            <button onClick={handleSkip} disabled={currentIndex === normalizedSteps.length - 1} className="academy-walkthrough-skip-btn">
              <SkipForward size={16} /> Skip
            </button>

            <button onClick={handleRestart} className="academy-walkthrough-restart-btn">
              <RotateCcw size={16} /> Restart
            </button>

            <button
              onClick={handleStepComplete}
              className={`academy-walkthrough-complete-btn ${isStepCompleted(currentIndex) ? "is-completed" : ""}`}
            >
              {isStepCompleted(currentIndex) ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {currentIndex === normalizedSteps.length - 1 ? "Finish" : "Complete & Next"}
              {currentIndex < normalizedSteps.length - 1 && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="academy-walkthrough">
      <header>
        <List size={18} />
        <h4>Walkthrough Steps</h4>
        <button
          onClick={() => setIsInteractive(true)}
          className="academy-walkthrough-start-btn"
          aria-label="Start interactive walkthrough"
        >
          Start Walkthrough
        </button>
      </header>
      <div className="academy-walkthrough-list">
        {normalizedSteps.map((step, index) => {
          const completed = isStepCompleted(index);

          return (
            <div
              key={step.id}
              className={`academy-walkthrough-step ${completed ? "is-completed" : ""}`}
              data-walkthrough-step={step.id}
            >
              <button
                onClick={() => !completed && onStepComplete?.(index, step)}
                className="academy-step-toggle"
                aria-label={completed ? "Step completed" : "Mark step complete"}
              >
                {completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </button>
              <span className="academy-step-number">{index + 1}</span>
              <span className="academy-step-text">{step.text}</span>
              {step.target && (
                <button
                  onClick={() => navigate(step.target)}
                  className="academy-step-target-link"
                  aria-label={`Navigate to ${step.target}`}
                >
                  Go
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

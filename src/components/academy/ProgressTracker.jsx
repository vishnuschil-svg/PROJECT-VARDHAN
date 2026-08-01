import { Award, Clock, CheckCircle2 } from "lucide-react";

export default function ProgressTracker({ progress = {}, totalSteps = 0 }) {
  const { status = "Not Started", completedSteps = [] } = progress;

  const completionPercentage = totalSteps > 0
    ? Math.round((completedSteps.length / totalSteps) * 100)
    : 0;

  const getStatusColor = () => {
    switch (status) {
      case "Completed":
        return "success";
      case "In Progress":
        return "primary";
      default:
        return "neutral";
    }
  };

  return (
    <div className="academy-progress-tracker">
      <div className="academy-progress-header">
        <div className={`academy-status-badge academy-status-${getStatusColor()}`}>
          {status === "Completed" && <CheckCircle2 size={14} />}
          {status === "In Progress" && <Clock size={14} />}
          <span>{status}</span>
        </div>
        <div className="academy-progress-percentage">
          <span>{completionPercentage}%</span>
          <small>Complete</small>
        </div>
      </div>

      <div className="academy-progress-bar">
        <div
          className="academy-progress-fill"
          style={{ width: `${completionPercentage}%` }}
          role="progressbar"
          aria-valuenow={completionPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>

      <div className="academy-progress-details">
        <div className="academy-progress-stat">
          <Award size={14} />
          <span>{completedSteps.length} of {totalSteps} steps</span>
        </div>
        {status === "Completed" && (
          <div className="academy-progress-stat academy-progress-completed">
            <CheckCircle2 size={14} />
            <span>Course completed</span>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Bot, BookOpen, CheckCircle2, Mic, PlayCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChitLayout from "../../components/chit/ChitLayout";
import { useAuth } from "../../hooks/useAuth";
import { getLearningPath, updateLearningProgress } from "../../services/academyService";
import { WrittenGuide, FAQSection, Walkthrough, ProgressTracker, ProviderUnavailable } from "../../components/academy";
import "./Academy.css";

export default function Academy() {
  const navigate = useNavigate();
  const { activeTenantContext, role } = useAuth();
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);
  const [showVideoUnavailable, setShowVideoUnavailable] = useState(null);
  const [showVoiceUnavailable, setShowVoiceUnavailable] = useState(null);

  const courses = useMemo(
    () => getLearningPath({ role: role?.key || role?.code || "STAFF", query, context: activeTenantContext }),
    [role, query, activeTenantContext, version]
  );

  function complete(course) {
    updateLearningProgress(
      course,
      { status: "Completed", completedSteps: course.walkthrough, lastStep: course.walkthrough.length },
      activeTenantContext
    );
    setVersion((x) => x + 1);
  }

  function handleStepComplete(stepIndex, step) {
    const course = courses.find((c) => c.walkthrough.includes(step));
    if (course) {
      const currentCompleted = course.progress.completedSteps || [];
      if (!currentCompleted.includes(stepIndex)) {
        updateLearningProgress(
          course,
          { status: "In Progress", completedSteps: [...currentCompleted, stepIndex], lastStep: stepIndex },
          activeTenantContext
        );
        setVersion((x) => x + 1);
      }
    }
  }

  return (
    <ChitLayout title="VARDHAN Academy" subtitle="Role-based self-training, feature help and progress">
      <div className="academy-page">
        <div className="academy-search-bar">
          <label className="os-search" style={{ color: "#334155", background: "white" }}>
            <Search />
            <input
              style={{ color: "#111827" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search training and feature help"
            />
          </label>
        </div>

        <div className="academy-courses-grid">
          {courses.map((course) => (
            <article className="academy-course-card" key={course.id}>
              <div className="academy-course-header">
                <span><BookOpen /></span>
                <ProgressTracker progress={course.progress} totalSteps={course.walkthrough.length} />
              </div>

              <h3>{course.title}</h3>
              <p>{course.shortExplanation}</p>
              <small>{course.duration} min · {course.feature} · v{course.version}</small>

              <WrittenGuide content={course.writtenGuide} title="Quick Guide" />

              <div className="academy-media-actions">
                <button
                  disabled={!course.quickVideo.url}
                  onClick={() => course.quickVideo.url ? null : setShowVideoUnavailable(course.id)}
                  title={course.quickVideo.url ? "Play quick video" : "Video provider not configured"}
                >
                  <PlayCircle /> Quick video
                </button>
                <button
                  disabled={course.voice.status !== "ready"}
                  onClick={() => course.voice.status === "ready" ? null : setShowVoiceUnavailable(course.id)}
                  title={course.voice.status === "ready" ? "Play voice guide" : "Voice provider not configured"}
                >
                  <Mic /> Voice guide
                </button>
                <button onClick={() => navigate(`/chits/ai?help=${course.feature}`)}>
                  <Bot /> Ask AI
                </button>
                <button className="academy-complete-button" onClick={() => complete(course)}>
                  <CheckCircle2 /> Mark complete
                </button>
              </div>

              <Walkthrough
                steps={course.walkthrough}
                completedSteps={course.progress.completedSteps || []}
                onStepComplete={handleStepComplete}
              />

              <FAQSection faqs={course.faq} />

              {showVideoUnavailable === course.id && (
                <div className="academy-provider-modal">
                  <ProviderUnavailable type="video" />
                  <button onClick={() => setShowVideoUnavailable(null)}>Close</button>
                </div>
              )}

              {showVoiceUnavailable === course.id && (
                <div className="academy-provider-modal">
                  <ProviderUnavailable type="voice" />
                  <button onClick={() => setShowVoiceUnavailable(null)}>Close</button>
                </div>
              )}
            </article>
          ))}
        </div>

        {!courses.length && (
          <div className="academy-empty-state">
            <BookOpen size={34} />
            <h3>No training matches</h3>
            <p>Try adjusting your search or check your role permissions.</p>
          </div>
        )}
      </div>
    </ChitLayout>
  );
}

import { BookOpen } from "lucide-react";

export default function WrittenGuide({ content, title = "Guide" }) {
  if (!content) return null;

  return (
    <div className="academy-written-guide">
      <header>
        <BookOpen size={18} />
        <h4>{title}</h4>
      </header>
      <div className="academy-guide-content">
        {typeof content === "string" ? (
          <p>{content}</p>
        ) : Array.isArray(content) ? (
          content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))
        ) : (
          <p>{String(content)}</p>
        )}
      </div>
    </div>
  );
}

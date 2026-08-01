import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useState } from "react";

export default function FAQSection({ faqs = [] }) {
  const [openIndex, setOpenIndex] = useState(null);

  if (!faqs.length) return null;

  return (
    <div className="academy-faq-section">
      <header>
        <HelpCircle size={18} />
        <h4>Frequently Asked Questions</h4>
      </header>
      <div className="academy-faq-list">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`academy-faq-item ${openIndex === index ? "is-open" : ""}`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              aria-expanded={openIndex === index}
            >
              <span>{typeof faq === "string" ? faq : faq.question || faq}</span>
              {openIndex === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openIndex === index && (
              <div className="academy-faq-answer">
                {typeof faq === "object" && faq.answer ? (
                  <p>{faq.answer}</p>
                ) : (
                  <p>Detailed answer would appear here for this question.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

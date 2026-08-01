import { CheckCircle2, XCircle, Brain } from "lucide-react";
import { useState } from "react";

export default function QuizComponent({ questions = [], onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  if (!questions.length) return null;

  const handleAnswer = (questionIndex, selectedOption) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: selectedOption,
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
      onComplete?.(calculateScore());
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
  };

  const score = calculateScore();

  if (showResults) {
    return (
      <div className="academy-quiz-results">
        <header>
          <Brain size={24} />
          <h3>Quiz Complete</h3>
        </header>
        <div className="academy-score-display">
          <div className="academy-score-circle">
            <span>{score.percentage}%</span>
          </div>
          <p>
            You got {score.correct} out of {score.total} questions correct.
          </p>
        </div>
        <div className="academy-answer-review">
          {questions.map((q, index) => {
            const isCorrect = answers[index] === q.correctAnswer;
            return (
              <div key={index} className={`academy-answer-item ${isCorrect ? "correct" : "incorrect"}`}>
                {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>
                  {index + 1}. {q.question}
                </span>
                <small>Your answer: {answers[index] || "Not answered"}</small>
                {!isCorrect && <small className="correct-answer">Correct: {q.correctAnswer}</small>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="academy-quiz">
      <header>
        <Brain size={18} />
        <h4>Knowledge Check</h4>
        <span className="academy-progress-indicator">
          Question {currentQuestion + 1} of {questions.length}
        </span>
      </header>
      <div className="academy-question-card">
        <h3>{question.question}</h3>
        <div className="academy-options-list">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(currentQuestion, option)}
              className="academy-option-button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { runAICommand } from "../../services/ai/aiCommandService";
import { answerChitSetupConversation, startChitSetupConversation } from "../../services/aiConversationService";

const QUICK_COMMANDS = [
  "Create a new chit",
  "Design a chit plan",
  "Import members from Excel",
  "Read chit pattern from image",
  "Show pending collections",
  "Calculate monthly profit",
  "Export report",
  "Generate receipt",
  "Find duplicate members",
];

function VardhanAIAssistant({ activeTenantContext, onOpenImport }) {
  const navigate = useNavigate();
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [conversation, setConversation] = useState(null);

  const runCommand = (text = command) => {
    if (conversation && !conversation.completed) {
      const nextConversation = answerChitSetupConversation(conversation, text);
      setConversation(nextConversation);
      setResponse({
        title: nextConversation.completed ? "Draft plan ready" : "Chit setup question",
        message: nextConversation.completed
          ? "Local conversation generated Safe, Balanced and Growth proposals. Review before saving."
          : nextConversation.currentQuestion,
      });
      setCommand("");
      return;
    }
    if (/create .*chit|design .*chit|chit for/i.test(text)) {
      const nextConversation = startChitSetupConversation(text, activeTenantContext);
      setConversation(nextConversation);
      setResponse({
        title: "Local conversational chit setup",
        message: nextConversation.currentQuestion,
      });
      setCommand(text);
      return;
    }
    const result = runAICommand(text, activeTenantContext);
    setResponse(result);
    setCommand(text);
    if (text.toLowerCase().includes("import") || text.toLowerCase().includes("image")) {
      onOpenImport?.();
    } else if (result.action?.route && result.action.route !== "/dashboard") {
      navigate(result.action.route);
    }
  };

  return (
    <section className="vardhan-ai-panel">
      <div className="vardhan-ai-panel-header">
        <div>
          <span>VARDHAN AI Assistant</span>
          <h3>Local command assistant</h3>
        </div>
        <Bot size={22} />
      </div>
      <div className="vardhan-ai-command-row">
        <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Ask: Design a chit plan" />
        <button type="button" onClick={() => runCommand()}><Send size={16} /> Run</button>
      </div>
      <div className="vardhan-ai-command-list">
        {QUICK_COMMANDS.map((item) => <button type="button" key={item} onClick={() => runCommand(item)}>{item}</button>)}
      </div>
      {response && (
        <div className="vardhan-ai-response">
          <strong>{response.title}</strong>
          <p>{response.message}</p>
          {conversation?.completed && (
            <p>{conversation.draftPlan?.length || 0} local proposals generated. Open AI Chit Studio to edit and confirm.</p>
          )}
        </div>
      )}
    </section>
  );
}

export default VardhanAIAssistant;

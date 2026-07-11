import { createAIContext } from "./AIContext.js";
import { vardhanAIEngine } from "./AIEngine.js";

export const AIAssistant = {
  ask({ type = "INSIGHTS", commandText = "", context = createAIContext() } = {}) {
    return vardhanAIEngine.execute({ type, commandText, context });
  },

  command(commandText, context = createAIContext()) {
    return vardhanAIEngine.executeCommand(commandText, context);
  },
};

import { vardhanAIEngine } from "../../ai/AIEngine.js";
import { AIRepository } from "../../repositories/AIRepository.js";
import { buildAIContext, executeAICommand } from "./aiEngineService.js";

export function getAICommandSuggestions(activeTenantContext) {
  const payload = AIRepository.getCommandSuggestions(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.execute({ type: "COMMAND_SUGGESTIONS", context });
}

export function runAICommand(commandText, activeTenantContext) {
  return executeAICommand(commandText, activeTenantContext);
}

import { AIConversationSetup } from "../ai/AIConversationSetup.js";

export function startChitSetupConversation(text, activeTenantContext) {
  return AIConversationSetup.start(text, activeTenantContext);
}

export function answerChitSetupConversation(state, answer) {
  return AIConversationSetup.answer(state, answer);
}

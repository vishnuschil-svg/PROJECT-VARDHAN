import { createAssistantResponse } from "./AIContext.js";

export const AI_COMMANDS = [
  {
    id: "create-new-chit",
    examples: ["create new chit", "create a new chit", "new chit", "add chit"],
    title: "Create new chit",
    route: "/chits/groups",
  },
  {
    id: "design-chit-plan",
    examples: ["design a chit plan", "design chit plan", "chit plan"],
    title: "Design a chit plan",
    route: "/dashboard",
  },
  {
    id: "import-members-excel",
    examples: ["import members from excel", "import excel", "import members"],
    title: "Import members from Excel",
    route: "/dashboard",
  },
  {
    id: "read-chit-pattern-image",
    examples: ["read chit pattern from image", "read chit image", "capture chit pattern"],
    title: "Read chit pattern from image",
    route: "/dashboard",
  },
  {
    id: "show-pending",
    examples: ["show pending", "pending collections", "pending"],
    title: "Show pending",
    route: "/chits/collections/pending",
  },
  {
    id: "todays-collection",
    examples: ["today's collection", "todays collection", "today collection"],
    title: "Today's collection",
    route: "/chits/collections",
  },
  {
    id: "find-duplicate-members",
    examples: ["find duplicate members", "duplicate members", "duplicates"],
    title: "Find duplicate members",
    route: "/chits/members",
  },
  {
    id: "generate-receipt",
    examples: ["generate receipt", "receipt", "create receipt"],
    title: "Generate receipt",
    route: "/chits/receipts",
  },
  {
    id: "show-business-health",
    examples: ["show business health", "business health", "health score"],
    title: "Show business health",
    route: "/dashboard",
  },
  {
    id: "open-reports",
    examples: ["open reports", "show reports", "reports", "export report"],
    title: "Open reports",
    route: "/chits/reports",
  },
  {
    id: "calculate-monthly-profit",
    examples: ["calculate monthly profit", "monthly profit", "profit"],
    title: "Calculate monthly profit",
    route: "/chits/finance",
  },
  {
    id: "open-collections",
    examples: ["open collections", "collections"],
    title: "Open collections",
    route: "/chits/collections",
  },
];

export function getCommandSuggestions() {
  return AI_COMMANDS.map((command) =>
    createAssistantResponse({
      id: `command-suggestion-${command.id}`,
      type: "COMMAND_SUGGESTION",
      title: command.title,
      message: `Try: "${command.examples[0]}".`,
      action: { label: command.title, route: command.route, command: command.examples[0] },
      confidence: 0.92,
      severity: "info",
    })
  );
}

export function executeCommand(commandText = "") {
  const normalizedCommand = normalizeCommand(commandText);
  const command = AI_COMMANDS.find((item) =>
    item.examples.some((example) => normalizeCommand(example) === normalizedCommand)
  ) || AI_COMMANDS.find((item) =>
    item.examples.some((example) => normalizedCommand.includes(normalizeCommand(example)))
  );

  if (!command) {
    return createAssistantResponse({
      id: "command-unknown",
      type: "COMMAND_RESULT",
      title: "Command not recognized",
      message: "I can route chit commands like show pending, open reports, generate receipt, or business health.",
      action: { label: "View command suggestions", route: "/dashboard" },
      confidence: 0.32,
      severity: "warning",
    });
  }

  return createAssistantResponse({
    id: `command-result-${command.id}`,
    type: "COMMAND_RESULT",
    title: command.title,
    message: `Opening ${command.title.toLowerCase()} using a safe existing route.`,
    action: { label: command.title, route: command.route, command: commandText },
    confidence: 0.94,
    severity: "success",
  });
}

function normalizeCommand(commandText) {
  return String(commandText || "").trim().toLowerCase().replace(/\s+/g, " ");
}

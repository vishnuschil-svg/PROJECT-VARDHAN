const TELUGU_DIGITS = Object.freeze({
  "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4",
  "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
});

const FIELD_DEFINITIONS = Object.freeze([
  {
    key: "chitName",
    type: "text",
    aliases: ["chit name", "group name", "scheme name", "చిట్ పేరు"],
  },
  {
    key: "chitValue",
    type: "number",
    aliases: ["chit value", "total value", "chit amount", "మొత్తం", "చిట్ విలువ"],
  },
  {
    key: "duration",
    type: "integer",
    aliases: ["duration", "total months", "months", "period", "కాలం"],
  },
  {
    key: "memberCount",
    type: "integer",
    aliases: ["member count", "number of members", "members", "సభ్యుల సంఖ్య"],
  },
  {
    key: "monthlyPayment",
    type: "number",
    aliases: ["monthly installment", "monthly amount", "installment", "వాయిదా", "చందా"],
  },
  {
    key: "organizerName",
    type: "text",
    aliases: ["organizer", "foreman", "run by", "నిర్వాహకుడు"],
  },
]);

const PATTERN_DEFINITIONS = Object.freeze([
  {
    value: "LIFTED_NON_LIFTED",
    phrases: ["lifted non lifted", "lifted/non-lifted", "non lifted", "after lift", "లిఫ్ట్"],
  },
  {
    value: "VARIABLE_MONTHLY",
    phrases: ["variable monthly", "month wise variable", "month-wise variable", "different each month"],
  },
  {
    value: "FIXED_MONTHLY",
    phrases: ["fixed monthly", "equal installment", "same every month", "నెలవారీ స్థిర", "స్థిర వాయిదా"],
  },
  {
    value: "CUSTOM_RULE",
    phrases: ["custom rule", "special rule", "ప్రత్యేక నియమం"],
  },
]);

const RULE_ALIASES = Object.freeze({
  auction: ["auction", "bid", "పాట", "వేలం"],
  dividend: ["dividend", "డివిడెండ్"],
});

const ALIAS_ENTRIES = FIELD_DEFINITIONS
  .flatMap((definition) => definition.aliases.map((alias) => ({
    alias,
    key: definition.key,
    type: definition.type,
  })))
  .sort((left, right) => right.alias.length - left.alias.length);

const ALIAS_PATTERN = new RegExp(
  ALIAS_ENTRIES.map(({ alias }) => escapeRegExp(alias)).join("|"),
  "giu"
);

export function normalizeTeluguDigits(value = "") {
  return String(value).replace(/[౦-౯]/g, (digit) => TELUGU_DIGITS[digit] || digit);
}

export function extractTaggedValues(text = "") {
  const source = normalizeTeluguDigits(text);
  const matches = [];
  ALIAS_PATTERN.lastIndex = 0;
  let match;
  while ((match = ALIAS_PATTERN.exec(source)) !== null) {
    const alias = match[0].toLocaleLowerCase();
    const definition = ALIAS_ENTRIES.find(
      (entry) => entry.alias.toLocaleLowerCase() === alias
    );
    if (definition) {
      matches.push({
        ...definition,
        index: match.index,
        valueStart: consumeSeparator(source, ALIAS_PATTERN.lastIndex),
      });
    }
  }

  return matches.map((current, index) => {
    const next = matches[index + 1];
    const rawValue = source
      .slice(current.valueStart, next?.index ?? source.length)
      .replace(/^[\s:;=\-–—]+/, "")
      .replace(/[\s.;,|]+$/, "")
      .trim();
    return { key: current.key, type: current.type, rawValue };
  });
}

export function parseInstallmentPattern(text = "") {
  const normalized = normalizeTeluguDigits(text).toLocaleLowerCase();
  const match = PATTERN_DEFINITIONS.find(({ phrases }) =>
    phrases.some((phrase) => normalized.includes(phrase))
  );
  return match?.value || "UNKNOWN";
}

export function parseChitNaturalText(text = "") {
  const tagged = extractTaggedValues(text);
  const result = {};
  for (const item of tagged) {
    if (result[item.key] !== undefined || !item.rawValue) continue;
    const value = item.type === "text"
      ? cleanTextValue(item.rawValue)
      : parseNumericValue(item.rawValue, item.type === "integer");
    if (value !== null && value !== "") result[item.key] = value;
  }

  result.installmentPattern = parseInstallmentPattern(text);
  result.detectedTerms = Object.fromEntries(
    Object.entries(RULE_ALIASES).map(([key, aliases]) => [
      key,
      aliases.some((alias) => normalizeTeluguDigits(text).toLocaleLowerCase().includes(alias)),
    ])
  );
  return result;
}

export function parseNumericValue(value, integer = false) {
  const normalized = normalizeTeluguDigits(value).replace(/,/g, "");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  if (!Number.isFinite(number)) return null;
  return integer ? Math.trunc(number) : number;
}

function cleanTextValue(value) {
  return value
    .replace(/^(?:is|:|=)\s*/i, "")
    .split(/\s*[.;|]\s*/)[0]
    .trim();
}

function consumeSeparator(text, index) {
  const remainder = text.slice(index);
  const separator = remainder.match(/^\s*(?::|=|-|–|—|\bis\b)?\s*/iu);
  return index + (separator?.[0].length || 0);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const CHIT_TEXT_FIELD_DEFINITIONS = FIELD_DEFINITIONS;

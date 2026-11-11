export type Topic = "government" | "education" | "social_aid" | "disaster" | "health" | "economy" | "other";

export const TOPIC_META: Record<Topic, { label: string; emoji: string }> = {
  government: { label: "Government & Policy", emoji: "🏛️" },
  education: { label: "Education", emoji: "🎓" },
  social_aid: { label: "Social Aid & Ayuda", emoji: "💸" },
  disaster: { label: "Disaster & Weather", emoji: "🌦️" },
  health: { label: "Health", emoji: "🏥" },
  economy: { label: "Economy & Consumer", emoji: "⚖️" },
  other: { label: "Other", emoji: "📰" },
};

const RULES: [Topic, RegExp][] = [
  ["social_aid", /ayuda|dswd|cash aid|4ps|sap\b|giveaway|financial assistance|₱\s?\d|ayuda|libreng pera|tulong pinansyal/i],
  ["education", /deped|ched|tesda|suc|school|tuition|scholar|student|estudyante|curriculum|college|university|rotc|klase|teacher/i],
  ["disaster", /pagasa|phivolcs|typhoon|bagyo|lindol|earthquake|flood|baha|suspend|walang pasok|signal no|volcano|ndrrmc/i],
  ["health", /doh|philhealth|vaccine|bakuna|covid|virus|hospital|medical|sakit|health|gamot/i],
  ["economy", /lto|ltfrb|mrt|lrt|fare|pamasahe|price|presyo|bsp|peso|bill|tax|buwis|sim card|gasolina|oil|salary|sahod|wage/i],
  ["government", /marcos|duterte|senate|senado|congress|malaca|president|pangulo|lgu|mayor|executive order|batas|law|holiday|comelec|election|government/i],
];

export function isTopic(v: unknown): v is Topic {
  return typeof v === "string" && v in TOPIC_META;
}

/** AI-provided category when valid, else keyword fallback (works for older saved chats). */
export function classifyTopic(text: string, aiCategory?: string): Topic {
  if (isTopic(aiCategory)) return aiCategory;
  for (const [t, re] of RULES) if (re.test(text)) return t;
  return "other";
}

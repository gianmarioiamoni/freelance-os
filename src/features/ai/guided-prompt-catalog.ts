// src/features/ai/guided-prompt-catalog.ts

export const GUIDED_PROMPT_CATEGORIES = [
  "Overview",
  "Revenue",
  "Time",
  "Contracts",
] as const;

export type GuidedPromptCategory = (typeof GUIDED_PROMPT_CATEGORIES)[number];

export type GuidedPromptId =
  | "GP-01"
  | "GP-02"
  | "GP-03"
  | "GP-04"
  | "GP-05"
  | "GP-06"
  | "GP-07"
  | "GP-08"
  | "GP-09";

export type GuidedPromptDefinition = {
  id: GuidedPromptId;
  category: GuidedPromptCategory;
  text: string;
};

export const VISIBLE_GUIDED_PROMPT_LIMIT = 6;

/**
 * Canonical first-slice prompts. Order is static and not context-aware.
 * GP-08 / GP-09 are exposed only after allocation/contract identity grounding.
 */
export const GUIDED_PROMPT_CATALOG: readonly GuidedPromptDefinition[] = [
  { id: "GP-01", category: "Overview", text: "Come sto andando questo mese?" },
  { id: "GP-02", category: "Overview", text: "Cosa dovrei sapere questo mese?" },
  { id: "GP-03", category: "Revenue", text: "Quanto ho maturato questo mese?" },
  { id: "GP-04", category: "Revenue", text: "Qual è il mio Expected questo mese?" },
  { id: "GP-05", category: "Revenue", text: "Qual è il Forecast di questo mese?" },
  { id: "GP-06", category: "Time", text: "Quante ore ho lavorato questo mese?" },
  { id: "GP-07", category: "Time", text: "Come sono distribuite le mie ore?" },
  { id: "GP-08", category: "Contracts", text: "Quali contratti richiedono attenzione?" },
  {
    id: "GP-09",
    category: "Contracts",
    text: "Quali contratti stanno consumando più rapidamente l'allocazione?",
  },
];

export const EXPOSED_GUIDED_PROMPT_IDS: readonly GuidedPromptId[] = [
  "GP-01",
  "GP-02",
  "GP-03",
  "GP-04",
  "GP-05",
  "GP-06",
  "GP-07",
  "GP-08",
  "GP-09",
];

export function exposedGuidedPrompts(): GuidedPromptDefinition[] {
  const allowed = new Set(EXPOSED_GUIDED_PROMPT_IDS);
  return GUIDED_PROMPT_CATALOG.filter((prompt) => allowed.has(prompt.id));
}

export function visibleGuidedPrompts(): GuidedPromptDefinition[] {
  return exposedGuidedPrompts().slice(0, VISIBLE_GUIDED_PROMPT_LIMIT);
}

export function additionalGuidedPrompts(): GuidedPromptDefinition[] {
  return exposedGuidedPrompts().slice(VISIBLE_GUIDED_PROMPT_LIMIT);
}

export function populateAskBox(promptText: string): string {
  return promptText;
}

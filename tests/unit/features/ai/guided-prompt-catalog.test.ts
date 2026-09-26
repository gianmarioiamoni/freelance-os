// tests/unit/features/ai/guided-prompt-catalog.test.ts
import { describe, expect, it } from "vitest";

import {
  additionalGuidedPrompts,
  EXPOSED_GUIDED_PROMPT_IDS,
  GUIDED_PROMPT_CATALOG,
  exposedGuidedPrompts,
  populateAskBox,
  visibleGuidedPrompts,
} from "@/features/ai/guided-prompt-catalog";

describe("guided prompt catalog", () => {
  it("keeps the approved first-slice texts in static order", () => {
    expect(GUIDED_PROMPT_CATALOG.map((prompt) => prompt.text)).toEqual([
      "Come sto andando questo mese?",
      "Cosa dovrei sapere questo mese?",
      "Quanto ho maturato questo mese?",
      "Qual è il mio Expected questo mese?",
      "Qual è il Forecast di questo mese?",
      "Quante ore ho lavorato questo mese?",
      "Come sono distribuite le mie ore?",
      "Quali contratti richiedono attenzione?",
      "Quali contratti stanno consumando più rapidamente l'allocazione?",
    ]);
  });

  it("exposes GP-08 and GP-09 after allocation identity grounding", () => {
    expect(EXPOSED_GUIDED_PROMPT_IDS).toEqual(GUIDED_PROMPT_CATALOG.map((prompt) => prompt.id));
    expect(exposedGuidedPrompts().map((prompt) => prompt.id)).toContain("GP-08");
    expect(exposedGuidedPrompts().map((prompt) => prompt.id)).toContain("GP-09");
    expect(visibleGuidedPrompts()).toHaveLength(6);
    expect(additionalGuidedPrompts().map((prompt) => prompt.id)).toEqual([
      "GP-07",
      "GP-08",
      "GP-09",
    ]);
  });

  it("populates the ask-box text without submitting", () => {
    expect(populateAskBox("Come sto andando questo mese?")).toBe(
      "Come sto andando questo mese?",
    );
  });
});

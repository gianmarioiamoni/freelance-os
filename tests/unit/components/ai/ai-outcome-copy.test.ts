// tests/unit/components/ai/ai-outcome-copy.test.ts
import { describe, expect, it } from "vitest";

import { aiOutcomeCopy } from "@/components/ai/ai-outcome-copy";

describe("aiOutcomeCopy", () => {
  it("keeps unavailable distinct from a generic error", () => {
    expect(aiOutcomeCopy({ outcome: "unavailable" })).toMatchObject({
      title: "AI analytics unavailable",
      canRetry: false,
    });
    expect(aiOutcomeCopy({ outcome: "error" })).toMatchObject({
      title: "Something went wrong",
      canRetry: true,
    });
  });

  it("covers clarification, refusal, timeout, and success chrome", () => {
    expect(aiOutcomeCopy({ outcome: "success" }).title).toBe("Answer");
    expect(
      aiOutcomeCopy({ outcome: "clarification", refusalClass: "ambiguous_entity" }).title,
    ).toBe("Clarification needed");
    expect(
      aiOutcomeCopy({ outcome: "refusal", refusalClass: "unsupported_capability" }).description,
    ).toContain("overview");
    expect(aiOutcomeCopy({ outcome: "timeout" }).canRetry).toBe(true);
  });

  describe("language detection", () => {
    it("detects Italian queries and provides Italian responses", () => {
      const italianQuestion = "Quanto ho maturato a gennaio 2026?";
      
      const clarification = aiOutcomeCopy(
        { outcome: "clarification", refusalClass: "invalid_period" },
        italianQuestion,
      );
      expect(clarification.title).toBe("Chiarimento necessario");
      expect(clarification.description).toContain("workspace non contiene");
      expect(clarification.description).toContain("dati");
      expect(clarification.description).not.toContain("analytics reads");

      const refusal = aiOutcomeCopy(
        { outcome: "refusal", refusalClass: "write_forbidden" },
        italianQuestion,
      );
      expect(refusal.title).toBe("Non supportato");
      expect(refusal.description).toContain("non può effettuare modifiche");

      const unavailable = aiOutcomeCopy({ outcome: "unavailable" }, italianQuestion);
      expect(unavailable.title).toBe("Analisi AI non disponibile");
    });

    it("defaults to English for English queries", () => {
      const englishQuestion = "How much did I accrue in January 2026?";
      
      const clarification = aiOutcomeCopy(
        { outcome: "clarification", refusalClass: "invalid_period" },
        englishQuestion,
      );
      expect(clarification.title).toBe("Clarification needed");
      expect(clarification.description).toContain("workspace does not contain");
      expect(clarification.description).toContain("sufficient");
      expect(clarification.description).not.toContain("analytics reads");

      const refusal = aiOutcomeCopy(
        { outcome: "refusal", refusalClass: "write_forbidden" },
        englishQuestion,
      );
      expect(refusal.title).toBe("Not supported");
      expect(refusal.description).toContain("cannot make changes");
    });

    it("defaults to English when no question provided", () => {
      const result = aiOutcomeCopy({
        outcome: "clarification",
        refusalClass: "invalid_period",
      });
      expect(result.title).toBe("Clarification needed");
      expect(result.description).toContain("workspace does not contain");
    });

    it("does not expose internal terminology", () => {
      const questions = [
        "Quanto ho maturato questo mese?",
        "How much did I accrue this month?",
      ];

      questions.forEach((question) => {
        const result = aiOutcomeCopy(
          { outcome: "clarification", refusalClass: "invalid_period" },
          question,
        );
        
        // Should not contain internal terms
        expect(result.description.toLowerCase()).not.toContain("analytics reads");
        expect(result.description.toLowerCase()).not.toContain("dto");
        expect(result.description.toLowerCase()).not.toContain("tool");
        expect(result.description.toLowerCase()).not.toContain("capability");
        expect(result.description.toLowerCase()).not.toContain("provider");
      });
    });

    it("provides context about missing workspace data", () => {
      const italianResult = aiOutcomeCopy(
        { outcome: "clarification", refusalClass: "invalid_period" },
        "Quanto ho maturato questo mese?",
      );
      expect(italianResult.description).toContain("contratti");
      expect(italianResult.description).toContain("attività");

      const englishResult = aiOutcomeCopy(
        { outcome: "clarification", refusalClass: "invalid_period" },
        "How much did I accrue this month?",
      );
      expect(englishResult.description).toContain("contract");
      expect(englishResult.description).toContain("activity");
    });
  });
});

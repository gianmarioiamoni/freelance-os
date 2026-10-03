// src/components/ai/ai-outcome-copy.ts
import type { AiAskResult, AiRefusalClass } from "@/application/ai/ai-types";
import { GUIDED_PROMPT_CATEGORIES } from "@/features/ai/guided-prompt-catalog";

export type AiOutcomeCopy = {
  title: string;
  description: string;
  canRetry: boolean;
};

function detectItalian(text: string): boolean {
  const italianWords = /\b(quanto|quante|questo|questa|quello|quella|mese|settimana|anno|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|ho|hai|qual|quale|contratt|client|maturato|previsto|attenzion|consumo|allocazion)\b/i;
  return italianWords.test(text);
}

const CLARIFICATION_COPY: Record<
  Extract<AiRefusalClass, "ambiguous_entity" | "unknown_entity" | "invalid_period">,
  { en: string; it: string }
> = {
  ambiguous_entity: {
    en: "More than one client matches that name. Specify which client you mean.",
    it: "Più di un cliente corrisponde a quel nome. Specifica quale cliente intendi.",
  },
  unknown_entity: {
    en: "That client or contract was not found. Check the name and try again.",
    it: "Cliente o contratto non trovato. Controlla il nome e riprova.",
  },
  invalid_period: {
    en: "I can't answer that question yet because this workspace does not contain sufficient contract or activity data for the requested period. Add the relevant data and I can analyze it.",
    it: "Non posso rispondere a questa domanda perché il workspace non contiene ancora dati di contratti o attività sufficienti per il periodo richiesto. Aggiungi i dati necessari e potrò analizzarli.",
  },
};

const REFUSAL_COPY: Record<
  Extract<AiRefusalClass, "unsupported_capability" | "write_forbidden" | "injection">,
  { en: string; it: string }
> = {
  unsupported_capability: {
    en: `That question is not supported. You can ask about ${GUIDED_PROMPT_CATEGORIES.join(", ").toLowerCase()}.`,
    it: `Questa domanda non è supportata. Puoi chiedere informazioni su ${GUIDED_PROMPT_CATEGORIES.join(", ").toLowerCase()}.`,
  },
  write_forbidden: {
    en: "AI cannot make changes. It can only explain existing analytics.",
    it: "L'AI non può effettuare modifiche. Può solo spiegare i dati analitici esistenti.",
  },
  injection: {
    en: "That request is not supported.",
    it: "Questa richiesta non è supportata.",
  },
};

export function aiOutcomeCopy(
  result: Pick<AiAskResult, "outcome" | "refusalClass">,
  originalQuestion?: string,
): AiOutcomeCopy {
  const lang = originalQuestion && detectItalian(originalQuestion) ? "it" : "en";

  if (result.outcome === "success") {
    return { title: lang === "it" ? "Risposta" : "Answer", description: "", canRetry: false };
  }

  if (result.outcome === "clarification") {
    const description =
      result.refusalClass === "ambiguous_entity" ||
      result.refusalClass === "unknown_entity" ||
      result.refusalClass === "invalid_period"
        ? CLARIFICATION_COPY[result.refusalClass][lang]
        : lang === "it"
          ? "Questa domanda richiede maggiori dettagli per poter essere risposta."
          : "This question needs more detail before it can be answered.";
    return {
      title: lang === "it" ? "Chiarimento necessario" : "Clarification needed",
      description,
      canRetry: false,
    };
  }

  if (result.outcome === "refusal") {
    const description =
      result.refusalClass === "unsupported_capability" ||
      result.refusalClass === "write_forbidden" ||
      result.refusalClass === "injection"
        ? REFUSAL_COPY[result.refusalClass][lang]
        : lang === "it"
          ? "Questa domanda non è supportata."
          : "That question is not supported.";
    return {
      title: lang === "it" ? "Non supportato" : "Not supported",
      description,
      canRetry: false,
    };
  }

  if (result.outcome === "unavailable") {
    return {
      title: lang === "it" ? "Analisi AI non disponibile" : "AI analytics unavailable",
      description:
        lang === "it"
          ? "L'analisi AI è temporaneamente non disponibile. Dashboard e Reports continuano a funzionare normalmente."
          : "AI analytics is temporarily unavailable. Dashboard and Reports continue to work as usual.",
      canRetry: false,
    };
  }

  if (result.outcome === "timeout") {
    return {
      title: lang === "it" ? "Richiesta scaduta" : "Request timed out",
      description:
        lang === "it"
          ? "La richiesta ha impiegato troppo tempo. Puoi riprovare."
          : "The request took too long. You can try again.",
      canRetry: true,
    };
  }

  return {
    title: lang === "it" ? "Qualcosa è andato storto" : "Something went wrong",
    description:
      lang === "it"
        ? "Non è stato possibile rispondere alla domanda. Riprova."
        : "The question could not be answered. Try again.",
    canRetry: true,
  };
}

export type LlmFunctionality =
  | "jdAnalysis"
  | "cvGeneration"
  | "coverLetterGeneration"
  | "applicationAnalysis"
  | "optimization";

const DEFAULT_MODEL = process.env.LLM_MODEL_DEFAULT || "gpt-4o-mini";

const modelByFunctionality: Record<LlmFunctionality, string> = {
  jdAnalysis: process.env.LLM_MODEL_JD_ANALYSIS || DEFAULT_MODEL,
  cvGeneration: process.env.LLM_MODEL_CV_GENERATION || DEFAULT_MODEL,
  coverLetterGeneration: process.env.LLM_MODEL_COVER_LETTER || DEFAULT_MODEL,
  applicationAnalysis: process.env.LLM_MODEL_ANALYSIS || DEFAULT_MODEL,
  optimization: process.env.LLM_MODEL_OPTIMIZATION || DEFAULT_MODEL,
};

export function getModelFor(functionality: LlmFunctionality): string {
  return modelByFunctionality[functionality];
}

export function getLlmModelConfiguration() {
  return {
    defaultModel: DEFAULT_MODEL,
    modelByFunctionality,
  };
}

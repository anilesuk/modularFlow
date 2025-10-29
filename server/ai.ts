import OpenAI from "openai";
import type { JobPostingPayload, CvDocument, CoverLetter, Scorecard, Recommendation, TraceChange, JdSpec, EvaluationCriteria } from "@shared/schema";
import { cvDocumentSchema, coverLetterSchema, scorecardSchema, recommendationSchema, traceChangeSchema, jdSpecSchema, evaluationCriteriaSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export class AIService {
  /**
   * Pass 1: Generate initial CV and cover letter drafts with JD spec, weighted evaluation criteria, and scorecard analysis
   */
  async generateDraft(
    candidateProfile: string,
    jobPosting: JobPostingPayload
  ): Promise<{
    jdSpec: JdSpec;
    evaluationCriteria: EvaluationCriteria;
    cvDraft: CvDocument;
    coverLetterDraft: CoverLetter;
    scorecard: Scorecard;
    recommendations: Recommendation[];
  }> {
    const systemPrompt = `You are an expert CV writer. Generate ATS-compliant CVs and cover letters. Return valid JSON only.

RULES:
- No pronouns (I/me/we/he/she). Use neutral phrasing.
- Years only for dates (e.g., 2020-2023).
- Achievements: SOAR format (Situation, Obstacle, Action, Result), past-tense verb, end with period.
- CV: profile_summary 80-220 chars; key_skills 8-16 items; ~750-900 words total.
- Cover letter: UK style, 300-400 words.
- Use ONLY info from candidate profile. Don't invent data.
- Every achievement needs grounding.source_snippet from the candidate CV.
- evaluation_criteria: 4-7 items, weights sum to 100.
- All years and scores must be numbers, not strings.

Return JSON matching this structure:
{
  "jd_spec": { company, role, must_have, nice_to_have, responsibilities, skills, tools, domains, scope_indicators, outcomes_kpis, keywords },
  "evaluation_criteria": [ { name, jd_signals, weight_percent, rubric: {excellent, good, fair, poor}, target_cv_fields } ],
  "cv": { header, headline, profile_summary, key_skills, technical_skills, experience: [{employer, title, dates:{from_year, to_year}, overview, achievements:[{bullet, situation, obstacle, action, result, grounding:{source_snippet}}]}], education, certifications },
  "coverLetter": { header, meta, paragraphs, sign_off },
  "scorecard": { scorecard: [{area, jd_expectation, cv_strength, score_1_to_10, criterion_ref}], overall_score_1_to_10 },
  "recommendations": [{priority, rationale, target_section, suggested_text}]
}`;

    const userPrompt = `Create CV and cover letter for this job.

CANDIDATE:
${candidateProfile}

JOB:
Company: ${jobPosting.company?.name || "Not specified"}
Role: ${jobPosting.role.title}
Location: ${jobPosting.role.location || "Not specified"}
Description: ${jobPosting.description.clean_text}

Return JSON with: jd_spec, evaluation_criteria (4-7 items, weights sum to 100), cv (with grounding in achievements), coverLetter, scorecard (with overall_score_1_to_10), recommendations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate AI output against schemas before returning
    try {
      const jdSpec = jdSpecSchema.parse(result.jd_spec);
      const evaluationCriteria = evaluationCriteriaSchema.parse(result.evaluation_criteria);
      
      // Validate weights sum to 100
      const totalWeight = evaluationCriteria.reduce((sum, c) => sum + c.weight_percent, 0);
      if (totalWeight !== 100) {
        throw new Error(`Evaluation criteria weights must sum to 100, got ${totalWeight}`);
      }
      
      const cvDraft = cvDocumentSchema.parse(result.cv);
      const coverLetterDraft = coverLetterSchema.parse(result.coverLetter);
      const scorecard = scorecardSchema.parse(result.scorecard);
      
      // Safely validate recommendations array
      if (!Array.isArray(result.recommendations)) {
        throw new Error("AI output missing recommendations array");
      }
      const recommendations = result.recommendations.map((r: any) => recommendationSchema.parse(r));
      
      return {
        jdSpec,
        evaluationCriteria,
        cvDraft,
        coverLetterDraft,
        scorecard,
        recommendations,
      };
    } catch (error: any) {
      console.error("AI output validation failed:", error);
      console.error("Raw AI output:", JSON.stringify(result, null, 2));
      
      // Only use fromZodError for actual ZodErrors
      if (error?.name === "ZodError") {
        const validationError = fromZodError(error);
        throw new Error(`AI generated invalid output: ${validationError.toString()}`);
      }
      
      // Re-throw other errors as-is with context
      throw new Error(`AI generation error: ${error.message || error}`);
    }
  }

  /**
   * Pass 2: Refine documents based on recommendations and generate change tracking
   */
  async optimizeDocuments(
    jdSpec: JdSpec,
    evaluationCriteria: EvaluationCriteria,
    cvDraft: CvDocument,
    coverLetterDraft: CoverLetter,
    jobPosting: JobPostingPayload,
    recommendations: Recommendation[]
  ): Promise<{
    cvFinal: CvDocument;
    coverLetterFinal: CoverLetter;
    scorecardFinal: Scorecard;
    addedPoints: TraceChange[];
  }> {
    const systemPrompt = `You refine CVs by applying recommendations. Return valid JSON only.

RULES:
- Apply ALL recommendations without inventing facts.
- Keep grounding (source_snippet) for every achievement.
- No pronouns. Years only. SOAR format. End bullets with period.
- Profile summary 80-220 chars; key_skills 8-16 items.
- Cover letter 300-400 words, UK style.
- Rescore against evaluation_criteria.
- Track changes in addedPoints.

Return JSON:
{
  "jd_spec": {...same or refined...},
  "evaluation_criteria": [...same...],
  "cv": {...with grounding preserved...},
  "coverLetter": {...refined...},
  "scorecard": { scorecard: [...], overall_score_1_to_10: number },
  "addedPoints": [{description, quote, target_section}]
}`;

    const userPrompt = `Refine these documents by applying recommendations. Preserve grounding and truthfulness.

CURRENT DRAFT:
jd_spec: ${JSON.stringify(jdSpec)}
evaluation_criteria: ${JSON.stringify(evaluationCriteria)}
cv: ${JSON.stringify(cvDraft)}
coverLetter: ${JSON.stringify(coverLetterDraft)}

RECOMMENDATIONS:
${JSON.stringify(recommendations)}

Return refined JSON with addedPoints tracking all changes.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate AI output against schemas before returning
    try {
      const cvFinal = cvDocumentSchema.parse(result.cv);
      const coverLetterFinal = coverLetterSchema.parse(result.coverLetter);
      const scorecardFinal = scorecardSchema.parse(result.scorecard);
      
      // Safely validate addedPoints array
      if (!Array.isArray(result.addedPoints) && result.addedPoints !== undefined) {
        throw new Error("AI output addedPoints must be an array or undefined");
      }
      const addedPoints = (result.addedPoints || []).map((p: any) => traceChangeSchema.parse(p));
      
      return {
        cvFinal,
        coverLetterFinal,
        scorecardFinal,
        addedPoints,
      };
    } catch (error: any) {
      console.error("AI output validation failed:", error);
      console.error("Raw AI output:", JSON.stringify(result, null, 2));
      
      // Only use fromZodError for actual ZodErrors
      if (error?.name === "ZodError") {
        const validationError = fromZodError(error);
        throw new Error(`AI generated invalid output: ${validationError.toString()}`);
      }
      
      // Re-throw other errors as-is with context
      throw new Error(`AI generation error: ${error.message || error}`);
    }
  }
}

export const aiService = new AIService();

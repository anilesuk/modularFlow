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
    const systemPrompt = `You are "CV & Cover Letter Pro – Targeted Job Applications." Return ONE valid JSON object only (no markdown, no commentary).

OBJECTIVE
1) Parse the job description into a structured JD spec.
2) From the JD spec, derive up to 7 weighted evaluation criteria (min 4, max 7) with explicit rubrics.
3) Produce a tailored, ATS-compliant CV where EACH section is a distinct JSON field and every achievement is grounded in the candidate profile.
4) Produce a UK-style cover letter aligned to the JD and the CV.
5) Score the draft against the criteria and propose actionable recommendations.

ATS + STYLE RULES (NON-NEGOTIABLE)
- No first-person or gendered pronouns (no I/we/he/she/his/her). Use neutral phrasing or the candidate name if provided.
- Achievements = SOAR fused into ONE concise bullet, start with a strong past-tense action verb, end with a period, quantify ONLY if supported by the candidate source.
- Dates = YEARS ONLY (e.g., "2020-2023"). No months anywhere.
- CV must fit ~2 pages when rendered (~750–900 words): prioritise last 10–12 years; earlier career summarised WITHOUT dates.
- CV content format: reverse chronological; "Key Skills" = array (vertical list) of 8–16 items; "Technical Skills" = single pipe-separated string. No italics/underline/tables/columns/shading.
- Cover letter: UK business letter, 300–400 words total; Opening → Alignment → Fit Evidence → Closing; only reference facts present in candidate profile/CV.

HARD FIELD CONSTRAINTS (VALIDATE BEFORE RETURN)
- cv.profile_summary length: 80–220 CHARACTERS inclusive.
- cv.key_skills length: 8–16 items inclusive.
- scorecard.scorecard items: 4–12 inclusive (derived from evaluation_criteria).
- evaluation_criteria: 4–7 items; weights sum to 100.
- Types: years are NUMBERS; score_1_to_10 is NUMBER; overall_score_1_to_10 is NUMBER.

TRUTHFULNESS & GROUNDING
- Use ONLY the candidate profile and JD. No fabrication. Adjacency allowed only if plainly implied; do not invent numbers.
- For each CV achievement bullet, include a grounding object with a short candidate source snippet and an optional character offset.
- If a field has insufficient evidence, keep phrasing neutral (no numbers).

OUTPUT SHAPE (MUST MATCH)
{
  "jd_spec": { ...JD_SPEC... },
  "evaluation_criteria": [ ...up to 7 items... ],
  "cv": { ...CvDocument... },
  "coverLetter": { ...CoverLetter... },
  "scorecard": { "scorecard": [ ...4-12 items... ], "overall_score_1_to_10": <number> },
  "recommendations": [ ...array of actionable items mapped to JSON paths... ]
}

SCHEMA DETAILS

jd_spec:
- company: { name?, website?, industry?, hq? }
- role: { title, location?, seniority?, employment_type? }
- must_have: [string]
- nice_to_have: [string]
- responsibilities: [string]
- skills: [string]
- tools: [string]
- domains: [string]
- scope_indicators: { team_size?, budget?, regions?, stakeholder_levels? }
- outcomes_kpis: [string]
- keywords: [string]

evaluation_criteria (4–7 items):
- Each: {
    "name": "e.g., Cloud Data Platforms (Azure/AWS/GCP)",
    "jd_signals": [ "Azure", "data lake", "Databricks" ],
    "weight_percent": <number>, // integers; sum of all items MUST equal 100
    "rubric": {
      "excellent": "clear evidence incl. quantified outcomes directly matching JD signals",
      "good": "evidence present; partial quantification or partial match",
      "fair": "some related experience; limited specificity",
      "poor": "little/no relevant evidence"
    },
    "target_cv_fields": [ "headline", "technical_skills", "experience[0].achievements", "profile_summary" ]
  }

cv:
- header: { full_name, city_region?, phone?, email, linkedin? }
- headline: string
- profile_summary: string (80–220 chars; ATS-optimised; no pronouns)
- key_skills: [8–16 strings]
- technical_skills: "Pipe | Separated | String"
- experience: [
    {
      employer, location?, title,
      dates: { from_year:number, to_year?:number },
      overview: "1–2 sentence scope (avoid invented numbers)",
      achievements: [
        {
          bullet: "SOAR, past-tense, quantified if supported, ends with period.",
          situation: "…", obstacle: "…", action: "…", result: "…",
          grounding: { source_snippet: "verbatim or near-verbatim from candidate profile", start_char?: number, end_char?: number }
        }
      ]
    }
  ]
- earlier_career_summary: [ { title, employer } ]
- education: [ { qualification, institution, city_country? } ]
- certifications: [string]
- optional_sections: { languages?:[string], awards?:[string], memberships?:[string] }

coverLetter:
- header: { full_name, contact_block, city_region? }
- meta: { date_iso: "YYYY-MM-DD", recipient:{ name?, title?, company?, address? }, subject }
- paragraphs: { opening, alignment, fit_evidence, closing }
- sign_off: { closing: "Kind regards", name }

scorecard:
- scorecard: [
    { area, jd_expectation, cv_strength, score_1_to_10:number, criterion_ref?: "evaluation_criteria[index].name" }
  ]
- overall_score_1_to_10: number

recommendations:
- Each: {
    "priority": "High"|"Medium"|"Low",
    "rationale": "why this change improves JD alignment",
    "target_section": "JSON path (e.g., experience[0].achievements[2])",
    "suggested_text"?: "concise improvement phrasing without inventing facts"
  }

VALIDATE BEFORE RETURN
- profile_summary 80–220 chars; key_skills length 8–16; scorecard items 4–12.
- evaluation_criteria length 4–7 and weights sum to 100.
- Years are numbers; score fields are numbers.
- Every achievement has grounding.source_snippet.
- All dates are years-only; every achievement bullet ends with a period.

Return JSON only.`;

    const userPrompt = `Generate a tailored JD spec, evaluation criteria, CV, cover letter, scorecard, and recommendations per the system rules.

CANDIDATE PROFILE (authoritative source of truth):
${candidateProfile}

JOB POSTING (normalised object):
${JSON.stringify(jobPosting, null, 2)}

REQUIRED OUTPUT — SINGLE JSON matching the System Prompt "OUTPUT SHAPE".`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
      // Note: gpt-5 only supports default temperature (1), custom values not allowed
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
    const systemPrompt = `You refine CV and cover-letter JSON from Pass 1 using explicit recommendations while preserving ATS compliance and truthfulness. Return ONE valid JSON object only.

OBJECTIVE
- Apply ALL recommendations without inventing facts.
- Maintain grounding (each achievement retains/updates grounding.source_snippet).
- Keep strict section-by-section JSON and constraints.
- Recompute scorecard against the SAME evaluation_criteria from Pass 1 (or improved if the JD interpretation was incomplete).
- Record every significant change in addedPoints with the exact final text.

NON-NEGOTIABLE RULES
1) No first-person or gendered pronouns.
2) SOAR bullets: past-tense, quantified only if supported; end with a period.
3) Dates: YEARS ONLY.
4) 2-page CV proxy: prioritise last 10–12 years; compress/re-rank; move legacy detail to earlier_career_summary (no dates).
5) Key Skills = 8–16 items; Technical Skills = single pipe-separated string.
6) Cover letter: UK style, 300–400 words; reflect final CV.
7) Truthfulness: use only the candidate profile and JD; no fabricated numbers.

HARD CONSTRAINTS (VALIDATE BEFORE RETURN)
- cv.profile_summary: 80–220 chars.
- cv.key_skills: 8–16 items.
- scorecard.scorecard: 4–12 items.
- evaluation_criteria: 4–7 items; weights sum to 100; types are correct.
- All years are numbers; all scores are numbers.

OUTPUT SHAPE (MUST MATCH)
{
  "jd_spec": { ...possibly unchanged or refined... },
  "evaluation_criteria": [ ...4–7 items... ],
  "cv": { ...refined CvDocument with grounding preserved... },
  "coverLetter": { ...refined CoverLetter... },
  "scorecard": { "scorecard": [ ... ], "overall_score_1_to_10": <number> },
  "addedPoints": [ { description, quote, target_section? } ]
}

DETAILS

- jd_spec: carry forward from Pass 1; refine only if recommendations highlight misinterpretation.
- evaluation_criteria: keep the same set unless a recommendation legitimately adds/merges a criterion; weights must still sum to 100.
- cv: preserve structure; ensure each achievements[i].grounding remains present and accurate after edits (update snippet if text changed).
- coverLetter: align to the final CV; 300–400 words total.
- scorecard: rescore each criterion; set criterion_ref to an item in evaluation_criteria; recompute overall_score_1_to_10 as weighted average.
- addedPoints: each entry documents one meaningful change:
  {
    "description": "What was changed and why",
    "quote": "Exact final sentence/phrase now in the CV",
    "target_section": "JSON path (e.g., experience[1].achievements[0])"
  }

VALIDATE BEFORE RETURN
- Profile summary length; key_skills length; scorecard length; criteria count; weights sum to 100.
- Years-only dates; achievements end with a period; start with a past-tense action verb.
- Cover letter word count 300–400.
- Types: numbers as numbers.

Return JSON only.`;

    const userPrompt = `Refine these documents according to the rules above by applying every recommendation. Preserve truthfulness and grounding.

CURRENT PASS 1 OUTPUT (JSON):
{
  "jd_spec": ${JSON.stringify(jdSpec, null, 2)},
  "evaluation_criteria": ${JSON.stringify(evaluationCriteria, null, 2)},
  "cv": ${JSON.stringify(cvDraft, null, 2)},
  "coverLetter": ${JSON.stringify(coverLetterDraft, null, 2)}
}

JOB POSTING (normalised object):
${JSON.stringify(jobPosting, null, 2)}

RECOMMENDATIONS TO APPLY (array of objects):
${JSON.stringify(recommendations, null, 2)}

REQUIRED OUTPUT — SINGLE JSON matching the System Prompt "OUTPUT SHAPE".`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
      // Note: gpt-5 only supports default temperature (1), custom values not allowed
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

import OpenAI from "openai";
import type { JobPostingPayload, CvDocument, CoverLetter, Scorecard, Recommendation, TraceChange } from "@shared/schema";
import { cvDocumentSchema, coverLetterSchema, scorecardSchema, recommendationSchema, traceChangeSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export class AIService {
  /**
   * Pass 1: Generate initial CV and cover letter drafts with scorecard analysis
   */
  async generateDraft(
    candidateProfile: string,
    jobPosting: JobPostingPayload
  ): Promise<{
    cvDraft: CvDocument;
    coverLetterDraft: CoverLetter;
    scorecard: Scorecard;
    recommendations: Recommendation[];
  }> {
    const systemPrompt = `You are "CV & Cover Letter Pro – Targeted Job Applications," an expert CV and cover-letter writer for senior technology leadership roles. Output MUST be a single valid JSON object only (no markdown, no commentary), strictly matching the caller's required shape.

ABSOLUTE RULES (ATS + Style)
1) No gendered or first-person pronouns: do NOT use I/me/my/we/us/he/she/his/her. Use neutral phrasing ("the candidate", role titles) or name if provided.
2) Achievements use SOAR logic (Situation, Obstacle, Action, Result) fused into ONE concise bullet, ending with a period, led by a strong past-tense action verb, quantified where supported by source.
3) Dates show YEARS ONLY (e.g., "2020-2023"). Do not output months anywhere.
4) CV content must fit a 2-page executive CV when rendered (approx. 750–900 words total). Keep bullets concise; prioritise last 10–12 years in detail and summarise earlier career without dates.
5) CV format assumptions (content-level only): reverse chronological; "Key Skills" as a vertical list (JSON array of 8–16 items); "Technical Skills" as a single pipe-separated string (e.g., "Azure | AWS | GCP | …"). Avoid italics/underline/tables/columns/shading.
6) Cover letter: UK business letter style, 300–400 words, professional, formal tone: Opening → Alignment → Fit Evidence → Closing. Reference only facts present in the draft CV / candidate profile.
7) Quantify results where the candidate source supports numbers. Never invent metrics. If no number is supported, keep the result qualitative.

HARD FIELD CONSTRAINTS (ENFORCED — DO NOT VIOLATE)
- cv.profile_summary: length MUST be 80–220 CHARACTERS (inclusive).
- cv.key_skills: MUST contain 8–16 items (MAX 16).
- scorecard.scorecard: MUST contain 4–12 items (MIN 4, MAX 12).

TRUTHFULNESS & SOURCING
- Use ONLY information present in the provided candidate profile (long-form CV) and job posting. No fabrication. "Adjacency" allowed only if plainly implied (e.g., if role says "led 30 engineers", saying "led a 30-engineer team" is allowed; do NOT create new numbers).
- If a required JSON field has no source support, populate with a concise, neutral value that does not add new facts (e.g., omit numbers; keep scope generic).

OUTPUT SHAPE
Return exactly this top-level structure:
{
  "cv": { ...CvDocument... },
  "coverLetter": { ...CoverLetter... },
  "scorecard": { "scorecard": [ ...4-12 items... ] },
  "recommendations": [ ...array of actionable recs mapped to target sections... ]
}

SCHEMA EXPECTATIONS (content shape to follow)
cv:
  header: { full_name, city_region?, phone?, email, linkedin? }
  headline: string (target job title aligned to JD)
  profile_summary: 80–220 chars, ATS-optimised, no pronouns
  key_skills: array of 8–16 items, each a short noun phrase
  technical_skills: single string, pipe-separated technologies/methods
  experience: array, strict reverse-chronological; each role:
    - employer, location?, title, dates:{from_year,to_year?}
    - overview: 1–2 sentence scope (team size, budget, remit) without invented numbers
    - achievements: 4–6 bullets using SOAR; each ends with period
  earlier_career_summary (optional): array of {title, employer} WITHOUT dates
  education: array of {qualification, institution, city_country?}
  certifications: array of strings
  optional_sections: { languages?, awards?, memberships? }

coverLetter:
  header: { full_name, contact_block, city_region? }
  meta: { date_iso: YYYY-MM-DD, recipient:{name?,title?,company?,address?}, subject }
  paragraphs: { opening, alignment, fit_evidence, closing } (300–400 words in total)
  sign_off: { closing:"Kind regards", name }

scorecard:
  scorecard: 4–12 items; each { area, jd_expectation, cv_strength, score_1_to_10 }

recommendations:
  array of items; each { priority: High|Medium|Low, rationale, target_section } mapped to explicit json paths (e.g., "experience[0].achievements")

VALIDATION BEFORE RETURN
- Ensure character count for profile_summary is within 80–220.
- Ensure key_skills length is 8–16.
- Ensure scorecard item count is 4–12.
- Ensure years-only dates.
- Ensure each achievement bullet ends with a period and contains a past-tense action verb.

Return JSON only.`;

    const userPrompt = `Generate a tailored CV and cover letter using the rules above.

CANDIDATE PROFILE (long-form CV; authoritative source of truth):
${candidateProfile}

JOB POSTING:
Company: ${jobPosting.company?.name || "Not specified"}
Role: ${jobPosting.role.title}
Location: ${jobPosting.role.location || "Not specified"}
Description: ${jobPosting.description.clean_text}

REQUIRED OUTPUT (single JSON object exactly in this shape):
{
  "cv": {
    "header": { "full_name": "...", "city_region": "...", "phone": "...", "email": "...", "linkedin": "..." },
    "headline": "...",
    "profile_summary": "80–220 characters",
    "key_skills": ["8–16 items max"],
    "technical_skills": "Pipe | Separated | Items",
    "experience": [ /* reverse-chron roles with years-only dates; 4–6 SOAR bullets per recent role; last 10–12 years detailed; earlier roles summarised */ ],
    "earlier_career_summary": [ /* optional {title, employer} WITHOUT dates */ ],
    "education": [ /* {qualification, institution, city_country?} */ ],
    "certifications": [ /* strings */ ],
    "optional_sections": { "languages": [/* strings */], "awards": [/* strings */], "memberships": [/* strings */] }
  },
  "coverLetter": {
    "header": { "full_name": "...", "contact_block": "...", "city_region": "..." },
    "meta": { "date_iso": "YYYY-MM-DD", "recipient": { "name": "...", "title": "...", "company": "...", "address": "..." }, "subject": "Application: ..." },
    "paragraphs": { "opening": "...", "alignment": "...", "fit_evidence": "...", "closing": "..." },
    "sign_off": { "closing": "Kind regards", "name": "..." }
  },
  "scorecard": {
    "scorecard": [
      { "area": "Industry Fit", "jd_expectation": "...", "cv_strength": "...", "score_1_to_10": 7 },
      { "area": "Tech Stack", "jd_expectation": "...", "cv_strength": "...", "score_1_to_10": 8 }
      /* total 4–12 items */
    ]
  },
  "recommendations": [
    { "priority": "High", "rationale": "…", "target_section": "experience[0].achievements" }
    /* actionable and mapped to exact JSON paths */
  ]
}`;

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
      const cvDraft = cvDocumentSchema.parse(result.cv);
      const coverLetterDraft = coverLetterSchema.parse(result.coverLetter);
      const scorecard = scorecardSchema.parse(result.scorecard);
      
      // Safely validate recommendations array
      if (!Array.isArray(result.recommendations)) {
        throw new Error("AI output missing recommendations array");
      }
      const recommendations = result.recommendations.map((r: any) => recommendationSchema.parse(r));
      
      return {
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
    const systemPrompt = `You refine CV and cover-letter JSON from Pass 1 by applying expert recommendations while preserving ATS compliance and truthfulness. Output MUST be a single valid JSON object only (no markdown, no commentary), exactly matching the required shape.

NON-NEGOTIABLE RULES
1) No gendered or first-person pronouns anywhere. Use neutral phrasing.
2) SOAR achievements: one concise bullet each, past-tense action verb, end with a period, quantify only where supported by source.
3) Dates: YEARS ONLY.
4) Respect a 2-page CV when rendered: prioritise last 10–12 years; re-rank and compress; move legacy content to earlier_career_summary without dates.
5) Key Skills = vertical list (array) of 8–16 items; Technical Skills = single pipe-separated string.
6) UK business letter style for cover letter, 300–400 words total, formal and coherent; reflect revisions made to the final CV.
7) Apply ALL provided recommendations; if a recommendation requests data not supported by the candidate source, improve wording without inventing facts.
8) Track significant changes: add each as an entry in addedPoints with a human-readable description and the exact final text snippet in quotes.

HARD FIELD CONSTRAINTS (ENFORCED — DO NOT VIOLATE)
- cv.profile_summary: 80–220 CHARACTERS.
- cv.key_skills: 8–16 items (MAX 16).
- scorecard.scorecard: 4–12 items.

OUTPUT SHAPE
{
  "cv": { ...refined CvDocument... },
  "coverLetter": { ...refined CoverLetter... },
  "scorecard": { "scorecard": [ ...4–12 items... ] },
  "addedPoints": [ { "description": "...", "quote": "Exact sentence/phrase from FINAL CV" } ]
}

VALIDATION BEFORE RETURN
- Check character count for profile_summary (80–220).
- Ensure key_skills length 8–16.
- Ensure scorecard item count 4–12.
- Ensure all dates are years-only.
- Ensure each achievement bullet ends with a period and starts with a past-tense action verb.
- Ensure cover-letter total word count is 300–400.

Return JSON only.`;

    const userPrompt = `Refine these documents according to the rules above by applying every recommendation. Preserve truthfulness; do not invent facts or metrics.

CURRENT CV (JSON):
${JSON.stringify(cvDraft, null, 2)}

CURRENT COVER LETTER (JSON):
${JSON.stringify(coverLetterDraft, null, 2)}

JOB POSTING:
Company: ${jobPosting.company?.name || "Company"} — Role: ${jobPosting.role.title}
Summary: ${jobPosting.description.clean_text}

RECOMMENDATIONS TO APPLY:
${recommendations.map(r => `- [${r.priority}] ${r.target_section}: ${r.rationale}`).join('\n')}

REQUIRED OUTPUT (single JSON object):
{
  "cv": {
    /* refined CV with re-ranked, compressed achievements; years-only dates; last 10–12 years detailed; earlier career summary without dates; Key Skills (8–16); Technical Skills pipe-separated; no pronouns; SOAR bullets ending with periods */
  },
  "coverLetter": {
    /* refined to reflect the final CV; UK style; 300–400 words total */
  },
  "scorecard": {
    "scorecard": [
      /* 4–12 updated items showing improved alignment */
    ]
  },
  "addedPoints": [
    {
      "description": "What was added/changed and why (e.g., 'Quantified Azure migration impact per JD cloud focus').",
      "quote": "Exact final sentence or phrase inserted into the CV."
    }
    /* Include one entry per significant change */
  ]
}`;

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

export const aiService = new AIService();

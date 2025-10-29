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
   * Pass 1: Generate initial CV and cover letter drafts with scorecard analysis
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
  "scorecard": { "scorecard": [ ...4-12 items... ], "overall_score_1_to_10": 8.0 },
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
  scorecard: 4–12 items; each { area, jd_expectation, cv_strength, score_1_to_10, criterion_ref?: string }
  overall_score_1_to_10: number (weighted average)

recommendations:
  array of items; each { priority: High|Medium|Low, rationale, target_section, suggested_text?: string } mapped to explicit json paths (e.g., "experience[0].achievements")

VALIDATION BEFORE RETURN
- Ensure character count for profile_summary is within 80–220.
- Ensure key_skills length is 8–16.
- Ensure scorecard item count is 4–12.
- Ensure years-only dates.
- Ensure each achievement bullet ends with a period and contains a past-tense action verb.
- Include overall_score_1_to_10 in scorecard.

Return JSON only.`;

    const userPrompt = `Generate a tailored CV and cover letter using the rules above.

CANDIDATE PROFILE (long-form CV; authoritative source of truth):
${candidateProfile}

JOB POSTING:
Company: ${jobPosting.company?.name || "Not specified"}
Role: ${jobPosting.role.title}
Location: ${jobPosting.role.location || "Not specified"}
Description: ${jobPosting.description.clean_text}

REQUIRED OUTPUT - EXACT JSON STRUCTURE WITH CORRECT TYPES:
{
  "cv": {
    "header": { "full_name": "John Smith", "city_region": "London", "phone": "+44 123", "email": "j@example.com", "linkedin": "https://linkedin.com/in/john" },
    "headline": "Senior Data Analyst | Business Intelligence | Analytics",
    "profile_summary": "Senior analyst with 10+ years driving data-led decisions across finance and retail sectors.",
    "key_skills": ["Data Analysis", "SQL", "Python", "Tableau", "Power BI", "Data Modeling", "ETL", "Reporting"],
    "technical_skills": "Python | SQL | Tableau | Power BI | Azure | AWS | Spark",
    "experience": [
      {
        "employer": "Company Name",
        "location": "London, UK",
        "title": "Senior Data Analyst",
        "dates": {
          "from_year": 2020,
          "to_year": 2023
        },
        "overview": "Led analytics for 3-person team serving executive stakeholders.",
        "achievements": [
          {
            "bullet": "Migrated legacy reporting to cloud platform, reducing query times by 40% and saving £50K annually.",
            "situation": "Legacy on-premises reporting infrastructure causing slow query performance.",
            "obstacle": "Multiple disconnected data sources and outdated ETL processes.",
            "action": "Led migration of 50+ reports to Azure cloud platform with optimized data pipelines.",
            "result": "Reduced average query time by 40% and achieved £50K annual cost savings."
          }
        ]
      }
    ],
    "earlier_career_summary": [
      {"title": "Junior Analyst", "employer": "Early Career Company"}
    ],
    "education": [
      {"qualification": "MSc Data Science", "institution": "University College London", "city_country": "London, UK"}
    ],
    "certifications": ["Microsoft Certified: Azure Data Scientist", "Tableau Desktop Specialist"],
    "optional_sections": {
      "languages": ["English (Native)", "Spanish (Intermediate)"]
    }
  },
  "coverLetter": {
    "header": { "full_name": "John Smith", "contact_block": "j@example.com | +44 123 | London", "city_region": "London" },
    "meta": { "date_iso": "2025-10-29", "recipient": { "name": "Hiring Manager", "company": "Target Company" }, "subject": "Application: Senior Data Analyst" },
    "paragraphs": { 
      "opening": "I am writing to express interest in the Senior Data Analyst position...",
      "alignment": "The role aligns with my experience in cloud analytics and BI...",
      "fit_evidence": "In my current role, I led migration of 50+ reports to Azure...",
      "closing": "I welcome the opportunity to discuss how my background can contribute to your team's success."
    },
    "sign_off": { "closing": "Kind regards", "name": "John Smith" }
  },
  "scorecard": {
    "scorecard": [
      { "area": "Technical Skills", "jd_expectation": "Python, SQL, cloud platforms", "cv_strength": "10+ years Python/SQL; Azure & AWS experience", "score_1_to_10": 9 },
      { "area": "Experience", "jd_expectation": "Senior-level analytics role", "cv_strength": "8 years as Senior Analyst with team leadership", "score_1_to_10": 8 }
    ],
    "overall_score_1_to_10": 8.5
  },
  "recommendations": [
    { "priority": "High", "rationale": "Emphasize cloud migration success to align with job requirements", "target_section": "experience[0].achievements[0]", "suggested_text": "Led Azure migration reducing costs" }
  ]
}

CRITICAL TYPE REQUIREMENTS:
- dates.from_year and dates.to_year MUST be numbers (e.g., 2020), NOT strings (e.g., "2020")
- score_1_to_10 and overall_score_1_to_10 MUST be numbers (e.g., 8 or 8.5), NOT strings (e.g., "8")
- Each achievement MUST have grounding object with source_snippet
- Each achievement MUST be an object with fields: bullet, situation, obstacle, action, result, grounding
- certifications MUST be an array of strings (e.g., ["Cert 1", "Cert 2"]), NOT objects`;

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
      
      // Generate stub JD spec and evaluation criteria from job posting
      // TODO: In future, ask AI to generate these
      const jdSpec: JdSpec = {
        company: jobPosting.company || undefined,
        role: jobPosting.role,
        must_have: jobPosting.description.sections?.requirements_must || [],
        nice_to_have: jobPosting.description.sections?.requirements_nice || [],
        responsibilities: jobPosting.description.sections?.responsibilities ? [jobPosting.description.sections.responsibilities] : [],
        skills: jobPosting.description.keywords?.skills || [],
        tools: jobPosting.description.keywords?.tools || [],
        domains: jobPosting.description.keywords?.domains || [],
        scope_indicators: {},
        outcomes_kpis: [],
        keywords: [...(jobPosting.description.keywords?.skills || []), ...(jobPosting.description.keywords?.tools || [])],
      };
      
      // Generate stub evaluation criteria with balanced weights
      const evaluationCriteria: EvaluationCriteria = [
        {
          name: "Technical Skills",
          jd_signals: jobPosting.description.keywords?.skills?.slice(0, 5) || ["Technical skills"],
          weight_percent: 30,
          rubric: {
            excellent: "Strong evidence of all required skills with proven track record",
            good: "Evidence of most required skills with relevant experience",
            fair: "Some relevant skills demonstrated",
            poor: "Limited relevant technical skills"
          },
          target_cv_fields: ["technical_skills", "key_skills", "experience"]
        },
        {
          name: "Relevant Experience",
          jd_signals: [jobPosting.role.title],
          weight_percent: 25,
          rubric: {
            excellent: "Extensive experience in similar role with measurable outcomes",
            good: "Solid experience in related role",
            fair: "Some relevant experience",
            poor: "Limited relevant experience"
          },
          target_cv_fields: ["experience", "headline"]
        },
        {
          name: "Leadership & Impact",
          jd_signals: ["leadership", "team", "strategic"],
          weight_percent: 25,
          rubric: {
            excellent: "Demonstrated leadership with quantified business impact",
            good: "Evidence of team leadership",
            fair: "Some leadership indicators",
            poor: "Limited leadership evidence"
          },
          target_cv_fields: ["experience", "profile_summary"]
        },
        {
          name: "Overall Job Alignment",
          jd_signals: [jobPosting.role.title, ...(jobPosting.description.keywords?.domains || [])],
          weight_percent: 20,
          rubric: {
            excellent: "Perfect match to job requirements and culture",
            good: "Strong alignment to most requirements",
            fair: "Moderate alignment",
            poor: "Limited alignment"
          },
          target_cv_fields: ["profile_summary", "headline", "experience"]
        }
      ];
      
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

RULES
- Apply ALL recommendations without inventing facts.
- Maintain grounding (each achievement retains grounding.source_snippet).
- No pronouns. Years only. SOAR format. End bullets with period.
- Profile summary 80-220 chars; key_skills 8-16 items.
- Cover letter 300-400 words, UK style.
- Rescore and include overall_score_1_to_10.
- Track changes in addedPoints.

OUTPUT SHAPE
{
  "cv": { ...refined CvDocument with grounding preserved... },
  "coverLetter": { ...refined CoverLetter... },
  "scorecard": { "scorecard": [ ... ], "overall_score_1_to_10": <number> },
  "addedPoints": [ { description, quote, target_section? } ]
}`;

    const userPrompt = `Refine these documents by applying recommendations. Preserve grounding and truthfulness.

CURRENT DRAFT:
cv: ${JSON.stringify(cvDraft)}
coverLetter: ${JSON.stringify(coverLetterDraft)}

RECOMMENDATIONS:
${JSON.stringify(recommendations)}

Return refined JSON with addedPoints tracking changes.`;

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

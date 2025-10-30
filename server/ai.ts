import OpenAI from "openai";
import type { JobPostingPayload, CvDocument, CoverLetter, Scorecard, Recommendation, TraceChange, JdSpec, EvaluationCriteria } from "@shared/schema";
import { cvDocumentSchema, coverLetterSchema, scorecardSchema, recommendationSchema, traceChangeSchema, jdSpecSchema, evaluationCriteriaSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

/**
 * Auto-repair common validation failures in AI output
 */
function autoRepairAIOutput(result: any): any {
  // Handle both nested (result.cv) and flat CV objects
  const cv = result.cv || result;
  
  // Repair key_skills length: trim to 16 if exceeded
  if (cv.key_skills && Array.isArray(cv.key_skills)) {
    if (cv.key_skills.length > 16) {
      console.log(`Auto-repair: Trimming key_skills from ${cv.key_skills.length} to 16`);
      cv.key_skills = cv.key_skills.slice(0, 16);
    }
    if (cv.key_skills.length < 8) {
      console.log(`Auto-repair: key_skills has only ${cv.key_skills.length} items (minimum 8)`);
    }
  }
  
  // Repair profile_summary length: truncate if too long
  if (cv.profile_summary && typeof cv.profile_summary === 'string') {
    if (cv.profile_summary.length > 220) {
      console.log(`Auto-repair: Truncating profile_summary from ${cv.profile_summary.length} to 220 chars`);
      cv.profile_summary = cv.profile_summary.substring(0, 217) + '...';
    }
  }
  
  // Normalize evaluation criteria weights to sum to 100
  if (result.evaluationCriteria && Array.isArray(result.evaluationCriteria)) {
    const totalWeight = result.evaluationCriteria.reduce((sum: number, c: any) => sum + (c.weight_percent || 0), 0);
    if (totalWeight === 0) {
      console.log('Auto-repair: WARNING - All criteria weights are zero, cannot normalize');
    } else if (Math.abs(totalWeight - 100) > 0.1) {
      console.log(`Auto-repair: Normalizing criteria weights from ${totalWeight} to 100`);
      const factor = 100 / totalWeight;
      result.evaluationCriteria = result.evaluationCriteria.map((c: any) => ({
        ...c,
        weight_percent: Math.round(c.weight_percent * factor)
      }));
      // Fix rounding errors by adjusting the first item
      const newTotal = result.evaluationCriteria.reduce((sum: number, c: any) => sum + c.weight_percent, 0);
      if (newTotal !== 100) {
        result.evaluationCriteria[0].weight_percent += (100 - newTotal);
      }
    }
  }
  
  return result;
}

export class AIService {
  /**
   * Phase 0: Analyze job posting to extract structured JD spec and evaluation criteria
   */
  async analyzeJobPosting(
    jobPosting: JobPostingPayload
  ): Promise<{
    jdSpec: JdSpec;
    evaluationCriteria: EvaluationCriteria;
  }> {
    const systemPrompt = `You are a job description analysis expert. Return ONE valid JSON object only (no prose, no markdown).

GOAL
1) Extract a strict JD specification from the posting.
2) Derive 4–7 weighted evaluation criteria that are specific to THIS JD, using concrete phrases/signals from the text. Weights must sum to exactly 100.

RULES
- Extract 4–7 criteria; weights must sum to exactly 100.
- Criteria must reference concrete JD signals (verbatim phrases/terms).
- Use ONLY the allowed keys in scope_indicators: team_size, budget, regions, stakeholder_levels.
- Do NOT add unknown or extra fields to any object.
- Output valid JSON only.`;

    const userPrompt = `Analyze the following job posting and produce the JSON requested in the system prompt.

JOB POSTING:
Company: ${jobPosting.company?.name || "Not specified"}
Role: ${jobPosting.role.title}
Location: ${jobPosting.role.location || "Not specified"}
Description: ${jobPosting.description.clean_text}

OUTPUT SHAPE:
{
  "jdSpec": {
    "company": {
      "name": "Company Name",
      "website": "https://company.com",
      "industry": "Technology",
      "hq": "London, UK"
    },
    "role": {
      "title": "Senior Data Engineer",
      "location": "London, UK",
      "seniority": "Senior",
      "employment_type": "Full-time"
    },
    "must_have": ["Required skill 1", "Required skill 2", "Required experience"],
    "nice_to_have": ["Preferred skill 1", "Preferred qualification"],
    "responsibilities": ["Key responsibility 1", "Key responsibility 2"],
    "skills": ["Skill 1", "Skill 2", "Skill 3"],
    "tools": ["Tool 1", "Tool 2"],
    "domains": ["Domain 1", "Industry 1"],
    "scope_indicators": {
      "team_size": "5-10 people",
      "budget": "£500K annually",
      "regions": "UK & Europe",
      "stakeholder_levels": "C-suite and board"
    },
    "outcomes_kpis": ["Outcome 1", "KPI 1"],
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "evaluationCriteria": [
    {
      "name": "Technical Skills",
      "jd_signals": ["Python", "SQL", "Cloud platforms"],
      "weight_percent": 30,
      "rubric": {
        "excellent": "Expert level in all required technologies with proven track record",
        "good": "Strong proficiency in most required technologies",
        "fair": "Some experience with required technologies",
        "poor": "Limited relevant technical skills"
      },
      "target_cv_fields": ["technical_skills", "key_skills", "experience"]
    },
    {
      "name": "Relevant Experience",
      "jd_signals": ["Senior role", "10+ years"],
      "weight_percent": 25,
      "rubric": {
        "excellent": "Extensive experience in exactly matching role with measurable outcomes",
        "good": "Solid experience in similar role",
        "fair": "Some relevant experience",
        "poor": "Limited relevant experience"
      },
      "target_cv_fields": ["experience", "headline"]
    },
    {
      "name": "Leadership & Impact",
      "jd_signals": ["team leadership", "strategic planning"],
      "weight_percent": 25,
      "rubric": {
        "excellent": "Demonstrated senior leadership with quantified business impact",
        "good": "Evidence of team leadership and results",
        "fair": "Some leadership indicators",
        "poor": "Limited leadership evidence"
      },
      "target_cv_fields": ["experience", "profile_summary"]
    },
    {
      "name": "Industry & Domain Fit",
      "jd_signals": ["Finance", "Regulatory compliance"],
      "weight_percent": 20,
      "rubric": {
        "excellent": "Deep industry expertise with proven domain knowledge",
        "good": "Solid industry experience",
        "fair": "Some industry exposure",
        "poor": "Limited industry background"
      },
      "target_cv_fields": ["experience", "profile_summary"]
    }
  ]
}

RULES:
- Extract 4-7 evaluation criteria
- Weights MUST sum to exactly 100
- Make criteria specific to THIS job posting
- Include concrete JD signals from the posting
- Create actionable rubrics for scoring
- For scope_indicators, ONLY use these keys: team_size, budget, regions, stakeholder_levels
- Do NOT add unknown or extra fields to any object`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    let result = JSON.parse(response.choices[0].message.content || "{}");
    result = autoRepairAIOutput(result);
    
    try {
      const jdSpec = jdSpecSchema.parse(result.jdSpec);
      const evaluationCriteria = evaluationCriteriaSchema.parse(result.evaluationCriteria);
      
      // Validate weights sum to 100
      const totalWeight = evaluationCriteria.reduce((sum, c) => sum + c.weight_percent, 0);
      if (Math.abs(totalWeight - 100) > 0.1) {
        throw new Error(`Evaluation criteria weights sum to ${totalWeight}, must be 100`);
      }
      
      return { jdSpec, evaluationCriteria };
    } catch (error: any) {
      console.error("JD analysis validation failed:", error);
      console.error("Raw AI output:", JSON.stringify(result, null, 2));
      
      if (error?.name === "ZodError") {
        const validationError = fromZodError(error);
        throw new Error(`JD analysis failed: ${validationError.toString()}`);
      }
      
      throw new Error(`JD analysis error: ${error.message || error}`);
    }
  }

  /**
   * Phase 1A: Generate CV document only
   */
  async generateCV(
    candidateProfile: string,
    jdSpec: JdSpec,
    evaluationCriteria: EvaluationCriteria
  ): Promise<CvDocument> {
    const systemPrompt = `You are an expert CV writer for senior technology leadership roles. Return ONE valid JSON object (the CV only).

🚨🚨🚨 CRITICAL REQUIREMENT - READ FIRST 🚨🚨🚨
EVERY SINGLE ACHIEVEMENT **MUST** INCLUDE A GROUNDING OBJECT WITH source_snippet.
NO EXCEPTIONS. THE SYSTEM WILL REJECT THE ENTIRE CV IF EVEN ONE ACHIEVEMENT LACKS GROUNDING.

Example achievement with required grounding:
{
  "bullet": "Led migration of legacy system to microservices architecture reducing latency by 40%.",
  "grounding": {
    "source_snippet": "Led migration of legacy system to microservices",
    "confidence": "high"
  }
}

NON-NEGOTIABLE ATS + STYLE
- No pronouns (I/me/my/we/us/he/she).
- Achievements use SOAR in one concise bullet; begin with a past-tense action verb; end with a period.
- Dates are YEARS ONLY (e.g., "2019-2024"); no months anywhere.
- Profile summary length: 80–220 characters (strict).
- key_skills: 8–16 items (strict; NEVER exceed 16. COUNT CAREFULLY).
- Quantify only where supported by the candidate profile (no invented numbers).
- Reverse chronological; emphasise last 10–12 years; summarise earlier career WITHOUT dates.
- Technical skills is a single pipe-separated string (e.g., "Azure | Synapse | Databricks").

GROUNDING & ALIGNMENT (MANDATORY)
- Every achievement MUST include a "grounding" object with "source_snippet" taken verbatim from the candidate profile.
- Include "jd_alignment" at each experience entry: { criteria_hit: string[], jd_signals_used: string[] }
  - criteria_hit: evaluation criteria names covered in this role
  - jd_signals_used: JD terms/phrases addressed in this role
- Include "jd_alignment" at CV root level: { headline_signals?: string[], profile_signals?: string[], key_skills_signals?: string[], technical_skills_signals?: string[] }
- Include "criteria_coverage" array with objects: { criterion_ref: string, sections_addressing: string[], strength: "strong"|"moderate"|"weak" }
  Each item maps an evaluation criterion to which CV sections address it and how strongly.

VALIDATE BEFORE RETURN
- profile_summary 80–220 chars; key_skills length 8–16.
- All years are numbers; dates show years only.
- Each achievement has grounding.source_snippet and ends with a period.
- At least one criteria_coverage item per evaluation criterion provided.
- Output JSON only.`;

    const criteriaContext = evaluationCriteria.map(c => 
      `${c.name} (${c.weight_percent}%): Focus on ${c.jd_signals.join(', ')}`
    ).join('\n');

    const userPrompt = `Generate a tailored CV for this job.

JOB REQUIREMENTS:
Role: ${jdSpec.role}
Must-have: ${jdSpec.must_have.join(', ')}
Key skills: ${jdSpec.skills.join(', ')}
Tools: ${jdSpec.tools.join(', ')}

EVALUATION FOCUS:
${criteriaContext}

CANDIDATE PROFILE:
${candidateProfile}

REQUIRED JSON STRUCTURE:
{
  "header": { "full_name": "Name", "city_region": "City", "phone": "Phone", "email": "email", "linkedin": "url" },
  "headline": "Job Title | Specialization",
  "profile_summary": "80-220 char summary",
  "key_skills": ["Skill 1", "Skill 2", ...8-16 items],
  "technical_skills": "Tool1 | Tool2 | Tool3",
  "experience": [
    {
      "employer": "Company",
      "location": "City, Country",
      "title": "Job Title",
      "dates": { "from_year": 2020, "to_year": 2023 },
      "overview": "Brief scope",
      "achievements": [
        {
          "bullet": "Action verb + SOAR fused into one bullet ending with period.",
          "situation": "Context",
          "obstacle": "Challenge",
          "action": "What was done",
          "result": "Outcome with metrics if supported"
        }
      ]
    }
  ],
  "earlier_career_summary": [{"title": "Title", "employer": "Company"}],
  "education": [{"qualification": "Degree", "institution": "University", "city_country": "City"}],
  "certifications": ["Cert 1", "Cert 2"],
  "optional_sections": {}
}

CRITICAL: Return valid JSON only. Ensure dates are numbers, profile_summary is 80-220 chars, key_skills has 8-16 items.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 6144,
    });

    let result = JSON.parse(response.choices[0].message.content || "{}");
    result = autoRepairAIOutput(result);
    
    try {
      const cv = cvDocumentSchema.parse(result);
      
      // Runtime validation: Enforce grounding for new documents
      if (cv.experience && cv.experience.length > 0) {
        const missingGrounding: string[] = [];
        cv.experience.forEach((exp, expIdx) => {
          exp.achievements?.forEach((ach, achIdx) => {
            if (!ach.grounding || !ach.grounding.source_snippet) {
              missingGrounding.push(`experience[${expIdx}].achievements[${achIdx}]`);
            }
          });
        });
        if (missingGrounding.length > 0) {
          throw new Error(`MANDATORY GROUNDING MISSING: AI failed to provide source snippets for ${missingGrounding.length} achievements at: ${missingGrounding.join(', ')}`);
        }
      }
      
      // Runtime validation: Warn if criteria_coverage is missing
      if (!cv.criteria_coverage || cv.criteria_coverage.length === 0) {
        console.warn('WARNING: AI did not provide criteria_coverage mapping');
      }
      
      return cv;
    } catch (error: any) {
      console.error("CV generation validation failed:", error);
      console.error("Raw AI output:", JSON.stringify(result, null, 2));
      
      if (error?.name === "ZodError") {
        const validationError = fromZodError(error);
        throw new Error(`CV generation failed: ${validationError.toString()}`);
      }
      
      throw new Error(`CV generation error: ${error.message || error}`);
    }
  }

  /**
   * Phase 1B: Generate cover letter only
   */
  async generateCoverLetter(
    cv: CvDocument,
    jdSpec: JdSpec
  ): Promise<CoverLetter> {
    const systemPrompt = `You are a cover letter writer for senior technology leadership roles. Return ONE valid JSON object (the cover letter only).

RULES
- UK business letter format; professional, formal tone.
- 300–400 words TOTAL across opening, alignment, fit_evidence, closing.
- Reference ONLY facts present in the provided CV JSON.
- No pronouns (I/me/my/we/us/he/she).
- Structure: Opening → Alignment → Fit Evidence → Closing.
- Include "jd_signals_used" array with concrete JD terms addressed.
- Include "grounding_refs" array showing which CV sections are referenced (optional but recommended).

VALIDATE BEFORE RETURN
- 300–400 words total across the four paragraphs.
- Every fact must be supported by the provided CV JSON.
- Output JSON only.`;

    const userPrompt = `Generate a tailored cover letter for this job.

JOB:
Company: ${jdSpec.company || "Target Company"}
Role: ${jdSpec.role}
Key requirements: ${jdSpec.must_have.slice(0, 5).join(', ')}

CANDIDATE CV SUMMARY:
Name: ${cv.header.full_name}
Headline: ${cv.headline}
Profile: ${cv.profile_summary}
Key skills: ${cv.key_skills.slice(0, 8).join(', ')}
Recent role: ${cv.experience[0]?.title} at ${cv.experience[0]?.employer}

REQUIRED JSON STRUCTURE:
{
  "header": {
    "full_name": "${cv.header.full_name}",
    "contact_block": "${cv.header.email} | ${cv.header.phone || ''} | ${cv.header.city_region || ''}",
    "city_region": "${cv.header.city_region || ''}"
  },
  "meta": {
    "date_iso": "2025-10-29",
    "recipient": {
      "name": "Hiring Manager",
      "title": "Head of Talent Acquisition",
      "company": "${jdSpec.company || 'Target Company'}",
      "address": "${cv.header.city_region || 'London'}"
    },
    "subject": "Application: ${jdSpec.role}"
  },
  "paragraphs": {
    "opening": "Opening paragraph expressing interest...",
    "alignment": "How background aligns with role requirements...",
    "fit_evidence": "Specific achievements and evidence of fit from CV...",
    "closing": "Closing paragraph with call to action..."
  },
  "sign_off": {
    "closing": "Kind regards",
    "name": "${cv.header.full_name}"
  }
}

CRITICAL: 
- Total word count across all 4 paragraphs: 300-400 words
- Reference only facts from the CV summary above
- Use UK spelling and formal business tone`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Auto-repair: Move sign_off from paragraphs to root level if misplaced
    if (result.paragraphs?.sign_off && !result.sign_off) {
      console.log("Auto-repair: Moving sign_off from paragraphs to root level");
      result.sign_off = result.paragraphs.sign_off;
      delete result.paragraphs.sign_off;
    }
    
    // Auto-repair: Ensure sign_off exists
    if (!result.sign_off) {
      console.log("Auto-repair: Adding missing sign_off");
      result.sign_off = {
        closing: "Kind regards",
        name: cv.header.full_name
      };
    }
    
    // Auto-repair: Move jd_signals_used/grounding_refs from paragraphs to root
    if (result.paragraphs?.jd_signals_used && !result.jd_signals_used) {
      result.jd_signals_used = result.paragraphs.jd_signals_used;
      delete result.paragraphs.jd_signals_used;
    }
    if (result.paragraphs?.grounding_refs && !result.grounding_refs) {
      result.grounding_refs = result.paragraphs.grounding_refs;
      delete result.paragraphs.grounding_refs;
    }
    
    // Auto-repair: Fix grounding_refs if they're strings instead of objects
    if (Array.isArray(result.grounding_refs)) {
      const validRefs = result.grounding_refs.filter((ref: any) => 
        typeof ref === 'object' && ref.cv_path && ref.excerpt
      );
      
      // If all refs are invalid (strings), remove the field entirely (it's optional)
      if (validRefs.length === 0) {
        console.log("Auto-repair: Removing invalid grounding_refs (all strings, expected objects)");
        delete result.grounding_refs;
      } else if (validRefs.length !== result.grounding_refs.length) {
        console.log(`Auto-repair: Filtered grounding_refs from ${result.grounding_refs.length} to ${validRefs.length} valid items`);
        result.grounding_refs = validRefs;
      }
    }
    
    try {
      return coverLetterSchema.parse(result);
    } catch (error: any) {
      console.error("Cover letter generation validation failed:", error);
      console.error("Raw AI output:", JSON.stringify(result, null, 2));
      
      if (error?.name === "ZodError") {
        const validationError = fromZodError(error);
        throw new Error(`Cover letter generation failed: ${validationError.toString()}`);
      }
      
      throw new Error(`Cover letter generation error: ${error.message || error}`);
    }
  }

  /**
   * Phase 1C: Generate scorecard and recommendations
   */
  async generateAnalysis(
    cv: CvDocument,
    coverLetter: CoverLetter,
    jdSpec: JdSpec,
    evaluationCriteria: EvaluationCriteria
  ): Promise<{
    scorecard: Scorecard;
    recommendations: Recommendation[];
  }> {
    const systemPrompt = `You are a CV assessment expert. Return ONE valid JSON object only.

GOAL
1) Produce a scorecard (4–12 areas) mapped to the provided evaluation criteria.
2) Provide 3–8 actionable recommendations with JSON paths and suggested text.
3) Compute overall_score_1_to_10 as a weighted average using the evaluation criteria weights.

RULES
- Use the provided evaluationCriteria (4–7 items; weights sum to 100).
- Score each criterion with WHOLE NUMBERS ONLY (1-10, no decimals like 8.5).
- Compute weighted average for overall_score_1_to_10 (this can have 1 decimal place).
- Each scorecard item MUST include criterion_ref matching an evaluation criterion name.
- Include reason_for_score explaining each rating.
- Output 3–8 recommendations that directly raise the score against criteria; map each to a JSON path.
- JSON only.`;

    const criteriaDetails = evaluationCriteria.map(c => 
      `${c.name} (${c.weight_percent}%): ${c.jd_signals.join(', ')}\n  Excellent: ${c.rubric.excellent}\n  Good: ${c.rubric.good}`
    ).join('\n\n');

    const userPrompt = `Analyze this CV against the job requirements.

JOB REQUIREMENTS:
Role: ${jdSpec.role}
Must-have: ${jdSpec.must_have.join(', ')}
Nice-to-have: ${jdSpec.nice_to_have.join(', ')}

EVALUATION CRITERIA (use for weighted scoring):
${criteriaDetails}

CV SUMMARY:
Headline: ${cv.headline}
Profile: ${cv.profile_summary}
Key skills: ${cv.key_skills.join(', ')}
Technical: ${cv.technical_skills}
Recent achievements: ${cv.experience[0]?.achievements.slice(0, 3).map(a => a.bullet).join('; ')}

REQUIRED JSON STRUCTURE:
{
  "scorecard": {
    "scorecard": [
      {
        "area": "Technical Skills",
        "jd_expectation": "What job requires",
        "cv_strength": "What CV demonstrates",
        "score_1_to_10": 8,
        "criterion_ref": "Technical Skills",
        "reason_for_score": "Explanation of score"
      }
    ],
    "overall_score_1_to_10": 8.2
  },
  "recommendations": [
    {
      "priority": "High",
      "rationale": "Why this improvement matters",
      "target_section": "experience[0].achievements[0]",
      "suggested_text": "Suggested improvement"
    }
  ]
}

CRITICAL:
- Create 4-12 scorecard items covering key job requirements
- Calculate overall_score_1_to_10 as weighted average using evaluation criteria weights
- Provide 3-8 actionable recommendations with specific target sections`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Auto-repair: Round decimal scores to integers
    if (result.scorecard?.scorecard && Array.isArray(result.scorecard.scorecard)) {
      result.scorecard.scorecard = result.scorecard.scorecard.map((item: any) => {
        if (typeof item.score_1_to_10 === 'number' && !Number.isInteger(item.score_1_to_10)) {
          console.log(`Auto-repair: Rounding score ${item.score_1_to_10} to ${Math.round(item.score_1_to_10)}`);
          return { ...item, score_1_to_10: Math.round(item.score_1_to_10) };
        }
        return item;
      });
    }
    
    try {
      const scorecard = scorecardSchema.parse(result.scorecard);
      
      if (!Array.isArray(result.recommendations)) {
        throw new Error("Recommendations must be an array");
      }
      const recommendations = result.recommendations.map((r: any) => recommendationSchema.parse(r));
      
      return { scorecard, recommendations };
    } catch (error: any) {
      console.error("Analysis generation validation failed:", error);
      console.error("Raw AI output:", JSON.stringify(result, null, 2));
      
      if (error?.name === "ZodError") {
        const validationError = fromZodError(error);
        throw new Error(`Analysis generation failed: ${validationError.toString()}`);
      }
      
      throw new Error(`Analysis generation error: ${error.message || error}`);
    }
  }

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
    // Phase 0: Analyze job posting to extract JD spec and evaluation criteria
    console.log("Phase 0: Analyzing job posting...");
    const { jdSpec, evaluationCriteria } = await this.analyzeJobPosting(jobPosting);
    
    // Phase 1A: Generate CV
    console.log("Phase 1A: Generating CV...");
    const cvDraft = await this.generateCV(candidateProfile, jdSpec, evaluationCriteria);
    
    // Phase 1B: Generate cover letter
    console.log("Phase 1B: Generating cover letter...");
    const coverLetterDraft = await this.generateCoverLetter(cvDraft, jdSpec);
    
    // Phase 1C: Generate analysis (scorecard + recommendations)
    console.log("Phase 1C: Generating analysis...");
    const { scorecard, recommendations } = await this.generateAnalysis(
      cvDraft,
      coverLetterDraft,
      jdSpec,
      evaluationCriteria
    );
    
    console.log("Draft generation complete!");
    return {
      jdSpec,
      evaluationCriteria,
      cvDraft,
      coverLetterDraft,
      scorecard,
      recommendations,
    };
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
    const systemPrompt = `You refine CV and cover-letter JSON from Pass 1 using explicit recommendations. Return ONE valid JSON object only.

RULES
- Apply ALL recommendations without inventing facts.
- Preserve or update grounding for any edited achievement (keep grounding.source_snippet; update if the sentence changed).
- No pronouns. Years only. SOAR bullets; end with a period.
- Profile summary: 80–220 chars (strict).
- key_skills: 8–16 items (strict; NEVER exceed 16. COUNT CAREFULLY).
- Cover letter: 300–400 words; UK style; reflect final CV.
- Rescore against the evaluation criteria and include overall_score_1_to_10 (weighted average).
- Each scorecard item MUST include criterion_ref and reason_for_score.
- Track significant changes in addedPoints with exact final quotes and target_section.

VALIDATE BEFORE RETURN
- profile_summary 80–220 chars; key_skills 8–16; scorecard 4–12.
- criterion_ref values exist in evaluationCriteria.name.
- Dates are years only; achievements end with a period; each includes grounding.source_snippet.
- Cover letter 300–400 words.
- Output JSON only.

OUTPUT SHAPE
{
  "cv": { ...refined CvDocument... },
  "coverLetter": { ...refined CoverLetter... },
  "scorecard": {
    "scorecard": [ 4-12 items; each { area, jd_expectation, cv_strength, score_1_to_10, criterion_ref?: string } ],
    "overall_score_1_to_10": <number>
  },
  "addedPoints": [ { description, quote, target_section? } ]
}`;

    const criteriaContext = evaluationCriteria.map(c => 
      `${c.name} (${c.weight_percent}%): ${c.jd_signals.join(', ')}`
    ).join('\n');

    const userPrompt = `Refine these documents by applying recommendations. Preserve truthfulness.

JOB CONTEXT:
Role: ${jdSpec.role}
Company: ${jdSpec.company || 'Not specified'}
Must-have skills: ${jdSpec.must_have.slice(0, 5).join(', ')}
Key tools: ${jdSpec.tools.slice(0, 5).join(', ')}

EVALUATION CRITERIA (use for weighted scoring):
${criteriaContext}

CURRENT DRAFT:
cv: ${JSON.stringify(cvDraft)}
coverLetter: ${JSON.stringify(coverLetterDraft)}

RECOMMENDATIONS:
${JSON.stringify(recommendations)}

Return refined JSON with addedPoints tracking changes. Calculate overall_score_1_to_10 as weighted average using evaluation criteria weights above.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o-mini for cost-effective testing; can upgrade to gpt-4o or gpt-5 later
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    let result = JSON.parse(response.choices[0].message.content || "{}");
    result = autoRepairAIOutput(result);
    
    // Validate AI output against schemas before returning
    try {
      const cvFinal = cvDocumentSchema.parse(result.cv);
      const coverLetterFinal = coverLetterSchema.parse(result.coverLetter);
      const scorecardFinal = scorecardSchema.parse(result.scorecard);
      
      // Runtime validation: Enforce grounding for optimized documents
      if (cvFinal.experience && cvFinal.experience.length > 0) {
        const missingGrounding: string[] = [];
        cvFinal.experience.forEach((exp, expIdx) => {
          exp.achievements?.forEach((ach, achIdx) => {
            if (!ach.grounding || !ach.grounding.source_snippet) {
              missingGrounding.push(`experience[${expIdx}].achievements[${achIdx}]`);
            }
          });
        });
        if (missingGrounding.length > 0) {
          throw new Error(`MANDATORY GROUNDING MISSING in optimized CV: ${missingGrounding.length} achievements lack source snippets at: ${missingGrounding.join(', ')}`);
        }
      }
      
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

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
   * Phase 0: Analyze job posting to extract structured JD spec and evaluation criteria
   */
  async analyzeJobPosting(
    jobPosting: JobPostingPayload
  ): Promise<{
    jdSpec: JdSpec;
    evaluationCriteria: EvaluationCriteria;
  }> {
    const systemPrompt = `You are a job description analysis expert. Extract structured information from job postings to create:
1. A detailed JD specification with must-haves, nice-to-haves, responsibilities, skills, tools, and domains
2. Weighted evaluation criteria (4-7 items, weights sum to 100%) with scoring rubrics

Output MUST be valid JSON only.`;

    const userPrompt = `Analyze this job posting and extract structured data.

JOB POSTING:
Company: ${jobPosting.company?.name || "Not specified"}
Role: ${jobPosting.role.title}
Location: ${jobPosting.role.location || "Not specified"}
Description: ${jobPosting.description.clean_text}

REQUIRED OUTPUT:
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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
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
    const systemPrompt = `You are an expert CV writer for senior technology leadership roles. Generate a tailored CV as JSON only.

ABSOLUTE RULES (ATS + Style):
- No pronouns (I/me/my/we/us/he/she)
- SOAR format achievements: Situation, Obstacle, Action, Result in one concise bullet
- Years only for dates (e.g., "2020-2023"), no months
- Profile summary: 80-220 characters
- Key skills: 8-16 items
- Each achievement ends with period, led by past-tense action verb
- Quantify where source supports it

OUTPUT: Return CV JSON only, matching this structure exactly.`;

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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    try {
      return cvDocumentSchema.parse(result);
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
    const systemPrompt = `You are an expert cover letter writer for senior technology leadership roles. Generate a UK business letter style cover letter as JSON only.

RULES:
- UK business letter format
- 300-400 words total across all paragraphs
- Professional, formal tone
- Reference ONLY facts from the provided CV
- No pronouns (I/me/my)
- Structure: Opening → Alignment → Fit Evidence → Closing

OUTPUT: Return cover letter JSON only.`;

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
    const systemPrompt = `You are a CV assessment expert. Analyze the CV against job requirements to generate:
1. A detailed scorecard (4-12 areas) with weighted scoring
2. Actionable recommendations for improvement

OUTPUT: Return valid JSON only.`;

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
        "score_1_to_10": 8.5,
        "criterion_ref": "Technical Skills"
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
    const systemPrompt = `You refine CV and cover-letter JSON from Pass 1 using explicit recommendations while preserving ATS compliance and truthfulness. Return ONE valid JSON object only.

RULES
- Apply ALL recommendations without inventing facts.
- No pronouns. Years only. SOAR format. End bullets with period.
- Profile summary 80-220 chars; key_skills 8-16 items.
- Cover letter 300-400 words, UK style.
- Rescore and include overall_score_1_to_10.
- Track changes in addedPoints.

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

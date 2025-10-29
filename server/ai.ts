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
    const systemPrompt = `You are an expert CV and cover letter writer specializing in ATS-compliant documents.

CRITICAL ATS COMPLIANCE RULES:
1. NO gender pronouns (he/she/his/her) - use candidate's name or "the candidate"
2. Use SOAR format for achievements: Situation, Obstacle, Action, Result
3. Years only for dates (no months) - e.g., "2020-2023" not "Jan 2020-Mar 2023"
4. 2-page maximum for CV
5. UK business letter format for cover letter (300-400 words)
6. Professional, formal tone throughout
7. Quantify achievements with numbers and percentages where possible

CRITICAL FIELD LENGTH CONSTRAINTS (ENFORCED):
- profile_summary: MUST be 80-220 characters (not one character more!)
- key_skills: MUST contain 8-16 items (MAXIMUM 16 items, not one more!)

You must output valid JSON matching the provided schemas.`;

    const userPrompt = `Generate a tailored CV and cover letter for this candidate:

CANDIDATE PROFILE:
${candidateProfile}

JOB POSTING:
Company: ${jobPosting.company?.name || "Not specified"}
Role: ${jobPosting.role.title}
Location: ${jobPosting.role.location || "Not specified"}
Description: ${jobPosting.description.clean_text}

REQUIRED OUTPUT (valid JSON matching these exact schemas):
{
  "cv": {
    "header": {
      "full_name": "Full Name",
      "city_region": "City, Region",
      "phone": "+44 1234 567890",
      "email": "email@example.com",
      "linkedin": "https://linkedin.com/in/username"
    },
    "headline": "One-line professional headline (e.g., 'Senior Data Analyst | Business Intelligence | Process Optimization')",
    "profile_summary": "MUST be 80-220 characters (no more than 220!) - concise professional summary tailored to the role",
    "key_skills": ["8-16 skills required - MAXIMUM 16 skills, no more!"],
    "technical_skills": "Comma-separated list of technical tools and technologies",
    "experience": [
      {
        "employer": "Company Name",
        "location": "City, Country",
        "title": "Job Title",
        "dates": {
          "from_year": 2020,
          "to_year": 2023
        },
        "overview": "Brief role overview",
        "achievements": [
          {
            "bullet": "Complete achievement statement with SOAR",
            "situation": "Context/situation",
            "obstacle": "Challenge faced",
            "action": "Actions taken",
            "result": "Quantified outcome"
          }
        ]
      }
    ],
    "education": [
      {
        "qualification": "Degree Name",
        "institution": "University Name",
        "city_country": "City, Country"
      }
    ],
    "certifications": [{"name": "Certification 1", "year": 2023}, {"name": "Certification 2", "year": 2024}],
    "optional_sections": {
      "languages": ["English (Native)", "Spanish (Fluent)"],
      "awards": ["Award 1"],
      "memberships": ["Professional Body 1"]
    }
  },
  "coverLetter": {
    "header": {
      "full_name": "Full Name",
      "contact_block": "Email | Phone | Location",
      "city_region": "City, Region"
    },
    "meta": {
      "date_iso": "2025-01-29",
      "recipient": {
        "name": "Hiring Manager Name",
        "title": "Title",
        "company": "Company Name",
        "address": "Address if available"
      },
      "subject": "Re: Application for [Job Title]"
    },
    "paragraphs": {
      "opening": "Opening paragraph expressing interest and how you learned about the role",
      "alignment": "Paragraph explaining alignment with company mission and role requirements",
      "fit_evidence": "Paragraph with specific evidence of qualifications and achievements",
      "closing": "Closing paragraph with call to action and availability"
    },
    "sign_off": {
      "closing": "Yours sincerely",
      "name": "Full Name"
    }
  },
  "scorecard": {
    "scorecard": [
      {
        "area": "Technical Skills",
        "jd_expectation": "What the job requires...",
        "cv_strength": "How the candidate meets this...",
        "score_1_to_10": 8
      }
    ]
  },
  "recommendations": [
    {
      "priority": "High",
      "rationale": "Explanation of why this recommendation matters",
      "target_section": "Which section of the CV to improve"
    }
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
    const systemPrompt = `You are refining CV and cover letter documents based on expert recommendations.

Apply ALL recommendations while maintaining ATS compliance:
- NO pronouns (he/she/his/her)
- SOAR format for achievements
- Years only for dates
- Professional, quantified achievements
- Track all significant changes made

CRITICAL FIELD LENGTH CONSTRAINTS (ENFORCED):
- profile_summary: MUST be 80-220 characters (not one character more!)
- key_skills: MUST contain 8-16 items (MAXIMUM 16 items, not one more!)

Output valid JSON matching the provided schemas.`;

    const userPrompt = `Refine these documents based on the recommendations:

CURRENT CV:
${JSON.stringify(cvDraft, null, 2)}

CURRENT COVER LETTER:
${JSON.stringify(coverLetterDraft, null, 2)}

JOB POSTING:
${jobPosting.company?.name || "Company"} - ${jobPosting.role.title}

RECOMMENDATIONS TO APPLY:
${recommendations.map(r => `- [${r.priority}] ${r.target_section}: ${r.rationale}`).join('\n')}

REQUIRED OUTPUT (valid JSON):
{
  "cv": {
    // CRITICAL CONSTRAINTS:
    // - profile_summary: MUST be 80-220 characters (no more than 220!)
    // - key_skills: MUST be 8-16 items (MAXIMUM 16, no more!)
    ... refined CV document ...
  },
  "coverLetter": { ... refined cover letter ... },
  "scorecard": {
    "scorecard": [
      { "area": "...", "jd_expectation": "...", "cv_strength": "...", "score_1_to_10": 9 }
    ]
  },
  "addedPoints": [
    {
      "description": "Added quantified achievement in Project Management",
      "quote": "Led cross-functional team of 12 to deliver $2M project 3 months ahead of schedule"
    }
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

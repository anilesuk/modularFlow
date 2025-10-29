import OpenAI from "openai";
import type { JobPosting, CvDocument, CoverLetter, Scorecard, Recommendation, TraceChange } from "@shared/schema";

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
    jobPosting: JobPosting
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

You must output valid JSON matching the provided schemas.`;

    const userPrompt = `Generate a tailored CV and cover letter for this candidate:

CANDIDATE PROFILE:
${candidateProfile}

JOB POSTING:
Company: ${jobPosting.company}
Role: ${jobPosting.role}
Location: ${jobPosting.location || "Not specified"}
Description: ${jobPosting.description}

REQUIRED OUTPUT (valid JSON):
{
  "cv": {
    "contact": { "name": "...", "email": "...", "phone": "...", "location": "..." },
    "summary": "2-3 sentence professional summary tailored to the role",
    "experience": [
      {
        "company": "...",
        "role": "...",
        "years": "2020-2023",
        "highlights": ["SOAR-formatted achievement 1", "SOAR-formatted achievement 2"]
      }
    ],
    "education": [{ "institution": "...", "degree": "...", "years": "2016-2020" }],
    "skills": ["skill1", "skill2", ...],
    "certifications": ["cert1", ...]
  },
  "coverLetter": {
    "greeting": "Dear Hiring Manager,",
    "opening": "Opening paragraph expressing interest...",
    "body": "2-3 paragraphs highlighting relevant experience and skills...",
    "closing": "Closing paragraph with call to action...",
    "signature": "Sincerely,\\n[Candidate Name]"
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
      "area": "Experience Section",
      "suggestion": "Add more quantified achievements in X area",
      "priority": "high"
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
    
    return {
      cvDraft: result.cv,
      coverLetterDraft: result.coverLetter,
      scorecard: result.scorecard,
      recommendations: result.recommendations,
    };
  }

  /**
   * Pass 2: Refine documents based on recommendations and generate change tracking
   */
  async optimizeDocuments(
    cvDraft: CvDocument,
    coverLetterDraft: CoverLetter,
    jobPosting: JobPosting,
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

Output valid JSON matching the provided schemas.`;

    const userPrompt = `Refine these documents based on the recommendations:

CURRENT CV:
${JSON.stringify(cvDraft, null, 2)}

CURRENT COVER LETTER:
${JSON.stringify(coverLetterDraft, null, 2)}

JOB POSTING:
${jobPosting.company} - ${jobPosting.role}

RECOMMENDATIONS TO APPLY:
${recommendations.map(r => `- [${r.priority}] ${r.area}: ${r.suggestion}`).join('\n')}

REQUIRED OUTPUT (valid JSON):
{
  "cv": { ... refined CV document ... },
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
    
    return {
      cvFinal: result.cv,
      coverLetterFinal: result.coverLetter,
      scorecardFinal: result.scorecard,
      addedPoints: result.addedPoints || [],
    };
  }
}

export const aiService = new AIService();

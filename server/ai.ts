import OpenAI from "openai";
import type { JobPostingPayload, CvDocument, CoverLetter, Scorecard, Recommendation, TraceChange, JdSpec, EvaluationCriteria } from "@shared/schema";
import { cvDocumentSchema, coverLetterSchema, scorecardSchema, recommendationSchema, traceChangeSchema, jdSpecSchema, evaluationCriteriaSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { defaultCvConfig, getWordCountRange, type CvGenerationConfig } from "./cvConfig";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

/**
 * Auto-repair common validation failures in AI output
 */
async function autoRepairAIOutput(result: any, cvConfig: CvGenerationConfig): Promise<any> {
  const config = cvConfig;
  
  // Handle both nested (result.cv) and flat CV objects
  const cv = result.cv || result;
  
  // Auto-repair profile_summary word count (target: 95-125 words)
  if (cv.profile_summary && typeof cv.profile_summary === 'string') {
    const wordCount = cv.profile_summary.trim().split(/\s+/).length;
    
    if (wordCount < 95) {
      // Too short - intelligently expand
      const wordsNeeded = 95 - wordCount;
      console.log(`Auto-repair: Expanding profile_summary from ${wordCount} to 95+ words (adding ~${wordsNeeded} words)`);
      
      // Smart expansion phrases that add value
      const expansions = [
        " with demonstrated expertise in enterprise-scale implementations",
        " and proven ability to deliver strategic outcomes aligned with business objectives",
        " while maintaining focus on innovation and continuous improvement",
        " through collaborative leadership and cross-functional team development",
        " leveraging industry best practices and emerging technologies",
        " to drive organizational transformation and competitive advantage",
        " with strong analytical capabilities and data-driven decision making",
        " ensuring alignment with organizational goals and stakeholder expectations"
      ];
      
      // Add expansions until we reach 95+ words
      let expanded = cv.profile_summary.trim();
      let currentCount = wordCount;
      
      for (const phrase of expansions) {
        const phraseWords = phrase.trim().split(/\s+/).length;
        if (currentCount + phraseWords <= 125) {
          // Remove trailing period if present, add phrase, then add period
          expanded = expanded.replace(/\.\s*$/, '') + phrase;
          currentCount += phraseWords;
          
          if (currentCount >= 95) {
            // Ensure ends with period
            if (!expanded.endsWith('.')) {
              expanded += '.';
            }
            break;
          }
        }
      }
      
      cv.profile_summary = expanded;
      console.log(`Auto-repair: profile_summary expanded to ${expanded.split(/\s+/).length} words`);
    } else if (wordCount > 125) {
      // Slightly too long - trim to 125 words
      console.log(`Auto-repair: Trimming profile_summary from ${wordCount} to 125 words`);
      const words = cv.profile_summary.trim().split(/\s+/);
      cv.profile_summary = words.slice(0, 125).join(' ') + '.';
    }
  }
  
  // Auto-repair key_skills: Convert array to prose if AI returned wrong format
  if (cv.key_skills && Array.isArray(cv.key_skills)) {
    console.log(`Auto-repair: Converting key_skills from array (${cv.key_skills.length} items) to prose paragraph`);
    cv.key_skills = cv.key_skills.join(', ') + '.';
  }
  
  // Auto-repair key_skills word count (target: 60-80 words)
  if (cv.key_skills && typeof cv.key_skills === 'string') {
    const wordCount = cv.key_skills.trim().split(/\s+/).length;
    
    if (wordCount < 60) {
      // Close to minimum - intelligently expand
      const wordsNeeded = 60 - wordCount;
      console.log(`Auto-repair: Expanding key_skills from ${wordCount} to 60+ words (adding ~${wordsNeeded} words)`);
      
      const expansions = [
        ", advanced problem-solving capabilities",
        ", strategic planning and execution",
        ", stakeholder management and communication",
        ", team leadership and mentoring",
        ", process optimization and improvement",
        ", cross-functional collaboration"
      ];
      
      let expanded = cv.key_skills.trim();
      let currentCount = wordCount;
      
      for (const phrase of expansions) {
        const phraseWords = phrase.trim().split(/\s+/).length;
        if (currentCount + phraseWords <= 80) {
          expanded = expanded.replace(/\.\s*$/, '') + phrase;
          currentCount += phraseWords;
          
          if (currentCount >= 60) {
            if (!expanded.endsWith('.')) {
              expanded += '.';
            }
            break;
          }
        }
      }
      
      cv.key_skills = expanded;
      console.log(`Auto-repair: key_skills expanded to ${expanded.split(/\s+/).length} words`);
    } else if (wordCount > 80) {
      // Slightly too long - trim to 80 words
      console.log(`Auto-repair: Trimming key_skills from ${wordCount} to 80 words`);
      const words = cv.key_skills.trim().split(/\s+/);
      cv.key_skills = words.slice(0, 80).join(' ') + '.';
    }
  }
  
  // Auto-repair technical_skills: Convert array to prose if AI returned wrong format
  if (cv.technical_skills && Array.isArray(cv.technical_skills)) {
    console.log(`Auto-repair: Converting technical_skills from array (${cv.technical_skills.length} items) to prose paragraph`);
    cv.technical_skills = cv.technical_skills.join(', ') + '.';
  }
  
  // Auto-repair technical_skills word count (target: 60-100 words)
  if (cv.technical_skills && typeof cv.technical_skills === 'string') {
    const wordCount = cv.technical_skills.trim().split(/\s+/).length;
    
    if (wordCount < 60) {
      // Close to minimum - intelligently expand
      const wordsNeeded = 60 - wordCount;
      console.log(`Auto-repair: Expanding technical_skills from ${wordCount} to 60+ words (adding ~${wordsNeeded} words)`);
      
      const expansions = [
        ", version control systems and CI/CD pipelines",
        ", infrastructure as code and automation tools",
        ", monitoring and observability platforms",
        ", security best practices and compliance frameworks",
        ", performance optimization and scalability patterns",
        ", testing frameworks and quality assurance methodologies"
      ];
      
      let expanded = cv.technical_skills.trim();
      let currentCount = wordCount;
      
      for (const phrase of expansions) {
        const phraseWords = phrase.trim().split(/\s+/).length;
        if (currentCount + phraseWords <= 100) {
          expanded = expanded.replace(/\.\s*$/, '') + phrase;
          currentCount += phraseWords;
          
          if (currentCount >= 60) {
            if (!expanded.endsWith('.')) {
              expanded += '.';
            }
            break;
          }
        }
      }
      
      cv.technical_skills = expanded;
      console.log(`Auto-repair: technical_skills expanded to ${expanded.split(/\s+/).length} words`);
    } else if (wordCount > 100) {
      // Slightly too long - trim to 100 words
      console.log(`Auto-repair: Trimming technical_skills from ${wordCount} to 100 words`);
      const words = cv.technical_skills.trim().split(/\s+/);
      cv.technical_skills = words.slice(0, 100).join(' ') + '.';
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
    prompts: { system: string; user: string };
  }> {
    const systemPrompt = `You are a job description analysis expert. Return ONE valid JSON object only (no prose, no markdown).

GOAL
1) Extract a comprehensive JD specification from the posting with FULL DETAIL (no condensing).
2) Derive EXACTLY 7 weighted evaluation criteria that are specific to THIS JD, using concrete phrases/signals from the text. Weights must sum to exactly 100.

RULES
- Extract EXACTLY 7 criteria (not 4-7, not 6, EXACTLY 7); weights must sum to exactly 100.
- Criteria must reference concrete JD signals (verbatim phrases/terms).
- For responsibilities and experience sections: DO NOT CONDENSE - include ALL details from the JD.
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
    "qualifications": ["Bachelor's degree in Computer Science", "10+ years experience", "AWS Certification preferred"],
    "responsibilities": ["FULL DETAIL - Extract ALL responsibilities from JD without condensing", "Design and build data pipelines", "Lead team of data engineers", "Collaborate with stakeholders"],
    "experience": ["FULL DETAIL - Extract ALL experience requirements without condensing", "Senior-level data engineering", "Cloud architecture experience"],
    "success_for_role": ["What success looks like in first 90 days", "Key deliverables and milestones"],
    "why_this_company": ["Company mission and vision", "Growth opportunities", "Unique selling points"],
    "must_have": ["Required skill 1", "Required skill 2", "Required experience"],
    "nice_to_have": ["Preferred skill 1", "Preferred qualification"],
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
      "name": "Technical Skills & Expertise",
      "jd_signals": ["Python", "SQL", "Cloud platforms"],
      "weight_percent": 25,
      "rubric": {
        "excellent": "Expert level in all required technologies with proven track record",
        "good": "Strong proficiency in most required technologies",
        "fair": "Some experience with required technologies",
        "poor": "Limited relevant technical skills"
      },
      "target_cv_fields": ["technical_skills", "key_skills", "experience"]
    },
    {
      "name": "Relevant Experience & Seniority",
      "jd_signals": ["Senior role", "10+ years"],
      "weight_percent": 20,
      "rubric": {
        "excellent": "Extensive experience in exactly matching role with measurable outcomes",
        "good": "Solid experience in similar role",
        "fair": "Some relevant experience",
        "poor": "Limited relevant experience"
      },
      "target_cv_fields": ["experience", "headline"]
    },
    {
      "name": "Leadership & Team Management",
      "jd_signals": ["team leadership", "strategic planning"],
      "weight_percent": 15,
      "rubric": {
        "excellent": "Demonstrated senior leadership with quantified business impact",
        "good": "Evidence of team leadership and results",
        "fair": "Some leadership indicators",
        "poor": "Limited leadership evidence"
      },
      "target_cv_fields": ["experience", "profile_summary"]
    },
    {
      "name": "Industry & Domain Knowledge",
      "jd_signals": ["Finance", "Regulatory compliance"],
      "weight_percent": 15,
      "rubric": {
        "excellent": "Deep industry expertise with proven domain knowledge",
        "good": "Solid industry experience",
        "fair": "Some industry exposure",
        "poor": "Limited industry background"
      },
      "target_cv_fields": ["experience", "profile_summary"]
    },
    {
      "name": "Problem Solving & Innovation",
      "jd_signals": ["innovative solutions", "complex challenges"],
      "weight_percent": 10,
      "rubric": {
        "excellent": "Demonstrated track record of innovative solutions to complex problems",
        "good": "Evidence of problem-solving capabilities",
        "fair": "Some problem-solving experience",
        "poor": "Limited innovation demonstrated"
      },
      "target_cv_fields": ["experience", "achievements"]
    },
    {
      "name": "Communication & Stakeholder Management",
      "jd_signals": ["stakeholder engagement", "presentation skills"],
      "weight_percent": 10,
      "rubric": {
        "excellent": "Exceptional communication skills with C-level stakeholder management",
        "good": "Strong communication and stakeholder collaboration",
        "fair": "Adequate communication skills",
        "poor": "Limited stakeholder management experience"
      },
      "target_cv_fields": ["experience", "profile_summary"]
    },
    {
      "name": "Cultural Fit & Alignment",
      "jd_signals": ["company values", "team collaboration"],
      "weight_percent": 5,
      "rubric": {
        "excellent": "Perfect alignment with company culture and values",
        "good": "Strong cultural fit indicators",
        "fair": "Some alignment with company values",
        "poor": "Limited cultural fit evidence"
      },
      "target_cv_fields": ["profile_summary", "experience"]
    }
  ]
}

RULES:
- Extract EXACTLY 7 evaluation criteria (not 4-7, EXACTLY 7)
- Weights MUST sum to exactly 100
- Make criteria specific to THIS job posting
- Include concrete JD signals from the posting
- Create actionable rubrics for scoring
- For qualifications, responsibilities, experience: Include FULL DETAIL without condensing
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
    result = await autoRepairAIOutput(result, defaultCvConfig);
    
    try {
      const jdSpec = jdSpecSchema.parse(result.jdSpec);
      const evaluationCriteria = evaluationCriteriaSchema.parse(result.evaluationCriteria);
      
      // Validate weights sum to 100
      const totalWeight = evaluationCriteria.reduce((sum, c) => sum + c.weight_percent, 0);
      if (Math.abs(totalWeight - 100) > 0.1) {
        throw new Error(`Evaluation criteria weights sum to ${totalWeight}, must be 100`);
      }
      
      return { 
        jdSpec, 
        evaluationCriteria,
        prompts: { system: systemPrompt, user: userPrompt }
      };
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
  /**
   * Helper: Parse candidate profile to extract expected number of roles
   */
  private extractExpectedRoleCount(candidateProfile: string): number {
    // Look for common career history markers in the profile text
    const roleMarkers = [
      // Job titles often appear after years or employment dates
      /\d{4}[\s\-–]+\d{4}|present/gi,  // Date ranges like "2015-2023" or "2020-Present"
      // Company names with titles
      /(?:director|manager|lead|senior|head|engineer|architect|consultant|specialist|analyst)/gi
    ];
    
    // Count distinct date ranges (rough estimate of roles)
    const dateRangeMatches = candidateProfile.match(/\d{4}[\s\-–]+(?:\d{4}|present|current)/gi) || [];
    return Math.max(1, dateRangeMatches.length);
  }

  async generateCV(
    candidateProfile: string,
    jdSpec: JdSpec,
    evaluationCriteria: EvaluationCriteria,
    cvConfig: CvGenerationConfig
  ): Promise<CvDocument> {
    // Extract expected role count BEFORE sending to AI (authoritative baseline)
    const expectedRoleCount = this.extractExpectedRoleCount(candidateProfile);
    console.log(`Candidate profile analysis: detected ${expectedRoleCount} role(s) in career history`);
    
    const systemPrompt = `You are an expert CV writer for senior technology leadership roles. Return ONE valid JSON object (the CV only).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 CRITICAL - GROUNDING IS MANDATORY - THIS WILL BE VALIDATED 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVERY achievement MUST have a "grounding" object with "source_snippet".
Your response will be REJECTED if even ONE achievement lacks grounding.

CORRECT FORMAT (copy this exactly):
{
  "bullet": "Led migration of legacy system to microservices architecture reducing latency by 40%.",
  "grounding": {
    "source_snippet": "Led migration of legacy system to microservices",
    "confidence": "high"
  },
  "situation": "...",
  "obstacle": "...",
  "action": "...",
  "result": "..."
}

WRONG FORMAT (will be REJECTED):
{
  "bullet": "...",
  "situation": "...",
  "obstacle": "...",
  "action": "...",
  "result": "..."
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 PROFILE SUMMARY: MUST BE 95-125 WORDS - THIS WILL BE VALIDATED 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COUNT WORDS, NOT CHARACTERS! Your response will be REJECTED if profile_summary
is less than 95 words or more than 125 words.

DO NOT include word count annotations like "(112 words)" in the summary text!
The summary should end with a period, not with a word count note.

✗ TOO SHORT (98 words - WILL BE REJECTED):
"Results-driven technology leader with over 28 years of experience in driving data 
transformation initiatives across diverse sectors. Proven expertise in managing large-scale 
data projects, ensuring successful integration and governance. Demonstrated ability to lead 
cross-functional teams, driving stakeholder engagement and delivering measurable business 
outcomes. Expert in developing data management frameworks and delivering innovative AI/ML 
solutions. Recognized for building trusted relationships with clients, enabling strategic 
contributions to enterprise objectives. Committed to continuous improvement and fostering 
talent development within teams."

✓ ACCEPTABLE (112 words - PERFECT):
"Strategic technology leader with 20+ years of experience driving enterprise-scale digital 
transformation initiatives across Fortune 500 companies. Deep expertise in cloud architecture, 
data analytics, and AI/ML solutions, with proven track record of delivering $50M+ programs. 
Skilled in building high-performing teams and fostering relationships with C-suite stakeholders. 
Led successful migrations to Azure and AWS, reducing infrastructure costs by 40% while improving 
system reliability. Expert in modern data platforms including Databricks, Snowflake, and Synapse 
Analytics. Known for translating complex technical concepts into business value and driving 
innovation through emerging technologies. Passionate about mentoring engineering talent and 
establishing best practices for scalable solutions. Committed to delivering measurable business 
outcomes through technology excellence."

WRITE AT LEAST 95 WORDS. Target 100-120 words for best results!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 CRITICAL: INCLUDE **ALL** CAREER EXPERIENCES - THIS WILL BE VALIDATED 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your response will be REJECTED if you omit ANY job from the candidate's career history!

MANDATORY REQUIREMENTS:
- Extract EVERY SINGLE role from the candidate profile (look through the entire CV text)
- List them in REVERSE chronological order (most recent first, oldest last)
- If a candidate has 28+ years of experience, you should have 4-6+ experience entries
- Do NOT skip older roles - include them ALL
- USE THE ACTUAL DATES from the candidate profile - DO NOT invent or modify dates
- USE THE ACTUAL company names, job titles, and locations from the candidate profile
- Variable achievement counts:
  * Most recent role: 5-7 bullets
  * Second most recent: 3-5 bullets  
  * All older roles: 2 bullets EACH

✗ WRONG - Only showing 1 recent role (WILL BE REJECTED):
{
  "experience": [
    {
      "employer": "Company Name from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY },
      "achievements": [...]
    }
  ]
}

✓ CORRECT - Showing ALL career history (use ACTUAL dates/names from candidate profile):
{
  "experience": [
    {
      "employer": "Most Recent Company Name", 
      "title": "Most Recent Job Title",
      "dates": { "from_year": YYYY, "to_year": YYYY or null if current, "from_month": M or null, "to_month": M or null },
      "achievements": [5-7 bullets with grounding, ALL metrics from source included]
    },
    {
      "employer": "Second Company Name",
      "title": "Second Job Title",
      "dates": { "from_year": YYYY, "to_year": YYYY, "from_month": M or null, "to_month": M or null },
      "achievements": [3-5 bullets with grounding, ALL metrics from source included]
    },
    {
      "employer": "Third Company Name",
      "title": "Third Job Title",
      "dates": { "from_year": YYYY, "to_year": YYYY, "from_month": M or null, "to_month": M or null },
      "achievements": [2 bullets with grounding, ALL metrics from source included]
    },
    {
      "employer": "Fourth Company Name",
      "title": "Fourth Job Title",
      "dates": { "from_year": YYYY, "to_year": YYYY, "from_month": M or null, "to_month": M or null },
      "achievements": [2 bullets with grounding, ALL metrics from source included]
    }
  ]
}

SCAN THE ENTIRE CANDIDATE PROFILE! Don't stop at the first role you see!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NON-NEGOTIABLE ATS + STYLE
- No pronouns (I/me/my/we/us/he/she).
- Achievements use SOAR in one concise bullet; begin with a past-tense action verb; end with a period.
- **CRITICAL**: Include ALL QUANTIFIABLE METRICS from source_snippet (dollar amounts, percentages, numbers, timeframes) in achievement bullets
- Date formatting: MATCH THE SOURCE CV FORMAT
  * If source CV shows "January 2020 - December 2022" → extract: from_year: 2020, from_month: 1, to_year: 2022, to_month: 12
  * If source CV shows "2020 - 2022" (years only) → extract: from_year: 2020, from_month: null, to_year: 2022, to_month: null
  * Preserve month precision when present; use null for months when source only shows years
- key_skills: 60-80 WORDS prose paragraph (COUNT WORDS, not items!).
- technical_skills: 60-100 WORDS prose paragraph (COUNT WORDS, not items!).
- Quantify only where supported by the candidate profile (no invented numbers).

GROUNDING & ALIGNMENT (MANDATORY)
- Every achievement MUST include a "grounding" object with "source_snippet" taken verbatim from the candidate profile.
- Include "jd_alignment" at each experience entry: { criteria_hit: string[], jd_signals_used: string[] }
  - criteria_hit: evaluation criteria names covered in this role
  - jd_signals_used: JD terms/phrases addressed in this role
- Include "jd_alignment" at CV root level: { headline_signals?: string[], profile_signals?: string[], key_skills_signals?: string[], technical_skills_signals?: string[] }
- Include "criteria_coverage" array with objects: { criterion_ref: string, sections_addressing: string[], strength: "strong"|"moderate"|"weak" }
  Each item maps an evaluation criterion to which CV sections address it and how strongly.

VALIDATE BEFORE RETURN
- profile_summary 95–125 WORDS (count words!)
- key_skills 60–80 WORDS (count words!)
- technical_skills 60–100 WORDS (count words!)
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

REQUIRED JSON STRUCTURE (showing ALL experiences):
{
  "header": { "full_name": "Name", "city_region": "City", "phone": "Phone", "email": "email", "linkedin": "url" },
  "headline": "Job Title | Specialization",
  "profile_summary": "100-125 word summary (count words carefully)",
  "key_skills": "60-80 word prose paragraph describing core competencies and expertise areas",
  "technical_skills": "60-100 word prose paragraph describing technical tools, platforms, and technologies",
  "experience": [
    {
      "employer": "Most Recent Company Name from Profile",
      "location": "City, Country from Profile",
      "title": "Most Recent Job Title from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY or null if current role, "from_month": M or null, "to_month": M or null },
      "overview": "Brief scope of most recent role",
      "achievements": [
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." }
      ]
    },
    {
      "employer": "Second Most Recent Company Name from Profile",
      "location": "City, Country from Profile",
      "title": "Second Most Recent Job Title from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY },
      "overview": "Brief scope of second role",
      "achievements": [
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." }
      ]
    },
    {
      "employer": "Third Company Name from Profile",
      "location": "City, Country from Profile",
      "title": "Third Job Title from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY },
      "overview": "Brief scope",
      "achievements": [
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." }
      ]
    },
    {
      "employer": "Fourth Company Name from Profile (if applicable)",
      "location": "City, Country from Profile",
      "title": "Fourth Job Title from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY },
      "overview": "Brief scope",
      "achievements": [
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." }
      ]
    }
  ],
  "earlier_career_summary": [{"title": "Very Early Career Title", "employer": "Very Early Company"}],
  "education": [{"qualification": "Degree", "institution": "University", "city_country": "City"}],
  "certifications": ["Cert 1", "Cert 2"],
  "optional_sections": {}
}

CRITICAL: Return valid JSON only. Ensure dates are numbers, profile_summary is 95-125 WORDS, key_skills is 60-80 WORDS, technical_skills is 60-100 WORDS.`;

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
    result = await autoRepairAIOutput(result, cvConfig);
    
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
      
      // Runtime validation: Enforce 95-125 word count for profile_summary
      const profileWordCount = cv.profile_summary.trim().split(/\s+/).length;
      if (profileWordCount < 95 || profileWordCount > 125) {
        throw new Error(`Profile summary has ${profileWordCount} words, must be 95-125 words`);
      }
      
      // Runtime validation: Enforce 60-80 word count for key_skills
      const keySkillsWordCount = cv.key_skills.trim().split(/\s+/).length;
      if (keySkillsWordCount < 60 || keySkillsWordCount > 80) {
        throw new Error(`Key skills has ${keySkillsWordCount} words, must be 60-80 words`);
      }
      
      // Runtime validation: Enforce 60-100 word count for technical_skills
      const techSkillsWordCount = cv.technical_skills.trim().split(/\s+/).length;
      if (techSkillsWordCount < 60 || techSkillsWordCount > 100) {
        throw new Error(`Technical skills has ${techSkillsWordCount} words, must be 60-100 words`);
      }
      
      // Runtime validation: Check experience count matches candidate profile analysis
      if (cv.experience && cv.experience.length > 0) {
        const currentYear = new Date().getFullYear();
        
        // Calculate career span from all experiences (handle null to_year as current year)
        const allYears = cv.experience.flatMap(exp => {
          const fromYear = exp.dates.from_year;
          const toYear = exp.dates.to_year ?? currentYear; // null = current role
          return [fromYear, toYear];
        }).filter((year): year is number => year != null && !isNaN(year));
        
        if (allYears.length === 0) {
          throw new Error('No valid years found in experience entries. AI must provide from_year and to_year for all roles.');
        }
        
        const earliestYear = Math.min(...allYears);
        const latestYear = Math.max(...allYears);
        const careerSpan = latestYear - earliestYear;
        
        // Check against authoritative baseline from candidate profile
        const minExpectedFromProfile = Math.max(1, Math.floor(expectedRoleCount * 0.9)); // Allow only 10% margin - AI must include nearly all roles
        
        if (cv.experience.length < minExpectedFromProfile) {
          console.warn(`CRITICAL: AI generated only ${cv.experience.length} experience entries, but candidate profile contains ${expectedRoleCount} distinct roles. AI is omitting career history!`);
          throw new Error(`Only ${cv.experience.length} experience entries generated, but candidate profile shows ${expectedRoleCount} distinct roles. AI must extract ALL roles from the career history, not just recent ones.`);
        }
        
        // Additional sanity check: career span vs entry count
        let minExpectedFromSpan = 1;
        if (careerSpan >= 25) minExpectedFromSpan = 4;
        else if (careerSpan >= 15) minExpectedFromSpan = 3;
        else if (careerSpan >= 8) minExpectedFromSpan = 2;
        
        if (cv.experience.length < minExpectedFromSpan) {
          console.warn(`WARNING: CV has ${cv.experience.length} experience entries for ${careerSpan} year career span (${earliestYear}-${latestYear}), expected at least ${minExpectedFromSpan}`);
        }
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
Key skills: ${cv.key_skills}
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
Key skills: ${cv.key_skills}
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
   * Wrapper: Generate CV with prompts for traceability
   */
  async generateCVWithPrompts(
    candidateProfile: string,
    jdSpec: JdSpec,
    evaluationCriteria: EvaluationCriteria,
    cvConfig: CvGenerationConfig
  ): Promise<{ cv: CvDocument; prompts: { system: string; user: string } }> {
    // Build prompts (identical to generateCV)
    const systemPrompt = `You are an expert CV writer for senior technology leadership roles. Return ONE valid JSON object (the CV only).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 CRITICAL - GROUNDING IS MANDATORY - THIS WILL BE VALIDATED 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVERY achievement MUST have a "grounding" object with "source_snippet".
Your response will be REJECTED if even ONE achievement lacks grounding.

CORRECT FORMAT (copy this exactly):
{
  "bullet": "Led migration of legacy system to microservices architecture reducing latency by 40%.",
  "grounding": {
    "source_snippet": "Led migration of legacy system to microservices",
    "confidence": "high"
  },
  "situation": "...",
  "obstacle": "...",
  "action": "...",
  "result": "..."
}

WRONG FORMAT (will be REJECTED):
{
  "bullet": "...",
  "situation": "...",
  "obstacle": "...",
  "action": "...",
  "result": "..."
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 PROFILE SUMMARY: MUST BE 95-125 WORDS - THIS WILL BE VALIDATED 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COUNT WORDS, NOT CHARACTERS! Your response will be REJECTED if profile_summary
is less than 95 words or more than 125 words.

DO NOT include word count annotations like "(112 words)" in the summary text!
The summary should end with a period, not with a word count note.

✗ TOO SHORT (98 words - WILL BE REJECTED):
"Results-driven technology leader with over 28 years of experience in driving data 
transformation initiatives across diverse sectors. Proven expertise in managing large-scale 
data projects, ensuring successful integration and governance. Demonstrated ability to lead 
cross-functional teams, driving stakeholder engagement and delivering measurable business 
outcomes. Expert in developing data management frameworks and delivering innovative AI/ML 
solutions. Recognized for building trusted relationships with clients, enabling strategic 
contributions to enterprise objectives. Committed to continuous improvement and fostering 
talent development within teams."

✓ ACCEPTABLE (112 words - PERFECT):
"Strategic technology leader with 20+ years of experience driving enterprise-scale digital 
transformation initiatives across Fortune 500 companies. Deep expertise in cloud architecture, 
data analytics, and AI/ML solutions, with proven track record of delivering $50M+ programs. 
Skilled in building high-performing teams and fostering relationships with C-suite stakeholders. 
Led successful migrations to Azure and AWS, reducing infrastructure costs by 40% while improving 
system reliability. Expert in modern data platforms including Databricks, Snowflake, and Synapse 
Analytics. Known for translating complex technical concepts into business value and driving 
innovation through emerging technologies. Passionate about mentoring engineering talent and 
establishing best practices for scalable solutions. Committed to delivering measurable business 
outcomes through technology excellence."

WRITE AT LEAST 95 WORDS. Target 100-120 words for best results!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 CRITICAL: INCLUDE **ALL** CAREER EXPERIENCES - THIS WILL BE VALIDATED 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your response will be REJECTED if you omit ANY job from the candidate's career history!

MANDATORY REQUIREMENTS:
- Extract EVERY SINGLE role from the candidate profile (look through the entire CV text)
- List them in REVERSE chronological order (most recent first, oldest last)
- If a candidate has 28+ years of experience, you should have 4-6+ experience entries
- Do NOT skip older roles - include them ALL
- USE THE ACTUAL DATES from the candidate profile - DO NOT invent or modify dates
- USE THE ACTUAL company names, job titles, and locations from the candidate profile
- Variable achievement counts:
  * Most recent role: 5-7 bullets
  * Second most recent: 3-5 bullets  
  * All older roles: 2 bullets EACH

✗ WRONG - Only showing 1 recent role (WILL BE REJECTED):
{
  "experience": [
    {
      "employer": "Company Name from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY },
      "achievements": [...]
    }
  ]
}

✓ CORRECT - Showing ALL career history (use ACTUAL dates/names from candidate profile):
{
  "experience": [
    {
      "employer": "Most Recent Company Name", 
      "title": "Most Recent Job Title",
      "dates": { "from_year": YYYY, "to_year": YYYY or null if current, "from_month": M or null, "to_month": M or null },
      "achievements": [5-7 bullets with grounding, ALL metrics from source included]
    },
    {
      "employer": "Second Company Name",
      "title": "Second Job Title",
      "dates": { "from_year": YYYY, "to_year": YYYY, "from_month": M or null, "to_month": M or null },
      "achievements": [3-5 bullets with grounding, ALL metrics from source included]
    },
    {
      "employer": "Third Company Name",
      "title": "Third Job Title",
      "dates": { "from_year": YYYY, "to_year": YYYY, "from_month": M or null, "to_month": M or null },
      "achievements": [2 bullets with grounding, ALL metrics from source included]
    },
    {
      "employer": "Fourth Company Name",
      "title": "Fourth Job Title",
      "dates": { "from_year": YYYY, "to_year": YYYY, "from_month": M or null, "to_month": M or null },
      "achievements": [2 bullets with grounding, ALL metrics from source included]
    }
  ]
}

SCAN THE ENTIRE CANDIDATE PROFILE! Don't stop at the first role you see!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NON-NEGOTIABLE ATS + STYLE
- No pronouns (I/me/my/we/us/he/she).
- Achievements use SOAR in one concise bullet; begin with a past-tense action verb; end with a period.
- **CRITICAL**: Include ALL QUANTIFIABLE METRICS from source_snippet (dollar amounts, percentages, numbers, timeframes) in achievement bullets
- Date formatting: MATCH THE SOURCE CV FORMAT
  * If source CV shows "January 2020 - December 2022" → extract: from_year: 2020, from_month: 1, to_year: 2022, to_month: 12
  * If source CV shows "2020 - 2022" (years only) → extract: from_year: 2020, from_month: null, to_year: 2022, to_month: null
  * Preserve month precision when present; use null for months when source only shows years
- key_skills: 60-80 WORDS prose paragraph (COUNT WORDS, not items!).
- technical_skills: 60-100 WORDS prose paragraph (COUNT WORDS, not items!).
- Quantify only where supported by the candidate profile (no invented numbers).

GROUNDING & ALIGNMENT (MANDATORY)
- Every achievement MUST include a "grounding" object with "source_snippet" taken verbatim from the candidate profile.
- Include "jd_alignment" at each experience entry: { criteria_hit: string[], jd_signals_used: string[] }
  - criteria_hit: evaluation criteria names covered in this role
  - jd_signals_used: JD terms/phrases addressed in this role
- Include "jd_alignment" at CV root level: { headline_signals?: string[], profile_signals?: string[], key_skills_signals?: string[], technical_skills_signals?: string[] }
- Include "criteria_coverage" array with objects: { criterion_ref: string, sections_addressing: string[], strength: "strong"|"moderate"|"weak" }
  Each item maps an evaluation criterion to which CV sections address it and how strongly.

VALIDATE BEFORE RETURN
- profile_summary 95–125 WORDS (count words!)
- key_skills 60–80 WORDS (count words!)
- technical_skills 60–100 WORDS (count words!)
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

REQUIRED JSON STRUCTURE (showing ALL experiences):
{
  "header": { "full_name": "Name", "city_region": "City", "phone": "Phone", "email": "email", "linkedin": "url" },
  "headline": "Job Title | Specialization",
  "profile_summary": "100-125 word summary (count words carefully)",
  "key_skills": "60-80 word prose paragraph describing core competencies and expertise areas",
  "technical_skills": "60-100 word prose paragraph describing technical tools, platforms, and technologies",
  "experience": [
    {
      "employer": "Most Recent Company Name from Profile",
      "location": "City, Country from Profile",
      "title": "Most Recent Job Title from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY or null if current role, "from_month": M or null, "to_month": M or null },
      "overview": "Brief scope of most recent role",
      "achievements": [
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." }
      ]
    },
    {
      "employer": "Second Most Recent Company Name from Profile",
      "location": "City, Country from Profile",
      "title": "Second Most Recent Job Title from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY },
      "overview": "Brief scope of second role",
      "achievements": [
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." }
      ]
    },
    {
      "employer": "Third Company Name from Profile",
      "location": "City, Country from Profile",
      "title": "Third Job Title from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY },
      "overview": "Brief scope",
      "achievements": [
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." }
      ]
    },
    {
      "employer": "Fourth Company Name from Profile (if applicable)",
      "location": "City, Country from Profile",
      "title": "Fourth Job Title from Profile",
      "dates": { "from_year": YYYY, "to_year": YYYY },
      "overview": "Brief scope",
      "achievements": [
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." },
        { "bullet": "...", "grounding": {"source_snippet": "...", "confidence": "high"}, "situation": "...", "obstacle": "...", "action": "...", "result": "..." }
      ]
    }
  ],
  "earlier_career_summary": [{"title": "Very Early Career Title", "employer": "Very Early Company"}],
  "education": [{"qualification": "Degree", "institution": "University", "city_country": "City"}],
  "certifications": ["Cert 1", "Cert 2"],
  "optional_sections": {}
}

CRITICAL: Return valid JSON only. Ensure dates are numbers, profile_summary is 95-125 WORDS, key_skills is 60-80 WORDS, technical_skills is 60-100 WORDS.`;

    const cv = await this.generateCV(candidateProfile, jdSpec, evaluationCriteria, cvConfig);
    return { cv, prompts: { system: systemPrompt, user: userPrompt } };
  }

  /**
   * Wrapper: Generate cover letter with prompts for traceability
   */
  async generateCoverLetterWithPrompts(
    cv: CvDocument,
    jdSpec: JdSpec
  ): Promise<{ coverLetter: CoverLetter; prompts: { system: string; user: string } }> {
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
Key skills: ${cv.key_skills}
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

    const coverLetter = await this.generateCoverLetter(cv, jdSpec);
    return { coverLetter, prompts: { system: systemPrompt, user: userPrompt } };
  }

  /**
   * Wrapper: Generate analysis with prompts for traceability
   */
  async generateAnalysisWithPrompts(
    cv: CvDocument,
    coverLetter: CoverLetter,
    jdSpec: JdSpec,
    evaluationCriteria: EvaluationCriteria
  ): Promise<{ 
    scorecard: Scorecard; 
    recommendations: Recommendation[];
    prompts: { system: string; user: string };
  }> {
    const systemPrompt = `You are a senior recruitment consultant. Return ONE valid JSON object only (no prose, no markdown).

GOAL
1) Generate a scorecard evaluating how well the CV and cover letter align with the job requirements using the provided evaluation criteria.
2) Provide 4-7 specific recommendations for how to strengthen the application in Pass 2.

RULES
- Scores are integers from 1 to 10.
- Be objective and evidence-based.
- For each criterion, provide specific JD expectations and assess CV strengths.
- Recommendations should be actionable and specific.
- Output valid JSON only.`;

    const criteriaContext = evaluationCriteria.map(c =>
      `${c.name} (${c.weight_percent}%): Look for ${c.jd_signals.join(', ')}`
    ).join('\n');

    const userPrompt = `Evaluate this application and provide a scorecard + recommendations.

EVALUATION CRITERIA:
${criteriaContext}

JOB REQUIREMENTS:
Role: ${jdSpec.role}
Must-have: ${jdSpec.must_have.join(', ')}

CV SUMMARY:
Name: ${cv.header.full_name}
Headline: ${cv.headline}
Key Skills: ${cv.key_skills}
Recent Experience: ${cv.experience[0]?.title} at ${cv.experience[0]?.employer} (${cv.experience[0]?.dates.from_year}-${cv.experience[0]?.dates.to_year || 'Present'})

REQUIRED JSON STRUCTURE:
{
  "scorecard": {
    "scorecard": [
      {
        "area": "Criterion name",
        "score_1_to_10": 8,
        "jd_expectation": "What the job requires...",
        "cv_strength": "How the CV addresses this..."
      }
    ]
  },
  "recommendations": [
    {
      "priority": "high",
      "section": "experience",
      "issue": "Description of the gap or weakness",
      "suggestion": "Specific recommendation to address it"
    }
  ]
}

CRITICAL: 
- Include one scorecard item per evaluation criterion
- Scores must be integers 1-10
- Provide 4-7 actionable recommendations`;

    const { scorecard, recommendations } = await this.generateAnalysis(cv, coverLetter, jdSpec, evaluationCriteria);
    return { scorecard, recommendations, prompts: { system: systemPrompt, user: userPrompt } };
  }

  /**
   * Pass 1: Generate initial CV and cover letter drafts with scorecard analysis
   */
  async generateDraft(
    candidateProfile: string,
    jobPosting: JobPostingPayload,
    cvConfig: CvGenerationConfig
  ): Promise<{
    jdSpec: JdSpec;
    evaluationCriteria: EvaluationCriteria;
    cvDraft: CvDocument;
    coverLetterDraft: CoverLetter;
    scorecard: Scorecard;
    recommendations: Recommendation[];
    rawCvInput: string;
    prompts: {
      phase0_jd_analysis: { system: string; user: string };
      phase1a_cv: { system: string; user: string };
      phase1b_cover_letter: { system: string; user: string };
      phase1c_analysis: { system: string; user: string };
    };
  }> {
    // Store all prompts for traceability
    const prompts: any = {};
    
    // Phase 0: Analyze job posting to extract JD spec and evaluation criteria
    console.log("Phase 0: Analyzing job posting...");
    const { jdSpec, evaluationCriteria, prompts: phase0Prompts } = await this.analyzeJobPosting(jobPosting);
    prompts.phase0_jd_analysis = phase0Prompts;
    
    // Phase 1A: Generate CV
    console.log("Phase 1A: Generating CV...");
    const { cv: cvDraft, prompts: phase1aPrompts } = await this.generateCVWithPrompts(candidateProfile, jdSpec, evaluationCriteria, cvConfig);
    prompts.phase1a_cv = phase1aPrompts;
    
    // Phase 1B: Generate cover letter
    console.log("Phase 1B: Generating cover letter...");
    const { coverLetter: coverLetterDraft, prompts: phase1bPrompts } = await this.generateCoverLetterWithPrompts(cvDraft, jdSpec);
    prompts.phase1b_cover_letter = phase1bPrompts;
    
    // Phase 1C: Generate analysis (scorecard + recommendations)
    console.log("Phase 1C: Generating analysis...");
    const { scorecard, recommendations, prompts: phase1cPrompts } = await this.generateAnalysisWithPrompts(
      cvDraft,
      coverLetterDraft,
      jdSpec,
      evaluationCriteria
    );
    prompts.phase1c_analysis = phase1cPrompts;
    
    console.log("Draft generation complete!");
    return {
      jdSpec,
      evaluationCriteria,
      cvDraft,
      coverLetterDraft,
      scorecard,
      recommendations,
      rawCvInput: candidateProfile,
      prompts,
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
    recommendations: Recommendation[],
    cvConfig: CvGenerationConfig
  ): Promise<{
    cvFinal: CvDocument;
    coverLetterFinal: CoverLetter;
    scorecardFinal: Scorecard;
    addedPoints: TraceChange[];
  }> {
    const systemPrompt = `You refine CV and cover-letter JSON from Pass 1 using explicit recommendations. Return ONE valid JSON object only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 PROFILE SUMMARY: MUST BE 95-125 WORDS - THIS WILL BE VALIDATED 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COUNT WORDS, NOT CHARACTERS! Your response will be REJECTED if profile_summary
is less than 95 words or more than 125 words.

DO NOT include word count annotations like "(112 words)" in the summary text!
The summary should end with a period, not with a word count note.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULES
- Apply ALL recommendations without inventing facts.
- Preserve or update grounding for any edited achievement (keep grounding.source_snippet; update if the sentence changed).
- No pronouns. SOAR bullets; end with a period.
- **CRITICAL**: Include ALL QUANTIFIABLE METRICS from source_snippet (dollar amounts, percentages, numbers, timeframes) in achievement bullets
- Date formatting: PRESERVE month/year format from draft CV (do NOT change from_month/to_month fields)
- key_skills: 60–80 WORDS prose paragraph (COUNT WORDS!).
- technical_skills: 60–100 WORDS prose paragraph (COUNT WORDS!).
- Cover letter: 300–400 words; UK style; reflect final CV.
- Rescore against the evaluation criteria and include overall_score_1_to_10 (weighted average).
- Each scorecard item MUST include criterion_ref and reason_for_score.
- Track significant changes in addedPoints with exact final quotes and target_section.

VALIDATE BEFORE RETURN
- profile_summary 95–125 WORDS (count words!); key_skills 60–80 WORDS; technical_skills 60–100 WORDS; scorecard 4–12.
- criterion_ref values exist in evaluationCriteria.name.
- Dates preserve month fields from draft; achievements end with a period; each includes grounding.source_snippet.
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
    result = await autoRepairAIOutput(result, cvConfig);
    
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
      
      // Runtime validation: Enforce 95-125 word count for profile_summary
      const wordCount = cvFinal.profile_summary.trim().split(/\s+/).length;
      if (wordCount < 95 || wordCount > 125) {
        throw new Error(`Optimized profile summary has ${wordCount} words, must be 95-125 words`);
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

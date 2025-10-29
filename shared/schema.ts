import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  jsonb,
  text,
  uuid,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Candidate profiles - stores long-form CV and contact info
export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id),
  fullName: varchar("full_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  cityRegion: varchar("city_region"),
  linkedin: varchar("linkedin"),
  
  // Long-form CV data
  longformCv: text("longform_cv").notNull(), // Full career history text
  
  // Default preferences
  defaultFont: varchar("default_font").notNull().default("Arial"),
  defaultFontSize: integer("default_font_size").notNull().default(11),
  defaultMarginsCm: varchar("default_margins_cm").notNull().default("2.5"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Candidate = typeof candidates.$inferSelect;
export const insertCandidateSchema = createInsertSchema(candidates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

// Processing runs - tracks each CV tailoring request
export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id),
  candidateId: uuid("candidate_id").notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  jobPostingId: uuid("job_posting_id"), // Set after job posting is created
  jobPostUrl: text("job_post_url"), // Optional - either this OR manualJd
  manualJd: text("manual_jd"), // Optional - manual job description instead of URL
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull(), // QUEUED, SCRAPING, DRAFT_PASS1, OPTIMIZING_PASS2, VALIDATED, RENDERING, COMPLETED, FAILED
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Run = typeof runs.$inferSelect;
export const insertRunSchema = createInsertSchema(runs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRun = z.infer<typeof insertRunSchema>;

// Job postings - scraped and normalized job data
export const jobPostings = pgTable("job_postings", {
  runId: uuid("run_id").primaryKey().references(() => runs.id, { onDelete: 'cascade' }),
  payload: jsonb("payload").notNull(), // Full JobPosting JSON
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JobPosting = typeof jobPostings.$inferSelect;
export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({ createdAt: true });
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;

// Draft documents - Pass 1 outputs
export const drafts = pgTable("drafts", {
  runId: uuid("run_id").primaryKey().references(() => runs.id, { onDelete: 'cascade' }),
  jdSpecJsonb: jsonb("jd_spec_jsonb").notNull(), // Structured JD extraction
  evaluationCriteriaJsonb: jsonb("evaluation_criteria_jsonb").notNull(), // Weighted criteria (4-7 items)
  cvJsonb: jsonb("cv_jsonb").notNull(),
  coverLetterJsonb: jsonb("cover_letter_jsonb").notNull(),
  scorecardPass1Jsonb: jsonb("scorecard_pass1_jsonb").notNull(),
  recommendationsPass1Jsonb: jsonb("recommendations_pass1_jsonb").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Draft = typeof drafts.$inferSelect;
export const insertDraftSchema = createInsertSchema(drafts).omit({ createdAt: true });
export type InsertDraft = z.infer<typeof insertDraftSchema>;

// Final documents - Pass 2 outputs
export const finals = pgTable("finals", {
  runId: uuid("run_id").primaryKey().references(() => runs.id, { onDelete: 'cascade' }),
  cvJsonb: jsonb("cv_jsonb").notNull(),
  coverLetterJsonb: jsonb("cover_letter_jsonb").notNull(),
  scorecardPass2Jsonb: jsonb("scorecard_pass2_jsonb").notNull(),
  addedPointsJsonb: jsonb("added_points_jsonb").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Final = typeof finals.$inferSelect;
export const insertFinalSchema = createInsertSchema(finals).omit({ createdAt: true });
export type InsertFinal = z.infer<typeof insertFinalSchema>;

// Artifacts - Generated .docx file paths
export const artifacts = pgTable("artifacts", {
  runId: uuid("run_id").primaryKey().references(() => runs.id, { onDelete: 'cascade' }),
  cvPath: text("cv_path").notNull(),
  coverLetterPath: text("cover_letter_path").notNull(),
  addedPointsPath: text("added_points_path").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Artifact = typeof artifacts.$inferSelect;
export const insertArtifactSchema = createInsertSchema(artifacts).omit({ createdAt: true });
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;

// Audit logs - Security and compliance tracking
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // SUBMIT_JOB, DOWNLOAD_CV, VIEW_SCORECARD, etc.
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 255 }),
  metadata: jsonb("metadata"), // Additional context
  ipAddress: varchar("ip_address", { length: 45 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// ============================================
// Zod Schemas for JSON payloads
// ============================================

// JobPosting schema
export const jobPostingSchema = z.object({
  source_url: z.string().url(),
  company: z.object({
    name: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    hq: z.string().optional(),
  }).optional(),
  role: z.object({
    title: z.string(),
    location: z.string().optional(),
    seniority: z.string().optional(),
    employment_type: z.string().optional(),
  }),
  description: z.object({
    raw_html: z.string().optional(),
    clean_text: z.string(),
    sections: z.object({
      about_company: z.string().optional(),
      responsibilities: z.string().optional(),
      requirements_must: z.array(z.string()).optional(),
      requirements_nice: z.array(z.string()).optional(),
      benefits: z.array(z.string()).optional(),
    }).optional(),
    keywords: z.object({
      skills: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
      domains: z.array(z.string()).optional(),
      certs: z.array(z.string()).optional(),
    }).optional(),
  }),
  compensation: z.object({
    currency: z.string().optional(),
    range: z.object({
      min: z.number().nullable().optional(),
      max: z.number().nullable().optional(),
    }).optional(),
    bonus: z.string().optional(),
    other: z.string().optional(),
  }).optional(),
  posting_dates: z.object({
    posted: z.string().optional(),
    closing: z.string().optional(),
  }).optional(),
});

export type JobPostingPayload = z.infer<typeof jobPostingSchema>;

// JD Spec schema - structured extraction from job description
export const jdSpecSchema = z.object({
  company: z.object({
    name: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    hq: z.string().optional(),
  }).optional(),
  role: z.object({
    title: z.string(),
    location: z.string().optional(),
    seniority: z.string().optional(),
    employment_type: z.string().optional(),
  }),
  must_have: z.array(z.string()),
  nice_to_have: z.array(z.string()),
  responsibilities: z.array(z.string()),
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  domains: z.array(z.string()),
  scope_indicators: z.object({
    team_size: z.string().optional(),
    budget: z.string().optional(),
    regions: z.string().optional(),
    stakeholder_levels: z.string().optional(),
  }).optional(),
  outcomes_kpis: z.array(z.string()),
  keywords: z.array(z.string()),
});

export type JdSpec = z.infer<typeof jdSpecSchema>;

// Evaluation Criteria schema - weighted criteria derived from JD
export const evaluationCriterionSchema = z.object({
  name: z.string(),
  jd_signals: z.array(z.string()),
  weight_percent: z.number().int().min(0).max(100),
  rubric: z.object({
    excellent: z.string(),
    good: z.string(),
    fair: z.string(),
    poor: z.string(),
  }),
  target_cv_fields: z.array(z.string()),
});

export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;

export const evaluationCriteriaSchema = z.array(evaluationCriterionSchema).min(4).max(7);
export type EvaluationCriteria = z.infer<typeof evaluationCriteriaSchema>;

// CV Document schema
export const cvDocumentSchema = z.object({
  header: z.object({
    full_name: z.string(),
    city_region: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email(),
    linkedin: z.string().optional(),
  }),
  headline: z.string(),
  profile_summary: z.string().min(80).max(220),
  key_skills: z.array(z.string()).min(8).max(16),
  technical_skills: z.string(),
  experience: z.array(z.object({
    employer: z.string(),
    location: z.string().optional(),
    title: z.string(),
    dates: z.object({
      from_year: z.number().int().min(1970).max(2100),
      to_year: z.number().int().min(1970).max(2100).nullable().optional(),
    }),
    overview: z.string(),
    achievements: z.array(z.object({
      bullet: z.string(),
      situation: z.string().optional(),
      obstacle: z.string().optional(),
      action: z.string().optional(),
      result: z.string().optional(),
      grounding: z.object({
        source_snippet: z.string(),
        start_char: z.number().optional(),
        end_char: z.number().optional(),
      }).optional(),
    })),
  })).min(1),
  earlier_career_summary: z.array(z.object({
    title: z.string(),
    employer: z.string(),
  })).optional(),
  education: z.array(z.object({
    qualification: z.string(),
    institution: z.string(),
    city_country: z.string().optional(),
  })).optional(),
  certifications: z.array(z.union([
    z.string(),
    z.object({
      name: z.string(),
      year: z.number().optional(),
    })
  ])).optional(),
  publications: z.array(z.string()).optional(),
  optional_sections: z.object({
    languages: z.array(z.string()).optional(),
    awards: z.array(z.string()).optional(),
    memberships: z.array(z.string()).optional(),
  }).optional(),
});

export type CvDocument = z.infer<typeof cvDocumentSchema>;

// Cover Letter schema
export const coverLetterSchema = z.object({
  header: z.object({
    full_name: z.string(),
    contact_block: z.string(),
    city_region: z.string().optional(),
  }),
  meta: z.object({
    date_iso: z.string(),
    recipient: z.object({
      name: z.string().optional(),
      title: z.string().optional(),
      company: z.string().optional(),
      address: z.string().optional(),
    }),
    subject: z.string(),
  }),
  paragraphs: z.object({
    opening: z.string(),
    alignment: z.string(),
    fit_evidence: z.string(),
    closing: z.string(),
  }),
  sign_off: z.object({
    closing: z.string(),
    name: z.string(),
  }),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;

// Scorecard schema with criterion reference and overall score
export const scorecardSchema = z.object({
  scorecard: z.array(z.object({
    area: z.string(),
    jd_expectation: z.string(),
    cv_strength: z.string(),
    score_1_to_10: z.number().int().min(1).max(10),
    criterion_ref: z.string().optional(), // Reference to evaluation_criteria[index].name
  })).min(4).max(12),
  overall_score_1_to_10: z.number().min(1).max(10), // Weighted average from evaluation criteria
});

export type Scorecard = z.infer<typeof scorecardSchema>;

// Recommendation schema with suggested text
export const recommendationSchema = z.object({
  priority: z.enum(["High", "Medium", "Low"]),
  rationale: z.string(),
  target_section: z.string(),
  suggested_text: z.string().optional(), // Suggested improvement text
});

export type Recommendation = z.infer<typeof recommendationSchema>;

// Trace Change schema with target section
export const traceChangeSchema = z.object({
  description: z.string(),
  quote: z.string(),
  target_section: z.string().optional(), // JSON path to changed section
});

export type TraceChange = z.infer<typeof traceChangeSchema>;

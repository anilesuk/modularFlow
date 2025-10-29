import { eq } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@shared/schema";
import type {
  User,
  UpsertUser,
  Candidate,
  InsertCandidate,
  JobPosting,
  InsertJobPosting,
  Run,
  InsertRun,
  Draft,
  InsertDraft,
  Final,
  InsertFinal,
  Artifact,
  InsertArtifact,
  AuditLog,
  InsertAuditLog,
} from "@shared/schema";

export interface IStorage {
  // Users (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Candidates
  getCandidatesByUserId(userId: string): Promise<Candidate[]>;
  getCandidateById(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  deleteCandidate(id: string): Promise<void>;

  // Job Postings
  getJobPostingById(id: string): Promise<JobPosting | undefined>;
  createJobPosting(jobPosting: InsertJobPosting): Promise<JobPosting>;

  // Runs
  getRunsByUserId(userId: string): Promise<Run[]>;
  getRunById(id: string): Promise<Run | undefined>;
  createRun(run: InsertRun): Promise<Run>;
  updateRun(id: string, updates: Partial<InsertRun>): Promise<Run>;
  updateRunStatus(id: string, status: string, errorMsg?: string | null): Promise<Run>;

  // Drafts
  getDraftByRunId(runId: string): Promise<Draft | undefined>;
  createDraft(draft: InsertDraft): Promise<Draft>;
  updateDraft(runId: string, draft: Partial<InsertDraft>): Promise<Draft>;

  // Finals
  getFinalByRunId(runId: string): Promise<Final | undefined>;
  createFinal(final: InsertFinal): Promise<Final>;
  updateFinal(runId: string, final: Partial<InsertFinal>): Promise<Final>;

  // Artifacts
  getArtifactByRunId(runId: string): Promise<Artifact | undefined>;
  getArtifactsByRunId(runId: string): Promise<Artifact[]>;
  getArtifactById(id: string): Promise<Artifact | undefined>;
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  // Users (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return users[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(schema.users)
      .values(userData)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Candidates
  async getCandidatesByUserId(userId: string): Promise<Candidate[]> {
    return db.select().from(schema.candidates).where(eq(schema.candidates.userId, userId));
  }

  async getCandidateById(id: string): Promise<Candidate | undefined> {
    const candidates = await db.select().from(schema.candidates).where(eq(schema.candidates.id, id));
    return candidates[0];
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(schema.candidates).values(candidate).returning();
    return newCandidate;
  }

  async updateCandidate(id: string, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const [updated] = await db.update(schema.candidates)
      .set(candidate)
      .where(eq(schema.candidates.id, id))
      .returning();
    return updated;
  }

  async deleteCandidate(id: string): Promise<void> {
    await db.delete(schema.candidates).where(eq(schema.candidates.id, id));
  }

  // Job Postings
  async getJobPostingById(id: string): Promise<JobPosting | undefined> {
    const postings = await db.select().from(schema.jobPostings).where(eq(schema.jobPostings.runId, id));
    return postings[0];
  }

  async createJobPosting(jobPosting: InsertJobPosting): Promise<JobPosting> {
    const [newPosting] = await db.insert(schema.jobPostings).values(jobPosting).returning();
    return newPosting;
  }

  // Runs
  async getRunsByUserId(userId: string): Promise<Run[]> {
    return db.select().from(schema.runs).where(eq(schema.runs.userId, userId)).orderBy(schema.runs.createdAt);
  }

  async getRunById(id: string): Promise<Run | undefined> {
    const runs = await db.select().from(schema.runs).where(eq(schema.runs.id, id));
    return runs[0];
  }

  async createRun(run: InsertRun): Promise<Run> {
    const [newRun] = await db.insert(schema.runs).values(run).returning();
    return newRun;
  }

  async updateRun(id: string, updates: Partial<InsertRun>): Promise<Run> {
    const [updated] = await db.update(schema.runs)
      .set(updates)
      .where(eq(schema.runs.id, id))
      .returning();
    return updated;
  }

  async updateRunStatus(id: string, status: string, errorMsg?: string | null): Promise<Run> {
    return this.updateRun(id, { status, errorMsg });
  }

  // Drafts
  async getDraftByRunId(runId: string): Promise<Draft | undefined> {
    const drafts = await db.select().from(schema.drafts).where(eq(schema.drafts.runId, runId));
    return drafts[0];
  }

  async createDraft(draft: InsertDraft): Promise<Draft> {
    const [newDraft] = await db.insert(schema.drafts).values(draft).returning();
    return newDraft;
  }

  async updateDraft(runId: string, draft: Partial<InsertDraft>): Promise<Draft> {
    const [updated] = await db.update(schema.drafts)
      .set(draft)
      .where(eq(schema.drafts.runId, runId))
      .returning();
    return updated;
  }

  // Finals
  async getFinalByRunId(runId: string): Promise<Final | undefined> {
    const finals = await db.select().from(schema.finals).where(eq(schema.finals.runId, runId));
    return finals[0];
  }

  async createFinal(final: InsertFinal): Promise<Final> {
    const [newFinal] = await db.insert(schema.finals).values(final).returning();
    return newFinal;
  }

  async updateFinal(runId: string, final: Partial<InsertFinal>): Promise<Final> {
    const [updated] = await db.update(schema.finals)
      .set(final)
      .where(eq(schema.finals.runId, runId))
      .returning();
    return updated;
  }

  // Artifacts
  async getArtifactByRunId(runId: string): Promise<Artifact | undefined> {
    const artifacts = await db.select().from(schema.artifacts).where(eq(schema.artifacts.runId, runId));
    return artifacts[0];
  }

  async getArtifactsByRunId(runId: string): Promise<Artifact[]> {
    return db.select().from(schema.artifacts).where(eq(schema.artifacts.runId, runId));
  }

  async getArtifactById(id: string): Promise<Artifact | undefined> {
    const artifacts = await db.select().from(schema.artifacts).where(eq(schema.artifacts.id, id));
    return artifacts[0];
  }

  async createArtifact(artifact: InsertArtifact): Promise<Artifact> {
    const [newArtifact] = await db.insert(schema.artifacts).values(artifact).returning();
    return newArtifact;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(schema.auditLogs).values(log).returning();
    return newLog;
  }
}

export const storage = new DatabaseStorage();

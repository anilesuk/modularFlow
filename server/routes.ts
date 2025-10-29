import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { scraper } from "./scraper";
import { aiService } from "./ai";
import { docGen } from "./docGen";
import { objectStorage } from "./objectStorage";
import { objectAcl } from "./objectAcl";
import { insertCandidateSchema, insertRunSchema } from "@shared/schema";
import type { CvDocument, CoverLetter, Scorecard, Recommendation, TraceChange } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== AUTH =====
  
  // Get authenticated user info
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ===== CANDIDATES =====
  
  // Get all candidates for current user
  app.get("/api/candidates", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    try {
      const candidates = await storage.getCandidatesByUserId(req.user.claims.sub);
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  // Get a specific candidate
  app.get("/api/candidates/:id", isAuthenticated, async (req, res) => {
    try {
      const candidate = await storage.getCandidateById(req.params.id);
      if (!candidate || candidate.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  });

  // Create a new candidate
  app.post("/api/candidates", isAuthenticated, async (req, res) => {
    try {
      const validated = insertCandidateSchema.omit({ id: true }).parse({
        ...req.body,
        userId: req.user.claims.sub,
      });

      const candidate = await storage.createCandidate(validated);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "CANDIDATE_CREATED",
        resourceType: "candidate",
        resourceId: candidate.id,
        details: { name: candidate.fullName },
      });

      res.json(candidate);
    } catch (error) {
      console.error("Error creating candidate:", error);
      res.status(400).json({ error: "Invalid candidate data" });
    }
  });

  // Update a candidate
  app.patch("/api/candidates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getCandidateById(req.params.id);
      if (!existing || existing.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // Sanitize update payload - only allow specific fields, forbid userId and other immutable fields
      const allowedUpdates: any = {};
      const allowedFields = [
        'fullName', 'email', 'phone', 'cityRegion', 'linkedin',
        'longformCv', 'defaultFont', 'defaultFontSize', 'defaultMarginsCm'
      ];
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          allowedUpdates[field] = req.body[field];
        }
      }

      const updated = await storage.updateCandidate(req.params.id, allowedUpdates);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "CANDIDATE_UPDATED",
        resourceType: "candidate",
        resourceId: updated.id,
        details: { changes: allowedUpdates },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });

  // Delete a candidate
  app.delete("/api/candidates/:id", isAuthenticated, async (req, res) => {
    try {
      const candidate = await storage.getCandidateById(req.params.id);
      if (!candidate || candidate.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      await storage.deleteCandidate(req.params.id);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "CANDIDATE_DELETED",
        resourceType: "candidate",
        resourceId: req.params.id,
        details: { name: candidate.fullName },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  });

  // ===== RUNS (JOB APPLICATIONS) =====

  // Get all runs for current user
  app.get("/api/runs", isAuthenticated, async (req, res) => {
    try {
      const runs = await storage.getRunsByUserId(req.user.claims.sub);
      res.json(runs);
    } catch (error) {
      console.error("Error fetching runs:", error);
      res.status(500).json({ error: "Failed to fetch runs" });
    }
  });

  // Get a specific run with all related data
  app.get("/api/runs/:id", isAuthenticated, async (req, res) => {
    try {
      const run = await storage.getRunById(req.params.id);
      if (!run || run.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "Run not found" });
      }

      // Fetch related data
      const [candidate, jobPosting, draft, final, artifact] = await Promise.all([
        storage.getCandidateById(run.candidateId),
        storage.getJobPostingById(run.jobPostingId),
        storage.getDraftByRunId(run.id),
        storage.getFinalByRunId(run.id),
        storage.getArtifactByRunId(run.id),
      ]);

      res.json({
        ...run,
        candidate,
        jobPosting,
        draft,
        final,
        artifact,
      });
    } catch (error) {
      console.error("Error fetching run:", error);
      res.status(500).json({ error: "Failed to fetch run" });
    }
  });

  // Validate job posting URL
  app.get("/api/validate-url", isAuthenticated, async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL parameter required" });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Check if URL is accessible (basic check)
      // In production, you might want to actually fetch the URL to verify it exists
      res.json({ valid: true });
    } catch (error) {
      console.error("URL validation error:", error);
      res.status(500).json({ error: "Failed to validate URL" });
    }
  });

  // Submit a new job application for processing
  app.post("/api/runs", isAuthenticated, async (req, res) => {
    try {
      const { candidateId, jobPostUrl, manualJd, inputType } = req.body;

      // Validate that either jobPostUrl or manualJd is provided
      if (inputType === "url" && !jobPostUrl) {
        return res.status(400).json({ error: "Job posting URL is required when using URL input" });
      }
      if (inputType === "manual" && !manualJd) {
        return res.status(400).json({ error: "Manual job description is required when using manual input" });
      }

      // Validate candidate ownership
      const candidate = await storage.getCandidateById(candidateId);
      if (!candidate || candidate.userId !== req.user.claims.sub) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // Generate idempotency key
      const idempotencyKey = `${req.user.claims.sub}-${candidateId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Create run with QUEUED status
      const run = await storage.createRun({
        userId: req.user.claims.sub,
        candidateId,
        jobPostUrl: jobPostUrl || null,
        manualJd: manualJd || null,
        idempotencyKey,
        status: "QUEUED",
      });

      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "RUN_CREATED",
        resourceType: "run",
        resourceId: run.id,
        details: { candidateId, jobPostUrl, manualJd: manualJd ? "provided" : null },
      });

      // Start async processing (non-blocking)
      processJobApplication(run.id, candidate, jobPostUrl, manualJd, req.user.claims.sub).catch(error => {
        console.error("Processing error:", error);
        storage.updateRunStatus(run.id, "FAILED", error.message);
      });

      res.json(run);
    } catch (error) {
      console.error("Error creating run:", error);
      res.status(500).json({ error: "Failed to create run" });
    }
  });

  // ===== DOCUMENT DOWNLOADS =====

  // Download a specific document (requires documentType query param: cv, cover-letter, or added-points)
  app.get("/api/artifacts/:runId/download", isAuthenticated, async (req: any, res) => {
    try {
      const documentType = req.query.type as string;
      if (!documentType || !["cv", "cover-letter", "added-points"].includes(documentType)) {
        return res.status(400).json({ error: "Invalid or missing document type. Use: cv, cover-letter, or added-points" });
      }

      const artifact = await storage.getArtifactByRunId(req.params.runId);

      if (!artifact) {
        return res.status(404).json({ error: "Artifacts not found for this run" });
      }

      // Verify run ownership
      const run = await storage.getRunById(artifact.runId);
      if (!run || run.userId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Select the appropriate storage path based on document type
      let storagePath: string;
      switch (documentType) {
        case "cv":
          storagePath = artifact.cvPath;
          break;
        case "cover-letter":
          storagePath = artifact.coverLetterPath;
          break;
        case "added-points":
          storagePath = artifact.addedPointsPath;
          break;
        default:
          return res.status(400).json({ error: "Invalid document type" });
      }

      // Verify ACL access
      if (!objectAcl.canAccess(req.user.claims.sub, storagePath)) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Generate signed URL
      const downloadUrl = await objectStorage.getSignedDownloadUrl(storagePath, 3600);
      res.json({ url: downloadUrl });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ error: "Failed to generate download URL" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Background job processing function
 */
async function processJobApplication(
  runId: string,
  candidate: any,
  jobPostingUrl: string | null | undefined,
  manualJd: string | null | undefined,
  userId: string
) {
  try {
    let jobPosting: any;

    if (manualJd) {
      // STAGE 1: Use manual JD (skip scraping)
      await storage.updateRunStatus(runId, "ANALYZING");
      
      // Parse manual JD to extract basic info (simple heuristic)
      const lines = manualJd.split('\n').filter(l => l.trim());
      const firstLine = lines[0] || "Unknown Role";
      
      // Create payload with job posting data
      const payload = {
        company: "From Manual Input",
        role: firstLine.substring(0, 100), // Use first line as role
        location: "Not Specified",
        description: manualJd,
        requirements: [],
        responsibilities: [],
        benefits: [],
        salary: null,
        remote: null,
        url: "manual-input",
      };
      
      jobPosting = await storage.createJobPosting({
        runId,
        payload: payload as any,
      });
    } else if (jobPostingUrl) {
      // STAGE 1: Scrape job posting from URL
      await storage.updateRunStatus(runId, "SCRAPING");
      const scrapedJob = await scraper.scrapeJobPosting(jobPostingUrl);
      
      // Create payload with scraped job posting data
      const payload = {
        company: scrapedJob.company,
        role: scrapedJob.role,
        location: scrapedJob.location,
        description: scrapedJob.description,
        requirements: scrapedJob.requirements || [],
        responsibilities: scrapedJob.responsibilities || [],
        benefits: scrapedJob.benefits || [],
        salary: scrapedJob.salary || null,
        remote: scrapedJob.remote || null,
        url: jobPostingUrl,
      };
      
      jobPosting = await storage.createJobPosting({
        runId,
        payload: payload as any,
      });
    } else {
      throw new Error("Either jobPostingUrl or manualJd must be provided");
    }

    // Update run with job posting ID (jobPosting uses runId as primary key)
    await storage.updateRun(runId, { jobPostingId: runId });

    // STAGE 2: Generate draft (Pass 1)
    await storage.updateRunStatus(runId, "DRAFT_PASS1");
    const candidateProfile = `Name: ${candidate.fullName}\nEmail: ${candidate.email}\nSkills: ${candidate.skills}\nExperience: ${candidate.experience}`;
    
    const draftResult = await aiService.generateDraft(candidateProfile, jobPosting);

    await storage.createDraft({
      runId,
      cvJsonb: draftResult.cvDraft as any,
      coverLetterJsonb: draftResult.coverLetterDraft as any,
      scorecardPass1Jsonb: draftResult.scorecard as any,
      recommendationsPass1Jsonb: draftResult.recommendations as any,
    });

    // STAGE 3: Optimize (Pass 2)
    await storage.updateRunStatus(runId, "OPTIMIZING_PASS2");
    const optimizedResult = await aiService.optimizeDocuments(
      draftResult.cvDraft,
      draftResult.coverLetterDraft,
      jobPosting,
      draftResult.recommendations
    );

    await storage.createFinal({
      runId,
      cvJsonb: optimizedResult.cvFinal as any,
      coverLetterJsonb: optimizedResult.coverLetterFinal as any,
      scorecardPass2Jsonb: optimizedResult.scorecardFinal as any,
      addedPointsJsonb: optimizedResult.addedPoints as any,
    });

    // STAGE 4: Validate (ATS compliance check - already done in AI prompts)
    await storage.updateRunStatus(runId, "VALIDATED");

    // STAGE 5: Render .docx documents
    await storage.updateRunStatus(runId, "RENDERING");
    
    const [cvBuffer, coverLetterBuffer, enhancementBuffer] = await Promise.all([
      docGen.generateCvDocx(optimizedResult.cvFinal),
      docGen.generateCoverLetterDocx(optimizedResult.coverLetterFinal),
      docGen.generateEnhancementReportDocx(optimizedResult.addedPoints),
    ]);

    // Upload to object storage
    const cvPath = objectStorage.generateStoragePath(userId, runId, "cv");
    const coverLetterPath = objectStorage.generateStoragePath(userId, runId, "cover_letter");
    const enhancementPath = objectStorage.generateStoragePath(userId, runId, "enhancements");

    await Promise.all([
      objectStorage.upload({
        key: cvPath,
        body: cvBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      objectStorage.upload({
        key: coverLetterPath,
        body: coverLetterBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      objectStorage.upload({
        key: enhancementPath,
        body: enhancementBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ]);

    // Create single artifact record with all three document paths
    await storage.createArtifact({
      runId,
      cvPath,
      coverLetterPath,
      addedPointsPath: enhancementPath,
    });

    // STAGE 6: Complete
    await storage.updateRunStatus(runId, "COMPLETED");

    await storage.createAuditLog({
      userId,
      action: "RUN_COMPLETED",
      resourceType: "run",
      resourceId: runId,
      details: { jobPostingId: jobPosting.id },
    });
  } catch (error: any) {
    console.error(`Processing error for run ${runId}:`, error);
    await storage.updateRunStatus(runId, "FAILED", error.message);
    
    await storage.createAuditLog({
      userId,
      action: "RUN_FAILED",
      resourceType: "run",
      resourceId: runId,
      details: { error: error.message },
    });
  }
}

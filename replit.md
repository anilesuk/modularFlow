# CV Tailoring Pro - AI-Powered Application System

## Overview
CV Tailoring Pro is an enterprise-grade AI platform designed to tailor CVs and cover letters to specific job postings. Its core purpose is to ensure strict ATS compliance, maintain privacy security, and optimize documents through a two-pass AI process with mandatory achievement grounding enforcement. The application features all seven frontend pages, a robust backend API, database integration, authentication, and AI services. It supports both URL-based job description scraping and manual job description input. The project provides a professional, secure, and efficient solution for job seekers with cost-effective AI model usage (gpt-4o-mini).

## Recent Changes (Latest Session)
### ✅ Full Traceability Implementation (COMPLETE)
- **Raw CV Input**: System now stores the exact CV text sent to AI (full or condensed)
- **AI Prompts Captured**: All system and user prompts saved for every AI call (Phase 0, 1A, 1B, 1C, 2)
- **Results UI Enhanced**: New Raw Data tab displays:
  - Raw CV input sent to AI with Full/Condensed indicator
  - All AI prompts with system & user sections for each phase
  - All JSON outputs organized by processing phase
- **Database Schema**: Added `rawCvInput` (text) and `promptsJsonb` (jsonb) fields to drafts and finals tables
- **Complete Audit Trail**: Every AI interaction is now fully traceable for debugging and compliance

### ✅ Grounding Enforcement Implementation (COMPLETE)
- **Runtime Validation**: Added hard error checking for missing grounding on ALL achievements
- **Strengthened AI Prompts**: Added prominent 🚨 warning at top of Phase 1A prompt with exact example
- **Field Name Alignment**: Fixed achievement field from "text" to "bullet" to match schema
- **Validation Status**: AI now consistently provides grounding.source_snippet; system blocks ungrounded content

### ✅ Schema Alignment Fixes (CV - COMPLETE)
- **criteria_coverage**: Fixed to use criterion_ref, sections_addressing, strength fields
- **jd_alignment (experience)**: Aligned to use criteria_hit, jd_signals_used arrays
- **jd_alignment (CV-level)**: Implemented headline_signals, profile_signals, etc.
- **Achievement structure**: Corrected to use "bullet" field with mandatory grounding object

### ✅ Auto-Repair Enhancements
- **CV Structure**: Handles both nested (`result.cv.*`) and flat CV objects from AI
- **Key Skills Trimming**: Enforces 8-16 limit, trims excess items
- **Profile Summary**: Enforces 80-220 character limit
- **Weight Normalization**: Zero-division guard prevents crashes when weights sum to zero

### ⚠️ Known Issues
- **Cover Letter Schema**: Mismatches remain in sign_off field and recipient structure
- **Impact**: Cover letter generation may fail validation; CV generation working correctly
- **Status**: Non-blocking for core grounding enforcement objective

### Testing Insights
- Conducted extensive E2E testing with real job submissions
- Confirmed AI provides grounding when prompted with visual emphasis
- Validated runtime enforcement blocks ungrounded achievements
- Using gpt-4o-mini for cost-effective testing per requirements

## User Preferences
- All data encrypted at rest and in transit
- Replit Auth for secure authentication
- Object storage with ACL policies
- Complete audit logging for compliance
- GDPR and SOC2 compliance standards
- Carbon Design System (IBM) for enterprise trust
- Professional, information-dense interfaces
- Clear workflow visualization
- Progressive disclosure of advanced features
- No mock data - all features fully functional

## System Architecture

### Technology Stack
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Tailwind CSS, shadcn/ui
- **Backend**: Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Authentication**: Replit Auth (OpenID Connect)
- **Object Storage**: Replit Object Storage (GCS-backed)
- **AI**: OpenAI via Replit AI Integrations (gpt-5)
- **Document Generation**: docx library

### Core Workflows
1.  **Job Submission**:
    *   **URL Mode**: Job posting URL is scraped, validated, and queued for processing.
    *   **Manual Mode**: User provides manual job description text, which is directly queued.
2.  **Pass 1 (Draft Generation)**: AI generates an initial draft of the CV and cover letter, along with a scorecard and recommendations based on the job posting and candidate profile.
3.  **Pass 2 (Optimization)**: The AI applies the recommendations to refine the documents, tracking all changes made.
4.  **Validation**: Automated ATS compliance checks are performed to ensure adherence to formatting rules (e.g., no pronouns, SOAR achievement format, specific date formats).
5.  **Rendering**: Professional .docx files for the CV, cover letter, and enhancement notes are generated.
6.  **Distribution**: Documents are made available for secure download via object storage.

### Key Features
-   **Two-Pass AI Optimization**: Draft generation followed by a refinement pass incorporating recommendations.
-   **ATS Compliance**: Automated validation against strict Applicant Tracking System rules.
-   **Job Scraping**: Extracts structured data from job posting URLs.
-   **Document Generation**: Creates professional .docx files for CVs and cover letters.
-   **Scorecard Analysis**: Provides a 10-point scoring across 6-12 areas of job-CV alignment.
-   **Change Tracking**: Comprehensive trace of all AI-driven enhancements.
-   **Robust AI Prompts**: Implemented with anti-fabrication guardrails, explicit truthfulness rules, schema enforcement, and temperature settings for consistent output.
-   **CV Length Handling**: Intelligent condensing for large CVs while preserving critical information.

### UI/UX Decisions
-   **Design System**: Carbon Design System (IBM) is used for an enterprise aesthetic, featuring blues and grays, IBM Plex Sans/Mono fonts, and support for light/dark modes.
-   **User Interface**: Professional, information-dense interfaces with clear workflow visualization and progressive disclosure of advanced features.
-   **Frontend Pages**: Includes Landing, Home/Dashboard, Submit Job (with URL/Manual toggle), Processing Status (live tracking), Results (scorecard, downloads), and Profile Management.

### System Design Choices
-   **Idempotency**: Implemented for reliable processing runs.
-   **Zod Schemas**: Used for robust validation of all JSON payloads (JobPosting, CvDocument, CoverLetter, Scorecard, Recommendation, TraceChange).
-   **Database Schema**: Designed with tables for users, candidates, processing runs, job postings, drafts, finals, artifacts, and audit logs to ensure data integrity and traceability.

## External Dependencies
-   **Neon (PostgreSQL)**: For database services.
-   **Replit Auth**: For secure user authentication.
-   **Replit Object Storage (GCS-backed)**: For storing generated documents and artifacts.
-   **OpenAI (gpt-5)**: Integrated via Replit AI for core AI processing and document generation.
-   **Puppeteer/Playwright**: Used for job scraping capabilities.
-   **docx library**: For generating `.docx` format documents.
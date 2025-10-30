# CV Tailoring Pro - AI-Powered Application System

## Overview
CV Tailoring Pro is an enterprise-grade AI platform designed to tailor CVs and cover letters to specific job postings. Its core purpose is to ensure strict ATS compliance, maintain privacy security, and optimize documents through a two-pass AI process with mandatory achievement grounding enforcement. The application features all seven frontend pages, a robust backend API, database integration, authentication, and AI services. It supports both URL-based job description scraping and manual job description input. The project provides a professional, secure, and efficient solution for job seekers with cost-effective AI model usage (gpt-4o-mini).

## Recent Changes (Latest Session)
### ✅ Enhanced JD Specification Schema (COMPLETE - Current Session)
- **New Optional Fields Added to JD Spec** (backward compatible):
  - `qualifications`: Educational/certification requirements extracted from JD
  - `experience`: Specific experience requirements (NO condensing per requirements)
  - `success_for_role`: What success looks like in the role
  - `why_this_company`: Company mission, vision, and selling points
  - `responsibilities`: Full detailed list (NO condensing - already existed, remains required)
- **AI Prompt Updated**: Phase 0 prompt instructs AI to populate all fields with FULL DETAIL
- **Schema Design**: New fields marked optional for backward compatibility with existing runs
- **Tested**: E2E testing confirms AI generates all 5 new fields with comprehensive detail

### ✅ Evaluation Criteria Target: Exactly 7 Items (COMPLETE - Current Session)
- **AI Prompt Enforcement**: Phase 0 system prompt explicitly states "EXACTLY 7 criteria (not 4-7, EXACTLY 7)"
- **Schema Validation**: Kept as `.min(4).max(7)` for backward compatibility with historical runs
- **Example Provided**: AI prompt includes 7-criteria example with weights summing to 100%
- **Auto-Repair**: Weight normalization ensures sum equals 100% even if AI makes rounding errors
- **Tested**: Confirmed AI consistently generates exactly 7 evaluation criteria with weights summing to 100%
- **Design**: Soft enforcement via prompts; old runs with 4-6 criteria remain valid

### ✅ Manual JD Input Fix (COMPLETE - Current Session)
- **Bug Fixed**: Manual JD payload now uses correct nested structure matching scraped jobs
- **Structure**: `company.name`, `role.title`, `description.clean_text` properly populated
- **Tested**: Phase 0 prompts now display full manual job description text correctly

### ✅ Full Traceability Implementation (COMPLETE - Previous Session)
- **Raw CV Input**: System stores exact CV text sent to AI (full or condensed)
- **AI Prompts Captured**: All system and user prompts saved for every AI call (Phase 0, 1A, 1B, 1C, 2)
- **Results UI Enhanced**: Raw Data tab displays raw CV input, all AI prompts, and all JSON outputs
- **Database Schema**: Added `rawCvInput` (text) and `promptsJsonb` (jsonb) fields
- **Complete Audit Trail**: Every AI interaction fully traceable for debugging and compliance

### ✅ Grounding Enforcement Implementation (COMPLETE - Previous Session)
- **Runtime Validation**: Hard error checking for missing grounding on ALL achievements
- **Strengthened AI Prompts**: Prominent 🚨 warning at top of Phase 1A prompt with exact example
- **Field Name Alignment**: Fixed achievement field from "text" to "bullet" to match schema
- **Validation Status**: AI consistently provides grounding.source_snippet; system blocks ungrounded content

### ✅ All Experiences Enforcement (COMPLETE - Current Session)
- **Issue**: AI was only generating 1 experience entry for 28-year career
- **Prominent Warning Section**: Added critical warning box with side-by-side examples (wrong vs correct)
- **JSON Example Updated**: Shows 4 experience entries instead of 1 to guide AI
- **Authoritative Baseline Validation**: Parses candidate profile to count expected roles before AI generation
- **Dual Validation**: Checks both profile-based count (90% threshold) and career-span-based expectations
- **Null Date Handling**: Treats null to_year as current year for ongoing roles
- **Clear Error Messages**: Specific errors indicating missing career history
- **Status**: Tested with production-like data

### ✅ CV Experience and Profile Summary Updates (COMPLETE - Current Session)
- **All Experiences Included**: Removed 10-12 year restriction; ALL experiences now appear in reverse chronological order
- **Variable Achievement Counts**: 
  - Most recent role: 5-7 bullets
  - Second role: 3-5 bullets
  - Older roles: 2 bullets each
- **Profile Summary**: Changed from 80-220 characters to 95-125 WORDS (adjusted for AI model reliability)
- **Validation**: 3-layer enforcement (AI prompts + runtime checks + Zod schema refinement)
- **Schema Safety**: Zod refine() validates word count at schema level; runtime checks in Phase 1A and Phase 2
- **Pragmatic Range**: 95-125 words provides buffer for consistent AI generation while maintaining quality

### ⚠️ Known Issues
- **Cover Letter Schema**: Mismatches remain in sign_off field and recipient structure
- **Impact**: Cover letter generation may fail validation; CV generation working correctly
- **Status**: Non-blocking for core functionality

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
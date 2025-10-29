# CV Tailoring Pro - AI-Powered Application System

## Project Overview

**Purpose**: Enterprise-grade AI platform for tailoring CVs and cover letters to specific job postings with strict ATS compliance, privacy security, and two-pass optimization.

**Current State**: Full application completed with all 7 pages, backend API, database, auth, and AI services. Manual JD input feature added. End-to-end testing passed for both URL scraping and manual job description submission flows.

---

## Recent Changes

### 2025-10-29 - CRITICAL FIX: AI Hallucination Bug ✅
- **Problem Fixed**: AI was generating completely fictional work experiences instead of using candidate's actual CV data
  - Generated CVs contained made-up companies like "ABC Logistics Ltd" and "TechSense Solutions"
  - Job titles and achievements were fabricated, not based on candidate's real career history
  - User submitted Chief Data Officer JD but received CV with Operations Manager experiences

- **Root Cause**: In `server/routes.ts` line 392, candidateProfile was constructed using non-existent database fields:
  ```typescript
  // WRONG - these fields don't exist in schema!
  const candidateProfile = `Name: ${candidate.fullName}\nEmail: ${candidate.email}\nSkills: ${candidate.skills}\nExperience: ${candidate.experience}`;
  ```
  - `candidate.skills` and `candidate.experience` don't exist in the candidates table schema
  - Both values were `undefined`, giving AI almost no real candidate data
  - AI hallucinated fictional experiences to fill the gaps

- **Solution**: Updated candidateProfile to use actual schema fields including complete longformCv:
  ```typescript
  const candidateProfile = `
  CANDIDATE CONTACT INFORMATION:
  Name: ${candidate.fullName}
  Email: ${candidate.email}
  Phone: ${candidate.phone || 'Not provided'}
  Location: ${candidate.cityRegion || 'Not provided'}
  LinkedIn: ${candidate.linkedin || 'Not provided'}
  
  CANDIDATE'S COMPLETE CV / CAREER HISTORY:
  ${candidate.longformCv}
  `.trim();
  ```

- **Testing**: End-to-end test with realistic Chief Data Officer candidate confirmed fix:
  - ✅ Generated CV contains actual candidate name "Dr. Sarah Johnson" (not fictional names)
  - ✅ Real employers: "FinTech Global Ltd", "HealthCare Systems PLC", "Retail Analytics Corp"
  - ✅ Real job titles: "Chief Data Officer", "VP Data & Analytics", "Senior Data Scientist"
  - ✅ Real achievements: fraud detection, AWS platform, NHS analytics
  - ✅ NO hallucinated companies or experiences

- **Architect Review**: PASS - Fix eliminates hallucination by providing full CV data to AI instead of undefined fields

### 2025-10-29 - AI Schema Validation Fixes ✅
- **Problem Fixed**: Manual JD submissions were failing with "Processing Failed" errors
  - AI was generating profile_summary with 294 chars (max 220)
  - AI was generating 19 key_skills items (max 16)
  - AI was generating fewer than 4 scorecard items (min 4)

- **Solution**: Updated AI prompts in both `generateDraft` and `optimizeDocuments`:
  - Added CRITICAL FIELD LENGTH CONSTRAINTS section to system prompts
  - Explicitly stated: profile_summary (80-220 chars), key_skills (8-16 items), scorecard (4-12 items)
  - Updated user prompt examples to show compliant output (4+ scorecard items, clear character/item limits)
  - Reinforced constraints with comments like "MUST be 80-220 characters (no more than 220!)"

- **Testing**: End-to-end test passed successfully
  - Manual JD submission completes all pipeline stages (QUEUED → ANALYZING → DRAFT → OPTIMIZING → VALIDATING → RENDERING → COMPLETED)
  - Scorecard generates with 6 items (within 4-12 range)
  - All schema validations pass without errors

- **Architect Review**: PASS - Prompts now explicitly convey all schema limits and prevent validation failures

### 2025-01-29 - Document Generation Complete ✅
- **Word Document Generation Fixes**:
  - Completely rewrote `server/docGen.ts` to match new CV and cover letter schemas
  - Added missing `earlier_career_summary` section to CV generation
  - Added complete candidate header to cover letters (name, contact block with line breaks, city/region)
  - Fixed certifications to handle both string and object {name, year} formats
  - All schema fields now properly rendered in .docx output
  - Architect review: PASS - all fields covered with correct formatting

- **CV Document Fields**:
  - Header: full_name, city_region, phone, email, linkedin
  - Headline, profile_summary, key_skills, technical_skills
  - Professional experience with SOAR achievements
  - Earlier career summary (title + employer)
  - Education, certifications, publications
  - Optional sections: languages, awards, memberships

- **Cover Letter Fields**:
  - Candidate header with multi-line contact block
  - Date, recipient address, subject line
  - Dynamic greeting based on recipient name
  - All paragraphs: opening, alignment, fit_evidence, closing
  - Professional sign-off

### 2025-01-29 - Manual JD Input Feature Complete ✅
- **New Feature**: Added manual job description input as alternative to URL scraping
  - Radio toggle on Submit page: "URL" vs "Manual Input"
  - Conditional form rendering based on selection
  - Backend handles both `jobPostUrl` OR `manualJd` submission paths
  - Validation for both input types
  
- **Database Schema Fixes**:
  - Added `userId` field to runs table for proper ownership tracking
  - Added `jobPostingId` field to runs table for job posting reference
  - Added `manualJd` field to runs table (TEXT, nullable)
  - Made `jobPostUrl` nullable (only one of URL or manual required)
  - Increased `idempotencyKey` from VARCHAR(64) to VARCHAR(128)
  - Fixed jobPostings table query to use `runId` as primary key

- **Backend Implementation**:
  - Fixed `apiRequest` call signature in frontend (method, url, data)
  - Added GET `/api/validate-url` endpoint for URL validation
  - Updated `processJobApplication` to branch on URL vs manual JD
  - Manual JD skips scraping, goes straight to ANALYZING status
  - Fixed `getJobPostingById` to query by `runId` (not `id`)

- **Testing**: End-to-end tests passed for both URL and manual JD flows
  - Profile creation → Manual JD submission → Status tracking ✅
  - Run creation, retrieval, and processing all working correctly
  - Architect review: PASS with no critical issues

### 2025-01-28 - Phase 1: Schema & Frontend Complete
- **Data Models**: Complete schema defined in `shared/schema.ts` with all required tables:
  - User authentication (Replit Auth integration)
  - Candidate profiles with long-form CVs
  - Processing runs with idempotency
  - Job postings, drafts, finals, artifacts
  - Audit logging for compliance
  - Zod schemas for all JSON payloads (JobPosting, CvDocument, CoverLetter, Scorecard, Recommendation, TraceChange)

- **Design System**: Carbon Design System (IBM) configured in `tailwind.config.ts` and `index.css`
  - Professional enterprise aesthetic with blues and grays
  - IBM Plex Sans/Mono fonts
  - Light and dark mode support
  - Trust and security focused color palette

- **Frontend Pages** (all built with proper TypeScript, data-testid attributes, and responsive design):
  1. **Landing Page**: Public page with security badges, features overview, call-to-action
  2. **Home/Dashboard**: Stats overview, recent applications grid, status badges
  3. **Submit Job**: Form with candidate selection, URL validation, process preview
  4. **Processing Status**: Live progress tracking with timeline, auto-refresh, error handling
  5. **Results**: Scorecard comparison, enhancement tracking, document downloads
  6. **Profile Management**: CRUD for candidate profiles with long-form CVs

- **Shared Components**:
  - `Layout.tsx`: Header with navigation, user menu, footer
  - `useAuth.ts`: Authentication hook
  - `authUtils.ts`: Utility functions

---

## User Preferences

### Security Requirements
- All data encrypted at rest and in transit
- Replit Auth for secure authentication
- Object storage with ACL policies
- Complete audit logging for compliance
- GDPR and SOC2 compliance standards

### Design Preferences
- Carbon Design System (IBM) for enterprise trust
- Professional, information-dense interfaces
- Clear workflow visualization
- Progressive disclosure of advanced features
- No mock data - all features fully functional

---

## Project Architecture

### Technology Stack
- **Frontend**: React + TypeScript + Wouter + TanStack Query + Tailwind CSS + shadcn/ui
- **Backend**: Express + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Auth**: Replit Auth (OpenID Connect)
- **Storage**: Replit Object Storage (GCS-backed)
- **AI**: OpenAI via Replit AI Integrations (gpt-5)
- **Documents**: docx library for .docx generation

### Core Workflows
1. **Job Submission**: 
   - **URL Mode**: URL → Scraping → Validation → Queue
   - **Manual Mode**: Paste JD text → Direct to Queue (skip scraping)
2. **Pass 1 (Draft)**: AI generates draft CV/CL + scorecard + recommendations
3. **Pass 2 (Optimization)**: Apply recs, refine, track changes
4. **Validation**: ATS compliance checks (no pronouns, SOAR format, formatting)
5. **Rendering**: Generate professional .docx files
6. **Distribution**: Secure download via object storage

### Key Features
- **Two-Pass AI Optimization**: Draft → Scorecard → Recommendations → Final refined version
- **ATS Compliance**: Automated validation ensuring all formatting rules met
- **Job Scraping**: Extract structured data from any job posting URL
- **Document Generation**: Professional .docx files (CV, cover letter, enhancement notes)
- **Scorecard Analysis**: 10-point scoring across 6-12 job-CV alignment areas
- **Change Tracking**: Complete trace of all enhancements made

---

## Database Schema

Key tables:
- `users` - Replit Auth user accounts
- `candidates` - CV profiles with long-form career data
- `runs` - Processing jobs with status tracking (includes userId, jobPostingId, jobPostUrl OR manualJd)
- `job_postings` - Scraped and normalized job data (JSONB, uses runId as primary key)
- `drafts` - Pass 1 outputs (JSONB)
- `finals` - Pass 2 outputs (JSONB)
- `artifacts` - Generated .docx file paths
- `audit_logs` - Security and compliance tracking

---

## Next Steps

### Phase 2: Backend Implementation
- [ ] Database setup and migrations
- [ ] Replit Auth integration
- [ ] Object storage configuration
- [ ] AI service with OpenAI (gpt-5)
- [ ] Job scraping service (Puppeteer/Playwright)
- [ ] Document generation service (docx library)
- [ ] All API endpoints in server/routes.ts
- [ ] Idempotency and error handling

### Phase 3: Integration & Testing
- [ ] Connect frontend to backend APIs
- [ ] End-to-end data flow testing
- [ ] Security features validation
- [ ] Audit logging verification
- [ ] Performance optimization
- [ ] Production deployment

---

## Important Files

### Frontend
- `client/src/App.tsx` - Main app with routing
- `client/src/pages/` - All page components
- `client/src/components/Layout.tsx` - Shared layout
- `client/src/hooks/useAuth.ts` - Authentication
- `design_guidelines.md` - UI/UX standards

### Backend (to be built)
- `server/routes.ts` - API endpoints
- `server/db.ts` - Database connection
- `server/storage.ts` - Storage interface
- `server/replitAuth.ts` - Authentication
- `server/objectStorage.ts` - File storage
- `server/ai.ts` - OpenAI integration
- `server/scraper.ts` - Job scraping
- `server/generator.ts` - Document generation

### Shared
- `shared/schema.ts` - Database and JSON schemas

---

## Development Guidelines

Follow guidelines in `design_guidelines.md` for all frontend work:
- Carbon Design System aesthetic
- IBM Plex fonts
- Trust & security visual language
- Information density for productivity
- Proper data-testid attributes
- Responsive design
- Accessibility standards

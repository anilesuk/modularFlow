# CV Tailoring Pro - AI-Powered Application System

## Project Overview

**Purpose**: Enterprise-grade AI platform for tailoring CVs and cover letters to specific job postings with strict ATS compliance, privacy security, and two-pass optimization.

**Current State**: Phase 1 (Schema & Frontend) completed. All data models defined, Carbon Design System configured, and complete frontend built with 6 pages and shared components.

---

## Recent Changes

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
1. **Job Submission**: URL → Scraping → Validation → Queue
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
- `runs` - Processing jobs with status tracking
- `job_postings` - Scraped and normalized job data (JSONB)
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

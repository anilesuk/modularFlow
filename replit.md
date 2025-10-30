# CV Tailoring Pro - AI-Powered Application System

## Overview
CV Tailoring Pro is an enterprise-grade AI platform designed to tailor CVs and cover letters to specific job postings. Its core purpose is to ensure strict ATS compliance, maintain privacy security, and optimize documents through a two-pass AI process with mandatory achievement grounding enforcement. The application features all seven frontend pages, a robust backend API, database integration, authentication, and AI services. It supports both URL-based job description scraping and manual job description input, providing a professional, secure, and efficient solution for job seekers with cost-effective AI model usage (gpt-4o-mini).

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
- **Database**: PostgreSQL
- **Authentication**: Replit Auth (OpenID Connect)
- **Object Storage**: Replit Object Storage (GCS-backed)
- **AI**: OpenAI via Replit AI Integrations (gpt-5)
- **Document Generation**: Puppeteer (for PDF)

### Core Workflows
1.  **Job Submission**: Supports both URL-based job description scraping and manual input.
2.  **Pass 1 (Draft Generation)**: AI generates initial CV and cover letter drafts, a scorecard, and recommendations.
3.  **Pass 2 (Optimization)**: AI refines documents based on recommendations, tracking changes.
4.  **Validation**: Automated ATS compliance checks are performed.
5.  **Rendering**: Professional PDF files for CV, cover letter, and enhancement notes are generated.
6.  **Distribution**: Documents are made available for secure download via object storage or database fallback.

### Key Features
-   **Two-Pass AI Optimization**: Draft generation followed by refinement with guaranteed score improvement.
-   **Score Improvement Guarantee**: Phase 2 optimization now includes Phase 1 baseline scores in the prompt, ensuring the AI understands it's evaluating its own improvements. Explicit prompt rules enforce that scores should increase (or maintain) when recommendations are applied, never decrease.
-   **ATS Compliance**: Automated validation against strict rules.
-   **Job Scraping**: Extracts structured data from job posting URLs.
-   **Document Generation**: Creates professional PDF files with antivirus-resistant metadata sanitization.
-   **Scorecard Analysis**: Provides a 10-point scoring across job-CV alignment.
-   **Change Tracking**: Comprehensive trace of all AI-driven enhancements.
-   **Robust AI Prompts**: Implemented with anti-fabrication guardrails, truthfulness rules, schema enforcement, and temperature settings.
-   **CV Length Handling**: Intelligent condensing for large CVs.
-   **Achievement Grounding Enforcement**: Mandatory grounding for all achievements.
-   **Configurable CV Generation**: Word count limits for sections (e.g., Key Skills, Technical Skills, Profile Summary) are configurable.
-   **Full Traceability**: Stores raw CV input, all AI prompts, and JSON outputs for audit.
-   **Database Fallback**: Documents are stored in object storage, with bytea storage in the database as a fallback.
-   **User-Specific CV Preferences**: Stores and applies user preferences for CV generation.
-   **Validation Logging**: Detailed diagnostic logging when Phase 2 scores decrease, showing which criteria regressed.

### UI/UX Decisions
-   **Design System**: Carbon Design System (IBM) for an enterprise aesthetic, featuring blues, grays, IBM Plex Sans/Mono fonts, and light/dark modes.
-   **User Interface**: Professional, information-dense interfaces with clear workflow visualization and progressive disclosure.
-   **Frontend Pages**: Includes Landing, Home/Dashboard, Submit Job, Processing Status, Results, and Profile Management.

### System Design Choices
-   **Idempotency**: Implemented for reliable processing runs.
-   **Zod Schemas**: Used for robust validation of all JSON payloads.
-   **Database Schema**: Designed with tables for users, candidates, processing runs, job postings, drafts, finals, artifacts, and audit logs.
-   **PDF Generation**: Migrated from DOCX to PDF using Puppeteer for improved reliability and professional rendering.

## External Dependencies
-   **Neon (PostgreSQL)**: For database services.
-   **Replit Auth**: For secure user authentication.
-   **Replit Object Storage (GCS-backed)**: For storing generated documents and artifacts.
-   **OpenAI (gpt-5)**: Integrated via Replit AI for core AI processing.
-   **Puppeteer**: Used for HTML-to-PDF conversion and job scraping capabilities.
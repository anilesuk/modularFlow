#!/usr/bin/env tsx
/**
 * Migration script to transform existing CV and Cover Letter data
 * to match the official schema definitions
 * 
 * Run with: npx tsx scripts/migrate-cv-schema.ts
 */

import { db } from '../server/db';
import { drafts, finals } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface OldCvFormat {
  contact?: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
  };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    company: string;
    role: string;
    years: string;
    highlights?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    years: string;
  }>;
  certifications?: string[];
}

interface OldCoverLetterFormat {
  greeting?: string;
  opening?: string;
  body?: string;
  closing?: string;
  signature?: string;
}

function transformCv(oldCv: OldCvFormat | any): any {
  // If it already has the new structure, return as-is
  if (oldCv.header && oldCv.profile_summary && oldCv.key_skills) {
    return oldCv;
  }

  // Transform old structure to new structure
  const nameParts = (oldCv.contact?.name || "Unknown").split(' ');
  const fullName = oldCv.contact?.name || "Unknown";
  
  return {
    header: {
      full_name: fullName,
      city_region: oldCv.contact?.location || undefined,
      phone: oldCv.contact?.phone || undefined,
      email: oldCv.contact?.email || "email@example.com",
      linkedin: undefined,
    },
    headline: "Professional",
    profile_summary: oldCv.summary || "Professional with diverse experience",
    key_skills: oldCv.skills?.slice(0, 12) || [],
    technical_skills: oldCv.skills?.join(', ') || "",
    experience: (oldCv.experience || []).map((exp: any) => {
      // Parse years like "2020-2023" into from_year and to_year
      const yearMatch = exp.years?.match(/(\d{4})-(\d{4}|Present)/);
      const fromYear = yearMatch ? parseInt(yearMatch[1]) : 2020;
      const toYear = yearMatch && yearMatch[2] !== 'Present' ? parseInt(yearMatch[2]) : null;
      
      return {
        employer: exp.company || "Company",
        location: undefined,
        title: exp.role || "Professional",
        dates: {
          from_year: fromYear,
          to_year: toYear,
        },
        overview: "Professional role",
        achievements: (exp.highlights || []).map((h: string) => ({
          bullet: h,
          situation: undefined,
          obstacle: undefined,
          action: undefined,
          result: undefined,
        })),
      };
    }),
    education: (oldCv.education || []).map((edu: any) => ({
      qualification: edu.degree || "Degree",
      institution: edu.institution || "University",
      city_country: undefined,
    })),
    certifications: oldCv.certifications || [],
    optional_sections: undefined,
  };
}

function transformCoverLetter(oldCl: OldCoverLetterFormat | any): any {
  // If it already has the new structure, return as-is
  if (oldCl.header && oldCl.meta && oldCl.paragraphs) {
    return oldCl;
  }

  // Transform old structure to new structure
  return {
    header: {
      full_name: "Candidate Name",
      contact_block: "Email | Phone | Location",
      city_region: undefined,
    },
    meta: {
      date_iso: new Date().toISOString().split('T')[0],
      recipient: {
        name: undefined,
        title: undefined,
        company: undefined,
        address: undefined,
      },
      subject: "Re: Application",
    },
    paragraphs: {
      opening: oldCl.opening || oldCl.greeting || "",
      alignment: oldCl.body || "",
      fit_evidence: "",
      closing: oldCl.closing || "",
    },
    sign_off: {
      closing: "Yours sincerely",
      name: oldCl.signature || "Candidate Name",
    },
  };
}

async function migrateData() {
  console.log("Starting CV schema migration...\n");

  // Get all drafts
  const allDrafts = await db.query.drafts.findMany();
  console.log(`Found ${allDrafts.length} draft records`);

  let draftsMigrated = 0;
  for (const draft of allDrafts) {
    try {
      const newCv = transformCv(draft.cvJsonb);
      const newCoverLetter = transformCoverLetter(draft.coverLetterJsonb);

      await db.update(drafts)
        .set({
          cvJsonb: newCv as any,
          coverLetterJsonb: newCoverLetter as any,
        })
        .where(eq(drafts.runId, draft.runId));

      draftsMigrated++;
      console.log(`✓ Migrated draft for run ${draft.runId}`);
    } catch (error) {
      console.error(`✗ Failed to migrate draft for run ${draft.runId}:`, error);
    }
  }

  // Get all finals
  const allFinals = await db.query.finals.findMany();
  console.log(`\nFound ${allFinals.length} final records`);

  let finalsMigrated = 0;
  for (const final of allFinals) {
    try {
      const newCv = transformCv(final.cvJsonb);
      const newCoverLetter = transformCoverLetter(final.coverLetterJsonb);

      await db.update(finals)
        .set({
          cvJsonb: newCv as any,
          coverLetterJsonb: newCoverLetter as any,
        })
        .where(eq(finals.runId, final.runId));

      finalsMigrated++;
      console.log(`✓ Migrated final for run ${final.runId}`);
    } catch (error) {
      console.error(`✗ Failed to migrate final for run ${final.runId}:`, error);
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Drafts migrated: ${draftsMigrated}/${allDrafts.length}`);
  console.log(`   Finals migrated: ${finalsMigrated}/${allFinals.length}`);

  process.exit(0);
}

migrateData().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

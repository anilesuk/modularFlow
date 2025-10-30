/**
 * CV Generation Configuration
 * 
 * This file contains all configurable parameters for CV generation.
 * Users can modify these values to customize the output format.
 */

import { db } from "@db";
import { candidates } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface CvSectionConfig {
  minWords: number;
  maxWords: number;
}

export interface CvGenerationConfig {
  // Profile summary
  profileSummary: CvSectionConfig;
  
  // Skills sections (now prose format instead of lists)
  keySkills: CvSectionConfig;
  technicalSkills: CvSectionConfig;
  
  // Experience sections
  experience: {
    // Number of achievement bullets per role
    mostRecentRole: {
      minBullets: number;
      maxBullets: number;
    };
    secondRole: {
      minBullets: number;
      maxBullets: number;
    };
    olderRoles: {
      bulletsPerRole: number;
    };
  };
  
  // Evaluation criteria
  evaluationCriteria: {
    exactCount: number; // Must be exactly this many criteria
  };
}

/**
 * Default CV generation configuration
 * These values match the current system requirements
 */
export const defaultCvConfig: CvGenerationConfig = {
  profileSummary: {
    minWords: 95,
    maxWords: 125,
  },
  
  keySkills: {
    minWords: 60,
    maxWords: 80,
  },
  
  technicalSkills: {
    minWords: 60,
    maxWords: 100,
  },
  
  experience: {
    mostRecentRole: {
      minBullets: 5,
      maxBullets: 7,
    },
    secondRole: {
      minBullets: 3,
      maxBullets: 5,
    },
    olderRoles: {
      bulletsPerRole: 2,
    },
  },
  
  evaluationCriteria: {
    exactCount: 7,
  },
};

/**
 * Get the CV configuration for a specific candidate
 * Loads user preferences from database if available, otherwise returns defaults
 */
export async function getCvConfig(candidateId?: string): Promise<CvGenerationConfig> {
  // If no candidateId provided, return defaults
  if (!candidateId) {
    return defaultCvConfig;
  }

  try {
    // Load candidate preferences from database
    const [candidate] = await db
      .select({ cvPreferences: candidates.cvPreferences })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    // If candidate doesn't exist or has no preferences, return defaults
    if (!candidate?.cvPreferences) {
      return defaultCvConfig;
    }

    // Merge user preferences with defaults (in case user has partial preferences)
    const userPrefs = candidate.cvPreferences as Partial<CvGenerationConfig>;
    return {
      profileSummary: userPrefs.profileSummary || defaultCvConfig.profileSummary,
      keySkills: userPrefs.keySkills || defaultCvConfig.keySkills,
      technicalSkills: userPrefs.technicalSkills || defaultCvConfig.technicalSkills,
      experience: userPrefs.experience || defaultCvConfig.experience,
      evaluationCriteria: userPrefs.evaluationCriteria || defaultCvConfig.evaluationCriteria,
    };
  } catch (error) {
    console.error('Error loading CV config from database:', error);
    // Fall back to defaults on error
    return defaultCvConfig;
  }
}

/**
 * Helper function to get word count range string for prompts
 */
export function getWordCountRange(section: CvSectionConfig): string {
  return `${section.minWords}-${section.maxWords} words`;
}

/**
 * Helper function to get bullet count range string for prompts
 */
export function getBulletCountRange(min: number, max: number): string {
  if (min === max) return `${min} bullets`;
  return `${min}-${max} bullets`;
}

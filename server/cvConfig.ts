/**
 * CV Generation Configuration
 * 
 * This file contains all configurable parameters for CV generation.
 * Users can modify these values to customize the output format.
 */

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
 * Get the current CV configuration
 * In the future, this could load from environment variables or a database
 */
export function getCvConfig(): CvGenerationConfig {
  // For now, return the default config
  // Future enhancement: load from environment or database per user
  return defaultCvConfig;
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

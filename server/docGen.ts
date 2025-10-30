import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
} from "docx";
import type { CvDocument, CoverLetter, TraceChange } from "@shared/schema";

export class DocumentGenerationService {
  /**
   * Generate CV .docx file from CV document structure
   */
  async generateCvDocx(cv: CvDocument): Promise<Buffer> {
    const doc = new Document({
      creator: "CV Tailoring Pro",
      title: "Professional CV",
      description: "AI-tailored curriculum vitae for job applications",
      subject: "Career Document",
      keywords: "CV, resume, career, professional",
      lastModifiedBy: "CV Tailoring Pro",
      revision: 1,
      sections: [
        {
          children: [
            // Header (Contact Information)
            new Paragraph({
              text: cv.header.full_name,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: [
                cv.header.city_region,
                cv.header.phone,
                cv.header.email,
                cv.header.linkedin
              ].filter(Boolean).join(" | "),
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }), // Spacing

            // Headline
            ...(cv.headline ? [
              new Paragraph({
                children: [
                  new TextRun({ text: cv.headline, bold: true }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ text: "" }),
            ] : []),

            // Profile Summary
            new Paragraph({
              text: "Professional Summary",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: cv.profile_summary,
            }),
            new Paragraph({ text: "" }),

            // Key Skills
            new Paragraph({
              text: "Key Skills",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: cv.key_skills,
            }),
            new Paragraph({ text: "" }),

            // Technical Skills (if present)
            ...(cv.technical_skills ? [
              new Paragraph({
                text: "Technical Skills",
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                text: cv.technical_skills,
              }),
              new Paragraph({ text: "" }),
            ] : []),

            // Professional Experience
            new Paragraph({
              text: "Professional Experience",
              heading: HeadingLevel.HEADING_2,
            }),
            ...cv.experience.flatMap(exp => [
              new Paragraph({
                children: [
                  new TextRun({ text: exp.title, bold: true }),
                  new TextRun({ text: ` - ${exp.employer}` }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: `${exp.dates.from_year}${exp.dates.to_year ? ` - ${exp.dates.to_year}` : ' - Present'}${exp.location ? ` | ${exp.location}` : ''}`,
                  }),
                ],
              }),
              ...(exp.overview ? [
                new Paragraph({
                  text: exp.overview,
                }),
              ] : []),
              ...exp.achievements.map(achievement =>
                new Paragraph({
                  text: `• ${achievement.bullet}`,
                  bullet: { level: 0 },
                })
              ),
              new Paragraph({ text: "" }),
            ]),

            // Earlier Career Summary (if present)
            ...(cv.earlier_career_summary && cv.earlier_career_summary.length > 0 ? [
              new Paragraph({
                text: "Earlier Career",
                heading: HeadingLevel.HEADING_2,
              }),
              ...cv.earlier_career_summary.map(role =>
                new Paragraph({
                  text: `• ${role.title} at ${role.employer}`,
                  bullet: { level: 0 },
                })
              ),
              new Paragraph({ text: "" }),
            ] : []),

            // Education
            ...(cv.education && cv.education.length > 0 ? [
              new Paragraph({
                text: "Education",
                heading: HeadingLevel.HEADING_2,
              }),
              ...cv.education.flatMap(edu => [
                new Paragraph({
                  children: [
                    new TextRun({ text: edu.qualification, bold: true }),
                    new TextRun({ text: ` - ${edu.institution}` }),
                  ],
                }),
                ...(edu.city_country ? [
                  new Paragraph({
                    text: edu.city_country,
                  }),
                ] : []),
                new Paragraph({ text: "" }),
              ]),
            ] : []),

            // Certifications (if any)
            ...(cv.certifications && cv.certifications.length > 0
              ? [
                  new Paragraph({
                    text: "Certifications",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  ...cv.certifications.map(
                    (cert: string | {name: string, year?: number}) =>
                      new Paragraph({
                        text: `• ${typeof cert === 'string' ? cert : `${cert.name}${cert.year ? ` (${cert.year})` : ''}`}`,
                        bullet: { level: 0 },
                      })
                  ),
                  new Paragraph({ text: "" }),
                ]
              : []),

            // Publications (if any)
            ...(cv.publications && cv.publications.length > 0 ? [
              new Paragraph({
                text: "Publications",
                heading: HeadingLevel.HEADING_2,
              }),
              ...cv.publications.map(pub =>
                new Paragraph({
                  text: `• ${pub}`,
                  bullet: { level: 0 },
                })
              ),
              new Paragraph({ text: "" }),
            ] : []),

            // Optional Sections
            ...(cv.optional_sections?.languages && cv.optional_sections.languages.length > 0 ? [
              new Paragraph({
                text: "Languages",
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                text: cv.optional_sections.languages.join(" • "),
              }),
              new Paragraph({ text: "" }),
            ] : []),

            ...(cv.optional_sections?.awards && cv.optional_sections.awards.length > 0 ? [
              new Paragraph({
                text: "Awards & Recognition",
                heading: HeadingLevel.HEADING_2,
              }),
              ...cv.optional_sections.awards.map(award =>
                new Paragraph({
                  text: `• ${award}`,
                  bullet: { level: 0 },
                })
              ),
              new Paragraph({ text: "" }),
            ] : []),

            ...(cv.optional_sections?.memberships && cv.optional_sections.memberships.length > 0 ? [
              new Paragraph({
                text: "Professional Memberships",
                heading: HeadingLevel.HEADING_2,
              }),
              ...cv.optional_sections.memberships.map(membership =>
                new Paragraph({
                  text: `• ${membership}`,
                  bullet: { level: 0 },
                })
              ),
            ] : []),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  /**
   * Generate Cover Letter .docx file from cover letter structure
   */
  async generateCoverLetterDocx(coverLetter: CoverLetter): Promise<Buffer> {
    const doc = new Document({
      creator: "CV Tailoring Pro",
      title: "Professional Cover Letter",
      description: "AI-tailored cover letter for job applications",
      subject: "Cover Letter",
      keywords: "cover letter, job application, professional",
      lastModifiedBy: "CV Tailoring Pro",
      revision: 1,
      sections: [
        {
          children: [
            // Candidate Header
            new Paragraph({
              text: coverLetter.header.full_name,
              alignment: AlignmentType.LEFT,
            }),
            // Contact block - split on newlines to preserve formatting
            ...coverLetter.header.contact_block.split('\n').map(line =>
              new Paragraph({
                text: line,
                alignment: AlignmentType.LEFT,
              })
            ),
            // City/Region if present
            ...(coverLetter.header.city_region ? [
              new Paragraph({
                text: coverLetter.header.city_region,
                alignment: AlignmentType.LEFT,
              }),
            ] : []),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Date
            new Paragraph({
              text: new Date(coverLetter.meta.date_iso).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            }),
            new Paragraph({ text: "" }),

            // Recipient Address (if available)
            ...(coverLetter.meta.recipient.name ? [
              new Paragraph({
                text: coverLetter.meta.recipient.name,
              }),
            ] : []),
            ...(coverLetter.meta.recipient.title ? [
              new Paragraph({
                text: coverLetter.meta.recipient.title,
              }),
            ] : []),
            ...(coverLetter.meta.recipient.company ? [
              new Paragraph({
                text: coverLetter.meta.recipient.company,
              }),
            ] : []),
            ...(coverLetter.meta.recipient.address ? [
              new Paragraph({
                text: coverLetter.meta.recipient.address,
              }),
            ] : []),
            new Paragraph({ text: "" }),

            // Subject
            new Paragraph({
              children: [
                new TextRun({ text: coverLetter.meta.subject, bold: true }),
              ],
            }),
            new Paragraph({ text: "" }),

            // Greeting (default if no recipient name)
            new Paragraph({
              text: coverLetter.meta.recipient.name 
                ? `Dear ${coverLetter.meta.recipient.name},`
                : "Dear Hiring Manager,",
            }),
            new Paragraph({ text: "" }),

            // Opening Paragraph
            new Paragraph({
              text: coverLetter.paragraphs.opening,
            }),
            new Paragraph({ text: "" }),

            // Alignment Paragraph
            new Paragraph({
              text: coverLetter.paragraphs.alignment,
            }),
            new Paragraph({ text: "" }),

            // Fit Evidence Paragraph
            new Paragraph({
              text: coverLetter.paragraphs.fit_evidence,
            }),
            new Paragraph({ text: "" }),

            // Closing Paragraph
            new Paragraph({
              text: coverLetter.paragraphs.closing,
            }),
            new Paragraph({ text: "" }),

            // Sign Off
            new Paragraph({
              text: coverLetter.sign_off.closing,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: coverLetter.sign_off.name,
            }),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  /**
   * Generate Enhancement Report .docx file from trace changes
   */
  async generateEnhancementReportDocx(changes: TraceChange[]): Promise<Buffer> {
    const doc = new Document({
      creator: "CV Tailoring Pro",
      title: "CV Enhancement Report",
      description: "Detailed summary of AI-driven improvements to your CV",
      subject: "Enhancement Report",
      keywords: "CV improvements, enhancement, changes, optimization",
      lastModifiedBy: "CV Tailoring Pro",
      revision: 1,
      sections: [
        {
          children: [
            new Paragraph({
              text: "CV Enhancement Report",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "Summary of improvements made to your CV",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            ...changes.flatMap((change, index) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${index + 1}. ${change.description}`,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                text: `"${change.quote}"`,
              }),
              new Paragraph({ text: "" }),
            ]),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }
}

export const docGen = new DocumentGenerationService();

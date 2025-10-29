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
      sections: [
        {
          children: [
            // Contact Information
            new Paragraph({
              text: cv.contact.name,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `${cv.contact.email} | ${cv.contact.phone} | ${cv.contact.location}`,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }), // Spacing

            // Professional Summary
            new Paragraph({
              text: "Professional Summary",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: cv.summary,
            }),
            new Paragraph({ text: "" }),

            // Experience
            new Paragraph({
              text: "Professional Experience",
              heading: HeadingLevel.HEADING_2,
            }),
            ...cv.experience.flatMap(exp => [
              new Paragraph({
                children: [
                  new TextRun({ text: exp.role, bold: true }),
                  new TextRun({ text: ` - ${exp.company}` }),
                ],
              }),
              new Paragraph({
                children: [new TextRun({ text: exp.years, italics: true })],
              }),
              ...exp.highlights.map(
                highlight =>
                  new Paragraph({
                    text: `• ${highlight}`,
                    bullet: { level: 0 },
                  })
              ),
              new Paragraph({ text: "" }),
            ]),

            // Education
            new Paragraph({
              text: "Education",
              heading: HeadingLevel.HEADING_2,
            }),
            ...cv.education.flatMap(edu => [
              new Paragraph({
                children: [
                  new TextRun({ text: edu.degree, bold: true }),
                  new TextRun({ text: ` - ${edu.institution}` }),
                ],
              }),
              new Paragraph({
                children: [new TextRun({ text: edu.years, italics: true })],
              }),
              new Paragraph({ text: "" }),
            ]),

            // Skills
            new Paragraph({
              text: "Skills",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: cv.skills.join(" • "),
            }),
            new Paragraph({ text: "" }),

            // Certifications (if any)
            ...(cv.certifications.length > 0
              ? [
                  new Paragraph({
                    text: "Certifications",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  ...cv.certifications.map(
                    cert =>
                      new Paragraph({
                        text: `• ${cert}`,
                        bullet: { level: 0 },
                      })
                  ),
                ]
              : []),
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
      sections: [
        {
          children: [
            // Date
            new Paragraph({
              text: new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            }),
            new Paragraph({ text: "" }),

            // Greeting
            new Paragraph({
              text: coverLetter.greeting,
            }),
            new Paragraph({ text: "" }),

            // Opening
            new Paragraph({
              text: coverLetter.opening,
            }),
            new Paragraph({ text: "" }),

            // Body
            new Paragraph({
              text: coverLetter.body,
            }),
            new Paragraph({ text: "" }),

            // Closing
            new Paragraph({
              text: coverLetter.closing,
            }),
            new Paragraph({ text: "" }),

            // Signature
            new Paragraph({
              text: coverLetter.signature,
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
              italics: true,
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
                italics: true,
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

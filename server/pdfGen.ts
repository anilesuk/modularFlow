import puppeteer from "puppeteer";
import type { CvDocument, CoverLetter, TraceChange } from "@shared/schema";

export class PDFGenerationService {
  /**
   * Helper: Format date based on available month information
   */
  private formatDate(year: number, month: number | null | undefined): string {
    if (month === null || month === undefined) {
      return year.toString();
    }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[month - 1]} ${year}`;
  }

  /**
   * Helper: Format date range
   */
  private formatDateRange(fromYear: number, toYear: number | null | undefined, fromMonth: number | null | undefined, toMonth: number | null | undefined): string {
    const from = this.formatDate(fromYear, fromMonth);
    if (toYear === null || toYear === undefined) {
      return `${from} - Present`;
    }
    const to = this.formatDate(toYear, toMonth);
    return `${from} - ${to}`;
  }

  /**
   * Generate CV PDF from CV document structure
   */
  async generateCvPdf(cv: CvDocument): Promise<Buffer> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .contact-info {
      font-size: 10pt;
      color: #333;
    }
    
    .headline {
      text-align: center;
      font-weight: bold;
      margin: 10px 0;
      font-size: 12pt;
    }
    
    .section {
      margin-top: 15px;
    }
    
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      border-bottom: 1px solid #666;
      margin-bottom: 8px;
      padding-bottom: 3px;
    }
    
    .experience-entry {
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .experience-header {
      margin-bottom: 4px;
    }
    
    .job-title {
      font-weight: bold;
      font-size: 11pt;
    }
    
    .company {
      font-size: 11pt;
    }
    
    .date-location {
      font-size: 10pt;
      color: #555;
      font-style: italic;
      margin-bottom: 3px;
    }
    
    .overview {
      margin: 5px 0;
      font-size: 10.5pt;
    }
    
    .achievements {
      margin-left: 20px;
      margin-top: 5px;
    }
    
    .achievement {
      margin-bottom: 4px;
      text-align: justify;
    }
    
    .bullet {
      display: list-item;
      list-style-type: disc;
      margin-left: 5px;
    }
    
    .earlier-career {
      margin-top: 8px;
    }
    
    .earlier-career-item {
      display: inline-block;
      margin-right: 15px;
      font-size: 10pt;
    }
    
    .education-entry, .certification-entry {
      margin-bottom: 6px;
    }
    
    .prose-paragraph {
      text-align: justify;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${cv.header.full_name}</h1>
    <div class="contact-info">
      ${[cv.header.city_region, cv.header.phone, cv.header.email, cv.header.linkedin].filter(Boolean).join(" | ")}
    </div>
  </div>
  
  ${cv.headline ? `<div class="headline">${cv.headline}</div>` : ""}
  
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="prose-paragraph">${cv.profile_summary}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Key Skills</div>
    <div class="prose-paragraph">${cv.key_skills}</div>
  </div>
  
  ${cv.technical_skills ? `
  <div class="section">
    <div class="section-title">Technical Skills</div>
    <div class="prose-paragraph">${cv.technical_skills}</div>
  </div>
  ` : ""}
  
  <div class="section">
    <div class="section-title">Professional Experience</div>
    ${cv.experience.map(exp => `
      <div class="experience-entry">
        <div class="experience-header">
          <div>
            <span class="job-title">${exp.title}</span> - <span class="company">${exp.employer}</span>
          </div>
          <div class="date-location">
            ${this.formatDateRange(exp.dates.from_year, exp.dates.to_year, exp.dates.from_month, exp.dates.to_month)}${exp.location ? ` | ${exp.location}` : ""}
          </div>
        </div>
        ${exp.overview ? `<div class="overview">${exp.overview}</div>` : ""}
        <ul class="achievements">
          ${exp.achievements.map(ach => `
            <li class="achievement">${ach.bullet}</li>
          `).join("")}
        </ul>
      </div>
    `).join("")}
  </div>
  
  ${cv.earlier_career_summary && cv.earlier_career_summary.length > 0 ? `
  <div class="section">
    <div class="section-title">Earlier Career</div>
    <div class="earlier-career">
      ${cv.earlier_career_summary.map(ec => `
        <span class="earlier-career-item"><strong>${ec.title}</strong> - ${ec.employer}</span>
      `).join("")}
    </div>
  </div>
  ` : ""}
  
  ${cv.education && cv.education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${cv.education.map(edu => `
      <div class="education-entry">
        <strong>${edu.qualification}</strong> - ${edu.institution}${edu.city_country ? `, ${edu.city_country}` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}
  
  ${cv.certifications && cv.certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${cv.certifications.map(cert => `
      <div class="certification-entry">
        ${typeof cert === "string" ? cert : `${cert.name}${cert.year ? ` (${cert.year})` : ""}`}
      </div>
    `).join("")}
  </div>
  ` : ""}
  
  ${cv.publications && cv.publications.length > 0 ? `
  <div class="section">
    <div class="section-title">Publications</div>
    ${cv.publications.map(pub => `<div>${pub}</div>`).join("")}
  </div>
  ` : ""}
  
  ${cv.optional_sections?.languages && cv.optional_sections.languages.length > 0 ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div>${cv.optional_sections.languages.join(", ")}</div>
  </div>
  ` : ""}
  
  ${cv.optional_sections?.awards && cv.optional_sections.awards.length > 0 ? `
  <div class="section">
    <div class="section-title">Awards</div>
    ${cv.optional_sections.awards.map(award => `<div>${award}</div>`).join("")}
  </div>
  ` : ""}
</body>
</html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "2cm",
          right: "2cm",
          bottom: "2cm",
          left: "2cm",
        },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate Cover Letter PDF from cover letter structure
   */
  async generateCoverLetterPdf(coverLetter: CoverLetter): Promise<Buffer> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2.5cm;
    }
    
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
    }
    
    .header {
      margin-bottom: 20px;
    }
    
    .header div {
      margin-bottom: 2px;
    }
    
    .date {
      margin: 20px 0;
    }
    
    .recipient {
      margin-bottom: 20px;
    }
    
    .recipient div {
      margin-bottom: 2px;
    }
    
    .subject {
      font-weight: bold;
      margin: 20px 0;
    }
    
    .paragraph {
      margin-bottom: 15px;
      text-align: justify;
    }
    
    .sign-off {
      margin-top: 30px;
    }
    
    .closing {
      margin-bottom: 40px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div><strong>${coverLetter.header.full_name}</strong></div>
    ${coverLetter.header.contact_block.split('\n').map(line => `<div>${line}</div>`).join("")}
    ${coverLetter.header.city_region ? `<div>${coverLetter.header.city_region}</div>` : ""}
  </div>
  
  <div class="date">
    ${new Date(coverLetter.meta.date_iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}
  </div>
  
  ${coverLetter.meta.recipient.name || coverLetter.meta.recipient.title || coverLetter.meta.recipient.company ? `
  <div class="recipient">
    ${coverLetter.meta.recipient.name ? `<div>${coverLetter.meta.recipient.name}</div>` : ""}
    ${coverLetter.meta.recipient.title ? `<div>${coverLetter.meta.recipient.title}</div>` : ""}
    ${coverLetter.meta.recipient.company ? `<div>${coverLetter.meta.recipient.company}</div>` : ""}
    ${coverLetter.meta.recipient.address ? `<div>${coverLetter.meta.recipient.address}</div>` : ""}
  </div>
  ` : ""}
  
  <div class="subject"><strong>${coverLetter.meta.subject}</strong></div>
  
  <div class="paragraph">${coverLetter.paragraphs.opening}</div>
  <div class="paragraph">${coverLetter.paragraphs.alignment}</div>
  <div class="paragraph">${coverLetter.paragraphs.fit_evidence}</div>
  <div class="paragraph">${coverLetter.paragraphs.closing}</div>
  
  <div class="sign-off">
    <div class="closing">${coverLetter.sign_off.closing},</div>
    <div>${coverLetter.sign_off.name}</div>
  </div>
</body>
</html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "2.5cm",
          right: "2.5cm",
          bottom: "2.5cm",
          left: "2.5cm",
        },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate Enhancement Report PDF from trace changes
   */
  async generateEnhancementReportPdf(changes: TraceChange[]): Promise<Buffer> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2.5cm;
    }
    
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
    }
    
    h1 {
      text-align: center;
      font-size: 16pt;
      margin-bottom: 10px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }
    
    .change {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .change-number {
      font-weight: bold;
      font-size: 12pt;
      margin-bottom: 5px;
    }
    
    .quote {
      font-style: italic;
      color: #444;
      margin: 8px 0;
      padding-left: 15px;
      border-left: 3px solid #ccc;
    }
  </style>
</head>
<body>
  <h1>CV Enhancement Report</h1>
  <div class="subtitle">Summary of improvements made to your CV</div>
  
  ${changes.map((change, index) => `
    <div class="change">
      <div class="change-number">${index + 1}. ${change.description}</div>
      <div class="quote">"${change.quote}"</div>
    </div>
  `).join("")}
</body>
</html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "2.5cm",
          right: "2.5cm",
          bottom: "2.5cm",
          left: "2.5cm",
        },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}

export const pdfGenService = new PDFGenerationService();

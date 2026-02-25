/**
 * Server-side PDF generation for approved legal letters.
 *
 * Uses PDFKit to create professional, print-ready PDFs with:
 * - Talk to My Lawyer letterhead
 * - Proper legal letter formatting (Times New Roman, 1-inch margins)
 * - Attorney-approved stamp
 * - Footer with branding
 *
 * The generated PDF is uploaded to S3 via storagePut and the URL is returned.
 */

import PDFDocument from "pdfkit";
import { storagePut } from "./storage";

interface PdfGenerationOptions {
  letterId: number;
  letterType: string;
  subject: string;
  content: string;
  approvedBy?: string;
  approvedAt?: string;
  jurisdictionState?: string | null;
  jurisdictionCountry?: string | null;
  senderName?: string;
  recipientName?: string;
}

/**
 * Generate a professional PDF from the approved letter content,
 * upload it to S3, and return the public URL.
 */
export async function generateAndUploadApprovedPdf(
  opts: PdfGenerationOptions
): Promise<{ pdfUrl: string; pdfKey: string }> {
  const pdfBuffer = await generatePdfBuffer(opts);

  // Upload to S3 with a unique key
  const timestamp = Date.now();
  const safeSubject = opts.subject.replace(/[^a-zA-Z0-9-_ ]/g, "").substring(0, 40).trim().replace(/\s+/g, "-");
  const fileKey = `approved-letters/${opts.letterId}-${safeSubject}-${timestamp}.pdf`;

  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

  console.log(`[PDF] Generated and uploaded PDF for letter #${opts.letterId}: ${url}`);
  return { pdfUrl: url, pdfKey: fileKey };
}

/**
 * Generate the PDF buffer in memory using PDFKit.
 */
async function generatePdfBuffer(opts: PdfGenerationOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: `Legal Letter - ${opts.subject}`,
          Author: "Talk to My Lawyer",
          Subject: opts.subject,
          Creator: "Talk to My Lawyer Platform",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 144; // 72pt margins on each side

      // ─── Letterhead ───────────────────────────────────────────────
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#1E3A5F")
        .text("TALK TO MY LAWYER", 72, 50, { align: "center", width: pageWidth });

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#666666")
        .text("Attorney-Reviewed Legal Correspondence", 72, 70, { align: "center", width: pageWidth });

      // Divider line
      doc
        .moveTo(72, 85)
        .lineTo(72 + pageWidth, 85)
        .strokeColor("#1E3A5F")
        .lineWidth(2)
        .stroke();

      // ─── Letter metadata ──────────────────────────────────────────
      let y = 100;

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#444444");

      const letterTypeLabel = opts.letterType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      doc.text(`Letter Type: ${letterTypeLabel}`, 72, y, { width: pageWidth });
      y += 14;

      if (opts.jurisdictionState) {
        doc.text(`Jurisdiction: ${opts.jurisdictionState}${opts.jurisdictionCountry ? `, ${opts.jurisdictionCountry}` : ""}`, 72, y, { width: pageWidth });
        y += 14;
      }

      doc.text(`Reference: Letter #${opts.letterId}`, 72, y, { width: pageWidth });
      y += 14;

      if (opts.approvedAt) {
        const approvedDate = new Date(opts.approvedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        doc.text(`Approved: ${approvedDate}`, 72, y, { width: pageWidth });
        y += 14;
      }

      // Thin divider
      y += 6;
      doc
        .moveTo(72, y)
        .lineTo(72 + pageWidth, y)
        .strokeColor("#CCCCCC")
        .lineWidth(0.5)
        .stroke();
      y += 16;

      // ─── Letter Body ──────────────────────────────────────────────
      // Parse the content — handle HTML tags if present, otherwise plain text
      const plainContent = stripHtml(opts.content);
      const paragraphs = plainContent.split(/\n{2,}/);

      doc.font("Times-Roman").fontSize(12).fillColor("#000000");

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Check if it's a heading-like line (all caps, short, or starts with RE:)
        if (
          (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && !trimmed.includes(".")) ||
          trimmed.startsWith("RE:") ||
          trimmed.startsWith("Re:")
        ) {
          doc.font("Times-Bold").fontSize(12);
          doc.text(trimmed, 72, y, { width: pageWidth, lineGap: 4 });
          y = doc.y + 8;
          doc.font("Times-Roman").fontSize(12);
        } else {
          doc.text(trimmed, 72, y, { width: pageWidth, lineGap: 4 });
          y = doc.y + 10;
        }

        // Page break if needed
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = 72;
        }
      }

      // ─── Attorney Approval Stamp ──────────────────────────────────
      y = Math.max(y + 20, doc.y + 20);
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 72;
      }

      doc
        .save()
        .roundedRect(72, y, pageWidth, 50, 4)
        .fillAndStroke("#F0FFF4", "#22C55E");

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#166534")
        .text("✓ ATTORNEY REVIEWED & APPROVED", 82, y + 10, { width: pageWidth - 20 });

      const stampLine2 = opts.approvedBy
        ? `Reviewed by ${opts.approvedBy} on ${opts.approvedAt ? new Date(opts.approvedAt).toLocaleDateString("en-US") : "N/A"}`
        : `Approved on ${opts.approvedAt ? new Date(opts.approvedAt).toLocaleDateString("en-US") : "N/A"}`;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#166534")
        .text(stampLine2, 82, y + 28, { width: pageWidth - 20 });

      doc.restore();

      // ─── Footer ───────────────────────────────────────────────────
      const footerY = doc.page.height - 50;
      doc
        .moveTo(72, footerY)
        .lineTo(72 + pageWidth, footerY)
        .strokeColor("#CCCCCC")
        .lineWidth(0.5)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#999999")
        .text(
          `This letter was generated with AI assistance and reviewed by a licensed attorney via Talk to My Lawyer. © ${new Date().getFullYear()} Talk to My Lawyer. All rights reserved.`,
          72,
          footerY + 6,
          { width: pageWidth, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Strip HTML tags and decode common entities for plain text rendering in PDF.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

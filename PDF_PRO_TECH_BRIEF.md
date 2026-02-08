# VERICASE - PDF Pro Technical Brief

## 1. Technical Stack Summary
- **Runtime:** Node.js (Express)
- **Frontend:** React 18 + TypeScript
- **UI Framework:** shadcn/ui (Radix UI) + Tailwind CSS
- **Database:** PostgreSQL (Neon) via Drizzle ORM
- **State Management:** TanStack Query v5
- **Routing:** Wouter (Frontend) / Express (Backend)
- **Auth:** Replit Auth (SSO) with custom RBAC middleware

## 2. Core Data Models (Drizzle Schema)
```typescript
// Proposed PDF Pro Schema Additions
export const pdfDocuments = pgTable("pdf_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id").references(() => matters.id),
  originalFileId: uuid("original_file_id").references(() => evidenceVaultFiles.id),
  batesPrefix: text("bates_prefix"),
  batesStartNumber: integer("bates_start_number"),
  isComplianceChecked: boolean("is_compliance_checked").default(false),
  complianceReport: jsonb("compliance_report"),
  processedUrl: text("processed_url"), // URL to PDF with Bates overlays
  createdAt: timestamp("created_at").defaultNow(),
});
```

## 3. Storage & Processing Strategy
- **File Storage:** Replit Object Storage (S3-compatible).
- **Processing:** Asynchronous PDF processing for OCR and Bates stamping.
- **OCR Engine:** Integration with AWS Textract or Google Vision AI (current infrastructure uses a provider-agnostic `OCRJob` system).

## 4. Feature Implementation Requirements
### A. Bates Numbering Engine
- Logic for prefixing (e.g., SYNERGY-) and padding (e.g., 000001).
- Visual overlay positioning (Header/Footer, Left/Right/Center).
- PDF coordinate mapping for non-destructive stamping.

### B. OCR & Indexing
- Full-text extraction stored in `extracted_text` column.
- Searchable PDF generation (overlaying invisible text over images).

### C. URCP Compliance Checker (Utah Rules of Civil Procedure)
- Rule 10: Formatting checks (font size, margins, line spacing).
- Rule 11: Signature block verification.
- Metadata cleaning (removing sensitive hidden properties).

## 5. UI Components Needed
- `PDFViewer`: Canvas-based viewer for previewing Bates positions.
- `BatesConfigForm`: Form for setting prefix, start number, and position.
- `ComplianceDashboard`: Summary of rule violations and auto-fix suggestions.

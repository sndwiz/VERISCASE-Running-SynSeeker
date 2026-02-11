import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Layers,
  Brain,
  Clock,
  Shield,
  Users,
  FileText,
  DollarSign,
  Zap,
  MessageSquare,
  Briefcase,
  Scale,
  ListTodo,
  Network,
  Gavel,
  FolderOpen,
  ClipboardList,
  Printer,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  Hash,
  BarChart3,
} from "lucide-react";

function SectionImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-6">
      <div className="rounded-md overflow-hidden border border-border">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-contain"
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover-elevate"
        data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Icon className="h-5 w-5 text-primary shrink-0" />
        <span className="font-semibold text-lg flex-1">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FeatureRow({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex gap-3 items-start py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function ProductGuidePage() {
  const [activeTab, setActiveTab] = useState<"full" | "summary">("full");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 pb-20">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-guide-title">
                VERICASE Product Guide
              </h1>
              <p className="text-muted-foreground">
                Complete System Overview &amp; User Manual
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 max-w-3xl">
            This document provides a complete, plain-language explanation of how
            VERICASE works, how it makes decisions, handles timelines, manages
            evidence, and supports every aspect of legal practice management. This
            software is provided under a proprietary, exclusive license for your
            firm's sole use.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "full" ? "default" : "outline"}
            onClick={() => setActiveTab("full")}
            data-testid="button-full-guide"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Full Guide with Diagrams
          </Button>
          <Button
            variant={activeTab === "summary" ? "default" : "outline"}
            onClick={() => setActiveTab("summary")}
            data-testid="button-summary"
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Bullet-Point Summary
          </Button>
        </div>

        {activeTab === "summary" ? <BulletPointSummary /> : <FullGuide />}
      </div>
    </div>
  );
}

function FullGuide() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Proprietary License &amp; Exclusivity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            VERICASE is delivered as a proprietary, single-firm license. Your
            purchase grants your firm exclusive use of this specific build. The
            software will not be resold, redistributed, or reproduced for any
            other entity. Your data, configurations, and customizations remain
            entirely under your firm's control.
          </p>
          <SectionImage
            src="/investor-guide/proprietary-license.png"
            alt="Proprietary license model"
            caption="Your firm receives an exclusive, dedicated instance with full data sovereignty"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            How the Platform is Built
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            VERICASE is a single, unified platform where every tool your firm
            needs lives under one roof. Instead of juggling separate apps for
            case management, documents, billing, and communication, everything
            is connected. When you update a matter, the billing records, team
            assignments, document links, and timelines all stay in sync
            automatically.
          </p>
          <SectionImage
            src="/investor-guide/architecture-diagram.png"
            alt="Platform architecture"
            caption="All firm operations connect through a single, unified platform rather than separate tools"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">What This Means for You</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  One login, one place for everything
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  No data gets lost between systems
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  Changes in one area automatically update everywhere
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  Every team member sees the same up-to-date information
                </li>
              </ul>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Core Technology</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  Secure cloud-based so you can access from anywhere
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  Works on any computer or tablet with a web browser
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  Enterprise-grade database keeps your data safe
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  Real-time updates without refreshing the page
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <CollapsibleSection title="How a Case Moves Through the System" icon={Briefcase} defaultOpen>
        <p className="text-sm text-muted-foreground mb-4">
          Every legal matter follows a natural lifecycle from the moment a
          client walks in the door to the final resolution. VERICASE tracks
          every step and makes sure nothing falls through the cracks.
        </p>
        <SectionImage
          src="/investor-guide/case-lifecycle-flow.png"
          alt="Case lifecycle flow"
          caption="Every case follows a structured path with built-in checkpoints to prevent missed steps"
        />
        <div className="space-y-4 mt-6">
          <StepCard
            number={1}
            title="Client Intake"
            description="A new client fills out an intake form (or your staff enters their information). The system captures contact details, case type, and key dates. Pre-built templates cover common practice areas like family law, personal injury, criminal defense, and estate planning."
          />
          <StepCard
            number={2}
            title="Matter Created"
            description="A new 'matter' (case file) is created and linked to the client. You select the court, judge, practice area, and case type from dropdown menus pre-loaded with Utah courts and judges. The system assigns a case number and opens a dedicated workspace."
          />
          <StepCard
            number={3}
            title="Team Assigned"
            description="Attorneys and paralegals are assigned to the matter using checkboxes. A responsible attorney is designated. Everyone assigned immediately sees the case on their personal dashboard and task list."
          />
          <StepCard
            number={4}
            title="Board Auto-Created"
            description="A project management board (like Monday.com or Trello) is automatically created for the matter. It includes the case name, opened date, and assigned team members in its description. This board becomes the central hub for tracking all tasks, deadlines, and progress."
          />
          <StepCard
            number={5}
            title="Work Begins"
            description="The team works through tasks on the board: document collection, research, filings, court appearances. Time is tracked against the matter. Documents are stored in the Evidence Vault with tamper-proof records."
          />
          <StepCard
            number={6}
            title="AI Assists Along the Way"
            description="At any point, the AI assistant can analyze documents, identify contradictions, extract key dates, build timelines, and suggest next steps. It works with your data but never replaces attorney judgment."
          />
          <StepCard
            number={7}
            title="Billing & Resolution"
            description="Time entries are verified, invoices generated, payments tracked, and trust accounting maintained. When the case resolves, all records remain in the system for future reference."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="How the AI Makes Decisions" icon={Brain} defaultOpen>
        <p className="text-sm text-muted-foreground mb-4">
          The AI in VERICASE is a tool that assists your attorneys, not a
          replacement. Here is exactly how it processes information and what
          kind of output it provides. The AI never makes legal decisions on its
          own and always presents its findings for attorney review.
        </p>
        <SectionImage
          src="/investor-guide/ai-decision-pipeline.png"
          alt="AI decision pipeline"
          caption="Documents flow through multiple AI analysis stages, each producing specific, reviewable outputs"
        />
        <div className="space-y-4 mt-6">
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Step 1: Document Ingestion
              </h4>
              <p className="text-sm text-muted-foreground">
                When you upload a document (PDF, image, text file), the system
                first extracts all readable text using OCR (optical character
                recognition) for scanned documents. It then generates a unique
                digital fingerprint (SHA-256 hash) for that exact file, creating
                an unalterable record proving when the document entered the system
                and that it has not been modified.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                Step 2: Entity Extraction
              </h4>
              <p className="text-sm text-muted-foreground">
                The AI reads through the text and identifies key entities:
                people mentioned, organizations, locations, dates, dollar
                amounts, and legal references. It pulls these out and presents
                them in a structured format. For example, if a contract mentions
                "John Smith" three times and "Acme Corp" five times, the AI
                surfaces this so your team knows who the key players are without
                reading every page.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Step 3: Theme & Risk Analysis
              </h4>
              <p className="text-sm text-muted-foreground">
                The AI groups related information into themes (e.g., "contract
                disputes," "timeline inconsistencies," "employment terms") and
                identifies potential risks. It flags items like approaching
                deadlines, conflicting statements between documents, unusual
                clauses, or missing information that attorneys should review. Each
                flag includes the specific text it found and where it found it, so
                attorneys can verify the AI's reasoning.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Step 4: Action Items & Recommendations
              </h4>
              <p className="text-sm text-muted-foreground">
                Based on its analysis, the AI suggests specific action items:
                "Review clause 4.2 for potential conflict with opposing party's
                claim," or "Deadline for response: March 15, 2026." These are
                suggestions only. An attorney must review and approve them before
                any action is taken. The system includes a formal approval
                workflow where senior attorneys can accept, reject, or modify
                AI-generated recommendations.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-4 p-4 bg-primary/5 rounded-md border border-primary/20">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Important: AI Guardrails
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>- The AI never files documents, sends communications, or takes action without human approval</li>
            <li>- All AI outputs include citations showing which document text led to each conclusion</li>
            <li>- Multiple AI models (Claude, GPT, Gemini) can be used to cross-check findings</li>
            <li>- AI usage is tracked and audited so you know exactly when and how it was used</li>
            <li>- The AI operates within your firm's data only and does not share data externally</li>
          </ul>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="How Timelines & Chronological Order Work" icon={Clock} defaultOpen>
        <p className="text-sm text-muted-foreground mb-4">
          Building an accurate timeline is one of the most time-consuming parts
          of case preparation. VERICASE automates much of this process while
          keeping your attorneys in control of the final product.
        </p>
        <SectionImage
          src="/investor-guide/timeline-construction.png"
          alt="Timeline construction"
          caption="Raw evidence is processed to extract dates, classify events, and build a chronological case narrative"
        />
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-2">1. Date Extraction</h4>
                <p className="text-xs text-muted-foreground">
                  When documents enter the system, the AI scans for every date
                  reference it can find: explicit dates ("January 15, 2025"),
                  relative dates ("three days later"), and contextual dates
                  ("the following Tuesday"). It converts all of these to
                  standard calendar dates and tags each one with the source
                  document and page number.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-2">2. Event Classification</h4>
                <p className="text-xs text-muted-foreground">
                  Each extracted date is paired with what happened: was it a
                  meeting, a contract signing, an incident, a filing, a
                  communication? The AI categorizes events into types so your
                  team can filter the timeline by category. For example, show
                  only "communications" or only "court filings."
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-2">3. Chronological Assembly</h4>
                <p className="text-xs text-muted-foreground">
                  All extracted events are sorted oldest to newest, creating a
                  complete narrative of the case. Conflicts (two documents
                  claiming different dates for the same event) are flagged for
                  attorney review. The timeline can be exported, printed, or
                  used as the foundation for court presentations.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="p-4 bg-primary/5 rounded-md border border-primary/20">
            <h4 className="font-semibold text-sm mb-2">How Contradictions are Detected</h4>
            <p className="text-xs text-muted-foreground">
              The system compares statements across all documents in a matter.
              If Witness A says the meeting happened on March 5th and Document B
              says it was March 8th, the system flags this as a contradiction.
              It presents both sources side by side with the exact quotes, so
              your attorney can determine which is accurate and use the
              discrepancy strategically. This process works across hundreds of
              documents simultaneously, something that would take a human team
              days or weeks to accomplish manually.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Evidence Vault & Chain of Custody" icon={Shield}>
        <p className="text-sm text-muted-foreground mb-4">
          The Evidence Vault is where all case-related files are stored with
          court-grade security. Every file that enters the vault is treated as
          potential evidence, meaning it gets an immutable record proving it has
          not been tampered with.
        </p>
        <SectionImage
          src="/investor-guide/evidence-chain.png"
          alt="Evidence chain of custody"
          caption="Every piece of evidence gets a tamper-proof digital fingerprint and complete audit trail"
        />
        <div className="space-y-3">
          <FeatureRow
            icon={Lock}
            title="SHA-256 Hashing"
            description="Every file uploaded receives a unique digital fingerprint. If even one character in the file changes, the fingerprint changes completely, proving tampering. This is the same technology used by federal agencies."
          />
          <FeatureRow
            icon={Clock}
            title="Timestamped Chain of Custody"
            description="Every action on a file is recorded: who uploaded it, when, who viewed it, who downloaded it. This creates an unbroken chain of custody that holds up in court."
          />
          <FeatureRow
            icon={Eye}
            title="Bates Numbering"
            description="Documents are automatically assigned sequential Bates numbers for organized reference during discovery and trial proceedings."
          />
          <FeatureRow
            icon={FolderOpen}
            title="Two-Layer Classification"
            description="Documents are organized using a controlled vocabulary system (primary category + subcategory) so nothing gets mislabeled or lost."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Team Management & Task Assignments" icon={Users}>
        <p className="text-sm text-muted-foreground mb-4">
          Every firm member has a defined role (Attorney, Paralegal, Staff) and
          sees only the work relevant to them. The system ensures the right
          people are working on the right matters.
        </p>
        <SectionImage
          src="/investor-guide/team-workflow.png"
          alt="Team workflow"
          caption="Firm hierarchy and task delegation are built into every case from day one"
        />
        <div className="space-y-3 mt-4">
          <FeatureRow
            icon={Users}
            title="Role-Based Team Members"
            description="Each person in your firm is set up with their role (Attorney, Paralegal, Associate, Partner, Staff, Intern). Their role determines what they can access and what tasks they receive."
          />
          <FeatureRow
            icon={Briefcase}
            title="Matter-Level Assignment"
            description="When creating a new case, you assign a responsible attorney, select additional attorneys, and choose paralegals. Everyone assigned sees the case in their personal dashboard immediately."
          />
          <FeatureRow
            icon={ListTodo}
            title="Personal Task Views"
            description="Each team member has a 'My Tasks' view showing only the work assigned to them across all matters. They also see an 'All Today' view of everything the firm needs done that day."
          />
          <FeatureRow
            icon={CheckCircle2}
            title="Approval Workflows"
            description="Senior attorneys can approve or reject work products, document filings, and AI recommendations. Nothing goes out the door without the proper sign-off."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Board System: How Work Gets Tracked" icon={Layers}>
        <p className="text-sm text-muted-foreground mb-4">
          Every matter gets its own project board, similar to tools like
          Monday.com or Trello, but built specifically for legal work. Boards
          are the day-to-day workspace where your team tracks what needs doing.
        </p>
        <SectionImage
          src="/investor-guide/board-system.png"
          alt="Board system"
          caption="Customizable boards with 15+ column types designed for legal task management"
        />
        <div className="space-y-3 mt-4">
          <FeatureRow
            icon={Layers}
            title="15+ Column Types"
            description="Status, priority, assignee, due date, text, number, dropdown, checkbox, date, file, link, email, phone, rating, and approval columns. Each column type is tailored for legal workflows."
          />
          <FeatureRow
            icon={Users}
            title="Task Groups"
            description="Group tasks by phase (Discovery, Pre-Trial, Trial Prep) or any other category. Each group can be collapsed, expanded, and reordered."
          />
          <FeatureRow
            icon={Zap}
            title="Auto-Created with Matters"
            description="When a new matter is created, a board is automatically generated with the case details, opened date, and assigned team names built right into the description."
          />
          <FeatureRow
            icon={Brain}
            title="AI Board Builder"
            description="Use natural language to describe what you need ('Set up a personal injury case with discovery deadlines') and the AI will create a complete board with tasks, groups, and columns."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Billing, Time Tracking & Financial Management" icon={DollarSign}>
        <p className="text-sm text-muted-foreground mb-4">
          VERICASE handles the full billing lifecycle from time entry to
          payment collection, including trust account compliance.
        </p>
        <SectionImage
          src="/investor-guide/billing-flow-diagram.png"
          alt="Billing flow"
          caption="Complete financial workflow from time capture through trust accounting"
        />
        <div className="space-y-3 mt-4">
          <FeatureRow
            icon={Clock}
            title="Time Tracking"
            description="Attorneys and paralegals log time directly against matters. Entries include descriptions, rate calculations, and UTBMS task codes for standardized billing."
          />
          <FeatureRow
            icon={FileText}
            title="Billing Verifier"
            description="Before invoices go out, the billing verifier checks time entries for common errors: duplicate entries, unusual durations, missing descriptions, and rate discrepancies. This catches mistakes before clients see them."
          />
          <FeatureRow
            icon={DollarSign}
            title="Invoice Generation"
            description="Invoices are generated per matter or per client, with detailed breakdowns of time, expenses, and trust account activity."
          />
          <FeatureRow
            icon={Shield}
            title="Trust Accounting"
            description="Client trust funds are tracked separately with deposits, disbursements, and running balances to ensure compliance with bar rules."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Document Builder & Legal Forms" icon={FileText}>
        <p className="text-sm text-muted-foreground mb-4">
          Generate Utah-specific legal documents from templates with AI
          assistance, including built-in compliance checking against the Utah
          Rules of Civil Procedure (URCP).
        </p>
        <div className="space-y-3">
          <FeatureRow
            icon={FileText}
            title="Pre-Built Templates"
            description="Motions, complaints, answers, discovery requests, and other common filings are available as templates that auto-populate with matter and client information."
          />
          <FeatureRow
            icon={Brain}
            title="AI-Assisted Drafting"
            description="Describe what you need in plain language and the AI drafts the document following Utah legal formatting requirements. Attorney review is always required before filing."
          />
          <FeatureRow
            icon={Gavel}
            title="URCP Compliance Checking"
            description="Documents are automatically checked against the Utah Rules of Civil Procedure to flag potential compliance issues before filing."
          />
          <FeatureRow
            icon={CheckCircle2}
            title="Approval Workflow"
            description="Draft documents go through a formal review and approval process. A senior attorney must approve before any document is finalized."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Communications Hub" icon={MessageSquare}>
        <div className="space-y-3">
          <FeatureRow
            icon={MessageSquare}
            title="Client Communications"
            description="Secure messaging with clients through a dedicated portal. All communications are logged against the relevant matter for a complete record."
          />
          <FeatureRow
            icon={Users}
            title="Internal Team Messaging"
            description="Team members can communicate about cases without using external email or chat apps. Conversations are tied to matters so context is never lost."
          />
          <FeatureRow
            icon={Clock}
            title="Activity Logs"
            description="Every communication is timestamped and attributed. You always know who said what and when."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Investigation & Detective Board" icon={Network}>
        <div className="space-y-3">
          <FeatureRow
            icon={Network}
            title="Visual Investigation Board"
            description="A drag-and-drop canvas where attorneys can map relationships between people, organizations, events, and evidence. Think of it as a digital cork board with string connecting the pins."
          />
          <FeatureRow
            icon={Brain}
            title="AI-Powered Connections"
            description="The AI can suggest connections between entities it finds across your documents, helping attorneys spot relationships they might have missed."
          />
          <FeatureRow
            icon={Eye}
            title="Zones & Color Coding"
            description="The board has colored zones for organizing different aspects of an investigation: suspects, evidence, timeline, and witnesses."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Automations & Workflow Engine" icon={Zap}>
        <div className="space-y-3">
          <FeatureRow
            icon={Zap}
            title="85+ Pre-Built Automations"
            description="Common workflows are ready to use: 'When a new matter is created, notify the assigned team,' 'When a deadline is 7 days away, send a reminder,' 'When a document is approved, update the board status.'"
          />
          <FeatureRow
            icon={Brain}
            title="AI-Powered Actions"
            description="Automations can trigger AI analysis: 'When a new document is uploaded, automatically extract key dates and add them to the timeline.'"
          />
          <FeatureRow
            icon={ListTodo}
            title="Workflow Recorder"
            description="The system watches how your team works and suggests automations for repetitive tasks. If a paralegal always creates the same set of tasks when a new case opens, the recorder suggests automating it."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Security & Access Control" icon={Shield}>
        <SectionImage
          src="/investor-guide/security-architecture.png"
          alt="Security architecture"
          caption="Multiple layers of security protect your firm's data at every level"
        />
        <div className="space-y-3 mt-4">
          <FeatureRow
            icon={Lock}
            title="Role-Based Access Control"
            description="Three permission levels (Admin, Member, Viewer) control who can see, edit, and delete data. Admins manage the firm. Members handle daily work. Viewers can see but not change anything."
          />
          <FeatureRow
            icon={Shield}
            title="Secure Authentication"
            description="Multi-user login with Google, GitHub, Apple, or email. Each user gets their own account with personalized access."
          />
          <FeatureRow
            icon={Eye}
            title="Audit Trail"
            description="Every action in the system is logged: who did what, when, and from where. This is essential for compliance and malpractice protection."
          />
          <FeatureRow
            icon={Lock}
            title="Cloudflare Security Layer"
            description="Advanced protection against automated attacks, bots, and unauthorized access attempts. Includes rate limiting and verification challenges."
          />
        </div>
      </CollapsibleSection>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Efficiency Gains for Your Firm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SectionImage
            src="/investor-guide/roi-efficiency.png"
            alt="Efficiency gains"
            caption="Consolidating your tools into one platform dramatically reduces administrative overhead"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">60%</div>
                <p className="text-xs text-muted-foreground">Less time spent on administrative tasks through automation and AI-assisted workflows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">3x</div>
                <p className="text-xs text-muted-foreground">Faster document review with AI-powered entity extraction, theme analysis, and contradiction detection</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">Zero</div>
                <p className="text-xs text-muted-foreground">Lost evidence with SHA-256 hashing, chain of custody tracking, and Bates numbering</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BulletPointSummary() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">VERICASE at a Glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              What It Is
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                All-in-one legal practice management platform
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Proprietary, exclusive license for your firm only (not resold or reproduced)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Replaces 6-8 separate software tools with one unified system
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Cloud-based, accessible from any device with a web browser
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Case Management
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Full matter lifecycle: intake, creation, team assignment, tracking, billing, resolution
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Utah-specific court and judge selections (28 courts, 23 judges pre-loaded)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Automatic project board creation for every new case
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Client intake forms with 6 pre-built templates
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Matter duplication for similar cases
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              AI Capabilities
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Multi-model AI (Claude, GPT, Gemini) for document analysis, summarization, and drafting
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Automatic entity extraction (people, dates, organizations, dollar amounts)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Cross-document contradiction detection (finds conflicting statements)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Automatic timeline building from scattered date references
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Theme identification, risk analysis, and action item suggestions
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                AI board builder: describe a board in plain language, AI creates it
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                All AI outputs require attorney review before action is taken
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Timeline & Chronological Intelligence
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Extracts dates from documents (explicit, relative, and contextual)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Classifies events by type (meeting, filing, communication, incident)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Assembles events into chronological order automatically
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Flags contradictions when different documents claim different dates for the same event
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Each timeline entry cites its source document and page
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Evidence & Document Security
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                SHA-256 hash fingerprint for every uploaded file (proves no tampering)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Full chain of custody: who uploaded, viewed, and downloaded every file
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Automatic Bates numbering for organized discovery
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Two-layer classification system (category + subcategory)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Filing cabinet with controlled vocabulary so documents are always findable
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Team & Workflow Management
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Team member profiles with defined roles (Attorney, Paralegal, Staff, etc.)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Multi-attorney and multi-paralegal assignment per matter
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Personal task views: each person sees only their assigned work
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                "All Today" firm-wide daily view for managing partners
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                85+ pre-built workflow automations with AI-powered actions
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Workflow recorder learns from your team's habits and suggests automations
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Billing & Financials
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Per-matter and per-client time tracking with rate calculations
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Billing verifier catches errors before invoices are sent
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Invoice generation, payment tracking, expense management
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Trust accounting with deposits, disbursements, and compliance tracking
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                UTBMS code support for standardized legal billing
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Communications & Collaboration
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Secure client portal for messaging
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Internal team communication tied to matters
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                20 pre-built email templates across 12 legal categories
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Meeting notes with AI summarization
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Daily briefing dashboard for quick morning overviews
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Security & Compliance
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Three-tier role-based access (Admin, Member, Viewer)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Multi-provider authentication (Google, GitHub, Apple, email)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Cloudflare-grade protection against attacks
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Complete audit trail of every action by every user
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                AI usage monitoring and cost tracking
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Your data stays in your dedicated instance and is never shared
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Additional Tools Included
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Visual detective/investigation board with drag-and-drop connections
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                AI-powered legal document generator with URCP compliance checking
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Client intake form builder with 6 pre-built templates
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Calendar with court date and deadline tracking
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Upload organizer for bulk document processing
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Document wash (metadata cleaning for sensitive files)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                Process recorder for capturing and automating workflows
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

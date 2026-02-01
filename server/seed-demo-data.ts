import { storage } from "./storage";

const demoClients = [
  {
    name: "Meridian Technologies Inc.",
    email: "legal@meridiantech.com",
    phone: "(415) 555-0142",
    address: "2100 Market Street, Suite 400, San Francisco, CA 94114",
    notes: "Fortune 500 tech company. Primary contact: Sarah Chen, General Counsel.",
  },
  {
    name: "Hartwell Family Trust",
    email: "james.hartwell@email.com",
    phone: "(650) 555-0198",
    address: "1847 Hillside Avenue, Palo Alto, CA 94301",
    notes: "Estate planning client since 2019. Complex multi-generational trust structure.",
  },
  {
    name: "Coastal Development Partners LLC",
    email: "operations@coastaldevelopment.com",
    phone: "(510) 555-0234",
    address: "500 Broadway, Oakland, CA 94607",
    notes: "Real estate development firm. Active in commercial and residential projects.",
  },
  {
    name: "Dr. Marcus Webb",
    email: "marcus.webb.md@email.com",
    phone: "(408) 555-0167",
    address: "892 El Camino Real, Santa Clara, CA 95050",
    notes: "Medical malpractice defense. Board-certified orthopedic surgeon.",
  },
  {
    name: "Sterling Manufacturing Co.",
    email: "cfo@sterlingmfg.com",
    phone: "(925) 555-0189",
    address: "4500 Industrial Parkway, Concord, CA 94520",
    notes: "Manufacturing client. Employment law and contract disputes.",
  },
  {
    name: "Elena Rodriguez",
    email: "elena.rodriguez@email.com",
    phone: "(415) 555-0276",
    address: "1234 Valencia Street, San Francisco, CA 94110",
    notes: "Personal injury plaintiff. Slip and fall case at Westfield Mall.",
  },
];

const demoMatters = [
  {
    clientIndex: 0,
    name: "Meridian v. TechStart - Patent Infringement",
    caseNumber: "3:24-cv-00847",
    matterType: "Litigation",
    practiceArea: "intellectual-property",
    status: "active" as const,
    description: "Patent infringement lawsuit regarding AI algorithm patents. Seeking injunctive relief and damages.",
    openedDate: "2024-01-15",
    courtName: "U.S. District Court, Northern District of California",
    judgeAssigned: "Hon. William Alsup",
    opposingCounsel: "Morrison & Foerster LLP",
  },
  {
    clientIndex: 0,
    name: "Meridian - Series D Financing",
    matterType: "Transaction",
    practiceArea: "corporate",
    status: "active" as const,
    description: "Series D funding round of $250M. Lead investor: Sequoia Capital.",
    openedDate: "2024-02-01",
  },
  {
    clientIndex: 1,
    name: "Hartwell Family Trust Amendment",
    matterType: "Estate Planning",
    practiceArea: "estate-planning",
    status: "active" as const,
    description: "Amendment to irrevocable trust. Adding grandchildren as beneficiaries.",
    openedDate: "2024-03-10",
  },
  {
    clientIndex: 2,
    name: "Marina Bay Development - Permits & Zoning",
    matterType: "Real Estate",
    practiceArea: "real-estate",
    status: "active" as const,
    description: "Obtaining permits for 200-unit residential development on waterfront property.",
    openedDate: "2024-01-20",
  },
  {
    clientIndex: 3,
    name: "Webb v. State Medical Board",
    caseNumber: "2024-MB-1847",
    matterType: "Administrative",
    practiceArea: "healthcare",
    status: "active" as const,
    description: "Defense against license suspension proceedings. Alleged improper prescribing.",
    openedDate: "2024-04-05",
    courtName: "California Medical Board",
  },
  {
    clientIndex: 4,
    name: "Sterling - Union Negotiations",
    matterType: "Labor",
    practiceArea: "employment",
    status: "active" as const,
    description: "Collective bargaining agreement renegotiation with IBEW Local 595.",
    openedDate: "2024-02-15",
  },
  {
    clientIndex: 5,
    name: "Rodriguez v. Westfield Properties",
    caseNumber: "2024-CV-02847",
    matterType: "Litigation",
    practiceArea: "personal-injury",
    status: "active" as const,
    description: "Premises liability claim. Client suffered broken hip from wet floor with no warning signs.",
    openedDate: "2024-03-22",
    courtName: "San Francisco Superior Court",
    judgeAssigned: "Hon. Maria Garcia",
    opposingCounsel: "Lewis Brisbois Bisgaard & Smith LLP",
  },
];

const demoFiles = [
  {
    matterIndex: 0,
    fileName: "Complaint_Patent_Infringement.pdf",
    serverPath: "/matters/2024-MT-001/pleadings/Complaint_Patent_Infringement.pdf",
    extension: "pdf",
    sizeBytes: 245000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "confidential" as const,
    profile: {
      docCategory: "pleading" as const,
      docType: "complaint",
      docRole: "primary" as const,
      captionTitle: "Complaint for Patent Infringement",
      party: "plaintiff" as const,
      filingDate: "2024-01-20",
      docketNumber: "3:24-cv-00847",
      version: "filed" as const,
      status: "filed" as const,
    },
  },
  {
    matterIndex: 0,
    fileName: "Answer_Counterclaim.pdf",
    serverPath: "/matters/2024-MT-001/pleadings/Answer_Counterclaim.pdf",
    extension: "pdf",
    sizeBytes: 189000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "confidential" as const,
    profile: {
      docCategory: "pleading" as const,
      docType: "answer",
      docRole: "primary" as const,
      captionTitle: "Answer and Counterclaim",
      party: "defendant" as const,
      filingDate: "2024-02-28",
      docketNumber: "3:24-cv-00847",
      version: "filed" as const,
      status: "filed" as const,
    },
  },
  {
    matterIndex: 0,
    fileName: "Motion_Summary_Judgment.pdf",
    serverPath: "/matters/2024-MT-001/motions/Motion_Summary_Judgment.pdf",
    extension: "pdf",
    sizeBytes: 312000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "confidential" as const,
    profile: {
      docCategory: "motion" as const,
      docType: "motion-summary-judgment",
      docRole: "primary" as const,
      captionTitle: "Motion for Partial Summary Judgment",
      party: "plaintiff" as const,
      filingDate: "2024-06-15",
      hearingDate: "2024-08-20",
      docketNumber: "3:24-cv-00847",
      version: "filed" as const,
      status: "filed" as const,
    },
  },
  {
    matterIndex: 0,
    fileName: "Interrogatories_Set1.pdf",
    serverPath: "/matters/2024-MT-001/discovery/Interrogatories_Set1.pdf",
    extension: "pdf",
    sizeBytes: 156000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "confidential" as const,
    profile: {
      docCategory: "discovery" as const,
      docType: "interrogatories",
      docRole: "primary" as const,
      captionTitle: "Plaintiff's First Set of Interrogatories",
      party: "plaintiff" as const,
      serviceDate: "2024-03-15",
      version: "served" as const,
      status: "served" as const,
    },
  },
  {
    matterIndex: 0,
    fileName: "Deposition_Transcript_CEO.pdf",
    serverPath: "/matters/2024-MT-001/discovery/Deposition_Transcript_CEO.pdf",
    extension: "pdf",
    sizeBytes: 892000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "aeo" as const,
    profile: {
      docCategory: "discovery" as const,
      docType: "deposition-transcript",
      docRole: "primary" as const,
      captionTitle: "Deposition of John Smith, CEO of TechStart",
      party: "defendant" as const,
      serviceDate: "2024-05-10",
      version: "received" as const,
      status: "received" as const,
      batesRange: "TECHSTART-00001 to TECHSTART-00245",
    },
  },
  {
    matterIndex: 1,
    fileName: "Term_Sheet_SeriesD.pdf",
    serverPath: "/matters/2024-MT-002/corporate/Term_Sheet_SeriesD.pdf",
    extension: "pdf",
    sizeBytes: 87000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "confidential" as const,
    profile: {
      docCategory: "correspondence" as const,
      docType: "letter",
      docRole: "primary" as const,
      captionTitle: "Series D Term Sheet - Sequoia Capital",
      party: "client" as const,
      filingDate: "2024-02-05",
      version: "final" as const,
      status: "final" as const,
    },
  },
  {
    matterIndex: 1,
    fileName: "Stock_Purchase_Agreement_Draft.docx",
    serverPath: "/matters/2024-MT-002/corporate/Stock_Purchase_Agreement_Draft.docx",
    extension: "docx",
    sizeBytes: 234000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "work-product" as const,
    profile: {
      docCategory: "internal-work-product" as const,
      docType: "draft-document",
      docRole: "draft" as const,
      captionTitle: "Stock Purchase Agreement - Draft v3",
      party: "client" as const,
      version: "draft" as const,
      status: "draft" as const,
      privilegeBasis: "work-product" as const,
    },
  },
  {
    matterIndex: 2,
    fileName: "Trust_Amendment_2024.pdf",
    serverPath: "/matters/2024-HF-001/estate/Trust_Amendment_2024.pdf",
    extension: "pdf",
    sizeBytes: 145000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "privileged" as const,
    profile: {
      docCategory: "admin-operations" as const,
      docType: "retainer-engagement",
      docRole: "final" as const,
      captionTitle: "Third Amendment to Hartwell Family Trust",
      party: "client" as const,
      filingDate: "2024-03-25",
      version: "final" as const,
      status: "final" as const,
      privilegeBasis: "attorney-client" as const,
    },
  },
  {
    matterIndex: 3,
    fileName: "Zoning_Application.pdf",
    serverPath: "/matters/2024-CD-001/permits/Zoning_Application.pdf",
    extension: "pdf",
    sizeBytes: 567000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "public" as const,
    profile: {
      docCategory: "admin-operations" as const,
      docType: "invoice-billing",
      docRole: "primary" as const,
      captionTitle: "Conditional Use Permit Application - Marina Bay",
      party: "client" as const,
      filingDate: "2024-02-10",
      version: "filed" as const,
      status: "filed" as const,
    },
  },
  {
    matterIndex: 4,
    fileName: "Medical_Board_Notice.pdf",
    serverPath: "/matters/2024-MW-001/admin/Medical_Board_Notice.pdf",
    extension: "pdf",
    sizeBytes: 98000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "confidential" as const,
    profile: {
      docCategory: "order-ruling" as const,
      docType: "court-order",
      docRole: "primary" as const,
      captionTitle: "Notice of Accusation - Medical Board of California",
      party: "court" as const,
      filingDate: "2024-04-01",
      version: "received" as const,
      status: "received" as const,
    },
  },
  {
    matterIndex: 5,
    fileName: "CBA_Proposal_Draft.docx",
    serverPath: "/matters/2024-SM-001/negotiations/CBA_Proposal_Draft.docx",
    extension: "docx",
    sizeBytes: 178000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "work-product" as const,
    profile: {
      docCategory: "internal-work-product" as const,
      docType: "legal-memo",
      docRole: "draft" as const,
      captionTitle: "CBA Counter-Proposal - Management Position",
      party: "client" as const,
      version: "draft" as const,
      status: "draft" as const,
      privilegeBasis: "work-product" as const,
    },
  },
  {
    matterIndex: 6,
    fileName: "Demand_Letter_Westfield.pdf",
    serverPath: "/matters/2024-ER-001/correspondence/Demand_Letter_Westfield.pdf",
    extension: "pdf",
    sizeBytes: 45000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "confidential" as const,
    profile: {
      docCategory: "correspondence" as const,
      docType: "demand-letter",
      docRole: "primary" as const,
      captionTitle: "Demand for Compensation - Rodriguez Injury Claim",
      party: "plaintiff" as const,
      serviceDate: "2024-04-15",
      version: "served" as const,
      status: "served" as const,
    },
  },
  {
    matterIndex: 6,
    fileName: "Medical_Records_SF_General.pdf",
    serverPath: "/matters/2024-ER-001/evidence/Medical_Records_SF_General.pdf",
    extension: "pdf",
    sizeBytes: 1234000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "aeo" as const,
    profile: {
      docCategory: "evidence-records" as const,
      docType: "medical-records",
      docRole: "exhibit" as const,
      captionTitle: "Medical Records - SF General Hospital",
      party: "plaintiff" as const,
      serviceDate: "2024-04-20",
      version: "received" as const,
      status: "received" as const,
      batesRange: "RODRIGUEZ-MED-0001 to RODRIGUEZ-MED-0089",
    },
  },
  {
    matterIndex: 6,
    fileName: "Incident_Photos.zip",
    serverPath: "/matters/2024-ER-001/evidence/Incident_Photos.zip",
    extension: "zip",
    sizeBytes: 15670000,
    isEmail: false,
    isAttachment: false,
    confidentiality: "confidential" as const,
    profile: {
      docCategory: "evidence-records" as const,
      docType: "photographs",
      docRole: "exhibit" as const,
      captionTitle: "Scene Photographs - Westfield Mall Incident",
      party: "plaintiff" as const,
      filingDate: "2024-03-25",
      version: "final" as const,
      status: "final" as const,
    },
  },
];

const demoEvidence = [
  {
    matterIndex: 0,
    originalName: "Patent_US10234567_Original.pdf",
    originalUrl: "https://storage.example.com/evidence/patent-us10234567.pdf",
    originalHash: "sha256:a3f8b7c2e1d9f0a5b4c6e8d9f1a3b5c7e9d2f4a6b8c0d2e4f6a8b0c2d4e6f8a0",
    originalSize: 2450000,
    originalMimeType: "application/pdf",
    evidenceType: "document" as const,
    confidentiality: "confidential" as const,
    description: "Original patent document US10234567 - Machine Learning Algorithm",
    tags: ["patent", "prior-art", "algorithm"],
    uploadedBy: "Sarah Mitchell",
  },
  {
    matterIndex: 0,
    originalName: "TechStart_Source_Code_Samples.zip",
    originalUrl: "https://storage.example.com/evidence/techstart-source.zip",
    originalHash: "sha256:b4f9c8d3e2a0f1b6c5d7e9a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0",
    originalSize: 15670000,
    originalMimeType: "application/zip",
    evidenceType: "document" as const,
    confidentiality: "work-product" as const,
    description: "Source code samples from TechStart product demonstrating infringement",
    tags: ["source-code", "forensic", "infringement"],
    uploadedBy: "CyberTech Labs",
  },
  {
    matterIndex: 6,
    originalName: "Security_Camera_Footage.mp4",
    originalUrl: "https://storage.example.com/evidence/security-footage.mp4",
    originalHash: "sha256:c5a0d9e4f3b1a2c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4",
    originalSize: 156700000,
    originalMimeType: "video/mp4",
    evidenceType: "video" as const,
    confidentiality: "confidential" as const,
    description: "Westfield Mall security camera footage showing slip and fall incident",
    tags: ["video", "incident", "surveillance"],
    uploadedBy: "Thomas Wright",
  },
  {
    matterIndex: 6,
    originalName: "Witness_Statement_Johnson.pdf",
    originalUrl: "https://storage.example.com/evidence/witness-johnson.pdf",
    originalHash: "sha256:d6b1e0f5a4c2b3d7e9f1a3b5c7e9d1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5",
    originalSize: 45000,
    originalMimeType: "application/pdf",
    evidenceType: "document" as const,
    confidentiality: "confidential" as const,
    description: "Written statement from eyewitness Mary Johnson",
    tags: ["witness", "statement", "notarized"],
    uploadedBy: "Thomas Wright",
  },
];

const demoDetectiveNodes = [
  {
    matterIndex: 0,
    nodes: [
      { type: "person" as const, title: "John Smith", description: "CEO of TechStart. Former employee of Meridian (2018-2020). Had access to proprietary algorithms.", position: { x: 100, y: 100 }, color: "#ef4444" },
      { type: "person" as const, title: "Dr. Lisa Chen", description: "Lead AI Researcher at TechStart. Hired 3 months after Smith joined.", position: { x: 300, y: 100 }, color: "#3b82f6" },
      { type: "evidence" as const, title: "Patent US10234567", description: "Meridian's patent for ML optimization algorithm. Filed 2019.", position: { x: 100, y: 250 }, color: "#10b981" },
      { type: "event" as const, title: "TechStart Product Launch", description: "TechStart launched competing product 6 months after Smith joined.", position: { x: 300, y: 250 }, color: "#f59e0b" },
      { type: "event" as const, title: "Smith Resignation", description: "John Smith resigned from Meridian on March 15, 2020. Exit interview noted 'career growth'.", position: { x: 200, y: 400 }, color: "#8b5cf6" },
      { type: "evidence" as const, title: "Source Code Comparison", description: "Forensic analysis shows 73% similarity between Meridian's patented code and TechStart implementation.", position: { x: 400, y: 350 }, color: "#ec4899" },
    ],
    connections: [
      { sourceIndex: 0, targetIndex: 4, label: "Resigned from Meridian", connectionType: "timeline" as const },
      { sourceIndex: 0, targetIndex: 1, label: "Recruited", connectionType: "related" as const },
      { sourceIndex: 2, targetIndex: 5, label: "Compared to", connectionType: "supports" as const },
      { sourceIndex: 3, targetIndex: 5, label: "Based on analysis", connectionType: "supports" as const },
      { sourceIndex: 4, targetIndex: 3, label: "6 months later", connectionType: "timeline" as const },
    ],
  },
  {
    matterIndex: 6,
    nodes: [
      { type: "person" as const, title: "Elena Rodriguez", description: "Plaintiff. Age 67. Suffered broken hip requiring surgery.", position: { x: 250, y: 100 }, color: "#3b82f6" },
      { type: "location" as const, title: "Westfield Mall - Food Court", description: "Incident location. Recently mopped floor. No wet floor signs present.", position: { x: 100, y: 250 }, color: "#ef4444" },
      { type: "person" as const, title: "Mary Johnson", description: "Eyewitness. Was sitting at nearby table. Saw plaintiff slip.", position: { x: 400, y: 250 }, color: "#10b981" },
      { type: "evidence" as const, title: "Security Footage", description: "Shows janitor mopping floor, leaving, and plaintiff slipping 4 minutes later.", position: { x: 250, y: 400 }, color: "#f59e0b" },
      { type: "evidence" as const, title: "Maintenance Log", description: "Shows floor was scheduled for mopping but no wet floor sign checkout recorded.", position: { x: 450, y: 400 }, color: "#8b5cf6" },
      { type: "person" as const, title: "James Martinez", description: "Westfield janitor on duty. Admits to not placing warning signs.", position: { x: 100, y: 400 }, color: "#ec4899" },
    ],
    connections: [
      { sourceIndex: 0, targetIndex: 1, label: "Slipped at location", connectionType: "related" as const },
      { sourceIndex: 2, targetIndex: 0, label: "Witnessed fall", connectionType: "supports" as const },
      { sourceIndex: 3, targetIndex: 1, label: "Captured incident", connectionType: "supports" as const },
      { sourceIndex: 5, targetIndex: 1, label: "Mopped floor", connectionType: "related" as const },
      { sourceIndex: 4, targetIndex: 5, label: "Confirms no signs", connectionType: "supports" as const },
      { sourceIndex: 3, targetIndex: 5, label: "Shows on camera", connectionType: "supports" as const },
    ],
  },
];

const demoTasks = [
  { groupName: "Urgent", title: "File opposition brief - Meridian v. TechStart", description: "Draft and file opposition to defendant's motion to dismiss", status: "working-on-it" as const, priority: "critical" as const, progress: 65, tags: ["litigation", "deadline"], notes: "" },
  { groupName: "Urgent", title: "Prepare deposition outline - Dr. Lisa Chen", description: "Prepare questions for upcoming deposition of TechStart's lead researcher", status: "not-started" as const, priority: "high" as const, progress: 0, tags: ["discovery", "deposition"], notes: "" },
  { groupName: "In Progress", title: "Review Series D term sheet revisions", description: "Review latest round of edits from Sequoia's counsel", status: "working-on-it" as const, priority: "high" as const, progress: 80, tags: ["corporate", "review"], notes: "" },
  { groupName: "In Progress", title: "Draft trust amendment for Hartwell family", description: "Add grandchildren as beneficiaries per client instruction", status: "working-on-it" as const, priority: "medium" as const, progress: 45, tags: ["estate", "drafting"], notes: "" },
  { groupName: "In Progress", title: "Compile medical records for Rodriguez case", description: "Organize all medical records for demand package", status: "pending-review" as const, priority: "medium" as const, progress: 90, tags: ["personal-injury", "medical"], notes: "" },
  { groupName: "Research", title: "Research prior art for patent validity challenge", description: "Find prior art that predates the '567 patent claims", status: "not-started" as const, priority: "medium" as const, progress: 0, tags: ["ip", "research"], notes: "" },
  { groupName: "Research", title: "Review comparable verdicts - slip and fall cases", description: "Research similar premises liability verdicts in SF County", status: "working-on-it" as const, priority: "low" as const, progress: 30, tags: ["research", "valuation"], notes: "" },
  { groupName: "Completed", title: "File complaint - Meridian v. TechStart", description: "Initial complaint filed in NDCA", status: "done" as const, priority: "high" as const, progress: 100, tags: ["litigation", "completed"], notes: "" },
  { groupName: "Completed", title: "Serve interrogatories on TechStart", description: "First set of interrogatories served via email", status: "done" as const, priority: "medium" as const, progress: 100, tags: ["discovery", "completed"], notes: "" },
  { groupName: "Completed", title: "Initial client intake - Elena Rodriguez", description: "Completed intake interview and signed retainer", status: "done" as const, priority: "medium" as const, progress: 100, tags: ["intake", "completed"], notes: "" },
];

export async function seedDemoData() {
  console.log("Starting demo data seeding...");

  try {
    const createdClients: any[] = [];
    for (const client of demoClients) {
      const created = await storage.createClient(client);
      createdClients.push(created);
      console.log(`Created client: ${client.name}`);
    }

    const createdMatters: any[] = [];
    for (const matter of demoMatters) {
      const clientId = createdClients[matter.clientIndex].id;
      const { clientIndex, ...matterData } = matter;
      const created = await storage.createMatter({ ...matterData, clientId });
      createdMatters.push(created);
      console.log(`Created matter: ${matter.name}`);
    }

    for (const file of demoFiles) {
      const matterId = createdMatters[file.matterIndex].id;
      const { matterIndex, profile, ...fileData } = file;
      const createdFile = await storage.createFileItem({ ...fileData, matterId });
      if (profile) {
        await storage.createDocProfile({ ...profile, fileId: createdFile.id });
      }
      console.log(`Created file: ${file.fileName}`);
    }

    for (const evidence of demoEvidence) {
      const matterId = createdMatters[evidence.matterIndex].id;
      const { matterIndex, ...evidenceData } = evidence;
      await storage.createEvidenceVaultFile({ ...evidenceData, matterId });
      console.log(`Created evidence: ${evidence.originalName}`);
    }

    for (const nodeData of demoDetectiveNodes) {
      const matterId = createdMatters[nodeData.matterIndex].id;
      const createdNodes: any[] = [];
      for (const node of nodeData.nodes) {
        const created = await storage.createDetectiveNode({ ...node, matterId });
        createdNodes.push(created);
      }
      for (const conn of nodeData.connections) {
        await storage.createDetectiveConnection({
          matterId,
          sourceNodeId: createdNodes[conn.sourceIndex].id,
          targetNodeId: createdNodes[conn.targetIndex].id,
          label: conn.label,
          connectionType: conn.connectionType,
          strength: 3,
          notes: "",
        });
      }
      console.log(`Created detective board for matter: ${createdMatters[nodeData.matterIndex].name}`);
    }

    const boards = await storage.getBoards();
    if (boards.length > 0) {
      const boardId = boards[0].id;
      const groups = await storage.getGroups(boardId);
      
      for (const task of demoTasks) {
        const group = groups.find(g => g.title === task.groupName) || groups[0];
        const { groupName, ...taskData } = task;
        await storage.createTask({
          ...taskData,
          boardId,
          groupId: group.id,
          assignees: [],
          owner: null,
          timeEstimate: null,
          customFields: {},
          subtasks: [],
        });
        console.log(`Created task: ${task.title}`);
      }
    }

    console.log("\nDemo data seeding completed successfully!");
    console.log(`Created: ${createdClients.length} clients, ${createdMatters.length} matters, ${demoFiles.length} files, ${demoEvidence.length} evidence items`);
    
  } catch (error) {
    console.error("Error seeding demo data:", error);
    throw error;
  }
}

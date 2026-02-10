import { BoardsStorage } from "./boards.storage";
import { AIStorage } from "./ai.storage";
import { EvidenceStorage } from "./evidence.storage";
import { TimelineStorage } from "./timeline.storage";
import { ThreadsStorage } from "./threads.storage";
import { ClientsStorage } from "./clients.storage";
import { ContactsStorage } from "./contacts.storage";
import { ResearchStorage } from "./research.storage";
import { AutomationsStorage } from "./automations.storage";
import { DetectiveStorage } from "./detective.storage";
import { FilesStorage } from "./files.storage";
import { PeopleStorage } from "./people.storage";
import { BillingStorage } from "./billing.storage";
import { CalendarStorage } from "./calendar.storage";
import { ApprovalsStorage } from "./approvals.storage";
import { DocumentsStorage } from "./documents.storage";
import { FormsStorage } from "./forms.storage";
import { MeetingsStorage } from "./meetings.storage";
import { SecurityStorage } from "./security.storage";
import { AdminStorage } from "./admin.storage";

const boards = new BoardsStorage();
const ai = new AIStorage();
const evidence = new EvidenceStorage();
const timeline = new TimelineStorage();
const threads = new ThreadsStorage();
const clients = new ClientsStorage();
const contacts = new ContactsStorage();
const research = new ResearchStorage();
const automations = new AutomationsStorage();
const detective = new DetectiveStorage();
const files = new FilesStorage();
const people = new PeopleStorage();
const billing = new BillingStorage();
const calendar = new CalendarStorage();
const approvals = new ApprovalsStorage();
const documents = new DocumentsStorage();
const forms = new FormsStorage();
const meetings = new MeetingsStorage();
const security = new SecurityStorage();
const admin = new AdminStorage();

function bindAll<T extends object>(instance: T): T {
  const proto = Object.getPrototypeOf(instance);
  const methodNames = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== "constructor" && typeof (instance as any)[name] === "function"
  );
  const bound: any = {};
  for (const name of methodNames) {
    bound[name] = (instance as any)[name].bind(instance);
  }
  return bound as T;
}

export const storage = {
  ...bindAll(boards),
  ...bindAll(ai),
  ...bindAll(evidence),
  ...bindAll(timeline),
  ...bindAll(threads),
  ...bindAll(clients),
  ...bindAll(contacts),
  ...bindAll(research),
  ...bindAll(automations),
  ...bindAll(detective),
  ...bindAll(files),
  ...bindAll(people),
  ...bindAll(billing),
  ...bindAll(calendar),
  ...bindAll(approvals),
  ...bindAll(documents),
  ...bindAll(forms),
  ...bindAll(meetings),
  ...bindAll(security),
  ...bindAll(admin),
};

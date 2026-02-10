Below is a “north star” write-up you can paste into Replit as the core brain spec for VERICASE. It’s written like an internal operating doctrine + execution pipeline. This is the app’s religion: how it thinks, how it processes, and how it stays courtroom-safe.

⸻

VERICASE Core Doctrine

VERICASE turns messy case materials into structured, defensible insight—without hallucinating facts.
It treats every document as a piece of evidence with (1) content, (2) context, (3) reliability, and (4) relationship to other evidence. Its job is to reveal patterns, contradictions, and narrative leverage while preserving chain-of-custody thinking and legal relevance.

The Overarching Theme

“Totality of the circumstances, measured—then argued.”
No single artifact has to be a slam dunk. VERICASE wins by building converging lines of evidence: independent signals that, together, create a coherent explanation that maps to legal elements.

⸻

How VERICASE Thinks

VERICASE maintains multiple competing hypotheses and updates confidence as evidence arrives. It does not “decide the truth.” It produces:
	•	What the evidence suggests
	•	How strongly it suggests it
	•	What else could explain it
	•	What would change the conclusion

Prime Directive: Evidence Over Vibes

VERICASE may analyze emotion, tone, and behavioral cues, but it must always:
	•	Separate observations from inferences
	•	Tie inferences to specific evidence citations
	•	Attach a confidence level + alternative explanations
	•	Avoid definitive claims unless the evidence is direct and corroborated

⸻

The Case Engine (Single-Case Brain Loop)

1) Intake and Preservation

For each incoming item (PDF, photo, scan, email export, screenshot, audio/video, etc.):
	•	Assign immutable DocumentID
	•	Record metadata: filename, source, received time, hash (integrity), file type, pages
	•	Store original file as read-only
	•	Create a working copy for processing outputs

Output: Chain-of-custody log + document registry.

⸻

2) Normalization and Extraction

VERICASE extracts everything into structured layers:

A) Text Layer
	•	OCR all pages/images
	•	Preserve layout when possible (tables, headers, signatures)
	•	Detect language, handwritten vs typed, stamps, redactions

B) Visual Layer
	•	Detect entities in images: faces, logos, objects, weapons (flag), injuries, damages, drugs (flag), IDs, license plates (flag), receipts, screens, addresses
	•	Extract embedded text from images (screenshots, photos of text)
	•	Identify scene context: indoor/outdoor, lighting, time-of-day cues (inference flagged)

C) Document Structure Layer
	•	Split into sections: parties, dates, claims, invoices, communications, exhibits
	•	Detect document type: contract, police report, medical record, invoice, chat log, affidavit, photo evidence, etc.

Output: A “Document Profile” with text, entities, structural sections, and visual findings.

⸻

3) Entity + Event Graph Construction (the spiderweb, but honest)

VERICASE builds a case knowledge graph with nodes + edges.

Nodes (examples):
	•	People, organizations, addresses, phone numbers, emails
	•	Dates/times, locations, case numbers
	•	Money amounts, bank names, transaction references
	•	Objects (vehicle, device, weapon, damage item), policies, medications, injuries

Edges (examples):
	•	“Person A communicated with Person B”
	•	“Invoice references Event X”
	•	“Photo likely taken at Location Y” (flagged as inference)
	•	“Document mentions address”
	•	“Entity appears across documents”

Every node/edge stores:
	•	Evidence citations (page/line/region)
	•	Source document IDs
	•	Confidence score
	•	Whether it’s observed or inferred

Output: Case graph + traceable citations for every claim.

⸻

4) Pattern Detection Across the Case (the cumulative proof machine)

This is where VERICASE stops reading documents “one by one” and starts thinking like a team of analysts.

A) Similarity & Clustering
	•	Cluster documents by topic, time period, participants, and emotional tone
	•	Detect repeated phrases, repeated demands, repeated threats, repeated procedural language
	•	Identify “signature behaviors” (modus operandi patterns)

B) Convergence of Independent Evidence
VERICASE searches for claims supported by multiple independent sources:
	•	Example: “Presence at location” supported by receipt + photo metadata + witness statement
Independence matters: one screenshot copied into three PDFs is still one source.

C) Contradiction & Gap Finder
	•	Conflicting dates/times
	•	Inconsistent narratives between parties
	•	Missing links (expected documents that don’t exist)
	•	Timeline impossibilities (travel time, sequence errors, conflicting locations)

Output: Pattern report + contradiction list + “missing evidence checklist.”

⸻

5) Emotion, Tone, and Behavioral Analysis (careful, defensible)

VERICASE can analyze:
	•	Sentiment (hostile, conciliatory, coercive, fearful)
	•	Coercion markers (threats, intimidation, conditional demands)
	•	Manipulation cues (gaslighting language, DARVO patterns, escalating pressure)
	•	Trauma/affect signals (when appropriate and flagged carefully)

But it must follow rules:
	•	Emotion analysis is supporting context, not proof of conduct
	•	It is always paired with the exact quoted text and document location
	•	It always offers at least one alternative interpretation

Output: Tone map across timeline + excerpts with citations + cautious interpretations.

⸻

6) Timeline as the Backbone

VERICASE constructs a timeline with:
	•	Events (who/what/when/where)
	•	Confidence + source citations
	•	Links to graph nodes and exhibits
	•	“Forks” when narratives conflict (two versions preserved, not overwritten)

It also computes:
	•	Temporal patterns: escalation, clustering, response delays, repeated cycles
	•	Opportunity windows and plausibility checks (travel time, office hours, etc.—flagged)

Output: Interactive timeline + printable chronology with citations.

⸻

7) Hypothesis Management (null vs alternative—grown-up version)

VERICASE maintains a “Hypothesis Board” for each case:
	•	H1, H2, H3… (competing explanations)
	•	Evidence supporting each
	•	Evidence contradicting each
	•	“What would falsify this” triggers
	•	Confidence updates as new docs arrive

This prevents tunnel vision and helps attorneys stay credible.

Output: Hypothesis matrix + update log.

⸻

8) Legal Element Mapping (turn pattern into pleadable structure)

VERICASE maps evidence clusters to legal elements:
	•	Intent, knowledge, causation, damages, duty, breach, pattern, notice, etc.
	•	For each element: strongest supporting exhibits + corroboration level
	•	Identify weak elements and what evidence would strengthen them

Output: Element-to-evidence map + “weak link” alerts.

⸻

9) Risk and Reliability Scoring (institutional discipline)

Every key claim gets:
	•	Source reliability (official record vs screenshot vs hearsay)
	•	Corroboration (single-source vs multi-source)
	•	Manipulation risk (editable formats, missing metadata, inconsistent copies)
	•	Materiality (how much it matters to an element or damages)

VERICASE should label:
	•	“Strong / Moderate / Weak” evidentiary strength
	•	“Needs authentication” flags

Output: Evidence strength dashboard + authentication to-dos.

⸻

10) Deliverables (what the lawyer actually uses)

VERICASE produces attorney-ready artifacts:
	1.	Case Summary (neutral, factual)
	2.	Narrative Theory Draft (persuasive but citation-anchored)
	3.	Chronology of Events (with exhibit links)
	4.	Pattern & Modus Operandi Report
	5.	Contradictions + Impeachment Points
	6.	Key Exhibits List + Why They Matter
	7.	Open Questions + Discovery Targets
	8.	Visual Map (graph) of relationships and corroboration

Everything must be exportable and traceable back to the original source.

⸻

Non-Negotiables (the guardrails that keep it admissible-ish)
	•	No hallucinations: If it can’t cite it, it can’t claim it.
	•	Observed vs inferred must be explicit (and inference never masquerades as fact).
	•	Independence matters: don’t count duplicated evidence twice.
	•	Confidence must be shown: no “definitely” without direct corroboration.
	•	Privacy + minimization: redact/mask sensitive data in outputs by default.
	•	Audit trail: every transformation gets logged.

⸻

The One-Sentence Motto

“Build the web, show the receipts, and let the totality speak.”

That’s the brain.

If you keep building with this doctrine, VERICASE won’t just “summarize documents.” It’ll operate like a disciplined institutional analyst—except the commodity is evidence, and the end product is a courtroom-grade narrative backed by citations.
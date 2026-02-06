# API & UI Reference

> **AUTHORITATIVE SOURCE** - This file documents all API endpoints, DB tables, JS functions, and UI elements.
>
> **MANDATORY**: Update this file when adding/changing any of these components.
>
> **Generated**: 2026-01-21 | **Last Updated**: 2026-01-21

---

## Quick Stats

| Component | Count | Location |
|-----------|-------|----------|
| API Endpoints | 339 | `main.py`, `analysis/api.py` |
| DB Tables | 60 | `db/analysis.py`, `db/memory.py` |
| JS Functions | 501 | `main.py` (embedded) |
| Element IDs | 635 | `main.py` (HTML) |
| Fetch Calls | 28 | `main.py` (JS) |

---

## Table of Contents

1. [API Endpoints](#1-api-endpoints)
2. [Database Tables](#2-database-tables)
3. [JavaScript Functions](#3-javascript-functions)
4. [UI Element IDs](#4-ui-element-ids)
5. [Frontend Fetch Calls](#5-frontend-fetch-calls)
6. [Update Checklist](#6-update-checklist)

---

## 1. API Endpoints

### 1.1 Core System (15 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Redirect to /ui |
| GET | `/ui` | Main web UI |
| GET | `/health` | Health check |
| GET | `/health/extractors` | Extractor health |
| GET | `/metrics` | Prometheus metrics |
| GET | `/manual` | User manual page |
| GET | `/demo` | Demo page |
| GET | `/static/icons/listsyn-icon.svg` | App icon |
| GET | `/system/metrics` | System metrics JSON |
| GET | `/system/jobs` | Background jobs list |
| DELETE | `/system/jobs/{job_id}` | Cancel job |
| GET | `/system/agent-jobs` | Agent job list |
| GET | `/system/agent-jobs/{job_id}` | Agent job detail |
| DELETE | `/system/agent-jobs/{job_id}` | Cancel agent job |
| GET | `/system/agent-queue-stats` | Queue statistics |
| POST | `/system/reconcile-graph` | Fix missing graph nodes |
| GET | `/system/graph-failures` | Failed graph tasks |
| GET | `/system/gpu-scheduler` | GPU lock status |

### 1.2 Cases & Clients (25 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/cases` | Create case |
| GET | `/cases` | List cases |
| GET | `/cases/{case_id}` | Get case |
| PUT | `/cases/{case_id}` | Update case |
| DELETE | `/cases/{case_id}` | Delete case |
| POST | `/cases/{case_id}/clients` | Add client |
| GET | `/cases/{case_id}/clients` | List clients |
| GET | `/clients/{client_id}` | Get client |
| PUT | `/clients/{client_id}` | Update client |
| PATCH | `/clients/{client_id}` | Partial update |
| DELETE | `/clients/{client_id}` | Delete client |
| GET | `/clients/{client_id}/documents` | Client docs |
| POST | `/clients/{client_id}/upload` | Upload to client |
| GET | `/cases/{case_id}/documents` | Case docs |
| GET | `/cases/{case_id}/client-review-queue` | Docs needing client assignment |
| GET | `/cases/{case_id}/deadlines` | Case deadlines |
| GET | `/cases/{case_id}/findings` | Agent findings |
| GET | `/cases/{case_id}/findings/stats` | Findings stats |
| GET | `/cases/{case_id}/analysis-summary` | Full analysis summary |
| POST | `/cases/{case_id}/time/start` | Start timer |
| POST | `/cases/{case_id}/time/stop` | Stop timer |
| GET | `/cases/{case_id}/time` | Time entries |
| DELETE | `/cases/{case_id}/time/{entry_id}` | Delete time entry |
| POST | `/cases/{case_id}/notes` | Create note |
| GET | `/cases/{case_id}/notes` | List notes |
| PUT | `/cases/{case_id}/notes/{note_id}` | Update note |
| DELETE | `/cases/{case_id}/notes/{note_id}` | Delete note |
| POST | `/cases/{case_id}/classify` | Auto-classify case type |

### 1.3 Documents (35 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/upload-document` | Upload document |
| GET | `/documents` | List documents |
| GET | `/documents/{document_id}/preview` | Document preview |
| GET | `/documents/{document_id}/full-analysis` | Full analysis |
| POST | `/documents/{document_id}/reanalyze` | Re-run analysis |
| GET | `/documents/{document_id}/file` | Download file |
| GET | `/documents/{document_id}/verify` | Verify integrity |
| GET | `/documents/{document_id}/custody-chain` | Chain of custody |
| GET | `/documents/{document_id}/export-for-court` | Court export |
| DELETE | `/documents/{document_id}` | Delete document |
| PATCH | `/documents/{document_id}/related-clients` | Update client links |
| POST | `/documents/{document_id}/resolve-client-review` | Resolve client assignment |
| GET | `/documents/{document_id}/type` | Get doc type |
| POST | `/documents/{document_id}/claims` | Add claim |
| PUT | `/claims/{claim_id}` | Update claim |
| DELETE | `/claims/{claim_id}` | Delete claim |
| POST | `/documents/{document_id}/evidence` | Add evidence |
| PUT | `/evidence/{evidence_id}` | Update evidence |
| DELETE | `/evidence/{evidence_id}` | Delete evidence |
| GET | `/search-documents` | Search documents |
| POST | `/analyze-all` | Analyze all docs |

### 1.4 Analysis Queue (12 endpoints)

**Router prefix**: `/analysis` (in `analysis/api.py`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/analysis/queue` | Queue document |
| GET | `/analysis/result/{document_id}` | Get result |
| GET | `/analysis/queue/status` | Queue status |
| GET | `/analysis/hot-documents/{case_id}` | Hot documents |
| GET | `/analysis/privilege-review/{case_id}` | Privilege review queue |
| POST | `/analysis/batch-queue` | Queue multiple |
| POST | `/analysis/queue/pause` | Pause queue |
| POST | `/analysis/queue/resume` | Resume queue |
| POST | `/analysis/queue/clear` | Clear queue |
| POST | `/analysis/queue/skip/{document_id}` | Skip document |
| GET | `/analysis/queue/paused` | Is paused? |
| GET | `/analysis/queue/processing` | Currently processing |
| POST | `/analysis/backfill/{case_id}` | Backfill case |

### 1.5 RAG & Queries (15 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/query` | Basic query |
| POST | `/rag-query` | RAG query |
| POST | `/legal-query` | Legal query |
| POST | `/medical-legal-query` | Medical-legal query |
| GET | `/search-npi` | Search NPI registry |
| GET | `/search-cases` | Search cases |
| POST | `/smart-extract` | Smart extraction |
| POST | `/compare-extraction` | Compare extractors |
| POST | `/compare-extraction/batch` | Batch compare |
| POST | `/detect-tables` | Detect tables |
| GET | `/extraction/status` | Extraction status |
| POST | `/extraction/test` | Test extraction |
| POST | `/extraction/coreference` | Coreference resolution |
| POST | `/extraction/with-coreference` | Extract + coreference |
| POST | `/extraction/reprocess` | Reprocess document |

### 1.6 Entities (25 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/cases/{case_id}/entities` | List entities |
| POST | `/cases/{case_id}/entities` | Create entity |
| GET | `/entities/{entity_id}` | Get entity |
| PATCH | `/entities/{entity_id}` | Update entity |
| DELETE | `/entities/{entity_id}` | Delete entity |
| POST | `/cases/{case_id}/entities/cleanup` | Dedupe entities |
| GET | `/cases/{case_id}/entities/search` | Search entities |
| GET | `/entities/{entity_id}/timeline` | Entity timeline |
| POST | `/entities/{entity_id}/timeline` | Add timeline event |
| DELETE | `/entities/{entity_id}/timeline/{event_id}` | Delete event |
| GET | `/entities/{entity_id}/background` | Background info |
| POST | `/entities/{entity_id}/background` | Add background |
| POST | `/entities/{entity_id}/background/{record_id}/flag` | Flag record |
| GET | `/entities/{entity_id}/mentions` | Document mentions |
| POST | `/entities/{entity_id}/mentions` | Add mention |
| POST | `/cases/{case_id}/pi-investigate` | Run PI agent |
| GET | `/cases/{case_id}/entity-background` | All backgrounds |
| GET | `/knowledge/entities` | Knowledge graph entities |

### 1.7 Timeline (20 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/timeline/{case_id}/events` | Timeline events |
| GET | `/timeline/{case_id}/inconsistencies` | Inconsistencies |
| POST | `/timeline/{case_id}/inconsistencies/{id}/resolve` | Resolve |
| POST | `/timeline/{case_id}/detect-inconsistencies` | Detect |
| POST | `/timeline/{case_id}/events` | Add event |
| POST | `/timeline/{case_id}/smart-group` | Smart grouping |
| GET | `/timeline/{case_id}/smart-group` | Get groups |
| GET | `/timeline/{case_id}/compare` | Compare timelines |
| GET | `/timeline/{case_id}/summary` | Summary |
| GET | `/cases/{case_id}/event-notes` | Event notes |
| POST | `/cases/{case_id}/events/{event_id}/notes` | Add note |
| POST | `/cases/{case_id}/events/{event_id}/reanalyze` | Reanalyze |
| GET | `/cases/{case_id}/hypotheticals` | Hypotheticals |
| POST | `/cases/{case_id}/hypotheticals` | Create hypothetical |
| POST | `/cases/{case_id}/analyze-hypothetical` | Analyze |

### 1.8 Investigation (35 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/investigation/{case_id}/run` | Run investigation |
| POST | `/investigation/{case_id}/detect-contradictions` | Detect contradictions |
| GET | `/investigation/{case_id}/claims` | Get claims |
| GET | `/investigation/{case_id}/evidence` | Get evidence |
| GET | `/investigation/{case_id}/contradictions` | Get contradictions |
| POST | `/investigation/{case_id}/contradictions/{id}/review` | Review |
| GET | `/investigation/{case_id}/credibility` | Credibility scores |
| POST | `/investigation/{case_id}/calculate-credibility` | Calculate |
| GET | `/investigation/{case_id}/stats` | Statistics |
| GET | `/investigation/{case_id}/report` | Full report |
| GET | `/investigation/{case_id}/research-needs` | Research needs |
| POST | `/investigation/{case_id}/fetch-research` | Fetch research |
| GET | `/investigation/{case_id}/search-caselaw` | Search case law |
| GET | `/investigation/{case_id}/search-provider` | Search provider |
| POST | `/investigation/{case_id}/smart-research` | Smart research |
| GET | `/investigation/{case_id}/jurisdiction-context` | Jurisdiction |
| POST | `/investigation/{case_id}/research-agent/analyze` | Research agent |
| GET | `/investigation/{case_id}/cached-research` | Cached research |
| GET | `/investigation/{case_id}/rules/{rule_id}` | Get rule |
| PATCH | `/investigation/{case_id}/rules/{rule_id}` | Update rule |
| POST | `/investigation/{case_id}/import-research/{cache_id}` | Import |
| POST | `/investigation/{case_id}/research-entities` | Research entities |
| POST | `/investigation/{case_id}/research-entity` | Research entity |
| POST | `/investigation/{case_id}/generate-strategy` | Generate strategy |
| GET | `/investigation/{case_id}/strategy` | Get strategy |
| POST | `/investigation/{case_id}/strategy/item/{id}/refine` | Refine |
| POST | `/investigation/{case_id}/strategy/add` | Add item |
| POST | `/investigation/{case_id}/mr-smith-analyze` | MR-Smith analyze |

### 1.9 Contradiction Detection (6 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/contradiction/check` | Check for contradictions |
| POST | `/contradiction/alerts/{alert_id}/feedback` | Provide feedback |
| GET | `/contradiction/alerts` | List alerts |
| GET | `/contradiction/model/status` | Model status |
| POST | `/contradiction/model/load` | Load model |

### 1.10 Agents (35 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/agents/status` | All agent status |
| GET | `/agents/status/{case_id}/{agent_name}` | Specific status |
| POST | `/agents/run/{agent_name}/{case_id}` | Run agent |
| POST | `/agents/simulate` | Simulate agent |
| POST | `/agents/chat` | Chat with agent |
| GET | `/agents/chat/{case_id}` | Chat history |
| DELETE | `/agents/chat/{case_id}` | Clear chat |
| POST | `/agents/{case_id}/{agent_id}/chat` | Agent-specific chat |
| GET | `/agents/{case_id}/chat-sessions` | List sessions |
| GET | `/agents/{case_id}/chat-history` | Chat history |
| GET | `/agents/session/{session_id}/messages` | Session messages |
| POST | `/agents/{case_id}/{agent_id}/new-session` | New session |
| POST | `/agents/session/{session_id}/archive` | Archive |
| PUT | `/agents/session/{session_id}/title` | Update title |
| DELETE | `/agents/session/{session_id}` | Delete session |
| POST | `/agents/session/{session_id}/insight` | Save insight |
| POST | `/agents/{case_id}/analyze` | Analyze |
| POST | `/agents/{case_id}/riley/deadlines` | Riley deadlines |
| POST | `/agents/{case_id}/riley/compliance` | Riley compliance |
| POST | `/agents/{case_id}/elena/elements` | Elena elements |
| POST | `/agents/{case_id}/elena/arguments` | Elena arguments |
| POST | `/agents/{case_id}/david/weaknesses` | David weaknesses |
| POST | `/agents/{case_id}/david/defenses` | David defenses |
| POST | `/agents/{case_id}/david/stress-test` | David stress test |
| POST | `/agents/{case_id}/judge-chen/bias` | Judge bias analysis |
| POST | `/agents/{case_id}/judge-chen/relationship` | Judge relationships |
| POST | `/cases/{case_id}/agents/{agent_name}/run` | Run named agent |

### 1.11 Theories (10 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/theories/{case_id}` | List theories |
| GET | `/theories/{case_id}/{theory_id}` | Get theory |
| POST | `/theories/{case_id}` | Create theory |
| PUT | `/theories/{case_id}/{theory_id}` | Update theory |
| DELETE | `/theories/{case_id}/{theory_id}` | Delete theory |
| POST | `/theories/{case_id}/generate` | Generate theories |
| POST | `/theories/{case_id}/{theory_id}/debate` | Debate theory |
| POST | `/theories/{case_id}/{theory_id}/to-chat` | Send to chat |
| POST | `/analysis/{case_id}/debate` | General debate |

### 1.12 Rules (15 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/cases/{case_id}/rules` | List rules |
| GET | `/cases/{case_id}/rules/summary` | Summary |
| POST | `/cases/{case_id}/rules` | Add rule |
| PUT | `/cases/{case_id}/rules/{rule_id}` | Update |
| POST | `/cases/{case_id}/rules/{rule_id}/toggle` | Toggle active |
| POST | `/cases/{case_id}/rules/{rule_id}/verify` | Verify |
| DELETE | `/cases/{case_id}/rules/{rule_id}` | Delete |
| DELETE | `/cases/{case_id}/rules` | Delete all |
| POST | `/cases/{case_id}/rules/detect` | Auto-detect |
| GET | `/rules/case/{case_id}/applicable` | Applicable rules |

### 1.13 Schedule & Filings (25 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/schedule/events` | All events |
| GET | `/schedule/events/case/{case_id}` | Case events |
| GET | `/schedule/events/{event_id}` | Get event |
| POST | `/schedule/events` | Create event |
| PUT | `/schedule/events/{event_id}` | Update |
| DELETE | `/schedule/events/{event_id}` | Delete |
| GET | `/schedule/upcoming` | Upcoming |
| GET | `/schedule/overdue` | Overdue |
| GET | `/schedule/stats` | Statistics |
| GET | `/schedule/{case_id}/recommendations` | AI recommendations |
| GET | `/filings/forms` | Form templates |
| GET | `/filings/forms/library` | Library (alias) |
| GET | `/filings/forms/{form_id}` | Get form |
| POST | `/filings/case/{case_id}` | Create filing |
| GET | `/filings/case/{case_id}` | Case filings |
| PUT | `/filings/{filing_id}` | Update |
| DELETE | `/filings/{filing_id}` | Delete |
| POST | `/filings/suggest/{case_id}` | Suggest filings |
| POST | `/filings/{filing_id}/autofill` | Autofill |
| GET | `/filings/forms/autofill/{form_id}` | Autofill preview |

### 1.14 Graph (45 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/graph/stats` | Statistics |
| GET | `/graph/entity-connections` | Connections |
| GET | `/graph/related-entities` | Related |
| GET | `/graph/document-clusters` | Clusters |
| GET | `/graph/precedents/{case_id}` | Precedents |
| POST | `/graph/expand-query` | Expand |
| POST | `/graph/backfill` | Backfill |
| POST | `/graph/relationships` | Create rel |
| POST | `/graph/relationships/bulk` | Bulk create |
| GET | `/graph/relationships/{type}` | Get by type |
| DELETE | `/graph/relationships/{id}` | Delete |
| GET | `/graph/schema/relationship-types` | Rel types |
| GET | `/graph/traverse` | Traverse |
| POST | `/graph/path-finding` | Find path |
| GET | `/graph/schema/stats` | Schema stats |
| POST | `/graph/communities/detect` | Detect communities |
| GET | `/graph/communities/{id}` | Get community |
| GET | `/graph/communities/case/{case_id}` | Case communities |
| GET | `/graph/case/{case_id}/visualization` | Visualization |
| GET | `/graph/entities/duplicates` | Find dupes |
| POST | `/graph/entities/merge` | Merge |
| POST | `/graph/entities/auto-resolve` | Auto-resolve |
| POST | `/graph/embeddings/generate` | Generate embeddings |
| GET | `/graph/entities/similar/{name}` | Similar entities |
| GET | `/graph/entities/embedding/{name}` | Get embedding |
| GET | `/graph/predict/relationships/{name}` | Predict rels |
| GET | `/graph/entities/disconnected` | Disconnected |
| POST | `/graph/predict/case-relationships` | Predict case rels |
| GET | `/graph/timeline/{case_id}` | Timeline |
| GET | `/graph/timeline/{case_id}/events` | Events |
| POST | `/graph/timeline/{case_id}/create-relationships` | Create rels |
| GET | `/graph/timeline/{case_id}/before-after/{doc_id}` | Before/after |
| GET | `/graph/timeline/{case_id}/key-dates` | Key dates |
| GET | `/graph/communities/{id}/entities` | Community entities |
| POST | `/graph/communities/{id}/summarize` | Summarize |
| POST | `/graph/communities/summarize-all` | Summarize all |
| GET | `/graph/communities/summaries` | All summaries |
| GET | `/graph/ontology/schema` | Ontology schema |
| GET | `/graph/ontology/patterns` | Patterns |

### 1.15 Legal Knowledge (25 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/legal/status` | KB status |
| GET | `/legal/statutes/search` | Search statutes |
| GET | `/legal/statutes/semantic` | Semantic search |
| GET | `/legal/statutes/citation/{citation}` | By citation |
| GET | `/legal/statutes/{statute_id}` | Get statute |
| GET | `/legal/titles/{title_number}` | Get title |
| GET | `/legal/case-types` | Case types |
| GET | `/legal/case-types/{type_id}` | Get type |
| POST | `/legal/classify` | Classify |
| GET | `/legal/case-context/{case_id}` | Case context |
| GET | `/legal/statute/{statute_id}/full` | Full statute |
| GET | `/legal/fca` | False Claims Act |
| GET | `/forms/templates` | Form templates |
| GET | `/forms/templates/{category}/{name}` | Get template |
| POST | `/forms/generate/{category}/{name}` | Generate |
| GET | `/forms/preview/{category}/{name}` | Preview |

### 1.16 Utah Legal KB (8 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/utah/code/search` | Search Utah code |
| GET | `/utah/code/{section_id}` | Get section |
| GET | `/utah/sol/{claim_type}` | Statute of limitations |
| GET | `/utah/elements/{coa_id}` | Cause of action elements |
| GET | `/utah/landmark/{case_type}` | Landmark cases |
| GET | `/utah/stats` | KB statistics |

### 1.17 Evaluation (20 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/evaluation/stats` | Stats |
| GET | `/evaluation/queue` | Queue |
| GET | `/evaluation/recent` | Recent |
| POST | `/evaluation/run-now` | Run now |
| POST | `/evaluation/run-all` | Run all |
| POST | `/evaluation/test` | Test |
| POST | `/evaluation/deep` | Deep eval |
| POST | `/evaluation/batch` | Batch |
| GET | `/ground-truth/tests` | Tests |
| GET | `/ground-truth/tests/{test_id}` | Get test |
| POST | `/ground-truth/tests` | Create |
| PUT | `/ground-truth/tests/{test_id}` | Update |
| DELETE | `/ground-truth/tests/{test_id}` | Delete |
| POST | `/ground-truth/import` | Import |
| GET | `/ground-truth/export` | Export |
| POST | `/ground-truth/run` | Run |
| POST | `/ground-truth/run/{test_id}` | Run one |
| GET | `/ground-truth/results` | Results |
| GET | `/ground-truth/stats` | Stats |
| GET | `/ground-truth/runs` | Runs |
| GET | `/ground-truth/regression-report` | Regression |
| GET | `/eval-optimizer/stats` | Optimizer stats |

### 1.18 Support & Memory (10 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/support/chat` | Support chat |
| GET | `/memory/sessions` | Sessions |
| POST | `/memory/sessions` | Create |
| GET | `/memory/sessions/{id}/messages` | Messages |
| POST | `/discovery/privilege-decision` | Record decision |
| GET | `/discovery/privilege-decisions/{case_id}` | Get decisions |

### 1.19 Admin (15 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/archive/stats` | Archive stats |
| GET | `/admin/entity-queue` | Entity queue |
| GET | `/audio/queue` | Audio queue |
| GET | `/document/queue` | Document queue |
| GET | `/admin/archive/deleted` | Deleted items |
| GET | `/admin/archive/{type}/{id}` | Get archived |
| POST | `/admin/archive/recover/{type}/{id}` | Recover |
| POST | `/admin/migrate-embeddings` | Migrate embeddings |
| POST | `/admin/rechunk-case/{case_id}` | Rechunk |
| POST | `/admin/migrate-to-case-collections` | Migrate collections |
| POST | `/admin/migrate-neo4j-case-links` | Migrate Neo4j |
| POST | `/admin/migrate-documents-to-case-owned` | Migrate ownership |

### 1.20 Insights (5 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/cases/{case_id}/insights` | Create insight |
| GET | `/cases/{case_id}/insights` | List insights |
| POST | `/cases/{case_id}/smart-search/preview` | Search preview |
| POST | `/cases/{case_id}/smart-search/execute` | Execute search |
| GET | `/cases/{case_id}/research` | Research |
| DELETE | `/cases/{case_id}/research/{research_id}` | Delete research |

---

## 2. Database Tables

### 2.1 Analysis Database (`db/analysis.py`)

**Path**: `/app/data/analysis.db`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `document_analysis` | Analysis results | document_id, case_id, summary, hot_score |
| `analysis_jobs` | Job queue | job_id, document_id, status, progress_pct |
| `document_client_review` | Client assignment queue | document_id, suggested_clients |
| `analysis_feedback` | User feedback | document_id, feedback_type |
| `case_events` | Timeline events | event_id, case_id, event_date, event_description |
| `event_inconsistencies` | Timeline conflicts | inconsistency_id, event_id_a, event_id_b |
| `timeline_event_notes` | Event annotations | note_id, event_id, note_text |
| `timeline_hypotheticals` | What-if scenarios | hypothetical_id, case_id |
| `case_claims` | Claims made | claim_id, document_id, claimant, claim_text |
| `case_evidence` | Evidence established | evidence_id, document_id, fact_established |
| `case_contradictions` | Contradictions | contradiction_id, claim_id, evidence_id |
| `party_credibility` | Credibility scores | party_id, case_id, credibility_score |
| `contradiction_alerts` | Alert queue | alert_id, case_id, severity |
| `case_deadlines` | Legal deadlines | deadline_id, case_id, deadline_date |
| `procedural_requirements` | Procedure tracking | requirement_id, case_id |
| `filing_compliance` | Compliance tracking | compliance_id, filing_id |
| `case_elements` | Legal elements | element_id, case_id |
| `damages_analysis` | Damages calculations | damage_id, case_id |
| `case_arguments` | Legal arguments | argument_id, case_id |
| `case_weaknesses` | Identified weaknesses | weakness_id, case_id |
| `anticipated_defenses` | Defense predictions | defense_id, case_id |
| `stress_tests` | Stress test results | test_id, case_id |
| `case_theories` | Case theories | theory_id, case_id, theory_name |
| `theory_debates` | Theory debates | debate_id, theory_id |
| `schedule_events` | Calendar events | event_id, case_id, event_date |
| `form_library` | Form templates | form_id, form_name |
| `case_filings` | Filed documents | filing_id, case_id |
| `judge_patterns` | Judge behavior | pattern_id, judge_name |
| `judge_relationships` | Judge relationships | relationship_id, judge_id |
| `ruling_predictions` | Predicted rulings | prediction_id, case_id |
| `bias_indicators` | Bias detection | indicator_id, judge_id |
| `rag_evaluations` | RAG quality | eval_id, query, score |
| `rag_eval_queue` | Eval queue | queue_id, status |
| `ground_truth_tests` | Test cases | test_id, query, expected |
| `ground_truth_results` | Test results | result_id, test_id |
| `case_rules` | Applicable rules | rule_id, case_id |
| `case_context` | Case metadata | case_id, jurisdiction, case_type |
| `research_cache` | External research cache | cache_id, query, results |
| `case_research` | Case research | research_id, case_id |
| `research_needs` | Research gaps | need_id, case_id |
| `agent_jobs` | Agent job tracking | job_id, agent_name, status |
| `failed_graph_tasks` | Graph failures | task_id, entity_type, error |
| `agent_chat_sessions` | Chat sessions | session_id, case_id, agent_id |
| `agent_chat_messages` | Chat messages | message_id, session_id |
| `entities` | Extracted entities | entity_id, case_id, entity_type |
| `entity_timeline` | Entity timelines | event_id, entity_id |
| `entity_background` | Background checks | record_id, entity_id |
| `entity_mentions` | Document mentions | mention_id, entity_id, document_id |
| `discovery_requests` | Discovery tracking | request_id, case_id |
| `privilege_decisions` | Privilege rulings | decision_id, document_id |
| `document_discovery_tags` | Discovery tags | tag_id, document_id |
| `case_insights` | Saved insights | insight_id, case_id |

### 2.2 Memory Database (`db/memory.py`)

**Path**: `/app/data/memory.db`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sessions` | Chat sessions | session_id, case_id |
| `messages` | Chat messages | message_id, session_id, role |
| `session_entities` | Session entities | entity_id, session_id |
| `session_documents` | Session documents | document_id, session_id |
| `agent_findings` | Agent discoveries | finding_id, agent_name |

---

## 3. JavaScript Functions

**Total: 501 functions in main.py**

### 3.1 Core UI Functions

| Function | Purpose |
|----------|---------|
| `showModal(id)` | Show modal by ID |
| `hideModal(id)` | Hide modal by ID |
| `showToast(message, type)` | Show toast notification |
| `showProgress(id, message)` | Show progress indicator |
| `updateProgress(id, pct, msg)` | Update progress |
| `hideProgress(id)` | Hide progress |
| `showError(message, details)` | Show error modal |
| `showConfirm(title, msg, onConfirm, btnText, btnClass)` | Confirmation dialog |
| `switchTab(tabName)` | Switch main tabs |

### 3.2 Case/Client Functions

| Function | Purpose |
|----------|---------|
| `loadCases()` | Load case list |
| `selectCase(caseId)` | Select active case |
| `createCase()` | Create new case |
| `updateCase()` | Update case |
| `deleteCurrentCase()` | Delete case |
| `createClient()` | Create client |
| `deleteClient(clientId)` | Delete client |
| `renderClients()` | Render client list |

### 3.3 Document Functions

| Function | Purpose |
|----------|---------|
| `handleUpload()` | Handle file upload |
| `uploadFile(file, caseId, clientId)` | Upload single file |
| `uploadMultipleFiles()` | Upload multiple |
| `showUploadModal()` | Show upload dialog |
| `deleteIntakeDoc(docId)` | Delete document |
| `reuploadIntakeDoc(docId)` | Re-upload |
| `showDocPreview(docId, filename)` | Preview document |
| `showAnalysisDetail(docId)` | Show analysis |

### 3.4 Investigation Functions

| Function | Purpose |
|----------|---------|
| `runFullCaseAnalysis()` | Run full analysis |
| `loadDeadlines()` | Load deadlines |
| `loadWeaknesses()` | Load weaknesses |
| `loadCaseElements()` | Load legal elements |
| `analyzeJudge()` | Analyze judge |
| `runDavidAnalysis()` | Run David agent |

### 3.5 Timeline Functions

| Function | Purpose |
|----------|---------|
| `initCaseTimeline()` | Initialize timeline |
| `loadCaseTimeline()` | Load events |
| `refreshCaseTimeline()` | Refresh |
| `setTimelineView(view)` | Set view mode |
| `showEventDetails(event)` | Show event |
| `createHypothetical()` | Create what-if |

### 3.6 Agent Functions

| Function | Purpose |
|----------|---------|
| `selectAgent(agentId)` | Select agent |
| `sendAgentMessage()` | Send message |
| `loadChatSessions()` | Load sessions |
| `startNewChatSession()` | New session |
| `deleteChatSession(id)` | Delete session |
| `clearAgentChatUI()` | Clear UI |

### 3.7 Graph Functions

| Function | Purpose |
|----------|---------|
| `loadGraphForCase(caseId)` | Load graph |
| `renderD3Graph(data)` | Render graph |
| `zoomGraph(factor)` | Zoom |
| `selectNode(nodeId)` | Select node |
| `findAndHighlightPath()` | Find path |
| `expandFromSelected()` | Expand node |

### 3.8 Job Management Functions

| Function | Purpose |
|----------|---------|
| `toggleJobsPanel()` | Toggle panel |
| `fetchJobs()` | Fetch job list |
| `renderJobs(jobs)` | Render jobs |
| `killJob(jobId)` | Cancel job |
| `toggleAnalysisPause()` | Pause/resume |
| `clearAnalysisQueue()` | Clear queue |

---

## 4. UI Element IDs

**Total: 635 unique element IDs**

### 4.1 Modal IDs

```
uploadModal, analysisDetail, privilegeDecision, confirm,
addLawModal, statuteDetailModal, ruleDetailModal
```

### 4.2 Tab IDs

```
intakeTab, investigateTab, timelineTab, ragTab, converseTab,
scheduleTab, filingsTab, graphTab, settingsTab, theoryTab
```

### 4.3 Key Container IDs

```
caseList, clientList, documentList, entityList, timelineVisualization,
graphVisualization, chatMessages, jobsPanel, helpPanel
```

### 4.4 Input/Form IDs

```
caseNameInput, clientNameInput, uploadArea, queryInput,
searchInput, dateFilter, typeFilter
```

---

## 5. Frontend Fetch Calls

### 5.1 RAG/Query Calls

```javascript
fetch('/rag-query', { method: 'POST', body: {...} })
fetch('/legal-query', { method: 'POST', body: {...} })
fetch('/analyze-all', { method: 'POST', body: {...} })
```

### 5.2 Case Management Calls

```javascript
fetch('/cases')
fetch('/cases', { method: 'POST' })
fetch(`/cases/${caseId}`, { method: 'PUT' })
fetch(`/cases/${caseId}`, { method: 'DELETE' })
```

### 5.3 Document Calls

```javascript
fetch('/upload-document', { method: 'POST', body: formData })
fetch(`/documents/${docId}/preview`)
fetch(`/documents/${docId}`, { method: 'DELETE' })
```

### 5.4 Agent Calls

```javascript
fetch('/agents/chat', { method: 'POST' })
fetch(`/agents/${caseId}/chat-sessions`)
fetch(`/agents/${caseId}/${agentId}/chat`, { method: 'POST' })
```

### 5.5 Analysis Queue Calls

```javascript
fetch('/analysis/queue', { method: 'POST' })
fetch('/analysis/queue/status')
fetch('/analysis/queue/processing')
fetch('/analysis/queue/paused')
fetch('/analysis/queue/clear', { method: 'POST' })
```

### 5.6 System Calls

```javascript
fetch('/system/metrics')
fetch('/system/jobs')
fetch('/system/agent-jobs')
fetch('/system/gpu-scheduler')
```

---

## 6. Update Checklist

When modifying the codebase, update this document:

### Adding a New API Endpoint

- [ ] Add to appropriate section in "API Endpoints"
- [ ] Include Method, Path, Purpose
- [ ] Update count in Quick Stats

### Adding a New DB Table

- [ ] Add to "Database Tables" with columns
- [ ] Update count in Quick Stats

### Adding a New JS Function

- [ ] Add to appropriate category in "JavaScript Functions"
- [ ] Update count in Quick Stats

### Adding a New Element ID

- [ ] Add to "UI Element IDs" if significant
- [ ] Update count in Quick Stats

### Adding a New Fetch Call

- [ ] Add to "Frontend Fetch Calls"
- [ ] Ensure endpoint exists in API section

---

*This document is the authoritative reference for SynSeekr's API and UI components.*

CREATE TYPE "public"."entity_type_inv" AS ENUM('company', 'person', 'domain', 'address', 'phone', 'email', 'license', 'case');--> statement-breakpoint
CREATE TYPE "public"."finding_severity" AS ENUM('critical', 'warning', 'info', 'success');--> statement-breakpoint
CREATE TYPE "public"."investigation_status" AS ENUM('queued', 'scanning', 'analyzing', 'complete', 'failed', 'archived');--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "action_proposal_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" varchar NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"payload_json" jsonb NOT NULL,
	"confidence" varchar(10) DEFAULT 'medium',
	"rationale" text,
	"executed_at" timestamp,
	"result_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "action_proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" varchar(20) NOT NULL,
	"scope_id" varchar NOT NULL,
	"chat_id" varchar,
	"source_message_id" varchar,
	"created_by_user_id" varchar NOT NULL,
	"status" varchar(30) DEFAULT 'awaiting_approval' NOT NULL,
	"summary_text" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" varchar NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"triggers" jsonb DEFAULT '[]'::jsonb,
	"sender_name" varchar(255),
	"sender_email" varchar(255),
	"email_subject" varchar(500),
	"matter_id" varchar,
	"acknowledged" boolean DEFAULT false,
	"acknowledged_by" varchar(255),
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"provider" varchar(50) DEFAULT 'anthropic',
	"model" varchar(100) DEFAULT 'claude-sonnet-4-5',
	"matter_id" varchar,
	"board_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_event_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"user_email" varchar(255),
	"matter_id" varchar(36),
	"action" varchar(100) NOT NULL,
	"mode" varchar(20) NOT NULL,
	"model_id" varchar(100) NOT NULL,
	"model_provider" varchar(50) NOT NULL,
	"is_external" boolean DEFAULT false NOT NULL,
	"input_doc_ids" jsonb DEFAULT '[]'::jsonb,
	"input_token_count" integer,
	"output_token_count" integer,
	"prompt_hash" varchar(64),
	"output_hash" varchar(64),
	"citations" jsonb DEFAULT '[]'::jsonb,
	"actions_taken" jsonb DEFAULT '[]'::jsonb,
	"pii_detected" boolean DEFAULT false,
	"pii_redacted" boolean DEFAULT false,
	"pii_entities" jsonb DEFAULT '[]'::jsonb,
	"request_id" varchar(36),
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analyzed_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" varchar(500) DEFAULT '(No Subject)' NOT NULL,
	"sender" varchar(500) NOT NULL,
	"sender_name" varchar(255),
	"sender_domain" varchar(255),
	"recipients" jsonb DEFAULT '[]'::jsonb,
	"cc" jsonb DEFAULT '[]'::jsonb,
	"direction" varchar(20) DEFAULT 'inbound',
	"email_date" timestamp,
	"body_text" text DEFAULT '',
	"body_preview" varchar(500) DEFAULT '',
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"thread_id" varchar(255),
	"urgency" varchar(20) DEFAULT 'normal',
	"urgency_score" integer DEFAULT 0,
	"sentiment" varchar(30) DEFAULT 'formal_neutral',
	"sentiment_scores" jsonb DEFAULT '{}'::jsonb,
	"deception_flags" jsonb DEFAULT '[]'::jsonb,
	"deception_score" integer DEFAULT 0,
	"dates_mentioned" jsonb DEFAULT '[]'::jsonb,
	"deadlines" jsonb DEFAULT '[]'::jsonb,
	"case_numbers" jsonb DEFAULT '[]'::jsonb,
	"money_amounts" jsonb DEFAULT '[]'::jsonb,
	"is_lawyer_comm" boolean DEFAULT false,
	"action_items" jsonb DEFAULT '[]'::jsonb,
	"key_phrases" jsonb DEFAULT '[]'::jsonb,
	"psychological_profile" jsonb DEFAULT '{}'::jsonb,
	"risk_level" varchar(20) DEFAULT 'low',
	"matter_id" varchar,
	"client_id" varchar,
	"auto_linked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" varchar NOT NULL,
	"matter_id" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"requested_by" varchar(100) NOT NULL,
	"requested_by_name" varchar(255) NOT NULL,
	"assigned_to" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"due_date" varchar(50),
	"priority" varchar(20) DEFAULT 'medium',
	"type" varchar(50) DEFAULT 'general',
	"source_data" jsonb DEFAULT '{}'::jsonb,
	"initials" jsonb DEFAULT '[]'::jsonb,
	"revision_notes" text DEFAULT '',
	"comments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_text" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" varchar NOT NULL,
	"method" varchar(50) NOT NULL,
	"full_text" text,
	"confidence_overall" real,
	"language" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255),
	"user_email" varchar(255),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" varchar(255),
	"method" varchar(10),
	"path" varchar(500),
	"ip_address" varchar(45),
	"user_agent" text,
	"status_code" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"severity" varchar(20) DEFAULT 'info',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '',
	"is_active" boolean DEFAULT true,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_field" varchar(100),
	"trigger_value" varchar(255),
	"conditions" jsonb DEFAULT '[]'::jsonb,
	"action_type" varchar(50) NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb,
	"run_count" integer DEFAULT 0,
	"last_run" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" varchar NOT NULL,
	"task_id" varchar,
	"trigger_data" jsonb DEFAULT '{}'::jsonb,
	"action_result" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(50) DEFAULT 'pending',
	"error" text,
	"executed_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bates_ranges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bates_set_id" varchar NOT NULL,
	"document_id" varchar NOT NULL,
	"version_id" varchar,
	"start_number" integer NOT NULL,
	"end_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bates_sets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar,
	"matter_id" varchar,
	"name" varchar(255) NOT NULL,
	"prefix" varchar(50) NOT NULL,
	"padding" integer DEFAULT 6,
	"next_number" integer DEFAULT 1,
	"placement" varchar(50) DEFAULT 'bottom-right',
	"font_size" integer DEFAULT 10,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "billing_pipeline_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"profile_id" varchar,
	"total_entries" integer DEFAULT 0,
	"total_hours" real DEFAULT 0,
	"total_amount" real DEFAULT 0,
	"flagged_count" integer DEFAULT 0,
	"quality_issue_count" integer DEFAULT 0,
	"entries_data" jsonb DEFAULT '[]'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "billing_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"matter_id" varchar,
	"client_name" varchar(255) NOT NULL,
	"aliases" text[] DEFAULT '{}',
	"phones" text[] DEFAULT '{}',
	"key_parties" text[] DEFAULT '{}',
	"hourly_rate" real DEFAULT 350,
	"long_threshold" real DEFAULT 6,
	"day_threshold" real DEFAULT 10,
	"rounding_increment" real DEFAULT 0.1,
	"rounding_direction" varchar(20) DEFAULT 'up',
	"minimum_entry" real DEFAULT 0,
	"travel_time_rate" real DEFAULT 1,
	"payment_terms" varchar(20) DEFAULT 'receipt',
	"retainer_balance" real DEFAULT 0,
	"firm_name" varchar(255),
	"attorney_name" varchar(255),
	"firm_address" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "billing_review_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"profile_id" varchar,
	"review_data" jsonb DEFAULT '[]'::jsonb,
	"summary" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "board_chats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" varchar(20) DEFAULT 'board' NOT NULL,
	"board_id" varchar,
	"client_id" varchar,
	"matter_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '',
	"color" varchar(20) DEFAULT '#6366f1',
	"icon" varchar(50) DEFAULT 'layout-grid',
	"columns" jsonb DEFAULT '[]'::jsonb,
	"client_id" varchar,
	"matter_id" varchar,
	"workspace_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar,
	"task_id" varchar,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"event_type" varchar(50) NOT NULL,
	"start_date" varchar(50) NOT NULL,
	"end_date" varchar(50),
	"all_day" boolean DEFAULT false,
	"location" text,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"reminder_minutes" integer,
	"color" varchar(20),
	"source_type" varchar(50),
	"source_id" varchar(255),
	"auto_synced" boolean DEFAULT false,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"deadline_id" varchar,
	"filing_id" varchar,
	"task_id" varchar,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"action_type" varchar(50) NOT NULL,
	"required_doc_type" varchar(100),
	"template_id" varchar,
	"status" varchar(30) DEFAULT 'draft',
	"priority" varchar(20) DEFAULT 'medium',
	"due_date" varchar(50),
	"days_remaining" integer,
	"assigned_to" varchar,
	"depends_on_action_id" varchar,
	"generated_doc_path" text,
	"audit_trail" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_deadlines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"filing_id" varchar,
	"rule_id" varchar,
	"task_id" varchar,
	"title" varchar(500) NOT NULL,
	"due_date" varchar(50) NOT NULL,
	"due_time" varchar(20),
	"anchor_event" varchar(255),
	"anchor_date" varchar(50),
	"rule_source" varchar(100),
	"criticality" varchar(20) DEFAULT 'hard',
	"depends_on_deadline_id" varchar,
	"status" varchar(30) DEFAULT 'pending',
	"required_action" varchar(255),
	"result_doc_type" varchar(100),
	"assigned_to" varchar,
	"completed_at" timestamp,
	"confirmed_at" timestamp,
	"confirmed_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_filings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"file_item_id" varchar,
	"original_file_name" varchar(500) NOT NULL,
	"file_path" text NOT NULL,
	"ocr_text" text DEFAULT '',
	"doc_type" varchar(100) NOT NULL,
	"doc_subtype" varchar(100),
	"doc_category" varchar(50),
	"classification_confidence" real DEFAULT 0,
	"filed_date" varchar(50),
	"served_date" varchar(50),
	"hearing_date" varchar(50),
	"response_deadline_anchor" varchar(50),
	"parties_involved" jsonb DEFAULT '[]'::jsonb,
	"extracted_facts" jsonb DEFAULT '{}'::jsonb,
	"related_filing_id" varchar,
	"filing_proof" jsonb DEFAULT '{}'::jsonb,
	"source_type" varchar(50) DEFAULT 'manual',
	"sha256_hash" varchar(64),
	"status" varchar(30) DEFAULT 'classified',
	"classified_by" varchar(20) DEFAULT 'ai',
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_size" integer DEFAULT 0,
	"mime_type" varchar(100),
	"storage_path" varchar(1000),
	"extracted_text" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_message_entities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"value" varchar(500) NOT NULL,
	"start_index" integer,
	"end_index" integer
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" varchar NOT NULL,
	"sender_user_id" varchar NOT NULL,
	"body_text" text NOT NULL,
	"body_rich_json" jsonb,
	"reply_to_message_id" varchar,
	"is_system_message" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"company" varchar(255),
	"address" text,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "court_holidays" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"date" timestamp NOT NULL,
	"recurring" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_definitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(36),
	"entity_type" varchar(30) NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"field_type" varchar(20) NOT NULL,
	"options" jsonb,
	"required" boolean DEFAULT false,
	"validation_regex" varchar(255),
	"sort_order" integer DEFAULT 0,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_definition_id" varchar(36) NOT NULL,
	"entity_id" varchar(36) NOT NULL,
	"value" jsonb,
	"updated_by" varchar(255) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deadline_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" varchar,
	"name" varchar(255) NOT NULL,
	"trigger_doc_type" varchar(100) NOT NULL,
	"anchor_date_field" varchar(50) NOT NULL,
	"offset_days" integer NOT NULL,
	"offset_direction" varchar(10) DEFAULT 'after',
	"result_action" varchar(100) NOT NULL,
	"result_doc_type" varchar(100),
	"criticality" varchar(20) DEFAULT 'hard',
	"rule_source" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "detective_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"source_node_id" varchar NOT NULL,
	"target_node_id" varchar NOT NULL,
	"label" varchar(255) DEFAULT '',
	"connection_type" varchar(50) NOT NULL,
	"strength" integer DEFAULT 3,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "detective_nodes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"linked_evidence_id" varchar,
	"linked_contact_id" varchar,
	"position" jsonb NOT NULL,
	"color" varchar(20) DEFAULT '#6366f1',
	"icon" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discovered_entities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" varchar NOT NULL,
	"type" "entity_type_inv" NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"details" jsonb,
	"title" text,
	"email" text,
	"phone" text,
	"address" text,
	"state" text,
	"sos_id" text,
	"npi" text,
	"registrar" text,
	"registration_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" varchar NOT NULL,
	"doc_category" varchar(50) NOT NULL,
	"doc_type" varchar(100) NOT NULL,
	"doc_role" varchar(50) DEFAULT 'primary',
	"caption_title" varchar(500),
	"party" varchar(50),
	"author" varchar(255),
	"recipient" varchar(255),
	"service_date" varchar(50),
	"filing_date" varchar(50),
	"hearing_date" varchar(50),
	"docket_number" varchar(100),
	"version" varchar(50) DEFAULT 'final',
	"status" varchar(50) DEFAULT 'draft',
	"privilege_basis" varchar(100),
	"production_id" varchar(100),
	"bates_range" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar,
	"matter_id" varchar,
	"document_id" varchar NOT NULL,
	"version_id" varchar,
	"job_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'queued',
	"progress_percent" integer DEFAULT 0,
	"error_message" text,
	"job_params" jsonb DEFAULT '{}'::jsonb,
	"result_version_id" varchar,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "document_ocr_text" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"version_id" varchar,
	"full_text" text DEFAULT '',
	"confidence_summary" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar(36) NOT NULL,
	"privilege_level" varchar(30) NOT NULL,
	"restricted_to_roles" jsonb DEFAULT '[]'::jsonb,
	"restricted_to_users" jsonb DEFAULT '[]'::jsonb,
	"set_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"parent_version_id" varchar,
	"version_number" integer DEFAULT 1 NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"operation_params" jsonb DEFAULT '{}'::jsonb,
	"storage_key" text NOT NULL,
	"sha256_hash" varchar(64) NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "draft_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"template_type" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"linked_filing_id" varchar,
	"linked_deadline_id" varchar,
	"linked_action_id" varchar,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"names" jsonb DEFAULT '[]'::jsonb,
	"domains" jsonb DEFAULT '[]'::jsonb,
	"is_lawyer" boolean DEFAULT false,
	"total_emails" integer DEFAULT 0,
	"matter_ids" jsonb DEFAULT '[]'::jsonb,
	"client_id" varchar,
	"dominant_sentiment" varchar(30),
	"avg_deception_score" real DEFAULT 0,
	"alert_count" integer DEFAULT 0,
	"risk_assessment" varchar(20) DEFAULT 'low',
	"behavior_timeline" jsonb DEFAULT '[]'::jsonb,
	"first_seen" timestamp,
	"last_seen" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "entity_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" varchar NOT NULL,
	"source_entity_id" varchar NOT NULL,
	"target_entity_id" varchar NOT NULL,
	"relationship" text NOT NULL,
	"strength" text,
	"evidence" text,
	"severity" "finding_severity",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_vault_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"original_name" varchar(500) NOT NULL,
	"original_url" text NOT NULL,
	"original_hash" varchar(128) NOT NULL,
	"original_size" integer NOT NULL,
	"original_mime_type" varchar(100) NOT NULL,
	"evidence_type" varchar(50) DEFAULT 'document',
	"confidentiality" varchar(50) DEFAULT 'confidential',
	"description" text DEFAULT '',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"uploaded_by" varchar(255) NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"chain_of_custody" jsonb DEFAULT '[]'::jsonb,
	"storage_key" text,
	"is_archived" boolean DEFAULT false,
	"archived_at" timestamp,
	"archived_by" varchar(255),
	"ocr_job_id" varchar,
	"extracted_text" text,
	"ai_analysis" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar(255) NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"date" varchar(32) NOT NULL,
	"amount" real NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"billable" boolean DEFAULT true,
	"reimbursable" boolean DEFAULT false,
	"vendor" varchar(255),
	"receipt_url" text,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "file_change_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incoming_file_id" varchar NOT NULL,
	"plan_item_id" varchar,
	"run_id" varchar,
	"changed_by_user_id" varchar NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_filename" varchar(500),
	"new_filename" varchar(500),
	"old_path" text,
	"new_path" text,
	"reversible" boolean DEFAULT true,
	"reversed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"server_path" text NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"extension" varchar(20),
	"size_bytes" integer DEFAULT 0,
	"hash_sha256" varchar(128),
	"is_email" boolean DEFAULT false,
	"is_attachment" boolean DEFAULT false,
	"parent_file_id" varchar,
	"confidentiality" varchar(50) DEFAULT 'confidential',
	"created_utc" timestamp,
	"modified_utc" timestamp,
	"ingested_utc" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "file_tag_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filing_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20) DEFAULT '#6366f1',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "filing_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"color" varchar(20) DEFAULT '#6366f1',
	"collapsed" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"board_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incoming_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"matter_id" varchar,
	"original_filename" varchar(500) NOT NULL,
	"current_path" text NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"subtype" varchar(50) DEFAULT 'unknown',
	"size_bytes" integer DEFAULT 0,
	"hash_sha256" varchar(128),
	"mime_type" varchar(100),
	"ocr_text" text,
	"ocr_confidence" real,
	"metadata_json" jsonb,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insight_outputs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_run_id" varchar NOT NULL,
	"section" varchar(100) NOT NULL,
	"content_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insight_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"requested_by_user_id" varchar,
	"intent_type" varchar(100) NOT NULL,
	"priority_rules" jsonb,
	"output_format" varchar(100),
	"scope" varchar(255),
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investigation_findings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" varchar NOT NULL,
	"severity" "finding_severity" NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"raw_data" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"url" text,
	"screenshot" text,
	"ai_relevance" integer,
	"ai_notes" text,
	"starred" boolean DEFAULT false NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"user_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investigations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar,
	"target_name" text NOT NULL,
	"target_domain" text,
	"target_address" text,
	"target_state" text,
	"sources" jsonb DEFAULT '["web","corp","domain","legal","npi","reviews","social","news"]'::jsonb,
	"template_id" text,
	"status" "investigation_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"scan_log" jsonb DEFAULT '[]'::jsonb,
	"total_findings" integer DEFAULT 0 NOT NULL,
	"critical_flags" integer DEFAULT 0 NOT NULL,
	"entity_count" integer DEFAULT 0 NOT NULL,
	"connection_count" integer DEFAULT 0 NOT NULL,
	"ai_summary" text,
	"ai_risk_score" integer,
	"created_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"scan_duration" integer
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"matter_id" varchar(255),
	"issue_date" varchar(32) NOT NULL,
	"due_date" varchar(32) NOT NULL,
	"status" varchar(30) DEFAULT 'draft',
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"subtotal" real DEFAULT 0,
	"tax_rate" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"total_amount" real DEFAULT 0,
	"paid_amount" real DEFAULT 0,
	"balance_due" real DEFAULT 0,
	"notes" text,
	"payment_terms" text,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"state" varchar(50) NOT NULL,
	"court_type" varchar(50) NOT NULL,
	"rule_set" varchar(100) NOT NULL,
	"discovery_response_days" integer DEFAULT 30,
	"motion_opposition_days" integer DEFAULT 14,
	"motion_reply_days" integer DEFAULT 7,
	"initial_disclosure_days" integer DEFAULT 14,
	"answer_days" integer DEFAULT 21,
	"mail_service_extra_days" integer DEFAULT 3,
	"electronic_service_extra_days" integer DEFAULT 0,
	"weekend_holiday_adjust" boolean DEFAULT true,
	"holidays" jsonb DEFAULT '[]'::jsonb,
	"custom_rules" jsonb DEFAULT '[]'::jsonb,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matter_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"original_filename" varchar(500) NOT NULL,
	"storage_url" text NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"size_bytes" integer NOT NULL,
	"hash_sha256" varchar(64),
	"uploaded_by_user_id" varchar,
	"source_date" timestamp,
	"doc_type" varchar(100),
	"custodian" varchar(100),
	"confidentiality" varchar(50) DEFAULT 'normal',
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"page_count" integer,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"company" varchar(255),
	"address" text,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matter_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"mime_type" varchar(100) DEFAULT 'application/octet-stream' NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matter_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar(36) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"access_level" varchar(20) NOT NULL,
	"granted_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"case_number" varchar(100),
	"matter_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"description" text DEFAULT '',
	"opened_date" varchar(50) NOT NULL,
	"closed_date" varchar(50),
	"responsible_party_id" varchar,
	"assigned_attorneys" jsonb DEFAULT '[]'::jsonb,
	"assigned_paralegals" jsonb DEFAULT '[]'::jsonb,
	"practice_area" varchar(100) NOT NULL,
	"court_name" varchar(255),
	"judge_assigned" varchar(255),
	"opposing_counsel" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"external_ai_allowed" boolean DEFAULT false,
	"ai_sensitivity_level" varchar(20) DEFAULT 'high'
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"matter_id" varchar,
	"date" varchar(50) NOT NULL,
	"duration" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'recorded',
	"participants" jsonb DEFAULT '[]'::jsonb,
	"summary" text DEFAULT '',
	"main_points" jsonb DEFAULT '[]'::jsonb,
	"topics" jsonb DEFAULT '[]'::jsonb,
	"transcript" jsonb DEFAULT '[]'::jsonb,
	"action_items" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"current_model_id" varchar(255),
	"suggested_model_id" varchar(255) NOT NULL,
	"task_type" varchar(100),
	"title" varchar(500) NOT NULL,
	"description" text,
	"priority" varchar(20) DEFAULT 'info',
	"is_dismissed" boolean DEFAULT false,
	"dismissed_by" varchar,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_intelligence_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb,
	"license" varchar(100),
	"parameter_size" varchar(50),
	"quantization" varchar(50),
	"context_window" integer DEFAULT 0,
	"quality_scores" jsonb DEFAULT '{}'::jsonb,
	"tasks_recommended" jsonb DEFAULT '[]'::jsonb,
	"replaces_model_id" varchar,
	"replaced_by_model_id" varchar,
	"released_at" timestamp,
	"source_url" varchar(500),
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_type" varchar(100) NOT NULL,
	"model_id" varchar(255) NOT NULL,
	"rank" integer DEFAULT 1,
	"reason" text,
	"performance_notes" text,
	"size_efficiency" varchar(50),
	"is_current_best" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ocr_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" varchar NOT NULL,
	"matter_id" varchar NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"provider" varchar(100) DEFAULT 'openai-vision',
	"confidence" real,
	"extracted_text" text,
	"page_count" integer,
	"processing_time" integer,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ocr_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"asset_id" varchar,
	"file_id" varchar,
	"original_filename" varchar(500) NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"file_size_bytes" integer,
	"method" varchar(50) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'processing' NOT NULL,
	"confidence" real,
	"page_count" integer,
	"extracted_text_length" integer,
	"chunk_count" integer,
	"anchor_count" integer,
	"hash_sha256" varchar(128),
	"processing_time_ms" integer,
	"error_message" text,
	"ocr_metadata" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_by" varchar
);
--> statement-breakpoint
CREATE TABLE "organize_plan_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"incoming_file_id" varchar NOT NULL,
	"detected_summary" text,
	"suggested_filename" varchar(500),
	"suggested_folder" text,
	"suggested_action" varchar(50) DEFAULT 'rename_move' NOT NULL,
	"confidence" varchar(20) DEFAULT 'medium',
	"rationale" text,
	"group_label" varchar(200),
	"approved_action" varchar(50),
	"approved_filename" varchar(500),
	"approved_folder" text,
	"execution_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"executed_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "organize_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"scope" varchar(50) DEFAULT 'incoming' NOT NULL,
	"matter_id" varchar,
	"days_filter" integer DEFAULT 14,
	"total_files" integer DEFAULT 0,
	"files_to_move" integer DEFAULT 0,
	"files_to_keep" integer DEFAULT 0,
	"files_to_trash" integer DEFAULT 0,
	"executed_count" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'draft_plan' NOT NULL,
	"ai_provider" varchar(50),
	"ai_model" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar(255) NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"date" varchar(32) NOT NULL,
	"amount" real NOT NULL,
	"method" varchar(30) NOT NULL,
	"reference" varchar(255),
	"notes" text,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar,
	"matter_id" varchar,
	"title" varchar(500),
	"original_filename" varchar(500) NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(100) DEFAULT 'application/pdf',
	"file_size" integer DEFAULT 0,
	"sha256_hash" varchar(64) NOT NULL,
	"page_count" integer,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf_wash_maps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar,
	"matter_id" varchar,
	"entity_type" varchar(50) NOT NULL,
	"original_value_hash" varchar(64) NOT NULL,
	"surrogate_value" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf_wash_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar,
	"matter_id" varchar,
	"document_id" varchar NOT NULL,
	"version_id" varchar,
	"policy" varchar(20) DEFAULT 'medium',
	"detections" jsonb DEFAULT '[]'::jsonb,
	"summary" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "people_orgs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar,
	"name" varchar(255) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"role" varchar(100),
	"email" varchar(255),
	"phone" varchar(50),
	"company" varchar(255),
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pii_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(36),
	"enabled_entities" jsonb DEFAULT '["SSN","DOB","address","phone","email","bank_account","credit_card","drivers_license","passport","MRN"]'::jsonb,
	"default_action" varchar(20) DEFAULT 'flag' NOT NULL,
	"redact_before_external_ai" boolean DEFAULT true NOT NULL,
	"allow_pii_in_batmode" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_conversions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" varchar NOT NULL,
	"output_type" varchar(50) NOT NULL,
	"generated_json" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'draft',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" varchar NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_recordings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" varchar(255) NOT NULL,
	"scope_type" varchar(50) DEFAULT 'board',
	"scope_id" varchar,
	"title" varchar(255) DEFAULT 'Untitled Recording',
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"status" varchar(20) DEFAULT 'recording',
	"event_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "research_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"query" text NOT NULL,
	"source" varchar(255) NOT NULL,
	"citation" text NOT NULL,
	"summary" text NOT NULL,
	"relevance" integer DEFAULT 50,
	"notes" text DEFAULT '',
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"user_id" varchar(255),
	"ip_address" varchar(45),
	"user_agent" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"severity" varchar(20) DEFAULT 'warning',
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"status" varchar(50) DEFAULT 'not-started',
	"priority" varchar(20) DEFAULT 'medium',
	"due_date" varchar(50),
	"start_date" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"assignees" jsonb DEFAULT '[]'::jsonb,
	"owner" jsonb,
	"progress" integer DEFAULT 0,
	"time_estimate" integer,
	"time_tracked" integer DEFAULT 0,
	"time_logs" jsonb DEFAULT '[]'::jsonb,
	"files" jsonb DEFAULT '[]'::jsonb,
	"board_id" varchar NOT NULL,
	"group_id" varchar NOT NULL,
	"order" integer DEFAULT 0,
	"parent_task_id" varchar,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text DEFAULT '',
	"last_updated_by" varchar,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"subtasks" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"role" varchar(50) NOT NULL,
	"title" varchar(100),
	"bar_number" varchar(50),
	"department" varchar(100),
	"is_active" boolean DEFAULT true,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"suspended_at" timestamp,
	"suspended_by" varchar(255),
	"offboarded_at" timestamp,
	"last_login_at" timestamp,
	"mfa_enabled" boolean DEFAULT false,
	"mfa_method" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "template_contents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"content_json" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_usage_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"used_by_user_id" varchar(255) NOT NULL,
	"used_on_scope_type" varchar(50),
	"used_on_scope_id" varchar,
	"used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"scope_type" varchar(50) DEFAULT 'global',
	"scope_id" varchar,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '',
	"category" varchar(100) DEFAULT 'general',
	"tags_json" jsonb DEFAULT '[]'::jsonb,
	"created_by_user_id" varchar(255) NOT NULL,
	"version" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "text_anchors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_text_id" varchar NOT NULL,
	"anchor_type" varchar(50) NOT NULL,
	"page_number" integer,
	"line_start" integer,
	"line_end" integer,
	"time_start_ms" integer,
	"time_end_ms" integer,
	"snippet" text,
	"confidence" real
);
--> statement-breakpoint
CREATE TABLE "text_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"asset_id" varchar NOT NULL,
	"asset_text_id" varchar NOT NULL,
	"chunk_text" text NOT NULL,
	"anchor_id_start" varchar,
	"anchor_id_end" varchar,
	"chunk_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "text_snippets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(36),
	"user_id" varchar(255),
	"name" varchar(100) NOT NULL,
	"shortcut" varchar(30),
	"content" text NOT NULL,
	"category" varchar(50),
	"is_shared" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_decisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" varchar NOT NULL,
	"message_id" varchar NOT NULL,
	"decision" text NOT NULL,
	"made_by" varchar(255) NOT NULL,
	"made_at" timestamp DEFAULT now(),
	"status" varchar(50) DEFAULT 'pending',
	"approvals" jsonb
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" varchar NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"sender_name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"subject" varchar(500) NOT NULL,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(50) DEFAULT 'open',
	"priority" varchar(20) DEFAULT 'medium',
	"linked_files" jsonb DEFAULT '[]'::jsonb,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"task_id" varchar,
	"user_id" varchar(100) NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"date" varchar(50) NOT NULL,
	"hours" real NOT NULL,
	"description" text NOT NULL,
	"billable_status" varchar(20) DEFAULT 'billable',
	"hourly_rate" real,
	"activity_code" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '',
	"linked_file_id" varchar,
	"linked_task_id" varchar,
	"linked_thread_id" varchar,
	"created_by" varchar(255) NOT NULL,
	"event_date" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "trust_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"matter_id" varchar(255),
	"date" varchar(32) NOT NULL,
	"amount" real NOT NULL,
	"type" varchar(30) NOT NULL,
	"description" text NOT NULL,
	"reference" varchar(255),
	"running_balance" real DEFAULT 0,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_pipeline_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar,
	"board_id" varchar,
	"evidence_file_id" varchar,
	"file_name" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"file_path" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"current_stage" varchar(50) DEFAULT 'validate',
	"progress" integer DEFAULT 0,
	"config" jsonb DEFAULT '{}'::jsonb,
	"stage_results" jsonb DEFAULT '{}'::jsonb,
	"raw_frame_count" integer DEFAULT 0,
	"unique_frame_count" integer DEFAULT 0,
	"ocr_fragments" jsonb DEFAULT '[]'::jsonb,
	"stitched_text" text DEFAULT '',
	"entities" jsonb DEFAULT '[]'::jsonb,
	"output_paths" jsonb DEFAULT '{}'::jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"error" text,
	"total_duration" real,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wash_entities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"original_value" text NOT NULL,
	"replacement" text NOT NULL,
	"start_index" integer NOT NULL,
	"end_index" integer NOT NULL,
	"confidence" real DEFAULT 0.9,
	"detected_by" varchar(20) DEFAULT 'regex'
);
--> statement-breakpoint
CREATE TABLE "wash_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar,
	"user_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"original_text" text NOT NULL,
	"washed_text" text,
	"policy" varchar(20) DEFAULT 'strict' NOT NULL,
	"reversible" boolean DEFAULT true NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"entity_count" integer DEFAULT 0,
	"pii_report" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wash_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" varchar NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"original_value" text NOT NULL,
	"replacement" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workspace_billing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"plan" varchar(30) DEFAULT 'starter' NOT NULL,
	"seat_count" integer DEFAULT 1 NOT NULL,
	"storage_used_bytes" bigint DEFAULT 0,
	"ai_tokens_used_month" integer DEFAULT 0,
	"ocr_pages_used_month" integer DEFAULT 0,
	"storage_limit" bigint DEFAULT 5368709120,
	"ai_token_limit" integer DEFAULT 100000,
	"ocr_page_limit" integer DEFAULT 500,
	"data_retention_days" integer DEFAULT 2555,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '',
	"color" varchar(20) DEFAULT '#6366f1',
	"icon" varchar(50) DEFAULT 'briefcase',
	"owner_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "action_proposal_items" ADD CONSTRAINT "action_proposal_items_proposal_id_action_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."action_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_chat_id_board_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."board_chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_source_message_id_chat_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_file_id_file_items_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_text" ADD CONSTRAINT "asset_text_asset_id_matter_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."matter_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bates_ranges" ADD CONSTRAINT "bates_ranges_bates_set_id_bates_sets_id_fk" FOREIGN KEY ("bates_set_id") REFERENCES "public"."bates_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bates_ranges" ADD CONSTRAINT "bates_ranges_document_id_pdf_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."pdf_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_pipeline_results" ADD CONSTRAINT "billing_pipeline_results_profile_id_billing_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."billing_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_review_logs" ADD CONSTRAINT "billing_review_logs_profile_id_billing_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."billing_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_chats" ADD CONSTRAINT "board_chats_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_deadline_id_case_deadlines_id_fk" FOREIGN KEY ("deadline_id") REFERENCES "public"."case_deadlines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_filing_id_case_filings_id_fk" FOREIGN KEY ("filing_id") REFERENCES "public"."case_filings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_deadlines" ADD CONSTRAINT "case_deadlines_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_deadlines" ADD CONSTRAINT "case_deadlines_filing_id_case_filings_id_fk" FOREIGN KEY ("filing_id") REFERENCES "public"."case_filings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_deadlines" ADD CONSTRAINT "case_deadlines_rule_id_deadline_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."deadline_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_deadlines" ADD CONSTRAINT "case_deadlines_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_filings" ADD CONSTRAINT "case_filings_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_filings" ADD CONSTRAINT "case_filings_file_item_id_file_items_id_fk" FOREIGN KEY ("file_item_id") REFERENCES "public"."file_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_entities" ADD CONSTRAINT "chat_message_entities_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_board_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."board_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadline_rules" ADD CONSTRAINT "deadline_rules_jurisdiction_id_jurisdiction_profiles_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdiction_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detective_connections" ADD CONSTRAINT "detective_connections_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detective_connections" ADD CONSTRAINT "detective_connections_source_node_id_detective_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."detective_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detective_connections" ADD CONSTRAINT "detective_connections_target_node_id_detective_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."detective_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detective_nodes" ADD CONSTRAINT "detective_nodes_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_profiles" ADD CONSTRAINT "doc_profiles_file_id_file_items_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_jobs" ADD CONSTRAINT "document_jobs_document_id_pdf_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."pdf_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_ocr_text" ADD CONSTRAINT "document_ocr_text_document_id_pdf_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."pdf_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_pdf_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."pdf_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_documents" ADD CONSTRAINT "draft_documents_linked_filing_id_case_filings_id_fk" FOREIGN KEY ("linked_filing_id") REFERENCES "public"."case_filings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_documents" ADD CONSTRAINT "draft_documents_linked_deadline_id_case_deadlines_id_fk" FOREIGN KEY ("linked_deadline_id") REFERENCES "public"."case_deadlines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_documents" ADD CONSTRAINT "draft_documents_linked_action_id_case_actions_id_fk" FOREIGN KEY ("linked_action_id") REFERENCES "public"."case_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_vault_files" ADD CONSTRAINT "evidence_vault_files_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_change_log" ADD CONSTRAINT "file_change_log_incoming_file_id_incoming_files_id_fk" FOREIGN KEY ("incoming_file_id") REFERENCES "public"."incoming_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_change_log" ADD CONSTRAINT "file_change_log_plan_item_id_organize_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."organize_plan_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_change_log" ADD CONSTRAINT "file_change_log_run_id_organize_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."organize_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_items" ADD CONSTRAINT "file_items_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_tag_links" ADD CONSTRAINT "file_tag_links_file_id_file_items_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_tag_links" ADD CONSTRAINT "file_tag_links_tag_id_filing_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."filing_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_outputs" ADD CONSTRAINT "insight_outputs_insight_run_id_insight_runs_id_fk" FOREIGN KEY ("insight_run_id") REFERENCES "public"."insight_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_contacts" ADD CONSTRAINT "matter_contacts_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_documents" ADD CONSTRAINT "matter_documents_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_sessions" ADD CONSTRAINT "ocr_sessions_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organize_plan_items" ADD CONSTRAINT "organize_plan_items_run_id_organize_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."organize_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organize_plan_items" ADD CONSTRAINT "organize_plan_items_incoming_file_id_incoming_files_id_fk" FOREIGN KEY ("incoming_file_id") REFERENCES "public"."incoming_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_wash_reports" ADD CONSTRAINT "pdf_wash_reports_document_id_pdf_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."pdf_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people_orgs" ADD CONSTRAINT "people_orgs_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_conversions" ADD CONSTRAINT "process_conversions_recording_id_process_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."process_recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_events" ADD CONSTRAINT "process_events_recording_id_process_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."process_recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_contents" ADD CONSTRAINT "template_contents_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_usage_log" ADD CONSTRAINT "template_usage_log_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_anchors" ADD CONSTRAINT "text_anchors_asset_text_id_asset_text_id_fk" FOREIGN KEY ("asset_text_id") REFERENCES "public"."asset_text"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_decisions" ADD CONSTRAINT "thread_decisions_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_entities" ADD CONSTRAINT "wash_entities_job_id_wash_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."wash_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "IDX_action_items_proposal" ON "action_proposal_items" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "IDX_action_proposals_scope" ON "action_proposals" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "IDX_action_proposals_chat" ON "action_proposals" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "IDX_action_proposals_status" ON "action_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_admin_alerts_email_id" ON "admin_alerts" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "IDX_admin_alerts_acknowledged" ON "admin_alerts" USING btree ("acknowledged");--> statement-breakpoint
CREATE INDEX "IDX_admin_alerts_priority" ON "admin_alerts" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "IDX_admin_alerts_matter_id" ON "admin_alerts" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_ai_conversations_matter_id" ON "ai_conversations" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "idx_ai_event_logs_user" ON "ai_event_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_event_logs_matter" ON "ai_event_logs" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "idx_ai_event_logs_created" ON "ai_event_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_ai_messages_conversation_id" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "IDX_analyzed_emails_matter_id" ON "analyzed_emails" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_analyzed_emails_client_id" ON "analyzed_emails" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_analyzed_emails_sender" ON "analyzed_emails" USING btree ("sender");--> statement-breakpoint
CREATE INDEX "IDX_analyzed_emails_urgency" ON "analyzed_emails" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX "IDX_analyzed_emails_sentiment" ON "analyzed_emails" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "IDX_analyzed_emails_risk_level" ON "analyzed_emails" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "IDX_analyzed_emails_email_date" ON "analyzed_emails" USING btree ("email_date");--> statement-breakpoint
CREATE INDEX "IDX_asset_text_asset_id" ON "asset_text" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "IDX_audit_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_audit_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "IDX_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_audit_resource" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "IDX_bates_ranges_set" ON "bates_ranges" USING btree ("bates_set_id");--> statement-breakpoint
CREATE INDEX "IDX_bates_ranges_document" ON "bates_ranges" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "IDX_bates_sets_workspace" ON "bates_sets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "IDX_bates_sets_matter" ON "bates_sets" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_billing_results_user" ON "billing_pipeline_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_billing_results_profile" ON "billing_pipeline_results" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "IDX_billing_profiles_user" ON "billing_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_billing_profiles_matter" ON "billing_profiles" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_billing_review_logs_user" ON "billing_review_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_billing_review_logs_profile" ON "billing_review_logs" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "IDX_board_chats_board_id" ON "board_chats" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "IDX_board_chats_client_id" ON "board_chats" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_board_chats_matter_id" ON "board_chats" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_boards_client_id" ON "boards" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_boards_matter_id" ON "boards" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_boards_workspace_id" ON "boards" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "IDX_calendar_source" ON "calendar_events" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "IDX_calendar_matter_id" ON "calendar_events" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_calendar_start_date" ON "calendar_events" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "IDX_case_actions_matter" ON "case_actions" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_case_actions_deadline" ON "case_actions" USING btree ("deadline_id");--> statement-breakpoint
CREATE INDEX "IDX_case_actions_status" ON "case_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_case_deadlines_matter" ON "case_deadlines" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_case_deadlines_filing" ON "case_deadlines" USING btree ("filing_id");--> statement-breakpoint
CREATE INDEX "IDX_case_deadlines_due" ON "case_deadlines" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "IDX_case_deadlines_status" ON "case_deadlines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_case_filings_matter" ON "case_filings" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_case_filings_type" ON "case_filings" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "IDX_case_filings_related" ON "case_filings" USING btree ("related_filing_id");--> statement-breakpoint
CREATE INDEX "IDX_chat_attachments_message" ON "chat_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "IDX_chat_entities_message" ON "chat_message_entities" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "IDX_chat_entities_type" ON "chat_message_entities" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "IDX_chat_messages_chat_id" ON "chat_messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "IDX_chat_messages_sender" ON "chat_messages" USING btree ("sender_user_id");--> statement-breakpoint
CREATE INDEX "IDX_chat_messages_created" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_custom_field_values_entity" ON "custom_field_values" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_custom_field_values_field" ON "custom_field_values" USING btree ("field_definition_id");--> statement-breakpoint
CREATE INDEX "IDX_deadline_rules_jurisdiction" ON "deadline_rules" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "IDX_deadline_rules_trigger" ON "deadline_rules" USING btree ("trigger_doc_type");--> statement-breakpoint
CREATE INDEX "IDX_detective_nodes_matter_id" ON "detective_nodes" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "idx_disc_entities_investigation" ON "discovered_entities" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX "idx_disc_entities_type" ON "discovered_entities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "IDX_doc_jobs_document" ON "document_jobs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "IDX_doc_jobs_status" ON "document_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_doc_jobs_workspace" ON "document_jobs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "IDX_doc_ocr_document" ON "document_ocr_text" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_document_permissions_doc" ON "document_permissions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "IDX_doc_versions_document" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "IDX_doc_versions_parent" ON "document_versions" USING btree ("parent_version_id");--> statement-breakpoint
CREATE INDEX "IDX_draft_docs_matter" ON "draft_documents" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_email_contacts_email" ON "email_contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_email_contacts_client_id" ON "email_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_email_contacts_is_lawyer" ON "email_contacts" USING btree ("is_lawyer");--> statement-breakpoint
CREATE INDEX "idx_entity_connections_investigation" ON "entity_connections" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX "IDX_evidence_vault_matter_id" ON "evidence_vault_files" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_expense_client" ON "expenses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_expense_matter" ON "expenses" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_change_log_file_id" ON "file_change_log" USING btree ("incoming_file_id");--> statement-breakpoint
CREATE INDEX "IDX_change_log_run_id" ON "file_change_log" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "IDX_file_items_matter_id" ON "file_items" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_groups_board_id" ON "groups" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "IDX_incoming_files_user_id" ON "incoming_files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_incoming_files_status" ON "incoming_files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_incoming_files_uploaded_at" ON "incoming_files" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "IDX_insight_outputs_run_id" ON "insight_outputs" USING btree ("insight_run_id");--> statement-breakpoint
CREATE INDEX "IDX_insight_runs_matter_id" ON "insight_runs" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_insight_runs_status" ON "insight_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_inv_findings_investigation" ON "investigation_findings" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX "idx_inv_findings_severity" ON "investigation_findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_investigations_status" ON "investigations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_investigations_matter" ON "investigations" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "idx_investigations_created" ON "investigations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_invoice_client" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_invoice_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_matter_assets_matter_id" ON "matter_assets" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_matter_assets_status" ON "matter_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_matter_contacts_matter_id" ON "matter_contacts" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_matter_documents_matter_id" ON "matter_documents" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "idx_matter_permissions_matter" ON "matter_permissions" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "idx_matter_permissions_user" ON "matter_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_matters_client_id" ON "matters" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_model_alerts_type" ON "model_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "IDX_model_alerts_dismissed" ON "model_alerts" USING btree ("is_dismissed");--> statement-breakpoint
CREATE INDEX "IDX_model_intel_model_id" ON "model_intelligence_entries" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "IDX_model_intel_category" ON "model_intelligence_entries" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_model_rec_task" ON "model_recommendations" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "IDX_model_rec_model" ON "model_recommendations" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "IDX_ocr_sessions_matter" ON "ocr_sessions" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_plan_items_run_id" ON "organize_plan_items" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "IDX_plan_items_file_id" ON "organize_plan_items" USING btree ("incoming_file_id");--> statement-breakpoint
CREATE INDEX "IDX_organize_runs_user_id" ON "organize_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_organize_runs_status" ON "organize_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_payment_invoice" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "IDX_payment_client" ON "payments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_pdf_docs_workspace" ON "pdf_documents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "IDX_pdf_docs_matter" ON "pdf_documents" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_pdf_docs_created_by" ON "pdf_documents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "IDX_wash_maps_workspace_matter" ON "pdf_wash_maps" USING btree ("workspace_id","matter_id");--> statement-breakpoint
CREATE INDEX "IDX_wash_maps_hash" ON "pdf_wash_maps" USING btree ("original_value_hash");--> statement-breakpoint
CREATE INDEX "IDX_wash_reports_document" ON "pdf_wash_reports" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "IDX_wash_reports_workspace" ON "pdf_wash_reports" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "IDX_process_conversions_recording" ON "process_conversions" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "IDX_process_events_recording" ON "process_events" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "IDX_process_events_type" ON "process_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "IDX_process_recordings_user" ON "process_recordings" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "IDX_process_recordings_status" ON "process_recordings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_security_event_type" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "IDX_security_severity" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "IDX_security_created" ON "security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_tasks_board_id" ON "tasks" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "IDX_tasks_group_id" ON "tasks" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "IDX_template_contents_template" ON "template_contents" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "IDX_template_usage_template" ON "template_usage_log" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "IDX_template_usage_user" ON "template_usage_log" USING btree ("used_by_user_id");--> statement-breakpoint
CREATE INDEX "IDX_templates_type" ON "templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "IDX_templates_status" ON "templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_templates_category" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_templates_user" ON "templates" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "IDX_text_anchors_asset_text_id" ON "text_anchors" USING btree ("asset_text_id");--> statement-breakpoint
CREATE INDEX "IDX_text_chunks_matter_id" ON "text_chunks" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_text_chunks_asset_id" ON "text_chunks" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "IDX_threads_matter_id" ON "threads" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_time_entries_matter_id" ON "time_entries" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_timeline_events_matter_id" ON "timeline_events" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_trust_client" ON "trust_transactions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_video_pipeline_status" ON "video_pipeline_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_video_pipeline_matter" ON "video_pipeline_jobs" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_video_pipeline_board" ON "video_pipeline_jobs" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "IDX_wash_entities_job" ON "wash_entities" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "IDX_wash_entities_type" ON "wash_entities" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "IDX_wash_jobs_matter" ON "wash_jobs" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_wash_jobs_user" ON "wash_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_wash_jobs_status" ON "wash_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_wash_mappings_matter" ON "wash_mappings" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "IDX_wash_mappings_lookup" ON "wash_mappings" USING btree ("matter_id","entity_type");
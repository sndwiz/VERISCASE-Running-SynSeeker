CREATE TABLE "time_entry_supporting_docs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"time_entry_id" varchar NOT NULL,
	"matter_id" varchar NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_path" varchar(1000),
	"file_size" integer,
	"mime_type" varchar(100),
	"linked_email_id" varchar,
	"notes" text,
	"uploaded_by" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "time_entry_supporting_docs" ADD CONSTRAINT "time_entry_supporting_docs_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_supporting_docs_time_entry" ON "time_entry_supporting_docs" USING btree ("time_entry_id");
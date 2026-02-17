import { useState, useEffect } from "react";
import { Zap, Plus, X, Loader2, ChevronDown, Search, Sparkles, Mail, MessageSquare, Bell, Trash2, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SiSlack, SiGmail } from "react-icons/si";

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  actionType: string;
  isActive: boolean;
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  actionType: string;
  icon?: "ai" | "slack" | "gmail" | "sms" | "monday";
}

const AUTOMATION_CATEGORIES = [
  { id: "ai_powered", name: "AI-powered", color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" },
  { id: "legal_workflows", name: "Legal Workflows", color: "bg-gradient-to-r from-amber-500 to-orange-600" },
  { id: "integrations", name: "Integrations", color: "bg-blue-500" },
  { id: "status_progress", name: "Status & Progress", color: "bg-purple-500" },
  { id: "cross_board", name: "Cross-Board", color: "bg-orange-500" },
  { id: "notifications", name: "Notifications", color: "bg-red-500" },
  { id: "date_time", name: "Date & Time", color: "bg-yellow-500" },
  { id: "recurring_work", name: "Recurring Work", color: "bg-teal-500" },
];

const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  // AI-powered - Use AI to fill in column
  { id: "ai_fill_item_created", name: "When an item is created, use AI to fill in column", description: "When an item is created ✦use AI to fill in column", category: "ai_powered", triggerType: "item_created", actionType: "ai_fill", icon: "ai" },
  { id: "ai_fill_update_created", name: "When an update is created, use AI to fill in column", description: "When an update is created ✦use AI to fill in column", category: "ai_powered", triggerType: "update_created", actionType: "ai_fill", icon: "ai" },
  { id: "ai_fill_subitem_created", name: "When a subitem is created, use AI to fill in column", description: "When a subitem is created ✦use AI to fill in column", category: "ai_powered", triggerType: "subitem_created", actionType: "ai_fill", icon: "ai" },
  { id: "ai_fill_name_changes", name: "When item name changes, use AI to fill in column", description: "When item name changes ✦use AI to fill in column", category: "ai_powered", triggerType: "name_changed", actionType: "ai_fill", icon: "ai" },
  { id: "ai_fill_column_changes", name: "When column changes, use AI to fill in column", description: "When column changes ✦use AI to fill in column", category: "ai_powered", triggerType: "column_changed", actionType: "ai_fill", icon: "ai" },
  { id: "ai_fill_email_activity", name: "When an activity/email is created, use AI to fill in column", description: "When an activity/email is created in Emails & Activities, ✦use AI to fill in column", category: "ai_powered", triggerType: "email_activity", actionType: "ai_fill", icon: "ai" },
  
  // AI-powered - Detect sentiment
  { id: "ai_sentiment_item_created", name: "When an item is created, detect sentiment in column", description: "When an item is created ✦detect sentiment in column according to these instructions, and insert into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_sentiment", icon: "ai" },
  { id: "ai_sentiment_update_created", name: "When an update is created, detect sentiment in updates", description: "When an update is created ✦detect sentiment in updates according to these instructions, and insert into column", category: "ai_powered", triggerType: "update_created", actionType: "ai_sentiment", icon: "ai" },
  { id: "ai_sentiment_item_name", name: "When an item is created, detect sentiment in item name", description: "When an item is created ✦detect sentiment in item name according to these instructions, and insert into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_sentiment", icon: "ai" },
  { id: "ai_sentiment_column_changes", name: "When column changes, detect sentiment in column", description: "When column changes ✦detect sentiment in column according to these instructions, and insert into column", category: "ai_powered", triggerType: "column_changed", actionType: "ai_sentiment", icon: "ai" },
  { id: "ai_sentiment_name_changes", name: "When item name changes, detect sentiment in item name", description: "When item name changes ✦detect sentiment in item name according to these instructions, and insert into column", category: "ai_powered", triggerType: "name_changed", actionType: "ai_sentiment", icon: "ai" },
  { id: "ai_write_name_changes", name: "When item name changes, write with AI", description: "When item name changes ✦write with AI in a natural tone, keep it brief, and insert into column", category: "ai_powered", triggerType: "name_changed", actionType: "ai_write", icon: "ai" },
  
  // AI-powered - Write with AI
  { id: "ai_write_item_created", name: "When an item is created, write with AI", description: "When an item is created ✦write with AI in a natural tone, keep it brief, and insert into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_write", icon: "ai" },
  { id: "ai_write_update_created", name: "When an update is created, write with AI", description: "When an update is created ✦write with AI in a natural tone, keep it brief, and insert into column", category: "ai_powered", triggerType: "update_created", actionType: "ai_write", icon: "ai" },
  { id: "ai_write_column_changes", name: "When column changes, write with AI", description: "When column changes ✦write with AI in a natural tone, keep it brief, and insert into column", category: "ai_powered", triggerType: "column_changed", actionType: "ai_write", icon: "ai" },
  
  // AI-powered - Extract info
  { id: "ai_extract_item_created", name: "When an item is created, extract info from column", description: "When an item is created ✦extract info from column according to these instructions, into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_extract", icon: "ai" },
  { id: "ai_extract_column_changes", name: "When column changes, extract info from column", description: "When column changes ✦extract info from column according to these instructions, into column", category: "ai_powered", triggerType: "column_changed", actionType: "ai_extract", icon: "ai" },
  { id: "ai_extract_item_name", name: "When an item is created, extract info from the item's name", description: "When an item is created ✦extract info from the item's name based on these instructions, into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_extract", icon: "ai" },
  { id: "ai_extract_updates", name: "When an update is created, extract info from the item's updates", description: "When an update is created ✦extract info from the item's updates based on these instructions, into column", category: "ai_powered", triggerType: "update_created", actionType: "ai_extract", icon: "ai" },
  { id: "ai_extract_name_changes", name: "When item name changes, extract info from the item's name", description: "When item name changes ✦extract info from the item's name according to these instructions, into column", category: "ai_powered", triggerType: "name_changed", actionType: "ai_extract", icon: "ai" },
  
  // AI-powered - Improve text
  { id: "ai_improve_item_created", name: "When an item is created, improve text in column", description: "When an item is created ✦improve text in column, into column. With moderate changes, in a shorter length, and a natural tone.", category: "ai_powered", triggerType: "item_created", actionType: "ai_improve", icon: "ai" },
  { id: "ai_improve_item_name", name: "When an item is created, improve text in item name", description: "When an item is created ✦improve text in item name, into column. With moderate changes, in a shorter length, and a natural tone.", category: "ai_powered", triggerType: "item_created", actionType: "ai_improve", icon: "ai" },
  { id: "ai_improve_name_changes", name: "When item name changes, improve text in item name", description: "When item name changes ✦improve text in item name, into column. With moderate changes, in a shorter length, and a natural tone.", category: "ai_powered", triggerType: "name_changed", actionType: "ai_improve", icon: "ai" },
  { id: "ai_improve_column_changes", name: "When column changes, improve text in column", description: "When column changes ✦improve text in column, into column. With moderate changes, in a shorter length, and a natural tone.", category: "ai_powered", triggerType: "column_changed", actionType: "ai_improve", icon: "ai" },
  
  // AI-powered - Translate text
  { id: "ai_translate_item_created", name: "When an item is created, translate text in column", description: "When an item is created ✦translate text in column, to Language and insert into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_translate", icon: "ai" },
  { id: "ai_translate_item_name", name: "When an item is created, translate text in item name", description: "When an item is created ✦translate text in item name, to Language and insert into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_translate", icon: "ai" },
  { id: "ai_translate_column_changes", name: "When column changes, translate text in column", description: "When column changes ✦translate text in column, to Language and insert into column", category: "ai_powered", triggerType: "column_changed", actionType: "ai_translate", icon: "ai" },
  { id: "ai_translate_name_changes", name: "When item name changes, translate text in item name", description: "When item name changes ✦translate text in item name, to Language and insert into column", category: "ai_powered", triggerType: "name_changed", actionType: "ai_translate", icon: "ai" },
  
  // AI-powered - Detect language
  { id: "ai_language_item_created", name: "When an item is created, detect language in column", description: "When an item is created ✦detect language in column according to these instructions, and insert into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_language", icon: "ai" },
  { id: "ai_language_update_created", name: "When an update is created, detect language in updates", description: "When an update is created ✦detect language in updates according to these instructions, and insert into column", category: "ai_powered", triggerType: "update_created", actionType: "ai_language", icon: "ai" },
  { id: "ai_language_item_name", name: "When an item is created, detect language in item name", description: "When an item is created ✦detect language in item name according to these instructions, and insert into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_language", icon: "ai" },
  { id: "ai_language_column_changes", name: "When column changes, detect language in column", description: "When column changes ✦detect language in column according to these instructions, and insert into column", category: "ai_powered", triggerType: "column_changed", actionType: "ai_language", icon: "ai" },
  { id: "ai_language_name_changes", name: "When item name changes, detect language in item name", description: "When item name changes ✦detect language in item name according to these instructions, and insert into column", category: "ai_powered", triggerType: "name_changed", actionType: "ai_language", icon: "ai" },
  
  // AI-powered - Categorize
  { id: "ai_categorize_item_created", name: "When an item is created, categorize column", description: "When an item is created ✦categorize column according to these instructions, into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_categorize_item_name", name: "When an item is created, categorize item name", description: "When an item is created ✦categorize item name according to these instructions, into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_categorize_update_created", name: "When an update is created, categorize updates", description: "When an update is created ✦categorize updates, into column", category: "ai_powered", triggerType: "update_created", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_categorize_column_changes", name: "When column changes, categorize column", description: "When column changes ✦categorize column according to these instructions, into column", category: "ai_powered", triggerType: "column_changed", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_categorize_name_changes", name: "When item name changes, categorize item name", description: "When item name changes ✦categorize item name according to these instructions, into column", category: "ai_powered", triggerType: "name_changed", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_categorize_email", name: "When an activity/email is created, categorize Emails and Activities", description: "When an activity/email is created in Emails & Activities, ✦categorize Emails and Activities according to these instructions, into column", category: "ai_powered", triggerType: "email_activity", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_categorize_moved", name: "When an item is moved to this board, categorize item name", description: "When an item is moved to this board ✦categorize item name according to these instructions, into column", category: "ai_powered", triggerType: "item_moved", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_categorize_empty", name: "When an item is created and only if column is empty, categorize column", description: "When an item is created and only if column is empty ✦categorize column according to these instructions, into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_categorize_item_name_empty", name: "When an item is created and only if column is empty, categorize item name", description: "When an item is created and only if column is empty ✦categorize item name according to these instructions, into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_categorize", icon: "ai" },
  { id: "ai_button_categorize", name: "When button clicked, categorize column", description: "When button clicked ✦categorize column according to these instructions, into column", category: "ai_powered", triggerType: "button_clicked", actionType: "ai_categorize", icon: "ai" },
  
  // AI-powered - Summarize text
  { id: "ai_summarize_column_changes", name: "When column changes, summarize text in column", description: "When column changes ✦summarize text in column according to these instructions, into column", category: "ai_powered", triggerType: "column_changed", actionType: "ai_summarize", icon: "ai" },
  { id: "ai_summarize_item_created", name: "When an item is created, summarize text in item name", description: "When an item is created ✦summarize text in item name according to these instructions, into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_summarize", icon: "ai" },
  { id: "ai_summarize_item_column", name: "When an item is created, summarize text in column", description: "When an item is created ✦summarize text in column according to these instructions, into column", category: "ai_powered", triggerType: "item_created", actionType: "ai_summarize", icon: "ai" },
  { id: "ai_summarize_update_created", name: "When an update is created, summarize text in updates", description: "When an update is created ✦summarize text in updates according to these instructions, into column", category: "ai_powered", triggerType: "update_created", actionType: "ai_summarize", icon: "ai" },
  { id: "ai_summarize_name_changes", name: "When item name changes, summarize text in column", description: "When item name changes ✦summarize text in column according to these instructions, into column", category: "ai_powered", triggerType: "name_changed", actionType: "ai_summarize", icon: "ai" },
  { id: "ai_button_summarize", name: "When button clicked, summarize text in column", description: "When button clicked ✦summarize text in column according to these instructions, into column", category: "ai_powered", triggerType: "button_clicked", actionType: "ai_summarize", icon: "ai" },
  
  // Integrations - Slack
  { id: "slack_notify_status", name: "When status changes, notify in channel", description: "When _____ changes to _____, notify in channel _____", category: "integrations", triggerType: "status_changed", actionType: "slack_notify", icon: "slack" },
  { id: "slack_priority_high", name: "When priority changes to high, notify in channel urgent", description: "When priority changes to high, notify in channel urgent", category: "integrations", triggerType: "priority_changed", actionType: "slack_notify", icon: "slack" },
  
  // Integrations - Gmail
  { id: "gmail_create_contact", name: "When an email is received, create an item in contacts", description: "When an email is received, create an item in contacts", category: "integrations", triggerType: "email_received", actionType: "create_item", icon: "gmail" },
  
  // Integrations - SMS
  { id: "sms_status_stuck", name: "When a status changes to stuck, send SMS to everyone", description: "When a status changes to stuck, send SMS to everyone", category: "integrations", triggerType: "status_changed", actionType: "send_sms", icon: "sms" },
  
  // Status & Progress
  { id: "status_create_item", name: "When status changes to something, create an item in board", description: "When status changes to something create an item in board", category: "status_progress", triggerType: "status_changed", actionType: "create_item", icon: "monday" },
  { id: "status_move_item", name: "When status changes to something, move item to board", description: "When status changes to something move item to board", category: "status_progress", triggerType: "status_changed", actionType: "move_item", icon: "monday" },
  { id: "status_change_another", name: "When status changes to something, change another status to something", description: "When status changes to something, change another status to something", category: "status_progress", triggerType: "status_changed", actionType: "change_status", icon: "monday" },
  { id: "status_dependency", name: "When a status changes to something, change the status of its dependency to something", description: "When a status changes to something, change the status of its dependency to something", category: "status_progress", triggerType: "status_changed", actionType: "change_status", icon: "monday" },
  { id: "status_set_due_date", name: "When status changes to something, set due date to current date", description: "When status changes to something, set due date to current date", category: "status_progress", triggerType: "status_changed", actionType: "set_date", icon: "monday" },
  { id: "status_time_tracking", name: "When status changes to something, start time tracking. When it changes to something stop.", description: "When status changes to something, start time tracking. When it changes to something stop.", category: "status_progress", triggerType: "status_changed", actionType: "time_tracking", icon: "monday" },
  
  // Cross-Board
  { id: "cross_item_created_connect", name: "When an item is created, create an item in board and connect boards with column", description: "When an item is created create an item in board and connect boards with column", category: "cross_board", triggerType: "item_created", actionType: "create_connect", icon: "monday" },
  { id: "cross_status_due_date", name: "When status changes to something, set due date to current date plus some days", description: "When status changes to something, set due date to current date plus some days", category: "cross_board", triggerType: "status_changed", actionType: "set_date", icon: "monday" },
  { id: "cross_item_connect_another", name: "When an item is created in this board, create an item in another board and connect them", description: "When an item is created in this board, create an item in another board and connect them in the selected board", category: "cross_board", triggerType: "item_created", actionType: "create_connect", icon: "monday" },
  { id: "cross_column_connect", name: "When column changes, connect the item where the new value matches this column in another board", description: "When column changes, connect the item where the new value matches this column in another board by this logic", category: "cross_board", triggerType: "column_changed", actionType: "connect_item", icon: "monday" },
  { id: "cross_item_connect_match", name: "When an item is created in this board, connect the item where this column matches this column in another board", description: "When an item is created in this board, connect the item where this column matches this column in another board by this logic", category: "cross_board", triggerType: "item_created", actionType: "connect_item", icon: "monday" },
  { id: "cross_status_create_connect", name: "When status changes to something, create an item in board and connect boards with column", description: "When status changes to something create an item in board and connect boards with column", category: "cross_board", triggerType: "status_changed", actionType: "create_connect", icon: "monday" },
  { id: "cross_adjust_date", name: "Adjust this date to reflect the changes made in this other date of the same item", description: "Adjust this date to reflect the changes made in this other date of the same item", category: "cross_board", triggerType: "date_changed", actionType: "adjust_date", icon: "monday" },
  { id: "cross_column_connect_logic", name: "When column changes, connect the item where this column matches another column in another board by this logic", description: "When column changes, connect the item where this column matches another column in another board by this logic", category: "cross_board", triggerType: "column_changed", actionType: "connect_item", icon: "monday" },
  
  // Notifications
  { id: "notify_status_change", name: "Notify when status changes", description: "When status changes, send notification to assignee", category: "notifications", triggerType: "status_changed", actionType: "send_notification", icon: "monday" },
  { id: "notify_due_soon", name: "Notify when due date approaches", description: "When due date is within 2 days, notify assignee", category: "notifications", triggerType: "due_date_approaching", actionType: "send_notification", icon: "monday" },
  { id: "notify_overdue", name: "Notify when overdue", description: "When item is overdue, send notification to owner", category: "notifications", triggerType: "item_overdue", actionType: "send_notification", icon: "monday" },
  
  // Date & Time
  { id: "date_set_on_status", name: "Set due date when status changes", description: "When status changes to 'Working on it', set due date to 7 days from now", category: "date_time", triggerType: "status_changed", actionType: "set_date", icon: "monday" },
  { id: "date_clear_on_done", name: "Clear date when done", description: "When status changes to 'Done', clear the due date", category: "date_time", triggerType: "status_changed", actionType: "update_field", icon: "monday" },
  
  // Recurring Work
  { id: "recurring_weekly", name: "Create weekly recurring item", description: "Every Monday, create a new item in board", category: "recurring_work", triggerType: "schedule", actionType: "create_item", icon: "monday" },
  { id: "recurring_monthly", name: "Create monthly recurring item", description: "On the 1st of each month, create a new item", category: "recurring_work", triggerType: "schedule", actionType: "create_item", icon: "monday" },
  
  // Legal Workflows
  { id: "lw_client_followup", name: "Client follow-up on Waiting status", description: "When status changes to Waiting on Client, create a follow-up task in 3 days", category: "legal_workflows", triggerType: "status_changed", actionType: "create_item" },
  { id: "lw_intake_routing", name: "New intake auto-routing", description: "When a new item is created, assign intake owner and add intake tag", category: "legal_workflows", triggerType: "item_created", actionType: "assign_person" },
  { id: "lw_deadline_reminder", name: "48-hour deadline reminder", description: "When due date is approaching, send a deadline reminder notification", category: "legal_workflows", triggerType: "due_date_approaching", actionType: "send_notification" },
  { id: "lw_overdue_escalation", name: "Overdue item escalation", description: "When due date passes and status is still Waiting, escalate to lead attorney", category: "legal_workflows", triggerType: "due_date_passed", actionType: "send_notification" },
  { id: "lw_filing_confirmation", name: "Filing confirmation task", description: "When status changes to Filed, create a receipt confirmation task", category: "legal_workflows", triggerType: "status_changed", actionType: "create_item" },
  { id: "lw_evidence_ocr", name: "Evidence upload auto-OCR", description: "When a file is uploaded, automatically request OCR processing", category: "legal_workflows", triggerType: "file_uploaded", actionType: "request_ocr" },
  { id: "lw_deadline_detection", name: "Deadline detection from OCR", description: "When OCR detects a deadline, set due date and add deadline tag", category: "legal_workflows", triggerType: "signal_deadline_detected", actionType: "set_date" },
  { id: "lw_privilege_tagging", name: "Privilege auto-tagging", description: "When content is flagged as privileged, add privilege-review tag", category: "legal_workflows", triggerType: "signal_privilege_detected", actionType: "add_tag" },
  { id: "lw_daily_digest", name: "Daily task digest", description: "Every day at 8 AM, send a summary of open tasks and deadlines", category: "legal_workflows", triggerType: "time_daily_at", actionType: "send_notification" },
  { id: "lw_discovery_checklist", name: "Discovery checklist creation", description: "When status changes to Discovery, create subtasks for discovery steps", category: "legal_workflows", triggerType: "status_changed", actionType: "create_subtask" },
  { id: "lw_contradiction_flag", name: "Contradiction flagging", description: "When analysis detects contradictions, notify assigned attorney", category: "legal_workflows", triggerType: "signal_contradiction_detected", actionType: "send_notification" },
  { id: "lw_billing_receipt", name: "Receipt to expense entry", description: "When a file is classified as receipt, create billing expense entry", category: "legal_workflows", triggerType: "file_classified", actionType: "create_item" },
];

// AI Icon component with gradient colors matching Monday.com
function AISparkleIcon({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 ${className}`}>
      <Sparkles className="h-4 w-4 text-white" />
    </div>
  );
}

// Render template description with bold keywords
function TemplateDescription({ description }: { description: string }) {
  // Split by ✦ to identify AI action parts
  const parts = description.split('✦');
  
  if (parts.length === 1) {
    // No AI action, just bold the keywords
    const keywords = ['status', 'priority', 'column', 'item', 'board', 'something', 'stuck', 'high', 'urgent', 'email', 'contacts', 'everyone', 'channel', 'due date', 'time tracking'];
    let result = description;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      result = result.replace(regex, `<strong>$1</strong>`);
    });
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  }
  
  // Has AI action - make the action text primary colored
  const beforeAction = parts[0];
  const afterAction = parts[1] || "";
  
  // Bold keywords in before part
  const keywords = ['column', 'item', 'update', 'subitem', 'button', 'activity', 'email', 'Language', 'name'];
  let beforeHtml = beforeAction;
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    beforeHtml = beforeHtml.replace(regex, `<strong>$1</strong>`);
  });
  
  // Bold keywords in after part including "these instructions", "column", "moderate", "shorter", "natural"
  const afterKeywords = ['column', 'these instructions', 'moderate', 'shorter', 'natural', 'Language', 'brief'];
  let afterHtml = afterAction;
  afterKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    afterHtml = afterHtml.replace(regex, `<strong>$1</strong>`);
  });
  
  // Extract the AI action verb
  const actionMatch = afterAction.match(/^([a-z\s]+)/i);
  const actionVerb = actionMatch ? actionMatch[1].trim() : "";
  const restOfAction = actionVerb ? afterAction.substring(actionVerb.length) : afterAction;
  
  // Bold the rest of the action text keywords
  let restHtml = restOfAction;
  afterKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    restHtml = restHtml.replace(regex, `<strong>$1</strong>`);
  });
  
  return (
    <span>
      <span dangerouslySetInnerHTML={{ __html: beforeHtml }} />
      <span className="text-primary font-medium">✦{actionVerb}</span>
      <span dangerouslySetInnerHTML={{ __html: restHtml }} />
    </span>
  );
}

// Get icon component for template
function TemplateIcon({ icon }: { icon?: string }) {
  switch (icon) {
    case "ai":
      return <AISparkleIcon className="w-8 h-8 p-1.5" />;
    case "slack":
      return (
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
          <SiSlack className="h-5 w-5 text-[#4A154B]" />
        </div>
      );
    case "gmail":
      return (
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
          <SiGmail className="h-5 w-5 text-[#EA4335]" />
        </div>
      );
    case "sms":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#E52D27] flex items-center justify-center">
          <MessageSquare className="h-4 w-4 text-white" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 via-red-500 to-green-500 flex items-center justify-center">
          <Zap className="h-4 w-4 text-white" />
        </div>
      );
  }
}

function triggerLabel(type: string): string {
  const map: Record<string, string> = {
    item_created: "Item created",
    status_changed: "Status changes",
    priority_changed: "Priority changes",
    column_changed: "Column changes",
    name_changed: "Name changes",
    update_created: "Update created",
    subitem_created: "Subitem created",
    due_date_approaching: "Due date approaching",
    due_date_passed: "Due date passed",
    item_overdue: "Item overdue",
    file_uploaded: "File uploaded",
    email_received: "Email received",
    email_activity: "Email activity",
    button_clicked: "Button clicked",
    item_moved: "Item moved",
    date_changed: "Date changes",
    schedule: "On schedule",
    time_daily_at: "Daily schedule",
    file_classified: "File classified",
    signal_deadline_detected: "Deadline detected",
    signal_privilege_detected: "Privilege detected",
    signal_contradiction_detected: "Contradiction detected",
  };
  return map[type] || type.replace(/_/g, " ");
}

function actionLabel(type: string): string {
  const map: Record<string, string> = {
    send_notification: "Send notification",
    change_status: "Change status",
    change_priority: "Change priority",
    assign_person: "Assign person",
    send_email: "Send email",
    slack_notify: "Notify Slack",
    send_slack: "Notify Slack",
    send_sms: "Send SMS",
    create_item: "Create item",
    create_subtask: "Create subtask",
    move_item: "Move item",
    set_date: "Set date",
    adjust_date: "Adjust date",
    update_field: "Update field",
    add_tag: "Add tag",
    request_ocr: "Request OCR",
    time_tracking: "Time tracking",
    connect_item: "Connect item",
    create_connect: "Create & connect",
    ai_fill: "AI fill column",
    ai_sentiment: "AI sentiment",
    ai_write: "AI write",
    ai_extract: "AI extract",
    ai_improve: "AI improve",
    ai_translate: "AI translate",
    ai_language: "AI detect language",
    ai_categorize: "AI categorize",
    ai_summarize: "AI summarize",
    request_approval: "Request approval",
    move_to_group: "Move to group",
  };
  return map[type] || type.replace(/_/g, " ");
}

interface AutomationsPanelProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
}

export function AutomationsPanel({ boardId, open, onClose }: AutomationsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("ai_powered");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !showTemplatesDialog) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showTemplatesDialog]);

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/boards", boardId, "automations"],
    enabled: open && !!boardId,
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (rule: AutomationRule) =>
      apiRequest("PATCH", `/api/automations/${rule.id}`, { isActive: !rule.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: Partial<AutomationRule>) =>
      apiRequest("POST", `/api/boards/${boardId}/automations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
      toast({ title: "Automation created successfully" });
      setShowTemplatesDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to create automation", variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) =>
      apiRequest("DELETE", `/api/automations/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
      toast({ title: "Automation deleted" });
    },
  });

  const handleUseTemplate = (template: AutomationTemplate) => {
    createRuleMutation.mutate({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      actionType: template.actionType,
      isActive: true,
    });
  };

  const handleOpenTemplates = () => {
    setShowTemplatesDialog(true);
    setSelectedCategory("ai_powered");
    setTemplateSearchQuery("");
  };

  const filteredTemplates = AUTOMATION_TEMPLATES.filter(template => {
    const matchesSearch = !templateSearchQuery || 
      template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(templateSearchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-96 bg-card border-l shadow-xl z-50 flex flex-col" data-testid="panel-automations">
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-semibold" data-testid="text-panel-title">Automations</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleOpenTemplates} data-testid="button-add-automation">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-automations">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No automations yet. Add your first automation to streamline your workflow.
                </p>
                <Button onClick={handleOpenTemplates}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Automation
                </Button>
              </div>
            ) : (
              rules.map((rule) => (
                <Card key={rule.id} className={`hover-elevate ${!rule.isActive ? "opacity-60" : ""}`} data-testid={`automation-card-${rule.id}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Zap className={`h-4 w-4 shrink-0 ${rule.isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <h4 className="font-medium text-sm truncate">{rule.name}</h4>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => toggleRuleMutation.mutate(rule)}
                          data-testid={`toggle-automation-${rule.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          data-testid={`button-delete-automation-${rule.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        When: {triggerLabel(rule.triggerType)}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        Then: {actionLabel(rule.actionType)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0" data-testid="dialog-automations">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle data-testid="text-dialog-title">Automation Center</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">Choose from {AUTOMATION_TEMPLATES.length} automation recipes to automate your workflow</DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-1 min-h-0">
            {/* Sidebar - Categories */}
            <div className="w-48 border-r p-3 space-y-1 shrink-0">
              {AUTOMATION_CATEGORIES.map((category) => {
                const count = AUTOMATION_TEMPLATES.filter(t => t.category === category.id).length;
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover-elevate'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                    data-testid={`category-${category.id}`}
                  >
                    <span>{category.name}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </button>
                );
              })}
            </div>
            
            {/* Main content - Templates grid */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    placeholder="Search automations..."
                    className="pl-9"
                    data-testid="input-search-templates"
                  />
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4" data-testid="text-category-title">
                    {AUTOMATION_CATEGORIES.find(c => c.id === selectedCategory)?.name || "All Templates"}
                  </h3>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredTemplates.map((template) => (
                      <Card 
                        key={template.id} 
                        className="flex flex-col h-full"
                        data-testid={`template-${template.id}`}
                      >
                        <CardContent className="p-4 flex flex-col h-full">
                          <div className="mb-3">
                            <TemplateIcon icon={template.icon} />
                          </div>
                          <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                            <TemplateDescription description={template.description} />
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4 w-full"
                            onClick={() => handleUseTemplate(template)}
                            disabled={createRuleMutation.isPending}
                            data-testid={`button-use-template-${template.id}`}
                          >
                            {createRuleMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Use template"
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No templates found matching your search.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

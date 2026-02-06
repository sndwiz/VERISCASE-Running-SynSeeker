import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Zap, 
  Plus,
  Trash2,
  Play,
  Pause,
  Settings,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Bot,
  Bell,
  Move,
  Edit,
  UserPlus,
  UserMinus,
  Webhook,
  FileText,
  Calendar,
  Users,
  Target,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  Mail,
  MessageSquare,
  Smartphone,
  Languages,
  Brain,
  FileSearch,
  Wand2,
  Smile,
  FolderTree,
  PenTool,
  Search,
  Globe,
  Hash,
  TrendingUp,
  LayoutGrid,
  Shield,
  Gavel,
  Scale,
  Workflow,
  Send,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { SiSlack, SiGmail } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AutomationRule {
  id: string;
  boardId: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: string;
  triggerField?: string;
  triggerValue?: string;
  conditions: { field: string; operator: string; value: any }[];
  actionType: string;
  actionConfig: Record<string, any>;
  runCount: number;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

interface Board {
  id: string;
  name: string;
}

const TRIGGER_TYPES = {
  item_created: { label: "Item Created", icon: Plus, description: "When a new task is created" },
  status_changed: { label: "Status Changed", icon: Target, description: "When task status changes" },
  priority_changed: { label: "Priority Changed", icon: AlertCircle, description: "When task priority changes" },
  column_changed: { label: "Column Changed", icon: Edit, description: "When any column value changes" },
  item_name_changed: { label: "Item Name Changed", icon: FileText, description: "When item name is modified" },
  due_date_approaching: { label: "Due Date Approaching", icon: Calendar, description: "Before due date arrives" },
  due_date_passed: { label: "Due Date Passed", icon: Clock, description: "When due date has passed" },
  assigned: { label: "Person Assigned", icon: UserPlus, description: "When someone is assigned" },
  unassigned: { label: "Person Unassigned", icon: UserMinus, description: "When someone is unassigned" },
  moved_to_group: { label: "Moved to Group", icon: Move, description: "When task moves to different group" },
  file_uploaded: { label: "File Uploaded", icon: FileText, description: "When a file is attached" },
  update_created: { label: "Update Created", icon: MessageSquare, description: "When a comment/update is added" },
  button_clicked: { label: "Button Clicked", icon: Zap, description: "When a button column is clicked" },
  email_received: { label: "Email Received", icon: Mail, description: "When an email is received" },
  // Legal Compliance Triggers
  approval_status_changed: { label: "Approval Changed", icon: Gavel, description: "When approval status changes" },
  approval_required: { label: "Approval Required", icon: Shield, description: "When item needs approval" },
  deadline_warning: { label: "Deadline Warning", icon: Clock, description: "When a deadline is approaching" },
  compliance_check: { label: "Compliance Check", icon: Shield, description: "When compliance verification is needed" },
};

const ACTION_TYPES = {
  change_status: { label: "Change Status", icon: Target, description: "Update the task status" },
  change_priority: { label: "Change Priority", icon: AlertCircle, description: "Update the task priority" },
  move_to_group: { label: "Move to Group", icon: Move, description: "Move task to another group" },
  assign_person: { label: "Assign Person", icon: UserPlus, description: "Assign someone to the task" },
  send_notification: { label: "Send Notification", icon: Bell, description: "Send alert notification" },
  update_field: { label: "Update Field", icon: Edit, description: "Update a specific field" },
  trigger_webhook: { label: "Trigger Webhook", icon: Webhook, description: "Call an external URL" },
  create_item: { label: "Create Item", icon: Plus, description: "Create a new item in a board" },
  // AI Actions
  ai_fill_column: { label: "Use AI to Fill", icon: Sparkles, description: "Use AI to automatically fill a column" },
  ai_summarize: { label: "Summarize Text", icon: FileSearch, description: "AI-powered text summarization" },
  ai_categorize: { label: "Categorize", icon: FolderTree, description: "AI-powered categorization" },
  ai_detect_language: { label: "Detect Language", icon: Globe, description: "Detect the language of text" },
  ai_translate: { label: "Translate Text", icon: Languages, description: "Translate text to another language" },
  ai_sentiment: { label: "Detect Sentiment", icon: Smile, description: "Analyze text sentiment" },
  ai_improve: { label: "Improve Text", icon: Wand2, description: "AI-powered text improvement" },
  ai_extract: { label: "Extract Info", icon: Search, description: "Extract information from text" },
  ai_write: { label: "Write with AI", icon: PenTool, description: "Generate content with AI" },
  // Integration Actions
  send_slack: { label: "Notify in Channel", icon: MessageSquare, description: "Send Slack notification" },
  send_sms: { label: "Send SMS", icon: Smartphone, description: "Send SMS notification" },
  send_email: { label: "Send Email", icon: Mail, description: "Send email notification" },
  start_time_tracking: { label: "Start Time Tracking", icon: Clock, description: "Start tracking time" },
  stop_time_tracking: { label: "Stop Time Tracking", icon: Clock, description: "Stop tracking time" },
  set_date: { label: "Set Date", icon: Calendar, description: "Set a date field value" },
  // Legal Compliance Actions
  request_approval: { label: "Request Approval", icon: Gavel, description: "Route for attorney approval" },
  escalate_review: { label: "Escalate Review", icon: AlertCircle, description: "Escalate to senior reviewer" },
  generate_confirmation: { label: "Generate Confirmation", icon: FileText, description: "Create audit confirmation record" },
  log_compliance: { label: "Log Compliance", icon: Shield, description: "Log compliance verification" },
  create_subtask: { label: "Create Subtask", icon: Plus, description: "Create a related subtask" },
};

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  triggerLabel: string;
  actionType: string;
  actionLabel: string;
  icon?: string;
  isAI?: boolean;
  isIntegration?: boolean;
}

const AUTOMATION_CATEGORIES = [
  { id: "ai_powered", name: "AI-powered", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: Sparkles },
  { id: "legal_compliance", name: "Legal Compliance", color: "bg-gradient-to-r from-teal-500 to-emerald-500", icon: Shield },
  { id: "integrations", name: "Integrations", color: "bg-gradient-to-r from-blue-500 to-cyan-500", icon: Globe },
  { id: "status_progress", name: "Status & Progress", color: "bg-purple-500", icon: Target },
  { id: "date_time", name: "Date & Time", color: "bg-yellow-500", icon: Calendar },
  { id: "assignees", name: "Assignees & Ownership", color: "bg-blue-500", icon: Users },
  { id: "notifications", name: "Notifications & Alerts", color: "bg-red-500", icon: Bell },
  { id: "column_updates", name: "Column Updates", color: "bg-gray-500", icon: Edit },
  { id: "cross_board", name: "Cross-Board", color: "bg-orange-500", icon: LayoutGrid },
];

const AI_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  // Use AI to fill column
  {
    id: "ai_fill_item_created",
    name: "When an item is created, use AI to fill in column",
    description: "Automatically populate a column using AI when new items are added",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_fill_column",
    actionLabel: "use AI to fill in column",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_fill_update_created",
    name: "When an update is created, use AI to fill in column",
    description: "Use AI to analyze updates and fill column values",
    category: "ai_powered",
    triggerType: "update_created",
    triggerLabel: "When an update is created",
    actionType: "ai_fill_column",
    actionLabel: "use AI to fill in column",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_fill_column_changes",
    name: "When column changes, use AI to fill in column",
    description: "Trigger AI to update columns when values change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_fill_column",
    actionLabel: "use AI to fill in column",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_fill_name_changes",
    name: "When item name changes, use AI to fill in column",
    description: "Update column with AI when item name is modified",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_fill_column",
    actionLabel: "use AI to fill in column",
    icon: "sparkles",
    isAI: true,
  },
  // Detect Sentiment
  {
    id: "ai_sentiment_item_created",
    name: "When an item is created, detect sentiment in column and insert into column",
    description: "Analyze sentiment of text content when items are created",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_sentiment",
    actionLabel: "detect sentiment",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_sentiment_update",
    name: "When an update is created, detect sentiment in updates and insert into column",
    description: "Analyze sentiment of comments and updates",
    category: "ai_powered",
    triggerType: "update_created",
    triggerLabel: "When an update is created",
    actionType: "ai_sentiment",
    actionLabel: "detect sentiment",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_sentiment_column",
    name: "When column changes, detect sentiment according to these instructions",
    description: "Detect sentiment when column values change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_sentiment",
    actionLabel: "detect sentiment",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_sentiment_name",
    name: "When item name changes, detect sentiment in item name and insert into column",
    description: "Analyze sentiment of item names",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_sentiment",
    actionLabel: "detect sentiment",
    icon: "sparkles",
    isAI: true,
  },
  // Write with AI
  {
    id: "ai_write_item_created",
    name: "When an item is created, write with AI in a natural tone, keep it brief, and insert into column",
    description: "Generate content with AI when new items are created",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_write",
    actionLabel: "write with AI",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_write_update",
    name: "When an update is created, write with AI in a natural tone, keep it brief, and insert into column",
    description: "Generate AI content based on updates",
    category: "ai_powered",
    triggerType: "update_created",
    triggerLabel: "When an update is created",
    actionType: "ai_write",
    actionLabel: "write with AI",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_write_column",
    name: "When column changes, write with AI in a natural tone, keep it brief, and insert into column",
    description: "Generate content with AI when columns change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_write",
    actionLabel: "write with AI",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_write_name",
    name: "When item name changes, write with AI in a natural tone, keep it brief, and insert into column",
    description: "Generate content with AI when item name changes",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_write",
    actionLabel: "write with AI",
    icon: "sparkles",
    isAI: true,
  },
  // Extract Info
  {
    id: "ai_extract_item_created",
    name: "When an item is created, extract info from column according to these instructions, into column",
    description: "Extract specific information from content using AI",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_extract",
    actionLabel: "extract info",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_extract_column",
    name: "When column changes, extract info from column according to these instructions, into column",
    description: "Extract information when column values change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_extract",
    actionLabel: "extract info",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_extract_name_item",
    name: "When an item is created, extract info from the item's name based on these instructions, into column",
    description: "Extract information from item names using AI",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_extract",
    actionLabel: "extract info from name",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_extract_update",
    name: "When an update is created, extract info from the item's updates based on these instructions, into column",
    description: "Extract information from updates and comments",
    category: "ai_powered",
    triggerType: "update_created",
    triggerLabel: "When an update is created",
    actionType: "ai_extract",
    actionLabel: "extract info",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_extract_name_changes",
    name: "When item name changes, extract info from the item's name according to these instructions, into column",
    description: "Extract information when item names change",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_extract",
    actionLabel: "extract info",
    icon: "sparkles",
    isAI: true,
  },
  // Improve Text
  {
    id: "ai_improve_item_created",
    name: "When an item is created, improve text in column, into column. With moderate changes, in a shorter length, and a natural tone.",
    description: "Improve text quality with AI when items are created",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_improve",
    actionLabel: "improve text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_improve_column",
    name: "When column changes, improve text in column, into column. With moderate changes, in a shorter length, and a natural tone.",
    description: "Improve text when column values change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_improve",
    actionLabel: "improve text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_improve_name",
    name: "When item name changes, improve text in item name, into column. With moderate changes, in a shorter length, and a natural tone.",
    description: "Improve item name text quality",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_improve",
    actionLabel: "improve text",
    icon: "sparkles",
    isAI: true,
  },
  // Translate Text
  {
    id: "ai_translate_item_created",
    name: "When an item is created, translate text in column, to Language and insert into column",
    description: "Translate content when items are created",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_translate",
    actionLabel: "translate text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_translate_column",
    name: "When column changes, translate text in column, to Language and insert into column",
    description: "Translate content when column values change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_translate",
    actionLabel: "translate text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_translate_name",
    name: "When item name changes, translate text in item name, to Language and insert into column",
    description: "Translate item names to another language",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_translate",
    actionLabel: "translate text",
    icon: "sparkles",
    isAI: true,
  },
  // Detect Language
  {
    id: "ai_detect_lang_item",
    name: "When an item is created, detect language in column according to these instructions, and insert into column",
    description: "Identify the language of content when items are created",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_detect_language",
    actionLabel: "detect language",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_detect_lang_update",
    name: "When an update is created, detect language in updates according to these instructions, and insert into column",
    description: "Identify language of updates and comments",
    category: "ai_powered",
    triggerType: "update_created",
    triggerLabel: "When an update is created",
    actionType: "ai_detect_language",
    actionLabel: "detect language",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_detect_lang_column",
    name: "When column changes, detect language in column according to these instructions, and insert into column",
    description: "Identify language when column values change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_detect_language",
    actionLabel: "detect language",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_detect_lang_name",
    name: "When item name changes, detect language in item name according to these instructions, and insert into column",
    description: "Identify language of item names",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_detect_language",
    actionLabel: "detect language",
    icon: "sparkles",
    isAI: true,
  },
  // Categorize
  {
    id: "ai_categorize_item",
    name: "When an item is created, categorize item name according to these instructions, into column",
    description: "Automatically categorize new items using AI",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_categorize",
    actionLabel: "categorize",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_categorize_column",
    name: "When column changes, categorize column according to these instructions, into column",
    description: "Categorize content when column values change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_categorize",
    actionLabel: "categorize",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_categorize_name",
    name: "When item name changes, categorize item name according to these instructions, into column",
    description: "Categorize items when names change",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_categorize",
    actionLabel: "categorize",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_categorize_update",
    name: "When an update is created, categorize updates, into column",
    description: "Categorize updates and comments using AI",
    category: "ai_powered",
    triggerType: "update_created",
    triggerLabel: "When an update is created",
    actionType: "ai_categorize",
    actionLabel: "categorize",
    icon: "sparkles",
    isAI: true,
  },
  // Summarize Text
  {
    id: "ai_summarize_column",
    name: "When column changes, summarize text in column according to these instructions, into column",
    description: "Create AI summaries when column values change",
    category: "ai_powered",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "ai_summarize",
    actionLabel: "summarize text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_summarize_item_name",
    name: "When an item is created, summarize text in item name according to these instructions, into column",
    description: "Summarize item names when created",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_summarize",
    actionLabel: "summarize text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_summarize_item_column",
    name: "When an item is created, summarize text in column according to these instructions, into column",
    description: "Summarize column content when items are created",
    category: "ai_powered",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "ai_summarize",
    actionLabel: "summarize text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_summarize_update",
    name: "When an update is created, summarize text in updates according to these instructions, into column",
    description: "Summarize updates and comments",
    category: "ai_powered",
    triggerType: "update_created",
    triggerLabel: "When an update is created",
    actionType: "ai_summarize",
    actionLabel: "summarize text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_summarize_name_changes",
    name: "When item name changes, summarize text in column according to these instructions, into column",
    description: "Summarize content when item names change",
    category: "ai_powered",
    triggerType: "item_name_changed",
    triggerLabel: "When item name changes",
    actionType: "ai_summarize",
    actionLabel: "summarize text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "ai_summarize_button",
    name: "When button clicked, summarize text in column according to these instructions, into column",
    description: "Summarize on button click",
    category: "ai_powered",
    triggerType: "button_clicked",
    triggerLabel: "When button clicked",
    actionType: "ai_summarize",
    actionLabel: "summarize text",
    icon: "sparkles",
    isAI: true,
  },
];

const INTEGRATION_TEMPLATES: AutomationTemplate[] = [
  // Slack Integrations
  {
    id: "slack_notify_channel",
    name: "When ___ changes to ___, notify in channel ___",
    description: "Send Slack notifications when column values change",
    category: "integrations",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "send_slack",
    actionLabel: "notify in channel",
    icon: "slack",
    isIntegration: true,
  },
  {
    id: "slack_priority_high",
    name: "When priority changes to high, notify in channel urgent",
    description: "Alert team in Slack when priority is set to high",
    category: "integrations",
    triggerType: "priority_changed",
    triggerLabel: "When priority changes to high",
    actionType: "send_slack",
    actionLabel: "notify in channel urgent",
    icon: "slack",
    isIntegration: true,
  },
  // Gmail Integrations
  {
    id: "gmail_create_item",
    name: "When an email is received, create an item in contacts",
    description: "Automatically create items from incoming emails",
    category: "integrations",
    triggerType: "email_received",
    triggerLabel: "When an email is received",
    actionType: "create_item",
    actionLabel: "create an item in contacts",
    icon: "gmail",
    isIntegration: true,
  },
  {
    id: "gmail_create_item_board",
    name: "When an email is received, create an item in _contacts_",
    description: "Create items from emails in a specific board",
    category: "integrations",
    triggerType: "email_received",
    triggerLabel: "When an email is received",
    actionType: "create_item",
    actionLabel: "create an item",
    icon: "gmail",
    isIntegration: true,
  },
  // SMS/Twilio Integrations
  {
    id: "sms_status_change",
    name: "When a status changes to ___, send SMS to ___",
    description: "Send SMS notifications on status changes",
    category: "integrations",
    triggerType: "status_changed",
    triggerLabel: "When a status changes",
    actionType: "send_sms",
    actionLabel: "send SMS",
    icon: "sms",
    isIntegration: true,
  },
  {
    id: "sms_stuck",
    name: "When a status changes to stuck, send SMS to everyone",
    description: "Alert team via SMS when items get stuck",
    category: "integrations",
    triggerType: "status_changed",
    triggerLabel: "When a status changes to stuck",
    actionType: "send_sms",
    actionLabel: "send SMS to everyone",
    icon: "sms",
    isIntegration: true,
  },
];

const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  // Status & Progress
  {
    id: "status_create_item",
    name: "When status changes to something, create an item in board",
    description: "Create new items in a board when status changes",
    category: "status_progress",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "create_item",
    actionLabel: "create an item in board",
  },
  {
    id: "status_set_due_date",
    name: "When status changes to something, set due date to current date",
    description: "Set due date when status changes",
    category: "status_progress",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "set_date",
    actionLabel: "set due date",
  },
  {
    id: "status_due_date_plus",
    name: "When status changes to something, set due date to current date plus some days",
    description: "Set due date with offset when status changes",
    category: "status_progress",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "set_date",
    actionLabel: "set due date + days",
  },
  {
    id: "status_connect_boards",
    name: "When status changes to something, create an item in board and connect boards with column",
    description: "Create connected items across boards",
    category: "status_progress",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "create_item",
    actionLabel: "create and connect",
  },
  {
    id: "status_time_tracking",
    name: "When status changes to something, start time tracking. When it changes to something, stop.",
    description: "Control time tracking based on status changes",
    category: "status_progress",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "start_time_tracking",
    actionLabel: "start/stop time tracking",
  },
  {
    id: "move_item_done",
    name: "Move item when status changes",
    description: "When status changes to 'Done', move item to the Completed group",
    category: "status_progress",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "move_to_group",
    actionLabel: "Move to group",
  },
  {
    id: "notify_blocked",
    name: "Notify when item is blocked",
    description: "When status changes to 'Stuck', notify the owner",
    category: "status_progress",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "send_notification",
    actionLabel: "Send notification",
  },
  
  // Date & Time
  {
    id: "date_reflect_changes",
    name: "Adjust this date to reflect the changes made in this other date of the same item",
    description: "Sync date columns automatically",
    category: "date_time",
    triggerType: "column_changed",
    triggerLabel: "Adjust this date",
    actionType: "set_date",
    actionLabel: "reflect changes",
  },
  {
    id: "due_date_reminder",
    name: "Due date reminder",
    description: "Send notification 2 days before due date",
    category: "date_time",
    triggerType: "due_date_approaching",
    triggerLabel: "When due date approaches",
    actionType: "send_notification",
    actionLabel: "Send notification",
  },
  {
    id: "overdue_alert",
    name: "Overdue item alert",
    description: "Alert when an item is past its due date",
    category: "date_time",
    triggerType: "due_date_passed",
    triggerLabel: "When due date passes",
    actionType: "send_notification",
    actionLabel: "Send notification",
  },
  
  // Cross-Board
  {
    id: "cross_board_item_create",
    name: "When an item is created, create an item in board and connect boards with column",
    description: "Create linked items across boards",
    category: "cross_board",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "create_item",
    actionLabel: "create and connect",
  },
  {
    id: "cross_board_another",
    name: "When an item is created in this board, create an item in another board and connect them in the selected board",
    description: "Create mirror items in another board",
    category: "cross_board",
    triggerType: "item_created",
    triggerLabel: "When an item is created",
    actionType: "create_item",
    actionLabel: "create in another board",
  },
  {
    id: "cross_board_column_match",
    name: "When column changes, connect the item where the new value matches this column in another board by this logic",
    description: "Link items based on matching values",
    category: "cross_board",
    triggerType: "column_changed",
    triggerLabel: "When column changes",
    actionType: "update_field",
    actionLabel: "connect matching item",
  },
  
  // Assignees & Ownership
  {
    id: "assign_on_create",
    name: "Auto-assign on creation",
    description: "When item is created, assign to default owner",
    category: "assignees",
    triggerType: "item_created",
    triggerLabel: "When item is created",
    actionType: "assign_person",
    actionLabel: "Assign person",
  },
  {
    id: "reassign_on_status",
    name: "Reassign on status change",
    description: "When status changes to 'Review', assign to reviewer",
    category: "assignees",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "assign_person",
    actionLabel: "Assign person",
  },
  
  // Notifications & Alerts
  {
    id: "notify_on_create",
    name: "Notify team on new item",
    description: "When a new item is created, send notification to the team",
    category: "notifications",
    triggerType: "item_created",
    triggerLabel: "When item is created",
    actionType: "send_notification",
    actionLabel: "Send notification",
  },
  {
    id: "notify_on_assign",
    name: "Notify when assigned",
    description: "When someone is assigned, notify them immediately",
    category: "notifications",
    triggerType: "assigned",
    triggerLabel: "When person is assigned",
    actionType: "send_notification",
    actionLabel: "Send notification",
  },
  
  // Column Updates
  {
    id: "copy_field_value",
    name: "Copy field value",
    description: "When status changes, copy a value from one field to another",
    category: "column_updates",
    triggerType: "status_changed",
    triggerLabel: "When status changes",
    actionType: "update_field",
    actionLabel: "Update field",
  },
  
  // ============ LEGAL COMPLIANCE & APPROVAL WORKFLOWS ============
  
  // Approval Workflows
  {
    id: "legal_approval_status_ready",
    name: "When status changes to 'Ready for Review', request approval from senior attorney",
    description: "Route items for legal review when ready",
    category: "legal_compliance",
    triggerType: "status_changed",
    triggerLabel: "When status changes to Ready for Review",
    actionType: "request_approval",
    actionLabel: "request approval",

  },
  {
    id: "legal_approval_document_uploaded",
    name: "When document is uploaded, request attorney approval",
    description: "Require attorney sign-off on new documents",
    category: "legal_compliance",
    triggerType: "file_uploaded",
    triggerLabel: "When document is uploaded",
    actionType: "request_approval",
    actionLabel: "request approval",

  },
  {
    id: "legal_approval_ai_output",
    name: "When AI writes content, request attorney review before sending",
    description: "Require human review of all AI-generated legal content",
    category: "legal_compliance",
    triggerType: "column_changed",
    triggerLabel: "When AI output is generated",
    actionType: "request_approval",
    actionLabel: "request attorney review",

    isAI: true,
  },
  {
    id: "legal_approval_escalate",
    name: "When approval is pending for more than 24 hours, escalate to managing partner",
    description: "Escalate overdue approvals to senior leadership",
    category: "legal_compliance",
    triggerType: "due_date_passed",
    triggerLabel: "When approval is overdue",
    actionType: "escalate_review",
    actionLabel: "escalate to partner",

  },
  {
    id: "legal_approved_generate_confirmation",
    name: "When approved by attorney, generate confirmation record",
    description: "Create audit trail when items are approved",
    category: "legal_compliance",
    triggerType: "approval_status_changed",
    triggerLabel: "When approved",
    actionType: "generate_confirmation",
    actionLabel: "create confirmation",

  },
  
  // Compliance & Deadline Management
  {
    id: "legal_deadline_warning",
    name: "When court deadline is approaching, notify attorney and paralegal",
    description: "Alert team about upcoming legal deadlines",
    category: "legal_compliance",
    triggerType: "deadline_warning",
    triggerLabel: "When deadline approaches",
    actionType: "send_notification",
    actionLabel: "notify team",

  },
  {
    id: "legal_compliance_check",
    name: "When matter is marked complete, verify all compliance steps are done",
    description: "Ensure all required steps completed before closing matter",
    category: "legal_compliance",
    triggerType: "status_changed",
    triggerLabel: "When status changes to complete",
    actionType: "log_compliance",
    actionLabel: "verify compliance",

  },
  {
    id: "legal_statute_reminder",
    name: "When statute of limitations date is within 60 days, escalate priority",
    description: "Automatic priority escalation for approaching statute deadlines",
    category: "legal_compliance",
    triggerType: "deadline_warning",
    triggerLabel: "When statute date approaches",
    actionType: "change_priority",
    actionLabel: "escalate priority",

  },
  
  // Document Workflow
  {
    id: "legal_doc_extract_parties",
    name: "When document is uploaded, AI extract party names, case numbers, and dates",
    description: "Automatically extract key information from legal documents",
    category: "legal_compliance",
    triggerType: "file_uploaded",
    triggerLabel: "When document is uploaded",
    actionType: "ai_extract",
    actionLabel: "extract parties and dates",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "legal_doc_categorize",
    name: "When document is uploaded, AI categorize document type",
    description: "Auto-classify pleadings, motions, discovery, correspondence",
    category: "legal_compliance",
    triggerType: "file_uploaded",
    triggerLabel: "When document is uploaded",
    actionType: "ai_categorize",
    actionLabel: "categorize document",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "legal_doc_summarize",
    name: "When pleading is filed, AI summarize key arguments",
    description: "Generate executive summaries of legal filings",
    category: "legal_compliance",
    triggerType: "file_uploaded",
    triggerLabel: "When pleading is uploaded",
    actionType: "ai_summarize",
    actionLabel: "summarize arguments",
    icon: "sparkles",
    isAI: true,
  },
  
  // Client Communication
  {
    id: "legal_client_update_status",
    name: "When case milestone is reached, notify client",
    description: "Keep clients informed of major case developments",
    category: "legal_compliance",
    triggerType: "status_changed",
    triggerLabel: "When milestone reached",
    actionType: "send_notification",
    actionLabel: "notify client",

  },
  {
    id: "legal_billing_time_start",
    name: "When status changes to 'Working', start time tracking",
    description: "Auto-start billable time when work begins",
    category: "legal_compliance",
    triggerType: "status_changed",
    triggerLabel: "When status changes to Working",
    actionType: "start_time_tracking",
    actionLabel: "start time",

  },
  {
    id: "legal_billing_time_stop",
    name: "When status changes to 'Complete' or 'Pending', stop time tracking",
    description: "Auto-stop billable time when work pauses",
    category: "legal_compliance",
    triggerType: "status_changed",
    triggerLabel: "When status changes to Complete",
    actionType: "stop_time_tracking",
    actionLabel: "stop time",

  },
  
  // Quality Control
  {
    id: "legal_qc_proofread",
    name: "When brief is marked ready, AI improve text for grammar and clarity",
    description: "Auto-proofread legal documents before filing",
    category: "legal_compliance",
    triggerType: "status_changed",
    triggerLabel: "When marked ready for filing",
    actionType: "ai_improve",
    actionLabel: "improve text",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "legal_qc_cite_check",
    name: "When citation column is filled, AI verify citation format",
    description: "Validate legal citation formats",
    category: "legal_compliance",
    triggerType: "column_changed",
    triggerLabel: "When citation added",
    actionType: "ai_extract",
    actionLabel: "verify format",
    icon: "sparkles",
    isAI: true,
  },
];

// Legal Compliance Templates (separate for filtering)
const LEGAL_TEMPLATES: AutomationTemplate[] = [
  {
    id: "legal_intake_categorize",
    name: "When new matter is created, AI categorize practice area and assign team",
    description: "Auto-route new matters based on type",
    category: "legal_compliance",
    triggerType: "item_created",
    triggerLabel: "When matter is created",
    actionType: "ai_categorize",
    actionLabel: "categorize and assign",
    icon: "sparkles",
    isAI: true,
  },
  {
    id: "legal_conflict_check",
    name: "When new client added, check for conflicts of interest",
    description: "Automated conflict checking on new matters",
    category: "legal_compliance",
    triggerType: "item_created",
    triggerLabel: "When client is added",
    actionType: "ai_extract",
    actionLabel: "check conflicts",

    isAI: true,
  },
  {
    id: "legal_retainer_reminder",
    name: "When retainer balance is low, notify billing team",
    description: "Monitor retainer balances and alert when low",
    category: "legal_compliance",
    triggerType: "column_changed",
    triggerLabel: "When balance drops below threshold",
    actionType: "send_notification",
    actionLabel: "notify billing",

  },
  {
    id: "legal_privilege_review",
    name: "When document is marked privileged, require attorney confirmation",
    description: "Ensure privilege designations are verified",
    category: "legal_compliance",
    triggerType: "column_changed",
    triggerLabel: "When marked privileged",
    actionType: "request_approval",
    actionLabel: "confirm privilege",

  },
  {
    id: "legal_discovery_deadline",
    name: "When discovery request received, calculate and set response deadline",
    description: "Auto-calculate discovery response deadlines",
    category: "legal_compliance",
    triggerType: "item_created",
    triggerLabel: "When discovery received",
    actionType: "set_date",
    actionLabel: "set deadline",

  },
  {
    id: "legal_motion_response",
    name: "When motion is filed against, calculate opposition deadline",
    description: "Track motion response deadlines automatically",
    category: "legal_compliance",
    triggerType: "item_created",
    triggerLabel: "When motion received",
    actionType: "set_date",
    actionLabel: "set opposition deadline",

  },
  {
    id: "legal_court_hearing_prep",
    name: "When hearing is 7 days away, create preparation checklist",
    description: "Generate hearing prep tasks automatically",
    category: "legal_compliance",
    triggerType: "deadline_warning",
    triggerLabel: "When hearing approaches",
    actionType: "create_subtask",
    actionLabel: "create prep tasks",

  },
  {
    id: "legal_closing_checklist",
    name: "When matter status changes to 'Closing', verify all closing steps",
    description: "Ensure proper matter closing procedures",
    category: "legal_compliance",
    triggerType: "status_changed",
    triggerLabel: "When matter is closing",
    actionType: "log_compliance",
    actionLabel: "verify closing",

  },
];

// Combine all templates
const ALL_TEMPLATES = [...AI_AUTOMATION_TEMPLATES, ...INTEGRATION_TEMPLATES, ...AUTOMATION_TEMPLATES, ...LEGAL_TEMPLATES];

// AI Icon component with gradient background
function AIIcon({ className }: { className?: string }) {
  return (
    <div className={`p-2.5 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 ${className}`}>
      <Sparkles className="h-5 w-5 text-white" />
    </div>
  );
}

// Template card component matching Monday.com style
function TemplateCard({ 
  template, 
  onUse 
}: { 
  template: AutomationTemplate; 
  onUse: (template: AutomationTemplate) => void;
}) {
  const getIcon = () => {
    if (template.isAI || template.icon === "sparkles") {
      return <AIIcon />;
    }
    if (template.icon === "slack") {
      return (
        <div className="p-2.5 rounded-lg bg-white">
          <SiSlack className="h-5 w-5 text-[#4A154B]" />
        </div>
      );
    }
    if (template.icon === "gmail") {
      return (
        <div className="p-2.5 rounded-lg bg-white">
          <SiGmail className="h-5 w-5 text-[#EA4335]" />
        </div>
      );
    }
    if (template.icon === "sms") {
      return (
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
          <Smartphone className="h-5 w-5 text-white" />
        </div>
      );
    }
    return (
      <div className="p-2.5 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600">
        <Zap className="h-5 w-5 text-white" />
      </div>
    );
  };

  // Format the name with bold keywords
  const formatName = (name: string) => {
    // Bold patterns for common keywords
    const patterns = [
      { pattern: /\bcolumn\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bstatus\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bpriority\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bitem\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bbutton\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bemail\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bboard\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bthese instructions\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bLanguage\b/gi, class: "font-semibold text-primary" },
      { pattern: /\beveryone\b/gi, class: "font-semibold text-primary" },
      { pattern: /\burgent\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bhigh\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bstuck\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bsomething\b/gi, class: "font-semibold text-primary" },
      { pattern: /\bcontacts\b/gi, class: "font-semibold text-primary underline decoration-dotted" },
      { pattern: /_+/g, class: "font-semibold text-primary underline" },
    ];
    
    // AI action keywords in gradient
    const aiActions = [
      "use AI",
      "summarize text",
      "categorize",
      "detect language",
      "translate text",
      "detect sentiment",
      "improve text",
      "extract info",
      "write with AI",
    ];
    
    let result = name;
    
    // Replace AI actions with gradient span
    aiActions.forEach(action => {
      const regex = new RegExp(`\\b${action}\\b`, 'gi');
      result = result.replace(regex, `<span class="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent font-semibold">$&</span>`);
    });
    
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return (
    <Card 
      className="bg-card hover:bg-accent/50 transition-colors cursor-pointer border-border/50"
      data-testid={`template-card-${template.id}`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {getIcon()}
          <p className="text-sm leading-relaxed">
            {formatName(template.name)}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => onUse(template)}
          data-testid={`button-use-template-${template.id}`}
        >
          Use template
        </Button>
      </CardContent>
    </Card>
  );
}

// Featured integration card for prominent integrations
function FeaturedIntegrationCard({ 
  template, 
  onUse 
}: { 
  template: AutomationTemplate; 
  onUse: (template: AutomationTemplate) => void;
}) {
  const getIcon = () => {
    if (template.icon === "slack") {
      return (
        <div className="p-3 rounded-lg bg-white shrink-0">
          <SiSlack className="h-6 w-6 text-[#4A154B]" />
        </div>
      );
    }
    if (template.icon === "gmail") {
      return (
        <div className="p-3 rounded-lg bg-white shrink-0">
          <SiGmail className="h-6 w-6 text-[#EA4335]" />
        </div>
      );
    }
    if (template.icon === "sms") {
      return (
        <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shrink-0">
          <Smartphone className="h-6 w-6 text-white" />
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors"
      data-testid={`featured-integration-${template.id}`}
    >
      {getIcon()}
      <p className="flex-1 text-sm font-medium">
        {template.name.replace(/_+/g, (match) => (
          <span className="underline decoration-dotted">{match}</span>
        ) as unknown as string)}
      </p>
      <Button 
        size="sm" 
        onClick={() => onUse(template)}
        data-testid={`button-add-${template.id}`}
      >
        Add
      </Button>
      <button className="text-xs text-primary hover:underline">Learn more</button>
    </div>
  );
}

// AI Automation Builder Component
function AIAutomationBuilder({ 
  onBuildAutomation,
  suggestedAutomations,
  hasBoardSelected
}: { 
  onBuildAutomation: (prompt: string) => void;
  suggestedAutomations: Array<{ prompt: string; description: string; confidence: number }>;
  hasBoardSelected: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);

  const handleBuild = () => {
    if (!prompt.trim()) return;
    setIsBuilding(true);
    onBuildAutomation(prompt);
    setTimeout(() => setIsBuilding(false), 1500);
  };

  const handleUseSuggestion = (suggestion: { prompt: string }) => {
    setPrompt(suggestion.prompt);
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shrink-0">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Automation Builder
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Describe what you want to automate in plain language. AI will analyze your request and create a draft automation that you can customize.
              </p>
            </div>

            {!hasBoardSelected && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Please select a board first to create automations
              </div>
            )}
            
            <div className="flex gap-2">
              <Textarea
                placeholder="Example: When a case status changes to 'Ready for Review', notify the senior attorney and request their approval..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={!hasBoardSelected}
                data-testid="input-ai-automation-prompt"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleBuild}
                disabled={!prompt.trim() || isBuilding || !hasBoardSelected}
                className="gap-2"
                data-testid="button-build-automation"
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Build Automation Draft
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Creates a draft automation for you to review and customize
              </span>
            </div>

            {suggestedAutomations.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Suggested Automations Based on Your Patterns
                </h4>
                <div className="space-y-2">
                  {suggestedAutomations.map((suggestion, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      data-testid={`suggestion-${idx}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{suggestion.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{suggestion.prompt}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {Math.round(suggestion.confidence * 100)}% match
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="shrink-0"
                        onClick={() => handleUseSuggestion(suggestion)}
                        disabled={!hasBoardSelected}
                        data-testid={`button-use-suggestion-${idx}`}
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AutomationsPage() {
  const { toast } = useToast();
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("templates");
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [workflowInput, setWorkflowInput] = useState("");
  
  // Simulated pattern-based suggestions (in production, this would come from analyzing user behavior)
  const [suggestedAutomations] = useState([
    {
      prompt: "When a task is marked complete, notify the client via email",
      description: "You frequently update clients after completing tasks",
      confidence: 0.87,
    },
    {
      prompt: "When a deadline is within 3 days, set priority to high and notify the team",
      description: "You often manually escalate tasks as deadlines approach",
      confidence: 0.72,
    },
    {
      prompt: "When a document is uploaded, extract key dates and parties using AI",
      description: "You regularly extract information from uploaded documents",
      confidence: 0.65,
    },
  ]);
  
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    triggerType: "item_created" as keyof typeof TRIGGER_TYPES,
    triggerValue: "",
    actionType: "change_status" as keyof typeof ACTION_TYPES,
    actionConfig: {} as Record<string, any>,
  });

  const filteredTemplates = ALL_TEMPLATES.filter((template) => {
    const matchesSearch = templateSearchQuery
      ? template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(templateSearchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory ? template.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const aiTemplates = filteredTemplates.filter(t => t.category === "ai_powered");
  const integrationTemplates = filteredTemplates.filter(t => t.category === "integrations");
  const otherTemplates = filteredTemplates.filter(t => !["ai_powered", "integrations"].includes(t.category));

  const handleUseTemplate = (template: AutomationTemplate) => {
    setRuleForm({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType as keyof typeof TRIGGER_TYPES,
      triggerValue: "",
      actionType: template.actionType as keyof typeof ACTION_TYPES,
      actionConfig: {},
    });
    setShowTemplatesDialog(false);
    setSelectedCategory(null);
    setTemplateSearchQuery("");
    setShowCreateDialog(true);
  };

  const handleOpenTemplates = () => {
    setSelectedCategory(null);
    setTemplateSearchQuery("");
    setActiveTab("templates");
    setShowTemplatesDialog(true);
  };

  // AI Automation Builder handler
  const handleBuildFromAI = (prompt: string) => {
    // Ensure a board is selected
    if (!selectedBoardId) {
      toast({
        title: "No board selected",
        description: "Please select a board first to create automations.",
        variant: "destructive",
      });
      return;
    }

    // Parse the prompt to extract trigger and action
    const promptLower = prompt.toLowerCase();
    
    // Detect trigger type from prompt
    let detectedTrigger: keyof typeof TRIGGER_TYPES = "item_created";
    let detectedAction: keyof typeof ACTION_TYPES = "send_notification";
    
    if (promptLower.includes("status change") || promptLower.includes("when status")) {
      detectedTrigger = "status_changed";
    } else if (promptLower.includes("deadline") || promptLower.includes("due date")) {
      detectedTrigger = "deadline_warning";
    } else if (promptLower.includes("document") || promptLower.includes("file") || promptLower.includes("upload")) {
      detectedTrigger = "file_uploaded";
    } else if (promptLower.includes("approval") || promptLower.includes("approved") || promptLower.includes("review")) {
      detectedTrigger = "approval_status_changed";
    } else if (promptLower.includes("priority")) {
      detectedTrigger = "priority_changed";
    } else if (promptLower.includes("assigned") || promptLower.includes("assign")) {
      detectedTrigger = "assigned";
    } else if (promptLower.includes("created") || promptLower.includes("new item") || promptLower.includes("new task")) {
      detectedTrigger = "item_created";
    }
    
    // Detect action type from prompt
    if (promptLower.includes("notify") || promptLower.includes("alert") || promptLower.includes("send notification")) {
      detectedAction = "send_notification";
    } else if (promptLower.includes("approval") || promptLower.includes("review") || promptLower.includes("attorney")) {
      detectedAction = "request_approval";
    } else if (promptLower.includes("email")) {
      detectedAction = "send_email";
    } else if (promptLower.includes("extract") || promptLower.includes("ai extract")) {
      detectedAction = "ai_extract";
    } else if (promptLower.includes("summarize") || promptLower.includes("summary")) {
      detectedAction = "ai_summarize";
    } else if (promptLower.includes("categorize") || promptLower.includes("classify")) {
      detectedAction = "ai_categorize";
    } else if (promptLower.includes("priority") && promptLower.includes("change")) {
      detectedAction = "change_priority";
    } else if (promptLower.includes("status") && (promptLower.includes("change") || promptLower.includes("set"))) {
      detectedAction = "change_status";
    } else if (promptLower.includes("slack")) {
      detectedAction = "send_slack";
    } else if (promptLower.includes("time tracking") || promptLower.includes("start time")) {
      detectedAction = "start_time_tracking";
    }
    
    // Create the automation rule
    setRuleForm({
      name: prompt.slice(0, 100) + (prompt.length > 100 ? "..." : ""),
      description: `AI-generated automation: ${prompt}`,
      triggerType: detectedTrigger,
      triggerValue: "",
      actionType: detectedAction,
      actionConfig: {},
    });
    
    setShowAIBuilder(false);
    setShowCreateDialog(true);
    
    toast({
      title: "Automation built by AI",
      description: `Created automation with trigger "${TRIGGER_TYPES[detectedTrigger]?.label}" and action "${ACTION_TYPES[detectedAction]?.label}". Review and customize as needed.`,
    });
  };

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
  });

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/boards", selectedBoardId, "automations"],
    enabled: !!selectedBoardId,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleForm) => {
      const res = await apiRequest("POST", `/api/boards/${selectedBoardId}/automations`, {
        boardId: selectedBoardId,
        name: data.name,
        description: data.description,
        isActive: true,
        triggerType: data.triggerType,
        triggerValue: data.triggerValue || undefined,
        conditions: [],
        actionType: data.actionType,
        actionConfig: data.actionConfig,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", selectedBoardId, "automations"] });
      setShowCreateDialog(false);
      setRuleForm({ name: "", description: "", triggerType: "item_created", triggerValue: "", actionType: "change_status", actionConfig: {} });
      toast({ title: "Automation created", description: "Your new automation rule is now active." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create automation.", variant: "destructive" });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AutomationRule> }) => {
      const res = await apiRequest("PATCH", `/api/automations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", selectedBoardId, "automations"] });
      toast({ title: "Automation updated", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update automation.", variant: "destructive" });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", selectedBoardId, "automations"] });
      setSelectedRule(null);
      toast({ title: "Automation deleted", description: "The automation rule has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete automation.", variant: "destructive" });
    }
  });

  const toggleRule = (rule: AutomationRule) => {
    updateRuleMutation.mutate({ id: rule.id, data: { isActive: !rule.isActive } });
  };

  const renderActionConfig = () => {
    switch (ruleForm.actionType) {
      case "change_status":
        return (
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select 
              value={ruleForm.actionConfig.status || ""} 
              onValueChange={v => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, status: v } }))}
            >
              <SelectTrigger data-testid="select-action-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "change_priority":
        return (
          <div className="space-y-2">
            <Label>New Priority</Label>
            <Select 
              value={ruleForm.actionConfig.priority || ""} 
              onValueChange={v => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, priority: v } }))}
            >
              <SelectTrigger data-testid="select-action-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "send_notification":
      case "send_slack":
      case "send_email":
        return (
          <div className="space-y-2">
            <Label>Notification Message</Label>
            <Textarea 
              value={ruleForm.actionConfig.message || ""}
              onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, message: e.target.value } }))}
              placeholder="Enter notification message..."
              data-testid="input-action-message"
            />
          </div>
        );
      case "send_sms":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number(s)</Label>
              <Input 
                value={ruleForm.actionConfig.phoneNumbers || ""}
                onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, phoneNumbers: e.target.value } }))}
                placeholder="+1234567890"
                data-testid="input-action-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                value={ruleForm.actionConfig.message || ""}
                onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, message: e.target.value } }))}
                placeholder="Enter SMS message..."
                data-testid="input-action-sms-message"
              />
            </div>
          </div>
        );
      case "trigger_webhook":
        return (
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input 
              value={ruleForm.actionConfig.webhookUrl || ""}
              onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, webhookUrl: e.target.value } }))}
              placeholder="https://..."
              data-testid="input-action-webhook"
            />
          </div>
        );
      case "ai_fill_column":
      case "ai_summarize":
      case "ai_categorize":
      case "ai_detect_language":
      case "ai_translate":
      case "ai_sentiment":
      case "ai_improve":
      case "ai_extract":
      case "ai_write":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source Column</Label>
              <Input 
                value={ruleForm.actionConfig.sourceColumn || ""}
                onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, sourceColumn: e.target.value } }))}
                placeholder="Column to analyze..."
                data-testid="input-ai-source"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Column</Label>
              <Input 
                value={ruleForm.actionConfig.targetColumn || ""}
                onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, targetColumn: e.target.value } }))}
                placeholder="Column to update..."
                data-testid="input-ai-target"
              />
            </div>
            {(ruleForm.actionType === "ai_translate") && (
              <div className="space-y-2">
                <Label>Target Language</Label>
                <Select 
                  value={ruleForm.actionConfig.targetLanguage || ""} 
                  onValueChange={v => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, targetLanguage: v } }))}
                >
                  <SelectTrigger data-testid="select-target-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(ruleForm.actionType === "ai_categorize" || ruleForm.actionType === "ai_extract") && (
              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea 
                  value={ruleForm.actionConfig.instructions || ""}
                  onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, instructions: e.target.value } }))}
                  placeholder="Describe what to extract or how to categorize..."
                  data-testid="input-ai-instructions"
                />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="page-automations">
      <div className="flex items-center justify-between p-4 border-b gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-muted-foreground">AI-powered workflow automation</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
            <SelectTrigger className="w-[200px]" data-testid="select-board">
              <SelectValue placeholder="Select board" />
            </SelectTrigger>
            <SelectContent>
              {boards.map(board => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline"
            onClick={() => setShowAIBuilder(!showAIBuilder)}
            className="gap-2"
            data-testid="button-ai-builder"
          >
            <Bot className="h-4 w-4" />
            AI Builder
          </Button>

          {selectedBoardId && (
            <>
            <Button 
              variant="outline"
              onClick={handleOpenTemplates}
              data-testid="button-add-automation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-automation">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Automation</DialogTitle>
                  <DialogDescription>Set up a new automation rule for this board.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input 
                      value={ruleForm.name}
                      onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Auto-assign urgent tasks"
                      data-testid="input-rule-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={ruleForm.description}
                      onChange={e => setRuleForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="What does this automation do?"
                      data-testid="input-rule-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>When (Trigger)</Label>
                      <Select 
                        value={ruleForm.triggerType} 
                        onValueChange={v => setRuleForm(p => ({ ...p, triggerType: v as any }))}
                      >
                        <SelectTrigger data-testid="select-trigger-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRIGGER_TYPES).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {TRIGGER_TYPES[ruleForm.triggerType]?.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Then (Action)</Label>
                      <Select 
                        value={ruleForm.actionType} 
                        onValueChange={v => setRuleForm(p => ({ ...p, actionType: v as any, actionConfig: {} }))}
                      >
                        <SelectTrigger data-testid="select-action-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="change_status">Change Status</SelectItem>
                          <SelectItem value="change_priority">Change Priority</SelectItem>
                          <SelectItem value="move_to_group">Move to Group</SelectItem>
                          <SelectItem value="assign_person">Assign Person</SelectItem>
                          <SelectItem value="send_notification">Send Notification</SelectItem>
                          <SelectItem value="update_field">Update Field</SelectItem>
                          <SelectItem value="trigger_webhook">Trigger Webhook</SelectItem>
                          <SelectItem value="create_item">Create Item</SelectItem>
                          <SelectItem value="ai_fill_column">AI: Fill Column</SelectItem>
                          <SelectItem value="ai_summarize">AI: Summarize</SelectItem>
                          <SelectItem value="ai_categorize">AI: Categorize</SelectItem>
                          <SelectItem value="ai_translate">AI: Translate</SelectItem>
                          <SelectItem value="ai_sentiment">AI: Detect Sentiment</SelectItem>
                          <SelectItem value="ai_improve">AI: Improve Text</SelectItem>
                          <SelectItem value="ai_extract">AI: Extract Info</SelectItem>
                          <SelectItem value="ai_write">AI: Write</SelectItem>
                          <SelectItem value="send_slack">Send Slack Message</SelectItem>
                          <SelectItem value="send_sms">Send SMS</SelectItem>
                          <SelectItem value="send_email">Send Email</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {ACTION_TYPES[ruleForm.actionType]?.description}
                      </p>
                    </div>
                  </div>

                  {ruleForm.triggerType === "status_changed" && (
                    <div className="space-y-2">
                      <Label>When status changes to</Label>
                      <Select 
                        value={ruleForm.triggerValue} 
                        onValueChange={v => setRuleForm(p => ({ ...p, triggerValue: v }))}
                      >
                        <SelectTrigger data-testid="select-trigger-value">
                          <SelectValue placeholder="Any status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="pending_review">Pending Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {renderActionConfig()}
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createRuleMutation.mutate(ruleForm)}
                    disabled={!ruleForm.name || createRuleMutation.isPending}
                    data-testid="button-submit-automation"
                  >
                    {createRuleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Automation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Templates Dialog */}
            <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl">Automation Center</DialogTitle>
                  <DialogDescription>Choose from {ALL_TEMPLATES.length}+ automation recipes including AI-powered and integration templates</DialogDescription>
                </DialogHeader>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    placeholder="Search automations..."
                    className="pl-10"
                    data-testid="input-search-templates"
                  />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
                  <TabsList className="w-full justify-start mb-4">
                    <TabsTrigger value="templates" className="gap-2" data-testid="tab-templates">
                      <LayoutGrid className="h-4 w-4" />
                      Templates
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-2" data-testid="tab-ai">
                      <Sparkles className="h-4 w-4" />
                      AI-powered
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2" data-testid="tab-integrations">
                      <Globe className="h-4 w-4" />
                      Integrations
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1">
                    <TabsContent value="templates" className="mt-0 space-y-6">
                      {/* Featured Integrations */}
                      {integrationTemplates.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-muted-foreground">Featured Integrations</h3>
                          <div className="space-y-2">
                            {integrationTemplates.slice(0, 3).map((template) => (
                              <FeaturedIntegrationCard 
                                key={template.id} 
                                template={template} 
                                onUse={handleUseTemplate}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Other Categories */}
                      {AUTOMATION_CATEGORIES.filter(c => !["ai_powered", "integrations"].includes(c.id)).map((category) => {
                        const categoryTemplates = otherTemplates.filter(t => t.category === category.id);
                        if (categoryTemplates.length === 0) return null;
                        
                        const CategoryIcon = category.icon;
                        
                        return (
                          <div key={category.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${category.color}`} />
                              <h3 className="text-sm font-semibold">{category.name}</h3>
                              <Badge variant="secondary" className="text-xs">{categoryTemplates.length}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {categoryTemplates.slice(0, 6).map((template) => (
                                <TemplateCard 
                                  key={template.id} 
                                  template={template} 
                                  onUse={handleUseTemplate}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="ai" className="mt-0 space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-400/10 border border-purple-500/20">
                        <AIIcon />
                        <div>
                          <h3 className="font-semibold">AI-powered Automations</h3>
                          <p className="text-sm text-muted-foreground">Let AI handle text analysis, summarization, translation, and more</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {aiTemplates.map((template) => (
                          <TemplateCard 
                            key={template.id} 
                            template={template} 
                            onUse={handleUseTemplate}
                          />
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="integrations" className="mt-0 space-y-4">
                      {/* Slack Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white">
                            <SiSlack className="h-5 w-5 text-[#4A154B]" />
                          </div>
                          <h3 className="font-semibold">Slack</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {integrationTemplates.filter(t => t.icon === "slack").map((template) => (
                            <TemplateCard 
                              key={template.id} 
                              template={template} 
                              onUse={handleUseTemplate}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Gmail Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white">
                            <SiGmail className="h-5 w-5 text-[#EA4335]" />
                          </div>
                          <h3 className="font-semibold">Gmail</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {integrationTemplates.filter(t => t.icon === "gmail").map((template) => (
                            <TemplateCard 
                              key={template.id} 
                              template={template} 
                              onUse={handleUseTemplate}
                            />
                          ))}
                        </div>
                      </div>

                      {/* SMS Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                            <Smartphone className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="font-semibold">SMS / Twilio</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {integrationTemplates.filter(t => t.icon === "sms").map((template) => (
                            <TemplateCard 
                              key={template.id} 
                              template={template} 
                              onUse={handleUseTemplate}
                            />
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>

                <DialogFooter className="pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowTemplatesDialog(false)}>Cancel</Button>
                  <Button onClick={() => { setShowTemplatesDialog(false); setShowCreateDialog(true); }}>
                    Create Custom Automation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          )}
        </div>
      </div>

      {/* AI Automation Builder */}
      {showAIBuilder && (
        <div className="p-4 border-b bg-muted/30">
          <AIAutomationBuilder 
            onBuildAutomation={handleBuildFromAI}
            suggestedAutomations={suggestedAutomations}
            hasBoardSelected={!!selectedBoardId}
          />
        </div>
      )}

      <div className="border-b overflow-auto" data-testid="section-ai-workflows">
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1e293b 0%, #172554 50%, #312e81 100%)" }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4), transparent)" }} />
            <div className="absolute bottom-10 right-20 w-60 h-60 rounded-full" style={{ background: "radial-gradient(circle, rgba(20,184,166,0.3), transparent)" }} />
          </div>
          <div className="relative px-6 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-md" style={{ backgroundColor: "rgba(99,102,241,0.2)" }}>
                  <Workflow className="h-5 w-5 text-indigo-300" />
                </div>
                <Badge variant="secondary" className="text-xs text-indigo-200" style={{ backgroundColor: "rgba(99,102,241,0.25)" }}>
                  AI Workflows
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-workflows-title">
                Orchestrate your work with AI workflows
              </h2>
              <p className="text-sm text-slate-300 mb-5 max-w-lg">
                Combine multiple automations into intelligent workflows that adapt to your legal practice. Describe what you need and let AI build it.
              </p>

              <div className="flex items-center gap-2 max-w-xl mb-6">
                <div className="relative flex-1 flex items-center bg-white/10 border border-white/20 rounded-md backdrop-blur-sm">
                  <Sparkles className="absolute left-3 h-4 w-4 text-indigo-300" />
                  <Input
                    value={workflowInput}
                    onChange={(e) => setWorkflowInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && workflowInput.trim()) { handleBuildFromAI(workflowInput); setWorkflowInput(""); } }}
                    placeholder="Describe your workflow in plain English..."
                    className="border-0 bg-transparent text-white placeholder:text-slate-400 pl-10 focus-visible:ring-0 shadow-none"
                    data-testid="input-workflow-prompt"
                  />
                </div>
                <Button
                  onClick={() => { if (workflowInput.trim()) { handleBuildFromAI(workflowInput); setWorkflowInput(""); } }}
                  disabled={!workflowInput.trim()}
                  className="gap-2 shrink-0"
                  data-testid="button-create-workflow"
                >
                  <Send className="h-4 w-4" />
                  Build
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="section-workflow-templates">
                {[
                  { icon: MessageSquare, title: "Meeting Summarizer", desc: "Record, transcribe, and summarize meeting notes automatically", color: "#6366f1" },
                  { icon: Smile, title: "Feedback Sentiment", desc: "Analyze client feedback, detect sentiment, and route responses", color: "#ec4899" },
                  { icon: BarChart3, title: "Case Intake Triage", desc: "Categorize new cases, assign teams, and set priorities", color: "#f59e0b" },
                  { icon: RefreshCw, title: "Weekly Case Digest", desc: "Compile weekly updates across all active matters", color: "#22c55e" },
                ].map((template, i) => (
                  <button
                    key={i}
                    onClick={() => handleBuildFromAI(template.title + ": " + template.desc)}
                    className="p-3 rounded-md text-left"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    data-testid={`button-workflow-template-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: `${template.color}25` }}>
                        <template.icon className="h-4 w-4" style={{ color: template.color }} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white mb-0.5">{template.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{template.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!selectedBoardId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Zap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a Board</h2>
            <p className="text-muted-foreground">Choose a board to manage its automations</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <AIIcon className="mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Automations Yet</h2>
            <p className="text-muted-foreground mb-6">Create your first automation to save time on repetitive tasks. Use AI-powered templates to analyze, categorize, and transform your data automatically.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleOpenTemplates} data-testid="button-browse-templates">
                Browse Templates
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Create Automation
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 grid gap-4">
            {rules.map(rule => {
              const TriggerIcon = TRIGGER_TYPES[rule.triggerType as keyof typeof TRIGGER_TYPES]?.icon || Zap;
              const ActionIcon = ACTION_TYPES[rule.actionType as keyof typeof ACTION_TYPES]?.icon || Play;
              const isAI = rule.actionType.startsWith("ai_");
              
              return (
                <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""} data-testid={`automation-card-${rule.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {isAI ? (
                          <AIIcon />
                        ) : (
                          <div className={`p-2 rounded-lg ${rule.isActive ? "bg-primary/10" : "bg-muted"}`}>
                            <Zap className={`h-5 w-5 ${rule.isActive ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{rule.name}</CardTitle>
                          {rule.description && (
                            <CardDescription className="text-xs mt-0.5">{rule.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={rule.isActive}
                          onCheckedChange={() => toggleRule(rule)}
                          data-testid={`toggle-automation-${rule.id}`}
                        />
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          data-testid={`button-delete-${rule.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <TriggerIcon className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          {TRIGGER_TYPES[rule.triggerType as keyof typeof TRIGGER_TYPES]?.label || rule.triggerType}
                        </span>
                        {rule.triggerValue && (
                          <Badge variant="secondary" className="text-xs">{rule.triggerValue}</Badge>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2 flex-1">
                        {isAI ? (
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        ) : (
                          <ActionIcon className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm font-medium">
                          {ACTION_TYPES[rule.actionType as keyof typeof ACTION_TYPES]?.label || rule.actionType}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {rule.runCount} runs
                        </span>
                        {rule.lastRun && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last: {new Date(rule.lastRun).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? (isAI ? "AI Active" : "Active") : "Paused"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Plus,
  Eye,
  Share2,
  ArrowLeft,
  ClipboardList,
  CheckCircle,
  PenLine,
  Archive,
  BarChart3,
  Shield,
  Lock,
} from "lucide-react";

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  status: "active" | "draft" | "archived";
  responses: number;
}

const formTemplates: FormTemplate[] = [
  {
    id: "general-intake",
    name: "General Intake Form",
    description: "Comprehensive new client questionnaire with privacy policy and contact information",
    status: "active",
    responses: 12,
  },
  {
    id: "personal-injury",
    name: "Personal Injury Intake",
    description: "Specialized intake for personal injury and accident cases",
    status: "active",
    responses: 8,
  },
  {
    id: "family-law",
    name: "Family Law Consultation",
    description: "Intake form for divorce, custody, and family matters",
    status: "active",
    responses: 5,
  },
  {
    id: "criminal-defense",
    name: "Criminal Defense Intake",
    description: "Initial questionnaire for criminal defense representation",
    status: "draft",
    responses: 0,
  },
  {
    id: "estate-planning",
    name: "Estate Planning Intake",
    description: "Information gathering for wills, trusts, and estate planning",
    status: "active",
    responses: 3,
  },
  {
    id: "employment-law",
    name: "Employment Law Intake",
    description: "Workplace discrimination, wrongful termination inquiries",
    status: "draft",
    responses: 0,
  },
];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Active", icon: CheckCircle, variant: "default" },
  draft: { label: "Draft", icon: PenLine, variant: "secondary" },
  archived: { label: "Archived", icon: Archive, variant: "outline" },
};

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

export default function IntakeFormsPage() {
  const [view, setView] = useState<"list" | "preview">("list");
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);

  const handlePreview = (template: FormTemplate) => {
    setPreviewTemplate(template);
    setView("preview");
  };

  const handleBackToList = () => {
    setView("list");
    setPreviewTemplate(null);
  };

  if (view === "preview" && previewTemplate) {
    return <FormPreview template={previewTemplate} onBack={handleBackToList} />;
  }

  return (
    <div className="flex flex-col h-full p-3 md:p-6 space-y-4 md:space-y-6 overflow-y-auto" data-testid="page-intake-forms">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
              Client Intake Forms
            </h1>
            <p className="text-muted-foreground" data-testid="text-page-subtitle">
              Manage intake questionnaires for new client onboarding
            </p>
          </div>
        </div>
        <Button data-testid="button-create-form">
          <Plus className="h-4 w-4 mr-1" />
          Create Form
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {formTemplates.map((template) => {
          const statusCfg = STATUS_CONFIG[template.status];
          const StatusIcon = statusCfg.icon;

          return (
            <Card
              key={template.id}
              className="hover-elevate"
              data-testid={`card-template-${template.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <CardTitle className="text-base truncate" data-testid={`text-template-name-${template.id}`}>
                      {template.name}
                    </CardTitle>
                  </div>
                  <Badge variant={statusCfg.variant} className="shrink-0 gap-1" data-testid={`badge-status-${template.id}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </Badge>
                </div>
                <CardDescription data-testid={`text-template-desc-${template.id}`}>
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`text-responses-${template.id}`}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>{template.responses} {template.responses === 1 ? "response" : "responses"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template)}
                      data-testid={`button-preview-${template.id}`}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-share-${template.id}`}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FormPreview({ template, onBack }: { template: FormTemplate; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="page-form-preview">
      <div className="flex items-center justify-between gap-4 p-4 border-b shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-to-forms">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-preview-title">{template.name}</h2>
            <p className="text-sm text-muted-foreground">Form Preview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3 w-3" />
            Preview Mode
          </Badge>
          <Button variant="outline" onClick={onBack} data-testid="button-back-to-forms-text">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to forms
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-3 md:p-6 pb-16">
          <Card className="overflow-visible">
            <CardContent className="p-8 space-y-8">
              <div className="text-center space-y-1" data-testid="section-firm-header">
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-firm-name">Synergy Law PLLC</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-firm-address-1">2825 E Cottonwood Parkway, Ste 500</p>
                <p className="text-sm text-muted-foreground" data-testid="text-firm-address-2">Salt Lake City, UT 84117</p>
              </div>

              <Separator />

              <div className="space-y-4" data-testid="section-privacy-policy">
                <p className="text-sm leading-relaxed" data-testid="text-privacy-intro">
                  Thank you so much for contacting our law office! Please read the privacy policy below, and then fill out this form in its entirety prior to our consultation.
                </p>

                <div className="space-y-3 rounded-md border p-4 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm" data-testid="text-privacy-heading">Privacy Policy</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-privacy-body">
                    All information provided in this intake form is kept strictly confidential and is protected by attorney-client privilege. Our website and forms use SSL encryption to ensure your data is transmitted securely. We do not share your personal information with third parties without your explicit consent.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span data-testid="text-ssl-notice">Secured with SSL encryption</span>
                  </div>
                </div>

                <div className="rounded-md border p-4 space-y-2">
                  <h4 className="font-semibold text-sm" data-testid="text-ssn-heading">Social Security Number Usage</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ssn-body">
                    Your Social Security Number may be requested for the following purposes only:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li data-testid="text-ssn-use-1">Initial service and identity verification</li>
                    <li data-testid="text-ssn-use-2">Court orders requiring identification</li>
                    <li data-testid="text-ssn-use-3">Required government and regulatory reports</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="space-y-6" data-testid="section-contact-info">
                <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-contact-heading">
                  <FileText className="h-4 w-4 text-primary" />
                  Contact Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label data-testid="label-prefix">Prefix</Label>
                    <Select disabled>
                      <SelectTrigger data-testid="select-prefix">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mr">Mr.</SelectItem>
                        <SelectItem value="mrs">Mrs.</SelectItem>
                        <SelectItem value="ms">Ms.</SelectItem>
                        <SelectItem value="dr">Dr.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label data-testid="label-first-name">First name *</Label>
                    <Input placeholder="First name" disabled data-testid="input-first-name" />
                  </div>
                  <div className="space-y-2">
                    <Label data-testid="label-middle-name">Middle name</Label>
                    <Input placeholder="Middle name" disabled data-testid="input-middle-name" />
                  </div>
                  <div className="space-y-2">
                    <Label data-testid="label-last-name">Last name *</Label>
                    <Input placeholder="Last name" disabled data-testid="input-last-name" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label data-testid="label-email">Email *</Label>
                    <Input type="email" placeholder="email@example.com" disabled data-testid="input-email" />
                    <p className="text-xs text-muted-foreground">Required for public form submission</p>
                  </div>
                  <div className="space-y-2">
                    <Label data-testid="label-phone">Phone number</Label>
                    <Input type="tel" placeholder="(555) 555-5555" disabled data-testid="input-phone" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label data-testid="label-street">Street address</Label>
                  <Input placeholder="123 Main Street" disabled data-testid="input-street" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label data-testid="label-city">City</Label>
                    <Input placeholder="City" disabled data-testid="input-city" />
                  </div>
                  <div className="space-y-2">
                    <Label data-testid="label-state">State/Province</Label>
                    <Select disabled>
                      <SelectTrigger data-testid="select-state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state.toLowerCase().replace(/\s/g, "-")}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label data-testid="label-zip">Zip/Postal code</Label>
                    <Input placeholder="00000" disabled data-testid="input-zip" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4" data-testid="section-preferred-contact">
                <Label className="text-sm font-semibold" data-testid="label-preferred-contact">Preferred Contact Method</Label>
                <Select disabled>
                  <SelectTrigger data-testid="select-preferred-contact">
                    <SelectValue placeholder="Select preferred contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="mail">Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-gender">
                <Label className="text-sm font-semibold" data-testid="label-gender">Gender</Label>
                <RadioGroup disabled className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="gender-male" data-testid="radio-gender-male" />
                    <Label htmlFor="gender-male" className="font-normal cursor-pointer">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="gender-female" data-testid="radio-gender-female" />
                    <Label htmlFor="gender-female" className="font-normal cursor-pointer">Female</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-ssn">
                <Label className="text-sm font-semibold" data-testid="label-ssn">Social Security Number</Label>
                <Input placeholder="XXX-XX-XXXX" disabled data-testid="input-ssn" />
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-drivers-license">
                <Label className="text-sm font-semibold" data-testid="label-drivers-license">Driver's License Number</Label>
                <Input placeholder="Enter driver's license number" disabled data-testid="input-drivers-license" />
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-marital-status">
                <Label className="text-sm font-semibold" data-testid="label-marital-status">Marital Status</Label>
                <RadioGroup disabled className="flex flex-wrap gap-4">
                  {["Single", "Married", "Separated", "Divorced", "Widowed"].map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={status.toLowerCase()}
                        id={`marital-${status.toLowerCase()}`}
                        data-testid={`radio-marital-${status.toLowerCase()}`}
                      />
                      <Label htmlFor={`marital-${status.toLowerCase()}`} className="font-normal cursor-pointer">
                        {status}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-employment">
                <Label className="text-sm font-semibold" data-testid="label-employment">Are you currently employed?</Label>
                <RadioGroup disabled className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="employed-yes" data-testid="radio-employed-yes" />
                    <Label htmlFor="employed-yes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="employed-no" data-testid="radio-employed-no" />
                    <Label htmlFor="employed-no" className="font-normal cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-referral">
                <Label className="text-sm font-semibold" data-testid="label-referral">How were you referred to our law firm?</Label>
                <RadioGroup disabled className="space-y-2">
                  {[
                    { value: "friend-family", label: "Friend or family member" },
                    { value: "attorney", label: "Another attorney" },
                    { value: "online", label: "Online search or lawyer directory website" },
                    { value: "physical-ad", label: "Billboard, bus stop, phone book, newspaper, or other physical advertisement" },
                    { value: "broadcast-ad", label: "Radio or TV advertisement" },
                    { value: "bar-association", label: "Bar Association" },
                    { value: "other", label: "Other" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={option.value}
                        id={`referral-${option.value}`}
                        data-testid={`radio-referral-${option.value}`}
                      />
                      <Label htmlFor={`referral-${option.value}`} className="font-normal cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-legal-fees">
                <Label className="text-sm font-semibold" data-testid="label-legal-fees">
                  If our law firm ends up representing you in this matter, will you be the person who pays the legal fees?
                </Label>
                <RadioGroup disabled className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="fees-yes" data-testid="radio-fees-yes" />
                    <Label htmlFor="fees-yes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="fees-no" data-testid="radio-fees-no" />
                    <Label htmlFor="fees-no" className="font-normal cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-privacy-ack">
                <Label className="text-sm font-semibold" data-testid="label-privacy-ack">
                  Privacy Acknowledgment
                </Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By typing your full legal name below, you acknowledge that you have read and agree to the privacy policy stated above, and that the information you have provided is true and accurate to the best of your knowledge.
                </p>
                <Textarea
                  placeholder="Type your full legal name"
                  disabled
                  className="resize-none"
                  data-testid="textarea-privacy-ack"
                />
              </div>

              <Separator />

              <div className="text-center space-y-3 py-4" data-testid="section-thank-you">
                <CheckCircle className="h-8 w-8 text-primary mx-auto" />
                <h3 className="text-lg font-semibold" data-testid="text-thank-you-heading">THANK YOU</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto" data-testid="text-thank-you-body">
                  Thank you so much for completing this intake questionnaire. The information you have provided will help us better understand your situation and prepare for our consultation. A member of our team will be in touch with you shortly to schedule your appointment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="p-6 flex items-center justify-center h-full">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is coming soon. Check back later for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function DocumentsPage() {
  return (
    <PlaceholderPage
      title="Documents"
      description="Access and organize legal documents"
    />
  );
}

export function TimeTrackingPage() {
  return (
    <PlaceholderPage
      title="Time Tracking"
      description="Log and manage billable hours"
    />
  );
}

export function CalendarPage() {
  return (
    <PlaceholderPage
      title="Calendar"
      description="Schedule meetings and deadlines"
    />
  );
}

export function ApprovalsPage() {
  return (
    <PlaceholderPage
      title="Approvals"
      description="Review and approve documents"
    />
  );
}


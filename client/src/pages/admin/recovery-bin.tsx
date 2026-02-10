import { Trash2, RotateCcw, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecoveryBinPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-recovery-bin-title">
          Recovery Bin
        </h1>
        <p className="text-muted-foreground mt-1">
          Restore deleted items and recover lost data
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Recovery Bin
              </CardTitle>
              <Badge variant="secondary" data-testid="badge-coming-soon">
                Coming Soon
              </Badge>
            </div>
          </div>
          <CardDescription>
            The Recovery Bin allows you to restore recently deleted items including
            matters, documents, tasks, and other data. Deleted items are retained
            for 30 days before permanent removal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-md p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">How it works</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Deleted items appear here for up to 30 days</li>
                <li>You can restore items to their original location</li>
                <li>Permanently deleted items cannot be recovered</li>
                <li>Only admins can access and manage the Recovery Bin</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Trash2 className="h-12 w-12 mb-4" data-testid="icon-empty-state" />
          <p className="text-lg font-medium" data-testid="text-empty-state">
            No deleted items found
          </p>
          <p className="text-sm mt-1">
            Items you delete will appear here for recovery
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
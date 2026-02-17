import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  FileUp,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface MatterRecord {
  id: string;
  name: string;
  caseNumber?: string | null;
}

interface ValidationResult {
  valid: boolean;
  entityCounts: Record<string, number>;
  warnings: string[];
  preview: {
    clients?: Record<string, any>[];
    matters?: Record<string, any>[];
  };
}

interface ImportResult {
  success: boolean;
  imported: Record<string, number>;
  skipped: number;
  errors: string[];
}

function ExportTab() {
  const { toast } = useToast();
  const [selectedMatter, setSelectedMatter] = useState("");
  const [csvEntity, setCsvEntity] = useState("");
  const [exportingFull, setExportingFull] = useState(false);
  const [exportingMatter, setExportingMatter] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const { data: matters = [] } = useQuery<MatterRecord[]>({
    queryKey: ["/api/matters"],
  });

  const downloadFile = useCallback(async (url: string, fallbackName: string) => {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Export failed");
    const disposition = res.headers.get("Content-Disposition");
    let filename = fallbackName;
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, []);

  const handleFullExport = async () => {
    setExportingFull(true);
    try {
      await downloadFile("/api/export/full", "vericase-export.json");
      toast({ title: "Export Complete", description: "Full firm data exported successfully." });
    } catch {
      toast({ title: "Export Failed", description: "Could not generate export.", variant: "destructive" });
    } finally {
      setExportingFull(false);
    }
  };

  const handleMatterExport = async () => {
    if (!selectedMatter) return;
    setExportingMatter(true);
    try {
      await downloadFile(`/api/export/matters/${selectedMatter}`, "vericase-matter-export.json");
      toast({ title: "Export Complete", description: "Matter data exported successfully." });
    } catch {
      toast({ title: "Export Failed", description: "Could not export matter.", variant: "destructive" });
    } finally {
      setExportingMatter(false);
    }
  };

  const handleCsvExport = async () => {
    if (!csvEntity) return;
    setExportingCsv(true);
    try {
      await downloadFile(`/api/export/csv/${csvEntity}`, `vericase-${csvEntity}.csv`);
      toast({ title: "Export Complete", description: `${csvEntity} exported as CSV.` });
    } catch {
      toast({ title: "Export Failed", description: "Could not generate CSV.", variant: "destructive" });
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Full Firm Export
          </CardTitle>
          <CardDescription>
            Export all firm data including clients, matters, time entries, invoices, evidence, and more as a single JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleFullExport}
            disabled={exportingFull}
            data-testid="button-export-full"
          >
            {exportingFull ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Export All Data (JSON)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Single Matter Export
          </CardTitle>
          <CardDescription>
            Export a specific matter with all related data including contacts, time entries, expenses, and documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-1.5 block text-sm">Select Matter</Label>
              <Select value={selectedMatter} onValueChange={setSelectedMatter}>
                <SelectTrigger data-testid="select-matter-export">
                  <SelectValue placeholder="Choose a matter..." />
                </SelectTrigger>
                <SelectContent>
                  {matters.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.caseNumber ? `(${m.caseNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleMatterExport}
              disabled={!selectedMatter || exportingMatter}
              data-testid="button-export-matter"
            >
              {exportingMatter ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Export Matter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Export
          </CardTitle>
          <CardDescription>
            Export a specific entity type as a CSV file for use in spreadsheet applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-1.5 block text-sm">Entity Type</Label>
              <Select value={csvEntity} onValueChange={setCsvEntity}>
                <SelectTrigger data-testid="select-csv-entity">
                  <SelectValue placeholder="Choose entity type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="matters">Matters</SelectItem>
                  <SelectItem value="timeEntries">Time Entries</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCsvExport}
              disabled={!csvEntity || exportingCsv}
              data-testid="button-export-csv"
            >
              {exportingCsv ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ImportTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState("vericase");
  const [rawData, setRawData] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawData(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawData(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await apiRequest("POST", "/api/import/validate", { format, data: rawData });
      const result = await res.json();
      setValidationResult(result);
      setStep(3);
    } catch {
      toast({ title: "Validation Failed", description: "Could not validate import data.", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await apiRequest("POST", "/api/import/execute", {
        format,
        data: rawData,
        options: { skipDuplicates, overwriteExisting },
      });
      const result = await res.json();
      setImportResult(result);
      setStep(6);
    } catch {
      toast({ title: "Import Failed", description: "Could not execute import.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setFormat("vericase");
    setRawData("");
    setFileName("");
    setFileSize(0);
    setValidationResult(null);
    setSkipDuplicates(true);
    setOverwriteExisting(false);
    setImportResult(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const steps = [
    { num: 1, label: "Source" },
    { num: 2, label: "Upload" },
    { num: 3, label: "Preview" },
    { num: 4, label: "Options" },
    { num: 5, label: "Execute" },
    { num: 6, label: "Results" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-1 shrink-0">
            <div
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                step === s.num
                  ? "bg-primary text-primary-foreground"
                  : step > s.num
                    ? "bg-muted text-foreground"
                    : "bg-muted/50 text-muted-foreground"
              }`}
              data-testid={`step-indicator-${s.num}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                {step > s.num ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.num}
              </span>
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Import Source</CardTitle>
            <CardDescription>Choose the platform your data is coming from.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={format} onValueChange={setFormat} data-testid="radio-import-format">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="vericase" id="fmt-vericase" data-testid="radio-vericase" />
                <Label htmlFor="fmt-vericase" className="cursor-pointer">
                  <span className="font-medium">VeriCase</span>
                  <span className="text-muted-foreground text-sm ml-2">Import from a VeriCase export file</span>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="clio" id="fmt-clio" data-testid="radio-clio" />
                <Label htmlFor="fmt-clio" className="cursor-pointer">
                  <span className="font-medium">Clio</span>
                  <span className="text-muted-foreground text-sm ml-2">Import from Clio Manage export</span>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="mycase" id="fmt-mycase" data-testid="radio-mycase" />
                <Label htmlFor="fmt-mycase" className="cursor-pointer">
                  <span className="font-medium">MyCase</span>
                  <span className="text-muted-foreground text-sm ml-2">Import from MyCase export</span>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="practicepanther" id="fmt-practicepanther" data-testid="radio-practicepanther" />
                <Label htmlFor="fmt-practicepanther" className="cursor-pointer">
                  <span className="font-medium">PracticePanther</span>
                  <span className="text-muted-foreground text-sm ml-2">Import from PracticePanther export</span>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} data-testid="button-next-step-1">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Data</CardTitle>
            <CardDescription>Upload a JSON or CSV file, or paste your data below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-import"
            >
              <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Drag & drop a file here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports JSON and CSV files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={handleFileUpload}
                data-testid="input-file-upload"
              />
            </div>

            {fileName && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-file-info">
                <Badge variant="secondary">{fileName.endsWith(".csv") ? "CSV" : "JSON"}</Badge>
                <span className="text-foreground">{fileName}</span>
                <span className="text-muted-foreground">({formatFileSize(fileSize)})</span>
              </div>
            )}

            <div>
              <Label className="mb-1.5 block text-sm">Or paste data directly</Label>
              <Textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder="Paste your JSON or CSV data here..."
                className="min-h-[120px] font-mono text-xs"
                data-testid="textarea-import-data"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back-step-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleValidate}
                disabled={!rawData || validating}
                data-testid="button-validate"
              >
                {validating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Validate & Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && validationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Preview</CardTitle>
            <CardDescription>Review what will be imported before proceeding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationResult.valid ? (
              <Alert data-testid="alert-validation-success">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertTitle className="text-emerald-600 dark:text-emerald-400">Data is valid</AlertTitle>
                <AlertDescription>Your data has been validated and is ready for import.</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive" data-testid="alert-validation-error">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Validation Failed</AlertTitle>
                <AlertDescription>The data could not be parsed. Check the format and try again.</AlertDescription>
              </Alert>
            )}

            {Object.keys(validationResult.entityCounts).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Entity Counts</h4>
                <div className="flex gap-2 flex-wrap" data-testid="entity-counts">
                  {Object.entries(validationResult.entityCounts).map(([key, count]) => (
                    <Badge key={key} variant="secondary">
                      {key}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Warnings</h4>
                {validationResult.warnings.map((w, i) => (
                  <Alert key={i} data-testid={`alert-warning-${i}`}>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-700 dark:text-amber-300">{w}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {validationResult.preview?.clients && validationResult.preview.clients.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Client Preview (first 5)</h4>
                <div className="overflow-x-auto">
                  <Table data-testid="table-preview-clients">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.preview.clients.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{c.name || "-"}</TableCell>
                          <TableCell>{c.email || "-"}</TableCell>
                          <TableCell>{c.company || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {validationResult.preview?.matters && validationResult.preview.matters.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Matter Preview (first 5)</h4>
                <div className="overflow-x-auto">
                  <Table data-testid="table-preview-matters">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Case Number</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.preview.matters.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell>{m.name || "-"}</TableCell>
                          <TableCell>{m.caseNumber || "-"}</TableCell>
                          <TableCell>{m.matterType || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-step-3">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!validationResult.valid}
                data-testid="button-next-step-3"
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Options</CardTitle>
            <CardDescription>Configure how duplicate records should be handled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="skip-duplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                data-testid="checkbox-skip-duplicates"
              />
              <Label htmlFor="skip-duplicates" className="cursor-pointer">
                <span className="font-medium">Skip duplicates</span>
                <p className="text-sm text-muted-foreground">
                  Skip records that already exist (clients matched by email, matters by case number)
                </p>
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="overwrite-existing"
                checked={overwriteExisting}
                onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                data-testid="checkbox-overwrite-existing"
              />
              <Label htmlFor="overwrite-existing" className="cursor-pointer">
                <span className="font-medium">Overwrite existing records</span>
                <p className="text-sm text-muted-foreground">
                  Update existing records with data from the import file
                </p>
              </Label>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} data-testid="button-back-step-4">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(5)} data-testid="button-next-step-4">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Execute Import</CardTitle>
            <CardDescription>Review your settings and start the import process.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source format:</span>
                <span className="font-medium capitalize">{format}</span>
              </div>
              {validationResult && Object.entries(validationResult.entityCounts).map(([key, count]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-medium">{count} records</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skip duplicates:</span>
                <span className="font-medium">{skipDuplicates ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overwrite existing:</span>
                <span className="font-medium">{overwriteExisting ? "Yes" : "No"}</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)} data-testid="button-back-step-5">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleImport} disabled={importing} data-testid="button-execute-import">
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Start Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 6 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {importResult.success ? (
              <Alert data-testid="alert-import-success">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertTitle className="text-emerald-600 dark:text-emerald-400">Import Completed Successfully</AlertTitle>
                <AlertDescription>All records have been imported without errors.</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive" data-testid="alert-import-partial">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Import Completed with Issues</AlertTitle>
                <AlertDescription>Some records encountered errors during import.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Summary</h4>
              <div className="rounded-md border p-4 space-y-2 text-sm">
                {Object.entries(importResult.imported).map(([key, count]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key} imported:</span>
                    <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400" data-testid={`badge-imported-${key}`}>
                      {count}
                    </Badge>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skipped:</span>
                  <Badge variant="secondary" data-testid="badge-skipped">{importResult.skipped}</Badge>
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Errors ({importResult.errors.length})</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-sm text-destructive flex items-start gap-1.5" data-testid={`text-error-${i}`}>
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={resetWizard} data-testid="button-import-again">
                Import More Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DataPortabilityPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Data Portability</h1>
          <p className="text-muted-foreground mt-1">Export your firm data or import from other legal practice management systems.</p>
        </div>

        <Tabs defaultValue="export" data-testid="tabs-data-portability">
          <TabsList>
            <TabsTrigger value="export" data-testid="tab-export">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-import">
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-4">
            <ExportTab />
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <ImportTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

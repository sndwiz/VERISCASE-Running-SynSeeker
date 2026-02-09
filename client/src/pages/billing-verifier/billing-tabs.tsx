import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Upload, FileText, BarChart3, Download, CheckCircle2,
  AlertTriangle, XCircle, Clock, DollarSign, Scale, Shield,
  FileSpreadsheet, Loader2, ChevronDown, ChevronRight, Eye,
  SplitSquareHorizontal, ArrowUpDown, Search,
  Filter, Save, Plus, Building, FileDown
} from "lucide-react";
import type { TimeEntry, Flag, QualityIssue, VerifierSettings, DailySummary } from "./billing-types";

export function UploadTab({ isProcessing, progress, rawEntries, handleFileUpload, handleManualEntry }: {
  isProcessing: boolean; progress: number; rawEntries: TimeEntry[];
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleManualEntry: () => void;
}) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Time Entries</CardTitle>
          <CardDescription>Upload CSV, JSON, or text files with time entry data for verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-md p-8 text-center hover-elevate transition-colors">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">Drag and drop your billing file, or click to browse</p>
            <Input
              type="file"
              accept=".csv,.tsv,.json,.txt"
              onChange={handleFileUpload}
              className="max-w-xs mx-auto"
              disabled={isProcessing}
              data-testid="input-file-upload"
            />
            <p className="text-xs text-muted-foreground mt-2">Supports CSV, TSV, JSON, and plain text formats</p>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing entries...</span>
              </div>
              <Progress value={progress} data-testid="progress-processing" />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {rawEntries.length > 0 ? `${rawEntries.length} entries loaded` : "No entries loaded yet"}
            </div>
            <Button variant="outline" size="sm" onClick={handleManualEntry} data-testid="button-manual-entry">
              <Plus className="h-4 w-4 mr-1" /> Manual Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expected File Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>CSV files should have columns for:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {["Date", "Attorney/Timekeeper", "Description/Narrative", "Hours/Quantity", "Rate (optional)", "Amount (optional)"].map(col => (
                <Badge key={col} variant="outline">{col}</Badge>
              ))}
            </div>
            <p className="mt-2">Column headers are auto-detected. Standard LEDES, Clio, and generic CSV formats are supported.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsTab({ settings, setSettings, aliasInput, setAliasInput, partyInput, setPartyInput, profiles, saveProfileMutation }: {
  settings: VerifierSettings; setSettings: (s: VerifierSettings) => void;
  aliasInput: string; setAliasInput: (v: string) => void;
  partyInput: string; setPartyInput: (v: string) => void;
  profiles: any[]; saveProfileMutation: any;
}) {
  const addAlias = () => {
    if (aliasInput.trim()) {
      setSettings({ ...settings, aliases: [...settings.aliases, aliasInput.trim()] });
      setAliasInput("");
    }
  };
  const addParty = () => {
    if (partyInput.trim()) {
      setSettings({ ...settings, keyParties: [...settings.keyParties, partyInput.trim()] });
      setPartyInput("");
    }
  };
  const handleSaveProfile = () => {
    saveProfileMutation.mutate({
      clientName: settings.clientName || "Default Profile",
      hourlyRate: settings.hourlyRate,
      longThreshold: settings.longThreshold,
      dayThreshold: settings.dayThreshold,
      roundingIncrement: settings.roundingIncrement,
      roundingDirection: settings.roundingDirection,
      minimumEntry: settings.minimumEntry,
      travelTimeRate: settings.travelTimeRate,
      aliases: settings.aliases,
      keyParties: settings.keyParties,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input id="clientName" value={settings.clientName} onChange={e => setSettings({ ...settings, clientName: e.target.value })} placeholder="e.g., Acme Corp" data-testid="input-client-name" />
            </div>
            <div className="space-y-2">
              <Label>Client Aliases (for name detection)</Label>
              <div className="flex gap-2">
                <Input value={aliasInput} onChange={e => setAliasInput(e.target.value)} placeholder="Add alias" onKeyDown={e => e.key === "Enter" && addAlias()} data-testid="input-alias" />
                <Button variant="outline" size="sm" onClick={addAlias} data-testid="button-add-alias"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {settings.aliases.map((a, i) => (
                  <Badge key={i} variant="secondary">
                    {a}
                    <button className="ml-1 text-xs" onClick={() => setSettings({ ...settings, aliases: settings.aliases.filter((_, j) => j !== i) })}>&times;</button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Key Parties</Label>
              <div className="flex gap-2">
                <Input value={partyInput} onChange={e => setPartyInput(e.target.value)} placeholder="Add party" onKeyDown={e => e.key === "Enter" && addParty()} data-testid="input-party" />
                <Button variant="outline" size="sm" onClick={addParty} data-testid="button-add-party"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {settings.keyParties.map((p, i) => (
                  <Badge key={i} variant="secondary">
                    {p}
                    <button className="ml-1 text-xs" onClick={() => setSettings({ ...settings, keyParties: settings.keyParties.filter((_, j) => j !== i) })}>&times;</button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Firm Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firmName">Firm Name</Label>
              <Input id="firmName" value={settings.firmName} onChange={e => setSettings({ ...settings, firmName: e.target.value })} placeholder="Synergy Law PLLC" data-testid="input-firm-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attorneyName">Attorney Name</Label>
              <Input id="attorneyName" value={settings.attorneyName} onChange={e => setSettings({ ...settings, attorneyName: e.target.value })} placeholder="Attorney name" data-testid="input-attorney-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firmAddress">Firm Address</Label>
              <Textarea id="firmAddress" value={settings.firmAddress} onChange={e => setSettings({ ...settings, firmAddress: e.target.value })} placeholder={"123 Main St\nCity, State ZIP"} data-testid="input-firm-address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select value={settings.paymentTerms} onValueChange={v => setSettings({ ...settings, paymentTerms: v as any })}>
                  <SelectTrigger data-testid="select-payment-terms"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Due Upon Receipt</SelectItem>
                    <SelectItem value="net15">Net 15 Days</SelectItem>
                    <SelectItem value="net30">Net 30 Days</SelectItem>
                    <SelectItem value="net60">Net 60 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retainerBalance">Retainer Balance ($)</Label>
                <Input id="retainerBalance" type="number" value={settings.retainerBalance} onChange={e => setSettings({ ...settings, retainerBalance: +e.target.value })} data-testid="input-retainer-balance" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={settings.startDate} onChange={e => setSettings({ ...settings, startDate: e.target.value })} data-testid="input-start-date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={settings.endDate} onChange={e => setSettings({ ...settings, endDate: e.target.value })} data-testid="input-end-date" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Rate and Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input id="hourlyRate" type="number" value={settings.hourlyRate} onChange={e => setSettings({ ...settings, hourlyRate: +e.target.value })} data-testid="input-hourly-rate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumEntry">Minimum Entry (h)</Label>
                <Input id="minimumEntry" type="number" step="0.1" value={settings.minimumEntry} onChange={e => setSettings({ ...settings, minimumEntry: +e.target.value })} data-testid="input-minimum-entry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longThreshold">Long Entry Threshold (h)</Label>
                <Input id="longThreshold" type="number" step="0.5" value={settings.longThreshold} onChange={e => setSettings({ ...settings, longThreshold: +e.target.value })} data-testid="input-long-threshold" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayThreshold">Day Total Threshold (h)</Label>
                <Input id="dayThreshold" type="number" step="0.5" value={settings.dayThreshold} onChange={e => setSettings({ ...settings, dayThreshold: +e.target.value })} data-testid="input-day-threshold" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Rounding Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roundingIncrement">Increment (h)</Label>
                <Input id="roundingIncrement" type="number" step="0.01" value={settings.roundingIncrement} onChange={e => setSettings({ ...settings, roundingIncrement: +e.target.value })} data-testid="input-rounding-increment" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roundingDirection">Direction</Label>
                <Select value={settings.roundingDirection} onValueChange={v => setSettings({ ...settings, roundingDirection: v as "up" | "down" | "nearest" })}>
                  <SelectTrigger data-testid="select-rounding-direction"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Round Up</SelectItem>
                    <SelectItem value="down">Round Down</SelectItem>
                    <SelectItem value="nearest">Nearest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="travelRate">Travel Time Rate (multiplier)</Label>
              <Input id="travelRate" type="number" step="0.1" min="0" max="1" value={settings.travelTimeRate} onChange={e => setSettings({ ...settings, travelTimeRate: +e.target.value })} data-testid="input-travel-rate" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Verification Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "detectUtbms" as const, label: "UTBMS Code Detection", desc: "Auto-detect UTBMS task codes from descriptions" },
              { key: "checkQuality" as const, label: "Quality Checks", desc: "Check for vague descriptions, abbreviations, etc." },
              { key: "suggestSplits" as const, label: "Split Suggestions", desc: "Suggest splitting multi-task entries" },
              { key: "checkBlockBilling" as const, label: "Block Billing Detection", desc: "Flag entries with short descriptions and high hours" },
              { key: "checkDuplicates" as const, label: "Duplicate Detection", desc: "Identify potential duplicate entries" },
              { key: "checkWeekendHoliday" as const, label: "Weekend/Holiday Flags", desc: "Flag entries on weekends or holidays" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={settings[key]} onCheckedChange={v => setSettings({ ...settings, [key]: v })} data-testid={`switch-${key}`} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        {profiles.length > 0 && (
          <Select onValueChange={id => {
            const p = profiles.find((pr: any) => pr.id === id);
            if (p) {
              setSettings({
                ...settings,
                clientName: p.clientName || "",
                hourlyRate: p.hourlyRate || 350,
                longThreshold: p.longThreshold || 6,
                dayThreshold: p.dayThreshold || 10,
                roundingIncrement: p.roundingIncrement || 0.1,
                roundingDirection: p.roundingDirection || "up",
                minimumEntry: p.minimumEntry || 0,
                travelTimeRate: p.travelTimeRate || 1,
                aliases: p.aliases || [],
                keyParties: p.keyParties || [],
              });
            }
          }}>
            <SelectTrigger className="w-60" data-testid="select-load-profile"><SelectValue placeholder="Load saved profile..." /></SelectTrigger>
            <SelectContent>
              {profiles.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.clientName || "Unnamed"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={handleSaveProfile} data-testid="button-save-profile">
          <Save className="h-4 w-4 mr-1" /> Save as Profile
        </Button>
      </div>
    </div>
  );
}

export function ResultsTab({ summary, filteredEntries, processedEntries, searchTerm, setSearchTerm, filterConfidence, setFilterConfidence, expandedRows, toggleRow, toggleApproval, handleSort, sortField, sortDirection, confidenceIcon, setSplitEntry, setShowSplitDialog }: any) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-4" />
        <p>No results yet. Upload a file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-entries">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-hours">{summary.totalHours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-amount">${summary.totalAmount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500" data-testid="text-flagged">{summary.flagged}</p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-utbms">{summary.utbmsCoverage}</p>
            <p className="text-xs text-muted-foreground">UTBMS Coded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500" data-testid="text-approved">{summary.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500" data-testid="text-writeoffs">{processedEntries.filter((e: TimeEntry) => e.writeOff).length}</p>
            <p className="text-xs text-muted-foreground">Write-offs</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-entries"
          />
        </div>
        <Select value={filterConfidence} onValueChange={setFilterConfidence}>
          <SelectTrigger className="w-40" data-testid="select-filter-confidence">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 w-8"></th>
                  <th className="p-3 text-left cursor-pointer" onClick={() => handleSort("date")} data-testid="header-date">
                    <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="p-3 text-left">Attorney</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right cursor-pointer" onClick={() => handleSort("hours")} data-testid="header-hours">
                    <span className="flex items-center justify-end gap-1">Hours <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="p-3 text-right cursor-pointer" onClick={() => handleSort("amount")} data-testid="header-amount">
                    <span className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="p-3 text-center">UTBMS</th>
                  <th className="p-3 text-center cursor-pointer" onClick={() => handleSort("confidence")} data-testid="header-confidence">Conf.</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry: TimeEntry) => {
                  const isExpanded = expandedRows.has(entry.id);
                  return (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      isExpanded={isExpanded}
                      toggleRow={toggleRow}
                      toggleApproval={toggleApproval}
                      confidenceIcon={confidenceIcon}
                      setSplitEntry={setSplitEntry}
                      setShowSplitDialog={setShowSplitDialog}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredEntries.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No entries match your filters</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function EntryRow({ entry, isExpanded, toggleRow, toggleApproval, confidenceIcon, setSplitEntry, setShowSplitDialog }: any) {
  return (
    <>
      <tr className={`border-b hover-elevate ${entry.approved ? "bg-green-500/5" : ""}`} data-testid={`row-entry-${entry.id}`}>
        <td className="p-3">
          <button onClick={() => toggleRow(entry.id)} data-testid={`button-expand-${entry.id}`}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="p-3 whitespace-nowrap">{entry.date}</td>
        <td className="p-3 whitespace-nowrap">{entry.attorney}</td>
        <td className="p-3 max-w-xs truncate">{entry.description}</td>
        <td className="p-3 text-right whitespace-nowrap">
          {entry.roundedHours !== entry.hours ? (
            <span>
              <span className="line-through text-muted-foreground mr-1">{entry.hours}</span>
              {entry.roundedHours?.toFixed(1)}
            </span>
          ) : (
            entry.hours.toFixed(1)
          )}
        </td>
        <td className="p-3 text-right whitespace-nowrap">${(entry.adjustedAmount || entry.amount).toFixed(2)}</td>
        <td className="p-3 text-center">
          {entry.utbmsCode ? <Badge variant="outline" className="text-xs">{entry.utbmsCode}</Badge> : <span className="text-muted-foreground">-</span>}
        </td>
        <td className="p-3 text-center">{confidenceIcon(entry.confidence)}</td>
        <td className="p-3 text-center">
          <Button
            variant={entry.approved ? "default" : "outline"}
            size="sm"
            onClick={() => toggleApproval(entry.id)}
            data-testid={`button-approve-${entry.id}`}
          >
            {entry.approved ? <CheckCircle2 className="h-4 w-4" /> : "Approve"}
          </Button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={9} className="p-4">
            <div className="space-y-3">
              <p className="text-sm"><strong>Full Description:</strong> {entry.description}</p>
              {entry.flags.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Flags:</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.flags.map((f: Flag, i: number) => (
                      <Badge key={i} variant={f.severity === "error" ? "destructive" : f.severity === "warning" ? "outline" : "secondary"}>
                        {f.severity === "error" ? <XCircle className="h-3 w-3 mr-1" /> : f.severity === "warning" ? <AlertTriangle className="h-3 w-3 mr-1" /> : null}
                        {f.message}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {entry.qualityIssues.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Quality Issues:</p>
                  <div className="space-y-1">
                    {entry.qualityIssues.map((q: QualityIssue, i: number) => (
                      <div key={i} className="text-sm">
                        <span className="text-muted-foreground">{q.message}</span>
                        {q.suggestion && <span className="text-xs ml-2 text-blue-500">{q.suggestion}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {entry.utbmsCode && (
                <div className="text-sm">
                  <strong>UTBMS:</strong> {entry.utbmsCode} - {entry.utbmsPhase} / {entry.utbmsTask}
                </div>
              )}
              {entry.splitSuggestion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSplitEntry(entry); setShowSplitDialog(true); }}
                  data-testid={`button-split-${entry.id}`}
                >
                  <SplitSquareHorizontal className="h-4 w-4 mr-1" /> View Split Suggestion
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ReviewTab({ processedEntries, summary, settings }: { processedEntries: TimeEntry[]; summary: any; settings: VerifierSettings }) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Eye className="h-12 w-12 mb-4" />
        <p>Process entries first to see the review summary.</p>
      </div>
    );
  }

  const flagBreakdown = processedEntries.reduce((acc, e) => {
    e.flags.forEach(f => { acc[f.type] = (acc[f.type] || 0) + 1; });
    return acc;
  }, {} as Record<string, number>);

  const phaseBreakdown = processedEntries.reduce((acc, e) => {
    const phase = e.utbmsPhase || "Uncategorized";
    acc[phase] = (acc[phase] || 0) + e.hours;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Confidence Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-28">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">High</span>
              </div>
              <div className="flex-1">
                <Progress value={summary.total ? (summary.highConf / summary.total) * 100 : 0} className="h-3" />
              </div>
              <span className="text-sm w-16 text-right">{summary.highConf} ({summary.total ? Math.round((summary.highConf / summary.total) * 100) : 0}%)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-28">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Medium</span>
              </div>
              <div className="flex-1">
                <Progress value={summary.total ? (summary.medConf / summary.total) * 100 : 0} className="h-3" />
              </div>
              <span className="text-sm w-16 text-right">{summary.medConf} ({summary.total ? Math.round((summary.medConf / summary.total) * 100) : 0}%)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-28">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Low</span>
              </div>
              <div className="flex-1">
                <Progress value={summary.total ? (summary.lowConf / summary.total) * 100 : 0} className="h-3" />
              </div>
              <span className="text-sm w-16 text-right">{summary.lowConf} ({summary.total ? Math.round((summary.lowConf / summary.total) * 100) : 0}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flag Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(flagBreakdown).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(flagBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-4">
                    <span className="text-sm capitalize">{type.replace(/_/g, " ")}</span>
                    <Badge variant="outline">{count as number}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No flags detected</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">UTBMS Phase Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(phaseBreakdown).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([phase, hours]) => (
                <div key={phase} className="flex items-center justify-between gap-4">
                  <span className="text-sm">{phase}</span>
                  <Badge variant="outline">{(hours as number).toFixed(1)}h</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rounding Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{summary.totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Original Hours</p>
            </div>
            <div>
              <p className="text-lg font-bold">{summary.adjustedHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Adjusted Hours</p>
            </div>
            <div>
              <p className="text-lg font-bold">{summary.roundingDelta.toFixed(2)}h</p>
              <p className="text-xs text-muted-foreground">Rounding Delta</p>
            </div>
            <div>
              <p className="text-lg font-bold">${(summary.roundingDelta * settings.hourlyRate).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Dollar Impact</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ExportTab({ processedEntries, summary, exportData }: { processedEntries: TimeEntry[]; summary: any; exportData: (format: "csv" | "json" | "pdf" | "review-log") => void }) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Download className="h-12 w-12 mb-4" />
        <p>Process entries first to enable export options.</p>
      </div>
    );
  }

  const approvedEntries = processedEntries.filter(e => e.approved);
  const flaggedEntries = processedEntries.filter(e => e.flags.length > 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Download your verified billing data in various formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">CSV Export</p>
                    <p className="text-xs text-muted-foreground">Spreadsheet-compatible format</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => exportData("csv")} data-testid="button-export-csv">
                  <Download className="h-4 w-4 mr-1" /> Download CSV
                </Button>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileDown className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-medium">PDF Export</p>
                    <p className="text-xs text-muted-foreground">Printable report format</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => exportData("pdf")} data-testid="button-export-pdf">
                  <Download className="h-4 w-4 mr-1" /> Download PDF
                </Button>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">JSON Export</p>
                    <p className="text-xs text-muted-foreground">Full data with metadata</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => exportData("json")} data-testid="button-export-json">
                  <Download className="h-4 w-4 mr-1" /> Download JSON
                </Button>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="font-medium">Review Log</p>
                    <p className="text-xs text-muted-foreground">Audit trail of review actions</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => exportData("review-log")} data-testid="button-export-review-log">
                  <Download className="h-4 w-4 mr-1" /> Download Review Log
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Entries</p>
              <p className="font-medium">{summary.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Approved</p>
              <p className="font-medium text-green-500">{approvedEntries.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Flagged</p>
              <p className="font-medium text-yellow-500">{flaggedEntries.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Amount</p>
              <p className="font-medium">${summary.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DailySummaryTab({ dailySummary, settings }: { dailySummary: DailySummary[]; settings: VerifierSettings }) {
  if (dailySummary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Clock className="h-12 w-12 mb-4" />
        <p>Process entries first to see daily summaries.</p>
      </div>
    );
  }

  const totalDays = dailySummary.length;
  const overThresholdDays = dailySummary.filter(d => d.overThreshold).length;
  const totalFlagged = dailySummary.reduce((s, d) => s + d.flagCount, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-days">{totalDays}</p>
            <p className="text-xs text-muted-foreground">Days with Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500" data-testid="text-days-over">{overThresholdDays}</p>
            <p className="text-xs text-muted-foreground">Days Over {settings.dayThreshold}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500" data-testid="text-total-flagged-daily">{totalFlagged}</p>
            <p className="text-xs text-muted-foreground">Total Flags</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{dailySummary.length > 0 ? (dailySummary.reduce((s, d) => s + d.hours, 0) / dailySummary.length).toFixed(1) : "0"}</p>
            <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Entries</th>
                  <th className="p-3 text-right">Hours</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Flags</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.map(d => (
                  <tr key={d.date} className={`border-b ${d.overThreshold ? "bg-red-500/5" : ""}`} data-testid={`row-daily-${d.date}`}>
                    <td className="p-3">{d.date}</td>
                    <td className="p-3 text-right">{d.entries}</td>
                    <td className="p-3 text-right font-medium">{d.hours.toFixed(2)}</td>
                    <td className="p-3 text-right">${d.amount.toFixed(2)}</td>
                    <td className="p-3 text-center">{d.flagCount > 0 ? <Badge variant="outline">{d.flagCount}</Badge> : <span className="text-muted-foreground">-</span>}</td>
                    <td className="p-3 text-center">{d.overThreshold ? <Badge variant="destructive">Over {settings.dayThreshold}h</Badge> : <Badge variant="secondary">OK</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdjustmentsTab({ processedEntries, setProcessedEntries, settings }: {
  processedEntries: TimeEntry[];
  setProcessedEntries: (fn: (prev: TimeEntry[]) => TimeEntry[]) => void;
  settings: VerifierSettings;
}) {
  if (processedEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Scale className="h-12 w-12 mb-4" />
        <p>Process entries first to manage adjustments.</p>
      </div>
    );
  }

  const origTotal = processedEntries.reduce((s, e) => s + e.amount, 0);
  const writeOffTotal = processedEntries.filter(e => e.writeOff).reduce((s, e) => s + (e.adjustedAmount || e.amount), 0);
  const adjustedTotal = processedEntries.filter(e => !e.writeOff).reduce((s, e) => s + (e.adjustedAmount || e.amount), 0);

  const toggleWriteOff = (id: string) => {
    setProcessedEntries((prev: TimeEntry[]) =>
      prev.map(e => e.id === id ? { ...e, writeOff: !e.writeOff } : e)
    );
  };

  const updateReviewStatus = (id: string, status: "pending" | "confirmed" | "edited") => {
    setProcessedEntries((prev: TimeEntry[]) =>
      prev.map(e => e.id === id ? { ...e, reviewStatus: status } : e)
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-original-total">${origTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Original Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500" data-testid="text-writeoff-total">${writeOffTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Write-offs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500" data-testid="text-adjusted-total">${adjustedTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Adjusted Total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entry Adjustments</CardTitle>
          <CardDescription>Toggle write-offs and confirm entries for final billing</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right">Original</th>
                  <th className="p-3 text-right">Adjusted</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedEntries.map(entry => (
                  <tr key={entry.id} className={`border-b ${entry.writeOff ? "opacity-50 line-through" : ""}`} data-testid={`row-adj-${entry.id}`}>
                    <td className="p-3 whitespace-nowrap">{entry.date}</td>
                    <td className="p-3 max-w-xs truncate">{entry.clioNarrative || entry.description}</td>
                    <td className="p-3 text-right">{entry.hours.toFixed(2)}h</td>
                    <td className="p-3 text-right">{(entry.adjustedHours || entry.hours).toFixed(2)}h</td>
                    <td className="p-3 text-right">${(entry.adjustedAmount || entry.amount).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={entry.reviewStatus === "confirmed" ? "default" : entry.reviewStatus === "edited" ? "outline" : "secondary"}>
                        {entry.reviewStatus || "pending"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant={entry.writeOff ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleWriteOff(entry.id)}
                          data-testid={`button-writeoff-${entry.id}`}
                        >
                          {entry.writeOff ? "Undo" : "Write Off"}
                        </Button>
                        <Button
                          variant={entry.reviewStatus === "confirmed" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateReviewStatus(entry.id, entry.reviewStatus === "confirmed" ? "pending" : "confirmed")}
                          data-testid={`button-confirm-${entry.id}`}
                        >
                          {entry.reviewStatus === "confirmed" ? "Confirmed" : "Confirm"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

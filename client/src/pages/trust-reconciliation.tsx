import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Landmark,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Upload,
  Wand2,
  Link2,
  Unlink,
  FileCheck,
  X,
} from "lucide-react";
import type { TrustReconciliationBatch, BankStatementEntry } from "@shared/schema";

interface TrustTransaction {
  id: string;
  clientId: string;
  matterId?: string | null;
  date: string;
  amount: number;
  type: string;
  description: string;
  reference?: string | null;
  runningBalance: number;
}

interface BatchDetail extends TrustReconciliationBatch {
  entries: BankStatementEntry[];
  transactions: TrustTransaction[];
}

interface ReconciliationReport {
  batch: any;
  threeWayBalance: {
    bankStatementBalance: number;
    bookBalance: number;
    clientLedgerTotal: number;
    adjustmentTotal: number;
    difference: number;
    isBalanced: boolean;
  };
  entries: { total: number; matched: number; unmatched: number; items: BankStatementEntry[] };
  transactions: { total: number; items: TrustTransaction[] };
  clientLedger: { total: number; clients: { clientId: string; clientName: string; balance: number }[] };
  adjustments: any[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    draft: "secondary",
    reconciled: "default",
    unbalanced: "destructive",
  };
  return (
    <Badge variant={(variants[status] || "secondary") as any} data-testid={`badge-status-${status}`}>
      {status}
    </Badge>
  );
}

function matchStatusBadge(status: string) {
  if (status === "matched") {
    return <Badge variant="default" className="bg-emerald-600 text-white" data-testid="badge-match-matched">Matched</Badge>;
  }
  return <Badge variant="destructive" data-testid="badge-match-unmatched">Unmatched</Badge>;
}

function DashboardView({ onSelect, onCreate }: { onSelect: (id: string) => void; onCreate: () => void }) {
  const { data: batches = [], isLoading } = useQuery<TrustReconciliationBatch[]>({
    queryKey: ["/api/trust/reconciliation"],
  });

  const { data: trustTx = [] } = useQuery<TrustTransaction[]>({
    queryKey: ["/api/trust-transactions"],
  });

  const totalTrustBalance = trustTx.reduce((sum, tx) => {
    const isDebit = tx.type === "withdrawal" || tx.type === "transfer-out" || tx.type === "fee";
    return sum + (isDebit ? -tx.amount : tx.amount);
  }, 0);

  const lastReconciled = batches.find((b) => b.status === "reconciled");
  const outstandingCount = batches.filter((b) => b.status === "draft" || b.status === "unbalanced").length;

  const summaryCards = [
    { title: "Total Trust Balance", value: formatCurrency(totalTrustBalance), icon: Landmark, testId: "card-trust-balance" },
    { title: "Last Reconciled", value: lastReconciled?.reconciledAt ? formatDate(String(lastReconciled.reconciledAt).slice(0, 10)) : "Never", icon: Calendar, testId: "card-last-reconciled" },
    { title: "Outstanding Items", value: String(outstandingCount), icon: AlertCircle, testId: "card-outstanding" },
    { title: "Overall Status", value: outstandingCount > 0 ? "Needs Attention" : "Up to Date", icon: CheckCircle2, testId: "card-overall-status" },
  ];

  if (isLoading) {
    return (
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6" data-testid="trust-reconciliation-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Trust Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Three-way IOLTA trust account reconciliation</p>
        </div>
        <Button onClick={onCreate} data-testid="button-new-reconciliation">
          <Plus className="h-4 w-4 mr-2" />
          New Reconciliation
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.testId} data-testid={card.testId}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-batches-table">
        <CardHeader>
          <CardTitle className="text-lg">Reconciliation Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead className="text-right">Bank Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="cursor-pointer"
                    onClick={() => onSelect(batch.id)}
                    data-testid={`row-batch-${batch.id}`}
                  >
                    <TableCell className="font-medium">{batch.name}</TableCell>
                    <TableCell>{formatDate(batch.periodStart)} - {formatDate(batch.periodEnd)}</TableCell>
                    <TableCell>{batch.bankAccountName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(batch.bankStatementBalance)}</TableCell>
                    <TableCell>{statusBadge(batch.status || "draft")}</TableCell>
                    <TableCell>{batch.createdAt ? formatDate(String(batch.createdAt).slice(0, 10)) : "-"}</TableCell>
                  </TableRow>
                ))}
                {batches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No reconciliation batches yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailView({ batchId, onBack }: { batchId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedBankEntry, setSelectedBankEntry] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentDesc, setAdjustmentDesc] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");

  const { data: batch, isLoading } = useQuery<BatchDetail>({
    queryKey: ["/api/trust/reconciliation", batchId],
  });

  const { data: report } = useQuery<ReconciliationReport>({
    queryKey: ["/api/trust/reconciliation", batchId, "report"],
    queryFn: async () => {
      const res = await fetch(`/api/trust/reconciliation/${batchId}/report`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!batch,
  });

  const { data: clients = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/clients"],
  });
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const importMutation = useMutation({
    mutationFn: async (entries: any[]) => {
      const res = await apiRequest("POST", `/api/trust/reconciliation/${batchId}/entries`, entries);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust/reconciliation", batchId] });
      toast({ title: "Entries imported successfully" });
      setImportDialogOpen(false);
      setImportText("");
    },
    onError: () => toast({ title: "Failed to import entries", variant: "destructive" }),
  });

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trust/reconciliation/${batchId}/auto-match`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust/reconciliation", batchId] });
      toast({ title: `Auto-matched ${data.matched} of ${data.total} entries` });
    },
    onError: () => toast({ title: "Auto-match failed", variant: "destructive" }),
  });

  const manualMatchMutation = useMutation({
    mutationFn: async ({ entryId, transactionId }: { entryId: string; transactionId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/trust/reconciliation/${batchId}/entries/${entryId}/match`, { transactionId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust/reconciliation", batchId] });
      setSelectedBankEntry(null);
      toast({ title: "Match updated" });
    },
    onError: () => toast({ title: "Match failed", variant: "destructive" }),
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trust/reconciliation/${batchId}/finalize`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust/reconciliation", batchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trust/reconciliation"] });
      if (data.status === "reconciled") {
        toast({ title: "Reconciliation complete! All balances match." });
      } else {
        toast({ title: `Unbalanced: Difference of ${formatCurrency(data.difference)}`, variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Finalization failed", variant: "destructive" }),
  });

  const addAdjustmentMutation = useMutation({
    mutationFn: async (adjustment: { description: string; amount: number }) => {
      const currentAdj = (batch?.adjustments as any[]) || [];
      const newAdj = [...currentAdj, { ...adjustment, id: Date.now().toString() }];
      const res = await apiRequest("PATCH", `/api/trust/reconciliation/${batchId}`, { adjustments: newAdj });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust/reconciliation", batchId] });
      setAdjustmentDialogOpen(false);
      setAdjustmentDesc("");
      setAdjustmentAmount("");
      toast({ title: "Adjustment added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/trust/reconciliation/${batchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust/reconciliation"] });
      toast({ title: "Batch deleted" });
      onBack();
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  function handleImport() {
    try {
      const parsed = JSON.parse(importText);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      importMutation.mutate(entries);
    } catch {
      try {
        const lines = importText.trim().split("\n");
        const entries = lines.slice(1).filter(l => l.trim()).map((line) => {
          const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
          return {
            date: parts[0],
            description: parts[1] || "Bank entry",
            amount: parseFloat(parts[2]) || 0,
            reference: parts[3] || "",
          };
        });
        if (entries.length === 0) {
          toast({ title: "No valid entries found", variant: "destructive" });
          return;
        }
        importMutation.mutate(entries);
      } catch {
        toast({ title: "Invalid format. Use JSON array or CSV (date,description,amount,reference)", variant: "destructive" });
      }
    }
  }

  if (isLoading || !batch) {
    return (
      <div className="p-3 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const bankBalance = batch.bankStatementBalance;
  const bookBalance = report?.threeWayBalance.bookBalance ?? 0;
  const clientLedgerTotal = report?.threeWayBalance.clientLedgerTotal ?? 0;
  const adjustmentTotal = report?.threeWayBalance.adjustmentTotal ?? 0;
  const difference = report?.threeWayBalance.difference ?? Math.abs(bankBalance - bookBalance);
  const isBalanced = difference < 0.01;
  const isDraft = batch.status === "draft" || batch.status === "unbalanced";

  const matchedTxIds = new Set(
    batch.entries.filter((e) => e.matchedTransactionId).map((e) => e.matchedTransactionId!)
  );

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6" data-testid="trust-reconciliation-detail">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-batch-name">{batch.name}</h1>
            <p className="text-sm text-muted-foreground">
              {batch.bankAccountName} | {formatDate(batch.periodStart)} - {formatDate(batch.periodEnd)}
            </p>
          </div>
          {statusBadge(batch.status || "draft")}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && (
            <>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import">
                <Upload className="h-4 w-4 mr-2" />
                Import Entries
              </Button>
              <Button variant="outline" onClick={() => autoMatchMutation.mutate()} disabled={autoMatchMutation.isPending} data-testid="button-auto-match">
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Match
              </Button>
              <Button variant="outline" onClick={() => setAdjustmentDialogOpen(true)} data-testid="button-add-adjustment">
                <Plus className="h-4 w-4 mr-2" />
                Adjustment
              </Button>
              <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending} data-testid="button-finalize">
                <FileCheck className="h-4 w-4 mr-2" />
                Finalize
              </Button>
              <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate()} data-testid="button-delete-batch">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Card data-testid="card-three-way-balance">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Bank Statement</p>
              <p className="text-lg font-bold" data-testid="text-bank-balance">{formatCurrency(bankBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Book Balance</p>
              <p className="text-lg font-bold" data-testid="text-book-balance">{formatCurrency(bookBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Client Ledger</p>
              <p className="text-lg font-bold" data-testid="text-client-ledger">{formatCurrency(clientLedgerTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Adjustments</p>
              <p className="text-lg font-bold" data-testid="text-adjustments">{formatCurrency(adjustmentTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Difference</p>
              <p className={`text-lg font-bold ${isBalanced ? "text-emerald-600" : "text-destructive"}`} data-testid="text-difference">
                {formatCurrency(difference)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="bank" data-testid="reconciliation-tabs">
        <TabsList>
          <TabsTrigger value="bank" data-testid="tab-bank">Bank Statement ({batch.entries.length})</TabsTrigger>
          <TabsTrigger value="book" data-testid="tab-book">Book / Trust Ledger ({batch.transactions.length})</TabsTrigger>
          <TabsTrigger value="clients" data-testid="tab-clients">Client Ledger</TabsTrigger>
          <TabsTrigger value="adjustments" data-testid="tab-adjustments">Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="bank" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.entries.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className={selectedBankEntry === entry.id ? "bg-accent" : ""}
                        data-testid={`row-bank-entry-${entry.id}`}
                      >
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{entry.description}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.reference || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
                        <TableCell>{matchStatusBadge(entry.matchStatus || "unmatched")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {entry.matchStatus === "unmatched" && isDraft && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedBankEntry(selectedBankEntry === entry.id ? null : entry.id)}
                                data-testid={`button-select-entry-${entry.id}`}
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                            )}
                            {entry.matchStatus === "matched" && isDraft && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => manualMatchMutation.mutate({ entryId: entry.id, transactionId: null })}
                                data-testid={`button-unmatch-entry-${entry.id}`}
                              >
                                <Unlink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {batch.entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No bank statement entries. Import entries to begin reconciliation.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="book" className="mt-4">
          {selectedBankEntry && (
            <Card className="mb-4 border-primary">
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground mb-1">Click a transaction below to match it with the selected bank entry</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      {selectedBankEntry && <TableHead>Match</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.transactions.map((tx) => {
                      const isDebit = tx.type === "withdrawal" || tx.type === "transfer-out" || tx.type === "fee";
                      const alreadyMatched = matchedTxIds.has(tx.id);
                      return (
                        <TableRow
                          key={tx.id}
                          className={alreadyMatched ? "opacity-50" : ""}
                          data-testid={`row-trust-tx-${tx.id}`}
                        >
                          <TableCell>{formatDate(tx.date)}</TableCell>
                          <TableCell>{clientMap.get(tx.clientId) || tx.clientId}</TableCell>
                          <TableCell>
                            <Badge variant={isDebit ? "destructive" : "default"} className="text-xs">
                              {tx.type.replace("-", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                          <TableCell className="font-mono text-xs">{tx.reference || "-"}</TableCell>
                          <TableCell className={`text-right font-medium ${isDebit ? "text-destructive" : ""}`}>
                            {isDebit ? "-" : "+"}{formatCurrency(tx.amount)}
                          </TableCell>
                          {selectedBankEntry && (
                            <TableCell>
                              {!alreadyMatched && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => manualMatchMutation.mutate({ entryId: selectedBankEntry, transactionId: tx.id })}
                                  disabled={manualMatchMutation.isPending}
                                  data-testid={`button-match-tx-${tx.id}`}
                                >
                                  <Link2 className="h-3 w-3 mr-1" />
                                  Match
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {batch.transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={selectedBankEntry ? 7 : 6} className="text-center py-8 text-muted-foreground">
                          No trust transactions found in this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Trust Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report?.clientLedger.clients.map((client) => (
                      <TableRow key={client.clientId} data-testid={`row-client-ledger-${client.clientId}`}>
                        <TableCell className="font-medium">{client.clientName}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(client.balance)}</TableCell>
                      </TableRow>
                    ))}
                    {(!report?.clientLedger.clients || report.clientLedger.clients.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                          No client balances for this period
                        </TableCell>
                      </TableRow>
                    )}
                    {report?.clientLedger.clients && report.clientLedger.clients.length > 0 && (
                      <TableRow className="font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right" data-testid="text-client-ledger-total">{formatCurrency(report.clientLedger.total)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((batch.adjustments as any[]) || []).map((adj: any, i: number) => (
                      <TableRow key={adj.id || i} data-testid={`row-adjustment-${i}`}>
                        <TableCell>{adj.description}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(adj.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {(!batch.adjustments || (batch.adjustments as any[]).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                          No adjustments added
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Bank Statement Entries</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste entries as JSON array or CSV format (date,description,amount,reference)
            </p>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`[{"date":"2025-01-15","description":"Check #1234","amount":5000,"reference":"1234"}]\n\nor CSV:\ndate,description,amount,reference\n2025-01-15,Check #1234,5000,1234`}
              rows={10}
              data-testid="textarea-import"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} data-testid="button-cancel-import">Cancel</Button>
            <Button onClick={handleImport} disabled={importMutation.isPending || !importText.trim()} data-testid="button-confirm-import">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={adjustmentDesc}
              onChange={(e) => setAdjustmentDesc(e.target.value)}
              placeholder="Adjustment description"
              data-testid="input-adjustment-description"
            />
            <Input
              type="number"
              step="0.01"
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
              placeholder="Amount (use negative for deductions)"
              data-testid="input-adjustment-amount"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentDialogOpen(false)} data-testid="button-cancel-adjustment">Cancel</Button>
            <Button
              onClick={() => addAdjustmentMutation.mutate({ description: adjustmentDesc, amount: parseFloat(adjustmentAmount) || 0 })}
              disabled={!adjustmentDesc || !adjustmentAmount}
              data-testid="button-confirm-adjustment"
            >
              Add Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateView({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [bankStatementBalance, setBankStatementBalance] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/trust/reconciliation", {
        name,
        bankAccountName,
        periodStart,
        periodEnd,
        bankStatementBalance: parseFloat(bankStatementBalance) || 0,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Reconciliation batch created" });
      onCreated(data.id);
    },
    onError: () => toast({ title: "Failed to create batch", variant: "destructive" }),
  });

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6" data-testid="trust-reconciliation-create">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-create">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Create a new three-way reconciliation batch</p>
        </div>
      </div>

      <Card data-testid="card-create-form">
        <CardHeader>
          <CardTitle className="text-lg">Batch Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., January 2025 Reconciliation"
                data-testid="input-batch-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Account</label>
              <Input
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="e.g., IOLTA Trust Account - First Bank"
                data-testid="input-bank-account"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Period Start</label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                data-testid="input-period-start"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Period End</label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                data-testid="input-period-end"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Statement Balance</label>
              <Input
                type="number"
                step="0.01"
                value={bankStatementBalance}
                onChange={(e) => setBankStatementBalance(e.target.value)}
                placeholder="0.00"
                data-testid="input-bank-balance"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onBack} data-testid="button-cancel-create">Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name || !bankAccountName || !periodStart || !periodEnd || !bankStatementBalance}
              data-testid="button-submit-create"
            >
              Create Batch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrustReconciliationPage() {
  const [view, setView] = useState<"dashboard" | "create" | "detail">("dashboard");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  if (view === "create") {
    return (
      <CreateView
        onBack={() => setView("dashboard")}
        onCreated={(id) => {
          setSelectedBatchId(id);
          setView("detail");
        }}
      />
    );
  }

  if (view === "detail" && selectedBatchId) {
    return (
      <DetailView
        batchId={selectedBatchId}
        onBack={() => {
          setSelectedBatchId(null);
          setView("dashboard");
        }}
      />
    );
  }

  return (
    <DashboardView
      onSelect={(id) => {
        setSelectedBatchId(id);
        setView("detail");
      }}
      onCreate={() => setView("create")}
    />
  );
}

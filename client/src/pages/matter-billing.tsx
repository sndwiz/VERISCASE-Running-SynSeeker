import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
  Landmark,
  ArrowLeft,
  Receipt,
  Briefcase,
} from "lucide-react";
import type { Invoice, Expense, TrustTransaction, Matter, Client, TimeEntry } from "@shared/schema";

interface BillingSummary {
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
  wip: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  totalExpenses: number;
  billableExpenses: number;
  trustBalance: number;
  trustDeposits: number;
  trustWithdrawals: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  overdueInvoiceCount: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function invoiceStatusBadge(status: string) {
  const variant = status === "overdue" ? "destructive" : status === "paid" ? "default" : "secondary";
  return <Badge variant={variant as any}>{status.replace("-", " ")}</Badge>;
}

export default function MatterBillingPage() {
  const { matterId } = useParams<{ matterId: string }>();

  const { data: matter, isLoading: loadingMatter } = useQuery<Matter>({
    queryKey: ["/api/matters", matterId],
    enabled: !!matterId,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", matter?.clientId],
    enabled: !!matter?.clientId,
  });

  const { data: summary, isLoading: loadingSummary } = useQuery<BillingSummary>({
    queryKey: [`/api/billing/summary?matterId=${matterId}`],
    enabled: !!matterId,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: [`/api/invoices?matterId=${matterId}`],
    enabled: !!matterId,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: [`/api/expenses?matterId=${matterId}`],
    enabled: !!matterId,
  });

  const { data: trustTx = [], isLoading: loadingTrust } = useQuery<TrustTransaction[]>({
    queryKey: [`/api/trust-transactions?matterId=${matterId}`],
    enabled: !!matterId,
  });

  const { data: timeEntries = [], isLoading: loadingTime } = useQuery<TimeEntry[]>({
    queryKey: [`/api/time-entries?matterId=${matterId}`],
    enabled: !!matterId,
  });

  if (loadingSummary || loadingMatter) {
    return (
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const s = summary!;
  const collectionPct = s.totalBilled > 0 ? (s.totalPaid / s.totalBilled) * 100 : 0;

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6" data-testid="matter-billing-page">
      <div className="flex items-center gap-4 flex-wrap">
        {client && (
          <Link href={`/clients/${client.id}/billing`}>
            <Button variant="ghost" size="sm" data-testid="button-back-to-client-billing">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{client.name}</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
            <h1 className="text-xl md:text-2xl font-semibold truncate" data-testid="text-matter-billing-title">
              {matter?.name || "Matter"} - Billing
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-7">
            {client?.name || ""} {matter?.caseNumber ? `| ${matter.caseNumber}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card data-testid="card-matter-wip">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Work in Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(s.wip)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {s.billableHours.toFixed(1)} billable / {s.totalHours.toFixed(1)} total hours
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-matter-billed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(s.totalBilled)}</div>
            <p className="text-xs text-muted-foreground mt-1">{s.invoiceCount} invoices issued</p>
          </CardContent>
        </Card>

        <Card data-testid="card-matter-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(s.totalPaid)}</div>
            <div className="mt-2">
              <Progress value={collectionPct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{collectionPct.toFixed(0)}% collection rate</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-matter-outstanding">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(s.outstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">balance due from client</p>
          </CardContent>
        </Card>

        <Card data-testid="card-matter-expenses">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(s.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(s.billableExpenses)} billable</p>
          </CardContent>
        </Card>

        <Card data-testid="card-matter-trust">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trust Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(s.trustBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">IOLTA retainer</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="time" data-testid="matter-billing-tabs">
        <TabsList>
          <TabsTrigger value="time" data-testid="tab-matter-time">Time ({timeEntries.length})</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-matter-invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-matter-expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="trust" data-testid="tab-matter-trust">Trust ({trustTx.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="time" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Attorney</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTime ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6" /></TableCell></TableRow>
                    ))
                  ) : timeEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No time entries for this matter
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeEntries.map((te) => (
                      <TableRow key={te.id} data-testid={`row-time-${te.id}`}>
                        <TableCell>{formatDate(te.date)}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{te.description}</TableCell>
                        <TableCell>{te.userName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={te.billableStatus === "billable" ? "default" : "secondary"}>
                            {te.billableStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{te.hours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(te.hourlyRate || 0)}/hr</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(te.hours * (te.hourlyRate || 0))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingInvoices ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6" /></TableCell></TableRow>
                    ))
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No invoices for this matter
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => (
                      <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(inv.issueDate)}</TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {inv.balanceDue > 0 ? formatCurrency(inv.balanceDue) : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExpenses ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6" /></TableCell></TableRow>
                    ))
                  ) : expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No expenses for this matter
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((exp) => (
                      <TableRow key={exp.id} data-testid={`row-expense-${exp.id}`}>
                        <TableCell>{formatDate(exp.date)}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{exp.description}</TableCell>
                        <TableCell><Badge variant="secondary">{exp.category.replace("-", " ")}</Badge></TableCell>
                        <TableCell>{exp.vendor || "-"}</TableCell>
                        <TableCell>
                          {exp.billable ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(exp.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trust" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTrust ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6" /></TableCell></TableRow>
                    ))
                  ) : trustTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No trust transactions for this matter
                      </TableCell>
                    </TableRow>
                  ) : (
                    trustTx.map((tx) => {
                      const isDebit = tx.type === "withdrawal" || tx.type === "transfer-out" || tx.type === "fee";
                      return (
                        <TableRow key={tx.id} data-testid={`row-trust-${tx.id}`}>
                          <TableCell>{formatDate(tx.date)}</TableCell>
                          <TableCell>
                            <Badge variant={isDebit ? "destructive" : "default"}>{tx.type.replace("-", " ")}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{tx.description || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{tx.reference || "-"}</TableCell>
                          <TableCell className={`text-right font-medium ${isDebit ? "text-destructive" : ""}`}>
                            {isDebit ? "-" : "+"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(tx.runningBalance)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

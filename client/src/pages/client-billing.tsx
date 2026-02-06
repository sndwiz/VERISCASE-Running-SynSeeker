import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Receipt,
} from "lucide-react";
import type { Invoice, Expense, Payment, TrustTransaction, Client, Matter } from "@shared/schema";

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

export default function ClientBillingPage() {
  const { clientId } = useParams<{ clientId: string }>();

  const { data: client, isLoading: loadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const clientMatters = matters.filter(m => m.clientId === clientId);

  const { data: summary, isLoading: loadingSummary } = useQuery<BillingSummary>({
    queryKey: [`/api/billing/summary?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: [`/api/invoices?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: [`/api/expenses?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery<Payment[]>({
    queryKey: [`/api/payments?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const { data: trustTx = [], isLoading: loadingTrust } = useQuery<TrustTransaction[]>({
    queryKey: [`/api/trust-transactions?clientId=${clientId}`],
    enabled: !!clientId,
  });

  if (loadingSummary || loadingClient) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const s = summary!;

  const kpiCards = [
    { title: "Work in Progress", value: formatCurrency(s.wip), icon: Clock, description: `${s.billableHours.toFixed(1)} hrs billable` },
    { title: "Total Billed", value: formatCurrency(s.totalBilled), icon: FileText, description: `${s.invoiceCount} invoices` },
    { title: "Collected", value: formatCurrency(s.totalPaid), icon: DollarSign, description: `${s.paidInvoiceCount} paid` },
    { title: "Outstanding", value: formatCurrency(s.outstanding), icon: TrendingUp, description: `balance due` },
    { title: "Overdue", value: formatCurrency(s.overdue), icon: AlertTriangle, description: `${s.overdueInvoiceCount} overdue` },
    { title: "Trust Balance", value: formatCurrency(s.trustBalance), icon: Landmark, description: "IOLTA" },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="client-billing-page">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/billing">
          <Button variant="ghost" size="sm" data-testid="button-back-to-billing">
            <ArrowLeft className="h-4 w-4 mr-1" />
            All Billing
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold truncate" data-testid="text-client-billing-title">
            {client?.name || "Client"} - Billing
          </h1>
          <p className="text-sm text-muted-foreground">{clientMatters.length} active matters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} data-testid={`card-client-kpi-${card.title.toLowerCase().replace(/\s/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {clientMatters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matters</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientMatters.map((m) => (
                  <TableRow key={m.id} data-testid={`row-matter-${m.id}`}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/matters/${m.id}/billing`}>
                        <Button variant="ghost" size="sm" data-testid={`button-matter-billing-${m.id}`}>
                          <Receipt className="h-3 w-3 mr-1" />
                          Billing
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="invoices" data-testid="client-billing-tabs">
        <TabsList>
          <TabsTrigger value="invoices" data-testid="tab-client-invoices">Invoices</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-client-expenses">Expenses</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-client-payments">Payments</TabsTrigger>
          <TabsTrigger value="trust" data-testid="tab-client-trust">Trust</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
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
                        No invoices for this client
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExpenses ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6" /></TableCell></TableRow>
                    ))
                  ) : expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No expenses for this client
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((exp) => (
                      <TableRow key={exp.id} data-testid={`row-expense-${exp.id}`}>
                        <TableCell>{formatDate(exp.date)}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{exp.description}</TableCell>
                        <TableCell><Badge variant="secondary">{exp.category.replace("-", " ")}</Badge></TableCell>
                        <TableCell>{exp.vendor || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(exp.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayments ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6" /></TableCell></TableRow>
                    ))
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No payments for this client
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((pay) => (
                      <TableRow key={pay.id} data-testid={`row-payment-${pay.id}`}>
                        <TableCell>{formatDate(pay.date)}</TableCell>
                        <TableCell><Badge variant="secondary">{pay.method}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{pay.reference || "-"}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{pay.notes || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(pay.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trust" className="mt-4">
          <Card>
            <CardContent className="p-0">
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
                        No trust transactions for this client
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

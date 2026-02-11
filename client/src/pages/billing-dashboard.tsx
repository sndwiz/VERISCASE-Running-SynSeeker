import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  CreditCard,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ExternalLink,
} from "lucide-react";
import type { Invoice, Expense, Payment, TrustTransaction, Client } from "@shared/schema";

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
  const map: Record<string, string> = {
    draft: "secondary",
    sent: "default",
    viewed: "default",
    "partially-paid": "default",
    paid: "default",
    overdue: "destructive",
    void: "secondary",
    "write-off": "secondary",
  };
  return (
    <Badge variant={map[status] as any || "secondary"} data-testid={`badge-invoice-status-${status}`}>
      {status.replace("-", " ")}
    </Badge>
  );
}

export default function BillingDashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery<BillingSummary>({
    queryKey: ["/api/billing/summary"],
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: trustTx = [] } = useQuery<TrustTransaction[]>({
    queryKey: ["/api/trust-transactions"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const clientMap = new Map(clients.map(c => [c.id, c.name]));

  if (loadingSummary) {
    return (
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const s = summary!;

  const kpiCards = [
    { title: "Work in Progress", value: formatCurrency(s.wip), icon: Clock, description: `${s.billableHours.toFixed(1)} billable hours`, trend: "neutral" as const },
    { title: "Total Billed", value: formatCurrency(s.totalBilled), icon: FileText, description: `${s.invoiceCount} invoices`, trend: "up" as const },
    { title: "Total Collected", value: formatCurrency(s.totalPaid), icon: DollarSign, description: `${s.paidInvoiceCount} paid invoices`, trend: "up" as const },
    { title: "Outstanding", value: formatCurrency(s.outstanding), icon: TrendingUp, description: `${s.invoiceCount - s.paidInvoiceCount} unpaid`, trend: "neutral" as const },
    { title: "Overdue", value: formatCurrency(s.overdue), icon: AlertTriangle, description: `${s.overdueInvoiceCount} overdue invoices`, trend: "down" as const },
    { title: "Total Expenses", value: formatCurrency(s.totalExpenses), icon: Receipt, description: `${formatCurrency(s.billableExpenses)} billable`, trend: "neutral" as const },
    { title: "Trust Balance", value: formatCurrency(s.trustBalance), icon: Landmark, description: `IOLTA accounts`, trend: "neutral" as const },
    { title: "Collection Rate", value: s.totalBilled > 0 ? `${((s.totalPaid / s.totalBilled) * 100).toFixed(0)}%` : "N/A", icon: CreditCard, description: "of billed collected", trend: s.totalBilled > 0 && s.totalPaid / s.totalBilled > 0.7 ? "up" as const : "down" as const },
  ];

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6" data-testid="billing-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-billing-title">Firm Billing Dashboard</h1>
          <p className="text-sm text-muted-foreground">Financial overview across all clients and matters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} data-testid={`card-kpi-${card.title.toLowerCase().replace(/\s/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {card.trend === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                {card.trend === "down" && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="invoices" data-testid="billing-tabs">
        <TabsList>
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="trust" data-testid="tab-trust">Trust Account ({trustTx.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingInvoices ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>
                          <Link href={`/client-dashboard/${inv.clientId}`} className="text-primary hover:underline">
                            {clientMap.get(inv.clientId) || inv.clientId}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(inv.issueDate)}</TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.paidAmount)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {inv.balanceDue > 0 ? formatCurrency(inv.balanceDue) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
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
                    <TableHead>Client</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id} data-testid={`row-expense-${exp.id}`}>
                      <TableCell>{formatDate(exp.date)}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{exp.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{exp.category.replace("-", " ")}</Badge>
                      </TableCell>
                      <TableCell>{clientMap.get(exp.clientId) || "-"}</TableCell>
                      <TableCell>{exp.vendor || "-"}</TableCell>
                      <TableCell>{exp.billable ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(exp.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((pay) => (
                    <TableRow key={pay.id} data-testid={`row-payment-${pay.id}`}>
                      <TableCell>{formatDate(pay.date)}</TableCell>
                      <TableCell>{clientMap.get(pay.clientId) || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pay.method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{pay.reference || "-"}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{pay.notes || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(pay.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
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
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trustTx.map((tx) => {
                    const isDebit = tx.type === "withdrawal" || tx.type === "transfer-out" || tx.type === "fee";
                    return (
                      <TableRow key={tx.id} data-testid={`row-trust-${tx.id}`}>
                        <TableCell>{formatDate(tx.date)}</TableCell>
                        <TableCell>{clientMap.get(tx.clientId) || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={isDebit ? "destructive" : "default"}>
                            {tx.type.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">{tx.description || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{tx.reference || "-"}</TableCell>
                        <TableCell className={`text-right font-medium ${isDebit ? "text-destructive" : ""}`}>
                          {isDebit ? "-" : "+"}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.runningBalance)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {trustTx.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No trust transactions found
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
    </div>
  );
}

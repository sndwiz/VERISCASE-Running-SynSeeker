import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  EyeOff,
  X,
  MoreHorizontal,
  Columns3,
  FileText,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

interface ReportColumn {
  key: string;
  label: string;
  type: "string" | "number" | "currency" | "date" | "badge";
}

interface ReportCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryColor: string;
  columns: ReportColumn[];
}

interface ReportData {
  summary: Record<string, { label: string; value: string; prefix?: string }>;
  columns: ReportColumn[];
  rows: any[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatCurrency(val: number): string {
  return `$${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatDate(val: string): string {
  if (!val || val === "-") return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}


function CategoryBadge({ category, categoryColor }: { category: string; categoryColor: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${categoryColor}`}>
      {category}
    </span>
  );
}

function renderCellValue(value: any, type: string) {
  if (value == null || value === undefined) return "-";
  switch (type) {
    case "currency":
      return formatCurrency(Number(value));
    case "date":
      return formatDate(String(value));
    case "badge":
      return <Badge variant="secondary" className="no-default-active-elevate">{String(value).replace(/-/g, " ")}</Badge>;
    case "number":
      return String(value);
    default:
      return String(value);
  }
}

const CATEGORIES = ["All", "Billing", "Productivity", "Cases", "AI Operations", "Compliance"];

function ReportCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [previewReport, setPreviewReport] = useState<ReportCatalogItem | null>(null);
  const [, setLocation] = useLocation();

  const { data: catalog = [], isLoading } = useQuery<ReportCatalogItem[]>({
    queryKey: ["/api/reports/catalog"],
  });

  const { data: previewData, isLoading: previewLoading } = useQuery<ReportData>({
    queryKey: ["/api/reports", previewReport?.id, "data", { pageSize: 5 }],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${previewReport!.id}/data?pageSize=5`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load preview");
      return res.json();
    },
    enabled: !!previewReport,
  });

  const filtered = useMemo(() => {
    let items = catalog;
    if (activeCategory !== "All") {
      items = items.filter((r) => r.category === activeCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(term) || r.description.toLowerCase().includes(term));
    }
    return items;
  }, [catalog, activeCategory, searchTerm]);

  if (isLoading) {
    return (
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6" data-testid="reports-catalog">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-reports-title">Reports</h1>
        <p className="text-sm text-muted-foreground">Pre-built reports across billing, productivity, cases, AI operations, and compliance</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-start">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reports..."
            className="pl-9 w-64"
            data-testid="input-search-reports"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 justify-start">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              data-testid={`button-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={viewMode === "card" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("card")}
            data-testid="button-view-card"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((report) => (
            <Card key={report.id} data-testid={`card-report-${report.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="space-y-1 min-w-0">
                  <Link href={`/reports/${report.id}`}>
                    <CardTitle className="text-sm font-medium cursor-pointer hover:underline" data-testid={`link-report-${report.id}`}>
                      {report.name}
                    </CardTitle>
                  </Link>
                  <CategoryBadge category={report.category} categoryColor={report.categoryColor} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid={`button-menu-${report.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLocation(`/reports/${report.id}`)} data-testid={`menu-open-${report.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPreviewReport(report)} data-testid={`menu-preview-${report.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewReport(report)}
                  data-testid={`button-preview-${report.id}`}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No reports match your search
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((report) => (
                  <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                    <TableCell>
                      <Link href={`/reports/${report.id}`} className="font-medium hover:underline" data-testid={`link-report-table-${report.id}`}>
                        {report.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={report.category} categoryColor={report.categoryColor} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-md truncate">{report.description}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setPreviewReport(report)} data-testid={`button-preview-table-${report.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Preview
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No reports match your search</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!previewReport} onOpenChange={(open) => !open && setPreviewReport(null)}>
        <DialogContent className="max-w-3xl" data-testid="dialog-preview">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap justify-start">
              <FileText className="h-5 w-5" />
              {previewReport?.name}
              {previewReport && <CategoryBadge category={previewReport.category} categoryColor={previewReport.categoryColor} />}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{previewReport?.description}</p>
          {previewLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : previewData ? (
            <div className="overflow-auto max-h-80 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData.columns.slice(0, 6).map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.rows.slice(0, 5).map((row, idx) => (
                    <TableRow key={idx}>
                      {previewData.columns.slice(0, 6).map((col) => (
                        <TableCell key={col.key}>{renderCellValue(row[col.key], col.type)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {previewData.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewReport(null)} data-testid="button-close-preview">
              Close
            </Button>
            <Button onClick={() => { setPreviewReport(null); setLocation(`/reports/${previewReport?.id}`); }} data-testid="button-open-report">
              Open Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportDetail({ reportId }: { reportId: string }) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterText, setFilterText] = useState("");
  const [showColumnSidebar, setShowColumnSidebar] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  const { data: catalog = [] } = useQuery<ReportCatalogItem[]>({
    queryKey: ["/api/reports/catalog"],
  });

  const reportMeta = catalog.find((r) => r.id === reportId);

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (sortDir) queryParams.set("sortDir", sortDir);
  if (filterText.trim()) queryParams.set("filter", filterText.trim());

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/reports", reportId, "data", { page, pageSize, sortBy, sortDir, filter: filterText }],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/data?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleColumns = useMemo(() => {
    return (data?.columns || []).filter((c) => !hiddenColumns.has(c.key));
  }, [data?.columns, hiddenColumns]);

  const exportCsv = () => {
    if (!data) return;
    const cols = visibleColumns;
    const header = cols.map((c) => c.label).join(",");
    const rows = data.rows.map((row) =>
      cols.map((c) => {
        const val = row[c.key];
        if (val == null) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportId}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, data?.totalRows || 0);

  return (
    <div className="flex h-full" data-testid="report-detail">
      <div className="flex-1 overflow-auto p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-wrap items-center gap-2 justify-start text-sm text-muted-foreground">
          <Link href="/reports" className="hover:underline" data-testid="link-reports-breadcrumb">Reports</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{reportMeta?.name || reportId}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 justify-start">
            <h1 className="text-2xl font-semibold" data-testid="text-report-name">{reportMeta?.name || reportId}</h1>
            {reportMeta && <CategoryBadge category={reportMeta.category} categoryColor={reportMeta.categoryColor} />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2 justify-start">
            <Badge variant="secondary" className="no-default-active-elevate gap-1">
              <Columns3 className="h-3 w-3" />
              {visibleColumns.length} Columns
            </Badge>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filterText}
                onChange={(e) => { setFilterText(e.target.value); setPage(1); }}
                placeholder="Filter data..."
                className="pl-8 w-48"
                data-testid="input-filter-report"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-export">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCsv} data-testid="menu-export-csv">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnSidebar(!showColumnSidebar)}
              data-testid="button-toggle-columns"
            >
              <Columns3 className="h-3.5 w-3.5 mr-1.5" />
              Columns
            </Button>
          </div>
        </div>

        {data?.summary && Object.keys(data.summary).length > 0 && (
          <Card data-testid="card-summary">
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(data.summary).map(([key, item]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xl font-semibold" data-testid={`text-summary-${key}`}>
                      {item.prefix}{item.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : data ? (
          <>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.map((col) => (
                          <TableHead
                            key={col.key}
                            className="cursor-pointer select-none"
                            onClick={() => handleSort(col.key)}
                            data-testid={`header-${col.key}`}
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              {sortBy === col.key ? (
                                sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((row, idx) => (
                        <TableRow key={idx} data-testid={`row-data-${idx}`}>
                          {visibleColumns.map((col) => (
                            <TableCell key={col.key}>{renderCellValue(row[col.key], col.type)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {data.rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                            No data available for this report
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {data.totalRows > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                  {startRow}-{endRow} of {data.totalRows}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (data.totalPages || 1)}
                    onClick={() => setPage(page + 1)}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {showColumnSidebar && (
        <Card className="w-64 shrink-0 border-l rounded-none h-full overflow-auto" data-testid="card-column-sidebar">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 py-3 px-4">
            <CardTitle className="text-sm">Columns</CardTitle>
            <Button variant="outline" size="icon" onClick={() => setShowColumnSidebar(false)} data-testid="button-close-columns">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {(data?.columns || []).map((col) => (
              <div key={col.key} className="flex items-center gap-2 py-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleColumn(col.key)}
                  data-testid={`button-toggle-col-${col.key}`}
                >
                  {hiddenColumns.has(col.key) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <span className={`text-sm ${hiddenColumns.has(col.key) ? "text-muted-foreground line-through" : ""}`}>
                  {col.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [matchDetail, params] = useRoute("/reports/:reportId");

  if (matchDetail && params?.reportId) {
    return <ReportDetail reportId={params.reportId} />;
  }

  return <ReportCatalog />;
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search,
  Users,
  Briefcase,
  UserCheck,
  CheckSquare,
  LayoutGrid,
  Clock,
  Shield,
  FileText,
  Calendar,
  MessageSquare,
  Network,
  File,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  matterId?: string | null;
  clientId?: string | null;
  url: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Users; color: string }> = {
  clients: { label: "Clients", icon: Users, color: "text-blue-500" },
  matters: { label: "Matters", icon: Briefcase, color: "text-purple-500" },
  mattercontacts: { label: "Contacts", icon: UserCheck, color: "text-teal-500" },
  tasks: { label: "Tasks", icon: CheckSquare, color: "text-amber-500" },
  boards: { label: "Boards", icon: LayoutGrid, color: "text-indigo-500" },
  timeentries: { label: "Time Entries", icon: Clock, color: "text-green-500" },
  evidence: { label: "Evidence", icon: Shield, color: "text-red-500" },
  invoices: { label: "Invoices", icon: FileText, color: "text-orange-500" },
  calendar: { label: "Calendar", icon: Calendar, color: "text-cyan-500" },
  threads: { label: "Threads", icon: MessageSquare, color: "text-pink-500" },
  detective: { label: "Detective", icon: Network, color: "text-violet-500" },
  files: { label: "Files", icon: File, color: "text-slate-500" },
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight || !text) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const typesParam = selectedTypes.size > 0 ? Array.from(selectedTypes).join(",") : "";

  const { data: results = [], isLoading, isFetching } = useQuery<SearchResult[]>({
    queryKey: ["/api/search", debouncedQuery, typesParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("q", debouncedQuery);
      if (typesParam) params.set("types", typesParam);
      params.set("limit", "30");
      const res = await fetch(`/api/search?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const toggleType = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const showLoading = isLoading && debouncedQuery.length >= 2;
  const showEmpty = !isLoading && debouncedQuery.length >= 2 && results.length === 0;
  const showResults = results.length > 0;

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold mb-1" data-testid="text-search-title">
          Global Search
        </h1>
        <p className="text-sm text-muted-foreground">
          Search across all clients, matters, tasks, documents, and more
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients, matters, tasks, documents..."
          className="pl-10 pr-10 text-base"
          data-testid="input-global-search"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setQuery("")}
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" data-testid="search-type-filters">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          const active = selectedTypes.has(type);
          return (
            <Badge
              key={type}
              variant={active ? "default" : "outline"}
              className={`cursor-pointer toggle-elevate ${active ? "toggle-elevated" : ""}`}
              onClick={() => toggleType(type)}
              data-testid={`filter-type-${type}`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          );
        })}
      </div>

      {isFetching && debouncedQuery.length >= 2 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
          Searching...
        </div>
      )}

      {showLoading && (
        <div className="space-y-3" data-testid="search-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-md shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showEmpty && (
        <div className="text-center py-12" data-testid="search-empty">
          <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground font-medium">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term or adjust your filters
          </p>
        </div>
      )}

      {!debouncedQuery && (
        <div className="text-center py-12" data-testid="search-initial">
          <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground font-medium">Start typing to search</p>
          <p className="text-sm text-muted-foreground mt-1">
            Search across all entities in your workspace
          </p>
        </div>
      )}

      {showResults && (
        <div className="space-y-2" data-testid="search-results">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((result) => {
            const config = TYPE_CONFIG[result.type] || {
              label: result.type,
              icon: File,
              color: "text-muted-foreground",
            };
            const Icon = config.icon;
            return (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.url}
                className="block"
              >
                <Card className="hover-elevate cursor-pointer" data-testid={`search-result-${result.type}-${result.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-md bg-muted shrink-0 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate" data-testid={`result-title-${result.id}`}>
                            <HighlightedText text={result.title} highlight={debouncedQuery} />
                          </span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {config.label}
                          </Badge>
                        </div>
                        {result.subtitle && (
                          <p className="text-sm text-muted-foreground mt-0.5 truncate" data-testid={`result-subtitle-${result.id}`}>
                            <HighlightedText text={result.subtitle} highlight={debouncedQuery} />
                          </p>
                        )}
                        {result.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`result-description-${result.id}`}>
                            <HighlightedText
                              text={result.description.slice(0, 200)}
                              highlight={debouncedQuery}
                            />
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

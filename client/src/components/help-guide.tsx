import { useState } from "react";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  HelpCircle,
  Search,
  ChevronRight,
  ArrowRight,
  Bot,
  BookOpen,
  Rocket,
  X,
} from "lucide-react";
import {
  FEATURE_METADATA,
  QUICK_START_STEPS,
  searchFeatures,
  type FeatureInfo,
} from "@/lib/feature-metadata";

function FeatureCard({
  feature,
  onClose,
}: {
  feature: FeatureInfo;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = feature.icon;

  return (
    <Card className="mb-2">
      <CardHeader
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
          <CardTitle className="text-sm font-medium flex-1">
            {feature.title}
          </CardTitle>
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="px-3 pb-3 pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            {feature.description}
          </p>
          {feature.howToSteps.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium mb-2 text-foreground">
                How to use:
              </p>
              <ol className="space-y-1.5">
                {feature.howToSteps.map((step, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex gap-2"
                  >
                    <span className="text-primary font-medium shrink-0">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {feature.route && (
              <Link href={feature.route} onClick={onClose}>
                <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid={`help-goto-${feature.id}`}>
                  Go to {feature.title}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
            <Link
              href={`/ai-chat?prompt=How do I use ${feature.title} in VERICASE?`}
              onClick={onClose}
            >
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                data-testid={`help-ask-${feature.id}`}
              >
                <Bot className="h-3 w-3" />
                Ask VeriBot
              </Button>
            </Link>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function HelpGuide() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"guide" | "quickstart">("guide");

  const filteredFeatures = searchFeatures(search);

  const categories = [
    {
      label: "Dashboard & Tools",
      features: filteredFeatures.filter((f) => f.category === "dashboard"),
    },
    {
      label: "AI & Investigation",
      features: filteredFeatures.filter(
        (f) => f.category === "ai-investigation"
      ),
    },
    {
      label: "Legal Practice",
      features: filteredFeatures.filter((f) => f.category === "legal-practice"),
    },
    {
      label: "System",
      features: filteredFeatures.filter((f) => f.category === "system"),
    },
  ].filter((cat) => cat.features.length > 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-help-guide"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Help guide - learn how to use VERICASE</TooltipContent>
      </Tooltip>
      <SheetContent className="w-[400px] sm:w-[440px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              VERICASE Help Guide
            </SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Learn how to use every feature in your Legal Practice OS
          </p>
        </SheetHeader>

        <div className="px-4 pt-3 shrink-0 space-y-3">
          <div className="flex gap-1">
            <Button
              variant={activeTab === "guide" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("guide")}
              data-testid="help-tab-guide"
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              Feature Guide
            </Button>
            <Button
              variant={activeTab === "quickstart" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("quickstart")}
              data-testid="help-tab-quickstart"
            >
              <Rocket className="h-3.5 w-3.5 mr-1" />
              Quick Start
            </Button>
          </div>

          {activeTab === "guide" && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                data-testid="input-help-search"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          {activeTab === "quickstart" && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">
                  Get Started with VERICASE
                </h3>
                <p className="text-xs text-muted-foreground">
                  Follow these steps to set up your legal practice in VERICASE.
                  Each step builds on the previous one.
                </p>
              </div>
              {QUICK_START_STEPS.map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t mt-4">
                <Link href="/ai-chat" onClick={() => setOpen(false)}>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full gap-2"
                    data-testid="help-ask-veribot-quickstart"
                  >
                    <Bot className="h-4 w-4" />
                    Ask VeriBot for Help
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {activeTab === "guide" && (
            <div className="space-y-4">
              {search && filteredFeatures.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No features found for "{search}"
                  </p>
                  <Link
                    href={`/ai-chat?prompt=How do I ${search} in VERICASE?`}
                    onClick={() => setOpen(false)}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                    >
                      <Bot className="h-3 w-3" />
                      Ask VeriBot about "{search}"
                    </Button>
                  </Link>
                </div>
              )}
              {categories.map((cat) => (
                <div key={cat.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat.label}
                    </h3>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {cat.features.length}
                    </Badge>
                  </div>
                  {cat.features.map((feature) => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

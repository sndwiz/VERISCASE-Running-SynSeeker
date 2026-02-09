import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Zap, 
  AlertCircle,
  Loader2,
  Bot,
  Sparkles,
  Smartphone,
  Brain,
} from "lucide-react";
import { SiSlack, SiGmail } from "react-icons/si";
import type { AutomationTemplate } from "./automation-templates";

export function AIIcon({ className }: { className?: string }) {
  return (
    <div className={`p-2.5 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 ${className}`}>
      <Sparkles className="h-5 w-5 text-white" />
    </div>
  );
}

export function TemplateCard({ 
  template, 
  onUse 
}: { 
  template: AutomationTemplate; 
  onUse: (template: AutomationTemplate) => void;
}) {
  const getIcon = () => {
    if (template.isAI || template.icon === "sparkles") {
      return <AIIcon />;
    }
    if (template.icon === "slack") {
      return (
        <div className="p-2.5 rounded-lg bg-white">
          <SiSlack className="h-5 w-5 text-[#4A154B]" />
        </div>
      );
    }
    if (template.icon === "gmail") {
      return (
        <div className="p-2.5 rounded-lg bg-white">
          <SiGmail className="h-5 w-5 text-[#EA4335]" />
        </div>
      );
    }
    if (template.icon === "sms") {
      return (
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
          <Smartphone className="h-5 w-5 text-white" />
        </div>
      );
    }
    return (
      <div className="p-2.5 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600">
        <Zap className="h-5 w-5 text-white" />
      </div>
    );
  };

  const formatName = (name: string) => {
    const aiActions = [
      "use AI",
      "summarize text",
      "categorize",
      "detect language",
      "translate text",
      "detect sentiment",
      "improve text",
      "extract info",
      "write with AI",
    ];
    
    let result = name;
    
    aiActions.forEach(action => {
      const regex = new RegExp(`\\b${action}\\b`, 'gi');
      result = result.replace(regex, `<span class="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent font-semibold">$&</span>`);
    });
    
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return (
    <Card 
      className="bg-card hover:bg-accent/50 transition-colors cursor-pointer border-border/50"
      data-testid={`template-card-${template.id}`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {getIcon()}
          <p className="text-sm leading-relaxed">
            {formatName(template.name)}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => onUse(template)}
          data-testid={`button-use-template-${template.id}`}
        >
          Use template
        </Button>
      </CardContent>
    </Card>
  );
}

export function FeaturedIntegrationCard({ 
  template, 
  onUse 
}: { 
  template: AutomationTemplate; 
  onUse: (template: AutomationTemplate) => void;
}) {
  const getIcon = () => {
    if (template.icon === "slack") {
      return (
        <div className="p-3 rounded-lg bg-white shrink-0">
          <SiSlack className="h-6 w-6 text-[#4A154B]" />
        </div>
      );
    }
    if (template.icon === "gmail") {
      return (
        <div className="p-3 rounded-lg bg-white shrink-0">
          <SiGmail className="h-6 w-6 text-[#EA4335]" />
        </div>
      );
    }
    if (template.icon === "sms") {
      return (
        <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shrink-0">
          <Smartphone className="h-6 w-6 text-white" />
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors"
      data-testid={`featured-integration-${template.id}`}
    >
      {getIcon()}
      <p className="flex-1 text-sm font-medium">
        {template.name.replace(/_+/g, (match) => (
          <span className="underline decoration-dotted">{match}</span>
        ) as unknown as string)}
      </p>
      <Button 
        size="sm" 
        onClick={() => onUse(template)}
        data-testid={`button-add-${template.id}`}
      >
        Add
      </Button>
      <button className="text-xs text-primary hover:underline">Learn more</button>
    </div>
  );
}

export function AIAutomationBuilder({ 
  onBuildAutomation,
  suggestedAutomations,
  hasBoardSelected
}: { 
  onBuildAutomation: (prompt: string) => void;
  suggestedAutomations: Array<{ prompt: string; description: string; confidence: number }>;
  hasBoardSelected: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);

  const handleBuild = () => {
    if (!prompt.trim()) return;
    setIsBuilding(true);
    onBuildAutomation(prompt);
    setTimeout(() => setIsBuilding(false), 1500);
  };

  const handleUseSuggestion = (suggestion: { prompt: string }) => {
    setPrompt(suggestion.prompt);
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shrink-0">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Automation Builder
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Describe what you want to automate in plain language. AI will analyze your request and create a draft automation that you can customize.
              </p>
            </div>

            {!hasBoardSelected && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Please select a board first to create automations
              </div>
            )}
            
            <div className="flex gap-2">
              <Textarea
                placeholder="Example: When a case status changes to 'Ready for Review', notify the senior attorney and request their approval..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={!hasBoardSelected}
                data-testid="input-ai-automation-prompt"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleBuild}
                disabled={!prompt.trim() || isBuilding || !hasBoardSelected}
                className="gap-2"
                data-testid="button-build-automation"
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Build Automation Draft
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Creates a draft automation for you to review and customize
              </span>
            </div>

            {suggestedAutomations.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Suggested Automations Based on Your Patterns
                </h4>
                <div className="space-y-2">
                  {suggestedAutomations.map((suggestion, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      data-testid={`suggestion-${idx}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{suggestion.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{suggestion.prompt}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {Math.round(suggestion.confidence * 100)}% match
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="shrink-0"
                        onClick={() => handleUseSuggestion(suggestion)}
                        disabled={!hasBoardSelected}
                        data-testid={`button-use-suggestion-${idx}`}
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

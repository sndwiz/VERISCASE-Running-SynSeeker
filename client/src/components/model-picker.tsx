import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Cpu, Cloud, Lock, Wifi, WifiOff } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface ModelEntry {
  modelId: string;
  displayName: string;
  provider: string;
  providerType: string;
  dataPolicy: string;
  requiresInternet: boolean;
  costHint: string;
  latencyHint: string;
  supportsVision: boolean;
  available: boolean;
  isLocal: boolean;
  allowedInBatmode: boolean;
}

interface PolicyState {
  mode: string;
  selectedModelId: string;
  modeLabel: string;
  decision?: {
    allowed: boolean;
    effectiveModelId: string;
    reason: string;
    wasFallback: boolean;
    requiredSteps: string[];
  };
}

export function ModelPicker() {
  const queryClient = useQueryClient();

  const { data: modelsData } = useQuery<{ models: ModelEntry[]; availableCount: number }>({
    queryKey: ["/api/ai/models"],
  });

  const { data: policyState } = useQuery<PolicyState>({
    queryKey: ["/api/ai/policy/state"],
    refetchInterval: 5000,
  });

  const selectModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const res = await apiRequest("POST", "/api/ai/policy/select-model", { modelId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/policy/state"] });
    },
  });

  const models = modelsData?.models?.filter((m) => m.available) || [];
  const isBatmode = policyState?.mode === "batmode";
  const selectedModel = policyState?.selectedModelId || "claude-sonnet-4-5";

  const currentModel = models.find((m) => m.modelId === selectedModel);
  const effectiveModel = policyState?.decision?.wasFallback
    ? models.find((m) => m.modelId === policyState.decision?.effectiveModelId)
    : currentModel;

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Select
              value={selectedModel}
              onValueChange={(v) => selectModelMutation.mutate(v)}
            >
              <SelectTrigger
                className="h-8 w-[180px] text-xs"
                data-testid="select-ai-model"
              >
                <div className="flex items-center gap-1.5">
                  {currentModel?.isLocal ? (
                    <Lock className="h-3 w-3 text-green-500 shrink-0" />
                  ) : (
                    <Cloud className="h-3 w-3 text-blue-500 shrink-0" />
                  )}
                  <SelectValue placeholder="Select model" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem
                    key={m.modelId}
                    value={m.modelId}
                    data-testid={`model-option-${m.modelId}`}
                  >
                    <div className="flex items-center gap-2">
                      {m.isLocal ? (
                        <Cpu className="h-3 w-3 text-green-500" />
                      ) : (
                        <Cloud className="h-3 w-3 text-blue-500" />
                      )}
                      <span>{m.displayName}</span>
                      {isBatmode && !m.allowedInBatmode && (
                        <WifiOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {policyState?.decision?.wasFallback ? (
            <p className="text-xs">{policyState.decision.reason}</p>
          ) : effectiveModel ? (
            <p className="text-xs">
              {effectiveModel.displayName} ({effectiveModel.provider}) — {effectiveModel.dataPolicy === "local_only" ? "Private/Local" : "External API"}
            </p>
          ) : (
            <p className="text-xs">Select an AI model</p>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function BatmodeBadge() {
  const queryClient = useQueryClient();

  const { data: policyState } = useQuery<PolicyState>({
    queryKey: ["/api/ai/policy/state"],
    refetchInterval: 5000,
  });

  const toggleModeMutation = useMutation({
    mutationFn: async (newMode: string) => {
      const res = await apiRequest("POST", "/api/ai/policy/mode", { mode: newMode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/policy/state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/models"] });
    },
  });

  const isBatmode = policyState?.mode === "batmode";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => toggleModeMutation.mutate(isBatmode ? "online" : "batmode")}
          className="focus:outline-none"
          data-testid="button-toggle-batmode"
        >
          <Badge
            variant={isBatmode ? "destructive" : "outline"}
            className="cursor-pointer gap-1 text-[10px] uppercase tracking-wider font-semibold"
          >
            {isBatmode ? (
              <>
                <WifiOff className="h-3 w-3" />
                Batmode
              </>
            ) : (
              <>
                <Wifi className="h-3 w-3" />
                Online
              </>
            )}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isBatmode
          ? "BATMODE — OFFLINE PRIVATE. No external API calls. Click to go online."
          : "ONLINE — External AI models available. Click to switch to Batmode (offline private)."}
      </TooltipContent>
    </Tooltip>
  );
}

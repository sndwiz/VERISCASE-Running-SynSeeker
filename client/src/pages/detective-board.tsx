import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  FileText,
  User,
  MapPin,
  Calendar,
  Lightbulb,
  StickyNote,
  Plus,
  Trash2,
  Link2,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  XCircle,
  Loader2,
  MousePointer2,
  BarChart3,
  Clock,
  AlertTriangle,
  Network,
  Target,
  TrendingUp,
  Unlink,
  Waypoints,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DetectiveNode {
  id: string;
  matterId: string;
  type: "evidence" | "person" | "location" | "event" | "theory" | "note";
  title: string;
  description: string;
  linkedEvidenceId?: string;
  linkedContactId?: string;
  position: { x: number; y: number };
  color: string;
  icon?: string;
  createdAt: string;
}

interface DetectiveConnection {
  id: string;
  matterId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  connectionType: "related" | "contradicts" | "supports" | "leads-to" | "timeline";
  strength: number;
  notes: string;
  createdAt: string;
}

interface Matter {
  id: string;
  name: string;
  caseNumber: string;
}

const NODE_TYPES = {
  evidence: { icon: FileText, label: "Evidence", defaultColor: "#3b82f6" },
  person: { icon: User, label: "Person", defaultColor: "#8b5cf6" },
  location: { icon: MapPin, label: "Location", defaultColor: "#10b981" },
  event: { icon: Calendar, label: "Event", defaultColor: "#f59e0b" },
  theory: { icon: Lightbulb, label: "Theory", defaultColor: "#ef4444" },
  note: { icon: StickyNote, label: "Note", defaultColor: "#6b7280" },
};

const CONNECTION_TYPES = {
  related: { label: "Related to", color: "#78716c", style: "solid" },
  contradicts: { label: "Contradicts", color: "#dc2626", style: "dashed" },
  supports: { label: "Supports", color: "#16a34a", style: "solid" },
  "leads-to": { label: "Leads to", color: "#d97706", style: "solid" },
  timeline: { label: "Timeline", color: "#2563eb", style: "dotted" },
};

const PIN_COLORS: Record<string, string> = {
  evidence: "#dc2626",
  person: "#2563eb",
  location: "#16a34a",
  event: "#d97706",
  theory: "#dc2626",
  note: "#fbbf24",
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;

function PushPin({ color }: { color: string }) {
  return (
    <div
      className="absolute -top-2 left-1/2 -translate-x-1/2 z-10"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="w-4 h-4 rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color})`,
          boxShadow: `0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(0,0,0,0.2)`,
        }}
      />
      <div
        className="w-0.5 h-2 mx-auto -mt-0.5"
        style={{ backgroundColor: "#555" }}
      />
    </div>
  );
}

function computeAnalytics(nodes: DetectiveNode[], connections: DetectiveConnection[]) {
  const typeCounts: Record<string, number> = {};
  for (const n of nodes) {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
  }

  const connectionTypeCounts: Record<string, number> = {};
  for (const c of connections) {
    connectionTypeCounts[c.connectionType] = (connectionTypeCounts[c.connectionType] || 0) + 1;
  }

  const contradictions = connections.filter(c => c.connectionType === "contradicts").length;

  const degreeMap: Record<string, number> = {};
  for (const c of connections) {
    degreeMap[c.sourceNodeId] = (degreeMap[c.sourceNodeId] || 0) + 1;
    degreeMap[c.targetNodeId] = (degreeMap[c.targetNodeId] || 0) + 1;
  }

  const connectedNodeIds = new Set(Object.keys(degreeMap));
  const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));

  const hubs = Object.entries(degreeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nodeId, degree]) => ({
      node: nodes.find(n => n.id === nodeId),
      degree,
    }))
    .filter(h => h.node);

  const density = nodes.length > 1
    ? connections.length / (nodes.length * (nodes.length - 1) / 2)
    : 0;

  const avgStrength = connections.length > 0
    ? connections.reduce((sum, c) => sum + c.strength, 0) / connections.length
    : 0;

  const timelineConnections = connections.filter(c => c.connectionType === "timeline");
  const locationNodes = nodes.filter(n => n.type === "location");

  function extractDate(text: string): Date | null {
    const patterns = [
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s*\d{2,4}/i,
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{2,4})/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const d = new Date(m[0]);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return null;
  }

  const eventNodes = nodes.filter(n => n.type === "event");
  const orderedTimelineNodes = [...eventNodes].sort((a, b) => {
    const dateA = extractDate(a.title) || extractDate(a.description);
    const dateB = extractDate(b.title) || extractDate(b.description);
    if (dateA && dateB) return dateA.getTime() - dateB.getTime();
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const timelineIssues: string[] = [];

  for (const tc of timelineConnections) {
    const source = nodes.find(n => n.id === tc.sourceNodeId);
    const target = nodes.find(n => n.id === tc.targetNodeId);
    if (source && target) {
      const contradicting = connections.find(
        c => c.connectionType === "contradicts" &&
        ((c.sourceNodeId === source.id || c.targetNodeId === source.id) ||
         (c.sourceNodeId === target.id || c.targetNodeId === target.id))
      );
      if (contradicting) {
        timelineIssues.push(`Timeline between "${source.title}" and "${target.title}" involves contradicted evidence`);
      }
    }
  }

  for (let i = 0; i < orderedTimelineNodes.length - 1; i++) {
    const curr = orderedTimelineNodes[i];
    const next = orderedTimelineNodes[i + 1];
    const currDate = extractDate(curr.title) || extractDate(curr.description);
    const nextDate = extractDate(next.title) || extractDate(next.description);
    if (currDate && nextDate && nextDate.getTime() < currDate.getTime()) {
      timelineIssues.push(`Impossible sequence: "${next.title}" is dated before "${curr.title}" but ordered after it`);
    }
  }

  const personNodes = nodes.filter(n => n.type === "person");
  for (const person of personNodes) {
    const personEvents = orderedTimelineNodes.filter(ev =>
      connections.some(c =>
        (c.sourceNodeId === person.id && c.targetNodeId === ev.id) ||
        (c.targetNodeId === person.id && c.sourceNodeId === ev.id)
      )
    );
    for (let i = 0; i < personEvents.length - 1; i++) {
      const evA = personEvents[i];
      const evB = personEvents[i + 1];
      const getLinkedLocation = (eventNode: DetectiveNode) => {
        const locConn = connections.find(c =>
          (c.sourceNodeId === eventNode.id || c.targetNodeId === eventNode.id) &&
          nodes.find(n => n.id === (c.sourceNodeId === eventNode.id ? c.targetNodeId : c.sourceNodeId))?.type === "location"
        );
        if (!locConn) return null;
        return nodes.find(n => n.id === (locConn.sourceNodeId === eventNode.id ? locConn.targetNodeId : locConn.sourceNodeId));
      };
      const locA = getLinkedLocation(evA);
      const locB = getLinkedLocation(evB);
      if (locA && locB && locA.id !== locB.id) {
        timelineIssues.push(`"${person.title}" must travel from "${locA.title}" to "${locB.title}" between "${evA.title}" and "${evB.title}"`);
      }
    }
  }

  if (personNodes.length === 0 && eventNodes.length > 0 && locationNodes.length > 0) {
    const linkedEvents = timelineConnections.map(tc => {
      const src = nodes.find(n => n.id === tc.sourceNodeId);
      const tgt = nodes.find(n => n.id === tc.targetNodeId);
      return { source: src, target: tgt };
    }).filter(e => e.source && e.target);

    for (const le of linkedEvents) {
      const getEvLoc = (ev: DetectiveNode) => {
        const lc = connections.find(c =>
          (c.sourceNodeId === ev.id || c.targetNodeId === ev.id) &&
          nodes.find(n => n.id === (c.sourceNodeId === ev.id ? c.targetNodeId : c.sourceNodeId))?.type === "location"
        );
        if (!lc) return null;
        return nodes.find(n => n.id === (lc.sourceNodeId === ev.id ? lc.targetNodeId : lc.sourceNodeId));
      };
      const srcLoc = getEvLoc(le.source!);
      const tgtLoc = getEvLoc(le.target!);
      if (srcLoc && tgtLoc && srcLoc.id !== tgtLoc.id) {
        timelineIssues.push(`Travel required: "${srcLoc.title}" to "${tgtLoc.title}" between "${le.source!.title}" and "${le.target!.title}"`);
      }
    }
  }

  return {
    typeCounts,
    connectionTypeCounts,
    contradictions,
    isolatedNodes,
    hubs,
    density,
    avgStrength,
    timelineNodes: orderedTimelineNodes,
    timelineConnections,
    timelineIssues,
    totalNodes: nodes.length,
    totalConnections: connections.length,
  };
}

export default function DetectiveBoardPage() {
  const { toast } = useToast();
  const boardRef = useRef<HTMLDivElement>(null);
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<DetectiveNode | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<DetectiveConnection | null>(null);
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [showAddConnectionDialog, setShowAddConnectionDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [sidebarTab, setSidebarTab] = useState<"details" | "analytics" | "timeline">("details");

  const [nodeForm, setNodeForm] = useState({
    type: "evidence" as keyof typeof NODE_TYPES,
    title: "",
    description: "",
    color: "#3b82f6",
  });

  const [connectionForm, setConnectionForm] = useState({
    targetNodeId: "",
    connectionType: "related" as keyof typeof CONNECTION_TYPES,
    label: "",
    strength: 3,
    notes: "",
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: nodes = [], isLoading: isLoadingNodes } = useQuery<DetectiveNode[]>({
    queryKey: ["/api/matters", selectedMatterId, "detective", "nodes"],
    enabled: !!selectedMatterId,
  });

  const { data: connections = [] } = useQuery<DetectiveConnection[]>({
    queryKey: ["/api/matters", selectedMatterId, "detective", "connections"],
    enabled: !!selectedMatterId,
  });

  const analytics = useMemo(() => computeAnalytics(nodes, connections), [nodes, connections]);

  const createNodeMutation = useMutation({
    mutationFn: async (data: typeof nodeForm & { position: { x: number; y: number } }) => {
      const res = await apiRequest("POST", `/api/matters/${selectedMatterId}/detective/nodes`, {
        matterId: selectedMatterId,
        type: data.type,
        title: data.title,
        description: data.description,
        color: data.color,
        position: data.position,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "nodes"] });
      setShowAddNodeDialog(false);
      setNodeForm({ type: "evidence", title: "", description: "", color: "#3b82f6" });
      toast({ title: "Node pinned", description: "Evidence pinned to the board." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create node.", variant: "destructive" });
    }
  });

  const updateNodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DetectiveNode> }) => {
      const res = await apiRequest("PATCH", `/api/detective/nodes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "nodes"] });
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/detective/nodes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "nodes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "connections"] });
      setSelectedNode(null);
      toast({ title: "Node removed", description: "Evidence removed from the board." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete node.", variant: "destructive" });
    }
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (data: typeof connectionForm & { sourceNodeId: string }) => {
      const res = await apiRequest("POST", `/api/matters/${selectedMatterId}/detective/connections`, {
        matterId: selectedMatterId,
        sourceNodeId: data.sourceNodeId,
        targetNodeId: data.targetNodeId,
        label: data.label,
        connectionType: data.connectionType,
        strength: data.strength,
        notes: data.notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "connections"] });
      setShowAddConnectionDialog(false);
      setConnectionSource(null);
      setIsConnecting(false);
      setConnectionForm({ targetNodeId: "", connectionType: "related", label: "", strength: 3, notes: "" });
      toast({ title: "String connected", description: "Evidence linked on the board." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create connection.", variant: "destructive" });
    }
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/detective/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "connections"] });
      setSelectedConnection(null);
      toast({ title: "String removed", description: "Connection removed from the board." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete connection.", variant: "destructive" });
    }
  });

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (isConnecting) {
      if (connectionSource && connectionSource !== nodeId) {
        setConnectionForm(prev => ({ ...prev, targetNodeId: nodeId }));
        setShowAddConnectionDialog(true);
      }
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDragNode(nodeId);
    setIsDragging(true);
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: (e.clientX - rect.left) / zoom - pan.x - node.position.x,
        y: (e.clientY - rect.top) / zoom - pan.y - node.position.y,
      });
    }
    setSelectedNode(node);
    setSelectedConnection(null);
    setSidebarTab("details");
  }, [isConnecting, connectionSource, nodes, zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragNode) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom - pan.x - dragOffset.x;
    const y = (e.clientY - rect.top) / zoom - pan.y - dragOffset.y;
    updateNodeMutation.mutate({ id: dragNode, data: { position: { x: Math.max(0, x), y: Math.max(0, y) } } });
  }, [isDragging, dragNode, zoom, pan, dragOffset, updateNodeMutation]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragNode(null);
  }, []);

  const handleAddNode = () => {
    const centerX = 200 + Math.random() * 400;
    const centerY = 150 + Math.random() * 300;
    createNodeMutation.mutate({ ...nodeForm, position: { x: centerX, y: centerY } });
  };

  const startConnecting = (nodeId: string) => {
    setIsConnecting(true);
    setConnectionSource(nodeId);
    toast({ title: "Select target node", description: "Click another node to run a string between them." });
  };

  const cancelConnecting = () => {
    setIsConnecting(false);
    setConnectionSource(null);
  };

  const getNodeCenter = (node: DetectiveNode) => ({
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  });

  const renderConnection = (conn: DetectiveConnection) => {
    const source = nodes.find(n => n.id === conn.sourceNodeId);
    const target = nodes.find(n => n.id === conn.targetNodeId);
    if (!source || !target) return null;

    const start = getNodeCenter(source);
    const end = getNodeCenter(target);
    const cfg = CONNECTION_TYPES[conn.connectionType];
    const isSelected = selectedConnection?.id === conn.id;

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sag = Math.min(dist * 0.15, 40);
    const perpX = -dy / (dist || 1);
    const perpY = dx / (dist || 1);
    const cpX = midX + perpX * sag;
    const cpY = midY + perpY * sag;

    const strokeW = 1 + conn.strength * 0.5;
    const angle = Math.atan2(end.y - cpY, end.x - cpX);
    const arrowLen = 8;
    const arrowAng = Math.PI / 6;

    let dashArray = "none";
    if (cfg.style === "dashed") dashArray = "10,5";
    else if (cfg.style === "dotted") dashArray = "3,3";

    return (
      <g key={conn.id} onClick={() => { setSelectedConnection(conn); setSelectedNode(null); setSidebarTab("details"); }} className="cursor-pointer">
        <path
          d={`M ${start.x} ${start.y} Q ${cpX} ${cpY} ${end.x} ${end.y}`}
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={strokeW + 2}
          strokeDasharray={dashArray}
          style={{ filter: "blur(1px)" }}
        />
        <path
          d={`M ${start.x} ${start.y} Q ${cpX} ${cpY} ${end.x} ${end.y}`}
          fill="none"
          stroke={cfg.color}
          strokeWidth={isSelected ? strokeW + 1.5 : strokeW}
          strokeDasharray={dashArray}
          style={{ opacity: isSelected ? 1 : 0.75 }}
        />
        <polygon
          points={`
            ${end.x},${end.y}
            ${end.x - arrowLen * Math.cos(angle - arrowAng)},${end.y - arrowLen * Math.sin(angle - arrowAng)}
            ${end.x - arrowLen * Math.cos(angle + arrowAng)},${end.y - arrowLen * Math.sin(angle + arrowAng)}
          `}
          fill={cfg.color}
        />
        {conn.label && (
          <text
            x={cpX}
            y={cpY - 8}
            textAnchor="middle"
            fill={cfg.color}
            fontSize={11}
            fontWeight={600}
            className="pointer-events-none select-none"
            style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
          >
            {conn.label}
          </text>
        )}
      </g>
    );
  };

  const getNodeStyle = (node: DetectiveNode): React.CSSProperties => {
    const base: React.CSSProperties = {
      left: node.position.x,
      top: node.position.y,
      width: NODE_WIDTH,
      minHeight: NODE_HEIGHT,
      position: "absolute",
    };

    switch (node.type) {
      case "note":
      case "theory":
        return {
          ...base,
          background: node.type === "note"
            ? "linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)"
            : "linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%)",
          boxShadow: "3px 3px 8px rgba(0,0,0,0.2)",
          borderRadius: "2px",
          transform: `rotate(${(node.position.x % 5) - 2}deg)`,
        };
      case "evidence":
        return {
          ...base,
          background: "#fff",
          padding: "8px 8px 24px 8px",
          boxShadow: "3px 3px 10px rgba(0,0,0,0.25)",
          borderRadius: "2px",
        };
      case "person":
      case "location":
        return {
          ...base,
          background: "#fffef0",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.2)",
          border: `1px solid ${node.color}40`,
          borderTop: `3px solid ${node.color}`,
        };
      case "event":
        return {
          ...base,
          background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
          border: `1px solid ${node.color}40`,
          borderTop: `3px solid ${node.color}`,
          boxShadow: "2px 2px 8px rgba(0,0,0,0.2)",
        };
      default:
        return {
          ...base,
          backgroundColor: node.color + "20",
          border: `1px solid ${node.color}40`,
          borderTop: `3px solid ${node.color}`,
        };
    }
  };

  const renderNode = (node: DetectiveNode) => {
    const NodeIcon = NODE_TYPES[node.type]?.icon || FileText;
    const isSelected = selectedNode?.id === node.id;
    const isSource = connectionSource === node.id;
    const pinColor = PIN_COLORS[node.type] || "#dc2626";
    const isSticky = node.type === "note" || node.type === "theory";
    const isPhoto = node.type === "evidence";

    return (
      <div
        key={node.id}
        data-testid={`node-${node.id}`}
        className={`cursor-move select-none transition-shadow ${
          isSelected ? "ring-2 ring-primary" : ""
        } ${isSource ? "ring-2 ring-yellow-500" : ""}`}
        style={getNodeStyle(node)}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
      >
        <PushPin color={pinColor} />

        {isPhoto ? (
          <div className="pt-2">
            <div
              className="flex items-center justify-center rounded-sm"
              style={{
                backgroundColor: node.color + "15",
                border: `1px solid ${node.color}30`,
                minHeight: "50px",
              }}
            >
              <NodeIcon className="h-6 w-6" style={{ color: node.color }} />
            </div>
            <div className="mt-2 text-center">
              <span className="font-medium text-xs text-gray-700 dark:text-gray-300">{node.title}</span>
            </div>
          </div>
        ) : isSticky ? (
          <div className="p-3 pt-4">
            <div className="flex items-center gap-1.5 mb-1">
              <NodeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "#555" }} />
              <span className="font-semibold text-xs text-gray-800" style={{ fontFamily: "'Comic Sans MS', cursive, sans-serif" }}>
                {node.title}
              </span>
            </div>
            {node.description && (
              <p className="text-[10px] text-gray-600 line-clamp-3 leading-relaxed" style={{ fontFamily: "'Comic Sans MS', cursive, sans-serif" }}>
                {node.description}
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <NodeIcon className="h-4 w-4 shrink-0" style={{ color: node.color }} />
              <span className="font-medium text-sm truncate text-gray-800 dark:text-gray-200">{node.title}</span>
            </div>
            {node.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{node.description}</p>
            )}
            <div className="mt-2">
              <Badge variant="outline" className="text-[10px] py-0">
                {NODE_TYPES[node.type]?.label}
              </Badge>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalyticsPanel = () => (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-nodes">{analytics.totalNodes}</div>
            <div className="text-[10px] text-muted-foreground">Evidence Pieces</div>
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-connections">{analytics.totalConnections}</div>
            <div className="text-[10px] text-muted-foreground">Connections</div>
          </div>
          <div className="p-3 rounded-md text-center" style={{ backgroundColor: analytics.contradictions > 0 ? "rgba(220,38,38,0.1)" : undefined }}>
            <div className="text-2xl font-bold" style={{ color: analytics.contradictions > 0 ? "#dc2626" : undefined }} data-testid="stat-contradictions">
              {analytics.contradictions}
            </div>
            <div className="text-[10px] text-muted-foreground">Contradictions</div>
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <div className="text-2xl font-bold" data-testid="stat-density">{(analytics.density * 100).toFixed(0)}%</div>
            <div className="text-[10px] text-muted-foreground">Density</div>
          </div>
        </div>

        {Object.keys(analytics.typeCounts).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Target className="h-3 w-3" /> Node Breakdown
            </h4>
            <div className="space-y-1.5">
              {Object.entries(analytics.typeCounts).map(([type, count]) => {
                const config = NODE_TYPES[type as keyof typeof NODE_TYPES];
                const pct = analytics.totalNodes > 0 ? (count / analytics.totalNodes) * 100 : 0;
                return (
                  <div key={type} className="flex items-center gap-2" data-testid={`breakdown-${type}`}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config?.defaultColor }} />
                    <span className="text-xs flex-1">{config?.label || type}</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: config?.defaultColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {Object.keys(analytics.connectionTypeCounts).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Waypoints className="h-3 w-3" /> String Types
            </h4>
            <div className="space-y-1.5">
              {Object.entries(analytics.connectionTypeCounts).map(([type, count]) => {
                const cfg = CONNECTION_TYPES[type as keyof typeof CONNECTION_TYPES];
                return (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-4 h-0.5" style={{ backgroundColor: cfg?.color }} />
                    <span className="text-xs flex-1">{cfg?.label || type}</span>
                    <span className="text-xs text-muted-foreground font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {analytics.hubs.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Network className="h-3 w-3" /> Key Hubs
            </h4>
            <div className="space-y-1">
              {analytics.hubs.map(h => (
                <div key={h.node!.id} className="flex items-center gap-2 p-1.5 rounded-md hover-elevate cursor-pointer"
                  onClick={() => { setSelectedNode(h.node!); setSidebarTab("details"); }}
                  data-testid={`hub-${h.node!.id}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.node!.color }} />
                  <span className="text-xs truncate flex-1">{h.node!.title}</span>
                  <Badge variant="secondary" className="text-[9px]">{h.degree} links</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {analytics.isolatedNodes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Unlink className="h-3 w-3" /> Unconnected Evidence
            </h4>
            <div className="space-y-1">
              {analytics.isolatedNodes.map(n => (
                <div key={n.id} className="flex items-center gap-2 p-1.5 rounded-md hover-elevate cursor-pointer"
                  onClick={() => { setSelectedNode(n); setSidebarTab("details"); }}
                  data-testid={`isolated-node-${n.id}`}
                >
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="text-xs truncate">{n.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analytics.avgStrength > 0 && (
          <div className="p-3 rounded-md bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Avg. String Strength</span>
              <span className="text-xs font-semibold">{analytics.avgStrength.toFixed(1)}/5</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(analytics.avgStrength / 5) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  const renderTimelinePanel = () => (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Timeline Analysis</h3>
        </div>

        {analytics.timelineNodes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Add "Event" type nodes and "Timeline" connections to see analysis</p>
          </div>
        ) : (
          <>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Events on Timeline</div>
              <div className="text-lg font-bold">{analytics.timelineNodes.length}</div>
            </div>

            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Timeline Connections</div>
              <div className="text-lg font-bold">{analytics.timelineConnections.length}</div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Event Sequence (Chronological)</h4>
              <div className="relative pl-4 border-l-2 border-blue-300 dark:border-blue-700 space-y-3">
                {analytics.timelineNodes.map((node, i) => {
                  const hasContradiction = connections.some(
                    c => c.connectionType === "contradicts" &&
                    (c.sourceNodeId === node.id || c.targetNodeId === node.id)
                  );
                  const datePatterns = [
                    /(\d{4}-\d{2}-\d{2})/,
                    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
                    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s*\d{2,4})/i,
                  ];
                  let parsedDate: string | null = null;
                  const text = node.title + " " + node.description;
                  for (const p of datePatterns) {
                    const m = text.match(p);
                    if (m) { parsedDate = m[0]; break; }
                  }
                  return (
                    <div key={node.id} className="relative" data-testid={`timeline-event-${node.id}`}>
                      <div
                        className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-background"
                        style={{ backgroundColor: hasContradiction ? "#dc2626" : "#2563eb" }}
                      />
                      <div
                        className="p-2 rounded-md cursor-pointer hover-elevate"
                        style={{ backgroundColor: hasContradiction ? "rgba(220,38,38,0.08)" : "transparent" }}
                        onClick={() => { setSelectedNode(node); setSidebarTab("details"); }}
                        data-testid={`button-timeline-event-${node.id}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {hasContradiction && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                          <span className="text-xs font-medium">{node.title}</span>
                        </div>
                        {parsedDate && (
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">{parsedDate}</span>
                        )}
                        {node.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{node.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {analytics.timelineIssues.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" /> Issues Detected
                </h4>
                <div className="space-y-2">
                  {analytics.timelineIssues.map((issue, i) => (
                    <div key={i} className="p-2 rounded-md text-xs border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300" data-testid={`timeline-issue-${i}`}>
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );

  const renderDetailsPanel = () => {
    if (selectedNode) {
      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Node Details</h3>
            <Button size="icon" variant="ghost" onClick={() => deleteNodeMutation.mutate(selectedNode.id)} data-testid="button-delete-node">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground text-xs">Type</Label>
              <div className="flex items-center gap-2 mt-1">
                {(() => {
                  const Icon = NODE_TYPES[selectedNode.type]?.icon || FileText;
                  return <Icon className="h-4 w-4" style={{ color: selectedNode.color }} />;
                })()}
                <span className="text-sm">{NODE_TYPES[selectedNode.type]?.label}</span>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Title</Label>
              <p className="font-medium text-sm">{selectedNode.title}</p>
            </div>
            {selectedNode.description && (
              <div>
                <Label className="text-muted-foreground text-xs">Description</Label>
                <p className="text-sm">{selectedNode.description}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground text-xs">Connections</Label>
              <div className="mt-1 space-y-1">
                {connections
                  .filter(c => c.sourceNodeId === selectedNode.id || c.targetNodeId === selectedNode.id)
                  .map(c => {
                    const other = nodes.find(n => n.id === (c.sourceNodeId === selectedNode.id ? c.targetNodeId : c.sourceNodeId));
                    const cfg = CONNECTION_TYPES[c.connectionType];
                    return (
                      <div key={c.id} className="flex items-center gap-2 text-xs p-1.5 rounded-md hover-elevate cursor-pointer"
                        onClick={() => { setSelectedConnection(c); setSelectedNode(null); }}
                        data-testid={`connection-link-${c.id}`}
                      >
                        <div className="w-3 h-0.5" style={{ backgroundColor: cfg.color }} />
                        <span className="truncate">{cfg.label}: {other?.title || "Unknown"}</span>
                      </div>
                    );
                  })}
                {connections.filter(c => c.sourceNodeId === selectedNode.id || c.targetNodeId === selectedNode.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">No connections yet</p>
                )}
              </div>
            </div>
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => startConnecting(selectedNode.id)}
                data-testid="button-start-connection"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Run String to Node
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (selectedConnection) {
      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Connection Details</h3>
            <Button size="icon" variant="ghost" onClick={() => deleteConnectionMutation.mutate(selectedConnection.id)} data-testid="button-delete-connection">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs">
              <span className="font-medium">{nodes.find(n => n.id === selectedConnection.sourceNodeId)?.title}</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="font-medium">{nodes.find(n => n.id === selectedConnection.targetNodeId)?.title}</span>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Type</Label>
              <Badge
                variant="outline"
                style={{
                  borderColor: CONNECTION_TYPES[selectedConnection.connectionType].color,
                  color: CONNECTION_TYPES[selectedConnection.connectionType].color,
                }}
              >
                {CONNECTION_TYPES[selectedConnection.connectionType].label}
              </Badge>
            </div>
            {selectedConnection.label && (
              <div>
                <Label className="text-muted-foreground text-xs">Label</Label>
                <p className="text-sm">{selectedConnection.label}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground text-xs">Strength</Label>
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <div
                    key={n}
                    className={`w-3 h-3 rounded-full ${n <= selectedConnection.strength ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>
            {selectedConnection.notes && (
              <div>
                <Label className="text-muted-foreground text-xs">Notes</Label>
                <p className="text-sm">{selectedConnection.notes}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <MousePointer2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Click a node or string to view details</p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" data-testid="page-detective-board">
      <div className="flex items-center justify-between p-3 border-b gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">Investigation Board</h1>
            <p className="text-xs text-muted-foreground">Pin evidence, run strings, see the case</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
            <SelectTrigger className="w-[200px]" data-testid="select-matter">
              <SelectValue placeholder="Select matter" />
            </SelectTrigger>
            <SelectContent>
              {matters.map(matter => (
                <SelectItem key={matter.id} value={matter.id}>
                  {matter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedMatterId && (
            <>
              {isConnecting ? (
                <Button variant="outline" onClick={cancelConnecting} data-testid="button-cancel-connect">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              ) : (
                <Button variant="outline" onClick={() => selectedNode && startConnecting(selectedNode.id)} disabled={!selectedNode} data-testid="button-connect">
                  <Link2 className="h-4 w-4 mr-2" />
                  String
                </Button>
              )}

              <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-node">
                    <Plus className="h-4 w-4 mr-2" />
                    Pin Evidence
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Pin Evidence to Board</DialogTitle>
                    <DialogDescription>Add a new piece of evidence, person, or note to the investigation board.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={nodeForm.type} onValueChange={v => {
                        const type = v as keyof typeof NODE_TYPES;
                        setNodeForm(p => ({ ...p, type, color: NODE_TYPES[type].defaultColor }));
                      }}>
                        <SelectTrigger data-testid="select-node-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(NODE_TYPES).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={nodeForm.title}
                        onChange={e => setNodeForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Evidence title..."
                        data-testid="input-node-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={nodeForm.description}
                        onChange={e => setNodeForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Details about this piece..."
                        data-testid="input-node-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        {Object.values(NODE_TYPES).map(({ defaultColor }) => (
                          <button
                            key={defaultColor}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${nodeForm.color === defaultColor ? "border-primary" : "border-transparent"}`}
                            style={{ backgroundColor: defaultColor }}
                            onClick={() => setNodeForm(p => ({ ...p, color: defaultColor }))}
                            data-testid={`button-color-${defaultColor}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddNode}
                      disabled={!nodeForm.title || createNodeMutation.isPending}
                      data-testid="button-submit-node"
                    >
                      {createNodeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Pin to Board
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {!selectedMatterId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Lightbulb className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a Matter</h2>
            <p className="text-muted-foreground text-sm">Choose a case to view its investigation board</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div
            ref={boardRef}
            className="flex-1 relative overflow-hidden cursor-grab"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            data-testid="board-canvas"
            style={{
              background: `
                repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(0,0,0,0.02) 30px, rgba(0,0,0,0.02) 31px),
                repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(0,0,0,0.02) 30px, rgba(0,0,0,0.02) 31px),
                linear-gradient(135deg, hsl(var(--muted) / 0.5) 0%, hsl(var(--muted) / 0.3) 100%)
              `,
            }}
          >
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.min(2, z + 0.1))} data-testid="button-zoom-in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} data-testid="button-zoom-out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Badge variant="secondary">{Math.round(zoom * 100)}%</Badge>
            </div>

            {isConnecting && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                <Badge variant="default" className="text-xs px-3 py-1">
                  Click a target node to connect
                </Badge>
              </div>
            )}

            <svg
              className="absolute inset-0 pointer-events-none"
              style={{
                width: "100%",
                height: "100%",
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "0 0",
              }}
            >
              <g className="pointer-events-auto">
                {connections.map(renderConnection)}
              </g>
            </svg>

            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "0 0",
              }}
            >
              {isLoadingNodes ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : nodes.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <MousePointer2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Pin your first piece of evidence to start.</p>
                  </div>
                </div>
              ) : (
                nodes.map(renderNode)
              )}
            </div>
          </div>

          <div className="w-[320px] border-l flex flex-col bg-background">
            <Tabs value={sidebarTab} onValueChange={v => setSidebarTab(v as any)} className="flex flex-col h-full">
              <TabsList className="mx-3 mt-3 grid grid-cols-3">
                <TabsTrigger value="details" data-testid="tab-details">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="analytics" data-testid="tab-analytics">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="timeline" data-testid="tab-timeline">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  Timeline
                </TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="flex-1 mt-0 overflow-auto">
                {renderDetailsPanel()}
              </TabsContent>
              <TabsContent value="analytics" className="flex-1 mt-0 overflow-hidden">
                {renderAnalyticsPanel()}
              </TabsContent>
              <TabsContent value="timeline" className="flex-1 mt-0 overflow-hidden">
                {renderTimelinePanel()}
              </TabsContent>
            </Tabs>

            <div className="border-t p-3">
              <h4 className="font-semibold text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">String Legend</h4>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {Object.entries(CONNECTION_TYPES).map(([key, { label, color, style }]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <svg width="16" height="4">
                      <line
                        x1="0" y1="2" x2="16" y2="2"
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray={style === "dashed" ? "4,2" : style === "dotted" ? "2,2" : "none"}
                      />
                    </svg>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showAddConnectionDialog} onOpenChange={(open) => {
        setShowAddConnectionDialog(open);
        if (!open) {
          setConnectionSource(null);
          setIsConnecting(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Run String Between Evidence</DialogTitle>
            <DialogDescription>Define how these pieces of evidence connect.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">
                {nodes.find(n => n.id === connectionSource)?.title}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium">
                {nodes.find(n => n.id === connectionForm.targetNodeId)?.title}
              </span>
            </div>

            <div className="space-y-2">
              <Label>Connection Type</Label>
              <Select
                value={connectionForm.connectionType}
                onValueChange={v => setConnectionForm(p => ({ ...p, connectionType: v as any }))}
              >
                <SelectTrigger data-testid="select-connection-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONNECTION_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                value={connectionForm.label}
                onChange={e => setConnectionForm(p => ({ ...p, label: e.target.value }))}
                placeholder="e.g., 'confirms alibi'"
                data-testid="input-connection-label"
              />
            </div>

            <div className="space-y-2">
              <Label>Strength ({connectionForm.strength}/5)</Label>
              <Slider
                value={[connectionForm.strength]}
                onValueChange={([v]) => setConnectionForm(p => ({ ...p, strength: v }))}
                min={1}
                max={5}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={connectionForm.notes}
                onChange={e => setConnectionForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional context..."
                data-testid="input-connection-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => connectionSource && createConnectionMutation.mutate({ ...connectionForm, sourceNodeId: connectionSource })}
              disabled={createConnectionMutation.isPending}
              data-testid="button-submit-connection"
            >
              {createConnectionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Connect Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

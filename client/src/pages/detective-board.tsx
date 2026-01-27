import { useState, useRef, useCallback, useEffect } from "react";
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
  Move,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Loader2,
  MousePointer2,
  Maximize2
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
  related: { label: "Related to", color: "#6b7280", style: "solid" },
  contradicts: { label: "Contradicts", color: "#ef4444", style: "dashed" },
  supports: { label: "Supports", color: "#10b981", style: "solid" },
  "leads-to": { label: "Leads to", color: "#f59e0b", style: "solid" },
  timeline: { label: "Timeline", color: "#3b82f6", style: "dotted" },
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

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
      toast({ title: "Node added", description: "Investigation node has been created." });
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
      toast({ title: "Node deleted", description: "Investigation node has been removed." });
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
      toast({ title: "Connection created", description: "Nodes have been connected." });
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
      toast({ title: "Connection deleted", description: "Connection has been removed." });
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
    toast({ title: "Select target node", description: "Click on another node to create a connection." });
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
    const connectionConfig = CONNECTION_TYPES[conn.connectionType];
    const isSelected = selectedConnection?.id === conn.id;

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    return (
      <g key={conn.id} onClick={() => { setSelectedConnection(conn); setSelectedNode(null); }}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={connectionConfig.color}
          strokeWidth={isSelected ? 3 : 2}
          strokeDasharray={connectionConfig.style === "dashed" ? "8,4" : connectionConfig.style === "dotted" ? "2,2" : "none"}
          className="cursor-pointer"
          style={{ opacity: 0.8 }}
        />
        <polygon
          points={`
            ${end.x},${end.y}
            ${end.x - arrowLength * Math.cos(angle - arrowAngle)},${end.y - arrowLength * Math.sin(angle - arrowAngle)}
            ${end.x - arrowLength * Math.cos(angle + arrowAngle)},${end.y - arrowLength * Math.sin(angle + arrowAngle)}
          `}
          fill={connectionConfig.color}
        />
        {conn.label && (
          <text
            x={midX}
            y={midY - 5}
            textAnchor="middle"
            fill={connectionConfig.color}
            fontSize={12}
            className="pointer-events-none"
          >
            {conn.label}
          </text>
        )}
      </g>
    );
  };

  const renderNode = (node: DetectiveNode) => {
    const NodeIcon = NODE_TYPES[node.type]?.icon || FileText;
    const isSelected = selectedNode?.id === node.id;
    const isSource = connectionSource === node.id;

    return (
      <div
        key={node.id}
        data-testid={`node-${node.id}`}
        className={`absolute cursor-move select-none transition-shadow ${
          isSelected ? "ring-2 ring-primary shadow-lg" : "shadow-md"
        } ${isSource ? "ring-2 ring-yellow-500" : ""}`}
        style={{
          left: node.position.x,
          top: node.position.y,
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          backgroundColor: node.color + "20",
          borderLeft: `4px solid ${node.color}`,
          borderRadius: "0.5rem",
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
      >
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <NodeIcon className="h-4 w-4 shrink-0" style={{ color: node.color }} />
            <span className="font-medium text-sm truncate">{node.title}</span>
          </div>
          {node.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{node.description}</p>
          )}
          <div className="mt-2 flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] py-0">
              {NODE_TYPES[node.type]?.label}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" data-testid="page-detective-board">
      <div className="flex items-center justify-between p-4 border-b gap-4">
        <div>
          <h1 className="text-2xl font-bold">Detective Board</h1>
          <p className="text-muted-foreground">Visual investigation with connected evidence</p>
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
                  Connect
                </Button>
              )}
              
              <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-node">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Node
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Investigation Node</DialogTitle>
                    <DialogDescription>Create a new node on the investigation board.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Node Type</Label>
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
                        placeholder="Node title"
                        data-testid="input-node-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea 
                        value={nodeForm.description}
                        onChange={e => setNodeForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Describe this item..."
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
                      Add Node
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
            <p className="text-muted-foreground">Choose a matter to view its investigation board</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div 
            ref={boardRef}
            className="flex-1 relative bg-muted/30 overflow-hidden cursor-grab"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            data-testid="board-canvas"
          >
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.min(2, z + 0.1))} data-testid="button-zoom-in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} data-testid="button-zoom-out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Badge variant="secondary">{Math.round(zoom * 100)}%</Badge>
            </div>

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
                    <p>No nodes yet. Click "Add Node" to start investigating.</p>
                  </div>
                </div>
              ) : (
                nodes.map(renderNode)
              )}
            </div>
          </div>

          <div className="w-[320px] border-l flex flex-col">
            {selectedNode ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Node Details</h3>
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
                      <span>{NODE_TYPES[selectedNode.type]?.label}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground text-xs">Title</Label>
                    <p className="font-medium">{selectedNode.title}</p>
                  </div>
                  
                  {selectedNode.description && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Description</Label>
                      <p className="text-sm">{selectedNode.description}</p>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => startConnecting(selectedNode.id)}
                      data-testid="button-start-connection"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Connect to Another Node
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedConnection ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Connection Details</h3>
                  <Button size="icon" variant="ghost" onClick={() => deleteConnectionMutation.mutate(selectedConnection.id)} data-testid="button-delete-connection">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                <div className="space-y-3">
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
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map(n => (
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
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-muted-foreground">
                  <MousePointer2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a node or connection to view details</p>
                </div>
              </div>
            )}
            
            <div className="border-t p-4">
              <h4 className="font-semibold text-sm mb-3">Legend</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(CONNECTION_TYPES).map(([key, { label, color }]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-4 h-0.5" style={{ backgroundColor: color }} />
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
            <DialogTitle>Create Connection</DialogTitle>
            <DialogDescription>Define the relationship between these nodes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <span className="text-sm">
                {nodes.find(n => n.id === connectionSource)?.title}
              </span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-sm">
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
              Create Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

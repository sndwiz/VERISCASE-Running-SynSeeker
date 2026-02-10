import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Matter } from "@/types/matters";
import {
  FileText,
  User,
  Building2,
  MapPin,
  Calendar,
  Lightbulb,
  StickyNote as StickyNoteIcon,
  Plus,
  Trash2,
  Link2,
  ArrowRight,
  XCircle,
  Loader2,
  MousePointer2,
  AlertTriangle,
  Zap,
  Search,
  Download,
  Bot,
  Clock,
  Eye,
  GitCompare,
  RotateCcw,
  Scale,
  FlaskConical,
  Milestone,
  RefreshCw,
  Shield,
  Quote,
  HelpCircle,
  AlertOctagon,
  FileImage,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DetectiveNode {
  id: string;
  matterId: string;
  type: "evidence" | "person" | "organization" | "location" | "event" | "theory" | "note" | "hypothesis" | "legal_element" | "timeline_marker" | "quote" | "question" | "gap_indicator" | "document_ref";
  title: string;
  description: string;
  linkedEvidenceId?: string;
  linkedContactId?: string;
  position: { x: number; y: number };
  color: string;
  icon?: string;
  confidenceScore?: number;
  isInferred?: boolean;
  reliabilityLevel?: "strong" | "moderate" | "weak";
  hypothesisType?: "null" | "alternative";
  legalElement?: string;
  createdAt: string;
}

interface DetectiveConnection {
  id: string;
  matterId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  connectionType: "related" | "contradicts" | "supports" | "leads-to" | "timeline" | "corroborates" | "communicates" | "references";
  strength: number;
  notes: string;
  isInferred?: boolean;
  confidenceScore?: number;
  sourceCitation?: string;
  createdAt: string;
}

const BADGE_STYLE: React.CSSProperties = { padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600 };

function ConfidenceBadge({ score }: { score: number }) {
  const bg = score >= 0.7 ? "#dcfce7" : score >= 0.4 ? "#fef9c3" : "#fee2e2";
  const fg = score >= 0.7 ? "#166534" : score >= 0.4 ? "#854d0e" : "#991b1b";
  return <span style={{ ...BADGE_STYLE, background: bg, color: fg }}>{Math.round(score * 100)}%</span>;
}

function ReliabilityBadge({ level }: { level: string }) {
  const bg = level === "strong" ? "#dcfce7" : level === "moderate" ? "#dbeafe" : "#fee2e2";
  const fg = level === "strong" ? "#166534" : level === "moderate" ? "#1e40af" : "#991b1b";
  return <span style={{ ...BADGE_STYLE, background: bg, color: fg, textTransform: "uppercase" }}>{level}</span>;
}

function InferredBadge() {
  return <span style={{ ...BADGE_STYLE, background: "#fef3c7", color: "#92400e" }}>INFERRED</span>;
}

function DoctrineBadges({ node }: { node: DetectiveNode }) {
  return (
    <>
      {node.confidenceScore !== undefined && <ConfidenceBadge score={node.confidenceScore} />}
      {node.reliabilityLevel && <ReliabilityBadge level={node.reliabilityLevel} />}
      {node.isInferred && <InferredBadge />}
    </>
  );
}

const NODE_TYPES = {
  evidence: { icon: FileText, label: "Evidence", defaultColor: "#3b82f6" },
  person: { icon: User, label: "Person", defaultColor: "#8b5cf6" },
  organization: { icon: Building2, label: "Organization", defaultColor: "#6366f1" },
  location: { icon: MapPin, label: "Location", defaultColor: "#10b981" },
  event: { icon: Calendar, label: "Event", defaultColor: "#f59e0b" },
  theory: { icon: Lightbulb, label: "Theory", defaultColor: "#ef4444" },
  hypothesis: { icon: FlaskConical, label: "Hypothesis", defaultColor: "#e11d48" },
  legal_element: { icon: Scale, label: "Legal Element", defaultColor: "#0891b2" },
  timeline_marker: { icon: Milestone, label: "Timeline Marker", defaultColor: "#7c3aed" },
  note: { icon: StickyNoteIcon, label: "Note", defaultColor: "#6b7280" },
  quote: { icon: Quote, label: "Quote", defaultColor: "#9b59b6" },
  question: { icon: HelpCircle, label: "Question", defaultColor: "#e67e22" },
  gap_indicator: { icon: AlertOctagon, label: "Gap Indicator", defaultColor: "#e74c3c" },
  document_ref: { icon: FileImage, label: "Document", defaultColor: "#34495e" },
};

const CONNECTION_TYPES = {
  related: { label: "Related to", color: "#78716c", style: "solid" },
  contradicts: { label: "Contradicts", color: "#dc2626", style: "dashed" },
  supports: { label: "Supports", color: "#16a34a", style: "solid" },
  corroborates: { label: "Corroborates (Independent)", color: "#059669", style: "solid" },
  "leads-to": { label: "Leads to", color: "#d97706", style: "solid" },
  timeline: { label: "Timeline", color: "#2563eb", style: "dotted" },
  communicates: { label: "Communicates with", color: "#7c3aed", style: "solid" },
  references: { label: "References", color: "#0284c7", style: "dotted" },
};

const PIN_COLORS: Record<string, string> = {
  evidence: "#2980b9",
  person: "#2980b9",
  organization: "#6366f1",
  location: "#00b894",
  event: "#fdcb6e",
  theory: "#c0392b",
  hypothesis: "#e11d48",
  legal_element: "#0891b2",
  timeline_marker: "#7c3aed",
  note: "#fdcb6e",
  quote: "#6c5ce7",
  question: "#e67e22",
  gap_indicator: "#c0392b",
  document_ref: "#34495e",
};

const BOARD_W = 4000;
const BOARD_H = 3000;

const ZONE_COLORS = {
  duty: { color: "#3498db", bg: "rgba(52,152,219,0.08)", label: "Duty" },
  breach: { color: "#e74c3c", bg: "rgba(231,76,60,0.08)", label: "Breach" },
  causation: { color: "#f39c12", bg: "rgba(243,156,18,0.08)", label: "Causation" },
  damages: { color: "#27ae60", bg: "rgba(39,174,96,0.08)", label: "Damages" },
};

const ZONES = [
  { key: "duty", x: 40, y: 60, w: 420, h: 280 },
  { key: "breach", x: 480, y: 60, w: 420, h: 280 },
  { key: "causation", x: 920, y: 60, w: 220, h: 420 },
  { key: "damages", x: 40, y: 560, w: 560, h: 200 },
] as const;

const CONNECTION_COLOR_MAP: Record<string, string> = {
  related: "#78716c",
  contradicts: "#c0392b",
  supports: "#27ae60",
  "leads-to": "#f39c12",
  timeline: "#2980b9",
  corroborates: "#059669",
  communicates: "#7c3aed",
  references: "#0284c7",
};

function getNodeDimensions(type: string) {
  switch (type) {
    case "evidence":
    case "location":
      return { w: 260, h: 140 };
    case "note":
      return { w: 170, h: 170 };
    case "person":
      return { w: 180, h: 160 };
    case "theory":
      return { w: 300, h: 200 };
    case "event":
      return { w: 160, h: 100 };
    case "quote":
      return { w: 240, h: 160 };
    case "question":
      return { w: 220, h: 140 };
    case "gap_indicator":
      return { w: 260, h: 150 };
    case "document_ref":
      return { w: 220, h: 160 };
    default:
      return { w: 200, h: 100 };
  }
}

function PushPin({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        position: "absolute",
        top: -11,
        left: "50%",
        transform: "translateX(-50%)",
        background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color})`,
        boxShadow: "0 3px 6px rgba(0,0,0,0.4), inset 0 -2px 3px rgba(0,0,0,0.2)",
        zIndex: 10,
        pointerEvents: "none",
      }}
    />
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

function EvidenceCardEl({ node, isSelected, onMouseDown }: { node: DetectiveNode; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  const pinColor = node.type === "location" ? "#00b894" : "#2980b9";
  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 260,
        background: "#fffef5",
        borderRadius: 6,
        boxShadow: isSelected ? "0 0 0 3px #3498db, 3px 3px 12px rgba(0,0,0,0.25)" : "3px 3px 12px rgba(0,0,0,0.25)",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
      }}
    >
      <PushPin color={pinColor} />
      <div style={{ padding: "18px 18px 14px" }}>
        <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#888", marginBottom: 6 }}>
          {node.type === "location" ? "LOCATION" : "EVIDENCE"}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#2c3e50", marginBottom: 8, lineHeight: 1.3 }}>
          {node.title}
        </div>
        {node.description && (
          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>
            {node.description.length > 120 ? node.description.slice(0, 120) + "..." : node.description}
          </div>
        )}
        <div style={{ fontSize: 10, color: "#999", marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span>Added {new Date(node.createdAt).toLocaleDateString()}</span>
          <DoctrineBadges node={node} />
        </div>
      </div>
    </div>
  );
}

function StickyNoteEl({ node, isSelected, onMouseDown }: { node: DetectiveNode; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 170,
        minHeight: 170,
        padding: 16,
        paddingTop: 20,
        fontFamily: "'Caveat', cursive",
        fontSize: 16,
        lineHeight: 1.4,
        color: "#333",
        background: "linear-gradient(135deg, #fff9c4, #fff59d)",
        boxShadow: isSelected ? "0 0 0 3px #3498db, 3px 3px 10px rgba(0,0,0,0.15)" : "3px 3px 10px rgba(0,0,0,0.15)",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
      }}
    >
      <PushPin color="#fdcb6e" />
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 18 }}>{node.title}</div>
      <div>{node.description}</div>
    </div>
  );
}

function PersonCardEl({ node, isSelected, connections, allNodes, onMouseDown }: { node: DetectiveNode; isSelected: boolean; connections: DetectiveConnection[]; allNodes: DetectiveNode[]; onMouseDown: (e: React.MouseEvent) => void }) {
  const mentions = connections.filter(c => c.sourceNodeId === node.id || c.targetNodeId === node.id).length;
  const contradictionCount = connections.filter(c =>
    c.connectionType === "contradicts" && (c.sourceNodeId === node.id || c.targetNodeId === node.id)
  ).length;
  const initial = node.title.charAt(0).toUpperCase();

  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 180,
        padding: 16,
        paddingTop: 20,
        background: "white",
        borderRadius: 10,
        boxShadow: isSelected ? "0 0 0 3px #3498db, 3px 3px 12px rgba(0,0,0,0.2)" : "3px 3px 12px rgba(0,0,0,0.2)",
        textAlign: "center",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
      }}
    >
      <PushPin color="#2980b9" />
      <div style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        margin: "0 auto 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        color: "white",
        fontWeight: 700,
        background: "linear-gradient(135deg, #3498db, #2980b9)",
      }}>
        {initial}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#2c3e50" }}>{node.title}</div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
        {node.description ? node.description.split("\n")[0] : "Person"}
      </div>
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 16,
        paddingTop: 8,
        borderTop: "1px solid #eee",
        marginTop: 8,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#2c3e50" }}>{mentions}</div>
          <div style={{ fontSize: 8, color: "#999", textTransform: "uppercase" }}>Mentions</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: contradictionCount > 0 ? "#e74c3c" : "#27ae60" }}>{contradictionCount}</div>
          <div style={{ fontSize: 8, color: "#999", textTransform: "uppercase" }}>Conflicts</div>
        </div>
      </div>
    </div>
  );
}

function ContradictionCardEl({ node, isSelected, onMouseDown }: { node: DetectiveNode; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  const parts = node.description.split("\n").filter(Boolean);
  const stmt1 = parts[0] || node.description;
  const stmt2 = parts[1] || "";

  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 300,
        background: "#fff5f5",
        border: "2px solid #e74c3c",
        borderRadius: 8,
        boxShadow: isSelected ? "0 0 0 3px #3498db, 3px 3px 12px rgba(0,0,0,0.2)" : "3px 3px 12px rgba(0,0,0,0.2)",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
      }}
    >
      <PushPin color="#c0392b" />
      <div style={{
        background: "#e74c3c",
        color: "white",
        padding: "10px 14px",
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <Zap size={14} /> CONTRADICTION DETECTED
      </div>
      <div style={{ padding: 14 }}>
        <div style={{
          background: "white",
          padding: 10,
          borderRadius: 6,
          fontSize: 12,
          lineHeight: 1.4,
          marginBottom: 8,
        }}>
          {stmt1}
        </div>
        {stmt2 && (
          <>
            <div style={{ textAlign: "center", fontWeight: 700, color: "#e74c3c", fontSize: 12, margin: "8px 0" }}>VS</div>
            <div style={{
              background: "white",
              padding: 10,
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.4,
            }}>
              {stmt2}
            </div>
          </>
        )}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 10,
          marginTop: 10,
          borderTop: "1px solid #f0d0d0",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#e74c3c" }}>{node.title}</span>
          <span style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 10,
            background: "#ffe0e0",
            color: "#e74c3c",
          }}>Unresolved</span>
        </div>
      </div>
    </div>
  );
}

function TimelineNodeEl({ node, isSelected, onMouseDown }: { node: DetectiveNode; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 160,
        padding: 14,
        paddingTop: 18,
        background: "white",
        borderRadius: 8,
        boxShadow: isSelected ? "0 0 0 3px #3498db, 3px 3px 10px rgba(0,0,0,0.2)" : "3px 3px 10px rgba(0,0,0,0.2)",
        textAlign: "center",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
      }}
    >
      <PushPin color="#fdcb6e" />
      <div style={{ fontSize: 13, fontWeight: 700, color: "#2c3e50", marginBottom: 4 }}>{node.title}</div>
      <div style={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}>
        {node.description.length > 80 ? node.description.slice(0, 80) + "..." : node.description}
      </div>
    </div>
  );
}

function QuoteCardEl({ node, isSelected, onMouseDown }: { node: DetectiveNode; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  const lines = node.description.split("\n").filter(Boolean);
  const quoteText = lines[0] || node.description;
  const sourceText = lines[1] || "";
  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 240,
        background: "#f8f5ff",
        borderRadius: 6,
        boxShadow: isSelected ? "0 0 0 3px #6c5ce7, 3px 3px 12px rgba(0,0,0,0.25)" : "3px 3px 12px rgba(0,0,0,0.25)",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
      }}
    >
      <PushPin color="#6c5ce7" />
      <div style={{ padding: "18px 18px 14px" }}>
        <div style={{ fontSize: 36, lineHeight: "24px", color: "#6c5ce7", fontFamily: "Georgia, serif", marginBottom: 4 }}>&ldquo;</div>
        <div style={{ fontSize: 13, fontStyle: "italic", fontFamily: "Georgia, serif", color: "#2c3e50", lineHeight: 1.5, marginBottom: 8 }}>
          {quoteText.length > 140 ? quoteText.slice(0, 140) + "..." : quoteText}
        </div>
        {sourceText && (
          <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
            &mdash; {sourceText}
          </div>
        )}
        <div style={{ fontSize: 10, color: "#999", paddingTop: 10, borderTop: "1px solid #e8e0f0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <DoctrineBadges node={node} />
          <span style={{ ...BADGE_STYLE, background: "#ede7f6", color: "#6c5ce7" }}>QUOTE</span>
        </div>
      </div>
    </div>
  );
}

function QuestionCardEl({ node, isSelected, onMouseDown }: { node: DetectiveNode; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  const isResolved = node.title.startsWith("[Resolved]");
  const isInvestigating = node.title.startsWith("[Investigating]");
  const statusColor = isResolved ? "#27ae60" : isInvestigating ? "#f39c12" : "#e74c3c";
  const statusLabel = isResolved ? "Resolved" : isInvestigating ? "Investigating" : "Unresolved";
  const displayTitle = node.title.replace(/^\[(Resolved|Investigating)\]\s*/, "");
  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 220,
        background: "white",
        borderRadius: 6,
        borderLeft: "3px solid #e67e22",
        boxShadow: isSelected ? "0 0 0 3px #e67e22, 3px 3px 12px rgba(0,0,0,0.25)" : "3px 3px 12px rgba(0,0,0,0.25)",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
      }}
    >
      <PushPin color="#e67e22" />
      <div style={{ padding: "18px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <HelpCircle size={14} style={{ color: "#e67e22" }} />
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#e67e22" }}>OPEN QUESTION</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2c3e50", marginBottom: 6, lineHeight: 1.3 }}>
          {displayTitle}
        </div>
        {node.description && (
          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginBottom: 8 }}>
            {node.description.length > 120 ? node.description.slice(0, 120) + "..." : node.description}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, borderTop: "1px solid #eee" }}>
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 10,
            background: `${statusColor}22`,
            color: statusColor,
          }}>{statusLabel}</span>
          <DoctrineBadges node={node} />
        </div>
      </div>
    </div>
  );
}

function GapIndicatorEl({ node, isSelected, onMouseDown }: { node: DetectiveNode; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  const upperTitle = node.title.toUpperCase();
  const priority = upperTitle.includes("HIGH") ? "HIGH" : upperTitle.includes("MEDIUM") ? "MEDIUM" : upperTitle.includes("LOW") ? "LOW" : "HIGH";
  const priorityColor = priority === "HIGH" ? "#e74c3c" : priority === "MEDIUM" ? "#f39c12" : "#27ae60";
  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 260,
        background: "#fff5f0",
        border: "2px solid #e74c3c",
        borderRadius: 8,
        boxShadow: isSelected ? "0 0 0 3px #c0392b, 3px 3px 12px rgba(0,0,0,0.25)" : "3px 3px 12px rgba(0,0,0,0.25)",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
        animation: "gapPulse 2s infinite",
      }}
    >
      <PushPin color="#c0392b" />
      <div style={{
        background: "#e74c3c",
        color: "white",
        padding: "10px 14px",
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: "6px 6px 0 0",
      }}>
        <AlertOctagon size={14} /> EVIDENCE GAP
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2c3e50", marginBottom: 6 }}>{node.title}</div>
        {node.description && (
          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginBottom: 10 }}>
            {node.description.length > 140 ? node.description.slice(0, 140) + "..." : node.description}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 4,
            background: `${priorityColor}22`,
            color: priorityColor,
            textTransform: "uppercase",
          }}>{priority}</span>
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 10,
            background: "#ffe0e0",
            color: "#e74c3c",
          }}>Not addressed</span>
        </div>
      </div>
    </div>
  );
}

function DocumentRefEl({ node, isSelected, onMouseDown }: { node: DetectiveNode; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      data-testid={`board-element-${node.id}`}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        width: 220,
        background: "white",
        borderRadius: 6,
        boxShadow: isSelected ? "0 0 0 3px #34495e, 3px 3px 12px rgba(0,0,0,0.25)" : "3px 3px 12px rgba(0,0,0,0.25)",
        cursor: "move",
        userSelect: "none",
        zIndex: isSelected ? 50 : 1,
      }}
    >
      <PushPin color="#34495e" />
      <div style={{ padding: "18px 18px 14px" }}>
        <div style={{
          width: "100%",
          height: 48,
          background: "#ecf0f1",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}>
          <FileImage size={24} style={{ color: "#7f8c8d" }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2c3e50", marginBottom: 4, lineHeight: 1.3 }}>
          {node.title}
        </div>
        {node.description && (
          <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4, marginBottom: 8 }}>
            {node.description.length > 100 ? node.description.slice(0, 100) + "..." : node.description}
          </div>
        )}
        <div style={{ fontSize: 10, color: "#999", paddingTop: 10, borderTop: "1px solid #eee", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <DoctrineBadges node={node} />
          <span style={{ ...BADGE_STYLE, background: "#ecf0f1", color: "#34495e" }}>DOCUMENT</span>
        </div>
      </div>
    </div>
  );
}

function MiniMap({ nodes, pan, containerW, containerH }: { nodes: DetectiveNode[]; pan: { x: number; y: number }; containerW: number; containerH: number }) {
  const scale = 150 / BOARD_W;
  const mapH = BOARD_H * scale;
  const vpW = Math.min(containerW / BOARD_W * 150, 150);
  const vpH = Math.min(containerH / BOARD_H * mapH, mapH);
  const vpX = Math.max(0, Math.min((-pan.x / BOARD_W) * 150, 150 - vpW));
  const vpY = Math.max(0, Math.min((-pan.y / BOARD_H) * mapH, mapH - vpH));

  return (
    <div
      data-testid="minimap"
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        width: 150,
        height: mapH,
        background: "rgba(0,0,0,0.6)",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.2)",
        zIndex: 20,
        padding: 4,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {ZONES.map(z => {
          const zc = ZONE_COLORS[z.key as keyof typeof ZONE_COLORS];
          return (
            <div
              key={z.key}
              style={{
                position: "absolute",
                left: z.x * scale,
                top: z.y * scale,
                width: z.w * scale,
                height: z.h * scale,
                border: `1px solid ${zc.color}`,
                borderRadius: 2,
                opacity: 0.5,
              }}
            />
          );
        })}
        {nodes.map(n => (
          <div
            key={n.id}
            style={{
              position: "absolute",
              left: n.position.x * scale,
              top: n.position.y * scale,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: PIN_COLORS[n.type] || "#fff",
            }}
          />
        ))}
        <div style={{
          position: "absolute",
          left: vpX,
          top: vpY,
          width: vpW,
          height: vpH,
          border: "2px solid rgba(255,255,255,0.8)",
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

interface MatterContact {
  id: string;
  matterId: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface TimelineEvent {
  id: string;
  matterId: string;
  title: string;
  description: string;
  eventDate: string;
  eventType: string;
}

interface EvidenceItem {
  id: string;
  matterId: string;
  title: string;
  evidenceType: string;
  status: string;
  description?: string;
  batesNumber?: string;
}

export default function DetectiveBoardPage() {
  const { toast } = useToast();
  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlMatterId = urlParams.get("matterId") || "";
  const [selectedMatterId, setSelectedMatterId] = useState<string>(urlMatterId);
  const [selectedNode, setSelectedNode] = useState<DetectiveNode | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<DetectiveConnection | null>(null);
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [showAddConnectionDialog, setShowAddConnectionDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"context" | "history" | "details">("context");
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [nodeForm, setNodeForm] = useState({
    type: "evidence" as keyof typeof NODE_TYPES,
    title: "",
    description: "",
    color: "#3b82f6",
    confidenceScore: 0.5,
    isInferred: false,
    reliabilityLevel: "moderate" as "strong" | "moderate" | "weak",
    hypothesisType: "null" as "null" | "alternative",
    legalElement: "",
  });

  const [connectionForm, setConnectionForm] = useState({
    targetNodeId: "",
    connectionType: "related" as keyof typeof CONNECTION_TYPES,
    label: "",
    strength: 3,
    notes: "",
    isInferred: false,
    confidenceScore: 0.5,
    sourceCitation: "",
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

  const { data: matterContacts = [] } = useQuery<MatterContact[]>({
    queryKey: ["/api/matters", selectedMatterId, "contacts"],
    enabled: !!selectedMatterId,
  });

  const { data: timelineEvents = [] } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/matters", selectedMatterId, "timeline"],
    enabled: !!selectedMatterId,
  });

  const { data: evidenceItems = [] } = useQuery<EvidenceItem[]>({
    queryKey: ["/api/matters", selectedMatterId, "evidence"],
    enabled: !!selectedMatterId,
  });

  const analytics = useMemo(() => computeAnalytics(nodes, connections), [nodes, connections]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
      setNodeForm({ type: "evidence", title: "", description: "", color: "#3b82f6", confidenceScore: 0.5, isInferred: false, reliabilityLevel: "moderate", hypothesisType: "null", legalElement: "" });
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
      setConnectionForm({ targetNodeId: "", connectionType: "related", label: "", strength: 3, notes: "", isInferred: false, confidenceScore: 0.5, sourceCitation: "" });
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

  const syncMatterDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/matters/${selectedMatterId}/detective/sync`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "nodes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "detective", "unaccounted-time"] });
      toast({
        title: "Matter data synced",
        description: data.message || `Synced ${data.synced} items with ${data.autoConnections} auto-connections`,
      });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Failed to sync matter data to detective board.", variant: "destructive" });
    }
  });

  const { data: unaccountedTime } = useQuery<{
    persons: Array<{
      person: { id: string; title: string };
      accountedEvents: number;
      totalEvents: number;
      coveragePercent: number;
      gaps: Array<{
        from: { event: string; date: string; location: string | null };
        to: { event: string; date: string; location: string | null };
        gapHours: number;
        gapDays: number;
        severity: "critical" | "high" | "medium" | "low";
        locationChange: boolean;
        investigationLead: string;
      }>;
      opportunityScore: number;
      unlinkedEventCount: number;
    }>;
    summary: {
      totalPersons: number;
      totalEvents: number;
      personsWithGaps: number;
      totalGaps: number;
      highestOpportunity: any;
    };
  }>({
    queryKey: ["/api/matters", selectedMatterId, "detective", "unaccounted-time"],
    enabled: !!selectedMatterId && nodes.length > 0,
  });

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return nodes.filter(n =>
      n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)
    );
  }, [nodes, searchQuery]);

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();

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
    dragStartPos.current = { x: node.position.x, y: node.position.y };
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setSelectedNode(node);
    setSelectedConnection(null);
    setSidebarTab("details");
  }, [isConnecting, connectionSource, nodes]);

  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    setContextMenu(null);
    if (dragNode) return;
    const target = e.target as HTMLElement;
    if (target === boardRef.current || target.closest("[data-zone]")) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [dragNode]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragNode && dragStartPos.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      dragStartPos.current = {
        x: dragStartPos.current.x + dx,
        y: dragStartPos.current.y + dy,
      };
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      const el = document.querySelector(`[data-testid="board-element-${dragNode}"]`) as HTMLElement;
      if (el) {
        el.style.left = `${Math.max(0, dragStartPos.current.x)}px`;
        el.style.top = `${Math.max(0, dragStartPos.current.y)}px`;
      }
    } else if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, [dragNode, isPanning]);

  const handleMouseUp = useCallback(() => {
    if (dragNode && dragStartPos.current) {
      updateNodeMutation.mutate({
        id: dragNode,
        data: {
          position: {
            x: Math.max(0, dragStartPos.current.x),
            y: Math.max(0, dragStartPos.current.y),
          },
        },
      });
    }
    setDragNode(null);
    dragStartPos.current = null;
    setIsPanning(false);
  }, [dragNode, updateNodeMutation]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const dismiss = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", dismiss);
      return () => window.removeEventListener("click", dismiss);
    }
  }, [contextMenu]);

  const handleAddNode = () => {
    const centerX = -pan.x + 200 + Math.random() * 400;
    const centerY = -pan.y + 150 + Math.random() * 300;
    createNodeMutation.mutate({ ...nodeForm, position: { x: centerX, y: centerY } });
  };

  const openAddNodeWithType = (type: keyof typeof NODE_TYPES) => {
    setNodeForm(prev => ({ ...prev, type, color: NODE_TYPES[type].defaultColor }));
    setShowAddNodeDialog(true);
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

  const getNodeCenter = (node: DetectiveNode) => {
    const dims = getNodeDimensions(node.type);
    return {
      x: node.position.x + dims.w / 2,
      y: node.position.y + dims.h / 2,
    };
  };

  const renderConnection = (conn: DetectiveConnection) => {
    const source = nodes.find(n => n.id === conn.sourceNodeId);
    const target = nodes.find(n => n.id === conn.targetNodeId);
    if (!source || !target) return null;

    const start = getNodeCenter(source);
    const end = getNodeCenter(target);
    const color = CONNECTION_COLOR_MAP[conn.connectionType] || "#78716c";
    const isSelected = selectedConnection?.id === conn.id;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const labelText = conn.label || conn.connectionType;

    return (
      <g key={conn.id}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={color}
          strokeWidth={isSelected ? 4 : 3}
          strokeDasharray="10 5"
          opacity={isSelected ? 1 : 0.8}
          style={{ cursor: "pointer", pointerEvents: "stroke" }}
          onClick={() => { setSelectedConnection(conn); setSelectedNode(null); setSidebarTab("details"); }}
        />
        <rect
          x={midX - labelText.length * 3 - 4}
          y={midY - 8}
          width={labelText.length * 6 + 8}
          height={16}
          rx={3}
          fill="rgba(0,0,0,0.7)"
          style={{ pointerEvents: "none" }}
        />
        <text
          x={midX}
          y={midY + 4}
          textAnchor="middle"
          fill="white"
          fontSize={10}
          fontWeight={500}
          style={{ pointerEvents: "none" }}
        >
          {labelText}
        </text>
      </g>
    );
  };

  const renderBoardNode = (node: DetectiveNode) => {
    const isSelected = selectedNode?.id === node.id;
    const isSearchMatch = showSearch && searchQuery.trim() && searchResults.some(r => r.id === node.id);
    const onMouseDown = (e: React.MouseEvent) => handleNodeMouseDown(e, node.id);

    const wrappedEl = (() => {
    switch (node.type) {
      case "note":
        return <StickyNoteEl key={node.id} node={node} isSelected={isSelected} onMouseDown={onMouseDown} />;
      case "person":
        return <PersonCardEl key={node.id} node={node} isSelected={isSelected} connections={connections} allNodes={nodes} onMouseDown={onMouseDown} />;
      case "theory":
        return <ContradictionCardEl key={node.id} node={node} isSelected={isSelected} onMouseDown={onMouseDown} />;
      case "event":
        return <TimelineNodeEl key={node.id} node={node} isSelected={isSelected} onMouseDown={onMouseDown} />;
      case "quote":
        return <QuoteCardEl key={node.id} node={node} isSelected={isSelected} onMouseDown={onMouseDown} />;
      case "question":
        return <QuestionCardEl key={node.id} node={node} isSelected={isSelected} onMouseDown={onMouseDown} />;
      case "gap_indicator":
        return <GapIndicatorEl key={node.id} node={node} isSelected={isSelected} onMouseDown={onMouseDown} />;
      case "document_ref":
        return <DocumentRefEl key={node.id} node={node} isSelected={isSelected} onMouseDown={onMouseDown} />;
      default:
        return <EvidenceCardEl key={node.id} node={node} isSelected={isSelected} onMouseDown={onMouseDown} />;
    }
    })();

    return (
      <div key={node.id} onContextMenu={(e) => handleNodeContextMenu(e, node.id)} style={isSearchMatch ? { filter: "drop-shadow(0 0 8px #3498db) drop-shadow(0 0 16px #3498db)" } : undefined}>
        {wrappedEl}
      </div>
    );
  };

  const selectedMatter = matters.find(m => m.id === selectedMatterId);

  const panelBg = "#16213e";
  const panelText = "#ecf0f1";
  const panelMuted = "#95a5a6";

  if (!selectedMatterId) {
    return (
      <div className="h-full flex" data-testid="page-detective-board" style={{ background: "#1a1a2e" }}>
        <div style={{ width: 280, background: panelBg, borderRight: "1px solid rgba(255,255,255,0.1)", padding: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
            Select Matter
          </div>
          <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
            <SelectTrigger data-testid="select-matter" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: panelText }}>
              <SelectValue placeholder="Choose a case..." />
            </SelectTrigger>
            <SelectContent>
              {matters.map(matter => (
                <SelectItem key={matter.id} value={matter.id}>{matter.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 flex items-center justify-center" style={{ background: "#111" }}>
          <div style={{ textAlign: "center", color: panelMuted }}>
            <Lightbulb size={64} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: panelText }}>Select a Matter</h2>
            <p style={{ fontSize: 14 }}>Choose a case from the left panel to view its investigation board</p>
          </div>
        </div>
        <div style={{ width: 320, background: panelBg, borderLeft: "1px solid rgba(255,255,255,0.1)" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex" data-testid="page-detective-board" style={{ background: "#1a1a2e", color: panelText }}>
      {/* LEFT SIDEBAR */}
      <div style={{
        width: 280,
        minWidth: 280,
        background: panelBg,
        borderRight: "1px solid rgba(255,255,255,0.1)",
        padding: 20,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}>
        {/* Matter selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
            Active Case
          </div>
          <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
            <SelectTrigger data-testid="select-matter" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: panelText }}>
              <SelectValue placeholder="Choose a case..." />
            </SelectTrigger>
            <SelectContent>
              {matters.map(matter => (
                <SelectItem key={matter.id} value={matter.id}>{matter.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMatter && (
            <div style={{ fontSize: 10, color: panelMuted, marginTop: 6 }}>
              Case #{selectedMatter.caseNumber}
            </div>
          )}
        </div>

        {/* Element Palette */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
            Add Elements
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(Object.entries(NODE_TYPES) as [keyof typeof NODE_TYPES, typeof NODE_TYPES[keyof typeof NODE_TYPES]][]).map(([key, { icon: Icon, label }]) => (
              <div
                key={key}
                data-testid={`palette-item-${key}`}
                onClick={() => openAddNodeWithType(key)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: 12,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.borderColor = "#3498db";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                <Icon size={24} style={{ margin: "0 auto 4px", color: panelMuted }} />
                <div style={{ fontSize: 10, color: panelMuted }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Zone Status */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
            Case Elements
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {([
              { key: "duty", label: "1. Duty", color: "#3498db", pct: analytics.totalNodes > 0 ? Math.min(100, (analytics.typeCounts["evidence"] || 0) * 25) : 0 },
              { key: "breach", label: "2. Breach", color: "#e74c3c", pct: analytics.contradictions > 0 ? 80 : analytics.totalNodes > 0 ? 40 : 0 },
              { key: "causation", label: "3. Causation", color: "#f39c12", pct: analytics.timelineIssues.length > 0 ? 60 : analytics.totalConnections > 0 ? 70 : 0 },
              { key: "damages", label: "4. Damages", color: "#27ae60", pct: analytics.totalNodes > 0 ? Math.min(100, (analytics.typeCounts["location"] || 0) * 30 + 20) : 0 },
            ]).map(zone => (
              <div key={zone.key} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: zone.color }} />
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{zone.label}</div>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: zone.color, width: `${zone.pct}%`, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: panelMuted }}>
                  <span>{zone.pct}% complete</span>
                  <span>{analytics.typeCounts[zone.key === "duty" ? "evidence" : zone.key === "breach" ? "theory" : zone.key === "causation" ? "event" : "location"] || 0} cards</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Matter Data */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
            Cross-Board Sync
          </div>
          <button
            data-testid="button-sync-matter-data"
            onClick={() => syncMatterDataMutation.mutate()}
            disabled={syncMatterDataMutation.isPending}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, rgba(52,152,219,0.3), rgba(46,204,113,0.3))",
              border: "1px solid rgba(52,152,219,0.4)",
              borderRadius: 8,
              padding: "10px 14px",
              color: panelText,
              cursor: syncMatterDataMutation.isPending ? "wait" : "pointer",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              opacity: syncMatterDataMutation.isPending ? 0.6 : 1,
            }}
          >
            {syncMatterDataMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {syncMatterDataMutation.isPending ? "Syncing..." : "Sync Matter Data"}
          </button>
          <div style={{ fontSize: 10, color: panelMuted, marginTop: 6 }}>
            Pull contacts, evidence, and timeline events onto the board
          </div>
        </div>

        {/* Unaccounted Time Analysis */}
        {unaccountedTime && unaccountedTime.persons.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
              Unaccounted Time
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unaccountedTime.persons.slice(0, 5).map(person => {
                const scoreColor = person.opportunityScore > 0.6 ? "#e74c3c" : person.opportunityScore > 0.3 ? "#f39c12" : "#27ae60";
                return (
                  <div
                    key={person.person.id}
                    data-testid={`unaccounted-person-${person.person.id}`}
                    onClick={() => {
                      const node = nodes.find(n => n.id === person.person.id);
                      if (node) {
                        setSelectedNode(node);
                        setSidebarTab("details");
                      }
                    }}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${scoreColor}33`,
                      borderRadius: 8,
                      padding: 10,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{person.person.title}</div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: scoreColor,
                        background: `${scoreColor}22`,
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}>
                        {Math.round(person.opportunityScore * 100)}%
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10, color: panelMuted }}>
                      <span>{person.coveragePercent}% covered</span>
                      <span>{person.gaps.length} gaps</span>
                    </div>
                    {person.gaps.slice(0, 2).map((gap, gi) => (
                      <div key={gi} style={{
                        marginTop: 6,
                        padding: "4px 8px",
                        fontSize: 10,
                        background: gap.severity === "critical" ? "rgba(231,76,60,0.15)" : gap.severity === "high" ? "rgba(243,156,18,0.15)" : "rgba(255,255,255,0.03)",
                        borderRadius: 4,
                        color: gap.severity === "critical" ? "#e74c3c" : gap.severity === "high" ? "#f39c12" : panelMuted,
                      }}>
                        {gap.gapDays >= 1 ? `${gap.gapDays}d` : `${gap.gapHours}h`} gap
                        {gap.locationChange ? " + location change" : ""}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {unaccountedTime.summary.totalGaps > 0 && (
              <div style={{
                marginTop: 10,
                padding: 10,
                background: "rgba(231,76,60,0.1)",
                border: "1px solid rgba(231,76,60,0.2)",
                borderRadius: 8,
                fontSize: 10,
                color: "#e74c3c",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <Shield size={12} />
                {unaccountedTime.summary.totalGaps} time gaps across {unaccountedTime.summary.personsWithGaps} persons
              </div>
            )}
          </div>
        )}

        {/* AI Status */}
        <div style={{
          background: "linear-gradient(135deg, rgba(155,89,182,0.2), rgba(52,152,219,0.2))",
          border: "1px solid rgba(155,89,182,0.3)",
          borderRadius: 10,
          padding: 15,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 8,
              height: 8,
              background: "#9b59b6",
              borderRadius: "50%",
              animation: "pulse 2s infinite",
            }} />
            <div style={{ fontSize: 12, fontWeight: 600 }}>AI Analysis Engine</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {[
              { value: analytics.contradictions, label: "Contradictions" },
              { value: analytics.timelineNodes.length, label: "Timeline Events" },
              { value: analytics.typeCounts["person"] || 0, label: "Key Persons" },
              { value: analytics.timelineIssues.length, label: "Gaps Found" },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: "center", padding: 8, background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#9b59b6" }}>{stat.value}</div>
                <div style={{ fontSize: 9, color: panelMuted, textTransform: "uppercase" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER - CORK BOARD */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: "relative", overflow: "hidden", background: "#111" }}
      >
        {isConnecting && (
          <div style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            background: "#e74c3c",
            color: "white",
            padding: "6px 16px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            Click a target node to connect
            <button
              onClick={cancelConnecting}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 14 }}
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* Board Toolbar */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 30, display: "flex", gap: 8 }}>
          <button
            data-testid="button-board-export"
            onClick={() => {
              const boardState = {
                exportedAt: new Date().toISOString(),
                matterId: selectedMatterId,
                matterName: selectedMatter?.name || "",
                caseNumber: selectedMatter?.caseNumber || "",
                nodes: nodes.map(n => ({ ...n })),
                connections: connections.map(c => ({ ...c })),
                analytics: {
                  totalNodes: nodes.length,
                  totalConnections: connections.length,
                  contradictions: connections.filter(c => c.connectionType === "contradicts").length,
                  nodeTypes: Object.fromEntries(
                    Object.keys(NODE_TYPES).map(t => [t, nodes.filter(n => n.type === t).length]).filter(([, v]) => v > 0)
                  ),
                },
              };
              const blob = new Blob([JSON.stringify(boardState, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `investigation-board-${selectedMatter?.caseNumber || selectedMatterId || "export"}-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast({ title: "Board exported", description: "Investigation board exported as JSON." });
            }}
            style={{
              background: "rgba(0,0,0,0.6)",
              color: "white",
              border: "none",
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={14} /> Export
          </button>
          <button
            data-testid="button-board-search"
            onClick={() => { setShowSearch(s => !s); if (showSearch) setSearchQuery(""); }}
            style={{
              background: showSearch ? "#3498db" : "rgba(0,0,0,0.6)",
              color: "white",
              border: "none",
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Search size={14} /> Search
          </button>
        </div>

        {/* Search Overlay */}
        {showSearch && (
          <div style={{
            position: "absolute",
            top: 48,
            right: 12,
            zIndex: 30,
            background: "rgba(0,0,0,0.85)",
            borderRadius: 8,
            padding: 12,
            width: 280,
          }}>
            <input
              data-testid="input-board-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              autoFocus
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                padding: "8px 12px",
                color: "white",
                fontSize: 13,
                outline: "none",
              }}
            />
            {searchQuery.trim() && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
                {searchResults.length === 0 ? (
                  <div style={{ fontSize: 11, color: "#999", textAlign: "center", padding: 8 }}>No results found</div>
                ) : (
                  searchResults.map(n => (
                    <div
                      key={n.id}
                      data-testid={`search-result-${n.id}`}
                      onClick={() => {
                        const dims = getNodeDimensions(n.type);
                        setPan({ x: -n.position.x + containerSize.w / 2 - dims.w / 2, y: -n.position.y + containerSize.h / 2 - dims.h / 2 });
                        setSelectedNode(n);
                        setSidebarTab("details");
                      }}
                      style={{
                        padding: "6px 8px",
                        fontSize: 12,
                        color: "white",
                        cursor: "pointer",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 9, color: "#999", textTransform: "uppercase", minWidth: 50 }}>{n.type}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div
          ref={boardRef}
          data-testid="cork-board"
          onMouseDown={handleBoardMouseDown}
          style={{
            width: BOARD_W,
            height: BOARD_H,
            position: "absolute",
            left: pan.x,
            top: pan.y,
            cursor: isPanning ? "grabbing" : "grab",
            background: `
              repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.03) 40px, rgba(0,0,0,0.03) 41px),
              repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.03) 40px, rgba(0,0,0,0.03) 41px),
              linear-gradient(135deg, #c9a66b 0%, #a08050 50%, #8B7355 100%)
            `,
            boxShadow: "inset 0 0 100px rgba(0,0,0,0.3)",
          }}
        >
          {/* Zones */}
          {ZONES.map(z => {
            const zc = ZONE_COLORS[z.key as keyof typeof ZONE_COLORS];
            return (
              <div
                key={z.key}
                data-zone={z.key}
                style={{
                  position: "absolute",
                  left: z.x,
                  top: z.y,
                  width: z.w,
                  height: z.h,
                  border: `3px dashed ${zc.color}`,
                  borderRadius: 20,
                  background: zc.bg,
                  opacity: 0.25,
                  transition: "opacity 0.3s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.4"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.25"; }}
              >
                <div style={{
                  position: "absolute",
                  top: 15,
                  left: 25,
                  fontSize: 20,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 3,
                  color: zc.color,
                }}>
                  {zc.label}
                </div>
              </div>
            );
          })}

          {/* SVG Connections */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <g style={{ pointerEvents: "auto" }}>
              {connections.map(renderConnection)}
            </g>
          </svg>

          {/* Nodes */}
          {isLoadingNodes ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%" }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#95a5a6" }} />
            </div>
          ) : nodes.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%" }}>
              <div style={{ textAlign: "center", color: "#5a4a3a" }}>
                <MousePointer2 size={48} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                <p style={{ fontSize: 14 }}>Pin your first piece of evidence to start.</p>
                <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Use the palette on the left to add elements.</p>
              </div>
            </div>
          ) : (
            nodes.map(renderBoardNode)
          )}
        </div>

        {/* Minimap */}
        <MiniMap
          nodes={nodes}
          pan={pan}
          containerW={containerSize.w}
          containerH={containerSize.h}
        />

        {/* Controls hint bar */}
        <div data-testid="controls-hint-bar" style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: "rgba(0,0,0,0.7)",
          color: "rgba(255,255,255,0.6)",
          padding: "6px 16px",
          fontSize: 11,
          textAlign: "center",
        }}>
          Drag elements to move
          <span style={{ margin: "0 8px", opacity: 0.5 }}>|</span>
          Click + Drag on board to pan
          <span style={{ margin: "0 8px", opacity: 0.5 }}>|</span>
          Right-click for options
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            data-testid="context-menu"
            style={{
              position: "fixed",
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 100,
              background: "#1a1a2e",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: 4,
              minWidth: 160,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            <div
              data-testid="context-menu-edit"
              onClick={() => {
                const node = nodes.find(n => n.id === contextMenu.nodeId);
                if (node) { setSelectedNode(node); setSidebarTab("details"); }
                setContextMenu(null);
              }}
              style={{ padding: "8px 12px", fontSize: 12, color: "white", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Eye size={14} /> Edit
            </div>
            <div
              data-testid="context-menu-duplicate"
              onClick={() => {
                const node = nodes.find(n => n.id === contextMenu.nodeId);
                if (node) {
                  createNodeMutation.mutate({
                    type: node.type as keyof typeof NODE_TYPES,
                    title: node.title + " (copy)",
                    description: node.description,
                    color: node.color,
                    confidenceScore: node.confidenceScore || 0.5,
                    isInferred: node.isInferred || false,
                    reliabilityLevel: (node.reliabilityLevel || "moderate") as "strong" | "moderate" | "weak",
                    hypothesisType: (node.hypothesisType || "null") as "null" | "alternative",
                    legalElement: node.legalElement || "",
                    position: { x: node.position.x + 30, y: node.position.y + 30 },
                  });
                }
                setContextMenu(null);
              }}
              style={{ padding: "8px 12px", fontSize: 12, color: "white", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Plus size={14} /> Duplicate
            </div>
            <div
              data-testid="context-menu-connect"
              onClick={() => {
                startConnecting(contextMenu.nodeId);
                setContextMenu(null);
              }}
              style={{ padding: "8px 12px", fontSize: 12, color: "white", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Link2 size={14} /> Connect to...
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
            <div
              data-testid="context-menu-delete"
              onClick={() => {
                deleteNodeMutation.mutate(contextMenu.nodeId);
                setContextMenu(null);
              }}
              style={{ padding: "8px 12px", fontSize: 12, color: "#e74c3c", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(231,76,60,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Trash2 size={14} /> Delete
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{
        width: 320,
        minWidth: 320,
        background: panelBg,
        borderLeft: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {(["context", "history", "details"] as const).map(tab => (
            <div
              key={tab}
              data-testid={`tab-${tab}`}
              onClick={() => setSidebarTab(tab)}
              style={{
                flex: 1,
                padding: 14,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: sidebarTab === tab ? "#3498db" : panelMuted,
                cursor: "pointer",
                borderBottom: sidebarTab === tab ? "2px solid #3498db" : "2px solid transparent",
                transition: "all 0.2s",
                textTransform: "capitalize",
              }}
            >
              {tab === "context" ? "Case Data" : tab}
            </div>
          ))}
        </div>

        {/* Sidebar content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {sidebarTab === "context" ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
                Contacts ({matterContacts.length})
              </div>
              {matterContacts.length === 0 ? (
                <div style={{ fontSize: 11, color: panelMuted, padding: "8px 0 16px", textAlign: "center" }}>
                  No contacts linked to this matter yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {matterContacts.map(contact => (
                    <div key={contact.id} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: 10,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <User size={12} style={{ color: "#3498db" }} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{contact.name}</span>
                      </div>
                      <div style={{ fontSize: 10, color: panelMuted, paddingLeft: 20 }}>
                        {contact.role}
                        {contact.email && <> · {contact.email}</>}
                      </div>
                      {contact.notes && (
                        <div style={{ fontSize: 10, color: panelMuted, paddingLeft: 20, marginTop: 2, fontStyle: "italic" }}>
                          {contact.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
                Timeline ({timelineEvents.length})
              </div>
              {timelineEvents.length === 0 ? (
                <div style={{ fontSize: 11, color: panelMuted, padding: "8px 0 16px", textAlign: "center" }}>
                  No timeline events recorded yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
                  {timelineEvents
                    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
                    .map((event, i) => (
                    <div key={event.id} style={{
                      position: "relative",
                      padding: "10px 10px 10px 24px",
                      borderLeft: i < timelineEvents.length - 1 ? "2px solid rgba(255,255,255,0.1)" : "2px solid transparent",
                      marginLeft: 6,
                    }}>
                      <div style={{
                        position: "absolute",
                        left: -5,
                        top: 14,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: event.eventType === "critical" ? "#e74c3c" : event.eventType === "milestone" ? "#f39c12" : "#3498db",
                        border: `2px solid ${panelBg}`,
                      }} />
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{event.title}</div>
                      <div style={{ fontSize: 10, color: panelMuted }}>
                        {new Date(event.eventDate).toLocaleDateString()} · {event.eventType}
                      </div>
                      {event.description && (
                        <div style={{ fontSize: 10, color: panelMuted, marginTop: 2 }}>{event.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
                Evidence ({evidenceItems.length})
              </div>
              {evidenceItems.length === 0 ? (
                <div style={{ fontSize: 11, color: panelMuted, padding: "8px 0 16px", textAlign: "center" }}>
                  No evidence items in the vault yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {evidenceItems.map(item => (
                    <div key={item.id} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: 10,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <FileText size={12} style={{ color: "#e67e22" }} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{item.title}</span>
                      </div>
                      <div style={{ fontSize: 10, color: panelMuted, paddingLeft: 20 }}>
                        {item.evidenceType}
                        {item.batesNumber && <> · {item.batesNumber}</>}
                        {item.status && <> · {item.status}</>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                background: "rgba(52,152,219,0.08)",
                border: "1px solid rgba(52,152,219,0.2)",
                borderRadius: 8,
                padding: 10,
                fontSize: 10,
                color: panelMuted,
                textAlign: "center",
              }}>
                Add contacts, timeline events, and evidence from the Matter Detail page to see them here.
              </div>
            </>
          ) : sidebarTab === "history" ? (
            <>
              {/* What's New */}
              <div style={{
                background: "rgba(52,152,219,0.1)",
                border: "1px solid rgba(52,152,219,0.2)",
                borderRadius: 10,
                padding: 14,
                marginBottom: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{
                    background: "#e74c3c",
                    color: "white",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 3,
                    textTransform: "uppercase",
                  }}>NEW</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Since last session</span>
                </div>
                {analytics.contradictions > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", fontSize: 11, color: panelMuted }}>
                    <AlertTriangle size={14} style={{ color: "#e74c3c", flexShrink: 0, marginTop: 1 }} />
                    <span>AI found <strong style={{ color: panelText }}>{analytics.contradictions} contradiction(s)</strong> in evidence</span>
                  </div>
                )}
                {analytics.timelineIssues.length > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", fontSize: 11, color: panelMuted }}>
                    <Clock size={14} style={{ color: "#f39c12", flexShrink: 0, marginTop: 1 }} />
                    <span><strong style={{ color: panelText }}>{analytics.timelineIssues.length} timeline gap(s)</strong> detected</span>
                  </div>
                )}
                {analytics.isolatedNodes.length > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", fontSize: 11, color: panelMuted }}>
                    <Search size={14} style={{ color: "#3498db", flexShrink: 0, marginTop: 1 }} />
                    <span><strong style={{ color: panelText }}>{analytics.isolatedNodes.length} isolated node(s)</strong> need connections</span>
                  </div>
                )}
                {analytics.totalNodes === 0 && (
                  <div style={{ fontSize: 11, color: panelMuted, padding: "6px 0" }}>
                    No analysis data yet. Add elements to the board.
                  </div>
                )}
              </div>

              {/* Version History */}
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 12 }}>
                Version History
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{
                  position: "relative",
                  padding: "14px 14px 14px 30px",
                  borderLeft: "2px solid rgba(255,255,255,0.1)",
                  marginLeft: 8,
                }}>
                  <div style={{
                    position: "absolute",
                    left: -6,
                    top: 18,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#27ae60",
                    border: `2px solid ${panelBg}`,
                    boxShadow: "0 0 0 3px rgba(39,174,96,0.3)",
                  }} />
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Current Version</div>
                  <div style={{ fontSize: 10, color: panelMuted }}>Now</div>
                  <div style={{ fontSize: 10, color: panelMuted, marginTop: 2 }}>
                    {analytics.totalNodes} nodes, {analytics.totalConnections} connections
                  </div>
                </div>
                {nodes.slice(0, 5).map((node, i) => (
                  <div key={node.id} style={{
                    position: "relative",
                    padding: "14px 14px 14px 30px",
                    borderLeft: "2px solid rgba(255,255,255,0.1)",
                    marginLeft: 8,
                  }}>
                    <div style={{
                      position: "absolute",
                      left: -6,
                      top: 18,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#3498db",
                      border: `2px solid ${panelBg}`,
                    }} />
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Added: {node.title}</div>
                    <div style={{ fontSize: 10, color: panelMuted }}>{new Date(node.createdAt).toLocaleDateString()}</div>
                    <div style={{ fontSize: 10, color: panelMuted, marginTop: 2 }}>+1 {node.type}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {selectedNode ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    {(() => {
                      const Icon = NODE_TYPES[selectedNode.type]?.icon || FileText;
                      return <Icon size={18} style={{ color: PIN_COLORS[selectedNode.type] }} />;
                    })()}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedNode.title}</div>
                      <div style={{ fontSize: 11, color: panelMuted, textTransform: "capitalize" }}>{selectedNode.type}</div>
                    </div>
                  </div>

                  {selectedNode.description && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 6 }}>Description</div>
                      <p style={{ fontSize: 12, lineHeight: 1.5, color: "#bdc3c7" }}>{selectedNode.description}</p>
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 6 }}>Position</div>
                    <p style={{ fontSize: 11, color: "#bdc3c7" }}>x: {Math.round(selectedNode.position.x)}, y: {Math.round(selectedNode.position.y)}</p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 6 }}>Created</div>
                    <p style={{ fontSize: 11, color: "#bdc3c7" }}>{new Date(selectedNode.createdAt).toLocaleString()}</p>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                    {isConnecting ? (
                      <Button variant="outline" onClick={cancelConnecting} style={{ flex: 1, fontSize: 12 }}>
                        <XCircle size={14} style={{ marginRight: 6 }} /> Cancel
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => startConnecting(selectedNode.id)} style={{ flex: 1, fontSize: 12 }}>
                        <Link2 size={14} style={{ marginRight: 6 }} /> Connect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => deleteNodeMutation.mutate(selectedNode.id)}
                      style={{ color: "#e74c3c", borderColor: "rgba(231,76,60,0.3)", fontSize: 12 }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ) : selectedConnection ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Connection Details</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 6 }}>From / To</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span>{nodes.find(n => n.id === selectedConnection.sourceNodeId)?.title}</span>
                      <ArrowRight size={14} style={{ color: panelMuted }} />
                      <span>{nodes.find(n => n.id === selectedConnection.targetNodeId)?.title}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 6 }}>Type</div>
                    <Badge style={{
                      background: CONNECTION_COLOR_MAP[selectedConnection.connectionType] || "#78716c",
                      color: "white",
                      fontSize: 11,
                    }}>
                      {CONNECTION_TYPES[selectedConnection.connectionType]?.label}
                    </Badge>
                  </div>
                  {selectedConnection.label && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 6 }}>Label</div>
                      <p style={{ fontSize: 12, color: "#bdc3c7" }}>{selectedConnection.label}</p>
                    </div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 6 }}>Strength</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: n <= selectedConnection.strength ? "#3498db" : "rgba(255,255,255,0.1)",
                        }} />
                      ))}
                    </div>
                  </div>
                  {selectedConnection.notes && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 6 }}>Notes</div>
                      <p style={{ fontSize: 12, color: "#bdc3c7" }}>{selectedConnection.notes}</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => deleteConnectionMutation.mutate(selectedConnection.id)}
                    style={{ color: "#e74c3c", borderColor: "rgba(231,76,60,0.3)", fontSize: 12, marginTop: 12 }}
                  >
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Remove Connection
                  </Button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", paddingTop: 60 }}>
                  <MousePointer2 size={40} style={{ color: panelMuted, opacity: 0.4, marginBottom: 12 }} />
                  <p style={{ fontSize: 12, color: panelMuted, textAlign: "center" }}>Click a node or connection on the board to view details</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Connection Legend */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "12px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: panelMuted, marginBottom: 8 }}>
            String Legend
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {Object.entries(CONNECTION_TYPES).map(([key, { label, color, style }]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: panelMuted }}>
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

      {/* ADD NODE DIALOG */}
      <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
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
              <div className="flex gap-2 flex-wrap">
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
            <div className="space-y-2">
              <Label>Confidence ({Math.round(nodeForm.confidenceScore * 100)}%)</Label>
              <Slider
                min={0} max={100} step={5}
                value={[Math.round(nodeForm.confidenceScore * 100)]}
                onValueChange={([v]) => setNodeForm(p => ({ ...p, confidenceScore: v / 100 }))}
                data-testid="slider-node-confidence"
              />
            </div>
            <div className="space-y-2">
              <Label>Reliability</Label>
              <Select value={nodeForm.reliabilityLevel} onValueChange={v => setNodeForm(p => ({ ...p, reliabilityLevel: v as any }))}>
                <SelectTrigger data-testid="select-node-reliability">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strong">Strong (Direct + Corroborated)</SelectItem>
                  <SelectItem value="moderate">Moderate (Direct OR Multi-source)</SelectItem>
                  <SelectItem value="weak">Weak (Single-source Inferential)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={nodeForm.isInferred}
                onChange={e => setNodeForm(p => ({ ...p, isInferred: e.target.checked }))}
                data-testid="checkbox-node-inferred"
                className="rounded"
              />
              <Label className="text-sm">This is an inference (not directly observed)</Label>
            </div>
            {nodeForm.type === "hypothesis" && (
              <div className="space-y-2">
                <Label>Hypothesis Type</Label>
                <Select value={nodeForm.hypothesisType} onValueChange={v => setNodeForm(p => ({ ...p, hypothesisType: v as any }))}>
                  <SelectTrigger data-testid="select-hypothesis-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">H0 (Null Hypothesis)</SelectItem>
                    <SelectItem value="alternative">H1+ (Alternative Hypothesis)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {nodeForm.type === "legal_element" && (
              <div className="space-y-2">
                <Label>Legal Element</Label>
                <Select value={nodeForm.legalElement} onValueChange={v => setNodeForm(p => ({ ...p, legalElement: v }))}>
                  <SelectTrigger data-testid="select-legal-element">
                    <SelectValue placeholder="Select element..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intent">Intent</SelectItem>
                    <SelectItem value="knowledge">Knowledge</SelectItem>
                    <SelectItem value="causation">Causation</SelectItem>
                    <SelectItem value="damages">Damages</SelectItem>
                    <SelectItem value="duty">Duty</SelectItem>
                    <SelectItem value="breach">Breach</SelectItem>
                    <SelectItem value="pattern">Pattern</SelectItem>
                    <SelectItem value="notice">Notice</SelectItem>
                    <SelectItem value="standing">Standing</SelectItem>
                    <SelectItem value="jurisdiction">Jurisdiction</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              data-testid="btn-add-element"
              onClick={handleAddNode}
              disabled={!nodeForm.title || createNodeMutation.isPending}
            >
              {createNodeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Pin to Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD CONNECTION DIALOG */}
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
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md flex-wrap">
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(155, 89, 182, 0.7); }
          50% { opacity: 0.8; box-shadow: 0 0 0 8px rgba(155, 89, 182, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gapPulse {
          0%, 100% { border-color: #e74c3c; }
          50% { border-color: #c0392b88; }
        }
      `}</style>
    </div>
  );
}

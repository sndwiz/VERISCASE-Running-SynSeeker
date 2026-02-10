import { useState, useEffect, useCallback, useRef } from "react";

// ── Color Tokens ──────────────────────────────────────
const T = {
  bg: "#0a0a0a",
  card: "#141414",
  cardHover: "#1a1a1a",
  border: "#262626",
  borderActive: "#404040",
  text: "#e5e5e5",
  textMuted: "#737373",
  textDim: "#525252",
  primary: "#a3a3a3",
  accent: "#e5e5e5",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.12)",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.12)",
  purple: "#a855f7",
  purpleDim: "rgba(168,85,247,0.12)",
};

// ── Icons (inline SVG for zero deps) ──────────────────
function SearchIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}
function CheckIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
}
function ChevronDown({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
}
function ChevronRight({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
}
function ShieldIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function LockIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}
function ScaleIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>;
}
function GavelIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>;
}
function FileIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>;
}
function BrainIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>;
}
function StopIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>;
}
function AlertIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 4 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
}
function EyeIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
}

// ── Spinner Component ─────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={T.borderActive} strokeWidth="2.5" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke={T.text} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Dotted Circle (pending state) ─────────────────────
function DottedCircle({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={T.textDim} strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
}

// ── Main App ──────────────────────────────────────────
export default function VericasePrototype() {
  const [activeTab, setActiveTab] = useState("research");

  const tabs = [
    { id: "research", label: "Research Engine" },
    { id: "kill", label: "Kill Switch" },
    { id: "classify", label: "Doc Classifier" },
    { id: "litigation", label: "Litigation Flow" },
    { id: "datasources", label: "Data Sources" },
  ];

  return (
    <div style={{
      background: T.bg,
      color: T.text,
      minHeight: "100vh",
      fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; border: none; background: none; color: inherit; font: inherit; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${T.border}`,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #333 0%, #1a1a1a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${T.border}`,
          }}>
            <ScaleIcon size={16} />
          </div>
          <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>VERICASE</span>
          <span style={{ color: T.textDim, fontSize: 12 }}>Research & Intelligence</span>
        </div>
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 500 : 400,
                color: activeTab === tab.id ? T.text : T.textMuted,
                background: activeTab === tab.id ? T.card : "transparent",
                border: activeTab === tab.id ? `1px solid ${T.border}` : "1px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        {activeTab === "research" && <ResearchDemo />}
        {activeTab === "kill" && <KillSwitchDemo />}
        {activeTab === "classify" && <DocClassifierDemo />}
        {activeTab === "litigation" && <LitigationDemo />}
        {activeTab === "datasources" && <DataSourcesPanel />}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// RESEARCH ENGINE DEMO
// ════════════════════════════════════════════════════════
function ResearchDemo() {
  const [query, setQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [steps, setSteps] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef(null);

  const presetQueries = [
    "Utah attorney tampering laws",
    "CMS-1500 billing fraud indicators",
    "Rule 26 discovery obligations Utah",
    "Statute of limitations personal injury Utah",
  ];

  const generateSteps = (q) => {
    const lower = q.toLowerCase();
    const s = [];
    if (lower.includes("utah") || lower.includes("statute") || lower.includes("law") || lower.includes("code"))
      s.push({ label: "Search Utah Code for statutes on unauthorized practice of law and related offenses", status: "pending", sources: [] });
    if (lower.includes("tamper") || lower.includes("criminal") || lower.includes("obstruction"))
      s.push({ label: "Review Utah criminal statutes for obstruction, witness tampering, and harassment", status: "pending", sources: [] });
    if (lower.includes("attorney") || lower.includes("bar") || lower.includes("upl"))
      s.push({ label: "Check Utah State Bar rules and guidance on attorney interference and UPL", status: "pending", sources: [] });
    if (lower.includes("cms") || lower.includes("billing") || lower.includes("1500"))
      s.push({ label: "Search CMS-1500 form specifications and billing code databases", status: "pending", sources: [] });
    if (lower.includes("fraud") || lower.includes("indicator"))
      s.push({ label: "Cross-reference known billing fraud patterns and OIG guidelines", status: "pending", sources: [] });
    if (lower.includes("rule") || lower.includes("discovery"))
      s.push({ label: "Review Utah Rules of Civil Procedure for applicable provisions", status: "pending", sources: [] });
    if (lower.includes("limitation") || lower.includes("injury"))
      s.push({ label: "Search Utah Code Title 78B for applicable limitation periods", status: "pending", sources: [] });
    s.push({ label: "Survey recent bills and case law affecting the topic", status: "pending", sources: [] });
    s.push({ label: "Compile findings into concise legal summaries with statute citations", status: "pending", sources: [] });
    if (s.length < 3) {
      s.unshift({ label: `Search legal databases for "${q}"`, status: "pending", sources: [] });
      s.splice(1, 0, { label: "Review relevant statutes and regulations", status: "pending", sources: [] });
    }
    return s;
  };

  const sourceBank = [
    { title: "Utah Code § 76-8-508 — Tampering with witness", type: "statute" },
    { title: "Utah Code § 78B-3-104 — Statute of limitations", type: "statute" },
    { title: "Utah R. Prof. Conduct 8.4 — Misconduct", type: "rule" },
    { title: "State v. Martinez, 2023 UT App 45", type: "case" },
    { title: "OIG Compliance Program Guidance", type: "article" },
    { title: "Utah Code § 78A-6-105", type: "statute" },
    { title: "CMS IOM Pub 100-04, Ch. 26", type: "article" },
    { title: "Utah State Bar Ethics Advisory Op. 19-03", type: "rule" },
  ];

  const startResearch = (q) => {
    if (!q.trim()) return;
    const newSteps = generateSteps(q);
    setSteps(newSteps);
    setIsResearching(true);
    setShowResults(false);
    let i = 0;
    const advance = () => {
      if (i < newSteps.length) {
        setSteps(prev => prev.map((s, idx) => ({
          ...s,
          status: idx < i ? "complete" : idx === i ? "running" : "pending",
          sources: idx < i ? [sourceBank[idx % sourceBank.length], sourceBank[(idx + 3) % sourceBank.length]] : [],
        })));
        i++;
        timerRef.current = setTimeout(advance, 1200 + Math.random() * 1800);
      } else {
        setSteps(prev => prev.map((s, idx) => ({
          ...s, status: "complete",
          sources: [sourceBank[idx % sourceBank.length], sourceBank[(idx + 3) % sourceBank.length]],
        })));
        setIsResearching(false);
        setShowResults(true);
      }
    };
    advance();
  };

  const cancelResearch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsResearching(false);
    setSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "pending" } : s));
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const completedCount = steps.filter(s => s.status === "complete").length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const sourceColors = { statute: T.blue, case: T.amber, rule: T.purple, article: T.green };
  const SourceTypeIcon = ({ type }) => {
    if (type === "statute") return <ScaleIcon size={12} />;
    if (type === "case") return <GavelIcon size={12} />;
    if (type === "rule") return <FileIcon size={12} />;
    return <FileIcon size={12} />;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px",
        }}>
          <SearchIcon size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && startResearch(query)}
            placeholder="What do you need to research?"
            disabled={isResearching}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 14 }}
          />
        </div>
        <button
          onClick={() => startResearch(query)}
          disabled={isResearching || !query.trim()}
          style={{
            padding: "10px 20px", borderRadius: 10, fontWeight: 500, fontSize: 13,
            background: isResearching ? T.border : T.text, color: isResearching ? T.textMuted : T.bg,
            opacity: (!query.trim() && !isResearching) ? 0.4 : 1, transition: "all 0.15s",
          }}
        >Research</button>
      </div>

      {steps.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {presetQueries.map(pq => (
            <button key={pq} onClick={() => { setQuery(pq); startResearch(pq); }}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, border: `1px solid ${T.border}`, color: T.textMuted, transition: "all 0.15s" }}
              onMouseEnter={e => { e.target.style.borderColor = T.borderActive; e.target.style.color = T.text; }}
              onMouseLeave={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textMuted; }}
            >{pq}</button>
          ))}
        </div>
      )}

      {steps.length > 0 && (
        <div style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px 24px 20px",
          animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 24, letterSpacing: "-0.01em" }}>{query}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                opacity: step.status === "pending" ? 0.45 : 1, transition: "all 0.4s ease",
                animation: step.status !== "pending" ? "slideIn 0.3s ease-out" : "none",
                transform: step.status === "running" ? "translateX(2px)" : "none",
              }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {step.status === "complete" && <CheckIcon size={20} />}
                  {step.status === "running" && <Spinner size={20} />}
                  {step.status === "pending" && <DottedCircle size={20} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14, lineHeight: 1.55,
                    fontWeight: step.status === "running" ? 450 : 400,
                    color: step.status === "pending" ? T.textMuted : T.text,
                  }}>{step.label}</div>
                  {step.status === "complete" && step.sources?.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {step.sources.map((src, si) => (
                        <div key={si} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          fontSize: 12, color: T.textMuted, padding: "3px 0", cursor: "pointer", transition: "color 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = T.text}
                        onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
                        >
                          <span style={{ color: sourceColors[src.type] || T.textMuted }}><SourceTypeIcon type={src.type} /></span>
                          <span>{src.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isResearching && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: T.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                  <Spinner size={14} />Researching...
                </span>
                <button onClick={cancelResearch}
                  style={{ width: 28, height: 28, borderRadius: 6, background: T.border, display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Stop research"><StopIcon size={12} /></button>
              </div>
              <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: T.text, borderRadius: 2, width: `${progress}%`, transition: "width 0.7s ease-out" }} />
              </div>
            </div>
          )}

          {showResults && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, animation: "fadeIn 0.4s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: T.greenDim, color: T.green }}>Complete</div>
                <span style={{ fontSize: 12, color: T.textMuted }}>
                  {steps.length} steps · {steps.reduce((a, s) => a + (s.sources?.length || 0), 0)} sources found
                </span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: T.textMuted }}>
                Research compiled. Found relevant statutes, case law, and bar rules. Click any source above to view the full text with VERICASE analysis.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════
// KILL SWITCH DEMO
// ════════════════════════════════════════════════════════
function KillSwitchDemo() {
  const [mode, setMode] = useState("normal");
  const [showConfirm, setShowConfirm] = useState(false);
  const [log, setLog] = useState([]);

  const handleClick = () => {
    if (mode === "normal") setMode("armed");
    else if (mode === "armed") setShowConfirm(true);
    else if (mode === "lockdown") { setMode("normal"); setLog([]); }
  };

  const activate = () => {
    setMode("lockdown");
    setShowConfirm(false);
    setLog([
      { time: "Now", action: "All processing STOPPED" },
      { time: "Now", action: "Dark mode security enabled" },
      { time: "Now", action: "3 honeypot documents deployed with tracers" },
      { time: "Now", action: "Full audit logging activated" },
      { time: "Now", action: "Matter permissions locked" },
    ]);
  };

  const modeStyles = {
    normal: { bg: T.card, border: T.border, color: T.textMuted, label: "File Kill Switch", sublabel: "Click to arm" },
    armed: { bg: T.amberDim, border: "rgba(245,158,11,0.3)", color: T.amber, label: "ARMED", sublabel: "Click to deploy — all processing will stop" },
    lockdown: { bg: T.redDim, border: "rgba(239,68,68,0.3)", color: T.red, label: "🔒 LOCKDOWN ACTIVE", sublabel: "Click to deactivate" },
  };
  const ms = modeStyles[mode];

  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
        Emergency security protocol. Stops all processing, deploys fake unprotected documents with invisible tracers, enables full audit logging, and locks matter permissions.
      </p>
      <button onClick={handleClick}
        style={{
          width: "100%", padding: "20px 24px", background: ms.bg, border: `1px solid ${ms.border}`, borderRadius: 12,
          display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s",
          animation: mode === "armed" ? "pulse 2s infinite" : "none",
        }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: mode === "lockdown" ? T.redDim : mode === "armed" ? T.amberDim : T.border,
          display: "flex", alignItems: "center", justifyContent: "center", color: ms.color,
        }}>
          {mode === "lockdown" ? <LockIcon size={24} /> : <ShieldIcon size={24} />}
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: ms.color }}>{ms.label}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{ms.sublabel}</div>
        </div>
      </button>

      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, maxWidth: 420, width: "90%", animation: "fadeIn 0.2s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ color: T.red }}><AlertIcon size={20} /></span>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Activate Kill Switch?</span>
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
              This will immediately:
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {["Stop ALL document processing on this matter", "Switch to dark mode / full security audit",
                  "Deploy fake unprotected documents with tracers", "Log all file access attempts with full details",
                  "Lock down matter permissions"].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: 2, background: T.red, flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowConfirm(false); setMode("normal"); }}
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: `1px solid ${T.border}`, color: T.textMuted }}>Cancel</button>
              <button onClick={activate}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: T.red, color: "#fff" }}>ACTIVATE KILL SWITCH</button>
            </div>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div style={{ marginTop: 20, background: T.card, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 12, padding: 16, animation: "fadeIn 0.3s ease-out" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.red, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <EyeIcon size={13} /> SECURITY LOG
          </div>
          {log.map((entry, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 12, color: T.textMuted,
              borderBottom: i < log.length - 1 ? `1px solid ${T.border}` : "none",
              animation: `slideIn 0.3s ease-out ${i * 0.1}s both`,
            }}>
              <span style={{ fontFamily: "monospace", color: T.textDim, width: 32, flexShrink: 0 }}>{entry.time}</span>
              <span>{entry.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════
// DOC CLASSIFIER DEMO
// ════════════════════════════════════════════════════════
function DocClassifierDemo() {
  const [expanded, setExpanded] = useState(null);

  const docs = [
    { title: "Complaint for Damages", type: "Pleading", nature: "LAW", color: T.blue, colorDim: T.blueDim,
      desc: "Sets forth legal claims — this IS the law. Establishes the cause of action, jurisdiction, and relief sought.",
      indicators: ["Cause of action", "Jurisdiction allegation", "Prayer for relief", "Factual allegations"] },
    { title: "Motion to Dismiss", type: "Motion", nature: "ARGUMENT", color: T.amber, colorDim: T.amberDim,
      desc: "Requests court action through ARGUMENT. Argues why the complaint fails as a matter of law.",
      indicators: ["\"Defendant moves the court\"", "Legal argument", "Standard of review", "Conclusion requesting action"] },
    { title: "Answer to Complaint", type: "Pleading", nature: "LAW", color: T.blue, colorDim: T.blueDim,
      desc: "Responsive pleading — admits or denies allegations. Sets the legal framework for defense.",
      indicators: ["Admission/denial pattern", "Affirmative defenses", "Counterclaims"] },
    { title: "Motion for Summary Judgment", type: "Motion", nature: "ARGUMENT", color: T.amber, colorDim: T.amberDim,
      desc: "ARGUMENT that no genuine dispute of material fact exists. Asks court to rule without trial.",
      indicators: ["Undisputed facts", "Legal standard", "\"No genuine issue\"", "Supporting memorandum"] },
    { title: "Notice of Hearing", type: "Filing", nature: "PROCEDURAL", color: T.textMuted, colorDim: "rgba(115,115,115,0.1)",
      desc: "Administrative court filing. Neither law nor argument — purely procedural.",
      indicators: ["Date/time/location", "Certificate of service", "Case number"] },
    { title: "Memorandum in Support", type: "Brief", nature: "ARGUMENT", color: T.green, colorDim: T.greenDim,
      desc: "Pure legal ARGUMENT with case citations. Supports a motion with detailed reasoning.",
      indicators: ["Case citations", "Legal analysis", "Factual background", "Argument headers"] },
  ];

  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}>
        Motions and pleadings are NOT the same thing. One is <span style={{ color: T.blue, fontWeight: 500 }}>LAW</span>,
        the other is <span style={{ color: T.amber, fontWeight: 500 }}>ARGUMENT</span>.
        VERICASE classifies every document so the attorney knows exactly what she's working with.
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, padding: "12px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.blue }} />
          <span style={{ color: T.textMuted }}>Pleading = LAW</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.amber }} />
          <span style={{ color: T.textMuted }}>Motion = ARGUMENT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.textMuted }} />
          <span style={{ color: T.textMuted }}>Filing = PROCEDURAL</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {docs.map((doc, i) => (
          <div key={i}>
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: expanded === i ? "10px 10px 0 0" : 10,
                background: expanded === i ? T.card : "transparent",
                border: `1px solid ${expanded === i ? T.border : "transparent"}`,
                borderBottom: expanded === i ? "none" : "1px solid transparent", textAlign: "left", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (expanded !== i) e.currentTarget.style.background = T.cardHover; }}
              onMouseLeave={e => { if (expanded !== i) e.currentTarget.style.background = "transparent"; }}
            >
              {expanded === i ? <ChevronDown /> : <ChevronRight />}
              <span style={{ flex: 1, fontWeight: 450 }}>{doc.title}</span>
              <span style={{ padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: doc.colorDim, color: doc.color, letterSpacing: "0.03em" }}>{doc.nature}</span>
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, border: `1px solid ${T.border}`, color: T.textMuted }}>{doc.type}</span>
            </button>
            {expanded === i && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 16px 16px 44px", animation: "fadeIn 0.2s ease-out" }}>
                <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, marginBottom: 10 }}>{doc.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {doc.indicators.map((ind, j) => (
                    <span key={j} style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, background: T.border, color: T.textMuted }}>{ind}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// LITIGATION WORKFLOW
// ════════════════════════════════════════════════════════
function LitigationDemo() {
  const [expandedPhase, setExpandedPhase] = useState("pleading");
  const [completed, setCompleted] = useState(new Set(["intake", "investigation", "demand", "sol-check", "fee-agreement"]));

  const phases = [
    { id: "pre-litigation", name: "Pre-Litigation", steps: [
      { id: "intake", label: "Client intake & conflict check" },
      { id: "investigation", label: "Factual investigation & evidence preservation" },
      { id: "demand", label: "Demand letter / pre-suit notice" },
      { id: "sol-check", label: "Statute of limitations analysis" },
      { id: "fee-agreement", label: "Fee agreement & engagement letter" },
    ]},
    { id: "pleading", name: "Pleading Phase", active: true, steps: [
      { id: "complaint", label: "Draft & file complaint", nature: "LAW", hint: "This IS the law — establishes legal claims" },
      { id: "summons", label: "Issue summons & serve defendant" },
      { id: "answer", label: "Answer / responsive pleading deadline", nature: "LAW" },
      { id: "counterclaim", label: "Counterclaims / cross-claims", nature: "LAW", opt: true },
      { id: "rule12", label: "Rule 12 motions (MTD, MSJ)", nature: "ARG", hint: "ARGUMENT — requesting court action", opt: true },
    ]},
    { id: "discovery", name: "Discovery Phase", steps: [
      { id: "disc-plan", label: "Discovery plan & scheduling order" },
      { id: "interrogatories", label: "Interrogatories", opt: true },
      { id: "rfp", label: "Requests for Production", opt: true },
      { id: "rfa", label: "Requests for Admission", opt: true },
      { id: "depositions", label: "Depositions", opt: true },
      { id: "expert", label: "Expert witness disclosures", opt: true },
    ]},
    { id: "pre-trial", name: "Pre-Trial", steps: [
      { id: "msj", label: "Motion for Summary Judgment", nature: "ARG", hint: "Asking court to rule without trial" },
      { id: "mediation", label: "Mediation / settlement conference" },
      { id: "mil", label: "Motions in Limine", nature: "ARG", opt: true },
      { id: "trial-prep", label: "Trial preparation & exhibit lists" },
    ]},
    { id: "trial", name: "Trial", steps: [
      { id: "opening", label: "Opening statements" },
      { id: "plaintiff-case", label: "Plaintiff's case-in-chief" },
      { id: "defense-case", label: "Defense case" },
      { id: "verdict", label: "Verdict / judgment", nature: "LAW" },
    ]},
    { id: "post-trial", name: "Post-Trial", steps: [
      { id: "post-motions", label: "Post-trial motions", nature: "ARG", opt: true },
      { id: "appeal", label: "Notice of appeal", opt: true },
      { id: "enforcement", label: "Judgment enforcement", opt: true },
    ]},
  ];

  const toggleComplete = (stepId) => {
    setCompleted(prev => { const n = new Set(prev); if (n.has(stepId)) n.delete(stepId); else n.add(stepId); return n; });
  };

  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
        Civil litigation workflow. Guides the attorney through each phase, tagging <span style={{ color: T.blue }}>LAW</span> vs <span style={{ color: T.amber }}>ARGUMENT</span> at every step.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {phases.map((phase, pi) => {
          const done = phase.steps.filter(s => completed.has(s.id)).length;
          const total = phase.steps.length;
          const pct = (done / total) * 100;
          const isExp = expandedPhase === phase.id;
          const allDone = done === total;

          return (
            <div key={phase.id} style={{ border: `1px solid ${phase.active ? "rgba(229,229,229,0.15)" : T.border}`, borderRadius: 10, background: phase.active ? "rgba(229,229,229,0.03)" : "transparent", overflow: "hidden" }}>
              <button onClick={() => setExpandedPhase(isExp ? null : phase.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", textAlign: "left" }}>
                {isExp ? <ChevronDown /> : <ChevronRight />}
                <span style={{ fontFamily: "monospace", color: T.textDim, fontSize: 12, width: 20 }}>{pi + 1}.</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{phase.name}</span>
                {phase.active && <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: "rgba(229,229,229,0.1)", color: T.text }}>Active</span>}
                {allDone && <CheckIcon size={16} />}
                <span style={{ fontSize: 11, color: T.textDim, width: 30, textAlign: "right" }}>{done}/{total}</span>
                <div style={{ width: 60, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2, transition: "width 0.3s", background: allDone ? T.green : T.text, width: `${pct}%` }} />
                </div>
              </button>
              {isExp && (
                <div style={{ padding: "0 16px 14px" }}>
                  {phase.steps.map((step) => {
                    const isDone = completed.has(step.id);
                    return (
                      <div key={step.id} onClick={() => toggleComplete(step.id)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = T.cardHover}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%",
                          border: isDone ? "none" : `1.5px solid ${T.textDim}`,
                          background: isDone ? T.green : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0,
                        }}>
                          {isDone && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, textDecoration: isDone ? "line-through" : "none", color: isDone ? T.textDim : T.text }}>
                          {step.label}{step.opt && <span style={{ color: T.textDim, fontSize: 11 }}> (opt)</span>}
                        </span>
                        {step.nature === "LAW" && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: T.blueDim, color: T.blue }}>LAW</span>}
                        {step.nature === "ARG" && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: T.amberDim, color: T.amber }}>ARG</span>}
                        {step.hint && <span title={step.hint} style={{ color: T.textDim, cursor: "help" }}><BrainIcon size={13} /></span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// DATA SOURCES
// ════════════════════════════════════════════════════════
function DataSourcesPanel() {
  const [expanded, setExpanded] = useState("free-legal");

  const categories = [
    { id: "free-legal", title: "Free Legal Data APIs", sub: "No scraping needed — official APIs", color: T.green, sources: [
      { name: "CourtListener / RECAP", url: "courtlistener.com/api", desc: "400M+ case opinions, dockets, oral arguments. Free REST API by Free Law Project (nonprofit).", license: "Public domain / CC", method: "REST API", cost: "Free" },
      { name: "Utah Courts Xchange", url: "utcourts.gov", desc: "Utah-specific case search, docket lookup. Official state court system.", license: "Public records", method: "Web portal + exports", cost: "Free" },
      { name: "US Code / eCFR", url: "ecfr.gov/api", desc: "Full text of federal regulations. Official government API.", license: "Public domain", method: "REST API (JSON/XML)", cost: "Free" },
      { name: "Congress.gov API", url: "api.congress.gov", desc: "Bills, resolutions, amendments, committee reports.", license: "Public domain", method: "REST API", cost: "Free (key required)" },
    ]},
    { id: "utah", title: "Utah-Specific Sources", sub: "State statutes, rules, bar opinions", color: T.blue, sources: [
      { name: "Utah State Legislature", url: "le.utah.gov", desc: "Full Utah Code, session laws, bill tracking. Official XML data feeds.", license: "Public domain", method: "XML feeds + web", cost: "Free" },
      { name: "Utah State Bar", url: "utahbar.org", desc: "Rules of Professional Conduct, ethics opinions, attorney directory.", license: "Public", method: "Respectful scraping", cost: "Free" },
      { name: "Utah Appellate Opinions", url: "utcourts.gov/opinions", desc: "Published opinions from UT Supreme Court and Court of Appeals.", license: "Public domain", method: "RSS + PDF download", cost: "Free" },
    ]},
    { id: "medical", title: "CMS-1500 / Medical Billing", sub: "For billing verification features", color: T.purple, sources: [
      { name: "CMS.gov HCPCS/CPT Lookup", url: "cms.gov/Medicare/Coding", desc: "Procedure codes, fee schedules, coding guidelines.", license: "Public (CPT © AMA)", method: "Data downloads", cost: "Free" },
      { name: "NPI Registry API", url: "npiregistry.cms.hhs.gov", desc: "National Provider Identifier lookup. Verify provider credentials.", license: "Public domain", method: "REST API", cost: "Free" },
      { name: "ICD-10 Code Database", url: "cms.gov/Medicare/Coding/ICD10", desc: "Diagnosis codes, crosswalks, clinical descriptions.", license: "Public domain", method: "Data download", cost: "Free" },
      { name: "OIG Exclusion DB", url: "exclusions.oig.hhs.gov", desc: "Check if providers are excluded from federal healthcare programs.", license: "Public domain", method: "REST API + bulk", cost: "Free" },
      { name: "Medicare Fee Schedule", url: "cms.gov/Medicare", desc: "Physician fee schedules, geographic practice cost indices.", license: "Public domain", method: "CSV downloads", cost: "Free" },
    ]},
    { id: "rules", title: "Ethical Scraping Rules", sub: "How to do it right", color: T.amber, sources: [
      { name: "robots.txt compliance", desc: "ALWAYS check robots.txt first. If it says no, don't scrape.", method: "Rule" },
      { name: "Rate limiting", desc: "Max 1 req/sec for gov sites, 1 req/3 sec for others. Exponential backoff.", method: "Rule" },
      { name: "Identify your bot", desc: "User-Agent: 'VERICASE-LegalResearch/1.0 (contact@synergylawpllc.com)'. Never impersonate browsers.", method: "Rule" },
      { name: "Cache aggressively", desc: "Statutes = 24-72hr cache. Case opinions = permanent cache. They don't change.", method: "Rule" },
      { name: "Public records doctrine", desc: "Court filings, statutes, and regulations are public records. Scraping is generally legal.", method: "Legal basis" },
      { name: "No paywall circumvention", desc: "Never scrape Westlaw, LexisNexis, or paid databases. Use free alternatives.", method: "Rule" },
    ]},
    { id: "libs", title: "Libraries & Tools", sub: "npm install these", color: T.text, sources: [
      { name: "cheerio", desc: "Fast HTML parser for static pages (court opinions, statute text).", method: "npm install cheerio", cost: "Free" },
      { name: "playwright", desc: "Headless browser for JS-rendered pages. Use only when needed.", method: "npm install playwright", cost: "Free" },
      { name: "pdf-parse", desc: "Extract text from court filing PDFs.", method: "npm install pdf-parse", cost: "Free" },
      { name: "bottleneck", desc: "Rate limiter for API calls. Set per-domain limits.", method: "npm install bottleneck", cost: "Free" },
      { name: "node-cron", desc: "Schedule data refreshes. Statutes weekly, case law daily.", method: "npm install node-cron", cost: "Free" },
    ]},
  ];

  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
        Everything here is either an official API, public records, or ethically scrapeable. No Westlaw. No LexisNexis. No paywall circumvention.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {categories.map(cat => {
          const isExp = expanded === cat.id;
          return (
            <div key={cat.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setExpanded(isExp ? null : cat.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", textAlign: "left" }}>
                {isExp ? <ChevronDown /> : <ChevronRight />}
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{cat.title}</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>{cat.sub}</div>
                </div>
                <span style={{ fontSize: 11, color: T.textDim }}>{cat.sources.length}</span>
              </button>
              {isExp && (
                <div style={{ padding: "0 16px 14px" }}>
                  {cat.sources.map((src, i) => (
                    <div key={i} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 4, border: `1px solid ${T.border}`, background: T.cardHover }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{src.name}</span>
                        {src.url && <span style={{ fontSize: 11, color: T.textDim, fontFamily: "monospace" }}>{src.url}</span>}
                      </div>
                      <p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginBottom: 6 }}>{src.desc}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {src.method && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, background: T.border, color: T.textMuted }}>{src.method}</span>}
                        {src.license && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, background: T.border, color: T.textMuted }}>{src.license}</span>}
                        {src.cost && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, background: src.cost === "Free" ? T.greenDim : T.amberDim, color: src.cost === "Free" ? T.green : T.amber }}>{src.cost}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react"
import { api } from "../api"
import { useProject } from "../context/ProjectContext"
import RoadmapView from "./main/RoadmapView"

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      flex: 1,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: "14px",
      color: "var(--text-dim)",
    }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" stroke="var(--border)" strokeWidth="1.5"/>
        <circle cx="18" cy="18" r="8" stroke="var(--text-dim)" strokeWidth="1.2" strokeDasharray="3 2"/>
        <circle cx="18" cy="10" r="2" fill="var(--text-dim)" opacity="0.6"/>
        <circle cx="24.9" cy="14" r="2" fill="var(--text-dim)" opacity="0.4"/>
        <circle cx="24.9" cy="22" r="2" fill="var(--border)" opacity="0.5"/>
        <circle cx="18" cy="26" r="2" fill="var(--border)" opacity="0.5"/>
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "4px" }}>
          No project selected
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
          Create or select a project from the sidebar
        </div>
      </div>
    </div>
  )
}

// ── SetupView ─────────────────────────────────────────────────────────────────
function SetupView({ name, creating }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 32px", gap: "18px",
      textAlign: "center",
    }}>
      {creating ? (
        <>
          <svg width="32" height="32" viewBox="0 0 16 16"
            style={{ animation: "spin 0.9s linear infinite", opacity: 0.5 }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <circle cx="8" cy="8" r="6" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeDasharray="20 18"/>
          </svg>
          <div style={{ fontSize: "14px", color: "var(--text-muted)", fontFamily: '"Fira Sans",sans-serif' }}>
            Building your roadmap…
          </div>
        </>
      ) : (
        <>
          <div style={{
            width: 52, height: 52, borderRadius: "14px",
            background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(34,197,94,0.1))",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent-blue)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontSize: "20px", fontWeight: "700",
              color: "var(--text-primary)", marginBottom: "8px",
              fontFamily: '"Fira Sans",sans-serif',
            }}>
              {name}
            </div>
            <div style={{
              fontSize: "13px", color: "var(--text-muted)",
              lineHeight: "1.7", maxWidth: "380px",
              fontFamily: '"Fira Sans",sans-serif',
            }}>
              Describe what you want to learn, your current experience level,
              and what you'd like to achieve. I'll build a personalised concept roadmap for you.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── CheckpointMessages ────────────────────────────────────────────────────────
function CheckpointMessages({ messages, concept, sending, scrollRef }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
      {messages.length === 0 && (
        <div style={{
          color: "var(--text-muted)", fontSize: "13px",
          textAlign: "center", marginTop: "40px",
          fontFamily: '"Fira Sans",sans-serif',
        }}>
          Start the checkpoint for{" "}
          <strong style={{ color: "var(--text-primary)" }}>{concept?.label}</strong>
        </div>
      )}
      {messages.map((msg, i) => (
        <div key={i} style={{
          display: "flex",
          justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          marginBottom: "12px",
        }}>
          <div style={{
            background: msg.role === "user"
              ? "var(--accent-blue)"
              : msg.role === "error"
                ? "rgba(239,68,68,0.12)"
                : "var(--bg-elevated)",
            color: msg.role === "error" ? "var(--accent-red)" : "var(--text-primary)",
            borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
            border: msg.role === "user" ? "none" : "1px solid var(--border)",
            padding: "9px 13px",
            maxWidth: "78%",
            fontSize: "13px",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: '"Fira Sans",sans-serif',
          }}>
            {msg.content}
          </div>
        </div>
      ))}
      {sending && (
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "12px" }}>
          <div style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "12px 12px 12px 3px",
            padding: "9px 14px",
            display: "flex", gap: "5px", alignItems: "center",
          }}>
            {[0, 0.18, 0.36].map((delay, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--text-dim)",
                animation: `pulseDot 1.2s ease-in-out ${delay}s infinite`,
              }}/>
            ))}
          </div>
        </div>
      )}
      <div ref={scrollRef}/>
    </div>
  )
}

// ── MainArea ──────────────────────────────────────────────────────────────────
export default function MainArea() {
  const {
    activeProjectId, setActiveProjectId,
    projects, setProjects,
    activeConcept, setActiveConcept,
    pendingName, setPendingName,
  } = useProject()

  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState("")
  const [sending, setSending]       = useState(false)
  const [roadmapKey, setRoadmapKey] = useState(0)
  const scrollRef    = useRef(null)
  const textareaRef  = useRef(null)

  // Clear messages whenever the checkpoint concept changes
  useEffect(() => { setMessages([]) }, [activeConcept])

  // Auto-scroll on new messages
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const isSetup      = !!pendingName && !activeProjectId
  const isCheckpoint = !!activeProjectId && !!activeConcept
  const isRoadmap    = !!activeProjectId && !activeConcept
  const hasProject   = isSetup || isCheckpoint || isRoadmap
  const inputActive  = isSetup || isCheckpoint

  const placeholder = isSetup
    ? `Describe what you want to learn about "${pendingName}"…`
    : isCheckpoint
      ? `Ask about ${activeConcept?.label || "this concept"}…`
      : "Select a concept above to start a checkpoint →"

  const adjustTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 96) + "px"
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !inputActive || sending) return
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setSending(true)
    try {
      if (isSetup) {
        const plan = `${pendingName}\n${text}`
        const result = await api.createRoadmap(plan)
        const updated = await api.getProjects()
        setProjects(updated)
        setActiveProjectId(result.project_id)
        setPendingName(null)
      } else if (isCheckpoint) {
        setMessages(m => [...m, { role: "user", content: text }])
        const res = await api.checkpoint(activeConcept.id, text)
        setMessages(m => [...m, { role: "assistant", content: res.response }])
        if (res.phase === "complete") setRoadmapKey(k => k + 1)
      }
    } catch (err) {
      if (isCheckpoint) {
        setMessages(m => [...m, { role: "error", content: `Error: ${err.message}` }])
      }
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleBack = () => {
    setActiveConcept(null)
    setRoadmapKey(k => k + 1)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Checkpoint header */}
      {isCheckpoint && (
        <div style={{
          padding: "11px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: "10px",
          flexShrink: 0, background: "var(--bg-panel)",
        }}>
          <button onClick={handleBack} style={{
            background: "none", border: "none",
            color: "var(--text-muted)", cursor: "pointer",
            fontSize: "12px", padding: "3px 7px",
            borderRadius: "5px", fontFamily: '"Fira Sans",sans-serif',
            transition: "color 120ms ease",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
          >
            ← Back
          </button>
          <span style={{
            fontSize: "13px", fontWeight: "600",
            color: "var(--text-primary)",
            fontFamily: '"Fira Sans",sans-serif',
          }}>
            {activeConcept.label}
          </span>
          <span style={{
            fontSize: "10px", color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            padding: "2px 7px", borderRadius: "4px",
            fontFamily: '"Fira Code",monospace',
          }}>
            {activeConcept.phase}
          </span>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!hasProject && <EmptyState/>}
        {isSetup      && <SetupView name={pendingName} creating={sending}/>}
        {isRoadmap    && <RoadmapView key={roadmapKey}/>}
        {isCheckpoint && (
          <CheckpointMessages
            messages={messages}
            concept={activeConcept}
            sending={sending}
            scrollRef={scrollRef}
          />
        )}
      </div>

      {/* Persistent chat input */}
      {hasProject && (
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-panel)",
          display: "flex", gap: "8px", alignItems: "flex-end",
          flexShrink: 0,
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); adjustTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={!inputActive || sending}
            style={{
              flex: 1,
              background: inputActive ? "var(--bg-elevated)" : "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: inputActive ? "var(--text-primary)" : "var(--text-dim)",
              fontSize: "13px",
              padding: "8px 12px",
              outline: "none",
              resize: "none",
              lineHeight: "1.5",
              minHeight: "36px",
              maxHeight: "96px",
              fontFamily: '"Fira Sans",sans-serif',
              cursor: inputActive ? "text" : "default",
              opacity: sending && isSetup ? 0.5 : 1,
              transition: "background 150ms ease, border-color 150ms ease",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputActive || !input.trim() || sending}
            style={{
              background: inputActive && input.trim() && !sending
                ? "var(--accent-blue)"
                : "var(--bg-elevated)",
              color: inputActive && input.trim() && !sending
                ? "#000"
                : "var(--text-dim)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0 14px",
              fontWeight: "700",
              fontSize: "14px",
              cursor: inputActive && input.trim() && !sending ? "pointer" : "default",
              height: "36px",
              minWidth: "44px",
              transition: "background 150ms ease, color 150ms ease",
              flexShrink: 0,
            }}
          >
            {sending && isSetup ? (
              <svg width="14" height="14" viewBox="0 0 16 16"
                style={{ animation: "spin 0.8s linear infinite" }}>
                <circle cx="8" cy="8" r="6" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeDasharray="20 18"/>
              </svg>
            ) : "→"}
          </button>
        </div>
      )}
    </div>
  )
}

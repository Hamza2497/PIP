import { useEffect, useRef, useState } from "react"
import { api } from "../../api"
import { useProject } from "../../context/ProjectContext"
import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function CheckpointChat() {
  const { activeProjectId, activeConcept, setActiveView, setActiveConcept } = useProject()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const isMobile = useMediaQuery("(max-width: 767px)")

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const adjustTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 96) + "px"
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || !activeConcept) return
    setInput("")
    setSending(true)
    setMessages(m => [...m, { role: "user", content: text }])
    try {
      const res = await api.checkpoint(activeConcept.id, text)
      setMessages(m => [...m, { role: "assistant", content: res.response }])
    } catch (err) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleBack = () => {
    setActiveView("roadmap")
    setActiveConcept(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexShrink: 0,
        background: "var(--bg-panel)",
      }}>
        <button
          onClick={handleBack}
          style={{
            background: "none", border: "none", color: "var(--text-muted)",
            cursor: "pointer", fontSize: "12px", padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
          {activeConcept?.label || "Checkpoint"}
        </span>
        <span style={{
          fontSize: "10px",
          color: "var(--text-muted)",
          background: "var(--bg-elevated)",
          padding: "2px 7px",
          borderRadius: "4px",
        }}>
          {activeConcept?.phase}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: isMobile ? "68px" : "16px" }}>
        {messages.length === 0 && (
          <div style={{
            color: "var(--text-muted)",
            fontSize: "13px",
            textAlign: "center",
            marginTop: "40px",
          }}>
            Start the checkpoint for <strong style={{ color: "var(--text-primary)" }}>{activeConcept?.label}</strong>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "12px",
            }}
          >
            <div style={{
              background: msg.role === "user" ? "#1d4ed8" : "var(--bg-panel)",
              color: "var(--text-primary)",
              borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
              padding: "9px 13px",
              maxWidth: "80%",
              fontSize: "13px",
              lineHeight: "1.55",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "12px" }}>
            <div style={{
              background: "var(--bg-panel)",
              borderRadius: "10px 10px 10px 2px",
              padding: "9px 13px",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}>
              <span style={{ animation: "pulseDot 1.2s ease-in-out infinite", display: "inline-block" }}>●</span>
              {" "}
              <span style={{ animation: "pulseDot 1.2s ease-in-out infinite 0.2s", display: "inline-block" }}>●</span>
              {" "}
              <span style={{ animation: "pulseDot 1.2s ease-in-out infinite 0.4s", display: "inline-block" }}>●</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div style={{
        padding: "10px 14px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-panel)",
        display: "flex",
        gap: "8px",
        alignItems: "flex-end",
        flexShrink: 0,
        paddingBottom: isMobile ? "calc(10px + 52px)" : "10px",
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => { setInput(e.target.value); adjustTextarea() }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={sending}
          style={{
            flex: 1,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text-primary)",
            fontSize: "13px",
            padding: "8px 12px",
            outline: "none",
            resize: "none",
            lineHeight: "1.5",
            minHeight: "36px",
            maxHeight: "96px",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            background: sending || !input.trim() ? "var(--bg-elevated)" : "var(--accent-blue)",
            color: sending || !input.trim() ? "var(--text-muted)" : "#000",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            fontWeight: "600",
            fontSize: "13px",
            cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            height: "36px",
            minWidth: "44px",
          }}
        >
          {sending ? "…" : "→"}
        </button>
      </div>
    </div>
  )
}

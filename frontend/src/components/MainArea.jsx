import { useEffect, useRef, useState } from "react"
import { api, parseSse } from "../api"
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
function SetupView({ name, creating, conceptsFound, error }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 32px", gap: "18px",
      textAlign: "center",
    }}>
      {error && (
        <div style={{
          border: "1px solid #ef4444", borderRadius: "6px",
          padding: "10px 14px", background: "rgba(239,68,68,0.08)",
          color: "#ef4444", fontSize: "12px", maxWidth: "380px",
        }}>
          {error}
        </div>
      )}
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
          {conceptsFound && conceptsFound.length > 0 && (
            <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              Building concept tree… {conceptsFound.length} concept{conceptsFound.length !== 1 ? "s" : ""} found
            </div>
          )}
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

// ── Handoff card ──────────────────────────────────────────────────────────────
function HandoffCard({ sentence }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(sentence)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{
      border: "1px solid #3f3f46", borderRadius: "6px", padding: "12px 14px",
      margin: "8px 0", background: "#18181b",
    }}>
      <div style={{
        fontSize: "10px", color: "#71717a", marginBottom: "6px",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        Run this in Claude Code when you finish this part
      </div>
      <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#e4e4e7", lineHeight: "1.6" }}>
        {sentence}
      </div>
      <button
        onClick={handleCopy}
        style={{
          marginTop: "8px", fontSize: "10px", color: copied ? "#22c55e" : "#52525b",
          background: "none", border: "none", cursor: "pointer", padding: "0",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  )
}

// ── Question card ─────────────────────────────────────────────────────────────
function QuestionCard({ text }) {
  return (
    <div style={{
      borderLeft: "2px solid #38bdf8", padding: "10px 14px",
      margin: "10px 0", background: "rgba(56,189,248,0.05)",
    }}>
      <div style={{ fontSize: "10px", color: "#38bdf8", marginBottom: "4px" }}>Checkpoint</div>
      <div style={{ fontSize: "13px", color: "#e4e4e7" }}>{text}</div>
    </div>
  )
}

// ── Score card ────────────────────────────────────────────────────────────────
function ScoreCard({ confidence, feedback }) {
  const badgeColor = confidence >= 4 ? "#22c55e" : confidence >= 3 ? "#f59e0b" : "#ef4444"
  return (
    <div style={{ border: "1px solid #3f3f46", borderRadius: "6px", padding: "12px 14px", margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span style={{
          fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "3px",
          background: `${badgeColor}20`, color: badgeColor,
        }}>
          {confidence}/5
        </span>
        <span style={{ fontSize: "10px", color: "#52525b" }}>Confidence</span>
      </div>
      <div style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.6" }}>{feedback}</div>
    </div>
  )
}

// ── Phase banner ──────────────────────────────────────────────────────────────
function PhaseBanner({ phase }) {
  if (phase === "IN_PROGRESS") {
    return (
      <div style={{
        textAlign: "center", color: "#52525b", fontSize: "11px", padding: "10px 0",
        borderTop: "1px solid #27272a", borderBottom: "1px solid #27272a", margin: "10px 0",
      }}>
        Go build this part in Claude Code — come back when you're done
      </div>
    )
  }
  if (phase === "COMPLETE") {
    return (
      <div style={{ textAlign: "center", color: "#22c55e", fontSize: "11px", padding: "10px 0" }}>
        ✓ Concept complete — move to the next part
      </div>
    )
  }
  return null
}

// ── CheckpointMessages ────────────────────────────────────────────────────────
function CheckpointMessages({ messages, concept, sending, scrollRef, questionText, answerInput, setAnswerInput, onSubmitAnswer }) {
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
      {messages.map((msg, i) => {
        if (msg.role === "handoff") {
          return <HandoffCard key={i} sentence={msg.sentence} />
        }
        if (msg.role === "question") {
          const isLast = i === messages.length - 1 || !messages.slice(i + 1).some(m => m.role === "question")
          return (
            <div key={i}>
              <QuestionCard text={msg.text} />
              {isLast && questionText && (
                <div style={{ marginTop: "8px" }}>
                  <textarea
                    value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    placeholder="Your answer…"
                    style={{
                      width: "100%", background: "#18181b",
                      border: "1px solid #3f3f46", borderRadius: "6px",
                      color: "#e4e4e7", padding: "10px", fontSize: "13px",
                      resize: "vertical", minHeight: "80px",
                      fontFamily: "inherit", outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={onSubmitAnswer}
                    disabled={!answerInput.trim()}
                    style={{
                      marginTop: "6px", padding: "6px 14px",
                      background: answerInput.trim() ? "#38bdf8" : "#27272a",
                      color: answerInput.trim() ? "#000" : "#52525b",
                      border: "none", borderRadius: "4px",
                      fontSize: "12px", cursor: answerInput.trim() ? "pointer" : "default",
                    }}
                  >
                    Submit answer
                  </button>
                </div>
              )}
            </div>
          )
        }
        if (msg.role === "score") {
          return <ScoreCard key={i} confidence={msg.confidence} feedback={msg.feedback} />
        }
        if (msg.role === "phase_change") {
          return <PhaseBanner key={i} phase={msg.phase} />
        }
        return (
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
        )
      })}
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
export default function MainArea({ treeRef }) {
  const {
    activeProjectId, setActiveProjectId,
    projects, setProjects,
    activeConcept, setActiveConcept,
    pendingName, setPendingName,
    setAnnotatedPlan,
  } = useProject()

  const [messages, setMessages]         = useState([])
  const [input, setInput]               = useState("")
  const [sending, setSending]           = useState(false)
  const [roadmapKey, setRoadmapKey]     = useState(0)
  const [conceptsFound, setConceptsFound] = useState([])
  const [setupError, setSetupError]     = useState(null)
  // Checkpoint phase state
  const [currentPhase, setCurrentPhase] = useState("PENDING")
  const [handoffSentence, setHandoffSentence] = useState("")
  const [questionText, setQuestionText] = useState(null)
  const [answerInput, setAnswerInput]   = useState("")

  const scrollRef   = useRef(null)
  const textareaRef = useRef(null)

  // Reset checkpoint state when concept changes
  useEffect(() => {
    setMessages([])
    setCurrentPhase(activeConcept?.phase?.toUpperCase() || "PENDING")
    setHandoffSentence("")
    setQuestionText(null)
    setAnswerInput("")
  }, [activeConcept])

  // Reset setup error when starting a new project setup
  useEffect(() => {
    setSetupError(null)
    setConceptsFound([])
  }, [pendingName])

  // Auto-scroll on new messages
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  // Auto-start orient when concept is selected with PENDING phase
  useEffect(() => {
    if (!activeConcept || currentPhase !== "PENDING") return
    startOrient()
  }, [activeConcept?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isSetup      = !!pendingName && !activeProjectId
  const isCheckpoint = !!activeProjectId && !!activeConcept
  const isRoadmap    = !!activeProjectId && !activeConcept
  const hasProject   = isSetup || isCheckpoint || isRoadmap

  // Input is active during setup OR when IN_PROGRESS (paste Claude Code output)
  const inputActive = isSetup || (isCheckpoint && currentPhase === "IN_PROGRESS")

  const placeholder = isSetup
    ? `Describe what you want to learn about "${pendingName}"…`
    : isCheckpoint && currentPhase === "IN_PROGRESS"
      ? "Paste Claude Code output here when you're done…"
      : isCheckpoint
        ? `${currentPhase === "CHECKPOINTING" ? "Answer the question above ↑" : currentPhase === "COMPLETE" ? "Concept complete" : "Waiting…"}`
        : "Select a concept above to start a checkpoint →"

  const adjustTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 96) + "px"
  }

  // ── Append streaming text to the last "streaming" message or start a new one
  const appendStream = (token) => {
    setMessages(m => {
      const last = m[m.length - 1]
      if (last?.role === "streaming") {
        return [...m.slice(0, -1), { role: "streaming", content: last.content + token }]
      }
      return [...m, { role: "streaming", content: token }]
    })
  }

  // ── Seal the last streaming message as a regular assistant message
  const sealStream = () => {
    setMessages(m => {
      const last = m[m.length - 1]
      if (last?.role === "streaming") {
        return [...m.slice(0, -1), { role: "assistant", content: last.content }]
      }
      return m
    })
  }

  // ── Orient stream ─────────────────────────────────────────────────────────
  const startOrient = async () => {
    if (!activeConcept) return
    setSending(true)
    setCurrentPhase("ORIENTING")
    treeRef?.current?.setHoveredNode(activeConcept.id)
    try {
      const res = await api.orientStream(activeConcept.id)
      for await (const ev of parseSse(res)) {
        if (ev.type === "text") {
          appendStream(ev.content)
        } else if (ev.type === "handoff") {
          sealStream()
          setHandoffSentence(ev.sentence)
          setMessages(m => [...m, { role: "handoff", sentence: ev.sentence }])
        } else if (ev.type === "done") {
          setCurrentPhase("IN_PROGRESS")
          setMessages(m => [...m, { role: "phase_change", phase: "IN_PROGRESS" }])
        }
      }
    } catch (err) {
      sealStream()
      setMessages(m => [...m, { role: "error", content: `Error: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  // ── Submit Claude Code output ─────────────────────────────────────────────
  const handleSubmit = async (claudeCodeOutput) => {
    if (!activeConcept || !claudeCodeOutput.trim()) return
    setSending(true)
    setMessages(m => [...m, { role: "user", content: claudeCodeOutput }])
    setCurrentPhase("CHECKPOINTING")
    try {
      const res = await api.submitStream(activeConcept.id, claudeCodeOutput)
      for await (const ev of parseSse(res)) {
        if (ev.type === "phase_change") {
          // already set above; the event confirms it
        } else if (ev.type === "text") {
          appendStream(ev.content)
        } else if (ev.type === "question") {
          sealStream()
          setQuestionText(ev.text)
          setMessages(m => [...m, { role: "question", text: ev.text }])
        } else if (ev.type === "done") {
          // nothing extra
        }
      }
    } catch (err) {
      sealStream()
      setMessages(m => [...m, { role: "error", content: `Error: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  // ── Answer checkpoint question ────────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    if (!activeConcept || !questionText || !answerInput.trim()) return
    const ans = answerInput.trim()
    setAnswerInput("")
    setQuestionText(null)
    setSending(true)
    setMessages(m => [...m, { role: "user", content: ans }])
    try {
      const stateFromScore = (confidence) => {
        if (confidence >= 4) return 'mastered'
        return 'in_progress'
      }
      const res = await api.answerStream(activeConcept.id, questionText, ans)
      for await (const ev of parseSse(res)) {
        if (ev.type === "score") {
          setMessages(m => [...m, { role: "score", confidence: ev.confidence, feedback: ev.feedback }])
          treeRef?.current?.updateNodeState(activeConcept.id, stateFromScore(ev.confidence))
        } else if (ev.type === "phase_change") {
          setCurrentPhase(ev.phase)
          setMessages(m => [...m, { role: "phase_change", phase: ev.phase }])
          if (ev.phase === "COMPLETE") {
            setRoadmapKey(k => k + 1)
            treeRef?.current?.setHoveredNode(null)
          }
        }
      }
    } catch (err) {
      setMessages(m => [...m, { role: "error", content: `Error: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !inputActive || sending) return
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setSending(true)
    try {
      if (isSetup) {
        setConceptsFound([])
        setAnnotatedPlan(null)
        setSetupError(null)
        const stacksResult = await api.identifyStacks(`${pendingName}\n${text}`)
        const stacks = stacksResult.stacks || ["General"]
        const res = await api.generateRoadmap(`${pendingName}\n${text}`, pendingName, stacks)
        let projectId = null
        for await (const ev of parseSse(res)) {
          if (ev.type === "concept_added") {
            setConceptsFound(prev => [...prev, ev.concept.name])
          } else if (ev.type === "plan_annotated") {
            setAnnotatedPlan(ev.parts)
          } else if (ev.type === "done") {
            projectId = ev.project_id
          } else if (ev.type === "error") {
            res.body?.cancel()
            setConceptsFound([])
            setAnnotatedPlan(null)
            setSetupError(ev.message)
            break
          }
        }
        if (projectId) {
          const updated = await api.getProjects()
          setProjects(updated)
          setActiveProjectId(projectId)
          setPendingName(null)
        }
      } else if (isCheckpoint && currentPhase === "IN_PROGRESS") {
        await handleSubmit(text)
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
            {currentPhase.toLowerCase()}
          </span>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!hasProject && <EmptyState/>}
        {isSetup      && <SetupView name={pendingName} creating={sending} conceptsFound={conceptsFound} error={setupError}/>}
        {isRoadmap    && <RoadmapView key={roadmapKey}/>}
        {isCheckpoint && (
          <CheckpointMessages
            messages={messages}
            concept={activeConcept}
            sending={sending}
            scrollRef={scrollRef}
            questionText={questionText}
            answerInput={answerInput}
            setAnswerInput={setAnswerInput}
            onSubmitAnswer={handleSubmitAnswer}
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

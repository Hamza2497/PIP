import { useState } from 'react'
import { CLR, rgba } from './treeRenderer'
import { useTheme } from '../../context/ThemeContext'

export default function ConceptDetail({ concept, onClose, onMaster }) {
  const { dark } = useTheme()
  const [mastering, setMastering] = useState(false)
  if (!concept) return null

  const col   = CLR[concept.state] || CLR.gray
  const bgRgb = dark ? '3,3,4' : '245,245,247'
  const canMaster = concept.state === 'ready'

  async function handleMaster() {
    if (!onMaster || mastering) return
    setMastering(true)
    try { await onMaster() } finally { setMastering(false) }
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      padding: '30px 18px 14px',
      background: `linear-gradient(transparent, rgba(${bgRgb},0.97) 26%)`,
      pointerEvents: 'auto',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
        <div style={{
          width:8, height:8, borderRadius:'50%',
          border:`2px solid ${col}`,
          background: rgba(col, 0.15),
          flexShrink:0,
        }}/>
        <span style={{
          fontSize:13, fontWeight:600,
          color: 'var(--text-primary)',
          fontFamily:'"Fira Sans",sans-serif',
        }}>
          {concept.name || concept.label}
        </span>
        <span style={{
          fontSize:9, padding:'2px 6px', borderRadius:3,
          background: rgba(col, 0.15),
          color: col,
          fontWeight:600,
          marginLeft:'auto',
          fontFamily:'"Fira Code",monospace',
          letterSpacing:'0.05em',
        }}>
          {concept.state}{concept.conf != null ? ` · ${concept.conf}/5` : ''}
        </span>
        <button
          onClick={onClose}
          style={{
            background:'none', border:'none',
            color: 'var(--text-muted)', fontSize:16,
            cursor:'pointer', lineHeight:1, padding:'0 3px',
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div style={{
        fontSize:11,
        color: 'var(--text-muted)',
        lineHeight:1.65,
        fontFamily:'"Fira Sans",sans-serif',
        marginBottom: canMaster ? 10 : 0,
      }}>
        {concept.description || 'No description available.'}
      </div>
      {canMaster && (
        <button
          onClick={handleMaster}
          disabled={mastering}
          style={{
            display:'flex', alignItems:'center', gap:6,
            background: rgba(CLR.mastered, 0.12),
            border: `1px solid ${rgba(CLR.mastered, 0.35)}`,
            borderRadius:7,
            color: CLR.mastered,
            fontSize:11, fontWeight:600,
            padding:'6px 12px',
            cursor: mastering ? 'wait' : 'pointer',
            fontFamily:'"Fira Sans",sans-serif',
            transition:'background 150ms ease, border-color 150ms ease',
            opacity: mastering ? 0.6 : 1,
          }}
          onMouseEnter={e => !mastering && (e.currentTarget.style.background = rgba(CLR.mastered, 0.2))}
          onMouseLeave={e => (e.currentTarget.style.background = rgba(CLR.mastered, 0.12))}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1.5,6 4.5,9 10.5,3"/>
          </svg>
          {mastering ? 'Marking…' : 'Mark as mastered'}
        </button>
      )}
    </div>
  )
}

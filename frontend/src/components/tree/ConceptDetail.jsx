import { CLR, rgba } from './treeRenderer'
import { useTheme } from '../../context/ThemeContext'

export default function ConceptDetail({ concept, onClose }) {
  const { dark } = useTheme()
  if (!concept) return null

  const col   = CLR[concept.state] || CLR.gray
  const bgRgb = dark ? '3,3,4' : '245,245,247'

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
      }}>
        {concept.description || 'No description available.'}
      </div>
    </div>
  )
}

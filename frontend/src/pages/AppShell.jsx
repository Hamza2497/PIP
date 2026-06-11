import { useCallback, useRef, useState } from "react"
import Sidebar, { SIDEBAR_OPEN_W, SIDEBAR_CLOSED_W } from "../components/Sidebar"
import MainArea from "../components/MainArea"
import TreePanel from "../components/TreePanel"
import MobileBar from "../components/MobileBar"
import Drawer from "../components/Drawer"
import { useMediaQuery } from "../hooks/useMediaQuery"

export default function AppShell() {
  const treeRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [treeOpen, setTreeOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  const [treePct, setTreePct] = useState(0.40)

  const isMobile = useMediaQuery("(max-width: 767px)")

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startPct = treePct
    const sidebarW = sidebarOpen ? SIDEBAR_OPEN_W : SIDEBAR_CLOSED_W
    const totalW = window.innerWidth - sidebarW

    const onMove = (ev) => {
      const dx = startX - ev.clientX
      setTreePct(Math.min(0.45, Math.max(0.25, startPct + dx / totalW)))
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"
  }, [treePct, sidebarOpen])

  if (isMobile) {
    return (
      <div style={{ height: "100dvh", overflow: "hidden", background: "var(--bg-base)", position: "relative", display: "flex", flexDirection: "column" }}>
        <MainArea treeRef={treeRef} />
        <MobileBar
          onMenuClick={() => setMobileSidebarOpen(p => !p)}
          onTreeClick={() => setMobileTreeOpen(p => !p)}
          treeOpen={mobileTreeOpen}
          sidebarOpen={mobileSidebarOpen}
        />
        <Drawer open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} side="left">
          <Sidebar open={true} onToggle={() => setMobileSidebarOpen(false)} mobile={true} />
        </Drawer>
        <Drawer open={mobileTreeOpen} onClose={() => setMobileTreeOpen(false)} side="right" fullWidth={true}>
          <TreePanel open={true} mobile={true} onToggle={() => setMobileTreeOpen(false)} treeRef={treeRef} />
        </Drawer>
      </div>
    )
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background: "var(--bg-base)",
    }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />
      <MainArea treeRef={treeRef} />
      <TreePanel
        open={treeOpen}
        sidebarOpen={sidebarOpen}
        treePct={treePct}
        onResizeStart={handleResizeStart}
        onToggle={() => setTreeOpen(p => !p)}
        treeRef={treeRef}
      />
    </div>
  )
}

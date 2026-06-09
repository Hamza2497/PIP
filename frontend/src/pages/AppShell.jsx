import { useState } from "react"
import Sidebar from "../components/Sidebar"
import MainArea from "../components/MainArea"
import TreePanel from "../components/TreePanel"
import MobileBar from "../components/MobileBar"
import Drawer from "../components/Drawer"
import { useMediaQuery } from "../hooks/useMediaQuery"

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [treeOpen, setTreeOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)

  const isMobile = useMediaQuery("(max-width: 767px)")

  if (isMobile) {
    return (
      <div style={{ height: "100vh", overflow: "hidden", background: "var(--bg-base)", position: "relative" }}>
        <MainArea />
        <MobileBar
          onMenuClick={() => setMobileSidebarOpen(true)}
          onTreeClick={() => setMobileTreeOpen(true)}
        />
        <Drawer open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} side="left">
          <Sidebar open={true} onToggle={() => setMobileSidebarOpen(false)} />
        </Drawer>
        <Drawer open={mobileTreeOpen} onClose={() => setMobileTreeOpen(false)} side="right">
          <TreePanel open={true} sidebarOpen={true} onToggle={() => setMobileTreeOpen(false)} />
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
      <MainArea />
      <TreePanel
        open={treeOpen}
        sidebarOpen={sidebarOpen}
        onToggle={() => setTreeOpen(p => !p)}
      />
    </div>
  )
}

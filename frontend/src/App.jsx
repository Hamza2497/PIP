import { Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "./context/AuthContext"
import LandingPage from "./pages/LandingPage"
import AppShell from "./pages/AppShell"
import { ProjectProvider } from "./context/ProjectContext"

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? "/app" : "/login"} replace />
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LandingPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <ProjectProvider>
              <AppShell />
            </ProjectProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

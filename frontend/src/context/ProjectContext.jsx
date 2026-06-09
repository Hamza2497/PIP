import { createContext, useContext, useState } from "react"

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [projects, setProjects] = useState([])
  const [activeView, setActiveView] = useState("roadmap")
  const [activeConcept, setActiveConcept] = useState(null)

  return (
    <ProjectContext.Provider
      value={{
        activeProjectId,
        setActiveProjectId,
        projects,
        setProjects,
        activeView,
        setActiveView,
        activeConcept,
        setActiveConcept,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}

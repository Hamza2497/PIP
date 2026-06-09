import { createContext, useContext, useState } from "react"

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [projects, setProjects] = useState([])
  const [activeConcept, setActiveConcept] = useState(null)
  const [pendingName, setPendingName] = useState(null)

  return (
    <ProjectContext.Provider
      value={{
        activeProjectId, setActiveProjectId,
        projects, setProjects,
        activeConcept, setActiveConcept,
        pendingName, setPendingName,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}

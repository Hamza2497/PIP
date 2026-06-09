async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...opts.headers }
  const res = await fetch(path, { ...opts, headers, credentials: "include" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  googleAuth: (credential) =>
    apiFetch("/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
  getMe: () => apiFetch("/me"),
  logout: () => apiFetch("/auth/logout", { method: "POST" }).catch(() => {}),
  getProjects: () => apiFetch("/projects"),
  createRoadmap: (plan) =>
    apiFetch("/roadmap", { method: "POST", body: JSON.stringify({ plan }) }),
  getProject: (id) => apiFetch(`/project/${id}`),
  checkpoint: (projectConceptId, message) =>
    apiFetch("/checkpoint", {
      method: "POST",
      body: JSON.stringify({ project_concept_id: projectConceptId, message }),
    }),
}

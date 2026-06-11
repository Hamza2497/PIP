const API_BASE = import.meta.env.VITE_API_URL || "https://pip-q2vi.onrender.com"
const TOKEN_KEY = "pip:token"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

function signalUnauthorized() {
  window.dispatchEvent(new CustomEvent("pip:unauthorized"))
}

function authHeaders(extra = {}) {
  const token = getToken()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

async function apiFetch(path, opts = {}) {
  const headers = authHeaders({ "Content-Type": "application/json", ...opts.headers })
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  if (res.status === 401) { signalUnauthorized(); throw new Error("Session expired") }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function streamFetch(path, opts = {}) {
  const headers = authHeaders(opts.headers)
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  if (res.status === 401) { signalUnauthorized(); throw new Error("Session expired") }
  return res
}

// Async generator that parses an SSE fetch response into event objects
export async function* parseSse(response) {
  const reader = response.body.getReader()
  const dec = new TextDecoder()
  let buf = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split("\n\n")
    buf = parts.pop()
    for (const part of parts) {
      if (part.startsWith("data: ")) {
        try { yield JSON.parse(part.slice(6)) } catch {}
      }
    }
  }
}

export const api = {
  googleAuth: async (credential) => {
    const user = await apiFetch("/auth/google", { method: "POST", body: JSON.stringify({ credential }) })
    setToken(user.token)
    return user
  },
  getMe: () => apiFetch("/me"),
  logout: () => {
    setToken(null)
    return apiFetch("/auth/logout", { method: "POST" }).catch(() => {})
  },
  getProjects: () => apiFetch("/projects"),
  cloneDemo: () => apiFetch("/demo/clone", { method: "POST" }),
  createRoadmap: (plan) =>
    apiFetch("/roadmap", { method: "POST", body: JSON.stringify({ plan }) }),
  getProject: (id) => apiFetch(`/project/${id}`),
  deleteProject: (id) => apiFetch(`/project/${id}`, { method: "DELETE" }),
  checkpoint: (projectConceptId, message) =>
    apiFetch("/checkpoint", {
      method: "POST",
      body: JSON.stringify({ project_concept_id: projectConceptId, message }),
    }),
  masterConcept: (projectId, projectConceptId) =>
    apiFetch(`/project/${projectId}/concept/${projectConceptId}/master`, { method: "POST" }),

  // Step 9 endpoints
  identifyStacks: (plan) =>
    apiFetch("/roadmap/identify-stacks", { method: "POST", body: JSON.stringify({ plan }) }),

  generateRoadmap: (plan, projectName, confirmedStacks) =>
    streamFetch("/roadmap/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, project_name: projectName, confirmed_stacks: confirmedStacks }),
    }),

  orientStream: (projectConceptId) =>
    streamFetch(`/checkpoint/orient/${projectConceptId}`),

  getJournal: (projectConceptId) =>
    apiFetch(`/checkpoint/journal/${projectConceptId}`),

  submitStream: (projectConceptId, claudeCodeOutput) =>
    streamFetch(`/checkpoint/submit/${projectConceptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claude_code_output: claudeCodeOutput }),
    }),

  answerStream: (projectConceptId, question, answer) =>
    streamFetch(`/checkpoint/answer/${projectConceptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer }),
    }),
}

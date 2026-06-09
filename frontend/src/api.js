async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...opts.headers }
  const res = await fetch(path, { ...opts, headers, credentials: "include" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
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
  masterConcept: (projectId, projectConceptId) =>
    apiFetch(`/project/${projectId}/concept/${projectConceptId}/master`, { method: "POST" }),

  // Step 9 endpoints
  identifyStacks: (plan) =>
    apiFetch("/roadmap/identify-stacks", { method: "POST", body: JSON.stringify({ plan }) }),

  generateRoadmap: (plan, projectName, confirmedStacks) =>
    fetch("/roadmap/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan, project_name: projectName, confirmed_stacks: confirmedStacks }),
    }),

  orientStream: (projectConceptId) =>
    fetch(`/checkpoint/orient/${projectConceptId}`, { credentials: "include" }),

  submitStream: (projectConceptId, claudeCodeOutput) =>
    fetch(`/checkpoint/submit/${projectConceptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ claude_code_output: claudeCodeOutput }),
    }),

  answerStream: (projectConceptId, question, answer) =>
    fetch(`/checkpoint/answer/${projectConceptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question, answer }),
    }),
}

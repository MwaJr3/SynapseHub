async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(detail.error ?? `request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export interface AssignmentRow {
  id: number; title: string; kind: string; template_id: number; due_at: string; completed: boolean
}
export interface TemplateView {
  id: number; title: string; kind: string; content: string
  banner: string; banner_html: string
  questions: Array<{ prompt: string; choices: string[] }>
}
export interface ProgressRow {
  assignment_id: number; group: string; title: string; kind: string
  assigned: number; completed: number; participation: string
  average_score: number | null; note: string
}

export const api = {
  register: (email: string, password: string, role: string, displayName: string) =>
    req<{ ok: boolean }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, role, display_name: displayName }),
    }),
  login: (email: string, password: string) =>
    req<{ ok: boolean; email: string; role: string; display_name: string }>("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),
  me: () => req<{ email: string; role: string; display_name: string }>("/api/me"),
  assignments: () => req<{ assignments: AssignmentRow[] }>("/api/assignments"),
  template: (id: number) => req<TemplateView>(`/api/templates/${id}`),
  templates: () => req<{ templates: Array<{ id: number; title: string; kind: string }> }>("/api/templates"),
  createTemplate: (title: string, kind: string, content: string, quizJson: string) =>
    req<{ id: number; banner: string }>("/api/templates", {
      method: "POST", body: JSON.stringify({ title, kind, content, quiz_json: quizJson }),
    }),
  groups: () => req<{ groups: Array<{ id: number; name: string }> }>("/api/groups"),
  createGroup: (name: string) => req<{ id: number }>("/api/groups", { method: "POST", body: JSON.stringify({ name }) }),
  addMember: (groupId: number, email: string) =>
    req<{ ok: boolean }>("/api/groups/members", { method: "POST", body: JSON.stringify({ group_id: groupId, email }) }),
  createAssignment: (groupId: number, templateId: number) =>
    req<{ id: number }>("/api/assignments", { method: "POST", body: JSON.stringify({ group_id: groupId, template_id: templateId }) }),
  complete: (assignmentId: number, reflection: string) =>
    req<{ ok: boolean }>("/api/completions", { method: "POST", body: JSON.stringify({ assignment_id: assignmentId, reflection }) }),
  quizAttempt: (assignmentId: number, answers: number[]) =>
    req<{ score: number; total: number }>("/api/quiz-attempts", {
      method: "POST", body: JSON.stringify({ assignment_id: assignmentId, answers }),
    }),
  progress: () => req<{ report: ProgressRow[] }>("/api/reports/progress"),
  addNote: (assignmentId: number, body: string) =>
    req<{ id: number }>("/api/notes", { method: "POST", body: JSON.stringify({ assignment_id: assignmentId, body }) }),
}

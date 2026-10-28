import type { Workspace } from './types';
export type { Workspace, Item, Task, Note, Source } from './types';
export interface CloudDocument {
  id: string;
  title: string;
  pages: number;
  created_at: string;
}
export interface Evidence {
  id: string;
  document_id: string;
  page: number;
  text: string;
  title: string;
  rank: number;
}
export interface Answer {
  mode: 'evidence' | 'generated';
  evidence: Evidence[];
  claims: {
    text: string;
    citation_id: string;
    quote: string;
    document_id: string;
    page: number;
  }[];
  message: string;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
/** Shared fetch contracts: web uses /api; native uses an explicit HTTPS API origin. */
export class SynapseClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string>,
  ) {}
  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getToken();
    if (!token) throw new ApiError(401, 'Sign in to continue.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api${path}`, {
        ...init,
        headers: {
          ...(init.body && !(init.body instanceof FormData)
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...init.headers,
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        detail?: string;
      };
      throw new ApiError(
        response.status,
        typeof body.detail === 'string'
          ? body.detail
          : `Request failed (${response.status}).`,
      );
    }
    return response;
  }
  async workspace(): Promise<{ revision: number; workspace: Workspace }> {
    return (await this.request('/workspace')).json();
  }
  async saveWorkspace(
    workspace: Workspace,
    revision: number,
  ): Promise<{ revision: number }> {
    return (
      await this.request('/workspace', {
        method: 'PUT',
        body: JSON.stringify({ expected_revision: revision, workspace }),
      })
    ).json();
  }
  async documents(): Promise<CloudDocument[]> {
    return (await this.request('/documents')).json();
  }
  async upload(form: FormData): Promise<{
    id: string;
    status: string;
    pages: number;
    empty_pages: number[];
  }> {
    return (
      await this.request('/documents', { method: 'POST', body: form })
    ).json();
  }
  async pdf(id: string): Promise<Blob> {
    return (
      await this.request(`/documents/${encodeURIComponent(id)}/pdf`)
    ).blob();
  }
  async deleteDocument(id: string) {
    await this.request(`/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
  async ask(
    question: string,
    source_ids: string[],
    generate: boolean,
    consent: boolean,
  ): Promise<Answer> {
    return (
      await this.request('/ask', {
        method: 'POST',
        body: JSON.stringify({ question, source_ids, generate, consent }),
      })
    ).json();
  }
}

import axios from 'axios';
import type { OllamaModel, Conversation, ConversationDetail, RagDocument } from '../types';

const api = axios.create({ baseURL: 'http://localhost:8001/api' });

export const modelsApi = {
  list: () => api.get<{ ollama_running: boolean; models: OllamaModel[] }>('/models'),
  status: () => api.get<{ running: boolean }>('/models/status'),
};

export const conversationsApi = {
  list: () => api.get<Conversation[]>('/conversations'),
  get: (id: number) => api.get<ConversationDetail>(`/conversations/${id}`),
  delete: (id: number) => api.delete(`/conversations/${id}`),
  toggleSave: (id: number) => api.patch(`/conversations/${id}/save`),
  rename: (id: number, title: string) => api.patch(`/conversations/${id}/title`, null, { params: { title } }),
};

export const documentsApi = {
  list: () => api.get<RagDocument[]>('/documents'),
  upload: (file: File, description: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('description', description);
    return api.post<RagDocument>('/documents', form);
  },
  delete: (id: number) => api.delete(`/documents/${id}`),
};

export const healthApi = {
  check: () => api.get('/health'),
};

// Streaming chat using EventSource (SSE)
export function streamChat(
  message: string,
  model: string,
  conversationId: number | null,
  useRag: boolean,
  onToken: (t: string) => void,
  onMeta: (convId: number) => void,
  onDone: (convId: number) => void,
  onError: (msg: string) => void,
): AbortController {
  const ctrl = new AbortController();

  fetch('http://localhost:8001/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, model, conversation_id: conversationId, use_rag: useRag, stream: true }),
    signal: ctrl.signal,
  }).then(async res => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      onError(err.detail ?? 'Request failed');
      return;
    }
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token') onToken(data.content);
          else if (data.type === 'meta') onMeta(data.conversation_id);
          else if (data.type === 'done') onDone(data.conversation_id);
          else if (data.type === 'error') onError(data.message);
        } catch { /* skip */ }
      }
    }
  }).catch(e => {
    if (e.name !== 'AbortError') onError(e.message ?? 'Network error');
  });

  return ctrl;
}

export interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
  family?: string;
  parameters?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  model: string | null;
  updated_at: string;
  is_saved: boolean;
  message_count: number;
}

export interface ConversationDetail {
  id: number;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
  is_saved: boolean;
  messages: ChatMessage[];
}

export interface RagDocument {
  id: number;
  filename: string;
  file_type: string;
  chunk_count: number;
  created_at: string;
  description: string | null;
}

export type TabId = 'chat' | 'history' | 'search' | 'settings';
export type Theme = 'light' | 'dark';

import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { OllamaModel, Conversation, ChatMessage, Theme, TabId } from '../types';
import { modelsApi, conversationsApi } from '../services/api';

// ── app slice ──────────────────────────────────────────────
interface AppState {
  theme: Theme;
  tab: TabId;
  selectedModel: string;
  ollamaRunning: boolean;
  models: OllamaModel[];
  modelsLoaded: boolean;
}
const appSlice = createSlice({
  name: 'app',
  initialState: {
    theme: (localStorage.getItem('theme') as Theme) || 'dark',
    tab: 'chat' as TabId,
    selectedModel: localStorage.getItem('model') || '',
    ollamaRunning: false,
    models: [] as OllamaModel[],
    modelsLoaded: false,
  } as AppState,
  reducers: {
    setTheme(s, a: PayloadAction<Theme>) {
      s.theme = a.payload;
      localStorage.setItem('theme', a.payload);
    },
    setTab(s, a: PayloadAction<TabId>) { s.tab = a.payload; },
    setModel(s, a: PayloadAction<string>) {
      s.selectedModel = a.payload;
      localStorage.setItem('model', a.payload);
    },
    setOllama(s, a: PayloadAction<{ running: boolean; models: OllamaModel[] }>) {
      s.ollamaRunning = a.payload.running;
      s.models = a.payload.models;
      s.modelsLoaded = true;
      if (!s.selectedModel && a.payload.models.length > 0) {
        s.selectedModel = a.payload.models[0].name;
        localStorage.setItem('model', a.payload.models[0].name);
      }
    },
  },
});

// ── chat slice ─────────────────────────────────────────────
interface ChatState {
  conversationId: number | null;
  messages: ChatMessage[];
  streaming: boolean;
  streamingContent: string;
  useRag: boolean;
  error: string | null;
}
const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversationId: null,
    messages: [],
    streaming: false,
    streamingContent: '',
    useRag: false,
    error: null,
  } as ChatState,
  reducers: {
    setConversationId(s, a: PayloadAction<number | null>) { s.conversationId = a.payload; },
    addMessage(s, a: PayloadAction<ChatMessage>) { s.messages.push(a.payload); },
    appendStreamToken(s, a: PayloadAction<string>) { s.streamingContent += a.payload; },
    finalizeStream(s) {
      if (s.streamingContent) {
        s.messages.push({
          id: Date.now().toString(),
          role: 'assistant',
          content: s.streamingContent,
          created_at: new Date().toISOString(),
        });
      }
      s.streamingContent = '';
      s.streaming = false;
    },
    setStreaming(s, a: PayloadAction<boolean>) { s.streaming = a.payload; },
    setError(s, a: PayloadAction<string | null>) { s.error = a.payload; },
    setUseRag(s, a: PayloadAction<boolean>) { s.useRag = a.payload; },
    loadConversation(s, a: PayloadAction<{ id: number; messages: ChatMessage[] }>) {
      s.conversationId = a.payload.id;
      s.messages = a.payload.messages;
      s.streamingContent = '';
      s.streaming = false;
      s.error = null;
    },
    resetChat(s) {
      s.conversationId = null;
      s.messages = [];
      s.streamingContent = '';
      s.streaming = false;
      s.error = null;
    },
  },
});

// ── history slice ──────────────────────────────────────────
const historySlice = createSlice({
  name: 'history',
  initialState: { list: [] as Conversation[], loading: false },
  reducers: {
    setList(s, a: PayloadAction<Conversation[]>) { s.list = a.payload; },
    setLoading(s, a: PayloadAction<boolean>) { s.loading = a.payload; },
  },
});

// ── thunks ─────────────────────────────────────────────────
export const loadModels = createAsyncThunk('app/loadModels', async (_, { dispatch }) => {
  try {
    const res = await modelsApi.list();
    dispatch(appSlice.actions.setOllama({ running: res.data.ollama_running, models: res.data.models }));
  } catch {
    dispatch(appSlice.actions.setOllama({ running: false, models: [] }));
  }
});

export const loadHistory = createAsyncThunk('history/load', async (_, { dispatch }) => {
  dispatch(historySlice.actions.setLoading(true));
  try {
    const res = await conversationsApi.list();
    dispatch(historySlice.actions.setList(res.data));
  } catch { /* ignore */ }
  dispatch(historySlice.actions.setLoading(false));
});

// ── store ──────────────────────────────────────────────────
export const store = configureStore({
  reducer: { app: appSlice.reducer, chat: chatSlice.reducer, history: historySlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(fn: (s: RootState) => T): T => useSelector(fn);

export const { setTheme, setTab, setModel, setOllama } = appSlice.actions;
export const { addMessage, appendStreamToken, finalizeStream, setStreaming,
               setError, setUseRag, setConversationId, loadConversation, resetChat } = chatSlice.actions;
export const { setList } = historySlice.actions;

import { useState } from 'react';
import { ChevronRight, ChevronDown, Terminal, Download, BookOpen, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppSelector } from '../../store/store';

interface Step { title: string; content: string; code?: string; }
interface Section { id: string; icon: any; color: string; title: string; steps: Step[]; }

const SECTIONS: Section[] = [
  {
    id: 'install', icon: Download, color: '#3b82f6', title: 'Install Ollama',
    steps: [
      { title: 'Download Ollama', content: 'Visit ollama.com and download the installer for your OS (Windows/Mac/Linux).', code: 'https://ollama.com/download' },
      { title: 'Start Ollama service', content: 'Open a terminal and run the serve command. Keep this terminal open.', code: 'ollama serve' },
      { title: 'Pull a model', content: 'Download a language model. llama3.2 (2GB) is a good starting point.', code: 'ollama pull llama3.2' },
      { title: 'For embeddings (RAG)', content: 'Pull the nomic-embed-text model to enable document search.', code: 'ollama pull nomic-embed-text' },
    ],
  },
  {
    id: 'backend', icon: Terminal, color: '#22c55e', title: 'Start Backend',
    steps: [
      { title: 'Create virtual environment', content: 'Navigate to the backend folder and create a Python venv.', code: 'cd backend\npython -m venv venv\nvenv\\Scripts\\activate' },
      { title: 'Install dependencies', content: 'Install all required Python packages.', code: 'pip install -r requirements.txt' },
      { title: 'Start FastAPI server', content: 'Run the backend on port 8001.', code: 'uvicorn app.main:app --reload --port 8001' },
      { title: 'Verify it is running', content: 'Open in browser to see the API docs.', code: 'http://localhost:8001/docs' },
    ],
  },
  {
    id: 'rag', icon: BookOpen, color: '#f59e0b', title: 'Use RAG Documents',
    steps: [
      { title: 'Go to Search tab', content: 'Click the Search icon (right side of the dial) to open the Knowledge Base panel.' },
      { title: 'Upload a document', content: 'Upload a PDF, TXT, or Markdown file. It will be chunked and indexed automatically.' },
      { title: 'Enable RAG in chat', content: 'In the Chat tab, click the 📖 button next to the input box to enable document-grounded answers.' },
      { title: 'Ask questions', content: 'The AI will search your documents and include relevant context in its answer.' },
    ],
  },
  {
    id: 'errors', icon: AlertTriangle, color: '#ef4444', title: 'Troubleshooting',
    steps: [
      { title: 'Cannot connect to backend', content: 'Make sure the FastAPI server is running on port 8001.', code: 'uvicorn app.main:app --reload --port 8001' },
      { title: 'Ollama not detected', content: 'Make sure Ollama is running. Click Refresh in the Models Settings tab.', code: 'ollama serve' },
      { title: 'No models available', content: 'Pull at least one model from the Ollama library.', code: 'ollama pull llama3.2' },
      { title: 'RAG not working', content: 'Pull the nomic-embed-text embedding model for vector search.', code: 'ollama pull nomic-embed-text' },
      { title: 'CORS error in browser', content: 'Make sure your frontend port (3003) is in config.py cors_origins list.' },
    ],
  },
  {
    id: 'tips', icon: Zap, color: '#8b5cf6', title: 'Tips & Best Practices',
    steps: [
      { title: 'Model selection', content: 'Use llama3.2 for fast responses. Use llama3.1:70b or mixtral for higher quality (requires more RAM).' },
      { title: 'RAG document quality', content: 'Clean text documents (TXT/MD) give better results than scanned PDFs. Keep documents focused on one topic.' },
      { title: 'Conversation memory', content: 'The AI remembers the last 20 messages in a conversation. Start a new chat if the context drifts.' },
      { title: 'System prompt', content: 'Edit the system_prompt in backend/app/config.py to customize the AI persona for your company.' },
    ],
  },
];

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const { icon: Icon, color } = section;

  const copy = (code: string, i: number) => {
    navigator.clipboard.writeText(code);
    setCopied(i); setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ border: `1px solid ${color}33`, borderRadius: 14, overflow: 'hidden', background: 'var(--bg2)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{section.title}</span>
        {open ? <ChevronDown size={15} color="var(--text3)" /> : <ChevronRight size={15} color="var(--text3)" />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${color}22`, display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14 }}>
          {section.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: `${color}20`, color, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{step.content}</div>
                {step.code && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8, background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px' }}>
                    <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: color, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{step.code}</code>
                    <button onClick={() => copy(step.code!, i)} style={{ flexShrink: 0, background: copied === i ? `${color}22` : 'transparent', border: `1px solid ${copied === i ? color : 'var(--border)'}`, borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 10, color: copied === i ? color : 'var(--text3)', fontWeight: 600 }}>
                      {copied === i ? '✓' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuidePanel() {
  const theme  = useAppSelector(s => s.app.theme);
  const running= useAppSelector(s => s.app.ollamaRunning);
  const accent = theme === 'dark' ? '#e879f9' : '#3b82f6';

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      {/* Status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: running ? '#16a34a18' : '#dc262618', border: `1px solid ${running ? '#16a34a44' : '#dc262644'}`, marginBottom: 4 }}>
        {running ? <CheckCircle size={15} color="#22c55e" /> : <AlertTriangle size={15} color="#ef4444" />}
        <span style={{ fontSize: 12, fontWeight: 600, color: running ? '#22c55e' : '#ef4444' }}>
          {running ? 'System ready — Ollama is running' : 'Ollama is not running — follow the Install guide below'}
        </span>
      </div>
      {SECTIONS.map(s => <SectionCard key={s.id} section={s} />)}
    </div>
  );
}

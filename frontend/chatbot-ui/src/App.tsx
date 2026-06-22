import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppSelector, useAppDispatch } from './store/store';
import { loadModels, resetChat, setTab } from './store/store';
import RadialNav from './components/nav/RadialNav';
import ChatWindow from './components/chat/ChatWindow';
import HistoryPanel from './components/history/HistoryPanel';
import SearchPanel from './components/search/SearchPanel';
import SettingsPanel from './components/settings/SettingsPanel';
import GuidePanel from './components/guide/GuidePanel';
import type { TabId } from './types';
import { HelpCircle } from 'lucide-react';

const PAGE_TITLES: Record<TabId, string> = {
  chat:     'AI Support Chat',
  history:  'Conversation History',
  search:   'Knowledge Base (RAG)',
  settings: 'Models & Settings',
};

function Main() {
  const dispatch = useAppDispatch();
  const tab      = useAppSelector(s => s.app.tab);
  const theme    = useAppSelector(s => s.app.theme);
  const model    = useAppSelector(s => s.app.selectedModel);
  const running  = useAppSelector(s => s.app.ollamaRunning);
  const isDark   = theme === 'dark';
  const accent   = isDark ? '#e879f9' : '#3b82f6';

  useEffect(() => {
    document.documentElement.className = isDark ? 'dark' : '';
    document.body.className = isDark ? 'dark' : '';
  }, [isDark]);

  useEffect(() => { dispatch(loadModels() as any); }, []);

  const handleTab = (t: TabId) => { dispatch(setTab(t)); };

  const displayTab = tab;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Sidebar ───────────────────────────────── */}
      <aside style={{
        width: 340, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        padding: '24px 20px 20px',
        gap: 0,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, margin: '0 auto 10px',
            background: `linear-gradient(135deg, ${accent}, ${isDark ? '#a855f7' : '#1d4ed8'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 18px ${accent}55`,
          }}>
            <HelpCircle size={18} color="white" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '.04em' }}>
            Enterprise AI
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, letterSpacing: '.06em' }}>
            SUPPORT CHATBOT
          </div>
        </div>

        {/* Radial nav */}
        <RadialNav active={tab} onChange={handleTab} />

        {/* Divider */}
        <div style={{ width: '80%', height: 1, background: 'var(--border)', margin: '24px 0 20px' }} />

        {/* Status */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 10,
            background: running ? '#16a34a12' : '#dc262612',
            border: `1px solid ${running ? '#16a34a30' : '#dc262630'}`,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: running ? '#22c55e' : '#ef4444',
              boxShadow: running ? '0 0 8px #22c55e' : 'none',
              animation: running ? 'none' : 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: running ? '#22c55e' : '#ef4444' }}>
              Ollama {running ? 'Running' : 'Offline'}
            </span>
          </div>

          {model && (
            <div style={{
              padding: '8px 12px', borderRadius: 10,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{ color: 'var(--text3)' }}>Model · </span>
              <span style={{ fontWeight: 700, color: accent }}>{model}</span>
            </div>
          )}
        </div>

        {/* Spacer + setup guide */}
        <div style={{ flex: 1 }} />
        <button onClick={() => handleTab('settings')} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 10, padding: '8px', cursor: 'pointer',
          color: 'var(--text3)', fontSize: 11, fontWeight: 500,
          transition: 'border-color .2s, color .2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent; (e.currentTarget as HTMLElement).style.color = accent; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text3)'; }}
        >
          <HelpCircle size={12} /> Setup Guide
        </button>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{PAGE_TITLES[displayTab as TabId]}</span>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} key={displayTab}>
          {displayTab === 'chat'     && <ChatWindow />}
          {displayTab === 'history'  && <div style={{ overflow: 'auto', flex: 1 }}><HistoryPanel /></div>}
          {displayTab === 'search'   && <div style={{ overflow: 'auto', flex: 1 }}><SearchPanel /></div>}
          {displayTab === 'settings' && (
            <div style={{ overflow: 'auto', flex: 1, display: 'flex', gap: 0 }}>
              <SettingsPanel />
              <div style={{ borderLeft: '1px solid var(--border)', flex: 1, overflow: 'auto' }}>
                <GuidePanel />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Main />
    </Provider>
  );
}

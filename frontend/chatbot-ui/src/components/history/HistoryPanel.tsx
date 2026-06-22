import { useEffect } from 'react';
import { Trash2, Star, MessageSquare, RefreshCw } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { loadHistory, loadConversation, setTab } from '../../store/store';
import { conversationsApi } from '../../services/api';

export default function HistoryPanel() {
  const dispatch  = useAppDispatch();
  const list      = useAppSelector(s => s.history.list);
  const loading   = useAppSelector(s => s.history.loading);
  const theme     = useAppSelector(s => s.app.theme);
  const accent    = theme === 'dark' ? '#e879f9' : '#3b82f6';

  useEffect(() => { dispatch(loadHistory() as any); }, []);

  const open = async (id: number) => {
    try {
      const res = await conversationsApi.get(id);
      dispatch(loadConversation({ id, messages: res.data.messages as any }));
      dispatch(setTab('chat'));
    } catch { /* ignore */ }
  };

  const del = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await conversationsApi.delete(id);
    dispatch(loadHistory() as any);
  };

  const save = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await conversationsApi.toggleSave(id);
    dispatch(loadHistory() as any);
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Conversation History</div>
        <button onClick={() => dispatch(loadHistory() as any)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: 'var(--text3)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {loading && <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>Loading…</div>}
      {!loading && list.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>No conversations yet</div>}

      {list.map(c => (
        <div key={c.id} onClick={() => open(c.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
          background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all .15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = accent; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
        >
          <MessageSquare size={14} color={accent} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{c.model} · {c.message_count} msgs · {new Date(c.updated_at).toLocaleDateString()}</div>
          </div>
          <button onClick={e => save(e, c.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: c.is_saved ? '#f59e0b' : 'var(--text3)', padding: 4 }}>
            <Star size={13} fill={c.is_saved ? '#f59e0b' : 'none'} />
          </button>
          <button onClick={e => del(e, c.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Download, Trash2, CheckCircle, X, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { loadModels } from '../../store/store';

const BASE = 'http://localhost:8001/api';

/* ── types ─────────────────────────────────────────────── */
interface AvailableModel {
  name: string;
  size_gb: number;
  params: string;
  family: string;
  description: string;
}

type Phase = 'idle' | 'starting' | 'downloading' | 'verifying' | 'done' | 'error' | 'cancelled';

interface InstallState {
  phase: Phase;
  status: string;
  progress: number;
  detail?: string;
}

/* ── helpers ────────────────────────────────────────────── */
function familyColor(f: string): string {
  const map: Record<string, string> = {
    Llama: '#f59e0b', Mistral: '#6366f1', Mixtral: '#8b5cf6',
    Gemma: '#3b82f6', Phi: '#0ea5e9', Qwen: '#14b8a6',
    DeepSeek: '#f97316', Code: '#22c55e', Embed: '#a855f7',
  };
  return map[f] ?? '#6b7280';
}

function fmtBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(0)} MB`;
  return `${b} B`;
}

/* ── component ──────────────────────────────────────────── */
export default function ModelInstaller() {
  const dispatch      = useAppDispatch();
  const isDark        = useAppSelector(s => s.app.theme) === 'dark';
  const installed     = useAppSelector(s => s.app.models);
  const accent        = isDark ? '#e879f9' : '#3b82f6';

  const [tab, setTab]             = useState<'installed' | 'browse'>('installed');
  const [available, setAvailable] = useState<AvailableModel[]>([]);
  const [states, setStates]       = useState<Record<string, InstallState>>({});
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [filter, setFilter]       = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const aborts = useRef<Record<string, AbortController>>({});

  const installedNames = new Set(installed.map(m => m.name));

  /* load catalogue once */
  useEffect(() => {
    fetch(`${BASE}/models/available`)
      .then(r => r.json())
      .then(d => setAvailable(d.models))
      .catch(() => {});
  }, []);

  /* ── install ─────────────────────────────────────────── */
  const startInstall = async (modelName: string) => {
    const ctrl = new AbortController();
    aborts.current[modelName] = ctrl;

    setStates(p => ({ ...p, [modelName]: { phase: 'starting', status: 'Connecting to Ollama…', progress: 0 } }));

    try {
      const resp = await fetch(`${BASE}/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: ctrl.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body!.getReader();
      const dec    = new TextDecoder();
      let buf      = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';         // keep incomplete last line

        for (const raw of lines) {
          const line = raw.startsWith('data: ') ? raw.slice(6) : raw;
          if (!line.trim()) continue;

          let data: any;
          try { data = JSON.parse(line); } catch { continue; }

          if (data.error) {
            setStates(p => ({ ...p, [modelName]: { phase: 'error', status: 'Error', detail: data.error, progress: 0 } }));
            return;
          }

          if (data.status === 'success') {
            setStates(p => ({ ...p, [modelName]: { phase: 'done', status: 'Installed successfully!', progress: 100 } }));
            dispatch(loadModels() as any);
            delete aborts.current[modelName];
            return;
          }

          if (data.total && data.completed) {
            const pct = Math.min(99, Math.round((data.completed / data.total) * 100));
            const phase: Phase = data.status?.includes('verif') ? 'verifying' : 'downloading';
            setStates(p => ({
              ...p,
              [modelName]: {
                phase,
                status: `${pct}%  ·  ${fmtBytes(data.completed)} / ${fmtBytes(data.total)}`,
                progress: pct,
                detail: data.status,
              },
            }));
          } else if (data.status) {
            setStates(p => ({
              ...p,
              [modelName]: {
                phase: 'starting',
                status: data.status,
                progress: p[modelName]?.progress ?? 0,
              },
            }));
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStates(p => ({ ...p, [modelName]: { phase: 'cancelled', status: 'Download cancelled', progress: 0 } }));
      } else {
        setStates(p => ({ ...p, [modelName]: { phase: 'error', status: 'Connection failed', detail: err.message, progress: 0 } }));
      }
    }
  };

  const cancelInstall = (name: string) => {
    aborts.current[name]?.abort();
    delete aborts.current[name];
  };

  /* ── delete ──────────────────────────────────────────── */
  const doDelete = async (name: string) => {
    setConfirmDel(null);
    setDeleting(name);
    try {
      await fetch(`${BASE}/models/${encodeURIComponent(name)}`, { method: 'DELETE' });
      dispatch(loadModels() as any);
    } catch { /* ignore */ }
    setDeleting(null);
  };

  /* ── filtered browse list ────────────────────────────── */
  const filtered = available.filter(m => {
    const q = filter.toLowerCase();
    return !q || m.name.toLowerCase().includes(q)
      || m.family.toLowerCase().includes(q)
      || m.description.toLowerCase().includes(q);
  });

  /* ── styles ──────────────────────────────────────────── */
  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
    transition: 'all .2s', flexShrink: 0,
  };

  /* ── render ──────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* header */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em' }}>
        MODEL MANAGER
      </div>

      {/* tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', padding: 4, borderRadius: 10 }}>
        {(['installed', 'browse'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '7px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === t ? (isDark ? '#2a2a2a' : '#fff') : 'transparent',
            color: tab === t ? 'var(--text)' : 'var(--text3)',
            fontWeight: tab === t ? 700 : 400, fontSize: 12,
            boxShadow: tab === t ? '0 2px 6px rgba(0,0,0,.18)' : 'none',
            transition: 'all .2s',
          }}>
            {t === 'installed' ? `Installed (${installed.length})` : 'Browse & Install'}
          </button>
        ))}
      </div>

      {/* ── INSTALLED tab ─────────────────────────────── */}
      {tab === 'installed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {installed.length === 0 && (
            <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
              No models installed yet.<br />
              <span style={{ color: accent, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setTab('browse')}>Browse & Install →</span>
            </div>
          )}
          {installed.map(m => (
            <div key={m.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--bg3)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: accent, boxShadow: `0 0 6px ${accent}88`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                  {[m.family, m.parameters, m.size ? `${(m.size / 1e9).toFixed(1)} GB` : ''].filter(Boolean).join(' · ')}
                </div>
              </div>

              {confirmDel === m.name ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => doDelete(m.name)} style={{ ...btnBase, background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}>
                    Delete
                  </button>
                  <button onClick={() => setConfirmDel(null)} style={{ ...btnBase, background: 'var(--bg)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDel(m.name)}
                  disabled={deleting === m.name}
                  title="Remove model"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 6, borderRadius: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                >
                  {deleting === m.name
                    ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Trash2 size={13} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── BROWSE tab ────────────────────────────────── */}
      {tab === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* search box */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Search by name, family…"
              style={{
                width: '100%', padding: '8px 12px 8px 30px',
                borderRadius: 10, border: '1.5px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* model cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(m => {
              const st         = states[m.name];
              const isInstalled = installedNames.has(m.name);
              const isActive   = st && st.phase !== 'done' && st.phase !== 'error' && st.phase !== 'cancelled';
              const fc         = familyColor(m.family);

              return (
                <div key={m.name} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--bg3)', border: `1px solid ${st?.phase === 'done' ? '#16a34a44' : 'var(--border)'}`,
                  transition: 'border-color .3s',
                }}>
                  {/* top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* family badge */}
                    <div style={{
                      padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: fc + '22', color: fc, flexShrink: 0, marginTop: 2,
                    }}>
                      {m.family}
                    </div>

                    {/* info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, lineHeight: 1.4 }}>
                        {m.description}&nbsp;·&nbsp;{m.params}&nbsp;·&nbsp;{m.size_gb.toFixed(1)} GB
                      </div>
                    </div>

                    {/* action */}
                    {st?.phase === 'done' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        <CheckCircle size={13} /> Done!
                      </div>
                    ) : isInstalled && !isActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        <CheckCircle size={13} /> Installed
                      </div>
                    ) : isActive ? (
                      <button onClick={() => cancelInstall(m.name)} style={{ ...btnBase, background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}>
                        <X size={11} /> Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => startInstall(m.name)}
                        style={{ ...btnBase, background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${accent}44`)}
                        onMouseLeave={e => (e.currentTarget.style.background = `${accent}22`)}
                      >
                        <Download size={11} />
                        {st?.phase === 'error' || st?.phase === 'cancelled' ? 'Retry' : 'Install'}
                      </button>
                    )}
                  </div>

                  {/* progress bar */}
                  {isActive && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${st.progress}%`,
                          background: st.phase === 'verifying'
                            ? '#f59e0b'
                            : `linear-gradient(90deg, ${accent}, ${isDark ? '#a855f7' : '#1d4ed8'})`,
                          boxShadow: `0 0 8px ${accent}88`,
                          transition: 'width .4s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'var(--text3)' }}>
                        <span>{st.detail ?? st.status}</span>
                        <span style={{ fontWeight: 700, color: accent }}>{st.progress}%</span>
                      </div>
                    </div>
                  )}

                  {/* error / cancelled message */}
                  {(st?.phase === 'error' || st?.phase === 'cancelled') && (
                    <div style={{
                      marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 11, color: st.phase === 'error' ? '#ef4444' : 'var(--text3)',
                    }}>
                      <AlertCircle size={12} />
                      {st.phase === 'error' ? st.detail ?? st.status : 'Download cancelled — click Retry to resume'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

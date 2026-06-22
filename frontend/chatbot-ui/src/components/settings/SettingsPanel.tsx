import { useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { setTheme, setModel, loadModels } from '../../store/store';
import ModelInstaller from './ModelInstaller';

export default function SettingsPanel() {
  const dispatch  = useAppDispatch();
  const theme     = useAppSelector(s => s.app.theme);
  const model     = useAppSelector(s => s.app.selectedModel);
  const models    = useAppSelector(s => s.app.models);
  const running   = useAppSelector(s => s.app.ollamaRunning);
  const loaded    = useAppSelector(s => s.app.modelsLoaded);
  const isDark    = theme === 'dark';
  const accent    = isDark ? '#e879f9' : '#3b82f6';

  useEffect(() => { if (!loaded) dispatch(loadModels() as any); }, []);

  const fmt = (bytes?: number) => bytes ? `${(bytes / 1e9).toFixed(1)} GB` : '';

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 520 }}>
      {/* Theme */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 10 }}>THEME</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['light', 'dark'] as const).map(t => (
            <button key={t} onClick={() => dispatch(setTheme(t))} style={{
              flex: 1, padding: '10px', borderRadius: 12, border: `2px solid ${theme === t ? accent : 'var(--border)'}`,
              background: theme === t ? `${accent}18` : 'var(--bg2)', color: 'var(--text)',
              cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all .2s',
            }}>
              {t === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </div>

      {/* Ollama status */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em' }}>OLLAMA STATUS</div>
          <button onClick={() => dispatch(loadModels() as any)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: 'var(--text3)', fontSize: 11 }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: running ? '#16a34a18' : '#dc262618', border: `1px solid ${running ? '#16a34a44' : '#dc262644'}` }}>
          {!loaded ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} color={accent} />
            : running ? <CheckCircle size={16} color="#22c55e" /> : <XCircle size={16} color="#ef4444" />}
          <span style={{ fontSize: 13, fontWeight: 600, color: running ? '#22c55e' : '#ef4444' }}>
            {!loaded ? 'Checking…' : running ? `Running — ${models.length} model(s) available` : 'Not running'}
          </span>
        </div>
        {!running && loaded && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace' }}>
            Start Ollama: <strong>ollama serve</strong><br />
            Pull a model: <strong>ollama pull llama3.2</strong>
          </div>
        )}
      </div>

      {/* Model selector */}
      {running && models.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 10 }}>SELECT MODEL</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {models.map(m => (
              <button key={m.name} onClick={() => dispatch(setModel(m.name))} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                border: `2px solid ${model === m.name ? accent : 'var(--border)'}`,
                background: model === m.name ? `${accent}18` : 'var(--bg2)',
                cursor: 'pointer', textAlign: 'left', transition: 'all .2s',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: model === m.name ? accent : 'var(--border)', flexShrink: 0, boxShadow: model === m.name ? `0 0 8px ${accent}` : 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {[m.family, m.parameters, fmt(m.size)].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {model === m.name && <CheckCircle size={14} color={accent} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* divider */}
      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* model manager */}
      <ModelInstaller />
    </div>
  );
}

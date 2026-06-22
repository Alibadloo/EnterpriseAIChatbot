import { useState } from 'react';
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react';
import { documentsApi } from '../../services/api';
import type { RagDocument } from '../../types';
import { useAppSelector } from '../../store/store';
import { useEffect } from 'react';

export default function SearchPanel() {
  const [docs, setDocs]         = useState<RagDocument[]>([]);
  const [uploading, setUploading]= useState(false);
  const [desc, setDesc]         = useState('');
  const theme  = useAppSelector(s => s.app.theme);
  const accent = theme === 'dark' ? '#e879f9' : '#3b82f6';

  const load = async () => {
    try { const r = await documentsApi.list(); setDocs(r.data); } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await documentsApi.upload(file, desc); await load(); setDesc(''); }
    catch (err: any) { alert(err.response?.data?.detail ?? 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const del = async (id: number) => {
    await documentsApi.delete(id);
    await load();
  };

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflow: 'auto' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 10 }}>RAG — KNOWLEDGE BASE</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
          Upload company documents (PDF, TXT, MD). When chatting, enable the <strong style={{ color: accent }}>📖 RAG</strong> button to ground AI responses in these documents.
        </div>

        {/* Description field */}
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Document description (optional)"
          style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, marginBottom: 10, outline: 'none', fontFamily: 'inherit' }} />

        {/* Upload button */}
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px', borderRadius: 12, border: `2px dashed ${accent}88`,
          background: `${accent}0d`, cursor: uploading ? 'default' : 'pointer',
          color: accent, fontWeight: 600, fontSize: 13, transition: 'all .2s',
        }}>
          {uploading
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
            : <><Upload size={15} /> Upload Document (PDF / TXT / MD)</>
          }
          <input type="file" accept=".pdf,.txt,.md" onChange={upload} disabled={uploading} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Document list */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 10 }}>
          INDEXED DOCUMENTS ({docs.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13 }}>No documents yet</div>}
          {docs.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <FileText size={15} color={accent} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.filename}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {d.file_type.toUpperCase()} · {d.chunk_count} chunks · {new Date(d.created_at).toLocaleDateString()}
                  {d.description && ` · ${d.description}`}
                </div>
              </div>
              <button onClick={() => del(d.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

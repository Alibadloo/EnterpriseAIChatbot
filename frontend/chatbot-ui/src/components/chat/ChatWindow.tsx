import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Square, BookOpen, Loader2, PenSquare } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { addMessage, appendStreamToken, finalizeStream, setStreaming, setError,
         setConversationId, setUseRag, loadHistory, resetChat } from '../../store/store';
import { streamChat } from '../../services/api';

export default function ChatWindow() {
  const dispatch = useAppDispatch();
  const theme        = useAppSelector(s => s.app.theme);
  const model        = useAppSelector(s => s.app.selectedModel);
  const ollamaOk     = useAppSelector(s => s.app.ollamaRunning);
  const messages     = useAppSelector(s => s.chat.messages);
  const streaming    = useAppSelector(s => s.chat.streaming);
  const streamingTxt = useAppSelector(s => s.chat.streamingContent);
  const convId       = useAppSelector(s => s.chat.conversationId);
  const useRag       = useAppSelector(s => s.chat.useRag);
  const error        = useAppSelector(s => s.chat.error);

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const isDark    = theme === 'dark';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingTxt]);

  const send = () => {
    const text = input.trim();
    if (!text || streaming || !model) return;
    setInput('');
    dispatch(setError(null));

    dispatch(addMessage({
      id: Date.now().toString(), role: 'user', content: text,
      created_at: new Date().toISOString(),
    }));
    dispatch(setStreaming(true));

    abortRef.current = streamChat(
      text, model, convId, useRag,
      token => dispatch(appendStreamToken(token)),
      id    => dispatch(setConversationId(id)),
      _id   => { dispatch(finalizeStream()); dispatch(loadHistory() as any); },
      msg   => { dispatch(setError(msg)); dispatch(finalizeStream()); },
    );
  };

  const stop = () => { abortRef.current?.abort(); dispatch(finalizeStream()); };

  const accent = isDark ? '#e879f9' : '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && !streaming && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>Enterprise AI Support</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {ollamaOk ? `Model: ${model || 'none selected'}` : 'Ollama is not running — see Settings'}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="msg-enter" style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? accent : 'var(--bg3)',
              color: msg.role === 'user' ? 'white' : 'var(--text)',
              fontSize: 14, lineHeight: 1.6,
              boxShadow: msg.role === 'user' ? `0 2px 12px ${accent}55` : 'var(--shadow)',
            }}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    code({ className, children, ...rest }: any) {
                      const inline = !className;
                      const lang = (className || '').replace('language-', '');
                      return inline ? (
                        <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }} {...rest}>{children}</code>
                      ) : (
                        <SyntaxHighlighter language={lang || 'text'} style={isDark ? oneDark : oneLight} customStyle={{ borderRadius: 8, fontSize: 12, margin: '8px 0' }}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                      );
                    },
                    p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : msg.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streaming && (
          <div className="msg-enter" style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 14, lineHeight: 1.6,
            }}>
              {streamingTxt
                ? <><ReactMarkdown>{streamingTxt}</ReactMarkdown><span className="cursor" /></>
                : <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              }
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border)',
        background: 'var(--bg2)', display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        {/* New chat */}
        <button
          onClick={() => dispatch(resetChat())}
          title="New Chat"
          style={{
            width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--border)',
            background: 'transparent', color: 'var(--text3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'border-color .2s, color .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}
        >
          <PenSquare size={15} />
        </button>

        {/* RAG toggle */}
        <button
          onClick={() => dispatch(setUseRag(!useRag))}
          title={useRag ? 'RAG ON — using documents' : 'RAG OFF'}
          style={{
            width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${useRag ? accent : 'var(--border)'}`,
            background: useRag ? `${accent}22` : 'transparent',
            color: useRag ? accent : 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <BookOpen size={15} />
        </button>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={ollamaOk ? 'Type a message… (Enter to send, Shift+Enter for newline)' : 'Ollama not running…'}
          disabled={!ollamaOk || !model}
          rows={1}
          style={{
            flex: 1, resize: 'none', border: '1.5px solid var(--border)', borderRadius: 12,
            padding: '8px 12px', background: 'var(--bg)', color: 'var(--text)', fontSize: 14,
            outline: 'none', fontFamily: 'inherit', maxHeight: 120, lineHeight: 1.5,
            transition: 'border-color .2s',
          }}
          onFocus={e => (e.target.style.borderColor = accent)}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />

        <button
          onClick={streaming ? stop : send}
          disabled={!streaming && (!input.trim() || !model || !ollamaOk)}
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: streaming ? '#ef4444' : accent,
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: (!streaming && (!input.trim() || !model || !ollamaOk)) ? 0.4 : 1,
            boxShadow: `0 2px 10px ${streaming ? '#ef444488' : accent + '88'}`,
            flexShrink: 0,
          }}
        >
          {streaming ? <Square size={15} /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}

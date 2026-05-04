import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardDocumentIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { sendMessage } from '../api/chat';
import type { Message } from '../types';

/* ── Design tokens (match AppLayout) ─────────────────────────────────────── */
const AC = '#0C8C7C';

/* ── SVG helpers ─────────────────────────────────────────────────────────── */
const ChatIcon = ({ size = 22, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const SendIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const CloseIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const HomeIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
    <polyline points="9 21 9 12 15 12 15 21" />
  </svg>
);

const SparkleIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z" />
  </svg>
);

/* ── Empty state ── */
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
    <div className="w-12 h-12 rounded-full bg-[#EEFBF8] flex items-center justify-center mb-3">
      <SparkleIcon />
    </div>
    <p className="text-sm font-medium text-[#1A1F36] mb-1">お探しの情報はありませんか？</p>
    <p className="text-xs text-[#8E94AB]">ナレッジDBの中をAIが検索して回答します</p>
  </div>
);

/* ── Floating Chat Widget ─────────────────────────────────────────────────── */
const FloatingChatWidget: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  if (!visible) return null;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* focus input when dialog opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = async (text?: string) => {
    const textToSend = (text ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setIsEmpty(false);

    try {
      const res = await sendMessage({
        message: textToSend,
        conversation_id: conversationId,
      });
      if (!conversationId) setConversationId(res.conversation_id);

      const assistantMsg: Message = {
        id: `tmp-a-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error('メッセージの送信に失敗しました');
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      toast.success('コピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
    document.body.removeChild(textArea);
  };

  const handleCopy = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('コピーしました');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleHome = () => {
    setMessages([]);
    setConversationId(undefined);
    setInput('');
    setIsLoading(false);
  };

  const [isEmpty, setIsEmpty] = useState(true);

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="AIアシスタント"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: AC,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 16px ${AC}66, 0 2px 6px rgba(0,0,0,.15)`,
          zIndex: 1000,
          transition: 'transform .15s, box-shadow .15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = `0 6px 20px ${AC}88, 0 2px 8px rgba(0,0,0,.2)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 4px 16px ${AC}66, 0 2px 6px rgba(0,0,0,.15)`;
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* ── Chat dialog ─────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 86,
            right: 24,
            width: 360,
            height: 540,
            borderRadius: 16,
            background: '#fff',
            boxShadow: '0 8px 40px rgba(0,0,0,.18), 0 2px 12px rgba(0,0,0,.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 999,
            animation: 'fcw-slide-up .2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: AC,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(255,255,255,.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ChatIcon size={15} color="#fff" />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>
              AIアシスタント
            </span>
            {!isEmpty && (
              <button
                onClick={handleHome}
                title="ホームに戻る"
                style={{
                  background: 'rgba(255,255,255,.15)',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  marginRight: 4,
                  transition: 'background .12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
              >
                <HomeIcon />
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,.15)',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                transition: 'background .12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: isEmpty ? '0' : '14px 14px 0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {isEmpty ? (
              /* ── Empty state ─────────────────────────────────────────── */
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 20px 16px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: '#EEFBF8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <ChatIcon size={26} color={AC} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1F36', margin: '0 0 6px' }}>
                  何について知りたいですか？
                </p>
                <p style={{ fontSize: 12, color: '#8E94AB', margin: '0 0 22px', lineHeight: 1.6 }}>
                  ナレッジDB内をAIが検索して回答します
                </p>
                {/* Empty state */}
                <EmptyState />
              </div>
            ) : (
              /* ── Messages ────────────────────────────────────────────── */
              <>
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      {!isUser && (
                        <div style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: AC,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}>
                          <SparkleIcon />
                        </div>
                      )}
                      <div style={{
                        maxWidth: '78%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        gap: 4,
                      }}>
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                          background: isUser ? AC : '#F3F5F8',
                          color: isUser ? '#fff' : '#1A1F36',
                          fontSize: 13,
                          lineHeight: 1.55,
                          wordBreak: 'break-word',
                        }}>
                          {isUser ? (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                          ) : (() => {
                            const cleanedContent = msg.content
                              .replace(/出典:\s*\[.*?\]/g, '')
                              .replace(/\[.*?\|.*?\]/g, '')
                              .replace(/\n{3,}/g, '\n\n')
                              .trim();
                            return (
                              <>
                                <div style={{ fontSize: 13 }}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanedContent}</ReactMarkdown>
                                </div>
                                <button
                                  onClick={() => handleCopy(cleanedContent)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    marginTop: 4,
                                    padding: '4px 8px',
                                    background: '#F3F5F8',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    color: '#666',
                                  }}
                                  title="コピー"
                                >
                                  <ClipboardDocumentIcon style={{ width: 13, height: 13 }} />
                                </button>
                                {msg.content.includes('該当する情報が見つかりませんでした') && (
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                    marginTop: 8,
                                    padding: '8px 10px',
                                    borderLeft: '4px solid #f59e0b',
                                    background: '#FEF3C7',
                                    borderRadius: '0 6px 6px 0',
                                    fontSize: 13,
                                    color: '#92400e',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />
                                      <span style={{ fontWeight: 600 }}>該当する情報が見つかりませんでした</span>
                                    </div>
                                    <span>以下をお試しください：</span>
                                    <ul style={{ margin: '2px 0 0 8px', padding: 0, listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      <li>→「品質保証」でカテゴリを絞り込む</li>
                                      <li>キーワードを「品質検査報告書」等に変更</li>
                                      <li>対象部門を確認（部門限定ドキュメントの可能性）</li>
                                    </ul>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <span style={{ fontSize: 10, color: '#B0B8C8' }}>
                          {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Loading bubble */}
                {isLoading && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', background: AC,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <SparkleIcon />
                    </div>
                    <div style={{
                      padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
                      background: '#F3F5F8', display: 'flex', gap: 4, alignItems: 'center',
                    }}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          style={{
                            width: 6, height: 6, borderRadius: '50%', background: '#B0B8C8',
                            animation: `fcw-dot .9s ${i * 0.2}s infinite`,
                            display: 'inline-block',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid #EAEEF4',
            flexShrink: 0,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            background: '#fff',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="質問を入力..."
              rows={1}
              style={{
                flex: 1,
                border: '1.5px solid #E4E8EE',
                borderRadius: 10,
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                maxHeight: 90,
                overflowY: 'auto',
                transition: 'border-color .15s',
                color: '#1A1F36',
                background: '#FAFBFC',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = AC)}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#E4E8EE')}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: 'none',
                background: !input.trim() || isLoading ? '#E4E8EE' : AC,
                color: !input.trim() || isLoading ? '#B0B8C8' : '#fff',
                cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background .15s',
              }}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* ── Animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes fcw-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fcw-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: .4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default FloatingChatWidget;

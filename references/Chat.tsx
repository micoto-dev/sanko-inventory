import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PaperAirplaneIcon,
  PlusIcon,
  XMarkIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

import { sendMessage, createConversation, getConversation, getConversations } from '../api/chat';
import { getCategories } from '../api/categories';
import { formatJST } from '../utils/formatJST';
import type { Message, Source } from '../types';

// ─── Message bubble ───────────────────────────────────────────────────────────

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

const MessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  const cleanedContent = msg.content
    .replace(/出典:\s*\[.*?\]/g, '')
    .replace(/\[.*?\|.*?\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const uniqueSources = Array.from(
    new Map(
      msg.sources?.map(s => [`${s.filename}|${s.sheet_name ?? ''}|${s.page_number ?? ''}`, s])
    ).values()
  );

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
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0C8C7C] mt-1">
          <SparklesIcon className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`max-w-[850px] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#0C8C7C] text-white rounded-tr-sm'
              : 'bg-gray-100 border border-gray-200 text-gray-800 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            !msg.content.includes('該当する情報が見つかりませんでした') && (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanedContent}</ReactMarkdown>
              </div>
            )
          )}
        </div>

        {/* Copy button */}
        {!isUser && (
          <button
            onClick={() => handleCopy(cleanedContent)}
            className="self-start rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="コピー"
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Suggestions (no results) */}
        {!isUser && msg.content.includes('該当する情報が見つかりませんでした') && (
          <div className="flex flex-col gap-1 rounded-lg border-l-4 border-amber-300 bg-amber-100 px-3 py-2.5 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
              <p className="font-semibold">該当する情報が見つかりませんでした</p>
            </div>
            <p>以下をお試しください：</p>
            <ul className="ml-2 space-y-0.5">
              <li>→「品質保証」でカテゴリを絞り込む</li>
              <li>キーワードを「品質検査報告書」等に変更</li>
              <li>対象部門を確認（部門限定ドキュメントの可能性）</li>
            </ul>
          </div>
        )}

        {/* Sources as clickable cards */}
        {!msg.content.includes('該当する情報が見つかりませんでした') && uniqueSources.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {uniqueSources.map((s, i) => (
              <div
                key={i}
                onClick={() => window.open(`/documents/${s.document_id}`, '_blank')}
                className="flex items-center gap-2 rounded-lg bg-white border border-green-500 px-3 py-2 text-xs cursor-pointer hover:bg-green-50 transition-colors"
              >
                <DocumentTextIcon className="h-3.5 w-3.5 shrink-0 text-green-700" />
                <span className="flex-1 font-medium text-green-700 truncate">{s.filename}</span>
                {s.page_number != null && <span className="text-green-500/60">p.{s.page_number}</span>}
                {s.sheet_name && <span className="text-green-500/60">{s.sheet_name}</span>}
              </div>
            ))}
          </div>
        )}

        <span className="text-[11px] text-gray-400">
          {formatJST(msg.created_at)}
        </span>
      </div>
    </div>
  );
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { conversationId: convIdParam } = useParams<{ conversationId?: string }>();
  const queryClient = useQueryClient();

  const [conversationId, setConversationId] = useState<string | undefined>(convIdParam);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([]);
  const [filterEntityValue, setFilterEntityValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conversations list
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 0,
  });

  // Load existing conversation
  const { data: existingConv } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (existingConv?.messages) {
      setMessages(existingConv.messages);
    }
  }, [existingConv]);

  // Categories for filter
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    staleTime: 5 * 60_000,
  });

  const flatCategories: any[] = [];
  const walkCats = (cats: any[]) => {
    for (const c of cats) {
      flatCategories.push(c);
      if (c.children?.length) walkCats(c.children);
    }
  };
  if (categories) walkCats(categories);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await sendMessage({
        message: text,
        conversation_id: conversationId,
        filters: {
          category_ids: filterCategoryIds.length ? filterCategoryIds : undefined,
          entity_value: filterEntityValue || undefined,
        },
      });

      if (!conversationId) {
        setConversationId(res.conversation_id);
        navigate(`/chat/${res.conversation_id}`, { replace: true });
      }

      queryClient.invalidateQueries({ queryKey: ['conversations'] });

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

  const startNewConversation = async () => {
    try {
      const conv = await createConversation();
      setConversationId(conv.id);
      setMessages([]);
      navigate(`/chat/${conv.id}`, { replace: true });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('新しい会話を開始しました');
    } catch {
      // fallback: just clear
      setConversationId(undefined);
      setMessages([]);
      navigate('/chat', { replace: true });
    }
  };

  const toggleCategory = (id: string) => {
    setFilterCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const switchConversation = (id: string) => {
    setConversationId(id);
    navigate(`/chat/${id}`, { replace: true });
  };

  const activeConv = conversations?.find((c) => c.id === conversationId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: 'calc(100vh - 120px)' }}>
      {/* Left: conversation sidebar */}
      <div style={{
        background: '#FFFFFF',
        borderRight: '1px solid #E4E8EE',
        borderRadius: '14px 0 0 14px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header with new conversation button */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #EEF1F5' }}>
          <button onClick={startNewConversation} style={{
            width: '100%',
            justifyContent: 'center',
            background: '#0C8C7C',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <PlusIcon className="h-4 w-4" />
            新規会話
          </button>
        </div>
        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {conversations?.map((conv) => (
            <div
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              style={{
                padding: '9px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: conv.id === conversationId ? '#EEFBF8' : 'transparent',
                marginBottom: 2,
              }}
            >
              <div style={{
                fontSize: 12,
                fontWeight: conv.id === conversationId ? 600 : 500,
                color: '#1A1F36',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {conv.title || '無題の会話'}
              </div>
              <div style={{
                fontSize: 10,
                color: '#8E94AB',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {conv.messages && conv.messages.length > 0
                  ? conv.messages[conv.messages.length - 1].content.slice(0, 40)
                  : ''}
              </div>
              <div style={{ fontSize: 9, color: '#8E94AB', marginTop: 1 }}>
                {formatJST(conv.updated_at)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: chat area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: '0 14px 14px 0',
        overflow: 'hidden',
        border: '1px solid #E4E8EE',
        borderLeft: 'none',
      }}>
        {/* Chat header */}
        <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-gray-900">AI チャット</h1>
            {conversationId && activeConv && (
              <span className="text-xs text-gray-400 font-mono truncate max-w-[160px]">
                {activeConv.title || '無題の会話'}
              </span>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="shrink-0 border-b bg-gray-50 px-4 py-3">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[160px]">
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">カテゴリ</p>
                <div className="flex flex-wrap gap-1.5">
                  {flatCategories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleCategory(c.id)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        filterCategoryIds.includes(c.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-[160px]">
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">会社名</p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="例: ジャパンマリン..."
                    value={filterEntityValue}
                    onChange={(e) => setFilterEntityValue(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {filterEntityValue && (
                    <button
                      onClick={() => setFilterEntityValue('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <SparklesIcon className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-base font-semibold text-gray-400">AI に質問してみましょう</p>
              <p className="mt-1 text-sm text-[#8E94AB]">ドキュメントの内容について自然言語で質問できます</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0C8C7C]">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t bg-white px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力…（Shift+Enter で改行）"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-32"
              style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0C8C7C] text-white transition-colors hover:bg-[#0A7A6D] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-center text-[11px] text-gray-400">
            Enter で送信 · Shift+Enter で改行
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;

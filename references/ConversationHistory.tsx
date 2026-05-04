import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { getConversations, deleteConversation, createConversation } from '../api/chat';
import { LoadingSpinner, EmptyState, ConfirmDialog } from '../components/ui';
import { formatJST } from '../utils/formatJST';
import type { Conversation } from '../types';

const ConversationHistory: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      toast.success('会話を削除しました');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('削除に失敗しました'),
  });

  const newConvMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      navigate(`/chat/${conv.id}`);
    },
    onError: () => navigate('/chat'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 style={{fontSize: 22, fontWeight: 700, color: '#1A1F36', margin: 0}}>会話履歴</h2>
        <button
          onClick={() => newConvMutation.mutate()}
          disabled={newConvMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[#0C8C7C] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A7A6D] disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" />
          新しい会話
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      ) : !data?.length ? (
        <EmptyState
          title="会話履歴がありません"
          description="AI チャットで質問してみましょう"
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">タイトル</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">プレビュー</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">メッセージ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">日時</th>
              </tr>
            </thead>
            <tbody>
              {data.map((conv: Conversation) => (
                <tr
                  key={conv.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/chat/${conv.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#1A1F36]">{conv.title ?? '（タイトルなし）'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400 truncate max-w-[200px]">
                      {conv.title?.slice(0, 50) || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{'—'}件</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{formatJST(conv.updated_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="会話を削除"
        message="この会話を削除します。この操作は元に戻せません。"
        confirmLabel="削除"
        variant="danger"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
};

export default ConversationHistory;

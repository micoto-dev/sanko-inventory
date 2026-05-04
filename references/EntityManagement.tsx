import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  getEntities,
  updateEntity,
  getEntityMasters,
  createEntityMaster,
  updateEntityMaster,
  deleteEntityMaster,
} from '../api/entities';
import { Button, LoadingSpinner, ConfirmDialog, Modal, Pagination, SortableTh } from '../components/ui';
import useSortableTable from '../hooks/useSortableTable';
import useThemeStore from '../stores/themeStore';
import type { EntityType, EntityMaster } from '../types';

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'COMPANY_NAME', label: '会社名' },
  { value: 'CREDIT_LIMIT', label: '与信限度額' },
  { value: 'PAYMENT_TERMS', label: '支払条件' },
  { value: 'CONTRACT_DATE', label: '契約日' },
  { value: 'CONTRACT_AMOUNT', label: '契約金額' },
  { value: 'PERSON_NAME', label: '担当者' },
  { value: 'PRODUCT_NAME', label: '製品名' },
  { value: 'OTHER', label: 'その他' },
];

const PAGE_SIZE = 30;

// ─── Entity Master Modal ──────────────────────────────────────────────────────

interface MasterModalProps {
  open: boolean;
  editing: EntityMaster | null;
  onClose: () => void;
  onSaved: () => void;
}

const MasterModal: React.FC<MasterModalProps> = ({ open, editing, onClose, onSaved }) => {
  const [type, setType] = useState<EntityType>(editing?.entity_type ?? 'COMPANY_NAME');
  const [canonical, setCanonical] = useState(editing?.canonical_value ?? '');
  const [aliasInput, setAliasInput] = useState('');
  const [aliases, setAliases] = useState<string[]>(editing?.aliases ?? []);

  React.useEffect(() => {
    setType(editing?.entity_type ?? 'COMPANY_NAME');
    setCanonical(editing?.canonical_value ?? '');
    setAliases(editing?.aliases ?? []);
    setAliasInput('');
  }, [editing, open]);

  const mutation = useMutation({
    mutationFn: editing
      ? () => updateEntityMaster(editing.id, { canonical_value: canonical, aliases })
      : () => createEntityMaster({ entity_type: type, canonical_value: canonical, aliases }),
    onSuccess: () => {
      toast.success(editing ? 'マスタを更新しました' : 'マスタを作成しました');
      onSaved();
    },
    onError: () => toast.error('保存に失敗しました'),
  });

  const addAlias = () => {
    if (aliasInput.trim() && !aliases.includes(aliasInput.trim())) {
      setAliases((prev) => [...prev, aliasInput.trim()]);
      setAliasInput('');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'エンティティマスタ編集' : '新規エンティティマスタ'}>
      <div className="space-y-4 p-4">
        {!editing && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 text-gray-500">種別</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EntityType)}
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-800 text-[#1A1F36] px-3 py-2 text-sm"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 text-gray-500">正規化値（canonical）</label>
          <input
            type="text"
            value={canonical}
            onChange={(e) => setCanonical(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white text-gray-800 text-[#1A1F36] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="例: ジャパンマリンユナイテッド株式会社"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 text-gray-500">エイリアス</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAlias()}
              placeholder="例: JMU"
              className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-800 text-[#1A1F36] px-3 py-2 text-sm"
            />
            <button
              onClick={addAlias}
              className="rounded-lg border border-gray-300 text-gray-500 px-3 py-2 text-xs hover:bg-gray-50"
            >
              追加
            </button>
          </div>
          {aliases.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {aliases.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500"
                >
                  {a}
                  <button
                    onClick={() => setAliases((prev) => prev.filter((_, j) => j !== i))}
                    className="text-gray-400hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!canonical.trim()}
          >
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const EntityManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const isDark = useThemeStore((s) => s.isDark);
  const [activeTab, setActiveTab] = useState<'extracted' | 'master'>('extracted');
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<EntityType | ''>('');
  const [filterUnmatched, setFilterUnmatched] = useState(false);

  // Extracted entities
  const { data: entitiesData, isLoading: entLoading } = useQuery({
    queryKey: ['entities', { page, filterType, filterUnmatched }],
    queryFn: () =>
      getEntities({
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        entity_type: filterType || undefined,
        is_matched_master: filterUnmatched ? false : undefined,
      }),
    staleTime: 30_000,
    enabled: activeTab === 'extracted',
  });

  // Entity masters
  const { data: masters, isLoading: masterLoading } = useQuery({
    queryKey: ['entity-masters'],
    queryFn: getEntityMasters,
    staleTime: 30_000,
    enabled: activeTab === 'master',
  });

  const [editingEntity, setEditingEntity] = useState<{ id: string; normalized_value: string } | null>(null);
  const [editNorm, setEditNorm] = useState('');

  const updateEntityMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      updateEntity(id, { normalized_value: value }),
    onSuccess: () => {
      toast.success('正規化値を更新しました');
      setEditingEntity(null);
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
    onError: () => toast.error('更新に失敗しました'),
  });

  // Master CRUD
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<EntityMaster | null>(null);
  const [deleteMasterTarget, setDeleteMasterTarget] = useState<EntityMaster | null>(null);

  const deleteMasterMutation = useMutation({
    mutationFn: (id: string) => deleteEntityMaster(id),
    onSuccess: () => {
      toast.success('マスタを削除しました');
      queryClient.invalidateQueries({ queryKey: ['entity-masters'] });
    },
    onError: () => toast.error('削除に失敗しました'),
  });

  const totalPages = entitiesData ? Math.ceil(entitiesData.total / PAGE_SIZE) : 0;

  const { sorted: sortedEntities, sortKey: entSortKey, sortDir: entSortDir, handleSort: handleEntSort } = useSortableTable<any>(entitiesData?.items ?? []);
  const { sorted: sortedMasters, sortKey: mstSortKey, sortDir: mstSortDir, handleSort: handleMstSort } = useSortableTable<EntityMaster>(masters ?? []);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 style={{fontSize: 22, fontWeight: 700, color: '#1A1F36', marginBottom: 16}}>エンティティ管理</h2>
        <p className="mt-0.5 text-sm text-gray-500">抽出エンティティの確認・修正とマスタ管理</p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex border-b border-gray-200">
        {(['extracted', 'master'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:text-gray-600'
            }`}
          >
            {tab === 'extracted' ? '抽出エンティティ' : 'エンティティマスタ'}
          </button>
        ))}
      </div>

      {/* Extracted entities tab */}
      {activeTab === 'extracted' && (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value as EntityType | ''); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white text-gray-800 text-[#1A1F36] px-3 py-2 text-sm"
            >
              <option value="">すべての種別</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={filterUnmatched}
                onChange={(e) => { setFilterUnmatched(e.target.checked); setPage(1); }}
                className="rounded border-gray-300"
              />
              マスタ未登録のみ
            </label>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {entLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="md" /></div>
            ) : !entitiesData?.items?.length ? (
              <div className="py-12 text-center text-sm text-gray-400 text-gray-500">エンティティがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 bg-white text-xs text-gray-500">
                    <tr>
                      <SortableTh label="種別" sortKey="entity_type" currentSortKey={entSortKey} currentSortDir={entSortDir} onSort={handleEntSort} className="px-4 py-3 text-left font-medium" />
                      <SortableTh label="抽出値" sortKey="entity_value" currentSortKey={entSortKey} currentSortDir={entSortDir} onSort={handleEntSort} className="px-4 py-3 text-left font-medium" />
                      <SortableTh label="正規化値" sortKey="normalized_value" currentSortKey={entSortKey} currentSortDir={entSortDir} onSort={handleEntSort} className="px-4 py-3 text-left font-medium" />
                      <SortableTh label="文書数" sortKey="document_count" currentSortKey={entSortKey} currentSortDir={entSortDir} onSort={handleEntSort} className="px-4 py-3 text-left font-medium" />
                      <SortableTh label="マスタ" sortKey="is_matched_master" currentSortKey={entSortKey} currentSortDir={entSortDir} onSort={handleEntSort} className="px-4 py-3 text-left font-medium" />
                      <th className="px-4 py-3 text-left font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 divide-gray-100">
                    {sortedEntities.map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-[#EEFBF8] px-2 py-0.5 text-xs text-[#0C8C7C]">
                            {ENTITY_TYPES.find((t) => t.value === e.entity_type)?.label ?? e.entity_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 text-[#1A1F36]">{e.entity_value}</td>
                        <td className="px-4 py-2.5">
                          {editingEntity?.id === e.id ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editNorm}
                                onChange={(ev) => setEditNorm(ev.target.value)}
                                className="w-32 rounded border border-blue-300 px-2 py-0.5 text-xs"
                                autoFocus
                              />
                              <button
                                onClick={() => updateEntityMutation.mutate({ id: e.id, value: editNorm })}
                                className="text-green-600 hover:text-green-700 text-xs"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingEntity(null)}
                                className="text-gray-400 text-xs"
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <span className="text-blue-700 text-blue-500">{e.normalized_value ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {e.is_matched_master ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" title="マスタ一致" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-gray-400" title="未登録" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {e.document_count ?? 1}件
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => {
                              setEditingEntity({ id: e.id, normalized_value: e.normalized_value ?? '' });
                              setEditNorm(e.normalized_value ?? '');
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Master tab */}
      {activeTab === 'master' && (
        <>
          <div className="mb-4 flex justify-end">
            <Button variant="primary" onClick={() => { setEditingMaster(null); setMasterModalOpen(true); }}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              新規マスタ
            </Button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {masterLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="md" /></div>
            ) : !masters?.length ? (
              <div className="py-12 text-center text-sm text-gray-400 text-gray-500">マスタがありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 bg-white text-xs text-gray-500">
                  <tr>
                    <SortableTh label="種別" sortKey="entity_type" currentSortKey={mstSortKey} currentSortDir={mstSortDir} onSort={handleMstSort} className="px-4 py-3 text-left font-medium" />
                    <SortableTh label="正規化値" sortKey="canonical_value" currentSortKey={mstSortKey} currentSortDir={mstSortDir} onSort={handleMstSort} className="px-4 py-3 text-left font-medium" />
                    <th className="px-4 py-3 text-left font-medium">エイリアス</th>
                    <th className="px-4 py-3 text-left font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 divide-gray-100">
                  {sortedMasters.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                          {ENTITY_TYPES.find((t) => t.value === m.entity_type)?.label ?? m.entity_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 text-[#1A1F36]">{m.canonical_value}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {m.aliases?.map((a, i) => (
                            <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 text-gray-500">
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingMaster(m); setMasterModalOpen(true); }}
                            className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50"
                            style={{ fontWeight: 600 }}
                          >
                            修正
                          </button>
                          <button
                            onClick={() => setDeleteMasterTarget(m)}
                            className="rounded border border-red-300 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50"
                            style={{ fontWeight: 600 }}
                          >
                            統合
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <MasterModal
        open={masterModalOpen}
        editing={editingMaster}
        onClose={() => setMasterModalOpen(false)}
        onSaved={() => {
          setMasterModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['entity-masters'] });
        }}
      />

      <ConfirmDialog
        open={!!deleteMasterTarget}
        title="マスタを削除"
        message={`「${deleteMasterTarget?.canonical_value}」を削除します。`}
        confirmLabel="削除"
        variant="danger"
        onConfirm={() => {
          if (deleteMasterTarget) deleteMasterMutation.mutate(deleteMasterTarget.id);
          setDeleteMasterTarget(null);
        }}
        onClose={() => setDeleteMasterTarget(null)}
      />
    </div>
  );
};

export default EntityManagement;

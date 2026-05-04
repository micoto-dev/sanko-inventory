import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../api/departments';
import { Button, LoadingSpinner, ConfirmDialog, Modal } from '../components/ui';
import useThemeStore from '../stores/themeStore';
import type { Department } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively sum direct user_count of a node and all descendants. */
const totalCount = (dept: Department): number =>
  dept.user_count + (dept.children ?? []).reduce((s, c) => s + totalCount(c), 0);

// ─── Tree Node ────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  dept: Department;
  level: number;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onAddChild: (parent: Department) => void;
}

const DeptTreeNode: React.FC<TreeNodeProps> = ({ dept, level, onEdit, onDelete, onAddChild }) => {
  const isDark = useThemeStore((s) => s.isDark);
  const hasChildren = (dept.children?.length ?? 0) > 0;
  const count = totalCount(dept);
  const isRoot = level === 0;

  return (
    <li>
      {/* Row */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 border-gray-100${
          isRoot ? '' : 'bg-gray-50/60 bg-gray-50/60'
        }`}
        style={{ paddingLeft: `${16 + level * 32}px` }}
      >
        {/* Child indent prefix */}
        {!isRoot && (
          <span className="text-gray-400 text-gray-500 text-sm mr-1 shrink-0">└</span>
        )}

        {/* Icon */}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isRoot ? '#3A6FF8' : '#9CA3AF'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <circle cx="12" cy="4" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="M12 6v6M12 12l-7 5M12 12l7 5" />
        </svg>

        {/* Name + badge + count (left-aligned group) */}
        <span className="flex flex-1 items-center gap-2 min-w-0">
          <span
            className={`text-sm font-medium truncate ${
              isRoot
                ? 'text-gray-800 text-[#1A1F36]'
                : 'text-gray-600 text-gray-500'
            }`}
          >
            {dept.name}
          </span>

          {/* 部 / 課 badge */}
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${
              isRoot
                ? 'bg-[#EBF1FF] text-[#3A6FF8]'
                : 'bg-[#F3F0FF] text-[#7C5CFC]'
            }`}
          >
            {isRoot ? '部' : '課'}
          </span>

          {/* User count */}
          <span className="shrink-0 text-sm text-gray-500">
            {count}名
          </span>
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isRoot && (
            <button
              title="課を追加"
              onClick={() => onAddChild(dept)}
              className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <PlusIcon className="h-3 w-3" />
              課を追加
            </button>
          )}
          <button
            title="編集"
            onClick={() => onEdit(dept)}
            className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <PencilSquareIcon className="h-3 w-3" />
            編集
          </button>
          <button
            title="削除"
            onClick={() => onDelete(dept)}
            className="rounded border border-gray-300 p-1 text-gray-400 text-gray-500 hover:border-red-400 hover:text-red-500 transition-colors"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children – always expanded */}
      {hasChildren && (
        <ul>
          {dept.children.map((child) => (
            <DeptTreeNode
              key={child.id}
              dept={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

// ─── Form Modal ────────────────────────────────────────────────────────────────

interface FormModalProps {
  open: boolean;
  editing: Department | null;
  parent: Department | null;
  topLevelDepts: Department[];
  onClose: () => void;
  onSaved: () => void;
}

const DeptFormModal: React.FC<FormModalProps> = ({
  open,
  editing,
  parent,
  topLevelDepts,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(editing?.name ?? '');
  const [parentId, setParentId] = useState<string | null>(
    editing?.parent_id ?? parent?.id ?? null
  );

  React.useEffect(() => {
    setName(editing?.name ?? '');
    setParentId(editing?.parent_id ?? parent?.id ?? null);
  }, [editing, parent, open]);

  const isEdit = !!editing;

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateDepartment(editing!.id, { name, parent_id: parentId })
        : createDepartment({ name, parent_id: parentId }),
    onSuccess: () => {
      toast.success(isEdit ? '部門を更新しました' : '部門を作成しました');
      onSaved();
    },
    onError: () => toast.error('保存に失敗しました'),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? '部門編集' : '新規部門作成'}>
      <div className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 text-gray-500">
            部門名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white text-gray-800 text-[#1A1F36] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="例: 製造部、設計課"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 text-gray-500">親部門</label>
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full rounded-lg border border-gray-300 bg-white text-gray-800 text-[#1A1F36] px-3 py-2 text-sm"
          >
            <option value="">（なし → 部レベル）</option>
            {topLevelDepts
              .filter((d) => d.id !== editing?.id)
              .map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
          </select>
          <p className="mt-1 text-xs text-gray-400 text-gray-500">
            親なし = 部 / 親あり = 課（最大2階層）
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!name.trim()}
          >
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const DepartmentManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const isDark = useThemeStore((s) => s.isDark);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [parentDept, setParentDept] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      toast.success('部門を削除しました');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? '削除できません（ユーザーまたは子部門が存在します）';
      toast.error(msg);
    },
  });

  // Backend returns tree: data contains only root nodes
  const topLevelDepts = data ?? [];

  const openCreate = () => {
    setEditingDept(null);
    setParentDept(null);
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setParentDept(null);
    setModalOpen(true);
  };

  const openAddChild = (parent: Department) => {
    setEditingDept(null);
    setParentDept(parent);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1F36', marginBottom: 4 }}>
            部門管理
          </h2>
          <p className="text-sm text-gray-500">部→課の階層構造</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          部門追加
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : !data?.length ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400 text-gray-500">
            部門がありません。「部門追加」から追加してください。
          </div>
        ) : (
          <ul>
            {topLevelDepts.map((dept) => (
              <DeptTreeNode
                key={dept.id}
                dept={dept}
                level={0}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onAddChild={openAddChild}
              />
            ))}
          </ul>
        )}
      </div>

      <DeptFormModal
        open={modalOpen}
        editing={editingDept}
        parent={parentDept}
        topLevelDepts={topLevelDepts}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['departments'] });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="部門を削除"
        message={`「${deleteTarget?.name}」を削除しますか？\nユーザーが所属している場合、または子部門が存在する場合は削除できません。`}
        confirmLabel="削除"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DepartmentManagement;

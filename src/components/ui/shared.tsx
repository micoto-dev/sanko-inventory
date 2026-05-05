'use client';

import { X, CheckCircle2 } from 'lucide-react';
import React from 'react';

export const Modal = ({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: string;
}) => {
  if (!open) return null;
  const sz: Record<string, string> = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 pt-[5vh]">
        <div className={`bg-white rounded-lg ${sz[size] || sz.md} w-full my-4`} onClick={e => e.stopPropagation()}>
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-lg z-10">
            <h2 className="font-bold text-black">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const Btn = ({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', icon: Icon }: {
  children: React.ReactNode; variant?: string; size?: string; onClick?: () => void; disabled?: boolean; className?: string; icon?: React.ElementType;
}) => {
  const v: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    secondary: 'bg-white border border-slate-200 text-black hover:bg-slate-50',
    ghost: 'text-blue-600 hover:bg-blue-50',
  };
  const s: Record<string, string> = { sm: 'px-2 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2' };
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded font-medium transition flex items-center gap-1.5 ${v[variant] || v.primary} ${s[size] || s.md} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 12 : 14} />} {children}
    </button>
  );
};

export const StatusBadge = ({ statusKey, statusMap }: { statusKey: string; statusMap: Record<string, { label: string; color?: string }> }) => {
  const s = statusMap[statusKey];
  if (!s) return null;
  return <span className={`text-xs px-2 py-0.5 rounded ${s.color || ''}`}>{s.label}</span>;
};

export const Toast = ({ msg }: { msg: string }) => msg ? (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-lg z-[60] flex items-center gap-2 text-sm">
    <CheckCircle2 size={16} className="text-emerald-400" />
    {msg}
  </div>
) : null;

export const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-xs font-semibold text-black mb-1">{label}</label>
    {children}
  </div>
);

export const Card = ({ label, value, sub }: { label: string; value: string | number; sub: string }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-3">
    <div className="text-[11px] text-black">{label}</div>
    <div className="text-xl font-bold text-black mt-0.5">{value}</div>
    <div className="text-[11px] text-black">{sub}</div>
  </div>
);

export const inputClass = "w-full border border-slate-300 rounded px-2.5 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400";

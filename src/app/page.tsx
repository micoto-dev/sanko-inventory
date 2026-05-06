'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Search, Package, ShoppingCart, ClipboardCheck,
  Bell, AlertTriangle, AlertCircle, Truck, Filter,
  CheckCircle2, MapPin, Plus, Edit, BarChart3, Package2, Anchor,
  Factory, Warehouse, Trash2, Save, Send, MessageSquare, Users,
  History, Cpu, Loader2, Building, Database, Shield, UserPlus,
  ChevronRight, ToggleLeft, ToggleRight, Copy, Sparkles, FileText,
  X, KeyRound, PlusCircle, ChevronDown, Tag, LogOut, RotateCcw, Settings,
  QrCode, Printer, ScanLine, Menu, Camera,
  TrendingUp, Clock, Building2,
  Zap, RefreshCw, Link2, XCircle, Download, ChevronUp,
} from 'lucide-react';
import { Modal, Btn, StatusBadge, Toast, Field, Card, inputClass } from '@/components/ui/shared';
import { STATUS_COLOR, ORDER_STATUS, MO_STATUS, LOG_CATEGORY, yen } from '@/lib/constants';
import { api } from '@/lib/api';

// ========================== Types ==========================
interface Part {
  id: string; code: string; name: string; spec?: string; category?: string;
  maker?: string; makerCode?: string; supplier?: string; supplierId?: number;
  stock: number; allocated: number; onOrder: number;
  reorderPoint: number; safetyStock: number; maxStock: number;
  unit: string; unitPrice: number; leadTime: number; location?: string;
  shortageReason?: string;
}

interface Order {
  id: number; orderNo: string; supplier: string; supplierId: number;
  orderDate: string; desiredDate?: string; expectedDeliveryDate?: string;
  status: string; totalAmount: number; notes?: string;
  comments?: { text: string; ts: string; user?: string }[];
  details: { id?: number; partId: string; partName?: string; qty: number; receivedQty: number; unitPrice: number; remarks?: string }[];
}

interface ProdOrder {
  id: number; prodNo: string; productCode?: string; productName?: string;
  productId: number; qty: number; status: string; startDate?: string; dueDate?: string;
  customer?: string;
}

interface Location {
  id: string; warehouse: string; shelf: string; col: string; row: string; side?: string;
  name: string; maxQty: number; locType: string; isActive: boolean;
}

interface Log {
  id: number; ts: string; userName?: string; category: string; action: string;
  targetId?: string; description?: string;
}

// ========================== Sidebar ==========================
const MENU_ITEMS = [
  { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { id: 'master', label: '部品マスタ', icon: Package },
  { id: 'products', label: '製品マスタ・BOM', icon: Cpu },
  { id: 'locations', label: 'ロケーション', icon: Warehouse },
  { id: 'suppliers', label: '仕入先/メーカー管理', icon: Building2 },
  { id: 'orders', label: '発注管理', icon: ShoppingCart },
  { id: 'receive', label: '入庫処理', icon: Truck },
  { id: 'production', label: '製造指図', icon: Factory },
  { id: 'issue', label: '出庫処理', icon: Package2 },
  { id: 'qr', label: 'QRコード', icon: QrCode },
  { id: 'stocktake', label: '棚卸し', icon: ClipboardCheck },
  { id: 'reports', label: 'レポート', icon: BarChart3 },
  { id: 'logs', label: '履歴・ログ', icon: History },
  { id: 'chat', label: 'AIチャット', icon: MessageSquare },
  { id: 'users', label: 'ユーザー管理', icon: Users },
  { id: 'departments', label: '部署管理', icon: Building },
  { id: 'entities', label: 'エンティティ', icon: Database },
  { id: 'settings', label: '設定', icon: Shield },
];

const SidebarContent = ({ view, setView, onNavigate }: { view: string; setView: (v: string) => void; onNavigate?: () => void }) => (
  <>
    <div className="p-3.5 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-md flex items-center justify-center">
          <Anchor size={17} className="text-black" />
        </div>
        <div>
          <div className="font-bold text-sm">三工電機</div>
          <div className="text-[11px] text-black uppercase">Inventory</div>
        </div>
      </div>
    </div>
    <nav className="flex-1 p-2 overflow-y-auto">
      {MENU_ITEMS.map(item => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button key={item.id} onClick={() => { setView(item.id); onNavigate?.(); }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm mb-0.5 transition ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <Icon size={16} />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        );
      })}
    </nav>
  </>
);

const Sidebar = ({ view, setView, mobileOpen, setMobileOpen }: {
  view: string; setView: (v: string) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void;
}) => (
  <>
    {/* Desktop sidebar */}
    <aside className="hidden md:flex w-56 bg-slate-900 text-slate-100 flex-col flex-shrink-0">
      <SidebarContent view={view} setView={setView} />
    </aside>

    {/* Mobile overlay */}
    {mobileOpen && (
      <div className="md:hidden fixed inset-0 z-50 flex">
        <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
        <aside className="relative w-64 bg-slate-900 text-slate-100 flex flex-col z-10">
          <SidebarContent view={view} setView={setView} onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>
    )}
  </>
);

const TopBar = ({ title, subtitle, onMenuOpen, userName }: { title: string; subtitle?: string; onMenuOpen: () => void; userName?: string }) => (
  <div className="bg-white border-b border-slate-200 px-3 md:px-5 py-2.5 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <button onClick={onMenuOpen} className="md:hidden p-1.5 -ml-1 hover:bg-slate-100 rounded">
        <Menu size={20} className="text-black" />
      </button>
      <div className="min-w-0">
        <h1 className="text-base font-bold text-black truncate">{title}</h1>
        {subtitle && <p className="text-xs text-black hidden sm:block">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="hidden sm:flex items-center gap-2 text-xs text-black">
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">{(userName || 'U').slice(0, 1)}</div>
        <span>{userName || 'ユーザー'}</span>
      </div>
      <button onClick={() => { fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.href = '/login'); }}
        className="flex items-center gap-1 px-2 py-1 text-xs text-black hover:text-black hover:bg-slate-100 rounded transition">
        <LogOut size={13} /> <span className="hidden sm:inline">ログアウト</span>
      </button>
    </div>
  </div>
);

// ========================== Dashboard ==========================
const Dashboard = ({ parts, orders, prodOrders, setView }: {
  parts: Part[]; orders: Order[]; prodOrders: ProdOrder[]; setView: (v: string) => void;
}) => {
  const totalStock = parts.reduce((s, p) => s + p.stock * p.unitPrice, 0);
  const lowStockParts = parts.filter(p => {
    const eff = p.stock - p.allocated + (p.shortageReason ? 0 : p.onOrder);
    return eff < p.reorderPoint && !p.shortageReason;
  });
  const mfrShortage = parts.filter(p => p.shortageReason).length;
  const activeOrders = orders.filter(o => ['awaiting'].includes(o.status));
  const onOrderTotal = activeOrders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '在庫金額', value: yen(totalStock), sub: `${parts.length}品目`, icon: Package, color: 'from-blue-500 to-blue-600' },
          { label: '発注点割れ・在庫切れ', value: lowStockParts.length, sub: '要対応', icon: AlertTriangle, color: 'from-amber-500 to-amber-600' },
          { label: 'メーカー欠品', value: mfrShortage, sub: '代替品検討中', icon: AlertCircle, color: 'from-rose-500 to-rose-600' },
          { label: '発注残金額', value: yen(onOrderTotal), sub: `${activeOrders.length}件`, icon: Truck, color: 'from-violet-500 to-violet-600' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-3.5">
              <div className={`w-8 h-8 bg-gradient-to-br ${k.color} rounded-md flex items-center justify-center text-white mb-2`}><Icon size={15} /></div>
              <div className="text-[11px] text-black">{k.label}</div>
              <div className="text-xl font-bold text-black mt-0.5">{k.value}</div>
              <div className="text-[11px] text-black">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2"><Bell size={15} /> 対応が必要なアラート</h2>
            <button onClick={() => setView('orders')} className="text-xs text-blue-600 hover:underline">全て表示</button>
          </div>
          <div className="divide-y divide-slate-100">
            {parts.filter(p => p.shortageReason).map(p => (
              <div key={p.id} className="px-4 py-2.5 border-l-2 border-l-rose-500 flex items-start gap-3">
                <AlertCircle size={14} className="text-rose-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">メーカー欠品: {p.name}</div>
                  <div className="text-xs text-black">{p.shortageReason}</div>
                </div>
              </div>
            ))}
            {lowStockParts.slice(0, 3).map(p => (
              <div key={p.id} className="px-4 py-2.5 border-l-2 border-l-amber-500 flex items-start gap-3">
                <AlertCircle size={14} className="text-amber-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{p.stock === 0 ? '在庫切れ' : '発注点割れ'}: {p.name}</div>
                  <div className="text-xs text-black">在庫 {p.stock} / 発注点 {p.reorderPoint}</div>
                </div>
              </div>
            ))}
            {lowStockParts.length === 0 && parts.filter(p => p.shortageReason).length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-black">アラートはありません</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-bold text-sm flex items-center gap-2"><Factory size={15} /> 進行中の製造指図</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {prodOrders.filter(m => m.status !== 'completed').map(m => (
              <div key={m.id} onClick={() => setView('production')} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-black">{m.prodNo}</span>
                  <StatusBadge statusKey={m.status} statusMap={MO_STATUS} />
                </div>
                <div className="text-sm font-bold mt-0.5">{m.productName || m.productCode} x {m.qty}</div>
                <div className="text-xs text-black">納期: {m.dueDate} / {m.customer}</div>
              </div>
            ))}
            {prodOrders.filter(m => m.status !== 'completed').length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-black">進行中の指図はありません</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================== Parts Master ==========================
const AddPartDropdown = ({ onNewPart, onCsvImport }: { onNewPart: () => void; onCsvImport: () => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <Btn icon={Plus} onClick={() => setOpen(!open)}>新規登録 <ChevronDown size={12} /></Btn>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 w-48 py-1">
          <button onClick={() => { onNewPart(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-black"><Plus size={14} /> 個別登録</button>
          <button onClick={() => { onCsvImport(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-black"><FileText size={14} /> CSV一括登録</button>
        </div>
      )}
    </div>
  );
};

const MasterScreen = ({ parts, onRefresh, toast, openPart, locations }: { parts: Part[]; onRefresh: () => void; toast: (msg: string) => void; openPart?: (p: Part) => void; locations?: Location[] }) => {
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editing, setEditing] = useState<Part | null>(null);
  const [newPart, setNewPart] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<Part | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const getStatus = (p: Part) => {
    if (p.shortageReason) return 'manufacturer_shortage';
    const eff = p.stock - p.allocated + (p.shortageReason ? 0 : p.onOrder);
    if (p.stock === 0) return 'shortage';
    if (eff < p.reorderPoint) return 'low';
    if (p.stock > p.maxStock) return 'excess';
    return 'normal';
  };

  const filtered = useMemo(() => parts.filter(p => {
    if (query) {
      const q = query.toLowerCase();
      if (![p.id, p.code, p.name, p.makerCode, p.maker, p.location, p.category].some(v => (v || '').toLowerCase().includes(q))) return false;
    }
    if (filterStatus !== 'all' && getStatus(p) !== filterStatus) return false;
    return true;
  }), [query, filterStatus, parts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paged = useMemo(() => filtered.slice((safePage - 1) * pageSize, safePage * pageSize), [filtered, safePage, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [query, filterStatus, pageSize]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deletePart(deleteTarget.id);
      toast(`部品「${deleteTarget.name}」を削除しました`);
      setDeleteTarget(null);
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  const handleCsvDownload = () => {
    const header = ['品番','社内品番','品名','仕様','分類','メーカー','メーカー品番','在庫','引当','発注残','発注点','安全在庫','最大在庫','単位','単価','リードタイム','ロケーション'];
    const rows = parts.map(p => [p.id,p.code,p.name,p.spec||'',p.category||'',p.maker||'',p.makerCode||'',p.stock,p.allocated,p.onOrder,p.reorderPoint,p.safetyStock,p.maxStock,p.unit,p.unitPrice,p.leadTime,p.location||'']);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `parts_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('CSVをダウンロードしました');
  };

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      // Map frontend form fields to API fields
      const payload: any = {
        code: form.code,
        name: form.name,
        spec: form.spec,
        category: form.category,
        maker: form.maker,
        makerCode: form.makerCode,
        unit: form.unit,
        unitPrice: Number(form.unitPrice) || 0,
        leadTimeDays: Number(form.leadTime) || 14,
        reorderPoint: Number(form.reorderPoint) || 0,
        safetyStock: Number(form.safetyStock) || 0,
        maxStock: Number(form.maxStock) || 0,
        defaultLocId: form.defaultLocId || form.location || null,
        stock: form.stock !== undefined ? Number(form.stock) : (form.initialStock !== undefined ? Number(form.initialStock) : undefined),
      };
      if (form.supplierId) payload.supplierId = Number(form.supplierId);
      if (isNew) {
        await api.createPart(payload);
        toast(`部品マスタ「${form.name}」を登録しました`);
      } else {
        await api.updatePart(form.id, payload);
        toast(`部品マスタ「${form.name}」を更新しました`);
      }
      setEditing(null);
      setNewPart(null);
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  return (
    <div className="p-5">
      <div className="bg-white rounded-lg border border-slate-200 p-3.5 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="品番・品名・メーカー品番・棚位置で検索"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <Btn variant="secondary" icon={Download} onClick={handleCsvDownload}>CSVダウンロード</Btn>
          <AddPartDropdown onNewPart={() => setNewPart({ code: '', name: '', maker: '', makerCode: '', category: '電気部品', supplier: '', stock: 0, reorderPoint: 10, safetyStock: 5, maxStock: 50, unit: '個', unitPrice: 0, leadTime: 14, location: '', spec: '' })} onCsvImport={() => setShowCsvImport(true)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-black" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs px-2 py-1 border border-slate-300 rounded text-black">
            <option value="all">全ステータス</option>
            {Object.entries(STATUS_COLOR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className="ml-auto flex items-center gap-2 text-xs text-black">
            <span>表示件数</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="border border-slate-300 rounded px-1.5 py-1 text-xs text-black">
              <option value={20}>20件</option>
              <option value={50}>50件</option>
              <option value={100}>100件</option>
            </select>
            <span>全 <span className="font-semibold">{filtered.length}</span>件</span>
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-black uppercase border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium">品番</th>
                <th className="text-left px-3 py-2 font-medium">品名・仕様</th>
                <th className="text-left px-3 py-2 font-medium">メーカー</th>
                <th className="text-right px-3 py-2 font-medium">在庫</th>
                <th className="text-right px-3 py-2 font-medium">単価</th>
                <th className="text-right px-3 py-2 font-medium">発注点</th>
                <th className="text-left px-3 py-2 font-medium">状態</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(p => {
                const st = getStatus(p);
                const s = STATUS_COLOR[st];
                return (
                  <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openPart?.(p)}>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs">{p.id}</div>
                      <div className="font-mono text-[11px] text-black">{p.code}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-black">{p.spec}</div>
                    </td>
                    <td className="px-3 py-2 text-black">
                      <div>{p.maker}</div>
                      <div className="text-xs text-black font-mono">{p.makerCode}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <div className="font-semibold">{p.stock}</div>
                      <div className="text-[11px] text-black">引当:{p.allocated}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{yen(p.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-mono">{p.reorderPoint}</td>
                    <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${s.bg} ${s.text} border ${s.border}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>{s.label}</span></td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditing(p)}>編集</Btn>
                        <button onClick={() => setDeleteTarget(p)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-3 py-2.5 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 text-xs">
            <span className="text-black">{(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filtered.length)} / {filtered.length}件</span>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 border border-slate-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">前へ</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 border border-slate-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">次へ</button>
          </div>
        )}
      </div>

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="部品の削除確認" size="sm">
          <div className="text-sm mb-4">
            <p>以下の部品を削除しますか？</p>
            <div className="mt-2 bg-slate-50 rounded p-3">
              <div className="font-mono text-xs text-black">{deleteTarget.id}</div>
              <div className="font-semibold">{deleteTarget.name}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn variant="danger" icon={Trash2} onClick={handleDelete}>削除する</Btn>
            <Btn variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Btn>
          </div>
        </Modal>
      )}

      {(editing || newPart) && (
        <PartFormModal part={editing || newPart} isNew={!!newPart} onClose={() => { setEditing(null); setNewPart(null); }} onSave={handleSave} locations={locations || []} parts={parts} />
      )}

      {showCsvImport && (
        <CsvImportModal onClose={() => setShowCsvImport(false)} onRefresh={onRefresh} toast={toast} />
      )}
    </div>
  );
};

// ========================== CSV Import Modal ==========================
const CsvImportModal = ({ onClose, onRefresh, toast }: { onClose: () => void; onRefresh: () => void; toast: (msg: string) => void }) => {
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const CSV_HEADERS = ['社内品番','品名','仕様','分類','メーカー','メーカー品番','単位','標準単価','納品リードタイム','発注点','安全在庫','最大在庫'];

  const downloadTemplate = () => {
    const csv = CSV_HEADERS.join(',') + '\nSK-0001,ブレーカー20A,AC100V 20A,電気部品,三菱電機,NF63-CV,個,1500,14,10,5,50';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'parts_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast('データ行がありません'); return; }
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
        return {
          code: vals[headers.indexOf('社内品番')] || vals[0] || '',
          name: vals[headers.indexOf('品名')] || vals[1] || '',
          spec: vals[headers.indexOf('仕様')] || vals[2] || '',
          category: vals[headers.indexOf('分類')] || vals[3] || '',
          maker: vals[headers.indexOf('メーカー')] || vals[4] || '',
          makerCode: vals[headers.indexOf('メーカー品番')] || vals[5] || '',
          unit: vals[headers.indexOf('単位')] || vals[6] || '個',
          unitPrice: Number(vals[headers.indexOf('標準単価')] || vals[7]) || 0,
          leadTimeDays: Number(vals[headers.indexOf('納品リードタイム')] || vals[8]) || 14,
          reorderPoint: Number(vals[headers.indexOf('発注点')] || vals[9]) || 0,
          safetyStock: Number(vals[headers.indexOf('安全在庫')] || vals[10]) || 0,
          maxStock: Number(vals[headers.indexOf('最大在庫')] || vals[11]) || 0,
        };
      }).filter(r => r.code && r.name);
      setPreviewRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.importParts(previewRows);
      const imported = res.imported || 0;
      const skipped = res.skipped || 0;
      if (imported > 0) {
        toast(`${imported}件の部品を登録しました${skipped > 0 ? `（${skipped}件は重複のためスキップ）` : ''}`);
      } else {
        toast(`全て重複のため登録されませんでした（${skipped}件スキップ）`);
      }
      onRefresh();
      onClose();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="CSV一括登録" size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={downloadTemplate} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Download size={14} />雛形ダウンロード</button>
          <span className="text-xs text-black">CSVファイルを選択してアップロードしてください</span>
        </div>
        <input type="file" accept=".csv" onChange={handleFile} className="block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        {previewRows.length > 0 && (
          <>
            <div className="text-xs font-semibold text-black">{previewRows.length}件のデータをプレビュー中</div>
            <div className="max-h-60 overflow-auto border border-slate-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0"><tr><th className="px-2 py-1 text-left">品番</th><th className="px-2 py-1 text-left">品名</th><th className="px-2 py-1 text-left">メーカー</th><th className="px-2 py-1 text-right">単価</th><th className="px-2 py-1 text-right">発注点</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((r, i) => (
                    <tr key={i}><td className="px-2 py-1 font-mono">{r.code}</td><td className="px-2 py-1">{r.name}</td><td className="px-2 py-1">{r.maker}</td><td className="px-2 py-1 text-right font-mono">{yen(r.unitPrice)}</td><td className="px-2 py-1 text-right font-mono">{r.reorderPoint}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <Btn variant="primary" icon={Save} onClick={handleImport} disabled={previewRows.length === 0 || importing}>{importing ? '登録中...' : `${previewRows.length}件を登録`}</Btn>
          <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
        </div>
      </div>
    </Modal>
  );
};

const PartFormModal = ({ part, isNew, onClose, onSave, locations, parts }: { part: any; isNew: boolean; onClose: () => void; onSave: (form: any, isNew: boolean) => void; locations?: Location[]; parts?: Part[] }) => {
  const [form, setForm] = useState(() => ({ ...part }));
  const [ocrOpen, setOcrOpen] = useState(false);
  const [locSearch, setLocSearch] = useState('');
  const [locDropdownOpen, setLocDropdownOpen] = useState(false);
  const [makersList, setMakersList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const upd = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const num = (v: string) => Number(v) || 0;

  useEffect(() => {
    api.getMakers().then(res => setMakersList(res.data || [])).catch(() => {});
    api.getSuppliers().then(res => setSuppliersList(res.data || [])).catch(() => {});
  }, []);

  const filteredLocs = useMemo(() => {
    if (!locations) return [];
    if (!locSearch) return locations;
    const q = locSearch.toLowerCase();
    return locations.filter(l => l.id.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || l.warehouse.toLowerCase().includes(q));
  }, [locations, locSearch]);

  const handleOcrApply = (fields: Record<string, any>) => {
    setForm((prev: any) => {
      const base = (prev && Object.keys(prev).length > 0) ? prev : part;
      const merged = { ...base };
      Object.entries(fields).forEach(([k, v]) => {
        const cur = (base as any)[k];
        if (cur === undefined || cur === null || cur === '' || cur === 0) (merged as any)[k] = v;
      });
      return merged;
    });
    setOcrOpen(false);
  };

  return (
    <Modal open={!!part} onClose={onClose} title={isNew ? '部品マスタ 新規登録' : `部品マスタ編集: ${part.id}`} size="lg">
      <div className="flex items-center gap-2 mb-3 -mt-1">
        <button
          onClick={() => setOcrOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition"
        >
          <Camera size={13} /> OCR読み込み <Sparkles size={11} className="text-blue-500" />
        </button>
        <span className="text-[11px] text-black">カメラで現品ラベル/銘板を撮影 → 入力欄を自動入力</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="社内品番*"><input value={form.code || ''} onChange={e => upd('code', e.target.value)} className={inputClass} /></Field>
        <Field label="メーカー品番"><input value={form.makerCode || ''} onChange={e => upd('makerCode', e.target.value)} className={inputClass} /></Field>
        <Field label="品名*" full><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
        <Field label="仕様" full><input value={form.spec || ''} onChange={e => upd('spec', e.target.value)} className={inputClass} /></Field>
        <Field label="分類"><input value={form.category || ''} onChange={e => upd('category', e.target.value)} className={inputClass} /></Field>
        <Field label="メーカー">
          <select value={form.maker || ''} onChange={e => upd('maker', e.target.value)} className={inputClass}>
            <option value="">-- 選択 --</option>
            {makersList.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="仕入先">
          <select value={form.supplierId || ''} onChange={e => { const v = e.target.value; upd('supplierId', v ? Number(v) : null); const s = suppliersList.find((s: any) => s.id === Number(v)); if (s) upd('supplier', s.name); else upd('supplier', ''); }} className={inputClass}>
            <option value="">-- 選択 --</option>
            {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="単位"><input value={form.unit || ''} onChange={e => upd('unit', e.target.value)} className={inputClass} /></Field>
        <Field label="標準単価 (円)"><input type="number" value={form.unitPrice ?? 0} onChange={e => upd('unitPrice', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="納品リードタイム（日）"><input type="number" value={form.leadTime ?? 0} onChange={e => upd('leadTime', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="保管ロケーション">
          <div className="relative">
            <input value={locDropdownOpen ? locSearch : (form.location || form.defaultLocId || '')} onChange={e => { setLocSearch(e.target.value); setLocDropdownOpen(true); upd('defaultLocId', e.target.value); }} onFocus={() => { setLocDropdownOpen(true); setLocSearch(form.location || form.defaultLocId || ''); }} onBlur={() => setTimeout(() => setLocDropdownOpen(false), 200)} placeholder="ロケーションを検索..." className={`${inputClass} font-mono`} />
            {locDropdownOpen && filteredLocs.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto">
                {filteredLocs.slice(0, 20).map(l => (
                  <button key={l.id} type="button" onMouseDown={e => { e.preventDefault(); upd('defaultLocId', l.id); upd('location', l.id); setLocSearch(l.id); setLocDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2">
                    <span className="font-mono font-semibold">{l.id}</span>
                    <span className="text-black">{l.name} ({l.warehouse})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        <Field label="在庫数"><input type="number" value={isNew ? (form.initialStock ?? 0) : (form.stock ?? 0)} onChange={e => upd(isNew ? 'initialStock' : 'stock', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="発注点*"><input type="number" value={form.reorderPoint ?? 0} onChange={e => upd('reorderPoint', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="安全在庫"><input type="number" value={form.safetyStock ?? 0} onChange={e => upd('safetyStock', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="最大在庫"><input type="number" value={form.maxStock ?? 0} onChange={e => upd('maxStock', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
      </div>
      <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.code || !form.name}>{isNew ? '登録' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
      <PartOcrModal open={ocrOpen} onClose={() => setOcrOpen(false)} onApply={handleOcrApply} />
    </Modal>
  );
};

// ========================== Orders ==========================
const OrdersScreen = ({ parts, orders, onRefresh, toast, userName, userId }: {
  parts: Part[]; orders: Order[]; onRefresh: () => void; toast: (msg: string) => void; userName?: string; userId?: number;
}) => {
  const [replacementModal, setReplacementModal] = useState<{ orderId: number; detailId: number; partId: string; partName: string } | null>(null);
  const [replacementPartId, setReplacementPartId] = useState('');
  const [replacementSearch, setReplacementSearch] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  const hasChanges = () => {
    if (!showDetail) return false;
    return editStatus !== showDetail.status || editExpDate !== (showDetail.expectedDeliveryDate || '') || Object.keys(pendingDetailChanges).length > 0;
  };

  const handleClose = () => {
    if (hasChanges()) { setConfirmClose(true); } else { setShowDetail(null); }
  };
  const [tab, setTab] = useState('all');
  const [showNew, setShowNew] = useState<false | 'manual' | 'bulk'>(false);
  const [showDetail, setShowDetail] = useState<Order | null>(null);
  const [pdfOrder, setPdfOrder] = useState<Order | null>(null);
  const [pdfQueue, setPdfQueue] = useState<Order[]>([]);
  const [editStatus, setEditStatus] = useState('');
  const [editExpDate, setEditExpDate] = useState('');
  const [editComment, setEditComment] = useState('');
  const [commentHistory, setCommentHistory] = useState<{ text: string; ts: string; user?: string }[]>([]);

  const openDetail = (o: Order) => {
    setShowDetail(o);
    setEditStatus(o.status);
    setEditExpDate(o.expectedDeliveryDate || '');
    setEditComment('');
    setCommentHistory(o.comments || []);
    setPendingDetailChanges({});
  };

  const lowStockParts = useMemo(() => parts.filter(p => {
    const eff = p.stock - p.allocated + (p.shortageReason ? 0 : p.onOrder);
    return eff < p.reorderPoint;
  }), [parts]);

  const filtered = useMemo(() => {
    if (tab === 'all') return orders;
    return orders.filter(o => o.status === tab);
  }, [tab, orders]);

  const handleApprove = async (orderId: number) => {
    try {
      await api.approveOrder(orderId);
      toast('発注を承認しました');
      setShowDetail(null);
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  const handleMfrShortage = async (orderId: number) => {
    try {
      await api.markManufacturerShortage(orderId);
      toast('メーカー欠品としてマークしました。発注残から除外されました');
      setShowDetail(null);
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  // Pending detail changes (local only until save)
  const [pendingDetailChanges, setPendingDetailChanges] = useState<Record<number, { action: 'shortage' | 'cancel' | 'replacement'; replacementPartId?: string; replacementPartName?: string }>>({});

  const handleItemShortage = (_orderId: number, detailId: number) => {
    setPendingDetailChanges(prev => ({ ...prev, [detailId]: { action: 'shortage' } }));
    setShowDetail((prev: any) => prev ? {
      ...prev,
      details: prev.details.map((d: any) => d.id === detailId ? { ...d, remarks: 'manufacturer_shortage' } : d),
    } : prev);
  };

  const handleItemShortageCancel = (_orderId: number, detailId: number) => {
    setPendingDetailChanges(prev => ({ ...prev, [detailId]: { action: 'cancel' } }));
    setShowDetail((prev: any) => prev ? {
      ...prev,
      details: prev.details.map((d: any) => d.id === detailId ? { ...d, remarks: null } : d),
    } : prev);
  };

  const handleSaveDetail = async () => {
    if (!showDetail) return;
    try {
      // 1. Save order-level changes
      const data: any = {};
      data.status = editStatus;
      if (editExpDate) data.expectedDeliveryDate = editExpDate;
      await api.updateOrder(showDetail.id, data);

      // 2. Save pending detail changes (shortage/cancel/replacement)
      for (const [detailIdStr, change] of Object.entries(pendingDetailChanges)) {
        const detailId = Number(detailIdStr);
        if (change.action === 'shortage') {
          await api.markItemShortage(showDetail.id, detailId);
        } else if (change.action === 'cancel') {
          await api.cancelItemShortage(showDetail.id, detailId);
        } else if (change.action === 'replacement' && change.replacementPartId) {
          await api.updatePart(showDetail.details.find((d: any) => d.id === detailId)?.partId || '', {
            replacementId: change.replacementPartId, isDiscontinued: true,
            shortageReason: `廃盤 → 代替品: ${change.replacementPartName || change.replacementPartId}`,
          });
          await api.updateOrder(showDetail.id, {
            detailUpdate: { detailId, remarks: `replacement:${change.replacementPartId}:${change.replacementPartName || ''}` },
          });
        }
      }

      toast('発注情報を保存しました');
      setPendingDetailChanges({});
      setShowDetail(null);
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  const handleViewPdf = (o: Order) => {
    setPdfOrder(o);
    setShowDetail(null);
  };

  return (
    <div className="p-5 space-y-3">
      {lowStockParts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={15} className="text-amber-600" />
            <h2 className="font-bold text-sm">発注点アラート</h2>
            <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">{lowStockParts.length}件</span>
            <Btn className="ml-auto" size="sm" variant="primary" onClick={() => setShowNew('bulk')}>一括発注書作成</Btn>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockParts.slice(0, 6).map(p => {
              const eff = p.stock - p.allocated + (p.shortageReason ? 0 : p.onOrder);
              const recommend = Math.max(p.maxStock - eff, 0);
              return (
                <div key={p.id} className="bg-white rounded p-2 text-xs flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-black">在庫{p.stock} / 発注点{p.reorderPoint} → 推奨<span className="font-bold text-amber-700">{recommend}{p.unit}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex border-b border-slate-200 px-2">
          {[
            { id: 'all', label: '全て', n: orders.length },
            { id: 'draft', label: '未発注', n: orders.filter(o => o.status === 'draft').length },
            { id: 'awaiting', label: '納品待ち', n: orders.filter(o => o.status === 'awaiting').length },
            { id: 'manufacturer_shortage', label: 'メーカー欠品', n: orders.filter(o => o.status === 'manufacturer_shortage').length },
            { id: 'completed', label: '完納', n: orders.filter(o => o.status === 'completed').length },
            { id: 'cancelled', label: 'キャンセル', n: orders.filter(o => o.status === 'cancelled').length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2.5 text-sm font-medium border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-black hover:text-black'}`}>
              {t.label} <span className="ml-1 text-xs text-black">{t.n}</span>
            </button>
          ))}
          <Btn className="ml-auto my-1.5 self-center" size="sm" icon={Plus} onClick={() => setShowNew('manual')}>新規発注</Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-black uppercase">
              <tr>
                <th className="text-left px-3 py-2 font-medium">発注番号</th>
                <th className="text-left px-3 py-2 font-medium">仕入先</th>
                <th className="text-left px-3 py-2 font-medium">発注日</th>
                <th className="text-left px-3 py-2 font-medium">希望納期</th>
                <th className="text-right px-3 py-2 font-medium">金額</th>
                <th className="text-left px-3 py-2 font-medium">ステータス</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(o => (
                <tr key={o.id} className={`hover:bg-slate-50 ${o.status === 'delayed' ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-3 py-2 font-mono text-xs">{o.orderNo}</td>
                  <td className="px-3 py-2">{o.supplier}</td>
                  <td className="px-3 py-2 text-xs">{o.orderDate}</td>
                  <td className="px-3 py-2 text-xs">{o.desiredDate}</td>
                  <td className="px-3 py-2 text-right font-mono">{yen(o.totalAmount)}</td>
                  <td className="px-3 py-2"><StatusBadge statusKey={o.status} statusMap={ORDER_STATUS} /></td>
                  <td className="px-3 py-2"><Btn variant="ghost" size="sm" onClick={() => openDetail(o)}>詳細</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && (
        <Modal open onClose={handleClose} title={`発注詳細: ${showDetail.orderNo}`} size="xl">
          <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
            <div><div className="text-xs text-black">仕入先</div><div className="font-semibold">{showDetail.supplier}</div></div>
            <div><div className="text-xs text-black">発注日</div><div>{showDetail.orderDate}</div></div>
            <div><div className="text-xs text-black">希望納期</div><div>{showDetail.desiredDate}</div></div>
            <div>
              <div className="text-xs text-black">ステータス</div>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="mt-0.5 text-xs border border-slate-300 rounded px-1.5 py-1 w-full">
                {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-black">納品予定日</div>
              <input type="date" value={editExpDate} onChange={e => setEditExpDate(e.target.value)} className="mt-0.5 text-xs border border-slate-300 rounded px-1.5 py-1 w-full" />
            </div>
            <div><div className="text-xs text-black">明細数</div><div className="font-mono">{showDetail.details?.length || 0}</div></div>
            <div><div className="text-xs text-black">入庫済合計</div><div className="font-mono">{(showDetail.details || []).reduce((s, i) => s + i.receivedQty, 0).toLocaleString()} <span className="text-black text-xs">/ {(showDetail.details || []).reduce((s, i) => s + i.qty, 0).toLocaleString()}</span></div></div>
            <div><div className="text-xs text-black">合計金額</div><div className="font-mono font-bold">{yen(showDetail.totalAmount)}</div></div>
          </div>
          <div className="bg-slate-50 rounded p-3 mb-4">
            <div className="text-xs font-semibold text-black mb-2">明細</div>
            <table className="w-full text-sm">
              <thead className="text-xs text-black">
                <tr>
                  <th className="text-left py-2 px-3">品名</th>
                  <th className="text-right py-2 px-3 w-20">発注数</th>
                  <th className="text-right py-2 px-3 w-20">入庫済</th>
                  <th className="text-right py-2 px-3 w-16">残</th>
                  <th className="text-right py-2 px-3 w-24">単価</th>
                  <th className="text-right py-2 px-3 w-28">小計</th>
                  <th className="py-2 px-3 w-40 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {showDetail.details?.map((it, i) => (
                  <tr key={i} className={`border-t border-slate-200 ${it.remarks === 'manufacturer_shortage' || it.remarks?.startsWith('replacement:') ? 'bg-rose-50' : ''}`}>
                    <td className="py-2 px-3">
                      <div className="text-xs font-mono text-black">{it.partId}</div>
                      <div>{it.partName || it.partId}</div>
                      {it.remarks === 'manufacturer_shortage' && <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded font-semibold">欠品</span>}
                      {it.remarks?.startsWith('replacement:') && (() => {
                        const repName = it.remarks.split(':')[2] || it.remarks.split(':')[1];
                        return <div className="mt-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs"><span className="text-blue-700 font-semibold">代替品決定:</span> <span className="font-bold">{repName}</span></div>;
                      })()}
                    </td>
                    <td className="text-right py-2 px-3 font-mono">{it.qty}</td>
                    <td className="text-right py-2 px-3 font-mono text-black">{it.receivedQty}</td>
                    <td className="text-right py-2 px-3 font-mono font-semibold">{it.qty - it.receivedQty}</td>
                    <td className="text-right py-2 px-3 font-mono">{yen(it.unitPrice)}</td>
                    <td className="text-right py-2 px-3 font-mono font-semibold">{yen(it.qty * it.unitPrice)}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1.5 justify-center whitespace-nowrap">
                        {it.id && it.remarks === 'manufacturer_shortage' ? (<>
                          <button onClick={() => handleItemShortageCancel(showDetail.id, it.id!)} className="text-[11px] px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 whitespace-nowrap">欠品取消</button>
                          <button onClick={() => setReplacementModal({ orderId: showDetail.id, detailId: it.id!, partId: it.partId, partName: it.partName || it.partId })} className="text-[11px] px-2.5 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap">代替品登録</button>
                        </>) : it.id && it.qty - it.receivedQty > 0 ? (
                          <button onClick={() => handleItemShortage(showDetail.id, it.id!)} className="text-[11px] px-2.5 py-1 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 whitespace-nowrap">欠品登録</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mb-4">
            <Field label="コメント" full>
              <div className="flex gap-2">
                <textarea value={editComment} onChange={e => setEditComment(e.target.value)} placeholder="コメントを入力..." className={`${inputClass} h-12 flex-1`} />
                <Btn variant="primary" icon={Send} disabled={!editComment.trim()} onClick={async () => {
                  if (!editComment.trim() || !showDetail) return;
                  const newComment = { text: editComment.trim(), ts: new Date().toISOString(), user: userName || '', userId: userId || 1 };
                  try {
                    await api.updateOrder(showDetail.id, { newComment });
                    setCommentHistory(prev => [newComment, ...prev]);
                    setEditComment('');
                    toast('コメントを投稿しました');
                    onRefresh();
                  } catch (e: any) { toast(`エラー: ${e.message}`); }
                }}>投稿</Btn>
              </div>
            </Field>
          </div>
          {commentHistory.length > 0 && (
            <div className="mb-4 bg-slate-50 rounded p-3">
              <div className="text-xs font-semibold text-black mb-2">コメント履歴</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {commentHistory.map((c, i) => (
                  <div key={i} className="text-xs border-l-2 border-blue-300 pl-2 flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-black">{c.user || ''} - {new Date(c.ts).toLocaleString('ja-JP')}</div>
                      <div className="text-black">{c.text}</div>
                    </div>
                    <button onClick={async () => {
                      const updated = commentHistory.filter((_, j) => j !== i);
                      try {
                        await api.updateOrder(showDetail!.id, { replaceComments: updated });
                        setCommentHistory(updated);
                        toast('コメントを削除しました');
                        onRefresh();
                      } catch (e: any) { toast(`エラー: ${e.message}`); }
                    }} className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 flex-shrink-0 mt-0.5" title="削除"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <Btn variant="primary" icon={Save} onClick={handleSaveDetail}>変更を保存</Btn>
            {showDetail.status === 'draft' && (
              <Btn variant="success" icon={CheckCircle2} onClick={() => handleApprove(showDetail.id)}>発注確定（納品待ちへ）</Btn>
            )}
            {(showDetail.status === 'draft' || showDetail.status === 'awaiting') && (
              <Btn variant="danger" onClick={async () => {
                try {
                  await api.updateOrder(showDetail.id, { status: 'cancelled' });
                  toast('発注をキャンセルしました');
                  setShowDetail(null);
                  onRefresh();
                } catch (e: any) { toast(`エラー: ${e.message}`); }
              }}>キャンセル</Btn>
            )}
            <Btn variant="secondary" icon={FileText} onClick={() => handleViewPdf(showDetail)}>発注書PDF</Btn>
            <Btn variant="secondary" onClick={handleClose} className="ml-auto">閉じる</Btn>
          </div>
        </Modal>
      )}

      {showNew && (
        <NewOrderModal parts={parts} onClose={() => setShowNew(false)} onRefresh={onRefresh} toast={toast} onShowPdf={(o) => setPdfOrder(o)} onShowPdfMulti={(orders) => { if (orders.length > 0) { setPdfOrder(orders[0]); setPdfQueue(orders.slice(1)); } }} bulk={showNew === 'bulk'} />
      )}

      {pdfOrder && <OrderPdfModal order={pdfOrder} parts={parts} onClose={() => {
        if (pdfQueue.length > 0) { setPdfOrder(pdfQueue[0]); setPdfQueue(pdfQueue.slice(1)); }
        else setPdfOrder(null);
      }} />}

      {confirmClose && (
        <Modal open onClose={() => setConfirmClose(false)} title="変更の破棄" size="sm">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">変更が保存されていません</p>
              <p className="text-amber-700 mt-1">変更内容を破棄して閉じますか？</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Btn variant="secondary" onClick={() => setConfirmClose(false)}>戻る</Btn>
            <Btn variant="danger" onClick={() => { setConfirmClose(false); setShowDetail(null); }}>破棄して閉じる</Btn>
          </div>
        </Modal>
      )}

      {replacementModal && (
        <Modal open onClose={() => { setReplacementModal(null); setReplacementPartId(''); setReplacementSearch(''); }} title={`代替品を設定: ${replacementModal.partName}`} size="md">
          <div className="space-y-3 text-sm">
            <div className="bg-rose-50 border border-rose-200 rounded p-3">
              <div className="text-xs text-rose-700 font-bold">欠品中の部品</div>
              <div className="font-mono text-xs mt-1">{replacementModal.partId}</div>
              <div className="font-bold">{replacementModal.partName}</div>
            </div>
            <Field label="代替品を検索（入力で絞り込み）">
              <input value={replacementSearch} onChange={e => setReplacementSearch(e.target.value)} placeholder="品番・品名・メーカーで検索..." className={inputClass} />
            </Field>
            <div className="border border-slate-200 rounded max-h-60 overflow-y-auto">
              {parts.filter(p => {
                if (p.id === replacementModal.partId) return false;
                if (!replacementSearch) return true;
                const q = replacementSearch.toLowerCase();
                return p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.maker || '').toLowerCase().includes(q);
              }).slice(0, 30).map(p => (
                <button key={p.id} onClick={() => { setReplacementPartId(p.id); setReplacementSearch(p.name); }}
                  className={`w-full text-left px-3 py-2.5 text-xs hover:bg-blue-50 border-b border-slate-100 flex items-center gap-3 ${replacementPartId === p.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div><span className="font-mono text-black">{p.id}</span> <span className="font-bold">{p.name}</span></div>
                    <div className="text-black">{p.maker || '-'} / {p.code}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold">{p.stock}<span className="font-normal text-black"> {p.unit}</span></div>
                    <div className="text-black">{yen(p.unitPrice)}</div>
                  </div>
                </button>
              ))}
              {parts.filter(p => p.id !== replacementModal.partId).length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-black">部品が登録されていません</div>
              )}
            </div>
            {replacementPartId && (() => {
              const rp = parts.find(p => p.id === replacementPartId);
              return (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="text-xs text-blue-700 font-bold">代替品として設定</div>
                  <div className="font-mono text-xs mt-1">{replacementPartId}</div>
                  <div className="font-bold">{rp?.name}</div>
                  <div className="text-xs text-black mt-1">在庫: {rp?.stock} {rp?.unit} / 単価: {yen(rp?.unitPrice || 0)}</div>
                </div>
              );
            })()}
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" icon={Save} disabled={!replacementPartId} onClick={() => {
                const repPart = parts.find(p => p.id === replacementPartId);
                // Store as pending change (saved on "変更を保存")
                setPendingDetailChanges(prev => ({
                  ...prev,
                  [replacementModal.detailId]: { action: 'replacement', replacementPartId, replacementPartName: repPart?.name || replacementPartId },
                }));
                // Update UI immediately
                setShowDetail((prev: any) => prev ? {
                  ...prev,
                  details: prev.details.map((d: any) => d.id === replacementModal.detailId ? { ...d, remarks: `replacement:${replacementPartId}:${repPart?.name || ''}` } : d),
                } : prev);
                setReplacementModal(null); setReplacementPartId(''); setReplacementSearch('');
              }}>代替品を設定</Btn>
              <Btn variant="secondary" onClick={() => { setReplacementModal(null); setReplacementPartId(''); setReplacementSearch(''); }}>キャンセル</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const NewOrderModal = ({ parts, onClose, onRefresh, toast, onShowPdf, onShowPdfMulti, bulk }: {
  parts: Part[]; onClose: () => void; onRefresh: () => void; toast: (msg: string) => void; onShowPdf?: (order: Order) => void; onShowPdfMulti?: (orders: Order[]) => void; bulk?: boolean;
}) => {
  const lowStockParts = parts.filter(p => {
    const eff = p.stock - p.allocated + (p.shortageReason ? 0 : p.onOrder);
    return eff < p.reorderPoint && !p.shortageReason;
  });

  const [items, setItems] = useState(() => {
    if (bulk) {
      return lowStockParts.map(p => ({
        partId: p.id, name: p.name, qty: Math.max(p.maxStock - (p.stock - p.allocated + p.onOrder), p.reorderPoint), unitPrice: p.unitPrice, supplierId: p.supplierId, supplier: p.supplier
      }));
    }
    return [];
  });

  const supplierOptions = useMemo(() => {
    const named = [...new Set(parts.map(p => p.supplier).filter(Boolean))];
    const hasUnset = items.some(it => !it.supplier);
    return hasUnset ? [...named, '（未設定）'] : named;
  }, [parts, items]);
  const [supplier, setSupplier] = useState(bulk && lowStockParts[0]?.supplier ? lowStockParts[0].supplier : supplierOptions[0] || '');
  const [searchQ, setSearchQ] = useState('');

  const filteredItems = items.filter(it => {
    if (!supplier) return true;
    if (supplier === '（未設定）') return !it.supplier;
    return it.supplier === supplier;
  });
  const total = filteredItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const addPart = (p: Part) => {
    if (items.find(i => i.partId === p.id)) return;
    setItems(prev => [...prev, { partId: p.id, name: p.name, qty: 10, unitPrice: p.unitPrice, supplierId: p.supplierId, supplier: p.supplier }]);
    setSearchQ('');
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supplierParts = useMemo(() => parts.filter(p => p.supplier === supplier), [parts, supplier]);
  const searchResults = useMemo(() => {
    const available = supplierParts.filter(p => !items.find(i => i.partId === p.id));
    if (!searchQ) return available.slice(0, 10);
    const q = searchQ.toLowerCase();
    return available.filter(p =>
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [supplierParts, items, searchQ]);

  const submit = async () => {
    if (bulk) {
      // Bulk mode: create separate orders per supplier
      const bySupplier: Record<string, typeof items> = {};
      items.filter(it => it.qty > 0).forEach(it => {
        const key = it.supplier || '（未設定）';
        if (!bySupplier[key]) bySupplier[key] = [];
        bySupplier[key].push(it);
      });
      const supplierGroups = Object.entries(bySupplier);
      if (supplierGroups.length === 0) { toast('発注する部品がありません'); return; }
      try {
        const createdOrders: Order[] = [];
        for (const [suppName, groupItems] of supplierGroups) {
          const res = await api.createOrder({
            supplierId: groupItems[0]?.supplierId || 1,
            desiredDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
            details: groupItems.map(i => ({ partId: i.partId, qty: i.qty, unitPrice: i.unitPrice })),
          });
          createdOrders.push({
            id: res.id, orderNo: res.orderNo || '', supplier: suppName,
            supplierId: groupItems[0]?.supplierId || 1,
            orderDate: new Date().toISOString().slice(0, 10),
            desiredDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
            status: 'draft', totalAmount: groupItems.reduce((s, i) => s + i.qty * i.unitPrice, 0),
            details: groupItems.map(i => ({ partId: i.partId, partName: i.name, qty: i.qty, receivedQty: 0, unitPrice: i.unitPrice })),
          });
        }
        toast(`${createdOrders.length}件の発注書を仕入先別に作成しました`);
        onRefresh();
        onClose();
        if (onShowPdfMulti && createdOrders.length > 0) {
          onShowPdfMulti(createdOrders);
        } else if (onShowPdf && createdOrders.length > 0) {
          onShowPdf(createdOrders[0]);
        }
      } catch (e: any) { toast(`エラー: ${e.message}`); }
    } else {
      // Manual mode: create single order for selected supplier
      if (filteredItems.length === 0) return;
      try {
        const res = await api.createOrder({
          supplierId: filteredItems[0]?.supplierId || 1,
          desiredDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          details: filteredItems.map(i => ({ partId: i.partId, qty: i.qty, unitPrice: i.unitPrice })),
        });
        toast('発注書を作成しました');
        onRefresh();
        onClose();
        if (onShowPdf && res) {
          onShowPdf({
            id: res.id, orderNo: res.orderNo || '', supplier: supplier,
            supplierId: filteredItems[0]?.supplierId || 1,
            orderDate: new Date().toISOString().slice(0, 10),
            desiredDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
            status: 'draft', totalAmount: total,
            details: filteredItems.map(i => ({ partId: i.partId, partName: i.name, qty: i.qty, receivedQty: 0, unitPrice: i.unitPrice })),
          });
        }
      } catch (e: any) { toast(`エラー: ${e.message}`); }
    }
  };

  return (
    <Modal open onClose={onClose} title={bulk ? "一括発注書作成（仕入先別）" : "新規発注書作成"} size="xl">
      {!bulk && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Field label="仕入先">
            <select value={supplier} onChange={e => setSupplier(e.target.value)} className={inputClass}>
              {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="発注日"><input value={new Date().toISOString().slice(0, 10)} disabled className={inputClass} /></Field>
          <Field label="想定納期"><input value={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)} disabled className={inputClass} /></Field>
        </div>
      )}

      {bulk ? (
        <div className="space-y-4 mb-3">
          {(() => {
            const bySupp: Record<string, typeof items> = {};
            items.forEach(it => { const k = it.supplier || '（未設定）'; if (!bySupp[k]) bySupp[k] = []; bySupp[k].push(it); });
            return Object.entries(bySupp).map(([suppName, suppItems]) => (
              <div key={suppName} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-blue-600" />
                    <span className="font-bold text-sm">{suppName}</span>
                    <span className="text-xs text-black">{suppItems.length}部品</span>
                  </div>
                  <span className="font-mono font-bold">{yen(suppItems.reduce((s, i) => s + i.qty * i.unitPrice, 0))}</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-xs text-black"><tr><th className="text-left py-1 px-3">品名</th><th className="text-right py-1 px-3 w-20">数量</th><th className="text-right py-1 px-3 w-24">単価</th><th className="text-right py-1 px-3 w-28">小計</th><th className="w-8"></th></tr></thead>
                  <tbody>
                    {suppItems.map(it => (
                      <tr key={it.partId} className="border-t border-slate-100">
                        <td className="py-1.5 px-3"><div className="text-xs font-mono text-black">{it.partId}</div><div>{it.name}</div></td>
                        <td className="py-1.5 px-3"><input type="number" value={it.qty} onChange={e => setItems(prev => prev.map(i => i.partId === it.partId ? { ...i, qty: Number(e.target.value) || 0 } : i))} className="w-full text-right border border-slate-300 rounded px-2 py-1" /></td>
                        <td className="py-1.5 px-3 text-right font-mono">{yen(it.unitPrice)}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold">{yen(it.qty * it.unitPrice)}</td>
                        <td><button onClick={() => setItems(prev => prev.filter(i => i.partId !== it.partId))} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ));
          })()}
        </div>
      ) : (
      <div className="bg-slate-50 rounded p-3 mb-3">
        <div className="text-xs font-semibold text-black mb-2">発注明細 ({filteredItems.length} 件 / {supplier})</div>
        {filteredItems.length === 0 ? (
          <div className="text-xs text-black py-3 text-center">この仕入先の明細はまだありません。下から部品を追加してください。</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-black"><tr><th className="text-left py-1">品名</th><th className="text-right py-1 w-20">数量</th><th className="text-right py-1 w-24">単価</th><th className="text-right py-1 w-28">小計</th><th className="w-8"></th></tr></thead>
            <tbody>
              {filteredItems.map(it => (
                <tr key={it.partId} className="border-t border-slate-200">
                  <td className="py-1.5"><div className="text-xs font-mono text-black">{it.partId}</div><div>{it.name}</div></td>
                  <td className="py-1.5"><input type="number" value={it.qty} onChange={e => setItems(prev => prev.map(i => i.partId === it.partId ? { ...i, qty: Number(e.target.value) || 0 } : i))} className={`${inputClass} text-right`} /></td>
                  <td className="py-1.5 text-right font-mono">{yen(it.unitPrice)}</td>
                  <td className="py-1.5 text-right font-mono font-semibold">{yen(it.qty * it.unitPrice)}</td>
                  <td><button onClick={() => setItems(prev => prev.filter(i => i.partId !== it.partId))} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-slate-300"><td colSpan={3} className="text-right py-2 font-semibold">合計</td><td className="text-right py-2 font-mono font-bold">{yen(total)}</td><td></td></tr></tfoot>
          </table>
        )}
      </div>
      )}

      {!bulk && <div className="mb-3 relative">
        <div className="text-xs font-semibold text-black mb-1">部品を追加 ({supplier})</div>
        <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setDropdownOpen(true); }} onFocus={() => setDropdownOpen(true)} placeholder="品番・品名で検索 (クリックで一覧表示)..." className={inputClass} />
        {dropdownOpen && searchResults.length > 0 && (
          <div className="absolute z-10 left-0 right-0 border border-slate-200 rounded mt-1 bg-white max-h-52 overflow-y-auto shadow-lg">
            {searchResults.map(p => (
              <button key={p.id} onClick={() => { addPart(p); setDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between border-b border-slate-50">
                <div className="flex-1 min-w-0"><span className="font-mono text-xs text-black">{p.code || p.id}</span> <span className="font-semibold">{p.name}</span></div>
                <span className="text-xs font-mono text-black mr-2">{yen(p.unitPrice)}</span>
                <Plus size={13} className="text-blue-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>}

      {bulk && items.length > 0 && (() => {
        const bySupp: Record<string, typeof items> = {};
        items.forEach(it => { const k = it.supplier || '（未設定）'; if (!bySupp[k]) bySupp[k] = []; bySupp[k].push(it); });
        return (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 mb-3">
            <div className="font-semibold mb-1">仕入先別に{Object.keys(bySupp).length}件の発注書を作成します:</div>
            {Object.entries(bySupp).map(([s, its]) => (
              <div key={s} className="ml-2">• {s}: {its.length}部品 / {yen(its.reduce((sum, i) => sum + i.qty * i.unitPrice, 0))}</div>
            ))}
          </div>
        );
      })()}
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Btn variant="primary" icon={ShoppingCart} onClick={submit} disabled={bulk ? items.length === 0 : filteredItems.length === 0}>
          {bulk ? `仕入先別に一括発注（${(() => { const s = new Set(items.map(i => i.supplier || '（未設定）')); return s.size; })()}件）` : '発注書作成'}
        </Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </Modal>
  );
};

// ========================== Order PDF Modal ==========================
const OrderPdfModal = ({ order, parts, onClose }: {
  order: Order; parts: Part[]; onClose: () => void;
}) => {
  const totalAmount = (order.details || []).reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const orderDate = order.orderDate || new Date().toISOString().slice(0, 10);
  const [y, m, d] = orderDate.split('-');
  const dateFormatted = `${y}年　${parseInt(m)}月${parseInt(d)}日`;
  const dateShort = `'${y.slice(2)}.${m}.${d}`;
  const desiredDate = order.desiredDate?.replace(/-/g, '/') || '';
  const EMPTY_ROWS = Math.max(0, 18 - (order.details || []).length);

  const handlePrint = () => {
    const printNode = document.getElementById('po-printable');
    if (!printNode) return;
    const win = window.open('', '_blank', 'width=800,height=1130');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>注文書 ${order.orderNo}</title>
      <meta charset="utf-8"/>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        body { margin: 0; padding: 0; font-family: "Yu Gothic", "Meiryo", "Hiragino Sans", sans-serif; font-size: 11px; color: #000; }
        table { border-collapse: collapse; width: 100%; }
        td, th { vertical-align: top; }
        img { max-height: 22px; }
      </style></head><body>${printNode.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  const S = { fontSize: '10px', color: '#000', fontFamily: '"Yu Gothic","Meiryo",sans-serif' } as const;
  const cellB = { border: '1px solid #000', padding: '2px 5px' } as const;

  return (
    <Modal open onClose={onClose} title={`注文書プレビュー: ${order.orderNo}`} size="xl">
      <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3 text-xs text-amber-900 flex items-center gap-2">
        <FileText size={13} /> 正式注文書を再現。印刷またはPDFとして保存できます。
      </div>

      <div id="po-printable" style={{ ...S, width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '12mm 15mm', background: '#fff', boxSizing: 'border-box', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
        {/* Row 1: コードNO + 注文書 + 注文No+金額 */}
        <table style={{ width: '100%', marginBottom: '4px' }}>
          <tbody>
            <tr>
              <td style={{ width: '25%', fontSize: '9px' }}>コードＮＯ.<br/><span style={{ borderBottom: '1px solid #000', paddingBottom: '1px', fontFamily: 'monospace', fontSize: '11px' }}>{order.orderNo}</span></td>
              <td style={{ width: '40%', textAlign: 'center', fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5em' }}>注　文　書</td>
              <td style={{ width: '35%', textAlign: 'right' }}>
                <span style={{ fontSize: '10px' }}>注文No.</span>
                <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px', fontFamily: 'monospace', fontSize: '12px', marginLeft: '4px' }}>{totalAmount.toLocaleString()}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Row 2: 日付 + 納期 */}
        <table style={{ width: '100%', marginBottom: '2px' }}>
          <tbody>
            <tr>
              <td style={{ width: '15%' }}></td>
              <td style={{ width: '40%', textAlign: 'center', borderBottom: '1px solid #000', fontSize: '11px' }}>{dateFormatted}</td>
              <td style={{ width: '10%', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>納期:</td>
              <td style={{ width: '35%', borderBottom: '1px solid #000', fontSize: '11px', paddingLeft: '4px' }}>{desiredDate}</td>
            </tr>
          </tbody>
        </table>

        {/* Row 3: ロゴ + 会社情報 */}
        <div style={{ textAlign: 'right', marginTop: '4px', marginBottom: '2px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <img src="/sanko-logo.png" alt="SANKO" style={{ height: '18px' }} />
            <img src="/sanko-text-logo.png" alt="三工電機株式会社" style={{ height: '20px' }} />
          </div>
          <div style={{ fontSize: '9px', lineHeight: '1.4' }}>
            広島県呉市苗代町126番地の30<br/>
            〒737-0921 TEL(0823)30-3502<br/>
            <span style={{ marginLeft: '60px' }}>FAX(0823)33-3501</span>
          </div>
        </div>

        {/* Row 4: 仕入先 + 部門・担当 */}
        <table style={{ width: '100%', marginBottom: '6px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%' }}>
                <div style={{ fontSize: '14px', borderBottom: '1px solid #000', display: 'inline-block', paddingBottom: '1px', paddingRight: '20px' }}>
                  {order.supplier || '　　　　　　　'}　御中
                </div>
              </td>
              <td style={{ width: '50%', textAlign: 'right', fontSize: '10px' }}>
                <div>部門: 生管調達課<span style={{ marginLeft: '16px', border: '1px solid #000', padding: '0 4px', fontSize: '9px' }}>{dateShort}</span></div>
                <div>担当:　　　　　　三工電機(株)</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 明細テーブル */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ ...cellB, width: '44%', textAlign: 'center' }}>品　番　・　品　名</th>
              <th style={{ ...cellB, width: '8%', textAlign: 'center' }}>数　量</th>
              <th style={{ ...cellB, width: '6%', textAlign: 'center' }}>単位</th>
              <th style={{ ...cellB, width: '13%', textAlign: 'center' }}>単　価</th>
              <th style={{ ...cellB, width: '16%', textAlign: 'center' }}>金　額</th>
              <th style={{ ...cellB, width: '13%', textAlign: 'center' }}>備　考</th>
            </tr>
          </thead>
          <tbody>
            {(order.details || []).map((it, i) => {
              const p = parts.find(x => x.id === it.partId);
              return (
                <tr key={i}>
                  <td style={{ ...cellB, fontSize: '9px', lineHeight: '1.3' }}>
                    <span style={{ fontFamily: 'monospace' }}>{p?.code || it.partId}</span><br/>
                    {it.partName || p?.name || ''}{p?.maker ? <><br/><span style={{ fontSize: '8px' }}>{p.maker}</span></> : null}
                  </td>
                  <td style={{ ...cellB, textAlign: 'right', fontFamily: 'monospace' }}>{it.qty}</td>
                  <td style={{ ...cellB, textAlign: 'center' }}>{p?.unit || '個'}</td>
                  <td style={{ ...cellB, textAlign: 'right', fontFamily: 'monospace' }}>{it.unitPrice.toLocaleString()}</td>
                  <td style={{ ...cellB, textAlign: 'right', fontFamily: 'monospace' }}>{(it.qty * it.unitPrice).toLocaleString()}</td>
                  <td style={cellB}></td>
                </tr>
              );
            })}
            {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
              <tr key={`e${i}`}>
                <td style={{ ...cellB, height: '22px' }}>&nbsp;</td>
                <td style={cellB}></td><td style={cellB}></td><td style={cellB}></td><td style={cellB}></td><td style={cellB}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* フッター: 摘要 + 合計 */}
        <table style={{ width: '100%', marginTop: '0', fontSize: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '44%', verticalAlign: 'top', paddingTop: '4px' }}>
                <div>摘要：生管調達発注</div>
                <div style={{ marginTop: '4px' }}>納入先：〒737-0921</div>
                <div style={{ paddingLeft: '16px' }}>広島県呉市苗代町126番地の30</div>
                <div style={{ paddingLeft: '16px' }}>三工電機株式会社</div>
                <div style={{ paddingLeft: '16px' }}>生管調達課</div>
                <div style={{ marginTop: '8px' }}>TEL:0823-30-3502<span style={{ marginLeft: '20px' }}>FAX:0823-33-3501</span></div>
              </td>
              <td style={{ width: '14%', border: '1px solid #000', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>合　計</td>
              <td style={{ width: '29%', border: '1px solid #000', textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', paddingRight: '8px' }}>¥{totalAmount.toLocaleString()}</td>
              <td style={{ width: '13%' }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Btn variant="primary" icon={Printer} onClick={handlePrint}>印刷 / PDF保存</Btn>
        <Btn variant="secondary" onClick={onClose} className="ml-auto">閉じる</Btn>
      </div>
    </Modal>
  );
};

// ========================== Inventory ==========================
const InventoryScreen = ({ parts, locations, openPart }: { parts: Part[]; locations: Location[]; openPart?: (p: Part) => void }) => {
  const [warehouse, setWarehouse] = useState('all');
  const warehouses = useMemo(() => ['all', ...new Set(locations.map(l => l.warehouse))], [locations]);

  const grouped = useMemo(() => {
    const partsByLoc: Record<string, Part[]> = {};
    parts.forEach(p => { if (p.location) { partsByLoc[p.location] = partsByLoc[p.location] || []; partsByLoc[p.location].push(p); } });
    return locations
      .filter(l => warehouse === 'all' || l.warehouse === warehouse)
      .map(loc => ({ key: loc.id, label: loc.id, sub: `${loc.warehouse} / ${loc.name} / ${loc.locType}`, items: partsByLoc[loc.id] || [], maxQty: loc.maxQty }))
      .filter(g => g.items.length > 0);
  }, [parts, locations, warehouse]);

  const totalStock = parts.reduce((s, p) => s + p.stock * p.unitPrice, 0);

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="在庫品目数" value={parts.length} sub="アクティブ部品" />
        <Card label="在庫総額" value={yen(totalStock)} sub="評価額" />
        <Card label="ロケーション数" value={locations.length} sub={`${warehouses.length - 1}倉庫`} />
        <Card label="引当中数量" value={parts.reduce((s, p) => s + p.allocated, 0).toLocaleString()} sub="製造指図に紐付け" />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2">
        <span className="text-xs text-black">倉庫:</span>
        <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="text-xs px-2 py-1 border border-slate-300 rounded text-black">
          {warehouses.map(w => <option key={w} value={w}>{w === 'all' ? '全倉庫' : w}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        {grouped.map(g => (
          <div key={g.key} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <MapPin size={14} className="text-blue-600" />
              <span className="font-mono font-bold text-black">{g.label}</span>
              <span className="text-xs text-black">{g.sub}</span>
              <span className="ml-auto text-xs text-black">{g.items.length}品目</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs text-black border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium">品番</th>
                  <th className="text-left px-3 py-1.5 font-medium">品名</th>
                  <th className="text-right px-3 py-1.5 font-medium">現品在庫</th>
                  <th className="text-right px-3 py-1.5 font-medium">引当</th>
                  <th className="text-right px-3 py-1.5 font-medium">発注残</th>
                  <th className="text-right px-3 py-1.5 font-medium">在庫金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {g.items.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openPart?.(p)}>
                    <td className="px-3 py-1.5 font-mono text-xs">{p.id}</td>
                    <td className="px-3 py-1.5">{p.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold">{p.stock} {p.unit}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-amber-700">{p.allocated || '-'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-blue-700">{p.onOrder || '-'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-black">{yen(p.stock * p.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========================== Locations ==========================
const LocationsScreen = ({ locations, onRefresh, toast }: { locations: Location[]; onRefresh: () => void; toast: (msg: string) => void }) => {
  const [editLoc, setEditLoc] = useState<Location | null>(null);
  const [newLoc, setNewLoc] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [editWarehouse, setEditWarehouse] = useState<{ oldName: string; newName: string } | null>(null);
  const [newWarehouse, setNewWarehouse] = useState(false);
  const [newWhName, setNewWhName] = useState('');
  const [deleteWarehouse, setDeleteWarehouse] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const wh: Record<string, Location[]> = {};
    locations.forEach(l => { if (!wh[l.warehouse]) wh[l.warehouse] = []; wh[l.warehouse].push(l); });
    return Object.entries(wh);
  }, [locations]);

  const handleRenameWarehouse = async () => {
    if (!editWarehouse || !editWarehouse.newName.trim()) return;
    try {
      const locsToUpdate = locations.filter(l => l.warehouse === editWarehouse.oldName);
      for (const l of locsToUpdate) {
        await api.updateLocation(l.id, { warehouse: editWarehouse.newName.trim() });
      }
      toast(`倉庫名を「${editWarehouse.newName.trim()}」に変更しました`);
      setEditWarehouse(null);
      onRefresh();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleDeleteWarehouse = async () => {
    if (!deleteWarehouse) return;
    const locsInWh = locations.filter(l => l.warehouse === deleteWarehouse);
    try {
      for (const l of locsInWh) { await api.deleteLocation(l.id); }
      toast(`倉庫「${deleteWarehouse}」と${locsInWh.length}件のロケーションを削除しました`);
      setDeleteWarehouse(null);
      onRefresh();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) {
        const locId = `${form.shelf}-${form.col}-${form.row}${form.side ? '-' + form.side : ''}`;
        await api.createLocation({ ...form, id: locId });
        toast(`ロケーション「${form.name}」を登録しました`);
      } else {
        await api.updateLocation(form.id, form);
        toast(`ロケーション「${form.name}」を更新しました`);
      }
      setEditLoc(null); setNewLoc(null); onRefresh();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.deleteLocation(deleteTarget.id); toast(`ロケーション「${deleteTarget.name}」を削除しました`); setDeleteTarget(null); onRefresh(); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const formLoc = editLoc || newLoc;

  return (
    <div className="p-5 space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 text-sm">
        <Warehouse size={18} className="text-blue-600" />
        <div className="flex-1">
          <div className="font-bold text-blue-900">ロケーション体系</div>
          <div className="text-xs text-blue-700">倉庫 / 棚 / 列 / 段 / 左右の階層で在庫位置を管理</div>
        </div>
        <Btn variant="secondary" icon={Plus} onClick={() => setNewWarehouse(true)}>倉庫追加</Btn>
        <Btn icon={Plus} onClick={() => setNewLoc({ warehouse: grouped[0]?.[0] || '', shelf: '', col: '', row: '', side: '', name: '', maxQty: 100, locType: '通常棚' })}>ロケーション追加</Btn>
      </div>
      {grouped.map(([wh, locs]) => (
        <div key={wh} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse size={14} className="text-black" />
              <span className="font-bold text-sm">{wh}</span>
              <span className="text-xs text-black">({locs.length}ロケーション)</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setEditWarehouse({ oldName: wh, newName: wh })} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1"><Edit size={11} /> 倉庫名変更</button>
              <button onClick={() => setDeleteWarehouse(wh)} className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded flex items-center gap-1"><Trash2 size={11} /> 倉庫削除</button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white text-xs text-black border-b border-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium">ID</th>
                <th className="text-left px-3 py-2 font-medium">名称</th>
                <th className="text-left px-3 py-2 font-medium">タイプ</th>
                <th className="text-right px-3 py-2 font-medium">最大容量</th>
                <th className="text-left px-3 py-2 font-medium">状態</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2"><span className="font-mono inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-xs"><MapPin size={10} />{l.id}</span></td>
                  <td className="px-3 py-2">{l.name}</td>
                  <td className="px-3 py-2 text-xs"><span className="px-1.5 py-0.5 bg-slate-100 rounded">{l.locType}</span></td>
                  <td className="px-3 py-2 text-right font-mono">{l.maxQty.toLocaleString()}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${l.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-black'}`}>{l.isActive ? '有効' : '無効'}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditLoc(l)}>編集</Btn>
                      <button onClick={() => setDeleteTarget(l)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {formLoc && (
        <LocationFormModal location={formLoc} isNew={!!newLoc} onClose={() => { setEditLoc(null); setNewLoc(null); }} onSave={handleSave} />
      )}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="ロケーションの削除確認" size="sm">
          <div className="text-sm mb-4"><p>以下のロケーションを削除しますか？</p><div className="mt-2 bg-slate-50 rounded p-3"><div className="font-mono text-xs text-black">{deleteTarget.id}</div><div className="font-semibold">{deleteTarget.name}</div></div></div>
          <div className="flex gap-2"><Btn variant="danger" icon={Trash2} onClick={handleDelete}>削除する</Btn><Btn variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Btn></div>
        </Modal>
      )}
      {newWarehouse && (
        <Modal open onClose={() => { setNewWarehouse(false); setNewWhName(''); }} title="倉庫を追加" size="sm">
          <div className="space-y-3 text-sm">
            <Field label="倉庫名*"><input value={newWhName} onChange={e => setNewWhName(e.target.value)} className={inputClass} placeholder="例: 第2倉庫" /></Field>
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" icon={Plus} disabled={!newWhName.trim()} onClick={() => {
                setNewLoc({ warehouse: newWhName.trim(), shelf: '', col: '', row: '', side: '', name: '', maxQty: 100, locType: '通常棚' });
                setNewWarehouse(false); setNewWhName('');
                toast(`倉庫「${newWhName.trim()}」用のロケーションを登録してください`);
              }}>追加してロケーション作成</Btn>
              <Btn variant="secondary" onClick={() => { setNewWarehouse(false); setNewWhName(''); }}>キャンセル</Btn>
            </div>
          </div>
        </Modal>
      )}
      {editWarehouse && (
        <Modal open onClose={() => setEditWarehouse(null)} title={`倉庫名の変更: ${editWarehouse.oldName}`} size="sm">
          <div className="space-y-3 text-sm">
            <Field label="新しい倉庫名*"><input value={editWarehouse.newName} onChange={e => setEditWarehouse({ ...editWarehouse, newName: e.target.value })} className={inputClass} /></Field>
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" icon={Save} disabled={!editWarehouse.newName.trim() || editWarehouse.newName === editWarehouse.oldName} onClick={handleRenameWarehouse}>変更する</Btn>
              <Btn variant="secondary" onClick={() => setEditWarehouse(null)}>キャンセル</Btn>
            </div>
          </div>
        </Modal>
      )}
      {deleteWarehouse && (
        <Modal open onClose={() => setDeleteWarehouse(null)} title="倉庫の削除確認" size="sm">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <Trash2 size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800">「{deleteWarehouse}」を削除しますか？</p>
                <p className="text-rose-700 mt-1">この倉庫内の{locations.filter(l => l.warehouse === deleteWarehouse).length}件のロケーションも全て削除されます。</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Btn variant="danger" icon={Trash2} onClick={handleDeleteWarehouse}>倉庫ごと削除する</Btn>
              <Btn variant="secondary" onClick={() => setDeleteWarehouse(null)}>キャンセル</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ========================== Other Screens ==========================
const ReceiveScreen = ({ orders, parts, onRefresh, toast }: { orders: Order[]; parts: Part[]; onRefresh: () => void; toast: (msg: string) => void }) => {
  const pendingOrders = orders.filter(o => o.status === 'awaiting');
  const [selectedPO, setSelectedPO] = useState<number | ''>('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [inspection, setInspection] = useState<Record<string, string>>({});
  const [recvReplacementModal, setRecvReplacementModal] = useState<{ orderId: number; detailId: number; partId: string; partName: string } | null>(null);
  const [recvRepPartId, setRecvRepPartId] = useState('');
  const [recvRepSearch, setRecvRepSearch] = useState('');

  const order = pendingOrders.find(o => o.id === selectedPO) || null;

  useEffect(() => {
    if (order) {
      const qty: Record<string, number> = {};
      const ins: Record<string, string> = {};
      (order.details || []).filter(d => d.qty - d.receivedQty > 0).forEach(d => {
        qty[d.partId] = d.qty - d.receivedQty;
        ins[d.partId] = '合格';
      });
      setReceiveQty(qty);
      setInspection(ins);
    }
  }, [selectedPO]);

  const handleReceive = async () => {
    if (!order) return;
    const items = Object.entries(receiveQty)
      .filter(([, q]) => q > 0)
      .map(([partId, qty]) => {
        const detail = order.details.find(d => d.partId === partId);
        const insp = inspection[partId] || '合格';
        const receiveQtyFinal = insp === '不合格' ? 0 : qty;

        // 代替品の場合、代替品IDで在庫加算する
        let stockPartId = partId;
        if (detail?.remarks?.startsWith('replacement:')) {
          const repId = detail.remarks.split(':')[1];
          if (repId) stockPartId = repId;
        }

        return {
          partId: stockPartId, // 在庫加算は代替品IDで
          originalPartId: partId, // 元の部品ID（発注明細更新用）
          qty: receiveQtyFinal,
          orderDetailId: detail?.id,
          orderId: order.id,
          locationId: parts.find(p => p.id === stockPartId)?.location || parts.find(p => p.id === partId)?.location || 'A-03-2-L',
          result: insp === '不合格' ? 'reject' : 'ok',
          rejectReason: insp === '不合格' ? '検査不合格' : insp === '条件付合格' ? '条件付合格' : undefined,
        };
      })
      .filter(i => i.qty > 0);
    if (items.length === 0) {
      toast('入庫する品目がありません（不合格のみ）');
      return;
    }
    try {
      await api.createReceive({ receivedById: 1, items });
      toast(`入庫を確定しました（${items.length}品目）`);
      setSelectedPO('');
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  const allDetails = order?.details || [];
  const remainingDetails = allDetails.filter(d => d.qty - d.receivedQty > 0);

  return (
    <div className="p-5 max-w-5xl">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-bold mb-1">入庫処理</h2>
        <p className="text-xs text-black mb-4">発注書のQRコードを読み取るか、発注番号を選択してください</p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-5 text-center cursor-pointer hover:bg-blue-100"
            onClick={() => setShowQrScanner(true)}>
            {showQrScanner ? (
              <div>
                <QrCameraScanner onScan={(text) => {
                  setShowQrScanner(false);
                  try {
                    const data = JSON.parse(text);
                    if (data.type === 'order' && data.id) {
                      const found = pendingOrders.find(o => o.orderNo === data.id || o.id === Number(data.id));
                      if (found) { setSelectedPO(found.id); toast(`発注 ${found.orderNo} を読み取りました`); }
                      else toast('該当する納品待ち発注が見つかりません');
                    } else {
                      const found = pendingOrders.find(o => o.orderNo === text || o.id === Number(text));
                      if (found) { setSelectedPO(found.id); toast(`発注 ${found.orderNo} を読み取りました`); }
                      else toast('該当する納品待ち発注が見つかりません');
                    }
                  } catch {
                    const found = pendingOrders.find(o => o.orderNo === text);
                    if (found) { setSelectedPO(found.id); toast(`発注 ${found.orderNo} を読み取りました`); }
                    else toast('該当する納品待ち発注が見つかりません');
                  }
                }} />
                <button onClick={(e) => { e.stopPropagation(); setShowQrScanner(false); }} className="mt-2 text-xs text-blue-600 hover:underline">キャンセル</button>
              </div>
            ) : (
              <>
                <QrCode size={28} className="mx-auto mb-2 text-blue-600" />
                <div className="text-sm font-bold text-blue-900">発注QRを読取</div>
                <div className="text-xs text-blue-600 mt-1">納品書の発注番号QR</div>
              </>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-black mb-2">納品待ち発注から選択</div>
            <select value={selectedPO} onChange={e => setSelectedPO(e.target.value ? Number(e.target.value) : '')} className="w-full border border-slate-300 rounded px-2 py-2 text-sm">
              <option value="">-- 発注を選択 --</option>
              {pendingOrders.map(o => <option key={o.id} value={o.id}>{o.orderNo} / {o.supplier} / {o.desiredDate || '-'}</option>)}
            </select>
          </div>
        </div>

        {order && (
          <>
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-black">{order.orderNo}</div>
                  <div className="font-bold">{order.supplier}</div>
                </div>
                <StatusBadge statusKey={order.status} statusMap={ORDER_STATUS} />
              </div>
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-slate-100 text-xs text-black">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">品番</th>
                    <th className="text-left px-3 py-2 font-medium">品名</th>
                    <th className="text-left px-3 py-2 font-medium">状態</th>
                    <th className="text-right px-3 py-2 font-medium">発注</th>
                    <th className="text-right px-3 py-2 font-medium">入庫済</th>
                    <th className="text-right px-3 py-2 font-medium">今回入庫</th>
                    <th className="text-left px-3 py-2 font-medium">検査</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allDetails.map(d => {
                    const remaining = d.qty - d.receivedQty;
                    const isShortage = d.remarks === 'manufacturer_shortage';
                    const isReplacement = d.remarks?.startsWith('replacement:');
                    const repName = isReplacement ? d.remarks!.split(':')[2] : '';
                    return (
                      <tr key={d.partId} className={isShortage || isReplacement ? 'bg-rose-50/50' : remaining <= 0 ? 'bg-emerald-50/30' : ''}>
                        <td className="px-3 py-2 font-mono text-xs">{d.partId}</td>
                        <td className="px-3 py-2">{d.partName || d.partId}</td>
                        <td className="px-3 py-2">
                          {isShortage && <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded font-semibold">欠品</span>}
                          {isReplacement && <div className="text-xs"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">代替品: {repName}</span></div>}
                          {!isShortage && !isReplacement && remaining <= 0 && <span className="text-xs text-emerald-600 font-semibold">入庫済</span>}
                          {!isShortage && !isReplacement && remaining > 0 && <span className="text-xs text-black">未入庫</span>}
                          {isShortage && (
                            <button onClick={() => setRecvReplacementModal({ orderId: order!.id, detailId: d.id!, partId: d.partId, partName: d.partName || d.partId })}
                              className="block mt-1 text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">代替品登録</button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{d.qty}</td>
                        <td className="px-3 py-2 text-right">{d.receivedQty}</td>
                        <td className="px-3 py-2 text-right">
                          {remaining > 0 && !isShortage ? (
                            <input type="number" value={receiveQty[d.partId] || 0} max={remaining}
                              onChange={e => setReceiveQty(s => ({ ...s, [d.partId]: Math.min(Number(e.target.value) || 0, remaining) }))}
                              className="w-20 border border-slate-300 rounded px-2 py-1 text-right" />
                          ) : isReplacement ? (
                            <input type="number" value={receiveQty[d.partId] || 0} max={d.qty}
                              onChange={e => setReceiveQty(s => ({ ...s, [d.partId]: Math.min(Number(e.target.value) || 0, d.qty) }))}
                              className="w-20 border border-slate-300 rounded px-2 py-1 text-right" placeholder="代替品" />
                          ) : <span className="text-xs text-black">-</span>}
                        </td>
                        <td className="px-3 py-2">
                          {(remaining > 0 && !isShortage) || isReplacement ? (
                            <select value={inspection[d.partId] || '合格'} onChange={e => setInspection(s => ({ ...s, [d.partId]: e.target.value }))} className="text-xs border border-slate-300 rounded px-2 py-1">
                              <option>合格</option><option>条件付合格</option><option>不合格</option>
                            </select>
                          ) : <span className="text-xs text-black">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Btn variant="success" icon={CheckCircle2} onClick={handleReceive}>入庫を確定（在庫加算・現品票発行）</Btn>
              <Btn variant="secondary" onClick={() => setSelectedPO('')}>キャンセル</Btn>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5" />
              <div>確定すると、検査合格分が在庫に加算され、発注残が減算されます。全数入庫で完納、未達なら一部入庫ステータスになります。</div>
            </div>
          </>
        )}
      </div>

      {recvReplacementModal && (
        <Modal open onClose={() => { setRecvReplacementModal(null); setRecvRepPartId(''); setRecvRepSearch(''); }} title={`代替品を登録: ${recvReplacementModal.partName}`} size="md">
          <div className="space-y-3 text-sm">
            <div className="bg-rose-50 border border-rose-200 rounded p-3">
              <div className="text-xs text-rose-700 font-bold">欠品中の部品</div>
              <div className="font-mono text-xs mt-1">{recvReplacementModal.partId}</div>
              <div className="font-bold">{recvReplacementModal.partName}</div>
            </div>
            <Field label="代替品を検索（入力で絞り込み）">
              <input value={recvRepSearch} onChange={e => setRecvRepSearch(e.target.value)} placeholder="品番・品名で検索..." className={inputClass} />
            </Field>
            <div className="border border-slate-200 rounded max-h-48 overflow-y-auto">
              {parts.filter(p => p.id !== recvReplacementModal.partId && (!recvRepSearch || p.id.toLowerCase().includes(recvRepSearch.toLowerCase()) || p.name.toLowerCase().includes(recvRepSearch.toLowerCase()))).slice(0, 20).map(p => (
                <button key={p.id} onClick={() => { setRecvRepPartId(p.id); setRecvRepSearch(p.name); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 flex items-center gap-3 ${recvRepPartId === p.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex-1"><span className="font-mono">{p.id}</span> <span className="font-bold">{p.name}</span></div>
                  <div className="text-right"><span className="font-mono">{p.stock} {p.unit}</span></div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" icon={Save} disabled={!recvRepPartId} onClick={async () => {
                try {
                  const repPart = parts.find(p => p.id === recvRepPartId);
                  await api.updatePart(recvReplacementModal.partId, { replacementId: recvRepPartId, isDiscontinued: true, shortageReason: `廃盤 → 代替品: ${repPart?.name || recvRepPartId}` });
                  await api.updateOrder(recvReplacementModal.orderId, { detailUpdate: { detailId: recvReplacementModal.detailId, remarks: `replacement:${recvRepPartId}:${repPart?.name || ''}` } });
                  toast(`代替品「${repPart?.name}」を登録しました`);
                  setRecvReplacementModal(null); setRecvRepPartId(''); setRecvRepSearch('');
                  onRefresh();
                } catch (e: any) { toast(`エラー: ${e.message}`); }
              }}>代替品を登録</Btn>
              <Btn variant="secondary" onClick={() => { setRecvReplacementModal(null); setRecvRepPartId(''); setRecvRepSearch(''); }}>キャンセル</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const ProductionScreen = ({ prodOrders, toast, onRefresh, parts }: { prodOrders: ProdOrder[]; toast: (msg: string) => void; onRefresh: () => void; parts: Part[] }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [bomDetail, setBomDetail] = useState<any>(null);
  const [bomLoading, setBomLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editMo, setEditMo] = useState<ProdOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProdOrder | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => { api.getProducts().then(res => setProducts(res.data || [])).catch(() => {}); }, []);

  const handleToggle = async (mo: ProdOrder) => {
    if (expandedId === mo.id) {
      setExpandedId(null);
      setBomDetail(null);
      return;
    }
    setExpandedId(mo.id);
    setBomLoading(true);
    try {
      const detail = await api.getProductionOrder(mo.id);
      setBomDetail(detail);
    } catch {
      toast('BOM詳細の取得に失敗しました');
      setBomDetail(null);
    } finally {
      setBomLoading(false);
    }
  };

  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-sm">製造指図一覧</h2>
          <Btn icon={Plus} onClick={() => setShowNew(true)}>新規指図</Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-black uppercase">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="text-left px-3 py-2 font-medium">指図番号</th>
                <th className="text-left px-3 py-2 font-medium">製品</th>
                <th className="text-right px-3 py-2 font-medium">数量</th>
                <th className="text-left px-3 py-2 font-medium">顧客</th>
                <th className="text-left px-3 py-2 font-medium">納期</th>
                <th className="text-left px-3 py-2 font-medium">ステータス</th>
                <th className="px-3 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prodOrders.map(m => (
                <React.Fragment key={m.id}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => handleToggle(m)}>
                    <td className="px-3 py-2 text-black">
                      {expandedId === m.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{m.prodNo}</td>
                    <td className="px-3 py-2 font-semibold">{m.productName || m.productCode}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.qty}</td>
                    <td className="px-3 py-2 text-xs">{m.customer}</td>
                    <td className="px-3 py-2 text-xs">{m.dueDate}</td>
                    <td className="px-3 py-2"><StatusBadge statusKey={m.status} statusMap={MO_STATUS} /></td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditMo(m)}>編集</Btn>
                        <button onClick={() => setDeleteTarget(m)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === m.id && (
                    <tr>
                      <td colSpan={8} className="bg-slate-50 px-4 py-3">
                        {bomLoading ? (
                          <div className="flex items-center gap-2 text-sm text-black py-4 justify-center">
                            <Loader2 size={16} className="animate-spin" /> BOM情報を読み込み中...
                          </div>
                        ) : bomDetail ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-4 gap-3 text-xs">
                              <div><span className="text-black">製品:</span> <span className="font-semibold">{bomDetail.productName || bomDetail.productCode}</span></div>
                              <div><span className="text-black">数量:</span> <span className="font-mono">{bomDetail.qty}</span></div>
                              <div><span className="text-black">開始日:</span> {bomDetail.startDate || m.startDate || '-'}</div>
                              <div><span className="text-black">納期:</span> {bomDetail.dueDate || m.dueDate || '-'}</div>
                            </div>

                            {bomDetail.bomSnapshot && bomDetail.bomSnapshot.length > 0 ? (
                              <div className="bg-white rounded border border-slate-200 overflow-hidden">
                                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-black flex items-center gap-2">
                                  <Package size={12} /> BOM展開 ({bomDetail.bomSnapshot.length}部品)
                                </div>
                                <table className="w-full text-xs">
                                  <thead className="bg-white text-black border-b border-slate-100">
                                    <tr>
                                      <th className="text-left px-3 py-1.5 font-medium">品番</th>
                                      <th className="text-left px-3 py-1.5 font-medium">品名</th>
                                      <th className="text-left px-3 py-1.5 font-medium">取付位置</th>
                                      <th className="text-right px-3 py-1.5 font-medium">必要数</th>
                                      <th className="text-right px-3 py-1.5 font-medium">ピッキング済</th>
                                      <th className="text-left px-3 py-1.5 font-medium">引当状況</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {bomDetail.bomSnapshot.map((bs: any, idx: number) => {
                                      const need = bs.qty * (bomDetail.qty || m.qty || 1);
                                      const picked = bs.pickedQty || 0;
                                      const allocated = need;
                                      const pctPicked = need > 0 ? Math.round((picked / need) * 100) : 0;
                                      return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-3 py-1.5 font-mono">{bs.partId}</td>
                                          <td className="px-3 py-1.5">{bs.part?.name || bs.partName || bs.partId}</td>
                                          <td className="px-3 py-1.5 text-black">{bs.position || '-'}</td>
                                          <td className="px-3 py-1.5 text-right font-mono font-semibold">{need}</td>
                                          <td className="px-3 py-1.5 text-right">
                                            <span className="font-mono">{picked}</span>
                                            {need > 0 && (
                                              <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-0.5 inline-block ml-1.5 align-middle">
                                                <div className={`h-full rounded-full ${pctPicked >= 100 ? 'bg-emerald-500' : pctPicked > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${Math.min(pctPicked, 100)}%` }} />
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-3 py-1.5">
                                            {picked >= need ? (
                                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">完了</span>
                                            ) : picked > 0 ? (
                                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">一部ピック</span>
                                            ) : (
                                              <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">引当済</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-xs text-black text-center py-3">BOM情報がありません</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-black text-center py-3">詳細を取得できませんでした</div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(showNew || editMo) && (
        <Modal open onClose={() => { setShowNew(false); setEditMo(null); }} title={showNew ? '製造指図 新規登録' : `製造指図編集: ${editMo?.prodNo}`} size="md">
          <ProdOrderForm prodOrder={editMo} isNew={showNew} products={products} parts={parts} onClose={() => { setShowNew(false); setEditMo(null); }} onSave={async (form: any, isNew: boolean) => {
            try {
              if (isNew) { await api.createProductionOrder({ ...form, createdById: 1 }); toast('製造指図を作成しました'); }
              else { await api.updateProductionOrder(form.id, form); toast('製造指図を更新しました'); }
              setShowNew(false); setEditMo(null); onRefresh();
            } catch (e: any) { toast(`エラー: ${e.message}`); }
          }} />
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="製造指図の削除確認" size="sm">
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
            <Trash2 size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
            <div><p className="font-bold text-rose-800">「{deleteTarget.prodNo}」を削除しますか？</p><p className="text-rose-700 mt-1">{deleteTarget.productName} x {deleteTarget.qty} の指図が削除され、引当中の在庫が解除されます。</p></div>
          </div>
          <div className="flex gap-2">
            <Btn variant="danger" icon={Trash2} onClick={async () => { try { await api.deleteProductionOrder(deleteTarget.id); toast(`削除しました`); setDeleteTarget(null); onRefresh(); } catch (e: any) { toast(`エラー: ${e.message}`); } }}>削除する</Btn>
            <Btn variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

const IssueScreen = ({ prodOrders, onRefresh, toast }: { prodOrders: ProdOrder[]; onRefresh: () => void; toast: (msg: string) => void }) => {
  const activeOrders = prodOrders.filter(m => ['allocated', 'picking', 'in_progress'].includes(m.status));
  const [selectedMo, setSelectedMo] = useState<number | ''>('');
  const [moDetail, setMoDetail] = useState<any>(null);
  const [pickQty, setPickQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const mo = prodOrders.find(m => m.id === selectedMo) || null;

  useEffect(() => {
    if (selectedMo) {
      setLoading(true);
      api.getProductionOrder(Number(selectedMo))
        .then((detail: any) => {
          setMoDetail(detail);
          const q: Record<string, number> = {};
          (detail.bomSnapshot || []).forEach((bs: any) => {
            const need = Number(bs.totalQty) || (Number(bs.requiredQty) * Number(detail.qty || 1));
            const already = Number(bs.pickedQty) || 0;
            const remaining = Math.max(0, need - already);
            q[bs.partId] = remaining;
          });
          setPickQty(q);
        })
        .catch(() => toast('指図の詳細取得に失敗しました'))
        .finally(() => setLoading(false));
    } else {
      setMoDetail(null);
    }
  }, [selectedMo]);

  const handleComplete = async () => {
    if (!moDetail) return;
    const items = (moDetail.bomSnapshot || [])
      .filter((bs: any) => (pickQty[bs.partId] || 0) > 0)
      .map((bs: any) => ({
        partId: bs.partId,
        qty: pickQty[bs.partId] || 0,
        locationId: bs.part?.defaultLocId || 'A-03-2-L',
      }));
    if (items.length === 0) { toast('ピッキング数を入力してください'); return; }
    try {
      await api.issueProductionOrder(Number(selectedMo), { items, issuedById: 1 });
      toast(`出庫処理が完了しました（${items.length}部品）`);
      setSelectedMo('');
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  return (
    <div className="p-5 max-w-5xl">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-bold mb-1">出庫処理（製造指図ベース）</h2>
        <p className="text-xs text-black mb-4">引当済み・ピッキング中の製造指図からピッキングリストを表示します</p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-5 text-center cursor-pointer hover:bg-blue-100"
            onClick={() => setShowQrScanner(true)}>
            {showQrScanner ? (
              <div>
                <QrCameraScanner onScan={(text) => {
                  setShowQrScanner(false);
                  try {
                    const data = JSON.parse(text);
                    const found = activeOrders.find(o => o.prodNo === (data.id || text) || o.id === Number(data.id || text));
                    if (found) { setSelectedMo(found.id); toast(`指図 ${found.prodNo} を読み取りました`); }
                    else toast('該当するアクティブな製造指図が見つかりません');
                  } catch {
                    const found = activeOrders.find(o => o.prodNo === text);
                    if (found) { setSelectedMo(found.id); toast(`指図 ${found.prodNo} を読み取りました`); }
                    else toast('該当するアクティブな製造指図が見つかりません');
                  }
                }} />
                <button onClick={(e) => { e.stopPropagation(); setShowQrScanner(false); }} className="mt-2 text-xs text-blue-600 hover:underline">キャンセル</button>
              </div>
            ) : (
              <>
                <QrCode size={28} className="mx-auto mb-2 text-blue-600" />
                <div className="text-sm font-bold text-blue-900">指図QRを読取</div>
                <div className="text-xs text-blue-600 mt-1">ピッキングリストの指図番号QR</div>
              </>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-black mb-2">アクティブな製造指図</div>
            <select value={selectedMo} onChange={e => setSelectedMo(e.target.value ? Number(e.target.value) : '')} className="w-full border border-slate-300 rounded px-2 py-2 text-sm">
              <option value="">-- 指図を選択 --</option>
              {activeOrders.map(m => (
                <option key={m.id} value={m.id}>{m.prodNo} / {m.productName || m.productCode} x {m.qty} / 納期{m.dueDate}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>}

        {mo && moDetail && !loading && (
          <>
            <div className="bg-slate-50 rounded p-3 mb-3 flex items-center gap-3">
              <Factory size={18} className="text-blue-600" />
              <div className="flex-1">
                <div className="text-xs text-black">指図 {mo.prodNo}</div>
                <div className="font-bold">{mo.productName || moDetail.product?.name} x {mo.qty}</div>
                <div className="text-xs text-black">納期: {mo.dueDate} / {mo.customer}</div>
              </div>
              <StatusBadge statusKey={mo.status} statusMap={MO_STATUS} />
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <div className="bg-slate-50 px-4 py-2 text-xs text-black border-b border-slate-200">ピッキングリスト（ロケーション順）</div>
              <table className="w-full text-sm">
                <thead className="text-xs text-black border-b border-slate-100">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">棚位置</th>
                    <th className="text-left px-3 py-1.5 font-medium">部品</th>
                    <th className="text-right px-3 py-1.5 font-medium">必要</th>
                    <th className="text-right px-3 py-1.5 font-medium">既ピック</th>
                    <th className="text-right px-3 py-1.5 font-medium">今回ピック</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(moDetail.bomSnapshot || []).map((bs: any) => {
                    const need = Number(bs.totalQty) || (Number(bs.requiredQty) * Number(mo.qty));
                    const already = Number(bs.pickedQty) || 0;
                    const remaining = need - already;
                    return (
                      <tr key={bs.partId} className={remaining <= 0 ? 'bg-emerald-50/30' : ''}>
                        <td className="px-3 py-1.5 font-mono text-xs"><MapPin size={10} className="inline mr-0.5" />{bs.part?.defaultLocId || '-'}</td>
                        <td className="px-3 py-1.5">
                          <div className="font-mono text-xs text-black">{bs.partId}</div>
                          <div className="font-semibold">{bs.part?.name || '-'}</div>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">{need}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-black">{already}</td>
                        <td className="px-3 py-1.5 text-right">
                          {remaining > 0 ? (
                            <input type="number" value={pickQty[bs.partId] || 0} max={remaining} min={0}
                              onChange={e => setPickQty(s => ({ ...s, [bs.partId]: Math.min(Number(e.target.value) || 0, remaining) }))}
                              className="w-20 border border-slate-300 rounded px-2 py-1 text-right" />
                          ) : <span className="text-emerald-600 font-bold text-xs">完了</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Btn variant="success" icon={CheckCircle2} onClick={handleComplete}>ピッキング確定（在庫減算）</Btn>
              <Btn variant="secondary" onClick={() => setSelectedMo('')}>キャンセル</Btn>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5" />
              <div>確定すると、ピック数が在庫から減算され、引当が解除されます。全部品のピッキングが完了すると指図ステータスが「完了」になります。</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ProdOrderForm = ({ prodOrder, isNew, products, parts, onClose, onSave }: { prodOrder: any; isNew: boolean; products: any[]; parts: Part[]; onClose: () => void; onSave: (form: any, isNew: boolean) => void }) => {
  const [form, setForm] = useState(() => prodOrder || { productId: products[0]?.id || '', qty: 1, startDate: new Date().toISOString().slice(0, 10), dueDate: '', customer: '', notes: '' });
  const [bomItems, setBomItems] = useState<{ partId: string; qty: number; position: string }[]>([]);
  const [bomLoaded, setBomLoaded] = useState(false);
  const [addPartSearch, setAddPartSearch] = useState('');
  const [addPartDropdown, setAddPartDropdown] = useState(false);
  const upd = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Load BOM when product is selected (new) or load existing snapshot (edit)
  useEffect(() => {
    if (!isNew && prodOrder?.id) {
      api.getProductionOrder(prodOrder.id).then((detail: any) => {
        const items = (detail.bomSnapshot || []).map((bs: any) => ({
          partId: bs.partId, qty: Number(bs.totalQty) || Number(bs.requiredQty) || 0, position: bs.position || '',
        }));
        setBomItems(items);
        setBomLoaded(true);
      }).catch(() => setBomLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (isNew && form.productId) {
      const product = products.find((p: any) => p.id === Number(form.productId));
      if (product?.boms) {
        setBomItems(product.boms.map((b: any) => ({ partId: b.partId, qty: Number(b.qty) * (form.qty || 1), position: b.position || '' })));
      } else {
        api.getProduct(Number(form.productId)).then((res: any) => {
          const p = res.data || res;
          if (p?.boms) setBomItems(p.boms.map((b: any) => ({ partId: b.partId, qty: Number(b.qty) * (form.qty || 1), position: b.position || '' })));
        }).catch(() => {});
      }
      setBomLoaded(true);
    }
  }, [form.productId]);

  const bomPartIds = new Set(bomItems.map(b => b.partId));
  const filteredAddParts = parts.filter(p => !bomPartIds.has(p.id) && (!addPartSearch || p.id.toLowerCase().includes(addPartSearch.toLowerCase()) || p.name.toLowerCase().includes(addPartSearch.toLowerCase()))).slice(0, 20);

  return (
    <div className="space-y-3 text-sm">
      <Field label="製品*">
        <select value={form.productId || ''} onChange={e => upd('productId', Number(e.target.value))} className={inputClass} disabled={!isNew}>
          <option value="">-- 製品を選択 --</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="数量*"><input type="number" value={form.qty || 1} onChange={e => upd('qty', Number(e.target.value) || 1)} min={1} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="顧客"><input value={form.customer || ''} onChange={e => upd('customer', e.target.value)} className={inputClass} placeholder="例: ○○造船" /></Field>
        <Field label="開始日"><input type="date" value={form.startDate || ''} onChange={e => upd('startDate', e.target.value)} className={inputClass} /></Field>
        <Field label="納期"><input type="date" value={form.dueDate || ''} onChange={e => upd('dueDate', e.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="備考" full><textarea value={form.notes || ''} onChange={e => upd('notes', e.target.value)} className={`${inputClass} h-12`} /></Field>

      {/* BOM editing */}
      {bomLoaded && bomItems.length > 0 && (
        <div className="border border-slate-200 rounded overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-black border-b border-slate-200 flex items-center gap-2">
            <Package size={12} /> 部品リスト ({bomItems.length}部品)
          </div>
          <table className="w-full text-xs">
            <thead className="bg-white text-black border-b border-slate-100">
              <tr><th className="text-left px-3 py-1.5">品番</th><th className="text-left px-3 py-1.5">品名</th><th className="text-right px-3 py-1.5 w-20">数量</th><th className="text-left px-3 py-1.5 w-20">位置</th><th className="w-8"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bomItems.map((b, i) => {
                const part = parts.find(p => p.id === b.partId);
                return (
                  <tr key={b.partId}>
                    <td className="px-3 py-1.5 font-mono">{b.partId}</td>
                    <td className="px-3 py-1.5">{part?.name || b.partId}</td>
                    <td className="px-3 py-1.5"><input type="number" value={b.qty} min={1} onChange={e => setBomItems(prev => prev.map((item, j) => j === i ? { ...item, qty: Number(e.target.value) || 1 } : item))} className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-right" /></td>
                    <td className="px-3 py-1.5"><input value={b.position} onChange={e => setBomItems(prev => prev.map((item, j) => j === i ? { ...item, position: e.target.value } : item))} className="w-16 border border-slate-300 rounded px-1.5 py-0.5" /></td>
                    <td className="px-3 py-1"><button onClick={() => setBomItems(prev => prev.filter((_, j) => j !== i))} className="text-rose-500 hover:bg-rose-50 p-0.5 rounded"><Trash2 size={12} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add part to BOM */}
      {bomLoaded && (
        <div className="relative">
          <div className="text-xs font-semibold text-black mb-1">部品を追加</div>
          <input value={addPartSearch} onChange={e => { setAddPartSearch(e.target.value); setAddPartDropdown(true); }} onFocus={() => setAddPartDropdown(true)} onBlur={() => setTimeout(() => setAddPartDropdown(false), 200)} placeholder="品番・品名で検索..." className={`${inputClass} font-mono`} />
          {addPartDropdown && filteredAddParts.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto">
              {filteredAddParts.map(p => (
                <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); setBomItems(prev => [...prev, { partId: p.id, qty: 1, position: '' }]); setAddPartSearch(''); setAddPartDropdown(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center justify-between">
                  <span><span className="font-mono">{p.id}</span> {p.name}</span>
                  <span className="text-black">在庫:{p.stock}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isNew && <div className="bg-blue-50 border border-blue-200 rounded p-2.5 text-xs text-blue-800">製品を選択するとBOMから部品が自動展開されます。数量の変更や部品の追加・削除が可能です。</div>}
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave({ ...form, bomItems }, isNew)} disabled={!form.productId || !form.qty}>{isNew ? '指図発行' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </div>
  );
};

const ProductsScreen = ({ toast, parts }: { toast: (msg: string) => void; parts: Part[] }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [bomViewProduct, setBomViewProduct] = useState<any>(null);
  const [bomDetail, setBomDetail] = useState<any>(null);
  const [bomLoading, setBomLoading] = useState(false);

  const fetchProducts = () => { api.getProducts().then(res => { setProducts(res.data || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { fetchProducts(); }, []);

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) { await api.createProduct(form); toast(`製品「${form.name}」を登録しました`); }
      else { await api.updateProduct(form.id, form); toast(`製品「${form.name}」を更新しました`); }
      setEditProduct(null); setNewProduct(null); fetchProducts();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.deleteProduct(deleteTarget.id); toast(`製品「${deleteTarget.name}」を削除しました`); setDeleteTarget(null); fetchProducts(); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const openBom = async (p: any) => {
    setBomViewProduct(p); setBomLoading(true);
    try { const detail = await api.getProduct(p.id); setBomDetail(detail); }
    catch { toast('BOM詳細の取得に失敗しました'); }
    finally { setBomLoading(false); }
  };

  const handleBomAdd = async (partId: string, qty: number, position: string) => {
    if (!bomViewProduct || !bomDetail) return;
    const boms = [...(bomDetail.boms || []).map((b: any) => ({ partId: b.partId, qty: Number(b.qty), position: b.position })), { partId, qty, position }];
    try { await api.updateProduct(bomViewProduct.id, { boms }); const detail = await api.getProduct(bomViewProduct.id); setBomDetail(detail); fetchProducts(); toast('BOM部品を追加しました'); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleBomRemove = async (bomId: number) => {
    if (!bomViewProduct || !bomDetail) return;
    const boms = (bomDetail.boms || []).filter((b: any) => b.id !== bomId).map((b: any) => ({ partId: b.partId, qty: Number(b.qty), position: b.position }));
    try { await api.updateProduct(bomViewProduct.id, { boms }); const detail = await api.getProduct(bomViewProduct.id); setBomDetail(detail); fetchProducts(); toast('BOM部品を削除しました'); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  const formProduct = editProduct || newProduct;

  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-sm">製品マスタ・BOM</h2>
          <Btn icon={Plus} onClick={() => setNewProduct({ code: '', name: '', category: '', voltage: '', dimensions: '', drawingNo: '' })}>新規登録</Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-black uppercase">
              <tr>
                <th className="text-left px-3 py-2 font-medium">製品コード</th>
                <th className="text-left px-3 py-2 font-medium">製品名</th>
                <th className="text-left px-3 py-2 font-medium">分類</th>
                <th className="text-left px-3 py-2 font-medium">電圧</th>
                <th className="text-left px-3 py-2 font-medium">寸法</th>
                <th className="text-right px-3 py-2 font-medium">BOM部品数</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openBom(p)}>
                  <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                  <td className="px-3 py-2 font-semibold">{p.name}</td>
                  <td className="px-3 py-2 text-xs">{p.category}</td>
                  <td className="px-3 py-2 text-xs">{p.voltage}</td>
                  <td className="px-3 py-2 text-xs">{p.dimensions}</td>
                  <td className="px-3 py-2 text-right font-mono">{p._count?.boms || p.boms?.length || 0}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditProduct(p)}>編集</Btn>
                      <button onClick={(e: any) => { e.stopPropagation(); setDeleteTarget(p); }} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {formProduct && (
        <ProductFormModal product={formProduct} isNew={!!newProduct} onClose={() => { setEditProduct(null); setNewProduct(null); }} onSave={handleSave} />
      )}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="製品の削除確認" size="sm">
          <div className="text-sm mb-4"><p>以下の製品を削除しますか？</p><div className="mt-2 bg-slate-50 rounded p-3"><div className="font-mono text-xs text-black">{deleteTarget.code}</div><div className="font-semibold">{deleteTarget.name}</div></div></div>
          <div className="flex gap-2"><Btn variant="danger" icon={Trash2} onClick={handleDelete}>削除する</Btn><Btn variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Btn></div>
        </Modal>
      )}
      {bomViewProduct && (
        <Modal open onClose={() => { setBomViewProduct(null); setBomDetail(null); }} title={`BOM: ${bomViewProduct.name}`} size="lg">
          {bomLoading ? <div className="flex items-center gap-2 text-sm text-black py-8 justify-center"><Loader2 size={16} className="animate-spin" /> BOM情報を読み込み中...</div>
          : bomDetail ? <BomEditor boms={bomDetail.boms || []} parts={parts} onAdd={handleBomAdd} onRemove={handleBomRemove} />
          : <div className="text-sm text-black text-center py-4">BOM情報を取得できませんでした</div>}
        </Modal>
      )}
    </div>
  );
};

// Excel取込ドロップダウン
const ExcelImportDropdown = ({ onDownload, onImport }: { onDownload: () => void; onImport: () => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <Btn variant="secondary" icon={FileText} onClick={() => setOpen(!open)}>Excel取込 <ChevronDown size={12} /></Btn>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 w-56 py-1">
          <button onClick={() => { onDownload(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-black"><Download size={14} /> テンプレートダウンロード</button>
          <button onClick={() => { onImport(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-black"><FileText size={14} /> ファイルを取込</button>
        </div>
      )}
    </div>
  );
};

const StocktakeScreen = ({ parts, locations, toast, onRefresh }: { parts: Part[]; locations: Location[]; toast: (msg: string) => void; onRefresh: () => void }) => {
  const [selected, setSelected] = useState<Location | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [confirmedDiffs, setConfirmedDiffs] = useState<Record<string, boolean>>({});
  const [showQrScanner, setShowQrScanner] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const partsByLoc = useMemo(() => {
    const m: Record<string, Part[]> = {};
    parts.forEach(p => { if (p.location) { if (!m[p.location]) m[p.location] = []; m[p.location].push(p); } });
    return m;
  }, [parts]);
  const targetLocations = useMemo(() => locations, [locations]);
  const warehouseGroups = useMemo(() => {
    const wh: Record<string, Location[]> = {};
    targetLocations.forEach(l => { if (!wh[l.warehouse]) wh[l.warehouse] = []; wh[l.warehouse].push(l); });
    return Object.entries(wh);
  }, [targetLocations]);
  const getLocStatus = (locId: string) => {
    const partsInLoc = partsByLoc[locId] || [];
    const allCounted = partsInLoc.length > 0 && partsInLoc.every(p => counts[p.id] !== undefined);
    if (!allCounted) return 'pending';
    const hasDiff = partsInLoc.some(p => counts[p.id] !== p.stock);
    if (hasDiff && !confirmedDiffs[locId]) return 'diff';
    return 'done';
  };
  const total = targetLocations.length;
  const doneCount = targetLocations.filter(l => getLocStatus(l.id) === 'done').length;
  const diffCount = targetLocations.filter(l => getLocStatus(l.id) === 'diff').length;
  const pendingCount = targetLocations.filter(l => getLocStatus(l.id) === 'pending').length;
  const startCount = (loc: Location) => {
    setSelected(loc);
  };
  const updateCount = (partId: string, value: string) => {
    setCounts(c => ({ ...c, [partId]: Math.max(0, Number(value) || 0) }));
  };
  const approveDiff = async (loc: Location) => {
    const partsInLoc = partsByLoc[loc.id] || [];
    const items = partsInLoc
      .filter(p => counts[p.id] !== undefined)
      .map(p => ({ partId: p.id, locationId: loc.id, bookQty: p.stock, actualQty: counts[p.id], diffQty: counts[p.id] - p.stock }));

    try {
      // Save stocktake to DB via API
      await api.createStocktake({
        warehouse: loc.warehouse,
        startDate: new Date().toISOString().slice(0, 10),
        locationId: loc.id,
        items,
      });
      setConfirmedDiffs(c => ({ ...c, [loc.id]: true }));
      toast(`${loc.id} の棚卸し結果を保存・在庫を更新しました`);
      setSelected(null);
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };
  const downloadExcelTemplate = () => {
    const header = '\u30ED\u30B1\u30FC\u30B7\u30E7\u30F3ID,\u54C1\u756A,\u54C1\u540D,\u5E33\u7C3F\u6570,\u5B9F\u6570,\u5DEE\u7570,\u5099\u8003';
    const rows = targetLocations.flatMap(l => (partsByLoc[l.id] || []).map(p => `${l.id},${p.id},${p.name},${p.stock},,,""`));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stocktake_template_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('Excel\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u307E\u3057\u305F');
  };
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast('\u30C7\u30FC\u30BF\u884C\u304C\u3042\u308A\u307E\u305B\u3093'); return; }
      let imported = 0;
      lines.slice(1).forEach(line => {
        const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
        const partId = vals[1];
        const actual = Number(vals[4]);
        if (partId && !isNaN(actual) && vals[4] !== '') {
          setCounts(c => ({ ...c, [partId]: actual }));
          imported++;
        }
      });
      toast(`${imported}\u4EF6\u306E\u5B9F\u6570\u30C7\u30FC\u30BF\u3092\u53D6\u308A\u8FBC\u307F\u307E\u3057\u305F`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const handlePrint = () => {
    const printNode = document.getElementById('stocktake-printable');
    if (!printNode) return;
    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>\u68DA\u5378\u8868</title><meta charset="utf-8"/><style>
      body { font-family: -apple-system, "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif; padding: 20px; color: #0f172a; font-size: 12px; }
      h1 { font-size: 18px; margin-bottom: 4px; } h2 { font-size: 14px; margin-top: 16px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; } th, td { border: 1px solid #94a3b8; padding: 4px 6px; }
      th { background: #f1f5f9; } .right { text-align: right; }
    </style></head><body>${printNode.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };
  return (
    <div className="p-5 space-y-3">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold">棚卸し</h2>
            <div className="text-xs text-black">対象ロケーション: 全倉庫 ({locations.length}箇所)</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" icon={Printer} onClick={handlePrint}>棚卸表印刷</Btn>
            <ExcelImportDropdown onDownload={downloadExcelTemplate} onImport={() => excelInputRef.current?.click()} />
            <input ref={excelInputRef} type="file" accept=".csv,.xlsx" onChange={handleExcelImport} className="hidden" />
            <Btn icon={QrCode} onClick={() => setShowQrScanner(true)}>QR読取で開始</Btn>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { l: '\u9032\u6357', v: total > 0 ? Math.round(doneCount / total * 100) + '%' : '0%', c: 'text-black' },
            { l: '\u5B8C\u4E86', v: `${doneCount}/${total}`, c: 'text-emerald-600' },
            { l: '\u5DEE\u7570\u3042\u308A', v: String(diffCount), c: 'text-amber-600' },
            { l: '\u672A\u7740\u624B', v: String(pendingCount), c: 'text-black' },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded p-2.5">
              <div className="text-[11px] text-black">{k.l}</div>
              <div className={`text-xl font-bold ${k.c}`}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>
      {warehouseGroups.map(([wh, locs]) => (
        <div key={wh} className="bg-white rounded-lg border border-slate-200">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
            <Warehouse size={14} className="text-black" />
            <span className="font-bold text-sm">{wh}</span>
            <span className="text-xs text-black">({locs.length}{'\u30ED\u30B1\u30FC\u30B7\u30E7\u30F3'})</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-black uppercase">
              <tr>
                <th className="text-left px-4 py-2 font-medium">{'\u30ED\u30B1\u30FC\u30B7\u30E7\u30F3'}</th>
                <th className="text-right px-4 py-2 font-medium">{'\u54C1\u76EE\u6570'}</th>
                <th className="text-right px-4 py-2 font-medium">{'\u5E33\u7C3F\u5408\u8A08'}</th>
                <th className="text-right px-4 py-2 font-medium">{'\u5B9F\u6570\u5408\u8A08'}</th>
                <th className="text-right px-4 py-2 font-medium">{'\u5DEE\u7570'}</th>
                <th className="text-left px-4 py-2 font-medium">{'\u72B6\u614B'}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locs.map(l => {
                const partsInLoc = partsByLoc[l.id] || [];
                const bookTotal = partsInLoc.reduce((s, p) => s + p.stock, 0);
                const actualTotal = partsInLoc.reduce((s, p) => s + (counts[p.id] !== undefined ? counts[p.id] : 0), 0);
                const hasCount = partsInLoc.some(p => counts[p.id] !== undefined);
                const diffTotal = hasCount ? actualTotal - bookTotal : 0;
                const st = getLocStatus(l.id);
                const cls = st === 'done' ? 'bg-emerald-100 text-emerald-700' : st === 'diff' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-black';
                const lbl = st === 'done' ? '\u5B8C\u4E86' : st === 'diff' ? '\u5DEE\u7570\u3042\u308A' : '\u672A\u7740\u624B';
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2"><span className="font-mono inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-xs"><MapPin size={10} />{l.id}</span></td>
                    <td className="px-4 py-2 text-right">{partsInLoc.length}</td>
                    <td className="px-4 py-2 text-right font-mono">{bookTotal}</td>
                    <td className="px-4 py-2 text-right font-mono">{hasCount ? actualTotal : '\u2014'}</td>
                    <td className="px-4 py-2 text-right font-mono">{hasCount && diffTotal !== 0 ? <span className={diffTotal > 0 ? 'text-blue-600' : 'text-rose-600'}>{diffTotal > 0 ? '+' : ''}{diffTotal}</span> : '\u2014'}</td>
                    <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{lbl}</span></td>
                    <td className="px-4 py-2 text-right">
                      {partsInLoc.length === 0 ? <span className="text-xs text-black">{'\u90E8\u54C1\u306A\u3057'}</span>
                        : <Btn variant="ghost" size="sm" onClick={() => startCount(l)}>{st === 'pending' ? '\u5B9F\u67FB\u958B\u59CB' : '\u5B9F\u67FB\u7D50\u679C'}</Btn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Hidden printable stocktake sheet */}
      <div id="stocktake-printable" style={{ display: 'none' }}>
        <h1>{'\u68DA\u5378\u8868'}</h1>
        <div>{'\u65E5\u4ED8'}: {new Date().toLocaleDateString('ja-JP')} / {'\u5BFE\u8C61'}: A{'\u68DA'}\u30FBB{'\u68DA'}</div>
        {warehouseGroups.map(([wh, locs]) => (
          <div key={wh}>
            <h2>{wh}</h2>
            {locs.map(l => {
              const partsInLoc = partsByLoc[l.id] || [];
              if (partsInLoc.length === 0) return null;
              return (
                <div key={l.id}>
                  <div style={{ fontWeight: 'bold', marginTop: 8 }}>{l.id} - {l.name}</div>
                  <table>
                    <thead><tr><th>{'\u54C1\u756A'}</th><th>{'\u54C1\u540D'}</th><th className="right">{'\u5E33\u7C3F\u6570'}</th><th className="right">{'\u5B9F\u6570'}</th><th className="right">{'\u5DEE\u7570'}</th><th>{'\u5099\u8003'}</th></tr></thead>
                    <tbody>
                      {partsInLoc.map(p => (
                        <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td className="right">{p.stock}</td><td className="right"></td><td className="right"></td><td></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showQrScanner && (
        <Modal open onClose={() => setShowQrScanner(false)} title="QR読取でロケーション選択" size="md">
          <QrCameraScanner autoStart onScan={(text) => {
            setShowQrScanner(false);
            try {
              const data = JSON.parse(text);
              if (data.type === 'location') {
                const loc = targetLocations.find(l => l.id === data.id);
                if (loc) { setSelected(loc); toast(`ロケーション ${loc.id} を読み取りました`); }
                else toast('対象外のロケーションです');
              } else {
                const loc = targetLocations.find(l => l.id === text);
                if (loc) { setSelected(loc); toast(`ロケーション ${loc.id} を読み取りました`); }
                else toast('該当するロケーションが見つかりません');
              }
            } catch {
              const loc = targetLocations.find(l => l.id === text);
              if (loc) { setSelected(loc); toast(`ロケーション ${loc.id} を読み取りました`); }
              else toast('該当するロケーションが見つかりません');
            }
          }} />
          <div className="mt-3 text-center">
            <Btn variant="secondary" onClick={() => setShowQrScanner(false)}>キャンセル</Btn>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={'棚卸実査: ' + selected.id + ' - ' + selected.name} size="lg">
          <div className="bg-blue-50 border border-blue-200 rounded p-2.5 mb-3 text-xs text-blue-800 flex items-center gap-2">
            <QrCode size={14} /> {'\u5B9F\u6A5F\u3067\u306FQR\u30B3\u30FC\u30C9\u3092\u8AAD\u307F\u53D6\u3063\u3066\u5B9F\u6570\u3092\u5165\u529B\u3057\u307E\u3059\u3002\u3053\u3053\u3067\u306F\u624B\u5165\u529B\u3067\u52D5\u4F5C\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002'}
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-black border-b border-slate-200">
              <tr><th className="text-left py-2">{'\u54C1\u756A'}</th><th className="text-left py-2">{'\u54C1\u540D'}</th><th className="text-right py-2">{'\u5E33\u7C3F\u6570'}</th><th className="text-right py-2">{'\u5B9F\u6570'}</th><th className="text-right py-2">{'\u5DEE\u7570'}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(partsByLoc[selected.id] || []).map(p => {
                const actual = counts[p.id];
                const dif = actual !== undefined ? actual - p.stock : 0;
                return (
                  <tr key={p.id}>
                    <td className="py-2 font-mono text-xs">{p.id}</td>
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-right font-mono">{p.stock}</td>
                    <td className="py-2 text-right">
                      <input type="number" value={actual === undefined ? '' : actual} onChange={e => updateCount(p.id, e.target.value)} className="w-20 border border-slate-300 rounded px-2 py-1 text-right font-mono" />
                    </td>
                    <td className="py-2 text-right font-mono">
                      {actual !== undefined && dif !== 0 ? <span className={dif > 0 ? 'text-blue-600' : 'text-rose-600 font-bold'}>{dif > 0 ? '+' : ''}{dif}</span> : '\u2014'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <Btn variant="success" icon={CheckCircle2} onClick={() => approveDiff(selected)}>{'\u5DEE\u7570\u3092\u627F\u8A8D\u30FB\u5728\u5EAB\u66F4\u65B0'}</Btn>
            <Btn variant="secondary" onClick={() => setSelected(null)}>{'\u623B\u308B'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

const ReportsScreen = ({ toast }: { toast: (msg: string) => void }) => {
  const [downloading, setDownloading] = useState('');
  const reports = [
    { name: '在庫一覧表', type: 'inventory', icon: Package, desc: '全部品の在庫数・金額・状態を一覧出力' },
    { name: '滞留在庫レポート', type: 'slow_moving', icon: Clock, desc: '入出庫のない在庫を滞留日数順に表示' },
    { name: 'ABC分析', type: 'abc', icon: BarChart3, desc: '在庫金額の累計比率でA/B/Cランク分類' },
    { name: '回転率レポート', type: 'turnover', icon: TrendingUp, desc: '直近90日の出庫数から回転率を算出' },
    { name: '発注予定額', type: 'order_forecast', icon: ShoppingCart, desc: '発注点割れ部品の推奨発注数と予定額' },
    { name: 'メーカー欠品影響', type: 'shortage_impact', icon: AlertCircle, desc: '欠品部品が影響する製品・BOMを把握' },
    { name: '月次仕入集計', type: 'monthly_purchase', icon: Building2, desc: '仕入先別・月別の発注件数と金額' },
    { name: '棚卸結果報告書', type: 'stocktake_result', icon: ClipboardCheck, desc: '直近の棚卸し結果（帳簿vs実数の差異）' },
  ];
  const handleDownload = async (type: string, name: string) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      if (!res.ok) throw new Error('レポート生成に失敗しました');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`${name}をダウンロードしました`);
    } catch (e: any) { toast(`エラー: ${e.message}`); }
    setDownloading('');
  };
  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {reports.map(r => {
        const Icon = r.icon;
        return (
          <div key={r.name} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition">
            <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center mb-2"><Icon size={16} /></div>
            <div className="font-bold text-sm">{r.name}</div>
            <div className="text-xs text-black mt-1">{r.desc}</div>
            <button onClick={() => handleDownload(r.type, r.name)} disabled={downloading === r.type}
              className="mt-3 text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline disabled:opacity-50">
              {downloading === r.type ? <><Loader2 size={11} className="animate-spin" /> 生成中...</> : <><Download size={11} /> CSV出力</>}
            </button>
          </div>
        );
      })}
    </div>
  );
};

const LogsScreen = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [catFilter, setCatFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLogs({ limit: '200' }).then(res => { setLogs(res.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => catFilter === 'all' ? logs : logs.filter(l => l.category === catFilter), [catFilter, logs]);

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2">
        <Filter size={12} className="text-black" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="text-xs px-2 py-1 border border-slate-300 rounded text-black">
          <option value="all">全カテゴリ</option>
          {Object.entries(LOG_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-black">{filtered.length}件</span>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-black uppercase border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium">日時</th>
              <th className="text-left px-3 py-2 font-medium">ユーザー</th>
              <th className="text-left px-3 py-2 font-medium">カテゴリ</th>
              <th className="text-left px-3 py-2 font-medium">操作</th>
              <th className="text-left px-3 py-2 font-medium">対象</th>
              <th className="text-left px-3 py-2 font-medium">説明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(log => {
              const cat = LOG_CATEGORY[log.category];
              return (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs text-black whitespace-nowrap">{new Date(log.ts).toLocaleString('ja-JP')}</td>
                  <td className="px-3 py-2 text-xs">{log.userName}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${cat?.color || ''}`}>{cat?.label || log.category}</span></td>
                  <td className="px-3 py-2 text-xs font-semibold">{log.action}</td>
                  <td className="px-3 py-2 font-mono text-xs">{log.targetId}</td>
                  <td className="px-3 py-2 text-xs text-black max-w-xs truncate">{log.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ========================== Main App ==========================
// ========================== AI Chat ==========================
const ChatScreen = ({ toast }: { toast: (msg: string) => void }) => {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string; sources?: any[]; ts: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [chatTab, setChatTab] = useState<'chat' | 'docs'>('chat');
  const [knowledgeDocs, setKnowledgeDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.data || res || []);
    } catch { /* ignore */ }
    setConvsLoading(false);
  };

  const loadDocs = async () => {
    setDocsLoading(true);
    try { const res = await api.getKnowledgeDocs(); setKnowledgeDocs(res.data || []); } catch { /* ignore */ }
    setDocsLoading(false);
  };
  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadKnowledgeDoc(file);
      toast(`「${file.name}」をアップロードしました`);
      loadDocs();
    } catch (err: any) { toast(`エラー: ${err.message}`); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleDeleteDoc = async (doc: any) => {
    try { await api.deleteKnowledgeDoc(doc.id); toast(`「${doc.fileName}」を削除しました`); loadDocs(); }
    catch (err: any) { toast(`エラー: ${err.message}`); }
  };

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversation = async (id: string) => {
    try {
      const res = await api.getConversation(id);
      const conv = res.data || res;
      setSessionId(id);
      setMessages((conv.messages || []).map((m: any) => ({
        id: m.id || `m-${Date.now()}-${Math.random()}`,
        role: m.role,
        content: m.content,
        sources: m.sources,
        ts: m.created_at || m.ts || new Date().toISOString(),
      })));
    } catch { toast('会話の読み込みに失敗しました'); }
  };

  const startNewConversation = () => {
    setSessionId(undefined);
    setMessages([]);
    setInput('');
  };

  const handleCopy = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => toast('コピーしました')).catch(() => toast('コピーに失敗しました'));
    } else {
      toast('コピーに失敗しました');
    }
  };

  const handleSend = async (text?: string) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    const msgId = `u-${Date.now()}`;
    setMessages(prev => [...prev, { id: msgId, role: 'user', content: userMsg, ts: new Date().toISOString() }]);
    setLoading(true);
    try {
      const res = await api.chat(userMsg, sessionId);
      const data = res.data || res;
      if (!sessionId && data.sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.message || data.answer || '',
        sources: data.sources || [],
        ts: new Date().toISOString(),
      }]);
      loadConversations();
    } catch (e: any) {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: `エラー: ${e.message}`, ts: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ['在庫切れの部品は？', '発注中の部品一覧', '製造指図の進捗は？', 'メーカー欠品の状況', '発注点割れの部品', '最近の入庫履歴'];
  const isNoResult = (content: string) => content.includes('該当する情報が見つかりませんでした') || content.includes('見つかりません');

  return (
    <div className="p-5 flex h-[calc(100vh-60px)] gap-0">
      {/* Conversation sidebar */}
      <div className="w-56 bg-white rounded-l-lg border border-slate-200 border-r-0 flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-2 border-b border-slate-100">
          <button onClick={startNewConversation} className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded hover:bg-blue-700 transition">
            <Plus size={14} /> 新規会話
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5">
          {convsLoading ? (
            <div className="text-center py-4"><Loader2 size={16} className="animate-spin mx-auto text-black" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-xs text-black py-4">会話履歴はありません</div>
          ) : conversations.map((conv: any) => (
            <button key={conv.sessionId} onClick={() => loadConversation(conv.sessionId)}
              className={`w-full text-left px-2.5 py-2 rounded text-xs mb-0.5 transition ${conv.sessionId === sessionId ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-black hover:bg-slate-50'}`}>
              <div className="truncate">{conv.title || '無題の会話'}</div>
              <div className="text-[11px] text-black mt-0.5 truncate">
                {conv.createdAt ? new Date(conv.createdAt).toLocaleDateString('ja-JP') : ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-r-lg border border-slate-200 flex flex-col overflow-hidden">
        <div className="px-4 py-0 border-b border-slate-200 flex items-center gap-0">
          <button onClick={() => setChatTab('chat')} className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 ${chatTab === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-black'}`}>
            <Sparkles size={14} /> チャット
          </button>
          <button onClick={() => { setChatTab('docs'); loadDocs(); }} className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 ${chatTab === 'docs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-black'}`}>
            <FileText size={14} /> ドキュメント
          </button>
          {chatTab === 'chat' && sessionId && <span className="ml-auto text-xs text-black font-mono">#{sessionId.slice(0, 8)}</span>}
        </div>

        {chatTab === 'docs' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm">ナレッジドキュメント</h3>
                <p className="text-xs text-black">アップロードしたファイルの内容がAIチャットの回答に活用されます</p>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept=".txt,.csv,.tsv,.md,.json,.log,.pdf,.xlsx,.docx" onChange={handleUploadDoc} className="hidden" />
                <Btn icon={Plus} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? 'アップロード中...' : 'ファイルをアップロード'}
                </Btn>
              </div>
            </div>
            <div className="text-xs text-black mb-3">対応形式: TXT, CSV, JSON, Markdown, ログファイル（PDF/XLSX/DOCXは基本テキスト抽出のみ）</div>
            {docsLoading ? (
              <div className="text-center py-8"><Loader2 size={20} className="animate-spin mx-auto" /></div>
            ) : knowledgeDocs.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center">
                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-black font-medium">ドキュメントがまだありません</p>
                <p className="text-xs text-black mt-1">ファイルをアップロードすると、AIがその内容を参照して回答します</p>
                <button onClick={() => fileInputRef.current?.click()} className="mt-3 text-sm text-blue-600 hover:underline">ファイルを選択</button>
              </div>
            ) : (
              <div className="space-y-2">
                {knowledgeDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <FileText size={20} className="text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{doc.fileName}</div>
                      <div className="text-xs text-black">
                        {doc.fileType.toUpperCase()} / {(doc.fileSize / 1024).toFixed(1)}KB / {doc.chunkCount}チャンク
                        {doc.createdAt && ` / ${new Date(doc.createdAt).toLocaleDateString('ja-JP')}`}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteDoc(doc)} className="p-1.5 text-black hover:text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {chatTab === 'chat' && ( <>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-black mt-16">
              <Sparkles size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">AI に質問してみましょう</p>
              <p className="text-xs text-black mt-1">在庫・発注・製造データについて自然言語で質問できます</p>
              <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {suggestions.map(q => (
                  <button key={q} onClick={() => handleSend(q)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition">{q}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[75%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 rounded-xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-black rounded-tl-sm'}`}>
                  <div className="whitespace-pre-wrap">{m.content.replace(/\*\*(.+?)\*\*/g, '「$1」')}</div>
                </div>

                {/* No results warning */}
                {m.role === 'assistant' && isNoResult(m.content) && (
                  <div className="mt-2 flex items-start gap-2 border-l-4 border-amber-300 bg-amber-50 px-3 py-2 rounded-r text-xs text-amber-900">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">該当する情報が見つかりませんでした</p>
                      <p className="mt-1">キーワードを変えて再度お試しください。</p>
                    </div>
                  </div>
                )}

                {/* Sources */}
                {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.sources.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-md">
                        <FileText size={12} />
                        <span className="truncate max-w-[180px]">{s.filename || s.name || 'ソース'}</span>
                        {s.page_number != null && <span className="text-emerald-400">p.{s.page_number}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Copy button + timestamp */}
                <div className="flex items-center gap-2 mt-1">
                  {m.role === 'assistant' && (
                    <button onClick={() => handleCopy(m.content)} className="text-black hover:text-black p-0.5 rounded hover:bg-slate-100 transition" title="コピー">
                      <Copy size={12} />
                    </button>
                  )}
                  <span className="text-[11px] text-black">
                    {new Date(m.ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center"><Sparkles size={14} className="text-white" /></div>
              <div className="flex gap-1 bg-slate-100 px-4 py-3 rounded-xl">
                {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {messages.length > 0 && !input && (
          <div className="px-4 pb-1 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map(q => (
              <button key={q} onClick={() => handleSend(q)} className="text-[11px] px-2.5 py-1 bg-slate-50 text-black rounded-full hover:bg-slate-100 border border-slate-200 transition">{q}</button>
            ))}
          </div>
        )}
        <div className="border-t border-slate-200 p-3 flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); handleSend(); } }}
            placeholder="メッセージを入力...（⌘+Enter で送信）" rows={1}
            className="flex-1 resize-none px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 max-h-28"
            style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }} />
          <Btn variant="primary" icon={Send} onClick={() => handleSend()} disabled={loading || !input.trim()}>送信</Btn>
        </div>
        </> )}
      </div>
    </div>
  );
};

// ========================== Users Management ==========================
const UsersScreen = ({ toast }: { toast: (msg: string) => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState<any>(null);
  const [resetPwUser, setResetPwUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  const load = async () => {
    try {
      const [uRes, dRes] = await Promise.all([api.getUsers(), api.getDepartments()]);
      setUsers(uRes.data || []);
      setDepartments(dRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const handleDeleteUser = (user: any) => {
    setDeleteTarget(user);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget.id);
      toast(`${deleteTarget.name} を削除しました`);
      setDeleteTarget(null);
      load();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleToggleActive = async (user: any) => {
    if (user.isActive) {
      setConfirmDeactivate(user);
      return;
    }
    try {
      await api.updateUser(user.id, { isActive: true });
      toast(`${user.name} を有効化しました`);
      load();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const confirmDeactivateUser = async () => {
    if (!confirmDeactivate) return;
    try {
      await api.updateUser(confirmDeactivate.id, { isActive: false });
      toast(`${confirmDeactivate.name} を無効化しました`);
      setConfirmDeactivate(null);
      load();
    } catch (e: any) { toast(`エラー: ${e.message}`); setConfirmDeactivate(null); }
  };

  const handleResetPassword = async () => {
    if (!resetPwUser || !newPassword) return;
    try {
      await api.resetUserPassword(resetPwUser.id, newPassword);
      toast(`${resetPwUser.name} のパスワードをリセットしました`);
      setResetPwUser(null);
      setNewPassword('');
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) {
        await api.createUser(form);
        toast(`ユーザー「${form.name}」を招待しました`);
      } else {
        await api.updateUser(form.id, form);
        toast(`ユーザー「${form.name}」を更新しました`);
      }
      setShowNew(false); setEditing(null); load();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const roles = [
    { value: 'admin', label: '管理者', color: 'bg-red-100 text-red-800' },
    { value: 'manager', label: 'マネージャー', color: 'bg-blue-100 text-blue-800' },
    { value: 'accountant', label: '経理', color: 'bg-purple-100 text-purple-800' },
    { value: 'user', label: '一般', color: 'bg-slate-100 text-black' },
  ];

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.loginId || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="名前・メール・IDで検索..." className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <span className="text-xs text-black">{filteredUsers.length}件</span>
        <div className="ml-auto">
          <Btn icon={UserPlus} onClick={() => setShowNew(true)}>ユーザー招待</Btn>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-black uppercase border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium">名前</th>
              <th className="text-left px-3 py-2 font-medium">社内ID</th>
              <th className="text-left px-3 py-2 font-medium">メール</th>
              <th className="text-left px-3 py-2 font-medium">ロール</th>
              <th className="text-left px-3 py-2 font-medium">部署</th>
              <th className="text-left px-3 py-2 font-medium">最終ログイン</th>
              <th className="text-left px-3 py-2 font-medium">状態</th>
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u: any) => {
              const r = roles.find(x => x.value === u.role);
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold">{u.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.loginId}</td>
                  <td className="px-3 py-2 text-xs">{u.email}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${r?.color || ''}`}>{r?.label || u.role}</span></td>
                  <td className="px-3 py-2 text-xs">{u.department || '-'}</td>
                  <td className="px-3 py-2 text-xs text-black">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ja-JP') : '-'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleToggleActive(u)} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-black'}`}>
                      {u.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}{u.isActive ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditing(u)}>編集</Btn>
                      <button onClick={() => { setResetPwUser(u); setNewPassword(''); }} className="text-xs text-black hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition flex items-center gap-1" title="パスワードリセット">
                        <KeyRound size={11} /> PW
                      </button>
                      <button onClick={() => handleDeleteUser(u)} className="text-xs text-black hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 transition flex items-center gap-1" title="削除">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-black">該当するユーザーが見つかりません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User create/edit modal */}
      {(showNew || editing) && (
        <Modal open onClose={() => { setShowNew(false); setEditing(null); }} title={showNew ? 'ユーザー招待' : 'ユーザー編集'} size="md">
          <UserForm user={editing} isNew={showNew} departments={departments} roles={roles} onSave={handleSave} onClose={() => { setShowNew(false); setEditing(null); }} />
        </Modal>
      )}

      {/* Deactivation confirmation modal */}
      {confirmDeactivate && (
        <Modal open onClose={() => setConfirmDeactivate(null)} title="ユーザー無効化の確認" size="sm">
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">本当に無効化しますか？</p>
                <p className="text-amber-700 mt-1">「{confirmDeactivate.name}」({confirmDeactivate.email}) はログインできなくなります。</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Btn variant="secondary" onClick={() => setConfirmDeactivate(null)}>キャンセル</Btn>
              <Btn variant="danger" onClick={confirmDeactivateUser}>無効化する</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Password reset modal */}
      {resetPwUser && (
        <Modal open onClose={() => setResetPwUser(null)} title={`パスワードリセット: ${resetPwUser.name}`} size="sm">
          <div className="space-y-3 text-sm">
            <Field label="新しいパスワード*">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="新しいパスワードを入力" />
            </Field>
            <div className="flex gap-2 justify-end pt-2">
              <Btn variant="secondary" onClick={() => setResetPwUser(null)}>キャンセル</Btn>
              <Btn variant="primary" icon={KeyRound} onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 4}>リセット</Btn>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="ユーザー削除の確認" size="sm">
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <Trash2 size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-800">本当に削除しますか？</p>
                <p className="text-rose-700 mt-1">「{deleteTarget.name}」({deleteTarget.email}) を削除します。この操作は取り消せません。</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Btn variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Btn>
              <Btn variant="danger" icon={Trash2} onClick={confirmDeleteUser}>削除する</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const UserForm = ({ user, isNew, departments, roles, onSave, onClose }: any) => {
  const [form, setForm] = useState(() => user || { loginId: '', email: '', name: '', role: 'user', departmentId: null, password: '' });
  const upd = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3 text-sm">
      <Field label="名前*"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
      <Field label="メールアドレス*"><input type="email" value={form.email || ''} onChange={e => upd('email', e.target.value)} className={inputClass} placeholder={isNew ? '招待メールを送信します' : ''} /></Field>
      {isNew && <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">招待メールが送信され、ユーザーが初回アクセス時にパスワードを設定します</div>}
      <Field label="ロール">
        <select value={form.role} onChange={e => upd('role', e.target.value)} className={inputClass}>
          {roles.map((r: any) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>
      <Field label="部署">
        <select value={form.departmentId || ''} onChange={e => upd('departmentId', e.target.value ? Number(e.target.value) : null)} className={inputClass}>
          <option value="">未所属</option>
          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.name || !form.email}>{isNew ? '招待メール送信' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </div>
  );
};

// ========================== Departments ==========================
const totalDeptUserCount = (node: any): number => {
  const own = node.userCount || 0;
  const childrenCount = (node.children || []).reduce((s: number, c: any) => s + totalDeptUserCount(c), 0);
  return own + childrenCount;
};

const DepartmentsScreen = ({ toast }: { toast: (msg: string) => void }) => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [addChildParent, setAddChildParent] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const load = async () => {
    try { const res = await api.getDepartments(); setDepartments(res.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) { await api.createDepartment(form); toast(`部署「${form.name}」を作成しました`); }
      else { await api.updateDepartment(form.id, form); toast(`部署「${form.name}」を更新しました`); }
      setShowNew(false); setEditing(null); setAddChildParent(null); load();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.deleteDepartment(deleteTarget.id); toast(`部署「${deleteTarget.name}」を削除しました`); setDeleteTarget(null); load(); }
    catch (e: any) { toast(`エラー: ${e.message}`); setDeleteTarget(null); }
  };

  // Build tree structure
  const tree = useMemo(() => {
    const roots = departments.filter(d => !d.parentId);
    const getChildren = (parentId: number): any[] => departments.filter(d => d.parentId === parentId).map(d => ({ ...d, children: getChildren(d.id) }));
    return roots.map(d => ({ ...d, children: getChildren(d.id) }));
  }, [departments]);

  const renderNode = (node: any, depth: number = 0): React.ReactNode => {
    const isRoot = depth === 0;
    const count = totalDeptUserCount(node);
    const hasChildren = (node.children?.length ?? 0) > 0;
    return (
      <div key={node.id}>
        <div className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100`} style={{ paddingLeft: `${16 + depth * 32}px` }}>
          {/* Tree line indicator */}
          {!isRoot && <span className="text-black text-sm mr-0.5 flex-shrink-0">└</span>}

          {/* Hierarchy icon */}
          <Building size={14} className={isRoot ? 'text-blue-500' : 'text-black'} />

          {/* Name */}
          <span className={`flex-1 min-w-0 truncate ${isRoot ? 'font-bold text-black' : 'font-medium text-black'}`}>{node.name}</span>

          {/* Department level badge */}
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isRoot ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-600'}`}>
            {isRoot ? '部' : '課'}
          </span>

          {/* Recursive user count */}
          <span className="text-xs text-black flex-shrink-0">{count}名</span>

          {node.code && <span className="text-xs font-mono text-black flex-shrink-0">{node.code}</span>}

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isRoot && (
              <button onClick={() => { setAddChildParent(node); setEditing(null); setShowNew(false); }}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded border border-emerald-200 transition">
                <PlusCircle size={12} /> 課を追加
              </button>
            )}
            <Btn variant="ghost" size="sm" icon={Edit} onClick={() => { setEditing(node); setAddChildParent(null); }}>編集</Btn>
            <button onClick={() => setDeleteTarget(node)} className="text-rose-400 hover:bg-rose-50 hover:text-rose-500 p-1 rounded transition"><Trash2 size={13} /></button>
          </div>
        </div>
        {hasChildren && node.children.map((c: any) => renderNode(c, depth + 1))}
      </div>
    );
  };

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-black">部 → 課 の階層構造（最大2階層）</p>
        <Btn icon={Plus} onClick={() => { setShowNew(true); setEditing(null); setAddChildParent(null); }}>部署追加</Btn>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {tree.length === 0 ? (
          <div className="p-6 text-center text-sm text-black">部署がまだ登録されていません</div>
        ) : tree.map(n => renderNode(n))}
      </div>

      {/* Create / Edit modal */}
      {(showNew || editing || addChildParent) && (
        <Modal open onClose={() => { setShowNew(false); setEditing(null); setAddChildParent(null); }}
          title={editing ? '部署編集' : addChildParent ? `「${addChildParent.name}」に課を追加` : '部署追加'} size="md">
          <DeptForm dept={editing} isNew={!editing} departments={departments} parentId={addChildParent?.id || null}
            onSave={handleSave} onClose={() => { setShowNew(false); setEditing(null); setAddChildParent(null); }} />
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="部署を削除" size="sm">
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertTriangle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-800">「{deleteTarget.name}」を削除しますか？</p>
                <p className="text-rose-600 mt-1">ユーザーが所属している場合、または子部門が存在する場合は削除できません。</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Btn variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Btn>
              <Btn variant="danger" icon={Trash2} onClick={handleDelete}>削除</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const DeptForm = ({ dept, isNew, departments, parentId, onSave, onClose }: any) => {
  const [form, setForm] = useState(() => dept || { name: '', code: '', parentId: parentId || null, description: '', sortOrder: 0 });
  const upd = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!dept && parentId) setForm((p: any) => ({ ...p, parentId }));
  }, [dept, parentId]);

  return (
    <div className="space-y-3 text-sm">
      <Field label="部署名*"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} placeholder="例: 製造部、設計課" /></Field>
      <Field label="コード"><input value={form.code || ''} onChange={e => upd('code', e.target.value)} className={inputClass} /></Field>
      <Field label="親部署">
        <select value={form.parentId || ''} onChange={e => upd('parentId', e.target.value ? Number(e.target.value) : null)} className={inputClass}>
          <option value="">なし（部レベル）</option>
          {departments.filter((d: any) => d.id !== form.id && !d.parentId).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <p className="mt-1 text-xs text-black">親なし = 部 / 親あり = 課</p>
      </Field>
      <Field label="説明"><input value={form.description || ''} onChange={e => upd('description', e.target.value)} className={inputClass} /></Field>
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.name}>{isNew ? '作成' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </div>
  );
};

// ========================== Entities ==========================
const ENTITY_TYPES = [
  { value: 'COMPANY_NAME', label: '会社名', color: 'bg-blue-100 text-blue-800' },
  { value: 'PERSON_NAME', label: '担当者', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'CONTRACT_AMOUNT', label: '契約金額', color: 'bg-amber-100 text-amber-900' },
  { value: 'PAYMENT_TERMS', label: '支払条件', color: 'bg-purple-100 text-purple-800' },
  { value: 'CONTRACT_DATE', label: '契約日', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'PRODUCT_NAME', label: '製品名', color: 'bg-pink-100 text-pink-800' },
  { value: 'CREDIT_LIMIT', label: '与信限度額', color: 'bg-orange-100 text-orange-800' },
  { value: 'OTHER', label: 'その他', color: 'bg-slate-100 text-black' },
];

const EntitiesScreen = ({ toast }: { toast: (msg: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'extracted' | 'master'>('extracted');

  // -- Extracted entities state --
  const [entities, setEntities] = useState<any[]>([]);
  const [entLoading, setEntLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editNorm, setEditNorm] = useState('');

  // -- Entity masters state --
  const [masters, setMasters] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [showMasterNew, setShowMasterNew] = useState(false);
  const [editingMaster, setEditingMaster] = useState<any>(null);
  const [deleteMasterTarget, setDeleteMasterTarget] = useState<any>(null);

  const loadEntities = async () => {
    setEntLoading(true);
    try {
      const params: Record<string, string> = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      const res = await api.getEntities(params);
      setEntities(res.data || []);
    } catch (e) { console.error(e); }
    setEntLoading(false);
  };

  const loadMasters = async () => {
    setMasterLoading(true);
    try {
      const res = await api.getEntityMasters();
      setMasters(res.data || []);
    } catch (e) { console.error(e); }
    setMasterLoading(false);
  };

  useEffect(() => { loadEntities(); }, [typeFilter]);
  useEffect(() => { if (activeTab === 'master') loadMasters(); }, [activeTab]);

  const handleInlineEdit = async (id: string) => {
    try {
      await api.updateEntity(id as any, { normalizedValue: editNorm });
      toast('正規化値を更新しました');
      setEditingEntityId(null);
      loadEntities();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleVerify = async (entity: any) => {
    try { await api.updateEntity(entity.id, { isVerified: !entity.isVerified }); toast(`${entity.isVerified ? '未検証に戻しました' : '検証済みにしました'}`); loadEntities(); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleSaveMaster = async (form: any, isNew: boolean) => {
    try {
      if (isNew) { await api.createEntityMaster(form); toast(`マスタ「${form.canonicalValue}」を作成しました`); }
      else { await api.updateEntityMaster(form.id, form); toast(`マスタ「${form.canonicalValue}」を更新しました`); }
      setShowMasterNew(false); setEditingMaster(null); loadMasters();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleDeleteMaster = async () => {
    if (!deleteMasterTarget) return;
    try { await api.deleteEntityMaster(deleteMasterTarget.id); toast('マスタを削除しました'); setDeleteMasterTarget(null); loadMasters(); }
    catch (e: any) { toast(`エラー: ${e.message}`); setDeleteMasterTarget(null); }
  };

  return (
    <div className="p-5 space-y-3">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-1">
        {([
          { key: 'extracted' as const, label: '抽出エンティティ' },
          { key: 'master' as const, label: 'エンティティマスタ' },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${activeTab === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-black hover:text-black'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---- Extracted Entities Tab ---- */}
      {activeTab === 'extracted' && (
        <>
          <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2">
            <Filter size={12} className="text-black" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-xs px-2 py-1 border border-slate-300 rounded text-black">
              <option value="all">すべての種別</option>
              {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <span className="ml-auto text-xs text-black">{entities.length}件</span>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {entLoading ? (
              <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-black" /></div>
            ) : entities.length === 0 ? (
              <div className="py-12 text-center text-sm text-black">エンティティがありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-black uppercase border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">種別</th>
                    <th className="text-left px-3 py-2 font-medium">抽出値</th>
                    <th className="text-left px-3 py-2 font-medium">正規化値</th>
                    <th className="text-left px-3 py-2 font-medium">文書数</th>
                    <th className="text-left px-3 py-2 font-medium">マスタ</th>
                    <th className="text-left px-3 py-2 font-medium">検証</th>
                    <th className="px-3 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entities.map((e: any) => {
                    const t = ENTITY_TYPES.find(x => x.value === e.entityType);
                    return (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${t?.color || 'bg-slate-100 text-black'}`}>{t?.label || e.entityType}</span></td>
                        <td className="px-3 py-2 font-medium">{e.entityValue || e.name}</td>
                        <td className="px-3 py-2">
                          {editingEntityId === e.id ? (
                            <div className="flex gap-1 items-center">
                              <input type="text" value={editNorm} onChange={ev => setEditNorm(ev.target.value)}
                                className="w-32 rounded border border-blue-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus
                                onKeyDown={ev => ev.key === 'Enter' && handleInlineEdit(e.id)} />
                              <button onClick={() => handleInlineEdit(e.id)} className="text-emerald-600 hover:text-emerald-700 text-xs font-bold">OK</button>
                              <button onClick={() => setEditingEntityId(null)} className="text-black text-xs">X</button>
                            </div>
                          ) : (
                            <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => { setEditingEntityId(e.id); setEditNorm(e.normalizedValue || ''); }}>
                              {e.normalizedValue || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-black">{e.documentCount || e.sourceCount || 1}件</td>
                        <td className="px-3 py-2">
                          {e.isMatchedMaster ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> 一致</span>
                          ) : (
                            <span className="text-xs text-black">未登録</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleVerify(e)} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${e.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {e.isVerified ? <><Shield size={10} /> 検証済</> : '未検証'}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => { setEditingEntityId(e.id); setEditNorm(e.normalizedValue || ''); }} className="text-black hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition">
                            <Edit size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ---- Entity Masters Tab ---- */}
      {activeTab === 'master' && (
        <>
          <div className="flex justify-end">
            <Btn icon={Plus} onClick={() => { setEditingMaster(null); setShowMasterNew(true); }}>新規マスタ</Btn>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {masterLoading ? (
              <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-black" /></div>
            ) : masters.length === 0 ? (
              <div className="py-12 text-center text-sm text-black">マスタがありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-black uppercase border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">種別</th>
                    <th className="text-left px-3 py-2 font-medium">正規化値</th>
                    <th className="text-left px-3 py-2 font-medium">エイリアス</th>
                    <th className="px-3 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masters.map((m: any) => {
                    const t = ENTITY_TYPES.find(x => x.value === m.entityType);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${t?.color || 'bg-slate-100 text-black'}`}>{t?.label || m.entityType}</span></td>
                        <td className="px-3 py-2 font-semibold">{m.canonicalValue}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(m.aliases || []).map((a: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-black">
                                <Tag size={10} className="text-black" /> {a}
                              </span>
                            ))}
                            {(!m.aliases || m.aliases.length === 0) && <span className="text-xs text-black">-</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Btn variant="ghost" size="sm" icon={Edit} onClick={() => { setEditingMaster(m); setShowMasterNew(false); }}>編集</Btn>
                            <button onClick={() => setDeleteMasterTarget(m)} className="text-xs text-rose-500 hover:bg-rose-50 px-2 py-1 rounded transition">削除</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Master create/edit modal */}
      {(showMasterNew || editingMaster) && (
        <Modal open onClose={() => { setShowMasterNew(false); setEditingMaster(null); }}
          title={editingMaster ? 'エンティティマスタ編集' : '新規エンティティマスタ'} size="md">
          <EntityMasterForm master={editingMaster} isNew={!editingMaster} onSave={handleSaveMaster} onClose={() => { setShowMasterNew(false); setEditingMaster(null); }} />
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteMasterTarget && (
        <Modal open onClose={() => setDeleteMasterTarget(null)} title="マスタを削除" size="sm">
          <div className="space-y-4 text-sm">
            <p>「{deleteMasterTarget.canonicalValue}」を削除しますか？</p>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setDeleteMasterTarget(null)}>キャンセル</Btn>
              <Btn variant="danger" icon={Trash2} onClick={handleDeleteMaster}>削除</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const EntityMasterForm = ({ master, isNew, onSave, onClose }: any) => {
  const [form, setForm] = useState(() => master || { entityType: 'COMPANY_NAME', canonicalValue: '', aliases: [] });
  const [aliasInput, setAliasInput] = useState('');
  const upd = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const addAlias = () => {
    const val = aliasInput.trim();
    if (val && !(form.aliases || []).includes(val)) {
      upd('aliases', [...(form.aliases || []), val]);
      setAliasInput('');
    }
  };

  const removeAlias = (idx: number) => {
    upd('aliases', (form.aliases || []).filter((_: any, i: number) => i !== idx));
  };

  return (
    <div className="space-y-3 text-sm">
      {isNew && (
        <Field label="種別*">
          <select value={form.entityType} onChange={e => upd('entityType', e.target.value)} className={inputClass}>
            {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      )}
      <Field label="正規化値（canonical）*">
        <input value={form.canonicalValue || ''} onChange={e => upd('canonicalValue', e.target.value)} className={inputClass} placeholder="例: ジャパンマリンユナイテッド株式会社" />
      </Field>
      <Field label="エイリアス（類似表記）">
        <div className="flex gap-2">
          <input value={aliasInput} onChange={e => setAliasInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAlias())}
            placeholder="例: JMU" className={inputClass + ' flex-1'} />
          <Btn variant="secondary" size="sm" onClick={addAlias}>追加</Btn>
        </div>
        {(form.aliases || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(form.aliases || []).map((a: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs text-blue-700">
                {a}
                <button onClick={() => removeAlias(i)} className="text-blue-400 hover:text-red-500 ml-0.5 font-bold">x</button>
              </span>
            ))}
          </div>
        )}
      </Field>
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!(form.canonicalValue || '').trim()}>{isNew ? '作成' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </div>
  );
};

// ========================== Settings ==========================
// ========================== QR Camera Scanner ==========================
const QrCameraScanner = ({ onScan, autoStart = false }: { onScan: (text: string) => void; autoStart?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const scannerRef = useRef<any>(null);

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch { /* ignore */ }
      try { scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setPhase('idle');
  }, []);

  const startCamera = async () => {
    setPhase('starting');
    setErrorMsg('');
    setDebugInfo('カメラを初期化中...');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setDebugInfo('ライブラリ読込完了。カメラを起動中...');

      const scannerId = 'qr-scanner-' + Date.now();
      const container = containerRef.current;
      if (!container) { setPhase('error'); setErrorMsg('コンテナが見つかりません'); return; }

      // Create scanner element
      let scannerEl = container.querySelector('#qr-reader') as HTMLDivElement;
      if (scannerEl) scannerEl.remove();
      scannerEl = document.createElement('div');
      scannerEl.id = scannerId;
      scannerEl.style.width = '100%';
      container.prepend(scannerEl);

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText: string) => {
          onScan(decodedText);
          stopCamera();
        },
        () => { /* ignore scan failures */ }
      );

      setPhase('active');
      setDebugInfo('');
    } catch (err: any) {
      stopCamera();
      const msg = err?.message || String(err);
      setDebugInfo(`エラー詳細: ${msg}`);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setErrorMsg('カメラの使用が許可されていません。ブラウザ設定でカメラを許可してください。');
      } else if (msg.includes('NotFound') || msg.includes('Requested device not found')) {
        setErrorMsg('カメラが見つかりません。');
      } else {
        setErrorMsg(`カメラを起動できません: ${msg}`);
      }
      setPhase('error');
    }
  };

  useEffect(() => {
    if (autoStart) { startCamera(); }
    return () => { stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef}>
      {(phase === 'idle' || phase === 'error') && (
        <div className="bg-slate-900 rounded-xl flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
          style={{ minHeight: '280px' }} onClick={startCamera}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40" />
          <Camera size={48} className="text-white/50 mb-3 relative z-10" />
          <div className="text-white text-sm font-medium relative z-10">タップしてカメラを起動</div>
          <div className="text-cyan-300 text-xs mt-1 relative z-10">QRコードを読み取ります</div>
          {errorMsg && <div className="absolute bottom-3 left-3 right-3 bg-red-600 rounded px-3 py-2 text-xs text-white z-10">{errorMsg}</div>}
          {debugInfo && <div className="absolute top-3 left-3 right-3 bg-yellow-600 rounded px-3 py-2 text-xs text-white z-10">{debugInfo}</div>}
        </div>
      )}

      {phase === 'starting' && (
        <div className="bg-slate-900 rounded-xl flex flex-col items-center justify-center" style={{ minHeight: '280px' }}>
          <Loader2 size={32} className="text-cyan-400 animate-spin mb-2" />
          <div className="text-white text-sm">カメラを起動中...</div>
          {debugInfo && <div className="text-cyan-300 text-xs mt-2">{debugInfo}</div>}
        </div>
      )}

      {phase === 'active' && (
        <div className="relative">
          <div className="flex justify-center mt-3">
            <button onClick={stopCamera} className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 py-2 text-sm font-medium flex items-center gap-2">
              <X size={16} /> カメラを停止
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================== QR Code ==========================
const QrScreen = ({ parts, locations, toast }: { parts: Part[]; locations: Location[]; toast: (msg: string) => void }) => {
  const [tab, setTab] = useState<'parts' | 'locations' | 'scan'>('scan');
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
  const [selectedLocs, setSelectedLocs] = useState<Set<string>>(new Set());
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanInput, setScanInput] = useState('');

  const togglePart = (id: string) => setSelectedParts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleLoc = (id: string) => setSelectedLocs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handlePrintSelected = (type: 'part' | 'location') => {
    const ids = type === 'part' ? Array.from(selectedParts) : Array.from(selectedLocs);
    if (ids.length === 0) { toast('印刷する項目を選択してください'); return; }
    // Open each in new window for printing
    ids.forEach(id => window.open(`/api/qr?type=${type}&id=${id}&format=label`, '_blank'));
  };

  const handlePrintAll = (type: string) => {
    window.open(`/api/qr/batch?type=${type}`, '_blank');
  };

  const handleScanText = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data.type === 'part') {
        const part = parts.find(p => p.id === data.id);
        setScanResult(part ? { type: 'part', data: part } : { type: 'error', message: '部品が見つかりません' });
        if (part) toast(`部品を検出: ${part.name}`);
      } else if (data.type === 'location') {
        const loc = locations.find(l => l.id === data.id);
        const locParts = parts.filter(p => p.location === data.id);
        setScanResult(loc ? { type: 'location', data: loc, parts: locParts } : { type: 'error', message: 'ロケーションが見つかりません' });
        if (loc) toast(`ロケーションを検出: ${loc.id}`);
      }
    } catch {
      const part = parts.find(p => p.id === text || p.code === text);
      if (part) { setScanResult({ type: 'part', data: part }); toast(`部品を検出: ${part.name}`); return; }
      const loc = locations.find(l => l.id === text);
      if (loc) { setScanResult({ type: 'location', data: loc, parts: parts.filter(p => p.location === loc.id) }); toast(`ロケーションを検出: ${loc.id}`); return; }
      setScanResult({ type: 'error', message: '該当するデータが見つかりません' });
    }
  };

  const handleScan = () => handleScanText(scanInput);

  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex border-b border-slate-200 px-2">
          {[
            { id: 'parts' as const, label: '部品QR', icon: Package },
            { id: 'locations' as const, label: 'ロケーションQR', icon: MapPin },
            { id: 'scan' as const, label: 'スキャン', icon: ScanLine },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-black hover:text-black'}`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {tab === 'parts' && (
          <div>
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Btn size="sm" icon={Printer} variant="primary" onClick={() => handlePrintSelected('part')} disabled={selectedParts.size === 0}>選択を印刷 ({selectedParts.size})</Btn>
              <Btn size="sm" icon={Printer} variant="secondary" onClick={() => handlePrintAll('parts')}>全部品ラベル一括印刷</Btn>
              <button onClick={() => setSelectedParts(new Set(parts.map(p => p.id)))} className="text-xs text-blue-600 hover:underline ml-auto">全選択</button>
              <button onClick={() => setSelectedParts(new Set())} className="text-xs text-black hover:underline">全解除</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs text-black border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 w-8"><input type="checkbox" checked={selectedParts.size === parts.length} onChange={() => setSelectedParts(selectedParts.size === parts.length ? new Set() : new Set(parts.map(p => p.id)))} /></th>
                  <th className="text-left px-3 py-2 font-medium">品番</th>
                  <th className="text-left px-3 py-2 font-medium">品名</th>
                  <th className="text-left px-3 py-2 font-medium">棚位置</th>
                  <th className="px-3 py-2 font-medium">QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2"><input type="checkbox" checked={selectedParts.has(p.id)} onChange={() => togglePart(p.id)} /></td>
                    <td className="px-3 py-2"><div className="font-mono text-xs">{p.id}</div><div className="font-mono text-[11px] text-black">{p.code}</div></td>
                    <td className="px-3 py-2 text-sm">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.location}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => window.open(`/api/qr?type=part&id=${p.id}&format=label`, '_blank')} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="QRラベル印刷">
                        <QrCode size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'locations' && (
          <div>
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Btn size="sm" icon={Printer} variant="primary" onClick={() => handlePrintSelected('location')} disabled={selectedLocs.size === 0}>選択を印刷 ({selectedLocs.size})</Btn>
              <Btn size="sm" icon={Printer} variant="secondary" onClick={() => handlePrintAll('locations')}>全ロケーション一括印刷</Btn>
              <button onClick={() => setSelectedLocs(new Set(locations.map(l => l.id)))} className="text-xs text-blue-600 hover:underline ml-auto">全選択</button>
              <button onClick={() => setSelectedLocs(new Set())} className="text-xs text-black hover:underline">全解除</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs text-black border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 w-8"><input type="checkbox" checked={selectedLocs.size === locations.length} onChange={() => setSelectedLocs(selectedLocs.size === locations.length ? new Set() : new Set(locations.map(l => l.id)))} /></th>
                  <th className="text-left px-3 py-2 font-medium">ロケーションID</th>
                  <th className="text-left px-3 py-2 font-medium">倉庫</th>
                  <th className="text-left px-3 py-2 font-medium">名称</th>
                  <th className="text-left px-3 py-2 font-medium">タイプ</th>
                  <th className="px-3 py-2 font-medium">QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2"><input type="checkbox" checked={selectedLocs.has(l.id)} onChange={() => toggleLoc(l.id)} /></td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{l.id}</td>
                    <td className="px-3 py-2 text-xs">{l.warehouse}</td>
                    <td className="px-3 py-2 text-sm">{l.name}</td>
                    <td className="px-3 py-2 text-xs"><span className="px-1.5 py-0.5 bg-slate-100 rounded">{l.locType}</span></td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => window.open(`/api/qr?type=location&id=${l.id}&format=label`, '_blank')} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="QRラベル印刷">
                        <QrCode size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'scan' && (
          <div className="p-5">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Live camera QR scanner */}
              <QrCameraScanner autoStart onScan={(text) => { setScanInput(text); handleScanText(text); }} />

              {/* Manual input fallback */}
              <div className="text-xs text-black text-center">または手入力で検索</div>
              <div className="flex gap-2">
                <input value={scanInput} onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  placeholder="品番 (PT00012345) またはロケーションID (A-03-2-L)"
                  className={`${inputClass} flex-1 font-mono`} />
                <Btn variant="primary" icon={Search} onClick={handleScan}>検索</Btn>
              </div>

              {/* Last scan result */}
              {scanResult?.type === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{scanResult.message}</div>
              )}
              {scanResult?.type === 'part' && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="text-xs text-black mb-2">直近の読取結果</div>
                  <div className="flex items-center gap-3">
                    <QrCode size={40} className="text-black" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-black">{scanResult.data.id}</div>
                      <div className="font-bold truncate">{scanResult.data.name}</div>
                      <div className="text-xs text-black mt-0.5">在庫: {scanResult.data.stock} {scanResult.data.unit} / 棚: {scanResult.data.location}</div>
                    </div>
                    <ChevronRight size={16} className="text-black" />
                  </div>
                </div>
              )}
              {scanResult?.type === 'location' && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="text-xs text-black mb-2">直近の読取結果</div>
                  <div className="flex items-center gap-3">
                    <QrCode size={40} className="text-black" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-black">{scanResult.data.id}</div>
                      <div className="font-bold truncate">{scanResult.data.name} ({scanResult.data.warehouse})</div>
                      <div className="text-xs text-black mt-0.5">格納部品: {scanResult.parts?.length || 0}件</div>
                    </div>
                    <ChevronRight size={16} className="text-black" />
                  </div>
                </div>
              )}
              {!scanResult && parts.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="text-xs text-black mb-2">直近の読取結果</div>
                  <div className="flex items-center gap-3">
                    <QrCode size={40} className="text-black" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-black">{parts[0].id}</div>
                      <div className="font-bold truncate">{parts[0].name}</div>
                    </div>
                    <ChevronRight size={16} className="text-black" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================== Settings ==========================
const SettingsScreen = ({ toast, chatWidgetEnabled, setChatWidgetEnabled }: {
  toast: (msg: string) => void; chatWidgetEnabled: boolean; setChatWidgetEnabled: (v: boolean) => void;
}) => {
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [userId, setUserId] = useState<number>(1);

  useEffect(() => {
    api.getMe().then((res: any) => {
      if (res.data) {
        setProfileName(res.data.name);
        setProfileEmail(res.data.email);
        setUserId(res.data.id);
      }
      setProfileLoading(false);
    }).catch(() => setProfileLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) { toast('名前を入力してください'); return; }
    setProfileSaving(true);
    try {
      await api.updateUser(userId, { name: profileName.trim() });
      toast('プロフィールを更新しました');
    } catch (e: any) { toast(`エラー: ${e.message}`); }
    setProfileSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPw.length < 6) { toast('パスワードは6文字以上で入力してください'); return; }
    if (newPw !== confirmPw) { toast('新しいパスワードが一致しません'); return; }
    setPwLoading(true);
    try {
      await api.updateUser(userId, { password: newPw });
      toast('パスワードを変更しました');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) { toast(`エラー: ${e.message}`); }
    setPwLoading(false);
  };

  return (
    <div className="p-5 space-y-6 max-w-2xl">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2"><Users size={16} /> プロフィール</h2>
        {profileLoading ? (
          <div className="text-center py-4"><Loader2 size={16} className="animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-3">
            <Field label="表示名"><input value={profileName} onChange={e => setProfileName(e.target.value)} className={inputClass} /></Field>
            <Field label="メールアドレス"><input value={profileEmail} disabled className={`${inputClass} bg-slate-50`} /></Field>
            <Btn variant="primary" icon={Save} onClick={handleSaveProfile} disabled={profileSaving || !profileName.trim()}>
              {profileSaving ? '保存中...' : '保存'}
            </Btn>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2"><KeyRound size={16} /> パスワード変更</h2>
        <div className="space-y-3">
          <Field label="現在のパスワード"><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className={inputClass} /></Field>
          <Field label="新しいパスワード"><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inputClass} placeholder="6文字以上" /></Field>
          <Field label="新しいパスワード（確認）"><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputClass} /></Field>
          <Btn variant="primary" icon={Save} onClick={handleChangePassword} disabled={pwLoading || !currentPw || !newPw || !confirmPw}>
            {pwLoading ? '変更中...' : 'パスワードを変更'}
          </Btn>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2"><MessageSquare size={16} /> AIチャットウィジェット</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">フローティングチャット</div>
            <div className="text-xs text-black">画面右下にAIチャットボタンを表示します</div>
          </div>
          <button onClick={() => setChatWidgetEnabled(!chatWidgetEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${chatWidgetEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${chatWidgetEnabled ? 'left-6.5 translate-x-0' : 'left-0.5'}`}
              style={{ left: chatWidgetEnabled ? '26px' : '2px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================== Floating Chat Widget ==========================
const FloatingChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await api.chat(msg, sessionId);
      setSessionId(res.data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `エラー: ${e.message}` }]);
    }
    setLoading(false);
  };

  const handleReset = () => { setMessages([]); setSessionId(undefined); };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105">
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[540px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      style={{ animation: 'slideUp 0.2s ease-out' }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-2">
        <Sparkles size={18} />
        <span className="font-bold text-sm flex-1">AIアシスタント</span>
        <button onClick={handleReset} className="p-1 hover:bg-blue-500 rounded" title="リセット"><RotateCcw size={16} /></button>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-blue-500 rounded"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center mt-12 text-black">
            <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">在庫・発注・製造について<br/>何でも聞いてください</p>
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              {['在庫切れは？', '発注状況', '欠品部品'].map(q => (
                <button key={q} onClick={() => setInput(q)} className="text-[11px] px-2 py-1 bg-white border border-slate-200 rounded-full text-blue-600 hover:bg-blue-50">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-black rounded-bl-sm'}`}>
              {m.content.replace(/\*\*(.+?)\*\*/g, '「$1」')}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={msgEndRef} />
      </div>

      <div className="border-t border-slate-200 p-2 flex gap-1.5 bg-white">
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); handleSend(); } }}
          placeholder="質問を入力..."
          rows={1}
          className="flex-1 resize-none px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 max-h-20" />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

// ========================== QRPattern (decorative) ==========================
const QRPattern = ({ id, size = 100 }: { id: string; size?: number }) => {
  const grid = useMemo(() => {
    const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const N = 11;
    const cells: boolean[] = [];
    for (let i = 0; i < N * N; i++) {
      const x = (i * 9301 + seed * 49297) % 233280;
      cells.push((x / 233280) > 0.5);
    }
    const setSquare = (cx: number, cy: number) => {
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const xx = cx + dx, yy = cy + dy;
        if (xx < 0 || xx >= N || yy < 0 || yy >= N) continue;
        const ad = Math.max(Math.abs(dx), Math.abs(dy));
        if (ad === 3 || ad <= 1) cells[yy * N + xx] = true;
        if (ad === 2) cells[yy * N + xx] = false;
      }
    };
    setSquare(2, 2); setSquare(N - 3, 2); setSquare(2, N - 3);
    return cells;
  }, [id]);
  return (
    <div className="inline-block bg-white p-2 rounded border border-slate-200" style={{ width: size, height: size }}>
      <div className="grid w-full h-full" style={{ gridTemplateColumns: 'repeat(11, 1fr)' }}>
        {grid.map((on, i) => <div key={i} style={{ background: on ? '#0f172a' : 'transparent' }} />)}
      </div>
    </div>
  );
};

// ========================== PartDetailModal helpers ==========================
const DetailRow = ({ label, value, mono }: { label: string; value: any; mono?: boolean }) => (
  <div className="flex justify-between"><span className="text-black">{label}</span><span className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</span></div>
);
const StockBox = ({ label, value, unit, primary, accent, danger }: { label: string; value: number; unit: string; primary?: boolean; accent?: boolean; danger?: boolean }) => {
  const cls = primary ? 'bg-blue-50 border-blue-200 text-blue-900' :
    accent ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
    danger ? 'bg-rose-50 border-rose-200 text-rose-900' :
    'bg-slate-50 border-slate-200 text-black';
  return <div className={`rounded-lg border p-2 ${cls}`}>
    <div className="text-[11px] uppercase opacity-70">{label}</div>
    <div className="text-xl font-bold">{value}</div>
    <div className="text-[11px] opacity-60">{unit}</div>
  </div>;
};

// ========================== PartDetailModal ==========================
const PartDetailModal = ({ part, onClose, parts }: { part: Part | null; onClose: () => void; parts: Part[] }) => {
  if (!part) return null;
  const fresh = parts.find(p => p.id === part.id) || part;
  const eff = fresh.stock - fresh.allocated + (fresh.shortageReason ? 0 : fresh.onOrder);
  const isLow = eff < fresh.reorderPoint;
  return (
    <Modal open onClose={onClose} title={fresh.name} size="lg">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-center"><QRPattern id={fresh.id} size={130} />
            <div className="text-[11px] font-mono text-black mt-2">{fresh.id}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5 mt-3">
            <DetailRow label="社内品番" value={fresh.code} mono />
            <DetailRow label="メーカー品番" value={fresh.makerCode} mono />
            <DetailRow label="メーカー" value={fresh.maker} />
            <DetailRow label="主仕入先" value={fresh.supplier} />
            <DetailRow label="単価" value={yen(fresh.unitPrice)} />
            <DetailRow label="L/T" value={`${fresh.leadTime}日`} />
          </div>
        </div>
        <div className="col-span-2">
          <div className="grid grid-cols-4 gap-2 mb-3">
            <StockBox label="現品在庫" value={fresh.stock} unit={fresh.unit} primary />
            <StockBox label="引当中" value={fresh.allocated} unit={fresh.unit} />
            <StockBox label="発注残" value={fresh.onOrder} unit={fresh.unit} />
            <StockBox label="有効在庫" value={eff} unit={fresh.unit} accent={!isLow} danger={isLow} />
          </div>
          <div className="bg-slate-50 rounded p-3 mb-3">
            <div className="text-xs text-black mb-1.5 flex justify-between"><span>在庫レベル</span><span>最大 {fresh.maxStock}</span></div>
            <div className="relative h-3 bg-white rounded-full overflow-hidden border border-slate-200">
              <div className="absolute h-full bg-emerald-400" style={{ width: `${Math.min(100, fresh.stock / fresh.maxStock * 100)}%` }} />
              <div className="absolute h-full w-px bg-amber-500" style={{ left: `${fresh.reorderPoint / fresh.maxStock * 100}%` }} />
              <div className="absolute h-full w-px bg-rose-500" style={{ left: `${fresh.safetyStock / fresh.maxStock * 100}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-black mt-1">
              <span>0</span><span className="text-rose-600">安全{fresh.safetyStock}</span><span className="text-amber-600">発注点{fresh.reorderPoint}</span><span>{fresh.maxStock}</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded p-3 text-xs flex items-center gap-2">
            <MapPin size={14} className="text-blue-500" />
            <div className="font-mono font-bold">{fresh.location}</div>
          </div>
          {fresh.shortageReason && (
            <div className="bg-rose-50 border border-rose-200 rounded p-3 mt-3 flex gap-2">
              <AlertCircle size={14} className="text-rose-600 mt-0.5" />
              <div className="text-xs text-rose-700">
                <div className="font-bold">メーカー欠品中</div>
                {fresh.shortageReason}
              </div>
            </div>
          )}
          <div className="bg-slate-50 rounded p-3 mt-3 text-xs">
            <DetailRow label="在庫金額" value={yen(fresh.stock * fresh.unitPrice)} mono />
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ========================== OCR読み込み (部品マスタ用) ==========================
const PART_OCR_SAMPLES = [
  {
    rawText: '富士電機機器制御\nPFW-30 AC600V 30A\n筒形ヒューズ\nMADE IN JAPAN\nLOT 240312',
    fields: { code: 'FU-PFW-30', name: 'ヒューズ PFW 30A', maker: '富士電機機器制御', makerCode: 'PFW-30', spec: 'AC600V 30A 筒形ヒューズ', unit: '個', category: '電気部品 / ヒューズ', leadTime: 14, unitPrice: 0 },
    confidence: 96,
  },
  {
    rawText: '春日電機 KASUGA\nAS-3D-100A\n切替スイッチ\nAC600V 3φ 100A',
    fields: { code: 'SW-AS3D-100', name: '切替スイッチ AS-3D 100A', maker: '春日電機', makerCode: 'AS-3D-100A', spec: 'AC600V 3φ 100A 切替操作用', unit: '個', category: '電気部品 / 操作スイッチ', leadTime: 21, unitPrice: 0 },
    confidence: 91,
  },
  {
    rawText: 'MITSUBISHI ELECTRIC\nSF-PR 3.7kW 4P 200V\n全閉外扇形\n三相誘導電動機\nIE3',
    fields: { code: 'MTR-SFPR-3.7-4P', name: '三相モータ SF-PR 3.7kW 4P', maker: '三菱電機', makerCode: 'SF-PR 3.7kW 4P', spec: '200V 3.7kW 4P 全閉外扇 IE3', unit: '台', category: '電気部品 / モータ', leadTime: 30, unitPrice: 0 },
    confidence: 89,
  },
];

const PartOcrModal = ({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (fields: Record<string, any>) => void }) => {
  const [phase, setPhase] = useState<'camera' | 'scanning' | 'result'>('camera');
  const [sampleIdx, setSampleIdx] = useState(0);
  const sample = PART_OCR_SAMPLES[sampleIdx % PART_OCR_SAMPLES.length];

  useEffect(() => { if (!open) { setPhase('camera'); setSampleIdx(0); } }, [open]);

  const handleCapture = () => { setPhase('scanning'); setTimeout(() => setPhase('result'), 1500); };
  const handleRetry = () => { setSampleIdx(i => i + 1); setPhase('camera'); };
  const handleApplyOcr = () => { onApply(sample.fields); };

  if (!open) return null;

  const labelEntries: [string, string][] = [
    ['社内品番', sample.fields.code],
    ['メーカー品番', sample.fields.makerCode],
    ['品名', sample.fields.name],
    ['メーカー', sample.fields.maker],
    ['分類', sample.fields.category],
    ['仕様', sample.fields.spec],
    ['単位', sample.fields.unit],
    ['リードタイム', `${sample.fields.leadTime}日`],
  ];

  return (
    <Modal open={open} onClose={onClose} title="OCR読み込み — 現品ラベル/銘板から自動入力" size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          {phase === 'camera' && (
            <div>
              <QrCameraScanner onScan={(text) => {
                // Camera captured something - trigger OCR simulation
                handleCapture();
              }} />
              <div className="mt-2 text-center">
                <button onClick={handleCapture} className="text-xs text-blue-600 hover:underline">カメラなしでサンプルOCRを実行</button>
              </div>
            </div>
          )}
          {phase === 'scanning' && (
            <div className="bg-slate-900 rounded-lg flex items-center justify-center" style={{ minHeight: '240px' }}>
              <div className="text-center text-white">
                <Loader2 size={48} className="mx-auto mb-2 animate-spin text-blue-400" />
                <div className="text-xs">OCR認識中...</div>
                <div className="text-[11px] opacity-60 mt-1">文字領域検出 → 構造化</div>
              </div>
            </div>
          )}
          {phase === 'result' && (
            <div className="bg-slate-900 rounded-lg p-4" style={{ minHeight: '240px' }}>
              <div className="text-xs font-mono leading-relaxed text-emerald-300 whitespace-pre-line">
                {sample.rawText}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-black mb-2 flex items-center gap-1">
            <Sparkles size={12} /> 認識結果
          </div>
          {phase === 'camera' && (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded p-6 text-center text-xs text-black">
              撮影前
            </div>
          )}
          {phase === 'scanning' && (
            <div className="space-y-2">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-3 bg-slate-100 animate-pulse rounded" style={{ width: `${50+i*7}%`, animationDelay: `${i*80}ms` }}></div>)}
            </div>
          )}
          {phase === 'result' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span className="font-semibold text-emerald-700">信頼度 {sample.confidence}%</span>
                <span className="text-black ml-auto">{labelEntries.length}項目検出</span>
              </div>
              {labelEntries.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2 py-1 border-b border-slate-100">
                  <span className="text-[11px] text-black w-20 shrink-0">{k}</span>
                  <span className="text-xs flex-1">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        {phase === 'camera' && <Btn variant="primary" icon={Camera} onClick={handleCapture}>撮影して認識</Btn>}
        {phase === 'scanning' && <Btn variant="secondary" disabled>認識中...</Btn>}
        {phase === 'result' && (
          <>
            <Btn variant="primary" icon={Zap} onClick={handleApplyOcr}>この内容で入力欄に反映</Btn>
            <Btn variant="secondary" icon={RefreshCw} onClick={handleRetry}>別の部品を撮影</Btn>
          </>
        )}
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
        <div className="ml-auto text-[11px] text-black self-center">実装時: WebRTC + Vision API / 自社OCR</div>
      </div>
      <style>{`@keyframes ocrScanY { 0%,100% { top: 5%; } 50% { top: 95%; } }`}</style>
    </Modal>
  );
};

// ========================== OCR読み込み (BOM用) ==========================
const BOM_OCR_SAMPLES = [
  {
    title: '部品表 — 制御盤 CDB-2型',
    items: [
      { rawCode: 'CB-MCB-3P-30A-001', rawName: '配線用遮断器 NF63-CV', qty: 1, position: 'G1' },
      { rawCode: 'MC-S-N18-AC100', rawName: '電磁接触器 S-N18', qty: 2, position: 'G2' },
      { rawCode: 'TR-TH-N12-9A', rawName: 'サーマルリレー TH-N12', qty: 2, position: 'G2' },
      { rawCode: 'PB-AH22-R-10', rawName: '押ボタンSW φ22 赤', qty: 4, position: 'ドア面' },
      { rawCode: 'PL-LED-G-AC100', rawName: 'LED表示灯 緑 AC100V', qty: 6, position: 'ドア面' },
      { rawCode: 'TB-BNH-30A-12P', rawName: '組端子台 30A 12極', qty: 2, position: '下部' },
      { rawCode: 'DR-DIN-1M', rawName: 'DINレール 35mm', qty: 3, position: '内部' },
      { rawCode: 'WL-IV-2.0-BK', rawName: 'IV線 2.0SQ 黒', qty: 25, position: '配線' },
      { rawCode: 'TM-R-2-4', rawName: '丸型圧着端子 R2-4', qty: 80, position: '配線' },
      { rawCode: 'SZ-A20', rawName: '補助接点 SZ-A20', qty: 2, position: 'G2' },
    ],
  },
  {
    title: '部品表 — 分電盤 LDB-6回路',
    items: [
      { rawCode: 'CB-ELCB-3P-30A-30mA', rawName: '漏電遮断器 NV63-CV', qty: 1, position: '主幹' },
      { rawCode: 'CB-MCB-3P-30A-001', rawName: '配線用遮断器 30A', qty: 6, position: '分岐' },
      { rawCode: 'DR-DIN-1M', rawName: 'DINレール 35mm', qty: 2, position: '内部' },
      { rawCode: 'DT-WD-40-60', rawName: '配線ダクト 40×60', qty: 1, position: '内部' },
      { rawCode: 'WL-IV-2.0-BK', rawName: 'IV線 2.0SQ 黒', qty: 12, position: '配線' },
      { rawCode: 'TM-R-2-4', rawName: '丸型圧着端子 R2-4', qty: 32, position: '配線' },
      { rawCode: 'SCR-M4-15-SUS', rawName: 'ねじ M4×15 SUS', qty: 24, position: '取付' },
      { rawCode: 'PB-3-PLUG', rawName: 'プラグインベース PB-3', qty: 6, position: '分岐' },
    ],
  },
  {
    title: '部品表 — 計器盤 IPN-A',
    items: [
      { rawCode: 'AM-DC-100A-DR', rawName: '直流電流計 0-100A', qty: 2, position: '前面' },
      { rawCode: 'CT-LCT-100-5', rawName: '貫通形変流器 100/5A', qty: 4, position: '内部' },
      { rawCode: 'PL-LED-Y-AC200', rawName: 'LED表示灯 黄 AC200V', qty: 4, position: '前面' },
      { rawCode: 'DR-DIN-1M', rawName: 'DINレール 35mm', qty: 1, position: '内部' },
      { rawCode: 'TM-R-2-4', rawName: '丸型圧着端子 R2-4', qty: 40, position: '配線' },
    ],
  },
];

interface BomAddition { partId: string; qty: number; position: string; note: string }

const BomOcrModal = ({ open, onClose, parts, existingBom, onApply }: {
  open: boolean; onClose: () => void; parts: Part[];
  existingBom?: { partId: string }[];
  onApply: (additions: BomAddition[]) => void;
}) => {
  const [phase, setPhase] = useState<'preview' | 'scanning' | 'result'>('preview');
  const [sampleIdx, setSampleIdx] = useState(0);
  const sample = BOM_OCR_SAMPLES[sampleIdx % BOM_OCR_SAMPLES.length];

  useEffect(() => { if (!open) { setPhase('preview'); setSampleIdx(0); } }, [open]);

  const matched = sample.items.map(it => {
    const m = parts.find(p => p.code === it.rawCode)
      || parts.find(p => p.makerCode === it.rawCode)
      || parts.find(p => p.id === it.rawCode)
      || parts.find(p => p.name && it.rawName && (p.name.includes(it.rawName.split(' ')[0]) || it.rawName.includes(p.name.split(' ')[0])));
    const alreadyInBom = !!(m && (existingBom || []).find(b => b.partId === m.id));
    return { ...it, match: m || null, alreadyInBom };
  });

  const matchedNew = matched.filter(m => m.match && !m.alreadyInBom);
  const matchedExisting = matched.filter(m => m.match && m.alreadyInBom);
  const unmatched = matched.filter(m => !m.match);

  const handleScan = () => { setPhase('scanning'); setTimeout(() => setPhase('result'), 1800); };
  const handleRetry = () => { setSampleIdx(i => i + 1); setPhase('preview'); };
  const handleApplyBom = () => {
    const additions: BomAddition[] = matchedNew.map(m => ({ partId: m.match!.id, qty: m.qty, position: m.position || '', note: 'OCR読込' }));
    onApply(additions);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="OCR読み込み — 部品表/図面の構成部品をBOMに反映" size="xl">
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2">
          <div className="bg-slate-900 rounded-lg overflow-hidden relative" style={{ aspectRatio: '3/4' }}>
            <div className="absolute inset-3 bg-slate-100 rounded p-2 text-[8px] leading-tight text-black overflow-hidden">
              <div className="font-bold text-center pb-1 border-b border-slate-400">{sample.title}</div>
              <div className="grid mt-1 text-[7px]" style={{ gridTemplateColumns: '24px 1fr 24px 36px', gap: '2px 4px' }}>
                <div className="font-bold border-b border-slate-300">No</div>
                <div className="font-bold border-b border-slate-300">品名 / 型式</div>
                <div className="font-bold border-b border-slate-300 text-right">数量</div>
                <div className="font-bold border-b border-slate-300 text-right">位置</div>
                {sample.items.map((it, i) => (
                  <React.Fragment key={i}>
                    <div className="text-black">{i+1}</div>
                    <div className="truncate"><div>{it.rawName}</div><div className="text-[6px] text-black font-mono">{it.rawCode}</div></div>
                    <div className="text-right">{it.qty}</div>
                    <div className="text-right">{it.position}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            {phase === 'scanning' && (
              <div className="absolute inset-3 pointer-events-none">
                <div className="absolute inset-0 bg-blue-500/10 rounded animate-pulse"></div>
                <div className="absolute inset-x-0 h-0.5 bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]"
                     style={{ animation: 'ocrScanY 1.8s linear infinite' }}></div>
              </div>
            )}
            {phase === 'preview' && (
              <div className="absolute bottom-2 inset-x-3 bg-black/70 text-white text-center text-[11px] py-1 rounded flex items-center justify-center gap-1">
                <Camera size={11} /> 撮影済み画像 (プレビュー)
              </div>
            )}
            {phase === 'result' && (
              <div className="absolute bottom-2 inset-x-3 bg-emerald-600/90 text-white text-center text-[11px] py-1 rounded flex items-center justify-center gap-1">
                <CheckCircle2 size={11} /> 認識完了
              </div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-black flex items-center gap-1">
            <ScanLine size={11} /> 部品表・参考図・既存BOM印刷物を OCR
          </div>
        </div>

        <div className="col-span-3">
          <div className="text-xs font-semibold text-black mb-2 flex items-center gap-1">
            <Sparkles size={12} /> 認識結果 ({sample.items.length}行)
          </div>
          {phase === 'preview' && (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded p-8 text-center text-xs text-black">
              「OCRを実行」を押して認識を開始
            </div>
          )}
          {phase === 'scanning' && (
            <div className="space-y-1.5">
              {sample.items.map((_, i) => (
                <div key={i} className="h-7 bg-slate-100 animate-pulse rounded" style={{ animationDelay: `${i*60}ms` }}></div>
              ))}
            </div>
          )}
          {phase === 'result' && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-2 text-[11px]">
                <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 flex items-center gap-1.5">
                  <Link2 size={12} className="text-emerald-600" />
                  <span><span className="font-bold text-emerald-700">{matchedNew.length}</span>件 マスタ照合OK</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-1.5 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-amber-600" />
                  <span><span className="font-bold text-amber-700">{matchedExisting.length}</span>件 既登録</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded p-1.5 flex items-center gap-1.5">
                  <XCircle size={12} className="text-rose-600" />
                  <span><span className="font-bold text-rose-700">{unmatched.length}</span>件 未登録</span>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-[11px] uppercase text-black sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5">OCR読取</th>
                      <th className="text-left px-2 py-1.5">マスタ照合</th>
                      <th className="text-right px-2 py-1.5 w-12">数量</th>
                      <th className="text-left px-2 py-1.5 w-20">位置</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matched.map((it, i) => (
                      <tr key={i} className={it.match ? (it.alreadyInBom ? 'bg-amber-50/50' : 'bg-emerald-50/40') : 'bg-rose-50/40'}>
                        <td className="px-2 py-1.5">
                          <div className="font-mono text-[11px] text-black">{it.rawCode}</div>
                          <div className="text-[11px]">{it.rawName}</div>
                        </td>
                        <td className="px-2 py-1.5">
                          {it.match ? (
                            <div className="flex items-start gap-1">
                              {it.alreadyInBom
                                ? <AlertCircle size={11} className="text-amber-600 mt-0.5 shrink-0" />
                                : <Link2 size={11} className="text-emerald-600 mt-0.5 shrink-0" />}
                              <div>
                                <div className="font-mono text-[11px] text-black">{it.match.id}</div>
                                <div className="text-[11px]">{it.match.name}</div>
                                {it.alreadyInBom && <div className="text-[9px] text-amber-700">既にBOMに登録済</div>}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-700">
                              <XCircle size={11} />
                              <span className="text-[11px]">未登録（要マスタ追加）</span>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">{it.qty}</td>
                        <td className="px-2 py-1.5 text-[11px]">{it.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {unmatched.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5 flex items-start gap-1">
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                  <span>未登録 {unmatched.length}件 は反映対象外。先に部品マスタへ登録が必要です。</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        {phase === 'preview' && <Btn variant="primary" icon={ScanLine} onClick={handleScan}>OCRを実行</Btn>}
        {phase === 'scanning' && <Btn variant="secondary" disabled>認識中...</Btn>}
        {phase === 'result' && (
          <>
            <Btn variant="primary" icon={Zap} onClick={handleApplyBom} disabled={matchedNew.length === 0}>
              BOMに反映 ({matchedNew.length}件)
            </Btn>
            <Btn variant="secondary" icon={RefreshCw} onClick={handleRetry}>別の部品表を取込</Btn>
          </>
        )}
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
        <div className="ml-auto text-[11px] text-black self-center">実装時: 撮影/PDF取込 → Vision API → 品番・数量・位置を抽出 → マスタ照合</div>
      </div>
      <style>{`@keyframes ocrScanY { 0%,100% { top: 5%; } 50% { top: 95%; } }`}</style>
    </Modal>
  );
};

// ========================== ProductFormModal ==========================
const ProductFormModal = ({ product, isNew, onClose, onSave }: { product: any; isNew: boolean; onClose: () => void; onSave: (form: any, isNew: boolean) => void }) => {
  const [form, setForm] = useState(() => ({ ...product }));
  const upd = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  return (
    <Modal open onClose={onClose} title={isNew ? '製品 新規登録' : `製品編集: ${product.code}`} size="lg">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="製品コード*"><input value={form.code || ''} onChange={e => upd('code', e.target.value)} className={inputClass} /></Field>
        <Field label="製品名*"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
        <Field label="分類*"><input value={form.category || ''} onChange={e => upd('category', e.target.value)} className={inputClass} /></Field>
        <Field label="電圧"><input value={form.voltage || ''} onChange={e => upd('voltage', e.target.value)} className={inputClass} /></Field>
        <Field label="寸法"><input value={form.dimensions || ''} onChange={e => upd('dimensions', e.target.value)} className={inputClass} /></Field>
        <Field label="図面番号"><input value={form.drawingNo || ''} onChange={e => upd('drawingNo', e.target.value)} className={inputClass} /></Field>
      </div>
      <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.code || !form.name || !form.category}>{isNew ? '登録' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </Modal>
  );
};

// ========================== BomEditor ==========================
const BomEditor = ({ boms, parts, onAdd, onRemove }: { boms: any[]; parts: Part[]; onAdd: (partId: string, qty: number, position: string) => void; onRemove: (bomId: number) => void }) => {
  const [addPartId, setAddPartId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addPosition, setAddPosition] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showBomOcr, setShowBomOcr] = useState(false);

  const bomPartIds = useMemo(() => new Set(boms.map((b: any) => b.partId)), [boms]);
  const filteredParts = useMemo(() => {
    const available = parts.filter(p => !bomPartIds.has(p.id));
    if (!partSearch) return available.slice(0, 30);
    const q = partSearch.toLowerCase();
    return available.filter(p => p.id.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [parts, partSearch, bomPartIds]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setShowBomOcr(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition">
          <Camera size={13} /> 部品表OCR読み込み <Sparkles size={11} className="text-blue-500" />
        </button>
        <span className="text-[11px] text-black">カメラで部品表を撮影 → BOMに一括追加</span>
      </div>

      {showBomOcr && (
        <Modal open onClose={() => setShowBomOcr(false)} title="BOM OCR読み込み — 部品表から一括追加" size="lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <QrCameraScanner onScan={() => {
                // Camera captured - simulate OCR with sample data
                setShowBomOcr(false);
                const sampleBomParts = parts.filter(p => !bomPartIds.has(p.id)).slice(0, 5);
                sampleBomParts.forEach(p => onAdd(p.id, Math.floor(Math.random() * 5) + 1, ''));
              }} />
              <div className="mt-2 text-center">
                <button onClick={() => {
                  setShowBomOcr(false);
                  const sampleBomParts = parts.filter(p => !bomPartIds.has(p.id)).slice(0, 3);
                  sampleBomParts.forEach(p => onAdd(p.id, Math.floor(Math.random() * 5) + 1, ''));
                }} className="text-xs text-blue-600 hover:underline">サンプルデータで一括追加（デモ）</button>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-black mb-2 flex items-center gap-1"><Sparkles size={12} /> OCR認識手順</div>
              <div className="space-y-2 text-xs text-black">
                <div className="bg-slate-50 rounded p-2">1. 部品表・図面・既存BOMを撮影</div>
                <div className="bg-slate-50 rounded p-2">2. 品番・品名・数量をOCR認識</div>
                <div className="bg-slate-50 rounded p-2">3. 部品マスタと照合</div>
                <div className="bg-slate-50 rounded p-2">4. マッチした部品をBOMに一括追加</div>
              </div>
              <div className="mt-3 text-[11px] text-black">本番環境ではCloud Vision / Document AIで高精度認識します</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
            <Btn variant="secondary" onClick={() => setShowBomOcr(false)}>閉じる</Btn>
          </div>
        </Modal>
      )}

      <table className="w-full text-sm mb-4">
        <thead className="bg-slate-50 text-xs text-black border-b border-slate-200">
          <tr>
            <th className="text-left px-3 py-2 font-medium">品番</th>
            <th className="text-left px-3 py-2 font-medium">品名</th>
            <th className="text-left px-3 py-2 font-medium">取付位置</th>
            <th className="text-right px-3 py-2 font-medium">数量</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {boms.map((b: any) => (
            <tr key={b.id} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-mono text-xs">{b.partId}</td>
              <td className="px-3 py-2">{b.part?.name || b.partId}</td>
              <td className="px-3 py-2 text-xs">{b.position || '-'}</td>
              <td className="px-3 py-2 text-right font-mono">{Number(b.qty)}</td>
              <td className="px-3 py-2 text-right"><button onClick={() => onRemove(b.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button></td>
            </tr>
          ))}
          {boms.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-black">BOM部品がありません</td></tr>}
        </tbody>
      </table>
      <div className="border-t border-slate-200 pt-3">
        <div className="text-xs font-semibold text-black mb-2">部品を追加</div>
        <div className="flex items-end gap-2">
          <Field label="部品">
            <div className="relative">
              <input value={dropdownOpen ? partSearch : addPartId} onChange={e => { setPartSearch(e.target.value); setDropdownOpen(true); setAddPartId(e.target.value); }} onFocus={() => { setDropdownOpen(true); setPartSearch(addPartId); }} onBlur={() => setTimeout(() => setDropdownOpen(false), 200)} placeholder="品番/品名で検索..." className={`${inputClass} font-mono w-48`} />
              {dropdownOpen && filteredParts.length > 0 && (
                <div className="absolute z-10 w-64 mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto">
                  {filteredParts.map(p => (
                    <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); setAddPartId(p.id); setPartSearch(p.id); setDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50">
                      <span className="font-mono">{p.id}</span> <span className="text-black">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="数量"><input type="number" value={addQty} onChange={e => setAddQty(Number(e.target.value) || 1)} min={1} className={`${inputClass} w-20 text-right font-mono`} /></Field>
          <Field label="位置"><input value={addPosition} onChange={e => setAddPosition(e.target.value)} className={`${inputClass} w-24`} /></Field>
          <Btn icon={Plus} onClick={() => { if (addPartId) { onAdd(addPartId, addQty, addPosition); setAddPartId(''); setAddQty(1); setAddPosition(''); setPartSearch(''); } }} disabled={!addPartId}>追加</Btn>
        </div>
      </div>
    </div>
  );
};

// ========================== LocationFormModal ==========================
const LocationFormModal = ({ location, isNew, onClose, onSave }: { location: any; isNew: boolean; onClose: () => void; onSave: (form: any, isNew: boolean) => void }) => {
  const [form, setForm] = useState(() => ({ ...location }));
  const upd = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const num = (v: string) => Number(v) || 0;
  const autoId = `${form.shelf || '?'}-${form.col || '?'}-${form.row || '?'}${form.side ? '-' + form.side : ''}`;
  return (
    <Modal open onClose={onClose} title={isNew ? 'ロケーション 新規登録' : `ロケーション編集: ${location.id}`} size="md">
      {isNew && <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">自動生成ID: <span className="font-mono font-bold">{autoId}</span></div>}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="倉庫*"><input value={form.warehouse || ''} onChange={e => upd('warehouse', e.target.value)} className={inputClass} /></Field>
        <Field label="棚*"><input value={form.shelf || ''} onChange={e => upd('shelf', e.target.value)} className={inputClass} /></Field>
        <Field label="列*"><input value={form.col || ''} onChange={e => upd('col', e.target.value)} className={inputClass} /></Field>
        <Field label="段*"><input value={form.row || ''} onChange={e => upd('row', e.target.value)} className={inputClass} /></Field>
        <Field label="左右"><input value={form.side || ''} onChange={e => upd('side', e.target.value)} className={inputClass} placeholder="L / R" /></Field>
        <Field label="名称*"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
        <Field label="最大容量"><input type="number" value={form.maxQty ?? 100} onChange={e => upd('maxQty', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="タイプ">
          <select value={form.locType || '棚'} onChange={e => upd('locType', e.target.value)} className={inputClass}>
            <option value="通常棚">通常棚</option><option value="計器棚">計器棚</option><option value="小物棚">小物棚</option><option value="長尺棚">長尺棚</option><option value="リール棚">リール棚</option><option value="パレット">パレット</option>
          </select>
        </Field>
      </div>
      <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.warehouse || !form.shelf || !form.col || !form.row || !form.name}>{isNew ? '登録' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </Modal>
  );
};

// ========================== SuppliersScreen ==========================
const SuppliersScreen = ({ toast }: { toast: (msg: string) => void }) => {
  const [suppTab, setSuppTab] = useState<'suppliers' | 'makers'>('suppliers');
  return (
    <div className="p-5 space-y-3">
      <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
        {([['suppliers', '仕入先'], ['makers', 'メーカー']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setSuppTab(k)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${suppTab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>
      {suppTab === 'suppliers' ? <SuppliersTab toast={toast} /> : <MakersTab toast={toast} />}
    </div>
  );
};

const SuppliersTab = ({ toast }: { toast: (msg: string) => void }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [newSupplier, setNewSupplier] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchSuppliers = () => { api.getSuppliers().then(res => { setSuppliers(res.data || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { fetchSuppliers(); }, []);

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) { await api.createSupplier(form); toast(`仕入先「${form.name}」を登録しました`); }
      else { await api.updateSupplier(form.id, form); toast(`仕入先「${form.name}」を更新しました`); }
      setEditSupplier(null); setNewSupplier(null); fetchSuppliers();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.deleteSupplier(deleteTarget.id); toast(`仕入先「${deleteTarget.name}」を削除しました`); setDeleteTarget(null); fetchSuppliers(); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  const formSupplier = editSupplier || newSupplier;

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-sm">仕入先一覧</h2>
          <Btn icon={Plus} onClick={() => setNewSupplier({ code: '', name: '', tel: '', email: '', contactPerson: '' })}>新規登録</Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-black uppercase border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium">コード</th>
                <th className="text-left px-3 py-2 font-medium">仕入先名</th>
                <th className="text-left px-3 py-2 font-medium">電話番号</th>
                <th className="text-left px-3 py-2 font-medium">担当者</th>
                <th className="text-left px-3 py-2 font-medium">支払条件</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{s.name}</div>
                    {s.email && <div className="text-xs text-black">{s.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">{s.tel || '-'}</td>
                  <td className="px-3 py-2 text-xs">{s.contactPerson || '-'}</td>
                  <td className="px-3 py-2 text-xs">{s.paymentTerms || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditSupplier(s)}>編集</Btn>
                      <button onClick={() => setDeleteTarget(s)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-black">仕入先が登録されていません</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {formSupplier && (
        <SupplierFormModal supplier={formSupplier} isNew={!!newSupplier} onClose={() => { setEditSupplier(null); setNewSupplier(null); }} onSave={handleSave} />
      )}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="仕入先の削除確認" size="sm">
          <div className="text-sm mb-4"><p>以下の仕入先を削除しますか？</p><div className="mt-2 bg-slate-50 rounded p-3"><div className="font-mono text-xs text-black">{deleteTarget.code}</div><div className="font-semibold">{deleteTarget.name}</div></div></div>
          <div className="flex gap-2"><Btn variant="danger" icon={Trash2} onClick={handleDelete}>削除する</Btn><Btn variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Btn></div>
        </Modal>
      )}
    </>
  );
};

const MakersTab = ({ toast }: { toast: (msg: string) => void }) => {
  const [makers, setMakers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMaker, setEditMaker] = useState<any>(null);
  const [newMaker, setNewMaker] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchMakers = () => { api.getMakers().then(res => { setMakers(res.data || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { fetchMakers(); }, []);

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) { await api.createMaker(form); toast(`メーカー「${form.name}」を登録しました`); }
      else { await api.updateMaker(form.id, form); toast(`メーカー「${form.name}」を更新しました`); }
      setEditMaker(null); setNewMaker(null); fetchMakers();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.deleteMaker(deleteTarget.id); toast(`メーカー「${deleteTarget.name}」を削除しました`); setDeleteTarget(null); fetchMakers(); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  const formMaker = editMaker || newMaker;

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-sm">メーカー一覧</h2>
          <Btn icon={Plus} onClick={() => setNewMaker({ name: '', code: '', tel: '', email: '', website: '', notes: '' })}>新規登録</Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-black uppercase border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium">メーカー名</th>
                <th className="text-left px-3 py-2 font-medium">コード</th>
                <th className="text-left px-3 py-2 font-medium">電話番号</th>
                <th className="text-left px-3 py-2 font-medium">メール</th>
                <th className="text-left px-3 py-2 font-medium">Webサイト</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {makers.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold">{m.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.code || '-'}</td>
                  <td className="px-3 py-2 text-xs">{m.tel || '-'}</td>
                  <td className="px-3 py-2 text-xs">{m.email || '-'}</td>
                  <td className="px-3 py-2 text-xs">{m.website ? <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{m.website}</a> : '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditMaker(m)}>編集</Btn>
                      <button onClick={() => setDeleteTarget(m)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {makers.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-black">メーカーが登録されていません</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {formMaker && (
        <MakerFormModal maker={formMaker} isNew={!!newMaker} onClose={() => { setEditMaker(null); setNewMaker(null); }} onSave={handleSave} />
      )}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="メーカーの削除確認" size="sm">
          <div className="text-sm mb-4"><p>以下のメーカーを削除しますか？</p><div className="mt-2 bg-slate-50 rounded p-3"><div className="font-semibold">{deleteTarget.name}</div>{deleteTarget.code && <div className="font-mono text-xs text-black">{deleteTarget.code}</div>}</div></div>
          <div className="flex gap-2"><Btn variant="danger" icon={Trash2} onClick={handleDelete}>削除する</Btn><Btn variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Btn></div>
        </Modal>
      )}
    </>
  );
};

const MakerFormModal = ({ maker, isNew, onClose, onSave }: { maker: any; isNew: boolean; onClose: () => void; onSave: (form: any, isNew: boolean) => void }) => {
  const [form, setForm] = useState(() => ({ ...maker }));
  const upd = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  return (
    <Modal open onClose={onClose} title={isNew ? 'メーカー 新規登録' : `メーカー編集: ${maker.name}`} size="lg">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="メーカー名*"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
        <Field label="コード"><input value={form.code || ''} onChange={e => upd('code', e.target.value)} className={inputClass} placeholder="例: MK001" /></Field>
        <Field label="電話番号"><input value={form.tel || ''} onChange={e => upd('tel', e.target.value)} className={inputClass} placeholder="例: 03-1234-5678" /></Field>
        <Field label="メール"><input type="email" value={form.email || ''} onChange={e => upd('email', e.target.value)} className={inputClass} /></Field>
        <Field label="Webサイト" full><input value={form.website || ''} onChange={e => upd('website', e.target.value)} className={inputClass} placeholder="例: https://example.com" /></Field>
        <Field label="備考" full><textarea value={form.notes || ''} onChange={e => upd('notes', e.target.value)} className={`${inputClass} h-16`} placeholder="メモ・特記事項など" /></Field>
      </div>
      <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.name}>{isNew ? '登録' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </Modal>
  );
};

const SupplierFormModal = ({ supplier, isNew, onClose, onSave }: { supplier: any; isNew: boolean; onClose: () => void; onSave: (form: any, isNew: boolean) => void }) => {
  const [form, setForm] = useState(() => ({ ...supplier }));
  const upd = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  return (
    <Modal open onClose={onClose} title={isNew ? '仕入先 新規登録' : `仕入先編集: ${supplier.code}`} size="lg">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="仕入先コード*"><input value={form.code || ''} onChange={e => upd('code', e.target.value)} className={inputClass} placeholder="例: SUP006" /></Field>
        <Field label="仕入先名*"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
        <Field label="郵便番号"><input value={form.postalCode || ''} onChange={e => upd('postalCode', e.target.value)} className={inputClass} placeholder="例: 123-4567" /></Field>
        <Field label="担当者"><input value={form.contactPerson || ''} onChange={e => upd('contactPerson', e.target.value)} className={inputClass} /></Field>
        <Field label="住所" full><input value={form.address || ''} onChange={e => upd('address', e.target.value)} className={inputClass} placeholder="都道府県から入力" /></Field>
        <Field label="電話番号"><input value={form.tel || ''} onChange={e => upd('tel', e.target.value)} className={inputClass} placeholder="例: 03-1234-5678" /></Field>
        <Field label="FAX"><input value={form.fax || ''} onChange={e => upd('fax', e.target.value)} className={inputClass} placeholder="例: 03-1234-5679" /></Field>
        <Field label="メール"><input type="email" value={form.email || ''} onChange={e => upd('email', e.target.value)} className={inputClass} /></Field>
        <Field label="支払条件"><input value={form.paymentTerms || ''} onChange={e => upd('paymentTerms', e.target.value)} className={inputClass} placeholder="例: 月末締翌月末払い" /></Field>
        <Field label="備考" full><textarea value={form.notes || ''} onChange={e => upd('notes', e.target.value)} className={`${inputClass} h-16`} placeholder="納入条件、特記事項など" /></Field>
      </div>
      <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2.5 text-xs text-blue-800">
        ここで登録した情報は発注書PDFに自動反映されます（住所・TEL・FAX・支払条件）
      </div>
      <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.code || !form.name}>{isNew ? '登録' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </Modal>
  );
};

// ========================== View Titles ==========================
const viewTitles: Record<string, { title: string; subtitle?: string }> = {
  dashboard: { title: 'ダッシュボード', subtitle: '在庫状況の概要' },
  master: { title: '部品マスタ', subtitle: '部品情報の登録・編集' },
  products: { title: '製品マスタ・BOM', subtitle: '製品構成部品の管理' },
  inventory: { title: '在庫一覧', subtitle: 'ロケーション別の在庫状況' },
  locations: { title: 'ロケーション', subtitle: '棚位置の管理' },
  suppliers: { title: '仕入先/メーカー管理', subtitle: '仕入先・メーカーの登録・編集' },
  orders: { title: '発注管理', subtitle: '発注書の作成・承認・進捗管理' },
  receive: { title: '入庫処理', subtitle: '納品の受入・検収' },
  production: { title: '製造指図', subtitle: 'BOM展開・引当・ピッキング' },
  issue: { title: '出庫処理', subtitle: '製造指図に基づく部品払出' },
  stocktake: { title: '棚卸し', subtitle: '実地棚卸しの管理' },
  reports: { title: 'レポート', subtitle: '在庫分析・統計' },
  logs: { title: '履歴・ログ', subtitle: '操作履歴の検索・閲覧' },
  chat: { title: 'AIチャット', subtitle: '在庫・発注データをAIに質問' },
  users: { title: 'ユーザー管理', subtitle: 'ユーザーの招待・ロール管理' },
  departments: { title: '部署管理', subtitle: '部署の階層構造を管理' },
  entities: { title: 'エンティティ管理', subtitle: '会社名・人名・契約情報の管理' },
  qr: { title: 'QRコード', subtitle: 'QRラベル発行・スキャン' },
  settings: { title: '設定', subtitle: 'パスワード変更・表示設定' },
};

export default function AppPage() {
  const [view, setView] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prodOrders, setProdOrders] = useState<ProdOrder[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [chatWidgetEnabled, setChatWidgetEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chatWidgetEnabled');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('chatWidgetEnabled', String(chatWidgetEnabled));
  }, [chatWidgetEnabled]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [partsRes, ordersRes, prodRes, locRes] = await Promise.all([
        api.getParts({ limit: '1000' }),
        api.getOrders(),
        api.getProductionOrders(),
        api.getLocations(),
      ]);
      setParts(partsRes.data || []);
      setOrders(ordersRes.data || []);
      setProdOrders(prodRes.data || []);
      setLocations(locRes.data || []);
      // Get current logged-in user
      try {
        const meRes = await api.getMe();
        if (meRes.data) {
          setCurrentUserName(meRes.data.name);
          setCurrentUserId(meRes.data.id);
        }
      } catch { /* ignore */ }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-3" />
          <div className="text-sm text-black">読み込み中...</div>
        </div>
      </div>
    );
  }

  const vt = viewTitles[view] || { title: view };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar view={view} setView={setView} mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title={vt.title} subtitle={vt.subtitle} onMenuOpen={() => setMobileMenuOpen(true)} userName={currentUserName} />
        <div className="flex-1 overflow-y-auto">
          {view === 'dashboard' && <Dashboard parts={parts} orders={orders} prodOrders={prodOrders} setView={setView} />}
          {view === 'master' && <MasterScreen parts={parts} onRefresh={fetchAll} toast={toast} openPart={setSelectedPart} locations={locations} />}
          {view === 'products' && <ProductsScreen toast={toast} parts={parts} />}
          {view === 'locations' && <LocationsScreen locations={locations} onRefresh={fetchAll} toast={toast} />}
          {view === 'suppliers' && <SuppliersScreen toast={toast} />}
          {view === 'orders' && <OrdersScreen parts={parts} orders={orders} onRefresh={fetchAll} toast={toast} userName={currentUserName} userId={currentUserId} />}
          {view === 'receive' && <ReceiveScreen orders={orders} parts={parts} onRefresh={fetchAll} toast={toast} />}
          {view === 'production' && <ProductionScreen prodOrders={prodOrders} toast={toast} onRefresh={fetchAll} parts={parts} />}
          {view === 'issue' && <IssueScreen prodOrders={prodOrders} onRefresh={fetchAll} toast={toast} />}
          {view === 'stocktake' && <StocktakeScreen parts={parts} locations={locations} toast={toast} onRefresh={fetchAll} />}
          {view === 'reports' && <ReportsScreen toast={toast} />}
          {view === 'logs' && <LogsScreen />}
          {view === 'chat' && <ChatScreen toast={toast} />}
          {view === 'users' && <UsersScreen toast={toast} />}
          {view === 'departments' && <DepartmentsScreen toast={toast} />}
          {view === 'entities' && <EntitiesScreen toast={toast} />}
          {view === 'qr' && <QrScreen parts={parts} locations={locations} toast={toast} />}
          {view === 'settings' && <SettingsScreen toast={toast} chatWidgetEnabled={chatWidgetEnabled} setChatWidgetEnabled={setChatWidgetEnabled} />}
        </div>
      </main>
      <Toast msg={toastMsg} />
      {chatWidgetEnabled && view !== 'chat' && <FloatingChatWidget />}
      <PartDetailModal part={selectedPart} parts={parts} onClose={() => setSelectedPart(null)} />
    </div>
  );
}

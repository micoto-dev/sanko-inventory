'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Search, Package, ShoppingCart, ClipboardCheck,
  Bell, AlertTriangle, AlertCircle, Boxes, Truck, Filter,
  CheckCircle2, MapPin, Plus, Edit, BarChart3, Package2, Anchor,
  Factory, Warehouse, Trash2, Save, Send, MessageSquare, Users,
  History, Cpu, Loader2, Building, Database, Shield, UserPlus,
  ChevronRight, ToggleLeft, ToggleRight, Copy, Sparkles, FileText,
  X, KeyRound, PlusCircle, ChevronDown, Tag, LogOut, RotateCcw, Settings,
  QrCode, Printer, ExternalLink, ScanLine,
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
  orderDate: string; desiredDate?: string; status: string; totalAmount: number;
  details: { partId: string; partName?: string; qty: number; receivedQty: number; unitPrice: number }[];
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
const Sidebar = ({ view, setView }: {
  view: string; setView: (v: string) => void;
}) => {
  const items = [
    { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { id: 'master', label: '部品マスタ', icon: Package },
    { id: 'products', label: '製品マスタ・BOM', icon: Cpu },
    { id: 'inventory', label: '在庫一覧', icon: Boxes },
    { id: 'locations', label: 'ロケーション', icon: Warehouse },
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
  return (
    <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0">
      <div className="p-3.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-md flex items-center justify-center">
            <Anchor size={17} className="text-slate-900" />
          </div>
          <div>
            <div className="font-bold text-sm">三工電機</div>
            <div className="text-[10px] text-slate-400 uppercase">Inventory</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm mb-0.5 transition ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Icon size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {(item as any).badge > 0 && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">{(item as any).badge}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

const TopBar = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
    <div>
      <h1 className="text-base font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center"><Anchor size={10} /></div>
        <span>ユーザー</span>
      </div>
      <button onClick={() => { fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.href = '/login'); }}
        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition">
        <LogOut size={13} /> ログアウト
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
  const activeOrders = orders.filter(o => ['awaiting', 'partial', 'delayed', 'pending'].includes(o.status));
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
              <div className="text-[11px] text-slate-500">{k.label}</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{k.value}</div>
              <div className="text-[10px] text-slate-500">{k.sub}</div>
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
                  <div className="text-sm font-semibold">メーカー欠品: {p.name}</div>
                  <div className="text-xs text-slate-500">{p.shortageReason}</div>
                </div>
              </div>
            ))}
            {lowStockParts.slice(0, 3).map(p => (
              <div key={p.id} className="px-4 py-2.5 border-l-2 border-l-amber-500 flex items-start gap-3">
                <AlertCircle size={14} className="text-amber-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{p.stock === 0 ? '在庫切れ' : '発注点割れ'}: {p.name}</div>
                  <div className="text-xs text-slate-500">在庫 {p.stock} / 発注点 {p.reorderPoint}</div>
                </div>
              </div>
            ))}
            {lowStockParts.length === 0 && parts.filter(p => p.shortageReason).length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">アラートはありません</div>
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
                  <span className="font-mono text-xs text-slate-500">{m.prodNo}</span>
                  <StatusBadge statusKey={m.status} statusMap={MO_STATUS} />
                </div>
                <div className="text-sm font-semibold mt-0.5">{m.productName || m.productCode} x {m.qty}</div>
                <div className="text-xs text-slate-500">納期: {m.dueDate} / {m.customer}</div>
              </div>
            ))}
            {prodOrders.filter(m => m.status !== 'completed').length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">進行中の指図はありません</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================== Parts Master ==========================
const MasterScreen = ({ parts, onRefresh, toast }: { parts: Part[]; onRefresh: () => void; toast: (msg: string) => void }) => {
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editing, setEditing] = useState<Part | null>(null);
  const [newPart, setNewPart] = useState<any>(null);

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

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) {
        await api.createPart(form);
        toast(`部品マスタ「${form.name}」を登録しました`);
      } else {
        await api.updatePart(form.id, form);
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
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="品番・品名・メーカー品番・棚位置で検索"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <Btn icon={Plus} onClick={() => setNewPart({ code: '', name: '', maker: '', makerCode: '', category: '電気部品', supplier: '', stock: 0, reorderPoint: 10, safetyStock: 5, maxStock: 50, unit: '個', unitPrice: 0, leadTime: 14, location: '', spec: '' })}>
            新規登録
          </Btn>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-slate-400" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs px-2 py-1 border border-slate-200 rounded">
            <option value="all">全ステータス</option>
            {Object.entries(STATUS_COLOR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-500"><span className="font-semibold">{filtered.length}</span> / 全 {parts.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
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
              {filtered.map(p => {
                const st = getStatus(p);
                const s = STATUS_COLOR[st];
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs">{p.id}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.code}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.spec}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div>{p.maker}</div>
                      <div className="text-xs text-slate-500 font-mono">{p.makerCode}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <div className="font-semibold">{p.stock}</div>
                      <div className="text-[10px] text-slate-500">引当:{p.allocated}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{yen(p.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-mono">{p.reorderPoint}</td>
                    <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${s.bg} ${s.text} border ${s.border}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>{s.label}</span></td>
                    <td className="px-3 py-2"><Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditing(p)}>編集</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(editing || newPart) && (
        <PartFormModal part={editing || newPart} isNew={!!newPart} onClose={() => { setEditing(null); setNewPart(null); }} onSave={handleSave} />
      )}
    </div>
  );
};

const PartFormModal = ({ part, isNew, onClose, onSave }: { part: any; isNew: boolean; onClose: () => void; onSave: (form: any, isNew: boolean) => void }) => {
  const [form, setForm] = useState(() => ({ ...part }));
  const upd = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));
  const num = (v: string) => Number(v) || 0;

  return (
    <Modal open={!!part} onClose={onClose} title={isNew ? '部品マスタ 新規登録' : `部品マスタ編集: ${part.id}`} size="lg">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="社内品番*"><input value={form.code || ''} onChange={e => upd('code', e.target.value)} className={inputClass} /></Field>
        <Field label="メーカー品番"><input value={form.makerCode || ''} onChange={e => upd('makerCode', e.target.value)} className={inputClass} /></Field>
        <Field label="品名*" full><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
        <Field label="仕様" full><input value={form.spec || ''} onChange={e => upd('spec', e.target.value)} className={inputClass} /></Field>
        <Field label="分類"><input value={form.category || ''} onChange={e => upd('category', e.target.value)} className={inputClass} /></Field>
        <Field label="メーカー"><input value={form.maker || ''} onChange={e => upd('maker', e.target.value)} className={inputClass} /></Field>
        <Field label="単位"><input value={form.unit || ''} onChange={e => upd('unit', e.target.value)} className={inputClass} /></Field>
        <Field label="標準単価 (円)"><input type="number" value={form.unitPrice ?? 0} onChange={e => upd('unitPrice', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="リードタイム (日)"><input type="number" value={form.leadTime ?? 0} onChange={e => upd('leadTime', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="保管ロケーション"><input value={form.location || form.defaultLocId || ''} onChange={e => upd('defaultLocId', e.target.value)} className={`${inputClass} font-mono`} /></Field>
        <Field label="発注点*"><input type="number" value={form.reorderPoint ?? 0} onChange={e => upd('reorderPoint', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="安全在庫"><input type="number" value={form.safetyStock ?? 0} onChange={e => upd('safetyStock', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
        <Field label="最大在庫"><input type="number" value={form.maxStock ?? 0} onChange={e => upd('maxStock', num(e.target.value))} className={`${inputClass} text-right font-mono`} /></Field>
      </div>
      <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.code || !form.name}>{isNew ? '登録' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </Modal>
  );
};

// ========================== Orders ==========================
const OrdersScreen = ({ parts, orders, onRefresh, toast }: {
  parts: Part[]; orders: Order[]; onRefresh: () => void; toast: (msg: string) => void;
}) => {
  const [tab, setTab] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    if (tab === 'all') return orders;
    if (tab === 'active') return orders.filter(o => ['awaiting', 'partial', 'pending', 'ordered'].includes(o.status));
    if (tab === 'issue') return orders.filter(o => ['delayed', 'manufacturer_shortage'].includes(o.status));
    if (tab === 'completed') return orders.filter(o => o.status === 'completed');
    return orders;
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

  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex border-b border-slate-200 px-2">
          {[
            { id: 'all', label: '全て', n: orders.length },
            { id: 'active', label: '進行中', n: orders.filter(o => ['awaiting', 'partial', 'pending', 'ordered'].includes(o.status)).length },
            { id: 'issue', label: '要対応', n: orders.filter(o => ['delayed', 'manufacturer_shortage'].includes(o.status)).length },
            { id: 'completed', label: '完納', n: orders.filter(o => o.status === 'completed').length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2.5 text-sm font-medium border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
              {t.label} <span className="ml-1 text-xs text-slate-400">{t.n}</span>
            </button>
          ))}
          <Btn className="ml-auto my-1.5 self-center" size="sm" icon={Plus} onClick={() => setShowNew(true)}>新規発注</Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
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
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{o.orderNo}</td>
                  <td className="px-3 py-2">{o.supplier}</td>
                  <td className="px-3 py-2 text-xs">{o.orderDate}</td>
                  <td className="px-3 py-2 text-xs">{o.desiredDate}</td>
                  <td className="px-3 py-2 text-right font-mono">{yen(o.totalAmount)}</td>
                  <td className="px-3 py-2"><StatusBadge statusKey={o.status} statusMap={ORDER_STATUS} /></td>
                  <td className="px-3 py-2"><Btn variant="ghost" size="sm" onClick={() => setShowDetail(o)}>詳細</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && (
        <Modal open onClose={() => setShowDetail(null)} title={`発注詳細: ${showDetail.orderNo}`} size="lg">
          <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
            <div><div className="text-xs text-slate-500">仕入先</div><div className="font-semibold">{showDetail.supplier}</div></div>
            <div><div className="text-xs text-slate-500">発注日</div><div>{showDetail.orderDate}</div></div>
            <div><div className="text-xs text-slate-500">希望納期</div><div>{showDetail.desiredDate}</div></div>
            <div><div className="text-xs text-slate-500">ステータス</div><StatusBadge statusKey={showDetail.status} statusMap={ORDER_STATUS} /></div>
          </div>
          <div className="bg-slate-50 rounded p-3 mb-4">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500"><tr><th className="text-left py-1">品名</th><th className="text-right py-1">数量</th><th className="text-right py-1">入庫済</th><th className="text-right py-1">単価</th></tr></thead>
              <tbody>
                {showDetail.details?.map((it, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="py-1.5"><div className="text-xs font-mono text-slate-500">{it.partId}</div><div>{it.partName || it.partId}</div></td>
                    <td className="text-right py-1.5 font-mono">{it.qty}</td>
                    <td className="text-right py-1.5 font-mono text-slate-500">{it.receivedQty}</td>
                    <td className="text-right py-1.5 font-mono">{yen(it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            {(showDetail.status === 'pending' || showDetail.status === 'draft') && (
              <Btn variant="success" icon={CheckCircle2} onClick={() => handleApprove(showDetail.id)}>承認</Btn>
            )}
            <Btn variant="secondary" onClick={() => setShowDetail(null)} className="ml-auto">閉じる</Btn>
          </div>
        </Modal>
      )}

      {showNew && (
        <NewOrderModal parts={parts} onClose={() => setShowNew(false)} onRefresh={onRefresh} toast={toast} />
      )}
    </div>
  );
};

const NewOrderModal = ({ parts, onClose, onRefresh, toast }: {
  parts: Part[]; onClose: () => void; onRefresh: () => void; toast: (msg: string) => void;
}) => {
  const lowStockParts = parts.filter(p => {
    const eff = p.stock - p.allocated + (p.shortageReason ? 0 : p.onOrder);
    return eff < p.reorderPoint && !p.shortageReason;
  });
  const [items, setItems] = useState(() => lowStockParts.slice(0, 5).map(p => ({
    partId: p.id, name: p.name, qty: Math.max(p.maxStock - (p.stock - p.allocated + p.onOrder), p.reorderPoint), unitPrice: p.unitPrice, supplierId: p.supplierId
  })));
  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const submit = async () => {
    if (items.length === 0) return;
    try {
      await api.createOrder({
        supplierId: items[0]?.supplierId || 1,
        desiredDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        details: items.map(i => ({ partId: i.partId, qty: i.qty, unitPrice: i.unitPrice })),
      });
      toast('発注書を作成しました');
      onRefresh();
      onClose();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  return (
    <Modal open onClose={onClose} title="新規発注書作成" size="lg">
      <div className="bg-slate-50 rounded p-3 mb-3">
        <div className="text-xs font-semibold text-slate-600 mb-2">発注明細 ({items.length} 件)</div>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500"><tr><th className="text-left py-1">品名</th><th className="text-right py-1 w-20">数量</th><th className="text-right py-1 w-24">単価</th><th className="text-right py-1 w-28">小計</th><th className="w-8"></th></tr></thead>
          <tbody>
            {items.map(it => (
              <tr key={it.partId} className="border-t border-slate-200">
                <td className="py-1.5"><div className="text-xs font-mono text-slate-500">{it.partId}</div><div>{it.name}</div></td>
                <td className="py-1.5"><input type="number" value={it.qty} onChange={e => setItems(prev => prev.map(i => i.partId === it.partId ? { ...i, qty: Number(e.target.value) || 0 } : i))} className={`${inputClass} text-right`} /></td>
                <td className="py-1.5 text-right font-mono">{yen(it.unitPrice)}</td>
                <td className="py-1.5 text-right font-mono font-semibold">{yen(it.qty * it.unitPrice)}</td>
                <td><button onClick={() => setItems(prev => prev.filter(i => i.partId !== it.partId))} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 size={13} /></button></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t-2 border-slate-300"><td colSpan={3} className="text-right py-2 font-semibold">合計</td><td className="text-right py-2 font-mono font-bold">{yen(total)}</td><td></td></tr></tfoot>
        </table>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Btn variant="primary" icon={ShoppingCart} onClick={submit} disabled={items.length === 0}>発注書作成</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </Modal>
  );
};

// ========================== Inventory ==========================
const InventoryScreen = ({ parts, locations }: { parts: Part[]; locations: Location[] }) => {
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
        <span className="text-xs text-slate-500">倉庫:</span>
        <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="text-xs px-2 py-1 border border-slate-200 rounded">
          {warehouses.map(w => <option key={w} value={w}>{w === 'all' ? '全倉庫' : w}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        {grouped.map(g => (
          <div key={g.key} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <MapPin size={14} className="text-blue-600" />
              <span className="font-mono font-bold text-slate-900">{g.label}</span>
              <span className="text-xs text-slate-500">{g.sub}</span>
              <span className="ml-auto text-xs text-slate-500">{g.items.length}品目</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs text-slate-500 border-b border-slate-100">
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
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-mono text-xs">{p.id}</td>
                    <td className="px-3 py-1.5">{p.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold">{p.stock} {p.unit}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-amber-700">{p.allocated || '-'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-blue-700">{p.onOrder || '-'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-slate-600">{yen(p.stock * p.unitPrice)}</td>
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
const LocationsScreen = ({ locations }: { locations: Location[] }) => {
  const grouped = useMemo(() => {
    const wh: Record<string, Location[]> = {};
    locations.forEach(l => { if (!wh[l.warehouse]) wh[l.warehouse] = []; wh[l.warehouse].push(l); });
    return Object.entries(wh);
  }, [locations]);

  return (
    <div className="p-5 space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 text-sm">
        <Warehouse size={18} className="text-blue-600" />
        <div className="flex-1">
          <div className="font-bold text-blue-900">ロケーション体系</div>
          <div className="text-xs text-blue-700">倉庫 / 棚 / 列 / 段 / 左右の階層で在庫位置を管理</div>
        </div>
      </div>
      {grouped.map(([wh, locs]) => (
        <div key={wh} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Warehouse size={14} className="text-slate-600" />
            <span className="font-bold text-sm">{wh}</span>
            <span className="text-xs text-slate-500">({locs.length}ロケーション)</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white text-xs text-slate-500 border-b border-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium">ID</th>
                <th className="text-left px-3 py-2 font-medium">名称</th>
                <th className="text-left px-3 py-2 font-medium">タイプ</th>
                <th className="text-right px-3 py-2 font-medium">最大容量</th>
                <th className="text-left px-3 py-2 font-medium">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2"><span className="font-mono inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-xs"><MapPin size={10} />{l.id}</span></td>
                  <td className="px-3 py-2">{l.name}</td>
                  <td className="px-3 py-2 text-xs"><span className="px-1.5 py-0.5 bg-slate-100 rounded">{l.locType}</span></td>
                  <td className="px-3 py-2 text-right font-mono">{l.maxQty.toLocaleString()}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${l.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{l.isActive ? '有効' : '無効'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

// ========================== Other Screens ==========================
const ReceiveScreen = ({ orders, onRefresh, toast }: { orders: Order[]; onRefresh: () => void; toast: (msg: string) => void }) => {
  const pendingOrders = orders.filter(o => ['awaiting', 'partial', 'delayed'].includes(o.status));
  const [receiving, setReceiving] = useState<Order | null>(null);

  const handleReceive = async (order: Order, receiveItems: { partId: string; qty: number }[]) => {
    try {
      await api.createReceive({
        orderId: order.id,
        items: receiveItems.map(item => ({
          ...item,
          orderDetailId: (order.details.find(d => d.partId === item.partId) as any)?.id,
          locationId: 'A-03-2-L', // default location
          result: 'ok',
        })),
      });
      toast('入庫を登録しました');
      setReceiving(null);
      onRefresh();
    } catch (e: any) {
      toast(`エラー: ${e.message}`);
    }
  };

  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200"><h2 className="font-bold text-sm">入庫待ち発注 ({pendingOrders.length}件)</h2></div>
        {pendingOrders.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">入庫待ちの発注はありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">発注番号</th>
                  <th className="text-left px-3 py-2 font-medium">仕入先</th>
                  <th className="text-left px-3 py-2 font-medium">部品</th>
                  <th className="text-right px-3 py-2 font-medium">発注数</th>
                  <th className="text-right px-3 py-2 font-medium">入庫済</th>
                  <th className="text-right px-3 py-2 font-medium">残数</th>
                  <th className="text-left px-3 py-2 font-medium">ステータス</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingOrders.map(o => o.details?.filter(d => d.qty - d.receivedQty > 0).map((d, i) => (
                  <tr key={`${o.id}-${i}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{i === 0 ? o.orderNo : ''}</td>
                    <td className="px-3 py-2 text-xs">{i === 0 ? o.supplier : ''}</td>
                    <td className="px-3 py-2"><div className="font-semibold">{d.partName || d.partId}</div><div className="text-xs text-slate-500 font-mono">{d.partId}</div></td>
                    <td className="px-3 py-2 text-right font-mono">{d.qty}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500">{d.receivedQty}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-amber-700">{d.qty - d.receivedQty}</td>
                    <td className="px-3 py-2">{i === 0 && <StatusBadge statusKey={o.status} statusMap={ORDER_STATUS} />}</td>
                    <td className="px-3 py-2">{i === 0 && <Btn variant="success" size="sm" icon={Truck} onClick={() => setReceiving(o)}>入庫</Btn>}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {receiving && (
        <ReceiveModal order={receiving} onClose={() => setReceiving(null)} onReceive={handleReceive} />
      )}
    </div>
  );
};

const ReceiveModal = ({ order, onClose, onReceive }: { order: Order; onClose: () => void; onReceive: (order: Order, items: { partId: string; qty: number }[]) => void }) => {
  const remainingDetails = order.details?.filter(d => d.qty - d.receivedQty > 0) || [];
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const q: Record<string, number> = {};
    remainingDetails.forEach(d => { q[d.partId] = d.qty - d.receivedQty; });
    return q;
  });

  return (
    <Modal open onClose={onClose} title={`入庫処理: ${order.orderNo}`} size="lg">
      <div className="mb-3 text-sm text-slate-600">仕入先: <span className="font-semibold">{order.supplier}</span></div>
      <table className="w-full text-sm mb-4">
        <thead className="text-xs text-slate-500 bg-slate-50"><tr><th className="text-left px-3 py-2">部品</th><th className="text-right px-3 py-2">発注</th><th className="text-right px-3 py-2">入庫済</th><th className="text-right px-3 py-2">今回入庫数</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {remainingDetails.map(d => (
            <tr key={d.partId}>
              <td className="px-3 py-2"><div className="font-semibold">{d.partName || d.partId}</div></td>
              <td className="px-3 py-2 text-right font-mono">{d.qty}</td>
              <td className="px-3 py-2 text-right font-mono text-slate-500">{d.receivedQty}</td>
              <td className="px-3 py-2"><input type="number" value={quantities[d.partId] || 0} onChange={e => setQuantities(prev => ({ ...prev, [d.partId]: Math.min(Number(e.target.value) || 0, d.qty - d.receivedQty) }))} className={`${inputClass} text-right w-24 ml-auto`} max={d.qty - d.receivedQty} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 pt-3 border-t border-slate-100">
        <Btn variant="success" icon={CheckCircle2} onClick={() => onReceive(order, Object.entries(quantities).filter(([, q]) => q > 0).map(([partId, qty]) => ({ partId, qty })))}>入庫確定</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </Modal>
  );
};

const ProductionScreen = ({ prodOrders }: { prodOrders: ProdOrder[] }) => (
  <div className="p-5 space-y-3">
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-200"><h2 className="font-bold text-sm">製造指図一覧</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-3 py-2 font-medium">指図番号</th>
              <th className="text-left px-3 py-2 font-medium">製品</th>
              <th className="text-right px-3 py-2 font-medium">数量</th>
              <th className="text-left px-3 py-2 font-medium">顧客</th>
              <th className="text-left px-3 py-2 font-medium">納期</th>
              <th className="text-left px-3 py-2 font-medium">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prodOrders.map(m => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{m.prodNo}</td>
                <td className="px-3 py-2 font-semibold">{m.productName || m.productCode}</td>
                <td className="px-3 py-2 text-right font-mono">{m.qty}</td>
                <td className="px-3 py-2 text-xs">{m.customer}</td>
                <td className="px-3 py-2 text-xs">{m.dueDate}</td>
                <td className="px-3 py-2"><StatusBadge statusKey={m.status} statusMap={MO_STATUS} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const IssueScreen = ({ prodOrders }: { prodOrders: ProdOrder[] }) => {
  const active = prodOrders.filter(m => ['allocated', 'picking'].includes(m.status));
  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200"><h2 className="font-bold text-sm">出庫処理 - 製造指図からのピッキング</h2></div>
        {active.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">出庫待ちの指図はありません</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {active.map(m => (
              <div key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div><span className="font-mono text-xs text-slate-500">{m.prodNo}</span><span className="mx-2 text-sm font-semibold">{m.productName}</span><StatusBadge statusKey={m.status} statusMap={MO_STATUS} /></div>
                  <span className="text-xs text-slate-500">納期: {m.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductsScreen = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getProducts().then(res => { setProducts(res.data || []); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200"><h2 className="font-bold text-sm">製品マスタ・BOM</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2 font-medium">製品コード</th>
                <th className="text-left px-3 py-2 font-medium">製品名</th>
                <th className="text-left px-3 py-2 font-medium">分類</th>
                <th className="text-left px-3 py-2 font-medium">電圧</th>
                <th className="text-left px-3 py-2 font-medium">寸法</th>
                <th className="text-right px-3 py-2 font-medium">BOM部品数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                  <td className="px-3 py-2 font-semibold">{p.name}</td>
                  <td className="px-3 py-2 text-xs">{p.category}</td>
                  <td className="px-3 py-2 text-xs">{p.voltage}</td>
                  <td className="px-3 py-2 text-xs">{p.dimensions}</td>
                  <td className="px-3 py-2 text-right font-mono">{p._count?.boms || p.boms?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StocktakeScreen = () => (
  <div className="p-5">
    <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
      <ClipboardCheck size={48} className="mx-auto text-slate-300 mb-3" />
      <h2 className="font-bold text-lg text-slate-700 mb-1">棚卸し管理</h2>
      <p className="text-sm text-slate-500">月次・期末棚卸しを管理します</p>
    </div>
  </div>
);

const ReportsScreen = () => (
  <div className="p-5">
    <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
      <BarChart3 size={48} className="mx-auto text-slate-300 mb-3" />
      <h2 className="font-bold text-lg text-slate-700 mb-1">レポート</h2>
      <p className="text-sm text-slate-500">在庫推移・発注分析等のレポート機能は準備中です</p>
    </div>
  </div>
);

const LogsScreen = ({ logs }: { logs: Log[] }) => {
  const [catFilter, setCatFilter] = useState('all');
  const filtered = useMemo(() => catFilter === 'all' ? logs : logs.filter(l => l.category === catFilter), [catFilter, logs]);

  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2">
        <Filter size={12} className="text-slate-400" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="text-xs px-2 py-1 border border-slate-200 rounded">
          <option value="all">全カテゴリ</option>
          {Object.entries(LOG_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-500">{filtered.length}件</span>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
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
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">{new Date(log.ts).toLocaleString('ja-JP')}</td>
                  <td className="px-3 py-2 text-xs">{log.userName}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${cat?.color || ''}`}>{cat?.label || log.category}</span></td>
                  <td className="px-3 py-2 text-xs font-semibold">{log.action}</td>
                  <td className="px-3 py-2 font-mono text-xs">{log.targetId}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-xs truncate">{log.description}</td>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.data || res || []);
    } catch { /* ignore */ }
    setConvsLoading(false);
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
            <div className="text-center py-4"><Loader2 size={16} className="animate-spin mx-auto text-slate-400" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-4">会話履歴はありません</div>
          ) : conversations.map((conv: any) => (
            <button key={conv.id} onClick={() => loadConversation(conv.id)}
              className={`w-full text-left px-2.5 py-2 rounded text-xs mb-0.5 transition ${conv.id === sessionId ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
              <div className="truncate">{conv.title || '無題の会話'}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString('ja-JP') : ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-r-lg border border-slate-200 flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
          <Sparkles size={16} className="text-blue-600" />
          <span className="text-sm font-bold text-slate-900">AI チャット</span>
          {sessionId && <span className="text-xs text-slate-400 font-mono">#{sessionId.slice(0, 8)}</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 mt-16">
              <Sparkles size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">AI に質問してみましょう</p>
              <p className="text-xs text-slate-400 mt-1">在庫・発注・製造データについて自然言語で質問できます</p>
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
                <div className={`px-4 py-2.5 rounded-xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>

                {/* No results warning */}
                {m.role === 'assistant' && isNoResult(m.content) && (
                  <div className="mt-2 flex items-start gap-2 border-l-4 border-amber-300 bg-amber-50 px-3 py-2 rounded-r text-xs text-amber-800">
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
                    <button onClick={() => handleCopy(m.content)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition" title="コピー">
                      <Copy size={12} />
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400">
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

        {/* Suggestion pills when messages exist but empty input */}
        {messages.length > 0 && !input && (
          <div className="px-4 pb-1 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map(q => (
              <button key={q} onClick={() => handleSend(q)} className="text-[11px] px-2.5 py-1 bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 border border-slate-200 transition">{q}</button>
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
    { value: 'user', label: '一般', color: 'bg-slate-100 text-slate-700' },
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
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="名前・メール・IDで検索..." className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <span className="text-xs text-slate-500">{filteredUsers.length}件</span>
        <div className="ml-auto">
          <Btn icon={UserPlus} onClick={() => setShowNew(true)}>ユーザー招待</Btn>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
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
                  <td className="px-3 py-2 text-xs text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ja-JP') : '-'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleToggleActive(u)} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}{u.isActive ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditing(u)}>編集</Btn>
                      <button onClick={() => { setResetPwUser(u); setNewPassword(''); }} className="text-xs text-slate-500 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition flex items-center gap-1" title="パスワードリセット">
                        <KeyRound size={11} /> PW
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">該当するユーザーが見つかりません</td></tr>
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
                <p className="font-semibold text-amber-800">本当に無効化しますか？</p>
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
      {isNew && <Field label="初期パスワード*"><input type="password" value={form.password || ''} onChange={e => upd('password', e.target.value)} className={inputClass} /></Field>}
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
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.name || !form.email || (isNew && !form.password)}>{isNew ? '招待メール送信' : '保存'}</Btn>
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
          {!isRoot && <span className="text-slate-400 text-sm mr-0.5 flex-shrink-0">└</span>}

          {/* Hierarchy icon */}
          <Building size={14} className={isRoot ? 'text-blue-500' : 'text-slate-400'} />

          {/* Name */}
          <span className={`flex-1 min-w-0 truncate ${isRoot ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>{node.name}</span>

          {/* Department level badge */}
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isRoot ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-600'}`}>
            {isRoot ? '部' : '課'}
          </span>

          {/* Recursive user count */}
          <span className="text-xs text-slate-500 flex-shrink-0">{count}名</span>

          {node.code && <span className="text-xs font-mono text-slate-400 flex-shrink-0">{node.code}</span>}

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
        <p className="text-xs text-slate-500">部 → 課 の階層構造（最大2階層）</p>
        <Btn icon={Plus} onClick={() => { setShowNew(true); setEditing(null); setAddChildParent(null); }}>部署追加</Btn>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {tree.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">部署がまだ登録されていません</div>
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
        <p className="mt-1 text-xs text-slate-400">親なし = 部 / 親あり = 課</p>
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
  { value: 'CONTRACT_AMOUNT', label: '契約金額', color: 'bg-amber-100 text-amber-800' },
  { value: 'PAYMENT_TERMS', label: '支払条件', color: 'bg-purple-100 text-purple-800' },
  { value: 'CONTRACT_DATE', label: '契約日', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'PRODUCT_NAME', label: '製品名', color: 'bg-pink-100 text-pink-800' },
  { value: 'CREDIT_LIMIT', label: '与信限度額', color: 'bg-orange-100 text-orange-800' },
  { value: 'OTHER', label: 'その他', color: 'bg-slate-100 text-slate-700' },
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
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${activeTab === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---- Extracted Entities Tab ---- */}
      {activeTab === 'extracted' && (
        <>
          <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2">
            <Filter size={12} className="text-slate-400" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-xs px-2 py-1 border border-slate-200 rounded">
              <option value="all">すべての種別</option>
              {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <span className="ml-auto text-xs text-slate-500">{entities.length}件</span>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {entLoading ? (
              <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>
            ) : entities.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">エンティティがありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
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
                        <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${t?.color || 'bg-slate-100 text-slate-700'}`}>{t?.label || e.entityType}</span></td>
                        <td className="px-3 py-2 font-medium">{e.entityValue || e.name}</td>
                        <td className="px-3 py-2">
                          {editingEntityId === e.id ? (
                            <div className="flex gap-1 items-center">
                              <input type="text" value={editNorm} onChange={ev => setEditNorm(ev.target.value)}
                                className="w-32 rounded border border-blue-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus
                                onKeyDown={ev => ev.key === 'Enter' && handleInlineEdit(e.id)} />
                              <button onClick={() => handleInlineEdit(e.id)} className="text-emerald-600 hover:text-emerald-700 text-xs font-bold">OK</button>
                              <button onClick={() => setEditingEntityId(null)} className="text-slate-400 text-xs">X</button>
                            </div>
                          ) : (
                            <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => { setEditingEntityId(e.id); setEditNorm(e.normalizedValue || ''); }}>
                              {e.normalizedValue || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{e.documentCount || e.sourceCount || 1}件</td>
                        <td className="px-3 py-2">
                          {e.isMatchedMaster ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> 一致</span>
                          ) : (
                            <span className="text-xs text-slate-400">未登録</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleVerify(e)} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${e.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {e.isVerified ? <><Shield size={10} /> 検証済</> : '未検証'}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => { setEditingEntityId(e.id); setEditNorm(e.normalizedValue || ''); }} className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition">
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
              <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>
            ) : masters.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">マスタがありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
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
                        <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${t?.color || 'bg-slate-100 text-slate-700'}`}>{t?.label || m.entityType}</span></td>
                        <td className="px-3 py-2 font-semibold">{m.canonicalValue}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(m.aliases || []).map((a: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                                <Tag size={10} className="text-slate-400" /> {a}
                              </span>
                            ))}
                            {(!m.aliases || m.aliases.length === 0) && <span className="text-xs text-slate-400">-</span>}
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
// ========================== QR Code ==========================
const QrScreen = ({ parts, locations, toast }: { parts: Part[]; locations: Location[]; toast: (msg: string) => void }) => {
  const [tab, setTab] = useState<'parts' | 'locations' | 'scan'>('parts');
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

  const handleScan = () => {
    try {
      const data = JSON.parse(scanInput);
      if (data.type === 'part') {
        const part = parts.find(p => p.id === data.id);
        setScanResult(part ? { type: 'part', data: part } : { type: 'error', message: '部品が見つかりません' });
      } else if (data.type === 'location') {
        const loc = locations.find(l => l.id === data.id);
        const locParts = parts.filter(p => p.location === data.id);
        setScanResult(loc ? { type: 'location', data: loc, parts: locParts } : { type: 'error', message: 'ロケーションが見つかりません' });
      }
    } catch {
      // Try as plain ID
      const part = parts.find(p => p.id === scanInput || p.code === scanInput);
      if (part) { setScanResult({ type: 'part', data: part }); return; }
      const loc = locations.find(l => l.id === scanInput);
      if (loc) { setScanResult({ type: 'location', data: loc, parts: parts.filter(p => p.location === loc.id) }); return; }
      setScanResult({ type: 'error', message: '該当するデータが見つかりません' });
    }
  };

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
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
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
              <button onClick={() => setSelectedParts(new Set())} className="text-xs text-slate-500 hover:underline">全解除</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs text-slate-500 border-b border-slate-100">
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
                    <td className="px-3 py-2"><div className="font-mono text-xs">{p.id}</div><div className="font-mono text-[10px] text-slate-400">{p.code}</div></td>
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
              <button onClick={() => setSelectedLocs(new Set())} className="text-xs text-slate-500 hover:underline">全解除</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs text-slate-500 border-b border-slate-100">
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
            <div className="max-w-lg mx-auto space-y-4">
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-8 text-center">
                <ScanLine size={48} className="mx-auto text-slate-400 mb-3" />
                <p className="text-sm text-slate-600 mb-1">QRコードをスキャンまたは品番/ロケーションIDを入力</p>
                <p className="text-xs text-slate-400">タブレットのカメラでQRを読み取るか、手入力で検索</p>
              </div>
              <div className="flex gap-2">
                <input value={scanInput} onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  placeholder="品番 (PT00012345) またはロケーションID (A-03-2-L)"
                  className={`${inputClass} flex-1 font-mono`} />
                <Btn variant="primary" icon={Search} onClick={handleScan}>検索</Btn>
              </div>

              {scanResult?.type === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{scanResult.message}</div>
              )}
              {scanResult?.type === 'part' && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={16} className="text-blue-600" />
                    <span className="font-bold">部品情報</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-xs text-slate-500">品番</span><div className="font-mono">{scanResult.data.id}</div></div>
                    <div><span className="text-xs text-slate-500">社内品番</span><div className="font-mono">{scanResult.data.code}</div></div>
                    <div className="col-span-2"><span className="text-xs text-slate-500">品名</span><div className="font-semibold">{scanResult.data.name}</div></div>
                    <div><span className="text-xs text-slate-500">在庫</span><div className="font-mono text-lg font-bold">{scanResult.data.stock} {scanResult.data.unit}</div></div>
                    <div><span className="text-xs text-slate-500">引当</span><div className="font-mono">{scanResult.data.allocated}</div></div>
                    <div><span className="text-xs text-slate-500">棚位置</span><div className="font-mono">{scanResult.data.location}</div></div>
                    <div><span className="text-xs text-slate-500">単価</span><div className="font-mono">{yen(scanResult.data.unitPrice)}</div></div>
                  </div>
                </div>
              )}
              {scanResult?.type === 'location' && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-blue-600" />
                    <span className="font-bold">ロケーション情報</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="text-xs text-slate-500">ID</span><div className="font-mono font-bold">{scanResult.data.id}</div></div>
                    <div><span className="text-xs text-slate-500">倉庫</span><div>{scanResult.data.warehouse}</div></div>
                    <div><span className="text-xs text-slate-500">名称</span><div>{scanResult.data.name}</div></div>
                    <div><span className="text-xs text-slate-500">タイプ</span><div>{scanResult.data.locType}</div></div>
                  </div>
                  {scanResult.parts?.length > 0 && (
                    <>
                      <div className="text-xs font-semibold text-slate-600 mb-1">格納部品 ({scanResult.parts.length}件)</div>
                      <div className="space-y-1">
                        {scanResult.parts.map((p: Part) => (
                          <div key={p.id} className="flex items-center gap-2 text-xs bg-slate-50 rounded px-2 py-1">
                            <span className="font-mono text-slate-500">{p.id}</span>
                            <span className="flex-1">{p.name}</span>
                            <span className="font-mono font-semibold">{p.stock} {p.unit}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
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
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPw.length < 6) { toast('パスワードは6文字以上で入力してください'); return; }
    if (newPw !== confirmPw) { toast('新しいパスワードが一致しません'); return; }
    setPwLoading(true);
    try {
      await api.updateUser(1, { password: newPw }); // TODO: use current user ID
      toast('パスワードを変更しました');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) { toast(`エラー: ${e.message}`); }
    setPwLoading(false);
  };

  return (
    <div className="p-5 space-y-6 max-w-2xl">
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
            <div className="text-xs text-slate-500">画面右下にAIチャットボタンを表示します</div>
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
          <div className="text-center mt-12 text-slate-400">
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
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
              {m.content}
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

// ========================== View Titles ==========================
const viewTitles: Record<string, { title: string; subtitle?: string }> = {
  dashboard: { title: 'ダッシュボード', subtitle: '在庫状況の概要' },
  master: { title: '部品マスタ', subtitle: '部品情報の登録・編集' },
  products: { title: '製品マスタ・BOM', subtitle: '製品構成部品の管理' },
  inventory: { title: '在庫一覧', subtitle: 'ロケーション別の在庫状況' },
  locations: { title: 'ロケーション', subtitle: '棚位置の管理' },
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
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [partsRes, ordersRes, prodRes, locRes, logsRes] = await Promise.all([
        api.getParts(),
        api.getOrders(),
        api.getProductionOrders(),
        api.getLocations(),
        api.getLogs({ limit: '50' }),
      ]);
      setParts(partsRes.data || []);
      setOrders(ordersRes.data || []);
      setProdOrders(prodRes.data || []);
      setLocations(locRes.data || []);
      setLogs(logsRes.data || []);
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
          <div className="text-sm text-slate-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  const vt = viewTitles[view] || { title: view };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar view={view} setView={setView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={vt.title} subtitle={vt.subtitle} />
        <div className="flex-1 overflow-y-auto">
          {view === 'dashboard' && <Dashboard parts={parts} orders={orders} prodOrders={prodOrders} setView={setView} />}
          {view === 'master' && <MasterScreen parts={parts} onRefresh={fetchAll} toast={toast} />}
          {view === 'products' && <ProductsScreen />}
          {view === 'inventory' && <InventoryScreen parts={parts} locations={locations} />}
          {view === 'locations' && <LocationsScreen locations={locations} />}
          {view === 'orders' && <OrdersScreen parts={parts} orders={orders} onRefresh={fetchAll} toast={toast} />}
          {view === 'receive' && <ReceiveScreen orders={orders} onRefresh={fetchAll} toast={toast} />}
          {view === 'production' && <ProductionScreen prodOrders={prodOrders} />}
          {view === 'issue' && <IssueScreen prodOrders={prodOrders} />}
          {view === 'stocktake' && <StocktakeScreen />}
          {view === 'reports' && <ReportsScreen />}
          {view === 'logs' && <LogsScreen logs={logs} />}
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
    </div>
  );
}

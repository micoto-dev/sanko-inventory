'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard, Search, Package, ShoppingCart, ClipboardCheck,
  Bell, AlertTriangle, AlertCircle, Boxes, Truck, Filter,
  CheckCircle2, MapPin, Plus, Edit, BarChart3, Package2, Anchor,
  Factory, Warehouse, Trash2, Save, Send, MessageSquare, Users,
  History, Cpu, Loader2, Building, Database, Shield, UserPlus,
  ChevronRight, ToggleLeft, ToggleRight,
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
const Sidebar = ({ view, setView, alertCount, moCount }: {
  view: string; setView: (v: string) => void; alertCount: number; moCount: number;
}) => {
  const items = [
    { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { id: 'master', label: '部品マスタ', icon: Package },
    { id: 'products', label: '製品マスタ・BOM', icon: Cpu },
    { id: 'inventory', label: '在庫一覧', icon: Boxes },
    { id: 'locations', label: 'ロケーション', icon: Warehouse },
    { id: 'orders', label: '発注管理', icon: ShoppingCart, badge: alertCount },
    { id: 'receive', label: '入庫処理', icon: Truck },
    { id: 'production', label: '製造指図', icon: Factory, badge: moCount },
    { id: 'issue', label: '出庫処理', icon: Package2 },
    { id: 'stocktake', label: '棚卸し', icon: ClipboardCheck },
    { id: 'reports', label: 'レポート', icon: BarChart3 },
    { id: 'logs', label: '履歴・ログ', icon: History },
    { id: 'chat', label: 'AIチャット', icon: MessageSquare },
    { id: 'users', label: 'ユーザー管理', icon: Users },
    { id: 'departments', label: '部署管理', icon: Building },
    { id: 'entities', label: 'エンティティ', icon: Database },
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
              {(item.badge ?? 0) > 0 && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">{item.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center"><Anchor size={12} /></div>
        <div className="flex-1 min-w-0"><div className="text-slate-200">ユーザー</div><div>管理者</div></div>
      </div>
    </aside>
  );
};

const TopBar = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
    <div>
      <h1 className="text-base font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
    <div className="text-xs text-slate-500 px-2">{new Date().toLocaleDateString('ja-JP')}</div>
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
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await api.chat(userMsg, sessionId);
      setSessionId(res.data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `エラー: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 flex flex-col h-[calc(100vh-60px)]">
      <div className="flex-1 bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 mt-20">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">在庫・発注・製造指図について質問できます</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {['在庫切れの部品は？', '発注中の部品一覧', '製造指図の進捗は？', 'メーカー欠品の状況'].map(q => (
                  <button key={q} onClick={() => { setInput(q); }} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100">{q}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 px-4 py-2.5 rounded-lg"><Loader2 size={16} className="animate-spin text-slate-500" /></div>
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 p-3 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="質問を入力..." className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          <Btn variant="primary" icon={Send} onClick={handleSend} disabled={loading || !input.trim()}>送信</Btn>
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
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      toast(`${user.name} を${user.isActive ? '無効化' : '有効化'}しました`);
      load();
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

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-end">
        <Btn icon={UserPlus} onClick={() => setShowNew(true)}>ユーザー招待</Btn>
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
              <th className="text-left px-3 py-2 font-medium">状態</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u: any) => {
              const r = roles.find(x => x.value === u.role);
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold">{u.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.loginId}</td>
                  <td className="px-3 py-2 text-xs">{u.email}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${r?.color || ''}`}>{r?.label || u.role}</span></td>
                  <td className="px-3 py-2 text-xs">{u.department || '-'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleToggleActive(u)} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}{u.isActive ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-3 py-2"><Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditing(u)}>編集</Btn></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(showNew || editing) && (
        <Modal open onClose={() => { setShowNew(false); setEditing(null); }} title={showNew ? 'ユーザー招待' : 'ユーザー編集'} size="md">
          <UserForm user={editing} isNew={showNew} departments={departments} roles={roles} onSave={handleSave} onClose={() => { setShowNew(false); setEditing(null); }} />
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
      {isNew && <Field label="社内ID*"><input value={form.loginId || ''} onChange={e => upd('loginId', e.target.value)} className={inputClass} /></Field>}
      <Field label="メール*"><input type="email" value={form.email || ''} onChange={e => upd('email', e.target.value)} className={inputClass} /></Field>
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
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.name || (isNew && (!form.loginId || !form.password))}>{isNew ? '招待' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
      </div>
    </div>
  );
};

// ========================== Departments ==========================
const DepartmentsScreen = ({ toast }: { toast: (msg: string) => void }) => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    try { const res = await api.getDepartments(); setDepartments(res.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) { await api.createDepartment(form); toast(`部署「${form.name}」を作成しました`); }
      else { await api.updateDepartment(form.id, form); toast(`部署「${form.name}」を更新しました`); }
      setShowNew(false); setEditing(null); load();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleDelete = async (dept: any) => {
    try { await api.deleteDepartment(dept.id); toast(`部署「${dept.name}」を無効化しました`); load(); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  // Build tree structure
  const tree = useMemo(() => {
    const roots = departments.filter(d => !d.parentId);
    const getChildren = (parentId: number): any[] => departments.filter(d => d.parentId === parentId).map(d => ({ ...d, children: getChildren(d.id) }));
    return roots.map(d => ({ ...d, children: getChildren(d.id) }));
  }, [departments]);

  const renderNode = (node: any, depth: number = 0): React.ReactNode => (
    <div key={node.id}>
      <div className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100`} style={{ paddingLeft: `${16 + depth * 24}px` }}>
        {depth > 0 && <ChevronRight size={12} className="text-slate-400" />}
        <Building size={14} className="text-slate-500" />
        <span className="font-semibold flex-1">{node.name}</span>
        {node.code && <span className="text-xs font-mono text-slate-400">{node.code}</span>}
        <span className="text-xs text-slate-500">{node.userCount || 0}人</span>
        <span className={`text-xs px-2 py-0.5 rounded ${node.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{node.isActive ? '有効' : '無効'}</span>
        <Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditing(node)}>編集</Btn>
        <button onClick={() => handleDelete(node)} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 size={13} /></button>
      </div>
      {node.children?.map((c: any) => renderNode(c, depth + 1))}
    </div>
  );

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-end"><Btn icon={Plus} onClick={() => setShowNew(true)}>部署追加</Btn></div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {tree.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">部署がまだ登録されていません</div>
        ) : tree.map(n => renderNode(n))}
      </div>
      {(showNew || editing) && (
        <Modal open onClose={() => { setShowNew(false); setEditing(null); }} title={showNew ? '部署追加' : '部署編集'} size="md">
          <DeptForm dept={editing} isNew={showNew} departments={departments} onSave={handleSave} onClose={() => { setShowNew(false); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
};

const DeptForm = ({ dept, isNew, departments, onSave, onClose }: any) => {
  const [form, setForm] = useState(() => dept || { name: '', code: '', parentId: null, description: '', sortOrder: 0 });
  const upd = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3 text-sm">
      <Field label="部署名*"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
      <Field label="コード"><input value={form.code || ''} onChange={e => upd('code', e.target.value)} className={inputClass} /></Field>
      <Field label="親部署">
        <select value={form.parentId || ''} onChange={e => upd('parentId', e.target.value ? Number(e.target.value) : null)} className={inputClass}>
          <option value="">なし（最上位）</option>
          {departments.filter((d: any) => d.id !== form.id).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
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
const EntitiesScreen = ({ toast }: { toast: (msg: string) => void }) => {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    try {
      const params: Record<string, string> = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      const res = await api.getEntities(params);
      setEntities(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [typeFilter]);

  const handleSave = async (form: any, isNew: boolean) => {
    try {
      if (isNew) { await api.createEntity(form); toast(`エンティティ「${form.name}」を登録しました`); }
      else { await api.updateEntity(form.id, form); toast(`エンティティ「${form.name}」を更新しました`); }
      setShowNew(false); setEditing(null); load();
    } catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const handleVerify = async (entity: any) => {
    try { await api.updateEntity(entity.id, { isVerified: !entity.isVerified }); toast(`${entity.isVerified ? '未検証に戻しました' : '検証済みにしました'}`); load(); }
    catch (e: any) { toast(`エラー: ${e.message}`); }
  };

  const entityTypes = [
    { value: 'company', label: '会社', color: 'bg-blue-100 text-blue-800' },
    { value: 'person', label: '人名', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'contract', label: '契約', color: 'bg-purple-100 text-purple-800' },
    { value: 'amount', label: '金額', color: 'bg-amber-100 text-amber-800' },
  ];

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-5 space-y-3">
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2">
        <Filter size={12} className="text-slate-400" />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setLoading(true); }} className="text-xs px-2 py-1 border border-slate-200 rounded">
          <option value="all">全タイプ</option>
          {entityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-500">{entities.length}件</span>
        <Btn size="sm" icon={Plus} onClick={() => setShowNew(true)}>登録</Btn>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium">タイプ</th>
              <th className="text-left px-3 py-2 font-medium">名前</th>
              <th className="text-left px-3 py-2 font-medium">カテゴリ</th>
              <th className="text-left px-3 py-2 font-medium">ソース</th>
              <th className="text-left px-3 py-2 font-medium">検証</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entities.map((e: any) => {
              const t = entityTypes.find(x => x.value === e.entityType);
              return (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${t?.color || ''}`}>{t?.label || e.entityType}</span></td>
                  <td className="px-3 py-2 font-semibold">{e.name}</td>
                  <td className="px-3 py-2 text-xs">{e.category || '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{e.sourceDoc || '-'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleVerify(e)} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${e.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {e.isVerified ? <><Shield size={10} /> 検証済</> : '未検証'}
                    </button>
                  </td>
                  <td className="px-3 py-2"><Btn variant="ghost" size="sm" icon={Edit} onClick={() => setEditing(e)}>編集</Btn></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(showNew || editing) && (
        <Modal open onClose={() => { setShowNew(false); setEditing(null); }} title={showNew ? 'エンティティ登録' : 'エンティティ編集'} size="md">
          <EntityForm entity={editing} isNew={showNew} entityTypes={entityTypes} onSave={handleSave} onClose={() => { setShowNew(false); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
};

const EntityForm = ({ entity, isNew, entityTypes, onSave, onClose }: any) => {
  const [form, setForm] = useState(() => entity || { entityType: 'company', name: '', code: '', category: '', description: '', sourceDoc: '' });
  const upd = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3 text-sm">
      <Field label="タイプ*">
        <select value={form.entityType} onChange={e => upd('entityType', e.target.value)} className={inputClass}>
          {entityTypes.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="名前*"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} className={inputClass} /></Field>
      <Field label="コード"><input value={form.code || ''} onChange={e => upd('code', e.target.value)} className={inputClass} /></Field>
      <Field label="カテゴリ"><input value={form.category || ''} onChange={e => upd('category', e.target.value)} className={inputClass} /></Field>
      <Field label="説明"><input value={form.description || ''} onChange={e => upd('description', e.target.value)} className={inputClass} /></Field>
      <Field label="ソースドキュメント"><input value={form.sourceDoc || ''} onChange={e => upd('sourceDoc', e.target.value)} className={inputClass} /></Field>
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Btn variant="primary" icon={Save} onClick={() => onSave(form, isNew)} disabled={!form.name}>{isNew ? '登録' : '保存'}</Btn>
        <Btn variant="secondary" onClick={onClose}>キャンセル</Btn>
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

  const alertCount = parts.filter(p => {
    const eff = p.stock - p.allocated + (p.shortageReason ? 0 : p.onOrder);
    return eff < p.reorderPoint;
  }).length;
  const moCount = prodOrders.filter(m => m.status !== 'completed').length;

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
      <Sidebar view={view} setView={setView} alertCount={alertCount} moCount={moCount} />
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
        </div>
      </main>
      <Toast msg={toastMsg} />
    </div>
  );
}

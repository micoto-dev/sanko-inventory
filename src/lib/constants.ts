export const STATUS_COLOR: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  normal: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '正常' },
  low: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: '発注点割れ' },
  shortage: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: '在庫切れ' },
  manufacturer_shortage: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-600', label: 'メーカー欠品' },
  excess: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: '過剰' },
};

export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: '未発注', color: 'bg-slate-100 text-slate-900' },
  awaiting: { label: '納品待ち', color: 'bg-blue-100 text-blue-800' },
  manufacturer_shortage: { label: 'メーカー欠品', color: 'bg-rose-100 text-rose-800' },
  completed: { label: '完納', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'キャンセル', color: 'bg-slate-200 text-slate-900' },
};

export const MO_STATUS: Record<string, { label: string; color: string }> = {
  planned: { label: '計画', color: 'bg-slate-100 text-slate-900' },
  allocated: { label: '引当済', color: 'bg-blue-100 text-blue-800' },
  picking: { label: 'ピッキング中', color: 'bg-amber-100 text-amber-800' },
  completed: { label: '完了', color: 'bg-emerald-100 text-emerald-800' },
};

export const LOG_CATEGORY: Record<string, { label: string; color: string }> = {
  master: { label: '部品マスタ', color: 'bg-slate-100 text-slate-900' },
  product: { label: '製品/BOM', color: 'bg-purple-100 text-purple-700' },
  location: { label: 'ロケーション', color: 'bg-cyan-100 text-cyan-700' },
  order: { label: '発注', color: 'bg-blue-100 text-blue-700' },
  receive: { label: '入庫', color: 'bg-emerald-100 text-emerald-700' },
  issue: { label: '出庫', color: 'bg-amber-100 text-amber-700' },
  production: { label: '製造指図', color: 'bg-indigo-100 text-indigo-700' },
  stocktake: { label: '棚卸し', color: 'bg-rose-100 text-rose-700' },
  auth: { label: '認証', color: 'bg-slate-200 text-slate-900' },
  part: { label: '部品マスタ', color: 'bg-slate-100 text-slate-900' },
  department: { label: '部署', color: 'bg-cyan-100 text-cyan-700' },
  supplier: { label: '仕入先', color: 'bg-indigo-100 text-indigo-700' },
  user: { label: 'ユーザー', color: 'bg-purple-100 text-purple-700' },
};

export const yen = (n: number) => '¥' + (n || 0).toLocaleString('ja-JP');

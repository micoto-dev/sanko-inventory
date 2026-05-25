'use client';

import React from 'react';
import { Search, Filter, ArrowUpDown, FileDown, Calculator } from 'lucide-react';

// ラベル付き入力セル
const Cell = ({ label, labelBg = 'bg-purple-700', children, type = 'text', value, wide = false }: {
  label: string; labelBg?: string; children?: React.ReactNode; type?: string; value?: string; wide?: boolean;
}) => (
  <div className={`flex border border-slate-300 rounded overflow-hidden text-xs ${wide ? 'col-span-2' : ''}`}>
    <div className={`${labelBg} text-white font-semibold px-2 py-1.5 whitespace-nowrap flex items-center min-w-[72px]`}>{label}</div>
    <div className="flex-1 bg-white">
      {children ?? (
        <input type={type} defaultValue={value} className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none focus:bg-blue-50/30" />
      )}
    </div>
  </div>
);

// チェック付き進捗バッジ
const ProgressItem = ({ label }: { label: string }) => (
  <label className="flex items-center justify-between gap-2 px-2 py-1 border border-slate-200 rounded bg-white">
    <span className="text-xs font-semibold text-purple-900">{label}</span>
    <input type="checkbox" className="w-4 h-4 accent-blue-600" />
  </label>
);

// セクションラベル（左端の縦長カラーバー）
const SectionLabel = ({ label, color }: { label: string; color: string }) => (
  <div className={`${color} text-white font-bold text-sm flex items-center justify-center writing-vertical-rl rounded-l py-3 px-2`} style={{ writingMode: 'vertical-rl' }}>{label}</div>
);

export const ProductMgmtScreen = () => {
  return (
    <div className="p-5 space-y-3">
      {/* ヘッダーバー */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white rounded-lg p-3 flex items-center gap-4">
        <h1 className="font-bold text-lg">営業 製品管理表</h1>
        <div className="flex-1" />
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold flex items-center gap-1"><Search size={12} />SNO検索</button>
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold flex items-center gap-1">SNO抽出</button>
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold flex items-center gap-1"><ArrowUpDown size={12} />SNO順整列</button>
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold flex items-center gap-1"><ArrowUpDown size={12} />区・納期順</button>
          <button className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded text-xs font-semibold flex items-center gap-1"><Filter size={12} />未納品抽出</button>
          <button className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded text-xs font-semibold flex items-center gap-1"><Filter size={12} />設計未手配分</button>
          <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-semibold flex items-center gap-1"><FileDown size={12} />営業データ読込</button>
          <button className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold flex items-center gap-1"><Calculator size={12} />製品原価計算書</button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white">過去のデータ</button>
        <span className="text-xs text-slate-600">Kintone ID</span>
        <input type="text" className="border border-slate-300 rounded px-2 py-1 text-xs w-24 bg-white" />
      </div>

      {/* 営業セクション */}
      <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
        <SectionLabel label="営業" color="bg-purple-600" />
        <div className="flex-1 p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <Cell label="客先" wide />
            <Cell label="新納期" type="date" />
            <Cell label="客先注番" />
            <Cell label="工番" />
            <Cell label="子番" />
            <Cell label="納品先" wide />
            <Cell label="SNO" />
            <Cell label="受注日" type="date" />
            <Cell label="類似船" />
            <Cell label="注文書">
              <select className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none">
                <option value=""></option>
                <option value="○">○</option>
                <option value="✕">✕</option>
              </select>
            </Cell>
            <Cell label="造船所" />
            <Cell label="旧納期" type="date" />
            <Cell label="予備品">
              <select className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none">
                <option value=""></option>
                <option value="有り">有り</option>
                <option value="無し">無し</option>
              </select>
            </Cell>
            <Cell label="伝票処理">
              <select className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none">
                <option value=""></option>
                <option value="処理済">処理済</option>
                <option value="未処理">未処理</option>
              </select>
            </Cell>
            <Cell label="品名" wide />
            <Cell label="変更日" type="date" />
            <Cell label="予測価格" type="number" />
            <Cell label="製品区分" />
            <Cell label="数量" type="number" />
            <Cell label="出荷日" type="date" />
            <Cell label="仮入力" />
            <Cell label="連番船" wide />
            <Cell label="見積提出" type="date" />
            <Cell label="見積価格" type="number" />
          </div>
          <Cell label="正式品名" wide />
          <div className="grid grid-cols-2 gap-2">
            <Cell label="備考">
              <textarea className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none focus:bg-blue-50/30 h-20 resize-none" />
            </Cell>
            <Cell label="メモ">
              <textarea className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none focus:bg-blue-50/30 h-20 resize-none" />
            </Cell>
          </div>

          {/* ステータス + 決定価格 + 進捗状況 */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3 grid grid-cols-3 gap-1.5">
              <label className="flex items-center justify-center gap-1 px-2 py-1.5 border border-rose-300 bg-rose-50 rounded text-xs font-semibold text-rose-700">
                <input type="checkbox" className="accent-rose-600" />取消し
              </label>
              <label className="flex items-center justify-center gap-1 px-2 py-1.5 border border-amber-300 bg-amber-50 rounded text-xs font-semibold text-amber-700">
                <input type="checkbox" className="accent-amber-600" />仮受注
              </label>
              <label className="flex items-center justify-center gap-1 px-2 py-1.5 border border-blue-300 bg-blue-50 rounded text-xs font-semibold text-blue-700">
                <input type="checkbox" className="accent-blue-600" />分納
              </label>
            </div>
            <Cell label="決定価格" type="number" wide />
            <div className="col-span-7">
              <div className="text-xs font-semibold text-purple-700 mb-1">進捗状況</div>
              <div className="grid grid-cols-9 gap-1">
                <ProgressItem label="図面完" />
                <ProgressItem label="部品完" />
                <ProgressItem label="銘板完" />
                <ProgressItem label="支給品完" />
                <ProgressItem label="鈑金完" />
                <ProgressItem label="塗装完" />
                <ProgressItem label="組立完" />
                <ProgressItem label="検査完" />
                <ProgressItem label="出荷完" />
              </div>
            </div>
          </div>

          {/* コスト集計 */}
          <div className="grid grid-cols-7 gap-2 pt-2 border-t border-slate-200">
            <Cell label="鋼材価格" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="部品費" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="設計費" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="板金費" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="組立費" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="検査費" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="総合計" type="number" labelBg="bg-blue-800" />
            <Cell label="外注費" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="配材費" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="製造費計" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="保障引当" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="管理費" type="number" labelBg="bg-fuchsia-700" />
            <Cell label="指定利益" type="number" labelBg="bg-fuchsia-700" />
          </div>
        </div>
      </div>

      {/* 設計セクション */}
      <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
        <SectionLabel label="設計" color="bg-teal-600" />
        <div className="flex-1 p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <Cell label="塗装色" labelBg="bg-teal-700" />
            <Cell label="サイズ縦・ベース" labelBg="bg-teal-700" />
            <Cell label="図面" labelBg="bg-teal-700" />
            <Cell label="手配担当" labelBg="bg-teal-700" />
            <Cell label="艶" labelBg="bg-teal-700" />
            <Cell label="サイズ横" labelBg="bg-teal-700" />
            <Cell label="作図">
              <select className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none">
                <option value=""></option>
                <option value="○">○</option>
                <option value="✕">✕</option>
              </select>
            </Cell>
            <Cell label="手配日" type="date" labelBg="bg-teal-700" />
            <Cell label="規格・立会" labelBg="bg-teal-700" />
            <Cell label="サイズ奥行" labelBg="bg-teal-700" />
            <Cell label="承認返却">
              <select className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none">
                <option value=""></option>
                <option value="○">○</option>
                <option value="✕">✕</option>
              </select>
            </Cell>
            <Cell label="設計工数" labelBg="bg-teal-700" />
            <Cell label="塗装m²" labelBg="bg-teal-700" />
            <Cell label="—" labelBg="bg-teal-700" />
            <Cell label="手配予定" type="date" labelBg="bg-teal-700" />
            <Cell label="手配工数" labelBg="bg-teal-700" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Cell label="船名" labelBg="bg-teal-700" />
            <Cell label="備考1" labelBg="bg-teal-700" />
            <Cell label="特記事項" labelBg="bg-teal-700">
              <textarea className="w-full px-2 py-1.5 text-sm bg-white text-black focus:outline-none focus:bg-blue-50/30 h-12 resize-none" />
            </Cell>
          </div>
        </div>
      </div>

      {/* 資材セクション */}
      <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
        <SectionLabel label="資材" color="bg-purple-600" />
        <div className="flex-1 p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <Cell label="部品区分" labelBg="bg-purple-700" />
            <Cell label="銘板区分" labelBg="bg-purple-700" />
            <Cell label="銘板メーカ" labelBg="bg-purple-700" />
            <Cell label="単価" type="number" labelBg="bg-purple-700" />
            <Cell label="部品発注" type="date" labelBg="bg-purple-700" />
            <Cell label="銘板発注" type="date" labelBg="bg-purple-700" />
            <Cell label="銘板価格" type="number" labelBg="bg-purple-700" />
            <Cell label="予備品価格" type="number" labelBg="bg-purple-700" />
            <Cell label="入荷予定（部品）" type="date" labelBg="bg-purple-700" />
            <Cell label="入荷予定（銘板）" type="date" labelBg="bg-purple-700" />
            <Cell label="予備品箱価格" type="number" labelBg="bg-purple-700" />
            <Cell label="部品合計" type="number" labelBg="bg-blue-800" />
            <Cell label="入荷日（部品）" type="date" labelBg="bg-purple-700" />
            <Cell label="入荷日（銘板）" type="date" labelBg="bg-purple-700" />
          </div>
        </div>
      </div>

      {/* 鈑金・塗装セクション */}
      <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
        <SectionLabel label="鈑金塗装" color="bg-slate-500" />
        <div className="flex-1 p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <Cell label="鈑金1" labelBg="bg-slate-600" />
            <Cell label="鈑金2" labelBg="bg-slate-600" />
            <Cell label="鈑金3" labelBg="bg-slate-600" />
            <Cell label="塗装外注" labelBg="bg-cyan-700" />
            <Cell label="鈑金1納期" type="date" labelBg="bg-slate-600" />
            <Cell label="鈑金2納期" type="date" labelBg="bg-slate-600" />
            <Cell label="鈑金3納期" type="date" labelBg="bg-slate-600" />
            <Cell label="塗装納期" type="date" labelBg="bg-cyan-700" />
            <Cell label="板金外注費" type="number" labelBg="bg-slate-600" />
            <Cell label="鈑金2担当" labelBg="bg-slate-600" />
            <Cell label="鈑金3担当" labelBg="bg-slate-600" />
            <Cell label="塗装外注費" type="number" labelBg="bg-cyan-700" />
            <Cell label="鈑工数1" labelBg="bg-slate-600" />
            <Cell label="鈑工数2" labelBg="bg-slate-600" />
            <Cell label="鈑工数3" labelBg="bg-slate-600" />
            <Cell label="—" labelBg="bg-cyan-700" />
            <Cell label="AP担当" labelBg="bg-slate-600" />
            <Cell label="AP工数" labelBg="bg-slate-600" />
            <Cell label="鈑金完了" type="date" labelBg="bg-slate-600" />
            <Cell label="塗装完了" type="date" labelBg="bg-cyan-700" />
          </div>
        </div>
      </div>

      {/* 組立セクション */}
      <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
        <SectionLabel label="組立" color="bg-cyan-600" />
        <div className="flex-1 p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <Cell label="組立納期" type="date" labelBg="bg-cyan-700" />
            <Cell label="組立" labelBg="bg-cyan-700" />
            <Cell label="組立2" labelBg="bg-cyan-700" />
            <Cell label="検査担当" labelBg="bg-cyan-700" />
            <Cell label="外注納期" type="date" labelBg="bg-cyan-700" />
            <Cell label="組工数1" labelBg="bg-cyan-700" />
            <Cell label="組工数2" labelBg="bg-cyan-700" />
            <Cell label="検査1" labelBg="bg-cyan-700" />
            <Cell label="組立完了" type="date" labelBg="bg-cyan-700" />
            <Cell label="組立外注費" type="number" labelBg="bg-cyan-700" />
            <Cell label="—" labelBg="bg-cyan-700" />
            <Cell label="検査2" labelBg="bg-cyan-700" />
            <Cell label="組立備考" wide labelBg="bg-cyan-700" />
            <Cell label="検査工数" labelBg="bg-cyan-700" />
            <Cell label="UZ検印日" type="date" labelBg="bg-cyan-700" />
            <Cell label="重量" labelBg="bg-blue-800" wide />
          </div>
        </div>
      </div>
    </div>
  );
};

import { prisma } from "@/server/db";
import QRCode from "qrcode";

// GET /api/qr/batch?type=parts → all parts QR labels
// GET /api/qr/batch?type=locations → all location QR labels
// GET /api/qr/batch?type=locations&warehouse=主倉庫
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "parts";
    const warehouse = searchParams.get("warehouse") || "";

    interface LabelItem { id: string; code: string; name: string; dataUrl: string }
    const items: LabelItem[] = [];

    if (type === "parts") {
      const parts = await prisma.mPart.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } });
      for (const p of parts) {
        const dataUrl = await QRCode.toDataURL(JSON.stringify({ type: "part", id: p.id }), { width: 150, margin: 1 });
        items.push({ id: p.id, code: p.code, name: p.name, dataUrl });
      }
    } else {
      const where: Record<string, unknown> = { deletedAt: null };
      if (warehouse) where.warehouse = warehouse;
      const locs = await prisma.mLocation.findMany({ where, orderBy: { id: "asc" } });
      for (const l of locs) {
        const dataUrl = await QRCode.toDataURL(JSON.stringify({ type: "location", id: l.id }), { width: 150, margin: 1 });
        items.push({ id: l.id, code: l.id, name: `${l.warehouse} / ${l.name}`, dataUrl });
      }
    }

    const typeLabel = type === "parts" ? "部品" : "保管場所";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QRラベル一括 - ${typeLabel}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: sans-serif; }
  .grid { display: flex; flex-wrap: wrap; }
  .label { width: 55mm; border: 1px solid #ddd; padding: 2mm; margin: 1.5mm; text-align: center; page-break-inside: avoid; }
  .label img { width: 22mm; height: 22mm; }
  .label .code { font-size: 9pt; font-weight: bold; font-family: monospace; margin-top: 1mm; }
  .label .name { font-size: 7pt; color: #555; margin-top: 0.5mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 50mm; }
</style></head><body>
<div class="no-print" style="padding:10px;background:#f0f0f0;margin-bottom:10px;">
  <button onclick="window.print()" style="padding:8px 16px;font-size:14px;cursor:pointer;">印刷 (${items.length}枚)</button>
  <button onclick="window.close()" style="padding:8px 16px;font-size:14px;cursor:pointer;margin-left:8px;">閉じる</button>
  <span style="margin-left:16px;color:#666;">${typeLabel} QRラベル</span>
</div>
<div class="grid">
${items.map(it => `<div class="label"><img src="${it.dataUrl}" /><div class="code">${it.code}</div><div class="name">${it.name}</div></div>`).join("\n")}
</div></body></html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to generate QR batch" }, { status: 500 });
  }
}

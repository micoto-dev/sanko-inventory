import { prisma } from "@/server/db";
import QRCode from "qrcode";

// GET /api/qr?type=part&id=PT00012345 → returns QR code as SVG
// GET /api/qr?type=location&id=A-03-2-L
// GET /api/qr?type=part&id=PT00012345&format=label → returns printable label HTML
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "part";
    const id = searchParams.get("id") || "";
    const format = searchParams.get("format") || "svg";

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    let label = "";
    let sublabel = "";

    if (type === "part") {
      const part = await prisma.mPart.findUnique({ where: { id } });
      if (!part) return Response.json({ error: "Part not found" }, { status: 404 });
      label = part.code;
      sublabel = part.name;
    } else if (type === "location") {
      const loc = await prisma.mLocation.findUnique({ where: { id } });
      if (!loc) return Response.json({ error: "Location not found" }, { status: 404 });
      label = loc.id;
      sublabel = `${loc.warehouse} / ${loc.name}`;
    }

    const qrData = JSON.stringify({ type, id });

    if (format === "svg") {
      const svg = await QRCode.toString(qrData, { type: "svg", width: 200, margin: 1 });
      return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
    }

    if (format === "dataurl") {
      const dataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
      return Response.json({ data: { dataUrl, label, sublabel } });
    }

    // format=label → printable HTML label
    const dataUrl = await QRCode.toDataURL(qrData, { width: 150, margin: 1 });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Label - ${label}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: sans-serif; }
  .label { width: 60mm; border: 1px solid #ccc; padding: 3mm; display: inline-block; margin: 2mm; text-align: center; page-break-inside: avoid; }
  .label img { width: 25mm; height: 25mm; }
  .label .code { font-size: 11pt; font-weight: bold; font-family: monospace; margin-top: 2mm; }
  .label .name { font-size: 8pt; color: #555; margin-top: 1mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .label .type { font-size: 7pt; color: #999; margin-top: 1mm; }
</style></head><body>
<div class="no-print" style="padding:10px;margin-bottom:10px;background:#f0f0f0;">
  <button onclick="window.print()" style="padding:8px 16px;font-size:14px;cursor:pointer;">印刷</button>
  <button onclick="window.close()" style="padding:8px 16px;font-size:14px;cursor:pointer;margin-left:8px;">閉じる</button>
</div>
<div class="label">
  <img src="${dataUrl}" alt="QR" />
  <div class="code">${label}</div>
  <div class="name">${sublabel}</div>
  <div class="type">${type === "part" ? "部品" : "保管場所"} | ${id}</div>
</div>
</body></html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}

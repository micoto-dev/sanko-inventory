import { prisma } from "@/server/db";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

// Helper: gather system context based on keywords in the message
async function gatherContext(message: string) {
  const context: string[] = [];
  const lower = message.toLowerCase();

  // Always include summary stats
  const partsCount = await prisma.mPart.count({ where: { deletedAt: null } });
  const stockData = await prisma.tStock.findMany({ include: { part: { select: { name: true, unitPrice: true, reorderPoint: true, shortageReason: true } } } });

  const totalValue = stockData.reduce((s, st) => s + st.qty * (st.part.unitPrice || 0), 0);
  context.push(`[在庫概要] 部品数: ${partsCount}, 在庫総額: ¥${totalValue.toLocaleString()}`);

  // Shortage / low stock
  if (lower.includes('欠品') || lower.includes('不足') || lower.includes('切れ') || lower.includes('アラート') || lower.includes('在庫')) {
    const shortages = stockData.filter(s => s.part.shortageReason);
    const lowStock = stockData.filter(s => s.qty - s.allocated < (s.part.reorderPoint || 0) && !s.part.shortageReason);
    const outOfStock = stockData.filter(s => s.qty === 0);

    context.push(`[メーカー欠品] ${shortages.length}件: ${shortages.map(s => s.part.name).join(', ')}`);
    context.push(`[在庫切れ] ${outOfStock.length}件: ${outOfStock.map(s => s.part.name).join(', ')}`);
    context.push(`[発注点割れ] ${lowStock.length}件: ${lowStock.slice(0, 10).map(s => `${s.part.name}(在庫${s.qty}/発注点${s.part.reorderPoint})`).join(', ')}`);
  }

  // Orders
  if (lower.includes('発注') || lower.includes('注文') || lower.includes('仕入')) {
    const orders = await prisma.tOrder.findMany({
      where: { status: { not: 'completed' } },
      include: { supplier: { select: { name: true } }, details: { include: { part: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    context.push(`[進行中の発注] ${orders.length}件:`);
    orders.forEach(o => {
      const items = o.details.map((d: any) => d.part.name).join(', ');
      context.push(`  ${o.orderNo} - ${o.supplier.name} - ステータス:${o.status} - 金額:¥${o.totalAmount.toLocaleString()} - 部品:${items}`);
    });
  }

  // Production
  if (lower.includes('製造') || lower.includes('指図') || lower.includes('生産')) {
    const prodOrders = await prisma.tProdOrder.findMany({
      where: { status: { not: 'completed' } },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    context.push(`[進行中の製造指図] ${prodOrders.length}件:`);
    prodOrders.forEach(po => {
      context.push(`  ${po.prodNo} - ${po.product.name} x${po.qty} - ステータス:${po.status} - 納期:${po.dueDate?.toISOString().slice(0,10) || '未定'}`);
    });
  }

  // Parts search
  if (lower.includes('部品') || lower.includes('パーツ')) {
    const parts = await prisma.mPart.findMany({
      where: { deletedAt: null },
      include: { stocks: true, supplier: { select: { name: true } } },
      take: 20,
    });
    context.push(`[部品マスタ(上位20件)]:`);
    parts.forEach(p => {
      const stock = p.stocks.reduce((s: number, st: any) => s + st.qty, 0);
      const alloc = p.stocks.reduce((s: number, st: any) => s + st.allocated, 0);
      context.push(`  ${p.id} ${p.name} - メーカー:${p.maker} - 在庫:${stock} 引当:${alloc} 単価:¥${p.unitPrice}`);
    });
  }

  return context.join('\n');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionId: inputSessionId } = body;

    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
    }

    const sessionId = inputSessionId || uuidv4();

    // Save user message
    await prisma.tChatMessage.create({
      data: { sessionId, role: 'user', content: message },
    });

    // Get recent chat history for context
    const history = await prisma.tChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Gather system data context
    const systemContext = await gatherContext(message);

    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = history.map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    // If last message in history is already the current user message, don't duplicate
    if (messages.length === 0 || messages[messages.length - 1].content !== message) {
      messages.push({ role: 'user', content: message });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `あなたは三工電機の部品在庫管理システムのAIアシスタントです。
船舶用分電盤の製造に使用する部品の在庫、発注、製造指図に関する質問に答えてください。
以下はシステムから取得した最新のデータです。このデータに基づいて回答してください。
回答は日本語で、簡潔かつ正確にお願いします。数値やステータスは正確に伝えてください。

${systemContext}`,
      messages,
    });

    const assistantContent = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n');

    // Save assistant response
    await prisma.tChatMessage.create({
      data: { sessionId, role: 'assistant', content: assistantContent },
    });

    return Response.json({
      data: {
        sessionId,
        message: assistantContent,
      },
    });
  } catch (e) {
    console.error('Chat error:', e);
    const message = e instanceof Error ? e.message : 'Chat failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

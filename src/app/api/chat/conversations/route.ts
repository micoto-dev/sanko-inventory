import { prisma } from "@/server/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const messages = await prisma.tChatMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Group by sessionId
    const sessions: Record<string, { sessionId: string; title: string; lastMessage: string; createdAt: Date; messageCount: number }> = {};
    for (const m of messages) {
      if (!sessions[m.sessionId]) {
        sessions[m.sessionId] = {
          sessionId: m.sessionId,
          title: m.role === "user" ? m.content.slice(0, 50) : "",
          lastMessage: m.content.slice(0, 100),
          createdAt: m.createdAt,
          messageCount: 0,
        };
      }
      sessions[m.sessionId].messageCount++;
      if (m.role === "user" && !sessions[m.sessionId].title) {
        sessions[m.sessionId].title = m.content.slice(0, 50);
      }
    }
    const data = Object.values(sessions).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Response.json({ data });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const sessionId = uuidv4();
    return Response.json({ data: { sessionId } }, { status: 201 });
  } catch (e) {
    return Response.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

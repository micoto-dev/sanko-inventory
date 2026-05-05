import { prisma } from "@/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const messages = await prisma.tChatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
    });

    if (messages.length === 0) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    const firstUserMsg = messages.find(m => m.role === "user");

    return Response.json({
      data: {
        sessionId: id,
        title: firstUserMsg?.content.slice(0, 50) || "無題の会話",
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          ts: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

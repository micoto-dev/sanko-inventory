import { prisma } from "@/server/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.tKnowledgeDoc.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

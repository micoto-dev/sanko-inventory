import { prisma } from "@/server/db";

export async function GET() {
  try {
    const makers = await prisma.mMaker.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const data = makers.map((m: any) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      tel: m.tel,
      email: m.email,
      website: m.website,
      notes: m.notes,
      isActive: m.isActive,
    }));

    return Response.json({ data });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch makers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, tel, email, website, notes } = body;

    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const maker = await tx.mMaker.create({
        data: { name, code, tel, email, website, notes },
      });

      await tx.tLog.create({
        data: {
          category: "maker",
          action: "create",
          targetType: "MMaker",
          targetId: String(maker.id),
          userId: 1,
          description: `Created maker ${name}`,
        },
      });

      return maker;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create maker" }, { status: 500 });
  }
}

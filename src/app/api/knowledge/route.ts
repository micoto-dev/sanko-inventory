import { prisma } from "@/server/db";

// GET - list uploaded documents
export async function GET() {
  try {
    const docs = await prisma.tKnowledgeDoc.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, fileName: true, fileType: true, fileSize: true,
        chunkCount: true, createdAt: true,
        summary: true,
      },
    });
    return Response.json({ data: docs });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

// POST - upload document (text extraction)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "ファイルが必要です" }, { status: 400 });
    }

    const fileName = file.name;
    const fileSize = file.size;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    // Extract text from file
    let content = "";

    if (["txt", "md", "csv", "tsv", "log"].includes(ext)) {
      content = await file.text();
    } else if (ext === "json") {
      const json = await file.text();
      content = JSON.stringify(JSON.parse(json), null, 2);
    } else {
      // For PDF, XLSX, DOCX - read as text (basic extraction)
      // In production, use a proper parser. For now, try text extraction.
      try {
        content = await file.text();
        // Remove binary garbage if it's not readable
        if (content.includes("\x00") || content.length > 0 && [...content.slice(0, 100)].filter(c => c.charCodeAt(0) > 127 && c.charCodeAt(0) < 256).length > 20) {
          content = `[${fileName}] このファイル形式のテキスト抽出はサーバー側で未対応です。テキスト/CSV/JSONファイルをアップロードしてください。`;
        }
      } catch {
        content = `[${fileName}] ファイルの読み取りに失敗しました。`;
      }
    }

    // Split content into chunks (1000 chars each with 200 overlap)
    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += CHUNK_SIZE - OVERLAP) {
      chunks.push(content.slice(i, i + CHUNK_SIZE));
      if (i + CHUNK_SIZE >= content.length) break;
    }

    // Save to DB
    const doc = await prisma.tKnowledgeDoc.create({
      data: {
        fileName,
        fileType: ext,
        fileSize,
        content,
        chunkCount: chunks.length,
        uploadedById: 1,
        chunks: {
          create: chunks.map((c, i) => ({ chunkIndex: i, content: c })),
        },
      },
    });

    await prisma.tLog.create({
      data: {
        category: "master",
        action: "upload_knowledge",
        targetType: "TKnowledgeDoc",
        targetId: String(doc.id),
        description: `ナレッジドキュメント「${fileName}」をアップロード (${chunks.length}チャンク)`,
        userId: 1,
      },
    });

    return Response.json({
      data: {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        chunkCount: doc.chunkCount,
      },
    }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "ファイルのアップロードに失敗しました" }, { status: 500 });
  }
}

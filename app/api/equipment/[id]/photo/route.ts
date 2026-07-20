import { db } from "@/lib/db/client";
import { equipmentPhotos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(equipmentPhotos)
    .where(eq(equipmentPhotos.equipmentId, Number(id)))
    .limit(1);

  if (!row) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(row.photo), {
    headers: { "Content-Type": row.mimeType },
  });
}

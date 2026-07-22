import { db } from "@/lib/db/client";
import { exercises } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [row] = await db
    .select({ demoImage: exercises.demoImage, demoImageMimeType: exercises.demoImageMimeType })
    .from(exercises)
    .where(eq(exercises.id, Number(id)))
    .limit(1);

  if (!row?.demoImage) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(row.demoImage), {
    headers: { "Content-Type": row.demoImageMimeType ?? "image/gif" },
  });
}

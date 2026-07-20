import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { gyms, gymZones, equipment, equipmentPhotos } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { ZoneForm } from "@/components/forms/ZoneForm";
import { GymEquipmentForm } from "@/components/forms/GymEquipmentForm";
import { EquipmentEditDialog } from "@/components/forms/EquipmentEditDialog";
import { EquipmentDeleteButton } from "@/components/forms/EquipmentDeleteButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function GymDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gymId = Number(id);

  const [gym] = await db.select().from(gyms).where(eq(gyms.id, gymId)).limit(1);
  if (!gym) notFound();

  const [zones, zoneEquipment] = await Promise.all([
    db.select().from(gymZones).where(eq(gymZones.gymId, gymId)),
    db.select().from(equipment).where(eq(equipment.gymId, gymId)),
  ]);

  const equipmentIds = zoneEquipment.map((e) => e.id);
  const photoRows =
    equipmentIds.length > 0
      ? await db
          .select({ equipmentId: equipmentPhotos.equipmentId })
          .from(equipmentPhotos)
          .where(inArray(equipmentPhotos.equipmentId, equipmentIds))
      : [];
  const photoIds = new Set(photoRows.map((p) => p.equipmentId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/gyms" className="text-muted-foreground text-sm hover:underline">
          ← Gyms
        </Link>
        <h1 className="text-2xl font-semibold">{gym.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a zone</CardTitle>
        </CardHeader>
        <CardContent>
          <ZoneForm gymId={gymId} />
        </CardContent>
      </Card>

      {zones.length === 0 && (
        <p className="text-muted-foreground text-sm">Add a zone above to start adding equipment.</p>
      )}

      {zones.map((zone) => {
        const items = zoneEquipment.filter((e) => e.zoneId === zone.id);
        return (
          <Card key={zone.id}>
            <CardHeader>
              <CardTitle className="text-base">{zone.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {items.length > 0 && (
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                      {photoIds.has(item.id) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/equipment/${item.id}/photo`}
                          alt={item.name}
                          className="h-12 w-12 shrink-0 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-medium text-muted-foreground">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="font-medium">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.category}</Badge>
                          {item.notes && <span className="text-muted-foreground text-xs">{item.notes}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <EquipmentEditDialog
                          id={item.id}
                          initialName={item.name}
                          initialCategory={item.category}
                          initialNotes={item.notes}
                        />
                        <EquipmentDeleteButton id={item.id} name={item.name} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <GymEquipmentForm gymId={gymId} zoneId={zone.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

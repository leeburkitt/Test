import Link from "next/link";
import { db } from "@/lib/db/client";
import { gyms, gymZones, equipment } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { createGym } from "@/lib/actions/gyms";
import { GymForm } from "@/components/forms/GymForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GymsPage() {
  const [allGyms, allZones, allEquipment] = await Promise.all([
    db.select().from(gyms).orderBy(desc(gyms.createdAt)),
    db.select().from(gymZones),
    db.select({ gymId: equipment.gymId }).from(equipment),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Gyms</h1>
        <p className="text-muted-foreground text-sm">
          Build out equipment by gym and zone — photograph a label to add an item.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a gym</CardTitle>
        </CardHeader>
        <CardContent>
          <GymForm action={createGym} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {allGyms.length === 0 && <p className="text-muted-foreground text-sm">No gyms added yet.</p>}
        {allGyms.map((gym) => {
          const zoneCount = allZones.filter((z) => z.gymId === gym.id).length;
          const equipmentCount = allEquipment.filter((e) => e.gymId === gym.id).length;
          return (
            <Link
              key={gym.id}
              href={`/gyms/${gym.id}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-accent"
            >
              <span className="font-medium">{gym.name}</span>
              <span className="text-muted-foreground text-sm">
                {zoneCount} zone{zoneCount === 1 ? "" : "s"} · {equipmentCount} item
                {equipmentCount === 1 ? "" : "s"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

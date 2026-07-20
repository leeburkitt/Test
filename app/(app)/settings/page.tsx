import { db } from "@/lib/db/client";
import { equipment, settings, gyms, gymZones } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { EquipmentDeleteButton } from "@/components/forms/EquipmentDeleteButton";
import { EquipmentEditDialog } from "@/components/forms/EquipmentEditDialog";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const [items, [settingsRow], allGyms, allZones] = await Promise.all([
    db.select().from(equipment).orderBy(desc(equipment.createdAt)),
    db.select().from(settings).limit(1),
    db.select().from(gyms),
    db.select().from(gymZones),
  ]);

  const gymById = new Map(allGyms.map((g) => [g.id, g]));
  const zoneById = new Map(allZones.map((z) => [z.id, z]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Units and training preferences. Add equipment from a gym&apos;s zone — the routine generator only
          picks exercises that match what you have.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            unitsWeight={settingsRow?.unitsWeight ?? "kg"}
            trainingDaysPerWeek={settingsRow?.trainingDaysPerWeek ?? 4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your equipment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {items.length === 0 && (
            <p className="text-muted-foreground text-sm">No equipment added yet.</p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{item.category}</Badge>
                  {item.gymId != null && (
                    <Badge variant="outline">
                      {gymById.get(item.gymId)?.name}
                      {item.zoneId != null && zoneById.get(item.zoneId)
                        ? ` / ${zoneById.get(item.zoneId)!.name}`
                        : ""}
                    </Badge>
                  )}
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
        </CardContent>
      </Card>
    </div>
  );
}

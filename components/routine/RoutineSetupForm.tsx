"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWeeklySchedule } from "@/lib/actions/settings";
import { generateRoutineForCurrentWeek, regenerateRoutineForCurrentWeek } from "@/lib/actions/routines";
import { routineDayTypeValues, type RoutineDayType } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DAY_TYPE_LABELS: Record<RoutineDayType, string> = {
  gym: "Gym",
  free_weights: "Free weights",
  run: "Run",
  swim: "Swim",
  walk: "Walk",
  rest: "Rest",
};

export function RoutineSetupForm({
  initialDays,
  initialGymId,
  gyms,
  hasCurrentWeekRoutine,
}: {
  initialDays: RoutineDayType[];
  initialGymId: number | null;
  gyms: { id: number; name: string }[];
  hasCurrentWeekRoutine: boolean;
}) {
  const router = useRouter();
  const [days, setDays] = useState<RoutineDayType[]>(initialDays);
  const [gymId, setGymId] = useState<number | null>(initialGymId);
  const [pending, startTransition] = useTransition();
  const [regenerating, startRegenerateTransition] = useTransition();

  function setDay(index: number, value: RoutineDayType) {
    setDays((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("schedule", JSON.stringify({ days }));
      if (gymId != null) formData.set("gymId", String(gymId));

      const scheduleResult = await updateWeeklySchedule(undefined, formData);
      if (scheduleResult?.error) {
        toast.error(scheduleResult.error);
        return;
      }

      const genResult = await generateRoutineForCurrentWeek();
      if (genResult.error) {
        toast.error(genResult.error);
        return;
      }

      toast.success("Schedule saved");
      router.refresh();
    });
  }

  function handleRegenerate() {
    startRegenerateTransition(async () => {
      const result = await regenerateRoutineForCurrentWeek();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("This week's routine has been regenerated");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {DAY_NAMES.map((name, index) => (
          <div key={name} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
            <Label className="text-sm font-medium">{name}</Label>
            <Select
              value={days[index]}
              onValueChange={(v) => setDay(index, v as RoutineDayType)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {routineDayTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {DAY_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {gyms.length > 1 && (
        <div className="flex flex-col gap-2 sm:w-64">
          <Label>Which gym this week?</Label>
          <Select
            value={gymId != null ? String(gymId) : undefined}
            onValueChange={(v) => setGymId(Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a gym" />
            </SelectTrigger>
            <SelectContent>
              {gyms.map((gym) => (
                <SelectItem key={gym.id} value={String(gym.id)}>
                  {gym.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Saving..." : "Save schedule & generate this week"}
        </Button>
        {hasCurrentWeekRoutine && (
          <Button variant="outline" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? "Regenerating..." : "Regenerate this week"}
          </Button>
        )}
      </div>
      {hasCurrentWeekRoutine && (
        <p className="text-muted-foreground text-xs">
          Regenerating replaces this week&apos;s plan and discards any weights/completions already logged for it.
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logRoutineDay } from "@/lib/actions/routines";
import type { RoutineDayType } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type DayExercise = {
  id: number;
  exerciseName: string;
  sets: number;
  repsLow: number;
  repsHigh: number;
  targetWeightKg: number | null;
  restSeconds: number | null;
  intensityNote: string | null;
  actualWeightKg: number | null;
  completed: boolean;
};

type RoutineDay = {
  id: number;
  dayType: RoutineDayType;
  focus: string;
  coachNote: string | null;
  completed: boolean;
  exercises: DayExercise[];
};

const CARDIO_TYPES: RoutineDayType[] = ["run", "swim", "walk"];

export function RoutineDayDialog({ day, children }: { day: RoutineDay; children: React.ReactNode }) {
  const router = useRouter();
  const isCardio = CARDIO_TYPES.includes(day.dayType);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cardioDone, setCardioDone] = useState(day.completed);
  const [rows, setRows] = useState(
    day.exercises.map((ex) => ({
      routineExerciseId: ex.id,
      actualWeightKg: ex.actualWeightKg != null ? String(ex.actualWeightKg) : "",
      completed: ex.completed,
    }))
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setCardioDone(day.completed);
      setRows(
        day.exercises.map((ex) => ({
          routineExerciseId: ex.id,
          actualWeightKg: ex.actualWeightKg != null ? String(ex.actualWeightKg) : "",
          completed: ex.completed,
        }))
      );
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = isCardio
        ? await logRoutineDay({ dayId: day.id, completed: cardioDone })
        : await logRoutineDay({
            dayId: day.id,
            exercises: rows.map((r) => ({
              routineExerciseId: r.routineExerciseId,
              actualWeightKg: r.actualWeightKg.trim() === "" ? undefined : Number(r.actualWeightKg),
              completed: r.completed,
            })),
          });

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Progress saved");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="contents">{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{day.focus}</DialogTitle>
        </DialogHeader>

        {isCardio ? (
          <div className="flex flex-col gap-4">
            {day.coachNote && <p className="text-muted-foreground text-sm">{day.coachNote}</p>}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`cardio-done-${day.id}`}
                checked={cardioDone}
                onCheckedChange={(checked) => setCardioDone(checked === true)}
              />
              <Label htmlFor={`cardio-done-${day.id}`}>Mark as done</Label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {day.exercises.map((ex, i) => (
              <div key={ex.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{ex.exerciseName}</p>
                    <p className="text-muted-foreground text-xs">
                      {ex.sets} × {ex.repsLow}-{ex.repsHigh}
                      {ex.restSeconds != null && ` · rest ${ex.restSeconds}s`}
                      {ex.targetWeightKg != null && ` · target ${ex.targetWeightKg}kg`}
                    </p>
                    {ex.intensityNote && (
                      <p className="text-muted-foreground mt-1 text-xs italic">{ex.intensityNote}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <Checkbox
                      id={`ex-done-${ex.id}`}
                      checked={rows[i].completed}
                      onCheckedChange={(checked) =>
                        setRows((prev) =>
                          prev.map((r, idx) => (idx === i ? { ...r, completed: checked === true } : r))
                        )
                      }
                    />
                    <Label htmlFor={`ex-done-${ex.id}`} className="text-sm">
                      Done
                    </Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`ex-weight-${ex.id}`} className="text-xs">
                    Weight lifted (kg)
                  </Label>
                  <Input
                    id={`ex-weight-${ex.id}`}
                    type="number"
                    step="0.5"
                    className="w-24"
                    value={rows[i].actualWeightKg}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, idx) => (idx === i ? { ...r, actualWeightKg: e.target.value } : r))
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Saving..." : "Save progress"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

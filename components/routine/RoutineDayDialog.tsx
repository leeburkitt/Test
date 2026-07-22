"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logRoutineDay } from "@/lib/actions/routines";
import { formatDayHeading } from "@/lib/routines/daySlots";
import type { RoutineDayType, SetLog } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";

type DayExercise = {
  id: number;
  exerciseName: string;
  sets: number;
  repsLow: number;
  repsHigh: number;
  targetWeightKg: number | null;
  restSeconds: number | null;
  intensityNote: string | null;
  setLogs: SetLog[] | null;
};

type RoutineDay = {
  id: number;
  dayOfWeek: number | null;
  dayType: RoutineDayType;
  focus: string;
  coachNote: string | null;
  completed: boolean;
  exercises: DayExercise[];
};

const CARDIO_TYPES: RoutineDayType[] = ["run", "swim", "walk"];

export function RoutineDayDialog({
  day,
  weekStartDate,
  children,
}: {
  day: RoutineDay;
  weekStartDate: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isCardio = CARDIO_TYPES.includes(day.dayType);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cardioDone, setCardioDone] = useState(day.completed);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setCardioDone(day.completed);
  }

  function handleSaveCardio() {
    startTransition(async () => {
      const result = await logRoutineDay({ dayId: day.id, completed: cardioDone });
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
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {formatDayHeading(weekStartDate, day.dayOfWeek)}
          </p>
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
          <div className="flex flex-col gap-2">
            {day.coachNote && <p className="text-muted-foreground text-sm">{day.coachNote}</p>}
            {day.exercises.map((ex) => {
              const setsDone = (ex.setLogs ?? []).filter((s) => s.completed).length;
              return (
                <Link
                  key={ex.id}
                  href={`/routine/exercise/${ex.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{ex.exerciseName}</p>
                    <p className="text-muted-foreground text-xs">
                      {ex.sets} × {ex.repsLow}-{ex.repsHigh}
                      {ex.restSeconds != null && ` · rest ${ex.restSeconds}s`}
                      {ex.targetWeightKg != null && ` · target ${ex.targetWeightKg}kg`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-sm">
                    <span className={setsDone === ex.sets ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}>
                      {setsDone}/{ex.sets} sets
                    </span>
                    <ChevronRight className="text-muted-foreground size-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {isCardio && (
          <DialogFooter>
            <Button onClick={handleSaveCardio} disabled={pending}>
              {pending ? "Saving..." : "Save progress"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

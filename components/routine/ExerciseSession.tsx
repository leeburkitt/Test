"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { logSet, getDemoContent, type ExerciseSessionData } from "@/lib/actions/routines";
import type { SetLog } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

type Phase = "ready" | "active" | "entering-weight" | "resting" | "done";

function firstIncompleteIndex(setLogs: SetLog[]): number {
  const idx = setLogs.findIndex((s) => !s.completed);
  return idx === -1 ? setLogs.length : idx;
}

function coachLine(
  phase: Phase,
  setNumber: number,
  totalSets: number,
  repsLow: number,
  repsHigh: number,
  restSeconds: number | null,
  exerciseName: string
): string {
  switch (phase) {
    case "ready":
      return `Set ${setNumber} of ${totalSets} — ${repsLow}-${repsHigh} reps. Let's go!`;
    case "active":
      return "You're on it — finish your reps, then end the set.";
    case "entering-weight":
      return "Nice work. How much did you lift?";
    case "resting":
      return `Great set. Rest ${restSeconds ?? 60}s before the next one.`;
    case "done":
      return `${exerciseName} complete — great session!`;
  }
}

export function ExerciseSession({ data }: { data: ExerciseSessionData }) {
  const [setLogs, setSetLogs] = useState<SetLog[]>(data.setLogs);
  const currentSetIndex = firstIncompleteIndex(setLogs);
  const isDone = currentSetIndex >= data.sets;

  const [phase, setPhase] = useState<Phase>(isDone ? "done" : "ready");
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [restRemaining, setRestRemaining] = useState(0);
  const [pending, startTransition] = useTransition();

  const [demoLoading, setDemoLoading] = useState(true);
  const [demoSteps, setDemoSteps] = useState<string[]>([]);
  const [demoHasImage, setDemoHasImage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDemoContent(data.exerciseId, data.equipmentName ?? undefined)
      .then((demo) => {
        if (cancelled) return;
        setDemoSteps(demo.steps);
        setDemoHasImage(demo.hasImage);
      })
      .catch(() => {
        if (!cancelled) setDemoSteps([]);
      })
      .finally(() => {
        if (!cancelled) setDemoLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.exerciseId]);

  useEffect(() => {
    if (phase !== "resting") return;
    if (restRemaining <= 0) {
      setPhase("ready");
      return;
    }
    const timer = setTimeout(() => setRestRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, restRemaining]);

  function handleStartSet() {
    setPhase("active");
  }

  function handleEndSet() {
    const previousWeight = [...setLogs].reverse().find((s) => s.weightKg != null)?.weightKg;
    const previousReps = [...setLogs].reverse().find((s) => s.repsCompleted != null)?.repsCompleted;
    setWeightInput(
      previousWeight != null ? String(previousWeight) : data.targetWeightKg != null ? String(data.targetWeightKg) : ""
    );
    setRepsInput(previousReps != null ? String(previousReps) : String(data.repsHigh));
    setPhase("entering-weight");
  }

  function handleSaveSet() {
    const weightKg = weightInput.trim() === "" ? undefined : Number(weightInput);
    const repsCompleted = repsInput.trim() === "" ? undefined : Number(repsInput);
    if (repsCompleted == null) {
      toast.error("Enter how many reps you completed.");
      return;
    }
    startTransition(async () => {
      const result = await logSet({
        routineExerciseId: data.routineExerciseId,
        setIndex: currentSetIndex,
        weightKg,
        repsCompleted,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const nextSetLogs = result.setLogs ?? setLogs;
      setSetLogs(nextSetLogs);

      const isLastSet = firstIncompleteIndex(nextSetLogs) >= data.sets;
      if (isLastSet) {
        setPhase("done");
      } else {
        setRestRemaining(data.restSeconds ?? 60);
        setPhase("resting");
      }
    });
  }

  function handleSkipRest() {
    setPhase("ready");
  }

  const setNumber = Math.min(currentSetIndex + 1, data.sets);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/routine" className="text-muted-foreground flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" /> Routine
      </Link>

      <div className="flex items-center gap-4">
        {data.hasPhoto && data.equipmentId != null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/equipment/${data.equipmentId}/photo`}
            alt={data.equipmentName ?? data.exerciseName}
            className="h-24 w-24 shrink-0 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border bg-muted text-2xl font-medium text-muted-foreground">
            {data.exerciseName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold">{data.exerciseName}</h1>
          {data.equipmentName && <p className="text-muted-foreground text-sm">{data.equipmentName}</p>}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-lg font-medium">
            {coachLine(phase, setNumber, data.sets, data.repsLow, data.repsHigh, data.restSeconds, data.exerciseName)}
          </p>

          {data.intensityNote && phase !== "done" && (
            <p className="text-muted-foreground text-sm italic">{data.intensityNote}</p>
          )}

          {phase === "ready" && (
            <Button size="lg" className="self-start" onClick={handleStartSet}>
              Start Set {setNumber}
            </Button>
          )}

          {phase === "active" && (
            <Button size="lg" className="self-start" onClick={handleEndSet}>
              End Set {setNumber}
            </Button>
          )}

          {phase === "entering-weight" && (
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reps-completed">Reps completed</Label>
                <Input
                  id="reps-completed"
                  type="number"
                  step="1"
                  className="w-24"
                  autoFocus
                  value={repsInput}
                  onChange={(e) => setRepsInput(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="weight-lifted">Weight (kg)</Label>
                <Input
                  id="weight-lifted"
                  type="number"
                  step="0.5"
                  className="w-28"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveSet} disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}

          {phase === "resting" && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-4xl font-semibold tabular-nums">{restRemaining}s</p>
              <Button variant="outline" onClick={handleSkipRest}>
                Skip rest
              </Button>
            </div>
          )}

          {phase === "done" && (
            <Button nativeButton={false} render={<Link href="/routine" />}>
              Back to routine
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 text-sm">
        {setLogs.map((log, i) => (
          <div
            key={i}
            className="text-muted-foreground flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <span>Set {i + 1}</span>
            <span>
              {log.completed
                ? [log.repsCompleted != null ? `${log.repsCompleted} reps` : null, log.weightKg != null ? `${log.weightKg}kg` : null]
                    .filter(Boolean)
                    .join(" @ ") || "done"
                : "—"}
            </span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm font-medium text-muted-foreground">How to do it</p>
          {demoLoading ? (
            <p className="text-muted-foreground text-sm">Loading technique tips...</p>
          ) : (
            <>
              {demoHasImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/exercises/${data.exerciseId}/demo-image`}
                  alt={`${data.exerciseName} demonstration`}
                  className="w-full max-w-xs self-center rounded-lg border"
                />
              )}
              {demoSteps.length > 0 ? (
                <ol className="flex flex-col gap-1.5 text-sm">
                  {demoSteps.map((step, i) => (
                    <li key={i}>
                      {i + 1}. {step}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">No technique tips available.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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

type Phase = "ready" | "logging" | "resting" | "done";

type Snapshot = { phase: Phase; editingIndex: number | null; restRemaining: number };

function firstIncompleteIndex(setLogs: SetLog[]): number {
  const idx = setLogs.findIndex((s) => !s.completed);
  return idx === -1 ? setLogs.length : idx;
}

function formatSetSummary(log: SetLog): string {
  const parts = [
    log.repsCompleted != null ? `${log.repsCompleted} reps` : null,
    log.weightKg != null ? `${log.weightKg}kg` : null,
  ].filter((p): p is string => p != null);
  return parts.length > 0 ? parts.join(" @ ") : "done";
}

export function ExerciseSession({ data }: { data: ExerciseSessionData }) {
  const [setLogs, setSetLogs] = useState<SetLog[]>(data.setLogs);
  const isDone = firstIncompleteIndex(setLogs) >= data.sets;

  const [phase, setPhase] = useState<Phase>(isDone ? "done" : "ready");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [restRemaining, setRestRemaining] = useState(0);
  const [interrupted, setInterrupted] = useState<Snapshot | null>(null);
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

  function openForLogging(index: number) {
    const existing = setLogs[index];
    if (existing?.completed) {
      setRepsInput(existing.repsCompleted != null ? String(existing.repsCompleted) : "");
      setWeightInput(existing.weightKg != null ? String(existing.weightKg) : "");
    } else {
      const previousWeight = [...setLogs].reverse().find((s) => s.weightKg != null)?.weightKg;
      const previousReps = [...setLogs].reverse().find((s) => s.repsCompleted != null)?.repsCompleted;
      setWeightInput(
        previousWeight != null ? String(previousWeight) : data.targetWeightKg != null ? String(data.targetWeightKg) : ""
      );
      setRepsInput(previousReps != null ? String(previousReps) : String(data.repsHigh));
    }
    setEditingIndex(index);
    setPhase("logging");
  }

  function advanceAfterRest(logs: SetLog[]) {
    const next = firstIncompleteIndex(logs);
    if (next >= data.sets) {
      setPhase("done");
    } else {
      openForLogging(next);
    }
  }

  // Rest countdown — advances straight into the next set's logging box when it hits zero, no
  // extra "Start Set N" click needed (only the very first set requires the initial Start tap).
  useEffect(() => {
    if (phase !== "resting") return;
    if (restRemaining <= 0) {
      advanceAfterRest(setLogs);
      return;
    }
    const timer = setTimeout(() => setRestRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, restRemaining]);

  function handleStart() {
    openForLogging(firstIncompleteIndex(setLogs));
  }

  function handleSkipRest() {
    advanceAfterRest(setLogs);
  }

  /** A completed set (or the next not-yet-reached one, while idle) can be tapped to log/correct
   * it — editing an earlier set snapshots whatever the session was doing so it can resume
   * afterwards, rather than restarting the rest timer or skipping ahead. */
  function handleRowClick(index: number) {
    if (interrupted) return; // one correction at a time
    if (phase === "logging" && editingIndex === index) return;

    const nextIncomplete = firstIncompleteIndex(setLogs);
    const isNaturalStep = index === nextIncomplete && (phase === "ready" || phase === "resting");
    if (!isNaturalStep && !setLogs[index]?.completed) return;

    if (!isNaturalStep) {
      setInterrupted({ phase, editingIndex, restRemaining });
    }
    openForLogging(index);
  }

  function handleCancelEdit() {
    if (!interrupted) return;
    setPhase(interrupted.phase);
    setEditingIndex(interrupted.editingIndex);
    setRestRemaining(interrupted.restRemaining);
    setInterrupted(null);
  }

  function handleSaveRow() {
    if (editingIndex == null) return;
    const weightKg = weightInput.trim() === "" ? undefined : Number(weightInput);
    const repsCompleted = repsInput.trim() === "" ? undefined : Number(repsInput);
    if (repsCompleted == null) {
      toast.error("Enter how many reps you completed.");
      return;
    }
    const savingIndex = editingIndex;
    const resumeSnapshot = interrupted;

    startTransition(async () => {
      const result = await logSet({
        routineExerciseId: data.routineExerciseId,
        setIndex: savingIndex,
        weightKg,
        repsCompleted,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const nextSetLogs = result.setLogs ?? setLogs;
      setSetLogs(nextSetLogs);

      if (resumeSnapshot) {
        setPhase(resumeSnapshot.phase);
        setEditingIndex(resumeSnapshot.editingIndex);
        setRestRemaining(resumeSnapshot.restRemaining);
        setInterrupted(null);
        return;
      }

      if (firstIncompleteIndex(nextSetLogs) >= data.sets) {
        setPhase("done");
      } else {
        setEditingIndex(null);
        setRestRemaining(data.restSeconds ?? 60);
        setPhase("resting");
      }
    });
  }

  const nextIncomplete = firstIncompleteIndex(setLogs);
  const willFinishAll = editingIndex != null && !setLogs.some((s, idx) => idx !== editingIndex && !s.completed);

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
          {phase === "ready" && (
            <>
              <p className="text-lg font-medium">
                Set {nextIncomplete + 1} of {data.sets} — {data.repsLow}-{data.repsHigh} reps. Let&apos;s go!
              </p>
              {data.intensityNote && <p className="text-muted-foreground text-sm italic">{data.intensityNote}</p>}
              <Button size="lg" className="self-start" onClick={handleStart}>
                Start
              </Button>
            </>
          )}

          {phase === "logging" && (
            <p className="text-lg font-medium">
              {interrupted
                ? `Editing Set ${(editingIndex ?? 0) + 1} — save to return to where you left off.`
                : `Set ${(editingIndex ?? 0) + 1} of ${data.sets} — ${data.repsLow}-${data.repsHigh} reps.`}
            </p>
          )}

          {phase === "resting" && (
            <>
              <p className="text-lg font-medium">Great set. Rest {restRemaining}s before the next one.</p>
              {data.intensityNote && <p className="text-muted-foreground text-sm italic">{data.intensityNote}</p>}
              <div className="flex flex-col items-start gap-3">
                <p className="text-4xl font-semibold tabular-nums">{restRemaining}s</p>
                <Button variant="outline" onClick={handleSkipRest}>
                  Skip rest
                </Button>
              </div>
            </>
          )}

          {phase === "done" && (
            <>
              <p className="text-lg font-medium">{data.exerciseName} complete — great session!</p>
              <Button nativeButton={false} render={<Link href="/routine" />}>
                Back to routine
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 text-sm">
        {Array.from({ length: data.sets }, (_, i) => {
          const log = setLogs[i];
          const isEditingThis = phase === "logging" && editingIndex === i;

          if (isEditingThis) {
            return (
              <div key={i} className="flex flex-col gap-3 rounded-lg border p-3">
                <span className="font-medium">Set {i + 1}</span>
                <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`reps-completed-${i}`}>Reps completed</Label>
                    <Input
                      id={`reps-completed-${i}`}
                      type="number"
                      step="1"
                      className="w-24"
                      autoFocus
                      value={repsInput}
                      onChange={(e) => setRepsInput(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`weight-lifted-${i}`}>Weight (kg)</Label>
                    <Input
                      id={`weight-lifted-${i}`}
                      type="number"
                      step="0.5"
                      className="w-28"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveRow} disabled={pending}>
                    {pending ? "Saving..." : interrupted ? "Save" : willFinishAll ? "Finish" : "Rest"}
                  </Button>
                  {interrupted && (
                    <Button variant="ghost" onClick={handleCancelEdit} disabled={pending}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          }

          const clickable =
            !interrupted && (log?.completed || (i === nextIncomplete && (phase === "ready" || phase === "resting")));

          return (
            <button
              key={i}
              type="button"
              disabled={!clickable}
              onClick={() => handleRowClick(i)}
              className="text-muted-foreground flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left enabled:hover:bg-accent disabled:opacity-60"
            >
              <span>Set {i + 1}</span>
              <span>{log?.completed ? formatSetSummary(log) : "—"}</span>
            </button>
          );
        })}
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

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createGoal } from "@/lib/actions/goals";
import { reviewGoalFeasibility } from "@/lib/actions/coach";
import type { GoalReview } from "@/lib/coach/reviewGoal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type Phase = "input" | "reviewed";

export function GoalForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [checking, startChecking] = useTransition();
  const [saving, startSaving] = useTransition();
  const [review, setReview] = useState<GoalReview | null>(null);
  const [coachError, setCoachError] = useState(false);

  const [startDate, setStartDate] = useState(todayISO());
  const [targetWeight, setTargetWeight] = useState("");
  const [targetBodyFatPct, setTargetBodyFatPct] = useState("");
  const [targetWaistCm, setTargetWaistCm] = useState("");

  function handleCheckWithCoach(e: FormEvent) {
    e.preventDefault();
    startChecking(async () => {
      const result = await reviewGoalFeasibility({
        requestedTargetWeight: targetWeight ? Number(targetWeight) : null,
        requestedTargetBodyFatPct: targetBodyFatPct ? Number(targetBodyFatPct) : null,
        requestedTargetWaistCm: targetWaistCm ? Number(targetWaistCm) : null,
      });

      if ("error" in result) {
        setCoachError(true);
        setReview(null);
        setPhase("reviewed");
        return;
      }

      setReview(result);
      setCoachError(false);
      // A suggested value of 0 means the Coach had no real basis for a number (e.g. no
      // current waist measurement on record) rather than an intentional target — treat it
      // the same as omitted rather than sending a value the server will reject as non-positive.
      if (result.suggestedTargets.targetWeight != null && result.suggestedTargets.targetWeight > 0) {
        setTargetWeight(String(result.suggestedTargets.targetWeight));
      }
      if (result.suggestedTargets.targetBodyFatPct != null && result.suggestedTargets.targetBodyFatPct > 0) {
        setTargetBodyFatPct(String(result.suggestedTargets.targetBodyFatPct));
      }
      if (result.suggestedTargets.targetWaistCm != null && result.suggestedTargets.targetWaistCm > 0) {
        setTargetWaistCm(String(result.suggestedTargets.targetWaistCm));
      }
      setPhase("reviewed");
    });
  }

  function handleStartGoal() {
    startSaving(async () => {
      const formData = new FormData();
      formData.set("startDate", startDate);
      formData.set("targetWeight", targetWeight);
      formData.set("targetBodyFatPct", targetBodyFatPct);
      formData.set("targetWaistCm", targetWaistCm);
      if (review) {
        formData.set("primaryGoal", review.primaryGoal);
        formData.set("secondaryGoal", review.secondaryGoal);
        formData.set("coachSpeech", review.speech);
        formData.set("coachAppData", JSON.stringify(review));
      }

      const result = await createGoal(undefined, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("12-week goal started");
      setPhase("input");
      setReview(null);
      setCoachError(false);
      setTargetWeight("");
      setTargetBodyFatPct("");
      setTargetWaistCm("");
      setStartDate(todayISO());
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleCheckWithCoach} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="targetWeight">Target weight (kg)</Label>
          <Input
            id="targetWeight"
            type="number"
            step="0.1"
            min="0"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="targetBodyFatPct">Target body fat %</Label>
          <Input
            id="targetBodyFatPct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={targetBodyFatPct}
            onChange={(e) => setTargetBodyFatPct(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="targetWaistCm">Target waist (cm)</Label>
          <Input
            id="targetWaistCm"
            type="number"
            step="0.1"
            min="0"
            value={targetWaistCm}
            onChange={(e) => setTargetWaistCm(e.target.value)}
          />
        </div>
      </div>

      {phase === "reviewed" && !coachError && review && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Coach&apos;s take</span>
            <p className="text-sm">{review.speech}</p>
          </div>
          {review.conflicts.length > 0 && (
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {review.conflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Primary goal</div>
              <div className="font-medium">{review.primaryGoal}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Secondary goal</div>
              <div className="font-medium">{review.secondaryGoal}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The fields above are pre-filled with the Coach&apos;s suggested targets — edit them if you&apos;d
            rather use your own numbers.
          </p>
        </div>
      )}

      {phase === "reviewed" && coachError && (
        <p className="text-sm text-muted-foreground">
          Coach&apos;s offline right now — you can still start your goal with your own numbers.
        </p>
      )}

      {phase === "input" ? (
        <Button type="submit" disabled={checking} className="self-start">
          {checking ? "Checking with Coach..." : "Check with Coach"}
        </Button>
      ) : (
        <Button type="button" onClick={handleStartGoal} disabled={saving} className="self-start">
          {saving ? "Starting..." : "Start 12-week goal"}
        </Button>
      )}
    </form>
  );
}

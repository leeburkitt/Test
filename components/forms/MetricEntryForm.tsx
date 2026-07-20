"use client";

import { useActionState, useState } from "react";
import { logMetric } from "@/lib/actions/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MetricEntryForm({ suggestedKeys = [] }: { suggestedKeys?: string[] }) {
  const [state, formAction, pending] = useActionState(logMetric, undefined);
  const [customRows, setCustomRows] = useState<{ id: number }[]>([]);
  const [nextId, setNextId] = useState(0);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={todayISO()} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input id="weight" name="weight" type="number" step="0.1" min="0" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bodyFatPct">Body fat %</Label>
          <Input id="bodyFatPct" name="bodyFatPct" type="number" step="0.1" min="0" max="100" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Body composition</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bmi">BMI</Label>
            <Input id="bmi" name="bmi" type="number" step="0.1" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bodyFatMassKg">Body fat mass (kg)</Label>
            <Input id="bodyFatMassKg" name="bodyFatMassKg" type="number" step="0.1" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="skeletalMuscleMassKg">Skeletal muscle mass (kg)</Label>
            <Input id="skeletalMuscleMassKg" name="skeletalMuscleMassKg" type="number" step="0.1" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="boneMassKg">Bone mass (kg)</Label>
            <Input id="boneMassKg" name="boneMassKg" type="number" step="0.1" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bodyWaterPct">Body water %</Label>
            <Input id="bodyWaterPct" name="bodyWaterPct" type="number" step="0.1" min="0" max="100" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="waistCm">Waist (cm)</Label>
            <Input id="waistCm" name="waistCm" type="number" step="0.1" min="0" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Vitals</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="restingHeartRate">Resting heart rate</Label>
            <Input id="restingHeartRate" name="restingHeartRate" type="number" step="1" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="systolic">Systolic BP</Label>
            <Input id="systolic" name="systolic" type="number" step="1" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="diastolic">Diastolic BP</Label>
            <Input id="diastolic" name="diastolic" type="number" step="1" min="0" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Activity</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="enduranceScore">Endurance score</Label>
            <Input id="enduranceScore" name="enduranceScore" type="number" step="1" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activeCaloriesAvg4w">Avg active calories (4w)</Label>
            <Input id="activeCaloriesAvg4w" name="activeCaloriesAvg4w" type="number" step="1" min="0" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="stepsAvg4w">Avg steps (4w)</Label>
            <Input id="stepsAvg4w" name="stepsAvg4w" type="number" step="1" min="0" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg border p-3">
        <input
          id="isDexaBaseline"
          name="isDexaBaseline"
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <Label htmlFor="isDexaBaseline" className="flex flex-col items-start gap-0.5 font-normal">
          This is a DEXA scan — recalibrate my baseline
          <span className="text-xs font-normal text-muted-foreground">
            Marks this entry as the new baseline. The dashboard&apos;s &quot;progress since baseline&quot; will
            reset to this date.
          </span>
        </Label>
      </div>

      {suggestedKeys.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {suggestedKeys.map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <Label htmlFor={`extra_${key}`}>{key}</Label>
              <Input id={`extra_${key}`} name={`extra_${key}`} type="number" step="0.5" />
            </div>
          ))}
        </div>
      )}

      {customRows.length > 0 && (
        <div className="flex flex-col gap-2">
          {customRows.map((row) => (
            <div key={row.id} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label>Metric name</Label>
                <Input name="customKey" placeholder="waist_cm" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label>Value</Label>
                <Input name="customValue" type="number" step="any" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCustomRows((rows) => rows.filter((r) => r.id !== row.id))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          setCustomRows((rows) => [...rows, { id: nextId }]);
          setNextId((n) => n + 1);
        }}
      >
        <Plus className="size-4" /> Add custom metric
      </Button>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-500">Saved.</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving..." : "Save entry"}
      </Button>
    </form>
  );
}

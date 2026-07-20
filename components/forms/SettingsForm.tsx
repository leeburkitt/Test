"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsForm({
  unitsWeight,
  trainingDaysPerWeek,
}: {
  unitsWeight: "kg" | "lb";
  trainingDaysPerWeek: number;
}) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-2">
        <Label htmlFor="unitsWeight">Weight units</Label>
        <Select name="unitsWeight" defaultValue={unitsWeight}>
          <SelectTrigger id="unitsWeight" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="lb">lb</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="trainingDaysPerWeek">Training days / week</Label>
        <Input
          id="trainingDaysPerWeek"
          name="trainingDaysPerWeek"
          type="number"
          min={1}
          max={7}
          defaultValue={trainingDaysPerWeek}
          className="w-24"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      {state?.error && <p className="text-sm text-destructive sm:basis-full">{state.error}</p>}
    </form>
  );
}

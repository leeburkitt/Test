"use client";

import { useActionState, useRef, useEffect } from "react";
import { createZone, type GymFormState } from "@/lib/actions/gyms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ZoneForm({ gymId }: { gymId: number }) {
  const [state, formAction, pending] = useActionState<GymFormState, FormData>(createZone, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <input type="hidden" name="gymId" value={gymId} />
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="zoneName">Zone name</Label>
        <Input id="zoneName" name="name" placeholder="Free weights zone" required />
      </div>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add zone"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive sm:basis-full">{state.error}</p>}
    </form>
  );
}

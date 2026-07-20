"use client";

import { useActionState, useRef, useEffect } from "react";
import type { GymFormState } from "@/lib/actions/gyms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GymForm({
  action,
}: {
  action: (state: GymFormState, formData: FormData) => Promise<GymFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
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
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="name">Gym name</Label>
        <Input id="name" name="name" placeholder="Downtown Fitness" required />
      </div>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add gym"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive sm:basis-full">{state.error}</p>}
    </form>
  );
}

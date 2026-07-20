"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateRoutineForCurrentWeek } from "@/lib/actions/routines";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function GenerateRoutineButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await generateRoutineForCurrentWeek();
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      {pending ? "Generating..." : "Generate this week's routine"}
    </Button>
  );
}

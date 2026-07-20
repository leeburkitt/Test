"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEquipment } from "@/lib/actions/equipment";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function EquipmentDeleteButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteEquipment(id);
      toast.success(`Removed "${name}"`);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="icon" disabled={pending} onClick={handleDelete} aria-label="Delete">
      <Trash2 className="size-4" />
    </Button>
  );
}

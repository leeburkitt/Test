"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEquipment } from "@/lib/actions/equipment";
import { equipmentCategoryValues } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Pencil } from "lucide-react";
import { toast } from "sonner";

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function EquipmentEditDialog({
  id,
  initialName,
  initialCategory,
  initialNotes,
}: {
  id: number;
  initialName: string;
  initialCategory: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(initialName);
      setCategory(initialCategory);
      setNotes(initialNotes ?? "");
      setError(null);
    }
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("name", name);
    formData.set("category", category);
    formData.set("notes", notes);

    startTransition(async () => {
      const result = await updateEquipment(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success("Equipment updated");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Edit" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit equipment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-name-${id}`}>Name</Label>
            <Input id={`edit-name-${id}`} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-category-${id}`}>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as string)}>
              <SelectTrigger id={`edit-category-${id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {equipmentCategoryValues.map((c) => (
                  <SelectItem key={c} value={c}>
                    {formatCategory(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-notes-${id}`}>Notes</Label>
            <Input id={`edit-notes-${id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={pending || name.trim() === ""}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

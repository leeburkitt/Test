"use client";

import { useActionState, useRef, useState, useTransition, useEffect } from "react";
import {
  createGymEquipment,
  scanEquipmentPhoto,
  scanEquipmentText,
  type GymEquipmentFormState,
} from "@/lib/actions/equipment";
import type { ScannedLabel } from "@/lib/equipment/scanLabel";
import { resizeImageFile } from "@/lib/equipment/resizeImage";
import { equipmentCategoryValues } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera } from "lucide-react";
import { toast } from "sonner";

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function GymEquipmentForm({ gymId, zoneId }: { gymId: number; zoneId: number }) {
  const [state, formAction, pending] = useActionState<GymEquipmentFormState, FormData>(
    createGymEquipment,
    undefined
  );
  const [mode, setMode] = useState<"photo" | "describe">("photo");
  const [photoPhase, setPhotoPhase] = useState<"idle" | "reading" | "saving">("idle");
  const [scanning, startScan] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(equipmentCategoryValues[0]);
  const [notes, setNotes] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasPending = useRef(false);
  // Synchronous guard against double-submission: React state (photoPhase) only takes effect
  // after a render, so two taps in the same tick (easy with a slow camera picker) can both
  // pass the "disabled" check before either commits. A ref mutates immediately.
  const busyRef = useRef(false);
  // Bumped on every new attempt/cancel so a slow, still-in-flight request from a stale
  // attempt can't clobber the state of whatever the user is doing now when it finally settles.
  const requestIdRef = useRef(0);

  function resetForm() {
    busyRef.current = false;
    formRef.current?.reset();
    setPreviewUrl(null);
    setDescription("");
    setName("");
    setCategory(equipmentCategoryValues[0]);
    setNotes("");
    setPhotoPhase("idle");
  }

  function cancelPhoto() {
    requestIdRef.current++;
    busyRef.current = false;
    setPhotoPhase("idle");
    setPreviewUrl(null);
  }

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      resetForm();
    }
    wasPending.current = pending;
  }, [pending, state]);

  function applySuggestion(result: ScannedLabel) {
    setName(result.name);
    setCategory(result.category);
    if (result.notes) setNotes(result.notes);
  }

  function describeUploadError(err: unknown): string {
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      return "Network issue while uploading the photo — check your connection and try again.";
    }
    return err instanceof Error ? err.message : "Couldn't read the label — enter details manually";
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    // Synchronous check-and-set — closes the double-tap race that a React-state-only guard
    // can't, since two taps in the same tick would both still read photoPhase as "idle".
    if (busyRef.current) return;
    busyRef.current = true;
    const requestId = ++requestIdRef.current;
    const stillCurrent = () => requestIdRef.current === requestId;

    setPhotoPhase("reading");
    startScan(async () => {
      const uploadFile = await resizeImageFile(file).catch(() => file);
      if (!stillCurrent()) return;
      setPreviewUrl(URL.createObjectURL(uploadFile));

      const scanData = new FormData();
      scanData.append("photo", uploadFile);

      let result: ScannedLabel;
      try {
        result = await scanEquipmentPhoto(scanData);
      } catch (err) {
        if (!stillCurrent()) return;
        busyRef.current = false;
        setPhotoPhase("idle");
        toast.error(describeUploadError(err));
        return;
      }
      if (!stillCurrent()) return;

      applySuggestion(result);
      setPhotoPhase("saving");

      const saveData = new FormData();
      saveData.append("gymId", String(gymId));
      saveData.append("zoneId", String(zoneId));
      saveData.append("name", result.name);
      saveData.append("category", result.category);
      saveData.append("notes", result.notes ?? "");
      saveData.append("photo", uploadFile);

      let saveResult: GymEquipmentFormState;
      try {
        saveResult = await createGymEquipment(undefined, saveData);
      } catch (err) {
        if (!stillCurrent()) return;
        busyRef.current = false;
        setPhotoPhase("idle");
        toast.error(`Couldn't save automatically: ${describeUploadError(err)} Review the details and add it manually.`);
        return;
      }
      if (!stillCurrent()) return;
      if (saveResult?.error) {
        busyRef.current = false;
        setPhotoPhase("idle");
        toast.error(`Couldn't save automatically: ${saveResult.error}. Review the details and add it manually.`);
        return;
      }

      toast.success(`Added "${result.name}"`);
      resetForm();
    });
  }

  function handleDescribe() {
    if (description.trim() === "") return;
    const scanData = new FormData();
    scanData.append("description", description.trim());
    startScan(async () => {
      try {
        applySuggestion(await scanEquipmentText(scanData));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't read that — enter details manually");
      }
    });
  }

  const photoButtonLabel =
    photoPhase === "reading" ? "Reading label…" : photoPhase === "saving" ? "Saving…" : "Take a photo";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <input type="hidden" name="gymId" value={gymId} />
      <input type="hidden" name="zoneId" value={zoneId} />

      <Tabs value={mode} onValueChange={(v) => setMode(v as "photo" | "describe")}>
        <TabsList>
          <TabsTrigger value="photo">Photo</TabsTrigger>
          <TabsTrigger value="describe">Describe</TabsTrigger>
        </TabsList>

        <TabsContent value="photo" className="flex flex-col gap-3 pt-3">
          <input
            ref={fileInputRef}
            className="hidden"
            id={`photo-${zoneId}`}
            name="photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {previewUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Equipment label"
                className="h-20 w-20 shrink-0 rounded-md border object-cover"
              />
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  {photoPhase === "idle" ? "Captured" : photoButtonLabel}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    disabled={photoPhase !== "idle"}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="size-4" /> Retake photo
                  </Button>
                  {photoPhase !== "idle" && (
                    <Button type="button" variant="ghost" size="sm" className="self-start" onClick={cancelPhoto}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                className="h-24 w-full flex-col gap-1.5 text-base"
                disabled={photoPhase !== "idle"}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-6" />
                {photoButtonLabel}
              </Button>
              {photoPhase !== "idle" && (
                <Button type="button" variant="ghost" size="sm" onClick={cancelPhoto}>
                  Cancel
                </Button>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Point at the equipment&apos;s label or nameplate — it&apos;s saved to this zone automatically once
            read.
          </p>
        </TabsContent>

        <TabsContent value="describe" className="flex flex-col gap-2 pt-3">
          <Label htmlFor={`description-${zoneId}`}>Describe the equipment</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`description-${zoneId}`}
              placeholder="Life Fitness leg press, black frame"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleDescribe();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleDescribe} disabled={scanning}>
              Suggest details
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`name-${zoneId}`}>Name</Label>
          <Input
            id={`name-${zoneId}`}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`category-${zoneId}`}>Category</Label>
          <Select name="category" value={category} onValueChange={(v) => setCategory(v as string)}>
            <SelectTrigger id={`category-${zoneId}`} className="w-full">
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
          <Label htmlFor={`notes-${zoneId}`}>Notes</Label>
          <Input id={`notes-${zoneId}`} name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending || scanning} variant="outline" className="self-start">
        {pending ? "Adding..." : "Add equipment manually"}
      </Button>
    </form>
  );
}

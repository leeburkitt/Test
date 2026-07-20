"use client";

import type { ColumnMapping, MappingTarget } from "@/lib/import/parseSpreadsheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const OPTIONS: { value: string; label: string }[] = [
  { value: "ignore", label: "Ignore" },
  { value: "date", label: "Date" },
  { value: "weight_kg", label: "Weight (kg)" },
  { value: "weight_lb", label: "Weight (lb)" },
  { value: "body_fat_pct", label: "Body fat %" },
  { value: "bmi", label: "BMI" },
  { value: "skeletal_muscle_mass_kg", label: "Skeletal muscle mass (kg)" },
  { value: "bone_mass_kg", label: "Bone mass (kg)" },
  { value: "body_water_pct", label: "Body water %" },
  { value: "waist_cm", label: "Waist (cm)" },
  { value: "body_fat_mass_kg", label: "Body fat mass (kg)" },
  { value: "resting_heart_rate", label: "Resting heart rate" },
  { value: "systolic", label: "Systolic BP" },
  { value: "diastolic", label: "Diastolic BP" },
  { value: "endurance_score", label: "Endurance score" },
  { value: "active_calories_avg_4w", label: "Avg active calories (4w)" },
  { value: "steps_avg_4w", label: "Avg steps (4w)" },
  { value: "notes", label: "Notes" },
  { value: "custom", label: "Custom metric..." },
];

function targetToSelectValue(target: MappingTarget): string {
  return target.type;
}

export function ColumnMappingTable({
  headers,
  previewRows,
  mapping,
  onChange,
}: {
  headers: string[];
  previewRows: Record<string, string>[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}) {
  function setTarget(header: string, type: string) {
    const next: ColumnMapping = { ...mapping };
    if (type === "custom") {
      next[header] = { type: "custom", name: header };
    } else {
      next[header] = { type } as MappingTarget;
    }
    onChange(next);
  }

  function setCustomName(header: string, name: string) {
    onChange({ ...mapping, [header]: { type: "custom", name } });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Spreadsheet column</TableHead>
            <TableHead>Maps to</TableHead>
            <TableHead>Preview</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {headers.map((header) => {
            const target = mapping[header] ?? { type: "ignore" };
            return (
              <TableRow key={header}>
                <TableCell className="font-medium">{header}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={targetToSelectValue(target)}
                      onValueChange={(value) => setTarget(header, value as string)}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {target.type === "custom" && (
                      <Input
                        placeholder="metric name"
                        defaultValue={target.name}
                        onChange={(e) => setCustomName(header, e.target.value)}
                        className="w-36"
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {previewRows
                    .slice(0, 3)
                    .map((row) => row[header])
                    .filter((v) => v !== undefined && v !== "")
                    .join(", ")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

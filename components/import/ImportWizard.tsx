"use client";

import { useMemo, useState, useTransition } from "react";
import { FileDropzone } from "@/components/import/FileDropzone";
import { ColumnMappingTable } from "@/components/import/ColumnMappingTable";
import {
  parseFile,
  normalizeRows,
  type ColumnMapping,
  type ParsedSpreadsheet,
} from "@/lib/import/parseSpreadsheet";
import { importMetrics } from "@/lib/actions/metrics";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const h = header.toLowerCase();
    if (h.includes("+/-") || h.includes("running total")) {
      // Change-since-last-reading and running-total columns aren't raw
      // readings — auto-mapping them would collide with (and silently
      // overwrite) the real value's column.
      mapping[header] = { type: "ignore" };
    } else if (h.includes("date")) {
      mapping[header] = { type: "date" };
    } else if (h.includes("weight") && (h.includes("lb") || h.includes("pound"))) {
      mapping[header] = { type: "weight_lb" };
    } else if (h.includes("weight") || h === "kg") {
      mapping[header] = { type: "weight_kg" };
    } else if (h.includes("bmi")) {
      mapping[header] = { type: "bmi" };
    } else if (h.includes("body fat kg") || h.includes("fat kg")) {
      mapping[header] = { type: "body_fat_mass_kg" };
    } else if (h.includes("fat") || h.includes("bf%") || h.includes("bf ")) {
      mapping[header] = { type: "body_fat_pct" };
    } else if (h.includes("sk mass") || h.includes("skeletal muscle")) {
      mapping[header] = { type: "skeletal_muscle_mass_kg" };
    } else if (h.includes("bone mass")) {
      mapping[header] = { type: "bone_mass_kg" };
    } else if (h.includes("body water")) {
      mapping[header] = { type: "body_water_pct" };
    } else if (h.includes("belly button") || h.includes("waist")) {
      mapping[header] = { type: "waist_cm" };
    } else if (h.includes("sys")) {
      mapping[header] = { type: "systolic" };
    } else if (h.includes("dia")) {
      mapping[header] = { type: "diastolic" };
    } else if (h === "hr" || h.includes("heart rate")) {
      mapping[header] = { type: "resting_heart_rate" };
    } else if (h.includes("endurance")) {
      mapping[header] = { type: "endurance_score" };
    } else if (h.includes("notes")) {
      mapping[header] = { type: "notes" };
    } else {
      mapping[header] = { type: "ignore" };
    }
  }
  return mapping;
}

export function ImportWizard() {
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const normalized = useMemo(() => {
    if (!parsed) return { rows: [], skipped: 0 };
    return normalizeRows(parsed.rows, mapping);
  }, [parsed, mapping]);

  async function handleFile(file: File) {
    setResult(null);
    const data = await parseFile(file);
    setParsed(data);
    setMapping(guessMapping(data.headers));
  }

  function handleImport() {
    startTransition(async () => {
      try {
        const { imported } = await importMetrics(normalized.rows);
        setResult({ imported, skipped: normalized.skipped });
        toast.success(`Imported ${imported} entries.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  if (!parsed) {
    return <FileDropzone onFile={handleFile} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ColumnMappingTable
        headers={parsed.headers}
        previewRows={parsed.rows}
        mapping={mapping}
        onChange={setMapping}
      />

      <div className="text-muted-foreground text-sm">
        {normalized.rows.length} rows will be imported
        {normalized.skipped > 0 && `, ${normalized.skipped} skipped (no valid date)`}.
      </div>

      <div className="flex gap-2">
        <Button onClick={handleImport} disabled={pending || normalized.rows.length === 0}>
          {pending ? "Importing..." : `Import ${normalized.rows.length} entries`}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setParsed(null);
            setResult(null);
          }}
        >
          Start over
        </Button>
      </div>

      {result && (
        <p className="text-sm text-green-600 dark:text-green-500">
          Imported {result.imported} entries.
        </p>
      )}
    </div>
  );
}

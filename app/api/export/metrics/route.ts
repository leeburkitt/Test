import { db } from "@/lib/db/client";
import { metrics } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const XLSX = await import("xlsx");
  const rows = await db.select().from(metrics).orderBy(asc(metrics.date));

  const extraKeys = Array.from(
    new Set(rows.flatMap((row) => (row.extra ? Object.keys(row.extra) : [])))
  ).sort();

  const headers = [
    "Date",
    "Weight KG",
    "BMI",
    "Fat %",
    "SK mass KG",
    "Bone mass KG",
    "Body water %",
    "Endurance",
    "Avg 4W Active daily",
    "Avg (4W) Daily",
    "Belly button cm",
    "Body Fat KG",
    "Sys",
    "Dia",
    "HR",
    "Notes",
    ...extraKeys,
    "Source",
    "Dexa baseline",
  ];

  const aoa: (string | number)[][] = [
    headers,
    ...rows.map((row) => [
      row.date,
      row.weight ?? "",
      row.bmi ?? "",
      row.bodyFatPct ?? "",
      row.skeletalMuscleMassKg ?? "",
      row.boneMassKg ?? "",
      row.bodyWaterPct ?? "",
      row.enduranceScore ?? "",
      row.activeCaloriesAvg4w ?? "",
      row.stepsAvg4w ?? "",
      row.waistCm ?? "",
      row.bodyFatMassKg ?? "",
      row.systolic ?? "",
      row.diastolic ?? "",
      row.restingHeartRate ?? "",
      row.notes ?? "",
      ...extraKeys.map((key) => row.extra?.[key] ?? ""),
      row.source,
      row.isDexaBaseline ? "yes" : "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Metrics");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const filename = `fitness-tracker-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

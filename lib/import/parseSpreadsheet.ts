export type ParsedSpreadsheet = {
  headers: string[];
  rows: Record<string, string>[];
};

export async function parseFile(file: File): Promise<ParsedSpreadsheet> {
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  return isCsv ? parseCsv(file) : parseXlsx(file);
}

function columnLetter(index: number): string {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/**
 * Some exports (e.g. Garmin Connect) have a group-label row above the real
 * field-name row. Scan for the row containing a "Date" cell and treat that
 * as the header row, so a title row above it doesn't get read as headers.
 */
function rowsFromAoa(aoa: string[][]): ParsedSpreadsheet {
  const searchLimit = Math.min(10, aoa.length);
  let headerRowIndex = 0;
  for (let i = 0; i < searchLimit; i++) {
    if (aoa[i]?.some((cell) => String(cell).trim().toLowerCase() === "date")) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = aoa[headerRowIndex] ?? [];
  const counts = new Map<string, number>();
  for (const cell of rawHeaders) {
    const name = String(cell).trim();
    if (name === "") continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const headers = rawHeaders.map((cell, i) => {
    const name = String(cell).trim();
    if (name === "") return `Column ${columnLetter(i)}`;
    if ((counts.get(name) ?? 0) > 1) return `${name} (col ${columnLetter(i)})`;
    return name;
  });

  const rows = aoa.slice(headerRowIndex + 1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = row[i] !== undefined ? String(row[i]) : "";
    });
    return record;
  });

  return { headers, rows };
}

async function parseCsv(file: File): Promise<ParsedSpreadsheet> {
  const Papa = (await import("papaparse")).default;
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => resolve(rowsFromAoa(results.data)),
      error: (err: Error) => reject(err),
    });
  });
}

async function parseXlsx(file: File): Promise<ParsedSpreadsheet> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false });
  return rowsFromAoa(aoa);
}

export type MappingTarget =
  | { type: "date" }
  | { type: "weight_kg" }
  | { type: "weight_lb" }
  | { type: "body_fat_pct" }
  | { type: "bmi" }
  | { type: "skeletal_muscle_mass_kg" }
  | { type: "bone_mass_kg" }
  | { type: "body_water_pct" }
  | { type: "waist_cm" }
  | { type: "body_fat_mass_kg" }
  | { type: "resting_heart_rate" }
  | { type: "systolic" }
  | { type: "diastolic" }
  | { type: "endurance_score" }
  | { type: "active_calories_avg_4w" }
  | { type: "steps_avg_4w" }
  | { type: "notes" }
  | { type: "ignore" }
  | { type: "custom"; name: string };

export type ColumnMapping = Record<string, MappingTarget>;

export type NormalizedRow = {
  date: string;
  weight?: number;
  bodyFatPct?: number;
  bmi?: number;
  skeletalMuscleMassKg?: number;
  boneMassKg?: number;
  bodyWaterPct?: number;
  waistCm?: number;
  bodyFatMassKg?: number;
  restingHeartRate?: number;
  systolic?: number;
  diastolic?: number;
  enduranceScore?: number;
  activeCaloriesAvg4w?: number;
  stepsAvg4w?: number;
  notes?: string;
  extra?: Record<string, number>;
};

const LB_TO_KG = 0.45359237;

function parseDateToISO(raw: string): string | null {
  if (!raw) return null;
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (isoMatch) return isoMatch[0];

  const dmyMatch = /^(\d{2})[-/](\d{2})[-/](\d{2})$/.exec(raw);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `20${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): { rows: NormalizedRow[]; skipped: number } {
  const normalized: NormalizedRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    let date: string | null = null;
    let weightKg: number | undefined;
    let weightLb: number | undefined;
    let bodyFatPct: number | undefined;
    let bmi: number | undefined;
    let skeletalMuscleMassKg: number | undefined;
    let boneMassKg: number | undefined;
    let bodyWaterPct: number | undefined;
    let waistCm: number | undefined;
    let bodyFatMassKg: number | undefined;
    let restingHeartRate: number | undefined;
    let systolic: number | undefined;
    let diastolic: number | undefined;
    let enduranceScore: number | undefined;
    let activeCaloriesAvg4w: number | undefined;
    let stepsAvg4w: number | undefined;
    let notes: string | undefined;
    const extra: Record<string, number> = {};

    for (const [header, target] of Object.entries(mapping)) {
      const raw = row[header];
      if (raw === undefined || raw === "") continue;

      switch (target.type) {
        case "date":
          date = parseDateToISO(String(raw));
          break;
        case "weight_kg": {
          const n = Number(raw);
          if (!Number.isNaN(n)) weightKg = n;
          break;
        }
        case "weight_lb": {
          const n = Number(raw);
          if (!Number.isNaN(n)) weightLb = n;
          break;
        }
        case "body_fat_pct": {
          const n = Number(raw);
          if (!Number.isNaN(n)) bodyFatPct = n;
          break;
        }
        case "bmi": {
          const n = Number(raw);
          if (!Number.isNaN(n)) bmi = n;
          break;
        }
        case "skeletal_muscle_mass_kg": {
          const n = Number(raw);
          if (!Number.isNaN(n)) skeletalMuscleMassKg = n;
          break;
        }
        case "bone_mass_kg": {
          const n = Number(raw);
          if (!Number.isNaN(n)) boneMassKg = n;
          break;
        }
        case "body_water_pct": {
          const n = Number(raw);
          if (!Number.isNaN(n)) bodyWaterPct = n;
          break;
        }
        case "waist_cm": {
          const n = Number(raw);
          if (!Number.isNaN(n)) waistCm = n;
          break;
        }
        case "body_fat_mass_kg": {
          const n = Number(raw);
          if (!Number.isNaN(n)) bodyFatMassKg = n;
          break;
        }
        case "resting_heart_rate": {
          const n = Number(raw);
          if (!Number.isNaN(n)) restingHeartRate = n;
          break;
        }
        case "systolic": {
          const n = Number(raw);
          if (!Number.isNaN(n)) systolic = n;
          break;
        }
        case "diastolic": {
          const n = Number(raw);
          if (!Number.isNaN(n)) diastolic = n;
          break;
        }
        case "endurance_score": {
          const n = Number(raw);
          if (!Number.isNaN(n)) enduranceScore = n;
          break;
        }
        case "active_calories_avg_4w": {
          const n = Number(raw);
          if (!Number.isNaN(n)) activeCaloriesAvg4w = n;
          break;
        }
        case "steps_avg_4w": {
          const n = Number(raw);
          if (!Number.isNaN(n)) stepsAvg4w = n;
          break;
        }
        case "notes": {
          const s = String(raw).trim();
          if (s !== "") notes = s;
          break;
        }
        case "custom": {
          const n = Number(raw);
          if (!Number.isNaN(n) && target.name.trim() !== "") extra[target.name.trim()] = n;
          break;
        }
        case "ignore":
        default:
          break;
      }
    }

    if (!date) {
      skipped++;
      continue;
    }

    const weight = weightKg ?? (weightLb !== undefined ? weightLb * LB_TO_KG : undefined);

    normalized.push({
      date,
      weight,
      bodyFatPct,
      bmi,
      skeletalMuscleMassKg,
      boneMassKg,
      bodyWaterPct,
      waistCm,
      bodyFatMassKg,
      restingHeartRate,
      systolic,
      diastolic,
      enduranceScore,
      activeCaloriesAvg4w,
      stepsAvg4w,
      notes,
      extra: Object.keys(extra).length > 0 ? extra : undefined,
    });
  }

  return { rows: normalized, skipped };
}

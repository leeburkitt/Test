import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TrendStatus } from "@/lib/db/schema";

const STATUS_LABEL: Record<TrendStatus, string> = {
  ahead: "Ahead",
  on_track: "On track",
  behind: "Behind",
};

type RoutineDay = {
  id: number;
  dayIndex: number;
  focus: string;
  exercises: {
    id: number;
    sets: number;
    repsLow: number;
    repsHigh: number;
    targetWeightKg: number | null;
    intensityNote: string | null;
    exerciseName: string;
  }[];
};

export function RoutineCard({
  weekNumber,
  trendStatus,
  rationale,
  days,
}: {
  weekNumber: number;
  trendStatus: TrendStatus;
  rationale: string;
  days: RoutineDay[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Week {weekNumber}</CardTitle>
        <Badge variant="secondary">{STATUS_LABEL[trendStatus]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">{rationale}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {days.map((day) => (
            <div key={day.id} className="rounded-lg border p-3">
              <h3 className="mb-2 font-medium">{day.focus}</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {day.exercises.map((ex) => (
                  <li key={ex.id} className="flex flex-col">
                    <span>
                      {ex.exerciseName} — {ex.sets} × {ex.repsLow}-{ex.repsHigh}
                      {ex.targetWeightKg != null && ` @ ${ex.targetWeightKg}kg`}
                    </span>
                    {ex.intensityNote && (
                      <span className="text-muted-foreground text-xs">{ex.intensityNote}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

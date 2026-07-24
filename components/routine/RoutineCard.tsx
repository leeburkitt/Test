import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoutineDayDialog } from "@/components/routine/RoutineDayDialog";
import { formatDayHeading } from "@/lib/routines/daySlots";
import type { TrendStatus, RoutineDayType, SetLog } from "@/lib/db/schema";

const STATUS_LABEL: Record<TrendStatus, string> = {
  ahead: "Ahead",
  on_track: "On track",
  behind: "Behind",
};

const CARDIO_TYPES: RoutineDayType[] = ["run", "swim", "walk"];

type RoutineDay = {
  id: number;
  dayIndex: number;
  dayOfWeek: number | null;
  dayType: RoutineDayType;
  focus: string;
  coachNote: string | null;
  completed: boolean;
  exercises: {
    id: number;
    sets: number;
    repsLow: number;
    repsHigh: number;
    targetWeightKg: number | null;
    restSeconds: number | null;
    intensityNote: string | null;
    actualWeightKg: number | null;
    completed: boolean;
    setLogs: SetLog[] | null;
    exerciseName: string;
    equipmentName: string | null;
    zoneName: string | null;
  }[];
};

function CompletionBadge({ day }: { day: RoutineDay }) {
  const isCardio = CARDIO_TYPES.includes(day.dayType);
  if (isCardio) {
    return day.completed ? <Badge variant="secondary">Done</Badge> : null;
  }
  if (day.exercises.length === 0) return null;
  const done = day.exercises.filter((ex) => ex.completed).length;
  if (done === 0) return null;
  return (
    <Badge variant="secondary">
      {done}/{day.exercises.length} done
    </Badge>
  );
}

export function RoutineCard({
  weekNumber,
  weekStartDate,
  trendStatus,
  rationale,
  days,
}: {
  weekNumber: number;
  weekStartDate: string;
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
            <RoutineDayDialog key={day.id} day={day} weekStartDate={weekStartDate}>
              <div className="flex w-full flex-col rounded-lg border p-3 text-left transition-colors hover:bg-accent">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      {formatDayHeading(weekStartDate, day.dayOfWeek)}
                    </p>
                    <h3 className="font-medium">{day.focus}</h3>
                  </div>
                  <CompletionBadge day={day} />
                </div>
                {day.coachNote && (
                  <p className="text-muted-foreground mb-2 text-sm">{day.coachNote}</p>
                )}
                {day.exercises.length > 0 && (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {day.exercises.map((ex) => (
                      <li key={ex.id} className="flex flex-col">
                        <span>
                          {ex.exerciseName} — {ex.sets} × {ex.repsLow}-{ex.repsHigh}
                          {ex.targetWeightKg != null && ` @ ${ex.targetWeightKg}kg`}
                          {ex.restSeconds != null && ` · rest ${ex.restSeconds}s`}
                        </span>
                        {(ex.equipmentName || ex.zoneName) && (
                          <span className="text-muted-foreground text-xs">
                            {ex.equipmentName}
                            {ex.equipmentName && ex.zoneName && " — "}
                            {ex.zoneName}
                          </span>
                        )}
                        {ex.intensityNote && (
                          <span className="text-muted-foreground text-xs">{ex.intensityNote}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </RoutineDayDialog>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

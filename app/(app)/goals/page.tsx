import { db } from "@/lib/db/client";
import { goals, metrics, coachMessages } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { GoalForm } from "@/components/forms/GoalForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function GoalsPage() {
  const [activeGoal] = await db.select().from(goals).where(eq(goals.status, "active")).limit(1);
  const pastGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.status, "archived"))
    .orderBy(desc(goals.createdAt));
  const [latestMetric] = await db.select().from(metrics).orderBy(desc(metrics.date)).limit(1);
  const [coachMessage] = activeGoal
    ? await db
        .select()
        .from(coachMessages)
        .where(eq(coachMessages.goalId, activeGoal.id))
        .orderBy(desc(coachMessages.createdAt))
        .limit(1)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="text-muted-foreground text-sm">Set a 12-week target.</p>
      </div>

      {activeGoal && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active goal</CardTitle>
            <Badge>{activeGoal.startDate} → {activeGoal.endDate}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {activeGoal.targetWeight != null && (
              <div>
                <div className="text-muted-foreground">Weight</div>
                <div className="font-medium">
                  {activeGoal.startWeight ?? "—"} → {activeGoal.targetWeight} kg
                </div>
              </div>
            )}
            {activeGoal.targetBodyFatPct != null && (
              <div>
                <div className="text-muted-foreground">Body fat</div>
                <div className="font-medium">
                  {activeGoal.startBodyFatPct ?? "—"} → {activeGoal.targetBodyFatPct}%
                </div>
              </div>
            )}
            {activeGoal.targetWaistCm != null && (
              <div>
                <div className="text-muted-foreground">Waist</div>
                <div className="font-medium">
                  {activeGoal.startWaistCm ?? "—"} → {activeGoal.targetWaistCm} cm
                </div>
              </div>
            )}
            {activeGoal.primaryGoal && (
              <div>
                <div className="text-muted-foreground">Primary goal</div>
                <div className="font-medium">{activeGoal.primaryGoal}</div>
              </div>
            )}
            {activeGoal.secondaryGoal && (
              <div>
                <div className="text-muted-foreground">Secondary goal</div>
                <div className="font-medium">{activeGoal.secondaryGoal}</div>
              </div>
            )}
          </CardContent>
          {coachMessage && (
            <CardContent className="flex flex-col gap-1 border-t pt-4 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Coach&apos;s take</span>
              <p>{coachMessage.speech}</p>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {activeGoal ? "Start a new 12-week goal" : "Start your first 12-week goal"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {activeGoal && (
            <p className="text-muted-foreground text-sm">
              Starting a new goal archives the current active one.
            </p>
          )}
          {latestMetric && (
            <p className="text-muted-foreground text-sm">
              Most recent log ({latestMetric.date}): {latestMetric.weight ?? "—"} kg,{" "}
              {latestMetric.bodyFatPct ?? "—"}% body fat, {latestMetric.waistCm ?? "—"} cm waist
              {latestMetric.extra &&
                `, ${Object.entries(latestMetric.extra)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}`}
              . This becomes your starting point.
            </p>
          )}
          <GoalForm />
        </CardContent>
      </Card>

      {pastGoals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Past goals</h2>
          {pastGoals.map((g) => (
            <div key={g.id} className="rounded-lg border px-4 py-3 text-sm">
              {g.startDate} → {g.endDate}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

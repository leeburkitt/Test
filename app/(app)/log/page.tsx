import { db } from "@/lib/db/client";
import { goals, metrics } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { MetricEntryForm } from "@/components/forms/MetricEntryForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function LogPage() {
  const [activeGoal] = await db.select().from(goals).where(eq(goals.status, "active")).limit(1);
  const suggestedKeys = activeGoal?.strengthTargets ? Object.keys(activeGoal.strengthTargets) : [];

  const recentEntries = await db.select().from(metrics).orderBy(desc(metrics.date)).limit(10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Log entry</h1>
        <p className="text-muted-foreground text-sm">Record this week&apos;s metrics.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New entry</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricEntryForm suggestedKeys={suggestedKeys} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Body fat %</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Baseline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.weight ?? "—"}</TableCell>
                    <TableCell>{entry.bodyFatPct ?? "—"}</TableCell>
                    <TableCell className="capitalize">{entry.source}</TableCell>
                    <TableCell>{entry.isDexaBaseline && <Badge>DEXA</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

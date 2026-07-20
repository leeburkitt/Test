import { ImportWizard } from "@/components/import/ImportWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Import history</h1>
        <p className="text-muted-foreground text-sm">
          Import your existing spreadsheet of metrics as historical data. Re-importing the same
          file is safe — entries are matched by date.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload file</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportWizard />
        </CardContent>
      </Card>
    </div>
  );
}

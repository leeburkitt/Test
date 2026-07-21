import { ImportWizard } from "@/components/import/ImportWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export your data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Download every metric entry you have logged or imported, past and future, as a
            spreadsheet — useful as a backup or if you ever want to take your data elsewhere.
          </p>
          <Button
            className="self-start"
            nativeButton={false}
            render={<a href="/api/export/metrics" download />}
          >
            Download spreadsheet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

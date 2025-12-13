import { MobileLayout } from "@/components/mobile-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, ClipboardList, FileText, PenLine } from "lucide-react";

export default function DoctorDashboard() {
  return (
    <MobileLayout title="Doctor Dashboard">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approved doctor</h1>
          <p className="text-slate-500">Review patient submissions and add annotations.</p>
        </div>

        <Card className="p-4 flex items-center gap-4 border-slate-200/60 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm text-slate-500">Worklist</p>
            <p className="font-semibold text-slate-900">Patient results ready for review</p>
          </div>
          <Button variant="secondary">Open</Button>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <ClipboardList className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Results</span>
            </div>
            <p className="text-sm text-slate-700">Inspect AI grades, confidence, and heatmaps.</p>
          </Card>
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Reports</span>
            </div>
            <p className="text-sm text-slate-700">Download PDFs for EMR attachments.</p>
          </Card>
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <PenLine className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Annotations</span>
            </div>
            <p className="text-sm text-slate-700">Add notes for patients or peer review.</p>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}

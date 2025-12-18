import { Link } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanEye, History, Sparkles } from "lucide-react";

export default function PatientDashboard() {
  return (
    <MobileLayout title="Patient Dashboard">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="text-slate-500">Run a new scan or review your history.</p>
        </div>

        <Card className="p-4 flex items-center gap-4 border-slate-200/60 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScanEye className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">New screening</p>
            <p className="font-semibold text-slate-900">Capture retinal image</p>
          </div>
          <Link href="/analysis">
            <Button>Start</Button>
          </Link>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <History className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">History</span>
            </div>
            <p className="text-sm text-slate-700">View prior scans and download reports.</p>
          </Card>
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Explainability</span>
            </div>
            <p className="text-sm text-slate-700">Heatmaps highlight regions used for prediction.</p>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}

import { MobileLayout } from "@/components/mobile-layout";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function PendingDoctor() {
  return (
    <MobileLayout title="Awaiting Approval">
      <div className="p-6 space-y-4">
        <Card className="p-5 space-y-3 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Doctor account pending</h1>
          <p className="text-sm text-slate-600">
            An administrator must verify your license before you can review diagnostic results. You will gain access automatically once approved.
          </p>
        </Card>
      </div>
    </MobileLayout>
  );
}

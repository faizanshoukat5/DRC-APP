import { Link } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  Eye,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronRight,
  ScanEye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getScans } from "@/lib/api";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function HistoryPage() {
  const { data: scans, isLoading } = useQuery({
    queryKey: ["scans"],
    queryFn: getScans,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "severe": return "bg-red-100 text-red-700 border-red-200";
      case "moderate": return "bg-orange-100 text-orange-700 border-orange-200";
      case "mild": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "severe": return <XCircle className="h-4 w-4" />;
      case "moderate": return <AlertTriangle className="h-4 w-4" />;
      case "mild": return <Activity className="h-4 w-4" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "severe": return "Severe DR";
      case "moderate": return "Moderate DR";
      case "mild": return "Mild DR";
      default: return "No DR";
    }
  };

  if (isLoading) {
    return (
      <MobileLayout title="History">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Scan History">
      <div className="p-4 md:p-6 space-y-6 pb-24">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Scan History
          </h1>
          <p className="text-slate-500 text-sm">
            View all your diabetic retinopathy screening results
          </p>
        </div>

        {/* Stats Summary */}
        {scans && scans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{scans.length}</p>
                  <p className="text-xs text-slate-500">Total Scans</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-200/50 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {scans.filter(s => s.severity === "none" || !s.severity).length}
                  </p>
                  <p className="text-xs text-slate-500">Healthy</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Scan List */}
        {scans && scans.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              All Scans
            </h2>
            {scans.map((scan, index) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/results/${scan.id}`}>
                  <Card className="p-4 hover:shadow-md transition-all cursor-pointer border-slate-200/70 hover:border-primary/30">
                    <div className="flex items-center gap-4">
                      {/* Scan Icon */}
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Eye className="h-6 w-6 text-slate-500" />
                      </div>
                      
                      {/* Scan Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            Scan #{scan.id}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getSeverityColor(scan.severity || "none")}`}
                          >
                            {getSeverityIcon(scan.severity || "none")}
                            <span className="ml-1">{getSeverityLabel(scan.severity || "none")}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(scan.timestamp), "MMM d, yyyy")}
                          </span>
                          {scan.confidence && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {Math.round(scan.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-8 text-center border-dashed border-2 border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <ScanEye className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">No Scans Yet</h3>
              <p className="text-sm text-slate-500 mb-4">
                You don't have any scan results yet. Your doctor will upload your fundus images for analysis.
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  );
}

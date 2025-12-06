import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Wifi, Cpu, ChevronRight, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getRecentScans } from "@/lib/api";
import { format } from "date-fns";

export default function HomePage() {
  const [, setLocation] = useLocation();
  
  const { data: recentScans = [], isLoading } = useQuery({
    queryKey: ["scans", "recent"],
    queryFn: () => getRecentScans(3),
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "severe":
        return "text-red-600 bg-red-50 border-red-100";
      case "moderate":
        return "text-amber-600 bg-amber-50 border-amber-100";
      case "mild":
        return "text-emerald-600 bg-emerald-50 border-emerald-100";
      default:
        return "text-slate-600 bg-slate-50 border-slate-100";
    }
  };

  const formatDate = (timestamp: Date) => {
    const now = new Date();
    const scanDate = new Date(timestamp);
    const diffInDays = Math.floor((now.getTime() - scanDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Today, ${format(scanDate, "HH:mm")}`;
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else {
      return format(scanDate, "EEE, MMM d");
    }
  };

  return (
    <MobileLayout title="Dashboard">
      <div className="p-6 space-y-8">
        {/* Hero / Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            Good Morning, <br/> Dr. Anderson
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
              <Wifi className="w-3 h-3" /> Online
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
              <Cpu className="w-3 h-3" /> Hybrid Mode
            </span>
          </div>
        </motion.div>

        {/* Main Action */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card 
            className="p-6 bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-blue-500/25 border-none overflow-hidden relative group cursor-pointer" 
            onClick={() => setLocation("/analysis")}
            data-testid="button-new-diagnosis"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-colors" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">New Diagnosis</h3>
                <p className="text-blue-100 text-sm">Capture or upload fundus image</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Recent Scans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Scans</h3>
            <Button variant="ghost" size="sm" className="text-primary h-auto p-0 hover:bg-transparent font-medium">
              View All
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-12 bg-slate-100 rounded" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan, i) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                >
                  <Card 
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer border-slate-200/60 shadow-sm"
                    onClick={() => setLocation(`/results/${scan.id}`)}
                    data-testid={`card-scan-${scan.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getSeverityStyle(scan.severity)} border`}>
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900" data-testid={`text-patient-${scan.id}`}>{scan.patientId}</p>
                        <p className="text-xs text-slate-500">{formatDate(scan.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${getSeverityStyle(scan.severity).split(' ')[0]}`} data-testid={`text-severity-${scan.id}`}>
                          {scan.severity === 'severe' ? 'High' : scan.severity === 'moderate' ? 'Moderate' : 'Low'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono" data-testid={`text-confidence-${scan.id}`}>CONF: {scan.confidence}%</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
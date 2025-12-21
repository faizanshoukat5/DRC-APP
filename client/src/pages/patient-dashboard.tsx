import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  Eye,
  Download,
  Activity,
  Heart,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ScanEye,
  Stethoscope,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getScans, getMyDoctor } from "@/lib/api";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useEffect } from "react";

export default function PatientDashboard() {
  const [, setLocation] = useLocation();
  
  const { data: myDoctorData, isLoading: loadingDoctor } = useQuery({
    queryKey: ["my-doctor"],
    queryFn: getMyDoctor,
  });

  const { data: scans, isLoading: loadingScans } = useQuery({
    queryKey: ["scans"],
    queryFn: getScans,
    enabled: !!myDoctorData?.doctor, // Only fetch scans if patient has a doctor
  });

  // Redirect to doctor selection if no doctor assigned
  useEffect(() => {
    if (!loadingDoctor && !myDoctorData?.doctor) {
      setLocation("/select-doctor");
    }
  }, [loadingDoctor, myDoctorData, setLocation]);

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

  const latestScan = scans?.[0];
  const totalScans = scans?.length ?? 0;
  const myDoctor = myDoctorData?.doctor;
  const isLoading = loadingDoctor || loadingScans;

  // Show loading while checking doctor status
  if (loadingDoctor) {
    return (
      <MobileLayout title="My Health">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Patient Dashboard">
      <div className="p-4 md:p-6 space-y-6 pb-24">
        {/* Header with greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Patient Dashboard
          </h1>
          <p className="text-slate-500 text-sm">
            Track your diabetic retinopathy screening results
          </p>
        </div>

        {/* Your Doctor Card */}
        {myDoctor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/20 dark:to-slate-800 border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Stethoscope className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Your Doctor</p>
                    <p className="font-semibold text-slate-900 dark:text-white">Dr. {myDoctor.name}</p>
                    {myDoctor.specialty && (
                      <p className="text-xs text-slate-500">{myDoctor.specialty}</p>
                    )}
                  </div>
                </div>
                <Link href="/select-doctor">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    Change
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalScans}</p>
                  <p className="text-xs text-slate-500">Total Reports</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-slate-800 border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {latestScan?.confidence ?? "--"}%
                  </p>
                  <p className="text-xs text-slate-500">Last Confidence</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Latest Result Summary */}
        {latestScan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ScanEye className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Latest Screening</span>
                  </div>
                  <Badge className={`${getSeverityColor(latestScan.severity)} text-xs`}>
                    {getSeverityIcon(latestScan.severity)}
                    <span className="ml-1 capitalize">{latestScan.severity}</span>
                  </Badge>
                </div>
                <h3 className="text-xl font-bold mb-1">{latestScan.diagnosis}</h3>
                <div className="flex items-center gap-4 text-slate-300 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(latestScan.timestamp), "MMM dd, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(latestScan.timestamp), "h:mm a")}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">AI Confidence</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {latestScan.confidence}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${latestScan.confidence}%` }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/results/${latestScan.id}`} className="flex-1">
                    <Button className="w-full gap-2" size="sm">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/results/${latestScan.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Report History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">Report History</h2>
            <Badge variant="secondary" className="text-xs">{totalScans} reports</Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : scans && scans.length > 0 ? (
            <div className="space-y-2">
              {scans.map((scan, index) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-3 hover:shadow-md transition-all border-slate-200/60 hover:border-primary/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        scan.severity === "severe" ? "bg-red-100" :
                        scan.severity === "moderate" ? "bg-orange-100" :
                        scan.severity === "mild" ? "bg-yellow-100" : "bg-emerald-100"
                      }`}>
                        {getSeverityIcon(scan.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                            {scan.diagnosis}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(scan.timestamp), "MMM dd, yyyy")}
                          </span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${getSeverityColor(scan.severity)}`}>
                            {scan.severity}
                          </Badge>
                        </div>
                      </div>
                      <Link href={`/results/${scan.id}`}>
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-full">
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed border-2">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <ScanEye className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No Reports Yet</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Your diabetic retinopathy screening reports will appear here after your doctor uploads them.
              </p>
            </Card>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

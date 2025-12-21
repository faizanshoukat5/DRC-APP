import { MobileLayout } from "@/components/mobile-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  ClipboardList,
  FileText,
  Upload,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  X,
  Users,
  User,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getScans, getMyPatients, type PatientInfo } from "@/lib/api";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DoctorDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["my-patients"],
    queryFn: getMyPatients,
  });

  const { data: scans, isLoading: scansLoading, refetch } = useQuery({
    queryKey: ["scans"],
    queryFn: getScans,
  });

  const recentScans = scans?.slice(0, 5) ?? [];
  const totalPatients = patients?.length ?? 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload(e?: any) {
    e?.preventDefault();
    if (!file) return setUploadResult({ success: false, message: "Please select an image first" });
    if (!selectedPatientId) return setUploadResult({ success: false, message: "Please select a patient first" });
    
    setIsUploading(true);
    setUploadResult(null);

    const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (sessErr || !token) {
      setIsUploading(false);
      return setUploadResult({ success: false, message: "Session expired. Please sign in again." });
    }

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("patientId", selectedPatientId);

      const res = await fetch("/api/doctor/upload", {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        setUploadResult({ success: false, message: text || "Upload failed" });
      } else {
        setUploadResult({ success: true, message: "Analysis complete! Report created." });
        refetch();
        setTimeout(() => {
          clearFile();
          setSelectedPatientId("");
        }, 2000);
      }
    } catch (err: any) {
      setUploadResult({ success: false, message: err.message || "Network error" });
    } finally {
      setIsUploading(false);
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "severe": return "bg-red-100 text-red-700 border-red-200";
      case "moderate": return "bg-orange-100 text-orange-700 border-orange-200";
      case "mild": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPatientName = (patientId: string) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient?.name || "Unknown Patient";
  };

  return (
    <MobileLayout title="Doctor Dashboard">
      <div className="p-4 md:p-6 space-y-6 pb-24">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome, Doctor</h1>
          <p className="text-slate-500 text-sm">Upload fundus images and review patient reports.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-blue-50 dark:from-primary/20 dark:to-slate-800 border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalPatients}</p>
                  <p className="text-xs text-slate-500">My Patients</p>
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
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{scans?.length ?? 0}</p>
                  <p className="text-xs text-slate-500">Total Reports</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* My Patients Section */}
        {totalPatients > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 dark:text-white">My Patients</h2>
              <Badge variant="secondary" className="text-xs">{totalPatients} assigned</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {patients?.map((patient, idx) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{patient.name}</p>
                    <p className="text-xs text-slate-500 truncate">{patient.email}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {format(new Date(patient.assignedAt), "MMM dd")}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Upload Section */}
        <Card className="overflow-hidden border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors">
          <div className="bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-slate-800 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">New Analysis</h2>
                <p className="text-xs text-slate-500">Upload a retinal fundus image for DR detection</p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Patient Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Select Patient <span className="text-red-500">*</span>
                </Label>
                {totalPatients === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                    No patients assigned yet. Patients need to select you as their doctor first.
                  </div>
                ) : (
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <span>{patient.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* File Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer rounded-xl border-2 border-dashed border-slate-300 hover:border-primary bg-white dark:bg-slate-900 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <AnimatePresence mode="wait">
                  {preview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative aspect-video rounded-xl overflow-hidden"
                    >
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); clearFile(); }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-md"
                      >
                        <X className="h-4 w-4 text-slate-700" />
                      </button>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-sm font-medium truncate">{file?.name}</p>
                        <p className="text-white/70 text-xs">{file && (file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-10 px-4"
                    >
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <ImagePlus className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Tap to select image
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Upload Button */}
              <Button
                type="submit"
                disabled={!file || !selectedPatientId || isUploading || totalPatients === 0}
                className="w-full h-11 gap-2 font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-4 w-4" />
                    Run DR Analysis
                  </>
                )}
              </Button>

              {/* Result Message */}
              <AnimatePresence>
                {uploadResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                      uploadResult.success
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {uploadResult.success ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    {uploadResult.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </Card>

        {/* Recent Reports */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Recent Reports
            </h2>
            <Badge variant="secondary" className="text-xs">
              {scans?.length ?? 0} total
            </Badge>
          </div>

          {scansLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : recentScans.length > 0 ? (
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <Card
                  key={scan.id}
                  className="p-3 hover:shadow-md transition-shadow border-slate-200/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {scan.patientId}
                        </p>
                        <Badge className={`text-[10px] px-1.5 py-0 ${getSeverityColor(scan.severity)}`}>
                          {scan.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {format(new Date(scan.timestamp), "MMM dd, yyyy • h:mm a")}
                      </p>
                    </div>
                    <Link href={`/results/${scan.id}`}>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center border-dashed">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No reports yet</p>
              <p className="text-xs text-slate-400">Upload an image to create your first report</p>
            </Card>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

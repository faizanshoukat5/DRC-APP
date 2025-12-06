import { MobileLayout } from "@/components/mobile-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, BrainCircuit, UploadCloud, Smartphone } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createScan } from "@/lib/api";
import { toast } from "sonner";

export default function AnalysisPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const createScanMutation = useMutation({
    mutationFn: createScan,
    onSuccess: (scan) => {
      queryClient.invalidateQueries({ queryKey: ["scans"] });
      setTimeout(() => setLocation(`/results/${scan.id}`), 500);
    },
    onError: () => {
      toast.error("Failed to save scan results");
      setTimeout(() => setLocation("/"), 2000);
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 40);

    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 2500),
      setTimeout(() => setStep(3), 3500),
      setTimeout(() => {
        createScanMutation.mutate({
          patientId: `P-${Math.floor(1000 + Math.random() * 9000)}`,
          originalImageUrl: "/api/placeholder-fundus.jpg",
          heatmapImageUrl: "/api/placeholder-heatmap.jpg",
          diagnosis: "Severe DR",
          severity: "severe",
          confidence: 98,
          modelVersion: "Hybrid CNN-LSTM v2.4",
          inferenceMode: "TFLite (GPU Delegate)",
          inferenceTime: 124,
          preprocessingMethod: "CLAHE + Green Channel",
          metadata: { notes: "Proliferative Diabetic Retinopathy" }
        });
      }, 4500),
    ];

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <MobileLayout title="Analyzing...">
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-12">
        
        <div className="relative w-64 h-64">
          <motion.div 
            className="absolute inset-0 border-4 border-primary/20 rounded-full"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <motion.div 
            className="absolute inset-4 border-4 border-primary/40 rounded-full"
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
          />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="bg-white p-6 rounded-full shadow-xl z-10"
            >
               {step === 0 && <UploadCloud className="w-12 h-12 text-primary" />}
               {step === 1 && <Smartphone className="w-12 h-12 text-purple-500" />}
               {step === 2 && <BrainCircuit className="w-12 h-12 text-emerald-500" />}
               {step === 3 && <CheckCircle2 className="w-12 h-12 text-emerald-600" />}
            </motion.div>
          </div>
        </div>

        <div className="w-full space-y-6">
          <div className="space-y-2 text-center">
             <h3 className="text-xl font-bold text-slate-900">
               {step === 0 && "Preprocessing Image"}
               {step === 1 && "Selecting Inference Mode"}
               {step === 2 && "Running Hybrid CNN-LSTM"}
               {step === 3 && "Generating Grad-CAM"}
             </h3>
             <p className="text-sm text-slate-500">
               {step === 0 && "Enhancing contrast and removing noise..."}
               {step === 1 && "Optimized for TFLite (On-Device)"}
               {step === 2 && "Analyzing spatial & temporal features..."}
               {step === 3 && "Creating explainability heatmap..."}
             </p>
          </div>

          <Progress value={progress} className="h-2" data-testid="progress-analysis" />
        </div>
      </div>
    </MobileLayout>
  );
}
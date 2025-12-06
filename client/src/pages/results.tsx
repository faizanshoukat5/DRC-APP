import { MobileLayout } from "@/components/mobile-layout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Share2, Download, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getScan } from "@/lib/api";
import { useRoute } from "wouter";
import { format } from "date-fns";

import baseImage from '@assets/generated_images/high-quality_retinal_fundus_image_for_medical_analysis..png';
import heatmapImage from '@assets/generated_images/retinal_fundus_image_with_grad-cam_heatmap_overlay..png';

export default function ResultsPage() {
  const [, params] = useRoute("/results/:id");
  const scanId = params?.id ? parseInt(params.id) : undefined;
  
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const { data: scan, isLoading } = useQuery({
    queryKey: ["scan", scanId],
    queryFn: () => getScan(scanId!),
    enabled: !!scanId,
  });

  if (isLoading || !scan) {
    return (
      <MobileLayout title="Loading..." showBack>
        <div className="h-full flex items-center justify-center">
          <div className="animate-pulse text-slate-400">Loading scan results...</div>
        </div>
      </MobileLayout>
    );
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "severe": return "Severe";
      case "moderate": return "Moderate";
      case "mild": return "Mild";
      default: return severity;
    }
  };

  return (
    <MobileLayout title="Analysis Results" showBack>
      <div className="flex flex-col min-h-full pb-24">
        
        {/* Image Section */}
        <div className="relative aspect-square w-full bg-black overflow-hidden group">
           <img 
             src={baseImage} 
             alt="Fundus Original" 
             className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
             data-testid="img-fundus-original"
           />
           <motion.img 
             src={heatmapImage} 
             alt="Fundus Heatmap" 
             className="absolute inset-0 w-full h-full object-cover"
             initial={{ opacity: 0 }}
             animate={{ opacity: showHeatmap ? 0.8 : 0 }}
             transition={{ duration: 0.5 }}
             data-testid="img-fundus-heatmap"
           />

           {/* Floating Toggle */}
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
             <Label htmlFor="heatmap-mode" className="text-white text-xs font-medium">Grad-CAM</Label>
             <Switch 
               id="heatmap-mode" 
               checked={showHeatmap} 
               onCheckedChange={setShowHeatmap}
               className="data-[state=checked]:bg-primary"
               data-testid="switch-heatmap"
             />
           </div>
        </div>

        {/* Diagnosis Card */}
        <div className="flex-1 -mt-6 relative z-10 px-4 space-y-4">
          <Card className="p-6 shadow-xl border-slate-100 bg-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                 <Badge variant="outline" className="mb-2 text-xs border-slate-200 text-slate-500" data-testid="badge-scan-info">
                   ID: {scan.patientId} • {format(new Date(scan.timestamp), "MMM d, HH:mm")}
                 </Badge>
                 <h2 className="text-2xl font-bold text-slate-900" data-testid="text-diagnosis">{scan.diagnosis}</h2>
                 <p className="text-slate-500 text-sm">
                   {scan.severity === 'severe' ? 'Proliferative Diabetic Retinopathy' : 
                    scan.severity === 'moderate' ? 'Non-proliferative DR' : 
                    'Early stage detection'}
                 </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-primary" data-testid="text-confidence-score">{scan.confidence}%</div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Confidence</div>
              </div>
            </div>

            {/* Severity Scale */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-medium text-slate-400">
                <span>Mild</span>
                <span>Moderate</span>
                <span className={scan.severity === 'severe' ? 'text-destructive font-bold' : ''}>Severe</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="w-1/3 bg-emerald-400/30" />
                <div className="w-1/3 bg-amber-400/30" />
                <div className="w-1/3 bg-destructive relative">
                  {scan.severity === 'severe' && (
                    <motion.div 
                      className="absolute right-2 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full gap-2 text-xs" data-testid="button-save-report">
                <Download className="w-4 h-4" /> Save Report
              </Button>
              <Button className="w-full gap-2 text-xs" data-testid="button-share">
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
          </Card>

          {/* Technical Details */}
          <div className="px-2">
             <Button 
               variant="ghost" 
               className="w-full flex justify-between text-slate-400 hover:text-slate-600"
               onClick={() => setShowDetails(!showDetails)}
               data-testid="button-technical-details"
             >
               <span className="flex items-center gap-2 text-xs font-medium"><Info className="w-4 h-4"/> Technical Analysis</span>
               <ChevronUp className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
             </Button>
             
             <AnimatePresence>
               {showDetails && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="overflow-hidden"
                 >
                   <div className="pt-2 pb-4 text-xs space-y-2 text-slate-500 font-mono bg-slate-50 p-4 rounded-lg mt-2 border border-slate-100" data-testid="section-technical-details">
                     <div className="flex justify-between">
                       <span>Model:</span>
                       <span className="text-slate-900">{scan.modelVersion}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Inference:</span>
                       <span className="text-slate-900">{scan.inferenceMode}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Pre-processing:</span>
                       <span className="text-slate-900">{scan.preprocessingMethod}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Inference Time:</span>
                       <span className="text-slate-900">{scan.inferenceTime}ms</span>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
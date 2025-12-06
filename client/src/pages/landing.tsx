import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanEye, Shield, Zap, Database } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <MobileLayout title="RetinaAI">
      <div className="min-h-full flex flex-col items-center justify-center p-6 space-y-8">
        
        {/* Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <ScanEye className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            RetinaAI
          </h1>
          <p className="text-slate-500 max-w-sm mx-auto">
            Fast, clinically meaningful Diabetic Retinopathy detection using deep learning
          </p>
        </motion.div>

        {/* Features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full space-y-3"
        >
          <Card className="p-4 flex items-center gap-4 border-slate-200/60 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Hybrid AI Analysis</h3>
              <p className="text-sm text-slate-500">On-device and cloud processing</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border-slate-200/60 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Explainable Results</h3>
              <p className="text-sm text-slate-500">Grad-CAM visualization included</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border-slate-200/60 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Cloud Sync</h3>
              <p className="text-sm text-slate-500">Access history anywhere</p>
            </div>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full pt-4"
        >
          <Button 
            className="w-full h-12 text-base font-medium"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
          <p className="text-center text-xs text-slate-400 mt-4">
            Secure authentication powered by your account
          </p>
        </motion.div>

      </div>
    </MobileLayout>
  );
}

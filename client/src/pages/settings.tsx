import { MobileLayout } from "@/components/mobile-layout";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Cloud, Smartphone, Wifi, Shield, Database, Moon } from "lucide-react";

export default function SettingsPage() {
  return (
    <MobileLayout title="Settings">
      <div className="p-6 space-y-8">
        
        {/* Inference Preferences */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Inference Engine</h3>
          <Card className="divide-y divide-slate-100 border-slate-200 shadow-sm">
            <div className="p-4 flex items-center justify-between">
               <div className="space-y-1">
                 <Label className="text-base font-medium">Preferred Mode</Label>
                 <p className="text-xs text-slate-500">Choose how images are analyzed</p>
               </div>
               <Select defaultValue="auto">
                 <SelectTrigger className="w-[140px]">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="auto">Auto (Hybrid)</SelectItem>
                   <SelectItem value="local">On-Device Only</SelectItem>
                   <SelectItem value="cloud">Cloud Only</SelectItem>
                 </SelectContent>
               </Select>
            </div>
            
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                   <Smartphone className="w-4 h-4" />
                 </div>
                 <div className="space-y-0.5">
                   <Label className="text-sm font-medium">TFLite Acceleration</Label>
                   <p className="text-[10px] text-slate-500">Use GPU Delegate when available</p>
                 </div>
               </div>
               <Switch defaultChecked />
            </div>
          </Card>
        </section>

        {/* Data & Sync */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Data & Sync</h3>
          <Card className="divide-y divide-slate-100 border-slate-200 shadow-sm">
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                   <Cloud className="w-4 h-4" />
                 </div>
                 <div className="space-y-0.5">
                   <Label className="text-sm font-medium">Cloud Sync</Label>
                   <p className="text-[10px] text-slate-500">Backup results when online</p>
                 </div>
               </div>
               <Switch defaultChecked />
            </div>

            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                   <Wifi className="w-4 h-4" />
                 </div>
                 <div className="space-y-0.5">
                   <Label className="text-sm font-medium">Sync on WiFi Only</Label>
                 </div>
               </div>
               <Switch defaultChecked />
            </div>
          </Card>
        </section>

        {/* System */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">System</h3>
          <Card className="divide-y divide-slate-100 border-slate-200 shadow-sm">
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                   <Moon className="w-4 h-4" />
                 </div>
                 <div className="space-y-0.5">
                   <Label className="text-sm font-medium">Dark Mode</Label>
                 </div>
               </div>
               <Switch />
            </div>
          </Card>
        </section>

        <div className="text-center text-xs text-slate-400 pt-8">
          <p>RetinaAI v1.0.4 (Build 2024.12.06)</p>
          <p>Model ID: CNN-LSTM-774</p>
        </div>

      </div>
    </MobileLayout>
  );
}
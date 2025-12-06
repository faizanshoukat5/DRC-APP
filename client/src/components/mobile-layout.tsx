import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, History, Settings, ScanEye, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

export function MobileLayout({ children, title, showBack }: MobileLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-0 md:p-4 font-sans">
      <div className="w-full max-w-md h-[100dvh] md:h-[850px] bg-background md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-border/50">
        
        {/* Header */}
        <header className="h-16 px-6 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b z-20 sticky top-0">
          <div className="flex items-center gap-3">
            {showBack ? (
             <Link href="/" className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
             </Link>
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ScanEye className="w-5 h-5 text-white" />
              </div>
            )}
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              {title || "RetinaAI"}
            </h1>
          </div>
          <button className="p-2 -mr-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide bg-slate-50 dark:bg-slate-950 relative">
          {children}
        </main>

        {/* Bottom Navigation */}
        {!location.includes("/analysis") && (
          <nav className="h-20 bg-white dark:bg-slate-950 border-t flex items-center justify-around px-2 pb-2 z-20">
            <Link href="/" className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 w-20 cursor-pointer",
                location === "/" ? "text-primary bg-primary/5" : "text-slate-400 hover:text-slate-600"
              )}>
                <Home className={cn("w-6 h-6", location === "/" && "fill-current")} />
                <span className="text-[10px] font-medium">Home</span>
            </Link>
            
            <Link href="/results" className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 w-20 cursor-pointer",
                location.includes("/results") ? "text-primary bg-primary/5" : "text-slate-400 hover:text-slate-600"
              )}>
                <History className={cn("w-6 h-6", location.includes("/results") && "fill-current")} />
                <span className="text-[10px] font-medium">History</span>
            </Link>

            <Link href="/settings" className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 w-20 cursor-pointer",
                location === "/settings" ? "text-primary bg-primary/5" : "text-slate-400 hover:text-slate-600"
              )}>
                <Settings className={cn("w-6 h-6", location === "/settings" && "fill-current")} />
                <span className="text-[10px] font-medium">Settings</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
import { MobileLayout } from "@/components/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <MobileLayout title="Error 404" showBack>
      <div className="h-full flex items-center justify-center p-6">
        <Card className="w-full border-none shadow-none bg-transparent">
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
               <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Page Not Found</h1>
            <p className="text-sm text-slate-500 max-w-xs">
              The screen you are looking for doesn't exist or has been moved.
            </p>
            
            <Link href="/">
              <Button className="mt-4 gap-2">
                <Home className="w-4 h-4" />
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
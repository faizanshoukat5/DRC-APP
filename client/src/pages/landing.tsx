import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ScanEye, Shield, Zap, Database } from "lucide-react";

import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const { signInWithPassword, signUpWithPassword, isLoading, lastError } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    try {
      if (mode === "signin") {
        await signInWithPassword(formState.email, formState.password);
      } else {
        await signUpWithPassword(formState.email, formState.password, {
          firstName: formState.firstName,
          lastName: formState.lastName,
        });
        setFeedback("Account created. Please check your inbox to confirm your email if required.");
      }
    } catch (error) {
      console.error("Authentication error", error);
    }
  };

  const isSubmitDisabled =
    !formState.email ||
    !formState.password ||
    (mode === "signup" && (!formState.firstName || !formState.lastName));

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

        {/* Auth Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </div>

          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={formState.firstName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, firstName: event.target.value }))}
                  placeholder="Ada"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={formState.lastName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
                  placeholder="Lovelace"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={formState.password}
              onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>

          {(lastError || feedback) && (
            <p className="text-sm text-center text-red-500 min-h-[1.5rem]">
              {lastError || feedback}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            disabled={isLoading || isSubmitDisabled}
          >
            {isLoading ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full text-center"
        >
          <p className="text-sm text-slate-500">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign in instead
                </button>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </MobileLayout>
  );
}

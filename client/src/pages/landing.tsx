import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ScanEye, Shield, Zap, Database, Stethoscope, UserRound, Building2 } from "lucide-react";

import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { signInWithPassword, signUpWithPassword, isLoading, lastError } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    licenseNumber: "",
    specialty: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    try {
      if (mode === "signin") {
        await signInWithPassword(formState.email, formState.password);
      } else {
        await signUpWithPassword({
          email: formState.email,
          password: formState.password,
          role,
          name: formState.name,
          phone: formState.phone || undefined,
          dateOfBirth: formState.dateOfBirth || undefined,
          gender: formState.gender || undefined,
          address: formState.address || undefined,
          licenseNumber: role === "doctor" ? formState.licenseNumber : undefined,
          specialty: role === "doctor" ? formState.specialty : undefined,
        });
        setFeedback(role === "doctor" ? "Doctor account created. Await admin approval." : "Account created. You are signed in.");
      }
    } catch (error) {
      console.error("Authentication error", error);
    }
  };

  const isSubmitDisabled =
    !formState.email ||
    !formState.password ||
    (mode === "signup" && (!formState.name || (role === "doctor" && (!formState.licenseNumber || !formState.specialty))));

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
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Dr. Ada Lovelace"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: "patient", label: "Patient", icon: UserRound }, { value: "doctor", label: "Doctor", icon: Stethoscope }].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value as "patient" | "doctor")}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-left transition",
                        role === option.value ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50",
                      )}
                    >
                      <option.icon className="h-4 w-4" />
                      <span className="text-sm font-medium capitalize">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formState.phone}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+1 555 123 4567"
                />
              </div>

              {role === "patient" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formState.dateOfBirth}
                        onChange={(event) => setFormState((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Input
                        id="gender"
                        value={formState.gender}
                        onChange={(event) => setFormState((prev) => ({ ...prev, gender: event.target.value }))}
                        placeholder="F / M / Other"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formState.address}
                      onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="123 Retina Lane"
                    />
                  </div>
                </div>
              )}

              {role === "doctor" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="license">License number</Label>
                    <Input
                      id="license"
                      value={formState.licenseNumber}
                      onChange={(event) => setFormState((prev) => ({ ...prev, licenseNumber: event.target.value }))}
                      placeholder="MED-12345"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={formState.specialty}
                      onChange={(event) => setFormState((prev) => ({ ...prev, specialty: event.target.value }))}
                      placeholder="Ophthalmology"
                      required
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 text-xs text-slate-500 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Doctor accounts require admin approval before accessing diagnostics.
                  </div>
                </div>
              )}
            </>
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
            <p className={cn("text-sm text-center min-h-[1.5rem]", lastError ? "text-red-500" : "text-emerald-600") }>
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

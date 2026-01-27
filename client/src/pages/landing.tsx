import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ScanEye, Shield, Zap, Database, Stethoscope, UserRound, Building2, HelpCircle } from "lucide-react";

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
      <div className="min-h-full p-5 space-y-6 bg-slate-50">
        <div className="space-y-6">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ScanEye className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-500">RetinaAI</p>
                <h1 className="text-2xl font-bold text-slate-900">Diabetic Retinopathy, detected in seconds.</h1>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload fundus images captured in-clinic or on your fundus camera; our ML model returns DR severity, confidence, and explainable heatmaps—every report stays synced for patients and doctors.
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { label: "Outputs", value: "DR grade + heatmaps" },
                { label: "Turnaround", value: "< 45 sec" },
                { label: "Input", value: "Fundus uploads" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-100 text-slate-800 border border-slate-200 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 gap-3"
          >
            {[{
              icon: Zap,
              title: "Upload → AI",
              desc: "You upload fundus images; our ML model returns DR severity, confidence, and heatmaps.",
              tone: "bg-amber-50 text-amber-700 border-amber-100",
            }, {
              icon: Shield,
              title: "Clinician-first",
              desc: "Explainable outputs doctors can trust, with clear severity and confidence.",
              tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
            }, {
              icon: Database,
              title: "Always synced",
              desc: "Secure storage for images and reports, accessible by patients and assigned doctors.",
              tone: "bg-sky-50 text-sky-700 border-sky-100",
            }].map((item) => (
              <Card
                key={item.title}
                className={cn("p-4 flex items-start gap-3 border shadow-sm", item.tone)}
              >
                <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center border">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-700 leading-snug">{item.desc}</p>
                </div>
              </Card>
            ))}
          </motion.div>

          {/* Flows */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 gap-3"
          >
            <Card className="p-4 border-slate-200/70 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserRound className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">For patients</p>
                  <p className="font-semibold text-slate-900">Simple, guided flow</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                <li>Create an account and pick your approved doctor.</li>
                <li>Upload or view fundus reports shared by your doctor.</li>
                <li>Track severity, AI confidence, and download PDFs anytime.</li>
              </ol>
            </Card>

            <Card className="p-4 border-slate-200/70 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <Stethoscope className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">For doctors</p>
                  <p className="font-semibold text-slate-900">Built for clinics</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                <li>Get approved, then see only your assigned patients.</li>
                <li>Upload fundus images; the model returns DR severity/confidence with heatmaps, then auto-generate reports.</li>
                <li>Share results instantly; patients get notified and can download.</li>
              </ol>
            </Card>
          </motion.div>
        </div>

        {/* Auth Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full space-y-4 rounded-3xl bg-white border border-slate-200 shadow-lg shadow-slate-200/40 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Access</p>
              <h2 className="text-xl font-semibold text-slate-900">{mode === "signin" ? "Sign in" : "Create account"}</h2>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
              {["signin", "signup"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m as "signin" | "signup")}
                  className={cn(
                    "px-3 py-1 rounded-full transition",
                    mode === m ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:bg-white"
                  )}
                >
                  {m === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>
          </div>

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
            <p className={cn("text-sm text-center min-h-6", lastError ? "text-red-500" : "text-emerald-600") }>
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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

        {/* FAQ Link */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full"
        >
          <Link
            href="/faq"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Have questions? Check our FAQ</span>
          </Link>
        </motion.div>
      </div>
    </MobileLayout>
  );
}

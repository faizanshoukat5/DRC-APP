import { useState } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Stethoscope,
  Search,
  CheckCircle2,
  User,
  Mail,
  Award,
  Loader2,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApprovedDoctors, selectDoctor, getMyDoctor, type ApprovedDoctor } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function SelectDoctor() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: doctors, isLoading: loadingDoctors } = useQuery({
    queryKey: ["approved-doctors"],
    queryFn: getApprovedDoctors,
  });

  const { data: myDoctorData, isLoading: loadingMyDoctor } = useQuery({
    queryKey: ["my-doctor"],
    queryFn: getMyDoctor,
  });

  const selectDoctorMutation = useMutation({
    mutationFn: selectDoctor,
    onSuccess: (data) => {
      toast.success(`Successfully assigned to Dr. ${data.doctor.name}`);
      queryClient.invalidateQueries({ queryKey: ["my-doctor"] });
      setTimeout(() => {
        setLocation("/patient");
      }, 1500);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to select doctor");
    },
  });

  const filteredDoctors = doctors?.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDoctor = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
  };

  const handleConfirmSelection = () => {
    if (selectedDoctorId) {
      selectDoctorMutation.mutate(selectedDoctorId);
    }
  };

  const myDoctor = myDoctorData?.doctor;
  const isLoading = loadingDoctors || loadingMyDoctor;

  // If patient already has a doctor, show their info
  if (myDoctor && !selectDoctorMutation.isPending) {
    return (
      <MobileLayout title="Your Doctor">
        <div className="p-4 md:p-6 space-y-6 pb-24">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Your Assigned Doctor
            </h1>
            <p className="text-slate-500 text-sm">
              You are currently assigned to the following doctor
            </p>
          </div>

          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Stethoscope className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Dr. {myDoctor.name}</h2>
                  {myDoctor.specialty && (
                    <p className="text-white/80 text-sm">{myDoctor.specialty}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">{myDoctor.email}</span>
              </div>
              {myDoctor.license_number && (
                <div className="flex items-center gap-3 text-sm">
                  <Award className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">
                    License: {myDoctor.license_number}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={() => setLocation("/patient")}
              className="w-full gap-2"
              size="lg"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => queryClient.setQueryData<{ doctor: ApprovedDoctor | null }>(["my-doctor"], { doctor: null })}
              className="w-full"
            >
              Change Doctor
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Select Doctor">
      <div className="p-4 md:p-6 space-y-6 pb-24">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Choose Your Doctor
          </h1>
          <p className="text-slate-500 text-sm">
            Select a doctor to manage your diabetic retinopathy screenings
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected Doctor Confirmation */}
        <AnimatePresence>
          {selectedDoctorId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        Dr. {doctors?.find((d) => d.id === selectedDoctorId)?.name}
                      </p>
                      <p className="text-xs text-slate-500">Selected</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleConfirmSelection}
                    disabled={selectDoctorMutation.isPending}
                    className="gap-2"
                  >
                    {selectDoctorMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Confirm
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Doctor List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredDoctors && filteredDoctors.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Available Doctors
              </h2>
              <Badge variant="secondary" className="text-xs">
                {filteredDoctors.length} doctors
              </Badge>
            </div>

            <div className="space-y-2">
              {filteredDoctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedDoctorId === doctor.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:border-primary/30"
                    }`}
                    onClick={() => handleSelectDoctor(doctor.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          selectedDoctorId === doctor.id
                            ? "bg-primary text-white"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            Dr. {doctor.name}
                          </p>
                          {selectedDoctorId === doctor.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {doctor.specialty && (
                            <Badge variant="secondary" className="text-xs">
                              {doctor.specialty}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500 truncate">
                            {doctor.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed border-2">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
              No Doctors Available
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              {searchQuery
                ? "No doctors match your search. Try a different term."
                : "No approved doctors are available at the moment. Please check back later."}
            </p>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}

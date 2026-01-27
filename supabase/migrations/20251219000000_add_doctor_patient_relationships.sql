-- Create doctor_patients relationship table
CREATE TABLE IF NOT EXISTS doctor_patients (
  id SERIAL PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, patient_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctor_patients_doctor ON doctor_patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_patient ON doctor_patients(patient_id);

-- Enable RLS
ALTER TABLE doctor_patients ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read their own relationships
DROP POLICY IF EXISTS "Users can view their own relationships" ON public.doctor_patients;
CREATE POLICY "Users can view their own relationships" ON doctor_patients
  FOR SELECT USING (
    auth.uid() = doctor_id OR auth.uid() = patient_id
  );

-- Policy: Allow patients to insert (select a doctor)
DROP POLICY IF EXISTS "Patients can select doctors" ON public.doctor_patients;
CREATE POLICY "Patients can select doctors" ON doctor_patients
  FOR INSERT WITH CHECK (
    auth.uid() = patient_id
  );

-- Policy: Allow users to delete their own relationships
DROP POLICY IF EXISTS "Users can delete their own relationships" ON public.doctor_patients;
CREATE POLICY "Users can delete their own relationships" ON doctor_patients
  FOR DELETE USING (
    auth.uid() = patient_id
  );

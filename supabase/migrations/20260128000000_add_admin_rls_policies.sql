/*
  # Add admin RLS policies for profiles table
  
  Allows admin users to view and manage all profiles.
  This is required for the admin dashboard to show pending doctors.
  
  1. Security
    - Admins can SELECT all profiles (to view pending doctors)
    - Admins can UPDATE all profiles (to approve/reject doctors)
*/

-- Helper function to check if user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (is_admin());

-- Allow admins to update all profiles (for approve/reject)
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (is_admin());


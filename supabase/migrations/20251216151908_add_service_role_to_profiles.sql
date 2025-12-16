/*
  # Add service role access to profiles table
  
  Adds a policy allowing the service role to have full access to the profiles table.
  This is required for the sign-up flow where the backend creates profile records
  after a user is authenticated.
  
  1. Security
    - Add policy for service_role to have full access to profiles
    - Allows sign-up flow to create and manage user profiles
*/

CREATE POLICY "Service role full access" ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

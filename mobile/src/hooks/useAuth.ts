import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'patient' | 'doctor' | 'admin';
export type DoctorStatus = 'pending' | 'approved' | 'rejected';

export type AuthProfile = {
  id: string;
  email: string;
  role: UserRole;
  status: DoctorStatus;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  licenseNumber?: string;
  specialty?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SignUpPayload = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  licenseNumber?: string;
  specialty?: string;
  role: Exclude<UserRole, 'admin'>;
};

type AuthState = {
  user: AuthProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastError: string | null;
  role: UserRole | null;
  doctorStatus: DoctorStatus | null;
};

async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) throw new Error(error.message);
  if (!data) return null;
  
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    status: data.status,
    name: data.name,
    phone: data.phone ?? undefined,
    dateOfBirth: data.date_of_birth ?? undefined,
    gender: data.gender ?? undefined,
    address: data.address ?? undefined,
    licenseNumber: data.license_number ?? undefined,
    specialty: data.specialty ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInitialUser = async () => {
      setIsLoading(true);
      setLastError(null);
      
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (error) {
          // If refresh token is invalid, clear the session
          if (error.message.includes('Refresh Token') || error.message.includes('Invalid token')) {
            await supabase.auth.signOut();
          }
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (!data.user) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (profileError: any) {
        if (!isMounted) return;
        setLastError(profileError.message ?? 'Failed to load profile');
        setUser(null);
      }
      setIsLoading(false);
    };

    loadInitialUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (profileError: any) {
        if (!isMounted) return;
        setLastError(profileError.message ?? 'Failed to load profile');
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setLastError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsLoading(false);
      setLastError(error.message);
      throw error;
    }

    try {
      const profile = await fetchProfile(data.user?.id || '');
      if (profile) {
        setUser(profile);
      }
    } catch (profileError: any) {
      setLastError(profileError.message ?? 'Failed to load profile');
      setIsLoading(false);
      throw profileError;
    }

    setIsLoading(false);
    return data;
  }, []);

  const signUpWithPassword = useCallback(async (payload: SignUpPayload) => {
    const { email, password, role, ...profileData } = payload;
    setIsLoading(true);
    setLastError(null);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setIsLoading(false);
      setLastError(error.message);
      throw error;
    }

    if (!data.user) {
      setIsLoading(false);
      throw new Error('Sign-up succeeded but no user was returned.');
    }

    // Create profile
    const status = role === 'doctor' ? 'pending' : 'approved';
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      role,
      status,
      name: profileData.name,
      phone: profileData.phone ?? null,
      date_of_birth: profileData.dateOfBirth ?? null,
      gender: profileData.gender ?? null,
      address: profileData.address ?? null,
      license_number: profileData.licenseNumber ?? null,
      specialty: profileData.specialty ?? null,
    });

    if (profileError) {
      setIsLoading(false);
      setLastError(profileError.message);
      throw new Error(profileError.message);
    }

    try {
      const profile = await fetchProfile(data.user.id);
      if (profile) {
        setUser(profile);
      }
    } catch (e: any) {
      setLastError(e.message ?? 'Failed to load profile');
    }

    setIsLoading(false);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLastError(error.message);
      setIsLoading(false);
      throw error;
    }
    setUser(null);
    setIsLoading(false);
  }, []);

  const state: AuthState = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    lastError,
    role: user?.role ?? null,
    doctorStatus: user?.status ?? null,
  }), [user, isLoading, lastError]);

  return {
    ...state,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  };
}

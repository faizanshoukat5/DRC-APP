import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { DoctorStatus, Profile, UserRole } from "@shared/schema";

export type AuthProfile = Profile & {
  profileImageUrl?: string;
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
  role: Exclude<UserRole, "admin">;
};

type AuthState = {
  user: AuthProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastError: string | null;
  role: UserRole | null;
  doctorStatus: DoctorStatus | null;
};

function mapAuthUser(user: User | null): { id: string; email?: string; metadata: Record<string, any> } | null {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? undefined,
    metadata,
  };
}

async function fetchProfile(): Promise<AuthProfile | null> {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
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
  } as AuthProfile;
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
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error) {
        setLastError(error.message);
        setUser(null);
      } else {
        try {
          const profile = await fetchProfile();
          const authUser = mapAuthUser(data.user ?? null);
          if (profile && authUser) {
            setUser({ ...profile, email: profile.email ?? authUser.email, profileImageUrl: authUser.metadata?.avatar_url });
          } else {
            setUser(null);
          }
        } catch (profileError: any) {
          setLastError(profileError.message ?? "Failed to load profile");
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    loadInitialUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await fetchProfile();
        const authUser = mapAuthUser(session.user);
        if (profile && authUser) {
          setUser({ ...profile, email: profile.email ?? authUser.email, profileImageUrl: authUser.metadata?.avatar_url });
        } else {
          setUser(null);
        }
      } catch (profileError: any) {
        setLastError(profileError.message ?? "Failed to load profile");
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
      const profile = await fetchProfile();
      const authUser = mapAuthUser(data.user);
      if (profile && authUser) {
        setUser({ ...profile, email: profile.email ?? authUser.email, profileImageUrl: authUser.metadata?.avatar_url });
      } else {
        setUser(null);
      }
    } catch (profileError: any) {
      setLastError(profileError.message ?? "Failed to load profile");
      setUser(null);
      setIsLoading(false);
      throw profileError;
    }

    setIsLoading(false);
    return data;
  }, []);

  const signUpWithPassword = useCallback(
    async (payload: SignUpPayload) => {
      const { email, password, role, ...profileData } = payload;
      setIsLoading(true);
      setLastError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        setLastError(error.message);
        throw error;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setIsLoading(false);
        throw new Error("Sign-up succeeded but no session was returned. Please verify your email and try again.");
      }

      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          role,
          email,
          name: profileData.name,
          phone: profileData.phone,
          dateOfBirth: profileData.dateOfBirth,
          gender: profileData.gender,
          address: profileData.address,
          licenseNumber: profileData.licenseNumber,
          specialty: profileData.specialty,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        setIsLoading(false);
        throw new Error(message || "Failed to create profile");
      }

      try {
        const profile = await fetchProfile();
        const authUser = mapAuthUser(data.user);
        if (profile && authUser) {
          setUser({ ...profile, email: profile.email ?? authUser.email, profileImageUrl: authUser.metadata?.avatar_url });
        } else {
          setUser(null);
        }
      } catch (profileError: any) {
        setLastError(profileError.message ?? "Failed to load profile");
        setUser(null);
        setIsLoading(false);
        throw profileError;
      }

      setIsLoading(false);
      return data;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLastError(error.message);
      throw error;
    }
    setUser(null);
  }, []);

  const state: AuthState = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      lastError,
      role: user?.role ?? null,
      doctorStatus: user?.status ?? null,
    }),
    [user, isLoading, lastError],
  );

  return {
    ...state,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  };
}

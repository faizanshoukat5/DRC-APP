import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type UserProfile = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
};

function mapUser(user: User | null): UserProfile | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? undefined,
    firstName: metadata.firstName ?? metadata.first_name ?? undefined,
    lastName: metadata.lastName ?? metadata.last_name ?? undefined,
    profileImageUrl: metadata.avatarUrl ?? metadata.avatar_url ?? undefined,
  };
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
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
        setUser(mapUser(data.user ?? null));
      }
      setIsLoading(false);
    };

    loadInitialUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(mapUser(session?.user ?? null));
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
    setIsLoading(false);

    if (error) {
      setLastError(error.message);
      throw error;
    }

    setUser(mapUser(data.user));
    return data;
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string, metadata?: Record<string, string>) => {
    setIsLoading(true);
    setLastError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    setIsLoading(false);

    if (error) {
      setLastError(error.message);
      throw error;
    }

    setUser(mapUser(data.user));
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLastError(error.message);
      throw error;
    }
    setUser(null);
  }, []);

  const state = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      lastError,
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

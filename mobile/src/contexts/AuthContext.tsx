import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthProfile, SignUpPayload, UserRole, DoctorStatus } from '../hooks/useAuth';

type AuthContextValue = {
  user: AuthProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastError: string | null;
  role: UserRole | null;
  doctorStatus: DoctorStatus | null;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signUpWithPassword: (payload: SignUpPayload) => Promise<any>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

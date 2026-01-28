import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Add storage event handling for better cross-tab/cross-device session sync
    storageKey: 'supabase.auth.token',
  },
});

// Add a global error handler for auth errors
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('Token refresh failed, clearing session');
    supabase.auth.signOut();
  }
  if (event === 'SIGNED_OUT') {
    console.log('User signed out, clearing storage');
    AsyncStorage.removeItem('supabase.auth.token');
  }
});

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isMock: boolean;
  signUpMock: (email: string, password: string) => Promise<void>;
  signInMock: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isMock: true,
  signUpMock: async () => {},
  signInMock: async () => {},
  signInWithGoogle: async () => {},
});

export const isSupabaseConfigured = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://example.com' &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Minimal password hashing for mock mode (no server-side bcrypt available) ───
// Uses SubtleCrypto (available in all modern browsers) to SHA-256 hash the
// password before storing. This is NOT production-grade but is far safer than
// storing plain text.
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // 1. Check existing session immediately
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          setIsMock(false);
        })
        .catch((err) => {
          console.warn('Supabase auth session retrieval failed, falling back to mock:', err);
          setIsMock(true);
          loadMockSession();
        })
        .finally(() => {
          setLoading(false);
        });

      // 2. Subscribe to auth state changes (handles OAuth redirects, token refresh, etc.)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsMock(false);
        setLoading(false); // ensure loading is cleared on any auth event
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      loadMockSession();
      setLoading(false);
    }
  }, []);

  const loadMockSession = () => {
    const storedUser = localStorage.getItem('foundry_mock_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setSession({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: parsedUser,
        } as Session);
      } catch (e) {
        localStorage.removeItem('foundry_mock_user');
      }
    }
  };

  const signUpMock = async (email: string, password: string) => {
    if (!email || !password) throw new Error('Email and password are required.');
    const mockUsers = JSON.parse(localStorage.getItem('foundry_mock_users') || '[]');
    if (mockUsers.some((u: any) => u.email === email)) {
      throw new Error('An account with this email already exists.');
    }
    // Hash password before storing — never store plain text
    const hashedPassword = await hashPassword(password);
    const newUser = {
      email,
      password: hashedPassword, // stored as SHA-256 hash, not plain text
      id: 'mock-user-id-' + crypto.randomUUID().split('-')[0],
    };
    mockUsers.push(newUser);
    localStorage.setItem('foundry_mock_users', JSON.stringify(mockUsers));
  };

  const signInMock = async (email: string, password: string) => {
    if (!email || !password) throw new Error('Email and password are required.');
    const mockUsers = JSON.parse(localStorage.getItem('foundry_mock_users') || '[]');

    // Hash the incoming password to compare with stored hash
    const hashedPassword = await hashPassword(password);
    const existingUser = mockUsers.find((u: any) => u.email === email && u.password === hashedPassword);

    if (!existingUser) {
      throw new Error('Invalid email or password. Please check your credentials and try again.');
    }

    const mockUser = {
      id: existingUser.id,
      email: existingUser.email,
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      role: 'authenticated',
    } as User;

    localStorage.setItem('foundry_mock_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setSession({
      access_token: 'mock-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    } as Session);
  };

  const signInWithGoogle = async () => {
    // If Supabase is not configured at all, give a clear setup guide
    if (!isSupabaseConfigured) {
      throw new Error(
        'Google Sign-In requires Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env, then enable Google OAuth in your Supabase dashboard under Authentication → Providers.'
      );
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isMock) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Supabase signOut failed:', err);
    } finally {
      localStorage.removeItem('foundry_mock_user');
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, isMock, signUpMock, signInMock, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

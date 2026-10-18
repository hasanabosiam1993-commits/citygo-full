import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Captain, AuthScreen } from '@/types';

interface AuthContextValue {
  session: Session | null;
  captain: Captain | null;
  isAdmin: boolean;
  screen: AuthScreen;
  navigate: (screen: AuthScreen) => void;
  signOut: () => Promise<void>;
  refreshCaptain: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [captain, setCaptain] = useState<Captain | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [screen, setScreen] = useState<AuthScreen>('loading');
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchCaptain = useCallback(async (userId: string): Promise<Captain | null> => {
    const { data, error } = await supabase
      .from('captains')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching captain:', error);
      return null;
    }
    return (data as Captain) ?? null;
  }, []);

  const refreshCaptain = useCallback(async () => {
    if (!session?.user?.id) return;
    const c = await fetchCaptain(session.user.id);
    setCaptain(c);
    const adminFromMeta = session.user.app_metadata?.is_admin === true;
    setIsAdmin(adminFromMeta || (c?.is_admin ?? false));
  }, [session, fetchCaptain]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        setScreen('login');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setCaptain(null);
        setIsAdmin(false);
        setScreen('login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    (async () => {
      const c = await fetchCaptain(session.user.id);
      setCaptain(c);

      const adminFromMeta = session.user.app_metadata?.is_admin === true;
      const adminFlag = adminFromMeta || (c?.is_admin ?? false);
      setIsAdmin(adminFlag);

      if (isRegistering) {
        setScreen('pending');
        setIsRegistering(false);
        return;
      }

      if (adminFlag) {
        setScreen('admin');
        return;
      }

      if (!c) {
        setScreen('register');
      } else if (c.status === 'pending') {
        setScreen('pending');
      } else if (c.status === 'active') {
        setScreen('dashboard');
      } else if (c.status === 'suspended' || c.status === 'inactive') {
        setScreen('pending');
      }
    })();
  }, [session, fetchCaptain, isRegistering]);

  const navigate = useCallback((newScreen: AuthScreen) => {
    setScreen(newScreen);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setCaptain(null);
    setIsAdmin(false);
    setIsRegistering(false);
    setScreen('login');
  }, []);

  return (
    <AuthContext.Provider value={{ session, captain, isAdmin, screen, navigate, signOut, refreshCaptain }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

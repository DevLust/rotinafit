import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { IProfile } from '../interfaces';
import { goToLogin } from '../utils/navigation';

type UserWithEmail = IProfile & { email: string };

interface AuthContextType {
  user: UserWithEmail | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, fitnessGoal?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface Props {
  children: React.ReactNode;
}

export function AuthContextProvider({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithEmail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s);
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (s) {
        await loadProfile(s);
      } else {
        setUser(null);
        setIsLoading(false);
        if (event === 'SIGNED_OUT') goToLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(s: Session) {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .single();
      if (data) {
        setUser({ ...data, email: s.user.email ?? '' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(name: string, email: string, password: string, fitnessGoal?: string) {
    const avatarEmojis = ['💪', '🏋️', '🔥', '⚡', '🦁', '🐺', '🚀', '🎯'];
    const avatarEmoji = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, avatar_emoji: avatarEmoji, fitness_goal: fitnessGoal ?? null },
      },
    });
    if (signUpError) throw signUpError;

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    if (fitnessGoal) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ fitness_goal: fitnessGoal })
          .eq('id', authData.user.id);
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    goToLogin();
  }

  async function resetPassword(email: string) {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/login`
      : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async function refreshUser() {
    if (session) await loadProfile(session);
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut, resetPassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}

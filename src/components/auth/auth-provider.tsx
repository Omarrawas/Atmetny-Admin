// src/components/auth/auth-provider.tsx
"use client";
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { UserProfile, Badge, Reward, ActiveSubscription, SubjectBranchEnum } from '@/types';

interface AuthContextType {
  user: SupabaseUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  session: any; // Supabase session object
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user);
      }
      setLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthProvider] Supabase onAuthStateChange triggered. Event:', _event);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      if (_event !== 'INITIAL_SESSION') {
         setLoading(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log(`[AuthProvider] Attempting to fetch profile for Supabase user ID: ${supabaseUser.id}`);
      const { data, error } = await supabase
        .from('profiles') 
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('[AuthProvider] Error fetching user profile from Supabase profiles table:', error);
        setUserProfile({ id: supabaseUser.id, email: supabaseUser.email || null });
        setIsAdmin(false);
        return;
      }

      if (data) {
        const profileData: UserProfile = {
          id: data.id,
          email: data.email || supabaseUser.email || null,
          name: data.name || supabaseUser.email, // Use 'name' from SQL
          avatar_url: data.avatar_url || null,
          avatar_hint: data.avatar_hint || null,
          points: data.points || 0,
          level: data.level || 1,
          progress_to_next_level: data.progress_to_next_level || 0,
          badges: data.badges as Badge[] || [], // Cast or validate
          rewards: data.rewards as Reward[] || [], // Cast or validate
          student_goals: data.student_goals || null,
          branch: data.branch as SubjectBranchEnum || null,
          university: data.university || null,
          major: data.major || null,
          active_subscription: data.active_subscription as ActiveSubscription || null, // Cast or validate
          role: data.role as UserProfile['role'] || null,
          youtube_channel_url: data.youtube_channel_url || null,
          subjects_taught_id: data.subjects_taught_ids || null, // Map singular 'subjects_taught_ids' from SQL
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        console.log('[AuthProvider] User profile found in Supabase:', profileData);
        setUserProfile(profileData);
        const isAdminUser = profileData.role === 'admin';
        setIsAdmin(isAdminUser);
        console.log(`[AuthProvider] User role: '${profileData.role}'. Is admin: ${isAdminUser}`);
      } else {
        setUserProfile({ id: supabaseUser.id, email: supabaseUser.email || null });
        setIsAdmin(false);
        console.warn(`[AuthProvider] User profile NOT FOUND in Supabase 'profiles' table for ID: ${supabaseUser.id}. User will NOT have admin privileges.`);
      }
    } catch (profileError) {
      console.error("[AuthProvider] Error processing user profile from Supabase:", profileError);
      setUserProfile({ id: supabaseUser.id, email: supabaseUser.email || null });
      setIsAdmin(false);
      console.log('[AuthProvider] Defaulted to non-admin due to profile processing error.');
    }
  };


  return (
    <AuthContext.Provider value={{ user, userProfile, isAdmin, loading, session }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

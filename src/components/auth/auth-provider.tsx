
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
  isTeacher: boolean;
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
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<any>(null);

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
        setIsTeacher(false);
        return;
      }

      if (data) {
        const profileData: UserProfile = {
          id: data.id,
          email: data.email || supabaseUser.email || null,
          name: data.name || supabaseUser.email,
          avatar_url: data.avatar_url || null,
          avatar_hint: data.avatar_hint || null,
          points: data.points || 0,
          level: data.level || 1,
          progress_to_next_level: data.progress_to_next_level || 0,
          badges: data.badges as Badge[] || [],
          rewards: data.rewards as Reward[] || [],
          student_goals: data.student_goals || null,
          branch: data.branch as SubjectBranchEnum || null,
          university: data.university || null,
          major: data.major || null,
          active_subscription: data.active_subscription as ActiveSubscription || null,
          role: data.role as UserProfile['role'] || null,
          youtube_channel_url: data.youtube_channel_url || null,
          subjects_taught_ids: data.subjects_taught_ids || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        console.log('[AuthProvider] User profile found in Supabase:', profileData);
        setUserProfile(profileData);
        const isAdminUser = profileData.role === 'admin';
        const isTeacherUser = profileData.role === 'teacher';
        setIsAdmin(isAdminUser);
        setIsTeacher(isTeacherUser);
        console.log(`[AuthProvider] User role: '${profileData.role}'. Is admin: ${isAdminUser}, Is teacher: ${isTeacherUser}`);
      } else {
        setUserProfile({ id: supabaseUser.id, email: supabaseUser.email || null });
        setIsAdmin(false);
        setIsTeacher(false);
        console.warn(`[AuthProvider] User profile NOT FOUND in Supabase 'profiles' table for ID: ${supabaseUser.id}. User will NOT have admin/teacher privileges.`);
      }
    } catch (profileError) {
      console.error("[AuthProvider] Error processing user profile from Supabase:", profileError);
      setUserProfile({ id: supabaseUser.id, email: supabaseUser.email || null });
      setIsAdmin(false);
      setIsTeacher(false);
      console.log('[AuthProvider] Defaulted to non-admin/teacher due to profile processing error.');
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchUserProfile(currentUser);
        } else {
          setUserProfile(null);
          setIsAdmin(false);
          setIsTeacher(false);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, isAdmin, isTeacher, loading, session }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

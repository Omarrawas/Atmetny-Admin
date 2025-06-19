// src/hooks/use-auth.ts
"use client";
import { AuthContext } from '@/components/auth/auth-provider';
import { useContext } from 'react';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Add isTeacher for convenience, it's already in context but this makes it direct.
  // const isTeacher = context.userProfile?.role === 'teacher'; // This was redundant
  return { ...context }; // Return the whole context as isTeacher is already part of it
};
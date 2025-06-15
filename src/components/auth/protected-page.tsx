// src/components/auth/protected-page.tsx
"use client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, session } = useAuth(); // session might be useful for Supabase
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) { // Or !session for Supabase if user object might be delayed
        console.log("[ProtectedPage] No user/session, redirecting to login.");
        router.replace('/login');
      } else if (!isAdmin) {
        console.error("[ProtectedPage] Access denied: User is not an admin. Redirecting to login with error.");
        router.replace('/login?error=unauthorized');
      } else {
        console.log("[ProtectedPage] User is authenticated and admin. Access granted.");
      }
    } else {
      console.log("[ProtectedPage] Auth state is loading...");
    }
  }, [user, isAdmin, loading, session, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg text-foreground">Verifying access...</p>
      </div>
    );
  }

  return <>{children}</>;
}

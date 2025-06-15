"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && isAdmin) {
        router.replace('/dashboard');
      } else if (user && !isAdmin) {
        // User is authenticated but not an admin
        router.replace('/login?error=unauthorized'); // Or a dedicated unauthorized page
      }
      else {
        router.replace('/login');
      }
    }
  }, [user, isAdmin, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="ml-4 text-lg text-foreground">Loading Atmetny Admin Lite...</p>
    </div>
  );
}

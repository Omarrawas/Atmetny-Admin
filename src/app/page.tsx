"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, isAdmin, isTeacher } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && (isAdmin || isTeacher)) {
        router.replace('/dashboard');
      } else if (user && !isAdmin && !isTeacher) {
        // User is authenticated but not an admin or teacher
        router.replace('/login?error=unauthorized');
      }
      else {
        router.replace('/login');
      }
    }
  }, [user, isAdmin, isTeacher, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="ml-4 text-lg text-foreground">جاري تحميل لوحة تحكم اتمتني...</p>
    </div>
  );
}

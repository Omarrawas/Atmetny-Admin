'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (!isAdmin) {
        // If user is logged in but not an admin, redirect to a 'not authorized' page or home
        // For this admin panel, we'll redirect to login as if they aren't supposed to be here.
        console.warn('User is not an admin. Redirecting to login.');
        router.replace('/login'); 
      }
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user || !isAdmin) {
    // Show a loading state or a simple loader
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
          <p className="text-muted-foreground">جاري التحقق من صلاحيات الدخول...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';


export default function HomePage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && isAdmin) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isAdmin, loading, router]);

  return (
    <div className="flex items-center justify-center h-screen">
       <div className="space-y-4 p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
    </div>
  );
}

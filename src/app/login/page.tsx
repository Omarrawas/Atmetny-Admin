// src/app/login/page.tsx
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LoginFormComponent from '@/components/auth/login-form';

// No need for 'force-dynamic' if we use Suspense correctly
// export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    }>
      <LoginFormComponent />
    </Suspense>
  );
}

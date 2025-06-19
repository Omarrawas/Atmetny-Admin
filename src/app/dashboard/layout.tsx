// src/app/dashboard/layout.tsx
import React from 'react';
import ProtectedPage from '@/components/auth/protected-page';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar'; // Ensure SidebarProvider wraps sidebar and content

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedPage>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
              <div className="container mx-auto"> {/* Removed max-w-7xl */}
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedPage>
  );
}

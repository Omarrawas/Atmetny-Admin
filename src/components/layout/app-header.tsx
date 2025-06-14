'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebaseClient';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Placeholder for mobile sidebar toggle if needed in future.
// For now, it's a simple header.
export function AppHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (email?: string | null) => {
    if (!email) return 'A';
    return email.substring(0, 2).toUpperCase();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">فتح/إغلاق القائمة</span>
          </Button>
        )}
        <h1 className="text-lg font-semibold font-headline">لوحة تحكم Atmetny</h1>
      </div>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={firebaseUser?.photoURL || `https://placehold.co/40x40.png`} alt={user.displayName || user.email || 'Admin'} data-ai-hint="profile avatar" />
                <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}

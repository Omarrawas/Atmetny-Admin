// src/components/layout/app-header.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, School, UserCircle, Menu, Bell, Info, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { useRouter, usePathname } from 'next/navigation';
import { useSidebar } from '../ui/sidebar';
// Firestore specific imports are no longer needed for notifications if they are also migrated
// import { getAccessCodes } from '@/lib/firestore'; 
import type { AccessCode, AdminNotification } from '@/types';
import { format, addDays, isBefore } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function AppHeader() {
  const { userProfile, user } = useAuth(); // user from Supabase
  const router = useRouter();
  const { toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);

  // TODO: Notification generation logic needs to be updated to use Supabase
  // For now, it will be empty or show an error if getAccessCodes relies on Firestore.
  const generateNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    const generatedNots: AdminNotification[] = [];

    // This part needs to be migrated to Supabase
    // try {
    //   // 1. QR Code Expiry Warnings
    //   // const accessCodes = await getAccessCodes(); // This will fail if getAccessCodes is Firestore dependent
    //   const accessCodes: AccessCode[] = []; // Placeholder
    //   const today = new Date();
    //   const sevenDaysFromNow = addDays(today, 7);

    //   accessCodes.forEach(code => {
    //     // Ensure validUntil is a Date object if it's a string from Supabase
    //     const expiryDate = typeof code.validUntil === 'string' ? new Date(code.validUntil) : (code.validUntil as any)?.toDate?.() || null;

    //     if (expiryDate && code.isActive && !code.isUsed) {
    //       if (isBefore(expiryDate, sevenDaysFromNow) && isBefore(today, expiryDate)) { 
    //         generatedNots.push({
    //           id: `qr_expiry_${code.id}`,
    //           type: 'qr_expiry_warning',
    //           message: `رمز QR '${code.name}' سينتهي صلاحيته في ${format(expiryDate, 'PPP')}.`,
    //           relatedId: code.id,
    //           entityName: code.name,
    //           linkPath: '/dashboard/qr-codes',
    //           createdAt: new Date().toISOString(),
    //         });
    //       }
    //     }
    //   });
    // } catch (error) {
    //   console.error("Error generating notifications (Supabase migration needed):", error);
    //   generatedNots.push({
    //     id: 'error_loading_nots',
    //     type: 'info',
    //     message: 'فشل في تحميل بعض الإشعارات (Supabase migration in progress).',
    //     createdAt: new Date().toISOString(),
    //   });
    // }
    console.warn("Notification generation needs to be migrated to Supabase.");
    setNotifications(generatedNots); // Will be empty for now
    setIsLoadingNotifications(false);
  }, []);

  const handleNotificationDropdownToggle = (open: boolean) => {
    setIsNotificationDropdownOpen(open);
    if (open && notifications.length === 0 && !isLoadingNotifications) {
      generateNotifications();
    }
  };
  
  useEffect(() => {
    if(pathname === '/dashboard' && isNotificationDropdownOpen) {
        // Potentially refresh notifications
    }
  }, [pathname, isNotificationDropdownOpen]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase Logout failed:", error);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error("Logout exception:", error);
    }
  };

  const getInitials = (nameOrEmail?: string | null) => {
    if (!nameOrEmail) return 'AD';
    const parts = nameOrEmail.split(' ');
    if (parts.length > 1 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[parts.length -1][0]).toUpperCase();
    }
    return nameOrEmail.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-2">
        {isMobile && (
           <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        )}
        <School className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Atmetny Admin Lite</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu onOpenChange={handleNotificationDropdownToggle}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {notifications.length}
                </Badge>
              )}
              <span className="sr-only">View Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 md:w-96" align="end">
            <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isLoadingNotifications ? (
              <DropdownMenuItem disabled className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                جاري تحميل الإشعارات...
              </DropdownMenuItem>
            ) : notifications.length === 0 ? (
              <DropdownMenuItem disabled className="text-center text-muted-foreground p-4">
                لا توجد إشعارات جديدة. (تحتاج إلى ترحيل لجلب البيانات من Supabase)
              </DropdownMenuItem>
            ) : (
              <DropdownMenuGroup className="max-h-80 overflow-y-auto">
                {notifications.map(not => (
                  <DropdownMenuItem key={not.id} asChild className="cursor-pointer hover:bg-accent/50">
                    <Link href={not.linkPath || '#'}>
                      <div className="flex items-start gap-2 py-1.5">
                        {not.type === 'qr_expiry_warning' && <Info className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />}
                        {not.type === 'info' && <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                        <div className="flex-grow">
                          <p className="text-sm text-foreground leading-snug">{not.message}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(not.createdAt), 'PPp')}</p>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            )}
             <DropdownMenuSeparator />
             <DropdownMenuItem onClick={generateNotifications} disabled={isLoadingNotifications} className="flex items-center justify-center cursor-pointer">
                <Loader2 className={`mr-2 h-4 w-4 ${isLoadingNotifications ? "animate-spin" : "hidden"}`} />
                تحديث الإشعارات
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {user && ( // Check Supabase user object
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                   {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt={userProfile.name || user.email || 'User Avatar'} className="h-full w-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(userProfile?.name || user.email)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {userProfile?.name || user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userProfile?.role === 'admin' ? 'Administrator' : (userProfile?.role || 'User')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

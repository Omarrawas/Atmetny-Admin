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
import { LogOut, School, UserCircle, Menu, Bell, Info, Loader2, MessageSquareWarning, CheckCircle2, UserPlus, ExternalLinkIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabaseClient'; 
import { useRouter, usePathname } from 'next/navigation';
import { useSidebar } from '../ui/sidebar';
import type { AdminNotification, AppSettings, AdminNotificationType } from '@/types'; 
import { getAppSettings, getAdminNotifications, markNotificationAsRead } from '@/lib/firestore'; // Updated imports
import { formatDistanceToNow, parseISO } from 'date-fns'; 
import { arSA } from 'date-fns/locale'; // For Arabic locale
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image'; 

export default function AppHeader() {
  const { userProfile, user } = useAuth(); 
  const router = useRouter();
  const { toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoadingLogo(true);
      try {
        const settings = await getAppSettings();
        setAppSettings(settings);
      } catch (error) {
        console.error("Error fetching app settings for header logo:", error);
      } finally {
        setIsLoadingLogo(false);
      }
    };
    fetchSettings();
  }, []);

  const fetchNotifications = useCallback(async (markAsRead = false) => {
    if (isLoadingNotifications) return;
    setIsLoadingNotifications(true);
    try {
      const fetchedNots = await getAdminNotifications({ limit: 15, unreadOnly: !markAsRead });
      setNotifications(fetchedNots);
      if (markAsRead) {
        // In a real scenario, you'd mark these specific fetched notifications as read on the backend
        // For now, we'll just refetch all or assume they are marked read if the dropdown is opened
        console.log("Notifications would be marked as read if this logic was fully implemented.");
      }
    } catch (error) {
        console.error("Error fetching notifications:", error);
        // toast({ variant: "destructive", title: "Error fetching notifications", description: "Could not load notifications."});
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isLoadingNotifications]); // Added toast

  const handleNotificationDropdownToggle = (open: boolean) => {
    setIsNotificationDropdownOpen(open);
    if (open) {
      fetchNotifications(true); // Fetch and ideally mark as read when dropdown opens
    }
  };
  
  useEffect(() => {
    // Initial fetch or fetch on dashboard view (if desired)
    if(pathname === '/dashboard') { // Example: Fetch when dashboard is viewed
        fetchNotifications();
    }
  }, [pathname, fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      // Optionally, refetch or just update UI
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };


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
  
  const appLogoUrl = appSettings?.appLogoUrl;
  const appName = appSettings?.appName || "Atmetny Admin Lite";

  const getNotificationIcon = (type: AdminNotificationType) => {
    switch (type) {
      case 'qr_code_expiry_warning':
        return <MessageSquareWarning className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />;
      case 'low_question_count_subject':
        return <MessageSquareWarning className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />;
      case 'new_user_registered':
        return <UserPlus className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />;
      case 'system_update':
      case 'custom_admin_message':
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />;
    }
  };
  
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-2">
        {isMobile && (
           <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        )}
        <div className="relative flex h-7 w-7 items-center justify-center text-primary">
          {isLoadingLogo ? (
            <Loader2 className="h-full w-full animate-spin" />
          ) : appLogoUrl && appLogoUrl.trim() !== '' ? (
            <NextImage 
              src={appLogoUrl} 
              alt={`${appName} Logo`} 
              fill 
              sizes="28px" 
              className="object-contain" 
            />
          ) : (
            <School className="h-full w-full" />
          )}
        </div>
        <h1 className="text-xl font-semibold text-foreground">Atmetny Admin Lite</h1> 
      </div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu onOpenChange={handleNotificationDropdownToggle}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {unreadNotificationsCount}
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
                لا توجد إشعارات جديدة.
              </DropdownMenuItem>
            ) : (
              <DropdownMenuGroup className="max-h-80 overflow-y-auto">
                {notifications.map(not => (
                  <DropdownMenuItem 
                    key={not.id} 
                    asChild 
                    className={cn(
                      "cursor-pointer hover:bg-accent/50 data-[disabled]:opacity-100 data-[disabled]:cursor-default",
                      !not.is_read && "bg-primary/10 hover:bg-primary/20"
                    )}
                    onSelect={(e) => {
                      if (not.link_path) {
                        router.push(not.link_path);
                      }
                      if (!not.is_read) {
                        handleMarkAsRead(not.id);
                      }
                      e.preventDefault(); // Prevent dropdown from closing if it's a link
                    }}
                  >
                    {/* Use Link if link_path exists, otherwise a div */}
                    {not.link_path ? (
                       <Link href={not.link_path} className="w-full">
                        <div className="flex items-start gap-2 py-1.5">
                            {getNotificationIcon(not.type)}
                            <div className="flex-grow">
                            <p className="text-sm text-foreground leading-snug">{not.message}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(not.created_at), { addSuffix: true, locale: arSA })}
                            </p>
                            </div>
                            {!not.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" title="غير مقروء"></span>
                            )}
                        </div>
                      </Link>
                    ) : (
                       <div className="w-full flex items-start gap-2 py-1.5" onClick={() => !not.is_read && handleMarkAsRead(not.id)}>
                            {getNotificationIcon(not.type)}
                            <div className="flex-grow">
                            <p className="text-sm text-foreground leading-snug">{not.message}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(not.created_at), { addSuffix: true, locale: arSA })}
                            </p>
                            </div>
                            {!not.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" title="غير مقروء"></span>
                            )}
                        </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            )}
             <DropdownMenuSeparator />
             <DropdownMenuItem onClick={() => fetchNotifications(false)} disabled={isLoadingNotifications} className="flex items-center justify-center cursor-pointer">
                <Loader2 className={`mr-2 h-4 w-4 ${isLoadingNotifications ? "animate-spin" : "hidden"}`} />
                تحديث الإشعارات
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {user && ( 
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

